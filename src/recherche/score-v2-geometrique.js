// src/recherche/score-v2-geometrique.js
// Score v2 — quatre axes ADDITIFS, un global en MOYENNE GÉOMÉTRIQUE PONDÉRÉE.
//
// Piste explorée à côté du moteur, sans le toucher : `score.js › noter` reste
// la seule chose qui classe. Ce module LIT une approche notée (`criteres`,
// `bilan`, `parts`, `L`, `mode`…) et rend quatre entiers de 0 à 1 000, puis un
// global de 0 à 1 000. Le rapport de mesure est `.planning/banc/score-v2-
// geometrique.md`, le script `.planning/banc/score-v2-geometrique.mjs`.
//
// ── Les règles de l'auteur, telles qu'elles sont appliquées ici ─────────────
//
//  · AUCUN CLASSEMENT CACHÉ. Il n'y a ni rang avant le global, ni palier entre
//    les axes et le total : `globalDe(axes, curseurs)` est une fonction des
//    quatre axes et des quatre curseurs, et de rien d'autre. Le rang actuel
//    (séries sur caractères disjoints d'abord, convergences en dernier) est
//    devenu une composante de l'axe QUANTITÉ.
//  · LES TROIS RÉGIMES sont trois positions des curseurs (`REGIMES`).
//  · RIEN N'EST COMPTÉ DEUX FOIS. Les sept doublons du moteur sont tranchés :
//      U vs les postes d'effacement    → les postes (dans l'exhaustivité) ;
//      R vs les trois reliquats        → les reliquats (dans l'exhaustivité) ;
//      C vs « transformations en trop »→ C seul (dans la simplicité) ;
//      H compté dans deux axes et par trois postes → H seul, dans la simplicité ;
//      bonus « sans pirouette » vs A   → A seul (dans la cohérence) ;
//      bonus « couverture totale » vs U→ aucun : c'est « pertes = 0 » ;
//      malus de décret vs quantité     → dans la quantité seule.
//  · SENS DES AXES : simplicité « court et d'un seul tenant ? » ; exhaustivité
//    « toute la saisie lue, et tout ce qui est produit sert-il ? » — TOUTES les
//    pertes y vont ; quantité « combien de 666, et sont-ils gagnés ? » ;
//    cohérence « propre, familier, sans bidouille ? » — elle cache l'élégance
//    et prend le reste.
//  · COURBE DES PERTES CONCAVE : la perte est la RACINE CARRÉE de la part
//    perdue — on perd beaucoup vite, puis de moins en moins.
//
// ── Pourquoi une moyenne GÉOMÉTRIQUE ─────────────────────────────────────────
//
// Le moteur actuel est une chaîne de facteurs : ×√R, ×facteur(G), ×0,45 par
// joker… Un axe effondré y tire tout le score vers le bas. La moyenne
// arithmétique des axes perd cette propriété (un axe à zéro ne coûte que sa
// part) ; la géométrique la garde — `global = Π axeᵢ^(pᵢ)` avec Σpᵢ = 1 — tout
// en restant une moyenne pondérée : les pᵢ sont les parts des curseurs, et le
// pictogramme de poids affiché à côté d'un curseur dit encore la vérité.
//
// ★ EN ENTIERS, SANS FLOTTANT (CONTRACTS §4.4-2). Les parts sont des rationnels
//   cᵢ/S ; le global vaut donc (Π axeᵢ^cᵢ)^(1/S), un produit de BigInt suivi
//   d'une racine S-ième entière trouvée par dichotomie sur [0, 1 000]. Aucun
//   logarithme, aucun exposant fractionnaire : deux machines rendent le même
//   entier.
//
// ⚠️ Ce module ne dépend que de `elegance.js` (le détail du crédit, lu poste
//    par poste) et de `config.js` (le plafond des séries). Il n'importe pas
//    `score.js`, pour que la comparaison ne puisse pas se faire à elle-même.

import { detailDuCredit } from './elegance.js';
import { MAX_SERIES } from '../config.js';

export const AXES = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

const MILLE = 1000;
const borner = (x, min, max) => (x < min ? min : x > max ? max : x);
const fraction = (x, [num, den]) => Math.floor((x * num) / den);

