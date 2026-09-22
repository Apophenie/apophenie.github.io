// .planning/banc/tri-respectueux.mjs — le banc du RANGEMENT de `mrtE` / `mt9E`.
//
//   node .planning/banc/tri-respectueux.mjs            → le relevé
//   node .planning/banc/tri-respectueux.mjs --json     → la même chose, comparable
//   node .planning/banc/tri-respectueux.mjs --diff a.json b.json → l'écart
//
// ★ CE QU'IL MESURE, ET POURQUOI IL EXISTE. Le redécoupage exact avec tri a
//   d'abord poussé les chiffres justes DEVANT ; l'autrice l'a refusé — « le tri
//   qui place les 6 devant ne va pas : tri oui, mais avec un ordre respecté ».
//   Changer l'ordre du rangement change ce que la passe exacte peut fondre : ce
//   banc dresse, ligne témoin par ligne témoin, ce que le geste écrit, pour que
//   l'avant et l'après se comparent chiffre pour chiffre plutôt que de mémoire.
//
// ★ LES LIGNES TÉMOINS. Le corpus du banc, passé par `fmaj+tca`, puis par
//   CHAQUE conversion qui rend des nombres, pour trois cibles homogènes (`666`,
//   `777`, `111`) — les seules que le geste vise. Les doublons sont fondus : ce
//   qu'on compte, ce sont des LIGNES, pas des chemins. C'est la même matière que
//   celle qui a servi à régler le geste (commit `89be73f`), dressée une fois
//   pour toutes plutôt que refaite à la main à chaque arbitrage.
//
// ★ Rien ici ne touche à la recherche : c'est l'ARITHMÉTIQUE du geste qu'on
//   relève, pas son classement. Pour le classement, voir `classement.mjs`.

import { readFileSync } from 'node:fs';

import { CATALOGUE, PAR_CODE, appliquer } from '../../src/moteur/catalogue.js';
import { depuisSaisie, nums } from '../../src/moteur/etat.js';
import { CORPUS } from './_corpus.js';

const args = process.argv.slice(2);

// ── le mode --diff : deux relevés JSON, et ce qui a bougé entre eux ──────────
const iDiff = args.indexOf('--diff');
if (iDiff >= 0) {
  const lire = (p) => new Map(JSON.parse(readFileSync(p, 'utf8')).map((r) => [`${r.cible}|${r.ligne.join(',')}`, r]));
  const a = lire(args[iDiff + 1]);
  const b = lire(args[iDiff + 2]);
  const dit = (v) => (v ? v.join(' ') : '—');
  for (const code of ['mrtE', 'mt9E']) {
    const s = `s${code}`;
    let change = 0; let gagne = 0; let perd = 0; let muet = 0; let parle = 0;
    const exemples = [];
    for (const [cle, ra] of a) {
      const rb = b.get(cle);
      if (!rb) continue;
      if (dit(ra[code]) === dit(rb[code])) continue;
      change++;
      if (ra[code] && !rb[code]) muet++;
      if (!ra[code] && rb[code]) parle++;
      if (rb[s] > ra[s]) gagne++;
      if (rb[s] < ra[s]) perd++;
      if (exemples.length < 12 || rb[s] < ra[s]) {
        exemples.push(`  ${ra.cible} ${ra.ligne.join(' ')}\n    avant ${dit(ra[code])} (${ra[s]})\n    après ${dit(rb[code])} (${rb[s]})`);
      }
    }
    const somme = (m) => [...m.values()].reduce((t, r) => t + r[s], 0);
    console.log(`\n═══ ${code} : ${change} lignes changent`
      + ` — ${gagne} gagnent une série, ${perd} en perdent, ${muet} se taisent, ${parle} se mettent à parler`);
    console.log(`    séries au total : ${somme(a)} → ${somme(b)}`);
    for (const e of exemples.slice(0, 20)) console.log(e);
  }
  process.exit(0);
}

// ── le relevé ────────────────────────────────────────────────────────────────
const CIBLES = ['666', '777', '111'];
const conversions = CATALOGUE.filter((o) => o.from === 'TOKENS' && o.to === 'NUMS');

const viser = (op, cible) => {
  try { return op.viser ? op.viser(cible) : op; } catch { return null; }
};
const jouer = (op, etat) => {
  try { return op && etat ? appliquer(op, etat) : null; } catch { return null; }
};

const lignes = new Map();
for (const saisie of CORPUS) {
  for (const cible of CIBLES) {
    let etat = depuisSaisie(saisie);
    for (const code of ['fmaj', 'tca']) etat = jouer(viser(PAR_CODE.get(code), cible), etat);
    if (!etat) continue;
    for (const conv of conversions) {
      const e = jouer(viser(conv, cible), etat);
      if (!e || e.type !== 'NUMS' || !e.valeur.length) continue;
      lignes.set(`${cible}|${e.valeur.join(',')}`, { cible, ligne: e.valeur });
    }
  }
}

/**
 * Combien de fois la cible s'écrit d'affilée dans la sortie — la mesure du site.
 * ★ `retourne` : pour `mt9E`, un 9 laissé seul est un 6 que `+mr9` rendra ; le
 *   compter serait mentir, ne pas le compter aussi. On compte les deux.
 */
const seriesDe = (v, cible, retourne = false) => {
  if (!v) return 0;
  const chiffre = Number(cible[0]);
  const bons = v.filter((x) => x === chiffre || (retourne && chiffre === 6 && x === 9)).length;
  return Math.floor(bons / cible.length);
};

const releve = [];
for (const { cible, ligne } of [...lignes.values()]) {
  const entree = nums(ligne, ligne.map((_, i) => [[i, i + 1]]));
  const r = { cible, ligne };
  for (const code of ['mrdE', 'mrtE', 'mt9E']) {
    const sortie = jouer(viser(PAR_CODE.get(code), cible), entree);
    r[code] = sortie ? sortie.valeur : null;
    r[`s${code}`] = seriesDe(r[code], cible, code === 'mt9E');
  }
  releve.push(r);
}
releve.sort((a, b) => (a.cible < b.cible ? -1 : a.cible > b.cible ? 1
  : (a.ligne.join(',') < b.ligne.join(',') ? -1 : 1)));

if (args.includes('--json')) {
  console.log(JSON.stringify(releve));
} else {
  console.log(`lignes témoins : ${releve.length}`);
  for (const code of ['mrdE', 'mrtE', 'mt9E']) {
    const parle = releve.filter((r) => r[code]);
    console.log(`${code.padEnd(5)} parle sur ${String(parle.length).padStart(4)} lignes,`
      + ` ${parle.reduce((t, r) => t + r[`s${code}`], 0)} séries`);
  }
}
