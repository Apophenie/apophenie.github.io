/** Le point d'entrée de `debug.html` — et il n'y a rien de plus.
 *
 *  Pas de routeur, pas d'i18n, pas de réglages : cette page n'est pas une page
 *  du site (voir l'en-tête de `debug.html`). Tout ce qu'elle montre est calculé
 *  par `pages/debug.js`, qui n'a besoin que du catalogue et du barème.
 */

import { pageDebug } from './pages/debug.js';

const racine = document.getElementById('dbg');
try {
  racine.appendChild(pageDebug());
} catch (err) {
  // Une page de débogage qui échoue en silence serait une plaisanterie : elle
  // dit ce qui ne va pas, à l'écran, là où on est venu chercher la vérité.
  racine.textContent = `Le récapitulatif n’a pas pu être calculé : ${err && err.message}`;
  console.error('[NumHeroLOLgeek] récapitulatif du barème :', err);
}
