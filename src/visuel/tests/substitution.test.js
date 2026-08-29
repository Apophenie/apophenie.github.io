/**
 * Les chiffrements par substitution — Atbash, César, leet speak.
 *
 * Ce qu'on vérifie ici n'est pas « ça compile » : c'est que la conversion est
 * MONTRÉE. Une lettre qui en devient une autre sans qu'on voie pourquoi est une
 * affirmation, et ce projet n'en fait pas (CONTRACTS §0.3). D'où trois choses :
 *
 *  1. le dessin — deux réglettes alignées, celle du bas étant celle du haut
 *     **déplacée** : retournée pour l'Atbash, glissée pour César, avec la
 *     couture du modulo là où le glissement revient au début ;
 *  2. le refus — une substitution qui n'est PAS un déplacement de l'alphabet ne
 *     peut pas emprunter ce dessin pour se faire passer pour une règle ;
 *  3. le contrôle croisé — la réglette affichée est dérivée d'`atbash` et de
 *     `cesar` eux-mêmes, et la compilation échoue si l'affichage et le calcul
 *     divergent.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile, repeatOrigins } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { tableGeometry, pasDeGlissiere, DISPOSITIONS } from '../assets.js';
import { layerOf } from '../dom.js';
import { LETTRES, atbash, cesar } from '../../moteur/tables/alphabet.js';
import { FILTRES } from '../../moteur/transformations/filtres.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const filtre = (id) => FILTRES.find((f) => f.id === id);

/** La réglette telle que l'opérateur la fait voyager — jamais recopiée ici. */
const regletteDe = (id) => filtre(id).table.map((e) => ({ ...e }));

const bande = (geo, ligne) => geo.cells.filter((c) => c.ligne === ligne)
  .map((c) => c.labels[0].text).join('');

// ───────────────────────── 1. le dessin : deux alphabets

test('glissiere : la réglette du bas est celle du haut, DÉPLACÉE', () => {
  assert.ok(DISPOSITIONS.includes('glissiere'), 'la mise en page appartient au vocabulaire');

  // ★ L'Atbash — le miroir. On lit l'alphabet en haut, l'alphabet à l'envers en
  //   bas : la règle se constate au lieu d'être crue sur parole.
  const miroir = tableGeometry({ disposition: 'glissiere', entries: regletteDe('f.atbash') });
  assert.equal(bande(miroir, 0), LETTRES);
  assert.equal(bande(miroir, 1), [...LETTRES].reverse().join(''));
  assert.equal(miroir.sens, -1, 'un pas de −1 : la réglette est retournée bout pour bout');
  assert.deepEqual(miroir.coutures, [], 'un miroir ne repasse jamais par le bout de l’alphabet');
  // L'axe de la symétrie tombe pile au milieu de la bande : M en face de N.
  assert.equal(miroir.index.M.value, 'N');
  assert.equal(miroir.index.N.value, 'M');

  // ★ César — le glissement. Même alphabet, parti treize rangs plus loin, et la
  //   COUTURE là où il revient au début : c'est le modulo, montré.
  const glisse = tableGeometry({ disposition: 'glissiere', entries: regletteDe('f.rot13') });
  assert.equal(bande(glisse, 0), LETTRES);
  assert.equal(bande(glisse, 1), 'NOPQRSTUVWXYZABCDEFGHIJKLM');
  assert.equal(glisse.sens, 1);
  assert.deepEqual(glisse.coutures, [12], 'la couture tombe entre le M et le N, là où Z passe à A');

  // Les colonnes sont à pas constant — c'est l'alignement qui fait la
  // démonstration —, et la couture est le SEUL vide horizontal.
  const xs = glisse.cells.filter((c) => c.ligne === 0).map((c) => c.cx);
  const pas = xs.slice(1).map((x, i) => Math.round(x - xs[i]));
  assert.equal(new Set(pas.filter((_, i) => i !== 12)).size, 1, 'un seul pas partout ailleurs');
  assert.ok(pas[12] > pas[0], 'et un vide à la couture, plus large que le pas');

  // Une colonne, deux cases, exactement alignées : la correspondance est
  // verticale, et rien d'autre ne la porte.
  assert.equal(glisse.index.H.lettre.x, glisse.index.H.valeur.x);
  assert.ok(glisse.index.H.valeur.y > glisse.index.H.lettre.y);

  // Vingt-six colonnes doivent tenir dans la largeur utile (viewBox 1200,
  // marges 72) : la glissière se lit SANS que la caméra ait à reculer.
  assert.ok(glisse.width <= 1200 - 2 * 72, `la glissière tient dans le cadre (${glisse.width})`);
});

