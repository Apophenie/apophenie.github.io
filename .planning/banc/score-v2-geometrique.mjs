// .planning/banc/score-v2-geometrique.mjs — le banc du score v2 « moyenne
// géométrique pondérée » (`src/recherche/score-v2-geometrique.js`).
//
//   node .planning/banc/score-v2-geometrique.mjs                → les trois régimes, deux moyennes
//   node .planning/banc/score-v2-geometrique.mjs --balayage     → et le balayage des curseurs
//   node .planning/banc/score-v2-geometrique.mjs --detail       → et les axes de chaque voie
//   node .planning/banc/score-v2-geometrique.mjs --cache f.json → rejoue depuis un cache
//   node .planning/banc/score-v2-geometrique.mjs --ecrire-cache f.json → résout puis écrit le cache
//   node .planning/banc/score-v2-geometrique.mjs --reglages '{"COMPTE_EN_RACINE":false}'
//                                                              → une variante des réglages
//   node .planning/banc/score-v2-geometrique.mjs --balayage --crans 50 → un balayage plus grossier
//   node .planning/banc/score-v2-geometrique.mjs --essai mixte 25,75,200,25 --essai elegance 0,200,50,100
//                                                              → des jeux de curseurs candidats
//
// Il ne modifie rien : il LIT les approches notées par le moteur actuel et les
// renote avec les quatre axes de la piste, puis compare — arithmétique CONTRE
// géométrique, sur les mêmes axes et les mêmes curseurs.
//
// ★ Le filet temporel est neutralisé (`filetTemporel: false`), comme dans les
//   autres bancs : on ne compare pas deux barèmes sur une base qui bouge.

import { readFileSync, writeFileSync } from 'node:fs';
import { creerMoteur } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { ordreTotal, ordreElegance, ordreTriptyques } from '../../src/recherche/score.js';
import {
  AXES, axesDe, globalDe, globalArithmetique, partsDe, REGIMES, REGLAGES,
} from '../../src/recherche/score-v2-geometrique.js';

export const CORPUS = [
  'Millicent Billette', 'https://hope-hope-hope.fr/', 'hope-hope-hope.fr', 'Capitalisme',
  'Le chat dort sur le tapis rouge', 'La numérologie est une science exacte, disent-ils',
  'Donald Trump', 'Henri Prunelle', 'numherololgeek.1000i100.fr', 'hope', 'macron', 'Wikipedia',
  'https://www.example.com/path/to/page', 'jean-michel', 'Éléonore à Nîmes', 'Sarah Kerrigan',
];

const args = process.argv.slice(2);
const option = (nom) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : null; };
const detail = args.includes('--detail');
const balayage = args.includes('--balayage');
const pas = Number(option('--crans') || 25);

// ── une variante des réglages, fusionnée AVANT la première notation ─────────
// Même pratique que `classement.mjs --sans-triches` : on règle le seul endroit
// à régler, et rien d'autre ne change — l'écart observé ne peut venir que de là.
const variante = option('--reglages');
if (variante) {
  const fusionner = (cible, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && cible[k] && typeof cible[k] === 'object') fusionner(cible[k], v);
      else cible[k] = v;
    }
  };
  fusionner(REGLAGES, JSON.parse(variante));
  console.log(`réglages : ${variante}`);
}

// ── la matière : en direct, ou depuis un cache ──────────────────────────────
function resoudreCorpus() {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  return CORPUS.map((saisie) => {
    const r = moteur.resoudre(saisie);
    return {
      saisie,
      approches: r.approches.map((a) => ({
        rang: a.rang, score: a.score, suggestion: a.suggestion, mode: a.mode, series: a.series,
        L: a.L, codes: a.codes, criteres: a.criteres, bilan: a.bilan, resonance: a.resonance,
        decret: a.decret, pur: a.pur, elegance: a.elegance, elegances: a.elegances,
        parts: a.parts.map((p) => ({
          fragment: { texte: p.fragment && p.fragment.texte },
          chemin: { ops: p.chemin.ops.map((o) => ({ code: o.code, isJoker: !!o.isJoker })) },
        })),
      })),
    };
  });
}

