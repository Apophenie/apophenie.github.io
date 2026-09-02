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
 *
 * ★ **Les drapeaux de décor mutualisé ne font pas partie du geste.** Quand
 * plusieurs conversions d'affilée emploient la même table, l'assemblage marque
 * la première d'un `montre` et la dernière d'un `retire` (CONTRACTS §3.1,
 * amendement « `table` ») : la réglette monte une fois, demeure, se retire une
 * fois. Ces deux booléens décrivent le CYCLE DE VIE DU DÉCOR, pas la
 * conversion ; les laisser dans la signature avait deux effets, tous deux
 * faux :
 *
 *   · l'étape du MILIEU d'une série ne se reconnaissait plus dans l'étape de
 *     TÊTE d'une série précédente — sur `hope-hope-hope.fr`, le « h » du
 *     deuxième groupe (phase 6) ne voyait pas qu'il redisait le « h » du
 *     premier (phase 2), au seul motif que celui-là avait, en plus, déployé la
 *     réglette ;
 *   · l'étape de QUEUE d'une série n'était jamais une redite de personne —
 *     phase 13, le « e » du troisième groupe, alors qu'il redit mot pour mot
 *     le « e » du premier.
 *
 * Le critère énoncé par l'auteur est **même table ET même conversion**. C'est
 * exactement ce qu'on obtient en retirant ces deux drapeaux : une même table
 * employée pour une AUTRE lettre reste une lecture pleine (le `letter` et le
 * `to.text` diffèrent, donc la signature aussi), et le repli du décor, qui ne
 * montre rien de neuf, suit le rythme de la conversion qu'il accompagne.
 */

/** Ce qui, dans une op, décrit le décor et non le geste — hors signature. */
const HORS_SIGNATURE = new Set(['montre', 'retire']);

/** Le facteur proposé à l'interface (CONTRACTS §3.3 : « 5× par exemple »). */
export const REPEAT_SPEED = 5;

/**
 * Vitesse de croisière du panoramique, en unités de viewBox par seconde, et ses
 * deux bornes en millisecondes. Voir `jalonsDuPan`. Les 450 sont pris au milieu
 * de ce que les panoramiques SAINS du corpus faisaient déjà (127 à 637) : on
 * ne dicte pas un rythme neuf, on donne le leur à ceux qui l'avaient perdu.
 */
/* La distance qui vaut le trajet le plus long, en unités de viewBox, et les
   deux bornes de la fraction d'étape qu'un trajet peut prendre. Trois nombres
   de GÉOMÉTRIE et de PROPORTION : aucun ne dépend du temps, donc aucun ne bouge
   quand une redite s'accélère. */
const PAN_REFERENCE = 620;
const PAN_PART_MIN = 0.04;
const PAN_PART_MAX = 0.22;

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

/**
 * ★ UNE REDITE NE S'ACCÉLÈRE QU'AU MILIEU DE SES PAREILLES.
 *
 * Avoir déjà été vu ne suffit pas, et c'est une leçon d'usage. Une série de
 * conversions — des lettres qui montent l'une après l'autre vers la même
 * réglette — commence par MONTER le décor et finit par le RETIRER. Ces deux
 * moments ne sont pas dans le geste : ils l'encadrent, et c'est pourquoi
 * `montre` et `retire` sont hors signature (ils décrivent le cycle de vie du
 * décor, pas ce qu'on fait dessus). Conséquence : le dernier pas d'une série
 * portait la signature d'un pas antérieur, se déclarait redite, et s'expédiait
 * cinq fois plus vite — emportant avec lui la disparition de la table, que
 * personne n'avait le temps de voir.
 *
 * La règle ferme les deux bouts : « l'accélération ne doit s'activer que si
 * l'opération précédente ET l'opération suivante sont du même type, et que la
 * conversion précise actuelle a déjà eu lieu » (l'auteur). Un pas de bord — le
 * premier, le dernier, ou celui qui touche un geste étranger — garde son
 * rythme plein quoi qu'il ait déjà été joué.
 *
 * ★ Le TYPE est LU sur le step, jamais déclaré : la suite des noms d'ops qu'il
 *   émet. Deux passages de réglette sont du même type ; une réglette et un
 *   verdict ne le sont pas. Rien à tenir à jour le jour où une primitive
 *   s'ajoute — ce qui serait une seconde table de vérité à laisser diverger.
 *
 * @returns {number[]} par step, l'origine de la redite ACCÉLÉRABLE, ou -1
 */
