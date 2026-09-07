// .planning/banc/score-v2-produit.mjs — le banc du SCORE v2 « produit dans
// l'axe, moyenne entre les axes » (`src/recherche/score-v2-produit.js`).
//
//   node .planning/banc/score-v2-produit.mjs                → le rapport, corpus résolu à la volée (≈ 50 s)
//   node .planning/banc/score-v2-produit.mjs --cache F.json → relit une collecte (ou la crée si absente)
//   node .planning/banc/score-v2-produit.mjs --balayage     → balaye les curseurs de chaque régime
//   node .planning/banc/score-v2-produit.mjs --constantes   → règle REGLAGES par descente de coordonnées
//   node .planning/banc/score-v2-produit.mjs --detail       → les quatre axes de chaque ligne
//
// ★ Le moteur n'est PAS modifié : on lit ses approches notées (`a.score`,
//   `a.suggestion`, `a.bilan`…) et l'on recalcule les quatre axes à côté.
// ★ Le filet temporel est neutralisé (`filetTemporel: false`) : une mesure sur
//   une base qui bouge avec la charge ne se compare à rien.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..', '..');
const S = await import(path.join(racine, 'src/recherche/score.js'));
const E = await import(path.join(racine, 'src/recherche/elegance.js'));
const V2 = await import(path.join(racine, 'src/recherche/score-v2-produit.js'));

export const CORPUS = ['Millicent Billette', 'https://hope-hope-hope.fr/', 'hope-hope-hope.fr', 'Capitalisme',
  'Le chat dort sur le tapis rouge', 'La numérologie est une science exacte, disent-ils', 'Donald Trump',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'hope', 'macron', 'Wikipedia',
  'https://www.example.com/path/to/page', 'jean-michel', 'Éléonore à Nîmes', 'Sarah Kerrigan'];

// ══════════════════════════════════ collecte

/** Résout le corpus et n'en garde que ce que les axes et les comparateurs lisent. */
export async function collecter(corpus = CORPUS) {
  const M = await import(path.join(racine, 'src/recherche/index.js'));
  const { catalogue } = await import(path.join(racine, 'src/recherche/tests/_catalogue.js'));
  const m = M.creerMoteur(catalogue, { filetTemporel: false });
  const out = [];
  for (const saisie of corpus) {
    const t0 = Date.now();
    const r = m.resoudre(saisie);
    const lignes = r.approches.filter((a) => a.mode !== 'JOKER' && !a.joker);
    const approches = lignes.map((a) => ({
      rang: a.rang, mode: a.mode, series: a.series || (a.bilan && a.bilan.series) || 1,
      resonance: !!a.resonance, decret: !!a.decret, pur: !!a.pur,
      score: a.score, suggestion: a.suggestion, codes: a.codes, L: a.L,
      criteres: a.criteres, elegance: a.elegance, elegances: a.elegances, bilan: a.bilan,
      detail: E.detailDuCredit(a.bilan).filter((l) => l.points !== 0)
        .map((l) => ({ cle: l.cle, quantite: l.quantite, points: l.points, famille: l.famille })),
      parts: a.parts.map((p) => ({
        fragment: { texte: p.fragment.texte },
        chemin: { ops: p.chemin.ops.map((o) => ({ code: o.code, isJoker: !!o.isJoker, adHoc: o.adHoc || 0, notoriete: o.notoriete })) },
      })),
    }));
    out.push({ saisie, ms: Date.now() - t0, approches });
    console.error(`${saisie} — ${Date.now() - t0} ms, ${lignes.length} lignes`);
  }
  return out;
}

// ══════════════════════════════════ références : ce que le moteur fait aujourd'hui

/** Les têtes de référence d'une liste, rejouées avec les comparateurs du moteur. */
export function references(lignes) {
  const elegance = lignes.slice().sort(S.ordreElegance)[0];
  const parLeCompte = lignes.slice().sort(S.ordreTriptyques);
  const champion = parLeCompte[0];
  const honnete = parLeCompte.find((a) => !E.emploieUneFicelle(a.bilan));
  const abondance = champion && E.emploieUneFicelle(champion.bilan) && honnete
    && honnete.series >= champion.series ? honnete : champion;
  const podium = new Set([elegance, abondance]);
  const mixtes = lignes.filter((a) => !podium.has(a)).sort(S.ordreTotal);
  return {
    elegance, abondance, mixte: mixtes[0] || null, mixtes,
    // la 2ᵈ place n'existe à l'écran que si elle apporte plus de séries
    abondanceAffichee: abondance && elegance && abondance.series > elegance.series,
    ordre: { elegance: lignes.slice().sort(S.ordreElegance), abondance: parLeCompte, mixte: mixtes },
  };
}

