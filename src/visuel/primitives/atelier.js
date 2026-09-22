/** Copies nées sur leurs sources, puis calculées dans un flux indépendant. */
import { tokenSpec, ancreVue } from './helpers.js';
import { tableGeometry } from '../assets.js';
import { EASE, CAMERA_ID } from '../constants.js';
import { placerCibleCesar } from './compteurCesar.js';
import { fail } from '../errors.js';

export const name = 'atelier';

// Même hauteur que le futur titre sous les deux alphabets de César.
export function hauteurTitreCesar(ctx) {
  const entries = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((char) => ({ char, value: char }));
  const geo = tableGeometry({ entries, disposition: 'glissiere' });
  return ancreVue(ctx).y + ctx.metrics.fontSize * 1.52 + geo.height;
}

/** Le calcul peut descendre sous une accolade ; garder aussi les originaux visibles. */
export function cadrageAtelier(ctx) {
  const fs = ctx.metrics.fontSize, opts = ctx.layoutOpts;
  const haut = opts.centerY - fs;
  const bas = hauteurTitreCesar(ctx) + 4 * fs;
  const scale = Math.min(1, (opts.viewBox.h - 2 * fs) / (bas - haut));
  return { scale, translate: { x: 0, y: scale * (opts.centerY - (haut + bas) / 2) } };
}

function cadrer(ctx, cadre) {
  for (const prop of ['scale', 'translate']) ctx.anim({ id: CAMERA_ID, prop, to: cadre[prop], at: 0, dur: ctx.dur * 0.2 });
}

export function plan(ctx) {
  const { scene, op } = ctx;
  if (op.action === 'ouvrir') {
    if (scene.atelierActif) fail(`${ctx.where}un atelier est déjà ouvert`);
    const sources = scene.resolve(op.targets, ctx.where);
    if (!Array.isArray(op.tokens) || op.tokens.length !== sources.length || !sources.length) {
      fail(`${ctx.where}une copie par source est attendue`);
    }
    const id = scene.gensym('atelier');
    scene.ateliers.set(id, { ...ctx.layoutOpts, centerX: ancreVue(ctx).x, centerY: hauteurTitreCesar(ctx) });
    scene.atelierActif = id;
    cadrer(ctx, cadrageAtelier(ctx));
    sources.forEach((source, i) => {
      const s = scene.live(source, ctx.where);
      const spec = tokenSpec(ctx, op.tokens[i], `tokens[${i}]`);
      if (spec.text !== s.text) fail(`${ctx.where}la copie doit reprendre le caractère de sa source`);
      const pos = scene.pos(source);
      scene.create({ ...spec, inFlow: true, base: { opacity: 0, translate: { x: pos.x, y: pos.y } } });
      scene.place(spec.id, pos);
      ctx.anim({ id: spec.id, prop: 'opacity', to: 1, at: 0, dur: ctx.dur * 0.2 });
    });
    ctx.reflow({ at: ctx.dur * 0.2, dur: ctx.dur * 0.8, ease: EASE.move });
    return;
  }
  if (op.action !== 'conclure' || !scene.atelierActif) fail(`${ctx.where}atelier absent ou action inconnue`);
  const actif = scene.atelierActif;
  const resultat = scene.live(op.target, ctx.where);
  if (resultat.data?.atelier !== actif) fail(`${ctx.where}le résultat doit provenir de l'atelier`);
  for (const id of [...scene.flow]) {
    if (scene.get(id).data?.atelier !== actif) continue;
    scene.flow.splice(scene.flow.indexOf(id), 1);
    scene.get(id).inFlow = false;
    if (id !== resultat.id) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: 0, dur: ctx.dur * 0.3 });
      scene.kill(id);
    }
  }
  scene.atelierActif = null;
  scene.ateliers.delete(actif);
  const cam = scene.get(CAMERA_ID);
  cadrer(ctx, { scale: cam.base.scale ?? 1, translate: cam.base.translate ?? { x: 0, y: 0 } });
  resultat.data = { ...resultat.data, cesarNom: op.nom || 'César' };
  placerCibleCesar(ctx, resultat.id, ancreVue(ctx).x, hauteurTitreCesar(ctx));
  ctx.reflow({ dur: ctx.dur * 0.5 });
}
