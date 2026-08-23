/**
 * `alphabet` — la conversion « lettre → rang dans l'alphabet », montrée.
 *
 * ## Le modèle est le clavier virtuel
 *
 * Le « tiret du 6 » ne se contente pas d'annoncer que `-` vaut 6 : il fait
 * monter un clavier, allume la touche, y envoie le caractère, et fait
 * redescendre le chiffre. C'est exactement ce que fait ici la réglette
 * alphabétique — et pour la même raison : `H = 8` est une **affirmation** tant
 * qu'on n'a pas vu les vingt-six cases numérotées.
 *
 * Séquence, lettre par lettre (un step par lettre — la caméra recule) :
 *
 *  1. la caméra recule, l'**alphabet complet, numéroté** monte en fondu ;
 *  2. la case de la lettre s'allume ;
 *  3. la lettre de la ligne **vole jusqu'à sa case** et s'y fond ;
 *  4. le **rang en redescend** vers la place laissée libre ;
 *  5. la réglette repart, la caméra revient.
 *
 * ## Contrôle croisé
 *
 * Comme `count` pour `sevenSeg` / `countStrokes` et comme le clavier : si
 * `to.text` ne vaut pas ce que la réglette MONTRE, la compilation échoue. Les
 * tables du moteur arithmétique (`tables/alphabet.js`) et la géométrie du
 * moteur visuel (`../assets.js`) ne peuvent donc pas diverger en silence.
 *
 * ## Caméra
 *
 * Deux rangées de treize cases, c'est large. CONTRACTS §3.2 règle 6 — on
 * n'anime **jamais** l'attribut `viewBox` : on anime le `scale` et le
 * `translate` du groupe `@camera`, et le facteur est **calculé** sur
 * l'encombrement réel.
 */

