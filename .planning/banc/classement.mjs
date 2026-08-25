// .planning/banc/classement.mjs — le banc de mesure du classement.
//
//   node .planning/banc/classement.mjs            → le classement courant
//   node .planning/banc/classement.mjs --json     → la même chose, comparable
//   node .planning/banc/classement.mjs --detail   → avec le détail des critères
//   node .planning/banc/classement.mjs --saisie "…" → une seule saisie
//
// ★ Le filet temporel est NEUTRALISÉ ici (`filetTemporel: false`) : comparer un
// barème avant/après sur une base qui bouge sous la charge de la machine ne veut
// rien dire. C'est une option explicite, jamais un contournement silencieux.

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { CORPUS } from './_corpus.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const detail = args.includes('--detail');
const iSaisie = args.indexOf('--saisie');
const saisies = iSaisie >= 0 ? [args[iSaisie + 1]] : CORPUS;

const moteur = creerMoteur(CATALOGUE, { filetTemporel: false });

const sortie = [];
for (const s of saisies) {
  const r = moteur.resoudre(s);
  const lignes = r.approches.map((a) => ({
    rang: a.rang,
    mode: a.mode,
    series: a.series || 1,
    score: a.score,
    elegance: a.elegance ?? null,
    L: a.L,
    codes: a.codes,
    criteres: a.criteres,
    titre: typeof a.titre === 'string' ? a.titre : (a.titre && a.titre.fr) || '',
  }));
  sortie.push({ saisie: s, tronqueTemps: r.tronqueTemps, approches: lignes });
}

if (json) {
  console.log(JSON.stringify(sortie, null, 1));
} else {
  for (const bloc of sortie) {
    console.log(`\n═══ ${bloc.saisie}${bloc.tronqueTemps ? '  ⚠ TRONQUÉ PAR LE TEMPS' : ''}`);
    for (const l of bloc.approches) {
      const c = l.criteres || {};
      const det = detail
        ? `  H=${c.H} N=${c.N} U=${c.U} C=${c.C} A=${c.A} E=${c.E}${c.R !== undefined ? ` R=${c.R}` : ''}${c.G !== undefined ? ` G=${c.G}` : ''}`
        : '';
      console.log(
        `${String(l.rang).padStart(2)}. ${String(l.score).padStart(5)}`
        + `${l.elegance === null ? '' : ` g=${String(l.elegance).padStart(4)}`}`
        + ` ${String(l.series)}×666 L=${String(l.L).padStart(2)} ${l.mode.padEnd(11)} ${l.codes}${det}`,
      );
    }
  }
}
