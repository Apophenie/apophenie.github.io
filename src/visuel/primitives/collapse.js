/**
 * `collapse` — DES EXEMPLAIRES IDENTIQUES SE REJOIGNENT.
 *
 * Trois gestes, un seul dessin, et c'est ce qui les rend comparables. Chaque
 * famille de jetons identiques monte hors de la ligne, converge vers un même
 * point, et il en résulte — selon le `mode` — un exemplaire, ou rien.
 *
 * | `mode`      | ce qu'on voit                              | ce qui reste |
 * |-------------|--------------------------------------------|--------------|
 * | `fusion`    | les copies se rejoignent et n'en font qu'un | un exemplaire |
 * | `annulation`| elles se jettent l'une sur l'autre          | rien, par paires |
 * | `unique`    | toutes se jettent au même point             | rien du tout |
 *
 * ★ POURQUOI CE N'EST PAS UN EFFACEMENT. « On supprime les doublons » effaçait
 *   les copies là où elles étaient, ce qui ne dit rien de plus que « celles-ci
 *   partent ». Or ce qui se passe est un RAPPROCHEMENT : deux `o` identiques ne
 *   sont pas deux choses dont on jette une, ce sont deux exemplaires de la même,
 *   et c'est en les faisant se rejoindre qu'on le montre. Le survivant hérite
 *   alors visiblement de ses jumeaux au lieu d'être le hasard d'un balayage de
 *   gauche à droite.
 *
 * ★ ET C'EST CE QUI DONNE UN SENS À `garde`. Puisque les exemplaires se
 *   rejoignent, la place où le résultat retombe devient une VRAIE question :
 *   au premier, au dernier, à celui du milieu. Trois lectures d'une même règle,
 *   qui portent le même nom parce qu'elles font le même geste, et se
 *   distinguent par ce seul index (`f.dedoublonne`, `fd1`…`fd5`).
 *
 * ★ L'annulation par paires laisse un reste QUAND LE COMPTE EST IMPAIR : trois
 *   exemplaires s'annulent deux à deux et il en survit un. C'est arithmétique,
 *   pas décoratif — et c'est précisément ce qui fait de « annulation » et de
 *   « unique » deux opérateurs distincts plutôt qu'un réglage.
 */

import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'collapse';

/** De combien les exemplaires s'élèvent avant de converger, en casses. */
const ENVOL = 1.25;

/** Découpe du temps : monter, converger, retomber. */
const TEMPS = Object.freeze({ MONTEE: 0.3, CHOC: 0.38, RETOUR: 0.32 });

const MODES = new Set(['fusion', 'annulation', 'unique']);

export function plan(ctx) {
  const mode = ctx.op.mode || 'fusion';
  if (!MODES.has(mode)) {
    fail(`${ctx.where}« mode » = « ${mode} » : seuls ${[...MODES].join(', ')} existent.`);
  }
  const familles = ctx.op.familles;
  if (!Array.isArray(familles) || !familles.length) {
    fail(`${ctx.where}« familles » doit lister au moins un groupe d'exemplaires identiques.`);
  }

  const T = ctx.dur;
  const tMontee = T * TEMPS.MONTEE;
  const tChoc = T * TEMPS.CHOC;
  const tRetour = T * TEMPS.RETOUR;
  const haut = ctx.metrics.fontSize * ENVOL;

  familles.forEach((famille, k) => {
    const ids = ctx.scene.resolve(famille.membres, `${ctx.where}familles[${k}].membres : `);
    if (ids.length < 2) {
      fail(`${ctx.where}familles[${k}] : un exemplaire seul ne se rejoint pas lui-même.`);
    }
    // Le SURVIVANT est nommé par l'émetteur, jamais choisi ici : c'est lui qui
    // sait à quelle place la règle veut que le résultat retombe.
    const survivant = famille.garde === undefined ? null
      : ctx.scene.live(famille.garde, `${ctx.where}familles[${k}].garde : `).id;
    if (survivant && !ids.includes(survivant)) {
      fail(`${ctx.where}familles[${k}] : « ${survivant} » n'est pas un des exemplaires.`);
    }
    if (mode !== 'fusion' && survivant) {
      fail(`${ctx.where}familles[${k}] : le mode « ${mode} » ne garde personne.`);
    }

    // Le point de rencontre : au-dessus du milieu de la famille. Les
    // exemplaires y montent ensemble, ce qui montre qu'ils sont comparés — et
    // pas qu'on en balaie un.
    const points = ids.map((id) => ctx.scene.pos(id)).filter(Boolean);
    if (!points.length) return;
    const cx = points.reduce((t, p) => t + p.x, 0) / points.length;
    const cy = points.reduce((t, p) => t + p.y, 0) / points.length - haut;

    const decalage = k * (tMontee * 0.12);
    for (const id of ids) {
      const p = ctx.scene.pos(id);
      // ① l'envol, à la verticale : on quitte la ligne sans changer de colonne,
      //    et c'est ce qui permet de suivre qui monte.
      ctx.place(id, { x: p.x, y: p.y - haut, w: p.w },
        { at: decalage, dur: tMontee, ease: EASE.move });
      // ② la convergence.
      ctx.place(id, { x: cx, y: cy, w: p.w },
        { at: decalage + tMontee, dur: tChoc, ease: EASE.move });
    }

    if (mode === 'fusion' && survivant) {
      // ③ tous s'effacent au contact, sauf celui qui redescend à sa place.
      for (const id of ids) {
        if (id === survivant) continue;
        ctx.anim({ id, prop: 'opacity', to: 0, at: decalage + tMontee + tChoc * 0.65, dur: tChoc * 0.35 });
        ctx.scene.kill(id, ctx.where);
      }
      const p = ctx.scene.pos(survivant);
      ctx.place(survivant, { x: p.x, y: p.y + haut, w: p.w },
        { at: decalage + tMontee + tChoc, dur: tRetour, ease: EASE.move });
      // Il reprend sa place dans le flux : le reflow de l'appelant refermera
      // les trous laissés par ses jumeaux.
    } else {
      // ③ le choc : tout part. En mode « annulation », un exemplaire survit
      //    quand le compte est impair — il n'avait personne contre qui
      //    s'annuler, et redescend là où il était.
      const impair = mode === 'annulation' && ids.length % 2 === 1;
      const rescape = impair ? ids[ids.length - 1] : null;
      for (const id of ids) {
        if (id === rescape) continue;
        ctx.anim({ id, prop: 'opacity', to: 0, at: decalage + tMontee + tChoc * 0.7, dur: tChoc * 0.3 });
        ctx.anim({ id, prop: 'scale', to: 0.4, at: decalage + tMontee + tChoc * 0.7, dur: tChoc * 0.3, ease: EASE.fade });
        ctx.scene.kill(id, ctx.where);
      }
      if (rescape) {
        const p = ctx.scene.pos(rescape);
        ctx.place(rescape, { x: p.x, y: p.y + haut, w: p.w },
          { at: decalage + tMontee + tChoc, dur: tRetour, ease: EASE.move });
      }
    }
  });
}
