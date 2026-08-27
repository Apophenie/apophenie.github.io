/**
 * Afficheur 7 segments — table et « traits continus fusionnés ».
 * Source : `research/moteur-arithmetique.md §3.3`.
 *
 * Nommage standard des segments :
 *
 *        aaa
 *       f   b
 *        ggg
 *       e   c
 *        ddd
 *
 * a = haut · b = haut-droit · c = bas-droit · d = bas · e = bas-gauche ·
 * f = haut-gauche · g = milieu.
 */

import { bilingue } from '../i18n.js';

/** Segments allumés par caractère. Σ des 26 lettres = 115. */
export const SEG7 = Object.freeze({
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg',
  G: 'acdef', H: 'bcefg', I: 'bc', J: 'bcd', K: 'bcefg', L: 'def', M: 'aceg',
  N: 'ceg', O: 'abcdef', P: 'abefg', Q: 'abcfg', R: 'eg', S: 'acdfg', T: 'defg',
  U: 'bcdef', V: 'bcdef', W: 'bdef', X: 'bcefg', Y: 'bcdfg', Z: 'abdeg',
});

/**
 * Lettres dont la forme affichée est **obligatoirement bas de casse** sur un
 * afficheur 7 segments (la capitale serait indistinguable d'un chiffre, ou
 * impossible). Sert à la mention à l'écran.
 */
export const SEG7_BAS_DE_CASSE = Object.freeze(['B', 'D', 'N', 'Q', 'R', 'T', 'Y']);

/**
 * Lettres **non représentables** en 7 segments. CONTRACTS §0.4 : approximations
 * assumées, avec mention à l'écran.
 *   K, X → repris de H · V → repris de U · M, W → inventés.
 */
export const SEG7_APPROXIMATIONS = Object.freeze({
  K: bilingue('approximation : le K reprend le tracé du H',
    'approximation: K borrows the shape of H'),
  M: bilingue('approximation : le M n’est pas représentable, tracé inventé (a, c, e, g)',
    'approximation: M cannot be shown, shape invented (a, c, e, g)'),
  V: bilingue('approximation : le V reprend le tracé du U',
    'approximation: V borrows the shape of U'),
  W: bilingue('approximation : le W n’est pas représentable, tracé inventé (b, d, e, f)',
    'approximation: W cannot be shown, shape invented (b, d, e, f)'),
  X: bilingue('approximation : le X reprend le tracé du H',
    'approximation: X borrows the shape of H'),
});

/**
 * ★ RÉSERVE DE FIDÉLITÉ — la table ci-dessus fait foi, la police non.
 *
 * Le Registre montre la lettre en **police** sept segments (DSEG7 Classic,
 * `src/app/registre.js`), la scène l'**allume** segment par segment depuis
 * cette table. Les deux ne s'accordent pas partout : DSEG7 dessine sa propre
 * approximation, et elle diffère de la nôtre sur **12 des 36 signes**.
 *
 * | signe | table (`SEG7`) | DSEG7 Classic | segments (`m7`) | traits fusionnés (`m7F`) |
 * |---|---|---|---|---|
 * | 7 | `abc`     | `abcf`    | 3 vs 4 | 2 vs 3 ✗ |
 * | C | `adef`    | `deg`     | 4 vs 3 | 3 vs 3 |
 * | H | `bcefg`   | `cefg`    | 5 vs 4 | 3 vs 3 |
 * | I | `bc`      | `c`       | 2 vs 1 | 1 vs 1 |
 * | J | `bcd`     | `bcde`    | 3 vs 4 | 2 vs 3 ✗ |
 * | K | `bcefg`   | `acefg`   | 5 vs 5 | 3 vs 4 ✗ |
 * | M | `aceg`    | `abcef`   | 4 vs 5 | 4 vs 3 ✗ |
 * | O | `abcdef`  | `cdeg`    | 6 vs 4 | 4 vs 4 |
 * | S | `acdfg`   | `cdfg`    | 5 vs 4 | 5 vs 4 ✗ |
 * | U | `bcdef`   | `cde`     | 5 vs 3 | 3 vs 3 |
 * | W | `bdef`    | `bcdefg`  | 4 vs 6 | 3 vs 4 ✗ |
 * | Z | `abdeg`   | `abde`    | 5 vs 4 | 5 vs 4 ✗ |
 *
 * Ce que ça implique, méthode par méthode :
 *
 * · **`m7F` — traits fusionnés** (la méthode de référence) : le COMPTE tient
 *   partout sauf sur 7, J, K, M, S, W et Z. Sur `hope` et `fr` — et sur tout
 *   mot qui les évite — le Registre et la scène annoncent le même nombre.
 *   Le DESSIN, lui, diffère quand même : DSEG forme un `h` et un `o` de bas
 *   de casse là où la table allume un `H` et un `O` de capitale.
 * · **`m7` — segments allumés** : les comptes divergent dès C, H, I, O, S, U…
 *   Le Registre y montre donc un glyphe dont on peut compter les segments sans
 *   retomber sur le nombre annoncé juste à côté. **C'est le point à trancher**
 *   — voir la note de l'auteur.
 *
 * Le contrôle croisé de CONTRACTS §0.3 reste intact là où il porte : la SCÈNE
 * redérive son compte du tracé qu'elle allume, et la compilation échoue si les
 * deux divergent. La police, elle, n'entre pas dans ce circuit — elle illustre.
 * `segments` voyage dans la figure du scénario précisément pour que l'écart
 * reste mesurable plutôt que d'être oublié.
 */
