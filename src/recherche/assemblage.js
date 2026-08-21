// src/recherche/assemblage.js
// Jointure sur signature de méthode : comment trois 6 deviennent un 666.
// CONTRACTS.md §5 · research/heuristique.md §3.4.
//
// Le README insiste : « idéalement 3 d'affilée, idéalement selon la même
// méthode ». Prendre le meilleur chemin de chaque fragment indépendamment
// produit trois méthodes hétéroclites — peu convaincant. On joint donc les
// index de chemins par SIGNATURE DE MÉTHODE : une intersection de tables de
// hachage, O(nb de chemins), quasi gratuite.

import { signature, comparerCodes, scorePartiel } from './score.js';
import { appliquerOp, etat, normaliserCatalogue, cleTrace } from './bfs.js';

/**
 * Modes d'assemblage, du plus convaincant au moins :
 *  RESONANCE   les 3 fragments sont littéralement le même texte, répété (le cas
 *              `hope-hope-hope` du README) — bonus +8
 *  DIRECT      un seul chemin passe littéralement par 666
 *  TRIPLEMENT  toute la saisie vaut 6, on l'écrit trois fois (seul assemblage
 *              possible sur un mot unique)
 *  PARTITION   trois morceaux contigus qui couvrent la saisie
 *  SIX_OFFERT  au moins deux « 6 offerts » (tirets de la touche AZERTY, 6 littéral)
 *  LIBRE       trois fragments disjoints non couvrants — malus ×0,80
 *  JOKER       le terminateur français, dernier recours — malus ×0,45
 */
export const MODES = ['RESONANCE', 'DIRECT', 'TRIPLEMENT', 'PARTITION', 'SIX_OFFERT', 'LIBRE', 'JOKER'];

const K_PAR_FRAGMENT = 8;   // chemins retenus par fragment pour l'assemblage
const MAX_PARTITIONS = 200; // garde-fou combinatoire
const MAX_LIBRES = 12;      // C(12,3) = 220 combinaisons

/** Index d'un fragment : ses chemins rangés par signature de méthode. */
function indexer(chemins) {
  const parSig = new Map();
  for (const c of chemins) {
    const s = signature(c);
    if (!parSig.has(s)) parSig.set(s, []);
    parSig.get(s).push(c);
  }
  return parSig;
}

function meilleur(chemins) {
  let m = null;
  for (const c of chemins) {
    if (!m) { m = c; continue; }
    const sa = scorePartiel(c);
    const sm = scorePartiel(m);
    if (sa > sm || (sa === sm && comparerCodes(c.ops.map((o) => o.code), m.ops.map((o) => o.code)) < 0)) m = c;
  }
  return m;
}

function approche(mode, parts, extra = {}) {
  return { mode, parts, resonance: false, ...extra };
}

/**
 * @param {string} saisie
 * @param {import('./fragments.js').Fragment[]} fragments
 * @param {Map<string, Object[]>} parFrag  texte normalisé → chemins
 * @param {Object} ctx  {jetons, signifiants, catalogue}
 * @returns {Object[]} approches non notées
 */
