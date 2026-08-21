/**
 * `wait` — step vide d'une durée donnée : laisser lire une conclusion.
 *
 * C'est la seule façon légitime de produire un step sans animation : un step de
 * durée nulle est interdit (deux charnières confondues rendraient `stepIndex`
 * ambigu, CONTRACTS §3.4).
 */

export const name = 'wait';

export function plan(ctx) {
  ctx.occupy(ctx.dur);
}
