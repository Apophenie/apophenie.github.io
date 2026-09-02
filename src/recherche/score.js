// src/recherche/score.js
// Score de conviction à 6 critères, en ARITHMÉTIQUE ENTIÈRE.
// CONTRACTS.md §5 et §4.4 · research/heuristique.md §4.
//
// « Une démonstration convaincante est une démonstration qu'on n'a pas envie de
// vérifier. » Tout le projet repose sur ce classement : la recherche, elle, est
// triviale (l'espace canonique fait 10²–10³ états).
//
// ⚠️ Les six pondérations ci-dessous sont une PRÉDICTION, pas une mesure
// (research/heuristique.md §8.3, CONTRACTS.md §7-1). Elles sont volontairement
// regroupées ici, en un seul endroit, pour être réglées après le test à l'aveugle.
// Le test `tests/etalonnage.test.js` mesure l'écart avec le tableau attendu.

import { estDecret } from './titres.js';
// ★ `elegance.js` n'importe RIEN : la dépendance est à sens unique, sans cycle.
import { OPERATEURS_QUI_ECARTENT } from './elegance.js';
import { normaliserCible, indexUtiles } from './cible.js';
import { CODES_NON_FACTURES, MAX_SERIES } from '../config.js';
import {
  bilanApproche, credit as creditDElegance, facteur as facteurDElegance,
  note as noteDElegance, estPur,
} from './elegance.js';

// ══════════════════════════════════ RÉGLAGES — LE SEUL ENDROIT À MODIFIER

/** Poids des 6 critères, en pour-mille. Somme imposée : 1000. */
export const POIDS = {
  homogeneite: 250, // H — exigence explicite du README, ressort comique central
  notoriete: 200,   // N — le maillon faible fait décrocher le spectateur
  couverture: 180,  // U — ignorer 90 % de la saisie est un aveu
  concision: 150,   // C — la brièveté aide, elle ne décide pas
  antiAdHoc: 120,   // A — on pénalise sans exclure
  elegance: 100,    // E — critère de finition
};

/** Bonus additifs, en milli-unités de score (le score va de 0 à 10 000). */
export const BONUS = {
  resonance: 800,          // +8 points : les 3 fragments sont littéralement le même texte
  couvertureTotale: 500,   // +5 points : toute la saisie signifiante est exploitée
  sansAdHoc: 400,          // +4 points : aucune pirouette, aucun joker
};

/**
 * Part du score allouée aux 6 critères ; le complément est la RÉSERVE DES BONUS.
 *
 * Sans cette réserve, les bonus s'empilaient sur une base déjà pleine : des
 * critères parfaits donnent 9 700, les trois bonus ajoutent 1 700, et le bornage
 * à 10 000 écrasait l'écart. Mesuré avant correction : 58 % des approches au
 * plafond, écart nul entre le 1ᵉʳ et le 3ᵉ — le classement ne classait plus rien,
 * alors que trier par pouvoir de conviction est l'objet même de ce module.
 *
 * 830 + (800 + 500 + 400) = 10 000 exactement : le plafond reste atteignable, mais
 * seulement par une approche parfaite sur les six critères ET résonante ET
 * couvrante ET sans pirouette. Il redevient ce qu'il doit être — un cas limite.
 *
 * ⚠️ Invariant : PART_CRITERES + Σ BONUS = 10 000. Le test d'étalonnage le vérifie.
 */
export const PART_CRITERES = [830, 1000];

/** Malus multiplicatifs, exprimés en fraction entière [numérateur, dénominateur]. */
export const MALUS = {
  joker: [45, 100],          // ×0,45 par joker employé
  fragmentCreux: [75, 100],  // ×0,75 si un fragment fait < 2 caractères signifiants
  modeLibre: [80, 100],      // ×0,80 pour l'assemblage en fragments disjoints
  decret: [40, 100],         // ×0,40 : un seul 6 obtenu, trois annoncés — voir ci-dessous
};

/**
 * ── Le décret (`MALUS.decret`) — un malus devenu FILET, plus un réglage ──────
 *
 * Une approche qui applique le MÊME programme à la MÊME portée trois fois de
 * suite ne calcule qu'un seul 6 : les deux autres sont décrétés. Le README ne
 * demande pas cela — il veut « trois fragments valant 6 chacun » : les trois
 * « hope » de la méthode 2, les deux tirets plus la réduction de la méthode 6.
 *
 * Ce décret a d'abord été PÉNALISÉ (×0,40) et affiché sous un intitulé qui
 * l'avouait, « le même 6, trois fois », par analogie avec le traitement du joker
 * au §0.4. L'aveu ne suffisait pas : sur `macron`, sur `hope`, sur `Millicent`,
 * la liste entière décrétait, et une liste qui ne montre que des démonstrations
 * de convenance ne démontre rien. L'auteur a tranché — il DISPARAÎT.
 *
 * `assemblage.js` ne le fabrique donc plus : `deduireMode` le nomme `DECRET` et
 * `assembler` le jette avant même la notation. Ce qui remplace le décret sur une
 * saisie courte est le GROUPEMENT — trois 6 réellement calculés d'un seul geste,
 * pris dans un vecteur qui en porte quatre ou davantage.
 *
 * Le malus survit pour deux cas, et deux seulement :
 *  · un lien partagé avant la suppression, que `rejouer` continue d'ouvrir
 *    (CONTRACTS §4.3, lecture tolérante) — il doit s'afficher avec le score
 *    qu'il valait, pas avec un score flatteur ;
 *  · l'approche joker, qui est structurellement un décret (le même chemin, trois
 *    fois) et que CONTRACTS §0.4 maintient explicitement en fond de liste. Les
 *    deux facteurs se composent : ×0,45 × ×0,40 = ×0,18.
 */

/**
 * ── Le rendement d'une récolte (`rendementSix`) ─────────────────────────────
 *
 * Un huitième malus, et le seul qui ne soit pas une constante : il se CALCULE
 * sur le vecteur.
 *
 * Le mode GROUPEMENT prend les 6 d'un vecteur et les assemble par trois. Sur
 * `hope`, le quatorze segments rend `[6,6,6,6]` : tout le vecteur vaut 6, la
 * démonstration est totale. Sur `https://www.google.com`, la numérologie
 * pythagoricienne rend dix-sept nombres dont trois valent 6 — et prétendre en
 * tirer un 666 revient à dire « regardez, trois de ces dix-sept nombres sont
 * des 6 ». Les six critères ne voient pas la différence : la méthode est la même
 * (H = 1), la couverture de la SAISIE est la même (U = 1), la longueur aussi.
 * Le tri les mettait donc à égalité, et le second gagnait souvent, ses nombres
 * intermédiaires étant plus élégants.
 *
 * Le rendement mesure ce que les critères ne voient pas : la part du vecteur qui
 * vaut réellement 6. Il est appliqué en RACINE — `√rendement` — et non tel quel,
 * pour la même raison que la couverture est élevée à la puissance 1,5 mais dans
 * l'autre sens : la peine doit être franche sans être capitale. Mesuré :
 *
 *   `hope` → `[6,6,6]` (les trois 6 d'affilée)  3/3  → ×1,00
 *   `hope` → `[6,6,6,6]`                        3/4  → ×0,87
 *   `hopehopehopefr` → quatorze segments       12/14 → ×0,92   (quatre 666)
 *   `hopehopehopefr` → pythagore                4/14 → ×0,53
 *   `wwwgooglecom` → pythagore                  3/17 → ×0,42
 *
 * C'est exactement la lecture de l'auteur : le groupement vaut « quand tu
 * arrives à faire AUTANT de 6 », pas quand trois s'y trouvent par hasard.
 *
 * La MOISSON pose la même question sur plusieurs vecteurs à la fois : le calcul
 * additionne les 6 d'un côté, les valeurs de l'autre. Mesuré :
 *
 *   `hope-hope-hope.fr`         15/15 → ×1,00   (cinq 666)
 *   `https://hope-hope-hope.fr/` 18/20 → ×0,95   (six 666)
 *
 * ── Amendement : le NUMÉRATEUR est ce que le verdict garde ─────────────────
 *
 * `[6,6,6,6]` valait ×1,00 alors que le quatrième 6 tombe : le verdict compte
 * des séries de trois, et la scène MONTRE le surplus tomber, du même `drop` que
 * les valeurs qui ne font pas 6 (`scenario.js › recolterLesSix`). Un 6 de trop
 * n'est donc pas un 6 gardé, et le porter au crédit du rendement flattait le
 * score de ce qu'il est précisément chargé de punir — du calcul montré puis
 * écarté. Le numérateur est désormais plafonné au compte annoncé.
 * Le test `tests/scenario.test.js › jeter coûte` recoupe le rendement avec ce
 * que l'étape de tri affiche à l'écran : c'est ce recoupement qui a révélé
 * l'écart (`fc+tca+mx6+mrn` sur `https://hope-hope-hope.fr/` annonçait 384 pour
 * une scène qui garde trois jetons et en jette dix, soit 230).
 */

export const REGLAGES = {
  // ★ **L_IDEAL EST PASSÉ DE 9 À 2, ET C'EST UN CORRECTIF, PAS UN RÉGLAGE.**
  //
  //   > « Le malus d'élégance pour chaque étape supplémentaire doit décroître
  //   >   avec le nombre d'étapes. Passer de 2 à 3 étapes doit peser plus lourd
  //   >   que passer de 5 à 6 étapes. » (l'auteur)
  //
  //   La DÉCROISSANCE existait déjà — une décroissance géométrique a par
  //   construction un coût marginal qui diminue. Ce qui n'existait pas, c'est
  //   qu'elle s'applique : à 9, le critère valait 1 000 pour TOUTE voie du
  //   corpus, dont aucune n'atteint neuf étapes. Mesuré sur « Donald Trump » :
  //   six voies en tête, C = 1 000 pour les six, d'une démonstration de quatre
  //   étapes à une de huit. Un critère qui ne distingue rien ne pèse rien, quel
  //   que soit son poids affiché — 150 ‰ de rien font rien.
  //
  //   À 2, le barème dit ce que l'auteur décrit, et on peut le lire :
  //       2 → 3 étapes : −120 ‰      5 → 6 étapes : −82 ‰
  //   La première marche coûte une fois et demie la seconde, et l'écart se
  //   resserre encore ensuite. Deux, parce qu'une démonstration d'une ou deux
  //   étapes est ce qu'on ne peut pas raccourcir — au-delà, on paie.
  L_IDEAL: 2,
  CONCISION_DECROISSANCE: [88, 100], // C = 0,88 ^ max(0, L − L*)
  // Exposant de couverture 1,5 — implémenté en entier via une racine entière.
  PALIERS_HOMOGENEITE: { memeMethodeEtFiltres: 1000, memeMethode: 900, memeMappeur: 600, memeFamille: 300, sinon: 50 },
  ELEGANCE: { petit: 1000, moyen: 850, grand: 650, enorme: 350, penaliteNegatif: [85, 100], bonusRemarquable: 100 },
  NOMBRES_REMARQUABLES: [7, 11, 13, 22, 33, 42, 44, 66, 99, 101, 666],
  LAMBDA_MMR: 350,               // pour-mille — pénalité de redondance du N4
  MAX_PAR_MAPPEUR: 2,
  MAX_APPROCHES: 12,
  MAX_FRAGMENTS: 24,
  // ── les deux réglages du CURSEUR DE QUANTITÉ (voir `facteurQuantite`)
  // ★ Le PLAFOND n'est plus ici : il vit dans `config.js › MAX_SERIES`, et il
  //   n'en existe plus de copie. Celle qui était ici disait 6 quand le moteur
  //   en montrait 9 — voir le pavé de `config.js`, qui raconte comment un
  //   contrôle croisé annoncé mais jamais écrit a laissé les deux diverger.
  // Ce qu'une série manquante (ou surnuméraire) coûte au cran extrême, en ‰.
  // Mesuré : au cran 200, une voie à une seule série paie ×0,60 face à une
  // moisson à six — assez pour renverser un écart de score de 40 %, pas assez
  // pour effacer la voie de la liste.
  PAS_DE_QUANTITE: 80,
  // Le même garde-fou que `elegance.js › FACTEUR_PLANCHER` : un curseur ne doit
  // jamais pouvoir annihiler une voie, seulement la reléguer.
  PLANCHER_DE_QUANTITE: 400,
};

// ══════════════════════════════════ arithmétique entière

const MILLE = 1000;

const borner = (x, min, max) => (x < min ? min : x > max ? max : x);

/** Conversion d'une métadonnée flottante [0,1] du catalogue en entier [0,1000]. */
export const pourMille = (x) => borner(Math.round((Number(x) || 0) * MILLE), 0, MILLE);

/** Racine carrée entière (Newton) — déterministe, sans Math.sqrt flottant. */
export function racineEntiere(n) {
  if (n < 2) return n < 0 ? 0 : n;
  let x = n;
  let y = (x + 1) >> 1;
  while (y < x) { x = y; y = (x + Math.floor(n / x)) >> 1; }
  return x;
}