import { tokenSpec, espacementDe } from './helpers.js';
import { alphabetGeometry, findCell, alphabetValue, normalizeOrdre, ALPHABET_ORDRES } from '../assets.js';
import { CAMERA_ID, EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'alphabet';

/** Marge verticale laissée libre par la caméra, en unités viewBox. */
const PAD = 32;

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');

  if (ctx.op.ordre !== undefined && !ALPHABET_ORDRES.includes(ctx.op.ordre)) {
    fail(`${ctx.where}« ordre » = ${JSON.stringify(ctx.op.ordre)} — les deux numérotations modélisées sont ${ALPHABET_ORDRES.join(' et ')}.`);
  }
  const ordre = normalizeOrdre(ctx.op.ordre);
  const lettre = ctx.op.letter ?? ([...src.text].length === 1 ? src.text : null);
  const cell = findCell(lettre, { ordre });

  // Dégradation propre, exactement comme le clavier : une lettre hors de
  // l'alphabet latin (un chiffre, un tiret, un « é » non replié) ne fait pas
  // tomber la page. On ne met pas en scène une case qu'on ne sait pas dessiner.
  if (!cell) {
    substituerSeul(ctx, src, to);
    return;
  }

  const montre = alphabetValue(lettre, ordre);
  if (to !== null && String(montre) !== String(to.text)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais la réglette montre ${montre} `
      + `(rang de « ${cell.char} », numérotation ${ordre === 'z26a1' ? 'Z=1 … A=26' : 'A=1 … Z=26'}). `
      + 'Le moteur visuel refuse d’afficher autre chose que ce qui est montré.');
  }

  const T = ctx.dur;
  const geo = alphabetGeometry({ ordre });
  const boardPos = {
    x: ctx.layoutOpts.centerX,
    y: ctx.layoutOpts.centerY + ctx.metrics.fontSize * 1.1 + geo.height / 2,
  };
  const cellPos = { x: boardPos.x + cell.cx, y: boardPos.y + cell.lettreCy };
  const rangPos = { x: boardPos.x + cell.cx, y: boardPos.y + cell.rangCy };

  // --- caméra : reculer et recentrer, puis revenir -------------------------
  const cam = ctx.scene.get(CAMERA_ID);
  const restScale = cam.base.scale ?? 1;
  const restT = cam.base.translate ?? { x: 0, y: 0 };
  const { zoom, dy } = cadrage(ctx, geo, boardPos);
  ctx.anim({ id: CAMERA_ID, prop: 'scale', to: restScale * zoom, at: 0, dur: T * 0.16, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'translate', to: { x: restT.x, y: restT.y + dy }, at: 0, dur: T * 0.16, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'scale', to: restScale, at: T * 0.86, dur: T * 0.14, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'translate', to: restT, at: T * 0.86, dur: T * 0.14, ease: EASE.move });

  // --- 1. l'alphabet monte --------------------------------------------------
  const board = `@abc:${src.id}`;
  ctx.scene.create({
    id: board, role: 'alphabet', inFlow: false, w: geo.width,
    data: { geo, ordre },
    base: { opacity: 0, translate: { x: boardPos.x, y: boardPos.y + 28 } },
  }, { where: ctx.where });
  ctx.scene.place(board, { x: boardPos.x, y: boardPos.y + 28, w: geo.width });
  ctx.anim({ id: board, prop: 'opacity', to: 1, at: 0, dur: T * 0.16 });
  ctx.place(board, { x: boardPos.x, y: boardPos.y, w: geo.width }, { at: 0, dur: T * 0.18 });

  // --- 2. la case s'allume --------------------------------------------------
  const hid = `@cell:${src.id}`;
  ctx.scene.create({
    id: hid, role: 'halo', inFlow: false, w: cell.w,
    data: { h: cell.h, rx: 5, tone: 'gold' },
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(hid, { x: boardPos.x + cell.cx, y: boardPos.y + cell.cy, w: cell.w });
  ctx.anim({ id: hid, prop: 'opacity', to: 0.4, at: T * 0.24, dur: T * 0.14 });

  // --- 3. la lettre vole jusqu'à sa case -----------------------------------
  ctx.anim({ id: src.id, prop: 'translate', to: cellPos, at: T * 0.2, dur: T * 0.26, ease: EASE.move });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: T * 0.44, dur: T * 0.12 });

  if (!to) {
    ctx.anim({ id: hid, prop: 'opacity', to: 0, at: T * 0.84, dur: T * 0.14 });
    ctx.anim({ id: board, prop: 'opacity', to: 0, at: T * 0.84, dur: T * 0.16 });
    return;
  }

  // --- 4. le rang en redescend ---------------------------------------------
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'number', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, rangPos);
  ctx.scene.kill(src.id, ctx.where);

  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: T * 0.5, dur: T * 0.1 });
  ctx.anim({ id: to.id, prop: 'scale', values: [0.8, 1.25, 1], offsets: [0, 0.55, 1], at: T * 0.5, dur: T * 0.3, ease: EASE.pop });
  ctx.reflow({ at: T * 0.58, dur: T * 0.26, ease: EASE.move });

  // --- 5. la réglette repart ------------------------------------------------
  ctx.anim({ id: hid, prop: 'opacity', to: 0, at: T * 0.84, dur: T * 0.14 });
  ctx.anim({ id: board, prop: 'opacity', to: 0, at: T * 0.84, dur: T * 0.16 });
}

/**
 * Facteur de recul et recentrage. Calculé sur l'encombrement réel — deux
 * rangées de treize cases ne tiennent pas dans le cadrage d'une ligne de texte.
 */
function cadrage(ctx, geo, boardPos) {
  const o = ctx.layoutOpts;
  const fs = ctx.metrics.fontSize;
  const haut = Math.min(o.centerY - fs, boardPos.y - geo.height / 2);
  const bas = Math.max(o.centerY + fs, boardPos.y + geo.height / 2);
  const hauteur = Math.max(1, bas - haut);
  const auto = Math.min(1, o.maxWidth / geo.width, (o.viewBox.h - 2 * PAD) / hauteur);
  const zoom = typeof ctx.op.zoom === 'number' ? ctx.op.zoom : round(auto);
  // `translate` s'applique AVANT `scale` (ordre CSS des propriétés
  // individuelles) : il subit donc le facteur, d'où la division.
  const dy = round((o.centerY - (haut + bas) / 2) / zoom);
  return { zoom, dy };
}

/** Repli sans réglette : la lettre s'efface, le nombre prend sa place. */
function substituerSeul(ctx, src, to) {
  const T = ctx.dur;
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: 0, dur: T * 0.3 });
  if (!to) return;
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'number', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, ctx.scene.pos(src.id) || { x: ctx.layoutOpts.centerX, y: ctx.layoutOpts.centerY });
  ctx.scene.kill(src.id, ctx.where);
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: T * 0.35, dur: T * 0.25 });
  ctx.reflow({ at: T * 0.6, dur: T * 0.4, ease: EASE.move });
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
