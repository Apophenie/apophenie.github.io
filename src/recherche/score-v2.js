/**
 * ★ **SCORE V2 — piste « REPLI » : les ingrédients du moteur, repliés dans
 *   quatre axes, les doublons fusionnés.**
 *
 * > « Refactorise tout ça. Les trois régimes, il faudrait pouvoir les retrouver
 * >   simplement en ajustant les 4 curseurs à des valeurs différentes. Je ne
 * >   veux pas de classement caché, ni par-dessus le score global, ni entre les
 * >   4 sous-métriques et le total. S'il doit y avoir des rouages plus ou moins
 * >   obscurs, c'est à l'intérieur des sous-métriques. » (l'auteur)
 *
 * Ce module NE TOUCHE PAS au moteur : il lit une approche déjà notée par
 * `score.js › noter` (ses critères, son bilan, ses parts) et en tire quatre
 * axes de 0 à 1000, puis un global qui est la moyenne pondérée des quatre par
 * les curseurs — et rien d'autre. Trois autres pistes sont explorées en
 * parallèle par d'autres agents (`score-v2-agent.js`, `score-v2-produit.js`,
 * `score-v2-geometrique.js`) ; `.planning/banc/score-v2-banc.mjs` les mesure
 * toutes à la même aune.
 *
 * ── Ce que chaque axe contient, et ce qui a été fusionné ──────────────────
 *
 *  · SIMPLICITÉ — « court et d'un seul tenant ? » : brièveté C, unité de
 *    méthode H (H n'est plus compté qu'ICI — il l'était dans deux axes et par
 *    trois postes du barème), ×0,75 si un fragment est creux, ×0,80 en mode
 *    LIBRE.
 *  · EXHAUSTIVITÉ — « toute la saisie lue, et tout ce qui est produit
 *    sert-il ? » : la LECTURE (U fusionnée avec les cinq postes d'effacement —
 *    un bloc entier écarté coûte 20/26 d'une lettre arrachée, un bloc court
 *    10/26, et la ponctuation ignorée 5 ‰ chacune, comme l'auteur le voulait),
 *    le RENDEMENT en racine (R ; les trois reliquats en étaient un doublon), et
 *    les PERTES EN ROUTE du barème (valeurs calculées puis jetées, effacement
 *    sans motif, majorité, décimation).
 *  · QUANTITÉ — « combien de 666, et sont-ils gagnés ? » : le nombre de
 *    séries, la prime des séries DISJOINTES (l'ancien rang, devenu une
 *    composante), la famille quantité du barème (triptyques contigus et
 *    répétés, surnuméraires, triptyque cassé), la résonance ; ×0,40 si décret
 *    (une fraude à la quantité : un chiffre montré trois fois), ×0,50 en
 *    convergence (les mêmes caractères servent trois fois).
 *  · COHÉRENCE — « propre, familier, sans bidouille ? » : familiarité N,
 *    absence de bidouille A (le bonus « sans pirouette » en était un doublon),
 *    lisibilité des nombres E, et la PROPRETÉ du barème — tout ce qui n'est
 *    ni perte ni quantité, moins les doublons de H et de C —, ×0,45 par joker.
 *
 * Disparus, parce que comptés deux fois : le bonus « couverture totale »
 * (un seuil sur U), le poste « transformations en trop » (C compte déjà les
 * étapes), les trois postes qui redisaient H, les trois reliquats, les cinq
 * effacements comme postes séparés, le bonus « sans pirouette ».
 */

import { detailDuCredit } from './elegance.js';
import { MAX_SERIES } from '../config.js';

export const AXES = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

export const REGLAGES = Object.freeze({
  // simplicité
  POIDS_BRIEVETE: 150, POIDS_UNITE: 250,
  MALUS_CREUX: [75, 100], MALUS_LIBRE: [80, 100],
  // exhaustivité
  POIDS_LECTURE: 400, POIDS_RENDEMENT: 400, POIDS_PERTES_EN_ROUTE: 200,
  // les prix relatifs du barème, ramenés à la lettre arrachée (26)
  PRIX_LETTRE: 26, PRIX_BLOC: 20, PRIX_BLOC_COURT: 10, PRIX_PONCTUATION_POUR_MILLE: 5,
  // quantité
  PRIME_DISJOINT: 200, PLAFOND_BAREME_QUANTITE: 300, DIVISEUR_BAREME_QUANTITE: 3, PRIME_RESONANCE: 80,
  MALUS_DECRET: [40, 100], MALUS_CONVERGENCE: [50, 100],
  // cohérence
  POIDS_FAMILIARITE: 200, POIDS_SANS_BIDOUILLE: 120, POIDS_LISIBILITE: 100, POIDS_PROPRETE: 300,
  MALUS_JOKER: [45, 100],
  // ★ Le PLANCHER d'un crédit du barème, hérité de `elegance.js › FACTEUR_PLANCHER`
  //   (520) : « un curseur ne doit jamais pouvoir annihiler une voie, seulement
  //   la reléguer ». Sans lui, six égalisations à −200 ramenaient la propreté
  //   à zéro et toutes les voies `meg` — les têtes les plus fréquentes —
  //   tombaient : mesuré à 7 têtes mixtes sur 16 avec un plancher à 0.
  PLANCHER_CREDIT: 520,
});

