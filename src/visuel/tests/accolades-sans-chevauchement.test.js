/**
 * ★ **DEUX ACCOLADES NE SE SUPERPOSENT JAMAIS.**
 *
 * > « Plusieurs accolades qui se chevauchent durant `mrdE` » (l'auteur), et le
 * >   même défaut sur `mrtE`.
 *
 * Le défaut se voit quand un redécoupage exact ouvre PLUSIEURS paquets en même
 * temps : depuis que « les redécoupages jouent tous leurs paquets en même
 * temps, temps par temps », une étape d'additions trace sept, huit, dix
 * accolades côte à côte. Chacune doit tenir sur son paquet ; aucune ne doit
 * empiéter sur sa voisine.
 *
 * Deux gardes, le même œil (`_accolades.js › accoladesQuiSeChevauchent`) :
 *
 *  1. la ROUTINE — le geste de chaque opérateur du catalogue, sur son vecteur
 *     gelé, comme `fin-des-accolades.test.js` ;
 *  2. les QUATRE VOIES où l'auteur l'a vu, par le chemin du site
 *     (`construireScenario` puis `compile`) :
 *       · `?sce!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR`     — « Didier Raoult »
 *       · `?sce!f3!fmaj+mas+mrtE$6hVamBkJyG1MWtPRwR`  — « Didier Raoult »
 *       · `?sce!fmaj+mas+mrdE$LBvysLJSWqpia3v`        — « Marie Curie »
 *       · `?sce!fmaj+mas+mrdE$TPFErnfXxwkkeBD`        — « jean-michel »
 *     (la conversion `tca` est implicite dans l'URL ; la voie s'écrit
 *     `fmaj+tca+mas+mrdE` au catalogue.)
 *
 * ★ **CE QUI RESTE À TRAITER EST ÉCRIT ICI, ET LA LISTE NE PEUT QUE
 *   RACCOURCIR** — même discipline que la garde de fin d'accolade : un
 *   opérateur exempté qui se met à tenir la règle fait rougir la garde tant
 *   qu'on ne l'a pas retiré.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../../moteur/tables/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { VECTEURS } from '../../moteur/vecteurs-geles.js';
import { depuisSaisie } from '../../moteur/etat.js';
import { construireScenario } from '../../recherche/scenario.js';
import { accoladesQuiSeChevauchent } from './_accolades.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

/** Les gestes qui ne tiennent pas encore la règle, et pourquoi. */
const A_TRAITER = {};

function jetonsDe(etat) {
  const elements = etat.type === 'STR' ? [...etat.valeur]
    : etat.type === 'NUM' ? [String(etat.valeur)] : etat.valeur.map(String);
  return elements.map((text, i) => ({ id: `t${i}`, text }));
}

test('★ sur son vecteur gelé, aucun opérateur ne dessine deux accolades l’une sur l’autre', () => {
  const fautes = new Map();
  let mesures = 0;
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    if (!apres) continue;
    const tokens = jetonsDe(entree);
    const steps = op.steps(entree, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
    if (!steps.length) continue;
    const tl = compile({ version: 1, tokens, steps });
    if (tl.nodes.filter((n) => n.role === 'bracket').length < 2) continue;
    mesures++;
    const ch = accoladesQuiSeChevauchent(tl);
    if (ch.length) fautes.set(code, ch[0]);
  }
  assert.ok(mesures > 10, `seulement ${mesures} geste(s) à plusieurs accolades mesurés : la garde ne garde rien`);
  const nouvelles = [...fautes.keys()].filter((code) => !(code in A_TRAITER));
  assert.deepEqual(nouvelles, [], `${nouvelles.length} geste(s) superposent deux accolades :\n  `
    + nouvelles.map((c) => {
      const f = fautes.get(c);
      return `${c} — étape ${f.etape}, à ${f.t} ms : ${f.a} et ${f.b} se recouvrent sur ${Math.round(f.dx)} unités`;
    }).join('\n  '));
  const regles = Object.keys(A_TRAITER).filter((code) => !fautes.has(code));
  assert.deepEqual(regles, [], 'ces gestes tiennent désormais la règle : retirez-les de A_TRAITER');
});

/** Une approche d'un seul fragment, construite comme le site la reçoit. */
function approcheSur(saisie, codes) {
  const ops = codes.map((c) => PAR_CODE.get(c));
  const etats = [depuisSaisie(saisie)];
  for (const op of ops) {
    const suivant = appliquer(op, etats[etats.length - 1]);
    assert.ok(suivant, `${codes.join('+')} doit s'appliquer à « ${saisie} »`);
    etats.push(suivant);
  }
  const n = [...saisie].length;
  return { mode: 'DECRET', parts: [{
    fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
    chemin: { ops, etats },
  }] };
}

/** Les liens de l'auteur, plus un témoin de `mrtE` encore applicable après le tri strict. */
const VOIES = [
  ['Didier Raoult', 'fmaj+tca+mas+mrdE'],
  // Sur Raoult, le tri strict ne gagne plus de série : `mrtE` se tait.
  // Ce témoin conserve la vérification des accolades de sa passe triée.
  ['hope-hope-hope.fr', 'fmaj+tca+mas+mrtE'],
  ['Marie Curie', 'fmaj+tca+mas+mrdE'],
  ['jean-michel', 'fmaj+tca+mas+mrdE'],
];

for (const [saisie, programme] of VOIES) {
  test(`★ ${saisie} › ${programme} : les paquets ouverts ensemble ne se marchent pas dessus`, () => {
    const sc = construireScenario(approcheSur(saisie, programme.split('+')), { saisie });
    assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], tl.warnings.slice(0, 3).join(' | '));
    const ch = accoladesQuiSeChevauchent(tl);
    assert.deepEqual(ch.map((f) => `étape ${f.etape} (${sc.steps[f.etape] && sc.steps[f.etape].caption}), `
      + `à ${f.t} ms : ${f.a} et ${f.b} se recouvrent sur ${Math.round(f.dx)} × ${Math.round(f.dy)} unités`).slice(0, 5),
    [], `${ch.length} paire(s) d’accolades superposées`);
  });
}
