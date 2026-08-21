/**
 * Modèle de scène — l'état de la démonstration au fil de la compilation.
 *
 * Aucun DOM : la scène est une structure JS que le compilateur déroule step par
 * step. Les positions viennent du layout engine (unités viewBox), jamais d'une
 * mesure d'élément — c'est ce qui rend le FLIP « analytique » (recherche §5.5).
 *
 * CONTRACTS §3.2 règle 7 : un token n'est **jamais** retiré du DOM. `kill()` le
 * sort du *flux de layout* (structure JS), pas du document : un `drop` reste
 * réversible par `seek()` en arrière.
 */

import { layoutFlow, measureText } from './layout.js';
import { CAMERA_ID, ENGINE_PREFIX, PALETTE, colorForKind } from './constants.js';
import { fail } from './errors.js';

export class Scene {
  /**
   * @param {{id:string,text:string,kind?:string,group?:string}[]} tokens
   * @param {{metrics:object, layoutOpts:object, palette?:object}} env
   */
  constructor(tokens, env) {
    this.metrics = env.metrics;
    this.layoutOpts = env.layoutOpts;
    this.palette = env.palette || PALETTE;
    this.nodes = new Map();
    this.order = [];       // ordre de création = ordre du DOM
    this.flow = [];        // ids participant au layout, dans l'ordre de lecture
    this.positions = new Map();
    this.everIds = new Set();
    this.deadIds = new Set();
    this.autoSeq = 0;

    // Nœud caméra : c'est lui qu'on zoome/déplace, jamais l'attribut viewBox.
    this.nodes.set(CAMERA_ID, makeNode({
      id: CAMERA_ID, role: 'camera', text: '', kind: null, group: null,
      inFlow: false, w: 0, base: { translate: { x: 0, y: 0 }, opacity: 1, scale: 1 },
    }));
    this.order.push(CAMERA_ID);
    this.everIds.add(CAMERA_ID);
    this.positions.set(CAMERA_ID, { x: 0, y: 0, w: 0, line: 0 });

    for (const tok of tokens) {
      this.create({
        id: tok.id,
        text: tok.text,
        kind: tok.kind || guessKind(tok.text),
        group: tok.group ?? null,
        role: 'text',
        inFlow: true,
      }, { initial: true });
    }
    this.relayout();
  }

  /** Identifiant interne unique, préfixé `@` — jamais référençable par un scénario. */
  gensym(hint = 'n') {
    return `${ENGINE_PREFIX}${hint}:${this.autoSeq++}`;
  }

  has(id) { return this.nodes.has(id); }

  get(id) { return this.nodes.get(id); }

  /**
   * Récupère un nœud vivant, ou échoue avec un message qui distingue les trois
   * causes possibles (invariants 3 et 4 de CONTRACTS §7.1).
   */
  live(id, where = '') {
    if (typeof id !== 'string' || !id) fail(`${where}identifiant de token attendu (chaîne non vide).`);
    const n = this.nodes.get(id);
    if (!n) {
      fail(`${where}token « ${id} » inconnu à cet instant de la timeline : il n'est ni déclaré dans « tokens », ni créé par une op antérieure (CONTRACTS §7.1, invariant 3).`, { id });
    }
    if (!n.alive) {
      fail(`${where}token « ${id} » a déjà été supprimé : un id supprimé n'est jamais réutilisé (CONTRACTS §7.1, invariant 4).`, { id });
    }
    return n;
  }

  /**
   * Crée un nœud. `id` doit être neuf : un id créé n'est jamais recréé.
   * @param {object} spec
   * @param {{initial?:boolean, where?:string}} [opt]
   */
  create(spec, opt = {}) {
    const where = opt.where || '';
    const id = spec.id;
    if (typeof id !== 'string' || !id) fail(`${where}création de nœud sans identifiant : c'est l'émetteur qui nomme les tokens qu'il crée (CONTRACTS §3).`);
    if (this.everIds.has(id)) {
      fail(`${where}identifiant « ${id} » déjà utilisé : un id créé n'est jamais recréé, un id supprimé n'est jamais réutilisé (CONTRACTS §3, invariant 4).`, { id });
    }
    const w = spec.w !== undefined ? spec.w : measureText(spec.text ?? '', this.metrics);
    const node = makeNode({
      ...spec,
      w,
      base: {
        translate: null,
        opacity: opt.initial ? 1 : 0,
        rotate: 0,
        scale: 1,
        fill: (spec.role || 'text') === 'text' ? colorForKind(spec.kind, this.palette) : undefined,
        ...(spec.base || {}),
      },
    });
    this.nodes.set(id, node);
    this.order.push(id);
    this.everIds.add(id);
    if (node.inFlow) {
      const idx = spec.insertAt !== undefined ? spec.insertAt : this.flow.length;
      this.flow.splice(clampIndex(idx, this.flow.length), 0, id);
    }
    return node;
  }

