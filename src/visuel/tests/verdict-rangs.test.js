/**
 * ★ L'AGENCEMENT DES TRIPTYQUES EN RANGS — la table de vérité de l'auteur.
 *
 * L'auteur a dicté dix cas. Sa règle en prose (« minimise la différence de
 * nombre de triptyques entre les lignes ») et son énumération ne coïncident pas
 * sur huit — la prose donnerait `4 + 4`, l'énumération dit `3 + 3 + 2` —, et
 * c'est **l'énumération qui fait foi** : elle dit ce qu'il a regardé, la phrase
 * ne fait que le résumer après coup.
 *
 * Ces dix lignes sont donc le contrat, recopiées de sa dictée sans être
 * réinterprétées. La formule qui les rend (`⌈2n/7⌉` rangs, puis la répartition
 * la plus égale possible, les rangs les plus fournis en tête) est expliquée à
 * `primitives/reveal.js › repartirEnLignes` ; ici, on ne la relit pas, on la
 * MET À L'ÉPREUVE. Si quelqu'un la remplace un jour par plus simple, c'est ce
 * fichier qui dira si le remplacement rend les mêmes dix cas.
 *
 * Le reste du fichier vérifie les trois propriétés que la formule doit tenir
 * au-delà des dix — un rang au moins, la somme conservée, et une différence
 * d'au plus un triptyque entre le rang le plus fourni et le moins fourni.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { repartirEnLignes } from '../primitives/reveal.js';

/** La dictée de l'auteur, mot pour mot, transcrite en rangs. */
const DICTEE = [
  [1, [1]],                 // « 1: 1 ligne de 1 »
  [2, [2]],                 // « 2: 1 ligne de 1 » — d'un seul rang, de deux
  [3, [3]],                 // « 3: 1 ligne de 1 » — d'un seul rang, de trois
  [4, [2, 2]],              // « 4: 2 lignes de 2 »
  [5, [3, 2]],              // « 5: 1 ligne de 3 et 1 de 2 »
  [6, [3, 3]],              // « 6: 2 lignes de 3 »
  [7, [4, 3]],              // « 7: 1 ligne de 4 et une de 3 »
  [8, [3, 3, 2]],           // « 8: 2 lignes de 3 et 1 ligne de 2 »
  [9, [3, 3, 3]],           // « 9: 3 lignes de 3 »
  [10, [4, 3, 3]],          // « 10: 1 ligne de 4 et 2 lignes de 3 »
];

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
    // seule moitié de sa prose que l'énumération ne contredise nulle part, et
    // elle tient exactement sur les dix cas qu'il a dictés. Elle cède dès
    // onze ([3, 3, 3, 2] : trois par rang pour quatre rangs), et c'est
    // annoncé — au-delà de dix, la formule EXTRAPOLE (voir `repartirEnLignes`).
    if (n <= 10) {
      assert.ok(rangs[0] >= rangs.length,
        `${n} : [${rangs.join(', ')}] — plus de rangs que de triptyques par rang`);
    }
  }
});

test('★ verdict — rien à agencer : aucun rang, et pas de rang vide', () => {
  assert.deepEqual(repartirEnLignes(0), []);
  assert.deepEqual(repartirEnLignes(-3), []);
  assert.deepEqual(repartirEnLignes(2.5), []);
  assert.deepEqual(repartirEnLignes(NaN), []);
});
