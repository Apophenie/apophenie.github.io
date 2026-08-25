// .planning/banc/elegance.mjs — le banc de mesure de l'ÉLÉGANCE.
//
//   node .planning/banc/elegance.mjs "Donald Trump"      → le détail, ligne par ligne
//   node .planning/banc/elegance.mjs "Macron" --tete 3   → les trois premières seulement
//
// Il répond à une question que le classement seul ne répond pas : POURQUOI cette
// approche-là perd. `.planning/banc/classement.mjs` dit de combien ; celui-ci dit
// de quoi. Sans les deux, un barème ne se règle pas — il se devine.
//
// ★ Le filet temporel est neutralisé (`filetTemporel: false`), pour la même
// raison qu'ailleurs : comparer deux réglages sur une base qui bouge avec la
// charge de la machine ne veut rien dire.

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { detailDuCredit, BAREME } from '../../src/recherche/elegance.js';

const args = process.argv.slice(2);
const saisie = args.find((a) => !a.startsWith('--')) || 'Donald Trump';
const iTete = args.indexOf('--tete');
const tete = iTete >= 0 ? Number(args[iTete + 1]) : 99;

const moteur = creerMoteur(CATALOGUE, { filetTemporel: false });
const r = moteur.resoudre(saisie);

console.log(`\n═══ « ${saisie} » — socle du barème : ${BAREME.SOCLE}, `
  + `plancher du facteur : ${BAREME.FACTEUR_PLANCHER}\n`);

for (const a of r.approches.slice(0, tete)) {
  const titre = typeof a.titre === 'string' ? a.titre : (a.titre && a.titre.fr) || '';
  console.log(`── rang ${a.rang} · ${a.suggestion} · ${a.mode} · ${a.series || 1}×666 · `
    + `score ${a.score} · élégance ${a.elegance}${a.pur ? ' · PURE' : ''}`);
  console.log(`   ${a.codes}`);
  if (titre) console.log(`   « ${titre} »`);
  for (const { poste, quantite, points } of detailDuCredit(a.bilan)) {
    if (!points && !quantite) continue;
    const signe = points > 0 ? '+' : '';
    console.log(`     ${poste.padEnd(32)} ×${String(quantite).padStart(4)}  ${(signe + points).padStart(6)}`);
  }
  console.log(`     ${'='.repeat(32)}        ${String(a.elegance).padStart(6)}`);
  if (a.bilan.abandons && a.bilan.abandons.opaque) {
    console.log('     ⚠ portée OPAQUE : un opérateur ne conserve pas la trace des caractères');
  }
  console.log('');
}
