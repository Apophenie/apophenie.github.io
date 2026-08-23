/**
 * Combinateurs — `NUMS → NUM` et dénombrements `TOKENS → NUM`. Codes `c…`.
 *
 * Rendu : les opérateurs apparaissent entre les nombres (`insertOperators`),
 * puis les opérandes volent vers la case résultat pendant que celle-ci compte
 * (`sum`, avec les sommes partielles — research §4.7).
 */

import { def, etape, token, fusion, nomsTokens, enchainer, retirerAccolade } from './commun.js';
import { bilingue, dire } from '../i18n.js';
import { NUM_MIN, NUM_MAX } from '../etat.js';

const borne = (n) => (Number.isFinite(n) && Number.isInteger(n) && n >= NUM_MIN && n <= NUM_MAX ? n : null);

/** Étape d'agrégation : opérateurs intercalés, puis accumulation. */
function etapeAgregation(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    const partiels = spec.partiels ? spec.partiels(avant.valeur) : null;
    const ops = [];
    const glyphe = (i) => (typeof spec.glyphe === 'function' ? spec.glyphe(i) : spec.glyphe);
    const signes = ctx.ids.slice(1).map((_, i) => `${ctx.cle}op${i}`);
    if (spec.glyphe && ctx.ids.length > 1) {
      ops.push({
        op: 'insertOperators',
        between: ctx.ids,
        ids: signes,
        glyph: glyphe(0),
        // Un signe par interstice : la somme alternée n'est pas une
        // soustraction en chaîne, et l'écran doit dire lequel des deux.
        glyphs: ctx.ids.slice(1).map((_, i) => glyphe(i)),
      });
    }
    const sum = {
      op: 'sum',
      targets: ctx.ids,
      // ★ Les signes appartiennent au calcul : ils s'en vont avec lui. Nommés
      // par l'émetteur, ils ne sont pas absorbés d'office par `sum` (qui
      // n'absorbe que les siens, préfixés « @ ») — il faut les lui déclarer,
      // faute de quoi une rangée de « + » survivait jusqu'au verdict.
      ...(spec.glyphe && signes.length ? { consume: signes } : {}),
      to: token(sortie[0], apres.valeur, 'number'),
      // ★ Chaque combinateur DIT ce qu'il fait : le symbole paraît sous la
      // pointe de l'accolade, entre les sources et le résultat. Une accolade
      // nue ne distingue pas une somme d'un produit.
      symbol: spec.symbole || 'Σ',
    };
    if (partiels) sum.partials = partiels;
    ops.push(sum);
    return [etape(ctx, dire(spec.libelle, ctx.langue),
      `${avant.valeur.join(` ${spec.lecture || '+'} `)} = ${apres.valeur}`,
      enchainer(ops), { hold: 500 })];
  };
}

/**
 * Étape de dénombrement : on encadre, ça se ramasse, un nombre reste.
 * Les trois gestes sont ENCHAÎNÉS : `group`, `drop` et `substitute` recalculent
 * chacun le layout, les superposer produirait des animations concurrentes.
 *
 * C'est aussi le rendu des agrégations qui ne sont PAS des sommes (écart,
 * moyenne, collage) : `sum` refuse — à juste titre — d'afficher une addition
 * dont le total n'est pas celui qu'elle annonce.
 */
