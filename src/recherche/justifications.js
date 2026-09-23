// Une preuve remplace son jumeau arithmétique, sans ouvrir de branche de recherche.
// Le catalogue conserve le décalage nu et sa variante à preuve explicite.
import { codePreuveCesar, lirePreuveCesar } from '../moteur/code-preuve-cesar.js';

export function fixerJustification(op, avant, catalogue) {
  if (!/^fj\d+$/.test(op.code)) return op;
  const preuve = op.justifie?.(avant.valeur);
  if (!preuve) return op;
  const table = catalogue instanceof Map ? catalogue : new Map(catalogue.map((o) => [o.code, o]));
  return op.avecPreuve(lirePreuveCesar(codePreuveCesar(op.code, preuve)), table);
}
export function prefererJustifications(chemin, catalogue) {
  let ops = null;
  for (let i = 0; i < chemin.ops.length; i++) {
    const op = chemin.ops[i];
    if (/^fj\d+$/.test(op.code)) {
      if (!ops) ops = chemin.ops.slice();
      ops[i] = fixerJustification(op, chemin.etats[i], catalogue);
      continue;
    }
    if (!/^fr\d+$/.test(op.code)) continue;
    const candidat = catalogue.find((o) => o.code === `fj${op.decalage}`);
    const avant = chemin.etats[i];
    if (!candidat || avant?.type !== candidat.from
      || candidat.justifie?.(avant.valeur)?.decalage !== op.decalage) continue;
    if (!ops) ops = chemin.ops.slice();
    ops[i] = fixerJustification(candidat, avant, catalogue);
  }
  return ops ? { ...chemin, ops, cout: ops.reduce((s, o) => s + (o.cout || 0), 0) } : chemin;
}
