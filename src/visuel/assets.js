/**
 * Assets vectoriels appartenant au moteur visuel : afficheurs 7 et 14 segments,
 * clavier (quatre rangées, AZERTY ou QWERTY), réglette alphabétique.
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

import { CAP_RATIO } from './constants.js';

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
// La réglette alphabétique — l'alphabet complet, numéroté
// ---------------------------------------------------------------------------

/**
 * L'alphabet latin, tel que le montre la primitive `alphabet`.
 *
 * Même parti que le clavier (§ ci-dessus) : ce n'est **pas** une table
 * arithmétique. La valeur vient du scénario, donc du moteur arithmétique
 * (`tables/alphabet.js`) ; ici on ne décide que de la géométrie du dessin, et
 * la primitive refuse d'afficher un rang qui contredirait celui du scénario.
 */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Nombre de colonnes de la réglette : deux rangées de treize tiennent en largeur. */
export const ALPHABET_COLS = 13;

/** Ordres de numérotation modélisés — vocabulaire fermé. */
export const ALPHABET_ORDRES = Object.freeze(['a1z26', 'z26a1']);

export const CELL = { w: 74, h: 84, gap: 8 };

/** Ordre demandé, ramené au vocabulaire fermé (défaut : A=1). */
export function normalizeOrdre(ordre) {
  return ordre === 'z26a1' ? 'z26a1' : 'a1z26';
}

/**
 * Rang MONTRÉ par la réglette pour une lettre donnée.
 * `null` si le caractère n'est pas une lettre latine non accentuée : c'est à
 * l'émetteur de replier en amont, comme il le fait déjà pour `sevenSeg`.
 */
export function alphabetValue(letter, ordre = 'a1z26') {
  if (typeof letter !== 'string' || !letter) return null;
  const i = ALPHABET.indexOf(letter.toUpperCase());
  if (i < 0) return null;
  return normalizeOrdre(ordre) === 'z26a1' ? 26 - i : i + 1;
}

/**
 * Géométrie de la réglette, centrée sur (0,0) dans le repère local du nœud
 * (y vers le bas, unités viewBox).
 *
 * Chaque case porte `{char, rang, colonne, ligne, cx, cy, x, y, w, h}` :
 * la LETTRE en haut de la case, son RANG en bas — c'est le rang qui redescend
 * vers la ligne, jamais la lettre.
 */
export function alphabetGeometry(options = {}) {
  const ordre = normalizeOrdre(options.ordre);
  const cols = options.cols || ALPHABET_COLS;
  const rows = Math.ceil(ALPHABET.length / cols);
  const pitchX = CELL.w + CELL.gap;
  const pitchY = CELL.h + CELL.gap;
  const width = cols * CELL.w + (cols - 1) * CELL.gap;
  const height = rows * CELL.h + (rows - 1) * CELL.gap;
  const x0 = -width / 2;
  const y0 = -height / 2;

  const cells = [...ALPHABET].map((char, i) => {
    const colonne = i % cols;
    const ligne = Math.floor(i / cols);
    const cx = round(x0 + colonne * pitchX + CELL.w / 2);
    const cy = round(y0 + ligne * pitchY + CELL.h / 2);
    return {
      char,
      rang: ordre === 'z26a1' ? 26 - i : i + 1,
      colonne: colonne + 1,
      ligne,
      cx,
      cy,
      x: round(cx - CELL.w / 2),
      y: round(cy - CELL.h / 2),
      w: CELL.w,
      h: CELL.h,
      /** Où s'affiche la lettre, et où s'affiche son rang, dans la case. */
      lettreCy: round(cy - CELL.h * 0.18),
      rangCy: round(cy + CELL.h * 0.27),
    };
  });

  return { ordre, cells, cols, rows, width, height, cellW: CELL.w, cellH: CELL.h };
}

/** Case portant une lettre — `null` si la lettre n'est pas modélisée. */
export function findCell(letter, options = {}) {
  if (typeof letter !== 'string' || !letter) return null;
  const geo = alphabetGeometry(options);
  const up = letter.toUpperCase();
  return geo.cells.find((c) => c.char === up) || null;
}