let corpus;
const cache = option('--cache');
if (cache) {
  corpus = JSON.parse(readFileSync(cache, 'utf8'));
  // Un cache écrit par une autre sonde peut porter `parts[].ops` à plat.
  for (const bloc of corpus) {
    for (const a of bloc.approches) {
      a.parts = a.parts.map((p) => (p.chemin ? p : { fragment: { texte: p.texte }, chemin: { ops: p.ops || [] } }));
    }
  }
} else {
  corpus = resoudreCorpus();
  const sortie = option('--ecrire-cache');
  if (sortie) writeFileSync(sortie, JSON.stringify(corpus));
}

// ── les axes, une fois pour toutes ──────────────────────────────────────────
for (const bloc of corpus) {
  bloc.approches = bloc.approches.filter((a) => a.mode !== 'JOKER');
  for (const a of bloc.approches) a.axes = axesDe(a);
}

// ── les trois questions, et l'ordre de référence de chacune ─────────────────
const REFERENCES = {
  mixte: {
    ordre: ordreTotal,
    // la liste ordinaire : les lignes HORS PODIUM, dans l'ordre affiché — la
    // tête se cherche parmi elles seules, les deux places réservées répondent
    // à d'autres questions
    lignes: (bloc) => bloc.approches.filter((a) => a.suggestion === 'mixte'),
    candidates: (bloc) => bloc.approches.filter((a) => a.suggestion === 'mixte'),
    tete: (bloc) => bloc.approches.find((a) => a.suggestion === 'mixte') || null,
  },
  elegance: {
    ordre: ordreElegance,
    lignes: (bloc) => bloc.approches.slice().sort(ordreElegance),
    candidates: (bloc) => bloc.approches,
    tete: (bloc) => bloc.approches.find((a) => a.suggestion === 'elegance') || null,
  },
  abondance: {
    ordre: ordreTriptyques,
    lignes: (bloc) => bloc.approches.slice().sort(ordreTriptyques),
    candidates: (bloc) => bloc.approches,
    // la 2ᵈ place n'existe que si elle apporte plus de séries que la 1ʳᵉ
    tete: (bloc) => bloc.approches.find((a) => a.suggestion === 'triptyques') || null,
  },
};

/** Deux voies que le moteur actuel ne distingue que par l'orthographe des codes. */
const exAequo = (a, b) => a.score === b.score
  && (a.series || (a.bilan && a.bilan.series) || 1) === (b.series || (b.bilan && b.bilan.series) || 1);

const MOYENNES = { geometrique: globalDe, arithmetique: globalArithmetique };

/** Note chaque approche d'un bloc avec une moyenne et des curseurs, puis trie. */
function classer(lignes, moyenne, curseurs, ordre) {
  const notees = lignes.map((a) => ({ a, g: moyenne(a.axes, curseurs) }));
  notees.sort((x, y) => (y.g - x.g) || ordre(x.a, y.a));
  return notees;
}

