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
 * ★ **CE QUI RESTE OUVERT.** Un seul cas, et l'auteur l'a lui-même déclaré
 *   indécidable : « les deux sont tellement bien, vraiment je ne sais pas quoi
 *   dire. Je vais assouplir : celle que tu veux en 1ᵉʳ résultat, mais l'autre
 *   doit être en 3ᵉ. » Le cas reste ici pour ce qu'il montre — deux façons
 *   opposées d'être bon sur la même saisie —, et non parce qu'il bloque.
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

/** Un cas : `{ id, place, titre, saisie, avant, apres }`.
 * ★ **NEUF CAS NOUVEAUX — LE CLASSEMENT DU MOTEUR CONTRE LE « SCORE GLOBAL »
 *   AFFICHÉ.**
 *
 *   > « Si on triait selon le score global affiché, est-ce que ça changerait des
 *   >   têtes de liste, et si oui lesquelles, avec combien d'écart ? […]
 *   >   Idéalement je passerais bien le classement sur le score global
 *   >   affiché. » (l'auteur)
 *
 *   L'audit avait relevé que le « Score global » des cartes — la moyenne des
 *   quatre axes, à parts égales au défaut — n'est pas ce qui ordonne la liste :
 *   le moteur classe sur `approche.score` (six critères, rendement, élégance,
 *   bonus, malus de décret) et, avant lui, sur le RANG (`score.js › RANG` : les
 *   séries disjointes d'abord). Mesuré sur seize saisies : **neuf têtes de liste
 *   changeraient**. Chaque cas oppose, à la même place, la tête du moteur (à
 *   gauche) et celle que le global mettrait en tête (à droite), avec pour
 *   chacune le global, les deux rangs, les quatre axes et les six critères tels
 *   qu'ils ont été relevés — la page les recalcule aussi EN DIRECT, si bien
 *   qu'un écart entre le relevé et l'écran se verrait.
 *
 *   ★ **CE QUE LES NEUF CAS ONT EN COMMUN**, et qui est la vraie question : la
 *     tête du moteur est sept fois sur neuf une MOISSON ou une PARTITION —
 *     plusieurs portées, plusieurs méthodes —, dont l'homogénéité vaut 300 ou
 *     133 parce que les méthodes diffèrent, et que le RANG place devant malgré
 *     un score de conviction parfois inférieur. Le global, qui ignore le rang
 *     et moyenne quatre axes à égalité, préfère toujours un GROUPEMENT à une
 *     seule méthode (H = 1000). Trancher entre les deux, c'est trancher entre
 *     « privilégie celle qui donne le plus de séries sans réutiliser les mêmes
 *     caractères » et « la plus simple et la plus cohérente ».
 */
