/** La barre haute : ce qu'elle porte, et ce qu'elle ne porte plus.
 *
 *  Deux réglages seulement — le thème et la langue. Le bouton « réduire les
 *  animations » a été retiré : « il y a dans .transport de quoi naviguer au
 *  rythme où le veut l'utilisateur, donc pas besoin de cet élément en plus »
 *  (l'auteur). Le RÉGLAGE, lui, survit : `prefers-reduced-motion` est toujours
 *  lu, et c'est ce que ce fichier vérifie — retirer un bouton n'est pas retirer
 *  une fonctionnalité d'accessibilité. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/** Le CODE seul : les commentaires parlent souvent de ce qu'ils ont retiré. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

test('★ en-tête — le bouton d’animation est parti, le réglage est resté', () => {
  const entete = sansCommentaires(lire('./entete.js'));
  assert.doesNotMatch(entete, /boutonAnimation\s*\(/, 'le bouton d’animation subsiste');
  assert.doesNotMatch(entete, /basculerAnimation/, 'la bascule est encore câblée dans la barre');

  // Le réglage ne disparaît pas avec son bouton : le lecteur continue de lire la
  // préférence système, et c'est elle qui compte pour l'accessibilité.
  assert.match(lire('./reglages.js'), /prefers-reduced-motion/,
    'la préférence système n’est plus lue nulle part');
  assert.match(lire('./pages/demonstration.js'), /animationEffective\(\)/,
    'la page ne consulte plus le réglage de mouvement');
});

test('★ en-tête — le déclencheur de langue porte son propre picto', () => {
  const entete = sansCommentaires(lire('./entete.js'));

  // Un déclencheur nomme le CONTRÔLE, une option nomme le CHOIX : les deux
  // marques de citation distinguent bien les langues dans le panneau, mais
  // seules sur un bouton elles ne disent pas de quoi il s'agit.
  assert.match(entete, /pictoDeclencheur:\s*icoLangue/, 'le picto de langue n’est plus posé');
  assert.match(lire('./selecteur.js'), /config\.pictoDeclencheur/, 'le sélecteur ne l’honore plus');
  assert.match(lire('./pictos.js'), /export const icoLangue/, 'le picto de langue a disparu');

  // Et les options gardent le leur : sans quoi le panneau afficherait deux fois
  // le même signe et ne distinguerait plus rien.
  assert.match(entete, /picto:\s*PICTOS_LANGUE\[code\]/, 'les options ont perdu leur marque');
});

test('★ en-tête — le picto de langue prend l’encre du thème, sans variante', () => {
  const pictos = lire('./pictos.js');
  // Une seule source, remplie en `currentColor` : pas de version claire et de
  // version sombre à maintenir en parallèle — elles auraient fini par diverger,
  // et aucune des deux n'aurait suivi un troisième thème.
  assert.match(pictos, /class: 'ico-plein', d: LANGUE_D/, 'le tracé n’est plus rempli en encre');
  assert.match(lire('../styles/controls.css'), /\.ico-plein\s*\{[^}]*fill:\s*currentColor/,
    '`ico-plein` ne suit plus la couleur du texte');
  assert.doesNotMatch(pictos, /icoLangueClair|icoLangueSombre/,
    'une variante par thème est réapparue');
});
