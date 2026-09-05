/**
 * ★ Définition vectorielle des 52 glyphes — format normatif CONTRACTS §2.4.
 *
 * **Règle structurelle du projet (CONTRACTS §0.3) :** les tables `traits`,
 * `extremites` et `boucles` ne sont *pas* saisies à la main, elles sont
 * **calculées** depuis ce fichier (`derivees.js`). Le moteur visuel dessine ces
 * mêmes sous-chemins (`countStrokes`, `src/visuel/glyphes.js`) : ce que le
 * spectateur voit est donc littéralement ce qui a été compté.
 *
 * ★ **CE FICHIER N'EST PLUS DESSINÉ, IL EST RELEVÉ.** Le bloc entre les deux
 *   marqueurs `⟨engendré⟩` sort de `src/gfx/jetbrains-axe.py --adopter`
 *   (`npm run glyphes:adopter`) : c'est JetBrains Mono lue à la graisse où son
 *   encre s'annule, avec la topologie que les recettes DÉCLARENT taillée dedans.
 *   Le reste — cet en-tête, la tolérance, les métriques, le gel — reste écrit à
 *   la main, parce qu'il énonce un CONTRAT et non une géométrie.
 *
 * ⚠️ **L'ADOPTION N'EST PAS DANS `npm run glyphes`, ET C'EST VOULU.** Regénérer
 *   l'axe ne coûte rien ; repeindre cette table déplace des scores, puisque
 *   `mtrb`, `mexb` et `mbob` facturent ses trois comptes. C'est un arbitrage
 *   explicite, jamais l'effet de bord d'un build.
 *
 * ## Repère
 *
 * Grille normalisée, **origine en bas à gauche, y vers le haut** :
 * `0..493,2` en largeur — l'AVANCE de la police, voir `METRIQUES` — et `0..600`
 * en hauteur de capitale. Les bas de casse ont leur hauteur d'x à `452,1`,
 * montent à `600` pour les hampes (b d f h k l t) et descendent jusqu'à `-150`
 * pour les jambages (g j p q y). Les rondes DÉBORDENT de ces lignes, de huit
 * unités en haut et jusqu'à treize en bas (le `s`) : c'est le débord optique,
 * et une police qui ne le ferait pas paraîtrait bancale.
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
 * ## Ce qui se déclare, et ce qui se mesure
 *
 * ★ **LA POLICE N'A QUE DES CONTOURS : elle ne sait pas combien de traits fait
 *   une lettre, ni où le crayon se lève.** Cette lecture-là est déclarée par les
 *   recettes (`src/gfx/jetbrains-traces.py`), et elle seule :
 *
 * - le crayon se lève aux **POINTES**, pas aux coins. Le `v` fait deux traits,
 *   le `w` quatre, le `z` trois — la direction y rebrousse ; le `l` en fait un
 *   seul pour deux angles droits, et le `k` un seul pour sa jambe coudée. Un
 *   homographe se compte pareil dans les deux casses, ce qui vaut au `V`, au
 *   `W` et au `Z` le découpage de leurs minuscules ;
 * - `A` **pointu**, `Q` à queue **tangente**, `J` **sans barre supérieure** ;
 * - `g` **à un seul étage** — son creux monte à 89 % de la hauteur du glyphe,
 *   c'est une panse pleine. Le `a`, dont le creux s'arrête à 46 %, en est sorti ;
 * - les points du `i` et du `j` **comptent** : un sous-chemin dégénéré
 *   (`M x y L x y`, rendu par un `stroke-linecap: round`) vaut **1 trait et
 *   1 extrémité** — un point n'a qu'une extrémité ;
 * - le **BUDGET** de chaque signe — combien de nœuds, combien de poignées —
 *   est dicté lettre par lettre par l'auteur, et vit lui aussi avec les
 *   recettes. Il commande à la pose : c'est lui qui dit si une passe a le droit
 *   d'ajouter un nœud.
 *
 * ⚠️ **LE RESTE VIENT DE LA POLICE, ET NE SE NÉGOCIE PAS.** Les EXTRÉMITÉS, en
 *   particulier : « n'adapte pas le tracé pour correspondre au compte que tu as.
 *   Le `i`, oui, il a une extrémité de plus, c'est sur la police, n'essaie pas
 *   de tricher. Pareil pour g d b p q » (l'auteur). Deux conventions y ont
 *   laissé leur peau, et elles sont déclarées dans `derivees.js › ECARTS` :
 *   le `I` **sans empattement** — JetBrains Mono lui en donne deux —, et les
 *   fûts de `M` et `N` **dépassant la jonction des diagonales**, qui faisaient
 *   tomber le compte de la recherche au prix de deux pointes invisibles.
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
      t('M75.32 2.35 L246.71 598.03'),
      t('M246.71 598.03 L416.34 -0.69'),
      t('M129.25 194.38 L361.36 189.17'),
    ],
    jonctions: [[0, 1, 'sommet'], [0, 2, 'barre gauche'], [1, 2, 'barre droite']],
  },
  B: {
    traits: [
      t('M109.3 0.93 L110.5 598.29'),
      t('M110.5 598.29 C231.58 599.07 392.85 620.08 392.85 450.31 C392.85 280.53 231.38 304.04 109.16 303.99'),
      t('M109.16 304 C234.57 303.88 407.95 333.68 407.95 157.09 C407.95 -18.28 235.6 0.97 109.3 0.93'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille haute'], [0, 2, 'taille basse'], [0, 2, 'pied']],
  },
  C: {
    traits: [
      t('M414.02 444.86 C410.62 539.91 345.63 613.82 246.65 607.47 C149.92 607.47 107.07 529.46 107.07 439.63 L107.06 142.14 C107.05 -52.43 406.9 -67.91 414.04 155.39'),
    ],
    jonctions: [],
  },
  D: {
    traits: [
      t('M110.78 2.85 L111.06 597.35'),
      t('M111.06 597.35 L214.76 598.2 C316.01 598.2 389.2 516.27 389.25 415.76 L389.37 166.79 C389.41 71.51 308.4 0.73 213.98 1.74 L110.78 2.85'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied']],
  },
  E: {
    traits: [
      t('M119.86 0.59 L119.86 599.11'),
      t('M119.86 599.11 L408.9 599.59'),
      t('M119.71 311.2 L380.14 311.2'),
      t('M119.86 0.59 L408.9 0.59'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu'], [0, 3, 'barre du bas']],
  },
  F: {
    traits: [
      t('M115.53 0 L115.89 599.11'),
      t('M115.89 599.11 L431.51 599.54'),
      t('M115.53 307.29 L393.49 307.29'),
    ],
    jonctions: [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu']],
  },
  G: {
    traits: [
      t('M410.77 443.87 C394.13 527.35 369 607.52 262.81 607.52 C74.28 607.52 103.77 433.61 103.77 302.07 C103.77 174.41 73.54 -7.17 259.02 -7.17 C423.17 -7.17 410.96 161.15 403.91 280.18'),
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
      t('M414.11 596.61 L280.27 305.04 L422.8 -0.2'),
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
      t('M110.65 600.27 L382.68 0.4'),
      t('M382.68 0.4 L382.85 599.77'),
    ],
    jonctions: [[0, 1, 'sommet gauche'], [1, 2, 'pied droit']],
  },
  O: {
    traits: [
      ferme('M171.86 10.34 C254.27 -37.39 368.68 7.81 385.58 104.96 C390.92 135.6 389.34 167.07 389.34 198.03 L389.36 304.66 C389.38 419.27 418.59 595.97 255.95 608.32 C249.87 608.78 243.73 608.78 237.65 608.34 C74.49 596.44 103.83 419.16 103.83 304.46 L103.82 198.21 C103.82 128.03 102.51 50.51 171.86 10.34'),
    ],
    jonctions: [],
  },
  P: {
    traits: [
      t('M109.05 0 L110.38 598.42'),
      t('M110.38 598.42 C237.39 599.01 425.57 627.74 425.57 446.18 C425.57 263.65 238.34 291.88 109.05 291.88'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'pied de la panse']],
  },
  Q: {
    traits: [
      ferme('M233.11 -7.02 C381.44 -22.28 381.16 107.19 381.16 212.75 L381.16 369.75 C381.16 468.82 388.2 607.21 247.97 607.21 C102.99 607.21 111.99 477.3 111.99 372.83 L111.99 215.83 C111.99 118.11 108.53 -3.36 241.41 -7.12 L294.18 -3.53 L233.11 -7.02'),
      t('M308.98 -0.09 L400.98 -146.64'),
    ],
    jonctions: [[0, 1, 'queue']],
  },
  R: {
    traits: [
      t('M108.33 0 L109.8 598.53'),
      t('M109.8 598.53 L244.59 598.97 C345.26 598.97 422.46 554.23 422.46 445.81 C425.22 339.46 339.87 289.6 244.61 290.35 L108.33 291.44'),
      t('M254.08 290.68 L419.4 -0.33'),
    ],
    jonctions: [[0, 1, 'haut'], [0, 1, 'taille'], [1, 2, 'naissance de la jambe']],
  },
  S: {
    traits: [
      t('M409.06 453.72 C402.59 705.21 14.5 619.18 118.45 408.04 C178.78 285.49 346.86 332.97 398.27 192.51 C483.22 -39.53 91.1 -88.55 82.53 156.31'),
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
      t('M107.26 599.69 L107.27 144.77 C107.27 63.94 162.52 -6.78 246.83 -6.78 C331.74 -8.42 385.44 65.88 385.51 144.77 L385.9 599.68'),
    ],
    jonctions: [],
  },
  V: {
    traits: [
      t('M77.81 596.81 L247.31 5.59'),
      t('M247.31 5.59 L419.93 600.96'),
    ],
    jonctions: [[0, 1, 'pointe']],
  },
  W: {
    traits: [
      t('M52.71 599.8 L143 -0.69'),
      t('M143 -0.69 L250.03 594.94'),
      t('M250.03 594.94 L353.57 5.48'),
      t('M353.57 5.48 L437.54 597.15'),
    ],
    jonctions: [[0, 1, 'pointe gauche'], [1, 2, 'sommet médian'], [2, 3, 'pointe droite']],
  },
  X: {
    traits: [
      t('M58.93 4.38 L419.48 601.16'),
      t('M73.97 602.09 L434.36 6.2'),
    ],
    jonctions: [[0, 1, 'croisée']],
  },
  Y: {
    traits: [
      t('M59.45 597.5 L246.58 234.27'),
      t('M246.58 234.27 L246.58 0.57'),
      t('M433.28 597.4 L247.44 238.7'),
    ],
    jonctions: [[0, 1, 'fourche'], [1, 2, 'fourche']],
  },
  Z: {
    traits: [
      t('M75.29 598.91 L403.28 599.01'),
      t('M403.28 599.01 L80.29 0.41'),
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
      ferme('M108.25 300.24 C108.91 389.48 152.98 465.28 251.06 458.7 C336.1 453 388.06 381.78 388.15 299.92 L388.34 135.34 C388.43 52.54 317.09 -15.98 231.26 -7.26 C147.43 1.25 108.9 65.61 108.25 152.24 L108.25 300.24'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  c: {
    traits: [
      t('M400.42 311.35 C379.03 422.43 358.62 457.18 235.49 457.18 C121.13 457.18 116.71 323.59 116.71 244.48 C116.71 160.45 106.19 -5.06 235.54 -5.06 C359.02 -5.06 379.03 29.12 400.28 147.19'),
    ],
    jonctions: [],
  },
  d: {
    traits: [
      t('M385.07 0.39 L385.07 599.61'),
      ferme('M385.07 300.11 C383.96 390.93 333.64 466.14 241.86 459.52 C104.7 459.52 104.79 326.92 104.79 224.96 C104.79 122.39 104.64 -7.58 242.41 -7.58 C317.53 -7.58 365.89 37.78 385.07 102.03 L385.07 300.11'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  e: {
    traits: [
      t('M109 238.4 L382.85 238.9'),
      t('M382.85 238.9 C384.62 344.03 378.92 457.11 247.75 457.11 C155.7 457.11 109.08 387.22 109.04 301.43 L108.95 136.88 C108.9 46.34 165.32 -12.92 259.42 -6.68 C319.12 -6.68 362.35 38.02 379.17 93.9'),
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
      ferme('M385.71 305.79 C384.58 388.03 342.4 459.8 252.61 459.8 C120.07 459.8 103.77 355.08 103.77 249.38 C103.77 220.35 102.5 190.95 106.89 162.15 C117.88 90.06 175.04 36.84 250.31 36.84 C329.2 36.84 376.61 92.15 386.41 164.75 L385.71 305.79'),
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
      t('M106.85 452.44 L328.85 452.44 L329.86 -21.56 C330.02 -97.27 285.37 -147.83 208.72 -147.83 L110.96 -148.47'),
      t('M328.85 580.48 L328.85 580.48'),
    ],
    jonctions: [],
  },
  k: {
    traits: [
      t('M113.01 0 L113.01 599.99'),
      t('M113.01 238.06 L249.02 236.37'),
      t('M400.35 449.2 L245.46 238.86 L410.74 -0.42'),
    ],
    jonctions: [[0, 1, 'naissance du bras'], [1, 2, 'fourche']],
  },
  l: {
    traits: [
      t('M61.64 600.4 L198.73 600.4 L199.33 87.49 C199.42 7.99 255.48 -0.51 320.83 -0.51 L433.56 -0.51'),
    ],
    jonctions: [],
  },
  m: {
    traits: [
      t('M78.72 0 L78.72 452.05'),
      t('M78.72 374.72 C83.39 417.39 99.32 450.71 150.67 457.45 C210.53 457.45 239.88 413.21 239.91 361.25 L240.09 0'),
      t('M242.45 372.45 C254.87 485.9 415.16 483.75 415.22 359.83 L415.4 -1.42'),
    ],
    jonctions: [[0, 1, 'première arche'], [1, 2, 'seconde arche']],
  },
  n: {
    traits: [
      t('M108.9 0 L108.9 451.72'),
      t('M108.9 337.39 C142.16 518.14 385.19 488.57 385.45 310.99 L385.9 0.04'),
    ],
    jonctions: [[0, 1, 'naissance de l’arche']],
  },
  o: {
    traits: [
      ferme('M250.3 -10.6 C349.22 -8.66 385.3 68.51 385.27 155.86 L385.19 329.94 C385.16 404.86 323.6 462.19 246.68 462.19 C148.16 462.19 107.89 384.81 107.89 296.93 L107.88 139.18 C107.87 55.89 162.45 -12.32 250.3 -10.6'),
    ],
    jonctions: [],
  },
  p: {
    traits: [
      t('M108.9 -147.95 L108.9 451.76'),
      ferme('M108.9 349.3 C125.45 412.71 169.88 459.76 246.06 459.76 C342.06 459.76 388.34 379.4 388.34 289.6 L388.32 139.63 C388.31 59.29 324.61 -7.68 238.57 -7.68 C187.2 -7.68 152.02 12.2 108.9 93.55 L108.9 349.3'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  q: {
    traits: [
      t('M385.19 -147.95 L385.19 452.05'),
      ferme('M385.19 356.68 C341.54 440.38 304.97 459.86 252.38 459.86 C156.16 464.26 104.81 374.55 104.81 286.91 L104.81 150.92 C104.81 68.38 164.73 -11.58 251.91 -7.79 C304.97 -7.79 341.03 11.23 385.19 96.08 L385.19 356.68'),
    ],
    jonctions: [[0, 1, 'panse']],
  },
  r: {
    traits: [
      t('M129.04 0 L129.04 452.01'),
      t('M129.04 337.89 C130.6 407.91 194.77 463.33 263.36 459.69 C384.19 459.69 394.93 359.85 394.93 261.13'),
    ],
    jonctions: [[0, 1, 'naissance de l’épaule']],
  },
  s: {
    traits: [
      t('M82.09 86.56 C112.85 9.44 177.49 -8.73 251.32 -8.73 C304.13 -8.73 359.38 -10.36 392.68 38.68 C408.44 61.88 416.98 93.82 411.67 121.79 C387.68 248.01 280.78 223.55 189.83 245.49 C31.68 283.64 68.87 458.21 216.2 459.56 C291.17 460.24 380.22 457.63 405.48 369.25'),
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
      t('M107.26 451.78 L107.26 144.94 C107.26 59.97 155 -7.51 246.25 -6.72 C337.47 -6.72 385.39 58.57 385.51 145.07 L385.9 452.04'),
    ],
    jonctions: [],
  },
  v: {
    traits: [
      t('M92.83 451.51 L246.41 0.8'),
      t('M246.41 0.8 L399.48 451.68'),
    ],
    jonctions: [[0, 1, 'pointe']],
  },
  w: {
    traits: [
      t('M60.24 448.66 L147.66 0.58'),
      t('M147.66 0.58 L250.61 437.63'),
      t('M250.61 437.63 L349.1 6.39'),
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