export function assembler(saisie, fragments, parFrag, ctx) {
  const approches = [];
  const cheminsDe = (f) => (parFrag.get(f.texte.normalize('NFC')) || []).slice(0, K_PAR_FRAGMENT);

  // ── mode A : RÉSONANCE — les 3 fragments sont littéralement le même texte
  const parMotif = new Map();
  for (const f of fragments) {
    if (f.famille !== 'repetition' && f.famille !== 'periodicite') continue;
    const cle = f.motif || f.texte;
    if (!parMotif.has(cle)) parMotif.set(cle, []);
    parMotif.get(cle).push(f);
  }
  for (const [, occ] of parMotif) {
    if (occ.length < 3) continue;
    const trois = occ.slice(0, 3);
    for (const chemin of cheminsDe(trois[0])) {
      approches.push(approche('RESONANCE', trois.map((f) => ({ fragment: f, chemin })), { resonance: true }));
    }
  }

  // ── mode E : 666 direct — un chemin passe littéralement par 666
  // ── mode F : triplement — toute la saisie vaut 6, on l'écrit trois fois.
  //    C'est le seul assemblage possible sur un mot unique (« macron » → 6),
  //    et il reste honnête : ce qui est montré est bien ce qui est calculé.
  for (const f of fragments) {
    if (!f.entier && f.famille !== 'entier') continue;
    for (const c of cheminsDe(f)) {
      const tronque = tronquerA666(c);
      if (tronque) approches.push(approche('DIRECT', [{ fragment: f, chemin: tronque }], { direct666: true }));
      else approches.push(approche('TRIPLEMENT', [0, 1, 2].map(() => ({ fragment: f, chemin: c }))));
    }
  }

  // ── mode B : PARTITION contiguë couvrante en 3 parts, jointe sur signature
  for (const trio of partitionsContigues(fragments, ctx)) {
    const index = trio.map((f) => indexer(cheminsDe(f)));
    const communes = [...index[0].keys()]
      .filter((s) => index[1].has(s) && index[2].has(s))
      .sort();
    if (communes.length) {
      for (const s of communes) {
        approches.push(approche('PARTITION', trio.map((f, i) => ({
          fragment: f, chemin: meilleur(index[i].get(s)),
        }))));
      }
    } else {
      // Repli hétérogène : sera pénalisé par H, mais reste montrable.
      const parts = trio.map((f) => ({ fragment: f, chemin: meilleur(cheminsDe(f)) }));
      if (parts.every((p) => p.chemin)) approches.push(approche('PARTITION', parts));
    }
  }

  // ── modes C et D : 3 fragments disjoints (avec ou sans « 6 offert »)
  for (const trio of trioLibres(fragments, parFrag)) {
    const index = trio.map((f) => indexer(cheminsDe(f)));
    const communes = [...index[0].keys()].filter((s) => index[1].has(s) && index[2].has(s)).sort();
    const offerts = trio.filter((f) => estSixOffert(f)).length;
    const mode = offerts >= 2 ? 'SIX_OFFERT' : 'LIBRE';
    if (communes.length) {
      for (const s of communes.slice(0, 3)) {
        approches.push(approche(mode, trio.map((f, i) => ({ fragment: f, chemin: meilleur(index[i].get(s)) }))));
      }
    } else {
      const parts = trio.map((f) => ({ fragment: f, chemin: meilleur(cheminsDe(f)) }));
      if (parts.every((p) => p.chemin)) approches.push(approche(mode, parts));
    }
  }

  // Le mode est RECALCULÉ à partir de la géométrie des fragments, jamais laissé
  // au générateur qui a produit l'approche : c'est ce qui garantit qu'une URL
  // rejouée retrouve exactement le même score que la liste d'origine (le mode
  // porte un malus, et il n'est pas transporté par l'URL).
  for (const a of approches) Object.assign(a, deduireMode(a.parts, ctx));
  return dedupliquerApproches(approches);
}

/**
 * @param {Array<{fragment:Object, chemin:Object}>} parts
 * @param {{saisie:string, jetons?:Object[]}} ctx
 * @returns {{mode:string, resonance:boolean}}
 */
export function deduireMode(parts, ctx) {
  if (parts.some((p) => p.chemin.ops.some((o) => o.isJoker))) return { mode: 'JOKER', resonance: false };
  if (parts.length === 1) {
    const fin = parts[0].chemin.etats[parts[0].chemin.etats.length - 1];
    return { mode: fin.type === 'NUM' && fin.valeur === 666 ? 'DIRECT' : 'TRIPLEMENT', resonance: false };
  }
  const cles = parts.map((p) => p.fragment.intervalles.map((iv) => iv.join('.')).join('|'));
  if (new Set(cles).size === 1) return { mode: 'TRIPLEMENT', resonance: false };

  const textes = parts.map((p) => p.fragment.texte.toLowerCase());
  const memeTexte = new Set(textes).size === 1;
  if (memeTexte && parts.length >= 3 && compterOccurrences(ctx.saisie, textes[0]) >= parts.length) {
    return { mode: 'RESONANCE', resonance: true };
  }
  if (parts.filter((p) => estSixOffert(p.fragment)).length >= 2) {
    return { mode: 'SIX_OFFERT', resonance: false };
  }
  return { mode: couvrante(parts, ctx) ? 'PARTITION' : 'LIBRE', resonance: false };
}

function compterOccurrences(saisie, motif) {
  if (!saisie || !motif) return 0;
  const s = saisie.toLowerCase();
  let n = 0;
  let i = s.indexOf(motif);
  while (i >= 0) { n++; i = s.indexOf(motif, i + motif.length); }
  return n;
}

