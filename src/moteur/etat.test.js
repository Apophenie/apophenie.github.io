/** L'état circulant : constructeurs, gardes de type, traces (CONTRACTS §2.1). */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  str, tokens, nums, num, depuisSaisie, estEtat, estType, taille, signature,
  normaliserTraces, unionTraces, etendue, origineDe, NUM_MIN, NUM_MAX,
} from './etat.js';

test('les quatre formes de l’état', () => {
  assert.equal(str('hope').type, 'STR');
  assert.equal(tokens(['h', 'o']).type, 'TOKENS');
  assert.equal(nums([8, 15]).type, 'NUMS');
  assert.equal(num(44).type, 'NUM');
  for (const e of [str('a'), tokens(['a']), nums([1]), num(1)]) {
    assert.ok(estEtat(e));
    assert.ok(Array.isArray(e.traces), 'traces obligatoire sur chaque état');
    assert.ok(Object.isFrozen(e));
  }
});

test('un état malformé rend null, jamais une exception', () => {
  assert.equal(str(42), null);
  assert.equal(tokens('hope'), null);
  assert.equal(nums(['a']), null);
  assert.equal(num('44'), null);
  assert.equal(num(1.5), null);
  assert.equal(num(NaN), null);
  assert.equal(str('ab', [[[0, 1]]]), null, 'origines de longueur incohérente');
});

test('bornes du NUM : [-10⁶, 10⁶]', () => {
  assert.equal(num(NUM_MAX).valeur, NUM_MAX);
  assert.equal(num(NUM_MIN).valeur, NUM_MIN);
  assert.equal(num(NUM_MAX + 1), null);
  assert.equal(num(NUM_MIN - 1), null);
  assert.equal(nums([1, NUM_MAX + 1]), null);
});

test('traces : normalisation, fusion, étendue', () => {
  assert.deepEqual(normaliserTraces([[3, 5], [0, 2], [1, 3]]), [[0, 5]]);
  assert.deepEqual(normaliserTraces([[2, 2], [5, 1], ['a', 3], null]), []);
  assert.deepEqual(unionTraces([[0, 1]], [[4, 6]]), [[0, 1], [4, 6]]);
  assert.deepEqual(unionTraces([[[0, 1]], [[1, 2]]]), [[0, 2]], 'accepte les listes de listes');
  assert.equal(etendue([[0, 4], [5, 9]]), 8);
});

test('la saisie est normalisée NFC et tracée caractère par caractère', () => {
  const e = depuisSaisie('école');
  assert.equal(e.valeur, 'école');
  assert.equal(taille(e), 5);
  assert.deepEqual(e.traces, [[0, 5]]);
  assert.deepEqual(origineDe(e, 0), [[0, 1]]);
  assert.deepEqual(origineDe(e, 4), [[4, 5]]);
});

test('gardes de type et signature', () => {
  const e = depuisSaisie('hope');
  assert.ok(estType(e, 'STR'));
  assert.ok(!estType(e, 'TOKENS'));
  assert.equal(signature(e), 'STR:hope');
  assert.equal(signature(nums([8, 15])), 'NUMS:8,15');
  assert.equal(signature(num(44)), 'NUM:44');
  assert.equal(signature({}), null);
  assert.equal(taille(num(44)), 1);
});
