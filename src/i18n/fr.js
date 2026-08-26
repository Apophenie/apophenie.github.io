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
        hash: '#0.1:t1+mw,1.1:t1+mv+c1,2.1:t1+mw,3.1:t1+mv+c1,4.1:t1+mw,6.1:t1+md+c1#yvQYkzhNVYJT8wM8jhvJxSM',
        aide: 'Voir la démonstration pour « hope-hope-hope.fr »',
      },
      'Donald Trump',
      {
        texte: 'https://reinfocovid.fr/',
        // Trois morceaux d'URL, trois règles différentes, trois 6 : la
        // chaldéenne sur « https » (5+4+4+8+3 = 24 → 6), les consonnes de
        // « reinfocovid » comptées (6), et « fr » en sept segments (4+2).
        hash: '#0.1:t1+m4+c1+p1,3.1:f9+n1,5.1:t1+md+c1#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
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
    annonceUne: 'Une approche mène à 666.',
    annoncePlusieurs: '{n} approches mènent à 666.',
    voiesTitre: 'Les voies complètes',
    fragmentsTitre: 'Les fragments valant 6',
    aucuneVoie: 'Aucune voie trouvée. C’est mathématiquement impossible ; nous enquêtons.',
    voieNumero: 'n° {rang}',
    /* Le compteur de séries, à cheval sur le bord DROIT du panneau — le
       pendant du numéro de rang. Deux écritures d'une seule information :
       le BADGE est un dessin (les points médians découpent les trois 6
       comme sur un cadran), la PHRASE est ce qu'un lecteur d'écran annonce.
       Rien n'est affiché quand n vaut 1 (`resultat.js › compteurSeries`). */
    voieSeriesBadge: '{n} × 666',
    voieSeries: '{n} séries de 666',
    voieSansTitre: 'Approche n° {rang}',
    /* Les deux accès d'un panneau de voie. Le libellé VISIBLE est court — il
       tient sur une demi-largeur de carte —, le nom ACCESSIBLE porte le titre
       de la voie : douze cartes offrant douze liens « Sobre » ne distingueraient
       rien dans la liste des liens d'un lecteur d'écran. */
    acces: {
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
      resonance: '#×3:m1+c1+p1#…',
      resonanceTexte: 'résonance : le même programme sur les trois occurrences d’un motif répété.',
      portee: '#0.1:m1+c1,1.1:n2#…',
      porteeTexte: 'portée : offset et longueur en jetons de la saisie.',
      registre: '#sobre!…#…  ·  #scenique!…#…',
      registreTexte: 'registre de mise en scène, en tête de l’approche. Absent, il vaut « scénique » — c’est ainsi que se lisent les liens d’avant.',
      copier: 'Copier le lien de cette page',
    },
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

  bandeaux: {
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
