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

test('★ mrd — « un 6 ou un 9 déjà là reste seul », comme la règle l’annonce', () => {
  // Avant : `3 + 6 = 9` puis `3 + 3 + 3 = 9` — deux écrits, deux paquets, et le
  // 6 changé en 9. Maintenant : deux écrits aussi, le 6 intact.
  assert.deepEqual(rend('mrd', [3, 6, 3, 3, 3]), [3, 6, 9]);
  assert.match(op('mrd').regle.fr, /déjà là reste seul/);
  // Avant : `8 + 2 + 6 = 16`, le 6 fondu dans « 1 6 » ; même nombre d'écrits.
  assert.deepEqual(rend('mrd', [2, 4, 8, 2, 6]), [1, 6, 6]);
});

test('★ mrd — l’exception du zéro : un 6 qui n’avale qu’un zéro en ressort intact', () => {
  // Le départage ne compte pas `6 + 0` comme un 6 avalé : à écrits égaux, le
  // paquet de moins reste préféré, et le zéro parasite disparaît.
  const r = rend('mrd', [6, 0, 5, 1, 3, 3]);
  assert.ok(r, 'mrd s’applique');
  assert.ok(!r.includes(0), `le zéro est absorbé par le 6 (${r && r.join(' ')})`);
});

test('★ mrdf — à écrits égaux, le 6 reste seul ; à écrits supérieurs, il peut être avalé', () => {
  // Avant : `5 8 2 6` → `6 6` en fondant le 6. Maintenant le 6 reste.
  const r = rend('mrdf', [5, 8, 2, 6]);
  assert.equal(r[r.length - 1], 6);
  assert.deepEqual(r, [6, 0, 6]);
  // Mais `2 + 67 = 69` écrit DEUX chiffres visés là où `2 | 6 | 7` n'en écrit
  // qu'un : le résultat passe avant la manière, et le 6 est avalé.
  assert.deepEqual(rend('mrdf', [2, 6, 7, 1, 6, 6]), [6, 9, 1, 6, 6]);
});

test('★ mad — la suite qui se referme la première, pas celle qui s’ouvre la première', () => {
  // Avant : `1 + 3 + 3 + 3 + 3 + 5 = 18`, six chiffres pour un 9 à réduire puis
  // à retourner. Maintenant : `3 + 3` et `3 + 3`, deux 6 tout de suite — ce que
  // `mrd` rend sur la même ligne.
  assert.deepEqual(rend('mad', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]), [1, 6, 6, 5, 6, 6, 6, 8, 9]);
  assert.deepEqual(rend('mad', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]), rend('mrd', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]));
  // Et une ligne qu'il refusait (`4 + 4 + 2 + 8 = 18` ne portait plus 666) s'écrit.
  assert.deepEqual(rend('mad', [6, 6, 4, 4, 2, 8]), [6, 6, 4, 6, 8]);
});

test('★ mad — ce qui entre en 6 ressort en 6 : plus de `3 + 6 = 9`', () => {
  const r = rend('mad', RAOULT);
  assert.ok(r, 'mad s’applique à la ligne de Didier Raoult');
  // Avant : `6 15 9 15 9 9 15 8 2 6 5 36 6 8 4` — deux `3 + 6 → 9` et un
  // `7 + 9 + 8 + 5 + 7 → 36` qui fondait un 9.
  assert.ok(!r.includes(36), `aucun 9 fondu dans 36 (${r.join(' ')})`);
  assert.equal(r.filter((v) => v === 6).length, 5, `les cinq 6 de la ligne sont tous là (${r.join(' ')})`);
  // Le zéro parasite de l'autrice reste absorbé : « 0 + 6 », le 6 intact.
  assert.deepEqual(rend('mad', [6, 6, 1, 5, 0, 6, 9, 6, 7, 8, 7, 2]), [6, 6, 6, 6, 9, 6, 15, 9]);
});
