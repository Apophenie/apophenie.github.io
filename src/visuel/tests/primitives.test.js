/**
 * Les primitives refondues et les deux primitives ajoutées.
 *
 * On vérifie ici ce qui se voit — la mécanique, pas seulement la compilation :
 * qu'un filtre efface AVANT de rapprocher, qu'une accolade porte son symbole,
 * qu'un compteur monte d'un cran par élément allumé, et que les trois contrôles
 * croisés (segments, tracé, réglette) refusent d'afficher un nombre qu'ils ne
 * montrent pas.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import {
  alphabetValue, alphabetGeometry, ALPHABET,
  SEGMENTS14, SEGMENT14_ORDER, fusedStrokes14,
} from '../assets.js';
import { formatValue } from '../dom.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);

// ───────────────────────────── 1. le filtre en deux temps

test('drop « erase » : on efface sur place, sans déplacer ni rapprocher', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On ne garde que les voyelles',
    ops: [{ op: 'drop', targets: ['t0', 't2'], mode: 'erase', regroup: false }],
  }], lettres('hope')));

  // Ce qui part s'efface : opacité et rien d'autre qui le fasse voyager.
  assert.ok(animsDe(tl, 't0', 'opacity').length, 'le token effacé perd son opacité');
  assert.equal(animsDe(tl, 't0', 'translate').length, 0, 'il ne tombe pas, il s’efface');
  // Ce qui reste ne bouge pas encore : le rapprochement est un autre temps.
  assert.equal(animsDe(tl, 't1', 'translate').length, 0, 'les survivants restent en place');
  assert.equal(animsDe(tl, 't3', 'translate').length, 0);

  // Et l'effacement est bien SÉQUENTIEL : le second part après le premier.
  const [a, b] = ['t0', 't2'].map((id) => animsDe(tl, id, 'opacity')[0].delay);
  assert.ok(b > a, 'un caractère à la fois, pas tous d’un bloc');
});

test('le second temps rapproche ce qui reste — et lui seul', () => {
  const tl = compile(sc([
    { id: 'a', title: 'On ne garde que les voyelles', ops: [{ op: 'drop', targets: ['t0', 't2'], mode: 'erase', regroup: false }] },
    { id: 'b', title: 'On rapproche ce qui reste', ops: [{ op: 'move' }] },
  ], lettres('hope')));

  const bouges = tl.anims.filter((a) => a.prop === 'translate');
  assert.ok(bouges.length, 'les survivants se rapprochent');
  for (const a of bouges) {
    assert.ok(a.delay >= tl.bounds[1], 'et pas avant la charnière : c’est un temps à part');
    assert.ok(['t1', 't3'].includes(a.id), 'seuls les survivants bougent');
  }
});

test('un filtre ne surligne pas ce qu’il garde : la disparition suffit', () => {
  const tl = compile(sc([
    { id: 'a', title: 'filtre', ops: [{ op: 'drop', targets: ['t0'], mode: 'erase', regroup: false }] },
    { id: 'b', title: 'rapprochement', ops: [{ op: 'move' }] },
  ], lettres('hope')));
  assert.ok(!tl.nodes.some((n) => n.role === 'halo'), 'aucun halo posé par un filtre');
});

// ───────────────────────────── 2. le découpage en sous-groupes

test('partition : une accolade numérotée par groupe, et les tags posés', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On découpe en sous-groupes',
    ops: [{
      op: 'partition',
      groups: [
        { targets: ['t0', 't1'], tag: 'g0', label: 'groupe 1' },
        { targets: ['t2', 't3'], tag: 'g1', label: 'groupe 2' },
      ],
    }],
  }], lettres('hope')));

  const accolades = tl.nodes.filter((n) => n.role === 'bracket');
  assert.equal(accolades.length, 2, 'une accolade par groupe');
  const etiquettes = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.deepEqual(etiquettes, ['groupe 1', 'groupe 2']);
  assert.equal(tl.scene.get('t0').group, 'g0');
  assert.equal(tl.scene.get('t3').group, 'g1');
});

test('partition : découper en un seul morceau, ou recouvrir, est refusé', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'partition', groups: [{ targets: ['t0', 't1'] }] }],
  }], lettres('hope'))), /au moins DEUX groupes/);

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [{ targets: ['t0', 't1'] }, { targets: ['t1', 't2'] }] }],
  }], lettres('hope'))), /figure dans deux groupes/);
});

// ───────────────────────────── 3. l'accolade des sommes

test('l’accolade porte son symbole, et le résultat naît sous sa pointe', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }];
  const tl = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [{ op: 'sum', targets: ['n0', 'n1'], to: { id: 'r', text: '23' }, symbol: 'Σ' }],
  }], tokens));

  const sigma = tl.nodes.find((n) => n.role === 'label' && n.text === 'Σ');
  assert.ok(sigma, 'le symbole d’opération est écrit');
  const accolade = tl.nodes.find((n) => n.role === 'bracket');
  assert.ok(accolade, 'les sources sont dans une accolade');

  // Le résultat paraît SOUS la pointe, donc plus bas que les opérandes et que
  // le symbole, puis remonte dans la ligne.
  const depart = tl.scene.get('r').base.translate;
  const ligne = tl.scene.pos('n0');
  assert.ok(depart.y > ligne.y, 'le résultat naît sous la ligne des opérandes');
  assert.ok(depart.y > tl.scene.pos(sigma.id).y, 'et sous le symbole');
  const remontee = animsDe(tl, 'r', 'translate');
  assert.ok(remontee.length >= 1, 'puis il remonte prendre la place des opérandes');
  assert.ok(remontee[remontee.length - 1].keyframes.at(-1).value.y < depart.y);
});

test('un comptage dit ce qu’il compte : symbole ET règle en toutes lettres', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On compte les lettres',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], symbol: '#', label: 'On compte les lettres' }],
  }], lettres('hope')));
  const textes = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.deepEqual(textes, ['#', 'On compte les lettres']);
});

/**
 * Position RENDUE d'un nœud à l'instant `t`.
 *
 * ★ Surtout pas `node.base.translate` : c'est la position de NAISSANCE du nœud,
 * qui ne dit rien de ce qu'on voit au moment du step. Un résultat né sous une
 * accolade et remonté dans la ligne a la même `base` dans les deux cas ; seul
 * le déroulé des animations distingue une composition juste d'une composition
 * fausse. On rejoue donc les segments, comme le fait WAAPI : la dernière
 * animation commencée gagne, et aucune ne remplit en arrière (`fill:forwards`).
 */
