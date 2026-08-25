/**
 * Outils partagés par les primitives.
 *
 * `reduce` réutilise littéralement `insertOperators` et `sum` : les trois temps
 * de la réduction théosophique (éclatement, addition, résultat) sont les mêmes
 * gestes que ceux du vocabulaire, pas des variantes (recherche §4.8).
 */

import { EASE, KINDS } from '../constants.js';
import { fail } from '../errors.js';
import { guessKind } from '../scene.js';
import { charCenter, bboxOf } from '../layout.js';

const KIND_SET = new Set(KINDS);

/** Accolade : hauteur des bras relevés, profondeur de la pointe, rayon des coudes. */
const BRAS = 13;
const POINTE = 16;
const COUDE = 14;

/** Valide un descripteur de token créé par une op : c'est l'émetteur qui nomme. */
export function tokenSpec(ctx, spec, field) {
  if (!spec || typeof spec !== 'object') {
    fail(`${ctx.where}« ${field} » doit être un descripteur de token { id, text, kind }.`);
  }
  if (typeof spec.id !== 'string' || !spec.id.trim()) {
    fail(`${ctx.where}« ${field} » sans « id » : une op qui crée un token doit fournir son identifiant, unique dans le scénario (CONTRACTS §3).`);
  }
  if (spec.id.startsWith('@')) {
    fail(`${ctx.where}« ${field}.id » = « ${spec.id} » : le préfixe « @ » est réservé au moteur visuel.`);
  }
  if (typeof spec.text !== 'string') {
    fail(`${ctx.where}« ${field}.text » manquant.`);
  }
  if (spec.kind !== undefined && !KIND_SET.has(spec.kind)) {
    fail(`${ctx.where}« ${field}.kind » = « ${spec.kind} » hors vocabulaire (${KINDS.join(', ')}).`);
  }
  return { id: spec.id, text: spec.text, kind: spec.kind || guessKind(spec.text), group: spec.group ?? null };
}

/**
 * Espacement hérité d'un token qu'on remplace.
 *
 * ★ Sans cela, un découpage en sous-groupes ne survivait pas à la première
 * substitution : `partition` écarte les groupes en posant un `gapBefore` sur
 * leur premier token, et le nombre qui remplaçait ce token naissait avec
 * l'espacement par défaut. Les trois « hope » se retrouvaient à égale distance
 * les uns des autres, et le découpage qu'on venait de montrer disparaissait.
 *
 * @returns {{gapBefore?:number, breakBefore?:boolean}} à étaler dans `create`
 */
export function espacementDe(ctx, srcId) {
  const n = ctx.scene.get(srcId);
  if (!n) return {};
  const out = {};
  if (n.gapBefore !== undefined) out.gapBefore = n.gapBefore;
  if (n.breakBefore !== undefined) out.breakBefore = n.breakBefore;
  return out;
}

/**
 * Exige un point utilisable avant de poser un nœud dessus.
 *
 * ★ La garde du compilateur (fin de `compile.js`) constate qu'un nœud n'a pas
 * de position utilisable, mais elle le constate À LA FIN, quand elle ne sait
 * plus quel geste l'a placé. Ici on le dit sur-le-champ, en nommant le geste :
 * « la case résultat sous la pointe de l'accolade », « le chiffre 1 de
 * l'éclatement de 15 ». C'est la différence entre un nœud fautif à chercher et
 * un nœud fautif désigné.
 *
 * @param {object} ctx
 * @param {{x:number,y:number}} point
 * @param {string} quoi  ce qu'on pose, en toutes lettres
 * @param {string} id    le nœud concerné
 * @returns {{x:number,y:number}} le point, inchangé
 */
export function exigerPoint(ctx, point, quoi, id) {
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return point;
  fail(`${ctx.where}${quoi} : la position calculée est inutilisable (${JSON.stringify(point)}). `
    + `Le nœud « ${id} » se peindrait à l'origine, en haut à gauche de la scène, avec son texte et `
    + 'sans rien pour le trahir. Vérifiez les métriques et les positions des sources de ce geste.', { id });
  return point;
}

/**
 * Le centre de la VUE, en coordonnées de scène.
 *
 * ★ Il ne coïncide avec le centre du `viewBox` que si la ligne ne défile pas.
 * Depuis que la séquence tient toujours sur UNE ligne quitte à défiler
 * (`defilement.js`), tout ce qui doit paraître « au milieu de l'écran » — un
 * clavier, une réglette alphabétique, l'encart de comptage — doit être posé
 * ici, et non à `layoutOpts.centerX` : ces objets vivent dans le groupe qui
 * défile, comme les jetons, et c'est ce qui leur permet d'échanger des
 * positions avec eux sans arithmétique de rattrapage.
 *
 * @param {object} ctx
 * @returns {{x:number,y:number}}
 */
export function ancreVue(ctx) {
  const p = (ctx && ctx.pan) || { x: 0, y: 0 };
  return { x: ctx.layoutOpts.centerX - p.x, y: ctx.layoutOpts.centerY - p.y };
}

// ───────────────────────────────────────────────────────────────────────────
// Des NOMBRES ou des CHIFFRES ? — le soulignement et l'écart
// ───────────────────────────────────────────────────────────────────────────

/**
 * ★ « 15 16 » ne doit pas se lire « 1516 ».
 *
 * Le moteur arithmétique connaît déjà la distinction : `natureOperandes`
 * (`transformations/combinateurs.js`) accorde le titre d'une étape — « on
 * additionne les **chiffres** » sur `3 4 4 4`, « les **nombres** » sur
 * `8 15 16 5` — et son critère est explicitement *ce qui est à l'écran*, pas
 * l'opérateur qui l'a produit. Le rendu applique donc le MÊME critère, sur la
 * MÊME matière : les jetons vivants de la ligne. Rien ne voyage dans l'op, il
 * n'y a donc rien qui puisse diverger.
 *
 * Deux conséquences visuelles, et une seule raison :
 *
 * 1. **chaque nombre est souligné** — un trait qui se trace sous lui, de sa
 *    première à sa dernière décimale : c'est le trait qui dit où le nombre
 *    commence et où il finit ;
 * 2. **l'écart entre deux nombres s'élargit**, sans que rien ne s'insère entre
 *    les chiffres d'un même nombre — ils sont dans un seul jeton, aucun
 *    espacement ne peut les séparer, c'est ce qui rend la règle exacte.
 *
 * Sur une ligne de chiffres (un signe par jeton), les deux marques seraient du
 * bruit : elles ne paraissent pas.
 */

