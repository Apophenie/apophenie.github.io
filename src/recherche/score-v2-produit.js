// src/recherche/score-v2-produit.js
// ★ SCORE v2 — piste « PRODUIT DANS L'AXE, MOYENNE ENTRE LES AXES ».
//
// Quatre métriques, chacune un ENTIER de [0, 1000] :
//   · simplicité   — « court et d'un seul tenant ? »
//   · exhaustivité — « toute la saisie lue, et tout ce qui est produit sert-il ? »
//   · quantité     — « combien de 666, et sont-ils gagnés ? »
//   · cohérence    — « propre, familier, sans bidouille ? »
//
// À L'INTÉRIEUR d'un axe, les ingrédients se MULTIPLIENT — c'est la chaîne du
// moteur actuel (base × √rendement × propreté × malus…), dépliée et confinée :
// un mauvais rendement reste un veto, mais un veto sur SON axe, qu'un curseur
// peut atténuer. ENTRE les axes, c'est une moyenne pondérée par les quatre
// curseurs, et rien d'autre : pas de rang caché, pas de bonus hors des axes,
// pas de classement intermédiaire entre les axes et le total.
//
// Ce module est PUR : il lit l'approche notée par `score.js › noter`
// (`criteres`, `bilan`, `series`, `mode`, `parts`, `resonance`, `decret`) et
// le détail du crédit d'élégance (`elegance.js › detailDuCredit(bilan)`, posé
// sur `approche.detail` par l'appelant), et n'écrit rien. Déterministe (§4.4) :
// aucun `Math.random`, aucun `localeCompare` ; les calculs internes sont en
// flottant IEEE — déterministes bit à bit —, et chaque axe est arrondi à
// l'entier en FIN de calcul.
//
// ★ TOUTES LES CONSTANTES ONT ÉTÉ RÉGLÉES PAR BALAYAGE contre le classement
//   actuel (seize saisies, trois descentes de coordonnées, curseurs de chaque
//   régime re-balayés à chaque pas). L'objectif : bouger le moins possible de
//   têtes de liste, puis concorder le plus possible avec l'ordre du moteur.
//   Rapport : `.planning/banc/score-v2-produit.md` ; script :
//   `.planning/banc/score-v2-produit.mjs`.

export const AXES = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

const MILLE = 1000;
const borner = (x, min, max) => (x < min ? min : x > max ? max : x);
const unite = (pourMille) => borner(Number(pourMille) || 0, 0, MILLE) / MILLE;

// ══════════════════════════════════ RÉGLAGES — LE SEUL ENDROIT À MODIFIER

