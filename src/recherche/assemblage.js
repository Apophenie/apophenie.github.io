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
import {
  appliquerOp, etat, normaliserCatalogue, cleTrace, rendreValeur, ordreCode,
} from './bfs.js';

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

// ══════════════════════════════════ N2 et N3, appliqués au chemin entier
//
// `research/heuristique.md §4.8` prévoit quatre niveaux d'anti-doublons. Deux
// d'entre eux ne mordaient pas, et pour la même raison : ils étaient appliqués
// LOCALEMENT, sur une étape, alors qu'ils portent sur le chemin.
//
//  · N3 — « élimination des opérations neutres ». Le BFS écarte bien l'étape
//    qui ne change rien à l'état COURANT (`kc === cleSrc`, bfs.js). Mais sur
//    `hope-hope-hope.fr`, `f.lettres` change l'état courant — il donne
//    « hopehopehopefr » — et pourtant il ne change RIEN À LA SUITE : le filtre
//    des voyelles qui vient après aboutit à « oeoeoe » dans les deux cas. Le
//    chemin `f6+f7+n1` est donc `f7+n1` avec une étape de décor, et les deux
//    apparaissaient côte à côte dans la liste (défauts 3 et 4). La neutralité
//    n'est ici vraie que SUR CETTE SAISIE — c'est suffisant, puisque la
//    démonstration ne porte que sur elle.
//
//  · N2 — « normalisation des filtres commutatifs ». Le prototype trie les
//    codes pour la CLÉ, mais laisse le chemin dans son ordre d'origine ; comme
//    la clé porte aussi la trace des valeurs, et que la trace diffère,
//    `f1+f3+n3` et `f3+f1+n3` survivaient tous les deux. §4.8 demande de trier
//    la suite commutante AVANT de calculer N1 : c'est le chemin qu'on
//    réordonne, pas seulement sa clé.
//
// Les deux se composent : réordonner peut fusionner deux suites commutantes et
// rendre une étape neutre, retirer une étape peut rapprocher deux filtres. On
// itère donc jusqu'au point fixe (au plus `TOURS_NORMALISATION` tours).

const TOURS_NORMALISATION = 4;

/** Rejoue une suite d'opérateurs depuis le texte de départ d'un chemin. */
function rejouerOps(source, ops) {
  let courant = etat('STR', source, [[0, source.length]]);
  const etats = [courant];
  let cout = 0;
  for (const op of ops) {
    const apres = appliquerOp(op, courant);
    if (apres === null) return null;
    etats.push(apres);
    cout += op.cout || 0;
    courant = apres;
  }
  return {
    ops: ops.slice(),
    etats,
    valeur: courant.type === 'NUM' ? courant.valeur : null,
    cout,
  };
}

/**
 * Deux chemins finissent-ils sur exactement le même état ? C'est l'invariant
 * inviolable de toute simplification : on a le droit d'enlever du décor, jamais
 * de changer le résultat. Sans ce garde-fou, retirer la DERNIÈRE étape passait
 * toujours le test de trace (la trace attendue perd justement le dernier état),
 * et `f7+n1` se « simplifiait » en `f7` — un chemin qui n'arrive nulle part.
 */
function memeAboutissement(a, b) {
  const fa = a.etats[a.etats.length - 1];
  const fb = b.etats[b.etats.length - 1];
  return fa.type === fb.type && rendreValeur(fa) === rendreValeur(fb);
}

/**
 * N3 étendu : retire la première étape INOPÉRANTE — celle dont l'absence laisse
 * le chemin aboutir exactement au même endroit.
 *
 * Le critère est le RÉSULTAT, pas l'image intermédiaire. C'est délibéré, et
 * c'est ce qui fait la différence entre attraper le doublon et le laisser
 * passer : sur `https://www.google.com`, `f1+f3+f7+n7` et `f3+f7+n7` montrent
 * deux images intermédiaires différentes — « www.google » contre
 * « https://www.google » — mais le filtre des voyelles les ramène toutes deux à
 * « ooe ». Le premier filtre n'a rien fait ; exiger l'égalité des images
 * intermédiaires l'aurait déclaré indispensable.
 *
 * Le typage des opérateurs protège le cœur de la méthode : on ne peut pas
 * retirer `t.caracteres` d'un `t1+m1+c1`, parce que `m1` n'accepte pas un `STR`.
 * Ce qui saute est ce qui peut sauter : du décor.
 */
function retirerUneEtapeInoperante(chemin, source) {
  for (let i = 0; i < chemin.ops.length; i++) {
    const sans = chemin.ops.slice(0, i).concat(chemin.ops.slice(i + 1));
    if (!sans.length) continue;
    const rejoue = rejouerOps(source, sans);
    if (!rejoue) continue;
    if (memeAboutissement(rejoue, chemin)) return rejoue;
  }
  return null;
}

