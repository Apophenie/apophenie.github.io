// .planning/banc/sieges-banc.mjs — la réserve de qualité pilotée par les curseurs, AVANT / APRÈS.
//
// Compare deux arbres de sources — celui qu'on mesure et un « avant » figé
// (`git archive <rev> src | tar -x -C <dossier>`) — sur le même corpus, dans le
// MÊME processus et en ALTERNANT les deux moteurs saisie par saisie : la charge
// de la machine dérive pendant la mesure, et l'alternance la répartit sur les
// deux côtés au lieu de la mettre toute sur l'un.
//
//   mkdir -p /tmp/avant && git archive main src | tar -x -C /tmp/avant
//   AVANT=/tmp/avant node .planning/banc/sieges-banc.mjs
//   BANC_CURSEURS='{"simplicite":200}' AVANT=/tmp/avant node .planning/banc/sieges-banc.mjs
//   AVANT=/tmp/etape1 APRES=/tmp/etape2 node .planning/banc/sieges-banc.mjs   # deux étapes entre elles
//
// Temps : `process.cpuUsage` (utilisateur + système), après une passe de chauffe
// du JIT sur trois saisies ; chaque saisie est mesurée deux fois de chaque côté
// (A B B A), et l'on garde le MINIMUM — le moins bruité des deux. Le filet
// temporel est débranché (§4.4) : la liste ne dépend que de la saisie.
//
// ⚠️ Même en temps CPU, la charge de la machine fausse la mesure de quelques
//   pour cent (cache, mémoire) : relever `uptime` avant de lancer, et ne
//   comparer que deux mesures prises dans les mêmes conditions.

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { CORPUS } from './_corpus.js';

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AVANT = process.env.AVANT;
if (!AVANT) throw new Error('AVANT=<dossier contenant src/> est requis');
// Le côté mesuré : l'arbre courant, sauf si `APRES=` en désigne un autre (pour
// attribuer un changement à l'une de deux étapes).
const APRES = process.env.APRES || ICI;
const curseurs = process.env.BANC_CURSEURS ? JSON.parse(process.env.BANC_CURSEURS) : undefined;
const fouille = Number(process.env.BANC_FOUILLE || 0);

const SUPPLEMENTS = [
  'Capitalisme',
  'https://reinfocovid.fr/',
  'Le jardin sur le rocher de la maison',
  'La numérologie est une science exacte, disent-ils',
  'Henri Prunelle',
  'numherololgeek',
  // les saisies témoins de `app/pages/debug.js`
  'https://www.numérologie-évidente.fr/preuve',
  'Les 7 nains',
  'Sept',
  'Le 6 est sur le mur et il rit',
];
const SAISIES = [...CORPUS, ...SUPPLEMENTS.filter((s) => !CORPUS.includes(s))];
const CHAUFFE = ['hope', 'Macron', 'satan'];

async function moteurDe(racine) {
  const { creerMoteur } = await import(pathToFileURL(path.resolve(racine, 'src/recherche/index.js')).href);
  const { CATALOGUE } = await import(pathToFileURL(path.resolve(racine, 'src/moteur/catalogue.js')).href);
  return creerMoteur(CATALOGUE, { filetTemporel: false });
}

const avant = await moteurDe(AVANT);
const apres = await moteurDe(APRES);
const options = { fouille, ...(curseurs ? { curseurs } : {}) };

function mesurer(moteur, s) {
  const t0 = process.cpuUsage();
  const r = moteur.resoudre(s, options);
  const dt = process.cpuUsage(t0);
  return { r, ms: (dt.user + dt.system) / 1000 };
}

for (const s of CHAUFFE) { avant.resoudre(s, options); apres.resoudre(s, options); }

const tete = (r, i) => (r.approches[i] ? r.approches[i].codes : '—');
let totalA = 0;
let totalB = 0;
let listesChangees = 0;
let tetesChangees = 0;
console.log(`curseurs ${JSON.stringify(curseurs || {})}, cran ${fouille}, ${SAISIES.length} saisies\n`);
for (const s of SAISIES) {
  const a1 = mesurer(avant, s);
  const b1 = mesurer(apres, s);
  const b2 = mesurer(apres, s);
  const a2 = mesurer(avant, s);
  const ta = Math.min(a1.ms, a2.ms);
  const tb = Math.min(b1.ms, b2.ms);
  totalA += ta;
  totalB += tb;
  const la = a1.r.approches.map((x) => x.codes);
  const lb = b1.r.approches.map((x) => x.codes);
  const memeListe = la.join('\n') === lb.join('\n');
  if (!memeListe) listesChangees++;
  const podiumA = [0, 1, 2].map((i) => tete(a1.r, i));
  const podiumB = [0, 1, 2].map((i) => tete(b1.r, i));
  const memesTetes = podiumA.join('|') === podiumB.join('|');
  if (!memesTetes) tetesChangees++;
  console.log(`« ${s} » — ${Math.round(ta)} → ${Math.round(tb)} ms CPU (${tb >= ta ? '+' : ''}${Math.round((100 * (tb - ta)) / ta)} %)`
    + `${memeListe ? ', liste identique' : `, liste CHANGÉE (${la.length} → ${lb.length} voies)`}`);
  // Ce que la liste LIT (couverture brute, ‰) et ce qu'elle COÛTE (étapes
  // facturées) — ce que les curseurs d'exhaustivité et de simplicité nomment.
  if (!memeListe) {
    const profil = (r) => {
      const n = r.approches.length || 1;
      const lu = Math.round(r.approches.reduce((t, x) => t + x.criteres.brut, 0) / n);
      const pleins = r.approches.filter((x) => x.criteres.brut >= 1000).length;
      const L = (r.approches.reduce((t, x) => t + x.L, 0) / n).toFixed(2);
      return `lecture ${lu} ‰ (${pleins} pleines), longueur ${L}`;
    };
    console.log(`    ${profil(a1.r)}  →  ${profil(b1.r)}`);
  }
  if (!memesTetes) {
    for (let i = 0; i < 3; i++) {
      if (podiumA[i] !== podiumB[i]) console.log(`    place ${i + 1} : ${podiumA[i]}  →  ${podiumB[i]}`);
    }
  }
  if (!memeListe) {
    const entrees = lb.filter((x) => !la.includes(x));
    const sorties = la.filter((x) => !lb.includes(x));
    if (entrees.length) console.log(`    entrent : ${entrees.join('  ')}`);
    if (sorties.length) console.log(`    sortent : ${sorties.join('  ')}`);
  }
}
console.log(`\ntotal : ${Math.round(totalA)} → ${Math.round(totalB)} ms CPU (${totalB >= totalA ? '+' : ''}${Math.round((100 * (totalB - totalA)) / totalA)} %)`);
console.log(`têtes (trois premières places) changées : ${tetesChangees} / ${SAISIES.length} ; listes changées : ${listesChangees} / ${SAISIES.length}`);
