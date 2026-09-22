/* « Le barème a-t-il encore de la marge ? » — la question préalable du
   22 septembre 2026.

   L'auteur demande que la PERTE pèse plus lourd. Avant de toucher au moindre
   poste, il faut savoir si le barème peut encore peser : le crédit d'élégance
   est écrasé à 0 par `note()` (`elegance.js › note`, plancher 0, plafond 6000),
   et le FACTEUR qui multiplie le score de conviction est borné en bas par
   `BAREME.FACTEUR_PLANCHER` (520).

   Une voie dont le crédit BRUT est déjà très négatif est SATURÉE : lui ajouter
   une peine ne change plus rien à son rang. Alourdir le barème pour une voie
   saturée, c'est déplacer les autres sans la toucher — exactement l'inverse de
   ce qu'on veut.

   Ce banc affiche, pour chaque voie nommée : le crédit BRUT (non borné), la
   note bornée, le facteur, et le détail poste par poste.

   Usage : node .planning/banc/saturation.mjs <lien> [<lien>…] */
import { creerMoteur, lire } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { credit, note, facteur, detailDuCredit, BAREME } from '../../src/recherche/elegance.js';

const m = creerMoteur(catalogue, { filetTemporel: false });
const liens = process.argv.slice(2);
if (!liens.length) {
  console.error('usage : node .planning/banc/saturation.mjs <lien> [<lien>…]');
  process.exit(2);
}

console.log(`socle ${BAREME.SOCLE} · plancher du facteur ${BAREME.FACTEUR_PLANCHER}\n`);

for (const lien of liens) {
  const lu = lire(lien);
  const rj = m.rejouer(lu);
  if (!rj || !rj.ok) { console.log(`✗ ${lien}\n   rejeu refusé\n`); continue; }
  const a = rj.approche;
  const brut = credit(a.bilan);
  const bornee = note(brut);
  const f = facteur(brut);
  console.log(`── ${a.codes}   « ${lu.saisie} »`);
  console.log(`   crédit BRUT ${brut}  →  note bornée ${bornee}  →  facteur ${f}`
    + `${f <= BAREME.FACTEUR_PLANCHER ? '   ⚠ FACTEUR AU PLANCHER' : ''}`);
  console.log(`   marge avant saturation : ${brut > 0 ? brut : 0} point(s) de crédit`);
  for (const { poste, quantite, points } of detailDuCredit(a.bilan)) {
    if (!points && !quantite) continue;
    const signe = points > 0 ? '+' : '';
    console.log(`     ${poste.padEnd(30)} ×${String(quantite).padStart(5)}  ${(signe + points).padStart(7)}`);
  }
  console.log('');
}
