/**
 * `shift` — LE TAMIS : ce qu'on garde descend, ce qu'on jette monte.
 *
 * ★ POURQUOI UN GESTE, LÀ OÙ IL N'Y AVAIT QU'UN EFFACEMENT.
 *
 * « On ne garde que les consonnes » se jouait en effaçant les voyelles une à
 * une, puis en resserrant. C'est le RÉSULTAT du tri, ce n'est pas le tri : à
 * aucun moment la ligne ne se sépare en deux, et il faut avoir lu le titre pour
 * savoir de quel côté on est. Pire, tous les filtres de retrait — voyelles,
 * consonnes, lettres, doublons — donnaient à l'écran exactement la même image :
 * des caractères qui disparaissent.
 *
 * Le tri, lui, a un instant propre : celui où l'on a déjà décidé et où rien
 * n'est encore perdu. Les gardés descendent d'une demi-casse, les rejetés
 * montent d'autant, EN MÊME TEMPS — c'est la simultanéité qui fait lire un
 * partage plutôt que deux mouvements. Le mot se lit alors sur deux lignes, et
 * l'on peut vérifier le tri avant qu'il ne soit consommé. Ensuite seulement les
 * rejetés s'effacent, et les gardés redescendent sur leur ligne.
 *
 * ★ `reset` ANNULE EXACTEMENT ce que `shift` a fait — pas « ramène à zéro ».
 *   Chaque jeton se souvient de son propre décalage, et le rendre est une
 *   soustraction, jamais une position absolue devinée : le moteur arithmétique
 *   n'envoie pas de coordonnées, et le moteur visuel ne doit pas s'en inventer
 *   (CONTRACTS §7.3). Un `move` remettrait tout à plat AUSSI, mais il
 *   refermerait les trous du même coup — or « replacer sur la ligne » et
 *   « combler les vides » sont deux temps de lecture distincts.
 */

import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'shift';

/** De combien on écarte, en fraction de la casse. Une demi-hauteur d'œil. */
const DEMI_CASSE = 0.5;

export function plan(ctx) {
  const amount = typeof ctx.op.amount === 'number' ? ctx.op.amount : DEMI_CASSE;
  const dy = ctx.metrics.fontSize * amount;
  const dur = Math.max(1, ctx.dur);

  const lire = (champ) => (ctx.op[champ] === undefined
    ? [] : ctx.scene.resolve(ctx.op[champ], `${ctx.where}« ${champ} » : `));
  const monte = lire('up');
  const descend = lire('down');
  const remis = lire('reset');
  if (!monte.length && !descend.length && !remis.length) {
    fail(`${ctx.where}« shift » attend « up », « down » ou « reset » — sinon il ne fait rien.`);
  }

  const bouger = (ids, sens) => {
    for (const id of ids) {
      const n = ctx.scene.get(id);
      const p = ctx.scene.pos(id);
      if (!n || !n.alive || !p) continue;
      // Le décalage s'ACCUMULE sur le nœud : c'est lui, et lui seul, qui sait
      // de combien il a été écarté quand viendra le moment de le rendre.
      n.decale = (n.decale || 0) + sens * dy;
      ctx.place(id, { x: p.x, y: p.y + sens * dy, w: p.w }, { at: 0, dur, ease: EASE.move });
    }
  };
  bouger(monte, -1);
  bouger(descend, +1);

  for (const id of remis) {
    const n = ctx.scene.get(id);
    const p = ctx.scene.pos(id);
    if (!n || !n.alive || !p || !n.decale) continue;
    ctx.place(id, { x: p.x, y: p.y - n.decale, w: p.w }, { at: 0, dur, ease: EASE.move });
    n.decale = 0;
  }
}
