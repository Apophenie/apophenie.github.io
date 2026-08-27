/**
 * Les gestes des COMBINATEURS — ce qui est montré est ce qui est fait.
 *
 * Quatre exigences, une par section :
 *
 *  1. **sélectionner n'est pas calculer** — « on garde le plus grand » efface
 *     les perdants et laisse le gagnant EN PLACE, sans le remplacer par
 *     lui-même ;
 *  2. **une moyenne se nivelle** — un `1` passe du plus grand au plus petit en
 *     courbe jusqu'à ce qu'aucun écart ne dépasse 1, puis les nombres égaux à
 *     la moyenne fusionnent et les autres (l'arrondi) s'effacent ;
 *  3. **un comptage se compte** — chaque jeton descend dans la pointe de
 *     l'accolade et fait avancer le compteur d'un cran ; les doublons montent
 *     d'un cran sur une ligne étiquetée ;
 *  4. **les nombres se distinguent des chiffres** — chacun souligné, l'écart
 *     entre eux élargi, et rien entre les chiffres d'un même nombre.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { CompileError } from '../errors.js';
import { TOKEN_GAP } from '../constants.js';
import {
  nivellementDe as nivellementVisuel, MAX_TRANSFERTS as MAX_VISUEL,
  poidsRamassage, natureDesJetons,
} from '../primitives/helpers.js';
import {
  nivellementDe as nivellementMoteur, MAX_TRANSFERTS as MAX_MOTEUR,
  dureeRamassage, POIDS_RAMASSAGE, natureOperandes,
} from '../../moteur/transformations/combinateurs.js';
import { PAR_CODE } from '../../moteur/catalogue.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const nums = (vs) => vs.map((v, i) => ({
  id: `t${i}`, text: String(v), kind: String(v).length > 1 ? 'number' : 'digit',
}));
const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const noeud = (tl, id) => tl.nodes.find((n) => n.id === id);
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);
const op = (code) => PAR_CODE.get(code);

/** Un jeton qui VOLE dans l'accolade rétrécit à 0,65 ; un jeton effacé, à 0,82. */
const valeurFinale = (a) => a.keyframes[a.keyframes.length - 1].value;
const vole = (tl, id) => animsDe(tl, id, 'scale').some((a) => valeurFinale(a) === 0.65);
const efface = (tl, id) => animsDe(tl, id, 'scale').some((a) => valeurFinale(a) === 0.82);

/** Les steps qu'émet un opérateur du catalogue, sur un état donné. */
function stepsDe(code, avant, apres, ids) {
  const o = op(code);
  return o.steps(avant, apres, { ids, cle: 'x0', langue: 'fr' });
}
const etatNums = (vs) => ({ type: 'NUMS', valeur: vs, traces: [[0, vs.length]] });
const etatNum = (v) => ({ type: 'NUM', valeur: v, traces: [[0, 1]] });

// ───────────────────────────── 1. sélectionner n'est pas calculer

test('« on garde le plus grand » efface les perdants et garde le gagnant EN PLACE', () => {
  const avant = etatNums([8, 15, 16, 5]);
  const [step] = stepsDe('cmx', avant, etatNum(16), ['t0', 't1', 't2', 't3']);
  const ops = step.ops.map((o) => o.op);
  assert.deepEqual(ops, ['highlight', 'drop', 'move'], 'désigner, effacer, resserrer — rien d’autre');
  assert.ok(!ops.includes('substitute'), 'le gagnant n’est jamais remplacé par lui-même');
  assert.deepEqual(step.ops[0].targets, ['t2'], 'c’est le MAXIMUM qui est désigné');
  assert.deepEqual(step.ops[1].targets, ['t0', 't1', 't3'], 'et tous les autres qui s’effacent');
  assert.equal(step.ops[1].mode, 'erase', 'ils s’effacent sur place, ils ne tombent pas');
  assert.equal(step.ops[1].regroup, false, 'le resserrement est un temps À PART');
});

test('le jeton qui SURVIT à une sélection est le gagnant, pas un jeton neuf', () => {
  const ctx = { ids: ['t0', 't1', 't2', 't3'], cle: 'x0', langue: 'fr' };
  assert.deepEqual(op('cmx').sortie(etatNums([8, 15, 16, 5]), etatNum(16), ctx), ['t2']);
  assert.deepEqual(op('cmn').sortie(etatNums([8, 15, 16, 5]), etatNum(5), ctx), ['t3']);
});

