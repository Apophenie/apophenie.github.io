/**
 * Validation statique du `Scenario` — les invariants de CONTRACTS §3 / §7.1 qui
 * se vérifient **sans** dérouler la timeline.
 *
 * Les invariants 3 (ids existants au bon instant), 4 (id créé jamais recréé,
 * id supprimé jamais réutilisé) et 6 (durée compilée ≥ 16 ms) exigent de
 * dérouler les steps : ils sont vérifiés dans `compile.js` / `scene.js`.
 *
 *  1. version === 1
 *  2. tokens[].id uniques, non vides, stables
 *  3. toute Op ne référence que des ids existants à ce point       → compile.js
 *  4. un id créé n'est jamais recréé, un id supprimé jamais réutilisé → scene.js
 *  5. steps.length ≥ 1, id unique, title non vide
 *  6. après compilation, chaque step.duration ≥ 16 ms              → compile.js
 *  7. chaque `op` appartient au vocabulaire fermé
 *  8. le scénario est pur : JSON sérialisable, aucune fonction, aucun DOM
 */

import { OP_NAMES, KINDS, ENGINE_PREFIX } from './constants.js';
import { fail, at } from './errors.js';

const OP_SET = new Set(OP_NAMES);
const KIND_SET = new Set(KINDS);

/**
 * @param {object} scenario
 * @returns {{tokenIds:Set<string>, stepIds:Set<string>}}
 */
export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    fail('scénario invalide : un objet est attendu.');
  }

  // — invariant 8 : pureté ---------------------------------------------------
  assertPure(scenario);

  // — invariant 1 ------------------------------------------------------------
  if (scenario.version !== 1) {
    fail(`scénario invalide : version attendue 1, reçue ${JSON.stringify(scenario.version)}.`);
  }

  // — invariant 2 ------------------------------------------------------------
  if (!Array.isArray(scenario.tokens)) {
    fail('scénario invalide : « tokens » doit être un tableau (éventuellement vide).');
  }
  const tokenIds = new Set();
  scenario.tokens.forEach((tok, i) => {
    if (!tok || typeof tok !== 'object') fail(`tokens[${i}] : objet attendu.`);
    assertId(tok.id, `tokens[${i}].id`);
    if (tokenIds.has(tok.id)) fail(`tokens[${i}] : identifiant « ${tok.id} » dupliqué — les id doivent être uniques (CONTRACTS §3, invariant 2).`);
    tokenIds.add(tok.id);
    if (typeof tok.text !== 'string') fail(`tokens[${i}] « ${tok.id} » : « text » doit être une chaîne.`);
    if (tok.kind !== undefined && !KIND_SET.has(tok.kind)) {
      fail(`tokens[${i}] « ${tok.id} » : kind « ${tok.kind} » hors vocabulaire (${KINDS.join(', ')}).`);
    }
    if (tok.group !== undefined && typeof tok.group !== 'string') {
      fail(`tokens[${i}] « ${tok.id} » : « group » doit être une chaîne.`);
    }
  });

  // — invariant 5 ------------------------------------------------------------
  if (!Array.isArray(scenario.steps) || scenario.steps.length < 1) {
    fail('scénario invalide : « steps » doit contenir au moins un step (CONTRACTS §3, invariant 5).');
  }
  const stepIds = new Set();
  scenario.steps.forEach((step, si) => {
    const loc = { step: si, stepId: step && step.id };
    if (!step || typeof step !== 'object') fail(`${at({ step: si })}objet attendu.`);
    assertId(step.id, `steps[${si}].id`);
    if (stepIds.has(step.id)) fail(`${at(loc)}identifiant de step « ${step.id} » dupliqué.`);
    stepIds.add(step.id);
    if (typeof step.title !== 'string' || !step.title.trim()) {
      fail(`${at(loc)}« title » non vide obligatoire (il alimente le Registre accessible, CONTRACTS §6).`);
    }
    if (step.caption !== undefined && typeof step.caption !== 'string') {
      fail(`${at(loc)}« caption » doit être une chaîne.`);
    }
    // `figure` — l'illustration du Registre (l'afficheur sept segments). Elle
    // ne concerne PAS la scène : le moteur visuel n'en fait rien, il vérifie
    // seulement qu'elle porte son équivalent textuel, sans quoi un lecteur
    // d'écran n'entendrait rien là où l'œil voit un dessin (CONTRACTS §6).
    if (step.figure !== undefined && step.figure !== null) {
      const f = step.figure;
      if (typeof f !== 'object' || Array.isArray(f)) {
        fail(`${at(loc)}« figure » doit être un objet.`);
      }
      if (typeof f.type !== 'string' || !f.type) {
        fail(`${at(loc)}« figure.type » manquant.`);
      }
      if (typeof f.texte !== 'string' || !f.texte.trim()) {
        fail(`${at(loc)}« figure.texte » non vide obligatoire : une figure sans équivalent `
          + 'textuel serait muette pour un lecteur d’écran (CONTRACTS §6).');
      }
    }
    for (const k of ['duration', 'hold']) {
      if (step[k] !== undefined && (typeof step[k] !== 'number' || !Number.isFinite(step[k]) || step[k] < 0)) {
        fail(`${at(loc)}« ${k} » doit être un nombre de millisecondes ≥ 0.`);
      }
    }
    if (step.ops !== undefined && !Array.isArray(step.ops)) {
      fail(`${at(loc)}« ops » doit être un tableau.`);
    }

    // Deux ops de CAMÉRA dans un même step l'animeraient toutes deux (recul,
    // recentrage, retour) sur les mêmes instants : elles se contrediraient et le
    // scrubbing deviendrait ambigu. Une par step, pas deux — c'est vrai du
    // clavier comme de la réglette alphabétique.
    for (const nom of ['keyboard', 'alphabet']) {
      const n = (step.ops || []).filter((o) => o && o.op === nom).length;
      if (n > 1) {
        fail(`${at(loc)}${n} ops « ${nom} » dans le même step : chacune anime la caméra `
          + '(recul, recentrage, retour), elles se contrediraient. Une par step — '
          + 'émettez un step par jeton.');
      }
    }

    // — invariant 7 : vocabulaire fermé -------------------------------------
    (step.ops || []).forEach((op, oi) => {
      const oloc = { ...loc, op: oi, opName: op && op.op };
      if (!op || typeof op !== 'object') fail(`${at({ ...loc, op: oi })}objet attendu.`);
      if (typeof op.op !== 'string' || !op.op) {
        fail(`${at({ ...loc, op: oi })}champ « op » manquant.`);
      }
      if (!OP_SET.has(op.op)) {
        fail(`${at(oloc)}op « ${op.op} » hors du vocabulaire fermé. `
          + `Les ${OP_NAMES.length} primitives sont : ${OP_NAMES.join(', ')}. `
          + `Ajouter une transformation sans rendu impose d'ajouter d'abord la primitive (CONTRACTS §3.1).`,
        { op: op.op, step: si, index: oi });
      }
      for (const k of ['at', 'dur', 'stagger']) {
        if (op[k] !== undefined && (typeof op[k] !== 'number' || !Number.isFinite(op[k]) || op[k] < 0)) {
          fail(`${at(oloc)}« ${k} » doit être un nombre de millisecondes ≥ 0.`);
        }
      }
      if (op.ease !== undefined && typeof op.ease !== 'string') {
        fail(`${at(oloc)}« ease » doit être une chaîne CSS.`);
      }
    });
  });

  if (scenario.method !== undefined && (typeof scenario.method !== 'object' || scenario.method === null)) {
    fail('scénario invalide : « method » doit être un objet {id, label, rule}.');
  }

  return { tokenIds, stepIds };
}

