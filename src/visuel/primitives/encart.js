/**
 * L'encart de comptage — la grammaire commune de `sevenSeg` et `countStrokes`.
 *
 * ## Une seule mécanique pour trois comptages
 *
 * Segments d'un afficheur, extrémités d'une lettre, boucles fermées : ce sont
 * trois choses différentes, comptées **du même geste**, et c'est ce geste
 * partagé qui rend les trois lisibles là où l'ancien rendu — badges numérotés
 * semés autour d'un tracé fantôme, au-dessus de chaque lettre de la ligne —
 * était surchargé et illisible.
 *
 *  1. **l'encart** — un cadre, toujours au même endroit, au-dessus de la ligne.
 *     Une lettre à la fois, jamais deux : ce qu'on regarde est désigné par le
 *     fait même d'être seul dedans ;
 *  2. **le déplacement** — la lettre quitte la ligne et monte dans l'encart, où
 *     elle grandit. Sa place reste réservée dans la ligne ;
 *  3. **le changement de police** — dans l'encart, la lettre devient l'objet
 *     qu'on va compter : l'afficheur sept segments, ou son propre tracé
 *     vectoriel ;
 *  4. **le compteur** — un grand `0` à droite de l'encart ;
 *  5. **la surbrillance progressive** — un segment, un trait, une extrémité,
 *     une boucle à la fois s'allume, et le compteur monte d'un ;
 *  6. **la substitution** — une fois tout allumé, le nombre du compteur descend
 *     prendre la place de la lettre dans la ligne.
 *
 * Le compteur passe par le canal discret (le texte n'est pas une propriété
 * CSS), avec une fonction **pure de `t`** : le scrubbing reste exact, en avant
 * comme en arrière.
 */

import { EASE } from '../constants.js';
import { espacementDe, ancreVue } from './helpers.js';

/** Géométrie de l'encart, en multiples de la taille de police. */
export const ENCART = Object.freeze({
  cote: 2.6,        // côté du cadre
  hauteur: 2.05,    // à quelle hauteur au-dessus de l'axe de la ligne
  zoomGlyphe: 2.3,  // agrandissement du tracé montré dedans
  zoomLettre: 1.9,  // agrandissement de la lettre pendant son voyage
  compteurX: 2.25,  // décalage horizontal du compteur
});

/**
 * ★ L'ENCART SE MUTUALISE, comme la table et le clavier.
 *
 * « Comme pour les tables ou claviers, pas besoin de l'effacer entre chaque
 * conversion d'affilée, tu peux garder l'afficheur d'une fois sur l'autre »
 * (l'auteur). Quatre lettres d'affilée sur le même afficheur ne justifient pas
 * quatre ouvertures et quatre fermetures : le cadre monte à la première, reste,
 * et se referme à la dernière — exactement le partage que `decor.js` organise
 * pour les deux autres décors, et pour la même raison (le DÉCOR se mutualise,
 * le GESTE jamais).
 *
 * L'identité du décor est passée par l'appelant (`cle`) : c'est ce qui décide
 * quels cadres sont « le même cadre ». Sans `cle`, l'encart reste attaché à son
 * jeton, comme avant — c'est le cas du comptage de traits, où ce qui est montré
 * dans le cadre est le tracé de la lettre elle-même.
 *
 * @param {object} ctx
 * @param {object} src  le token de la ligne
 * @param {{at:number, dur:number, titre?:string, cle?:string, deployer?:boolean}} spec
 * @returns {{frame:string, titre:?string, centre:{x:number,y:number}, cote:number,
 *            deployer:boolean}}
 */