  /** Sort un nœud du flux de layout. L'élément reste dans le DOM (règle 7). */
  kill(id, where = '') {
    const n = this.live(id, where);
    n.alive = false;
    const i = this.flow.indexOf(id);
    if (i >= 0) this.flow.splice(i, 1);
    this.deadIds.add(id);
    return n;
  }

  /** Index d'un id dans le flux (−1 s'il n'y est pas). */
  flowIndex(id) { return this.flow.indexOf(id); }

  pos(id) { return this.positions.get(id) || null; }

  /**
   * Positionne un nœud hors flux (halo, accolade, badge…).
   * @returns {{from:object,to:object}|null} un déplacement si le nœud était déjà placé
   */
  place(id, p) {
    const node = this.nodes.get(id);
    const prev = this.positions.get(id);
    const next = { x: p.x, y: p.y, w: p.w !== undefined ? p.w : (node ? node.w : 0), line: 0 };
    this.positions.set(id, next);
    if (!prev) {
      if (node) node.base.translate = { x: next.x, y: next.y };
      return null;
    }
    if (Math.abs(prev.x - next.x) < 0.01 && Math.abs(prev.y - next.y) < 0.01) return null;
    return { id, from: prev, to: next };
  }

  /**
   * Recalcule le layout du flux. Renvoie les déplacements à animer ; les nœuds
   * placés pour la première fois reçoivent leur position **de base** (ils
   * n'existaient pas avant, donc rien à animer).
   * @returns {{id:string, from:{x:number,y:number}, to:{x:number,y:number}}[]}
   */
  relayout() {
    const items = this.flow.map((id) => {
      const n = this.nodes.get(id);
      return { id, w: n.w, gapBefore: n.gapBefore, breakBefore: n.breakBefore };
    });
    const res = layoutFlow(items, this.layoutOpts);
    this.lastLayout = res;
    const moved = [];
    for (const [id, p] of res.positions) {
      const prev = this.positions.get(id);
      if (!prev) {
        this.positions.set(id, p);
        this.nodes.get(id).base.translate = { x: p.x, y: p.y };
      } else if (Math.abs(prev.x - p.x) > 0.01 || Math.abs(prev.y - p.y) > 0.01) {
        moved.push({ id, from: { x: prev.x, y: prev.y }, to: { x: p.x, y: p.y } });
        this.positions.set(id, p);
      } else {
        this.positions.set(id, p);
      }
    }
    return moved;
  }

  /**
   * Résout un sélecteur de cibles.
   * Accepte `string`, `string[]`, `{group}`, `{groupNot}`, `{kind}`, `{all:true}`.
   */
  resolve(targets, where = '') {
    if (typeof targets === 'string') return [this.live(targets, where).id];
    if (Array.isArray(targets)) return targets.map((t) => this.live(t, where).id);
    if (targets && typeof targets === 'object') {
      const pool = this.flow.filter((id) => this.nodes.get(id).alive);
      if (targets.all) return pool;
      if (typeof targets.group === 'string') return pool.filter((id) => this.nodes.get(id).group === targets.group);
      if (typeof targets.groupNot === 'string') return pool.filter((id) => this.nodes.get(id).group !== targets.groupNot);
      if (typeof targets.kind === 'string') return pool.filter((id) => this.nodes.get(id).kind === targets.kind);
      fail(`${where}sélecteur de cibles inconnu : ${JSON.stringify(targets)}. Formes admises : "id", ["id"], {group}, {groupNot}, {kind}, {all:true}.`);
    }
    fail(`${where}« targets » manquant.`);
    return [];
  }

  /** Tous les nœuds, dans l'ordre de création (= ordre d'insertion dans le DOM). */
  allNodes() {
    return this.order.map((id) => this.nodes.get(id));
  }
}

function makeNode(spec) {
  return {
    id: spec.id,
    role: spec.role || 'text',
    text: spec.text ?? '',
    kind: spec.kind ?? null,
    group: spec.group ?? null,
    inFlow: !!spec.inFlow,
    alive: true,
    w: spec.w ?? 0,
    gapBefore: spec.gapBefore,
    breakBefore: spec.breakBefore,
    data: spec.data || null,
    base: {
      translate: null,
      opacity: 1,
      rotate: 0,
      scale: 1,
      ...(spec.base || {}),
    },
  };
}

function clampIndex(i, n) {
  return i < 0 ? 0 : i > n ? n : i;
}

/** `kind` par défaut d'un texte, quand l'émetteur ne le précise pas. */
export function guessKind(text) {
  if (/^\s+$/.test(text)) return 'space';
  if (/^\d+$/.test(text)) return text.length === 1 ? 'digit' : 'number';
  if (/^[+\-×÷=]$/.test(text)) return 'operator';
  if (/^[a-zA-ZÀ-ÿ]$/.test(text)) return 'letter';
  return 'punct';
}
