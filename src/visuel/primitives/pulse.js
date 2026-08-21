/**
 * `pulse` — accentuation ponctuelle : « voilà, c'est ça ».
 * Recherche §4.13. Uniquement `scale` (compositable) : pas de filtre, pas de
 * flou — très coûteux sur mobile (§5.4).
 */

import { targetsOf } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'pulse';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const amount = typeof ctx.op.amount === 'number' ? ctx.op.amount : 1.2;
  ids.forEach((id, i) => {
    const base = ctx.scene.get(id).base.scale ?? 1;
    ctx.anim({
      id, prop: 'scale',
      values: [base, base * amount, base],
      offsets: [0, 0.45, 1],
      at: i * ctx.stagger, dur: ctx.dur, ease: EASE.pop,
    });
  });
}