function positionA(tl, id, t) {
  let p = tl.scene.get(id).base.translate;
  for (const a of tl.anims) {
    if (a.id !== id || a.prop !== 'translate' || t < a.delay) continue;
    const u = Math.min(1, (t - a.delay) / a.duration);
    const k = a.keyframes;
    let i = 0;
    while (i < k.length - 2 && k[i + 1].offset < u) i++;
    const A = k[i];
    const B = k[i + 1] || k[i];
    const r = Math.min(1, Math.max(0, (u - A.offset) / ((B.offset - A.offset) || 1)));
    p = { x: A.value.x + (B.value.x - A.value.x) * r, y: A.value.y + (B.value.y - A.value.y) * r };
  }
  return p;
}

/**
 * Le contrat de composition de CONTRACTS §3.1, mesuré : le résultat est-il
 * CENTRÉ SOUS ses sources, et PLUS BAS qu'elles, à l'instant où il paraît ?
 *
 * @param {number} tRes instant où le résultat paraît
 * @param {number} tSrc instant où l'accolade embrasse encore ses sources
 */
function composition(tl, resultat, sources, tRes, tSrc) {
  const p = positionA(tl, resultat, tRes);
  const boites = sources.map((id) => ({ w: tl.scene.get(id).w, c: positionA(tl, id, tSrc) }));
  const gauche = Math.min(...boites.map((b) => b.c.x - b.w / 2));
  const droite = Math.max(...boites.map((b) => b.c.x + b.w / 2));
  return {
    ecart: p.x - (gauche + droite) / 2,          // 0 = centré sous les sources
    sous: p.y - Math.max(...boites.map((b) => b.c.y)), // > 0 = plus bas qu'elles
    p,
  };
}

