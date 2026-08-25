/** English dictionary.
 *
 *  ENGLISH TYPOGRAPHY, and it is NOT the French one — this is the classic trap:
 *    · straight double quotes "…" around quoted matter, never « » ;
 *    · NO space before ! ? ; : — the punctuation sits tight against the word ;
 *    · straight apostrophe ' (kept consistent with the straight quotes above).
 *  `i18n.test.js` rejects any English string containing a narrow no-break space
 *  or a French guillemet: the rule is checked, not merely recommended.
 *
 *  Values may contain `{name}` tokens, interpolated by `t()`.
 *
 *  The key tree MUST mirror fr.js exactly — a dedicated test compares both. */

export const en = {
  code: 'en',
  /* native name: never translated, it is an autonym */
  autonyme: 'English',

  nombres: {
    lettres: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
      'eight', 'nine', 'ten', 'eleven', 'twelve'],
  },

  global: {
    titre: 'Numérologie',
    baseline: 'the truth behind anything at all',
    allerAuContenu: 'Skip to content',
    titreDefaut: 'Numérologie — the truth behind anything at all',
    suffixeTitre: '{titre} — Numérologie',
    logoTexte: 'Numérologie — Num Hero LOL geek',
    logoAide: 'Activate to reveal what the word is hiding.',
    logoAideRevu: 'Activate to see again what the word is hiding.',
    logoRetour: '{lecture} — back to home',
  },

  logo: {
    transport: {
      groupe: 'Logo reveal controls',
      jauge: 'Jump to a step of the reveal',
      jaugeCase: 'Jump to step {i} of {total}',
      jaugeCaseTitree: 'Jump to step {i} of {total}: {titre}',
      precedent: 'Previous step',
      suivant: 'Next step',
      lancer: 'Play the reveal',
      rejouer: 'Play the reveal again',
      fin: 'Jump to the revealed word',
    },
    etapes: {
      h: 'Room for the h, and the h moving in',
      l: 'Room for the l, and the l coming down',
      e: 'The last e shifts, the other e drops, the bar passes underneath',
      k: 'The two bars of the k swing open from their tips',
    },
  },
  entete: {
    reglages: 'Display settings',
    theme: {
      label: 'Theme',
      clair: 'Light',
      auto: 'Automatic',
      sombre: 'Dark',
      titre: 'Theme: {valeur}',
    },
    langue: {
      label: 'Language',
      titre: 'Language: {valeur}',
    },
    animation: {
      reduire: 'Reduce animations',
      retablir: 'Restore full animations',
    },
    recommencer: 'Start over',
    toutesLesVoies: 'All the paths',
  },

  accueil: {
    baseline: 'The art of numerology, at last within everyone’s reach!',
    label: 'Whose arcana would you like revealed?',
    placeholder: 'a word, a sentence, an address…',
    aide: 'Up to {plafond} characters. Everything is computed in your browser.',
    reveler: 'Reveal',
    consultation: 'Consulting the arcana…',
    erreurVide: 'The arcana need something to work with. Type anything.',
    erreurUrl: 'The URL grammar is not loaded: the link cannot be composed.',
    exemplesTitre: 'Why not try:',
    exemples: [
      'hope-hope-hope.fr',
      'Donald Trump',
      {
        texte: 'https://reinfocovid.fr/',
        hash: '#0.1:t1+m4+c1+p1,3.1:f9+n1,5.1:t1+md+c1#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
        aide: 'See the demonstration for “https://reinfocovid.fr/”',
      },
      'Capitalism',
    ],
    mentionCalcul: 'Everything is computed in your browser: nothing is sent anywhere.',
    mentionParodie: 'This is a parody. Numerology predicts nothing. Code does.',
  },

  resultat: {
    surtitre: 'The arcana of',
    annonceAucune: 'No path has been traced yet.',
    annonceUne: 'One approach leads to 666.',
    annoncePlusieurs: '{n} approaches lead to 666.',
    voiesTitre: 'The complete paths',
    fragmentsTitre: 'The fragments worth 6',
    aucuneVoie: 'No path found. That is mathematically impossible; we are investigating.',
    voieNumero: 'no. {rang}',
    voieSansTitre: 'Approach no. {rang}',
    jokerNote: 'French wildcard: it only works in French, and that is an argument.',
    cheminUnique: '{n} path',
    cheminsPluriels: '{n} paths',
    familles: {
      repetition: 'repeated pattern',
      periodicite: 'periodicity',
      unite: 'unit',
      separateurs: 'separators',
      frontiere: 'boundary',
      entier: 'whole query',
      ngramme: 'n-gram',
    },
    memo: {
      titre: 'Assemble your own arcana',
      grammaire: '#{program}#{query in base58}',
      grammaireTexte: '"+" between operations, "," between fragments.',
      resonance: '#×3:m1+c1+p1#…',
      resonanceTexte: 'resonance: the same program on all three occurrences of a repeated pattern.',
      portee: '#0.1:m1+c1,1.1:n2#…',
      porteeTexte: 'scope: offset and length, counted in tokens of the query.',
      copier: 'Copy the link to this page',
    },
  },

  demo: {
    surtitre: 'The truth behind',
    methode: 'Method {rang} — {titre}',
    sansTitre: 'untitled',
    demonstration: 'Demonstration',
    sceneLabel: 'Demonstration stage',
    allerAuRegistre: 'Skip to the Ledger',
    revoir: 'Watch again',
    autreVoie: 'Another path',
    nouvelleRecherche: 'New search',
    debug: {
      etape: 'step',
      temps: 'time',
      source: 'source',
      url: 'url',
      valeurSource: 'player: {lecteur} · scenario: {scenario}',
      indisponible: '(unavailable)',
    },
    raccourcis: {
      titre: 'Keyboard shortcuts',
      espace: 'Space or K',
      gauche: '← or J',
      droite: '→ or L',
      origine: 'Home',
      fin: 'End',
      d: 'D',
      lecturePause: 'Play / Pause',
      precedente: 'Previous transformation',
      suivante: 'Next transformation',
      debut: 'Back to the start',
      resultat: 'Jump to the result',
      panneau: 'Debug panel',
    },
  },

  transport: {
    groupe: 'Demonstration controls',
    jauge: 'Jump to a transformation',
    jaugeCase: 'Jump to transformation {i} of {total}',
    jaugeCaseTitree: 'Jump to transformation {i} of {total}: {titre}',
    debutCourt: 'Start',
    precCourt: 'Prev.',
    lectureCourt: 'Play',
    pauseCourt: 'Pause',
    rejouerCourt: 'Replay',
    suivCourt: 'Next',
    finCourt: 'End',
    debut: 'Back to the start',
    precedent: 'Previous transformation',
    lancer: 'Start the demonstration',
    pause: 'Pause',
    rejouer: 'Replay the demonstration',
    suivant: 'Next transformation',
    fin: 'Jump to the result',
    // Repeats: a step that redoes the exact same gesture as an earlier one, on
    // another piece of the input. The first one teaches, the others confirm —
    // hence the fast-forward, and hence the right to turn it off.
    reditesCourt: 'Repeats',
    reditesAccelerer: 'Speed up repeated steps ({facteur}×)',
    reditesRalentir: 'Play repeated steps in full',
    reditesSansEffet: 'Speeding up repeats has no effect: animations are reduced',
  },

  registre: {
    titre: 'The Ledger',
    transformation: 'Transformation {i}',
    etape: 'Step {i} of {total} — {titre}',
    termine: 'Demonstration finished. Result: {resultat}.',
  },

  partage: {
    partager: 'Share',
    partage: 'Shared.',
    copie: 'Text copied to the clipboard.',
    copieEchouee: 'Copying failed: please select the link by hand.',
    copieCourte: 'Copied.',
    copieCourteEchouee: 'Copying failed.',
    rienACopier: 'Nothing to copy.',
    indisponible: 'The canonical link is unavailable until the engine is wired in.',
    texte: 'The truth behind {saisie}: {resultat}.',
  },

  bandeaux: {
    urlAbsente: 'The URL grammar could not be loaded: link navigation is disabled. {raison}',
    lienIllisible: 'This link could not be read.',
    voieInconnue: 'This path is absent from our records: the engine cannot replay it.',
    rangAbsent: 'No path holds rank {rang} in the current ranking.',
    incantation: 'This incantation is corrupted.',
    illustration: 'The illustration could not be drawn; the demonstration remains readable '
      + 'below, and the controls drive the Ledger.',
    jeuDEssai: 'The search engine is not wired in: this is a frozen test fixture taken from '
      + 'the specification. Nothing was computed from what you typed.',
    moteurAbsent: 'The search engine is not wired in yet. What follows is a frozen test '
      + 'fixture, taken from the seven methods of the specification: nothing was computed '
      + 'from what you typed, and the share links are disabled.',
  },

  pied: {
    polices: 'Set in <em>Jost*</em> — the very typeface the logo is drawn over — '
      + 'and in <em>JetBrains Mono</em>; the displays are in '
      + '<em>DSEG7 Classic</em> (seven segments) and <em>DSEG14 Classic</em> '
      + '(fourteen segments). Four typefaces under the '
      + '<a href="fonts/OFL-Jost.txt">SIL OFL 1.1</a> licence, hosted right here.',
    silence: 'No cookies, no analytics, no network call once the page is loaded.',
  },
};

export default en;
