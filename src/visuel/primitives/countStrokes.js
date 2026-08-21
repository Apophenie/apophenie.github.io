/**
 * `countStrokes` — comptage de traits, d'extrémités ou de boucles.
 *
 * Recherche §4.11. La lettre est tracée en `<path>` (pas en `<text>` : il faut
 * les tracés), un sous-chemin par trait de crayon, redessiné en stagger par
 * `stroke-dashoffset`, avec un badge numéroté à chaque trait.
 *
 * La source est `src/moteur/tables/glyphes.js` (CONTRACTS §2.4) et le comptage
 * est **dérivé du même tracé** (`deriveGlyph`) : ce que le spectateur voit est
 * littéralement ce qui a été compté (CONTRACTS §0.3). Si le scénario annonce un
 * `count` différent de celui du tracé, c'est une erreur de compilation — le
 * moteur refuse de montrer un comptage qu'il ne dessine pas.
 *
 * `pathLength="100"` remplace `getTotalLength()` (coûteux, et indisponible hors
 * DOM) ; les extrémités viennent de l'analyse du `d`, pas de `getPointAtLength`.
 */

import { glyphOf, deriveGlyph } from '../glyphes.js';
import { glyphToLocal } from '../assets.js';
import { badge } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'countStrokes';

const MODES = { traits: 'traits', extremites: 'extremites', boucles: 'boucles' };

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const mode = ctx.op.mode || 'traits';
  if (!MODES[mode]) {
    fail(`${ctx.where}« mode » = « ${mode} » : les modes sont « traits », « extremites » et « boucles ».`);
  }
  const ch = ctx.op.glyph ?? ([...src.text].length === 1 ? src.text : null);
  if (!ch) {
    fail(`${ctx.where}« glyph » manquant : le token « ${src.id} » porte « ${src.text} », qui n'est pas un caractère unique.`);
  }

  const glyph = glyphOf(ch, ctx.glyphes || undefined);
  const derived = deriveGlyph(glyph);
  const count = derived[MODES[mode]];
  if (ctx.op.count !== undefined && ctx.op.count !== count) {
    fail(`${ctx.where}« count » annonce ${ctx.op.count} pour « ${ch} » en mode « ${mode} », mais le tracé de référence en donne ${count} `
      + `(traits=${derived.traits}, extrémités=${derived.extremites}, boucles=${derived.boucles}). `
      + `Les tables de comptage sont dérivées des tracés : ce qui est dessiné est ce qui est compté (CONTRACTS §0.3).`,
    { glyph: ch, mode, annonce: ctx.op.count, trace: count });
  }

  const pos = ctx.scene.pos(src.id);
  const anchor = { x: pos.x, y: pos.y - ctx.metrics.fontSize * 1.25 };
  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  ctx.anim({ id: src.id, prop: 'opacity', to: 0.35, at: 0, dur: T * 0.15 });

  // --- tracé de la lettre, trait par trait ---------------------------------
  const drawEnd = mode === 'traits' ? T : T * 0.45;
  const per = drawEnd / derived.sub.length;
  const traitIds = derived.sub.map((s, i) => {
    const id = `@trait:${src.id}:${i}`;
    ctx.scene.create({
      id, role: 'glyph', inFlow: false, w: 0, data: { d: s.d, trait: i },
      base: { opacity: 1, strokeDashoffset: 100, stroke: mode === 'traits' ? ctx.palette.gold : ctx.palette.fg2 },
    }, { where: ctx.where });
    ctx.scene.place(id, anchor);
    const a = mode === 'traits' ? i * per : 0;
    ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: a, dur: Math.max(1, mode === 'traits' ? per * 0.85 : drawEnd), ease: EASE.fade });
    return id;
  });

  if (mode === 'traits') {
    derived.sub.forEach((s, i) => {
      const mid = midpoint(s.points);
      const p = glyphToLocal(mid, fs);
      badge(ctx, i + 1, { x: anchor.x + p.x * 1.3, y: anchor.y + p.y * 1.3 }, { at: i * per + per * 0.6, dur: Math.max(1, per * 0.4), tone: 'gold' });
    });
    return;
  }

  if (mode === 'extremites') {
    const markStart = T * 0.5;
    const step = (T - markStart) / Math.max(1, derived.libres.length);
    derived.libres.forEach((pt, i) => {
      const p = glyphToLocal(pt, fs);
      const id = `@ext:${src.id}:${i}`;
      ctx.scene.create({
        id, role: 'marker', inFlow: false, w: 0, data: { r: 6 },
        base: { opacity: 1, scale: 0, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, { x: anchor.x + p.x, y: anchor.y + p.y });
      ctx.anim({ id, prop: 'scale', to: 1, at: markStart + i * step, dur: Math.max(1, step * 0.9), ease: EASE.pop });
      badge(ctx, i + 1, { x: anchor.x + p.x * 1.32, y: anchor.y + p.y * 1.32 - 14 }, { at: markStart + i * step + step * 0.4, dur: Math.max(1, step * 0.5), tone: 'gold' });
    });
    return;
  }

  // mode « boucles » : on éclaire le tracé et on annonce le compte.
  for (const id of traitIds) {
    ctx.anim({ id, prop: 'stroke', to: count > 0 ? ctx.palette.gold : ctx.palette.fg3, at: T * 0.5, dur: T * 0.3 });
  }
  badge(ctx, count, { x: anchor.x, y: anchor.y - fs * 0.85 }, { at: T * 0.6, dur: T * 0.35, tone: 'gold' });
}

function midpoint(points) {
  if (!points.length) return { x: 0, y: 0 };
  let total = 0;
  const segs = [];
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    segs.push(l); total += l;
  }
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= total / 2) {
      const t = segs[i] ? (total / 2 - acc) / segs[i] : 0;
      return {
        x: points[i].x + t * (points[i + 1].x - points[i].x),
        y: points[i].y + t * (points[i + 1].y - points[i].y),
      };
    }
    acc += segs[i];
  }
  return points[Math.floor(points.length / 2)];
}
