/**
 * Le défilement — « jamais deux lignes, on fait défiler pour garder l'action au
 * centre » — et le verdict, qui reste centré et prend la scène.
 *
 * Les deux sont vérifiés ici parce qu'ils répondent à la même exigence : ce que
 * le spectateur doit voir doit être **sous ses yeux**, jamais au-delà du cadre
 * ni tassé dans un coin.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { ciblesDuStep, panPour, memePan } from '../defilement.js';
import { Scene } from '../scene.js';
import { defaultMetrics, defaultLayoutOptions } from '../layout.js';
import { VIEWBOX, MARGIN, PAN_ID, CAMERA_ID } from '../constants.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const metrics = defaultMetrics();
const opts = defaultLayoutOptions(metrics, VIEWBOX);
const sc = (steps, tokens) => ({ version: 1, tokens, steps });

/** Une saisie qui déborde franchement : 70 caractères, un jeton chacun. */
const longue = () => [...'https://www.example-longue-adresse-de-test.org/chemin/tres/long']
  .map((c, i) => ({ id: `t${i}`, text: c, kind: c === '-' || c === '.' || c === '/' ? 'sep' : 'letter' }));

const courte = () => [...'hope'].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));

const panDe = (tl) => tl.anims.filter((a) => a.id === PAN_ID);

/** Où se peint le jeton `id` à l'instant `t`, une fois le défilement appliqué. */
function vueDe(tl, id, t) {
  const x = valeurA(tl, id, 'translate', t);
  const pan = valeurA(tl, PAN_ID, 'translate', t);
  return x.x + pan.x;
}

/**
 * Valeur d'arrivée du canal, telle qu'elle vaut une fois le step joué.
 * On n'interpole pas : les instants observés sont pris juste avant une
 * charnière, quand toutes les animations du step sont terminées.
 */
function valeurA(tl, id, prop, t) {
  let v = tl.scene.get(id).base[prop];
  for (const a of tl.anims.filter((x) => x.id === id && x.prop === prop).sort((x, y) => x.delay - y.delay)) {
    if (a.delay > t) break;
    v = a.keyframes[a.keyframes.length - 1].value;
  }
  return v;
}

// ───────────────────────────── 1. une seule ligne, toujours

test('une saisie qui déborde reste sur UNE ligne', () => {
  const tl = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }] }], longue()));
  const ys = new Set(tl.scene.flow.map((id) => tl.scene.pos(id).y));
  assert.equal(ys.size, 1, 'jamais deux lignes — on fait défiler à la place');
  assert.equal(tl.scene.lastLayout.lines, 1);
  assert.ok(tl.scene.lastLayout.overflow, 'et le layout signale qu’elle déborde');
});

test('une saisie qui tient ne fait rien défiler du tout', () => {
  const tl = compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }] },
    { id: 'b', title: 'B', ops: [{ op: 'highlight', targets: ['t3'] }] },
  ], courte()));
  assert.equal(panDe(tl).length, 0, 'aucune animation de défilement : rien à suivre');
});

// ───────────────────────────── 2. la caméra suit l'action

test('le défilement amène l’action dans le cadre, et l’y garde', () => {
  const tl = compile(sc([
    { id: 'a', title: 'Début', ops: [{ op: 'highlight', targets: ['t0'] }] },
    { id: 'b', title: 'Fin', ops: [{ op: 'highlight', targets: ['t62'] }] },
  ], longue()));

  assert.ok(panDe(tl).length >= 1, 'la ligne déborde : la vue se déplace');
  for (const [id, step] of [['t0', 0], ['t62', 1]]) {
    const t = tl.bounds[step + 1] - 1;   // juste avant la charnière suivante
    const x = vueDe(tl, id, t);
    assert.ok(x >= VIEWBOX.x && x <= VIEWBOX.x + VIEWBOX.w,
      `« ${id} » doit être dans le cadre à la fin de son étape (vu en x = ${x})`);
  }
});

test('le défilement ne découvre jamais de vide sur les côtés', () => {
  const tl = compile(sc([
    { id: 'a', title: 'Début', ops: [{ op: 'highlight', targets: ['t0'] }] },
    { id: 'b', title: 'Fin', ops: [{ op: 'highlight', targets: ['t62'] }] },
  ], longue()));
  for (const a of panDe(tl)) {
    for (const k of a.keyframes) {
      const gauche = tl.scene.pos('t0').x - metrics.advance / 2 + k.value.x;
      const droite = tl.scene.pos('t62').x + metrics.advance / 2 + k.value.x;
      assert.ok(gauche <= VIEWBOX.x + MARGIN + 0.001, `bord gauche entré dans la scène (${gauche})`);
      assert.ok(droite >= VIEWBOX.x + VIEWBOX.w - MARGIN - 0.001, `bord droit entré dans la scène (${droite})`);
    }
  }
});

