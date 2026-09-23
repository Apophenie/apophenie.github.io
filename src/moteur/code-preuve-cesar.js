// Grammaire pure, partagée par les liens et le moteur, sans charger le catalogue.
const CODE = /^[ftnmcpj][0-9a-z]+[A-Z]?$/;
const entier = (s) => /^\d+$/.test(s) && Number.isSafeInteger(Number(s));

export function lirePreuveCesar(ecrit) {
  if (typeof ecrit !== 'string') return null;
  const [base, ...champs] = ecrit.split('~');
  if (!/^fj(?:[1-9]|1\d|2[0-5])$/.test(base) || !champs.length) return null;
  if (champs.length === 1 && champs[0] === 'c') return { base, communs: true, ecrit: `${base}~c` };
  let source = null;
  if (/^\d+(?:\.\d+)?$/.test(champs[0])) {
    const [debut, longueur = '1'] = champs.shift().split('.');
    if (!entier(debut) || !entier(longueur) || Number(longueur) < 1) return null;
    source = { debut: Number(debut), longueur: Number(longueur) };
  }
  if (!champs.length || champs.length > 2) return null;
  const ops = champs[0].split('.');
  if (!ops.every((c) => CODE.test(c))) return null;
  const indice = champs[1] ?? '0';
  if (!entier(indice)) return null;
  // tca peut être omis : la porte STR → TOKENS est unique. Un tca isolé
  // reste écrit pour que la syntaxe ne devienne pas un programme vide.
  const courts = ops.filter((c, i) => c !== 'tca' || i === ops.length - 1 || ops[i + 1] === 'tca');
  const portee = source ? `${source.debut}${source.longueur === 1 ? '' : `.${source.longueur}`}~` : '';
  return { base, source, ops: courts, indice: Number(indice),
    ecrit: `${base}~${portee}${courts.join('.')}${Number(indice) ? `~${Number(indice)}` : ''}` };
}

export function codePreuveCesar(base, preuve) {
  if (preuve.type !== 'conversion') return `${base}~c`;
  const ids = preuve.sourceIndices;
  const source = ids ? `${ids[0]}.${ids.length}~` : '';
  return lirePreuveCesar(`${base}~${source}${preuve.ops.map((o) => o.code).join('.')}~${preuve.indice}`).ecrit;
}
