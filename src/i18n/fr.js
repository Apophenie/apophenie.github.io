/** Dictionnaire français — langue par défaut et langue de repli.
 *
 *  TYPOGRAPHIE FRANÇAISE STRICTE, appliquée ici à la main :
 *    · guillemets « » avec espace fine insécable (U+202F) à l'intérieur ;
 *    · espace fine insécable AVANT ! ? ; : ;
 *    · apostrophe typographique ’, majuscules accentuées.
 *  `i18n.test.js` refuse toute chaîne qui poserait une espace ordinaire devant
 *  une ponctuation haute : la règle est vérifiée, pas seulement recommandée.
 *
 *  Les valeurs peuvent contenir des jetons `{nom}`, interpolés par `t()`. */

export const fr = {
  code: 'fr',
  /* nom natif : jamais traduit, c'est un autonyme */
  autonyme: 'Français',

  nombres: {
    lettres: ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept',
      'huit', 'neuf', 'dix', 'onze', 'douze'],
  },

  global: {
    titre: 'Numérologie',
    baseline: 'la vérité derrière n’importe quoi',
    allerAuContenu: 'Aller au contenu',
    titreDefaut: 'Numérologie — la vérité derrière n’importe quoi',
    suffixeTitre: '{titre} — Numérologie',
    logoTexte: 'Numérologie — Num Hero LOL geek',
    logoAide: 'Activer pour révéler ce que le mot dissimule.',
    logoAideRevu: 'Activer pour revoir ce que le mot dissimule.',
    logoRetour: '{lecture} — retour à l’accueil',
  },

  logo: {
    transport: {
      groupe: 'Contrôles de la révélation du logo',
      jauge: 'Aller à une étape de la révélation',
      jaugeCase: 'Aller à l’étape {i} sur {total}',
      jaugeCaseTitree: 'Aller à l’étape {i} sur {total} : {titre}',
      precedent: 'Étape précédente',
      suivant: 'Étape suivante',
      lancer: 'Dérouler la révélation',
      rejouer: 'Revoir la révélation',
      fin: 'Aller au mot révélé',
    },
    etapes: {
      h: 'La place du h, et le h qui s’y pose',
      l: 'La place du l, et le l qui y descend',
      e: 'Le e final se décale, l’autre e descend, la barre passe dessous',
      k: 'Les deux barres du k se déploient depuis leurs bouts',
    },
  },
  entete: {
    reglages: 'Réglages d’affichage',
    theme: {
      label: 'Thème',
      clair: 'Clair',
      auto: 'Automatique',
      sombre: 'Sombre',
      titre: 'Thème : {valeur}',
    },
    langue: {
      label: 'Langue',
      titre: 'Langue : {valeur}',
    },
    animation: {
      reduire: 'Réduire les animations',
      retablir: 'Rétablir les animations complètes',
    },
    // ★ UN SEUL CHEMIN DE RETOUR, ET IL MÈNE À L'ACCUEIL.
    //
    // « Remplace les liens "Recommencer" et "Toutes les voies" par "Retour à
    // l'accueil" (qui envoie directement à l'accueil et non au listing). Il ne
    // reste donc que le lien d'énumération sur la page d'accueil qui permet
    // d'accéder au listing » (l'auteur).
    //
    // Les deux clés d'avant restent : `recommencer` et `toutesLesVoies` ne
    // sont plus lues, mais les retirer ferait diverger les catalogues, que
    // `i18n.test.js` compare clé par clé.
    accueil: 'Retour à l’accueil',
    recommencer: 'Recommencer',
    toutesLesVoies: 'Toutes les voies',
  },

  accueil: {
    baseline: 'L’art de la numérologie, enfin accessible au plus grand nombre !',
    label: 'De quel contenu voulez-vous révéler les arcanes ?',
    placeholder: 'un mot, une phrase, une adresse…',
    // La ligne d'aide permanente a disparu ; ce qu'elle disait ne vaut plus
    // qu'à l'instant où le plafond se heurte, et sous forme d'infobulle.
    plafondAtteint: 'C’est plein : {plafond} signes, pas un de plus.',
    voies: 'Énumérer les voies occultes',
    reveler: 'Révéler',
    consultation: 'Consultation des arcanes…',
    erreurVide: 'Les arcanes ont besoin d’un peu de matière. Saisissez quelque chose.',
    erreurUrl: 'La grammaire d’URL n’est pas chargée : impossible de composer le lien.',
    exemplesTitre: 'Exemples troublants :',
    // Une puce est soit un texte à recopier dans le champ, soit un raccourci
    // qui MÈNE DIRECTEMENT à une démonstration choisie. Le raccourci n'est pas
    // traduisible — c'est une URL —, mais il vit ici parce que c'est ici qu'on
    // choisit ce qu'on met en vitrine.
    exemples: [
      {
        texte: 'hope-hope-hope.fr',
        // Le cas d'école du README, mené jusqu'au bout : les quatre lettres de
        // chaque « hope » en quatorze segments, les deux tirets par la touche
        // du 6 de l'AZERTY, et « fr » en sept segments (4+2). Quinze 6, cinq
        // séries, pas un caractère compté deux fois — et rien à jeter.
        hash: '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
        aide: 'Voir la démonstration pour « hope-hope-hope.fr »',
      },
      'Donald Trump',
      {
        texte: 'https://reinfocovid.fr/',
        // Trois morceaux d'URL, trois règles différentes, trois 6 : la
        // chaldéenne sur « https » (5+4+4+8+3 = 24 → 6), les consonnes de
        // « reinfocovid » comptées (6), et « fr » en sept segments (4+2).
        hash: '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
        aide: 'Voir la démonstration pour « https://reinfocovid.fr/ »',
      },
      'Capitalisme',
    ],
    mentionCalcul: 'Tout est calculé dans votre navigateur : rien n’est envoyé nulle part.',
    mentionParodie: 'Ceci est une parodie. La numérologie ne prédit rien. Le code, si.',
  },

  resultat: {
    surtitre: 'Les arcanes de',
    annonceAucune: 'Aucune voie n’a encore été tracée.',
    /* ★ La CIBLE traverse ces phrases. Elle vaut « 666 » neuf fois sur dix — et
       ces neuf fois-là rendent exactement la chaîne d'avant, mot pour mot. Le
       nombre n'est plus écrit en dur nulle part : il vient de l'unique endroit
       qui le porte (`src/recherche/cible.js`). */
    annonceUne: 'Une approche mène à {cible}.',
    annoncePlusieurs: '{n} approches mènent à {cible}.',
    voiesTitre: 'Les voies complètes',
    /* ★ LE PODIUM — les deux encadrés de tête (`pages/resultat.js › socleDePodium`).

       Les intitulés nomment la QUESTION à laquelle la place répond, pas le
       barème qui l'a désignée : le moteur, lui, parle de « triptyques »
       (`recherche/score.js › POIDS_DES_REGIMES`), un mot juste et illisible.
       La glose tient en trois mots — c'est celle de l'auteur, « la plus belle »
       contre « la plus fournie » —, parce que l'encadré doit faire comprendre
       la différence sans se mettre à expliquer le classement.

       ★ **« Abondance » ET NON « Maximisation »** — arbitrage de l'auteur, et il
         remet les deux intitulés d'aplomb. « Maximisation » nomme un PROCÉDÉ,
         « Élégance » nomme une QUALITÉ : les mettre en vis-à-vis appariait une
         vertu et une méthode, ce qui donnait à lire deux choses de nature
         différente là où l'on veut deux réponses à la même question. Deux
         qualités se comparent ; une qualité et un procédé, non.

         La version anglaise disait déjà « Abundance » pour cette raison exacte,
         faute d'avoir un « maximisation » qui se lise en langue courante. Les
         deux langues se rejoignent donc, et la clé technique garde son ancien
         nom (`maximisation`) : c'est une adresse dans le dictionnaire, pas un
         texte, et la renommer casserait les liens sans rien apprendre. */
    /* ★ **LE PANNEAU DE PONDÉRATION.** Les quatre noms sont ceux de l'auteur,
       au mot près — « simplicité (concision de la voie), exhaustivité (ne rien
       jeter), quantité (maximiser la présence du motif recherché), cohérence
       (ce qu'on appelle élégance, pourrait aussi être nommé vraisemblance) ».
       On garde les siens plutôt que ceux du barème : « concision »,
       « couverture » et « élégance » nomment des CRITÈRES, c'est-à-dire des
       rouages ; « simplicité » et « cohérence » nomment ce que le visiteur
       cherche. La glose de chaque curseur dit le rouage, une fois, pour qui
       veut savoir.

       ★ La FOUILLE est nommée à part et ne dit pas un pourcentage mais un
         FACTEUR : les quatre curseurs se partagent une somme, elle non — elle
         ne classe pas, elle creuse. Les mêler sous le même intitulé ferait
         croire qu'on retire du classement ce qu'on donne à la recherche. */
    scores: {
      global: 'Score global',
    },
    curseurs: {
      titre: 'Régler ce qui compte',
      appel: 'Chaque réglage se hausse à part\u202f; le pourcentage dit la part qu’il '
        + 'prend sur l’ensemble.',
      simplicite: 'Simplicité',
      exhaustivite: 'Exhaustivité',
      quantite: 'Quantité',
      coherence: 'Cohérence',
      fouille: 'Fouille',
      part: '{n} %',
      fouilleFacteur: '×{n}',
      retablir: 'Rétablir',
      appliquer: 'Appliquer',
    },
    podium: {
      elegance: 'Élégance',
      eleganceGlose: 'la plus belle',
      maximisation: 'Abondance',
      maximisationGlose: 'la plus fournie',
    },
    /* Le nom du point de repère `complementary` — la colonne de droite sur
       grand écran, la fin de page en dessous. Il dit ce qu'on y trouve, pas où
       c'est posé : « à droite » deviendrait faux sur un téléphone. */
    asideLabel: 'Aller plus loin',
    fragmentsTitre: 'Les fragments valant {chiffre}',
    /* Quand la cible mêle plusieurs chiffres — « 007 », « 13 » —, un fragment
       n'en vaut qu'UN : dire « les fragments valant 007 » serait faux sept fois
       sur dix. La pastille de chaque rangée porte, elle, le chiffre réellement
       atteint (`recherche/index.js`, `valeur`). */
    fragmentsTitreMele: 'Les fragments valant un chiffre de {cible}',
    aucuneVoie: 'Aucune voie trouvée. C’est mathématiquement impossible ; nous enquêtons.',
    /* ★ Et l'aveu, quand la cible n'est plus celle du titre. Le gag d'à côté
       — « c'est mathématiquement impossible » — repose sur la promesse du site,
       qui ne porte que sur 666 : le dernier recours du moteur est le joker
       français, dont le cycle attracteur ne visite que 3, 4, 5 et 6
       (`assemblage.js › approcheJoker`). Viser 111 peut donc échouer pour de
       bon, et il vaut mieux le dire que plaisanter à côté. */
    aucuneVoieCible: 'Aucune voie ne mène à {cible} pour cette saisie. La maison ne garantit que le 666 ; le reste se mérite.',
    voieNumero: 'n° {rang}',
    /* Le compteur de séries, à cheval sur le bord DROIT du panneau — le
       pendant du numéro de rang. Deux écritures d'une seule information :
       le BADGE est un dessin (les points médians découpent les trois 6
       comme sur un cadran), la PHRASE est ce qu'un lecteur d'écran annonce.
       Rien n'est affiché quand n vaut 1 (`resultat.js › compteurSeries`). */
    voieSeriesBadge: '{n} × {cible}',
    voieSeries: '{n} séries de {cible}',
    voieSansTitre: 'Approche n° {rang}',
    /* Les deux accès d'un panneau de voie. Le libellé VISIBLE est court — il
       tient sur une demi-largeur de carte —, le nom ACCESSIBLE porte le titre
       de la voie : douze cartes offrant douze liens « Sobre » ne distingueraient
       rien dans la liste des liens d'un lecteur d'écran. */
    acces: {
      voir: 'Voir la démonstration',
      sobre: 'Sobre',
      sobreLabel: '{titre} — version sobre, sans mise en scène',
      scenique: 'Scénique',
      sceniqueLabel: '{titre} — version scénique, avec cornes et orage',
    },
    jokerNote: 'Joker français : ne fonctionne qu’en français, et c’est un argument.',
    cheminUnique: '{n} chemin',
    cheminsPluriels: '{n} chemins',
    familles: {
      repetition: 'motif répété',
      periodicite: 'périodicité',
      unite: 'unité',
      separateurs: 'séparateurs',
      frontiere: 'frontière',
      entier: 'saisie entière',
      ngramme: 'n-gramme',
    },
    memo: {
      titre: 'Assembler vos propres arcanes',
      grammaire: '#{programme}#{saisie en base58}',
      grammaireTexte: '« + » entre les opérations, « , » entre les fragments.',
      resonance: '#×3:ma1+cs+prn#…',
      resonanceTexte: 'résonance : le même programme sur les trois occurrences d’un motif répété.',
      portee: '#0.1:ma1+cs,1.1:nv#…',
      porteeTexte: 'portée : offset et longueur en jetons de la saisie.',
      // Le site ÉCRIT désormais cette forme (`src/recherche/url.js`, « les
      // portées groupées ») : sans cette entrée, le mémo laisserait un lecteur
      // devant un « + » placé avant le « : » qu'aucune ligne n'explique.
      portees: '#0.1+2.1+4.1:ma1+cs#…',
      porteesTexte: 'portées groupées : plusieurs places voisines qui se partagent un même programme.',
      registre: '#so!…#…  ·  #sce!…#…',
      registreTexte: 'registre de mise en scène, en tête de l’approche. Absent, il vaut « sobre » : le spectacle se demande.',
      cible: '#c111!…#…  ·  #c007!…#…',
      cibleTexte: 'cible visée, en tête de l’approche. Absente, c’est 666 — la maison ne se renie pas.',
      copier: 'Copier le lien de cette page',
    },
    /* ★ LA COMMANDE DE CIBLE, en pied de listing. « Trop diabolique pour
       vous ? demandez, demandez les calculs pour obtenir : [111] [777]
       [000] [13] [007] ou la valeur de votre choix » (l'auteur).

       Deux titres, et le choix se fait sur la cible EN COURS, jamais sur une
       liste en dur de cibles « diaboliques » : « trop diabolique » ne veut
       rien dire au-dessus d'une page calée sur 111. */
    cible: {
      titreDiabolique: 'Trop diabolique pour vous ?',
      titreAutre: 'Trop prévisible ?',
      appel: 'Quels calculs permettent d’obtenir :',
      raccourciLabel: 'Chercher les voies menant à {cible}',
      ou: 'ou la valeur de votre choix',
      champLabel: 'Suite de chiffres à viser',
      // ★ Un exemple ne peut pas servir d'invite ici : « 111 » se lisait comme
      //   la valeur DÉJÀ inscrite, et les raccourcis juste à côté en proposent
      //   déjà cinq. L'invite dit ce qu'on attend, pas ce qu'on pourrait vouloir.
      champInvite: 'nombre souhaité…',
      champAide: 'Une suite de chiffres, {max} au plus. Les zéros de tête comptent : « 007 » n’est pas « 7 ».',
      calculer: 'Calculer',
      invalide: 'Une suite de chiffres, {max} au plus.',
      courante: 'Cible actuelle : {cible}',
    },
  },

  /* ★ L'ŒUF DE PÂQUES — « cheval sur oiseau = π ». Voir `src/app/oeuf.js` : les
     titres sont ceux que l'auteur a dictés, et le Registre les affiche comme
     ceux de n'importe quelle voie. Il n'a pas à savoir que celle-ci est fausse. */
  oeuf: {
    titre: 'Par la zoologie phonétique',
    regle: 'Une vache est une bête à pie, un oiseau une bête à ailes\u202f: le reste s’entend.',
    commutation: 'Multiplication commutative',
    commutationDetail: 'Réagencement',
    qualification: 'Qualification animale',
    synthese: 'Synthèse phonétique',
    reduction: 'Réduction mathématique',
    verdict: 'Le verdict',
    cqfd: 'C.Q.F.D.',
  },

  demo: {
    surtitre: 'La vérité derrière',
    methode: 'Méthode {rang} — {titre}',
    sansTitre: 'sans titre',
    demonstration: 'Démonstration',
    etapeSur: 'Étape {i} sur {total}',
    sceneLabel: 'Scène de démonstration',
    /* ★ Le bouton de lecture du registre scénique — voir `pages/demonstration.js`.
       « Avec le son » n'est pas une promesse en l'air : en scénique, un clic sur
       ce bouton EST le geste que le navigateur attend pour autoriser le son, et
       le réglage part donc actif — sauf si le visiteur l'a coupé, auquel cas son
       choix tient et l'intitulé le dit. */
    jouerLabel: 'Démonstration étape par étape',
    jouerAvecSon: 'Lancer, avec le son',
    jouerSansSon: 'Lancer, sans le son',
    allerAuRegistre: 'Aller au registre',
    revoir: 'Revoir',
    autreVoie: 'Une autre voie',
    voirSobre: 'Voir en sobre',
    voirScenique: 'Voir en scénique',
    nouvelleRecherche: 'Nouvelle recherche',
    debug: {
      etape: 'étape',
      temps: 'temps',
      source: 'source',
      url: 'url',
      valeurSource: 'lecteur : {lecteur} · scénario : {scenario}',
      indisponible: '(indisponible)',
    },
    raccourcis: {
      titre: 'Raccourcis clavier',
      espace: 'Espace ou K',
      gauche: '← ou J',
      droite: '→ ou L',
      origine: 'Origine',
      fin: 'Fin',
      d: 'D',
      lecturePause: 'Lecture / Pause',
      precedente: 'Transformation précédente',
      suivante: 'Transformation suivante',
      debut: 'Revenir au début',
      resultat: 'Aller au résultat',
      panneau: 'Panneau de débogage',
    },
  },

  transport: {
      vitesse: 'Vitesse de lecture',
      vitesseCourt: 'Vitesse',
      vitesseFacteur: '×{n}',
    groupe: 'Contrôles de la démonstration',
    jauge: 'Aller à une étape',
    jaugeCase: 'Aller à l’étape {i} sur {total}',
    jaugeCaseTitree: 'Aller à l’étape {i} sur {total} : {titre}',
    debutCourt: 'Début',
    precCourt: 'Préc.',
    lectureCourt: 'Lecture',
    pauseCourt: 'Pause',
    rejouerCourt: 'Rejouer',
    suivCourt: 'Suiv.',
    finCourt: 'Fin',
    debut: 'Revenir au début',
    precedent: 'Transformation précédente',
    lancer: 'Lancer la démonstration',
    pause: 'Mettre en pause',
    rejouer: 'Rejouer la démonstration',
    suivant: 'Transformation suivante',
    fin: 'Aller au résultat',
    // Les redites : une étape qui refait exactement le geste d'une étape déjà
    // vue, sur un autre morceau de la saisie. La première enseigne, les
    // suivantes confirment — d'où l'accéléré, et d'où le droit de le refuser.
    reditesCourt: 'Redites',
    reditesAccelerer: 'Accélérer les répétitions ({facteur}×)',
    reditesRalentir: 'Montrer les répétitions en entier',
    reditesSansEffet: 'Accélération des répétitions sans effet : les animations sont réduites',
    /* La coupure du son. Trois libellés pour trois états réels — voir
       `src/app/sons.js` : le bouton dit ce qu'un clic FERA, et l'infobulle
       dit ce qui se passe quand la préférence est « actif » mais que le
       navigateur n'a pas encore laissé passer le son. */
    sonCourt: 'Son',
    sonActiver: 'Activer le son',
    sonCouper: 'Couper le son',
    sonEnAttente: 'Son activé — il partira au premier clic dans la page',
    /* Le plein écran. Un seul bouton pour les deux sens, donc DEUX libellés,
       et chacun dit ce qu'un clic FERA — jamais l'état où l'on se trouve.
       Le libellé court ne redit pas « plein écran » : sous un picto qui montre
       déjà un cadre, ce serait la troisième fois qu'on lit la même chose. Il
       dit le GESTE, et les deux gestes s'opposent en un mot. */
    pleinEcranCourt: 'Agrandir',
    sortiePleinEcranCourt: 'Réduire',
    pleinEcran: 'Passer la scène en plein écran',
    sortiePleinEcran: 'Quitter le plein écran',
  },

  registre: {
    titre: 'Le Registre',
    transformation: 'Transformation {i}',
    etape: 'Étape {i} sur {total} — {titre}',
    termine: 'Démonstration terminée. Résultat : {resultat}.',
  },

  partage: {
    partager: 'Partager',
    bulleCopie: 'Lien copié\nCollez-le dans vos réseaux favoris\npour faire éclater la vérité !',
    partage: 'Partagé.',
    copie: 'Texte copié dans le presse-papier.',
    copieEchouee: 'Copie impossible : sélectionnez le lien à la main.',
    copieCourte: 'Copié.',
    copieCourteEchouee: 'Copie impossible.',
    rienACopier: 'Rien à copier.',
    indisponible: 'Le lien canonique n’est pas disponible tant que le moteur n’est pas branché.',
    texte: 'La vérité derrière {saisie} : {resultat}.',
  },

  /* ★ LA JAUGE DE RECHERCHE. Trois états, et pas un de plus : on démarre, on
     avance, on a fini. Aucune de ces phrases ne promet une DURÉE — le moteur
     compte des fragments, pas des secondes, et annoncer « encore trois
     secondes » serait exactement le mensonge que la jauge existe pour éviter.
     `jauge.etat` dit « fragment 8 sur 18 » au singulier quel que soit le
     nombre : c’est un rang, pas un décompte, et les deux langues s’en
     accommodent sans accord.

     ⚠️ Le TOTAL peut diminuer en route — « fragment 10 sur 16 » puis
     « fragment 11 sur 12 ». Ce n’est pas un défaut d’affichage : le budget de
     travail vient de s’épuiser, et la recherche a décidé qu’elle s’arrêterait
     au plancher garanti au lieu d’aller au bout (`recherche/index.js`). Le
     chiffre montré est toujours celui des fragments qu’on cherchera vraiment ;
     le figer au total initial ferait une jauge qui s’arrête à 60 %. */
  progression: {
    label: 'Avancement de la recherche',
    demarrage: 'Recherche en cours…',
    etat: '{pourcent} % — fragment {faits} sur {total}',
    termine: 'Recherche terminée.',
  },

  attente: {
    surtitre: 'Les arcanes se dévoilent',
    texte: 'Le moteur explore les voies une par une. Tout est calculé ici : rien '
      + 'ne part sur le réseau, et c’est aussi pour ça que ça prend un instant.',
  },

  bandeaux: {
    cheminIntrouvable: 'Cette adresse n’existe pas sur ce site\u202f; voici la page d’accueil. Si vous suiviez un lien de démonstration, il a été rejoué ci-dessous.',
    urlAbsente: 'La grammaire d’URL n’a pas pu être chargée : la navigation par lien '
      + 'est désactivée. {raison}',
    lienIllisible: 'Ce lien n’a pas pu être lu.',
    voieInconnue: 'Cette voie n’existe pas dans nos registres : le moteur ne sait pas '
      + 'la rejouer.',
    rangAbsent: 'Aucune voie ne porte le rang {rang} dans le classement courant.',
    incantation: 'Cette incantation est corrompue.',
    illustration: 'L’illustration n’a pas pu être tracée ; la démonstration reste lisible '
      + 'ci-dessous, et les contrôles pilotent Le Registre.',
    jeuDEssai: 'Le moteur de recherche n’est pas branché : ceci est un jeu d’essai '
      + 'figé, issu du cahier des charges. Rien n’a été calculé à partir de votre saisie.',
    moteurAbsent: 'Le moteur de recherche n’est pas encore branché. Ce qui suit est un jeu '
      + 'd’essai figé, tiré des sept méthodes du cahier des charges : rien n’a été '
      + 'calculé à partir de votre saisie, et les liens de partage sont désactivés.',
  },

  pied: {
    /* ★ Trois paragraphes de licences sont devenus une ligne.
       « Contente-toi de mettre "Projet libre, remonter aux sources" » (l'auteur).
       Le détail — AGPL-3.0 pour le code, OFL pour les polices, CC0 pour les
       sons — ne disparaît pas : il remonte au README du dépôt, qui est sa place.
       Un pied de page dit à qui appartient ce qu'on regarde ; il n'a pas à
       réciter le contrat. */
    libre: 'Projet libre, <a href="https://framagit.org/1crea/numherololgeek">remonter aux sources</a>.',
    silence: 'Aucun cookie, aucune mesure d’audience, aucun appel réseau après le chargement.',
  },
};

export default fr;
