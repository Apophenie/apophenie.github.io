/**
 * ★ LES RÉGLAGES QU'ON VIENT CHANGER SANS LIRE LE MOTEUR.
 *
 * Ce fichier ne contient AUCUNE règle : il ne porte que les bornes de temps de
 * la recherche, celles qu'on veut pouvoir relever ou abaisser sans aller
 * chercher où elles sont défendues. Tout le reste — barème d'élégance, poids du
 * score, largeurs de faisceau — vit là où il se justifie, et n'a rien à faire
 * ici : un réglage qu'on peut changer sans comprendre est un réglage dont on
 * peut mesurer l'effet ; les autres demandent qu'on lise leur raison d'abord.
 *
 * ⚠️ Ce ne sont PAS des préférences utilisateur. Le thème, le son et le rythme
 * des répétitions vivent dans `src/app/reglages.js` et se stockent chez le
 * visiteur ; ceux-ci sont des propriétés du produit, identiques pour tous.
 *
 * ═══════════════════════ POURQUOI CINQ SECONDES, ET PLUS UNE ═════════════════
 *
 * « S'il y a une barre (ou un cercle) de progression pour la recherche, avec un
 * avancement lisible, alors on peut dépasser le budget d'une seconde pour aller
 * disons jusqu'à cinq secondes max » (l'auteur). La condition est remplie : la
 * recherche rend la main pendant qu'elle cherche, elle annonce son avancement
 * fragment par fragment, et l'interface le montre (`src/app/jauge.js`).
 *
 * ⚠️ **L'ancien argumentaire de ce fichier disait qu'un Worker était impossible
 * en `file://`. C'est FAUX, et c'est mesuré** — les trois relevés qui ont servi
 * à trancher, page ouverte au double-clic sous Chromium 151 et Firefox 154 :
 *
 *   · `new Worker('travailleur.js')` — REFUSÉ des deux côtés. Chromium le dit
 *     mot pour mot : « Script … cannot be accessed from origin "null" » ;
 *   · `new Worker(URL.createObjectURL(new Blob([…])))` — ACCEPTÉ des deux
 *     côtés. Un blob hérite de l'origine du document, fût-elle opaque ;
 *   · depuis ce travailleur-là, `importScripts('file://…/assets/index-*.js')` —
 *     ACCEPTÉ des deux côtés. C'est ce qui rend l'inlinage gratuit : le
 *     travailleur ne recharge pas une copie du moteur, il recharge **le fichier
 *     unique que la page vient elle-même d'exécuter** (voir
 *     `src/app/travailleur.js`, qui porte le relevé complet).
 *
 * Le repli sans Worker n'a pas disparu pour autant, et il n'est pas décoratif :
 * la recherche se découpe en tranches et rend la main entre elles, si bien que
 * la jauge avance pour de bon là où aucun travailleur ne peut naître.
 *
 * Ce qui reste vrai de l'ancien texte : une jauge qui ne bouge pas est un
 * mensonge, et cinq secondes de gel valent moins que trois voies de moins.
 * C'est pour ça que le plafond n'a été levé qu'APRÈS l'avancement, et pas
 * l'inverse.
 */

/**
 * Ce que la recherche s'autorise, en tout, pour une saisie.
 *
 * ⚠️ C'est un FILET, pas une durée visée : la borne qui décide vraiment est
 * déterministe et se compte en applications d'opérateurs (`bfs.js ›
 * BUDGET_TRAVAIL_TOTAL`). Mesuré sur le corpus du banc, une saisie longue
 * dépense aujourd'hui 1,1 à 1,4 s de calcul : le filet ne se déclenche jamais
 * en régime normal, et c'est exactement ce qu'on lui demande.
 */
export const BUDGET_TOTAL_MS = 10000;

/**
 * Ce qu'elle s'autorise pour UN fragment, dans le pipeline complet. C'est un
 * filet, pas un budget : la borne qui décide vraiment est déterministe et se
 * compte en applications d'opérateurs (voir `bfs.js › BUDGET_TRAVAIL`).
 */
export const BUDGET_MS_FILET = 1000;

/** Le plafond d'un appel direct à `chercherSix` (CONTRACTS §5). */
export const BUDGET_MS = 250;

