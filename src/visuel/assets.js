/**
 * Assets vectoriels appartenant au moteur visuel : afficheur 7 segments et
 * clavier (quatre rangées, AZERTY ou QWERTY).
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
