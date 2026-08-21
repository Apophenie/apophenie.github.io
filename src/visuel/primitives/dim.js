/**
 * `dim` — atténuation. Le token **reste** : « on ignore https:// » sans casser
 * la lisibilité de la chaîne (recherche §4.2). À ne pas confondre avec `drop`,
 * qui sort du flux.
 */

import { targetsOf } from './helpers.js';

export const name = 'dim';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const to = typeof ctx.op.to === 'number' ? ctx.op.to : 0.18;
  ids.forEach((id, i) => {
    ctx.anim({ id, prop: 'opacity', to, at: i * ctx.stagger, dur: ctx.dur });
  });
}
