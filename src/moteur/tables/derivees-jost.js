/**
 * ★ **LES COMPTES DE JOST — la seconde lecture, dérivée comme la première.**
 *
 * Même principe qu'`derivees.js` : rien n'est saisi à la main, tout se calcule
 * depuis les tracés (CONTRACTS §0.3). Deux choses seulement changent, et elles
 * sont exactement celles que l'auteur a nommées.
 *
 * ★ **① LE DESSIN.** Jost est une géométrique sans empattement, là où JetBrains
 *   empatte le `i`, le `I`, le `l`, le `j`, le `t` et le `f`.
 *
 * ★ **② LA RÈGLE DE COMPTAGE DES TRAITS, et c'est elle qui creuse l'écart.**
 *
 *   > « Considère dans JetBrains que tout angle aigu au niveau d'un sommet
 *   >   implique un changement de trait, et considère côté Jost que tout tracé
 *   >   contigu sans repasser au même endroit reste un seul trait (graphe
 *   >   hamiltonien si mes souvenirs sont bons). » (l'auteur)
 *
 *   Le souvenir est presque bon : c'est le chemin **eulérien** — parcourir
 *   chaque ARÊTE une fois — et non hamiltonien, qui parcourt chaque SOMMET une
 *   fois. La nuance compte ici, parce que la formule d'Euler donne la réponse
 *   sans le moindre arbitrage : **un tracé se dessine en `impairs / 2` levées de
 *   crayon**, où `impairs` est le nombre de sommets de degré impair, et au moins
 *   une levée par morceau détaché.
 *
 *   ⚠️ **ET LE POINT DU `i` EST UN MORCEAU DÉTACHÉ.** Compter les impairs
 *     globalement le fondait dans sa hampe et rendait 1 là où un scripteur lève
 *     forcément le crayon. On compte donc composante connexe par composante
 *     connexe — mesuré : sans cela, le total tombait à 79 au lieu de 82.
 *
 * ★ **③ LES BOUCLES NE SONT PAS DOUBLÉES.** « Pas besoin pour les boucles
 *   fermées puisqu'il n'y a pas de changement à cet endroit » (l'auteur), et la
 *   mesure lui donne raison pour la quatrième fois : seize chez JetBrains, seize
 *   chez Jost, les mêmes seize. On les expose quand même — un opérateur qui
 *   voudrait les lire ici doit trouver la même chose qu'ailleurs, et c'est un
 *   contrôle plutôt qu'une duplication.
 *
 * ═══ LES TROIS COMPTES, CÔTE À CÔTE ═══
 *
 *     traits       JetBrains 115  ·  Jost 91 (déclarés)  ·  Jost 82 (eulérien)
 *     extrémités   JetBrains 122  ·  Jost 121
 *     boucles      JetBrains  16  ·  Jost  16
 *
 *   Les neuf traits qui séparent « déclaré » d'« eulérien » tiennent en sept
 *   signes — `e B D E F P R` —, tous des lettres où un fût et une panse, ou un
 *   fût et ses barres, se rejoignent bout à bout : la règle de Jost les soude,
 *   celle de JetBrains les sépare.
 */

import { GLYPHES_JOST, TOLERANCE } from './glyphes-jost.js';
import { deriver } from './derivees.js';

/** Une clé de position, à l'unité près — deux bouts plus proches se confondent. */
const cle = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;

/**
 * ★ **LE NOMBRE DE LEVÉES DE CRAYON, PAR LA FORMULE D'EULER.**
 *
 * Le graphe : un sommet par bout de trait (les bouts assez proches se
 * confondent), une arête par trait. Un tracé fermé est une arête qui revient sur
 * son sommet, ce qui laisse son degré PAIR — c'est bien ce qu'on veut, un anneau
 * se dessine sans lever le crayon.
 *
 * ⚠️ On soude aussi les bouts que les JONCTIONS déclarent en contact : deux
 *   traits qui se touchent sont un seul sommet, sinon chacun garderait un degré
 *   1 et l'on compterait une levée pour un geste continu.
 */