// ══════════════════════════════════ mesures

const signe = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/**
 * Le taux de paires concordantes. ★ Un ex æquo du global compte comme une
 * paire PERDUE : l'ordre du moteur n'en laisse aucun, donc chaque égalité est
 * une distinction que le v2 ne fait plus. Sans cela, un régime qui ne lit que
 * la quantité affichait « 100 % » sur les rares paires qu'il tranchait.
 */
const taux = (c) => c.oui / Math.max(1, c.oui + c.non + c.nuls);

/** Paires concordantes entre deux clés numériques (ex æquo écartés du dénominateur). */
function concordance(lignes, cleA, cleB) {
  let oui = 0;
  let non = 0;
  let nuls = 0;
  for (let i = 0; i < lignes.length; i++) {
    for (let j = i + 1; j < lignes.length; j++) {
      const a = signe(cleA(lignes[i]) - cleA(lignes[j]));
      const b = signe(cleB(lignes[i]) - cleB(lignes[j]));
      if (a === 0 || b === 0) nuls++;
      else if (a === b) oui++;
      else non++;
    }
  }
  return { oui, non, nuls };
}

const argmax = (lignes, cle) => {
  let best = null;
  let bv = -Infinity;
  for (const l of lignes) {
    const v = cle(l);
    if (v > bv || (v === bv && best && l.codes < best.codes)) { bv = v; best = l; }
  }
  return best;
};

/**
 * Toutes les mesures d'un jeu de réglages et de trois régimes, sur la collecte.
 * Les axes sont calculés une fois par ligne ; le global une fois par régime.
 */
export function mesurer(collecte, reglages = V2.REGLAGES, regimes = V2.REGIMES, options = {}) {
  const parRegime = {};
  for (const regime of Object.keys(regimes)) {
    parRegime[regime] = { tetes: 0, exAequo: 0, total: 0, changements: [], concScore: { oui: 0, non: 0, nuls: 0 }, concRef: { oui: 0, non: 0, nuls: 0 } };
  }
  let deplacees = 0;
  let deplaceesDetail = [];
  let nbDouze = 0;
  for (const s of collecte) {
    const lignes = s.approches;
    // Les axes ne dépendent que des réglages, les références que du moteur :
    // un balayage de curseurs ne recalcule ni les uns ni les autres.
    if (!options.axesPrets) for (const a of lignes) a.axes = V2.axesDe(a, reglages);
    if (!s._ref) s._ref = references(lignes);
    const ref = s._ref;
    for (const regime of Object.keys(regimes)) {
      const cur = regimes[regime];
      for (const a of lignes) a.global = V2.globalDe(a.axes, cur);
      const R = parRegime[regime];
      const candidats = regime === 'mixte' ? ref.mixtes : lignes;
      const attendu = ref[regime];
      if (!attendu || !candidats.length) continue;
      const obtenu = argmax(candidats, (a) => a.global);
      R.total++;
      // ★ Un ex æquo n'est pas un changement de tête : le global ne tranche pas,
      //   et c'est le départage (codes) qui a choisi. On le compte à part.
      const exAequo = obtenu !== attendu && obtenu.global === attendu.global;
      if (obtenu === attendu) R.tetes++;
      else if (exAequo) R.exAequo++;
      if (obtenu !== attendu) R.changements.push({ saisie: s.saisie, attendu: resume(attendu), obtenu: resume(obtenu), exAequo, affichee: regime !== 'abondance' || ref.abondanceAffichee });
      const c1 = concordance(candidats, (a) => a.global, (a) => a.score);
      const ordreRef = ref.ordre[regime];
      const c2 = concordance(candidats, (a) => a.global, (a) => -ordreRef.indexOf(a));
      for (const k of ['oui', 'non', 'nuls']) { R.concScore[k] += c1[k]; R.concRef[k] += c2[k]; }
    }
    // (c) la liste v2 reconstituée — 1ʳᵉ élégance, 2ᵈ abondance si elle apporte plus, le reste au mixte
    const g = (regime) => (a) => V2.globalDe(a.axes, regimes[regime]);
    const tete1 = argmax(lignes, g('elegance'));
    const tete2 = argmax(lignes.filter((a) => a !== tete1), g('abondance'));
    const podium = [tete1];
    if (tete2 && tete2.series > tete1.series) podium.push(tete2);
    const reste = lignes.filter((a) => !podium.includes(a))
      .map((a) => [a, g('mixte')(a)])
      .sort((x, y) => (y[1] - x[1]) || (x[0].codes < y[0].codes ? -1 : x[0].codes > y[0].codes ? 1 : 0))
      .map(([a]) => a);
    const listeV2 = [...podium, ...reste];
    listeV2.forEach((a, i) => { a.rangV2 = i + 1; });
    for (const a of lignes) {
      if (a.rang > 12) continue;
      nbDouze++;
      if (Math.abs(a.rangV2 - a.rang) >= 3) { deplacees++; deplaceesDetail.push({ saisie: s.saisie, codes: a.codes, de: a.rang, a: a.rangV2 }); }
    }
  }
  return { parRegime, deplacees, nbDouze, deplaceesDetail };
}