/** Valeur RENDUE d'un canal numérique (opacité…) à l'instant `t`. */
function valeurA(tl, id, prop, t) {
  let v = tl.scene.get(id).base[prop];
  if (v === undefined || v === null) v = prop === 'opacity' ? 1 : 0;
  for (const a of tl.anims) {
    if (a.id !== id || a.prop !== prop || t < a.delay) continue;
    const u = Math.min(1, (t - a.delay) / a.duration);
    const k = a.keyframes;
    let i = 0;
    while (i < k.length - 2 && k[i + 1].offset < u) i++;
    const A = k[i];
    const B = k[i + 1] || k[i];
    const r = Math.min(1, Math.max(0, (u - A.offset) / ((B.offset - A.offset) || 1)));
    v = A.value + (B.value - A.value) * r;
  }
  return v;
}

test('l’accolade se défait avec ses sources : jamais tracée sous un trou', () => {
  // ★ Ce défaut ne se voit PAS en pause aux instants où l'on scrute d'ordinaire
  // (l'accolade y est encore pleine, ses sources dedans). Il ne se lit qu'entre
  // 30 % et 75 % de la somme — c'est-à-dire en lecture. On rejoue donc TOUTE la
  // durée de l'op, pas un instant choisi.
  const tokens = [
    { id: 'g0', text: '9' }, { id: 'g1', text: '9' },
    { id: 'n0', text: '3' }, { id: 'n1', text: '4' }, { id: 'n2', text: '4' }, { id: 'n3', text: '4' },
    { id: 'g2', text: '7' },
  ];
  const T = 2800;
  const tl = compile(sc([{
    id: 'a',
    title: 'On additionne',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1', 'n2', 'n3'], glyph: '+', ids: ['p0', 'p1', 'p2'], at: 0, dur: 700 },
      { op: 'sum', targets: ['n0', 'n1', 'n2', 'n3'], consume: ['p0', 'p1', 'p2'], to: { id: 'q', text: '15' }, at: 700, dur: T },
    ],
  }], tokens));

  const t0 = 700;
  const accolade = tl.nodes.find((n) => n.role === 'bracket');
  const sources = ['n0', 'n1', 'n2', 'n3'];

  for (let u = 0; u <= 1; u += 0.02) {
    const t = t0 + T * u;
    const trait = valeurA(tl, accolade.id, 'opacity', t);
    if (trait <= 0.3) continue;
    const vivantes = sources.filter((id) => valeurA(tl, id, 'opacity', t) > 0.3);
    assert.ok(vivantes.length,
      `à ${Math.round(u * 100)} % de la somme, l’accolade est tracée (opacité ${trait.toFixed(2)}) alors qu’elle n’embrasse plus rien`);
    // et son axe reste dans l'étendue de ce qu'elle embrasse encore
    const xs = vivantes.map((id) => positionA(tl, id, t).x);
    const axe = positionA(tl, accolade.id, t).x;
    assert.ok(axe >= Math.min(...xs) - 40 && axe <= Math.max(...xs) + 40,
      `à ${Math.round(u * 100)} %, l’accolade (x=${axe.toFixed(0)}) a décroché de ses sources (${xs.map((v) => v.toFixed(0)).join(', ')})`);
  }
});

