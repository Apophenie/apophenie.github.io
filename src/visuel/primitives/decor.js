/**
 * Le GESTE DU DÉCOR — commun au clavier et à la table de correspondance.
 *
 * ## Pourquoi un module, et pas deux copies
 *
 * `keyboard` et `table` restent **deux primitives distinctes**, et elles le
 * méritent : un clavier est un objet physique avec ses trois mesures (la
 * touche, la colonne, la rangée) ; une table est une correspondance abstraite
 * qu'on met en page. Mais leur GESTE est le même mot à mot :
 *
 *   *le décor monte, la case cible s'allume, le caractère passe PAR-DESSUS
 *   elle, puis la valeur en redescend prendre sa place.*
 *
 * Tant que ce geste était écrit deux fois, il a divergé deux fois — et la
 * version du clavier était la bonne. Il est donc écrit **ici, une fois**, et
 * les deux primitives l'appellent. Deux gestes ne peuvent plus se contredire,
 * et améliorer l'un améliore l'autre.
 *
 * ## ★ Ce que le clavier faisait de mieux, et qui devient la règle
 *
 * 1. **Le caractère passe par-dessus le décor**, jamais dessous. Le décor vit
 *    dans la couche `back` (`dom.js`, `LAYER_OF`), les jetons de texte dans
 *    `mid` : la superposition est structurelle, pas une question d'ordre
 *    d'insertion. Un caractère qui s'enfonce derrière la table est illisible
 *    au moment précis où il faudrait le suivre.
 * 2. **La case s'allume quand le caractère arrive**, pas avant qu'il parte.
 *    L'illumination devient alors la CONSÉQUENCE de l'arrivée — le caractère
 *    allume sa case — au lieu d'être un indice donné d'avance.
 * 3. **Le caractère reste opaque jusqu'à l'atterrissage** : il ne s'efface
 *    qu'une fois posé sur la case, là où on peut lire les deux ensemble.
 *
 * ## ★ Le décor se mutualise, le geste non
 *
 * Quand plusieurs conversions consécutives emploient le MÊME décor, celui-ci
 * reste monté d'une étape à l'autre : `montre` sur la première, `retire` sur la
 * dernière, rien entre les deux (`mutualiserDecor`, `src/recherche/
 * scenario.js`). L'aller-retour, lui, ne se mutualise jamais : une lettre part,
 * sa valeur revient, PUIS la suivante — sans quoi on ne verrait plus quelle
 * lettre a donné quel nombre.
 *
 * Le nœud du décor n'est jamais retiré du DOM (CONTRACTS §3.2 règle 7) et
 * chaque fondu est `forwards` : revenir en arrière sur une étape intermédiaire
 * ne fait pas clignoter le décor, puisque aucune animation ne le touche.
 */

import { espacementDe } from './helpers.js';
import { CAMERA_ID, EASE } from '../constants.js';

/**
 * ★ La partition du geste, en fractions de la durée d'op — **une seule pour
 * les deux primitives**. Les valeurs viennent du clavier, dont l'auteur a jugé
 * le geste « bien plus lisible que les autres ».
 *
 * Lu de gauche à droite : le décor monte (0 → .22, quand il monte), le
 * caractère vole (.24), la case s'allume à mi-vol et reste allumée pendant que
 * la valeur naît (.14 → .32), le caractère ne s'efface qu'en arrivant (.20),
 * la valeur paraît et la ligne se referme (.30 → .62), puis le décor se retire.
 */
export const TEMPS = Object.freeze({
  MONTEE: 0.22,
  RETRAIT: 0.18,
  // le décor
  DECOR_FONDU: 0.16,
  DECOR_GLISSE: 0.20,
  CAMERA: 0.18,
  // la case
  HALO: 0.14,
  HALO_DUR: 0.18,
  HALO_OPACITE: 0.42,
  HALO_OFF: 0.50,
  HALO_OFF_DUR: 0.16,
  // le caractère
  VOL: 0.24,
  EFFACE: 0.20,
  EFFACE_DUR: 0.14,
  // la valeur
  VALEUR: 0.30,
  VALEUR_DUR: 0.12,
  REFLOW: 0.36,
  REFLOW_DUR: 0.26,
  // la fin de l'aller-retour, d'où part le repli
  FIN: 0.62,
});