/** Écart entre deux NOMBRES, en multiples du gap de base. */
export const ECART_NOMBRES = 2.2;

/** Profondeur du soulignement sous l'ancre du jeton, en fraction de `fontSize`. */
const SOUS_LIGNE = 0.42;

/** Un jeton qui s'écrit comme un nombre (signe éventuel, puis des chiffres). */
const estNombreEcrit = (n) => !!n && (n.kind === 'number' || n.kind === 'digit')
  && /^[-−]?\d+$/.test(n.text);

/**
 * `'nombre'` dès qu'un jeton de la ligne demande plusieurs chiffres,
 * `'chiffre'` sinon — miroir exact de `natureOperandes`, lu sur la scène.
 * Une ligne qui n'est pas faite QUE de nombres (des lettres, un séparateur)
 * ne relève ni de l'un ni de l'autre : elle ne se marque pas.
 */
export function natureDesJetons(ctx, ids) {
  const noeuds = ids.map((id) => ctx.scene.get(id)).filter((n) => n && n.alive);
  if (!noeuds.length || !noeuds.every(estNombreEcrit)) return 'chiffre';
  return noeuds.every((n) => [...n.text.replace(/^[-−]/, '')].length <= 1) ? 'chiffre' : 'nombre';
}

/** Le trait d'un nombre — un nœud du moteur, jamais nommé par un scénario. */
export const idSoulignement = (id) => `@sous:${id}`;

/**
 * Marque la ligne si elle porte des NOMBRES : écart élargi et soulignements.
 * N'entraîne AUCUN reflow — c'est l'appelant qui recalcule, une seule fois.
 * @returns {boolean} vrai si la ligne portait des nombres
 */
export function marquerLesNombres(ctx, ids, spec = {}) {
  // Un nombre SEUL ne se confond avec rien : ni trait, ni écart. Les deux
  // marques ne répondent qu'au risque de lecture « 15 16 » → « 1516 ».
  if (ids.length < 2 || natureDesJetons(ctx, ids) !== 'nombre') return false;
  const at = spec.at ?? 0;
  const dur = Math.max(1, spec.dur ?? ctx.dur);
  const gap = ctx.layoutOpts.gap;
  ids.slice(1).forEach((id) => {
    const n = ctx.scene.get(id);
    if (n) n.gapBefore = gap * ECART_NOMBRES;
  });
  const y = round(ctx.metrics.fontSize * SOUS_LIGNE);
  ids.forEach((id, i) => {
    const n = ctx.scene.get(id);
    if (!n || !n.alive) return;
    const sid = idSoulignement(id);
    if (ctx.scene.has(sid)) return;
    const demi = round(n.w / 2);
    ctx.scene.create({
      id: sid,
      role: 'bracket',
      inFlow: false,
      w: n.w,
      data: { d: `M ${-demi} ${y} H ${demi}`, shape: 'line' },
      base: { opacity: 0, strokeDashoffset: 100, stroke: ctx.palette.phos },
    }, { where: ctx.where });
    ctx.scene.place(sid, exigerPoint(ctx, ctx.scene.pos(id),
      `le soulignement du nombre « ${n.text} »`, sid));
    const a = at + i * (ctx.stagger || 0);
    ctx.anim({ id: sid, prop: 'opacity', to: 0.8, at: a, dur: dur * 0.4 });
    ctx.anim({ id: sid, prop: 'strokeDashoffset', from: 100, to: 0, at: a, dur, ease: EASE.fade });
  });
  return true;
}

/** Les soulignements suivent leurs jetons — sinon ils se décrochent au reflow. */
export function suivreLesSoulignements(ctx, moved, spec = {}) {
  for (const m of moved) {
    const sid = idSoulignement(m.id);
    if (!ctx.scene.has(sid) || !ctx.scene.pos(sid)) continue;
    ctx.place(sid, { x: m.to.x, y: m.to.y, w: ctx.scene.pos(sid).w }, spec);
  }
}

/** Le trait s'en va avec le nombre qu'il souligne. */
export function effacerSoulignement(ctx, id, spec = {}) {
  const sid = idSoulignement(id);
  if (!ctx.scene.has(sid)) return;
  ctx.anim({ id: sid, prop: 'opacity', to: 0, at: spec.at ?? 0, dur: Math.max(1, spec.dur ?? 200) });
}

/** Reflow + soulignements qui suivent, en un seul geste. */
export function reflowMarque(ctx, spec = {}) {
  const moved = ctx.reflow(spec);
  suivreLesSoulignements(ctx, moved, spec);
  return moved;
}

/** Résout `op.targets` (ou un autre champ) en liste d'ids vivants, non vide. */
export function targetsOf(ctx, field = 'targets') {
  const raw = ctx.op[field];
  if (raw === undefined) fail(`${ctx.where}champ « ${field} » manquant.`);
  const ids = ctx.scene.resolve(raw, ctx.where);
  if (!ids.length) {
    fail(`${ctx.where}« ${field} » ne désigne aucun token vivant : ${JSON.stringify(raw)}.`);
  }
  return ids;
}

