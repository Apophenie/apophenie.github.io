/**
 * `highlight` — mise en évidence / sélection.
 *
 * Recherche §4.1 : on anime le `fill` du texte, **jamais** le `font-weight`
 * (il provoque un reflow du texte et une largeur qui change, donc un layout
 * faux). L'attention arrive aussi par une brève dilatation, qui ne coûte rien
 * au layout puisque `scale` est un canal du moteur.
 *
 * ## ★ Plus de cartouche derrière les jetons
 *
 * Il y en avait un : un rectangle d'or à 22 % d'opacité, posé derrière chaque
 * jeton désigné. Deux raisons de l'avoir retiré, et l'auteur n'a eu à en
 * donner qu'une.
 *
 * 1. **Il est disgracieux.** Un aplat translucide sur du texte à chasse fixe
 *    fait un pavé, pas une mise en évidence ; la couleur et la dilatation
 *    disent la même chose sans salir la ligne.
 * 2. **Il survivait à ce qu'il désignait.** Un jeton consommé par `table` ou
 *    `keyboard` s'envolait vers sa case, mais son cartouche restait dans la
 *    ligne — un rectangle orphelin, ne désignant plus rien, jusqu'à la fin de
 *    la démonstration. (Le geste efface désormais aussi le halo du jeton qu'il
 *    consomme, `decor.js` : la même faute ne peut plus se reproduire avec un
 *    halo venu d'ailleurs.)
 *
 * La désignation ne repose pas pour autant sur la seule couleur : le jeton se
 * dilate, et `dim` estompe simultanément tout ce qui n'est pas désigné. La
 * scène est de toute façon `aria-hidden` et Le Registre en est l'équivalent
 * accessible obligatoire (CONTRACTS §6).
 */

import { targetsOf } from './helpers.js';
import { EASE, colorForKind } from '../constants.js';

export const name = 'highlight';

/**
 * ★ **LA DÉSIGNATION SE REND — elle ne teignait jamais rien en arrière.**
 *
 * > « La coloration pour désigner les chiffres à additionner est très bien,
 * >   mais elle ne doit pas rester une fois le calcul fait, sinon ça donne
 * >   l'impression que le résultat va resservir pour le calcul suivant. »
 * >   (l'auteur, sur `mrn`)
 *
 * Le geste animait `fill` vers l'or et s'arrêtait là. L'or restait donc jusqu'à
 * la fin de la démonstration, sur des jetons dont l'affaire était réglée depuis
 * dix étapes — et sur une ligne où l'or veut dire « regarde ceci », une
 * accumulation d'or ne veut plus rien dire du tout. Pire : elle dit quelque
 * chose de FAUX, à savoir que ces jetons-là servent encore.
 *
 * ★ **UNE DÉSIGNATION EST UN GESTE, PAS UN ÉTAT.** Elle a un début, une tenue
 *   et une fin, comme l'accolade qui se retire une fois son résultat rendu. On
 *   monte donc sur les quatre premiers dixièmes, on TIENT jusqu'aux sept
 *   dixièmes — c'est là que le spectateur lit —, puis on rend au jeton sa
 *   couleur propre, celle que `colorForKind` lui donnerait s'il naissait
 *   maintenant. La ligne est propre avant l'étape suivante.
 *
 * ★ `tenir: true` pour les rares cas où la désignation DOIT survivre à son
 *   étape — une sélection que l'étape suivante commente. C'est une option de
 *   plus sur une primitive existante, jamais une primitive de plus (§3.1) ; et
 *   c'est bien l'exception qui se déclare, pas la règle.
 */
const MONTEE = 0.4;
const RELACHE = 0.7;

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const mode = ctx.op.mode || 'select'; // 'select' (l'attention arrive) | 'reject'
  const tone = mode === 'reject' ? 'rubric' : 'gold';
  const tenir = ctx.op.tenir === true;

  ids.forEach((id, i) => {
    const at = i * ctx.stagger;
    const montee = tenir ? ctx.dur : Math.max(1, ctx.dur * MONTEE);
    ctx.anim({ id, prop: 'fill', to: ctx.palette[tone], at, dur: montee, ease: EASE.fade });
    if (mode === 'select') {
      ctx.anim({ id, prop: 'scale', values: [1, 1.08, 1.04], offsets: [0, 0.6, 1], at, dur: ctx.dur, ease: EASE.pop });
    }
    if (tenir) return;
    // ★ La couleur RENDUE est celle du `kind`, pas une constante : un chiffre,
    //   un séparateur et une annotation ne partagent pas la même encre, et
    //   c'est `colorForKind` qui en décide partout ailleurs (`scene.js`).
    const noeud = ctx.scene.get(id);
    if (!noeud || !noeud.alive) return;
    ctx.anim({
      id,
      prop: 'fill',
      to: colorForKind(noeud.kind, ctx.palette),
      at: at + ctx.dur * RELACHE,
      dur: Math.max(1, ctx.dur * (1 - RELACHE)),
      ease: EASE.fade,
    });
  });
}
