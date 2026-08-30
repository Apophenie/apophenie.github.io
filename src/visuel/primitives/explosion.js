/**
 * ★ L'EXPLOSION DU 6 SURNUMÉRAIRE — le geste que le verdict devait au 6 de trop.
 *
 * > « `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#…` insère une étape 24 pour
 * > retirer le 6 excédentaire alors que c'est durant le verdict, une fois les 6
 * > collés les uns contre les autres, que le 6 central devrait disparaître par
 * > explosion pour propulser les deux triptyques dans leur agrandissement. »
 * > (l'auteur)
 *
 * ## Ce que ce module n'est PAS
 *
 * **Ce n'est pas une op du vocabulaire** (CONTRACTS §3.1), et pour exactement
 * l'argument qui garde l'orage dehors : le vocabulaire nomme les gestes DE LA
 * DÉMONSTRATION, ceux dont Le Registre doit rendre compte. Or le retrait du 6
 * en trop est déjà nommé — il voyage dans `reveal.surnumeraires`, il se lit
 * dans l'inventaire du scénario (`recherche/scenario.js › inventaire`), et Le
 * Registre y trouve tout ce qu'il a à dire : ce jeton-là s'en va au verdict. Ce
 * que ce fichier ajoute, c'est la FORME de ce départ — donc de la mise en
 * scène, pas un geste de plus. Une vingt-deuxième primitive aurait coûté cinq
 * tables à tenir d'accord pour ne rien nommer de neuf.
 *
 * **Ce n'est pas non plus un `drop`.** Un `drop` fait TOMBER : la gravité, un
 * jeton qui s'en va par le bas, et rien qui bouge autour de lui. Ce qu'on
 * demande ici est son contraire exact — un départ qui POUSSE, et dont la
 * poussée se lit sur ceux qui restent. Deux gestes de sens opposé ne partagent
 * pas un mode.
 *
 * ## Les trois choses qui se passent, et l'ordre compte
 *
 *  1. **le 6 se dilate et s'efface** — il ne pâlit pas sur place, il éclate :
 *     `scale` monte franchement pendant que l'opacité tombe. C'est le seul
 *     temps qui existe dans les DEUX registres, parce que c'est le seul qui
 *     soit un fait : il y avait sept 6, le verdict en révèle six ;
 *  2. **le SOUFFLE** — une couronne d'éclats projetés vers l'extérieur, qui
 *     s'amenuisent en s'éloignant. Registre scénique uniquement, même partage
 *     que les cornes et l'orage ;
 *  3. **la propulsion** — elle n'est pas ici. C'est `reveal` qui fait partir
 *     l'agrandissement à l'instant même de l'explosion : la causalité s'écrit
 *     dans les horloges, pas dans un dessin.
 *
 * ## Le dessin : un TRACÉ, fonction pure du temps
 *
 * Le souffle est un seul nœud portant un seul chemin à plusieurs sous-tracés,
 * redessiné par un canal DISCRET (`ctx.discrete`) — exactement la technique de
 * l'effritement des cornes (`horns.js › corneEffritee`), et pour les mêmes
 * deux raisons. La première est la fluidité : le nœud voisin porte
 * l'agrandissement du verdict, et une opacité (ou un filtre) animée sur un
 * élément transformé est la recette du défaut de composition mesuré sur le feu.
 * La seconde est le scrubbing : `render(u)` est une fonction de `u`, donc du
 * temps de la timeline, donc `seek()` en arrière retombe au pixel près sur la
 * même image (CONTRACTS §4.4).
 *
 * ★ **Et rien n'est tiré au sort.** Neuf éclats, neuf allonges écrites à la
 * main (`ALLONGES`) : la variété est déclarée, pas simulée. Un `Math.random()`
 * aurait donné une explosion différente à chaque lecture — c'est-à-dire une
 * démonstration qui ne se rejoue pas.
 */

import { EASE } from '../constants.js';

/** Nombre d'éclats. Neuf : assez pour faire une couronne, pas un feu d'artifice. */
const ECLATS = 9;

/**
 * L'allonge de chaque éclat, en part du rayon nominal.
 *
 * ★ Elles ne sont ni égales ni aléatoires, et les deux comptent. Égales, la
 * couronne devient une roue dentée — un motif, donc un objet, donc plus une
 * explosion. Tirées au sort, elles cesseraient d'être une fonction du temps.
 * Écrites, elles sont les deux à la fois : irrégulières et rejouables.
 *
 * La suite ne se referme pas sur elle-même (neuf valeurs pour neuf éclats, sans
 * symétrie d'ordre deux ni de trois) : c'est ce qui empêche l'œil d'y lire un
 * axe.
 */
