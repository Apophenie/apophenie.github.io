/** Une PHRASE visée — « https://reinfocovid.fr/ » → « C'est de la merde ! ».
 *
 *  Le couple est de l'autrice. Il dit ce que la cible textuelle devait apprendre :
 *  viser plus d'un mot, ponctuation comprise.
 *
 *  ★ LES SIGNES. L'ESPACE s'écrit sur le 1 du téléphone (`mtap`, un appui) ;
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
 *  ★ EN SEGMENTS, ET SANS RECOPIE. Au-delà de 26 chiffres, la cible se découpe
 *    aux mots en segments d'au plus 22 (`conversions.js › segmentsDe`) ; chaque
 *    segment est écrit par SA portion de la saisie, les portions se suivent
 *    dans le texte, et UNE relecture relit la ligne entière au verdict. Relire
 *    la saisie une fois par segment est REFUSÉ (« dupliquer l'original est très
 *    maladroit et à éviter (voire interdire) », l'autrice) ; la matière qui
 *    manque vient des gonflants (carré, puissance, factorielle).
 *
 *  ★ MESURÉ : sans recopie, les segments n'atteignent pas la phrase depuis
 *    « https://reinfocovid.fr/ » — ses portions productives ne se suivent pas.
 *
 *  ★ LE BLOC GONFLÉ L'ATTEINT, EXACTE. Toute la saisie, ponctuation comprise, en
 *    ASCII (`mast`), carrée, éclatée en chiffres (`mecl`), carrée encore,
 *    absorbée, relue par la table ASCII — tenté en passe profonde pour toute
 *    phrase trop longue (`index.js › deroulerTexte`).
 *
 *  ★ LA RAMPE. Un segment est une recherche : le cran 0 s'en autorise deux, et
 *    chaque cran un de plus (arbitré : les seuils restent tels quels).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { lire, ecrire } from '../../url.js';
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
function verifierVoies(r, attendu, saisie = SAISIE) {
  for (const a of r.approches) {
    // ★ Le texte attendu peut dépendre de la relecture (exacte ou approchée), et
    //   un GROUPEMENT peut l'écrire plusieurs fois : une série par exemplaire.
    const unExemplaire = typeof attendu === 'function' ? attendu(a) : attendu;
    const ecrit = Array.from({ length: a.series || 1 }, () => unExemplaire).join(' ');
    const rejeu = moteur.rejouer(lire(a.url));
    assert.equal(rejeu.ok, true, `${a.url} : ${rejeu.raison || ''}`);
    assert.equal(rejeu.approche.url, a.url, `${a.url} se rejoue à l’identique`);
    const sc = moteur.scenarioDe(a, { saisie, cible: r.cible });
    assert.equal(sc.avertissements, undefined, `${a.url} : ${(sc.avertissements || []).join(' | ')}`);
    assert.equal(sc.result, ecrit, a.url);
    // ★ Jamais de recopie de la saisie à l'écran (« On la recopie… »).
    assert.ok(!sc.steps.some((st) => /recopi/i.test(st.title || '')), `${a.url} : la scène recopie la saisie`);
    const relus = sc.steps.filter((st) => st.code === a.relecture.code).flatMap((st) => st.ops)
      .filter((o) => o.op !== 'merge' && o.to && typeof o.to.text === 'string').map((o) => o.to.text);
    // Plusieurs séries : les exemplaires se suivent sur la ligne relue, sans blanc
    // entre eux — c'est le verdict qui les sépare.
    const relusAttendus = Array.from({ length: a.series || 1 }, () => unExemplaire).join('');
    assert.equal(relus.join(''), relusAttendus, `${a.url} : la relecture est jouée, signe par signe`);
    assert.doesNotThrow(() => compile(sc), a.url);
  }
}

/* ★ L'ESPACE, et rien de plus : « de la merde » se vise D'UN BLOC — une seule
     relecture pour toute la phrase. Le multi-tap l'écrit (1 1 pour l'espace) en
     vingt-deux chiffres, et la recherche chiffrée les atteint : mesuré, onze
     voies au cran 0, toutes par le téléphone (les autres relectures n'ont pas
     d'espace). */