/** Le décalage vertical d'où le décor monte, en unités viewBox. */
const MONTE_DE = 28;

/**
 * ★ LE NOM DE L'OUTIL, SOUS LE DÉCOR.
 *
 * « Titrer les outils dans la scène, pour qu'on sache en plein écran quel outil
 * est utilisé » (l'auteur). En plein écran, la scène est tout ce qu'on voit :
 * Le Registre, qui porte le libellé de l'étape, n'y est plus. Une grille de
 * vingt-six cases sans nom ne dit pas de quelle méthode elle est la preuve.
 *
 * ★ Le nom vient du CATALOGUE (`moteur/transformations/commun.js › def`, champ
 * « outil ») et voyage dans l'op, déjà traduit. Il n'est écrit nulle part ici :
 * une scène qui recopierait « Miroir Atbash » serait une seconde source de
 * vérité, et renommer l'opérateur laisserait la scène annoncer l'ancien nom.
 *
 * ★ Il se pose du côté OPPOSÉ à la ligne — sous la table et sous le clavier,
 * qui sont dessous ; au-dessus de l'encart de comptage, qui est dessus
 * (`encart.js`). Le titre ne s'interpose donc jamais entre la ligne et l'objet
 * qu'elle interroge.
 */
const TITRE = Object.freeze({
  /** Taille du texte, en fraction de la police des jetons. */
  taille: 0.5,
  /** Distance entre le bas du décor et l'axe du titre, en fraction de police. */
  ecart: 0.52,
});

/** L'identifiant du titre d'un décor — dérivé du décor, comme tout le reste. */
const idTitre = (board) => `${board}:titre`;

/**
 * Ce que le titre ajoute à l'encombrement du décor : la caméra doit le faire
 * tenir, sans quoi il tomberait hors du cadre au moment précis où l'on recule
 * pour tout voir.
 */
function avecTitre(ctx, spec) {
  const texte = typeof spec.titre === 'string' ? spec.titre.trim() : '';
  if (!texte) return { texte: '', encombrement: spec.encombrement, y: 0 };
  const fs = ctx.metrics.fontSize;
  const y = spec.encombrement.bas + fs * TITRE.ecart;
  return {
    texte,
    y,
    encombrement: { ...spec.encombrement, bas: y + fs * TITRE.taille * 0.6 },
  };
}

/**
 * Le décor est-il actuellement EN L'AIR ?
 *
 * Le nœud n'est jamais retiré du DOM (CONTRACTS §3.2 règle 7) : « il existe »
 * ne veut donc pas dire « il est visible ». On note l'état sur le nœud, au fil
 * de la compilation, pour qu'une op isolée reste autosuffisante : deux
 * conversions non consécutives sur le même décor le redéploient chacune, sans
 * que l'émetteur ait à y penser.
 */
export function decorEnLAir(ctx, id) {
  const n = ctx.scene.has(id) ? ctx.scene.get(id) : null;
  return !!(n && n.data && n.data.deploye);
}