export function levéesDeCrayon(glyphe) {
  const degre = new Map();
  const parent = new Map();
  const racine = (x) => {
    while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
    return x;
  };
  const noeud = (p) => {
    const k = cle(p);
    if (!parent.has(k)) parent.set(k, k);
    return k;
  };

  const d = deriver(glyphe, TOLERANCE);
  const arcs = [];
  for (const s of d.sousChemins) {
    const pts = s.points;
    if (!pts || !pts.length) continue;
    const a = noeud(pts[0]);
    const b = noeud(pts[pts.length - 1]);
    arcs.push([a, b]);
  }

  // Les bouts que les jonctions déclarent en contact ne font qu'un sommet.
  for (const [i, j] of (glyphe.jonctions || []).map((x) => [Number(x[0]), Number(x[1])])) {
    const si = d.sousChemins[i]; const sj = d.sousChemins[j];
    if (!si || !sj) continue;
    for (const a of [si.points[0], si.points[si.points.length - 1]]) {
      for (const b of [sj.points[0], sj.points[sj.points.length - 1]]) {
        if (!a || !b) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) <= TOLERANCE + 2) {
          const ra = racine(noeud(a)); const rb = racine(noeud(b));
          if (ra !== rb) parent.set(ra, rb);
        }
      }
    }
  }

  for (const [a, b] of arcs) {
    for (const x of [a, b]) degre.set(racine(x), (degre.get(racine(x)) || 0) + 1);
  }
  // Les composantes : deux sommets reliés par une arête en font partie.
  for (const [a, b] of arcs) {
    const ra = racine(a); const rb = racine(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const compos = new Map();
  for (const [n, deg] of degre) {
    const r = racine(n);
    if (!compos.has(r)) compos.set(r, 0);
    if (deg % 2 === 1) compos.set(r, compos.get(r) + 1);
  }
  let total = 0;
  for (const [, impairs] of compos) total += Math.max(1, impairs / 2);
  return total;
}

/**
 * ★ **LE PARCOURS, ET PAS SEULEMENT SON COMPTE — Hierholzer.**
 *
 * > « Pour la version graphe eulérien, il faudra montrer l'animation où 1 trait
 * >   = tracé continu de ce trait d'un bout à l'autre, puis d'une autre couleur
 * >   tracé suivant. » (l'auteur)
 *
 * ⚠️ **CE N'EST PAS UN ORNEMENT, C'EST LA CONDITION POUR QUE L'OPÉRATEUR SOIT
 *   HONNÊTE.** La table Jost porte 91 sous-chemins ; la règle eulérienne en
 *   compte 82. Animer les sous-chemins montrerait donc 91 gestes au-dessus d'un
 *   opérateur qui en facture 82 — la divergence exacte que le §0.3 interdit :
 *   « ce qui est montré est ce qui est compté ». Il faut le CHEMIN, pas le
 *   nombre.
 *
 * L'algorithme de Hierholzer construit un parcours eulérien en temps linéaire :
 * on avance tant qu'une arête reste libre, et quand on se bloque on recolle la
 * boucle trouvée à l'endroit où l'on s'était arrêté. On le lance depuis un
 * sommet de degré IMPAIR quand il y en a — un chemin ouvert doit commencer par
 * un bout libre —, sinon depuis n'importe lequel, et le tour se referme.
 *
 * @returns {Array<number[]>} un lot d'index de traits par levée de crayon,
 *   dans l'ordre où le crayon les parcourt.
 */
export function parcoursDUnSeulGeste(glyphe) {
  const d = deriver(glyphe, TOLERANCE);
  const { racine, noeud } = _soudure(glyphe, d);
  // Le multigraphe : pour chaque trait, ses deux sommets soudés.
  const arcs = d.sousChemins.map((s, i) => {
    const pts = s.points;
    return {
      i,
      a: racine(noeud(pts[0])),
      b: racine(noeud(pts[pts.length - 1])),
      pris: false,
    };
  });
  const sortants = new Map();
  for (const arc of arcs) {
    for (const x of [arc.a, arc.b]) {
      if (!sortants.has(x)) sortants.set(x, []);
      sortants.get(x).push(arc);
    }
  }
  const degre = (x) => (sortants.get(x) || []).filter((e) => !e.pris).length;

  const lots = [];
  let reste = arcs.length;
  while (reste > 0) {
    // Un départ : un sommet impair d'abord — un chemin ouvert commence par un
    // bout libre —, à défaut n'importe quel sommet encore desservi.
    let depart = null;
    for (const [x] of sortants) if (degre(x) % 2 === 1) { depart = x; break; }
    if (depart === null) for (const [x] of sortants) if (degre(x) > 0) { depart = x; break; }
    if (depart === null) break;

    // Hierholzer : une pile, on avance tant qu'on peut, on dépile en écrivant.
    const pile = [{ sommet: depart, arc: null }];
    const chemin = [];
    while (pile.length) {
      const haut = pile[pile.length - 1];
      const libre = (sortants.get(haut.sommet) || []).find((e) => !e.pris);
      if (!libre) {
        const fini = pile.pop();
        if (fini.arc !== null) chemin.push(fini.arc);
        continue;
      }
      libre.pris = true;
      reste--;
      const suivant = libre.a === haut.sommet ? libre.b : libre.a;
      pile.push({ sommet: suivant, arc: libre.i });
    }
    if (chemin.length) lots.push(chemin.reverse());
  }
  return lots;
}

/** Les sommets soudés par les jonctions déclarées — partagé par les deux calculs. */
function _soudure(glyphe, d) {
  const parent = new Map();
  const racine = (x) => {
    while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
    return x;
  };
  const noeud = (p) => {
    const k = cle(p);
    if (!parent.has(k)) parent.set(k, k);
    return k;
  };
  for (const s of d.sousChemins) {
    if (!s.points || !s.points.length) continue;
    noeud(s.points[0]);
    noeud(s.points[s.points.length - 1]);
  }
  for (const [i, j] of (glyphe.jonctions || []).map((x) => [Number(x[0]), Number(x[1])])) {
    const si = d.sousChemins[i]; const sj = d.sousChemins[j];
    if (!si || !sj) continue;
    for (const a of [si.points[0], si.points[si.points.length - 1]]) {
      for (const b of [sj.points[0], sj.points[sj.points.length - 1]]) {
        if (!a || !b) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) <= TOLERANCE + 2) {
          const ra = racine(noeud(a)); const rb = racine(noeud(b));
          if (ra !== rb) parent.set(ra, rb);
        }
      }
    }
  }
  return { racine, noeud };
}

