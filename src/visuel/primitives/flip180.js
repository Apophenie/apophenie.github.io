/**
 * `flip180` — retourner un 9 en 6.
 *
 * Recherche §4.9. La rotation seule ne suffit pas : dans beaucoup de polices, un
 * `9` pivoté ne donne pas un `6` convaincant. On retient donc l'option robuste :
 * **rotation de 180° ET crossfade vers un vrai `6` au voisinage de 90°**, là où
 * l'œil ne peut pas trancher. L'escamotage est parfaitement dans l'esprit du
 * projet.
 *
 * Le token d'arrivée démarre à `rotate: 180deg` (donc visuellement à l'envers,
 * mais invisible) et finit à `360deg` : les deux tournent ensemble, seul
 * l'opacité les distingue. Le demi-tour se fait autour de l'**ancre de mise en
 * page** du jeton — l'origine de son repère local, celle que `layout.js`
 * positionne et autour de laquelle le glyphe est dessiné (CONTRACTS §3.2
 * règle 4). Sans cette origine explicite, la rotation se ferait autour du
 * centre du canevas entier.
 */

import { tokenSpec, espacementDe, targetsOf } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'flip180';

/**
 * ★ Le seul demi-tour que la typographie autorise (CONTRACTS §0.3 : « ce qui
 * est montré est ce qui est compté »).
 *
 * `9 → 6`, et rien d'autre. Le crossfade de la ligne 90° est un escamotage
 * assumé ; il le resterait tout autant si l'on faisait naître un 8 d'un 3, à
 * ceci près que la scène affirmerait alors quelque chose de faux sous couvert
 * de le montrer. La primitive refuse donc, bruyamment, plutôt que d'animer une
 * rotation qui ne prouve rien — comme `table` refuse de faire redescendre une
 * valeur absente de sa case et `keyboard` un chiffre que la touche ne porte pas.
 *
 * Le 6 ne se retourne pas : ce serait, disons, contre-productif.
 */
const DEMI_TOUR = Object.freeze({ 9: '6' });