/** Comparaison lexicographique de deux suites de codes, en unités de code (§4.4-4). */
export function comparerCodes(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

// ═══════════════ ★ LES QUATRE CURSEURS — « repondérer sans réécrire le barème »

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  L'écran de liste offre QUATRE CURSEURS INDÉPENDANTS. Ils ne remplacent pas
 *  les six critères : ils les REPONDÈRENT.
 *
 *   · `simplicite`   — la concision de la voie ;
 *   · `exhaustivite` — ne rien jeter de la saisie ;
 *   · `quantite`     — maximiser la présence du motif cherché ;
 *   · `coherence`    — ce que le code appelle « élégance », et que l'auteur
 *                      dit « pourrait aussi être nommé vraisemblance ».
 *
 *  Le POURCENTAGE affiché à côté d'un curseur vaut sa position divisée par la
 *  somme des quatre (`pourcentagesDe`) : quatre curseurs au même cran, c'est
 *  quatre fois 25 %, et lever un curseur abaisse mécaniquement l'affichage des
 *  trois autres sans qu'on les ait touchés. C'est un AFFICHAGE, pas un calcul :
 *  le moteur, lui, ne lit que les POSITIONS.
 *
 * ── LA CORRESPONDANCE VERS LES SIX CRITÈRES — tranchée par l'auteur ────────
 *
 * > « homogénéité devrait varier avec simplicité ET cohérence »
 * > « notoriété devrait varier avec cohérence »
 *
 * Les deux phrases fixent trois cases de la table ; les quatre autres se
 * déduisent de ce que chaque critère MESURE, et il n'y avait pas d'hésitation :
 *
 *   · `concision`  ← simplicité   — c'est le même mot. Le critère compte les
 *                                   étapes rendues ; le curseur s'appelle
 *                                   « concision de la voie ».
 *   · `couverture` ← exhaustivité — « ne rien jeter » est la définition
 *                                   littérale de U (part de la saisie lue).
 *   · `antiAdHoc`  ← cohérence    — une pirouette est exactement ce qui rend
 *                                   une démonstration INVRAISEMBLABLE.
 *   · `elegance`   ← cohérence    — le curseur porte le nom que le code donne
 *                                   déjà à ce critère.
 *
 * ⚠️ **Le partage de l'HOMOGÉNÉITÉ est MOITIÉ-MOITIÉ, et c'est un choix par
 * défaut assumé.** L'auteur a dit « simplicité ET cohérence » sans dire dans
 * quelle proportion. Toute autre répartition inventerait une préséance qu'il
 * n'a pas énoncée ; 125 + 125 est la seule qui n'en invente aucune. Elle se
 * révise en changeant deux nombres ici, et nulle part ailleurs.
 *
 * ★ **La QUANTITÉ ne pèse sur AUCUN des six.** Ce n'est pas un oubli : aucun
 * des six critères ne compte les 666 produits — c'est précisément le reproche
 * que `POIDS_DES_REGIMES` documente déjà (« les six critères ne voient pas la
 * différence »). Elle agit donc là où la quantité se mesure vraiment, et à deux
 * endroits qui existaient avant elle :
 *   · la famille `quantite` du crédit d'élégance (`elegance.js › NATURE` —
 *     `TRIPTYQUE_CONTIGU`, `TRIPTYQUE_REPETE`, `SIX_SURNUMERAIRE`, c'est-à-dire
 *     littéralement les postes qui paient pour avoir trouvé le motif souvent) ;
 *   · un facteur sur le score, lu sur le nombre de séries (`facteurQuantite`).
 *
 * ── LES POSITIONS : entiers de 0 à 200, défaut 100 ─────────────────────────
 *
 * Cent au milieu, pour trois raisons qui tombent toutes juste :
 *   1. au défaut, la table ci-dessous rend EXACTEMENT `POIDS` (250, 200, 180,
 *      150, 120, 100 ‰, somme 1 000) — l'invariant que le test vérifie ;
 *   2. les quatre pourcentages affichés valent alors 25 % chacun ;
 *   3. le maximum, 200, est le point où l'exhaustivité fait payer le rendement
 *      PLEIN TARIF (voir `facteurRendement`) : la butée du curseur est un
 *      arbitrage lisible, pas un nombre rond choisi au hasard.
 *
 * ── DÉTERMINISME (§4.4) ────────────────────────────────────────────────────
 * Tout est entier. La renormalisation à 1 000 distribue son reste au « plus
 * fort reste », et départage les ex æquo par l'ORDRE DE LA TABLE — jamais par
 * un tri instable ni par un `localeCompare`.
 *
 * ── ⚠️ CE QUE LA RENORMALISATION FAIT, ET QU'ON NE VOIT PAS VENIR ──────────
 *
 * Les six poids somment à 1 000 : c'est un jeu à somme nulle, et « lever un
 * curseur » n'y veut pas dire « monter les critères qu'il nourrit ». MESURÉ :
 * quand la cohérence passe de 0 à 200, la contribution BRUTE de l'homogénéité
 * TRIPLE (12 500 → 37 500) et sa part NORMALISÉE BAISSE (275 → 243 ‰) — parce
 * que la notoriété, l'anti-ad-hoc et l'élégance, eux, partent de zéro et
 * gonflent le dénominateur plus vite.
 *
 * Ce n'est pas un défaut de la table, c'est ce que « pondérer » signifie. La
 * garantie que le barème offre est donc un RAPPORT, et elle est exacte : à
 * témoin constant — un critère que le curseur ne nourrit pas —, le rapport ne
 * recule jamais. C'est cela que le test vérifie, poste par poste, plutôt qu'une
 * monotonie de la part absolue, qui serait fausse et qu'on aurait fini par
 * « corriger » en cassant la table.
 *
 * ── ⚠️ CE QUE LES CURSEURS NE TOUCHENT PAS : LE FAISCEAU DU BFS ────────────
 *
 * `scorePartiel` et `scoreDeAcc` lisent `POIDS` en direct, et continuent de le
 * faire quels que soient les curseurs. Ils décident de ce que la recherche
 * EXPLORE (`bfs.js`, le faisceau par état), pas de ce que la liste MONTRE, et
 * les deux questions sont distinctes : l'ensemble exploré doit rester le même
 * pour une saisie donnée, sans quoi deux réglages de curseurs ne classeraient
 * pas les mêmes voies mais des voies différentes — et « repondérer » cesserait
 * de vouloir dire « trier autrement ». Le curseur qui agit sur l'exploration
 * existe, il s'appelle la PUISSANCE DE FOUILLE (`config.js`), et il est
 * séparé pour cette raison exacte.
 */

/** Les quatre curseurs, dans l'ordre où l'auteur les a nommés. */
export const CURSEURS = Object.freeze(['simplicite', 'exhaustivite', 'quantite', 'coherence']);

/** Position centrale : au défaut, le barème est celui d'aujourd'hui. */
export const CURSEUR_DEFAUT = 100;

/** Butée haute — le plein tarif du rendement (voir `facteurRendement`). */
export const CURSEUR_MAX = 200;

/**
 * Ce que chaque curseur apporte à chaque critère, en pour-mille de poids pour
 * CENT crans de curseur. Somme au défaut : 1 000, comme l'exige `POIDS`.
 *
 * ⚠️ C'EST LE SEUL ENDROIT À MODIFIER pour changer la correspondance.
 */
export const CORRESPONDANCE = Object.freeze({
  homogeneite: Object.freeze({ simplicite: 125, coherence: 125 }), // 250 au défaut
  notoriete: Object.freeze({ coherence: 200 }),
  couverture: Object.freeze({ exhaustivite: 180 }),
  concision: Object.freeze({ simplicite: 150 }),
  antiAdHoc: Object.freeze({ coherence: 120 }),
  elegance: Object.freeze({ coherence: 100 }),
});

/** Les positions par défaut, en objet — l'état du panneau au premier affichage. */
export const CURSEURS_DEFAUT = Object.freeze(
  Object.fromEntries(CURSEURS.map((c) => [c, CURSEUR_DEFAUT])),
);

/**
 * Une position de curseur, ramenée à un entier de [0, CURSEUR_MAX].
 * Ce qui n'est pas un nombre retombe au défaut : un curseur absent n'est pas un
 * curseur à zéro, c'est un curseur qu'on n'a pas touché.
 */
function positionDe(v) {
  if (v === undefined || v === null || v === '') return CURSEUR_DEFAUT;
  const n = Number(v);
  if (!Number.isFinite(n)) return CURSEUR_DEFAUT;
  return borner(Math.trunc(n), 0, CURSEUR_MAX);
}

/** Les quatre positions, complétées et bornées. */
export function normaliserCurseurs(curseurs) {
  const src = curseurs || {};
  const out = {};
  for (const c of CURSEURS) out[c] = positionDe(src[c]);
  return out;
}

/** Les quatre curseurs sont-ils tous au cran par défaut ? */
export const auDefaut = (curseurs) => CURSEURS.every((c) => curseurs[c] === CURSEUR_DEFAUT);

/**
 * Répartition entière au PLUS FORT RESTE, ex æquo départagés par l'ordre des
 * clés. C'est la seule façon de faire tomber une somme sur un total exact sans
 * flottant et sans tri instable (§4.4).
 *
 * @param {number[]} parts   les numérateurs
 * @param {number} somme     leur somme (> 0)
 * @param {number} total     le total visé
 * @param {string[]} cles    les noms, dans l'ordre qui départage
 */
function repartir(parts, somme, total, cles) {
  const quotients = parts.map((p) => Math.floor((p * total) / somme));
  const restes = parts.map((p, i) => (p * total) - (quotients[i] * somme));
  let reste = total - quotients.reduce((s, q) => s + q, 0);
  // Les indices classés par reste décroissant, l'indice croissant départageant.
  const rang = parts.map((_, i) => i).sort((a, b) => (restes[b] - restes[a]) || (a - b));
  for (let i = 0; i < rang.length && reste > 0; i++, reste--) quotients[rang[i]]++;
  const out = {};
  cles.forEach((k, i) => { out[k] = quotients[i]; });
  return out;
}

/**
 * Le pourcentage affiché à côté de chaque curseur : sa position rapportée à la
 * somme des quatre. « `valeur_du_curseur / max(1, somme_de_toutes_les_positions)` »
 * — l'auteur, mot pour mot. Le `max(1, …)` évite la division par zéro quand les
 * quatre curseurs sont au plancher ; il n'invente aucune répartition, il rend
 * quatre fois 0 %.
 *
 * Arrondi ENTIER, et le reste part au plus fort reste comme pour les poids :
 * quatre curseurs égaux affichent 25 / 25 / 25 / 25 et non 25 / 25 / 25 / 24.
 */
export function pourcentagesDe(curseurs) {
  const c = normaliserCurseurs(curseurs);
  const somme = CURSEURS.reduce((s, k) => s + c[k], 0);
  if (somme <= 0) return Object.fromEntries(CURSEURS.map((k) => [k, 0]));
  return repartir(CURSEURS.map((k) => c[k]), somme, 100, CURSEURS);
}

/**
 * ★ **LES QUATRE SCORES BRUTS D'UNE VOIE — ce que chaque axe vaut, AVANT
 *   pondération.**
 *
 * > « Ensuite les 4 scores de métriques intermédiaires doivent être listés sans
 * >   y appliquer les ajustements de pondération. Simplicité : {score},
 * >   Exhaustivité : {score}… Soit 5 scores (le global pondéré et les composants
 * >   bruts) à afficher sur chaque encart. » (l'auteur)
 *
 * ★ **DÉRIVÉS DE `CORRESPONDANCE`, JAMAIS RECOPIÉS.** Chaque axe vaut la moyenne
 *   des critères qu'il nourrit, pondérée par les coefficients de la table — les
 *   MÊMES qui font le barème. Une seconde table qui dirait « simplicité, c'est
 *   la concision » se serait périmée au premier ajout de critère, et l'écran
 *   aurait affiché autre chose que ce que le classement mesure. C'est la
 *   doctrine du dépôt : ce qui est montré est ce qui est compté (§0.3).
 *
 * ★ **LA QUANTITÉ N'EST DANS AUCUN DES SIX CRITÈRES**, et c'est un fait du
 *   barème, pas un oubli : aucun d'eux ne compte les 666. Elle se lit donc sur
 *   ce qu'elle mesure vraiment — le nombre de séries, rapporté au plafond que le
 *   moteur sait montrer (`config.js › MAX_SERIES`).
 *
 * ★ **« SANS AJUSTEMENT DE PONDÉRATION »** : ces quatre-là ne bougent PAS quand
 *   on déplace les curseurs. C'est ce qui leur donne leur usage — comparer deux
 *   voies sur un axe, indépendamment du réglage qui les classe. Seul le score
 *   global, lui, suit les curseurs.
 *
 * @param {Object} approche  une approche notée (`criteres`, `series`)
 * @returns {Object} un score en pour-mille par axe
 */
/**
 * ★ **LE PONT ENTRE LES DEUX NOMMAGES DU MÊME CRITÈRE.**
 *
 * `POIDS` et `CORRESPONDANCE` nomment les critères en toutes lettres —
 * `homogeneite`, `notoriete`… — tandis que `approche.criteres` les abrège d'une
 * majuscule, `H`, `N`, `U`, `C`, `A`, `E`, parce que c'est ce qui se lit dans un
 * relevé de banc. Les deux nommages existaient bien avant ce module ; ce qui
 * manquait est ce qui les relie.
 *
 * ⚠️ Sans lui, `scoresParAxe` lisait `criteres.notoriete` — qui n'existe pas —
 *   et retombait sur son défaut de 1 000 : les quatre axes affichaient un
 *   parfait uniforme, ce qui est le pire des mensonges, parce qu'il est
 *   crédible. Mesuré avant correction : « cohérence 1 000 » sur une voie dont la
 *   notoriété valait 566.
 *
 * ★ Un test croise cette table avec `POIDS` : une clé de trop ou de moins d'un
 *   côté fait rougir, plutôt que de laisser un critère se taire.
 */
export const LETTRE_DU_CRITERE = Object.freeze({
  homogeneite: 'H',
  notoriete: 'N',
  couverture: 'U',
  concision: 'C',
  antiAdHoc: 'A',
  elegance: 'E',
});

export function scoresParAxe(approche) {
  const c = (approche && approche.criteres) || {};
  const out = {};
  for (const axe of CURSEURS) {
    let somme = 0;
    let poids = 0;
    for (const [critere, apports] of Object.entries(CORRESPONDANCE)) {
      const w = apports[axe];
      if (!w) continue;
      somme += w * (c[LETTRE_DU_CRITERE[critere]] ?? MILLE);
      poids += w;
    }
    out[axe] = poids ? Math.round(somme / poids) : null;
  }
  // ★ L'EXHAUSTIVITÉ compte AUSSI ce qu'on jette en chemin : la couverture dit
  //   ce qui est lu, le rendement ce qui sert. Les deux à parts égales, comme
  //   les deux leviers que le curseur actionne (`facteurRendement`).
  if (out.exhaustivite !== null && c.R !== undefined && c.R !== null) {
    out.exhaustivite = Math.round((out.exhaustivite + c.R) / 2);
  }
  // ★ LA QUANTITÉ, sur ce qu'elle mesure : les séries rapportées au plafond.
  const series = Math.min(approche && approche.series ? approche.series : 1, MAX_SERIES);
  out.quantite = Math.round((series * MILLE) / MAX_SERIES);
  return out;
}

