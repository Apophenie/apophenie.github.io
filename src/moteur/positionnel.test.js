/**
 * ★ LA NOTATION POSITIONNELLE, CÔTÉ MOTEUR — `transformations/positionnel.js`.
 *
 * > « C'est en nombre de caractères donc ça peut couper un nombre ; si je veux
 * >   le nombre, j'élargis pour l'inclure. » (l'autrice, 18 septembre 2026)
 *
 * Ce que ces tests gèlent : ce qu'une position DÉSIGNE (des caractères, pas des
 * nombres), ce que l'opérateur localisé REND (la ligne recollée, traces
 * comprises), ce qu'il MONTRE (la coupe avant le geste, le geste sur la seule
 * fenêtre) et ce qu'il REFUSE. Le chemin du site — lien, rejeu, scénario,
 * compilation — est éprouvé dans `recherche/tests/positionnel.test.js`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { derouler, appliquerProgramme, operateurDuCode, PAR_CODE } from './catalogue.js';
import { nums } from './etat.js';
import { localiser, resoudreCode, lirePositionnel } from './transformations/positionnel.js';

/** `3 9 6 1 10` — chaque nombre venant d'une lettre, le `10` de deux. */
const LIGNE = () => nums([3, 9, 6, 1, 10], [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]], [[4, 6]]]);

test('★ positionnel — la position compte des CARACTÈRES : `3.1.1cs` prend le 1 de 10', () => {
  const r = derouler(['3.1.1cs'], LIGNE());
  assert.ok(r, 'la somme localisée s’applique');
  assert.deepEqual(r.etat.valeur, [3, 9, 6, 2, 0], 'le 0 reste seul, comme nombre');
  // Les traces : la somme vient du 1 ET du 10, le 0 garde celle du 10 entier.
  assert.deepEqual(r.etat.origines.map((o) => o.map((i) => [...i])),
    [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 6]], [[4, 6]]]);
  // Même résultat par le code canonique : `3cs` vaut `3.1.1cs`.
  assert.deepEqual(appliquerProgramme(['3cs'], LIGNE()).valeur, [3, 9, 6, 2, 0]);
});

test('★ positionnel — la coupe se voit AVANT le geste, et le geste n’embrasse que la fenêtre', () => {
  const r = derouler(['3.1.1cs'], LIGNE(), { ids: ['a', 'b', 'c', 'd', 'e'] });
  const [coupe, somme] = r.etapes[0].steps;
  // 1. le 10 se scinde — et lui seul.
  assert.deepEqual(coupe.ops.map((o) => o.op), ['substitute']);
  const [paire] = coupe.ops[0].pairs;
  assert.equal(paire.target, 'e');
  assert.deepEqual(paire.to.map((t) => t.text), ['1', '0']);
  assert.equal(coupe.caption, '3 9 6 1 10 → 3 9 6 1 1 0');
  // 2. l'addition, sur les deux opérandes et rien d'autre.
  const sum = somme.ops.find((o) => o.op === 'sum');
  assert.deepEqual(sum.targets, ['d', paire.to[0].id], 'le 1 de la ligne et le 1 du 10');
  assert.equal(sum.to.text, '2');
  const touches = new Set(somme.ops.flatMap((o) => [...(o.targets || []), ...(o.between || [])]));
  for (const id of ['a', 'b', 'c', paire.to[1].id]) assert.ok(!touches.has(id), `${id} n’est pas sous l’accolade`);
  // 3. la sortie nomme la ligne recollée : les intacts gardent leur jeton.
  const ids = operateurDuCode('3cs').sortie(LIGNE(), r.etat, { ids: ['a', 'b', 'c', 'd', 'e'], cle: 'e0' });
  assert.deepEqual(ids, ['a', 'b', 'c', sum.to.id, paire.to[1].id]);
});

test('★ positionnel — `1.2.2cs` fait 33 + 33 : l’opérande élargi COLLE les chiffres', () => {
  const ligne = nums([1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]);
  const r = derouler(['1.2.2cs'], ligne);
  assert.deepEqual(r.etat.valeur, [1, 66, 5, 6, 6, 6, 8, 9]);
  const [collage, somme] = r.etapes[0].steps;
  assert.deepEqual(collage.ops.map((o) => o.op), ['merge', 'merge'], 'rien à couper, deux collages');
  assert.deepEqual(collage.ops.map((o) => o.to.text), ['33', '33']);
  assert.match(somme.caption, /^33 \+ 33 = 66$/);
  // Trois opérandes : trois largeurs.
  assert.deepEqual(appliquerProgramme(['1.1.1.1cs'], ligne).valeur, [1, 9, 3, 5, 6, 6, 6, 8, 9]);
});