test('les signes s’effacent AVANT l’envol : on ne lit jamais « + 4 + 4 + 4 »', () => {
  const tokens = [{ id: 'n0', text: '3' }, { id: 'n1', text: '4' }, { id: 'n2', text: '4' }, { id: 'n3', text: '4' }];
  const T = 2800;
  const tl = compile(sc([{
    id: 'a',
    title: 'On additionne',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1', 'n2', 'n3'], glyph: '+', ids: ['p0', 'p1', 'p2'], at: 0, dur: 700 },
      { op: 'sum', targets: ['n0', 'n1', 'n2', 'n3'], consume: ['p0', 'p1', 'p2'], to: { id: 'q', text: '15' }, at: 700, dur: T },
    ],
  }], tokens));

  // Le premier opérande décolle à 28 % de la somme : à cet instant, plus un
  // seul signe ne doit rester, sinon l'écran écrit une somme amputée.
  const decollage = 700 + T * 0.28;
  for (const id of ['p0', 'p1', 'p2']) {
    assert.ok(valeurA(tl, id, 'opacity', decollage) < 0.05,
      `le signe « ${id} » est encore lisible quand le premier terme s’envole`);
  }
});

test('l’accolade tient sa promesse : la valeur paraît SOUS la pointe, jamais dans la ligne', () => {
  // Les trois gestes enchaînés d'un dénombrement, tels que les émet le
  // catalogue arithmétique : on accole en disant ce qu'on fait, on ramasse,
  // on pose la valeur. Le groupe n'ouvre PAS la ligne : si la valeur naissait
  // à la place de sa première source, elle paraîtrait en haut ET à gauche.
  const tl = compile(sc([{
    id: 'a',
    title: 'On compte les lettres',
    ops: [
      { op: 'group', targets: ['t4', 't5', 't6', 't7'], symbol: '#', label: 'On compte les lettres', at: 0, dur: 1300 },
      { op: 'drop', targets: ['t5', 't6', 't7'], at: 1300, dur: 2000 },
      { op: 'substitute', pairs: [{ target: 't4', to: { id: 'q', text: '4', kind: 'number' } }], at: 3300, dur: 1100 },
    ],
  }], lettres('sur hope')));

  const paraît = 3300 + 1100 * 0.32;   // la valeur est visible, elle n'est pas encore remontée
  const embrasse = 1290;               // l'accolade tient encore ses quatre sources
  const c = composition(tl, 'q', ['t4', 't5', 't6', 't7'], paraît, embrasse);

  assert.ok(Math.abs(c.ecart) < 1,
    `la valeur doit être centrée sous ses sources (écart ${c.ecart.toFixed(1)} px)`);
  assert.ok(c.sous > tl.metrics.fontSize,
    `et nettement plus bas qu'elles (${c.sous.toFixed(1)} px sous la ligne)`);

  // Elle est bien sous la pointe : sous l'accolade, sous le symbole, sous la règle.
  const accolade = tl.nodes.find((n) => n.role === 'bracket');
  const sousQuoi = [accolade.id, ...tl.nodes.filter((n) => n.role === 'label').map((n) => n.id)];
  for (const id of sousQuoi) {
    assert.ok(c.p.y > tl.scene.pos(id).y, `la valeur doit paraître sous « ${id} »`);
  }

  // Puis elle remonte prendre la place dans la ligne — le calcul est refermé.
  const fin = positionA(tl, 'q', tl.total);
  assert.ok(fin.y < c.p.y, 'la valeur remonte dans la ligne à la fin du geste');
  assert.equal(Math.round(fin.y), Math.round(tl.scene.pos('t0').y));
});

test('aucun nœud n’est compilé sans position : rien ne se peint dans le coin', () => {
  // ★ Le repli de `applyBase` place à l'origine un nœud sans position — soit
  // le coin supérieur gauche de la scène. Comme le canal discret peut lui
  // écrire son texte avant toute animation, un tel nœud ne se voit qu'EN
  // LECTURE. Le compilateur refuse donc d'en produire.
  const tl = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [{ op: 'sum', targets: ['n0', 'n1'], to: { id: 'r', text: '23' } }],
  }], [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }]));
  for (const n of tl.nodes) {
    assert.ok(n.base.translate, `« ${n.id} » (${n.role}) n’a pas de position : il se peindrait en haut à gauche`);
  }

  // Et la garde mord : un nœud oublié fait échouer la compilation.
  const scene = tl.scene;
  scene.create({ id: 'orphelin', role: 'label', text: '1', inFlow: false, w: 10 }, { where: '' });
  assert.equal(scene.get('orphelin').base.translate, null,
    'un nœud créé sans place n’a pas de position — c’est précisément ce que le compilateur refuse');
});

