/**
 * Compilation : modèle temporel, bornes, invariants dynamiques (3, 4, 6),
 * vocabulaire fermé, cohérence de ce qui est montré avec ce qui est compté.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { SCENARIOS } from '../fixtures/scenarios.js';
import { OP_NAMES, MIN_STEP_DURATION, MIN_HINGE_GAP, DEFAULT_DUR } from '../constants.js';
import { CompileError } from '../errors.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens = [{ id: 't0', text: 'h', kind: 'letter' }]) => ({ version: 1, tokens, steps });

test('les scénarios de démonstration compilent tous sans avertissement', () => {
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    const tl = compile(scenario);
    assert.ok(tl.total > 0, `${name} : durée nulle`);
    assert.equal(tl.steps.length, scenario.steps.length);
    assert.deepEqual(tl.warnings, [], `${name} : ${tl.warnings.join(' | ')}`);
  }
});

test('le parcours de vérification exerce TOUTES les primitives du vocabulaire', () => {
  const used = new Set();
  for (const step of SCENARIOS.vocabulaire.steps) for (const op of step.ops) used.add(op.op);
  const manquantes = OP_NAMES.filter((n) => !used.has(n));
  assert.deepEqual(manquantes, [], `primitives jamais exercées : ${manquantes.join(', ')}`);
});

test('modèle temporel : t0 cumulés, bounds = charnières, TOTAL = bounds.at(-1)', () => {
  const tl = compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'wait', dur: 1000 }] },
    { id: 'b', title: 'B', ops: [{ op: 'wait', dur: 500 }], hold: 300 },
  ]));
  assert.deepEqual(tl.bounds, [0, 1000, 1800]);
  assert.equal(tl.total, 1800);
  assert.deepEqual(tl.steps.map((s) => [s.t0, s.t1]), [[0, 1000], [1000, 1800]]);
});

test('durée par défaut d’une op = DEFAULT_DUR, hold ajouté ensuite', () => {
  const tl = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['t0'] }], hold: 400 }]));
  assert.equal(tl.total, DEFAULT_DUR.highlight + 400);
});

test('`at` décale l’op à l’intérieur du step et allonge son étendue', () => {
  const tl = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 500, at: 300 }] }]));
  assert.equal(tl.total, 800);
});

test('`speed` divise toutes les durées', () => {
  const one = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 1000 }] }]));
  const two = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 1000 }] }]), { speed: 2 });
  assert.equal(one.total, 1000);
  assert.equal(two.total, 500);
  assert.throws(() => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait' }] }]), { speed: 0 }), /« speed » invalide/);
});

test('cas limite 3 — un step de durée nulle est interdit', () => {
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [] }])),
    (err) => {
      assert.ok(err instanceof CompileError);
      assert.match(err.message, /durée compilée de 0 ms/);
      assert.match(err.message, /« wait »/, 'le message doit indiquer la sortie de secours');
      return true;
    },
  );
});

test(`cas limite 4 — deux charnières distantes de moins de 2·EPS (${MIN_HINGE_GAP} ms) sont rejetées`, () => {
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 5 }] }])),
    new RegExp(`le minimum est ${MIN_STEP_DURATION} ms`),
  );
  // 16 ms passe tout juste
  const ok = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 16 }] }]));
  assert.equal(ok.total, MIN_STEP_DURATION);
  for (let i = 1; i < ok.bounds.length; i++) {
    assert.ok(ok.bounds[i] - ok.bounds[i - 1] >= MIN_HINGE_GAP);
  }
});

test('une `duration` explicite plus courte que ses ops est une erreur, pas une troncature', () => {
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', duration: 100, ops: [{ op: 'wait', dur: 900 }] }])),
    /plus courte que l’étendue réelle/,
  );
});

test('invariant 3 — une op ne peut référencer qu’un id existant à cet instant', () => {
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['fantome'] }] }])),
    /« fantome » inconnu à cet instant/,
  );
  // un id créé au step 1 n'existe pas au step 0
  assert.throws(() => compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'highlight', targets: ['n0'] }] },
    { id: 'b', title: 'B', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { id: 'n0', text: '8' } }] }] },
  ])), /inconnu à cet instant/);
  // mais il existe au step 2
  assert.doesNotThrow(() => compile(sc([
    { id: 'b', title: 'B', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { id: 'n0', text: '8' } }] }] },
    { id: 'c', title: 'C', ops: [{ op: 'highlight', targets: ['n0'] }] },
  ])));
});

test('invariant 4 — un id supprimé n’est jamais réutilisé, un id créé jamais recréé', () => {
  assert.throws(() => compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'drop', targets: ['t0'] }] },
    { id: 'b', title: 'B', ops: [{ op: 'highlight', targets: ['t0'] }] },
  ])), /déjà été supprimé/);

  assert.throws(() => compile(sc([
    { id: 'a', title: 'A', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { id: 't1', text: '8' } }] }] },
    { id: 'b', title: 'B', ops: [{ op: 'substitute', pairs: [{ target: 't1', to: { id: 't1', text: '9' } }] }] },
  ])), /déjà utilisé/);
});

test('une op qui crée un token doit le nommer (c’est l’émetteur qui nomme)', () => {
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { text: '8' } }] }] }])),
    /sans « id »/,
  );
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { id: '@x', text: '8' } }] }] }])),
    /réservé au moteur visuel/,
  );
  const tokens = [{ id: 'n0', text: '1' }, { id: 'n1', text: '2' }];
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'insertOperators', between: ['n0', 'n1'], ids: [] }] }], tokens)),
    /« ids » doit contenir exactement 1 identifiant/,
  );
});

test('les signes d’opération peuvent rester au moteur, et `sum` les absorbe', () => {
  const tokens = [{ id: 'n0', text: '1' }, { id: 'n1', text: '2' }, { id: 'n2', text: '3' }];
  // `ids` omis : les « + » appartiennent au moteur (id « @ »), donc personne
  // d'autre ne peut les référencer — et `sum` les fait disparaître avec lui.
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '+' },
      { op: 'sum', targets: ['n0', 'n1', 'n2'], to: { id: 'r', text: '6' }, at: 700 },
    ],
  }], tokens));
  const signes = tl.nodes.filter((n) => n.kind === 'operator');
  assert.equal(signes.length, 2, 'deux signes insérés');
  assert.ok(signes.every((n) => n.id.startsWith('@')), 'ils appartiennent au moteur');
  assert.ok(signes.every((n) => !n.alive), 'ils ont été absorbés par la somme');
  assert.deepEqual(tl.scene.flow, ['r'], 'il ne reste que le résultat');
  assert.deepEqual(tl.warnings, []);
});

test('substitute 1 → n : éclatement et résonance', () => {
  const tokens = [{ id: 'q', text: '44', kind: 'number' }];
  // éclatement : les chiffres reconstituent le token, ils naissent sur ses glyphes
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'substitute', stagger: 60, pairs: [{ target: 'q', to: [{ id: 'd0', text: '4' }, { id: 'd1', text: '4' }] }] }],
  }], tokens));
  assert.deepEqual(tl.scene.flow, ['d0', 'd1']);
  const naissances = ['d0', 'd1'].map((id) => tl.scene.get(id).base.translate.x);
  assert.ok(naissances[0] < naissances[1], 'chaque chiffre naît sur son glyphe d’origine');

  // résonance : le même 6 recopié trois fois — `targets:[id]` est accepté
  const tl2 = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'substitute', pairs: [{ targets: ['q'], to: [{ id: 'x0', text: '6' }, { id: 'x1', text: '6' }, { id: 'x2', text: '6' }] }] }],
  }], tokens));
  assert.deepEqual(tl2.scene.flow, ['x0', 'x1', 'x2']);
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'substitute', pairs: [{ targets: ['q', 'q'], to: { id: 'z', text: '1' } }] }] }], tokens)),
    /une substitution part d’un seul token/,
  );
});

/**
 * ★ **LA RÉDUCTION PROMET SOUS SA POINTE, ET C'EST LÀ QUE LE RÉSULTAT TOMBE.**
 *
 * « L'animation de `mrn` est buguée : pas centré dans l'accolade, pas de
 * symbole de somme » (l'auteur). Les deux n'en faisaient qu'un :
 *
 *  · `reduce` traçait son accolade avec `promet: false` et SANS symbole, en
 *    laissant à `accumulate` le soin de les porter — or `accumulate` est
 *    appelé avec `accoladeExistante`, ce qui lui fait sauter `tracerAccolade`.
 *    Personne ne dessinait donc le Σ ;
 *  · et sans symbole, aucune ancre n'est publiée : `accumulate` se rabattait
 *    sur `posDeRepli`, qui rendait la position du PREMIER opérande. Sur
 *    `44 → 4 + 4 → 8`, le résultat se posait une demi-chasse à gauche de la
 *    pointe qui le promettait.
 *
 * Les deux se gèlent ici parce qu'aucun test ne regardait la géométrie de ce
 * geste : la suite d'intégration vérifie qu'il COMPILE, pas qu'il vise juste.
 */
