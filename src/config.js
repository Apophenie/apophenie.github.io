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

/**
 * Ce que la recherche s'autorise, en tout, pour une saisie.
 *
 * ★ **PASSÉ DE 3 000 À 5 000**, et la condition posée par l'auteur est
 * désormais remplie : « on peut assouplir le budget temps en insérant une jauge
 * de progression pour la phase de recherche avec suivi d'avancement.
 * L'important n'est pas que ça paraisse instantané, mais que l'utilisateur voie
 * que c'est en cours et que le résultat est en vue — pas un waiter à durée non
 * identifiée. »
 *
 * ⚠️ **Et la jauge n'est PAS un Worker**, contrairement à ce que la première
 * rédaction de ce fichier annonçait. `dist/` doit s'ouvrir par double-clic, donc
 * en `file://`, où l'origine est « null » : `new Worker()` y est refusé, et un
 * worker de Blob l'est aussi. La recherche rend donc la main à la boucle
 * d'événements ENTRE SES FRAGMENTS, ce qu'elle peut faire parce qu'elle les
 * traite déjà un par un et qu'elle compte son travail (`bfs.js ›
 * comptabiliser`). Le fil principal peint entre deux tranches ; l'avancement
 * qu'affiche la jauge est le compte réel des fragments traités, pas une
 * estimation.
 */
export const BUDGET_TOTAL_MS = 5000;

/**
 * Ce qu'elle s'autorise pour UN fragment, dans le pipeline complet. C'est un
 * filet, pas un budget : la borne qui décide vraiment est déterministe et se
 * compte en applications d'opérateurs (voir `bfs.js › BUDGET_TRAVAIL`).
 */
export const BUDGET_MS_FILET = 1000;

/** Le plafond d'un appel direct à `chercherSix` (CONTRACTS §5). */
export const BUDGET_MS = 250;

/**
 * Le plafond d'avant la jauge. Conservé pour que le test qui gèle le rapport
 * entre les deux ait de quoi comparer, et pour qu'on retrouve d'où l'on vient.
 */
export const BUDGET_TOTAL_MS_SANS_PROGRESSION = 3000;