test('glissiere : le halo couvre la COLONNE, pas une seule case', () => {
  const geo = tableGeometry({ disposition: 'glissiere', entries: regletteDe('f.atbash') });
  const h = geo.index.H;
  const haut = geo.cells[h.cell];
  assert.equal(Math.round(h.halo.cx), Math.round(haut.cx));
  assert.ok(h.halo.h > haut.h, 'les deux réglettes ensemble : c’est le lien vertical qu’on éclaire');
  assert.equal(Math.round(h.halo.cy), Math.round((h.lettre.y + h.valeur.y) / 2));
});

// ───────────────────────── 2. le refus : le dessin ne se prête pas

test('glissiere : le dessin est REFUSÉ à qui n’est pas un déplacement', () => {
  // Le leet speak substitue, mais il ne déplace pas l'alphabet : sa réglette
  // n'a pas de pas constant. Deux alphabets alignés affirmeraient une règle
  // qu'il n'a pas.
  assert.equal(pasDeGlissiere(regletteDe('f.leet')), null);
  assert.equal(filtre('f.leet').forme, 'reglette', 'il reste en réglette ordinaire');

  const bancal = [...LETTRES].map((char, i) => ({ char, value: LETTRES[(i * 3) % 26] }));
  assert.equal(pasDeGlissiere(bancal), null, 'un pas de 3 change à chaque repli : ce n’est pas un glissement');
  assert.throws(() => compile(sc([{
    id: 'a', title: 'On chiffre',
    ops: [{
      op: 'table', disposition: 'glissiere', entries: bancal,
      target: 't0', letter: 'H', to: { id: 'r', text: 'V', kind: 'letter' },
    }],
  }], lettres('hope'))), /pas constant de ±1/);

  // Et les deux options de la réglette n'ont rien à faire là : la glissière n'a
  // pas de rangées à découper, et une lettre n'est ni grande ni petite.
  const bonnes = regletteDe('f.atbash');
  assert.throws(() => compile(sc([{
    id: 'a', title: 'On chiffre',
    ops: [{
      op: 'table', disposition: 'glissiere', entries: bonnes, cycle: true,
      target: 't0', letter: 'H', to: { id: 'r', text: 'S', kind: 'letter' },
    }],
  }], lettres('hope'))), /« cycle » et « glissiere » ne vont pas ensemble/);
});

test('glissiere : contrôle croisé — la case fait foi, à la casse près', () => {
  const entries = regletteDe('f.atbash');
  const op = (to) => sc([{
    id: 'a', title: 'On applique l’Atbash',
    ops: [{ op: 'table', disposition: 'glissiere', entries, target: 't0', letter: 'H', to }],
  }], lettres('hope'));

  // La ligne garde sa casse, la réglette est en capitales : « h » en redescend
  // « s » là où la case porte « S ». C'est le pliage qu'`atbash` applique
  // lui-même, et le seul qu'on tolère.
  assert.ok(compile(op({ id: 'r', text: 's', kind: 'letter' })), 'la casse ne fait pas mentir la table');
  assert.ok(compile(op({ id: 'r', text: 'S', kind: 'letter' })));
  // Une autre lettre, en revanche, est un mensonge — et il ne passe pas.
  assert.throws(() => compile(op({ id: 'r', text: 'z', kind: 'letter' })),
    /refuse d’afficher autre chose que ce qui est montré/);
});

// ───────────────────────── 3. le geste, tel que l'opérateur l'émet

/** Les steps qu'un filtre émet réellement, sur une valeur donnée. */
function stepsDe(id, valeur) {
  const f = filtre(id);
  const traces = [...valeur].map((_, i) => [[i, i + 1]]);
  const apres = f.apply(valeur, traces);
  const ctx = {
    ids: [...valeur].map((_, i) => `t${i}`),
    cle: 'e1',
    langue: 'fr',
  };
  const avant = { type: 'STR', valeur, traces };
  return { apres, steps: f.steps(avant, { type: 'STR', ...apres }, ctx), ctx, f };
}

test('Atbash : une lettre, un aller-retour — et le décor reste monté', () => {
  const { apres, steps } = stepsDe('f.atbash', 'https');
  assert.equal(apres.valeur, atbash('https'));

  assert.equal(steps.length, 5, 'un step par lettre : on voit QUELLE lettre donne QUOI');
  assert.ok(steps.every((s) => s.ops.length === 1 && s.ops[0].op === 'table'));
  assert.ok(steps.every((s) => s.ops[0].disposition === 'glissiere'));

  // ★ Le décor se mutualise : monté à la première, gardé, retiré à la dernière.
  assert.deepEqual(steps.map((s) => s.ops[0].montre), [true, false, false, false, false]);
  assert.deepEqual(steps.map((s) => s.ops[0].retire), [false, false, false, false, true]);

  // La lettre envoyée est la lettre PLIÉE, celle qu'`apply()` a convertie ; la
  // valeur qui revient garde la casse de la ligne.
  assert.deepEqual(steps.map((s) => s.ops[0].letter), ['H', 'T', 'T', 'P', 'S']);
  assert.deepEqual(steps.map((s) => s.ops[0].to.text), [...atbash('https')]);
  assert.ok(steps.every((s) => s.ops[0].to.kind === 'letter'));

  // La légende MONTRE la conversion au lieu de la répéter en abstrait.
  assert.match(steps[0].caption, /h → s/);
});

