/**
 * `countStrokes` — comptage de traits, d'extrémités ou de boucles fermées.
 *
 * Même grammaire que `sevenSeg` (voir `encart.js`), et pour la même raison :
 * ces trois comptages sont trois façons de regarder **un** tracé, et ce qui les
 * rend lisibles est de les montrer un objet à la fois, dans un encart, avec un
 * compteur qui monte.
 *
 *  · **traits** — le glyphe se dessine, un trait de crayon à la fois ;
 *  · **extrémités** — le glyphe est d'abord tracé en entier, puis chaque
 *    pointe libre s'allume, une par une ;
 *  · **boucles** — le glyphe est tracé en entier, puis chaque boucle fermée
 *    s'éclaire, une par une.
 *
 * ## Contrôle croisé — CONTRACTS §0.3
 *
 * La source est `src/moteur/tables/glyphes.js` et le comptage est **redérivé du
 * même tracé** (`deriveGlyph`) : ce que le spectateur voit est littéralement ce
 * qui a été compté. Si le scénario annonce un `count` différent de celui du
 * tracé, c'est une erreur de compilation — le moteur refuse de montrer un
 * comptage qu'il ne dessine pas. Les boucles vont plus loin : ce n'est pas
 * seulement leur nombre qui est redérivé, mais **quels traits les composent**
 * (`boucleGroupes`), sans quoi on ne saurait pas laquelle éclairer.
 *
 * `pathLength="100"` remplace `getTotalLength()` (coûteux, et indisponible hors
 * DOM) ; les extrémités viennent de l'analyse du `d`, pas de `getPointAtLength`.
 */

import { glyphOf, deriveGlyph } from '../glyphes.js';
import { glyphToLocal } from '../assets.js';
import { tokenSpec } from './helpers.js';
import { ouvrirEncart, poserCompteur, refermerEncart, ENCART } from './encart.js';
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
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');
  if (to !== null && String(to.text) !== String(count)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais le compteur s'arrête à ${count}. `
      + 'Le nombre qui remplace la lettre est celui du compteur, pas un autre.');
  }

  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  const zoom = ENCART.zoomGlyphe;
  const local = (p) => ({ x: glyphToLocal(p, fs * zoom).x, y: glyphToLocal(p, fs * zoom).y });

  // --- 1. l'encart s'ouvre, la lettre y monte ------------------------------
  const encart = ouvrirEncart(ctx, src, {
    at: 0, dur: T * 0.12, title: typeof ctx.op.note === 'string' ? ctx.op.note : null,
  });

  // --- 2. changement de police : la lettre devient son propre tracé --------
  const apparition = T * 0.2;
  const dessin = mode === 'traits' ? 0 : T * 0.14;
  const traitIds = derived.sub.map((s, i) => {
    const id = `@trait:${src.id}:${i}`;
    ctx.scene.create({
      id, role: 'glyph', inFlow: false, w: 0,
      data: { d: s.d, trait: i, scale: zoom },
      base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.fg2 },
    }, { where: ctx.where });
    ctx.scene.place(id, encart.centre);
    return id;
  });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0.06, at: apparition, dur: T * 0.1, ease: EASE.fade });

  const debut = T * 0.36;
  const fin = T * 0.82;
  const cadence = (fin - debut) / Math.max(1, count);
  const compteur = `@compteur:${src.id}`;

  if (mode === 'traits') {
    // Le glyphe s'écrit sous nos yeux : un trait, un cran de compteur.
    poserCompteur(ctx, { id: compteur, centre: encart.centre, cote: encart.cote, total: count, debut, cadence });
    traitIds.forEach((id, i) => {
      const a = debut + i * cadence;
      ctx.anim({ id, prop: 'stroke', to: ctx.palette.gold, at: a, dur: 1 });
      ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: a, dur: Math.max(1, cadence * 0.8), ease: EASE.fade });
    });
  } else {
    // Le glyphe est d'abord écrit en entier, en retrait : c'est le support.
    for (const id of traitIds) {
      ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: apparition, dur: Math.max(1, dessin), ease: EASE.fade });
    }
    poserCompteur(ctx, { id: compteur, centre: encart.centre, cote: encart.cote, total: count, debut, cadence });
  }

  const montres = [...traitIds];

  if (mode === 'extremites') {
    // Chaque pointe libre s'allume, une par une.
    derived.libres.forEach((pt, i) => {
      const p = local(pt);
      const id = `@ext:${src.id}:${i}`;
      ctx.scene.create({
        id, role: 'marker', inFlow: false, w: 0, data: { r: 8 },
        base: { opacity: 1, scale: 0, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, { x: encart.centre.x + p.x, y: encart.centre.y + p.y });
      ctx.anim({ id, prop: 'scale', values: [0, 1.5, 1], offsets: [0, 0.55, 1], at: debut + i * cadence, dur: Math.max(1, cadence * 0.85), ease: EASE.pop });
      montres.push(id);
    });
  }

  if (mode === 'boucles') {
    // Chaque boucle s'éclaire, une par une — et ce sont bien les traits qui la
    // composent qui changent de couleur, pas un badge posé à côté.
    derived.boucleGroupes.forEach((membres, i) => {
      const a = debut + i * cadence;
      for (const k of membres) {
        ctx.anim({ id: traitIds[k], prop: 'stroke', to: ctx.palette.gold, at: a, dur: Math.max(1, cadence * 0.7) });
      }
      const halo = `@boucle:${src.id}:${i}`;
      const pts = membres.flatMap((k) => derived.sub[k].points);
      const c = centre(pts);
      const p = local(c);
      ctx.scene.create({
        id: halo, role: 'marker', inFlow: false, w: 0, data: { r: 10 },
        base: { opacity: 0.5, scale: 0, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(halo, { x: encart.centre.x + p.x, y: encart.centre.y + p.y });
      ctx.anim({ id: halo, prop: 'scale', values: [0, 1.3, 1], offsets: [0, 0.55, 1], at: a, dur: Math.max(1, cadence * 0.85), ease: EASE.pop });
      montres.push(halo);
    });
  }

  // --- 5. le nombre du compteur remplace la lettre -------------------------
  refermerEncart(ctx, { src, to, compteur, encart, montres, at: T * 0.86, dur: T * 0.14 });
}

/** Barycentre d'un nuage de points, en unités glyphe. */
function centre(points) {
  if (!points.length) return { x: 200, y: 300 };
  let sx = 0; let sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  return { x: sx / points.length, y: sy / points.length };
}