test('★ positionnel — un mappeur prend UNE fenêtre, ses nombres coupés à ses bords', () => {
  const ligne = nums([19, 9, 99]);
  // `1.3mr9` : les caractères 1 à 3 — le 9 de 19, le 9, le premier 9 de 99.
  const r = derouler(['1.3mr9'], ligne);
  assert.deepEqual(r.etat.valeur, [1, 6, 6, 6, 9]);
  assert.equal(r.etapes[0].steps[0].caption, '19 9 99 → 1 9 9 9 9');
  // `4mr9` vaut `4.1mr9` : le dernier 9 seul.
  assert.deepEqual(appliquerProgramme(['4mr9'], nums([19, 9, 99])).valeur, [19, 9, 9, 6]);
  // La fenêtre entière, sans coupe : aucun redécoupage, le geste seul — et
  // `mr9` n'y retourne que ce qu'il retourne partout, les 9 qui sont des NOMBRES.
  const entier = derouler(['0.5mr9'], nums([19, 9, 99]));
  assert.deepEqual(entier.etat.valeur, [19, 6, 99]);
  assert.equal(entier.etapes[0].steps.some((s) => /redécoupe/.test(s.title)), false);
});

/**
 * ★ LES REFUS. Ni une position hors de la ligne, ni une coupe qui ferait
 * perdre un caractère, ni un opérateur qui ne travaille pas une ligne de
 * nombres : rien de tout cela n'est deviné.
 */
test('★ positionnel — ce qui est refusé, et pourquoi', () => {
  // Hors bornes : la ligne compte 6 caractères.
  assert.equal(appliquerProgramme(['5.1.1cs'], LIGNE()), null);
  assert.match(operateurDuCode('5.1.1cs').pourquoi(LIGNE().valeur), /6 caractère/);
  // Un zéro de tête : `102` coupé après le 1 laisserait `02`.
  assert.equal(appliquerProgramme(['0mr9'], nums([102])), null);
  assert.match(operateurDuCode('0mr9').pourquoi([102]), /zéro de tête/);
  // …mais un 0 SEUL est un nombre comme un autre.
  assert.deepEqual(appliquerProgramme(['1cs'], nums([102])).valeur, [1, 2]);
  // Un nombre négatif : son signe n'est pas un chiffre.
  assert.match(operateurDuCode('0cs').pourquoi([-3, 4]), /négatif/);
  // Des familles qui ne se localisent pas — et le dire, c'est `resoudreCode`.
  for (const code of ['2mpy', '0cnj', '0pr9', '0tca', '0fl']) {
    const r = resoudreCode(PAR_CODE, code);
    assert.equal(r.op, null, code);
    assert.equal(r.inconnu, false, `${code} : le code est connu, c'est le préfixe qui ne va pas`);
    assert.ok(r.raison, code);
  }
  assert.equal(resoudreCode(PAR_CODE, '2czz').inconnu, true);
  assert.equal(localiser(PAR_CODE.get('mpy'), { position: 0, largeurs: [1] }).op, null);
  assert.equal(localiser(PAR_CODE.get('cs'), { position: 0, largeurs: [1] }).op, null,
    'un combinateur réunit au moins deux opérandes');
});

test('★ positionnel — l’opérateur localisé garde l’identité du sien, pas son type', () => {
  const op = operateurDuCode('1.2.2cs');
  const cs = PAR_CODE.get('cs');
  assert.equal(op.id, cs.id, 'même titre, même notoriété, même caractère de ficelle');
  assert.equal(op.notoriete, cs.notoriete);
  assert.equal(op.code, '1.2.2cs');
  assert.equal(op.from, 'NUMS');
  assert.equal(op.to, 'NUMS', 'une somme localisée rend une LIGNE');
  assert.equal(op.commute, false);
  assert.equal(operateurDuCode('1.1.1cs').code, '1cs', 'le code porté est le canonique');
  assert.deepEqual(lirePositionnel('1.1.1cs'), { position: 1, largeurs: [1, 1], code: 'cs', ecrit: '1cs' });
});
