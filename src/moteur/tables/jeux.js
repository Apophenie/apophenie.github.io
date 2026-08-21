/**
 * Tables « de jeu » — Scrabble, T9, morse.
 * Source : `research/moteur-arithmetique.md §3.5`. Toutes gelées.
 */

/** Points du Scrabble français (jeu officiel FR). Σ = 103. */
export const SCRABBLE_FR = Object.freeze({
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 10, L: 1, M: 2,
  N: 1, O: 1, P: 3, Q: 8, R: 1, S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10,
});

/** Points du Scrabble anglais. Σ = 87. */
export const SCRABBLE_EN = Object.freeze({
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
});

/** Clavier téléphonique — norme ITU-T E.161. ABC=2 … WXYZ=9. */
export const T9 = Object.freeze({
  A: 2, B: 2, C: 2, D: 3, E: 3, F: 3, G: 4, H: 4, I: 4, J: 5, K: 5, L: 5, M: 6,
  N: 6, O: 6, P: 7, Q: 7, R: 7, S: 7, T: 8, U: 8, V: 8, W: 9, X: 9, Y: 9, Z: 9,
});

/** Groupes de touches T9, pour l'affichage de la règle. */
export const T9_GROUPES = Object.freeze({
  2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ',
});

/** Morse international. */
export const MORSE = Object.freeze({
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
});

/** Nombre de signaux morse (points + traits) d'une lettre, `null` hors domaine. */
export function morseSignaux(c) {
  const m = MORSE[String(c).toUpperCase()];
  return m === undefined ? null : m.length;
}

/** Nombre de **traits** morse d'une lettre (les points ne comptent pas). */
export function morseTraits(c) {
  const m = MORSE[String(c).toUpperCase()];
  if (m === undefined) return null;
  let n = 0;
  for (const s of m) if (s === '-') n++;
  return n;
}