test('une coordonnée qui n’est pas un nombre est refusée, pas silencieusement rendue en 0', () => {
  // ★ Le second chemin vers le coin supérieur gauche, et le plus sournois :
  // `dom.formatValue` passe par `num()`, qui rend 0 pour tout ce qui n'est pas
  // fini. Une métrique mal calibrée, une géométrie incomplète, et le nœud se
  // peint à l'origine AVEC SON TEXTE, sans la moindre erreur pour le trahir.
  assert.equal(formatValue('translate', { x: NaN, y: NaN }), 'translate(0px, 0px)',
    'c’est bien 0 que produit une coordonnée non finie — d’où le coin supérieur gauche');
  assert.equal(formatValue('translate', { x: NaN, y: 240 }), 'translate(0px, 240px)',
    'et une seule coordonnée perdue colle le nœud au bord gauche');

  // Le compilateur ne laisse donc pas passer une métrique inutilisable.
  const scenario = sc([{ id: 'a', title: 'A', ops: [{ op: 'pulse', targets: ['t0'] }] }],
    [{ id: 't0', text: '1' }, { id: 't1', text: '5' }]);
  assert.throws(
    () => compile(scenario, { metrics: { fontSize: 48, advance: NaN, capHeight: 35 } }),
    /sans position utilisable/,
  );
});

test('la promesse d’une accolade ne déborde pas sur le step suivant', () => {
  const tl = compile(sc([
    { id: 'a', title: 'On regarde', ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], symbol: '#' }] },
    { id: 'b', title: 'On remplace', ops: [{ op: 'substitute', pairs: [{ target: 't0', to: { id: 'q', text: '4', kind: 'number' } }] }] },
  ], lettres('hope')));

  // L'accolade du step précédent n'est plus là : la valeur naît dans la ligne,
  // comme n'importe quelle substitution.
  const naissance = tl.scene.get('q').base.translate;
  assert.equal(Math.round(naissance.y), Math.round(tl.scene.pos('t1').y),
    'sans accolade ouverte, une substitution reste une substitution');
});

// ───────────────────────────── 4. la réglette alphabétique

test('alphabet : la réglette montre les 26 lettres et leur rang', () => {
  const geo = alphabetGeometry();
  assert.equal(geo.cells.length, 26);
  assert.deepEqual(geo.cells.map((c) => c.char).join(''), ALPHABET);
  assert.deepEqual(geo.cells.map((c) => c.rang), Array.from({ length: 26 }, (_, i) => i + 1));
  assert.equal(alphabetValue('h'), 8);
  assert.equal(alphabetValue('h', 'z26a1'), 19);
  assert.equal(alphabetValue('é'), null, 'un caractère hors alphabet ne vaut rien');
});

test('alphabet : la lettre va vers sa case, le rang en redescend', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Chaque lettre vaut son rang',
    ops: [{ op: 'alphabet', target: 't0', to: { id: 'r8', text: '8' } }],
  }], lettres('hope')));

  assert.ok(tl.nodes.some((n) => n.role === 'alphabet'), 'la réglette est montrée');
  assert.ok(tl.anims.some((a) => a.id === '@camera'), 'la caméra recule pour la cadrer');

  const geo = alphabetGeometry();
  const caseH = geo.cells.find((c) => c.char === 'H');
  const vol = animsDe(tl, 't0', 'translate').at(-1).keyframes.at(-1).value;
  const board = tl.scene.pos('@abc:t0');
  assert.ok(Math.abs(vol.x - (board.x + caseH.cx)) < 0.5, 'la lettre atterrit sur SA case');

  const naissance = tl.scene.get('r8').base.translate;
  assert.ok(Math.abs(naissance.y - (board.y + caseH.rangCy)) < 0.5, 'le rang part du rang, pas de la lettre');
});