/**
 * L'EFFACEMENT SUR PLACE — le geste de la gomme, partagé.
 *
 * Les jetons pâlissent **un par un, là où ils sont**, avec un rétrécissement
 * juste assez marqué pour dire « ils s'en vont » sans les faire voyager. Le
 * `stagger` n'est pas décoratif : c'est LUI qui fait lire « on écarte ceci,
 * puis cela, puis cela » plutôt qu'un clignotement collectif.
 *
 * Écrit ici parce que deux gestes s'en servent et qu'ils ne doivent pas
 * diverger : `drop` en mode gomme (« on ne garde que les voyelles ») et
 * `horns`, qui efface lui-même le reste de la séquence — voir `horns.js`, où
 * ce n'est pas une commodité mais la condition du contrôle croisé.
 *
 * Ne resserre rien et n'occupe rien : c'est l'appelant qui décide de la suite.
 *
 * @returns {number} l'instant, relatif au début de l'op, où le dernier jeton a fini
 */
export function effacerSurPlace(ctx, ids, spec = {}) {
  const n = ids.length;
  if (!n) return spec.at ?? 0;
  const at = spec.at ?? 0;
  const total = Math.max(1, spec.dur ?? ctx.dur);
  // `||` et non `??` : un `stagger` à zéro n'est pas un choix, c'est l'absence
  // de choix (le compilateur pose 0 par défaut). Le retenir effacerait tous les
  // jetons d'un bloc, là où le geste EST la succession.
  const cadence = spec.stagger || ctx.stagger || (n > 1 ? (total * 0.66) / (n - 1) : 0);
  const fondu = Math.max(1, Math.min(total * 0.34, total - cadence * (n - 1)));
  ids.forEach((id, i) => {
    const t = at + i * cadence;
    ctx.anim({ id, prop: 'opacity', to: 0, at: t, dur: fondu, ease: EASE.fade });
    ctx.anim({ id, prop: 'scale', to: 0.82, at: t, dur: fondu, ease: EASE.fade });
    const halo = `@halo:${id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at: t, dur: fondu * 0.7 });
    ctx.scene.kill(id, ctx.where);
  });
  return at + cadence * (n - 1) + fondu;
}

/** Halo d'un token, créé à la demande et réutilisé ensuite. */
export function ensureHalo(ctx, id, tone = 'gold') {
  const hid = `@halo:${id}`;
  const node = ctx.scene.live(id, ctx.where);
  const pos = ctx.scene.pos(id);
  if (!ctx.scene.has(hid)) {
    ctx.scene.create({
      id: hid,
      role: 'halo',
      inFlow: false,
      w: node.w + 14,
      data: { h: ctx.metrics.fontSize * 1.16, rx: 2, tone, of: id },
      base: { opacity: 0, fill: ctx.palette[tone] },
    }, { where: ctx.where });
  }
  if (pos) ctx.place(hid, { x: pos.x, y: pos.y, w: node.w + 14 });
  return hid;
}

export { colorForKind } from '../constants.js';

/** Valeur numérique d'un token (pour `sum`). */
export function numberOf(text, ctx, id) {
  const v = Number(String(text).replace(/\s/g, '').replace('−', '-'));
  if (!Number.isFinite(v)) {
    fail(`${ctx.where}le token « ${id} » porte « ${text} », qui n'est pas un nombre : « sum » ne peut pas l'additionner.`);
  }
  return v;
}

/**
 * Insère des tokens opérateurs entre des tokens consécutifs, réserve la place
 * puis les fait apparaître. Partagé par `insertOperators` et `reduce`.
 *
 * @param {object} ctx
 * @param {{between:string[], ids:string[], glyph:string, at:number, dur:number}} spec
 */
export function insertOperatorTokens(ctx, spec) {
  const { between, ids, glyph } = spec;
  // ★ `glyphs` — un signe par interstice. La somme alternée fait « v₀ − v₁ + v₂
  // − v₃ » ; n'afficher que le premier signe partout écrivait une soustraction
  // en chaîne sous une addition alternée, c'est-à-dire un calcul faux.
  const glyphs = Array.isArray(spec.glyphs) && spec.glyphs.length === between.length - 1
    ? spec.glyphs
    : null;
  const created = [];
  for (let i = 0; i < between.length - 1; i++) {
    const leftIdx = ctx.scene.flowIndex(between[i]);
    if (leftIdx < 0) fail(`${ctx.where}« ${between[i]} » n'est pas dans le flux de layout.`);
    const node = ctx.scene.create({
      id: ids[i],
      text: glyphs ? glyphs[i] : glyph,
      kind: 'operator',
      role: 'text',
      inFlow: true,
      insertAt: leftIdx + 1,
      base: { opacity: 0, scale: 0.5, fill: ctx.palette.phos },
    }, { where: ctx.where });
    created.push(node.id);
  }
  // 1. réserver la place (les voisins s'écartent), 2. faire apparaître.
  ctx.reflow({ at: spec.at, dur: spec.dur * 0.6, ease: EASE.move });
  created.forEach((id, i) => {
    const a = spec.at + spec.dur * 0.35 + i * (ctx.stagger || 0);
    ctx.anim({ id, prop: 'opacity', to: 1, at: a, dur: spec.dur * 0.65 });
    ctx.anim({ id, prop: 'scale', to: 1, at: a, dur: spec.dur * 0.65, ease: EASE.pop });
  });
  return created;
}

/**
 * ★ Le NIVELLEMENT — comment une moyenne se montre au lieu de s'annoncer.
 *
 * Faire la moyenne, ce n'est pas « diviser la somme par le nombre de termes »
 * quand il faut le MONTRER : c'est **égaliser**. On prend 1 au plus grand, on
 * le donne au plus petit, et on recommence jusqu'à ce que plus aucun écart ne
 * dépasse 1. Ce qui reste alors sur la ligne, c'est la moyenne — à l'arrondi
 * près, qui devient visible lui aussi : ce sont les jetons qui n'ont pas
 * atteint la valeur commune.
 *
 * **La suite converge, et c'est démontrable, pas espéré.** Chaque transfert
 * diminue la somme des carrés des écarts à la moyenne d'au moins 2 :
 * `Δ = 2 − 2(vᵢ − vⱼ)`, et l'on ne transfère que si `vᵢ − vⱼ ≥ 2`. Une
 * quantité entière positive qui décroît strictement s'arrête. La somme, elle,
 * est **invariante** — c'est ce qui garantit que la valeur commune atteinte
 * est bien la moyenne.
 *
 * **Borne.** Le nombre de transferts est fini mais peut être grand (il croît
 * comme la variance) : au-delà de `MAX_TRANSFERTS`, on rend `converge: false`
 * et l'appelant retombe sur le geste sobre — l'accolade, le ramassage, la
 * valeur. On ne montre pas un nivellement qu'on ne saurait pas finir.
 *
 * ⚠ Ce code a un **jumeau** dans `src/moteur/transformations/combinateurs.js`
 * (`nivellementDe`) : le moteur arithmétique ne dépend pas du moteur visuel
 * (CONTRACTS §1), et c'est lui qui doit dimensionner la durée de l'étape. Un
 * test croisé échoue si les deux divergent, exactement comme pour `DUREE_OP`.
 *
 * @param {number[]} valeurs
 * @param {number} [maxTransferts]
 * @returns {{transferts:{de:number,vers:number,source:number,cible:number}[],
 *            valeurs:number[], converge:boolean}}
 */
export const MAX_TRANSFERTS = 18;

export function nivellementDe(valeurs, maxTransferts = MAX_TRANSFERTS) {
  const v = valeurs.slice();
  const transferts = [];
  while (transferts.length <= maxTransferts) {
    let hi = 0;
    let lo = 0;
    for (let i = 1; i < v.length; i++) {
      if (v[i] > v[hi]) hi = i;
      if (v[i] < v[lo]) lo = i;
    }
    if (v[hi] - v[lo] <= 1) return { transferts, valeurs: v, converge: true };
    if (transferts.length === maxTransferts) break;
    v[hi] -= 1;
    v[lo] += 1;
    transferts.push({ de: hi, vers: lo, source: v[hi], cible: v[lo] });
  }
  return { transferts, valeurs: v, converge: false };
}

/**
 * Poids des phases du ramassage, en millisecondes nominales.
 *
 * ⚠ **Miroir** de `POIDS_RAMASSAGE` / `dureeRamassage`
 * (`src/moteur/transformations/combinateurs.js`) : c'est l'émetteur qui fixe la
 * `dur` d'une étape dont le contenu varie, et c'est ici qu'elle est répartie.
 * Un test croisé échoue si les deux divergent — sans lui, neuf transferts de
 * nivellement se joueraient dans le temps d'un seul, sans que rien ne le dise.
 */
export const POIDS_RAMASSAGE = Object.freeze({
  accolade: 900, doubles: 800,
  nivellement0: 260, nivellement1: 520,
  effacement0: 380, effacement1: 90,
  vol0: 620, vol1: 260,
  remontee: 760,
});

/** Le budget de chaque phase, d'après ce que le geste a à montrer. */
export function poidsRamassage({ voler = 0, effacer = 0, doubles = 0, transferts = 0 } = {}) {
  const P = POIDS_RAMASSAGE;
  return {
    accolade: P.accolade,
    doubles: doubles ? P.doubles : 0,
    nivellement: transferts ? P.nivellement0 + transferts * P.nivellement1 : 0,
    effacement: effacer ? P.effacement0 + effacer * P.effacement1 : 0,
    vol: P.vol0 + voler * P.vol1,
    remontee: P.remontee,
  };
}

/** Points d'une trajectoire COURBE de `a` à `b` — quadratique, sommet en haut. */
function arc(a, b, hauteur) {
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - hauteur };
  const pt = (t) => ({
    x: round((1 - t) * (1 - t) * a.x + 2 * t * (1 - t) * c.x + t * t * b.x),
    y: round((1 - t) * (1 - t) * a.y + 2 * t * (1 - t) * c.y + t * t * b.y),
  });
  return [{ x: round(a.x), y: round(a.y) }, pt(0.25), pt(0.5), pt(0.75), { x: round(b.x), y: round(b.y) }];
}

