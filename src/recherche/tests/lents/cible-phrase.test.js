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
 *  ★ EN SEGMENTS, ET SANS RECOPIE. Au-delà de 26 chiffres, la cible se découpe
 *    aux mots en segments d'au plus 22 (`conversions.js › segmentsDe`) ; chaque
 *    segment est écrit par SA portion de la saisie, les portions se suivent
 *    dans le texte, et UNE relecture relit la ligne entière au verdict. Relire
 *    la saisie une fois par segment est REFUSÉ (« dupliquer l'original est très
 *    maladroit et à éviter (voire interdire) », l'autrice) ; la matière qui
 *    manque vient des gonflants (carré, puissance, factorielle).
 *
 *  ★ MESURÉ : sans recopie, « https://reinfocovid.fr/ » n'atteint plus la
 *    phrase — ses portions productives ne se suivent pas dans le bon ordre. Le
 *    mécanisme est tenu sur « Reinfocovid, désinformation garantie ».
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
function verifierVoies(r, ecrit, saisie = SAISIE) {
  for (const a of r.approches) {
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

/* ★ SANS RECOPIE, LA PHRASE N'EST PLUS ATTEINTE DEPUIS CETTE SAISIE — mesuré, pas
     décidé. Chaque segment doit être écrit par SA portion, et les portions se
     suivent dans le texte. « https://reinfocovid.fr/ » n'en a que trois qui
     portent des lettres : `https` (5), `reinfocovid` (11), `fr` (2).
     MESURÉ (vecteurs qui écrivent le segment, sans / avec les gonflants) :
       téléphone, « Cest de la » (20 chiffres) : https 0/0, reinfocovid 0/10, fr 0/0 ;
                  « merde » (12 chiffres)      : https 0/5, reinfocovid 2/2, fr 0/0.
       Aucune suite ordonnée : ce qui écrit le premier segment (reinfocovid)
       laisse après lui `fr`, qui n'écrit rien.
       ASCII, quatre segments (15, 18, 18, 6) : `https` n'écrit que « ! », `fr`
       rien — quatre portions productives n'existent pas.
     La première version l'atteignait en relisant la saisie ENTIÈRE une fois par
     segment : c'est cette duplication que l'autrice interdit. */
test('cible-phrase — « https://reinfocovid.fr/ » → « C’est de la merde ! » : aucune voie sans recopie, aux crans 0 et 2', () => {
  for (const fouille of [0, 2]) {
    const r = moteur.resoudre(SAISIE, { cible: PHRASE, fouille });
    assert.deepEqual(r.approches.map((a) => a.url), [], `cran ${fouille}`);
    assert.deepEqual(r.relectures.map((x) => [x.code, x.voies]), [['mtap', 0], ['masi', 0]], `cran ${fouille}`);
  }
});

/* ★ LE MÉCANISME, SUR UNE SAISIE QUI A LA MATIÈRE : « Reinfocovid, désinformation
     garantie ». Mesuré au cran 0 : trois voies, chacune sur deux portions
     disjointes — `0:mazc+mpui+mab,3:fr6+ma1+mab` (873) en tête. La matière du
     premier segment vient du GONFLANT (`mpui`), comme le veut l'autrice. La
     scène découpe la saisie en deux morceaux, joue chacun à son tour, puis la
     relecture unique du téléphone. */
test('cible-phrase — « Reinfocovid, désinformation garantie » → « C’est de la merde ! » : deux portions, aucune recopie', () => {
  const saisie = 'Reinfocovid, désinformation garantie';
  const r = moteur.resoudre(saisie, { cible: PHRASE });
  assert.ok(r.approches.length >= 1, 'aucune voie sans recopie');
  for (const a of r.approches) {
    assert.equal(a.mode, 'PHRASE', a.url);
    assert.equal(a.parts.length, 2, a.url);
    const [p, q] = a.parts.map((x) => x.fragment);
    assert.ok(p.offset + p.longueur <= q.offset, `${a.url} : portions disjointes et ordonnées`);
  }
  verifierVoies(r, 'cest de la merde', saisie);
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
