/**
 * Assets vectoriels appartenant au moteur visuel : afficheurs 7 et 14 segments,
 * clavier (quatre rangées, AZERTY ou QWERTY), tables de correspondance
 * (réglette, grille, pavé téléphonique).
 *
 * Ce ne sont **pas** des tables arithmétiques : la valeur (quels segments sont
 * allumés, quelle touche porte le `-`, quelle colonne porte le `p`) vient
 * toujours du scénario, donc du moteur arithmétique. Ici on ne décide que de la
 * géométrie du dessin — et la primitive `keyboard` refuse d'afficher un nombre
 * qui contredirait celui du scénario.
 *
 * Tout est exprimé dans le même repère que `glyphes.js` — grille `0..400` en
 * largeur, `0..600` en hauteur, **origine en bas à gauche** — pour partager la
 * transformation d'entrée `glyphTransform()`.
 */

import { CAP_RATIO, FONT_SIZE, ADVANCE_RATIO, VIEWBOX } from './constants.js';

export const GLYPH_BOX = { w: 400, h: 600 };

/**
 * Transformation statique repère-glyphe → repère local d'un nœud (centre en 0,0,
 * y vers le bas). Posée en **attribut** sur un `<g>` interne : elle n'est jamais
 * animée, donc elle n'entre pas en conflit avec la propriété CSS `transform`
 * du nœud (recherche §5.3).
 */
export function glyphTransform(fontSize) {
  const s = (fontSize * CAP_RATIO) / GLYPH_BOX.h;
  const a = -(GLYPH_BOX.w / 2) * s;
  const b = (GLYPH_BOX.h / 2) * s;
  return { transform: `translate(${round(a)} ${round(b)}) scale(${round(s)} ${round(-s)})`, scale: s };
}

/** Largeur d'un glyphe dessiné, en unités viewBox. */
export function glyphWidth(fontSize) {
  return GLYPH_BOX.w * ((fontSize * CAP_RATIO) / GLYPH_BOX.h);
}

/**
 * Point du repère glyphe (y vers le haut) → repère local du nœud (y vers le bas,
 * centre en 0,0). Même transformation que `glyphTransform`, en arithmétique :
 * sert à poser badges et marqueurs sans jamais lire le DOM.
 */
export function glyphToLocal(p, fontSize) {
  const s = (fontSize * CAP_RATIO) / GLYPH_BOX.h;
  return { x: round(s * (p.x - GLYPH_BOX.w / 2)), y: round(s * (GLYPH_BOX.h / 2 - p.y)) };
}

// ---------------------------------------------------------------------------
// Afficheur 7 segments
// ---------------------------------------------------------------------------

const SEG_L = 90; const SEG_R = 310;
const SEG_B = 70; const SEG_M = 300; const SEG_T = 530;

/**
 * Géométrie des 7 segments (nommage standard a..g, cf. moteur-arithmetique §3.3).
 * `stroke` est l'identifiant de **trait continu fusionné** : `b`+`c` (verticale
 * droite) et `e`+`f` (verticale gauche) sont colinéaires et adjacentes, donc
 * fusionnées ; `a`, `d`, `g` sont trois horizontales disjointes.
 * C'est exactement la règle qui produit H=3, O=4, P=4, E=4.
 */
export const SEGMENTS = Object.freeze({
  a: { d: `M ${SEG_L} ${SEG_T} L ${SEG_R} ${SEG_T}`, stroke: 'a' },
  b: { d: `M ${SEG_R} ${SEG_T} L ${SEG_R} ${SEG_M}`, stroke: 'bc' },
  c: { d: `M ${SEG_R} ${SEG_M} L ${SEG_R} ${SEG_B}`, stroke: 'bc' },
  d: { d: `M ${SEG_L} ${SEG_B} L ${SEG_R} ${SEG_B}`, stroke: 'd' },
  e: { d: `M ${SEG_L} ${SEG_M} L ${SEG_L} ${SEG_B}`, stroke: 'ef' },
  f: { d: `M ${SEG_L} ${SEG_T} L ${SEG_L} ${SEG_M}`, stroke: 'ef' },
  g: { d: `M ${SEG_L} ${SEG_M} L ${SEG_R} ${SEG_M}`, stroke: 'g' },
});

export const SEGMENT_ORDER = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

/** Traits continus obtenus par fusion des segments allumés (borne supérieure : 5). */
export function fusedStrokes(segments) {
  const on = new Set([...String(segments)]);
  const strokes = [];
  for (const name of ['a', 'd', 'g']) if (on.has(name)) strokes.push(name);
  if (on.has('b') || on.has('c')) strokes.push('bc');
  if (on.has('e') || on.has('f')) strokes.push('ef');
  return strokes;
}

// ---------------------------------------------------------------------------
// Afficheur 14 segments
// ---------------------------------------------------------------------------

/**
 * Géométrie des 14 segments (nommage standard `a b c d e f g1 g2 h i j k l m`,
 * cf. `src/moteur/tables/seg14.js`). Même cadre extérieur que le sept segments
 * — les deux afficheurs ont exactement la même taille à l'écran.
 *
 * ★ **Ce dessin porte la règle de fusion.** Les segments colinéaires et
 * adjacents se touchent EXACTEMENT, si bien qu'un trait fusionné se voit comme
 * une ligne continue : `e`+`f` et `b`+`c` (les verticales de côté), `g1`+`g2`
 * (la médiane, scindée par le moyeu), `i`+`l` (la verticale centrale).
 *
 * Les quatre diagonales, elles, visent les **flancs** de la verticale centrale
 * (`SEG14_HX`), jamais son axe : `h` et `k` convergent à gauche du moyeu, `j`
 * et `m` à droite. `h` et `m` sont donc parallèles et DÉCALÉES — deux traits,
 * jamais un. C'est la raison géométrique pour laquelle les diagonales ne
 * fusionnent avec rien, et `tests/primitives.test.js` la vérifie sur les
 * coordonnées plutôt que sur la parole.
 */
const S14_HX = 24;   // demi-largeur du moyeu : où visent les diagonales
const S14_DX = 53;   // course horizontale d'une diagonale
const S14_DY = 196;  // course verticale d'une diagonale
const S14_HL = 200 - S14_HX; // flanc gauche du moyeu
const S14_HR = 200 + S14_HX; // flanc droit
const S14_HAUT = SEG_M + S14_DY;  // sommet des segments intérieurs
const S14_BAS = SEG_M - S14_DY;   // et leur pied

export const SEGMENTS14 = Object.freeze({
  a: { d: `M ${SEG_L} ${SEG_T} L ${SEG_R} ${SEG_T}`, stroke: 'a' },
  b: { d: `M ${SEG_R} ${SEG_T} L ${SEG_R} ${SEG_M}`, stroke: 'bc' },
  c: { d: `M ${SEG_R} ${SEG_M} L ${SEG_R} ${SEG_B}`, stroke: 'bc' },
  d: { d: `M ${SEG_L} ${SEG_B} L ${SEG_R} ${SEG_B}`, stroke: 'd' },
  e: { d: `M ${SEG_L} ${SEG_M} L ${SEG_L} ${SEG_B}`, stroke: 'ef' },
  f: { d: `M ${SEG_L} ${SEG_T} L ${SEG_L} ${SEG_M}`, stroke: 'ef' },
  g1: { d: `M ${SEG_L} ${SEG_M} L 200 ${SEG_M}`, stroke: 'g' },
  g2: { d: `M 200 ${SEG_M} L ${SEG_R} ${SEG_M}`, stroke: 'g' },
  h: { d: `M ${S14_HL - S14_DX} ${S14_HAUT} L ${S14_HL} ${SEG_M}`, stroke: 'h' },
  i: { d: `M 200 ${S14_HAUT} L 200 ${SEG_M}`, stroke: 'il' },
  j: { d: `M ${S14_HR + S14_DX} ${S14_HAUT} L ${S14_HR} ${SEG_M}`, stroke: 'j' },
  k: { d: `M ${S14_HL - S14_DX} ${S14_BAS} L ${S14_HL} ${SEG_M}`, stroke: 'k' },
  l: { d: `M 200 ${S14_BAS} L 200 ${SEG_M}`, stroke: 'il' },
  m: { d: `M ${S14_HR + S14_DX} ${S14_BAS} L ${S14_HR} ${SEG_M}`, stroke: 'm' },
});

export const SEGMENT14_ORDER = Object.freeze(
  ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm'],
);

/**
 * Épaisseur de trait de l'afficheur 14 segments, en unités du repère glyphe.
 * Plus fine que celle du sept segments (56) : quatorze segments dans le même
 * cadre, dont quatre diagonales qui se croisent près du moyeu — au trait épais,
 * le dessin se referme sur lui-même. 34 reprend la proportion de DSEG14
 * Classic (≈ 15 % de la largeur de l'afficheur).
 */
