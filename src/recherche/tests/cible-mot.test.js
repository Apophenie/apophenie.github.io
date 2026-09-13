/** La CIBLE TEXTUELLE — viser un texte (`cible.js`, « la cible textuelle »).
 *
 *  ROUTINE : rien n'y cherche. La lecture d'une cible, le barème d'écart de
 *  forme, les relectures et leur inverse CALCULÉ, l'URL (le troisième `#`), et
 *  le verdict d'une voie REJOUÉE — c'est-à-dire ce qu'un lien partagé montrera.
 *  Les recherches, et les quatre exemples de l'auteur, sont dans
 *  `lents/cible-mot.test.js`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lireCible, memeCible, verdict, estMot, ecritureDe, ecartDeForme, libelleEcart, cibleDeValeurs,
  ECARTS, MAX_CHIFFRES, MAX_SIGNES_TEXTE, CIBLE_DEFAUT, CIBLE_LONGUE,
} from '../cible.js';
import {
  relecturesPour, inverseDe, operateursDeRelecture, RELECTURE_PAR_DEFAUT,
  segmentsDe, LONGUEUR_D_UN_BLOC, CHIFFRES_PAR_SEGMENT,
} from '../conversions.js';
import { facteurPonctuation, ordreDExactitude, facteurDEcartAuxCurseurs } from '../score.js';
import { lire, ecrire, BANDEAUX } from '../url.js';
import { encoderTexte } from '../base58.js';
import { creerMoteur } from '../index.js';
import { construireScenario } from '../scenario.js';
import { operateursPourCible, operateursExplorables, appliquerOp, etat } from '../bfs.js';
import { liaisons, segmentsSansCopie } from '../assemblage.js';
import { catalogue } from './_catalogue.js';
import { compile } from '../../visuel/compile.js';
import { plafondDAbsorption, VISEE_LONGUE } from '../../moteur/transformations/mappeurs.js';

const B58_SK = encoderTexte('Sarah Kerrigan');
const B58 = (t) => encoderTexte(t);

/* ══════════════════════════ 1. La cible, valeur ══════════════════════════ */

test('cible-mot — un texte se vise TEL QUEL, casse et accents compris', () => {
  const c = lireCible('Zerg');
  assert.equal(c.nature, 'mot');
  assert.equal(c.texte, 'Zerg', 'ni pliée, ni capitalisée : la forme exacte');
  assert.equal(c.affichage, 'Zerg');
  assert.deepEqual([...c.chiffres], [], 'un texte ne s’écrit pas en chiffres : ce sont ses relectures');
  assert.equal(c.nombre, null);
  assert.equal(c.defaut, false);
  assert.equal(estMot(c), true);
  assert.equal(ecritureDe(c), 'Zerg');
  assert.equal(verdict(2, c), 'Zerg Zerg');
  assert.equal(lireCible('Fantôme').texte, 'Fantôme');
  assert.equal(memeCible('Fantôme', 'fantome'), false, 'deux cibles — l’écart se paie, il ne se replie pas');
  assert.equal(memeCible('ZERG', 'Zerg'), false);
  assert.equal(memeCible(' Zerg ', 'Zerg'), true, 'seuls les blancs de bord tombent');
  // Le format ne borne plus que la longueur : espaces, trait d'union et
  // apostrophe sont des cibles — c'est la recherche qui dira si on les atteint.
  for (const t of ['reine des lames', 'porte-malheur', 'aujourd’hui', 'c3po', 'œuvre']) {
    assert.equal(lireCible(t).texte, t, t);
  }
});

test('cible-mot — ce qui n’est pas une cible : vide, trop long, commande', () => {
  for (const mauvais of ['', '   ', 'a'.repeat(MAX_SIGNES_TEXTE + 1), 'abc']) {
    assert.equal(lireCible(mauvais), null, JSON.stringify(mauvais));
  }
  assert.equal(lireCible('9'.repeat(MAX_CHIFFRES + 1)), null,
    'une suite de chiffres trop longue n’est pas un texte : elle est refusée');
  assert.equal(lireCible('a'.repeat(MAX_SIGNES_TEXTE)).longueur, MAX_SIGNES_TEXTE, 'le plafond est atteignable');
});

test('cible-mot — les cibles chiffrées sont intactes', () => {
  const c = lireCible('007');
  assert.equal(c.nature, 'chiffres');
  assert.equal(c.texte, '007');
  assert.equal(c.affichage, '007');
  assert.equal(CIBLE_DEFAUT.texte, '666');
  assert.equal(verdict(1, CIBLE_DEFAUT), '666');
  assert.equal(lireCible([6, 6, 6]).texte, '666');
});

