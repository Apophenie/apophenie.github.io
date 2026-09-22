/**
 * ★ **LE RYTHME DES GESTES — « Pas à pas » ou « Simultané ».**
 *
 * Une promesse par test, et chacune est une promesse faite à l'auteur :
 *
 *  1. les deux modes rendent la MÊME arithmétique — seuls les instants changent ;
 *  2. en Pas à pas, deux gestes de même type ne se superposent JAMAIS ;
 *  3. en Simultané, ils partent à 0,1 s l'un de l'autre ;
 *  4. sauf s'ils touchent les mêmes caractères : ceux-là attendent leur tour ;
 *  5. l'ordre de lecture n'est jamais permuté, seulement décalé ;
 *  6. les marques accompagnent, elles n'opèrent pas ;
 *  7. les dépendances figées en nombres (`fadeAt`) suivent le décalage ;
 *  8. le défaut tient en UNE constante ;
 *  9. en mouvement réduit, il n'y a pas de rythme du tout.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import {
  ordonnerLesOps, empreinteDe, etendueDe, normaliserRythme,
  RYTHMES, RYTHME_DEFAUT, ONDE_SIMULTANE, MARQUES,
} from '../rythme.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { SCENARIOS } from '../fixtures/scenarios.js';
import { CompileError } from '../errors.js';
import { DEFAULT_DUR } from '../constants.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/* ── le cas d'école : plusieurs additions dans un même step ──────────────
 *
 * C'est la forme exacte de `moteur/transformations/mappeurs.js ›
 * etapeDAdditions`, celle que l'auteur a relevée sur
 * `?sce!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR` : un écartement commun, PLUSIEURS
 * sommes au même instant sur des paires disjointes, puis un `move` qui referme
 * la ligne. Reproduite en petit pour que le test dise POURQUOI il échoue quand
 * il échoue, au lieu de désigner la 15ᵉ étape d'une démonstration de 29.
 */
const I = 700;   // DEFAULT_DUR.insertOperators
const S = 2800;  // DEFAULT_DUR.sum

const troisAdditions = () => ({
  version: 1,
  tokens: [
    { id: 'a', text: '1', kind: 'number' }, { id: 'b', text: '2', kind: 'number' },
    { id: 'c', text: '3', kind: 'number' }, { id: 'd', text: '4', kind: 'number' },
    { id: 'e', text: '5', kind: 'number' }, { id: 'f', text: '6', kind: 'number' },
  ],
  steps: [{
    id: 's0',
    title: 'Additions sans reste',
    ops: [
      { op: 'insertOperators',
        lots: [{ between: ['a', 'b'], ids: ['p1'] }, { between: ['c', 'd'], ids: ['p2'] },
          { between: ['e', 'f'], ids: ['p3'] }],
        glyph: '+', at: 0 },
      { op: 'sum', targets: ['a', 'b'], consume: ['p1'], to: { id: 'r1', text: '3', kind: 'number' }, symbol: '+', garderPlace: true, at: I },
      { op: 'sum', targets: ['c', 'd'], consume: ['p2'], to: { id: 'r2', text: '7', kind: 'number' }, symbol: '+', garderPlace: true, at: I },
      { op: 'sum', targets: ['e', 'f'], consume: ['p3'], to: { id: 'r3', text: '11', kind: 'number' }, symbol: '+', garderPlace: true, at: I },
      { op: 'move', at: I + S, attendre: 300, dur: DEFAULT_DUR.move + 300, retirer: true },
    ],
  }],
});

/** Les fenêtres `[début, fin]` des ops d'un step, par type, sous un rythme. */
function fenetres(step, rythme) {
  const par = new Map();
  for (const e of ordonnerLesOps(step, { rythme })) {
    const nom = e.op.op;
    if (!par.has(nom)) par.set(nom, []);
    par.get(nom).push({ i: e.i, debut: e.at, fin: e.at + etendueDe(e.op) });
  }
  return par;
}

/* ═════════════════ 1. La même arithmétique dans les deux modes ═══════════ */

/**
 * ★ **LE MODE NE CHANGE QUE L'ORDONNANCEMENT.**
 *
 * C'est la contrainte la plus dure du chantier, et celle qu'un test doit tenir
 * plutôt qu'un commentaire : « le mode ne doit changer QUE l'ordonnancement et
 * la disposition, jamais l'arithmétique ». On compare donc tout ce qui n'est pas
 * un instant — les jetons et leurs textes, les étapes et leurs titres, et les
 * VALEURS de chaque animation — et on exige l'égalité stricte.
 */
