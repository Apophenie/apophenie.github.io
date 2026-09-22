import test from 'node:test';
import assert from 'node:assert/strict';
import { programmePour } from './pages/debug.js';
import { CATALOGUE } from '../moteur/catalogue.js';
import { creerMoteur, lire, ecrire } from '../recherche/index.js';
import { compile } from '../visuel/compile.js';

const moteur = creerMoteur(CATALOGUE);
const lecturePour = (code) => {
  const prog = programmePour(CATALOGUE.find((op) => op.code === code));
  assert.ok(prog, `exemple pour ${code}`);
  return lire(ecrire({
    saisie: prog.texte || prog.saisie,
    fragments: [{ portee: prog.portee || null, resonance: null, codes: prog.codes }],
  }));
};

for (const code of ['fr22', 'mdiv']) {
  test(`debug : ${code} se joue comme exemple partiel, sans verdict ni lien public`, () => {
    const lecture = lecturePour(code);
    assert.equal(moteur.rejouer(lecture).ok, false);
    assert.equal(moteur.rejouer({ ...lecture, exempleOperateur: true }).ok, false);
    const diagnostic = moteur.rejouerExemple(lecture);
    assert.ok(diagnostic.ok, diagnostic.raison);
    assert.equal(diagnostic.approche.exempleOperateur, true);
    assert.equal(diagnostic.approche.url, undefined);
    const scenario = moteur.scenarioDe(diagnostic.approche);
    assert.equal(scenario.result, '');
    assert.equal(scenario.steps.at(-1).code, code);
    assert.ok(scenario.steps.every((step) => step.title !== 'Le verdict'));
    assert.doesNotThrow(() => compile(scenario));
  });
}

test('debug : le programme m14 reste rejouable publiquement lorsqu’il conclut', () => {
  assert.ok(moteur.rejouer(lecturePour('m14')).ok);
});
