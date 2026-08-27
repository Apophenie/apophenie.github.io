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
  TERMES_IDEAUX,
} from './pages/debug.js';
import { CATALOGUE, appliquer, PAR_CODE } from '../moteur/catalogue.js';
import { depuisSaisie, signature } from '../moteur/etat.js';
import { creerMoteur } from '../recherche/index.js';
import { BAREME, NATURE, FICELLES, detailDuCredit } from '../recherche/elegance.js';

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

/**
 * ★ « ELLE NE MONTRE PAS L'ÉLÉMENT ET RIEN QUE LUI » — le grief, transformé en
 * mesure.
 *
 * Un exemple qui rend la même chose qu'un opérateur voisin ne démontre rien :
 * le spectateur ne peut pas savoir lequel des deux il regarde. On exige donc
 * que l'exemple SÉPARE l'opérateur de ses semblables — les opérateurs actifs de
 * même signature —, et on l'exige en masse, pas au cas par cas.
 *
 * ⚠️ MESURÉ des deux côtés du changement : la règle « le premier état venu à la
 * bonne profondeur » séparait tous les semblables pour 80 opérateurs sur 99
 * (95,9 % de couverture moyenne) ; la règle « le plus discriminant, puis le
 * plus lisible » en sépare 91 (99,1 %). Le seuil est posé sous la mesure, pas
 * dessus : il attrape la régression, il ne fige pas le chiffre.
 */
test('★ l’exemple SÉPARE l’opérateur de ses semblables', () => {
  const actifs = CATALOGUE.filter((op) => !op.deprecated && !op.isJoker);
  const confondus = [];
  let total = 0;
  let couverture = 0;
  for (const op of actifs) {
    const prog = programmePour(op);
    if (!prog) continue;
    // On rejoue l'approche pour retrouver l'état d'entrée de l'opérateur.
    let etat = depuisSaisie(prog.saisie);
    for (const code of prog.codes.slice(0, -1)) etat = appliquer(PAR_CODE.get(code), etat);
    const mien = signature(appliquer(op, etat));
    const rivaux = actifs.filter((a) => a.from === op.from && a.to === op.to && a.code !== op.code);
    const separes = rivaux.filter((a) => {
      const sien = appliquer(a, etat);
      return sien === null || signature(sien) !== mien;
    }).length;

    // Le compte annoncé par la page est celui qu'on retrouve à la main.
    assert.equal(prog.distingue, separes, `${op.code} : le compte annoncé ne se retrouve pas`);
    assert.equal(prog.semblables, rivaux.length, `${op.code} : le nombre de semblables ne colle pas`);

    total++;
    couverture += rivaux.length ? separes / rivaux.length : 1;
    if (rivaux.length && separes < rivaux.length) confondus.push(`${op.code} ${separes}/${rivaux.length}`);
  }
  assert.ok(total - confondus.length >= 88,
    `${total - confondus.length} exemples seulement séparent TOUS les semblables `
    + `(88 attendus au moins) — restent : ${confondus.join(', ')}`);
  assert.ok(couverture / total >= 0.98,
    `couverture moyenne ${(100 * couverture / total).toFixed(1)} %, 98 % attendus`);
});

/**
 * ★ ET IL EN MONTRE ASSEZ POUR QUE ÇA SE VOIE.
 *
 * « c.maxMoinsMin, il te faudra au moins trois nombres différents, pour qu'on
 * comprenne la différence avec une soustraction » (l'auteur). La règle vaut
 * pour tous les opérateurs qui consomment une liste : à un terme, une addition
 * ne s'additionne pas ; à deux, `max − min` et la soustraction ne diffèrent que
 * par un signe.
 *
 * On ne l'exige que là où la discrimination ne réclame PAS davantage de
 * matière : `m.plusFrequent` veut une fréquence, `m.troisSixDAffilee` veut
 * trois 6 d'affilée, et leurs exemples sont légitimement plus longs. Le test
 * porte donc sur les opérateurs qui rendent un seul nombre depuis une liste —
 * ceux-là, précisément, que l'auteur a nommés.
 */
test('★ un opérateur qui réduit une liste la reçoit avec assez de termes', () => {
  // La famille se lit sur les signatures, pas sur une liste de codes : ce sont
  // les opérateurs qui prennent PLUSIEURS nombres et n'en rendent qu'un.
  const pluriel = CATALOGUE.find((op) => op.code === 'cs');
  assert.ok(pluriel, 'l’addition doit exister pour donner sa signature à la famille');
  const reducteurs = CATALOGUE.filter((op) => !op.deprecated && !op.isJoker
    && op.from === pluriel.from && op.to === pluriel.to);
  assert.ok(reducteurs.length >= 8, 'la famille visée par l’auteur doit être peuplée');
  for (const op of reducteurs) {
    const prog = programmePour(op);
    assert.ok(prog, `${op.code} : aucun exemple`);
    let etat = depuisSaisie(prog.saisie);
    for (const code of prog.codes.slice(0, -1)) etat = appliquer(PAR_CODE.get(code), etat);
    const distincts = new Set(etat.valeur.map((x) => String(x))).size;
    assert.ok(distincts >= TERMES_IDEAUX,
      `${op.code} : l’exemple ne montre que ${distincts} terme(s) distinct(s) `
      + `(${JSON.stringify(etat.valeur)}) — ${TERMES_IDEAUX} attendus au moins`);
  }
});