/** Partition couvrante : les trous entre fragments ne portent aucun caractère de mot. */
function couvrante(parts, ctx) {
  const bornes = parts
    .map((p) => [p.fragment.offset, p.fragment.offset + p.fragment.longueur])
    .sort((a, b) => a[0] - b[0]);
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  let curseur = 0;
  for (const [d, f] of bornes) {
    if (d < curseur) return false; // chevauchement
    if (!trouAcceptable(ctx, curseur, d)) return false;
    curseur = f;
  }
  return trouAcceptable(ctx, curseur, fin);
}

/** Un fragment « 6 offert » : séparateur de la touche 6 en AZERTY, ou chiffre 6 littéral. */
function estSixOffert(f) {
  return f.famille === 'separateurs' || f.texte === '-' || f.texte === '6';
}

function tronquerA666(chemin) {
  for (let i = 1; i < chemin.etats.length; i++) {
    const e = chemin.etats[i];
    if (e.type === 'NUM' && e.valeur === 666) {
      return { ops: chemin.ops.slice(0, i), etats: chemin.etats.slice(0, i + 1), valeur: 666, cout: chemin.ops.slice(0, i).reduce((s, o) => s + (o.cout || 0), 0) };
    }
  }
  return null;
}

/** Partitions contiguës en 3 parts dont les 3 morceaux sont des fragments déjà cherchés. */
function partitionsContigues(fragments, ctx) {
  const utiles = fragments
    .filter((f) => f.famille !== 'entier' && f.intervalles.length === 1)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  for (let i = 0; i < utiles.length && out.length < MAX_PARTITIONS; i++) {
    const a = utiles[i];
    for (let j = 0; j < utiles.length && out.length < MAX_PARTITIONS; j++) {
      const b = utiles[j];
      if (b.offset < a.offset + a.longueur) continue;
      for (let k = 0; k < utiles.length && out.length < MAX_PARTITIONS; k++) {
        const c = utiles[k];
        if (c.offset < b.offset + b.longueur) continue;
        // Couvrante : les trous ne portent que du non-signifiant ou des séparateurs.
        if (!trouAcceptable(ctx, 0, a.offset)) continue;
        if (!trouAcceptable(ctx, a.offset + a.longueur, b.offset)) continue;
        if (!trouAcceptable(ctx, b.offset + b.longueur, c.offset)) continue;
        if (!trouAcceptable(ctx, c.offset + c.longueur, fin)) continue;
        out.push([a, b, c]);
      }
    }
  }
  return out;
}

const RE_MOT = /[\p{L}\p{N}]/u;

function trouAcceptable(ctx, d, f) {
  if (f <= d) return true;
  const s = ctx.saisie || '';
  for (let i = d; i < f; i++) if (RE_MOT.test(s[i])) return false;
  return true;
}

/** Triplets de fragments disjoints parmi les meilleurs — bornés à C(12,3). */
function trioLibres(fragments, parFrag) {
  const notes = fragments
    .filter((f) => (parFrag.get(f.texte.normalize('NFC')) || []).length)
    .map((f) => ({ f, s: scorePartiel((parFrag.get(f.texte.normalize('NFC')) || [])[0]) }))
    .sort((a, b) => b.s - a.s || a.f.offset - b.f.offset)
    .slice(0, MAX_LIBRES)
    .map((x) => x.f)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      if (chevauche(notes[i], notes[j])) continue;
      for (let k = j + 1; k < notes.length; k++) {
        if (chevauche(notes[i], notes[k]) || chevauche(notes[j], notes[k])) continue;
        out.push([notes[i], notes[j], notes[k]]);
      }
    }
  }
  return out;
}

function chevauche(a, b) {
  for (const [d1, f1] of a.intervalles) {
    for (const [d2, f2] of b.intervalles) if (d1 < f2 && d2 < f1) return true;
  }
  return false;
}

/**
 * Anti-doublons N1 de niveau approche : « on déduplique sur ce qui est MONTRÉ,
 * pas sur ce qui est calculé » (§4.8). Le mode d'assemblage ne fait donc pas
 * partie de la clé, et les noms d'opérateurs non plus.
 *
 * Conséquence assumée : sur `hope`, « lettres + voyelles » et
 * « lettres + consonnes » (méthodes 2 et 3 du README) affichent exactement la
 * même suite d'images `hope → HOPE → 6`. Une seule des deux survit — c'est
 * précisément ce que recommandait la recherche arithmétique, qui les qualifie de
 * « statistiquement corrélées, pas indépendantes ».
 */