test('cible-mot — la cible SOUS-JACENTE : des chiffres si elle peut, des valeurs sinon', () => {
  const chiffres = cibleDeValeurs([2, 1, 3, 1, 4, 1, 5, 2]);
  assert.equal(chiffres.nature, 'chiffres');
  assert.equal(chiffres.texte, '21314152');
  assert.equal(chiffres.nombre, null, 'une relecture lit ses valeurs une à une : pas de mode DIRECT');
  const six = cibleDeValeurs([6, 6, 6]);
  assert.equal(six.texte, '666');
  assert.equal(six.defaut, false, '« fff » en rangs n’a droit ni aux cornes ni au joker du 666');
  const valeurs = cibleDeValeurs([26, 5, 18, 7]);
  assert.equal(valeurs.nature, 'valeurs');
  assert.equal(valeurs.texte, '26.5.18.7');
  assert.deepEqual([...valeurs.chiffres], [26, 5, 18, 7]);
  assert.equal(cibleDeValeurs([]), null);
  assert.equal(cibleDeValeurs([1, -2]), null);
});

/* ══════════════════════════ 2. Le barème d'écart ══════════════════════════ */

test('cible-mot — le barème d’écart : la hiérarchie de l’auteur, chiffrée', () => {
  for (const [ecrit, vise, facteur, natures] of [
    ['Zerg', 'Zerg', 1000, []],
    ['zerg', 'Zerg', 970, ['initiale']],
    ['fantome', 'fantôme', 930, ['accents']],
    ['zerg', 'ZERG', 900, ['casse']],
    ['Zerg', 'ZERG', 900, ['casse']],
    ['ZERG', 'Zerg', 650, ['capitales']],
    ['zErG', 'Zerg', 400, ['melee']],
    ['fantome', 'Fantôme', 902, ['accents', 'initiale']],
  ]) {
    const e = ecartDeForme(ecrit, vise);
    assert.equal(e.facteur, facteur, `${ecrit} pour ${vise}`);
    assert.deepEqual([...e.natures], natures, `${ecrit} pour ${vise}`);
  }
  assert.equal(ecartDeForme('zerg', 'Terran'), null, 'un autre mot n’est pas un écart');
  // L'ORDRE, qui est ce que l'auteur a dicté : du moins cher au plus cher.
  const f = ['initiale', 'accents', 'casse', 'capitales', 'melee'].map((n) => ECARTS[n].facteur);
  for (let i = 1; i < f.length; i++) assert.ok(f[i] < f[i - 1], `${f[i]} < ${f[i - 1]}`);
  assert.equal(libelleEcart(ecartDeForme('fantome', 'Fantôme')),
    'aux accents près et à la capitale initiale près');
  assert.equal(libelleEcart(ecartDeForme('Zerg', 'Zerg')), '');
});

/* ══════════════════════════ 3. Les relectures ══════════════════════════ */

test('cible-mot — les relectures du catalogue, et leur inverse CALCULÉ sur l’opérateur', () => {
  const ops = operateursDeRelecture(catalogue);
  assert.deepEqual(ops.map((o) => o.code), ['m1a', 'mcaz', 'mcqw', 'm1a2', 'mpol', 'mtap', 'masi']);
  assert.equal(RELECTURE_PAR_DEFAUT, 'm1a');
  const par = Object.fromEntries(ops.map((o) => [o.code, o]));
  assert.deepEqual([...inverseDe(par.m1a).get('z')], [26]);
  assert.deepEqual([...inverseDe(par.mcaz).get('z')], [2, 1]);
  assert.deepEqual([...inverseDe(par.mcqw).get('z')], [1, 3]);
  assert.deepEqual([...inverseDe(par.mtap).get(' ')], [1, 1]);
  // La table ASCII écrit la casse et la ponctuation, sur trois chiffres.
  assert.deepEqual([...inverseDe(par.masi).get('C')], [0, 6, 7]);
  assert.deepEqual([...inverseDe(par.masi).get("'")], [0, 3, 9]);
  for (const op of ops) {
    const inverse = inverseDe(op);
    // Le carré de Polybe a vingt-cinq cases : il n'écrit jamais j. Le multi-tap
    // en a vingt-sept : l'espace est sur le 1.
    const tailles = { mpol: 25, mtap: 27, masi: 95 };
    assert.equal(inverse.size, tailles[op.code] ?? 26, `${op.code} : chaque lettre, une fois`);
    // L'aller-retour est exact : ce que l'inverse donne, l'opérateur le relit.
    for (const [lettre, valeurs] of inverse) {
      const e = appliquerOp(op, etat('NUMS', [...valeurs], []));
      assert.deepEqual([...e.valeur], [lettre], `${op.code} : ${valeurs.join(' ')}`);
    }
  }
});