/**
 * ★ LA FONCTION DE PONDÉRATION — quatre positions ⇒ le barème effectif.
 *
 * @param {Object} [curseurs]  positions, complétées par le défaut
 * @returns {{curseurs:Object, poids:Object, poidsCredit:Object,
 *            pourcentages:Object, personnalisee:boolean}}
 *
 * ★ **`personnalisee` est la clé de tout le reste.** Quand elle est fausse —
 * c'est-à-dire quand les quatre curseurs sont au défaut —, `noter` ne prend
 * AUCUN des chemins nouveaux : il lit `POIDS` en direct, ne repondère pas le
 * crédit, et applique le rendement en racine comme il l'a toujours fait.
 * L'invariant « curseurs au défaut ⇒ classement identique à aujourd'hui » n'est
 * donc pas une coïncidence numérique qu'un test surveille : c'est la MÊME LIGNE
 * DE CODE qui s'exécute. Le test la vérifie quand même — voir
 * `tests/curseurs.test.js` —, parce qu'un invariant qu'on croit structurel est
 * exactement celui qu'une réécriture casse en silence.
 *
 * ★ `POIDS` est lu à CHAQUE appel, jamais capturé : `tests/etalonnage.test.js`
 * le réécrit à la volée (`Object.assign(POIDS, …)`) pour mesurer l'effet d'un
 * autre barème, et une pondération figée au chargement du module le rendrait
 * muet.
 */
/**
 * ★ **CE QUE PÈSE UNE SUPPRESSION — et pourquoi cette famille est la seule à
 *   monter plus haut que le double.**
 *
 * Les cinq postes de la suppression sont de PETITS nombres : la ponctuation vaut
 * 1, un bloc court 2, un bloc entier 8, une lettre arrachée 26, une valeur jetée
 * 36. C'est une échelle juste — elle a été mesurée, et sa dernière marche a
 * même résisté à trois tentatives d'alourdissement (voir `elegance.js ›
 * VALEUR_JETEE`). Mais elle est juste À L'ÉCHELLE DU CRÉDIT, qui se compte en
 * milliers.
 *
 * MESURÉ, avec la pondération ordinaire des familles (×0 à ×2) : sur
 * `hope-hope-hope.fr`, `fl+tca+m14` — qui abandonne trois signes et jette deux
 * valeurs calculées — passe de 1 656 à 1 650 quand on pousse le curseur d'un
 * bout à l'autre. SIX POINTS SUR MILLE SIX CENT : le levier existait, il ne
 * levait rien. Un curseur qui ne déplace rien est pire qu'un curseur absent — il
 * promet une prise qu'il n'a pas.
 *
 * ★ **D'OÙ UNE COURSE ASYMÉTRIQUE, ET ASSUMÉE.** Vers le bas, jusqu'à zéro :
 *   « supprimer ne coûte rien », qui est une position tenable pour qui ne
 *   cherche que la quantité. Vers le haut, jusqu'à HUIT FOIS : c'est ce qu'il
 *   faut pour que soixante-quinze points bruts de suppression pèsent contre un
 *   crédit de deux mille. Le défaut, lui, reste à 1 000 au bit près — le barème
 *   d'aujourd'hui, que l'invariant du défaut vérifie.
 *
 * ★ Et ce n'est pas un tarif de plus à étalonner : l'ÉCHELLE entre les cinq
 *   postes ne bouge pas d'un pouce, seul son bloc monte ou descend. Une valeur
 *   jetée continue de coûter trente-six fois une ponctuation, à tous les crans.
 */
const SUPPRESSION_AU_PLUS_HAUT = 8000;

function poidsDeLaSuppression(exhaustivite) {
  const e = positionDe(exhaustivite);
  if (e <= CURSEUR_DEFAUT) return e * 10;
  const marge = SUPPRESSION_AU_PLUS_HAUT - MILLE;
  return MILLE + Math.floor((marge * (e - CURSEUR_DEFAUT)) / CURSEUR_DEFAUT);
}

export function ponderer(curseurs) {
  const c = normaliserCurseurs(curseurs);
  const personnalisee = !auDefaut(c);
  const cles = Object.keys(CORRESPONDANCE);
  const bruts = cles.map((critere) => {
    let v = 0;
    for (const [cur, coef] of Object.entries(CORRESPONDANCE[critere])) v += coef * c[cur];
    return v;
  });
  const somme = bruts.reduce((s, v) => s + v, 0);
  // ★ AUCUN des trois curseurs qui nourrissent les six critères n'est levé —
  //   « quantité seule », par exemple. Les six poids n'ont alors pas de rapport
  //   défini entre eux : on ne les invente pas, on garde le barème du défaut, et
  //   les autres leviers du curseur levé (le crédit, le facteur de quantité)
  //   continuent d'agir. C'est le seul repli de cette fonction, et il est DIT.
  const poids = somme > 0 ? repartir(bruts, somme, MILLE, cles) : { ...POIDS };
  return {
    curseurs: c,
    poids,
    // Le crédit d'élégance se repondère par FAMILLE (`elegance.js › credit`) :
    // 100 crans = poids plein = 1 000 ‰, donc dix pour-mille par cran.
    /* ★ **TROIS FAMILLES PONDÉRÉES, PAS DEUX.** L'exhaustivité rejoint la
       quantité et la cohérence : les cinq postes de la SUPPRESSION portent
       désormais la famille `exhaustivite` (`elegance.js › NATURE`), et le
       curseur les hausse ou les abaisse d'un bloc.

       C'est l'arbitrage de l'auteur, et il déplace la mesure : « ce critère doit
       faire peser plus ou moins lourd tout ce qui est suppression, que ce soit
       au départ ou plus tard ; quand `57` est écarté à la fin, malus
       d'exhaustivité, aussi bien que si `fr` avait été ignoré au début. En
       revanche si `fr` est converti en 4+2 qui fait 6, aucun problème, même si
       on passe de 2 à 1 caractère. »

       ⚠️ Cela ne remplace pas le poids de la COUVERTURE, qui reste nourri par
         le même curseur : « utiliser toute la saisie, oui ». Mais la couverture
         ne voit que les caractères SIGNIFIANTS — elle est aveugle aux deux
         tirets et au point de `hope-hope-hope.fr`, que l'auteur compte pourtant
         parmi les jetés. Ces postes-ci les voient, et c'est ce qui manquait. */
    poidsCredit: {
      quantite: c.quantite * 10,
      elegance: c.coherence * 10,
      exhaustivite: poidsDeLaSuppression(c.exhaustivite),
    },
    pourcentages: pourcentagesDe(c),
    personnalisee,
  };
}

/**
 * ★ LE RENDEMENT, PORTÉ PAR L'EXHAUSTIVITÉ.
 *
 * « L'usage maximal de la saisie utilisateur est à récompenser autant que
 * possible » (l'auteur). Le rendement (`rendementSix`) est exactement le
 * compteur qui dit ce qu'une voie a CALCULÉ puis JETÉ ; le curseur règle donc à
 * quel prix ce déchet se paie, entre trois ancrages exacts :
 *
 *   · 0   → ×1,000 — le rendement ne compte plus. Jeter est gratuit.
 *   · 100 → ×√r    — le tarif d'aujourd'hui, « franc sans être capital ».
 *   · 200 → ×r     — plein tarif. Récolter trois 6 sur dix-sept valeurs vaut
 *                    0,176 et non 0,419 : la voie qui gaspille disparaît.
 *
 * Entre deux ancrages, l'interpolation est LINÉAIRE sur le facteur — et non sur
 * un exposant, qui demanderait une puissance fractionnaire, donc du flottant,
 * donc la fin du déterminisme (§4.4). Trois ancrages exacts et deux segments
 * droits disent la même intention en arithmétique entière.
 *
 * Mesuré sur les cinq cas du pavé `rendementSix` (r en pour-mille), aux crans
 * 0 / 100 / 200 :
 *
 *   r = 1000 (3/3)   → 1000 / 1000 / 1000   — le parfait ne bouge jamais
 *   r =  750 (3/4)   → 1000 /  866 /  750
 *   r =  857 (12/14) → 1000 /  925 /  857
 *   r =  285 (4/14)  → 1000 /  533 /  285
 *   r =  176 (3/17)  → 1000 /  419 /  176
 *
 * ── ⚠️ LES DEUX FAÇONS DE « NE RIEN JETER » NE DÉSIGNENT PAS LES MÊMES VOIES ─
 *
 * Ce curseur tire sur DEUX leviers, et l'auteur les a demandés tous les deux :
 * le poids de la COUVERTURE parmi les six critères (« ne rien jeter de la
 * saisie ») et ce facteur-ci (« ne rien jeter de ce qu'on a calculé »). Les deux
 * sont monotones dans le bon sens, et ce sont des propriétés EXACTES, vérifiées
 * par un test : à deux voies identiques par ailleurs, lever le curseur avantage
 * toujours celle qui lit plus de la saisie (le poids de U passe de 0 ‰ au cran 0
 * à 305 ‰ au cran 200), et toujours celle qui jette moins.
 *
 * MAIS ILS NE TIRENT PAS LES MÊMES VOIES VERS LE HAUT, et la mesure le dit
 * franchement. Moyennes sur les trois premières voies de neuf listes, rang des
 * séries replié pour que les autres curseurs puissent atteindre la tête :
 *
 *   cran     0    50   100   150   200
 *   U      924   815   789   745   745      ‰ de la saisie réellement lue
 *   R      464   548   560   574   574      ‰ des valeurs récoltées qui font 6
 *
 * La couverture moyenne BAISSE quand le curseur monte, le rendement moyen MONTE.
 * Ce n'est pas une inversion du curseur — c'est un arbitrage réel entre deux
 * lectures du même mot : **lire toute la saisie demande souvent un vecteur
 * large, et un vecteur large jette.** Au cran 0, jeter est gratuit, donc les
 * moissons qui balaient tout le texte et abandonnent les trois quarts de ce
 * qu'elles calculent remontent ; au cran 200, elles paient plein tarif et
 * cèdent la place à des voies plus étroites et plus propres.
 *
 * ⚠️ **ARBITRAGE OUVERT.** Trois variantes ont été essayées et mesurées pour
 * faire monter U avec le curseur — n'ouvrir le levier du rendement que vers le
 * haut, ou que vers le bas, ou n'en ouvrir que la moitié. Aucune ne rend U
 * monotone : la meilleure (levier bas au quart) donne 707 / 756 / 789 / 745 /
 * 745, soit une bosse au milieu au lieu d'une pente. Le levier du rendement a
 * été gardé ENTIER, parce qu'une variante qui ne corrige pas la mesure et qui
 * ajoute deux réglages est un réglage de plus sans une raison de plus. Si
 * l'auteur veut que « exhaustivité » ne parle QUE de la saisie lue, la ligne à
 * supprimer est celle qui appelle cette fonction dans `noter`, et ce
 * commentaire dit alors pourquoi.
 *
 * @param {number} rendement    part des valeurs récoltées qui vaut 6, en ‰
 * @param {number} exhaustivite position du curseur
 * @returns {number} facteur en pour-mille
 */
export function facteurRendement(rendement, exhaustivite = CURSEUR_DEFAUT) {
  const racine = racineEntiere(rendement * MILLE);
  const e = positionDe(exhaustivite);
  if (e === CURSEUR_DEFAUT) return racine;
  if (e < CURSEUR_DEFAUT) return MILLE + Math.floor(((racine - MILLE) * e) / CURSEUR_DEFAUT);
  return racine + Math.floor(((rendement - racine) * (e - CURSEUR_DEFAUT)) / CURSEUR_DEFAUT);
}

/**
 * ★ LE COMPTE DES SÉRIES, PORTÉ PAR LA QUANTITÉ.
 *
 * « Quantité — maximiser la présence du motif recherché. » Le compteur existe
 * déjà et il est redéduit de la géométrie, donc stable au rejeu d'une URL :
 * `approche.series`, le nombre de 666 réellement alignés.
 *
 * ★ **Le facteur ne dépasse JAMAIS 1 000, et c'est la doctrine du projet, pas
 * une timidité.** `PART_CRITERES` explique pourquoi un bonus additif est
 * ruineux — il se prélève sur la réserve et écrase toute l'échelle —, et
 * `elegance.js › facteur` pose la même règle en toutes lettres : « l'élégance
 * ne peut que retirer ». Un facteur qui monterait au-dessus de 1 000 ferait
 * saturer le plafond de 10 000 (§4.7) et remettrait à égalité, tout en haut de
 * la liste, ce que le barème vient de séparer.
 *
 * Récompenser la quantité s'écrit donc en PÉNALISANT ce qui en manque, et
 * l'inverse en pénalisant ce qui en abonde :
 *
 *   · quantite = 100 → ×1,000 partout. Le défaut ne touche à rien.
 *   · quantite > 100 → chaque série MANQUANTE sous le plafond coûte, et la
 *                      peine croît jusqu'au cran 200.
 *   · quantite < 100 → chaque série SUPPLÉMENTAIRE au-dessus d'une coûte : qui
 *                      baisse ce curseur demande qu'on cesse de lui vendre du
 *                      nombre, et le 666 unique cesse alors d'être pénalisé.
 *
 * Le PLAFOND de référence est `config.js › MAX_SERIES`, celui-là même que
 * `assemblage.js › MAX_SERIES` (six) : c'est le plus grand nombre de 666 que le
 * moteur montre d'un coup, donc le seul repère qui ne dépende pas de la saisie.
 *
 * @param {number} series      le nombre de 666 alignés (au moins 1)
 * @param {number} quantite    position du curseur
 * @returns {number} facteur en pour-mille, dans [PLANCHER_DE_QUANTITE, 1000]
 */
export function facteurQuantite(series, quantite = CURSEUR_DEFAUT) {
  const q = positionDe(quantite);
  if (q === CURSEUR_DEFAUT) return MILLE;
  const plafond = MAX_SERIES;
  const s = borner(Math.trunc(series) || 1, 1, plafond);
  const ecart = q > CURSEUR_DEFAUT
    ? (plafond - s) * (q - CURSEUR_DEFAUT)   // il en manque : on paie le manque
    : (s - 1) * (CURSEUR_DEFAUT - q);        // il y en a trop : on paie l'abondance
  const peine = Math.floor((REGLAGES.PAS_DE_QUANTITE * ecart) / CURSEUR_DEFAUT);
  return borner(MILLE - peine, REGLAGES.PLANCHER_DE_QUANTITE, MILLE);
}