export function ouvrirEncart(ctx, src, spec = {}) {
  const fs = ctx.metrics.fontSize;
  const cote = fs * ENCART.cote;
  const at = spec.at ?? 0;
  const dur = spec.dur ?? ctx.dur * 0.18;
  // Toujours au même endroit, au centre de la VUE : d'un jeton au suivant,
  // l'œil n'a pas à chercher où regarder. Centre de la VUE et non du viewBox —
  // quand la ligne défile, les deux ne coïncident plus (`ancreVue`).
  const vue = ancreVue(ctx);
  const centre = { x: vue.x, y: vue.y - fs * ENCART.hauteur };

  const cle = typeof spec.cle === 'string' && spec.cle ? spec.cle : null;
  const frame = cle ? `@encart:${cle}` : `@encart:${src.id}`;
  const deployer = cle === null || spec.deployer !== false || !ctx.scene.has(frame);
  if (!ctx.scene.has(frame)) {
    ctx.scene.create({
      id: frame, role: 'frame', inFlow: false, w: cote,
      data: { h: cote, rx: 8 },
      base: { opacity: 0, scale: 0.92, stroke: ctx.palette.line },
    }, { where: ctx.where });
    ctx.scene.place(frame, { x: centre.x, y: centre.y, w: cote });
  } else {
    // Déjà ouvert : il SUIT la vue, comme le fait tout décor mutualisé — si la
    // ligne a défilé entre deux lettres, le milieu de l'écran a bougé.
    ctx.place(frame, { x: centre.x, y: centre.y, w: cote }, { at, dur });
  }
  if (deployer) {
    ctx.anim({ id: frame, prop: 'opacity', to: 1, at, dur });
    ctx.anim({ id: frame, prop: 'scale', from: 0.92, to: 1, at, dur, ease: EASE.pop });
  }

  let titre = null;
  const texte = typeof spec.titre === 'string' ? spec.titre.trim() : '';
  if (texte) {
    // ★ Le nom de l'outil, AU-DESSUS du cadre — du côté opposé à la ligne, comme
    //   la table et le clavier le mettent en dessous : le titre ne s'interpose
    //   jamais entre la ligne et l'objet qui l'interroge. Il vient du catalogue
    //   (`moteur/transformations/commun.js › def`, champ « outil »), déjà
    //   traduit, et n'est écrit nulle part ici.
    titre = cle ? `${frame}:titre` : ctx.gensym('encartTitre');
    if (!ctx.scene.has(titre)) {
      ctx.scene.create({
        id: titre, role: 'label', text: texte, inFlow: false,
        w: ctx.metrics.advance * 0.55 * [...texte].length,
        data: { scale: 0.5 },
        base: { opacity: 0, fill: ctx.palette.fg2 },
      }, { where: ctx.where });
      ctx.scene.place(titre, { x: centre.x, y: centre.y - cote / 2 - fs * 0.42 });
    } else {
      ctx.place(titre, { x: centre.x, y: centre.y - cote / 2 - fs * 0.42 }, { at, dur });
    }
    if (deployer) ctx.anim({ id: titre, prop: 'opacity', to: 1, at, dur });
  }

  // L'état du décor est NOTÉ sur son nœud, au fil de la compilation : « il
  // existe » ne veut pas dire « il est visible » (CONTRACTS §3.2 règle 7).
  ctx.scene.get(frame).data.deploye = true;

  // La lettre monte dans l'encart et y grandit. Elle reste dans le flux : sa
  // place est réservée, c'est là que le nombre reviendra.
  ctx.anim({ id: src.id, prop: 'translate', to: centre, at, dur: dur * 1.5, ease: EASE.move });
  ctx.anim({ id: src.id, prop: 'scale', to: ENCART.zoomLettre, at, dur: dur * 1.5, ease: EASE.move });

  return { frame, titre, centre, cote, deployer };
}

/**
 * Pose le compteur — un grand zéro à droite de l'encart — et programme ses
 * incréments, un par élément allumé.
 *
 * @param {{centre:object, cote:number, total:number, debut:number, cadence:number,
 *          id:string, tone?:string}} spec
 * @returns {string} l'identifiant du compteur
 */