test('cible-mot — les relectures d’un texte : cibles sous-jacentes, écrit réel, écart payé', () => {
  const zerg = relecturesPour(lireCible('Zerg'), catalogue);
  assert.deepEqual(zerg.map((r) => [r.code, r.cible.texte, r.cible.nature, r.produit, r.ecart.facteur]), [
    ['m1a', '26.5.18.7', 'valeurs', 'zerg', 970],
    ['mcaz', '21314152', 'chiffres', 'zerg', 970],
    ['mcqw', '13314152', 'chiffres', 'zerg', 970],
    ['m1a2', '26051807', 'chiffres', 'zerg', 970],
    ['mpol', '55154222', 'chiffres', 'zerg', 970],
    ['mtap', '94327341', 'chiffres', 'zerg', 970],
  ]);
  const fantome = relecturesPour(lireCible('Fantôme'), catalogue);
  assert.ok(fantome.length === 6 && fantome.every((r) => r.produit === 'fantome' && r.ecart.facteur === 902));
  assert.equal(fantome.find((r) => r.code === 'mcaz').cible.nature, 'valeurs', 'le M est en colonne 10 en AZERTY');
  // ★ L'ESPACE a une relecture : le 0 du téléphone. « reine des lames » ne se
  //   relit donc plus que par lui — trente chiffres, l'espace valant 1 1.
  assert.deepEqual(relecturesPour(lireCible('reine des lames'), catalogue)
    .map((r) => [r.code, r.cible.texte, r.produit]),
  [['mtap', '733243623211313274115321613274', 'reine des lames']]);
  assert.deepEqual(relecturesPour(lireCible('cœur'), catalogue), [],
    'aucune relecture n’écrit le « œ » : pas de voie, et c’est la recherche qui le dit');
});

/* ★ LA PONCTUATION OMISE — un écart de forme, payé, et rien de plus. */
test('cible-mot — la ponctuation omise se paie, et elle seule', () => {
  const e = ecartDeForme('cest de la merde', "C'est de la merde !");
  assert.deepEqual([...e.natures], ['ponctuation', 'initiale']);
  assert.equal(e.facteur, Math.round((ECARTS.ponctuation.facteur * ECARTS.initiale.facteur) / 1000));
  assert.ok(ECARTS.ponctuation.facteur < 1000, 'l’exacte passe devant l’approchée de même note');
  assert.equal(libelleEcart(e), 'à la ponctuation près et à la capitale initiale près');
  assert.equal(ecartDeForme('cest de la', "C'est de la merde !"), null, 'un mot manquant n’est pas un écart');
  assert.equal(ecartDeForme('cest de la merde', 'Cest de la merde').facteur, ECARTS.initiale.facteur,
    'sans ponctuation visée, rien à payer pour elle');
  // Les relectures de la phrase : le téléphone l'APPROCHE (pas de ponctuation),
  // la table ASCII l'écrit EXACTEMENT. Jamais les deux pour un même code.
  const rel = relecturesPour(lireCible("C'est de la merde !"), catalogue);
  assert.deepEqual(rel.map((r) => [r.code, r.cible.longueur, r.produit, Boolean(r.ponctuationOmise), r.ecart.facteur]), [
    ['mtap', 32, 'cest de la merde', true, e.facteur],
    ['masi', 57, "C'est de la merde !", false, 1000],
  ]);
});

