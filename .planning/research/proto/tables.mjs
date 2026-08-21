// Prototype jetable — tables de données du moteur arithmétique NumHeroLOLgeek
// Sert à valider les 7 méthodes du README et à mesurer la densité de "6".

// ---------------------------------------------------------------------------
// 1. 7 SEGMENTS
// Nommage standard : a=haut, b=haut-droit, c=bas-droit, d=bas, e=bas-gauche,
// f=haut-gauche, g=milieu.
// ---------------------------------------------------------------------------
export const SEG7 = {
  // chiffres
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  // lettres (casse d'affichage usuelle indiquée en commentaire)
  A: 'abcefg',   // A capitale
  B: 'cdefg',    // b bas de casse (B capitale = 8, indistinguable)
  C: 'adef',     // C capitale
  D: 'bcdeg',    // d bas de casse
  E: 'adefg',    // E capitale
  F: 'aefg',     // F capitale
  G: 'acdef',    // G capitale
  H: 'bcefg',    // H capitale
  I: 'bc',       // I capitale (= 1)
  J: 'bcd',      // J capitale
  K: 'bcefg',    // K -> approximé par H (non représentable)
  L: 'def',      // L capitale
  M: 'aceg',     // M -> non représentable, approximation projet
  N: 'ceg',      // n bas de casse
  O: 'abcdef',   // O capitale (= 0)
  P: 'abefg',    // P capitale
  Q: 'abcfg',    // q bas de casse
  R: 'eg',       // r bas de casse
  S: 'acdfg',    // S capitale (= 5)
  T: 'defg',     // t bas de casse
  U: 'bcdef',    // U capitale
  V: 'bcdef',    // V -> approximé par U (non représentable)
  W: 'bdef',     // W -> non représentable, approximation projet
  X: 'bcefg',    // X -> approximé par H (non représentable)
  Y: 'bcdfg',    // y bas de casse
  Z: 'abdeg',    // Z capitale (= 2)
};

export const seg7Count = (ch) => (SEG7[ch.toUpperCase()] || '').length;

// "Traits continus fusionnés" (Méthode 5 du README) :
// on fusionne les segments COLINÉAIRES ET ADJACENTS.
//   b + c  -> une seule verticale droite
//   e + f  -> une seule verticale gauche
//   a, d, g restent des traits isolés (aucun n'est colinéaire avec un autre)
export function seg7MergedStrokes(ch) {
  const s = SEG7[ch.toUpperCase()];
  if (!s) return 0;
  let n = 0;
  if (s.includes('a')) n++;
  if (s.includes('d')) n++;
  if (s.includes('g')) n++;
  if (s.includes('b') || s.includes('c')) n++;   // verticale droite fusionnée
  if (s.includes('e') || s.includes('f')) n++;   // verticale gauche fusionnée
  return n;
}

// ---------------------------------------------------------------------------
// 2. CLAVIERS  (source : /usr/share/X11/xkb/symbols/fr et .../latin)
// ---------------------------------------------------------------------------
// AZERTY (fr basic, PC 105 touches) — rangées de gauche à droite
export const AZERTY_ROWS = [
  '&é"\'(-è_çà)=',        // rangée AE, non shiftée : AE06 = '-'  (shift -> '6')
  'azertyuiop',           // AD
  'qsdfghjklm',           // AC
  'wxcvbn',               // AB (AB07..AB10 = , ; : !)
];
export const AZERTY_DIGIT_ROW = '1234567890';   // AE avec Shift
// -> la touche AE06 porte '-' (non shiftée) et '6' (shiftée) : le "tiret du 6".

