// .planning/banc/ou-tombe-une-voie.mjs — OÙ une voie se perd, au vecteur près.
//
// C'est la sonde qui a réfuté « la borne est le verrou » (le pavé TODO de
// `tests/lents/score-arbitre.test.js`). Elle montre qu'une voie franchit DEUX
// portes en série avant d'atteindre la liste, et dit laquelle l'arrête :
//
//   1. la FENÊTRE de `vecteursDeSix` — y est-elle seulement, à ce plafond ?
//   2. la COUPE de `assembler` (`.slice(0, kParFragment)`) — y survit-elle ?
//
// Mesuré sur « hope » et `tca+m14` (7 301 au moteur, 704 au global) :
//
//   plafond  16 → ABSENT de la fenêtre        (le cran 0 par défaut)
//   plafond  24 → rang 18
//   plafond  32 → rang 16, et il n'en bouge plus jusqu'au plafond 96
//
// Donc, au cran 0, la coupe à huit l'écarte ; à une coupe de seize il la
// franchit — et il reste malgré tout hors de la liste, parce qu'une TROISIÈME
// porte l'attend : le quota par mappeur (deux au cran 0), déjà rempli par
// `ffr3+tca+m14+meg` et `ffr2+tca+m14+meg`. Élargir une seule porte ne sert à
// rien : c'est la leçon que cette sonde a rendue.
//
//   PLAFOND=24,32,48 COUPE=16 CHERCHE=tca+m14 SAISIES=hope \
//     node .planning/banc/ou-tombe-une-voie.mjs
//
// ⚠️ La fenêtre se demande ICI avec un plafond EXPLICITE : elle ne dépend donc
//   pas de `config.js › largeurDAssemblage`, et la sonde reste lisible quel que
//   soit le réglage du moment.

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAFONDS = (process.env.PLAFOND || '16,24,32,48,64').split(',').map(Number);
const COUPE = Number(process.env.COUPE || 8);
const CHERCHE = process.env.CHERCHE || 'tca+m14';
const SAISIES = (process.env.SAISIES || 'hope').split(',');
const CIBLE = process.env.CIBLE || '666';

const a = await import(pathToFileURL(path.resolve(ICI, 'src/recherche/assemblage.js')).href);
const { operateursPourCible } = await import(pathToFileURL(path.resolve(ICI, 'src/recherche/bfs.js')).href);
const { normaliserCible } = await import(pathToFileURL(path.resolve(ICI, 'src/recherche/cible.js')).href);
const { CATALOGUE } = await import(pathToFileURL(path.resolve(ICI, 'src/moteur/catalogue.js')).href);

const cbl = normaliserCible(CIBLE);
const ops = operateursPourCible(CATALOGUE, cbl);

for (const saisie of SAISIES) {
  console.log(`\n══════ « ${saisie} » — où tombe ${CHERCHE} (coupe à ${COUPE}) ══════`);
  for (const plafond of PLAFONDS) {
    const v = a.vecteursDeSix(saisie, ops, cbl.longueur, plafond, cbl, {});
    const codes = v.map((x) => x.ops.map((o) => o.code).join('+'));
    const i = codes.indexOf(CHERCHE);
    const verdict = i < 0 ? 'ABSENT de la fenêtre'
      : i < COUPE ? `rang ${i + 1} → GARDÉ par la coupe`
        : `rang ${i + 1} → COUPÉ (au-delà de ${COUPE})`;
    console.log(`plafond ${String(plafond).padStart(3)} → ${String(v.length).padStart(3)} chemins ; ${CHERCHE} : ${verdict}`);
    if (plafond === PLAFONDS[PLAFONDS.length - 1]) {
      console.log(`   les ${Math.min(codes.length, COUPE + 4)} premiers : ${codes.slice(0, COUPE + 4).join('  ')}`);
    }
  }
}
