/**
 * `drop` — le token quitte le flux.
 *
 * Deux mécaniques, et c'est le geste du filtre qui a changé.
 *
 * ## `mode: 'erase'` (défaut des filtres) — **effacer, puis rapprocher**
 *
 * « On ne garde que les voyelles » n'est pas une chute : c'est une gomme. Les
 * caractères non retenus s'effacent **un par un**, sur place, sans bouger et
 * sans que rien d'autre ne bouge. La disparition suffit à désigner : aucun
 * surlignage n'accompagne le geste — souligner ce qu'on efface, c'est dire deux
 * fois la même chose, et mal.
 *
 * Le rapprochement des survivants est alors un geste **séparé** (`regroup:
 * false` ici, puis un `move` dans le step suivant). Les deux temps sont
 * nettement distincts, et chacun se lit seul.
 *
 * ## `mode: 'fall'` (l'ancien geste) — la chute
 *
 * Le token tombe, rétrécit et s'efface, et les survivants se resserrent avant
 * la fin de la chute (chevauchement volontaire, recherche §4.2). C'est le bon
 * geste quand le token est *consommé* par un calcul, pas *écarté* par un
 * filtre.
 *
 * CONTRACTS §3.2 règle 7 — le token n'est **jamais** retiré du DOM : il sort de
 * la liste de layout (structure JS) et reste dans le document à `opacity: 0`,
 * sinon un `seek()` en arrière ne pourrait pas le faire revenir.
 */

import { targetsOf } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'drop';

const MODES = new Set(['erase', 'fall']);

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const mode = ctx.op.mode || 'fall';
  if (!MODES.has(mode)) {
    fail(`${ctx.where}« mode » = « ${mode} » : les deux gestes sont « erase » (on efface sur place) et « fall » (le token tombe).`);
  }
  // Le regroupement des survivants est-il inclus ? Par défaut oui pour la
  // chute, non pour l'effacement — dont c'est justement tout le propos.
  const regroup = ctx.op.regroup === undefined ? mode === 'fall' : !!ctx.op.regroup;

  if (mode === 'erase') {
    planEffacement(ctx, ids, regroup);
    return;
  }

  const fall = ctx.dur * 0.55;
  ids.forEach((id, i) => {
    const at = i * ctx.stagger;
    const pos = ctx.scene.pos(id);
    ctx.anim({ id, prop: 'translate', to: { x: pos.x, y: pos.y + 26 }, at, dur: fall, ease: EASE.fade });
    ctx.anim({ id, prop: 'scale', to: 0.6, at, dur: fall });
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur: fall });
    const halo = `@halo:${id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: fall * 0.6 });
    ctx.scene.kill(id, ctx.where);
  });

  if (regroup) ctx.reflow({ at: fall * 0.6, dur: ctx.dur - fall * 0.6, ease: EASE.move });
  else ctx.occupy(ctx.dur);
}

/**
 * L'effacement : un par un, sur place, sans déplacement.
 *
 * Le stagger n'est pas décoratif — c'est LUI qui fait lire « on écarte ceci,
 * puis cela, puis cela ». Il occupe donc par défaut les deux tiers de la durée
 * de l'op, réparti entre les tokens à effacer : plus il y a de caractères à
 * gommer, plus chacun s'efface vite, mais l'ensemble garde le même tempo.
 */
function planEffacement(ctx, ids, regroup) {
  const n = ids.length;
  const cadence = ctx.stagger || (n > 1 ? (ctx.dur * 0.66) / (n - 1) : 0);
  const fondu = Math.max(1, Math.min(ctx.dur * 0.34, ctx.dur - cadence * (n - 1)));

  ids.forEach((id, i) => {
    const at = i * cadence;
    // Ni translation ni fuite : la lettre pâlit là où elle est, et se retire.
    // Un très léger rétrécissement dit « elle s'en va » sans la faire voyager.
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur: fondu, ease: EASE.fade });
    ctx.anim({ id, prop: 'scale', to: 0.82, at, dur: fondu, ease: EASE.fade });
    const halo = `@halo:${id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: fondu * 0.7 });
    ctx.scene.kill(id, ctx.where);
  });

  if (regroup) ctx.reflow({ at: cadence * (n - 1) + fondu, dur: ctx.dur * 0.4, ease: EASE.move });
  else ctx.occupy(cadence * (n - 1) + fondu);
}
