/**
 * Mesures (`STR → NUM`, codes `n…`) et mappeurs (`TOKENS → NUMS`, `NUMS → NUMS`,
 * codes `m…`).
 *
 * Les mappeurs de valeur de lettre exigent des **jetons d'un seul caractère**
 * (sinon `null`) : « la valeur d'un mot » n'a pas de définition non arbitraire,
 * et le moteur préfère élaguer que bricoler. `m.longueurToken` couvre le cas des
 * mots.
 *
 * ## Gestes dédiés du vocabulaire fermé (CONTRACTS §3.1)
 *
 * - **`sevenSeg`** (`md`, `me`) : la lettre est d'abord tracée depuis
 *   `tables/glyphes.js`, puis fond vers l'afficheur, qui s'allume un trait
 *   continu à la fois.
 * - **`countStrokes`** (`mf`…`mk` — traits, extrémités, boucles) : le glyphe est
 *   REDESSINÉ trait par trait, avec un badge numéroté par trait, par extrémité
 *   libre ou par boucle. C'est l'exigence de CONTRACTS §0.3 : « ce que le
 *   spectateur voit à l'écran est, littéralement, ce qui a été compté ». Les
 *   tables de comptage (`tables/derivees.js`) et le tracé animé sortent du même
 *   `tables/glyphes.js`, et `count` fait échouer la compilation s'ils
 *   divergeaient.
 * - **`keyboard`** (`ml`…`mo`, `mv`) : le clavier monte, la touche — ou la
 *   colonne, ou la rangée — s'illumine, le caractère y vole, et le nombre en
 *   redescend. Trois mesures : `'touche'` (le « tiret du 6 » : le chiffre qui
 *   partage la touche), `'colonne'` et `'rangee'`. Pour la colonne, c'est
 *   l'index de la **réglette numérotée de 1 à 10** qui descend, jamais le label
 *   de la touche du dessus : le `p` est en colonne 10 alors que la touche
 *   au-dessus porte `0`. La primitive refuse d'afficher un nombre différent de
 *   celui qu'annonce l'arithmétique — c'est le contrôle croisé qui empêche
 *   `tables/claviers.js` et la géométrie du moteur visuel de diverger.
 *   Une op `keyboard` anime la caméra : on en émet **une par step**, donc un
 *   step par jeton.
 */

import {
  A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6, NOM_LETTRE_FR,
  VOYELLES, sansAccents, estLettre, valeur as valeurTable,
} from '../tables/alphabet.js';
import { SCRABBLE_FR, SCRABBLE_EN, T9, morseSignaux, morseTraits } from '../tables/jeux.js';
import {
  segmentsDe, compteSegments, compteTraitsFusionnes, MENTION_SEG7, SEG7_APPROXIMATIONS,
} from '../tables/seg7.js';
import {
  AZERTY, QWERTY, colonne, rangee, chiffreDeTouche, CHIFFRE_DE_TOUCHE, NOTE_AFNOR,
} from '../tables/claviers.js';
import { mesure as mesureGlyphe } from '../tables/derivees.js';
import { GLYPHES } from '../tables/glyphes.js';
import { valeurHebreu, valeurGrec, NOTE_SOURCAGE } from '../tables/ecritures.js';
import { decouperMots } from './filtres.js';
import { def, etape, token, fusion, nomsTokens, nomToken, enchainer } from './commun.js';
import { bilingue, dire } from '../i18n.js';

const pli = (c) => sansAccents(String(c)).toUpperCase();
const estVoyelle = (c) => VOYELLES.includes(pli(c));

// Libellés dont `steps()` a besoin avant que `def()` ait figé l'opérateur.
const LIB_REDUIRE_CHAQUE = bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit');
const LIB_ZEROS = bilingue('On retire les zéros', 'Drop the zeros');
const REG_ZEROS = bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum');

/** Paliers d'une réduction théosophique : 199 → [19, 10, 1]. */
function paliersReduction(depart, arrivee) {
  const out = [];
  let v = Math.abs(depart);
  for (let garde = 0; garde < 12 && v !== arrivee; garde++) {
    const suivant = [...String(v)].reduce((a, d) => a + Number(d), 0);
    if (suivant === v) break;
    out.push(suivant);
    v = suivant;
  }
  return out;
}

