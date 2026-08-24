/**
 * `sevenSeg` — la lettre passe à l'afficheur **sept** segments, et on compte.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * L'ancien rendu empilait, **au-dessus de chaque lettre de la ligne**, un tracé
 * de référence fantôme, un afficheur, et des badges numérotés semés autour :
 * quatre lettres côte à côte donnaient quatre petits chantiers simultanés,
 * illisibles. On tient désormais la grammaire commune de `encart.js`, dont le
 * déroulé complet vit dans `afficheur.js` — partagé avec `fourteenSeg`.
 *
 * Le stagger suit les **traits continus fusionnés** (`b`+`c`, `e`+`f`) quand
 * `fusion` est demandé, les segments individuels sinon. C'est la méthode 5 du
 * README, et le spectateur voit littéralement pourquoi `H = 3 traits`.
 */

import { SEGMENTS, SEGMENT_ORDER, fusedStrokes } from '../assets.js';
import { planAfficheur } from './afficheur.js';
import { fail } from '../errors.js';

export const name = 'sevenSeg';

/** `segments` est ici une CHAÎNE de segments allumés : « bcefg » pour H. */
function lire(ctx) {
  const segments = ctx.op.segments;
  if (typeof segments !== 'string' || !segments || !/^[a-g]+$/.test(segments)) {
    fail(`${ctx.where}« segments » doit être une chaîne de segments allumés parmi a…g (ex. « bcefg » pour H). Reçu : ${JSON.stringify(segments)}.`);
  }
  return [...segments];
}

export function plan(ctx) {
  planAfficheur(ctx, {
    nom: 'sevenSeg',
    SEGMENTS,
    ORDER: SEGMENT_ORDER,
    fusedStrokes: (allumes) => fusedStrokes(allumes.join('')),
    lire,
  });
}
