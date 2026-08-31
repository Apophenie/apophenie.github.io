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
  alphabetValue, alphabetEntries, tableGeometry, ALPHABET, DISPOSITIONS,
  SEGMENTS, SEGMENT_ORDER, SEGMENTS14, SEGMENT14_ORDER, fusedStrokes14,
  SEGMENTS_DSEG7, SEGMENTS_DSEG14, SEG14_STROKE,
} from '../assets.js';
import { SCRABBLE_FR } from '../../moteur/tables/jeux.js';
import { formatValue, layerOf, LAYERS, fondDeCase } from '../dom.js';
import { bboxOf } from '../layout.js';
import { PALETTE } from '../constants.js';

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
  // ★ Le mot ne s'écrit qu'une fois. Deux groupes de deux lettres mettent leurs
  // légendes à 85 unités l'une de l'autre, et « groupe 1 » en fait 127 : les
  // écrire toutes les deux en toutes lettres donnerait « groupe 1groupe 2 ».
  const etiquettes = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.deepEqual(etiquettes, ['groupe 1', '2']);
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

/* ── partition : ce qui est centré, c'est le DÉCOUPAGE ──────────────────────
 *
 * Le layout centre la ligne. `partition` change de régime — les groupes sont le
 * sujet, le reste s'estompe — et le sujet n'est presque jamais au milieu de la
 * ligne. Deux formes réelles, et elles tirent en SENS CONTRAIRES :
 *
 *  · découpage contigu, reste en queue (« hope-hope-hope.fr » découpé en trois
 *    « hope ») : le sujet tombe à gauche, il faut pousser à droite ;
 *  · découpage dispersé, reste en tête (la moisson : les deux tirets et le
 *    « fr », en sautant les « hope ») : le sujet tombe à droite, il faut tirer
 *    à gauche.
 *
 * Une compensation qui ne sait pousser que d'un côté ne compense donc rien.
 */

/** Centre du sujet et de la ligne, une fois le découpage posé. */
function centres(tl, ids) {
  const vivants = tl.scene.flow.filter((id) => tl.scene.get(id).alive);
  return {
    ligne: bboxOf(vivants, tl.scene.positions, tl.scene.metrics, 0),
    sujet: bboxOf(ids, tl.scene.positions, tl.scene.metrics, 0),
    decalage: tl.layoutOpts.decalage,
    centre: tl.layoutOpts.centerX,
  };
}

test('★ partition : le découpage vient au centre, quel que soit le côté', () => {
  const mot = lettres('hope-hope-hope.fr');
  const grp = (ids, i) => ({ targets: ids, tag: `g${i}`, label: `groupe ${i + 1}` });
  const decoupe = (groupes) => compile(sc([{
    id: 'a', title: 'On découpe en sous-groupes',
    ops: [{ op: 'partition', groups: groupes.map(grp) }],
  }], mot));

  // 1. contigu — les trois « hope », le « .fr » en queue : il faut pousser à DROITE.
  const contigu = [['t0', 't1', 't2', 't3'], ['t5', 't6', 't7', 't8'], ['t10', 't11', 't12', 't13']];
  let m = centres(decoupe(contigu), contigu.flat());
  assert.ok(m.decalage > 0, `le découpage contigu se pousse à droite (${m.decalage})`);
  assert.equal(m.sujet.cx, m.centre, 'le découpage est au centre de la vue');
  assert.notEqual(m.ligne.cx, m.centre, 'la ligne, elle, ne l’est plus — son reste est en queue');

  // 2. dispersé — les deux tirets et le « fr » : il faut tirer à GAUCHE.
  const disperse = [['t4'], ['t9'], ['t15', 't16']];
  m = centres(decoupe(disperse), disperse.flat());
  assert.ok(m.decalage < 0, `le découpage dispersé se tire à gauche (${m.decalage})`);
  assert.equal(m.sujet.cx, m.centre, 'le découpage est au centre de la vue');

  // 3. un découpage qui borde la ligne des deux bouts n'a rien à compenser.
  const bords = [['t0', 't1'], ['t15', 't16']];
  m = centres(decoupe(bords), bords.flat());
  assert.ok(Math.abs(m.decalage) < 0.01, `rien à compenser, rien de décalé (${m.decalage})`);
  assert.equal(m.sujet.cx, m.centre);
  assert.equal(m.ligne.cx, m.centre);
});

test('★ partition : le report est bridé — la ligne ne sort jamais du cadre', () => {
  // Une ligne presque aussi large que la zone utile : amener le dernier jeton
  // au centre demanderait de sortir la ligne du cadre. On va jusqu'au bord, et
  // pas plus loin — découvrir du vide serait pire que rester décentré.
  const longue = lettres('abcdefghijklmnopqrstuvwxyz01');
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [{ targets: ['t26'] }, { targets: ['t27'] }] }],
  }], longue));
  const vivants = tl.scene.flow;
  const ligne = bboxOf(vivants, tl.scene.positions, tl.scene.metrics, 0);
  const { viewBox } = tl.layoutOpts;
  assert.ok(tl.layoutOpts.decalage < 0, 'le sujet est en queue : on tire à gauche');
  assert.ok(ligne.x >= viewBox.x - 0.01, `le bord gauche reste dans le cadre (${ligne.x})`);
  assert.ok(ligne.x + ligne.w <= viewBox.x + viewBox.w + 0.01, 'et le bord droit aussi');
});

test('★ partition : les légendes ne se chevauchent jamais', () => {
  const lbl = (tl) => tl.scene.allNodes().filter((n) => /grouplabel/.test(n.id)).map((n) => n.text);

  // Trois groupes larges sur une ligne courte : tout tient, rien n'est abrégé.
  const large = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [
      { targets: ['t0', 't1', 't2', 't3'], label: 'groupe 1' },
      { targets: ['t5', 't6', 't7', 't8'], label: 'groupe 2' },
    ] }],
  }], lettres('hope-hope')));
  assert.deepEqual(lbl(large), ['groupe 1', 'groupe 2']);

  // Six portées d'UN caractère : « groupe 1 » est trois fois plus large que ce
  // qu'il désigne. Le mot ne s'écrit qu'une fois, les autres gardent le numéro.
  const etroit = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [0, 2, 4, 6, 8, 10].map((k, i) => (
      { targets: [`t${k}`], label: `groupe ${i + 1}` })) }],
  }], lettres('abcdefghijkl')));
  assert.deepEqual(lbl(etroit), ['groupe 1', '2', '3', '4', '5', '6']);

  // Et aucune ne mord sur sa voisine, ce qui est le seul fait qui compte.
  for (const tl of [large, etroit]) {
    const boites = tl.scene.allNodes().filter((n) => /grouplabel/.test(n.id))
      .map((n) => ({ g: tl.scene.pos(n.id).x - n.w / 2, d: tl.scene.pos(n.id).x + n.w / 2, t: n.text }))
      .sort((a, b) => a.g - b.g);
    for (let i = 1; i < boites.length; i++) {
      assert.ok(boites[i].g >= boites[i - 1].d,
        `« ${boites[i - 1].t} » et « ${boites[i].t} » se chevauchent de ${boites[i - 1].d - boites[i].g}`);
    }
  }
});

test('★ partition : on n’abrège une redite que si ce qui reste distingue', () => {
  // Ici le préfixe commun existe — c'est « le » — mais ce qui resterait est un
  // MOT, pas une marque. On préfère des légendes qui se touchent à des légendes
  // amputées de la moitié de ce qu'elles disent.
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'partition', groups: [
      { targets: ['t0'], label: 'le protocole' },
      { targets: ['t2'], label: 'le domaine' },
      { targets: ['t4'], label: 'le chemin' },
    ] }],
  }], lettres('abcdef')));
  assert.deepEqual(
    tl.scene.allNodes().filter((n) => /grouplabel/.test(n.id)).map((n) => n.text),
    ['le protocole', 'le domaine', 'le chemin'],
    'ce qui resterait est un mot entier : rien n’est retiré',
  );
});

