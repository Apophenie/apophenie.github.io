/**
 * LES CAS À ARBITRER — les voies qui ont changé de place, et leurs deux états.
 *
 * ★ CE QUE CETTE LISTE EST, ET CE QU'ELLE N'EST PAS.
 *
 * Ce n'est pas une table de vérité : c'est le relevé d'un désaccord, ou d'une
 * question ouverte, entre deux voies. Les deux se rejouent aujourd'hui, avec les
 * gestes d'aujourd'hui — ce qui est comparé est la VOIE, jamais deux versions du
 * rendu. C'est aussi la limite de cet instrument, et il faut la connaître : il
 * ne sait pas montrer « avant ma correction / après ma correction » sur une
 * ANIMATION. Une correction de geste se voit en rejouant la même URL des deux
 * côtés, ce qui n'aurait aucun intérêt ici ; elle se juge sur `debug.html`.
 *
 * ★ ELLE EST ÉCRITE À LA MAIN, ET C'EST ASSUMÉ. Tout le reste de ce dépôt
 *   refuse les tables recopiées ; celle-ci en est une, et le refus ne s'y
 *   applique pas — parce qu'elle ne DÉCRIT rien qui soit calculable. Une voie
 *   soumise au jugement a été mesurée à un instant, sur un commit, et c'est ce
 *   relevé qu'on soumet. La recalculer serait impossible ; la déduire, un
 *   mensonge.
 *
 * ★ **LES DEUX CÔTÉS COMPARENT DÉSORMAIS DES CANDIDATS À LA MÊME PLACE.**
 *
 *   > « Si tu veux me faire comparer des versions de manière pertinente, tu
 *   >   devrais me proposer 2 candidats à la 1ʳᵉ place ensemble, puis 2
 *   >   candidats à la 2ᵈ place ensemble. Là ça fait 2 cas où il y a à gauche
 *   >   une version concise et élégante, et à droite une version avec beaucoup
 *   >   d'exemplaires du motif 666. » (l'auteur)
 *
 *   C'est un défaut de MÉTHODE, et il faussait la question : opposer une voie
 *   brève à une voie fournie ne demande pas « laquelle est la meilleure », ça
 *   demande « quel critère préférez-vous » — question à laquelle la liste
 *   répond déjà, en donnant une ligne à chacun. Chaque cas porte donc
 *   maintenant une `place` (1 ou 2), et les deux liens qu'il oppose visent
 *   celle-là.
 *
 * ★ **LES NEUF CAS PRÉCÉDENTS ONT TOUS ÉTÉ ARBITRÉS**, et ce qui en est sorti
 *   est écrit là où ça s'applique : le plafond des séries qui rabotait le
 *   comptage (`assemblage.js › MAX_SERIES`), le malus d'étape qui ne mordait
 *   sur rien (`score.js › REGLAGES.L_IDEAL`), le mérite d'élégance qui ignorait
 *   longueur et couverture (`score.js › meriteDElegance`), la règle de `mad`
 *   qui appauvrissait la ligne (`mappeurs.js › paquetRecevable`), le seuil de
 *   `mrd` devenu malus dégressif (`elegance.js › degressiviteRedecoupage`), la
 *   désignation qui ne rendait jamais sa couleur (`highlight.js`), l'accolade
 *   de `mrn` posée à l'envers (`reduce.js`) et le recentrage qui s'étirait sur
 *   toute l'étape (`compile.js › jalonsDuPan`).
 *
 * ★ **HUIT CAS AVAIENT ÉTÉ ARBITRÉS ET RETIRÉS AVANT EUX** — la moisson de `hope-hope-hope`,
 *   celle de l'URL complète, les deux 666 de `Donald Trump`, ses deux retouches,
 *   ce que la ficelle achetait sur `Macron`, sa tête de liste et sa seconde
 *   ligne. Ce qui en est sorti est écrit là où ça s'applique, jamais ici :
 *   le parcours horizontal (`recherche/scenario.js › jouerEnsemble`), le tamis
 *   en un seul temps (`moteur/transformations/filtres.js › etapeRetrait`), les
 *   cornes sur un 666 seul (`visuel/primitives/reveal.js`), les places réservées
 *   à la qualité (`recherche/assemblage.js › vecteursDeSix`).
 *
 * ★ **DEUX AUTRES SONT SORTIS DEPUIS, TRANCHÉS PAR L'AUTEUR.**
 *
 *  · **`hope` — effacer le 4ᵉ 6, ou le laisser exploser au verdict.** « La 2ᵈ,
 *    `#sce!m14#`, sans hésitation. » C'est la voie sans `m36`, et elle confirme
 *    la dépréciation de l'opérateur : le verdict fait le travail, sans étape.
 *  · **`Macron` — 1ʳᵉ place.** « Priorité élégance : `#mt9#` ; priorité
 *    quantité : `#sce!fr13+tca+m14+meg#`. […] Si c'est vraiment plus simple de
 *    garder le 2ᵈ côté score, ok pour celui de droite en premier. » C'est ce
 *    que le barème faisait déjà ; le test d'étalonnage n'est plus `todo`.
 *
 * ★ **DEUX DE PLUS ÉTAIENT SORTIS AVANT EUX.**
 *
 *  · **`Donald Trump` — la plus courte contre celle qui emploie tout.** Arbitré
 *    ET APPLIQUÉ : la voie gaspilleuse (`fl+tca+m14`, onze valeurs calculées
 *    pour trois gardées) a disparu du classement, et `fl+tca+mazc+meg` s'y
 *    tient. Ce n'est pas une déclaration, c'est un relevé : la première est
 *    aujourd'hui ABSENTE des approches retenues.
 *  · **`hope-hope-hope.fr` — six séries, à quel prix.** Il se déclarait
 *    lui-même arbitré (« gardé pour vérification »), et son barème est en place
 *    (`elegance.js › LECTURE_DIVERGENTE`, 240 par lecture surnuméraire).
 *
 * ★ **LES SEIZE CAS SUIVANTS SONT SORTIS LE 14 SEPTEMBRE 2026**, remesurés sur
 *   `7382e3d` par `.planning/banc/arbitrage-remesure.mjs` (le chemin réel :
 *   `resoudre` aux curseurs et au cran du cas, `rejouer(lire(lien))` des deux
 *   côtés). Les deux liens de chacun se rejouent encore ; ce qui a changé, c'est
 *   la liste. Sauf mention contraire, AUCUN n'a été tranché par l'autrice : ils
 *   sont sortis parce que le barème et la recherche ont bougé depuis.
 *
 *  · `v2-elegance-https-hope-hope-hope-fr` (1ʳᵉ) — ni l'une ni l'autre à la place : la partition est 16ᵉ, `fl+mpy+meg` a quitté la liste ; la tête est la résonance `×3:m7F+cs+prn`.
 *  · `v2-mixte-https-hope-hope-hope-fr` (3ᵉ) — le barème l'a réglé seul : `fl+mpy+meg` tient la 3ᵉ place, la moisson à sept séries est montée 1ʳᵉ.
 *  · `v2-elegance-capitalisme` (1ʳᵉ) — `fr21+mx6+mrd` a quitté la liste ; la tête est `ma1+mab`.
 *  · `v2-mixte-la-numerologie-est-une-s` (3ᵉ) — les deux voies ont quitté la liste.
 *  · `v2-elegance-donald-trump` (1ʳᵉ) — ni l'une ni l'autre à la place (6ᵉ et 8ᵉ) ; la tête est `fl+ma1+mab`.
 *  · `v2-mixte-donald-trump` (3ᵉ) — le barème l'a réglé seul : `fl+mqwc+meg` tient la 3ᵉ place, la moisson est 5ᵉ.
 *  · `v2-elegance-henri-prunelle` (1ʳᵉ) — la partition a quitté la liste ; la tête est `fl+msfr+mad`.
 *  · `v2-abondance-henri-prunelle` (2ᵈ) — le barème l'a réglé seul : `2:fatb;fl+mpy+meg` tient la 2ᵈ place, `fl+mazc+meg` est 4ᵉ.
 *  · `v2-elegance-numherololgeek-1000i100-` (1ʳᵉ) — le barème l'a réglé seul : la moisson `0:nv,2+3:flt+mpy+mr9` est en tête, la partition 2ᵉ.
 *  · `v2-mixte-numherololgeek-1000i100-` (3ᵉ) — ni l'une ni l'autre à la place (1ʳᵉ et 5ᵉ) ; la 3ᵉ est `0:fr3;fl+mazc+meg`.
 *  · `v2-elegance-hope` (1ʳᵉ) — la convergence `fc+ma1+cs+prn,nlc,mexb+cs` a quitté la liste ; `m14` est 2ᵉ derrière `ffr2+ma1+mab`.
 *  · `v2-elegance-wikipedia` (1ʳᵉ) — `fr21+mx6+mad` a quitté la liste ; la tête est `mt9+mab`.
 *  · `v2-elegance-eleonore-a-nimes` (1ʳᵉ) — ni l'une ni l'autre à la place (10ᵉ et 5ᵉ) ; la tête est `fl+ma1+mab`.
 *  · `v2-exception-hope-url-cran-1` — déjà déclaré caduc le 8 septembre ; au cran 1, aucune des deux voies n'est plus dans la liste.
 *  · `absorption-donald-trump-2e-place` (2ᵈ) — tranché par l'autrice (« toujours proposer un chemin sans aucune perte ») et appliqué : `2:fr15;fl+masc+mab` tient la 2ᵈ place, la moisson est 4ᵉ ; gelé par `tests/lents/elegance.test.js › étalonnage`.
 *  · `hope-place-1-brieve-ou-nommee` (1ʳᵉ) — tranché par l'autrice (« celle que tu veux en 1ᵉʳ résultat, mais l'autre doit être en 3ᵉ ») : `fl+m14` tient la 1ʳᵉ place. ⚠️ L'autre moitié n'est PAS tenue : la groupée n'est dans la liste à aucun cran (−1 à 2). C'est un manque de la recherche, pas une question de goût.
 *
 *  ⚠️ **LA QUESTION QUI AVAIT FAIT NAÎTRE LES `v2-*` N'A PAS ÉTÉ TRANCHÉE** —
 *    classer par le score global affiché plutôt que par le rang.
 *    `score.js › ordreTotal` classe toujours par rang. Ces cas sont sortis parce
 *    que les voies qu'ils opposaient ont changé de place, pas parce que la
 *    question a reçu sa réponse ; si elle revient, elle reviendra avec des cas
 *    remesurés.
 *
 * ★ **CE QUI RESTE OUVERT : RIEN.** La liste est vide, et la page le dit
 *   (« Aucun arbitrage en attente », `arbitrage.js`).
 *
 * ⚠️ Les trois `todo` de moisson qui rougissent encore ne portent PAS sur ce
 *   classement-là : ils gèlent la COMPOSITION de la récolte (les trois « hope »
 *   en quatorze segments, le « fr » en sept segments), et le barème en compose
 *   une autre aujourd'hui. C'est une question distincte, à laquelle la réponse
 *   ci-dessus ne répond pas.
 *
 * ⚠️ **ET CE QUI N'A PAS SA PLACE ICI.** Un désaccord entre deux COMPTEURS n'est
 *   pas un arbitrage de goût : il a une bonne réponse, qu'on trouve en mesurant.
 *   L'écart cru entre `bilan.triptyquesContigus` et les couronnements de la
 *   scène en était un — il venait de ce que je lisais un champ pour deux
 *   (`triptyquesRepetes` porte les répétitions), et il s'est dissous à la
 *   mesure, pas à l'arbitrage. Cette page ne doit recevoir que des questions
 *   dont la réponse est un GOÛT.
 *
 * Les liens sont en registre scénique (`sce!`) des deux côtés : on compare des
 * démonstrations complètes, cornes comprises.
 */

/**
 * ★ **LA FORME D'UN CAS**, pour le prochain :
 *   `{ id, place, question?, titre, saisie, curseurs?, avant, apres, mesure? }`.
 *
 *  · `place` — la place visée (1, 2, 3…) ; les deux liens y sont candidats.
 *  · `question` — `'bareme'` (la tête d'aujourd'hui, `avant`, contre celle qu'on
 *    mettrait à sa place, `apres`) ou `'classement'` (la tête du moteur contre
 *    celle du score global) ; absente : un simple avant / après.
 *  · `curseurs` — ceux de la liste mesurée ; absents : le défaut du site.
 *  · `avant`, `apres` — liens en forme canonique d'aujourd'hui : sans `so!`,
 *    seul `sce!` s'écrit. Le banc les rejoue et les compare à la liste.
 *  · `mesure` — `{ avant, apres }` : `rangMoteur`, `rangGlobal`, `global`,
 *    `score`, `mode`, `series`, ou `{ absente: true }`, relevés par le banc.
 *
 * ★ À l'écran, ce que le moteur fait aujourd'hui est à DROITE et l'autre voie à
 *   gauche, quel que soit le type de cas (`arbitrage.js › montrer`).
 */
export const CAS_ARBITRAGE = Object.freeze([]);