function resume(a) {
  return { codes: a.codes, mode: a.mode, series: a.series, score: a.score, axes: a.axes, global: a.global, rang: a.rang };
}

/** Une note unique pour comparer deux réglages : les têtes d'abord, la concordance ensuite. */
export function noteDe(m) {
  let tetes = 0;
  let conc = 0;
  for (const R of Object.values(m.parRegime)) {
    tetes += R.tetes;
    conc += taux(R.concRef);
  }
  return tetes * 1000 + conc * 100 - m.deplacees * 0.5;
}

// ══════════════════════════════════ balayages

const CRANS = [0, 25, 50, 75, 100, 125, 150, 175, 200];

/** Le meilleur jeu de curseurs d'un régime, par grille, et les meilleurs jeux « ronds ». */
export function balayerCurseurs(collecte, regime, reglages = V2.REGLAGES, crans = CRANS) {
  for (const s of collecte) for (const a of s.approches) a.axes = V2.axesDe(a, reglages);
  const resultats = [];
  for (const si of crans) for (const ex of crans) for (const qu of crans) for (const co of crans) {
    if (si + ex + qu + co === 0) continue;
    const cur = { simplicite: si, exhaustivite: ex, quantite: qu, coherence: co };
    const m = mesurer(collecte, reglages, { [regime]: cur }, { axesPrets: true });
    const R = m.parRegime[regime];
    resultats.push({ cur, tetes: R.tetes, total: R.total, conc: taux(R.concRef), concScore: taux(R.concScore) });
  }
  resultats.sort((a, b) => (b.tetes - a.tetes) || (b.conc - a.conc));
  return resultats;
}

/** Descente de coordonnées sur REGLAGES, avec les curseurs de chaque régime re-balayés à chaque pas. */
export function reglerConstantes(collecte, depart, grille, regimesDepart, tours = 2) {
  let reglages = { ...depart, POIDS_PERTE: { ...depart.POIDS_PERTE } };
  let regimes = { ...regimesDepart };
  const evaluer = (r) => {
    const rg = {};
    for (const regime of Object.keys(regimes)) rg[regime] = balayerCurseurs(collecte, regime, r, [0, 50, 100, 150, 200])[0].cur;
    const m = mesurer(collecte, r, rg, { axesPrets: true });
    return { note: noteDe(m), rg, m };
  };
  let courant = evaluer(reglages);
  console.error(`départ : note ${courant.note.toFixed(1)}`);
  for (let t = 0; t < tours; t++) {
    for (const [cle, valeurs] of Object.entries(grille)) {
      let meilleur = { valeur: cle.includes('.') ? litChemin(reglages, cle) : reglages[cle], ...courant };
      for (const v of valeurs) {
        const essai = { ...reglages, POIDS_PERTE: { ...reglages.POIDS_PERTE } };
        if (cle.includes('.')) ecritChemin(essai, cle, v); else essai[cle] = v;
        const e = evaluer(essai);
        if (e.note > meilleur.note + 1e-9) meilleur = { valeur: v, ...e };
      }
      if (cle.includes('.')) ecritChemin(reglages, cle, meilleur.valeur); else reglages[cle] = meilleur.valeur;
      courant = { note: meilleur.note, rg: meilleur.rg, m: meilleur.m };
      regimes = meilleur.rg;
      console.error(`  ${cle} = ${JSON.stringify(meilleur.valeur)} → note ${meilleur.note.toFixed(1)} (têtes ${Object.values(meilleur.m.parRegime).map((R) => R.tetes).join('/')})`);
    }
  }
  return { reglages, regimes, mesure: courant.m };
}

