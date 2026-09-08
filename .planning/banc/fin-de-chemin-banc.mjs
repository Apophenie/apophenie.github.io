/**
 * Le banc de l'INTERDICTION DES SUPPRESSIONS EN FIN DE CHEMIN.
 *
 * > « Il faudrait je pense purement interdire les suppressions arbitraires en
 * >   fin de chemin. Soit il y a une manière élégante d'élaguer ou mieux,
 * >   fusionner, soit la voie ne marche pas. » (l'auteur)
 *
 * Avant d'interdire, on compte ce qu'on interdirait : combien de voies
 * tombent, combien de listes se VIDENT, et quelles têtes changent. Une
 * interdiction qui laisse un lecteur devant une page blanche n'est pas une
 * exigence de rigueur, c'est une panne.
 *
 * Usage : node .planning/banc/fin-de-chemin-banc.mjs
 */
import { CORPUS } from './_corpus.js';
import { creerMoteur } from '../../src/recherche/index.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';

const m = creerMoteur(catalogue, { filetTemporel: false });
const CIBLES = ['666', '111', '31031998', '1998'];
const REGLE = process.env.REGLE || 'tout';
// `tout` : rien ne peut être jeté au tri.
// `horsCible` : on tolère le surplus DE LA CIBLE — quinze 6 dont on ne montre
//   que trois séries, c'est une moisson trop riche, pas une suppression
//   arbitraire — mais pas un seul chiffre étranger jeté pour faire tomber juste.
// `heterogene` : l'interdiction ne vaut QUE là où l'auteur l'a située —
//   « sur 666 la suppression par mpf marche bien […] mais sur les cibles
//   hétérogènes, ça ne marche pas ». Garder trois 6 parmi quinze, c'est
//   choisir une règle ; garder les huit chiffres d'une date parmi treize,
//   c'est recopier la réponse.
const jette = (a, cible) => {
  const b = a.bilan || {};
  if (REGLE === 'horsCible') return (b.reliquatHorsCible || 0) > 0;
  if (REGLE === 'heterogene' && new Set(cible.split('')).size === 1) return false;
  return (b.jeteesAuTri || 0) > 0;
};

let cas = 0; let videes = 0; let teteChangee = 0;
let totAvant = 0; let totApres = 0;
const vides = []; const changees = [];
const t0 = Date.now();
for (const s of CORPUS) {
  for (const cible of CIBLES) {
    const r = m.resoudre(s, { cible });
    const av = r.approches || [];
    if (!av.length) continue;
    cas += 1;
    const ap = av.filter((a) => !jette(a, cible));
    totAvant += av.length; totApres += ap.length;
    if (!ap.length) { videes += 1; vides.push(`${s} → ${cible}`); continue; }
    if (ap[0] !== av[0]) {
      teteChangee += 1;
      changees.push(`${s} → ${cible}\n     avant : ${av[0].codes}\n     après : ${ap[0].codes}`);
    }
  }
}
console.log(`cas : ${cas} · voies ${totAvant} → ${totApres} (${Math.round((totApres * 100) / totAvant)} %)`);
console.log(`listes VIDÉES : ${videes}`);
for (const v of vides) console.log('   ∅', v);
console.log(`têtes changées : ${teteChangee}`);
for (const c of changees) console.log('   ↻', c);
console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s`);
