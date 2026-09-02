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
 * ★ LA PUISSANCE DE FOUILLE — une réglette 2^N, de 0 à 7.
 *
 * Tous les plafonds ci-dessus (et ceux, déterministes, de `bfs.js ›
 * BUDGET_TRAVAIL*`) décrivent UNE recherche : celle qui doit rendre la main
 * assez vite pour qu'on la regarde. Ils n'ont rien à dire de celle qu'on lance
 * exprès pour aller plus loin, et qu'on accepte d'attendre.
 *
 * La réglette dit exactement ce supplément, en une seule grandeur : le cran N
 * multiplie TOUS les budgets par 2^N, du cran 0 (×1, ce que le site fait
 * aujourd'hui) au cran 7 (×128, soit jusqu'à 128 millions d'applications
 * d'opérateurs et un filet temporel à dix minutes).
 *
 * ★ **Un seul facteur pour tous les budgets, et non un réglage par budget.**
 * Ces bornes forment un système : le budget global décide du NOMBRE de
 * fragments cherchés, le budget par fragment décide de la PROFONDEUR de
 * chacun, la réserve protège les douze fragments garantis. Ne relever que l'un
 * des trois ne « cherche pas deux fois plus », il déplace le goulot — mesuré
 * dès le premier essai : le seul budget global relevé, la recherche parcourt
 * plus de fragments mais les explore exactement aussi peu, et la liste ne
 * change quasiment pas. Le facteur unique est ce qui rend la réglette lisible :
 * un cran de plus, c'est deux fois plus de tout.
 *
 * ★ **Le FILET TEMPOREL suit, sinon il annule la réglette.** À budget de
 * travail multiplié par huit, cinq secondes de filet mordent avant la borne
 * déterministe : la recherche s'écourterait à l'horloge, donc de façon non
 * reproductible (§4.4), au moment précis où l'on demande davantage. Le filet
 * reste un filet — il ne doit jamais décider — donc il monte avec le reste.
 *
 * ★ **Le cran par défaut est 0, et il rend les constantes TELLES QUELLES.**
 * `1 << 0` vaut 1, la multiplication est l'identité : au défaut, pas un budget
 * ne change de valeur, et la recherche d'aujourd'hui reste au bit près celle
 * d'aujourd'hui. C'est le même invariant que celui des quatre curseurs
 * (`recherche/score.js › ponderer`), et il se vérifie de la même façon.
 *
 * ── CE QU'ELLE CHANGE, MESURÉ ──────────────────────────────────────────────
 *
 * Relevé sur quatre saisies, moteur sans filet temporel, crans 0 à 3 :
 *
 *   `hope`                              identique aux quatre crans (67–168 ms)
 *   `https://hope-hope-hope.fr/`        identique aux quatre crans (431–575 ms)
 *   `Le chat dort sur le tapis rouge`   identique aux quatre crans (744–1 196 ms)
 *   `La numérologie est une science exacte, disent-ils`
 *       cran 0 : **tronquée**, tête à 2 954
 *       cran 1 : entière, tête à **5 296**, liste différente (847 → 1 292 ms)
 *       crans 2 et 3 : identiques au cran 1
 *
 * C'est exactement ce qu'on attend d'une réglette de fouille, et c'est ce qui
 * justifie de la publier : **elle ne fait rien là où le budget ne mordait pas,
 * et elle fait tout là où il mordait.** Sur la saisie longue, le cran 0 rend une
 * liste marquée `tronque` dont la meilleure voie vaut 2 954 ; un seul cran de
 * plus suffit à finir la recherche et la tête double. Au-delà, plus rien ne
 * change : la recherche a fini, les crans 2 à 7 ne servent qu'aux saisies
 * encore plus lourdes.
 *
 * ⚠️ Ce n'est PAS une préférence utilisateur au sens de `src/app/reglages.js` :
 * la puissance voyage dans l'URL (`recherche/url.js`, marqueur `f<N>!`), parce
 * qu'une liste obtenue en fouillant huit fois plus n'est pas la même liste, et
 * qu'un lien qui ne la porterait pas rendrait autre chose que ce qu'on partage.
 */
export const PUISSANCE_DE_FOUILLE_DEFAUT = 0;
export const PUISSANCE_DE_FOUILLE_MAX = 7;

/**
 * Les budgets d'un cran de fouille.
 *
 * ⚠️ Ne rend PAS les budgets de travail (`bfs.js › BUDGET_TRAVAIL`,
 * `BUDGET_TRAVAIL_TOTAL`, `BUDGET_TRAVAIL_RESERVE`) : ils vivent là où ils se
 * justifient, et `config.js` n'a jamais eu le droit de les redéfinir (voir
 * l'en-tête de ce fichier). C'est `facteur` qui traverse, et
 * `recherche/index.js` l'applique à ces trois-là au point d'appel.
 *
 * @param {number} puissance  le cran demandé ; borné, jamais refusé
 * @returns {{puissance:number, facteur:number, budgetTotalMs:number, budgetMsFilet:number}}
 */
export function reglagesDeBudget(puissance = PUISSANCE_DE_FOUILLE_DEFAUT) {
  const n = normaliserPuissance(puissance);
  const facteur = 1 << n;
  return {
    puissance: n,
    facteur,
    // ★ **DEUX PLAFONDS QUE LE FACTEUR NE FRANCHIT PAS**, et ils viennent de
    //   l'auteur au mot près : « augmentable jusqu'à ×128, en repoussant avec
    //   profondeur max autour de 32 et durée à 128 s ».
    //
    //   Le TEMPS d'abord : multiplié tel quel, le cran 7 demanderait vingt et
    //   une minutes là où l'auteur en accorde deux. Ce n'est pas la même chose
    //   qu'un budget de travail — celui-ci est déterministe et se dépense en
    //   applications d'opérateurs, le temps est un FILET et un filet qui ne
    //   ferme jamais n'en est plus un.
    //
    //   La PROFONDEUR ensuite, et elle ne bouge qu'AU-DESSUS du cran d'ouverture
    //   de l'énumération : en deçà, la raccourcir n'économiserait rien — c'est
    //   le faisceau qui borne, mesuré à +17 % de temps pour deux fois et demie
    //   la profondeur — et priverait la recherche de voies qu'elle sait déjà
    //   trouver. Le cran ne fait donc que REPOUSSER, jamais rétrécir.
    budgetTotalMs: Math.min(BUDGET_MS_PLAFOND, BUDGET_TOTAL_MS * facteur),
    budgetMsFilet: Math.min(BUDGET_MS_PLAFOND, BUDGET_MS_FILET * facteur),
    dMax: Math.min(D_MAX_PLAFOND, D_MAX_BASE + Math.max(0, n - PUISSANCE_ENUMERATION) * 4),
  };
}

/** « Durée à 128 s » — la borne haute du filet temporel, quel que soit le cran. */
export const BUDGET_MS_PLAFOND = 128000;

/** « Profondeur max autour de 32 » — et celle du régime ordinaire. */
export const D_MAX_BASE = 15;
export const D_MAX_PLAFOND = 32;

/**
 * ★ **DEUX CRANS D'OUVERTURE, PARCE QU'IL Y A DEUX PATIENCES.**
 *
 * > « Le budget de travail par défaut devrait rester le même pour les recherches
 * >   depuis la page d'accueil. En revanche, les recherches effectuées depuis la
 * >   page d'énumération devraient avoir un budget réglable, par défaut ×4 le
 * >   budget historique. » (l'auteur)
 *
 * La page d'accueil répond à quelqu'un qui vient de taper son nom : il attend
 * une liste, pas une fouille. L'énumération répond à quelqu'un qui CONSTRUIT une
 * voie — il a écrit un programme à trous, il sait ce qu'il cherche, il peut
 * attendre. Le même moteur, deux patiences ; c'est l'APPELANT qui choisit, la
 * réglette ne préjuge de rien.
 */
export const PUISSANCE_ACCUEIL = 0;      // ×1, le budget historique
export const PUISSANCE_ENUMERATION = 2;  // ×4, l'ouverture de l'énumération

/**
 * Un cran, ramené à un entier de [0, PUISSANCE_DE_FOUILLE_MAX].
 * Ce qui n'est pas un nombre vaut le défaut : un réglage absent n'est pas un
 * réglage à zéro par hasard, c'est un réglage qu'on n'a pas touché — et zéro se
 * trouve être le défaut, ce qui rend les deux lectures indiscernables ici, mais
 * la règle est écrite pour le jour où le défaut bougerait.
 */
export function normaliserPuissance(puissance) {
  const n = Number(puissance);
  if (!Number.isFinite(n)) return PUISSANCE_DE_FOUILLE_DEFAUT;
  const e = Math.trunc(n);
  if (e < 0) return 0;
  return e > PUISSANCE_DE_FOUILLE_MAX ? PUISSANCE_DE_FOUILLE_MAX : e;
}

/**
 * ★ **LE DÉCOUPAGE PAR DÉFAUT — son code, et pourquoi il vit ICI.**
 *
 * `t.caracteres` (« un caractère, un jeton ») est implicite à deux titres : il
 * ne s'écrit pas dans les liens (`recherche/url.js`) et il ne se facture pas
 * comme une étape (`recherche/score.js › coutRendu`). Ces deux modules-là ne
 * peuvent pas se le passer l'un à l'autre — `url.js` importe déjà `score.js`,
 * et le chemin inverse fermerait un cycle. Il vit donc dans `config.js`, qui
 * n'importe rien : c'est le seul endroit d'où les deux peuvent le lire sans se
 * tenir par la main.
 */
export const CODE_DECOUPE_IMPLICITE = 'tca';

/**
 * ★ **LE PLAFOND DES SÉRIES — au plus « 666 » neuf fois.**
 *
 * Il vivait dans `assemblage.js`, où il DÉCIDE, et il en existait une COPIE dans
 * `score.js › REGLAGES.SERIES_PLAFOND`, où il sert de repère au curseur de
 * quantité. La copie portait ce commentaire : « Un test le recoupe avec ce que
 * le moteur produit réellement, faute de quoi les deux se perdraient de vue le
 * jour où l'un des deux bouge. »
 *
 * ⚠️ **CE TEST N'EXISTAIT PAS.** Il comparait `REGLAGES.SERIES_PLAFOND` à
 *   lui-même, des deux côtés de l'assertion : il ne pouvait donc rien détecter.
 *   Et les deux s'étaient PERDUS DE VUE, exactement comme le commentaire le
 *   craignait — le vrai plafond était passé à 9, la copie disait toujours 6.
 *
 * On ne le recoupe donc plus : il n'y a plus qu'un seul nombre. Il vit ici parce
 * que `assemblage.js` importe `score.js` — le chemin inverse fermerait un cycle
 * — et que `config.js` n'importe rien.
 */
export const MAX_SERIES = 9;
