/** LA MONOTONIE DU CURSEUR — « monter le curseur n'appauvrit jamais la liste ».
 *
 * > « Mon intention est que plus le curseur augmente, plus on élargisse les
 * >   recherches. […] Le seul cas où ça pourrait appauvrir la liste, c'est si
 * >   seules des solutions avec meilleur score saturaient les résultats
 * >   possibles, mais dans ce cas, mieux vaut élargir le nombre de résultats
 * >   pour en faire effectivement un invariant. » (l'auteur)
 *
 * ★ **L'INVARIANT TIENT PAR CONSTRUCTION : LA RECHERCHE EST CUMULATIVE.**
 *   Le cran n reprend les candidats des crans inférieurs et sa sélection part
 *   des voies retenues au cran n−1 (`index.js › deroulerResolution`). L'auteur
 *   l'a choisie au prix mesuré (×1,8 à ×2,1 au cran 2, ×3 à ×4,3 au cran 5,
 *   avant réemploi). Vérifié rouge sur le code d'avant : 27 voies perdues du
 *   cran 0 au cran 5 sur les sept couples du balayage, dont les deux
 *   CONVERGENCE de « Sarah Kerrigan » entre les crans 2 et 3.
 *
 * ── POURQUOI AUCUN CORRECTIF LOCAL N'A SUFFI — mesuré avant de choisir ──────
 *
 * ★ **Les CANDIDATS eux-mêmes n'étaient pas emboîtés.** Places illimitées et
 *   quota levé, donc SANS sélection, les crans 0 à 3 perdaient encore 41
 *   programmes sur neuf transitions. Les listes de trois chemins par manière
 *   changent d'un cran à l'autre (au cran 3, `jeu` remplace `msfr` par
 *   `msen`, `geometrie` et `code` voient entrer un nouveau venu), et ce ne sont
 *   pas que des trios : « hope-hope-hope.fr » perd des assemblages à plusieurs
 *   portées.
 * ★ **Les quatre leviers locaux, mesurés sur 21 transitions (25 pertes au
 *   départ)** : trios en ordre stable et croissant, 27 à 30 ; toutes les
 *   combinaisons de trios, 26 plafonnées, 101 sans plafond ; quota compté sur
 *   toutes les parties, 24, ou propre aux convergences, 30 ; places doublées,
 *   28 ; pénalité de redondance figée, 25 ; têtes classées par le score final,
 *   25 — et cette dernière ôte deux voies à « Wok » au cran 0 sans ramener
 *   celle à 4 791.
 *
 * ⚠️ **CE QUE LA CUMULATION COÛTE EN QUALITÉ, et où.** Mesuré crans 0 à 5 sur
 *   les sept couples : 25 listes sur 42 bougent au-dessus du cran 0, et 21
 *   substitutions baissent la qualité — TOUTES sur « hope-hope-hope.fr ». Les
 *   candidats des crans inférieurs entrent en concurrence dans le MMR et
 *   épuisent des quotas : `0:ffr4;fl+m14+meg` (4 914) sort aux crans 1 et 2,
 *   `fl+m14+mpf` (7 084) et `fl+m14+meg` (6 803) au cran 5. Deux autres façons
 *   de garder ont été mesurées : ajouter les gardées à la sélection ordinaire
 *   (15 baisses, mais la liste dépasse ses places aux crans 1 à 3) et les
 *   sortir du quota (27 baisses). La retenue est la seule qui tient les places.
 *   La tête de « hope » aux crans 3 à 5 reste celle du cran 2 (2 442) au lieu
 *   de `fl+m14` (7 843), qui reste dans la liste.
 *
 *   Le récit qui suit est celui des deux causes telles qu'elles avaient été
 *   prouvées ; la cumulation les rend inoffensives sans les supprimer.
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
 * ★ **CE QUE LE CORRECTIF A FAIT À « Wok → 666 », et pourquoi.** La seule
 *   substitution qui baissait la qualité — `fatb+mz26+mdc3` (4 791) sortie,
 *   `fc+ma1+mdc3` (2 852) entrée — a été tracée siège par siège, à largeur
 *   ÉGALE (la tête de huit vecteurs du fragment « Wok ») :
 *
 *   · ce n'est PAS la capacité de la liste : Wok publie huit voies pour vingt
 *     places ;
 *   · ce n'est PAS un défaut du correctif, ni des doublons (supposé, puis
 *     réfuté : les huit sièges sont huit vecteurs distincts une fois
 *     canonicalisés) ;
 *   · c'est que la tête respecte ENFIN l'ordre de quantité. `fatb+mz26+mdc3`
 *     n'y est que DIXIÈME ; il n'y entrait avant que parce que l'ancien défaut
 *     retirait les quatre candidats réservés de la quantité, libérant des
 *     sièges. Aujourd'hui `fc+ma1+mdc3` (5ᵉ en quantité) et `tca+ma1+mdc3`
 *     (6ᵉ) occupent leur rang.
 *
 *   Le vrai sujet est donc en amont : la tête se classe par COMPTE de chiffres
 *   utiles, pas par le score final — d'où une voie à 2 852 devant une voie à
 *   4 791. C'est le même mal que celui des trios : des fenêtres de
 *   présélection classées sur un critère qui n'est pas celui de la liste.
 *
 * ⚠️ **LA SECONDE CAUSE, PROUVÉE — ET PAS RÉPARABLE SUR PLACE.** Les deux
 *   CONVERGENCE perdues par « Sarah Kerrigan » entre les crans 2 et 3
 *   (`fc+nd, fl+mt9+cs+prn, fl+mboc+cs` et `fd+nc, fv+mt9+cp+prn,
 *   fc+m7F+cs+prn`) ne manquent PAS de matière : au cran 3, leurs six chemins
 *   sont tous encore dans les chemins bruts (rangs 1/32/77 et 2/102/140).
 *   C'est l'assemblage GLOUTON des trios qui les recombine (`assemblage.js ›
 *   convergences`) :
 *
 *   · il prend, pour chaque case, « la première manière libre » dans l'ordre
 *     d'APPARITION des manières — or la manière `jeu` saute de la 6ᵉ à la 2ᵉ
 *     place au cran 3, parce qu'un chemin `fi+msen+cs` arrive plus tôt ;
 *   · il garde, par manière et par chiffre, les TROIS premiers chemins — et
 *     `code` comme `geometrie` voient un nouveau venu passer devant.
 *
 *   Deux rotations qui se composent : au cran 2 il rendait exactement ces deux
 *   trios, au cran 3 il en rend trois autres, faits des mêmes chemins autrement
 *   appariés.
 *
 *   ⚠️ Un correctif local a été MESURÉ et écarté : énumérer les trios dans un
 *     ordre canonique au-delà du cran 0. Il ne rend pas les deux voies (la
 *     perte glisse vers la sélection finale, inondée : « Jim » 8 → 30 voies au
 *     cran 1), et il CRÉE des violations là où il n'y en avait plus — « Jim »
 *     0 → 1 perd de nouveau une voie, « hope-hope-hope.fr » 0 → 1 en perd
 *     quatre. La seconde cause touche donc à la capacité de la sélection, pas
 *     seulement à l'étage des trios ; c'est un chantier en soi.
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

test('★ monotonie — une voie trouvée au cran 2 reste trouvée au cran 3', () => {
  assert.deepEqual(perduesEntre('Sarah Kerrigan', '666', 2, 3), [],
    'Sarah Kerrigan → 666 : le cran 3 perd ce que le cran 2 avait trouvé');
});

/** Les sept couples du balayage : ceux où la mesure avait trouvé des pertes. */
const COUPLES_DU_BALAYAGE = [
  ['Jim', '666'], ['Sarah Kerrigan', '666'], ['hope-hope-hope.fr', '666'], ['Wok', '666'],
  ['zz', '666'], ['Sarah Kerrigan', '13'], ['Donald Trump', '111'],
];

