/**
 * Scénarios de démonstration — fixtures.
 *
 * Ils appartiennent au moteur visuel et servent à deux choses :
 *  1. les tests `node --test` (compilation, invariants, mode réduit) ;
 *  2. le banc d'essai du logo, `src/gfx/_logo-test.html`.
 *
 * En production, c'est `src/recherche/scenario.js` (agent heuristique) qui
 * produit les `Scenario` — le seul point de contact arithmétique ↔ visuel.
 * Ces fixtures reproduisent des méthodes du README pour vérifier que le
 * vocabulaire suffit à les raconter.
 */

/** Méthode 4 — la somme de « hope » en gématrie simple, réduite. */
export const methode4 = {
  version: 1,
  input: 'hope',
  method: { id: 4, label: 'La somme des 3 répétitions en gématrie simple', rule: 'A=1, B=2 … Z=26, puis réduction théosophique' },
  result: '8',
  tokens: [
    { id: 'a0', text: 'h', kind: 'letter', group: 'w0' },
    { id: 'a1', text: 'o', kind: 'letter', group: 'w0' },
    { id: 'a2', text: 'p', kind: 'letter', group: 'w0' },
    { id: 'a3', text: 'e', kind: 'letter', group: 'w0' },
  ],
  steps: [
    {
      id: 's0',
      title: 'On isole le mot',
      caption: 'hope',
      ops: [{ op: 'highlight', targets: { group: 'w0' }, stagger: 80 }],
    },
    {
      id: 's1',
      title: 'Chaque lettre vaut son rang dans l’alphabet',
      caption: 'A=1, B=2 … Z=26',
      ops: [{
        op: 'substitute',
        stagger: 120,
        pairs: [
          { target: 'a0', to: { id: 'n0', text: '8', kind: 'number' } },
          { target: 'a1', to: { id: 'n1', text: '15', kind: 'number' } },
          { target: 'a2', to: { id: 'n2', text: '16', kind: 'number' } },
          { target: 'a3', to: { id: 'n3', text: '5', kind: 'number' } },
        ],
      }],
    },
    {
      id: 's2',
      title: 'On additionne',
      caption: '8 + 15 + 16 + 5 = 44',
      hold: 400,
      ops: [
        { op: 'insertOperators', between: ['n0', 'n1', 'n2', 'n3'], glyph: '+', ids: ['p0', 'p1', 'p2'] },
        { op: 'sum', targets: ['n0', 'n1', 'n2', 'n3'], consume: ['p0', 'p1', 'p2'], to: { id: 'q44', text: '44', kind: 'number' }, at: 700, dur: 1000 },
      ],
    },
    {
      id: 's3',
      title: 'Réduction théosophique',
      caption: '44 → 4 + 4 → 8',
      hold: 400,
      ops: [{
        op: 'reduce',
        target: 'q44',
        digits: [{ id: 'r4a', text: '4' }, { id: 'r4b', text: '4' }],
        to: { id: 'e0', text: '8', kind: 'number' },
      }],
    },
    {
      id: 's4',
      title: 'Le mot vaut 8',
      caption: 'hope = 8',
      ops: [{ op: 'reveal', targets: ['e0'] }, { op: 'wait', dur: 700 }],
    },
  ],
};

