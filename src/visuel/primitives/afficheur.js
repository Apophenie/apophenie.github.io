/**
 * L'afficheur à segments — le corps commun de `sevenSeg` et `fourteenSeg`.
 *
 * Les deux primitives font le MÊME geste, sur deux afficheurs différents :
 *
 * En pas à pas, un afficheur centré accueille les lettres l'une après l'autre.
 * En simultané, chaque lettre se transforme sur sa place en segments, s'estompe,
 * puis ses segments s'allument avec un compteur juste dessous. Le nombre remonte
 * sur la ligne après le dernier allumage. Un seul titre annonce toute la vague.
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

import { tokenSpec, espacementDe, ancreVue } from './helpers.js';
import {
  ouvrirEncart, poserCompteur, refermerEncart, replierLaFamille, ENCART,
} from './encart.js';
import { decorEnLAir } from './decor.js';
import { EASE } from '../constants.js';
import { ONDE_SIMULTANE } from '../rythme.js';
import { fail } from '../errors.js';

/** Opacité de l'afficheur ÉTEINT — ce qui *pourrait* s'allumer. */
const FANTOME = 0.14;

/**
 * @param {object} ctx
 * @param {{nom:string, SEGMENTS:object, PLEINS:object, ORDER:string[],
 *          fusedStrokes:Function, lire:Function, largeur?:number}} modele
 */
export function planAfficheur(ctx, modele) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  if (ctx.op.titre !== undefined && typeof ctx.op.titre !== 'string') {
    fail(`${ctx.where}« titre » doit être une chaîne — le nom de l'outil, déjà traduit, tel que le catalogue le porte.`);
  }
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
  if (ctx.rythme === 'simultane' && !ctx.reduced) {
    planSurPlace(ctx, { src, to, modele, geometrie, canal, on, strokes, fusion, T });
    return;
  }

  // Le mode pas à pas garde le même cadre, les mêmes segments et le même titre
  // pendant la série. L'identité de la famille comprend le modèle, le régime
  // de comptage et le titre ; deux outils distincts ne se partagent rien.
  const titre = typeof ctx.op.titre === 'string' ? ctx.op.titre.trim() : '';
  const famille = `${modele.nom}:${plein ? 'segments' : 'traits'}${titre ? `:${titre}` : ''}`;
  const cle = famille;
  // Le nœud n'est jamais retiré du DOM (CONTRACTS §3.2 règle 7) : « il existe »
  // ne veut pas dire « il est visible ». C'est l'état NOTÉ qui fait foi, comme
  // pour la table et le clavier — sans quoi une seconde série non consécutive
  // sur le même afficheur le croirait déjà monté et jouerait dans le vide.
  const deployer = ctx.op.montre === true || !decorEnLAir(ctx, `@encart:${cle}`);
  const replier = ctx.encarts ? true : ctx.op.retire !== false;

  // --- 1. l'encart s'ouvre, la lettre y monte ------------------------------
  const encart = ouvrirEncart(ctx, src, { at: 0, dur: T * 0.12, titre, cle, famille, deployer, centreVue: true });

  // --- 2. changement de police : l'afficheur entier, tous segments éteints --
  const apparition = T * 0.2;
  const segIds = {};
  modele.ORDER.forEach((k) => {
    // En pas à pas, les segments du cadre central servent tour à tour à chaque
    // lettre. Le rendu simultané crée des segments distincts sur chaque source.
    const id = `@seg:${cle}:${k}`;
    if (!ctx.scene.has(id)) {
      ctx.scene.create({
        id,
        role: 'seg',
        inFlow: false,
        w: 0,
        data: {
          d: geometrie[k].d,
          segment: k,
          // `encart` : ce segment voyage avec son cadre quand la rangée se
          // réarrange, et s'efface avec lui quand le relais l'emporte.
          encart: encart.frame,
          scale: ENCART.zoomGlyphe,
          // Un polygone plein n'a pas d'épaisseur de trait à recevoir : il PORTE
          // la sienne, celle que la police lui donne.
          plein,
          ...(!plein && modele.largeur ? { width: modele.largeur } : {}),
        },
        base: { opacity: 0, [canal]: ctx.palette.fg3 },
      }, { where: ctx.where });
      ctx.scene.place(id, encart.centre);
    } else {
      ctx.place(id, encart.centre, { at: 0, dur: T * 0.12 });
    }
    if (encart.deployer) ctx.anim({ id, prop: 'opacity', to: FANTOME, at: apparition, dur: T * 0.1 });
    segIds[k] = id;
  });
  // La lettre s'efface pendant que l'afficheur paraît : c'est le fondu d'une
  // police vers l'autre, sur le même point d'ancrage.
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: apparition, dur: T * 0.1, ease: EASE.fade });

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
    total: groupes.length, debut, cadence, encart: encart.frame,
  });

  groupes.forEach((g, i) => {
    const a = debut + i * cadence;
    for (const k of g.members) {
      ctx.anim({ id: segIds[k], prop: 'opacity', to: 1, at: a, dur: Math.max(1, cadence * 0.6) });
      ctx.anim({ id: segIds[k], prop: canal, to: ctx.palette.phos, at: a, dur: Math.max(1, cadence * 0.6) });
    }
  });

  // --- 5. le nombre du compteur remplace la lettre -------------------------
  //
  // La dernière lettre referme le cadre. Entre deux lettres, seuls les segments
  // allumés retournent à l'état fantôme : le titre et le cadre restent visibles.
  refermerEncart(ctx, {
    src,
    to,
    compteur,
    encart,
    replier,
    montres: replier ? modele.ORDER.map((k) => segIds[k]) : [],
    at: T * 0.86,
    dur: T * 0.14,
  });
  // La dernière conversion retire le cadre central et tous ses satellites.
  if (replier && !ctx.encarts) replierLaFamille(ctx, famille, { at: T * 0.86, dur: T * 0.14 });
  // Les segments allumés reprennent la couleur de l'éteint — et, si l'afficheur
  // reste en place, l'opacité du fantôme. C'est vrai même quand tout s'efface :
  // le décor n'est pas détruit, il est rangé, et il doit être rangé PROPRE pour
  // qu'une série ultérieure le retrouve tel qu'il paraît la première fois.
  for (const g of groupes) {
    for (const k of g.members) {
      if (!replier) ctx.anim({ id: segIds[k], prop: 'opacity', to: FANTOME, at: T * 0.9, dur: T * 0.1 });
      ctx.anim({ id: segIds[k], prop: canal, to: ctx.palette.fg3, at: T * 0.9, dur: T * 0.1 });
    }
  }
}

