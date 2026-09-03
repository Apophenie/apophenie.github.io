/**
 * Layout des tokens — unités viewBox, chasse fixe, aucune lecture DOM.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  layoutFlow, defaultLayoutOptions, defaultMetrics, measureText, bboxOf, charCenter, fitScale, filetD,
} from '../layout.js';
import { VIEWBOX } from '../constants.js';

const metrics = defaultMetrics();
const opts = defaultLayoutOptions(metrics);

const items = (texts) => texts.map((t, i) => ({ id: `t${i}`, w: measureText(t, metrics) }));

test('la chasse fixe rend la largeur purement arithmétique', () => {
  assert.equal(measureText('h', metrics), metrics.advance);
  assert.equal(measureText('15', metrics), 2 * metrics.advance);
  assert.equal(measureText('', metrics), metrics.advance, 'un token vide occupe une chasse');
});

test('une ligne unique est centrée dans le viewBox', () => {
  const { positions, lines, width } = layoutFlow(items(['h', 'o', 'p', 'e']), opts);
  assert.equal(lines, 1);
  const xs = [...positions.values()].map((p) => p.x);
  const centre = (xs[0] + xs[xs.length - 1]) / 2;
  assert.ok(Math.abs(centre - opts.centerX) < 0.001, 'le milieu de la ligne est le centre du viewBox');
  assert.ok(xs.every((x, i) => i === 0 || x > xs[i - 1]), 'ordre de lecture préservé');
  const expected = 4 * metrics.advance + 3 * opts.gap;
  assert.ok(Math.abs(width - expected) < 0.001);
});

test('les positions sont des centres, stables quand la largeur change', () => {
  const a = layoutFlow([{ id: 'x', w: measureText('h', metrics) }], opts);
  const b = layoutFlow([{ id: 'x', w: measureText('15', metrics) }], opts);
  assert.equal(a.positions.get('x').x, opts.centerX);
  assert.equal(b.positions.get('x').x, opts.centerX, 'le centre ne bouge pas, la largeur oui');
  assert.notEqual(a.positions.get('x').w, b.positions.get('x').w);
});

test('par défaut, jamais deux lignes — la ligne déborde et le signale', () => {
  const many = items(new Array(80).fill('x'));
  const res = layoutFlow(many, opts);
  assert.equal(res.lines, 1, 'la doctrine est : une seule ligne, toujours (on fait défiler)');
  assert.ok(res.width > opts.maxWidth, 'elle est plus large que la zone utile');
  assert.ok(res.overflow, 'et le layout le dit — c’est le signal du défilement');
  const ys = [...new Set([...res.positions.values()].map((p) => p.y))];
  assert.equal(ys.length, 1, 'une seule ordonnée : tout est sur la même ligne');
  assert.ok(Math.abs(res.positions.get('t0').x + res.positions.get('t79').x - 2 * opts.centerX) < 0.001,
    'la ligne reste centrée sur la scène ; c’est la vue qui se déplacera');
});

test('le passage à la ligne, quand on le demande, se fait à la frontière d’un token', () => {
  const many = items(new Array(80).fill('x'));
  const res = layoutFlow(many, { ...opts, wrap: true });
  assert.ok(res.lines > 1, '80 tokens ne tiennent pas sur une ligne');
  const byLine = new Map();
  for (const [id, p] of res.positions) {
    if (!byLine.has(p.line)) byLine.set(p.line, []);
    byLine.get(p.line).push({ id, ...p });
  }
  for (const list of byLine.values()) {
    const w = list.reduce((s, p) => s + p.w, 0) + (list.length - 1) * opts.gap;
    assert.ok(w <= opts.maxWidth + 0.001, `ligne de ${w} > maxWidth ${opts.maxWidth}`);
  }
  const ys = [...new Set([...res.positions.values()].map((p) => p.y))];
  assert.equal(ys.length, res.lines);
});

test('breakBefore force un retour à la ligne — là où les retours existent', () => {
  const it = items(['a', 'b', 'c']);
  it[1].breakBefore = true;
  assert.equal(layoutFlow(it, opts).lines, 1, 'sans `wrap`, rien ne casse la ligne');
  const res = layoutFlow(it, { ...opts, wrap: true });
  assert.equal(res.lines, 2);
  assert.equal(res.positions.get('t0').line, 0);
  assert.equal(res.positions.get('t1').line, 1);
});

test('gapBefore permet le resserrement de `group`', () => {
  const base = layoutFlow(items(['a', 'b']), opts);
  const it = items(['a', 'b']);
  it[1].gapBefore = opts.gap * 0.5;
  const tight = layoutFlow(it, opts);
  const d0 = base.positions.get('t1').x - base.positions.get('t0').x;
  const d1 = tight.positions.get('t1').x - tight.positions.get('t0').x;
  assert.ok(d1 < d0, 'les tokens se rapprochent');
});

test('un flux vide ne casse pas', () => {
  const res = layoutFlow([], opts);
  assert.equal(res.positions.size, 0);
  assert.equal(res.lines, 0);
});

test('bboxOf agrège en unités viewBox', () => {
  const { positions } = layoutFlow(items(['h', 'o', 'p', 'e']), opts);
  const box = bboxOf(['t0', 't3'], positions, metrics, 0);
  assert.ok(box.w > 3 * metrics.advance);
  assert.equal(box.h, metrics.fontSize);
  assert.ok(Math.abs(box.cx - opts.centerX) < 0.001);
  assert.equal(bboxOf(['inconnu'], positions, metrics), null);
});

test('charCenter remplace getStartPositionOfChar (chasse fixe)', () => {
  const pos = { x: 100, y: 50, w: 2 * metrics.advance };
  assert.equal(charCenter(pos, 0, metrics).x, 100 - metrics.advance / 2);
  assert.equal(charCenter(pos, 1, metrics).x, 100 + metrics.advance / 2);
});

test('fitScale ne grossit jamais au-delà de 1', () => {
  assert.equal(fitScale(10, 10, opts), 1);
  assert.ok(fitScale(VIEWBOX.w * 2, 10, opts) < 1);
});

/**
 * ★ **L'AXE PARTAGÉ — une fraction n'est pas trois lignes empilées.**
 *
 * Chaque rang se centre sur lui-même, et c'est juste tant que les rangs n'ont
 * rien à se dire. Une FRACTION, si : numérateur, trait et dénominateur
 * partagent un axe, et c'est cet axe qui en fait une fraction plutôt que trois
 * lignes posées l'une sur l'autre.
 *
 * ⚠️ MESURÉ sur l'œuf — « la part = Pi, quand présente, vient trop à
 *   l'intérieur, là où devrait être la barre de fraction » (l'auteur). Le
 *   « = π » se pose à la droite du trait, donc sur SON rang ; ce rang devenait
 *   le plus large, son centrage emportait le trait 84 unités vers la gauche, et
 *   le numérateur restait, lui, au milieu de la scène — donc le débordait par
 *   la droite, très exactement là où l'égalité venait s'écrire.
 */