const ALLONGES = Object.freeze([1, 0.72, 1.18, 0.88, 1.31, 0.66, 1.06, 0.94, 1.22]);

/** Le décalage angulaire de la couronne, en tours. Ni horizontale, ni verticale. */
const BIAIS = 0.06;

/**
 * Géométrie du souffle, en hauteurs de police — **avant** l'homothétie du
 * verdict (voir `exploser`, `homothetie`).
 *
 * `rayon` n'est pas choisi à l'œil : porté par l'agrandissement (×4 sur deux
 * séries), il place la pointe des éclats à un peu moins de la moitié de la
 * demi-largeur du verdict — assez pour mordre sur les deux triptyques qu'il
 * écarte, jamais assez pour les recouvrir. Et il reste en deçà de la
 * demi-hauteur de scène : un éclat qui sort du cadre ne se lit plus comme un
 * éclat, il se lit comme un bord.
 */
const SOUFFLE = Object.freeze({
  rayon: 1.05,        // jusqu'où l'éclat le plus long s'en va
  longueur: 0.42,     // sa longueur au départ — deux cinquièmes de son vol
  demiLargeur: 0.07,  // sa demi-largeur au pied, au départ
});

/** Ce à quoi le 6 se dilate avant de disparaître. */
const DILATATION = 3;

/**
 * ★ LE TRACÉ DU SOUFFLE à l'instant `u ∈ [0,1]` — fonction PURE.
 *
 * Chaque éclat est un fuseau à trois points : la pointe, dehors, et deux pieds
 * en arrière. Il part du centre, s'éloigne vite puis ralentit (`1−(1−u)²`, la
 * décélération d'un débris dans l'air), rétrécit tout du long, et n'est plus
 * rien quand `u` vaut un.
 *
 * @param {number} u
 * @param {{rayon:number, longueur:number, demiLargeur:number}} m — en unités de scène
 * @returns {string} un `d` à neuf sous-tracés fermés
 */
export function souffleD(u, m) {
  const t = Math.max(0, Math.min(1, u));
  // La course : rapide d'abord, freinée ensuite. `u=0` ⇒ tout est au centre.
  const course = 1 - (1 - t) * (1 - t);
  // Ce qui reste de l'éclat : il s'amenuise linéairement, et disparaît avec la
  // fin du geste. Un éclat qui garderait sa taille jusqu'au bout puis
  // s'éteindrait d'un coup se lirait comme une coupure, pas comme un souffle.
  const reste = 1 - t;
  const sousTraces = [];
  for (let k = 0; k < ECLATS; k++) {
    const a = 2 * Math.PI * (k / ECLATS + BIAIS);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const allonge = ALLONGES[k % ALLONGES.length];
    const pointe = m.rayon * allonge * course;
    const pied = Math.max(0, pointe - m.longueur * allonge * reste);
    const demi = m.demiLargeur * reste;
    if (pointe - pied < 1e-3 || demi < 1e-3) continue;
    // Le repère de l'éclat : `cos/sin` vers l'extérieur, sa normale en travers.
    const px = cos * pointe;
    const py = sin * pointe;
    const bx = cos * pied;
    const by = sin * pied;
    const nx = -sin * demi;
    const ny = cos * demi;
    sousTraces.push(
      `M ${r(px)} ${r(py)} L ${r(bx + nx)} ${r(by + ny)} L ${r(bx - nx)} ${r(by - ny)} Z`,
    );
  }
  // Jamais de chaîne vide : un `d` absent fait disparaître l'élément du DOM
  // pour le compositeur, et le canal discret n'aurait plus rien à réécrire.
  return sousTraces.length ? sousTraces.join(' ') : 'M 0 0 Z';
}

