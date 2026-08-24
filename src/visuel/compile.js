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
 *
 * ACCÉLÉRATION DES RÉPÉTITIONS — voir le bloc « Répétitions » plus bas. Une
 * démonstration montre trois fois le même geste sur trois fragments ; la
 * première fois enseigne, les suivantes confirment. Les redites sont donc
 * compilées avec un multiplicateur de vitesse propre. C'est un choix de
 * DURÉES, fait à la compilation : rien ne change à l'exécution, la timeline
 * reste une fonction pure du temps et le nettoyage/rejeu du scrubbing est
 * exactement celui du multiplicateur global `speed`.
 */

import {
  EPS, MIN_STEP_DURATION, MIN_HINGE_GAP, DEFAULT_DUR, DUR_REDUCED_STEP,
  DUR_REDUCED_OP, EASE, VIEWBOX, PALETTE, PAN_ID,
} from './constants.js';
import { ciblesDuStep, boiteDuFlux, panPour, memePan } from './defilement.js';
import { bboxOf } from './layout.js';
import { fail, at as loc } from './errors.js';
import { validateScenario } from './scenario.js';
import { Scene } from './scene.js';
import { defaultMetrics, defaultLayoutOptions } from './layout.js';
import { PRIMITIVES } from './primitives/index.js';
import { indexDiscrete } from './clock.js';

/* ──────────────────────────── Répétitions ────────────────────────────
 *
 * « Une étape correspond exactement à une déjà exécutée dans la même
 * séquence. » Définition retenue, et elle ne regarde JAMAIS le libellé
 * (`title` / `caption` sont bilingues et cosmétiques) :
 *
 *   Deux steps sont ÉQUIVALENTS quand leurs `ops` sont identiques à un
 *   renommage près des identifiants de jetons — une alpha-équivalence.
 *
 * Autrement dit : même suite d'opérateurs, dans le même ordre, avec les mêmes
 * options et le même contenu dessiné (glyphe, segments, comptes, textes
 * produits, sommes partielles, `at`/`dur`/`stagger`…) ; seuls les `id`
 * diffèrent, et ils diffèrent forcément puisqu'un id n'est jamais réutilisé
 * (CONTRACTS §3, invariant 4). Les identifiants sont remplacés par leur rang
 * de première apparition DANS LE STEP, ce qui rend la comparaison insensible
 * à la numérotation des jetons.
 *
 * Sont donc exclus de la signature : `step.id`, `step.title`, `step.caption`,
 * `step.duration`, `step.hold` — l'emballage, pas le geste.
 *
 * Conséquence voulue : sur `hope-hope-hope.fr`, le comptage de segments du
 * « h » du deuxième groupe est la redite exacte de celui du premier ; celui du
 * « o » ne l'est pas (autre glyphe, autres segments, autre compte), il est la
 * redite du « o » du premier groupe. Chaque geste garde donc UNE lecture
 * pleine, la première, et une seule.
 */

/** Le facteur proposé à l'interface (CONTRACTS §3.3 : « 5× par exemple »). */
export const REPEAT_SPEED = 5;

/** Une étape déjà courte ne s'accélère pas : la compilation refuserait une
 *  durée sous `MIN_STEP_DURATION` (CONTRACTS §3). Garde-fou, jamais atteint
 *  par les scénarios réels — leurs étapes durent 2 à 4 secondes. */
const REPEAT_FLOOR = 10 * MIN_STEP_DURATION;


/**
 * Règle le facteur d'accélération des redites pour les compilations qui ne
 * passent pas d'option `repeatSpeed`.
 *
 * C'est une **préférence de lecture**, pas un paramètre de scénario : elle vit
 * donc à côté du thème et de la langue, côté application, et le lecteur n'a
 * qu'à `rebuild()` pour que la timeline s'y conforme. Le jour où
 * `player.js` relaiera `options.repeatSpeed` jusqu'ici, ce défaut de module
 * n'aura plus d'utilité.
 *
 * @param {number|boolean|null} facteur `true` ⇒ `REPEAT_SPEED`, `false`/`null`/`1` ⇒ désactivé.
 * @returns {number} le facteur retenu
 */


