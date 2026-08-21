// Densité restreinte au sous-ensemble "crédible" (sans les astuces ad hoc)
import * as T from './tables.mjs';
import { readFileSync } from 'node:fs';

function loadWords(path, n = 6000) {
  const raw = readFileSync(path, 'latin1').split('\n')
    .map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
    .filter(w => /^[a-z]{2,14}$/.test(w));
  const step = Math.max(1, Math.floor(raw.length / n));
  return raw.filter((_, i) => i % step === 0).slice(0, n);
}
const FR = loadWords('/usr/share/dict/french');

// pipelines "credibles" : filtres sobres, mappeurs traditionnels, sommes, reductions
const F = {
  'aucun': w => w,
  'voyelles': w => [...w].filter(T.isVowel).join(''),
  'consonnes': w => [...w].filter(c => !T.isVowel(c)).join(''),
};
const M = {
  'a1z26': T.a1z26, 'z26a1': T.z26a1, 'pythagoricien': T.pythagorean,
  'chaldeen': c => T.CHALDEAN[c.toUpperCase()],
  'scrabbleFR': c => T.SCRABBLE_FR[c.toUpperCase()],
  '7seg': T.seg7Count, '7segFusion': T.seg7MergedStrokes,
  'traitsMAJ': c => T.STROKES_UPPER[c.toUpperCase()],
  'traitsmin': c => T.STROKES_LOWER[c],
  'extremitesMAJ': c => T.ENDS_UPPER[c.toUpperCase()],
  'boucles': c => T.LOOPS_LOWER[c],
  'morse': T.morseCount,
};
const C = { 'somme': v => v.reduce((a, b) => a + b, 0),
            'soustraction': v => v.slice(1).reduce((a, b) => a - b, v[0]) };
const P = { 'racine': T.digitalRoot, 'redSignee': T.signedDigitReduce, 'abs': n => Math.abs(n) };

const pipes = [];
for (const [fn, f] of Object.entries(F))
  for (const [mn, m] of Object.entries(M))
    for (const [cn, c] of Object.entries(C))
      for (const [pn, p] of Object.entries(P))
        pipes.push({ name: `${fn}|${mn}|${cn}|${pn}`, run: w => { const s = f(w); if (!s) return null; const v = [...s].map(m); return v.some(x => x == null || Number.isNaN(x)) ? null : p(c(v)); } });
// comptages purs
const K = {
  'nbLettres': w => w.length,
  'lettres+voyelles': w => w.length + [...w].filter(T.isVowel).length,
  'lettres+consonnes': w => w.length + [...w].filter(c => !T.isVowel(c)).length,
  'lettresDistinctes': w => new Set([...w]).size,
};
for (const [kn, k] of Object.entries(K)) for (const [pn, p] of Object.entries(P)) pipes.push({ name: `${kn}|${pn}`, run: w => p(k(w)) });

// dedup par signature de resultats sur le corpus (elimine les pipelines equivalents)
const sig = new Map();
for (const pz of pipes) { const s = FR.slice(0, 800).map(pz.run).join(','); if (!sig.has(s)) sig.set(s, pz); }
const uniq = [...sig.values()];

const stats = uniq.map(pz => ({ name: pz.name, p: FR.filter(w => pz.run(w) === 6).length / FR.length }))
  .sort((a, b) => b.p - a.p);
const avg = stats.reduce((a, r) => a + r.p, 0) / stats.length;
const counts = FR.map(w => uniq.filter(pz => pz.run(w) === 6).length).sort((a, b) => a - b);
const q = p => counts[Math.floor(counts.length * p)];

console.log(`Sous-ensemble CREDIBLE : ${pipes.length} pipelines -> ${uniq.length} apres dedup semantique`);
console.log(`Corpus FR : ${FR.length} mots`);
console.log(`P(resultat = 6) moyen : ${(avg * 100).toFixed(2)} %`);
console.log(`Couverture (>=1 pipeline donnant 6) : ${(FR.filter(w => uniq.some(pz => pz.run(w) === 6)).length / FR.length * 100).toFixed(2)} %`);
console.log(`Pipelines gagnants par mot : min=${counts[0]} p10=${q(.1)} median=${q(.5)} p90=${q(.9)} max=${counts.at(-1)} moy=${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}`);
console.log('\nTop 20 :'); stats.slice(0, 20).forEach(r => console.log(`  ${(r.p * 100).toFixed(1).padStart(5)} %  ${r.name}`));
console.log('\nFlop 10 (non nuls) :'); stats.filter(r => r.p > 0).slice(-10).forEach(r => console.log(`  ${(r.p * 100).toFixed(2).padStart(5)} %  ${r.name}`));
console.log(`Nuls : ${stats.filter(r => r.p === 0).length}`);

// coverage par longueur
console.log('\nCouverture et nb de pipelines gagnants par longueur :');
for (let L = 2; L <= 12; L++) {
  const sub = FR.filter(w => w.length === L); if (sub.length < 15) continue;
  const cov = sub.filter(w => uniq.some(pz => pz.run(w) === 6)).length / sub.length;
  const mean = sub.reduce((a, w) => a + uniq.filter(pz => pz.run(w) === 6).length, 0) / sub.length;
  console.log(`  L=${String(L).padStart(2)} n=${String(sub.length).padStart(4)} couverture=${(cov * 100).toFixed(1).padStart(5)}%  moy=${mean.toFixed(1)}`);
}

// Cas "666" : un meme pipeline doit donner 6 sur 3 fragments d'une URL
console.log('\n--- Cas 666 : 3 fragments, MEME pipeline ---');
const trios = [['hope','hope','hope'], ['num','hero','lol'], ['www','google','com'], ['bill','gates','iii'], ['le','monde','fr']];
for (const t of trios) {
  const win = uniq.filter(pz => t.every(w => pz.run(w) === 6));
  console.log(`  ${t.join('-').padEnd(22)} : ${win.length} pipeline(s) uniforme(s)` + (win.length ? ` ex. ${win.slice(0,3).map(x=>x.name).join(' / ')}` : ''));
}
