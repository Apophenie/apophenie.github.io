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
 * ★ **HUIT CAS ONT ÉTÉ ARBITRÉS ET RETIRÉS** — la moisson de `hope-hope-hope`,
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

/** Un cas : `{ id, titre, saisie, avant, apres }`. */
export const CAS_ARBITRAGE = Object.freeze([
  {
    id: 'macron-meg-2e',
    titre: 'Macron — l’égalisation mérite-t-elle la 2ᵈ ligne ?',
    saisie: 'Macron',
    // ★ LA QUESTION QUI RESTE APRÈS L'ARBITRAGE SUR `meg`.
    //
    //   « meg ne marche pas toujours, l'égalisation pourrait être autre que sur
    //   6. Sors-le des ficelles. » — c'est fait, et c'est juste sur le fond :
    //   l'égalisation ne CHOISIT pas sa valeur, elle tombe sur la moyenne de la
    //   ligne. Mais mesurée aussitôt, elle a repris SIX têtes de liste sur huit.
    //   Le plafond du faisceau la retient désormais par une autre porte
    //   (`assemblage.js › A_MERITER_SA_PLACE`) et elle est redescendue à la 2ᵈ
    //   place ici. La question posée est donc : y a-t-elle sa place ?
    //   À gauche, ce qu'elle donne : six 6 d'un coup, deux séries.
    //   À droite, la voie honnête qui la suit — un seul 666, mais pré-assemblé.
    avant: '#sce!fr13+tca+m14+meg#fXvexbmf',
    apres: '#sce!tca+mtal+mt9+mpf#fXvexbmf',
  },
  {
    id: 'macron-tete-cornes',
    titre: 'Macron — la tête de liste, et ses cornes',
    saisie: 'Macron',
    // « La version "avant" brille par sa simplicité et son élégance extrême.
    //   Pour un premier résultat, ça devrait clairement rester celle-ci ou sa
    //   variante qui fait apparaître 666 pré-assemblé […] Il lui manque juste
    //   les cornes. »
    //
    //   Les deux lui sont rendues : elle est REDEVENUE la tête de liste (les
    //   places réservées à la qualité dans le faisceau), et un 666 seul est
    //   couronné au verdict (la restriction que j'avais posée est levée). Ce
    //   qu'il reste à trancher est ce qu'elle coûte : un décor au-dessus des
    //   chiffres leur prend de la hauteur, et le verdict grandit de moitié moins.
    //   À droite, la variante pré-assemblée, pour comparer les deux verdicts.
    avant: '#sce!tca+mt9+mpf#fXvexbmf',
    apres: '#sce!tca+mtal+mt9+mpf#fXvexbmf',
  },
  {
    id: 'hope-groupee',
    titre: 'https://hope-hope-hope.fr/ — la voie groupée, trouvée seule',
    saisie: 'https://hope-hope-hope.fr/',
    // ★ « Elle ne groupe pas ce qu'elle aurait dû grouper » — elle groupe.
    //
    //   À gauche, ce que la recherche propose maintenant en 2ᵈ ligne, et son
    //   lien s'écrit tout seul :
    //     `0.1:fr14+tca+m14+mpf,3.1+5.1+7.1:ffr+tca+m14+mpf,4.1+6.1:tca+mtc+cs`
    //   c'est-à-dire exactement la forme que l'auteur avait écrite à la main —
    //   les trois « hope » sur une seule phase, et les deux tirets sur une
    //   autre. Six séries, élégance 142, score 1 275.
    //
    //   À droite, ce qu'elle proposait avant : les mêmes trois « hope » lus en
    //   `ffr3`, `ffr` et `ffr2` — trois acceptions de la même traduction — donc
    //   rien à grouper, six lignes d'URL, élégance 0.
    //
    //   ★ CE QUI RESTE À TRANCHER : le compte. L'auteur annonçait « ses 7×666 » ;
    //     sa voie comme la nôtre en rendent SIX. Le septième n'a été retrouvé
    //     par aucune des deux.
    avant: '#sce!0.1:fr14+tca+m14+mpf,3.1+5.1+7.1:ffr+tca+m14+mpf,4.1+6.1:tca+mtc+cs#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!0.1:fr14+tca+m14+mpf,3.1:ffr3+tca+m14+mpf,5.1:ffr+tca+m14+mpf,7.1:ffr2+tca+m14+mpf,9.1:fr9+tca+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
  },
  {
    id: 'trump-retouche-parcours',
    titre: 'Donald Trump — la retouche, parcours corrigé',
    saisie: 'Donald Trump',
    // ★ LES DEUX DÉFAUTS SIGNALÉS SONT CORRIGÉS, et c'est ce lien qui les porte.
    //
    //   « Commencer par 2.1 grise le premier mot alors qu'il va servir ensuite »
    //   — la retouche DÉSIGNE désormais son passage sans éteindre le reste.
    //   « La partie 0.1+2.1 fait une action de chaque côté plutôt qu'une phase
    //   pour l'ensemble » — la scène joue maintenant `m14` sur tout `Donald`,
    //   puis `m14` sur tout `Trump` chiffré, puis `mpf` sur l'un, puis sur
    //   l'autre. Elle alternait lettre par lettre.
    //
    //   À droite, la tête de liste actuelle, qui reste devant : « bon candidat
    //   pour le premier résultat » a été dit de celle de gauche, et elle ne l'est
    //   pas encore. Son élégance est de 428 contre 1 313.
    avant: '#sce!2.1:fr13;0.1+2.1:tca+m14+mpf#2HuP1G8mNg3sJWhqR',
    apres: '#sce!0.1:fatb+tca+mt9+mr9,2.1:fr3+tca+mhe+mrn#2HuP1G8mNg3sJWhqR',
  },
  {
    id: 'trump-fl-un-temps',
    titre: 'Donald Trump — « on ne garde que les lettres », en un seul temps',
    saisie: 'Donald Trump',
    // ★ LE TAMIS A PERDU SON PARTAGE ET SON SECOND TEMPS.
    //
    //   « Les caractères autres devraient simplement être supprimés avec une
    //   accolade qui indique ce qui se passe, et les étapes 7 et 8 sont à
    //   fusionner avec l'accolade qui se redimensionne lors de la fusion, et
    //   disparaît ensuite. En effet, l'effet de descente et montée marche mal
    //   quand il s'agit de faire monter un espace. »
    //
    //   `fl` joue donc ici en UN step : l'accolade paraît, les rejetés s'effacent
    //   sur place, la ligne se referme et l'accolade rétrécit avec elle.
    //
    //   ⚠️ ET LE PARTAGE N'A PAS DISPARU — je l'avais d'abord retiré partout,
    //     et l'auteur a corrigé : « pourtant je l'ai demandé, en particulier
    //     pour les filtres voyelles ou consonne, c'est le comportement
    //     attendu ». Le critère est CE QUI MONTE, pas le nom du filtre : `fl`
    //     sur « Donald Trump » ne rejette que l'espace, donc rien de visible ne
    //     monterait ; `fv` sur le même mot rejette huit consonnes, et garde son
    //     partage en deux temps (`filtres.js › etapeRetrait`).
    //
    //   À droite, la 2ᵈ ligne à laquelle elle se compare, pour le nombre.
    avant: '#sce!2.1:fr13;fl+tca+m14#2HuP1G8mNg3sJWhqR',
    apres: '#sce!0.1:fr15+tca+mx6+mrn,2.1:fr3+tca+mhe+mrn#2HuP1G8mNg3sJWhqR',
  },
  {
    id: 'macron-mad-chaine',
    titre: 'Macron — `mad` ne s’enchaîne pas (constat, pas proposition)',
    saisie: 'Macron',
    // ★ CE CAS EST UNE MESURE, PAS UNE ALTERNATIVE — les deux liens montrent le
    //   même manque, et c'est ce qu'il y a à voir.
    //
    //   « À partir du moment où on accepte du mad, on peut l'enchaîner plutôt
    //   que de passer à d'autres opérateurs. » La forme de programme que le
    //   faisceau déroule n'admet qu'UN raffinage : `[filtre] → découpe →
    //   [rangement] → mappeur → [UN raffinage]`. `fr24+tca+mx6+mad+mad` est
    //   refusé à la lecture même de l'URL — « programme inapplicable ».
    //
    //   À gauche, ce que `mad` donne en un coup : il s'arrête là. À droite, la
    //   même découpe sans lui, qui va plus loin sur l'élégance (882 contre 278)
    //   mais s'arrête à un seul 666 là où l'auteur en voyait deux, voire trois.
    avant: '#sce!fr24+tca+mx6+mad#fXvexbmf',
    apres: '#sce!fr24+tca+mx6+mrn+mpf#fXvexbmf',
  },
]);
