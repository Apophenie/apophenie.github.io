/**
 * Le banc commun des pistes « sans perte » — un worktree (ou la racine) en
 * argument, la même aune pour toutes.  Usage : node .planning/banc/sans-perte-banc.mjs <racine>
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const racine = resolve(process.argv[2] || '.');
const M = await import(pathToFileURL(resolve(racine, 'src/recherche/index.js')).href);
const { catalogue } = await import(pathToFileURL(resolve(racine, 'src/recherche/tests/_catalogue.js')).href);
if (process.env.BANC_ABSORPTION !== undefined) {
  const E = await import(pathToFileURL(resolve(racine, 'src/recherche/elegance.js')).href);
  if (E.BAREME && 'ABSORPTION' in E.BAREME) { E.BAREME.ABSORPTION = Number(process.env.BANC_ABSORPTION); console.log('BAREME.ABSORPTION =', E.BAREME.ABSORPTION); }
}
const m = M.creerMoteur(catalogue, { filetTemporel: false });
const CAS = [['Sarah Kerrigan', '31031998'], ['Henri Prunelle Chochotte', '01111984'], ['Millicent Billette', '1998'],
  ['Donald Trump', '666'], ['Le chat dort sur le tapis rouge', '666'], ['hope', '666'], ['Capitalisme', '666'], ['Éléonore à Nîmes', '111'],
  ['hope-hope-hope.fr', '666'], ['Macron', '666']];
const sansPerte = (a) => { const c = a.criteres || {}, b = a.bilan || {}; return (c.R ?? 1000) === 1000 && c.brut === 1000 && !(b.jeteesAuTri) && !(b.reliquatHorsCible) && !(b.reliquatDeCible); };
const etapes = (a) => a.L ?? (a.parts || []).reduce((t, p) => t + p.chemin.ops.length, 0);
console.log(`═══ ${racine} ═══`);
let avec = 0, tete = 0, teteExh = 0, teteExhQ0 = 0;
const t0 = Date.now();
for (const [s, cible] of CAS) {
  const lignes = [];
  for (const [nom, curseurs] of [['défaut', null], ['exh 200', { exhaustivite: 200 }], ['exh 200 · qté 0', { exhaustivite: 200, quantite: 0 }]]) {
    const r = m.resoudre(s, { cible, ...(curseurs ? { curseurs } : {}) });
    const l = r.approches.filter((a) => a.mode !== 'JOKER');
    const i = l.findIndex(sansPerte);
    const sp = i >= 0 ? l[i] : null;
    if (nom === 'défaut') { if (sp) avec++; if (i === 0) tete++; }
    if (nom === 'exh 200' && i === 0) teteExh++;
    if (nom === 'exh 200 · qté 0' && i === 0) teteExhQ0++;
    lignes.push(`   ${nom.padEnd(16)} tête ${l[0].codes.slice(0, 30).padEnd(32)} ${String(etapes(l[0])).padStart(2)} ét. | sans perte : ${sp ? `#${i + 1} ${sp.codes.slice(0, 30).padEnd(32)} ${String(etapes(sp)).padStart(2)} ét.` : 'AUCUNE'}`);
  }
  console.log(`── ${s} → ${cible}`); for (const x of lignes) console.log(x);
}
console.log(`\nvoie sans perte présente : ${avec}/${CAS.length} · en tête au défaut : ${tete} · en tête avec exhaustivité 200 : ${teteExh} · avec exhaustivité 200 et quantité 0 : ${teteExhQ0} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
