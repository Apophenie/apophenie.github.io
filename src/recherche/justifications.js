// Une preuve remplace son jumeau arithmétique, sans ouvrir de branche de recherche.
// Le catalogue conserve les deux codes : les anciens liens restent rejouables.
export function prefererJustifications(chemin, catalogue) {
  let ops = null;
  for (let i = 0; i < chemin.ops.length; i++) {
    const op = chemin.ops[i];
    if (!/^fr\d+$/.test(op.code)) continue;
    const candidat = catalogue.find((o) => o.code === `fj${op.decalage}`);
    const avant = chemin.etats[i];
    if (!candidat || avant?.type !== candidat.from
      || candidat.justifie?.(avant.valeur)?.decalage !== op.decalage) continue;
    if (!ops) ops = chemin.ops.slice();
    ops[i] = candidat;
  }
  return ops ? { ...chemin, ops, cout: ops.reduce((s, o) => s + (o.cout || 0), 0) } : chemin;
}
