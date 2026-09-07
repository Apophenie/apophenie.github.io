// .planning/banc/score-v2-agent.mjs — le banc du score v2 à quatre axes.
//
//   node .planning/banc/score-v2-agent.mjs                  → la mesure complète
//   node .planning/banc/score-v2-agent.mjs --cache /tmp/x.json
//        → relit le corpus noté s'il existe, sinon le résout et l'écrit là
//   node .planning/banc/score-v2-agent.mjs --pas 20         → balayage plus grossier
//   node .planning/banc/score-v2-agent.mjs --sans-balayage  → seulement REGIMES
//   node .planning/banc/score-v2-agent.mjs --detail         → les axes de chaque voie
//   node .planning/banc/score-v2-agent.mjs --saisie "…"     → une seule saisie
//   node .planning/banc/score-v2-agent.mjs --curseurs mixte:20,40,200,60 --curseurs elegance:…
//        → mesure aussi ces jeux-là (simplicité, exhaustivité, quantité, cohérence)
//   node .planning/banc/score-v2-agent.mjs --module /tmp/variante.js
//        → mesure une copie du module aux réglages différents
//
// Ce que le banc compare, pour chaque régime :
//   (a) les têtes conservées — 1ʳᵉ place = `suggestion === 'elegance'`,
//       2ᵈ = `'triptyques'`, liste mixte = la 1ʳᵉ ligne hors podium ;
//   (b) le taux de paires concordantes entre le global v2 et, d'une part,
//       `a.score`, d'autre part l'ORDRE de référence du régime (le comparateur
//       du moteur : `ordreElegance`, `ordreTriptyques`, ou l'ordre affiché hors
//       podium pour le mixte) ;
//   (c) le nombre de lignes déplacées d'au moins trois places dans les douze
//       premières (hors podium) ;
//   (d) les têtes qui changent, avec les deux voies, leurs axes et leur global.
//
// Le filet temporel est débranché, comme dans `classement.mjs` : une mesure
// sur une base qui bouge sous la charge ne se compare à rien.

import fs from 'node:fs';
import { creerMoteur } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { ordreElegance, ordreTriptyques } from '../../src/recherche/score.js';
// ★ `--module <chemin>` charge une VARIANTE du module (une copie avec d'autres
//   réglages) : c'est ce qui permet de mesurer un réglage contre un autre sans
//   toucher au fichier de référence.
const iModule = process.argv.indexOf('--module');
const { AXES, axesDe, globalDe, REGIMES, REGLAGES, CURSEUR_MAX } = await import(
  iModule >= 0 ? process.argv[iModule + 1] : '../../src/recherche/score-v2-agent.js',
);

const CORPUS = [
  'Millicent Billette', 'https://hope-hope-hope.fr/', 'hope-hope-hope.fr', 'Capitalisme',
  'Le chat dort sur le tapis rouge', 'La numérologie est une science exacte, disent-ils',
  'Donald Trump', 'Henri Prunelle', 'numherololgeek.1000i100.fr', 'hope', 'macron', 'Wikipedia',
  'https://www.example.com/path/to/page', 'jean-michel', 'Éléonore à Nîmes', 'Sarah Kerrigan',
];

const args = process.argv.slice(2);
const opt = (nom) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : null; };
const cache = opt('--cache');
const pas = Number(opt('--pas') || 10);
const detail = args.includes('--detail');
const sansBalayage = args.includes('--sans-balayage');
const saisies = opt('--saisie') ? [opt('--saisie')] : CORPUS;
/** Les plafonds du balayage : `--plafond regime:axe:valeur`, répétable — pour chercher « dans l'esprit ». */
const plafonds = { mixte: {}, elegance: {}, abondance: {} };
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--plafond') continue;
  const [regime, axe, valeur] = String(args[i + 1] || '').split(':');
  if (plafonds[regime] && AXES.includes(axe)) plafonds[regime][axe] = Number(valeur);
}
/** Les jeux de curseurs demandés à la main : `--curseurs regime:s,e,q,c`, répétable. */
const candidats = { mixte: [], elegance: [], abondance: [] };
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--curseurs') continue;
  const [regime, valeurs] = String(args[i + 1] || '').split(':');
  const [s, e, q, c] = String(valeurs || '').split(',').map(Number);
  if (candidats[regime]) candidats[regime].push({ simplicite: s, exhaustivite: e, quantite: q, coherence: c });
}

