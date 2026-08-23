/**
 * Les primitives refondues et les deux primitives ajoutées.
 *
 * On vérifie ici ce qui se voit — la mécanique, pas seulement la compilation :
 * qu'un filtre efface AVANT de rapprocher, qu'une accolade porte son symbole,
 * qu'un compteur monte d'un cran par élément allumé, et que les trois contrôles
 * croisés (segments, tracé, réglette) refusent d'afficher un nombre qu'ils ne
 * montrent pas.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { alphabetValue, alphabetGeometry, ALPHABET } from '../assets.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);

// ───────────────────────────── 1. le filtre en deux temps

test('drop « erase » : on efface sur place, sans déplacer ni rapprocher', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On ne garde que les voyelles',
    ops: [{ op: 'drop', targets: ['t0', 't2'], mode: 'erase', regroup: false }],
  }], lettres('hope')));

  // Ce qui part s'efface : opacité et rien d'autre qui le fasse voyager.
  assert.ok(animsDe(tl, 't0', 'opacity').length, 'le token effacé perd son opacité');
  assert.equal(animsDe(tl, 't0', 'translate').length, 0, 'il ne tombe pas, il s’efface');
  // Ce qui reste ne bouge pas encore : le rapprochement est un autre temps.
  assert.equal(animsDe(tl, 't1', 'translate').length, 0, 'les survivants restent en place');
  assert.equal(animsDe(tl, 't3', 'translate').length, 0);

  // Et l'effacement est bien SÉQUENTIEL : le second part après le premier.
  const [a, b] = ['t0', 't2'].map((id) => animsDe(tl, id, 'opacity')[0].delay);
  assert.ok(b > a, 'un caractère à la fois, pas tous d’un bloc');
});

test('le second temps rapproche ce qui reste — et lui seul', () => {
  const tl = compile(sc([
    { id: 'a', title: 'On ne garde que les voyelles', ops: [{ op: 'drop', targets: ['t0', 't2'], mode: 'erase', regroup: false }] },
    { id: 'b', title: 'On rapproche ce qui reste', ops: [{ op: 'move' }] },
  ], lettres('hope')));

  const bouges = tl.anims.filter((a) => a.prop === 'translate');
  assert.ok(bouges.length, 'les survivants se rapprochent');
  for (const a of bouges) {
    assert.ok(a.delay >= tl.bounds[1], 'et pas avant la charnière : c’est un temps à part');
    assert.ok(['t1', 't3'].includes(a.id), 'seuls les survivants bougent');
  }
});

test('un filtre ne surligne pas ce qu’il garde : la disparition suffit', () => {
  const tl = compile(sc([
    { id: 'a', title: 'filtre', ops: [{ op: 'drop', targets: ['t0'], mode: 'erase', regroup: false }] },
    { id: 'b', title: 'rapprochement', ops: [{ op: 'move' }] },
  ], lettres('hope')));
  assert.ok(!tl.nodes.some((n) => n.role === 'halo'), 'aucun halo posé par un filtre');
});

// ───────────────────────────── 2. le découpage en sous-groupes

test('partition : une accolade numérotée par groupe, et les tags posés', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On découpe en sous-groupes',
    ops: [{
      op: 'partition',
      groups: [
        { targets: ['t0', 't1'], tag: 'g0', label: 'groupe 1' },
        { targets: ['t2', 't3'], tag: 'g1', label: 'groupe 2' },
      ],
    }],
  }], lettres('hope')));

  const accolades = tl.nodes.filter((n) => n.role === 'bracket');
  assert.equal(accolades.length, 2, 'une accolade par groupe');
  const etiquettes = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.deepEqual(etiquettes, ['groupe 1', 'groupe 2']);
  assert.equal(tl.scene.get('t0').group, 'g0');
  assert.equal(tl.scene.get('t3').group, 'g1');
});

test('partition : découper en un seul morceau, ou recouvrir, est refusé', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'partition', groups: [{ targets: ['t0', 't1'] }] }],
  }], lettres('hope'))), /au moins DEUX groupes/);

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [{ targets: ['t0', 't1'] }, { targets: ['t1', 't2'] }] }],
  }], lettres('hope'))), /figure dans deux groupes/);
});

// ───────────────────────────── 3. l'accolade des sommes

test('l’accolade porte son symbole, et le résultat naît sous sa pointe', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }];
  const tl = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [{ op: 'sum', targets: ['n0', 'n1'], to: { id: 'r', text: '23' }, symbol: 'Σ' }],
  }], tokens));

  const sigma = tl.nodes.find((n) => n.role === 'label' && n.text === 'Σ');
  assert.ok(sigma, 'le symbole d’opération est écrit');
  const accolade = tl.nodes.find((n) => n.role === 'bracket');
  assert.ok(accolade, 'les sources sont dans une accolade');

  // Le résultat paraît SOUS la pointe, donc plus bas que les opérandes et que
  // le symbole, puis remonte dans la ligne.
  const depart = tl.scene.get('r').base.translate;
  const ligne = tl.scene.pos('n0');
  assert.ok(depart.y > ligne.y, 'le résultat naît sous la ligne des opérandes');
  assert.ok(depart.y > tl.scene.pos(sigma.id).y, 'et sous le symbole');
  const remontee = animsDe(tl, 'r', 'translate');
  assert.ok(remontee.length >= 1, 'puis il remonte prendre la place des opérandes');
  assert.ok(remontee[remontee.length - 1].keyframes.at(-1).value.y < depart.y);
});

test('un comptage dit ce qu’il compte : symbole ET règle en toutes lettres', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On compte les lettres',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], symbol: '#', label: 'On compte les lettres' }],
  }], lettres('hope')));
  const textes = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.deepEqual(textes, ['#', 'On compte les lettres']);
});

// ───────────────────────────── 4. la réglette alphabétique

test('alphabet : la réglette montre les 26 lettres et leur rang', () => {
  const geo = alphabetGeometry();
  assert.equal(geo.cells.length, 26);
  assert.deepEqual(geo.cells.map((c) => c.char).join(''), ALPHABET);
  assert.deepEqual(geo.cells.map((c) => c.rang), Array.from({ length: 26 }, (_, i) => i + 1));
  assert.equal(alphabetValue('h'), 8);
  assert.equal(alphabetValue('h', 'z26a1'), 19);
  assert.equal(alphabetValue('é'), null, 'un caractère hors alphabet ne vaut rien');
});

test('alphabet : la lettre va vers sa case, le rang en redescend', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Chaque lettre vaut son rang',
    ops: [{ op: 'alphabet', target: 't0', to: { id: 'r8', text: '8' } }],
  }], lettres('hope')));

  assert.ok(tl.nodes.some((n) => n.role === 'alphabet'), 'la réglette est montrée');
  assert.ok(tl.anims.some((a) => a.id === '@camera'), 'la caméra recule pour la cadrer');

  const geo = alphabetGeometry();
  const caseH = geo.cells.find((c) => c.char === 'H');
  const vol = animsDe(tl, 't0', 'translate').at(-1).keyframes.at(-1).value;
  const board = tl.scene.pos('@abc:t0');
  assert.ok(Math.abs(vol.x - (board.x + caseH.cx)) < 0.5, 'la lettre atterrit sur SA case');

  const naissance = tl.scene.get('r8').base.translate;
  assert.ok(Math.abs(naissance.y - (board.y + caseH.rangCy)) < 0.5, 'le rang part du rang, pas de la lettre');
});

test('alphabet : contrôle croisé — le rang montré fait foi', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'alphabet', target: 't0', to: { id: 'faux', text: '7' } }],
  }], lettres('hope'))), /la réglette montre 8/);
});

test('alphabet : un caractère hors alphabet dégrade sans réglette', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'alphabet', target: 's0', to: { id: 'x', text: '6' } }],
  }], [{ id: 's0', text: '-', kind: 'sep' }]));
  assert.ok(!tl.nodes.some((n) => n.role === 'alphabet'), 'aucune réglette');
  assert.ok(!tl.anims.some((a) => a.id === '@camera'), 'aucune caméra');
  assert.ok(tl.nodes.some((n) => n.id === 'x'), 'la substitution a tout de même lieu');
});

// ───────────────────────────── 5 et 6. l'encart de comptage

const encartDe = (tl, id) => tl.nodes.find((n) => n.id === `@encart:${id}`);
const compteurDe = (tl, id) => tl.nodes.find((n) => n.id === `@compteur:${id}`);

test('sevenSeg : encart, compteur, allumage un à un, puis substitution', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Traits continus de l’afficheur',
    ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', count: 3, to: { id: 'trois', text: '3' } }],
  }], lettres('hope')));

  assert.ok(encartDe(tl, 't0'), 'la lettre est montée dans un encart');
  assert.ok(animsDe(tl, 't0', 'translate').length, 'elle s’y est déplacée');
  assert.ok(animsDe(tl, 't0', 'scale').some((a) => a.keyframes.at(-1).value > 1), 'et y a grandi');

  const compteur = compteurDe(tl, 't0');
  assert.ok(compteur && compteur.text === '0', 'le compteur part de zéro');
  const suite = tl.discrete.find((d) => d.id === compteur.id);
  assert.deepEqual([0, 0.5, 1].map((u) => suite.render(u)), ['1', '2', '3'], 'un cran par trait allumé');

  // Les segments s'allument l'un après l'autre, jamais tous ensemble.
  const allumages = ['b', 'c', 'e', 'f', 'g']
    .map((k) => animsDe(tl, `@seg:t0:${k}`, 'opacity').find((a) => a.keyframes.at(-1).value === 1).delay);
  assert.equal(new Set(allumages).size, 3, 'trois instants d’allumage — les traits fusionnés');
  const eteints = ['a', 'd'].map((k) => animsDe(tl, `@seg:t0:${k}`, 'opacity'));
  assert.ok(eteints.every((l) => !l.some((a) => a.keyframes.at(-1).value === 1)),
    'les segments éteints restent en fantôme');

  assert.ok(tl.nodes.some((n) => n.id === 'trois'), 'le nombre du compteur remplace la lettre');
  assert.equal(tl.scene.get('t0').alive, false);
});

test('sevenSeg : contrôle croisé sur ce qui est allumé ET sur le nombre rendu', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', count: 5 }],
  }], lettres('hope'))), /l’afficheur en montre 3/);

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', to: { id: 'z', text: '9' } }],
  }], lettres('hope'))), /le compteur s'arrête à 3/);
});

test('countStrokes : les trois modes tiennent la même grammaire', () => {
  for (const [mode, attendu] of [['traits', 3], ['extremites', 4], ['boucles', 0]]) {
    const tl = compile(sc([{
      id: 'a', title: 'A',
      ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode, count: attendu, to: { id: `n_${mode}`, text: String(attendu) } }],
    }], lettres('HOPE')));
    assert.ok(encartDe(tl, 't0'), `${mode} : encart`);
    const compteur = compteurDe(tl, 't0');
    assert.ok(compteur, `${mode} : compteur`);
    assert.equal(compteur.text, '0', `${mode} : il part de zéro`);
    const suite = tl.discrete.find((d) => d.id === compteur.id);
    if (attendu === 0) {
      assert.equal(suite, undefined, 'un compteur qui reste à zéro n’égrène rien');
    } else {
      assert.equal(suite.render(1), String(attendu), `${mode} : il s’arrête sur le compte`);
    }
    assert.ok(tl.nodes.some((n) => n.id === `n_${mode}`), `${mode} : substitution`);
  }
});

test('countStrokes : les extrémités s’allument une par une', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode: 'extremites', count: 4 }],
  }], lettres('HOPE')));
  const marqueurs = tl.nodes.filter((n) => n.role === 'marker');
  assert.equal(marqueurs.length, 4, 'un marqueur par pointe libre');
  const instants = marqueurs.map((n) => animsDe(tl, n.id, 'scale')[0].delay);
  assert.equal(new Set(instants).size, 4, 'quatre instants distincts');
});

test('countStrokes : le comptage annoncé reste redérivé du tracé dessiné', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode: 'traits', count: 4 }],
  }], lettres('HOPE'))), /le tracé de référence en donne 3/);
});

// ───────────────────────────── 7. les signes de l'opération

test('insertOperators : un signe par interstice quand l’émetteur les liste', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }, { id: 'n2', text: '16' }];
  const tl = compile(sc([{
    id: 'a', title: 'Alternance',
    ops: [{ op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '−', glyphs: ['−', '+'], ids: ['s0', 's1'] }],
  }], tokens));
  assert.deepEqual(['s0', 's1'].map((id) => tl.scene.get(id).text), ['−', '+'],
    'la somme alternée ne doit pas s’écrire comme une soustraction en chaîne');

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '+', glyphs: ['+'] }],
  }], tokens)), /exactement 2 signe/);
});

test('les signes déclarés par l’émetteur s’en vont avec la somme', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }];
  const tl = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1'], glyph: '+', ids: ['s0'] },
      { op: 'sum', targets: ['n0', 'n1'], consume: ['s0'], to: { id: 'r', text: '23' }, at: 800 },
    ],
  }], tokens));
  assert.equal(tl.scene.get('s0').alive, false, 'le « + » ne survit pas au calcul');
  assert.equal(tl.scene.flow.includes('s0'), false);
  assert.ok(animsDe(tl, 's0', 'opacity').some((a) => a.keyframes.at(-1).value === 0));
});
