/** LE PROFIL DE CIBLE ET SA POLITIQUE — `cible.js › profilDeCible`, `politique.js`.
 *
 *  ROUTINE : rien n'y cherche. On y tient trois choses, et la première est un
 *  VERROU :
 *
 *   1. `politique(666)` est GELÉE, champ par champ, contre ses valeurs
 *      historiques. Un profil ne doit pas devenir une porte dérobée pour
 *      changer les listes publiées du 666 : si ce test rougit, c'est que la
 *      politique du 666 a bougé, et ça ne se décide pas en passant.
 *   2. les cinq cas de l'auteur ont chacun leur profil, et le cas PIÈGE — une
 *      cible de valeurs homogène — tombe du bon côté ;
 *   3. le profil est une FONCTION PURE de la cible : ni horloge, ni état.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { profilDeCible, CIBLE_LONGUE, cibleDeValeurs, lireCible } from '../cible.js';
import { politique, gesteUtile } from '../politique.js';
import { normaliserCatalogue, appliquerOp, etat, operateursRetires } from '../bfs.js';
import { catalogue } from './_catalogue.js';

/* ══════════════════════ 1. Le verrou du 666 ══════════════════════ */

/**
 * ★ **CE QUE VALAIT LA POLITIQUE DU 666 AVANT QU'ELLE AIT UN NOM.**
 *
 * Chaque champ est l'expression qui était écrite à l'endroit qu'il remplace :
 * `cbl.defaut` pour le joker et les réponses dédiées, `cbl.defaut || cbl.nature
 * !== 'chiffres'` (nié) pour la liaison, `cbl.homogene` pour la résonance et la
 * tolérance aux suppressions, sa négation pour la moisson du motif et le siège
 * par chiffre, `cbl.nature === 'mot'` pour les relectures.
 */
const POLITIQUE_DU_666 = {
  joker: true,
  reponsesDediees: true,
  liaison: false,
  resonance: true,
  moissonDuMotif: false,
  siegeParChiffre: false,
  tolereLesSuppressions: true,
  parRelectures: false,
};

test('★ politique — celle du 666 est gelée, champ par champ', () => {
  const p = politique(profilDeCible('666'));
  for (const [champ, attendu] of Object.entries(POLITIQUE_DU_666)) {
    assert.equal(p[champ], attendu, `politique(666).${champ}`);
  }
  assert.deepEqual(Object.keys(p).sort(), Object.keys(POLITIQUE_DU_666).sort(),
    'un champ neuf se déclare ici aussi : la politique du 666 ne s’étend pas en silence');
  assert.ok(Object.isFrozen(p), 'une politique ne se retouche pas après coup');
});

/* ══════════════════════ 2. Les cinq cas de l'auteur ══════════════════════ */

test('★ politique — les cinq profils, et ce qu’ils autorisent', () => {
  const cas = (c) => ({ profil: profilDeCible(c), regles: politique(profilDeCible(c)) });
  const six = cas('666');
  const homogene = cas('111');
  const melee = cas('13');
  const longue = cas('12345678901234');
  const texte = cas('Zerg');

  assert.equal(six.profil.classe, '666');
  assert.equal(homogene.profil.classe, 'homogene');
  assert.equal(melee.profil.classe, 'chiffres');
  assert.equal(longue.profil.classe, 'chiffresLongue');
  assert.equal(texte.profil.classe, 'texte');

  // Le 666 est seul à porter les promesses du site.
  assert.equal(homogene.regles.joker, false, '« 111 » n’a droit ni au joker ni aux dédiées');
  assert.equal(homogene.regles.reponsesDediees, false);
  // Les optimisations HOMOGÈNES suivent l'homogénéité, pas le 666.
  assert.equal(homogene.regles.resonance, true);
  assert.equal(homogene.regles.tolereLesSuppressions, true);
  assert.equal(melee.regles.resonance, false, 'un même programme ne peut pas écrire 13');
  assert.equal(melee.regles.moissonDuMotif, true, 'une cible mêlée est un MOTIF, pas un compte');
  assert.equal(melee.regles.siegeParChiffre, true);
  // La liaison écrit des chiffres : jamais pour 666, jamais pour un texte.
  assert.equal(melee.regles.liaison, true, '« James Bond » vaut 007');
  assert.equal(six.regles.liaison, false);
  assert.equal(texte.regles.liaison, false);
  // Un texte se cherche par ses relectures, et lui seul.
  assert.equal(texte.regles.parRelectures, true);
  assert.equal(longue.regles.parRelectures, false);
  assert.equal(longue.profil.longue, true, `au-delà de ${CIBLE_LONGUE} chiffres`);
  assert.equal(melee.profil.longue, false);
});