/**
 * Accumulation sous l'accolade — la composition demandée par CONTRACTS §3.1
 * pour tout combinateur : **les sources dans l'accolade, le résultat sous la
 * pointe, l'opération écrite**.
 *
 * Six temps, dont trois facultatifs, dans cet ordre de lecture :
 *
 *  1. l'accolade se trace sous les opérandes, qui se resserrent — ou qui
 *     s'écartent, s'il s'agit de nombres (`marquerLesNombres`) ;
 *  2. le **symbole d'opération** paraît sous la pointe — `Σ`, `∏`, `#`, `moy.`…
 *     Une accolade nue ne dirait pas ce qu'on fait ;
 *  3. *(facultatif)* les **doublons** montent d'un cran, sur une ligne étiquetée
 *     — c'est ce qui montre POURQUOI certaines choses comptent double ;
 *  4. *(facultatif)* le **nivellement** : un `1` quitte le plus grand en courbe
 *     et rejoint le plus petit, jusqu'à ce qu'aucun écart ne dépasse 1 ;
 *  5. *(facultatif)* ce qui ne compte pas **s'efface sur place**, puis la case
 *     résultat s'ouvre et les autres y volent un par un pendant qu'elle compte ;
 *  6. l'accolade se retire et le résultat **remonte prendre leur place** dans
 *     la ligne — c'est ce dernier geste qui dit que le calcul est refermé.
 *
 * Le compteur est du texte : canal discret, fonction pure de `t` (scrubbing
 * exact). La largeur finale est réservée dès l'ouverture de la case — et celle
 * des opérandes dès le premier transfert, un jeton qui passe de `8` à `11`
 * gagnant un chiffre que le canal discret ne saurait pas relayouter.
 *
 * @param {object} ctx
 * @param {{operands:string[], consume?:string[], to:object, at:number, dur:number,
 *          partials?:number[], symbol?:string, label?:string, numerique?:boolean,
 *          voler?:string[], effacer?:string[], depart?:string,
 *          doubles?:{src:string, spec:object}[], doublesLabel?:string,
 *          transferts?:{de:number,vers:number,source:number,cible:number}[]}} spec
 */
