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
    // Les coupures posées par une primitive s'appliquent-elles ? Faux par
    // défaut : personne ne coupe une ligne sans l'avoir demandé.
    coupuresExplicites: false,
    centerX: viewBox.x + viewBox.w / 2,
    centerY: viewBox.y + viewBox.h / 2,
    // Report signé de la ligne — zéro tant que la ligne EST le sujet.
    decalage: 0,
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
 * ★ **`opts.coupuresExplicites` — la coupure choisie, jamais subie.**
 *
 * Le repli automatique reste interdit ; une coupure `breakBefore` posée par une
 * primitive, elle, est un choix de mise en page et s'applique. Le seul emploi à
 * ce jour : `reveal`, qui répartit plus de trois séries de 666 sur deux rangs
 * pour pouvoir les grossir. Un verdict n'est pas une séquence à lire d'un bout
 * à l'autre, c'est un compte : le couper entre deux séries ne trahit rien.
 *
 * ★ **`opts.decalage` — centrer autre chose que la ligne entière.**
 *
 * Le layout centre ce qu'il dispose : toute la ligne. C'est le bon centre tant
 * que la ligne se lit d'un seul œil. `partition` change ce régime — les groupes
 * deviennent le sujet, le reste s'estompe — et le sujet n'est presque jamais au
 * milieu de la ligne. `decalage` est le report, **signé**, qui l'y ramène : la
 * ligne reste posée par la même arithmétique, translatée d'autant.
 *
 * Signé, donc symétrique : un sujet trop à droite se ramène par un décalage
 * négatif, un sujet trop à gauche par un décalage positif. C'est ce que ne
 * savait pas faire l'ancienne « marge de tête » (le `gapBefore` du premier
 * jeton), qui ne pouvait pousser que vers la droite — et qui, pire, se
 * déclenchait toute seule dès qu'un jeton porteur d'un écart de frontière se
 * retrouvait en tête du flux.
 *
 * Il vit dans `layoutOpts`, donc il TRAVERSE les steps : le découpage reste
 * cadré tant qu'il est le sujet, et `reveal` le remet à zéro pour que le
 * verdict retrouve le centre exact. Zéro par défaut : rien ne change.
 *
 * @param {{id:string,w:number,gapBefore?:number,breakBefore?:boolean}[]} items
 * @param {ReturnType<typeof defaultLayoutOptions>} opts
 * @returns {{positions: Map<string,{x:number,y:number,w:number,line:number}>,
 *            lines:number, width:number, height:number, overflow:boolean}}
 */
export function layoutFlow(items, opts) {
  const { gap, lineHeight, maxWidth, centerX, centerY } = opts;
  const decalage = Number.isFinite(opts.decalage) ? opts.decalage : 0;
  const wrap = opts.wrap === true;
  // ★ Une coupure EXPLICITE n'est pas un repli automatique. `wrap` gouverne le
  // repli que la doctrine interdit — celui qui coupe une séquence dès qu'elle
  // dépasse la largeur utile, à un endroit que personne n'a choisi. Une coupure
  // posée par une primitive (`reveal`, qui répartit cinq séries de 666 sur deux
  // rangs) est un choix de mise en page, et elle s'applique sans ouvrir la porte
  // au repli automatique. Voir `reveal.js`, « Quand il y a PLUS qu'un 666 ».
  const coupures = wrap || opts.coupuresExplicites === true;
  const positions = new Map();
  if (!items.length) return { positions, lines: 0, width: 0, height: 0, overflow: false };

  // 1. Découpage en lignes (glouton, jamais à l'intérieur d'un token).
  //    Sans `wrap`, il n'y a rien à découper : une seule ligne, point.
  const lines = [];
  let cur = { items: [], w: 0 };
  for (const it of items) {
    // Le premier jeton d'une ligne n'a pas de voisin de gauche : son écart
    // n'espace rien, et il ne décale pas la ligne — c'est `decalage` qui le
    // fait, explicitement.
    const g = cur.items.length === 0 ? 0 : (it.gapBefore ?? gap);
    const need = g + it.w;
    const mustBreak = coupures && it.breakBefore && cur.items.length > 0;
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
    let x = centerX - line.w / 2 + decalage;
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