// ── 1. le corpus noté par le moteur ACTUEL ───────────────────────────────────

/** Ce qu'on garde d'une approche : de quoi calculer les axes ET rejouer les comparateurs. */
const reduire = (a) => ({
  mode: a.mode, series: a.series, resonance: !!a.resonance, decret: !!a.decret, pur: !!a.pur,
  score: a.score, rang: a.rang, suggestion: a.suggestion || 'mixte', codes: a.codes, L: a.L,
  criteres: a.criteres, elegance: a.elegance, elegances: a.elegances, bilan: a.bilan,
  parts: (a.parts || []).map((p) => ({
    fragment: { texte: p.fragment && p.fragment.texte },
    chemin: { ops: ((p.chemin && p.chemin.ops) || []).map((o) => ({ code: o.code, isJoker: !!o.isJoker, adHoc: o.adHoc, notoriete: o.notoriete, famille: o.famille })) },
  })),
});

function resoudreCorpus() {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const out = [];
  for (const s of saisies) {
    const t0 = Date.now();
    const r = moteur.resoudre(s);
    out.push({ saisie: s, approches: r.approches.filter((a) => a.mode !== 'JOKER').map(reduire) });
    console.error(`  ${s} — ${r.approches.length} voies, ${Date.now() - t0} ms`);
  }
  return out;
}

let corpus;
if (cache && fs.existsSync(cache)) {
  corpus = JSON.parse(fs.readFileSync(cache, 'utf8')).filter((b) => saisies.includes(b.saisie));
} else {
  console.error('Résolution du corpus…');
  corpus = resoudreCorpus();
  if (cache) fs.writeFileSync(cache, JSON.stringify(corpus));
}

// ── 2. les axes, et les références ───────────────────────────────────────────

for (const bloc of corpus) {
  for (const a of bloc.approches) a.axes = axesDe(a);
  const tous = bloc.approches;
  bloc.teteElegance = tous.find((a) => a.suggestion === 'elegance') || null;
  bloc.teteTriptyques = tous.find((a) => a.suggestion === 'triptyques') || null;
  bloc.horsPodium = tous.filter((a) => a.suggestion === 'mixte');
  bloc.teteMixte = bloc.horsPodium[0] || null;
  bloc.refs = {
    elegance: tous.slice().sort(ordreElegance),
    abondance: tous.slice().sort(ordreTriptyques),
    mixte: bloc.horsPodium.slice(),
  };
}

// ── 3. l'ordre v2 d'une liste sous des curseurs ──────────────────────────────

const comparerCodes = (a, b) => (a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0);

function ordonner(voies, curseurs) {
  const notees = voies.map((a) => ({ a, g: globalDe(a.axes, curseurs) }));
  // Global DESC ; à égalité stricte seulement, L ASC puis codes ASC (déterminisme).
  notees.sort((x, y) => y.g - x.g || x.a.L - y.a.L || comparerCodes(x.a, y.a));
  return notees;
}

/** Taux de paires concordantes entre l'ordre v2 (globaux) et un ordre de référence. */
function concordance(reference, curseurs, cle = null) {
  let conc = 0; let disc = 0; let ties = 0;
  const g = reference.map((a) => (cle ? a[cle] : globalDe(a.axes, curseurs)));
  for (let i = 0; i < reference.length; i++) {
    for (let j = i + 1; j < reference.length; j++) {
      if (g[i] > g[j]) conc++; else if (g[i] < g[j]) disc++; else ties++;
    }
  }
  return { conc, disc, ties, paires: conc + disc + ties };
}

