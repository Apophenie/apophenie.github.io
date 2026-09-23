import test from 'node:test';
import assert from 'node:assert/strict';

import { BAREME, compterTraductionsDivergentes } from '../elegance.js';
import { catalogue } from './_catalogue.js';

test('deux acceptions du même mot sont une divergence, deux mots distincts non', () => {
  assert.ok(BAREME.TRADUCTION_DIVERGENTE > BAREME.REGLAGE_PAR_MORCEAU);
  const parCode = new Map(catalogue.map((op) => [op.code, op]));
  const par = (code, mot = 'hope') => ({
    chemin: { ops: [parCode.get(code)], etats: [{ valeur: mot }] },
  });
  assert.equal(parCode.get('ffr3').acception, 3);
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr')]), 1);
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr'), par('ffr2')]), 2);
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr3')]), 0);
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr', 'love')]), 0);
  assert.equal(compterTraductionsDivergentes([par('ffr3', 'Hope'), par('ffr', 'hope')]), 1);
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('fen')]), 0);
});
