/**
 * Analyse des tracés de glyphes et dérivation des comptages.
 *
 * Ce que le moteur visuel dessine doit être exactement ce qui est compté
 * (CONTRACTS §0.3). Les valeurs de référence viennent de
 * `research/moteur-arithmetique.md §3.4`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePath, flatten, endpointsOf, deriveGlyph, glyphOf, setGlyphes, peekGlyphes, polylineLength } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { fusedStrokes, glyphToLocal, SEGMENTS } from '../assets.js';

// Table de référence (moteur-arithmetique §3.4) : traits / extrémités / boucles
const REFERENCE = {
  A: [3, 2, 1],
  E: [4, 3, 0],
  H: [3, 4, 0],
  I: [1, 2, 0],
  O: [1, 0, 1],
  P: [2, 1, 1],
};

test('parsePath découpe commandes et arguments', () => {
  const cmds = parsePath('M 0 0 L 200 600');
  assert.equal(cmds.length, 2);
  assert.deepEqual(cmds[0], { cmd: 'M', args: [0, 0] });
  assert.deepEqual(cmds[1], { cmd: 'L', args: [200, 600] });
});

test('parsePath refuse S et T avec un message explicite', () => {
  assert.throws(() => parsePath('M 0 0 S 1 1 2 2'), /non gérée/);
});

test('flatten gère lignes, arcs et fermeture', () => {
  const line = flatten('M 0 0 L 100 0');
  assert.equal(line.closed, false);
  assert.deepEqual(line.points[0], { x: 0, y: 0 });

  const circle = flatten(GLYPHES.O.traits[0].d);
  assert.equal(circle.closed, true, 'le O revient à son point de départ');
  assert.ok(circle.points.length > 20, 'l’arc est échantillonné');
  assert.ok(polylineLength(circle.points) > 1000);
});

test('endpointsOf donne les extrémités sans DOM (pas de getPointAtLength)', () => {
  const { start, end } = endpointsOf('M 60 0 L 60 600');
  assert.deepEqual(start, { x: 60, y: 0 });
  assert.deepEqual(end, { x: 60, y: 600 });
});

test('deriveGlyph reproduit la table de référence du moteur arithmétique', () => {
  for (const [ch, [traits, extremites, boucles]] of Object.entries(REFERENCE)) {
    const d = deriveGlyph(GLYPHES[ch]);
    assert.deepEqual(
      [d.traits, d.extremites, d.boucles],
      [traits, extremites, boucles],
      `glyphe ${ch} : attendu ${traits}/${extremites}/${boucles}, obtenu ${d.traits}/${d.extremites}/${d.boucles}`,
    );
  }
});

test('les extrémités libres sont localisées, pas seulement comptées', () => {
  const d = deriveGlyph(GLYPHES.H);
  assert.equal(d.libres.length, 4);
  const ys = d.libres.map((p) => p.y).sort((a, b) => a - b);
  assert.deepEqual(ys, [0, 0, 600, 600], 'les quatre bouts des deux fûts');
});

test('une jonction hors bornes échoue bruyamment', () => {
  assert.throws(() => deriveGlyph({ traits: [{ d: 'M 0 0 L 1 1' }], jonctions: [[0, 7]] }), /hors bornes/);
});

test('glyphOf valide la forme et nomme le glyphe manquant', () => {
  setGlyphes(GLYPHES, 'fixtures');
  assert.ok(glyphOf('H'));
  assert.throws(() => glyphOf('Z'), /glyphe « Z » absent/);
  assert.throws(() => glyphOf('X', { X: { traits: [] } }), /liste non vide/);
  assert.equal(peekGlyphes(), GLYPHES);
});

test('fusion des segments colinéaires : la règle qui donne H=3, O=4, P=4, E=4', () => {
  assert.deepEqual(fusedStrokes('bcefg'), ['g', 'bc', 'ef']);        // H = 3
  assert.equal(fusedStrokes('bcefg').length, 3);
  assert.equal(fusedStrokes('abcdef').length, 4);                     // O
  assert.equal(fusedStrokes('abefg').length, 4);                      // P
  assert.equal(fusedStrokes('adefg').length, 4);                      // E
  assert.equal(fusedStrokes('abcdefg').length, 5, 'borne supérieure de la métrique');
});

test('chaque segment déclare le trait continu auquel il appartient', () => {
  assert.equal(SEGMENTS.b.stroke, 'bc');
  assert.equal(SEGMENTS.c.stroke, 'bc');
  assert.equal(SEGMENTS.e.stroke, 'ef');
  assert.equal(SEGMENTS.f.stroke, 'ef');
  assert.equal(SEGMENTS.g.stroke, 'g');
});

test('glyphToLocal recentre et retourne l’axe y', () => {
  const c = glyphToLocal({ x: 200, y: 300 }, 48);
  assert.deepEqual(c, { x: 0, y: 0 }, 'le centre de la grille est l’origine du nœud');
  const haut = glyphToLocal({ x: 200, y: 600 }, 48);
  assert.ok(haut.y < 0, 'y monte dans la grille glyphe, descend en SVG');
});
