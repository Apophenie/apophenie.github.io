/**
 * L'état circulant — CONTRACTS §2.1.
 *
 * ```js
 * { type: 'STR',    valeur: 'hope-hope-hope.fr' }
 * { type: 'TOKENS', valeur: ['h','o','p','e'] }
 * { type: 'NUMS',   valeur: [8,15,16,5] }
 * { type: 'NUM',    valeur: 44 }
 * ```
 *
 * Chaque état porte en plus, **obligatoirement**, `traces` : les intervalles
 * `[debut, fin)` de la **saisie d'origine** dont il provient. Le critère de
 * couverture du score (heuristique §4.4) et le surlignage de la scène en
 * dépendent.
 *
 * `origines` complète `traces` : **un jeu d'intervalles par élément** de la
 * valeur (un par caractère pour `STR`, un par token, un par nombre). C'est ce
 * qui permet au moteur visuel de relier un token à sa source dans la saisie.
 * `traces` en est toujours l'union normalisée ; pour un `NUM`, `origines` vaut
 * `null` et seul `traces` a un sens.
 *
 * Tout ici est **pur** : aucun état construit n'est jamais muté, aucune fonction
 * ne lève d'exception sur une entrée malformée — elles renvoient `null`.
 */

/** @typedef {'STR'|'TOKENS'|'NUMS'|'NUM'} TypeEtat */

/** Types d'état, dans l'ordre naturel du pipeline. */
export const TYPES = Object.freeze(['STR', 'TOKENS', 'NUMS', 'NUM']);

/** Bornes d'un `NUM` (CONTRACTS §2.3). Au-delà, un opérateur retourne `null`. */
export const NUM_MIN = -1e6;
export const NUM_MAX = 1e6;

/** Le nombre est-il un `NUM` acceptable ? (fini, entier, dans les bornes) */
export const numValide = (n) => typeof n === 'number' && Number.isFinite(n)
  && Number.isInteger(n) && n >= NUM_MIN && n <= NUM_MAX;

// ───────────────────────────────────────────────────────────────────────────
// Intervalles de trace
// ───────────────────────────────────────────────────────────────────────────

/** Normalise une liste d'intervalles : bornes valides, triées, fusionnées. */
export function normaliserTraces(traces) {
  if (!Array.isArray(traces)) return [];
  const nets = [];
  for (const it of traces) {
    if (!Array.isArray(it) || it.length !== 2) continue;
    const [d, f] = it;
    if (!Number.isInteger(d) || !Number.isInteger(f) || d < 0 || f <= d) continue;
    nets.push([d, f]);
  }
  nets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const [d, f] of nets) {
    const dernier = out[out.length - 1];
    if (dernier && d <= dernier[1]) dernier[1] = Math.max(dernier[1], f);
    else out.push([d, f]);
  }
  return out.map((it) => Object.freeze(it));
}

/**
 * Union normalisée de plusieurs jeux d'intervalles. Accepte indifféremment des
 * intervalles, des listes d'intervalles ou des listes de listes — c'est la
 * forme la plus commode aux appelants, et la plus difficile à mal utiliser.
 */
export function unionTraces(...jeux) {
  const plats = [];
  const pousser = (x) => {
    if (!Array.isArray(x)) return;
    if (x.length === 2 && typeof x[0] === 'number' && typeof x[1] === 'number') plats.push(x);
    else x.forEach(pousser);
  };
  jeux.forEach(pousser);
  return normaliserTraces(plats);
}

/** Nombre de positions couvertes par un jeu d'intervalles. */
export const etendue = (traces) => normaliserTraces(traces)
  .reduce((n, [d, f]) => n + (f - d), 0);

// ───────────────────────────────────────────────────────────────────────────
// Constructeurs
// ───────────────────────────────────────────────────────────────────────────

function geler(etat) {
  Object.freeze(etat.traces);
  if (Array.isArray(etat.valeur)) Object.freeze(etat.valeur);
  if (etat.origines) {
    for (const o of etat.origines) Object.freeze(o);
    Object.freeze(etat.origines);
  }
  return Object.freeze(etat);
}