test('★ le verdict rend son centre à la ligne', () => {
  const tl = compile(sc([
    {
      id: 'a', title: 'On découpe',
      ops: [{ op: 'partition', groups: [{ targets: ['t0', 't1'] }, { targets: ['t2', 't3'] }] }],
    },
    { id: 'b', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['t0', 't1', 't2'] }] },
  ], lettres('hope-fr')));
  assert.equal(tl.layoutOpts.decalage, 0, 'reveal lève le report du découpage');
  const vivants = tl.scene.flow.filter((id) => tl.scene.get(id).alive);
  const ligne = bboxOf(vivants, tl.scene.positions, tl.scene.metrics, 0);
  assert.equal(ligne.cx, tl.layoutOpts.centerX, 'la ligne du verdict est centrée');
});

/**
 * ★ Le verdict à plusieurs séries — « rassembler, découper, grossir ».
 *
 * Une moisson rend « 666 666 666 666 666 ». Ces quinze chiffres ne se lisent
 * ni comme un nombre ni comme cinq séries si rien ne les sépare, et les
 * grossir d'un bloc les rapetisse : c'est la LARGEUR qui borne
 * l'agrandissement. Le geste se déplie donc, et l'ordre est le propos.
 */

const chiffres = (n) => Array.from({ length: n }, (_, i) => ({ id: `d${i}`, text: '6', kind: 'digit' }));

/**
 * Compile un verdict de `n` chiffres, suivis de deux jetons de REBUT.
 *
 * Un verdict n'arrive jamais sur une scène vide : il reste toujours un `.fr` ou
 * un tiret à effacer, et c'est leur départ qui laisse les chiffres se
 * rassembler. Les mettre en QUEUE, et non de part et d'autre, n'est pas un
 * détail : un rebut symétrique s'en va sans déplacer personne, et le premier
 * temps du verdict — le rassemblement — ne se verrait pas.
 */
function verdictDe(n, op = {}) {
  const cs = chiffres(n);
  const tokens = [...cs, { id: 'r0', text: 'x', kind: 'letter' }, { id: 'r1', text: 'y', kind: 'letter' }];
  return compile(sc([{
    id: 'v', title: 'Le verdict',
    ops: [{ op: 'reveal', targets: cs.map((t) => t.id), ...op }],
  }], tokens));
}

/** Les rangs du verdict : une entrée par ordonnée, dans l'ordre de lecture. */
function rangs(tl, n) {
  const par = new Map();
  for (let i = 0; i < n; i++) {
    const p = tl.scene.pos(`d${i}`);
    const cle = Math.round(p.y * 100) / 100;
    if (!par.has(cle)) par.set(cle, []);
    par.get(cle).push(p);
  }
  return [...par.entries()].sort((a, b) => a[0] - b[0]).map(([y, ps]) => ({ y, ps }));
}

/** Les écarts de centre à centre, dans un rang. */
const ecarts = (ps) => ps.slice(1).map((p, i) => Math.round((p.x - ps[i].x) * 100) / 100);

test('★ le verdict : un seul 666 se rassemble et grossit d’un seul geste', () => {
  const tl = verdictDe(3);
  assert.equal(rangs(tl, 3).length, 1, 'trois chiffres tiennent sur un rang');
  // Un seul trajet : rassembler et grossir ne font qu'un, sinon la chute
  // s'interrompt au milieu pour un découpage qui n'a rien à découper.
  const trajets = tl.anims.filter((a) => a.id === 'd0' && a.prop === 'translate');
  assert.equal(trajets.length, 1, `${trajets.length} trajets — un seul est attendu`);
  const ech = tl.anims.find((a) => a.id === 'd0' && a.prop === 'scale');
  assert.equal(ech.delay, trajets[0].delay, 'il grossit pendant qu’il se rassemble');
  assert.ok(ech.keyframes[1].value > 8, `agrandissement ${ech.keyframes[1].value} — un 666 seul prend la scène`);
});

test('★ le verdict : les séries sont séparées par une espace, exactement', () => {
  const tl = verdictDe(6);
  const [rang] = rangs(tl, 6);
  const e = ecarts(rang.ps);
  // 6 chiffres, un seul rang : cinq écarts, dont celui du milieu sépare les
  // séries. La chasse est fixe : une espace interposée doublerait la distance
  // de centre à centre. C'est cette distance-là, et pas un vide décoratif.
  assert.equal(e.length, 5);
  assert.equal(e[0], e[1], 'à l’intérieur d’une série, l’écart est constant');
  assert.equal(e[3], e[4], 'et le même dans la seconde');
  assert.equal(Math.round((e[2] / e[0]) * 1000) / 1000, 2,
    `l’écart entre séries vaut ${e[2] / e[0]} espace(s) — il en faut exactement une`);
});

test('★ le verdict : au-delà de trois séries, deux rangs — chacun centré', () => {
  const tl = verdictDe(15);
  const rs = rangs(tl, 15);
  assert.equal(rs.length, 2, `${rs.length} rang(s) pour cinq séries — deux sont attendus`);
  assert.equal(rs[0].ps.length, 9, 'la coupure tombe entre deux séries : 3 séries en haut…');
  assert.equal(rs[1].ps.length, 6, '…et 2 en bas');
  for (const r of rs) {
    const cx = (r.ps[0].x + r.ps[r.ps.length - 1].x) / 2;
    assert.ok(Math.abs(cx - tl.layoutOpts.centerX) < 0.01,
      `rang à y=${r.y} centré en ${cx}, attendu ${tl.layoutOpts.centerX}`);
  }
  // Les deux rangs ne se chevauchent pas : l'interligne suit l'agrandissement.
  const grow = tl.anims.find((a) => a.id === 'd0' && a.prop === 'scale').keyframes[1].value;
  assert.ok(rs[1].y - rs[0].y > tl.scene.metrics.capHeight * grow,
    'l’interligne dépasse la hauteur de capitale — les rangs ne se touchent pas');
  // Et c'est bien pour ça qu'on coupe : sur un rang unique, cinq séries d'un
  // seul tenant ne monteraient pas au-delà de ×1,7 — c'est la largeur qui
  // borne, et la couper en deux est le seul moyen de la desserrer.
  assert.ok(grow > 2.4, `agrandissement ${grow} — deux rangs doivent faire mieux qu’un`);
});

test('★ le verdict : des triptyques déjà couronnés vont DROIT à leur place', () => {
  // « Quand le ou les triptyques sont déjà formés (et cornés), tu peux faire une
  // transformation plus directe pour les amener à leur position finale sans
  // passer par l'étape regroupement » (l'auteur). Rassembler puis découper sert
  // à rendre visible une structure qui ne l'est pas ; sous les cornes, elle
  // l'est déjà, et la rejouer défait puis refait ce qu'on a vu se faire.
  const cs = chiffres(6);
  const tokens = [...cs, { id: 'r0', text: 'x', kind: 'letter' }];
  const tl = compile(sc([
    {
      id: 'c', title: 'Les cornes',
      ops: [
        { op: 'horns', targets: ['d0', 'd1', 'd2'] },
        { op: 'horns', targets: ['d3', 'd4', 'd5'] },
      ],
    },
    { id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: cs.map((t) => t.id) }] },
  ], tokens));

  const t0 = tl.bounds[tl.bounds.length - 2];
  const fenetres = [...new Set(tl.anims
    .filter((a) => a.prop === 'translate' && a.id.startsWith('d') && a.delay >= t0)
    .map((a) => `${a.delay}|${a.duration}`))];
  assert.equal(fenetres.length, 1,
    `${fenetres.length} temps de trajet — un seul est attendu sous les cornes`);
  assert.equal(tl.warnings.length, 0, tl.warnings.join(' / '));

  // Et le résultat est le même qu'en passant par les trois temps : deux séries
  // séparées d'une espace, centrées. Aller plus vite ne veut pas dire arriver
  // ailleurs.
  const xs = cs.map((t) => tl.scene.pos(t.id).x).sort((a, b) => a - b);
  const e = xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 100) / 100);
  assert.equal(e[0], e[1], 'l’écart est constant dans une série');
  assert.equal(Math.round((e[2] / e[0]) * 1000) / 1000, 2, 'une espace entre les deux séries');
  assert.ok(Math.abs((xs[0] + xs[5]) / 2 - tl.layoutOpts.centerX) < 0.01, 'et le tout est centré');
});

