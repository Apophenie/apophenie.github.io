import * as T from './tables.mjs';
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const pad = (s, n) => String(s).padStart(n);

console.log('| Ltr | A1Z26 | Z26A1 | Pyth | Chald | x6  | ScrEN | ScrFR | T9 | Morse | sig | 7seg | 7segFus | trMAJ | trMin | extMAJ | extMin | bcMAJ | bcMin | azCol | azRow | qwCol | qwRow |');
console.log('|-----|-------|-------|------|-------|-----|-------|-------|----|-------|-----|------|---------|-------|-------|--------|--------|-------|-------|-------|-------|-------|-------|');
for (const c of L) {
  const l = c.toLowerCase();
  console.log('| ' + [
    ' ' + c + ' ', pad(T.a1z26(c), 5), pad(T.z26a1(c), 5), pad(T.pythagorean(c), 4), pad(T.CHALDEAN[c], 5),
    pad(T.englishX6(c), 3), pad(T.SCRABBLE_EN[c], 5), pad(T.SCRABBLE_FR[c], 5), pad(T.T9[c], 2),
    T.MORSE[c].padEnd(5), pad(T.morseCount(c), 3), pad(T.seg7Count(c), 4), pad(T.seg7MergedStrokes(c), 7),
    pad(T.STROKES_UPPER[c], 5), pad(T.STROKES_LOWER[l], 5), pad(T.ENDS_UPPER[c], 6), pad(T.ENDS_LOWER[l], 6),
    pad(T.LOOPS_UPPER[c], 5), pad(T.LOOPS_LOWER[l], 5),
    pad(T.azertyCol(c), 5), pad(T.keyRow(c, T.AZERTY_ROWS), 5), pad(T.qwertyCol(c), 5), pad(T.keyRow(c, T.QWERTY_ROWS), 5),
  ].join(' | ') + ' |');
}
console.log('\n7-segment brut (segments allumes) :');
console.log(L.map(c => `${c}:${T.SEG7[c]}(${T.seg7Count(c)})`).join('  '));
console.log('\nChiffres 0-9 : ' + '0123456789'.split('').map(d => `${d}:${T.SEG7[d]}(${T.SEG7[d].length}/${T.seg7MergedStrokes(d)})`).join('  '));
console.log('\nSommes de controle par colonne :');
const sum = f => L.reduce((a, c) => a + f(c), 0);
console.log(`A1Z26=${sum(T.a1z26)} Pyth=${sum(T.pythagorean)} Chald=${sum(c=>T.CHALDEAN[c])} ScrEN=${sum(c=>T.SCRABBLE_EN[c])} ScrFR=${sum(c=>T.SCRABBLE_FR[c])} 7seg=${sum(T.seg7Count)} 7segFus=${sum(T.seg7MergedStrokes)} trMAJ=${sum(c=>T.STROKES_UPPER[c])} trMin=${sum(c=>T.STROKES_LOWER[c.toLowerCase()])} extMAJ=${sum(c=>T.ENDS_UPPER[c])} extMin=${sum(c=>T.ENDS_LOWER[c.toLowerCase()])} bcMAJ=${sum(c=>T.LOOPS_UPPER[c])} bcMin=${sum(c=>T.LOOPS_LOWER[c.toLowerCase()])}`);
console.log('\nLettres valant 6 dans chaque systeme :');
const who = (f) => L.filter(c => f(c) === 6).join('') || '(aucune)';
console.log(`A1Z26: ${who(T.a1z26)} | Z26A1: ${who(T.z26a1)} | Pyth: ${who(T.pythagorean)} | Chald: ${who(c=>T.CHALDEAN[c])} | T9: ${who(c=>T.T9[c])} | 7seg: ${who(T.seg7Count)} | 7segFus: ${who(T.seg7MergedStrokes)} | trMAJ: ${who(c=>T.STROKES_UPPER[c])} | extMAJ: ${who(c=>T.ENDS_UPPER[c])} | azCol6: ${who(T.azertyCol)} | qwCol6: ${who(T.qwertyCol)} | morse: ${who(T.morseCount)} | ScrFR: ${who(c=>T.SCRABBLE_FR[c])}`);
