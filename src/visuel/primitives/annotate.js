/**
 * `annotate` — étiquette explicative, éventuellement fléchée.
 *
 * Recherche §4.13. Le texte de l'annotation est fourni par le scénario : c'est
 * de la pédagogie, pas de la décoration. Il est aussi repris dans le Registre
 * accessible via `step.caption` — la scène SVG étant `aria-hidden` (CONTRACTS §6).
 */

import { targetsOf } from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'annotate';

/**
 * D'où l'annotation arrive : de quelques unités en deçà de sa place, du côté
 * où elle se pose. Le glissement est ce qui la fait lire comme une venue, et
 * non comme une apparition.
 */
function depart(at, place) {
  if (place === 'left') return { x: at.x - 10, y: at.y };
  if (place === 'right') return { x: at.x + 10, y: at.y };
  return { x: at.x, y: at.y + (place === 'above' ? 10 : -10) };
}

export function plan(ctx) {
  const text = ctx.op.text;
  if (typeof text !== 'string' || !text.trim()) {
    fail(`${ctx.where}« text » non vide obligatoire.`);
  }
  const ids = ctx.op.anchor !== undefined
    ? ctx.scene.resolve(ctx.op.anchor, ctx.where)
    : targetsOf(ctx);
  const box = bboxOf(ids, ctx.scene.positions, ctx.metrics, 6);
  if (!box) fail(`${ctx.where}aucune ancre positionnée pour l'annotation.`);

  // ★ QUATRE CÔTÉS, ET LE POURQUOI DES DEUX DERNIERS.
  //
  //   Une annotation commente, donc elle se pose au-dessus ou au-dessous : deux
  //   places suffisaient tant qu'il s'agissait de nommer. Encadrer est un autre
  //   besoin — `|−28|` n'est pas un commentaire sur le nombre, c'est une
  //   NOTATION qui l'entoure, et elle n'a de sens qu'à sa gauche et à sa droite.
  //   « Durant la transition, le nombre devrait être encadré par le symbole de
  //   abs » (l'auteur, à propos de `p.abs`).
  //
  //   Les deux nouvelles places se calent sur le FLANC de la boîte et se
  //   centrent verticalement dessus ; elles n'entrent pas dans le flux, comme
  //   toute annotation, donc elles ne poussent rien.
  const place = ctx.op.place || 'below';
  if (!['above', 'below', 'left', 'right'].includes(place)) {
    fail(`${ctx.where}« place » = ${JSON.stringify(place)} — les quatre côtés modélisés sont above, below, left, right.`);
  }
  const above = place === 'above';
  const deCote = place === 'left' || place === 'right';
  // ★ À QUELLE DISTANCE — et ce n'est pas la même selon ce qu'on annote.
  //
  //   Une conclusion (« 666 ») se pose à distance de lecture : elle commente
  //   toute la ligne, et la coller au dernier jeton la ferait passer pour une
  //   suite de celui-ci. Une DÉSIGNATION (« MAX » au-dessus d'un nombre, « ^ »
  //   sous une initiale) fait l'inverse : elle ne vaut que pour CE jeton-là, et
  //   c'est la proximité qui l'attache — « MAX et MIN sont trop loin au-dessus
  //   du nombre qu'ils désignent » (l'auteur). L'écart se déclare donc, en
  //   fractions de casse, et vaut la distance de lecture par défaut.
  const ecart = typeof ctx.op.ecart === 'number' && ctx.op.ecart > 0 ? ctx.op.ecart : 1.05;
  const dy = ctx.metrics.fontSize * ecart;
  const dx = ctx.metrics.advance * (typeof ctx.op.ecart === 'number' && ctx.op.ecart > 0 ? ctx.op.ecart : 0.45);
  const at = deCote
    ? { x: place === 'left' ? box.x - dx : box.x + box.w + dx, y: box.y + box.h / 2 }
    : { x: box.cx, y: above ? box.y - dy : box.y + box.h + dy };

  const id = ctx.op.id && !String(ctx.op.id).startsWith('@') ? ctx.op.id : ctx.gensym('annot');
  ctx.scene.create({
    id, role: 'label', text, inFlow: false,
    w: ctx.metrics.advance * 0.55 * [...text].length,
    data: { scale: 0.55 },
    base: { opacity: 0, fill: ctx.palette.fg2, translate: depart(at, place) },
  }, { where: ctx.where });
  ctx.scene.place(id, depart(at, place));
  ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: ctx.dur * 0.7 });
  ctx.place(id, at, { at: 0, dur: ctx.dur * 0.7 });

  // ★ FUGACE — l'étiquette qui NOMME un geste, et s'en va avec lui.
  //
  //   Une annotation ordinaire reste : c'est une conclusion, elle appartient à
  //   ce qui suit. Nommer une transformation est autre chose — « on retire les
  //   accents », « en capitales » — : la mention accompagne le geste, et si
  //   elle survivait, la ligne finirait couverte de sous-titres d'étapes déjà
  //   jouées. Elle paraît, elle tient le temps qu'on la lise, elle s'efface.
  if (ctx.op.fugace) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: ctx.dur * 0.78, dur: Math.max(1, ctx.dur * 0.22), ease: EASE.fade });
  }

  if (ctx.op.arrow) {
    const aid = ctx.gensym('arrow');
    const y0 = above ? box.y - 6 : box.y + box.h + 6;
    const y1 = above ? at.y + 16 : at.y - 16;
    const d = `M 0 ${y1 - at.y} L 0 ${y0 - at.y}`;
    ctx.scene.create({
      id: aid, role: 'bracket', inFlow: false, w: 2, data: { d },
      base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(aid, at);
    ctx.anim({ id: aid, prop: 'strokeDashoffset', from: 100, to: 0, at: ctx.dur * 0.2, dur: ctx.dur * 0.6, ease: EASE.fade });
  }
}