// ══════════════════════════════════ signature de méthode (§4.2)

/**
 * Les quatre signatures d'un chemin, calculées d'un seul parcours et mémoïsées
 * sur lui. `diversifier` compare toutes les paires d'approches (MMR, §4.8) et
 * chaque comparaison en redemandait deux ou trois : sur un paragraphe, ce seul
 * recalcul pesait 80 ms — plus que tout l'assemblage.
 */
function signatures(chemin) {
  let s = chemin._sig;
  if (s !== undefined && s !== null) return s;
  const methode = [];
  const filtres = [];
  let mappeur = null;
  for (const o of chemin.ops) {
    if (o.famille === 'filtre') filtres.push(o.id);
    else methode.push(o.id);
    if (mappeur === null && (o.famille === 'mappeur' || o.famille === 'mesure')) mappeur = o;
  }
  s = {
    methode: methode.join('>'),
    filtres: filtres.join('>'),
    mappeur: mappeur ? mappeur.id : null,
    familleMappeur: mappeur ? (mappeur.genre || mappeur.famille) : null,
  };
  chemin._sig = s;
  return s;
}

/** Les opérateurs hors filtres, dans l'ordre : c'est ce qui identifie « une méthode ». */
export function signature(chemin) {
  return signatures(chemin).methode;
}

export function signatureFiltres(chemin) {
  return signatures(chemin).filtres;
}

/** Premier opérateur de famille « mappeur » ou « mesure ». */
export function mappeurPrincipal(chemin) {
  return signatures(chemin).mappeur;
}

/**
 * La famille du mappeur, pour le palier « même famille » de `similarite`.
 *
 * ⚠️ Ce palier est plus GROSSIER que `research/heuristique.md §4.2` ne le
 * prévoit, et c'est délibéré. Le catalogue publié ne porte de `genre` sur aucun
 * de ses quarante mappeurs : la valeur rendue est donc « mappeur » ou
 * « mesure », si bien que deux mappeurs quelconques touchent le palier
 * `memeFamille = 0,30` au lieu du plancher `sinon = 0,05`.
 *
 * On a essayé de le raffiner avec la table `MANIERES` ci-dessous, qui donne la
 * taxonomie manquante. MESURE : l'homogénéité d'un 666 à trois sources — un
 * `hope` par la numérologie chaldéenne, un `-` par la touche AZERTY, un `fr`
 * par le sept segments — tombe de 0,30 à 0,05, et son score de 3 038 à 2 727.
 * Autrement dit, raffiner ce palier DURCIT le mur d'homogénéité au lieu de
 * l'abaisser — exactement l'inverse de ce que demande l'assemblage mixte. On
 * garde donc la version grossière, qui fait office de plancher, et `MANIERES`
 * ne sert qu'au mode CONVERGENCE, où l'exigence est de trouver des méthodes
 * DIFFÉRENTES et non de mesurer leur parenté.
 */
function familleMappeur(chemin) {
  return signatures(chemin).familleMappeur;
}

/**
 * ── La MANIÈRE d'un chemin : ce qu'un lecteur appellerait « une façon de faire ».
 *
 * `research/heuristique.md §4.2` prévoit un palier « même famille de mappeur
 * (ex. deux règles géométriques) ». Il repose sur un attribut `genre` que le
 * contrat n'impose pas et que le catalogue publié ne porte sur AUCUN de ses
 * quarante mappeurs : `familleMappeur` retombe donc sur `op.famille`, qui ne
 * distingue que « mappeur » de « mesure ». Le palier existe dans le code et ne
 * mord jamais.
 *
 * Cette table est le repli. Elle ne touche PAS à `similarite` — changer
 * l'homogénéité de toutes les approches d'un coup n'est pas une décision que
 * peut prendre un correctif de mode d'assemblage — mais elle donne au mode
 * CONVERGENCE de quoi exiger trois manières réellement différentes : « les
 * segments allumés », « les traits fusionnés » et « les traits en capitale » ne
 * sont qu'une seule manière de compter, quels que soient leurs trois codes.
 *
 * Un opérateur absent de la table est sa propre manière : la table restreint,
 * elle n'invente pas de parenté.
 */
const MANIERES = new Map(Object.entries({
  // dessiner la lettre et compter ce qu'on voit
  'm.seg7': 'geometrie', 'm.seg7Fusion': 'geometrie', 'm.seg14': 'geometrie',
  'm.seg14Fusion': 'geometrie', 'm.traitsMaj': 'geometrie', 'm.traitsMin': 'geometrie',
  'm.extremitesMaj': 'geometrie', 'm.extremitesMin': 'geometrie',
  'm.bouclesMaj': 'geometrie', 'm.bouclesMin': 'geometrie',
  // numéroter l'alphabet, d'une façon ou d'une autre
  'm.a1z26': 'alphabet', 'm.z26a1': 'alphabet', 'm.pythagore': 'alphabet',
  'm.chaldeen': 'alphabet', 'm.englishX6': 'alphabet', 'm.hebreu': 'alphabet',
  'm.grec': 'alphabet',
  // les points d'un jeu
  'm.scrabbleFR': 'jeu', 'm.scrabbleEN': 'jeu',
  // la géographie d'un clavier
  'm.t9': 'clavier', 'm.toucheChiffre': 'clavier',
  'm.azertyColonne': 'clavier', 'm.azertyRangee': 'clavier',
  'm.qwertyColonne': 'clavier', 'm.qwertyRangee': 'clavier',
  // un code de transmission
  'm.asciiMaj': 'code', 'm.asciiMin': 'code',
  'm.morseSignaux': 'code', 'm.morseTraits': 'code',
  // compter des signes, des mots, des lettres
  'n.longueur': 'comptage', 'n.voyelles': 'comptage', 'n.consonnes': 'comptage',
  'n.lettresDistinctes': 'comptage', 'n.separateurs': 'comptage', 'n.mots': 'comptage',
  'n.lettresPlusVoyelles': 'comptage', 'n.lettresPlusConsonnes': 'comptage',
  'm.longueurNom': 'comptage', 'm.longueurToken': 'comptage',
  'c.compteTokens': 'comptage', 'c.compteTokensDistincts': 'comptage',
}));

/** Combinateurs qui ignorent les valeurs et ne comptent que leur nombre. */
const COMBINATEURS_AVEUGLES = new Set(['c.cardinal', 'c.compteTokens', 'c.compteTokensDistincts']);

/**
 * La manière d'un chemin, pour le mode CONVERGENCE.
 * @param {Object} chemin
 * @returns {string} une clé de manière, jamais vide
 */
export function maniere(chemin) {
  // ★ Le mappeur AVEUGLE. `c.cardinal` — « au nombre de valeurs » — rend la
  // taille du vecteur, pas son contenu : `tca+mpy+cnv` et `tca+msen+cnv` annoncent la
  // numérologie pythagoricienne et le Scrabble anglais, et comptent tous deux
  // les lettres. Trois « manières » ainsi bâties n'en font qu'une, et c'est
  // exactement le genre de fausse diversité que la convergence doit refuser.
  // Le typage empêche N3 de retirer le mappeur inerte (`mpy` est TOKENS→NUMS,
  // `cnv` est NUMS→NUM) : c'est donc ici qu'on le débusque.
  for (const o of chemin.ops) if (COMBINATEURS_AVEUGLES.has(o.id)) return 'comptage';
  const m = mappeurPrincipal(chemin);
  if (m) return MANIERES.get(m) || m;
  // Ni mappeur ni mesure : c'est le combinateur — l'addition, la soustraction —
  // qui fait la méthode à lui seul.
  for (const o of chemin.ops) {
    if (o.famille === 'combinateur') return MANIERES.get(o.id) || o.id;
  }
  return chemin.ops.length ? chemin.ops[chemin.ops.length - 1].id : 'vide';
}

/** Similarité entre deux chemins, par paliers — en pour-mille. */
export function similarite(a, b) {
  const P = REGLAGES.PALIERS_HOMOGENEITE;
  const sa = signature(a);
  const sb = signature(b);
  if (sa === sb) {
    return signatureFiltres(a) === signatureFiltres(b) ? P.memeMethodeEtFiltres : P.memeMethode;
  }
  const ma = mappeurPrincipal(a);
  const mb = mappeurPrincipal(b);
  if (ma && ma === mb) return P.memeMappeur;
  const fa = familleMappeur(a);
  const fb = familleMappeur(b);
  if (fa && fa === fb) return P.memeFamille;
  return P.sinon;
}

// ══════════════════════════════════ les 6 critères, chacun dans [0,1000]

/** H — homogénéité : moyenne des similarités deux à deux. */
export function critereHomogeneite(chemins) {
  if (chemins.length < 2) return MILLE;
  let somme = 0;
  let paires = 0;
  for (let i = 0; i < chemins.length; i++) {
    for (let j = i + 1; j < chemins.length; j++) { somme += similarite(chemins[i], chemins[j]); paires++; }
  }
  return Math.floor(somme / paires);
}

/** N — notoriété : moitié moyenne, moitié minimum (« maillon faible »). */
export function critereNotoriete(ops) {
  if (!ops.length) return 0;
  let somme = 0;
  let mini = MILLE;
  for (const op of ops) {
    const n = pourMille(op.notoriete);
    somme += n;
    if (n < mini) mini = n;
  }
  const moyenne = Math.floor(somme / ops.length);
  return Math.floor((moyenne + mini) / 2);
}

/**
 * C — concision : 0,88 ^ max(0, L − 9), L = nombre d'étapes rendues.
 *
 * Tabulée : le faisceau du BFS l'appelle une fois par préfixe créé (~10⁶ fois
 * sur une phrase de neuf mots), et sa boucle est en O(L). Le cache est invalidé
 * dès que l'un des deux réglages dont elle dépend change d'identité — les tests
 * d'étalonnage règlent ces constantes, le cache ne doit jamais les figer.
 */
let _concisionCache = null;
let _concisionSource = null;

export function critereConcision(L) {
  const src = REGLAGES.CONCISION_DECROISSANCE;
  if (_concisionSource !== src || _concisionCache === null
    || _concisionCache.ideal !== REGLAGES.L_IDEAL) {
    _concisionSource = src;
    _concisionCache = { ideal: REGLAGES.L_IDEAL, table: [] };
  }
  const n = L < 0 ? 0 : L | 0;
  const tab = _concisionCache.table;
  if (tab[n] !== undefined) return tab[n];
  const [num, den] = src;
  let c = MILLE;
  for (let i = REGLAGES.L_IDEAL; i < n; i++) c = Math.floor((c * num) / den);
  tab[n] = c;
  return c;
}

/** U — couverture : (utilisés / signifiants) ^ 1,5, en pour-mille. */
export function critereCouverture(utilises, signifiants) {
  if (signifiants <= 0) return MILLE;
  const u = borner(Math.floor((utilises * MILLE) / signifiants), 0, MILLE);
  // u^1.5 en pour-mille = u × sqrt(1000·u) / 1000
  return borner(Math.floor((u * racineEntiere(u * MILLE)) / MILLE), 0, MILLE);
}

/** A — absence d'ad hoc : produit de (1 − adHoc). Les entorses se composent. */
export function critereAntiAdHoc(ops) {
  let a = MILLE;
  for (const op of ops) a = Math.floor((a * (MILLE - pourMille(op.adHoc))) / MILLE);
  return a;
}

/** Appartenance aux nombres remarquables en O(1) — appelée une fois par nombre
 * intermédiaire de chaque préfixe, soit ~10⁶ fois sur une phrase de neuf mots.
 * Le jeu est ré-indexé dès que le réglage change d'identité. */
let _remarquablesSource = null;
let _remarquables = null;

function estRemarquable(abs) {
  const src = REGLAGES.NOMBRES_REMARQUABLES;
  if (_remarquablesSource !== src) { _remarquablesSource = src; _remarquables = new Set(src); }
  return _remarquables.has(abs);
}

function elegance1(x) {
  const E = REGLAGES.ELEGANCE;
  const abs = Math.abs(x);
  let e = abs <= 30 ? E.petit : abs <= 100 ? E.moyen : abs <= 999 ? E.grand : E.enorme;
  if (x < 0) e = Math.floor((e * E.penaliteNegatif[0]) / E.penaliteNegatif[1]);
  if (estRemarquable(abs)) e = Math.min(MILLE, e + E.bonusRemarquable);
  return e;
}

/** E — élégance des nombres intermédiaires. */
export function critereElegance(nombres) {
  if (!nombres.length) return MILLE;
  let somme = 0;
  for (const n of nombres) somme += elegance1(n);
  return Math.floor(somme / nombres.length);
}

// ══════════════════════════════════ collectes

export function nombresIntermediaires(chemin) {
  const out = [];
  for (const e of chemin.etats) {
    if (e.type === 'NUM') out.push(e.valeur);
    else if (e.type === 'NUMS') out.push(...e.valeur);
  }
  return out;
}

/**
 * L — étapes réellement rendues, APRÈS factorisation du préfixe commun de filtres.
 * Un `f.protocole` appliqué aux trois fragments est un seul geste à l'écran.
 */
export function longueurRendue(chemins) {
  if (!chemins.length) return 0;
  let prefixe = 0;
  const premier = chemins[0].ops;
  while (prefixe < premier.length && premier[prefixe].famille === 'filtre') {
    const code = premier[prefixe].code;
    const p = prefixe;
    if (!chemins.every((c) => c.ops[p] && c.ops[p].code === code)) break;
    prefixe++;
  }
  let L = 0;
  for (let i = 0; i < prefixe; i++) L += coutRendu(premier[i]);
  for (const c of chemins) for (let i = prefixe; i < c.ops.length; i++) L += coutRendu(c.ops[i]);
  return L;
}

