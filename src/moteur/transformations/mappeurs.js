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
 * - **`sevenSeg`** (`md`, `me`), **`fourteenSeg`** (`mw`, `mx`) et
 *   **`countStrokes`** (`mf`…`mk` — traits,
 *   extrémités, boucles) partagent une seule grammaire (`src/visuel/primitives/
 *   encart.js`), et l'émission est la même : **un step par jeton**. La lettre
 *   monte dans un encart, y change de police (l'afficheur sept segments, ou son
 *   propre tracé de crayon), un compteur paraît, les segments — ou les traits,
 *   les pointes, les boucles — s'allument **un par un** en faisant monter le
 *   compteur, et le nombre du compteur redescend remplacer la lettre.
 *   C'est l'exigence de CONTRACTS §0.3 : « ce que le spectateur voit à l'écran
 *   est, littéralement, ce qui a été compté ». Les tables de comptage
 *   (`tables/derivees.js`) et le tracé animé sortent du même
 *   `tables/glyphes.js`, et `count` fait échouer la compilation s'ils
 *   divergeaient.
 * - **`table`** (`m1`…`m9`, `ma`…`mc`, `mp`, `mq`, `mr`) : **la table de
 *   correspondance, MONTRÉE**. Une conversion par table n'est vérifiable que si
 *   la table est sous les yeux — « P = 7 » est une affirmation tant qu'on n'a
 *   pas vu la colonne du 7. La table paraît sous la ligne, la case s'allume, la
 *   lettre y vole, la valeur en redescend. Le geste ne change jamais ; seule la
 *   MISE EN PAGE varie, et elle est une option (`forme`), pas une primitive de
 *   plus : `reglette` (**une case = une lettre + un nombre**, dans l'ordre
 *   alphabétique — c'est le cas de TOUTES les tables) et `pave` (les touches à
 *   leur place sur le téléphone : T9). ★ **Seul le clavier téléphonique a
 *   plusieurs lettres pour un chiffre** : c'est la réalité de l'objet, pas une
 *   commodité de mise en page. Une case porte jusqu'à trois lignes — le
 *   glyphe, l'INTERMÉDIAIRE quand il en existe un (le code morse, la lettre
 *   hébraïque, le nom français), et la valeur : « H → ···· → 4 » se compte,
 *   « H → 4 » se croit.
 *
 *   Deux options de réglette DÉMONTRENT quelque chose et ne décorent rien :
 *   `cycle` casse la ligne là où la table recommence (la pythagoricienne y
 *   aligne `A J S` = 1, `B K T` = 2 : la règle se voit), et `teinte` fonce le
 *   fond de case avec la valeur (le Scrabble), sans jamais porter seule
 *   l'information, qui reste écrite dans la case.
 *
 *   ★ Contrôle croisé. La table qui voyage dans l'op est **dérivée de `fn`**,
 *   la fonction même qu'`apply()` applique (`tableDe`) : la table montrée et la
 *   table employée sont une seule source. La primitive refuse en outre de faire
 *   redescendre une valeur qui n'est pas dans la case qu'elle dessine, et le
 *   pont recoupe une troisième fois. Seul l'alphabet garde un oracle
 *   INDÉPENDANT (`ordre`) : le moteur visuel y recalcule le rang au lieu de
 *   nous croire.
 *
 *   ★ UN ALLER-RETOUR PAR LETTRE, complet : la lettre monte, sa valeur
 *   redescend aussitôt à sa place, puis la suivante. Un step par lettre —
 *   grouper les départs puis les retours ferait perdre quelle lettre a donné
 *   quel nombre. Ce qui se mutualise, c'est le DÉCOR : `montre` sur la
 *   première, `retire` sur la dernière, et la table reste montée entre les
 *   deux (l'assemblage l'étend même aux transformations d'affilée qui
 *   emploient la même table — `src/recherche/scenario.js`).
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
  VOYELLES, sansAccents, estLettre, valeur as valeurTable, LETTRES,
} from '../tables/alphabet.js';
import { SCRABBLE_FR, SCRABBLE_EN, T9, MORSE, morseSignaux, morseTraits } from '../tables/jeux.js';
import {
  segmentsDe, compteSegments, compteTraitsFusionnes, MENTION_SEG7, SEG7_APPROXIMATIONS,
} from '../tables/seg7.js';
import {
  segments14De, compteSegments14, compteTraitsFusionnes14, MENTION_SEG14,
} from '../tables/seg14.js';
import {
  AZERTY, QWERTY, colonne, rangee, chiffreDeTouche, CHIFFRE_DE_TOUCHE, NOTE_AFNOR,
} from '../tables/claviers.js';
import { mesure as mesureGlyphe } from '../tables/derivees.js';
import { GLYPHES } from '../tables/glyphes.js';
import {
  valeurHebreu, valeurGrec, NOTE_SOURCAGE, TRANSLIT_HEBREU, TRANSLIT_GREC,
} from '../tables/ecritures.js';
import { decouperMots } from './filtres.js';
import { def, etape, token, fusion, nomsTokens, nomToken, enchainer, retirerAccolade } from './commun.js';
import { opComptage } from './combinateurs.js';
import { bilingue, dire } from '../i18n.js';

const pli = (c) => sansAccents(String(c)).toUpperCase();
const estVoyelle = (c) => VOYELLES.includes(pli(c));

// Libellés dont `steps()` a besoin avant que `def()` ait figé l'opérateur.
const LIB_REDUIRE_CHAQUE = bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit');
const LIB_ZEROS = bilingue('On retire les zéros', 'Drop the zeros');
const REG_ZEROS = bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum');
const LIB_RETOURNER_9 = bilingue('On retourne les 9', 'Turn the 9s upside down');
const LIB_TROUVAILLE = bilingue(
  'Trois 6 d’affilée — le 666 était déjà écrit',
  'Three 6s in a row — the 666 was already written',
);

/** Longueur de la suite cherchée. 666 fait trois 6, ni deux, ni quatre. */
const SUITE = 3;

/**
 * L'index du premier 6 de la première suite de trois 6 CONTIGUS, ou −1.
 *
 * Source unique de `apply`, de `sortie` et de `steps` : les trois posent la
 * même question au même vecteur, donc aucune ne peut désigner d'autres jetons
 * que les deux autres (CONTRACTS §0.3, « ce qui est montré est ce qui est
 * compté »).
 *
 * « Contigus » se lit sur les INDEX du vecteur, sans exception ni tolérance :
 * `[6,6,7,6]` ne contient pas de 666, il contient trois 6 dont deux voisins.
 */
function debutDesTroisSix(valeur) {
  let court = 0;
  for (let i = 0; i < valeur.length; i++) {
    court = valeur[i] === 6 ? court + 1 : 0;
    if (court === SUITE) return i - (SUITE - 1);
  }
  return -1;
}


// ───────────────────────────────────────────────────────────────────────────
// La figure « sept segments » du Registre
// ───────────────────────────────────────────────────────────────────────────

