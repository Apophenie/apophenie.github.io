/** Le réemploi d'une recherche de fragment d'un cran au suivant — `bfs.js › reemployable`.
 *
 *  La condition est prouvée sur `rechercheBrute` (voir le pavé de la fonction) ;
 *  ces tests la gardent cas par cas. L'égalité des listes, elle, est gardée sur
 *  le chemin réel par `lents/monotonie.test.js` (le cran n direct contre la
 *  montée cran par cran). */
import test from 'node:test';
import assert from 'node:assert/strict';

import { reemployable } from '../bfs.js';

const cout = (sur) => ({
  travail: 1000, noeuds: 20000, tronque: true, tronqueTemps: false,
  profondeur: 5, maxTravail: 420000, dMax: 15, ...sur,
});

test('réemploi — arrêtée par MAX_NODES sous un budget plus petit : réemployable', () => {
  assert.equal(reemployable(cout(), 840000, 15), true);
  assert.equal(reemployable(cout(), 420000, 15), true);
});

test('réemploi — le budget de travail a mordu : refait', () => {
  assert.equal(reemployable(cout({ travail: 420000 }), 840000, 15), false);
});

test('réemploi — une recherche faite sous un budget PLUS GRAND ne sert pas un budget plus petit', () => {
  assert.equal(reemployable(cout({ maxTravail: 840000 }), 420000, 15), false);
  assert.equal(reemployable(cout({ dMax: 19 }), 420000, 15), false);
});

test('réemploi — profondeur relevée : seulement si le dernier niveau n’a pas été entamé', () => {
  assert.equal(reemployable(cout({ profondeur: 5 }), 840000, 19), true);
  assert.equal(reemployable(cout({ profondeur: 14 }), 840000, 19), false);
  assert.equal(reemployable(cout({ profondeur: 14 }), 840000, 15), true);
});

test('réemploi — le filet temporel a mordu, ou le coût est inconnu : refait', () => {
  assert.equal(reemployable(cout({ tronqueTemps: true }), 840000, 15), false);
  assert.equal(reemployable(undefined, 840000, 15), false);
  assert.equal(reemployable({ travail: 1, noeuds: 1, tronque: false, tronqueTemps: false }, 840000, 15), false);
});
