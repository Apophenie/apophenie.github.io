/**
 * ★ L'EXPLOSION DU 6 SURNUMÉRAIRE — ce qui doit rester vrai du geste.
 *
 * > « C'est durant le verdict, une fois les 6 collés les uns contre les autres,
 * > que le 6 central devrait disparaître par explosion pour propulser les deux
 * > triptyques dans leur agrandissement. » (l'auteur)
 *
 * Trois choses se mesurent ici, et ce sont exactement les trois que la phrase
 * demande — dans cet ordre :
 *
 *  1. **collés les uns contre les autres** : le surnuméraire compte dans le
 *     rassemblement. Sept 6 à écart constant, puis six ;
 *  2. **par explosion** : il ne tombe pas, il se dilate et s'efface, et le
 *     souffle qui l'accompagne est un TRACÉ, fonction pure du temps ;
 *  3. **pour propulser** : l'agrandissement part à l'instant exact de
 *     l'explosion. Pas après, pas avant — la causalité s'écrit dans les
 *     horloges.
 *
 * ★ Et une quatrième, qui n'est dans aucune phrase mais sans laquelle les trois
 * autres ne vaudraient rien : **le verdict arrive AU MÊME ENDROIT** qu'un
 * verdict qui n'aurait jamais eu de 6 en trop. Un geste de mise en scène qui
 * déplacerait la chute ne serait pas une mise en scène, ce serait un bug.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { souffleD } from '../primitives/explosion.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const six = (id) => ({ id, text: '6', kind: 'digit' });
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);

/** Les six révélés, dans l'ordre de lecture. */
const REVELES = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'];

/**
 * Sept 6 sur la ligne — trois, le surnuméraire, trois — plus un rebut en queue.
 *
 * Le rebut n'est pas décoratif : un verdict n'arrive jamais sur une scène vide,
 * et c'est son départ qui laisse la place au rassemblement (même raison que
 * dans `primitives.test.js`).
 */
function verdictSurnumeraire(options = {}) {
  const tokens = [six('d0'), six('d1'), six('d2'), six('s0'),
    six('d3'), six('d4'), six('d5'), { id: 'r0', text: 'x', kind: 'letter' }];
  return compile(sc([{
    id: 'v', title: 'Le verdict',
    ops: [{ op: 'reveal', targets: REVELES, surnumeraires: ['s0'] }],
  }], tokens), options);
}

/** Le même verdict, mais sans 6 en trop : le témoin. */
function verdictTemoin() {
  const tokens = [...REVELES.map(six), { id: 'r0', text: 'x', kind: 'letter' }];
  return compile(sc([{
    id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: REVELES }],
  }], tokens));
}

// ───────────────────── 1. le dessin, fonction pure du temps

test('★ souffle — le tracé ne montre rien au départ, rien à l’arrivée, neuf éclats entre', () => {
  const m = { rayon: 100, longueur: 30, demiLargeur: 7 };
  // Au départ tout est au centre, à l'arrivée tout s'est consumé : dans les
  // deux cas la primitive rend un tracé DÉGÉNÉRÉ plutôt qu'une chaîne vide —
  // un `d` absent ferait disparaître l'élément pour le compositeur, et le canal
  // discret n'aurait plus rien à réécrire.
  assert.equal(souffleD(0, m), 'M 0 0 Z');
  assert.equal(souffleD(1, m), 'M 0 0 Z');
  const milieu = souffleD(0.5, m);
  assert.equal((milieu.match(/M /g) || []).length, 9, 'neuf éclats, un sous-tracé chacun');
  assert.equal((milieu.match(/Z/g) || []).length, 9, 'et chacun est un contour FERMÉ');
});

test('★ souffle — les éclats s’éloignent, et deux lectures rendent la même image', () => {
  const m = { rayon: 100, longueur: 30, demiLargeur: 7 };
  /** La distance du point le plus lointain du tracé au centre. */
  const portee = (d) => Math.max(...[...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)]
    .map(([, x, y]) => Math.hypot(Number(x), Number(y))));
  let precedent = 0;
  for (const u of [0.15, 0.3, 0.5, 0.7, 0.9]) {
    const p = portee(souffleD(u, m));
    assert.ok(p > precedent, `à u=${u} la portée retombe (${p} ≤ ${precedent})`);
    precedent = p;
  }
  // Fonction du temps et de rien d'autre (CONTRACTS §4.4) : un `Math.random()`
  // aurait donné une explosion différente à chaque lecture, donc un scrubbing
  // qui ne retombe jamais sur la même image.
  assert.equal(souffleD(0.42, m), souffleD(0.42, m));
});