/** Les mesures d'un régime pour une moyenne et des curseurs, sur tout le corpus. */
function mesurer(regime, moyenne, curseurs) {
  const R = REFERENCES[regime];
  let tetesGardees = 0;
  let tetesExAequo = 0;
  let tetesJugees = 0;
  let concScore = 0; let pairesScore = 0;
  let concOrdre = 0; let pairesOrdre = 0;
  let deplacees = 0; let jugees = 0;
  const changements = [];
  for (const bloc of corpus) {
    const lignes = R.lignes(bloc);
    if (lignes.length < 1) continue;
    const classement = classer(lignes, moyenne, curseurs, R.ordre);
    const tete = R.tete(bloc);
    if (tete) {
      tetesJugees++;
      // la tête de la question est-elle la mieux notée parmi ses candidates ?
      const toutes = classer(R.candidates(bloc), moyenne, curseurs, R.ordre);
      if (toutes[0].a === tete) tetesGardees++;
      else if (exAequo(toutes[0].a, tete)) tetesExAequo++;
      else changements.push({ saisie: bloc.saisie, avant: tete, apres: toutes[0].a, gAvant: moyenne(tete.axes, curseurs), gApres: toutes[0].g });
    }
    // (b) paires concordantes avec `a.score`, et avec l'ordre de référence
    const gDe = new Map(classement.map(({ a, g }) => [a, g]));
    for (let i = 0; i < lignes.length; i++) {
      for (let j = i + 1; j < lignes.length; j++) {
        const x = lignes[i]; const y = lignes[j];
        const dg = gDe.get(x) - gDe.get(y);
        if (x.score !== y.score) {
          pairesScore++;
          const ds = x.score - y.score;
          if (dg === 0) concScore += 0.5; else if ((dg > 0) === (ds > 0)) concScore++;
        }
        pairesOrdre++;
        const dr = R.ordre(x, y); // < 0 : x devant
        if (dg === 0) concOrdre += 0.5; else if ((dg > 0) === (dr < 0)) concOrdre++;
      }
    }
    // (c) déplacées d'au moins trois places dans les douze premières
    const avant = lignes.slice(0, 12);
    avant.forEach((a, i) => {
      jugees++;
      const apres = classement.findIndex((n) => n.a === a);
      if (Math.abs(apres - i) >= 3) deplacees++;
    });
  }
  return {
    tetesGardees, tetesExAequo, tetesJugees,
    concordanceScore: pairesScore ? Math.round((1000 * concScore) / pairesScore) / 10 : null,
    concordanceOrdre: pairesOrdre ? Math.round((1000 * concOrdre) / pairesOrdre) / 10 : null,
    deplacees, jugees, changements,
  };
}

const fmtCurseurs = (c) => AXES.map((axe) => `${axe.slice(0, 3)}=${c[axe]}`).join(' ');
const fmtParts = (c) => { const { parts, somme } = partsDe(c); return parts.map((p) => `${Math.round((100 * p) / somme)}%`).join('/'); };
const fmtAxes = (x) => `S=${x.simplicite} X=${x.exhaustivite} Q=${x.quantite} C=${x.coherence}`;
const fmtVoie = (a) => `${a.codes} (${a.series || (a.bilan && a.bilan.series) || 1}×666, ${a.mode}, score ${a.score}, G ${a.elegance})`;

function afficher(regime, curseurs, titre) {
  console.log(`\n── ${regime.toUpperCase()} — ${titre} : ${fmtCurseurs(curseurs)} (parts ${fmtParts(curseurs)})`);
  console.log('   moyenne       têtes (+ex æquo)  ⇄score   ⇄ordre   déplacées≥3');
  const mesures = {};
  for (const [nom, moyenne] of Object.entries(MOYENNES)) {
    const m = mesurer(regime, moyenne, curseurs);
    mesures[nom] = m;
    console.log(`   ${nom.padEnd(13)} ${String(m.tetesGardees).padStart(2)}/${String(m.tetesJugees).padEnd(3)} (+${m.tetesExAequo})     `
      + ` ${String(m.concordanceScore).padStart(6)}%  ${String(m.concordanceOrdre).padStart(6)}%`
      + `   ${String(m.deplacees).padStart(2)}/${m.jugees}`);
  }
  for (const [nom, m] of Object.entries(mesures)) {
    if (!m.changements.length) continue;
    console.log(`   têtes qui changent (${nom}) :`);
    for (const ch of m.changements) {
      console.log(`     « ${ch.saisie} »`);
      console.log(`       avant  ${fmtVoie(ch.avant)}\n              ${fmtAxes(ch.avant.axes)} → ${ch.gAvant}`);
      console.log(`       après  ${fmtVoie(ch.apres)}\n              ${fmtAxes(ch.apres.axes)} → ${ch.gApres}`);
    }
  }
  return mesures;
}

