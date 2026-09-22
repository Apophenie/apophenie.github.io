/* Instrument de mesure : compile une démonstration désignée par son lien et
   relève, step par step, les ops et leurs fenêtres temporelles. */
import { creerMoteur } from './src/recherche/index.js';
import { lire as lireUrl } from './src/recherche/url.js';
import { catalogue } from './src/recherche/tests/_catalogue.js';
import { compile } from './src/visuel/compile.js';
import { setGlyphes } from './src/visuel/glyphes.js';
import { GLYPHES } from './src/moteur/tables/glyphes.js';
import { DEFAULT_DUR } from './src/visuel/constants.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const lien = process.argv[2];
const m = creerMoteur(catalogue);
const lu = lireUrl(lien, { catalogue });
const r = m.rejouer(lu);
if (!r.ok) { console.error('rejeu impossible :', r); process.exit(1); }
const sc = m.scenarioDe(r.approche, { saisie: r.saisie ?? lu.saisie });
const rythme = process.argv[3] || 'pasAPas';
const tl = compile(sc, { rythme });
const { ordonnerLesOps } = await import('./src/visuel/rythme.js');

console.log(`saisie=${JSON.stringify(r.saisie ?? lu.saisie)} codes=${JSON.stringify(r.approche.codes)}`);
console.log(`${sc.steps.length} étapes, ${Math.round(tl.total)} ms\n`);

let chevauchements = 0;
sc.steps.forEach((st, i) => {
  const planifie = ordonnerLesOps(st, { rythme });
  const ops = planifie.map((e) => ({
    k: e.i,
    nom: e.op.op,
    a: e.at,
    d: e.op.dur ?? DEFAULT_DUR[e.op.op] ?? 0,
  }));
  // par type d'op : deux fenêtres qui se recouvrent ?
  const parType = new Map();
  for (const o of ops) {
    if (!parType.has(o.nom)) parType.set(o.nom, []);
    parType.get(o.nom).push(o);
  }
  const conflits = [];
  for (const [nom, list] of parType) {
    list.sort((x, y) => x.a - y.a);
    for (let j = 1; j < list.length; j++) {
      if (list[j].a < list[j - 1].a + list[j - 1].d - 1e-9) {
        conflits.push(`${nom}#${list[j - 1].k}[${list[j - 1].a},${list[j - 1].a + list[j - 1].d}]`
          + ` ∩ ${nom}#${list[j].k}[${list[j].a},${list[j].a + list[j].d}]`);
      }
    }
  }
  if (conflits.length) chevauchements += conflits.length;
  const resume = ops.map((o) => `${o.nom}@${o.a}+${o.d}`).join(' ');
  const titre = typeof st.title === 'string' ? st.title : (st.title.fr || '');
  console.log(`${String(i).padStart(2)} ${titre.slice(0, 40).padEnd(42)} ${resume}`);
  for (const c of conflits) console.log(`   ⚠ CHEVAUCHEMENT ${c}`);
});
console.log(`\n=> ${chevauchements} chevauchements de même type`);

console.log('\n--- détail des `reduce` ---');
sc.steps.forEach((st, i) => {
  for (const o of (st.ops || [])) {
    if (o.op !== 'reduce') continue;
    const d = o.digits || [];
    console.log(`${String(i).padStart(2)} reduce target=${o.target} `
      + `digits=${d.map((x) => x.text).join('+')} (${d.length} items) -> ${o.to.text} [${o.to.id}]`);
  }
});
