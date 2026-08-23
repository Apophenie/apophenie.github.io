/**
 * Fabrique des éléments SVG et application des états.
 *
 * Règles non négociables appliquées ici (CONTRACTS §3.2) :
 *  3. propriétés individuelles `translate` / `rotate` / `scale`, jamais un
 *     `transform` composite : chaque step anime son propre canal ;
 *  4. `transform-box: fill-box; transform-origin: center` sur tous les tokens ;
 *  5. toutes les valeurs sont en unités viewBox (le suffixe `px` est obligatoire
 *     en CSS, mais l'unité reste celle du système de coordonnées utilisateur) ;
 *  9. **aucun `foreignObject`** : il rend le canvas *tainted* à l'export.
 *
 * On pose toutes les positions via `element.style`, jamais via l'attribut
 * `transform` : la propriété CSS gagne sur l'attribut, les mélanger produirait
 * des états contradictoires selon qu'une animation est active ou non (§5.3).
 */

import { FONT_FAMILY, PALETTE } from './constants.js';
import { glyphTransform } from './assets.js';
import { alphabetGeometry } from './assets.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

/** Couches de la scène, du fond vers l'avant. */
export const LAYERS = ['back', 'mid', 'front'];

const LAYER_OF = {
  camera: null, halo: 'back', keyboard: 'back', alphabet: 'back', frame: 'back',
  text: 'mid',
  glyph: 'front', seg: 'front', bracket: 'front', label: 'front', marker: 'front',
};

export function layerOf(role) {
  return LAYER_OF[role] ?? 'front';
}

export function el(name, attrs = {}) {
  const e = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    e.setAttribute(k, String(v));
  }
  return e;
}

/**
 * Crée l'élément d'un nœud de scène.
 * @param {object} node
 * @param {{metrics:object, palette:object}} env
 */
export function createElementFor(node, env) {
  const { metrics, palette = PALETTE } = env;
  const fs = metrics.fontSize;
  let element;

  switch (node.role) {
    case 'text': {
      element = el('text', {
        x: 0, y: 0,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': FONT_FAMILY,
        'font-size': fs,
        'font-variant-numeric': 'tabular-nums',
        class: `nhl-token nhl-kind-${node.kind || 'letter'}`,
      });
      element.textContent = node.text;
      break;
    }
    case 'label': {
      const s = (node.data && node.data.scale) || 0.55;
      element = el('text', {
        x: 0, y: 0,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': FONT_FAMILY,
        'font-size': Math.round(fs * s * 100) / 100,
        'letter-spacing': '0.04em',
        class: 'nhl-label',
      });
      element.textContent = node.text;
      break;
    }
    case 'halo': {
      const h = (node.data && node.data.h) || fs * 1.16;
      element = el('rect', {
        x: -node.w / 2, y: -h / 2, width: node.w, height: h,
        rx: (node.data && node.data.rx) || 2,
        class: 'nhl-halo',
      });
      break;
    }
    case 'bracket': {
      element = el('path', {
        d: node.data.d,
        fill: 'none',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: 100,
        'stroke-dasharray': 100,
        class: 'nhl-bracket',
      });
      break;
    }
    case 'glyph':
    case 'seg': {
      // Le tracé vit dans le repère glyphe (0..400 × 0..600, origine en bas à
      // gauche) : un `<g>` interne porte la transformation **statique** de mise
      // à l'échelle et de retournement de l'axe y. Elle n'est jamais animée.
      // `data.scale` agrandit le glyphe SANS toucher au canal `scale` du nœud :
      // l'encart de démonstration montre la lettre en grand, et la primitive
      // garde `scale` libre pour ses propres accents.
      const zoom = (node.data && node.data.scale) || 1;
      const wrap = el('g');
      const inner = el('g', { transform: glyphTransform(fs * zoom).transform });
      inner.appendChild(el('path', {
        d: node.data.d,
        fill: 'none',
        'stroke-width': node.role === 'seg' ? 56 : 46,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: 100,
        'stroke-dasharray': 100,
        'vector-effect': 'none',
        class: node.role === 'seg' ? 'nhl-seg' : 'nhl-glyph',
      }));
      wrap.appendChild(inner);
      element = wrap;
      break;
    }
    case 'frame': {
      // L'encart : le cadre dans lequel la lettre est montrée en grand,
      // changée de police, comptée. Un rectangle, rien de plus — c'est le
      // contenu qui parle.
      const h = (node.data && node.data.h) || fs * 2;
      element = el('rect', {
        x: -node.w / 2, y: -h / 2, width: node.w, height: h,
        rx: (node.data && node.data.rx) || 6,
        fill: (node.data && node.data.fill) || 'none',
        'stroke-width': 1.5,
        class: 'nhl-frame',
      });
      break;
    }
    case 'alphabet': {
      element = buildAlphabet(node, fs, palette);
      break;
    }
    case 'marker': {
      element = el('circle', { cx: 0, cy: 0, r: (node.data && node.data.r) || 6, class: 'nhl-marker' });
      break;
    }
    case 'keyboard': {
      element = buildKeyboard(node, fs, palette);
      break;
    }
    default:
      element = el('g');
  }

  element.setAttribute('data-nhl-id', node.id);
  // Règle 4 : sans `fill-box`, un rotate(180deg) tournerait autour du centre du
  // canevas SVG entier, pas du glyphe.
  element.style.transformBox = 'fill-box';
  element.style.transformOrigin = 'center';
  element.style.pointerEvents = 'none';
  return element;
}