test('★ rythme — les deux modes rendent exactement la même arithmétique', () => {
  const cas = { ...SCENARIOS, troisAdditions: troisAdditions() };
  for (const [nom, scenario] of Object.entries(cas)) {
    const pas = compile(scenario, { rythme: 'pasAPas' });
    const sim = compile(scenario, { rythme: 'simultane' });

    assert.deepEqual(
      sim.nodes.map((n) => [n.id, n.text, n.role]),
      pas.nodes.map((n) => [n.id, n.text, n.role]),
      `${nom} : les jetons diffèrent d'un mode à l'autre`);
    assert.deepEqual(
      sim.steps.map((st) => [st.id, JSON.stringify(st.title)]),
      pas.steps.map((st) => [st.id, JSON.stringify(st.title)]),
      `${nom} : les étapes diffèrent`);

    // Les animations : mêmes couples (jeton, canal), mêmes valeurs d'arrivée.
    // L'instant, lui, a le droit de changer — c'est tout l'objet du réglage.
    const valeurs = (tl) => tl.anims
      .map((a) => `${a.id}::${a.prop}::${JSON.stringify(a.keyframes.map((k) => k.value))}`)
      .sort();
    assert.deepEqual(valeurs(sim), valeurs(pas), `${nom} : une valeur d'arrivée a bougé`);
  }
});

/* ═══════════════ 2. Pas à pas : aucun recouvrement de même type ══════════ */

/**
 * > « Tu fais plusieurs additions en parallèle au lieu de les faire les unes
 * >   après les autres, ce que j'ai interdit. » (l'auteur)
 *
 * MESURÉ avant correction sur `?sce!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR` : dix-sept
 * recouvrements, et jusqu'à SEPT sommes strictement simultanées dans la 15ᵉ
 * étape. Le test porte sur les fixtures ET sur le cas d'école reproduit
 * ci-dessus ; la garde sur les vraies démonstrations est dans
 * `recherche/tests/lents/integration-visuel.test.js`.
 */
test('★ rythme — en Pas à pas, deux gestes de même type ne se superposent jamais', () => {
  const cas = { ...SCENARIOS, troisAdditions: troisAdditions() };
  let mesures = 0;
  for (const [nom, scenario] of Object.entries(cas)) {
    for (const step of scenario.steps) {
      for (const [type, list] of fenetres(step, 'pasAPas')) {
        if (MARQUES.has(type)) continue;   // une marque accompagne, elle n'opère pas
        list.sort((a, b) => a.debut - b.debut);
        for (let k = 1; k < list.length; k++) {
          mesures++;
          assert.ok(list[k].debut >= list[k - 1].fin - 1e-9,
            `${nom} / ${step.id} : deux « ${type} » se superposent — `
            + `[${list[k - 1].debut}, ${list[k - 1].fin}] et [${list[k].debut}, ${list[k].fin}]`);
        }
      }
    }
  }
  assert.ok(mesures > 0, 'aucune paire de gestes de même type mesurée : le test ne garde rien');
});

test('★ rythme — les trois additions du cas d’école s’enchaînent, et le « move » suit', () => {
  const [step] = troisAdditions().steps;
  const par = fenetres(step, 'pasAPas');
  assert.deepEqual(par.get('sum').map((f) => f.debut), [I, I + S, I + 2 * S],
    'les trois sommes se suivent, séparées de leur durée exacte');
  // ★ Ce que `decalage` existe pour tenir : le `move` de fermeture est écrit à
  //   3 500 ms pour tomber juste après une vague UNIQUE. Sérialiser sans le
  //   pousser le ferait refermer la ligne pendant la deuxième addition.
  assert.equal(par.get('move')[0].debut, I + 3 * S,
    'le « move » referme la ligne APRÈS la dernière somme, pas au milieu');
});

/* ═════════════ 3 et 4. Simultané : la vague, et ce qui l'interrompt ══════ */