export const SEG14_STROKE = 34;

/**
 * Traits continus obtenus par fusion des segments allumés (borne : 10).
 * ★ MIROIR de `traitsFusionnes14` (`src/moteur/tables/seg14.js`) — le moteur
 * visuel n'importe pas les tables arithmétiques, il redessine ce qu'on lui
 * demande de montrer, et le contrôle croisé `count` de la primitive refuse
 * d'allumer un nombre de traits différent de celui qu'annonce l'arithmétique.
 */
export function fusedStrokes14(segments) {
  const on = new Set(segments);
  const strokes = [];
  for (const name of ['a', 'd']) if (on.has(name)) strokes.push(name);
  if (on.has('g1') || on.has('g2')) strokes.push('g');
  if (on.has('b') || on.has('c')) strokes.push('bc');
  if (on.has('e') || on.has('f')) strokes.push('ef');
  if (on.has('i') || on.has('l')) strokes.push('il');
  for (const name of ['h', 'j', 'k', 'm']) if (on.has(name)) strokes.push(name);
  return strokes;
}

// ---------------------------------------------------------------------------
// Les mêmes segments, dessinés PAR LA POLICE — pour le comptage individuel
// ---------------------------------------------------------------------------
//
// ★ Deux géométries, deux régimes de lecture, et ce n'est pas une redondance.
//
// · **Fusion** (`m7F`, `m14F`) : on montre que `b` et `c` n'en font qu'un. Les
//   segments sont donc des traits d'AXE, colinéaires et jointifs, et on les
//   voit se souder. C'est ce que portent `SEGMENTS` et `SEGMENTS14` ci-dessus.
//
// · **Comptage individuel** (`m7`, `m14`) : on les compte un par un. Deux
//   segments qui se recouvrent seraient deux choses comptées pour une seule
//   vue ; ils doivent être DISJOINTS. Et tant qu'à les montrer séparément,
//   autant montrer ceux de la police que Le Registre affiche vraiment.
//
// Ce qui suit est donc DÉRIVÉ de DSEG7 et DSEG14 Classic, contour par contour,
// par `src/gfx/dseg-segments.py` — la même méthode que `dseg14-table.py` pour
// la table du quatorze segments. Ne le modifiez pas à la main : relancez
// `bun run segments`, et la CI vérifie que le bloc n'a pas dérivé.
/* dseg:début */
/**
 * Les segments **tels que les dessine la police** — un polygone plein par
 * segment, disjoint de ses voisins, dans le repère glyphe (0..400 × 0..600,
 * origine en bas à gauche).
 *
 * ★ DÉRIVÉ, jamais saisi : `src/gfx/dseg-segments.py` relève chaque contour
 * fermé des polices DSEG et le transpose par une similitude. Relancez le
 * script pour vérifier que ce bloc n’a pas dérivé — la CI le fait.
 *
 * Ces tracés servent au COMPTAGE INDIVIDUEL (`m.seg7`, `m.seg14`), où deux
 * segments
 * qui se recouvrent seraient deux choses comptées pour une seule vue. Le
 * régime de FUSION garde les traits d’axe de `SEGMENTS` / `SEGMENTS14` : là,
 * il FAUT que les colinéaires se soudent.
 */
// DSEG7 Classic-Regular Version 0.46 — segments pleins, disjoints.
export const SEGMENTS_DSEG7 = Object.freeze({
  a: { d: 'M 95.77 510.01 L 304.23 510.01 L 336.22 542 L 320.23 558 L 79.77 558 L 63.78 542 Z' },
  b: { d: 'M 345.51 305.16 L 359.44 305.16 L 359.44 518.78 L 343.45 534.78 L 311.46 502.79 L 311.46 338.7 L 342.93 307.22 Z' },
  c: { d: 'M 343.45 65.22 L 359.44 81.22 L 359.44 294.32 L 345.51 294.32 L 342.93 292.26 L 311.46 260.78 L 311.46 97.21 Z' },
  d: { d: 'M 79.77 42 L 320.23 42 L 336.22 58 L 304.23 89.99 L 95.77 89.99 L 63.78 58 Z' },
  e: { d: 'M 56.55 65.22 L 88.54 97.21 L 88.54 260.78 L 56.55 292.26 L 54.49 294.84 L 40.56 294.84 L 40.56 81.22 Z' },
  f: { d: 'M 40.56 305.16 L 54.49 305.16 L 56.55 307.74 L 88.54 339.22 L 88.54 502.79 L 56.55 534.78 L 40.56 518.78 Z' },
  g: { d: 'M 88.54 275.75 L 88.54 276.26 L 311.46 276.26 L 311.46 275.75 L 335.71 299.48 L 311.46 323.74 L 88.54 323.74 L 88.54 324.25 L 63.78 300 Z' },
});

// DSEG14 Classic-Regular Version 0.46 — segments pleins, disjoints.
export const SEGMENTS_DSEG14 = Object.freeze({
  a: { d: 'M 95.77 510.01 L 304.23 510.01 L 336.22 542 L 320.23 558 L 79.77 558 L 63.78 542 Z' },
  b: { d: 'M 345.51 305.16 L 359.44 305.16 L 359.44 518.78 L 343.45 534.78 L 311.46 502.79 L 311.46 338.7 L 342.93 307.22 Z' },
  c: { d: 'M 343.45 65.22 L 359.44 81.22 L 359.44 294.32 L 345.51 294.32 L 342.93 292.26 L 311.46 260.78 L 311.46 97.21 Z' },
  d: { d: 'M 79.77 42 L 320.23 42 L 336.22 58 L 304.23 89.99 L 95.77 89.99 L 63.78 58 Z' },
  e: { d: 'M 56.55 65.22 L 88.54 97.21 L 88.54 260.78 L 56.55 292.26 L 54.49 294.84 L 40.56 294.84 L 40.56 81.22 Z' },
  f: { d: 'M 40.56 305.16 L 54.49 305.16 L 56.55 307.74 L 88.54 339.22 L 88.54 502.79 L 56.55 534.78 L 40.56 518.78 Z' },
  g1: { d: 'M 88.54 275.75 L 88.54 276.26 L 179.88 276.26 L 193.81 300 L 179.88 323.74 L 88.54 323.74 L 88.54 324.25 L 63.78 300 Z' },
  g2: { d: 'M 311.46 275.75 L 335.71 299.48 L 311.46 323.74 L 220.12 323.74 L 206.19 300 L 220.12 276.26 L 311.46 276.26 Z' },
  h: { d: 'M 152.53 334.57 L 165.43 334.57 L 165.43 407.84 L 112.28 499.69 L 98.86 499.69 L 98.86 426.94 Z' },
  i: { d: 'M 200 310.84 L 223.74 352.12 L 223.74 499.69 L 176.26 499.69 L 176.26 352.12 Z' },
  j: { d: 'M 234.57 334.57 L 247.47 334.57 L 301.14 426.94 L 301.14 499.69 L 287.72 499.69 L 234.57 407.84 Z' },
  k: { d: 'M 98.86 100.31 L 112.28 100.31 L 165.43 192.16 L 165.43 265.43 L 152.53 265.43 L 98.86 173.06 Z' },
  l: { d: 'M 176.26 100.31 L 223.74 100.31 L 223.74 247.88 L 200 289.16 L 176.26 247.88 Z' },
  m: { d: 'M 287.72 100.31 L 301.14 100.31 L 301.14 173.06 L 247.47 265.43 L 234.57 265.43 L 234.57 192.16 Z' },
});
/* dseg:fin */

// ---------------------------------------------------------------------------
// Le « 6 » de JetBrains Mono — le calage des cornes
// ---------------------------------------------------------------------------
//
// ★ Même doctrine que le bloc ci-dessus, appliquée cette fois à la police de la
// SCÈNE. Les cornes du 666 ne sont pas posées « au-dessus des 6 » : elles sont
// calées sur le dessin du chiffre, et l'écartement qui les y amène est une
// coïncidence géométrique, pas un réglage à l'œil. Les trois nombres qui la
// définissent sont donc relevés sur le contour par
// `src/gfx/jetbrains-six.py` ; ne les modifiez pas à la main, relancez
// `bun run segments` — et la CI vérifie que le bloc n'a pas dérivé.
/* six:début */
/**
 * La BARRE HAUTE du « 6 », relevée sur le contour de JetBrains Mono.
 *
 * ★ DÉRIVÉE, jamais saisie : `src/gfx/jetbrains-six.py` cherche dans le contour
 * le segment horizontal le plus haut — le sommet plat de la barre — et le
 * segment droit qui en part. Relancez le script pour vérifier que ce bloc n’a
 * pas dérivé ; la CI le fait (`bun run segments:check`).
 *
 * ★ À quoi ça sert. `primitives/horns.js` y CALE les deux cornes du 666 : la
 * corne de droite pousse dans le prolongement exact du flanc droit de la barre
 * du 6 de droite, et la corne de gauche vient toucher le sommet de celle du 6
 * de gauche. Sans ces trois nombres, l’écartement des cornes serait un réglage
 * à l’œil — c’est-à-dire quelque chose qu’on rerègle, et qui se déplace.
 *
 * Unités : des **em**, donc multipliables par `fontSize`. `sommetX` et
 * `gaucheX` se comptent depuis l’ORIGINE du glyphe (le bord gauche de sa
 * chasse), pas depuis son centre : c’est au consommateur de retrancher la
 * demi-chasse RÉELLE (`metrics.advance`, recalibrée sur la police servie).
 * `sommetY` se compte au-dessus de la ligne de base, et vaut la hauteur de
 * capitale — le script échoue si ce n’est plus vrai.
 */
