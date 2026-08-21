/**
 * `keyboard` — superposition d'un clavier, AZERTY ou QWERTY.
 *
 * Recherche §4.12 : le clavier monte en fondu, la touche concernée s'illumine,
 * le caractère de la saisie **vole** vers elle, le nombre en redescend, puis le
 * clavier disparaît.
 *
 * ## Trois mesures, trois choses éclairées
 *
 * | `mesure`    | ce qu'on éclaire        | ce qui redescend            |
 * |-------------|-------------------------|-----------------------------|
 * | `'touche'`  | une touche              | le chiffre de la touche     |
 * | `'colonne'` | toute la colonne        | **l'index de la réglette**  |
 * | `'rangee'`  | toute la rangée         | le numéro en marge          |
 *
 * ★ Le piège de la colonne. Le `p` est en **colonne 10** alors que la touche
 * au-dessus de lui porte `0`. Faire descendre le label de la touche du dessus
 * afficherait 0 là où l'arithmétique dit 10. C'est donc la **réglette numérotée
 * de 1 à 10** qui est la source du nombre, et le halo couvre la colonne entière,
 * réglette comprise.
 *
 * ★ La rangée se montre **sans** la rangée de chiffres : la mesure vaut 1, 2 ou
 * 3, et afficher une quatrième rangée au-dessus laisserait croire qu'elle compte.
 *
 * ## Contrôle croisé
 *
 * Comme `count` pour `sevenSeg` et `countStrokes` : si `to.text` ne vaut pas ce
 * que le clavier MONTRE, la compilation échoue. C'est ce qui empêche les tables
 * de `src/moteur/tables/claviers.js` et la géométrie de `../assets.js` de
 * diverger en silence.
 *
 * ## Caméra
 *
 * Quatre rangées, c'est large ET haut. CONTRACTS §3.2 règle 6 — on n'anime
 * **jamais** l'attribut `viewBox` : on anime le `scale` et le `translate` du
 * groupe `@camera`. Le facteur est **calculé** à partir de l'encombrement réel,
 * pas deviné. Deux `keyboard` dans un même step animeraient tous deux la caméra :
 * `scenario.js` l'interdit statiquement.
 */

