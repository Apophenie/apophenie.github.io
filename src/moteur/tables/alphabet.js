/**
 * Tables alphabétiques — `src/moteur/tables/alphabet.js`
 *
 * Sources : `research/moteur-arithmetique.md §3.1` et `§3.5`.
 * Toutes les tables sont indexées par **capitale** (les mappeurs normalisent la
 * casse en entrée) et gelées (CONTRACTS §2.2 : aucune mutation entre deux
 * explorations du moteur de recherche).
 *
 * Les tables *calculables* (A1Z26, Z26A1, PYTHAGORE, ENGLISH_X6) sont générées
 * à l'import — moins de risque de faute de frappe ; les sommes de contrôle du
 * §3.1 les vérifient (`tables.test.js`).
 */

export const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const parLettre = (fn) => Object.freeze(Object.fromEntries(
  [...LETTRES].map((c, i) => [c, fn(c, i + 1)]),
));

/** Rang alphabétique — A=1 … Z=26. Σ = 351. */
export const A1Z26 = parLettre((_, r) => r);

/** Rang inversé — A=26 … Z=1. Σ = 351. */
export const Z26A1 = parLettre((_, r) => 27 - r);

/** Numérologie pythagoricienne — 1..9 cyclique. Σ = 126. */
export const PYTHAGORE = parLettre((_, r) => ((r - 1) % 9) + 1);

/** « English gematria » des calculateurs en ligne — rang × 6. Σ = 2106. */
export const ENGLISH_X6 = parLettre((_, r) => r * 6);

/** Numérologie chaldéenne — table dédiée, **sans 9**. Σ = 103. */
export const CHALDEEN = Object.freeze({
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4,
  N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7,
});

/** Voyelles, sans Y (CONTRACTS §0.4 : deux transformations distinctes). */
export const VOYELLES = 'AEIOU';
/** Voyelles, Y compris. */
export const VOYELLES_Y = 'AEIOUY';

/** Une lettre latine de base ? (après repli des diacritiques) */
export const estLettre = (c) => typeof c === 'string' && c.length === 1
  && LETTRES.includes(c.toUpperCase());

/** Accès tolérant à une table par lettre : `null` hors domaine, jamais d'exception. */
export function valeur(table, c) {
  if (typeof c !== 'string' || c.length !== 1) return null;
  const v = table[c.toUpperCase()];
  return v === undefined ? null : v;
}

/** Retire les diacritiques (NFD puis suppression des marques combinantes). */
export function sansAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}

/** Atbash — miroir de l'alphabet (A↔Z), tradition kabbalistique. */
export function atbash(s) {
  let out = '';
  for (const c of s) {
    const maj = c.toUpperCase();
    const i = LETTRES.indexOf(maj);
    if (i < 0) { out += c; continue; }
    const m = LETTRES[25 - i];
    out += c === maj ? m : m.toLowerCase();
  }
  return out;
}

/** Décalage de César de `n` lettres (n entier, modulo 26). */
export function cesar(s, n) {
  const k = ((n % 26) + 26) % 26;
  let out = '';
  for (const c of s) {
    const maj = c.toUpperCase();
    const i = LETTRES.indexOf(maj);
    if (i < 0) { out += c; continue; }
    const m = LETTRES[(i + k) % 26];
    out += c === maj ? m : m.toLowerCase();
  }
  return out;
}

/**
 * Nom français des lettres — pour `m.longueurNom` (longueur du nom de la lettre).
 * Orthographe usuelle de l'épellation française.
 */
export const NOM_LETTRE_FR = Object.freeze({
  A: 'a', B: 'bé', C: 'cé', D: 'dé', E: 'e', F: 'effe', G: 'gé', H: 'hache',
  I: 'i', J: 'ji', K: 'ka', L: 'elle', M: 'emme', N: 'enne', O: 'o', P: 'pé',
  Q: 'ku', R: 'erre', S: 'esse', T: 'té', U: 'u', V: 'vé', W: 'double vé',
  X: 'ixe', Y: 'i grec', Z: 'zède',
});

/** Nom français des chiffres — support du joker `nomFrancais` (heuristique §5.2). */
export const NOM_CHIFFRE_FR = Object.freeze({
  0: 'zéro', 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre',
  5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf',
});

/** Nombre de lettres du nom français d'un chiffre (accents et espaces exclus). */
export function lettresDuNomChiffre(d) {
  const nom = NOM_CHIFFRE_FR[d];
  if (nom === undefined) return null;
  return [...sansAccents(nom)].filter(estLettre).length;
}