test('reduce : le Σ existe, et le résultat naît au centre de ce qu’il somme', () => {
  const tokens = [{ id: 'q', text: '44', kind: 'number' }];
  const tl = compile(sc([{
    id: 'a',
    title: 'A',
    ops: [{
      op: 'reduce',
      target: 'q',
      digits: [{ id: 'd0', text: '4' }, { id: 'd1', text: '4' }],
      to: { id: 'r', text: '8' },
    }],
  }], tokens));

  const sigma = tl.nodes.filter((n) => n.role === 'label' && n.text === 'Σ');
  assert.equal(sigma.length, 1, 'la réduction annonce une somme : le symbole doit être là');

  // ★ ACCROCHÉ à l'accolade — sinon il désigne où la pointe ÉTAIT dès qu'elle
  //   se recentre (`suivreLaZone` déplace les bras, pas les décors).
  assert.ok(sigma[0].data && sigma[0].data.suit,
    'le symbole doit suivre l’accolade qui le porte');

  const centre = ['d0', 'd1']
    .map((id) => tl.nodes.find((n) => n.id === id).base.translate.x)
    .reduce((a, b) => a + b, 0) / 2;
  const resultat = tl.nodes.find((n) => n.id === 'r');
  assert.ok(Math.abs(resultat.base.translate.x - centre) < 0.5,
    `le résultat naît en ${resultat.base.translate.x}, le centre des chiffres est en ${centre}`);
  // Et il naît SOUS eux, pas sur la ligne : c'est une promesse d'accolade.
  assert.ok(resultat.base.translate.y > tl.nodes.find((n) => n.id === 'd0').base.translate.y,
    'le résultat descend sous la pointe avant de remonter dans la ligne');
});