/**
 * ★ Le Registre est l'équivalent accessible OBLIGATOIRE (CONTRACTS §6) : la
 * scène est `aria-hidden`, donc tout ce qui est montré doit s'y retrouver.
 *
 * Écrire « H → 3 » en typographie courante y perdait le sujet même de la
 * méthode : la question n'est pas « combien de lignes dans un H de Jost\* »,
 * c'est « combien de lignes dans le H d'une calculette ». Le Registre montre
 * donc la lettre SUR L'AFFICHEUR, lui aussi — en police sept segments
 * (`src/app/registre.js`, `--afficheur`), pas en dessin : un caractère reste
 * un caractère, lisible par un lecteur d'écran, sélectionnable, copiable,
 * agrandissable, sans équivalent textuel à écrire à la main.
 *
 * Le scénario reste du JSON pur (CONTRACTS §3, invariant 8) : il ne transporte
 * pas de rendu, seulement DE QUOI rendre — le glyphe, les segments allumés que
 * la scène va allumer, le compte, et `texte`, l'équivalent en une ligne pour
 * la région live et pour tout repli sans DOM.
 *
 * `segments` n'est pas décoratif : c'est la trace de ce que la SCÈNE allume,
 * conservée à côté du glyphe pour que les deux restent confrontables (voir la
 * réserve de fidélité notée dans `tables/seg7.js`).
 */
function figureSeg7(glyphe, segments, fusionne, valeur) {
  if (!segments) return null;
  return {
    type: 'seg7',
    glyphe,
    segments,
    fusion: fusionne,
    valeur,
    texte: `${glyphe} \u2192 ${valeur}`,
  };
}

/**
 * La même figure, pour l'afficheur **quatorze** segments.
 *
 * Une différence de fond avec `figureSeg7`, et elle est heureuse : la table
 * `SEG14` est DÉRIVÉE de DSEG14 Classic, la police même que Le Registre
 * affiche (voir l'en-tête de `tables/seg14.js`). Le glyphe montré et les
 * segments allumés par la scène sont donc le même dessin — il n'y a pas
 * d'« écart de police » à consigner, et le lecteur qui recompte les segments
 * du glyphe retombe sur le nombre annoncé juste à côté.
 *
 * `segments` voyage en TABLEAU : deux des quatorze noms de segments font deux
 * caractères (`g1`, `g2`), une chaîne les rendrait ambigus.
 */
function figureSeg14(glyphe, segments, fusionne, valeur) {
  if (!segments) return null;
  return {
    type: 'seg14',
    glyphe,
    segments: [...segments],
    fusion: fusionne,
    valeur,
    texte: `${glyphe} \u2192 ${valeur}`,
  };
}

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

/**
 * ★ La table de correspondance **dérivée de l'opérateur lui-même**.
 *
 * C'est le cœur du contrôle croisé exigé par CONTRACTS §0.3, appliqué aux
 * conversions par table : ce qui sera DESSINÉ n'est pas une seconde copie de
 * `PYTHAGORE`, de `SCRABBLE_FR` ou de `T9` — c'est `fn`, la fonction même que
 * `apply()` emploie, évaluée sur les vingt-six lettres. Une divergence entre la
 * table montrée et la table utilisée est donc **impossible par construction**,
 * exactement comme `tables/derivees.js` rend impossible qu'un compte de traits
 * diffère du tracé qu'on dessine.
 *
 * Le moteur visuel refuse en outre de faire redescendre une valeur qui ne
 * serait pas dans la case (`src/visuel/primitives/table.js`), et le pont la
 * recoupe une troisième fois (`src/recherche/scenario.js`).
 *
 * @param {(c:string)=>number|null} fn      la fonction de l'opérateur
 * @param {{noteDe?:Function, labelDe?:Function}} [opts]
 *        `noteDe` — l'intermédiaire à MONTRER quand il y en a un (le code
 *        morse, la lettre hébraïque, le nom français de la lettre) : sans lui,
 *        « H → 4 » resterait une affirmation même table à l'appui.
 * @returns {ReadonlyArray<{char:string,value:number,note?:string,label?:string}>}
 */
function tableDe(fn, opts = {}) {
  const out = [];
  for (const char of LETTRES) {
    const v = fn(char);
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const e = { char, value: v };
    const label = opts.labelDe ? opts.labelDe(char) : null;
    if (label && label !== char) e.label = label;
    const note = opts.noteDe ? opts.noteDe(char) : null;
    if (note) e.note = note;
    out.push(Object.freeze(e));
  }
  return Object.freeze(out);
}

