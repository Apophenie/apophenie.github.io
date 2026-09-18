/**
 * ★ **LA RÉSERVE PILOTÉE PAR LES CURSEURS, SUR LE CHEMIN RÉEL.**
 *
 * > « Idéalement, c'est les curseurs qui priorisent quelles voies méritent
 * >   d'être finalisées […]. Si l'exhaustivité prime au score, alors les voies
 * >   recherchées sont celles qui maximisent l'exhaustivité. Si la simplicité
 * >   prime au score, alors les voies courtes/simples sont celles qui sont
 * >   recherchées en priorité… » (l'auteur)
 *
 * Chaque test lance une RECHERCHE — `creerMoteur().resoudre` — et regarde si la
 * voie est dans la liste. C'est la leçon qui a fait écrire ce fichier : deux
 * livraisons ont été déclarées faites après une vérification qui portait à côté
 * du chemin réel, sur une fonction appelée isolément. `score-intermediaire.test.js`
 * tient les fonctions ; ceci tient ce que le visiteur voit.
 *
 * ★ Chacune des assertions « la voie entre » a été vérifiée FAUSSE sur l'arbre
 *   d'avant (la réserve aveugle aux curseurs) : ces tests départagent l'avant et
 *   l'après, ils ne constatent pas seulement l'état du jour.
 *
 * Le cas témoin : « Le jardin sur le rocher de la maison ». `fart+fprp+tm+mlm`
 * — sans articles ni préposition, « jardin rocher maison », `6 6 6` — vaut
 * 7 317 points au barème, et n'était présentée au barème à aucun des crans 0 à 2.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../../index.js';
import { catalogue } from '../_catalogue.js';

// Filet temporel débranché : ces tests comparent des listes, et une liste
// écourtée à l'horloge ne se compare à rien (§4.4).
const moteur = creerMoteur(catalogue, { filetTemporel: false });
const JARDIN = 'Le jardin sur le rocher de la maison';
const GRAMMATICALE = 'fart+fprp+tm+mlm';
const codes = (r) => r.approches.map((a) => a.codes);

/**
 * ⚠️ **AU DÉFAUT, LA VOIE N'ENTRE PAS** — et ce n'est pas un oubli, c'est une
 *   information. Au défaut la réserve garde son pré-tri historique au bit près
 *   (`assemblage.js › vecteursDeSix`, et pourquoi : rangée par la note à parts
 *   égales, elle retirait `tca+mt9+mpf` de la liste de `Macron`).
 */
test('★ défaut — rien ne bouge : la voie grammaticale reste hors de la liste au cran 0', () => {
  const r = moteur.resoudre(JARDIN, { fouille: 0 });
  assert.ok(!codes(r).includes(GRAMMATICALE),
    'si elle entre au défaut, le pré-tri historique a changé : c’est à l’auteur de le vouloir');
});

/**
 * « Une approche addition uniquement, EN PLUS de `mab`, pas à la place »
 * (l'auteur). Le second élu chassait le premier de ce que l'assemblage garde ;
 * quand les curseurs pilotent la réserve, il ne chasse plus qu'un siège de
 * quantité.
 */
test('★ curseurs personnalisés — les deux voies sans perte sont proposées ensemble', () => {
  const r = moteur.resoudre(JARDIN, { fouille: 0, curseurs: { simplicite: 200 } });
  const liste = codes(r);
  const dit = liste.join('  ');
  /* ★ **LA VOIE SANS PERTE EST DÉSORMAIS HONNÊTE.** C'était `tm+mlm+mab`, une
     absorption. Depuis que la potence `mdc*` n'écrit plus ses zéros de tête
     (décision de l'auteur), `fr1+tsy+mlm+mdc2` écrit `6 6 6` d'un trait, sans
     ficelle ni rien de jeté — et les règles de l'auteur la préfèrent : « le
     moins de ficelles d'abord », « une ficelle qui n'apporte rien n'est pas
     proposée ». Preuve et démonstration : `score-intermediaire.test.js`, où la
     même liste, rendue à l'ancienne potence, retrouve `tm+mlm+mab`. */
  assert.ok(liste.includes('fr1+tsy+mlm+mdc2'), `la voie sans perte : ${dit}`);
  assert.ok(liste.includes('fl+tca+msen+mrdE'), `la voie sans perte par addition : ${dit}`);
  // « Une approche addition uniquement, EN PLUS de `mab`, pas à la place » :
  // l'absorption reste proposée.
  assert.ok(liste.some((c) => c.endsWith('+mab')), `une absorption reste proposée : ${dit}`);
});