test('★ le verdict : un triptyque NU repasse par les trois temps', () => {
  // Le critère est observé sur la scène, pas déduit du nombre de chiffres :
  // six 6 contigus mais sans cornes n'ont jamais été montrés comme deux séries,
  // et il faut donc les découper sous les yeux du spectateur.
  const tl = verdictDe(6);
  const t0 = tl.bounds[tl.bounds.length - 2];
  const fenetres = [...new Set(tl.anims
    .filter((a) => a.prop === 'translate' && a.id.startsWith('d') && a.delay >= t0)
    .map((a) => `${a.delay}|${a.duration}`))];
  assert.equal(fenetres.length, 3, `${fenetres.length} temps — trois sont attendus sans cornes`);
});

test('★ le verdict : on rassemble, PUIS on découpe, PUIS on grossit', () => {
  const tl = verdictDe(15);
  // On regarde les FENÊTRES, pas un jeton : à chaque temps, un chiffre donné
  // peut se retrouver déjà en place et n'avoir rien à parcourir. Ce qui doit
  // tenir, c'est qu'il y ait bien trois temps, et qu'ils se succèdent.
  const fenetres = [...new Set(tl.anims
    .filter((a) => a.prop === 'translate' && a.id.startsWith('d'))
    .map((a) => `${a.delay}|${a.duration}`))]
    .map((k) => k.split('|').map(Number))
    .sort((a, b) => a[0] - b[0]);
  assert.equal(fenetres.length, 3, `${fenetres.length} temps — trois sont attendus`);
  for (let i = 1; i < fenetres.length; i++) {
    assert.ok(fenetres[i][0] + 1e-6 >= fenetres[i - 1][0] + fenetres[i - 1][1],
      'les trois temps se succèdent — deux trajets concurrents se contrediraient');
  }
  const ech = tl.anims.find((a) => a.id === 'd0' && a.prop === 'scale');
  assert.equal(ech.delay, fenetres[2][0], 'il ne grossit qu’au troisième temps');
  assert.equal(tl.warnings.length, 0, tl.warnings.join(' / '));
});

