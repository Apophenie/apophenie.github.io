/**
 * FIXTURES — jeu minimal de glyphes au format normatif de CONTRACTS §2.4.
 *
 * ⚠️ Ce fichier n'est **pas** la table du projet. La table réelle est
 * `src/moteur/tables/glyphes.js`, écrite par l'agent arithmétique ; elle couvre
 * les 52 glyphes et ses sommes de contrôle sont vérifiées par `derivees.js`.
 * Ces fixtures ne servent qu'aux tests du moteur visuel, tant que la table
 * réelle n'est pas disponible — le moteur visuel n'écrit jamais dans
 * `src/moteur/`.
 *
 * Conventions de tracé (moteur-arithmetique §3.4) : capitale bâton géométrique,
 * `A` pointu, `I` sans empattement, `E` en fût + 3 barres.
 * Grille : `0..400` en largeur, `0..600` en hauteur, origine en bas à gauche.
 *
 * Valeurs de référence attendues (traits / extrémités / boucles) :
 *   A 3/2/1 · E 4/3/0 · H 3/4/0 · I 1/2/0 · O 1/0/1 · P 2/1/1
 */

export const GLYPHES = {
  A: {
    traits: [
      { d: 'M 0 0 L 200 600', ouvert: true },
      { d: 'M 200 600 L 400 0', ouvert: true },
      { d: 'M 60 180 L 340 180', ouvert: true },
    ],
    jonctions: [[0, 1, 'sommet'], [0, 2], [1, 2]],
  },
  E: {
    traits: [
      { d: 'M 80 0 L 80 600', ouvert: true },
      { d: 'M 80 600 L 340 600', ouvert: true },
      { d: 'M 80 300 L 300 300', ouvert: true },
      { d: 'M 80 0 L 340 0', ouvert: true },
    ],
    jonctions: [[0, 1], [0, 2], [0, 3]],
  },
  H: {
    traits: [
      { d: 'M 60 0 L 60 600', ouvert: true },
      { d: 'M 340 0 L 340 600', ouvert: true },
      { d: 'M 60 300 L 340 300', ouvert: true },
    ],
    jonctions: [[0, 2], [1, 2]],
  },
  I: {
    traits: [{ d: 'M 200 0 L 200 600', ouvert: true }],
    jonctions: [],
  },
  O: {
    traits: [
      { d: 'M 200 0 A 200 300 0 1 1 200 600 A 200 300 0 1 1 200 0', ouvert: false },
    ],
    jonctions: [],
  },
  P: {
    traits: [
      { d: 'M 80 0 L 80 600', ouvert: true },
      { d: 'M 80 600 A 130 150 0 1 1 80 300', ouvert: true },
    ],
    jonctions: [[0, 1], [0, 1]],
  },
};

export default GLYPHES;
