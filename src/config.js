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
 * ═══════════════════════ POURQUOI UNE SECONDE, ET PAS CINQ ═══════════════════
 *
 * « S'il y a une barre (ou un cercle) de progression pour la recherche, avec un
 * avancement lisible, alors on peut dépasser le budget d'une seconde pour aller
 * disons jusqu'à cinq secondes max » (l'auteur). La condition est la bonne, et
 * elle n'est PAS remplie aujourd'hui — c'est mesurable en une ligne :
 * `src/recherche/index.js › creerCanal` porte encore le commentaire « à brancher
 * sur `worker.onmessage` LE JOUR OÙ l'on passe au Worker ».
 *
 * La recherche tourne donc sur le fil principal, et un fil principal qui calcule
 * ne peint pas. Une barre de progression y serait un mensonge : elle s'afficherait
 * à 0 %, ne bougerait pas, et sauterait à 100 % à la fin. Ce qu'on gagnerait en
 * temps de calcul, on le paierait en interface gelée — et cinq secondes de gel
 * sont pires que trois voies de moins.
 *
 * Ce qu'il faut pour lever le plafond, dans l'ordre :
 *
 *  1. faire passer la recherche dans un Worker. Le chemin est déjà tracé :
 *     `creerCanal` parle en messages et `serialisable()` retire déjà les
 *     objets non clonables. Il manque le fichier de worker et son branchement ;
 *  2. faire émettre au moteur un avancement — il en a déjà la matière, il
 *     compte ses fragments et son travail (`comptabiliser`) ;
 *  3. alors, et alors seulement, monter `BUDGET_TOTAL_MS` à 5 000 ici.
 *
 * La constante est écrite pour que ce dernier geste soit d'une ligne.
 */

/** Ce que la recherche s'autorise, en tout, pour une saisie. */
export const BUDGET_TOTAL_MS = 3000;

/**
 * Ce qu'elle s'autorise pour UN fragment, dans le pipeline complet. C'est un
 * filet, pas un budget : la borne qui décide vraiment est déterministe et se
 * compte en applications d'opérateurs (voir `bfs.js › BUDGET_TRAVAIL`).
 */
export const BUDGET_MS_FILET = 1000;

/** Le plafond d'un appel direct à `chercherSix` (CONTRACTS §5). */
export const BUDGET_MS = 250;

/**
 * Le plafond que l'auteur autorise LE JOUR OÙ la progression sera lisible.
 * Il n'est lu par personne : il est là pour que la valeur cible ne se perde pas
 * entre deux sessions, et pour qu'un test puisse rappeler la condition.
 */
export const BUDGET_TOTAL_MS_AVEC_PROGRESSION = 5000;