/**
 * ★ **LE DÉCOUPAGE PAR DÉFAUT NE SE FACTURE PAS COMME UNE ÉTAPE.**
 *
 * > « Je souhaite que `tca` ne soit pas facturé comme une étape. » (l'auteur)
 *
 * `t.caracteres` est le passage obligé entre le TEXTE et les JETONS : il ouvre
 * la quasi-totalité des voies, et il ne se choisit pas — il s'écrit même plus
 * dans les liens (`url.js › CODE_DECOUPE_IMPLICITE`). Le facturer revenait à
 * poser le même péage sur tout le monde, ce qui ne classe personne, puis à
 * pénaliser les voies courtes deux fois plus que les longues en proportion.
 *
 * ★ **CE QU'ON NE FAIT PAS, ET POURQUOI.** On ne met pas son `cout` à zéro dans
 *   le catalogue : `cout` sert aussi au FAISCEAU du BFS, qui s'en sert pour
 *   borner sa profondeur. Un découpage gratuit à l'exploration décalerait ce que
 *   la recherche VISITE, alors que l'auteur parle de ce qu'elle FACTURE. Les
 *   deux questions sont distinctes, et une seule était posée.
 *
 * ★ Les trois autres découpages — `tm`, `tsp`, `tsy` — se facturent, eux. Ils
 *   CHOISISSENT quelque chose : découper « hope » en syllabes est une décision,
 *   et une décision se paie.
 *
 * ★ **ET LA LECTURE DES CHIFFRES NE SE FACTURE PAS NON PLUS**, pour la raison
 *   qui est au fond la même : lire un 9 comme neuf n'affirme rien, donc il n'y
 *   a rien à démontrer, donc il n'y a pas d'étape à payer. Les trente autres
 *   conversions `TOKENS → NUMS` soutiennent chacune quelque chose — « cette
 *   lettre vaut 3 », « ce glyphe fait six segments » — et se facturent.
 *
 * ★ **NI L'ACCOLEMENT**, et lui n'est PAS implicite pour autant : il s'écrit
 *   dans les liens, parce que dix opérateurs font `NUMS → NUM` et qu'on ne
 *   peut pas deviner lequel. Ne rien affirmer et ne pas s'écrire sont deux
 *   propriétés distinctes ; voir `config.js › CODES_NON_FACTURES`, qui les
 *   sépare.
 */
const coutRendu = (op) => (op && CODES_NON_FACTURES.includes(op.code) ? 0 : (op.cout || 0));

// ══════════════════════════════════ score partiel (faisceau du BFS)

/**
 * Accumulateurs incrémentaux du score partiel. Les recalculer à chaque
 * extension coûtait ~13 % du temps de recherche : le faisceau crée des dizaines
 * de milliers de préfixes, chacun ne différant du précédent que d'un opérateur.
 */
export function accumulateurInitial(depart) {
  const a = { sommeN: 0, minN: MILLE, prodA: MILLE, sommeE: 0, nbE: 0, cout: 0, nbOps: 0 };
  ajouterNombres(a, depart);
  return a;
}

export function accumuler(parent, op, cible) {
  const n = pourMille(op.notoriete);
  const a = {
    sommeN: parent.sommeN + n,
    minN: n < parent.minN ? n : parent.minN,
    prodA: Math.floor((parent.prodA * (MILLE - pourMille(op.adHoc))) / MILLE),
    sommeE: parent.sommeE,
    nbE: parent.nbE,
    cout: parent.cout + (op.cout || 0),
    nbOps: parent.nbOps + 1,
  };
  ajouterNombres(a, cible);
  return a;
}

function ajouterNombres(a, e) {
  if (e.type === 'NUM') { a.sommeE += elegance1(e.valeur); a.nbE++; } else if (e.type === 'NUMS') {
    for (const x of e.valeur) { a.sommeE += elegance1(x); a.nbE++; }
  }
}

/**
 * Score partiel calculé directement depuis un accumulateur — le chemin d'accès
 * chaud. Le BFS l'appelle une fois par préfixe créé, AVANT de décider si le
 * préfixe mérite d'entrer dans le faisceau ; il ne peut donc pas passer par
 * l'objet chemin (qui n'existe pas encore).
 */
export function scoreDeAcc(a) {
  const N = a.nbOps ? Math.floor((Math.floor(a.sommeN / a.nbOps) + a.minN) / 2) : MILLE;
  const A = a.prodA;
  const E = a.nbE ? Math.floor(a.sommeE / a.nbE) : MILLE;
  const C = critereConcision(a.cout * 3); // ramené à l'échelle des 3 fragments
  return Math.floor(
    (POIDS.notoriete * N + POIDS.antiAdHoc * A + POIDS.elegance * E + POIDS.concision * C)
    / (POIDS.notoriete + POIDS.antiAdHoc + POIDS.elegance + POIDS.concision),
  );
}

/**
 * Score d'un préfixe de chemin — sert au faisceau local par état (§2.2).
 * N'utilise que les critères calculables sur un chemin isolé.
 *
 * Mémoïsé sur l'objet chemin par une AFFECTATION ORDINAIRE, jamais par
 * `Object.defineProperty` : la boucle du BFS crée ~10⁶ préfixes, et un
 * `defineProperty` par préfixe fait basculer chacun d'eux en mode dictionnaire
 * — mesuré à 520 ms sur une phrase de neuf mots, soit un tiers du pipeline.
 * Le champ `_sp` fait partie de la forme déclarée du préfixe (bfs.js), qui
 * reste donc monomorphe.
 */
export function scorePartiel(chemin) {
  if (chemin._sp !== undefined && chemin._sp !== null) return chemin._sp;
  const a = chemin.acc;
  let s;
  if (a) {
    s = scoreDeAcc(a);
  } else {
    const ops = chemin.ops;
    const N = critereNotoriete(ops.length ? ops : [{ notoriete: 1 }]);
    const A = critereAntiAdHoc(ops);
    const E = critereElegance(nombresIntermediaires(chemin));
    const L = ops.reduce((s2, o) => s2 + (o.cout || 0), 0);
    const C = critereConcision(L * 3);
    s = Math.floor(
      (POIDS.notoriete * N + POIDS.antiAdHoc * A + POIDS.elegance * E + POIDS.concision * C)
      / (POIDS.notoriete + POIDS.antiAdHoc + POIDS.elegance + POIDS.concision),
    );
  }
  chemin._sp = s;
  return s;
}

// ══════════════════════════════════ score d'approche (§4.7)

/**
 * @param {Object} approche  {mode, parts:[{fragment, chemin}], resonance}
 * @param {Object} ctx       {saisie, signifiants:{total, masque}, ponderation?}
 * @returns {Object} approche enrichie de {score, criteres, L}
 *
 * ★ **`ctx.ponderation` — LES QUATRE CURSEURS, ou rien du tout.** C'est le
 * résultat de `ponderer()`, et il n'agit QUE s'il se déclare `personnalisee`.
 * Au défaut, `P` vaut `null` et pas une seule des quatre lignes qui le lisent
 * ne change de branche : les poids sont lus dans `POIDS`, le crédit n'est pas
 * repondéré, le rendement passe par sa racine, aucun facteur de quantité ne
 * s'applique. L'invariant du défaut est donc STRUCTUREL — c'est le même code —
 * et non une égalité numérique qu'il faudrait maintenir des deux côtés.
 */
export function noter(approche, ctx) {
  const P = ctx.ponderation && ctx.ponderation.personnalisee ? ctx.ponderation : null;
  const W = P ? P.poids : POIDS;
  const chemins = approche.parts.map((p) => p.chemin);
  const tousOps = [];
  for (const c of chemins) tousOps.push(...c.ops);

  const H = critereHomogeneite(chemins);
  const N = critereNotoriete(tousOps.length ? tousOps : [{ notoriete: 0 }]);
  const { utilises, brut } = couvertureApproche(approche, ctx);
  const U = critereCouverture(utilises, ctx.signifiants ? ctx.signifiants.total : 0);
  const L = longueurRendue(chemins);
  const C = critereConcision(L);
  const A = critereAntiAdHoc(tousOps);
  const nombres = [];
  for (const c of chemins) nombres.push(...nombresIntermediaires(c));
  const E = critereElegance(nombres);

  // base = 100 × Σ(poids·critère) puis ×100 pour les milli-unités : Σ(poids‰ · crit‰)/100
  // …puis ramenée à la part réservée aux critères, pour laisser aux bonus leur
  // propre place dans l'échelle plutôt que de les empiler par-dessus (cf. PART_CRITERES).
  let score = Math.floor(
    (W.homogeneite * H + W.notoriete * N + W.couverture * U
      + W.concision * C + W.antiAdHoc * A + W.elegance * E) / 100,
  );
  score = Math.floor((score * PART_CRITERES[0]) / PART_CRITERES[1]);

  // Le décret est calculé une fois : il conditionne un bonus et un malus.
  const decret = estDecret(approche);

  if (approche.resonance) score += BONUS.resonance;
  if (brut >= MILLE) score += BONUS.couvertureTotale;
  const jokers = tousOps.filter((o) => o.isJoker).length;
  // « Aucune pirouette » ne peut pas se dire d'une approche qui annonce deux de
  // ses trois 6 sans les calculer : le triplement EST la pirouette.
  if (!jokers && !decret && tousOps.every((o) => pourMille(o.adHoc) === 0)) score += BONUS.sansAdHoc;

  // Le malus s'applique UNE FOIS par approche, pas une fois par occurrence :
  // §5.4 fixe le plafond d'une approche jokerisée à « ≈ 45/100 contre ≈ 88 pour
  // une bonne ». Or le joker est appliqué trois fois par construction (une par 6,
  // pour rester homogène) : l'appliquer par occurrence écraserait le score à ~0
  // et rendrait le classement du joker illisible.
  if (jokers) score = Math.floor((score * MALUS.joker[0]) / MALUS.joker[1]);
  const creux = approche.parts.some((p) => nbSignifiants(p.fragment, ctx) < 2);
  if (creux) score = Math.floor((score * MALUS.fragmentCreux[0]) / MALUS.fragmentCreux[1]);
  if (approche.mode === 'LIBRE') score = Math.floor((score * MALUS.modeLibre[0]) / MALUS.modeLibre[1]);
  // Le rendement du groupement — calculé, pas réglé. Voir le pavé ci-dessus.
  // ★ Et PORTÉ PAR L'EXHAUSTIVITÉ quand les curseurs sont personnalisés : le
  //   curseur ne fait que déplacer le tarif entre « gratuit » et « plein »
  //   (`facteurRendement`), qui vaut la racine au cran par défaut.
  const rendement = rendementSix(approche);
  if (rendement !== null) {
    const f = P ? facteurRendement(rendement, P.curseurs.exhaustivite)
      : racineEntiere(rendement * MILLE);
    score = Math.floor((score * f) / MILLE);
  }
  // ★ LE COMPTE DES SÉRIES, porté par la quantité — neutre au défaut, et jamais
  //   au-dessus de ×1,000 (voir `facteurQuantite`). Il vient AVANT l'élégance
  //   pour la même raison que le rendement : ce sont des faits sur la récolte,
  //   pas sur la manière, et la manière se paie en dernier.
  if (P) score = Math.floor((score * facteurQuantite(approche.series || 1, P.curseurs.quantite)) / MILLE);

  // ── ★ L'ÉLÉGANCE DU CHEMIN — le neuvième malus, et le second qui se CALCULE.
  //
  // Les six critères, le rendement et les quatre malus constants se lisent tous
  // sur l'ÉTAT FINAL. Ce que `elegance.js` mesure est d'une autre nature : ce
  // qui se passe PENDANT le calcul — un 666 contigu qu'on défait, un 6 déjà
  // écrit qu'on convertit en 12, une moyenne qui ne tombe pas juste, une lettre
  // arrachée au milieu d'un mot. Voir l'en-tête de ce module-là.
  //
  // ★ Il s'applique en FACTEUR, et le facteur ne dépasse jamais 1 000 : une
  // approche élégante n'est pas récompensée sur le score de conviction, elle est
  // seulement épargnée. C'est la leçon mesurée de l'amendement « les trois rangs
  // de conviction » — un bonus additif se paie sur la réserve et écrase toute
  // l'échelle. Ce que l'élégance rapporte, elle le rapporte dans SON classement
  // (`ordreElegance`), qui lit le crédit brut.
  //
  // ★ `ctx.elegance === false` DÉBRANCHE le facteur — sans débrancher la
  //   mesure. Le bilan est calculé et publié quand même : c'est ce qui permet
  //   au banc d'afficher le classement AVANT et APRÈS le barème sur une seule
  //   exécution, et donc de comparer autre chose qu'un souvenir. Option
  //   explicite, jamais un défaut silencieux — même doctrine que le filet
  //   temporel de `bfs.js`.
  //
  // ★ **Et le crédit se REPONDÈRE quand les curseurs sont personnalisés.** La
  //   quantité et la cohérence pilotent les deux familles de `elegance.js ›
  //   NATURE` — les postes qui paient pour avoir trouvé le motif SOUVENT d'un
  //   côté, ceux qui paient pour la MANIÈRE de l'autre. C'est le mécanisme que
  //   `POIDS_DES_REGIMES` emploie déjà pour ses deux régimes de classement ; ici
  //   il descend sur le SCORE, parce qu'en mode personnalisé il n'y a plus de
  //   régimes — une seule question posée, une seule réponse (voir `index.js`).
  //   Au défaut, `poidsCredit` vaut {1 000, 1 000}, que `pondererAmpleur`
  //   court-circuite : le crédit reste bit à bit celui d'avant.
  const bilan = bilanApproche(approche, ctx);
  const creditG = creditDElegance(bilan, P ? P.poidsCredit : undefined);
  if (ctx.elegance !== false) {
    score = Math.floor((score * facteurDElegance(creditG)) / MILLE);
  }
  // Le décret vient EN DERNIER et se compose avec le joker : l'approche joker
  // est elle-même un décret (le même chemin, trois fois), elle cumule donc les
  // deux facteurs et reste en fond de liste, comme l'exige CONTRACTS §0.4.
  if (decret) score = Math.floor((score * MALUS.decret[0]) / MALUS.decret[1]);

  // `score` est borné à 10 000 comme l'exige §4.7 ; `scoreBrut` conserve la
  // valeur non bornée, indispensable à l'étalonnage des pondérations (§7-1) :
  // avec les poids actuels, les bonus font régulièrement dépasser le plafond, et
  // la saturation gomme les écarts en haut de liste. Voir tests/etalonnage.
  approche.decret = decret;
  approche.scoreBrut = score;
  approche.score = borner(score, 0, 10000);
  // ★ L'élégance est publiée à part du score, parce qu'elle sert à part : c'est
  // la clé du premier des trois classements (`ordreElegance`). `bilan` part
  // avec, pour que le banc de mesure puisse dire POURQUOI une approche perd —
  // un barème qu'on ne peut pas déboguer ne se règle pas.
  approche.elegance = noteDElegance(creditG);
  // ★ Les DEUX AUTRES LECTURES du même bilan — celles des deux premières places
  //   de la liste (voir `POIDS_DES_REGIMES`). Elles sont calculées ICI, une fois
  //   par approche, et non dans les comparateurs : `diversifier` compare toutes
  //   les paires (MMR, §4.8), et un crédit recalculé à chaque comparaison
  //   coûterait un facteur n² sur un barème qui parcourt vingt-six postes.
  //   Même raison que la mémoïsation des signatures de méthode, plus haut.
  //   ★ En mode PERSONNALISÉ, elles ne sont pas calculées : les deux régimes
  //     sont débranchés (`index.js › selectionner` n'est plus appelé), et deux
  //     crédits de plus par approche coûteraient vingt-six postes chacun pour
  //     que personne ne les lise. `eleganceSelon` retombe sur `a.elegance`.
  approche.elegances = P ? null : {
    mixte: approche.elegance,
    elegance: noteDElegance(creditDElegance(bilan, POIDS_DES_REGIMES.elegance)),
    triptyques: noteDElegance(creditDElegance(bilan, POIDS_DES_REGIMES.triptyques)),
  };
  approche.bilan = bilan;
  approche.pur = estPur(bilan);
  approche.criteres = {
    H, N, U, C, A, E, brut, G: approche.elegance,
    ...(rendement === null ? {} : { R: rendement }),
  };
  approche.L = L;
  approche.codes = chemins.map((c) => c.ops.map((o) => o.code).join('+')).join(',');
  return approche;
}

