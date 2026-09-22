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

import { EASE, VIEWBOX, MARGIN } from '../constants.js';
import { espacementDe, ancreVue } from './helpers.js';
import { rangerLesAfficheurs, combienTiennent, RESPIRATION } from '../placement.js';

/** Géométrie de l'encart, en multiples de la taille de police. */
export const ENCART = Object.freeze({
  cote: 2.6,        // côté du cadre
  hauteur: 2.05,    // à quelle hauteur au-dessus de l'axe de la ligne
  zoomGlyphe: 2.3,  // agrandissement du tracé montré dedans
  zoomLettre: 1.9,  // agrandissement de la lettre pendant son voyage
  compteurX: 2.25,  // décalage horizontal du compteur
});

/**
 * ★ **UN ENCART PAR CARACTÈRE, POSÉ PRÈS DU SIEN — et ce qui a changé.**
 *
 * > « Aujourd'hui `m7`/`m14` montrent UN afficheur central. Il en faut un par
 * >   caractère à convertir, posé près du caractère concerné. » (l'auteur)
 *
 * ⚠️ **CE QUE DISAIT LA DOCTRINE PRÉCÉDENTE, ET POURQUOI ELLE TOMBE.** L'encart
 *   était « toujours au même endroit, au centre de la VUE : d'un jeton au
 *   suivant, l'œil n'a pas à chercher où regarder », et son identité était celle
 *   de ce qu'il MONTRE — l'afficheur et son régime —, jamais celle de la lettre
 *   qui passe dedans. Un seul cadre montait à la première conversion, restait, et
 *   se refermait à la dernière.
 *
 *   L'argument était bon, et il reste vrai d'un seul afficheur : on ne cherche
 *   pas où regarder. Mais il payait cela d'un silence — l'encart ne disait pas
 *   QUEL caractère il était en train de convertir. Sur une ligne de treize
 *   signes, le spectateur voit un « D » au centre et doit deviner lequel des
 *   treize a quitté sa place. Poser l'encart au-dessus du sien répond à la
 *   question sans un mot, et c'est ce que l'auteur demande.
 *
 *   ★ Et surtout, l'ancienne identité rendait le mode « Simultané » IMPOSSIBLE :
 *     deux conversions jouées ensemble auraient partagé les mêmes nœuds de
 *     segments — le même `@seg:…` allumé deux fois pour deux lettres
 *     différentes. Ce n'était pas une préférence esthétique, c'était un
 *     verrou.
 *
 * ★ **LE DÉCOR RESTE MUTUALISÉ, mais par FAMILLE et non par cadre.** « Pas
 *   besoin de l'effacer entre chaque conversion d'affilée » (l'auteur) vaut
 *   toujours : ce qui se partage est l'OUTIL — l'afficheur, son régime, son nom
 *   —, et c'est lui qui décide quels encarts forment une rangée. Chaque
 *   caractère a son cadre dans cette rangée ; la rangée entière se retire d'un
 *   coup à la dernière conversion.
 *
 * ★ **LA RANGÉE NE SE RECOUVRE JAMAIS ET NE SORT JAMAIS DU CADRE**, et ce n'est
 *   pas une intention mais une construction : `placement.js` range les encarts
 *   au plus près de leurs caractères sous ces deux contraintes. Quand la place
 *   manque, le plus ancien se retire — la « vague successive » que l'auteur
 *   autorise. On préfère relayer plutôt que réduire : un afficheur rapetissé
 *   reste à l'écran mais ne se compte plus, et compter est tout ce qu'il a à
 *   faire.
 *
 * Sans `cle`, l'encart reste attaché à son jeton, comme avant — c'est le cas du
 * comptage de traits, où ce qui est montré dans le cadre est le tracé de la
 * lettre elle-même.
 *
 * @param {object} ctx
 * @param {object} src  le token de la ligne
 * @param {{at:number, dur:number, titre?:string, cle?:string, famille?:string,
 *          deployer?:boolean}} spec
 * @returns {{frame:string, titre:?string, centre:{x:number,y:number}, cote:number,
 *            deployer:boolean}}
 */
