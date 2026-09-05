/**
 * Les tables de tracé — la pièce délicate (CONTRACTS §0.3, §2.4).
 *
 * Rappel du principe : rien n'est saisi à la main, tout est dérivé des tracés
 * vectoriels que le moteur visuel dessine. Ces tests vérifient donc à la fois
 * les comptages, les conventions de tracé et le fait que le garde-fou de
 * chargement fonctionne.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { GLYPHES, CAPITALES, BAS_DE_CASSE, TOLERANCE, METRIQUES } from './tables/glyphes.js';
import {
  TRAITS_MAJ, TRAITS_MIN, EXTREMITES_MAJ, EXTREMITES_MIN, BOUCLES_MAJ, BOUCLES_MIN,
  SOMMES, SOMMES_CONTRAT, SOMMES_OBTENUES, ECARTS, deriver, boiteGlyphe, mesure,
} from './tables/derivees.js';

const somme = (t) => Object.values(t).reduce((a, b) => a + b, 0);

test('les 52 glyphes sont définis et gelés', () => {
  assert.equal(Object.keys(GLYPHES).length, 52);
  for (const c of [...CAPITALES, ...BAS_DE_CASSE]) {
    assert.ok(GLYPHES[c], `glyphe manquant : ${c}`);
    assert.ok(Object.isFrozen(GLYPHES[c]));
    assert.ok(GLYPHES[c].traits.length >= 1);
  }
});

test('sommes de contrôle des tables dérivées', () => {
  assert.equal(somme(TRAITS_MAJ), 62); // 61 avant les écarts I / L
  assert.equal(somme(TRAITS_MIN), 53); // i +1, u −1 : la somme, elle, ne bouge pas
  assert.equal(somme(EXTREMITES_MAJ), 56); // 58 à la recherche, −2 (M, N), +2 (I)
  // ★ **LES SEIZE BOUCLES N'ONT PAS BOUGÉ D'UNE UNITÉ**, et c'est le fait le
  //   plus solide de tout le redessin : cinquante-deux glyphes relevés sur une
  //   police que la recherche n'avait jamais vue rendent EXACTEMENT ses boucles.
  //   « Boucle fermée, ça ne devrait pas changer quelle que soit la police ou
  //   presque » (l'auteur) — c'était une intuition, c'est une mesure.
  assert.equal(somme(BOUCLES_MAJ), 8);
  assert.equal(somme(BOUCLES_MIN), 8);
  assert.deepEqual(SOMMES_OBTENUES, SOMMES);
});

/**
 * ★ **PLUS « EXACTEMENT » : AUX ÉCARTS DOCUMENTÉS PRÈS — et ils sont trois.**
 *
 * `M` et `N` valaient 4 dans la recherche, ce qui suppose des fûts dépassant la
 * naissance des diagonales. La police n'en donne pas : « M n'a que deux
 * extrémités libres, contre 4 détectées » (l'auteur), et le relevé lui donne
 * raison. Le `I`, lui, va dans l'autre sens — JetBrains Mono l'empatte, donc
 * quatre bouts libres là où la convention du dépôt en promettait deux.
 *
 * ★ **LE NOMBRE DE TRAITS N'EST PAS DANS LA POLICE, IL EST DANS LA RECETTE** —
 *   elle seule dit où le crayon se lève. C'est pourquoi la table de traits
 *   reste comparée en dur : elle n'a pas à bouger quand la police change, et
 *   les deux valeurs qui ont bougé (`I`, `L`) sont déclarées comme les autres.
 */
