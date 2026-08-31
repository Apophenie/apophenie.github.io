/**
 * Découpes — `STR → TOKENS` et `NUM → NUMS`. Codes `t…` (CONTRACTS §4.1).
 *
 * Une découpe ne change aucune valeur : elle regroupe. Les tokens d'un même
 * groupe s'écartent aux frontières sous une accolade numérotée (`partition`),
 * puis la tête de groupe prend le texte du groupe (`substitute`) et les
 * surnuméraires tombent (`drop`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ★ « CES DÉCOUPES NE SONT PEUT-ÊTRE QUE DE LA PLOMBERIE INTERNE » — mesuré.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'auteur : « Les animations de découpe sont absentes ou foireuses. Soit il
 * faut les changer, soit les supprimer, et ces découpes ne sont peut-être que
 * de la plomberie interne et non des changements visuels pour l'utilisateur. »
 *
 * Relevé sur cinquante-et-une approches réelles (`hope`, `macron`,
 * `jean-michel`, `wikipedia.org`, `https://hope-hope-hope.fr/`), scénario
 * compilé en main. Les cinq découpes ne sont pas du tout dans le même cas :
 *
 * · **`tca` — « absente », et c'est VOULU.** Son étape n'atteint JAMAIS la
 *   scène : `rienAMontrer` (`recherche/scenario.js`) la saute avant émission,
 *   et le fait systématiquement — `tca` transforme `STR 'hope'` en
 *   `TOKENS ['h','o','p','e']`, donc le type change et **les quatre glyphes de
 *   la ligne sont exactement les mêmes**. Sur `tca+m14+m36`, le scénario
 *   commence directement au premier afficheur. C'est donc bien de la plomberie
 *   interne, et l'assemblage le sait déjà. Le `move` + `pulse` ci-dessous est
 *   un repli qui ne sert qu'à ne pas laisser un opérateur sans geste : il n'y a
 *   rien à y corriger tant que le filtre tient, et rien à y voir non plus.
 *   ⚠️ 83 emplois de `tca` relevés sur ces cinq saisies, zéro étape émise.
 *
 * · **`tm` et `tsy` — présentes et justes.** Deux étapes, mesurées sur
 *   `hope-hope.fr` : les douze caractères s'écartent aux frontières, trois
 *   accolades numérotées se tracent (1, 2, 3), elles se retirent, puis chaque
 *   tête prend le texte de son groupe et les surnuméraires tombent. C'est
 *   exactement ce que CONTRACTS §3.1 décrit pour `partition`.
 *
 * · **`tsp` — présente et juste**, avec une réserve qui n'est pas la nôtre à
 *   trancher (voir son `steps`).
 *
 * · **`tch` — présente et juste** : un éclatement pur, les chiffres naissent
 *   sur les glyphes du nombre, le layout les écarte.
 *
 * Conclusion : rien à supprimer, rien à réécrire. La seule chose qui manquait
 * était la mesure — d'où ce paragraphe, pour qu'on ne recommence pas.
 */

import { sansAccents, VOYELLES_Y } from '../tables/alphabet.js';
import { bilingue, dire } from '../i18n.js';
import {
  def, etape, token, fusion, sortieCreee, sortieConservee, nomsTokens, enchainer,
} from './commun.js';
import { decouperMots } from './filtres.js';

const SEPARATEURS = /[-._/\s+~:?&=,;!]/;

// Les libellés dont `steps()` a besoin AVANT que `def()` ait figé l'opérateur.
const LIB_CARACTERES = bilingue('On prend les lettres une par une', 'Take the letters one by one');
const REG_CARACTERES = bilingue('Un caractère, un jeton', 'One character, one token');
const LIB_SEPARATEURS = bilingue('On ne garde que les séparateurs', 'Keep the separators only');
const REG_SEPARATEURS = bilingue('Les tirets, points et barres comptent aussi', 'Dashes, dots and slashes count too');
const LIB_CHIFFRES = bilingue('On éclate le nombre en chiffres', 'Break the number into digits');
const LIB_DECOUPER = bilingue('On découpe en sous-groupes', 'Cut it into sub-groups');
const estVoyelle = (c) => VOYELLES_Y.includes(sansAccents(c).toUpperCase());
const estLettre = (c) => /\p{L}/u.test(c);

