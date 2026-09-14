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
 * ★ **CE QUI EST OUVERT : HUIT CAS, UNE SEULE QUESTION — LE RANG OU LE SCORE
 *   GLOBAL ?** L'autrice a demandé à les voir (« oui, les 8 cas sur la page »).
 *
 *   Le moteur ne classe pas sa liste sur le « Score global » qu'affichent les
 *   cartes. Il la classe d'abord par RANG DE CONVICTION (`score.js ›
 *   ordreTotal` ; aux curseurs personnalisés, sa variante `ordrePondere`), puis
 *   par son score interne (six critères, élégance, rendement). Le global, lui,
 *   est la moyenne des quatre axes pondérée par les curseurs, sans rang. Les
 *   deux désignent souvent la même tête, pas toujours.
 *
 *   Chaque cas oppose, à la 1ʳᵉ place et aux curseurs « élégance » de l'étude
 *   v2 (`p25.200.50.150!`) :
 *     · À GAUCHE, la voie qui serait en tête si l'on triait par le global
 *       affiché ;
 *     · À DROITE, la tête actuelle du moteur.
 *   À ces curseurs la quantité est sous le défaut : le rang des séries est
 *   replié, seules les convergences restent derrière, et c'est donc surtout le
 *   SCORE du moteur contre le GLOBAL qui se départagent ici.
 *
 *   Ce qu'on arbitre, en regardant : la tête doit-elle suivre le score global
 *   affiché, ou le classement du moteur ? Un avis « à gauche » sur ces cas dit
 *   « trier par le global » ; un avis « à droite », « garder le rang ».
 *
 *   Mesurés le 14 septembre 2026 sur `47e770d` par
 *   `.planning/banc/arbitrage-rang-ou-score.mjs`. Les huit saisies proposées
 *   étaient toutes en désaccord ; aucune n'a été écartée. Les seize liens se
 *   rejouent à l'identique (codes, score, axes).
 *
 * ★ **ET SEPT CAS DE PLUS : CE QUE LA VARIANTE (c) CHANGERAIT, AUX CURSEURS PAR
 *   DÉFAUT.** Même question que les huit cas précédents, cette fois avec les
 *   réglages que voit tout visiteur.
 *
 *   `score.js › ordreTotal` classe la liste : au rang des SÉRIES, le nombre de
 *   séries passe avant le score. Le banc `.planning/banc/series-avant-score.mjs`
 *   a mesuré trois autres règles :
 *     · (a) les séries ne départagent que deux scores égaux ;
 *     · (b) un bonus de séries ;
 *     · (c) le tri par le score global affiché.
 *   L'autrice hésite entre (a) et (c) : « Je suis tenté par (c) mais ça
 *   implique de voir si les changements sont pertinents ou pas. Envoie-les en
 *   AB-testing. »
 *
 *   Aux curseurs par défaut, (c) « liste entière » change 10 têtes sur 13.
 *   Chaque cas oppose, à la 1ʳᵉ place :
 *     · À GAUCHE, la tête sous la variante (c) ;
 *     · À DROITE, la tête actuelle du moteur.
 *   Un avis « à gauche » plaide pour (c). Un avis « à droite » plaide pour
 *   garder le classement actuel ou pour la variante (a) : sur ces listes, (a)
 *   ne change aucune tête. Les cinq premières lignes des deux ordres sont
 *   notées dans chaque cas, parce qu'une tête ne suffit pas toujours à juger
 *   une règle de tri.
 *
 *   Des dix têtes changées, trois n'ont pas leur cas :
 *     · `Wikipedia` et `Henri Prunelle` : la paire au défaut est celle de
 *       leur cas « rang ou score » aux curseurs v2 ;
 *     · `hope-hope-hope.fr` au cran 3 : même paire qu'au cran 2.
 *
 *   Mesurés le 14 septembre 2026 sur `58decb3` par
 *   `.planning/banc/arbitrage-variante-c.mjs`. Les quatorze liens se rejouent
 *   à l'identique (codes, score, axes).
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
 *  · `mesure` — `{ commit, date, avant, apres }` : `rangMoteur`, `rangGlobal`,
 *    `global` (pondéré par les curseurs du cas, comme la liste l'affiche),
 *    `score`, `mode`, `series`, `axes`, ou `{ absente: true }`, relevés par le banc.
 *
 * ★ À l'écran, ce que le moteur fait aujourd'hui est à DROITE et l'autre voie à
 *   gauche, quel que soit le type de cas (`arbitrage.js › montrer`).
 */
export const CAS_ARBITRAGE = Object.freeze([
  {
    id: "rang-ou-score-hope",
    place: 1,
    question: 'classement',
    titre: "hope — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "hope",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `ffr2+tca+ma1+mab`
    avant: "#sce!p25.200.50.150!ffr2+ma1+mab#3fq9KJ",
    // à gauche, la tête au score global affiché : `tca+m14`
    apres: "#sce!p25.200.50.150!m14#3fq9KJ",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 3, global: 752, score: 6660, mode: "GROUPEMENT", series: 1, axes: { simplicite: 877, exhaustivite: 1000, quantite: 111, coherence: 617 } },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 775, score: 6204, mode: "GROUPEMENT", series: 1, axes: { simplicite: 1000, exhaustivite: 875, quantite: 111, coherence: 830 } },
    },
  },
  {
    id: "rang-ou-score-donald-trump",
    place: 1,
    question: 'classement',
    titre: "Donald Trump — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "Donald Trump",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `fl+tca+ma1+mab`
    avant: "#sce!p25.200.50.150!fl+ma1+mab#2HuP1G8mNg3sJWhqR",
    // à gauche, la tête au score global affiché : `2:fr15;fl+tca+masc+mab`
    apres: "#sce!p25.200.50.150!2:fr15;fl+masc+mab#2HuP1G8mNg3sJWhqR",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 3, global: 788, score: 6738, mode: "GROUPEMENT", series: 2, axes: { simplicite: 877, exhaustivite: 1000, quantite: 222, coherence: 683 } },
      apres: { rangMoteur: 4, rangGlobal: 1, global: 803, score: 5199, mode: "GROUPEMENT", series: 4, axes: { simplicite: 877, exhaustivite: 1000, quantite: 444, coherence: 650 } },
    },
  },
  {
    id: "rang-ou-score-eleonore-a-nimes",
    place: 1,
    question: 'classement',
    titre: "Éléonore à Nîmes — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "Éléonore à Nîmes",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `fl+tca+ma1+mab`
    avant: "#sce!p25.200.50.150!fl+ma1+mab#3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
    // à gauche, la tête au score global affiché : `2:ffr4;fl+tca+m14+meg`
    apres: "#sce!p25.200.50.150!2:ffr4;fl+m14+meg#3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 3, global: 788, score: 6738, mode: "GROUPEMENT", series: 2, axes: { simplicite: 877, exhaustivite: 1000, quantite: 222, coherence: 683 } },
      apres: { rangMoteur: 5, rangGlobal: 1, global: 856, score: 2999, mode: "GROUPEMENT", series: 6, axes: { simplicite: 935, exhaustivite: 1000, quantite: 667, coherence: 714 } },
    },
  },
  {
    id: "rang-ou-score-capitalisme",
    place: 1,
    question: 'classement',
    titre: "Capitalisme — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "Capitalisme",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `tca+ma1+mab`
    avant: "#sce!p25.200.50.150!ma1+mab#Hi75aotg77MXEgC",
    // à gauche, la tête au score global affiché : `0:fr13;tca+ma1+mab`
    apres: "#sce!p25.200.50.150!0:fr13;ma1+mab#Hi75aotg77MXEgC",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 2, global: 776, score: 6999, mode: "GROUPEMENT", series: 1, axes: { simplicite: 935, exhaustivite: 1000, quantite: 111, coherence: 675 } },
      apres: { rangMoteur: 5, rangGlobal: 1, global: 789, score: 4696, mode: "GROUPEMENT", series: 2, axes: { simplicite: 935, exhaustivite: 1000, quantite: 222, coherence: 675 } },
    },
  },
  {
    id: "rang-ou-score-wikipedia",
    place: 1,
    question: 'classement',
    titre: "Wikipedia — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "Wikipedia",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `tca+mt9+mab`
    avant: "#sce!p25.200.50.150!mt9+mab#27Xv14MeSfjBN",
    // à gauche, la tête au score global affiché : `fr17+tca+mpy+meg`
    apres: "#sce!p25.200.50.150!fr17+mpy+meg#27Xv14MeSfjBN",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 4, global: 771, score: 6934, mode: "GROUPEMENT", series: 1, axes: { simplicite: 935, exhaustivite: 1000, quantite: 111, coherence: 663 } },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 780, score: 3179, mode: "GROUPEMENT", series: 3, axes: { simplicite: 935, exhaustivite: 1000, quantite: 333, coherence: 610 } },
    },
  },
  {
    id: "rang-ou-score-henri-prunelle",
    place: 1,
    question: 'classement',
    titre: "Henri Prunelle — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "Henri Prunelle",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `fl+tca+msfr+mad`
    avant: "#sce!p25.200.50.150!fl+msfr+mad#TcguSXTd7SkC7z32JAG",
    // à gauche, la tête au score global affiché : `fl+tca+mazc+meg`
    apres: "#sce!p25.200.50.150!fl+mazc+meg#TcguSXTd7SkC7z32JAG",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 2, global: 803, score: 7423, mode: "GROUPEMENT", series: 1, axes: { simplicite: 935, exhaustivite: 1000, quantite: 111, coherence: 753 } },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 810, score: 3033, mode: "GROUPEMENT", series: 4, axes: { simplicite: 935, exhaustivite: 962, quantite: 444, coherence: 709 } },
    },
  },
  {
    id: "rang-ou-score-numherololgeek",
    place: 1,
    question: 'classement',
    titre: "numherololgeek.1000i100.fr — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `nv,flt+tca+mpy+mr9,flt+tca+mpy+mr9`
    avant: "#sce!p25.200.50.150!0:nv,2+3:flt+mpy+mr9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    // à gauche, la tête au score global affiché : `2:flt;fl+tca+ma1+mab`
    apres: "#sce!p25.200.50.150!2:flt;fl+ma1+mab#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 4, global: 657, score: 4113, mode: "MOISSON", series: 3, axes: { simplicite: 454, exhaustivite: 889, quantite: 333, coherence: 491 } },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 762, score: 2923, mode: "GROUPEMENT", series: 3, axes: { simplicite: 877, exhaustivite: 915, quantite: 333, coherence: 683 } },
    },
  },
  {
    id: "rang-ou-score-https-hope-hope-hope-fr",
    place: 1,
    question: 'classement',
    titre: "https://hope-hope-hope.fr/ — 1ʳᵉ place : la tête au score global, ou la tête au rang de conviction",
    saisie: "https://hope-hope-hope.fr/",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à droite, la tête du moteur : `tca+m7F+cs+prn,tca+m7F+cs+prn,tca+m7F+cs+prn`
    avant: "#sce!p25.200.50.150!×3:m7F+cs+prn#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk",
    // à gauche, la tête au score global affiché : `fl+tca+m14`
    apres: "#sce!p25.200.50.150!3.5:fl+m14#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk",
    mesure: {
      commit: '47e770d',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 7, global: 638, score: 7694, mode: "RESONANCE", series: null, axes: { simplicite: 677, exhaustivite: 591, quantite: 111, coherence: 876 } },
      apres: { rangMoteur: 5, rangGlobal: 1, global: 818, score: 6355, mode: "GROUPEMENT", series: 4, axes: { simplicite: 1000, exhaustivite: 873, quantite: 444, coherence: 841 } },
    },
  },
  {
    id: "variante-c-https-hope-hope-hope-fr",
    place: 1,
    question: 'classement',
    titre: "https://hope-hope-hope.fr/ — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "https://hope-hope-hope.fr/",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  tca+mch+cs+prn,nc,fr13+nlc+pc9 (3280, g 466, ×1)
       ·  fr14+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,fr… (1274, g 587, ×7)
       ·  fr14+tca+m14+mpf,ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca+mtc,ffr… (1249, g 578, ×7)
       ·  fl+tca+mpy+meg (3763, g 827, ×6)
       ·  fr14+tca+m14+mpf,ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca+mtc+cs,… (1113, g 507, ×6)
       Variante (c) :
       ·  fl+tca+mpy+meg (3763, g 827, ×6)
       ·  0:fr14;fl+tca+m14 (7529, g 823, ×5)
       ·  fl+tca+mpy+mab (3673, g 695, ×2)
       ·  fl+tca+mx6+mrdE (3152, g 635, ×1)
       ·  fi+tca+mazc (3409, g 624, ×1) */
    avant: "#sce!0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk",
    apres: "#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 26, global: 466, score: 3280, mode: "PARTITION", series: null, axes: { simplicite: 348, exhaustivite: 912, quantite: 111, coherence: 491 } },
      apres: { rangMoteur: 4, rangGlobal: 1, global: 827, score: 3763, mode: "GROUPEMENT", series: 6, axes: { simplicite: 935, exhaustivite: 974, quantite: 667, coherence: 732 } },
    },
  },
  {
    id: "variante-c-donald-trump",
    place: 1,
    question: 'classement',
    titre: "Donald Trump — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "Donald Trump",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  fatb+tca+mt9+mr9,tca+mt9+cmn (4983, g 578, ×2)
       ·  2:fr15;fl+tca+masc+mab (4272, g 743, ×4)
       ·  fl+tca+masc+mab (4701, g 715, ×3)
       ·  fatb+tca+mt9+mr9,fr3+tca+mhe+mrn (4077, g 529, ×3)
       ·  fr15+tca+mx6+mrn,fr3+tca+mhe+mrn (3921, g 520, ×3)
       Variante (c) :
       ·  2:fr15;fl+tca+masc+mab (4272, g 743, ×4)
       ·  fl+tca+mazc+meg (3447, g 722, ×3)
       ·  fl+tca+mqwc+meg (3447, g 722, ×3)
       ·  fl+tca+masc+mab (4701, g 715, ×3)
       ·  fl+tca+ma1+mab (3684, g 696, ×2) */
    avant: "#sce!0:fatb+mt9+mr9,2:mt9+cmn#2HuP1G8mNg3sJWhqR",
    apres: "#sce!2:fr15;fl+masc+mab#2HuP1G8mNg3sJWhqR",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 9, global: 578, score: 4983, mode: "MOISSON", series: 2, axes: { simplicite: 644, exhaustivite: 867, quantite: 222, coherence: 577 } },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 743, score: 4272, mode: "GROUPEMENT", series: 4, axes: { simplicite: 877, exhaustivite: 1000, quantite: 444, coherence: 650 } },
    },
  },
  {
    id: "variante-c-macron",
    place: 1,
    question: 'classement',
    titre: "Macron — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "Macron",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  fr20+tca+mazc+mrdE (6152, g 652, ×1)
       ·  fr13+tca+m14+meg (6443, g 701, ×2)
       ·  fr8+tca+msfr+meg (3575, g 691, ×2)
       ·  fr21+tca+mt9+meg (3569, g 691, ×2)
       ·  fr4+tca+masc+mdc3 (2179, g 581, ×2)
       Variante (c) :
       ·  fr13+tca+m14+meg (6443, g 701, ×2)
       ·  fr8+tca+msfr+meg (3575, g 691, ×2)
       ·  fr21+tca+mt9+meg (3569, g 691, ×2)
       ·  tca+mz26+mab (5333, g 673, ×1)
       ·  tca+mt9+mpf (5238, g 662, ×1) */
    avant: "#sce!fr20+mazc+mrdE#fXvexbmf",
    apres: "#sce!fr13+m14+meg#fXvexbmf",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 6, global: 652, score: 6152, mode: "GROUPEMENT", series: 1, axes: { simplicite: 935, exhaustivite: 1000, quantite: 111, coherence: 561 } },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 701, score: 6443, mode: "GROUPEMENT", series: 2, axes: { simplicite: 935, exhaustivite: 1000, quantite: 222, coherence: 648 } },
    },
  },
  {
    id: "variante-c-hope-hope-hope-fr-cran-2",
    place: 1,
    question: 'classement',
    titre: "hope-hope-hope.fr — 1ʳᵉ place, curseurs par défaut, cran 2 : la tête au score global (c), ou la tête actuelle",
    saisie: "hope-hope-hope.fr",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  nc,nsp+mlet+nlc+pc9,tca+ma1+cs+prn (2442, g 481, ×1)
       ·  ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca… (1297, g 560, ×6)
       ·  ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,fr1… (1190, g 536, ×6)
       ·  ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,tca+mtc,ffr3+tca+m14+mpf,fr7… (1153, g 527, ×6)
       ·  0:ffr4;fl+tca+m14+meg (4914, g 794, ×5)
       Variante (c) :
       ·  fl+tca+m14 (7843, g 804, ×4)
       ·  0:ffr4;fl+tca+m14+meg (4914, g 794, ×5)
       ·  2:ffr4;fl+tca+m14+meg (4914, g 794, ×5)
       ·  4:ffr4;fl+tca+m14+meg (4914, g 794, ×5)
       ·  0:ffr2;fl+tca+m14+meg (3396, g 775, ×5) */
    avant: "#sce!f2!0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn#yvQYkzhNVYJT8wM8jhvJxSM",
    apres: "#sce!f2!fl+m14#yvQYkzhNVYJT8wM8jhvJxSM",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 45, global: 481, score: 2442, mode: "PARTITION", series: null, axes: { simplicite: 313, exhaustivite: 1000, quantite: 111, coherence: 498 } },
      apres: { rangMoteur: 14, rangGlobal: 1, global: 804, score: 7843, mode: "GROUPEMENT", series: 4, axes: { simplicite: 1000, exhaustivite: 929, quantite: 444, coherence: 841 } },
    },
  },
  {
    id: "variante-c-hope",
    place: 1,
    question: 'classement',
    titre: "hope — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "hope",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  fr21+tca+masc+mrdE (5010, g 650, ×1)
       ·  ffr3+tca+m14+meg (4235, g 654, ×2)
       ·  ffr2+tca+m14+meg (2952, g 654, ×2)
       ·  fr2+tca+masb+mdc3 (2098, g 576, ×2)
       ·  ffr2+tca+masc+mdc3 (1769, g 568, ×2)
       Variante (c) :
       ·  ffr3+tca+m14+meg (4235, g 654, ×2)
       ·  ffr2+tca+m14+meg (2952, g 654, ×2)
       ·  ffr2+tca+ma1+mab (3705, g 651, ×1)
       ·  fr21+tca+masc+mrdE (5010, g 650, ×1)
       ·  fr2+tca+masb+mdc3 (2098, g 576, ×2) */
    avant: "#sce!fr21+masc+mrdE#3fq9KJ",
    apres: "#sce!ffr3+m14+meg#3fq9KJ",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 4, global: 650, score: 5010, mode: "GROUPEMENT", series: 1, axes: { simplicite: 935, exhaustivite: 1000, quantite: 111, coherence: 553 } },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 654, score: 4235, mode: "GROUPEMENT", series: 2, axes: { simplicite: 935, exhaustivite: 833, quantite: 222, coherence: 626 } },
    },
  },
  {
    id: "variante-c-eleonore-a-nimes",
    place: 1,
    question: 'classement',
    titre: "Éléonore à Nîmes — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "Éléonore à Nîmes",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  nc+pc9,fen5+nc+pc9,nc+pc9 (3739, g 557, ×1)
       ·  2:fen5;fl+tca+masc+mdc3 (2381, g 778, ×8)
       ·  2:ffr4;fl+tca+m14+meg (3824, g 829, ×6)
       ·  2:fen3;fl+tca+m14+meg (3721, g 823, ×6)
       ·  0:fr16;fl+tca+masc+mdc3 (2550, g 730, ×6)
       Variante (c) :
       ·  2:ffr4;fl+tca+m14+meg (3824, g 829, ×6)
       ·  2:fen3;fl+tca+m14+meg (3721, g 823, ×6)
       ·  2:fen5;fl+tca+masc+mdc3 (2381, g 778, ×8)
       ·  0:fr16;fl+tca+masc+mdc3 (2550, g 730, ×6)
       ·  fl+tca+ma1+mab (3684, g 696, ×2) */
    avant: "#sce!0+4:nc+pc9,2:fen5+nc+pc9#3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
    apres: "#sce!2:ffr4;fl+m14+meg#3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 10, global: 557, score: 3739, mode: "PARTITION", series: null, axes: { simplicite: 712, exhaustivite: 818, quantite: 111, coherence: 588 } },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 829, score: 3824, mode: "GROUPEMENT", series: 6, axes: { simplicite: 935, exhaustivite: 1000, quantite: 667, coherence: 714 } },
    },
  },
  {
    id: "variante-c-numherololgeek",
    place: 1,
    question: 'classement',
    titre: "numherololgeek.1000i100.fr — 1ʳᵉ place, curseurs par défaut : la tête au score global (c), ou la tête actuelle",
    saisie: "numherololgeek.1000i100.fr",
    /* Les cinq premières lignes, relevées avec la paire.
       Moteur :
       ·  nv,tca+cnjd+pc9,fr13+nlc+pc9 (3891, g 456, ×1)
       ·  0:fr3;fl+tca+mazc+meg (3061, g 738, ×5)
       ·  3:fatb;fl+tca+mazc+meg (3061, g 738, ×5)
       ·  fl+tca+mqwc+meg (3061, g 738, ×5)
       ·  fr5+tca+masb+mdc3 (1459, g 573, ×5)
       Variante (c) :
       ·  0:fr3;fl+tca+mazc+meg (3061, g 738, ×5)
       ·  3:fatb;fl+tca+mazc+meg (3061, g 738, ×5)
       ·  fl+tca+mqwc+meg (3061, g 738, ×5)
       ·  fl+tca+ma1+mab (3131, g 649, ×2)
       ·  fl+tca+mpy+meg (2409, g 644, ×3) */
    avant: "#sce!0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    apres: "#sce!0:fr3;fl+mazc+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    mesure: {
      commit: '58decb3',
      date: '2026-09-14',
      avant: { rangMoteur: 1, rangGlobal: 22, global: 456, score: 3891, mode: "PARTITION", series: null, axes: { simplicite: 387, exhaustivite: 886, quantite: 111, coherence: 441 } },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 738, score: 3061, mode: "GROUPEMENT", series: 5, axes: { simplicite: 935, exhaustivite: 753, quantite: 556, coherence: 709 } },
    },
  },
]);