test('★ le signe affiché est celui que le barème DÉCLARE, pour chaque palier', () => {
  /* La page lisait autrefois le signe en MESURANT — pousser un palier, regarder
     où va le crédit —, parce que rien dans `BAREME` ne le disait. `NATURE` le
     déclare maintenant, et `elegance.test.js` recoupe cette déclaration avec ce
     que le crédit applique. La page se contente donc de lire.

     Ce test garde la seule chose qui compte ici : qu'elle lise VRAIMENT, poste
     par poste, sans en oublier ni en inventer. */
  const vue = sensDesPaliers();
  assert.equal(vue.mesurable, true, vue.raison || '');
  const SIGNE = { 1: '+', '-1': '−', 0: '·' };
  for (const cle of Object.keys(BAREME)) {
    const lu = vue.paliers.get(cle);
    assert.ok(lu, `${cle} : aucun signe rendu`);
    assert.equal(lu.sens, SIGNE[NATURE[cle].sens],
      `${cle} : la page affiche « ${lu.sens} » là où le barème déclare ${NATURE[cle].sens}`);
    assert.equal(lu.famille, NATURE[cle].famille, `${cle} : famille divergente`);
  }
  assert.equal(vue.paliers.size, Object.keys(BAREME).length,
    'la page rend plus ou moins de paliers que le barème n’en porte');
});

test('★★ l’instrument de mesure survit, et confirme la déclaration', () => {
  /* ★ LE CONTRÔLE CROISÉ, ET POURQUOI IL RESTE ALORS QU'IL NE SERT PLUS AU RENDU.

     `NATURE` est une DÉCLARATION : quelqu'un l'a écrite à la main, et une
     déclaration peut mentir. `mesurerLesPaliers` ne lit aucun nom — elle pousse
     chaque palier sur des bilans réels et observe où va le crédit. C'est le seul
     juge qui ne puisse pas se tromper de la même façon que la déclaration.

     Il a quitté le chemin de rendu parce qu'il coûtait plus d'une seconde de
     processeur au chargement de la page. Il n'a pas quitté les tests, où son
     coût est acceptable et son verdict irremplaçable. */
  const mesure = mesurerLesPaliers();
  assert.equal(mesure.mesurable, true, mesure.raison || '');
  assert.ok(mesure.temoins > 1, 'un seul bilan témoin ne prouverait rien');

  let recoupes = 0;
  for (const [cle, m] of mesure.paliers) {
    if (!m || !m.sens || m.sens === '±') continue;   // non observable sur ces témoins
    /* ★ LES RÉGLAGES SONT HORS DU RECOUPEMENT, ET LA RAISON MÉRITE D'ÊTRE SUE.

       L'instrument pousse un palier et regarde où va le crédit. Il ne sait donc
       pas distinguer un BONUS d'un PLAFOND SUR UN BONUS : relever
       `SIX_SURNUMERAIRE_MAX` laisse compter davantage de 6 surnuméraires, donc
       le crédit monte — l'instrument lit « + » là où la déclaration dit « ni
       bonus ni malus, c'est une borne », et les deux ont raison.

       Ce n'est pas une déclaration qui ment, c'est une question que la mesure ne
       sait pas poser. On ne recoupe donc que ce qu'elle sait juger : les postes
       qui ajoutent ou retranchent des points. */
    if (NATURE[cle].sens === 0) continue;
    const attendu = NATURE[cle].sens === 1 ? '+' : '−';
    assert.equal(m.sens, attendu,
      `${cle} : mesuré « ${m.sens} », déclaré « ${attendu} » — la déclaration ment`);
    recoupes++;
  }
  assert.ok(recoupes >= 8,
    `seuls ${recoupes} paliers ont pu être recoupés : les témoins n’en déclenchent pas assez`);
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

test('★ chaque ligne du détail du crédit porte le signe que NATURE déclare', () => {
  /* Le recoupement le plus direct qui soit : `detailDuCredit` compose les lignes
     réellement portées au crédit, chacune avec ses points SIGNÉS. Si une ligne
     retirait des points là où `NATURE` annonce un bonus, la page mentirait à qui
     vient précisément y chercher la vérité.

     ⚠ On ne compte pas des postes, on compare ligne à ligne : un décompte
     global se satisferait de deux erreurs qui se compensent. */
  const m = creerMoteur(CATALOGUE, { filetTemporel: false });
  let vues = 0;
  for (const a of m.resoudre('hope-hope-hope.fr').approches.slice(0, 6)) {
    for (const l of detailDuCredit(a.bilan)) {
      const n = NATURE[l.cle];
      assert.ok(n, `${l.cle} : ligne portée au crédit sans être déclarée dans NATURE`);
      if (l.points === 0) continue;
      assert.equal(Math.sign(l.points), n.sens,
        `${l.cle} : ${l.points} points portés, ${n.sens} déclaré`);
      vues++;
    }
  }
  assert.ok(vues >= 10, `seules ${vues} lignes signées observées : le témoin est trop pauvre`);
});
