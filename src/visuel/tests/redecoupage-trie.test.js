/**
 * ★ **LE REDÉCOUPAGE EXACT AVEC TRI — `mrtE`, et `mt9E` qui garde le 9.**
 *
 * > « Pour mrdE, peux-tu faire une variante qui peut inclure un mtri en cours
 * >   de route pour débloquer les assemblages ? (ou utiliser mrd+mtri+mrdE
 * >   peut-être) » (l'autrice, 19 septembre 2026)
 *
 * Ce fichier tient ce que la variante promet (`mappeurs.js ›
 * planRedecoupageExactTrie`) : elle écrit plus que `mrdE` et que la chaîne
 * `mrd+mtri+mrdE` là où elle parle, se tait là où `mrdE` suffit, ne vise que
 * les cibles homogènes, et se joue par le CHEMIN DU SITE sans avertissement —
 * la première passe de `mrd`, le rangement de `mtri`, la passe de `mrdE`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie, nums } from '../../moteur/etat.js';
import { construireScenario } from '../../recherche/scenario.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const rend = (codes, v, cible = '666') => {
  let e = N(v);
  for (const code of codes.split('+')) {
    const op = PAR_CODE.get(code);
    // `mr9` ne lit pas la cible : il n'a pas de `viser`.
    e = appliquer(op.viser ? op.viser(cible) : op, e);
    if (!e) return null;
  }
  return e.valeur;
};
const series = (v) => (v ? Math.floor(v.filter((x) => x === 6).length / 3) : 0);

/** La ligne de « Didier Raoult » en code ASCII capitales (`fmaj+mas`). */
const RAOULT = [68, 73, 68, 73, 69, 82, 32, 82, 65, 79, 85, 76, 84];

test('★ Didier Raoult : ranger débloque deux séries de plus que `mrdE`, et que la chaîne', () => {
  assert.equal(series(rend('mrdE', RAOULT)), 2);
  // La chaîne que l'autrice proposait : `mtri` range des NOMBRES, et `mrd` sans
  // le 9 laisse une ligne que le rangement ne débloque pas.
  assert.equal(series(rend('mrd+mtri+mrdE', RAOULT)), 1);
  assert.equal(series(rend('mtri+mrdE', RAOULT)), 2);
  // Le geste intégré : les cinq 6 devant, le reste rangé, fondu — quatre séries.
  assert.deepEqual(rend('mrtE', RAOULT), new Array(12).fill(6));
  // Avec le 9 : sept justes devant, cinq séries une fois `mr9` passé.
  assert.equal(series(rend('mt9E+mr9', RAOULT)), 5);
  assert.equal(series(rend('md9E+mr9', RAOULT)), 3);
});

test('★ il se tait quand `mrdE` écrit déjà autant, et quand la cible n’est pas homogène', () => {
  assert.deepEqual(rend('mrdE', [6, 5, 1, 9, 3, 3]), [6, 6, 6]);
  assert.equal(rend('mrtE', [6, 5, 1, 9, 3, 3]), null, 'ranger n’apporterait rien');
  // `3 6 3 3 3` : `mrdE` ne sait rien en écrire, `mrtE` fait passer le 6 devant.
  assert.equal(rend('mrdE', [3, 6, 3, 3, 3]), null);
  assert.deepEqual(rend('mrtE', [3, 6, 3, 3, 3]), [6, 6, 6]);
  for (const code of ['mrtE', 'mt9E']) {
    assert.equal(PAR_CODE.get(code).viser('31031998'), null, `${code} : ranger détruirait l’ordre de la date`);
  }
  // 777 : le 7 est le chiffre juste, et la variante avec 9 n'y a aucun sens.
  assert.equal(rend('mrdE', [7, 3, 7, 3, 1], '777'), null);
  assert.deepEqual(rend('mrtE', [7, 3, 7, 3, 1], '777'), [7, 7, 7]);
  assert.equal(PAR_CODE.get('mt9E').viser('777'), null);
});

test('★ noté plus bas que `mrdE`, ouvert au cran 2 — et sa variante avec 9 au cran 3', () => {
  const m = PAR_CODE.get('mrdE');
  const t = PAR_CODE.get('mrtE');
  const t9 = PAR_CODE.get('mt9E');
  assert.ok(t.notoriete < m.notoriete && t9.notoriete < t.notoriete);
  assert.equal(t.recours || 0, 0);
  assert.equal(t.desLeCran, PAR_CODE.get('mrfE').desLeCran, 'le cran des variantes qui accolent');
  assert.equal(t9.desLeCran, PAR_CODE.get('md9E').desLeCran, 'le cran des variantes avec 9');
  assert.ok(t.absorbe && !t9.absorbe);
  // Ce qu'il range, il le déclare : le barème le facture comme `mtri`.
  assert.equal(t.deplaces([3, 6, 3, 3, 3]), 2, 'le 6 passe devant, un 3 prend sa place');
});

test('★ par le chemin du site : `mrd`, puis le rangement de `mtri`, puis `mrdE` — sans avertissement', () => {
  // `fl+tca+mas` : c'est le chemin AVEC la première passe (trois séries, contre
  // deux sans elle) — les étapes de `mrd` s'y jouent en tête.
  for (const [saisie, programme] of [['Didier Raoult', 'fmaj+tca+mas+mrtE'], ['Didier Raoult', 'fmaj+tca+mas+mt9E+mr9'],
    ['Marie Curie', 'fmaj+tca+mas+mrtE'], ['Didier Raoult', 'fl+tca+mas+mrtE']]) {
    const ops = programme.split('+').map((c) => PAR_CODE.get(c));
    const etats = [depuisSaisie(saisie)];
    for (const op of ops) {
      const suivant = appliquer(op, etats[etats.length - 1]);
      assert.ok(suivant, `${programme} doit s'appliquer à « ${saisie} »`);
      etats.push(suivant);
    }
    const n = [...saisie].length;
    const sc = construireScenario({ mode: 'DECRET', parts: [{
      fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
      chemin: { ops, etats },
    }] }, { saisie });
    assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const ops2 = sc.steps.flatMap((s) => s.ops || []);
    assert.ok(ops2.some((o) => o.op === 'move'), `${programme} : le rangement se voit`);
    assert.ok(ops2.some((o) => o.op === 'sum'), `${programme} : les sommes se voient`);
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], `${programme} : ${tl.warnings.join(' | ')}`);
  }
});
