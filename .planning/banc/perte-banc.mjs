/* « La perte » — le banc des trois retours du 22 septembre 2026.

   Trois questions de l'auteur, et une seule mécanique pour y répondre : on
   rejoue la liste au réglage du cas, on y cherche les deux voies nommées, et on
   dit où elles sont — rang, score, global, axes, et les compteurs du bilan qui
   disent POURQUOI.

     1. « numherololgeek.1000i100.fr » aux curseurs v2 — la moisson
        `0:nv,2+3:flt+mpy+mr9` doit repasser devant `fl+mqwc+meg`, qui perd
        « 1000 » et « 100 » et dont l'égalisation ne tombe pas juste.
     2. « Marie Curie » — départage léger : `mz26` plutôt que `mas`.
     3. « Louis Fouché » au cran 3 — une voie qui finirait sur 3 plutôt que
        sur 666 n'aurait jamais dû être proposée.

   ★ Le filet temporel est neutralisé (`filetTemporel: false`), comme partout
   ailleurs dans `.planning/banc/` : comparer deux barèmes sur une base qui
   bouge avec la charge de la machine ne veut rien dire.

   Usage : node .planning/banc/perte-banc.mjs [--json] */
import {
  creerMoteur, lire, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT,
} from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

const m = creerMoteur(catalogue, { filetTemporel: false });
const json = process.argv.includes('--json');

/* La voie, sans ce qui ne la change pas — registre, cible, curseurs, fouille.
   C'est la clé de comparaison de `.planning/banc/arbitrage-remesure.mjs`, et il
   n'y en a pas deux : une voie présente se reconnaît à son programme, pas à la
   chaîne qu'un rapport d'hier en avait recopiée. */
