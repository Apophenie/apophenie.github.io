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
 * l'écart (`f9+t1+m5+mt` sur `https://hope-hope-hope.fr/` annonçait 384 pour
 * une scène qui garde trois jetons et en jette dix, soit 230).
 */

export const REGLAGES = {
  L_IDEAL: 9,                    // 3 fragments × 3 étapes
  CONCISION_DECROISSANCE: [88, 100], // C = 0,88 ^ max(0, L − L*)
  // Exposant de couverture 1,5 — implémenté en entier via une racine entière.
  PALIERS_HOMOGENEITE: { memeMethodeEtFiltres: 1000, memeMethode: 900, memeMappeur: 600, memeFamille: 300, sinon: 50 },
  ELEGANCE: { petit: 1000, moyen: 850, grand: 650, enorme: 350, penaliteNegatif: [85, 100], bonusRemarquable: 100 },
  NOMBRES_REMARQUABLES: [7, 11, 13, 22, 33, 42, 44, 66, 99, 101, 666],
  LAMBDA_MMR: 350,               // pour-mille — pénalité de redondance du N4
  MAX_PAR_MAPPEUR: 2,
  MAX_APPROCHES: 12,
  MAX_FRAGMENTS: 24,
};

// ══════════════════════════════════ arithmétique entière

const MILLE = 1000;

/** Longueur d'une série. Le 666 du titre, et rien d'autre (`assemblage.js`). */
const SERIE = 3;

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
  // taille du vecteur, pas son contenu : `t1+m3+c7` et `t1+m7+c7` annoncent la
  // numérologie pythagoricienne et le Scrabble anglais, et comptent tous deux
  // les lettres. Trois « manières » ainsi bâties n'en font qu'une, et c'est
  // exactement le genre de fausse diversité que la convergence doit refuser.
  // Le typage empêche N3 de retirer le mappeur inerte (`m3` est TOKENS→NUMS,
  // `c7` est NUMS→NUM) : c'est donc ici qu'on le débusque.
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
  for (let i = 0; i < prefixe; i++) L += premier[i].cout || 0;
  for (const c of chemins) for (let i = prefixe; i < c.ops.length; i++) L += c.ops[i].cout || 0;
  return L;
}

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
 * @param {Object} ctx       {saisie, signifiants:{total, masque}}
 * @returns {Object} approche enrichie de {score, criteres, L}
 */
export function noter(approche, ctx) {
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
    (POIDS.homogeneite * H + POIDS.notoriete * N + POIDS.couverture * U
      + POIDS.concision * C + POIDS.antiAdHoc * A + POIDS.elegance * E) / 100,
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
  const rendement = rendementSix(approche);
  if (rendement !== null) score = Math.floor((score * racineEntiere(rendement * MILLE)) / MILLE);
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
  approche.criteres = { H, N, U, C, A, E, brut, ...(rendement === null ? {} : { R: rendement }) };
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
function rendementSix(approche) {
  const parts = approche.parts;
  if (!parts || !parts.length) return null;
  let six = 0;
  let total = 0;
  let unVecteur = false;
  for (const p of parts) {
    const etats = p.chemin && p.chemin.etats;
    const fin = etats && etats[etats.length - 1];
    if (!fin) return null;
    if (fin.type === 'NUM') {
      total += 1;
      if (fin.valeur === 6) six++;
    } else if (fin.type === 'NUMS' && fin.valeur.length) {
      unVecteur = true;
      total += fin.valeur.length;
      for (const x of fin.valeur) if (x === 6) six++;
    } else return null;
  }
  // Sans vecteur, il n'y a rien à récolter ni rien à jeter : le facteur serait
  // neutre, on n'en fabrique pas un.
  if (!unVecteur || six < 3 || !total) return null;
  // ★ UN 6 DE TROP N'EST PAS UN 6 GARDÉ.
  //
  // Le verdict compte des séries de trois : sur cinq 6 récoltés, deux tombent
  // avec le reste, et la scène les MONTRE tomber — c'est le même `drop` que
  // pour les valeurs qui ne font pas 6 (`scenario.js › recolterLesSix`). Les
  // porter au crédit du rendement flattait donc le score d'exactement ce qu'il
  // est censé punir : du calcul montré puis écarté. Mesuré sur
  // `https://hope-hope-hope.fr/`, la voie `f9+t1+m5+mt` récolte cinq 6 sur
  // treize valeurs — elle affichait 384 pour une scène qui garde trois jetons
  // et en jette dix, c'est-à-dire 230.
  //
  // `series` vient de `deduireMode`, donc de la GÉOMÉTRIE de l'approche, et il
  // est déjà plafonné par `MAX_SERIES` : le rendement reste redéduit, jamais
  // transporté par l'URL (§4.3).
  const gardes = approche.series ? Math.min(six, approche.series * SERIE) : six;
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

  const restants = approches.slice().sort(ordreTotal);
  const choisis = [];
  const compteMappeur = new Map();

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
      // λ × h ramené à l'échelle du score (0..10000)
      const ajuste = a.score - Math.floor((lambda * redondance) / 100);
      // ★ La pénalité de redondance joue À L'INTÉRIEUR d'un rang, jamais entre
      // deux rangs. Sans ce garde-fou, la sélection gloutonne repartait du score
      // brut et remettait la hiérarchie à plat : sur `hope-hope-hope.fr`, les
      // deux groupements quatorze segments épuisaient le quota du mappeur
      // (MAX_PAR_MAPPEUR) avant que la moisson à cinq séries n'ait été
      // regardée — le mode le mieux classé n'atteignait jamais la liste.
      if (meilleur < 0 || plusConvaincant(a, ajuste, restants[meilleur], meilleurScore)) {
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
  return choisis.sort(ordreTotal);
}

/**
 * Le même ordre que `ordreTotal`, mais sur des scores AJUSTÉS par la pénalité
 * de redondance : le rang de conviction d'abord, le nombre de séries ensuite,
 * puis seulement le score ajusté.
 */
function plusConvaincant(a, ajusteA, b, ajusteB) {
  const ra = rangConviction(a);
  const rb = rangConviction(b);
  if (ra !== rb) return ra < rb;
  if (ra === RANG.SERIES) {
    const sa = a.series || 1;
    const sb = b.series || 1;
    if (sa !== sb) return sa > sb;
  }
  if (ajusteA !== ajusteB) return ajusteA > ajusteB;
  return ordreTotal(a, b) < 0;
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
