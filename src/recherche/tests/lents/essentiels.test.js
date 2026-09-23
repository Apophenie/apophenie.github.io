import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { lire } from '../../url.js';
import { compterTraductionsDivergentes } from '../../elegance.js';
import { catalogue } from '../_catalogue.js';
import { compile } from '../../../visuel/compile.js';
import { setGlyphes } from '../../../visuel/glyphes.js';
import { GLYPHES } from '../../../moteur/tables/glyphes.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

test('parcours essentiel : recherche, rejeu et scène racontent la même voie', () => {
  const moteur = creerMoteur(catalogue);
  const resultat = moteur.resoudre('hope');
  const voie = resultat.approches.find((a) => a.parts?.length);
  assert.ok(voie, 'la recherche doit trouver une voie démontrable');
  const rejeu = moteur.rejouer(lire(voie.url));
  assert.equal(rejeu.ok, true, rejeu.raison);
  assert.equal(rejeu.approche.url, voie.url);
  const scenario = moteur.scenarioDe(voie, { saisie: 'hope', cible: resultat.cible });
  assert.equal(scenario.avertissements, undefined);
  assert.deepEqual(compile(scenario).warnings, []);
});

test('une moisson ne publie pas deux traductions du même mot', () => {
  const approches = creerMoteur(catalogue).resoudre('https://hope-hope-hope.fr/').approches;
  assert.ok(approches.some((a) => a.mode === 'MOISSON'));
  for (const a of approches) assert.equal(compterTraductionsDivergentes(a.parts || []), 0, a.url);
});
