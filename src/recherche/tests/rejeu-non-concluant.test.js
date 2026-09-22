import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../index.js';
import { lire, BANDEAUX } from '../url.js';
import { encoderTexte } from '../base58.js';
import { catalogue } from './_catalogue.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });

test('le lien Louis Fouché qui finit sur 3 ne se présente pas comme une démonstration', () => {
  const lecture = lire('?sce!f3!fr9+mas+mrd+meg$7NFn8xBqb5eNAq3YCY');
  const resultat = moteur.rejouer(lecture);
  assert.equal(resultat.ok, false);
  assert.equal(resultat.raison, 'démonstration non concluante');
  assert.equal(resultat.bandeau, BANDEAUX.nonConcluante);
});

test('un décret historique qui obtient réellement un 6 reste lisible', () => {
  const lecture = lire(`#nl,nl,nl#${encoderTexte('macron')}`, { catalogue });
  const resultat = moteur.rejouer(lecture);
  assert.ok(resultat.ok, resultat.raison);
  assert.equal(resultat.approche.mode, 'DECRET');
});