export function accumulate(ctx, spec) {
  const { operands, to } = spec;
  const T = spec.dur;
  const t0 = spec.at;
  const numerique = spec.numerique !== false;
  const doubles = spec.doubles || [];
  const transferts = spec.transferts || [];
  const voler = spec.voler || operands;
  const effacer = spec.effacer || [];
  const depart = spec.depart !== undefined ? spec.depart : '0';
  const values = numerique
    ? operands.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id))
    : operands.map((id) => ctx.scene.live(id, ctx.where).text);
  const consume = absorbOperators(ctx, operands, spec.consume || []);
  const partials = spec.partials || values.reduce((acc, v) => {
    acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
    return acc;
  }, []);

  const firstIdx = ctx.scene.flowIndex(operands[0]);

  // --- 0. largeurs réservées pour le nivellement ---------------------------
  // Le canal discret change le TEXTE, jamais la mise en page : un jeton qui
  // passera de `8` à `11` doit avoir sa place avant de partir, sinon il
  // recouvre son voisin à mi-parcours.
  const paliers = new Map();
  if (transferts.length) {
    const courant = values.map((v) => String(v));
    operands.forEach((id, i) => paliers.set(id, [{ k: 0, text: courant[i] }]));
    transferts.forEach((tr, k) => {
      paliers.get(operands[tr.de]).push({ k: k + 1, text: String(tr.source) });
      paliers.get(operands[tr.vers]).push({ k: k + 1, text: String(tr.cible) });
    });
    for (const [id, ps] of paliers) {
      const large = Math.max(...ps.map((p) => [...p.text].length));
      const node = ctx.scene.get(id);
      node.w = Math.max(node.w, large * ctx.metrics.advance);
    }
  }

  // --- découpe du temps : chaque phase pèse ce qu'elle a à montrer ---------
  const poids = poidsRamassage({
    voler: voler.length, effacer: effacer.length,
    doubles: doubles.length, transferts: transferts.length,
  });
  const totalPoids = Object.values(poids).reduce((a, b) => a + b, 0);
  const u = T / totalPoids;
  const tAcc = poids.accolade * u;
  const tDup = poids.doubles * u;
  const tNiv = poids.nivellement * u;
  const tEff = poids.effacement * u;
  const tVol = poids.vol * u;
  const tRem = poids.remontee * u;
  const tA = t0 + tAcc;          // fin de l'accolade
  const tB = tA + tDup;          // fin des doublons
  const tC = tB + tNiv;          // fin du nivellement
  const tE = tC + tEff;          // fin des effacements = début du vol
  const tD = tE + tVol;          // fin du vol = début de la remontée

  // --- 1 & 2. l'accolade et son symbole ------------------------------------
  const acc = tracerAccolade(ctx, operands, {
    shape: 'brace',
    tighten: 0.66,
    symbol: spec.symbol,
    label: spec.label,
    at: t0,
    dur: tAcc,
  });
  const ancre = acc ? acc.resultat : posDeRepli(ctx, operands);

  // --- 3. les doublons montent d'un cran, sur une ligne étiquetée ----------
  const copies = [];
  if (doubles.length) {
    const hauteur = ctx.metrics.fontSize * 1.32;
    let xMin = Infinity;
    let yLigne = 0;
    doubles.forEach((d, i) => {
      const src = ctx.scene.live(d.src, `${ctx.where}doubles[${i}].target : `);
      const p = ctx.scene.pos(src.id);
      const cible = { x: p.x, y: round(p.y - hauteur) };
      xMin = Math.min(xMin, p.x - src.w / 2);
      yLigne = cible.y;
      ctx.scene.create({
        id: d.spec.id, text: d.spec.text, kind: d.spec.kind || src.kind, group: d.spec.group,
        role: 'text', inFlow: false,
        base: { opacity: 0, scale: 0.9, fill: ctx.palette.gold },
      }, { where: ctx.where });
      // Naissance PILE sur la lettre : c'est une copie, on doit la voir se
      // détacher de son original, pas paraître de nulle part.
      ctx.scene.place(d.spec.id, exigerPoint(ctx, { x: p.x, y: p.y },
        `la copie « ${d.spec.text} », née sur son original`, d.spec.id));
      const a = tA + i * (tDup * 0.28) / Math.max(1, doubles.length);
      const dur = Math.max(1, tDup * 0.7);
      ctx.anim({ id: d.spec.id, prop: 'opacity', to: 1, at: a, dur: dur * 0.5 });
      ctx.anim({ id: d.spec.id, prop: 'scale', to: 1, at: a, dur, ease: EASE.pop });
      ctx.place(d.spec.id, cible, { at: a, dur, ease: EASE.move });
      copies.push(d.spec.id);
    });
    // L'étiquette de la ligne : sans elle, on verrait des lettres monter sans
    // savoir à quel titre elles vont être comptées une seconde fois.
    if (typeof spec.doublesLabel === 'string' && spec.doublesLabel) {
      const lid = ctx.gensym('doubleslabel');
      const w = ctx.metrics.advance * 0.55 * [...spec.doublesLabel].length;
      ctx.scene.create({
        id: lid, role: 'label', text: spec.doublesLabel, inFlow: false, w,
        data: { scale: 0.5 },
        base: { opacity: 0, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(lid, exigerPoint(ctx, { x: round(xMin - w / 2 - ctx.metrics.advance * 0.6), y: yLigne },
        'l’étiquette de la ligne des doublons', lid));
      ctx.anim({ id: lid, prop: 'opacity', to: 1, at: tA + tDup * 0.3, dur: Math.max(1, tDup * 0.5) });
      ctx.anim({ id: lid, prop: 'opacity', to: 0, at: tD, dur: Math.max(1, tRem * 0.5) });
    }
  }

  // --- 4. le nivellement : un `1` du plus grand au plus petit --------------
  if (transferts.length) {
    const pas = tNiv / (transferts.length + 0.35);
    transferts.forEach((tr, k) => {
      const a = tB + k * pas;
      const dur = Math.max(1, pas * 1.25);
      const src = ctx.scene.pos(operands[tr.de]);
      const dst = ctx.scene.pos(operands[tr.vers]);
      const id = ctx.gensym('unite');
      ctx.scene.create({
        id, role: 'text', text: '1', kind: 'digit', inFlow: false,
        base: { opacity: 0, scale: 0.5, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, exigerPoint(ctx, { x: src.x, y: src.y },
        'le 1 qui quitte le plus grand', id));
      const chemin = arc(src, dst, ctx.metrics.fontSize * 1.15);
      ctx.anim({ id, prop: 'translate', values: chemin, at: a, dur, ease: EASE.linear });
      ctx.anim({ id, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.16, 0.84, 1], at: a, dur });
      ctx.anim({ id, prop: 'scale', values: [0.5, 0.62, 0.5], offsets: [0, 0.5, 1], at: a, dur });
    });
    // Les deux nombres changent À L'ARRIVÉE du 1, pas à son départ : c'est le
    // transfert qui fait la nouvelle valeur, et on doit le lire dans cet ordre.
    for (const [id, ps] of paliers) {
      if (ps.length < 2) continue;
      const seuils = ps.map((p) => ({ u: p.k === 0 ? 0 : (p.k - 1 + 0.94) / (transferts.length + 0.35), text: p.text }));
      ctx.discrete({
        id,
        channel: 'text',
        at: tB,
        dur: Math.max(1, tNiv),
        render: (x) => {
          let out = seuils[0].text;
          for (const s of seuils) if (x >= s.u) out = s.text;
          return out;
        },
      });
    }
  }

  // --- 5a. ce qui ne compte pas s'efface, sur place ------------------------
  if (effacer.length) {
    const cadence = effacer.length > 1 ? (tEff * 0.55) / (effacer.length - 1) : 0;
    const fondu = Math.max(1, tEff - cadence * (effacer.length - 1));
    effacer.forEach((id, i) => {
      const a = tC + i * cadence;
      ctx.anim({ id, prop: 'opacity', to: 0, at: a, dur: fondu, ease: EASE.fade });
      ctx.anim({ id, prop: 'scale', to: 0.82, at: a, dur: fondu, ease: EASE.fade });
      effacerSoulignement(ctx, id, { at: a, dur: fondu * 0.7 });
    });
  }

  // --- 5b. la case résultat, sous la pointe --------------------------------
  const espacement = espacementDe(ctx, operands[0]);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacement,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(to.id, exigerPoint(ctx, ancre,
    `la case résultat de « ${to.text} », sous la pointe de l'accolade`, to.id));

  const appear = Math.max(t0 + tAcc * 0.72, tE - tVol * 0.15);
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: appear, dur: Math.max(1, tVol * 0.2) });
  ctx.anim({ id: to.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1], at: appear, dur: Math.max(1, tVol * 0.28), ease: EASE.pop });

  // --- 5c. ce qui compte y vole, un par un ---------------------------------
  const n = voler.length;
  const debutVol = tE;
  const cadence = n > 1 ? tVol * 0.60 / (n - 1) : 0;
  const vol = Math.max(1, tVol - cadence * (n - 1));
  const arrivees = [];

  voler.forEach((id, i) => {
    const a = debutVol + i * cadence;
    arrivees.push(a + vol);
    ctx.anim({ id, prop: 'translate', to: { x: ancre.x, y: ancre.y }, at: a, dur: vol, ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.65, at: a, dur: vol });
    ctx.anim({ id, prop: 'opacity', to: 0, at: a + vol * 0.6, dur: vol * 0.4 });
    effacerSoulignement(ctx, id, { at: a, dur: vol * 0.5 });
  });
  // ★ Les signes partent AVANT l'envol, pas pendant.
  //
  // Effacés en même temps que les opérandes, ils laissaient lire « + 4 + 4 + 4 »
  // pendant une demi-seconde : une somme dont le premier terme s'est envolé
  // n'est plus une somme, c'est une faute d'écriture. Ils s'effacent donc
  // pendant que les opérandes sont tous encore là, et le vol commence sur une
  // ligne de nombres nus.
  for (const id of consume) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: Math.max(t0, tE - tVol * 0.2), dur: Math.max(1, tVol * 0.1) });
  }

  // Le compteur suit exactement l'arrivée des jetons : chaque atterrissage fait
  // avancer le total. Fonction pure de `t`, donc rejouable en arrière.
  // ★ Aligner la suite affichée sur les ATTERRISSAGES.
  //
  // L'émetteur fournit parfois ses partiels avec la valeur de départ en tête
  // (`[0, 4, 6]` pour deux opérandes), et le `depart` était alors compté deux
  // fois : le compteur se décalait d'un cran et s'arrêtait sur l'avant-dernier.
  // Sur « 4 + 2 = 6 », la démonstration finissait sur 4. Il faut exactement un
  // texte de plus que d'atterrissages — celui d'avant le premier.
  const suite = arrivees.length && partials.length > arrivees.length
    ? partials.slice(-arrivees.length)
    : partials;
  const textes = [depart, ...suite.map((v) => String(v))];
  // ★ Le canal court AU-DELÀ du dernier atterrissage.
  //
  // Il s'arrêtait dessus, si bien que le total n'existait qu'à `x === 1` au
  // millième près : toute évaluation à 0,999 rendait l'avant-dernier partiel.
  // Sur « 4 + 2 », la démonstration finissait donc sur 4 — le résultat annoncé
  // n'apparaissait jamais. Le canal se prolonge maintenant jusqu'au retrait de
  // l'accolade : le dernier seuil est franchi bien avant la fin, et le total
  // tient l'écran le temps qu'on le lise.
  const spanFin = arrivees.length ? arrivees[arrivees.length - 1] : appear + 1;
  // `tD + tRem` = la fin de l'op, remontée du résultat comprise. Le dernier
  // atterrissage tombe AVANT : le seuil final est donc franchi nettement avant
  // la fin du canal, et le total tient l'écran le temps qu'on le lise.
  const spanCanal = Math.max(spanFin + 1, tD + tRem);
  const span = Math.max(1, spanCanal - appear);
  const seuils = arrivees.map((t) => (t - appear) / span);
  ctx.discrete({
    id: to.id,
    channel: 'text',
    at: appear,
    dur: span,
    render: (x) => {
      let k = 0;
      while (k < seuils.length && x >= seuils[k]) k++;
      return textes[Math.min(textes.length - 1, k)];
    },
  });

  // --- 6. l'accolade se retire, le résultat remonte dans la ligne ----------
  const retrait = tD;
  if (acc) {
    // ★ Le TRACÉ de l'accolade s'en va AU RYTHME DE SES SOURCES.
    //
    // Il tenait jusqu'au bout, à sa place de départ, alors que les opérandes
    // s'étaient envolés un à un : on voyait « 15 −  ⌣_______⌣  − 3444.fr »,
    // une accolade pleinement tracée sous un trou, à côté de la ligne au lieu
    // d'être autour. Une accolade n'embrasse que ce qui est encore là : elle se
    // défait donc exactement pendant le vol, et il ne reste sous la pointe que
    // ce qui doit y rester — le symbole et le résultat.
    //
    // Le défaut ne se voyait pas en pause aux instants où le résultat paraît
    // (l'accolade y est encore pleine) : il ne se lit qu'entre 30 % et 75 % de
    // la somme, c'est-à-dire en lecture.
    ctx.anim({ id: acc.id, prop: 'opacity', to: 0, at: debutVol, dur: Math.max(1, tVol) });
    for (const id of acc.ids) {
      if (id === acc.id) continue;
      ctx.anim({ id, prop: 'opacity', to: 0, at: retrait, dur: Math.max(1, tRem * 0.5) });
    }
  }
  const consumed = [...operands, ...consume, ...copies];
  for (const id of consumed) ctx.scene.kill(id, ctx.where);
  ctx.scene.enterFlow(to.id, firstIdx < 0 ? undefined : firstIdx, ctx.where);
  reflowMarque(ctx, { at: tD + tRem * 0.1, dur: Math.max(1, tRem * 0.9), ease: EASE.move });

  return { partials, resultPos: ctx.scene.pos(to.id), brace: acc, transferts };
}

