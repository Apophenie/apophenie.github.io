/**
 * `substitute` — un token en devient un ou plusieurs autres.
 *
 * Recherche §4.3 : compilée en trois gestes **simultanés** — (a) calcul du
 * layout d'arrivée, (b) FLIP des voisins, (c) crossfade. Sans (b), `h` → `15`
 * ferait sauter toute la ligne, puisque la largeur change.
 *
 * L'ancrage est le centre (`text-anchor: middle`) : le centre est stable, la
 * largeur ne l'est pas.
 *
 * Deux formes de `to` :
 *   • `to: {id,text}`        1 → 1  — la lettre devient son rang.
 *   • `to: [{…},{…}]`        1 → n  — éclatement (`44` → `4`, `4`) ou
 *                            résonance (le même 6 recopié trois fois).
 *     Les tokens d'arrivée naissent **sur** les glyphes du token de départ
 *     quand ils le reconstituent, sinon tous à sa place ; le layout les écarte
 *     ensuite. Le raccord est invisible.
 */

import { tokenSpec, espacementDe } from './helpers.js';
import { EASE } from '../constants.js';
import { charCenter } from '../layout.js';
import { fail } from '../errors.js';

export const name = 'substitute';

export function plan(ctx) {
  const pairs = ctx.op.pairs;
  if (!Array.isArray(pairs) || !pairs.length) {
    fail(`${ctx.where}« pairs » doit être une liste [{ target, to:{id,text,kind} }].`);
  }

  const jobs = pairs.map((p, i) => {
    const src = ctx.scene.live(sourceOf(ctx, p, i), `${ctx.where}pairs[${i}].target : `);
    const list = Array.isArray(p.to) ? p.to : [p.to];
    if (!list.length) fail(`${ctx.where}pairs[${i}].to : au moins un token d'arrivée est attendu.`);
    return { src, tos: list.map((t, k) => tokenSpec(ctx, t, `pairs[${i}].to${list.length > 1 ? `[${k}]` : ''}`)) };
  });

  // 1. mutation du modèle : les nouveaux tokens prennent la place de l'ancien.
  for (const j of jobs) {
    const idx = ctx.scene.flowIndex(j.src.id);
    const eclatement = j.tos.map((t) => t.text).join('') === j.src.text && j.tos.length > 1;
    let offset = 0;
    const espacement = espacementDe(ctx, j.src.id);
    j.tos.forEach((to, k) => {
      ctx.scene.create({
        id: to.id, text: to.text, kind: to.kind, group: to.group ?? j.src.group,
        role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1 + k,
        ...(k === 0 ? espacement : {}),
        base: { opacity: 0, scale: 1.15, fill: ctx.palette.phos },
      }, { where: ctx.where });
      if (j.tos.length > 1) {
        // Naissance pile sur les glyphes d'origine (éclatement) ou au même
        // point (résonance) : dans les deux cas, le reflow fait l'écartement.
        const p = ctx.scene.pos(j.src.id);
        const n = [...to.text].length;
        ctx.scene.place(to.id, eclatement
          ? { x: charCenter(p, offset + (n - 1) / 2, ctx.metrics).x, y: p.y }
          : { x: p.x, y: p.y });
        offset += n;
      }
    });
    ctx.scene.kill(j.src.id, ctx.where);
  }

  // 2. FLIP des voisins vers le layout d'arrivée.
  ctx.reflow({ at: 0, dur: ctx.dur, ease: EASE.move });

  // 3. crossfade, décalé token par token.
  let rang = 0;
  for (const j of jobs) {
    const at = rang * ctx.stagger;
    ctx.anim({ id: j.src.id, prop: 'opacity', to: 0, at, dur: ctx.dur * 0.55 });
    ctx.anim({ id: j.src.id, prop: 'scale', to: 0.85, at, dur: ctx.dur * 0.55 });
    const halo = `@halo:${j.src.id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: ctx.dur * 0.4 });
    j.tos.forEach((to, k) => {
      const a = at + (j.tos.length > 1 ? k * ctx.stagger : 0) + ctx.dur * 0.3;
      ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: a, dur: ctx.dur * 0.6 });
      ctx.anim({ id: to.id, prop: 'scale', to: 1, at: a, dur: ctx.dur * 0.6, ease: EASE.pop });
    });
    rang++;
  }
}

/** Accepte `target: 'id'` ou `targets: ['id']` (une seule source par paire). */
function sourceOf(ctx, pair, i) {
  if (typeof pair.target === 'string') return pair.target;
  if (Array.isArray(pair.targets)) {
    if (pair.targets.length !== 1) {
      fail(`${ctx.where}pairs[${i}].targets contient ${pair.targets.length} sources : une substitution part d’un seul token. Émettez une paire par source.`);
    }
    return pair.targets[0];
  }
  fail(`${ctx.where}pairs[${i}] : « target » manquant.`);
  return null;
}
