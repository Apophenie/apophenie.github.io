// Proto 4 : verification du "terminateur universel" francais.
// Regle : remplacer un nombre par le nombre de lettres de son nom en francais.
// Hypothese : depuis n'importe quel chiffre 0-9, l'iteration atteint 6 en <= 3 etapes.

const NAME = ['zero','un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
const letters = s => s.normalize('NFD').replace(/[^a-z]/gi, '').length;

console.log('--- table : chiffre -> nom -> nb de lettres ---');
NAME.forEach((n, i) => console.log(`  ${i} "${n}" -> ${letters(n)}`));

console.log('\n--- iteration jusqu\'a 6 ---');
let worst = 0, allOk = true;
for (let d = 0; d <= 9; d++) {
  const chain = [d]; let x = d, steps = 0;
  while (x !== 6 && steps < 12) { x = letters(NAME[x]); chain.push(x); steps++; }
  if (x !== 6) allOk = false;
  worst = Math.max(worst, steps);
  console.log(`  ${d}: ${chain.join(' -> ')}   (${steps} etape${steps > 1 ? 's' : ''})`);
}
console.log(`\n  => tous les chiffres atteignent 6 : ${allOk}, pire cas ${worst} etapes`);
console.log('  cycle attracteur :', (() => { let x = 4, c = [4]; for (let i = 0; i < 5; i++) { x = letters(NAME[x]); c.push(x); } return c.join(' -> '); })());

// contre-epreuve anglaise (pour montrer que c'est propre au francais)
const EN = ['zero','one','two','three','four','five','six','seven','eight','nine'];
console.log('\n--- contre-epreuve anglaise (converge vers 4, jamais 6) ---');
for (let d = 0; d <= 9; d++) {
  const chain = [d]; let x = d;
  for (let i = 0; i < 4; i++) { x = letters(EN[x]); chain.push(x); if (x === 4) break; }
  console.log(`  ${d}: ${chain.join(' -> ')}`);
}

// -------- couverture totale : toute entree non vide produit au moins un nombre --------
console.log('\n--- garantie de bout en bout ---');
const reduceDig = n => { let x = Math.abs(n); while (x > 9) x = String(x).split('').reduce((a, d) => a + +d, 0); return x; };
const cases = ['a', 'b', 'z', '1', '42', '666', 'q', '5g', 'w', 'ww', '2026', '01/01/2000', '!!!', '   ', '', 'x'];
for (const s of cases) {
  const n = [...s].length;                 // longueur : toujours definie
  if (n === 0) { console.log(`  ${JSON.stringify(s)} -> entree vide, cas a traiter en UI`); continue; }
  const d = reduceDig(n);
  const chain = [n]; if (d !== n) chain.push(d);
  let x = d; while (x !== 6) { x = letters(NAME[x]); chain.push(x); }
  console.log(`  ${JSON.stringify(s)} : longueur ${n} -> ${chain.join(' -> ')}  (${chain.length - 1} etapes)`);
}

// -------- 2e joker : sous-ensembles A1Z26 modulo 9 --------
console.log('\n--- 2e joker : couverture des sommes A1Z26 de sous-ensembles mod 9 ---');
const val = c => c.toLowerCase().charCodeAt(0) - 96;
function residues(word) {
  const ls = [...word.toLowerCase().replace(/[^a-z]/g, '')].map(val);
  let set = new Set([0]);
  for (const v of ls) { const n = new Set(set); for (const s of set) n.add((s + v) % 9); set = n; }
  return set;
}
for (const w of ['a', 'hope', 'macron', 'ok', 'xy', 'zz', 'abc']) {
  const r = residues(w);
  console.log(`  ${w}: residus atteignables = {${[...r].sort((a, b) => a - b)}}  contient 6 (=> reduction a 6 ou 15,24..) : ${r.has(6)}`);
}
