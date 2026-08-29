/**
 * `merge` — n jetons voisins se COLLENT et ne font plus qu'un.
 *
 * ★ POURQUOI CE N'EST PAS UN RAMASSAGE SOUS ACCOLADE.
 *
 * Coller `5 11 2` pour lire `5112` est mathématiquement une opération — la
 * concaténation change la valeur du tout au tout —, mais visuellement ce n'est
 * presque rien : les mêmes chiffres, dans le même ordre, à la même place. Les
 * faire descendre sous une accolade, les effacer, puis faire remonter un
 * nombre qui s'écrit exactement comme eux, c'est monter un décor pour cacher
 * qu'il ne se passe rien, et le spectateur cherche ce qu'il a raté. « Pas
 * besoin d'accolade ou de le nommer, ça devrait avoir lieu rapidement et
 * discrètement » (l'auteur).
 *
 * Le geste, alors, tient en une phrase : **les espaces se résorbent**. Ce qui
 * était séparé se touche, et une fois que ça se touche, c'est un nombre. Le
 * raccord est invisible PAR CONSTRUCTION — le texte d'arrivée est la
 * concaténation exacte des textes de départ, posé exactement là où ils
 * finissent —, et le moteur le vérifie plutôt que de le supposer.
 *
 * ★ Un fondu croisé serait un mensonge de plus : il ferait clignoter des
 *   glyphes qui ne changent pas. Le jeton d'arrivée paraît donc à pleine
 *   opacité au moment précis où les sources disparaissent, à la même place et
 *   avec la même chasse. Rien ne bouge parce que rien n'a changé.
 */

import { tokenSpec, targetsOf, espacementDe, exigerPoint } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'merge';

/** Ce qui sépare deux chiffres d'un même nombre : rien. */
const COLLE = 0;

export function plan(ctx) {
  const sources = targetsOf(ctx);
  if (sources.length < 2) {
    fail(`${ctx.where}« merge » colle au moins deux jetons ; reçu ${sources.length}.`);
  }
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';

  const noeuds = sources.map((id) => ctx.scene.live(id, ctx.where));
  const colle = noeuds.map((n) => n.text).join('');
  if (colle !== to.text) {
    fail(`${ctx.where}incohérence : les jetons collés donnent « ${colle} », `
      + `mais « to.text » annonce « ${to.text} ». Le moteur visuel refuse d'afficher un collage faux.`);
  }

  // Les sources doivent être CONSÉCUTIVES dans le flux : coller deux jetons
  // séparés par un troisième ne se montre pas, ça se décrète.
  const rangs = sources.map((id) => ctx.scene.flowIndex(id));
  if (rangs.some((i) => i < 0)) fail(`${ctx.where}tous les jetons collés doivent être dans le flux.`);
  const ordonnes = [...rangs].sort((a, b) => a - b);
  for (let i = 1; i < ordonnes.length; i++) {
    if (ordonnes[i] !== ordonnes[i - 1] + 1) {
      fail(`${ctx.where}« merge » ne colle que des jetons voisins : `
        + `il y a un jeton étranger entre les rangs ${ordonnes[i - 1]} et ${ordonnes[i]}.`);
    }
  }

  // 1. les espaces se résorbent — le seul mouvement de tout le geste.
  const tete = ctx.scene.flowIndex(sources[0]);
  const espacement = espacementDe(ctx, sources[0]);
  for (const id of sources.slice(1)) ctx.scene.get(id).gapBefore = COLLE;
  const serrage = Math.max(1, ctx.dur * 0.72);
  ctx.reflow({ at: 0, dur: serrage, ease: EASE.move });

  // 2. le jeton d'arrivée, posé sur la suite collée. Il naît DÉJÀ VISIBLE : à
  //    cet instant il porte les mêmes glyphes, aux mêmes abscisses, et personne
  //    ne doit pouvoir dire quand la substitution a eu lieu.
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group ?? noeuds[0].group,
    role: 'text', inFlow: true, insertAt: tete, ...espacement,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  const centre = milieuDe(ctx, sources);
  ctx.scene.place(to.id, exigerPoint(ctx, centre, `le nombre collé « ${to.text} »`, to.id));

  const bascule = serrage;
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: bascule, dur: 1 });
  for (const id of sources) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: bascule, dur: 1 });
    ctx.scene.kill(id, ctx.where);
  }

  // 3. la ligne se repose autour du jeton unique — l'écart normal revient
  //    entre lui et ses voisins, celui d'un nombre parmi d'autres.
  ctx.reflow({ at: bascule, dur: Math.max(1, ctx.dur - bascule), ease: EASE.move });
}

/** Le centre géométrique de la suite collée, une fois les espaces résorbés. */
function milieuDe(ctx, ids) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y = 0;
  for (const id of ids) {
    const p = ctx.scene.pos(id);
    const n = ctx.scene.get(id);
    if (!p || !n) continue;
    x0 = Math.min(x0, p.x - n.w / 2);
    x1 = Math.max(x1, p.x + n.w / 2);
    y = p.y;
  }
  return { x: (x0 + x1) / 2, y };
}