/** Méthode 5 — l'affichage 7 segments, traits continus fusionnés. */
export const methode5 = {
  version: 1,
  input: 'HOPE',
  method: { id: 5, label: 'L’affichage 7 segments (traits continus fusionnés)', rule: 'On fusionne les segments colinéaires adjacents' },
  result: '6',
  tokens: [
    { id: 'h', text: 'H', kind: 'letter', group: 'w0' },
    { id: 'o', text: 'O', kind: 'letter', group: 'w0' },
    { id: 'p', text: 'P', kind: 'letter', group: 'w0' },
    { id: 'e', text: 'E', kind: 'letter', group: 'w0' },
  ],
  steps: [
    {
      id: 's0',
      title: 'On écrit HOPE sur un afficheur 7 segments',
      caption: 'H = 3 traits',
      ops: [
        { op: 'sevenSeg', target: 'h', segments: 'bcefg', count: 3, note: 'traits continus fusionnés' },
        { op: 'annotate', anchor: ['h'], text: 'verticale gauche, verticale droite, barre du milieu', place: 'below', at: 700 },
      ],
      hold: 500,
    },
    // ★ UNE LETTRE PAR ÉTAPE, et non trois dans la même. L'afficheur est un
    //   DÉCOR mutualisé — un seul cadre, un seul jeu de segments, gardés d'une
    //   lettre à l'autre (`primitives/afficheur.js`) : trois ops dans le même
    //   step allumeraient trois lettres sur le même afficheur, en même temps,
    //   et se contrediraient. C'est ce que le moteur refuse désormais
    //   statiquement (`visuel/scenario.js`), et c'est de toute façon ce que
    //   l'émetteur réel fait déjà — « un step par jeton », sans quoi on ne voit
    //   plus quelle lettre a donné quel compte.
    {
      id: 's1',
      title: 'La deuxième lettre',
      caption: 'O = 4',
      ops: [{ op: 'sevenSeg', target: 'o', segments: 'abcdef', count: 4, montre: true, retire: false }],
    },
    {
      id: 's1b',
      title: 'La troisième lettre',
      caption: 'P = 4',
      ops: [{ op: 'sevenSeg', target: 'p', segments: 'abefg', count: 4, retire: false }],
    },
    {
      id: 's1c',
      title: 'La quatrième lettre',
      caption: 'E = 4',
      ops: [{ op: 'sevenSeg', target: 'e', segments: 'adefg', count: 4 }],
      hold: 500,
    },
    {
      id: 's2',
      title: 'On remplace chaque lettre par son compte',
      caption: '3, 4, 4, 4',
      ops: [{
        op: 'substitute',
        stagger: 100,
        pairs: [
          { target: 'h', to: { id: 'c0', text: '3', kind: 'digit' } },
          { target: 'o', to: { id: 'c1', text: '4', kind: 'digit' } },
          { target: 'p', to: { id: 'c2', text: '4', kind: 'digit' } },
          { target: 'e', to: { id: 'c3', text: '4', kind: 'digit' } },
        ],
      }],
    },
    {
      id: 's3',
      title: 'On additionne',
      caption: '3 + 4 + 4 + 4 = 15',
      ops: [
        { op: 'insertOperators', between: ['c0', 'c1', 'c2', 'c3'], glyph: '+', ids: ['k0', 'k1', 'k2'] },
        { op: 'sum', targets: ['c0', 'c1', 'c2', 'c3'], consume: ['k0', 'k1', 'k2'], to: { id: 'q15', text: '15', kind: 'number' }, at: 700, dur: 1000 },
      ],
      hold: 400,
    },
    {
      id: 's4',
      title: 'Réduction',
      caption: '15 → 1 + 5 → 6',
      ops: [{
        op: 'reduce',
        target: 'q15',
        digits: [{ id: 'd1', text: '1' }, { id: 'd5', text: '5' }],
        to: { id: 'six', text: '6', kind: 'digit' },
      }],
    },
    {
      id: 's5',
      title: 'Chaque « hope » vaut 6',
      ops: [{ op: 'reveal', targets: ['six'] }, { op: 'wait', dur: 800 }],
    },
  ],
};

