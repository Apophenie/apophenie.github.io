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
  {
    id: 'reinfocovid-mad-enchaine',
    titre: 'reinfocovid — enchaîner un raffinage APRÈS une ficelle',
    saisie: 'reinfocovid',
    // ★ MESURÉ, et l'ouverture n'est PAS commitée : c'est ce cas qui doit la
    //   décider.
    //
    //   « À partir du moment où on accepte du `mad`, on peut l'enchaîner plutôt
    //   que de passer à d'autres opérateurs » (l'auteur). Le faisceau ne déroule
    //   qu'UN raffinage. Trois ouvertures ont été mesurées : « enchaîner le
    //   même » ne change rien du tout (rangs 1-3 identiques sur neuf saisies) ;
    //   « tous les couples » fait tomber `tca+mt9+mpf` au rang 3 sur `Macron` et
    //   coûte sa tête à `Donald Trump` ; « enchaîner seulement APRÈS une
    //   ficelle » — la lecture littérale de la phrase — préserve les quatre
    //   têtes de référence.
    //
    //   À gauche ce que la recherche trouve aujourd'hui, à droite ce que cette
    //   troisième ouverture trouverait. Trois séries contre QUATRE, et l'élégance
    //   monte de 579 à 890.
    //
    //   ★ CE QU'IL EN COÛTE, et c'est là qu'il faut trancher : les meilleures
    //     voies chassent les voies RETOUCHÉES de la liste des douze sur
    //     `Donald Trump`. Deux tests de `retouches` passent au rouge. L'étage de
    //     retouche n'est pas cassé, il devient invisible.
    avant: '#sce!fr17+tca+mx6+mrd#VNJqp6YkCCrK9Uf',
    apres: '#sce!fr12+tca+mx6+mrd+mr9#VNJqp6YkCCrK9Uf',
  },
  {
    id: 'emmanuel-lettre-vers-lettre',
    titre: 'Emmanuel Macron — le tarif des conversions lettre → lettre',
    saisie: 'Emmanuel Macron',
    // ★ LE POSTE EST INERTE, SAUF ICI — balayage sur 22 saisies, rangs 1 à 3 :
    //   de 35 à 100, le classement est RIGOUREUSEMENT identique. La valeur en
    //   vigueur (40) est au milieu de ce plateau, et l'élargir de trois à
    //   vingt-sept opérateurs ne l'a pas rendue plus mordante — le balayage des
    //   césars est discipliné ailleurs, par la déduplication de forme du
    //   faisceau.
    //
    //   Une seule saisie bascule, et c'est celle-ci. À gauche ce que donnerait
    //   un tarif de 20 à 25 : deux portées, UN seul programme, aucune ficelle,
    //   élégance 1 016. À droite ce que donne le tarif actuel : une ficelle,
    //   élégance 743.
    //
    //   La question est donc étroite : faut-il baisser le poste pour ce cas-là,
    //   sachant que rien d'autre ne bouge ?
    avant: '#sce!0.1+2.1:fatb+tca+mt9+mr9#2wf7jXfFchfzXqpBk2keh',
    apres: '#sce!fl+tca+mz26+mrd#2wf7jXfFchfzXqpBk2keh',
  },
  {
    id: 'hope-faisceau-affame',
    titre: 'https://hope-hope-hope.fr/ — le faisceau affame la moisson',
    saisie: 'https://hope-hope-hope.fr/',
    // ★ DEUX LEVIERS INDÉPENDANTS MÈNENT À LA MÊME VOIE, et c'est ce qui rend
    //   ce cas intéressant : lever la rétrogradation des ficelles dans le
    //   faisceau (`assemblage.js › rang`), OU ouvrir le second raffinage après
    //   une ficelle, donnent tous deux la voie de gauche.
    //
    //   À gauche : six séries, TROIS portées sur un même programme — donc l'URL
    //   se factorise —, élégance 1 752. À droite : ce que la recherche trouve
    //   aujourd'hui, six séries aussi mais cinq portées et quatre programmes,
    //   élégance 664.
    //
    //   ★ CE QU'IL EN COÛTE : la rétrogradation existe pour empêcher une ficelle
    //     d'occuper une place du faisceau avant que la qualité n'ait eu à se
    //     prononcer. La lever coûte la tête de `Donald Trump` (3 séries → 2) et
    //     une série à `Marie Curie`.
    avant: '#sce!0.1:fr14+tca+m14+mpf,3.1+5.1+7.1:tca+m14,9.1:fr9+tca+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
    apres: '#sce!0.1:fr14+tca+m14+mpf,3.1:ffr3+tca+m14+mpf,5.1:tca+m14,7.1:tca+m14+m36,9.1:fr9+tca+m7#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk',
  },
]);
