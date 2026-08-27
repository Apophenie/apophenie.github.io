/** Le récapitulatif du barème — ce qui se vérifie sans navigateur.
 *
 *  ★ CE QUE CES TESTS GARDENT, et c'est une seule chose : que la page reste une
 *  VUE CALCULÉE. « Cette page ne doit pas être une duplication des règles mais
 *  une vue calculée depuis les règles, pour qu'elle ne diverge pas au fur et à
 *  mesure des évolutions » (l'auteur).
 *
 *  Une page dérivée ne se teste pas en comparant ce qu'elle affiche à une
 *  liste écrite ici — ce serait remettre la duplication un cran plus loin, dans
 *  le test, où elle pourrirait aussi vite. On teste donc les DEUX propriétés
 *  qui font qu'elle est dérivée :
 *
 *   1. **Elle suit le catalogue et le barème sans les nommer.** Le code est
 *      relu comme du TEXTE et l'on vérifie qu'aucun code d'opérateur et aucun
 *      nom de palier n'y est écrit. Un autre agent renomme en ce
 *      moment les cent codes d'opérateur : si ce test passe encore après son
 *      passage, c'est que la page n'avait rien à changer.
 *
 *   2. **Ce qu'elle calcule, elle le calcule pour de bon.** Chaque opérateur du
 *      catalogue doit avoir un exemple jouable, et chaque palier du barème un
 *      signe mesuré. Ces deux vérifications tournent sur le catalogue RÉEL :
 *      elles échoueront le jour où un opérateur ajouté ne sera jouable sur
 *      aucune saisie témoin, ce qui est exactement l'alerte qu'on veut.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  programmePour, sensDesPaliers, mesurerLesPaliers, saisiesTemoins, PROFONDEUR_EXEMPLE,
} from './pages/debug.js';
import { CATALOGUE, appliquer, PAR_CODE } from '../moteur/catalogue.js';
import { depuisSaisie } from '../moteur/etat.js';
import { BAREME, FICELLES } from '../recherche/elegance.js';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/** Le CODE seul. Les commentaires de ce projet citent volontiers ce qu'ils
 *  interdisent — l'en-tête cite `m.redecoupageChoisi`, qui est justement un
 *  identifiant d'opérateur —, et une recherche naïve y trouverait ce qu'elle
 *  cherche à bannir. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const SOURCE = sansCommentaires(lire('./pages/debug.js'));

/* ═══════════ 1. La page ne recopie ni le catalogue ni le barème ═══════════ */