test('★ rythme — en Simultané, les gestes disjoints partent à 0,1 s l’un de l’autre', () => {
  const [step] = troisAdditions().steps;
  const par = fenetres(step, 'simultane');
  assert.equal(ONDE_SIMULTANE, 100, 'l’onde demandée est de 0,1 s');
  assert.deepEqual(par.get('sum').map((f) => f.debut),
    [I, I + ONDE_SIMULTANE, I + 2 * ONDE_SIMULTANE],
    'trois départs en vague, un dixième de seconde d’écart');
  // La vague finit avec son dernier membre, et le `move` l'attend.
  assert.equal(par.get('move')[0].debut, I + 2 * ONDE_SIMULTANE + S);
});

/**
 * ★ **DEUX GESTES QUI TOUCHENT LE MÊME CARACTÈRE NE PARTENT PAS ENSEMBLE.**
 *
 * C'est la moitié de la consigne qu'on oublierait le plus facilement : « toutes
 * les opérations de même type **qui ne touchent PAS les mêmes caractères** ».
 * Deux sommes qui se disputent un jeton l'animeraient deux fois sur le même
 * canal — ce que le compilateur signale déjà comme « animations concurrentes »,
 * et ce qui, à l'écran, est un jeton qui part dans deux directions.
 */
test('★ rythme — en Simultané, deux gestes sur le MÊME caractère attendent leur tour', () => {
  const scenario = troisAdditions();
  const [step] = scenario.steps;
  // La troisième somme reprend « c », déjà pris par la deuxième.
  step.ops[3] = { ...step.ops[3], targets: ['c', 'f'] };
  const par = fenetres(step, 'simultane');
  const sommes = par.get('sum');
  assert.equal(sommes[0].debut, I);
  assert.equal(sommes[1].debut, I + ONDE_SIMULTANE, 'la deuxième est disjointe : elle rejoint la vague');
  assert.ok(sommes[2].debut >= sommes[1].fin - 1e-9,
    `la troisième touche « c » : elle ouvre une vague neuve, vu ${sommes[2].debut}`);
});

/* ═══════════════════ 5. L'ordre de lecture est préservé ══════════════════ */

/**
 * Réordonner n'est jamais PERMUTER. Le scénario dit une suite de gestes, et
 * cette suite porte le raisonnement qu'on démontre : une addition qui passerait
 * devant celle dont elle consomme le résultat ne serait pas « un autre rythme »,
 * ce serait une autre démonstration — et fausse.
 */
test('★ rythme — l’ordre de lecture n’est jamais permuté, seulement décalé', () => {
  const cas = { ...SCENARIOS, troisAdditions: troisAdditions() };
  for (const rythme of RYTHMES) {
    for (const [nom, scenario] of Object.entries(cas)) {
      for (const step of scenario.steps) {
        const avant = (step.ops || []).map((op, i) => ({ op, i }))
          .sort((a, b) => (a.op.at ?? 0) - (b.op.at ?? 0) || a.i - b.i)
          .map((e) => e.i);
        const apres = ordonnerLesOps(step, { rythme }).map((e) => e.i);
        assert.deepEqual(apres, avant,
          `${nom} / ${step.id} en ${rythme} : l’ordre de lecture a changé`);
      }
    }
  }
});

/* ═══════════════════════ 6. Les marques accompagnent ═════════════════════ */

/**
 * MESURÉ sur `cmm` (l'écart entre le plus grand et le plus petit) : deux
 * `annotate` posent « MAX » et « MIN » au même instant, chacune sur son nombre,
 * chacune durant 4,6 s. Les sérialiser posait « MIN » quatre secondes et demie
 * après « MAX », et repoussait d'autant la soustraction elle-même.
 */
test('★ rythme — une marque ne crée aucun décalage, mais elle reçoit celui des autres', () => {
  const step = {
    id: 's',
    title: 'deux étiquettes et deux sommes',
    ops: [
      { op: 'annotate', anchor: 'a', text: 'MAX', at: 0, dur: 4000 },
      { op: 'annotate', anchor: 'b', text: 'MIN', at: 0, dur: 4000 },
      { op: 'sum', targets: ['a', 'b'], to: { id: 'r1', text: '3' }, at: 0 },
      { op: 'sum', targets: ['c', 'd'], to: { id: 'r2', text: '7' }, at: 0 },
      { op: 'annotate', anchor: 'r2', text: 'fin', at: 100, dur: 400 },
    ],
  };
  const par = fenetres(step, 'pasAPas');
  assert.deepEqual(par.get('annotate').slice(0, 2).map((f) => f.debut), [0, 0],
    'deux étiquettes posées ensemble le restent — elles désignent, elles n’opèrent pas');
  assert.deepEqual(par.get('sum').map((f) => f.debut), [0, DEFAULT_DUR.sum],
    'les deux sommes, elles, s’enchaînent');
  // La troisième étiquette, écrite APRÈS la seconde somme, recule avec elle.
  const derniere = par.get('annotate').at(-1);
  assert.equal(derniere.debut, 100 + DEFAULT_DUR.sum,
    'une marque écrite après un geste décalé recule d’autant');
});