/* ★ LA PONCTUATION OMISE DÉPEND DES CURSEURS — « ça dépend des curseurs » (l'autrice). */
test('cible-mot — la ponctuation omise : règle d’ordre au défaut, relâchée par la simplicité, durcie par l’exhaustivité', () => {
  const C = (simplicite, exhaustivite) => ({ simplicite, exhaustivite, quantite: 100, coherence: 100 });
  assert.equal(facteurPonctuation(undefined), 500, 'au défaut : ×0,5');
  assert.equal(facteurPonctuation(C(200, 0)), 1000, 'la simplicité au plus haut : rien à payer');
  assert.equal(facteurPonctuation(C(0, 200)), 100, 'l’exhaustivité au plus haut : ×0,1');
  assert.ok(facteurPonctuation(C(150, 100)) > 500 && facteurPonctuation(C(100, 150)) < 500, 'monotone des deux côtés');
  const exacte = { ecartDeForme: { natures: ['initiale'] } };
  const approchee = { ecartDeForme: { natures: ['ponctuation', 'initiale'] } };
  assert.ok(ordreDExactitude(undefined)(approchee, exacte) > 0, 'au défaut, l’exacte d’abord');
  assert.ok(ordreDExactitude(C(0, 200))(approchee, exacte) > 0, 'l’exhaustivité qui domine garde la règle');
  assert.equal(ordreDExactitude(C(200, 0))(approchee, exacte), 0, 'la simplicité qui domine la replie');
  assert.equal(facteurDEcartAuxCurseurs({ natures: ['ponctuation', 'initiale'] }, undefined), Math.round((500 * 970) / 1000));
});

/* ★ UNE PHRASE NE RECOPIE JAMAIS LA SAISIE — « dupliquer l'original est très
     maladroit et à éviter (voire interdire) » (l'autrice). La règle est
     structurelle : portées disjointes, dans l'ordre du texte. */
test('cible-mot — des segments de phrase : portées disjointes et ordonnées, sinon refusés', () => {
  const part = (offset, longueur) => ({ fragment: { offset, longueur, intervalles: [[offset, offset + longueur]] } });
  assert.equal(segmentsSansCopie([part(0, 5), part(8, 11)]), true, 'https puis reinfocovid');
  assert.equal(segmentsSansCopie([part(0, 23), part(0, 23)]), false, 'la saisie entière relue deux fois');
  assert.equal(segmentsSansCopie([part(0, 22), part(8, 11)]), false, 'un chevauchement, même partiel');
  assert.equal(segmentsSansCopie([part(8, 11), part(0, 5)]), false, 'le premier segment doit venir en premier');
});

/* ★ UNE PHRASE EN SEGMENTS — d'un bloc tant qu'elle tient, aux mots au-delà. */
test('cible-mot — une phrase trop longue pour un bloc se découpe aux mots, et la découpe réécrit la cible', () => {
  const [tel, ascii] = relecturesPour(lireCible("C'est de la merde !"), catalogue);
  const tSeg = segmentsDe(tel);
  const aSeg = segmentsDe(ascii);
  // Le téléphone approche en deux segments, la table ASCII écrit exactement en quatre.
  assert.deepEqual(tSeg.map((sg) => sg.texte), ['Cest de la', ' merde']);
  assert.deepEqual(aSeg.map((sg) => sg.texte), ["C'est", ' de la', ' merde', ' !']);
  for (const [rel, segs] of [[tel, tSeg], [ascii, aSeg]]) {
    assert.equal(segs.flatMap((sg) => sg.cible.chiffres).join(''), rel.cible.chiffres.join(''),
      `${rel.code} : bout à bout, les segments écrivent la cible entière`);
    for (const sg of segs) assert.ok(sg.cible.longueur <= CHIFFRES_PAR_SEGMENT, `${rel.code} : « ${sg.texte} »`);
  }
  // Ce qui tient d'un bloc reste un bloc : « de la merde » fait 22 chiffres.
  const [bloc] = relecturesPour(lireCible('de la merde'), catalogue);
  assert.ok(bloc.cible.longueur <= LONGUEUR_D_UN_BLOC);
  assert.equal(segmentsDe(bloc), null);
});

test('cible-mot — face à une relecture chiffrée, les opérateurs qui lisent la cible TRAVAILLENT', () => {
  const [rangs, azerty] = relecturesPour(lireCible('Zerg'), catalogue);
  const lisent = (cbl) => operateursPourCible(catalogue, cbl)
    .filter((op) => typeof op.viser === 'function').map((op) => op.code);
  assert.ok(lisent(azerty.cible).includes('mab'),
    'des coordonnées sont des chiffres : l’absorption s’y applique — c’est elle qui ouvre ZERG');
  assert.deepEqual(lisent(rangs.cible), [], 'des rangs de 26 ne sont pas des chiffres : ils se retirent');
  const explorables = operateursExplorables(catalogue).map((op) => op.code);
  for (const code of ['m1a', 'mcaz', 'mcqw']) {
    assert.equal(explorables.includes(code), false, `${code} : le verdict le joue, la recherche ne l’explore pas`);
  }
});

/* ══════════════════════════ 4. L'URL ══════════════════════════ */