export function repeatAccelerables(scenario) {
  const steps = scenario.steps || [];
  const types = steps.map(typeDeStep);
  return repeatOrigins(scenario).map((origine, i) => {
    if (origine < 0) return -1;
    if (i === 0 || i === steps.length - 1) return -1;
    if (types[i - 1] !== types[i] || types[i + 1] !== types[i]) return -1;
    return origine;
  });
}

/**
 * ★ **LE RECENTRAGE DURE CE QUE SON TRAJET DEMANDE — plus toute l'étape.**
 *
 * > « Entre les 3 `mpf`, plus particulièrement à la fin du 2ᵉ, c'est comme si le
 * >   temps gagné en mode redite était perdu pour centrer le suivant avec une
 * >   lenteur anormale. Corrige ce timing de recentrage qui est bien trop
 * >   long. » (l'auteur)
 *
 * Les trois jalons — d'où l'on vient, ce qu'on regarde, où l'on se repose —
 * étaient posés à 0, 0,45 et 1 de la durée du step, QUELLE QUE SOIT la distance
 * à parcourir. Un step de huit secondes qui déplace la vue de soixante-neuf
 * unités donnait donc un glissement à NEUF unités par seconde, là où les
 * panoramiques sains du même scénario tiennent entre 127 et 637. Quatorze fois
 * trop lent : ce n'est pas une lenteur perçue, c'est une lenteur mesurée.
 *
 * ★ **ET LA REDITE AGGRAVAIT LE CAS AU LIEU DE L'AIDER.** Accélérer un step
 *   raccourcit ses gestes ; le panoramique, lui, s'étirait sur ce qui restait.
 *   Le temps gagné sur le geste était rendu au déplacement — exactement ce que
 *   l'auteur décrit.
 *
 * ★ **CE QU'ON CHANGE N'EST PAS LA DURÉE, CE SONT LES JALONS.** L'animation
 *   couvre toujours le step : la caméra doit être au repos à sa fin, et rien
 *   d'autre ne peut le garantir. Mais chaque TRAJET prend le temps de sa
 *   distance, et la vue TIENT entre les deux — un mouvement franc puis une
 *   pause se lisent ; une dérive continue ne se lit pas, elle se subit.
 *
 * @returns {{offset:number, value:object}[]} quatre jalons, ou trois si le
 *   step est trop court pour ménager une pause
 */
function jalonsDuPan(precedent, focus, repos, duree) {
  const dist = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  /* ★ **DES FRACTIONS DE L'ÉTAPE, ET NON DES MILLISECONDES.**

     La première version donnait à chaque trajet un temps ABSOLU, tiré d'une
     vitesse de croisière en unités par seconde. C'était le plus direct, et
     c'était faux pour une raison qu'un test a rattrapée : « l'accélération des
     redites ne change QUE les durées ». Un temps absolu ne suit pas
     l'accélération — dans une redite jouée cinq fois plus vite, le panoramique
     occupait cinq fois plus de l'étape, et la redite ne jouait plus la même
     chose, seulement plus vite.

     ⚠️ Diviser par la vitesse du step ne répare pas : certaines étapes sont
       marquées accélérées sans que leur étendue rétrécisse (mesuré — un
       panoramique de 7 900 ms identique dans les deux compilations, pour un
       `stepSpeed` de 5). Il n'existe donc aucun facteur temporel fiable ; la
       seule grandeur qui ne bouge JAMAIS avec la vitesse est la DISTANCE, qui
       est de la géométrie.

     Chaque trajet prend donc une fraction de l'étape proportionnelle à ce qu'il
     parcourt, rapportée à `PAN_REFERENCE` — la distance qui mérite le trajet le
     plus long. Un déplacement court prend peu, un long prend le plafond, et la
     vue TIENT entre les deux : c'est ce que l'auteur demandait — « corrige ce
     timing de recentrage qui est bien trop long » — et c'est désormais vrai à
     toutes les vitesses. */
  const part = (d) => (d <= 0.5 ? 0
    : Math.min(PAN_PART_MAX, Math.max(PAN_PART_MIN, d / PAN_REFERENCE)));
  const f1 = part(dist(precedent, focus));
  const f2 = part(dist(focus, repos));

  // Pas la place de tenir : partage proportionnel, qui reste meilleur que le
  // 0,45 fixe puisqu'il suit au moins les deux distances.
  if (f1 + f2 >= 1) {
    const total = f1 + f2;
    return [
      { offset: 0, value: precedent },
      { offset: total > 0 ? Math.min(0.9, Math.max(0.1, f1 / total)) : 0.45, value: focus },
      { offset: 1, value: repos },
    ];
  }
  return [
    { offset: 0, value: precedent },
    { offset: f1, value: focus },
    { offset: 1 - f2, value: focus },
    { offset: 1, value: repos },
  ];
}