function normalizeRepeatSpeed(facteur) {
  if (facteur === true) return REPEAT_SPEED;
  if (facteur === false || facteur === null || facteur === undefined) return 1;
  const v = Number(facteur);
  if (!Number.isFinite(v) || v < 1) {
    fail(`option « repeatSpeed » invalide : ${JSON.stringify(facteur)} — un multiplicateur ≥ 1 est attendu (1 = pas d'accélération).`);
  }
  return v;
}

/**
 * La signature structurelle de chaque step — sa « forme de geste ».
 * @param {object} scenario
 * @returns {string[]} une signature par step, dans l'ordre du scénario
 */
export function stepSignatures(scenario) {
  const ids = collectIds(scenario);
  return (scenario.steps || []).map((step) => signStep(step, ids));
}

/**
 * Pour chaque step, l'index du **premier** step de même signature, ou `-1`
 * quand ce step inaugure sa forme. Les `-1` gardent leur rythme plein.
 * @param {object} scenario
 * @returns {number[]}
 */
export function repeatOrigins(scenario) {
  const vues = new Map();
  return stepSignatures(scenario).map((sig, i) => {
    if (!vues.has(sig)) { vues.set(sig, i); return -1; }
    return vues.get(sig);
  });
}

/** L'ensemble des chaînes qui DÉSIGNENT un jeton — pas ce qui est dessiné. */
function collectIds(scenario) {
  const ids = new Set();
  for (const tok of scenario.tokens || []) {
    if (tok && typeof tok.id === 'string') ids.add(tok.id);
  }
  // Les ids créés en cours de route : `to.id`, `digits[].id`, `ids[]` de
  // `insertOperators`, `tag` de `partition`. Tout le reste (`target`,
  // `targets`, `consume`, `between`…) ne fait que les référencer : c'est
  // l'appartenance à cet ensemble qui les fera reconnaître, pas leur clé.
  const parcourir = (v) => {
    if (Array.isArray(v)) { v.forEach(parcourir); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v)) {
      if ((k === 'id' || k === 'tag') && typeof val === 'string') ids.add(val);
      else if (k === 'ids' && Array.isArray(val)) {
        for (const s of val) if (typeof s === 'string') ids.add(s);
      }
      parcourir(val);
    }
  };
  for (const step of scenario.steps || []) parcourir(step.ops || []);
  return ids;
}

/** Sérialisation canonique des ops d'un step, identifiants alpha-renommés. */
function signStep(step, ids) {
  const alias = new Map();
  const renommer = (s) => {
    if (!alias.has(s)) alias.set(s, `#${alias.size}`);
    return alias.get(s);
  };
  const norm = (v) => {
    if (typeof v === 'string') return ids.has(v) ? renommer(v) : v;
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      const out = {};
      // Clés triées : deux ops identiques écrites dans un ordre de champs
      // différent doivent produire la même signature.
      for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(step.ops || []));
}

/** Minorant de la durée d'un step, connu AVANT de planifier ses ops. */
function nominalDuration(step) {
  if (step.duration !== undefined) return step.duration;
  let e = 0;
  for (const op of step.ops || []) {
    e = Math.max(e, (op.at ?? 0) + (op.dur ?? DEFAULT_DUR[op.op] ?? 0));
  }
  return e + (step.hold ?? 0);
}

/**
 * @param {object} scenario
 * @param {{speed?:number, repeatSpeed?:number|boolean, reduced?:boolean,
 *          metrics?:object, layoutOpts?:object, glyphes?:object,
 *          viewBox?:object}} [options]
 */
