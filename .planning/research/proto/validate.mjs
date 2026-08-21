import * as T from './tables.mjs';

const ok = (b) => (b ? 'OK ' : 'ECHEC');
const HOPE = 'HOPE';
const lines = [];
const log = (...a) => { lines.push(a.join(' ')); console.log(...a); };

log('=== VALIDATION DES 7 METHODES DU README sur hope-hope-hope.fr ===\n');

// --- Méthode 1 : traduction FR, comptage de lettres
const espoir = 'ESPOIR';
log(`M1  hope -> espoir = ${espoir.length} lettres            ${ok(espoir.length === 6)}`);
log(`    "hope-hope-hope.fr" contient hope 3 fois -> 6-6-6`);

// --- Méthode 2 : lettres + voyelles
const nbLettres = [...HOPE].filter(T.isLetter).length;
const nbVoy = [...HOPE].filter(T.isVowel).length;
log(`M2  ${nbLettres} lettres + ${nbVoy} voyelles = ${nbLettres + nbVoy}          ${ok(nbLettres + nbVoy === 6)}`);

// --- Méthode 3 : lettres + consonnes
const nbCons = nbLettres - nbVoy;
log(`M3  ${nbLettres} lettres + ${nbCons} consonnes = ${nbLettres + nbCons}         ${ok(nbLettres + nbCons === 6)}`);

// --- Méthode 4 : A1Z26 + réduction, x3
const vals = [...HOPE].map(T.a1z26);
const somme = vals.reduce((a, b) => a + b, 0);
const red = T.digitalRoot(somme);
const tot3 = red * 3;
log(`M4  ${vals.join('+')} = ${somme} -> ${red} ; 3 mots : ${red}*3 = ${tot3} -> ${T.digitalRoot(tot3)}   ${ok(T.digitalRoot(tot3) === 6)}`);

// --- Méthode 5 : 7 segments, traits continus fusionnés
const traits = [...HOPE].map(T.seg7MergedStrokes);
const sTraits = traits.reduce((a, b) => a + b, 0);
log(`M5  H=${traits[0]} O=${traits[1]} P=${traits[2]} E=${traits[3]} -> ${sTraits} -> ${T.digitalRoot(sTraits)}      ${ok(traits.join(',') === '3,4,4,4' && T.digitalRoot(sTraits) === 6)}`);
log(`    (segments bruts allumes : ${[...HOPE].map(T.seg7Count).join(',')} = ${[...HOPE].reduce((a, c) => a + T.seg7Count(c), 0)})`);

// --- Méthode 6 : tirets AZERTY + retournement du 9
const dashKeyIs6 = T.AZERTY_ROWS[0][5] === '-' && T.AZERTY_DIGIT_ROW[5] === '6';
log(`M6a AZERTY touche AE06 = '${T.AZERTY_ROWS[0][5]}' / shift '${T.AZERTY_DIGIT_ROW[5]}'   ${ok(dashKeyIs6)}`);
const m6 = red + 6 + red + 6 + red;                 // 8+6+8+6+8
log(`M6b ${red}+6+${red}+6+${red} = ${m6} -> ${T.digitalRoot(m6)} -> retourne -> 6   ${ok(T.digitalRoot(m6) === 9)}`);

// --- Méthode 7 : soustraction en chaine
const sub = vals.slice(1).reduce((a, b) => a - b, vals[0]);
log(`M7  ${vals.join('-')} = ${sub}`);
log(`    reduction signee  : ${T.signedDigitReduce(sub)}                 ${ok(T.signedDigitReduce(sub) === 6)}`);
log(`    ecart des chiffres: ${T.digitSpread(sub)}                 ${ok(T.digitSpread(sub) === 6)}`);
log(`    digitalRoot(|-28|): ${T.digitalRoot(sub)}  <- NE donne PAS 6`);

// --- Contrôles supplémentaires
log('\n=== CONTROLES ===');
log(`espoir/hope : "hope" = 4 lettres, "espoir" = 6 -> gain +2`);
log(`AZERTY colonnes : Y=${T.azertyCol('y')} H=${T.azertyCol('h')} N=${T.azertyCol('n')} (colonne 6 = touche '-'/6)`);
log(`QWERTY colonnes : Y=${T.qwertyCol('y')} H=${T.qwertyCol('h')} N=${T.qwertyCol('n')}`);
log(`HOPE colonnes AZERTY : ${[...HOPE].map(c => T.azertyCol(c)).join('+')} = ${[...HOPE].reduce((a, c) => a + T.azertyCol(c), 0)}`);
log(`HOPE 7seg brut somme = ${[...HOPE].reduce((a, c) => a + T.seg7Count(c), 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + T.seg7Count(c), 0))}`);
log(`HOPE traits crayon MAJ = ${[...HOPE].map(c => T.STROKES_UPPER[c]).join('+')} = ${[...HOPE].reduce((a, c) => a + T.STROKES_UPPER[c], 0)}`);
log(`hope traits crayon min = ${[...'hope'].map(c => T.STROKES_LOWER[c]).join('+')} = ${[...'hope'].reduce((a, c) => a + T.STROKES_LOWER[c], 0)}`);
log(`HOPE extremites MAJ = ${[...HOPE].map(c => T.ENDS_UPPER[c]).join('+')} = ${[...HOPE].reduce((a, c) => a + T.ENDS_UPPER[c], 0)}`);
log(`hope extremites min = ${[...'hope'].map(c => T.ENDS_LOWER[c]).join('+')} = ${[...'hope'].reduce((a, c) => a + T.ENDS_LOWER[c], 0)}`);
log(`hope boucles min = ${[...'hope'].map(c => T.LOOPS_LOWER[c]).join('+')} = ${[...'hope'].reduce((a, c) => a + T.LOOPS_LOWER[c], 0)}`);
log(`HOPE scrabble EN = ${[...HOPE].reduce((a, c) => a + T.SCRABBLE_EN[c], 0)} ; FR = ${[...HOPE].reduce((a, c) => a + T.SCRABBLE_FR[c], 0)}`);
log(`HOPE T9 = ${[...HOPE].map(c => T.T9[c]).join('+')} = ${[...HOPE].reduce((a, c) => a + T.T9[c], 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + T.T9[c], 0))}`);
log(`HOPE morse signaux = ${[...HOPE].map(T.morseCount).join('+')} = ${[...HOPE].reduce((a, c) => a + T.morseCount(c), 0)}`);
log(`HOPE ascii MAJ = ${[...HOPE].reduce((a, c) => a + c.charCodeAt(0), 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + c.charCodeAt(0), 0))}`);
log(`hope ascii min = ${[...'hope'].reduce((a, c) => a + c.charCodeAt(0), 0)} -> ${T.digitalRoot([...'hope'].reduce((a, c) => a + c.charCodeAt(0), 0))}`);
log(`HOPE pythagoricien = ${[...HOPE].map(T.pythagorean).join('+')} = ${[...HOPE].reduce((a, c) => a + T.pythagorean(c), 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + T.pythagorean(c), 0))}`);
log(`HOPE chaldeen = ${[...HOPE].map(c => T.CHALDEAN[c]).join('+')} = ${[...HOPE].reduce((a, c) => a + T.CHALDEAN[c], 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + T.CHALDEAN[c], 0))}`);
log(`HOPE A=26..Z=1 = ${[...HOPE].map(T.z26a1).join('+')} = ${[...HOPE].reduce((a, c) => a + T.z26a1(c), 0)} -> ${T.digitalRoot([...HOPE].reduce((a, c) => a + T.z26a1(c), 0))}`);
