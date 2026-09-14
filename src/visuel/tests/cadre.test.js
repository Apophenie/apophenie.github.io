/**
 * ★ **LA LIGNE PRINCIPALE NE QUITTE JAMAIS L'ÉCRAN — pour chaque opérateur.**
 *
 * > « Il y a plusieurs animations buggées (sort de l'écran vers le haut). Peux-tu
 * >   ajouter une garde qui vérifie que la ligne principale est toujours à
 * >   l'écran pour toutes les animations, et corriger celles qui sont
 * >   buggées. » (l'autrice)
 *
 * La garde de ROUTINE : le geste de chaque opérateur du catalogue, joué sur son
 * vecteur gelé (`moteur/vecteurs-geles.js`, un par opérateur publié), compilé
 * par le vrai compilateur, et regardé tous les 25 ms — les deux bouts de chaque
 * étape compris. La définition de « la ligne est à l'écran », ce qu'elle exclut
 * et pourquoi, est écrite une fois dans `_cadre.js`.
 *
 * La garde LENTE, sur les vraies voies où plusieurs décors se succèdent, vit
 * dans `recherche/tests/lents/integration-visuel.test.js`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../../moteur/tables/glyphes.js';
import { CATALOGUE, PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { VECTEURS } from '../../moteur/vecteurs-geles.js';
import { compilerEnRelevant, sortiesDeCadre, dire } from './_cadre.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

/** Les jetons de départ d'un état : un par signe, par jeton ou par nombre. */
function jetonsDe(etat) {
  const elements = etat.type === 'STR' ? [...etat.valeur]
    : etat.type === 'NUM' ? [String(etat.valeur)] : etat.valeur.map(String);
  return elements.map((text, i) => ({ id: `t${i}`, text }));
}

test('★ la ligne principale reste à l’écran, à tout instant, dans le geste de chaque opérateur', () => {
  // La couverture est celle du catalogue, pas une liste écrite ici : un
  // opérateur ajouté a son vecteur (exigé par `catalogue.test.js`), donc sa garde.
  assert.equal(VECTEURS.length, CATALOGUE.length, 'un vecteur par opérateur publié');
  const fautes = [];
  const sansGeste = [];
  let scenes = 0;
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : le vecteur gelé ne s’applique plus`);
    const tokens = jetonsDe(entree);
    const steps = op.steps(entree, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
    // Un opérateur qui ne change rien à la ligne n'émet aucune étape (`m09` sur
    // des chiffres déjà lus) : il n'y a rien à cadrer.
    if (!steps.length) { sansGeste.push(code); continue; }
    const { tl, lignes } = compilerEnRelevant({ version: 1, tokens, steps });
    scenes++;
    for (const s of sortiesDeCadre(tl, lignes)) fautes.push(`${code} — ${dire(s)}`);
  }
  assert.ok(scenes > CATALOGUE.length * 0.9, `seulement ${scenes} scènes jouées : la garde ne garde rien`);
  assert.deepEqual(fautes, [], `${fautes.length} sortie(s) de cadre :\n  ${fautes.join('\n  ')}`);
  if (sansGeste.length) console.log(`    sans étape sur leur vecteur : ${sansGeste.join(', ')}`);
});
