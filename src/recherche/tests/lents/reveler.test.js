/** « RÉVÉLER » SOUS SA BORNE — `node --test src/recherche/tests/lents/reveler.test.js`.
 *
 * > « Révéler sous 5 s : borne sur l'assemblage, pour Révéler SEUL. La liste
 * >   énumérée et ses liens ne changent pas. Seule la première voie ouverte par
 * >   Révéler peut être un peu moins bonne sur les saisies longues. Le lien
 * >   ouvert par Révéler doit rester un lien normal qui se rejoue à
 * >   l'identique partout. » (l'autrice)
 *
 * Ce que ces tests gardent :
 *   1. la première voie de Révéler est un lien ORDINAIRE, qui se rejoue hors de
 *      Révéler — même programme, même score, même lien réécrit ;
 *   2. la liste énumérée ne connaît pas la borne : une recherche Révéler faite
 *      avant ne change rien à la liste qu'on demande après, sur le même moteur ;
 *   3. sous la borne, Révéler ouvre exactement la tête de la liste.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur, creerCanal, lire } from '../../index.js';
import { catalogue } from '../_catalogue.js';

const LONGUE = 'Le gouvernement a annoncé ce matin une nouvelle réforme des retraites qui entrera en vigueur dès janvier prochain';
const signature = (r) => r.approches.map((a) => `${a.rang}:${a.url}:${a.score}:${a.suggestion ?? ''}`);

test('★ révéler — la première voie est un lien ordinaire, qui se rejoue à l’identique hors de Révéler', () => {
  for (const saisie of [LONGUE, 'La numérologie est une science exacte, disent-ils']) {
    const moteur = creerMoteur(catalogue, { filetTemporel: false });
    const premiere = moteur.resoudre(saisie, { pourReveler: true }).approches[0];
    // Un moteur NEUF, qui n'a jamais vu Révéler : c'est « partout ».
    const ailleurs = creerMoteur(catalogue, { filetTemporel: false });
    for (const url of [premiere.urlSobre, premiere.urlScenique]) {
      const rejeu = ailleurs.rejouer(lire(url));
      assert.equal(rejeu.ok, true, `${url} : ${rejeu.raison || ''}`);
      assert.equal(rejeu.approche.codes, premiere.codes, `${url} rejoue un autre programme`);
      assert.equal(rejeu.approche.score, premiere.score, `${url} rejoue un autre score`);
    }
    assert.equal(ailleurs.rejouer(lire(premiere.urlSobre)).approche.urlSobre, premiere.urlSobre,
      'le lien se réécrit tel quel : aucun marqueur de borne n’y entre');
  }
});

test('★ révéler — la liste énumérée ne connaît pas la borne, même après un Révéler sur le même moteur', () => {
  const neuf = creerMoteur(catalogue, { filetTemporel: false }).resoudre(LONGUE);
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const bornee = moteur.resoudre(LONGUE, { pourReveler: true });
  const apres = moteur.resoudre(LONGUE);
  assert.deepEqual(signature(apres), signature(neuf), 'la liste a hérité de la borne de Révéler');
  assert.notDeepEqual(signature(bornee), signature(neuf),
    'sur cette saisie la borne mord : sinon ce test ne prouverait rien');
});

test('révéler — sous la borne, Révéler ouvre la tête de la liste', () => {
  for (const saisie of ['Donald Trump', 'hope-hope-hope.fr', 'Sarah Kerrigan']) {
    const liste = creerMoteur(catalogue, { filetTemporel: false }).resoudre(saisie);
    const reveler = creerMoteur(catalogue, { filetTemporel: false }).resoudre(saisie, { pourReveler: true });
    assert.equal(reveler.approches[0].url, liste.approches[0].url, saisie);
  }
});

test('canal — le message `reveler` pose la borne, et seulement lui', () => {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const canal = creerCanal(moteur, (m) => m);
  const bornee = canal.traiter({ type: 'resoudre', generation: 1, saisie: LONGUE, reveler: true });
  const libre = canal.traiter({ type: 'resoudre', generation: 2, saisie: LONGUE });
  assert.deepEqual(bornee.approches.map((a) => a.url),
    creerMoteur(catalogue, { filetTemporel: false }).resoudre(LONGUE, { pourReveler: true }).approches.map((a) => a.url));
  assert.deepEqual(libre.approches.map((a) => a.url),
    creerMoteur(catalogue, { filetTemporel: false }).resoudre(LONGUE).approches.map((a) => a.url));
});