test('★ le verdict ne découpe pas ce qui n’est pas fait de séries entières', () => {
  // Quatre chiffres révélés — un banc d'essai en a un. Ouvrir un vide après le
  // troisième affirmerait un « 666 + 6 » que personne n'a démontré.
  const tl = verdictDe(4);
  const [rang] = rangs(tl, 4);
  const e = ecarts(rang.ps);
  assert.equal(new Set(e).size, 1, `écarts ${e.join(', ')} — aucun ne doit se distinguer`);
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

/**
 * ★ UN SIGNE NE QUITTE JAMAIS LE NOMBRE QU'IL GOUVERNE.
 *
 * Le signe faisait bande à part : tous s'effaçaient d'un coup juste avant
 * l'envol, pour ne pas laisser lire « + 4 + 4 + 4 » sur une ligne dont le
 * premier terme était déjà parti. C'était soigner le symptôme. La règle est
 * que « moins onze » est UN terme : le signe descend avec son nombre, et ce
 * qui reste écrit à chaque instant est ce qui reste à additionner.
 *
 * Ce que ce test gèle est donc l'attelage, pas un ordre d'effacement — les
 * deux opacités ne peuvent plus diverger, dans un sens ni dans l'autre.
 */
test('un signe descend avec son nombre : les deux ne se lisent jamais l’un sans l’autre', () => {
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

  // `p0` est écrit entre `n0` et `n1` : c'est `n1` qu'il gouverne. Le premier
  // terme, lui, n'a rien devant lui — et c'est pour ça que la somme commence
  // par lui.
  const attelages = [['p0', 'n1'], ['p1', 'n2'], ['p2', 'n3']];
  for (let u = 0; u <= 1; u += 0.02) {
    const t = 700 + T * u;
    for (const [signe, nombre] of attelages) {
      const s = valeurA(tl, signe, 'opacity', t);
      const n = valeurA(tl, nombre, 'opacity', t);
      assert.ok(!(s > 0.3 && n < 0.05),
        `à ${Math.round(u * 100)} % : « ${signe} » se lit encore alors que « ${nombre} » est parti`);
      assert.ok(!(n > 0.3 && s < 0.05),
        `à ${Math.round(u * 100)} % : « ${nombre} » se lit encore sans son signe « ${signe} »`);
    }
  }
});

/**
 * ★ Plus aucun soulignement, signes ou pas.
 *
 * Le trait répondait au risque de lire « 15 16 » comme « 1516 » — mais l'écart
 * y répondait déjà, et deux remèdes pour un mal font du bruit. « Enlève le
 * souligné, et partout où souligné il y a » (l'auteur).
 */
test('aucune accolade ne souligne ses nombres, avec ou sans signes', () => {
  const tokens = [{ id: 'n0', text: '5' }, { id: 'n1', text: '11' }, { id: 'n2', text: '2' }];
  const traits = (tl) => tl.nodes.filter((n) => n.id.startsWith('@sous:')).length;

  const avecSignes = compile(sc([{
    id: 'a',
    title: 'On alterne plus et moins',
    ops: [
      { op: 'insertOperators', between: ['n0', 'n1', 'n2'], glyph: '−', glyphs: ['−', '+'], ids: ['p0', 'p1'], at: 0, dur: 700 },
      { op: 'sum', targets: ['n0', 'n1', 'n2'], consume: ['p0', 'p1'], to: { id: 'q', text: '-4' }, partials: [0, 5, -6, -4], symbol: '∓', at: 700, dur: 2800 },
    ],
  }], tokens));
  assert.equal(traits(avecSignes), 0);

  const sansSignes = compile(sc([{
    id: 'a',
    title: 'On compte les valeurs',
    ops: [{ op: 'group', targets: ['n0', 'n1', 'n2'], symbol: '#', to: { id: 'q', text: '3' } }],
  }], tokens));
  assert.equal(traits(sansSignes), 0);
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

// ───────────────────────────── 4. la table de correspondance

const A1Z26 = alphabetEntries('a1z26');
const geoAbc = () => tableGeometry({ entries: A1Z26, disposition: 'reglette' });

test('table : la réglette montre les 26 lettres et leur valeur', () => {
  const geo = geoAbc();
  assert.equal(geo.cells.length, 26);
  assert.equal(geo.cells.map((c) => c.key).join(''), ALPHABET);
  assert.deepEqual(Object.keys(geo.index).map((k) => geo.index[k].value),
    Array.from({ length: 26 }, (_, i) => String(i + 1)));
  assert.equal(alphabetValue('h'), 8);
  assert.equal(alphabetValue('h', 'z26a1'), 19);
  assert.equal(alphabetValue('é'), null, 'un caractère hors alphabet ne vaut rien');
});

const PYTHAGORE = [...ALPHABET].map((char, i) => ({ char, value: (i % 9) + 1 }));
const CHALDEEN = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4,
  N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7 };

test('table : une case = une lettre + un nombre — le pavé seul groupe les lettres', () => {
  // ★ Le cycle CASSE LA LIGNE là où la table recommence, et les colonnes se
  //   répondent : c'est la démonstration de la pythagoricienne.
  const pyth = tableGeometry({ disposition: 'reglette', cycle: true, entries: PYTHAGORE });
  assert.equal(pyth.cells.length, 26, 'une case par lettre, jamais groupée');
  assert.deepEqual([pyth.rows, pyth.cols], [3, 9], 'trois rangées de neuf, dérivées des valeurs');
  const colonne1 = pyth.cells.filter((c) => c.col === 0);
  assert.deepEqual(colonne1.map((c) => c.key), ['A', 'J', 'S']);
  assert.equal(new Set(colonne1.map((c) => c.cx)).size, 1,
    'l’alignement vertical est exact — c’est lui qui fait la démonstration');
  assert.deepEqual(colonne1.map((c) => c.labels[1].text), ['1', '1', '1']);
  // En réglette, la valeur est SOUS la lettre, dans la même case.
  assert.ok(pyth.index.A.valeur.y > pyth.index.A.lettre.y);
  assert.equal(pyth.index.A.valeur.x, pyth.index.A.lettre.x);

  // La chaldéenne, elle, n'a pas de cycle : deux rangées de treize, sans saut.
  const chal = tableGeometry({
    disposition: 'reglette',
    entries: [...ALPHABET].map((char) => ({ char, value: CHALDEEN[char] })),
  });
  assert.deepEqual([chal.rows, chal.cols], [2, 13]);
  assert.equal(chal.cells.length, 26);
  assert.ok(!chal.cells.some((c) => c.labels.some((l) => l.text === '9')),
    'la chaldéenne n’emploie jamais le 9, et ça se constate case par case');

  const pave = tableGeometry({
    disposition: 'pave',
    entries: [...ALPHABET].map((char, i) => ({ char, value: 2 + Math.floor(i / 4) })),
  });
  assert.equal(pave.cells.length, 9, 'les neuf touches, y compris celles sans lettre');
  assert.equal(pave.cells[0].key, '1');
  assert.ok(pave.cells[0].vide, 'la touche 1 ne porte aucune lettre — et elle le montre');
  // Le 4 est sous le 1 : deuxième ligne, première colonne.
  const t1 = pave.cells.find((c) => c.key === '1');
  const t4 = pave.cells.find((c) => c.key === '4');
  assert.ok(Math.abs(t1.cx - t4.cx) < 0.5 && t4.cy > t1.cy, 'le pavé est bien celui d’un téléphone');
  // ★ La touche 7 porte VRAIMENT quatre lettres : c'est la seule mise en page
  //   où une case en groupe plusieurs, et c'est la réalité de l'objet.
  const t7 = pave.cells.find((c) => c.key === '7');
  assert.equal(t7.labels.length, 5, 'la tête, puis les quatre lettres');

  // Une disposition retirée du vocabulaire ne peut plus être demandée.
  //
  // ★ Le gel a bougé, et il devait bouger : `modulo` s'est ajoutée pour les
  //   conversions nombre → reste (`pm9`, `pm10`), qui affirmaient sans montrer
  //   exactement comme les quatorze conversions par table avant elles. Ce que
  //   ce gel protège n'est pas le NOMBRE de mises en page — il en est à quatre
  //   comme il en fut à trois — mais le fait qu'une mise en page inconnue
  //   retombe silencieusement sur la réglette au lieu de dessiner n'importe
  //   quoi. C'est cette seconde assertion qui compte, et elle est intacte.
  assert.deepEqual([...DISPOSITIONS], ['reglette', 'glissiere', 'pave', 'modulo']);
  assert.equal(tableGeometry({ disposition: 'grille', entries: PYTHAGORE }).disposition, 'reglette');
});

/**
 * ★ La table des restes — la colonne EST le reste, et le barème est écrit une
 * fois pour toutes en tête de colonne.
 *
 * C'est ce qui la distingue d'une réglette cyclique, où chaque case répète sa
 * valeur : ici l'alignement porte la démonstration, et répéter le reste dans
 * les quatre-vingts cases le noierait au lieu de le montrer. On vérifie donc
 * que la case ne porte QUE le nombre, que le barème existe une fois par
 * colonne, et que le reste redescend de là où il est écrit.
 */
test('table : la table des restes écrit son barème UNE fois, en tête de colonne', () => {
  const entrees = Array.from({ length: 45 }, (_, n) => ({ char: String(n), value: String(n % 9) }));
  const geo = tableGeometry({ disposition: 'modulo', colonnes: 9, entries: entrees });

  assert.equal(geo.disposition, 'modulo');
  assert.equal(geo.cols, 9, 'une colonne par reste possible');
  assert.equal(geo.rows, 5, 'cinq rangées pour aller jusqu’à 44');
  assert.equal(geo.cells.length, 45);

  // ① une case, un nombre, et rien d'autre.
  for (const c of geo.cells) {
    assert.equal(c.labels.length, 1, `la case « ${c.key} » ne doit porter que son nombre`);
    assert.equal(c.labels[0].text, c.key);
  }

  // ② le barème : un repère par colonne, et c'est le reste de la colonne.
  assert.equal(geo.quotation.length, 9);
  geo.quotation.forEach((q, col) => assert.equal(String(q.n), String(col)));
  assert.ok(geo.quotation.every((q) => q.cy === geo.quotationCy), 'la quotation est une ligne');

  // ③ 44 tombe dans la colonne 8, cinquième rangée — c'est la mise en page qui
  //    le démontre, et c'est cette colonne-là que le reste doit désigner.
  const p = geo.index['44'];
  const cell = geo.cells[p.cell];
  assert.equal(cell.col, 8);
  assert.equal(cell.ligne, 4);
  assert.equal(p.value, '8');
  assert.equal(p.valeur.y, geo.quotationCy, 'le reste redescend de la quotation, pas de la case');
  assert.equal(p.valeur.x, cell.cx, 'et de la colonne du nombre');
  // ④ le halo couvre la COLONNE, quotation comprise : c'est le lien vertical
  //    qui est la correspondance.
  assert.ok(p.halo.h > cell.h * geo.rows, 'le halo doit embrasser toute la colonne');
  assert.ok(p.halo.cy < cell.cy, 'et remonter jusqu’au barème');
});

test('table : une colonne discordante n’a pas le droit à un barème', () => {
  // Écrire le barème une fois en tête de colonne, c'est affirmer que toute la
  // colonne le partage. Un seul intrus, et l'affirmation est fausse pour lui :
  // le moteur visuel refuse de la dessiner, comme il refuse `cycle` à une table
  // qui n'est pas cyclique.
  const menteuse = Array.from({ length: 18 }, (_, n) => ({
    char: String(n), value: String(n === 9 ? 7 : n % 9),
  }));
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{
      op: 'table', disposition: 'modulo', colonnes: 9, entries: menteuse,
      target: 't0', letter: '0', to: { id: 'r', text: '0' },
    }],
  }], lettres('hope'))), /Le barème est écrit UNE FOIS/,
  'une colonne dont les restes divergent ne peut pas se donner un barème');
});

test('table : le nombre vole vers sa case, le reste redescend du barème', () => {
  const entrees = Array.from({ length: 50 }, (_, n) => ({ char: String(n), value: String(n % 10) }));
  const tl = compile(sc([{
    id: 'a', title: 'On garde le dernier chiffre',
    ops: [{
      op: 'table', disposition: 'modulo', colonnes: 10, entries: entrees,
      target: 't0', letter: '44', to: { id: 'r', text: '4' },
    }],
  }], [{ id: 't0', text: '44', kind: 'number' }]));

  const board = tl.scene.pos(tl.nodes.find((n) => n.role === 'table').id);
  const geo = tableGeometry({ disposition: 'modulo', colonnes: 10, entries: entrees });
  const p = geo.index['44'];

  const vol = animsDe(tl, 't0', 'translate').at(-1).keyframes.at(-1).value;
  assert.ok(Math.abs(vol.x - (board.x + p.lettre.x)) < 0.5, 'le nombre atterrit sur SA case');
  assert.ok(Math.abs(vol.y - (board.y + p.lettre.y)) < 0.5);

  const naissance = tl.scene.get('r').base.translate;
  assert.ok(Math.abs(naissance.y - (board.y + geo.quotationCy)) < 0.5,
    'le reste part du barème — de l’endroit où il est écrit, et de nulle part ailleurs');

  // Contrôle croisé : la table refuse d'annoncer autre chose que ce qu'elle montre.
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{
      op: 'table', disposition: 'modulo', colonnes: 10, entries: entrees,
      target: 't0', letter: '44', to: { id: 'r', text: '7' },
    }],
  }], [{ id: 't0', text: '44', kind: 'number' }])), /refuse d’afficher autre chose/);
});