test('reduce sans « to » renvoie vers substitute', () => {
  const tokens = [{ id: 'q', text: '44', kind: 'number' }];
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'reduce', target: 'q', digits: [{ id: 'd0', text: '4' }, { id: 'd1', text: '4' }] }] }], tokens)),
    /utilisez « substitute » avec un « to » multiple/,
  );
});

test('le moteur refuse d’afficher un calcul faux', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }];
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'sum', targets: ['n0', 'n1'], to: { id: 'r', text: '99' } }] }], tokens)),
    /la somme des opérandes vaut 23/,
  );
  assert.throws(
    () => compile(sc([{
      id: 'a', title: 'A',
      ops: [{ op: 'reduce', target: 'n1', digits: [{ id: 'd0', text: '1' }, { id: 'd1', text: '9' }], to: { id: 'r', text: '10' } }],
    }], tokens)),
    /ne reconstituent pas le token « 15 »/,
  );
});

test('countStrokes : le compte annoncé doit être celui du tracé dessiné', () => {
  const tokens = [{ id: 'h', text: 'H', kind: 'letter' }];
  assert.doesNotThrow(() => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'countStrokes', target: 'h', mode: 'traits', count: 3 }] }], tokens)));
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'countStrokes', target: 'h', mode: 'traits', count: 4 }] }], tokens)),
    /le tracé de référence en donne 3/,
  );
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'countStrokes', target: 'h', mode: 'diagonales' }] }], tokens)),
    /les modes sont/,
  );
});

