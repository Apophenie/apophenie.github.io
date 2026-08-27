// src/recherche/bassin.js
// Bassin d'attraction d'un CHIFFRE par les seuls opérateurs NUM→NUM.
// CONTRACTS.md §5 · research/heuristique.md §2.4.
//
// ★ « d'un chiffre », et non plus « de 6 ». Le but est devenu un paramètre le
// jour où la cible en est devenue un (`cible.js`) : viser `007`, c'est vouloir
// des chemins qui atterrissent sur 0 ET des chemins qui atterrissent sur 7,
// donc deux bassins. Le défaut vaut 6 et le calcul est mot pour mot celui
// d'avant — une table construite pour 6 est bit pour bit celle d'hier.
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

/** Notoriété cumulée d'une suite d'opérateurs, en millièmes entiers. */
function notoriete(ops) {
  let t = 0;
  for (const op of ops) t += Math.round((op.notoriete ?? 0) * 1000);
  return t;
}

/**
 * Ordre entre deux routes de secours : la plus courte, puis la plus notoire,
 * puis l'ordre des codes. Négatif si `a` doit l'emporter.
 */
function comparerRoutes(a, b) {
  return (a.dist - b.dist)
    || (notoriete(b.ops) - notoriete(a.ops))
    || comparerCodes(a.codes, b.codes);
}

export const PLAGE_BASSIN = { min: -2000, max: 2000 };
// « + 2 niveaux gratuits » (CONTRACTS.md §5) : le bassin ne remonte pas au-delà
// de 2 opérateurs. Au-delà, ce ne sont plus des raccourcis mais des acrobaties,
// et le score les punirait de toute façon.
export const DISTANCE_MAX = 2;

/**
 * @typedef {{dist:number, ops:Object[], codes:string[]}} EntreeBassin
 */

/**
 * ★ À DISTANCE ÉGALE, C'EST LA NOTORIÉTÉ QUI TRANCHE — pas l'orthographe du code.
 *
 * Le bassin ne retient qu'UNE route de secours par entier. Elle départageait
 * jadis les ex æquo sur la suite de codes la plus petite, ce qui revenait à
 * laisser l'alphabet arbitrer une question de fond : `p.racineNumerique` (0,85)
 * et `p.modulo9` (0,4) ramènent tous deux 15 sur 6 en un pas, et seule leur
 * épellation les séparait. Tant que les codes s'appelaient `p1` et `p8`, la
 * réduction numérique — la plus notoire — l'emportait par chance ; renommés
 * `prn` et `pm9`, la chance a tourné et `hope-hope-hope.fr` a perdu sa plus
 * belle résonance (élégance 1 359 → 1 164) sans qu'aucune règle n'ait changé.
 *
 * On fait donc dire à ce choix ce qu'il prétendait dire : la route la plus
 * courte d'abord, la plus notoire ensuite, et l'ordre des codes en tout dernier
 * — là, uniquement pour que deux exécutions donnent le même résultat.
 *
 * La notoriété est comparée en millièmes entiers : les flottants du catalogue
 * ne servent qu'à écrire la table, jamais à décider (CONTRACTS.md §4.4).
 *
 * @param {Object} catalogue
 * @param {{min:number,max:number}} [plage]
 * @param {number} [but]  le chiffre visé — 6 par défaut, et tout est identique
 * @returns {Map<number, EntreeBassin>}
 */
export function construireBassin(catalogue, plage = PLAGE_BASSIN, but = 6) {
  const numOps = normaliserCatalogue(catalogue).filter(
    (op) => op.from === 'NUM' && op.to === 'NUM' && !op.deprecated && !op.isJoker,
  );
  /** @type {Map<number, EntreeBassin>} */
  const bassin = new Map([[but, { dist: 0, ops: [], codes: [] }]]);

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
        if (!meilleur || comparerRoutes(candidat, meilleur) < 0) meilleur = candidat;
      }
      if (meilleur && meilleur !== courant && (!courant || comparerRoutes(meilleur, courant) < 0)) {
        bassin.set(n, meilleur);
        change = true;
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

/** @returns {Object[]|null} la suite d'opérateurs NUM→NUM qui mène `n` au but du bassin. */
export function cheminVers6(bassin, n) {
  const e = bassin.get(n);
  return e ? e.ops : null;
}