test('la vue ne bouge pas quand l’action est déjà sous les yeux (zone morte)', () => {
  const contenu = { x: -600, w: 2400, cx: 600 };
  const vb = VIEWBOX;
  // Le focus est pile au centre : rien à faire, quel que soit le cadrage.
  const immobile = panPour({ x: 560, w: 80, cx: 600 }, contenu, opts, vb, { x: 0, y: 0 });
  assert.ok(memePan(immobile, { x: 0, y: 0 }));
  // Le focus est hors cadre : la vue va le chercher.
  const bouge = panPour({ x: 1500, w: 80, cx: 1540 }, contenu, opts, vb, { x: 0, y: 0 });
  assert.ok(bouge.x < -500, `la vue doit se déplacer vers la droite du texte (${bouge.x})`);
  assert.ok(1500 + bouge.x >= vb.x && 1580 + bouge.x <= vb.x + vb.w, 'et le focus doit être dans le cadre');
  assert.equal(bouge.x, (vb.x + vb.w - MARGIN) - (contenu.x + contenu.w),
    'bridée par le bord droit du texte : on ne découvre pas de vide pour centrer');
});

test('un step qui ne désigne rien ne déplace pas la vue', () => {
  const contenu = { x: -600, w: 2400, cx: 600 };
  const garde = panPour(null, contenu, opts, VIEWBOX, { x: 300, y: 0 });
  assert.equal(garde.x, 300, 'ce qui vient de se passer s’est passé là : on y reste');
});

test('« dim » ne dicte pas le cadrage — il désigne tout le reste', () => {
  const tokens = longue().map((t, i) => ({ ...t, group: i < 8 ? 'g0' : 'g1' }));
  const scene = new Scene(tokens, { metrics, layoutOpts: opts });
  const step = {
    id: 'a',
    title: 'On isole le premier morceau',
    ops: [{ op: 'highlight', targets: { group: 'g0' } }, { op: 'dim', targets: { groupNot: 'g0' } }],
  };
  const cibles = ciblesDuStep(step, scene);
  assert.equal(cibles.length, 8, 'seul le morceau surligné compte comme sujet');
  assert.ok(cibles.every((id) => scene.get(id).group === 'g0'));
});

// ───────────────────────────── 3. le défilement et la caméra ne se marchent pas dessus

test('le défilement et le recul de caméra sont deux nœuds distincts', () => {
  const tl = compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }] },
    {
      id: 'b',
      title: 'B',
      ops: [{ op: 'table', ordre: 'a1z26', target: 't62', to: { id: 'r', text: '7' } }],
    },
  ], longue()));
  const cam = tl.anims.filter((a) => a.id === CAMERA_ID);
  assert.ok(cam.length >= 2, 'la table recule bien la caméra');
  assert.ok(panDe(tl).length >= 1, 'et la ligne défile');
  assert.deepEqual(tl.warnings, [], 'sans jamais deux animations concurrentes sur un même canal');
});

test('ce qui se pose « au centre » se pose au centre de la VUE', () => {
  const tl = compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }] },
    { id: 'b', title: 'B', ops: [{ op: 'table', ordre: 'a1z26', target: 't62', to: { id: 'r', text: '7' } }] },
  ], longue()));
  const board = tl.nodes.find((n) => n.role === 'table');
  assert.ok(board, 'la table existe');
  const pan = tl.anims.filter((a) => a.id === PAN_ID).pop();
  const panFinal = pan ? pan.keyframes[pan.keyframes.length - 1].value : { x: 0 };
  assert.ok(Math.abs(board.base.translate.x + panFinal.x - opts.centerX) < 0.5,
    'la table doit tomber au milieu de l’écran, défilement compris');
});

// ───────────────────────────── 4. mouvement réduit

test('en mouvement réduit, le défilement est un état, pas un trajet', () => {
  const tl = compile(
    sc([
      { id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }] },
      { id: 'b', title: 'B', ops: [{ op: 'highlight', targets: ['t62'] }] },
    ], longue()),
    { reduced: true },
  );
  for (const a of panDe(tl)) {
    assert.equal(a.keyframes.length, 1, 'une seule valeur : l’état d’arrivée, sans trajet');
    assert.equal(a.duration, 1);
  }
});

