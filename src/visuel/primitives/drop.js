/**
 * `drop` — le token quitte le flux.
 *
 * Recherche §4.2. Deux temps : la chute (opacité + translation + réduction),
 * puis le regroupement des survivants, déclenché à ~60 % de la chute
 * (chevauchement volontaire : c'est ce qui rend le mouvement fluide).
 *
 * CONTRACTS §3.2 règle 7 — le token n'est **jamais** retiré du DOM : il sort de
 * la liste de layout (structure JS) et reste dans le document à `opacity: 0`,
 * sinon un `seek()` en arrière ne pourrait pas le faire revenir.
 */

import { targetsOf } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'drop';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const fall = ctx.dur * 0.55;

  ids.forEach((id, i) => {
    const at = i * ctx.stagger;
    const pos = ctx.scene.pos(id);
    ctx.anim({ id, prop: 'translate', to: { x: pos.x, y: pos.y + 26 }, at, dur: fall, ease: EASE.fade });
    ctx.anim({ id, prop: 'scale', to: 0.6, at, dur: fall });
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur: fall });
    const halo = `@halo:${id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: fall * 0.6 });
    ctx.scene.kill(id, ctx.where);
  });

  ctx.reflow({ at: fall * 0.6, dur: ctx.dur - fall * 0.6, ease: EASE.move });
}
