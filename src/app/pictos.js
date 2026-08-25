/** Les pictogrammes des sélecteurs — dessinés à la main, dans le vocabulaire
 *  du filet gravé (design §2.1, §4.1) : viewBox 24×24, tracé de 2 px,
 *  terminaisons **carrées**, jointures en onglet, `currentColor`. Aucune icône
 *  arrondie générique, aucune bibliothèque, aucun drapeau.
 *
 *  THÈME — trois états, trois dessins qui se distinguent de loin :
 *    · clair  : le disque plein cerné de ses huit rayons ;
 *    · auto   : le même disque, moitié encre moitié papier — le partage littéral
 *               entre les deux thèmes, c'est-à-dire « ce que décide le système » ;
 *    · sombre : le croissant.
 *
 *  LANGUE — pas de drapeau (un drapeau est un pays, pas une langue) et pas de
 *  globe passe-partout : chaque langue est représentée par **sa propre marque de
 *  citation**, posée sur un filet — la ligne de texte. C'est exactement ce qui
 *  distingue les deux typographies du site, et c'est donc le signe le plus juste :
 *    · français : les guillemets chevrons « » ;
 *    · anglais  : les guillemets droits doubles " ".
 *  Le filet sous les marques donne aux deux pictos la même assise et rappelle
 *  qu'il s'agit d'une ligne composée. */

import { svg as s } from './dom.js';

const boite = (enfants) =>
  s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, enfants);

const trait = (d) => s('path', { class: 'ico-trait', d });
const plein = (d) => s('path', { class: 'ico-plein', d });

/* ───────────────────────────────── Thème ───────────────────────────────── */

/** Le soleil : disque cerné, huit rayons droits. */
export const icoClair = () => boite([
  s('circle', { class: 'ico-trait', cx: '12', cy: '12', r: '4.5' }),
  trait('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2'),
]);

/** L'automatique : un seul disque, coupé net, encre à gauche, papier à droite.
 *  Le partage est vertical et franc — pas un dégradé : le système tranche. */
export const icoAuto = () => boite([
  plein('M12 4.5 A 7.5 7.5 0 0 0 12 19.5 Z'),
  s('circle', { class: 'ico-trait', cx: '12', cy: '12', r: '7.5' }),
]);

/** Le croissant. */
export const icoSombre = () => boite([
  trait('M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z'),
]);

export const PICTOS_THEME = { clair: icoClair, auto: icoAuto, sombre: icoSombre };

/* ───────────────────────────────── Langue ──────────────────────────────── */

/** Le filet de ligne, commun aux deux pictos de langue. */
const filetDeLigne = () => trait('M3 19.5h18');

/* UNE SEULE marque ouvrante par langue, au grand format. Le premier jet portait
   la paire ouvrante ET fermante (« … ») : à la taille réelle du déclencheur —
   20 px — les quatre chevrons se rejoignaient en une frisure illisible. Vérifié
   au navigateur sur sept variantes ; la marque isolée gagne nettement. */

/** Français : le chevron double ouvrant, « . */
export const icoFrancais = () => boite([
  trait('M12 5.5 L6 11 L12 16.5'),
  trait('M18 5.5 L12 11 L18 16.5'),
  filetDeLigne(),
]);

/** Anglais : les guillemets droits doubles, " . Deux marques courtes et hautes,
 *  légèrement inclinées — l'inclinaison les distingue du picto « pause » de la
 *  barre de transport, qui est fait de deux barres verticales pleines. */
export const icoAnglais = () => boite([
  trait('M10 5 L8 13'),
  trait('M16 5 L14 13'),
  filetDeLigne(),
]);

export const PICTOS_LANGUE = { fr: icoFrancais, en: icoAnglais };

/**
 * ★ Le picto du DÉCLENCHEUR de langue — le livre ouvert et son « A ».
 *
 * Les deux marques de citation ci-dessus disent bien QUELLE langue on choisit,
 * une fois le panneau ouvert et les deux posées côte à côte. Mais repliées sur
 * le bouton, seules, elles ne disent pas DE QUOI il s'agit : « il n'est pas
 * reconnaissable en l'état » (l'auteur). Un déclencheur nomme le contrôle ; une
 * option nomme le choix. Ce ne sont pas les mêmes signes, et le sélecteur
 * accepte donc les deux (`pictoDeclencheur`, `selecteur.js`).
 *
 * Le dessin vient de **1thunometre** (`src/front-app/ui/icons.ts`), un autre
 * projet de la même autrice, sous AGPL-3.0 : c'est le glyphe de traduction
 * universellement lu — un livre ouvert portant une lettre latine et un
 * idéogramme. Il est repris **tel quel**, tracé compris, pour que les deux
 * sites parlent la même langue graphique.
 *
 * ★ Pas de variante claire et de variante sombre. Le tracé est rempli en
 * `currentColor` : il prend la couleur du texte du bouton, donc l'encre du
 * thème en vigueur, et le fond reste transparent. Deux fichiers à maintenir
 * — l'un pour le noir, l'autre pour le blanc — auraient fini par diverger,
 * et aucun des deux n'aurait suivi un troisième thème.
 *
 * Il est PLEIN quand les autres pictos sont tracés au filet : c'est la seule
 * entorse au vocabulaire de §2.1, assumée, parce qu'un livre ouvert dessiné en
 * traits de 2 px à 20 px de côté se referme en pâté.
 */