// JetBrains Mono Regular Version 2.211 — « 6 », wght 400.
export const SIX_BARRE = Object.freeze({
  sommetX: 0.413,       // sommet DROIT de la barre — le point que les cornes touchent
  sommetY: 0.73,        // = hauteur de capitale : la « ligne de crâne »
  gaucheX: 0.313,       // sommet gauche : la barre fait 0.1 em de large
  pente: 0.623494,      // dx/dy du flanc droit, EN MONTANT (vers la droite)
  chasse: 0.6,          // la chasse de la police, pour mémoire
});
/* six:fin */

// ---------------------------------------------------------------------------
// Le clavier — quatre rangées, deux dispositions
// ---------------------------------------------------------------------------

/**
 * Rangée haute d'un clavier AZERTY (source primaire : `/usr/share/X11/xkb/symbols/fr`,
 * ligne AE06 — le `-` partage bien la touche du `6`).
 * Ordre : chiffre (avec Maj), caractère en frappe directe.
 */
export const AZERTY_ROW = Object.freeze([
  { digit: '1', char: '&' }, { digit: '2', char: 'é' }, { digit: '3', char: '"' },
  { digit: '4', char: "'" }, { digit: '5', char: '(' }, { digit: '6', char: '-' },
  { digit: '7', char: 'è' }, { digit: '8', char: '_' }, { digit: '9', char: 'ç' },
  { digit: '0', char: 'à' },
]);

/**
 * Rangée haute d'un QWERTY US : la frappe directe donne le chiffre lui-même,
 * et c'est le symbole shifté qui est le second label. La touche `6` y porte un
 * accent circonflexe — le « tiret du 6 » est une spécificité française
 * (research/moteur-arithmetique §3.2).
 */
export const QWERTY_ROW = Object.freeze(
  [...'1234567890'].map((d, i) => ({ digit: d, char: d, shift: '!@#$%^&*()'[i] })),
);

/**
 * Les trois rangées de lettres.
 *
 * ★ **Miroir de `src/moteur/tables/claviers.js`** (`AZERTY` / `QWERTY`). Le
 * moteur visuel n'importe pas les tables arithmétiques : il redessine ce qu'on
 * lui demande de montrer. La désynchronisation silencieuse est rendue impossible
 * par le contrôle croisé de la primitive `keyboard`, qui refuse d'afficher une
 * colonne ou une rangée différente du nombre annoncé par l'arithmétique
 * (même principe que `count` sur `sevenSeg` / `countStrokes`).
 */
export const LETTER_ROWS = Object.freeze({
  azerty: Object.freeze(['azertyuiop', 'qsdfghjklm', 'wxcvbn']),
  qwerty: Object.freeze(['qwertyuiop', 'asdfghjkl', 'zxcvbnm']),
});

export const LAYOUTS = Object.freeze(['azerty', 'qwerty']);

/** Nombre de colonnes de la réglette — la rangée de chiffres en compte dix. */
export const COLUMNS = 10;

export const KEY = { w: 76, h: 76, gap: 8 };

/** Disposition demandée, ramenée au vocabulaire fermé (défaut : azerty). */
export function normalizeLayout(layout) {
  return layout === 'qwerty' ? 'qwerty' : 'azerty';
}

/**
 * Jeu de caractères **garanti** par le clavier, disposition par disposition.
 * Énoncé pour que l'émetteur filtre en amont, exactement comme la table des
 * glyphes le fait pour `sevenSeg` : une touche inconnue ne doit jamais être
 * découverte au clic de l'utilisateur.
 */
export const KEYBOARD_CHARSET = Object.freeze({
  azerty: Object.freeze(charsetOf('azerty')),
  qwerty: Object.freeze(charsetOf('qwerty')),
});

function charsetOf(layout) {
  const digits = layout === 'qwerty' ? QWERTY_ROW : AZERTY_ROW;
  const out = new Set();
  for (const k of digits) { out.add(k.char); out.add(k.digit); if (k.shift) out.add(k.shift); }
  for (const row of LETTER_ROWS[layout]) for (const c of row) out.add(c);
  return [...out].join('');
}

/** Le caractère est-il sur une touche modélisée ? (casse et accents respectés) */
export function knowsKey(label, layout = 'azerty') {
  return findKey(label, { layout }) !== null;
}

/**
 * Géométrie du clavier, centrée sur (0,0) dans le repère local du nœud
 * (y vers le bas, unités viewBox).
 *
 * Chaque touche porte `{rangee, colonne, char, digit, cx, cy, w, h}` :
 *  - `rangee` — **0** pour la rangée de chiffres, **1, 2, 3** pour les rangées de
 *    lettres, de haut en bas (la numérotation de `tables/claviers.js`) ;
 *  - `colonne` — 1-indexée ;
 *  - `digit` — le chiffre porté par la touche de la MÊME COLONNE sur la rangée
 *    de chiffres. ⚠ Ce n'est **pas** l'index de colonne : le `p` est en colonne
 *    **10** alors que la touche du dessus porte **0**. Lire le label donnerait 0
 *    là où l'arithmétique dit 10 — d'où la réglette numérotée de 1 à 10.
 *
 * Les rangées sont alignées **en colonnes**, sans le décalage physique du
 * clavier : c'est la colonne qui est l'objet du calcul, et un décalage d'un
 * quart de touche rendrait la démonstration illisible.
 *
 * @param {{layout?:string, rows?:'toutes'|'lettres'}} [options]
 */
export function keyboardGeometry(options = {}) {
  const layout = normalizeLayout(options.layout);
  const lettresSeules = options.rows === 'lettres';
  const digitRow = layout === 'qwerty' ? QWERTY_ROW : AZERTY_ROW;
  const letterRows = LETTER_ROWS[layout];

  const pitch = KEY.w + KEY.gap;
  const width = COLUMNS * KEY.w + (COLUMNS - 1) * KEY.gap;
  const x0 = -width / 2;
  const shown = lettresSeules ? letterRows.length : letterRows.length + 1;
  const height = shown * KEY.h + (shown - 1) * KEY.gap;
  const y0 = -height / 2;

  const cxOf = (colonne) => round(x0 + (colonne - 1) * pitch + KEY.w / 2);
  const cyOf = (ligne) => round(y0 + ligne * (KEY.h + KEY.gap) + KEY.h / 2);

  const keys = [];
  let ligne = 0;
  if (!lettresSeules) {
    digitRow.forEach((k, i) => {
      keys.push(makeKey({ rangee: 0, colonne: i + 1, char: k.char, digit: k.digit, shift: k.shift ?? null }, cxOf, cyOf, ligne));
    });
    ligne++;
  }
  letterRows.forEach((row, r) => {
    [...row].forEach((c, i) => {
      keys.push(makeKey({
        rangee: r + 1, colonne: i + 1, char: c, digit: digitRow[i] ? digitRow[i].digit : null, shift: null,
      }, cxOf, cyOf, ligne));
    });
    ligne++;
  });

  // La réglette : c'est elle qui porte l'index de colonne, et elle seule.
  const ruler = Array.from({ length: COLUMNS }, (_, i) => ({
    n: i + 1, cx: cxOf(i + 1), cy: round(y0 - KEY.gap - KEY.h * 0.28),
  }));
  // Numérotation des rangées de lettres, en marge gauche.
  const rowLabels = letterRows.map((_, r) => ({
    n: r + 1,
    cx: round(x0 - KEY.gap - KEY.w * 0.32),
    cy: cyOf((lettresSeules ? 0 : 1) + r),
  }));

  return {
    layout, keys, width, height, rows: shown, lettresSeules,
    ruler, rowLabels, pitch, keyW: KEY.w, keyH: KEY.h,
    rulerCy: ruler[0].cy, marginCx: rowLabels[0].cx,
  };
}

