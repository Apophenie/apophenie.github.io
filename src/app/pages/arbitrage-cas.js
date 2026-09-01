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
    id: 'hope-place-1-brieve-ou-nommee',
    place: 1,
    titre: 'hope-hope-hope.fr — 1ʳᵉ place : la brève, ou celle que l’auteur a nommée',
    saisie: 'hope-hope-hope.fr',
    // ★ DEUX CANDIDATES À LA PREMIÈRE PLACE, et une seule question : laquelle
    //   est « la plus belle » ?
    //
    //   À GAUCHE, ce que la liste met en tête depuis que le mérite d'élégance
    //   regarde la longueur et la couverture : `fl+tca+m14`. TROIS étapes,
    //   toute la saisie employée, quatre séries — et rien à expliquer, ce qui
    //   est peut-être son meilleur argument.
    //
    //   À DROITE, la stratégie que l'auteur a nommée lui-même — « les 14
    //   segments + tiret du 6 plus `fr` → 4 + 2 → 6 » —, celle qui est citée
    //   dans `src/i18n/fr.js`. CINQ séries, un crédit d'élégance supérieur
    //   (2 113 contre 1 653), mais vingt-deux étapes et six portées.
    //
    //   ⚠️ Trois tests figent aujourd'hui la SECONDE (`recherche.test.js`,
    //     « mène cinq séries », « le fr reste en sept segments ») et sont donc
    //     rouges : ils ont été laissés rouges EXPRÈS, parce qu'ils portent une
    //     préférence de l'auteur et que les dégeler l'effacerait.
    avant: '#sce!fl+tca+m14#yvQYkzhNVYJT8wM8jhvJxSM',
    apres: '#sce!0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
  },
  {
    id: 'hope-place-2-six-series',
    place: 2,
    titre: 'hope-hope-hope.fr — 2ᵈ place : six séries, à quel prix ?',
    saisie: 'hope-hope-hope.fr',
    // ★ DEUX CANDIDATES À LA SECONDE PLACE, celle de la quantité.
    //
    //   À GAUCHE, ce que la recherche propose : SIX séries, obtenues en lisant
    //   deux « hope » par la traduction française (`ffr3`) et le troisième par
    //   les quatorze segments.
    //
    //   ⚠️ C'est précisément ce que l'auteur a proscrit sur un autre cas : « même
    //     contenu (hope) transformé de 3 manières différentes → incohérent, à
    //     proscrire ». L'interdit de divergence existe et se paie
    //     (`elegance.js › compterTraductionsDivergentes`), mais il ne porte que
    //     sur les TRADUCTIONS entre elles — deux `ffr3` et un `m14` ne sont pas
    //     deux traductions divergentes, ce sont deux méthodes différentes. La
    //     question est donc : faut-il étendre l'interdit à toute lecture
    //     divergente d'un même mot, ou est-ce trop large ?
    //
    //   À DROITE, la même moisson privée de sa divergence : les trois « hope »
    //   lus tous les trois en quatorze segments.
    avant: '#sce!0.1+2.1:ffr3+tca+m14+mpf,1.1+3.1:tca+mtc,4.1:tca+m14,6.1:tca+mpy+mr9#yvQYkzhNVYJT8wM8jhvJxSM',
    apres: '#sce!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
  },
]);