/** Paires concordantes entre le global v2 et `a.score`, sur toutes les voies. */
function concordanceScore(voies, curseurs) {
  let conc = 0; let disc = 0; let ties = 0;
  const g = voies.map((a) => globalDe(a.axes, curseurs));
  for (let i = 0; i < voies.length; i++) {
    for (let j = i + 1; j < voies.length; j++) {
      const ds = Math.sign(voies[i].score - voies[j].score);
      const dg = Math.sign(g[i] - g[j]);
      if (ds === 0 || dg === 0) ties++; else if (ds === dg) conc++; else disc++;
    }
  }
  return { conc, disc, ties, paires: conc + disc + ties };
}

/** Lignes des douze premières (référence) déplacées d'au moins trois places dans l'ordre v2. */
function deplacees(reference, curseurs, seuil = 3, fenetre = 12) {
  const ordre = ordonner(reference, curseurs).map((x) => x.a);
  let n = 0;
  for (let i = 0; i < Math.min(fenetre, reference.length); i++) {
    const j = ordre.indexOf(reference[i]);
    if (Math.abs(i - j) >= seuil) n++;
  }
  return n;
}

// ── 4. la mesure d'un régime sous des curseurs ───────────────────────────────

function mesurer(regime, curseurs) {
  const m = { regime, curseurs, tetes: 0, saisies: 0, changees: [], conc: 0, paires: 0, concScore: 0, pairesScore: 0, deplacees: 0, maxSeries: 0, sansCible: 0 };
  for (const bloc of corpus) {
    const ref = bloc.refs[regime];
    const cible = regime === 'elegance' ? bloc.teteElegance : regime === 'abondance' ? bloc.teteTriptyques : bloc.teteMixte;
    const bassin = regime === 'mixte' ? bloc.horsPodium : bloc.approches;
    const tete = ordonner(bassin, curseurs)[0];
    if (cible) {
      m.saisies++;
      if (tete && tete.a === cible) m.tetes++;
      else m.changees.push({ saisie: bloc.saisie, avant: cible, apres: tete && tete.a, curseurs });
    } else if (regime === 'abondance') {
      // Pas de 2ᵈ place dans la liste actuelle : on regarde si la tête v2 porte
      // le compte maximal, ce que cette place aurait exigé.
      m.sansCible++;
      const max = Math.max(...bassin.map((a) => a.series || 1));
      if (tete && (tete.a.series || 1) === max) m.maxSeries++;
    }
    const c = concordance(ref, curseurs);
    m.conc += c.conc + c.ties / 2; m.paires += c.paires;
    const cs = concordanceScore(bassin, curseurs);
    m.concScore += cs.conc + cs.ties / 2; m.pairesScore += cs.paires;
    m.deplacees += deplacees(ref, curseurs);
  }
  return m;
}

/** L'objectif du balayage : têtes d'abord, puis concordance avec la référence, puis lignes déplacées. */
const merite = (m) => [m.tetes + (m.regime === 'abondance' ? m.maxSeries / 100 : 0), m.conc / Math.max(1, m.paires), -m.deplacees];
const meilleur = (x, y) => {
  const a = merite(x); const b = merite(y);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? x : y;
  return x;
};

// ── 5. le balayage ───────────────────────────────────────────────────────────

