/**
 * `group` — l'accolade : « ceci, pris ensemble, donne cela ».
 *
 * ## Composition
 *
 * L'accolade **embrasse ses sources** : ses deux bras remontent aux extrémités,
 * les éléments comptés sont donc à l'intérieur, et sa pointe centrale descend
 * vers le dessous, là où le résultat va paraître. Trois registres, dans cet
 * ordre de lecture, alignés sur le même axe vertical :
 *
 * ```
 *          H   O   P   E          ← les sources, dans l'accolade
 *      ⌣___________________⌣
 *               ▼                  ← la pointe
 *               Σ                  ← CE QU'ON FAIT (jamais implicite)
 *              44                  ← le résultat, sous la pointe
 * ```
 *
 * ## Le symbole n'est pas décoratif
 *
 * Une accolade nue ne dit pas si l'on additionne, si l'on multiplie ou si l'on
 * dénombre : trois opérations, trois résultats, un seul dessin. Chaque
 * combinateur **doit** donc dire ce qu'il fait — `symbol: 'Σ'` pour une somme,
 * `'∏'` pour un produit, `'#'` pour un comptage, `'−'` pour une soustraction
 * en chaîne — et peut l'appuyer d'un `label` en toutes lettres.
 *
 * ## Géométrie
 *
 * `getTotalLength()` n'est jamais appelé (coûteux, et indisponible hors DOM) :
 * on pose `pathLength="100"` sur le tracé, ce qui normalise `stroke-dasharray`
 * et `stroke-dashoffset` — la longueur réelle devient sans objet. Tout est en
 * unités viewBox (CONTRACTS §3.2 règle 5).
 */

import { targetsOf, tracerAccolade } from './helpers.js';
import { fail } from '../errors.js';

export const name = 'group';

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const shape = ctx.op.shape || 'brace';
  if (shape !== 'brace' && shape !== 'box') {
    fail(`${ctx.where}« shape » = « ${shape} » : seules « brace » et « box » existent.`);
  }
  const tighten = typeof ctx.op.tighten === 'number' ? ctx.op.tighten : 0.7;

  const acc = tracerAccolade(ctx, ids, {
    shape,
    tighten,
    symbol: ctx.op.symbol,
    label: ctx.op.label,
    id: ctx.op.id,
    at: 0,
    dur: ctx.dur,
  });

  // ★ `fadeAt` — l'accolade se retire quand son travail est fait.
  //
  // Un dénombrement se joue en trois gestes enchaînés dans un même step : on
  // accole, les jetons se ramassent, un nombre reste. L'accolade doit tenir
  // pendant les trois — donc au-delà de sa propre durée — puis disparaître.
  // Sans quoi elle survivait au step, et l'on voyait « # · On compte les
  // voyelles » flotter sous les trois 6 du verdict.
  if (acc && typeof ctx.op.fadeAt === 'number') {
    for (const id of acc.ids) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: ctx.op.fadeAt, dur: 300 });
    }
  }
}
