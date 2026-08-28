/** La page qu'on regarde pendant que le moteur cherche.
 *
 *  Elle n'existe que parce que la recherche a cessé d'être instantanée : le
 *  pipeline complet demande 130 à 1 400 ms sur le corpus du banc, et le budget
 *  autorisé va jusqu'à cinq secondes (`src/config.js`). Une page blanche
 *  pendant ce temps-là, ou pire, une page figée sur la précédente, c'est
 *  exactement le « waiter à durée non identifiée » que l'auteur refuse.
 *
 *  ★ Elle porte le MÊME titre que la page de résultats qui va la remplacer —
 *  la saisie, entre guillemets. Ce n'est pas une page d'attente générique : on
 *  est déjà arrivé, c'est la liste qui se remplit. Le lecteur d'écran reçoit
 *  donc tout de suite le sujet de la page, et non « veuillez patienter ».
 *
 *  ★ Elle ne montre PAS de squelette de résultats (ces rectangles gris qui
 *  imitent le contenu à venir). Un squelette promet une forme qu'on ne connaît
 *  pas encore : le nombre de voies dépend de ce qu'on trouve, et il arrive
 *  qu'on n'en trouve qu'une. La jauge, elle, ne promet que ce qu'elle mesure. */

import { e } from '../dom.js';
import { guillemets, abreger } from '../typo.js';
import { t } from '../../i18n/index.js';

/**
 * @param {{saisie:string, jauge:{element:HTMLElement}}} ctx
 */
export function pageAttente({ saisie, jauge }) {
  return e('div.page.page--etroite.attente', {}, [
    e('p.surtitre', { texte: t('attente.surtitre') }),
    e('h1', {}, [e('span.saisie-citee', { texte: guillemets(abreger(saisie, 120)) })]),
    jauge.element,
    e('p.legende.attente__note', { texte: t('attente.texte') }),
  ]);
}
