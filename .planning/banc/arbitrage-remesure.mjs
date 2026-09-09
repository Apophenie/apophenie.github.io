/* Re-mesure des cas d'AB-testing : pour chaque cas, on rejoue la saisie avec
   ses curseurs et son cran, on retrouve les deux voies par leur URL, et on
   relève ce que la page affiche — rang moteur, score, mode, séries, et le rang
   qu'aurait la voie si l'on triait par le score global. */
import { creerMoteur, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { CAS_ARBITRAGE } from '../../src/app/pages/arbitrage-cas.js';

const m = creerMoteur(catalogue, { filetTemporel: false });
const parts = pourcentagesDe(CURSEURS_DEFAUT);
const globalDe = (a) => {
  const ax = scoresParAxe(a);
  if (!ax) return null;
  let somme = 0; let poids = 0;
  for (const axe of CURSEURS) {
    if (ax[axe] === null || ax[axe] === undefined) continue;
    somme += (parts[axe] ?? 0) * ax[axe]; poids += parts[axe] ?? 0;
  }
  return poids ? Math.round(somme / poids) : null;
};
const cran = (u) => { const m2 = /!f(\d+)!/.exec(u || '') || /#sce!f(\d+)!/.exec(u || ''); return m2 ? Number(m2[1]) : 0; };
/* ★ Comparer les VOIES, pas les réglages. Une URL peut porter un préfixe de
   pondération (`p25.200.50.150!`), de cran (`f1!`) ou de cible (`c111!`) selon
   le contexte où elle a été relevée ; deux liens qui ne diffèrent que par là
   désignent la même démonstration. On ne garde donc que les codes et la saisie. */
const nu = (u) => String(u || '').replace(/^#sce!/, '').replace(/^(?:[pfc][^!]*!)+/, '');

const sortie = {};
for (const cas of CAS_ARBITRAGE) {
  const fouille = Math.max(cran(cas.avant), cran(cas.apres));
  const opts = { fouille };
  if (cas.curseurs) opts.curseurs = cas.curseurs;
  const r = m.resoudre(cas.saisie, opts);
  const parGlobal = [...r.approches].sort((x, y) => (globalDe(y) ?? -1) - (globalDe(x) ?? -1));
  const releve = (url) => {
    const cible = nu(url);
    const i = r.approches.findIndex((a) => nu(a.url) === cible);
    if (i < 0) return { absente: true };
    const a = r.approches[i];
    const g = parGlobal.indexOf(a);
    return {
      rangMoteur: i + 1,
      rangGlobal: g >= 0 ? g + 1 : null,
      global: globalDe(a),
      score: a.score ?? null,
      mode: a.mode,
      series: a.series ?? (a.bilan && a.bilan.series) ?? null,
    };
  };
  sortie[cas.id] = { fouille, voies: r.approches.length, avant: releve(cas.avant), apres: releve(cas.apres) };
}
console.log(JSON.stringify(sortie, null, 1));
