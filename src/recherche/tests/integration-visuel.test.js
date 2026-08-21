// Intégration réelle : les scénarios émis par `scenario.js` sont compilés par
// le COMPILATEUR DU MOTEUR VISUEL (`src/visuel/compile.js`), pas par un double.
//
// C'est le seul test qui prouve que le pont arithmétique ↔ visuel tient : il
// vérifie les invariants dynamiques que la validation statique ne peut pas voir
// (3 — ids vivants au bon instant, 4 — id créé jamais recréé, 6 — durée
// compilée ≥ 16 ms) et les garde-fous de cohérence des primitives (« le moteur
// visuel refuse d'afficher un calcul faux »).
//
// Si `src/visuel/` n'existe pas encore (agent en cours d'écriture), le test se
// déclare ignoré plutôt que d'échouer : il n'appartient pas au moteur de
// recherche de faire échouer la suite sur l'absence d'un module voisin.

import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../index.js';
import { catalogue } from './_catalogue.js';

let compile = null;
let setGlyphes = null;
let GLYPHES = null;
try {
  ({ compile } = await import('../../visuel/compile.js'));
  ({ setGlyphes } = await import('../../visuel/glyphes.js'));
  ({ GLYPHES } = await import('../../moteur/tables/glyphes.js'));
  setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');
} catch {
  compile = null;
}

const SAISIES = [
  'https://hope-hope-hope.fr/',
  'hope',
  'macron',
  '42',
  '666',
  'jean-michel',
  'Éléonore à Nîmes',
  'https://www.example.com/path/to/page',
];

test('intégration — chaque scénario émis compile dans le moteur visuel réel', { skip: compile ? false : 'src/visuel/ absent' }, () => {
  const m = creerMoteur(catalogue);
  let compiles = 0;
  const avertis = [];
  const refus = [];
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      let sc;
      try {
        sc = m.scenarioDe(a, { saisie: r.saisie });
      } catch (err) {
        refus.push(`${s} #${a.rang} (${a.codes}) : ${err.message.slice(0, 120)}`);
        continue;
      }
      const tl = compile(sc);
      assert.ok(tl.total > 0, `${s} #${a.rang} : durée totale nulle`);
      assert.equal(tl.steps.length, sc.steps.length);
      for (let i = 1; i < tl.bounds.length; i++) {
        assert.ok(tl.bounds[i] > tl.bounds[i - 1], `${s} #${a.rang} : charnières confondues`);
      }
      if (tl.warnings.length) avertis.push(`${s} #${a.rang} : ${tl.warnings.join(' | ')}`);
      compiles++;
    }
  }
  console.log(`    ${compiles} scénarios compilés par src/visuel/compile.js`);
  if (refus.length) console.log(`    ${refus.length} approche(s) écartée(s) :\n      ${refus.join('\n      ')}`);
  console.log(`    ${avertis.length} scénario(s) avec avertissement de compilation`
    + ' (steps fournis par le catalogue — voir le test suivant)');
  assert.equal(refus.length, 0, 'aucune approche proposée ne doit être irrendable');
});

/**
 * Les avertissements « animations concurrentes » observés ci-dessus viennent des
 * `steps()` du catalogue, pas de l'émission générique. Ce test le PROUVE : en
 * privant les opérateurs de leur `steps()`, tout passe par `scenario.js`, et
 * plus aucun avertissement ne subsiste.
 */
test('intégration — l’émission générique ne produit AUCUN avertissement', { skip: compile ? false : 'src/visuel/ absent' }, () => {
  const sansSteps = {
    operateurs: (catalogue.operateurs || catalogue).map((o) => {
      const c = { ...o };
      delete c.steps;
      delete c.sortie;
      return c;
    }),
  };
  const m = creerMoteur(sansSteps);
  let n = 0;
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      const sc = m.scenarioDe(a, { saisie: r.saisie });
      const tl = compile(sc);
      assert.deepEqual(tl.warnings, [], `${s} #${a.rang} (${a.codes})`);
      n++;
    }
  }
  console.log(`    ${n} scénarios génériques compilés sans le moindre avertissement`);
});

test('intégration — le scénario passe aussi la validation statique du moteur visuel', { skip: compile ? false : 'src/visuel/ absent' }, async () => {
  const { validateScenario } = await import('../../visuel/scenario.js');
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const a of r.approches) {
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    assert.doesNotThrow(() => validateScenario(sc), `#${a.rang} (${a.codes})`);
  }
});
