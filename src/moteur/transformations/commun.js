/**
 * Fabrique et outils communs aux cinq familles d'opérateurs.
 *
 * ## Le descripteur (CONTRACTS §2.2)
 *
 * ```js
 * { id, code, deprecated, from, to, apply, couverture, famille, notoriete,
 *   adHoc, commute, cout, isJoker, libelle, regle, note, steps }
 * ```
 *
 * ## Lecture retenue de `apply(valeur, traces)`
 *
 * Le contrat fixe la signature ; il reste à fixer la forme des `traces`. Ici :
 *
 * - `traces` est **un jeu d'intervalles par élément** de `valeur` — un par
 *   caractère (`STR`), par token (`TOKENS`), par nombre (`NUMS`), et un seul
 *   pour un `NUM`. C'est ce qui permet à `apply` de faire suivre la traçabilité
 *   sans que le moteur ait à deviner quel caractère est devenu quel nombre ;
 * - `apply` retourne `{ valeur, traces }` de la même forme, ou **`null`** si
 *   l'opérateur ne s'applique pas. Jamais d'exception, jamais de mutation.
 *
 * `appliquer(op, etat)` (voir `catalogue.js`) emballe le tout dans un `Etat`.
 *
 * ## Émission de la démonstration — `steps(avant, apres, ctx)`
 *
 * `ctx` vaut `{ ids, cle }` :
 *
 * - `ids` — l'identifiant du token qui représente **chaque élément** de `avant`
 *   dans la scène (même longueur que la valeur de `avant`) ;
 * - `cle` — un préfixe **unique dans le scénario**, alloué par l'appelant
 *   (typiquement `'e' + numéro d'étape`), à partir duquel l'opérateur nomme les
 *   tokens qu'il crée : `cle + '_' + rang`. C'est bien l'émetteur qui nomme
 *   (CONTRACTS §3), et les noms sont prévisibles : `op.sortie(avant, apres, ctx)`
 *   rend la liste des ids représentant `apres`, que l'appelant réinjecte dans le
 *   `ctx` de l'étape suivante.
 */

import { estEtat, origineDe, normaliserTraces, unionTraces } from '../etat.js';
import { estBilingue, LANGUES } from '../i18n.js';

export const FAMILLES = Object.freeze([
  'filtre', 'decoupe', 'mesure', 'mappeur', 'combinateur', 'finisseur', 'joker',
]);

/** Préfixe de code par famille (CONTRACTS §4.1). */
export const PREFIXE = Object.freeze({
  filtre: 'f', decoupe: 't', mesure: 'n', mappeur: 'm',
  combinateur: 'c', finisseur: 'p', joker: 'j',
});

/** Ordre des familles dans le catalogue = ordre des préfixes. */
export const ORDRE_PREFIXES = Object.freeze(['f', 't', 'n', 'm', 'c', 'p', 'j']);

// ───────────────────────────────────────────────────────────────────────────
// Traces
// ───────────────────────────────────────────────────────────────────────────

/** Traces par élément d'un état (une liste d'intervalles par élément). */
export function tracesDe(etat) {
  if (!estEtat(etat)) return null;
  if (etat.type === 'NUM') return [normaliserTraces(etat.traces)];
  const n = etat.type === 'STR' ? [...etat.valeur].length : etat.valeur.length;
  return Array.from({ length: n }, (_, i) => origineDe(etat, i));
}

/** Union de plusieurs jeux d'intervalles, normalisée (voir `unionTraces`). */
export const fusion = unionTraces;

/** Signature d'un jeu d'intervalles — sert à apparier avant/après. */
export const cleTrace = (t) => normaliserTraces(t).map(([d, f]) => `${d}-${f}`).join('.');

/** Éléments comparables d'un état — un par token de scène. */
export function elementsDe(etat) {
  if (!estEtat(etat)) return [];
  switch (etat.type) {
    case 'STR': return [...etat.valeur];
    case 'NUM': return [String(etat.valeur)];
    default: return etat.valeur.map(String);
  }
}