function etapeDecompte(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    return [etape(ctx, dire(spec.libelle, ctx.langue), `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, retirerAccolade(enchainer([
      // L'accolade porte le symbole ET la règle en toutes lettres : un
      // dénombrement n'a pas de signe consacré, il faut donc l'écrire.
      ctx.ids.length > 1
        ? { op: 'group', targets: ctx.ids, symbol: spec.symbole || '#', label: dire(spec.libelle, ctx.langue) }
        : null,
      ctx.ids.length > 1 ? { op: 'drop', targets: ctx.ids.slice(1), stagger: 20 } : null,
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') }] },
    ])))];
  };
}

/** Sommes partielles successives, pour animer un compteur. */
const partielsSomme = (vs) => vs.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], [0]);

const agregations = [
  {
    id: 'c.somme', code: 'c1',
    symbole: 'Σ',
    libelle: bilingue('On additionne', 'Add them up'),
    regle: bilingue('La somme des valeurs', 'The sum of the values'),
    notoriete: 1.00, glyphe: '+', lecture: '+',
    calcul: (vs) => vs.reduce((a, b) => a + b, 0),
    partiels: partielsSomme,
  },
  {
    id: 'c.soustraction', code: 'c2',
    symbole: '−',
    libelle: bilingue('On soustrait à la chaîne', 'Subtract along the chain'),
    regle: bilingue('Le premier moins tous les autres — les tirets sont des moins',
      'The first one minus all the others — the dashes are minus signs'),
    notoriete: 0.45, adHoc: 0.15, glyphe: (i) => '−', lecture: '−',
    calcul: (vs) => vs.slice(1).reduce((a, b) => a - b, vs[0]),
    partiels: (vs) => vs.reduce((acc, v, i) => [...acc, i === 0 ? v : acc[acc.length - 1] - v], [0]),
    minimum: 2,
  },
  {
    id: 'c.produit', code: 'c3',
    symbole: '∏',
    libelle: bilingue('On multiplie', 'Multiply them'),
    regle: bilingue('Le produit des valeurs', 'The product of the values'),
    notoriete: 0.60, glyphe: '×', lecture: '×',
    calcul: (vs) => vs.reduce((a, b) => a * b, 1),
    partiels: (vs) => vs.reduce((acc, v) => [...acc, acc[acc.length - 1] * v], [1]),
    minimum: 2,
  },
  {
    id: 'c.alternee', code: 'c4',
    symbole: '∓',
    libelle: bilingue('On alterne plus et moins', 'Alternate plus and minus'),
    regle: bilingue('v₀ − v₁ + v₂ − v₃… comme un critère de divisibilité',
      'v₀ − v₁ + v₂ − v₃… the way a divisibility test goes'),
    notoriete: 0.35, adHoc: 0.2, glyphe: (i) => (i % 2 === 0 ? '−' : '+'), lecture: '∓',
    calcul: (vs) => vs.reduce((a, b, i) => (i === 0 ? b : a + (i % 2 ? -b : b)), 0),
    // Sans sommes partielles, `sum` afficherait l'addition simple et refuserait
    // de tomber sur le total alterné : ce serait un calcul faux à l'écran.
    partiels: (vs) => vs.reduce((acc, v, i) => [...acc, i === 0 ? v : acc[acc.length - 1] + (i % 2 ? -v : v)], [0]),
    minimum: 2,
  },
  {
    id: 'c.maxMoinsMin', code: 'c5',
    symbole: 'Δ',
    libelle: bilingue('On prend l’écart', 'Take the spread'),
    regle: bilingue('Le plus grand moins le plus petit', 'The largest one minus the smallest'),
    notoriete: 0.30, adHoc: 0.2, lecture: '…',
    calcul: (vs) => Math.max(...vs) - Math.min(...vs),
    decompte: true, minimum: 2,
  },
  {
    id: 'c.moyenne', code: 'c6',
    symbole: 'moy.',
    libelle: bilingue('On fait la moyenne', 'Take the average'),
    regle: bilingue('La somme divisée par le nombre de valeurs, arrondie',
      'The sum divided by how many values there are, rounded'),
    notoriete: 0.55, adHoc: 0.1, lecture: '+',
    calcul: (vs) => Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
    decompte: true, minimum: 2,
  },
  {
    id: 'c.cardinal', code: 'c7',
    symbole: '#',
    libelle: bilingue('On compte les valeurs', 'Count the values'),
    regle: bilingue('Combien de nombres en tout', 'How many numbers there are in all'),
    notoriete: 0.80,
    calcul: (vs) => vs.length,
    decompte: true,
  },
  {
    id: 'c.concat', code: 'c8',
    symbole: '⁀',
    libelle: bilingue('On colle les chiffres', 'Glue the digits together'),
    regle: bilingue('On met les nombres bout à bout et on relit',
      'Set the numbers end to end and read the result'),
    notoriete: 0.20, adHoc: 0.3, lecture: '⁀',
    calcul: (vs) => Number(vs.map((v) => String(Math.abs(v))).join('')),
    decompte: true, minimum: 2,
  },
  {
    id: 'c.max', code: 'c9',
    symbole: 'max',
    libelle: bilingue('On garde le plus grand', 'Keep the largest'),
    regle: bilingue('Le maximum des valeurs', 'The largest of the values'),
    notoriete: 0.50, adHoc: 0.15,
    calcul: (vs) => Math.max(...vs),
    decompte: true, minimum: 2,
  },
  {
    id: 'c.min', code: 'ca',
    symbole: 'min',
    libelle: bilingue('On garde le plus petit', 'Keep the smallest'),
    regle: bilingue('Le minimum des valeurs', 'The smallest of the values'),
    notoriete: 0.50, adHoc: 0.15,
    calcul: (vs) => Math.min(...vs),
    decompte: true, minimum: 2,
  },
].map((spec) => {
  const { calcul, minimum = 1, decompte, glyphe, lecture, partiels, ...reste } = spec;
  const base = { ...reste, glyphe, lecture, partiels };
  return def({
    ...reste,
    famille: 'combinateur',
    from: 'NUMS',
    to: 'NUM',
    apply: (valeur, traces) => {
      if (valeur.length < minimum) return null;
      const n = borne(calcul(valeur));
      if (n === null) return null;
      return { valeur: n, traces: [fusion(traces)] };
    },
    steps: decompte ? etapeDecompte({ ...reste }) : etapeAgregation(base),
  });
});

const denombrements = [
  {
    id: 'c.compteTokens', code: 'cb',
    symbole: '#',
    libelle: bilingue('On compte les jetons', 'Count the tokens'),
    regle: bilingue('Combien de morceaux', 'How many pieces there are'),
    notoriete: 0.85,
    calcul: (toks) => toks.length,
  },
  {
    id: 'c.compteTokensDistincts', code: 'cc',
    symbole: '#',
    libelle: bilingue('On compte les jetons distincts', 'Count the distinct tokens'),
    regle: bilingue('Combien de morceaux différents', 'How many different pieces there are'),
    notoriete: 0.60,
    calcul: (toks) => new Set(toks.map((t) => t.toLowerCase())).size,
  },
].map((spec) => {
  const { calcul, ...reste } = spec;
  return def({
    ...reste,
    famille: 'combinateur',
    from: 'TOKENS',
    to: 'NUM',
    apply: (valeur, traces) => {
      const n = borne(calcul(valeur));
      return n === null || n === 0 ? null : { valeur: n, traces: [fusion(traces)] };
    },
    steps: etapeDecompte(reste),
  });
});

export const COMBINATEURS = Object.freeze([...agregations, ...denombrements]);
