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
import { CAMERA_ID, PAN_ID, ENGINE_PREFIX, PALETTE, colorForKind } from './constants.js';
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
    this.ancres = new Map();   // source → où son résultat doit paraître
    // ★ Les accolades VIVANTES du step, avec ce qu'elles embrassent. Une
    //   accolade est une affirmation — « ceci, pris ensemble » — et la zone
    //   qu'elle désigne bouge : un effacement referme la ligne sous elle. Sans
    //   ce registre, chaque geste qui recalcule le flux devrait savoir de
    //   lui-même quelle accolade il fait mentir ; avec lui, il suffit de les
    //   parcourir (`primitives/helpers.js › suivreLesAccolades`).
    this.accolades = new Map(); // id de l'accolade → les jetons qu'elle embrasse
    this.suiveurs = new Map(); // jeton → nœuds de décor qui lui sont ACCROCHÉS

    // Nœud caméra : c'est lui qu'on zoome/déplace, jamais l'attribut viewBox.
    this.nodes.set(CAMERA_ID, makeNode({
      id: CAMERA_ID, role: 'camera', text: '', kind: null, group: null,
      inFlow: false, w: 0, base: { translate: { x: 0, y: 0 }, opacity: 1, scale: 1 },
    }));
    this.order.push(CAMERA_ID);
    this.everIds.add(CAMERA_ID);
    this.positions.set(CAMERA_ID, { x: 0, y: 0, w: 0, line: 0 });

    // Nœud de défilement, imbriqué DANS la caméra (voir `constants.PAN_ID`).
    // C'est lui qui fait glisser la ligne pour garder l'action au centre quand
    // la séquence est plus large que la scène.
    this.nodes.set(PAN_ID, makeNode({
      id: PAN_ID, role: 'pan', text: '', kind: null, group: null,
      inFlow: false, w: 0, base: { translate: { x: 0, y: 0 }, opacity: 1, scale: 1 },
    }));
    this.order.push(PAN_ID);
    this.everIds.add(PAN_ID);
    this.positions.set(PAN_ID, { x: 0, y: 0, w: 0, line: 0 });

    /**
     * Le défilement en vigueur pendant le step en cours de compilation.
     * Les primitives qui posent quelque chose « au centre de la scène » (un
     * clavier, une réglette, un encart) doivent le lire : le centre de la VUE
     * n'est le centre du viewBox que si la ligne ne défile pas
     * (`helpers.ancreVue`).
     */
    this.pan = { x: 0, y: 0 };

    for (const tok of tokens) {
      this.create({
        id: tok.id,
        text: tok.text,
        kind: tok.kind || guessKind(tok.text),
        group: tok.group ?? null,
        /* ★ **UN JETON DE DÉPART PEUT ÊTRE AUTRE CHOSE QU'UN TEXTE.**
           Le rôle était forcé à `text`, et c'était sans conséquence tant que
           tout ce qui n'est pas un glyphe naissait d'une op. Une BARRE DE
           FRACTION, elle, est là avant le premier geste : elle appartient à
           l'énoncé, pas à sa transformation. La forcer en texte obligerait à
           l'écrire en tirets — donc à une largeur figée par un nombre de
           signes, qui ne peut plus suivre ce qu'elle sépare (`primitives/
           rule.js`). Un scénario qui ne dit rien reste du texte, à l'octet
           près. */
        role: tok.role || 'text',
        w: tok.w,
        data: tok.data,
        inFlow: true,
        /* ★ **UN JETON DE DÉPART PEUT DEMANDER SA LIGNE, comme n'importe quel
           autre.** `create()` accepte `gapBefore` et `breakBefore` depuis
           toujours ; le constructeur, lui, les laissait tomber en chemin. La
           ligne de départ était donc la seule de toute la scène à ne pas
           pouvoir se disposer — une asymétrie sans raison, qu'on ne voyait pas
           tant qu'aucun scénario ne commençait sur plusieurs rangs.
           Un scénario qui n'en déclare pas garde exactement le comportement
           d'avant : `undefined` des deux côtés. */
        gapBefore: tok.gapBefore,
        breakBefore: tok.breakBefore,
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
    // ★ Un décor ACCROCHÉ à un jeton (`data.suit`) le suit partout — voir
    // `satellitesDe`. On indexe à la création, une fois : `reflow` est appelé
    // plusieurs fois par step et ne peut pas se permettre de balayer la scène.
    if (spec.data && typeof spec.data.suit === 'string' && spec.data.suit) {
      const liste = this.suiveurs.get(spec.data.suit);
      if (liste) liste.push(id);
      else this.suiveurs.set(spec.data.suit, [id]);
    }
    if (node.inFlow) {
      const idx = spec.insertAt !== undefined ? spec.insertAt : this.flow.length;
      this.flow.splice(clampIndex(idx, this.flow.length), 0, id);
    }
    return node;
  }

  /**
   * Fait ENTRER dans le flux un nœud qui vivait à côté.
   *
   * C'est ce dont a besoin un résultat de calcul : il paraît d'abord **sous la
   * pointe de l'accolade** — hors flux, à sa place de résultat — puis, une fois
   * les opérandes consommés, il rejoint la ligne. Sans ce passage, il faudrait
   * ou bien le créer dans le flux (et il naîtrait au milieu de ses propres
   * opérandes), ou bien créer deux tokens pour une seule valeur (et l'un des
   * deux id serait un mensonge).
   */
  enterFlow(id, index, where = '') {
    const n = this.live(id, where);
    if (this.flow.includes(id)) return false;
    n.inFlow = true;
    this.flow.splice(clampIndex(index === undefined ? this.flow.length : index, this.flow.length), 0, id);
    return true;
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

  /**
   * Les nœuds de décor ACCROCHÉS à un jeton — ceux qui doivent le suivre.
   *
   * ★ Pourquoi cette notion existe, alors que `partition` s'en passe. Une
   * accolade de découpage est posée à un ENDROIT : elle embrasse ce qui s'y
   * trouve à l'instant où on la trace, et elle se retire à la fin du step
   * précisément parce qu'elle ne suivrait pas (`primitives/partition.js`). Les
   * cornes, elles, sont posées SUR trois jetons et doivent durer jusqu'au
   * verdict : si la ligne défile, si un reflow resserre, si le verdict grossit
   * les chiffres, elles suivent — sans quoi la scène montrerait des cornes
   * flottant à côté de ce qu'elles couronnent, c'est-à-dire exactement le
   * contraire de « ce qui est montré est ce qui est compté ».
   *
   * Le halo y est joint sans avoir eu à changer de nom : il est, depuis
   * toujours, le même genre d'objet — un décor à un seul jeton, nommé par
   * convention `@halo:<id>`.
   */
  satellitesDe(id) {
    const explicites = this.accrochesA(id);
    const halo = `@halo:${id}`;
    return this.nodes.has(halo) ? [...explicites, halo] : explicites;
  }

  /**
   * Les décors accrochés DÉCLARÉS (`data.suit`), sans le halo.
   *
   * Le halo est un cas historique, nommé par convention et manipulé par une
   * demi-douzaine de primitives qui le désignent par son nom ; les gestes qui
   * doivent traiter les accrochages POUR EUX-MÊMES — le verdict, qui les
   * agrandit avec ce qu'ils couronnent — passent par ici et ne risquent donc
   * pas de faire au halo un sort qu'aucune de ces primitives n'attend.
   */
  accrochesA(id) {
    const l = this.suiveurs.get(id);
    return l ? l.slice() : [];
  }

  /**
   * Publie l'ancre de résultat d'une accolade — le point, sous sa pointe et
   * sous son symbole, où DOIT paraître ce qu'elle annonce.
   *
   * ★ Une accolade qui porte un symbole est une PROMESSE : « ceci, pris
   * ensemble, donne cela ». `sum` la tient lui-même. Les autres combinateurs —
   * un dénombrement, une moyenne, un écart — la tenaient jusqu'ici par un
   * `substitute`, qui faisait naître la valeur **dans la ligne**, en haut et à
   * gauche de l'accolade : les bras embrassaient les sources, le symbole
   * pointait vers le bas, et rien ne venait jamais s'y poser. L'accolade
   * publie donc son ancre, et `substitute` la lit.
   *
   * @param {string[]} ids   les sources embrassées
   * @param {{x:number,y:number}} point
   */
  poserAncre(ids, point) {
    for (const id of ids) this.ancres.set(id, { x: point.x, y: point.y });
  }

  /** L'ancre de résultat attendue pour la source `id`, s'il y en a une. */
  ancreDe(id) { return this.ancres.get(id) || null; }

  /**
   * Oublie les ancres. Appelé à chaque nouveau step : une accolade ne promet
   * que pour le geste en cours, et le step suivant repart d'une page nette.
   */
  oublierAncres() { this.ancres.clear(); this.accolades.clear(); }

  /** Une accolade vient d'être tracée : elle embrasse `sources`. */
  poserAccolade(id, sources) { this.accolades.set(id, [...sources]); }

  pos(id) { return this.positions.get(id) || null; }

  /**
   * Positionne un nœud hors flux (halo, accolade, badge…).
   * @returns {{from:object,to:object}|null} un déplacement si le nœud était déjà placé
   */
  place(id, p) {
    const node = this.nodes.get(id);
    const prev = this.positions.get(id);
    const next = { x: p.x, y: p.y, w: p.w !== undefined ? p.w : (node ? node.w : 0), line: 0 };
    if (p.h !== undefined) next.h = p.h;
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