/**
 * Part des valeurs récoltées qui vaut 6, en pour-mille — ou `null` si
 * l'approche ne récolte rien dans un vecteur.
 *
 * Le test est STRUCTUREL et non nominal, pour la même raison que le mode est
 * redéduit de la géométrie plutôt que transporté par l'URL : un lien rejoué doit
 * retrouver exactement le score de la liste dont il est issu.
 *
 * ── Il s'applique désormais aussi à la MOISSON ──────────────────────────────
 * Le rendement mesure ce que les six critères ne voient pas : la part de ce
 * qu'on a calculé qui vaut réellement 6. Un GROUPEMENT n'a qu'un vecteur ; une
 * moisson en a autant que de portées, et la question est la même — récolter
 * quinze 6 sur quinze valeurs (`hope-hope-hope.fr`) n'est pas récolter trois 6
 * parmi dix-sept. On additionne donc les 6 d'un côté, les valeurs de l'autre.
 *
 * Une approche dont toutes les parts finissent sur un `NUM` (résonance,
 * partition, trio libre) rend un rendement de 1 000, c'est-à-dire un facteur
 * neutre : elle n'a rien laissé tomber. Le calcul ne mord que là où il y a du
 * déchet, et c'est exactement ce qu'on lui demande.
 */
/**
 * La largeur à porter au dénominateur du rendement : celle du dernier vecteur,
 * sauf si le chemin ÉCARTE — auquel cas celle du PLUS LARGE.
 * Voir `elegance.js › OPERATEURS_QUI_ECARTENT` et le commentaire ci-dessous.
 */
function largeurDuChemin(chemin, defaut) {
  const ops = (chemin && chemin.ops) || [];
  let ecarte = false;
  for (const o of ops) {
    if (o && o.id && OPERATEURS_QUI_ECARTENT.has(o.id)) { ecarte = true; break; }
  }
  if (!ecarte) return defaut;
  let max = defaut;
  for (const e of (chemin && chemin.etats) || []) {
    if (e && e.type === 'NUMS' && e.valeur.length > max) max = e.valeur.length;
  }
  return max;
}

function rendementSix(approche) {
  const parts = approche.parts;
  if (!parts || !parts.length) return null;
  const cbl = normaliserCible(approche.cible);
  let six = 0;
  let total = 0;
  let unVecteur = false;
  for (const p of parts) {
    const etats = p.chemin && p.chemin.etats;
    const fin = etats && etats[etats.length - 1];
    if (!fin) return null;
    if (fin.type === 'NUM') {
      total += 1;
      if (cbl.alphabet.includes(fin.valeur)) six++;
    } else if (fin.type === 'NUMS' && fin.valeur.length) {
      unVecteur = true;
      // ★ CE QUI ÉCARTE SE FAIT NOTER SUR CE QU'IL A ÉCARTÉ.
      //
      // CONTRACTS §7-5 laisse ouverte la question « le rendement doit-il
      // regarder le vecteur LE PLUS LARGE du chemin, ou le dernier ? ». Le
      // dernier l'emportait, SAUF pour les trois ficelles, et `m36` profitait de
      // l'exception au motif qu'il « rétrécit honnêtement ». L'auteur a tranché
      // dans l'autre sens — « m36 doit être une alternative de secours à mpf, et
      // non l'inverse » —, et la mesure lui donnait raison : sur le même vecteur
      // et pour le même résultat, l'exemption valait 1 700 points d'écart.
      //
      // ⚠️ Mais pour les ficelles qui ÉCARTENT (`mpf`, `m1s2` —
      // `elegance.js › FICELLES_QUI_ECARTENT`), la question ne se pose pas :
      // rétrécir EST leur raison d'être. Celles qui ABSORBENT (`mad`, `mrd`)
      // en sont exclues : elles ne jettent rien, et leur ligne de chiffres
      // momentanément élargie est le calcul MONTRÉ, pas du déchet. Les noter sur ce qu'il reste leur donnait un
      // rendement PARFAIT pour avoir jeté davantage. Mesuré sur « La
      // numérologie est un art taquin » : `fl+tca+m14+mpf` marquait 3 797 contre
      // 2 715 à `fl+tca+m14`, qui montre exactement les mêmes 6 — la ficelle
      // gagnait 1 082 points de conviction en effaçant ses propres déchets, et
      // passait devant la voie honnête dans la liste.
      //
      // On lit donc, pour elles et pour elles seules, le vecteur le plus large
      // du chemin. Ce n'est pas l'arbitrage de §7-5 tranché en douce : c'est le
      // refus d'un rendement qui RÉCOMPENSE le gaspillage.
      total += largeurDuChemin(p.chemin, fin.valeur.length);
      six += indexUtiles(fin.valeur, cbl).length;
    } else return null;
  }
  // Sans vecteur, il n'y a rien à récolter ni rien à jeter : le facteur serait
  // neutre, on n'en fabrique pas un.
  if (!unVecteur || six < cbl.longueur || !total) return null;
  // ★ UN 6 DE TROP N'EST PAS UN 6 GARDÉ.
  //
  // Le verdict compte des séries de trois : sur cinq 6 récoltés, deux tombent
  // avec le reste, et la scène les MONTRE tomber — c'est le même `drop` que
  // pour les valeurs qui ne font pas 6 (`scenario.js › recolterLesSix`). Les
  // porter au crédit du rendement flattait donc le score d'exactement ce qu'il
  // est censé punir : du calcul montré puis écarté. Mesuré sur
  // `https://hope-hope-hope.fr/`, la voie `fc+tca+mx6+mrn` récolte cinq 6 sur
  // treize valeurs — elle affichait 384 pour une scène qui garde trois jetons
  // et en jette dix, c'est-à-dire 230.
  //
  // `series` vient de `deduireMode`, donc de la GÉOMÉTRIE de l'approche, et il
  // est déjà plafonné par `MAX_SERIES` : le rendement reste redéduit, jamais
  // transporté par l'URL (§4.3).
  const gardes = approche.series ? Math.min(six, approche.series * cbl.longueur) : six;
  return borner(Math.floor((gardes * MILLE) / total), 0, MILLE);
}

function intervallesDe(fragment) {
  if (!fragment) return [];
  if (Array.isArray(fragment.intervalles) && fragment.intervalles.length) return fragment.intervalles;
  return [[fragment.offset, fragment.offset + fragment.longueur]];
}

function nbSignifiants(fragment, ctx) {
  if (!fragment) return 0;
  const m = ctx.signifiants && ctx.signifiants.masque;
  if (!m) return fragment.longueur;
  let n = 0;
  for (const [d, f] of intervallesDe(fragment)) {
    for (let i = d; i < f && i < m.length; i++) if (m[i]) n++;
  }
  return n;
}

function couvertureApproche(approche, ctx) {
  const total = ctx.signifiants ? ctx.signifiants.total : 0;
  if (!total) return { utilises: 0, brut: MILLE };
  const masque = ctx.signifiants.masque;
  const vu = new Uint8Array(masque.length);
  for (const p of approche.parts) {
    for (const [d, f] of intervallesDe(p.fragment)) {
      for (let i = d; i < f; i++) if (i >= 0 && i < vu.length) vu[i] = 1;
    }
  }
  let utilises = 0;
  for (let i = 0; i < masque.length; i++) if (masque[i] && vu[i]) utilises++;
  return { utilises, brut: Math.floor((utilises * MILLE) / total) };
}

// ══════════════════════════════════ ordre total (§4.4-1)

/**
 * ── LES TROIS RANGS DE CONVICTION ────────────────────────────────────────────
 *
 * « Côté score pour l'ordre des stratégies, privilégie celle qui donne le plus
 * de séries de 666 sans réutiliser les mêmes caractères, puis les plus simples
 * qui donnent 666, et enfin celles qui réutilisent les mêmes lettres mais de
 * manières différentes pour chacun des 6. » — l'auteur.
 *
 * Trois rangs, et le score ne départage QU'À L'INTÉRIEUR d'un rang :
 *
 *  0. SÉRIES — au moins deux 666, tirés de caractères disjoints. C'est la
 *     quantité de démonstration, et rien d'autre ne l'égale : quinze 6 sur
 *     `hope-hope-hope.fr` valent mieux qu'un 666 parfaitement homogène.
 *  1. SIMPLE — un 666, obtenu honnêtement. Le gros de la liste.
 *  2. CONVERGENCE — la même chaîne relue trois fois. Honnête (les trois 6 sont
 *     calculés), mais les mêmes caractères y servent trois fois : en dernier.
 *
 * ── Pourquoi un rang, et non un bonus de score ──────────────────────────────
 * On a essayé le bonus additif. Pour qu'une moisson à cinq séries (score de
 * critères ≈ 5 900 : trois méthodes différentes, donc H ≈ 0,30) passe devant un
 * groupement homogène à 8 479, il faut ≈ 2 600 milli-unités de bonus, et jusqu'à
 * 3 000 pour six séries. Or les bonus se prélèvent sur la RÉSERVE
 * (`PART_CRITERES`) : ouvrir 3 000 de réserve écrase la part des critères de
 * 0,83 à 0,55, ce qui fait tomber les sept méthodes du README d'un tiers — la
 * méthode 6, mesurée à 48/100, passerait sous le plafond du joker. Le bonus
 * aurait donc acheté la hiérarchie demandée au prix de l'échelle entière.
 *
 * Le rang, lui, ne touche à aucun score : il dit seulement que ces trois
 * questions ne se comparent pas entre elles. Corollaire assumé et VISIBLE : la
 * colonne des scores n'est décroissante qu'à l'intérieur d'un rang. C'est le
 * prix d'une hiérarchie explicite, et il se paie en toutes lettres — le titre de
 * la ligne annonce ses séries (« cinq séries de 666 »), donc le lecteur voit
 * pourquoi elle passe devant.
 */
export const RANG = { SERIES: 0, SIMPLE: 1, CONVERGENCE: 2 };

/**
 * Le rang de conviction d'une approche. Se lit sur le mode et sur le nombre de
 * séries, tous deux redéduits de la géométrie par `deduireMode` — donc stable au
 * rejeu d'une URL.
 */
export function rangConviction(approche) {
  if (!approche) return RANG.SIMPLE;
  if (approche.mode === 'CONVERGENCE') return RANG.CONVERGENCE;
  return (approche.series || 1) >= 2 ? RANG.SERIES : RANG.SIMPLE;
}

/**
 * rang ASC → séries DESC (rang 0) → score DESC → séries DESC → L ASC → codes ASC.
 * Aucun ex æquo ne subsiste.
 *
 * ── Pourquoi les SÉRIES s'intercalent juste sous le score ────────────────────
 * Un GROUPEMENT dont le vecteur porte douze 6 aligne quatre 666 ; celui qui en
 * porte quatre n'en aligne qu'un. Les six critères ne voient pas la différence —
 * même méthode, même couverture, même longueur —, si bien que les deux tombent
 * au même score et que le départage se faisait sur la suite des codes, c'est-à-
 * dire sur rien. Le nombre de 666 réellement produits n'est pas un détail
 * d'affichage : c'est la quantité de démonstration.
 */
export function ordreTotal(a, b) {
  const ra = rangConviction(a);
  const rb = rangConviction(b);
  if (ra !== rb) return ra - rb;
  const sa = a.series || 1;
  const sb = b.series || 1;
  // Au rang des séries, c'est LEUR NOMBRE qui commande, avant le score : c'est
  // la demande de l'auteur, mot pour mot — « le plus de séries de 666 ».
  if (ra === RANG.SERIES && sa !== sb) return sb - sa;
  if (a.score !== b.score) return b.score - a.score;
  if (sa !== sb) return sb - sa;
  if (a.L !== b.L) return a.L - b.L;
  return a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0;
}

