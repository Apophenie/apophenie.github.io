/**
 * Canal « tick » — recherche §1.4.
 *
 * WAAPI n'anime que des propriétés CSS. Trois choses lui échappent et sont
 * indispensables ici :
 *   1. le contenu textuel d'un `<text>` (H → 8, compteur 0 → 44) ;
 *   2. l'attribut `d` d'un `<path>` (non Baseline en CSS) ;
 *   3. les valeurs numériques discrètes (sommes partielles).
 *
 * Une seule boucle rAF lit `clock.currentTime` et applique des fonctions
 * `render(u)` **pures**. Comme elles sont pures, elles sont aussi appelées une
 * fois après chaque `seek()` : le scrubbing reste exact, même en pause.
 *
 * `resolveDiscrete` est la clé de l'idempotence : pour chaque canal, seul le
 * **dernier** enregistrement commencé avant `t` compte. Le rendu à l'instant `t`
 * ne dépend donc jamais du chemin parcouru pour y arriver.
 */

/**
 * @typedef {Object} DiscreteEntry
 * @property {string} key      identité du canal : `${id}::${channel}`
 * @property {string} id
 * @property {string} channel  'text' | 'd' | 'attr:<nom>'
 * @property {number} at       instant absolu de début (ms)
 * @property {number} dur      durée (ms)
 * @property {(u:number)=>any} render fonction PURE de u ∈ [0,1]
 */

/** Trie et indexe les enregistrements par canal. Appelé une fois à la compilation. */
export function indexDiscrete(entries) {
  const byKey = new Map();
  for (const e of entries) {
    if (!byKey.has(e.key)) byKey.set(e.key, []);
    byKey.get(e.key).push(e);
  }
  for (const list of byKey.values()) list.sort((a, b) => a.at - b.at);
  return byKey;
}

/**
 * Résout l'état discret à l'instant `t`.
 * @param {Map<string, DiscreteEntry[]>} byKey
 * @param {number} t
 * @returns {Map<string, {entry:DiscreteEntry, u:number, value:any}>}
 *          canaux à appliquer ; un canal absent ⇒ valeur de base.
 */
export function resolveDiscrete(byKey, t) {
  const out = new Map();
  for (const [key, list] of byKey) {
    let chosen = null;
    for (const e of list) {
      if (e.at <= t) chosen = e;
      else break;
    }
    if (!chosen) continue; // avant le premier enregistrement : valeur de base
    const u = chosen.dur > 0 ? clamp01((t - chosen.at) / chosen.dur) : 1;
    out.set(key, { entry: chosen, u, value: chosen.render(u) });
  }
  return out;
}

/**
 * Boucle rAF minimale. Isolée ici pour que `player.js` reste testable et pour
 * pouvoir l'arrêter quand l'onglet est masqué (les animations y sont gelées par
 * le navigateur — recherche §6.4).
 */
export function createTicker(callback, env = globalThis) {
  const raf = env.requestAnimationFrame ? env.requestAnimationFrame.bind(env) : null;
  const caf = env.cancelAnimationFrame ? env.cancelAnimationFrame.bind(env) : null;
  let handle = null;
  let running = false;

  function frame() {
    if (!running) return;
    callback();
    handle = raf ? raf(frame) : null;
    if (!raf) running = false;
  }

  return {
    get running() { return running; },
    start() {
      if (running || !raf) return;
      running = true;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle !== null && caf) caf(handle);
      handle = null;
    },
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
