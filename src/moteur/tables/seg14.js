/**
 * Afficheur **quatorze segments** — table et « traits continus fusionnés ».
 *
 * Nommage standard des segments (norme de fait des afficheurs alphanumériques,
 * dits « étoile » ou *starburst*) :
 *
 *        aaaaaaa
 *       f\  |  /b        h = diagonale haut-gauche
 *       f h i j b        i = verticale centrale haute
 *       g1g1 g2g2        g1 = médiane gauche · g2 = médiane droite
 *       e k l m c        k = diagonale bas-gauche · l = verticale centrale basse
 *       e/  |  \c        m = diagonale bas-droite
 *        ddddddd
 *
 * `a` = haut · `b` = haut-droit · `c` = bas-droit · `d` = bas · `e` = bas-gauche ·
 * `f` = haut-gauche · `g1`/`g2` = les deux moitiés de la médiane · `h`, `j`, `k`,
 * `m` = les quatre diagonales · `i`/`l` = les deux moitiés de la verticale centrale.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ★ SOURCE — et pourquoi celle-là
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `tables/seg7.js` est saisie à la main depuis `research/moteur-arithmetique.md
 * §3.3`, et le prix en est écrit noir sur blanc dans sa « réserve de fidélité » :
 * la police du Registre (DSEG7 Classic) dessine **sa** version des lettres, qui
 * diverge de la table sur **12 des 36 signes**. Le Registre peut donc y montrer
 * un `H` dont on ne retrouve pas, en le comptant, le nombre annoncé à côté.
 *
 * Cette table-ci ne pouvait pas répéter cette faute. Elle n'est pas saisie :
 * elle est **DÉRIVÉE de la police elle-même** — DSEG14 Classic v0.46 (Keshikan,
 * OFL 1.1, `src/fonts/dseg14-classic.woff2`), celle-là même que Le Registre
 * affiche. Dans cette police, chaque segment allumé est **un contour fermé** du
 * glyphe : il suffit de classer les contours par leur position pour lire, sans
 * interprétation, quels segments la police allume. Les 36 signes ont été
 * extraits ainsi, puis figés ci-dessous.
 *
 * La dérivation est **rejouable** : `python3 src/gfx/dseg14-table.py
 * src/fonts/dseg14-classic.woff2` réimprime la table ci-dessous, et ses sommes
 * de contrôle. Si un jour la police change, l'écart se voit en une commande.
 *
 * Conséquence, et c'est tout l'intérêt : **il n'y a pas d'`ECARTS_POLICE_SEG14`**.
 * Le glyphe montré par Le Registre, les segments allumés par la scène et le
 * nombre annoncé par l'arithmétique sont la même chose, par construction — la
 * « règle structurelle qui élimine le risque » de CONTRACTS §0.3, appliquée à
 * une police plutôt qu'à un tracé maison.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ★ CE QUE LE QUATORZE SEGMENTS RÈGLE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * · **Plus de bas de casse forcé.** Le sept segments doit écrire `b`, `d`, `n`,
 *   `q`, `r`, `t`, `y` en minuscule (`SEG7_BAS_DE_CASSE`) : la capitale y serait
 *   indistinguable d'un chiffre, ou impossible. Le quatorze segments les écrit
 *   toutes en **capitales** — le `B` prend sa hampe centrale (`i`+`l`), le `D`
 *   aussi, le `N` ses deux diagonales.
 * · **Plus d'approximation empruntée.** Les cinq de CONTRACTS §0.4 tombent :
 *   `K` cesse d'emprunter le tracé du `H` et reçoit ses deux bras (`j`, `m`),
 *   `X` sa croix (`h j k m`), `M` ses deux pentes, `W` ses deux vallées.
 *   Seul `V` reste un compromis — barre gauche plus diagonale — mais c'est le
 *   compromis conventionnel de tous les afficheurs quatorze segments, pas un
 *   emprunt à une autre lettre.
 * · **`O` et `0` cessent d'être le même dessin** (le zéro est barré : `j`+`k`),
 *   et **`S` cesse d'être le dessin du `5`** (le `S` prend deux diagonales).
 *   En sept segments, les deux paires sont confondues.
 *
 * Et, ce qui intéresse le moteur : les **lettres qui valent 6** y sont sept
 * (`D E G H N O P`) au lieu de deux (`A O`) en sept segments — voir
 * `LETTRES_A_SIX_SEGMENTS`.
 */

import { bilingue } from '../i18n.js';

/** Ordre canonique des quatorze segments — c'est aussi l'ordre d'allumage. */
export const SEG14_ORDRE = Object.freeze(
  ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm'],
);

const t = (s) => Object.freeze(s.split(' '));

/**
 * Segments allumés par caractère, dans l'ordre de `SEG14_ORDRE`.
 * Extraits des contours de DSEG14 Classic v0.46 (voir l'en-tête).
 * Σ des 26 lettres = **140**. Σ des 10 chiffres = **59**.
 */
export const SEG14 = Object.freeze({
  0: t('a b c d e f j k'),
  1: t('b c'),
  2: t('a b d e g1 g2'),
  3: t('a b c d g1 g2'),
  4: t('b c f g1 g2'),
  5: t('a c d f g1 g2'),
  6: t('a c d e f g1 g2'),
  7: t('a b c f'),
  8: t('a b c d e f g1 g2'),
  9: t('a b c d f g1 g2'),
  A: t('a b c e f g1 g2'),
  B: t('a b c d g2 i l'),
  C: t('a d e f'),
  D: t('a b c d i l'),
  E: t('a d e f g1 g2'),
  F: t('a e f g1 g2'),
  G: t('a c d e f g2'),
  H: t('b c e f g1 g2'),
  I: t('a d i l'),
  J: t('b c d e'),
  K: t('e f g1 j m'),
  L: t('d e f'),
  M: t('b c e f h j l'),
  N: t('b c e f h m'),
  O: t('a b c d e f'),
  P: t('a b e f g1 g2'),
  Q: t('a b c d e f m'),
  R: t('a b e f g1 g2 m'),
  S: t('a c d f g1 g2 h m'),
  T: t('a i l'),
  U: t('b c d e f'),
  V: t('e f j k'),
  W: t('b c e f i k m'),
  X: t('h j k m'),
  Y: t('h j l'),
  Z: t('a d j k'),
});

