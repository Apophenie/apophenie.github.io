import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../compile.js';
import { CATALOGUE, appliquer } from '../../moteur/catalogue.js';
import { str } from '../../moteur/etat.js';
import { tokens } from '../../moteur/etat.js';

function scenario(disposition, texte = 'ABC') {
  const entries = disposition === 'glissiere'
    ? [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((char, i) => ({ char, value: 'EFGHIJKLMNOPQRSTUVWXYZABCD'[i] }))
    : [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((char, i) => ({ char, value: disposition === 'pave' ? Number('22233344455566677778889999'[i]) : i + 1 }));
  return { version: 1, tokens: [...texte].map((text, i) => ({ id: `t${i}`, text })),
    steps: [...texte].map((letter, i) => ({ id: `s${i}`, title: 'Conversion', ops: [{
      op: 'table', disposition, entries, letter, target: `t${i}`, to: { id: `n${i}`, text: String(entries.find((e) => e.char === letter).value) },
      montre: i === 0, retire: i === texte.length - 1,
    }] })) };
}

test('toutes les lettres partent à 100 ms d’écart après le déploiement unique de leur table', () => {
  for (const disposition of ['reglette', 'glissiere', 'pave']) {
    const s = scenario(disposition, 'ABAZ');
    const tl = compile(s, { rythme: 'simultane' });
    assert.deepEqual(tl.warnings, [], disposition);
    const vols = s.tokens.map((t) => tl.anims.filter((a) => a.id === t.id && a.prop === 'translate').at(-1));
    for (let i = 1; i < vols.length; i++) assert.equal(vols[i].delay - vols[i - 1].delay, 100);
    const board = tl.nodes.find((n) => n.role === 'table');
    assert.equal(tl.anims.filter((a) => a.id === board.id && a.prop === 'opacity').length, 2, 'un déploiement, un retrait');
    assert.deepEqual(tl.scene.flow, ['n0', 'n1', 'n2', 'n3']);
    const pas = compile(s, { rythme: 'pasAPas' });
    assert.ok(pas.total > tl.total);
    assert.deepEqual(compile(s, { reduced: true, rythme: 'simultane' }).scene.flow, ['n0', 'n1', 'n2', 'n3']);
  }
});

for (const code of ['mqwc', 'mazc']) test(`${code} partage un seul clavier en simultané et conserve toutes les conversions`, () => {
  const op = CATALOGUE.find((o) => o.code === code);
  const texte = 'hope', avant = tokens([...texte]);
  const ids = [...texte].map((_, i) => `c${i}`);
  const s = { version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })),
    steps: op.steps(avant, appliquer(op, avant), { ids, cle: code, langue: 'fr' }) };
  const sim = compile(s, { rythme: 'simultane' });
  const pas = compile(s, { rythme: 'pasAPas' });
  assert.deepEqual(sim.warnings, []);
  assert.deepEqual(sim.steps.map((step) => step.id), s.steps.map((step) => step.id));
  assert.deepEqual(sim.scene.flow.map((id) => sim.scene.get(id).text),
    pas.scene.flow.map((id) => pas.scene.get(id).text));
  const clavier = sim.nodes.find((n) => n.role === 'keyboard');
  assert.equal(sim.anims.filter((a) => a.id === clavier.id && a.prop === 'opacity').length, 2);
  const vols = ids.map((id) => sim.anims.filter((a) => a.id === id && a.prop === 'translate').at(-1));
  for (let i = 1; i < vols.length; i++) assert.equal(vols[i].delay - vols[i - 1].delay, 100);
  assert.ok(sim.total < pas.total);
});

test('le compteur de César finit avant la vague de conversions, puis son titre disparaît', () => {
  const op = CATALOGUE.find((o) => o.code === 'fj4'), a = str('Test'), ids = ['a', 'b', 'c', 'd'];
  const s = { version: 1, tokens: [...a.valeur].map((text, i) => ({ id: ids[i], text })),
    steps: op.steps(a, appliquer(op, a), { ids, cle: 'c', langue: 'fr' }) };
  const tl = compile(s, { rythme: 'simultane' });
  assert.deepEqual(tl.warnings, []);
  const vols = ids.map((id) => tl.anims.filter((a) => a.id === id && a.prop === 'translate').at(-1));
  for (let i = 1; i < vols.length; i++) assert.equal(vols[i].delay - vols[i - 1].delay, 100);
  const egal = tl.nodes.find((n) => n.data?.cesarRole === 'egalite');
  assert.ok(vols[0].delay > tl.discrete.find((d) => d.id === egal.id).at);
});

test('les tables de restes partagent un volet fixe pour les conversions visibles ensemble', () => {
  const entries = Array.from({ length: 110 }, (_, i) => ({ char: String(i), value: i % 10 }));
  const texte = ['30', '41', '52'];
  const s = { version: 1, tokens: texte.map((text, i) => ({ id: `t${i}`, text })),
    steps: texte.map((letter, i) => ({ id: `s${i}`, title: 'Reste', ops: [{ op: 'table', disposition: 'modulo',
      entries, colonnes: 10, target: `t${i}`, letter, to: { id: `n${i}`, text: String(Number(letter) % 10) },
      montre: i === 0, retire: i === 2,
    }] })) };
  const tl = compile(s, { rythme: 'simultane' });
  assert.deepEqual(tl.warnings, []);
  const vols = s.tokens.map((t) => tl.anims.filter((a) => a.id === t.id && a.prop === 'translate').at(-1));
  assert.equal(vols[1].delay - vols[0].delay, 100);
  assert.equal(vols[2].delay - vols[1].delay, 100);
  assert.equal(tl.anims.filter((a) => a.prop === 'roue').length, 1);
});
