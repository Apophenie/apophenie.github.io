/** Le point d'entrée de `AB-testing.html` — et il n'y a rien de plus.
 *
 *  Même discipline que `debug-main.js` : pas de routeur, pas d'i18n, pas de
 *  réglages. Cette page n'est pas une page du site, c'est un instrument posé à
 *  côté (voir l'en-tête de `pages/arbitrage.js`).
 *
 *  ⚠ Pas d'`await` de premier niveau : le build replie tout en un script
 *  CLASSIQUE pour que la page s'ouvre en `file://` (voir `vite.config.js`), et
 *  un module qui attend à sa racine n'y survivrait pas. On enveloppe.
 */

import * as pont from './pont.js';
import { pageArbitrage } from './pages/arbitrage.js';

const racine = document.getElementById('arb');

(async () => {
  try {
    // Le moteur et le visuel, dans cet ordre : sans les polices mesurées et la
    // table des glyphes, une scène de comptage de segments échoue bruyamment.
    await pont.preparer();
    if (pont.etat.visuel === 'branché') await pont.preparerVisuel();
    racine.appendChild(pageArbitrage());
  } catch (err) {
    racine.textContent = `L’arbitrage n’a pas pu être monté : ${err && err.message}`;
    console.error('[NumHeroLOLgeek] arbitrage :', err);
  }
})();
