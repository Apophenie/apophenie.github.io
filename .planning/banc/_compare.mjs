/* Comparateur jetable de deux relevés `classement.mjs --json`.
   Dit ce qui ENTRE, ce qui SORT, et les têtes qui changent. */
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const parSaisie = (x) => new Map(x.map((bl) => [bl.saisie, bl.approches.map((l) => l.codes)]));
const A = parSaisie(a);
const B = parSaisie(b);
let tetes = 0; let entrees = 0; let sorties = 0; let bouges = 0;
for (const [saisie, la] of A) {
  const lb = B.get(saisie) || [];
  const sa = new Set(la); const sb = new Set(lb);
  const sort = la.filter((c) => !sb.has(c));
  const entre = lb.filter((c) => !sa.has(c));
  const teteChange = la[0] !== lb[0];
  const deplacees = la.filter((c) => sb.has(c) && la.indexOf(c) !== lb.indexOf(c));
  if (teteChange) tetes += 1;
  entrees += entre.length; sorties += sort.length; bouges += deplacees.length;
  if (!teteChange && !sort.length && !entre.length && !deplacees.length) continue;
  console.log(`\n═══ « ${saisie} » · ${la.length} → ${lb.length} voies`);
  if (teteChange) console.log(`  ⚑ TÊTE : ${la[0]}\n           → ${lb[0]}`);
  for (const c of sort) console.log(`  − sort  (rang ${la.indexOf(c) + 1}) ${c}`);
  for (const c of entre) console.log(`  + entre (rang ${lb.indexOf(c) + 1}) ${c}`);
  for (const c of deplacees) console.log(`  ~ ${la.indexOf(c) + 1} → ${lb.indexOf(c) + 1}  ${c}`);
}
console.log(`\n${tetes} tête(s) changée(s) · ${entrees} entrée(s) · ${sorties} sortie(s) · ${bouges} déplacement(s) · ${A.size} saisies`);