/** Les postes du barème, rangés par axe ; ce qui n'est nulle part est un doublon retiré. */
export const POSTES = Object.freeze({
  pertesEnRoute: Object.freeze(['VALEUR_JETEE', 'EFFACEMENT_SANS_MOTIF', 'MAJORITE', 'MAJORITE_TACITE', 'DECIMATION']),
  quantite: Object.freeze(['TRIPTYQUE_CONTIGU', 'TRIPTYQUE_REPETE', 'SIX_SURNUMERAIRE', 'CASSE_TRIPTYQUE', 'SOLDE_MULTIPLE_DE_TROIS']),
  proprete: Object.freeze(['COURONNEMENT_TOT', 'ADDITION_CHIFFRES', 'ADDITION_NOMBRES', 'REMISE_ADDITION_EN_CHAINE', 'SIX_DETRUIT',
    'RETOUR_SUR_UNE_ETAPE', 'TRADUCTION_DIVERGENTE', 'RETOUCHE', 'ARRONDI', 'MIN_MAX', 'LETTRE_VERS_LETTRE',
    'ECRITURE_EN_LETTRES', 'REDECOUPAGE', 'ADDITION_SELECTIVE', 'REARRANGEMENT', 'EGALISATION']),
  doublonsRetires: Object.freeze(['SOCLE', 'TRANSFORMATION', 'LECTURE_DIVERGENTE', 'REGLAGE_PAR_MORCEAU', 'FILTRE_SELECTIF',
    'RELIQUAT_HORS_CIBLE', 'RELIQUAT_DE_CIBLE', 'RELIQUAT_PROPORTIONNEL',
    'PORTEE_IGNOREE', 'EFFACE_ALNUM', 'EFFACE_BLOC', 'EFFACE_BLOC_COURT', 'EFFACE_PONCTUATION']),
});

const MILLE = 1000;
const borner = (x, a, b) => (x < a ? a : x > b ? b : x);
const racineEntiere = (n) => { if (n <= 0) return 0; let x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return x; };
const fois = (x, [n, d]) => Math.floor((x * n) / d);
/** u^1,5 en pour-mille, comme `score.js › critereCouverture`. */
const puissanceUnEtDemi = (u) => borner(Math.floor((u * racineEntiere(u * MILLE)) / MILLE), 0, MILLE);

/** Une somme de points du barème, restreinte à des postes, ramenée à [0 ; 1000] autour du socle. */
function creditDes(lignes, cles) {
  let s = 0;
  for (const l of lignes) if (cles.includes(l.cle)) s += l.points;
  return borner(MILLE + s, REGLAGES.PLANCHER_CREDIT, MILLE);
}