/** Le morse, écrit comme il se lit : points ronds et traits longs, même compte. */
const morseLisible = (c) => {
  const m = MORSE[c];
  return m === undefined ? null : [...m].map((s) => (s === '-' ? '\u2013' : '\u00b7')).join('');
};

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

    const afficheur = spec.geste === 'sevenSeg' || spec.geste === 'fourteenSeg';
    if (afficheur || spec.geste === 'countStrokes') {
      // ★ UN STEP PAR JETON. Les trois primitives — sept segments, quatorze
      // segments, tracé de crayon — montent la lettre dans un
      // encart, l'y changent de police (afficheur, ou tracé de crayon), posent
      // un compteur, allument un élément à la fois — et c'est le nombre du
      // compteur qui, à la fin, redescend remplacer la lettre. Montrer quatre
      // lettres à la fois donnerait quatre chantiers simultanés : illisible.
      // Une chose à la fois, et tant pis pour la durée.
      //
      // `count` est le contrôle croisé exigé par CONTRACTS §0.3 : le moteur
      // visuel refuse d'allumer, de tracer ou de pointer un nombre différent de
      // celui qu'annonce l'arithmétique. Il redérive le compte du tracé qu'il
      // dessine — les deux viennent de `tables/glyphes.js`, donc ce que le
      // spectateur voit est littéralement ce qui a été compté.
      const montrer = (n, i) => {
        const to = token(sortie[i], n, 'number');
        if (spec.geste === 'fourteenSeg') {
          return {
            op: 'fourteenSeg',
            target: ctx.ids[i],
            // Un TABLEAU de noms : deux des quatorze segments s'écrivent sur
            // deux caractères (`g1`, `g2`), une chaîne les rendrait ambigus.
            segments: [...(segments14De(pliCar(i)) || [])],
            fusion: spec.mode === 'fusion',
            count: n,
            to,
          };
        }
        if (spec.geste === 'sevenSeg') {
          return {
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
            to,
          };
        }
        return {
          op: 'countStrokes',
          target: ctx.ids[i],
          mode: spec.metrique,
          // Même pliage que `apply()` (`pli`, puis la casse de la méthode) :
          // c'est le glyphe COMPTÉ qui doit être le glyphe DESSINÉ.
          glyph: spec.casse === 'maj' ? pliCar(i) : pliCar(i).toLowerCase(),
          count: n,
          to,
        };
      };
      return apres.valeur.map((n, i) => {
        // ★ Sur un afficheur, la lettre est MONTRÉE sur l'afficheur dans le
        // Registre aussi, pas seulement dans la scène (`figureSeg7`,
        // `figureSeg14`).
        // La règle y devient la question posée — « combien faut-il de lignes
        // droites pour former cette lettre ? » — et la réponse est la figure
        // elle-même : l'afficheur, une flèche, le nombre.
        let figure = null;
        if (spec.geste === 'sevenSeg') {
          figure = figureSeg7(pliCar(i), segmentsDe(pliCar(i)) || '', spec.mode === 'fusion', n);
        } else if (spec.geste === 'fourteenSeg') {
          figure = figureSeg14(pliCar(i), segments14De(pliCar(i)) || null, spec.mode === 'fusion', n);
        }
        return etape(
          ctx,
          dire(spec.libelle, ctx.langue),
          figure ? dire(spec.regle, ctx.langue) : `${dire(spec.regle, ctx.langue)} : ${carDe(i)} → ${n}`,
          [montrer(n, i)],
          figure ? { id: `s_${ctx.cle}_${i}`, figure } : { id: `s_${ctx.cle}_${i}` },
        );
      });
    }

    if (spec.geste === 'table') {
      // ★ LA TABLE EST MONTRÉE, PAS ANNONCÉE — et l'aller-retour est INDIVIDUEL.
      //
      // Une lettre monte vers la table, sa case s'allume, **sa valeur en
      // redescend aussitôt à sa place** — puis seulement la lettre suivante.
      // Faire partir les quatre lettres puis revenir les quatre nombres d'un
      // bloc fait gagner du temps et perdre la démonstration : on ne voit plus
      // quelle lettre a donné quel nombre, c'est-à-dire exactement ce qu'il
      // fallait montrer. Un step par lettre, donc, comme pour l'encart de
      // comptage et pour le clavier.
      //
      // ★ Ce qu'on mutualise, c'est le DÉCOR. `montre` sur la première lettre,
      // `retire` sur la dernière : entre les deux, la table **reste montée**
      // et la caméra ne rebouge pas. Le déploiement se paie une fois, les
      // allers-retours gardent chacun leur rythme plein.
      const cases = new Map((spec.table || []).map((e) => [e.char, e]));
      const lettreDe = (i) => pliCar(i);
      const montrable = cases.size > 0 && apres.valeur.every((n, i) => {
        const e = cases.get(lettreDe(i));
        return e !== undefined && String(e.value) === String(n);
      });
      if (montrable) {
        const dernier = apres.valeur.length - 1;
        return apres.valeur.map((n, i) => {
          const e = cases.get(lettreDe(i));
          // L'intermédiaire est MONTRÉ dans Le Registre comme dans la scène :
          // « H → ···· → 4 » se suit, « H → 4 » se croit. Et c'est le glyphe
          // de la case qui est cité, pas la clé : la méthode ASCII du bas de
          // casse se lit « h → 104 ».
          const glyphe = e.label || e.char;
          const detail = e.note ? `${glyphe} → ${e.note} → ${n}` : `${glyphe} → ${n}`;
          return etape(
            ctx,
            dire(spec.libelle, ctx.langue),
            `${dire(spec.regle, ctx.langue)} : ${detail}`,
            [{
              op: 'table',
              disposition: spec.forme || 'reglette',
              ...(spec.colonnes ? { colonnes: spec.colonnes } : {}),
              // Le retour à la ligne au cycle et la teinte par valeur ne sont
              // pas des ornements : ils MONTRENT la règle de la table. Ils
              // voyagent donc avec elle, et le moteur visuel les recoupe.
              ...(spec.cycle ? { cycle: true } : {}),
              ...(spec.teinte ? { teinte: spec.teinte } : {}),
              // `ordre` déclenche l'oracle indépendant du moteur visuel : pour
              // la seule réglette alphabétique, il recalcule le rang au lieu de
              // nous croire, et confronte notre table à la sienne.
              ...(spec.ordre ? { ordre: spec.ordre } : {}),
              entries: (spec.table || []).map((t) => ({ ...t })),
              target: ctx.ids[i],
              letter: lettreDe(i),
              to: token(sortie[i], n, 'number'),
              // Le décor : monté à la première, gardé au milieu, retiré à la
              // dernière. Une seule op de caméra à chaque bout.
              montre: i === 0,
              retire: i === dernier,
            }],
            { id: `s_${ctx.cle}_${i}` },
          );
        });
      }
      // Repli : un caractère hors de la table. On n'affirme rien qu'on ne sait
      // pas montrer — on substitue, sans table.
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
 * ★ Étape d'une mesure : un comptage SE COMPTE, caractère par caractère.
 *
 * Le geste précédent — on encadre, tout se ramasse d'un bloc, un nombre reste —
 * *affirmait* : rien n'y distinguait « on compte les lettres » de « on compte
 * les voyelles », et le nombre annoncé n'était jamais celui qu'on avait vu se
 * former. Désormais chaque caractère **compté** descend dans la pointe de
 * l'accolade et fait avancer le compteur d'un cran ; ce qui n'est pas compté
 * s'efface sur place, sans le faire bouger. C'est ce qui rend la règle visible
 * : sur `hope.fr`, le point ne compte pas, et on le voit ne pas compter.
 *
 * `cibles(valeur)` dit QUELS caractères comptent (par leur rang), `doubles`
 * ceux qui comptent **deux** fois — ils sont recopiés sur une ligne étiquetée
 * juste au-dessus, et l'on voit chaque voyelle passer deux fois dans
 * l'accolade. Sans cette ligne, « les lettres, plus les voyelles » resterait
 * une formule.
 *
 * Garde-fou d'émetteur : si le nombre de cibles (doublons compris) ne retombe
 * pas sur `compte(valeur)`, on n'émet pas le geste — le moteur visuel le
 * refuserait de toute façon (contrôle croisé), mais un échec de compilation se
 * produirait au clic de l'utilisateur. On retombe alors sur le geste sobre.
 */
function etapeMesure(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    const titre = dire(spec.libelle, ctx.langue);
    const to = token(sortie[0], apres.valeur, 'number');
    const compte = comptageDe(spec, avant.valeur, apres.valeur, ctx);
    if (compte) {
      return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`,
        [opComptage({ ...compte, symbole: '#', libelle: titre, to })], { hold: 400 })];
    }
    return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, retirerAccolade(enchainer([
      // Une mesure est un dénombrement : le symbole seul (`#`) serait cryptique,
      // l'accolade porte donc aussi la règle en toutes lettres.
      ctx.ids.length > 1
        ? { op: 'group', targets: ctx.ids, symbol: '#', label: titre }
        : null,
      ctx.ids.length > 1 ? { op: 'drop', targets: ctx.ids.slice(1), stagger: 20 } : null,
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to }] },
    ])))];
  };
}

/**
 * Ce que l'accolade comptera, ou `null` si la mesure ne sait pas le désigner
 * caractère par caractère (elle retombe alors sur le geste sobre).
 */
