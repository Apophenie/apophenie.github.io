/**
 * `group` — regroupement (pour une addition, une paire, un mot).
 *
 * Recherche §4.5 : deux registres simultanés — une accolade (ou un encadré)
 * tracée par `stroke-dashoffset`, et un **resserrement** de l'espacement entre
 * les membres (~30 %). C'est le resserrement qui *se lit* comme un regroupement.
 *
 * `getTotalLength()` n'est jamais appelé (coûteux, et indisponible hors DOM) :
 * on pose `pathLength="100"` sur le tracé, ce qui normalise `stroke-dasharray`
 * et `stroke-dashoffset` — la longueur réelle devient sans objet.
 */

import { targetsOf } from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'group';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const shape = ctx.op.shape || 'brace';
  if (shape !== 'brace' && shape !== 'box') {
    fail(`${ctx.where}« shape » = « ${shape} » : seules « brace » et « box » existent.`);
  }
  const tighten = typeof ctx.op.tighten === 'number' ? ctx.op.tighten : 0.7;

  // 1. resserrement + FLIP.
  const gap = ctx.layoutOpts.gap;
  ids.slice(1).forEach((id) => { ctx.scene.get(id).gapBefore = gap * tighten; });
  ctx.reflow({ at: 0, dur: ctx.dur * 0.6, ease: EASE.move });

  // 2. tracé de l'accolade, en unités viewBox.
  const box = bboxOf(ids, ctx.scene.positions, ctx.metrics, 8);
  if (!box) return;
  const id = ctx.op.id && !String(ctx.op.id).startsWith('@') ? ctx.op.id : ctx.gensym('group');
  const W = box.w / 2;
  const H = box.h / 2;
  const d = shape === 'box'
    ? `M ${-W} ${-H} H ${W} V ${H} H ${-W} Z`
    : `M ${-W} ${-H} v 12 h ${W - 11} l 11 12 l 11 -12 h ${W - 11} v -12`;
  const anchorY = shape === 'box' ? box.cy : box.y + box.h + 14;

  ctx.scene.create({
    id,
    role: 'bracket',
    inFlow: false,
    w: box.w,
    data: { d, shape },
    base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.place(id, { x: box.cx, y: anchorY, w: box.w });
  ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: ctx.dur * 0.25, dur: ctx.dur * 0.75, ease: EASE.fade });

  if (typeof ctx.op.label === 'string' && ctx.op.label) {
    const lid = ctx.gensym('grouplabel');
    ctx.scene.create({
      id: lid, role: 'label', text: ctx.op.label, inFlow: false,
      w: ctx.metrics.advance * 0.6 * ctx.op.label.length,
      data: { scale: 0.55 },
      base: { opacity: 0, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.place(lid, { x: box.cx, y: anchorY + 34 });
    ctx.anim({ id: lid, prop: 'opacity', to: 1, at: ctx.dur * 0.6, dur: ctx.dur * 0.4 });
  }
}
