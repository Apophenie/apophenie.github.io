// src/recherche/url.js
// Grammaire d'URL : lecture tolérante, écriture toujours canonique.
// CONTRACTS.md §4.2, §4.3, §4.4.
//
//   url        := {chemin} '#' [approche] '#' b58(saisie)
//   approche   := [registre '!'] fragment (',' fragment)*
//   registre   := 'so' | 'sce'        (formes longues encore LUES, plus écrites)
//   fragment   := [portee ':'] programme
//   portee     := offset '.' longueur          // en jetons ; absent ⇒ saisie entière
//   programme  := code ('+' code)*
//
// `+` sépare les OPÉRATIONS d'un même fragment (arbitrage utilisateur).
// `,` sépare les FRAGMENTS dont les 6 s'assemblent en 666.
// `×3:programme` abrège la résonance (le même programme sur les 3 occurrences).
// `so!` / `sce!` préfixe l'approche entière — voir ci-dessous.
//
// ── LE REGISTRE, et pourquoi ce n'est PAS un opérateur ──────────────────────
//
// Le registre de codes d'opérateurs est FERMÉ (CONTRACTS §4.1) : aucun code ne
// peut être alloué pour dire « sobre » ou « scénique ». Et ce serait de toute
// façon une faute de modélisation : un opérateur TRANSFORME l'état — il a un
// `from`, un `to`, un `apply()` —, alors que le registre ne touche à rien de ce
// qui est calculé. Deux liens qui ne diffèrent que par lui portent le MÊME
// programme, produisent le MÊME verdict et méritent le MÊME score : ils sont la
// même voie, montrée de deux manières. C'est donc une extension de la
// GRAMMAIRE (§4.2), au même titre que le préfixe de résonance `×3:` ou les
// portées `0.1:` — qui, eux non plus, ne sont pas des opérateurs.
//
// Il préfixe l'APPROCHE ENTIÈRE et non chaque fragment : montrer un fragment
// sobrement et le suivant en fanfare n'aurait aucun sens. Une seule mise en
// scène par démonstration, donc un seul marqueur, en tête.
//
// ── L'ABSENCE DE MARQUEUR VAUT « SCÉNIQUE ». Voici pourquoi ────────────────
//
// Des liens écrits à la main circulent depuis la publication et n'ont pas de
// marqueur. Il fallait trancher, et les deux lectures se défendaient :
// « scénique » (les liens existants ne changent pas) ou « sobre » (le défaut
// est la version crédible, la mise en scène s'opte).
//
// L'argument « ne rien changer » ne départage pas, contrairement aux
// apparences : les deux options changent quelque chose. Sous « scénique », un
// vieux lien garde ses cornes mais gagne l'orage ; sous « sobre », il reste
// sans orage mais perd ses cornes. Ce qui départage, c'est la NATURE des deux
// changements :
//
//  · **Les cornes sont un geste de la DÉMONSTRATION.** C'est une primitive du
//    vocabulaire fermé (§3.1), émise par un opérateur que l'URL NOMME (`mz`),
//    et le couronnement anticipé change le nombre d'étapes — 23 au lieu de 22
//    sur la voie de référence. Un lien qui promettait 23 étapes en rendrait 22,
//    avec une autre jauge, un autre badge et un autre Registre. C'est
//    exactement ce que §4.3 interdit : « un lien ne renvoie jamais
//    silencieusement vers une autre démonstration ».
//  · **L'orage est du THÉÂTRE.** Mêmes étapes, même numérotation, même
//    Registre, même verdict. L'ajouter à un vieux lien est du même ordre que
//    d'améliorer le dessin d'une corne : le site évolue, la démonstration non.
//
// Un seul des deux défauts fait donc mentir un lien. Et le coût du choix est
// borné dans le temps : `ecrire()` pose TOUJOURS le marqueur, `canoniser()`
// réécrit la barre d'adresse (§4.3), si bien que tout lien produit à partir
// d'aujourd'hui est explicite. Le défaut ne gouverne que les liens écrits
// avant — c'est une règle de lecture héritée, pas un défaut de produit.
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
 * Les deux registres de mise en scène, et le mot qui les écrit dans l'URL.
 *
 * ★ **`so!` et `sce!`, abrégés.** Le premier jet écrivait « sobre » et
 * « scenique » en toutes lettres, au nom de la lisibilité. L'auteur a tranché
 * dans l'autre sens, et son argument est meilleur que le mien : « l'URL reste
 * essentiellement cryptique et ça participe à l'effet de surprise ». Le reste
 * de la grammaire est déjà illisible — `0.1:fk+t1+mw` —, et un seul mot clair
 * au milieu ne rendait pas le lien compréhensible : il annonçait juste, à qui
 * reçoit le lien, qu'il y a quelque chose à voir. Trois lettres suffisent à
 * distinguer les deux registres sans rien divulguer.
 *
 * Sans accent, comme tout le reste de la grammaire : une URL accentuée
 * s'échappe en `%C3%A9` dès qu'une messagerie la touche.
 *
 * ★ Les identifiants INTERNES (`'sobre'`, `'scenique'`) ne changent pas : c'est
 * du code, il se lit. Seul le mot écrit dans l'URL est abrégé.
 */
export const REGISTRES = Object.freeze(['sobre', 'scenique']);

/** Le mot de chaque registre dans l'URL. */
const MOT_URL = Object.freeze({ sobre: 'so', scenique: 'sce' });

