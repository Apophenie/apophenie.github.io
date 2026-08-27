/**
 * ★ L'AGENCEMENT DES TRIPTYQUES EN RANGS — la table de vérité de l'auteur.
 *
 * L'auteur a dicté dix cas ET la règle qui les gouverne, et les deux ne
 * coïncidaient pas sur sept : sa dictée disait `4+3`, son critère dit `3+2+2`.
 * Interrogé, il a tranché en faveur du CRITÈRE et corrigé son propre exemple —
 * « OK pour passer 7 en 3+2+2, c'est mieux en effet. » C'est donc la table
 * CORRIGÉE qui fait foi, et c'est elle qui est recopiée ici.
 *
 * La règle qui les rend — le moins de lignes possible, à condition qu'une ligne
 * porte en moyenne MOINS de trois triptyques et demi — est expliquée à
 * `primitives/reveal.js › repartirEnLignes` ; ici, on ne la relit pas, on la
 * MET À L'ÉPREUVE. Si quelqu'un la remplace un jour par plus simple, c'est ce
 * fichier qui dira si le remplacement rend les mêmes dix cas.
 *
 * Le reste du fichier vérifie les propriétés que la règle doit tenir au-delà
 * des dix — un rang au moins, la somme conservée, et une différence d'au plus
 * un triptyque entre le rang le plus fourni et le moins fourni.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { repartirEnLignes } from '../primitives/reveal.js';

/** La dictée de l'auteur, sa correction sur sept comprise. */
const DICTEE = [
  [1, [1]],                 // « 1: 1 ligne de 1 »
  [2, [2]],                 // « 2: 1 ligne de 1 » — d'un seul rang, de deux
  [3, [3]],                 // « 3: 1 ligne de 1 » — d'un seul rang, de trois
  [4, [2, 2]],              // « 4: 2 lignes de 2 »
  [5, [3, 2]],              // « 5: 1 ligne de 3 et 1 de 2 »
  [6, [3, 3]],              // « 6: 2 lignes de 3 »
  [7, [3, 2, 2]],           // corrigé : « OK pour passer 7 en 3+2+2 »
  [8, [3, 3, 2]],           // « 8: 2 lignes de 3 et 1 ligne de 2 »
  [9, [3, 3, 3]],           // « 9: 3 lignes de 3 »
  [10, [4, 3, 3]],          // « 10: 1 ligne de 4 et 2 lignes de 3 »
];

/**
 * ★ LE SEUIL EST ENCADRÉ, PAS CHOISI — et deux cas suffisent à l'enfermer.
 *
 * Qui voudra changer `PAR_LIGNE_MAX` doit savoir de combien il a le droit de
 * bouger : `10 → [4,3,3]` fait tenir 3⅓ triptyques par ligne (le seuil doit
 * donc le dépasser) et `7 → [3,2,2]` refuse une moyenne de 3½ (le seuil ne doit
 * donc pas aller au-delà). Ce test REJOUE la règle avec d'autres seuils pour
 * montrer où sont les murs, plutôt que de les affirmer dans un commentaire.
 */
const etaler = (n, r) => {
  const q = Math.floor(n / r);
  const rr = n % r;
  return Array.from({ length: r }, (_, i) => q + (i < rr ? 1 : 0));
};
const avecSeuil = (n, seuil) => {
  let r = 1;
  while (n / r >= seuil) r++;
  return etaler(n, r);
};

test('★ verdict — le seuil de trois et demi est encadré par « 10 » et par « 7 »', () => {
  const rendLesDix = (seuil) => DICTEE.every(([n, att]) => avecSeuil(n, seuil).join() === att.join());
  assert.ok(rendLesDix(3.5), '3,5 rend les dix cas');
  assert.ok(rendLesDix(3.4), 'et toute valeur au-dessus de 3⅓ aussi');
  assert.ok(!rendLesDix(10 / 3), '3⅓ pile est trop bas : « 10 » y passerait à quatre rangs');
  assert.ok(!rendLesDix(3.51), 'au-delà de 3,5, « 7 » retombe sur 4+3 — ce que l’auteur a corrigé');
});

test('★ verdict — les dix agencements dictés par l’auteur, à la série près', () => {
  for (const [n, attendu] of DICTEE) {
    assert.deepEqual(repartirEnLignes(n), attendu,
      `${n} triptyque(s) : l’auteur a dicté [${attendu.join(', ')}]`);
  }
});

/**
 * ★ Les cas de l'auteur s'arrêtent à dix, la formule non — elle doit rester
 * sensée au-delà, faute de quoi une moisson de douze séries agencerait n'importe
 * quoi sans qu'aucun test ne bronche. On ne DEVINE pas ce que l'auteur voudrait
 * pour 11 ou 24 : on exige seulement les trois propriétés que ses dix cas
 * vérifient tous.
 */
test('★ verdict — au-delà des dix cas, l’agencement reste sain', () => {
  for (let n = 1; n <= 60; n++) {
    const rangs = repartirEnLignes(n);
    assert.ok(rangs.length >= 1, `${n} : au moins un rang`);
    assert.equal(rangs.reduce((a, b) => a + b, 0), n,
      `${n} : la somme des rangs doit rendre exactement le compte des triptyques`);
    assert.ok(Math.min(...rangs) >= 1, `${n} : aucun rang vide`);
    assert.ok(Math.max(...rangs) - Math.min(...rangs) <= 1,
      `${n} : [${rangs.join(', ')}] — la répartition doit être la plus égale possible`);
    // Les rangs les plus fournis d'abord : la ligne descend, elle ne monte pas.
    for (let i = 1; i < rangs.length; i++) {
      assert.ok(rangs[i - 1] >= rangs[i], `${n} : [${rangs.join(', ')}] — un rang plus fourni sous un rang plus maigre`);
    }
    // « Garde plus de triptyques par ligne que de lignes » (l'auteur) — la
    // seule moitié de sa prose que sa table corrigée ne contredise nulle part,
    // et elle tient exactement sur les dix cas qu'il a dictés. Elle cède dès
    // onze ([3, 3, 3, 2] : trois par rang pour quatre rangs), et c'est
    // annoncé — au-delà de dix, la règle EXTRAPOLE (voir `repartirEnLignes`).
    if (n <= 10) {
      assert.ok(rangs[0] >= rangs.length,
        `${n} : [${rangs.join(', ')}] — plus de rangs que de triptyques par rang`);
    }
    // Et la règle en une phrase, relue à l'envers : jamais trois triptyques et
    // demi par ligne en moyenne, et jamais une ligne de moins qui l'éviterait.
    assert.ok(n / rangs.length < 3.5,
      `${n} : [${rangs.join(', ')}] — ${(n / rangs.length).toFixed(2)} triptyques par ligne, c'est trop`);
    if (rangs.length > 1) {
      assert.ok(n / (rangs.length - 1) >= 3.5,
        `${n} : [${rangs.join(', ')}] — un rang de moins suffisait`);
    }
  }
});

test('★ verdict — rien à agencer : aucun rang, et pas de rang vide', () => {
  assert.deepEqual(repartirEnLignes(0), []);
  assert.deepEqual(repartirEnLignes(-3), []);
  assert.deepEqual(repartirEnLignes(2.5), []);
  assert.deepEqual(repartirEnLignes(NaN), []);
});