test('table : la teinte encode la valeur sans jamais la porter seule', () => {
  const scrabble = [...ALPHABET].map((char) => ({ char, value: SCRABBLE_FR[char] }));
  const geo = tableGeometry({ disposition: 'reglette', teinte: 'valeur', entries: scrabble });
  const de = (c) => geo.cells.find((x) => x.key === c);
  assert.equal(de('A').teinte, 0, 'un point : pas de teinte');
  assert.equal(de('K').teinte, 1, 'dix points : la teinte pleine');
  assert.ok(de('B').teinte > 0 && de('B').teinte < de('J').teinte,
    'la teinte croît avec la valeur, par paliers');
  // ★ Le nombre reste ÉCRIT dans la case : rien ne repose sur la couleur seule.
  for (const c of geo.cells) {
    assert.equal(c.labels[c.labels.length - 1].text, String(SCRABBLE_FR[c.key]));
  }
  // Sans la demander, aucune teinte — la réglette alphabétique reste neutre.
  assert.equal(geoAbc().cells.every((c) => c.teinte === undefined), true);
});

/**
 * ★ La teinte est MESURÉE, pas jugée à l'œil.
 *
 * Elle encode la valeur, mais le texte doit rester lisible sur TOUTES les
 * cases, dans les deux thèmes : design §5.1 impose 4,5:1 au texte normal. Le
 * test recalcule le contraste réel de chaque palier — fond de case contre
 * lettre, et contre nombre — et gèle la marge. Les deux palettes sont celles
 * de `styles/tokens.css`, dont `PALETTE` est le miroir.
 */
const THEMES = {
  clair: { ...PALETTE, raised: '#FFFFFF', line: '#D8CBB2', lineUi: '#8E806A', fg: '#1A1610', gold: '#7A5510' },
  sombre: PALETTE,
};

function contraste(a, b) {
  const canal = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (h) => {
    const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return 0.2126 * canal(n[0]) + 0.7152 * canal(n[1]) + 0.0722 * canal(n[2]);
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('★ la teinte du Scrabble reste au-dessus de 4,5:1 dans les deux thèmes', () => {
  const geo = tableGeometry({
    disposition: 'reglette', teinte: 'valeur',
    entries: [...ALPHABET].map((char) => ({ char, value: SCRABBLE_FR[char] })),
  });
  for (const [nom, palette] of Object.entries(THEMES)) {
    for (const cell of geo.cells) {
      const fond = fondDeCase(cell, palette);
      for (const l of cell.labels) {
        const encre = l.tone === 'gold' ? palette.gold : palette.fg;
        const r = contraste(encre, fond);
        assert.ok(r >= 4.5,
          `thème ${nom}, case ${cell.key} (${cell.labels[1].text} points) : ${r.toFixed(2)}:1 sur ${fond} — design §5.1 exige 4,5:1`);
      }
    }
    // ★ Et la teinte va dans le BON SENS, sans que le dessin ait à deviner le
    //   thème : plus foncée quand le fond est clair, plus claire quand il est
    //   sombre. Ce sont les jetons `raised` et `line-ui` qui portent la
    //   direction (`dom.js`).
    const clair = (h) => contraste(h, '#000000');
    const faible = fondDeCase(geo.cells.find((c) => c.teinte === 0), palette);
    const forte = fondDeCase(geo.cells.find((c) => c.teinte === 1), palette);
    const fondEstClair = clair(palette.raised) > 10;
    assert.ok(fondEstClair ? clair(forte) < clair(faible) : clair(forte) > clair(faible),
      `thème ${nom} : un score élevé doit ${fondEstClair ? 'foncer' : 'éclaircir'} la case`);
    assert.notEqual(faible, forte, 'les paliers ne se confondent pas');
  }
});

test('table : « cycle » est refusé à une table qui n’en a pas', () => {
  const chal = [...ALPHABET].map((char) => ({ char, value: CHALDEEN[char] }));
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'table', entries: chal, cycle: true, target: 't0', letter: 'H', to: { id: 'r', text: '5' } }],
  }], lettres('hope'))), /régularité que cette table n’a pas/,
  'casser la ligne au cycle affirmerait une logique absente — le moteur refuse de la dessiner');

  // La pythagoricienne, elle, la MONTRE : les colonnes se répondent.
  assert.ok(compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'table', entries: PYTHAGORE, cycle: true, target: 't0', letter: 'H', to: { id: 'r', text: '8' } }],
  }], lettres('hope'))));
});

test('table : la lettre va vers sa case, la valeur en redescend', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Chaque lettre vaut son rang',
    ops: [{ op: 'table', ordre: 'a1z26', target: 't0', to: { id: 'r8', text: '8' } }],
  }], lettres('hope')));

  assert.ok(tl.nodes.some((n) => n.role === 'table'), 'la table est montrée');
  assert.ok(tl.anims.some((a) => a.id === '@camera'), 'la caméra recule pour la cadrer');

  const geo = geoAbc();
  const caseH = geo.index.H;
  const vol = animsDe(tl, 't0', 'translate').at(-1).keyframes.at(-1).value;
  // L'identité du décor est dérivée du DESSIN, pas d'un nom : on le retrouve
  // par son rôle, comme le ferait n'importe quel lecteur de la timeline.
  const board = tl.scene.pos(tl.nodes.find((n) => n.role === 'table').id);
  assert.ok(Math.abs(vol.x - (board.x + caseH.lettre.x)) < 0.5, 'la lettre atterrit sur SA case');

  const naissance = tl.scene.get('r8').base.translate;
  assert.ok(Math.abs(naissance.y - (board.y + caseH.valeur.y)) < 0.5,
    'la valeur part de la valeur, pas de la lettre');
});

test('table : la valeur redescend AUSSITÔT — jamais toutes les lettres puis tous les nombres', () => {
  const entrees = alphabetEntries('a1z26');
  const pas = (target, letter, text, id, extra) => ({
    id: `s_${id}`,
    title: 'conversion',
    ops: [{ op: 'table', ordre: 'a1z26', entries: entrees, disposition: 'reglette', target, letter, to: { id, text }, ...extra }],
  });
  const tl = compile(sc([
    pas('t0', 'H', '8', 'r0', { montre: true, retire: false }),
    pas('t1', 'O', '15', 'r1', { retire: false }),
    pas('t2', 'P', '16', 'r2', { retire: false }),
    pas('t3', 'E', '5', 'r3', { retire: true }),
  ], lettres('hope')));

  assert.deepEqual(tl.warnings, [], 'aucune animation concurrente sur un même canal');

  // ★ Chaque valeur paraît AVANT que la lettre suivante ne s'envole : c'est
  //   l'aller-retour complet, lettre par lettre.
  const paraît = (id) => Math.min(...tl.anims.filter((a) => a.id === id && a.prop === 'opacity').map((a) => a.delay));
  // Le DERNIER `translate` d'une lettre est son envol vers la table : les
  // précédents sont les reflows qui referment la ligne derrière les autres.
  const part = (id) => Math.max(...tl.anims.filter((a) => a.id === id && a.prop === 'translate').map((a) => a.delay));
  for (const [valeur, suivante] of [['r0', 't1'], ['r1', 't2'], ['r2', 't3']]) {
    assert.ok(paraît(valeur) < part(suivante),
      `${valeur} doit être revenu avant que ${suivante} ne parte`);
  }
});

