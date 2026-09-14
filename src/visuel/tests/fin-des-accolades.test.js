/**
 * ★ **UN GESTE À ACCOLADE FINIT EN DEUX TEMPS — pour chaque opérateur.**
 *
 * > « Sur les autres opérations, est-ce en 2 temps ou en simultané ? En tout
 * >   cas il faut que le comportement soit cohérent. » (l'autrice, à propos du
 * >   carré : le résultat remonte d'abord, PUIS l'accolade disparaît et
 * >   l'espace se réajuste)
 *
 * La garde de ROUTINE, bâtie comme celle du cadre : le geste de chaque
 * opérateur du catalogue, joué sur son vecteur gelé, compilé par le vrai
 * compilateur. Pour chaque étape qui pose une accolade, l'effacement de
 * l'accolade commence après la fin de l'action, et la ligne ne se resserre pas
 * avant cet effacement. Les trois instants sont définis une fois, dans
 * `_accolades.js`.
 *
 * ★ **CE QUI RESTE À TRAITER EST ÉCRIT ICI, ET LA LISTE NE PEUT QUE
 *   RACCOURCIR.** Un opérateur exempté qui se met à tenir la règle fait rougir
 *   la garde tant qu'on ne l'a pas retiré de la liste ; un opérateur qui n'y
 *   est pas et ne la tient pas la fait rougir aussi.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../../moteur/tables/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { VECTEURS } from '../../moteur/vecteurs-geles.js';
import { compilerEnRelevant } from './_cadre.js';
import { finsDesAccolades } from './_accolades.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

/**
 * Les gestes qui ne tiennent pas encore la règle, et pourquoi.
 * @type {Record<string, string>}
 */
const A_TRAITER = {
  mdiv: 'division : l’accolade s’efface pendant que le compte remonte',
  mdvq: 'division : l’accolade s’efface pendant que le compte remonte',
  mdvr: 'division : l’accolade s’efface pendant que le compte remonte',
  mdc1: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  mdc2: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  mdc3: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  md01: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  md02: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  md03: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  mdl0: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  mdlc: 'potence : l’accolade s’efface avec A, B et les barres, avant que le quotient ait pris sa place',
  mpui: 'puissance : l’accolade s’efface pendant que le produit remonte',
  cmo: 'fraction : l’accolade s’efface pendant que le quotient remonte',
  cmod: 'fraction : l’accolade s’efface pendant que le quotient remonte',
  cme: 'fraction : l’accolade s’efface pendant que le quotient remonte',
};

function jetonsDe(etat) {
  const elements = etat.type === 'STR' ? [...etat.valeur]
    : etat.type === 'NUM' ? [String(etat.valeur)] : etat.valeur.map(String);
  return elements.map((text, i) => ({ id: `t${i}`, text }));
}

/** Les fautes de chaque opérateur, sur son vecteur gelé. */
function fautesDuCatalogue() {
  const fautes = new Map();
  let etapes = 0;
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    if (!apres) continue;
    const tokens = jetonsDe(entree);
    const steps = op.steps(entree, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
    if (!steps.length) continue;
    const { tl, lignes } = compilerEnRelevant({ version: 1, tokens, steps });
    for (const f of finsDesAccolades(tl, lignes)) {
      etapes++;
      if (!f.faute) continue;
      if (!fautes.has(code)) fautes.set(code, []);
      fautes.get(code).push(`${f.id} : ${f.faute}`);
    }
  }
  return { fautes, etapes };
}

test('★ chaque geste à accolade finit en deux temps : l’action, PUIS l’accolade s’efface, PUIS la ligne se réajuste', () => {
  const { fautes, etapes } = fautesDuCatalogue();
  assert.ok(etapes > 50, `seulement ${etapes} étapes à accolade mesurées : la garde ne garde rien`);
  const nouvelles = [...fautes.keys()].filter((code) => !(code in A_TRAITER));
  assert.deepEqual(nouvelles, [], `${nouvelles.length} geste(s) finissent en simultané :\n  `
    + nouvelles.map((c) => `${c} — ${fautes.get(c)[0]}`).join('\n  '));
  const regles = Object.keys(A_TRAITER).filter((code) => !fautes.has(code));
  assert.deepEqual(regles, [], 'ces gestes tiennent désormais la règle : retirez-les de A_TRAITER');
});
