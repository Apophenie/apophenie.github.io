// src/recherche/travailleur.js
// Le CORPS du travailleur : ce qui tourne de l'autre côté du `postMessage`.
//
// Il ne fait presque rien, et c'est voulu. Tout ce qu'il sait faire, c'est
// brancher `creerCanal` (`./index.js`) sur une portée de travailleur. Le
// protocole, l'avancement, l'annulation par génération, la sérialisation :
// tout cela vit déjà dans le moteur, et vit là pour que le fil principal
// puisse s'en servir à l'identique quand aucun travailleur ne peut naître.
// Un seul protocole, deux moteurs d'exécution — voir `src/app/travailleur.js`.
//
// ═════════════════ COMMENT CE FICHIER ARRIVE DANS UN TRAVAILLEUR ════════════
//
// Deux chemins, selon ce que le navigateur exécute (le détail des mesures est
// dans `src/app/travailleur.js`, qui les a faites) :
//
//   · SOURCES servies en modules ES — le travailleur est créé directement sur
//     ce fichier, `{ type: 'module' }`. Le module s'installe alors tout seul,
//     à la fin de ce fichier ;
//   · FICHIER UNIQUE construit (`dist/`) — le travailleur charge par
//     `importScripts` le MÊME script que la page vient d'exécuter. Ce fichier
//     y est déjà, puisqu'il est empaqueté avec le reste ; son corps s'exécute
//     au chargement du script, et l'installation automatique joue pareil.
//
// Dans les deux cas, personne n'appelle `installerTravailleur` de l'extérieur :
// c'est le fait D'ÊTRE CHARGÉ dans un travailleur qui l'installe.

import { creerMoteur, chargerCatalogue, creerCanal } from './index.js';

/**
 * Sommes-nous dans un travailleur ?
 *
 * `WorkerGlobalScope` est le seul témoin qui vaille : il est absent d'une page
 * et présent dans les deux formes de travailleur (classique et module).
 * `typeof importScripts === 'function'` ne dirait pas la vérité — c'est le
 * témoin du travailleur CLASSIQUE seulement, et le chemin « sources » en crée
 * un de type module.
 */
export function dansUnTravailleur(portee) {
  return typeof WorkerGlobalScope === 'function'
    && typeof portee === 'object' && portee !== null
    && portee instanceof WorkerGlobalScope;
}

/** Les portées déjà branchées. Un ensemble faible plutôt qu'un booléen : les
 *  tests installent sur des portées de doublure, et un drapeau unique leur
 *  ferait croire à un refus alors qu'il ne s'agit pas de la même portée. */
const branchees = new WeakSet();

/**
 * Branche le canal de recherche sur une portée de travailleur.
 *
 * ★ Idempotent, et il le faut : dans le fichier unique, ce module est évalué au
 *   chargement du script ET référencé par `src/app/main.js`. Deux installations
 *   poseraient deux `onmessage`, dont le second effacerait le premier — ce qui
 *   marcherait par accident, jusqu'au jour où l'ordre changerait.
 *
 * @param {Object} [portee]  la portée globale ; injectable pour les tests.
 * @returns {boolean} vrai si le branchement a eu lieu.
 */
export function installerTravailleur(portee = (typeof self === 'undefined' ? null : self)) {
  if (!portee || typeof portee.postMessage !== 'function' || branchees.has(portee)) return false;
  branchees.add(portee);

  const poster = (message) => { portee.postMessage(message); return message; };

  // ★ Le catalogue se charge de façon asynchrone (`chargerCatalogue`), et les
  //   messages n'attendent pas : la page peut très bien demander une recherche
  //   avant que le moteur existe. On ne perd rien — on met en file, et on
  //   déroule dans l'ordre d'arrivée dès que le canal est là.
  const attente = [];
  let canal = null;

  chargerCatalogue()
    .then((catalogue) => {
      canal = creerCanal(creerMoteur(catalogue), poster);
      poster({ type: 'pret' });
      while (attente.length) canal.traiterProgressif(attente.shift());
      return canal;
    })
    .catch((err) => {
      // Un travailleur qui ne peut pas charger le catalogue ne doit pas rester
      // muet : la page l'attend, et son repli local, lui, marchera peut-être.
      poster({ type: 'erreur', message: String((err && err.message) || err) });
      return null;
    });

  portee.onmessage = (evenement) => {
    const message = evenement && evenement.data;
    if (!message) return;
    // Le battement de cœur du lanceur : il sert à savoir si ce travailleur est
    // né vivant, avant de lui confier quoi que ce soit (`app/travailleur.js`).
    if (message.type === 'ping') { poster(canal ? { type: 'pret' } : { type: 'attente' }); return; }
    if (message.type !== 'resoudre') return;
    if (canal) canal.traiterProgressif(message);
    else attente.push(message);
  };

  return true;
}

// ── L'installation automatique. Charger ce fichier DANS un travailleur, c'est
//    l'installer ; l'importer depuis une page ne fait rien du tout.
if (dansUnTravailleur(typeof self === 'undefined' ? null : self)) installerTravailleur();
