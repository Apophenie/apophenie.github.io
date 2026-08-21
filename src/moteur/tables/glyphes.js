/**
 * ★ Définition vectorielle des 52 glyphes — format normatif CONTRACTS §2.4.
 *
 * **Règle structurelle du projet (CONTRACTS §0.3) :** les tables `traits`,
 * `extremites` et `boucles` ne sont *pas* saisies à la main, elles sont
 * **calculées** depuis ce fichier (`derivees.js`). Le moteur visuel dessine ces
 * mêmes sous-chemins (`countStrokes`, `src/visuel/glyphes.js`) : ce que le
 * spectateur voit est donc littéralement ce qui a été compté.
 *
 * ## Repère
 *
 * Grille normalisée, **origine en bas à gauche, y vers le haut** :
 * `0..400` en largeur, `0..600` en hauteur de capitale. Les bas de casse
 * utilisent `0..400` pour la hauteur d'x, montent à `600` pour les hampes
 * (b d f h k l t) et descendent jusqu'à `-160` pour les jambages (g j p q y).
 *
 * ## Format
 *
 * ```js
 * 'A': { traits: [ { d: 'M 20 0 L 200 600', ouvert: true }, … ],
 *        jonctions: [ [0, 1, 'sommet'], [0, 2], [1, 2] ] }
 * ```
 *
 * - `traits.length` → **nombre de traits de crayon** ;
 * - **extrémité libre** = extrémité d'un sous-chemin **ouvert** qui ne touche
 *   (à `TOLERANCE` près) aucun sous-chemin déclaré partenaire dans `jonctions` ;
 * - **boucle** = sous-chemin fermé, plus tout cycle du graphe des `jonctions`.
 *
 * Une `jonction` déclare **un point de contact** : deux traits qui se touchent
 * en deux endroits (le fût et la panse du B) sont déclarés **deux fois**, ce qui
 * ferme un cycle et compte donc une boucle. Le troisième élément est un libellé
 * libre, ignoré du calcul.
 *
 * Une jonction déclarée mais **géométriquement fausse** ne lie rien : le calcul
 * vérifie le contact réel. Impossible, donc, de « corriger » un comptage en
 * trichant sur les jonctions — il faut redessiner.
 *
 * ## Conventions de tracé imposées (research §3.4, reprises par CONTRACTS §2.4)
 *
 * Capitale bâton géométrique sans empattement (type Futura / Century Gothic) :
 *
 * - `A` **pointu** (deux diagonales + barre), pas de sommet plat ;
 * - `I` **sans empattement** : une simple verticale → 1 trait, 2 extrémités ;
 * - `a` et `g` **à un seul étage** (cercle + fût) ;
 * - `Q` à queue **tangente** au cercle (elle ne le traverse pas) → 1 extrémité ;
 * - `W` (et `w`) tracés en **4 traits** (zigzag), pas en deux `V` ;
 * - `J` **sans barre supérieure** ;
 * - les points du `i` et du `j` **comptent** : un sous-chemin dégénéré
 *   (`M x y L x y`, rendu par un `stroke-linecap: round`) vaut **1 trait et
 *   1 extrémité** — un point n'a qu'une extrémité.
 *
 * Deux conventions ajoutées ici, nécessaires pour retrouver les comptages de
 * référence, et parfaitement visibles à l'écran :
 *
 * - **`M` et `N` : les fûts dépassent la jonction des diagonales** (les
 *   diagonales naissent 45 unités sous le sommet du fût). Les quatre pointes
 *   de ces deux lettres sont donc réellement visibles — c'est ce qui est
 *   compté, et c'est ce qui est dessiné ;
 * - **`m` et `n` : l'arche naît au sommet du fût** (le fût s'arrête où l'épaule
 *   commence), construction uniforme des lettres à arche (`h`, `m`, `n`, `r`).
 */

/** Tolérance de contact, en unités de grille (identique à `src/visuel/glyphes.js`). */
export const TOLERANCE = 6;

/** Hauteurs de référence de la grille. */
export const METRIQUES = Object.freeze({
  capitale: 600,
  hauteurX: 400,
  hampe: 600,
  jambage: -160,
  largeur: 400,
});

const t = (d, ouvert = true) => ({ d, ouvert });
const ferme = (d) => ({ d, ouvert: false });

/** Ellipse fermée, sens trigonométrique, en deux demi-arcs. */
const ovale = (cx, cy, rx, ry) => ferme(
  `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`,
);