function makeKey(k, cxOf, cyOf, ligne) {
  return {
    ...k,
    x: round(cxOf(k.colonne) - KEY.w / 2),
    y: round(cyOf(ligne) - KEY.h / 2),
    cx: cxOf(k.colonne),
    cy: cyOf(ligne),
    w: KEY.w,
    h: KEY.h,
  };
}

/**
 * Touche portant un caractère (ou un chiffre) donné.
 * **Rend `null`** quand le caractère n'est sur aucune touche : c'est à
 * l'appelant de dégrader proprement, jamais de laisser passer un `null`.
 * @returns {object|null}
 */
export function findKey(label, options = {}) {
  if (typeof label !== 'string' || !label) return null;
  const geo = keyboardGeometry(options);
  const bas = label.toLowerCase();
  return geo.keys.find((k) => k.char === label || k.char === bas
    || k.digit === label || k.shift === label) || null;
}

/**
 * Ce que le clavier MONTRE pour une touche, selon la mesure demandée.
 * `null` quand la mesure n'a pas de sens pour cette touche : seule la rangée du
 * haut partage sa touche avec un chiffre.
 */
export function keyboardValue(key, mesure) {
  if (!key) return null;
  switch (mesure) {
    case 'colonne': return key.colonne;
    case 'rangee': return key.rangee === 0 ? null : key.rangee;
    default: return key.rangee === 0 && key.digit !== null ? Number(key.digit) : null;
  }
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}


// ---------------------------------------------------------------------------
// La table de correspondance — une seule forme, trois mises en page
// ---------------------------------------------------------------------------

/**
 * ★ L'abstraction commune à la réglette alphabétique, à la grille
 * pythagoricienne et au pavé téléphonique : **une table de correspondance
 * affichée**.
 *
 * Une conversion par table n'est vérifiable que si la table est sous les yeux.
 * Le geste est partout le même — la table paraît, la case de la lettre
 * s'allume, la lettre y vole, la valeur en redescend — et seule la **mise en
 * page** change :
 *
 * | `disposition` | une case porte | employée par |
 * |---------------|----------------|--------------|
 * | `reglette`    | **une lettre** et sa valeur | toutes les tables lettre → nombre |
 * | `glissiere`   | **deux réglettes alignées**, une lettre chacune | les chiffrements par substitution (Atbash, César) |
 * | `pave`        | **les lettres d'une touche**, aux places du téléphone | T9 (ITU E.161) |
 *
 * ★ **Seul le pavé téléphonique met plusieurs lettres dans une case**, parce
 * que c'est la réalité de l'objet : la touche `7` porte vraiment `PQRS`.
 * Partout ailleurs — pythagoricienne, chaldéenne, Scrabble comprises — une
 * case vaut une lettre et un nombre, dans l'ordre alphabétique. Grouper les
 * lettres par valeur ferait de la mise en page une affirmation de plus : « ces
 * lettres vont ensemble ». Alignées une par une, elles ne disent que ce
 * qu'elles sont, et le lecteur y cherche SA lettre comme dans un dictionnaire.
 *
 * Deux options changent ce que la réglette **démontre**, et aucune des deux
 * n'est décorative :
 *
 *  - `cycle` — retour à la ligne **là où la table recommence** (la valeur ne
 *    croît plus). La pythagoricienne réduit le rang modulo 9 : en cassant la
 *    ligne à chaque retour au 1, les trois rangées s'alignent colonne par
 *    colonne — `A J S` valent 1, `B K T` valent 2 — et la règle **se voit** au
 *    lieu d'être affirmée. Le découpage est DÉRIVÉ des valeurs, jamais donné :
 *    une table non cyclique ne peut donc pas emprunter cette mise en page pour
 *    se faire passer pour régulière (`primitives/table.js` le refuse).
 *  - `teinte: 'valeur'` — fond de case d'autant plus contrasté que la valeur
 *    est grande (Scrabble). La teinte **redouble** le nombre écrit dans la
 *    case, elle ne le remplace pas : rien n'y repose sur la couleur seule
 *    (design §5.1).
 *
 * ## ★ `glissiere` — la règle EST la mise en page
 *
 * Une conversion lettre → **lettre** n'a pas de nombre à montrer : ce qu'il
 * faut montrer, c'est le RAPPORT entre deux alphabets. La glissière les dessine
 * donc tels quels, deux réglettes alignées colonne par colonne :
 *
 * ```
 *   Atbash          A B C D … M N … X Y Z      ← l'alphabet
 *                   Z Y X W … N M …  C B A     ← le même, retourné bout pour bout
 *
 *   César (13)      A B C … L M | N O … Y Z    ← l'alphabet
 *                   N O P … Y Z | A B … L M    ← le même, glissé de treize rangs
 * ```
 *
 * On n'affirme plus que « A devient Z » : on le VOIT, parce que la réglette du
 * bas n'est **jamais une seconde liste de lettres** — c'est l'alphabet du haut,
 * déplacé. Retourné pour l'Atbash (l'axe du miroir tombe pile au milieu de la
 * bande, entre `M|N` et `N|M`), glissé pour César.
 *
 * ★ **La coupure du glissement se dessine** (`|` ci-dessus, un vide dans les
 * deux bandes). C'est le modulo, montré : à gauche de la coupure, les lettres
 * qui avancent sans sortir de l'alphabet ; à droite, celles qui reviennent au
 * début. Exactement ce que fait le retour à la ligne de la pythagoricienne pour
 * son modulo 9. Le miroir, lui, n'a pas de coupure — il n'en a pas besoin.
 *
 * ★ Et comme le `cycle`, ce dessin **se refuse** à qui ne le mérite pas
 * (`pasDeGlissiere`) : si les valeurs ne parcourent pas l'alphabet d'un pas
 * constant de ±1, la substitution n'est pas un déplacement de la réglette, et
 * elle ne peut pas emprunter le dessin qui l'affirmerait. Une table de leet
 * speak ou un chiffrement quelconque reste en `reglette`.
 *
 * Ce n'est **pas** une table arithmétique : les correspondances viennent du
 * scénario, donc de la fonction même de l'opérateur (`entries`). Ici on ne
 * décide que de la géométrie du dessin, et la primitive `table` refuse
 * d'afficher une valeur qui contredirait celle du scénario.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Colonnes par défaut d'une réglette : deux rangées de treize tiennent en largeur. */
export const ALPHABET_COLS = 13;

/** Ordres de numérotation modélisés — vocabulaire fermé. */
export const ALPHABET_ORDRES = Object.freeze(['a1z26', 'z26a1']);

/**
 * Mises en page modélisées — vocabulaire fermé.
 *
 * La mise en page « une colonne par valeur, les lettres dessous » a disparu :
 * **seul le clavier téléphonique a plusieurs lettres pour un chiffre**, et
 * c'est le `pave` qui le dit.
 *
 * ★ `glissiere` s'est ajoutée pour les conversions lettre → **lettre** : deux
 * réglettes alignées, celle du bas étant celle du haut déplacée. Ce n'est pas
 * une variante décorative de `reglette` — c'est la seule mise en page où le
 * dessin porte la règle, et elle se refuse à qui n'est pas un déplacement de
 * l'alphabet.
 *
 * ★ `modulo` s'est ajoutée pour les conversions nombre → **reste**. Même
 * argument, une fois de plus : « le reste de la division par 9 » était une
 * affirmation, et rien à l'écran ne permettait de la vérifier. La mise en page
 * EST la démonstration — on écrit les entiers en rangées de `m`, et la colonne
 * dans laquelle un nombre tombe EST son reste :
 *
 * ```
 *   quotation   0  1  2  3  4  5  6  7  8      ← le barème, fixe
 *               0  1  2  3  4  5  6  7  8
 *               9 10 11 12 13 14 15 16 17
 *              18 19 20 21 22 23 24 25 26
 * ```
 *
 * « Une table de 0 à N (modulo−1) par ligne, avec la quotation en fixe comme
 * pour les azerty colonne, et l'énumération des nombres façon touche de
 * clavier » (l'auteur). Ce n'est donc pas une réglette cyclique : la valeur
 * n'est PAS répétée dans chaque case — elle est écrite une fois, en tête de
 * colonne, exactement comme la réglette de colonnes du clavier AZERTY. C'est
 * ce qui fait que la colonne se lit comme une colonne, et non comme
 * quatre-vingts affirmations empilées.
 *
 * ★ Et comme `cycle` et `glissiere`, le dessin **se refuse à qui ne le mérite
 * pas** : si deux nombres d'une même colonne n'ont pas le même reste, la
 * quotation mentirait pour l'un des deux. `geo.discordance` le dit, et
 * `primitives/table.js` fait alors échouer la compilation.
 */
