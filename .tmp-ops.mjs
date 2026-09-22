import { PAR_CODE, appliquer } from './src/moteur/catalogue.js';
import { VECTEURS } from './src/moteur/vecteurs-geles.js';
import { setGlyphes } from './src/visuel/glyphes.js';
import { GLYPHES } from './src/moteur/tables/glyphes.js';
import { DEFAULT_DUR } from './src/visuel/constants.js';
import { ordonnerLesOps, empreinteDe } from './src/visuel/rythme.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

for (const code of process.argv.slice(2)) {
  const entree = new Map(VECTEURS).get(code);
  const op = PAR_CODE.get(code);
  const apres = appliquer(op, entree);
  const elements = entree.type === 'STR' ? [...entree.valeur]
    : entree.type === 'NUM' ? [String(entree.valeur)] : entree.valeur.map(String);
  const tokens = elements.map((text, i) => ({ id: `t${i}`, text }));
  const steps = op.steps(entree, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
  console.log(`\n=== ${code} : ${steps.length} étape(s)`);
  steps.forEach((st, i) => {
    const ordre = ordonnerLesOps(st, { rythme: 'pasAPas' });
    console.log(` étape ${i} (${st.id})`);
    for (const o of (st.ops || [])) {
      const emp = empreinteDe(o);
      const neuf = ordre.find((x) => x.op === o);
      console.log(`   ${o.op.padEnd(16)} at=${String(o.at ?? 0).padStart(6)} dur=${String(o.dur ?? DEFAULT_DUR[o.op] ?? 0).padStart(5)}`
        + ` -> at'=${String(neuf ? neuf.at : '?').padStart(6)}`
        + `  empreinte=${typeof emp === 'object' && emp.size !== undefined ? [...emp].join(',') : 'PARTOUT'}`);
    }
  });
}
