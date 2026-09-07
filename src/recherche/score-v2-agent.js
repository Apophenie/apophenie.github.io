// src/recherche/score-v2-agent.js — un score à QUATRE axes, et rien d'autre.
//
// ★ Module PUR, INDÉPENDANT du moteur actuel : il ne lit qu'une approche déjà
//   notée (`criteres`, `bilan`, `parts`, `mode`, `series`…) et n'importe rien
//   de `score.js` ni d'`elegance.js`. C'est un prototype de mesure — voir
//   `.planning/banc/score-v2-agent.mjs` et le rapport `score-v2-agent.md`.
//
// ── Les règles de l'auteur ────────────────────────────────────────────────────
//
//  · Aucun classement caché : le global est la moyenne pondérée des quatre axes
//    par les quatre curseurs, point. Pas de rang qui passe avant, pas de cran
//    entre les axes et le total.
//  · Les trois régimes (liste ordinaire, 1ʳᵉ place, 2ᵈ place) ne sont que trois
//    positions des curseurs (`REGIMES`).
//  · Rien n'est compté deux fois : chaque ingrédient d'une approche est lu par
//    UN axe et un seul (le tableau ci-dessous dit lequel).
//  · Déterminisme strict : arithmétique entière, pas de flottant dans les
//    résultats, pas d'ordre d'itération d'objet, pas de `localeCompare`.
//
// ── Ce que chaque axe mesure, et avec quoi ────────────────────────────────────
//
//   simplicité   « est-ce court et d'un seul tenant ? »
//                  brièveté(L + retouches) × unité(H)
//   exhaustivité « a-t-on tout lu, et tout ce qu'on a produit sert-il ? »
//                  une seule fraction de matière utile, du premier caractère au
//                  dernier jeton, puis la courbe concave (racine) des pertes
//   quantité     « combien de 666, et sont-ils gagnés ? »
//                  les séries, comptées en tiers quand elles sont décrétées ou
//                  relues sur les mêmes lettres, rapportées au plafond
//   cohérence    « est-ce propre, familier, sans bidouille ? »
//                  familiarité (N), honnêteté des outils (A), lisibilité des
//                  nombres (E), et la MANIÈRE — ce qui est arrivé aux valeurs en
//                  chemin, bonus et malus, dans un crédit borné
//
// ── Ce que le moteur actuel compte deux fois, et où ça vit ici ───────────────
//
//   1. U + cinq postes d'effacement    → exhaustivité, une seule fraction lue
//   2. R + trois reliquats             → exhaustivité, le reste du vecteur
//   3. C + « transformations en trop » → simplicité, L seul
//   4. H + lecture divergente + réglage par morceau + filtre sélectif
//                                      → simplicité, H seul
//   5. bonus « sans pirouette » + A    → cohérence, A seul
//   6. bonus « couverture totale »     → rien (c'est un seuil sur U)
//   7. malus de décret ×0,40           → quantité, une série décrétée vaut un tiers

export const AXES = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

const MILLE = 1000;

/** Les curseurs vont de 0 à 200 ; 100 est neutre. Seuls leurs rapports comptent. */
export const CURSEUR_MAX = 200;

/**
 * ★ TOUTES les constantes internes, nommées. Aucun autre nombre n'apparaît
 *   dans les calculs ci-dessous.
 */
