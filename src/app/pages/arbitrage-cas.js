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

/** Un cas : `{ id, place, titre, saisie, avant, apres }`. */
export const CAS_ARBITRAGE = Object.freeze([
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