/** Racine carrée entière (Newton) — la même que `score.js`, sans l'importer. */
export function racineEntiere(n) {
  if (n < 2) return n < 0 ? 0 : n;
  let x = n;
  let y = Math.floor((x + 1) / 2);
  while (y < x) { x = y; y = Math.floor((x + Math.floor(n / x)) / 2); }
  return x;
}

// ══════════════════════════════════ RÉGLAGES — LE SEUL ENDROIT À MODIFIER
//
// ★ Mutable, comme `score.js › REGLAGES` et `elegance.js › BAREME` : le banc
//   balaye les variantes en les réglant ici (`--reglages`), et nulle part
//   ailleurs. Rien dans ce module ne met une valeur en cache.

export const REGLAGES = {
  // ── SIMPLICITÉ ──────────────────────────────────────────────────────────
  /** Brièveté : C = 0,88 ^ max(0, L − 2), la loi actuelle (`score.js › critereConcision`). */
  BRIEVETE: { ideal: 2, decroissance: [88, 100] },
  /** Parts de la brièveté (C) et de l'unité de méthode (H) — les coefficients de `CORRESPONDANCE`. */
  POIDS_SIMPLICITE: { brievete: 150, unite: 125 },
  /** Un fragment de moins de deux caractères signifiants n'est pas « un tenant » (`MALUS.fragmentCreux`). */
  FRAGMENT_CREUX: [75, 100],
  /** Des fragments disjoints ne sont pas « d'un seul tenant » (`MALUS.modeLibre`). */
  MODE_LIBRE: [80, 100],

  // ── EXHAUSTIVITÉ ────────────────────────────────────────────────────────
  /**
   * Le tarif de ce qu'on n'a pas lu, PAR CARACTÈRE — l'échelle de l'auteur
   * (`elegance.js › BAREME`) : une lettre arrachée au milieu d'un mot vaut le
   * plein tarif, un bloc entier moins par caractère, un bloc court moins
   * encore, la ponctuation presque rien. `plein` est le dénominateur : la
   * perte est rapportée à « tout le signifiant arraché ».
   */
  TARIF_ENTREE: { alnum: 26, bloc: 20, blocCourt: 10, ponctuation: 5, plein: 26 },
  /**
   * Le tarif de ce qu'on a calculé puis laissé, PAR VALEUR — même échelle :
   * jeter en route est du travail fait pour rien, laisser un reste à la fin
   * est un reste, et un 6 en trop est le reste le moins grave.
   */
  TARIF_SORTIE: { jetee: 300, reliquatHorsCible: 90, reliquatDeCible: 50, plein: 300 },
  /**
   * Les compteurs du bilan qui disent « une valeur calculée puis écartée » :
   * `valeursJetees` (le geste ordinaire) et les écartements des ficelles, qui
   * REMPLACENT ce poste dans le barème actuel et se paient donc ici, une fois.
   */
  ECARTEMENTS: Object.freeze(['valeursJetees', 'majorite', 'decimation', 'effacementSansMotif', 'majoriteTacite']),

  // ── QUANTITÉ ────────────────────────────────────────────────────────────
  /** Le plafond des séries : ce que le moteur sait montrer d'un coup. */
  PLAFOND_SERIES: MAX_SERIES,
  /**
   * Parts des quatre composantes : le COMPTE des séries, la CONTIGUÏTÉ (un 666
   * écrit tel quel par un vecteur plutôt qu'assemblé de trois 6 épars),
   * l'ABONDANCE (les 6 au-delà des trois premiers, plafonnée) et la RÉSONANCE
   * (trois fragments littéralement identiques).
   *
   * ★ MESURÉ : le compte DOMINE (850 ‰), et c'est ce qui remplace le rang. Le
   *   moteur actuel fait passer « le plus de séries » AVANT le score ; pour
   *   qu'une moyenne reproduise cette précédence, l'axe quantité doit être
   *   presque monotone en séries. À 600/250/100/50 (premier réglage), la
   *   contiguïté renversait le compte — un groupement à six séries passait
   *   devant une moisson à sept — et la 2ᵈ place n'était reproduite que 3 fois
   *   sur 8 ; à 850/100/30/20, 7 fois sur 8, et la liste mixte y gagne aussi
   *   (15 têtes sur 16 contre 11). Voir le rapport.
   */
  POIDS_QUANTITE: { compte: 850, contiguite: 100, abondance: 30, resonance: 20 },
  /**
   * Le compte en RACINE (√(séries/9)) ou LINÉAIRE (séries/9).
   * ★ LINÉAIRE, et mesuré : la racine resserre l'écart entre six et sept séries
   *   (816 contre 882) au point que le reste de l'axe le renverse ; le linéaire
   *   garde l'échelle du moteur (`facteurQuantite`, un pas par série). La
   *   courbe concave de l'auteur vaut pour les PERTES, et un compte n'en est
   *   pas une. Les deux formes restent mesurables au banc (`--reglages`).
   */
  COMPTE_EN_RACINE: false,
  /** Ce que vaut un 666 contigu et un 666 répété du même vecteur (`BAREME`). */
  TARIF_TRIPTYQUE: { contigu: 260, repete: 90 },
  /** Plafond des 6 surnuméraires comptés (`BAREME.SIX_SURNUMERAIRE_MAX`). */
  SURNUMERAIRES_MAX: 15,
  /** Les mêmes caractères relus trois fois : la moitié du compte (`RANG.CONVERGENCE`, devenu facteur). */
  CONVERGENCE: [50, 100],
  /** Un 6 obtenu, trois annoncés : le décret est une fraude à la quantité (`MALUS.decret`). */
  DECRET: [40, 100],

  // ── COHÉRENCE ───────────────────────────────────────────────────────────
  /**
   * Parts : la FAMILIARITÉ des procédés (N), la FRANCHISE (A, absence de
   * bidouille), la LISIBILITÉ des nombres (E), la MANIÈRE (le socle moins les
   * fautes du barème) et la FINESSE (ce que le barème récompense au-dessus du
   * socle). Les trois premiers sont les coefficients de `CORRESPONDANCE`.
   */
  POIDS_COHERENCE: { familiarite: 200, franchise: 120, lisibilite: 100, maniere: 300, finesse: 80 },
  /** Ce que vaut une finesse pleine : couronnement tôt (150) + solde multiple de trois (90) + une addition de chiffres (55). */
  FINESSE_PLEINE: 300,
  /** Le joker (`MALUS.joker`), ici et nulle part ailleurs. */
  JOKER: [45, 100],
  /**
   * Les postes du crédit que la cohérence NE LIT PAS, parce qu'ils sont
   * comptés ailleurs — c'est la liste des doublons, en clair :
   *  · `SOCLE` et la famille `quantite` → quantité ;
   *  · la famille `exhaustivite` et les trois reliquats → exhaustivité ;
   *  · `TRANSFORMATION` → C, dans la simplicité ;
   *  · `FILTRE_SELECTIF`, `REGLAGE_PAR_MORCEAU`, `LECTURE_DIVERGENTE` → H ;
   *  · `MAJORITE`, `DECIMATION`, `EFFACEMENT_SANS_MOTIF`, `MAJORITE_TACITE` →
   *    des valeurs écartées, payées comme telles dans l'exhaustivité.
   */
  POSTES_LUS_AILLEURS: new Set([
    'SOCLE', 'TRIPTYQUE_CONTIGU', 'TRIPTYQUE_REPETE', 'SIX_SURNUMERAIRE',
    'PORTEE_IGNOREE', 'EFFACE_ALNUM', 'EFFACE_BLOC', 'EFFACE_BLOC_COURT', 'EFFACE_PONCTUATION',
    'VALEUR_JETEE', 'RELIQUAT_HORS_CIBLE', 'RELIQUAT_DE_CIBLE', 'RELIQUAT_PROPORTIONNEL',
    'TRANSFORMATION', 'FILTRE_SELECTIF', 'REGLAGE_PAR_MORCEAU', 'LECTURE_DIVERGENTE',
    'MAJORITE', 'DECIMATION', 'EFFACEMENT_SANS_MOTIF', 'MAJORITE_TACITE',
  ]),

  // ── CURSEURS ────────────────────────────────────────────────────────────
  CURSEUR_DEFAUT: 100,
  CURSEUR_MAX: 200,
};

