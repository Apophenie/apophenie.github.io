// .planning/banc/cesar-justifie-banc.mjs — ce que les césars justifiés lisent,
// et ce qu'ils changent au classement.
//
//   node .planning/banc/cesar-justifie-banc.mjs            → la lecture, saisie par saisie
//   node .planning/banc/cesar-justifie-banc.mjs --classement → les listes, avant / après
//   node .planning/banc/cesar-justifie-banc.mjs --jumeau   → la preuve de l'éviction
//   …--classement --fouille 10                             → à la profondeur qui compte
//
// ★ `--jumeau` est la mesure qui explique tout le reste, et c'est la seule qui
//   compte si l'on ne doit en lire qu'une. Le césar justifié rend EXACTEMENT ce
//   que rend son aîné : mêmes lettres, mêmes nombres, même verdict. Le moteur
//   ne garde qu'un chemin par résultat et rencontre toujours l'aîné d'abord —
//   l'ordre d'exploration est celui du registre (§4.4 règle 3), et l'append-only
//   inscrit les codes neufs à la fin. Retirer le seul `fr22` suffit donc à faire
//   apparaître des voies `fj22` qui n'existaient nulle part : ce n'est pas le
//   classement qui les refuse, c'est la recherche qui ne les propose pas.
//
// ★ « Avant » n'est pas un souvenir : c'est le même moteur avec les quatorze
//   opérateurs RETIRÉS du catalogue. La comparaison se refait donc à tout
//   moment, et elle ne peut pas se périmer.

import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { lectureDesCommuns } from '../../src/moteur/transformations/filtres.js';
import { creerMoteur } from '../../src/recherche/index.js';
import { CORPUS } from './_corpus.js';

const args = process.argv.slice(2);
const SAISIES = [...CORPUS, 'Louis Fouché', 'Didier Raoult', 'Sarah Kerrigan', 'Henri Prunelle'];
const estJustifie = (op) => String(op.code).startsWith('fj');

if (!args.includes('--classement') && !args.includes('--jumeau')) {
  for (const s of SAISIES) {
    const lu = lectureDesCommuns(s);
    console.log(
      (lu ? `fj${lu.decalage}` : '—').padEnd(6),
      JSON.stringify(s).padEnd(40),
      lu ? `communs ${lu.communs.join('')} · comptes ${lu.comptes.join(' ')}` : 'aucune lecture',
    );
  }
  process.exit(0);
}

if (args.includes('--jumeau')) {
  const { operateursPourCible } = await import('../../src/recherche/bfs.js');
  const { vecteursDeSix } = await import('../../src/recherche/assemblage.js');
  for (const [saisie, aine] of [['Louis Fouché', 'fr22'], ['Didier Raoult', 'fr11']]) {
    for (const retire of [[], [aine]]) {
      const cat = CATALOGUE.filter((o) => !retire.includes(o.code));
      const ops = operateursPourCible(cat, { defaut: true, texte: '666' });
      const v = vecteursDeSix(saisie, ops, 1, 1e6, '666', { miseEnForme: false, tousLesReglages: true });
      const codes = v.map((c) => c.ops.map((o) => o.code).join('+'));
      const fj = codes.filter((c) => c.includes('fj'));
      console.log(`${saisie.padEnd(15)} ${retire.length ? `sans ${aine}` : 'catalogue entier'}`
        .padEnd(34) + `| ${v.length} vecteurs | ${fj.length} à césar justifié  ${fj.slice(0, 3).join('  ')}`);
    }
  }
  process.exit(0);
}

const moteur = (ops) => creerMoteur(ops, { filetTemporel: false });
// ⚠️ L'option s'appelle `fouille`, PAS `cran` — c'est le marqueur `f3!` de
//    l'URL. Passer `{ cran }` est accepté en silence et ne règle RIEN : toutes
//    les profondeurs rendent alors la même liste, ce qui m'a fait conclure trop
//    vite que le césar justifié n'apparaissait à aucune profondeur. Il apparaît
//    à `fouille: 10`, sous les leviers (b)+(c). La leçon vaut pour tout le banc.
const listes = (ops, saisie, fouille) => {
  const r = moteur(ops).resoudre(saisie, { fouille });
  return (r.approches || []).map((a) => a.url || (a.fragments || []).map(
    (f) => (f.chemin.ops || []).map((o) => o.code).join('+'),
  ).join(','));
};

const CRAN = Number(args[args.indexOf('--fouille') + 1]) || 0;
const sansEux = CATALOGUE.filter((op) => !estJustifie(op));
let listesChangees = 0;
let tetesChangees = 0;
let sorties = 0;

for (const s of SAISIES) {
  let avant; let apres;
  try {
    avant = listes(sansEux, s, CRAN);
    apres = listes(CATALOGUE, s, CRAN);
  } catch (e) { console.log(`!! ${s} : ${e.message}`); continue; }
  const memeListe = avant.join('|') === apres.join('|');
  if (!memeListe) listesChangees++;
  if (avant[0] !== apres[0]) tetesChangees++;
  const parties = avant.filter((v) => !apres.includes(v));
  const entrees = apres.filter((v) => !avant.includes(v));
  if (parties.length && !entrees.length) sorties++;
  if (!memeListe) {
    console.log(`\n── ${s} (cran ${CRAN})`);
    console.log(`   tête avant : ${avant[0] || '(aucune)'}`);
    console.log(`   tête après : ${apres[0] || '(aucune)'}`);
    for (const v of entrees) console.log(`   + ${v}`);
    for (const v of parties) console.log(`   − ${v}`);
  }
}
console.log(`\n${SAISIES.length} saisies · ${listesChangees} listes changées · `
  + `${tetesChangees} têtes changées · ${sorties} sorties sèches`);
