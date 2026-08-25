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
import { EASE } from '../constants.js';

export const name = 'highlight';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const mode = ctx.op.mode || 'select'; // 'select' (l'attention arrive) | 'reject'
  const tone = mode === 'reject' ? 'rubric' : 'gold';

  ids.forEach((id, i) => {
    const at = i * ctx.stagger;
    ctx.anim({ id, prop: 'fill', to: ctx.palette[tone], at, dur: ctx.dur, ease: EASE.fade });
    if (mode === 'select') {
      ctx.anim({ id, prop: 'scale', values: [1, 1.08, 1.04], offsets: [0, 0.6, 1], at, dur: ctx.dur, ease: EASE.pop });
    }
  });
}
