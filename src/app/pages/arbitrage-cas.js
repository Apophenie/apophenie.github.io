/**
 * LES CAS À ARBITRER — les voies qui ont changé de place, et leurs deux états.
 *
 * ★ CE QUE CETTE LISTE EST, ET CE QU'ELLE N'EST PAS.
 *
 * Ce n'est pas une table de vérité : c'est le relevé d'un désaccord entre deux
 * moments du catalogue. « Avant » est la voie que la recherche donnait au
 * dernier état vert (`92f8c34`) ; « après », celle qu'elle donne maintenant.
 * Les deux se rejouent aujourd'hui, avec les gestes d'aujourd'hui — ce qui est
 * comparé est la VOIE, jamais deux versions du rendu.
 *
 * ★ ELLE EST ÉCRITE À LA MAIN, ET C'EST ASSUMÉ. Tout le reste de ce dépôt
 *   refuse les tables recopiées ; celle-ci en est une, et le refus ne s'y
 *   applique pas — parce qu'elle ne DÉCRIT rien qui soit calculable. Une voie
 *   d'avant n'existe plus nulle part dans le code : elle a été mesurée à un
 *   instant, sur un commit, et c'est ce relevé qu'on soumet au jugement. La
 *   recalculer serait impossible ; la déduire, un mensonge.
 *
 * Les liens sont en registre scénique (`sce!`) des deux côtés : on compare des
 * démonstrations complètes, cornes comprises.
 */

/** Un cas : `{ id, titre, saisie, avant, apres }`. */
export const CAS_ARBITRAGE = Object.freeze([
  {
    id: 'hope-moisson',
    titre: 'hope-hope-hope.fr — la moisson (2ᵈ ligne)',
    saisie: 'hope-hope-hope.fr',
    // La voie de la vitrine : cinq séries, rien à jeter, élégance 2 293.
    avant: '#sce!0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    // Ce que la recherche donne depuis : six séries, mais l'élégance tombe à 0.
    apres: '#sce!0.1:ffr3+tca+m14+mpf,1.1:tca+mtc+cs,2.1:ffr3+tca+m14+mpf,3.1:tca+mtc+cs,4.1:ffr+tca+m14+mpf,6.1:tca+mpy+mr9#yvQYkzhNVYJT8wM8jhvJxSM',
  },
  {
    id: 'hope-url-moisson',
    titre: 'https://hope-hope-hope.fr/ — la moisson (2ᵈ ligne)',
    saisie: 'https://hope-hope-hope.fr/',
    avant: '#sce!0.1:fatb+tca+m14+mpf,3.1:tca+m14,4.1:tca+mtc+cs,5.1:tca+m14,6.1:tca+mtc+cs,7.1:tca+m14,9.1:tca+m7+cs#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!0.1:fr14+tca+m14+mpf,3.1:ffr3+tca+m14+mpf,5.1:ffr+tca+m14+mpf,7.1:tca+m14+m36,9.1:fr9+tca+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
  },
  {
    id: 'trump-tete',
    titre: 'Donald Trump — la tête de liste',
    saisie: 'Donald Trump',
    // Un seul 666, par les lettres et les quatorze segments.
    avant: '#sce!fl+tca+m14#2HuP1G8mNg3sJWhqR',
    // Trois 666, par deux césars sans nom.
    apres: '#sce!0.1:fr15+tca+mx6+mrn,2.1:fr3+tca+mhe+mrn#2HuP1G8mNg3sJWhqR',
  },
  {
    id: 'trump-deux-six',
    titre: 'Donald Trump — les deux 666 déjà formés (voie nommée)',
    saisie: 'Donald Trump',
    avant: '#sce!0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR',
    apres: '#sce!0.1:fatb+tca+mt9+mr9,2.1:fr3+tca+mhe+mrn#2HuP1G8mNg3sJWhqR',
  },
  {
    // ★ Ce que la FICELLE achetait : un 6 de plus, payé au triple à l'arrivée.
    //   `m.additionSelective` arrivait EN TÊTE du faisceau de « Macron » avec
    //   cinq 6 contre quatre, et occupait la place avant que le filtre de
    //   qualité n'ait à se prononcer. Élégance finale : 318 contre 881.
    id: 'macron-ficelle',
    titre: 'Macron — ce que la ficelle achetait (318) contre une voie propre (881)',
    saisie: 'Macron',
    avant: '#sce!fr24+tca+mx6+mad#fXvexbmf',
    apres: '#sce!fr1+tca+m14+mpf#fXvexbmf',
  },
  {
    id: 'macron-tete',
    titre: 'Macron — la tête de liste',
    saisie: 'Macron',
    // La voie que l'auteur a nommée : « peu d'étapes, ce qui est mieux ».
    avant: '#sce!tca+mt9+mpf#fXvexbmf',
    apres: '#sce!fr24+tca+mx6+mrn#fXvexbmf',
  },
  {
    id: 'macron-seconde',
    titre: 'Macron — la seconde ligne',
    saisie: 'Macron',
    avant: '#sce!tca+mtal+mt9#fXvexbmf',
    apres: '#sce!fatb+tca+mt9+mr9#fXvexbmf',
  },
]);