/**
 * Apparie les éléments de `apres` à ceux de `avant` par identité de trace.
 * Utilisé par les filtres qui ne font que retirer des caractères : les tokens
 * conservés gardent leur identifiant de scène.
 *
 * ★ Repli par sous-suite de valeurs. Les traces ne sont exploitables que si
 * l'état porte des `origines` **par élément** (`etat.js`). Or le moteur de
 * recherche fait circuler ses propres états — `{type, valeur, traces}`, sans
 * `origines` (CONTRACTS §2.1 n'impose que `traces`) : `origineDe` y rend alors
 * la même valeur pour tous les éléments, et l'appariement par trace dégénère.
 * Comme ces opérateurs ne font que RETIRER des éléments, l'appariement par
 * sous-suite de valeurs est exact — et il ne dépend d'aucune trace.
 *
 * @returns {number[]} pour chaque élément de `apres`, l'index dans `avant` (ou −1)
 */
export function apparier(avant, apres) {
  const parTrace = apparierParTrace(avant, apres);
  if (parTrace.every((i) => i >= 0)) return parTrace;
  const parValeur = apparierParSousSuite(avant, apres);
  return parValeur && parValeur.every((i) => i >= 0) ? parValeur : parTrace;
}

function apparierParTrace(avant, apres) {
  const ta = tracesDe(avant) || [];
  const tb = tracesDe(apres) || [];
  const index = new Map();
  ta.forEach((t, i) => {
    const k = cleTrace(t);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(i);
  });
  const pris = new Set();
  return tb.map((t) => {
    const cands = index.get(cleTrace(t)) || [];
    for (const i of cands) if (!pris.has(i)) { pris.add(i); return i; }
    return -1;
  });
}