test('les capitales reproduisent research §3.4, aux écarts documentés près', () => {
  assert.deepEqual(TRAITS_MAJ, {
    A: 3, B: 3, C: 1, D: 2, E: 4, F: 3, G: 2, H: 3, I: 3, J: 1, K: 3, L: 1, M: 4,
    N: 3, O: 1, P: 2, Q: 2, R: 3, S: 1, T: 2, U: 1, V: 2, W: 4, X: 2, Y: 3, Z: 3,
  });
  const rechercheMAJ = {
    A: 2, B: 0, C: 2, D: 0, E: 3, F: 3, G: 2, H: 4, I: 2, J: 2, K: 4, L: 2, M: 4,
    N: 4, O: 0, P: 1, Q: 1, R: 2, S: 2, T: 3, U: 2, V: 2, W: 2, X: 4, Y: 3, Z: 2,
  };
  const attendusMAJ = { ...rechercheMAJ };
  for (const e of ECARTS.filter((x) => x.table === 'EXTREMITES_MAJ')) attendusMAJ[e.glyphe] = e.dessine;
  assert.deepEqual(EXTREMITES_MAJ, attendusMAJ);

  // Les écarts sont exactement ceux déclarés, ni plus ni moins — et `M` comme
  // `N` tombent sur la valeur du `W`, qui a la même construction.
  const ecartesMAJ = Object.keys(rechercheMAJ).filter((c) => rechercheMAJ[c] !== EXTREMITES_MAJ[c]);
  assert.deepEqual(ecartesMAJ.sort(), ['I', 'M', 'N']);
  assert.equal(EXTREMITES_MAJ.M, EXTREMITES_MAJ.W);
  assert.equal(EXTREMITES_MAJ.N, EXTREMITES_MAJ.W);
  // ★ Un homographe se compte pareil dans les deux casses. Le relevé disait le
  //   contraire sur trois lettres — `V` 1 trait contre `v` 2, `W` 1 contre 4,
  //   `Z` 1 contre 3 — parce que les recettes des capitales traçaient d'un seul
  //   tenant ce que les minuscules découpaient. C'est réparé, et gardé.
  for (const c of 'COSUVWXZ') {
    assert.equal(TRAITS_MAJ[c], TRAITS_MIN[c.toLowerCase()], `traits ${c}/${c.toLowerCase()}`);
    assert.equal(EXTREMITES_MAJ[c], EXTREMITES_MIN[c.toLowerCase()],
      `extrémités ${c}/${c.toLowerCase()}`);
    assert.equal(BOUCLES_MAJ[c], BOUCLES_MIN[c.toLowerCase()], `boucles ${c}/${c.toLowerCase()}`);
  }
  assert.deepEqual(Object.entries(BOUCLES_MAJ).filter(([, v]) => v > 0), [
    ['A', 1], ['B', 2], ['D', 1], ['O', 1], ['P', 1], ['Q', 1], ['R', 1],
  ]);
});

test('les bas de casse reproduisent research §3.4, aux écarts documentés près', () => {
  assert.deepEqual(TRAITS_MIN, {
    a: 2, b: 2, c: 1, d: 2, e: 2, f: 2, g: 2, h: 2, i: 3, j: 2, k: 3, l: 1, m: 3,
    n: 2, o: 1, p: 2, q: 2, r: 2, s: 1, t: 2, u: 1, v: 2, w: 4, x: 2, y: 2, z: 3,
  });
  assert.deepEqual(Object.keys(BOUCLES_MIN).filter((c) => BOUCLES_MIN[c] === 1),
    ['a', 'b', 'd', 'e', 'g', 'o', 'p', 'q']);

  const recherche = {
    a: 2, b: 1, c: 2, d: 1, e: 1, f: 4, g: 1, h: 2, i: 3, j: 2, k: 4, l: 2, m: 4,
    n: 2, o: 0, p: 1, q: 1, r: 2, s: 2, t: 3, u: 2, v: 2, w: 2, x: 4, y: 2, z: 2,
  };
  const attendus = { ...recherche };
  // Ne s'appliquent ici que les écarts de CETTE table : depuis `M` et `N`, la
  // liste en porte aussi pour les capitales, et les glyphes s'y appellent
  // pareil à la casse près.
  for (const e of ECARTS.filter((x) => x.table === 'EXTREMITES_MIN')) attendus[e.glyphe] = e.dessine;
  assert.deepEqual(EXTREMITES_MIN, attendus);

  // Les écarts sont exactement ceux déclarés, ni plus ni moins.
  const differents = Object.keys(recherche).filter((c) => recherche[c] !== EXTREMITES_MIN[c]);
  assert.deepEqual(differents.sort(),
    ECARTS.filter((e) => e.table === 'EXTREMITES_MIN').map((e) => e.glyphe).sort());
  for (const e of ECARTS) assert.ok(e.raison.length > 40, `écart ${e.glyphe} : justification trop courte`);
});