test('★ rythme — la liste des marques est celle des ops qui ne refont pas la mise en page', () => {
  // Le jumelage avec `recherche/scenario.js › SANS_LAYOUT` est vérifié dans la
  // suite lente (les deux modules ne se connaissent pas, CONTRACTS §1).
  assert.deepEqual([...MARQUES].sort(),
    ['annotate', 'dim', 'highlight', 'horns', 'pulse', 'reveal', 'wait']);
});

/* ═══════════════════════════ 7. `fadeAt` suit ════════════════════════════ */

/**
 * ★ `fadeAt` n'est pas un réglage, c'est une DÉPENDANCE figée en nombre par
 *   `moteur/transformations/commun.js › retirerAccolade` : « l'accolade
 *   s'efface quand l'action est finie ». Décaler l'action sans le décaler la
 *   fait s'effacer au milieu.
 *
 *   MESURÉ avant correction : sur `fart`, effacement à 2 700 ms pour une action
 *   finissant à 4 000 ; sur `fi`, à 5 100 ms pour une action finissant à 10 900.
 *   La garde de routine `fin-des-accolades.test.js` le voyait, et c'est elle qui
 *   a imposé ce report.
 */
test('★ rythme — `fadeAt` suit le décalage, et l’accolade ne s’efface jamais trop tôt', () => {
  const step = {
    id: 's',
    title: 'deux accolades et une chute',
    ops: [
      { op: 'group', targets: ['a', 'b'], at: 0, dur: 1300, fadeAt: 2700 },
      { op: 'group', targets: ['c', 'd'], at: 0, dur: 1300 },
      { op: 'drop', targets: ['a', 'b', 'c', 'd'], at: 1300, dur: 1400 },
      { op: 'move', at: 2700, dur: 900 },
    ],
  };
  const plan = ordonnerLesOps(step, { rythme: 'pasAPas' });
  const finAction = Math.max(...plan.map((e) => e.at + etendueDe(e.op)));
  const accolade = plan.find((e) => e.op.fadeAt !== undefined);
  const efface = accolade.at + accolade.fadeAt;
  assert.equal(accolade.fadeAt, 4000, 'le report vaut le décalage total du step');
  assert.ok(efface + 900 >= finAction,
    `l’accolade s’efface à ${efface} ms, l’action finit à ${finAction} ms`);
  // En Simultané, les deux accolades sont disjointes : la seconde rejoint la
  // vague et part 0,1 s après la première. Le step s'allonge donc de 0,1 s —
  // et `fadeAt` suit cela aussi. Le report n'est pas réservé au Pas à pas :
  // c'est une dépendance, elle suit tout décalage, si petit soit-il.
  const sim = ordonnerLesOps(step, { rythme: 'simultane' });
  assert.equal(sim.find((e) => e.op.fadeAt !== undefined).fadeAt, 2700 + ONDE_SIMULTANE);
});

/* ═════════════════════ 8 et 9. Le défaut, et le mode réduit ══════════════ */

/**
 * > « Quand ça sera au point, on passera probablement en parallèle/par lots par
 * >   défaut, et séquentiel/pas à pas sur demande. » (l'auteur)
 *
 * Ce test ne gèle PAS la valeur du défaut — ce serait travailler contre le
 * changement annoncé. Il gèle le fait qu'il n'y en ait qu'UN SEUL endroit :
 * `compile()` sans option doit rendre exactement ce que rend `compile()` avec
 * `RYTHME_DEFAUT`, quelle que soit la valeur de cette constante. Changer la
 * ligne suffira donc, et ce test restera vert en le prouvant.
 */
