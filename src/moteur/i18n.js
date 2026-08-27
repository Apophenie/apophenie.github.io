/**
 * Bilinguisme du catalogue — français et anglais.
 *
 * Toute chaîne **affichable** d'un opérateur (`libelle`, `regle`, `note`) est un
 * couple `{ fr, en }`. Ce n'est pas un mécanisme de traduction : c'est un champ
 * de données à deux valeurs, écrit à la main, gelé, et vérifié au chargement
 * (`commun.js → def()`) comme le reste des métadonnées (CONTRACTS §2.2 :
 * « échec bruyant, pas de dégradation silencieuse »).
 *
 * Deux règles de fond, qui ne sont pas des détails de traduction :
 *
 * 1. **Le « tiret du 6 » est une spécificité française.** Sur un QWERTY
 *    américain, la touche 6 porte `^`, pas un tiret. La version anglaise le
 *    DIT — masquer la nuance rendrait la méthode incompréhensible hors de
 *    France (voir `tables/claviers.js`).
 * 2. **Le joker `jnf` ne fonctionne qu'en français.** `quatre` → 6 enclenche le
 *    cycle 4, 6, 3, 5 ; `four` a exactement quatre lettres, donc l'anglais est
 *    un point fixe et n'atteint jamais 6. La version anglaise l'assume comme
 *    une curiosité française, elle n'invente pas d'équivalent — il n'y en a
 *    pas (voir `transformations/posts.js`).
 *
 * Aucune source d'entropie ici : pas d'`Intl`, pas de `localeCompare`
 * (CONTRACTS §4.4 règle 4). La langue est un simple paramètre.
 */

/** Langues publiées, dans l'ordre. */
export const LANGUES = Object.freeze(['fr', 'en']);

/** Langue de repli — le projet est écrit en français d'abord. */
export const LANGUE_DEFAUT = 'fr';

/** Le couple est-il complet ? (les deux langues, non vides, sans autre clé) */
export function estBilingue(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const cles = Object.keys(x);
  if (cles.length !== LANGUES.length) return false;
  return LANGUES.every((l) => cles.includes(l) && typeof x[l] === 'string' && x[l].trim().length > 0);
}

/** Construit un couple bilingue gelé. */
export function bilingue(fr, en) {
  return Object.freeze({ fr, en });
}

/**
 * Rend la chaîne d'une langue. Tolérant en LECTURE seulement : une chaîne nue
 * est rendue telle quelle (les captions calculées à la volée en sont), une
 * langue inconnue retombe sur le français, `null` reste `null`.
 */
export function dire(texte, langue = LANGUE_DEFAUT) {
  if (texte === null || texte === undefined) return null;
  if (typeof texte === 'string') return texte;
  if (typeof texte !== 'object') return null;
  return texte[langue] ?? texte[LANGUE_DEFAUT] ?? texte.en ?? null;
}

/** Normalise une langue reçue de l'extérieur (URL, réglages, `navigator`). */
export function langueValide(langue) {
  return LANGUES.includes(langue) ? langue : LANGUE_DEFAUT;
}
