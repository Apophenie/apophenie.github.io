/**
 * Mode `prefers-reduced-motion` — traité dans le **compilateur**, pas en CSS
 * (CONTRACTS §6 : les durées WAAPI sont fixées en JS et ignoreraient une règle
 * CSS). Il sert aussi de repli pour les navigateurs sans WAAPI complet
 * (recherche §8, décision 11).
 *
 * Cas limite 7 de CONTRACTS §3.4 : l'automate est **inchangé**. La navigation
 * est déjà discrète par construction.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { SCENARIOS } from '../fixtures/scenarios.js';
import { DUR_REDUCED_STEP, DUR_REDUCED_OP, MIN_STEP_DURATION } from '../constants.js';
import { transition, stepIndexAt } from '../nav.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

test('toutes les animations sont compilées à 1 ms', () => {
  const tl = compile(SCENARIOS.vocabulaire, { reduced: true });
  assert.ok(tl.anims.length > 0);
  for (const a of tl.anims) {
    assert.equal(a.duration, DUR_REDUCED_OP, `${a.id}:${a.prop} dure ${a.duration} ms`);
  }
  for (const d of tl.discrete) assert.equal(d.dur, DUR_REDUCED_OP);
});

test('chaque step dure le temps de lecture prévu (2,5 s)', () => {
  const tl = compile(SCENARIOS.vocabulaire, { reduced: true });
  for (const s of tl.steps) assert.equal(s.duration, DUR_REDUCED_STEP);
  assert.equal(tl.total, DUR_REDUCED_STEP * tl.steps.length);
  assert.ok(DUR_REDUCED_STEP >= MIN_STEP_DURATION);
});

test('toutes les animations d’un step démarrent à sa charnière', () => {
  const tl = compile(SCENARIOS.methode4, { reduced: true });
  const bornes = new Set(tl.bounds);
  for (const a of tl.anims) {
    assert.ok(bornes.has(a.delay), `animation à ${a.delay} ms, hors charnière`);
  }
});

test('cas limite 7 — l’automate est inchangé en mode réduit', () => {
  const tl = compile(SCENARIOS.methode4, { reduced: true });
  const state = (t) => ({ t, playing: false, bounds: tl.bounds, total: tl.total });
  assert.deepEqual(transition('next', state(0)), { pause: true, seek: tl.bounds[1] });
  assert.deepEqual(transition('prev', state(tl.bounds[1])), { pause: true, seek: 0 });
  assert.deepEqual(transition('toEnd', state(0)), { pause: true, seek: tl.total });
  assert.equal(stepIndexAt(tl.bounds, tl.bounds[2]), 2);
});

test('le mode réduit conserve exactement les mêmes steps et le même contenu', () => {
  const normal = compile(SCENARIOS.methode5);
  const reduit = compile(SCENARIOS.methode5, { reduced: true });
  assert.deepEqual(
    normal.steps.map((s) => [s.id, s.title, s.caption]),
    reduit.steps.map((s) => [s.id, s.title, s.caption]),
    'le Registre textuel est identique dans les deux modes',
  );
  assert.equal(normal.nodes.length, reduit.nodes.length);
  assert.equal(normal.anims.length, reduit.anims.length);
});

test('le mode réduit reste déterministe sous `speed`', () => {
  const a = compile(SCENARIOS.methode4, { reduced: true, speed: 2 });
  assert.equal(a.total, (DUR_REDUCED_STEP / 2) * a.steps.length);
});

test('les valeurs d’arrivée sont identiques dans les deux modes', () => {
  const normal = compile(SCENARIOS.methode4);
  const reduit = compile(SCENARIOS.methode4, { reduced: true });
  const finales = (tl) => {
    const m = new Map();
    for (const a of [...tl.anims].sort((x, y) => x.delay - y.delay)) {
      m.set(`${a.id}::${a.prop}`, JSON.stringify(a.keyframes[a.keyframes.length - 1].value));
    }
    return [...m.entries()].sort();
  };
  assert.deepEqual(finales(normal), finales(reduit), 'même état final, seule la durée change');
});