test('alphabet : contrôle croisé — le rang montré fait foi', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'alphabet', target: 't0', to: { id: 'faux', text: '7' } }],
  }], lettres('hope'))), /la réglette montre 8/);
});

test('alphabet : un caractère hors alphabet dégrade sans réglette', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'alphabet', target: 's0', to: { id: 'x', text: '6' } }],
  }], [{ id: 's0', text: '-', kind: 'sep' }]));
  assert.ok(!tl.nodes.some((n) => n.role === 'alphabet'), 'aucune réglette');
  assert.ok(!tl.anims.some((a) => a.id === '@camera'), 'aucune caméra');
  assert.ok(tl.nodes.some((n) => n.id === 'x'), 'la substitution a tout de même lieu');
});

// ───────────────────────────── 5 et 6. l'encart de comptage

const encartDe = (tl, id) => tl.nodes.find((n) => n.id === `@encart:${id}`);
const compteurDe = (tl, id) => tl.nodes.find((n) => n.id === `@compteur:${id}`);

test('sevenSeg : encart, compteur, allumage un à un, puis substitution', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Traits continus de l’afficheur',
    ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', count: 3, to: { id: 'trois', text: '3' } }],
  }], lettres('hope')));

  assert.ok(encartDe(tl, 't0'), 'la lettre est montée dans un encart');
  assert.ok(animsDe(tl, 't0', 'translate').length, 'elle s’y est déplacée');
  assert.ok(animsDe(tl, 't0', 'scale').some((a) => a.keyframes.at(-1).value > 1), 'et y a grandi');

  const compteur = compteurDe(tl, 't0');
  assert.ok(compteur && compteur.text === '0', 'le compteur part de zéro');
  const suite = tl.discrete.find((d) => d.id === compteur.id);
  assert.deepEqual([0, 0.5, 1].map((u) => suite.render(u)), ['1', '2', '3'], 'un cran par trait allumé');

  // Les segments s'allument l'un après l'autre, jamais tous ensemble.
  const allumages = ['b', 'c', 'e', 'f', 'g']
    .map((k) => animsDe(tl, `@seg:t0:${k}`, 'opacity').find((a) => a.keyframes.at(-1).value === 1).delay);
  assert.equal(new Set(allumages).size, 3, 'trois instants d’allumage — les traits fusionnés');
  const eteints = ['a', 'd'].map((k) => animsDe(tl, `@seg:t0:${k}`, 'opacity'));
  assert.ok(eteints.every((l) => !l.some((a) => a.keyframes.at(-1).value === 1)),
    'les segments éteints restent en fantôme');

  assert.ok(tl.nodes.some((n) => n.id === 'trois'), 'le nombre du compteur remplace la lettre');
  assert.equal(tl.scene.get('t0').alive, false);
});

test('sevenSeg : contrôle croisé sur ce qui est allumé ET sur le nombre rendu', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', count: 5 }],
  }], lettres('hope'))), /l’afficheur en montre 3/);

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', to: { id: 'z', text: '9' } }],
  }], lettres('hope'))), /le compteur s'arrête à 3/);
});

test('fourteenSeg : même grammaire d’encart, sur l’autre afficheur', () => {
  // H en quatorze segments : b c e f g1 g2 — six segments, trois traits.
  const H14 = ['b', 'c', 'e', 'f', 'g1', 'g2'];
  const tl = compile(sc([{
    id: 'a', title: 'Les segments de l’afficheur',
    ops: [{
      op: 'fourteenSeg', target: 't0', segments: H14, fusion: false, count: 6,
      to: { id: 'six', text: '6' },
    }],
  }], lettres('hope')));

  assert.ok(encartDe(tl, 't0'), 'la lettre est montée dans un encart');
  const compteur = compteurDe(tl, 't0');
  const suite = tl.discrete.find((d) => d.id === compteur.id);
  assert.equal(suite.render(1), '6', 'le compteur va jusqu’à six');
  // Les quatorze segments sont posés, six s'allument, huit restent fantômes.
  const poses = SEGMENT14_ORDER.filter((k) => tl.nodes.some((n) => n.id === `@seg:t0:${k}`));
  assert.deepEqual(poses, [...SEGMENT14_ORDER], 'l’afficheur entier est montré, éteint compris');
  const allumes = SEGMENT14_ORDER.filter((k) => animsDe(tl, `@seg:t0:${k}`, 'opacity')
    .some((a) => a.keyframes.at(-1).value === 1));
  assert.deepEqual(allumes, H14);
  assert.ok(tl.nodes.some((n) => n.id === 'six'), 'le nombre du compteur remplace la lettre');
});

