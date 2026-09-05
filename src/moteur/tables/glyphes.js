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
 * - `g` **à un seul étage** (cercle + fût) — mesuré sur la police : son creux
 *   monte à 89 % de la hauteur du glyphe, c'est une panse pleine. La convention
 *   disait « `a` et `g` » ; le `a` en est SORTI, son creux s'arrêtant à 46 %,
 *   ce qui est un deuxième étage (voir le glyphe) ;
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
 * - ~~**`M` et `N` : les fûts dépassent la jonction des diagonales**~~ —
 *   **CONVENTION ABANDONNÉE.** Les diagonales naissaient 45 unités sous le
 *   sommet du fût, ce qui rendait quatre pointes « réellement visibles » et
 *   faisait tomber le compte sur la référence. Quarante-cinq sur six cents, ce
 *   sont 7,5 % de la hauteur de capitale : l'auteur, lisant le glyphe, en compte
 *   deux. Les diagonales rejoignent donc le sommet, comme celles du `W`, et
 *   l'écart avec la référence est déclaré (`derivees.js › ECARTS`) ;
 * - **`m` et `n` : l'arche naît au sommet du fût** (le fût s'arrête où l'épaule
 *   commence), construction uniforme des lettres à arche (`h`, `m`, `n`, `r`).
 */

/** Tolérance de contact, en unités de grille (identique à `src/visuel/glyphes.js`). */
export const TOLERANCE = 6;

/**
 * Hauteurs de référence de la grille.
 *
 * ★ **DEUX D'ENTRE ELLES ÉTAIENT DES CHIFFRES RONDS, ELLES SONT MAINTENANT DES
 *   MESURES.** Tant que les tracés étaient dessinés à la main, `hauteurX: 400`
 *   et `largeur: 400` étaient des choix commodes. Depuis qu'ils sont RELEVÉS sur
 *   JetBrains Mono, ils doivent décrire ce qu'ils accompagnent, sans quoi la
 *   réglure de `glyphes.html` passerait à côté des lettres et le contrôle de
 *   débordement refuserait des tracés justes.
 *
 * · `hauteurX` 400 → **452,1** : la hauteur d'x de la police, à l'échelle du
 *   repère (`_glyphes-candidats.js › MESURES`) ;
 * · `largeur` 400 → **493,2** : son AVANCE, et non l'étendue de l'encre — c'est
 *   une monospace, tous ses signes occupent cette largeur-là. Le `L` pousse son
 *   pied à 442,8, ce que 400 refusait.
 *
 * ★ **ET 493,2 REND EXACTE UNE ÉGALITÉ QUI ÉTAIT APPROCHÉE.** `assets.js`
 *   dessine un glyphe sur `largeur × (corps × CAP_RATIO / 600)`, et le scénario
 *   réserve `corps × ADVANCE_RATIO` par caractère. Avec 400 les deux valaient
 *   0,487 et 0,6 — sept pour cent d'écart, absorbés par les marges. Avec 493,2 :
 *   493,2 × 0,73 / 600 = 0,600. La largeur dessinée EST l'avance déclarée.
 */
export const METRIQUES = Object.freeze({
  capitale: 600,
  hauteurX: 452.1,
  hampe: 600,
  jambage: -160,
  largeur: 493.2,
});

const t = (d, ouvert = true) => ({ d, ouvert });
const ferme = (d) => ({ d, ouvert: false });

/** Ellipse fermée, sens trigonométrique, en deux demi-arcs. */
const ovale = (cx, cy, rx, ry) => ferme(
  `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`,
);

