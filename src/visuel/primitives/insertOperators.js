/**
 * `insertOperators` — apparition des `+` / `−` entre les tokens.
 *
 * Recherche §4.6 : la place est **réservée en amont** par un `move` du même
 * step, puis les opérateurs apparaissent (`opacity 0→1`, `scale .5→1`) en
 * stagger de gauche à droite. Sans réservation, tous les voisins bougeraient
 * en même temps que l'apparition : lisible, mais agité.
 *
 * L'émetteur fournit les `ids` des tokens créés (CONTRACTS §3 : c'est
 * l'émetteur qui nomme).
 */

import { insertOperatorTokens } from './helpers.js';
import { fail } from '../errors.js';

export const name = 'insertOperators';

export function plan(ctx) {
  const between = ctx.op.between;
  if (!Array.isArray(between) || between.length < 2) {
    fail(`${ctx.where}« between » doit lister au moins deux tokens.`);
  }
  for (const id of between) ctx.scene.live(id, ctx.where);

  const glyph = ctx.op.glyph ?? '+';
  if (typeof glyph !== 'string' || !glyph) fail(`${ctx.where}« glyph » doit être une chaîne (ex. « + », « − »).`);

  // `ids` est facultatif : les signes insérés sont des décorations de calcul,
  // consommées par le `sum` qui suit. S'ils sont nommés par l'émetteur, ils
  // deviennent référençables (et c'est alors à lui de les faire disparaître) ;
  // sinon le moteur les possède, sous un id `@`, et `sum` les absorbe seul.
  const needed = between.length - 1;
  const ids = ctx.op.ids ?? between.slice(0, -1).map((id, i) => `@op:${id}:${i}`);
  if (!Array.isArray(ids) || ids.length !== needed) {
    fail(`${ctx.where}« ids » doit contenir exactement ${needed} identifiant(s), un par opérateur inséré : c'est l'émetteur qui nomme les tokens qu'il crée (CONTRACTS §3). Reçu : ${JSON.stringify(ctx.op.ids)}.`);
  }

  // `glyphs` (facultatif) : un signe PAR interstice, pour les combinaisons qui
  // alternent (`v₀ − v₁ + v₂ − v₃`). À défaut, `glyph` vaut pour tous.
  const glyphs = ctx.op.glyphs;
  if (glyphs !== undefined) {
    if (!Array.isArray(glyphs) || glyphs.length !== needed || !glyphs.every((g) => typeof g === 'string' && g)) {
      fail(`${ctx.where}« glyphs », s'il est fourni, doit contenir exactement ${needed} signe(s), un par interstice. Reçu : ${JSON.stringify(glyphs)}.`);
    }
  }

  insertOperatorTokens(ctx, { between, ids, glyph, glyphs, at: 0, dur: ctx.dur });
}