/** Méthode 6 — l'astuce AZERTY et le retournement du 9. */
export const methode6 = {
  version: 1,
  input: 'hope-hope',
  method: { id: 6, label: 'L’astuce AZERTY et le retournement du 9', rule: 'Le « - » partage la touche du 6 en AZERTY' },
  result: '6',
  tokens: [
    { id: 'x0', text: '8', kind: 'digit', group: 'w0' },
    { id: 'sep', text: '-', kind: 'sep' },
    { id: 'x1', text: '8', kind: 'digit', group: 'w1' },
  ],
  steps: [
    {
      id: 's0',
      title: 'On repère le séparateur',
      caption: 'le tiret entre les deux mots',
      ops: [
        { op: 'highlight', targets: ['sep'], mode: 'select' },
        { op: 'dim', targets: ['x0', 'x1'], at: 200 },
      ],
    },
    {
      id: 's1',
      title: 'Le tiret est sur la touche du 6 en AZERTY',
      caption: 'ligne AE06 de /usr/share/X11/xkb/symbols/fr',
      ops: [{ op: 'keyboard', target: 'sep', key: '-', to: { id: 'k6', text: '6', kind: 'digit' } }],
      hold: 400,
    },
    {
      id: 's2',
      title: 'On additionne',
      caption: '8 + 6 + 8 = 22',
      ops: [
        { op: 'insertOperators', between: ['x0', 'k6', 'x1'], glyph: '+', ids: ['o0', 'o1'] },
        { op: 'sum', targets: ['x0', 'k6', 'x1'], consume: ['o0', 'o1'], to: { id: 'q22', text: '22', kind: 'number' }, at: 700, dur: 1000 },
      ],
      hold: 300,
    },
    {
      id: 's3',
      title: 'Réduction',
      caption: '22 → 2 + 2 → 4… puis on triche un peu',
      ops: [{
        op: 'reduce',
        target: 'q22',
        digits: [{ id: 'y2a', text: '2' }, { id: 'y2b', text: '2' }],
        to: { id: 'q4', text: '4', kind: 'digit' },
      }],
    },
    {
      id: 's4',
      title: 'On retourne le 9',
      caption: 'un 9 retourné est un 6 — c’est de bonne guerre',
      ops: [
        { op: 'substitute', pairs: [{ target: 'q4', to: { id: 'q9', text: '9', kind: 'digit' } }] },
        { op: 'flip180', target: 'q9', to: { id: 'six', text: '6', kind: 'digit' }, at: 1150 },
      ],
      hold: 400,
    },
    {
      id: 's5',
      title: 'Et voilà le 6',
      ops: [{ op: 'reveal', targets: ['six'] }, { op: 'wait', dur: 700 }],
    },
  ],
};

/**
 * Parcours de contrôle : **toutes les primitives** du vocabulaire fermé, au moins
 * une fois chacune. Sert de test de non-régression du catalogue et de page de
 * vérification manuelle.
 */