/**
 * Fait exploser des jetons, et rend les nœuds de souffle créés.
 *
 * Les jetons ne sont PAS retirés du flux ici : c'est à l'appelant de le faire,
 * au moment qui l'arrange — `reveal` a besoin qu'ils comptent encore dans le
 * rassemblement et ne comptent plus dans l'agrandissement, et c'est l'ordre de
 * ces deux mises en page qui décide, pas nous.
 *
 * ★ **Et le souffle SUIT L'AGRANDISSEMENT DU VERDICT** (`quand.homothetie`), sur
 * la même courbe et dans la même fenêtre que les chiffres. Deux raisons, et la
 * seconde n'est pas une commodité :
 *
 *  · **d'échelle** — le verdict grossit d'un facteur quatre. Des éclats restés
 *    à leur taille nominale seraient des miettes au pied de glyphes quatre fois
 *    plus hauts, à l'instant même où ils sont censés les pousser ;
 *  · **de CENTRE** — le surnuméraire se tient au milieu de la ligne
 *    rassemblée, et l'homothétie du verdict a pour centre le milieu du groupe.
 *    Ce sont le même point (mesuré : `x = 600` de part et d'autre,
 *    `tests/explosion.test.js`). Un simple `scale`, sans arithmétique de
 *    rattrapage, suffit donc à faire du souffle un objet du même repère que ce
 *    qu'il écarte — exactement l'argument qui donne son `scale` aux cornes.
 *
 * @param {object} ctx
 * @param {string[]} ids — les surnuméraires, dans l'ordre de la ligne
 * @param {{at:number, dur:number, encre:string, souffle:boolean,
 *          homothetie:{to:number, at:number, dur:number, ease:string}}} quand
 * @returns {string[]} les identifiants des nœuds de souffle (vide hors scénographie)
 */
export function exploser(ctx, ids, quand) {
  const at = Math.max(0, quand.at ?? 0);
  const dur = Math.max(1, quand.dur ?? ctx.dur);
  const fs = ctx.metrics.fontSize;
  const m = {
    rayon: fs * SOUFFLE.rayon,
    longueur: fs * SOUFFLE.longueur,
    demiLargeur: fs * SOUFFLE.demiLargeur,
  };
  // Deux surnuméraires n'explosent pas à la même milliseconde : simultanés, ils
  // ne font qu'un seul éclat plus large. Le décalage mange au plus un cinquième
  // du geste, comme celui des cornes qui s'effritent.
  const cadence = ids.length > 1 ? (dur * 0.2) / (ids.length - 1) : 0;
  const propre = Math.max(1, dur - cadence * (ids.length - 1));
  const souffles = [];
  ids.forEach((id, k) => {
    const t0 = at + k * cadence;
    // Le 6 se dilate — `pop`, la courbe du coup de poing — et s'efface plus
    // vite qu'il ne grossit : ce qui se voit est la dilatation, pas le glyphe.
    ctx.anim({ id, prop: 'scale', to: DILATATION, at: t0, dur: propre, ease: EASE.pop });
    ctx.anim({ id, prop: 'fill', to: quand.encre, at: t0, dur: Math.max(1, propre * 0.3) });
    ctx.anim({
      id, prop: 'opacity', to: 0,
      at: t0, dur: Math.max(1, propre * 0.55), ease: EASE.fade,
    });
    if (!quand.souffle) return;
    const sid = `@souffle:${id}`;
    const ou = ctx.scene.pos(id);
    if (!ou) return;
    ctx.scene.create({
      id: sid,
      role: 'souffle',
      inFlow: false,
      w: m.rayon * 2,
      // ★ PAS de `suit`, et l'échelle est donnée à la main quelques lignes plus
      //   bas. Un décor accroché SUIT son porteur à chaque reflow ; or le
      //   porteur, ici, est en train de disparaître, et le souffle appartient à
      //   la PLACE qu'il occupait — pas à ce qu'il devient. Il est posé là, une
      //   fois, et il s'y consume. De l'accrochage on ne veut donc que la
      //   moitié « échelle », et c'est celle-là qu'on écrit.
      data: { d: souffleD(0, m) },
      base: { opacity: 1, fill: quand.encre },
    }, { where: ctx.where });
    ctx.place(sid, { x: ou.x, y: ou.y, w: m.rayon * 2 });
    ctx.discrete({
      id: sid,
      channel: 'd',
      at: t0,
      dur: propre,
      render: (u) => souffleD(u, m),
    });
    // Le souffle appartient au repère du verdict : il grandit avec lui, sur sa
    // courbe et dans sa fenêtre (voir l'en-tête de la fonction).
    const h = quand.homothetie;
    if (h && h.to > 1) {
      ctx.anim({ id: sid, prop: 'scale', to: h.to, at: h.at, dur: h.dur, ease: h.ease });
    }
    souffles.push(sid);
  });
  return souffles;
}

function r(v) {
  return Math.round(v * 100) / 100;
}
