// .planning/banc/cibles-mots-banc.mjs — une saisie quelconque vers un MOT quelconque.
//
// > « J'ai testé avec d'autres mots que Zerg, Terran… et aucune route. Il y a
// >   des progrès à faire pour des conversions de n'importe quelle saisie vers
// >   un objectif non numérique. » (l'auteur)
//
// Pour chaque couple (saisie, mot) du corpus, une recherche RÉELLE vers le mot —
// le chemin même du site — et, dans sa réponse, le diagnostic que le moteur
// publie (`index.js › deroulerTexte`) : les relectures tentées, la suite
// chiffrée que chacune a donnée à la recherche, et combien de voies celle-ci y
// a trouvées ; ou, si aucune relecture ne s'applique, les signes qui bloquent.
// On en tire le taux de réussite, la famille de chaque échec, et le temps.
//
//   node .planning/banc/cibles-mots-banc.mjs                   # tout le corpus
//   BANC_SAISIES=0,1 node .planning/banc/cibles-mots-banc.mjs  # deux saisies
//   BANC_JSON=/tmp/mesure.json node .planning/banc/cibles-mots-banc.mjs
//
// Le filet temporel est débranché (§4.4) : la liste ne dépend que du couple.
// ⚠️ Le temps, lui, dépend de la charge de la machine : ne comparer que deux
//   mesures prises dans les mêmes conditions, et relever `uptime` avant.

import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const charger = (rel) => import(pathToFileURL(path.join(ICI, rel)).href);
const { creerMoteur } = await charger('src/recherche/index.js');
const { catalogue } = await charger('src/recherche/tests/_catalogue.js');

/**
 * Trente mots, choisis pour leur DIVERSITÉ et non pour tomber juste : de trois à
 * onze lettres, les lettres rares (J, K, Q, W, X, Y, Z), des accents, des mots
 * de l'univers de l'exemple de l'auteur et des mots ordinaires.
 */
export const MOTS = [
  'Zerg', 'Terran', 'Ghost', 'Fantome', 'Protoss', 'Raynor', 'Jim', 'Mal', 'Bête', 'Diable',
  'Satan', 'Enfer', 'Ange', 'Démon', 'Chat', 'Kiwi', 'Yak', 'Quiz', 'Wok', 'Fox',
  'Jazz', 'Oxyde', 'Sphinx', 'Hydre', 'Vampire', 'Kraken', 'Lucifer', 'Apocalypse', 'Numérologie', 'Zéro',
];
/** Quatre saisies de nature différente : un nom, un autre, une phrase, une adresse. */
export const SAISIES = [
  'Sarah Kerrigan', 'Donald Trump', 'Le chat dort sur le tapis rouge', 'https://hope-hope-hope.fr/',
];

const choix = process.env.BANC_SAISIES;
const saisies = choix ? choix.split(',').map((i) => SAISIES[Number(i)]) : SAISIES;
const moteur = creerMoteur(catalogue, { filetTemporel: false });

const lignes = [];
for (const saisie of saisies) {
  for (const mot of MOTS) {
    const t0 = performance.now();
    const r = moteur.resoudre(saisie, { cible: mot });
    const ms = Math.round(performance.now() - t0);
    const ligne = {
      saisie, mot, voies: r.approches.length, ms,
      relectures: (r.relectures || []).map((x) => ({
        code: x.code, cible: x.cible, nature: x.nature, longueur: x.longueur, voies: x.voies,
      })),
      signesSansRelecture: r.signesSansRelecture || [],
    };
    lignes.push(ligne);
    const detail = ligne.relectures.map((x) => `${x.code}:${x.voies}${x.nature === 'valeurs' ? 'v' : ''}/${x.longueur}`).join(' ');
    console.log(`${saisie.slice(0, 18).padEnd(18)} → ${mot.padEnd(12)} ${String(ligne.voies).padStart(2)} voie(s) ${String(ms).padStart(6)} ms  ${detail}`);
  }
}
if (process.env.BANC_JSON) writeFileSync(process.env.BANC_JSON, JSON.stringify(lignes, null, 1));

// ── La synthèse ──────────────────────────────────────────────────────────────
const pct = (a, b) => `${a}/${b} (${Math.round((100 * a) / Math.max(1, b))} %)`;
const reussis = lignes.filter((l) => l.voies > 0);
console.log(`\nRÉUSSITE : ${pct(reussis.length, lignes.length)} couples ont au moins une voie`);
for (const s of saisies) {
  const ls = lignes.filter((l) => l.saisie === s);
  console.log(`   ${s.padEnd(34)} ${pct(ls.filter((l) => l.voies > 0).length, ls.length)}`);
}
const codes = [...new Set(lignes.flatMap((l) => l.relectures.map((x) => x.code)))];
console.log('\nPAR RELECTURE (couples où elle trouve au moins une voie) :');
for (const c of codes) {
  const seule = lignes.filter((l) => l.relectures.some((x) => x.code === c && x.voies > 0));
  const unique = seule.filter((l) => l.relectures.filter((x) => x.voies > 0).length === 1);
  console.log(`   ${c.padEnd(6)} ${pct(seule.length, lignes.length)}, dont ${unique.length} qu'elle est seule à ouvrir`);
}
// La famille d'un échec : ce qui bloque, relecture par relecture.
const famille = (x) => {
  if (x.nature === 'valeurs') return 'des valeurs au-delà de 9 (les absorptions ne s’y appliquent pas)';
  if (x.longueur > 10) return `plus de dix chiffres (${x.longueur})`;
  return 'dix chiffres au plus, et pourtant aucune voie';
};
console.log('\nÉCHECS, par famille de la meilleure relecture tentée :');
const familles = {};
for (const l of lignes.filter((x) => x.voies === 0)) {
  let f;
  if (!l.relectures.length) f = `aucune relecture : ${l.signesSansRelecture.map((s) => `« ${s} »`).join(', ')}`;
  else {
    const chiffrees = l.relectures.filter((x) => x.nature === 'chiffres');
    const meilleure = chiffrees.length ? chiffrees.reduce((a, b) => (b.longueur < a.longueur ? b : a)) : l.relectures[0];
    f = famille(meilleure);
  }
  (familles[f] = familles[f] || []).push(`${l.mot} ← ${l.saisie.slice(0, 14)}`);
}
for (const [f, liste] of Object.entries(familles).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   ${String(liste.length).padStart(3)}  ${f}`);
  console.log(`        ${liste.join(' · ')}`);
}
console.log('\nRÉUSSITE PAR LONGUEUR DU MOT :');
const parL = {};
for (const l of lignes) {
  const k = [...l.mot].length;
  parL[k] = parL[k] || [0, 0];
  parL[k][1]++;
  if (l.voies > 0) parL[k][0]++;
}
for (const [k, [a, b]] of Object.entries(parL).sort((p, q) => p[0] - q[0])) console.log(`   ${String(k).padStart(2)} lettres : ${pct(a, b)}`);
const ms = lignes.map((l) => l.ms).sort((a, b) => a - b);
console.log(`\nTEMPS d’une recherche vers un mot : médiane ${ms[Math.floor(ms.length / 2)]} ms, `
  + `max ${ms[ms.length - 1]} ms, moyenne ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms`);