test('sevenSeg : segments valides et compte cohérent', () => {
  const tokens = [{ id: 'h', text: 'H', kind: 'letter' }];
  assert.doesNotThrow(() => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 'h', segments: 'bcefg', count: 3 }] }], tokens)));
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 'h', segments: 'bcefgz' }] }], tokens)),
    /parmi a…g/,
  );
  assert.throws(
    () => compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 'h', segments: 'bcefg', count: 5 }] }], tokens)),
    /l’afficheur en montre 3/,
  );
});

test('keyboard : quatre rangées, deux dispositions, trois mesures', () => {
  const tokens = [{ id: 'z', text: 'z', kind: 'letter' }];
  const un = (op) => compile(sc([{ id: 'a', title: 'A', ops: [op] }], tokens));
  // le tiret du 6 — la mesure « touche »
  assert.doesNotThrow(() => un({ op: 'keyboard', target: 'z', key: '-', to: { id: 'six', text: '6' } }));
  // les lettres sont désormais sur le clavier : « z » est en colonne 2 en AZERTY…
  assert.doesNotThrow(() => un({ op: 'keyboard', target: 'z', key: 'z', mesure: 'colonne', to: { id: 'c', text: '2' } }));
  // … et en rangée 3 en QWERTY
  assert.doesNotThrow(() => un({ op: 'keyboard', target: 'z', key: 'z', mesure: 'rangee', layout: 'qwerty', to: { id: 'r', text: '3' } }));
  assert.throws(() => un({ op: 'keyboard', target: 'z', key: 'z', mesure: 'diagonale' }), /les trois mesures sont/);
  assert.throws(() => un({ op: 'keyboard', target: 'z', key: 'z', layout: 'bépo' }), /deux dispositions/);
});

test('★ keyboard : le nombre annoncé doit être celui que le clavier montre', () => {
  const tokens = [{ id: 'p', text: 'p', kind: 'letter' }];
  const un = (op) => compile(sc([{ id: 'a', title: 'A', ops: [op] }], tokens));
  // ★ le piège réel : « p » est en COLONNE 10, alors que la touche au-dessus de
  // lui porte « 0 ». Faire descendre le label de la touche mentirait.
  assert.doesNotThrow(() => un({ op: 'keyboard', target: 'p', key: 'p', mesure: 'colonne', to: { id: 'dix', text: '10' } }));
  assert.throws(
    () => un({ op: 'keyboard', target: 'p', key: 'p', mesure: 'colonne', to: { id: 'zero', text: '0' } }),
    /le clavier montre 10/,
  );
  // une lettre ne partage son chiffre avec personne : la mesure « touche » n'y
  // a pas de sens
  assert.throws(() => un({ op: 'keyboard', target: 'p', key: 'p', to: { id: 'x', text: '0' } }), /rangée du haut/);
});

test('keyboard : une touche inconnue dégrade au lieu de faire tomber la page', () => {
  const tokens = [{ id: 'k', text: '€', kind: 'punct' }];
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'keyboard', target: 'k', key: '€', to: { id: 'huit', text: '8' } }],
  }], tokens));
  assert.ok(tl.total > 0);
  assert.deepEqual(tl.warnings, []);
  assert.ok(!tl.nodes.some((n) => n.role === 'keyboard'), 'aucun clavier n’est montré');
  assert.ok(!tl.anims.some((a) => a.id === '@camera'), 'aucun mouvement de caméra');
  assert.ok(tl.nodes.some((n) => n.id === 'huit'), 'la substitution a bien lieu');
});

