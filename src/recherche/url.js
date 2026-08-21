// src/recherche/url.js
// Grammaire d'URL : lecture tolérante, écriture toujours canonique.
// CONTRACTS.md §4.2, §4.3, §4.4.
//
//   url        := {chemin} '#' [approche] '#' b58(saisie)
//   approche   := fragment (',' fragment)*
//   fragment   := [portee ':'] programme
//   portee     := offset '.' longueur          // en jetons ; absent ⇒ saisie entière
//   programme  := code ('+' code)*
//
// `+` sépare les OPÉRATIONS d'un même fragment (arbitrage utilisateur).
// `,` sépare les FRAGMENTS dont les 6 s'assemblent en 666.
// `×3:programme` abrège la résonance (le même programme sur les 3 occurrences).
//
// Le principe de fond : **l'URL transporte le programme, pas un rang**. Un rang
// est le résultat d'un calcul ; le publier revient à publier un pointeur vers
// une structure mutable, et les liens cassent à la première évolution du
// catalogue. Ici un lien est rejouable sans recherche.

import { encoderTexte, decoderTexte, estBase58, LIMITE_SAISIE } from './base58.js';
import { normaliserCatalogue } from './bfs.js';

export const RE_CODE = /^[ftnmcpj][0-9a-z]+$/;
const RE_PORTEE = /^(\d+)\.(\d+)$/;
const RE_RESONANCE = /^[×xX*](\d+)$/;
const RE_RANGS = /^\d+(\+\d+)*$/;

/**
 * @typedef {Object} FragmentUrl
 * @property {{offset:number,longueur:number}|null} portee
 * @property {number|null} resonance   nombre d'occurrences si abrégé `×3:`
 * @property {string[]} codes
 *
 * @typedef {Object} LectureUrl
 * @property {'canonique'|'heritee'|'resultats'|'invalide'} forme
 * @property {string|null} saisie
 * @property {FragmentUrl[]|null} fragments
 * @property {number[]|null} rangs
 * @property {string|null} bandeau     message à afficher (jamais silencieux)
 * @property {string|null} raison
 */

/**
 * Lecture tolérante du fragment d'URL.
 * Un lien ne renvoie JAMAIS silencieusement vers une autre démonstration :
 * soit il rejoue exactement, soit il l'annonce.
 *
 * @param {string} hash          `location.hash` (avec ou sans `#` initial)
 * @param {{catalogue?:Object}} [options]
 * @returns {LectureUrl}
 */
export function lire(hash, options = {}) {
  const vide = { forme: 'invalide', saisie: null, fragments: null, rangs: null, bandeau: null, raison: null };
  if (typeof hash !== 'string') return { ...vide, raison: 'hash absent' };

  let brut = hash;
  try { brut = decodeURIComponent(hash); } catch { /* on garde la forme brute */ }
  if (brut.startsWith('#')) brut = brut.slice(1);
  if (brut === '') return { ...vide, forme: 'resultats', saisie: null };

  const parts = brut.split('#');
  if (parts.length !== 2) {
    return { ...vide, raison: 'format inconnu', bandeau: BANDEAUX.formatInconnu };
  }
  const [approche, b58] = parts;

  if (!estBase58(b58)) {
    return { ...vide, raison: 'saisie base58 invalide', bandeau: BANDEAUX.lienIllisible };
  }
  const saisie = decoderTexte(b58);
  if (saisie === null) {
    return { ...vide, raison: 'saisie base58 illisible', bandeau: BANDEAUX.lienIllisible };
  }
  if (saisie.length > LIMITE_SAISIE) {
    return { ...vide, saisie, raison: 'saisie trop longue', bandeau: BANDEAUX.saisieTropLongue };
  }

  if (approche === '') {
    return { forme: 'resultats', saisie, fragments: null, rangs: null, bandeau: null, raison: null };
  }

  // Forme héritée du README : des rangs, pas un programme.
  if (RE_RANGS.test(approche)) {
    return {
      forme: 'heritee',
      saisie,
      fragments: null,
      rangs: approche.split('+').map(Number),
      bandeau: BANDEAUX.recalculee,
      raison: null,
    };
  }

  const fragments = [];
  for (const brutFrag of approche.split(',')) {
    const f = lireFragment(brutFrag);
    if (!f) return { ...vide, saisie, raison: `fragment illisible : ${brutFrag}`, bandeau: BANDEAUX.formatInconnu };
    fragments.push(f);
  }

  if (options.catalogue) {
    const connus = new Set(normaliserCatalogue(options.catalogue).map((o) => o.code));
    for (const f of fragments) {
      for (const c of f.codes) {
        if (!connus.has(c)) {
          return { ...vide, saisie, raison: `code inconnu : ${c}`, bandeau: BANDEAUX.codeInconnu };
        }
      }
    }
  }

  return { forme: 'canonique', saisie, fragments, rangs: null, bandeau: null, raison: null };
}