/** `apres` s'obtient-il en retirant des éléments de `avant` ? (gloutonne, exacte) */
function apparierParSousSuite(avant, apres) {
  const a = elementsDe(avant);
  const b = elementsDe(apres);
  if (!b.length || b.length > a.length) return null;
  const out = [];
  let i = 0;
  for (const cible of b) {
    while (i < a.length && a[i] !== cible) i++;
    if (i >= a.length) return null;
    out.push(i);
    i++;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Identifiants de tokens
// ───────────────────────────────────────────────────────────────────────────

/** Nom d'un token créé par l'opérateur courant. */
export const nomToken = (ctx, i) => `${ctx.cle}_${i}`;

/** `n` identifiants frais, dans l'ordre. */
export const nomsTokens = (ctx, n) => Array.from({ length: n }, (_, i) => nomToken(ctx, i));

/** Sortie par défaut : l'opérateur a créé un token par élément de `apres`. */
export function sortieCreee(avant, apres, ctx) {
  const n = apres.type === 'NUM' ? 1 : (apres.type === 'STR' ? [...apres.valeur].length : apres.valeur.length);
  return nomsTokens(ctx, n);
}

/** Sortie d'un filtre qui ne fait que retirer : les ids conservés. */
export function sortieConservee(avant, apres, ctx) {
  return apparier(avant, apres).map((i, j) => (i >= 0 ? ctx.ids[i] : nomToken(ctx, j)));
}

// ───────────────────────────────────────────────────────────────────────────
// Étapes
// ───────────────────────────────────────────────────────────────────────────

/**
 * Construit un `Step` conforme à CONTRACTS §3 (JSON pur, aucune fonction).
 *
 * `title` et `caption` sont des chaînes DÉJÀ dans la langue du scénario : un
 * step est du texte affiché, et le moteur visuel exige un `title` non vide de
 * type chaîne (`src/visuel/scenario.js`). C'est donc à `steps()` de choisir la
 * langue, via `dire(…, ctx.langue)`.
 */
export function etape(ctx, title, caption, ops, extra = {}) {
  const step = { id: `s_${ctx.cle}`, title, ops: ops.filter(Boolean), ...extra };
  if (caption) step.caption = caption;
  return step;
}

/** Token de scène décrit pour une op qui en crée un. */
export const token = (id, text, kind = 'number') => ({ id, text: String(text), kind });

/** Durées par défaut des primitives — miroir de `src/visuel/constants.js`. */
const DUREE_OP = Object.freeze({
  highlight: 500, dim: 500, drop: 700, substitute: 900, move: 700, group: 800,
  insertOperators: 600, sum: 1200, reduce: 1400, flip180: 900, sevenSeg: 1200,
  countStrokes: 1400, keyboard: 1800, annotate: 700, pulse: 500, reveal: 1200,
  wait: 800,
});

/** Nombre de cibles échelonnées par `stagger`, pour mesurer l'étendue réelle. */
function nbCibles(o) {
  if (Array.isArray(o.pairs)) return o.pairs.length;
  if (Array.isArray(o.targets)) return o.targets.length;
  if (Array.isArray(o.between)) return o.between.length;
  return 1;
}

/**
 * ★ Joue les ops **l'une après l'autre** — c'est la règle de composition d'un
 * step du catalogue.
 *
 * Deux ops qui appellent `ctx.reflow()` en même temps animent DEUX FOIS
 * `translate` sur les mêmes tokens ; deux ops qui touchent le même token
 * animent deux fois son opacité ou son échelle. Le compilateur visuel signale
 * les unes comme les autres (« animations concurrentes », research §2.4,
 * contrainte 4) et le scrubbing devient ambigu. Une seule discipline évite les
 * deux : le geste suivant commence quand le précédent a fini.
 *
 * `at` est CALCULÉ, jamais deviné : un `at` fourni par l'appelant est ignoré —
 * c'est précisément ce qui produisait les chevauchements.
 */
export function enchainer(ops, depart = 0) {
  let curseur = depart;
  return ops.filter(Boolean).map((brut) => {
    const o = { ...brut, at: curseur };
    const dur = o.dur ?? DUREE_OP[o.op] ?? 700;
    curseur += dur + (o.stagger || 0) * Math.max(0, nbCibles(o) - 1);
    return o;
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Fabrique
// ───────────────────────────────────────────────────────────────────────────

const CHAMPS = ['id', 'code', 'from', 'to', 'famille', 'libelle', 'regle', 'apply'];

/**
 * Complète, vérifie et gèle un descripteur d'opérateur.
 * Échec bruyant : un descripteur incomplet est une erreur de programmation, pas
 * un cas d'exécution (CONTRACTS §2.2, heuristique §7.2).
 */
export function def(spec) {
  for (const c of CHAMPS) {
    if (spec[c] === undefined || spec[c] === null) {
      throw new Error(`opérateur « ${spec.id || '?'} » : champ « ${c} » obligatoire.`);
    }
  }
  const op = {
    deprecated: false,
    notoriete: 0.5,
    adHoc: 0,
    commute: false,
    cout: 1,
    isJoker: false,
    note: null,
    actifParDefaut: true,
    couverture: null,
    steps: null,
    sortie: null,
    ...spec,
  };
  if (!FAMILLES.includes(op.famille)) {
    throw new Error(`opérateur « ${op.id} » : famille inconnue « ${op.famille} ».`);
  }
  // Toute chaîne AFFICHABLE porte ses deux langues (voir `../i18n.js`).
  for (const champ of ['libelle', 'regle']) {
    if (!estBilingue(op[champ])) {
      throw new Error(`opérateur « ${op.id} » : « ${champ} » doit être un couple `
        + `{ ${LANGUES.join(', ')} } de chaînes non vides — reçu ${JSON.stringify(op[champ])}.`);
    }
  }
  if (op.note !== null && !estBilingue(op.note)) {
    throw new Error(`opérateur « ${op.id} » : « note » doit être null ou un couple `
      + `{ ${LANGUES.join(', ')} } — reçu ${JSON.stringify(op.note)}.`);
  }
  if (op.code[0] !== PREFIXE[op.famille]) {
    throw new Error(`opérateur « ${op.id} » : le code « ${op.code} » ne porte pas le préfixe `
      + `« ${PREFIXE[op.famille]} » de la famille ${op.famille} (CONTRACTS §4.1).`);
  }
  if (!op.sortie) op.sortie = sortieCreee;
  if (!op.couverture && op.from === 'STR') {
    op.couverture = (valeur) => (typeof valeur === 'string' && valeur.length
      ? [[0, [...valeur].length]] : []);
  }
  return Object.freeze(op);
}