export const DISPOSITIONS = Object.freeze(['reglette', 'glissiere', 'pave', 'modulo']);

/**
 * ★ Le PLAFOND DE RANGÉES d'une table modulo — **mesuré, pas choisi**.
 *
 * La table est dessinée en entier, de 0 jusqu'au nombre à convertir, et la
 * caméra recule d'autant : le facteur est calculé sur l'encombrement réel
 * (`primitives/decor.js › cadrage`), donc il tombe quand les rangées
 * s'accumulent. Passé un certain nombre, la table est bien montrée — mais elle
 * n'est plus lisible, c'est-à-dire montrée pour rien.
 *
 * **Où placer la limite, sans la choisir au goût.** Le projet a déjà un
 * plancher de lisibilité : le plus petit texte qu'un décor déployé affiche est
 * la NOTE d'une case de réglette, `FONT_SIZE × T.note` = 14,4 unités de
 * viewBox, à un recul de 1. Un nombre de la grille est écrit en
 * `FONT_SIZE × T.lettre` = 22,08 unités : il reste donc au moins aussi lisible
 * que cette note tant que le recul ne descend pas sous 14,4 / 22,08 ≈ **0,65**.
 *
 * Recul mesuré, rangée par rangée (`cadrage`, viewBox 1200×480) :
 *
 * | rangées | 5 | 6 | 7 | **8** | 9 | 10 | 12 |
 * |---------|---|---|---|-------|---|----|----|
 * | recul   | 0,95 | 0,84 | 0,76 | **0,69** | 0,63 | 0,58 | 0,50 |
 *
 * Huit rangées passent, neuf ne passent pas. Pour comparaison, le décor le
 * plus encombrant déjà servi — le clavier AZERTY — recule à 0,89.
 *
 * ★ **Au-delà, l'émetteur ne monte pas la table** : il retombe sur le geste
 * sobre (`moteur/transformations/posts.js`), comme le nivellement retombe sur
 * l'accolade quand il ne converge pas assez vite. Un dessin qu'on ne sait pas
 * ★ **CE N'EST PLUS UN PLAFOND, C'EST UNE FENÊTRE.** La table qui défile est
 * faite : au-delà de huit rangées, on n'abandonne plus le dessin, on n'en
 * montre que huit à la fois et la grille COULISSE derrière un volet de découpe
 * (`dom.js › nhl-roue`) jusqu'à faire paraître la rangée cherchée — « si la
 * valeur cible n'est pas à l'écran, la table descend jusqu'à faire apparaître
 * la valeur à convertir » (l'auteur).
 *
 * La mesure de lisibilité ci-dessus garde donc tout son sens, mais elle borne
 * désormais ce qu'on VOIT, non ce qu'on accepte de convertir : le recul de
 * caméra se calcule sur la fenêtre, pas sur la table entière, et il ne bouge
 * plus quand le nombre grandit.
 *
 * ⚠ **Miroir** de `MODULO_LIGNES_MAX` (`moteur/transformations/posts.js`) : le
 * moteur arithmétique ne dépend pas du moteur visuel (CONTRACTS §1), mais
 * c'est lui qui décide de monter la table ou non. Un test croisé échoue si les
 * deux divergent.
 */
export const MODULO_LIGNES_MAX = 3;

/**
 * ★ **LA PART DE LA SCÈNE QU'UN CYCLE PEUT PRENDRE EN LARGEUR.**
 *
 * « Tu peux utiliser 90 % de la largeur de la scène pour ça » (l'auteur). Les
 * cases d'un cycle sont étroites — un ou deux chiffres — et la largeur minimale
 * commune aux tables (`CELL_MIN_W`) laissait un cycle de dix colonnes occuper
 * moins des deux tiers du cadre : le reste était du vide, et la caméra reculait
 * quand même pour l'englober. Elles s'élargissent donc jusqu'à remplir le cadre,
 * jamais au-delà.
 */
const MODULO_PART_LARGEUR = 0.9;

/** Encodages de teinte de fond modélisés — vocabulaire fermé. */
export const TEINTES = Object.freeze(['valeur']);

/** Ordre demandé, ramené au vocabulaire fermé (défaut : A=1). */
export function normalizeOrdre(ordre) {
  return ordre === 'z26a1' ? 'z26a1' : 'a1z26';
}

/** Mise en page demandée, ramenée au vocabulaire fermé (défaut : réglette). */
export function normalizeDisposition(d) {
  return DISPOSITIONS.includes(d) ? d : 'reglette';
}

/**
 * Rang MONTRÉ par la réglette alphabétique pour une lettre donnée.
 *
 * ★ C'est le seul **oracle indépendant** du moteur visuel : pour l'alphabet —
 * et pour lui seul — le rang se recalcule ici, sans rien croire du scénario.
 * Les autres tables (pythagore, Scrabble, morse…) ne peuvent pas l'avoir sans
 * recopier le moteur arithmétique, c'est-à-dire sans créer la seconde source
 * de vérité que ce projet refuse : elles voyagent donc DANS l'op, dérivées de
 * la fonction même de l'opérateur.
 *
 * `null` si le caractère n'est pas une lettre latine non accentuée.
 */
export function alphabetValue(letter, ordre = 'a1z26') {
  if (typeof letter !== 'string' || !letter) return null;
  const i = ALPHABET.indexOf(letter.toUpperCase());
  if (i < 0) return null;
  return normalizeOrdre(ordre) === 'z26a1' ? 26 - i : i + 1;
}

/** Les 26 correspondances de la réglette alphabétique, dans l'ordre demandé. */
export function alphabetEntries(ordre = 'a1z26') {
  const o = normalizeOrdre(ordre);
  return [...ALPHABET].map((char) => ({ char, value: alphabetValue(char, o) }));
}

/* ── Métriques de dessin, en unités viewBox ──────────────────────────────── */

/** Tailles de texte dans une case, en fraction de `FONT_SIZE`. */
const T = Object.freeze({ lettre: 0.46, valeur: 0.36, note: 0.30, tete: 0.5 });
const PAD_X = 13;
const PAD_Y = 11;
const GAP = 8;
const LIGNE = 26;      // interligne dans une case
const CELL_MIN_W = 66;
/**
 * Largeur maximale d'une case de cycle — au-delà, une case de deux chiffres
 * devient une plaque. C'est deux fois la largeur minimale : de quoi remplir le
 * cadre sur dix colonnes, sans qu'une table de trois colonnes ne s'étale.
 */
const CELL_MAX_W = CELL_MIN_W * 2;

/** Largeur approchée d'un texte à chasse fixe, en unités viewBox. */
function textWidth(texte, size) {
  return [...String(texte)].length * size * ADVANCE_RATIO;
}

/** Lettres par ligne dans une case de grille : au-delà, on replie. */
const PAR_LIGNE_MAX = 5;

/**
 * Géométrie d'une table de correspondance, centrée sur (0,0) dans le repère
 * local du nœud (y vers le bas, unités viewBox).
 *
 * @param {object} options
 * @param {Array<{char:string,value:(number|string),note?:string}>} options.entries
 *        les correspondances, telles que l'opérateur les lit
 * @param {'reglette'|'glissiere'|'pave'} [options.disposition]
 * @param {number} [options.colonnes]  colonnes fixes de la réglette (défaut 13)
 * @param {boolean} [options.cycle]    retour à la ligne là où la table recommence
 * @param {'valeur'} [options.teinte]  fond de case encodant la valeur
 * @param {number} [options.fontSize]
 * @returns {{disposition:string, cols:number, rows:number, width:number, height:number,
 *            cells:Array, index:object}}
 *
 * `cells[]` porte de quoi dessiner sans rien recalculer :
 *   `{ key, col, ligne, x, y, w, h, cx, cy, vide, teinte, labels:[{text,cx,cy,size,tone}] }`
 *   — `teinte` vaut 0 à 1 (0 = valeur la plus faible) et n'existe que si on l'a
 *   demandée ; c'est le DESSIN qui décide comment la rendre visible, pas la
 *   géométrie, parce que la direction dépend du thème.
 * `index[LETTRE]` porte de quoi mettre en scène :
 *   `{ cell, lettre:{x,y}, valeur:{x,y}, value, note }`
 *   — `lettre` est le point où la lettre atterrit, `valeur` celui d'où le
 *   nombre redescend. Ils diffèrent : en réglette, la valeur est sous la
 *   lettre ; sur le pavé, c'est la **tête de touche** qui la porte ; en
 *   glissière, c'est la case de la réglette du BAS, juste dessous.
 *   `halo`, quand il existe, remplace la case pour l'illumination : en
 *   glissière c'est la COLONNE entière qu'on éclaire, les deux réglettes à la
 *   fois, parce que la correspondance est ce qui les relie.
 */