/**
 * Étape « on découpe en sous-groupes », puis « chaque groupe devient un jeton ».
 *
 * ★ **Deux steps, et le premier est le découpage lui-même.** L'ancienne
 * version traçait les accolades une par une puis fusionnait dans la foulée : le
 * découpage n'existait jamais comme moment. Or c'est le cœur de la promesse du
 * README — « trois d'affilée, selon la même méthode » : il faut d'abord VOIR
 * que la saisie se partage en trois morceaux comparables.
 *
 *  ① `partition` — les tokens s'écartent aux frontières, se resserrent à
 *    l'intérieur, et une accolade numérotée se trace sous chaque groupe. Toutes
 *    en même temps : c'est UNE op, donc un seul recalcul du flux.
 *  ② `substitute` + `drop` — chaque tête de groupe prend le texte de son
 *    groupe, les surnuméraires s'effacent.
 */
function etapeGroupes(spec) {
  return (avant, apres, ctx) => {
    const groupes = spec.groupes(avant.valeur);
    const sortie = spec.sortie(avant, apres, ctx);
    const decoupe = [];
    const pairs = [];
    const perdus = [];
    // ★ CE QUI N'EST DANS AUCUN GROUPE S'EN VA AUSSI.
    //
    //   `perdus` ne listait que les caractères ABSORBÉS par un groupe — ceux
    //   que la tête de groupe remplace. Les caractères qu'aucun groupe ne
    //   couvre restaient : sur `https://reinfocovid.fr/`, le découpage en mots
    //   rend trois jetons et laissait `//`, `.` et `/` en place, jusqu'au
    //   verdict. L'addition qui suivait s'écrivait donc « 5 // − 11 . + 2 / »,
    //   et l'accolade embrassait des signes qui n'étaient pas des opérandes.
    //
    //   Ce n'est pas une question de propreté : l'état d'arrivée ne contient
    //   PAS ces caractères, et les laisser à l'écran fait diverger ce qui est
    //   montré de ce qui est compté (CONTRACTS §0.3). Ils partent donc avec
    //   les autres, dans le même geste.
    const tetes = new Set();
    groupes.forEach((g, k) => {
      const ids = g.indices.map((i) => ctx.ids[i]).filter(Boolean);
      if (!ids.length) return;
      tetes.add(ids[0]);
      decoupe.push({ targets: ids, label: `${k + 1}` });
      pairs.push({ target: ids[0], to: token(sortie[k], g.texte, 'letter') });
    });
    // Dans l'ordre de la ligne : le `drop` s'échelonne de gauche à droite, et
    // une liste mêlée ferait sauter l'effacement d'un bout à l'autre.
    for (const id of ctx.ids) if (id && !tetes.has(id)) perdus.push(id);

    const fusionner = etape(ctx, dire(spec.libelle, ctx.langue), dire(spec.regle, ctx.langue), enchainer([
      pairs.length ? { op: 'substitute', pairs, stagger: 60 } : null,
      perdus.length ? { op: 'drop', targets: perdus, stagger: 30 } : null,
    ]), { id: `s_${ctx.cle}_1` });

    // Découper en un seul morceau ne découpe rien : on passe directement à la
    // fusion (et `partition` refuserait, à juste titre, un groupe unique).
    if (decoupe.length < 2) return [fusionner];

    return [
      etape(ctx, dire(LIB_DECOUPER, ctx.langue), dire(spec.regle, ctx.langue),
        [{ op: 'partition', groups: decoupe }], { id: `s_${ctx.cle}_0` }),
      fusionner,
    ];
  };
}

/** Construit l'état `TOKENS` à partir d'une liste de groupes d'index. */
function assembler(valeur, traces, groupes) {
  if (!groupes.length) return null;
  return {
    valeur: groupes.map((g) => g.texte),
    traces: groupes.map((g) => fusion(g.indices.map((i) => traces[i] || []))),
  };
}