const G = {
  // ⟨engendré par src/gfx/jetbrains-axe.py --adopter⟩
  // ─── CAPITALES ────────────────────────────────────────────────────────────
  A: {
    traits: [
      t('M75.32 2.35 C112.96 131.48 149.99 260.79 187.08 390.09 L246.71 598.03'),
      t('M246.71 598.03 L416.34 -0.69'),
      t('M129.25 194.38 L361.36 189.17'),
    ],
    jonctions: [[0, 1, 'sommet'], [0, 2, 'barre gauche'], [1, 2, 'barre droite']],
  },
  B: {
    traits: [
      t('M109.3 0.92 L109.01 597.5'),
      t('M111.99 599.08 L236.1 599.08 C445.56 599.08 445.56 304.03 236.1 304 L109.16 303.99'),
      t('M109.16 304 L241.74 304 C464.85 304 464.85 1.56 241.74 1.17 L109.3 0.94'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille haute'], [0, 2, 'taille basse'], [0, 2, 'pied']],
  },
  C: {
    traits: [
      t('M413.96 446.37 C409.46 540.68 346.98 610.44 249.65 607.4 C162.84 604.68 107.31 534.25 107.27 450.62 L107.08 127.71 C107.04 40.79 186.4 -12.86 272.02 -6.94 C357.99 -0.99 410.6 72.59 414 154.39'),
    ],
    jonctions: [],
  },
  D: {
    traits: [
      t('M110.78 2.85 L109.32 596.49'),
      t('M112.8 598.2 L214.76 598.2 C316.01 598.2 389.2 516.27 389.25 415.76 L389.37 166.79 C389.41 71.51 308.4 0.73 213.98 1.74 L110.78 2.85'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied']],
  },
  E: {
    traits: [
      t('M119.71 0.59 L119.71 598.63'),
      t('M120.01 599.59 L408.9 599.59'),
      t('M119.71 311.2 L380.14 311.2'),
      t('M120.01 0.59 L408.9 0.59'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu'], [0, 3, 'barre du bas']],
  },
  F: {
    traits: [
      t('M115.53 0 L115.53 598.68'),
      t('M116.25 599.54 L431.51 599.54'),
      t('M115.53 307.29 L393.49 307.29'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu']],
  },
  G: {
    traits: [
      t('M410.74 444.87 C404.51 630.28 153.64 669.22 110.46 500.79 C95.98 444.33 103.04 349.76 103.77 289.07 L105.75 124.08 C107.3 -4.55 292.43 -57 373.82 47.56 C422.84 110.53 410.78 197.06 403.91 280.18'),
      t('M403.91 280.18 L243.67 280.18'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  H: {
    traits: [
      t('M107.91 0.1 L107.91 600'),
      t('M385.21 0.1 L385.21 600'),
      t('M107.91 314.49 L385.21 314.49'),
    ],
    jonctions: [[0, 2, 'naissance gauche'], [1, 2, 'naissance droite']],
  },
  I: {
    traits: [
      t('M114.1 599.69 L379.1 599.69'),
      t('M114.1 0.19 L379.1 0.19'),
      t('M248.47 0.69 L248.47 599.69'),
    ],
    jonctions: [[0, 2, 'empattement du haut'], [1, 2, 'empattement du bas']],
  },
  J: {
    traits: [
      t('M379.57 599.88 L378.6 141.64 C378.18 -59.4 86.7 -58.75 83.42 142.26'),
    ],
    jonctions: [],
  },
  K: {
    traits: [
      t('M108.9 0 L108.9 599.55'),
      t('M108.9 313.04 L283.82 313.04'),
      t('M414.11 596.61 C394.82 555.34 278.02 309.86 280.27 305.04 L422.8 -0.2'),
    ],
    jonctions: [[0, 1, 'naissance du bras'], [1, 2, 'fourche']],
  },
  L: {
    traits: [
      t('M125.5 599.71 L125.5 1.85 L442.77 0.39'),
    ],
    jonctions: [],
  },
  M: {
    traits: [
      t('M96.6 0 L93.15 592.63'),
      t('M93.15 592.63 L250.63 242.62'),
      t('M250.63 242.62 L396.57 588.58'),
      t('M396.57 588.58 L396.57 0'),
    ],
    jonctions: [[0, 1, 'sommet gauche'], [1, 2, 'creux'], [2, 3, 'sommet droit']],
  },
  N: {
    traits: [
      t('M110.36 0.42 L110.65 600.27'),
      t('M110.65 600.27 L382.81 0.88'),
      t('M382.56 -0.08 L382.85 599.77'),
    ],
    jonctions: [[0, 1, 'sommet gauche'], [1, 2, 'pied droit']],
  },
  O: {
    traits: [
      ferme('M166.67 14.11 C215.17 -17.21 282.21 -16.74 329.73 16.18 C392.42 59.59 389.33 135.28 389.34 203.03 L389.37 408.66 C389.39 509.69 365.8 610.42 245.24 608.08 C75.44 604.78 103.83 417.29 103.83 302.46 L103.82 199.84 C103.82 131.84 102.04 55.83 166.67 14.11'),
    ],
    jonctions: [],
  },
  P: {
    traits: [
      t('M109.05 0 L109.05 597.99'),
      t('M111.7 598.86 L259.16 598.86 C482.93 598.86 482.93 292 259.16 291.93 L109.05 291.88'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied de la panse']],
  },
  Q: {
    traits: [
      ferme('M236.86 -7.28 C318.13 -12.86 371.32 40.71 379.3 117.24 C385.36 175.39 387.32 474.25 371.25 518.04 C351.63 571.55 308.12 605.21 250.39 606.57 C93.62 610.27 111.3 444.21 111.99 338.71 L113.39 123.92 C113.87 50.83 172.08 -8.32 249.39 -6.77 C270.02 -6.36 330.73 -5.89 310.93 -0.1 C287.12 6.87 212.12 -5.59 236.86 -7.28'),
      t('M286.9 0.04 C319.88 7.91 395.88 -124.06 401.23 -147.07'),
    ],
    jonctions: [[0, 1, 'queue']],
  },
  R: {
    traits: [
      t('M108.33 0 L108.33 598.09'),
      t('M111.27 598.97 L244.59 598.97 C345.26 598.97 419.65 554.2 422.46 445.81 C425.22 339.46 339.87 289.6 244.61 290.35 L108.33 291.44'),
      t('M254.08 290.68 C300.3 231.25 333.32 138.14 373.27 73.88 L419.4 -0.33'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille'], [1, 2, 'naissance de la jambe']],
  },
  S: {
    traits: [
      t('M408.88 456.2 C395.14 703.41 20.74 617.07 117.73 410.67 C175.78 287.14 345.1 331.77 396.52 195.9 C484.37 -36.22 97.04 -90.75 82.62 154.32'),
    ],
    jonctions: [],
  },
  T: {
    traits: [
      t('M54.45 600.38 L438.7 600.38'),
      t('M248.1 0 L248.1 600.38'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  U: {
    traits: [
      t('M107.26 599.69 L107.27 144.77 C107.27 63.94 162.54 -5.15 246.83 -6.78 C331.74 -8.42 385.44 65.88 385.51 144.77 L385.9 599.68'),
    ],
    jonctions: [],
  },
  V: {
    traits: [
      t('M77.81 596.81 C117.57 458.4 156.19 319.67 196.32 181.35 L247.31 5.59'),
      t('M247.31 5.59 C243.53 18.53 339.96 328.64 354.82 379.22 L419.93 600.96'),
    ],
    jonctions: [[0, 1, 'pointe']],
  },
  W: {
    traits: [
      t('M52.71 599.8 L143 -0.69'),
      t('M143 -0.69 L250.03 594.94'),
      t('M250.03 594.94 L353.76 3.99'),
      t('M353.38 6.97 C358.52 18.12 361.02 29.46 363.01 40.8 C395.29 224.84 412.58 411.99 437.54 597.15'),
    ],
    jonctions: [[0, 1, 'pointe gauche'], [1, 2, 'sommet médian'], [2, 3, 'pointe droite']],
  },
  X: {
    traits: [
      t('M58.93 4.38 C115.14 101.49 169.19 199.91 228.57 295.11 L419.48 601.16'),
      t('M73.97 602.09 L303.83 211.82 C345.03 141.88 394.33 77.07 434.36 6.2'),
    ],
    jonctions: [[0, 1, 'croisée']],
  },
  Y: {
    traits: [
      t('M59.45 597.5 C99.22 521.62 137.02 444.74 176.59 368.72 L246.58 234.27'),
      t('M246.58 234.27 L246.58 0.57'),
      t('M433.28 597.4 C393.5 521.58 356.37 444.37 316.28 368.69 L247.44 238.7'),
    ],
    jonctions: [[0, 1, 'fourche'], [1, 2, 'fourche']],
  },
  Z: {
    traits: [
      t('M75.29 598.91 L404.78 598.98'),
      t('M401.78 599.03 L80.29 0.41'),
      t('M80.29 0.41 L414.04 0.41'),
    ],
    jonctions: [[0, 1, 'haut'], [1, 2, 'bas']],
  },

  // ─── BAS DE CASSE ─────────────────────────────────────────────────────────
  a: {
    traits: [
      t('M111.26 352.15 C125.18 455.16 275.19 495.16 345.25 423.29 C400.33 366.78 384 254.81 384.25 181.9 L384.87 0.01'),
      ferme('M385.97 245.85 L202.28 245.85 C83.89 245.85 48.15 91.18 136.13 24.93 C212.85 -32.84 355.25 4.71 384.52 101.76 L385.97 245.85'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  b: {
    traits: [
      t('M108.25 0.33 L108.25 599.66'),
      ferme('M108.25 300.24 C108.91 388.19 154.61 465.87 247.75 459.62 C334.8 453.78 388.06 385.04 388.15 299.92 L388.34 135.34 C388.43 52.54 317.09 -15.98 231.26 -7.26 C147.43 1.25 108.9 65.61 108.25 152.24 L108.25 300.24'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  c: {
    traits: [
      t('M400.42 311.35 C403.54 486.42 161.29 512.34 122.48 353.41 C112.3 311.7 113.12 161.67 119.88 110.3 C143.57 -69.59 404.05 -34.22 400.28 147.19'),
    ],
    jonctions: [],
  },
  d: {
    traits: [
      t('M385.07 0.39 L385.07 599.61'),
      ferme('M385.07 300.11 C383.96 390.93 333.64 466.14 241.86 459.52 C153.44 453.14 104.93 379.12 104.89 295.21 L104.82 136.87 C104.78 54 173.05 -13.97 259.37 -7.5 C327.34 -2.41 368.75 44.86 385.07 102.03 L385.07 300.11'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  e: {
    traits: [
      t('M109 238.4 L382.85 238.9'),
      t('M382.85 238.9 C384.62 344.03 378.92 456.85 247.75 457.11 C155.7 457.28 109.08 387.22 109.04 301.43 L108.95 136.88 C108.9 46.34 165.32 -12.92 259.42 -6.68 C318.99 -2.74 362.35 38.02 379.17 93.9'),
    ],
    jonctions: [[0, 1, 'départ'], [0, 1, 'flanc gauche']],
  },
  f: {
    traits: [
      t('M212.91 0 L213.78 521.87 C213.85 568.29 249.94 600.22 296.57 600.32 L413.42 600.56'),
      t('M63.7 389.08 L413.42 389.08'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  g: {
    traits: [
      t('M384.98 452.06 L387.11 23.71 C387.26 -6.33 387.62 -37.16 381.91 -66.77 C362.04 -169.74 241.42 -148.07 162.81 -148.44'),
      ferme('M385.71 305.79 C384.58 388.03 342.4 459.53 252.61 459.8 C120.07 460.19 103.77 355.08 103.77 249.38 C103.77 220.35 102.5 190.95 106.89 162.15 C117.88 90.06 175.09 33.96 250.31 36.84 C329.14 39.86 376.61 92.15 386.41 164.75 L385.71 305.79'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  h: {
    traits: [
      t('M108.9 0 L108.9 599.92'),
      t('M108.9 302.34 C108.9 510.59 385.51 510.59 385.67 302.34 L385.89 0.15'),
    ],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  i: {
    traits: [
      t('M114.04 452.56 L259.11 452.42 L260.06 -0.38'),
      t('M88.36 -0.38 L419.18 -0.38'),
      t('M259.11 580.48 L259.11 580.48'),
    ],
    jonctions: [[0, 1, 'pied']],
  },
  j: {
    traits: [
      t('M106.85 452.47 L329.45 452.47 L329.8 -24.67 C329.86 -99.75 283.2 -147.22 207.84 -147.81 L110.96 -148.57'),
      t('M329.45 580.48 L329.45 580.48'),
    ],
    jonctions: [],
  },
  k: {
    traits: [
      t('M113.01 0 L113.01 599.99'),
      t('M113.01 238.06 L249.02 236.37'),
      t('M400.35 449.2 C349.05 379.52 297.76 309.85 246.39 240.22 L410.74 -0.42'),
    ],
    jonctions: [[0, 1, 'naissance du bras'], [1, 2, 'fourche']],
  },
  l: {
    traits: [
      t('M61.64 600.38 L198.87 600.38 L199.32 94.35 C199.39 21.74 235.07 -0.48 304.42 -0.49 L433.56 -0.5'),
    ],
    jonctions: [],
  },
  m: {
    traits: [
      t('M78.72 0 L78.72 452.05'),
      t('M78.72 374.72 C83.39 417.39 99.32 450.71 150.67 457.45 C210.02 465.23 239.88 413.21 239.91 361.25 L240.09 0'),
      t('M242.45 372.45 C247.12 415.12 274.64 449.29 325.98 456.03 C385.34 463.81 415.2 411.79 415.22 359.83 L415.4 -1.42'),
    ],
    jonctions: [[0, 1, 'première arche'], [1, 2, 'seconde arche']],
  },
  n: {
    traits: [
      t('M108.9 0 L108.9 451.72'),
      t('M108.9 305.59 C108.92 509.98 385.16 509.96 385.46 305.57 L385.9 0.04'),
    ],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  o: {
    traits: [
      ferme('M162.45 15.97 C210.05 -18.79 281.88 -20.03 329.73 14.97 C396.68 63.94 385.27 154.37 385.27 227.11 C385.27 332.89 386.22 460.18 247.68 462.01 C108.51 463.84 107.88 333.48 107.88 228.93 C107.88 156.85 95.81 64.64 162.45 15.97'),
    ],
    jonctions: [],
  },
  p: {
    traits: [
      t('M108.9 -147.95 L108.9 451.76'),
      ferme('M108.9 349.3 C125.45 412.71 169.98 463.58 246.06 459.76 C341.94 454.94 388.34 379.4 388.34 289.6 L388.32 139.63 C388.31 59.29 324.47 -12.66 238.57 -7.68 C187.29 -4.71 152.02 12.2 108.9 93.55 L108.9 349.3'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  q: {
    traits: [
      t('M385.19 -147.95 L385.19 452.05'),
      ferme('M385.19 356.68 C341.54 440.38 304.92 457.45 252.38 459.86 C156.16 464.26 104.81 374.55 104.81 286.91 L104.81 150.92 C104.81 68.38 164.73 -11.58 251.91 -7.79 C304.92 -5.48 341.03 11.23 385.19 96.08 L385.19 356.68'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  r: {
    traits: [
      t('M129.04 0 L129.04 452.01'),
      t('M129.04 337.89 C130.56 406.2 193.34 463.58 260.45 460.02 C384.58 453.44 394.93 363.14 394.93 261.13'),
    ],
    jonctions: [[0, 1, 'naissance de l’épaule']],
  },
  s: {
    traits: [
      t('M82.37 85.86 C152.79 -87.08 503.28 -17.08 394.56 167.2 C353.04 237.57 293.11 229.93 222.78 239.37 C160.32 247.76 83.32 277.1 88.13 353.14 C94 445.82 174.71 459.75 249.56 459.75 C313.83 459.75 385.49 439.2 405.48 369.25'),
    ],
    jonctions: [],
  },
  t: {
    traits: [
      t('M205.11 579 L205.37 91.59 C205.4 36.96 222.78 0.11 283.01 -0.11 L395.55 -0.52'),
      t('M67.36 452.44 L399.66 452.44'),
    ],
    jonctions: [[0, 1, 'barre']],
  },
  u: {
    traits: [
      t('M107.26 451.78 L107.26 144.94 C107.26 59.97 155 -7.51 246.25 -6.72 C337.47 -5.93 385.39 58.57 385.51 145.07 L385.9 452.04'),
    ],
    jonctions: [],
  },
  v: {
    traits: [
      t('M92.83 451.51 L245.69 0.77'),
      t('M247.13 0.83 L399.48 451.68'),
    ],
    jonctions: [[0, 1, 'pointe']],
  },
  w: {
    traits: [
      t('M60.24 448.66 C67.69 408.38 156.74 19.37 147.66 0.58'),
      t('M147.66 0.58 C214.39 138.73 189.56 303.51 250.62 437.66'),
      t('M250.6 437.6 L330.97 46.15 L349.1 6.39'),
      t('M349.1 6.39 L432.91 451.84'),
    ],
    jonctions: [[0, 1, 'premier creux'], [1, 2, 'sommet'], [2, 3, 'second creux']],
  },
  x: {
    traits: [
      t('M97.18 451.82 L406.2 -0.52'),
      t('M86.04 -1.18 L398.03 451.93'),
    ],
    jonctions: [[0, 1, 'croisée']],
  },
  y: {
    traits: [
      t('M86.68 452.64 L252.88 39.34'),
      t('M406.55 452.48 L183.21 -147.97'),
    ],
    jonctions: [[0, 1, 'fourche']],
  },
  z: {
    traits: [
      t('M106.44 452.57 L379.83 452.57'),
      t('M379.83 452.57 L103.27 -0.48'),
      t('M103.27 -0.48 L395.14 -0.48'),
    ],
    jonctions: [[0, 1, 'haut'], [1, 2, 'bas']],
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

/** Les 52 glyphes, gelés. */
export const GLYPHES = Object.freeze(G);

/** Les 26 capitales, dans l'ordre alphabétique. */
export const CAPITALES = Object.freeze([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
/** Les 26 bas de casse. */
export const BAS_DE_CASSE = Object.freeze([...'abcdefghijklmnopqrstuvwxyz']);

export default GLYPHES;