export function tableGeometry(options = {}) {
  const disposition = normalizeDisposition(options.disposition);
  const fs = options.fontSize || FONT_SIZE;
  const entries = normalizeEntries(options.entries);
  if (disposition === 'glissiere') return glissiere(entries, fs);
  if (disposition === 'modulo') return moduloTable(entries, options, fs);
  return disposition === 'reglette'
    ? reglette(entries, options, fs)
    : pave(entries, fs);
}

/**
 * ★ La table des restes — les entiers en rangées de `m`, le barème en tête.
 *
 * Une case porte **un nombre, et rien d'autre** : la valeur commune de la
 * colonne est écrite une fois, sur la quotation, au-dessus de la grille. C'est
 * la différence de fond avec `reglette`, où chaque case répète sa valeur —
 * ici, ce qui démontre, c'est l'ALIGNEMENT, et répéter le reste quatre-vingts
 * fois le noierait au lieu de le montrer.
 *
 * Ce que la géométrie publie en plus des cases :
 *  · `quotation[]` — un repère par colonne, `{n, cx, cy}`, comme la réglette de
 *    colonnes du clavier (`keyboardGeometry › ruler`) ;
 *  · `quotationCy` — l'axe de cette rangée : c'est de là que le reste redescend ;
 *  · `discordance` — la première colonne où deux nombres n'ont pas le même
 *    reste, si elle existe. Le dessin ne se refuse pas lui-même (une géométrie
 *    ne fait pas échouer une compilation) : il DIT ce qui ne va pas, et
 *    `primitives/table.js` refuse.
 *
 * ★ `halo` couvre la COLONNE, quotation comprise — même raison que la mesure
 * « colonne » du clavier et que la colonne d'une glissière : ce qui fait la
 * correspondance, c'est le lien vertical entre le nombre et son barème, pas la
 * case seule.
 */
function moduloTable(entries, options, fs) {
  const cols = Math.max(1, Math.min(options.colonnes || entries.length || 1, Math.max(1, entries.length)));
  const rangs = [];
  for (let i = 0; i < entries.length; i += cols) rangs.push(entries.slice(i, i + cols));
  const rows = Math.max(1, rangs.length);
  // ★ LA FENÊTRE — ce qu'on montre, et non ce qu'on dessine. Au-delà, la grille
  //   coulisse derrière un volet (voir l'en-tête de `MODULO_LIGNES_MAX`).
  const fenetre = Math.min(rows, MODULO_LIGNES_MAX);
  const roule = rows > fenetre;

  // Le barème de chaque colonne, DÉRIVÉ des correspondances : c'est la valeur
  // que toutes les cases de la colonne partagent — et si elles ne la partagent
  // pas, la colonne est discordante et le dessin ment.
  const bareme = [];
  let discordance = null;
  rangs.forEach((rang) => {
    rang.forEach((e, col) => {
      if (bareme[col] === undefined) { bareme[col] = { valeur: e.value, key: e.char }; return; }
      if (bareme[col].valeur !== e.value && !discordance) {
        discordance = { col, a: bareme[col], b: { valeur: e.value, key: e.char } };
      }
    });
  });

  let large = 0;
  for (const e of entries) large = Math.max(large, textWidth(e.label, fs * T.lettre));
  for (const b of bareme) large = Math.max(large, textWidth(b ? b.valeur : '', fs * T.valeur));
  // Une seule ligne de texte par case : la case est celle d'une touche, pas
  // celle d'une réglette qui empile la lettre, la note et la valeur.
  // ★ La case s'élargit jusqu'à remplir 90 % du cadre — voir
  //   `MODULO_PART_LARGEUR`. Jamais moins que la largeur minimale commune :
  //   un cycle de cinquante colonnes se serrerait sinon jusqu'à l'illisible.
  const dispo = VIEWBOX.w * MODULO_PART_LARGEUR;
  const large2 = Math.floor((dispo - (cols - 1) * GAP) / cols);
  const cellW = Math.max(CELL_MIN_W, Math.ceil(large) + PAD_X * 2, Math.min(large2, CELL_MAX_W));
  const cellH = PAD_Y * 2 + LIGNE;

  const width = cols * cellW + (cols - 1) * GAP;
  // L'encombrement ne compte que les rangées VISIBLES : c'est lui qui décide du
  // recul de caméra, et une table qui coulisse ne doit pas faire reculer la
  // caméra pour des rangées qu'on ne verra jamais toutes à la fois.
  const grille = fenetre * cellH + (fenetre - 1) * GAP;
  const pas = cellH + GAP;
  // La quotation dépasse EN HAUT, comme la réglette du clavier : elle fait
  // partie de l'encombrement, sans quoi la caméra la couperait.
  const teteH = Math.round(cellH * 0.62);
  const height = grille + teteH;
  const x0 = -width / 2;
  // (0,0) est le centre de l'ENSEMBLE — quotation comprise —, donc la grille
  // commence plus bas que la moitié de sa propre hauteur.
  const y0 = -height / 2 + teteH;
  const quotationCy = round(y0 - GAP - teteH * 0.34);

  const cxOf = (col) => round(x0 + col * (cellW + GAP) + cellW / 2);
  const quotation = bareme.map((b, col) => ({ n: b ? b.valeur : '', cx: cxOf(col), cy: quotationCy }));

  const cells = [];
  const index = {};
  rangs.forEach((rang, ligne) => {
    rang.forEach((e, col) => {
      const cx = cxOf(col);
      const cy = round(y0 + ligne * (cellH + GAP) + cellH / 2);
      const cell = {
        key: e.char, col, ligne,
        x: round(cx - cellW / 2), y: round(cy - cellH / 2),
        w: cellW, h: cellH, cx, cy, vide: false,
        labels: [{ text: e.label, cx, cy, size: round(fs * T.lettre), tone: 'fg' }],
      };
      cells.push(cell);
      // Du barème au bas de la FENÊTRE — jamais au bas de la grille, qui peut
      // compter cinquante rangées dont on n'en voit que trois.
      const haut = quotationCy - teteH * 0.34;
      const bas = y0 + grille + 4;
      index[e.char] = {
        cell: cells.length - 1,
        lettre: { x: cx, y: cy },
        // ★ Le reste redescend DE LA QUOTATION, jamais de la case : la case ne
        //   le porte pas, et le faire tomber d'un endroit où il n'est pas écrit
        //   serait exactement le mensonge que la mise en page évite.
        valeur: { x: cx, y: quotationCy },
        value: e.value,
        note: null,
        // ★ **LE HALO NE DÉFILE PAS** — il est dans le repère de la FENÊTRE.
        //
        //   Il embrasse la colonne : du barème, qui est fixe au-dessus du volet,
        //   jusqu'au bas de ce qu'on voit. Calculé dans le repère de la GRILLE,
        //   il aurait suivi la roue — et se serait donc décollé du barème, qui
        //   lui ne bouge pas. Une fois la roue arrêtée, la rangée active est au
        //   centre de la fenêtre : le halo n'a donc rien à suivre, il désigne
        //   une colonne, et une colonne ne défile pas.
        halo: { cx, cy: round((haut + bas) / 2), w: cellW + 8, h: round(bas - haut), fixe: true },
      };
    });
  });

  // ★ DE COMBIEN LA ROUE TOURNE pour amener une rangée sous les yeux.
  //
  //   Zéro tant que la rangée est déjà dans la fenêtre ; sinon on la fait
  //   monter jusqu'à la DERNIÈRE ligne visible — c'est ce qui se lit comme
  //   « la table est descendue jusqu'à elle », et non comme un saut au milieu.
  //   Le déplacement est négatif : la grille monte, la fenêtre ne bouge pas.
  // ★ **MACHINE À SOUS : LA RANGÉE ACTIVE AU CENTRE.**
  //
  //   Elle s'arrêtait sur la DERNIÈRE ligne visible, ce qui se lit comme une
  //   table qu'on a fait descendre — juste, mais pas ce que l'auteur veut voir :
  //   « en visant un effet machine à sous de casino pour le défilement et la
  //   position de la ligne active au centre ». On vise donc le milieu de la
  //   fenêtre, et l'on borne aux deux bouts pour ne jamais montrer de vide : le
  //   cycle a un début et une fin, une machine à sous n'en a pas.
  //   ⚠️ ON NE BORNE PLUS À LA FIN. Le garde-fou « ne jamais montrer de vide »
  //     ramenait la dernière rangée en bas de la fenêtre au lieu du centre —
  //     mesuré : `252` en modulo 10 arrivait en position 2 sur 3, et non 1.
  //     C'est à l'ÉMETTEUR de dessiner une rangée de plus que la cible (voir
  //     `posts.js › etapeModulo`), ce qui est d'ailleurs vrai : un cycle ne
  //     s'arrête pas au nombre qu'on y cherche.
  const centre = Math.floor((fenetre - 1) / 2);
  const roulisDe = (ligne) => -Math.max(ligne - centre, 0) * pas;
  for (const e of entries) {
    const idx = index[e.char];
    if (idx) idx.roulis = roulisDe(cells[idx.cell].ligne);
  }
  // Le volet, en coordonnées locales : la fenêtre, et rien d'autre. La
  // quotation vit AU-DESSUS et reste hors du volet — « la quotation en fixe »
  // (l'auteur) : c'est le barème, il ne défile pas avec les rangées.
  const volet = roule
    ? { x: round(x0 - 4), y: round(y0 - GAP / 2), w: round(width + 8), h: round(grille + GAP) }
    : null;
  return {
    disposition: 'modulo', cols, rows, fenetre, roule, volet, pas,
    width, height, cellW, cellH,
    cells, index, quotation, quotationCy, teteH, discordance,
  };
}

