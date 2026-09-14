/**
 * Le banc de la recherche PROGRESSIVE — combien de temps jusqu'à la première
 * voie de « Révéler », et quand chaque étape dispose de voies présentables.
 *
 * Usage : node .planning/banc/progressif-banc.mjs [racine] [reveler|texte|moins1|tout]
 *
 * Il ne change RIEN au moteur : il pousse `resoudre` tel que le site le pousse
 * (filet temporel branché, cran 0), date chaque changement de phase rapporté
 * par `surAvancement`, et relance sur un moteur NEUF — aucun cache partagé —
 * les variantes de mesure que `creerMoteur` accepte déjà
 * (`voiesAvantDeCreuser: 0` coupe la passe profonde, `budgetTravailTotal`,
 * `maxTravail`, `retouches: false`). À lancer seul, machine libre.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const racine = resolve(process.argv[2] || '.');
const quoi = process.argv[3] || 'tout';
const imp = (p) => import(pathToFileURL(resolve(racine, p)).href);
const M = await imp('src/recherche/index.js');
const S = await imp('src/recherche/score.js');
const B = await imp('src/recherche/bfs.js');
const { catalogue } = await imp('src/recherche/tests/_catalogue.js');

const ms = (x) => `${(x / 1000).toFixed(1)} s`;
const programme = (a) => a.url.split('#')[1].replace(/(^|!)f\d+!/, '$1');

/** Une recherche datée : les changements de phase, la fin, et la liste. */
function mesurer(saisie, optionsMoteur = {}, optionsRecherche = {}) {
  const t0c = performance.now();
  const m = M.creerMoteur(catalogue, optionsMoteur);
  const creation = performance.now() - t0c;
  const jalons = [];
  let phase = null;
  const t0 = performance.now();
  const r = m.resoudre(saisie, {
    ...optionsRecherche,
    surAvancement: (a) => {
      if (a.phase !== phase) { phase = a.phase; jalons.push([performance.now() - t0, a.phase]); }
    },
  });
  const total = performance.now() - t0;
  return { r, total, creation, jalons };
}

/** Lecture des jalons d'une cible CHIFFRÉE : fragments → assemblage → classement [→ assemblage profond → classement]. */
function etapesChiffrees(jalons, total) {
  const debutAssemblage = jalons.find(([, p]) => p === 'assemblage');
  const classements = jalons.filter(([, p]) => p === 'classement');
  const profonde = classements.length >= 2;
  return {
    fragments: debutAssemblage ? debutAssemblage[0] : total,
    assemblage1: classements[0] ? classements[0][0] : total,
    profonde,
    finProfonde: profonde ? classements[1][0] : null,
    total,
  };
}

const premiere = (r) => {
  const a = (r.approches || [])[0];
  if (!a) return null;
  return {
    score: a.score, rang: S.rangConviction(a), mode: a.mode, series: a.series || 1,
    elegance: a.elegance, codes: a.codes, suggestion: a.suggestion, joker: !!a.joker,
  };
};
const NOMS_RANG = ['SÉRIES', 'SIMPLE', 'CONVERGENCE'];
const decrire = (p) => (p ? `${String(p.score).padStart(5)} ${NOMS_RANG[p.rang].padEnd(11)} ${p.mode.padEnd(12)} ×${p.series} ${p.joker ? 'JOKER ' : ''}${String(p.codes).slice(0, 48)}` : '(aucune)');

/* ═══════════════════════════ 1. RÉVÉLER — 666, cran 0 ═══════════════════ */

const REVELER = [
  // les quatre cas de référence de l'auteur (`_corpus.js › REFERENCES`)
  'hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Donald Trump', 'Macron',
  // les couples 666 du balayage de monotonie
  'Jim', 'Sarah Kerrigan', 'Wok', 'zz',
  // noms courts
  'hope', 'Millicent', 'satan', 'Bill Gates', 'Marie Curie', 'Emmanuel Macron', 'Millicent Billette', 'Q', '2024',
  // phrases
  'Nombre de la bête', 'Éléonore à Nîmes', 'Joyeux anniversaire Maman', 'Le chat dort sur le tapis rouge',
  'Reinfocovid, désinformation garantie', 'La numérologie est une science exacte, disent-ils',
  // URL
  'https://www.google.com', 'https://reinfocovid.fr/', 'https://www.example.com/path/to/page',
  'https://www.lemonde.fr/politique/article/2024/06/10/dissolution-assemblee-nationale_6238.html',
  // saisies longues
  'Le gouvernement a annoncé ce matin une nouvelle réforme des retraites qui entrera en vigueur dès janvier prochain',
];

