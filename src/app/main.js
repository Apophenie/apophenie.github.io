/** Amorçage.
 *
 *  Ordre imposé :
 *    1. les réglages persistés (le thème ET la langue sont déjà posés par le
 *       script inline de index.html : ici on ne fait que compléter — traduire
 *       le pied de page et le lien d'évitement, que le routeur ne refait pas) ;
 *    2. la capture du tracé du logo, qui vit dans index.html pour rester
 *       lisible sans JavaScript ;
 *    3. le chargement des moteurs voisins, jamais bloquant ;
 *    4. le routeur. */

import { appliquerTout } from './reglages.js';
import { appliquerLangue } from '../i18n/index.js';
import { capturerModele } from './logo.js';
import * as pont from './pont.js';
import { demarrer } from './routeur.js';

appliquerTout();
appliquerLangue();
capturerModele(document);

pont.preparer()
  .then(async () => {
    if (pont.etat.visuel === 'branché') await pont.preparerVisuel();
  })
  .catch((err) => console.error('[NumHeroLOLgeek] préparation :', err))
  .finally(() => {
    document.documentElement.setAttribute('data-js', 'oui');
    demarrer();
  });