test('table : le DÉCOR est mutualisé — montée une fois, gardée, retirée une fois', () => {
  const entrees = alphabetEntries('a1z26');
  const pas = (target, letter, text, id, extra) => ({
    id: `s_${id}`,
    title: 'conversion',
    ops: [{ op: 'table', ordre: 'a1z26', entries: entrees, disposition: 'reglette', target, letter, to: { id, text }, ...extra }],
  });
  const tl = compile(sc([
    pas('t0', 'H', '8', 'r0', { montre: true, retire: false }),
    pas('t1', 'O', '15', 'r1', { retire: false }),
    pas('t2', 'P', '16', 'r2', { retire: false }),
    pas('t3', 'E', '5', 'r3', { retire: true }),
  ], lettres('hope')));

  const boards = tl.nodes.filter((n) => n.role === 'table');
  assert.equal(boards.length, 1, 'un seul nœud de table pour les quatre étapes');

  // Deux fondus seulement : l'entrée au premier step, la sortie au dernier.
  const fondus = tl.anims.filter((a) => a.id === boards[0].id && a.prop === 'opacity');
  assert.equal(fondus.length, 2, 'la table ne clignote pas entre les lettres');
  assert.equal(fondus[0].keyframes.at(-1).value, 1);
  assert.equal(fondus[1].keyframes.at(-1).value, 0);
  // … et elles encadrent bien les quatre étapes.
  assert.ok(fondus[0].delay < tl.steps[1].t0 && fondus[1].delay >= tl.steps[3].t0,
    'entrée avant la 2ᵉ lettre, sortie sur la dernière');

  // La caméra ne recule et ne revient qu'une fois : pas de zoom pompant.
  const cam = tl.anims.filter((a) => a.id === '@camera' && a.prop === 'scale');
  assert.equal(cam.length, 2, 'un recul, un retour, rien entre les deux');
});

test('table : deux tables DIFFÉRENTES ne se confondent pas — le décor change avec la méthode', () => {
  const abc = alphabetEntries('a1z26');
  const pyth = [...ALPHABET].map((char, i) => ({ char, value: (i % 9) + 1 }));
  const tl = compile(sc([
    {
      id: 's0', title: 'A',
      ops: [{ op: 'table', ordre: 'a1z26', entries: abc, disposition: 'reglette', target: 't0', letter: 'H', to: { id: 'r0', text: '8' } }],
    },
    {
      id: 's1', title: 'B',
      ops: [{ op: 'table', entries: pyth, disposition: 'reglette', cycle: true, target: 't1', letter: 'O', to: { id: 'r1', text: '6' } }],
    },
  ], lettres('hope')));
  assert.equal(tl.nodes.filter((n) => n.role === 'table').length, 2,
    'la réglette alphabétique et la pythagoricienne sont deux décors distincts');
});

test('★ le geste est celui du clavier : le caractère passe PAR-DESSUS le décor', () => {
  // Le décor vit dans la couche du fond, les jetons de texte au-dessus : la
  // superposition est structurelle, pas une question d'ordre d'insertion. Un
  // caractère qui s'enfonce derrière la table est illisible au moment précis
  // où il faudrait le suivre.
  assert.equal(layerOf('table'), 'back');
  assert.equal(layerOf('keyboard'), 'back');
  assert.equal(layerOf('text'), 'mid');
  assert.ok(LAYERS.indexOf('back') < LAYERS.indexOf('mid'));

  // Et les deux primitives suivent la MÊME partition (`decor.js`) : la case
  // s'allume à mi-vol, le caractère ne s'efface qu'en arrivant.
  const geste = (op, tokens) => {
    const tl = compile(sc([{ id: 'a', title: 'A', ops: [op] }], tokens));
    const halo = tl.anims.find((x) => (x.id.startsWith('@case:') || x.id.startsWith('@key:')) && x.prop === 'opacity');
    const vol = tl.anims.find((x) => x.id === tokens[0].id && x.prop === 'translate');
    const efface = tl.anims.find((x) => x.id === tokens[0].id && x.prop === 'opacity');
    return { halo: halo.delay, volDebut: vol.delay, volFin: vol.delay + vol.duration, efface: efface.delay };
  };
  const t = geste({ op: 'table', ordre: 'a1z26', target: 't0', to: { id: 'r', text: '8' } }, lettres('hope'));
  const k = geste({ op: 'keyboard', target: 'k0', key: '-', to: { id: 'r', text: '6' } },
    [{ id: 'k0', text: '-', kind: 'sep' }]);
  for (const [nom, g] of [['table', t], ['keyboard', k]]) {
    assert.ok(g.halo > g.volDebut && g.halo < g.volFin,
      `${nom} : la case s’allume À MI-VOL, quand le caractère arrive — pas avant qu’il parte`);
    assert.ok(g.efface >= g.volDebut + 0.7 * (g.volFin - g.volDebut),
      `${nom} : le caractère reste opaque jusqu’à l’atterrissage`);
  }
  // ★ Les deux gestes sont la MÊME partition (les durées d'op diffèrent, les
  //   proportions non) : c'est `decor.js` qui les écrit, une fois pour deux.
  const part = (g, quoi) => Math.round(((g[quoi] - g.volDebut) / (g.volFin - g.volDebut)) * 1000) / 1000;
  assert.equal(part(t, 'halo'), part(k, 'halo'), 'même instant d’illumination, à l’échelle du vol');
  assert.equal(part(t, 'efface'), part(k, 'efface'), 'même instant d’effacement');
});

test('★ plus de cartouche derrière les jetons de la ligne principale', () => {
  const tl = compile(sc([
    { id: 'a', title: 'On isole', ops: [{ op: 'highlight', targets: ['t0', 't1'] }] },
    { id: 'b', title: 'Rang', ops: [{ op: 'table', ordre: 'a1z26', target: 't0', to: { id: 'r', text: '8' } }] },
  ], lettres('hope')));
  assert.equal(tl.nodes.filter((n) => n.role === 'halo' && n.id.startsWith('@halo:')).length, 0,
    'aucun aplat translucide posé derrière un jeton désigné');
  // La désignation demeure : la couleur ET la dilatation.
  assert.ok(animsDe(tl, 't0', 'fill').length, 'le jeton désigné change de couleur');
  assert.ok(animsDe(tl, 't0', 'scale').length, 'et se dilate — ce n’est pas la couleur seule');
});

test('table : contrôle croisé — la valeur montrée fait foi', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'table', ordre: 'a1z26', target: 't0', to: { id: 'faux', text: '7' } }],
  }], lettres('hope'))), /la table montre 8/);

  // Et l'oracle indépendant : une réglette alphabétique annoncée de travers est
  // refusée AVANT même qu'on regarde les paires.
  assert.throws(() => compile(sc([{
    id: 'a',
    title: 'A',
    ops: [{
      op: 'table', ordre: 'a1z26', target: 't0', to: { id: 'x', text: '8' },
      entries: [...ALPHABET].map((char, i) => ({ char, value: char === 'H' ? 99 : i + 1 })),
    }],
  }], lettres('hope'))), /refuse de dessiner autre chose/);
});

test('table : un caractère hors de la table dégrade sans table', () => {
  const tl = compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'table', ordre: 'a1z26', target: 's0', to: { id: 'x', text: '6' } }],
  }], [{ id: 's0', text: '-', kind: 'sep' }]));
  assert.ok(!tl.nodes.some((n) => n.role === 'table'), 'aucune table');
  assert.ok(!tl.anims.some((a) => a.id === '@camera'), 'aucune caméra');
  assert.ok(tl.nodes.some((n) => n.id === 'x'), 'la substitution a tout de même lieu');
});

