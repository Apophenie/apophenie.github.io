// .planning/banc/absorption-banc.mjs — le banc de l'ABSORPTION ARITHMÉTIQUE (`mab`).
//
//   node .planning/banc/absorption-banc.mjs            → le relevé, cas par cas
//   node .planning/banc/absorption-banc.mjs --json     → la même chose, comparable
//   node .planning/banc/absorption-banc.mjs --tete 5   → les cinq premières lignes de chaque liste
//
// La question posée est celle de l'auteur : sur chaque saisie, la liste
// propose-t-elle AU MOINS UNE voie sans aucune perte — rendement R = 1000,
// couverture brute = 1000, rien de jeté au tri, aucun reliquat hors cible — ?
// À quel rang ? Et si l'on fait primer l'exhaustivité (`{ exhaustivite: 200 }`),
// remonte-t-elle ?
//
// ★ Le filet temporel est neutralisé (`filetTemporel: false`), comme dans tous
//   les bancs : une mesure qui bouge avec la charge de la machine n'en est pas
//   une.

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const iTete = args.indexOf('--tete');
const tete = iTete >= 0 ? Number(args[iTete + 1]) : 3;

export const CAS = [
  ['Sarah Kerrigan', '31031998'],
  ['Henri Prunelle Chochotte', '01111984'],
  ['Millicent Billette', '1998'],
  ['Donald Trump', '666'],
  ['Le chat dort sur le tapis rouge', '666'],
  ['hope', '666'],
  ['Capitalisme', '666'],
  ['Éléonore à Nîmes', '111'],
];

const REGLAGES = [
  ['défaut', undefined],
  ['exhaustivité 200', { exhaustivite: 200 }],
  // ★ Le troisième réglage n'était pas demandé ; il répond à ce que le
  //   deuxième montre. Avec l'exhaustivité seule à 200, la quantité garde son
  //   cran et une voie à huit séries qui jette cinq valeurs passe encore
  //   devant une voie à une série qui ne jette rien. Quantité à zéro, la
  //   question posée est bien « ne rien perdre » — et la réponse se lit.
  ['exhaustivité 200, quantité 0', { exhaustivite: 200, quantite: 0 }],
];

const m = creerMoteur(CATALOGUE, { filetTemporel: false });

/** Une voie est SANS PERTE au sens de l'auteur : tout gardé, rien jeté. */
const sansPerte = (a) => {
  const c = a.criteres || {};
  const b = a.bilan || {};
  return c.R === 1000 && c.brut === 1000
    && (b.jeteesAuTri || 0) === 0 && (b.reliquatHorsCible || 0) === 0;
};

/** Le nombre d'étapes RENDUES d'une approche — celles que Le Registre liste. */
function etapesDe(a, saisie) {
  try {
    const sc = m.scenarioDe(a, { saisie });
    return sc && Array.isArray(sc.steps) ? sc.steps.length : null;
  } catch (e) {
    return `⚠ ${e.message}`;
  }
}

/** Les codes d'une approche, en jetons — `a.codes` est la chaîne d'URL. */
const jetons = (a) => String(a.codes || '').split(/[^0-9A-Za-z]+/).filter(Boolean);

const ligne = (a, saisie) => ({
  rang: a.rang,
  codes: String(a.codes || ''),
  mode: a.mode,
  series: a.series || 1,
  score: a.score,
  elegance: a.elegance ?? null,
  R: (a.criteres || {}).R ?? null,
  brut: (a.criteres || {}).brut ?? null,
  jetees: (a.bilan || {}).jeteesAuTri ?? null,
  reliquat: (a.bilan || {}).reliquatHorsCible ?? null,
  etapes: etapesDe(a, saisie),
  sansPerte: sansPerte(a),
  mab: jetons(a).includes('mab'),
});

const releve = [];
for (const [saisie, cible] of CAS) {
  const cas = { saisie, cible, reglages: {} };
  for (const [nom, curseurs] of REGLAGES) {
    const t0 = performance.now();
    const r = m.resoudre(saisie, { cible, ...(curseurs ? { curseurs } : {}) });
    const ms = Math.round(performance.now() - t0);
    const approches = r.approches.filter((a) => a.mode !== 'JOKER');
    const lignes = approches.map((a) => ligne(a, saisie));
    const premiere = lignes.find((l) => l.sansPerte) || null;
    const premiereMab = lignes.find((l) => l.mab) || null;
    cas.reglages[nom] = {
      ms,
      voies: lignes.length,
      tete: lignes.slice(0, tete),
      meilleure: lignes[0] || null,
      sansPerte: premiere,
      nbSansPerte: lignes.filter((l) => l.sansPerte).length,
      nbMab: lignes.filter((l) => l.mab).length,
      premiereMab,
    };
  }
  releve.push(cas);
}

if (json) {
  console.log(JSON.stringify(releve, null, 2));
} else {
  const f = (l) => (l ? `#${l.rang} ${l.codes} · ${l.series}×${l.mode} · score ${l.score} · R ${l.R} · brut ${l.brut} · jetées ${l.jetees} · reliquat ${l.reliquat} · ${l.etapes} étapes` : '—');
  for (const cas of releve) {
    console.log(`\n═══ « ${cas.saisie} » → ${cas.cible}`);
    for (const [nom, r] of Object.entries(cas.reglages)) {
      console.log(`  ── ${nom} (${r.voies} voies, ${r.ms} ms)`);
      console.log(`     meilleure     : ${f(r.meilleure)}`);
      console.log(`     sans perte    : ${f(r.sansPerte)}${r.sansPerte ? ` (${r.nbSansPerte} voie(s) sans perte)` : ' ⚠ AUCUNE'}`);
      console.log(`     première mab  : ${f(r.premiereMab)} (${r.nbMab} voie(s) avec mab)`);
      for (const l of r.tete) console.log(`       ${f(l)}${l.sansPerte ? '  ★ sans perte' : ''}`);
    }
  }
}
