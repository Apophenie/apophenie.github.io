// src/recherche/bassin.js
// Bassin d'attraction de 6 par les seuls opérateurs NUM→NUM.
// CONTRACTS.md §5 · research/heuristique.md §2.4.
//
// C'est le seul emprunt utile au meet-in-the-middle : les filtres et les
// combinateurs ne sont pas inversibles, mais la couche NUM→NUM l'est, et elle
// est petite. Mesuré sur le catalogue jouet : aucun entier de [-2000, 2000]
// n'est à distance > 2 de 6, et 29,1 % de la plage y mène.
//
// Bénéfice : dès qu'un NUM est produit, un test d'appartenance O(1) remplace
// 2 niveaux de recherche en avant → D_MAX passe de 6 à 4, l'espace exploré est
// divisé par ~50.

import { appliquerOp, etat, normaliserCatalogue } from './bfs.js';
import { comparerCodes } from './score.js';

export const PLAGE_BASSIN = { min: -2000, max: 2000 };
// « + 2 niveaux gratuits » (CONTRACTS.md §5) : le bassin ne remonte pas au-delà
// de 2 opérateurs. Au-delà, ce ne sont plus des raccourcis mais des acrobaties,
// et le score les punirait de toute façon.
export const DISTANCE_MAX = 2;

/**
 * @typedef {{dist:number, ops:Object[], codes:string[]}} EntreeBassin
 */

/**
 * Précalcul statique. Déterministe : les opérateurs sont parcourus dans l'ordre
 * du catalogue (= codes croissants) et, à distance égale, la suite de codes
 * lexicographiquement la plus petite gagne.
 *
 * @param {Object} catalogue
 * @param {{min:number,max:number}} [plage]
 * @returns {Map<number, EntreeBassin>}
 */
export function construireBassin(catalogue, plage = PLAGE_BASSIN) {
  const numOps = normaliserCatalogue(catalogue).filter(
    (op) => op.from === 'NUM' && op.to === 'NUM' && !op.deprecated && !op.isJoker,
  );
  /** @type {Map<number, EntreeBassin>} */
  const bassin = new Map([[6, { dist: 0, ops: [], codes: [] }]]);

  let change = true;
  let tour = 0;
  while (change && tour < DISTANCE_MAX + 2) {
    change = false;
    tour++;
    for (let n = plage.min; n <= plage.max; n++) {
      const courant = bassin.get(n);
      if (courant && courant.dist === 0) continue;
      let meilleur = courant || null;
      for (const op of numOps) {
        const cible = appliquerOp(op, etat('NUM', n, []));
        if (cible === null) continue;
        const suite = bassin.get(cible.valeur);
        if (!suite) continue;
        const candidat = {
          dist: suite.dist + 1,
          ops: [op].concat(suite.ops),
          codes: [op.code].concat(suite.codes),
        };
        if (candidat.dist > DISTANCE_MAX) continue;
        if (!meilleur
          || candidat.dist < meilleur.dist
          || (candidat.dist === meilleur.dist && comparerCodes(candidat.codes, meilleur.codes) < 0)) {
          meilleur = candidat;
        }
      }
      if (meilleur && meilleur !== courant) {
        const avant = courant ? courant.codes.join('+') : null;
        if (avant === null || meilleur.dist < courant.dist
          || comparerCodes(meilleur.codes, courant.codes) < 0) {
          bassin.set(n, meilleur);
          change = true;
        }
      }
    }
  }
  return bassin;
}

/** Statistiques de couverture — sert aux tests et au débogage. */
export function statistiquesBassin(bassin, plage = PLAGE_BASSIN) {
  const parDistance = new Map();
  for (const [, e] of bassin) parDistance.set(e.dist, (parDistance.get(e.dist) || 0) + 1);
  const total = plage.max - plage.min + 1;
  return {
    total,
    couverts: bassin.size,
    pourcentage: Math.round((1000 * bassin.size) / total) / 10,
    parDistance: [...parDistance.entries()].sort((a, b) => a[0] - b[0]),
    distanceMax: Math.max(...[...parDistance.keys()]),
  };
}

/** @returns {Object[]|null} la suite d'opérateurs NUM→NUM qui mène `n` à 6. */
export function cheminVers6(bassin, n) {
  const e = bassin.get(n);
  return e ? e.ops : null;
}