export const REGLAGES = Object.freeze({
  // ── simplicité ─────────────────────────────────────────────────────────────
  /** Jusqu'à tant d'étapes rendues, la brièveté est pleine. */
  ETAPES_GRATUITES: 2,
  /**
   * Brièveté = K / (K + étapes en trop), en pour-mille. Hyperbolique : la
   * marche 2 → 3 coûte plus que 5 → 6, et le critère ne tombe jamais à zéro.
   *   K = 6 : L=3 → 857, 4 → 750, 6 → 600, 9 → 462, 12 → 375, 14 → 333.
   */
  BRIEVETE_K: 6,
  /** Une retouche (portée réécrite avant lecture) est une étape de plus. */
  RETOUCHE_EN_ETAPES: 1,

  // ── exhaustivité ───────────────────────────────────────────────────────────
  /**
   * Le prix d'un caractère jeté, en millièmes d'un caractère « plein ». Une
   * lettre arrachée au milieu d'un mot coûte plein tarif ; un bloc entier
   * écarté coûte moins par caractère ; un bloc court (< 3 lettres) moins
   * encore ; la ponctuation ignorée est légère, mais pas gratuite.
   */
  PRIX_ALNUM: 1000,
  PRIX_BLOC: 600,
  PRIX_BLOC_COURT: 300,
  PRIX_PONCTUATION: 120,
  /** Un 6 produit mais non montré (surplus d'une série) pèse la moitié d'un reste ordinaire. */
  PRIX_RESTE_DE_CIBLE: 500,

  // ── quantité ───────────────────────────────────────────────────────────────
  /** Le plafond des séries que le moteur sait montrer (`config.js › MAX_SERIES`). */
  PLAFOND_SERIES: 9,
  /** Une série DÉCRÉTÉE (un 6 calculé, trois annoncés) vaut un tiers d'une série gagnée. */
  TIERS_PAR_SERIE_DECRETEE: 1,
  /** Une série obtenue en relisant trois fois les MÊMES lettres (convergence) vaut un tiers aussi. */
  TIERS_PAR_SERIE_CONVERGENTE: 1,
  /** Une série obtenue par joker ne vaut rien. */
  TIERS_PAR_SERIE_JOKER: 0,
  /** Une série ordinaire vaut trois tiers. */
  TIERS_PAR_SERIE: 3,
  /** La courbe du compte : 'racine' (concave — la 2ᵉ série vaut plus que la 9ᵉ) ou 'lineaire'. */
  COURBE_QUANTITE: 'racine',

  // ── cohérence ──────────────────────────────────────────────────────────────
  /** Les parts des quatre ingrédients de la cohérence, en pour-mille (rapports seuls). */
  PART_FAMILIARITE: 200,   // N
  PART_HONNETETE: 120,     // A
  PART_LISIBILITE: 100,    // E
  PART_MANIERE: 250,       // le crédit ci-dessous
  /** Le crédit de manière part d'ici ; les bonus le montent vers 1 000, les malus le baissent vers 0. */
  SOCLE_MANIERE: 800,
  /** ★ bonus — un 666 écrit tel quel dans le vecteur… */
  BONUS_TRIPTYQUE_LITTERAL: 80,
  /** …et d'autant plus qu'il arrive tôt (ou qu'il clôt le dernier mot) — au prorata de `couronnementTot`. */
  BONUS_COURONNEMENT: 120,
  /** ★ bonus — les trois fragments sont le même texte, lu de la même façon : trois fois le même 6. */
  BONUS_RESONANCE: 200,
  /** ★ malus — un 666 déjà écrit, puis défait. Le pire. */
  MALUS_TRIPTYQUE_CASSE: 430,
  /** ★ malus — la QUESTION a été réécrite avant d'être lue. */
  MALUS_RETOUCHE: 420,
  /** ★ malus — le même mot traduit de deux façons. */
  MALUS_TRADUCTION_DIVERGENTE: 300,
  /** ★ malus — un 6 déjà obtenu, converti en autre chose (par 6). */
  MALUS_SIX_DETRUIT: 48,
  /** ★ malus — les trois « artificiels » de l'auteur, dans son ordre : moyenne arrondie > min/max > lettre → lettre. */
  MALUS_ARRONDI: 96,          // au prorata de l'amplitude (millièmes d'une demi-unité)
  MALUS_MIN_MAX: 72,          // par emploi
  MALUS_LETTRE_VERS_LETTRE: 40, // par emploi
  /*
   * ★ CE QUI N'EST PAS ICI, ET POURQUOI : les compteurs de réécriture du bilan
   *   (`egalisees`, `redecoupage`, `additionSelective`, `rearrangement`,
   *   `ecritureEnLettres`, `majorite`…) décrivent la NATURE d'un outil — ce que
   *   le catalogue publie déjà par `adHoc` et `notoriete`, lus par A et N. Les
   *   facturer une seconde fois serait le doublon que l'auteur a lui-même
   *   refusé en sortant `meg` des ficelles (« le prix de son manque de
   *   notoriété remplace le soupçon, il ne s'y ajoute pas »). Ce que ces outils
   *   JETTENT, en revanche, est compté — par l'exhaustivité.
   */
});

// ══════════════════════════════════ arithmétique entière

const borner = (x, min, max) => (x < min ? min : x > max ? max : x);

/** `x × num / den`, tronqué. */
const fraction = (x, num, den) => (den > 0 ? Math.floor((x * num) / den) : 0);

/** Racine carrée entière (plancher), par Newton — pas de flottant. */
export function racineEntiere(n) {
  if (n <= 0) return 0;
  let x = n;
  let y = (x + 1) >> 1;
  while (y < x) { x = y; y = Math.floor((x + Math.floor(n / x)) / 2); }
  return x;
}

