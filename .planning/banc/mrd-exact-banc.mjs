// .planning/banc/mrd-exact-banc.mjs — le banc du redécoupage EXACT (`mrdE`).
//
//   node .planning/banc/mrd-exact-banc.mjs            → le relevé
//   node .planning/banc/mrd-exact-banc.mjs --json     → la même chose, comparable
//
// Pour chaque couple (saisie, cible) : la liste rend-elle AU MOINS UNE voie
// sans perte — R = 1000, brut = 1000, jetées au tri = 0, reliquat hors cible
// = 0 — ? À quel rang ? Et quand l'exhaustivité prime (`curseurs:
// { exhaustivite: 200 }`), à quel rang remonte-t-elle ? On rapporte aussi le
// nombre d'étapes de la voie sans perte contre la meilleure voie actuelle, et
// l'on COMPILE son scénario dans le moteur visuel réel : une voie qui ne se
// montre pas n'est pas une voie (CONTRACTS §0.3).
//
// ★ Le filet temporel est débranché (`filetTemporel: false`) : le relevé ne
//   doit dépendre que de la saisie, jamais de la charge de la machine (§4.4).

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { validerScenario } from '../../src/recherche/scenario.js';

let compile = null;
try {
  ({ compile } = await import('../../src/visuel/compile.js'));
  // Les scènes à traits (`mtrc`) ont besoin de la table de glyphes.
  const { setGlyphes } = await import('../../src/visuel/glyphes.js');
  const { GLYPHES } = await import('../../src/moteur/tables/glyphes.js');
  setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');
} catch { compile = null; }

const args = process.argv.slice(2);
const json = args.includes('--json');

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

const m = creerMoteur(CATALOGUE, { filetTemporel: false });

/** Une voie est SANS PERTE quand rien n'est écarté : ni en route, ni au verdict. */
export function sansPerte(a) {
  const c = a.criteres || {};
  const b = a.bilan || {};
  return c.R === 1000 && c.brut === 1000
    && (b.jeteesAuTri || 0) === 0 && (b.reliquatHorsCible || 0) === 0;
}

const nbEtapes = (a, saisie, cible) => {
  try { return m.scenarioDe(a, { saisie, cible }).steps.length; } catch { return null; }
};

const releve = [];
for (const [saisie, cible] of CAS) {
  const t0 = performance.now();
  const r = m.resoudre(saisie, { cible });
  const duree = Math.round(performance.now() - t0);
  const liste = r.approches.filter((a) => a.mode !== 'JOKER');
  const meilleure = liste[0] || null;
  const iSans = liste.findIndex(sansPerte);
  const sans = iSans >= 0 ? liste[iSans] : null;
  const avecMrdE = liste.filter((a) => a.codes.includes('mrdE')).length;

  // ★ Les curseurs : l'exhaustivité poussée à fond, les autres au neutre.
  const rE = m.resoudre(saisie, { cible, curseurs: { exhaustivite: 200 } });
  const listeE = rE.approches.filter((a) => a.mode !== 'JOKER');
  const iSansE = listeE.findIndex(sansPerte);
  // ★ …et la quantité au plancher : c'est le seul cran où `score.js ›
  //   ordrePondere` cesse de ranger les séries AVANT le score.
  const rQ = m.resoudre(saisie, { cible, curseurs: { exhaustivite: 200, quantite: 0 } });
  const listeQ = rQ.approches.filter((a) => a.mode !== 'JOKER');
  const iSansQ = listeQ.findIndex(sansPerte);

  // La scène de la voie sans perte : validée, puis compilée dans le moteur visuel.
  let scene = null;
  if (sans) {
    const sc = m.scenarioDe(sans, { saisie, cible });
    const violations = validerScenario(sc);
    let compilation = 'non compilé (src/visuel absent)';
    if (compile) {
      try {
        const tl = compile(sc);
        compilation = tl.warnings && tl.warnings.length ? `avertissements : ${tl.warnings.join(' ; ')}` : 'compilé sans avertissement';
      } catch (e) { compilation = `ÉCHEC : ${e.message}`; }
    }
    scene = { steps: sc.steps.length, violations, compilation, avertissements: sc.avertissements || [] };
  }

  releve.push({
    saisie,
    cible,
    duree,
    voies: liste.length,
    avecMrdE,
    meilleure: meilleure && {
      codes: meilleure.codes, R: meilleure.criteres.R ?? null, brut: meilleure.criteres.brut,
      jetees: meilleure.bilan.jeteesAuTri || 0, reliquat: meilleure.bilan.reliquatHorsCible || 0,
      series: meilleure.series, etapes: nbEtapes(meilleure, saisie, cible),
    },
    sansPerte: sans && {
      rang: iSans + 1,
      codes: sans.codes, R: sans.criteres.R, brut: sans.criteres.brut,
      jetees: sans.bilan.jeteesAuTri || 0, reliquat: sans.bilan.reliquatHorsCible || 0,
      series: sans.series, etapes: nbEtapes(sans, saisie, cible),
      rangExhaustivite: iSansE >= 0 ? iSansE + 1 : null,
      codesExhaustivite: iSansE >= 0 ? listeE[iSansE].codes : null,
      teteExhaustivite: listeE[0] ? listeE[0].codes : null,
      rangSansQuantite: iSansQ >= 0 ? iSansQ + 1 : null,
      teteSansQuantite: listeQ[0] ? listeQ[0].codes : null,
      scene,
    },
  });
}

if (json) {
  console.log(JSON.stringify(releve, null, 2));
} else {
  for (const x of releve) {
    console.log(`\n═══ ${x.saisie} → ${x.cible}   (${x.voies} voies, ${x.avecMrdE} avec mrdE, ${x.duree} ms)`);
    if (x.meilleure) {
      const b = x.meilleure;
      console.log(`  meilleure actuelle  rang 1   ${b.codes}`);
      console.log(`                      R=${b.R} brut=${b.brut} jetées=${b.jetees} reliquat=${b.reliquat} séries=${b.series} étapes=${b.etapes}`);
    }
    if (!x.sansPerte) { console.log('  ⚠ AUCUNE voie sans perte'); continue; }
    const s = x.sansPerte;
    console.log(`  sans perte          rang ${s.rang}   ${s.codes}`);
    console.log(`                      R=${s.R} brut=${s.brut} jetées=${s.jetees} reliquat=${s.reliquat} séries=${s.series} étapes=${s.etapes}`);
    console.log(`  exhaustivité 200 →  rang ${s.rangExhaustivite ?? '—'}   ${s.codesExhaustivite ?? ''}${s.rangExhaustivite !== 1 ? `   (tête : ${s.teteExhaustivite})` : ''}`);
    console.log(`  + quantité 0     →  rang ${s.rangSansQuantite ?? '—'}${s.rangSansQuantite !== 1 ? `   (tête : ${s.teteSansQuantite})` : ''}`);
    console.log(`  scène               ${s.scene.steps} steps · ${s.scene.violations.length ? `VIOLATIONS : ${s.scene.violations.join(' ; ')}` : 'validerScenario : 0 violation'} · ${s.scene.compilation}`
      + (s.scene.avertissements.length ? ` · scénario : ${s.scene.avertissements.join(' ; ')}` : ''));
  }
}