// ───────────────────────────── 5 et 6. l'encart de comptage

const encartDe = (tl, id) => tl.nodes.find((n) => n.id === `@encart:${id}`);
const compteurDe = (tl, id) => tl.nodes.find((n) => n.id === `@compteur:${id}`);
/**
 * ★ L'afficheur est un DÉCOR, et son identité est celle de ce qu'il MONTRE —
 * l'afficheur et son régime (segments comptés un par un, ou traits fusionnés) —,
 * jamais celle de la lettre qui passe dedans. C'est ce qui lui permet de rester
 * en place d'une conversion à la suivante, comme la table et le clavier. Le
 * comptage de traits, lui, garde un encart par jeton : ce qu'il montre EST la
 * lettre.
 */
const cleSeg = (nom, regime) => `${nom}:${regime}`;
const segDe = (cle, k) => `@seg:${cle}:${k}`;

test('sevenSeg : encart, compteur, allumage un à un, puis substitution', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Traits continus de l’afficheur',
    ops: [{ op: 'sevenSeg', target: 't0', segments: 'bcefg', count: 3, to: { id: 'trois', text: '3' } }],
  }], lettres('hope')));

  assert.ok(encartDe(tl, cleSeg('sevenSeg', 'traits')), 'la lettre est montée dans un encart');
  assert.ok(animsDe(tl, 't0', 'translate').length, 'elle s’y est déplacée');
  assert.ok(animsDe(tl, 't0', 'scale').some((a) => a.keyframes.at(-1).value > 1), 'et y a grandi');

  const compteur = compteurDe(tl, 't0');
  assert.ok(compteur && compteur.text === '0', 'le compteur part de zéro');
  const suite = tl.discrete.find((d) => d.id === compteur.id);
  assert.deepEqual([0, 0.5, 1].map((u) => suite.render(u)), ['1', '2', '3'], 'un cran par trait allumé');

  // Les segments s'allument l'un après l'autre, jamais tous ensemble.
  const cle7 = cleSeg('sevenSeg', 'traits');
  const allumages = ['b', 'c', 'e', 'f', 'g']
    .map((k) => animsDe(tl, segDe(cle7, k), 'opacity').find((a) => a.keyframes.at(-1).value === 1).delay);
  assert.equal(new Set(allumages).size, 3, 'trois instants d’allumage — les traits fusionnés');
  const eteints = ['a', 'd'].map((k) => animsDe(tl, segDe(cle7, k), 'opacity'));
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

  const cle14 = cleSeg('fourteenSeg', 'segments');
  assert.ok(encartDe(tl, cle14), 'la lettre est montée dans un encart');
  const compteur = compteurDe(tl, 't0');
  const suite = tl.discrete.find((d) => d.id === compteur.id);
  assert.equal(suite.render(1), '6', 'le compteur va jusqu’à six');
  // Les quatorze segments sont posés, six s'allument, huit restent fantômes.
  const poses = SEGMENT14_ORDER.filter((k) => tl.nodes.some((n) => n.id === segDe(cle14, k)));
  assert.deepEqual(poses, [...SEGMENT14_ORDER], 'l’afficheur entier est montré, éteint compris');
  const allumes = SEGMENT14_ORDER.filter((k) => animsDe(tl, segDe(cle14, k), 'opacity')
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

/* ───────────── Comptés un par un : le dessin de la police ─────────────
 *
 * Le régime de FUSION veut des segments qui se soudent ; le COMPTAGE
 * INDIVIDUEL veut le contraire, et il le veut pour une raison qu'on peut
 * mesurer : deux segments qui se recouvrent, ce sont deux choses comptées et
 * une seule vue. Les tracés dérivés de DSEG (`src/gfx/dseg-segments.py`)
 * doivent donc être des polygones deux à deux DISJOINTS. On ne le croit pas
 * sur parole : on échantillonne le repère glyphe et on vérifie qu'aucun point
 * n'appartient à deux segments à la fois.
 */

/** Les sommets d'un tracé « M x y L x y … Z ». */
function sommets(d) {
  const n = d.replace(/[MLZ]/g, ' ').trim().split(/\s+/).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

/** Point dans un polygone — lancer de rayon, sans dépendance. */
function dedans(pts, x, y) {
  let dans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dans = !dans;
  }
  return dans;
}

test('★ comptés un par un : les segments de la police ne se recouvrent jamais', () => {
  for (const [nom, table, ordre] of [
    ['DSEG7', SEGMENTS_DSEG7, SEGMENT_ORDER],
    ['DSEG14', SEGMENTS_DSEG14, SEGMENT14_ORDER],
  ]) {
    assert.deepEqual(Object.keys(table), [...ordre], `${nom} : un tracé par segment, dans l'ordre`);
    const polys = ordre.map((k) => sommets(table[k].d));
    for (const [i, p] of polys.entries()) {
      assert.ok(p.length >= 4, `${nom} : ${ordre[i]} est un polygone fermé`);
    }
    let aire = new Array(ordre.length).fill(0);
    // Pas de 2 unités sur la grille glyphe : plus fin que la fente la plus
    // étroite de DSEG (une vingtaine d'unités), donc un recouvrement ne peut
    // pas passer entre les mailles.
    for (let y = 1; y < 600; y += 2) {
      for (let x = 1; x < 400; x += 2) {
        let porteur = -1;
        for (const [i, p] of polys.entries()) {
          if (!dedans(p, x, y)) continue;
          assert.equal(porteur, -1,
            `${nom} : le point (${x},${y}) appartient à la fois à « ${ordre[porteur]} » et à « ${ordre[i]} »`);
          porteur = i;
          aire[i] += 1;
        }
      }
    }
    aire.forEach((a, i) => assert.ok(a > 100, `${nom} : ${ordre[i]} a une surface`));
  }
});

test('★ deux régimes, deux dessins : la fusion soude, le comptage sépare', () => {
  const opSept = (fusion, count) => ({
    op: 'sevenSeg', target: 't0', segments: 'bcefg', fusion, count,
  });
  // Fusion : traits d'axe, allumés par leur `stroke` — ils se soudent.
  const fusionne = compile(sc([{ id: 'a', title: 'A', ops: [opSept(true, 3)] }], lettres('hope')));
  const nSoude = fusionne.nodes.find((n) => n.id === segDe(cleSeg('sevenSeg', 'traits'), 'b'));
  assert.equal(nSoude.data.d, SEGMENTS.b.d, 'la fusion garde le trait d’axe');
  assert.ok(!nSoude.data.plein);
  assert.ok(nSoude.base.stroke, 'un trait s’allume par sa couleur de trait');
  assert.equal(animsDe(fusionne, segDe(cleSeg('sevenSeg', 'traits'), 'b'), 'stroke').length, 2,
    'un allumage, puis le retour à la couleur de l’éteint quand le décor se range');
  assert.equal(animsDe(fusionne, segDe(cleSeg('sevenSeg', 'traits'), 'b'), 'fill').length, 0);

  // Comptage individuel : le polygone de la police, allumé par son `fill`.
  const compte = compile(sc([{ id: 'a', title: 'A', ops: [opSept(false, 5)] }], lettres('hope')));
  const nPlein = compte.nodes.find((n) => n.id === segDe(cleSeg('sevenSeg', 'segments'), 'b'));
  assert.equal(nPlein.data.d, SEGMENTS_DSEG7.b.d, 'le comptage prend le dessin de la police');
  assert.equal(nPlein.data.plein, true);
  assert.ok(nPlein.base.fill, 'un plein s’allume par sa couleur de remplissage');
  assert.equal(animsDe(compte, segDe(cleSeg('sevenSeg', 'segments'), 'b'), 'fill').length, 2);
  assert.equal(animsDe(compte, segDe(cleSeg('sevenSeg', 'segments'), 'b'), 'stroke').length, 0);
  // Et le contrôle croisé reste entier : cinq segments, cinq allumages.
  const allumes = SEGMENT_ORDER.filter((k) => animsDe(compte, segDe(cleSeg('sevenSeg', 'segments'), k), 'fill').length);
  assert.deepEqual(allumes, ['b', 'c', 'e', 'f', 'g']);
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A', ops: [opSept(false, 3)],
  }], lettres('hope'))), /l’afficheur en montre 5/);
});