export function compile(scenario, options = {}) {
  validateScenario(scenario);

  const speed = options.speed ?? 1;
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0) {
    fail(`option « speed » invalide : ${JSON.stringify(speed)} — un multiplicateur > 0 est attendu.`);
  }
  const repeatSpeed = normalizeRepeatSpeed(options.repeatSpeed ?? 1);
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

  // En mouvement réduit, un step ne PARCOURT rien : il pose l'état d'arrivée et
  // laisse `DUR_REDUCED_STEP` pour le LIRE. Diviser ce temps de lecture par 5
  // n'abrégerait pas un trajet, ça rendrait la redite illisible — et le
  // spectateur qui a demandé moins de mouvement n'a pas demandé moins de temps.
  // L'accélération est donc purement et simplement ignorée dans ce mode.
  const origines = (!reduced && repeatSpeed > 1) ? repeatOrigins(scenario) : null;

  scenario.steps.forEach((step, si) => {
    const t0 = cursor;
    const where = { step: si, stepId: step.id };
    let extent = 0;

    const repeteDe = origines ? origines[si] : -1;
    const accelere = repeteDe >= 0 && nominalDuration(step) / repeatSpeed >= REPEAT_FLOOR;
    const stepSpeed = accelere ? speed * repeatSpeed : speed;

    // Les promesses d'accolade ne valent que pour le geste en cours (§3.1) :
    // un step commence sans ancre héritée du précédent.
    scene.oublierAncres();

    /* ─────────────────────────── Défilement ───────────────────────────
     * « Jamais deux lignes — fais défiler pour garder l'action au centre. »
     * Le cadrage VISÉ par ce step est calculé AVANT ses ops, sur les positions
     * dont le spectateur part : c'est ce qu'il regarde pendant qu'il regarde.
     * Les primitives qui posent quelque chose au centre de la scène le lisent
     * (`scene.pan`, via `helpers.ancreVue`). Voir `defilement.js`. */
    const panPrecedent = scene.pan;
    const panFocus = panPour(
      bboxOf(ciblesDuStep(step, scene), scene.positions, metrics, 0),
      boiteDuFlux(scene), layoutOpts, viewBox, panPrecedent,
    );
    scene.pan = panFocus;

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
      const opAt = reduced ? 0 : scale(op.at ?? 0, stepSpeed);
      const opDur = reduced ? DUR_REDUCED_OP : scale(op.dur ?? DEFAULT_DUR[op.op], stepSpeed);
      const opStagger = reduced ? 0 : scale(op.stagger ?? 0, stepSpeed);

      const ctx = {
        op,
        scene,
        metrics,
        layoutOpts,
        palette,
        reduced,
        // Le cadrage en vigueur pendant ce step : le centre de la VUE n'est le
        // centre du viewBox que si la ligne ne défile pas (`ancreVue`).
        pan: panFocus,
        speed: stepSpeed,
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

        /**
         * L'instant — relatif au début de CETTE op — où un canal redevient
         * libre, c'est-à-dire où plus aucune animation déjà planifiée dans ce
         * step ne le tient.
         *
         * ★ Deux ops d'un même step peuvent viser le même canal du même jeton
         * sans se contredire, à condition de se succéder. Le cas réel : le
         * verdict, où un `move` réordonne la ligne pendant que `reveal`
         * s'apprête à camper les chiffres au centre. `reveal` attend que le
         * `move` ait fini plutôt que de lui passer dessus — deux animations
         * concurrentes sur `translate` sont un avertissement de compilation, et
         * surtout un mouvement qui se contredit à l'écran.
         */
        libreA(id, prop) {
          let fin = 0;
          for (const a of anims) {
            if (a.delay < t0 || a.id !== id || a.prop !== prop) continue;  // ce step, et lui seul
            fin = Math.max(fin, a.delay + a.duration - t0);
          }
          return Math.max(0, fin - opAt);
        },
      };

      prim.plan(ctx);
    }

    // --- défilement : le cadrage de repos, une fois le geste accompli --------
    //
    // Une somme qui ramasse dix jetons en un seul raccourcit brutalement la
    // ligne. Sans ce deuxième cadrage, elle resterait plantée hors du cadre
    // jusqu'au step suivant. La même animation porte les trois valeurs :
    // d'où l'on vient, ce qu'on va regarder, où l'on se repose.
    const panRepos = panPour(
      bboxOf(ciblesDuStep(step, scene, { vivants: true }), scene.positions, metrics, 0),
      boiteDuFlux(scene), layoutOpts, viewBox, panFocus,
    );
    scene.pan = panRepos;
    if (!(memePan(panPrecedent, panFocus) && memePan(panFocus, panRepos))) {
      const dPan = reduced ? DUR_REDUCED_OP : Math.max(1, extent || MIN_STEP_DURATION);
      const valeurs = reduced ? [panRepos] : [panPrecedent, panFocus, panRepos];
      anims.push({
        id: PAN_ID,
        prop: 'translate',
        keyframes: valeurs.length === 1
          ? [{ offset: 1, value: panRepos }]
          : [{ offset: 0, value: panPrecedent }, { offset: 0.45, value: panFocus }, { offset: 1, value: panRepos }],
        delay: round(t0),
        duration: round(dPan),
        easing: EASE.move,
      });
      last.set(`${PAN_ID}::translate`, panRepos);
    }

    // --- durée du step ------------------------------------------------------
    const hold = reduced ? 0 : scale(step.hold ?? 0, stepSpeed);
    let duration;
    if (reduced) {
      duration = scale(DUR_REDUCED_STEP, speed);
    } else if (step.duration !== undefined) {
      duration = scale(step.duration, stepSpeed);
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
      // L'illustration du Registre voyage avec le libellé : `creerRegistre`
      // lit `lecteur.steps`, pas le scénario brut (CONTRACTS §6).
      figure: step.figure ?? null,
      t0: round(t0),
      t1: cursor,
      duration,
      hold: round(hold),
      // Ce que la barre de transport et le débogage ont besoin de savoir :
      // cette étape est-elle une redite, et de laquelle ?
      repeatOf: repeteDe,
      accelerated: accelere,
      speed: stepSpeed,
    });
  });

  // --- charnières distinctes -------------------------------------------------
  for (let i = 1; i < bounds.length; i++) {
    const gap = bounds[i] - bounds[i - 1];
    if (gap < MIN_HINGE_GAP) {
      fail(`charnières ${i - 1} et ${i} distantes de ${round(gap)} ms — le minimum est 2·EPS = ${MIN_HINGE_GAP} ms (EPS = ${EPS} ms).`);
    }
  }

  // --- aucun nœud sans position, aucune coordonnée qui n'en soit pas ---------
  //
  // ★ Deux chemins mènent au COIN SUPÉRIEUR GAUCHE de la scène, et un seul se
  // voit dans le code :
  //
  //  1. la position manque — `dom.applyBase` retombe alors sur
  //     « translate: 0 0 » ;
  //  2. la position existe mais l'une de ses coordonnées n'est pas un nombre —
  //     `dom.formatValue` passe par `num()`, qui rend 0 pour tout ce qui n'est
  //     pas fini. Un seul `undefined` dans une géométrie (une case de clavier
  //     absente, une métrique non calibrée) suffit : le nœud se peint à
  //     l'origine, avec son texte, sans la moindre erreur pour le trahir.
  //
  // Dans les deux cas le canal discret (rAF) écrit le texte du nœud
  // indépendamment de toute animation : on lit un jeton isolé dans le coin, et
  // le défaut ne se voit qu'en lecture. Le compilateur refuse donc les deux.
  const positionValide = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  for (const node of scene.allNodes()) {
    if (positionValide(node.base.translate)) continue;
    fail(`nœud « ${node.id} » (rôle « ${node.role} ») compilé sans position utilisable `
      + `(${JSON.stringify(node.base.translate)}) : il se peindrait à l'origine, en haut à gauche `
      + 'de la scène. La primitive qui le crée doit le placer (scene.place) ou le faire entrer '
      + 'dans le flux (ctx.reflow), avec des coordonnées finies.', { id: node.id });
  }
  for (const a of anims) {
    if (a.prop !== 'translate') continue;
    for (const k of a.keyframes) {
      if (positionValide(k.value)) continue;
      fail(`animation de « translate » sur « ${a.id} » avec une position inutilisable `
        + `(${JSON.stringify(k.value)}) : le nœud sauterait à l'origine, en haut à gauche de la scène.`,
      { id: a.id });
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
    repeatSpeed: origines ? repeatSpeed : 1,
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
