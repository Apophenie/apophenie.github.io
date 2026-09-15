/* « Score arbitre » — la ligne de base des quinze cas du 15 septembre 2026.

   Pour chaque cas du corpus `.planning/arbitrages/2026-09-15-rang-ou-score.md`
   (saisie, curseurs, cran), et pour les couples de référence (l'instantané de
   `tests/lents/cible-mot.test.js`, les couples de `tests/lents/monotonie.test.js`) :
   la tête, les cinq premières lignes, avec les quatre axes, le global affiché
   (`score.js › scoreGlobal`, aux curseurs de la liste), le score du moteur, la
   suggestion, les critères et les compteurs du bilan qui disent POURQUOI ; puis
   la tête qu'aurait la liste triée par le global, et le rang des voies que
   l'autrice nomme.

   Rien n'est changé au moteur. Déterministe : `filetTemporel: false`.
   Aucune mesure de temps.

   Usage : node .planning/banc/score-arbitre-banc.mjs > sortie.json */
import { creerMoteur, scoresParAxe, CURSEURS_DEFAUT } from '../../src/recherche/index.js';
import { scoreGlobal } from '../../src/recherche/score.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

export const V2 = Object.freeze({ simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 });

/** Les quinze cas, dans l'ordre du corpus. `nommees` : les voies que l'autrice cite. */
export const CAS = [
  { n: 1, saisie: 'hope', v2: true, nommees: ['m14', 'ffr2+ma1+mab'] },
  { n: 2, saisie: 'Donald Trump', v2: true, nommees: ['2:fr15;fl+masc+mab', 'fl+ma1+mab'] },
  { n: 3, saisie: 'Éléonore à Nîmes', v2: true, nommees: ['2:ffr4;fl+m14+meg', 'fl+ma1+mab'] },
  { n: 4, saisie: 'Capitalisme', v2: true, nommees: ['0:fr13;ma1+mab', 'ma1+mab', 'fr13+ma1+mab'] },
  { n: 5, saisie: 'Wikipedia', v2: true, nommees: ['fr17+mpy+meg', 'mt9+mab'] },
  { n: 6, saisie: 'Henri Prunelle', v2: true, nommees: ['fl+mazc+meg', 'fl+msfr+mad'] },
  { n: 7, saisie: 'numherololgeek.1000i100.fr', v2: true, nommees: ['2:flt;fl+ma1+mab', '0:nv,2+3:flt+mpy+mr9'] },
  { n: 8, saisie: 'https://hope-hope-hope.fr/', v2: true, nommees: ['3.5:fl+m14', '×3:m7F+cs+prn'] },
  { n: 9, saisie: 'https://hope-hope-hope.fr/', v2: false, nommees: ['fl+mpy+meg', '0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9'] },
  { n: 10, saisie: 'Donald Trump', v2: false, nommees: ['2:fr15;fl+masc+mab', '0:fatb+mt9+mr9,2:mt9+cmn'] },
  { n: 11, saisie: 'Macron', v2: false, nommees: ['fr13+m14+meg', 'fr20+mazc+mrdE'] },
  { n: 12, saisie: 'hope-hope-hope.fr', v2: false, fouille: 2, nommees: ['fl+m14', '0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn'] },
  { n: 13, saisie: 'hope', v2: false, nommees: ['ffr3+m14+meg', 'fr21+masc+mrdE', 'm14'] },
  { n: 14, saisie: 'Éléonore à Nîmes', v2: false, nommees: ['2:ffr4;fl+m14+meg', '0+4:nc+pc9,2:fen5+nc+pc9'] },
  { n: 15, saisie: 'numherololgeek.1000i100.fr', v2: false, nommees: ['0:fr3;fl+mazc+meg', '0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9'] },
];

/** Les couples de référence : l'instantané des cibles chiffrées, et le balayage de la monotonie. */
export const COUPLES = [
  ['Sarah Kerrigan', '666'], ['Sarah Kerrigan', '13'], ['Sarah Kerrigan', '007'],
  ['hope-hope-hope.fr', '666'], ['Donald Trump', '111'],
  ['Jim', '666'], ['Wok', '666'], ['zz', '666'],
  ['Reinfocovid, désinformation garantie', "C'est de la merde !"],
];