/** 1 000 − √(perte / 1 000) en pour-mille : la courbe CONCAVE des pertes. */
const survie = (perteMillemes) => MILLE - racineEntiere(borner(perteMillemes, 0, MILLE) * MILLE);

const ops = (approche) => {
  const out = [];
  for (const p of (approche && approche.parts) || []) {
    for (const op of (p.chemin && p.chemin.ops) || []) out.push(op);
  }
  return out;
};

// ══════════════════════════════════ les quatre axes

/** SIMPLICITÉ — court (L, retouches comprises) ET d'un seul tenant (H). */
export function simplicite(approche) {
  const R = REGLAGES;
  const c = (approche && approche.criteres) || {};
  const b = (approche && approche.bilan) || {};
  const L = (Number.isFinite(approche && approche.L) ? approche.L : 0)
    + (b.retouches || 0) * R.RETOUCHE_EN_ETAPES;
  const enTrop = Math.max(0, L - R.ETAPES_GRATUITES);
  const brievete = fraction(MILLE, R.BRIEVETE_K, R.BRIEVETE_K + enTrop);
  const unite = c.H === undefined ? MILLE : borner(c.H, 0, MILLE);
  return fraction(brievete, unite, MILLE);
}

/**
 * EXHAUSTIVITÉ — la part de la matière qui SERT, du début à la fin :
 *   lue   = ce que la saisie a de signifiant, moins les caractères jetés (pesés)
 *   route = ce qu'on a calculé, moins ce qu'on a jeté en chemin
 *   fin   = ce qu'on montre, moins ce qui reste après le verdict
 * puis la courbe concave : 1 000 − √perte.
 */
export function exhaustivite(approche) {
  const R = REGLAGES;
  const b = (approche && approche.bilan) || {};
  const a = b.abandons || {};

  // 1. la saisie
  const signifiants = a.signifiants || 0;
  let lue = MILLE;
  if (signifiants > 0) {
    const jete = (a.alnum || 0) * R.PRIX_ALNUM + (a.bloc || 0) * R.PRIX_BLOC
      + (a.blocCourt || 0) * R.PRIX_BLOC_COURT + (a.ponctuation || 0) * R.PRIX_PONCTUATION;
    lue = MILLE - borner(fraction(MILLE, jete, signifiants * R.PRIX_ALNUM), 0, MILLE);
  }

  // 2. en route — tout ce qui a été calculé puis jeté avant la fin
  const jetees = (b.valeursJetees || 0) + (b.majorite || 0) + (b.majoriteTacite || 0)
    + (b.decimation || 0) + (b.effacementSansMotif || 0);
  const montrees = b.montrees || 0;
  const route = montrees + jetees > 0 ? fraction(MILLE, montrees, montrees + jetees) : MILLE;

  // 3. à la fin — ce que le verdict laisse tomber
  const reste = (b.reliquatHorsCible || 0) * MILLE + (b.reliquatDeCible || 0) * R.PRIX_RESTE_DE_CIBLE;
  const fin = montrees > 0 ? MILLE - borner(fraction(MILLE, reste, montrees * MILLE), 0, MILLE) : MILLE;

  const utile = fraction(fraction(lue, route, MILLE), fin, MILLE);
  return survie(MILLE - utile);
}

/**
 * QUANTITÉ — « combien » × « gagnés » :
 *   combien = les séries rapportées au plafond, sur la courbe choisie ;
 *   gagnés  = la part de chaque série réellement calculée (en tiers) — une
 *             série décrétée ou relue sur les mêmes lettres vaut un tiers,
 *             une série de joker ne vaut rien.
 */
export function quantite(approche) {
  const R = REGLAGES;
  const series = Math.min(Math.max(1, (approche && approche.series) || 1), R.PLAFOND_SERIES);
  const combien = R.COURBE_QUANTITE === 'lineaire'
    ? fraction(MILLE, series, R.PLAFOND_SERIES)
    // √(séries / plafond) en pour-mille = √(séries × 10⁶ / plafond)
    : racineEntiere(Math.floor((series * MILLE * MILLE) / R.PLAFOND_SERIES));
  const joker = ops(approche).some((o) => o && o.isJoker);
  const tiersGagnes = joker ? R.TIERS_PAR_SERIE_JOKER
    : approche && approche.decret ? R.TIERS_PAR_SERIE_DECRETEE
      : approche && approche.mode === 'CONVERGENCE' ? R.TIERS_PAR_SERIE_CONVERGENTE
        : R.TIERS_PAR_SERIE;
  return borner(fraction(combien, tiersGagnes, R.TIERS_PAR_SERIE), 0, MILLE);
}