const groupesCaracteres = (valeur) => [...valeur].map((c, i) => ({ texte: c, indices: [i] }));

function groupesMots(valeur) {
  return decouperMots(valeur).map((m) => ({
    texte: m.texte,
    indices: Array.from({ length: m.fin - m.debut }, (_, k) => m.debut + k),
  }));
}

function groupesSeparateurs(valeur) {
  const out = [];
  [...valeur].forEach((c, i) => { if (SEPARATEURS.test(c)) out.push({ texte: c, indices: [i] }); });
  return out;
}

/**
 * Syllabation française approchée : coupe après un groupe vocalique suivi d'une
 * consonne elle-même suivie d'une voyelle (V-CV → V/CV, VCCV → VC/CV).
 */
function groupesSyllabes(valeur) {
  const chars = [...valeur];
  if (!chars.some(estLettre)) return [];
  const coupes = [];
  for (let i = 1; i < chars.length - 1; i++) {
    const precedent = chars[i - 1];
    const courant = chars[i];
    const suivant = chars[i + 1];
    if (!estLettre(courant) || !estLettre(precedent) || !estLettre(suivant)) continue;
    if (estVoyelle(precedent) && !estVoyelle(courant) && estVoyelle(suivant)) coupes.push(i);
    else if (!estVoyelle(precedent) && !estVoyelle(courant) && estVoyelle(suivant)
      && i >= 2 && estVoyelle(chars[i - 2])) coupes.push(i);
  }
  if (!coupes.length) return [];
  const out = [];
  let debut = 0;
  for (const c of [...coupes, chars.length]) {
    if (c <= debut) continue;
    out.push({
      texte: chars.slice(debut, c).join(''),
      indices: Array.from({ length: c - debut }, (_, k) => debut + k),
    });
    debut = c;
  }
  return out;
}