export const CAS_ARBITRAGE = Object.freeze([
  /* ★ **LES CAS DE BARÈME — la tête d'aujourd'hui contre celle qu'on mettrait
       à sa place.**

     > « Pas besoin de mentionner v2. Il y a ce qui est branché dans le moteur,
     >   et ce qu'on envisage de mettre à la place. » (l'auteur)

     Chaque cas oppose DEUX VOIES, et rien d'autre. Les deux se lisent au
     barème en place, avec les mêmes axes et le même global : ce qu'on arbitre,
     c'est laquelle mérite la place, pas laquelle de deux notations a raison.
     Le jour où un autre barème est branché, ces mêmes cas se relisent avec lui
     sans qu'on ait à toucher une ligne.

     ⚠️ **LES RELEVÉS VIEILLISSENT, ET LA PAGE LE DIT.** `mesure` garde le rang
       et le score du jour où le cas a été posé ; quand l'écran affiche autre
       chose, un avertissement rouge le signale (`arbitrage.js ›
       arb__scores-ecart`) plutôt que de laisser croire à un classement qui
       n'existe plus. */
  {
    id: 'v2-elegance-https-hope-hope-hope-fr',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "https://hope-hope-hope.fr/ — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "https://hope-hope-hope.fr/",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
      avant: { rangMoteur: 11, rangGlobal: 16, global: 466, score: 3760, mode: 'PARTITION', series: 1 },
      apres: { absente: true },
    },
  },
  {
    id: 'v2-mixte-https-hope-hope-hope-fr',
    place: 3,
    regime: 'mixte',
    question: 'bareme',
    titre: "https://hope-hope-hope.fr/ — 3ᵉ résultat — tête de la liste ordinaire : celle d’aujourd’hui, ou l’autre",
    saisie: "https://hope-hope-hope.fr/",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr14+m14+mpf,3+5+7:ffr3+m14+mpf,9:fr9+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
      avant: { rangMoteur: 2, rangGlobal: 6, global: 587, score: 2137, mode: 'MOISSON', series: 7 },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 827, score: 4447, mode: 'GROUPEMENT', series: 6 },
    },
  },
  {
    id: 'v2-elegance-capitalisme',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "Capitalisme — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "Capitalisme",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!fr21+mx6+mrd#Hi75aotg77MXEgC',
    apres: '#sce!fr6+mpy+meg#Hi75aotg77MXEgC',
    mesure: {
      avant: { absente: true },
      apres: { rangMoteur: 4, rangGlobal: 2, global: 697, score: 2600, mode: 'GROUPEMENT', series: 3 },
    },
  },
  {
    id: 'v2-mixte-la-numerologie-est-une-s',
    place: 3,
    regime: 'mixte',
    question: 'bareme',
    titre: "La numérologie est une science exacte, disent-ils — 3ᵉ résultat — tête de la liste ordinaire : celle d’aujourd’hui, ou l’autre",
    saisie: "La numérologie est une science exacte, disent-ils",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr3+m14,2+6+13:m14,4:fr11+m14,8:fr2+m14+mpf,10:fr10+m14+mpf,15:fatb+m14#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    apres: '#sce!10:fr18;fc+mt9+meg#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    mesure: {
      avant: { absente: true },
      apres: { rangMoteur: 1, rangGlobal: 1, global: 829, score: 2720, mode: 'GROUPEMENT', series: 8 },
    },
  },
  {
    id: 'v2-elegance-donald-trump',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "Donald Trump — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "Donald Trump",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:fatb+mt9+mr9,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+mqwc+meg#2HuP1G8mNg3sJWhqR',
    mesure: {
      avant: { rangMoteur: 4, rangGlobal: 12, global: 529, score: 2866, mode: 'MOISSON', series: 3 },
      apres: { rangMoteur: 6, rangGlobal: 3, global: 722, score: 2810, mode: 'GROUPEMENT', series: 3 },
    },
  },
  {
    id: 'v2-mixte-donald-trump',
    place: 3,
    regime: 'mixte',
    question: 'bareme',
    titre: "Donald Trump — 3ᵉ résultat — tête de la liste ordinaire : celle d’aujourd’hui, ou l’autre",
    saisie: "Donald Trump",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr15+mx6+mrn,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+mqwc+meg#2HuP1G8mNg3sJWhqR',
    mesure: {
      avant: { rangMoteur: 5, rangGlobal: 14, global: 520, score: 2202, mode: 'MOISSON', series: 3 },
      apres: { rangMoteur: 3, rangGlobal: 2, global: 722, score: 2337, mode: 'GROUPEMENT', series: 3 },
    },
  },
  {
    id: 'v2-elegance-henri-prunelle',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "Henri Prunelle — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "Henri Prunelle",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:mt9+cs+prn,2:fr20+mazc+mr9#TcguSXTd7SkC7z32JAG',
    apres: '#sce!fl+mazc+meg#TcguSXTd7SkC7z32JAG',
    mesure: {
      avant: { absente: true },
      apres: { rangMoteur: 5, rangGlobal: 2, global: 763, score: 3033, mode: 'GROUPEMENT', series: 4 },
    },
  },
  {
    id: 'v2-abondance-henri-prunelle',
    place: 2,
    regime: 'abondance',
    question: 'bareme',
    titre: "Henri Prunelle — 2ᵈ place — « la plus fournie » : celle d’aujourd’hui, ou l’autre",
    saisie: "Henri Prunelle",
    curseurs: {"simplicite": 0, "exhaustivite": 0, "quantite": 200, "coherence": 0},
    avant: '#sce!fl+mazc+meg#TcguSXTd7SkC7z32JAG',
    apres: '#sce!2:fatb;fl+mpy+meg#TcguSXTd7SkC7z32JAG',
    mesure: {
      avant: { rangMoteur: 3, rangGlobal: 3, global: 763, score: 4400, mode: 'GROUPEMENT', series: 4 },
      apres: { rangMoteur: 1, rangGlobal: 1, global: 768, score: 4462, mode: 'GROUPEMENT', series: 4 },
    },
  },
  {
    id: 'v2-elegance-numherololgeek-1000i100-',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "numherololgeek.1000i100.fr — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    apres: '#sce!0:nv,2+3:flt+mpy+mr9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    mesure: {
      avant: { rangMoteur: 2, rangGlobal: 19, global: 456, score: 3872, mode: 'PARTITION', series: 1 },
      apres: { rangMoteur: 1, rangGlobal: 17, global: 542, score: 4113, mode: 'MOISSON', series: 3 },
    },
  },
  {
    id: 'v2-mixte-numherololgeek-1000i100-',
    place: 3,
    regime: 'mixte',
    question: 'bareme',
    titre: "numherololgeek.1000i100.fr — 3ᵉ résultat — tête de la liste ordinaire : celle d’aujourd’hui, ou l’autre",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr10;fl+mpy+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    apres: '#sce!fl+mqwc+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 1, global: 744, score: 1952, mode: 'GROUPEMENT', series: 5 },
      apres: { rangMoteur: 5, rangGlobal: 5, global: 738, score: 1915, mode: 'GROUPEMENT', series: 5 },
    },
  },
  {
    id: 'v2-elegance-hope',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "hope — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "hope",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!m14#3fq9KJ',
    apres: '#sce!fc+ma1+cs+prn,nlc,mexb+cs#3fq9KJ',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 1, global: 704, score: 6204, mode: 'GROUPEMENT', series: 1 },
      apres: { rangMoteur: 4, rangGlobal: 4, global: 523, score: 3382, mode: 'CONVERGENCE', series: 1 },
    },
  },
  {
    id: 'v2-elegance-wikipedia',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "Wikipedia — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "Wikipedia",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!fr21+mx6+mad#27Xv14MeSfjBN',
    apres: '#sce!fr17+mpy+meg#27Xv14MeSfjBN',
    mesure: {
      avant: { absente: true },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 720, score: 3179, mode: 'GROUPEMENT', series: 3 },
    },
  },
  {
    id: 'v2-elegance-eleonore-a-nimes',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: "Éléonore à Nîmes — 1ʳᵉ place — « la plus belle » : celle d’aujourd’hui, ou l’autre",
    saisie: "Éléonore à Nîmes",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:nl,2:m7+cs,4:fc+nlc#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    apres: '#sce!2:ffr4;fl+m14+meg#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    mesure: {
      avant: { rangMoteur: 6, rangGlobal: 17, global: 453, score: 1995, mode: 'PARTITION', series: 1 },
      apres: { rangMoteur: 3, rangGlobal: 1, global: 829, score: 2999, mode: 'GROUPEMENT', series: 6 },
    },
  },
  {
    id: 'v2-exception-hope-url-cran-1',
    place: 1,
    regime: 'elegance',
    question: 'bareme',
    titre: 'https://hope-hope-hope.fr/ — l’exception des motifs répétés (voie fabriquée à partir du cran 1)',
    saisie: 'https://hope-hope-hope.fr/',
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    /* ⚠️ **CET ARBITRAGE EST CADUC — mesuré le 8 septembre 2026.**
       La question posée était : faut-il élargir la génération au cran 0 pour
       que la moisson à motifs répétés se voie dès l'accueil ? Elle ne se pose
       plus : **la voie est déjà au rang 2 au cran 0**, largeur d'assemblage
       inchangée (8), sur `hope-hope-hope.fr` comme sur `https://…`. Élargir à
       10 ne déplace aucune tête des dix-neuf saisies du corpus, et ne change
       pas le temps — 14,7 / 14,6 / 13,7 / 19,2 s en alternant les deux
       largeurs, la variance de charge domine. Le cas reste ici pour mémoire.

       ★ « Un bonus d'élégance spécifique pour trois fragments identiques
       convertis groupés et plusieurs "-" convertis groupés » (l'auteur). À
       gauche le groupement qui tenait la tête au cran 0 ; à droite la
       moisson « 3 × m14 + 2 tirets » que le bonus (200/100) porte en 1ʳᵉ place
       — mais elle n'est FABRIQUÉE qu'à partir du cran 1 de fouille (rang
       5 du moteur), pas au cran 0. Rejouée ici par son lien, elle se voit ;
       à l'accueil, elle n'existe pas encore. */
    avant: '#sce!f1!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!f1!0:fr14+m14+mpf,3+5+7:m14,4+6:mtc#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
      avant: { absente: true },
      apres: { absente: true },
    },
  },
  {
    id: 'absorption-donald-trump-2e-place',
    place: 2,
    titre: 'Donald Trump — 2ᵈ place : la moisson qui jette deux valeurs, ou l’absorption qui ne jette rien',
    saisie: 'Donald Trump',
    /* ★ « Toujours proposer un chemin sans aucune perte, même s'il ne remonte
       pas toujours en premier résultat » (l'auteur). À gauche la moisson à
       trois séries qui laissait un 5 et un 8 au verdict (R = 818) ; à droite
       `2:fr15;fl+tca+masc+mab` — « Donald » réécrit en amont, tout lu d'un trait, les
       intrus fondus dans les chiffres de la cible, rien de jeté (R = 1000),
       quatre séries. La 1ʳᵉ place reste la moisson ; c'est « la plus fournie »
       qui change de main, parce qu'elle en a une de plus et ne jette rien.
       Deux tests de référence ont été actualisés en conséquence
       (`elegance.test.js`, `recherche.test.js`). */
    avant: '#sce!0:fatb+mt9+mr9,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!2:fr15;fl+masc+mab#2HuP1G8mNg3sJWhqR',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 11, global: 529, score: 4077, mode: 'MOISSON', series: 3 },
      apres: { rangMoteur: 2, rangGlobal: 1, global: 743, score: 4272, mode: 'GROUPEMENT', series: 4 },
    },
  },
  {
    id: 'hope-place-1-brieve-ou-nommee',
    place: 1,
    titre: 'hope-hope-hope.fr — 1ʳᵉ place : la brève, ou celle que l’auteur a nommée',
    saisie: 'hope-hope-hope.fr',
    /* ★ LE CAS QUI A OUVERT LA QUESTION, et l'auteur l'a déjà tranché :
       « Elle ne jette que le `.` et se sert de tout le reste, ce qui compense la
       longueur légèrement plus importante. L'autre voie, avec `fl`, jette
       `- - .` soit 3 caractères, puis en jette 5 et 7 à la fin. »

         à gauche  `fl+tca+m14`   3 étapes · R =  857 · 4 séries
         à droite  la groupée    15 étapes · R = 1 000 · 5 séries

       ⚠️ La voie de droite N'EST PAS ENCORE FABRIQUÉE par la recherche : elle
         se rejoue par son lien, mais l'assemblage la rejette pour un
         surnuméraire d'UN 6 sur la portée « fr » — seize récoltés pour quinze
         montrés. Deux verrous ont été levés (l'uniformisation n'essayait que le
         programme majoritaire, et refusait tout alignement rapportant moins) ;
         il en reste un, non identifié. */
    avant: '#sce!fl+tca+m14#yvQYkzhNVYJT8wM8jhvJxSM',
    apres: '#sce!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    mesure: {
      avant: { absente: true },
      apres: { absente: true },
    },
  },
]);
