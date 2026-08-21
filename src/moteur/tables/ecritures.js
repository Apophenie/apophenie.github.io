/**
 * Gématrie hébraïque et isopséphie grecque.
 * Source : `research/moteur-arithmetique.md §3.6`.
 *
 * ⚠️ **Lacune assumée, héritée de la recherche et rappelée par CONTRACTS §7.2 :**
 * ces deux tables n'ont **pas** été recoupées sur sources externes. Elles sont
 * conformes aux tables usuelles mais doivent être vérifiées avant publication —
 * ce sont les méthodes les plus « sourçables » du catalogue, donc les plus
 * exposées à la critique. `NOTE_SOURCAGE` est destinée à l'UI.
 */

import { bilingue } from '../i18n.js';

export const NOTE_SOURCAGE = bilingue(
  'Tables traditionnelles non recoupées sur source externe (à vérifier avant publication).',
  'Traditional tables, not yet cross-checked against an external source (to be verified before publication).',
);

/** Gématrie hébraïque — *mispar hechrachi* (valeurs standard). */
export const HEBREU = Object.freeze({
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
  // finales — mispar gadol
  ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900,
});

/** Isopséphie grecque, digamma (ϛ = 6), koppa (ϙ = 90) et sampi (ϡ = 900) compris. */
export const GREC = Object.freeze({
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϙ: 90,
  ρ: 100, σ: 200, ς: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700, ω: 800, ϡ: 900,
});

/**
 * Translittération latin → hébreu (consonantique, usage courant des
 * calculateurs de gématrie). Le point d'or du projet : `W` → `ו` (vav) = **6**,
 * donc `www` = 6-6-6, arithmétiquement exact dans le système hébreu.
 */
export const TRANSLIT_HEBREU = Object.freeze({
  A: 'א', B: 'ב', C: 'כ', D: 'ד', E: 'ה', F: 'פ', G: 'ג', H: 'ח', I: 'י',
  J: 'י', K: 'ק', L: 'ל', M: 'מ', N: 'נ', O: 'ע', P: 'פ', Q: 'ק', R: 'ר',
  S: 'ס', T: 'ת', U: 'ו', V: 'ו', W: 'ו', X: 'ס', Y: 'י', Z: 'ז',
});

/** Translittération latin → grec (usage courant de l'isopséphie). */
export const TRANSLIT_GREC = Object.freeze({
  A: 'α', B: 'β', C: 'κ', D: 'δ', E: 'ε', F: 'φ', G: 'γ', H: 'η', I: 'ι',
  J: 'ι', K: 'κ', L: 'λ', M: 'μ', N: 'ν', O: 'ο', P: 'π', Q: 'ϙ', R: 'ρ',
  S: 'σ', T: 'τ', U: 'υ', V: 'υ', W: 'ω', X: 'ξ', Y: 'υ', Z: 'ζ',
});

/** `vav` (ו) = 6 : la lettre qui fait de `www` un 666 « sourçable ». */
export const VAV = Object.freeze({ lettre: 'ו', nom: 'vav', valeur: 6 });
/** `digamma`/`stigma` (ϛ) = 6 : le « chiffre caché » grec. */
export const DIGAMMA = Object.freeze({ lettre: 'ϛ', nom: 'digamma (stigma)', valeur: 6 });

/**
 * Valeur d'une lettre latine dans une écriture donnée, via translittération.
 * @returns {number|null}
 */
export function valeurTranslitteree(c, translit, table) {
  const l = translit[String(c).toUpperCase()];
  if (l === undefined) return null;
  const v = table[l];
  return v === undefined ? null : v;
}

export const valeurHebreu = (c) => valeurTranslitteree(c, TRANSLIT_HEBREU, HEBREU);
export const valeurGrec = (c) => valeurTranslitteree(c, TRANSLIT_GREC, GREC);