/**
 * @param {string} valeur
 * @param {Array<Array<[number,number]>>} [origines] un jeu d'intervalles par caractère
 */
export function str(valeur, origines = null) {
  if (typeof valeur !== 'string') return null;
  const org = origines ? origines.map(normaliserTraces) : null;
  if (org && org.length !== [...valeur].length) return null;
  return geler({
    type: 'STR',
    valeur,
    traces: org ? normaliserTraces(org.flat()) : [],
    origines: org,
  });
}

/** @param {string[]} valeur */
export function tokens(valeur, origines = null) {
  if (!Array.isArray(valeur) || valeur.some((v) => typeof v !== 'string')) return null;
  const org = origines ? origines.map(normaliserTraces) : null;
  if (org && org.length !== valeur.length) return null;
  return geler({
    type: 'TOKENS',
    valeur: valeur.slice(),
    traces: org ? normaliserTraces(org.flat()) : [],
    origines: org,
  });
}

/** @param {number[]} valeur */
export function nums(valeur, origines = null) {
  if (!Array.isArray(valeur) || valeur.some((v) => !numValide(v))) return null;
  const org = origines ? origines.map(normaliserTraces) : null;
  if (org && org.length !== valeur.length) return null;
  return geler({
    type: 'NUMS',
    valeur: valeur.slice(),
    traces: org ? normaliserTraces(org.flat()) : [],
    origines: org,
  });
}

/** @param {number} valeur — hors `[-10⁶, 10⁶]` ⇒ `null` (CONTRACTS §2.3). */
export function num(valeur, traces = []) {
  if (!numValide(valeur)) return null;
  return geler({
    type: 'NUM',
    valeur,
    traces: normaliserTraces(traces),
    origines: null,
  });
}

/**
 * État de départ : la saisie de l'utilisateur, chaque caractère tracé sur
 * lui-même. La saisie est normalisée en **NFC** (déterminisme, §4.4).
 */
export function depuisSaisie(saisie) {
  if (typeof saisie !== 'string') return null;
  const s = saisie.normalize('NFC');
  const chars = [...s];
  return str(s, chars.map((_, i) => [[i, i + 1]]));
}

// ───────────────────────────────────────────────────────────────────────────
// Gardes de type
// ───────────────────────────────────────────────────────────────────────────

/** L'objet est-il un état bien formé ? */
export function estEtat(e) {
  if (!e || typeof e !== 'object' || !TYPES.includes(e.type)) return false;
  if (!Array.isArray(e.traces)) return false;
  switch (e.type) {
    case 'STR': return typeof e.valeur === 'string';
    case 'TOKENS': return Array.isArray(e.valeur) && e.valeur.every((v) => typeof v === 'string');
    case 'NUMS': return Array.isArray(e.valeur) && e.valeur.every(numValide);
    case 'NUM': return numValide(e.valeur);
    default: return false;
  }
}

/** Garde de type : l'état est-il du type attendu ? */
export const estType = (e, type) => estEtat(e) && e.type === type;

/** Nombre d'éléments d'un état (1 pour un `NUM`, longueur sinon). */
export function taille(e) {
  if (!estEtat(e)) return null;
  if (e.type === 'NUM') return 1;
  if (e.type === 'STR') return [...e.valeur].length;
  return e.valeur.length;
}

/** Origines d'un élément, ou les traces de l'état à défaut. */
export function origineDe(e, i) {
  if (!estEtat(e)) return [];
  if (e.origines && e.origines[i]) return e.origines[i];
  return e.traces;
}

/** Représentation textuelle stable — canonicalisation, déduplication, tests. */
export function signature(e) {
  if (!estEtat(e)) return null;
  switch (e.type) {
    case 'STR': return `STR:${e.valeur}`;
    case 'TOKENS': return `TOKENS:${e.valeur.join('')}`;
    case 'NUMS': return `NUMS:${e.valeur.join(',')}`;
    default: return `NUM:${e.valeur}`;
  }
}