const G = {
  // ─── CAPITALES ────────────────────────────────────────────────────────────
  A: {
    traits: [t('M 20 0 L 200 600'), t('M 200 600 L 380 0'), t('M 80 200 L 320 200')],
    jonctions: [[0, 1, 'sommet'], [0, 2, 'barre gauche'], [1, 2, 'barre droite']],
  },
  B: {
    traits: [
      t('M 60 0 L 60 600'),
      t('M 60 600 A 250 150 0 0 0 60 300'),
      t('M 60 300 A 270 150 0 0 0 60 0'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille'], [0, 2, 'taille'], [0, 2, 'bas']],
  },
  C: { traits: [t('M 326 501 A 170 300 0 1 1 326 99')], jonctions: [] },
  D: {
    traits: [t('M 60 0 L 60 600'), t('M 60 600 A 270 300 0 0 0 60 0')],
    jonctions: [[0, 1, 'haut'], [0, 1, 'bas']],
  },
  E: {
    traits: [
      t('M 60 0 L 60 600'), t('M 60 600 L 350 600'),
      t('M 60 300 L 310 300'), t('M 60 0 L 350 0'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 2, 'milieu'], [0, 3, 'bas']],
  },
  F: {
    traits: [t('M 60 0 L 60 600'), t('M 60 600 L 350 600'), t('M 60 320 L 310 320')],
    jonctions: [[0, 1, 'haut'], [0, 2, 'milieu']],
  },
  G: {
    traits: [t('M 326 501 A 170 300 0 1 1 326 99'), t('M 326 99 L 326 260 L 210 260')],
    jonctions: [[0, 1, 'terminaison']],
  },
  H: {
    traits: [t('M 60 0 L 60 600'), t('M 340 0 L 340 600'), t('M 60 300 L 340 300')],
    jonctions: [[0, 2, 'gauche'], [1, 2, 'droite']],
  },
  I: { traits: [t('M 200 0 L 200 600')], jonctions: [] },
  J: { traits: [t('M 330 600 L 330 150 A 145 150 0 0 0 40 150')], jonctions: [] },
  K: {
    traits: [t('M 60 0 L 60 600'), t('M 60 300 L 340 600'), t('M 60 300 L 340 0')],
    jonctions: [[0, 1, 'attache haute'], [0, 2, 'attache basse']],
  },
  L: {
    traits: [t('M 60 600 L 60 0'), t('M 60 0 L 350 0')],
    jonctions: [[0, 1, 'pied']],
  },
  M: {
    traits: [
      t('M 60 0 L 60 600'), t('M 60 555 L 200 120'),
      t('M 200 120 L 340 555'), t('M 340 0 L 340 600'),
    ],
    jonctions: [[0, 1, 'fût gauche'], [1, 2, 'pointe'], [2, 3, 'fût droit']],
  },
  N: {
    traits: [t('M 60 0 L 60 600'), t('M 60 555 L 340 45'), t('M 340 0 L 340 600')],
    jonctions: [[0, 1, 'fût gauche'], [1, 2, 'fût droit']],
  },
  O: { traits: [ovale(200, 300, 180, 300)], jonctions: [] },
  P: {
    traits: [t('M 60 0 L 60 600'), t('M 60 600 A 270 150 0 0 0 60 300')],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille']],
  },
  Q: {
    traits: [ovale(200, 300, 180, 300), t('M 327 88 L 390 10')],
    jonctions: [[0, 1, 'tangence']],
  },
  R: {
    traits: [
      t('M 60 0 L 60 600'), t('M 60 600 A 270 150 0 0 0 60 300'), t('M 60 300 L 340 0'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille'], [0, 2, 'attache de la jambe']],
  },
  S: { traits: [t('M 344 470 A 145 145 0 1 1 200 310 A 145 145 0 1 0 56 150')], jonctions: [] },
  T: {
    traits: [t('M 30 600 L 370 600'), t('M 200 600 L 200 0')],
    jonctions: [[0, 1, 'croisée']],
  },
  U: { traits: [t('M 60 600 L 60 180 A 140 150 0 0 1 340 180 L 340 600')], jonctions: [] },
  V: {
    traits: [t('M 30 600 L 200 0'), t('M 200 0 L 370 600')],
    jonctions: [[0, 1, 'pointe']],
  },
  W: {
    traits: [
      t('M 20 600 L 110 0'), t('M 110 0 L 200 430'),
      t('M 200 430 L 290 0'), t('M 290 0 L 380 600'),
    ],
    jonctions: [[0, 1, 'pointe gauche'], [1, 2, 'sommet médian'], [2, 3, 'pointe droite']],
  },
  X: {
    traits: [t('M 30 600 L 370 0'), t('M 370 600 L 30 0')],
    jonctions: [[0, 1, 'croisement']],
  },
  Y: {
    traits: [t('M 30 600 L 200 330'), t('M 370 600 L 200 330'), t('M 200 330 L 200 0')],
    jonctions: [[0, 2, 'branche gauche'], [1, 2, 'branche droite']],
  },
  Z: {
    traits: [t('M 30 600 L 370 600'), t('M 370 600 L 30 0'), t('M 30 0 L 370 0')],
    jonctions: [[0, 1, 'haut'], [1, 2, 'bas']],
  },

  // ─── BAS DE CASSE ─────────────────────────────────────────────────────────
  a: {
    traits: [ovale(185, 200, 145, 200), t('M 330 400 L 330 0')],
    jonctions: [[0, 1, 'tangence']],
  },
  b: {
    traits: [t('M 60 600 L 60 0'), t('M 60 400 A 270 200 0 0 0 60 0')],
    jonctions: [[0, 1, 'naissance'], [0, 1, 'pied']],
  },
  c: { traits: [t('M 293 334 A 145 200 0 1 1 293 66')], jonctions: [] },
  d: {
    traits: [t('M 340 600 L 340 0'), t('M 340 400 A 270 200 0 0 1 340 0')],
    jonctions: [[0, 1, 'naissance'], [0, 1, 'pied']],
  },
  e: {
    traits: [t('M 45 200 L 325 200'), t('M 325 200 A 140 200 0 1 1 292 71')],
    jonctions: [[0, 1, 'départ'], [0, 1, 'flanc gauche']],
  },
  f: {
    traits: [t('M 150 0 L 150 440 A 140 140 0 0 0 290 580'), t('M 40 400 L 280 400')],
    jonctions: [[0, 1, 'barre']],
  },
  g: {
    traits: [ovale(185, 200, 145, 200), t('M 330 200 L 330 -60 A 120 100 0 0 0 90 -60')],
    jonctions: [[0, 1, 'attache']],
  },
  h: {
    traits: [t('M 60 600 L 60 0'), t('M 60 300 A 140 100 0 0 0 340 300 L 340 0')],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  i: {
    traits: [t('M 200 0 L 200 400'), t('M 200 520 L 200 520')],
    jonctions: [],
  },
  j: {
    traits: [t('M 250 400 L 250 -50 A 100 100 0 0 0 50 -50'), t('M 250 520 L 250 520')],
    jonctions: [],
  },
  k: {
    traits: [t('M 60 600 L 60 0'), t('M 60 170 L 320 400'), t('M 60 170 L 320 0')],
    jonctions: [[0, 1, 'attache haute'], [0, 2, 'attache basse']],
  },
  l: { traits: [t('M 200 600 L 200 0')], jonctions: [] },
  m: {
    traits: [
      t('M 60 0 L 60 300'),
      t('M 60 300 A 70 100 0 0 0 200 300 L 200 0'),
      t('M 200 300 A 70 100 0 0 0 340 300 L 340 0'),
    ],
    jonctions: [[0, 1, 'première arche'], [1, 2, 'seconde arche']],
  },
  n: {
    traits: [t('M 60 0 L 60 300'), t('M 60 300 A 140 100 0 0 0 340 300 L 340 0')],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  o: { traits: [ovale(190, 200, 150, 200)], jonctions: [] },
  p: {
    traits: [t('M 60 -160 L 60 400'), t('M 60 400 A 270 200 0 0 0 60 0')],
    jonctions: [[0, 1, 'naissance'], [0, 1, 'pied']],
  },
  q: {
    traits: [t('M 340 -160 L 340 400'), t('M 340 400 A 270 200 0 0 1 340 0')],
    jonctions: [[0, 1, 'naissance'], [0, 1, 'pied']],
  },
  r: {
    traits: [t('M 60 0 L 60 300'), t('M 60 300 A 140 100 0 0 0 299 371')],
    jonctions: [[0, 1, 'naissance du bras']],
  },
  s: { traits: [t('M 286 315 A 97 97 0 1 1 190 203 A 97 97 0 1 0 94 96')], jonctions: [] },
  t: {
    traits: [t('M 180 500 L 180 60 A 120 40 0 0 0 300 100'), t('M 60 400 L 300 400')],
    jonctions: [[0, 1, 'barre']],
  },
  u: {
    traits: [t('M 60 400 L 60 150 A 140 150 0 0 1 340 150'), t('M 340 150 L 340 400')],
    jonctions: [[0, 1, 'remontée']],
  },
  v: {
    traits: [t('M 50 400 L 190 0'), t('M 190 0 L 330 400')],
    jonctions: [[0, 1, 'pointe']],
  },
  w: {
    traits: [
      t('M 30 400 L 105 0'), t('M 105 0 L 180 290'),
      t('M 180 290 L 255 0'), t('M 255 0 L 330 400'),
    ],
    jonctions: [[0, 1, 'pointe gauche'], [1, 2, 'sommet médian'], [2, 3, 'pointe droite']],
  },
  x: {
    traits: [t('M 50 400 L 330 0'), t('M 330 400 L 50 0')],
    jonctions: [[0, 1, 'croisement']],
  },
  y: {
    traits: [t('M 50 400 L 195 40'), t('M 330 400 L 120 -160')],
    jonctions: [[0, 1, 'jonction des branches']],
  },
  z: {
    traits: [t('M 50 400 L 330 400'), t('M 330 400 L 50 0'), t('M 50 0 L 330 0')],
    jonctions: [[0, 1, 'haut'], [1, 2, 'bas']],
  },
};

for (const g of Object.values(G)) {
  for (const tr of g.traits) Object.freeze(tr);
  for (const j of g.jonctions) Object.freeze(j);
  Object.freeze(g.traits);
  Object.freeze(g.jonctions);
  Object.freeze(g);
}

/** Les 52 glyphes, gelés. */
export const GLYPHES = Object.freeze(G);

/** Les 26 capitales, dans l'ordre alphabétique. */
export const CAPITALES = Object.freeze([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
/** Les 26 bas de casse. */
export const BAS_DE_CASSE = Object.freeze([...'abcdefghijklmnopqrstuvwxyz']);

export default GLYPHES;
