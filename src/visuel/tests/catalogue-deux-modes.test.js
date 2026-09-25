import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../../moteur/tables/glyphes.js';
import { CATALOGUE, PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { VECTEURS } from '../../moteur/vecteurs-geles.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

test('chaque opérateur compile dans les deux modes sans conflit et rend la même ligne', () => {
  assert.equal(VECTEURS.length, CATALOGUE.length);
  const fautes = [];
  let compiles = 0;
  for (const [code, avant] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, avant);
    assert.ok(apres, `${code} : vecteur gelé inapplicable`);
    const elements = avant.type === 'STR' ? [...avant.valeur]
      : avant.type === 'NUM' ? [String(avant.valeur)] : avant.valeur.map(String);
    const tokens = elements.map((text, i) => ({ id: `t${i}`, text }));
    const steps = op.steps(avant, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
    if (!steps.length) continue;
    const scene = { version: 1, tokens, steps };
    const pasAPas = compile(scene, { rythme: 'pasAPas' });
    const simultane = compile(scene, { rythme: 'simultane' });
    compiles++;
    for (const [mode, tl] of [['pas à pas', pasAPas], ['simultané', simultane]]) {
      if (tl.warnings.length) fautes.push(`${code} ${mode} : ${tl.warnings.join(' | ')}`);
    }
    const ligne = (tl) => tl.scene.flow.map((id) => tl.scene.get(id).text);
    if (JSON.stringify(ligne(pasAPas)) !== JSON.stringify(ligne(simultane))) {
      fautes.push(`${code} : les deux modes ne rendent pas la même ligne`);
    }
  }
  assert.equal(compiles, CATALOGUE.length - 1, 'seul le lecteur implicite ne produit pas d’étape');
  assert.deepEqual(fautes, []);
});