/** N2 : trie chaque suite maximale d'opérateurs commutants par code croissant. */
function reordonnerCommutants(chemin, source) {
  const ops = chemin.ops;
  const trie = [];
  let bloc = [];
  const vider = () => {
    if (!bloc.length) return;
    bloc.sort((a, x) => {
      const [fa, ia] = ordreCode(a.code);
      const [fx, ix] = ordreCode(x.code);
      return fa !== fx ? fa - fx : ia - ix;
    });
    trie.push(...bloc);
    bloc = [];
  };
  for (const op of ops) {
    if (op.commute) bloc.push(op);
    else { vider(); trie.push(op); }
  }
  vider();
  if (trie.every((op, i) => op === ops[i])) return null;
  const rejoue = rejouerOps(source, trie);
  // Réordonner change les images intermédiaires — c'est le but —, mais jamais
  // le résultat : sinon ce n'était pas une commutation.
  if (!rejoue || !memeAboutissement(rejoue, chemin)) return null;
  return rejoue;
}

/**
 * Forme canonique d'un chemin : filtres commutants triés, étapes décoratives
 * retirées. Mémoïsée sur l'objet chemin — l'assemblage repasse dessus des
 * dizaines de fois.
 * @param {Object} chemin
 * @returns {Object} le chemin canonique (le même objet s'il l'était déjà)
 */
export function normaliserChemin(chemin) {
  if (chemin._can) return chemin._can;
  const depart = chemin.etats[0];
  if (!depart || depart.type !== 'STR') { chemin._can = chemin; return chemin; }
  const source = depart.valeur;
  let courant = chemin;
  for (let tour = 0; tour < TOURS_NORMALISATION; tour++) {
    const range = reordonnerCommutants(courant, source);
    if (range) courant = range;
    const allege = retirerUneEtapeInoperante(courant, source);
    if (!allege) { if (!range) break; continue; }
    courant = allege;
  }
  if (courant !== chemin && !memeAboutissement(courant, chemin)) courant = chemin;
  if (courant !== chemin) {
    courant.tronque = chemin.tronque;
    courant.tronqueTemps = chemin.tronqueTemps;
    courant._can = courant;
  }
  chemin._can = courant;
  return courant;
}

/** Ordre déterministe local, calqué sur celui du faisceau (bfs.js). */
function comparerChemins(a, b) {
  const sa = scorePartiel(a);
  const sb = scorePartiel(b);
  if (sa !== sb) return sb - sa;
  if (a.ops.length !== b.ops.length) return a.ops.length - b.ops.length;
  return comparerCodes(a.ops.map((o) => o.code), b.ops.map((o) => o.code));
}

/**
 * Combien de chemins on canonicalise par fragment.
 *
 * La canonicalisation rejoue le programme une fois par étape candidate : c'est
 * quadratique en la longueur du chemin, donc à réserver aux chemins qui ont une
 * chance de servir. La liste arrive triée par `comparerPrefixes` (bfs.js) et
 * l'assemblage n'en garde que `K_PAR_FRAGMENT` ; on prend une marge de trois
 * pour que la déduplication ait de quoi puiser, pas plus. Mesuré sur le
 * paragraphe de test : 3 050 ms sans borne, 300 ms avec.
 */
const K_CANONISABLES = K_PAR_FRAGMENT * 3;

/**
 * Canonicalise puis re-déduplique une liste de chemins. C'est ici que
 * disparaissent les quasi-doublons — `f6+f7+n1` s'effondre sur `f7+n1`,
 * `f3+f1+n3` sur `f1+f3+n3`.
 */
export function normaliserChemins(chemins) {
  const vus = new Map();
  for (const c of chemins.slice(0, K_CANONISABLES)) {
    const n = normaliserChemin(c);
    const cle = cleTrace(n) + '' + n.ops.map((o) => o.code).join('+');
    const ancien = vus.get(cle);
    if (!ancien || comparerChemins(n, ancien) < 0) vus.set(cle, n);
  }
  return [...vus.values()].sort(comparerChemins);
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
  // Les chemins sont canonicalisés AVANT d'entrer dans un assemblage (N2/N3
  // ci-dessus) : c'est ce qui empêche « voyelles → compter » et « lettres →
  // voyelles → compter » d'occuper deux lignes de la même liste. Le résultat est
  // mémoïsé par fragment — `assembler` redemande les mêmes chemins des dizaines
  // de fois (résonance, partitions, trios libres).
  const canoniques = new Map();
  const cheminsDe = (f) => {
    const cle = f.texte.normalize('NFC');
    let v = canoniques.get(cle);
    if (v === undefined) {
      v = normaliserChemins(parFrag.get(cle) || []).slice(0, K_PAR_FRAGMENT);
      canoniques.set(cle, v);
    }
    return v;
  };

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
    // La clé porte le TEXTE du fragment, pas son offset, et elle est triée.
    // Sur `hope-hope-hope.fr`, « le premier hope et les deux tirets » et « le
    // deuxième hope et les deux tirets » calculent exactement les mêmes trois
    // 6 sur exactement les mêmes trois textes : c'est un seul spectacle, et
    // l'occurrence choisie n'est pas une différence de méthode. L'offset, lui,
    // ne servait qu'à les faire passer pour deux lignes distinctes.
    const cle = a.parts
      .map((p) => p.fragment.texte + '' + cleTrace(p.chemin))
      .sort()
      .join('|');
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