test('caméra : deux claviers — ou deux tables — dans un même step sont refusés', () => {
  const tokens = [{ id: 'a1', text: '-', kind: 'sep' }, { id: 'a2', text: '-', kind: 'sep' }];
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [
      { op: 'keyboard', target: 'a1', key: '-', to: { id: 's1', text: '6' } },
      { op: 'keyboard', target: 'a2', key: '-', to: { id: 's2', text: '6' } },
    ],
  }], tokens)), /Une par step/);

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [
      { op: 'table', ordre: 'a1z26', target: 'b1', to: { id: 's1', text: '8' } },
      { op: 'table', ordre: 'a1z26', target: 'b2', to: { id: 's2', text: '15' } },
    ],
  }], [{ id: 'b1', text: 'h', kind: 'letter' }, { id: 'b2', text: 'o', kind: 'letter' }])), /Une par step/);
});

test('toutes les animations sont sur des propriétés individuelles (règle 3)', () => {
  const tl = compile(SCENARIOS.vocabulaire);
  const props = new Set(tl.anims.map((a) => a.prop));
  assert.ok(!props.has('transform'), 'aucun transform composite');
  for (const p of props) {
    assert.ok(
      ['translate', 'rotate', 'scale', 'opacity', 'fill', 'stroke', 'strokeDashoffset', 'r'].includes(p),
      `propriété inattendue : ${p}`,
    );
  }
});

test('aucune animation ne déborde de la timeline', () => {
  const tl = compile(SCENARIOS.vocabulaire);
  for (const a of tl.anims) {
    assert.ok(a.delay >= 0, `delay négatif sur ${a.id}`);
    assert.ok(a.duration >= 1, `durée nulle sur ${a.id}:${a.prop}`);
    assert.ok(a.delay + a.duration <= tl.total + 0.001, `${a.id}:${a.prop} dépasse TOTAL`);
  }
  for (const d of tl.discrete) {
    assert.ok(d.at + d.dur <= tl.total + 0.001);
  }
});

test('la caméra est le seul objet zoomé — jamais le viewBox', () => {
  const tl = compile(SCENARIOS.methode6);
  const cam = tl.anims.filter((a) => a.id === '@camera');
  assert.ok(cam.length >= 2, 'keyboard doit dézoomer puis revenir');
  assert.ok(cam.every((a) => a.prop === 'scale' || a.prop === 'translate'));
});

test('un token « dropé » reste dans la liste des nœuds (jamais retiré du DOM)', () => {
  const tl = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'drop', targets: ['t0'] }] }]));
  assert.ok(tl.nodes.some((n) => n.id === 't0'), 't0 doit rester présent pour rester réversible par seek');
  assert.equal(tl.scene.get('t0').alive, false);
  assert.equal(tl.scene.flow.includes('t0'), false);
});

test('le compteur de somme est une fonction pure de u', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }, { id: 'n2', text: '16' }, { id: 'n3', text: '5' }];
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['n0', 'n1', 'n2', 'n3'], to: { id: 'r', text: '44' } }],
  }], tokens));
  const entry = tl.discrete.find((d) => d.channel === 'text');
  assert.ok(entry);
  // Le compteur part de zéro : c'est l'arrivée de chaque opérande dans la case
  // qui le fait monter, et le premier opérande n'y est pas encore.
  assert.equal(entry.render(0), '0');
  assert.equal(entry.render(1), '44');
  assert.equal(entry.render(0.5), entry.render(0.5), 'déterministe');
  // ★ Le compteur suit EXACTEMENT les atterrissages — un seuil par arrivée, pas
  // une division en parts égales de la durée de l'enregistrement. Il vaut donc
  // 0 tant que rien n'est arrivé dans la case, puis monte d'un opérande par
  // atterrissage, sans jamais reculer ni sauter une somme partielle.
  const lus = Array.from({ length: 21 }, (_, k) => entry.render(k / 20));
  assert.deepEqual([...new Set(lus)], ['0', '8', '23', '39', '44'],
    'les cinq valeurs, dans l’ordre, une par arrivée');
});

test('les durées par défaut du moteur visuel et leur miroir arithmétique coïncident', async () => {
  // `src/moteur/transformations/commun.js` recopie DEFAULT_DUR pour calculer
  // ses `at` (le moteur arithmétique ne dépend pas du moteur visuel). Deux
  // tables qui divergent, ce sont des gestes qui se remettent à se chevaucher.
  const { DUREE_OP } = await import('../../moteur/transformations/commun.js');
  assert.deepEqual(Object.keys(DUREE_OP).sort(), [...OP_NAMES].sort());
  for (const nom of OP_NAMES) {
    assert.equal(DUREE_OP[nom], DEFAULT_DUR[nom], `durée divergente pour « ${nom} »`);
  }
});

