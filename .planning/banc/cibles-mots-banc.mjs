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
const { normaliserCatalogue, appliquerOp, etat } = await charger('src/recherche/bfs.js');
const { plafondDAbsorption } = await charger('src/moteur/transformations/mappeurs.js');

/**
 * ★ LA MATIÈRE D'UNE SAISIE — la plus longue ligne de chiffres qu'une lecture
 * « filtre, découpe, mappeur » en tire. L'absorption, par où passent presque
 * toutes les voies vers une cible longue, n'écrit qu'un chiffre visé pour trois
 * ou quatre chiffres de ligne (`mappeurs.js › plafondDAbsorption`) : c'est ce
 * qui départage un échec de CAPACITÉ d'un échec de découpe.
 */
const OPS = normaliserCatalogue(catalogue).filter((o) => o && !o.deprecated);
function matiere(saisie) {
  const e0 = etat('STR', saisie, [...saisie].map((_, i) => [i]));
  let max = 0;
  for (const f of [null, ...OPS.filter((o) => o.from === 'STR' && o.to === 'STR')]) {
    const e1 = f ? appliquerOp(f, e0) : e0;
    if (!e1) continue;
    for (const d of OPS.filter((o) => o.from === 'STR' && o.to === 'TOKENS')) {
      const e2 = appliquerOp(d, e1);
      if (!e2) continue;
      for (const m of OPS.filter((o) => o.from === 'TOKENS' && o.to === 'NUMS')) {
        const e3 = appliquerOp(m, e2);
        if (e3 && e3.type === 'NUMS') max = Math.max(max, e3.valeur.reduce((s, x) => s + String(x).length, 0));
      }
    }
  }
  return max;
}
const MATIERE = new Map();

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

/**
 * ★ LE CORPUS DES CHIFFRES — `BANC_CORPUS=chiffres`. « Il faudrait aussi
 * étendre les cibles numériques au-delà de 12 » (l'auteur). Trois suites par
 * longueur, de dix à vingt chiffres, tirées d'un générateur congruentiel à
 * graine fixe : ni `Math.random`, ni des suites choisies pour tomber juste.
 * Aucun zéro de tête, pour que la longueur soit celle qu'on annonce.
 */
export const LONGUEURS = [10, 12, 14, 16, 18, 20];
export const CHIFFRES = (() => {
  let s = 20260911;
  const suivant = () => { s = (s * 1103515245 + 12345) % 2147483648; return s; };
  const out = [];
  for (const l of LONGUEURS) {
    for (let k = 0; k < 3; k++) {
      let t = String(1 + (suivant() % 9));
      while (t.length < l) t += String(suivant() % 10);
      out.push(t);
    }
  }
  return out;
})();

const choix = process.env.BANC_SAISIES;
const saisies = choix ? choix.split(',').map((i) => SAISIES[Number(i)]) : SAISIES;
const tout = process.env.BANC_CORPUS === 'chiffres' ? CHIFFRES : MOTS;
// ★ `BANC_CIBLES=Oxyde,Sphinx` — reprendre une partie du corpus, et rien d'autre.
//   Une campagne longue tient plusieurs gigaoctets de cache et peut se faire
//   tuer en chemin ; les résultats ne dépendant que du couple, on reprend là où
//   l'on s'est arrêté au lieu de tout refaire.
const cibles = process.env.BANC_CIBLES;
const corpus = cibles ? cibles.split(',').filter((c) => tout.includes(c)) : tout;
if (cibles && corpus.length !== cibles.split(',').length) {
  throw new Error(`BANC_CIBLES : ${cibles.split(',').filter((c) => !tout.includes(c)).join(', ')} n’est pas du corpus`);
}
/**
 * ★ `BANC_SEUIL=3` — le plancher du DERNIER RECOURS, pour chiffrer ce qu'il
 * coûte et ce qu'il rapporte (`recherche/index.js › voiesAvantDeCreuser`).
 * Absent, le banc mesure le moteur tel qu'il est.
 */
const seuil = process.env.BANC_SEUIL;
const moteur = creerMoteur(catalogue, {
  filetTemporel: false,
  ...(seuil === undefined ? {} : { voiesAvantDeCreuser: Number(seuil) }),
});

const lignes = [];
for (const saisie of saisies) {
  for (const mot of corpus) {
    const t0 = performance.now();
    const r = moteur.resoudre(saisie, { cible: mot });
    const ms = Math.round(performance.now() - t0);
    const ligne = {
      saisie, mot, voies: r.approches.length, ms,
      // Les liens, dans l'ordre de la liste : c'est ce qui permet de dire si une
      // voie neuve entre dans les cinq premières ou reste en fond de liste.
      urls: r.approches.map((a) => a.url),
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
// La famille d'un échec : ce qui bloque. Pour une suite de chiffres (la cible
// elle-même, ou la plus courte des relectures chiffrées), la CAPACITÉ d'abord :
// la plus longue ligne de la saisie, bornée au plafond d'absorption, face aux
// trois chiffres de ligne qu'il faut au moins par chiffre visé.
const capacite = (saisie, L) => {
  if (!MATIERE.has(saisie)) MATIERE.set(saisie, matiere(saisie));
  return Math.min(MATIERE.get(saisie), plafondDAbsorption(L));
};
const familleDeLongueur = (L, saisie) => (capacite(saisie, L) < 3 * L
  ? 'capacité : moins de trois chiffres de ligne par chiffre visé'
  : 'la ligne suffit, et aucune découpe ne tombe juste');
console.log('\nÉCHECS, par famille (visés / chiffres de ligne au plus) :');
const familles = {};
for (const l of lignes.filter((x) => x.voies === 0)) {
  let f;
  let L = null;
  if (corpus === CHIFFRES) L = l.mot.length;
  else if (!l.relectures.length) f = `aucune relecture : ${l.signesSansRelecture.map((s) => `« ${s} »`).join(', ')}`;
  else {
    const chiffrees = l.relectures.filter((x) => x.nature === 'chiffres');
    if (chiffrees.length) L = chiffrees.reduce((a, b) => (b.longueur < a.longueur ? b : a)).longueur;
    else f = 'des valeurs au-delà de 9 (les absorptions ne s’y appliquent pas)';
  }
  if (L !== null) f = familleDeLongueur(L, l.saisie);
  const detail = L !== null ? ` (${L}/${capacite(l.saisie, L)})` : '';
  (familles[f] = familles[f] || []).push(`${l.mot} ← ${l.saisie.slice(0, 14)}${detail}`);
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
