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
  {
    id: 'global-https-hope-hope-hope-fr',
    place: 1,
    titre: 'https://hope-hope-hope.fr/ — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'https://hope-hope-hope.fr/',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +361 pour la droite ; écart de score
       moteur : -483 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!fl+mpy+meg#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 15, score: 3280, global: 466, mode: 'PARTITION', series: 1,
        axes: { simplicite: 348, exhaustivite: 912, quantite: 111, coherence: 491 },
        criteres: { H: 133, N: 450, U: 912, C: 527, A: 506, E: 1000, R: null } },
      apres: { rangMoteur: 4, rangGlobal: 1, score: 3763, global: 827, mode: 'GROUPEMENT', series: 6,
        axes: { simplicite: 935, exhaustivite: 974, quantite: 667, coherence: 732 },
        criteres: { H: 1000, N: 450, U: 1000, C: 880, A: 700, E: 1000, R: 947 } },
    },
  },
  {
    id: 'global-capitalisme',
    place: 1,
    titre: 'Capitalisme — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'Capitalisme',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +39 pour la droite ; écart de score
       moteur : +2028 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!fr21+mx6+mrd#Hi75aotg77MXEgC',
    apres: '#sce!fr6+mpy+meg#Hi75aotg77MXEgC',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 5, score: 5264, global: 658, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 821, quantite: 333, coherence: 541 },
        criteres: { H: 1000, N: 243, U: 1000, C: 880, A: 242, E: 922, R: 642 } },
      apres: { rangMoteur: 2, rangGlobal: 1, score: 3236, global: 697, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 909, quantite: 333, coherence: 610 },
        criteres: { H: 1000, N: 306, U: 1000, C: 880, A: 385, E: 1000, R: 818 } },
    },
  },
  {
    id: 'global-la-numerologie-est-une-scien',
    place: 1,
    titre: 'La numérologie est une science exacte, disent-ils — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'La numérologie est une science exacte, disent-ils',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +348 pour la droite ; écart de score
       moteur : -817 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0.5:nl+prn,10:nl,13:nd#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    apres: '#sce!10:fr18;fc+mt9+meg#wapt1NMKMypvYVfgt71ycBNqoCxRYgzKbH5s8zEg4rQGFDT9JeyTt2n1jBUTTNMxFHfx',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 14, score: 2412, global: 481, mode: 'LIBRE', series: 1,
        axes: { simplicite: 604, exhaustivite: 478, quantite: 111, coherence: 731 },
        criteres: { H: 400, N: 643, U: 478, C: 774, A: 1000, E: 1000, R: null } },
      apres: { rangMoteur: 6, rangGlobal: 1, score: 3229, global: 829, mode: 'GROUPEMENT', series: 8,
        axes: { simplicite: 935, exhaustivite: 764, quantite: 889, coherence: 727 },
        criteres: { H: 1000, N: 437, U: 527, C: 880, A: 700, E: 1000, R: 1000 } },
    },
  },
  {
    id: 'global-donald-trump',
    place: 1,
    titre: 'Donald Trump — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'Donald Trump',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +193 pour la droite ; écart de score
       moteur : +630 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:fatb+mt9+mr9,2:fr3+mhe+mrn#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+mazc+meg#2HuP1G8mNg3sJWhqR',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 8, score: 4077, global: 529, mode: 'MOISSON', series: 3,
        axes: { simplicite: 463, exhaustivite: 847, quantite: 333, coherence: 474 },
        criteres: { H: 300, N: 381, U: 876, C: 599, A: 390, E: 979, R: 818 } },
      apres: { rangMoteur: 3, rangGlobal: 1, score: 3447, global: 722, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 909, quantite: 333, coherence: 709 },
        criteres: { H: 1000, N: 387, U: 1000, C: 880, A: 700, E: 1000, R: 818 } },
    },
  },
  {
    id: 'global-henri-prunelle',
    place: 1,
    titre: 'Henri Prunelle — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'Henri Prunelle',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +285 pour la droite ; écart de score
       moteur : -439 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:mt9+cs+prn,2:fr20+mazc+mr9#TcguSXTd7SkC7z32JAG',
    apres: '#sce!2:fatb;fl+mpy+meg#TcguSXTd7SkC7z32JAG',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 12, score: 3273, global: 483, mode: 'MOISSON', series: 2,
        axes: { simplicite: 463, exhaustivite: 780, quantite: 222, coherence: 466 },
        criteres: { H: 300, N: 368, U: 893, C: 599, A: 357, E: 1000, R: 666 } },
      apres: { rangMoteur: 3, rangGlobal: 1, score: 3712, global: 768, mode: 'GROUPEMENT', series: 4,
        axes: { simplicite: 935, exhaustivite: 962, quantite: 444, coherence: 732 },
        criteres: { H: 1000, N: 450, U: 1000, C: 880, A: 700, E: 1000, R: 923 } },
    },
  },
  {
    id: 'global-numherololgeek-1000i100-fr',
    place: 1,
    titre: 'numherololgeek.1000i100.fr — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'numherololgeek.1000i100.fr',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +293 pour la droite ; écart de score
       moteur : +958 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    apres: '#sce!2:flt;fl+mpy+meg#4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 19, score: 3891, global: 456, mode: 'PARTITION', series: 1,
        axes: { simplicite: 387, exhaustivite: 886, quantite: 111, coherence: 441 },
        criteres: { H: 133, N: 392, U: 886, C: 599, A: 378, E: 1000, R: null } },
      apres: { rangMoteur: 2, rangGlobal: 1, score: 2933, global: 749, mode: 'GROUPEMENT', series: 5,
        axes: { simplicite: 935, exhaustivite: 772, quantite: 556, coherence: 732 },
        criteres: { H: 1000, N: 450, U: 830, C: 880, A: 700, E: 1000, R: 714 } },
    },
  },
  {
    id: 'global-wikipedia',
    place: 1,
    titre: 'Wikipedia — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'Wikipedia',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +35 pour la droite ; écart de score
       moteur : +2456 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!fr21+mx6+mad#27Xv14MeSfjBN',
    apres: '#sce!fr17+mpy+meg#27Xv14MeSfjBN',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 5, score: 6036, global: 685, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 909, quantite: 333, coherence: 564 },
        criteres: { H: 1000, N: 256, U: 1000, C: 880, A: 326, E: 920, R: 818 } },
      apres: { rangMoteur: 2, rangGlobal: 1, score: 3580, global: 720, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 1000, quantite: 333, coherence: 610 },
        criteres: { H: 1000, N: 306, U: 1000, C: 880, A: 385, E: 1000, R: 1000 } },
    },
  },
  {
    id: 'global-jean-michel',
    place: 1,
    titre: 'jean-michel — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'jean-michel',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +244 pour la droite ; écart de score
       moteur : -876 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:fv+ma1+cs,1:mtc+cs,2:nd#TPFErnfXxwkkeBD',
    apres: '#sce!0:fr20;fl+mazc+meg#TPFErnfXxwkkeBD',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 14, score: 2739, global: 488, mode: 'PARTITION', series: 1,
        axes: { simplicite: 387, exhaustivite: 739, quantite: 111, coherence: 714 },
        criteres: { H: 133, N: 793, U: 739, C: 599, A: 950, E: 1000, R: null } },
      apres: { rangMoteur: 2, rangGlobal: 1, score: 3615, global: 732, mode: 'GROUPEMENT', series: 3,
        axes: { simplicite: 935, exhaustivite: 950, quantite: 333, coherence: 709 },
        criteres: { H: 1000, N: 387, U: 1000, C: 880, A: 700, E: 1000, R: 900 } },
    },
  },
  {
    id: 'global-eleonore-a-nimes',
    place: 1,
    titre: 'Éléonore à Nîmes — 1ʳᵉ place : celle du moteur, ou celle du score global affiché',
    saisie: 'Éléonore à Nîmes',
    question: 'classement',
    /* À gauche la tête que le MOTEUR classe première ; à droite celle que le
       « score global » affiché sur les cartes mettrait en tête si l'on triait
       dessus. Écart de global : +376 pour la droite ; écart de score
       moteur : -1134 pour la gauche. Relevé le 7 septembre 2026, sur
       le commit qui suit l'audit global. */
    avant: '#sce!0:nl,2:m7+cs,4:fc+nlc#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    apres: '#sce!2:ffr4;fl+m14+meg#3j14d86Y9shVAUrGT6Cq5K2Rk2cA',
    mesure: {
      avant: { rangMoteur: 1, rangGlobal: 17, score: 2690, global: 453, mode: 'PARTITION', series: 1,
        axes: { simplicite: 432, exhaustivite: 649, quantite: 111, coherence: 618 },
        criteres: { H: 133, N: 562, U: 649, C: 681, A: 900, E: 1000, R: null } },
      apres: { rangMoteur: 3, rangGlobal: 1, score: 3824, global: 829, mode: 'GROUPEMENT', series: 6,
        axes: { simplicite: 935, exhaustivite: 1000, quantite: 667, coherence: 714 },
        criteres: { H: 1000, N: 400, U: 1000, C: 880, A: 700, E: 1000, R: 1000 } },
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
  },
]);