export const vocabulaire = {
  version: 1,
  input: 'HOPE-HOPE',
  method: { id: 0, label: 'Parcours du vocabulaire', rule: 'vérification du vocabulaire fermé' },
  result: '666',
  tokens: [
    { id: 'v0', text: 'H', kind: 'letter', group: 'w0' },
    { id: 'v1', text: 'O', kind: 'letter', group: 'w0' },
    { id: 'v2', text: 'P', kind: 'letter', group: 'w0' },
    { id: 'v3', text: 'E', kind: 'letter', group: 'w0' },
    { id: 'vs', text: '-', kind: 'sep', group: 'sep' },
    { id: 'w0', text: 'f', kind: 'letter', group: 'w1' },
    { id: 'w1', text: 'r', kind: 'letter', group: 'w1' },
    // Le figurant du dernier geste : une valeur qui ne vaut pas 6 et que les
    // cornes effaceront. Sans elle, `horns` n'aurait rien à effacer, et le
    // parcours n'exercerait que la moitié du geste.
    { id: 'v4', text: '4', kind: 'digit' },
  ],
  steps: [
    {
      id: 'p0',
      title: 'partition',
      caption: 'on découpe la saisie en deux groupes',
      ops: [{
        op: 'partition',
        groups: [
          { targets: ['v0', 'v1', 'v2', 'v3'], tag: 'w0', label: 'groupe 1' },
          { targets: ['w0', 'w1'], tag: 'w1', label: 'groupe 2' },
        ],
      }],
      hold: 300,
    },
    {
      id: 'p1',
      title: 'highlight + dim + annotate',
      caption: 'on isole le premier mot',
      ops: [
        { op: 'highlight', targets: { group: 'w0' }, stagger: 70 },
        { op: 'dim', targets: { group: 'w1' }, at: 150 },
        { op: 'annotate', anchor: { group: 'w0' }, text: 'le mot à traiter', place: 'below', arrow: true, at: 300 },
      ],
    },
    {
      id: 'p2',
      title: 'table',
      caption: 'f est la 6ᵉ lettre — la table le montre',
      ops: [{ op: 'table', ordre: 'a1z26', target: 'w0', letter: 'f', to: { id: 'ab6', text: '6', kind: 'digit' } }],
      hold: 400,
    },
    {
      id: 'p2b',
      title: 'drop — on efface, puis on rapproche',
      caption: 'les deux temps du filtre',
      ops: [
        { op: 'drop', targets: ['w1'], mode: 'erase', regroup: false },
        { op: 'move', at: 900 },
      ],
    },
    {
      id: 'p3',
      title: 'countStrokes',
      caption: 'H se dessine en 3 traits',
      ops: [{ op: 'countStrokes', target: 'v0', glyph: 'H', mode: 'traits', count: 3 }],
      hold: 400,
    },
    {
      id: 'p4',
      title: 'countStrokes — extrémités',
      caption: 'E a 3 extrémités libres (le fût n’en compte aucune)',
      ops: [{ op: 'countStrokes', target: 'v3', glyph: 'E', mode: 'extremites', count: 3 }],
      hold: 400,
    },
    {
      id: 'p5',
      title: 'sevenSeg',
      caption: 'O = 4 traits continus',
      ops: [{ op: 'sevenSeg', target: 'v2', segments: 'abcdef', count: 4 }],
      hold: 300,
    },
    {
      id: 'p5b',
      title: 'fourteenSeg',
      caption: 'sur quatorze segments, O en allume 6',
      ops: [{
        op: 'fourteenSeg', target: 'v1', segments: ['a', 'b', 'c', 'd', 'e', 'f'],
        fusion: false, count: 6,
      }],
      hold: 300,
    },
    {
      id: 'p6',
      title: 'keyboard',
      caption: 'le tiret est sur la touche du 6',
      ops: [{ op: 'keyboard', target: 'vs', key: '-', to: { id: 'kb6', text: '6', kind: 'digit' } }],
    },
    {
      id: 'p7',
      title: 'substitute + move',
      caption: 'chaque lettre devient un nombre',
      ops: [
        {
          op: 'substitute',
          stagger: 90,
          pairs: [
            { target: 'v0', to: { id: 'm0', text: '3', kind: 'digit' } },
            { target: 'v1', to: { id: 'm1', text: '4', kind: 'digit' } },
            { target: 'v2', to: { id: 'm2', text: '4', kind: 'digit' } },
            { target: 'v3', to: { id: 'm3', text: '4', kind: 'digit' } },
          ],
        },
        { op: 'move', order: ['m0', 'm1', 'm2', 'm3', 'kb6', 'ab6'], at: 700 },
      ],
    },
    {
      id: 'p8',
      title: 'group + pulse',
      caption: 'on regroupe les quatre comptes',
      ops: [
        { op: 'group', targets: ['m0', 'm1', 'm2', 'm3'], shape: 'brace', symbol: 'Σ', label: 'les traits de HOPE' },
        { op: 'pulse', targets: ['kb6'], at: 500 },
      ],
    },
    {
      id: 'p9',
      title: 'insertOperators + sum',
      caption: '3 + 4 + 4 + 4 = 15',
      ops: [
        { op: 'insertOperators', between: ['m0', 'm1', 'm2', 'm3'], glyph: '+', ids: ['z0', 'z1', 'z2'] },
        { op: 'sum', targets: ['m0', 'm1', 'm2', 'm3'], consume: ['z0', 'z1', 'z2'], to: { id: 'q15', text: '15', kind: 'number' }, at: 700, dur: 1000 },
      ],
      hold: 300,
    },
    {
      id: 'p10',
      title: 'reduce',
      caption: '15 → 1 + 5 → 6',
      ops: [{
        op: 'reduce',
        target: 'q15',
        digits: [{ id: 'g1', text: '1' }, { id: 'g5', text: '5' }],
        to: { id: 'six1', text: '6', kind: 'digit' },
      }],
    },
    {
      id: 'p11',
      title: 'flip180',
      caption: 'un 9 retourné fait un 6',
      ops: [
        { op: 'substitute', pairs: [{ target: 'six1', to: { id: 'nine', text: '9', kind: 'digit' } }] },
        { op: 'flip180', target: 'nine', to: { id: 'six2', text: '6', kind: 'digit' }, at: 1150 },
      ],
    },
    {
      id: 'p09b',
      title: 'fraction',
      caption: 'on pose le calcul — numérateur, barre, dénominateur — puis on le fait',
      ops: [
        { op: 'substitute', pairs: [{ target: 'ab6', to: [{ id: 'fr0', text: '4', kind: 'digit' }, { id: 'fr1', text: '8', kind: 'digit' }] }] },
        { op: 'fraction', targets: ['fr0', 'fr1'], symbol: 'moy.', diviseur: { id: 'frd', text: '2', kind: 'number' }, to: { id: 'ab6f', text: '6', kind: 'digit' }, at: 1150 },
      ],
    },
    {
      id: 'p10a',
      title: 'collapse',
      caption: 'deux exemplaires identiques se rejoignent — il n’en reste qu’un',
      ops: [
        { op: 'substitute', pairs: [{ target: 'ab6f', to: [{ id: 'cl0', text: '6', kind: 'digit' }, { id: 'cl1', text: '6', kind: 'digit' }] }] },
        { op: 'collapse', familles: [{ membres: ['cl0', 'cl1'], garde: 'cl0' }], at: 1150 },
        { op: 'substitute', pairs: [{ target: 'cl0', to: { id: 'ab6b', text: '6', kind: 'digit' } }], at: 3600 },
      ],
    },
    {
      id: 'p10b',
      title: 'shift',
      caption: 'le tamis : ce qu’on garde descend, ce qu’on jette monte — puis se rend',
      ops: [
        { op: 'shift', down: ['ab6b'], up: ['v4'] },
        { op: 'shift', reset: ['ab6b', 'v4'], at: 1000 },
      ],
    },
    {
      id: 'p10c',
      title: 'convert + rule',
      caption: 'une expression monte sous l’accolade, s’y voit égalée à une autre — et le trait suit ce qu’il sépare',
      ops: [
        // Un trait de fraction naît sur son propre rang : c'est ce que `rule`
        // gouverne, et il n'existe pas ailleurs dans ce parcours.
        {
          op: 'substitute',
          pairs: [{
            target: 'v4',
            to: [
              { id: 'cv4', text: '4', kind: 'digit' },
              { id: 'cvf', role: 'filet', kind: 'sep', text: '    ', breakBefore: true },
            ],
          }],
        },
        { op: 'rule', id: 'cvf', couvre: { all: true }, at: 1150, dur: 700 },
        // L'atelier : le 4 monte sous une accolade OUVERTE VERS LE HAUT — le
        // seul endroit du parcours où ce sens-là s'exerce —, s'y voit égalé à
        // un autre 4, et c'est l'autre qui reprend la place.
        {
          op: 'convert',
          targets: ['cv4'],
          to: [{ id: 'cv4b', text: '4', kind: 'digit' }],
          label: 'conversion',
          sens: 'haut',
          at: 1900,
          dur: 2200,
        },
        { op: 'rule', id: 'cvf', to: 0, retire: true, at: 4100, dur: 700 },
        { op: 'substitute', pairs: [{ target: 'cv4b', to: { id: 'v4b', text: '4', kind: 'digit' } }], at: 4800 },
      ],
    },
    {
      id: 'p10d',
      title: 'insert',
      caption: 'des jetons entrent dans la ligne, et rien n’en sort',
      ops: [
        // La place se fait d'abord — `v4b` glisse à droite —, puis le signe
        // paraît : c'est l'ordre qui distingue `insert` d'un remplacement.
        { op: 'insert', avant: 'v4b', tokens: [{ id: 'ins0', text: '=', kind: 'operator' }] },
        { op: 'drop', targets: ['ins0'], mode: 'erase', at: 1800, dur: 600 },
      ],
    },
    {
      id: 'p11a',
      title: 'merge',
      caption: 'deux chiffres qui se collent n’en font plus qu’un — et rien d’autre ne bouge',
      ops: [
        { op: 'substitute', pairs: [{ target: 'six2', to: [{ id: 'mg0', text: '5', kind: 'digit' }, { id: 'mg1', text: '1', kind: 'digit' }] }] },
        { op: 'merge', targets: ['mg0', 'mg1'], to: { id: 'mg', text: '51', kind: 'number' }, at: 1150 },
        { op: 'substitute', pairs: [{ target: 'mg', to: { id: 'six2b', text: '6', kind: 'digit' } }], at: 2200 },
      ],
    },
    {
      id: 'p11b',
      title: 'horns',
      caption: 'trois 6 d’affilée : le 666 était déjà écrit, le reste s’efface',
      ops: [
        // Les cornes exigent que les trois 6 se TOUCHENT dans la ligne — c'est
        // tout leur propos. On remet donc l'ordre avant de les poser ; le `4`
        // reste en queue, et c'est lui que le geste efface.
        { op: 'move', order: ['kb6', 'six2b', 'ab6b', 'v4b'] },
        { op: 'horns', targets: ['kb6', 'six2b', 'ab6b'], efface: ['v4b'], at: 950 },
      ],
      hold: 400,
    },
    {
      id: 'p12',
      title: 'reveal + wait',
      caption: 'C.Q.F.D.',
      ops: [
        { op: 'reveal', targets: ['kb6', 'six2b', 'ab6b'], stagger: 220 },
        { op: 'wait', dur: 900 },
      ],
    },
  ],
};

