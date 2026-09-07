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
import { MAX_SERIES, CODES_NON_FACTURES } from '../config.js';

export const AXES = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

/**
 * ★ **ITÉRATION 2 — les trois arbitrages de l'auteur.**
 *
 * > 1. « Pousser l'exhaustivité drastiquement, la rendre bien plus punitive sur
 * >   les premières pertes […]. Et ne pas refacturer le prix de chaque fragment
 * >   regroupé côté simplicité : ça a déjà été facturé pour le premier. Pour
 * >   les fragments différents, prendre le poids du plus élevé, et ne lui
 * >   ajouter que la moitié du coût du 2ᵈ et le quart du 3ᵉ. »
 * > 2. « Sortir `meg` des bidouilles, ou s'il y a à facturer, pas de malus
 * >   cumulatif pour le nombre de caractères convertis, juste une fois. »
 *
 * ⚠️ **La courbe des pertes, corrigée.** J'avais lu « on perd beaucoup
 *   rapidement » comme √R ; c'est l'inverse : √R est INDULGENTE sur les premières
 *   pertes (R = 0,9 → 0,95). La forme demandée est 1 − perte^e avec e < 1 :
 *   à e = ½, perdre 10 % coûte 32 %, perdre 50 % coûte 71 %, et de 50 % à 100 %
 *   il ne reste que 29 % à perdre. `EXPOSANT_PERTE` est en centièmes ; le banc
 *   le balaie.
 */
export const REGLAGES = {
  // simplicité
  POIDS_BRIEVETE: 150, POIDS_UNITE: 250,
  MALUS_CREUX: [75, 100], MALUS_LIBRE: [80, 100],
  // la brièveté, sur la longueur REPLIÉE des fragments : 0,88 ^ max(0, L − 2)
  DECROISSANCE_BRIEVETE: [88, 100], L_IDEAL: 2,
  // les fragments différents : le plus lourd entier, puis la moitié, le quart… (en quarts)
  PARTS_DES_FRAGMENTS: [4, 2, 1],
  // exhaustivité : 1 − perte^(EXPOSANT_PERTE/100), pour la lecture comme pour le rendement
  // ⚠️ MESURÉ, et ce n'est pas ce qu'on attendait : plus la courbe est sévère,
  //   moins le classement actuel est reproduit — le moteur emploie U^1,5 et √R,
  //   deux courbes INDULGENTES sur les premières pertes, et toute courbe plus
  //   dure s'en éloigne. Têtes mixtes / lignes déplacées / 1ʳᵉ place, avec
  //   `meg` au barème actuel : exposant 100 → 14/16, 7, 10/16 ; 65 → 14/16,
  //   11, 8/16 ; 50 → 13/16, 16, 6/16 ; 35 → 11/16, 25, 6/16. À 35, des
  //   CONVERGENCES prennent la 1ʳᵉ place (relire trois fois la même chaîne lit
  //   tout). Et `hope-hope-hope.fr` bascule vers le groupement dès la courbe
  //   linéaire : c'est la longueur repliée qui le fait, pas la sévérité.
  //   65 est la concavité que l'auteur demande, au prix mesuré ci-dessus.
  EXPOSANT_PERTE: 65,
  // `meg` : 'cumulatif' (le barème actuel, −200 par valeur), 'unique' (une fois), 'aucune'
  // ⚠️ MESURÉ : le barème actuel (« cumulatif ») est ce qui reproduit le mieux
  //   le classement — « unique » coûte une à deux têtes à chaque réglage,
  //   « aucune » autant. C'est l'arbitrage de l'auteur qui tranche : « sortir
  //   `meg` des bidouilles, ou juste une fois à l'usage ».
  EGALISATION: 'unique',
  // exhaustivité
  POIDS_LECTURE: 400, POIDS_RENDEMENT: 400, POIDS_PERTES_EN_ROUTE: 200,
  // les prix relatifs du barème, ramenés à la lettre arrachée (26)
  PRIX_LETTRE: 26, PRIX_BLOC: 20, PRIX_BLOC_COURT: 10, PRIX_PONCTUATION: 5,
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
};

/** Surcharge des réglages, pour le banc — rend l'état d'avant. */
export function configurer(surcharges) {
  const avant = { ...REGLAGES };
  Object.assign(REGLAGES, surcharges || {});
  return avant;
}

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
/** ⌊1000 · (x/1000)^(n/100)⌋ en entiers : racine centième d'un BigInt par dichotomie. */
const puissanceCentiemes = (x, n) => {
  if (x <= 0) return 0; if (x >= MILLE) return MILLE; if (n === 100) return x;
  if (n === 50) return racineEntiere(x * MILLE);
  // r^100 = x^n · 1000^(100−n)  →  r = racine 100-ième
  const cible = BigInt(x) ** BigInt(n) * BigInt(MILLE) ** BigInt(100 - n);
  let lo = 0n, hi = 1000n;
  while (lo < hi) { const mid = (lo + hi + 1n) / 2n; if (mid ** 100n <= cible) lo = mid; else hi = mid - 1n; }
  return Number(lo);
};
/** Ce qu'il reste après une perte, sur la courbe concave demandée : 1000 − 1000·(perte/1000)^e. */
const apresPerte = (perte) => MILLE - puissanceCentiemes(borner(perte, 0, MILLE), REGLAGES.EXPOSANT_PERTE);
const fois = (x, [n, d]) => Math.floor((x * n) / d);

