/**
 * `reveal` — l'affichage du `666` final.
 *
 * Recherche §4.13 : stagger, `scale`, halo. Palette : le rouge de rubrication
 * est « l'affirmation » et l'or « la valeur atteinte » (design §2.3), donc les
 * chiffres passent en rubrique sur halo doré.
 */

import { targetsOf, ensureHalo } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'reveal';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const stagger = ctx.stagger || (ctx.reduced ? 0 : ctx.dur * 0.18);
  const grow = typeof ctx.op.scale === 'number' ? ctx.op.scale : 1.35;
  const withHalo = ctx.op.halo !== false;

  ids.forEach((id, i) => {
    const at = i * stagger;
    const d = Math.max(1, ctx.dur - at);
    ctx.anim({ id, prop: 'opacity', to: 1, at, dur: d * 0.4 });
    ctx.anim({ id, prop: 'scale', values: [1, grow * 1.12, grow], offsets: [0, 0.62, 1], at, dur: d, ease: EASE.pop });
    ctx.anim({ id, prop: 'fill', to: ctx.palette.rubric, at, dur: d * 0.6 });
    if (withHalo) {
      const halo = ensureHalo(ctx, id, 'gold');
      ctx.anim({ id: halo, prop: 'scale', to: grow, at, dur: d, ease: EASE.pop });
      ctx.anim({ id: halo, prop: 'opacity', to: 0.24, at, dur: d * 0.6 });
    }
  });
}