/**
 * ★ Le déplacement de réglette qu'une table de substitution réalise — ou `null`
 * si elle n'en réalise aucun.
 *
 * C'est l'oracle de la glissière, et il est du même bois que `verifierCycle` :
 * le dessin **affirme** que la réglette du bas est celle du haut déplacée, donc
 * le dessin se refuse tant que ce n'est pas vrai. Est un déplacement, et rien
 * d'autre :
 *
 *  - la colonne du haut parcourt l'alphabet **d'un pas de +1**, sans trou ;
 *  - la colonne du bas le parcourt **d'un pas constant, +1 ou −1** (modulo 26) —
 *    +1 c'est un glissement (César), −1 c'est un retournement (Atbash).
 *
 * Les `coutures` sont les colonnes après lesquelles la réglette du bas **revient
 * au début de l'alphabet** : le modulo, à l'endroit exact où il opère. Il y en
 * a au plus une, et le miroir n'en a aucune.
 *
 * @param {Array<{char:string,value:string}>} entries
 * @returns {{sens:1|-1, coutures:number[]}|null}
 */
export function pasDeGlissiere(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return null;
  const rang = (c) => ALPHABET.indexOf(String(c).toUpperCase());
  const haut = entries.map((e) => rang(e && e.char));
  // ★ **LA BANDE DU BAS PEUT ÊTRE UNE NUMÉROTATION**, pas seulement un alphabet.
  //
  //   Elle ne lisait que des lettres — `length === 1`, puis rang dans
  //   l'alphabet —, ce qui convenait à l'Atbash et aux césars, dont la bande
  //   inférieure EST un alphabet déplacé. `m.z26a1` fait le même geste sur une
  //   autre matière : sa bande porte 26, 25, … 1, et le retournement s'y lit
  //   exactement pareil.
  //
  //   Ce qui est vérifié ne change pas d'un iota : un PAS CONSTANT de ±1. Un
  //   rang de lettre et un numéro de 1 à 26 sont la même échelle écrite
  //   autrement, et c'est pourquoi la même garde vaut pour les deux — on ramène
  //   simplement les numéros sur la base 0 des rangs.
  const numero = (v) => {
    const n = Number(String(v).trim());
    return Number.isInteger(n) && n >= 1 && n <= 26 ? n - 1 : -1;
  };
  const enChiffres = entries.every((e) => numero(e && e.value) >= 0);
  const bas = enChiffres
    ? entries.map((e) => numero(e.value))
    : entries.map((e) => (String(e && e.value).length === 1 ? rang(e.value) : -1));
  if (haut.some((i) => i < 0) || bas.some((i) => i < 0)) return null;
  const pas = (a, b) => (b - a + 26) % 26;
  const sens = pas(bas[0], bas[1]) === 1 ? 1 : (pas(bas[0], bas[1]) === 25 ? -1 : 0);
  if (!sens) return null;
  const coutures = [];
  for (let i = 0; i < entries.length - 1; i++) {
    if (pas(haut[i], haut[i + 1]) !== 1) return null;
    if (pas(bas[i], bas[i + 1]) !== (sens + 26) % 26) return null;
    // La couture : là où la réglette du bas repasse par le bout de l'alphabet.
    if (sens === 1 ? bas[i] === 25 : bas[i] === 0) coutures.push(i);
  }
  return { sens, coutures };
}

/* ── Métriques propres à la glissière ────────────────────────────────────── */

/** Case de glissière : juste de quoi loger une lettre — vingt-six doivent tenir. */
const GLISS_PAD_X = 9;
/** Largeur plancher d'une case de glissière (lisible sans être creuse). */
const GLISS_MIN_W = 38;
/** Le vide de la couture — plus large que l'inter-bande, pour se lire comme une coupure. */
const GLISS_COUTURE = 12;

/**
 * Glissière : **deux réglettes alignées colonne par colonne**, une lettre par
 * case, celle du bas étant celle du haut déplacée.
 *
 * Les cases se touchent à l'intérieur d'une bande — c'est ce qui en fait une
 * *réglette* et non vingt-six couples indépendants : on lit la bande du bas
 * comme un alphabet, et on constate qu'elle est bien l'alphabet. Le seul vide
 * horizontal est la **couture**, là où le glissement ramène au début ; elle est
 * portée par les DEUX bandes, parce que les colonnes doivent rester alignées et
 * parce qu'elle sépare, en haut comme en bas, les lettres qui sortent de
 * l'alphabet de celles qui n'en sortent pas.
 *
 * La lettre se pose sur la case du haut — la sienne — et sa conversion redescend
 * de la case juste dessous. Le halo, lui, couvre la COLONNE entière : c'est le
 * lien vertical qui est la correspondance, pas l'une ou l'autre case.
 */
function glissiere(entries, fs) {
  const deplacement = pasDeGlissiere(entries);
  const coutures = new Set(deplacement ? deplacement.coutures : []);
  const n = Math.max(1, entries.length);

  let large = 0;
  for (const e of entries) {
    large = Math.max(large, textWidth(e.label, fs * T.lettre), textWidth(e.value, fs * T.lettre));
  }
  const cellW = Math.max(GLISS_MIN_W, Math.ceil(large) + GLISS_PAD_X * 2);
  const cellH = PAD_Y * 2 + LIGNE;

  const width = n * cellW + coutures.size * GLISS_COUTURE;
  const height = 2 * cellH + GAP;
  const x0 = -width / 2;
  const y0 = -height / 2;
  const cyHaut = round(y0 + cellH / 2);
  const cyBas = round(y0 + cellH + GAP + cellH / 2);

  const cells = [];
  const index = {};
  let x = x0;
  entries.forEach((e, col) => {
    const cx = round(x + cellW / 2);
    const boite = (cy, texte, tone) => ({
      key: e.char, col, ligne: tone === 'fg' ? 0 : 1,
      x: round(cx - cellW / 2), y: round(cy - cellH / 2),
      w: cellW, h: cellH, cx, cy, vide: false,
      labels: [{ text: texte, cx, cy, size: round(fs * T.lettre), tone }],
    });
    const iHaut = cells.length;
    cells.push(boite(cyHaut, e.label, 'fg'));
    cells.push(boite(cyBas, e.value, 'gold'));
    index[e.char] = {
      cell: iHaut,
      lettre: { x: cx, y: cyHaut },
      valeur: { x: cx, y: cyBas },
      // ★ La colonne entière : les deux réglettes, et le vide entre elles.
      halo: { cx, cy: round((cyHaut + cyBas) / 2), w: cellW, h: cyBas - cyHaut + cellH },
      value: e.value,
      note: null,
    };
    x += cellW + (coutures.has(col) ? GLISS_COUTURE : 0);
  });

  return {
    disposition: 'glissiere', cols: n, rows: 2, width, height, cellW, cellH,
    sens: deplacement ? deplacement.sens : 0,
    coutures: deplacement ? deplacement.coutures : [],
    // Les couples tels qu'ils sont DESSINÉS — c'est sur eux que `table.js`
    // motive son refus, pour que le grief cite la case fautive et pas l'entrée
    // brute qui, elle, a pu être normalisée ou écartée en chemin.
    couples: entries.map((e) => ({ char: e.char, value: e.value })),
    cells, index,
  };
}

/**
 * Découpe de la réglette en rangées.
 *
 * ★ `cycle` ne coupe pas tous les N : il coupe **là où la table recommence**,
 * c'est-à-dire là où la valeur cesse de croître. Le nombre de colonnes est donc
 * une CONSÉQUENCE des valeurs, jamais une consigne — et c'est ce qui fait de
 * l'alignement une démonstration : si les colonnes se répondent, c'est que la
 * table est réellement cyclique. (`primitives/table.js` refuse le contraire.)
 */
