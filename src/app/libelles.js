/** Les libellés qui ne viennent PAS des dictionnaires de l'interface.
 *
 *  Un titre d'approche, une règle, un titre d'étape, une légende de calcul : tout
 *  cela est produit ailleurs — le catalogue arithmétique (`src/moteur/`) et le
 *  moteur de recherche (`src/recherche/scenario.js`), qui portent leurs propres
 *  libellés **traduits à la source**, sous la forme `{fr, en}`.
 *
 *  L'interface **consomme** cette forme, elle ne la redéfinit pas : ces quatre
 *  fonctions sont le seul point où la conversion se fait, avec un repli propre
 *  quand la valeur manque. Elles tolèrent aussi la chaîne nue, le temps que les
 *  catalogues finissent de passer à la forme traduite. */

import { localiser, t } from '../i18n/index.js';

/** Le titre d'une approche, ou « Démonstration » à défaut. */
export const titreApproche = (approche) =>
  localiser(approche && approche.titre) || t('demo.demonstration');

/** La règle affichée sous le titre. Chaîne vide si l'approche n'en porte pas. */
export const regleApproche = (approche) => localiser(approche && approche.regle);

/** Le titre d'une étape de scénario, ou « Transformation n » à défaut. */
export const titreEtape = (etape, i) =>
  localiser(etape && etape.title) || t('registre.transformation', { i: i + 1 });

/** La légende de calcul d'une étape — `8 + 15 + 16 + 5 = 44`. Souvent absente. */
export const legendeEtape = (etape) => localiser(etape && etape.caption);

/** Le libellé de méthode d'un fragment de la page de résultats. */
export const methodeFragment = (fragment) => localiser(fragment && fragment.methode);
