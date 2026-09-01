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
 * Les liens sont en registre scénique (`sce!`) des deux côtés : on compare des
 * démonstrations complètes, cornes comprises.
 */

/** Un cas : `{ id, place, titre, saisie, avant, apres }`. */
export const CAS_ARBITRAGE = Object.freeze([
  {
    id: 'macron-jeter-ou-nommer',
    place: 1,
    titre: 'Macron — 1ʳᵉ place : la voie nommée jette la moitié de ce qu’elle calcule',
    saisie: 'Macron',
    /* ★ **DEUX RÈGLES DE L'AUTEUR SE CONTREDISENT ICI, ET C'EST TOUT LE CAS.**
       Il a désigné `tca+mt9+mpf` comme optimal pour « Macron » — « les 666 ne
       sont pas contigus, mais le procédé se fait en très peu d'étapes ». Puis,
       sur `hope-hope-hope.fr` : « l'usage maximal de la saisie utilisateur est
       à récompenser autant que possible ; même si l'autre est courte et que les
       jetés/filtrés le sont de manière propre, ça ne doit pas compenser ».

       Or `mpf` — « on ne garde que les majoritaires » — est structurellement un
       JETEUR : la voie nommée calcule six valeurs et en garde trois.

         à gauche  `tca+mt9+mpf`        3 étapes · R = 500 · 1 série
         à droite  `fr13+tca+m14+meg`   4 étapes · R = 1 000 · 2 séries

       ★ La question n'est pas « laquelle est la plus belle » mais : **le déchet
         d'un opérateur qui ANNONCE qu'il écarte doit-il se payer comme celui
         d'une voie qui gaspille sans le dire ?** `mpf` dit ce qu'il fait et le
         montre à l'écran ; le rendement, lui, ne fait pas la différence. */
    avant: '#sce!tca+mt9+mpf#fXvexbmf',
    apres: '#sce!fr13+tca+m14+meg#fXvexbmf',
  },
  {
    id: 'trump-court-ou-employant',
    place: 1,
    titre: 'Donald Trump — 1ʳᵉ place : la plus courte, ou celle qui emploie tout',
    saisie: 'Donald Trump',
    /* ★ LE MÊME ARBITRAGE, SANS L'AMBIGUÏTÉ DU JETEUR ASSUMÉ.
       Les deux couvrent toute la saisie (U = 1 000) et tiennent en trois ou
       quatre étapes. Ce qui les sépare est le seul GASPILLAGE :

         à gauche  `fl+tca+m14`        3 étapes · R =  272 · 1 série
         à droite  `fl+tca+mazc+meg`   4 étapes · R =  818 · 3 séries

       Celle de gauche calcule onze valeurs pour en garder trois — elle ne le
       dit nulle part, aucun opérateur n'annonce d'écarter : le tri se fait au
       verdict. Une étape de plus achète à droite trois fois moins de déchet et
       deux séries de plus. */
    avant: '#sce!fl+tca+m14#2HuP1G8mNg3sJWhqR',
    apres: '#sce!fl+tca+mazc+meg#2HuP1G8mNg3sJWhqR',
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
  {
    id: 'hope-place-2-six-series',
    place: 2,
    titre: 'hope-hope-hope.fr — 2ᵈ place : six séries, à quel prix ?',
    saisie: 'hope-hope-hope.fr',
    /* ★ ARBITRÉ, ET GARDÉ POUR VÉRIFICATION. « Le fait de ne pas appliquer le
       même traitement aux 3 hope devrait mettre un malus trop important pour
       que ce soit retenu » (l'auteur). C'est fait — `LECTURE_DIVERGENTE`, 240
       par lecture surnuméraire, malus et non interdit, « comme pour `fr15` et
       `fr3` dans une même voie ».

       À gauche la moisson divergente (deux « hope » en français, un en
       segments), à droite les trois lus pareil. */
    avant: '#sce!0.1+2.1:ffr3+tca+m14+mpf,1.1+3.1:tca+mtc,4.1:tca+m14,6.1:tca+mpy+mr9#yvQYkzhNVYJT8wM8jhvJxSM',
    apres: '#sce!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
  },
]);