test('le plafond de rangées d’une table des restes et son miroir arithmétique coïncident', async () => {
  // Même raison que le test ci-dessus, sur une autre valeur : c'est l'ÉMETTEUR
  // qui décide de monter la table des restes ou de s'en passer, et c'est le
  // DESSIN qui sait à partir de combien de rangées elle cesse d'être lisible.
  // Deux plafonds qui divergent, c'est une table demandée qu'on ne saurait pas
  // rendre — ou un repli sur le geste sobre là où la table tenait très bien.
  const { MODULO_LIGNES_MAX: visuel } = await import('../assets.js');
  const { MODULO_LIGNES_MAX: arithmetique } = await import('../../moteur/transformations/posts.js');
  assert.equal(arithmetique, visuel, 'plafond de rangées divergent');
});

/* ═══════ Ce que la disparition du mode redites doit laisser derrière ═══════
 *
 * Il y avait ici quatorze tests : la signature alpha-équivalente d'un step, la
 * détection des redites, la règle des pas de bord, le plancher de durée, la
 * composition avec `speed`, l'absence d'état partagé entre deux lecteurs. Tous
 * gelaient une machinerie qui n'existe plus — le curseur de vitesse globale la
 * rend inutile, et le raisonnement complet est en tête de `src/visuel/compile.js`.
 *
 * Ce qui reste ici n'est pas le résidu de ce qui a été supprimé : ce sont les
 * promesses qui, elles, ne dépendaient PAS des redites et que ces tests étaient
 * seuls à couvrir — la cohérence des charnières, le déterminisme, le fait
 * qu'aucune animation ne déborde de la timeline. Les perdre en même temps que
 * la fonctionnalité aurait été une régression de couverture déguisée en
 * nettoyage.
 *
 * S'y ajoute le test de NON-RETOUR : rien ne s'accélère plus tout seul.
 */

/** Le même geste, TROIS fois — le squelette de « hope-hope-hope ». */
const troisGroupes = () => sc([
  {
    id: 's0',
    title: 'Traits continus — groupe 1',
    ops: [{ op: 'sevenSeg', target: 'a0', segments: 'bcefg', glyph: 'H', count: 3, to: { id: 'n0', text: '3' } }],
  },
  {
    id: 's1',
    title: 'Continuous strokes — group 2',   // libellé volontairement dans l'autre langue
    ops: [{ op: 'sevenSeg', target: 'b0', segments: 'bcefg', glyph: 'H', count: 3, to: { id: 'n1', text: '3' } }],
  },
  {
    id: 's2',
    title: 'Traits continus — groupe 3',
    ops: [{ op: 'sevenSeg', target: 'c0', segments: 'bcefg', glyph: 'H', count: 3, to: { id: 'n2', text: '3' } }],
  },
], [
  { id: 'a0', text: 'H', kind: 'letter' },
  { id: 'b0', text: 'H', kind: 'letter' },
  { id: 'c0', text: 'H', kind: 'letter' },
]);

/**
 * ★ LE TEST DE NON-RETOUR.
 *
 * Trois étapes rigoureusement identiques à un renommage de jetons près : c'est
 * exactement le motif que l'ancien détecteur reconnaissait, et sur lequel il
 * divisait par cinq la durée de celle du milieu. Elles doivent désormais durer
 * la même chose toutes les trois.
 *
 * Et le champ `accelerated` doit avoir DISPARU du step compilé, pas valoir
 * `false` : `transport.js` lisait `etapes[i].accelerated` pour rétrécir une
 * case de la jauge. Un champ qui survit à `false` est une invitation à ce que
 * quelqu'un le remette à `true` un jour, sans rien qui l'en empêche.
 */