const litChemin = (o, c) => c.split('.').reduce((x, k) => x[k], o);
const ecritChemin = (o, c, v) => { const ks = c.split('.'); ks.slice(0, -1).reduce((x, k) => x[k], o)[ks[ks.length - 1]] = v; };

// ══════════════════════════════════ affichage

const pct = (c) => `${(100 * taux(c)).toFixed(1)} % (${c.nuls} ex æquo)`;

export function afficher(m, regimes, detail = false, collecte = null) {
  console.log('\n## Mesures par régime\n');
  console.log('| régime | curseurs (S/E/Q/C) | têtes conservées | ex æquo en tête | têtes changées | paires concordantes avec `a.score` | paires concordantes avec l’ordre du moteur |');
  console.log('|---|---|---|---|---|---|---|');
  for (const [regime, R] of Object.entries(m.parRegime)) {
    const c = regimes[regime];
    console.log(`| ${regime} | ${c.simplicite}/${c.exhaustivite}/${c.quantite}/${c.coherence} | ${R.tetes}/${R.total} | ${R.exAequo} | ${R.total - R.tetes - R.exAequo} | ${pct(R.concScore)} | ${pct(R.concRef)} |`);
  }
  console.log(`\nLignes déplacées d’au moins trois places dans les douze premières : ${m.deplacees}/${m.nbDouze}`);
  for (const d of m.deplaceesDetail) console.log(`  - ${d.saisie} · \`${d.codes}\` : ${d.de} → ${d.a}`);
  console.log('\n## Têtes qui changent\n');
  for (const [regime, R] of Object.entries(m.parRegime)) {
    for (const ch of R.changements) {
      console.log(`- **${regime}** · ${ch.saisie}${ch.exAequo ? ' *(ex æquo : même global, départagé par le code)*' : ''}${ch.affichee ? '' : ' *(2ᵈ place non affichée aujourd’hui : même compte de séries que la 1ʳᵉ)*'}`);
      for (const [nom, l] of [['attendu', ch.attendu], ['obtenu', ch.obtenu]]) {
        const x = l.axes;
        console.log(`  - ${nom} : \`${l.codes}\` (${l.mode}, ${l.series}×666, score ${l.score}, rang ${l.rang}) — S ${x.simplicite} · E ${x.exhaustivite} · Q ${x.quantite} · C ${x.coherence} → global ${l.global}`);
      }
    }
  }
  if (detail && collecte) {
    console.log('\n## Détail des axes\n');
    for (const s of collecte) {
      console.log(`\n### ${s.saisie}\n`);
      console.log('| rang | sugg. | mode | séries | score | S | E | Q | C | mixte | élég. | abond. | codes |');
      console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const a of s.approches) {
        const x = a.axes;
        const g = (r) => V2.globalDe(x, regimes[r]);
        console.log(`| ${a.rang} | ${a.suggestion} | ${a.mode} | ${a.series} | ${a.score} | ${x.simplicite} | ${x.exhaustivite} | ${x.quantite} | ${x.coherence} | ${g('mixte')} | ${g('elegance')} | ${g('abondance')} | \`${a.codes}\` |`);
      }
    }
  }
}

// ══════════════════════════════════ ligne de commande