export const REGLAGES = {
  // ── SIMPLICITÉ = C^EXP_BRIEVETE × H^EXP_UNITE × libre × (1 − MALUS_PAR_PART)^(parts − 1)
  /**
   * Exposant sur la brièveté C (0,88^(étapes − 2), en ‰ dans `criteres.C`).
   * ½ : la mesure préfère une pente plus douce que le critère actuel — la
   * 1ʳᵉ place d'aujourd'hui ne lit pas la concision du tout, et les régimes
   * qui lui donnent du poids perdent des têtes dès que C tombe vite.
   */
  EXP_BRIEVETE: 0.5,
  /**
   * Exposant sur l'unité de méthode H. ★ ZÉRO, ET C'EST MESURÉ : H est
   * compté UNE fois, par les trois postes du crédit qui le mesurent geste par
   * geste (lecture divergente, réglage par morceau, filtre sélectif —
   * `POSTES_UNITE_DANS_CREDIT`), dans la cohérence. Le compter ici aussi
   * serait le doublon que l'auteur interdit ; le compter ici SEULEMENT coûte
   * une tête d'élégance (12/16 contre 13/16) — la 1ʳᵉ place actuelle aime les
   * partitions à trois méthodes, que H = 133 écraserait.
   */
  EXP_UNITE: 0,
  /** Fragments disjoints (mode LIBRE) : ce n'est plus « d'un seul tenant ». `MALUS.modeLibre` du moteur. */
  MALUS_LIBRE: 0.80,
  /** Chaque part au-delà de la première. Balayé 0 → 0,2 : 0 conserve le plus de têtes. */
  MALUS_PAR_PART: 0,

  // ── EXHAUSTIVITÉ = (1 − α_L·√perte_lecture) × (1 − α_C·√perte_calcul), chaque facteur ≥ plancher
  /**
   * Poids d'un caractère perdu, en millièmes d'une LETTRE ARRACHÉE au milieu
   * d'un mot qui sert. L'échelle de l'auteur (ponctuation 5 → bloc court 10 →
   * bloc entier 20 → lettre 26) donne 190 / 385 / 770 / 1000 ; le balayage
   * remonte la ponctuation (385) et abaisse le bloc entier (650) : jeter un
   * tiret coûte plus qu'on ne le tarifait, jeter un mot entier un peu moins
   * par lettre. Un bloc entier coûte toujours moins par caractère qu'une
   * lettre arrachée, et un bloc court moins qu'un bloc entier.
   */
  POIDS_PERTE: { alnum: 1000, bloc: 650, blocCourt: 500, ponctuation: 385 },
  /** Force de la peine de lecture : facteur = 1 − α·√perte. Concave : on perd beaucoup dès la première lettre. */
  ALPHA_LECTURE: 0.85,
  /** Force de la peine de calcul (valeurs calculées puis jetées, restes de fin — le rendement R du moteur). */
  ALPHA_CALCUL: 0.5,
  /** Plancher de chaque facteur : un curseur relègue, il n'annihile pas (même doctrine que `FACTEUR_PLANCHER`). */
  PLANCHER_EXHAUSTIVITE: 0.3,

  // ── QUANTITÉ = base(séries) × convergence × décret × joker × (1 − β·part_assemblée)
  /**
   * Ce que vaut un 666 unique ; au-dessus : 1000 − (1000 − socle) / séries^EXP.
   * 1 → 450, 2 → 673, 4 → 806, 6 → 857, 9 → 894. Le rang actuel (séries ≥ 2
   * avant les 666 uniques, puis le compte) est devenu CETTE pente : la marche
   * 1 → 2 est la plus haute, les suivantes se resserrent.
   */
  SOCLE_UNIQUE: 450,
  EXP_SERIES: 0.75,
  /**
   * Convergence : les mêmes caractères servent trois fois — ces 666-là ne sont
   * pas gagnés sur des caractères disjoints. C'est le troisième cran du rang
   * actuel, replié dans l'axe ; 0,15 est ce que le balayage retient pour que
   * la CONVERGENCE reste en fond de liste sans qu'aucun rang ne l'y tienne.
   */
  MALUS_CONVERGENCE: 0.15,
  /** Décret : un seul 6 calculé, trois annoncés (`MALUS.decret`). Aucun décret dans le corpus : repris tel quel. */
  MALUS_DECRET: 0.40,
  /** Joker : des 6 sortis de nulle part (`MALUS.joker`). Aucun joker hors mode JOKER dans le corpus : repris tel quel. */
  MALUS_JOKER: 0.45,
  /** Part des séries ASSEMBLÉES (pas des triptyques contigus) : peine β × part. Balayé 0 → 0,5 : sans effet sur les têtes, laissé à zéro. */
  BETA_ASSEMBLE: 0,

  // ── COHÉRENCE = N^EXP_N × A^EXP_A × E^EXP_E × crédit_de_manière × non-résonance × creux
  /** La familiarité N (moitié moyenne, moitié maillon faible), en racine : le maillon faible ne doit pas être un veto. */
  EXP_FAMILIARITE: 0.5,
  /**
   * ★ A (absence de bidouille) N'EST PAS COMPTÉ (`COMPTER_A` = 0), et c'est
   * un doublon de plus que la liste des sept ne nomme pas : chaque opérateur
   * à `adHoc` > 0 est aussi un palier du crédit (égalisation, majorité,
   * redécoupage, addition sélective, écriture en lettres…), et le crédit dit
   * la même chose geste par geste. Mesuré : compter A en plus coûte deux
   * têtes d'élégance. L'exposant reste réglable pour qui voudrait le rouvrir.
   */
  COMPTER_A: 0,
  EXP_SANS_BIDOUILLE: 1,
  /** La lisibilité des nombres intermédiaires E, telle quelle. */
  EXP_LISIBILITE: 1,
  /** Le crédit de manière (socle 1000 + postes), ramené en facteur : 1 + (crédit − 1000) / DIVISEUR. */
  DIVISEUR_CREDIT: 1200,
  /** Plancher du facteur de crédit — `BAREME.FACTEUR_PLANCHER` du moteur (520 ‰). */
  PLANCHER_CREDIT: 0.52,
  /**
   * Plafond du facteur AVANT le plafond de l'axe : ce qu'une manière
   * remarquable peut RACHETER sur la familiarité ou la lisibilité. Le moteur
   * dit « l'élégance ne peut que retirer » pour le score ; mais sa 1ʳᵉ place
   * lit le crédit au-dessus du socle, et c'est cela qu'on reproduit ici.
   */
  PLAFOND_CREDIT: 1.15,
  /** Ce que vaut une voie NON résonante. Balayé 0,8 → 1 : la résonance ne déplace aucune tête, laissée neutre. */
  MALUS_NON_RESONANT: 1,
  /** Un fragment de moins de deux caractères signifiants (`MALUS.fragmentCreux` vaut 0,75 au moteur). */
  MALUS_CREUX: 0.8,
  /** Les trois postes d'unité de méthode dans le crédit : 1 = H mesuré ici (voir `EXP_UNITE`). */
  POSTES_UNITE_DANS_CREDIT: 1,
};