test('★ le mode redites n’existe plus : trois gestes identiques durent pareil', () => {
  const tl = compile(troisGroupes());
  const [d0, d1, d2] = tl.steps.map((st) => st.duration);
  assert.equal(d0, d1, 'l’étape du milieu ne s’accélère plus');
  assert.equal(d1, d2);
  for (const st of tl.steps) {
    assert.ok(!('accelerated' in st), '« accelerated » doit avoir disparu du step, pas valoir false');
    assert.ok(!('repeatOf' in st), '« repeatOf » doit avoir disparu du step');
  }
  assert.ok(!('repeatSpeed' in tl), '« repeatSpeed » doit avoir disparu de la timeline');
});

/**
 * ★ Et une option `repeatSpeed` oubliée quelque part ne doit RIEN faire.
 *
 * Le contrat refuse une op hors vocabulaire, mais il a toujours toléré les
 * options de compilation inconnues — il n'y a pas de liste fermée d'options.
 * Une page qui passerait encore l'ancienne clé ne doit donc pas échouer : elle
 * doit être ignorée, et surtout ne pas se remettre à accélérer.
 */
test('★ une option « repeatSpeed » résiduelle est ignorée, sans effet ni erreur', () => {
  const ref = compile(troisGroupes());
  const avec = compile(troisGroupes(), { repeatSpeed: 5 });
  assert.deepEqual(avec.bounds, ref.bounds);
  assert.equal(avec.total, ref.total);
});

test('les charnières restent cohérentes : bounds, t0/t1 et TOTAL suivent', () => {
  const tl = compile(troisGroupes());
  assert.equal(tl.bounds[0], 0);
  assert.equal(tl.bounds.at(-1), tl.total);
  for (const st of tl.steps) {
    assert.equal(st.t0, tl.bounds[st.index]);
    assert.equal(st.t1, tl.bounds[st.index + 1]);
    assert.ok(st.duration >= MIN_STEP_DURATION, `step ${st.index} : ${st.duration} ms`);
  }
  for (let i = 1; i < tl.bounds.length; i++) {
    assert.ok(tl.bounds[i] - tl.bounds[i - 1] >= MIN_HINGE_GAP);
  }
});

test('aucune animation ne déborde de la timeline', () => {
  const tl = compile(troisGroupes());
  for (const a of tl.anims) {
    assert.ok(a.delay >= 0 && a.delay + a.duration <= tl.total + 1e-6,
      `animation hors bornes : ${a.id}/${a.prop}`);
  }
  for (const d of tl.discrete) {
    assert.ok(d.at >= 0 && d.at + d.dur <= tl.total + 1e-6, `discret hors bornes : ${d.key}`);
  }
});

test('la compilation reste déterministe : deux compilations identiques', () => {
  const a = compile(troisGroupes());
  const b = compile(troisGroupes());
  assert.deepEqual(a.bounds, b.bounds);
  assert.deepEqual(a.anims.map((x) => [x.id, x.prop, x.delay, x.duration]),
    b.anims.map((x) => [x.id, x.prop, x.delay, x.duration]));
});

/**
 * ★ `speed` SURVIT, elle, et c'est le seul multiplicateur de durées qui reste.
 *
 * Elle ne s'est jamais confondue avec celle des redites — l'une mettait toute
 * la timeline à l'échelle, l'autre ne touchait que les étapes reconnues comme
 * répétées. La seconde est partie ; il faut donc s'assurer que la première n'est
 * pas partie avec elle, par inadvertance de refactorisation.
 */
test('l’option « speed » met bien TOUTE la timeline à l’échelle', () => {
  const ref = compile(troisGroupes());
  const tl = compile(troisGroupes(), { speed: 2 });
  tl.steps.forEach((st, i) => {
    assert.ok(Math.abs(st.duration - ref.steps[i].duration / 2) < 1e-6,
      `step ${i} : ${st.duration} ms attendu ${ref.steps[i].duration / 2}`);
  });
});

test('une vitesse invalide est refusée', () => {
  assert.throws(() => compile(troisGroupes(), { speed: 0 }), CompileError);
  assert.throws(() => compile(troisGroupes(), { speed: -1 }), CompileError);
});
