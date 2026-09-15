/* « Score arbitre » — les listes ENTIÈRES, pour vérifier la capacité voie par voie.

   Le recalibrage ne doit changer que l'ORDRE : une voie pénalisée recule dans la
   liste, elle n'en sort pas. Ce banc écrit, pour les quinze cas du corpus et
   les couples de référence, chaque voie de la liste (voie, rang, score du
   moteur, global) ; on le lance sur l'arbre d'avant (copie figée) et sur celui
   d'après, puis `--comparer` dit quelles voies sont sorties, entrées, et quelles
   têtes ont changé.

   Usage :
     node <arbre>/.planning/banc/score-arbitre-listes.mjs > listes.json
     node .planning/banc/score-arbitre-listes.mjs --comparer avant.json apres.json

   Déterministe : `filetTemporel: false`. Aucune mesure de temps. */
import { readFileSync } from 'node:fs';

const comparer = process.argv[2] === '--comparer';

if (comparer) {
  const avant = JSON.parse(readFileSync(process.argv[3], 'utf8'));
  const apres = JSON.parse(readFileSync(process.argv[4], 'utf8'));
  let sorties = 0;
  let entrees = 0;
  let tetes = 0;
  for (const cle of Object.keys(avant)) {
    const a = avant[cle];
    const b = apres[cle];
    if (!b) { console.log(`✗ ${cle} : absente après`); continue; }
    const voiesA = new Set(a.map((x) => x.voie));
    const voiesB = new Set(b.map((x) => x.voie));
    const sont = [...voiesA].filter((v) => !voiesB.has(v));
    const ent = [...voiesB].filter((v) => !voiesA.has(v));
    sorties += sont.length;
    entrees += ent.length;
    const teteChange = a[0] && b[0] && a[0].voie !== b[0].voie;
    if (teteChange) tetes++;
    console.log(`── ${cle} : ${a.length} → ${b.length} voies${b.length === 0 ? ' ⚠️ LISTE VIDE' : ''}`);
    console.log(`   tête : ${a[0] ? `${a[0].voie} (s ${a[0].score}, g ${a[0].global})` : '—'} → ${b[0] ? `${b[0].voie} (s ${b[0].score}, g ${b[0].global})` : '—'}${teteChange ? '   ★ CHANGE' : ''}`);
    if (sont.length) console.log(`   sorties : ${sont.join(' · ')}`);
    if (ent.length) console.log(`   entrées : ${ent.join(' · ')}`);
  }
  console.log(`\n══ ${tetes} têtes changent ; ${sorties} voies sorties, ${entrees} entrées`);
} else {
  const racine = new URL('../../', import.meta.url);
  const { creerMoteur, CURSEURS_DEFAUT } = await import(new URL('src/recherche/index.js', racine));
  const { scoreGlobal } = await import(new URL('src/recherche/score.js', racine));
  const { catalogue } = await import(new URL('src/recherche/tests/_catalogue.js', racine));
  const { CAS, COUPLES, V2, voie } = await import(new URL('.planning/banc/score-arbitre-banc.mjs', racine));
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const sortie = {};
  const relever = (cle, saisie, opts, curseurs) => {
    const liste = m.resoudre(saisie, opts).approches;
    sortie[cle] = liste.map((a, i) => ({
      voie: voie(a.url), rang: i + 1, score: a.score, global: scoreGlobal(a, curseurs), suggestion: a.suggestion ?? null,
    }));
  };
  for (const c of CAS) {
    const opts = { fouille: c.fouille || 0 };
    if (c.v2) opts.curseurs = V2;
    relever(`cas ${c.n} · ${c.saisie}${c.v2 ? ' · v2' : ''}${c.fouille ? ` · cran ${c.fouille}` : ''}`, c.saisie, opts, c.v2 ? V2 : CURSEURS_DEFAUT);
  }
  for (const [saisie, cible] of COUPLES) relever(`${saisie} → ${cible}`, saisie, { cible }, CURSEURS_DEFAUT);
  console.log(JSON.stringify(sortie, null, 1));
}