test('★ l’axe reporte les autres rangs — et sans appendice, rien ne change', () => {
  const a = metrics.advance;
  const rang = (id, w, coupe) => ({ id, w, ...(coupe ? { breakBefore: true } : {}) });
  const trois = [
    rang('num', 6 * a),
    { ...rang('trait', 8 * a, true), axe: true },
    rang('app', 3 * a),                    // l'appendice, à la droite du trait
    rang('den', 5 * a, true),
  ];
  const avec = layoutFlow(trois, { ...opts, coupuresExplicites: true }).positions;
  assert.equal(avec.get('num').x, avec.get('trait').x, 'le numérateur se centre sur l’axe');
  assert.equal(avec.get('den').x, avec.get('trait').x, 'le dénominateur aussi');
  // Ce qui accompagne le trait reste HORS de ce qu'il sépare.
  assert.ok(avec.get('app').x - 1.5 * a >= avec.get('trait').x + 4 * a,
    'l’appendice mord sur le trait');
  // Et l'expression entière, appendice compris, garde le centre de la scène :
  // c'est le rang de l'axe qui tient cet équilibre, et il ne bouge pas.
  const g = Math.min(...[...avec.values()].map((p) => p.x - p.w / 2));
  const d = Math.max(...[...avec.values()].map((p) => p.x + p.w / 2));
  assert.ok(Math.abs((g + d) / 2 - opts.centerX) < 0.001, 'l’expression n’est plus centrée');

  // ★ SANS APPENDICE, l'axe ne change RIEN : les deux centres coïncident. La
  //   correction est un élargissement, pas un changement de régime.
  const sansApp = trois.filter((i) => i.id !== 'app');
  const axe = layoutFlow(sansApp, { ...opts, coupuresExplicites: true }).positions;
  const nu = layoutFlow(
    sansApp.map(({ axe: _ignore, ...i }) => i), { ...opts, coupuresExplicites: true },
  ).positions;
  for (const id of ['num', 'trait', 'den']) {
    assert.deepEqual(axe.get(id), nu.get(id), `« ${id} » bouge alors qu’aucun appendice ne l’y oblige`);
  }
});

/**
 * Le tracé d'un trait se déduit de sa largeur, et il vit ici parce que trois
 * modules en ont besoin : `rule` l'anime, `scene` le pose à la naissance du
 * trait, `dom` s'en sert de repli.
 */
test('filetD : un segment centré sur son ancre, jamais de largeur négative', () => {
  assert.equal(filetD(50), 'M -50 0 H 50');
  assert.equal(filetD(0), 'M 0 0 H 0');
  assert.equal(filetD(-7), 'M 0 0 H 0', 'une demi-largeur négative ne dessine rien');
  assert.equal(filetD(1 / 3), 'M -0.333 0 H 0.333', 'arrondi au millième, donc déterministe');
});
