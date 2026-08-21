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

/* ──────────────────────────────── Animation ────────────────────────────── */

/** Animation complète : le profil d'une transition. Animation réduite : le trait
 *  droit, qui ne bouge pas. */
export const icoAnimation = (complete) => boite([
  complete ? trait('M3 18h4l3-12h4l3 12h4') : trait('M3 12h18'),
]);