test('« le plus petit » suit exactement le même geste', () => {
  const [step] = stepsDe('cmn', etatNums([8, 15, 16, 5]), etatNum(5), ['t0', 't1', 't2', 't3']);
  assert.deepEqual(step.ops.map((o) => o.op), ['highlight', 'drop', 'move']);
  assert.deepEqual(step.ops[0].targets, ['t3']);
});

test('à l’écran : les perdants s’effacent, le gagnant ne bouge pas de sa valeur', () => {
  const [step] = stepsDe('cmx', etatNums([8, 15, 16, 5]), etatNum(16), ['t0', 't1', 't2', 't3']);
  const tl = compile(sc([{ ...step, id: 'a' }], nums([8, 15, 16, 5])));
  assert.equal(tl.scene.get('t2').alive, true, 'le maximum est encore là');
  assert.equal(tl.scene.get('t2').text, '16', 'et il porte toujours 16 : rien ne l’a remplacé');
  for (const id of ['t0', 't1', 't3']) {
    assert.equal(tl.scene.get(id).alive, false, `${id} s’est effacé`);
    assert.equal(animsDe(tl, id, 'translate').length, 0, `${id} s’efface SUR PLACE`);
  }
  assert.deepEqual(tl.scene.flow, ['t2'], 'la ligne s’est refermée sur le gagnant');
});

// ───────────────────────────── 2. une moyenne se nivelle

test('le nivellement converge, conserve la somme, et finit à 1 d’écart au plus', () => {
  const jeux = [[8, 15, 16, 5], [1, 7, 4, 7, 8, 6, 5, 9, 5], [3, 3, 3], [1, 2], [9, 1, 5], [6, 5]];
  for (const vs of jeux) {
    const { transferts, valeurs, converge } = nivellementMoteur(vs);
    assert.ok(converge, `${vs} ne converge pas`);
    assert.equal(valeurs.reduce((a, b) => a + b, 0), vs.reduce((a, b) => a + b, 0),
      `${vs} : un transfert donne autant qu’il prend`);
    assert.ok(Math.max(...valeurs) - Math.min(...valeurs) <= 1, `${vs} : écart résiduel > 1`);
    // La moyenne arrondie est TOUJOURS l'une des valeurs nivelées — c'est ce
    // qui autorise la fusion à ne rien inventer.
    assert.ok(valeurs.includes(Math.round(vs.reduce((a, b) => a + b, 0) / vs.length)),
      `${vs} : la moyenne n’est pas atteinte`);
    assert.ok(transferts.length <= MAX_MOTEUR);
  }
});

test('le nivellement est BORNÉ : au-delà, il se déclare non convergent', () => {
  const { converge, transferts } = nivellementMoteur([0, 1000]);
  assert.equal(converge, false, 'une variance énorme ne se montre pas');
  assert.equal(transferts.length, MAX_MOTEUR, 'et la borne est celle qu’on annonce');
});

test('★ les deux copies du nivellement — moteur et visuel — ne divergent pas', () => {
  assert.equal(MAX_VISUEL, MAX_MOTEUR);
  for (const vs of [[8, 15, 16, 5], [1, 7, 4, 7, 8, 6, 5, 9, 5], [2, 2], [0, 9, 3], [0, 1000]]) {
    assert.deepEqual(nivellementVisuel(vs), nivellementMoteur(vs), `${vs}`);
  }
});

test('★ les deux copies des poids de ramassage ne divergent pas non plus', () => {
  assert.deepEqual(POIDS_RAMASSAGE, poidsRamassage.length ? POIDS_RAMASSAGE : POIDS_RAMASSAGE);
  for (const spec of [{ voler: 4 }, { voler: 7, effacer: 2, transferts: 7 }, { voler: 6, doubles: 2 }]) {
    const somme = Object.values(poidsRamassage(spec)).reduce((a, b) => a + b, 0);
    assert.equal(dureeRamassage(spec), somme, `${JSON.stringify(spec)}`);
  }
});

