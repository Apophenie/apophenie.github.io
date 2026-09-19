/**
 * ★ **LES RETOUCHES S'ENCHAÎNENT APRÈS LA CONVERSION, ET LE CRAN EN RÈGLE LA
 *   LONGUEUR** — `assemblage.js › prolongerLesRetouches`, `config.js ›
 *   raffinagesEnChaine`.
 *
 * > « Plus largement, mais si le coût est élevé, c'est le genre de chose à faire
 * >   évoluer entre le cran 0 et le cran 10 : plus on avance dans les crans,
 * >   plus des cas complexes sont envisageables. » (l'autrice, 18 septembre 2026)
 *
 * Routine : `vecteursDeSix` déroule une forme fermée, sans recherche.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { vecteursDeSix } from '../assemblage.js';
import { operateursExplorables } from '../bfs.js';
import { CATALOGUE } from '../../moteur/catalogue.js';
import { reglagesDeBudget, raffinagesEnChaine, PUISSANCE_DE_FOUILLE_MAX } from '../../config.js';

const OPS = operateursExplorables(CATALOGUE);
const TRUMP = 'Donald Trump';
const codesDe = (c) => c.ops.map((o) => o.code).join('+');
const tous = (raffinages) => vecteursDeSix(TRUMP, OPS, 3, 1e6, '666', { raffinages, miseEnForme: false });

test('★ cran 0 : une retouche, le déroulé d’avant au chemin près', () => {
  assert.equal(raffinagesEnChaine(0), 1);
  assert.equal(reglagesDeBudget(0).raffinages, 1);
  const defaut = vecteursDeSix(TRUMP, OPS, 3, 1e6, '666', { miseEnForme: false }).map(codesDe);
  assert.deepEqual(tous(1).map(codesDe), defaut, 'le défaut est une retouche');
  assert.ok(defaut.every((c) => c.split('+').filter((x) => /^m/.test(x)).length <= 2),
    'jamais plus d’un mappeur et d’une retouche');
});

/* ★ **L'ÉGALISATION QUE `mam` PRÉPARE, `mad` Y MÈNE AUSSI DEPUIS QU'IL NE VISE
     PLUS LE 9** (19 septembre 2026). Sur `3 6 6 2 5 3 8 7 8 6 7` (somme 61),
     `mam` fait `2 + 5` pour la moyenne ; l'addition sélective sans 9 fait
     `7 + 8 = 15`, une suite qui vise 6. Dix termes de somme 61 dans les deux
     cas : `meg` y écrit la MÊME ligne, neuf 6 et un 7, et la chaîne ne garde
     une ligne qu'une fois — la première atteinte dans l'ordre du registre
     (`prolongerLesRetouches`), et `mad` y précède `mam`. La voie à deux
     retouches est donc construite, sous le nom de `mad`. */
test('★ deux retouches : la ligne que `mam` prépare pour `meg` est construite', () => {
  const v = tous(2);
  const voie = v.find((c) => codesDe(c) === 'fl+tca+mt9+mad+meg');
  assert.ok(voie, 'fl+tca+mt9+mad+meg doit être construit à deux retouches');
  const fin = [...voie.etats.at(-1).valeur].sort((a, b) => a - b);
  assert.deepEqual(fin, [6, 6, 6, 6, 6, 6, 6, 6, 6, 7], 'neuf 6 et un 7');
  const [mam, meg] = ['mam', 'meg'].map((code) => OPS.find((o) => o.code === code));
  const parMam = mam.apply([3, 6, 6, 2, 5, 3, 8, 7, 8, 6, 7], []).valeur;
  assert.deepEqual(meg.apply(parMam, []).valeur, voie.etats.at(-1).valeur,
    '`mam` puis `meg` écrit la même ligne : la chaîne ne la garde qu’une fois');
  assert.ok(!tous(1).some((c) => codesDe(c) === 'fl+tca+mt9+mad+meg'), 'à une retouche, il ne l’était pas');
});

test('la chaîne n’enchaîne que des retouches : ni absorption ni gonflement après la première', () => {
  for (const c of tous(3)) {
    const ops = c.ops;
    const premier = ops.findIndex((o) => o.from === 'NUMS' && o.to === 'NUMS');
    if (premier < 0) continue;
    for (const o of ops.slice(premier + 1)) {
      assert.ok(!o.absorbe && !o.gonfle, `${codesDe(c)} : ${o.code} dans la chaîne`);
    }
  }
});

test('la chaîne ne repart jamais d’une ligne plus longue que celle de la conversion', () => {
  let longues = 0;
  for (const c of tous(3)) {
    const i = c.ops.findIndex((o) => o.from === 'TOKENS' && o.to === 'NUMS');
    if (i < 0) continue;
    const largeur = c.etats[i + 1].valeur.length;
    // Les retouches qui en suivent une autre : chacune part d'une ligne qui ne
    // dépasse pas la conversion. La dernière, elle, peut gonfler.
    for (let k = i + 2; k < c.etats.length - 1; k++) {
      assert.ok(c.etats[k].valeur.length <= largeur, `${codesDe(c)} : repart d’une ligne de ${c.etats[k].valeur.length}`);
    }
    if (c.etats.at(-1).valeur.length > largeur) longues++;
  }
  assert.ok(longues > 0, 'une retouche qui gonfle reste retenue, on ne la prolonge pas');
});

test('la longueur ne décroît jamais avec le cran, et ne dépasse pas trois', () => {
  let avant = 1;
  for (let n = 0; n <= PUISSANCE_DE_FOUILLE_MAX; n++) {
    const r = raffinagesEnChaine(n);
    assert.ok(r >= avant && r <= 3, `cran ${n} : ${r}`);
    avant = r;
  }
});

test('une longueur qui n’est pas un entier ≥ 1 échoue bruyamment', () => {
  assert.throws(() => vecteursDeSix(TRUMP, OPS, 3, 16, '666', { raffinages: 0 }));
  assert.throws(() => vecteursDeSix(TRUMP, OPS, 3, 16, '666', { raffinages: 1.5 }));
});
