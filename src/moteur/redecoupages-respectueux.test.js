/**
 * ★ **UN CHIFFRE DÉJÀ JUSTE RESTE SEUL — la famille des redécoupages.**
 *
 * > « mrdE a l'air de détruire des 6 et de convertir des 9 qui auraient pu être
 * >   retournés en 6, donc l'opérateur me semble encore à améliorer. […] Oui,
 * >   améliore mrdE (et peut-être mrd et mad dans la même lignée, à toi de voir
 * >   s'ils souffrent des mêmes défauts). » (l'autrice, 19 septembre)
 *
 * Chaque cas ci-dessous est une ligne où l'opérateur AVALAIT un chiffre déjà
 * juste — un 6, ou un 9 que `mr9` retournera — pour gagner un paquet ou une
 * seconde passe, à résultat égal. L'ancienne sortie est citée en regard : ce
 * fichier affirme le nouvel état, et dit pourquoi l'ancien était un défaut.
 * Les mesures d'ensemble sont écrites là où la règle vit
 * (`mappeurs.js › meilleurPlanExact`, `planRedecoupage`, `planAdditionSelective`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAR_CODE } from './catalogue.js';
import { planRedecoupageExact } from './transformations/mappeurs.js';
import { lireVisee } from './transformations/commun.js';

const op = (code, cible = '666') => PAR_CODE.get(code).viser(cible);
const rend = (code, ligne, cible) => {
  const r = op(code, cible).apply(ligne, ligne.map(() => []));
  return r ? r.valeur : null;
};

/** La ligne de « Didier Raoult » en code ASCII capitales (`fmaj+mas`). */
const RAOULT = [68, 73, 68, 73, 69, 82, 32, 82, 65, 79, 85, 76, 84];

test('★ mrdE — Didier Raoult : deux séries exactes, et un 6 avalé de moins', () => {
  const plan = planRedecoupageExact(RAOULT, lireVisee('666'));
  assert.deepEqual(plan.sortie, [6, 6, 6, 6, 6, 6], 'toujours deux séries, sans un 9 à retourner');
  // Sept chiffres justes (cinq 6, deux 9) pour six plages : deux séries exactes
  // en avalent forcément ; l'ancien plan en avalait six, celui-ci cinq.
  assert.equal(plan.avales, 5);
  const premiere = plan.passes[0].paquets;
  const copies = premiere.filter((p) => p.mode === 'copie' && p.sortie[0] === 6).map((p) => p.debut);
  assert.ok(copies.includes(0) && copies.includes(8),
    `le 6 de tête et celui du troisième « D » restent seuls (recopiés : ${copies.join(', ')})`);
});

test('★ mrdE — à demi-tours égaux, le 6 déjà là reste seul', () => {
  // Avant : `6 + 8 + 4 = 18 → 9`, le 6 changé en 9. Maintenant le 6 reste, et
  // ce sont les intrus qui font les deux 9.
  assert.deepEqual(rend('mrdE', [6, 8, 4, 8, 8, 8]), [6, 9, 9]);
});

test('★ mrdE — le PLUS de séries passe avant la seconde passe', () => {
  // « À résultat égal ou meilleur » : l'ancien ordre préférait une passe à une
  // série (`6 9 9`) ; deux séries au prix d'une seconde passe l'emportent.
  const ligne = [26, 24, 19, 21, 20, 21, 17, 23, 26, 20, 22, 15, 22];
  assert.deepEqual(rend('mrdE', ligne), [6, 9, 6, 6, 6, 9]);
});