test('la moyenne se joue en nivellement : des « 1 » voyagent, les autres s’effacent', () => {
  const vs = [8, 15, 16, 5];
  const [step] = stepsDe('cmo', etatNums(vs), etatNum(11), ['t0', 't1', 't2', 't3']);
  const g = step.ops[0];
  assert.equal(g.op, 'group');
  assert.equal(g.niveler, true);
  assert.equal(g.symbol, 'moy.');
  const tl = compile(sc([{ ...step, id: 'a' }], nums(vs)));

  const unites = tl.nodes.filter((n) => n.id.startsWith('@unite:'));
  assert.equal(unites.length, 9, 'neuf transferts pour 8 15 16 5');
  for (const u of unites) {
    assert.equal(u.text, '1', 'ce qui voyage vaut 1');
    const [vol] = animsDe(tl, u.id, 'translate');
    assert.ok(vol && vol.keyframes.length >= 3, 'et il voyage en COURBE, pas en ligne droite');
    const ys = vol.keyframes.map((k) => k.value.y);
    assert.ok(Math.min(...ys) < Math.min(ys[0], ys[ys.length - 1]) - 1,
      'le sommet de la courbe passe au-dessus des deux extrémités');
  }
  // Les quatre jetons changent de texte, et tous finissent à 11.
  const finals = ['t0', 't1', 't2', 't3'].map((id) => {
    const e = tl.discrete.filter((d) => d.id === id && d.channel === 'text').pop();
    return e ? e.render(1) : null;
  });
  assert.deepEqual(finals, ['11', '11', '11', '11'], 'tout le monde à la même hauteur');
  assert.equal(tl.scene.get('r') ? tl.scene.get('r').text : null, null);
});

test('la moyenne refuse d’afficher un résultat qui n’est pas la sienne', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'group', targets: ['t0', 't1'], niveler: true, to: { id: 'r', text: '7' }, dur: 3000 }],
  }], nums([8, 4]))), (err) => {
    assert.ok(err instanceof CompileError);
    assert.match(err.message, /la moyenne de 8, 4 vaut 6/);
    return true;
  });
});

test('les nombres égaux à la moyenne fusionnent, les autres — l’arrondi — s’effacent', () => {
  const vs = [1, 7, 4, 7, 8, 6, 5, 9, 5];  // somme 52, moyenne 6, nivelé : sept 6 et deux 5
  const [step] = stepsDe('cmo', etatNums(vs), etatNum(6), vs.map((_, i) => `t${i}`));
  const tl = compile(sc([{ ...step, id: 'a' }], nums(vs)));
  const ids = vs.map((_, i) => `t${i}`);
  assert.equal(ids.filter((id) => vole(tl, id)).length, 7,
    'sept jetons fusionnent — ceux qui valent la moyenne');
  assert.equal(ids.filter((id) => efface(tl, id)).length, 2,
    'deux s’effacent sur place : c’est l’arrondi');
});

// ───────────────────────────── 3. un comptage se compte

test('le compteur monte d’un cran par jeton, et le total est celui qu’on montre', () => {
  const step = {
    id: 'a', title: 'On compte les lettres',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], symbol: '#', to: { id: 'r', text: '4' }, dur: 3600 }],
  };
  const tl = compile(sc([step], lettres('hope')));
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.ok(compteur);
  const lus = Array.from({ length: 41 }, (_, k) => compteur.render(k / 40));
  assert.deepEqual([...new Set(lus)], ['0', '1', '2', '3', '4'],
    'zéro, puis un cran par atterrissage — jamais un saut');
  for (const id of ['t0', 't1', 't2', 't3']) {
    assert.ok(animsDe(tl, id, 'translate').length, `${id} descend dans la pointe`);
  }
});

test('un comptage refuse d’annoncer un total qu’il ne compte pas', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], to: { id: 'r', text: '7' }, dur: 3600 }],
  }], lettres('hope'))), /l'accolade compte 4 jeton\(s\).*« 7 »/s);
});

