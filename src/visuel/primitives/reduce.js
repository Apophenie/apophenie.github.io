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

import {
  tokenSpec, insertOperatorTokens, accumulate, charPoint, espacementDe, exigerPoint,
  tracerAccolade, suivreLesAccolades,
} from './helpers.js';
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

  /**
   * ★ **L'ACCOLADE PARAÎT D'ABORD, SOUS LE NOMBRE ENTIER.**
   *
   * > « L'accolade est trop fugace. Elle devrait apparaître sous le nombre qui
   * >   se colore, puis s'agrandir en rythme avec l'opérateur + qui est inséré,
   * >   recevoir le résultat du calcul, le renvoyer sur la ligne principale et
   * >   seulement à ce moment, disparaître. » (l'auteur)
   *
   * Elle n'était tracée qu'au troisième temps, par `accumulate`, c'est-à-dire
   * une fois les chiffres séparés ET les signes posés : elle arrivait sur un
   * calcul déjà écrit, ne vivait que le temps de la somme, et n'avait jamais
   * embrassé le nombre dont tout part. Le geste racontait donc son histoire à
   * l'envers — on découpait, puis on annonçait qu'on allait découper.
   *
   * Elle est maintenant posée sur `44` AVANT qu'il ne s'ouvre, et c'est elle
   * qui pose la question ; l'éclatement puis les `+` l'élargissent d'eux-mêmes
   * (`suivreLesAccolades`, appelé à chaque reflow), et `accumulate` la retrouve
   * plutôt que d'en dessiner une seconde. C'est exactement la forme donnée au
   * complément à neuf (`posts.js › etapeComplement`), et pour la même raison :
   * une accolade AFFIRME, et une affirmation se pose avant sa démonstration.
   */
  const T0 = ctx.dur * 0.14; // l'accolade se trace sur le nombre entier
  const T1 = ctx.dur * 0.26; // éclatement
  const T2 = ctx.dur * 0.14; // insertion des +
  const T3 = ctx.dur - T0 - T1 - T2; // addition + résultat

  // ★ **LES POINTS D'ÉCLATEMENT SE VÉRIFIENT AVANT QUE L'ACCOLADE NE SE TRACE.**
  //   Pas par prudence : par ORDRE DE CAUSE. L'accolade annonce une découpe ; si
  //   la découpe est impossible à placer, ce n'est pas l'accolade qui est en
  //   faute et ce n'est pas d'elle qu'il faut parler. En la traçant d'abord, le
  //   moteur signalait « le tracé de l'accolade » pour un défaut de métriques
  //   qui empêchait en réalité de situer le « 1 » de « 15 » — un diagnostic
  //   exact sur le mauvais coupable, ce qui est la pire espèce.
  const points = specs.map((s, i) => exigerPoint(ctx, charPoint(ctx, src.id, i),
    `le chiffre « ${s.text} » de l'éclatement de « ${src.text} »`, s.id));

  const accolade = tracerAccolade(ctx, [src.id], {
    shape: 'brace',
    // Rien à resserrer ni à souligner : elle n'embrasse qu'un jeton.
    tighten: 0,
    marquer: false,
    // Elle DÉSIGNE ici, elle ne promet pas encore : le résultat sera promis par
    // `accumulate`, qui porte le symbole. Deux promesses feraient deux pointes.
    promet: false,
    at: 0,
    dur: Math.max(1, T0),
  });

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
    //
    // ★ C'est ce geste qui fait exister le « 1 » de « 15 » : un chiffre neuf,
    // porteur d'un texte, dont la position vient d'un CALCUL sur celle de sa
    // source. Si ce calcul rate, on obtient exactement le symptôme redouté —
    // un chiffre isolé, à l'origine, hors de toute composition. On l'exige donc
    // utilisable avant de poser quoi que ce soit.
    ctx.scene.place(s.id, points[i]);
    ctx.anim({ id: s.id, prop: 'opacity', to: 1, at: T0, dur: 1 });
  });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: T0, dur: Math.max(1, T1 * 0.35) });
  // ★ L'accolade embrassait `src`, qui meurt ici : sans ce transfert elle
  //   embrasserait un mort, `suivreLaZone` l'écarterait, et elle cesserait de
  //   suivre — figée sur une zone disparue. Même geste que `substitute`, et
  //   pour la même raison.
  if (accolade) {
    for (const [idAcc, sources] of ctx.scene.accolades) {
      const k = sources.indexOf(src.id);
      if (k < 0) continue;
      ctx.scene.poserAccolade(idAcc, [
        ...sources.slice(0, k), ...specs.map((x) => x.id), ...sources.slice(k + 1),
      ]);
    }
  }
  ctx.scene.kill(src.id, ctx.where);
  const ouverture = { at: T0, dur: T1, ease: EASE.move };
  ctx.reflow(ouverture);
  suivreLesAccolades(ctx, ouverture);

  // --- 2. les signes + ------------------------------------------------------
  const opIds = specs.slice(1).map((_, i) => `@plus:${to.id}:${i}`);
  insertOperatorTokens(ctx, {
    between: specs.map((s) => s.id),
    ids: opIds,
    glyph: ctx.op.glyph ?? '+',
    at: T0 + T1,
    dur: T2,
  });
  // ★ « S'agrandir EN RYTHME avec l'opérateur + qui est inséré » : les signes
  //   écartent la ligne, l'accolade suit le même `at`/`dur` — et depuis
  //   `constants.js › progressionDe`, la même COURBE.
  suivreLesAccolades(ctx, { at: T0 + T1, dur: T2, ease: EASE.move });

  // --- 3. addition et résultat ---------------------------------------------
  const res = accumulate(ctx, {
    operands: specs.map((s) => s.id),
    consume: opIds,
    to,
    at: T0 + T1 + T2,
    dur: T3,
    partials: Array.isArray(ctx.op.partials) ? ctx.op.partials : null,
    symbol: 'Σ',
    // L'accolade est déjà là : `accumulate` la retrouve dans le registre au
    // lieu d'en tracer une seconde par-dessus.
    accoladeExistante: true,
  });

  // --- 4. et l'accolade se retire, une fois le résultat rendu à la ligne ----
  //
  // ★ `accumulate` ne retire QUE l'accolade qu'il a tracée lui-même ; celle-ci
  //   vient d'ailleurs (voir le pavé du temps 0), et sans ce retrait elle
  //   restait à l'écran pour le reste de la démonstration. « Renvoyer le
  //   résultat sur la ligne principale et seulement à ce moment, disparaître »
  //   (l'auteur) : `accumulate` publie sa remontée en dernier quart de sa
  //   fenêtre, on part donc de là — jamais avant que le résultat ne soit posé.
  if (accolade) {
    const retrait = T0 + T1 + T2 + T3 * 0.82;
    const fondu = Math.max(1, ctx.dur - retrait);
    for (const id of accolade.ids) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: retrait, dur: fondu, ease: EASE.fade });
    }
  }

  const shown = res.partials[res.partials.length - 1];
  if (String(shown) !== to.text) {
    fail(`${ctx.where}incohérence : ${specs.map((s) => s.text).join(' + ')} = ${shown}, mais « to.text » annonce « ${to.text} ».`);
  }
}
