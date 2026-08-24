/**
 * `reveal` — le verdict.
 *
 * C'est la chute de toute la démonstration : elle doit se voir. Trois gestes,
 * dans cet ordre, et l'ordre est le propos.
 *
 * ## 1. La scène se vide
 *
 * Tout ce qui traînait encore — les `-`, le `.fr`, ce qui n'a pas été retenu et
 * qu'un `dim` avait laissé en veilleuse — **s'efface**. Un filigrane n'est pas
 * neutre : il continue de compter dans la ligne, il pousse les chiffres du
 * verdict hors du centre, et il donne à lire un résultat qui traîne des restes.
 * Ce qui n'est pas le verdict quitte donc la scène avant que le verdict ne se
 * forme. Les jetons ne sont **pas** retirés du DOM (CONTRACTS §3.2 règle 7) :
 * ils sortent du flux de layout, et un `seek()` en arrière les ramène.
 *
 * ## 2. Les chiffres se regroupent, au centre
 *
 * Une fois seuls dans le flux, ils sont centrés **par le layout**, pas par un
 * placement à la main : leur largeur et leur espacement sont mis à l'échelle,
 * et `reflow` fait le reste. Le geste reste donc idempotent — un `reflow`
 * ultérieur ne les déplacerait pas d'un iota.
 *
 * ## 3. Ils grandissent jusqu'à prendre la scène
 *
 * L'agrandissement est **calculé**, jamais deviné : la hauteur de capitale et
 * la largeur totale sont ramenées à une fraction de la scène, en gardant de
 * l'air autour. Le facteur est le plus contraignant des deux.
 *
 * ## Ce qui a été retiré, et pourquoi
 *
 * Le halo doré derrière chaque chiffre. Un halo dit « regarde ici » ; à
 * l'instant où les chiffres occupent l'essentiel de la scène, il n'y a plus
 * rien d'autre à regarder, et le cartouche ne se lit plus que comme un fond
 * posé sous un chiffre. La palette dit déjà tout ce qu'il y a à dire : les
 * chiffres passent en **rubrique**, la couleur de l'affirmation (design §2.3).
 * `halo: true` le rétablit pour qui en voudrait.
 */

import { targetsOf, ensureHalo } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'reveal';

/** Part de la hauteur de scène occupée par la hauteur de capitale du verdict. */
const AIR_VERTICAL = 0.62;

/** Part de la largeur utile occupée par le verdict. */
const AIR_HORIZONTAL = 0.92;