/** Sans accolade (un seul opérande, ou boîte vide) : sous les opérandes. */
function posDeRepli(ctx, operands) {
  const p = ctx.scene.pos(operands[0]);
  return { x: p.x, y: p.y + ctx.metrics.fontSize * 1.6 };
}

/**
 * Les signes d'opération posés par `insertOperators` entre les opérandes font
 * partie de la somme : ils disparaissent avec elle. On n'absorbe que les tokens
 * **possédés par le moteur** (id `@…`) : ceux que l'émetteur a nommés lui
 * appartiennent, c'est à lui de les lister dans `consume`.
 */
function absorbOperators(ctx, operands, declared) {
  const out = [...declared];
  const idx = operands.map((id) => ctx.scene.flowIndex(id)).filter((i) => i >= 0);
  if (idx.length < 2) return out;
  const lo = Math.min(...idx);
  const hi = Math.max(...idx);
  for (let i = lo + 1; i < hi; i++) {
    const id = ctx.scene.flow[i];
    const node = ctx.scene.get(id);
    if (!node || !node.alive) continue;
    if (node.kind !== 'operator' || !id.startsWith('@')) continue;
    if (operands.includes(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

/** Centre du i-ème caractère d'un token — chasse fixe, pas de lecture DOM. */
export function charPoint(ctx, id, index) {
  return charCenter(ctx.scene.pos(id), index, ctx.metrics);
}

/** Crée un badge numéroté (comptage de traits, d'extrémités…). */
export function badge(ctx, text, pos, spec = {}) {
  const id = ctx.gensym('badge');
  ctx.scene.create({
    id,
    role: 'label',
    text: String(text),
    inFlow: false,
    w: ctx.metrics.advance * 0.6 * String(text).length,
    data: { scale: 0.52, tone: spec.tone || 'phos' },
    base: { opacity: 0, fill: ctx.palette[spec.tone || 'phos'], scale: 0.6 },
  }, { where: ctx.where });
  ctx.place(id, pos);
  ctx.anim({ id, prop: 'opacity', to: 1, at: spec.at ?? 0, dur: spec.dur ?? 200 });
  ctx.anim({ id, prop: 'scale', to: 1, at: spec.at ?? 0, dur: spec.dur ?? 200, ease: EASE.pop });
  return id;
}

/**
 * Trace l'accolade et pose ses légendes. Partagé avec `sum` / `reduce`
 * (`helpers.accumulate`), qui a besoin de savoir **où** poser le résultat.
 *
 * @returns {{id:string, box:object, pointe:{x:number,y:number},
 *            resultat:{x:number,y:number}, ids:string[]}|null}
 */
export function tracerAccolade(ctx, ids, spec = {}) {
  const shape = spec.shape || 'brace';
  const at = spec.at ?? 0;
  const dur = spec.dur ?? ctx.dur;
  const fs = ctx.metrics.fontSize;

  // 1. resserrement — c'est lui qui *se lit* comme un regroupement.
  //
  // ★ Sauf sur une ligne de NOMBRES : là, resserrer ferait exactement le
  // contraire de ce qu'il faut, « 15 16 » finissant par se lire « 1516 ». Les
  // nombres s'écartent au lieu de se resserrer, et chacun reçoit son trait —
  // c'est le trait, alors, qui dit ce que le regroupement dirait.
  const nombres = marquerLesNombres(ctx, ids, { at, dur: dur * 0.7 });
  if (spec.tighten || nombres) {
    if (!nombres) {
      const gap = ctx.layoutOpts.gap;
      ids.slice(1).forEach((id) => { ctx.scene.get(id).gapBefore = gap * spec.tighten; });
    }
    const bouge = { at, dur: dur * 0.45, ease: EASE.move };
    suivreLesSoulignements(ctx, ctx.reflow(bouge), bouge);
  }

  const box = bboxOf(ids, ctx.scene.positions, ctx.metrics, 10);
  if (!box) return null;

  const W = box.w / 2;
  const H = box.h / 2;
  const d = shape === 'box'
    ? `M ${-W} ${-H} H ${W} V ${H} H ${-W} Z`
    : braceD(W);
  // L'accolade est ancrée juste SOUS les sources : ses bras remontent vers
  // elles, sa pointe descend vers le résultat.
  const anchorY = shape === 'box' ? box.cy : box.y + box.h + BRAS + 6;
  const pointeY = shape === 'box' ? box.y + box.h + 8 : anchorY + POINTE;

  const id = spec.id && !String(spec.id).startsWith('@') ? spec.id : ctx.gensym('group');
  ctx.scene.create({
    id,
    role: 'bracket',
    inFlow: false,
    w: box.w,
    data: { d, shape },
    base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.gold },
  }, { where: ctx.where });
  exigerPoint(ctx, { x: box.cx, y: anchorY }, 'le tracé de l’accolade', id);
  ctx.place(id, { x: box.cx, y: anchorY, w: box.w });
  ctx.anim({
    id, prop: 'strokeDashoffset', from: 100, to: 0,
    at: at + dur * 0.2, dur: dur * 0.6, ease: EASE.fade,
  });

  const crees = [id];
  // 2. le symbole d'opération, juste sous la pointe : ce qu'on FAIT.
  const symboleY = pointeY + fs * 0.52;
  if (typeof spec.symbol === 'string' && spec.symbol) {
    const sid = ctx.gensym('op');
    ctx.scene.create({
      id: sid, role: 'label', text: spec.symbol, inFlow: false,
      w: ctx.metrics.advance * 0.8 * [...spec.symbol].length,
      data: { scale: 0.86 },
      base: { opacity: 0, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(sid, exigerPoint(ctx, { x: box.cx, y: symboleY },
      `le symbole d'opération « ${spec.symbol} », sous la pointe`, sid));
    ctx.anim({ id: sid, prop: 'opacity', to: 1, at: at + dur * 0.55, dur: dur * 0.35 });
    ctx.anim({ id: sid, prop: 'scale', values: [0.7, 1.1, 1], offsets: [0, 0.7, 1], at: at + dur * 0.55, dur: dur * 0.4, ease: EASE.pop });
    crees.push(sid);
  }

  // 3. la légende en toutes lettres, à côté du symbole.
  if (typeof spec.label === 'string' && spec.label) {
    const lid = ctx.gensym('grouplabel');
    ctx.scene.create({
      id: lid, role: 'label', text: spec.label, inFlow: false,
      w: ctx.metrics.advance * 0.55 * [...spec.label].length,
      data: { scale: 0.5 },
      base: { opacity: 0, fill: ctx.palette.fg2 },
    }, { where: ctx.where });
    // Sans symbole — un découpage en sous-groupes, par exemple —, la légende
    // prend la place du symbole plutôt que de flotter un cran plus bas.
    ctx.scene.place(lid, exigerPoint(ctx, { x: box.cx, y: spec.symbol ? symboleY + fs * 0.56 : symboleY },
      'la légende de l’accolade', lid));
    ctx.anim({ id: lid, prop: 'opacity', to: 1, at: at + dur * 0.65, dur: dur * 0.35 });
    crees.push(lid);
  }

  // Où va le résultat : sous la pointe, sous le symbole, sous la légende.
  const resultat = { x: box.cx, y: symboleY + fs * (spec.label ? 1.34 : 0.92) };

  // ★ Une accolade QUI PORTE UN SYMBOLE promet un résultat sous sa pointe.
  //
  // `accumulate` tient la promesse lui-même. Les autres combinateurs — compter,
  // moyenner, mesurer un écart — la tenaient par un `substitute`, qui faisait
  // naître la valeur **dans la ligne** : les bras embrassaient les sources, le
  // symbole désignait le vide sous la pointe, et la valeur annoncée restait en
  // haut, à gauche de l'axe de l'accolade. On publie donc l'ancre ; c'est
  // `substitute` qui la lit et vient s'y poser (scene.poserAncre).
  //
  // Une accolade SANS symbole ne promet rien — `partition` découpe, elle ne
  // calcule pas —, elle ne publie donc aucune ancre.
  if (typeof spec.symbol === 'string' && spec.symbol) ctx.scene.poserAncre(ids, resultat);

  return {
    id,
    ids: crees,
    box,
    pointe: { x: box.cx, y: pointeY },
    resultat,
  };
}

/**
 * Une vraie accolade horizontale : deux bras qui remontent aux extrémités
 * (les sources sont dedans), deux coudes arrondis, une pointe centrale qui
 * descend. Coordonnées locales, `y` vers le bas, origine sur la barre.
 */
function braceD(W) {
  const r = round(Math.min(COUDE, Math.max(3, W * 0.3)));   // coude des bras
  const p = round(Math.min(COUDE, Math.max(3, W * 0.3)));   // amorce de la pointe
  const w = round(W);
  return [
    `M ${-w} ${-BRAS}`,
    `Q ${-w} 0 ${-w + r} 0`,
    `L ${-p} 0`,
    `Q 0 0 0 ${POINTE}`,
    `Q 0 0 ${p} 0`,
    `L ${w - r} 0`,
    `Q ${w} 0 ${w} ${-BRAS}`,
  ].join(' ');
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