const brut = [
  {
    id: 't.caracteres', code: 'tca', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On prend les lettres une par une', 'Take the letters one by one'),
    regle: bilingue('Un caractère, un jeton', 'One character, one token'),
    notoriete: 0.95, cout: 1,
    apply: (valeur, traces) => (valeur.length ? assembler(valeur, traces, groupesCaracteres(valeur)) : null),
    sortie: sortieConservee,
    // ★ `move` SANS cible : un simple recalcul du flux. Avec `targets`, la
    // primitive comprend « amène ces tokens devant » et réordonne la ligne —
    // ce qui, sur une saisie découpée en plusieurs groupes, faisait passer le
    // deuxième groupe devant le premier. Prendre les lettres une par une ne
    // change l'ordre de rien : ça les désigne, une par une.
    steps: (avant, apres, ctx) => [etape(ctx, dire(LIB_CARACTERES, ctx.langue), dire(REG_CARACTERES, ctx.langue), enchainer([
      { op: 'move' },
      { op: 'pulse', targets: ctx.ids, stagger: 30 },
    ]))],
  },
  {
    id: 't.mots', code: 'tm', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On découpe en mots', 'Split into words'),
    regle: bilingue('Les séparateurs - . _ / marquent les mots', 'The separators - . _ / mark out the words'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const g = groupesMots(valeur);
      return g.length ? assembler(valeur, traces, g) : null;
    },
    groupes: groupesMots,
  },
  {
    id: 't.separateurs', code: 'tsp', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On ne garde que les séparateurs', 'Keep the separators only'),
    regle: bilingue('Les tirets, points et barres comptent aussi', 'Dashes, dots and slashes count too'),
    notoriete: 0.55,
    apply: (valeur, traces) => {
      const g = groupesSeparateurs(valeur);
      return g.length ? assembler(valeur, traces, g) : null;
    },
    sortie: sortieConservee,
    // ★ **UNE RÉSERVE MESURÉE, ET LAISSÉE À L'ARBITRAGE.**
    //
    //   Le geste est juste — mesuré sur `hope-hope-hope.fr` : les lettres
    //   tombent une à une, les deux tirets se rapprochent, puis ils passent en
    //   or. La réserve porte sur ce dernier temps.
    //
    //   Le dépôt a une règle explicite, et elle est gelée par un test : « un
    //   filtre ne surligne pas ce qu'il garde : la disparition suffit »
    //   (`visuel/tests/primitives.test.js`). Or `t.separateurs` EST un filtre,
    //   et son surlignage tombe APRÈS que tout le reste a disparu : il désigne
    //   les seuls jetons encore là, c'est-à-dire qu'il ne désigne rien.
    //
    //   ⚠️ Mais l'or n'est pas gratuit non plus : la règle de cet opérateur est
    //   « les tirets, points et barres comptent AUSSI », et c'est une surprise
    //   — le surlignage peut se lire comme l'énoncé de cette surprise plutôt
    //   que comme une désignation. Et il ne serait pas seul à corriger : le
    //   même « drop puis highlight des survivants » est le geste de
    //   `m.sansZeros` (`mappeurs.js`), là où `mz` fait l'inverse — il surligne
    //   d'ABORD les trois 6, puis efface le reste, ce qui se lit sans réserve.
    //
    //   Deux conventions coexistent donc, et choisir entre elles est un
    //   arbitrage d'auteur, pas une correction : on mesure, on le dit, on ne
    //   tranche pas.
    steps: (avant, apres, ctx) => {
      const idxSep = [];
      [...avant.valeur].forEach((c, i) => { if (SEPARATEURS.test(c)) idxSep.push(i); });
      const gardes = new Set(idxSep);
      return [etape(ctx, dire(LIB_SEPARATEURS, ctx.langue), dire(REG_SEPARATEURS, ctx.langue), enchainer([
        { op: 'drop', targets: ctx.ids.filter((_, i) => !gardes.has(i)), stagger: 30 },
        { op: 'highlight', targets: idxSep.map((i) => ctx.ids[i]), mode: 'select' },
      ]))];
    },
  },
  {
    id: 't.syllabes', code: 'tsy', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On découpe en syllabes', 'Split into syllables'),
    regle: bilingue('Une voyelle, une consonne, une voyelle : on coupe entre',
      'Vowel, consonant, vowel: the cut goes in between'),
    notoriete: 0.25, adHoc: 0.15,
    apply: (valeur, traces) => {
      const g = groupesSyllabes(valeur);
      return g.length > 1 ? assembler(valeur, traces, g) : null;
    },
    groupes: groupesSyllabes,
  },
  {
    id: 't.chiffres', code: 'tch', famille: 'decoupe', from: 'NUM', to: 'NUMS',
    libelle: bilingue('On éclate le nombre en chiffres', 'Break the number into digits'),
    regle: bilingue('44 devient 4 et 4', '44 becomes 4 and 4'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const chiffres = [...String(Math.abs(valeur))].map(Number);
      if (chiffres.length < 2) return null;
      const t = traces[0] || [];
      const signes = valeur < 0 ? [-chiffres[0], ...chiffres.slice(1)] : chiffres;
      return { valeur: signes, traces: signes.map(() => t) };
    },
    steps: (avant, apres, ctx) => {
      const sortie = nomsTokens(ctx, apres.valeur.length);
      // Éclatement pur : un `substitute` à `to` MULTIPLE — les chiffres naissent
      // pile sur les glyphes du nombre d'origine, et le layout les écarte.
      // (`reduce` ajouterait une addition, qui n'a pas lieu d'être ici.)
      const liaison = ctx.langue === 'en' ? 'and' : 'et';
      return [etape(ctx, dire(LIB_CHIFFRES, ctx.langue),
        `${avant.valeur} → ${apres.valeur.join(` ${liaison} `)}`, [
        {
          op: 'substitute',
          stagger: 90,
          pairs: [{
            target: ctx.ids[0],
            to: apres.valeur.map((d, i) => token(sortie[i], d, 'digit')),
          }],
        },
      ])];
    },
  },
];

export const TOKENISEURS = Object.freeze(brut.map((spec) => {
  const { groupes, ...reste } = spec;
  if (!groupes) return def(reste);
  const base = { ...reste, groupes, sortie: reste.sortie || sortieCreee };
  return def({ ...reste, steps: etapeGroupes(base) });
}));