/**
 * ★ LA TRANCHE — combien de temps la recherche calcule avant de rendre la main.
 *
 * Elle ne concerne QUE le chemin sans Worker (`src/recherche/tranches.js`) :
 * dans un travailleur, personne n'attend le fil, et la tranche n'y sert plus
 * qu'à laisser passer les messages d'annulation.
 *
 * Le réglage est un arbitrage entre deux nuisances, et les deux sont mesurées
 * (Chromium 151, `dist/` ouvert en `file://`) :
 *
 *   · trop LONGUE, la page saccade — une tranche de 100 ms, c'est six images
 *     perdues d'affilée à 60 Hz, et une jauge qui progresse par à-coups ;
 *   · trop COURTE, on paie le retour à la boucle d'événements à chaque
 *     fragment. Le prix relevé est de **0,134 ms par reprise** en
 *     `MessageChannel` — soit ~1 % à 12 ms de tranche. (Le repli
 *     `setTimeout(…, 0)`, lui, coûte **3,97 ms** : le plancher de 4 ms de la
 *     spécification, vérifié plutôt que supposé.)
 *
 * 12 ms tient dans une image de 60 Hz (16,7 ms) en laissant de quoi peindre, ce
 * qui est précisément la promesse de la jauge : elle bouge PENDANT le calcul.
 *
 * ⚠️ MAIS LA TRANCHE NE PEUT PAS ÊTRE PLUS FINE QU'UN FRAGMENT. La recherche ne
 * rend la main qu'entre deux fragments, jamais au milieu d'un, sans quoi le
 * résultat cesserait d'être reproductible (§4.4). Mesuré sur « La numérologie
 * est une science exacte, disent-ils » : le premier fragment — la phrase
 * entière — coûte à lui seul 590 ms, les douze suivants une centaine chacun. La
 * page peint donc une image par fragment, soit une dizaine par seconde, et
 * 12 ms est un PLANCHER de découpe, pas une garantie de fluidité.
 */
export const TRANCHE_MS = 12;

/**
 * ★ **LA RÉGLETTE DE FOUILLE — une puissance de deux, de 0 à 7.**
 *
 * > « Le budget de travail par défaut devrait rester le même pour les recherches
 * >   depuis la page d'accueil. En revanche, les recherches effectuées depuis la
 * >   page d'énumération devraient avoir un budget réglable, par défaut ×4 le
 * >   budget historique, augmentable jusqu'à ×128 (en repoussant avec profondeur
 * >   max autour de 32 et durée à 128 s) et rabaissable jusqu'à ×1. C'est une
 * >   réglette en puissance de 2 (de 0 à 7, par défaut 2, donc 2^N). »
 * >   (l'auteur)
 *
 * ★ **POURQUOI DEUX RÉGIMES, ET PAS UN SEUL RELEVÉ GLOBAL.** La page d'accueil
 *   répond à quelqu'un qui vient de taper son nom : il attend une liste, pas une
 *   fouille. La page d'énumération répond à quelqu'un qui CONSTRUIT une voie —
 *   il a déjà écrit un programme à trous, il sait ce qu'il cherche, et il peut
 *   accepter d'attendre. Le même moteur, deux patiences.
 *
 * ★ **CE QUI SUIT LA PUISSANCE, ET CE QUI NE LA SUIT PAS.** Le TRAVAIL double à
 *   chaque cran, c'est la réglette elle-même. Le TEMPS suit, mais sans jamais
 *   descendre sous le budget ordinaire : rendre la main plus tôt que la page
 *   d'accueil n'aurait aucun sens. La PROFONDEUR, elle, ne bouge qu'AU-DESSUS du
 *   défaut — en deçà, la raccourcir n'économiserait rien (c'est le faisceau qui
 *   borne, mesuré : +17 % de temps pour deux fois et demie la profondeur) et
 *   priverait la recherche de voies qu'elle sait déjà trouver.
 *
 * @param {number} p  la position de la réglette, 0 à 7
 */
export const PUISSANCE_MAX = 7;
export const PUISSANCE_DEFAUT = 2;   // ×4, la valeur d'ouverture de l'énumération
export const PUISSANCE_ACCUEIL = 0;  // ×1, le budget historique

export function reglagesDeBudget(p) {
  const n = Math.max(0, Math.min(PUISSANCE_MAX, Math.round(Number(p) || 0)));
  const facteur = 2 ** n;
  return {
    puissance: n,
    facteur,
    budgetTravailTotal: BUDGET_TRAVAIL_TOTAL_BASE * facteur,
    budgetTotalMs: Math.max(BUDGET_TOTAL_MS, 1000 * facteur),
    dMax: Math.min(D_MAX_PLAFOND, D_MAX_BASE + Math.max(0, n - PUISSANCE_DEFAUT) * 4),
  };
}

/** Le budget de travail d'une recherche ordinaire — le « historique » de l'auteur. */
export const BUDGET_TRAVAIL_TOTAL_BASE = 1000000;

/** La profondeur du régime ordinaire, et celle qu'on ne dépasse jamais. */
export const D_MAX_BASE = 15;
export const D_MAX_PLAFOND = 32;