/**
 * Monte le décor — ou le retrouve déjà monté — et cadre la caméra.
 *
 * @param {object} ctx
 * @param {object} spec
 * @param {string} spec.id          identité DÉRIVÉE du dessin (deux dessins
 *                                  identiques partagent le nœud, deux dessins
 *                                  différents ne peuvent pas se confondre)
 * @param {string} spec.role        `'keyboard'` ou `'table'` — la couche `back`
 * @param {object} spec.data        ce dont `dom.js` a besoin pour dessiner
 * @param {{x:number,y:number}} spec.pos   centre du décor, en coordonnées scène
 * @param {number} spec.width       encombrement horizontal du dessin
 * @param {boolean} spec.deployer   faut-il le faire monter maintenant ?
 * @param {string} [spec.titre]     le nom de l'OUTIL, déjà traduit, tel que le
 *                                  catalogue le porte — affiché sous le décor
 *                                  (voir `TITRE`, plus haut)
 * @param {{haut:number,bas:number,largeur:number,pad:number}} spec.encombrement
 *        ce que la caméra doit faire tenir — calculé par l'appelant, qui seul
 *        sait qu'une réglette dépasse en haut ou qu'une rangée dépasse à gauche
 * @returns {number} `t0`, l'instant où l'aller-retour peut commencer
 */
export function monterDecor(ctx, spec) {
  const T = ctx.dur;
  const { id, pos, width } = spec;
  const titre = avecTitre(ctx, spec);
  if (!ctx.scene.has(id)) {
    ctx.scene.create({
      id, role: spec.role, inFlow: false, w: width, data: spec.data,
      base: { opacity: 0, translate: { x: pos.x, y: pos.y + MONTE_DE } },
    }, { where: ctx.where });
    ctx.scene.place(id, { x: pos.x, y: pos.y + MONTE_DE, w: width });
  }
  if (titre.texte && !ctx.scene.has(idTitre(id))) {
    ctx.scene.create({
      id: idTitre(id), role: 'label', text: titre.texte, inFlow: false,
      w: ctx.metrics.advance * TITRE.taille * [...titre.texte].length,
      data: { scale: TITRE.taille },
      base: { opacity: 0, translate: { x: pos.x, y: titre.y + MONTE_DE }, fill: ctx.palette.fg2 },
    }, { where: ctx.where });
    ctx.scene.place(idTitre(id), { x: pos.x, y: titre.y + MONTE_DE });
  }

  if (spec.deployer) {
    const cam = ctx.scene.get(CAMERA_ID);
    const { zoom, dy } = cadrage(ctx, titre.encombrement);
    const restScale = cam.base.scale ?? 1;
    const restT = cam.base.translate ?? { x: 0, y: 0 };
    ctx.anim({ id: CAMERA_ID, prop: 'scale', to: restScale * zoom, at: 0, dur: T * TEMPS.CAMERA, ease: EASE.move });
    ctx.anim({ id: CAMERA_ID, prop: 'translate', to: { x: restT.x, y: restT.y + dy }, at: 0, dur: T * TEMPS.CAMERA, ease: EASE.move });
    ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: T * TEMPS.DECOR_FONDU });
    // ★ LE NOM ARRIVE APRÈS LA DÉMONSTRATION, quand elle en a une.
    //
    //   Un décor qui se contente de paraître peut porter son nom tout de suite :
    //   la réglette du leetspeak est ce qu'elle est dès qu'on la voit. Une
    //   GLISSIÈRE, elle, se démontre — la bande du bas paraît alignée sur celle
    //   du haut, puis se déplace —, et la nommer avant serait donner la réponse
    //   avant la question. « Alphabet simple, puis doublon qui en sort, puis
    //   coulissement, PUIS libellé » (l'auteur) : le nom conclut le geste, il ne
    //   l'annonce pas.
    const titreAt = typeof spec.titreAt === 'number' ? spec.titreAt : 0;
    if (titre.texte) ctx.anim({ id: idTitre(id), prop: 'opacity', to: 1, at: titreAt, dur: T * TEMPS.DECOR_FONDU });
  }
  // Déjà monté ou non, le décor suit la VUE : si la ligne a défilé entre deux
  // étapes, le milieu de l'écran n'est plus celui de la scène. Le titre est
  // solidaire du décor qu'il nomme — il le suit du même mouvement.
  ctx.place(id, { x: pos.x, y: pos.y, w: width }, { at: 0, dur: T * TEMPS.DECOR_GLISSE });
  if (titre.texte) {
    ctx.place(idTitre(id), { x: pos.x, y: titre.y }, { at: 0, dur: T * TEMPS.DECOR_GLISSE });
  }
  ctx.scene.get(id).data.deploye = true;

  return spec.deployer ? T * TEMPS.MONTEE : 0;
}

