/** LA MONOTONIE DU CURSEUR — « monter le curseur n'appauvrit jamais la liste ».
 *
 * > « Mon intention est que plus le curseur augmente, plus on élargisse les
 * >   recherches. […] Le seul cas où ça pourrait appauvrir la liste, c'est si
 * >   seules des solutions avec meilleur score saturaient les résultats
 * >   possibles, mais dans ce cas, mieux vaut élargir le nombre de résultats
 * >   pour en faire effectivement un invariant. » (l'auteur)
 *
 * ★ **LA PREMIÈRE CAUSE EST RÉPARÉE, LA SECONDE NE L'EST PAS ENCORE.** Ces
 *   tests étaient `todo` et échouaient sur le code d'avant — vérifié : « le cran
 *   1 perd ce que le cran 0 avait trouvé », « 8 places → 10 places, on perd ».
 *   Le correctif les rend verts, et l'auteur l'a arbitré : « applique le
 *   correctif partout, cran 0 compris ». Reste la transition 2 → 3 de « Sarah
 *   Kerrigan », qui relève d'une autre cause et garde son `todo`.
 *
 * ── CE QUI EST PROUVÉ ───────────────────────────────────────────────────────
 *
 * ★ **La perte n'est PAS une saturation.** Sur « Jim » visant 666, le cran 1
 *   perd un programme qui vaut **2 803** alors qu'il garde des voies à 1 912 ;
 *   sur « Sarah Kerrigan », le cran 3 perd deux CONVERGENCE à 3 432 et 3 122
 *   alors qu'il garde des voies à 1 363. Élargir la liste ne les ramènerait
 *   pas : elles ne sont pas évincées du classement, elles ne sont plus
 *   CONSTRUITES.
 *
 * ★ **La cause, pour le premier cas** : la réserve de qualité se dimensionne
 *   sur le plafond (`score-intermediaire.js › reserveDeQualite`), donc elle
 *   grandit avec le cran. Un candidat qui entrait par la QUANTITÉ à la largeur
 *   d'avant s'y trouve PROMU à la largeur suivante — et `parLaQuantite`
 *   l'excluait alors. Les sièges de qualité étant rares (un sur quatre au
 *   défaut), le promu est servi bien plus tard et tombe hors de la tête.
 *   Mesuré : `fr17+tca+mz26+mdc3`, cinquième de la quantité et RETENU à plafond
 *   16, devient cinquième de la réserve à plafond 20 et DISPARAÎT.
 *
 * ★ **Le correctif tient**, et il est écrit : ne plus retirer un candidat de la
 *   quantité parce qu'il est réservé, et sauter ce qui est déjà pris. Mesuré
 *   dans un worktree jetable : la sélection redevient monotone sur « Jim »,
 *   « Sarah Kerrigan » et « hope », et « Jim → 666 » ne perd plus rien du cran
 *   0 au cran 1.
 *
 * ★ **IL EST APPLIQUÉ, et il a déplacé le CRAN 0** — l'auteur l'a accepté en
 *   connaissance de cause. Le détail nominatif, couple par couple, est écrit
 *   dans le message du commit qui l'applique ; l'instantané des cibles
 *   chiffrées a été régénéré dans le même mouvement.
 *
 * ⚠️ **ET IL NE SUFFIT PAS** : les deux CONVERGENCE perdues par « Sarah
 *   Kerrigan » entre les crans 2 et 3 ne reviennent pas. Leur cause est un
 *   cran plus loin — les trios de manières distinctes se choisissent sur des
 *   vecteurs qui, eux, ont changé.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { vecteursDeSix } from '../../assemblage.js';
import { operateursPourCible } from '../../bfs.js';
import { normaliserCible } from '../../cible.js';
import { catalogue } from '../_catalogue.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });
/** Le programme d'une voie, marqueur de cran retiré : c'est lui qu'on suit. */
const programme = (a) => a.url.split('#')[1].replace(/(^|!)f\d+!/, '$1');

/** Ce que le cran `haut` a perdu de ce que le cran `bas` avait trouvé. */
function perduesEntre(saisie, cible, bas, haut) {
  const liste = (fouille) => moteur.resoudre(saisie, { cible, fouille }).approches.map(programme);
  const apres = liste(haut);
  return liste(bas).filter((p) => !apres.includes(p));
}

test('★ monotonie — une voie trouvée au cran 0 reste trouvée au cran 1', () => {
  // La transition qui a PROUVÉ la première cause : `fr17+tca+mz26+mdc3`, promu
  // dans la réserve de qualité, y perdait sa place.
  assert.deepEqual(perduesEntre('Jim', '666', 0, 1), [],
    'Jim → 666 : le cran 1 perd ce que le cran 0 avait trouvé');
});

test('★ monotonie — une voie trouvée au cran 2 reste trouvée au cran 3', {
  todo: 'seconde cause : les trios de CONVERGENCE se choisissent sur des vecteurs qui ont changé',
}, () => {
  assert.deepEqual(perduesEntre('Sarah Kerrigan', '666', 2, 3), [],
    'Sarah Kerrigan → 666 : le cran 3 perd ce que le cran 2 avait trouvé');
});

test('★ monotonie — la sélection à K+1 places contient celle à K', () => {
  const cbl = normaliserCible('666');
  const ops = operateursPourCible(catalogue, cbl);
  for (const texte of ['Jim', 'Sarah Kerrigan', 'hope']) {
    const tete = (k) => vecteursDeSix(texte, ops, 3, k * 2, cbl, {})
      .slice(0, k).map((c) => c.ops.map((o) => o.code).join('+'));
    for (const [k, kk] of [[8, 10], [10, 12], [12, 14]]) {
      const perdues = tete(k).filter((p) => !tete(kk).includes(p));
      assert.deepEqual(perdues, [], `« ${texte} » : ${k} places → ${kk} places, on perd`);
    }
  }
});