/**
 * ★ LES POSTES DU CRÉDIT QUI N'ENTRENT PAS DANS LA COHÉRENCE, parce qu'un
 *   autre axe mesure déjà la même chose — une seule mesure par chose mesurée :
 *
 *   · famille `quantite` (triptyque contigu, répété, 6 surnuméraires) → l'axe
 *     quantité compte les séries ; les surnuméraires sont des 6 JETÉS au tri,
 *     et le jeté se paie dans l'exhaustivité ;
 *   · famille `exhaustivite` (portée ignorée, quatre effacements, valeur
 *     jetée) → l'axe exhaustivité, par les compteurs d'`abandons` et par R ;
 *   · TRANSFORMATION et sa remise → doublon de C (brièveté) ;
 *   · RELIQUAT_HORS_CIBLE, RELIQUAT_DE_CIBLE, RELIQUAT_PROPORTIONNEL → doublon
 *     du rendement R (exhaustivité).
 *
 *   Ce qui RESTE dans la cohérence : couronnement tôt, solde multiple de 3,
 *   additions (chiffres, nombres), triptyque cassé, 6 détruit, égalisation,
 *   majorité tacite, arrondi, min/max, lettre → lettre, retour sur une étape,
 *   traduction divergente, retouche, les ficelles (effacement sans motif,
 *   écriture en lettres, majorité, redécoupage, décimation, addition
 *   sélective), réarrangement — et les trois postes d'unité de méthode.
 */
export const POSTES_HORS_COHERENCE = Object.freeze(new Set([
  'SOCLE',
  'TRIPTYQUE_CONTIGU', 'TRIPTYQUE_REPETE', 'SIX_SURNUMERAIRE',
  'PORTEE_IGNOREE', 'EFFACE_ALNUM', 'EFFACE_BLOC', 'EFFACE_BLOC_COURT', 'EFFACE_PONCTUATION', 'VALEUR_JETEE',
  'TRANSFORMATION', 'REMISE_ADDITION_EN_CHAINE',
  'RELIQUAT_HORS_CIBLE', 'RELIQUAT_DE_CIBLE', 'RELIQUAT_PROPORTIONNEL',
]));

/** Les trois postes qui mesurent l'unité de méthode geste par geste (H, par postes). */
export const POSTES_UNITE = Object.freeze(new Set(['FILTRE_SELECTIF', 'REGLAGE_PAR_MORCEAU', 'LECTURE_DIVERGENTE']));

const estAlnum = (c) => /[0-9\p{L}]/u.test(c);
const nbSignifiants = (texte) => [...String(texte || '')].filter(estAlnum).length;

