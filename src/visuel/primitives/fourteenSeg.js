/**
 * `fourteenSeg` — la lettre passe à l'afficheur **quatorze** segments, et on
 * compte. Même geste que `sevenSeg` (corps commun dans `afficheur.js`), autre
 * afficheur.
 *
 * ## Pourquoi une op de plus, et pas un paramètre de `sevenSeg`
 *
 * Le vocabulaire des ops est FERMÉ (CONTRACTS §3.1) et il nomme des gestes.
 * Appeler `sevenSeg` un afficheur qui allume quatorze segments aurait fait
 * mentir le vocabulaire à l'endroit exact où le projet exige qu'il dise vrai :
 * le nom de l'op est ce qu'un lecteur du scénario voit en premier. Le contrat
 * prévoit l'extension — « ajouter une transformation arithmétique sans rendu ⇒
 * ajouter d'abord la primitive » — c'est le chemin pris, comme `partition` et
 * `alphabet` avant lui.
 *
 * ## Ce que le quatorze segments change, à l'écran
 *
 * Le sept segments ne peut pas dessiner un `H` capital, ni un `K`, ni un `X` :
 * il emprunte, ou il descend en bas de casse (`SEG7_BAS_DE_CASSE`,
 * `SEG7_APPROXIMATIONS`). Le quatorze segments écrit les 26 lettres en
 * capitales. Et la table `SEG14` étant **dérivée de DSEG14 Classic**, la
 * police du Registre et les segments qu'allume la scène sont, pour une fois,
 * exactement le même dessin.
 *
 * `segments` voyage ici en **tableau** (`['b','c','e','f','g1','g2']`) et non en
 * chaîne : deux des quatorze noms font deux caractères (`g1`, `g2`).
 */

import { SEGMENTS14, SEGMENT14_ORDER, fusedStrokes14, SEG14_STROKE } from '../assets.js';
import { planAfficheur } from './afficheur.js';
import { fail } from '../errors.js';

export const name = 'fourteenSeg';

function lire(ctx) {
  const segments = ctx.op.segments;
  const connus = new Set(SEGMENT14_ORDER);
  if (!Array.isArray(segments) || !segments.length
    || !segments.every((s) => connus.has(s))
    || new Set(segments).size !== segments.length) {
    fail(`${ctx.where}« segments » doit être un tableau de segments allumés, sans doublon, `
      + `pris parmi ${SEGMENT14_ORDER.join(', ')} (ex. ["b","c","e","f","g1","g2"] pour H). `
      + `Reçu : ${JSON.stringify(segments)}.`);
  }
  return segments;
}

export function plan(ctx) {
  planAfficheur(ctx, {
    nom: 'fourteenSeg',
    SEGMENTS: SEGMENTS14,
    ORDER: SEGMENT14_ORDER,
    fusedStrokes: fusedStrokes14,
    largeur: SEG14_STROKE,
    lire,
  });
}