// ══════════════════════════════════ les quatre axes

const seriesDe = (a) => Math.max(1, Math.trunc(a.series || (a.bilan && a.bilan.series) || 1));
const critere = (a, lettre) => {
  const v = a.criteres && a.criteres[lettre];
  return Number.isFinite(v) ? borner(v, 0, MILLE) : MILLE;
};
const estAlnum = (c) => /[0-9\p{L}]/u.test(c);
const nbSignifiants = (texte) => [...String(texte || '')].filter(estAlnum).length;
const tousOps = (a) => {
  const out = [];
  for (const p of a.parts || []) for (const op of (p.chemin && p.chemin.ops) || []) out.push(op);
  return out;
};

/** La perte concave : racine carrée de la part perdue, en pour-mille. */
export const perteConcave = (partPerdue) => racineEntiere(borner(partPerdue, 0, MILLE) * MILLE);

/**
 * SIMPLICITÉ — « court et d'un seul tenant ? »
 *   (150·C + 125·H) / 275, ×0,75 si un fragment est creux, ×0,80 en mode LIBRE.
 */
export function simpliciteDe(a) {
  const { ideal, decroissance } = REGLAGES.BRIEVETE;
  let C = MILLE;
  for (let i = ideal; i < (a.L | 0); i++) C = fraction(C, decroissance);
  const H = critere(a, 'H');
  const P = REGLAGES.POIDS_SIMPLICITE;
  let s = Math.floor((P.brievete * C + P.unite * H) / (P.brievete + P.unite));
  if ((a.parts || []).some((p) => nbSignifiants(p.fragment && p.fragment.texte) < 2)) s = fraction(s, REGLAGES.FRAGMENT_CREUX);
  if (a.mode === 'LIBRE') s = fraction(s, REGLAGES.MODE_LIBRE);
  return borner(s, 0, MILLE);
}

