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
let REPEAT_SPEED = 5;
let setGlyphes = null;
let GLYPHES = null;
try {
  ({ compile, REPEAT_SPEED } = await import('../../visuel/compile.js'));
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
test('★ intégration — la figure du Registre traverse le compilateur intacte',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    // Le Registre lit `lecteur.steps`, c'est-à-dire la sortie de `compile()` —
    // pas le scénario brut. Une figure perdue en route rendrait le Registre
    // muet là où la scène montre un afficheur (CONTRACTS §6).
    const m = creerMoteur(catalogue);
    const r = m.resoudre('hope');
    const a = r.approches.find((x) => x.codes && x.codes.includes('me'))
      || r.approches.find((x) => x.codes && x.codes.includes('md'));
    assert.ok(a, 'aucune approche sept segments dans les résultats de « hope »');
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    const avecFigure = sc.steps.filter((st) => st.figure);
    assert.ok(avecFigure.length, 'le scénario n’émet aucune figure');
    const tl = compile(sc);
    sc.steps.forEach((st, i) => {
      assert.deepEqual(tl.steps[i].figure, st.figure ?? null,
        `step ${i} : la figure ne survit pas à la compilation`);
    });
    for (const st of avecFigure) {
      assert.equal(st.figure.type, 'seg7');
      assert.ok(st.figure.glyphe, 'figure sans glyphe à afficher');
      assert.ok(st.figure.texte.trim(), 'figure sans équivalent en une ligne');
      // Contrôle croisé : le nombre de la figure est celui que la primitive
      // `sevenSeg` fait descendre — jamais une valeur saisie à part.
      const op = st.ops.find((o) => o.op === 'sevenSeg');
      assert.ok(op, 'une figure sept segments sans op sevenSeg');
      assert.equal(String(op.to.text), String(st.figure.valeur));
      assert.equal(op.segments, st.figure.segments);
      assert.equal(op.count, st.figure.valeur);
    }
  });

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

/**
 * ★ Le vocabulaire des ops existe en TROIS exemplaires — le contrat
 * (CONTRACTS §3.1), `src/visuel/constants.js › OP_NAMES` et
 * `src/recherche/scenario.js › VOCABULAIRE` —, parce que l'agent heuristique ne
 * dépend pas du moteur visuel. Trois copies, c'est trois occasions de diverger,
 * et la divergence ne fait ÉCHOUER personne : elle fait retomber en silence sur
 * le rendu générique. Ce test est le seul endroit où les deux se regardent.
 */
test('★ intégration — les deux copies du vocabulaire d’ops coïncident',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { OP_NAMES } = await import('../../visuel/constants.js');
    const { VOCABULAIRE } = await import('../scenario.js');
    assert.deepEqual([...VOCABULAIRE].sort(), [...OP_NAMES].sort());
  });

