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
 *    Elle est revenue ainsi, et l'autrice l'a arbitrée le 15 septembre 2026 :
 *    voir les quinze cas consignés plus bas.
 *
 * ★ **LES QUINZE CAS « RANG OU SCORE » SONT SORTIS LE 15 SEPTEMBRE 2026,
 *   ARBITRÉS PAR L'AUTRICE.** Huit aux curseurs v2 (`p25.200.50.150`), sept
 *   « variante (c) » aux curseurs par défaut. Tous posaient la même question : la
 *   tête de liste doit-elle suivre le score global affiché, ou le classement du
 *   moteur (`score.js › ordreTotal`) ? Ses verdicts, tels quels, sont dans
 *   `.planning/arbitrages/2026-09-15-rang-ou-score.md` ; les numéros ci-dessous
 *   sont les siens, et c'est ce fichier qui fait foi.
 *
 *   En résumé :
 *     · le score global l'emporte dans neuf cas (1, 2, 3, 5, 9, 11, 12, 14, 15),
 *       légèrement seulement au 2 ;
 *     · le moteur l'emporte légèrement au 4, très nettement au 7 ;
 *     · égalité au 6 ;
 *     · les deux sont « bof » au 8, gâchées au 10, et au 13 « les deux passent »
 *       sans que l'une soit préférée.
 *
 *   ⚠️ **CE QUI EN DÉCOULE N'EST PAS APPLIQUÉ ICI.** Le recalibrage du score est
 *     un chantier séparé. Les verdicts y demandent :
 *       · des pénalités plus fortes pour `mab`, les traductions, `pc9` et `cmn` ;
 *       · une simplicité et une cohérence moins sous-notées ;
 *       · une exhaustivité des URL mieux comptée.
 *
 *  · n° 1 — `hope`, curseurs v2 — score global, « mieux et de loin » (`m14` contre `ffr2+ma1+mab`).
 *  · n° 2 — `Donald Trump`, v2 — légère préférence pour le score global, mais gêne des deux côtés : « mab m'a l'air de ne pas être assez pénalisé ».
 *  · n° 3 — `Éléonore à Nîmes`, v2 — score global ; le `meg` qui tombe juste plaît, le passage par `ffr4` est bancal : « Il faut pénaliser bien plus les traductions ».
 *  · n° 4 — `Capitalisme`, v2 — les deux font l'affaire, légère préférence pour la concision du moteur (`ma1+mab`) ; `mab` devrait être moins bien noté. Question posée : pourquoi `0:fr13;ma1+mab` plutôt que `fr13+ma1+mab` sur un seul mot.
 *  · n° 5 — `Wikipedia`, v2 — score global, `meg` plutôt que `mab` : « court et exhaustif, sans passer par mab ».
 *  · n° 6 — `Henri Prunelle`, v2 — égalité : « les deux me conviennent ».
 *  · n° 7 — `numherololgeek.1000i100.fr`, v2 — le moteur, « très très largement plus élégante » ; la voie du global est « totalement discalifiée » ; simplicité et cohérence devraient être plus élevées.
 *  · n° 8 — `https://hope-hope-hope.fr/`, v2 — « Les deux sont bof », faute d'exhaustivité : la simplicité pèse trop. Piste proposée : moins d'incohérence comptée quand une méthode lit les mots et une autre le reste.
 *  · n° 9 — `https://hope-hope-hope.fr/`, défaut — score global « pas mal » (`fl+mpy+meg`) ; moteur « catastrophique », la partie sur « fr » « bien trop alambiqué ».
 *  · n° 10 — `Donald Trump`, défaut — les deux gâchées : `mab` à gauche, `cmn` à droite, qui jette quatre chiffres et « devrait le discalifier ».
 *  · n° 11 — `Macron`, défaut — score global, « bien mieux » (`fr13+m14+meg` contre `fr20+mazc+mrdE`).
 *  · n° 12 — `hope-hope-hope.fr`, défaut, cran 2 — score global (`fl+m14`, « simple et efficace ») ; moteur « catastrophique », le « . » en 6 « trop complexe et tirée par les cheveux ».
 *  · n° 13 — `hope`, défaut — « les deux passent », sans préférence ; question posée : pourquoi un simple `m14` ne prime pas.
 *  · n° 14 — `Éléonore à Nîmes`, défaut — moteur « à jetter » ; la voie du global a déjà été jugée au n° 3.
 *  · n° 15 — `numherololgeek.1000i100.fr`, défaut — score global, nettement ; `pc9` « à considéré comme une ficelle ».
 *
 * ★ **DIX CAS OUVERTS LE 19 SEPTEMBRE 2026** (les trois derniers au cran 3,
 *   après les variantes avec et sans 9 et le redécoupage qui range). Deux sont
 *   sortis le soir même, remesurés par `.planning/banc/arbitrage-remesure.mjs`
 *   sur `4f74b95` : la voie de droite n’y est plus candidate à la place visée,
 *   donc le cas ne pose plus de question.
 *    · `2026-09-19-louis-fouche-3e` (3ᵉ) — `fmaj+mas+mrdE` a quitté la liste :
 *      `mrdE` ne pose plus de 9, et la voie s’écrit désormais `md9E`, qui ne
 *      cherche qu’à partir du cran 3. `fl+m14` tient la 3ᵉ place.
 *    · `2026-09-19-trump-cran3` (3ᵉ) — les deux voies ont quitté la liste :
 *      `fl+mt9+mam+meg` n’est plus construite (la même ligne est atteinte
 *      d’abord par `mad+meg`), et la 3ᵉ place est tenue par
 *      `2:fr16;mas+mrd9+meg`. — (le neuvième, Louis Fouché, après
 *   les redécoupages qui laissent en place ce qui est juste) — ce que les six opérateurs du
 *   18 septembre (`mas`, `mu8`, `mam`, `mrdf`, `mrfE`, `megf`), les retouches
 *   enchaînées par cran et le siège de la voie courte changent en tête de liste.
 *   Relevés par `resoudre` au cran et aux curseurs de chaque cas, sur `main`
 *   (`7ae67a5`) et sur la branche `operateurs-et-crans` (`f07e3a4`). En simple
 *   « Avant / Après » : `main` à gauche, la branche à droite — « Aujourd’hui »
 *   se lisait comme « ce qui est en ligne », à rebours de ce qu’il désignait.
 *
 * ★ **TROIS CAS SONT SORTIS LE 20 SEPTEMBRE, ET TROIS LES REMPLACENT** — le
 *   jour où le tri de `mrtE` a cessé d'avoir une exception.
 *
 *   > « Le tri qui place les 6 devant ne va pas : tri oui, mais avec un ordre
 *   >   respecté. […] c'est le prix d'un rendu qui ne semble pas intentionnel
 *   >   (alors que si on met visiblement de côté les 6, ça fait trop ficelle). »
 *   >   (l'autrice)
 *
 *   Les sortants, et pourquoi ils ne posent plus de question :
 *    · `2026-09-19-raoult-cran3-2e` et `2026-09-19-raoult-cran3-1re` (2ᵉ et 1ʳᵉ)
 *      — leur voie de droite, `fmaj+mas+mrtE`, NE SE REJOUE PLUS : trié pour de
 *      bon, le geste n'écrit plus sur cette ligne que ce que `mrdE` écrit déjà,
 *      donc il s'y tait et le programme est inapplicable. Un lien mort ne
 *      s'arbitre pas.
 *    · `2026-09-19-fouche-cran3-2e` (2ᵉ) — ses DEUX voies ont quitté la liste :
 *      `2:fr22;fmaj+mas+mt9E+mr9` tombe de cinq séries à quatre et sort des
 *      soixante-huit voies retenues.
 *
 *   ⚠️ **ET CE QUE CETTE PAGE NE PEUT PAS MONTRER ICI**, il faut le dire : la
 *     correction est une correction de GESTE, et l'instrument rejoue les deux
 *     côtés avec les gestes d'aujourd'hui (voir plus haut). Personne ne verra
 *     donc côte à côte l'ancien rendu et le neuf — ça se regarde sur
 *     `debug.html`. Ce que les trois cas neufs demandent est autre chose, et
 *     c'est une question de goût : maintenant que la voie triée à exception
 *     n'existe plus, QUI mérite la place qu'elle tenait.
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
    id: "2026-09-19-raoult",
    place: 1,
    titre: "[gauche 4ᵉ] Didier Raoult — 1ʳᵉ place : le code ASCII casse comprise (mas) prend la tête qu’avait le T9",
    saisie: "Didier Raoult",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!2:mt9+meg$6hVamBkJyG1MWtPRwR",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR",
  },
  {
    // ★ LE DÉPARTAGE DEMANDÉ N'A PLUS D'OBJET (22 septembre 2026). « Je préfère
    //   `mz26` à `mas`, mais à part ça les deux me vont » (l'auteur) : mesurée,
    //   la voie à `mz26` n'est plus fabriquée — absente aux crans 0, 1 et 2
    //   (16, 27 et 40 voies). On ne peut pas préférer une voie qui n'existe
    //   plus ; la préférence reste écrite ici pour le jour où elle reviendra.
    id: "2026-09-19-marie-curie",
    place: 1,
    titre: "[gauche hors liste] Marie Curie — 1ʳᵉ place : le code ASCII casse comprise (mas) prend la tête",
    saisie: "Marie Curie",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!fl+mz26+mr9+mrdE$LBvysLJSWqpia3v",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!fmaj+mas+mrdE$LBvysLJSWqpia3v",
  },
  {
    id: "2026-09-19-jean-michel",
    place: 1,
    titre: "[gauche 3ᵉ] jean-michel — 1ʳᵉ place : le code ASCII casse comprise (mas) prend la tête qu’avait le clavier",
    saisie: "jean-michel",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!2:mqwc+meg$TPFErnfXxwkkeBD",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!fmaj+mas+mrdE$TPFErnfXxwkkeBD",
  },
  {
    id: "2026-09-19-sarah-kerrigan",
    place: 1,
    titre: "[gauche hors liste] Sarah Kerrigan — 1ʳᵉ place : le code ASCII puis une absorption (mas+mab) prend la tête",
    saisie: "Sarah Kerrigan",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!0:fr12;fl+m14+meg$XeuapD1GiUPu7gDywGH",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!fmaj+mas+mab$XeuapD1GiUPu7gDywGH",
  },
  {
    id: "2026-09-19-eleonore",
    place: 1,
    titre: "[gauche 6ᵉ] Éléonore à Nîmes — 1ʳᵉ place : m14 égalisé remplace le redécoupage exact",
    saisie: "Éléonore à Nîmes",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!fl+mx6+mrdE$3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!fl+m14+meg$3j14d86Y9shVAUrGT6Cq5K2Rk2cA",
  },
  {
    id: "2026-09-19-trump-cran10",
    place: 1,
    titre: "[gauche 8ᵉ] Donald Trump, cran 10 — 1ʳᵉ place : l’égalisation futée (megf) prend la tête et les cinq premières lignes",
    saisie: "Donald Trump",
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!f10!fl+mazc+meg$2HuP1G8mNg3sJWhqR",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!f10!2:fr16;fc+masc+megf$2HuP1G8mNg3sJWhqR",
  },
  {
    // ★ LA CAUSE EST NOMMÉE (22 septembre 2026) : la voie de gauche n'est pas
    //   mal classée, elle n'est plus FABRIQUÉE — absente aux crans 0, 1 et 2
    //   (23, 38 et 65 voies), ce qui distingue « reléguée » de « inexistante ».
    //   `git bisect` en quatre étapes, entre 3.1.0 (où elle était 1ʳᵉ) et
    //   `c616f4f`, désigne **`7b80556`** — « Le code ASCII casse comprise, le
    //   point de code Unicode, et l'addition qui prépare l'égalisation », soit
    //   les trois opérateurs `mas`, `mu8`, `mam`. C'est une question de
    //   fabrication (`assemblage.js`), pas de barème ; le cas
    //   `2026-09-22-numherololgeek-v2-sans-perte`, plus bas, repose la question
    //   de l'auteur sur deux voies qui, elles, existent.
    id: "2026-09-19-numherololgeek-v2",
    place: 1,
    titre: "[gauche hors liste] numherololgeek.1000i100.fr, curseurs v2 — 1ʳᵉ place : ton verdict n° 7 n’est plus fabriqué",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // à gauche (« Avant »), la voie de `main` (7ae67a5) à la même place
    avant: "?sce!p25.200.50.150!0:nv,2+3:flt+mpy+mr9$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    // à droite (« Après »), la tête de la branche `operateurs-et-crans` (f07e3a4)
    apres: "?sce!p25.200.50.150!fl+mqwc+meg$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
  },
  // ★ LES TROIS CAS DU TRI STRICT — 20 septembre 2026, branche
  //   `tri-qui-respecte-lordre`. Ils remplacent les trois sortants dont
  //   l'en-tête rend compte. Relevés par le chemin réel (`resoudre` au cran du
  //   cas, `rejouer(lire(lien))` des deux côtés), comme `arbitrage-remesure.mjs`.
  {
    id: "2026-09-20-raoult-cran3-2e-tri-strict",
    place: 2,
    titre: "[gauche 3ᵉ] Didier Raoult, cran 3 — 2ᵉ place : la ligne TRIÉE SANS EXCEPTION puis retournée (mt9E+mr9, cinq séries) prend la place que tenait mrtE",
    saisie: "Didier Raoult",
    // à gauche (« Avant ») : ce que `main` (c616f4f) a de mieux à cette place
    //   une fois la voie `mrtE` retirée — elle y était 2ᵉ, elle ne se rejoue
    //   plus, et `fr16+mas+mrn+meg` est la suivante.
    avant: "?sce!f3!fr16+mas+mrn+meg$6hVamBkJyG1MWtPRwR",
    // à droite (« Après ») : la 2ᵉ de `tri-qui-respecte-lordre` — le rangement
    //   y est un vrai tri, les 6 tombent entre les 5 et les 7.
    apres: "?sce!f3!2:fr10;fmaj+mas+mt9E+mr9$6hVamBkJyG1MWtPRwR",
    mesure: {
      commit: "4f5c6e0", date: "2026-09-20",
      avant: { rangMoteur: 3, rangGlobal: 2, global: 717, score: 3315, mode: "GROUPEMENT", series: 4 },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 721, score: 3407, mode: "GROUPEMENT", series: 5 },
    },
  },
  {
    id: "2026-09-20-raoult-cran3-1re-tri-strict",
    place: 1,
    titre: "[gauche 1ʳᵉ] Didier Raoult, cran 3 — 1ʳᵉ place : la tête garde mrdE (deux séries) devant la ligne triée sans exception (cinq séries) ; laquelle en tête ?",
    saisie: "Didier Raoult",
    // à gauche (« Avant ») : la tête, des deux côtés — elle n’a pas bougé
    avant: "?sce!f3!fmaj+mas+mrdE$6hVamBkJyG1MWtPRwR",
    // à droite (« Après ») : sa 2ᵉ, qu’on mettrait en tête
    apres: "?sce!f3!2:fr10;fmaj+mas+mt9E+mr9$6hVamBkJyG1MWtPRwR",
    mesure: {
      commit: "4f5c6e0", date: "2026-09-20",
      avant: { rangMoteur: 1, rangGlobal: 4, global: 701, score: 3665, mode: "GROUPEMENT", series: 2 },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 721, score: 3407, mode: "GROUPEMENT", series: 5 },
    },
  },
  {
    id: "2026-09-20-fouche-cran3-2e-tri-strict",
    place: 2,
    titre: "[gauche hors liste] Louis Fouché, cran 3 — 2ᵉ place : la voie à cinq séries n’en écrit plus que quatre et sort ; mrd9+meg prend la place",
    saisie: "Louis Fouché",
    // à gauche (« Avant ») : la 2ᵉ de `main` (c616f4f) — cinq séries là-bas,
    //   quatre ici, et hors des 68 voies retenues. C’est la perte franche du
    //   tri strict sur cette saisie, montrée plutôt que résumée.
    avant: "?sce!f3!2:fr22;fmaj+mas+mt9E+mr9$7NFn8xBqb5eNAq3YCY",
    // à droite (« Après ») : la 2ᵉ de `tri-qui-respecte-lordre`
    apres: "?sce!f3!fr9+mas+mrd9+meg$7NFn8xBqb5eNAq3YCY",
    mesure: {
      commit: "4f5c6e0", date: "2026-09-20",
      avant: { absente: true, series: 4, mode: "GROUPEMENT" },
      apres: { rangMoteur: 2, rangGlobal: 2, global: 713, score: 3321, mode: "GROUPEMENT", series: 4 },
    },
  },
  {
    // ★ **LE VERDICT N° 7, REPOSÉ SUR DEUX VOIES QUI EXISTENT.**
    //
    //   > « Les deux sont chouettes, mais trop de perte dans celui de droite :
    //   >   `meg` ne tombe pas juste, et 1000 100 sont supprimés, ça fait
    //   >   beaucoup. Celui de gauche est plus élégant, il devrait passer devant
    //   >   / être conservé. » (l'auteur, 22 septembre 2026)
    //
    //   Le cas `2026-09-19-numherololgeek-v2`, juste au-dessus, oppose la tête
    //   d'aujourd'hui à la moisson qu'il préférait — mais celle-là n'est PLUS
    //   FABRIQUÉE (absente aux crans 0, 1 et 2, soit 23, 38 et 65 voies ;
    //   `git bisect` désigne `7b80556`, les trois opérateurs `mas`/`mu8`/`mam`).
    //   Un cas dont la voie de gauche n'existe pas ne peut plus rien trancher.
    //
    //   Celui-ci repose donc la MÊME question sur la meilleure voie SANS PERTE
    //   qui reste dans la liste : la moisson qui lit les 24 caractères
    //   signifiants sur 24, contre la tête qui n'en lit que 17 — les sept
    //   manquants étant exactement « 1000 » et « 100 », ce que la saisie a de
    //   reconnaissable.
    //
    //   ⚠️ **ET IL A UNE BONNE RÉPONSE MESURÉE, qui n'est pas celle qu'on
    //     croit.** Ce n'est PAS un barème qui sous-pèse la perte : la tête paie
    //     déjà −3 000 d'égalisation et −648 de saisie supprimée, pour un crédit
    //     brut de −1 951 et un facteur collé au plancher (520) — le barème ne
    //     peut plus la punir. L'écart qui les sépare n'est pas un écart de
    //     perte, c'est un écart de COHÉRENCE : 709 contre 130. La moisson gagne
    //     l'exhaustivité de 1 000 à 753 et perd tout le reste. Renverser
    //     demanderait de descendre l'exhaustivité de la tête à ~460, soit une
    //     couverture de 38 ‰ pour 17 caractères lus sur 24 : aucune pondération
    //     honnête de la perte ne produit cela.
    //   C'est donc bien un GOÛT qu'on demande ici — « une moisson qui lit tout
    //   mais saute d'une méthode à l'autre vaut-elle mieux qu'une lecture nette
    //   qui jette les chiffres ? » —, et non un réglage à trouver.
    //   → `.planning/A-VENIR.md`, « Descendre le plancher du facteur d'élégance ».
    id: "2026-09-22-numherololgeek-v2-sans-perte",
    place: 1,
    question: "bareme",
    titre: "[gauche 9ᵉ] numherololgeek.1000i100.fr, curseurs v2 — 1ʳᵉ place : la tête jette « 1000 » et « 100 » ; la moisson qui lit tout doit-elle passer devant ?",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    // ⚠️ Cas de BARÈME : la page inverse les côtés (`arbitrage.js › montrer`).
    //    `avant` va à DROITE, sous « Aujourd'hui » ; `apres` va à GAUCHE, sous
    //    « Ce qu'on mettrait à la place ». Le `[gauche 9ᵉ]` du titre désigne
    //    donc bien `apres`, la moisson, qui est 9ᵉ.
    //
    // `avant` — la tête d'aujourd'hui (1ʳᵉ) : lit 17 signifiants sur 24, 15
    // valeurs égalisées, et son `meg` ne tombe pas juste (arrondi 235 ‰).
    avant: "?sce!p25.200.50.150!fl+mqwc+meg$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    // `apres` — la 9ᵉ, celle qu'on mettrait à la place : lit 24 signifiants sur
    // 24, aucun abandon, aucune égalisation, aucun reliquat ; élégance 727
    // contre 0.
    apres: "?sce!p25.200.50.150!0:nv,1+4:mas+cs+pm10,2+3:flt+mpy+mr9,5:fr13+nlc+pc9$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K",
    mesure: {
      commit: "c616f4f",
      date: "2026-09-22",
      avant: {
        rangMoteur: 1, rangGlobal: 1, global: 725, score: 2226, mode: "GROUPEMENT", series: 5,
        axes: { simplicite: 935, exhaustivite: 753, quantite: 556, coherence: 709 },
      },
      apres: {
        rangMoteur: 9, rangGlobal: 9, global: 588, score: 2513, mode: "MOISSON", series: 4,
        axes: { simplicite: 313, exhaustivite: 1000, quantite: 444, coherence: 130 },
      },
    },
  },
  /* ★ **LES DEUX CAS DU CÉSAR JUSTIFIÉ — 22 septembre 2026.**
   *
   * > « Je voudrais des variantes mieux notées des césar* qui commencent par
   * >   trouver le nombre utilisé pour faire le décalage dans la saisie
   * >   d'origine avant de l'appliquer. » (l'auteur)
   *
   * ⚠️ **CES DEUX CAS NE SONT PAS DES CAS DE PLACE, et il faut le savoir avant
   *   de les regarder.** Les huit cas ci-dessus opposent deux candidats à une
   *   même place dans une liste. Ici, AUCUNE des quatre voies n'est dans la
   *   liste, à aucun cran — et c'est justement ce qu'il y a à arbitrer. Le
   *   césar justifié est un JUMEAU ARITHMÉTIQUE de son aîné : il rend les mêmes
   *   lettres, donc les mêmes nombres, donc le même verdict. Le moteur ne garde
   *   qu'un chemin par résultat, et il rencontre toujours l'aîné le premier
   *   puisque l'ordre d'exploration est celui du registre (§4.4 règle 3) et que
   *   l'append-only inscrit les codes neufs à la fin.
   *
   *   MESURÉ : retirer le seul `fr22` du catalogue fait apparaître quatre voies
   *   `fj22` qui n'existaient nulle part avant. Ce n'est donc pas un verdict de
   *   classement, c'est une éviction de recherche — et la trancher demanderait
   *   d'apprendre au faisceau que « mieux noté » l'emporte sur « rencontré le
   *   premier », ce qui touche tous les jumeaux du catalogue.
   *
   * ★ **CE QUI EST SOUMIS, DONC** : à programme identique, la version justifiée
   *   vaut-elle son prix ? Elle montre une étape de plus — les caractères
   *   communs désignés et comptés, sans être consommés — et elle marque 83
   *   points de plus à gauche, 79 à droite. Si la réponse est oui, le chantier
   *   du faisceau se justifie ; si elle est non, les quatorze codes sont à
   *   déprécier plutôt qu'à servir.
   *
   * Relevés par `rejouer(lire(lien))` sur la branche `cesar-trouve-son-decalage`.
   * La mesure complète est dans `.planning/arbitrages/2026-09-22-cesar-justifie.md`.
   */
  {
    id: "2026-09-22-fouche-cesar-justifie",
    place: 1,
    titre: "[aucune des deux en liste] Louis Fouché — le décalage 22 : essayé parmi vingt-cinq (gauche), ou lu dans la saisie (droite, +83 points)",
    saisie: "Louis Fouché",
    // à gauche (« Avant ») : le césar arbitraire, celui de `main`
    avant: "?sce!fr22+fl+m14$7NFn8xBqb5eNAq3YCY",
    // à droite (« Après ») : le même décalage, mais « Louis » et « Fouché »
    // ont deux caractères en commun chacun (o, u) — 2 et 2 font 22
    apres: "?sce!fj22+fl+m14$7NFn8xBqb5eNAq3YCY",
  },
  {
    id: "2026-09-22-raoult-cesar-justifie",
    place: 1,
    titre: "[aucune des deux en liste] Didier Raoult — le décalage 11 : arbitraire (gauche), ou lu dans le seul r que les deux mots partagent (droite, +79 points)",
    saisie: "Didier Raoult",
    // à gauche (« Avant ») : le césar arbitraire, celui de `main`
    avant: "?sce!fr11+fl+m14$6hVamBkJyG1MWtPRwR",
    // à droite (« Après ») : « Didier » et « Raoult » n'ont que le `r` en
    // commun, un de chaque côté — 1 et 1 font 11
    apres: "?sce!fj11+fl+m14$6hVamBkJyG1MWtPRwR",
  },
]);