/**
 * ⚠️ LE CAS PIÈGE — la cible SOUS-JACENTE d'un mot relu par les rangs est une
 * suite de VALEURS (« 26.5.18.7 »), et elle peut être homogène (« fff » vaut
 * 6 6 6). Elle n'est ni le 666 ni une cible chiffrée : un `switch` sur
 * l'étiquette l'aurait rangée avec l'un ou l'autre. La politique se lit donc
 * sur les faits.
 */
test('★ politique — une cible de VALEURS homogène n’est pas le 666', () => {
  const valeurs = cibleDeValeurs([6, 6, 6]);
  assert.equal(valeurs.nature, 'chiffres', 'six, six, six sont des chiffres décimaux');
  const rangs = cibleDeValeurs([26, 5, 18, 7]);
  assert.equal(rangs.nature, 'valeurs');
  const p = politique(profilDeCible(rangs));
  assert.equal(p.liaison, false, 'une potence ne sait pas viser 26.5.18.7');
  assert.equal(p.joker, false, 'le joker est une promesse du 666, pas des rangs');
  const homogenes = cibleDeValeurs([14, 14, 14]);
  assert.equal(profilDeCible(homogenes).homogene, true);
  assert.equal(politique(profilDeCible(homogenes)).resonance, true,
    'homogène en valeurs : les optimisations homogènes valent quand même');
  assert.equal(politique(profilDeCible(homogenes)).liaison, false);
});

/* ══════════════════════ 3. Une fonction pure ══════════════════════ */

test('★ politique — le profil est une fonction pure de la cible', () => {
  const a = profilDeCible('007');
  const b = profilDeCible('007');
  assert.deepEqual(a, b, 'deux appels, le même profil');
  assert.ok(Object.isFrozen(a), 'un profil ne se retouche pas');
  // Ni horloge ni état : le profil d'une cible déjà lue est le MÊME objet.
  const cible = lireCible('007');
  assert.equal(profilDeCible(cible), profilDeCible(cible), 'mémoïsé par cible, pas recalculé');
  assert.equal(politique(a), politique(b), 'et la politique aussi');
  assert.throws(() => politique(null), /profil de cible/, 'échec bruyant, pas de repli muet');
  assert.throws(() => politique({}), /profil de cible/);
});

/* ══════════════════════ 4. L'utilité d'un geste ══════════════════════
 *
 * ★ CETTE RÈGLE VIENT DU MOTEUR, où elle a été recalibrée TROIS FOIS — une
 *   constante 3, puis `visee.longueur`, puis libre au-delà de dix. Elle est
 *   arrivée ici parce qu'elle n'est pas un fait sur la cible mais un jugement
 *   sur ce qui vaut la peine d'être cherché. Les vecteurs ci-dessous sont ceux
 *   que `moteur/catalogue.test.js` tenait avant le déplacement.
 */

const tri = (cible) => normaliserCatalogue(catalogue)
  .find((o) => o && o.code === 'mtri').viser(cible);

