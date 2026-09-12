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

test('cible-phrase — tous les signes ont une relecture, et une seule relecture les écrit tous : ASCII', () => {
  // ★ L'ESPACE s'écrit sur le 0 du téléphone ; l'apostrophe et le point
  //   d'exclamation, par la table ASCII (`masi`), la seule qui les écrive en
  //   chiffres. Plus aucun signe ne bloque.
  assert.deepEqual(signesSansRelecture(lireCible(PHRASE), catalogue), []);
  const r = moteur.resoudre(SAISIE, { cible: PHRASE });
  // ⚠️ Mais d'un BLOC, ce sont cinquante-sept chiffres : mesuré, aucune voie —
  //   la plus longue ligne que la saisie donne fait 89 chiffres, et l'absorption
  //   n'écrit qu'un chiffre visé pour trois ou quatre.
  assert.deepEqual(r.relectures.map((x) => [x.code, x.longueur]), [['masi', 57]]);
});

/**
 * Toute voie vers une phrase, vérifiée par le CHEMIN RÉEL : le lien se rejoue à
 * l'identique, la scène n'a aucun geste remplacé en silence, la relecture est
 * JOUÉE et écrit ce que le verdict annonce — espaces compris —, et le moteur
 * visuel compile.
 */
function verifierVoies(r, ecrit) {
  for (const a of r.approches) {
    const rejeu = moteur.rejouer(lire(a.url));
    assert.equal(rejeu.ok, true, `${a.url} : ${rejeu.raison || ''}`);
    assert.equal(rejeu.approche.url, a.url, `${a.url} se rejoue à l’identique`);
    const sc = moteur.scenarioDe(a, { saisie: SAISIE, cible: r.cible });
    assert.equal(sc.avertissements, undefined, `${a.url} : ${(sc.avertissements || []).join(' | ')}`);
    assert.equal(sc.result, ecrit, a.url);
    const relus = sc.steps.filter((st) => st.code === a.relecture.code).flatMap((st) => st.ops)
      .filter((o) => o.op !== 'merge' && o.to && typeof o.to.text === 'string').map((o) => o.to.text);
    assert.equal(relus.join(''), ecrit, `${a.url} : la relecture est jouée, signe par signe`);
    assert.doesNotThrow(() => compile(sc), a.url);
  }
}

/* ★ L'ESPACE, et rien de plus : « de la merde » se vise D'UN BLOC — une seule
     relecture pour toute la phrase. Le multi-tap l'écrit (0 1 pour l'espace) en
     vingt-deux chiffres, et la recherche chiffrée les atteint : mesuré, sept
     voies au cran 0, toutes par le téléphone (les autres relectures n'ont pas
     d'espace). */
test('cible-phrase — « de la merde » d’un bloc : l’espace sur le 0 du téléphone', () => {
  const r = moteur.resoudre(SAISIE, { cible: 'de la merde' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers « de la merde »');
  assert.deepEqual([...new Set(r.approches.map((a) => a.relecture.code))], ['mtap']);
  for (const a of r.approches) assert.equal(a.ecartDeForme.facteur, 1000, a.url);
  verifierVoies(r, 'de la merde');
});

/* ★ LA PONCTUATION, et la casse avec : « C'est » ne se relit que par la table
     ASCII (`masi`), trois chiffres par signe — 067 039 101 115 116. Quinze
     chiffres d'un bloc : mesuré, six voies au cran 0, sans aucun écart de forme,
     puisque la table écrit la capitale ET l'apostrophe. */
test('cible-phrase — « C’est » : l’apostrophe et la capitale, par la table ASCII', () => {
  const r = moteur.resoudre(SAISIE, { cible: "C'est" });
  assert.ok(r.approches.length >= 1, 'aucune voie vers « C’est »');
  assert.deepEqual([...new Set(r.approches.map((a) => a.relecture.code))], ['masi']);
  for (const a of r.approches) assert.equal(a.ecartDeForme.facteur, 1000, a.url);
  verifierVoies(r, "C'est");
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