function decouperEnRangs(entries, options) {
  if (!entries.length) return [[]];
  if (options.cycle) {
    const rangs = [[]];
    let precedent = null;
    for (const e of entries) {
      const v = Number(e.value);
      const dernier = rangs[rangs.length - 1];
      if (dernier.length && (!Number.isFinite(v) || !Number.isFinite(precedent) || v <= precedent)) {
        rangs.push([]);
      }
      rangs[rangs.length - 1].push(e);
      precedent = v;
    }
    return rangs;
  }
  const cols = Math.max(1, options.colonnes || ALPHABET_COLS);
  const rangs = [];
  for (let i = 0; i < entries.length; i += cols) rangs.push(entries.slice(i, i + cols));
  return rangs;
}

/**
 * Teinte de fond par valeur, de 0 (la plus faible) à 1 (la plus forte).
 *
 * ★ Par RANG de valeur, pas au prorata : les points du Scrabble vont 1, 2, 3,
 * 4, 8, 10 — au prorata, les quatre premiers seraient indiscernables. Le rang
 * garde l'ordre (plus de points, plus de teinte) et rend chaque palier
 * visible. L'information reste de toute façon écrite en toutes lettres dans la
 * case : la teinte la redouble, elle ne la porte pas seule.
 */
function teinteParValeur(entries, mode) {
  if (mode !== 'valeur') return null;
  const vals = [...new Set(entries.map((e) => Number(e.value)))]
    .filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (vals.length < 2) return null;
  return new Map(vals.map((v, i) => [v, round(i / (vals.length - 1))]));
}

/** Correspondances nettoyées : capitale, valeur en chaîne, note facultative. */
function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const out = [];
  const vues = new Set();
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const char = String(e.char ?? '').toUpperCase();
    if (!char || vues.has(char)) continue;
    if (e.value === undefined || e.value === null) continue;
    vues.add(char);
    out.push({
      char,
      // `label` — le glyphe DESSINÉ quand il diffère de la clé : le code ASCII
      // du bas de casse se lit « a → 97 », pas « A → 97 ».
      label: e.label === undefined || e.label === null || e.label === '' ? char : String(e.label),
      value: String(e.value),
      note: e.note === undefined || e.note === null || e.note === '' ? null : String(e.note),
    });
  }
  return out;
}

/**
 * Réglette : **une case par lettre**, la valeur dessous (et la note entre
 * deux). C'est la mise en page de toutes les tables lettre → nombre.
 *
 * Les rangées viennent de `decouperEnRangs` : à colonnes fixes, ou au CYCLE de
 * la table. Dans les deux cas les cases sont posées **à pas constant depuis le
 * bord gauche**, donc la colonne `j` d'une rangée tombe exactement sous la
 * colonne `j` de la précédente — c'est cet alignement qui fait la
 * démonstration de la pythagoricienne, et il est exact par construction, pas
 * par réglage.
 */
function reglette(entries, options, fs) {
  const rangs = decouperEnRangs(entries, options);
  const cols = Math.max(1, ...rangs.map((r) => r.length));
  const rows = Math.max(1, rangs.length);
  const avecNote = entries.some((e) => e.note);
  const lignes = avecNote ? 3 : 2;
  const teintes = teinteParValeur(entries, options.teinte);

  let large = 0;
  for (const e of entries) {
    large = Math.max(large, textWidth(e.label, fs * T.lettre), textWidth(e.value, fs * T.valeur));
    if (e.note) large = Math.max(large, textWidth(e.note, fs * T.note));
  }
  const cellW = Math.max(CELL_MIN_W, Math.ceil(large) + PAD_X * 2);
  const cellH = PAD_Y * 2 + lignes * LIGNE;

  const width = cols * cellW + (cols - 1) * GAP;
  const height = rows * cellH + (rows - 1) * GAP;
  const x0 = -width / 2;
  const y0 = -height / 2;

  const cells = [];
  const index = {};
  rangs.forEach((rang, ligne) => {
    rang.forEach((e, col) => {
      const cx = round(x0 + col * (cellW + GAP) + cellW / 2);
      const cy = round(y0 + ligne * (cellH + GAP) + cellH / 2);
      const haut = cy - ((lignes - 1) / 2) * LIGNE;
      const yLettre = round(haut);
      const yNote = round(haut + LIGNE);
      const yValeur = round(haut + (lignes - 1) * LIGNE);
      const labels = [
        { text: e.label, cx, cy: yLettre, size: round(fs * T.lettre), tone: 'fg' },
        { text: e.value, cx, cy: yValeur, size: round(fs * T.valeur), tone: 'gold' },
      ];
      if (e.note) labels.splice(1, 0, { text: e.note, cx, cy: yNote, size: round(fs * T.note), tone: 'fg3' });
      const cell = {
        key: e.char, col, ligne,
        x: round(cx - cellW / 2), y: round(cy - cellH / 2),
        w: cellW, h: cellH, cx, cy, vide: false, labels,
      };
      if (teintes) cell.teinte = teintes.get(Number(e.value)) ?? 0;
      cells.push(cell);
      index[e.char] = {
        cell: cells.length - 1,
        lettre: { x: cx, y: yLettre },
        valeur: { x: cx, y: yValeur },
        value: e.value,
        note: e.note,
      };
    });
  });

  return { disposition: 'reglette', cols, rows, width, height, cellW, cellH, cells, index };
}

/**
 * Pavé téléphonique : les neuf touches à leur place, la touche en tête, les
 * lettres qu'elle porte dessous.
 *
 * ★ **La seule mise en page où une case porte plusieurs lettres**, et elle ne
 * l'invente pas : la touche `7` porte vraiment `PQRS`. La touche `1` y est
 * dessinée VIDE — sur un téléphone elle ne porte aucune lettre, et l'effacer
 * ferait du dessin autre chose qu'un pavé.
 */
function pave(entries, fs) {
  const groupes = new Map();
  for (const e of entries) {
    if (!groupes.has(e.value)) groupes.set(e.value, []);
    groupes.get(e.value).push({ char: e.char, label: e.label });
  }
  const places = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => ({
    key: d, lettres: groupes.get(d) || [],
    col: (Number(d) - 1) % 3, ligne: Math.floor((Number(d) - 1) / 3),
  }));

  const cols = 3;
  const rows = 3;
  const maxLettres = Math.max(1, ...places.map((p) => p.lettres.length));
  const parLigne = Math.min(maxLettres, PAR_LIGNE_MAX);
  const lignesLettres = Math.max(1, Math.ceil(maxLettres / parLigne));

  const pitch = Math.ceil(fs * T.lettre * ADVANCE_RATIO) + 8;
  let teteLarge = 0;
  for (const p of places) teteLarge = Math.max(teteLarge, textWidth(p.key, fs * T.tete));
  const cellW = Math.max(CELL_MIN_W, Math.ceil(Math.max(teteLarge, parLigne * pitch)) + PAD_X * 2);
  const cellH = PAD_Y * 2 + LIGNE + lignesLettres * LIGNE;

  const width = cols * cellW + (cols - 1) * GAP;
  const height = rows * cellH + (rows - 1) * GAP;
  const x0 = -width / 2;
  const y0 = -height / 2;

  const cells = [];
  const index = {};
  for (const p of places) {
    const cx = round(x0 + p.col * (cellW + GAP) + cellW / 2);
    const cy = round(y0 + p.ligne * (cellH + GAP) + cellH / 2);
    const yTete = round(cy - cellH / 2 + PAD_Y + LIGNE / 2);
    const labels = [{ text: p.key, cx, cy: yTete, size: round(fs * T.tete), tone: 'gold' }];
    const rangs = [];
    for (let i = 0; i < p.lettres.length; i += parLigne) rangs.push(p.lettres.slice(i, i + parLigne));
    rangs.forEach((rang, r) => {
      const y = round(yTete + LIGNE * (r + 1));
      const xDepart = cx - ((rang.length - 1) / 2) * pitch;
      rang.forEach((l, j) => {
        const x = round(xDepart + j * pitch);
        labels.push({ text: l.label, cx: x, cy: y, size: round(fs * T.lettre), tone: 'fg' });
        index[l.char] = {
          cell: cells.length,
          lettre: { x, y },
          // ★ Le nombre redescend de la TÊTE de la touche : c'est elle qui
          // porte la valeur, et c'est elle que le spectateur a lue.
          valeur: { x: cx, y: yTete },
          value: p.key,
          note: null,
        };
      });
    });
    cells.push({
      key: p.key, col: p.col, ligne: p.ligne,
      x: round(cx - cellW / 2), y: round(cy - cellH / 2),
      w: cellW, h: cellH, cx, cy, vide: p.lettres.length === 0, labels,
    });
  }

  return { disposition: 'pave', cols, rows, width, height, cellW, cellH, cells, index };
}
