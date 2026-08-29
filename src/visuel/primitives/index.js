/**
 * Le vocabulaire fermé des ops — CONTRACTS §3.1.
 *
 * Vingt-quatre primitives, une par fichier — les dix-sept du socle, plus
 * `partition` (découper en sous-groupes), `table` (la table de correspondance
 * affichée — réglette, glissière ou pavé téléphonique), `fourteenSeg`
 * (l'afficheur quatorze segments), `horns` (les cornes du 666 déjà formé) et
 * `merge` (des jetons voisins qui se collent et n'en font plus qu'un) et
 * `shift` (le tamis) et `collapse` (des exemplaires identiques qui se
 * rejoignent),
 * ajoutées selon la clause d'extension du contrat. `afficheur.js` n'en est PAS une : c'est le corps
 * partagé de `sevenSeg` et `fourteenSeg`, qui font le même geste sur deux
 * afficheurs. Ajouter une transformation arithmétique sans
 * rendu impose d'**ajouter d'abord la primitive ici**, puis de l'émettre : un
 * `op` hors de cette table est une erreur de compilation, pas une op ignorée.
 */

import * as highlight from './highlight.js';
import * as dim from './dim.js';
import * as drop from './drop.js';
import * as substitute from './substitute.js';
import * as move from './move.js';
import * as group from './group.js';
import * as insertOperators from './insertOperators.js';
import * as sum from './sum.js';
import * as reduce from './reduce.js';
import * as flip180 from './flip180.js';
import * as sevenSeg from './sevenSeg.js';
import * as fourteenSeg from './fourteenSeg.js';
import * as countStrokes from './countStrokes.js';
import * as keyboard from './keyboard.js';
import * as annotate from './annotate.js';
import * as pulse from './pulse.js';
import * as reveal from './reveal.js';
import * as wait from './wait.js';
import * as partition from './partition.js';
import * as table from './table.js';
import * as horns from './horns.js';
import * as merge from './merge.js';
import * as shift from './shift.js';
import * as collapse from './collapse.js';

import { OP_NAMES } from '../constants.js';

export const PRIMITIVES = Object.freeze({
  highlight, dim, drop, substitute, move, group, insertOperators,
  sum, reduce, flip180, sevenSeg, fourteenSeg, countStrokes, keyboard,
  annotate, pulse, reveal, wait, partition, table, horns, merge, shift, collapse,
});

// Garde-fou de chargement : la table des primitives et le vocabulaire déclaré
// doivent coïncider exactement. Échec bruyant, pas de dégradation silencieuse.
{
  const implemented = Object.keys(PRIMITIVES);
  const missing = OP_NAMES.filter((n) => !implemented.includes(n));
  const extra = implemented.filter((n) => !OP_NAMES.includes(n));
  if (missing.length || extra.length) {
    throw new Error(
      'moteur visuel : le vocabulaire d\'ops et les primitives implémentées divergent — '
      + `manquantes : [${missing.join(', ')}], en trop : [${extra.join(', ')}].`,
    );
  }
  for (const [n, mod] of Object.entries(PRIMITIVES)) {
    if (typeof mod.plan !== 'function') throw new Error(`primitive « ${n} » : « plan(ctx) » manquant.`);
  }
}