/** En simultané, chaque lettre devient son propre afficheur, sur la ligne. */
function planSurPlace(ctx, { src, to, modele, geometrie, canal, on, strokes, fusion, T }) {
  const pos = ctx.scene.pos(src.id);
  const fs = ctx.metrics.fontSize;
  const titre = typeof ctx.op.titre === 'string' ? ctx.op.titre.trim() : '';
  if (titre && (!ctx.vagueSegments || ctx.rangVague === 0)) {
    const id = ctx.gensym('titreSegments');
    const centre = ancreVue(ctx);
    ctx.scene.create({
      id, role: 'label', text: titre, inFlow: false,
      w: ctx.metrics.advance * 0.55 * [...titre].length,
      data: { scale: 0.6 }, base: { opacity: 0, fill: ctx.palette.fg2 },
    }, { where: ctx.where });
    ctx.scene.place(id, { x: centre.x, y: centre.y - fs * 2.35 });
    ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: T * 0.1 });
    const derniere = ctx.vagueSegments
      ? (ctx.nombreDansVague - 1) * ONDE_SIMULTANE / ctx.speed : 0;
    ctx.anim({ id, prop: 'opacity', to: 0, at: derniere + T * 0.88, dur: T * 0.1 });
  }

  const groupes = fusion
    ? strokes.map((s) => ({ members: modele.ORDER.filter((k) => on.has(k) && modele.SEGMENTS[k].stroke === s) }))
    : modele.ORDER.filter((k) => on.has(k)).map((k) => ({ members: [k] }));
  const segIds = {};
  for (const k of modele.ORDER) {
    const id = `@seg:${modele.nom}:${src.id}:${k}`;
    ctx.scene.create({
      id, role: 'seg', inFlow: false, w: 0,
      data: { d: geometrie[k].d, segment: k, scale: 1.05,
        plein: !fusion, ...(!fusion && modele.largeur ? { width: modele.largeur } : {}) },
      base: { opacity: 0, [canal]: ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(id, pos);
    segIds[k] = id;
    // La forme segmentée remplace la lettre à l'endroit même où elle se lit.
    ctx.anim({ id, prop: 'opacity', to: on.has(k) ? 1 : FANTOME,
      at: T * 0.12, dur: T * 0.12 });
    if (on.has(k)) ctx.anim({ id, prop: 'opacity', to: FANTOME,
      at: T * 0.27, dur: T * 0.09 });
  }
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: T * 0.12, dur: T * 0.12 });

  const debut = T * 0.4;
  const cadence = T * 0.4 / Math.max(1, groupes.length);
  const compteur = `@compteur:${src.id}`;
  poserCompteur(ctx, {
    id: compteur, centre: pos, position: { x: pos.x, y: pos.y + fs * 1.35 },
    total: groupes.length, debut, cadence,
  });
  groupes.forEach((g, i) => {
    const at = debut + i * cadence;
    for (const k of g.members) {
      ctx.anim({ id: segIds[k], prop: 'opacity', to: 1, at, dur: cadence * 0.55 });
      ctx.anim({ id: segIds[k], prop: canal, to: ctx.palette.phos, at, dur: cadence * 0.55 });
    }
  });
  for (const k of modele.ORDER) {
    ctx.anim({ id: segIds[k], prop: 'opacity', to: 0, at: T * 0.84, dur: T * 0.1 });
  }
  if (!to) {
    ctx.anim({ id: src.id, prop: 'opacity', to: 1, at: T * 0.86, dur: T * 0.1 });
    ctx.anim({ id: compteur, prop: 'opacity', to: 0, at: T * 0.88, dur: T * 0.1 });
    return;
  }

  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'number', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  const depart = ctx.scene.pos(compteur);
  ctx.scene.place(to.id, depart);
  ctx.scene.kill(src.id, ctx.where);
  ctx.anim({ id: compteur, prop: 'opacity', to: 0, at: T * 0.88, dur: T * 0.1 });
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: T * 0.87, dur: T * 0.08 });
  if (ctx.vagueSegments) ctx.place(to.id, pos, { at: T * 0.87, dur: T * 0.12, ease: EASE.move });
  else ctx.reflow({ at: T * 0.87, dur: T * 0.12, ease: EASE.move });
}