export function ouvrirEncart(ctx, src, spec = {}) {
  const fs = ctx.metrics.fontSize;
  const cote = fs * ENCART.cote;
  const at = spec.at ?? 0;
  const dur = spec.dur ?? ctx.dur * 0.18;
  // La HAUTEUR est celle de la vue — au-dessus de la ligne, toujours. Centre de
  // la VUE et non du viewBox : quand la ligne défile, les deux ne coïncident
  // plus (`ancreVue`).
  const vue = ancreVue(ctx);
  const y = vue.y - fs * ENCART.hauteur;

  const cle = typeof spec.cle === 'string' && spec.cle ? spec.cle : null;
  const famille = typeof spec.famille === 'string' && spec.famille ? spec.famille : null;
  const frame = cle ? `@encart:${cle}` : `@encart:${src.id}`;

  /* ★ **L'ABSCISSE SOUHAITÉE EST CELLE DU CARACTÈRE** — le reste n'est que la
     façon d'honorer ce souhait sans se recouvrir ni sortir du cadre. Un jeton
     sans position connue (cas pathologique que le compilateur refuse par
     ailleurs) retombe sur le centre de la vue : l'ancien comportement. */
  const pSrc = ctx.scene.pos(src.id);
  const souhait = pSrc && Number.isFinite(pSrc.x) ? pSrc.x : vue.x;

  const rangee = rangerLaRangee(ctx, { famille, frame, souhait, y, cote, fs, at, dur });
  const centre = { x: rangee.x, y };

  const deployer = cle === null || spec.deployer !== false || !ctx.scene.has(frame);
  if (!ctx.scene.has(frame)) {
    ctx.scene.create({
      id: frame, role: 'frame', inFlow: false, w: cote,
      // `famille` et `ordre` font de ce cadre un membre d'une rangée : la
      // première dit AVEC QUI il partage la place, le second qui est arrivé le
      // premier — donc qui se retire le premier quand il faut relayer.
      data: { h: cote, rx: 8, famille, ordre: rangee.ordre, ancre: souhait },
      base: { opacity: 0, scale: 0.92, stroke: ctx.palette.line },
    }, { where: ctx.where });
    ctx.scene.place(frame, { x: centre.x, y: centre.y, w: cote });
  } else {
    ctx.scene.get(frame).data.ancre = souhait;
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
        // `encart` : ce titre voyage avec son cadre, et se retire avec lui.
        data: { scale: 0.5, encart: frame },
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
 * ★ **L'ENCOMBREMENT D'UN AFFICHEUR N'EST PAS SON CADRE.**
 *
 * Le compteur vit à `compteurX` fois la police À DROITE du centre, et il est
 * lui-même large d'environ une demi-chasse : la boîte réellement occupée
 * déborde donc du cadre, et de façon ASYMÉTRIQUE. On range sur la boîte
 * symétrique qui contient les deux — un peu généreuse à gauche, exacte à
 * droite. C'est le sens prudent de l'approximation : réserver trop fait
 * relayer un cadre trop tôt (on voit un afficheur de moins), réserver trop peu
 * fait mordre un compteur sur le cadre voisin (on ne sait plus lequel compte).
 */
function encombrementDe(fs, cote) {
  const demi = Math.max(cote / 2, fs * (ENCART.compteurX + 0.45));
  return 2 * demi;
}

/** Le cadre utile, celui dans lequel la scène dispose (voir `layout.js`). */
function cadreUtile(ctx) {
  const vb = (ctx.layoutOpts && ctx.layoutOpts.viewBox) || VIEWBOX;
  return { min: vb.x + MARGIN, max: vb.x + vb.w - MARGIN };
}

/** Les cadres d'une famille encore déployés, du plus ancien au plus récent. */
function rangeeDe(ctx, famille, sauf) {
  const out = [];
  for (const n of ctx.scene.allNodes()) {
    if (!n.alive || n.role !== 'frame' || n.id === sauf) continue;
    const d = n.data || {};
    if (d.famille !== famille || !d.deploye) continue;
    out.push({ id: n.id, ancre: Number.isFinite(d.ancre) ? d.ancre : 0, ordre: d.ordre ?? 0 });
  }
  return out.sort((a, b) => a.ordre - b.ordre || (a.id < b.id ? -1 : 1));
}

/**
 * Range la rangée d'une famille, ce cadre-ci compris, et rend l'abscisse qui
 * lui revient.
 *
 * ★ **ON RELAIE PLUTÔT QUE DE RÉDUIRE, et c'est un choix argumenté.**
 *   `placement.js` sait faire les deux. Réduire garde tout le monde à l'écran,
 *   mais un afficheur à 60 % de sa taille est un afficheur qu'on ne compte
 *   plus : ses segments disjoints se touchent, et compter est la SEULE chose
 *   qu'il ait à faire. Relayer perd un cadre de vue et garde les autres
 *   lisibles. Entre montrer tout mal et montrer moins bien, on montre moins.
 *   (L'échelle reste disponible dans le solveur, et servira le jour où une
 *   étape portera plus de conversions qu'il n'y a de place — voir
 *   `.planning/A-VENIR-rythme.md`.)
 */
function rangerLaRangee(ctx, spec) {
  const { famille, frame, souhait, y, cote, fs, at, dur } = spec;
  const neuf = !ctx.scene.has(frame);
  const ordre = neuf ? ctx.scene.prochainOrdreEncart() : (ctx.scene.get(frame).data.ordre ?? 0);
  if (!famille) return { x: souhait, ordre };

  const place = {
    cote: encombrementDe(fs, cote),
    marge: RESPIRATION,
    cadre: cadreUtile(ctx),
  };
  const moi = { id: frame, ancre: souhait, ordre };
  let rangee = [...rangeeDe(ctx, famille, frame), moi].sort((a, b) => a.ordre - b.ordre);

  // Le relais : tant que la rangée ne tient pas À TAILLE PLEINE, le plus ancien
  // se retire. Il en reste toujours au moins un — celui qui arrive.
  const tient = (liste) => liste.length <= combienTiennent(place)
    && rangerLesAfficheurs(liste.map((r) => r.ancre), place).echelle >= 1;
  while (rangee.length > 1 && !tient(rangee)) {
    const vieux = rangee.shift();
    replierUnEncart(ctx, vieux.id, { at, dur: dur * 0.6 });
  }

  const { x } = rangerLesAfficheurs(rangee.map((r) => r.ancre), place);
  // Les voisins qui restent glissent pour faire la place : la rangée est une
  // disposition commune, pas une suite d'emplacements indépendants.
  rangee.forEach((r, i) => {
    if (r.id === frame) return;
    deplacerUnEncart(ctx, r.id, { x: x[i], y }, { at, dur });
  });
  return { x: x[rangee.findIndex((r) => r.id === frame)], ordre };
}

/** Tout ce qui appartient visuellement à un encart : son cadre et ses satellites. */
function piecesDe(ctx, frame) {
  const out = [frame];
  for (const n of ctx.scene.allNodes()) {
    if (n.alive && n.data && n.data.encart === frame) out.push(n.id);
  }
  return out;
}

/** Déplace un encart et tout ce qu'il porte, d'un seul mouvement. */
function deplacerUnEncart(ctx, frame, vers, spec) {
  const base = ctx.scene.pos(frame);
  if (!base) return;
  const dx = vers.x - base.x;
  const dy = vers.y - base.y;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  for (const id of piecesDe(ctx, frame)) {
    const p = ctx.scene.pos(id);
    if (!p) continue;
    ctx.place(id, { x: p.x + dx, y: p.y + dy, ...(p.w !== undefined ? { w: p.w } : {}) }, spec);
  }
}

/**
 * Retire un encart de la rangée — le « relais ». Il s'efface avec tout ce qu'il
 * porte, et cesse de compter parmi les déployés.
 *
 * ⚠️ Le nœud n'est PAS retiré de la scène (CONTRACTS §3.2 règle 7 : un `drop`
 *   doit rester réversible par `seek`). C'est l'état NOTÉ qui fait foi.
 */
export function replierUnEncart(ctx, frame, spec = {}) {
  const n = ctx.scene.get(frame);
  if (!n || !n.alive || !n.data || !n.data.deploye) return;
  n.data.deploye = false;
  const at = spec.at ?? 0;
  const dur = Math.max(1, spec.dur ?? ctx.dur * 0.2);
  for (const id of piecesDe(ctx, frame)) {
    ctx.anim({ id, prop: 'opacity', to: 0, at, dur });
  }
}

/**
 * Retire TOUTE la rangée d'une famille. C'est ce que fait la dernière
 * conversion d'une série : l'outil s'en va, et il s'en va en entier.
 */
export function replierLaFamille(ctx, famille, spec = {}) {
  for (const r of rangeeDe(ctx, famille, null)) replierUnEncart(ctx, r.id, spec);
}

/**
 * Pose le compteur — un grand zéro à droite de l'encart — et programme ses
 * incréments, un par élément allumé.
 *
 * @param {{centre:object, cote:number, total:number, debut:number, cadence:number,
 *          id:string, tone?:string, encart?:string}} spec
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
    // `encart` : le compteur appartient à SON cadre — il le suit quand la
    // rangée se réarrange, et s'efface avec lui quand le relais l'emporte.
    data: { scale: 1.15, ...(spec.encart ? { encart: spec.encart } : {}) },
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