const MAJ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const MIN = [...'abcdefghijklmnopqrstuvwxyz'];

const table = (signes, lire) => Object.freeze(Object.fromEntries(
  signes.filter((c) => GLYPHES_JOST[c]).map((c) => [c, lire(GLYPHES_JOST[c])]),
));

/** Levées de crayon, règle eulérienne — capitales. */
export const TRAITS_JOST_MAJ = table(MAJ, levéesDeCrayon);
/** Levées de crayon, règle eulérienne — bas de casse. */
export const TRAITS_JOST_MIN = table(MIN, levéesDeCrayon);
/** Extrémités libres — capitales. */
export const EXTREMITES_JOST_MAJ = table(MAJ, (g) => deriver(g, TOLERANCE).extremites);
/** Extrémités libres — bas de casse. */
export const EXTREMITES_JOST_MIN = table(MIN, (g) => deriver(g, TOLERANCE).extremites);
/** Boucles — exposées pour CONTRÔLE, pas pour être facturées (voir l'en-tête). */
export const BOUCLES_JOST_MAJ = table(MAJ, (g) => deriver(g, TOLERANCE).boucles);
/** Boucles — bas de casse. */
export const BOUCLES_JOST_MIN = table(MIN, (g) => deriver(g, TOLERANCE).boucles);

/**
 * La mesure d'un signe, même signature que `derivees.js › mesure`.
 *
 * ⚠️ `boucles` n'est PAS servie ici : l'auteur l'a exclue de la variante, et un
 *   opérateur qui la demanderait à Jost obtiendrait le même nombre qu'à
 *   JetBrains. Rendre `null` plutôt que ce doublon dit la règle au lieu de la
 *   contourner en silence.
 */
export function mesureJost(metrique, casse, c) {
  const tbl = {
    traits: casse === 'maj' ? TRAITS_JOST_MAJ : TRAITS_JOST_MIN,
    extremites: casse === 'maj' ? EXTREMITES_JOST_MAJ : EXTREMITES_JOST_MIN,
  }[metrique];
  if (!tbl || typeof c !== 'string' || c.length !== 1) return null;
  const k = casse === 'maj' ? c.toUpperCase() : c.toLowerCase();
  const v = tbl[k];
  return v === undefined ? null : v;
}
