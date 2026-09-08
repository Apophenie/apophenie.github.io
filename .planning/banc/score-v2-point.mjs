/**
 * Le banc v2 « en un point » — pas de balayage, des jeux de curseurs NOMMÉS.
 *
 * `score-v2-banc.mjs` balaie 14 641 points de grille pour trouver le meilleur ;
 * quand la question est « que vaut CE réglage-là », le balayage est du temps
 * jeté. Même mesure, mêmes seize saisies, mêmes définitions de têtes, accord et
 * lignes déplacées — appelées sur les seuls points demandés.
 *
 * Usage : BANC_REGLAGES='{"EXPOSANT_PERTE":80}' node .planning/banc/score-v2-point.mjs
 *         BANC_CURSEURS='25/25/25/25,6/29/48/18' node .planning/banc/score-v2-point.mjs
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const chemin = process.argv[2] || 'src/recherche/score-v2.js';
const V = await import(pathToFileURL(resolve(chemin)).href);
if (process.env.BANC_REGLAGES && typeof V.configurer === 'function') {
  V.configurer(JSON.parse(process.env.BANC_REGLAGES));
  console.log('réglages :', process.env.BANC_REGLAGES);
}
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
  for (const a of r.approches) if (!a.detail && a.bilan) a.detail = detailDuCredit(a.bilan);
  const l = r.approches.filter((a) => a.mode !== 'JOKER').map((a, i) => ({ a, rang: i + 1, ax: V.axesDe(a) }));
  listes.push({ s, l, elegante: l.find((x) => x.a.suggestion === 'elegance'), fournie: l.find((x) => x.a.suggestion === 'triptyques') });
}
let memoCur = null; const memo = new Map();
const g = (x, cur) => { if (cur !== memoCur) { memoCur = cur; memo.clear(); } let v = memo.get(x); if (v === undefined) { v = V.globalDe(x.ax, cur); memo.set(x, v); } return v; };
const axesTxt = (x) => `S${x.ax.simplicite} E${x.ax.exhaustivite} Q${x.ax.quantite} C${x.ax.coherence}`;
const mixte = (cur) => {
  let tetes = 0, conc = 0, disc = 0, deplacees = 0, lignes = 0; const ch = [];
  for (const { s, l, elegante, fournie } of listes) {
    const reste = l.filter((x) => x !== elegante && x !== fournie);
    const tri = [...reste].sort((x, y) => (g(y, cur) - g(x, cur)) || (x.rang - y.rang));
    if (tri[0] !== reste[0]) ch.push({ s, avant: reste[0], apres: tri[0], cur }); else tetes++;
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
const montrer = (ch) => { for (const c of ch) console.log(`      ${c.s.slice(0, 26).padEnd(28)} ${c.avant.a.codes.slice(0, 30).padEnd(32)} ${axesTxt(c.avant)} g=${g(c.avant, c.cur)}\n      ${''.padEnd(28)} → ${c.apres.a.codes.slice(0, 30).padEnd(30)} ${axesTxt(c.apres)} g=${g(c.apres, c.cur)}`); };
/* ★ **PLUSIEURS JEUX DE RÉGLAGES DANS UN SEUL PROCESS.**
   Résoudre les seize saisies coûte deux bonnes minutes ; les axes, eux, se
   recalculent en quelques millisecondes. On garde donc les listes et on
   renote — c'est ce qui rend comparable une grille de poids.
   `BANC_POIDS='400/400/200,300/350/350'` = lecture/rendement/pertes en route. */
const renoter = () => { for (const { l } of listes) for (const x of l) x.ax = V.axesDe(x.a); memoCur = null; memo.clear(); };
const lire = (t) => { const [s, e, q, c] = t.split('/').map(Number); return { simplicite: s, exhaustivite: e, quantite: q, coherence: c }; };
const points = (process.env.BANC_CURSEURS || '25/25/25/25').split(',').map((t) => [t.trim(), lire(t.trim())]);
console.log(`═══ ${chemin} — ${listes.length} saisies, ${listes.reduce((t, x) => t + x.l.length, 0)} voies ═══`);
const jeux = (process.env.BANC_POIDS || '').split(',').filter(Boolean).map((t) => {
  const [lect, rend, rte] = t.trim().split('/').map(Number);
  return [t.trim(), { POIDS_LECTURE: lect, POIDS_RENDEMENT: rend, POIDS_PERTES_EN_ROUTE: rte }];
}).concat(
  /* Les PRIX de la matière abandonnée : lettre éparse / bloc entier / bloc court
     / ponctuation. « Ignorer un mot sur deux est inacceptable, ignorer un .fr ou
     les voyelles est bien plus acceptable » (l'auteur) — or l'échelle héritée
     dit l'inverse : 26 la lettre éparse, 20 le caractère d'un mot entier. */
  (process.env.BANC_NATURE || '').split(',').filter(Boolean).map((t) => {
    // règle / lettre hors portée / mot ignoré / mot outil dont la règle est tenue / ponctuation
    const [rg, l, mot, outil, pc] = t.trim().split('/').map(Number);
    return [`nature ${t.trim()}`, { PRIX_ECARTE_PAR_REGLE: rg, PRIX_LETTRE: l, PRIX_MOT_IGNORE: mot, PRIX_MOT_OUTIL: outil, PRIX_PONCTUATION: pc }];
  }),
).concat(
  (process.env.BANC_CAUSE || '').split(',').filter(Boolean).map((t) => {
    // règle / lettre hors portée / mot ignoré / bloc court / ponctuation
    const [rg, l, mot, bc, pc] = t.trim().split('/').map(Number);
    return [`cause ${t.trim()}`, { PRIX_ECARTE_PAR_REGLE: rg, PRIX_LETTRE: l, PRIX_MOT_IGNORE: mot, PRIX_BLOC_COURT: bc, PRIX_PONCTUATION: pc }];
  }),
).concat(
  (process.env.BANC_PRIX || '').split(',').filter(Boolean).map((t) => {
    const [l, b, bc, pc] = t.trim().split('/').map(Number);
    return [`prix ${t.trim()}`, { PRIX_LETTRE: l, PRIX_BLOC: b, PRIX_BLOC_COURT: bc, PRIX_PONCTUATION: pc }];
  }),
);
for (const [nomJeu, reglages] of (jeux.length ? jeux : [[null, null]])) {
  if (reglages) { V.configurer(reglages); renoter(); console.log(`\n▓▓ poids lecture/rendement/pertes-en-route = ${nomJeu}`); }
for (const [nom, cur] of points) {
  const r = mixte(cur);
  console.log(`\n── MIXTE ${nom} : têtes ${r.tetes}/${r.n} · accord ${(100 * r.accord).toFixed(1)} % · déplacées ≥3 : ${r.deplacees}/${r.lignes}`);
  if (process.env.BANC_DETAIL) montrer(r.ch); else for (const c of r.ch) console.log(`      ${c.s.slice(0, 26).padEnd(28)} ${c.avant.a.codes.slice(0, 26)} → ${c.apres.a.codes.slice(0, 26)}`);
}
for (const [nom, quoi] of [['elegance', 'elegante'], ['abondance', 'fournie']]) {
  const r = podium(V.REGIMES[nom], quoi);
  console.log(`── ${nom.toUpperCase()} (REGIMES.${nom}) : ${r.ok}/${r.n} conservées`);
  if (process.env.BANC_DETAIL) for (const c of r.ch) console.log(`      ${c.s.slice(0, 26).padEnd(28)} ${c.avant.a.codes.slice(0, 26)} → ${c.apres.a.codes.slice(0, 26)}`);
}
}