test('★ intégration — la figure quatorze segments traverse elle aussi le compilateur',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const r = m.resoudre('hope');
    const a = r.approches.find((x) => x.codes && (x.codes.includes('mw') || x.codes.includes('mx')));
    assert.ok(a, 'aucune approche quatorze segments dans les résultats de « hope »');
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    const avecFigure = sc.steps.filter((st) => st.figure && st.figure.type === 'seg14');
    assert.ok(avecFigure.length, 'le scénario n’émet aucune figure quatorze segments');
    const tl = compile(sc);
    sc.steps.forEach((st, i) => {
      assert.deepEqual(tl.steps[i].figure, st.figure ?? null,
        `step ${i} : la figure ne survit pas à la compilation`);
    });
    for (const st of avecFigure) {
      assert.ok(st.figure.glyphe, 'figure sans glyphe à afficher');
      assert.ok(st.figure.texte.trim(), 'figure sans équivalent en une ligne');
      // Le geste dédié est bien là — pas une substitution déguisée.
      const op = st.ops.find((o) => o.op === 'fourteenSeg');
      assert.ok(op, 'une figure quatorze segments sans op fourteenSeg : rendu générique');
      assert.equal(String(op.to.text), String(st.figure.valeur));
      assert.deepEqual(op.segments, st.figure.segments);
      assert.equal(op.count, st.figure.valeur);
    }
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


/**
 * L'accélération des redites (`visuel/compile.js` § Répétitions) doit rester
 * SANS EFFET sur ce qui est montré : mêmes steps, mêmes titres, mêmes valeurs
 * d'arrivée, mêmes charnières distinctes — seules les durées changent. Et elle
 * ne doit jamais fabriquer un step sous le minimum de CONTRACTS §3.
 */
test('intégration — l’accélération des redites ne change QUE les durées',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    let accelerees = 0;
    let gainMax = 0;
    let saisieMax = '';
    for (const s of SAISIES) {
      const r = m.resoudre(s);
      for (const a of r.approches) {
        let sc;
        try { sc = m.scenarioDe(a, { saisie: r.saisie }); } catch { continue; }
        const plein = compile(sc, { repeatSpeed: 1 });
        const rapide = compile(sc, { repeatSpeed: REPEAT_SPEED });

        assert.deepEqual(rapide.steps.map((st) => st.id), plein.steps.map((st) => st.id));
        assert.deepEqual(rapide.steps.map((st) => st.title), plein.steps.map((st) => st.title));
        assert.equal(rapide.anims.length, plein.anims.length, `${s} #${a.rang} : animations perdues`);
        assert.deepEqual(
          rapide.anims.map((x) => [x.id, x.prop, JSON.stringify(x.keyframes)]),
          plein.anims.map((x) => [x.id, x.prop, JSON.stringify(x.keyframes)]),
          `${s} #${a.rang} : une valeur d'arrivée a bougé`);
        assert.deepEqual(rapide.warnings, plein.warnings, `${s} #${a.rang} : nouvel avertissement`);

        for (const st of rapide.steps) {
          assert.ok(st.duration >= 16, `${s} #${a.rang} : step « ${st.id} » à ${st.duration} ms`);
          assert.ok(st.duration <= plein.steps[st.index].duration + 1e-6, 'une redite ne rallonge jamais');
          if (st.accelerated) accelerees++;
        }
        for (let i = 1; i < rapide.bounds.length; i++) {
          assert.ok(rapide.bounds[i] - rapide.bounds[i - 1] >= 8, `${s} #${a.rang} : charnières trop proches`);
        }
        const gain = 1 - rapide.total / plein.total;
        if (gain > gainMax) { gainMax = gain; saisieMax = `${s} #${a.rang}`; }
      }
    }
    assert.ok(accelerees > 0, 'aucune redite détectée dans tout le jeu d’essai — la détection est morte');
    console.log(`    ${accelerees} étapes accélérées ; meilleur gain ${(gainMax * 100).toFixed(0)} %`
      + ` sur ${saisieMax}`);
  });

test('intégration — « hope-hope-hope » : les trois « hope » ne se lisent qu’une fois en entier',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const r = m.resoudre('https://hope-hope-hope.fr/');
    const sc = m.scenarioDe(r.approches[0], { saisie: r.saisie });
    const plein = compile(sc, { repeatSpeed: 1 });
    const rapide = compile(sc, { repeatSpeed: REPEAT_SPEED });
    const redites = rapide.steps.filter((st) => st.accelerated);
    assert.ok(redites.length >= 8,
      `seules ${redites.length} étapes reconnues comme redites sur ${rapide.steps.length}`);
    // Chaque redite pointe vers une étape ANTÉRIEURE, jamais vers elle-même.
    for (const st of redites) {
      assert.ok(st.repeatOf >= 0 && st.repeatOf < st.index, `étape ${st.index} : repeatOf=${st.repeatOf}`);
    }
    assert.ok(rapide.total < plein.total * 0.6,
      `${Math.round(plein.total)} ms → ${Math.round(rapide.total)} ms : gain insuffisant`);
    console.log(`    hope-hope-hope : ${(plein.total / 1000).toFixed(1)} s → `
      + `${(rapide.total / 1000).toFixed(1)} s (${rapide.steps.length} étapes, ${redites.length} accélérées)`);
  });