/**
 * Dessine le clavier : quatre rangées (ou les trois rangées de lettres seules),
 * plus les repères de la mesure demandée.
 *
 *  - `mesure: 'colonne'` → une **réglette numérotée de 1 à 10** au-dessus du
 *    clavier. Elle est indispensable : le `p` est en colonne 10 alors que la
 *    touche du dessus porte `0`. C'est l'index de colonne qui compte, pas le
 *    label de la touche du dessus.
 *  - `mesure: 'rangee'` → les trois rangées de lettres numérotées en marge, et
 *    la rangée de chiffres **absente** (la montrer laisserait croire qu'elle
 *    compte comme une rangée de plus).
 */
function buildKeyboard(node, fs, palette) {
  const g = el('g', { class: 'nhl-keyboard' });
  const geo = node.data.geo;
  const mesure = node.data.mesure || 'touche';

  for (const k of geo.keys) {
    g.appendChild(el('rect', {
      x: k.x, y: k.y, width: k.w, height: k.h, rx: 4,
      fill: palette.raised, stroke: palette.line, 'stroke-width': 1,
    }));
    if (k.rangee === 0) {
      // Rangée de chiffres : le chiffre (avec Maj) en haut, la frappe directe
      // en bas. C'est littéralement ce qu'on lit sur une touche.
      const haut = k.shift === null ? k.digit : k.shift;
      const bas = k.shift === null ? k.char : k.digit;
      g.appendChild(keyLabel(haut, k.cx, k.cy - k.h * 0.16, fs * 0.42, palette.fg3));
      g.appendChild(keyLabel(bas, k.cx, k.cy + k.h * 0.2, fs * 0.5, palette.fg));
    } else {
      g.appendChild(keyLabel(k.char.toUpperCase(), k.cx, k.cy, fs * 0.5, palette.fg));
    }
  }

  if (mesure === 'colonne') {
    for (const t of geo.ruler) {
      g.appendChild(keyLabel(String(t.n), t.cx, t.cy, fs * 0.38, palette.gold));
    }
    const y = geo.ruler[0].cy + fs * 0.26;
    g.appendChild(el('path', {
      d: `M ${round(-geo.width / 2)} ${round(y)} L ${round(geo.width / 2)} ${round(y)}`,
      fill: 'none', stroke: palette.gold, 'stroke-width': 1, opacity: 0.4,
    }));
  }
  if (mesure === 'rangee') {
    for (const t of geo.rowLabels) {
      g.appendChild(keyLabel(String(t.n), t.cx, t.cy, fs * 0.44, palette.gold));
    }
  }
  return g;
}

/**
 * Dessine l'alphabet complet, NUMÉROTÉ — deux rangées de treize cases, la
 * lettre en haut de sa case, son rang en bas.
 *
 * C'est le pendant du clavier virtuel pour la conversion « lettre → rang dans
 * l'alphabet » : on ne se contente pas d'annoncer que `H` vaut 8, on montre
 * l'alphabet numéroté et on va y chercher le 8.
 */
function buildAlphabet(node, fs, palette) {
  const g = el('g', { class: 'nhl-alphabet' });
  const geo = node.data.geo || alphabetGeometry({ ordre: node.data.ordre });
  for (const c of geo.cells) {
    g.appendChild(el('rect', {
      x: c.x, y: c.y, width: c.w, height: c.h, rx: 4,
      fill: palette.raised, stroke: palette.line, 'stroke-width': 1,
    }));
    g.appendChild(keyLabel(c.char, c.cx, c.lettreCy, fs * 0.5, palette.fg));
    g.appendChild(keyLabel(String(c.rang), c.cx, c.rangCy, fs * 0.36, palette.gold));
  }
  return g;
}

function keyLabel(text, x, y, size, fill) {
  const t = el('text', {
    x, y,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-family': FONT_FAMILY, 'font-size': Math.round(size * 100) / 100,
    fill,
  });
  t.textContent = text;
  return t;
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

/** Sérialise une valeur de canal pour CSS / WAAPI. */
export function formatValue(prop, v) {
  switch (prop) {
    case 'translate':
      return `${num(v.x)}px ${num(v.y)}px`;
    case 'rotate':
      return `${num(v)}deg`;
    case 'scale':
      return String(num(v));
    case 'r':
      return `${num(v)}px`;
    case 'opacity':
    case 'strokeDashoffset':
      return String(num(v));
    default:
      return String(v);
  }
}

/** Nom CSS d'un canal (pour `element.style`). */
const CSS_NAME = {
  translate: 'translate',
  rotate: 'rotate',
  scale: 'scale',
  opacity: 'opacity',
  fill: 'fill',
  stroke: 'stroke',
  strokeDashoffset: 'strokeDashoffset',
  r: 'r',
};

/** Applique une valeur de canal directement (état de base, ou repli sans WAAPI). */
export function applyProp(element, prop, value) {
  const name = CSS_NAME[prop];
  if (!name) return;
  element.style[name] = formatValue(prop, value);
}

/** Applique l'état de base d'un nœud (ce qui est vu avant toute animation). */
export function applyBase(element, node) {
  for (const [prop, value] of Object.entries(node.base)) {
    if (value === null || value === undefined) continue;
    applyProp(element, prop, value);
  }
  if (node.base.translate == null) applyProp(element, 'translate', { x: 0, y: 0 });
}

/** Applique une mise à jour discrète (canal rAF : texte, `d`, attribut). */
export function applyDiscrete(element, channel, value) {
  if (channel === 'text') {
    const target = element.tagName === 'text' ? element : element.querySelector('text');
    if (target && target.textContent !== value) target.textContent = value;
    return;
  }
  if (channel === 'd') {
    const target = element.tagName === 'path' ? element : element.querySelector('path');
    if (target) target.setAttribute('d', value);
    return;
  }
  if (channel.startsWith('attr:')) {
    element.setAttribute(channel.slice(5), value);
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}