export function dedupliquerApproches(approches) {
  const vus = new Map();
  for (const a of approches) {
    if (!a.parts.every((p) => p.chemin)) continue;
    const cle = a.parts.map((p) => p.fragment.offset + ':' + cleTrace(p.chemin)).join('|');
    if (!vus.has(cle)) vus.set(cle, a);
  }
  return [...vus.values()];
}

// ══════════════════════════════════ garantie « jamais bredouille » (§5)

/**
 * Le joker français, appliqué TROIS FOIS (donc homogène, H = 1).
 * « Remplacer un nombre par le nombre de lettres de son nom en français. »
 * L'itération admet le cycle attracteur 4 → 6 → 3 → 5 → 4, qui contient 6 ;
 * tout chiffre de 0 à 9 atteint 6 en au plus 3 étapes. C'est une propriété du
 * FRANÇAIS : en anglais `four` a 4 lettres, donc 4 est un point fixe et
 * l'itération converge vers 4 sans jamais passer par 6.
 *
 * @returns {Object|null} une approche, ou null si le catalogue n'a pas de joker
 */
export function approcheJoker(saisie, ctx) {
  const ops = normaliserCatalogue(ctx.catalogue);
  const joker = ops.find((o) => o.isJoker && o.from === 'NUM' && o.to === 'NUM');
  if (!joker) return null;
  const mesures = ops.filter((o) => o.from === 'STR' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
  const reducteurs = ops.filter((o) => o.from === 'NUM' && o.to === 'NUM' && !o.deprecated && !o.isJoker);

  const s = String(saisie).normalize('NFC');
  const depart = etat('STR', s, [[0, s.length]]);
  let base = null;

  // Amorce 1 — une mesure directe STR→NUM.
  for (const m of mesures) {
    const apres = appliquerOp(m, depart);
    if (apres === null) continue;
    base = { ops: [m], etats: [depart, apres], valeur: apres.valeur, cout: m.cout || 1 };
    break;
  }
  // Amorce 2 — découpe puis dénombrement. Indispensable : le catalogue réel n'a
  // aucune mesure qui compte TOUS les signes (`n.longueur` ne compte que les
  // lettres), si bien qu'une saisie sans lettre — « !!! », « 42 », « … » —
  // n'aurait aucune amorce. Or la chaîne de garantie de research §5.3 repose sur
  // « toute saisie non vide possède au moins une longueur ».
  if (!base) {
    const decoupes = ops.filter((o) => o.from === 'STR' && o.to === 'TOKENS' && !o.deprecated && !o.isJoker);
    const denombrements = ops.filter((o) => o.from === 'TOKENS' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
    boucle:
    for (const d of decoupes) {
      const tokens = appliquerOp(d, depart);
      if (tokens === null) continue;
      for (const n of denombrements) {
        const apres = appliquerOp(n, tokens);
        if (apres === null) continue;
        base = {
          ops: [d, n],
          etats: [depart, tokens, apres],
          valeur: apres.valeur,
          cout: (d.cout || 1) + (n.cout || 1),
        };
        break boucle;
      }
    }
  }
  if (!base) return null;

  // Réduction à un chiffre, puis itération française (≤ 3 étapes, prouvé).
  let chemin = base;
  for (let garde = 0; garde < 12 && Math.abs(dernier(chemin).valeur) > 9; garde++) {
    const red = reducteurs.map((o) => ({ o, r: appliquerOp(o, dernier(chemin)) }))
      .find((x) => x.r !== null && Math.abs(x.r.valeur) < Math.abs(dernier(chemin).valeur));
    if (!red) break;
    chemin = prolonger(chemin, red.o, red.r);
  }
  for (let garde = 0; garde < 6 && dernier(chemin).valeur !== 6; garde++) {
    const r = appliquerOp(joker, dernier(chemin));
    if (r === null) break;
    chemin = prolonger(chemin, joker, r);
  }
  if (dernier(chemin).valeur !== 6) return null;

  const fragment = {
    texte: s, offset: 0, longueur: s.length, intervalles: [[0, s.length]],
    tokenDebut: 0, tokenLong: -1, famille: 'entier', priorite: 5,
  };
  return approche('JOKER', [0, 1, 2].map(() => ({ fragment, chemin })), { joker: true, resonance: false });
}

const dernier = (c) => c.etats[c.etats.length - 1];

function prolonger(c, op, cible) {
  return {
    ops: c.ops.concat([op]),
    etats: c.etats.concat([cible]),
    valeur: cible.type === 'NUM' ? cible.valeur : null,
    cout: c.cout + (op.cout || 0),
  };
}
