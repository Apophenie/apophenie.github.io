/** Amorçage.
 *
 *  Ordre imposé :
 *    1. les réglages persistés (le thème ET la langue sont déjà posés par le
 *       script inline de index.html : ici on ne fait que compléter — traduire
 *       le pied de page et le lien d'évitement, que le routeur ne refait pas) ;
 *    2. la capture du tracé du logo, qui vit dans index.html pour rester
 *       lisible sans JavaScript ;
 *    3. le chargement des moteurs voisins, jamais bloquant ;
 *    4. le routeur.
 *
 *  ★ MAIS D'ABORD : CE FICHIER N'EST PAS TOUJOURS UNE PAGE.
 *
 *  Une fois construit, le site tient dans UN script classique — c'est ce qui le
 *  rend ouvrable au double-clic (`vite.config.js`). Et c'est aussi ce qui rend
 *  le travailleur gratuit : plutôt que d'embarquer une seconde copie du moteur
 *  de recherche (227 Ko, mesurés), le travailleur recharge ce même script par
 *  `importScripts` — les deux seuls navigateurs testés l'acceptent en `file://`,
 *  le relevé complet est dans `src/app/travailleur.js`.
 *
 *  Conséquence directe : ce fichier s'exécute alors dans une portée SANS DOM.
 *  Sans la garde ci-dessous, `capturerModele(document)` y jetterait — et
 *  Chromium rapporte cette mort sous le nom trompeur de « NetworkError …
 *  failed to load », comme s'il n'avait pas trouvé le fichier. On perdrait le
 *  travailleur, et on chercherait le bogue du mauvais côté pendant une heure.
 *
 *  ⚠️ La garde ne protège que l'amorçage. La règle qu'elle suppose vaut pour
 *  tout le dépôt : **aucun module ne touche au DOM au moment de son
 *  évaluation.** Elle est tenue aujourd'hui (vérifié par bissection du fichier
 *  construit) ; si elle cessait de l'être, le travailleur ne naîtrait plus et
 *  la recherche repasserait en tranches sur le fil principal — une dégradation,
 *  jamais une panne. */

import { appliquerTout } from './reglages.js';
import { appliquerLangue } from '../i18n/index.js';
import { capturerModele } from './logo.js';
import * as pont from './pont.js';
import { demarrer } from './routeur.js';

/** Le corps du travailleur, désigné par un spécificateur LITTÉRAL — même
 *  discipline que les registres de `pont.js` et de `recherche/index.js` : un
 *  `import(variable)` ne se replierait pas dans le fichier unique, et c'est
 *  précisément le fichier unique qui doit le contenir. */
const corpsDuTravailleur = () => import('../recherche/travailleur.js');

if (typeof document === 'undefined') {
  // Rôle TRAVAILLEUR. Charger ce module l'installe (il se branche tout seul sur
  // une portée de travailleur) ; l'appel explicite ne fait que rendre la chose
  // lisible et supporte le cas où l'ordre d'évaluation changerait — la fonction
  // est idempotente.
  corpsDuTravailleur()
    .then((m) => m.installerTravailleur())
    .catch((err) => console.error('[NumHeroLOLgeek] travailleur :', err));
} else {
  // Rôle PAGE.
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
}