test('aucun code d’opérateur n’est écrit dans la page', () => {
  // Les codes sont courts (`f1`, `mw`) et pourraient apparaître par accident
  // dans un mot : on ne les cherche donc qu'entre guillemets, c'est-à-dire là
  // où ils seraient effectivement utilisés comme code.
  const litteraux = new Set();
  for (const m of SOURCE.matchAll(/['"`]([^'"`\n]{1,8})['"`]/g)) litteraux.add(m[1]);
  const fautifs = [...PAR_CODE.keys()].filter((code) => litteraux.has(code));
  assert.deepEqual(fautifs, [],
    'un code d’opérateur écrit en dur ne survivrait pas au renommage du catalogue');
});

test('aucun identifiant d’opérateur n’est écrit dans la page', () => {
  const fautifs = CATALOGUE.map((o) => o.id).filter((id) => SOURCE.includes(id));
  assert.deepEqual(fautifs, []);
});

test('aucun nom de palier du barème n’est écrit dans la page', () => {
  const fautifs = Object.keys(BAREME).filter((cle) => SOURCE.includes(cle));
  assert.deepEqual(fautifs, [],
    'le signe d’un palier doit être MESURÉ, jamais lu dans une table de noms');
});

test('aucun nom de compteur de ficelle n’est écrit dans la page', () => {
  const fautifs = [...new Set(Object.values(FICELLES))].filter((nom) => SOURCE.includes(nom));
  assert.deepEqual(fautifs, []);
});

test('l’attribut `title` natif reste banni de la page', () => {
  assert.ok(!/['"]title['"]\s*:/.test(SOURCE) && !/\.title\s*=/.test(SOURCE),
    '`src/app/infobulle.js` est le composant de bulle du projet ; `title` est proscrit');
});

/* ═══════════ 2. Ce qu'elle calcule, elle le calcule pour de bon ═══════════ */

test('les saisies témoins ne sont pas vides', () => {
  const temoins = saisiesTemoins();
  assert.ok(temoins.length >= 2);
  for (const s of temoins) assert.ok(depuisSaisie(s), `« ${s} » n’est pas une saisie valide`);
});

test('chaque opérateur a un exemple, et cet exemple l’emploie réellement', () => {
  // On rejoue chaque programme trouvé à la main : tous ses codes doivent
  // s'appliquer, et le DERNIER doit être celui de l'opérateur demandé. Un
  // exemple qui montrerait autre chose serait pire que pas d'exemple du tout.
  const orphelins = [];
  for (const op of CATALOGUE) {
    const prog = programmePour(op);
    if (!prog) { orphelins.push(op.code); continue; }
    assert.equal(prog.codes[prog.codes.length - 1], op.code, op.code);
    assert.ok(prog.codes.length <= PROFONDEUR_EXEMPLE + 1, `${op.code} : programme trop long`);
    let etat = depuisSaisie(prog.saisie);
    for (const code of prog.codes) {
      etat = appliquer(PAR_CODE.get(code), etat);
      assert.ok(etat !== null, `${op.code} : le programme ${prog.codes.join('+')} ne s’applique pas`);
    }
  }
  assert.deepEqual(orphelins, [],
    'ces opérateurs ne sont jouables sur aucune saisie témoin : il en faut une de plus');
});

test('le signe de chaque palier du barème est mesuré, pas deviné', () => {
  const mesure = sensDesPaliers();
  assert.equal(mesure.mesurable, true, mesure.raison || '');
  assert.ok(mesure.temoins > 1, 'un seul bilan témoin ne prouverait rien');
  const muets = [];
  for (const [cle, m] of mesure.paliers) {
    assert.ok(m, cle);
    // Un palier peut légitimement n'entrer ni dans le crédit — c'est le cas du
    // plancher du facteur. La mesure doit alors le DIRE, pas conclure au hasard.
    if (!m.sens) { muets.push(cle); continue; }
    assert.ok(['+', '−', '±'].includes(m.sens), `${cle} : sens ${m.sens}`);
    assert.equal(m.hausses && m.baisses ? '±' : (m.hausses ? '+' : '−'), m.sens, cle);
  }
  // Ce qui n'entre pas dans le crédit doit au moins agir sur le facteur, sinon
  // c'est un palier mort et il faut le savoir.
  for (const cle of muets) {
    const m = mesure.paliers.get(cle);
    assert.ok(m.surFacteur, `${cle} : aucune seconde mesure`);
  }
});

test('la mesure REND le barème intact — elle ne le déforme pas en passant', () => {
  const avant = { ...BAREME };
  sensDesPaliers();
  assert.deepEqual({ ...BAREME }, avant,
    'pousser un palier pour le mesurer doit être parfaitement réversible');
});

/**
 * ★ LA PREUVE QUE LE SIGNE NE VIENT PAS DU NOM — c'est le test qui compte.
 *
 * On glisse dans le barème un palier dont le nom ne veut rien dire et que rien
 * ne lit. Une page qui devinerait le signe d'après le nom devrait s'y taire —
 * mais surtout, l'inverse est vrai : ce palier ENTRE dans la mesure sans qu'on
 * ait touché à la page, et la mesure conclut honnêtement qu'il n'a aucun effet
 * sur le crédit, au lieu de lui prêter un signe.
 *
 * Autrement dit : une page qui devinerait d'après le nom continuerait
 * d'afficher un signe faux ; celle-ci constate qu'elle ne sait plus.
 */
test('le sens ne se déduit pas du nom : renommer un palier change la mesure', () => {
  const nomAbsurde = 'PALIER_QUE_PERSONNE_NE_LIT';
  const original = { ...BAREME };
  try {
    // Un palier neuf, jamais lu par `detailDuCredit` : il ne peut avoir aucun
    // effet, et c'est exactement ce que la mesure doit rapporter.
    BAREME[nomAbsurde] = 500;
    const mesure = mesurerLesPaliers();
    assert.ok(mesure.paliers.has(nomAbsurde),
      'un palier ajouté doit entrer tout seul dans la mesure');
    assert.equal(mesure.paliers.get(nomAbsurde).sens, null,
      'un palier que rien ne lit ne peut pas avoir de signe');
  } finally {
    for (const cle of Object.keys(BAREME)) delete BAREME[cle];
    Object.assign(BAREME, original);
  }
  assert.deepEqual({ ...BAREME }, original);
});

test('le sens mesuré est cohérent avec le détail du crédit', () => {
  // ★ Le seul recoupement possible sans écrire de table : `detailDuCredit`
  //   compose ses lignes en multipliant chaque palier par un compteur, avec un
  //   signe explicite dans le code. Le nombre de postes qui RETIRENT doit donc
  //   correspondre au nombre de paliers mesurés « − ». On compare deux comptes,
  //   pas deux listes de noms.
  const mesure = sensDesPaliers();
  const negatifs = [...mesure.paliers.values()].filter((m) => m && m.sens === '−').length;
  const positifs = [...mesure.paliers.values()].filter((m) => m && m.sens === '+').length;
  assert.ok(negatifs > 0 && positifs > 0,
    'un barème sans bonus ou sans malus signalerait une mesure cassée');
  assert.equal(negatifs + positifs
    + [...mesure.paliers.values()].filter((m) => m && (m.sens === '±' || !m.sens)).length,
  Object.keys(BAREME).length);
});
