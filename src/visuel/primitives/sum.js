/**
 * `sum` — accumulation d'une somme.
 *
 * Recherche §4.7 : deux registres combinés — les opérandes « volent » vers la
 * case résultat en stagger, et la case **compte** (`0 → 8 → 23 → 39 → 44`).
 * Le compteur est du texte : il passe donc par le canal rAF, avec une fonction
 * pure de `t`, ce qui préserve l'exactitude du scrubbing.
 *
 * La largeur du résultat final est réservée dès le départ (la case est créée
 * avec son texte final) : un compteur qui passe de `8` à `44` ne doit pas faire
 * sauter la mise en page.
 *
 * ★ Composition : les opérandes sont **dans** l'accolade, le résultat paraît
 * **sous sa pointe**, et le symbole de l'opération (`Σ` par défaut, `∏`, `−`…)
 * est écrit entre les deux. Voir `group.js` pour le détail du dessin.
 */

import { targetsOf, tokenSpec, accumulate } from './helpers.js';
import { fail } from '../errors.js';

export const name = 'sum';

export function plan(ctx) {
  const operands = targetsOf(ctx);
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';

  const consume = ctx.op.consume ? ctx.scene.resolve(ctx.op.consume, ctx.where) : [];
  for (const id of consume) {
    if (operands.includes(id)) fail(`${ctx.where}« ${id} » est à la fois opérande et « consume ».`);
  }

  const partials = Array.isArray(ctx.op.partials) ? ctx.op.partials : null;
  // Le symbole n'est pas une décoration : une accolade nue ne dit pas si l'on
  // additionne, si l'on multiplie ou si l'on dénombre (voir `group.js`).
  const res = accumulate(ctx, {
    operands, consume, to, at: 0, dur: ctx.dur, partials,
    symbol: typeof ctx.op.symbol === 'string' && ctx.op.symbol ? ctx.op.symbol : 'Σ',
    label: typeof ctx.op.label === 'string' ? ctx.op.label : null,
  });

  // Garde-fou : ce qui est affiché doit être ce qui est calculé.
  const shown = res.partials[res.partials.length - 1];
  if (String(shown) !== to.text) {
    fail(`${ctx.where}incohérence : la somme des opérandes vaut ${shown}, mais « to.text » annonce « ${to.text} ». Le moteur visuel refuse d'afficher un calcul faux.`);
  }
}