test('fourteenSeg : contrôle croisé — le compte annoncé est celui qui est allumé', () => {
  const H14 = ['b', 'c', 'e', 'f', 'g1', 'g2'];
  // En traits fusionnés, H vaut 3 : la médiane scindée n'en fait qu'une.
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'fourteenSeg', target: 't0', segments: H14, count: 6 }],
  }], lettres('hope'))), /l’afficheur en montre 3/);
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'fourteenSeg', target: 't0', segments: H14, fusion: false, to: { id: 'z', text: '9' } }],
  }], lettres('hope'))), /le compteur s'arrête à 6/);
  // Une chaîne de sept segments n'est pas un afficheur de quatorze.
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'fourteenSeg', target: 't0', segments: 'bcefg' }],
  }], lettres('hope'))), /tableau de segments allumés/);
});

test('★ 14 segments : la géométrie PROUVE la règle de fusion', () => {
  // La règle est « colinéaires ET adjacents ». On ne la croit pas sur parole :
  // on la relit sur les coordonnées du dessin que la scène allume.
  const droite = (k) => {
    const [, x1, y1, , x2, y2] = SEGMENTS14[k].d.split(' ');
    return [Number(x1), Number(y1), Number(x2), Number(y2)];
  };
  const colineaires = (a, b) => {
    const [ax1, ay1, ax2, ay2] = droite(a);
    const [bx1, by1, bx2, by2] = droite(b);
    // produits vectoriels : b1 et b2 sont-ils sur la droite (a1 a2) ?
    const surA = (x, y) => (ax2 - ax1) * (y - ay1) - (ay2 - ay1) * (x - ax1) === 0;
    return surA(bx1, by1) && surA(bx2, by2);
  };
  const paires = [];
  for (let i = 0; i < SEGMENT14_ORDER.length; i++) {
    for (let j = i + 1; j < SEGMENT14_ORDER.length; j++) {
      if (colineaires(SEGMENT14_ORDER[i], SEGMENT14_ORDER[j])) {
        paires.push(SEGMENT14_ORDER[i] + SEGMENT14_ORDER[j]);
      }
    }
  }
  // Exactement quatre paires colinéaires — et aucune diagonale parmi elles.
  assert.deepEqual(paires, ['bc', 'ef', 'g1g2', 'il']);
  // Et elles sont adjacentes : chacune partage un point avec l'autre — c'est ce
  // qui fait qu'un trait fusionné SE VOIT comme une ligne continue.
  const bouts = (k) => { const [x1, y1, x2, y2] = droite(k); return [`${x1},${y1}`, `${x2},${y2}`]; };
  const seTouchent = (a, b) => bouts(a).some((p) => bouts(b).includes(p));
  for (const [a, b] of [['b', 'c'], ['e', 'f'], ['g1', 'g2'], ['i', 'l']]) {
    assert.ok(seTouchent(a, b), `${a} et ${b} devraient se toucher`);
  }
  // Les quatre diagonales ne se touchent qu'aux FLANCS du moyeu, deux à deux :
  // h avec k à gauche, j avec m à droite. Jamais h avec m.
  assert.ok(seTouchent('h', 'k') && seTouchent('j', 'm'));
  assert.ok(!seTouchent('h', 'm') && !seTouchent('j', 'k'));
  // h et m sont PARALLÈLES (même direction) mais décalées : deux traits.
  const pente = (k) => { const [x1, y1, x2, y2] = droite(k); return (y2 - y1) / (x2 - x1); };
  assert.equal(pente('h'), pente('m'), 'h et m ont la même pente');
  assert.equal(pente('j'), pente('k'));
  assert.ok(!colineaires('h', 'm'), '… et pourtant elles ne sont pas colinéaires');
  assert.ok(!colineaires('j', 'k'));
  // Le miroir de la table du moteur rend bien les mêmes groupes.
  assert.deepEqual(fusedStrokes14(['b', 'c', 'e', 'f', 'g1', 'g2']), ['g', 'bc', 'ef']);
  assert.deepEqual(fusedStrokes14(['h', 'j', 'k', 'm']), ['h', 'j', 'k', 'm']);
});