import { tokenSpec } from './helpers.js';
import { keyboardGeometry, findKey, keyboardValue, normalizeLayout } from '../assets.js';
import { CAMERA_ID, EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'keyboard';

/** Les trois mesures — vocabulaire fermé. */
export const MESURES = Object.freeze(['touche', 'colonne', 'rangee']);

/** Marge verticale laissée libre par la caméra, en unités viewBox. */
const PAD = 36;

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');

  if (ctx.op.layout !== undefined && !['azerty', 'qwerty'].includes(ctx.op.layout)) {
    fail(`${ctx.where}« layout » = ${JSON.stringify(ctx.op.layout)} — les deux dispositions modélisées sont « azerty » et « qwerty ».`);
  }
  const mesure = ctx.op.mesure === undefined ? 'touche' : ctx.op.mesure;
  if (!MESURES.includes(mesure)) {
    fail(`${ctx.where}« mesure » = ${JSON.stringify(mesure)} — les trois mesures sont ${MESURES.join(', ')}.`);
  }

  const layout = normalizeLayout(ctx.op.layout);
  // La rangée de chiffres est retirée quand c'est la RANGÉE qu'on mesure.
  const rows = mesure === 'rangee' ? 'lettres' : 'toutes';
  const geo = keyboardGeometry({ layout, rows });
  const label = ctx.op.key ?? src.text;
  const key = findKey(label, { layout, rows });

  // Dégradation propre : une touche inconnue ne fait plus tomber la page. Le
  // clavier n'est pas montré — il n'a rien à montrer —, la substitution se fait
  // seule. Le jeu de caractères garanti est `KEYBOARD_CHARSET` (../assets.js) :
  // c'est à l'émetteur de filtrer en amont, comme la table des glyphes le fait
  // pour `sevenSeg`.
  if (!key) {
    substituerSeul(ctx, src, to);
    return;
  }

  const montre = keyboardValue(key, mesure);
  if (montre === null) {
    fail(`${ctx.where}« ${label} » est sur une touche de lettre : elle ne partage son chiffre avec personne. La mesure « touche » ne vaut que pour la rangée du haut (& é " ' ( - è _ ç à).`);
  }
  if (to !== null && String(montre) !== String(to.text)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais le clavier montre ${montre} `
      + `(${DIT[mesure]} de « ${key.char} » en ${layout.toUpperCase()}). `
      + 'Le moteur visuel refuse d’afficher autre chose que ce qui est compté.');
  }

  const T = ctx.dur;
  const boardPos = {
    x: ctx.layoutOpts.centerX,
    y: ctx.layoutOpts.centerY + ctx.metrics.fontSize * 0.9 + geo.height / 2,
  };
  const keyPos = { x: boardPos.x + key.cx, y: boardPos.y + key.cy };
  const halo = haloDe(geo, key, mesure);
  // ★ D'où tombe le nombre : la touche, la réglette, ou la marge.
  const source = mesure === 'colonne'
    ? { x: boardPos.x + key.cx, y: boardPos.y + geo.rulerCy }
    : mesure === 'rangee'
      ? { x: boardPos.x + geo.marginCx, y: boardPos.y + geo.rowLabels[key.rangee - 1].cy }
      : keyPos;

  // --- caméra : on recule ET on recentre, puis on revient ------------------
  const cam = ctx.scene.get(CAMERA_ID);
  const restScale = cam.base.scale ?? 1;
  const restT = cam.base.translate ?? { x: 0, y: 0 };
  const { zoom, dy } = cadrage(ctx, geo, boardPos, mesure);
  ctx.anim({ id: CAMERA_ID, prop: 'scale', to: restScale * zoom, at: 0, dur: T * 0.22, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'translate', to: { x: restT.x, y: restT.y + dy }, at: 0, dur: T * 0.22, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'scale', to: restScale, at: T * 0.82, dur: T * 0.18, ease: EASE.move });
  ctx.anim({ id: CAMERA_ID, prop: 'translate', to: restT, at: T * 0.82, dur: T * 0.18, ease: EASE.move });

  // --- le clavier monte -----------------------------------------------------
  const board = `@kbd:${src.id}`;
  ctx.scene.create({
    id: board, role: 'keyboard', inFlow: false, w: geo.width,
    data: { geo, mesure, layout },
    base: { opacity: 0, translate: { x: boardPos.x, y: boardPos.y + 30 } },
  }, { where: ctx.where });
  ctx.scene.place(board, { x: boardPos.x, y: boardPos.y + 30, w: geo.width });
  ctx.anim({ id: board, prop: 'opacity', to: 1, at: 0, dur: T * 0.2 });
  ctx.place(board, { x: boardPos.x, y: boardPos.y, w: geo.width }, { at: 0, dur: T * 0.22 });

  // --- ce qu'on éclaire : une touche, une colonne, ou une rangée ------------
  const hid = `@key:${src.id}`;
  ctx.scene.create({
    id: hid, role: 'halo', inFlow: false, w: halo.w,
    data: { h: halo.h, rx: 6, tone: 'gold' },
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(hid, { x: boardPos.x + halo.cx, y: boardPos.y + halo.cy, w: halo.w });
  ctx.anim({ id: hid, prop: 'opacity', to: 0.42, at: T * 0.34, dur: T * 0.18 });

  // --- le caractère vole vers sa touche ------------------------------------
  ctx.anim({ id: src.id, prop: 'translate', to: keyPos, at: T * 0.2, dur: T * 0.24, ease: EASE.move });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: T * 0.4, dur: T * 0.14 });

  if (!to) return;

  // --- le nombre redescend vers la place laissée libre ---------------------
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'digit', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, source);
  ctx.scene.kill(src.id, ctx.where);

  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: T * 0.5, dur: T * 0.12 });
  ctx.reflow({ at: T * 0.56, dur: T * 0.26, ease: EASE.move });
  ctx.anim({ id: to.id, prop: 'scale', values: [1, 1.25, 1], offsets: [0, 0.6, 1], at: T * 0.56, dur: T * 0.26, ease: EASE.pop });

  // --- le clavier repart ----------------------------------------------------
  ctx.anim({ id: hid, prop: 'opacity', to: 0, at: T * 0.8, dur: T * 0.16 });
  ctx.anim({ id: board, prop: 'opacity', to: 0, at: T * 0.8, dur: T * 0.2 });
}

const DIT = Object.freeze({ touche: 'le chiffre', colonne: 'la colonne', rangee: 'la rangée' });

/** Boîte à éclairer, en coordonnées locales du clavier. */
function haloDe(geo, key, mesure) {
  if (mesure === 'colonne') {
    // La colonne + sa graduation sur la réglette : c'est elle la source du nombre.
    const haut = geo.rulerCy - geo.keyH * 0.34;
    const bas = geo.height / 2 + 4;
    return { cx: key.cx, cy: (haut + bas) / 2, w: key.w + 8, h: bas - haut };
  }
  if (mesure === 'rangee') {
    const gauche = geo.marginCx - geo.keyW * 0.34;
    const droite = geo.width / 2 + 4;
    return { cx: (gauche + droite) / 2, cy: key.cy, w: droite - gauche, h: key.h + 8 };
  }
  return { cx: key.cx, cy: key.cy, w: key.w, h: key.h };
}

/**
 * Facteur de recul et recentrage de la caméra.
 * Calculé sur l'encombrement réel (tokens + clavier), jamais deviné : quatre
 * rangées ne tiennent pas dans le cadrage d'une seule.
 */
function cadrage(ctx, geo, boardPos, mesure) {
  const o = ctx.layoutOpts;
  const fs = ctx.metrics.fontSize;
  const hautClavier = boardPos.y - geo.height / 2 - (mesure === 'colonne' ? geo.keyH * 0.7 : 0);
  const basClavier = boardPos.y + geo.height / 2;
  const haut = Math.min(o.centerY - fs, hautClavier);
  const bas = Math.max(o.centerY + fs, basClavier);
  const hauteur = Math.max(1, bas - haut);
  const largeur = mesure === 'rangee' ? geo.width + geo.keyW : geo.width;
  const auto = Math.min(1, o.maxWidth / largeur, (o.viewBox.h - 2 * PAD) / hauteur);
  const zoom = typeof ctx.op.zoom === 'number' ? ctx.op.zoom : round(auto);
  // `translate` est appliqué AVANT `scale` (ordre CSS des propriétés
  // individuelles) : il subit donc le facteur, d'où la division.
  const dy = round((o.centerY - (haut + bas) / 2) / zoom);
  return { zoom, dy };
}

/**
 * Repli sans clavier : le caractère s'efface, le nombre prend sa place. Aucune
 * caméra, aucun halo — on ne met pas en scène une touche qu'on ne sait pas
 * dessiner.
 */
function substituerSeul(ctx, src, to) {
  const T = ctx.dur;
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: 0, dur: T * 0.3 });
  if (!to) return;
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'digit', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
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