/**
 * Les lettres qui **valent 6 segments allumés** — les « lettres magiques » du
 * quatorze segments (research §3.1 tient la liste équivalente du sept segments,
 * où elles ne sont que deux : `A` et `O`).
 *
 * `H`, `O` et `P` en font partie : sur un afficheur quatorze segments, `HOP`
 * s'écrit littéralement **6 · 6 · 6**.
 */
export const LETTRES_A_SIX_SEGMENTS = Object.freeze(['D', 'E', 'G', 'H', 'N', 'O', 'P']);

/**
 * Mention à afficher : le quatorze segments ne triche pas, et ça se dit.
 * (Le sept segments, lui, porte `MENTION_SEG7` — cinq lettres non
 * représentables.)
 */
export const MENTION_SEG14 = bilingue(
  'Sur un afficheur 14 segments, les 26 lettres s’écrivent en capitales, sans '
  + 'emprunt ni approximation — c’est la table de la police qui est montrée.',
  'On a fourteen-segment display all 26 letters are written as capitals, with no '
  + 'borrowing and no approximation — the table shown is the font’s own.',
);

/** Segments allumés d'un caractère, ou `null` hors domaine. */
export function segments14De(c) {
  const s = SEG14[String(c).toUpperCase()];
  return s === undefined ? null : s;
}

/** Nombre de segments allumés. */
export function compteSegments14(c) {
  const s = segments14De(c);
  return s === null ? null : s.length;
}

/**
 * ★ **Traits continus fusionnés**, transposés au quatorze segments.
 *
 * La règle est celle de `seg7.js`, inchangée : on fusionne les segments
 * **colinéaires ET adjacents**. Ce qu'elle donne ici tient à la géométrie de
 * l'afficheur, et à elle seule :
 *
 * | trait | segments fusionnés | pourquoi |
 * |---|---|---|
 * | haut         | `a`        | seul, sur toute la largeur |
 * | bas          | `d`        | seul |
 * | médiane      | `g1`+`g2`  | **une** horizontale, scindée en deux par le moyeu |
 * | verticale droite  | `b`+`c` | comme en sept segments |
 * | verticale gauche  | `e`+`f` | comme en sept segments |
 * | verticale centrale | `i`+`l` | même cas que les deux autres verticales |
 * | diagonales   | `h` · `j` · `k` · `m` | **chacune seule** |
 *
 * **Pourquoi les diagonales ne fusionnent avec rien.** On pourrait croire que
 * `h` (haut-gauche) et `m` (bas-droite) forment une seule oblique traversant
 * l'afficheur. Elles ne la forment pas : les quatre diagonales visent les
 * **flancs** de la verticale centrale, pas son axe. `h` et `k` convergent sur
 * le flanc gauche, `j` et `m` sur le flanc droit ; `h` et `m` sont donc
 * **parallèles et décalées**, jamais colinéaires. Le dessin de la scène le
 * montre (`src/visuel/assets.js`, `SEGMENTS14`), et un test le vérifie sur la
 * géométrie plutôt que sur la parole.
 *
 * Borne supérieure : **10** traits. Aucune lettre ne l'atteint (le maximum est
 * `S`, à 7), mais la borne du sept segments — 5 — est franchie, ce qui ouvre
 * des sommes que le sept segments ne savait pas produire.
 */
export function fusion14(seg) {
  if (!Array.isArray(seg)) return null;
  const on = new Set(seg);
  return (on.has('a') ? 1 : 0)
    + (on.has('d') ? 1 : 0)
    + (on.has('g1') || on.has('g2') ? 1 : 0)
    + (on.has('b') || on.has('c') ? 1 : 0)
    + (on.has('e') || on.has('f') ? 1 : 0)
    + (on.has('i') || on.has('l') ? 1 : 0)
    + (on.has('h') ? 1 : 0)
    + (on.has('j') ? 1 : 0)
    + (on.has('k') ? 1 : 0)
    + (on.has('m') ? 1 : 0);
}

/** Nombre de traits continus fusionnés d'un caractère. Σ des 26 lettres = 101. */
export function compteTraitsFusionnes14(c) {
  const s = segments14De(c);
  return s === null ? null : fusion14(s);
}

/**
 * Regroupement des segments en traits fusionnés — le moteur visuel s'en sert
 * pour allumer d'un seul geste les segments d'un même trait.
 * Même ordre que `traitsFusionnes` du sept segments : les horizontales, les
 * verticales, puis — nouveauté du quatorze — les diagonales, une par une.
 */
export function traitsFusionnes14(seg) {
  if (!Array.isArray(seg)) return null;
  const on = new Set(seg);
  const traits = [];
  for (const s of ['a', 'd']) if (on.has(s)) traits.push([s]);
  const paire = (couple) => {
    const membres = couple.filter((s) => on.has(s));
    if (membres.length) traits.push(membres);
  };
  paire(['g1', 'g2']);
  paire(['b', 'c']);
  paire(['e', 'f']);
  paire(['i', 'l']);
  for (const s of ['h', 'j', 'k', 'm']) if (on.has(s)) traits.push([s]);
  return traits;
}
