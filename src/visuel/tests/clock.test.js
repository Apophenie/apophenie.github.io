/**
 * Canal discret : idempotence du scrubbing.
 *
 * `seek(t)` doit donner exactement le même rendu quel que soit le chemin
 * parcouru pour y arriver — y compris en marche arrière.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { indexDiscrete, resolveDiscrete, createTicker } from '../clock.js';
import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { SCENARIOS } from '../fixtures/scenarios.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const entries = [
  { key: 'r::text', id: 'r', channel: 'text', at: 100, dur: 200, render: (u) => `A${Math.round(u * 100)}` },
  { key: 'r::text', id: 'r', channel: 'text', at: 500, dur: 100, render: (u) => `B${Math.round(u * 100)}` },
  { key: 'q::text', id: 'q', channel: 'text', at: 0, dur: 50, render: () => 'Q' },
];

test('avant le premier enregistrement, le canal reste à sa valeur de base', () => {
  const idx = indexDiscrete(entries);
  const r = resolveDiscrete(idx, 50);
  assert.equal(r.has('r::text'), false);
  assert.equal(r.get('q::text').value, 'Q');
});

test('seul le dernier enregistrement commencé avant t compte', () => {
  const idx = indexDiscrete(entries);
  assert.equal(resolveDiscrete(idx, 200).value ?? resolveDiscrete(idx, 200).get('r::text').value, 'A50');
  assert.equal(resolveDiscrete(idx, 400).get('r::text').value, 'A100', 'après la fin, u vaut 1');
  assert.equal(resolveDiscrete(idx, 550).get('r::text').value, 'B50');
  assert.equal(resolveDiscrete(idx, 9999).get('r::text').value, 'B100');
});

test('idempotence : le rendu ne dépend pas du chemin parcouru', () => {
  const idx = indexDiscrete(entries);
  const direct = resolveDiscrete(idx, 250).get('r::text').value;
  // même instant atteint « en marche arrière »
  resolveDiscrete(idx, 900);
  resolveDiscrete(idx, 0);
  const retour = resolveDiscrete(idx, 250).get('r::text').value;
  assert.equal(direct, retour);
});

test('sur un scénario réel, tout aller-retour redonne le même état discret', () => {
  const tl = compile(SCENARIOS.methode4);
  const sample = (t) => JSON.stringify([...resolveDiscrete(tl.discreteIndex, t)].map(([k, v]) => [k, v.value]));
  const times = [0, 500, 2000, tl.total / 2, tl.total - 1, tl.total];
  const aller = times.map(sample);
  const retour = [...times].reverse().map(sample).reverse();
  assert.deepEqual(aller, retour);
});

test('les enregistrements sont indexés par canal et triés par instant', () => {
  const idx = indexDiscrete([...entries].reverse());
  assert.deepEqual(idx.get('r::text').map((e) => e.at), [100, 500]);
});

test('createTicker n’exige pas requestAnimationFrame', () => {
  const t = createTicker(() => {}, {});
  assert.equal(t.running, false);
  t.start();
  assert.equal(t.running, false, 'sans rAF, le ticker reste inerte plutôt que de planter');
  t.stop();
});

test('createTicker boucle tant qu’il n’est pas arrêté', () => {
  let calls = 0;
  const queue = [];
  const env = {
    requestAnimationFrame: (fn) => { queue.push(fn); return queue.length; },
    cancelAnimationFrame: () => {},
  };
  const ticker = createTicker(() => { calls++; }, env);
  ticker.start();
  for (let i = 0; i < 3 && queue.length; i++) queue.shift()();
  assert.equal(calls, 3);
  ticker.stop();
  const pending = queue.shift();
  if (pending) pending();
  assert.equal(calls, 3, 'après stop, plus aucun appel');
});
