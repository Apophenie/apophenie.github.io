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
 *
 * ★ **ET LE 9 A SA VARIANTE** (19 septembre 2026) : « fais `mrd9` qui garde les
 *   9, et `mrdE` ne les garde pas » (l'autrice). Les codes nus ne visent plus
 *   que le 6 ; les cas où un 9 était gardé pour le demi-tour sont tenus sous
 *   les codes de leurs variantes avec 9 (`mad9`, `mrd9`, `md9E`, `mrf9`), et
 *   le code nu est confronté à la même ligne.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAR_CODE } from './catalogue.js';
import { planRedecoupageExact, viseeDeVariante } from './transformations/mappeurs.js';
import { lireVisee } from './transformations/commun.js';

const op = (code, cible = '666') => PAR_CODE.get(code).viser(cible);
const rend = (code, ligne, cible) => {
  const r = op(code, cible).apply(ligne, ligne.map(() => []));
  return r ? r.valeur : null;
};

/** La ligne de « Didier Raoult » en code ASCII capitales (`fmaj+mas`). */
const RAOULT = [68, 73, 68, 73, 69, 82, 32, 82, 65, 79, 85, 76, 84];

test('★ mrdE — Didier Raoult : deux séries exactes, et un 6 avalé de moins', () => {
  const plan = planRedecoupageExact(RAOULT, viseeDeVariante(lireVisee('666'), false));
  assert.deepEqual(plan.sortie, [6, 6, 6, 6, 6, 6], 'toujours deux séries, sans un 9 à retourner');
  assert.equal(plan.series, 2);
  const premiere = plan.passes[0].paquets;
  const copies = premiere.filter((p) => p.mode === 'copie' && p.sortie[0] === 6).map((p) => p.debut);
  assert.ok(copies.includes(0) && copies.includes(8),
    `le 6 de tête et celui du troisième « D » restent seuls (recopiés : ${copies.join(', ')})`);
  assert.deepEqual(rend('mrdE', RAOULT), plan.sortie, 'l’opérateur lit la cible comme le plan');
});

test('★ md9E — Didier Raoult : les 9 gardés seuls, trois séries une fois retournés', () => {
  // Le constat de l'autrice : gardant les 9, le redécoupage exact écrirait
  // `6 9 6 9 6 9 6 6 6` — trois séries après `mr9`, contre deux. C'est
  // désormais la variante avec 9, qui ne cherche qu'à partir du cran où `+mr9`
  // peut la suivre (`mappeurs.js › CRAN_DU_DEMI_TOUR`).
  const plan = planRedecoupageExact(RAOULT, viseeDeVariante(lireVisee('666'), true));
  assert.deepEqual(plan.sortie, [6, 9, 6, 9, 6, 9, 6, 6, 6]);
  assert.equal(plan.series, 3);
  assert.deepEqual(rend('md9E', RAOULT), plan.sortie);
  const copies = plan.passes[0].paquets.filter((p) => p.mode === 'copie' && p.sortie[0] === 9);
  assert.ok(copies.length >= 1, 'un 9 de la ligne est gardé seul pour le demi-tour');
});

test('★ md9E — le 6 déjà là reste seul, et le 9 se fabrique à ses côtés', () => {
  // Avant : `6 + 8 + 4 = 18 → 9`, le 6 changé en 9. Maintenant le 6 reste, et
  // ce sont les intrus qui font les deux 9. Sans le 9, la ligne (somme 42) ne
  // s'écrit pas : `mrdE` se tait.
  assert.deepEqual(rend('md9E', [6, 8, 4, 8, 8, 8]), [6, 9, 9]);
  assert.equal(rend('mrdE', [6, 8, 4, 8, 8, 8]), null);
});

test('★ md9E — le PLUS de séries passe avant la seconde passe', () => {
  // « À résultat égal ou meilleur » : l'ancien ordre préférait une passe à une
  // série (`6 9 9`) ; deux séries au prix d'une seconde passe l'emportent.
  const ligne = [26, 24, 19, 21, 20, 21, 17, 23, 26, 20, 22, 15, 22];
  assert.deepEqual(rend('md9E', ligne), [6, 9, 6, 6, 6, 9]);
  assert.equal(rend('mrdE', ligne), null, 'sans deux 9, pas une série exacte');
});

test('★ mrd — « un 6 ou un 9 déjà là reste seul », comme la règle l’annonce', () => {
  // Avant : `3 + 6 = 9` puis `3 + 3 + 3 = 9` — deux écrits, deux paquets, et le
  // 6 changé en 9. Maintenant : deux écrits aussi, le 6 intact — c'est `mrd9`,
  // qui garde le 9 ; `mrd`, qui ne vise que le 6, écrit `3 + 3`.
  assert.deepEqual(rend('mrd9', [3, 6, 3, 3, 3]), [3, 6, 9]);
  assert.deepEqual(rend('mrd', [3, 6, 3, 3, 3]), [3, 6, 3, 6]);
  assert.match(op('mrd').regle.fr, /déjà là reste seul/);
  assert.match(op('mrd9').regle.fr, /déjà là reste seul/);
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
  // qu'un : le résultat passe avant la manière, et le 6 est avalé. Le 9 n'est
  // visé que par la variante avec 9 : `mrdf` n'y trouve plus rien à accoler.
  assert.deepEqual(rend('mrf9', [2, 6, 7, 1, 6, 6]), [6, 9, 1, 6, 6]);
  assert.equal(rend('mrdf', [2, 6, 7, 1, 6, 6]), null);
});

test('★ mad — la suite qui se referme la première, pas celle qui s’ouvre la première', () => {
  // Avant : `1 + 3 + 3 + 3 + 3 + 5 = 18`, six chiffres pour un 9 à réduire puis
  // à retourner. Maintenant : `3 + 3` et `3 + 3`, deux 6 tout de suite — ce que
  // `mrd` rend sur la même ligne.
  assert.deepEqual(rend('mad', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]), [1, 6, 6, 5, 6, 6, 6, 8, 9]);
  // (Le 9 final y est gardé par les variantes avec 9, qui s'accordent ; `mrd`,
  //  sans 9, préfère `8 + 9` à deux paquets — le départage « moins de paquets ».)
  assert.deepEqual(rend('mad9', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]), rend('mrd9', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]));
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
  // Le zéro parasite de l'autrice reste absorbé : « 0 + 6 », le 6 intact. Sa
  // découpe `6 6 6 6 9 6 15 9` garde deux 9 : c'est celle de `mad9` ; `mad`,
  // qui ne vise que le 6, laisse `7 2` au lieu d'en faire un 9.
  assert.deepEqual(rend('mad9', [6, 6, 1, 5, 0, 6, 9, 6, 7, 8, 7, 2]), [6, 6, 6, 6, 9, 6, 15, 9]);
  assert.deepEqual(rend('mad', [6, 6, 1, 5, 0, 6, 9, 6, 7, 8, 7, 2]), [6, 6, 6, 6, 9, 6, 15, 7, 2]);
});