function balayer(regime) {
  const crans = [];
  for (let v = 0; v <= CURSEUR_MAX; v += pas) crans.push(v);
  let best = null;
  let n = 0;
  // Seuls les RAPPORTS comptent : on impose que le curseur le plus haut soit à
  // 200, ce qui divise le balayage par ~4 sans perdre une seule direction.
  const P = plafonds[regime];
  const admis = (axe, v) => P[axe] === undefined || v <= P[axe];
  for (const s of crans) for (const e of crans) for (const q of crans) for (const c of crans) {
    if (Math.max(s, e, q, c) !== CURSEUR_MAX) continue;
    if (!admis('simplicite', s) || !admis('exhaustivite', e) || !admis('quantite', q) || !admis('coherence', c)) continue;
    n++;
    const m = mesurer(regime, { simplicite: s, exhaustivite: e, quantite: q, coherence: c });
    best = best ? meilleur(best, m) : m;
  }
  console.error(`  ${regime} : ${n} positions balayées${Object.keys(P).length ? ` (plafonds ${JSON.stringify(P)})` : ''}`);
  return best;
}

// ── 6. l'affichage ───────────────────────────────────────────────────────────

const pc = (num, den) => (den ? `${(100 * num / den).toFixed(1)} %` : '—');
const fmtCurseurs = (c) => AXES.map((x) => `${x.slice(0, 4)}=${String(c[x]).padStart(3)}`).join(' ');
const fmtAxes = (a) => AXES.map((x) => `${x.slice(0, 4)}=${String(a.axes[x]).padStart(4)}`).join(' ');
const ligne = (a, curseurs) => `${String(globalDe(a.axes, curseurs)).padStart(4)} | ${fmtAxes(a)} | s=${a.series || 1} L=${a.L} ${a.mode} score=${a.score} ${a.codes}`;

function afficher(m) {
  console.log(`\n── ${m.regime}  [${fmtCurseurs(m.curseurs)}]`);
  console.log(`   (a) têtes conservées : ${m.tetes} / ${m.saisies}`
    + (m.regime === 'abondance' ? `  — et, sans 2ᵈ place actuelle, tête v2 au compte maximal : ${m.maxSeries} / ${m.sansCible}` : ''));
  console.log(`   (b) paires concordantes avec l'ordre de référence : ${pc(m.conc, m.paires)}  (${m.paires} paires)`);
  console.log(`       paires concordantes avec a.score              : ${pc(m.concScore, m.pairesScore)}  (${m.pairesScore} paires)`);
  console.log(`   (c) lignes déplacées d'au moins 3 places (12 premières) : ${m.deplacees}`);
  if (m.changees.length) {
    console.log(`   (d) têtes qui changent :`);
    for (const ch of m.changees) {
      console.log(`       ${ch.saisie}`);
      console.log(`         avant ${ligne(ch.avant, ch.curseurs)}`);
      console.log(`         après ${ch.apres ? ligne(ch.apres, ch.curseurs) : '—'}`);
    }
  }
}

if (detail) {
  for (const bloc of corpus) {
    console.log(`\n═══ ${bloc.saisie}`);
    for (const a of bloc.approches) {
      console.log(`${String(a.rang).padStart(2)}. [${a.suggestion.padEnd(10)}] ${fmtAxes(a)} | mixte=${globalDe(a.axes, REGIMES.mixte)} eleg=${globalDe(a.axes, REGIMES.elegance)} abond=${globalDe(a.axes, REGIMES.abondance)} | s=${a.series || 1} L=${a.L} ${a.mode} score=${a.score} ${a.codes}`);
    }
  }
}

console.log(`\nRÉGLAGES : ${JSON.stringify(REGLAGES)}`);
console.log(`Corpus : ${corpus.length} saisies, ${corpus.reduce((n, b) => n + b.approches.length, 0)} voies.`);

for (const regime of ['mixte', 'elegance', 'abondance']) {
  console.log(`\n═══════════════ ${regime.toUpperCase()}`);
  if (!sansBalayage) {
    console.error(`Balayage ${regime} (pas ${pas})…`);
    const best = balayer(regime);
    console.log(`\n▶ meilleur du balayage`);
    afficher(best);
  }
  console.log(`\n▶ jeu rond (REGIMES.${regime})`);
  afficher(mesurer(regime, REGIMES[regime]));
  for (const c of candidats[regime]) {
    console.log(`\n▶ candidat`);
    afficher(mesurer(regime, c));
  }
}
