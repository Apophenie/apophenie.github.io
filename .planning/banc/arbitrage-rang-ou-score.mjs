/* Rang de conviction ou score global : la tête de liste à la 1ʳᵉ place, pour
   huit saisies, aux curseurs « élégance » de l'étude v2 (p25.200.50.150).

   Pour chaque saisie : `resoudre` aux curseurs, la tête du moteur (1ʳᵉ ligne,
   rang de conviction puis score), et la voie au meilleur global AFFICHÉ — les
   quatre axes pondérés par les curseurs de la liste, comme `resultat.js`.
   Chaque tête est rejouée par son lien (`rejouer(lire(url))`) et comparée à la
   ligne de la liste : codes, score, axes. Sortie : JSON sur stdout. */
import {
  creerMoteur, lire, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT,
} from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

const CURSEURS_ELEGANCE = Object.freeze({ simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 });
const SAISIES = ['hope', 'Donald Trump', 'Éléonore à Nîmes', 'Capitalisme', 'Wikipedia',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'https://hope-hope-hope.fr/'];

const m = creerMoteur(catalogue, { filetTemporel: false });
const globalAux = (curseurs) => {
  const parts = pourcentagesDe(curseurs);
  return (a) => {
    const ax = scoresParAxe(a);
    if (!ax) return null;
    let somme = 0; let poids = 0;
    for (const axe of CURSEURS) {
      if (ax[axe] === null || ax[axe] === undefined) continue;
      somme += (parts[axe] ?? 0) * ax[axe]; poids += parts[axe] ?? 0;
    }
    return poids ? Math.round(somme / poids) : null;
  };
};
const globalCas = globalAux(CURSEURS_ELEGANCE);
const globalDefaut = globalAux(CURSEURS_DEFAUT);

const sortie = {};
for (const saisie of SAISIES) {
  const r = m.resoudre(saisie, { curseurs: CURSEURS_ELEGANCE });
  const liste = r.approches;
  // Tri stable : à global égal, l'ordre du moteur départage.
  const parGlobal = [...liste].sort((x, y) => (globalCas(y) ?? -1) - (globalCas(x) ?? -1));
  const parGlobalDefaut = [...liste].sort((x, y) => (globalDefaut(y) ?? -1) - (globalDefaut(x) ?? -1));
  const fiche = (a) => {
    const rj = m.rejouer(lire(a.url));
    const ok = Boolean(rj && rj.ok);
    const b = ok ? rj.approche : null;
    return {
      url: a.url,
      codes: a.codes,
      mode: a.mode,
      series: a.series ?? null,
      rangMoteur: liste.indexOf(a) + 1,
      rangGlobal: parGlobal.indexOf(a) + 1,
      score: a.score,
      global: globalCas(a),
      globalAuDefaut: globalDefaut(a),
      axes: scoresParAxe(a),
      rejeu: ok ? {
        url: b.url,
        identique: b.url === a.url && b.codes === a.codes && b.score === a.score
          && JSON.stringify(scoresParAxe(b)) === JSON.stringify(scoresParAxe(a)),
        score: b.score,
        axes: scoresParAxe(b),
      } : { raison: rj && rj.raison },
    };
  };
  sortie[saisie] = {
    voies: liste.length,
    moteur: fiche(liste[0]),
    global: fiche(parGlobal[0]),
    desaccord: parGlobal[0] !== liste[0],
    // Pour mémoire : la tête au global pondéré par le défaut, comme au relevé précédent.
    teteGlobalAuDefaut: parGlobalDefaut[0].codes,
    exAequoAuGlobal: parGlobal.filter((a) => globalCas(a) === globalCas(parGlobal[0])).map((a) => a.codes),
  };
}
console.log(JSON.stringify(sortie, null, 1));