test('l’écart avec la somme de contrôle du contrat, et ce qu’il ne touche PAS', () => {
  // ★ **LES BOUCLES SONT L'INVARIANT, ET ELLES LE RESTENT.** Aucun écart déclaré
  //   ne les touche, ni sur les capitales ni sur les bas de casse, alors même
  //   que les cinquante-deux tracés ont entièrement changé de source. C'est ce
  //   qui circonscrit la dérive aux traits et aux extrémités.
  for (const k of ['bcMAJ', 'bcMin']) {
    assert.equal(SOMMES_OBTENUES[k], SOMMES_CONTRAT[k], `somme ${k}`);
  }
  // Les TRAITS bougent d'une unité en tout et pour tout : `I` en gagne deux, `L`
  // en perd un, et les bas de casse s'équilibrent (`i` +1, `u` −1).
  assert.equal(SOMMES_CONTRAT.trMAJ, 61);
  assert.equal(SOMMES_OBTENUES.trMAJ, 62);
  assert.equal(SOMMES_OBTENUES.trMin, SOMMES_CONTRAT.trMin);
  // ★ Les extrémités s'écartent dans des SENS OPPOSÉS : la recherche en compte
  //   plus que le dessin sur les capitales (`M`, `N`), et moins sur les bas de
  //   casse — où douze lettres en gagnent une, parce que la police fait dépasser
  //   un fût ou détacher un empattement là où le dessin à la main ne le faisait
  //   pas. Ce n'est pas une dérive commune, ce sont des arbitrages indépendants,
  //   chacun justifié dans `ECARTS`.
  assert.equal(SOMMES_CONTRAT.extMAJ, 58);
  assert.equal(SOMMES_OBTENUES.extMAJ, 56);
  assert.equal(SOMMES_CONTRAT.extMin, 54);
  assert.equal(SOMMES_OBTENUES.extMin, 66);
});

test('conventions de tracé imposées (CONTRACTS §2.4)', () => {
  // A pointu : deux diagonales et une barre, une boucle, deux pieds libres
  assert.deepEqual([TRAITS_MAJ.A, EXTREMITES_MAJ.A, BOUCLES_MAJ.A], [3, 2, 1]);
  // ⚠️ **`I` SANS EMPATTEMENT : CONVENTION ABANDONNÉE.** Elle décrivait une
  //   capitale bâton géométrique, que le dépôt ne dessine plus — JetBrains Mono
  //   empatte son `I` en haut et en bas, et ce sont deux traits pleins. « C'est
  //   sur la police, n'essaie pas de tricher » (l'auteur, à propos du `i`, dont
  //   le `I` ne diffère que par le point). L'écart est déclaré deux fois dans
  //   `ECARTS`, pour les traits et pour les extrémités.
  assert.deepEqual([TRAITS_MAJ.I, EXTREMITES_MAJ.I], [3, 4]);
  assert.deepEqual([TRAITS_MIN.i, EXTREMITES_MIN.i], [3, 4]);
  // a et g à un seul étage : une boucle chacun
  assert.equal(BOUCLES_MIN.a, 1);
  assert.equal(BOUCLES_MIN.g, 1);
  // Q à queue tangente : une extrémité libre, une boucle
  assert.deepEqual([TRAITS_MAJ.Q, EXTREMITES_MAJ.Q, BOUCLES_MAJ.Q], [2, 1, 1]);
  // W en 4 traits, J sans barre
  assert.equal(TRAITS_MAJ.W, 4);
  assert.equal(TRAITS_MIN.w, 4);
  assert.equal(TRAITS_MAJ.J, 1);
  // le point du i et du j compte comme un trait et une extrémité — il est le
  // DERNIER trait de sa lettre, après la hampe et (pour le `i`) l'empattement.
  assert.equal(GLYPHES.i.traits.length, 3);
  assert.equal(GLYPHES.j.traits.length, 2);
  for (const c of ['i', 'j']) {
    const traits = GLYPHES[c].traits;
    const point = deriver({ traits: [traits[traits.length - 1]], jonctions: [] });
    assert.deepEqual([point.traits, point.extremites, point.boucles], [1, 1, 0],
      `le point du « ${c} » vaut un trait et une extrémité`);
  }
});