/**
 * > « `#:` pour une cible (ou une saisie) en clair, `#` seul pour le b58, et
 * >   applique ça aussi bien pour l'objectif que la saisie initiale. La version
 * >   sans `:` ne fallback sur du clair que s'il y a des caractères hors b58
 * >   dedans. » (l'auteur)
 */
test('url — `:` pour le clair, rien pour le base58, et la même règle pour la saisie et la cible', () => {
  // Le site écrit le base58 NU.
  assert.equal(lire(`##${B58_SK}#${B58('Zerg')}`).cible.texte, 'Zerg');
  assert.equal(lire(`##${B58_SK}#${B58('Fantôme')}`).cible.texte, 'Fantôme');
  // `:` : la main écrit en clair, et le `:` n'appartient pas au texte.
  assert.equal(lire(`##${B58_SK}#:Zerg`).cible.texte, 'Zerg');
  assert.equal(lire(`##${B58_SK}#:111`).cible.texte, '111');
  // Sans `:`, un texte qui n'emploie que les 58 signes SE LIT EN BASE58 — c'est voulu.
  assert.notEqual(lire(`##${B58_SK}#Zerg`).cible.texte, 'Zerg',
    '« Zerg » sans « : » se relit en base58 : pour du clair, on écrit « : »');
  // Le repli sur le clair ne joue que pour ce qui ne PEUT PAS être du base58.
  assert.equal(lire(`##${B58_SK}#reine des lames`).cible.texte, 'reine des lames',
    'un espace n’est pas un signe base58 : repli sur le clair');
  // Et la même règle vaut pour la SAISIE.
  assert.equal(lire(`##:Sarah Kerrigan#${B58('Zerg')}`).saisie, 'Sarah Kerrigan');
  assert.equal(lire(`##:Zerg`).saisie, 'Zerg', 'une saisie en clair, `:` retiré');
  const r = lire(`##${B58_SK}#${B58('Zerg')}`);
  assert.equal(r.forme, 'resultats');
  assert.equal(r.cibleEcrite, true);
});

test('url — l’écriture : toujours le base58 nu, et rien au défaut', () => {
  assert.equal(ecrire({ saisie: 'Sarah Kerrigan', cible: 'Zerg' }), `##${B58_SK}#${B58('Zerg')}`);
  assert.equal(ecrire({ saisie: 'Sarah Kerrigan', cible: '111' }), `##${B58_SK}#${B58('111')}`);
  assert.equal(ecrire({ saisie: 'Sarah Kerrigan' }), `##${B58_SK}`, 'les liens de 666 sont ceux d’avant');
  assert.equal(ecrire({ saisie: 'Sarah Kerrigan', cible: '666' }), `##${B58_SK}`);
  assert.equal(
    ecrire({ saisie: 'Sarah Kerrigan', fragments: [{ portee: null, resonance: null, codes: ['fl', 'tca', 'masb', 'mrdE'] }],
      registre: 'sobre', cible: 'Zerg', relecture: 'mcaz' }),
    `#so!mcaz!fl+masb+mrdE#${B58_SK}#${B58('Zerg')}`,
  );
});

test('url — les anciens marqueurs restent LUS, et deux cibles contradictoires sont refusées', () => {
  assert.equal(lire(`#c111!#${B58_SK}`).cible.texte, '111');
  assert.equal(lire(`#czerg!#${B58_SK}`).cible.texte, 'zerg');
  assert.equal(lire(`#c111!#${B58_SK}#:111`).bandeau, null, 'deux fois la même : rien à trancher');
  assert.equal(lire(`#c111!#${B58_SK}#:Zerg`).bandeau, BANDEAUX.cibleEnDouble);
  assert.equal(lire(`##${B58_SK}#:`).bandeau, BANDEAUX.cibleIllisible, 'un « : » qui n’annonce rien');
  assert.equal(lire(`##${B58_SK}#:${'a'.repeat(MAX_SIGNES_TEXTE + 1)}`).bandeau, BANDEAUX.cibleIllisible);
  assert.equal(lire(`#a#b#c#d`).bandeau, BANDEAUX.formatInconnu, 'trois segments au plus');
});