export function plan(ctx) {
  if (ctx.op.targets !== undefined) return planBloc(ctx);
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const spin = ctx.dur;

  ctx.anim({ id: src.id, prop: 'rotate', to: 180, at: 0, dur: spin, ease: EASE.move });

  if (ctx.op.to === undefined) return; // rotation pure, sans substitution

  const to = tokenSpec(ctx, ctx.op.to, 'to');
  const attendu = DEMI_TOUR[String(src.text)];
  if (attendu === undefined) {
    fail(`${ctx.where}« target » porte « ${src.text} » : seul un 9 se retourne en 6. `
      + 'Un demi-tour sur autre chose ne montrerait rien, il l’affirmerait.', { id: src.id });
  }
  if (String(to.text) !== attendu) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais « ${src.text} » retourné donne `
      + `${attendu}. La valeur d’arrivée doit venir du calcul, jamais d’une seconde copie.`,
    { id: src.id });
  }
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'digit', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, rotate: 180, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.kill(src.id, ctx.where);
  ctx.reflow({ at: 0, dur: spin, ease: EASE.move });

  // Crossfade centré sur le passage à 90°, là où le glyphe est illisible.
  ctx.anim({ id: src.id, prop: 'opacity', values: [1, 1, 0, 0], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  ctx.anim({ id: to.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  ctx.anim({ id: to.id, prop: 'rotate', from: 180, to: 360, at: 0, dur: spin, ease: EASE.move });
}


/**
 * ★ **LE TRIO SE RETOURNE D'UN BLOC, comme un seul glyphe.**
 *
 * « `mr39` devrait non pas retourner chaque 9 sur lui-même, mais retourner d'un
 * bloc le triptyque 999 comme si c'était un seul glyphe à retourner »
 * (l'auteur). C'est une autre affirmation que trois demi-tours à la file : trois
 * demi-tours disent « chacun de ces 9 vaut un 6 », un seul dit « ce 999-là,
 * retourné, EST un 666 ». Le second est ce que l'opérateur prétend montrer.
 *
 * ★ Un demi-tour d'un bloc n'est pas un demi-tour de chacun : la rotation se
 *   fait autour du centre du BLOC, donc le jeton de gauche finit à droite et
 *   réciproquement. C'est ce déplacement qui fait lire le geste comme une seule
 *   pièce qu'on retourne, et non comme trois pièces qui tournent en même temps.
 *
 * ★ **`targets` et `to` sont donnés dans l'ORDRE DE LA LIGNE**, avant et après.
 *   Le miroir est appliqué ICI, pas par l'émetteur : le jeton de la place `k`
 *   devient celui de la place `n-1-k`. C'est ce qui permet au modèle de ligne
 *   (`recherche/scenario.js › suivreLaLigne`) de remplacer bêtement place pour
 *   place, sans rien savoir de la rotation — et donc de ne pas pouvoir en
 *   diverger.
 *
 * ⚠️ UN SEUL `reflow`, comme pour le demi-tour simple : trois `flip180`
 *   simultanés en demanderaient trois, et deux reflow concurrents animeraient
 *   deux fois `translate` sur les mêmes jetons. C'est la raison pour laquelle
 *   les demi-tours s'enchaînaient au lieu de se jouer ensemble ; le bloc lève
 *   la contrainte au lieu de la contourner.
 */
function planBloc(ctx) {
  const spin = ctx.dur;
  const noms = targetsOf(ctx);
  if (noms.length < 2) {
    fail(`${ctx.where}« targets » : un bloc se retourne à plusieurs — un jeton seul prend « target ».`);
  }
  const srcs = noms.map((id) => ctx.scene.live(id, `${ctx.where}« targets » : `));
  const tos = Array.isArray(ctx.op.to) ? ctx.op.to : null;
  if (!tos || tos.length !== srcs.length) {
    fail(`${ctx.where}« to » doit porter autant de jetons que « targets » (${srcs.length}) : `
      + 'un bloc retourné rend exactement ce qu’il a reçu, à sa valeur près.');
  }

  for (const src of srcs) {
    const attendu = DEMI_TOUR[String(src.text)];
    if (attendu === undefined) {
      fail(`${ctx.where}« targets » porte « ${src.text} » : seul un 9 se retourne en 6. `
        + 'Un demi-tour sur autre chose ne montrerait rien, il l’affirmerait.', { id: src.id });
    }
  }
  const specs = tos.map((t, k) => tokenSpec(ctx, t, `to[${k}]`));
  for (const spec of specs) {
    if (String(spec.text) !== '6') {
      fail(`${ctx.where}« to » annonce « ${spec.text} » : un 9 retourné donne 6, et rien d’autre.`);
    }
  }

  // Les places d'AVANT, relevées avant tout mouvement — `pos` rend la position
  // courante, et le premier `place` la remplacerait.
  const places = srcs.map((s) => ctx.scene.pos(s.id));
  const n = srcs.length;
  const idx = ctx.scene.flowIndex(srcs[0].id);

  srcs.forEach((src, k) => {
    const arrivee = places[n - 1 - k];
    ctx.anim({ id: src.id, prop: 'rotate', to: 180, at: 0, dur: spin, ease: EASE.move });
    if (arrivee && places[k] && Math.abs(arrivee.x - places[k].x) > 0.5) {
      ctx.place(src.id, { x: arrivee.x, y: arrivee.y, w: places[k].w },
        { at: 0, dur: spin, ease: EASE.move });
    }
    ctx.anim({ id: src.id, prop: 'opacity', values: [1, 1, 0, 0], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  });

  // Le jeton qui naît à la place `k` vient de celui qui s'y rend, c'est-à-dire
  // de l'ancien `n-1-k`. Il naît donc À SA PLACE D'ARRIVÉE, déjà retourné.
  specs.forEach((spec, k) => {
    const source = srcs[n - 1 - k];
    ctx.scene.create({
      id: spec.id, text: spec.text, kind: spec.kind || 'digit', group: spec.group ?? source.group,
      role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + k,
      ...espacementDe(ctx, source.id),
      base: { opacity: 0, rotate: 180, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.anim({ id: spec.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
    ctx.anim({ id: spec.id, prop: 'rotate', from: 180, to: 360, at: 0, dur: spin, ease: EASE.move });
  });

  for (const src of srcs) ctx.scene.kill(src.id, ctx.where);
  ctx.reflow({ at: 0, dur: spin, ease: EASE.move });
}