export function axesDe(a) {
  const R = REGLAGES;
  const c = a.criteres || {};
  const b = a.bilan || {};
  const ab = b.abandons || { alnum: 0, bloc: 0, blocCourt: 0, ponctuation: 0, signifiants: 0, lus: 0 };
  const lignes = detailDuCredit(b);
  const ops = (a.parts || []).flatMap((p) => p.chemin.ops);
  const jokers = ops.filter((o) => o.isJoker).length;
  const creux = (a.parts || []).some((p) => String(p.fragment && p.fragment.texte || '').replace(/[^\p{L}\p{N}]/gu, '').length < 2);
  const series = a.series || b.series || 1;

  // ── simplicité
  let simplicite = Math.floor((R.POIDS_BRIEVETE * (c.C ?? MILLE) + R.POIDS_UNITE * (c.H ?? MILLE)) / (R.POIDS_BRIEVETE + R.POIDS_UNITE));
  if (creux) simplicite = fois(simplicite, R.MALUS_CREUX);
  if (a.mode === 'LIBRE') simplicite = fois(simplicite, R.MALUS_LIBRE);

  // ── exhaustivité : lecture (U + la nuance des cinq effacements), rendement (√R), pertes en route
  let lecture;
  if (ab.signifiants > 0) {
    // ce qui est lu vaut 26/26 ; un bloc entier écarté garde 6/26, un bloc court 16/26, une lettre arrachée 0
    const gardes = ab.lus * R.PRIX_LETTRE + ab.bloc * (R.PRIX_LETTRE - R.PRIX_BLOC) + ab.blocCourt * (R.PRIX_LETTRE - R.PRIX_BLOC_COURT);
    const u = borner(Math.floor((gardes * MILLE) / (ab.signifiants * R.PRIX_LETTRE)), 0, MILLE);
    lecture = puissanceUnEtDemi(u);
  } else {
    lecture = c.U ?? MILLE;
  }
  lecture = borner(lecture - ab.ponctuation * R.PRIX_PONCTUATION_POUR_MILLE, 0, MILLE);
  const rendement = racineEntiere((c.R ?? MILLE) * MILLE);
  const pertesEnRoute = creditDes(lignes, POSTES.pertesEnRoute);
  const exhaustivite = Math.floor((R.POIDS_LECTURE * lecture + R.POIDS_RENDEMENT * rendement + R.POIDS_PERTES_EN_ROUTE * pertesEnRoute) / MILLE);

  // ── quantité
  let gq = 0;
  for (const l of lignes) if (POSTES.quantite.includes(l.cle)) gq += l.points;
  let quantite = Math.floor((MILLE * Math.min(series, MAX_SERIES)) / MAX_SERIES)
    + (series >= 2 && a.mode !== 'CONVERGENCE' ? R.PRIME_DISJOINT : 0)
    + borner(Math.floor(gq / R.DIVISEUR_BAREME_QUANTITE), -R.PLAFOND_BAREME_QUANTITE, R.PLAFOND_BAREME_QUANTITE)
    + (a.resonance ? R.PRIME_RESONANCE : 0);
  quantite = borner(quantite, 0, MILLE);
  if (a.decret) quantite = fois(quantite, R.MALUS_DECRET);
  if (a.mode === 'CONVERGENCE') quantite = fois(quantite, R.MALUS_CONVERGENCE);

  // ── cohérence
  const proprete = creditDes(lignes, POSTES.proprete);
  let coherence = Math.floor((R.POIDS_FAMILIARITE * (c.N ?? MILLE) + R.POIDS_SANS_BIDOUILLE * (c.A ?? MILLE)
    + R.POIDS_LISIBILITE * (c.E ?? MILLE) + R.POIDS_PROPRETE * proprete)
    / (R.POIDS_FAMILIARITE + R.POIDS_SANS_BIDOUILLE + R.POIDS_LISIBILITE + R.POIDS_PROPRETE));
  for (let i = 0; i < jokers; i++) coherence = fois(coherence, R.MALUS_JOKER);

  return { simplicite, exhaustivite, quantite, coherence };
}

/** La moyenne pondérée des quatre axes par les curseurs (0 à 200, 100 = neutre). Rien d'autre. */
export function globalDe(axes, curseurs) {
  let somme = 0;
  let poids = 0;
  for (const k of AXES) { const w = Math.max(0, curseurs[k] ?? 100); somme += w * (axes[k] ?? 0); poids += w; }
  return poids ? Math.round(somme / poids) : 0;
}

/**
 * Les trois régimes, comme trois positions des curseurs — AJUSTÉS PAR LE BANC
 * (`.planning/banc/score-v2-banc.mjs`), puis arrondis à des crans lisibles.
 *
 * ⚠️ Ce que le balayage dit, et qu'il faut lire en face : la liste ordinaire
 *   actuelle est d'abord un ordre de QUANTITÉ (le rang « séries disjointes
 *   d'abord », puis le nombre de séries, passent avant le score). Pour la
 *   reproduire sans classement caché, la quantité doit peser près de la moitié
 *   du global — 5/30/45/20 conserve 14 têtes sur 16 et ne déplace que 6 lignes
 *   sur 169 ; le jeu « à parts presque égales » 20/25/25/30 en conserve 11 et
 *   en déplace 25. La 1ʳᵉ place, elle, ne veut PAS de quantité : 7/57/0/36.
 */
export const REGIMES = Object.freeze({
  mixte: Object.freeze({ simplicite: 20, exhaustivite: 120, quantite: 180, coherence: 80 }),
  elegance: Object.freeze({ simplicite: 20, exhaustivite: 160, quantite: 0, coherence: 100 }),
  abondance: Object.freeze({ simplicite: 0, exhaustivite: 0, quantite: 200, coherence: 0 }),
});
