/* Régénère l'instantané des cibles chiffrées (`tests/lents/cible-mot.test.js`)
   avec le moteur du test — `creerMoteur(catalogue, { filetTemporel: false })` —
   sur les couples que l'instantané contient déjà, dans le même format
   (`[url, score, séries, mode]`), et imprime ce qui change, couple par couple :
   têtes, voies sorties, voies entrées, rangs déplacés.

   ⚠️ À ne lancer que pour une évolution VOULUE du classement, et en disant
   laquelle dans l'en-tête du test.

   Usage : node .planning/banc/score-arbitre-instantane.mjs [--ecrire] */
import { readFileSync, writeFileSync } from 'node:fs';
import { creerMoteur } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

const chemin = new URL('../../src/recherche/tests/lents/instantane-cibles-chiffrees.json', import.meta.url);
const avant = JSON.parse(readFileSync(chemin, 'utf8'));
const moteur = creerMoteur(catalogue, { filetTemporel: false });
const apres = {};
for (const couple of Object.keys(avant)) {
  const [saisie, cible] = couple.split(' → ');
  apres[couple] = moteur.resoudre(saisie, { cible }).approches.map((a) => [a.url, a.score, a.series ?? null, a.mode]);
  const urlsA = avant[couple].map((l) => l[0]);
  const urlsB = apres[couple].map((l) => l[0]);
  const sorties = urlsA.filter((u) => !urlsB.includes(u));
  const entrees = urlsB.filter((u) => !urlsA.includes(u));
  const deplacees = urlsB.filter((u, i) => urlsA.includes(u) && urlsA.indexOf(u) !== i).length;
  console.log(`── ${couple} : ${urlsA.length} → ${urlsB.length} voies ; ${deplacees} déplacées`);
  console.log(`   tête : ${urlsA[0]} → ${urlsB[0]}${urlsA[0] !== urlsB[0] ? '   ★ CHANGE' : ''}`);
  if (sorties.length) console.log(`   sorties : ${sorties.join(' · ')}`);
  if (entrees.length) console.log(`   entrées : ${entrees.join(' · ')}`);
}
if (process.argv.includes('--ecrire')) {
  writeFileSync(chemin, `${JSON.stringify(apres, null, 1)}\n`);
  console.log('\ninstantané réécrit');
}