/** Le registre appliqué à un lien qui n'en porte pas — voir l'en-tête. */
export const REGISTRE_DEFAUT = 'scenique';

/**
 * ★ La forme longue est encore LUE, jamais écrite.
 *
 * Elle n'aura vécu qu'une version — la 1.2.0, publiée quelques heures —, mais
 * les liens de cette fenêtre-là existent. Les relire coûte deux alternatives
 * dans une expression rationnelle ; les casser coûterait un lien mort à qui
 * s'en est servi. `ecrire()` ne produit plus que la forme brève, et
 * `canoniser()` réécrit la barre d'adresse : un vieux lien se corrige tout seul
 * dès qu'on l'ouvre.
 */
const RE_REGISTRE = /^(so|sce|sobre|scenique)!/;

/** Le mot lu dans l'URL → l'identifiant interne. */
const REGISTRE_DU_MOT = Object.freeze({
  so: 'sobre', sce: 'scenique', sobre: 'sobre', scenique: 'scenique',
});

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
 * @property {'sobre'|'scenique'|null} registre  résolu ; `null` hors forme canonique
 * @property {boolean} registreEcrit  le lien le portait-il en toutes lettres ?
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
  const vide = {
    forme: 'invalide', saisie: null, fragments: null,
    registre: null, registreEcrit: false, rangs: null, bandeau: null, raison: null,
  };
  if (typeof hash !== 'string') return { ...vide, raison: 'hash absent' };

  let brut = hash;
  try { brut = decodeURIComponent(hash); } catch { /* on garde la forme brute */ }
  if (brut.startsWith('#')) brut = brut.slice(1);
  if (brut === '') return { ...vide, forme: 'resultats', saisie: null };

  const parts = brut.split('#');
  if (parts.length !== 2) {
    return { ...vide, raison: 'format inconnu', bandeau: BANDEAUX.formatInconnu };
  }
  let [approche, b58] = parts;

  // ★ Le registre se détache AVANT tout le reste : il préfixe l'approche
  //   entière, il n'appartient à aucun fragment. Absent, il vaut « scénique »
  //   (voir l'en-tête : c'est une règle de lecture héritée, pas un défaut de
  //   produit — tout lien écrit par le site le porte en toutes lettres).
  let registre = REGISTRE_DEFAUT;
  let registreEcrit = false;
  const mReg = RE_REGISTRE.exec(approche);
  if (mReg) {
    registre = REGISTRE_DU_MOT[mReg[1]];
    registreEcrit = true;
    approche = approche.slice(mReg[0].length);
  }

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
    // `sobre!` tout seul ne désigne aucune démonstration : un marqueur de mise
    // en scène sans programme à mettre en scène est un lien tronqué, pas une
    // page de résultats. On le dit plutôt que de retomber en silence — §4.3.
    if (registreEcrit) {
      return { ...vide, saisie, raison: 'registre sans programme', bandeau: BANDEAUX.formatInconnu };
    }
    return {
      forme: 'resultats', saisie, fragments: null,
      registre: null, registreEcrit: false, rangs: null, bandeau: null, raison: null,
    };
  }

  // Forme héritée du README : des rangs, pas un programme.
  if (RE_RANGS.test(approche)) {
    return {
      forme: 'heritee',
      saisie,
      fragments: null,
      // Une forme héritée relance la recherche : elle n'aboutit pas à une
      // démonstration mais à un rang du classement courant, et c'est ce rang
      // qui apportera son propre lien canonique — registre compris.
      registre: null,
      registreEcrit: false,
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

  return {
    forme: 'canonique', saisie, fragments,
    registre, registreEcrit, rangs: null, bandeau: null, raison: null,
  };
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
 * ★ Le registre est écrit EN TOUTES LETTRES, même quand il vaut le défaut.
 *
 * Un lien qui se tait sur sa mise en scène dépend d'une règle de lecture, et
 * une règle de lecture peut être discutée, oubliée, ou lue de travers dix ans
 * plus tard. Les neuf caractères de `scenique!` achètent une chose : plus
 * jamais de lien ambigu. Combinés à `canoniser()`, qui réécrit la barre
 * d'adresse à chaque ouverture (§4.3), ils font que le défaut ne gouvernera
 * jamais qu'un ensemble de liens FINI et FIGÉ — ceux écrits avant aujourd'hui.
 *
 * La page de RÉSULTATS, elle, n'en porte pas : elle ne montre aucune
 * démonstration, il n'y a rien à mettre en scène.
 *
 * @param {{saisie:string, fragments?:FragmentUrl[], registre?:'sobre'|'scenique'}} demonstration
 * @returns {string} le fragment d'URL complet, `#…#…`
 */
export function ecrire({ saisie, fragments, registre }) {
  const b58 = encoderTexte(saisie);
  if (!fragments || !fragments.length) return `##${b58}`;
  return `#${marqueur(registre)}${ecrireApproche(fragments)}#${b58}`;
}

/** Le préfixe de registre, normalisé. Une valeur inconnue retombe sur le défaut
 *  plutôt que d'écrire un marqueur que `lire()` refuserait de relire. */
function marqueur(registre) {
  return `${MOT_URL[REGISTRES.includes(registre) ? registre : REGISTRE_DEFAUT]}!`;
}

/** Le registre OPPOSÉ — l'autre bouton du panneau de voie. */
export const autreRegistre = (registre) => (registre === 'sobre' ? 'scenique' : 'sobre');

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
