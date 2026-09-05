/**
 * ★ **LA SECONDE LECTURE DES CINQUANTE-DEUX SIGNES — Jost, et non JetBrains.**
 *
 * > « Intègre une variante des opérateurs de compte des extrémités et des traits
 * >   qui utilise Jost (pas besoin pour les boucles fermées puisqu'il n'y a pas
 * >   de changement à cet endroit). » (l'auteur)
 *
 * Cette table ne remplace rien : elle DOUBLE `glyphes.js`. Le catalogue porte
 * donc deux façons de compter les traits d'une lettre et deux façons d'en
 * compter les extrémités, et c'est délibéré :
 *
 * > « Dans notre cas, c'est plutôt une bonne chose de pouvoir compter les traits
 * >   de deux manières différentes, ça nous laisse plus d'options pour obtenir le
 * >   résultat souhaité. » (l'auteur)
 *
 * ⚠️ **ENGENDRÉE par `src/gfx/jost-axe.py --adopter`** — ne pas éditer entre les
 *   marqueurs. Le reste de ce fichier est écrit à la main, parce qu'il énonce ce
 *   que la table SIGNIFIE et non ce qu'elle contient.
 *
 * ## Ce qui distingue les deux lectures
 *
 * ★ **LE DESSIN.** Jost est une géométrique sans empattement : son `l` et son `I`
 *   sont des barres nues là où JetBrains les empatte. Mesuré sur les cinquante-
 *   deux signes : **295 nœuds contre 264**, et l'écart est là — un empattement
 *   coûte des nœuds, pas des extrémités.
 *
 * ★ **LA RÈGLE DE COMPTAGE DES TRAITS**, et c'est elle qui creuse vraiment
 *   l'écart. Côté JetBrains, « tout angle aigu au niveau d'un sommet implique un
 *   changement de trait » ; côté Jost, « tout tracé contigu sans repasser au même
 *   endroit reste un seul trait » (l'auteur). La seconde est le **chemin
 *   eulérien** — parcourir chaque arête une fois —, et elle se calcule sans
 *   arbitraire : un scripteur lève le crayon autant de fois qu'il y a de paires
 *   de sommets de degré impair, au moins une par morceau détaché.
 *   Voir `derivees-jost.js`, qui l'applique.
 *
 * ★ **LES BOUCLES NE SONT PAS DOUBLÉES**, et l'auteur le dit : elles ne changent
 *   pas. C'est la quatrième vérification indépendante de cet invariant — seize
 *   boucles chez JetBrains, seize chez Jost, les mêmes seize.
 *
 * ## Repère
 *
 * Le même que `glyphes.js` — origine en bas à gauche, y vers le haut, capitale à
 * 600 — à ceci près que Jost n'est PAS une monospace : chaque signe a son avance
 * propre, et l'encre va de −113 (le `J`) à 794 (le `W`).
 */

/** Tolérance de contact, en unités de grille (identique à `glyphes.js`). */
export const TOLERANCE = 6;

const t = (d, ouvert = true) => ({ d, ouvert });
const ferme = (d) => ({ d, ouvert: false });