// ───────────────────────────── 5. le verdict

test('le verdict efface les estompés avant de grouper les chiffres', () => {
  const tokens = [
    { id: 'a', text: '6', kind: 'digit' }, { id: 's1', text: '-', kind: 'sep' },
    { id: 'b', text: '6', kind: 'digit' }, { id: 's2', text: '-', kind: 'sep' },
    { id: 'c', text: '6', kind: 'digit' }, { id: 's3', text: '.', kind: 'sep' },
  ];
  const tl = compile(sc([{
    id: 'v', title: 'Le verdict',
    ops: [
      { op: 'dim', targets: ['s1', 's2', 's3'] },
      { op: 'reveal', targets: ['a', 'b', 'c'], at: 250, stagger: 150 },
    ],
  }], tokens));

  for (const id of ['s1', 's2', 's3']) {
    const dernier = tl.anims.filter((x) => x.id === id && x.prop === 'opacity').sort((x, y) => x.delay - y.delay).pop();
    assert.equal(dernier.keyframes[dernier.keyframes.length - 1].value, 0, `« ${id} » doit avoir disparu`);
    assert.equal(tl.scene.get(id).alive, false, 'et être sorti du flux de layout');
    assert.ok(tl.nodes.some((n) => n.id === id), 'sans jamais quitter le DOM (règle 7)');
  }
});

test('le verdict n’a plus de fond : aucun halo derrière les chiffres', () => {
  const tokens = [{ id: 'a', text: '6', kind: 'digit' }, { id: 'b', text: '6', kind: 'digit' }];
  const tl = compile(sc([{ id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['a', 'b'] }] }], tokens));
  assert.equal(tl.nodes.filter((n) => n.role === 'halo').length, 0, 'plus de cartouche doré sous les chiffres');
});

test('le verdict reste centré et prend l’essentiel de la scène', () => {
  const tokens = ['a', 'b', 'c'].map((id) => ({ id, text: '6', kind: 'digit' }));
  const tl = compile(sc([{
    id: 'v', title: 'Le verdict',
    ops: [
      { op: 'move', targets: ['a', 'b', 'c'], to: 'front' },
      { op: 'reveal', targets: ['a', 'b', 'c'], at: 250, stagger: 150 },
    ],
  }], tokens));

  const xs = ['a', 'b', 'c'].map((id) => tl.scene.pos(id).x);
  const milieu = (xs[0] + xs[2]) / 2;
  assert.ok(Math.abs(milieu - opts.centerX) < 0.5, `le verdict est centré (milieu = ${milieu})`);

  const zoom = tl.anims.filter((a) => a.id === 'a' && a.prop === 'scale').pop();
  const g = zoom.keyframes[zoom.keyframes.length - 1].value;
  assert.ok(g > 5, `les chiffres grossissent franchement (× ${g})`);
  const largeur = 3 * metrics.advance * g + 2 * opts.gap * g;
  const hauteur = metrics.capHeight * g;
  assert.ok(largeur < opts.maxWidth, 'il reste de l’air sur les côtés');
  assert.ok(hauteur < VIEWBOX.h * 0.75, 'et de l’air en haut et en bas');
  assert.ok(hauteur > VIEWBOX.h * 0.45, 'mais il prend bien l’essentiel de la hauteur');
});

test('le verdict attend la fin du « move » plutôt que de le contredire', () => {
  const tokens = ['a', 'b', 'c'].map((id) => ({ id, text: '6', kind: 'digit' }));
  const tl = compile(sc([{
    id: 'v', title: 'Le verdict',
    ops: [
      { op: 'move', targets: ['a', 'b', 'c'], to: 'front' },
      { op: 'reveal', targets: ['a', 'b', 'c'], at: 250 },
    ],
  }], tokens));
  assert.deepEqual(tl.warnings, [], 'aucune animation concurrente sur « translate »');
});

test('le verdict recompilé (redimensionnement) ne grossit pas deux fois', () => {
  const tokens = ['a', 'b', 'c'].map((id) => ({ id, text: '6', kind: 'digit' }));
  const scenario = sc([{ id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['a', 'b', 'c'] }] }], tokens);
  const g = (tl) => tl.anims.filter((a) => a.id === 'a' && a.prop === 'scale').pop()
    .keyframes.slice(-1)[0].value;
  assert.equal(g(compile(scenario)), g(compile(scenario)), 'la mesure repart du texte, pas de la largeur déjà mise à l’échelle');
});
