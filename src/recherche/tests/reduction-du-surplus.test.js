/** LA RÉDUCTION DU SURPLUS NE DOIT PAS DÉPENDRE DU NOMBRE DE SES TOURS.
 *
 * `assemblage.js › reduireLeSurplus` échange, portée par portée, un candidat
 * contre un autre pour réduire le déchet d'une moisson. À déchet égal et à
 * récolte égale, elle départage par homogénéité : combien de portées portent
 * déjà le programme envisagé. Ce départage accepte un échange qui n'améliore
 * RIEN — le candidat entrant se compte lui-même, donc vaut toujours au moins 1 —,
 * et la boucle fait alors des allers-retours jusqu'à `MAX_RETOUCHES`. La variante
 * finale dépend de la PARITÉ du nombre d'échanges.
 *
 * ⚠️ MESURÉ sur « Donald Trump » visant 666, moisson « clavier » (sondes posées
 *   sur une copie jetable) : « Donald » porte `fatb+tca+mt9+mr9` et
 *   `fr11+tca+mt9+mr9` (cinq 6 sur six valeurs chacun), « Trump » `fr5+tca+mt9+mr9`
 *   (trois 6 sur cinq) et `tca+mt9+cmn` (un 6 sur un). Parti de `fatb` et `fr5`,
 *   le 1ᵉʳ tour ramène « Trump » à `mt9+cmn` — la vraie amélioration —, puis les
 *   trente-et-un suivants échangent `fatb` ⇄ `fr11` à déchet égal : la moisson
 *   sort en `fr11` (4 723). Partie de `fatb` et `mt9+cmn`, elle fait trente-deux
 *   échanges et sort en `fatb` (4 983) — la tête publiée.
 *
 * Défaut signalé, NON corrigé : le corriger changerait des listes publiées, et
 * l'autrice doit le trancher (`todo`). Le jour où il l'est, ce test passe et
 * `node:test` le signale comme « todo réussi ». */
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduireLeSurplus } from '../assemblage.js';

const candidat = (codes, six, total) => ({
  six, total, chiffres: Array(six).fill(6), chemin: { ops: codes.split('+').map((code) => ({ code })), etats: [] },
});
const FATB = candidat('fatb+tca+mt9+mr9', 5, 6);
const FR11 = candidat('fr11+tca+mt9+mr9', 5, 6);
const FR5 = candidat('fr5+tca+mt9+mr9', 3, 5);
const MT9_CMN = candidat('tca+mt9+cmn', 1, 1);
const DONALD = { debut: 0, longueur: 1, texte: 'Donald', candidats: [FATB, FR11] };
const TRUMP = { debut: 2, longueur: 1, texte: 'Trump', candidats: [FR5, MT9_CMN] };
const programmes = (retenus) => retenus.map((r) => r.candidat.chemin.ops.map((o) => o.code).join('+'));
const tous = () => true;

test('★ réduction du surplus — un échange à déchet et récolte égaux ne se fait pas : « Donald Trump », moisson « clavier »',
  { todo: 'défaut : les allers-retours à déchet égal font dépendre la variante finale de la parité de MAX_RETOUCHES — à soumettre à l’autrice' },
  () => {
    // Le cas mesuré : parti de `fatb` et `fr5`, seul « Trump » a quelque chose à gagner.
    const depuisLeSurplus = reduireLeSurplus([{ portee: DONALD, candidat: FATB }, { portee: TRUMP, candidat: FR5 }], tous);
    assert.deepEqual(programmes(depuisLeSurplus), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn'],
      'seul « Trump » s’améliore ; « Donald » n’a aucune raison de changer de lecture');
    // Et depuis un point déjà exact, rien ne bouge — pas par la grâce d'un nombre pair d'échanges.
    const dejaExact = reduireLeSurplus([{ portee: DONALD, candidat: FATB }, { portee: TRUMP, candidat: MT9_CMN }], tous);
    assert.deepEqual(programmes(dejaExact), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn']);
  });
