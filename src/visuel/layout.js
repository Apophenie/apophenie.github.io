/**
 * Moteur de layout des tokens — **unités viewBox**, pur, sans DOM.
 *
 * CONTRACTS §3.2 règle 5 : tout mesurer et animer en unités viewBox.
 * CONTRACTS §0.3 : les tokens sont en JetBrains Mono (chasse fixe), donc le
 * layout est de l'arithmétique pure — une largeur de glyphe constante, mesurée
 * une seule fois. Aucune lecture du DOM n'est nécessaire, ce qui rend le FLIP
 * « analytique » (recherche §5.5) et le scrubbing déterministe.
 *
 * Convention de position : chaque token est ancré par son **centre**
 * (`text-anchor: middle` + `dominant-baseline: central`), positionné par
 * `translate`. La largeur peut changer sans déplacer l'ancre.
 */

import { VIEWBOX, MARGIN, FONT_SIZE, ADVANCE_RATIO, TOKEN_GAP, LINE_HEIGHT, CAP_RATIO } from './constants.js';

/**
 * @typedef {Object} Metrics
 * @property {number} fontSize
 * @property {number} advance   largeur d'un caractère, en unités viewBox
 * @property {number} capHeight
 */

/** Métriques nominales (avant recalibrage sur `document.fonts.ready`). */
export function defaultMetrics(fontSize = FONT_SIZE, advanceRatio = ADVANCE_RATIO) {
  return {
    fontSize,
    advance: fontSize * advanceRatio,
    capHeight: fontSize * CAP_RATIO,
  };
}

/**
 * Options de layout par défaut.
 *
 * ★ `wrap: false` — **jamais deux lignes.** `research/moteur-visuel.md §5.2`
 * prévoyait de repasser en plusieurs lignes sous un seuil de largeur ; la
 * doctrine a changé. Une séquence qui déborde ne se replie pas, elle
 * **défile** : le compilateur amène l'action au centre en déplaçant le groupe
 * `@pan` (voir `compile.js`, bloc « Défilement »). Une ligne coupée en deux
 * casse la lecture — la chaîne se lit de gauche à droite, d'un bout à l'autre,
 * et un retour à la ligne au milieu d'une URL invente une frontière qui
 * n'existe pas.
 *
 * `maxWidth` n'est donc plus une largeur de coupure : c'est la **largeur utile
 * de la scène**, celle dans laquelle le défilement cadre l'action et dans
 * laquelle `fitScale` fait tenir un clavier ou une réglette.
 */
export function defaultLayoutOptions(metrics = defaultMetrics(), viewBox = VIEWBOX) {
  return {
    viewBox,
    gap: TOKEN_GAP,
    lineHeight: LINE_HEIGHT,
    maxWidth: viewBox.w - 2 * MARGIN,
    wrap: false,
    centerX: viewBox.x + viewBox.w / 2,
    centerY: viewBox.y + viewBox.h / 2,
    metrics,
  };
}

/** Largeur d'un token texte, en unités viewBox. */
export function measureText(text, metrics) {
  const n = typeof text === 'string' ? [...text].length : 0;
  return Math.max(n, 1) * metrics.advance;
}

/**
 * Dispose une suite d'éléments en ligne(s), centrée dans la zone utile.
 *
 * Par défaut (`opts.wrap !== true`) : **une seule ligne, toujours**, quelle que
 * soit sa longueur. `overflow` dit alors qu'elle est plus large que la zone
 * utile — c'est le signal que le défilement doit prendre le relais.
 *
 * @param {{id:string,w:number,gapBefore?:number,breakBefore?:boolean}[]} items
 * @param {ReturnType<typeof defaultLayoutOptions>} opts
 * @returns {{positions: Map<string,{x:number,y:number,w:number,line:number}>,
 *            lines:number, width:number, height:number, overflow:boolean}}
 */
export function layoutFlow(items, opts) {
  const { gap, lineHeight, maxWidth, centerX, centerY } = opts;
  const wrap = opts.wrap === true;
  const positions = new Map();
  if (!items.length) return { positions, lines: 0, width: 0, height: 0, overflow: false };

  // 1. Découpage en lignes (glouton, jamais à l'intérieur d'un token).
  //    Sans `wrap`, il n'y a rien à découper : une seule ligne, point.
  const lines = [];
  let cur = { items: [], w: 0 };
  for (const it of items) {
    const g = cur.items.length === 0 ? 0 : (it.gapBefore ?? gap);
    const need = g + it.w;
    const mustBreak = wrap && it.breakBefore && cur.items.length > 0;
    if (mustBreak || (wrap && cur.items.length > 0 && cur.w + need > maxWidth)) {
      lines.push(cur);
      cur = { items: [], w: 0 };
      cur.items.push({ ...it, g: 0 });
      cur.w = it.w;
    } else {
      cur.items.push({ ...it, g });
      cur.w += need;
    }
  }
  lines.push(cur);

  // 2. Placement : lignes centrées horizontalement, bloc centré verticalement.
  const totalH = lines.length * lineHeight;
  const y0 = centerY - totalH / 2 + lineHeight / 2;
  let maxW = 0;
  lines.forEach((line, li) => {
    maxW = Math.max(maxW, line.w);
    let x = centerX - line.w / 2;
    const y = y0 + li * lineHeight;
    for (const it of line.items) {
      x += it.g;
      positions.set(it.id, { x: round(x + it.w / 2), y: round(y), w: it.w, line: li });
      x += it.w;
    }
  });

  return { positions, lines: lines.length, width: maxW, height: totalH, overflow: maxW > maxWidth };
}

/**
 * Boîte englobante d'un ensemble de positions (unités viewBox).
 * Sert à `group`, `annotate`, `reveal` — jamais `getBoundingClientRect`.
 */
export function bboxOf(ids, positions, metrics, pad = 0) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const id of ids) {
    const p = positions.get(id);
    if (!p) continue;
    // `p.h` n'est renseignée que par les gestes qui changent la TAILLE d'un
    // jeton (le verdict, qui grossit les chiffres) : sans elle, une annotation
    // posée « sous » un 6 de sept centimètres se retrouverait au milieu du 6.
    const h = p.h || metrics.fontSize;
    x0 = Math.min(x0, p.x - p.w / 2);
    x1 = Math.max(x1, p.x + p.w / 2);
    y0 = Math.min(y0, p.y - h / 2);
    y1 = Math.max(y1, p.y + h / 2);
  }
  if (x0 === Infinity) return null;
  return {
    x: round(x0 - pad),
    y: round(y0 - pad),
    w: round(x1 - x0 + 2 * pad),
    h: round(y1 - y0 + 2 * pad),
    cx: round((x0 + x1) / 2),
    cy: round((y0 + y1) / 2),
  };
}

/**
 * Centre du i-ème caractère d'un token texte — chasse fixe, donc arithmétique.
 * Remplace `getStartPositionOfChar` (recherche §4.8) : pas de lecture DOM.
 */
export function charCenter(pos, index, metrics) {
  return {
    x: round(pos.x - pos.w / 2 + metrics.advance * (index + 0.5)),
    y: pos.y,
  };
}

/**
 * Échelle de caméra nécessaire pour qu'un contenu de largeur `w` tienne dans la
 * zone utile. Utilisé par `keyboard` (CONTRACTS §3.2 règle 6 : on anime le
 * `transform` du groupe caméra, jamais l'attribut `viewBox`).
 */
export function fitScale(w, h, opts) {
  const sx = opts.maxWidth / Math.max(w, 1);
  const sy = (opts.viewBox.h - 2 * 24) / Math.max(h, 1);
  return Math.min(1, sx, sy);
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
