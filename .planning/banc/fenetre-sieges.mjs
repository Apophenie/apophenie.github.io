// .planning/banc/fenetre-sieges.mjs — la fenêtre de candidats du cran 0 et les
// cinq sièges, AVANT / APRÈS, sur le corpus des arbitrages.
//
// Même doctrine que `sieges-banc.mjs` : deux arbres de sources — celui qu'on
// mesure et un « avant » figé — dans le MÊME processus, en ALTERNANT les deux
// moteurs saisie par saisie, parce que la charge de la machine dérive pendant la
// mesure.
//
//   mkdir -p /tmp/avant && git archive main src | tar -x -C /tmp/avant
//   AVANT=/tmp/avant node .planning/banc/fenetre-sieges.mjs
//   AVANT=/tmp/avant BANC_FOUILLE=1 node .planning/banc/fenetre-sieges.mjs
//
// Ce qu'il relève, et pourquoi :
//   · `tca+m14` entre-t-il dans la liste de « hope », et à quelle place — la
//     voie la mieux notée du cran 0 (7 301 au moteur, 704 au global) que la
//     fenêtre laisse dehors ;
//   · ce qui ENTRE et ce qui SORT de chaque liste, nommément, avec les deux
//     scores — celui du moteur et le global affiché ;
//   · les TÊTES qui changent, et si l'une tombe sur une voie que l'autrice a
//     rejetée (`mab`, une traduction, `pc9`, un `cmn` qui jette, une voie
//     alambiquée) : c'est signalé en premier, c'est le seul résultat qui peut
//     arrêter une livraison ;
//   · le temps CPU, avant/après, en séquentiel.
//
// ⚠️ Le filet temporel est débranché (§4.4) : une liste écourtée à l'horloge ne
//   se compare à rien.

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { CORPUS } from './_corpus.js';

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AVANT = process.env.AVANT;
if (!AVANT) throw new Error('AVANT=<dossier contenant src/> est requis');
const APRES = process.env.APRES || ICI;
const fouille = Number(process.env.BANC_FOUILLE || 0);
const curseurs = process.env.BANC_CURSEURS ? JSON.parse(process.env.BANC_CURSEURS) : undefined;

/** Les couples de référence de l'instantané des cibles chiffrées. */
const COUPLES_INSTANTANE = [
  ['Sarah Kerrigan', '666'], ['Sarah Kerrigan', '13'], ['Sarah Kerrigan', '007'],
  ['hope-hope-hope.fr', '666'], ['Donald Trump', '111'],
];

/** Les saisies des quinze verdicts de l'autrice (15 septembre 2026). */
const SAISIES_DES_VERDICTS = [
  'hope', 'Donald Trump', 'Éléonore à Nîmes', 'Capitalisme', 'Wikipedia',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'https://hope-hope-hope.fr/',
  'hope-hope-hope.fr', 'Macron',
];

const COUPLES = (() => {
  const out = [];
  const vu = new Set();
  const ajouter = (saisie, cible = '666') => {
    const cle = `${saisie} → ${cible}`;
    if (vu.has(cle)) return;
    vu.add(cle);
    out.push([saisie, cible]);
  };
  for (const [s, c] of COUPLES_INSTANTANE) ajouter(s, c);
  for (const s of SAISIES_DES_VERDICTS) ajouter(s);
  ajouter('Le chat dort sur le tapis rouge');
  for (const s of CORPUS) ajouter(s);
  return out;
})();

const CHAUFFE = ['hope', 'Macron', 'satan'];

async function moteurDe(racine) {
  const { creerMoteur } = await import(pathToFileURL(path.resolve(racine, 'src/recherche/index.js')).href);
  const { CATALOGUE } = await import(pathToFileURL(path.resolve(racine, 'src/moteur/catalogue.js')).href);
  const { scoreGlobal, CURSEURS_DEFAUT } = await import(pathToFileURL(path.resolve(racine, 'src/recherche/score.js')).href);
  return {
    moteur: creerMoteur(CATALOGUE, { filetTemporel: false }),
    global: (a) => scoreGlobal(a, curseurs ? { ...CURSEURS_DEFAUT, ...curseurs } : CURSEURS_DEFAUT) ?? -1,
  };
}

/* ★ CE QUE L'AUTRICE A REJETÉ, nommément, dans les quinze verdicts : l'absorption
   (`mab`), les traductions (`ffr*`), le complément à 9 (`pc9`), un `cmn` qui
   jette, et les voies alambiquées. « Alambiquée » n'a pas de code : on la lit au
   nombre de gestes, au-delà de cinq — c'est ce que les verdicts 9, 12, 14 et 15
   montrent du doigt (trois fragments, deux portées, cinq opérateurs et plus). */
function rejets(codes) {
  const out = [];
  if (/\bmab\b/.test(codes)) out.push('mab');
  // Les DEUX sens de traduction, `ffr*` et `fen*` (`catalogue.js`, « les trois
  // acceptions de chaque sens de traduction ») — pas `fr*`, qui est un César.
  if (/\b(?:ffr|fen)\d*\b/.test(codes)) out.push('traduction');
  if (/\bpc9\b/.test(codes)) out.push('pc9');
  if (/\bcmn\b/.test(codes)) out.push('cmn');
  const gestes = codes.split(/[+,;]/).filter(Boolean).length;
  if (gestes > 5) out.push(`alambiquée (${gestes} gestes)`);
  return out;
}

const avant = await moteurDe(AVANT);
const apres = await moteurDe(APRES);
const options = { fouille, ...(curseurs ? { curseurs } : {}) };