test('le quatorze segments suit la même règle des deux régimes', () => {
  const H14 = ['b', 'c', 'e', 'f', 'g1', 'g2'];
  const compte = compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'fourteenSeg', target: 't0', segments: H14, fusion: false, count: 6 }],
  }], lettres('hope')));
  const n = compte.nodes.find((x) => x.id === segDe(cleSeg('fourteenSeg', 'segments'), 'g1'));
  assert.equal(n.data.d, SEGMENTS_DSEG14.g1.d);
  assert.equal(n.data.plein, true);
  // Un polygone porte son épaisseur : il ne reçoit pas de largeur de trait.
  assert.equal(n.data.width, undefined);
  const fusionne = compile(sc([{
    id: 'a', title: 'A', ops: [{ op: 'fourteenSeg', target: 't0', segments: H14, count: 3 }],
  }], lettres('hope')));
  const f = fusionne.nodes.find((x) => x.id === segDe(cleSeg('fourteenSeg', 'traits'), 'g1'));
  assert.equal(f.data.d, SEGMENTS14.g1.d);
  assert.equal(f.data.width, SEG14_STROKE, 'un trait d’axe reçoit son épaisseur');
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

// ───────────────────────────── 8. les cornes du 666 déjà formé

/**
 * ★ `horns` — la chute du site, et son contrôle croisé.
 *
 * Le geste dit une chose et une seule : « ces trois 6 étaient déjà côte à côte,
 * regardez ». Tout ce qui est vérifié ici sert à empêcher qu'il en dise une
 * autre — des cornes posées sur un 666 qu'on aurait fabriqué en rassemblant des
 * 6 épars seraient une affirmation, pas une démonstration (CONTRACTS §0.3).
 */
const suiteDeChiffres = (suite) => [...suite].map((c, i) => ({ id: `d${i}`, text: c, kind: 'digit' }));

test('horns : le reste s’efface, puis les cornes poussent sur les trois 6', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Trois 6 d’affilée',
    ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3', 'd4', 'd5'] }],
  }], suiteDeChiffres('666736')));

  // Une corne par 6 EXTÉRIEUR, chacune ACCROCHÉE au chiffre qu'elle couronne —
  // c'est ce qui la fera suivre au reflow et grandir au verdict, et c'est ce qui
  // rend son calage insensible à l'écart entre les 6 (voir `horns.js`, « UNE
  // CORNE, UN NŒUD » et `tests/cornes.test.js`).
  const cornes = tl.nodes.filter((n) => n.role === 'horns');
  assert.equal(cornes.length, 2, 'deux cornes, deux nœuds');
  assert.deepEqual(cornes.map((n) => n.data.suit), ['d0', 'd2'],
    'chaque corne est accrochée à SON 6 ; le chiffre du milieu n’en porte pas');
  assert.equal(tl.scene.accrochesA('d0')[0], cornes[0].id);
  assert.deepEqual(tl.scene.accrochesA('d1'), [], 'un diable n’a pas de corne frontale');

  // Elles poussent : de rien à leur taille, et elles paraissent.
  const pousse = animsDe(tl, cornes[0].id, 'scale')[0];
  assert.equal(pousse.keyframes[0].value, 0, 'elles partent de rien');
  assert.equal(pousse.keyframes.at(-1).value, 1);

  // Le reste s'efface AVANT — jamais après : on doit lire « il n'y avait que ça ».
  for (const id of ['d3', 'd4', 'd5']) {
    assert.equal(tl.scene.get(id).alive, false, `${id} devait s’effacer`);
    assert.ok(animsDe(tl, id, 'opacity')[0].delay < pousse.delay,
      'la gomme commence avant que les cornes ne poussent');
  }
  // Et les trois 6 restent : ni effacés, ni remplacés, ni déplacés.
  for (const id of ['d0', 'd1', 'd2']) {
    assert.ok(tl.scene.get(id).alive, `${id} porte les cornes, il ne s’efface pas`);
    assert.equal(animsDe(tl, id, 'translate').length, 0,
      'on ne rapproche rien : le 666 était déjà d’un seul tenant');
  }
});

test('★ horns : le contrôle croisé refuse tout ce qui n’est pas trois 6 contigus', () => {
  const essai = (op, tokens) => compile(sc([{ id: 'a', title: 'A', ops: [op] }], tokens));

  // Trois 6 DISPERSÉS : c'est l'autre geste, celui qui rassemble et qui coûte.
  assert.throws(
    () => essai({ op: 'horns', targets: ['d0', 'd2', 'd4'] }, suiteDeChiffres('676869')),
    /ne se touchent pas/,
    'trois 6 non contigus ne sont pas un 666 trouvé',
  );

  // Deux 6 seulement — le troisième jeton n'en est pas un.
  assert.throws(
    () => essai({ op: 'horns', targets: ['d0', 'd1', 'd2'] }, suiteDeChiffres('664')),
    /seuls trois 6 font un 666/,
    'on ne couronne pas un 4',
  );

  // Pas trois cibles du tout.
  assert.throws(
    () => essai({ op: 'horns', targets: ['d0', 'd1'] }, suiteDeChiffres('66')),
    /666 fait trois 6/,
  );

  // Et l'on n'efface pas ce qu'on couronne.
  assert.throws(
    () => essai({ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d1'] }, suiteDeChiffres('6666')),
    /On n’efface pas ce qu’on couronne/,
  );
});

test('★ horns : les cornes SUIVENT — au reflow comme au verdict', () => {
  const tl = compile(sc([
    {
      id: 'a', title: 'Trois 6 d’affilée',
      ops: [{ op: 'horns', targets: ['d1', 'd2', 'd3'], efface: ['d0'] }],
    },
    { id: 'b', title: 'On rapproche', ops: [{ op: 'move' }] },
    { id: 'c', title: 'Verdict', ops: [{ op: 'reveal', targets: ['d1', 'd2', 'd3'] }] },
  ], suiteDeChiffres('4666')));

  // Chaque corne suit LE SIEN — c'est ce qui rend le calage insensible à un
  // re-espacement de la ligne (`horns.js`, « UNE CORNE, UN NŒUD »).
  const point = (a) => [a.keyframes.at(-1).value.x, a.keyframes.at(-1).value.y];
  for (const hote of ['d1', 'd3']) {
    const corne = tl.nodes.find((n) => n.role === 'horns' && n.data.suit === hote);
    assert.ok(corne, `${hote} devrait porter une corne`);

    // Au reflow : le décor se déplace exactement comme le jeton qui le porte.
    const bougeJeton = animsDe(tl, hote, 'translate');
    const bougeCorne = animsDe(tl, corne.id, 'translate');
    assert.ok(bougeJeton.length && bougeCorne.length, 'jeton et corne se déplacent');
    assert.deepEqual(point(bougeCorne.at(-1)), point(bougeJeton.at(-1)),
      `la corne atterrit au même point que « ${hote} »`);

    // Au verdict : elle grandit du même facteur que les chiffres. Sans quoi elle
    // resterait à sa taille au milieu de glyphes huit fois plus hauts.
    const zoomJeton = animsDe(tl, hote, 'scale').at(-1).keyframes.at(-1).value;
    const zoomCorne = animsDe(tl, corne.id, 'scale').at(-1).keyframes.at(-1).value;
    assert.ok(zoomJeton > 1, 'le verdict grossit bien les chiffres');
    assert.equal(zoomCorne, zoomJeton);
  }
});
