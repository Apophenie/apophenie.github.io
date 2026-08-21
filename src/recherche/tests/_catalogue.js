// Catalogue employé par les tests du moteur de recherche.
//
// Le moteur de recherche n'écrit JAMAIS dans `src/moteur/` : il code contre le
// contrat de CONTRACTS.md §2.2 et consomme le catalogue tel qu'il est livré.
// L'import est direct et l'échec est bruyant — c'est ce qu'exige §2.2 (« pas de
// dégradation silencieuse ») : un catalogue absent ou cassé doit faire tomber la
// suite, pas la faire passer sur un double.
//
// (Un catalogue de fixtures a servi tant que `src/moteur/catalogue.js` n'existait
// pas ; il a été retiré dès sa livraison, pour ne pas laisser deux vérités.)

import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

import { CATALOGUE } from '../../moteur/catalogue.js';

export const catalogue = CATALOGUE;
export const source = 'src/moteur/catalogue.js';

/** Horloge injectable : aucune source d'entropie dans les tests déterministes. */
export function horlogeFactice(pas = 1) {
  let t = 0;
  return () => (t += pas);
}

/**
 * Charge CPU réelle, pour les tests de déterminisme « sous charge ».
 *
 * Un test de déterminisme qui ne tourne que sur une machine inoccupée ne prouve
 * rien : le défaut corrigé — la recherche bornée par `performance.now()` — ne
 * se voyait qu'à la charge. On la fabrique donc, avec `worker_threads` du cœur
 * de Node (zéro dépendance, cf. CONTRACTS §0.1).
 *
 * La boucle est découpée par `setImmediate` pour que le worker reste capable de
 * recevoir son ordre d'arrêt : un `while (true)` synchrone ne se termine pas.
 */
const PARASITE = `
  const { parentPort } = require('node:worker_threads');
  let vivant = true;
  parentPort.on('message', () => { vivant = false; });
  let x = 0;
  (function tourner() {
    for (let i = 0; i < 300000; i++) x = (x * 31 + i) % 1000003;
    if (vivant) setImmediate(tourner);
    else parentPort.close();
  })();
`;

export function demarrerCharge(facteur = 2) {
  const coeurs = availableParallelism();
  const n = Math.max(2, Math.min(16, Math.round(coeurs * facteur)));
  return Array.from({ length: n }, () => new Worker(PARASITE, { eval: true }));
}

export async function arreterCharge(parasites) {
  await Promise.all((parasites || []).map((w) => w.terminate()));
}

export function operateur(id) {
  const ops = catalogue.operateurs || catalogue;
  const op = ops.find((o) => o.id === id);
  if (!op) throw new Error(`opérateur introuvable dans le catalogue : ${id}`);
  return op;
}
