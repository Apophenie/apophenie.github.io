/* Variante (c), curseurs par défaut : les têtes de liste qu'elle changerait.

   Même règle que `series-avant-score.mjs › VARIANTES.c`, « liste entière » :
   la liste rendue par le moteur, re-rangée par le score global affiché (les
   quatre axes pondérés par les curseurs de la liste, ici le défaut), à global
   égal dans l'ordre du moteur. Rien n'est changé au moteur.

   Pour chaque saisie dont la tête change : les deux têtes, rejouées par leur
   lien (`rejouer(lire(url))`) et comparées à la ligne de la liste (lien,
   codes, score, axes) ; le rang de chacune dans les deux ordres ; les cinq
   premières lignes des deux ordres, pour juger au-delà de la tête. Et, pour
   les saisies qui ont déjà un cas « rang ou score » aux curseurs v2, si la
   paire de voies est la même (un doublon) ou non.

   Sortie : JSON sur stdout. */
import {
  creerMoteur, lire, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT,
} from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { REFERENCES } from './_corpus.js';
import { CAS_ARBITRAGE } from '../../src/app/pages/arbitrage-cas.js';

const ARBITRAGES = ['hope', 'Donald Trump', 'Éléonore à Nîmes', 'Capitalisme', 'Wikipedia',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'https://hope-hope-hope.fr/'];

const m = creerMoteur(catalogue, { filetTemporel: false });
const parts = pourcentagesDe(CURSEURS_DEFAUT);
const globalDe = (a) => {
  const ax = scoresParAxe(a);
  if (!ax) return -1;
  let somme = 0; let poids = 0;
  for (const axe of CURSEURS) {
    if (ax[axe] === null || ax[axe] === undefined) continue;
    somme += (parts[axe] ?? 0) * ax[axe]; poids += parts[axe] ?? 0;
  }
  return poids ? Math.round(somme / poids) : -1;
};
/* La voie, sans ses marqueurs de réglage : pour reconnaître une paire déjà posée. */
const voie = (url) => String(url || '').replace(/^#/, '')
  .replace(/^(?:(?:so|sce|sobre|scenique)!|c[0-9a-z]+!|p\d+\.\d+\.\d+\.\d+!|f-?\d+!)+/, '');

const listes = [];
const ajouter = (saisie, fouille) => {
  if (!listes.some((l) => l.saisie === saisie && l.fouille === fouille)) listes.push({ saisie, fouille });
};
for (const s of REFERENCES) ajouter(s, 0);
for (const f of [0, 1, 2, 3]) ajouter('hope-hope-hope.fr', f);
for (const s of ARBITRAGES) ajouter(s, 0);

const sortie = {};
for (const { saisie, fouille } of listes) {
  const liste = m.resoudre(saisie, { fouille }).approches;
  const parGlobal = [...liste].sort((x, y) => (globalDe(y) - globalDe(x)) || (liste.indexOf(x) - liste.indexOf(y)));
  const moteur = liste[0];
  const c = parGlobal[0];
  const ligne = (a) => `${a.codes} (${a.score}, g ${globalDe(a)}, ×${a.series ?? 1})`;
  const fiche = (a) => {
    const rj = m.rejouer(lire(a.url));
    const b = rj && rj.ok ? rj.approche : null;
    return {
      url: a.url,
      codes: a.codes,
      mode: a.mode,
      series: a.series ?? null,
      suggestion: a.suggestion ?? null,
      rangMoteur: liste.indexOf(a) + 1,
      rangGlobal: parGlobal.indexOf(a) + 1,
      score: a.score,
      global: globalDe(a),
      axes: scoresParAxe(a),
      rejoueALIdentique: Boolean(b) && b.url === a.url && b.codes === a.codes && b.score === a.score
        && JSON.stringify(scoresParAxe(b)) === JSON.stringify(scoresParAxe(a)),
    };
  };
  const existant = CAS_ARBITRAGE.find((k) => k.saisie === saisie && k.id.startsWith('rang-ou-score-'));
  sortie[`${saisie} @${fouille}`] = {
    saisie,
    fouille,
    voies: liste.length,
    change: c !== moteur,
    moteur: fiche(moteur),
    c: fiche(c),
    cinqMoteur: liste.slice(0, 5).map(ligne),
    cinqC: parGlobal.slice(0, 5).map(ligne),
    doublonV2: existant ? {
      id: existant.id,
      memePaire: voie(existant.apres) === voie(c.url) && voie(existant.avant) === voie(moteur.url),
      v2: { gauche: voie(existant.apres), droite: voie(existant.avant) },
    } : null,
  };
}
console.log(JSON.stringify(sortie, null, 1));