export const QWERTY_ROWS = [
  '1234567890-=',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

// colonne (1-indexée) de chaque lettre = chiffre de la touche numérique au-dessus
export function keyColumn(ch, rows) {
  const c = ch.toLowerCase();
  for (let r = 1; r < rows.length; r++) {
    const i = rows[r].indexOf(c);
    if (i >= 0) return i + 1;
  }
  return null;
}
export const azertyCol = (ch) => keyColumn(ch, AZERTY_ROWS);
export const qwertyCol = (ch) => keyColumn(ch, QWERTY_ROWS);
export function keyRow(ch, rows) {
  const c = ch.toLowerCase();
  for (let r = 1; r < rows.length; r++) if (rows[r].includes(c)) return r; // 1=haut,2=milieu,3=bas
  return null;
}

// ---------------------------------------------------------------------------
// 3. TRACÉ DES LETTRES — police de référence : capitale bâton géométrique
//    (type Futura / Century Gothic : A pointu, a et g à un seul étage,
//     I sans empattement, Q à queue tangente, W = 4 traits)
// ---------------------------------------------------------------------------
// nombre de traits de crayon (levées de stylo)
export const STROKES_UPPER = {
  A:3, B:3, C:1, D:2, E:4, F:3, G:2, H:3, I:1, J:1, K:3, L:2, M:4,
  N:3, O:1, P:2, Q:2, R:3, S:1, T:2, U:1, V:2, W:4, X:2, Y:3, Z:3,
};
export const STROKES_LOWER = {
  a:2, b:2, c:1, d:2, e:2, f:2, g:2, h:2, i:2, j:2, k:3, l:1, m:3,
  n:2, o:1, p:2, q:2, r:2, s:1, t:2, u:2, v:2, w:4, x:2, y:2, z:3,
};

// nombre d'extrémités libres (degré-1 dans le graphe du glyphe)
export const ENDS_UPPER = {
  A:2, B:0, C:2, D:0, E:3, F:3, G:2, H:4, I:2, J:2, K:4, L:2, M:4,
  N:4, O:0, P:1, Q:1, R:2, S:2, T:3, U:2, V:2, W:2, X:4, Y:3, Z:2,
};
export const ENDS_LOWER = {
  a:2, b:1, c:2, d:1, e:1, f:4, g:1, h:2, i:3, j:2, k:4, l:2, m:4,
  n:2, o:0, p:1, q:1, r:2, s:2, t:3, u:2, v:2, w:2, x:4, y:2, z:2,
};

// nombre de boucles fermées (trous / genre topologique)
export const LOOPS_UPPER = {
  A:1, B:2, C:0, D:1, E:0, F:0, G:0, H:0, I:0, J:0, K:0, L:0, M:0,
  N:0, O:1, P:1, Q:1, R:1, S:0, T:0, U:0, V:0, W:0, X:0, Y:0, Z:0,
};
export const LOOPS_LOWER = {
  a:1, b:1, c:0, d:1, e:1, f:0, g:1, h:0, i:0, j:0, k:0, l:0, m:0,
  n:0, o:1, p:1, q:1, r:0, s:0, t:0, u:0, v:0, w:0, x:0, y:0, z:0,
};

// ---------------------------------------------------------------------------
// 4. VALEURS ALPHANUMÉRIQUES
// ---------------------------------------------------------------------------
export const a1z26 = (ch) => ch.toUpperCase().charCodeAt(0) - 64;      // A=1..Z=26
export const z26a1 = (ch) => 27 - a1z26(ch);                            // A=26..Z=1
// Pythagoricienne : 1..9 cyclique
export const pythagorean = (ch) => ((a1z26(ch) - 1) % 9) + 1;
// Chaldéenne (pas de 9)
export const CHALDEAN = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,J:1,K:2,L:3,M:4,
  N:5,O:7,P:8,Q:1,R:2,S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7,
};
// "English gematria" des calculateurs en ligne : A=6, B=12 ... Z=156
export const englishX6 = (ch) => a1z26(ch) * 6;
// Scrabble anglais
export const SCRABBLE_EN = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10,
};
// Scrabble français
export const SCRABBLE_FR = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,
  N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10,
};
// T9 / clavier téléphonique
export const T9 = {
  A:2,B:2,C:2,D:3,E:3,F:3,G:4,H:4,I:4,J:5,K:5,L:5,M:6,
  N:6,O:6,P:7,Q:7,R:7,S:7,T:8,U:8,V:8,W:9,X:9,Y:9,Z:9,
};
// Morse : nombre de signaux (points+traits)
export const MORSE = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',
  J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',
  S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
};
export const morseCount = (ch) => (MORSE[ch.toUpperCase()] || '').length;
export const morseDashes = (ch) => (MORSE[ch.toUpperCase()] || '').split('').filter(x => x === '-').length;

export const VOWELS = 'AEIOUY';
export const isVowel = (ch) => VOWELS.includes(ch.toUpperCase());
export const isLetter = (ch) => /[a-z]/i.test(ch);

// ---------------------------------------------------------------------------
// 5. RÉDUCTIONS
// ---------------------------------------------------------------------------
export function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((s, d) => s + +d, 0);
}
export function digitalRoot(n) {           // réduction théosophique complète
  n = Math.abs(n);
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}
export function reduceOnce(n) {            // une seule passe
  return Math.sign(n || 1) >= 0 ? digitSum(n) : digitSum(n);
}
// Réduction SIGNÉE (formulation rigoureuse proposée pour la Méthode 7) :
// le signe du nombre s'applique au premier chiffre seulement, puis on somme.
export function signedDigitReduce(n) {
  const ds = String(Math.abs(n)).split('').map(Number);
  if (n < 0) ds[0] = -ds[0];
  return ds.reduce((a, b) => a + b, 0);
}
// Variante "écart des chiffres" (seulement définie pour 2 chiffres)
export function digitSpread(n) {
  const ds = String(Math.abs(n)).split('').map(Number);
  return Math.abs(ds.reduce((a, b) => a - b));
}
