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
  /* ★ **LES CAS DU SCORE V2 — la tête d'aujourd'hui contre la tête que le
     score v2 mettrait à la même place.** « Avec ces derniers changements,
     peux-tu actualiser les arbitrages à faire ? (en AB-testing) » (l'auteur).
     Ils remplacent les neuf cas « score global » de la veille, que l'itération
     a rendus obsolètes. Configuration mesurée : `score-v2.js` — courbe des
     pertes à l'exposant 65, `meg` facturé une fois, bonus de motif 200/100,
     régimes 6/29/48/18, 6/47/12/35, quantité seule. Chaque côté porte ses
     quatre axes v2 et son global v2 (`mesure`) ; la page les affiche à côté
     des scores d'aujourd'hui. Relevé du 7 septembre 2026. */
  {
    id: 'v2-elegance-https-hope-hope-hope-fr',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "https://hope-hope-hope.fr/ — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "https://hope-hope-hope.fr/",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 9,
        "score": 3280,
        "globalV2": 765,
        "axesV2": {
         "simplicite": 338,
         "exhaustivite": 976,
         "quantite": 141,
         "coherence": 764
        },
        "mode": "PARTITION",
        "series": 1
       },
       "apres": {
        "rangMoteur": 4,
        "rangV2": 1,
        "score": 3763,
        "globalV2": 864,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 892,
         "quantite": 1000,
         "coherence": 766
        },
        "mode": "GROUPEMENT",
        "series": 6
       }
      },
  },
  {
    id: 'v2-mixte-https-hope-hope-hope-fr',
    place: 3,
    regime: 'mixte',
    question: 'v2',
    titre: "https://hope-hope-hope.fr/ — 3ᵉ résultat — tête de la liste ordinaire : aujourd’hui, ou score v2",
    saisie: "https://hope-hope-hope.fr/",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr14+m14+mpf,3+5+7:ffr3+m14+mpf,9:fr9+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
       "avant": {
        "rangMoteur": 3,
        "rangV2": 2,
        "score": 1274,
        "globalV2": 849,
        "axesV2": {
         "simplicite": 686,
         "exhaustivite": 641,
         "quantite": 1000,
         "coherence": 832
        },
        "mode": "MOISSON",
        "series": 7
       },
       "apres": {
        "rangMoteur": 4,
        "rangV2": 1,
        "score": 3763,
        "globalV2": 925,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 892,
         "quantite": 1000,
         "coherence": 766
        },
        "mode": "GROUPEMENT",
        "series": 6
       }
      },
  },
  {
    id: 'v2-elegance-capitalisme',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "Capitalisme — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "Capitalisme",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!fr21+mx6+mrd#Hi75aotg77MXEgC',
    apres: '#sce!fr6+mpy+meg#Hi75aotg77MXEgC',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 5,
        "score": 5264,
        "globalV2": 746,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 795,
         "quantite": 731,
         "coherence": 652
        },
        "mode": "GROUPEMENT",
        "series": 3
       },
       "apres": {
        "rangMoteur": 2,
        "rangV2": 1,
        "score": 3236,
        "globalV2": 781,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 868,
         "quantite": 738,
         "coherence": 650
        },
        "mode": "GROUPEMENT",
        "series": 3
       }
      },
  },
  {
    id: 'v2-mixte-la-numerologie-est-une-s',
    place: 3,
    regime: 'mixte',
    question: 'v2',
    titre: "La numérologie est une science exacte, disent-ils — 3ᵉ résultat — tête de la liste ordinaire : aujourd’hui, ou score v2",
    saisie: "La numérologie est une science exacte, disent-ils",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr3+m14,2+6+13:m14,4:fr11+m14,8:fr2+m14+mpf,10:fr10+m14+mpf,15:fatb+m14#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    apres: '#sce!10:fr18;fc+mt9+meg#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    mesure: {
       "avant": {
        "rangMoteur": 3,
        "rangV2": 5,
        "score": 1864,
        "globalV2": 806,
        "axesV2": {
         "simplicite": 713,
         "exhaustivite": 659,
         "quantite": 1000,
         "coherence": 556
        },
        "mode": "MOISSON",
        "series": 9
       },
       "apres": {
        "rangMoteur": 6,
        "rangV2": 1,
        "score": 3229,
        "globalV2": 858,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 767,
         "quantite": 1000,
         "coherence": 593
        },
        "mode": "GROUPEMENT",
        "series": 8
       }
      },
  },
  {
    id: 'v2-elegance-donald-trump',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "Donald Trump — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "Donald Trump",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:fatb+mt9+mr9,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+mqwc+meg#2HuP1G8mNg3sJWhqR',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 3,
        "score": 4077,
        "globalV2": 768,
        "axesV2": {
         "simplicite": 442,
         "exhaustivite": 840,
         "quantite": 780,
         "coherence": 723
        },
        "mode": "MOISSON",
        "series": 3
       },
       "apres": {
        "rangMoteur": 4,
        "rangV2": 1,
        "score": 3447,
        "globalV2": 802,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 840,
         "quantite": 753,
         "coherence": 741
        },
        "mode": "GROUPEMENT",
        "series": 3
       }
      },
  },
  {
    id: 'v2-mixte-donald-trump',
    place: 3,
    regime: 'mixte',
    question: 'v2',
    titre: "Donald Trump — 3ᵉ résultat — tête de la liste ordinaire : aujourd’hui, ou score v2",
    saisie: "Donald Trump",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr15+mx6+mrn,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+mqwc+meg#2HuP1G8mNg3sJWhqR',
    mesure: {
       "avant": {
        "rangMoteur": 2,
        "rangV2": 4,
        "score": 3921,
        "globalV2": 762,
        "axesV2": {
         "simplicite": 442,
         "exhaustivite": 840,
         "quantite": 780,
         "coherence": 694
        },
        "mode": "MOISSON",
        "series": 3
       },
       "apres": {
        "rangMoteur": 4,
        "rangV2": 1,
        "score": 3447,
        "globalV2": 788,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 840,
         "quantite": 753,
         "coherence": 741
        },
        "mode": "GROUPEMENT",
        "series": 3
       }
      },
  },
  {
    id: 'v2-elegance-henri-prunelle',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "Henri Prunelle — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "Henri Prunelle",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:mt9+cs+prn,2:fr20+mazc+mr9#TcguSXTd7SkC7z32JAG',
    apres: '#sce!fl+mazc+meg#TcguSXTd7SkC7z32JAG',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 6,
        "score": 3273,
        "globalV2": 712,
        "axesV2": {
         "simplicite": 442,
         "exhaustivite": 779,
         "quantite": 560,
         "coherence": 717
        },
        "mode": "MOISSON",
        "series": 2
       },
       "apres": {
        "rangMoteur": 2,
        "rangV2": 1,
        "score": 3660,
        "globalV2": 847,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 900,
         "quantite": 894,
         "coherence": 744
        },
        "mode": "GROUPEMENT",
        "series": 4
       }
      },
  },
  {
    id: 'v2-abondance-henri-prunelle',
    place: 2,
    regime: 'abondance',
    question: 'v2',
    titre: "Henri Prunelle — 2ᵈ place — « la plus fournie » : aujourd’hui, ou score v2",
    saisie: "Henri Prunelle",
    curseurs: {"simplicite": 0, "exhaustivite": 0, "quantite": 200, "coherence": 0},
    avant: '#sce!fl+mazc+meg#TcguSXTd7SkC7z32JAG',
    apres: '#sce!2:fatb;fl+mpy+meg#TcguSXTd7SkC7z32JAG',
    mesure: {
       "avant": {
        "rangMoteur": 2,
        "rangV2": 2,
        "score": 3660,
        "globalV2": 894,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 900,
         "quantite": 894,
         "coherence": 744
        },
        "mode": "GROUPEMENT",
        "series": 4
       },
       "apres": {
        "rangMoteur": 3,
        "rangV2": 1,
        "score": 3712,
        "globalV2": 916,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 900,
         "quantite": 916,
         "coherence": 597
        },
        "mode": "GROUPEMENT",
        "series": 4
       }
      },
  },
  {
    id: 'v2-elegance-numherololgeek-1000i100-',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "numherololgeek.1000i100.fr — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    apres: '#sce!0:nv,2+3:flt+mpy+mr9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 3,
        "score": 3891,
        "globalV2": 747,
        "axesV2": {
         "simplicite": 373,
         "exhaustivite": 974,
         "quantite": 141,
         "coherence": 710
        },
        "mode": "PARTITION",
        "series": 1
       },
       "apres": {
        "rangMoteur": 9,
        "rangV2": 1,
        "score": 4417,
        "globalV2": 816,
        "axesV2": {
         "simplicite": 519,
         "exhaustivite": 945,
         "quantite": 780,
         "coherence": 706
        },
        "mode": "MOISSON",
        "series": 3
       }
      },
  },
  {
    id: 'v2-mixte-numherololgeek-1000i100-',
    place: 3,
    regime: 'mixte',
    question: 'v2',
    titre: "numherololgeek.1000i100.fr — 3ᵉ résultat — tête de la liste ordinaire : aujourd’hui, ou score v2",
    saisie: "numherololgeek.1000i100.fr",
    curseurs: {"simplicite": 25, "exhaustivite": 120, "quantite": 200, "coherence": 75},
    avant: '#sce!0:fr10;fl+mpy+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    apres: '#sce!fl+mqwc+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    mesure: {
       "avant": {
        "rangMoteur": 3,
        "rangV2": 2,
        "score": 3112,
        "globalV2": 844,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 716,
         "quantite": 1000,
         "coherence": 597
        },
        "mode": "GROUPEMENT",
        "series": 5
       },
       "apres": {
        "rangMoteur": 6,
        "rangV2": 1,
        "score": 3061,
        "globalV2": 871,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 716,
         "quantite": 1000,
         "coherence": 747
        },
        "mode": "GROUPEMENT",
        "series": 5
       }
      },
  },
  {
    id: 'v2-elegance-hope',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "hope — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "hope",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!m14#3fq9KJ',
    apres: '#sce!fc+ma1+cs+prn,nlc,mexb+cs#3fq9KJ',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 2,
        "score": 7301,
        "globalV2": 784,
        "axesV2": {
         "simplicite": 1000,
         "exhaustivite": 837,
         "quantite": 205,
         "coherence": 871
        },
        "mode": "GROUPEMENT",
        "series": 1
       },
       "apres": {
        "rangMoteur": 3,
        "rangV2": 1,
        "score": 3393,
        "globalV2": 807,
        "axesV2": {
         "simplicite": 338,
         "exhaustivite": 1000,
         "quantite": 70,
         "coherence": 873
        },
        "mode": "CONVERGENCE",
        "series": 1
       }
      },
  },
  {
    id: 'v2-elegance-wikipedia',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "Wikipedia — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "Wikipedia",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!fr21+mx6+mad#27Xv14MeSfjBN',
    apres: '#sce!fr17+mpy+meg#27Xv14MeSfjBN',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 7,
        "score": 6036,
        "globalV2": 780,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 868,
         "quantite": 723,
         "coherence": 652
        },
        "mode": "GROUPEMENT",
        "series": 3
       },
       "apres": {
        "rangMoteur": 2,
        "rangV2": 1,
        "score": 3580,
        "globalV2": 843,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 1000,
         "quantite": 753,
         "coherence": 645
        },
        "mode": "GROUPEMENT",
        "series": 3
       }
      },
  },
  {
    id: 'v2-elegance-eleonore-a-nimes',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: "Éléonore à Nîmes — 1ʳᵉ place — « la plus belle » : aujourd’hui, ou score v2",
    saisie: "Éléonore à Nîmes",
    curseurs: {"simplicite": 25, "exhaustivite": 200, "quantite": 50, "coherence": 150},
    avant: '#sce!0:nl,2:m7+cs,4:fc+nlc#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    apres: '#sce!2:ffr4;fl+m14+meg#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    mesure: {
       "avant": {
        "rangMoteur": 1,
        "rangV2": 3,
        "score": 2690,
        "globalV2": 751,
        "axesV2": {
         "simplicite": 309,
         "exhaustivite": 876,
         "quantite": 141,
         "coherence": 861
        },
        "mode": "PARTITION",
        "series": 1
       },
       "apres": {
        "rangMoteur": 3,
        "rangV2": 1,
        "score": 3824,
        "globalV2": 835,
        "axesV2": {
         "simplicite": 955,
         "exhaustivite": 968,
         "quantite": 1000,
         "coherence": 583
        },
        "mode": "GROUPEMENT",
        "series": 6
       }
      },
  },
  {
    id: 'v2-exception-hope-url-cran-1',
    place: 1,
    regime: 'elegance',
    question: 'v2',
    titre: 'https://hope-hope-hope.fr/ — l’exception des motifs répétés (voie fabriquée à partir du cran 1)',
    saisie: 'https://hope-hope-hope.fr/',
    curseurs: { simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 },
    /* ★ « Un bonus d'élégance spécifique pour trois fragments identiques
       convertis groupés et plusieurs "-" convertis groupés » (l'auteur). À
       gauche le groupement que la v2 met en tête au cran 0 ; à droite la
       moisson « 3 × m14 + 2 tirets » que le bonus (200/100) porte en 1ʳᵉ place
       — mais elle n'est FABRIQUÉE qu'à partir du cran 1 de fouille (rang
       5 du moteur), pas au cran 0. Rejouée ici par son lien, elle se voit ;
       à l'accueil, elle n'existe pas encore. */
    avant: '#sce!f1!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!f1!0:fr14+m14+mpf,3+5+7:m14,4+6:mtc#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
      avant: { rangMoteur: 4, rangV2: 2, score: null, globalV2: 864, axesV2: { simplicite: 955, exhaustivite: 892, quantite: 1000, coherence: 766 }, mode: 'GROUPEMENT', series: 6 },
      apres: { rangMoteur: 5, rangV2: 1, score: null, globalV2: 876, axesV2: { simplicite: 473, exhaustivite: 836, quantite: 1000, coherence: 954 }, mode: 'MOISSON', series: 6 },
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
  },
]);
