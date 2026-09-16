// .planning/banc/regenerer-instantane.mjs — régénère l'instantané des cibles
// chiffrées (`src/recherche/tests/lents/instantane-cibles-chiffrees.json`).
//
//   node .planning/banc/regenerer-instantane.mjs          # dit ce qui changerait
//   node .planning/banc/regenerer-instantane.mjs --ecrire # régénère le fichier
//
// ⚠️ L'instantané est « un fil tendu, pas une spécification » (`cible-mot.test.js`) :
//   on ne le régénère JAMAIS pour faire taire un test, seulement quand une
//   évolution VOULUE du classement le fait rougir — et alors on dit laquelle,
//   avec les voies qui entrent et celles qui sortent, nommément.
//
// Les couples et leur forme sont lus du fichier lui-même : cette sonde ne
// décide de rien, elle rejoue les mêmes questions et réécrit les réponses.
import { readFileSync, writeFileSync } from 'node:fs';
import { creerMoteur, lire, ecrire } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

const FICHIER = new URL(
  '../../src/recherche/tests/lents/instantane-cibles-chiffrees.json',
  import.meta.url,
);
const INSTANTANE = JSON.parse(readFileSync(FICHIER, 'utf8'));
const moteur = creerMoteur(catalogue, { filetTemporel: false });

/** La même réécriture que le test, pour comparer des liens comparables. */
const reecrire = (url) => {
  const l = lire(url);
  return ecrire({
    saisie: l.saisie, fragments: l.fragments, retouches: l.retouches,
    registre: l.registre, cible: l.cible, curseurs: l.curseurs, fouille: l.fouille,
    liaison: l.liaison,
  });
};

const sortie = {};
let entrees = 0;
let sorties = 0;
for (const [couple, attendu] of Object.entries(INSTANTANE)) {
  const [saisie, cible] = couple.split(' → ');
  const r = moteur.resoudre(saisie, { cible });
  const avant = new Map(attendu.map(([url, score, series, mode]) => [reecrire(url), { score, series, mode }]));
  const apres = new Map(r.approches.map((a) => [a.url, { score: a.score, series: a.series ?? null, mode: a.mode }]));
  const entrants = [...apres].filter(([u]) => !avant.has(u));
  const sortants = [...avant].filter(([u]) => !apres.has(u));
  entrees += entrants.length;
  sorties += sortants.length;
  console.log(`${couple} — ${avant.size} → ${apres.size} voies`
    + `${entrants.length || sortants.length ? '' : ' (identique)'}`);
  for (const [u, v] of entrants) console.log(`   ENTRE : ${u} (moteur ${v.score}, ${v.series} séries, ${v.mode})`);
  for (const [u, v] of sortants) console.log(`   SORT  : ${u} (moteur ${v.score}, ${v.series} séries, ${v.mode})`);
  sortie[couple] = r.approches.map((a) => [a.url, a.score, a.series ?? null, a.mode]);
}

console.log(`\nTOTAL : ${entrees} entrée(s), ${sorties} sortie(s)`);
if (process.argv.includes('--ecrire')) {
  writeFileSync(FICHIER, `${JSON.stringify(sortie, null, 1)}\n`);
  console.log('instantané régénéré.');
} else {
  console.log('(rien écrit — passer --ecrire pour régénérer)');
}
