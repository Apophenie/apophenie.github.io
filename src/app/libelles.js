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
/* ★ **PAS DE REPLI ICI — chaque page a le sien, et ils ne se ressemblent pas.**

   Cette fonction se repliait sur « Démonstration ». Le mot ne nomme AUCUNE
   voie : sur une carte de listing, il annonce à douze reprises la même chose,
   c'est-à-dire rien. « Je vois encore des versions arborant Démonstration et
   rien d'autre ou presque » (l'auteur) — c'était ce repli, et il gagnait
   toujours : `carteVoie` écrivait bien `titreApproche(a) || voieSansTitre`,
   mais le `||` ne se déclenchait jamais, puisque « Démonstration » n'est pas
   une chaîne vide. La clé `resultat.voieSansTitre` était donc du code mort
   depuis le premier jour.

   On rend donc la chaîne VIDE, et le repli redescend chez l'appelant, qui seul
   sait de quoi il parle : « Approche n° 3 » dans la liste, « sans titre » sur
   la page d'animation. */
export const titreApproche = (approche) => localiser(approche && approche.titre) || '';

/** La règle affichée sous le titre. Chaîne vide si l'approche n'en porte pas. */
export const regleApproche = (approche) => localiser(approche && approche.regle);

/** Le titre d'une étape de scénario, ou « Transformation n » à défaut. */
export const titreEtape = (etape, i) =>
  localiser(etape && etape.title) || t('registre.transformation', { i: i + 1 });

/** La légende de calcul d'une étape — `8 + 15 + 16 + 5 = 44`. Souvent absente. */
export const legendeEtape = (etape) => localiser(etape && etape.caption);

/**
 * La FIGURE d'une étape — l'illustration que Le Registre dessine sous la
 * légende (aujourd'hui : l'afficheur sept segments). Déjà dans la langue du
 * scénario, comme le titre et la légende ; `null` la plupart du temps.
 *
 * Elle porte TOUJOURS un `texte`, son équivalent lisible : c'est lui qu'on
 * annonce dans la région live, où il n'y a pas de dessin (CONTRACTS §6).
 */
export const figureEtape = (etape) => (etape && etape.figure) || null;

/** L'équivalent textuel d'une figure, pour la région live et les replis. */
export const texteFigure = (etape) => {
  const f = figureEtape(etape);
  return f && typeof f.texte === 'string' ? f.texte : '';
};

/** Le libellé de méthode d'un fragment de la page de résultats. */
export const methodeFragment = (fragment) => localiser(fragment && fragment.methode);
