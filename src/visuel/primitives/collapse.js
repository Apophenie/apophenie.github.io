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
import { exploser } from './explosion.js';

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
  /* ★ **`envol: 0` — QUAND SORTIR DE LA LIGNE SERAIT SORTIR DU PROPOS.**
   *
   * L'envol existe pour une raison : sur une ligne unique, deux exemplaires
   * qui glisseraient l'un vers l'autre passeraient à travers leurs voisins, et
   * l'on ne saurait plus qui converge. Les faire monter d'abord les détache de
   * la ligne, et c'est ce détachement qui se lit comme « ces deux-là sont
   * comparés ».
   *
   * Il cesse d'être juste dès que les exemplaires sont DÉJÀ séparés — les deux
   * β d'une fraction, l'un au numérateur, l'autre au dénominateur : ils n'ont
   * personne entre eux, et les faire monter ne les détacherait de rien. Pire,
   * cela leur ferait franchir le trait de fraction avant l'heure. */
  const envol = typeof ctx.op.envol === 'number' && ctx.op.envol >= 0 ? ctx.op.envol : ENVOL;
  const haut = ctx.metrics.fontSize * envol;
  /* ★ **`souffle` — LA COLLISION EXPLOSE au lieu de s'éteindre.**
   *
   * > « Quand ils se collisionnent, ils explosent (comme les 6 excédentaires au
   * >   verdict). » (l'auteur)
   *
   * C'est la MÊME explosion que celle du verdict (`explosion.js`), et il n'y en
   * a qu'une dans le dépôt : un souffle qui ne ressemblerait pas à l'autre
   * dirait qu'il se passe autre chose. Le fondu-rétrécissement ordinaire reste
   * le défaut — deux `o` en trop ne détonnent pas, ils se rangent. */
  const souffle = ctx.op.souffle === true;

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
    let cx = points.reduce((t, p) => t + p.x, 0) / points.length;
    let cy = points.reduce((t, p) => t + p.y, 0) / points.length - haut;

    /* ★ **`part` — LA RENCONTRE N'EST PAS FORCÉMENT À MI-CHEMIN.**
     *
     * > « Ils se jettent l'un vers l'autre, mais celui du bas fait les 3/4 du
     * >   trajet pour que la superposition ne se fasse pas par-dessus la barre
     * >   de fraction. » (l'auteur)
     *
     * Le milieu est le point NEUTRE : il ne privilégie personne, et c'est
     * exactement ce qu'il faut de deux doublons sur une même ligne. Sur une
     * FRACTION, il tombe sur le trait — c'est-à-dire à l'endroit précis où la
     * collision ne doit pas avoir lieu, puisqu'elle y recouvrirait ce qui
     * sépare les deux termes.
     *
     * `part` est la fraction du trajet que fait le PREMIER membre : 0,25 le
     * laisse près de chez lui et envoie l'autre le chercher. Deux membres
     * seulement — au-delà, « l'un vers l'autre » n'a plus de sens, et le
     * barycentre reprend la main. */
    const part = famille.part;
    if (typeof part === 'number' && ids.length === 2 && points.length === 2) {
      if (!(part >= 0 && part <= 1)) {
        fail(`${ctx.where}familles[${k}].part = ${part} : une part de trajet vaut entre 0 et 1.`);
      }
      cx = points[0].x + (points[1].x - points[0].x) * part;
      cy = points[0].y + (points[1].y - points[0].y) * part - haut;
    }

    // ★ **LES PLACES D'ORIGINE, RELEVÉES AVANT LE PREMIER MOUVEMENT.**
    //
    //   `ctx.scene.pos` rend la position COURANTE, c'est-à-dire celle qu'ont
    //   déjà écrite les `place` de cette même passe. Une fois la convergence
    //   posée, tous les exemplaires sont au point de rencontre, et demander
    //   « où était-il ? » ne rend plus que ce point.
    //
    //   ⚠️ MESURÉ, et c'est le défaut relevé par l'auteur : « fd bien, mais
    //     redescend verticalement sur un caractère existant, là où il devrait
    //     redescendre vers sa position cible en un seul mouvement ». Le retour
    //     s'écrivait `{ x: p.x, y: p.y + haut }` avec `p` relu APRÈS la
    //     convergence : `p.x` valait `cx`, donc le survivant retombait à la
    //     verticale au MILIEU de sa famille — sur le voisin qui s'y trouvait —
    //     et le reflow le déplaçait ensuite une seconde fois.
    //
    //   Il rejoint donc sa propre place, en un seul geste oblique.
    const origines = new Map(ids.map((id) => [id, ctx.scene.pos(id)]));

    const decalage = k * (tMontee * 0.12);
    // Sans envol, la convergence hérite du temps que la montée n'a pas pris :
    // c'est le même geste, joué d'un seul tenant, et non un geste amputé suivi
    // d'un temps mort.
    const tVol = envol > 0 ? tMontee : 0;
    const tRencontre = envol > 0 ? tChoc : tMontee + tChoc;
    for (const id of ids) {
      const p = origines.get(id);
      // ① l'envol, à la verticale : on quitte la ligne sans changer de colonne,
      //    et c'est ce qui permet de suivre qui monte.
      if (envol > 0) {
        ctx.place(id, { x: p.x, y: p.y - haut, w: p.w },
          { at: decalage, dur: tVol, ease: EASE.move });
      }
      // ② la convergence.
      ctx.place(id, { x: cx, y: cy, w: p.w },
        { at: decalage + tVol, dur: tRencontre, ease: EASE.move });
    }

    const tContact = decalage + tVol + tRencontre;
    if (mode === 'fusion' && survivant) {
      // ③ tous s'effacent au contact, sauf celui qui redescend à sa place.
      for (const id of ids) {
        if (id === survivant) continue;
        // Solidaire : ce qui est posé sur l'exemplaire absorbé s'efface avec
        // lui (voir la branche « annulation » plus bas).
        ctx.animSolidaire({ id, prop: 'opacity', to: 0, at: tContact - tRencontre * 0.35, dur: tRencontre * 0.35 });
        ctx.scene.kill(id, ctx.where);
      }
      const p = origines.get(survivant);
      ctx.place(survivant, { x: p.x, y: p.y, w: p.w },
        { at: tContact, dur: tRetour, ease: EASE.move });
      // Il reprend sa place dans le flux : le reflow de l'appelant refermera
      // les trous laissés par ses jumeaux.
    } else {
      // ③ le choc : tout part. En mode « annulation », un exemplaire survit
      //    quand le compte est impair — il n'avait personne contre qui
      //    s'annuler, et redescend là où il était.
      const impair = mode === 'annulation' && ids.length % 2 === 1;
      const rescape = impair ? ids[ids.length - 1] : null;
      const partants = ids.filter((id) => id !== rescape);
      if (souffle) {
        /* ★ Le souffle part AU CONTACT, et il part une fois — pas une par
           exemplaire. `exploser` cadence les siens quand on lui en donne
           plusieurs (deux détonations simultanées n'en font qu'une, plus
           large), et c'est exactement ce qu'on veut : les deux β arrivent
           ensemble, la couronne se déchire en deux temps très rapprochés. */
        exploser(ctx, partants, {
          at: Math.max(0, tContact - tRencontre * 0.12),
          dur: Math.max(1, tRencontre * 0.5 + tRetour),
          encre: ctx.palette.rubric,
          souffle: ctx.scenographie,
        });
        for (const id of partants) ctx.scene.kill(id, ctx.where);
      } else {
        for (const id of partants) {
          // Solidaire, pour la même raison que le souffle (`explosion.js`) :
          // une rature, un halo, tout ce qui est POSÉ sur un exemplaire s'en va
          // avec lui. Un décor qui survivrait à ce qu'il désigne désignerait le
          // vide — c'est la faute que `highlight` avait déjà corrigée sur son
          // cartouche, et qui revenait par la porte de l'annulation.
          ctx.animSolidaire({ id, prop: 'opacity', to: 0, at: tContact - tRencontre * 0.3, dur: tRencontre * 0.3 });
          ctx.animSolidaire({ id, prop: 'scale', to: 0.4, at: tContact - tRencontre * 0.3, dur: tRencontre * 0.3, ease: EASE.fade });
          ctx.scene.kill(id, ctx.where);
        }
      }
      if (rescape) {
        const p = origines.get(rescape);
        ctx.place(rescape, { x: p.x, y: p.y, w: p.w },
          { at: tContact, dur: tRetour, ease: EASE.move });
      }
    }
  });
}
