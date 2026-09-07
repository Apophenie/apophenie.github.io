/**
 * Le banc commun des pistes « score v2 » — un module en argument, la même aune
 * pour tous.  Usage : node .planning/banc/score-v2-banc.mjs src/recherche/score-v2.js
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const chemin = process.argv[2];
if (!chemin) { console.error('usage : node score-v2-banc.mjs <module>'); process.exit(2); }
const V = await import(pathToFileURL(resolve(chemin)).href);
const M = await import(pathToFileURL(resolve('src/recherche/index.js')).href);
const { catalogue } = await import(pathToFileURL(resolve('src/recherche/tests/_catalogue.js')).href);
const { detailDuCredit } = await import(pathToFileURL(resolve('src/recherche/elegance.js')).href);
const m = M.creerMoteur(catalogue, { filetTemporel: false });
const CAS = ['Millicent Billette', 'https://hope-hope-hope.fr/', 'hope-hope-hope.fr', 'Capitalisme',
  'Le chat dort sur le tapis rouge', 'La numérologie est une science exacte, disent-ils', 'Donald Trump',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'hope', 'macron', 'Wikipedia',
  'https://www.example.com/path/to/page', 'jean-michel', 'Éléonore à Nîmes', 'Sarah Kerrigan'];
const listes = [];
for (const s of CAS) {
  const r = m.resoudre(s);
  // La piste « produit » lit `a.detail` posé par l'appelant ; on le pose pour toutes.
  for (const a of r.approches) if (!a.detail && a.bilan) a.detail = detailDuCredit(a.bilan);
  const l = r.approches.filter((a) => a.mode !== 'JOKER').map((a, i) => ({ a, rang: i + 1, ax: V.axesDe(a) }));
  listes.push({ s, l, elegante: l.find((x) => x.a.suggestion === 'elegance'), fournie: l.find((x) => x.a.suggestion === 'triptyques') });
}
// ★ Les globaux d'un point de grille sont calculés UNE fois par voie : le
//   balayage en demandait des milliers par point (tris, paires), et la piste
//   géométrique — racine S-ième en BigInt — ne tenait plus dans le temps.
let memoCur = null; const memo = new Map();
const g = (x, cur) => { if (cur !== memoCur) { memoCur = cur; memo.clear(); } let v = memo.get(x); if (v === undefined) { v = V.globalDe(x.ax, cur); memo.set(x, v); } return v; };
const PAS = Number(process.env.BANC_PAS || 20);
const axesTxt = (x) => `S${x.ax.simplicite} E${x.ax.exhaustivite} Q${x.ax.quantite} C${x.ax.coherence}`;
// ── régime mixte : la liste hors podium, référence = ordre actuel
const mixte = (cur) => {
  let tetes = 0, conc = 0, disc = 0, deplacees = 0, lignes = 0; const ch = [];
  for (const { s, l, elegante, fournie } of listes) {
    const reste = l.filter((x) => x !== elegante && x !== fournie);
    const tri = [...reste].sort((x, y) => (g(y, cur) - g(x, cur)) || (x.rang - y.rang));
    if (tri[0] !== reste[0]) ch.push({ s, avant: reste[0], apres: tri[0], cur });
    else tetes++;
    for (let i = 0; i < reste.length; i++) for (let j = i + 1; j < reste.length; j++) {
      const ds = reste[i].a.score - reste[j].a.score, dg = g(reste[i], cur) - g(reste[j], cur);
      if (!ds || !dg) continue; if (Math.sign(ds) === Math.sign(dg)) conc++; else disc++;
    }
    reste.slice(0, 12).forEach((x, i) => { lignes++; if (Math.abs(tri.indexOf(x) - i) >= 3) deplacees++; });
  }
  return { tetes, n: listes.length, accord: conc / Math.max(1, conc + disc), deplacees, lignes, ch };
};
const podium = (cur, quoi) => {
  let ok = 0, n = 0; const ch = [];
  for (const x of listes) {
    const ref = x[quoi]; if (!ref) continue; n++;
    const parmi = quoi === 'fournie' ? x.l.filter((y) => y !== x.elegante) : x.l;
    const t = [...parmi].sort((p, q) => (g(q, cur) - g(p, cur)) || (p.rang - q.rang))[0];
    if (t === ref) ok++; else ch.push({ s: x.s, avant: ref, apres: t, cur });
  }
  return { ok, n, ch };
};
const grille = []; for (let s = 0; s <= 200; s += PAS) for (let e = 0; e <= 200; e += PAS) for (let q = 0; q <= 200; q += PAS) for (let c = 0; c <= 200; c += PAS) if (s + e + q + c > 0) grille.push({ simplicite: s, exhaustivite: e, quantite: q, coherence: c });
const parts = (cur) => { const t = V.AXES.reduce((a, k) => a + cur[k], 0); return V.AXES.map((k) => `${Math.round(100 * cur[k] / t)}`).join('/'); };
const montrer = (ch) => { for (const c of ch) console.log(`      ${c.s.slice(0, 26).padEnd(28)} ${c.avant.a.codes.slice(0, 32).padEnd(34)} ${axesTxt(c.avant)} g=${g(c.avant, c.cur)}\n      ${''.padEnd(28)} → ${c.apres.a.codes.slice(0, 32).padEnd(32)} ${axesTxt(c.apres)} g=${g(c.apres, c.cur)}`); };
console.log(`═══ ${chemin} — ${listes.length} saisies, ${listes.reduce((t, x) => t + x.l.length, 0)} voies · balayage au pas ${PAS} (${grille.length} points) ═══`);
const r0 = mixte(V.REGIMES.mixte);
console.log(`\n── MIXTE avec REGIMES.mixte (${parts(V.REGIMES.mixte)}) : têtes ${r0.tetes}/${r0.n} · accord ${(100 * r0.accord).toFixed(1)} % · déplacées ≥3 : ${r0.deplacees}/${r0.lignes}`); montrer(r0.ch);
let best = null; for (const cur of grille) { const r = mixte(cur); const sc = r.tetes * 3 + r.accord * 100 - r.deplacees; if (!best || sc > best.sc) best = { cur, ...r, sc }; }
console.log(`   meilleur balayé (${parts(best.cur)}) : têtes ${best.tetes}/${best.n} · accord ${(100 * best.accord).toFixed(1)} % · déplacées ≥3 : ${best.deplacees}/${best.lignes}`); montrer(best.ch);
for (const [nom, quoi] of [['elegance', 'elegante'], ['abondance', 'fournie']]) {
  const r = podium(V.REGIMES[nom], quoi);
  console.log(`\n── ${nom.toUpperCase()} avec REGIMES.${nom} (${parts(V.REGIMES[nom])}) : ${r.ok}/${r.n} conservées`); montrer(r.ch);
  let b = null; for (const cur of grille) { const x = podium(cur, quoi); if (!b || x.ok > b.ok) b = { cur, ...x }; }
  console.log(`   meilleur balayé (${parts(b.cur)}) : ${b.ok}/${b.n}`); montrer(b.ch);
}