const args = process.argv.slice(2);
const estPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estPrincipal) {
  const iCache = args.indexOf('--cache');
  let collecte;
  if (iCache >= 0 && fs.existsSync(args[iCache + 1])) collecte = JSON.parse(fs.readFileSync(args[iCache + 1], 'utf8'));
  else {
    collecte = await collecter();
    if (iCache >= 0) fs.writeFileSync(args[iCache + 1], JSON.stringify(collecte));
  }
  if (args.includes('--balayage')) {
    for (const regime of Object.keys(V2.REGIMES)) {
      const res = balayerCurseurs(collecte, regime);
      console.log(`\n### Balayage des curseurs — régime ${regime} (${res.length} jeux)\n`);
      console.log('| curseurs S/E/Q/C | têtes | concordance ordre moteur | concordance `a.score` |');
      console.log('|---|---|---|---|');
      const vus = new Set();
      for (const r of res.slice(0, 12)) {
        const k = `${r.cur.simplicite}/${r.cur.exhaustivite}/${r.cur.quantite}/${r.cur.coherence}`;
        if (vus.has(k)) continue;
        vus.add(k);
        console.log(`| ${k} | ${r.tetes}/${r.total} | ${(100 * r.conc).toFixed(1)} % | ${(100 * r.concScore).toFixed(1)} % |`);
      }
      const actuel = res.find((r) => Object.keys(r.cur).every((k) => r.cur[k] === V2.REGIMES[regime][k]));
      if (actuel) console.log(`| **retenu** ${actuel.cur.simplicite}/${actuel.cur.exhaustivite}/${actuel.cur.quantite}/${actuel.cur.coherence} | ${actuel.tetes}/${actuel.total} | ${(100 * actuel.conc).toFixed(1)} % | ${(100 * actuel.concScore).toFixed(1)} % |`);
    }
  } else if (args.includes('--constantes')) {
    // GRILLE='{"SOCLE_UNIQUE":[400,450,500]}' remplace la grille par défaut.
    const grille = process.env.GRILLE ? JSON.parse(process.env.GRILLE) : {
      EXP_BRIEVETE: [0.5, 1, 1.5, 2], EXP_UNITE: [0, 0.5, 1, 1.5], MALUS_LIBRE: [0.6, 0.8, 1], MALUS_PAR_PART: [0, 0.05, 0.1, 0.2],
      'POIDS_PERTE.bloc': [385, 500, 770, 1000], 'POIDS_PERTE.blocCourt': [100, 200, 385, 770], 'POIDS_PERTE.ponctuation': [50, 100, 190, 385],
      ALPHA_LECTURE: [0.3, 0.5, 0.7, 0.85, 1], ALPHA_CALCUL: [0.3, 0.5, 0.7, 0.85, 1], PLANCHER_EXHAUSTIVITE: [0.05, 0.1, 0.2, 0.3],
      SOCLE_UNIQUE: [50, 150, 300, 450, 600], EXP_SERIES: [0.5, 1, 1.5, 2], MALUS_CONVERGENCE: [0.3, 0.45, 0.6, 0.8, 1], BETA_ASSEMBLE: [0, 0.15, 0.3, 0.5],
      EXP_FAMILIARITE: [0.5, 1, 1.5, 2], EXP_SANS_BIDOUILLE: [0, 0.5, 1, 1.5], EXP_LISIBILITE: [0, 0.5, 1, 2],
      DIVISEUR_CREDIT: [700, 1000, 1500, 2000, 3000], PLANCHER_CREDIT: [0.3, 0.4, 0.52, 0.7], PLAFOND_CREDIT: [1, 1.15, 1.3, 1.5],
      MALUS_NON_RESONANT: [0.8, 0.9, 1], MALUS_CREUX: [0.6, 0.75, 0.9, 1], POSTES_UNITE_DANS_CREDIT: [0, 1], COMPTER_A: [0, 1],
    };
    // DEPART='{"COMPTER_A":0}' permet de partir d'un autre point que REGLAGES.
    const depart = { ...V2.REGLAGES, POIDS_PERTE: { ...V2.REGLAGES.POIDS_PERTE }, ...JSON.parse(process.env.DEPART || '{}') };
    const { reglages, regimes, mesure } = reglerConstantes(collecte, depart, grille, V2.REGIMES, Number(process.env.TOURS || 2));
    console.log('\n## Réglages retenus par la descente\n');
    console.log('```js\n' + JSON.stringify(reglages, null, 2) + '\n```');
    console.log('```js\n' + JSON.stringify(regimes, null, 2) + '\n```');
    afficher(mesure, regimes);
  } else {
    const m = mesurer(collecte);
    afficher(m, V2.REGIMES, args.includes('--detail'), collecte);
  }
}