const G = {
  // ⟨engendré par src/gfx/jetbrains-axe.py --adopter⟩
  // ─── CAPITALES ────────────────────────────────────────────────────────────
  A: {
    traits: [
      t('M493.04 -0.14 L254.24 607.26 L14.35 -0.06'),
      t('M109.1 239.83 L398.7 239.83'),
    ],
    jonctions: [[0, 1, 'barre gauche'], [0, 1, 'barre droite']],
  },
  B: {
    traits: [
      t('M78.88 334.18 C164.49 333.4 298.2 320.7 327.19 423.41 C334.9 450.74 334.77 482.21 325.94 509.26 C292.69 611.06 166.26 599.47 79.24 596.38'),
      t('M79.24 596.38 L78.44 2.76'),
      t('M78.44 2.76 C208.84 0.2 363.76 -7.76 363.76 164.14 C365.8 251.96 290.78 320.74 206.53 332.57 L78.89 335.04'),
    ],
    jonctions: [[0, 1, 'sommet'], [0, 1, 'taille haute'], [1, 2, 'pied'], [1, 2, 'taille basse']],
  },
  C: {
    traits: [
      t('M514.36 539.58 C463.15 587.63 392.77 605.45 324.3 605.45 C146.37 605.44 41.37 459.11 44.96 290.97 C44.96 128.81 155.48 -5.45 324.66 -5.45 C394.43 -5.45 462.16 12.9 514.5 61.06'),
    ],
    jonctions: [],
  },
  D: {
    traits: [
      t('M78.42 599 L78.74 1'),
      t('M78.74 1 C185.68 0.3 298.01 -11.72 385.66 54.32 C539.12 169.93 532.02 452.61 369.49 556.77 C284.45 611.26 179.42 599.32 78.42 599'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied']],
  },
  E: {
    traits: [
      t('M78.67 599.58 L78.42 0.68'),
      t('M78.67 599.58 L362.72 599.28'),
      t('M78.7 334.76 L345.55 334.56'),
      t('M78.42 0.68 L362.72 0.38'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu'], [0, 3, 'barre du bas']],
  },
  F: {
    traits: [
      t('M79 599.29 L78.5 0'),
      t('M79 599.29 L327.59 599.19'),
      t('M78.77 324 L319.83 323.7'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu']],
  },
  G: {
    traits: [
      t('M361.71 289.69 L605.7 289 L604.89 271.37 C597.51 121.17 486.35 -7.7 328.54 -5.85 C155.19 -3.82 43.22 137.34 44.51 303.95 C44.51 472.33 163.59 605.89 336.36 605.89 C432.3 605.89 512.3 556.03 567.15 479.24'),
    ],
    jonctions: [],
  },
  H: {
    traits: [
      t('M79.52 600 L79.02 0.02'),
      t('M468.72 600 L468.22 0.02'),
      t('M78.79 327.96 L468.5 327.76'),
    ],
    jonctions: [[0, 2, 'naissance gauche'], [1, 2, 'naissance droite']],
  },
  I: {
    traits: [
      t('M73.43 600 L73.43 0'),
    ],
    jonctions: [],
  },
  J: {
    traits: [
      t('M-112.6 -145.09 C-85.65 -170 -50.64 -188.34 -13.22 -187.35 C102.05 -187.35 84.88 -77.55 84.88 8.52 L84.88 600'),
    ],
    jonctions: [],
  },
  K: {
    traits: [
      t('M74.19 600 L73.69 0'),
      t('M348.72 600.85 L82.09 312.38 L361.26 -1.07'),
    ],
    jonctions: [[0, 1, 'fourche de la jambe']],
  },
  L: {
    traits: [
      t('M78.29 600 L78.44 0.46 L347.9 -0.04'),
    ],
    jonctions: [],
  },
  M: {
    traits: [
      t('M660.47 0.11 L596.01 604.92 L356.65 98.54 L116.57 603.39 L53.75 0.06'),
    ],
    jonctions: [],
  },
  N: {
    traits: [
      t('M537.02 600 L536.52 -5.22 L80.51 586.04 L78.74 0'),
    ],
    jonctions: [],
  },
  O: {
    traits: [
      ferme('M44.22 299.88 C43.85 705.59 616.8 706.1 616.8 300.52 C616.8 -105.64 44.58 -106.24 44.22 299.93'),
    ],
    jonctions: [],
  },
  P: {
    traits: [
      t('M79.02 598.26 L78.52 0'),
      t('M79.02 598.26 C150.28 600.03 222.34 608.43 280.87 574.28 C380.74 516.01 387.01 352.16 291.74 286.19 C231.69 244.61 154.59 253.55 78.73 254.12'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied de la panse']],
  },
  Q: {
    traits: [
      ferme('M44.21 304.28 C43.85 705.1 608.78 705.53 617.12 308.42 C625.75 -102.19 44.59 -114.32 44.22 296.39'),
      t('M345.55 257.42 L624.22 -0.02'),
    ],
    jonctions: [[0, 1, 'queue']],
  },
  R: {
    traits: [
      t('M78.9 598.44 L78.4 0'),
      t('M78.9 598.44 L178.3 598.96 C275.98 599.46 369.85 544.76 369.85 436.67 C369.85 318.82 269.57 273.57 165.26 273.51 L78.63 273.45'),
      t('M165.26 273.51 L357.36 -0.18'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille'], [1, 2, 'naissance de la jambe']],
  },
  S: {
    traits: [
      t('M49.22 154.88 C56.62 67.42 112.22 -5.05 201.16 -5.05 C279.99 -9.93 354.63 29.08 369.28 112 C411.18 349.03 61.08 277.58 69.91 484.63 C76.66 643.02 311.15 641.43 357.76 503.52'),
    ],
    jonctions: [],
  },
  T: {
    traits: [
      t('M18.29 599.41 L347.26 599.41'),
      t('M182.76 599.41 L182.76 0'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  U: {
    traits: [
      t('M74.51 596.23 L74.48 265.57 C74.41 196.66 67.58 121.1 106.88 60.45 C165.75 -30.39 317.84 -30.48 379.2 57.44 C420.61 116.78 413.52 193.7 413.51 262.24 L413.51 600'),
    ],
    jonctions: [],
  },
  V: {
    traits: [
      t('M13.99 599.84 L254.05 -5.47 L492.79 600.09'),
    ],
    jonctions: [],
  },
  W: {
    traits: [
      t('M18.19 600 L209.81 14.41 L398.75 580.87 L586.72 21.51 L793.75 599.23'),
    ],
    jonctions: [],
  },
  X: {
    traits: [
      t('M40.63 600.2 L403 -0.23'),
      t('M19 -0.32 L390.24 600.56'),
    ],
    jonctions: [[0, 1, 'croisée']],
  },
  Y: {
    traits: [
      t('M14.88 600.21 L214.26 235.42 L413.74 600.36'),
      t('M214.26 235.42 L209.49 0'),
    ],
    jonctions: [[0, 1, 'fourche']],
  },
  Z: {
    traits: [
      t('M34.85 599.27 L437.7 593.8 L28.84 8.94 L437.72 0.69'),
    ],
    jonctions: [],
  },

  // ─── BAS DE CASSE ─────────────────────────────────────────────────────────
  a: {
    traits: [
      t('M61.37 358.53 C101.29 385.98 143.09 403.72 192.34 401.75 C306.1 401.75 306.18 314.69 306.17 224.65 L306.13 0.06'),
      t('M306.16 187.62 C259.86 213.63 234.11 230.96 179.03 230.96 C97.36 230.96 35.98 198.69 35.98 108.9 C35.98 38.65 90.95 -7.26 159.01 -7.26 C272.75 -7.26 302.17 84.63 306.35 178.97'),
    ],
    jonctions: [[0, 1, 'haut de la panse'], [0, 1, 'pied de la panse']],
  },
  b: {
    traits: [
      t('M70.38 0 L69.78 668.57'),
      ferme('M253.54 -6.92 C489.86 7.8 464.45 415.81 228.12 401.28 C136.86 395.67 70.33 295.7 70.33 206.98 C70.33 104.27 133.85 -14.37 251.07 -7.07'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  c: {
    traits: [
      t('M364.06 355.38 C332.43 385.6 282.41 401.97 239.53 401.97 C123.84 403.41 35.91 311.97 36.03 197.29 C36.14 82.84 123.66 -9.61 239.66 -7.66 C281.97 -6.95 333.15 7.96 364 38.61'),
    ],
    jonctions: [],
  },
  d: {
    traits: [
      t('M390.62 668.57 L390.02 0.14'),
      ferme('M229.42 401.47 C-9.36 412.32 -27.86 5.3 210.83 -7.16 C316.38 -12.67 385.24 89.31 390.01 186.58 L390.07 207.1 C390.07 294.74 323.78 401.44 230.07 401.44'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  e: {
    traits: [
      t('M378.82 87.64 C230.73 -125.75 -19.04 49.95 51.83 272.87 C103.66 435.89 317.23 445.73 377.58 283.31 C386.65 258.9 393.19 226.3 386.44 197.64'),
      t('M386.44 197.64 L40.78 199.16'),
    ],
    jonctions: [[0, 1, 'bout droit de la barre'], [0, 1, 'flanc gauche']],
  },
  f: {
    traits: [
      t('M242.1 635.65 C221.78 659.82 197.01 676.07 164.51 674.13 C71.24 668.56 82.86 552.63 82.86 486.96 L82.86 0.1'),
      t('M44.67 393.62 L206.79 393.82'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  g: {
    traits: [
      t('M53.55 -29.21 C54.64 -117.95 113.76 -196.05 205.46 -196.05 C366.23 -203.02 390.4 -61.84 390.4 60.45 L390.39 394.21'),
      ferme('M39.97 200.32 C39.37 97.85 100.77 -7.3 210.77 -7.3 C324.25 -13.74 394.86 105.41 390.15 207.6 C385.69 304.38 316.59 407.1 210.63 401.56 C100.25 395.79 38.02 303.05 39.97 200.32'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  h: {
    traits: [
      t('M74.63 0 L74.03 668.57'),
      t('M327.14 3.21 L327.13 212.09 C327.15 292.77 335.24 401.87 225.72 401.87 C156 404.93 92.12 344.45 74.38 278.62'),
    ],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  i: {
    traits: [
      t('M77.58 394.29 L77.28 0'),
      t('M77.58 600.86 L77.58 600.86'),
    ],
    jonctions: [],
  },
  j: {
    traits: [
      t('M-90.63 -148.64 C-68.62 -173.07 -45.45 -189.76 -11.18 -187.49 C80.6 -181.41 68.86 -65.15 68.86 -0.68 L68.85 394.29'),
      t('M68.85 600.86 L68.85 600.86'),
    ],
    jonctions: [],
  },
  k: {
    traits: [
      t('M70.3 668.57 L69.7 0.14'),
      t('M285.25 395.48 L73.68 232.25 L300.34 -0.76'),
    ],
    jonctions: [[0, 1, 'fourche de la jambe']],
  },
  l: {
    traits: [
      t('M74.59 668.57 L73.99 0.14'),
    ],
    jonctions: [],
  },
  m: {
    traits: [
      t('M74.23 394.18 L74.23 0.18'),
      t('M74.23 295.03 C98.29 349.37 144.5 401.92 201.65 401.92 C268.04 401.92 292.59 327.08 292.24 267.42 L290.64 0.05'),
      t('M292.24 267.42 C290.22 391.73 506.61 485.22 506.69 275.13 L506.79 0'),
    ],
    jonctions: [[0, 1, 'première arche'], [1, 2, 'seconde arche']],
  },
  n: {
    traits: [
      t('M74.23 394.29 L74.23 0'),
      t('M74.23 294.86 C100.25 359.87 163.69 408.29 235.45 401.17 C307.29 394.04 327.28 334.44 327.27 269.62 L327.21 0'),
    ],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  o: {
    traits: [
      ferme('M39.96 200.91 C38.45 89.73 120.97 -7.59 234.53 -7.59 C346.3 -9.57 434.13 77.67 437.42 188.63 C440.89 305.27 353.95 404.55 234.33 401.88 C120.47 399.34 38.27 312.7 39.96 200.91'),
    ],
    jonctions: [],
  },
  p: {
    traits: [
      t('M69.8 -188.57 L70.4 394.29'),
      ferme('M229.71 -7.13 C467.19 -19.94 489.16 387.27 251.75 401.35 C144.83 407.7 72.94 303.37 70.38 206.04 L70.42 186.54 C74.88 98.22 134.3 -1.98 230.9 -7.19'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  q: {
    traits: [
      t('M390 394.29 L390.6 -188.57'),
      ferme('M229.41 401.47 C-9.35 412.32 -27.86 5.3 210.83 -7.16 C316.22 -12.67 385.31 89.24 390.08 186.49 C394.68 280.08 333.98 396.71 230.07 401.44'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  r: {
    traits: [
      t('M74.47 394.14 L74.17 0'),
      t('M227.31 385.49 C207.07 398.9 183.55 405.05 159.55 400.5 C97.34 388.72 79.84 320.81 74.37 262.4'),
    ],
    jonctions: [[0, 1, 'naissance de l’épaule']],
  },
  s: {
    traits: [
      t('M41.03 93.79 C54.07 -44.8 290.16 -41.04 278.69 107.99 C268.97 234.36 50.91 165.14 59.94 315.89 C59.94 370.94 111.93 399.66 163.17 399.66 C215.02 398.92 257.69 370.05 275.97 320.8'),
    ],
    jonctions: [],
  },
  t: {
    traits: [
      t('M78.88 531.43 L78.28 0'),
      t('M14.43 393.82 L142.79 393.62'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  u: {
    traits: [
      t('M327.21 394.29 L327.21 0'),
      t('M327.21 99.24 C303.02 39.53 245.57 -7.16 177.44 -7.16 C92.23 -7.16 74.3 64.04 74.3 136.3 L74.29 394.14'),
    ],
    jonctions: [[0, 1, 'naissance du creux']],
  },
  v: {
    traits: [
      t('M9.9 394.21 L178.82 -6.78 L347.28 394.31'),
    ],
    jonctions: [],
  },
  w: {
    traits: [
      t('M12.88 394.12 L132.13 4 L255.01 378.41 L391.03 -2.75 L510.92 394.31'),
    ],
    jonctions: [],
  },
  x: {
    traits: [
      t('M19.78 395.2 L309.97 -0.86'),
      t('M11.27 -0.8 L300.75 395.12'),
    ],
    jonctions: [[0, 1, 'croisée']],
  },
  y: {
    traits: [
      t('M10.89 394.5 L182.7 9.47'),
      t('M352.53 394.37 L95.38 -188.42'),
    ],
    jonctions: [[0, 1, 'fourche']],
  },
  z: {
    traits: [
      t('M349.71 0.6 L29.03 0.61 L334.38 391.95 L33.72 394.24'),
    ],
    jonctions: [],
  },
  // ⟨/engendré⟩
};

for (const g of Object.values(G)) {
  for (const tr of g.traits) Object.freeze(tr);
  for (const j of g.jonctions) Object.freeze(j);
  Object.freeze(g.traits);
  Object.freeze(g.jonctions);
  Object.freeze(g);
}

/** Les 52 glyphes de Jost, gelés. */
export const GLYPHES_JOST = Object.freeze(G);

export default GLYPHES_JOST;
