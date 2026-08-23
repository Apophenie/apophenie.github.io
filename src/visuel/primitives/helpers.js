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
 * Accumulation d'une somme — la composition demandée par CONTRACTS §3.1 pour
 * tout combinateur : **les sources dans l'accolade, le résultat sous la
 * pointe, l'opération écrite**.
 *
 * Cinq temps, dans cet ordre de lecture :
 *
 *  1. l'accolade se trace sous les opérandes, qui se resserrent : ils sont
 *     dedans, on voit ce qui est pris ensemble ;
 *  2. le **symbole d'opération** paraît sous la pointe — `Σ`, `∏`, `−`… Une
 *     accolade nue ne dirait pas ce qu'on fait ;
 *  3. la case résultat s'ouvre **sous le symbole**, et compte ;
 *  4. les opérandes y volent un par un et s'y effacent ;
 *  5. l'accolade se retire et le résultat **remonte prendre leur place** dans
 *     la ligne — c'est ce dernier geste qui dit que le calcul est refermé.
 *
 * Le compteur est du texte : canal discret, fonction pure de `t` (scrubbing
 * exact). La largeur finale est réservée dès l'ouverture de la case.
 *
 * @param {object} ctx
 * @param {{operands:string[], consume?:string[], to:object, at:number, dur:number,
 *          partials?:number[], symbol?:string, label?:string}} spec
 */
export function accumulate(ctx, spec) {
  const { operands, to } = spec;
  const T = spec.dur;
  const t0 = spec.at;
  const values = operands.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  const consume = absorbOperators(ctx, operands, spec.consume || []);
  const partials = spec.partials || values.reduce((acc, v) => {
    acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
    return acc;
  }, []);

  const firstIdx = ctx.scene.flowIndex(operands[0]);

  // --- 1 & 2. l'accolade et son symbole ------------------------------------
  const acc = tracerAccolade(ctx, operands, {
    shape: 'brace',
    tighten: 0.66,
    symbol: spec.symbol,
    label: spec.label,
    at: t0,
    dur: T * 0.26,
  });
  const ancre = acc ? acc.resultat : posDeRepli(ctx, operands);

  // --- 3. la case résultat, sous la pointe ---------------------------------
  const espacement = espacementDe(ctx, operands[0]);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacement,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(to.id, ancre);

  const appear = t0 + T * 0.24;
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: appear, dur: T * 0.12 });
  ctx.anim({ id: to.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1], at: appear, dur: T * 0.2, ease: EASE.pop });

  // --- 4. les opérandes volent vers elle, un par un ------------------------
  const n = operands.length;
  const debutVol = t0 + T * 0.28;
  const finVol = t0 + T * 0.72;
  const cadence = n > 1 ? (finVol - debutVol) * 0.62 / (n - 1) : 0;
  const vol = Math.max(1, (finVol - debutVol) - cadence * (n - 1));

  operands.forEach((id, i) => {
    const a = debutVol + i * cadence;
    ctx.anim({ id, prop: 'translate', to: { x: ancre.x, y: ancre.y }, at: a, dur: vol, ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.65, at: a, dur: vol });
    ctx.anim({ id, prop: 'opacity', to: 0, at: a + vol * 0.6, dur: vol * 0.4 });
  });
  for (const id of consume) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: debutVol, dur: T * 0.2 });
  }

  // Le compteur suit exactement l'arrivée des opérandes : chaque atterrissage
  // fait avancer le total. Fonction pure de `t`, donc rejouable en arrière.
  const texts = ['0', ...partials.map((v) => String(v))];
  ctx.discrete({
    id: to.id,
    channel: 'text',
    at: appear,
    dur: Math.max(1, (debutVol + cadence * (n - 1) + vol) - appear),
    render: (u) => texts[Math.min(texts.length - 1, Math.floor(u * texts.length))],
  });

  // --- 5. l'accolade se retire, le résultat remonte dans la ligne ----------
  const retrait = t0 + T * 0.74;
  if (acc) {
    for (const id of acc.ids) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: retrait, dur: T * 0.14 });
    }
  }
  const consumed = [...operands, ...consume];
  for (const id of consumed) ctx.scene.kill(id, ctx.where);
  ctx.scene.enterFlow(to.id, firstIdx < 0 ? undefined : firstIdx, ctx.where);
  ctx.reflow({ at: t0 + T * 0.78, dur: T * 0.22, ease: EASE.move });

  return { partials, resultPos: ctx.scene.pos(to.id), brace: acc };
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
  if (spec.tighten) {
    const gap = ctx.layoutOpts.gap;
    ids.slice(1).forEach((id) => { ctx.scene.get(id).gapBefore = gap * spec.tighten; });
    ctx.reflow({ at, dur: dur * 0.45, ease: EASE.move });
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
    ctx.scene.place(sid, { x: box.cx, y: symboleY });
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
    ctx.scene.place(lid, { x: box.cx, y: spec.symbol ? symboleY + fs * 0.56 : symboleY });
    ctx.anim({ id: lid, prop: 'opacity', to: 1, at: at + dur * 0.65, dur: dur * 0.35 });
    crees.push(lid);
  }

  return {
    id,
    ids: crees,
    box,
    pointe: { x: box.cx, y: pointeY },
    // Où va le résultat : sous la pointe, sous le symbole, sous la légende.
    resultat: {
      x: box.cx,
      y: symboleY + fs * (spec.label ? 1.34 : 0.92),
    },
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