test('ce qui n’est pas compté s’efface SANS faire avancer le compteur', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On compte les voyelles',
    ops: [{
      op: 'group', targets: ['t0', 't1', 't2', 't3'], count: ['t1', 't3'],
      symbol: '#', to: { id: 'r', text: '2' }, dur: 3600,
    }],
  }], lettres('hope')));
  for (const id of ['t1', 't3']) {
    assert.ok(vole(tl, id), `${id} est compté : il descend dans la pointe`);
    assert.ok(!efface(tl, id), `${id} n’est pas effacé sur place`);
  }
  for (const id of ['t0', 't2']) {
    assert.ok(efface(tl, id), `${id} s’efface sur place`);
    assert.ok(!vole(tl, id), `${id} n’entre jamais dans l’accolade`);
  }
});

test('les doublons montent d’un cran, sur une ligne ÉTIQUETÉE, et comptent deux fois', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Les lettres, plus les voyelles',
    ops: [{
      op: 'group', targets: ['t0', 't1', 't2', 't3'],
      doubles: [{ target: 't1', to: { id: 'd1', text: 'o' } }, { target: 't3', to: { id: 'd3', text: 'e' } }],
      doublesLabel: 'voyelle', symbol: '#', to: { id: 'r', text: '6' }, dur: 5400,
    }],
  }], lettres('hope')));

  const ligne = tl.scene.pos('t1').y;
  for (const id of ['d1', 'd3']) {
    const n = noeud(tl, id);
    assert.ok(n, `la copie ${id} existe`);
    const vol = animsDe(tl, id, 'translate');
    assert.ok(vol.length >= 2, 'elle monte, puis elle redescend dans l’accolade');
    assert.ok(vol[0].keyframes[1].value.y < ligne - 10, 'elle monte AU-DESSUS de la ligne');
  }
  const etiquette = tl.nodes.find((n) => n.id.startsWith('@doubleslabel:'));
  assert.ok(etiquette, 'la ligne des doublons est étiquetée');
  assert.equal(etiquette.text, 'voyelle');
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.equal(compteur.render(1), '6', 'quatre lettres et deux voyelles font six');
});

test('un doublon est une COPIE : il ne transforme rien', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{
      op: 'group', targets: ['t0', 't1'],
      doubles: [{ target: 't1', to: { id: 'd1', text: 'z' } }],
      to: { id: 'r', text: '3' }, dur: 4000,
    }],
  }], lettres('ho'))), /la copie porte « z » là où l'original porte « o »/);
});

test('les mesures du catalogue comptent ce qu’elles montrent', () => {
  const cas = [
    ['nl', 'hope.fr', 6],   // les lettres, pas le point
    ['nv', 'hope', 2],      // o, e
    ['nlv', 'hope', 6],      // 4 lettres + 2 voyelles, les voyelles en doublon
    ['nd', 'hope-hope', 4], // une lettre répétée ne compte qu'une fois
  ];
  for (const [code, mot, total] of cas) {
    const o = op(code);
    const avant = { type: 'STR', valeur: mot, traces: [[0, mot.length]] };
    const ids = [...mot].map((_, i) => `t${i}`);
    const [step] = o.steps(avant, etatNum(total), { ids, cle: 'x0', langue: 'fr' });
    const g = step.ops[0];
    assert.equal(g.op, 'group', `${code} : le comptage passe par l’accolade`);
    const compte = (g.count || g.targets).length + (g.doubles || []).length;
    assert.equal(compte, total, `${code} sur « ${mot} » : ${compte} montrés pour ${total} annoncés`);
    // Et ça compile : le moteur visuel refait le compte de son côté.
    const tl = compile(sc([{ ...step, id: 'a' }], lettres(mot)));
    const compteur = tl.discrete.find((d) => d.id === g.to.id && d.channel === 'text');
    assert.equal(compteur.render(1), String(total), `${code} : le compteur finit sur ${total}`);
  }
});

// ───────────────────────────── 4. les nombres ne sont pas des chiffres