/**
 * EXHAUSTIVITÉ — « toute la saisie lue, et tout ce qui est produit sert-il ? »
 *
 * Deux parts perdues, en pour-mille : à l'ENTRÉE (ce qu'on n'a pas lu, tarifé
 * par caractère selon ce que c'était) et à la SORTIE (ce qu'on a calculé puis
 * écarté ou laissé, tarifé par valeur). Ce qui est « lu ET employé » est le
 * produit des deux parts gardées ; l'axe vaut 1 000 moins la RACINE de ce qui
 * manque à ce produit — la courbe concave demandée.
 */
export function exhaustiviteDe(a) {
  const b = a.bilan || {};
  const ab = b.abandons || {};
  const TE = REGLAGES.TARIF_ENTREE;
  const signifiants = ab.signifiants || 0;
  let pEntree = 0;
  if (signifiants > 0) {
    const perte = TE.alnum * (ab.alnum || 0) + TE.bloc * (ab.bloc || 0)
      + TE.blocCourt * (ab.blocCourt || 0) + TE.ponctuation * (ab.ponctuation || 0);
    pEntree = borner(Math.floor((perte * MILLE) / (TE.plein * signifiants)), 0, MILLE);
  }
  const TS = REGLAGES.TARIF_SORTIE;
  let ecartees = 0;
  for (const cle of REGLAGES.ECARTEMENTS) ecartees += b[cle] || 0;
  const montrees = b.montrees || 0;
  const calculees = montrees + ecartees;
  let pSortie = 0;
  if (calculees > 0) {
    const perte = TS.jetee * ecartees + TS.reliquatHorsCible * (b.reliquatHorsCible || 0)
      + TS.reliquatDeCible * (b.reliquatDeCible || 0);
    pSortie = borner(Math.floor((perte * MILLE) / (TS.plein * calculees)), 0, MILLE);
  }
  const gardee = Math.floor(((MILLE - pEntree) * (MILLE - pSortie)) / MILLE);
  return borner(MILLE - perteConcave(MILLE - gardee), 0, MILLE);
}

