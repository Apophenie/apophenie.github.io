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

import { targetsOf, effacerSurPlace, suivreLesAccolades } from './helpers.js';
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
    // La chute du jeton emporte ce qui lui est accroché — même départ, même
    // durée, même courbe, sur chaque canal (voir `helpers.effacerSurPlace`).
    // `translate` fait exception au raccourci `animSolidaire` : chaque nœud a
    // sa propre position de départ, donc sa propre cible. C'est le MÊME
    // déplacement (26 unités vers le bas) qui leur est appliqué, pas la même
    // destination — sans quoi le décor viendrait se poser sur son jeton.
    ctx.anim({ id, prop: 'translate', to: { x: pos.x, y: pos.y + 26 }, at, dur: fall, ease: EASE.fade });
    for (const sid of ctx.scene.satellitesDe(id)) {
      const q = ctx.scene.pos(sid);
      if (q) ctx.anim({ id: sid, prop: 'translate', to: { x: q.x, y: q.y + 26 }, at, dur: fall, ease: EASE.fade });
    }
    ctx.animSolidaire({ id, prop: 'scale', to: 0.6, at, dur: fall });
    ctx.animSolidaire({ id, prop: 'opacity', to: 0, at, dur: fall });
    ctx.scene.kill(id, ctx.where);
  });

  if (regroup) {
    const bouge = { at: fall * 0.6, dur: ctx.dur - fall * 0.6, ease: EASE.move };
    ctx.reflow(bouge);
    // ★ L'accolade se resserre AVEC la ligne : ce qu'elle embrassait vient de
    //   rétrécir, et garder sa largeur reviendrait à désigner du vide.
    suivreLesAccolades(ctx, bouge);
  }
  else ctx.occupy(ctx.dur);
}

/**
 * L'effacement : un par un, sur place, sans déplacement.
 *
 * Le geste lui-même vit dans `helpers.effacerSurPlace` — `horns` s'en sert
 * aussi, et les deux gommes ne doivent pas diverger. Ne reste ici que ce qui
 * appartient à `drop` : le rapprochement facultatif des survivants.
 */
function planEffacement(ctx, ids, regroup) {
  const fin = effacerSurPlace(ctx, ids, { at: 0, dur: ctx.dur });
  if (regroup) {
    const bouge = { at: fin, dur: ctx.dur * 0.4, ease: EASE.move };
    ctx.reflow(bouge);
    suivreLesAccolades(ctx, bouge);
  }
  else ctx.occupy(fin);
}