/**
 * L'aller-retour d'UN caractère — le geste, en entier, pour lui seul.
 *
 * @param {object} ctx
 * @param {object} spec
 * @param {object} spec.src      le jeton de départ (déjà résolu et vivant)
 * @param {object|null} spec.to  le jeton d'arrivée, ou `null` (on ne fait alors
 *                               que montrer, sans substituer)
 * @param {number} spec.t0       l'instant de départ, rendu par `monterDecor`
 * @param {{id:string,w:number,h:number,rx:number,x:number,y:number}} spec.case
 *        la case à allumer, en coordonnées scène
 * @param {{x:number,y:number}} spec.arrivee  où le caractère se pose
 * @param {{x:number,y:number}} spec.source   d'où la valeur redescend — ce n'est
 *        PAS toujours la case : sur le clavier en mesure « colonne », c'est la
 *        réglette ; en réglette de table, c'est la ligne du bas de la case
 * @param {string} [spec.kind]   `kind` par défaut du jeton d'arrivée
 * @returns {number} l'instant où l'aller-retour est fini (le repli peut suivre)
 */
export function allerRetour(ctx, spec) {
  const T = ctx.dur;
  const { src, to, t0 } = spec;

  // ── la case s'allume — À MI-VOL, quand le caractère arrive dessus ────────
  const c = spec.case;
  ctx.scene.create({
    id: c.id, role: 'halo', inFlow: false, w: c.w,
    data: { h: c.h, rx: c.rx ?? 6, tone: 'gold' },
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(c.id, { x: c.x, y: c.y, w: c.w });
  ctx.anim({ id: c.id, prop: 'opacity', to: TEMPS.HALO_OPACITE, at: t0 + T * TEMPS.HALO, dur: T * TEMPS.HALO_DUR });

  // ── le caractère vole PAR-DESSUS le décor, et ne s'efface qu'en arrivant ─
  ctx.anim({ id: src.id, prop: 'translate', to: spec.arrivee, at: t0, dur: T * TEMPS.VOL, ease: EASE.move });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: t0 + T * TEMPS.EFFACE, dur: T * TEMPS.EFFACE_DUR });
  // Un halo posé sur le jeton par une étape précédente s'en va avec lui : sans
  // ça, il resterait seul dans la ligne, orphelin de ce qu'il désignait.
  effacerHaloDe(ctx, src.id, t0 + T * TEMPS.EFFACE, T * TEMPS.EFFACE_DUR);

  if (!to) {
    ctx.anim({ id: c.id, prop: 'opacity', to: 0, at: t0 + T * TEMPS.HALO_OFF, dur: T * TEMPS.HALO_OFF_DUR });
    return t0 + T * TEMPS.FIN;
  }

  // ── … et la valeur en redescend AUSSITÔT, à la place laissée libre ───────
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || spec.kind || 'number', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, spec.source);
  ctx.scene.kill(src.id, ctx.where);

  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: t0 + T * TEMPS.VALEUR, dur: T * TEMPS.VALEUR_DUR });
  ctx.anim({
    id: to.id, prop: 'scale', values: [0.8, 1.25, 1], offsets: [0, 0.55, 1],
    at: t0 + T * TEMPS.REFLOW, dur: T * TEMPS.REFLOW_DUR, ease: EASE.pop,
  });
  ctx.reflow({ at: t0 + T * TEMPS.REFLOW, dur: T * TEMPS.REFLOW_DUR, ease: EASE.move });
  ctx.anim({ id: c.id, prop: 'opacity', to: 0, at: t0 + T * TEMPS.HALO_OFF, dur: T * TEMPS.HALO_OFF_DUR });

  return t0 + T * TEMPS.FIN;
}