/**
 * QUANTITÉ — « combien de 666, et sont-ils gagnés ? »
 *   compte     = séries / 9, en pour-mille (ou √(séries / 9), selon `COMPTE_EN_RACINE`) ;
 *   contiguïté = (260·contigus + 90·répétés) / (260·séries) ;
 *   abondance  = min(6 − 3, 15) / 15 ;
 *   résonance  = 1 000 ou 0 ;
 *   puis ×0,50 si convergence (les mêmes caractères relus trois fois — le rang
 *   actuel, devenu facteur), ×0,40 si décret.
 */
export function quantiteDe(a) {
  const b = a.bilan || {};
  const series = Math.min(seriesDe(a), REGLAGES.PLAFOND_SERIES);
  const compte = REGLAGES.COMPTE_EN_RACINE
    ? racineEntiere(Math.floor((series * MILLE * MILLE) / REGLAGES.PLAFOND_SERIES))
    : Math.floor((series * MILLE) / REGLAGES.PLAFOND_SERIES);
  const T = REGLAGES.TARIF_TRIPTYQUE;
  const contiguite = borner(Math.floor(
    ((T.contigu * (b.triptyquesContigus || 0) + T.repete * (b.triptyquesRepetes || 0)) * MILLE) / (T.contigu * series),
  ), 0, MILLE);
  const surplus = borner((b.six || 0) - (b.longueurSerie || 3), 0, REGLAGES.SURNUMERAIRES_MAX);
  const abondance = Math.floor((surplus * MILLE) / REGLAGES.SURNUMERAIRES_MAX);
  const resonance = a.resonance ? MILLE : 0;
  const P = REGLAGES.POIDS_QUANTITE;
  let q = Math.floor(
    (P.compte * compte + P.contiguite * contiguite + P.abondance * abondance + P.resonance * resonance)
    / (P.compte + P.contiguite + P.abondance + P.resonance),
  );
  if (a.mode === 'CONVERGENCE') q = fraction(q, REGLAGES.CONVERGENCE);
  if (a.decret) q = fraction(q, REGLAGES.DECRET);
  return borner(q, 0, MILLE);
}

/**
 * COHÉRENCE — « propre, familier, sans bidouille ? »
 *   (200·N + 120·A + 100·E + 300·manière + 80·finesse) / 800, ×0,45 par joker.
 *   manière = 1 000 − Σ malus du barème (hors postes lus ailleurs), plancher 0 ;
 *   finesse = Σ bonus du barème au-dessus du socle, rapportés à 300, plafond 1 000.
 */
export function coherenceDe(a) {
  let malus = 0;
  let bonus = 0;
  if (a.bilan) {
    for (const ligne of detailDuCredit(a.bilan)) {
      if (REGLAGES.POSTES_LUS_AILLEURS.has(ligne.cle)) continue;
      if (ligne.points < 0) malus -= ligne.points; else bonus += ligne.points;
    }
  }
  const maniere = borner(MILLE - malus, 0, MILLE);
  const finesse = borner(Math.floor((bonus * MILLE) / REGLAGES.FINESSE_PLEINE), 0, MILLE);
  const P = REGLAGES.POIDS_COHERENCE;
  let c = Math.floor(
    (P.familiarite * critere(a, 'N') + P.franchise * critere(a, 'A') + P.lisibilite * critere(a, 'E')
      + P.maniere * maniere + P.finesse * finesse)
    / (P.familiarite + P.franchise + P.lisibilite + P.maniere + P.finesse),
  );
  const jokers = tousOps(a).filter((o) => o && o.isJoker).length;
  for (let i = 0; i < jokers; i++) c = fraction(c, REGLAGES.JOKER);
  return borner(c, 0, MILLE);
}

/** Les quatre axes d'une approche notée, entiers de 0 à 1 000. */
export function axesDe(approche) {
  const a = approche || {};
  return {
    simplicite: simpliciteDe(a),
    exhaustivite: exhaustiviteDe(a),
    quantite: quantiteDe(a),
    coherence: coherenceDe(a),
  };
}

// ══════════════════════════════════ le global

const positionDe = (v) => {
  if (v === undefined || v === null || v === '') return REGLAGES.CURSEUR_DEFAUT;
  const n = Number(v);
  return Number.isFinite(n) ? borner(Math.trunc(n), 0, REGLAGES.CURSEUR_MAX) : REGLAGES.CURSEUR_DEFAUT;
};
const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);

