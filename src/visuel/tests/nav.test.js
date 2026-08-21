/**
 * Automate de navigation et ses cas limites (CONTRACTS §3.3, §3.4).
 * Tout est pur : aucun DOM, aucun WAAPI.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  stepIndexAt, atStart, atEnd, atHinge, prevTarget, nextTarget, transition, controlsState,
} from '../nav.js';
import { EPS } from '../constants.js';

// bounds d'un scénario à 3 steps de 1000 ms
const B = [0, 1000, 2000, 3000];
const S = (t, playing = false) => ({ t, playing, bounds: B, total: 3000 });

test('EPS vaut 4 ms (CONTRACTS §3)', () => {
  assert.equal(EPS, 4);
});

test('stepIndexAt : t exactement sur bounds[i] désigne le début du step i', () => {
  assert.equal(stepIndexAt(B, 0), 0);
  assert.equal(stepIndexAt(B, 1000), 1);
  assert.equal(stepIndexAt(B, 2000), 2);
  // borné à steps.length - 1
  assert.equal(stepIndexAt(B, 3000), 2);
  assert.equal(stepIndexAt(B, 5000), 2);
});

test('stepIndexAt : la tolérance EPS couvre l’arrondi de currentTime (Firefox)', () => {
  assert.equal(stepIndexAt(B, 998), 1, 'à 2 ms de la charnière on est déjà dans le step suivant');
  assert.equal(stepIndexAt(B, 1002), 1);
  assert.equal(stepIndexAt(B, 994), 0, 'au-delà d’EPS on reste dans le step précédent');
});

test('atStart / atEnd / atHinge tolèrent EPS', () => {
  assert.ok(atStart(0));
  assert.ok(atStart(3));
  assert.ok(!atStart(5));
  assert.ok(atEnd(3000, 3000));
  assert.ok(atEnd(2997, 3000));
  assert.ok(!atEnd(2990, 3000));
  assert.ok(atHinge(1001, B));
  assert.ok(!atHinge(1500, B));
});

test('Précédent : début de la transformation en cours, ou de la précédente si on est à la charnière', () => {
  assert.equal(prevTarget(B, 1500), 1000, 'en cours de step 1 → début du step 1');
  assert.equal(prevTarget(B, 1000), 0, 'à la charnière → début du step précédent');
  assert.equal(prevTarget(B, 1002), 0, 'même à 2 ms de la charnière');
  assert.equal(prevTarget(B, 0), 0, 'jamais en deçà de 0');
});

test('Suivant : fin de la transformation en cours, ou de la suivante si on est à la charnière', () => {
  assert.equal(nextTarget(B, 1500), 2000);
  assert.equal(nextTarget(B, 1000), 2000, 'à la charnière d’entrée du step 1 → fin du step 1');
  assert.equal(nextTarget(B, 2000), 3000);
  assert.equal(nextTarget(B, 3000), 3000, 'jamais au-delà de TOTAL');
});

test('cas limite 1 — Suivant/Précédent pendant la lecture mettent en pause puis sautent', () => {
  assert.deepEqual(transition('next', S(1500, true)), { pause: true, seek: 2000 });
  assert.deepEqual(transition('prev', S(1500, true)), { pause: true, seek: 1000 });
  assert.deepEqual(transition('toStart', S(1500, true)), { pause: true, seek: 0 });
  assert.deepEqual(transition('toEnd', S(1500, true)), { pause: true, seek: 3000 });
});

test('cas limite 2 — arrivé à la fin, Lecture repart de 0 (comportement de lecteur vidéo)', () => {
  assert.deepEqual(transition('play', S(3000)), { seek: 0, play: true });
  assert.deepEqual(transition('play', S(1500)), { play: true });
  assert.deepEqual(transition('play', S(1500, true)), { noop: true });
  assert.deepEqual(transition('pause', S(1500, true)), { pause: true });
  assert.deepEqual(transition('pause', S(1500)), { noop: true });
});

test('cas limite 5 — sur une charnière, le badge affiche le step qui VA être joué', () => {
  assert.equal(controlsState(S(1000)).stepIndex, 1);
  assert.equal(controlsState(S(1000)).atHinge, true);
});

test('cas limite 6 — scénario à un seul step : Précédent ≡ Début, Suivant saute à TOTAL', () => {
  const one = { t: 0, playing: false, bounds: [0, 1400], total: 1400 };
  assert.deepEqual(transition('prev', one), { noop: true }, 'grisé au départ');
  assert.deepEqual(transition('toStart', one), { noop: true });
  assert.deepEqual(transition('next', one), { pause: true, seek: 1400 });
  const end = { ...one, t: 1400 };
  assert.deepEqual(transition('next', end), { noop: true });
  assert.deepEqual(transition('prev', end), { pause: true, seek: 0 });
  assert.equal(stepIndexAt([0, 1400], 1400), 0);
});

test('les contrôles sont un état dérivé, jamais stocké', () => {
  const start = controlsState(S(0));
  assert.deepEqual(
    { s: start.startDisabled, p: start.prevDisabled, n: start.nextDisabled, e: start.endDisabled },
    { s: true, p: true, n: false, e: false },
  );
  const end = controlsState(S(3000));
  assert.deepEqual(
    { s: end.startDisabled, p: end.prevDisabled, n: end.nextDisabled, e: end.endDisabled },
    { s: false, p: false, n: true, e: true },
  );
  assert.equal(controlsState(S(10, true)).playLabel, 'Pause');
  assert.equal(controlsState(S(10, false)).playLabel, 'Lecture');
});

test('seek et seekToStep sont bornés', () => {
  assert.deepEqual(transition('seek', S(0), -500), { seek: 0 });
  assert.deepEqual(transition('seek', S(0), 99999), { seek: 3000 });
  assert.deepEqual(transition('seekToStep', S(0), 2), { pause: true, seek: 2000 });
  assert.deepEqual(transition('seekToStep', S(0), 99), { pause: true, seek: 3000 });
  assert.deepEqual(transition('seekToStep', S(0), -3), { pause: true, seek: 0 });
});

test('toEnd() — le bouton Fin (CONTRACTS §0.4)', () => {
  assert.deepEqual(transition('toEnd', S(0)), { pause: true, seek: 3000 });
  assert.deepEqual(transition('toEnd', S(2999)), { noop: true });
});

test('une action inconnue ne fait rien', () => {
  assert.deepEqual(transition('turbo', S(0)), { noop: true });
});