// ───────────────────── 2. les trois temps du verdict

test('★ explosion — sept 6 se rassemblent, six s’agrandissent', () => {
  const tl = verdictSurnumeraire();
  assert.deepEqual(tl.warnings, []);

  // Le rassemblement : une première fenêtre de trajet, commune aux sept.
  const gather = (id) => animsDe(tl, id, 'translate')[0];
  const fenetre = `${gather('d0').delay}|${gather('d0').duration}`;
  for (const id of [...REVELES, 's0']) {
    assert.equal(`${gather(id).delay}|${gather(id).duration}`, fenetre,
      `« ${id} » ne se rassemble pas avec les autres`);
  }
  // …et à écart CONSTANT : c'est ce que « collés les uns contre les autres »
  // veut dire. On lit l'arrivée de ce premier trajet, pas la place finale.
  const xs = [...REVELES.slice(0, 3), 's0', ...REVELES.slice(3)]
    .map((id) => gather(id).keyframes.at(-1).value.x);
  const e = xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 100) / 100);
  assert.equal(new Set(e).size, 1, `écarts ${e} — les sept 6 doivent être jointifs`);

  // Le surnuméraire ne fait QUE se rassembler : il n'a pas de second trajet,
  // puisqu'il n'est plus là pour le faire.
  assert.equal(animsDe(tl, 's0', 'translate').length, 1);
  assert.equal(animsDe(tl, 'd0', 'translate').length, 2, 'les révélés, eux, repartent');
  assert.equal(tl.scene.get('s0').alive, false, 'le 6 de trop a quitté la scène');
  assert.deepEqual(tl.scene.flow, REVELES, 'et la ligne finale ne porte que le verdict');
});

test('★ explosion — elle PROPULSE : l’agrandissement part au même instant', () => {
  const tl = verdictSurnumeraire();
  const propulsion = animsDe(tl, 'd0', 'translate')[1];
  const grossir = animsDe(tl, 'd0', 'scale')[0];
  const dilatation = animsDe(tl, 's0', 'scale')[0];

  assert.equal(grossir.delay, propulsion.delay, 'les chiffres grossissent en s’écartant');
  assert.equal(dilatation.delay, propulsion.delay,
    'le 6 de trop explose à l’instant où les triptyques partent — c’est toute la demande');
  // Et il ne tombe pas : aucune chute, aucun voyage. Il se dilate sur place.
  assert.ok(dilatation.keyframes.at(-1).value > 2, 'il se dilate franchement');
  assert.equal(animsDe(tl, 's0', 'opacity').at(-1).keyframes.at(-1).value, 0);
  // L'explosion est consumée avant que la scène ne s’immobilise : des éclats
  // qui retomberaient après l’arrivée accompagneraient la chute au lieu de la
  // déclencher.
  assert.ok(dilatation.delay + dilatation.duration < propulsion.delay + propulsion.duration,
    'les éclats sont retombés quand le 666 finit de grandir');
});

test('★ explosion — le verdict arrive exactement là où il serait arrivé sans elle', () => {
  const avec = verdictSurnumeraire();
  const sans = verdictTemoin();
  const places = (tl) => REVELES.map((id) => Math.round(tl.scene.pos(id).x * 100) / 100);
  assert.deepEqual(places(avec), places(sans),
    'un geste de mise en scène ne déplace pas la chute');
  assert.equal(
    animsDe(avec, 'd0', 'scale').at(-1).keyframes.at(-1).value,
    animsDe(sans, 'd0', 'scale').at(-1).keyframes.at(-1).value,
    'ni ne change son agrandissement',
  );
});