test('cible-phrase — « de la merde » d’un bloc : l’espace sur le 1 du téléphone', () => {
  const r = moteur.resoudre(SAISIE, { cible: 'de la merde' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers « de la merde »');
  assert.deepEqual([...new Set(r.approches.map((a) => a.relecture.code))], ['mtap']);
  for (const a of r.approches) assert.equal(a.ecartDeForme.facteur, 1000, a.url);
  verifierVoies(r, 'de la merde');
});

/* ★ LA PONCTUATION, et la casse avec : « C'est » ne s'écrit EXACTEMENT que par la
     table ASCII (`masi`), trois chiffres par signe — 067 039 101 115 116. Les
     relectures ordinaires l'APPROCHENT (« cest », à la ponctuation près).
     ★ ARBITRÉ, « ça dépend des curseurs » (l'autrice) :
       · au DÉFAUT, toute exacte passe devant toute approchée (`score.js ›
         ordreDExactitude`), et l'approximation ne suffit plus à s'arrêter de
         creuser. MESURÉ : 6 exactes aux rangs 1 à 6 (1 seule, 8ᵉ, avant) ;
       · SIMPLICITÉ 200, EXHAUSTIVITÉ 0 : la règle se replie et l'approchée
         remonte en tête — la première exacte est 6ᵉ ;
       · EXHAUSTIVITÉ 200, SIMPLICITÉ 0 : les exactes en tête, comme au défaut. */
test('cible-phrase — « C’est » : l’exacte devant toute approchée au défaut, et les curseurs la déplacent', () => {
  const exacte = (a) => !a.ecartDeForme.natures.includes('ponctuation');
  const r = moteur.resoudre(SAISIE, { cible: "C'est" });
  const exactes = r.approches.filter(exacte);
  const approchees = r.approches.filter((a) => !exacte(a));
  assert.ok(exactes.length >= 6, `${exactes.length} exactes : le creusement doit les rendre toutes`);
  const premiereApprochee = r.approches.findIndex((a) => !exacte(a));
  assert.ok(premiereApprochee === -1 || r.approches.slice(premiereApprochee).every((a) => !exacte(a)),
    'une exacte derrière une approchée');
  for (const a of exactes) assert.equal(a.relecture.code, 'masi', a.url);
  for (const a of approchees) assert.equal(a.ecartDeForme.facteur, Math.round((500 * 970) / 1000), a.url);
  verifierVoies({ ...r, approches: exactes }, "C'est");
  verifierVoies({ ...r, approches: approchees }, 'cest');

  const simple = moteur.resoudre(SAISIE, {
    cible: "C'est", curseurs: { simplicite: 200, exhaustivite: 0, quantite: 100, coherence: 100 },
  });
  assert.equal(exacte(simple.approches[0]), false, 'la simplicité qui domine laisse ressortir l’approchée');
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

/* ★ LE BLOC GONFLÉ — « rassemble tous les morceaux avant de faire gonfler
     l'ensemble » (l'autrice). Sans recopie, les SEGMENTS n'atteignent pas la
     phrase depuis cette saisie ; le BLOC l'atteint, d'une seule relecture.
     ★ EXACTE : toute la saisie en ASCII, ponctuation comprise (`mast`, 63
       chiffres), carrée (`mcar`, 109), éclatée en chiffres (`mecl`), carrée une
       seconde fois (143), absorbée (`mab`) dans les 57 chiffres de la phrase
       relue par la table ASCII (`masi`). MESURÉ : `mast+mcar+mecl+mcar+mab`,
       3 375, en tête — aucun écart de forme.
     ★ APPROCHÉE : les mêmes lignes relues au téléphone (32 chiffres), derrière,
       à la ponctuation et à la capitale près. Au cran 0 : 17 voies en tout.
     MESURÉ, et c'était la matière qui décidait, pas un plafond : sans la
       ponctuation la ligne carrée fait 89 chiffres (29 des 32 écrits) ; sans
       l'éclatement, un second carré sort du domaine 10⁶ et 109 chiffres
       n'écrivent que 43 des 57. */
test('cible-phrase — « https://reinfocovid.fr/ » → « C’est de la merde ! » exacte : le bloc gonflé deux fois, sans recopie', () => {
  const r = moteur.resoudre(SAISIE, { cible: PHRASE });
  assert.ok(r.approches.length >= 1, 'aucune voie vers la phrase');
  const tete = r.approches[0];
  assert.equal(tete.relecture.code, 'masi', 'la voie exacte en tête');
  assert.equal(tete.ecartDeForme.facteur, 1000, 'rien à payer');
  assert.deepEqual(tete.parts[0].chemin.ops.map((o) => o.code).join('+'), 'mast+mcar+mecl+mcar+mab');
  for (const a of r.approches) {
    assert.equal(a.parts.length, 1, `${a.url} : un seul bloc, pas de segments`);
  }
  assert.deepEqual(r.relectures.map((x) => [x.code, x.voies]), [['mtap', 0], ['masi', 0]],
    'aucune voie par segments : la phrase vient du bloc');
  const exacte = (a) => !a.ecartDeForme.natures.includes('ponctuation');
  const premiereApprochee = r.approches.findIndex((a) => !exacte(a));
  assert.ok(r.approches.slice(premiereApprochee).every((a) => !exacte(a)), 'une exacte derrière une approchée');
  verifierVoies(r, (a) => (exacte(a) ? PHRASE : 'cest de la merde'));
});

/* ★ LE BLOC ET LES SEGMENTS, sur une saisie qui a la matière : « Reinfocovid,
     désinformation garantie ».
     MESURÉ au cran 0 : vingt voies, toutes par le BLOC — l'exacte ASCII en tête
     (`fl+mz26+mcar+mecl+mcar+mab`, 3 410), les approchées du téléphone derrière.
     Les SEGMENTS sont toujours composés (trois, sur deux portions disjointes,
     873 au mieux), mais aucun n'entre dans les vingt places : les approchées du
     bloc gonflé deux fois les devancent (1 204 pour la vingtième). Ils ne sont
     pas perdus — le diagnostic les compte, et leur lien se rejoue. */
test('cible-phrase — « Reinfocovid, désinformation garantie » → « C’est de la merde ! » : le bloc en tête, les segments composés', () => {
  const saisie = 'Reinfocovid, désinformation garantie';
  const r = moteur.resoudre(saisie, { cible: PHRASE });
  assert.equal(r.approches[0].relecture.code, 'masi', 'l’exacte ASCII en tête');
  assert.equal(r.approches[0].ecartDeForme.facteur, 1000);
  assert.ok(r.relectures.find((x) => x.code === 'mtap').voies >= 1, 'les segments sont composés');
  verifierVoies(r, (a) => (a.ecartDeForme.natures.includes('ponctuation') ? 'cest de la merde' : PHRASE), saisie);
  // Le lien d'une voie par segments, deux portions disjointes, se rejoue toujours.
  const lien = ecrire({
    saisie, cible: lireCible(PHRASE), relecture: 'mtap', registre: 'sobre',
    fragments: [
      { portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['mazc', 'mpui', 'mab'] },
      { portee: { offset: 3, longueur: 1 }, resonance: null, codes: ['fr6', 'ma1', 'mab'] },
    ],
  });
  const rejeu = moteur.rejouer(lire(lien));
  assert.equal(rejeu.ok, true, rejeu.raison);
  assert.equal(rejeu.approche.mode, 'PHRASE');
});

/* ★ LA DUPLICATION EST REFUSÉE, et un lien déjà écrit ne la fait pas revenir :
     `fl+masc+mcar+mab,fl+mx6+mab` relisait deux fois la saisie entière — c'est
     la voie que la première version publiait. */
test('cible-phrase — un lien dont les segments recopient la saisie ne se rejoue pas', () => {
  const url = ecrire({
    saisie: SAISIE, cible: lireCible(PHRASE), relecture: 'mtap', registre: 'sobre',
    fragments: [
      { portee: null, resonance: null, codes: ['fl', 'masc', 'mcar', 'mab'] },
      { portee: null, resonance: null, codes: ['fl', 'mx6', 'mab'] },
    ],
  });
  const rejeu = moteur.rejouer(lire(url));
  assert.equal(rejeu.ok, false, 'rejoué alors qu’il recopie la saisie');
  assert.equal(rejeu.raison, 'segments qui recopient la saisie');
});
