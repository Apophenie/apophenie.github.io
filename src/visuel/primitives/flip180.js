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

import { tokenSpec, espacementDe } from './helpers.js';
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
