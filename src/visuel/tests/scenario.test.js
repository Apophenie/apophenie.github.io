/**
 * Les 8 invariants du scénario (CONTRACTS §3, §7.1).
 * Chaque violation doit produire une CompileError au message explicite.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { validateScenario, assertPure } from '../scenario.js';
import { CompileError } from '../errors.js';
import { OP_NAMES } from '../constants.js';

const base = () => ({
  version: 1,
  tokens: [{ id: 't0', text: 'h', kind: 'letter' }],
  steps: [{ id: 's0', title: 'Titre', ops: [{ op: 'wait' }] }],
});

const boom = (mutate, pattern) => {
  const sc = base();
  mutate(sc);
  assert.throws(() => validateScenario(sc), (err) => {
    assert.ok(err instanceof CompileError, `CompileError attendue, reçu ${err.name}`);
    assert.match(err.message, pattern, `message inattendu : ${err.message}`);
    return true;
  });
};

test('un scénario conforme passe', () => {
  const res = validateScenario(base());
  assert.deepEqual([...res.tokenIds], ['t0']);
  assert.deepEqual([...res.stepIds], ['s0']);
});

test('invariant 1 — version === 1', () => {
  boom((s) => { s.version = 2; }, /version attendue 1/);
  boom((s) => { delete s.version; }, /version attendue 1/);
});

test('invariant 2 — id de token uniques, non vides, sans préfixe réservé', () => {
  boom((s) => { s.tokens.push({ id: 't0', text: 'x' }); }, /dupliqué/);
  boom((s) => { s.tokens[0].id = ''; }, /identifiant manquant ou vide/);
  boom((s) => { s.tokens[0].id = '@camera'; }, /préfixe .*réservé/);
  boom((s) => { s.tokens[0].text = 42; }, /« text » doit être une chaîne/);
  boom((s) => { s.tokens[0].kind = 'planète'; }, /hors vocabulaire/);
});

test('invariant 5 — au moins un step, id unique, titre non vide', () => {
  boom((s) => { s.steps = []; }, /au moins un step/);
  boom((s) => { s.steps.push({ id: 's0', title: 'x' }); }, /dupliqué/);
  boom((s) => { s.steps[0].title = '   '; }, /« title » non vide/);
  boom((s) => { s.steps[0].duration = -5; }, /≥ 0/);
});

test('invariant 7 — le vocabulaire est fermé : un op inconnu est une erreur', () => {
  boom((s) => { s.steps[0].ops = [{ op: 'morph' }]; }, /hors du vocabulaire fermé/);
  boom((s) => { s.steps[0].ops = [{}]; }, /champ « op » manquant/);
  // le message doit énumérer les 17 primitives
  const sc = base();
  sc.steps[0].ops = [{ op: 'morph' }];
  try { validateScenario(sc); } catch (err) {
    for (const n of OP_NAMES) assert.ok(err.message.includes(n), `« ${n} » absent du message d’erreur`);
  }
});

test('invariant 8 — le scénario est pur : ni fonction, ni DOM, ni cycle', () => {
  boom((s) => { s.steps[0].ops[0].render = () => 1; }, /fonction/);
  boom((s) => { s.tokens[0].node = { nodeType: 1 }; }, /DOM interdite/);
  boom((s) => { s.tokens[0].when = new Date(); }, /objets simples/);
  boom((s) => { s.tokens[0].n = Infinity; }, /sérialisable/);
  const cyclic = base();
  cyclic.tokens[0].self = cyclic.tokens[0];
  assert.throws(() => validateScenario(cyclic), /circulaire/);
});

test('assertPure accepte ce que JSON accepte', () => {
  assert.doesNotThrow(() => assertPure({ a: 1, b: 'x', c: [1, 2, { d: null }], e: true }));
  assert.throws(() => assertPure(new Map()), /objets simples/);
  assert.throws(() => assertPure(Symbol('x')), /symbol/);
});

test('les champs temporels des ops sont validés', () => {
  boom((s) => { s.steps[0].ops[0].at = -1; }, /≥ 0/);
  boom((s) => { s.steps[0].ops[0].dur = 'vite'; }, /≥ 0/);
  boom((s) => { s.steps[0].ops[0].ease = 12; }, /chaîne CSS/);
});
