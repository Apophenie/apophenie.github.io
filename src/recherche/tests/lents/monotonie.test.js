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
 * ★ **AUCUNE BAISSE DE QUALITÉ — la liste du cran n est l'UNION des
 *   sélections des crans 0 à n.** Chaque cran sélectionne seul, sur ses
 *   candidats, avec son quota et ses places ; les voies du cran inférieur
 *   s'ajoutent sans rien lui prendre, et la liste s'allonge d'autant. C'est la
 *   règle de l'auteur : « mieux vaut élargir le nombre de résultats pour en
 *   faire effectivement un invariant ».
 *
 *   ⚠️ Trois constructions l'ont précédée, mesurées crans 0 à 5 sur les sept
 *   couples, et toutes baissaient la qualité sur « hope-hope-hope.fr » :
 *   garder puis compléter les places (21 baisses — les reprises épuisaient
 *   places et quota, `fl+m14+mpf` à 7 084 sortait au cran 5) ; sélection
 *   ordinaire puis reprises manquantes, sur une réserve où les candidats des
 *   crans inférieurs concouraient (15 baisses — ce sont ces candidats portés
 *   qui prenaient les places du MMR) ; reprises hors quota (27). Le test
 *   « aucune baisse » ci-dessous compare la liste cumulative à la liste que
 *   le cran sélectionne seul (`creerMoteur(…, { cumulatif: false })`).
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
     voies composées, tient aussi pour les segments.
   ★ SA SAISIE A CHANGÉ : depuis que les segments ne recopient plus la saisie,
     « https://reinfocovid.fr/ » n'a plus aucune voie vers la phrase, et le test
     serait vert sur des listes vides. « Reinfocovid, désinformation garantie »
     en a (`tests/lents/cible-phrase.test.js`). */
test('★ monotonie — une phrase visée en segments ne perd rien du cran 0 au cran 3', () => {
  const saisie = 'Reinfocovid, désinformation garantie';
  assert.ok(moteur.resoudre(saisie, { cible: "C'est de la merde !" }).approches.length >= 1,
    'une liste vide rendrait ce test muet');
  assert.deepEqual(pertesDuBalayage([[saisie, "C'est de la merde !"]], 0, 3), []);
});

/* ★ AUCUNE BAISSE : ce que le cran sélectionne seul est dans sa liste
     cumulative, voie pour voie — là où les trois constructions précédentes
     chassaient des voies à 4 914, 7 084 et 6 803. */
test('★ monotonie — aucune baisse : la liste cumulative contient ce que le cran sélectionne seul', () => {
  const seul = creerMoteur(catalogue, { filetTemporel: false, cumulatif: false });
  const manquantes = [];
  for (const [saisie, cible] of [['hope-hope-hope.fr', '666'], ['Donald Trump', '111']]) {
    for (let f = 0; f <= 5; f++) {
      const cumul = moteur.resoudre(saisie, { cible, fouille: f }).approches.map(programme);
      for (const a of seul.resoudre(saisie, { cible, fouille: f }).approches) {
        if (!cumul.includes(programme(a))) manquantes.push(`${saisie} → ${cible}, cran ${f} : ${programme(a)} (${a.score})`);
      }
    }
  }
  assert.deepEqual(manquantes, []);
});

/* ★ AUCUNE BAISSE PAR LA RAMPE DES RETOUCHES : à cran égal, la liste avec la
     rampe contient celle des anciennes gardes (six mots, quatre vecteurs), voie
     pour voie. Rouge sur la rampe simple — mesuré : `fl+mtjc+mtri` (4 854)
     sortait de « Donald Trump » visant 111 au cran 3, `fc+mt9+cmo,…` (3 547)
     de « Sarah Kerrigan » au cran 3, `fl+masc+mab` (3 596) de « Emmanuel
     Macron » au cran 2 — ; vert par la double sélection (`index.js ›
     finaliser`). */
test('★ monotonie — la rampe des retouches n’ôte rien à la liste des anciennes gardes', () => {
  const fixe = creerMoteur(catalogue, { filetTemporel: false, rampeDesRetouches: false });
  const manquantes = [];
  for (const [saisie, cible, cran] of [
    ['Donald Trump', '111', 3], ['Sarah Kerrigan', '666', 3], ['Emmanuel Macron', '666', 2],
  ]) {
    const avecRampe = moteur.resoudre(saisie, { cible, fouille: cran }).approches.map(programme);
    for (const a of fixe.resoudre(saisie, { cible, fouille: cran }).approches) {
      if (!avecRampe.includes(programme(a))) manquantes.push(`${saisie} → ${cible}, cran ${cran} : ${programme(a)} (${a.score})`);
    }
  }
  assert.deepEqual(manquantes, []);
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