test('★ politique — le tri ne se joue que s’il RASSEMBLE (visée courte)', () => {
  const op = tri('666');
  // Ranger sans réunir : le moteur range, la politique refuse.
  assert.deepEqual(op.apply([3, 1, 2], [[], [], []]).valeur, [1, 2, 3],
    'l’opérateur, lui, sait ranger');
  assert.equal(gesteUtile(op, [3, 1, 2], [1, 2, 3]), false,
    'trois valeurs distinctes : ranger ne réunit personne');
  assert.equal(gesteUtile(op, [6, 6, 6, 4, 1], [1, 4, 6, 6, 6]), false,
    'la plage de trois existe DÉJÀ : le tri ne s’en attribue pas le mérite');
  assert.equal(gesteUtile(op, [6, 4, 6, 1, 6], [1, 4, 6, 6, 6]), true,
    'trois 6 dispersés, réunis : là, il sert');
  // Et la porte unique de la recherche l’applique : le tri inutile n’existe pas.
  assert.equal(appliquerOp(op, etat('NUMS', [3, 1, 2], [[], [], []])), null,
    'appliquerOp refuse le geste que la politique juge inutile');
  assert.ok(appliquerOp(op, etat('NUMS', [6, 4, 6, 1, 6], [[], [], [], [], []])),
    'et laisse passer celui qui rassemble');
});

test('★ politique — au-delà de dix chiffres visés, ranger suffit', () => {
  const op = tri('12345678901234');
  assert.equal(gesteUtile(op, [3, 1, 2], [1, 2, 3]), true,
    'une visée de quatorze ne peut pas demander quatorze valeurs identiques');
  assert.equal(gesteUtile({ utilite: 'rassemble' }, [3, 1, 2], [1, 2, 3]), true,
    'sans visée lisible, on ne juge pas : l’invariant du moteur a déjà parlé');
  assert.equal(gesteUtile({ code: 'mrn' }, [3, 1, 2], [1, 2, 3]), true,
    'un opérateur qui ne déclare aucune utilité n’est pas jugé');
});

/* ══════════════════ 5. Ce qui se retire, et qui le dit ══════════════════
 *
 * ★ Treize opérateurs lisent la cible et ont le DROIT de se retirer quand leur
 *   règle n'a pas de sens pour elle — « le plus fréquent l'emporte » ne veut
 *   rien dire pour `13`. Ils n'ont pas le droit de le faire en silence :
 *   l'échec bruyant est un contrat (§2.2). Avant, `operateursPourCible` les
 *   laissait tomber sans un mot.
 */

test('★ retraits — une cible mêlée fait se retirer `mpf`, `mr6` et `mam`, et ça se dit', () => {
  const retires = operateursRetires(catalogue, lireCible('13'));
  // `mam` vise la MOYENNE que `meg` égalisera : elle n'a de sens que pour une
  // cible d'un seul chiffre (`mappeurs.js › operateurAdditionVersLaMoyenne`).
  assert.deepEqual(retires.map((x) => x.code).sort(), ['mam', 'mpf', 'mr6']);
  for (const x of retires) {
    assert.equal(x.etat, 'RETIRE');
    assert.match(x.dit, /règle/, 'un retrait dit sa raison');
    assert.ok(x.id, 'et se nomme');
  }
  // « 111 » est homogène : « le plus fréquent » y a un sens, le demi-tour non —
  // ni l'addition vers la moyenne, qui ne sait que la faire MONTER.
  assert.deepEqual(operateursRetires(catalogue, lireCible('111')).map((x) => x.code).sort(), ['mam', 'mr6']);
  // « 999 » porte un 9 : personne ne se retire.
  assert.deepEqual(operateursRetires(catalogue, lireCible('999')), []);
});