test('url — le marqueur de relecture : lu, écrit, et refusé sans texte', () => {
  const l = lire(`#so!mcaz!fl+masb+mrdE#${B58_SK}#:Zerg`);
  assert.equal(l.forme, 'canonique');
  assert.equal(l.relecture, 'mcaz');
  assert.equal(
    ecrire({ saisie: l.saisie, fragments: l.fragments, registre: 'sobre', cible: l.cible, relecture: l.relecture }),
    `#so!mcaz!fl+masb+mrdE#${B58_SK}#${B58('Zerg')}`,
    'ce qui se lit se réécrit à l’identique — en base58',
  );
  assert.equal(lire(`#so!mcaz!fl+masb+mab#${B58_SK}#:111`).bandeau, BANDEAUX.relectureSansTexte);
  assert.throws(() => ecrire({ saisie: 'x', fragments: [{ portee: null, resonance: null, codes: ['nl'] }],
    cible: 'Zerg', relecture: 'pas un code' }), /relecture/);
});

/* ══════════════════════════ 5. Le verdict d'une voie rejouée ══════════════════════════ */

const moteur = creerMoteur(catalogue, { filetTemporel: false });

/** Rejoue un lien, construit sa scène, et vérifie qu'aucun geste n'a été remplacé en silence. */
function scene(hash) {
  const lecture = lire(hash);
  const rejeu = moteur.rejouer(lecture);
  assert.equal(rejeu.ok, true, `${hash} : ${rejeu.raison || ''}`);
  const sc = moteur.scenarioDe(rejeu.approche, { saisie: lecture.saisie, cible: lecture.cible });
  // ★ Un geste REJETÉ ne fait rien échouer : `essayerCatalogue` le remplace en
  //   silence par une substitution générique. Seul `avertissements` le dit.
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  assert.doesNotThrow(() => compile(sc), hash);
  return { sc, approche: rejeu.approche };
}

test('cible-mot — ZERG par les coordonnées AZERTY : deux nombres, une touche, une lettre', () => {
  const { sc, approche } = scene(`#so!mcaz!fl+masb+mrdE#${B58_SK}#${B58('Zerg')}`);
  assert.equal(approche.relecture.code, 'mcaz');
  assert.equal(approche.cible.texte, '21314152', 'la voie écrit les coordonnées — c’est la cible sous-jacente');
  assert.equal(sc.result, 'zerg', 'le verdict annonce ce qui est ÉCRIT');
  const n = sc.steps.length;
  const verdictStep = sc.steps[n - 1];
  assert.equal(verdictStep.caption, 'zerg — à la capitale initiale près', 'et dit l’écart qu’il a payé');
  const reveal = verdictStep.ops.find((o) => o.op === 'reveal');
  const relus = sc.steps.slice(n - 5, n - 1).map((st) => st.ops[0]);
  assert.deepEqual(relus.map((o) => [o.op, o.mesure, o.layout, o.to.text]), [
    ['keyboard', 'coordonnees', 'azerty', 'z'], ['keyboard', 'coordonnees', 'azerty', 'e'],
    ['keyboard', 'coordonnees', 'azerty', 'r'], ['keyboard', 'coordonnees', 'azerty', 'g'],
  ]);
  assert.ok(relus.every((o) => o.targets.length === 2), 'chaque lettre part de DEUX nombres');
  assert.deepEqual(reveal.targets, relus.map((o) => o.to.id), 'on révèle les lettres qu’on vient de voir descendre');
  assert.equal(reveal.serie, 4, 'une série du verdict est un exemplaire du TEXTE, pas de ses huit chiffres');
});

test('cible-mot — la réglette lue à rebours relit des rangs, et la forme exacte ne paie rien', () => {
  const { sc } = scene(`#so!m1a!ma1#${B58('Zerg')}#zerg`);
  assert.equal(sc.result, 'zerg');
  assert.equal(sc.steps[sc.steps.length - 1].caption, 'zerg', 'forme exacte : aucun écart à dire');
  const relus = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'table' && o.ordre === '1a26');
  assert.deepEqual(relus.map((o) => [o.letter, o.to.text]), [['26', 'z'], ['5', 'e'], ['18', 'r'], ['7', 'g']]);
});

test('cible-mot — le rejeu refuse ce qu’il ne sait pas relire, en le disant', () => {
  const inconnu = moteur.rejouer(lire(`#so!m36!ma1#${B58('Zerg')}#Zerg`));
  assert.equal(inconnu.ok, false);
  assert.equal(inconnu.bandeau, BANDEAUX.codeInconnu, '`m36` ne relit rien');
  const impossible = moteur.rejouer(lire(`#so!m1a!ma1#${B58('Zerg')}#reine des lames`));
  assert.equal(impossible.ok, false);
  assert.equal(impossible.bandeau, BANDEAUX.relectureImpossible);
});