export const ECARTS_POLICE_SEG7 = Object.freeze({
  7: 'abcf', C: 'deg', H: 'cefg', I: 'c', J: 'bcde', K: 'acefg',
  M: 'abcef', O: 'cdeg', S: 'cdfg', U: 'cde', W: 'bcdefg', Z: 'abde',
});

/** Mention à afficher quand un token traverse une approximation. */
export const MENTION_SEG7 = bilingue(
  'Approximation d’affichage : K, M, V, W et X ne sont pas représentables sur un '
  + 'afficheur 7 segments.',
  'Display approximation: K, M, V, W and X cannot be rendered on a seven-segment '
  + 'display.',
);

/** Segments allumés d'un caractère, ou `null` hors domaine. */
export function segmentsDe(c) {
  const s = SEG7[String(c).toUpperCase()];
  return s === undefined ? null : s;
}

/** Nombre de segments allumés. */
export function compteSegments(c) {
  const s = segmentsDe(c);
  return s === null ? null : s.length;
}

/**
 * **Traits continus fusionnés** (Méthode 5 du README, définie au §3.3) :
 * on fusionne les segments colinéaires **et** adjacents. Seules deux paires le
 * sont : `b`+`c` (verticale droite) et `e`+`f` (verticale gauche). Les segments
 * `a`, `d`, `g` sont trois horizontales disjointes, jamais fusionnables.
 *
 * Borne supérieure : 5 — d'où l'absence de lettre valant 6 dans ce système.
 */
export function fusionSegments(seg) {
  if (typeof seg !== 'string') return null;
  return (seg.includes('a') ? 1 : 0)
    + (seg.includes('d') ? 1 : 0)
    + (seg.includes('g') ? 1 : 0)
    + (seg.includes('b') || seg.includes('c') ? 1 : 0)
    + (seg.includes('e') || seg.includes('f') ? 1 : 0);
}

/** Nombre de traits continus fusionnés d'un caractère. Σ des 26 lettres = 87. */
export function compteTraitsFusionnes(c) {
  const s = segmentsDe(c);
  return s === null ? null : fusionSegments(s);
}

/**
 * Regroupement des segments en traits fusionnés — le moteur visuel s'en sert
 * pour colorer d'une même teinte les segments d'un même trait (`strokeId`).
 */
export function traitsFusionnes(seg) {
  if (typeof seg !== 'string') return null;
  const traits = [];
  for (const s of 'adg') if (seg.includes(s)) traits.push([s]);
  const droite = [...'bc'].filter((s) => seg.includes(s));
  if (droite.length) traits.push(droite);
  const gauche = [...'ef'].filter((s) => seg.includes(s));
  if (gauche.length) traits.push(gauche);
  return traits;
}