function comptageDe(spec, valeur, total, ctx) {
  if (typeof spec.cibles !== 'function' || ctx.ids.length < 2) return null;
  const rangs = spec.cibles(valeur);
  const rangsDoubles = typeof spec.doubles === 'function' ? spec.doubles(valeur) : [];
  const valide = (r) => Number.isInteger(r) && r >= 0 && r < ctx.ids.length;
  if (!Array.isArray(rangs) || !rangs.every(valide)) return null;
  if (!Array.isArray(rangsDoubles) || !rangsDoubles.every((r) => valide(r) && rangs.includes(r))) return null;
  // Contrôle croisé côté émetteur : ce qu'on va MONTRER doit faire le compte.
  if (rangs.length + rangsDoubles.length !== total) return null;
  const chars = [...valeur];
  return {
    ids: ctx.ids,
    count: rangs.map((r) => ctx.ids[r]),
    doubles: rangsDoubles.map((r) => ({
      target: ctx.ids[r],
      to: token(`${ctx.cle}d${r}`, chars[r], 'letter'),
    })),
    doublesLabel: rangsDoubles.length ? dire(spec.motDouble, ctx.langue) : null,
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

// ── Ce que l'accolade compte, par rang de caractère ────────────────────────
// Un rang, un caractère à l'écran : `ctx.ids[r]` est le jeton du r-ième signe
// de la saisie. Ces prédicats sont la SOURCE de ce qui vole dans l'accolade,
// et `compte()` reste la source du nombre : le contrôle croisé confronte les
// deux, et l'étape retombe sur le geste sobre s'ils ne s'accordent pas.
const rangs = (s, test) => [...s].map((c, i) => (test(c, i) ? i : -1)).filter((i) => i >= 0);
const rangsLettres = (s) => rangs(s, estLettre);
const rangsVoyelles = (s) => rangs(s, (c) => estLettre(c) && estVoyelle(c));
const rangsConsonnes = (s) => rangs(s, (c) => estLettre(c) && !estVoyelle(c));
const MOT_VOYELLE = bilingue('voyelle', 'vowel');
const MOT_CONSONNE = bilingue('consonne', 'consonant');

const MESURES = [
  {
    id: 'n.longueur', code: 'n1',
    libelle: bilingue('On compte les lettres', 'Count the letters'),
    regle: bilingue('Le nombre de lettres du mot', 'How many letters the word has'),
    notoriete: 1.00,
    compte: (s) => lettres(s).length || null,
    cibles: rangsLettres,
  },
  {
    id: 'n.voyelles', code: 'n2',
    libelle: bilingue('On compte les voyelles', 'Count the vowels'),
    regle: bilingue('A, E, I, O, U', 'A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter(estVoyelle).length || null,
    cibles: rangsVoyelles,
  },
  {
    id: 'n.consonnes', code: 'n3',
    libelle: bilingue('On compte les consonnes', 'Count the consonants'),
    regle: bilingue('Toutes les lettres sauf A, E, I, O, U', 'Every letter but A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter((c) => !estVoyelle(c)).length || null,
    cibles: rangsConsonnes,
  },
  {
    id: 'n.lettresDistinctes', code: 'n4',
    libelle: bilingue('On compte les lettres distinctes', 'Count the distinct letters'),
    regle: bilingue('Une lettre répétée ne compte qu’une fois', 'A repeated letter counts only once'),
    notoriete: 0.70,
    compte: (s) => new Set(lettres(s).map(pli)).size || null,
    // Seule la PREMIÈRE occurrence compte ; les redites s'effacent sans faire
    // avancer le compteur, et c'est là qu'on voit la règle.
    cibles: (s) => {
      const vus = new Set();
      return rangs(s, (c) => {
        if (!estLettre(c) || vus.has(pli(c))) return false;
        vus.add(pli(c));
        return true;
      });
    },
  },
  {
    id: 'n.separateurs', code: 'n5',
    libelle: bilingue('On compte les séparateurs', 'Count the separators'),
    regle: bilingue('Les tirets, points et barres', 'Dashes, dots and slashes'),
    notoriete: 0.65,
    compte: (s) => [...s].filter((c) => /[-._/]/.test(c)).length || null,
    cibles: (s) => rangs(s, (c) => /[-._/]/.test(c)),
  },
  {
    id: 'n.mots', code: 'n6',
    libelle: bilingue('On compte les mots', 'Count the words'),
    regle: bilingue('Ce que séparent les tirets, points et barres',
      'Whatever the dashes, dots and slashes set apart'),
    notoriete: 0.80,
    compte: (s) => decouperMots(s).length || null,
    // Un mot n'est pas un jeton : c'est sa PREMIÈRE lettre qui le représente
    // dans l'accolade — une par mot, et l'on compte bien des mots.
    cibles: (s) => decouperMots(s).map((m) => m.debut),
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
    cibles: rangsLettres,
    doubles: rangsVoyelles,
    motDouble: MOT_VOYELLE,
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
    cibles: rangsLettres,
    doubles: rangsConsonnes,
    motDouble: MOT_CONSONNE,
  },
].map(mesureStr);

const MAPPEURS_LETTRE = [
  {
    id: 'm.a1z26', code: 'm1',
    libelle: bilingue('Chaque lettre vaut son rang dans l’alphabet',
      'Each letter is worth its alphabetical rank'),
    regle: bilingue('A=1, B=2, … Z=26', 'A=1, B=2, … Z=26'),
    notoriete: 1.00,
    geste: 'table', forme: 'reglette', ordre: 'a1z26',
    fn: (c) => valeurTable(A1Z26, pli(c)),
  },
  {
    id: 'm.z26a1', code: 'm2',
    libelle: bilingue('Chaque lettre vaut son rang inversé',
      'Each letter is worth its reversed alphabetical rank'),
    regle: bilingue('A=26, B=25, … Z=1', 'A=26, B=25, … Z=1'),
    notoriete: 0.45,
    geste: 'table', forme: 'reglette', ordre: 'z26a1',
    fn: (c) => valeurTable(Z26A1, pli(c)),
  },
  {
    id: 'm.pythagore', code: 'm3',
    libelle: bilingue('Numérologie pythagoricienne', 'Pythagorean numerology'),
    regle: bilingue('Le rang réduit à un chiffre : 1 à 9, cycliquement',
      'The rank cut down to one digit: 1 to 9, over and over'),
    notoriete: 0.80,
    // ★ Une case par lettre, dans l'ordre alphabétique — et un RETOUR À LA
    // LIGNE là où la table recommence. La pythagoricienne réduit le rang
    // modulo 9 : en cassant la ligne à chaque retour au 1, on obtient trois
    // rangées qui s'alignent colonne par colonne — « A J S » valent 1, « B K
    // T » valent 2 — et la règle SE VOIT au lieu d'être affirmée. Le
    // découpage est dérivé des valeurs, pas d'un « 9 » écrit ici : le moteur
    // visuel refuserait cette mise en page si les colonnes ne se répondaient
    // pas (`src/visuel/primitives/table.js`, `verifierCycle`).
    geste: 'table', forme: 'reglette', cycle: true,
    fn: (c) => valeurTable(PYTHAGORE, pli(c)),
  },
  {
    id: 'm.chaldeen', code: 'm4',
    libelle: bilingue('Numérologie chaldéenne', 'Chaldean numerology'),
    regle: bilingue('Table chaldéenne traditionnelle — elle ignore le 9',
      'The traditional Chaldean table — it leaves out the 9'),
    notoriete: 0.55,
    // ★ Réglette simple, ordre alphabétique, deux rangées de treize — la MÊME
    // forme que la gématrie simple, et c'est tout l'argument. La table
    // chaldéenne ne vient pas d'un calcul mais d'une tradition sonore : elle
    // n'est pas positionnelle, elle n'emploie jamais le 9, et rien ne s'y
    // répète cycliquement. Un retour à la ligne (`cycle`) y serait un MENSONGE
    // VISUEL — il suggérerait une régularité qui n'existe pas ; le moteur
    // visuel le refuserait d'ailleurs. Un regroupement par valeur affirmerait
    // que « ces lettres vont ensemble » sans jamais dire pourquoi. Reste
    // l'ordre alphabétique : on y cherche sa lettre comme dans un
    // dictionnaire, et l'absence de 9 se constate en parcourant les cases.
    geste: 'table', forme: 'reglette',
    fn: (c) => valeurTable(CHALDEEN, pli(c)),
  },
  {
    id: 'm.englishX6', code: 'm5',
    libelle: bilingue('Gématrie anglaise', 'English gematria'),
    regle: bilingue('Le rang multiplié par six : A=6, B=12, … Z=156',
      'The rank times six: A=6, B=12, … Z=156'),
    notoriete: 0.30, adHoc: 0.15,
    geste: 'table', forme: 'reglette',
    fn: (c) => valeurTable(ENGLISH_X6, pli(c)),
  },
  {
    id: 'm.scrabbleFR', code: 'm6',
    libelle: bilingue('Points du Scrabble français', 'French Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition française',
      'The tile values of the game, French edition'),
    notoriete: 0.75,
    // Une case par lettre, ordre alphabétique — l'ordre où l'on CHERCHE une
    // lettre —, et un fond de case d'autant plus contrasté que le jeton vaut
    // cher : le « K » à 10 points se repère avant d'être lu. La teinte
    // redouble le nombre écrit dans la case, elle ne le remplace jamais
    // (design §5.1, « couleur seule : jamais »).
    geste: 'table', forme: 'reglette', teinte: 'valeur',
    fn: (c) => valeurTable(SCRABBLE_FR, pli(c)),
  },
  {
    id: 'm.scrabbleEN', code: 'm7',
    libelle: bilingue('Points du Scrabble anglais', 'English Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition anglaise',
      'The tile values of the game, English edition'),
    notoriete: 0.70,
    geste: 'table', forme: 'reglette', teinte: 'valeur',
    fn: (c) => valeurTable(SCRABBLE_EN, pli(c)),
  },
  {
    id: 'm.t9', code: 'm8',
    libelle: bilingue('Touche du clavier téléphonique', 'Phone keypad key'),
    regle: bilingue('ABC=2, DEF=3, … WXYZ=9 (norme ITU E.161)',
      'ABC=2, DEF=3, … WXYZ=9 (ITU E.161 standard)'),
    notoriete: 0.70,
    // ★ Le PAVÉ, et la SEULE table où une case porte plusieurs lettres : les
    // huit touches à leur place sur le téléphone, la touche 1 dessinée vide
    // parce qu'elle l'est. Ici le groupement n'est pas une commodité de mise
    // en page, c'est l'objet lui-même — la touche 7 porte vraiment « PQRS ».
    // Une réglette de vingt-six cases aurait dit la même chose sans jamais
    // ressembler à ce dont elle parle.
    geste: 'table', forme: 'pave',
    fn: (c) => valeurTable(T9, pli(c)),
  },
  {
    id: 'm.morseSignaux', code: 'm9',
    libelle: bilingue('Signaux du morse', 'Morse signals'),
    regle: bilingue('Le nombre de points et de traits de la lettre',
      'How many dots and dashes the letter takes'),
    notoriete: 0.60,
    // Le code EST l'argument : « B → –··· → 4 » se compte à l'œil, « B → 4 »
    // se croit. La note porte donc le code, et la valeur le compte.
    geste: 'table', forme: 'reglette', noteDe: morseLisible,
    fn: (c) => morseSignaux(pli(c)),
  },
  {
    id: 'm.morseTraits', code: 'ma',
    libelle: bilingue('Traits du morse', 'Morse dashes'),
    regle: bilingue('Les traits seuls, sans les points', 'The dashes alone, dots not counted'),
    notoriete: 0.35, adHoc: 0.15,
    geste: 'table', forme: 'reglette', noteDe: morseLisible,
    fn: (c) => morseTraits(pli(c)),
  },
  {
    id: 'm.asciiMaj', code: 'mb',
    libelle: bilingue('Code ASCII de la capitale', 'ASCII code of the capital'),
    regle: bilingue('A=65, B=66, … Z=90', 'A=65, B=66, … Z=90'),
    notoriete: 0.45,
    geste: 'table', forme: 'reglette',
    fn: (c) => (estLettre(pli(c)) ? pli(c).charCodeAt(0) : null),
  },
  {
    id: 'm.asciiMin', code: 'mc',
    libelle: bilingue('Code ASCII du bas de casse', 'ASCII code of the lower-case letter'),
    regle: bilingue('a=97, b=98, … z=122', 'a=97, b=98, … z=122'),
    notoriete: 0.45,
    // La table montre le BAS DE CASSE, puisque c'est lui qu'on code : afficher
    // « A → 97 » ferait mentir la case.
    geste: 'table', forme: 'reglette', labelDe: (c) => c.toLowerCase(),
    fn: (c) => (estLettre(pli(c)) ? pli(c).toLowerCase().charCodeAt(0) : null),
  },
  {
    id: 'm.seg7', code: 'md',
    libelle: bilingue('Lettre vers nombre de segments', 'Letter to number of segments'),
    regle: bilingue('Sur afficheur 7 segments (calculette par exemple), combien faut-il '
      + 'allumer de segments pour former cette lettre ?',
      'On a seven-segment display (a pocket calculator, say), how many segments have to '
      + 'light up to form this letter?'),
    notoriete: 0.55,
    note: MENTION_SEG7, geste: 'sevenSeg', mode: 'segments',
    fn: (c) => compteSegments(pli(c)),
  },
  {
    id: 'm.seg7Fusion', code: 'me',
    // ★ « TRAITS », pas « lignes ». Le mot « ligne » est RÉSERVÉ à un comptage
    // distinct, à venir : celui des seules HORIZONTALES de l'afficheur — les
    // segments a, d et g, trois horizontales disjointes (voir
    // `tables/seg7.js`). Employer « ligne » ici ferait se confondre les deux
    // méthodes le jour où la seconde arrivera. La légende, elle, garde
    // « lignes droites » : elle décrit le geste du dessin, pas l'unité comptée.
    libelle: bilingue('Lettre vers nombre de traits', 'Letter to number of strokes'),
    regle: bilingue('Sur afficheur 7 segments (calculette par exemple), combien faut-il '
      + 'de lignes droites pour former cette lettre ?',
      'On a seven-segment display (a pocket calculator, say), how many straight lines does '
      + 'it take to form this letter?'),
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
    // La translittération est la moitié de la méthode : la case montre la
    // lettre hébraïque avant sa valeur, sans quoi le saut « P → 80 » serait
    // une affirmation de plus.
    geste: 'table', forme: 'reglette', noteDe: (c) => TRANSLIT_HEBREU[c] || null,
    fn: (c) => valeurHebreu(pli(c)),
  },
  {
    id: 'm.grec', code: 'mq',
    libelle: bilingue('Isopséphie grecque', 'Greek isopsephy'),
    regle: bilingue('On translittère en grec, puis on lit la valeur des lettres',
      'Transliterate into Greek, then read off the value of each letter'),
    notoriete: 0.55,
    note: NOTE_SOURCAGE,
    geste: 'table', forme: 'reglette', noteDe: (c) => TRANSLIT_GREC[c] || null,
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
    // ★ Ce n'en est pas moins une table lettre → nombre : simplement, la
    // correspondance passe par un MOT, et c'est le mot qui prouve le nombre.
    // La case porte donc les trois : « W → double vé → 8 ». Neuf colonnes,
    // parce que « double vé » ne tient pas dans une case de treizième.
    geste: 'table', forme: 'reglette', colonnes: 9,
    noteDe: (c) => NOM_LETTRE_FR[c] || null,
    fn: (c) => {
      const nom = NOM_LETTRE_FR[pli(c)];
      return nom ? [...sansAccents(nom)].filter(estLettre).length : null;
    },
  },
].map((spec) => {
  const {
    fn, geste, mode, metrique, casse, disposition, mesureClavier,
    forme, colonnes, cycle, teinte, noteDe, labelDe, ...reste
  } = spec;
  const base = {
    ...reste, geste, mode, metrique, casse, disposition, mesureClavier,
    forme, colonnes, cycle, teinte,
    // ★ La table MONTRÉE est dérivée de `fn`, la fonction même que `apply()`
    // applique. Une seule source, donc aucune divergence possible.
    table: geste === 'table' ? tableDe(fn, { noteDe, labelDe }) : null,
  };
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
  // ★ L'afficheur QUATORZE segments — deux méthodes de plus, et deux codes
  // neufs. Le registre est append-only (CONTRACTS §4.1) : `mv` était le dernier
  // alloué, ceux-ci prennent `mw` et `mx`. Rien n'est recyclé, `md` et `me`
  // gardent leur comportement mot pour mot.
  //
  // Ce que le quatorze segments apporte au CALCUL — c'est la question posée :
  // sept lettres y valent 6 segments (`D E G H N O P`) contre deux en sept
  // segments (`A` et `O`), si bien que `HOP` s'y écrit littéralement 6·6·6 ;
  // et la borne des traits fusionnés passe de 5 à 10, ce qui ouvre des sommes
  // que le sept segments ne savait pas produire.
  def({
    id: 'm.seg14', code: 'mw', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Lettre vers nombre de segments, en 14 segments',
      'Letter to number of segments, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments (celui des autoradios et des tableaux '
      + 'd’affichage), combien faut-il allumer de segments pour former cette lettre ?',
      'On a fourteen-segment display (the one in car radios and station boards), how many '
      + 'segments have to light up to form this letter?'),
    notoriete: 0.40,
    note: MENTION_SEG14,
    apply: parLettre((c) => compteSegments14(pli(c))),
    steps: etapeMappeur({
      libelle: bilingue('Lettre vers nombre de segments, en 14 segments',
        'Letter to number of segments, on a fourteen-segment display'),
      regle: bilingue('Sur afficheur 14 segments (celui des autoradios et des tableaux '
        + 'd’affichage), combien faut-il allumer de segments pour former cette lettre ?',
        'On a fourteen-segment display (the one in car radios and station boards), how many '
        + 'segments have to light up to form this letter?'),
      geste: 'fourteenSeg', mode: 'segments',
    }),
  }),
  def({
    id: 'm.seg14Fusion', code: 'mx', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    // ★ « TRAITS », pas « lignes » — même réserve qu'en sept segments (`me`) :
    // le mot « ligne » reste réservé au comptage des seules HORIZONTALES.
    // Le quatorze segments en compte trois (`a`, `d`, et la médiane `g1`+`g2`
    // qui n'en fait qu'une), ce qui rendrait la confusion d'autant plus facile.
    libelle: bilingue('Lettre vers nombre de traits, en 14 segments',
      'Letter to number of strokes, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments, combien faut-il de lignes droites '
      + 'continues pour former cette lettre ?',
      'On a fourteen-segment display, how many unbroken straight lines does it take to '
      + 'form this letter?'),
    notoriete: 0.35,
    note: MENTION_SEG14,
    apply: parLettre((c) => compteTraitsFusionnes14(pli(c))),
    steps: etapeMappeur({
      libelle: bilingue('Lettre vers nombre de traits, en 14 segments',
        'Letter to number of strokes, on a fourteen-segment display'),
      regle: bilingue('Sur afficheur 14 segments, combien faut-il de lignes droites '
        + 'continues pour former cette lettre ?',
        'On a fourteen-segment display, how many unbroken straight lines does it take to '
        + 'form this letter?'),
      geste: 'fourteenSeg', mode: 'fusion',
    }),
  }),
  // ★ « On retourne les 9 » — le pendant VECTORIEL de `p.retournement` (`p9`).
  //
  // Ce que le moteur faisait jusqu'ici des 9 qu'il produisait : il les
  // additionnait. Deux 9 font 18, qui se réduit en 9, qu'on additionnait à un
  // 3 pour faire 12, qui se réduit en 3 — et ce 3 finissait par rencontrer un
  // autre 3 pour faire le 6 qu'on cherchait, au prix de trois étapes et de
  // deux valeurs sacrifiées. Or le catalogue savait DÉJÀ qu'un 9 retourné est
  // un 6 : il ne le savait que sur un nombre isolé (`p9`, `NUM → NUM`), après
  // que tout eut été réduit à un seul. Sur un vecteur, chaque 9 vaut un 6
  // gratuit — et c'est un 6 de plus par jeton, pas un 6 à la place de trois.
  //
  // Le gisement est réel et il est systématique. La gématrie anglaise (`m5` :
  // A = 6, B = 12 … Z = 156) ne rend que des multiples de 6, donc de 3 ;
  // la réduction chiffre à chiffre (`mt`) d'un multiple de 3 est un multiple
  // de 3 à un chiffre, c'est-à-dire 3, 6 ou 9 et rien d'autre. Un vecteur
  // `m5 + mt` est donc, littéralement, un tiers de 6, un tiers de 9 —
  // et ce tiers-là était perdu.
  //
  // ★ Ce n'est PAS un filtre. Rien n'est jeté, rien n'est réordonné, la
  // largeur du vecteur ne bouge pas d'un jeton : c'est ce qui la rend honnête
  // (on ne choisit pas ses valeurs après coup), et c'est aussi ce qui la rend
  // recevable par la MOISSON, qui exige une valeur par jeton reçu
  // (`src/recherche/assemblage.js › uneValeurParJeton`). Un filtre « on ne
  // garde que les 9 » aurait rapporté les mêmes 6 en trichant.
  //
  // Registre append-only (CONTRACTS §4.1) : `mx` était le dernier alloué,
  // celui-ci prend `my`. `p9` n'est pas touché et garde son comportement mot
  // pour mot — les deux coexistent, l'un sur un nombre, l'autre sur un vecteur.
  def({
    id: 'm.retournerLesNeuf', code: 'my', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_RETOURNER_9,
    regle: bilingue('Un 9 retourné d’un demi-tour donne un 6',
      'Give a 9 a half-turn and it becomes a 6'),
    // ★ Mêmes chiffres que `p9`, et pour les mêmes raisons. La ficelle est
    // connue de tout le monde sans être respectée de personne (notoriété 0,25),
    // et elle est franchement ad hoc (0,35) : elle ne s'autorise que d'une
    // coïncidence de dessin, pas d'une propriété du nombre. Le fait qu'elle
    // rapporte davantage sur un vecteur ne change ni ce que le public en sait,
    // ni ce qu'elle vaut : la déclarer moins ad hoc parce qu'elle est devenue
    // rentable reviendrait à truquer le classement pour se donner raison.
    notoriete: 0.25, adHoc: 0.35,
    note: bilingue(
      'On ne retourne que les 9. Retourner un 6 serait, disons, contre-productif.',
      'Only the 9s get turned. Turning a 6 would be, shall we say, counter-productive.',
    ),
    apply: (valeur, traces) => {
      // ★ L'`exige` de `p9` (« n === 9 »), transposé au vecteur : sans un seul
      // 9, l'opérateur REFUSE au lieu de rendre son entrée. Un mappeur qui rend
      // ce qu'il a reçu fabrique une étape que `scenario.js` saute
      // silencieusement (« une transformation qui ne transforme RIEN À
      // L'ÉCRAN ») — le chemin porterait alors dans son URL un code que la
      // démonstration ne montre nulle part, et deux programmes distincts
      // rejoueraient la même scène.
      if (!valeur.some((n) => n === 9)) return null;
      const out = valeur.map((n) => (n === 9 ? 6 : n));
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // Seuls les 9 reçoivent un identifiant neuf. Les autres gardent le leur :
    // aucun step ne les touche, et un renommage sans geste ferait croire au
    // pont qu'un jeton a été remplacé alors qu'il n'a pas bougé.
    sortie: (avant, apres, ctx) => apres.valeur.map((v, i) => (v === avant.valeur[i]
      ? ctx.ids[i] : nomToken(ctx, i))),
    /**
     * ★ Un seul step, et les 9 s'y retournent L'UN APRÈS L'AUTRE.
     *
     * `enchainer` donne à chaque `flip180` un `at` calculé sur la fin du
     * précédent : le spectateur voit une vague traverser la ligne, pas un
     * clignotement collectif. C'est la contrainte de lisibilité du projet — une
     * accélération qui « efface tout puis remet tout d'un coup » a déjà été
     * rejetée —, et c'est aussi une nécessité technique : `flip180` muni d'un
     * `to` appelle `ctx.reflow()`, et deux reflow simultanés animeraient deux
     * fois `translate` sur les mêmes jetons (voir `enchainer`, commun.js).
     *
     * Un step et non un par 9, contrairement à `table` ou `sevenSeg` : ceux-là
     * doivent montrer QUELLE lettre a donné QUEL nombre, donc un aller-retour à
     * la fois. Ici le 9 tourne SUR PLACE et devient un 6 à sa place : il n'y a
     * aucune attribution à préserver, et douze steps portant le même titre
     * noieraient Le Registre au lieu de l'instruire.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3). La valeur d'arrivée n'est jamais
     * écrite en dur : elle est LUE dans `apres.valeur[i]`, c'est-à-dire dans ce
     * qu'`apply()` a calculé, et la comparaison avec `avant.valeur[i]` décide
     * seule quels jetons bougent. Il n'existe donc pas de seconde copie qui
     * puisse diverger. `src/visuel/primitives/flip180.js` recoupe une deuxième
     * fois — il refuse de faire naître autre chose qu'un 6 d'autre chose qu'un
     * 9 — et `src/recherche/scenario.js` une troisième, où l'on connaît encore
     * la valeur du jeton de départ.
     */
    steps: (avant, apres, ctx) => {
      const ops = [];
      const neufs = [];
      apres.valeur.forEach((v, i) => {
        if (v === avant.valeur[i]) return; // ce jeton n'est pas un 9 : il ne bouge pas
        const id = nomToken(ctx, i);
        neufs.push(id);
        ops.push({ op: 'flip180', target: ctx.ids[i], to: token(id, v, 'number') });
      });
      if (!ops.length) return [];
      // Le `pulse` final vient APRÈS le dernier demi-tour, jamais pendant :
      // pendant, le jeton d'arrivée voit déjà son `scale` animé par le
      // crossfade de `flip180` (même raison que dans `posts.js`).
      ops.push({ op: 'pulse', targets: neufs, stagger: 60 });
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_RETOURNER_9, ctx.langue), legende, enchainer(ops))];
    },
  }),
  // ★ « Trois 6 d'affilée » — une TROUVAILLE, et surtout pas un tri.
  //
  // ── Ce que ce n'est PAS ────────────────────────────────────────────────────
  // Ce n'est pas « On ne garde que les 6 » (`recolterLesSix`, `src/recherche/
  // scenario.js`). Cette étape-là RASSEMBLE : elle va chercher des 6 dispersés
  // dans le vecteur, écarte ce qui les sépare et les met bout à bout. C'est un
  // aveu — elle dit que le calcul a produit autre chose que des 6 et qu'on
  // choisit après coup —, et la doctrine de l'auteur la traite comme telle :
  // une seule fois, en avant-dernière étape, et au prix d'un malus de score
  // (CONTRACTS §3.1, amendement « On ne garde que les 6 »).
  //
  // Ici, rien n'est rassemblé. Les trois 6 sont DÉJÀ côte à côte dans le
  // vecteur, dans cet ordre, sans rien entre eux : le 666 est écrit avant
  // qu'on le regarde. On ne le fabrique pas, on le CONSTATE — et c'est
  // exactement ce qui autorise à effacer le reste. Effacer ce qui n'appartient
  // pas à une suite qu'on n'a pas choisie n'est pas du tri : c'est arrêter de
  // lire quand la phrase est finie.
  //
  // ★ Le nom porte cette différence, et il doit continuer de la porter :
  // « d'affilée » est le mot qui interdit l'assouplissement. La question
  // « et si on acceptait trois 6 non contigus ? » a une réponse, c'est non —
  // trois 6 non contigus, c'est précisément l'autre geste, celui qui coûte.
  //
  // ── Plusieurs suites, ou une suite plus longue ? ───────────────────────────
  // On prend LA PREMIÈRE suite, et ses TROIS PREMIERS 6. Deux raisons, et
  // aucune n'est une préférence esthétique :
  //
  //  · la première, parce que c'est celle qu'on rencontre en lisant de gauche
  //    à droite. Prendre « la plus longue » ou « la mieux placée » demanderait
  //    de COMPARER les suites, c'est-à-dire de choisir — et le jour où l'on
  //    choisit, on est revenu au tri qu'on refuse. Lire n'est pas comparer ;
  //  · trois, parce que 666 fait trois 6 et pas quatre. Un `[6,6,6,6]` gardé
  //    entier obligerait le verdict à trancher lui-même où couper, et il s'y
  //    refuse à juste titre (`primitives/reveal.js` : « y ouvrir un vide après
  //    le troisième affirmerait un 666 + 6 que personne n'a démontré »).
  //
  // C'est déterministe (CONTRACTS §4.4) : une URL rejouée retrouve la même
  // suite, sans dépendre d'un tri, d'un maximum, ni de l'ordre d'itération.
  //
  // Registre append-only (CONTRACTS §4.1, registre FERMÉ) : `my` était le
  // dernier alloué, celui-ci prend `mz`. Aucun code existant n'est touché.
  def({
    id: 'm.troisSixDAffilee', code: 'mz', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_TROUVAILLE,
    regle: bilingue(
      'Une suite de trois 6 contigus, prise telle quelle. On ne rassemble rien, on la trouve.',
      'A run of three adjacent 6s, taken as it stands. Nothing is gathered, it is found.',
    ),
    // ★ Notoriété 0,80. Personne n'a besoin qu'on lui explique que trois 6
    // écrits côte à côte font 666 — c'est le seul endroit du catalogue où la
    // règle est déjà connue du spectateur avant d'être énoncée. Ce n'est pas
    // 1,00 pour autant : la moitié « et l'on s'arrête là » est une convention
    // de la maison, pas un savoir partagé. La moitié qu'on reconnaît vaut le
    // barème plein (heuristique §4.3, ligne « A1Z26 »), l'autre nettement
    // moins ; 0,80 est le point honnête entre les deux.
    //
    // ★ AdHoc 0,20, et pas zéro. Cet opérateur n'existe que parce qu'on
    // cherche 666 : c'est, au sens strict, une étape taillée pour la cible.
    // Mais il ne FABRIQUE rien — pas de coïncidence de dessin comme le
    // retournement du 9 (0,35), pas de valeur absolue de secours (0,25) —, et
    // il ne choisit pas où s'arrêter : la contiguïté désigne un seul endroit
    // possible. On pénalise donc, moitié moins que la pirouette, sans exclure
    // (heuristique §4.5).
    notoriete: 0.80, adHoc: 0.20,
    note: bilingue(
      'Contigus, vraiment. Trois 6 éparpillés dans le vecteur ne font pas un 666, ils font trois 6.',
      'Adjacent, truly. Three 6s scattered through the vector are not a 666, they are three 6s.',
    ),
    apply: (valeur, traces) => {
      const d = debutDesTroisSix(valeur);
      if (d < 0) return null;
      // ★ REFUS quand il n'y a rien à effacer, pour la raison qui a déjà fait
      // refuser `my` sur un vecteur sans 9 : un mappeur qui rend son entrée
      // fabrique une étape que `scenario.js` saute silencieusement (« une
      // transformation qui ne transforme RIEN À L'ÉCRAN »), et le chemin
      // porterait alors dans son URL un code que la démonstration ne montre
      // nulle part. Un vecteur qui vaut déjà `[6,6,6]` n'a pas besoin qu'on
      // lui dise qu'il vaut `[6,6,6]`.
      if (valeur.length === SUITE) return null;
      return {
        valeur: [6, 6, 6],
        traces: [0, 1, 2].map((k) => traces[d + k] || []),
      };
    },
    // Les trois survivants GARDENT leur identifiant de jeton : ils n'ont pas
    // bougé, ils n'ont pas changé de valeur, et rien ne les a remplacés. Leur
    // donner un nom neuf ferait croire au pont qu'un jeton en a remplacé un
    // autre, et l'animation raconterait un travail qui n'a pas eu lieu.
    sortie: (avant, apres, ctx) => {
      const d = debutDesTroisSix(avant.valeur);
      return d < 0 ? [] : [0, 1, 2].map((k) => ctx.ids[d + k]);
    },
    /**
     * ★ UN SEUL geste, et il est indivisible : les cornes poussent sur les
     * trois 6 pendant que le reste de la séquence s'efface.
     *
     * Pourquoi une op et non deux (`drop` puis `horns`) : parce que le
     * contrôle croisé n'y survivrait pas. Si un `drop` effaçait le reste
     * d'abord, la primitive des cornes ne verrait plus que trois 6 seuls dans
     * la ligne — donc trivialement contigus — et elle accepterait de couronner
     * trois 6 qui, au départ, étaient dispersés. C'est exactement ce qu'elle
     * doit refuser. Elle efface donc elle-même, après avoir vérifié la
     * contiguïté sur la ligne telle qu'elle est.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3), trois verrous comme pour les tables :
     *  1. ici, `efface` et `targets` sont dérivés du MÊME index `d`, lui-même
     *     relu sur `avant.valeur` — la valeur qu'`apply()` a examinée. Il
     *     n'existe pas de seconde copie qui puisse diverger ;
     *  2. `src/recherche/scenario.js` recoupe : les trois cibles doivent être
     *     consécutives dans `ctx.ids` et porter toutes trois un « 6 » ;
     *  3. `src/visuel/primitives/horns.js` recoupe une troisième fois, sur la
     *     LIGNE : trois jetons vivants, trois « 6 », trois rangs consécutifs du
     *     flux. Sinon la compilation échoue — porter des cornes sur autre
     *     chose que trois 6 contigus serait affirmer là où l'on prétend
     *     montrer.
     */
    steps: (avant, apres, ctx) => {
      const d = debutDesTroisSix(avant.valeur);
      if (d < 0) return [];
      const cornus = [0, 1, 2].map((k) => ctx.ids[d + k]);
      const efface = ctx.ids.filter((_, i) => i < d || i > d + 2);
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join('')}`;
      return [etape(ctx, dire(LIB_TROUVAILLE, ctx.langue), legende, [
        { op: 'horns', targets: cornus, efface },
      ])];
    },
  }),
];

/** Les dix caractères que « le tiret du 6 » sait convertir — exposé pour l'UI. */
export const TOUCHES_CHIFFREES = Object.freeze(Object.keys(CHIFFRE_DE_TOUCHE));

/** Approximations 7 segments assumées — exposé pour l'UI (CONTRACTS §0.4). */
export { SEG7_APPROXIMATIONS };

/** Le quatorze segments n'en a aucune à assumer — il le dit lui-même. */
export { MENTION_SEG14 };

export const MESURES_STR = Object.freeze(MESURES);
export const MAPPEURS = Object.freeze([...MAPPEURS_LETTRE, ...AUTRES_MAPPEURS]);