/**
 * ★ UNE VISÉE LONGUE, UNE LIGNE LONGUE — `mappeurs.js › plafondDAbsorption`.
 * L'absorption n'écrit qu'un chiffre visé pour trois ou quatre chiffres de
 * ligne ; à trente-six chiffres de ligne, quatorze chiffres visés (sept lettres
 * relues par paires) étaient hors d'atteinte par construction.
 */
/**
 * ★ CE QUI ABSORBE LE DÉCLARE — la recherche ne tient pas une liste de codes
 *   (`assemblage.js › vecteursDeSix`, le second raffinage). Un cinquième
 *   opérateur d'absorption entrerait dans la forme sans qu'on touche à la
 *   recherche ; et s'il oubliait le champ, ce test le dirait.
 */
test('cible-mot — les opérateurs qui ABSORBENT sont déclarés, et ce sont ceux-là', () => {
  const absorbants = operateursExplorables(catalogue).filter((o) => o.absorbe).map((o) => o.code);
  assert.deepEqual(absorbants, ['mab', 'mrdE', 'mabx', 'mabd']);
  for (const code of absorbants) {
    const op = operateursExplorables(catalogue).find((o) => o.code === code);
    assert.equal(op.from, 'NUMS');
    assert.equal(op.to, 'NUMS');
    assert.equal(typeof op.viser, 'function', 'elle écrit la cible : elle la lit');
  }
});

test('cible-mot — le plafond d’absorption suit la visée, et seulement au-delà de dix chiffres', () => {
  // Une seule source désormais (`moteur/transformations/commun.js`) : la
  // recherche relaie la constante du moteur, elle n'en tient plus de copie.
  assert.equal(CIBLE_LONGUE, VISEE_LONGUE, 'un seul dix, relayé — plus deux copies');
  assert.equal(VISEE_LONGUE, 10, 'l’ancien plafond des cibles chiffrées : en deçà, rien ne bouge');
  assert.ok(MAX_CHIFFRES > VISEE_LONGUE, 'une cible chiffrée longue profite de la même règle qu’un mot');
  for (let l = 1; l <= VISEE_LONGUE; l++) assert.equal(plafondDAbsorption(l), 36, `visée de ${l} : rien ne bouge`);
  assert.equal(plafondDAbsorption(14), 70);
  assert.equal(plafondDAbsorption(MAX_CHIFFRES), 5 * MAX_CHIFFRES);
});

/**
 * ★ La cible SOUS-JACENTE d'une relecture passe par tout l'assemblage, y compris
 *   la LIAISON — et elle n'est pas toujours une suite de chiffres. « Diable » en
 *   rangs vaut `4.9.1.2.12.5` : la liaison doit s'en retirer, et le dire.
 */
test('cible-mot — la liaison se retire devant une cible de VALEURS, sans exploser', () => {
  const rangs = cibleDeValeurs([4, 9, 1, 2, 12, 5]);
  assert.equal(rangs.nature, 'valeurs');
  const mots = [
    { texte: 'Sarah', famille: 'unite', offset: 0, longueur: 5, tokenDebut: 0, tokenLong: 1 },
    { texte: 'Kerrigan', famille: 'unite', offset: 6, longueur: 8, tokenDebut: 2, tokenLong: 1 },
  ];
  assert.deepEqual(liaisons(mots, { catalogue, cache: new Map() }, rangs), []);
  // Et elle travaille toujours sur une cible chiffrée : « James Bond » vaut 007.
  const james = [
    { texte: 'James', famille: 'unite', offset: 0, longueur: 5, tokenDebut: 0, tokenLong: 1 },
    { texte: 'Bond', famille: 'unite', offset: 6, longueur: 4, tokenDebut: 2, tokenLong: 1 },
  ];
  assert.ok(liaisons(james, { catalogue, cache: new Map() }, lireCible('007')).length >= 1,
    'la liaison de l’auteur reste trouvée');
});

test('cible-mot — une cible chiffrée de vingt chiffres se lit ; au-delà, elle est refusée', () => {
  const c = lireCible('12345678901234567890');
  assert.equal(c.nature, 'chiffres');
  assert.equal(c.longueur, 20);
  assert.equal(c.nombre, null, 'au-delà de 2⁵³, `Number` arrondit : pas de nombre plutôt qu’un faux');
  assert.equal(lireCible('9007199254740991').nombre, 9007199254740991, 'le plus grand entier sûr se garde');
  assert.equal(lireCible('9007199254740993').nombre, null);
  assert.equal(lireCible('1'.repeat(21)), null);
});

