/** Tests du découpage en étapes du logo — `node --test src/app/`.
 *
 *  Tout ce qui est vérifiable sans DOM l'est ici : la table des quatre étapes,
 *  les charnières qu'elle produit, et — le point qui compte — le fait que la
 *  sémantique des boutons du README s'applique à ces charnières-là, puisque
 *  c'est le MÊME automate (`src/visuel/nav.js`) qui les lit.
 *
 *  Le reste (mise en pause des @keyframes CSS, `currentTime`) exige un vrai
 *  moteur de rendu : c'est du ressort de la vérification en navigateur.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { construireEtapes, ETAPES_LOGO, CHO_NOMINAL } from './logo-lecteur.js';
import { EPS, MIN_STEP_DURATION, MIN_HINGE_GAP } from '../visuel/constants.js';
import * as nav from '../visuel/nav.js';

test('quatre étapes, 1 s + 1 s + 1 s + 0,5 s — le rythme demandé', () => {
  assert.equal(ETAPES_LOGO.length, 4);
  assert.deepEqual(ETAPES_LOGO.map((e) => e.ms), [1000, 1000, 1000, 500]);
  assert.equal(CHO_NOMINAL, 3500);
});

test('les charnières tombent aux frontières d’étape et ferment sur le total', () => {
  const { steps, bounds, total } = construireEtapes();
  assert.equal(total, 3500);
  assert.deepEqual(bounds, [0, 1000, 2000, 3000, 3500]);
  assert.equal(steps.length, 4);
  assert.deepEqual(steps.map((s) => s.t0), [0, 1000, 2000, 3000]);
  assert.deepEqual(steps.map((s) => s.t1), [1000, 2000, 3000, 3500]);
  assert.deepEqual(steps.map((s) => s.index), [0, 1, 2, 3]);
});

test('un --cho non nominal met les étapes à l’échelle, sans dérive du total', () => {
  // La dernière charnière est FERMÉE sur le total : sommer des durées
  // arrondies laisserait `atEnd` faux, donc « Fin » cliquable à la fin.
  for (const total of [3500, 1750, 7000, 3333, 1000]) {
    const { bounds } = construireEtapes(total);
    assert.equal(bounds[0], 0);
    assert.equal(bounds[bounds.length - 1], total, `total ${total}`);
    for (let i = 1; i < bounds.length; i++) {
      assert.ok(bounds[i] > bounds[i - 1], `charnières croissantes (total ${total})`);
      assert.ok(bounds[i] - bounds[i - 1] >= MIN_HINGE_GAP,
        `charnières distinctes d’au moins 2·EPS (total ${total})`);
      assert.ok(bounds[i] - bounds[i - 1] >= MIN_STEP_DURATION,
        `étape d’au moins ${MIN_STEP_DURATION} ms (total ${total})`);
    }
  }
});

test('un --cho absurde retombe sur la durée nominale', () => {
  for (const mauvais of [0, -1, NaN, Infinity, undefined]) {
    assert.equal(construireEtapes(mauvais).total, CHO_NOMINAL);
  }
});

test('chaque étape porte un intitulé, traduit par l’appelant', () => {
  const { steps } = construireEtapes(3500, (cle) => `⟨${cle}⟩`);
  assert.deepEqual(steps.map((s) => s.title), [
    '⟨logo.etapes.h⟩', '⟨logo.etapes.l⟩', '⟨logo.etapes.e⟩', '⟨logo.etapes.k⟩',
  ]);
  // Les identifiants sont stables : ils servent d'ancre, pas d'affichage.
  assert.deepEqual(steps.map((s) => s.id), ['place-h', 'place-l', 'orbite', 'bras-k']);
});

/* ═════ La sémantique du README, appliquée aux charnières du logo ═════ */

const { bounds, total } = construireEtapes();

test('« précédent » ramène au début de l’étape en cours…', () => {
  // au milieu de l'étape ③ : retour au début de ③
  assert.equal(nav.prevTarget(bounds, 2500), 2000);
  assert.equal(nav.prevTarget(bounds, 1400), 1000);
});

test('…ou à la précédente si on est déjà à la charnière', () => {
  assert.equal(nav.prevTarget(bounds, 2000), 1000);
  assert.equal(nav.prevTarget(bounds, 1000), 0);
  // la tolérance EPS vaut aussi à la charnière : Firefox arrondit `currentTime`
  assert.equal(nav.prevTarget(bounds, 2000 + EPS), 1000);
});

test('« suivant » va à la fin de l’étape en cours, ou à la suivante', () => {
  assert.equal(nav.nextTarget(bounds, 2500), 3000);
  assert.equal(nav.nextTarget(bounds, 2000), 3000);
  assert.equal(nav.nextTarget(bounds, 3000), total);   // déjà à la charnière ③|④
  assert.equal(nav.nextTarget(bounds, 3400), total);
});

test('le grisage tombe aux extrémités, et nulle part ailleurs', () => {
  const etat = (t) => nav.controlsState({ t, playing: false, bounds, total });
  assert.deepEqual(
    [etat(0).startDisabled, etat(0).prevDisabled, etat(0).nextDisabled, etat(0).endDisabled],
    [true, true, false, false]);
  assert.deepEqual(
    [etat(total).startDisabled, etat(total).nextDisabled, etat(total).endDisabled],
    [false, true, true]);
  assert.deepEqual(
    [etat(1500).startDisabled, etat(1500).prevDisabled, etat(1500).nextDisabled],
    [false, false, false]);
});

test('la jauge à quatre segments désigne bien l’étape en cours', () => {
  assert.equal(nav.stepIndexAt(bounds, 0), 0);
  assert.equal(nav.stepIndexAt(bounds, 500), 0);
  assert.equal(nav.stepIndexAt(bounds, 1000), 1);   // à la charnière : DÉBUT de l'étape
  // EPS mord aussi JUSTE AVANT la charnière : sans ça le badge clignoterait
  // sous Firefox, qui arrondit `currentTime` à 2 ms.
  assert.equal(nav.stepIndexAt(bounds, 1000 - EPS), 1);
  assert.equal(nav.stepIndexAt(bounds, 1000 - EPS - 1), 0);
  assert.equal(nav.stepIndexAt(bounds, 2500), 2);
  assert.equal(nav.stepIndexAt(bounds, 3000), 3);
  assert.equal(nav.stepIndexAt(bounds, total), 3);
});

test('naviguer d’un bout à l’autre traverse les quatre étapes, sans piétiner', () => {
  let t = 0;
  const vus = [nav.stepIndexAt(bounds, t)];
  for (let n = 0; n < 10 && !nav.atEnd(t, total); n++) {
    const i = nav.transition('next', { t, playing: false, bounds, total });
    assert.ok(!i.noop, 'suivant ne doit pas être inerte avant la fin');
    t = i.seek;
    vus.push(nav.stepIndexAt(bounds, t));
  }
  assert.equal(t, total);
  assert.deepEqual(vus, [0, 1, 2, 3, 3]);
  // et le retour, symétrique
  const arriere = [];
  for (let n = 0; n < 10 && !nav.atStart(t); n++) {
    t = nav.transition('prev', { t, playing: false, bounds, total }).seek;
    arriere.push(t);
  }
  assert.deepEqual(arriere, [3000, 2000, 1000, 0]);
});