/** Un mappeur lettre à lettre : `null` dès qu'un jeton n'est pas une lettre seule. */
function parLettre(fn) {
  return (valeur, traces) => {
    const out = [];
    for (const tok of valeur) {
      const chars = [...String(tok)];
      if (chars.length !== 1) return null;
      const v = fn(chars[0]);
      if (v === null || v === undefined || !Number.isFinite(v)) return null;
      out.push(v);
    }
    if (!out.length) return null;
    return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
  };
}

/**
 * Étape d'un mappeur : chaque jeton devient son nombre.
 *
 * Les primitives dédiées travaillent **jeton par jeton** — `target`, pas
 * `pairs` : une op par lettre, pas une op pour toute la ligne.
 *
 * `sevenSeg` et `countStrokes` MONTRENT le comptage au-dessus de chaque lettre
 * sans rien remplacer : la substitution des lettres par leurs nombres vient dans
 * un SECOND step, sinon les deux animeraient l'opacité des mêmes tokens en même
 * temps.
 *
 * `keyboard` émet **un step par jeton** : chaque op anime la caméra (recul,
 * recentrage, retour), et deux claviers dans un même step se contrediraient —
 * `src/visuel/scenario.js` le refuse statiquement.
 */
function etapeMappeur(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, apres.valeur.length);
    const carDe = (i) => [...String(avant.valeur[i] ?? '')][0] || '';
    // `pli` = sans accent, en capitale — exactement le pliage qu'applique
    // `apply()`. Sans lui, « é » chercherait un glyphe « É » qui n'existe pas.
    const pliCar = (i) => pli(carDe(i));
    const substitution = {
      op: 'substitute',
      stagger: 90,
      pairs: apres.valeur.map((n, i) => ({ target: ctx.ids[i], to: token(sortie[i], n, 'number') })),
    };

    if (spec.geste === 'sevenSeg' || spec.geste === 'countStrokes') {
      // Les deux primitives MONTRENT le comptage au-dessus de la lettre sans
      // rien remplacer : la substitution vient dans un SECOND step, sinon les
      // deux animeraient l'opacité des mêmes tokens en même temps.
      //
      // `count` est le contrôle croisé exigé par CONTRACTS §0.3 : le moteur
      // visuel refuse d'allumer, de tracer ou de pointer un nombre différent de
      // celui qu'annonce l'arithmétique. Il redérive le compte du tracé qu'il
      // dessine — les deux viennent de `tables/glyphes.js`, donc ce que le
      // spectateur voit est littéralement ce qui a été compté.
      const montrer = apres.valeur.map((n, i) => (spec.geste === 'sevenSeg'
        ? {
          op: 'sevenSeg',
          target: ctx.ids[i],
          segments: segmentsDe(pliCar(i)) || '',
          // L'afficheur 7 segments connaît aussi les CHIFFRES, la table
          // vectorielle non (52 glyphes, les lettres). Un chiffre n'a donc pas
          // de tracé de référence à montrer — et n'en a pas besoin : il est
          // déjà la forme que l'afficheur va dessiner.
          glyph: GLYPHES[pliCar(i)] ? pliCar(i) : '',
          fusion: spec.mode === 'fusion',
          count: n,
        }
        : {
          op: 'countStrokes',
          target: ctx.ids[i],
          mode: spec.metrique,
          // Même pliage que `apply()` (`pli`, puis la casse de la méthode) :
          // c'est le glyphe COMPTÉ qui doit être le glyphe DESSINÉ.
          glyph: spec.casse === 'maj' ? pliCar(i) : pliCar(i).toLowerCase(),
          count: n,
        }));
      return [
        etape(ctx, dire(spec.libelle, ctx.langue), dire(spec.regle, ctx.langue), montrer, { id: `s_${ctx.cle}_0` }),
        etape(ctx, dire(spec.libelle, ctx.langue), `${avant.valeur.join(', ')} → ${apres.valeur.join(', ')}`,
          [substitution], { id: `s_${ctx.cle}_1` }),
      ];
    }

    if (spec.geste === 'keyboard') {
      const mesure = spec.mesureClavier || 'touche';
      const disposition = spec.disposition === 'qwerty' ? 'qwerty' : 'azerty';
      const rangees = disposition === 'qwerty' ? QWERTY : AZERTY;
      // Le pliage doit être celui d'`apply()` : la mesure « touche » lit le
      // caractère TEL QUEL (« - », « è »), les deux autres le replient sur sa
      // lettre (« É » → « e »), comme `colonne()` et `rangee()` le font.
      const toucheDe = (i) => (mesure === 'touche'
        ? carDe(i).toLowerCase()
        : pliCar(i).toLowerCase());
      // Filtre en amont, sur les tables du moteur : le jeu de caractères du
      // clavier est connu ici, il n'a pas à être découvert à la compilation.
      const surLeClavier = (c) => (mesure === 'touche'
        ? chiffreDeTouche(c) !== null
        : colonne(c, rangees) !== null);

      if (apres.valeur.every((_, i) => surLeClavier(toucheDe(i)))) {
        // Un step par jeton : chaque `keyboard` anime la caméra, et deux
        // claviers dans un même step se contrediraient.
        return apres.valeur.map((n, i) => etape(
          ctx,
          dire(spec.libelle, ctx.langue),
          `${dire(spec.regle, ctx.langue)} : ${toucheDe(i)} → ${n}`,
          [{
            op: 'keyboard',
            target: ctx.ids[i],
            key: toucheDe(i),
            layout: disposition,
            mesure,
            to: token(sortie[i], n, 'number'),
          }],
          { id: `s_${ctx.cle}_${i}` },
        ));
      }
      // Repli : une touche hors du clavier modélisé. On n'affirme rien qu'on ne
      // sait pas montrer — on substitue, sans clavier.
    }

    const regle = dire(spec.regle, ctx.langue);
    const legende = spec.geste ? `${regle} — ${apres.valeur.join(', ')}` : regle;
    return [etape(ctx, dire(spec.libelle, ctx.langue), legende, [substitution])];
  };
}

