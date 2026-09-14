/* Re-mesure des cas d'AB-testing, par le chemin réel.

   Pour chaque cas : `creerMoteur(catalogue, { filetTemporel: false })`,
   `resoudre(saisie, { curseurs, fouille })` aux réglages du cas, puis
   `rejouer(lire(lien))` pour chacune des deux voies. On relève :
     · si la voie se lit et se rejoue ;
     · son lien canonique d'aujourd'hui (celui que `ecrire` rend au rejeu) ;
     · son rang dans la liste, sa place au podium (`suggestion`), son score,
       son global et ses quatre axes ;
     · la tête de la liste à la place visée, pour dire si la voie y est encore
       candidate.

   ★ **LA COMPARAISON SE FAIT SUR LE LIEN CANONIQUE, PAS SUR LA CHAÎNE DU CAS.**
     Le relevé du 9 septembre comparait des chaînes, préfixes de réglage ôtés.
     Depuis, `tca` ne s'écrit plus (`fl+tca+m14` → `fl+m14`) et `so!` non plus :
     une voie présente dans la liste pouvait y être déclarée absente parce que
     le cas l'écrivait à l'ancienne. On rejoue donc le lien du cas, et l'on
     compare ce que `ecrire` rend des deux côtés — registre, cible, curseurs et
     fouille ôtés, puisqu'ils désignent la même démonstration.

   Sortie : JSON sur stdout. */
import {
  creerMoteur, lire, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT,
} from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { CAS_ARBITRAGE } from '../../src/app/pages/arbitrage-cas.js';

const m = creerMoteur(catalogue, { filetTemporel: false });
/* Le global tel que la liste et la page l'affichent : les quatre axes, pondérés
   par les curseurs du cas (`resultat.js › scoresDeLaVoie`). */
let parts = pourcentagesDe(CURSEURS_DEFAUT);
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
/* La voie, sans ce qui ne la change pas : `#<marqueurs!>programme#saisie[#cible]`
   → `programme#saisie`. Les marqueurs sont le registre, la cible, les curseurs et
   la fouille ; la relecture et la liaison, elles, changent la démonstration et
   restent. */
const voie = (url) => String(url || '')
  .replace(/^#/, '')
  .replace(/^(?:(?:so|sce|sobre|scenique)!|c[0-9a-z]+!|p\d+\.\d+\.\d+\.\d+!|f-?\d+!)+/, '');

const sortie = {};
for (const cas of CAS_ARBITRAGE) {
  const lectures = { avant: lire(cas.avant), apres: lire(cas.apres) };
  const fouille = Math.max(lectures.avant.fouille ?? 0, lectures.apres.fouille ?? 0);
  const curseurs = cas.curseurs || CURSEURS_DEFAUT;
  parts = pourcentagesDe(curseurs);
  const t0 = Date.now();
  const r = m.resoudre(cas.saisie, { curseurs, fouille });
  const duree = Date.now() - t0;
  const liste = r.approches;
  const parGlobal = [...liste].sort((x, y) => (globalDe(y) ?? -1) - (globalDe(x) ?? -1));
  const place = cas.place;
  const tete = liste[place - 1] || null;

  const releve = (cote) => {
    const lecture = lectures[cote];
    if (!lecture || lecture.forme === 'invalide') return { lu: false, raison: lecture && lecture.raison };
    const rj = m.rejouer({ ...lecture, curseurs });
    if (!rj || !rj.ok) return { lu: true, rejoue: false, raison: rj && rj.raison };
    const cle = voie(rj.approche.url);
    const i = liste.findIndex((a) => voie(a.url) === cle);
    // Le lien canonique d'aujourd'hui, au registre du cas, sans réglage.
    const brut = m.rejouer({ ...lecture, curseurs: CURSEURS_DEFAUT, fouille: 0 });
    const res = {
      lu: true,
      rejoue: true,
      codes: rj.approche.codes,
      canonique: brut.ok ? brut.approche.url : null,
      identiqueAuCas: brut.ok ? brut.approche.url === cas[cote] : false,
      rejeu: { score: rj.approche.score, global: globalDe(rj.approche), axes: scoresParAxe(rj.approche), series: rj.approche.series, mode: rj.approche.mode },
    };
    if (i < 0) return { ...res, absente: true };
    const a = liste[i];
    return {
      ...res,
      rangMoteur: i + 1,
      rangGlobal: parGlobal.indexOf(a) + 1,
      suggestion: a.suggestion ?? null,
      global: globalDe(a),
      score: a.score ?? null,
      mode: a.mode,
      series: a.series ?? (a.bilan && a.bilan.series) ?? null,
      axes: scoresParAxe(a),
    };
  };
  sortie[cas.id] = {
    saisie: cas.saisie,
    place,
    curseurs,
    fouille,
    duree,
    voies: liste.length,
    tete: tete ? { codes: tete.codes, url: tete.url, suggestion: tete.suggestion ?? null, score: tete.score, global: globalDe(tete), series: tete.series, mode: tete.mode } : null,
    teteParGlobal: parGlobal[0] ? { codes: parGlobal[0].codes, url: parGlobal[0].url, rangMoteur: liste.indexOf(parGlobal[0]) + 1, global: globalDe(parGlobal[0]), score: parGlobal[0].score } : null,
    podium: liste.slice(0, 3).map((a) => ({ codes: a.codes, suggestion: a.suggestion ?? null, score: a.score, global: globalDe(a), series: a.series })),
    avant: releve('avant'),
    apres: releve('apres'),
  };
}
console.log(JSON.stringify(sortie, null, 1));