/** Le crédit de MANIÈRE : socle 1000 + les postes de cohérence, lus dans le détail. */
function creditDeManiere(detail, reglages) {
  let c = MILLE;
  for (const l of detail || []) {
    if (!l || POSTES_HORS_COHERENCE.has(l.cle)) continue;
    if (!reglages.POSTES_UNITE_DANS_CREDIT && POSTES_UNITE.has(l.cle)) continue;
    c += Number(l.points) || 0;
  }
  return c;
}

// ══════════════════════════════════ LES QUATRE AXES

/**
 * @param {Object} approche  une approche notée par `noter`, portant de plus
 *   `detail` = `elegance.js › detailDuCredit(approche.bilan)` (sans lui, le
 *   crédit de manière vaut le socle — le banc le fournit toujours).
 * @param {Object} [reglages]  `REGLAGES` par défaut ; le banc en passe d'autres.
 * @returns {{simplicite:number, exhaustivite:number, quantite:number, coherence:number}}
 */
export function axesDe(approche, reglages = REGLAGES) {
  const R = reglages;
  const a = approche || {};
  const c = a.criteres || {};
  const b = a.bilan || {};
  const ab = b.abandons || {};
  const parts = Array.isArray(a.parts) ? a.parts : [];
  const ops = [];
  for (const p of parts) if (p && p.chemin && Array.isArray(p.chemin.ops)) ops.push(...p.chemin.ops);
  const series = Math.max(1, Number(a.series) || Number(b.series) || 1);

  // ── SIMPLICITÉ — court et d'un seul tenant
  const C = unite(c.C ?? MILLE);
  const H = unite(c.H ?? MILLE);
  let simplicite = Math.pow(C, R.EXP_BRIEVETE) * Math.pow(H, R.EXP_UNITE);
  if (a.mode === 'LIBRE') simplicite *= R.MALUS_LIBRE;
  if (parts.length > 1) simplicite *= Math.pow(1 - R.MALUS_PAR_PART, parts.length - 1);

  // ── EXHAUSTIVITÉ — toutes les pertes, une seule fois chacune, en racine (concave)
  //   Lecture : les quatre compteurs d'`abandons`, pondérés par ce qu'ils
  //   jettent, rapportés à la matière signifiante. C'est la mesure UNIQUE de
  //   « la saisie lue » : U, PORTEE_IGNOREE et les quatre EFFACE_* disaient
  //   tous cela.
  const W = R.POIDS_PERTE;
  const perdu = (ab.alnum || 0) * W.alnum + (ab.bloc || 0) * W.bloc
    + (ab.blocCourt || 0) * W.blocCourt + (ab.ponctuation || 0) * W.ponctuation;
  const matiere = (ab.signifiants || 0) * W.alnum;
  const perteLecture = matiere > 0 ? Math.min(1, perdu / matiere) : 0;
  //   Calcul : le rendement R du moteur est LA mesure de « ce qui est produit
  //   sert-il » — il lit le vecteur le plus large pour ce qui écarte (`mpf`,
  //   `m36`…) et plafonne le gardé à ce que le verdict montre. Le bilan, lui,
  //   range les écartés de `mpf` sous MAJORITE et ne les voit pas comme des
  //   valeurs jetées. Sans vecteur (R absent : partitions en nombres), on lit
  //   le bilan : valeurs jetées en route + restes du tri, sur le produit.
  let perteCalcul;
  if (c.R !== undefined && c.R !== null) perteCalcul = 1 - unite(c.R);
  else {
    const produites = (b.montrees || 0) + (b.valeursJetees || 0);
    const jetees = (b.valeursJetees || 0) + (b.jeteesAuTri || 0);
    perteCalcul = produites > 0 ? Math.min(1, jetees / produites) : 0;
  }
  const fLecture = Math.max(R.PLANCHER_EXHAUSTIVITE, 1 - R.ALPHA_LECTURE * Math.sqrt(perteLecture));
  const fCalcul = Math.max(R.PLANCHER_EXHAUSTIVITE, 1 - R.ALPHA_CALCUL * Math.sqrt(perteCalcul));
  const exhaustivite = fLecture * fCalcul;

  // ── QUANTITÉ — combien, et gagnés ?
  const socle = R.SOCLE_UNIQUE / MILLE;
  let quantite = 1 - (1 - socle) / Math.pow(series, R.EXP_SERIES);
  if (a.mode === 'CONVERGENCE') quantite *= R.MALUS_CONVERGENCE;
  if (a.decret) quantite *= R.MALUS_DECRET;
  if (ops.some((o) => o && o.isJoker)) quantite *= R.MALUS_JOKER;
  const contigus = (b.triptyquesContigus || 0) + (b.triptyquesRepetes || 0);
  const partAssemblee = Math.max(0, Math.min(1, (series - contigus) / series));
  quantite *= 1 - R.BETA_ASSEMBLE * partAssemblee;

  // ── COHÉRENCE — propre, familier, sans bidouille
  const N = unite(c.N ?? MILLE);
  const A = R.COMPTER_A ? unite(c.A ?? MILLE) : 1;
  const E = unite(c.E ?? MILLE);
  const credit = creditDeManiere(a.detail, R);
  const fCredit = borner(1 + (credit - MILLE) / R.DIVISEUR_CREDIT, R.PLANCHER_CREDIT, R.PLAFOND_CREDIT);
  let coherence = Math.pow(N, R.EXP_FAMILIARITE) * Math.pow(A, R.EXP_SANS_BIDOUILLE)
    * Math.pow(E, R.EXP_LISIBILITE) * fCredit;
  if (!a.resonance) coherence *= R.MALUS_NON_RESONANT;
  if (parts.some((p) => nbSignifiants(p && p.fragment && p.fragment.texte) < 2)) coherence *= R.MALUS_CREUX;

  const entier = (x) => borner(Math.round(x * MILLE), 0, MILLE);
  return {
    simplicite: entier(simplicite),
    exhaustivite: entier(exhaustivite),
    quantite: entier(quantite),
    coherence: entier(coherence),
  };
}

