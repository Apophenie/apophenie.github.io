/**
 * Post-traitements — `NUM → NUM`. Codes `p…`, plus le joker `jnf`.
 *
 * `pr9` est **réservé au retournement du 9** (CONTRACTS §4.1, « par coquetterie »).
 *
 * Deux règles de rendu :
 * - les réductions chiffre à chiffre émettent **un `reduce` par palier**, chacun
 *   dans son propre step (research visuel §4.8 : le moteur visuel ne boucle
 *   jamais tout seul) ;
 * - le retournement du 9 émet un `flip180`.
 */

import { def, etape, token, nomsTokens, enchainer } from './commun.js';
import { NUM_MIN, NUM_MAX } from '../etat.js';
import { lettresDuNomChiffre, NOM_CHIFFRE_FR } from '../tables/alphabet.js';
import { bilingue, dire } from '../i18n.js';

const LIB_JOKER = bilingue(
  'On compte les lettres du nom du chiffre',
  'Count the letters in the French name of the digit',
);

const borne = (n) => (Number.isFinite(n) && Number.isInteger(n) && n >= NUM_MIN && n <= NUM_MAX ? n : null);
const chiffres = (n) => [...String(Math.abs(n))].map(Number);

/** Somme des chiffres, une passe. */
export const sommeChiffres = (n) => chiffres(n).reduce((a, b) => a + b, 0);

/** Réduction théosophique complète. */
export const racineNumerique = (n) => {
  const a = Math.abs(n);
  return a === 0 ? 0 : 1 + ((a - 1) % 9);
};

/**
 * **Réduction signée** — le signe d'un nombre négatif s'applique à son *premier
 * chiffre seulement*, puis on somme les chiffres signés : `−28 → (−2) + 8 = 6`.
 * C'est la formalisation de la Méthode 7 du README (research §5) : elle
 * généralise à n'importe quel nombre de chiffres et dégénère exactement en la
 * réduction classique sur un nombre positif.
 */
export function reductionSignee(n) {
  const ds = chiffres(n);
  if (n < 0) ds[0] = -ds[0];
  return ds.reduce((a, b) => a + b, 0);
}

/** Réduction avec arrêt sur les nombres maîtres 11, 22, 33. */
export function racineMaitres(n) {
  let v = Math.abs(n);
  while (v > 9 && ![11, 22, 33].includes(v)) v = sommeChiffres(v);
  return v;
}

/** Les paliers successifs d'une réduction (44 → 8 : `[44, 8]`). */
function paliers(n, pas) {
  const out = [n];
  let v = n;
  let garde = 0;
  while (Math.abs(v) > 9 && garde++ < 12) {
    const suivant = pas(v);
    if (suivant === v) break;
    out.push(suivant);
    v = suivant;
  }
  return out;
}

/** Étape(s) de réduction : un `reduce` par palier, un step par palier. */
function etapeReduction(spec, pas) {
  return (avant, apres, ctx) => {
    const suite = paliers(avant.valeur, pas);
    const sortie = nomsTokens(ctx, 1);
    const steps = [];
    let source = ctx.ids[0];
    suite.slice(1).forEach((v, k) => {
      const dernier = k === suite.length - 2;
      const cible = dernier ? sortie[0] : `${ctx.cle}_r${k}`;
      steps.push(etape(ctx, dire(spec.libelle, ctx.langue), `${suite[k]} → ${chiffres(suite[k]).join(' + ')} → ${v}`, [{
        op: 'reduce',
        target: source,
        digits: chiffres(suite[k]).map((d, i) => token(`${ctx.cle}_d${k}x${i}`, d, 'digit')),
        to: token(cible, v, 'number'),
      }], { id: `s_${ctx.cle}_${k}` }));
      source = cible;
    });
    if (!steps.length) {
      steps.push(etape(ctx, dire(spec.libelle, ctx.langue), `${avant.valeur} → ${apres.valeur}`, [
        { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') }] },
      ]));
    }
    return steps;
  };
}

/** Étape générique : le nombre est remplacé, avec une annotation de la règle. */
function etapeSubstitution(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    // Le `pulse` vient APRÈS la substitution : pendant, le nouveau token voit
    // déjà son `scale` animé par le crossfade.
    return [etape(ctx, dire(spec.libelle, ctx.langue), `${avant.valeur} → ${apres.valeur}`, enchainer([
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') }] },
      { op: 'pulse', targets: [sortie[0]] },
    ]))];
  };
}