/** La voie d'un lien, sans registre, curseurs ni cran : ce qu'on lit dans le corpus. */
export const voie = (url) => String(url || '').split('#')[1]
  .replace(/^(?:(?:so|sce|sobre|scenique)!|c[0-9a-z]+!|p\d+\.\d+\.\d+\.\d+!|f-?\d+!)+/, '');

const COMPTEURS = ['absorptions', 'redecoupage', 'minMax', 'retouches', 'traductionsDivergentes',
  'lecturesDivergentes', 'valeursJetees', 'egalisees', 'additionSelective', 'majorite', 'decimation',
  'rearrangement', 'filtresSelectifs', 'reglagesEnTrop', 'casses', 'sixDetruits', 'ecritureEnLettres'];

export function fiche(a, curseurs, liste) {
  const b = a.bilan || {};
  const compteurs = {};
  for (const k of COMPTEURS) if (b[k]) compteurs[k] = b[k];
  if (b.abandons) {
    const { alnum, bloc, blocCourt, ponctuation } = b.abandons;
    if (alnum || bloc || blocCourt) compteurs.abandons = { alnum, bloc, blocCourt, ponctuation };
  }
  return {
    voie: voie(a.url), codes: a.codes, score: a.score, global: scoreGlobal(a, curseurs),
    axes: scoresParAxe(a), criteres: a.criteres, series: a.series ?? null, mode: a.mode,
    suggestion: a.suggestion ?? null, elegance: a.elegance, rang: liste.indexOf(a) + 1, compteurs,
  };
}

export function relever(m, { saisie, cible, curseurs, fouille = 0 }) {
  const opts = { fouille };
  if (cible) opts.cible = cible;
  if (curseurs) opts.curseurs = curseurs;
  const cs = curseurs || CURSEURS_DEFAUT;
  const liste = m.resoudre(saisie, opts).approches;
  const parGlobal = [...liste].sort((x, y) => (scoreGlobal(y, cs) - scoreGlobal(x, cs)) || (liste.indexOf(x) - liste.indexOf(y)));
  return { liste, parGlobal, cs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const sortie = { cas: {}, couples: {} };
  for (const c of CAS) {
    const curseurs = c.v2 ? V2 : null;
    const { liste, parGlobal, cs } = relever(m, { saisie: c.saisie, curseurs, fouille: c.fouille || 0 });
    const f = (a) => fiche(a, cs, liste);
    sortie.cas[c.n] = {
      saisie: c.saisie, curseurs: c.v2 ? 'v2' : 'défaut', fouille: c.fouille || 0, voies: liste.length,
      tete: f(liste[0]), teteGlobale: f(parGlobal[0]),
      cinq: liste.slice(0, 5).map(f),
      cinqGlobal: parGlobal.slice(0, 5).map((a) => `${voie(a.url)} (g ${scoreGlobal(a, cs)}, s ${a.score}, #${liste.indexOf(a) + 1})`),
      nommees: Object.fromEntries(c.nommees.map((v) => {
        const a = liste.find((x) => voie(x.url) === v);
        return [v, a ? f(a) : null];
      })),
    };
  }
  for (const [saisie, cible] of COUPLES) {
    const { liste, parGlobal, cs } = relever(m, { saisie, cible });
    sortie.couples[`${saisie} → ${cible}`] = {
      voies: liste.length,
      tete: fiche(liste[0], cs, liste),
      cinq: liste.slice(0, 5).map((a) => `${voie(a.url)} (s ${a.score}, g ${scoreGlobal(a, cs)}, ${a.suggestion ?? ''})`),
      teteGlobale: parGlobal[0] ? `${voie(parGlobal[0].url)} (g ${scoreGlobal(parGlobal[0], cs)})` : null,
    };
  }
  console.log(JSON.stringify(sortie, null, 1));
}