test('cible-mot — FANTOME depuis une adresse : soixante-dix chiffres de ligne pour quatorze visés, rejoués', () => {
  const saisie = 'https://hope-hope-hope.fr/';
  const { sc, approche } = scene(`#so!mtap!fl+masc+mab#${B58(saisie)}#${B58('Fantome')}`);
  assert.equal(approche.relecture.code, 'mtap');
  assert.equal(approche.cible.texte, '33216281636132', 'le multi-tap : la touche, puis le nombre d’appuis');
  assert.equal(sc.result, 'fantome');
  const relus = sc.steps.filter((s) => s.code === 'mtap').flatMap((s) => s.ops)
    .filter((o) => o.to && /^[a-z]$/.test(String(o.to.text))).map((o) => o.to.text);
  assert.equal(relus.join(''), 'fantome', 'la relecture est jouée, lettre par lettre');
});

/**
 * ★ **LE DÉCOR RESTE MONTÉ TOUTE LA RELECTURE.**
 *
 * > « Comme pour les autres tables, quand plusieurs conversions chiffres/nombre
 * >   vers lettre sont faites d'affilée, tu devrais afficher la table et la
 * >   garder affichée tout le long du processus. » (l'auteur)
 *
 * Le sens lettre → nombre le faisait déjà. Le sens INVERSE ne le faisait qu'à
 * moitié : le rang et le clavier montaient une fois, mais les relectures par
 * PAIRES intercalent un collage entre deux cases, et ce geste cassait la série
 * — quatre montées et quatre descentes pour écrire « zerg »
 * (`scenario.js`, la passe qui mutualise les décors).
 */
test('cible-mot — une seule montée de table pour toute une relecture par paires', () => {
  const { sc } = scene(`#so!m1a2!fl+masb+mab#${B58_SK}#${B58('Zerg')}`);
  const cases = sc.steps.filter((s) => s.code === 'm1a2')
    .flatMap((s) => (s.ops || []).filter((o) => o.op === 'table'));
  assert.equal(cases.length, 4, 'quatre lettres, quatre cases allumées');
  assert.deepEqual(cases.map((o) => o.to.text), ['z', 'e', 'r', 'g']);
  assert.deepEqual(cases.map((o) => Boolean(o.montre)), [true, false, false, false]);
  assert.deepEqual(cases.map((o) => Boolean(o.retire)), [false, false, false, true]);
  // ★ Et la table MONTRÉE est celle que l'opérateur applique : chaque case
  //   désigne son couple dans les entrées qu'elle affiche.
  for (const o of cases) {
    const entree = (o.entries || []).find((e) => e.char === o.letter);
    assert.ok(entree, `« ${o.letter} » ne figure pas dans la table montrée`);
    assert.equal(entree.value, o.to.text, 'la case montrée est celle qui descend');
  }
  // ★ Deux tables DIFFÉRENTES dans la même scène gardent chacune la leur :
  //   l'ASCII des lettres se replie avant que le rang sur deux chiffres monte.
  const toutes = sc.steps.flatMap((s) => (s.ops || []).filter((o) => o.op === 'table'));
  assert.equal(toutes.filter((o) => o.montre).length, 2);
  assert.equal(toutes.filter((o) => o.retire).length, 2);
});

test('cible-mot — le clavier aussi : une montée, une descente pour quatre touches', () => {
  const { sc } = scene(`#so!mcaz!fl+masb+mrdE#${B58_SK}#${B58('Zerg')}`);
  const touches = sc.steps.flatMap((s) => (s.ops || []).filter((o) => o.op === 'keyboard'));
  assert.equal(touches.length, 4);
  assert.deepEqual(touches.map((o) => Boolean(o.montre)), [true, false, false, false]);
  assert.deepEqual(touches.map((o) => Boolean(o.retire)), [false, false, false, true]);
});

test('cible-mot — sans l’opérateur qui relit, le scénario refuse plutôt que de décréter', () => {
  const lecture = lire(`#so!mcaz!fl+masb+mrdE#${B58_SK}#:Zerg`);
  const { approche } = moteur.rejouer(lecture);
  assert.throws(
    () => construireScenario(approche, {
      saisie: 'Sarah Kerrigan', cible: approche.cible,
      relecture: { code: 'mcaz', mot: 'Zerg', op: null, ecart: approche.ecartDeForme },
    }),
    /n’a pas fourni/,
  );
});