/**
 * ★ ET LE TROU QU'IL LAISSE **EST** LA SÉPARATION — au centième d'unité.
 *
 * C'est ce qui justifie qu'il n'y ait pas de troisième temps de découpage, et
 * ce n'est pas une heureuse coïncidence : le verdict ouvre entre deux séries
 * « exactement un blanc » (`reveal.js › videDeSerie` : deux écarts et une
 * chasse), soit DEUX pas de centre à centre. Or le 6 de trop, dans le
 * rassemblement, sépare ses voisins d'exactement deux pas — puisqu'il en occupe
 * un. Le vide n'a donc pas à être creusé, il n'a qu'à ne pas se refermer.
 *
 * ⚠ L'égalité est exacte pour UN surnuméraire. À deux, le trou vaut trois pas
 * pour deux demandés, et les triptyques se rapprochent un peu en grossissant :
 * l'auteur a prévu le cas (« celui — ou les deux — du centre »), la scène le
 * joue, et personne n'a prétendu que la géométrie y serait aussi jolie.
 */
test('★ explosion — la place du 6 de trop est celle du blanc entre les séries', () => {
  const tl = verdictSurnumeraire();
  const gather = (id) => animsDe(tl, id, 'translate')[0].keyframes.at(-1).value.x;
  // Ce que le surnuméraire occupait, en unités NOMINALES (le rassemblement se
  // fait à l'échelle 1).
  const occupe = gather('d3') - gather('d2');
  const pas = gather('d1') - gather('d0');
  assert.ok(Math.abs(occupe - 2 * pas) < 0.01, 'il occupe un pas, donc il en sépare deux');

  // Ce que le verdict ouvre, ramené à l'échelle nominale.
  const grow = animsDe(tl, 'd0', 'scale').at(-1).keyframes.at(-1).value;
  const xs = REVELES.map((id) => tl.scene.pos(id).x);
  const vide = (xs[3] - xs[2]) / grow;
  const serre = (xs[1] - xs[0]) / grow;

  assert.ok(Math.abs(serre - pas) < 0.01, 'l’écart courant ne change pas');
  assert.ok(Math.abs(vide - occupe) < 0.01,
    `le blanc du verdict vaut ${vide}, la place libérée ${occupe} — c’est la MÊME`);
});

// ───────────────────── 3. le partage des registres

test('★ explosion — le SOUFFLE appartient au registre scénique, la disparition aux deux', () => {
  const scenique = verdictSurnumeraire({ scenographie: true });
  const sobre = verdictSurnumeraire({ scenographie: false });

  const souffles = (tl) => tl.nodes.filter((n) => n.role === 'souffle').map((n) => n.id);
  assert.deepEqual(souffles(scenique), ['@souffle:s0']);
  assert.deepEqual(souffles(sobre), [], 'sous « sobre », le 6 s’en va sans éclats');

  // Le geste, lui, est le même dans les deux : sept 6 sur la ligne, six révélés.
  // C'est un FAIT de la démonstration, pas une mise en scène — le registre
  // change ce qui se voit, jamais ce qui est démontré (CONTRACTS §3.1).
  for (const tl of [scenique, sobre]) {
    assert.equal(tl.scene.get('s0').alive, false);
    assert.deepEqual(tl.scene.flow, REVELES);
    assert.deepEqual(tl.warnings, []);
  }

  // Le souffle passe par le canal DISCRET — un tracé réécrit, jamais une
  // opacité ni un filtre sur un nœud transformé (voir `explosion.js`).
  const discret = scenique.discrete.filter((d) => d.key === '@souffle:s0::d');
  assert.equal(discret.length, 1);
  assert.equal(typeof discret[0].render, 'function');
  assert.equal(discret[0].render(1), 'M 0 0 Z', 'et il ne reste rien de lui à la fin');
});

/**
 * ★ LE SOUFFLE EST DU MÊME REPÈRE QUE CE QU'IL ÉCARTE.
 *
 * Il porte le `scale` du verdict, sans la moindre arithmétique de rattrapage,
 * et c'est licite pour une raison qui se mesure : le surnuméraire se tient au
 * MILIEU de la ligne rassemblée, et l'homothétie du verdict a pour centre le
 * milieu du groupe. C'est le même point. Le jour où ce ne le serait plus, un
 * simple `scale` ferait dériver les éclats loin de leur foyer — et ce test
 * rougirait avant que quiconque ne le voie à l'écran.
 */