const voie = (url) => String(url || '')
  .replace(/^[#?]/, '')
  .replace(/^(?:(?:so|sce|sobre|scenique)!|c[0-9a-z]+!|p\d+\.\d+\.\d+\.\d+!|f-?\d+!)+/, '');

const COMPTEURS = ['absorptions', 'redecoupage', 'minMax', 'retouches', 'traductionsDivergentes',
  'lecturesDivergentes', 'valeursJetees', 'egalisees', 'egalisationsInexactes', 'additionSelective',
  'majorite', 'decimation', 'rearrangement', 'filtresSelectifs', 'reglagesEnTrop', 'casses',
  'sixDetruits', 'ecritureEnLettres'];

/* LES CAS. Chacun nomme ses deux liens et la place visée ; `attendu` dit ce que
   l'auteur veut voir, pour que la sortie se lise sans revenir à l'énoncé. */
export const CAS = [
  {
    id: 'perte-numherololgeek',
    titre: 'n° 7 — la moisson doit repasser devant la partition qui perd 1000 et 100',
    gauche: '?sce!p25.200.50.150!0:nv,2+3:flt+mpy+mr9$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    droite: '?sce!p25.200.50.150!fl+mqwc+meg$4PBFCi81yB9tnWEDrTnVjMGGaHCGR48zoD9K',
    attendu: 'gauche avant droite',
  },
  {
    id: 'preference-mz26',
    titre: 'départage léger — `mz26` plutôt que `mas`',
    gauche: '?sce!fl+mz26+mr9+mrdE$LBvysLJSWqpia3v',
    droite: '?sce!fmaj+mas+mrdE$LBvysLJSWqpia3v',
    attendu: 'gauche avant droite, sans rien casser',
  },
  {
    id: 'fouche-finit-sur-3',
    titre: 'cran 3 — une voie qui n\'atteint pas la cible',
    gauche: '?sce!f3!fr9+mas+mrd+meg$7NFn8xBqb5eNAq3YCY',
    droite: null,
    attendu: 'absente de la liste, ou atteignant 666',
  },
];

const globalDe = (a, parts) => {
  const ax = scoresParAxe(a);
  if (!ax) return null;
  let somme = 0; let poids = 0;
  for (const axe of CURSEURS) {
    if (ax[axe] === null || ax[axe] === undefined) continue;
    somme += (parts[axe] ?? 0) * ax[axe]; poids += parts[axe] ?? 0;
  }
  return poids ? Math.round(somme / poids) : null;
};

const compteursDe = (a) => {
  const b = a.bilan || {};
  const c = {};
  for (const k of COMPTEURS) if (b[k]) c[k] = b[k];
  if (b.abandons) {
    const { alnum, bloc, blocCourt, ponctuation } = b.abandons;
    if (alnum || bloc || blocCourt || ponctuation) c.abandons = { alnum, bloc, blocCourt, ponctuation };
  }
  return c;
};

const sortie = [];
for (const cas of CAS) {
  const lectures = {};
  for (const cote of ['gauche', 'droite']) if (cas[cote]) lectures[cote] = lire(cas[cote]);
  const fouille = Math.max(...Object.values(lectures).map((l) => l.fouille ?? 0), 0);
  const curseurs = Object.values(lectures)[0].curseurs || CURSEURS_DEFAUT;
  const parts = pourcentagesDe(curseurs);
  const r = m.resoudre(cas.saisie ?? Object.values(lectures)[0].saisie, { curseurs, fouille });
  const liste = r.approches;

  const releve = (cote) => {
    const lecture = lectures[cote];
    if (!lecture) return null;
    if (lecture.forme === 'invalide') return { codes: '(illisible)', raison: lecture.raison, absente: true };
    const rj = m.rejouer({ ...lecture, curseurs });
    if (!rj || !rj.ok) {
      return {
        codes: `(rejeu refusé : ${(rj && (rj.raison || rj.motif)) || '?'})`,
        raison: rj && (rj.raison || rj.motif), detail: rj, absente: true,
      };
    }
    // ⚠️ LA CLÉ EST LES CODES, PAS L'URL. Le rejeu d'un lien écrit hier rend
    // une URL qui peut différer de celle que la liste écrit aujourd'hui — les
    // décalages de portée (`0:`, `2+3:`) se recalculent, et plusieurs codes ont
    // changé de forme courte depuis. Comparer les URL fait déclarer ABSENTE une
    // voie qui est là : c'est l'erreur qui m'a fait croire à une sortie sèche.
    // Les codes du chemin, eux, désignent la même suite d'opérateurs.
    const cle = String(rj.approche.codes);
    let i = liste.findIndex((a) => String(a.codes) === cle);
    if (i < 0) i = liste.findIndex((a) => voie(a.url) === voie(rj.approche.url));
    const a = i >= 0 ? liste[i] : rj.approche;
    return {
      codes: a.codes,
      rang: i >= 0 ? i + 1 : null,
      absente: i < 0,
      suggestion: a.suggestion ?? null,
      score: a.score ?? null,
      global: globalDe(a, parts),
      elegance: a.elegance ?? null,
      series: a.series ?? null,
      mode: a.mode,
      axes: scoresParAxe(a),
      compteurs: compteursDe(a),
      // Ce que la voie AFFICHE au bout : une voie qui ne finit pas sur la cible
      // n'a rien à faire dans la liste, et c'est le retour n° 3.
      arrivee: a.arrivee ?? (a.bilan && a.bilan.arrivee) ?? null,
    };
  };

  sortie.push({
    id: cas.id,
    titre: cas.titre,
    attendu: cas.attendu,
    saisie: Object.values(lectures)[0].saisie,
    curseurs,
    fouille,
    voies: liste.length,
    podium: liste.slice(0, 5).map((a, i) => ({
      rang: i + 1, codes: a.codes, score: a.score, global: globalDe(a, parts),
      elegance: a.elegance ?? null, series: a.series ?? null,
    })),
    gauche: releve('gauche'),
    droite: releve('droite'),
  });
}

if (json) {
  console.log(JSON.stringify(sortie, null, 1));
} else {
  for (const c of sortie) {
    console.log(`\n═══ ${c.id} — ${c.titre}`);
    console.log(`    « ${c.saisie} » · curseurs ${JSON.stringify(c.curseurs)} · fouille ${c.fouille} · ${c.voies} voies`);
    console.log(`    attendu : ${c.attendu}`);
    for (const cote of ['gauche', 'droite']) {
      const v = c[cote];
      if (!v) continue;
      const place = v.absente ? 'ABSENTE' : `rang ${v.rang}`;
      console.log(`  · ${cote.padEnd(7)} ${place.padEnd(9)} ${String(v.codes).padEnd(34)} score ${String(v.score).padStart(4)} · global ${String(v.global).padStart(4)} · élégance ${String(v.elegance).padStart(5)}`);
      console.log(`              axes ${JSON.stringify(v.axes)}`);
      console.log(`              ${JSON.stringify(v.compteurs)}`);
    }
    console.log('    podium :');
    for (const p of c.podium) {
      console.log(`      ${String(p.rang).padStart(2)}. ${String(p.codes).padEnd(34)} score ${String(p.score).padStart(4)} · global ${String(p.global).padStart(4)} · élégance ${String(p.elegance).padStart(5)}`);
    }
  }
}