/** Une somme de points du barème, restreinte à des postes, ramenée à [0 ; 1000] autour du socle. */
function creditDes(lignes, cles) {
  let s = 0;
  for (const l of lignes) {
    if (!cles.includes(l.cle)) continue;
    if (l.cle === 'EGALISATION') {
      // ★ `meg` : « pas de malus cumulatif pour le nombre de caractères
      //   convertis, juste une fois à l'usage » — ou rien du tout.
      if (REGLAGES.EGALISATION === 'aucune' || !l.quantite) continue;
      if (REGLAGES.EGALISATION === 'unique') { s += l.sens * Math.floor(Math.abs(l.points) / l.quantite); continue; }
    }
    s += l.points;
  }
  return borner(MILLE + s, REGLAGES.PLANCHER_CREDIT, MILLE);
}

/** Le coût rendu d'un opérateur, comme `score.js` : les implicites ne se facturent pas. */
const coutRendu = (op) => (op && CODES_NON_FACTURES.includes(op.code) ? 0 : (op.cout || 0));

/**
 * ★ **LA LONGUEUR REPLIÉE D'UNE VOIE À PLUSIEURS FRAGMENTS.**
 *
 * Les fragments qui portent le MÊME programme ne se facturent qu'une fois —
 * « ça a déjà été facturé pour le premier fragment ». Les programmes
 * différents se facturent au plus lourd entier, puis la moitié du 2ᵈ, le
 * quart du 3ᵉ (`PARTS_DES_FRAGMENTS`, en quarts) : l'hétérogénéité, elle, est
 * déjà payée par H dans la simplicité.
 */
function longueurRepliee(parts) {
  const parProgramme = new Map();
  for (const p of parts) {
    const cle = p.chemin.ops.map((o) => o.code).join('+');
    if (!parProgramme.has(cle)) parProgramme.set(cle, p.chemin.ops.reduce((t, o) => t + coutRendu(o), 0));
  }
  const couts = [...parProgramme.values()].sort((a, b) => b - a);
  const parts4 = REGLAGES.PARTS_DES_FRAGMENTS;
  let quarts = 0;
  couts.forEach((c, i) => { quarts += c * (parts4[Math.min(i, parts4.length - 1)] ?? parts4[parts4.length - 1]); });
  return Math.round(quarts / 4);
}

/** 0,88 ^ max(0, L − 2), en pour-mille. */
function brievete(L) {
  const [n, d] = REGLAGES.DECROISSANCE_BRIEVETE;
  let c = MILLE;
  for (let i = REGLAGES.L_IDEAL; i < L; i++) c = Math.floor((c * n) / d);
  return c;
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

  // ── simplicité : brièveté sur la longueur REPLIÉE des fragments, unité de méthode
  const C = a.parts && a.parts.length ? brievete(longueurRepliee(a.parts)) : (c.C ?? MILLE);
  let simplicite = Math.floor((R.POIDS_BRIEVETE * C + R.POIDS_UNITE * (c.H ?? MILLE)) / (R.POIDS_BRIEVETE + R.POIDS_UNITE));
  if (creux) simplicite = fois(simplicite, R.MALUS_CREUX);
  if (a.mode === 'LIBRE') simplicite = fois(simplicite, R.MALUS_LIBRE);

  // ── exhaustivité : lecture (U + la nuance des cinq effacements), rendement (√R), pertes en route
  let lecture;
  if (ab.signifiants > 0) {
    // la PERTE de lecture, au prix relatif du barème : lettre arrachée 26, bloc 20,
    // bloc court 10, ponctuation 5 — la ponctuation ignorée entre dans la matière
    // à son prix, « même minime »
    const perdu = ab.alnum * R.PRIX_LETTRE + ab.bloc * R.PRIX_BLOC + ab.blocCourt * R.PRIX_BLOC_COURT + ab.ponctuation * R.PRIX_PONCTUATION;
    const matiere = ab.signifiants * R.PRIX_LETTRE + ab.ponctuation * R.PRIX_PONCTUATION;
    lecture = apresPerte(Math.floor((perdu * MILLE) / matiere));
  } else {
    lecture = c.U ?? MILLE;
  }
  const rendement = apresPerte(MILLE - (c.R ?? MILLE));
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
  mixte: Object.freeze({ simplicite: 25, exhaustivite: 120, quantite: 200, coherence: 75 }),
  elegance: Object.freeze({ simplicite: 0, exhaustivite: 160, quantite: 40, coherence: 160 }),
  abondance: Object.freeze({ simplicite: 0, exhaustivite: 0, quantite: 200, coherence: 0 }),
});