test('★ explosion — le souffle éclate au centre de l’homothétie, et grandit avec elle', () => {
  const tl = verdictSurnumeraire({ scenographie: true });
  const foyer = tl.scene.pos('@souffle:s0');
  const xs = REVELES.map((id) => tl.scene.pos(id).x);
  assert.ok(Math.abs(foyer.x - (xs[0] + xs[5]) / 2) < 0.01,
    `le foyer est en ${foyer.x}, le centre du verdict en ${(xs[0] + xs[5]) / 2}`);

  const grossir = animsDe(tl, 'd0', 'scale')[0];
  const souffle = animsDe(tl, '@souffle:s0', 'scale')[0];
  assert.equal(souffle.keyframes.at(-1).value, grossir.keyframes.at(-1).value);
  assert.equal(souffle.delay, grossir.delay);
  assert.equal(souffle.duration, grossir.duration);
  assert.equal(souffle.easing, grossir.easing, 'même courbe, sinon ce n’est plus une homothétie');
});

test('★ explosion — en mouvement réduit, pas de souffle : un éclat d’une image n’en est pas un', () => {
  // Même raison que l'éclair de l'orage : une enveloppe compilée à 1 ms n'est
  // plus une explosion, c'est une image blanche d'une frame — très exactement
  // ce que `prefers-reduced-motion` existe pour épargner. Le RETRAIT, lui,
  // reste : c'est un fait, pas un mouvement.
  const tl = verdictSurnumeraire({ scenographie: true, reduced: true });
  assert.deepEqual(tl.nodes.filter((n) => n.role === 'souffle'), []);
  assert.equal(tl.scene.get('s0').alive, false, 'le 6 de trop s’en va quand même');
  assert.deepEqual(tl.scene.flow, REVELES);
});

// ───────────────────── 4. ce que l'explosion emporte avec elle

test('★ explosion — le 6 de trop n’est pas balayé avec les restes', () => {
  // `reveal` fait le vide autour de lui : tout ce qui n'est pas le verdict
  // s'efface AVANT le rassemblement. Le surnuméraire n'est pas un reste — un
  // reste est ce qui n'a rien à voir avec le verdict, et lui en vient. S'il
  // partait avec le `x`, il n'y aurait plus rien à faire exploser.
  const tl = verdictSurnumeraire();
  const rebut = animsDe(tl, 'r0', 'opacity').at(-1);
  const boum = animsDe(tl, 's0', 'opacity').at(-1);
  assert.equal(rebut.keyframes.at(-1).value, 0);
  assert.equal(boum.keyframes.at(-1).value, 0);
  assert.ok(boum.delay > rebut.delay + rebut.duration,
    'le rebut s’en va d’abord, le 6 de trop bien plus tard');
});

test('★ explosion — même sous les cornes, on rassemble avant de faire sauter', () => {
  // La voie courte du verdict — « les triptyques sont déjà formés, un seul
  // trajet suffit » — supposait qu'il n'y ait rien à retirer entre eux. Il y a
  // quelque chose, et ce quelque chose est le propos de l'étape.
  const tokens = [six('d0'), six('d1'), six('d2'), six('s0'),
    six('d3'), six('d4'), six('d5'), { id: 'r0', text: 'x', kind: 'letter' }];
  const tl = compile(sc([
    { id: 'a', title: 'Un 666', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'] }] },
    { id: 'b', title: 'Un autre', ops: [{ op: 'horns', targets: ['d3', 'd4', 'd5'] }] },
    { id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: REVELES, surnumeraires: ['s0'] }] },
  ], tokens));

  assert.deepEqual(tl.warnings, []);
  assert.equal(animsDe(tl, 'd0', 'translate').length, 2,
    'deux temps : on se rassemble, puis l’explosion propulse');
  assert.equal(tl.scene.get('s0').alive, false);
});

// ───────────────────── 5. ce que la primitive refuse

test('★ explosion — un surnuméraire déjà mort fait échouer la compilation, en le disant', () => {
  const tokens = [six('d0'), six('d1'), six('d2'), six('s0'),
    six('d3'), six('d4'), six('d5')];
  assert.throws(() => compile(sc([
    { id: 'a', title: 'On jette', ops: [{ op: 'drop', targets: ['s0'], mode: 'fall' }] },
    { id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: REVELES, surnumeraires: ['s0'] }] },
  ], tokens)), /s0/,
  'faire exploser un jeton déjà tombé est une contradiction, pas une explosion muette');
});