/**
 * Les quatre parts, en entiers réduits : (cᵢ / pgcd) et leur somme S.
 * Quatre curseurs à zéro n'ont pas de parts définies : on prend l'égalité.
 */
export function partsDe(curseurs) {
  const c = curseurs || {};
  let parts = AXES.map((axe) => positionDe(c[axe]));
  let somme = parts.reduce((s, p) => s + p, 0);
  if (somme === 0) { parts = AXES.map(() => 1); somme = AXES.length; }
  const d = parts.reduce((g, p) => pgcd(g, p), 0);
  parts = parts.map((p) => p / d);
  return { parts, somme: somme / d };
}

/** Racine S-ième entière de P (BigInt), par dichotomie sur [0, 1 000]. */
function racineSieme(P, S) {
  let bas = 0n;
  let haut = 1000n;
  const s = BigInt(S);
  while (bas < haut) {
    const m = (bas + haut + 1n) / 2n;
    if (m ** s <= P) bas = m; else haut = m - 1n;
  }
  return Number(bas);
}

/**
 * LE GLOBAL — moyenne géométrique pondérée des quatre axes, en entier :
 *   global = ⌊ (Π axeᵢ^cᵢ)^(1/S) ⌋   avec S = Σcᵢ,
 * ce qui vaut exactement 1 000 · Π (axeᵢ/1 000)^(cᵢ/S). Un axe à zéro rend
 * zéro : c'est le veto multiplicatif du moteur actuel, conservé.
 */
export function globalDe(axes, curseurs) {
  const { parts, somme } = partsDe(curseurs);
  let P = 1n;
  AXES.forEach((axe, i) => {
    const v = BigInt(borner(Math.trunc(axes[axe] || 0), 0, MILLE));
    P *= v ** BigInt(parts[i]);
  });
  return racineSieme(P, somme);
}

/** La même moyenne, ARITHMÉTIQUE — pour la comparaison, et pour elle seule. */
export function globalArithmetique(axes, curseurs) {
  const { parts, somme } = partsDe(curseurs);
  let s = 0;
  AXES.forEach((axe, i) => { s += parts[i] * borner(Math.trunc(axes[axe] || 0), 0, MILLE); });
  return Math.floor(s / somme);
}

/**
 * ★ LES TROIS RÉGIMES — trois positions des curseurs, et rien d'autre.
 *
 * Mesurées au banc (`.planning/banc/score-v2-geometrique.mjs`, seize saisies,
 * balayage de 5 841 jeux au pas de 25) : ce sont les jeux RONDS les plus
 * proches du meilleur balayage pour chaque place de la liste, en géométrique.
 *
 *   mixte      8 / 23 / 62 /  8 %  → 14 têtes sur 16 gardées (+1 ex æquo), ⇄ordre 92 %
 *   elegance   7 / 53 / 13 / 27 %  → 10 têtes sur 16, ⇄ordre 87,5 %
 *   abondance  0 / 30 / 60 / 10 %  → 7 têtes sur 8, ⇄ordre 91 %
 *
 * ⚠️ La quantité pèse dans les trois, même à la 1ʳᵉ place — 13 %, et non le
 *    « 1 % » de l'auteur : à 8 % la tête d'élégance n'est plus reproduite que
 *    8 fois sur 16. Ce que le moteur actuel appelle élégance lit U·R, c'est-à-
 *    dire l'exhaustivité, avant tout — et c'est ce que ce régime dit.
 *    Le rapport donne les chiffres, y compris là où l'arithmétique fait
 *    aussi bien.
 */
export const REGIMES = Object.freeze({
  /** la liste ordinaire — le compte commande, l'exhaustivité départage */
  mixte: Object.freeze({ simplicite: 25, exhaustivite: 75, quantite: 200, coherence: 25 }),
  /** 1ʳᵉ place — ce qu'on lit et ce qui sert, puis la propreté ; le compte presque muet */
  elegance: Object.freeze({ simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 100 }),
  /** 2ᵈ place — le compte d'abord, l'exhaustivité ensuite, la simplicité ne compte pas */
  abondance: Object.freeze({ simplicite: 0, exhaustivite: 75, quantite: 150, coherence: 25 }),
});