/** La « forme de geste » d'un step, aux valeurs près : la suite de ses ops. */
function typeDeStep(step) {
  return ((step && step.ops) || []).map((o) => (o && o.op) || '?').join('>');
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
      for (const k of Object.keys(v).sort()) {
        if (HORS_SIGNATURE.has(k)) continue;   // cycle de vie du décor, pas le geste
        out[k] = norm(v[k]);
      }
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
  // Copie : la compilation ÉCRIT dans ces options (`partition` y pose le report
  // de cadrage du découpage, `reveal` l'y efface). Compiler deux fois le même
  // scénario doit donner deux fois le même résultat — donc jamais depuis un
  // objet que la compilation précédente aurait laissé sali.
  const layoutOpts = { ...(options.layoutOpts || defaultLayoutOptions(metrics, viewBox)) };
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
      // ★ Une COULEUR n'a pas de valeur par défaut, et zéro n'en est pas une.
      //
      // Sans ce refus, un nœud créé sans `base.fill` voyait sa keyframe de
      // départ valoir `0` ; le navigateur écrit « Invalid keyframe value for
      // property fill: 0 » dans la console et **jette l'animation**. Le geste
      // ne se produit tout simplement pas, et rien dans la compilation ne le
      // dit — mesuré : quinze brasiers muets sur `hope-hope-hope.fr`, aucun
      // test rouge. Le silence est le vrai défaut ; l'échec bruyant le corrige.
      if (COULEURS.has(prop)) {
        fail(`nœud « ${id} » : animation de « ${prop} » sans couleur de départ. `
          + 'Une couleur n’a pas de valeur par défaut — déclarez-la dans '
          + '`base` à la création du nœud.');
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
  const origines = (!reduced && repeatSpeed > 1) ? repeatAccelerables(scenario) : null;

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
        // ★ La scénographie du verdict (CONTRACTS §3.1, amendement « l'orage »).
        //   Elle n'est PAS dans le scénario — celui-ci est le même objet pur
        //   dans les deux registres — mais dans les options de compilation, à
        //   côté de `reduced` : c'est une décision de MISE EN SCÈNE, prise par
        //   la page qui a lu le lien, pas par l'émetteur du scénario.
        scenographie: !!options.scenographie,
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

        /**
         * Émet une animation sur un jeton **ET sur tout ce qui lui est
         * accroché**, à l'identique : même départ, même durée, même courbe.
         *
         * ★ Pourquoi ce raccourci existe, et pourquoi il n'est pas facultatif.
         *
         * Un décor accroché (`data.suit` — les cornes du 666, le halo) n'a pas
         * de trajectoire propre : il n'a de sens que collé à ce qu'il désigne.
         * Tant que chaque primitive recopiait l'animation à la main, les deux
         * dérivaient : `effacerSurPlace` faisait disparaître le halo en 0,7 fois
         * la durée du jeton et sans courbe déclarée, `reveal` faisait de même
         * pour les restes, et **aucun des deux ne transmettait le `scale`** — un
         * halo restait donc à sa taille pendant que son jeton rapetissait.
         * Trois recopies, trois occasions de diverger : on n'en garde qu'une.
         *
         * ★ Ce raccourci ne vaut QUE pour les canaux dont la valeur est
         * commune — `opacity`, `scale`, `rotate`, `fill`. `translate`, lui, a
         * une cible par nœud : c'est `reflow`/`place` qui la calcule, et qui
         * applique la même règle de solidarité avec ses propres valeurs.
         */
        animSolidaire(spec) {
          if (spec.prop === 'translate') {
            fail(`${where2}« animSolidaire » ne sait pas transporter « translate » : chaque nœud a `
              + 'sa propre cible de position, c’est « reflow » ou « place » qui la calcule.');
          }
          ctx.anim(spec);
          for (const sid of scene.satellitesDe(spec.id)) {
            if (!scene.has(sid)) continue;
            ctx.anim({ ...spec, id: sid });
          }
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

        /**
         * Recalcule le layout et anime les tokens déplacés (FLIP analytique).
         *
         * ★ `spec.trajectoire` — le chemin, quand la ligne droite ment.
         *
         *   Par défaut un jeton qui change de place y va tout droit : c'est ce
         *   qu'on veut d'un resserrement, d'un rangement, d'une insertion. Un
         *   MIROIR, non — deux jetons qui échangent leurs places en ligne
         *   droite se traversent, et rien ne dit lequel est allé où. La
         *   fonction reçoit le déplacement `{id, from, to}` et rend
         *   `{trajet, tailles}` (voir `primitives/ellipse.js`), ou `null` pour
         *   laisser la ligne droite.
         *
         *   Elle ne vaut que pour le jeton lui-même : les décors accrochés
         *   suivent, eux, par le chemin le plus court — une corne n'a pas de
         *   trajectoire propre, elle est collée à ce qu'elle couronne.
         */
        reflow(spec = {}) {
          const moved = scene.relayout();
          for (const m of moved) {
            const courbe = typeof spec.trajectoire === 'function' ? spec.trajectoire(m) : null;
            if (courbe && Array.isArray(courbe.trajet) && courbe.trajet.length > 2) {
              const n = courbe.trajet.length - 1;
              ctx.anim({
                id: m.id, prop: 'translate',
                values: courbe.trajet, offsets: courbe.trajet.map((_, i) => i / n),
                at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
              });
              if (Array.isArray(courbe.tailles) && courbe.tailles.length > 1) {
                const p = courbe.tailles.length - 1;
                ctx.anim({
                  id: m.id, prop: 'scale',
                  values: courbe.tailles, offsets: courbe.tailles.map((_, i) => i / p),
                  at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
                });
              }
            } else {
              ctx.anim({
                id: m.id, prop: 'translate', from: m.from, to: m.to,
                at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
              });
            }
            // ★ Le décor ACCROCHÉ à un jeton le suit toujours, sinon il se
            // décroche au reflow : le halo, comme les cornes du 666. Le
            // déplacement est le MÊME (mêmes `at`, `dur` et courbe), sans quoi
            // le décor arriverait après ce qu'il désigne.
            //
            // ★ `data.decalage` — l'accroché qui ne se pose PAS sur son jeton.
            //
            //   Les trois accrochés historiques — le halo, la corne, le brasier
            //   — sont dessinés SUR leur jeton : ils naissent à sa position, et
            //   les recoller dessus à chaque reflow est exactement juste. Une
            //   ÉTIQUETTE, non : « MAX » se pose au-dessus du nombre qu'il
            //   désigne, et le recoller dessus l'y enfoncerait. Ceux-là
            //   déclarent donc leur écart à la création, et c'est cet écart
            //   qu'on reporte — pas l'écart COURANT, qui aurait dérivé au
            //   premier déplacement fait hors reflow.
            for (const sid of scene.satellitesDe(m.id)) {
              if (!scene.pos(sid)) continue;
              const d = (scene.get(sid).data || {}).decalage;
              const mv = scene.place(sid, d
                ? { x: m.to.x + (d.dx || 0), y: m.to.y + (d.dy || 0) }
                : { x: m.to.x, y: m.to.y });
              if (!mv) continue;
              ctx.anim({
                id: sid, prop: 'translate', from: mv.from, to: mv.to,
                at: spec.at ?? 0, dur: spec.dur, ease: spec.ease || EASE.move,
              });
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
      anims.push({
        id: PAN_ID,
        prop: 'translate',
        keyframes: reduced
          ? [{ offset: 1, value: panRepos }]
          : jalonsDuPan(panPrecedent, panFocus, panRepos, dPan),
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

/** Les canaux dont la valeur est une COULEUR : aucun défaut n'y a de sens. */
const COULEURS = new Set(['fill', 'stroke']);

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
