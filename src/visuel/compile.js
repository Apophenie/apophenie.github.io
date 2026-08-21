/**
 * Compilateur `Scenario` → timeline.
 *
 * Modèle temporel (recherche §2.3, figé par CONTRACTS §3) :
 *
 *   step[i].t0    = Σ (durées des steps précédents)
 *   op.tStart     = step.t0 + (op.at ?? 0)
 *   op.tEnd       = op.tStart + (op.dur ?? DEFAULT_DUR[op.op])
 *   step.duration = étendue réelle des ops + (step.hold ?? 0)   si non fournie
 *   bounds        = [0, step0.t1, …, TOTAL]                     les charnières
 *
 * Tout est calculé **une fois**, sans DOM. Le résultat est une liste plate
 * d'animations (une par couple élément/propriété/segment) et une liste
 * d'enregistrements discrets pour le canal rAF.
 *
 * `prefers-reduced-motion` est traité **ici** et pas en CSS (CONTRACTS §6) :
 * les durées WAAPI sont fixées en JS et ignoreraient une règle CSS. Le mode
 * réduit sert aussi de repli pour les navigateurs sans WAAPI complet.
 */

import {
  EPS, MIN_STEP_DURATION, MIN_HINGE_GAP, DEFAULT_DUR, DUR_REDUCED_STEP,
  DUR_REDUCED_OP, EASE, VIEWBOX, PALETTE,
} from './constants.js';
import { fail, at as loc } from './errors.js';
import { validateScenario } from './scenario.js';
import { Scene } from './scene.js';
import { defaultMetrics, defaultLayoutOptions } from './layout.js';
import { PRIMITIVES } from './primitives/index.js';
import { indexDiscrete } from './clock.js';

/**
 * @param {object} scenario
 * @param {{speed?:number, reduced?:boolean, metrics?:object, layoutOpts?:object,
 *          glyphes?:object, viewBox?:object}} [options]
 */
