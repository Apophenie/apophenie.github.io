/**
 * `partition` — « on découpe la saisie en sous-groupes ».
 *
 * ## Pourquoi une primitive de plus
 *
 * Le README promet « trois d'affilée, **selon la même méthode** ». Sur
 * `hope-hope-hope.fr`, la démonstration traitait pourtant le premier morceau,
 * puis le deuxième, puis le troisième, sans jamais montrer qu'il s'agissait du
 * même mot répété trois fois : le découpage — le fait même qu'il y ait trois
 * groupes — n'était visible nulle part. `partition` est cette étape manquante.
 *
 * ## Le geste
 *
 * Un temps, trois registres :
 *
 *  1. les tokens **s'écartent aux frontières** de groupe et se resserrent à
 *    l'intérieur — l'espacement dit le découpage avant même le dessin ;
 *  2. une accolade se trace **sous chaque groupe**, toutes ensemble ou en
 *    léger décalage (`stagger`) ;
 *  3. chaque accolade porte son numéro : *groupe 1*, *groupe 2*, *groupe 3*.
 *
 * Ce qui suit peut alors s'adresser aux groupes plutôt qu'aux caractères :
 * `partition` pose (ou repose) le `group` de chaque token, de sorte que les ops
 * suivantes les désignent par sélecteur `{group:'…'}` — la même transformation,
 * appliquée à chaque groupe.
 *
 * ```js
 * { op:'partition',
 *   groups:[ { targets:['t0','t1','t2','t3'], label:'1', tag:'g0' }, … ] }
 * ```
 */

import { tracerAccolade } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'partition';

/** Écartement appliqué à la frontière entre deux groupes, en multiples de `gap`. */
const ECART = 4.5;

export function plan(ctx) {
  const brut = ctx.op.groups;
  if (!Array.isArray(brut) || brut.length < 2) {
    fail(`${ctx.where}« groups » doit lister au moins DEUX groupes : découper en un seul morceau ne découpe rien.`);
  }

  const groupes = brut.map((g, i) => {
    if (!g || typeof g !== 'object') fail(`${ctx.where}groups[${i}] : objet { targets, label, tag } attendu.`);
    const ids = ctx.scene.resolve(g.targets, `${ctx.where}groups[${i}].targets : `);
    if (!ids.length) fail(`${ctx.where}groups[${i}] ne désigne aucun token vivant.`);
    if (g.tag !== undefined && typeof g.tag !== 'string') fail(`${ctx.where}groups[${i}].tag doit être une chaîne.`);
    if (g.label !== undefined && typeof g.label !== 'string') fail(`${ctx.where}groups[${i}].label doit être une chaîne.`);
    return { ids, tag: g.tag ?? null, label: g.label ?? null, id: g.id };
  });

  // Un token ne peut pas appartenir à deux groupes : l'ambiguïté se verrait
  // immédiatement à l'écran (deux accolades se chevauchant sur le même glyphe).
  const vus = new Set();
  for (const [i, g] of groupes.entries()) {
    for (const id of g.ids) {
      if (vus.has(id)) fail(`${ctx.where}le token « ${id} » figure dans deux groupes (le ${i + 1}ᵉ le reprend) : un découpage partitionne, il ne recouvre pas.`);
      vus.add(id);
    }
  }

  const T = ctx.dur;
  const gap = ctx.layoutOpts.gap;
  const serre = typeof ctx.op.tighten === 'number' ? ctx.op.tighten : 0.7;
  const ecart = typeof ctx.op.spread === 'number' ? ctx.op.spread : ECART;

  // --- 1. l'espacement dit le découpage ------------------------------------
  for (const g of groupes) {
    g.ids.forEach((id, k) => {
      const n = ctx.scene.get(id);
      if (g.tag) n.group = g.tag;
      n.gapBefore = k === 0 ? gap * ecart : gap * serre;
    });
    // Le tout premier token de la ligne n'a pas de voisin de gauche : lui
    // donner un écart de frontière décentrerait la ligne entière.
    const premier = ctx.scene.flowIndex(g.ids[0]);
    if (premier === 0) ctx.scene.get(g.ids[0]).gapBefore = 0;
  }
  ctx.reflow({ at: 0, dur: T * 0.42, ease: EASE.move });

  // --- 2 et 3. une accolade numérotée par groupe ---------------------------
  const cadence = ctx.stagger || (T * 0.14) / Math.max(1, groupes.length - 1);
  const traces = [];
  groupes.forEach((g, i) => {
    const acc = tracerAccolade(ctx, g.ids, {
      shape: ctx.op.shape || 'brace',
      // Le resserrement a déjà été fait ci-dessus, en un seul reflow : le
      // refaire ici animerait `translate` une deuxième fois sur les mêmes
      // tokens (recherche §2.4, contrainte 4).
      tighten: 0,
      label: g.label,
      id: g.id,
      at: T * 0.3 + i * cadence,
      dur: T * 0.52 - i * cadence,
    });
    if (acc) traces.push(...acc.ids);
  });

  // ★ Les accolades se retirent à la fin du step, et c'est voulu.
  //
  // Elles ne suivent pas le flux : une accolade est posée à un endroit, pas
  // accrochée à des tokens, et dès la première transformation elle se
  // décrocherait de ce qu'elle embrasse. Pire, elle occuperait la ligne où les
  // accolades de calcul (`sum`, `group`) doivent venir se poser, et on lirait
  // deux accolades superposées.
  //
  // Ce qui reste, en revanche, c'est **l'écartement** : les frontières de
  // groupe gardent leur `gapBefore`, et les tokens qui remplacent les tokens
  // écartés en héritent (`helpers.espacementDe`). Le découpage continue donc de
  // se voir pendant toute la suite, sans qu'aucun trait n'ait à le redire.
  if (ctx.op.persist !== true) {
    for (const id of traces) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: T * 0.88, dur: T * 0.12 });
    }
  }
}