const listesDuCran0 = new Map();

function banReveler() {
  console.log('\n═══ RÉVÉLER — cible 666, cran 0, filet temporel branché, moteur neuf par saisie ═══');
  console.log('saisie'.padEnd(44), 'créa.', 'fragm.', 'assem.', 'prof.', 'TOTAL', 'voies', '| 1ʳᵉ voie (score rang mode séries codes)');
  for (const saisie of REVELER) {
    const { r, total, creation, jalons } = mesurer(saisie);
    const e = etapesChiffrees(jalons, total);
    listesDuCran0.set(saisie, r.approches.map(programme));
    const p = premiere(r);
    console.log(
      saisie.slice(0, 43).padEnd(44), ms(creation).padStart(5), ms(e.fragments).padStart(6), ms(e.assemblage1).padStart(6),
      (e.profonde ? ms(e.finProfonde) : '—').padStart(6), ms(total).padStart(6), String(r.approches.length).padStart(3),
      r.tronqueTemps ? 'FILET' : (r.tronque ? 'tronq' : '     '), '|', decrire(p),
    );
    if (e.profonde) {
      // La première passe seule, sur un moteur neuf : ce qu'on aurait eu sans creuser.
      const seule = mesurer(saisie, { voiesAvantDeCreuser: 0 });
      const q = premiere(seule.r);
      const meme = q && p && q.codes === p.codes;
      console.log(''.padEnd(44), '  └ sans passe profonde :', ms(seule.total), `${seule.r.approches.length} voies`,
        meme ? '— même 1ʳᵉ voie' : `— 1ʳᵉ voie ${decrire(q)}`);
    }
  }
}

/* ══════════════════ 2. ÉNUMÉRATION — cibles texte, cran 0 ════════════════ */

const TEXTES = [
  ['https://reinfocovid.fr/', "C'est de la merde !"],
  ['Reinfocovid, désinformation garantie', "C'est de la merde !"],
  ['https://reinfocovid.fr/', 'merde'],
  ['Sarah Kerrigan', 'Zerg'],
];

function banTexte() {
  console.log('\n═══ ÉNUMÉRATION — cibles texte, cran 0 ═══');
  for (const [saisie, cible] of TEXTES) {
    const { r, total, jalons } = mesurer(saisie, {}, { cible });
    // Une sous-recherche finit à chaque « classement » suivi d'un nouveau départ.
    const fins = [];
    for (let i = 0; i < jalons.length; i++) {
      if (jalons[i][1] === 'classement' && (!jalons[i + 1] || jalons[i + 1][1] === 'fragments')) fins.push(jalons[i][0]);
    }
    const rel = (r.relectures || []).map((x) => `${x.code}:${x.segments ? `${x.segments.length}seg${x.horsDuCran ? '(hors cran)' : ''}` : 'bloc'}=${x.voies}${x.voiesDuBloc !== undefined ? `+bloc${x.voiesDuBloc}` : ''}`).join(' ');
    console.log(`── ${saisie} → ${cible} : ${ms(total)}, ${r.approches.length} voies, 1ʳᵉ ${decrire(premiere(r))}`);
    console.log(`   relectures : ${rel}`);
    console.log(`   fins de sous-recherche (${fins.length}) : ${fins.map(ms).join(' · ')}`);
    const seule = mesurer(saisie, { voiesAvantDeCreuser: 0 }, { cible });
    console.log(`   premier balayage seul (sans passe profonde) : ${ms(seule.total)}, ${seule.r.approches.length} voies, 1ʳᵉ ${decrire(premiere(seule.r))}`);
    const finale = r.approches.map(programme);
    const inclus = seule.r.approches.filter((a) => finale.includes(programme(a))).length;
    console.log(`   dont dans la liste finale : ${inclus}/${seule.r.approches.length}`);
  }
  // La montée cumulative sur une liste chiffrée : quand chaque cran est prêt.
  console.log('\n── montée cumulative, liste 666 (quand la liste de chaque cran est prête)');
  for (const saisie of ['Sarah Kerrigan', 'Donald Trump', 'Le chat dort sur le tapis rouge']) {
    const m = M.creerMoteur(catalogue);
    const t0 = performance.now();
    const lignes = [];
    for (let f = 0; f <= 3; f++) {
      const r = m.resoudre(saisie, { fouille: f });
      lignes.push(`cran ${f} à ${ms(performance.now() - t0)} (${r.approches.length} voies)`);
    }
    console.log(`   ${saisie} : ${lignes.join(' · ')}`);
  }
}