export function poserCompteur(ctx, spec) {
  const fs = ctx.metrics.fontSize;
  const tone = spec.tone || 'gold';
  const id = spec.id;
  const pos = { x: spec.centre.x + fs * ENCART.compteurX, y: spec.centre.y };

  ctx.scene.create({
    id, role: 'label', text: '0', inFlow: false,
    w: fs * 0.9,
    data: { scale: 1.15 },
    base: { opacity: 0, fill: ctx.palette[tone], scale: 0.8 },
  }, { where: ctx.where });
  ctx.scene.place(id, pos);
  const apparait = Math.max(0, spec.debut - spec.cadence * 0.6);
  ctx.anim({ id, prop: 'opacity', to: 1, at: apparait, dur: Math.max(1, spec.cadence * 0.5) });
  ctx.anim({ id, prop: 'scale', to: 1, at: apparait, dur: Math.max(1, spec.cadence * 0.5), ease: EASE.pop });

  // Un compteur qui reste à zéro n'a rien à égrener — c'est le cas d'un « H »
  // dont on compte les boucles fermées. Le zéro est un résultat, pas un raté :
  // il paraît, et c'est tout.
  const n = spec.total;
  if (n < 1) return id;

  // Le compteur monte d'un cran à chaque allumage, à 60 % de l'allumage —
  // l'œil a vu la chose s'allumer avant que le nombre bouge.
  const textes = Array.from({ length: n }, (_, i) => String(i + 1));
  ctx.discrete({
    id,
    channel: 'text',
    at: spec.debut + spec.cadence * 0.6,
    dur: Math.max(1, spec.cadence * n),
    render: (u) => textes[Math.min(n - 1, Math.floor(u * n))],
  });
  // Une petite pulsation à chaque incrément : c'est elle qui fait « compter ».
  for (let i = 0; i < n; i++) {
    ctx.anim({
      id, prop: 'scale', values: [1, 1.22, 1], offsets: [0, 0.4, 1],
      at: spec.debut + spec.cadence * (0.6 + i), dur: Math.max(1, spec.cadence * 0.9), ease: EASE.pop,
    });
  }
  return id;
}

/**
 * Referme l'encart et fait descendre le nombre du compteur à la place de la
 * lettre. C'est le geste qui conclut : « une fois tout allumé, le nombre
 * remplace la lettre ».
 *
 * ★ `replier: false` — l'encart RESTE OUVERT. La lettre suivante emploie le
 * même afficheur : refermer le cadre pour le rouvrir aussitôt ferait un
 * clignotement gratuit, et surtout dirait que l'outil a changé alors qu'il est
 * le même. Seul le geste se termine ; le décor attend la suivante. C'est
 * l'appelant qui rend alors ses segments à l'état fantôme — lui seul sait ce
 * qu'il a allumé.
 *
 * @param {{src:object, to:?object, montres:string[], compteur:string,
 *          encart:object, at:number, dur:number, replier?:boolean}} spec
 */
export function refermerEncart(ctx, spec) {
  const { src, to, encart } = spec;
  const at = spec.at;
  const dur = spec.dur;
  const replier = spec.replier !== false;

  // Tout ce qui était montré s'efface : le cadre, le titre, l'afficheur.
  const cadre = replier ? [encart.frame, ...(encart.titre ? [encart.titre] : [])] : [];
  if (replier) ctx.scene.get(encart.frame).data.deploye = false;
  for (const id of [...cadre, ...spec.montres]) {
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur: dur * 0.4 });
  }
  if (!to) {
    // Sans substitution demandée, la lettre redescend simplement à sa place et
    // reprend sa taille : l'encart n'aura servi qu'à montrer le comptage.
    const p = ctx.scene.pos(src.id);
    ctx.anim({ id: src.id, prop: 'opacity', to: 1, at, dur: dur * 0.4 });
    ctx.anim({ id: src.id, prop: 'translate', to: { x: p.x, y: p.y }, at, dur: dur * 0.7, ease: EASE.move });
    ctx.anim({ id: src.id, prop: 'scale', to: 1, at, dur: dur * 0.7, ease: EASE.move });
    ctx.anim({ id: spec.compteur, prop: 'opacity', to: 0, at: at + dur * 0.5, dur: dur * 0.5 });
    return;
  }

  ctx.anim({ id: src.id, prop: 'opacity', to: 0, at, dur: dur * 0.3 });

  // Le compteur s'efface au moment précis où le nombre naît sur lui : c'est le
  // même nombre, il change seulement de rôle et de place.
  const posCompteur = ctx.scene.pos(spec.compteur);
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'number', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, scale: 1.15, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(to.id, { x: posCompteur.x, y: posCompteur.y });
  ctx.scene.kill(src.id, ctx.where);

  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: at + dur * 0.1, dur: dur * 0.2 });
  ctx.anim({ id: spec.compteur, prop: 'opacity', to: 0, at: at + dur * 0.2, dur: dur * 0.2 });
  ctx.anim({ id: to.id, prop: 'scale', to: 1, at: at + dur * 0.3, dur: dur * 0.5, ease: EASE.move });
  ctx.reflow({ at: at + dur * 0.3, dur: dur * 0.7, ease: EASE.move });
}
