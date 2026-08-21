/**
 * Les tables de tracé — la pièce délicate (CONTRACTS §0.3, §2.4).
 *
 * Rappel du principe : rien n'est saisi à la main, tout est dérivé des tracés
 * vectoriels que le moteur visuel dessine. Ces tests vérifient donc à la fois
 * les comptages, les conventions de tracé et le fait que le garde-fou de
 * chargement fonctionne.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { GLYPHES, CAPITALES, BAS_DE_CASSE, TOLERANCE, METRIQUES } from './tables/glyphes.js';
import {
  TRAITS_MAJ, TRAITS_MIN, EXTREMITES_MAJ, EXTREMITES_MIN, BOUCLES_MAJ, BOUCLES_MIN,
  SOMMES, SOMMES_CONTRAT, SOMMES_OBTENUES, ECARTS, deriver, boiteGlyphe, mesure,
} from './tables/derivees.js';

const somme = (t) => Object.values(t).reduce((a, b) => a + b, 0);

test('les 52 glyphes sont définis et gelés', () => {
  assert.equal(Object.keys(GLYPHES).length, 52);
  for (const c of [...CAPITALES, ...BAS_DE_CASSE]) {
    assert.ok(GLYPHES[c], `glyphe manquant : ${c}`);
    assert.ok(Object.isFrozen(GLYPHES[c]));
    assert.ok(GLYPHES[c].traits.length >= 1);
  }
});

test('sommes de contrôle des tables dérivées', () => {
  assert.equal(somme(TRAITS_MAJ), 61);
  assert.equal(somme(TRAITS_MIN), 53);
  assert.equal(somme(EXTREMITES_MAJ), 58);
  assert.equal(somme(BOUCLES_MAJ), 8);
  assert.equal(somme(BOUCLES_MIN), 8);
  assert.deepEqual(SOMMES_OBTENUES, SOMMES);
});

test('les capitales reproduisent exactement research §3.4', () => {
  assert.deepEqual(TRAITS_MAJ, {
    A: 3, B: 3, C: 1, D: 2, E: 4, F: 3, G: 2, H: 3, I: 1, J: 1, K: 3, L: 2, M: 4,
    N: 3, O: 1, P: 2, Q: 2, R: 3, S: 1, T: 2, U: 1, V: 2, W: 4, X: 2, Y: 3, Z: 3,
  });
  assert.deepEqual(EXTREMITES_MAJ, {
    A: 2, B: 0, C: 2, D: 0, E: 3, F: 3, G: 2, H: 4, I: 2, J: 2, K: 4, L: 2, M: 4,
    N: 4, O: 0, P: 1, Q: 1, R: 2, S: 2, T: 3, U: 2, V: 2, W: 2, X: 4, Y: 3, Z: 2,
  });
  assert.deepEqual(Object.entries(BOUCLES_MAJ).filter(([, v]) => v > 0), [
    ['A', 1], ['B', 2], ['D', 1], ['O', 1], ['P', 1], ['Q', 1], ['R', 1],
  ]);
});

test('les bas de casse reproduisent research §3.4, aux cinq écarts documentés près', () => {
  assert.deepEqual(TRAITS_MIN, {
    a: 2, b: 2, c: 1, d: 2, e: 2, f: 2, g: 2, h: 2, i: 2, j: 2, k: 3, l: 1, m: 3,
    n: 2, o: 1, p: 2, q: 2, r: 2, s: 1, t: 2, u: 2, v: 2, w: 4, x: 2, y: 2, z: 3,
  });
  assert.deepEqual(Object.keys(BOUCLES_MIN).filter((c) => BOUCLES_MIN[c] === 1),
    ['a', 'b', 'd', 'e', 'g', 'o', 'p', 'q']);

  const recherche = {
    a: 2, b: 1, c: 2, d: 1, e: 1, f: 4, g: 1, h: 2, i: 3, j: 2, k: 4, l: 2, m: 4,
    n: 2, o: 0, p: 1, q: 1, r: 2, s: 2, t: 3, u: 2, v: 2, w: 2, x: 4, y: 2, z: 2,
  };
  const attendus = { ...recherche };
  for (const e of ECARTS) attendus[e.glyphe] = e.dessine;
  assert.deepEqual(EXTREMITES_MIN, attendus);

  // Les écarts sont exactement ceux déclarés, ni plus ni moins.
  const differents = Object.keys(recherche).filter((c) => recherche[c] !== EXTREMITES_MIN[c]);
  assert.deepEqual(differents.sort(), ECARTS.map((e) => e.glyphe).sort());
  for (const e of ECARTS) assert.ok(e.raison.length > 40, `écart ${e.glyphe} : justification trop courte`);
});

test('l’écart avec la somme de contrôle du contrat est circonscrit à extMin', () => {
  for (const k of ['trMAJ', 'trMin', 'extMAJ', 'bcMAJ', 'bcMin']) {
    assert.equal(SOMMES_OBTENUES[k], SOMMES_CONTRAT[k], `somme ${k}`);
  }
  assert.equal(SOMMES_CONTRAT.extMin, 54);
  assert.equal(SOMMES_OBTENUES.extMin, 57);
});

test('conventions de tracé imposées (CONTRACTS §2.4)', () => {
  // A pointu : deux diagonales et une barre, une boucle, deux pieds libres
  assert.deepEqual([TRAITS_MAJ.A, EXTREMITES_MAJ.A, BOUCLES_MAJ.A], [3, 2, 1]);
  // I sans empattement
  assert.deepEqual([TRAITS_MAJ.I, EXTREMITES_MAJ.I], [1, 2]);
  // a et g à un seul étage : une boucle chacun
  assert.equal(BOUCLES_MIN.a, 1);
  assert.equal(BOUCLES_MIN.g, 1);
  // Q à queue tangente : une extrémité libre, une boucle
  assert.deepEqual([TRAITS_MAJ.Q, EXTREMITES_MAJ.Q, BOUCLES_MAJ.Q], [2, 1, 1]);
  // W en 4 traits, J sans barre
  assert.equal(TRAITS_MAJ.W, 4);
  assert.equal(TRAITS_MIN.w, 4);
  assert.equal(TRAITS_MAJ.J, 1);
  // le point du i et du j compte comme un trait et une extrémité
  assert.equal(GLYPHES.i.traits.length, 2);
  const point = deriver({ traits: [GLYPHES.i.traits[1]], jonctions: [] });
  assert.deepEqual([point.traits, point.extremites, point.boucles], [1, 1, 0]);
});

test('les tracés tiennent dans la grille normalisée', () => {
  for (const [c, g] of Object.entries(GLYPHES)) {
    const b = boiteGlyphe(g);
    const basse = c === c.toUpperCase() ? -1 : METRIQUES.jambage - 1;
    assert.ok(b.x0 >= -1 && b.x1 <= METRIQUES.largeur + 1, `${c} déborde en largeur : ${b.x0}..${b.x1}`);
    assert.ok(b.y0 >= basse && b.y1 <= METRIQUES.hampe + 21, `${c} déborde en hauteur : ${b.y0}..${b.y1}`);
  }
});

test('une jonction ne lie que si les tracés se touchent vraiment', () => {
  // Deux traits disjoints, déclarés joints : la jonction est morte et le
  // chargement échouerait. C'est ce qui rend impossible de « corriger » un
  // comptage sans redessiner.
  const faux = { traits: [{ d: 'M 0 0 L 0 100', ouvert: true }, { d: 'M 300 0 L 300 100', ouvert: true }], jonctions: [[0, 1]] };
  const d = deriver(faux);
  assert.deepEqual(d.jonctionsMortes, [[0, 1]]);
  assert.equal(d.extremites, 4, 'aucune extrémité n’est liée par une jonction fictive');
  // À portée, la jonction lie.
  const vrai = { traits: [{ d: 'M 0 0 L 0 100', ouvert: true }, { d: 'M 0 100 L 100 100', ouvert: true }], jonctions: [[0, 1]] };
  const d2 = deriver(vrai);
  assert.deepEqual(d2.jonctionsMortes, []);
  assert.equal(d2.extremites, 2);
  assert.ok(TOLERANCE > 0);
});

test('accès par lettre, casse comprise', () => {
  assert.equal(mesure('traits', 'maj', 'h'), 3);
  assert.equal(mesure('traits', 'min', 'H'), 2);
  assert.equal(mesure('boucles', 'min', 'o'), 1);
  assert.equal(mesure('extremites', 'maj', '7'), null);
  assert.equal(mesure('inconnue', 'maj', 'A'), null);
});

test('les extrémités libres sont localisées (le visuel y pose ses marqueurs)', () => {
  const h = deriver(GLYPHES.H);
  assert.equal(h.libres.length, 4);
  for (const p of h.libres) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.trait >= 0 && p.trait < GLYPHES.H.traits.length);
  }
});
