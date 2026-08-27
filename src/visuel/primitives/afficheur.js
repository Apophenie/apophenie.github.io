/**
 * L'afficheur à segments — le corps commun de `sevenSeg` et `fourteenSeg`.
 *
 * Les deux primitives font le MÊME geste, sur deux afficheurs différents :
 *
 *  1. la lettre **monte dans un encart**, seule, au centre (`encart.js`) ;
 *  2. elle y **change de police** : le glyphe typographique se fond dans
 *     l'afficheur, dont tous les segments sont d'abord éteints, en fantôme —
 *     on voit ce qui *pourrait* s'allumer ;
 *  3. un **compteur** paraît à côté, à zéro ;
 *  4. les segments **s'allument un par un**, et chacun fait monter le compteur ;
 *  5. le nombre du compteur **descend remplacer la lettre** dans la ligne.
 *
 * Le stagger suit les **traits continus fusionnés** quand `fusion` est demandé,
 * les segments individuels sinon. Ce qui change d'un afficheur à l'autre n'est
 * que le **modèle** : la géométrie, l'ordre d'allumage, la règle de fusion et
 * l'épaisseur du trait. Rien d'autre — d'où ce fichier partagé plutôt que deux
 * copies qui se seraient mises à diverger.
 *
 * ## Deux régimes, deux dessins
 *
 * ★ Le régime décide de la GÉOMÉTRIE, parce qu'ils ne montrent pas la même
 * chose (assets.js, bloc « dseg ») :
 *
 * · **fusion** (`m7F`, `m14F`) — on montre que `b` et `c` n'en font qu'un. Les
 *   segments sont des traits d'AXE colinéaires et jointifs, et on les voit se
 *   souder. C'est `SEGMENTS` / `SEGMENTS14`, inchangé.
 *
 * · **comptage individuel** (`m7`, `m14`) — on les compte un par un. Deux
 *   segments qui se recouvrent seraient deux choses comptées pour une seule
 *   vue : ils sont donc DISJOINTS, et ce sont ceux de la police elle-même
 *   (`SEGMENTS_DSEG7` / `SEGMENTS_DSEG14`, dérivés de DSEG par
 *   `src/gfx/dseg-segments.py`). L'afficheur montre alors exactement ce que Le
 *   Registre affiche à côté.
 *
 * Un trait d'axe s'allume par sa couleur de `stroke`, un polygone plein par sa
 * couleur de `fill` : le canal animé suit le dessin, et c'est la seule
 * différence de traitement entre les deux régimes.
 *
 * ## Contrôle croisé
 *
 * `count` est le garde-fou de CONTRACTS §0.3 : si le scénario annonce un nombre
 * différent de celui que l'afficheur ALLUME réellement, la compilation échoue.
 * Le moteur visuel refuse d'afficher autre chose que ce qui est compté.
 *
 * Recherche §4.10 : on ne morphe **pas** l'attribut `d` (non Baseline en CSS).
 * L'afficheur est pré-dessiné — des `<path>` fixes, pilotés par `opacity` et
 * `stroke`.
 */

import { tokenSpec } from './helpers.js';
import { ouvrirEncart, poserCompteur, refermerEncart, ENCART } from './encart.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

/**
 * @param {object} ctx
 * @param {{nom:string, SEGMENTS:object, PLEINS:object, ORDER:string[],
 *          fusedStrokes:Function, lire:Function, largeur?:number}} modele
 */
export function planAfficheur(ctx, modele) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const allumes = modele.lire(ctx);
  const on = new Set(allumes);
  const fusion = ctx.op.fusion !== false;
  // Le régime choisit le dessin, et le dessin choisit le canal d'allumage.
  const plein = !fusion;
  const geometrie = plein ? modele.PLEINS : modele.SEGMENTS;
  const canal = plein ? 'fill' : 'stroke';
  const strokes = modele.fusedStrokes(allumes);
  const count = fusion ? strokes.length : on.size;
  if (ctx.op.count !== undefined && ctx.op.count !== count) {
    fail(`${ctx.where}« count » annonce ${ctx.op.count}, mais l’afficheur en montre ${count} (${fusion ? 'traits fusionnés' : 'segments'} : ${fusion ? strokes.join(', ') : [...on].join(', ')}). Le moteur visuel refuse d'afficher autre chose que ce qui est compté.`);
  }
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');
  if (to !== null && String(to.text) !== String(count)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais le compteur s'arrête à ${count}. `
      + 'Le nombre qui remplace la lettre est celui du compteur, pas un autre.');
  }

  const T = ctx.dur;

  // --- 1. l'encart s'ouvre, la lettre y monte ------------------------------
  const encart = ouvrirEncart(ctx, src, {
    at: 0, dur: T * 0.12, title: typeof ctx.op.note === 'string' ? ctx.op.note : null,
  });

  // --- 2. changement de police : l'afficheur entier, tous segments éteints --
  const apparition = T * 0.2;
  const segIds = {};
  modele.ORDER.forEach((k) => {
    const id = `@seg:${src.id}:${k}`;
    ctx.scene.create({
      id,
      role: 'seg',
      inFlow: false,
      w: 0,
      data: {
        d: geometrie[k].d,
        segment: k,
        lit: on.has(k),
        scale: ENCART.zoomGlyphe,
        // Un polygone plein n'a pas d'épaisseur de trait à recevoir : il PORTE
        // la sienne, celle que la police lui donne.
        plein,
        ...(!plein && modele.largeur ? { width: modele.largeur } : {}),
      },
      base: { opacity: 0, [canal]: ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(id, encart.centre);
    ctx.anim({ id, prop: 'opacity', to: 0.14, at: apparition, dur: T * 0.1 });
    segIds[k] = id;
  });
  // La lettre s'efface pendant que l'afficheur paraît : c'est le fondu d'une
  // police vers l'autre, sur le même point d'ancrage.
  ctx.anim({ id: src.id, prop: 'opacity', to: 0.06, at: apparition, dur: T * 0.1, ease: EASE.fade });

  // --- 3 et 4. le compteur, puis l'allumage un par un ----------------------
  const groupes = fusion
    ? strokes.map((s) => ({
      key: s,
      members: modele.ORDER.filter((k) => on.has(k) && modele.SEGMENTS[k].stroke === s),
    }))
    : modele.ORDER.filter((k) => on.has(k)).map((k) => ({ key: k, members: [k] }));

  const debut = T * 0.36;
  const fin = T * 0.82;
  const cadence = (fin - debut) / Math.max(1, groupes.length);

  const compteur = `@compteur:${src.id}`;
  poserCompteur(ctx, {
    id: compteur, centre: encart.centre, cote: encart.cote,
    total: groupes.length, debut, cadence,
  });

  groupes.forEach((g, i) => {
    const a = debut + i * cadence;
    for (const k of g.members) {
      ctx.anim({ id: segIds[k], prop: 'opacity', to: 1, at: a, dur: Math.max(1, cadence * 0.6) });
      ctx.anim({ id: segIds[k], prop: canal, to: ctx.palette.phos, at: a, dur: Math.max(1, cadence * 0.6) });
    }
  });

  // --- 5. le nombre du compteur remplace la lettre -------------------------
  refermerEncart(ctx, {
    src,
    to,
    compteur,
    encart,
    montres: modele.ORDER.map((k) => segIds[k]),
    at: T * 0.86,
    dur: T * 0.14,
  });
}