test('Atbash : ce que le chiffrement ne touche pas ne bouge pas', () => {
  // Le tiret n'est pas dans l'alphabet : l'Atbash le laisse, et aucune étape ne
  // laisse croire le contraire — ni sur la ligne, ni dans l'identité du jeton.
  const { steps, ctx, f, apres } = stepsDe('f.atbash', 'hope-hope');
  assert.equal(apres.valeur, atbash('hope-hope'));
  assert.equal(steps.length, 8, 'huit lettres, huit étapes — le tiret n’en fait aucune');
  assert.ok(!steps.some((s) => s.ops[0].letter === '-'));

  const sortie = f.sortie({ type: 'STR', valeur: 'hope-hope' }, { type: 'STR', ...apres }, ctx);
  assert.equal(sortie[4], ctx.ids[4], 'le tiret garde son identifiant : rien ne l’a transformé');
  assert.notEqual(sortie[0], ctx.ids[0], 'le « h », lui, est bien un jeton neuf');
  // Et tout ce que les étapes créent est exactement ce que `sortie` annonce.
  assert.deepEqual(steps.map((s) => s.ops[0].to.id), sortie.filter((id, i) => id !== ctx.ids[i]));
});

test('leet speak : une réglette ordinaire, mais une réglette QUAND MÊME', () => {
  const { apres, steps } = stepsDe('f.leet', 'h0p3');
  assert.equal(apres.valeur, 'hope');
  assert.equal(steps.length, 2, 'seuls le 0 et le 3 changent');
  assert.deepEqual(steps.map((s) => s.ops[0].disposition), ['reglette', 'reglette']);
  assert.deepEqual(steps.map((s) => s.ops[0].letter), ['0', '3']);
  assert.deepEqual(steps.map((s) => s.ops[0].to.text), ['o', 'e']);
  // Neuf correspondances montrées, pas neuf affirmées en légende. Les trois
  // dernières se lisent à la casse près : le 6 a la panse d'un « b », le 8 les
  // deux panses d'un « B », le 9 la boucle d'un « g » — c'est le DESSIN qui
  // justifie la substitution, et l'écrire en bas de casse la perdrait.
  assert.deepEqual(steps[0].ops[0].entries.map((e) => `${e.char}${e.value}`),
    ['0o', '1i', '3e', '4a', '5s', '6b', '7t', '8B', '9g']);
});

test('la table montrée est dérivée de la fonction qui chiffre, pas d’une copie', () => {
  // Le contrôle croisé exigé par CONTRACTS §0.3 : si quelqu'un touchait
  // `atbash` ou `cesar` sans toucher au dessin, c'est ici que ça se verrait.
  for (const [id, fn] of [['f.atbash', atbash], ['f.rot13', (c) => cesar(c, 13)]]) {
    assert.deepEqual(regletteDe(id), [...LETTRES].map((char) => ({ char, value: fn(char) })));
  }
});

test('redite : même chiffrement ET même lettre s’accélère, même chiffrement seul non', () => {
  const { steps } = stepsDe('f.atbash', 'https');
  const scenario = sc(steps.map((s, i) => ({ ...s, id: `s${i}` })), lettres('https'));
  const origines = repeatOrigins(scenario);
  // « h », « t », « p », « s » inaugurent chacun leur geste ; le second « t »
  // redit le premier — même table, même lettre, même résultat.
  assert.deepEqual(origines, [-1, -1, 1, -1, -1]);
});

test('Atbash : le geste compile, et c’est celui du clavier', () => {
  const { steps } = stepsDe('f.atbash', 'https');
  const tl = compile(sc(steps.map((s, i) => ({ ...s, id: `s${i}` })), lettres('https')));

  // Le décor existe, et il n'a été monté qu'une fois : entre les deux bouts,
  // aucune animation ne le touche — la réglette ne clignote pas.
  const decor = tl.nodes.filter((n) => n.role === 'table');
  assert.equal(decor.length, 1, 'une seule glissière pour les cinq lettres');
  const fondus = tl.anims.filter((a) => a.id === decor[0].id && a.prop === 'opacity');
  assert.equal(fondus.length, 2, 'un fondu d’entrée, un fondu de sortie, rien entre les deux');

  // Le caractère passe PAR-DESSUS le décor : la superposition est structurelle
  // (la table vit dans « back », les jetons de texte dans « mid »).
  assert.equal(layerOf(decor[0].role), 'back');
  assert.equal(layerOf(tl.nodes.find((n) => n.id === 't0').role), 'mid');

  // Et la valeur revient bien à sa place dans la ligne.
  const arrivee = tl.nodes.find((n) => n.text === 's' && n.role === 'text');
  assert.ok(arrivee, 'le « s » de l’Atbash est bien né');
});
