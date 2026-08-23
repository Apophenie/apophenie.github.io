/**
 * `reduce` — réduction théosophique (44 → 4+4 → 8).
 *
 * Recherche §4.8, trois temps dans un seul step (le README traite ça comme une
 * seule transformation) :
 *   1. **éclatement** : `44` se scinde en deux tokens `4` et `4` qui s'écartent ;
 *   2. **addition** : `insertOperators` puis `sum` ;
 *   3. **résultat** : `8` apparaît avec une accentuation.
 *
 * Les deux chiffres naissent **exactement** sur les deux glyphes du `44`
 * d'origine (chasse fixe → arithmétique pure, pas de `getStartPositionOfChar`),
 * ce qui rend le raccord invisible.
 *
 * Cas récursif (`199 → 19 → 10 → 1`) : le moteur arithmétique émet **un
 * `reduce` par palier**, chacun dans son step. Le moteur visuel ne boucle jamais.
 */

import { tokenSpec, insertOperatorTokens, accumulate, charPoint, espacementDe } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'reduce';

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  if (ctx.op.to === undefined) {
    fail(`${ctx.where}« to » manquant : une réduction théosophique se termine sur un nombre. `
      + `Pour un éclatement **sans** addition (44 → 4, 4), utilisez « substitute » avec un « to » multiple : `
      + `{ op:'substitute', pairs:[{ target:'…', to:[{id,text},{id,text}] }] }.`);
  }
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  const digits = ctx.op.digits;
  if (!Array.isArray(digits) || digits.length < 2) {
    fail(`${ctx.where}« digits » doit lister au moins deux chiffres [{id,text}] — c'est l'émetteur qui les nomme (CONTRACTS §3).`);
  }
  const specs = digits.map((d, i) => tokenSpec(ctx, d, `digits[${i}]`));
  const joined = specs.map((s) => s.text).join('');
  if (joined !== src.text) {
    fail(`${ctx.where}les chiffres « ${joined} » ne reconstituent pas le token « ${src.text} » : le moteur visuel refuse d'éclater un nombre en autre chose que lui-même.`);
  }

  const T1 = ctx.dur * 0.32; // éclatement
  const T2 = ctx.dur * 0.16; // insertion des +
  const T3 = ctx.dur - T1 - T2; // addition + résultat

  // --- 1. éclatement --------------------------------------------------------
  const srcIdx = ctx.scene.flowIndex(src.id);
  specs.forEach((s, i) => {
    ctx.scene.create({
      id: s.id, text: s.text, kind: s.kind || 'digit', group: s.group,
      // ★ Opacité de base NULLE. Les chiffres éclatés n'existent qu'à partir de
      // ce step ; nés opaques, ils s'affichaient dès la première image de la
      // démonstration — « 15 » posé sur le « ho » de « hope » avant même qu'on
      // ait compté quoi que ce soit. Ils s'allument donc d'un coup (1 ms), à
      // l'instant précis où le nombre d'origine s'efface : le raccord reste
      // invisible, mais il ne commence plus avant l'heure.
      role: 'text', inFlow: true, insertAt: srcIdx < 0 ? undefined : srcIdx + 1 + i,
      ...(i === 0 ? espacementDe(ctx, src.id) : {}),
      base: { opacity: 0, fill: ctx.palette.phos },
    }, { where: ctx.where });
    // Naissance pile sur le glyphe correspondant du token d'origine.
    ctx.scene.place(s.id, charPoint(ctx, src.id, i));
    ctx.anim({ id: s.id, prop: 'opacity', to: 1, at: 0, dur: 1 });
  });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: 0, dur: Math.max(1, T1 * 0.35) });
  ctx.scene.kill(src.id, ctx.where);
  ctx.reflow({ at: 0, dur: T1, ease: EASE.move });

  // --- 2. les signes + ------------------------------------------------------
  const opIds = specs.slice(1).map((_, i) => `@plus:${to.id}:${i}`);
  insertOperatorTokens(ctx, {
    between: specs.map((s) => s.id),
    ids: opIds,
    glyph: ctx.op.glyph ?? '+',
    at: T1,
    dur: T2,
  });

  // --- 3. addition et résultat ---------------------------------------------
  const res = accumulate(ctx, {
    operands: specs.map((s) => s.id),
    consume: opIds,
    to,
    at: T1 + T2,
    dur: T3,
    partials: Array.isArray(ctx.op.partials) ? ctx.op.partials : null,
    symbol: 'Σ',
  });

  const shown = res.partials[res.partials.length - 1];
  if (String(shown) !== to.text) {
    fail(`${ctx.where}incohérence : ${specs.map((s) => s.text).join(' + ')} = ${shown}, mais « to.text » annonce « ${to.text} ».`);
  }
}