/* ══════════════ 3. PISTES POUR UN CRAN −1 — budgets de travail ══════════ */

const PISTES = [
  ['sans passe profonde', { voiesAvantDeCreuser: 0 }],
  ['sans profonde ni retouches', { voiesAvantDeCreuser: 0, retouches: false }],
  ['sans profonde, travail ÷4', {
    voiesAvantDeCreuser: 0, budgetTravailTotal: B.BUDGET_TRAVAIL_TOTAL / 4, maxTravail: B.BUDGET_TRAVAIL / 4,
  }],
  ['sans profonde ni retouches, travail ÷4', {
    voiesAvantDeCreuser: 0, retouches: false, budgetTravailTotal: B.BUDGET_TRAVAIL_TOTAL / 4, maxTravail: B.BUDGET_TRAVAIL / 4,
  }],
  ['sans profonde ni retouches, travail ÷16', {
    voiesAvantDeCreuser: 0, retouches: false, budgetTravailTotal: B.BUDGET_TRAVAIL_TOTAL / 16, maxTravail: B.BUDGET_TRAVAIL / 16,
  }],
];
const ECHANTILLON = [
  'Macron', 'Donald Trump', 'hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Sarah Kerrigan',
  'Le chat dort sur le tapis rouge', 'Reinfocovid, désinformation garantie',
  'Le gouvernement a annoncé ce matin une nouvelle réforme des retraites qui entrera en vigueur dès janvier prochain',
];

function banMoins1() {
  console.log('\n═══ PISTES CRAN −1 — 666, moteur neuf par mesure ═══');
  for (const saisie of ECHANTILLON) {
    let cran0 = listesDuCran0.get(saisie);
    let p0 = null;
    if (!cran0) {
      const { r, total } = mesurer(saisie);
      cran0 = r.approches.map(programme);
      listesDuCran0.set(saisie, cran0);
      p0 = premiere(r);
      console.log(`── ${saisie} — cran 0 : ${ms(total)}, ${cran0.length} voies, 1ʳᵉ ${decrire(p0)}`);
    } else console.log(`── ${saisie} — cran 0 : ${cran0.length} voies (mesuré plus haut)`);
    for (const [nom, opts] of PISTES) {
      const { r, total } = mesurer(saisie, opts);
      const liste = r.approches.map(programme);
      const inclus = liste.filter((x) => cran0.includes(x)).length;
      console.log(`   ${nom.padEnd(40)} ${ms(total).padStart(6)} ${String(liste.length).padStart(3)} voies, ${inclus}/${liste.length} dans le cran 0 | ${decrire(premiere(r))}`);
    }
  }
}

/* ═════════════ 1 bis. RÉVÉLER SOUS SA BORNE — avant / après ═══════════════ */

function banRevelerBorne() {
  console.log('\n═══ RÉVÉLER SOUS SA BORNE — `pourReveler`, contre la liste sans borne ═══');
  for (const saisie of REVELER) {
    const libre = mesurer(saisie);
    const borne = mesurer(saisie, {}, { pourReveler: true });
    const a = premiere(libre.r);
    const b = premiere(borne.r);
    const meme = a && b && a.codes === b.codes;
    console.log(saisie.slice(0, 43).padEnd(44), ms(libre.total).padStart(6), '→', ms(borne.total).padStart(6),
      meme ? '| même 1ʳᵉ voie' : `| 1ʳᵉ voie CHANGE : ${decrire(a)}  →  ${decrire(b)}`);
  }
}

if (quoi === 'reveler' || quoi === 'tout') banReveler();
if (quoi === 'reveler-borne') banRevelerBorne();
if (quoi === 'texte' || quoi === 'tout') banTexte();
if (quoi === 'moins1' || quoi === 'tout') banMoins1();
