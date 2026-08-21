// Proto 5 : (a) bassin d'attraction de 6 par les operateurs NUM->NUM (precalcul statique)
//           (b) base58 : cout, expansion, taille d'URL

// ---------------- (a) bassin de 6 ----------------
const reduceDigits = n => { let x = Math.abs(n); while (x > 9) x = String(x).split('').reduce((a, d) => a + +d, 0); return n < 0 ? -x : x; };
const NUMOPS = {
  digitsum: n => Math.abs(n) > 9 ? String(Math.abs(n)).split('').reduce((a, d) => a + +d, 0) * Math.sign(n || 1) : null,
  reduce:   n => Math.abs(n) > 9 ? reduceDigits(n) : null,
  abs:      n => n < 0 ? -n : null,
  flip9:    n => n === 9 ? 6 : null,
  splitsub: n => { const a = String(Math.abs(n)); return a.length === 2 ? Math.abs(+a[1] - +a[0]) : null; },
  mod9:     n => Math.abs(n) > 9 ? ((Math.abs(n) - 1) % 9) + 1 : null,
};
const RANGE = 2000;
// distance(n) = nb minimal d'operateurs NUM->NUM pour amener n a 6
const dist = new Map([[6, 0]]);
let changed = true, round = 0;
while (changed && round < 10) {
  changed = false; round++;
  for (let n = -RANGE; n <= RANGE; n++) {
    if (dist.has(n) && dist.get(n) === 0) continue;
    let best = dist.has(n) ? dist.get(n) : Infinity;
    for (const f of Object.values(NUMOPS)) {
      const o = f(n);
      if (o === null || !dist.has(o)) continue;
      best = Math.min(best, dist.get(o) + 1);
    }
    if (best < (dist.get(n) ?? Infinity)) { dist.set(n, best); changed = true; }
  }
}
const byDist = {};
for (const [n, d] of dist) { (byDist[d] ??= []).push(n); }
console.log('--- (a) bassin de 6 sur [-2000,2000] ---');
for (const d of Object.keys(byDist).sort((a, b) => a - b)) {
  const arr = byDist[d].sort((a, b) => a - b);
  console.log(`  distance ${d}: ${arr.length} valeurs  ex: ${arr.slice(0, 12).join(',')}${arr.length > 12 ? ' ...' : ''}`);
}
const tot = 2 * RANGE + 1;
console.log(`  couverture: ${dist.size}/${tot} = ${(100 * dist.size / tot).toFixed(1)}% des entiers de [-2000,2000] menent a 6`);
console.log(`  => test de but "n est dans le bassin a distance <= 3" remplace 3 niveaux de recherche.`);

// ---------------- (b) base58 ----------------
const AL = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58enc(bytes) {
  const digits = [0];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { const x = (digits[i] << 8) + carry; digits[i] = x % 58; carry = (x / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let s = '';
  for (const b of bytes) { if (b === 0) s += AL[0]; else break; }
  for (let i = digits.length - 1; i >= 0; i--) s += AL[digits[i]];
  return s;
}
function b58dec(str) {
  const bytes = [0];
  for (const c of str) {
    let carry = AL.indexOf(c); if (carry < 0) throw new Error('char b58 invalide: ' + c);
    for (let i = 0; i < bytes.length; i++) { const x = bytes[i] * 58 + carry; bytes[i] = x & 0xff; carry = x >> 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  let z = 0; for (const c of str) { if (c === AL[0]) z++; else break; }
  const out = new Uint8Array(z + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[z + i] = bytes[bytes.length - 1 - i];
  return out;
}
const enc = new TextEncoder(), dec = new TextDecoder();
const s58 = s => b58enc(enc.encode(s)), d58 = s => dec.decode(b58dec(s));

console.log('\n--- (b) base58 : aller-retour et expansion ---');
for (const s of ['hope', 'https://hope-hope-hope.fr/', 'Éléonore à Nîmes — 100 % vrai !', 'a'.repeat(200)]) {
  const e = s58(s), ok = d58(e) === s;
  const bytes = enc.encode(s).length;
  console.log(`  ${JSON.stringify(s.slice(0, 40))}${s.length > 40 ? '…' : ''}  chars=${s.length} octets=${bytes} b58=${e.length} (x${(e.length / bytes).toFixed(3)}) rt=${ok}`);
  if (s.length < 30) console.log(`     -> ${e}`);
}
console.log('\n--- cout CPU base58 (O(n^2)) ---');
for (const n of [64, 256, 1024, 2048, 4096]) {
  const buf = new Uint8Array(n).map(() => (Math.random() * 256) | 0);
  const t0 = performance.now(); for (let i = 0; i < 20; i++) b58enc(buf); const ms = (performance.now() - t0) / 20;
  console.log(`  ${n} octets -> ${b58enc(buf).length} chars, ${ms.toFixed(2)} ms/encodage`);
}
console.log('\n--- (c) taille du jeton d\'approche (programme d\'ops en codes stables) ---');
// [version][mode][len][ops..] x3
const demo = new Uint8Array([1, 2, 4, 12, 33, 41, 60, 4, 12, 33, 41, 60, 4, 12, 33, 41, 60]);
console.log(`  3 fragments x 4 ops + entetes = ${demo.length} octets -> "${b58enc(demo)}" (${b58enc(demo).length} chars)`);
console.log(`  URL type: /#${b58enc(demo)}#${s58('https://hope-hope-hope.fr/')}  = ${(2 + b58enc(demo).length + 1 + s58('https://hope-hope-hope.fr/').length)} chars de fragment`);
