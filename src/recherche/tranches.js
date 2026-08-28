// src/recherche/tranches.js
// Comment une recherche qui dure se fait voir : elle se découpe, et elle rend
// la main entre ses morceaux.
//
// ═══════════════════════ POURQUOI CE FICHIER EXISTE ═════════════════════════
//
// `creerMoteur().resoudre()` est SYNCHRONE, et le reste (CONTRACTS §5, et des
// centaines de tests qui l'appellent ainsi). Un fil qui calcule ne peint pas :
// tant que `resoudre` tient le fil, une barre de progression afficherait 0 %,
// ne bougerait pas, puis sauterait à 100 % — le « waiter à durée non
// identifiée » que l'auteur refuse explicitement.
//
// La sortie n'est pas de rendre `resoudre` asynchrone, c'est de lui donner un
// FRÈRE : le même pipeline, déroulé par un générateur qui s'arrête entre deux
// fragments (`recherche/index.js › deroulerResolution`). Deux conducteurs
// mènent alors le même dérouleur :
//
//   · `resoudre` le pousse jusqu'au bout sans reprendre son souffle — pas une
//     ligne de comportement ne change, et c'est la version que les tests et le
//     banc de mesure continuent d'appeler ;
//   · `deroulerParTranches` (ici) le pousse par tranches de quelques
//     millisecondes et rend la main entre elles.
//
// Le résultat des deux est le MÊME objet, à l'identité près : le dérouleur ne
// consulte l'horloge que pour son filet de sécurité, et ce filet-là est corrigé
// du temps rendu (voir plus bas). Un test le vérifie.

import { TRANCHE_MS } from '../config.js';

/**
 * ★ RENDRE LA MAIN — et le choix du moyen n'est pas cosmétique. Il a été MESURÉ.
 *
 * `MessageChannel` : on poste sur un port, la reprise arrive comme une tâche
 * ordinaire, et le navigateur peint entre deux. C'est le mécanisme qu'emploie
 * l'ordonnanceur de React, pour la raison exacte qui nous intéresse.
 *
 * ⚠️ `scheduler.yield()` — l'API faite pour ça (Chromium 129+) — a été essayée
 * EN PREMIER, et écartée sur mesure. Elle rend la main en gardant la priorité :
 * la reprise repasse devant les tâches ordinaires. C'est ce qu'on veut pour ne
 * pas se faire doubler ; ce n'est pas ce qu'on veut ici, où l'on rend la main
 * précisément POUR laisser peindre. Le relevé, même recherche (« La numérologie
 * est une science exacte, disent-ils »), même machine, dist ouvert en `file://`
 * sous Chromium 151, travailleur débranché :
 *
 *   · `scheduler.yield()` — la jauge passe de 32 à 100 % en 684 ms, et le
 *     navigateur ne peint que **5 images** pendant ce temps ;
 *   · `MessageChannel`   — de 32 à 100 % en 572 ms, et **9 images** peintes,
 *     soit une image par palier de la jauge, ce qui est exactement le contrat.
 *
 * Plus fluide ET plus rapide : il n'y a pas d'arbitrage à faire.
 *
 * ⚠️ `setTimeout(…, 0)` reste le dernier recours, et il n'est PAS équivalent :
 * au cinquième appel imbriqué, la spécification HTML impose un plancher de
 * 4 ms. Sur une recherche découpée en trente tranches, c'est plus de cent
 * millisecondes d'attente pure ajoutées à l'addition.
 *
 * ⚠️ `requestAnimationFrame` semblerait le candidat évident — il est aligné sur
 * la peinture. Il est écarté pour deux raisons : il n'existe pas dans un
 * travailleur (or c'est le MÊME conducteur qui y tourne), et il est mis en
 * sommeil dans un onglet d'arrière-plan — une recherche lancée puis reléguée ne
 * se terminerait jamais.
 */
export function rendreLaMain() {
  if (typeof MessageChannel === 'function') {
    return new Promise((resoudre) => {
      const canal = new MessageChannel();
      canal.port1.onmessage = () => { canal.port1.close(); resoudre(); };
      canal.port2.postMessage(0);
    });
  }
  return new Promise((resoudre) => setTimeout(resoudre, 0));
}

/**
 * Pousse un dérouleur de résolution par tranches, en rendant la main entre
 * elles, et rend son résultat.
 *
 * @param {Generator} derouleur   `moteur.deroulerResolution(saisie, options)`
 * @param {Object} [options]
 * @param {(avancement:Object)=>void} [options.surAvancement]  appelé à chaque
 *   fragment cherché, avec le compte RÉEL du travail fait (jamais une estimation).
 * @param {()=>boolean} [options.annule]  interrogé entre deux fragments ; s'il
 *   dit oui, le dérouleur est fermé proprement et la promesse rend `null`.
 * @param {number} [options.trancheMs]
 * @param {()=>number} [options.maintenant]
 * @param {()=>Promise} [options.rendreLaMain]
 * @returns {Promise<Object|null>}
 */
export async function deroulerParTranches(derouleur, options = {}) {
  const surAvancement = options.surAvancement;
  const annule = options.annule;
  const trancheMs = options.trancheMs ?? TRANCHE_MS;
  const horloge = options.maintenant || (() => performance.now());
  const souffler = options.rendreLaMain || rendreLaMain;

  let pas = derouleur.next();
  let debutTranche = horloge();
  while (!pas.done) {
    if (surAvancement) surAvancement(pas.value);
    if (annule && annule()) {
      // `return()` déroule les `finally` du générateur au lieu de l'abandonner
      // à mi-chemin : une recherche annulée ne laisse rien derrière elle.
      derouleur.return(undefined);
      return null;
    }
    if (horloge() - debutTranche < trancheMs) {
      // ★ Le zéro compte : c'est la PAUSE qu'on renvoie au dérouleur, et ici il
      //   n'y en a pas eu. Voir `index.js`, où elle est retranchée du filet.
      pas = derouleur.next(0);
      continue;
    }
    const avant = horloge();
    await souffler();
    const pause = horloge() - avant;
    debutTranche = horloge();
    // ★ LE TEMPS RENDU À LA PAGE N'EST PAS DU TEMPS DE RECHERCHE.
    //   Le filet de sécurité du moteur compare `maintenant() - début` à
    //   `BUDGET_TOTAL_MS`. Sans cette correction, une recherche découpée
    //   déclencherait son propre filet — elle passerait plus de temps à laisser
    //   peindre qu'à chercher sur une machine chargée, et la liste se
    //   tronquerait pour avoir été polie. Le dérouleur recule donc son origine
    //   de la durée exacte de la pause : il mesure ce qu'il a calculé, pas ce
    //   qu'il a attendu.
    pas = derouleur.next(pause);
  }
  return pas.value;
}

export { TRANCHE_MS };