/**
 * ★ **UNE RONDE DÉBORDE, ET C'EST LA POLICE QUI A RAISON.**
 *
 * Le contrôle exigeait des capitales qu'elles s'arrêtent à la ligne de base à
 * une unité près. Aucune police ne fait ça : un `O` posé exactement entre deux
 * lignes paraît PLUS PETIT qu'un `H` de même hauteur, parce que l'œil ne voit
 * d'une courbe que sa partie centrale. Toutes les fontes compensent en la
 *  faisant dépasser — c'est le débord optique, et JetBrains Mono le chiffre : `O`
 * à 608,1, `C` à −7,4, et le `s` à −13,1, qui est le pire des cinquante-deux.
 * Treize unités sur six cents : deux pour cent, et l'œil n'y voit que du feu.
 *
 * Le contrôle a donc changé de nature. Il ne dit plus « rien ne dépasse », ce
 * qui était faux ; il dit **de combien** on tolère qu'une courbe dépasse, et
 * réserve le jambage à ceux qui en ont un — le `Q` en a un, sa queue descend à
 * −147,1, et c'est justement ce qui le distingue du `O`.
 */
const DEBORD = 16; // débord optique des rondes : 13,1 au pire (le « s »)

test('les tracés tiennent dans la grille normalisée', () => {
  const aQueue = (c) => c === 'Q' || 'gjpqy'.includes(c);
  for (const [c, g] of Object.entries(GLYPHES)) {
    const b = boiteGlyphe(g);
    const basse = aQueue(c) ? METRIQUES.jambage - 1 : -DEBORD;
    const haute = (c === c.toUpperCase() ? METRIQUES.capitale : METRIQUES.hampe) + DEBORD;
    assert.ok(b.x0 >= -1 && b.x1 <= METRIQUES.largeur + 1,
      `${c} déborde en largeur : ${b.x0}..${b.x1}`);
    assert.ok(b.y0 >= basse && b.y1 <= haute,
      `${c} déborde en hauteur : ${b.y0}..${b.y1} (attendu ${basse}..${haute})`);
  }
});

test('une jonction ne lie que si les tracés se touchent vraiment', () => {
  // Deux traits disjoints, déclarés joints : la jonction est morte et le
  // chargement échouerait. C'est ce qui rend impossible de « corriger » un
  // comptage sans redessiner.
  const faux = { traits: [{ d: 'M 0 0 L 0 100', ouvert: true }, { d: 'M 300 0 L 300 100', ouvert: true }], jonctions: [[0, 1]] };
  const d = deriver(faux);
  assert.deepEqual(d.jonctionsMortes, [[0, 1]]);
  assert.equal(d.extremites, 4, 'aucune extrémité n’est liée par une jonction fictive');
  // À portée, la jonction lie.
  const vrai = { traits: [{ d: 'M 0 0 L 0 100', ouvert: true }, { d: 'M 0 100 L 100 100', ouvert: true }], jonctions: [[0, 1]] };
  const d2 = deriver(vrai);
  assert.deepEqual(d2.jonctionsMortes, []);
  assert.equal(d2.extremites, 2);
  assert.ok(TOLERANCE > 0);
});

test('accès par lettre, casse comprise', () => {
  assert.equal(mesure('traits', 'maj', 'h'), 3);
  assert.equal(mesure('traits', 'min', 'H'), 2);
  assert.equal(mesure('boucles', 'min', 'o'), 1);
  assert.equal(mesure('extremites', 'maj', '7'), null);
  assert.equal(mesure('inconnue', 'maj', 'A'), null);
});

test('les extrémités libres sont localisées (le visuel y pose ses marqueurs)', () => {
  const h = deriver(GLYPHES.H);
  assert.equal(h.libres.length, 4);
  for (const p of h.libres) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.trait >= 0 && p.trait < GLYPHES.H.traits.length);
  }
});