/** Le crédit de MANIÈRE, borné à [0, 1 000] — le rouage interne de la cohérence. */
export function maniere(approche) {
  const R = REGLAGES;
  const b = (approche && approche.bilan) || {};
  let m = R.SOCLE_MANIERE;
  // bonus
  if ((b.triptyquesContigus || 0) > 0) {
    m += R.BONUS_TRIPTYQUE_LITTERAL + fraction(R.BONUS_COURONNEMENT, borner(b.couronnementTot || 0, 0, MILLE), MILLE);
  }
  if (approche && approche.resonance) m += R.BONUS_RESONANCE;
  // malus
  m -= R.MALUS_TRIPTYQUE_CASSE * (b.casses || 0);
  m -= R.MALUS_RETOUCHE * (b.retouches || 0);
  m -= R.MALUS_TRADUCTION_DIVERGENTE * (b.traductionsDivergentes || 0);
  m -= R.MALUS_SIX_DETRUIT * (b.sixDetruits || 0);
  m -= fraction(R.MALUS_ARRONDI, b.arrondi || 0, MILLE);
  m -= R.MALUS_MIN_MAX * (b.minMax || 0);
  m -= R.MALUS_LETTRE_VERS_LETTRE * (b.lettreVersLettre || 0);
  return borner(m, 0, MILLE);
}

/** COHÉRENCE — familiarité, honnêteté des outils, lisibilité, manière. */
export function coherence(approche) {
  const R = REGLAGES;
  const c = (approche && approche.criteres) || {};
  const N = c.N === undefined ? MILLE : borner(c.N, 0, MILLE);
  const A = c.A === undefined ? MILLE : borner(c.A, 0, MILLE);
  const E = c.E === undefined ? MILLE : borner(c.E, 0, MILLE);
  const M = maniere(approche);
  const somme = R.PART_FAMILIARITE * N + R.PART_HONNETETE * A + R.PART_LISIBILITE * E + R.PART_MANIERE * M;
  const poids = R.PART_FAMILIARITE + R.PART_HONNETETE + R.PART_LISIBILITE + R.PART_MANIERE;
  return borner(Math.round(somme / poids), 0, MILLE);
}

/** Les quatre axes d'une approche, chacun un entier de 0 à 1 000. */
export function axesDe(approche) {
  return {
    simplicite: simplicite(approche),
    exhaustivite: exhaustivite(approche),
    quantite: quantite(approche),
    coherence: coherence(approche),
  };
}

// ══════════════════════════════════ le global

/**
 * Le global : moyenne des quatre axes pondérée par les curseurs (0..200, 100
 * neutre ; les parts sont `curseur / Σ curseurs`). Entier de 0 à 1 000.
 * Des curseurs tous à zéro rendent la moyenne simple.
 */
export function globalDe(axes, curseurs) {
  let somme = 0;
  let poids = 0;
  for (const axe of AXES) {
    const c = borner(Math.round(Number((curseurs && curseurs[axe]) ?? 100) || 0), 0, CURSEUR_MAX);
    somme += c * (axes[axe] || 0);
    poids += c;
  }
  if (!poids) {
    for (const axe of AXES) somme += axes[axe] || 0;
    poids = AXES.length;
  }
  return borner(Math.round(somme / poids), 0, MILLE);
}

/**
 * ★ LES TROIS RÉGIMES — trois positions des curseurs, rien d'autre.
 *   mixte      : la liste ordinaire   — 11/16 têtes, 93,7 % de paires concordantes
 *   elegance   : la 1ʳᵉ place         —  8/16 têtes (autant que le meilleur du balayage)
 *   abondance  : la 2ᵈ place          —  7/8 têtes, 8/8 au compte maximal ailleurs
 * Valeurs « rondes » retenues d'après le balayage au pas 10 (voir le rapport
 * `.planning/banc/score-v2-agent.md`). Mesuré le 2026-09-07 sur seize saisies.
 */
export const REGIMES = Object.freeze({
  mixte: Object.freeze({ simplicite: 20, exhaustivite: 40, quantite: 200, coherence: 60 }),
  elegance: Object.freeze({ simplicite: 20, exhaustivite: 100, quantite: 60, coherence: 200 }),
  abondance: Object.freeze({ simplicite: 0, exhaustivite: 50, quantite: 200, coherence: 10 }),
});