/** Garde-fou : au-delà, un glyphe unique deviendrait grotesque. */
const ZOOM_MAX = 14;

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const stagger = ctx.stagger || (ctx.reduced ? 0 : ctx.dur * 0.18);
  const withHalo = ctx.op.halo === true;
  const efface = ctx.op.clear !== false;
  const grow = typeof ctx.op.scale === 'number' ? ctx.op.scale : zoomDuVerdict(ctx, ids);

  // --- 1. ce qui n'est pas le verdict quitte la scène -----------------------
  const restes = efface ? ctx.scene.flow.filter((id) => !ids.includes(id)) : [];
  const fonduRestes = Math.max(1, ctx.dur * 0.3);
  const cadenceRestes = restes.length > 1 ? (ctx.dur * 0.22) / (restes.length - 1) : 0;
  restes.forEach((id, i) => {
    const at = i * cadenceRestes;
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur: fonduRestes, ease: EASE.fade });
    ctx.anim({ id, prop: 'scale', to: 0.8, at, dur: fonduRestes, ease: EASE.fade });
    const halo = `@halo:${id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: fonduRestes * 0.7 });
    ctx.scene.kill(id, ctx.where);
  });

  // --- 2. le regroupement : quand le canal est libre, et pas avant ----------
  //
  // ★ Un `move` peut précéder `reveal` dans le même step (le scénario du
  // verdict en émet un). Deux animations concurrentes sur `translate`
  // s'écraseraient l'une l'autre et se contrediraient à l'écran : on attend
  // donc que la précédente ait fini (`ctx.libreA`). L'effacement, lui, a
  // commencé tout de suite — on efface AVANT de grouper.
  let depart = ctx.dur * 0.34;
  for (const id of ids) depart = Math.max(depart, ctx.libreA(id, 'translate'));
  depart = Math.min(depart, ctx.dur * 0.75);
  const reste = Math.max(1, ctx.dur - depart);

  // La mise à l'échelle passe par le LAYOUT : largeur et espacement grandissent
  // avec les glyphes, et le centrage reste celui du moteur de layout.
  const gap = ctx.layoutOpts.gap;
  ids.forEach((id, i) => {
    const n = ctx.scene.get(id);
    n.w = mesureNominale(ctx, id) * grow;
    if (i > 0) n.gapBefore = gap * grow;
  });
  const premier = ctx.scene.get(ids[0]);
  if (ctx.scene.flowIndex(ids[0]) === 0) premier.gapBefore = 0;
  ctx.reflow({ at: depart, dur: reste, ease: EASE.move });

  // La hauteur réelle du verdict, pour que ce qui se pose « en dessous » (une
  // annotation) se pose bien en dessous et non au milieu des chiffres.
  const hauteur = ctx.metrics.fontSize * grow;
  for (const id of ids) {
    const p = ctx.scene.pos(id);
    if (p) p.h = hauteur;
  }

  // --- 3. ils paraissent, rougissent, et grandissent ------------------------
  ids.forEach((id, i) => {
    const at = i * stagger;
    ctx.anim({ id, prop: 'opacity', to: 1, at, dur: Math.max(1, ctx.dur * 0.3) });
    ctx.anim({ id, prop: 'fill', to: ctx.palette.rubric, at, dur: Math.max(1, ctx.dur * 0.45) });
    ctx.anim({ id, prop: 'scale', to: grow, at: depart, dur: reste, ease: EASE.pop });
    if (withHalo) {
      const halo = ensureHalo(ctx, id, 'gold');
      ctx.anim({ id: halo, prop: 'scale', to: grow, at: depart, dur: reste, ease: EASE.pop });
      ctx.anim({ id: halo, prop: 'opacity', to: 0.24, at, dur: Math.max(1, ctx.dur * 0.45) });
    }
  });
}

/**
 * Le facteur d'agrandissement : « qu'ils prennent l'essentiel de l'espace
 * d'affichage animé, tout en laissant un peu d'air autour ».
 *
 * Deux contraintes, la plus serrée gagne : la hauteur de capitale ne dépasse
 * pas `AIR_VERTICAL` de la scène, la largeur totale pas `AIR_HORIZONTAL` de la
 * zone utile. Sur trois chiffres dans une scène de 1200 × 480, cela donne un
 * verdict d'environ 835 × 300 unités — l'essentiel du cadre, et de l'air.
 */
function zoomDuVerdict(ctx, ids) {
  const fs = ctx.metrics.fontSize;
  const capitale = ctx.metrics.capHeight || fs * 0.73;
  const gap = ctx.layoutOpts.gap;
  const largeur = ids.reduce((s, id) => s + mesureNominale(ctx, id), 0) + (ids.length - 1) * gap;
  const parLaHauteur = (ctx.layoutOpts.viewBox.h * AIR_VERTICAL) / Math.max(1, capitale);
  const parLaLargeur = (ctx.layoutOpts.maxWidth * AIR_HORIZONTAL) / Math.max(1, largeur);
  const z = Math.min(parLaHauteur, parLaLargeur, ZOOM_MAX);
  return Math.max(1, Math.round(z * 1000) / 1000);
}

/**
 * La largeur d'un jeton **avant** tout agrandissement.
 *
 * `reveal` peut être rejoué par une recompilation (`rebuild()` au
 * redimensionnement) : partir de `node.w` sans précaution reviendrait à
 * multiplier deux fois. On la redérive donc du texte et de la chasse.
 */
function mesureNominale(ctx, id) {
  const n = ctx.scene.get(id);
  const chars = typeof n.text === 'string' ? [...n.text].length : 0;
  return Math.max(chars, 1) * ctx.metrics.advance;
}