/**
 * ★ LE RANG, QUAND LE VISITEUR TIENT LE CURSEUR DE QUANTITÉ.
 *
 * ⚠️ **C'est le seul endroit où les curseurs touchent à un arbitrage de
 * l'auteur, et il faut dire pourquoi.** Le rang des séries est catégoriel : une
 * moisson passe devant un 666 unique quel que soit leur score. Tant que le
 * classement était unique, c'était une hiérarchie ; du jour où le visiteur
 * dispose d'un curseur « quantité », c'en devient un plafond — il peut le
 * pousser à zéro et voir la même moisson en tête, parce qu'un rang ne se
 * pondère pas.
 *
 * MESURÉ, et c'est ce qui a imposé cette fonction : sur les neuf saisies du
 * relevé, le curseur de quantité poussé à 0 ne changeait la tête de liste
 * d'AUCUNE d'entre elles ; sur `hope-hope-hope.fr` comme sur « Le chat dort sur
 * le tapis rouge », la moisson à cinq séries restait première à tous les crans.
 * Un curseur qui ne peut pas bouger ce qu'il nomme est un curseur décoratif.
 *
 * La règle, donc, et son seuil est le cran par DÉFAUT :
 *
 *  · quantité ≥ 100 — le rang tient, et le compte prime le score comme
 *    aujourd'hui. C'est le réglage du site, et quelqu'un qui n'a bougé QUE le
 *    curseur de cohérence n'a rien demandé sur la quantité : sa hiérarchie ne
 *    doit pas changer sous ses pieds.
 *  · quantité < 100 — le rang des séries est REPLIÉ sur le rang simple, et le
 *    compte cesse de primer le score. La préférence de quantité ne disparaît
 *    pas pour autant : elle redescend dans le score, graduellement, par
 *    `facteurQuantite`. C'est exactement ce que « baisser un curseur » doit
 *    vouloir dire — moins, pas plus rien.
 *
 * ★ **La CONVERGENCE, elle, reste dernière à tous les crans.** L'auteur l'a
 * classée là pour une raison qu'aucun compteur ne mesure — « les mêmes
 * caractères y servent trois fois » —, et aucun des quatre curseurs ne nomme
 * cette question. Un curseur ne déplace que ce qu'il nomme.
 */
export function rangPondere(approche, ponderation) {
  if (!approche) return RANG.SIMPLE;
  if (approche.mode === 'CONVERGENCE') return RANG.CONVERGENCE;
  const q = ponderation ? ponderation.curseurs.quantite : CURSEUR_DEFAUT;
  if (q < CURSEUR_DEFAUT) return RANG.SIMPLE;
  return (approche.series || 1) >= 2 ? RANG.SERIES : RANG.SIMPLE;
}

/**
 * ★ L'ORDRE TOTAL du mode personnalisé — `ordreTotal` dont les deux crans de
 * quantité obéissent au curseur.
 *
 * C'est une FABRIQUE : elle rend un comparateur, parce que `Array.sort` n'en
 * accepte pas d'autre argument et qu'une pondération lue dans une variable
 * globale serait exactement le genre d'état caché que §4.4 interdit.
 *
 * ⚠️ Au cran par défaut de la quantité, le comparateur rendu est
 * COMPORTEMENTALEMENT IDENTIQUE à `ordreTotal` : mêmes crans, même ordre,
 * mêmes départages. C'est ce qui permet de bouger un curseur sans toucher à ce
 * que les autres décident.
 *
 * @param {Object} [ponderation]  le résultat de `ponderer`
 * @returns {(a:Object,b:Object)=>number}
 */
export function ordrePondere(ponderation) {
  const q = ponderation ? ponderation.curseurs.quantite : CURSEUR_DEFAUT;
  const compteAvantScore = q >= CURSEUR_DEFAUT;
  return function ordre(a, b) {
    const ra = rangPondere(a, ponderation);
    const rb = rangPondere(b, ponderation);
    if (ra !== rb) return ra - rb;
    const sa = a.series || 1;
    const sb = b.series || 1;
    if (compteAvantScore && ra === RANG.SERIES && sa !== sb) return sb - sa;
    if (a.score !== b.score) return b.score - a.score;
    if (sa !== sb) return sb - sa;
    if (a.L !== b.L) return a.L - b.L;
    return a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0;
  };
}

/**
 * ══════════ ★ LES TROIS RÉGIMES DE PONDÉRATION — « ce n'est pas un tri unique,
 *                et ce n'est pas non plus un crédit unique » ═══════════════════
 *
 * L'auteur constate une incohérence de fond, et il a raison :
 *
 * > « Lors de l'affichage dans la page d'énumération des voies, le premier
 * >  résultat où l'élégance prime […] si l'élégance prime, alors le fait de
 * >  trouver 1 fois ou plusieurs fois le motif ne devrait pas apporter de bonus
 * >  (ou infime : 1 % du poids habituel), c'est vraiment l'élégance qui prévaut
 * >  (dès lors que le motif est trouvé au moins une fois).
 * >  Pour le 2ⁿᵈ résultat, c'est la quantité qui prévaut, l'élégance n'est pas
 * >  négligeable, mais elle pèse 33 % de son poids habituel.
 * >  À partir du 3ᵉ résultat l'hybride actuel me semble bien. »
 *
 * ★ **Le défaut, précisément.** `ordreElegance` compare bien le crédit
 * d'élégance AVANT tout le reste — mais le crédit lui-même paie la QUANTITÉ :
 * `TRIPTYQUE_CONTIGU` (260 par 666 contigu), `TRIPTYQUE_REPETE` (90 par 666
 * suivant du même vecteur) et `SIX_SURNUMERAIRE` (22 par 6 en trop) sont autant
 * de milli-unités qu'une voie encaisse pour avoir trouvé le motif SOUVENT, pas
 * pour l'avoir trouvé BIEN. Une voie qui aligne quatre 666 part donc avec
 * jusqu'à 1 000 milli-unités d'avance sur une voie qui n'en aligne qu'un — et
 * la « première place de l'élégance » se décidait en bonne partie au compte.
 * C'est exactement ce que l'auteur décrit : « une voie plus élégante se fait
 * doubler par une voie qui trouve le motif plus souvent ».
 *
 * ★ **Le remède : repondérer le CRÉDIT, pas réordonner les CRANS.** Le crédit
 * sait désormais dire, poste par poste, s'il mesure la quantité ou la manière
 * (`elegance.js › NATURE`). Chaque régime en demande donc sa propre lecture :
 *
 *  · `elegance`   — quantité à **1 %**, élégance à 100 %. C'est le « ou infime :
 *                   1 % du poids habituel » de l'auteur, pris au mot. Le motif
 *                   trouvé quatre fois rapporte encore 10 milli-unités là où il
 *                   en rapportait 1 040 : de quoi départager deux voies
 *                   par ailleurs identiques, jamais de quoi en renverser une.
 *  · `triptyques` — quantité à 100 %, élégance à **33 %**. « L'élégance n'est
 *                   pas négligeable, mais elle pèse 33 % de son poids
 *                   habituel » : elle continue de trancher entre deux voies au
 *                   même compte, avec le tiers de sa force.
 *  · le mixte     — les deux à 100 %, c'est-à-dire le crédit tel quel. « À
 *                   partir du 3ᵉ résultat l'hybride actuel me semble bien. »
 *
 * ★ **« Dès lors que le motif est trouvé au moins une fois » est une condition
 * STRUCTURELLE, pas un `if`.** Une approche qui n'atteint pas la cible n'entre
 * pas dans la liste : `assembler` ne la fabrique pas, et `series` vaut au
 * minimum 1 partout (`rangConviction` le lit d'ailleurs avec `|| 1`). Écrire
 * ici une branche « si le motif n'est pas trouvé, poids plein » serait du code
 * mort qu'aucune mesure ne pourrait jamais atteindre. La condition est donc
 * dite, et non codée.
 *
 * ★ **Ce que les régimes ne touchent PAS : le score de conviction.** Le facteur
 * `facteurDElegance` continue de lire le crédit PLEIN — c'est lui qui redescend
 * sur le score, et le score doit rester le même quel que soit le cran où la
 * ligne finit par s'afficher. Un régime ne sert qu'à CLASSER.
 */
export const POIDS_DES_REGIMES = Object.freeze({
  /** 1ʳᵉ place — l'élégance prime ; la quantité ne pèse que 1 % (10 ‰ de 1 000). */
  elegance: Object.freeze({ quantite: 10, elegance: 1000 }),
  /** 2ᵈ place — la quantité prime ; l'élégance pèse 33 % (330 ‰ de 1 000). */
  triptyques: Object.freeze({ quantite: 1000, elegance: 330 }),
});

/**
 * La note d'élégance à lire pour un régime donné.
 *
 * Le repli sur `a.elegance` n'est pas de la prudence gratuite : `ordreElegance`
 * et `ordreTriptyques` sont exportés, et des tests les appellent sur des
 * approches montées à la main. Une approche sans régimes se compare alors comme
 * avant, ce qui est le comportement le moins surprenant.
 */
/**
 * ★ **CE QUE « LA PLUS ÉLÉGANTE » VEUT DIRE — et ce qu'il y manquait.**
 *
 * > « Entre l'élégance de la concision et le bonus de quantité, ajuste les
 * >   barèmes pour que l'élégance fasse vraiment primer la concision et
 * >   l'utilisation d'un maximum de caractères (ou la suppression d'un minimum
 * >   d'entre eux). » (l'auteur)
 *
 * Le comparateur de la 1ʳᵉ place lisait le CRÉDIT d'élégance, et lui seul. Or le
 * crédit récompense ce qu'une voie fait de PROPRE — pas de ficelle, pas de
 * valeur jetée sans motif —, et il ne dit rien de sa LONGUEUR ni de ce qu'elle
 * laisse tomber de la saisie. Ces deux-là vivaient dans le score général, que
 * le comparateur ne consultait qu'en tout dernier recours, après le crédit,
 * après le compte de séries et après la pureté. Mesuré sur « Donald Trump » :
 * la voie de tête employait huit étapes et abandonnait 12 % de la saisie,
 * pendant que quatre voies de quatre étapes couvrant TOUT attendaient derrière.
 *
 * ★ **MULTIPLICATIF, ET NON ADDITIF.** Un terme ajouté aurait demandé un poids,
 *   donc un troisième réglage à étalonner. Un facteur pose la question
 *   autrement, et plus juste : le crédit dit ce que la voie vaut, les deux
 *   autres disent quelle PART de cette valeur survit à ce qu'elle a coûté.
 *
 * ★ **CE QUI PÈSE EST L'USAGE DE LA SAISIE, ET NON LA BRIÈVETÉ.** La première
 *   version prenait la concision en facteur, et l'auteur l'a corrigée sur un cas
 *   qu'il a démonté lui-même :
 *
 *   > « Elle ne jette que le `.` et se sert de tout le reste, ce qui compense la
 *   >   longueur légèrement plus importante. L'autre voie, avec `fl`, jette
 *   >   `- - .` soit 3 caractères, puis en jette 5 et 7 à la fin. […] Même si
 *   >   l'autre est courte et que les jetés/filtrés le sont de manière propre,
 *   >   ça ne doit pas compenser l'usage maximal de la saisie utilisateur. Elle
 *   >   est à récompenser autant que possible. » (l'auteur)
 *
 *   Le mérite lit donc la COUVERTURE — quelle part de la saisie signifiante
 *   entre dans la démonstration — ET le RENDEMENT — quelle part de ce qu'on
 *   calcule finit par servir. Les deux disent « ce qui est pris est employé »,
 *   à deux endroits de la chaîne : à l'entrée et à la sortie. Mesuré sur le cas
 *   de l'auteur : `fl+tca+m14` calcule quatorze valeurs pour en garder douze
 *   (rendement 857), la voie groupée en calcule quinze et les garde toutes
 *   (1 000) — la mesure disait déjà ce qu'il décrit, le mérite ne l'écoutait
 *   pas.
 *
 * ★ **ET LA CONCISION N'A PAS DISPARU** : elle reste un des six critères, avec
 *   son poids, dans `a.score` — que ce comparateur consulte plus bas. Ce qui
 *   change est son rang : elle départage, elle ne commande plus. C'est
 *   exactement « ça ne doit pas compenser ».
 *
 * ★ **LE SOCLE.** Une voie sans crédit — il y en a, et de très courtes —
 *   vaudrait zéro quoi qu'elle fasse, et le facteur ne trancherait rien entre
 *   elles. Le socle leur rend la couverture et le rendement pour seuls juges,
 *   ce qui est bien ce qu'on veut d'une voie qui n'a rien d'autre à faire
 *   valoir.
 */
const SOCLE_ELEGANCE = 1000;

const meriteDElegance = (a) => {
  const c = (a && a.criteres) || {};
  const credit = eleganceSelon(a, 'elegance') + SOCLE_ELEGANCE;
  const couverture = c.U === undefined ? MILLE : c.U;
  // Le rendement n'existe que là où il y a du déchet à mesurer : absent, il
  // vaut neutre — la voie n'a rien laissé tomber.
  const rendement = c.R === undefined || c.R === null ? MILLE : c.R;
  return Math.floor((credit * couverture * rendement) / (MILLE * MILLE));
};

const eleganceSelon = (a, regime) => {
  const r = a && a.elegances;
  const v = r && r[regime];
  return v === undefined || v === null ? ((a && a.elegance) ?? 0) : v;
};

/**
 * ══════════════ ★ LES TROIS CLASSEMENTS — « ce n'est pas un tri unique » ══════
 *
 * « 1ʳᵉ suggestion — l'élégance. Mieux vaut une méthode élégante qui donne pile
 *  666 qu'une méthode peu élégante qui donne davantage de 6. Mais si une
 *  stratégie élégante — sans malus autre que d'exclure des blocs entiers séparés
 *  par espace ou ponctuation et de moins de 3 lettres initialement — permet de
 *  tomber juste sur plusieurs triptyques de 666, c'est encore mieux.
 *  2ᵈ suggestion — le nombre de triptyques, au prix d'une élégance éventuellement
 *  moindre, sans l'ignorer.
 *  3ᵉ et suivantes — un mixte pondéré des deux, comme aujourd'hui. » — l'auteur.
 *
 * Trois questions, trois réponses, et elles ne se comparent pas entre elles :
 * c'est une SÉLECTION À OBJECTIFS MULTIPLES, pas un tri de plus. `index.js`
 * réserve la première place au champion de l'élégance, la seconde au champion des
 * triptyques — quand il en offre réellement davantage —, et laisse le MMR (§4.8)
 * garnir le reste par `ordreTotal`, qui est le mixte.
 *
 * ★ **Les trois gardent le RANG DE CONVICTION comme clé primaire.** L'auteur ne
 * l'a pas remis en cause, et il dit autre chose que l'élégance : « le plus de
 * séries sur caractères disjoints, puis les 666 ordinaires, puis ceux qui
 * relisent trois fois les mêmes lettres ». Une convergence très élégante n'a pas
 * à passer devant une moisson : elle répond à une question que l'auteur a déjà
 * classée dernière.
 */

