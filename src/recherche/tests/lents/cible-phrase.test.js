/** Une PHRASE visée — « https://reinfocovid.fr/ » → « C'est de la merde ! ».
 *
 *  Le couple est de l'auteur. Il dit ce que la cible textuelle ne sait pas
 *  encore faire : viser plus d'un mot.
 *
 *  ★ MESURÉ, et ce n'est pas la ponctuation seule qui bloque : trois signes
 *    n'ont aucune relecture — l'apostrophe, le point d'exclamation, et
 *    l'ESPACE. Une cible textuelle est donc aujourd'hui un mot unique : « de la
 *    merde » est refusée pour la même raison. Le refus est immédiat, et il est
 *    dit (`conversions.js › signesSansRelecture`).
 *
 *  ★ Le mot seul, lui, est atteint : « merde » depuis la même saisie a des voies
 *    qui se rejouent. Ce qui manque n'est pas la matière, c'est la phrase.
 *
 *  ⚠️ Même sans ponctuation ni espaces, « Cestdelamerde » fait treize lettres,
 *    soit vingt-six chiffres relus par paires : au-delà de `MAX_CHIFFRES`. Une
 *    phrase se visera donc mot par mot, ou pas du tout.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { lire } from '../../url.js';
import { lireCible } from '../../cible.js';
import { signesSansRelecture } from '../../conversions.js';
import { catalogue } from '../_catalogue.js';
import { compile } from '../../../visuel/compile.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });
const SAISIE = 'https://reinfocovid.fr/';
const PHRASE = "C'est de la merde !";

test('cible-phrase — ce qui bloque est dit : l’apostrophe, l’espace, le point d’exclamation', () => {
  assert.deepEqual(signesSansRelecture(lireCible(PHRASE), catalogue), ["'", ' ', '!']);
  const r = moteur.resoudre(SAISIE, { cible: PHRASE });
  assert.equal(r.approches.length, 0);
  assert.ok(r.avertissement && r.avertissement.fr, 'le refus est écrit, pas silencieux');
});

test('cible-phrase — le mot seul est atteint : « merde », et chaque voie se rejoue', () => {
  const r = moteur.resoudre(SAISIE, { cible: 'merde' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers « merde »');
  for (const a of r.approches) {
    const rejeu = moteur.rejouer(lire(a.url));
    assert.equal(rejeu.ok, true, `${a.url} : ${rejeu.raison || ''}`);
    assert.equal(rejeu.approche.url, a.url, `${a.url} se rejoue à l’identique`);
    const sc = moteur.scenarioDe(a, { saisie: SAISIE, cible: r.cible });
    assert.equal(sc.avertissements, undefined, `${a.url} : ${(sc.avertissements || []).join(' | ')}`);
    assert.equal(sc.result.split(' ')[0], 'merde', a.url);
    assert.doesNotThrow(() => compile(sc), a.url);
  }
});

test('cible-phrase — « https://reinfocovid.fr/ » → « C’est de la merde ! »', {
  todo: 'une cible textuelle ne vise qu’un mot : ni espace, ni apostrophe, ni point d’exclamation — voir le pavé',
}, () => {
  const r = moteur.resoudre(SAISIE, { cible: PHRASE });
  assert.ok(r.approches.length >= 1, 'aucune voie vers la phrase');
});
