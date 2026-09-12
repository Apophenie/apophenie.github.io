/** Une PHRASE visée — « https://reinfocovid.fr/ » → « C'est de la merde ! ».
 *
 *  Le couple est de l'autrice. Il dit ce que la cible textuelle devait apprendre :
 *  viser plus d'un mot, ponctuation comprise.
 *
 *  ★ LES SIGNES. L'ESPACE s'écrit sur le 0 du téléphone (`mtap`, un appui) ;
 *    l'apostrophe et le point d'exclamation, par la table ASCII (`masi`, trois
 *    chiffres par signe), la seule convention sourcée qui les écrive en
 *    chiffres de 0 à 9. Mesuré : en AZERTY fr(basic) le « ! » et le « m » sont
 *    en colonne 10 ; en QWERTY US l'apostrophe est en colonne 11 et le « ! »
 *    demande Maj ; la touche 1 du téléphone n'a pas d'ordre commun.
 *
 *  ★ D'UN BLOC, CE N'EST PAS ATTEIGNABLE. Relue d'un trait, la phrase fait 38
 *    chiffres au téléphone (avec une ponctuation qu'il n'a pas), 32 sans la
 *    ponctuation, 57 en ASCII. Mesuré en visant ces suites telles quelles : 22
 *    chiffres → 7 voies, 26 → 10, 32 et 38 → AUCUNE, aux crans 0, 3 et 5. La
 *    cause est la MATIÈRE : la plus longue ligne que la saisie donne fait 72
 *    chiffres (`fl+masc+mcar`) ou 89 (`fl+masb+mcar`), et sur 72 chiffres
 *    l'absorption accepte une visée de 22 et refuse 32.
 *
 *  ★ EN SEGMENTS, ELLE L'EST. Au-delà de 26 chiffres, la cible se découpe aux
 *    mots en segments d'au plus 22 (`conversions.js › segmentsDe`) ; chaque
 *    segment est cherché à part, les voies d'une même portée s'enchaînent, et
 *    UNE relecture relit la ligne entière au verdict. Le téléphone APPROCHE la
 *    phrase en deux segments (« cest de la » + « merde »), au prix de la
 *    ponctuation et de la capitale ; la table ASCII l'écrit EXACTEMENT en quatre.
 *
 *  ★ LA RAMPE. Un segment est une recherche : le cran 0 s'en autorise deux, et
 *    chaque cran un de plus. Au cran 0, l'approximation ; à partir du cran 2,
 *    la voie exacte aussi — et elle ne paie aucun écart.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { lire } from '../../url.js';
import { lireCible } from '../../cible.js';
import { signesSansRelecture, relecturesPour, segmentsDe } from '../../conversions.js';
import { catalogue } from '../_catalogue.js';
import { compile } from '../../../visuel/compile.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });
const SAISIE = 'https://reinfocovid.fr/';
const PHRASE = "C'est de la merde !";

test('cible-phrase — tous les signes ont une relecture : le téléphone approche, ASCII écrit, en segments', () => {
  const mot = lireCible(PHRASE);
  assert.deepEqual(signesSansRelecture(mot, catalogue), []);
  const rel = relecturesPour(mot, catalogue);
  assert.deepEqual(rel.map((r) => [r.code, r.cible.longueur, r.produit]),
    [['mtap', 32, 'cest de la merde'], ['masi', 57, PHRASE]]);
  assert.deepEqual(rel.map((r) => segmentsDe(r).map((sg) => sg.texte)),
    [['Cest de la', ' merde'], ["C'est", ' de la', ' merde', ' !']]);
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

test('cible-phrase — « https://reinfocovid.fr/ » → « C’est de la merde ! » : approchée au cran 0', () => {
  const r = moteur.resoudre(SAISIE, { cible: PHRASE });
  assert.ok(r.approches.length >= 1, 'aucune voie vers la phrase au cran 0');
  for (const a of r.approches) {
    assert.equal(a.relecture.code, 'mtap', `${a.url} : au cran 0, le téléphone`);
    assert.equal(a.mode, 'PHRASE', a.url);
    assert.equal(a.parts.length, 2, `${a.url} : deux segments`);
    assert.deepEqual([...a.ecartDeForme.natures], ['ponctuation', 'initiale'], a.url);
  }
  // L'exacte n'est pas cherchée à ce cran : c'est dit, pas tu.
  assert.equal(r.relectures.find((x) => x.code === 'masi').horsDuCran, true);
  verifierVoies(r, 'cest de la merde');
});