// ══════════════════════════════════ LE GLOBAL — moyenne pondérée, et rien d'autre

export const CURSEUR_DEFAUT = 100;
export const CURSEUR_MAX = 200;

/**
 * @param {Object} axes      les quatre axes, entiers 0–1000
 * @param {Object} curseurs  positions 0–200 (100 = neutre) ; part = curseur / somme.
 *   Un curseur absent ou illisible vaut le défaut ; quatre curseurs à zéro rendent 0.
 * @returns {number} entier 0–1000
 */
export function globalDe(axes, curseurs) {
  const cur = curseurs || {};
  let somme = 0;
  let total = 0;
  for (const axe of AXES) {
    const v = cur[axe];
    const p = v === undefined || v === null || !Number.isFinite(Number(v))
      ? CURSEUR_DEFAUT : borner(Math.trunc(Number(v)), 0, CURSEUR_MAX);
    somme += p;
    total += p * (Number(axes && axes[axe]) || 0);
  }
  if (somme <= 0) return 0;
  return borner(Math.round(total / somme), 0, MILLE);
}

/**
 * Les trois positions des curseurs qui reproduisent au mieux la liste
 * ordinaire, la 1ʳᵉ place (élégance) et la 2ᵈ (abondance de 666). Réglées par
 * balayage, grille de 25 crans — voir le rapport pour le meilleur jeu et les
 * jeux équivalents. Rien d'autre ne distingue les régimes.
 *
 *  · mixte      — la quantité domine (le rang des séries d'aujourd'hui),
 *                 l'exhaustivité à demi, la cohérence au quart, la simplicité
 *                 à zéro : le score actuel la compte pour 150 ‰, mais le rang
 *                 et le rendement passent avant elle.
 *  · elegance   — l'exhaustivité domine (la 1ʳᵉ place actuelle est crédit ×
 *                 U × R), la cohérence à demi, simplicité et quantité au quart.
 *  · abondance  — la quantité seule, avec un quart d'exhaustivité pour
 *                 départager à compte égal.
 */
export const REGIMES = Object.freeze({
  mixte: Object.freeze({ simplicite: 0, exhaustivite: 100, quantite: 200, coherence: 50 }),
  elegance: Object.freeze({ simplicite: 50, exhaustivite: 200, quantite: 50, coherence: 100 }),
  abondance: Object.freeze({ simplicite: 0, exhaustivite: 50, quantite: 200, coherence: 0 }),
});
