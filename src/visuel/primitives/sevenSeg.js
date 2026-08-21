/**
 * `sevenSeg` — la lettre passe à l'afficheur 7 segments.
 *
 * Recherche §4.10 : on ne morphe **pas** l'attribut `d` (non Baseline en CSS,
 * et il exigerait des chemins iso-structurés). L'afficheur est pré-dessiné —
 * 7 `<path>` fixes, identiques pour tous les caractères, pilotés uniquement par
 * `opacity`. Le « morphing » est un crossfade du tracé de référence vers
 * l'afficheur, puis un allumage en stagger.
 *
 * Le stagger suit les **traits continus fusionnés** (`b`+`c`, `e`+`f`), pas les
 * segments : c'est la méthode 5 du README, et le spectateur voit littéralement
 * pourquoi `H = 3 traits`.
 *
 * La lettre de référence est tracée depuis `src/moteur/tables/glyphes.js`
 * (CONTRACTS §2.4) : ce qui est dessiné est ce qui est compté.
 */

import { SEGMENTS, SEGMENT_ORDER, fusedStrokes, glyphToLocal } from '../assets.js';
import { glyphOf, endpointsOf } from '../glyphes.js';
import { badge } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'sevenSeg';

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const segments = ctx.op.segments;
  if (typeof segments !== 'string' || !segments || !/^[a-g]+$/.test(segments)) {
    fail(`${ctx.where}« segments » doit être une chaîne de segments allumés parmi a…g (ex. « bcefg » pour H). Reçu : ${JSON.stringify(segments)}.`);
  }
  const on = new Set([...segments]);
  const fusion = ctx.op.fusion !== false;
  const strokes = fusedStrokes(segments);
  const count = fusion ? strokes.length : on.size;
  if (ctx.op.count !== undefined && ctx.op.count !== count) {
    fail(`${ctx.where}« count » annonce ${ctx.op.count}, mais l’afficheur en montre ${count} (${fusion ? 'traits fusionnés' : 'segments'} : ${fusion ? strokes.join(', ') : [...on].join(', ')}). Le moteur visuel refuse d'afficher autre chose que ce qui est compté.`);
  }

  const pos = ctx.scene.pos(src.id);
  const anchor = { x: pos.x, y: pos.y - ctx.metrics.fontSize * 1.25 };
  const T = ctx.dur;

  // --- 1. tracé de référence de la lettre ----------------------------------
  const ch = ctx.op.glyph ?? ([...src.text].length === 1 ? src.text : null);
  const refIds = [];
  if (ch) {
    const table = ctx.glyphes || null;
    const glyph = glyphOf(ch, table || undefined);
    glyph.traits.forEach((tr, i) => {
      const id = `@ref:${src.id}:${i}`;
      ctx.scene.create({
        id, role: 'glyph', inFlow: false, w: 0, data: { d: tr.d },
        base: { opacity: 0, strokeDashoffset: 100, stroke: ctx.palette.fg2 },
      }, { where: ctx.where });
      ctx.scene.place(id, anchor);
      ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: T * 0.12 });
      ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: 0, dur: T * 0.28, ease: EASE.fade });
      ctx.anim({ id, prop: 'opacity', to: 0, at: T * 0.34, dur: T * 0.16 });
      refIds.push(id);
    });
  }
  ctx.anim({ id: src.id, prop: 'opacity', to: 0.35, at: 0, dur: T * 0.2 });

  // --- 2. l'afficheur apparaît, segments éteints en fantôme -----------------
  const segIds = {};
  void refIds;
  SEGMENT_ORDER.forEach((k) => {
    const id = `@seg:${src.id}:${k}`;
    const lit = on.has(k);
    ctx.scene.create({
      id, role: 'seg', inFlow: false, w: 0, data: { d: SEGMENTS[k].d, segment: k, lit },
      base: { opacity: 0, stroke: lit ? ctx.palette.phos : ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(id, anchor);
    ctx.anim({ id, prop: 'opacity', to: 0.15, at: T * 0.34, dur: T * 0.16 });
    segIds[k] = id;
  });

  // --- 3. allumage, un trait continu à la fois -----------------------------
  const groups = fusion
    ? strokes.map((s) => ({ key: s, members: SEGMENT_ORDER.filter((k) => on.has(k) && SEGMENTS[k].stroke === s) }))
    : [...on].map((k) => ({ key: k, members: [k] }));

  const lightStart = T * 0.52;
  const per = (T - lightStart) / Math.max(1, groups.length);
  groups.forEach((g, i) => {
    const a = lightStart + i * per;
    for (const k of g.members) {
      ctx.anim({ id: segIds[k], prop: 'opacity', to: 1, at: a, dur: Math.max(1, per * 0.8) });
    }
    const mid = midOfGroup(g.members, ctx.metrics.fontSize);
    badge(ctx, i + 1, { x: anchor.x + mid.x * 1.35, y: anchor.y + mid.y * 1.35 }, { at: a + per * 0.3, dur: Math.max(1, per * 0.5) });
  });

  if (typeof ctx.op.note === 'string' && ctx.op.note) {
    const nid = ctx.gensym('note');
    ctx.scene.create({
      id: nid, role: 'label', text: ctx.op.note, inFlow: false,
      w: ctx.metrics.advance * 0.55 * ctx.op.note.length,
      data: { scale: 0.5 },
      base: { opacity: 0, fill: ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(nid, { x: anchor.x, y: anchor.y - ctx.metrics.fontSize * 0.95 });
    ctx.anim({ id: nid, prop: 'opacity', to: 1, at: T * 0.5, dur: T * 0.3 });
  }
}

function midOfGroup(members, fontSize) {
  let sx = 0; let sy = 0; let n = 0;
  for (const k of members) {
    const { start, end } = endpointsOf(SEGMENTS[k].d);
    const a = glyphToLocal(start, fontSize);
    const b = glyphToLocal(end, fontSize);
    sx += (a.x + b.x) / 2; sy += (a.y + b.y) / 2; n++;
  }
  return { x: n ? sx / n : 0, y: n ? sy / n : 0 };
}
