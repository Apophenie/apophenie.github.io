/**
 * ★ **AVEC OU SANS LE 9 — chaque redécoupage en deux variantes.**
 *
 * > « Fais `mrd9` qui garde les 9, et `mrdE` ne les garde pas. […] S'il y a des
 * >   opérateurs qui gardent les 9 et qui n'ont pas de variante, décline-les en
 * >   variante avec 9 et sans. » (l'autrice, 19 septembre 2026)
 *
 * Ce fichier tient les promesses de la déclinaison (`mappeurs.js ›
 * CODES_AVEC_NEUF`, `viseeDeVariante`, `declinerAvecNeuf`) :
 *
 *  1. le code nu ne vise plus le 9 retournable ; sa variante avec 9, oui ;
 *  2. « sans 9 » veut dire sans le 9 RETOURNABLE : une cible qui demande un 9
 *     pour lui-même le garde, et une cible sans 6 est lue comme avant ;
 *  3. la variante avec 9 n'a de sens que pour une cible qui veut des 6 sans
 *     vouloir de 9 — ailleurs elle se désactive —, et se tait quand elle ne
 *     garde aucun 9 ;
 *  4. elle ne s'ouvre qu'au premier cran où deux retouches s'enchaînent, lu
 *     sur la loi (`config.js › premierCranPourRetouches`), et elle est notée
 *     plus bas que son modèle sans être un dernier recours.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAR_CODE, appliquer } from './catalogue.js';
import { nums } from './etat.js';
import { lireVisee } from './transformations/commun.js';
import { viseeDeVariante } from './transformations/mappeurs.js';
import { premierCranPourRetouches, raffinagesEnChaine } from '../config.js';

const PAIRES = [
  ['mad', 'mad9'], ['mrd', 'mrd9'], ['mrdE', 'md9E'],
  ['mrdf', 'mrf9'], ['mrfE', 'mf9E'], ['megf', 'mef9'],
];
const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const rend = (code, v, cible = '666') => {
  const op = PAR_CODE.get(code).viser(cible);
  assert.ok(op, `${code} vise ${cible}`);
  const r = appliquer(op, N(v));
  return r ? r.valeur : null;
};

test('★ la variante avec 9 garde le 9, le code nu ne le vise plus', () => {
  // `3 6 3 3 3` : le 6 reste seul dans les deux ; `3 + 3 + 3 = 9` n'est gardé
  // que par la variante avec 9, le code nu écrit `3 + 3`.
  assert.deepEqual(rend('mrd9', [3, 6, 3, 3, 3]), [3, 6, 9]);
  assert.deepEqual(rend('mrd', [3, 6, 3, 3, 3]), [3, 6, 3, 6]);
  // La règle affichée est la règle appliquée (§0.3) : le 9 n'est annoncé que
  // par la variante qui le vise.
  for (const [nu, neuf] of PAIRES) {
    assert.doesNotMatch(PAR_CODE.get(nu).regle.fr, /demi-tour/, `${nu} : pas de 9 annoncé`);
    assert.match(PAR_CODE.get(neuf).regle.fr, /demi-tour/, `${neuf} : le 9 annoncé`);
  }
});

test('★ la variante avec 9 se tait quand elle ne garde aucun 9', () => {
  // `1 2 3 6 4 2` : trois 6, pas un 9 — la variante n'a rien à léguer à `mr9`,
  // et son modèle écrit la même chose.
  assert.deepEqual(rend('mrd', [1, 2, 3, 6, 4, 2]), [6, 6, 6]);
  assert.equal(rend('mrd9', [1, 2, 3, 6, 4, 2]), null);
  assert.deepEqual(rend('mrdE', [6, 5, 1, 9, 3, 3]), [6, 6, 6]);
  assert.equal(rend('md9E', [6, 5, 1, 9, 3, 3]), null);
});

test('★ sans 9, c’est sans le 9 RETOURNABLE : une cible sans 6 est lue comme avant', () => {
  // La visée d'une variante sans 9 EST la cible quand le 9 n'y était pas
  // retournable : pas une copie, pas un chiffre de moins.
  for (const cible of ['777', '31031998', '1998', '999', '111']) {
    const v = lireVisee(cible);
    assert.equal(viseeDeVariante(v, false), v, `${cible} : lue telle quelle`);
    assert.equal(viseeDeVariante(v, true), null, `${cible} : pas de variante avec 9`);
  }
  // Sous 666, la variante sans 9 lit une copie qui le dit, et rien d'autre ne change.
  const v666 = lireVisee('666');
  const sans = viseeDeVariante(v666, false);
  assert.notEqual(sans, v666);
  assert.equal(sans.sansNeufRetournable, true);
  assert.deepEqual(sans.chiffres, v666.chiffres);
  assert.equal(viseeDeVariante(v666, true), v666);
});

test('★ 777 : les variantes sans 9 visent le 7, et fabriquent la cible', () => {
  // `3 + 4 = 7`, `1 + 6 = 7`, le 7 reste, `2 + 5 = 7` : quatre 7.
  assert.deepEqual(rend('mrd', [3, 4, 1, 6, 7, 2, 5], '777'), [7, 7, 7, 7]);
  assert.deepEqual(rend('mad', [3, 4, 1, 6, 7, 2, 5], '777'), [7, 7, 7, 7]);
  // L'exacte : toute la ligne, et la cible deux fois.
  assert.deepEqual(rend('mrdE', [3, 4, 7, 5, 2, 7, 1, 6, 7], '777'), [7, 7, 7, 7, 7, 7]);
  // Et pas une variante avec 9 : le demi-tour ne rend qu'un 6.
  for (const [, neuf] of PAIRES) assert.equal(PAR_CODE.get(neuf).viser('777'), null, `${neuf} sous 777`);
});

test('★ une date : le 9 demandé est un chiffre visé comme les autres', () => {
  // 31031998 — la sortie de StarCraft. Les deux 9 de la cible sont de vrais
  // chiffres : la variante sans 9 les écrit, dans l'ordre.
  assert.deepEqual(rend('mrdE', [3, 9, 1, 0, 3, 1, 9, 9, 8, 4, 5], '31031998'), [3, 1, 0, 3, 1, 9, 9, 8],
    'les intrus 9, 4 et 5 se fondent : 3 + 9 = 12 → 3, 8 + 4 + 5 = 17 → 8');
  assert.deepEqual(rend('mrd', [3, 9, 1, 0, 2, 1, 1, 9, 4, 5, 8], '31031998'), [3, 9, 1, 0, 3, 1, 9, 9, 8],
    '2 + 1 = 3, et 4 + 5 = 9 : le 9 que la date demande');
  assert.deepEqual(rend('mad', [19, 1, 18, 1, 8], '1998'), [1, 9, 1, 9, 1, 8]);
  // La variante avec 9 n'y a aucun sens : la cible VEUT des 9.
  for (const [, neuf] of PAIRES) {
    assert.equal(PAR_CODE.get(neuf).viser('31031998'), null, `${neuf} sous 31031998`);
    assert.equal(PAR_CODE.get(neuf).viser('1998'), null, `${neuf} sous 1998`);
  }
});

test('★ le cran d’ouverture des variantes avec 9 est lu sur la loi des retouches', () => {
  const cran = premierCranPourRetouches(2);
  assert.equal(raffinagesEnChaine(cran), 2, 'deux retouches à ce cran');
  assert.equal(raffinagesEnChaine(cran - 1), 1, 'une seule au cran d’avant');
  // Aujourd'hui 3 — l'autrice écrivait « à partir du cran 2 » ; c'est la loi
  // qui décide.
  assert.equal(cran, 3);
  for (const [nu, neuf] of PAIRES) {
    const m = PAR_CODE.get(nu);
    const v = PAR_CODE.get(neuf);
    assert.equal(v.desLeCran, Math.max(m.desLeCran, cran), `${neuf} : ouvert avec la chaîne`);
  }
  // Le modèle sans 9 garde son cran : `mad`, `mrd`, `mrdE` cherchent dès le cran 0.
  for (const code of ['mad', 'mrd', 'mrdE']) assert.equal(PAR_CODE.get(code).desLeCran, 0);
});

test('★ notées plus bas que leur modèle, sans être des derniers recours', () => {
  for (const [nu, neuf] of PAIRES) {
    const m = PAR_CODE.get(nu);
    const v = PAR_CODE.get(neuf);
    assert.ok(v.notoriete < m.notoriete, `${neuf} : notoriété sous ${nu}`);
    assert.equal(v.adHoc, m.adHoc, `${neuf} : l’adHoc du modèle`);
    assert.equal(v.cout, m.cout, `${neuf} : le coût du modèle`);
    assert.equal(v.recours || 0, 0, `${neuf} : pas un dernier recours`);
    assert.ok(!v.absorbe, `${neuf} : n’absorbe pas — c’est le demi-tour qui conclut`);
    assert.match(v.code, /^m[0-9a-z]+[A-Z]?$/);
    assert.ok(v.code.length <= 4, `${neuf} : quatre signes au plus`);
    assert.ok(!v.code.startsWith('mr9'), `${neuf} : ne se lit pas « mr9 »`);
  }
});