test('★ retraits — sur la cible sous-jacente d’un mot, treize opérateurs s’en vont', () => {
  const rangs = cibleDeValeurs([26, 5, 18, 7]);
  const retires = operateursRetires(catalogue, rangs);
  // Dix, plus l'addition vers la moyenne (`mam`) et les deux redécoupages qui
  // accolent (`mrdf`, `mrfE`), qui lisent la cible comme leurs modèles. `megf`
  // n'est pas compté : inactif en recherche, il n'a rien à retirer.
  assert.equal(retires.length, 13, 'toute la famille qui lit la cible');
  assert.ok(retires.every((x) => x.etat === 'RETIRE'));
  for (const code of ['mab', 'mrdE', 'mabx', 'mabd']) {
    assert.ok(retires.some((x) => x.code === code), `${code} se retire devant une suite de valeurs`);
  }
});

/**
 * ⚠️ **ET LE CAS SOURNOIS : sous 666, `mr6` JOUE, avec la règle de 999.**
 *
 * `operateursPourCible` court-circuite pour la cible par défaut et rend le
 * catalogue tel quel ; l'entrée de `mr6` est bâtie sur `999` (`selonLaCible`,
 * option `reference`), si bien qu'une recherche vers 666 explore un opérateur
 * qui retourne les 6 en 9. Le résultat n'en souffre pas — un tel chemin n'écrit
 * pas 666 et tombe au verdict —, mais c'est du budget dépensé à chaque
 * recherche du site. Le diagnostic le DIT ; le corriger changerait ce
 * qu'explore 666, et cela se mesure avant de se décider.
 */
test('★ retraits — sous 666, `mr6` est joué avec la règle d’une autre cible', () => {
  const sous666 = operateursRetires(catalogue, lireCible('666'));
  assert.deepEqual(sous666.map((x) => x.code), ['mr6']);
  assert.equal(sous666[0].etat, 'REGLE_D_UNE_AUTRE_CIBLE');
  assert.match(sous666[0].dit, /règle de 999/);
  const op = normaliserCatalogue(catalogue).find((o) => o && o.code === 'mr6');
  assert.equal(op.visee.texte, '999', 'son entrée de catalogue est bâtie sur 999');
  assert.deepEqual(appliquerOp(op, etat('NUMS', [6, 6, 6], [[], [], []])).valeur, [9, 9, 9],
    'et sous 666, il retourne les 6 en 9 — mesuré, pas supposé');
});

/* ══════════════ 6. Les modes hors jeu, et l'annonce qu'ils en font ══════════════
 *
 * ★ Deux modes demandent autant de portées que la cible a de chiffres : la
 *   PARTITION des morceaux contigus, le LIBRE des disjoints parmi les douze
 *   meilleurs. Au-delà, ils ne rendent rien — et ne le disaient pas. Sur une
 *   cible de quatorze chiffres, deux des neuf modes du site sont hors jeu par
 *   construction.
 */

test('★ modes — ce qui ne peut pas s’appliquer le dit', async () => {
  const { creerMoteur } = await import('../index.js');
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const court = moteur.resoudre('Jim', { cible: '666' });
  const dits = (r) => r.modesImpossibles.map((m) => m.mode).sort();
  // « Jim » est un seul mot : trois morceaux contigus, il n'en offre qu'un.
  assert.deepEqual(dits(court), ['PARTITION']);
  assert.match(court.modesImpossibles[0].dit, /morceaux contigus/);
  // Quatorze chiffres visés : les deux modes s'annoncent hors jeu.
  const longue = moteur.resoudre('Sarah Kerrigan', { cible: '12345678901234' });
  assert.deepEqual(dits(longue), ['LIBRE', 'PARTITION']);
  for (const m of longue.modesImpossibles) {
    assert.match(m.dit, /il faudrait 14/, 'l’annonce dit COMBIEN il en faudrait');
  }
  // Et une cible qui les laisse jouer n'annonce rien pour eux.
  const phrase = moteur.resoudre('Le chat dort sur le tapis rouge', { cible: '13' });
  assert.equal(phrase.modesImpossibles.length, 0, 'deux morceaux, la phrase en a de reste');
});