/** Ce qui se perd d'un cran au suivant, de `bas` à `haut`, nommé. */
function pertesDuBalayage(couples, bas, haut) {
  const pertes = [];
  for (const [saisie, cible] of couples) {
    let avant = null;
    for (let f = bas; f <= haut; f++) {
      const ici = moteur.resoudre(saisie, { cible, fouille: f }).approches.map(programme);
      if (avant) for (const p of avant) if (!ici.includes(p)) pertes.push(`${saisie} → ${cible}, cran ${f - 1} → ${f} : ${p}`);
      avant = ici;
    }
  }
  return pertes;
}

test('★ monotonie — du cran 0 au cran 5, aucune voie perdue sur les sept couples', () => {
  assert.deepEqual(pertesDuBalayage(COUPLES_DU_BALAYAGE, 0, 5), []);
});

/* ⚠️ Ce test-ci était DÉJÀ vert avant la cumulation : cette phrase ne perdait
     rien du cran 0 au cran 3. Il ne prouve donc pas la réparation — il garde
     que la cumulation, qui passe par la liste fusionnée d'un texte et par ses
     voies composées, tient aussi pour les segments. */
test('★ monotonie — une phrase visée en segments ne perd rien du cran 0 au cran 3', () => {
  assert.deepEqual(pertesDuBalayage([['https://reinfocovid.fr/', "C'est de la merde !"]], 0, 3), []);
});

/* ⚠️ Vert avant la cumulation aussi, et pour cause : il n'y avait pas de mémo
     des crans. C'est lui qu'il garde désormais — une montée cran par cran ne
     doit pas rendre une autre liste qu'un calcul direct. */
test('★ monotonie — le cran n direct rend la liste de la montée cran par cran', () => {
  const direct = creerMoteur(catalogue, { filetTemporel: false });
  const signature = (r) => r.approches.map((a) => `${a.rang}:${a.url}:${a.score}:${a.suggestion ?? ''}`);
  for (const [saisie, cible, cran] of [['Sarah Kerrigan', '666', 3], ['https://reinfocovid.fr/', "C'est de la merde !", 2]]) {
    for (let f = 0; f < cran; f++) moteur.resoudre(saisie, { cible, fouille: f });
    assert.deepEqual(
      signature(direct.resoudre(saisie, { cible, fouille: cran })),
      signature(moteur.resoudre(saisie, { cible, fouille: cran })),
      `${saisie} → ${cible} au cran ${cran}`,
    );
  }
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