/** Le décor redescend et la caméra revient : le dernier temps, s'il a lieu. */
export function replierDecor(ctx, id, at) {
  const T = ctx.dur;
  const cam = ctx.scene.get(CAMERA_ID);
  ctx.scene.get(id).data.deploye = false;
  ctx.anim({ id, prop: 'opacity', to: 0, at, dur: T * TEMPS.DECOR_FONDU });
  // Le titre s'en va avec ce qu'il nomme : un nom d'outil qui survivrait à son
  // outil désignerait le vide.
  if (ctx.scene.has(idTitre(id))) {
    ctx.anim({ id: idTitre(id), prop: 'opacity', to: 0, at, dur: T * TEMPS.DECOR_FONDU });
  }
  for (const sid of (ctx.scene.get(id).data.bande || [])) {
    ctx.anim({ id: sid, prop: 'opacity', to: 0, at, dur: T * TEMPS.DECOR_FONDU });
  }
  ctx.anim({ id: CAMERA_ID, prop: 'scale', to: cam.base.scale ?? 1, at: at + T * 0.02, dur: T * TEMPS.CAMERA, ease: EASE.move });
  ctx.anim({
    id: CAMERA_ID, prop: 'translate', to: cam.base.translate ?? { x: 0, y: 0 },
    at: at + T * 0.02, dur: T * TEMPS.RETRAIT * 0.9, ease: EASE.move,
  });
}

/**
 * Repli sans décor : le caractère s'efface, la valeur prend sa place.
 *
 * On ne met pas en scène une case qu'on ne sait pas dessiner — un caractère
 * hors du clavier modélisé, un « é » non replié — mais on ne fait pas non plus
 * tomber la page : la substitution se joue seule, sans caméra ni halo.
 */
export function substituerSeul(ctx, src, to, kindDefaut = 'number') {
  const T = ctx.dur;
  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at: 0, dur: T * 0.3 });
  effacerHaloDe(ctx, src.id, 0, T * 0.3);
  if (!to) return;
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || kindDefaut, group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, ctx.scene.pos(src.id) || { x: ctx.layoutOpts.centerX, y: ctx.layoutOpts.centerY });
  ctx.scene.kill(src.id, ctx.where);
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: T * 0.35, dur: T * 0.25 });
  ctx.reflow({ at: T * 0.6, dur: T * 0.4, ease: EASE.move });
}

/** Le halo d'un jeton consommé s'en va avec lui (même contrat que `substitute`). */
function effacerHaloDe(ctx, id, at, dur) {
  const halo = `@halo:${id}`;
  if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur });
}

/**
 * Facteur de recul et recentrage de la caméra.
 *
 * CONTRACTS §3.2 règle 6 — on n'anime **jamais** l'attribut `viewBox` : on
 * anime le `scale` et le `translate` du groupe `@camera`, et le facteur est
 * **calculé** sur l'encombrement réel, jamais deviné. Un clavier de quatre
 * rangées ou une réglette de vingt-six cases ne tiennent pas dans le cadrage
 * d'une ligne de texte.
 */
function cadrage(ctx, encombrement) {
  const o = ctx.layoutOpts;
  const fs = ctx.metrics.fontSize;
  const haut = Math.min(o.centerY - fs, encombrement.haut);
  const bas = Math.max(o.centerY + fs, encombrement.bas);
  const hauteur = Math.max(1, bas - haut);
  const auto = Math.min(1, o.maxWidth / encombrement.largeur, (o.viewBox.h - 2 * encombrement.pad) / hauteur);
  const zoom = typeof ctx.op.zoom === 'number' ? ctx.op.zoom : round(auto);
  // `translate` s'applique AVANT `scale` (ordre CSS des propriétés
  // individuelles) : il subit donc le facteur, d'où la division.
  const dy = round((o.centerY - (haut + bas) / 2) / zoom);
  return { zoom, dy };
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