/**
 * ★ 1ʳᵉ SUGGESTION — l'élégance.
 *
 * rang ASC → élégance DESC → séries DESC → pureté DESC → score DESC →
 * L ASC → codes ASC.
 *
 * ★ **« Encore mieux » est ADDITIF, pas catégoriel — et c'est une MESURE qui
 * l'impose.** « Si une stratégie élégante — sans malus autre que d'exclure des
 * blocs entiers […] de moins de 3 lettres — permet de tomber juste sur
 * plusieurs triptyques de 666, c'est encore mieux » (l'auteur). Une première
 * version en faisait une CATÉGORIE : toute stratégie pure à deux séries ou plus
 * passait devant, avant même de comparer les crédits.
 *
 * Mesuré, cette lecture-là casse un cas de référence. Sur
 * `https://hope-hope-hope.fr/`, « on ne garde que les lettres, une par une, en
 * quatorze segments » appliqué au motif `hope-hope-hope` est PUR au sens exact
 * de la phrase — il n'écarte que la ponctuation, le protocole (gratuit) et le
 * bloc `fr`, long de deux lettres — et il aligne quatre 666. Il passait donc
 * devant la moisson à SIX séries, et la liste annonçait quatre séries là où six
 * existaient. Or l'auteur demande six.
 *
 * La contradiction n'en est pas une, et sa phrase précédente le dit : « mieux
 * vaut une méthode élégante […] qu'une méthode PEU élégante qui donne davantage
 * de 6 ». La moisson à six séries n'est pas peu élégante — c'est le crédit le
 * plus haut de sa liste (1 757). La règle ne s'appliquait donc pas ; c'est la
 * catégorie qui la faisait s'appliquer de force.
 *
 * « Encore mieux » se paie désormais dans le CRÉDIT, où plusieurs triptyques
 * rapportent (`TRIPTYQUE_CONTIGU`, `SIX_SURNUMERAIRE`,
 * `SOLDE_MULTIPLE_DE_TROIS`) et où la pureté vaut par tout ce qu'elle ne perd
 * pas. Deux mérites qui s'ajoutent, comparables l'un à l'autre — au lieu d'un
 * mérite qui écrase l'autre sans le regarder.
 *
 * ★ **LE RANG DES SÉRIES ET LE RANG SIMPLE SONT MIS À ÉGALITÉ ICI — et
 * seulement ici.** « Mieux vaut une méthode élégante qui donne pile 666 qu'une
 * méthode peu élégante qui donne davantage de 6 » : cette phrase dit
 * exactement que, dans CE classement-là, un 666 unique a le droit de passer
 * devant une moisson. Les maintenir séparés rendait la première suggestion
 * identique à la seconde partout où une moisson existe — mesuré : sur les
 * trente-trois saisies du banc, la seconde suggestion ne se distinguait
 * JAMAIS de la première, c'est-à-dire qu'elle était du code mort.
 *
 * ★ **La CONVERGENCE, elle, reste en dernier.** Elle répond à une question que
 * l'auteur a classée dernière pour une raison que ce barème ne sait pas
 * mesurer : « les mêmes caractères y servent trois fois ». Aucun compteur ne
 * voit cela — le bilan lit un chemin à la fois, pas le recouvrement des
 * portées —, et lui laisser prendre la tête au nom d'une élégance qui ignore
 * précisément son défaut serait mesurer à côté. Le rang est donc replié en
 * deux crans : « ce qui démontre sur des caractères qu'on n'a pas réemployés »,
 * et « le reste ».
 *
 * ★ Et les SÉRIES tranchent avant le score, à élégance égale. Mesuré : sur
 * `https://hope-hope-hope.fr/`, la moisson à six séries et celle à cinq ont
 * exactement le même crédit (1 757) ; sans ce cran, c'est la moins fournie qui
 * menait, parce qu'elle a un meilleur score de conviction.
 */
export function ordreElegance(a, b) {
  // Le rang, replié : SÉRIES et SIMPLE à égalité, CONVERGENCE en dernier.
  const ra = rangConviction(a) === RANG.CONVERGENCE ? 1 : 0;
  const rb = rangConviction(b) === RANG.CONVERGENCE ? 1 : 0;
  if (ra !== rb) return ra - rb;
  // ★ Le crédit lu au régime de la PREMIÈRE PLACE : la quantité y pèse 1 % de
  //   son poids habituel (`POIDS_DES_REGIMES.elegance`). Sans cette lecture-là,
  //   « le champion de l'élégance » désignait pour une bonne part le champion du
  //   COMPTE, puisque le crédit paie chaque 666 contigu 260 milli-unités.
  const ea = meriteDElegance(a);
  const eb = meriteDElegance(b);
  if (ea !== eb) return eb - ea;
  const sa = a.series || 1;
  const sb = b.series || 1;
  // ★ Le compte reste un cran, et il ne l'est plus que d'une façon INFIME — au
  //   sens exact du mot chez l'auteur : il ne départage plus que deux voies dont
  //   les crédits repondérés tombent à la milli-unité près. Il ne peut donc plus
  //   renverser une différence d'élégance, si petite soit-elle. Le supprimer
  //   tout à fait rendrait la comparaison muette là où elle a déjà été mesurée
  //   utile — sur `https://hope-hope-hope.fr/`, deux moissons de crédit
  //   rigoureusement égal, l'une à six séries, l'autre à cinq.
  if (sa !== sb) return sb - sa;
  // À crédit et à compte égaux, la stratégie sans reproche passe devant : c'est
  // le dernier endroit où la phrase de l'auteur peut encore trancher, et elle y
  // tranche sans pouvoir renverser une mesure.
  const pa = Boolean(a.pur);
  const pb = Boolean(b.pur);
  if (pa !== pb) return pa ? -1 : 1;
  if (a.score !== b.score) return b.score - a.score;
  if (a.L !== b.L) return a.L - b.L;
  return a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0;
}

/**
 * ★ 2ᵈ SUGGESTION — le nombre de triptyques, « sans ignorer » l'élégance.
 *
 * rang ASC → séries DESC → élégance DESC → score DESC → L ASC → codes ASC.
 *
 * L'élégance vient juste après le compte, et avant le score : c'est le « sans
 * l'ignorer » de l'auteur. À nombre de séries égal, entre deux façons d'obtenir
 * le même compte, on prend la plus élégante — pas la mieux notée.
 */
export function ordreTriptyques(a, b) {
  const ra = rangConviction(a);
  const rb = rangConviction(b);
  if (ra !== rb) return ra - rb;
  const sa = a.series || 1;
  const sb = b.series || 1;
  if (sa !== sb) return sb - sa;
  // ★ Le crédit lu au régime de la SECONDE PLACE : l'élégance y pèse 33 % de
  //   son poids habituel (`POIDS_DES_REGIMES.triptyques`), la quantité reste au
  //   plein tarif. Concrètement, deux effets, et les deux sont voulus :
  //    · les écarts d'élégance se resserrent au tiers, donc l'élégance tranche
  //      moins souvent et le SCORE de conviction décide plus souvent — « elle
  //      n'est pas négligeable », pas « elle décide » ;
  //    · les malus de manière se resserrent au tiers eux aussi. C'est la
  //      contrepartie assumée du « au prix d'une élégance éventuellement
  //      moindre » : cette place-là accepte de payer en manière ce qu'elle
  //      gagne en compte. Ce qu'elle n'accepte pas, ce sont les FICELLES, et
  //      c'est `index.js › selectionner` qui les en écarte — au vu des
  //      compteurs, pas du crédit, donc sans que la repondération y puisse rien.
  const ea = eleganceSelon(a, 'triptyques');
  const eb = eleganceSelon(b, 'triptyques');
  if (ea !== eb) return eb - ea;
  if (a.score !== b.score) return b.score - a.score;
  if (a.L !== b.L) return a.L - b.L;
  return a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0;
}

// ══════════════════════════════════ N4 — diversité (MMR)

/**
 * Sélection gloutonne avec pénalité de redondance.
 * C'est ce mécanisme qui montre « lettres+voyelles » ET « A1Z26 » ET
 * « AZERTY+retournement du 9 » plutôt que cinq variantes de comptage de voyelles.
 *
 * ── Le MMR CHOISIT, il ne CLASSE PAS. ────────────────────────────────────
 * La sélection gloutonne rendait sa liste dans l'ordre où elle avait pioché,
 * c'est-à-dire par score AJUSTÉ décroissant. À l'écran, cela donnait une suite
 * de scores 9 012, 8 970, 7 930, … puis 8 992 au huitième rang : un tri qui a
 * l'air cassé. Or l'ordre de pioche ne veut rien dire — ce que le §4.8 demande
 * au MMR, c'est de décider QUI figure dans les douze, pas dans quel ordre.
 * On rend donc la sélection triée par `ordreTotal` (le score de conviction,
 * §4.4-1) : la diversité fait toujours son travail, et la colonne des scores
 * redevient décroissante. `scoreAjuste` reste posé sur chaque approche, pour
 * qui veut voir ce que la pénalité de redondance a coûté.
 */
export function diversifier(approches, options = {}) {
  const lambda = options.lambda ?? REGLAGES.LAMBDA_MMR;
  const maxParMappeur = options.maxParMappeur ?? REGLAGES.MAX_PAR_MAPPEUR;
  const limite = options.limite ?? REGLAGES.MAX_APPROCHES;
  // ★ `options.ponderation` — LE BARÈME DU VISITEUR. Le MMR choisit et classe
  //   avec le même ordre que le reste de la liste : lui laisser `ordreTotal`
  //   pendant que la liste est triée autrement ferait piocher les douze selon
  //   une hiérarchie que personne n'a demandée. Au défaut — ou sans pondération
  //   — la fabrique rend un comparateur qui se comporte comme `ordreTotal`, et
  //   on prend `ordreTotal` lui-même pour que rien ne change du tout.
  const P = options.ponderation && options.ponderation.personnalisee ? options.ponderation : null;
  const ordre = P ? ordrePondere(P) : ordreTotal;
  const rangDe = P ? (a) => rangPondere(a, P) : rangConviction;
  const compteAvantScore = !P || P.curseurs.quantite >= CURSEUR_DEFAUT;

  const restants = approches.slice().sort(ordre);
  // ★ L'AMORCE — les approches déjà retenues AILLEURS, que la sélection doit
  //   connaître sans les reprendre. Les deux premières places de la liste sont
  //   réservées aux champions de l'élégance et des triptyques (voir les trois
  //   classements ci-dessus) ; si le MMR les ignorait, il rechoisirait leur
  //   mappeur et leur méthode, et la diversité qu'il existe pour produire
  //   s'évaporerait sur les deux premières lignes. Elles entrent donc dans le
  //   quota de mappeur ET dans la pénalité de redondance, sans figurer dans le
  //   résultat : c'est le §4.8 appliqué à une liste dont on n'a pas choisi la
  //   tête, et non une exception qu'on lui ferait.
  const amorce = options.amorce || [];
  const choisis = [];
  const compteMappeur = new Map();
  for (const a of amorce) {
    const m = mappeurApproche(a);
    if (m) compteMappeur.set(m, (compteMappeur.get(m) || 0) + 1);
  }

  while (restants.length && choisis.length < limite) {
    let meilleur = -1;
    let meilleurScore = -Infinity;
    for (let i = 0; i < restants.length; i++) {
      const a = restants[i];
      const m = mappeurApproche(a);
      if (m && (compteMappeur.get(m) || 0) >= maxParMappeur) continue;
      let redondance = 0;
      for (const s of choisis) {
        const h = similariteApproches(a, s);
        if (h > redondance) redondance = h;
      }
      for (const s of amorce) {
        const h = similariteApproches(a, s);
        if (h > redondance) redondance = h;
      }
      // λ × h ramené à l'échelle du score (0..10000)
      const ajuste = a.score - Math.floor((lambda * redondance) / 100);
      // ★ La pénalité de redondance joue À L'INTÉRIEUR d'un rang, jamais entre
      // deux rangs. Sans ce garde-fou, la sélection gloutonne repartait du score
      // brut et remettait la hiérarchie à plat : sur `hope-hope-hope.fr`, les
      // deux groupements quatorze segments épuisaient le quota du mappeur
      // (MAX_PAR_MAPPEUR) avant que la moisson à cinq séries n'ait été
      // regardée — le mode le mieux classé n'atteignait jamais la liste.
      if (meilleur < 0
        || plusConvaincant(a, ajuste, restants[meilleur], meilleurScore,
          rangDe, compteAvantScore, ordre)) {
        meilleurScore = ajuste;
        meilleur = i;
      }
    }
    if (meilleur < 0) break; // tous bloqués par la contrainte de mappeur
    const a = restants.splice(meilleur, 1)[0];
    a.scoreAjuste = meilleurScore;
    choisis.push(a);
    const m = mappeurApproche(a);
    if (m) compteMappeur.set(m, (compteMappeur.get(m) || 0) + 1);
  }
  return choisis.sort(ordre);
}

/**
 * Le même ordre que le comparateur en vigueur, mais sur des scores AJUSTÉS par
 * la pénalité de redondance : le rang de conviction d'abord, le nombre de
 * séries ensuite, puis seulement le score ajusté.
 *
 * ⚠️ Les trois derniers arguments viennent de `diversifier` et disent QUEL
 * classement est en vigueur. Ils sont passés plutôt que relus dans une variable
 * de module : cette fonction est appelée une fois par paire candidate, et un
 * état global la rendrait dépendante de l'ordre des appels — l'inverse de ce
 * que §4.4 demande.
 */
function plusConvaincant(a, ajusteA, b, ajusteB, rangDe, compteAvantScore, ordre) {
  const ra = rangDe(a);
  const rb = rangDe(b);
  if (ra !== rb) return ra < rb;
  if (compteAvantScore && ra === RANG.SERIES) {
    const sa = a.series || 1;
    const sb = b.series || 1;
    if (sa !== sb) return sa > sb;
  }
  if (ajusteA !== ajusteB) return ajusteA > ajusteB;
  return ordre(a, b) < 0;
}

export function mappeurApproche(approche) {
  for (const p of approche.parts) {
    const m = mappeurPrincipal(p.chemin);
    if (m) return m;
  }
  return null;
}

function similariteApproches(a, b) {
  let somme = 0;
  const n = Math.min(a.parts.length, b.parts.length);
  if (!n) return 0;
  for (let i = 0; i < n; i++) somme += similarite(a.parts[i].chemin, b.parts[i].chemin);
  return Math.floor(somme / n);
}
