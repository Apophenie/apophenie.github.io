/**
 * `highlight` — mise en évidence / sélection.
 *
 * Recherche §4.1 : on anime le `fill` du texte et l'`opacity` d'un halo posé
 * derrière, **jamais** le `font-weight` (il provoque un reflow du texte et une
 * largeur qui change, donc un layout faux). Le halo est dimensionné depuis le
 * modèle de layout, pas depuis `getBBox()` — donc jamais avant les polices.
 */

import { targetsOf, ensureHalo } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'highlight';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const mode = ctx.op.mode || 'select'; // 'select' (l'attention arrive) | 'reject'
  const tone = mode === 'reject' ? 'rubric' : 'gold';

  ids.forEach((id, i) => {
    const at = i * ctx.stagger;
    const halo = ensureHalo(ctx, id, tone);
    ctx.anim({ id: halo, prop: 'opacity', to: mode === 'reject' ? 0.28 : 0.22, at, dur: ctx.dur });
    ctx.anim({ id: halo, prop: 'fill', to: ctx.palette[tone], at, dur: 1 });
    ctx.anim({ id, prop: 'fill', to: ctx.palette[tone], at, dur: ctx.dur, ease: EASE.fade });
    if (mode === 'select') {
      ctx.anim({ id, prop: 'scale', values: [1, 1.08, 1.04], offsets: [0, 0.6, 1], at, dur: ctx.dur, ease: EASE.pop });
    }
  });
}
