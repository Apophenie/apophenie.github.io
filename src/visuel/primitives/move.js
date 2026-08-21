/**
 * `move` — migration / réarrangement (FLIP analytique).
 *
 * C'est la primitive centrale : presque toutes les autres s'appuient dessus via
 * `ctx.reflow()`. Le moteur arithmétique n'envoie **jamais** de coordonnées
 * (CONTRACTS §7.3) : `move` décrit un changement d'**ordre** dans le flux, pas
 * une position. Le layout engine décide du reste.
 *
 * Formes acceptées :
 *   { op:'move' }                              simple recalcul (après une autre op)
 *   { op:'move', order:['t2','t0','t1'] }      ordre imposé (ids listés d'abord)
 *   { op:'move', targets:[…], to:'front'|'back' }
 *
 * Recherche §4.4 : pas de « First/Last » par mesure du DOM — on connaît les deux
 * valeurs de `translate` et on écrit directement les deux keyframes. Pas de
 * lecture DOM, pas de reflow synchrone, tout en unités viewBox.
 */

import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'move';

export function plan(ctx) {
  const { op, scene } = ctx;

  if (Array.isArray(op.order)) {
    const wanted = op.order.map((id) => scene.live(id, ctx.where).id);
    const rest = scene.flow.filter((id) => !wanted.includes(id));
    scene.flow.splice(0, scene.flow.length, ...wanted, ...rest);
  } else if (op.targets !== undefined) {
    const ids = scene.resolve(op.targets, ctx.where);
    const rest = scene.flow.filter((id) => !ids.includes(id));
    const where = op.to || 'front';
    if (where !== 'front' && where !== 'back') {
      fail(`${ctx.where}« to » = « ${where} » : seules les valeurs « front » et « back » sont admises (le moteur visuel possède le layout, CONTRACTS §7.3).`);
    }
    const next = where === 'front' ? [...ids, ...rest] : [...rest, ...ids];
    scene.flow.splice(0, scene.flow.length, ...next);
  }

  const moved = ctx.reflow({ at: 0, dur: ctx.dur, ease: EASE.move });
  if (!moved.length) ctx.occupy(ctx.dur);
}