/**
 * Le profil de la voie grammaticale, à la note intermédiaire : brièveté 880,
 * exhaustivité 769 (18 lettres lues sur 29, rendement plein), cohérence 827.
 * Elle n'est la meilleure sur aucun axe — `tm+mlm` est plus courte et plus
 * familière, `fl+tca+msen+mrdE` lit tout —, mais elle est la meilleure des
 * voies « équilibrées » : c'est quand le visiteur demande à la fois de
 * l'exhaustivité et de la cohérence qu'elle mérite un siège.
 */
test('★ exhaustivité et cohérence à 150 : la voie grammaticale est finalisée dès le cran 0', () => {
  const r = moteur.resoudre(JARDIN, { fouille: 0, curseurs: { exhaustivite: 150, coherence: 150 } });
  assert.ok(codes(r).includes(GRAMMATICALE), `${GRAMMATICALE} absente : ${codes(r).join('  ')}`);
  // Le même appel, deux fois : la réserve pilotée reste déterministe (§4.4).
  const bis = moteur.resoudre(JARDIN, { fouille: 0, curseurs: { exhaustivite: 150, coherence: 150 } });
  assert.deepEqual(codes(bis), codes(r));
});

/**
 * ⚠️ **À SIMPLICITÉ 200, CE N'EST PAS ELLE QUI ENTRE**, et c'est ce que la
 *   phrase de l'auteur demande : « les voies courtes/simples sont recherchées
 *   en priorité ». Elle compte quatre gestes (3,5 facturés) ; quatre voies à
 *   deux gestes passent devant elle dans la réserve, qui ne tient que deux
 *   sièges dans ce que l'assemblage garde.
 */
test('★ simplicité à 200 : la voie la plus courte est finalisée, la voie à quatre gestes ne l’est pas', () => {
  const r = moteur.resoudre(JARDIN, { fouille: 0, curseurs: { simplicite: 200 } });
  assert.ok(codes(r).includes('tm+mlm'), `« la longueur des mots », deux gestes : ${codes(r).join('  ')}`);
  assert.ok(!codes(r).includes(GRAMMATICALE));
});

test('★ exhaustivité à 200 : la tête lit toute la saisie, et la voie qui écarte onze lettres n’est pas finalisée', () => {
  const r = moteur.resoudre(JARDIN, { fouille: 0, curseurs: { exhaustivite: 200 } });
  for (const a of r.approches.slice(0, 2)) {
    assert.equal(a.criteres.brut, 1000, `${a.codes} devrait lire toute la saisie`);
  }
  assert.ok(!codes(r).includes(GRAMMATICALE),
    'une suppression élégante reste une suppression : à 200, elle cède son siège à celles qui lisent tout');
});

/**
 * ★ **« LOUIS FOUCHÉ » : LA VOIE SIMPLE RESTE EN HAUT DE LA LISTE.**
 *
 * > « À première vue je n'y vois pas d'inconvénient [à ce que `mas` et `mu8`
 * >   bousculent la liste], mais que fl+m14 sorte est dérangeant. Une voie
 * >   aussi simple est précieuse. » (l'autrice, 18 septembre 2026)
 *
 * Deux causes, mesurées, et une règle générale pour chacune :
 *  1. la voie n'était plus FABRIQUÉE — `mas` et `mu8` l'avaient poussée du 5ᵉ
 *     au 23ᵉ rang de la fenêtre du fragment entier. Le troisième élu
 *     (`assemblage.js › vecteursDeSix`, la voie courte qui lit tout) la rend ;
 *  2. fabriquée, elle restait hors de la liste : le quota du quatorze segments
 *     allait à `tca+m14` et `tca+mtal+m14`, que le moteur préfère et que la liste
 *     classe derrière elle au global (592 et 584 contre 647). Une méthode est
 *     désormais représentée par ses voies les mieux notées au global
 *     (`score.js › representerParLesMieuxNotees`).
 * Ce test tient le résultat, pas les moyens : `fl+tca+m14` dans les trois
 * premières places, et devant l'absorption en produits.
 */
test('★ « Louis Fouché » — `fl+tca+m14` reste dans les trois premières places', () => {
  const r = moteur.resoudre('Louis Fouché', { fouille: 0 });
  const liste = codes(r);
  const rang = liste.indexOf('fl+tca+m14');
  assert.ok(rang >= 0 && rang < 3, `rang ${rang + 1} : ${liste.join('  ')}`);
  const absorption = liste.indexOf('tca+mu8+mabx');
  assert.ok(absorption < 0 || absorption > rang, `l’absorption passe devant : ${liste.join('  ')}`);
});