// ── 1. le détail des axes ───────────────────────────────────────────────────
if (detail) {
  for (const bloc of corpus) {
    console.log(`\n═══ ${bloc.saisie}`);
    for (const a of bloc.approches) {
      const g = globalDe(a.axes, REGIMES.mixte);
      const ga = globalArithmetique(a.axes, REGIMES.mixte);
      console.log(`${String(a.rang).padStart(2)}. ${String(a.score).padStart(5)} ${(a.suggestion || '').padEnd(10)}`
        + ` ${fmtAxes(a.axes).padEnd(34)} géo=${String(g).padStart(4)} ari=${String(ga).padStart(4)}`
        + ` ${String(a.series || (a.bilan && a.bilan.series) || 1)}×666 ${a.mode.padEnd(11)} ${a.codes}`);
    }
  }
}

// ── 2. les trois régimes du module ──────────────────────────────────────────
console.log('\n════════ LES TROIS RÉGIMES (`REGIMES` du module) ════════');
for (const regime of Object.keys(REGIMES)) afficher(regime, REGIMES[regime], 'jeu rond');

// ── 2 bis. des jeux candidats, nommés sur la ligne de commande ──────────────
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--essai') continue;
  const regime = args[i + 1];
  const [s, x, q, c] = String(args[i + 2] || '').split(',').map(Number);
  afficher(regime, { simplicite: s, exhaustivite: x, quantite: q, coherence: c }, 'essai');
}

// ── 3. le balayage des curseurs ─────────────────────────────────────────────
if (balayage) {
  const crans = [];
  for (let c = 0; c <= 200; c += pas) crans.push(c);
  const vus = new Set();
  const jeux = [];
  for (const s of crans) for (const x of crans) for (const q of crans) for (const c of crans) {
    const cur = { simplicite: s, exhaustivite: x, quantite: q, coherence: c };
    const { parts } = partsDe(cur);
    const cle = parts.join('/');
    if (vus.has(cle)) continue;
    vus.add(cle);
    jeux.push(cur);
  }
  console.log(`\n════════ BALAYAGE — ${jeux.length} jeux de curseurs distincts ════════`);
  for (const regime of Object.keys(REFERENCES)) {
    for (const [nom, moyenne] of Object.entries(MOYENNES)) {
      const resultats = jeux.map((cur) => ({ cur, m: mesurer(regime, moyenne, cur) }));
      // le meilleur : têtes gardées, puis concordance avec l'ordre de la question, puis moins de déplacées
      resultats.sort((a, b) => ((b.m.tetesGardees + b.m.tetesExAequo) - (a.m.tetesGardees + a.m.tetesExAequo))
        || (b.m.concordanceOrdre - a.m.concordanceOrdre) || (a.m.deplacees - b.m.deplacees));
      console.log(`\n── ${regime} · ${nom} — les cinq meilleurs jeux`);
      for (const { cur, m } of resultats.slice(0, 5)) {
        console.log(`   ${fmtCurseurs(cur).padEnd(40)} parts ${fmtParts(cur).padEnd(16)}`
          + ` têtes ${m.tetesGardees}+${m.tetesExAequo}/${m.tetesJugees}  ⇄score ${m.concordanceScore}%  ⇄ordre ${m.concordanceOrdre}%  déplacées ${m.deplacees}/${m.jugees}`);
      }
      // et la meilleure concordance d'ordre, têtes à part
      const parOrdre = resultats.slice().sort((a, b) => (b.m.concordanceOrdre - a.m.concordanceOrdre));
      const { cur, m } = parOrdre[0];
      console.log(`   meilleure ⇄ordre : ${fmtCurseurs(cur)} → têtes ${m.tetesGardees}+${m.tetesExAequo}/${m.tetesJugees}, ⇄score ${m.concordanceScore}%, ⇄ordre ${m.concordanceOrdre}%, déplacées ${m.deplacees}/${m.jugees}`);
    }
  }
}
