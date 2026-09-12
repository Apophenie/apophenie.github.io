/** LA MONOTONIE DU CURSEUR — « monter le curseur n'appauvrit jamais la liste ».
 *
 * > « Mon intention est que plus le curseur augmente, plus on élargisse les
 * >   recherches. […] Le seul cas où ça pourrait appauvrir la liste, c'est si
 * >   seules des solutions avec meilleur score saturaient les résultats
 * >   possibles, mais dans ce cas, mieux vaut élargir le nombre de résultats
 * >   pour en faire effectivement un invariant. » (l'auteur)
 *
 * ★ **CES DEUX TESTS SONT `todo`, ET C'EST UNE LACUNE MESURÉE, PAS UN OUBLI.**
 *   L'invariant est violé aujourd'hui, la CAUSE est établie, et le correctif
 *   attend un arbitrage parce qu'il déplace le cran 0 (voir plus bas).
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
 * ⚠️ **POURQUOI IL N'EST PAS APPLIQUÉ** : il déplace le CRAN 0 — sept saisies
 *   sur vingt changent (treize voies ajoutées, treize retirées ; `zz` et `Wok`
 *   en perdent une nette), et `hope-hope-hope.fr → 666`, qui est dans
 *   l'instantané, bouge. Ce n'est donc pas un correctif, c'est un arbitrage :
 *   il appartient à l'auteur de dire si la monotonie vaut ce déplacement.
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

test('★ monotonie — une voie trouvée à un cran reste trouvée au cran suivant', {
  todo: 'violé : la promotion dans la réserve de qualité coûte sa place — voir le pavé',
}, () => {
  for (const [saisie, cible, bas, haut] of [['Jim', '666', 0, 1], ['Sarah Kerrigan', '666', 2, 3]]) {
    const liste = (fouille) => moteur.resoudre(saisie, { cible, fouille }).approches.map(programme);
    const avant = liste(bas);
    const apres = liste(haut);
    const perdues = avant.filter((p) => !apres.includes(p));
    assert.deepEqual(perdues, [],
      `${saisie} → ${cible} : le cran ${haut} perd ce que le cran ${bas} avait trouvé`);
  }
});

test('★ monotonie — la sélection à K+1 places contient celle à K', {
  todo: 'violé : la composition des files change avec la largeur — voir le pavé',
}, () => {
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
