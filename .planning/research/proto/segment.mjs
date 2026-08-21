// Proto 2 : (a) cout sans canonicalisation, (b) enumeration des decoupes en 3 fragments,
// (c) detection de repetitions, (d) stress test entree longue.

// ---------- (a) explosion sans dedup : simulation analytique + mesure ----------
console.log('--- (a) taille de l\'espace sans canonicalisation (b mesure ~ 7.5) ---');
for (let d = 1; d <= 8; d++) {
  console.log(`  profondeur ${d}: chemins bruts ~ ${Math.round(Math.pow(7.5, d)).toLocaleString('fr')}`);
}

// ---------- (b) decoupes ordonnees en k parts ----------
// nombre de facons de couper une sequence de n tokens en k parts contigues non vides = C(n-1, k-1)
const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r); };
console.log('\n--- (b) decoupes contigues en 3 parts : C(n-1,2) ---');
for (const n of [3, 5, 8, 12, 20, 40, 80]) console.log(`  n=${n} tokens -> ${C(n - 1, 2).toLocaleString('fr')} decoupes`);
console.log('\n--- (b bis) sous-ensembles ordonnes de 3 fragments quelconques parmi n : C(n,3) ---');
for (const n of [3, 5, 8, 12, 20, 40, 80]) console.log(`  n=${n} -> ${C(n, 3).toLocaleString('fr')}`);

// ---------- (c) detection de motifs repetes ----------
function tokenize(s) {
  const out = [];
  const re = /([a-z0-9]+)|([^a-z0-9]+)/gi;
  let m; while ((m = re.exec(s))) out.push({ t: m[0], kind: m[1] ? 'W' : 'S', i: m.index });
  return out;
}
function repeatedGroups(tokens) {
  const words = tokens.filter(t => t.kind === 'W').map(t => t.t.toLowerCase());
  const cnt = new Map();
  for (const w of words) cnt.set(w, (cnt.get(w) || 0) + 1);
  return [...cnt.entries()].filter(([, c]) => c >= 3).map(([w, c]) => ({ w, c }));
}
// motif periodique : plus petite periode p telle que la sequence de mots soit w^k
function periodicity(words) {
  const n = words.length;
  for (let p = 1; p <= n / 2; p++) {
    if (n % p) continue;
    let ok = true;
    for (let i = p; i < n && ok; i++) if (words[i] !== words[i % p]) ok = false;
    if (ok) return { period: p, times: n / p, unit: words.slice(0, p) };
  }
  return null;
}
console.log('\n--- (c) motifs repetes ---');
for (const s of ['https://hope-hope-hope.fr/', 'ha-ha-ha', 'abc-abc-abc-abc', 'le chat dort', 'www.a-b-a-b.com']) {
  const tk = tokenize(s);
  const words = tk.filter(t => t.kind === 'W').map(t => t.t.toLowerCase());
  console.log(`  ${JSON.stringify(s)}  mots=${JSON.stringify(words)}  rep>=3=${JSON.stringify(repeatedGroups(tk))}  periode=${JSON.stringify(periodicity(words))}`);
}

// ---------- (d) stress : entree longue ----------
console.log('\n--- (d) entree longue ---');
const long = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud';
const tk = tokenize(long).filter(t => t.kind === 'W');
console.log(`  ${tk.length} mots -> decoupes contigues en 3 = ${C(tk.length - 1, 2).toLocaleString('fr')}`);
console.log(`  si chaque fragment coute ~2ms de recherche : ${(C(tk.length - 1, 2) * 3 * 2 / 1000).toFixed(1)}s en naif`);
console.log(`  mais fragments distincts a evaluer (memoisation par sous-chaine) : au plus n(n+1)/2 = ${(tk.length * (tk.length + 1) / 2)} -> ${(tk.length * (tk.length + 1) / 2 * 2 / 1000).toFixed(2)}s`);
console.log(`  avec fragments = mots simples uniquement : ${new Set(tk.map(t => t.t.toLowerCase())).size} evaluations -> ${(new Set(tk.map(t => t.t.toLowerCase())).size * 2 / 1000).toFixed(3)}s`);