const brut = [
  {
    id: 'p.racineNumerique', code: 'prn',
    libelle: bilingue('On réduit à un seul chiffre', 'Reduce to a single digit'),
    regle: bilingue('On additionne les chiffres, encore et encore, jusqu’à n’en garder qu’un',
      'Add the digits, again and again, until only one is left'),
    notoriete: 0.85,
    calcul: (n) => racineNumerique(n),
    reduction: (n) => sommeChiffres(n),
  },
  {
    id: 'p.sommeChiffres', code: 'psc',
    libelle: bilingue('On additionne les chiffres', 'Add the digits'),
    regle: bilingue('Une seule passe : 44 donne 8', 'One pass only: 44 gives 8'),
    notoriete: 0.85,
    calcul: (n) => sommeChiffres(n),
    exige: (n) => Math.abs(n) > 9,
    reductionUnique: true,
  },
  {
    id: 'p.abs', code: 'pabs',
    libelle: bilingue('On prend la valeur absolue', 'Take the absolute value'),
    regle: bilingue('Un nombre négatif se lit sans son signe', 'A negative number is read without its sign'),
    notoriete: 0.70, adHoc: 0.25,
    calcul: (n) => Math.abs(n),
    exige: (n) => n < 0,
  },
  {
    id: 'p.reductionSignee', code: 'prs',
    libelle: bilingue('On réduit en gardant le signe', 'Reduce, keeping the sign'),
    regle: bilingue('Le signe porte sur le premier chiffre : −28 donne (−2) + 8 = 6',
      'The sign sticks to the first digit only: −28 gives (−2) + 8 = 6'),
    notoriete: 0.30, adHoc: 0.25,
    note: bilingue(
      'Formalisation de la Méthode 7 du README : sur un nombre positif, elle '
      + 'redonne exactement la réduction classique.',
      'A rigorous reading of Method 7 in the README: on a positive number it gives '
      + 'back exactly the classic reduction.',
    ),
    calcul: (n) => reductionSignee(n),
    exige: (n) => Math.abs(n) > 9,
  },
  {
    id: 'p.ecartChiffres', code: 'pec',
    libelle: bilingue('On prend l’écart des deux chiffres', 'Take the gap between the two digits'),
    regle: bilingue('|d₁ − d₂|, pour un nombre à deux chiffres', '|d₁ − d₂|, for a two-digit number'),
    notoriete: 0.20, adHoc: 0.3,
    calcul: (n) => Math.abs(chiffres(n)[0] - chiffres(n)[1]),
    exige: (n) => chiffres(n).length === 2,
  },
  {
    id: 'p.miroir', code: 'pmr',
    libelle: bilingue('On lit le nombre à l’envers', 'Read the number backwards'),
    regle: bilingue('28 se lit 82', '28 reads as 82'),
    notoriete: 0.20, adHoc: 0.3,
    calcul: (n) => Math.sign(n || 1) * Number(chiffres(n).reverse().join('')),
    exige: (n) => Math.abs(n) > 9 && chiffres(n).join('') !== chiffres(n).reverse().join(''),
  },
  {
    id: 'p.complement9', code: 'pc9',
    libelle: bilingue('On prend le complément à neuf', 'Take the nines complement'),
    regle: bilingue('La preuve par neuf : 9 − n', 'Casting out nines: 9 − n'),
    notoriete: 0.35, adHoc: 0.25,
    calcul: (n) => 9 - n,
    exige: (n) => n >= 0 && n <= 9,
  },
  {
    id: 'p.modulo9', code: 'pm9',
    libelle: bilingue('On prend le reste par neuf', 'Take the remainder modulo nine'),
    regle: bilingue('Le reste de la division par 9', 'What is left over after dividing by 9'),
    notoriete: 0.40, adHoc: 0.2,
    calcul: (n) => ((n % 9) + 9) % 9,
    exige: (n) => Math.abs(n) > 9,
  },
  {
    id: 'p.retournement', code: 'pr9',
    libelle: bilingue('On retourne le 9', 'Turn the 9 upside down'),
    regle: bilingue('Un 9 retourné d’un demi-tour donne un 6', 'Give a 9 a half-turn and it becomes a 6'),
    notoriete: 0.25, adHoc: 0.35,
    note: bilingue(
      'On ne retourne que le 9. Retourner un 6 serait, disons, contre-productif.',
      'Only the 9 gets turned. Turning a 6 would be, shall we say, counter-productive.',
    ),
    calcul: () => 6,
    exige: (n) => n === 9,
    geste: 'flip180',
  },
  {
    id: 'p.racineMaitres', code: 'prm',
    libelle: bilingue('On réduit, sauf sur un nombre maître', 'Reduce, unless it is a master number'),
    regle: bilingue('La réduction s’arrête sur 11, 22 ou 33', 'The reduction stops at 11, 22 or 33'),
    notoriete: 0.45, adHoc: 0.15,
    actifParDefaut: false,
    note: bilingue(
      'Désactivé par défaut : les nombres maîtres bloquent la réduction et '
      + 'éloignent donc du 6 (CONTRACTS §0.4).',
      'Off by default: master numbers halt the reduction, and so lead away from 6 '
      + '(CONTRACTS §0.4).',
    ),
    calcul: (n) => racineMaitres(n),
    exige: (n) => Math.abs(n) > 9,
  },
  {
    id: 'p.modulo10', code: 'pm10',
    libelle: bilingue('On garde le dernier chiffre', 'Keep the last digit'),
    regle: bilingue('Le reste de la division par 10', 'What is left over after dividing by 10'),
    notoriete: 0.35, adHoc: 0.25,
    calcul: (n) => ((n % 10) + 10) % 10,
    exige: (n) => Math.abs(n) > 9,
  },
].map((spec) => {
  const { calcul, exige, reduction, reductionUnique, geste, ...reste } = spec;
  let steps;
  if (geste === 'flip180') {
    steps = (avant, apres, ctx) => {
      const sortie = nomsTokens(ctx, 1);
      const legende = ctx.langue === 'en'
        ? `${avant.valeur} turned over gives ${apres.valeur}`
        : `${avant.valeur} retourné donne ${apres.valeur}`;
      return [etape(ctx, dire(reste.libelle, ctx.langue), legende, enchainer([
        { op: 'flip180', target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') },
        { op: 'pulse', targets: [sortie[0]] },
      ]))];
    };
  } else if (reduction) {
    steps = etapeReduction(reste, reduction);
  } else if (reductionUnique) {
    steps = (avant, apres, ctx) => {
      const sortie = nomsTokens(ctx, 1);
      return [etape(ctx, dire(reste.libelle, ctx.langue), `${chiffres(avant.valeur).join(' + ')} = ${apres.valeur}`, [{
        op: 'reduce',
        target: ctx.ids[0],
        digits: chiffres(avant.valeur).map((d, i) => token(`${ctx.cle}_d${i}`, d, 'digit')),
        to: token(sortie[0], apres.valeur, 'number'),
      }])];
    };
  } else {
    steps = etapeSubstitution(reste);
  }
  return def({
    ...reste,
    famille: 'finisseur',
    from: 'NUM',
    to: 'NUM',
    apply: (valeur, traces) => {
      if (exige && !exige(valeur)) return null;
      const n = borne(calcul(valeur));
      if (n === null || n === valeur) return null;
      return { valeur: n, traces: [traces[0] || []] };
    },
    steps,
  });
});

/**
 * Le joker français (heuristique §5.2) — **la méthode qui marche toujours**.
 *
 * Remplacer un chiffre par le nombre de lettres de son nom français fait entrer
 * dans le cycle `4 → 6 → 3 → 5 → 4`, qui contient 6 : tout chiffre atteint 6 en
 * au plus 3 étapes. C'est une propriété du **français** — en anglais, `four` a
 * quatre lettres, donc 4 est un point fixe et l'itération n'atteint jamais 6.
 *
 * `isJoker: true` : le moteur de recherche ne l'explore jamais, il est réservé à
 * l'approche de secours (heuristique §5.4). CONTRACTS §0.4 : il est affiché et
 * assumé, en bas de liste.
 */
const JOKER = def({
  id: 'j.nomFrancais', code: 'jnf', famille: 'joker', from: 'NUM', to: 'NUM',
  libelle: bilingue(
    'On compte les lettres du nom du chiffre',
    'Count the letters in the French name of the digit',
  ),
  regle: bilingue(
    '« quatre » a six lettres — et le cycle 4, 6, 3, 5 passe toujours par 6',
    '"quatre" — French for four — has six letters, and the cycle 4, 6, 3, 5 always runs through 6',
  ),
  notoriete: 0.15, adHoc: 0.50, isJoker: true, cout: 1,
  note: bilingue(
    'Ne fonctionne qu’en français : « four » a quatre lettres, donc l’anglais '
    + 'reste bloqué sur 4. C’est un argument, pas une gêne.',
    'A French curiosity, and we own it. In French, "quatre" has six letters, which '
    + 'starts the cycle 4 → 6 → 3 → 5 → 4 and always passes through 6. In English, '
    + '"four" has exactly four letters: 4 is a fixed point and the trick never gets '
    + 'anywhere. There is no English equivalent — so this one stays French.',
  ),
  apply: (valeur, traces) => {
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 9) return null;
    const n = lettresDuNomChiffre(valeur);
    if (n === null || n === valeur) return null;
    return { valeur: n, traces: [traces[0] || []] };
  },
  steps: (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    const nom = NOM_CHIFFRE_FR[avant.valeur];
    const legende = ctx.langue === 'en'
      ? `"${nom}" has ${apres.valeur} letters`
      : `« ${nom} » : ${apres.valeur} lettres`;
    return [etape(ctx, dire(LIB_JOKER, ctx.langue), legende, enchainer([
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(`${ctx.cle}_mot`, nom, 'letter') }], dur: 700 },
      { op: 'group', targets: [`${ctx.cle}_mot`], dur: 600 },
      {
        op: 'substitute',
        dur: 700,
        pairs: [{ target: `${ctx.cle}_mot`, to: token(sortie[0], apres.valeur, 'number') }],
      },
    ]))];
  },
});

export const POSTS = Object.freeze(brut);
export const JOKERS = Object.freeze([JOKER]);