/**
 * Le clavier sous ses trois mesures — fixture de vérification visuelle.
 *
 * Un `keyboard` par step : chacun anime la caméra, deux se contrediraient
 * (`scenario.js` le refuse). On y voit successivement :
 *  - la **touche** : le tiret partage la touche du 6 en AZERTY ;
 *  - la **colonne** : « p » est en colonne **10** alors que la touche du dessus
 *    porte « 0 » — c'est la réglette de 1 à 10 qui dit vrai ;
 *  - la **rangée** : trois rangées de lettres numérotées en marge, sans la
 *    rangée de chiffres ;
 *  - la colonne en **QWERTY** : le « w » y est en colonne 2 de la rangée du haut,
 *    là où l'AZERTY le met en rangée du bas. Les deux dispositions ne diffèrent
 *    que sur A/Q/Z/W/M — et ce sont ces cinq lettres qui le montrent.
 */
export const claviers = {
  version: 1,
  input: '-pmw',
  method: { id: 6, label: 'Le clavier, sous ses trois mesures', rule: 'touche · colonne · rangée' },
  result: '6 10 3 2',
  tokens: [
    { id: 'k0', text: '-', kind: 'sep' },
    { id: 'k1', text: 'p', kind: 'letter' },
    { id: 'k2', text: 'm', kind: 'letter' },
    { id: 'k3', text: 'w', kind: 'letter' },
  ],
  steps: [
    {
      id: 'c0',
      title: 'Le tiret du 6',
      caption: 'AZERTY, mesure « touche » — ligne AE06 de /usr/share/X11/xkb/symbols/fr',
      ops: [{ op: 'keyboard', target: 'k0', key: '-', mesure: 'touche', to: { id: 'v0', text: '6', kind: 'digit' } }],
      hold: 400,
    },
    {
      id: 'c1',
      title: 'La colonne du « p »',
      caption: 'colonne 10 — la touche du dessus porte « 0 », la réglette dit 10',
      ops: [{ op: 'keyboard', target: 'k1', key: 'p', mesure: 'colonne', to: { id: 'v1', text: '10', kind: 'number' } }],
      hold: 400,
    },
    {
      id: 'c2',
      title: 'La rangée du « m »',
      caption: 'AZERTY : le M est en rangée 2 — la rangée de chiffres n’est pas montrée',
      ops: [{ op: 'keyboard', target: 'k2', key: 'm', mesure: 'rangee', to: { id: 'v2', text: '2', kind: 'digit' } }],
      hold: 400,
    },
    {
      id: 'c3',
      title: 'Le « w », en QWERTY',
      caption: 'colonne 2 sur un clavier américain — les deux dispositions ne diffèrent que sur A/Q/Z/W/M',
      ops: [{ op: 'keyboard', target: 'k3', key: 'w', mesure: 'colonne', layout: 'qwerty', to: { id: 'v3', text: '2', kind: 'digit' } }],
      hold: 400,
    },
    {
      id: 'c4',
      title: 'Ce que le clavier a rendu',
      ops: [{ op: 'reveal', targets: ['v0', 'v1', 'v2', 'v3'], stagger: 200 }, { op: 'wait', dur: 700 }],
    },
  ],
};

export const SCENARIOS = { methode4, methode5, methode6, claviers, vocabulaire };
