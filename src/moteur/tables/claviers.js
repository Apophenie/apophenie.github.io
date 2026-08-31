/**
 * Claviers — AZERTY français et QWERTY US.
 * Source primaire : `/usr/share/X11/xkb/symbols/fr`, section `xkb_symbols "basic"`
 * (`research/moteur-arithmetique.md §3.2`).
 *
 *   key <AE06> { [ minus, 6, bar, fiveeighths ] };   -  6   ← « le tiret du 6 »
 *
 * CONTRACTS §0.4 : la nuance AFNOR est **mentionnée en note de bas de page**,
 * pas cachée (voir `NOTE_AFNOR`).
 */

import { bilingue } from '../i18n.js';

/** Rangée des chiffres, non shiftée, AZERTY `fr(basic)` — AE01..AE12. */
export const AZERTY_RANGEE_CHIFFRES = '&é"\'(-è_çà)=';
/** La même rangée, shiftée : c'est elle qui porte les chiffres. */
export const CHIFFRES = '1234567890';

/** Lettres, de la rangée du haut à la rangée du bas (AD, AC, AB). */
export const AZERTY = Object.freeze(['azertyuiop', 'qsdfghjklm', 'wxcvbn']);
export const QWERTY = Object.freeze(['qwertyuiop', 'asdfghjkl', 'zxcvbnm']);

/**
 * Le `-` partage bien la touche `AE06` avec le `6` sur l'AZERTY historique.
 * La touche `6` d'un QWERTY US porte `^` : le « tiret du 6 » est une
 * **spécificité française**.
 */
export const TIRET_DU_SIX = Object.freeze({
  touche: 'AE06',
  nonShiftee: '-',
  shiftee: '6',
  source: '/usr/share/X11/xkb/symbols/fr — xkb_symbols "basic"',
});

/**
 * Note de bas de page obligatoire de l'opérateur clavier (CONTRACTS §0.4).
 * La norme AFNOR NF Z71-300 (2019), disposition `fr(afnor)`, déplace le tiret :
 * `key <AE06> { [ parenright, 6, … ] }`. Le « tiret du 6 » ne vaut donc que
 * pour l'AZERTY historique — qui reste l'immense majorité du parc.
 */
export const NOTE_AFNOR = bilingue(
  'Sur la disposition normalisée AFNOR NF Z71-300 (2019), le tiret quitte la '
  + 'touche du 6 (qui porte alors la parenthèse fermante). Le « tiret du 6 » vaut '
  + 'pour l’AZERTY historique, de très loin le plus répandu — et pour lui seul : '
  + 'sur un QWERTY américain, la touche 6 porte un accent circonflexe.',
  // Le « tiret du 6 » n’a pas d’équivalent anglais : c’est une particularité du
  // clavier français, et la version anglaise le dit plutôt que de la masquer.
  'The "tiret du 6" — literally "the dash on the 6" — is a French keyboard quirk: '
  + 'on the historical AZERTY layout the dash and the 6 share one key. A US QWERTY '
  + 'puts a caret there instead, and the standardised AFNOR NF Z71-300 (2019) layout '
  + 'moves the dash off the 6 key altogether (it carries the closing parenthesis). '
  + 'The trick therefore holds for the historical AZERTY — by far the most widespread.',
);

/** Le tiret est-il sur la touche du 6 dans cette disposition ? */
export const TIRET_SUR_LE_SIX = Object.freeze({ azerty: true, afnor: false, qwerty: false });

/**
 * ★ La table du « tiret du 6 », généralisée aux dix touches `AE01`…`AE10`.
 *
 * Chaque caractère de la rangée du haut partage sa touche avec le chiffre qu'on
 * obtient en pressant Maj. Elle n'est pas saisie à la main : elle est **dérivée**
 * de `AZERTY_RANGEE_CHIFFRES` et de `CHIFFRES`, qui viennent de la même source
 * primaire (`/usr/share/X11/xkb/symbols/fr`). Les deux ne peuvent donc pas
 * diverger.
 *
 *   & → 1 · é → 2 · " → 3 · ' → 4 · ( → 5 · **- → 6** · è → 7 · _ → 8 · ç → 9 · à → 0
 *
 * Les touches `AE11` (`)`) et `AE12` (`=`) ne portent aucun chiffre : elles sont
 * hors table.
 */
export const CHIFFRE_DE_TOUCHE = Object.freeze(Object.fromEntries(
  [...CHIFFRES].map((d, i) => [[...AZERTY_RANGEE_CHIFFRES][i], Number(d)]),
));

/**
 * Chiffre partagé par la touche d'un caractère de la rangée du haut.
 * `-` vaut 6, `à` vaut 0 — et `0` est une valeur, pas une absence : on répond
 * `null` seulement si le caractère n'est sur aucune de ces dix touches.
 * @returns {number|null}
 */
export function chiffreDeTouche(c) {
  const k = String(c).toLowerCase();
  const v = CHIFFRE_DE_TOUCHE[k];
  return v === undefined ? null : v;
}

/**
 * Colonne d'une lettre (1-indexée) = chiffre de la touche numérique située dans
 * la même colonne. Colonne 6 → touche `-`/`6` : **Y, H, N** (identique sur les
 * deux claviers, qui ne diffèrent que sur A/Q/Z/W/M).
 * @returns {number|null}
 */
export function colonne(c, rangees = AZERTY) {
  const l = String(c).toLowerCase();
  for (const r of rangees) {
    const i = r.indexOf(l);
    if (i >= 0) return i + 1;
  }
  return null;
}

/** Rangée d'une lettre : 1 = haut, 2 = milieu, 3 = bas. */
export function rangee(c, rangees = AZERTY) {
  const l = String(c).toLowerCase();
  for (let i = 0; i < rangees.length; i++) if (rangees[i].includes(l)) return i + 1;
  return null;
}

/**
 * ★ **LA RANGÉE COMPTÉE DEPUIS LES CHIFFRES** — 2, 3, 4 au lieu de 1, 2, 3.
 *
 * Un clavier a QUATRE rangées, et la colonne le sait déjà : le rang d'une
 * touche « est le chiffre juste au-dessus », donc la rangée numérique est
 * dessinée, comptée, montrée. La rangée, elle, n'en connaissait que trois —
 * elle commençait à `azertyuiop` comme si la ligne des chiffres n'existait pas.
 *
 * « En version colonne tu as 4 lignes et en version ligne il n'y en a plus que
 * 3. Décline 2 versions lignes, une à 4 lignes et une à 3 lignes » (l'auteur).
 * Les deux conventions se défendent — on peut ne compter que les lettres, ou
 * compter ce que le clavier montre — et aucune n'est plus vraie que l'autre.
 * C'est justement pourquoi elles ne peuvent pas cohabiter dans une même voie :
 * voir `recherche/elegance.js › CONVENTIONS_EXCLUSIVES`.
 *
 * @returns {number|null} 2 pour la rangée du haut, 4 pour celle du bas.
 */
export function rangeeDepuisLesChiffres(c, rangees = AZERTY) {
  const r = rangee(c, rangees);
  return r === null ? null : r + 1;
}

/** Position `{rangee, colonne}` d'une lettre, ou `null`. */
export function position(c, rangees = AZERTY) {
  const r = rangee(c, rangees);
  if (r === null) return null;
  return { rangee: r, colonne: colonne(c, rangees) };
}

/** Chiffre porté par la touche au-dessus de la lettre (colonne → chiffre). */
export function chiffreDeColonne(col) {
  if (!Number.isInteger(col) || col < 1 || col > 10) return null;
  return Number(CHIFFRES[col - 1]);
}