/** Un id de scénario : chaîne non vide, sans préfixe réservé au moteur. */
export function assertId(id, where) {
  if (typeof id !== 'string' || !id.trim()) {
    fail(`${where} : identifiant manquant ou vide (CONTRACTS §3, invariant 2).`);
  }
  if (id.startsWith(ENGINE_PREFIX)) {
    fail(`${where} : « ${id} » — le préfixe « ${ENGINE_PREFIX} » est réservé aux nœuds fabriqués par le moteur visuel (halos, accolades, badges, segments).`);
  }
}

/**
 * Invariant 8 — le scénario doit être **pur** : JSON sérialisable, aucune
 * fonction, aucune référence DOM, aucune closure, aucun cycle.
 */
export function assertPure(value, path = 'scenario', seen = new Set()) {
  const t = typeof value;
  if (value === null || t === 'string' || t === 'number' || t === 'boolean' || t === 'undefined') {
    if (t === 'number' && !Number.isFinite(value)) {
      fail(`${path} : ${value} n'est pas sérialisable en JSON (invariant 8 : scénario pur).`);
    }
    return;
  }
  if (t === 'function') {
    fail(`${path} : une fonction a été trouvée. Le scénario doit être pur, JSON sérialisable (CONTRACTS §3, invariant 8).`);
  }
  if (t === 'symbol' || t === 'bigint') {
    fail(`${path} : valeur de type ${t} non sérialisable (invariant 8).`);
  }
  if (value && typeof value === 'object') {
    if (typeof value.nodeType === 'number' || (typeof Node !== 'undefined' && value instanceof Node)) {
      fail(`${path} : référence DOM interdite dans un scénario (invariant 8).`);
    }
    if (seen.has(value)) {
      fail(`${path} : référence circulaire — le scénario doit être JSON sérialisable (invariant 8).`);
    }
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((v, i) => assertPure(v, `${path}[${i}]`, seen));
    } else {
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        fail(`${path} : instance de « ${value.constructor && value.constructor.name} » — seuls les objets simples sont admis (invariant 8).`);
      }
      for (const [k, v] of Object.entries(value)) assertPure(v, `${path}.${k}`, seen);
    }
    seen.delete(value);
  }
}