test('countStrokes : les trois modes tiennent la même grammaire', () => {
  for (const [mode, attendu] of [['traits', 3], ['extremites', 4], ['boucles', 0]]) {
    const tl = compile(sc([{
      id: 'a', title: 'A',
      ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode, count: attendu, to: { id: `n_${mode}`, text: String(attendu) } }],
    }], lettres('HOPE')));
    assert.ok(encartDe(tl, 't0'), `${mode} : encart`);
    const compteur = compteurDe(tl, 't0');
    assert.ok(compteur, `${mode} : compteur`);
    assert.equal(compteur.text, '0', `${mode} : il part de zéro`);
    const suite = tl.discrete.find((d) => d.id === compteur.id);
    if (attendu === 0) {
      assert.equal(suite, undefined, 'un compteur qui reste à zéro n’égrène rien');
    } else {
      assert.equal(suite.render(1), String(attendu), `${mode} : il s’arrête sur le compte`);
    }
    assert.ok(tl.nodes.some((n) => n.id === `n_${mode}`), `${mode} : substitution`);
  }
});

test('countStrokes : les extrémités s’allument une par une', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode: 'extremites', count: 4 }],
  }], lettres('HOPE')));
  const marqueurs = tl.nodes.filter((n) => n.role === 'marker');
  assert.equal(marqueurs.length, 4, 'un marqueur par pointe libre');
  const instants = marqueurs.map((n) => animsDe(tl, n.id, 'scale')[0].delay);
  assert.equal(new Set(instants).size, 4, 'quatre instants distincts');
});

test('countStrokes : le comptage annoncé reste redérivé du tracé dessiné', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'countStrokes', target: 't0', glyph: 'H', mode: 'traits', count: 4 }],
  }], lettres('HOPE'))), /le tracé de référence en donne 3/);
});

// ───────────────────────────── 7. les signes de l'opération

test('insertOperators : un signe par interstice quand l’émetteur les liste', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }, { id: 'n2', text: '16' }];
  const tl = compile(sc([{
    id: 'a', title: 'Alternance',
    ops: [{ op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '−', glyphs: ['−', '+'], ids: ['s0', 's1'] }],
  }], tokens));
  assert.deepEqual(['s0', 's1'].map((id) => tl.scene.get(id).text), ['−', '+'],
    'la somme alternée ne doit pas s’écrire comme une soustraction en chaîne');

  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '+', glyphs: ['+'] }],
  }], tokens)), /exactement 2 signe/);
});

test('les signes déclarés par l’émetteur s’en vont avec la somme', () => {
  const tokens = [{ id: 'n0', text: '8' }, { id: 'n1', text: '15' }];
  const tl = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1'], glyph: '+', ids: ['s0'] },
      { op: 'sum', targets: ['n0', 'n1'], consume: ['s0'], to: { id: 'r', text: '23' }, at: 800 },
    ],
  }], tokens));
  assert.equal(tl.scene.get('s0').alive, false, 'le « + » ne survit pas au calcul');
  assert.equal(tl.scene.flow.includes('s0'), false);
  assert.ok(animsDe(tl, 's0', 'opacity').some((a) => a.keyframes.at(-1).value === 0));
});
