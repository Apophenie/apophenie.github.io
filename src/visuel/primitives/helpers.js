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
import { charCenter } from '../layout.js';

const KIND_SET = new Set(KINDS);

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
  const created = [];
  for (let i = 0; i < between.length - 1; i++) {
    const leftIdx = ctx.scene.flowIndex(between[i]);
    if (leftIdx < 0) fail(`${ctx.where}« ${between[i]} » n'est pas dans le flux de layout.`);
    const node = ctx.scene.create({
      id: ids[i],
      text: glyph,
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
 * Accumulation d'une somme : les opérandes volent vers la case résultat, qui
 * compte. Partagé par `sum` et `reduce`.
 *
 * @param {object} ctx
 * @param {{operands:string[], consume?:string[], to:object, at:number, dur:number,
 *          partials?:number[]}} spec
 */
export function accumulate(ctx, spec) {
  const { operands, to } = spec;
  const values = operands.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  const consume = absorbOperators(ctx, operands, spec.consume || []);
  const partials = spec.partials || values.reduce((acc, v) => {
    acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
    return acc;
  }, []);

  // La case résultat prend la place du premier opérande, à sa largeur finale
  // (recherche §4.7 : réserver la largeur évite le saut de mise en page).
  const firstIdx = ctx.scene.flowIndex(operands[0]);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: true, insertAt: firstIdx < 0 ? undefined : firstIdx,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });

  const consumed = [...operands, ...consume];
  for (const id of consumed) ctx.scene.kill(id, ctx.where);
  ctx.reflow({ at: spec.at, dur: spec.dur * 0.5 });

  const target = ctx.scene.pos(to.id);
  const n = operands.length;
  const flyDur = spec.dur * 0.55;
  const step = n > 1 ? (spec.dur * 0.35) / (n - 1) : 0;

  operands.forEach((id, i) => {
    const a = spec.at + i * step;
    ctx.anim({ id, prop: 'translate', to: { x: target.x, y: target.y }, at: a, dur: flyDur, ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.7, at: a, dur: flyDur });
    ctx.anim({ id, prop: 'opacity', to: 0, at: a + flyDur * 0.55, dur: flyDur * 0.45 });
  });
  for (const id of consume) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: spec.at, dur: spec.dur * 0.3 });
  }

  // La case résultat apparaît et compte : canal discret (le texte n'est pas
  // une propriété CSS).
  const appear = spec.at + spec.dur * 0.25;
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: appear, dur: spec.dur * 0.25 });
  ctx.anim({ id: to.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1], at: appear, dur: spec.dur * 0.5, ease: EASE.pop });
  const texts = partials.map((v) => String(v));
  ctx.discrete({
    id: to.id,
    channel: 'text',
    at: appear,
    dur: Math.max(1, spec.dur * 0.7),
    render: (u) => texts[Math.min(texts.length - 1, Math.floor(u * texts.length))],
  });

  return { partials, resultPos: target };
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
