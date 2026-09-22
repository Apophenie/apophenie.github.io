// .planning/banc/cornes-banc.mjs — le banc de mesure DES CORNES.
//
//   node .planning/banc/cornes-banc.mjs            → le relevé, saisie par saisie
//   node .planning/banc/cornes-banc.mjs --json     → la même chose, comparable
//   node .planning/banc/cornes-banc.mjs --saisie "…" → une seule saisie
//   node .planning/banc/cornes-banc.mjs --url "?…" → un lien, les deux registres
//
// ★ **Pourquoi un banc, et pas un test.** Un test dit « c'est bon » ou « c'est
// rouge » ; il ne dit pas COMBIEN. Le couronnement vient de perdre sa quatrième
// condition (« il doit rester quelque chose à faire après », `scenario.js ›
// couronnerLesTriptyques`), et la seule question qui vaille après un tel retrait
// est chiffrée : combien de paires de cornes en plus, sur quelles voies, et
// est-ce que le CLASSEMENT bouge ?
//
// ★ **Il mesure les DEUX registres, parce que c'est là que le second changement
// se lit.** En sobre, les étapes de couronnement ne sont plus réécrites en
// désignation : elles ne sont pas créées du tout. Le relevé montre donc, pour
// chaque voie, le nombre d'étapes dans les deux registres — l'écart est
// exactement le nombre de couronnements que le scénique porte.
//
// ★ Le filet temporel est NEUTRALISÉ (`filetTemporel: false`) : une mesure qui
// dépend de la charge de la machine n'est pas une mesure. ⚠️ Et ça ne suffit
// pas — voir l'avertissement de `classement.mjs` : lancer ce banc pendant autre
// chose change la liste des voies explorées. Machine au repos, toujours.
//
// **RELEVÉ DU 22 SEPTEMBRE 2026**, après le retrait de la quatrième condition du
// couronnement : 380 voies, 314 à cornes (163 avant), 653 couronnements (325
// avant). Écart d'étapes scénique − sobre : jusqu'à 9, et toujours égal au
// nombre de couronnements. Le classement, lui, est identique à l'octet.

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { lire } from '../../src/recherche/url.js';
import { CORPUS } from './_corpus.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const iSaisie = args.indexOf('--saisie');
const iUrl = args.indexOf('--url');

const moteur = creerMoteur(CATALOGUE, { filetTemporel: false });

// Le titre que `scenario.js › MOTS.couronner` pose sur une étape de
// couronnement. On le recopie plutôt que de l'importer — `MOTS` n'est pas
// exporté, et un banc n'a pas à faire ouvrir une porte dans le module mesuré.
const TITRE_COURONNER = /Trois 6 d’affilée|Three 6s in a row/;

/** Ce qu'une voie porte de cornes, dans un registre donné. */
function releve(approche, saisie, registre) {
  const sc = moteur.scenarioDe(approche, { saisie, registre });
  const rangs = [];
  sc.steps.forEach((s, i) => {
    if ((s.ops || []).some((o) => o.op === 'horns')) rangs.push(i + 1);
  });
  return {
    etapes: sc.steps.length,
    couronnements: rangs.length,
    rangs,
    // Les étapes qui PORTENT le titre du couronnement, quelle que soit leur op :
    // c'est ce qui trahirait une étape sobre réécrite au lieu d'être absente.
    titrees: sc.steps.filter((s) => TITRE_COURONNER.test(s.title || '')).length,
    premier: sc.cornes ? sc.cornes.premier : null,
  };
}

/** Un lien : les deux registres, côte à côte. */
if (iUrl >= 0) {
  const lu = lire(args[iUrl + 1], { catalogue: CATALOGUE });
  if (lu.forme === 'invalide') {
    console.log('URL invalide :', lu.raison);
    process.exit(1);
  }
  const r = moteur.rejouer(lu);
  if (!r.ok) {
    console.log('rejeu impossible :', r.raison);
    process.exit(1);
  }
  console.log(`« ${lu.saisie} » — ${r.approche.codes}`);
  for (const registre of ['scenique', 'sobre']) {
    const x = releve(r.approche, lu.saisie, registre);
    console.log(`  ${registre.padEnd(9)} ${String(x.etapes).padStart(3)} étapes · `
      + `${x.couronnements} couronnement(s) aux rangs ${JSON.stringify(x.rangs)} · `
      + `${x.titrees} étape(s) titrée(s) « couronner »`);
  }
  process.exit(0);
}

const saisies = iSaisie >= 0 ? [args[iSaisie + 1]] : CORPUS;
const sortie = [];
let totalVoies = 0;
let totalCouronnements = 0;
let voiesACornes = 0;
let ecartMax = 0;

for (const s of saisies) {
  const approches = moteur.resoudre(s).approches;
  const lignes = [];
  for (const a of approches) {
    const sce = releve(a, s, 'scenique');
    const so = releve(a, s, 'sobre');
    totalVoies++;
    totalCouronnements += sce.couronnements;
    if (sce.couronnements) voiesACornes++;
    ecartMax = Math.max(ecartMax, sce.etapes - so.etapes);
    lignes.push({
      rang: a.rang,
      codes: a.codes,
      etapesScenique: sce.etapes,
      etapesSobre: so.etapes,
      couronnements: sce.couronnements,
      rangs: sce.rangs,
      titreesSobre: so.titrees,
      premier: sce.premier,
    });
  }
  sortie.push({ saisie: s, voies: lignes });
}

if (json) {
  console.log(JSON.stringify({ sortie, totalVoies, totalCouronnements, voiesACornes, ecartMax }, null, 1));
} else {
  for (const { saisie, voies } of sortie) {
    console.log(`\n══ « ${saisie} » — ${voies.length} voies`);
    for (const v of voies) {
      if (!v.couronnements && v.etapesScenique === v.etapesSobre) continue;
      console.log(`  ${String(v.rang).padStart(3)}. ${v.codes.padEnd(40)} `
        + `sce ${String(v.etapesScenique).padStart(3)} / so ${String(v.etapesSobre).padStart(3)} `
        + `· ${v.couronnements} corne(s) aux rangs ${JSON.stringify(v.rangs)}`
        + (v.titreesSobre ? ` ⚠ ${v.titreesSobre} étape(s) « couronner » en SOBRE` : ''));
    }
  }
  console.log(`\n${totalVoies} voies, ${voiesACornes} à cornes, `
    + `${totalCouronnements} couronnements ; écart d'étapes sce−so maximal : ${ecartMax}`);
}