test('★ rythme — le défaut tient en UNE constante, et rien ne le recopie', () => {
  assert.ok(RYTHMES.includes(RYTHME_DEFAUT), 'le défaut doit être un rythme connu');
  const scenario = troisAdditions();
  const sans = compile(scenario);
  const avec = compile(scenario, { rythme: RYTHME_DEFAUT });
  assert.deepEqual(sans.bounds, avec.bounds);
  assert.equal(sans.rythme, RYTHME_DEFAUT);
  assert.equal(normaliserRythme(undefined), RYTHME_DEFAUT);
  assert.equal(normaliserRythme(null), RYTHME_DEFAUT);
  // Et l'AUTRE mode doit réellement donner autre chose, sinon le test ci-dessus
  // passerait pour de mauvaises raisons.
  const autre = RYTHMES.find((r) => r !== RYTHME_DEFAUT);
  assert.notDeepEqual(compile(scenario, { rythme: autre }).bounds, sans.bounds);
});

test('★ rythme — un rythme inconnu est refusé, pas ignoré en silence', () => {
  assert.throws(() => compile(troisAdditions(), { rythme: 'parallele' }), CompileError);
  assert.throws(() => normaliserRythme('sequentiel'), CompileError);
});

/**
 * ⚠️ **PAS DE RYTHME POUR UNE IMAGE FIXE.** Sous `prefers-reduced-motion` ou
 *   sans WAAPI, le moteur ne joue rien : il pose l'état d'arrivée. Ordonner des
 *   gestes qui n'ont pas lieu serait un calcul sans objet, et la barre de
 *   transport retire le bouton pour la même raison (`app/transport.js`).
 */
test('★ rythme — en mouvement réduit, il n’y a pas de rythme du tout', () => {
  const a = compile(troisAdditions(), { reduced: true, rythme: 'pasAPas' });
  const b = compile(troisAdditions(), { reduced: true, rythme: 'simultane' });
  assert.deepEqual(a.bounds, b.bounds);
  assert.equal(a.rythme, null, 'la timeline ne doit pas prétendre avoir un rythme');
  assert.equal(b.rythme, null);
});

/* ══════════════════════════════ L'empreinte ══════════════════════════════ */

test('★ rythme — l’empreinte lit les cibles ET les jetons produits', () => {
  const emp = empreinteDe({
    op: 'sum', targets: ['a', 'b'], consume: ['p1'], to: { id: 'r1', text: '3' },
  });
  assert.deepEqual([...emp].sort(), ['a', 'b', 'p1', 'r1']);
});

/**
 * Un sélecteur déclaratif ne nomme aucun id : on ne peut pas savoir ce qu'il
 * touche, donc on suppose qu'il touche tout. Le doute se tranche du côté qui ne
 * casse rien — une op universelle ne rejoint jamais une vague.
 */
test('★ rythme — un sélecteur déclaratif vaut « partout », donc jamais en vague', () => {
  const step = {
    id: 's',
    title: 'un estompage global et deux chutes',
    ops: [
      { op: 'drop', targets: ['a'], at: 0 },
      { op: 'drop', targets: { all: true }, at: 0 },
      { op: 'drop', targets: ['b'], at: 0 },
    ],
  };
  const chutes = fenetres(step, 'simultane').get('drop');
  assert.equal(chutes[1].debut, chutes[0].fin,
    'le sélecteur global attend la fin de la vague en cours');
  assert.ok(chutes[2].debut >= chutes[1].fin - 1e-9,
    'et rien ne le rejoint : la vague suivante repart après lui');
});

/**
 * ★ Le `stagger` COMPTE dans l'étendue, et c'est le même calcul que celui de
 *   l'émetteur (`moteur/transformations/commun.js › enchainer`). Une
 *   substitution de douze caractères décalés de 90 ms ne dure pas 1 100 ms mais
 *   2 090 : la croire finie au bout de 1 100 ferait démarrer la suivante
 *   par-dessus ses trois derniers caractères.
 */
test('★ rythme — l’étendue d’une op tient compte de son « stagger »', () => {
  const pairs = Array.from({ length: 12 }, (_, i) => ({ target: `t${i}`, to: { id: `u${i}`, text: 'x' } }));
  assert.equal(etendueDe({ op: 'substitute', pairs, dur: 1100, stagger: 90 }), 1100 + 90 * 11);
  assert.equal(etendueDe({ op: 'substitute', pairs, dur: 1100 }), 1100);
});