export function compile(scenario, options = {}) {
  validateScenario(scenario);

  const speed = options.speed ?? 1;
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0) {
    fail(`option « speed » invalide : ${JSON.stringify(speed)} — un multiplicateur > 0 est attendu.`);
  }
  const reduced = !!options.reduced;
  const viewBox = options.viewBox || VIEWBOX;
  const metrics = options.metrics || defaultMetrics();
  const layoutOpts = options.layoutOpts || defaultLayoutOptions(metrics, viewBox);
  const palette = { ...PALETTE, ...(options.palette || {}) };

  const scene = new Scene(scenario.tokens, { metrics, layoutOpts, palette });

  const anims = [];
  const discrete = [];
  const warnings = [];
  const last = new Map(); // `${id}::${prop}` → dernière valeur connue

  const lastValue = (id, prop) => {
    const key = `${id}::${prop}`;
    if (last.has(key)) return last.get(key);
    const node = scene.get(id);
    if (!node) fail(`animation sur un nœud inconnu « ${id} ».`);
    const base = node.base[prop];
    if (base === undefined || base === null) {
      if (prop === 'translate') {
        fail(`nœud « ${id} » : position inconnue au moment de l'animer — la primitive doit le placer (scene.place / reflow) avant d'animer « translate ».`);
      }
      return DEFAULT_BASE[prop] ?? 0;
    }
    return base;
  };

  const steps = [];
  const bounds = [0];
  let cursor = 0;

  scenario.steps.forEach((step, si) => {
    const t0 = cursor;
    const where = { step: si, stepId: step.id };
    let extent = 0;

    const ops = (step.ops || []).map((op, i) => ({ op, i }));
    // Planification dans l'ordre temporel : la valeur « dernière connue » d'un
    // couple (élément, propriété) doit suivre le temps, pas l'ordre du tableau.
    ops.sort((a, b) => (a.op.at ?? 0) - (b.op.at ?? 0) || a.i - b.i);

    for (const { op, i } of ops) {
      const prim = PRIMITIVES[op.op];
      if (!prim) {
        fail(`${loc({ ...where, op: i, opName: op.op })}primitive « ${op.op} » non implémentée.`);
      }
      const where2 = loc({ ...where, op: i, opName: op.op });
      const opAt = reduced ? 0 : scale(op.at ?? 0, speed);
      const opDur = reduced ? DUR_REDUCED_OP : scale(op.dur ?? DEFAULT_DUR[op.op], speed);
      const opStagger = reduced ? 0 : scale(op.stagger ?? 0, speed);

      const ctx = {
        op,
        scene,
        metrics,
        layoutOpts,
        palette,
        reduced,
        speed,
        where: where2,
        glyphes: options.glyphes,
        dur: opDur,
        ease: op.ease || null,
        stagger: opStagger,
        gensym: (hint) => scene.gensym(hint),

        /** Émet une animation WAAPI. `at`/`dur` sont relatifs au début de l'op. */
        anim(spec) {
          const a = reduced ? 0 : (spec.at ?? 0);
          const d = reduced ? DUR_REDUCED_OP : Math.max(1, spec.dur ?? opDur);
          const prop = spec.prop;
          const id = spec.id;
          if (!scene.has(id)) fail(`${where2}animation sur un nœud inconnu « ${id} ».`);
          let frames;
          if (Array.isArray(spec.values)) {
            const n = spec.values.length;
            frames = spec.values.map((v, k) => ({
              offset: spec.offsets ? spec.offsets[k] : (n === 1 ? 1 : k / (n - 1)),
              value: v,
            }));
          } else {
            const from = spec.from !== undefined ? spec.from : lastValue(id, prop);
            frames = [{ offset: 0, value: from }, { offset: 1, value: spec.to }];
          }
          last.set(`${id}::${prop}`, frames[frames.length - 1].value);
          anims.push({
            id,
            prop,
            keyframes: frames,
            delay: round(t0 + opAt + a),
            duration: round(d),
            easing: spec.ease || ctx.ease || defaultEase(prop),
          });
          extent = Math.max(extent, opAt + a + d);
        },

        /** Émet un enregistrement du canal discret (texte, `d`, attribut). */
        discrete(spec) {
          const a = reduced ? 0 : (spec.at ?? 0);
          const d = reduced ? DUR_REDUCED_OP : Math.max(1, spec.dur ?? opDur);
          if (!scene.has(spec.id)) fail(`${where2}enregistrement discret sur un nœud inconnu « ${spec.id} ».`);
          if (typeof spec.render !== 'function') fail(`${where2}enregistrement discret sans fonction « render ».`);
          discrete.push({
            key: `${spec.id}::${spec.channel}`,
            id: spec.id,
            channel: spec.channel,
            at: round(t0 + opAt + a),
            dur: round(d),
            render: spec.render,
          });
          extent = Math.max(extent, opAt + a + d);
        },

        /** Recalcule le layout et anime les tokens déplacés (FLIP analytique). */
        reflow(spec = {}) {
          const moved = scene.relayout();
          for (const m of moved) {
            ctx.anim({
              id: m.id, prop: 'translate', from: m.from, to: m.to,
              at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
            });
            // Un halo suit toujours son token, sinon il se décroche au reflow.
            const halo = `@halo:${m.id}`;
            if (scene.has(halo) && scene.pos(halo)) {
              const mv = scene.place(halo, { x: m.to.x, y: m.to.y });
              if (mv) {
                ctx.anim({
                  id: halo, prop: 'translate', from: mv.from, to: mv.to,
                  at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
                });
              }
            }
          }
          return moved;
        },

        /** Place un nœud hors flux ; anime le déplacement s'il était déjà placé. */
        place(id, p, spec = {}) {
          const mv = scene.place(id, p);
          if (mv) {
            ctx.anim({ id, prop: 'translate', from: mv.from, to: mv.to, at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move });
          }
          return mv;
        },

        /** Marque une durée occupée sans rien animer (`wait`, temps de lecture). */
        occupy(ms) { extent = Math.max(extent, opAt + ms); },
      };

      prim.plan(ctx);
    }

    // --- durée du step ------------------------------------------------------
    const hold = reduced ? 0 : scale(step.hold ?? 0, speed);
    let duration;
    if (reduced) {
      duration = scale(DUR_REDUCED_STEP, speed);
    } else if (step.duration !== undefined) {
      duration = scale(step.duration, speed);
      if (duration + 1e-6 < extent) {
        fail(`${loc(where)}« duration » = ${round(duration)} ms est plus courte que l’étendue réelle de ses ops (${round(extent)} ms) : la fin du step serait tronquée. Retirez « duration » (le moteur la calcule) ou allongez-la.`);
      }
    } else {
      duration = extent + hold;
    }
    duration = round(duration);

    if (duration < MIN_STEP_DURATION) {
      fail(`${loc(where)}durée compilée de ${duration} ms — le minimum est ${MIN_STEP_DURATION} ms (CONTRACTS §3 : deux charnières confondues rendraient stepIndex ambigu). Un step vide doit porter une op « wait ».`);
    }

    cursor = round(cursor + duration);
    bounds.push(cursor);
    steps.push({
      index: si,
      id: step.id,
      title: step.title,
      caption: step.caption ?? null,
      t0: round(t0),
      t1: cursor,
      duration,
      hold: round(hold),
    });
  });

  // --- charnières distinctes -------------------------------------------------
  for (let i = 1; i < bounds.length; i++) {
    const gap = bounds[i] - bounds[i - 1];
    if (gap < MIN_HINGE_GAP) {
      fail(`charnières ${i - 1} et ${i} distantes de ${round(gap)} ms — le minimum est 2·EPS = ${MIN_HINGE_GAP} ms (EPS = ${EPS} ms).`);
    }
  }

  // --- conflits d'animation (avertissements, pas erreurs) --------------------
  const byKey = new Map();
  for (const a of anims) {
    const key = `${a.id}::${a.prop}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(a);
  }
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.delay - b.delay);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      if (list[i].delay + 1e-6 < prev.delay + prev.duration) {
        warnings.push(`animations concurrentes sur ${key} : [${prev.delay}, ${prev.delay + prev.duration}] et [${list[i].delay}, ${list[i].delay + list[i].duration}]. Deux ops se contredisent sur le même token (recherche §2.4, contrainte 4).`);
      }
    }
  }

  const total = bounds[bounds.length - 1];

  return {
    version: 1,
    scenario,
    reduced,
    speed,
    metrics,
    layoutOpts,
    viewBox,
    palette,
    nodes: scene.allNodes(),
    steps,
    bounds,
    total,
    anims,
    discrete,
    discreteIndex: indexDiscrete(discrete),
    warnings,
    scene,
  };
}

const DEFAULT_BASE = { opacity: 1, rotate: 0, scale: 1, strokeDashoffset: 100, r: 0 };

function defaultEase(prop) {
  if (prop === 'translate' || prop === 'scale' || prop === 'rotate') return EASE.move;
  return EASE.fade;
}

function scale(ms, speed) {
  return ms / speed;
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
