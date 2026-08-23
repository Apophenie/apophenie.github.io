/**
 * `sevenSeg` — la lettre passe à l'afficheur sept segments, et on compte.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * L'ancien rendu empilait, **au-dessus de chaque lettre de la ligne**, un tracé
 * de référence fantôme, un afficheur, et des badges numérotés semés autour :
 * quatre lettres côte à côte donnaient quatre petits chantiers simultanés,
 * illisibles. On tient désormais la grammaire commune de `encart.js` :
 *
 *  1. la lettre **monte dans un encart**, seule, au centre ;
 *  2. elle y **change de police** : le glyphe typographique se fond dans
 *     l'afficheur, dont les sept segments sont d'abord tous éteints, en
 *     fantôme — on voit ce qui *pourrait* s'allumer ;
 *  3. un **compteur** paraît à côté, à zéro ;
 *  4. les segments **s'allument un par un**, et chacun fait monter le compteur ;
 *  5. le nombre du compteur **descend remplacer la lettre** dans la ligne.
 *
 * Le stagger suit les **traits continus fusionnés** (`b`+`c`, `e`+`f`) quand
 * `fusion` est demandé, les segments individuels sinon. C'est la méthode 5 du
 * README, et le spectateur voit littéralement pourquoi `H = 3 traits`.
 *
 * ## Contrôle croisé
 *
 * `count` est le garde-fou de CONTRACTS §0.3 : si le scénario annonce un nombre
 * différent de celui que l'afficheur ALLUME réellement, la compilation échoue.
 * Le moteur visuel refuse d'afficher autre chose que ce qui est compté.
 *
 * Recherche §4.10 : on ne morphe **pas** l'attribut `d` (non Baseline en CSS).
 * L'afficheur est pré-dessiné — sept `<path>` fixes, pilotés par `opacity` et
 * `stroke`.
 */

import { SEGMENTS, SEGMENT_ORDER, fusedStrokes } from '../assets.js';
import { tokenSpec } from './helpers.js';
import { ouvrirEncart, poserCompteur, refermerEncart, ENCART } from './encart.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'sevenSeg';

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const segments = ctx.op.segments;
  if (typeof segments !== 'string' || !segments || !/^[a-g]+$/.test(segments)) {
    fail(`${ctx.where}« segments » doit être une chaîne de segments allumés parmi a…g (ex. « bcefg » pour H). Reçu : ${JSON.stringify(segments)}.`);
  }
  const on = new Set([...segments]);
  const fusion = ctx.op.fusion !== false;
  const strokes = fusedStrokes(segments);
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

  // --- 2. changement de police : les sept segments, tous éteints -----------
  const apparition = T * 0.2;
  const segIds = {};
  SEGMENT_ORDER.forEach((k) => {
    const id = `@seg:${src.id}:${k}`;
    ctx.scene.create({
      id,
      role: 'seg',
      inFlow: false,
      w: 0,
      data: { d: SEGMENTS[k].d, segment: k, lit: on.has(k), scale: ENCART.zoomGlyphe },
      base: { opacity: 0, stroke: ctx.palette.fg3 },
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
    ? strokes.map((s) => ({ key: s, members: SEGMENT_ORDER.filter((k) => on.has(k) && SEGMENTS[k].stroke === s) }))
    : SEGMENT_ORDER.filter((k) => on.has(k)).map((k) => ({ key: k, members: [k] }));

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
      ctx.anim({ id: segIds[k], prop: 'stroke', to: ctx.palette.phos, at: a, dur: Math.max(1, cadence * 0.6) });
    }
  });

  // --- 5. le nombre du compteur remplace la lettre -------------------------
  refermerEncart(ctx, {
    src,
    to,
    compteur,
    encart,
    montres: SEGMENT_ORDER.map((k) => segIds[k]),
    at: T * 0.86,
    dur: T * 0.14,
  });
}