function lireFragment(brut) {
  if (!brut) return null;
  let portee = null;
  let resonance = null;
  let programme = brut;
  const i = brut.indexOf(':');
  if (i >= 0) {
    const tete = brut.slice(0, i);
    programme = brut.slice(i + 1);
    const mp = RE_PORTEE.exec(tete);
    const mr = RE_RESONANCE.exec(tete);
    if (mp) portee = { offset: Number(mp[1]), longueur: Number(mp[2]) };
    else if (mr) resonance = Number(mr[1]);
    else return null;
  }
  if (!programme) return null;
  const codes = programme.split('+');
  if (!codes.length || !codes.every((c) => RE_CODE.test(c))) return null;
  return { portee, resonance, codes };
}

export const BANDEAUX = {
  recalculee: 'Démonstration recalculée : ce lien désigne des rangs, pas une méthode.',
  codeInconnu: 'Ce lien emploie une règle que cette version ne connaît pas.',
  formatInconnu: 'Ce lien a été créé par une autre version du site.',
  lienIllisible: 'Ce lien est illisible : la saisie n’a pas pu être décodée.',
  // Seul bandeau du moteur : le filet de sécurité temporel a mordu. Le
  // classement rendu n'est alors PAS reproductible — il dépend de la charge de
  // la machine — et le contrat §4.3 interdit de laisser varier un rang en
  // silence. Traduit, parce qu'il s'affiche via `localiser()` côté interface.
  rechercheTronquee: {
    fr: 'Recherche écourtée : cette machine a manqué de temps, la liste ci-dessous '
      + 'est partielle et ses rangs ne sont pas reproductibles. Les liens de partage, eux, '
      + 'restent exacts : ils transportent la méthode, pas le rang.',
    en: 'Search cut short: this machine ran out of time, so the list below is partial and '
      + 'its ranks are not reproducible. Share links remain exact: they carry the method, '
      + 'not the rank.',
  },
  saisieTropLongue: `Ce lien dépasse le plafond de ${LIMITE_SAISIE} caractères.`,
};

// ══════════════════════════════════ écriture canonique

/**
 * @param {{saisie:string, fragments?:FragmentUrl[]}} demonstration
 * @returns {string} le fragment d'URL complet, `#…#…`
 */
export function ecrire({ saisie, fragments }) {
  const b58 = encoderTexte(saisie);
  if (!fragments || !fragments.length) return `##${b58}`;
  return `#${ecrireApproche(fragments)}#${b58}`;
}

export function ecrireApproche(fragments) {
  return fragments.map(ecrireFragment).join(',');
}

function ecrireFragment(f) {
  const programme = f.codes.join('+');
  if (f.resonance) return `×${f.resonance}:${programme}`;
  if (f.portee) return `${f.portee.offset}.${f.portee.longueur}:${programme}`;
  return programme;
}

/**
 * Traduit une approche notée en descripteurs d'URL.
 * Applique l'abréviation de résonance quand les 3 programmes sont identiques.
 * @param {Object} approche
 * @param {{nbJetons?:number}} [ctx]
 * @returns {FragmentUrl[]}
 */
export function descripteursDe(approche, ctx = {}) {
  const parts = approche.parts.map((p) => ({
    codes: p.chemin.ops.map((o) => o.code),
    fragment: p.fragment,
  }));
  const memeProgramme = parts.length === 3
    && parts.every((p) => p.codes.join('+') === parts[0].codes.join('+'));

  if (approche.resonance && memeProgramme) {
    return [{ portee: null, resonance: parts.length, codes: parts[0].codes }];
  }
  return parts.map((p) => ({
    portee: porteeDe(p.fragment, ctx),
    resonance: null,
    codes: p.codes,
  }));
}

function porteeDe(fragment, ctx) {
  if (!fragment) return null;
  const nb = ctx.nbJetons ?? -1;
  if (fragment.tokenDebut === 0 && (fragment.tokenLong === nb || fragment.famille === 'entier')) return null;
  if (fragment.tokenDebut < 0 || fragment.tokenLong < 0) return null;
  return { offset: fragment.tokenDebut, longueur: fragment.tokenLong };
}

/**
 * Réécrit la barre d'adresse en forme canonique, sans empiler d'historique.
 * L'utilisateur qui copie l'URL copie un lien permanent sans avoir à le savoir.
 */
export function canoniser(demonstration, portee = globalThis) {
  const frag = ecrire(demonstration);
  const h = portee && portee.history;
  const loc = portee && portee.location;
  if (!h || typeof h.replaceState !== 'function' || !loc) return frag;
  if (loc.hash === frag) return frag;
  h.replaceState(null, '', (loc.pathname || '') + (loc.search || '') + frag);
  return frag;
}
