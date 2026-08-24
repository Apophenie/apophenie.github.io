/**
 * Moteur visuel de NumHeroLOLgeek — point d'entrée public.
 *
 * Usage nominal depuis `src/app/` :
 *
 * ```js
 * import { prepare, createPlayer } from '../visuel/index.js';
 *
 * await prepare();                       // polices + table de glyphes
 * const player = createPlayer(svg, scenario, { reducedMotion: 'auto', speed: 1 });
 * player.on('change', (s) => refletUI(s));
 * ```
 *
 * `prepare()` couvre les deux prérequis de mesure : `document.fonts.ready`
 * (CONTRACTS §3.2 règle 8) et le chargement de `src/moteur/tables/glyphes.js`
 * (indispensable à `countStrokes` et `sevenSeg`). Le lecteur fonctionne sans,
 * mais un scénario de comptage échouera alors bruyamment — c'est voulu.
 */

export { createPlayer } from './player.js';
export { compile, REPEAT_SPEED, stepSignatures, repeatOrigins } from './compile.js';
export { validateScenario, assertPure } from './scenario.js';
export { CompileError } from './errors.js';
export { loadGlyphes, setGlyphes, getGlyphes, peekGlyphes, deriveGlyph } from './glyphes.js';
export { OP_NAMES, KINDS, EPS, VIEWBOX, PALETTE, DEFAULT_DUR } from './constants.js';
export {
  stepIndexAt, atStart, atEnd, atHinge, prevTarget, nextTarget, transition, controlsState,
} from './nav.js';
export { defaultMetrics, defaultLayoutOptions, layoutFlow, measureText, bboxOf } from './layout.js';

import { loadGlyphes } from './glyphes.js';

/**
 * Prérequis avant compilation. Idempotent.
 * @param {{glyphes?:string}} [options] chemin du module de glyphes
 */
export async function prepare(options = {}) {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  const table = await loadGlyphes(options.glyphes);
  return { glyphes: !!table };
}