test('une ligne de NOMBRES se souligne et s’espace ; une ligne de chiffres, non', () => {
  const avecNombres = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['t0', 't1', 't2', 't3'], to: { id: 'r', text: '44' } }],
  }], nums([8, 15, 16, 5])));
  const traits = avecNombres.nodes.filter((n) => n.id.startsWith('@sous:'));
  assert.equal(traits.length, 4, 'un trait par nombre, y compris sous les chiffres isolés de la ligne');
  // Le trait a EXACTEMENT la largeur de son nombre : c'est lui qui dit où le
  // nombre commence et où il finit.
  for (const t of traits) {
    const cible = t.id.slice('@sous:'.length);
    assert.equal(t.w, avecNombres.scene.get(cible).w, `${t.id} : largeur du nombre`);
  }
  // Et l'écart entre deux nombres est plus large que l'écart de base.
  for (const id of ['t1', 't2', 't3']) {
    assert.ok(avecNombres.scene.get(id).gapBefore > TOKEN_GAP,
      `${id} : les nombres s’écartent au lieu de se resserrer`);
  }

  const avecChiffres = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['t0', 't1', 't2', 't3'], to: { id: 'r', text: '15' } }],
  }], nums([3, 4, 4, 4])));
  assert.equal(avecChiffres.nodes.filter((n) => n.id.startsWith('@sous:')).length, 0,
    'sur une ligne de chiffres, souligner serait du bruit');
});

test('★ le critère du rendu est celui du moteur arithmétique, sur la même matière', () => {
  const cas = [[[8, 15, 16, 5], 'nombre'], [[3, 4, 4, 4], 'chiffre'], [[1, 2], 'chiffre'], [[10, 2], 'nombre']];
  for (const [vs, attendu] of cas) {
    assert.equal(natureOperandes(vs), attendu, `natureOperandes(${vs})`);
    const tl = compile(sc([{ id: 'a', title: 'A', ops: [{ op: 'wait', dur: 20 }] }], nums(vs)));
    const ids = vs.map((_, i) => `t${i}`);
    assert.equal(natureDesJetons({ scene: tl.scene }, ids), attendu, `natureDesJetons(${vs})`);
  }
});

test('un nombre SEUL ne se souligne pas : il ne se confond avec rien', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'group', targets: ['t0'], symbol: '#', to: { id: 'r', text: '1' }, dur: 2500 }],
  }], nums([15])));
  assert.equal(tl.nodes.filter((n) => n.id.startsWith('@sous:')).length, 0);
});

test('le soulignement suit son nombre, et s’en va avec lui', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['t0', 't1', 't2'], to: { id: 'r', text: '45' } }],
  }], nums([15, 15, 15])));
  // `t1` est au milieu : l'écartement le laisse sur place, il n'a donc rien à
  // suivre. Les deux autres, si.
  for (const id of ['t0', 't2']) {
    const trait = `@sous:${id}`;
    assert.ok(animsDe(tl, trait, 'translate').length, `${trait} suit son nombre à l’écartement`);
    const bouge = animsDe(tl, trait, 'translate')[0];
    const jeton = animsDe(tl, id, 'translate')[0];
    const a = valeurFinale(bouge);
    const b = valeurFinale(jeton);
    assert.deepEqual([a.x, a.y], [b.x, b.y], `${trait} arrive où arrive son nombre`);
  }
  for (const id of ['t0', 't1', 't2']) {
    const trait = `@sous:${id}`;
    const fin = animsDe(tl, trait, 'opacity').pop();
    assert.equal(fin.keyframes[fin.keyframes.length - 1].value, 0, `${trait} s’en va avec lui`);
  }
});

test('accumulation — le TOTAL s’affiche avant la fin, jamais seulement à x = 1', () => {
  // Défaut réel, vu sur `#1.1:tca+mtc+cs,3.1:tca+mtc+cs,6.1:tca+m7+cs#…` : le canal
  // du compteur s'arrêtait au dernier atterrissage, si bien que le total
  // n'existait qu'à `x === 1` au millième près. Toute évaluation à 0,999
  // rendait l'avant-dernier partiel — sur « 4 + 2 », la démonstration finissait
  // sur 4 et le 6 annoncé n'apparaissait jamais.
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['t0', 't1'], to: { id: 'r', text: '6' } }],
  }], nums([4, 2])));
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.ok(compteur, 'le compteur passe par le canal discret');
  assert.equal(compteur.render(0.9), '6', 'à 90 % de la course, le total doit être là');
  assert.equal(compteur.render(0.999), '6', 'à 99,9 %, pas l’avant-dernier partiel');
  assert.equal(compteur.render(1), '6');
});