export const icoLangue = () => s('svg', {
  viewBox: '0 0 256 256',
  'aria-hidden': 'true',
  focusable: 'false',
}, [s('path', { class: 'ico-plein', d: LANGUE_D })]);

/** Le tracé, recopié depuis 1thunometre sans la moindre retouche. */
const LANGUE_D = 'M62.4,101c-1.5-2.1-2.1-3.4-1.8-3.9c0.2-0.5,1.6-0.7,3.9-0.5c2.3,0.2,4.2,0.5,5.8,0.9c1.5,0.4,2.8,1,3.8,1.7c1,0.7,1.8,1.5,2.3,2.6c0.6,1,1,2.3,1.4,3.7c0.7,2.8,0.5,4.7-0.5,5.7c-1.1,1-2.6,0.8-4.6-0.6c-2.1-1.4-3.9-2.8-5.5-4.2C65.5,105.1,63.9,103.2,62.4,101z M40.7,190.1c4.8-2.1,9-4.2,12.6-6.4c3.5-2.1,6.6-4.4,9.3-6.8c2.6-2.3,5-4.9,7-7.7c2-2.7,3.8-5.8,5.4-9.2c1.3,1.2,2.5,2.4,3.8,3.5c1.2,1.1,2.5,2.2,3.8,3.4c1.3,1.2,2.8,2.4,4.3,3.8c1.5,1.4,3.3,2.8,5.3,4.5c0.7,0.5,1.4,0.9,2.1,1c0.7,0.1,1.7,0,3.1-0.6c1.3-0.5,3-1.4,5.1-2.8c2.1-1.3,4.7-3.1,7.9-5.4c1.6-1.1,2.4-2,2.3-2.7c-0.1-0.7-1-1-2.7-0.9c-3.1,0.1-5.9,0.1-8.3-0.1c-2.5-0.2-5-0.6-7.4-1.4c-2.4-0.8-4.9-1.9-7.5-3.4c-2.6-1.5-5.6-3.6-9.1-6.2c1-3.9,1.8-8,2.4-12.4c0.3-2.5,0.6-4.3,0.8-5.6c0.2-1.2,0.5-2.4,0.9-3.3c0.3-0.8,0.4-1.4,0.5-1.9c0.1-0.5-0.1-1-0.4-1.6c-0.4-0.5-1-1.1-1.9-1.7c-0.9-0.6-2.2-1.4-3.9-2.3c2.4-0.9,5.1-1.7,7.9-2.6c2.7-0.9,5.7-1.8,8.8-2.7c3-0.9,4.5-1.9,4.6-3.1c0.1-1.2-0.9-2.3-3.2-3.5c-1.5-0.8-2.9-1.1-4.3-0.9c-1.4,0.2-3.2,0.9-5.4,2.2c-0.6,0.4-1.8,0.9-3.4,1.6c-1.7,0.7-3.6,1.5-6,2.5c-2.4,1-5,2-7.8,3.1c-2.9,1.1-5.8,2.2-8.7,3.2c-2.9,1.1-5.7,2-8.2,2.8c-2.6,0.8-4.6,1.4-6.1,1.6c-3.8,0.8-5.8,1.6-5.9,2.4c0,0.8,1.5,1.6,4.4,2.4c1.2,0.3,2.3,0.6,3.1,0.6c0.8,0.1,1.7,0.1,2.5,0c0.8-0.1,1.6-0.3,2.4-0.5c0.8-0.3,1.7-0.7,2.8-1.1c1.6-0.8,3.9-1.7,6.9-2.8c2.9-1,6.6-2.4,11.2-4c0.9,2.7,1.4,6,1.4,9.8c0,3.8-0.4,8.1-1.4,13c-1.3-1.1-2.7-2.3-4.2-3.6c-1.5-1.3-2.9-2.6-4.3-3.9c-1.6-1.5-3.2-2.5-4.7-3c-1.6-0.5-3.4-0.5-5.5,0c-3.3,0.9-5,1.9-4.9,3.1c0,1.2,1.3,1.8,3.8,1.9c0.9,0.1,1.8,0.3,2.7,0.6c0.9,0.3,1.9,0.9,3.2,1.8c1.3,0.9,2.9,2.2,4.7,3.8c1.8,1.6,4.2,3.7,7,6.3c-1.2,2.9-2.6,5.6-4.1,8c-1.5,2.5-3.4,5-5.5,7.3c-2.2,2.4-4.7,4.8-7.7,7.2c-3,2.5-6.6,5.1-10.8,7.8c-4.3,2.8-6.5,4.7-6.5,5.6C35,192.1,37,191.7,40.7,190.1z M250.5,81.8v165.3l-111.6-36.4L10.5,253.4V76.1l29.9-10V10.4l81.2,28.7L231.3,2.6v73.1L250.5,81.8z M124.2,50.6L22.3,84.6v152.2l101.9-33.9V50.6L124.2,50.6z M219.4,71.9V19L138.1,46L219.4,71.9z M227,201.9L196.5,92L176,85.6l-30.9,90.8l18.9,5.9l5.8-18.7l31.9,10l5.7,22.3L227,201.9z M174.8,147.7l22.2,6.9l-10.9-42.9L174.8,147.7z';

/* ──────────────────────────────── Animation ────────────────────────────── */

/** Animation complète : le profil d'une transition. Animation réduite : le trait
 *  droit, qui ne bouge pas. */
export const icoAnimation = (complete) => boite([
  complete ? trait('M3 18h4l3-12h4l3 12h4') : trait('M3 12h18'),
]);