function mesurer(cote, saisie, cible) {
  const t0 = process.cpuUsage();
  const r = cote.moteur.resoudre(saisie, { cible, ...options });
  const dt = process.cpuUsage(t0);
  return { r, ms: (dt.user + dt.system) / 1000 };
}

for (const s of CHAUFFE) {
  avant.moteur.resoudre(s, options);
  apres.moteur.resoudre(s, options);
}

const ligne = (cote, a) => `${a.codes} (moteur ${a.score}, global ${cote.global(a)}`
  + `${a.series ? `, ${a.series} séries` : ''})`;

let totalA = 0;
let totalB = 0;
let listesChangees = 0;
let tetesChangees = 0;
const alertes = [];

console.log(`fenêtre et sièges — cran ${fouille}, curseurs ${JSON.stringify(curseurs || 'défaut')}, `
  + `${COUPLES.length} couples\nAVANT=${AVANT}\nAPRÈS=${APRES}\n`);

for (const [saisie, cible] of COUPLES) {
  const a1 = mesurer(avant, saisie, cible);
  const b1 = mesurer(apres, saisie, cible);
  const b2 = mesurer(apres, saisie, cible);
  const a2 = mesurer(avant, saisie, cible);
  const ta = Math.min(a1.ms, a2.ms);
  const tb = Math.min(b1.ms, b2.ms);
  totalA += ta;
  totalB += tb;

  const la = a1.r.approches;
  const lb = b1.r.approches;
  const ca = la.map((x) => x.codes);
  const cb = lb.map((x) => x.codes);
  const memeListe = ca.join('\n') === cb.join('\n');
  if (!memeListe) listesChangees++;
  const memeTete = ca[0] === cb[0];
  if (!memeTete) tetesChangees++;

  const titre = `« ${saisie} »${cible === '666' ? '' : ` → ${cible}`}`;
  console.log(`${titre} — ${Math.round(ta)} → ${Math.round(tb)} ms CPU`
    + `${memeListe ? ', liste identique' : `, liste CHANGÉE (${ca.length} → ${cb.length} voies)`}`);

  if (!memeTete) {
    console.log(`    TÊTE : ${ligne(avant, la[0])}  →  ${ligne(apres, lb[0])}`);
    const r = rejets(cb[0]);
    if (r.length) {
      const dit = `${titre} : la tête tombe sur ${r.join(' + ')} — ${cb[0]}`;
      alertes.push(dit);
      console.log(`    ⚠️ VOIE REJETÉE PAR L'AUTRICE : ${r.join(' + ')}`);
    }
  }
  if (!memeListe) {
    for (const a of lb) if (!ca.includes(a.codes)) console.log(`    entre : ${ligne(apres, a)}`);
    for (const a of la) if (!cb.includes(a.codes)) console.log(`    sort  : ${ligne(avant, a)}`);
  }

  // ★ La voie que l'autrice cherche sur « hope » : 7 301 au moteur, 704 au
  //   global, et hors de la liste.
  if (saisie === 'hope' && cible === '666') {
    const rangA = ca.indexOf('tca+m14');
    const rangB = cb.indexOf('tca+m14');
    console.log(`    tca+m14 : ${rangA < 0 ? 'absente' : `place ${rangA + 1}`}`
      + `  →  ${rangB < 0 ? 'ABSENTE' : `PLACE ${rangB + 1}`}`);
  }
}

/* ★ **RÉVÉLER**, à part — c'est l'autre temps qui compte, et il ne se mesure pas
     comme la liste : il pose sa propre borne d'assemblage (`pourReveler`,
     `config.js › BORNE_MOISSON_REVELER`) et n'ouvre qu'une voie. Même protocole
     qu'au-dessus : A B B A, on garde le minimum. */
console.log('\n── Révéler (pourReveler), séquentiel ──');
let revelerA = 0;
let revelerB = 0;
for (const [saisie, cible] of COUPLES) {
  const opts = { cible, ...options, pourReveler: true };
  const coup = (cote) => {
    const t0 = process.cpuUsage();
    const r = cote.moteur.resoudre(saisie, opts);
    const dt = process.cpuUsage(t0);
    return { ms: (dt.user + dt.system) / 1000, tete: r.approches[0] ? r.approches[0].codes : '—' };
  };
  const a1 = coup(avant);
  const b1 = coup(apres);
  const b2 = coup(apres);
  const a2 = coup(avant);
  const ta = Math.min(a1.ms, a2.ms);
  const tb = Math.min(b1.ms, b2.ms);
  revelerA += ta;
  revelerB += tb;
  const titre = `« ${saisie} »${cible === '666' ? '' : ` → ${cible}`}`;
  console.log(`${titre} — ${Math.round(ta)} → ${Math.round(tb)} ms CPU`
    + `${a1.tete === b1.tete ? '' : `, voie ouverte : ${a1.tete} → ${b1.tete}`}`);
}
console.log(`Révéler, total : ${Math.round(revelerA)} → ${Math.round(revelerB)} ms CPU `
  + `(${revelerB >= revelerA ? '+' : ''}${Math.round((100 * (revelerB - revelerA)) / revelerA)} %)`);

console.log(`\ntotal : ${Math.round(totalA)} → ${Math.round(totalB)} ms CPU `
  + `(${totalB >= totalA ? '+' : ''}${Math.round((100 * (totalB - totalA)) / totalA)} %)`);
console.log(`listes changées : ${listesChangees} / ${COUPLES.length} ; `
  + `têtes changées : ${tetesChangees} / ${COUPLES.length}`);
if (alertes.length) {
  console.log('\n⚠️⚠️ TÊTES TOMBÉES SUR UNE VOIE REJETÉE :');
  for (const a of alertes) console.log(`  · ${a}`);
} else {
  console.log('\naucune tête ne tombe sur une voie rejetée par l’autrice.');
}