/**
 * Étape d'une mesure : toute la chaîne devient un nombre.
 * On encadre, les lettres se ramassent, il reste un nombre — les trois gestes
 * sont ENCHAÎNÉS, chacun recalculant le layout à son tour.
 */
function etapeMesure(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    return [etape(ctx, dire(spec.libelle, ctx.langue), `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, enchainer([
      ctx.ids.length > 1 ? { op: 'group', targets: ctx.ids } : null,
      ctx.ids.length > 1 ? { op: 'drop', targets: ctx.ids.slice(1), stagger: 20 } : null,
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') }] },
    ]))];
  };
}

/** Fabrique une mesure `STR → NUM`. */
const mesureStr = (spec) => def({
  ...spec,
  famille: 'mesure',
  from: 'STR',
  to: 'NUM',
  apply: (valeur, traces) => {
    const n = spec.compte(valeur);
    if (n === null || !Number.isFinite(n)) return null;
    return { valeur: n, traces: [fusion(traces)] };
  },
  steps: etapeMesure(spec),
});

const lettres = (s) => [...s].filter(estLettre);

const MESURES = [
  {
    id: 'n.longueur', code: 'n1',
    libelle: bilingue('On compte les lettres', 'Count the letters'),
    regle: bilingue('Le nombre de lettres du mot', 'How many letters the word has'),
    notoriete: 1.00,
    compte: (s) => lettres(s).length || null,
  },
  {
    id: 'n.voyelles', code: 'n2',
    libelle: bilingue('On compte les voyelles', 'Count the vowels'),
    regle: bilingue('A, E, I, O, U', 'A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter(estVoyelle).length || null,
  },
  {
    id: 'n.consonnes', code: 'n3',
    libelle: bilingue('On compte les consonnes', 'Count the consonants'),
    regle: bilingue('Toutes les lettres sauf A, E, I, O, U', 'Every letter but A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter((c) => !estVoyelle(c)).length || null,
  },
  {
    id: 'n.lettresDistinctes', code: 'n4',
    libelle: bilingue('On compte les lettres distinctes', 'Count the distinct letters'),
    regle: bilingue('Une lettre répétée ne compte qu’une fois', 'A repeated letter counts only once'),
    notoriete: 0.70,
    compte: (s) => new Set(lettres(s).map(pli)).size || null,
  },
  {
    id: 'n.separateurs', code: 'n5',
    libelle: bilingue('On compte les séparateurs', 'Count the separators'),
    regle: bilingue('Les tirets, points et barres', 'Dashes, dots and slashes'),
    notoriete: 0.65,
    compte: (s) => [...s].filter((c) => /[-._/]/.test(c)).length || null,
  },
  {
    id: 'n.mots', code: 'n6',
    libelle: bilingue('On compte les mots', 'Count the words'),
    regle: bilingue('Ce que séparent les tirets, points et barres',
      'Whatever the dashes, dots and slashes set apart'),
    notoriete: 0.80,
    compte: (s) => decouperMots(s).length || null,
  },
  {
    id: 'n.lettresPlusVoyelles', code: 'n7',
    libelle: bilingue('Les lettres, plus les voyelles', 'The letters, plus the vowels'),
    regle: bilingue('Nombre de lettres + nombre de voyelles', 'Letter count + vowel count'),
    notoriete: 0.60, adHoc: 0.1,
    compte: (s) => {
      const l = lettres(s);
      return l.length ? l.length + l.filter(estVoyelle).length : null;
    },
  },
  {
    id: 'n.lettresPlusConsonnes', code: 'n8',
    libelle: bilingue('Les lettres, plus les consonnes', 'The letters, plus the consonants'),
    regle: bilingue('Nombre de lettres + nombre de consonnes', 'Letter count + consonant count'),
    notoriete: 0.60, adHoc: 0.1,
    note: bilingue(
      'Cousine de la précédente : sur un mot dont voyelles et consonnes '
      + 's’équilibrent, les deux tombent juste en même temps.',
      'A close cousin of the previous one: on a word where vowels and consonants '
      + 'balance out, the two land on the same number at the same time.',
    ),
    compte: (s) => {
      const l = lettres(s);
      return l.length ? l.length + l.filter((c) => !estVoyelle(c)).length : null;
    },
  },
].map(mesureStr);

const MAPPEURS_LETTRE = [
  {
    id: 'm.a1z26', code: 'm1',
    libelle: bilingue('Chaque lettre vaut son rang dans l’alphabet',
      'Each letter is worth its alphabetical rank'),
    regle: bilingue('A=1, B=2, … Z=26', 'A=1, B=2, … Z=26'),
    notoriete: 1.00,
    fn: (c) => valeurTable(A1Z26, pli(c)),
  },
  {
    id: 'm.z26a1', code: 'm2',
    libelle: bilingue('Chaque lettre vaut son rang inversé',
      'Each letter is worth its reversed alphabetical rank'),
    regle: bilingue('A=26, B=25, … Z=1', 'A=26, B=25, … Z=1'),
    notoriete: 0.45,
    fn: (c) => valeurTable(Z26A1, pli(c)),
  },
  {
    id: 'm.pythagore', code: 'm3',
    libelle: bilingue('Numérologie pythagoricienne', 'Pythagorean numerology'),
    regle: bilingue('Le rang réduit à un chiffre : 1 à 9, cycliquement',
      'The rank cut down to one digit: 1 to 9, over and over'),
    notoriete: 0.80,
    fn: (c) => valeurTable(PYTHAGORE, pli(c)),
  },
  {
    id: 'm.chaldeen', code: 'm4',
    libelle: bilingue('Numérologie chaldéenne', 'Chaldean numerology'),
    regle: bilingue('Table chaldéenne traditionnelle — elle ignore le 9',
      'The traditional Chaldean table — it leaves out the 9'),
    notoriete: 0.55,
    fn: (c) => valeurTable(CHALDEEN, pli(c)),
  },
  {
    id: 'm.englishX6', code: 'm5',
    libelle: bilingue('Gématrie anglaise (× 6)', 'English gematria (× 6)'),
    regle: bilingue('Le rang multiplié par six : A=6, B=12, … Z=156',
      'The rank times six: A=6, B=12, … Z=156'),
    notoriete: 0.30, adHoc: 0.15,
    fn: (c) => valeurTable(ENGLISH_X6, pli(c)),
  },
  {
    id: 'm.scrabbleFR', code: 'm6',
    libelle: bilingue('Points du Scrabble français', 'French Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition française',
      'The tile values of the game, French edition'),
    notoriete: 0.75,
    fn: (c) => valeurTable(SCRABBLE_FR, pli(c)),
  },
  {
    id: 'm.scrabbleEN', code: 'm7',
    libelle: bilingue('Points du Scrabble anglais', 'English Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition anglaise',
      'The tile values of the game, English edition'),
    notoriete: 0.70,
    fn: (c) => valeurTable(SCRABBLE_EN, pli(c)),
  },
  {
    id: 'm.t9', code: 'm8',
    libelle: bilingue('Touche du clavier téléphonique', 'Phone keypad key'),
    regle: bilingue('ABC=2, DEF=3, … WXYZ=9 (norme ITU E.161)',
      'ABC=2, DEF=3, … WXYZ=9 (ITU E.161 standard)'),
    notoriete: 0.70,
    fn: (c) => valeurTable(T9, pli(c)),
  },
  {
    id: 'm.morseSignaux', code: 'm9',
    libelle: bilingue('Signaux du morse', 'Morse signals'),
    regle: bilingue('Le nombre de points et de traits de la lettre',
      'How many dots and dashes the letter takes'),
    notoriete: 0.60,
    fn: (c) => morseSignaux(pli(c)),
  },
  {
    id: 'm.morseTraits', code: 'ma',
    libelle: bilingue('Traits du morse', 'Morse dashes'),
    regle: bilingue('Les traits seuls, sans les points', 'The dashes alone, dots not counted'),
    notoriete: 0.35, adHoc: 0.15,
    fn: (c) => morseTraits(pli(c)),
  },
  {
    id: 'm.asciiMaj', code: 'mb',
    libelle: bilingue('Code ASCII de la capitale', 'ASCII code of the capital'),
    regle: bilingue('A=65, B=66, … Z=90', 'A=65, B=66, … Z=90'),
    notoriete: 0.45,
    fn: (c) => (estLettre(pli(c)) ? pli(c).charCodeAt(0) : null),
  },
  {
    id: 'm.asciiMin', code: 'mc',
    libelle: bilingue('Code ASCII du bas de casse', 'ASCII code of the lower-case letter'),
    regle: bilingue('a=97, b=98, … z=122', 'a=97, b=98, … z=122'),
    notoriete: 0.45,
    fn: (c) => (estLettre(pli(c)) ? pli(c).toLowerCase().charCodeAt(0) : null),
  },
  {
    id: 'm.seg7', code: 'md',
    libelle: bilingue('Segments allumés sur un afficheur', 'Segments lit on a display'),
    regle: bilingue('Le nombre de segments d’un afficheur 7 segments',
      'How many segments light up on a seven-segment display'),
    notoriete: 0.55,
    note: MENTION_SEG7, geste: 'sevenSeg', mode: 'segments',
    fn: (c) => compteSegments(pli(c)),
  },
  {
    id: 'm.seg7Fusion', code: 'me',
    libelle: bilingue('Traits continus de l’afficheur', 'Continuous strokes on the display'),
    regle: bilingue('On fusionne les segments alignés qui se touchent, puis on compte les traits',
      'Merge the aligned segments that touch, then count the strokes that remain'),
    notoriete: 0.50, note: MENTION_SEG7, geste: 'sevenSeg', mode: 'fusion',
    fn: (c) => compteTraitsFusionnes(pli(c)),
  },
  {
    id: 'm.traitsMaj', code: 'mf',
    libelle: bilingue('Traits de crayon, en capitale', 'Pen strokes, in capitals'),
    regle: bilingue('Le nombre de levées de stylo pour tracer la capitale',
      'How many times the pen goes down to draw the capital'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'traits', casse: 'maj',
    fn: (c) => mesureGlyphe('traits', 'maj', pli(c)),
  },
  {
    id: 'm.traitsMin', code: 'mg',
    libelle: bilingue('Traits de crayon, en bas de casse', 'Pen strokes, in lower case'),
    regle: bilingue('Le nombre de levées de stylo pour tracer la minuscule',
      'How many times the pen goes down to draw the small letter'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'traits', casse: 'min',
    fn: (c) => mesureGlyphe('traits', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.extremitesMaj', code: 'mh',
    libelle: bilingue('Extrémités libres, en capitale', 'Free ends, in capitals'),
    regle: bilingue('Les bouts de trait qui ne rejoignent rien', 'The stroke ends that meet nothing'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'extremites', casse: 'maj',
    fn: (c) => mesureGlyphe('extremites', 'maj', pli(c)),
  },
  {
    id: 'm.extremitesMin', code: 'mi',
    libelle: bilingue('Extrémités libres, en bas de casse', 'Free ends, in lower case'),
    regle: bilingue('Les bouts de trait qui ne rejoignent rien', 'The stroke ends that meet nothing'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'extremites', casse: 'min',
    fn: (c) => mesureGlyphe('extremites', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.bouclesMaj', code: 'mj',
    libelle: bilingue('Boucles fermées, en capitale', 'Closed loops, in capitals'),
    regle: bilingue('Les trous du glyphe', 'The holes in the glyph'),
    notoriete: 0.50,
    geste: 'countStrokes', metrique: 'boucles', casse: 'maj',
    fn: (c) => mesureGlyphe('boucles', 'maj', pli(c)),
  },
  {
    id: 'm.bouclesMin', code: 'mk',
    libelle: bilingue('Boucles fermées, en bas de casse', 'Closed loops, in lower case'),
    regle: bilingue('a, b, d, e, g, o, p, q valent 1, les autres 0',
      'a, b, d, e, g, o, p, q are worth 1, the rest 0'),
    notoriete: 0.50,
    geste: 'countStrokes', metrique: 'boucles', casse: 'min',
    fn: (c) => mesureGlyphe('boucles', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.azertyColonne', code: 'ml',
    libelle: bilingue('Colonne de la touche, en AZERTY', 'Key column, on a French AZERTY'),
    regle: bilingue('Le rang de la touche dans sa rangée — donc le chiffre juste au-dessus',
      'Where the key sits in its row — hence the digit right above it'),
    notoriete: 0.30, note: NOTE_AFNOR, geste: 'keyboard', disposition: 'azerty', mesureClavier: 'colonne',
    fn: (c) => colonne(pli(c), AZERTY),
  },
  {
    id: 'm.azertyRangee', code: 'mm',
    libelle: bilingue('Rangée de la touche, en AZERTY', 'Key row, on a French AZERTY'),
    regle: bilingue('1 en haut, 2 au milieu, 3 en bas', '1 at the top, 2 in the middle, 3 at the bottom'),
    notoriete: 0.20, adHoc: 0.2,
    note: NOTE_AFNOR, geste: 'keyboard', disposition: 'azerty', mesureClavier: 'rangee',
    fn: (c) => rangee(pli(c), AZERTY),
  },
  {
    id: 'm.qwertyColonne', code: 'mn',
    libelle: bilingue('Colonne de la touche, en QWERTY', 'Key column, on a US QWERTY'),
    regle: bilingue('Le rang de la touche dans sa rangée, sur un clavier américain',
      'Where the key sits in its row, on a US keyboard'),
    notoriete: 0.30, geste: 'keyboard', disposition: 'qwerty', mesureClavier: 'colonne',
    fn: (c) => colonne(pli(c), QWERTY),
  },
  {
    id: 'm.qwertyRangee', code: 'mo',
    libelle: bilingue('Rangée de la touche, en QWERTY', 'Key row, on a US QWERTY'),
    regle: bilingue('1 en haut, 2 au milieu, 3 en bas', '1 at the top, 2 in the middle, 3 at the bottom'),
    notoriete: 0.20, adHoc: 0.2,
    geste: 'keyboard', disposition: 'qwerty', mesureClavier: 'rangee',
    fn: (c) => rangee(pli(c), QWERTY),
  },
  {
    id: 'm.hebreu', code: 'mp',
    libelle: bilingue('Gématrie hébraïque', 'Hebrew gematria'),
    regle: bilingue('On translittère en hébreu, puis on lit la valeur des lettres',
      'Transliterate into Hebrew, then read off the value of each letter'),
    notoriete: 0.55,
    note: NOTE_SOURCAGE,
    fn: (c) => valeurHebreu(pli(c)),
  },
  {
    id: 'm.grec', code: 'mq',
    libelle: bilingue('Isopséphie grecque', 'Greek isopsephy'),
    regle: bilingue('On translittère en grec, puis on lit la valeur des lettres',
      'Transliterate into Greek, then read off the value of each letter'),
    notoriete: 0.55,
    note: NOTE_SOURCAGE,
    fn: (c) => valeurGrec(pli(c)),
  },
  {
    id: 'm.longueurNom', code: 'mr',
    libelle: bilingue('Longueur du nom de la lettre', 'Length of the letter’s French name'),
    regle: bilingue('On épelle : « effe » vaut 4, « double vé » vaut 8',
      'Spell it out in French: "effe" is 4 letters, "double vé" is 8'),
    // La table des noms de lettres est FRANÇAISE (`NOM_LETTRE_FR`) : la méthode
    // reste française quelle que soit la langue de l'interface. On le dit.
    note: bilingue(
      'Les noms de lettres employés sont les noms français : « effe », « double vé », « i grec ».',
      'The letter names used here are the French ones — "effe", "double vé", "i grec" — '
      + 'not the English "ef", "double-u", "why". The method is French, and stays French.',
    ),
    notoriete: 0.15, adHoc: 0.25,
    fn: (c) => {
      const nom = NOM_LETTRE_FR[pli(c)];
      return nom ? [...sansAccents(nom)].filter(estLettre).length : null;
    },
  },
].map((spec) => {
  const { fn, geste, mode, metrique, casse, disposition, mesureClavier, ...reste } = spec;
  const base = { ...reste, geste, mode, metrique, casse, disposition, mesureClavier };
  return def({
    ...reste,
    famille: 'mappeur',
    from: 'TOKENS',
    to: 'NUMS',
    apply: parLettre(fn),
    steps: etapeMappeur(base),
  });
});

const AUTRES_MAPPEURS = [
  def({
    id: 'm.longueurToken', code: 'ms', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Chaque mot vaut son nombre de lettres', 'Each word is worth its letter count'),
    regle: bilingue('On compte les lettres de chaque jeton', 'Count the letters of every token'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const out = valeur.map((tok) => [...String(tok)].filter(estLettre).length);
      if (!out.length || out.some((n) => n === 0)) return null;
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    steps: etapeMappeur({
      libelle: bilingue('Chaque mot vaut son nombre de lettres', 'Each word is worth its letter count'),
      regle: bilingue('On compte les lettres de chaque jeton', 'Count the letters of every token'),
    }),
  }),
  def({
    id: 'm.reduireChaque', code: 'mt', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit'),
    regle: bilingue('Réduction théosophique, nombre par nombre',
      'Theosophical reduction, one number at a time'),
    notoriete: 0.65,
    apply: (valeur, traces) => {
      const racine = (n) => (n === 0 ? 0 : 1 + ((Math.abs(n) - 1) % 9));
      const out = valeur.map(racine);
      if (out.every((v, i) => v === valeur[i])) return null;
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // La sortie n'invente d'identifiant que pour les nombres qui CHANGENT :
    // un nombre déjà réduit garde le sien, et aucun step ne le touche.
    sortie: (avant, apres, ctx) => apres.valeur.map((v, i) => (v === avant.valeur[i]
      ? ctx.ids[i] : nomToken(ctx, i))),
    /**
     * Un `reduce` par PALIER et un step par palier (research visuel §4.8) : le
     * moteur visuel ne boucle jamais tout seul, et `reduce` refuse d'afficher
     * une somme de chiffres qui ne tombe pas sur son résultat — 199 passe donc
     * par 19 puis 10, jamais d'un bond.
     */
    steps: (avant, apres, ctx) => {
      const steps = [];
      apres.valeur.forEach((cible, i) => {
        if (cible === avant.valeur[i]) return;
        const suite = paliersReduction(avant.valeur[i], cible);
        let source = ctx.ids[i];
        let texte = String(Math.abs(avant.valeur[i]));
        suite.forEach((v, k) => {
          const dernier = k === suite.length - 1;
          const cibleId = dernier ? nomToken(ctx, i) : `${ctx.cle}_${i}r${k}`;
          steps.push(etape(ctx, dire(LIB_REDUIRE_CHAQUE, ctx.langue), `${texte} → ${[...texte].join(' + ')} → ${v}`, [{
            op: 'reduce',
            target: source,
            digits: [...texte].map((d, j) => token(`${ctx.cle}_${i}d${k}x${j}`, d, 'digit')),
            to: token(cibleId, v, 'number'),
          }], { id: `s_${ctx.cle}_${i}_${k}` }));
          source = cibleId;
          texte = String(v);
        });
      });
      return steps;
    },
  }),
  def({
    id: 'm.retirerZeros', code: 'mu', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: bilingue('On retire les zéros', 'Drop the zeros'),
    regle: bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum'),
    notoriete: 0.35, adHoc: 0.2, commute: true,
    apply: (valeur, traces) => {
      const gardes = [];
      valeur.forEach((v, i) => { if (v !== 0) gardes.push(i); });
      if (!gardes.length || gardes.length === valeur.length) return null;
      return { valeur: gardes.map((i) => valeur[i]), traces: gardes.map((i) => traces[i] || []) };
    },
    sortie: (avant, apres, ctx) => ctx.ids.filter((_, i) => avant.valeur[i] !== 0),
    // `drop` resserre déjà les survivants : un `move` de plus animerait
    // « translate » une seconde fois sur les mêmes tokens.
    steps: (avant, apres, ctx) => [etape(ctx, dire(LIB_ZEROS, ctx.langue), dire(REG_ZEROS, ctx.langue), enchainer([
      { op: 'drop', targets: ctx.ids.filter((_, i) => avant.valeur[i] === 0), stagger: 40 },
      { op: 'highlight', targets: ctx.ids.filter((_, i) => avant.valeur[i] !== 0), mode: 'select' },
    ]))],
  }),
  // ★ « Le tiret du 6 » — méthode 6 du README, enfin atteignable.
  //
  // Le registre des codes est append-only (CONTRACTS §4.1) : `mu` était le
  // dernier alloué, celui-ci prend `mv`. Il n'existait AUCUN opérateur capable
  // de rendre 6 sur les deux tirets de `hope-hope-hope` — la table
  // `TIRET_DU_SIX` existait, mais personne ne l'exploitait, et `m.azertyColonne`
  // cherche dans les rangées de LETTRES : la colonne d'un « - » y vaut `null`.
  def({
    id: 'm.toucheChiffre', code: 'mv', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Le chiffre qui partage la touche',
      'The digit that shares the same key'),
    regle: bilingue(
      'Sur un AZERTY, le tiret est sur la touche du 6 — et de même & = 1, é = 2, " = 3, '
      + "' = 4, ( = 5, è = 7, _ = 8, ç = 9, à = 0",
      'On a French AZERTY the dash sits on the 6 key — and likewise & = 1, é = 2, " = 3, '
      + "' = 4, ( = 5, è = 7, _ = 8, ç = 9, à = 0",
    ),
    notoriete: 0.75, adHoc: 0.05,
    note: NOTE_AFNOR,
    apply: parLettre(chiffreDeTouche),
    steps: etapeMappeur({
      libelle: bilingue('Le chiffre qui partage la touche',
        'The digit that shares the same key'),
      regle: bilingue('Le tiret du 6, et ses neuf voisines de la rangée du haut',
        'The dash on the 6 — and its nine neighbours on the top row'),
      geste: 'keyboard', disposition: 'azerty', mesureClavier: 'touche',
    }),
  }),
];

/** Les dix caractères que « le tiret du 6 » sait convertir — exposé pour l'UI. */
export const TOUCHES_CHIFFREES = Object.freeze(Object.keys(CHIFFRE_DE_TOUCHE));

/** Approximations 7 segments assumées — exposé pour l'UI (CONTRACTS §0.4). */
export { SEG7_APPROXIMATIONS };

export const MESURES_STR = Object.freeze(MESURES);
export const MAPPEURS = Object.freeze([...MAPPEURS_LETTRE, ...AUTRES_MAPPEURS]);
