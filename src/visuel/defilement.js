/**
 * Défilement horizontal — « jamais deux lignes, on fait défiler ».
 *
 * ## La doctrine
 *
 * `research/moteur-visuel.md §5.2` prévoyait de repasser en **plusieurs
 * lignes** sous un seuil de largeur. Ce n'est plus le cas. Une séquence se lit
 * d'un bout à l'autre : la couper en deux au milieu d'une URL invente une
 * frontière qui n'existe pas, et le regard perd le fil exactement là où la
 * démonstration prétend le tenir. La ligne reste donc **une seule ligne**,
 * quelle que soit sa longueur ; quand elle déborde, c'est la **vue** qui se
 * déplace, pas le texte qui se replie.
 *
 * ## Ce qui bouge, et jamais ce qui ne doit pas bouger
 *
 * CONTRACTS §3.2 règle 6 : on n'anime **jamais** l'attribut `viewBox`. Le
 * défilement est le `transform` d'un groupe, `@pan`, imbriqué dans le contenu
 * de la caméra (voir `constants.PAN_ID` pour l'ordre d'imbrication et sa
 * raison d'être).
 *
 * ## Comment la caméra suit l'action, sans la poursuivre
 *
 * Un panoramique recalculé à chaque image donnerait le mal de mer. Le calcul
 * est donc fait **une fois par step**, à la compilation, et il ne dépend que du
 * layout — donc du temps, donc il est rejouable à l'identique en arrière et
 * scrubbable par construction.
 *
 * Trois valeurs, une seule animation à trois keyframes :
 *
 *  1. `panPrecedent` — là où la vue était à la fin du step précédent ;
 *  2. `panFocus` — l'action **du step** amenée au centre, calculée sur les
 *     positions d'AVANT le step (c'est ce que le spectateur va regarder) ;
 *  3. `panRepos` — le cadrage d'APRÈS le step. Sans lui, une somme qui ramasse
 *     dix jetons en un seul laisserait la ligne, soudain courte, plantée hors
 *     du cadre jusqu'au step suivant.
 *
 * Quand la ligne tient dans la scène — le cas courant — les trois valent zéro
 * et **aucune animation n'est émise** : rien ne bouge, il n'y a rien à suivre.
 *
 * ## Mouvement réduit
 *
 * `prefers-reduced-motion` demande l'état d'arrivée sans le trajet. Un
 * défilement n'est **que** du trajet : il n'y a donc pas de « panoramique
 * réduit ». La vue est simplement posée sur son cadrage de repos, d'un coup,
 * comme tout le reste dans ce mode.
 */

import { bboxOf } from './layout.js';
import { MARGIN } from './constants.js';

/** Les clés qui font d'un objet un sélecteur de cibles (voir `Scene.resolve`). */
const CLES_SELECTEUR = ['group', 'groupNot', 'kind', 'all'];

/**
 * `dim` ne désigne pas le sujet — il désigne tout le reste.
 *
 * « On isole le premier morceau » s'écrit `highlight {group:'g0'}` **et**
 * `dim {groupNot:'g0'}` : le deuxième sélecteur ramasse toute la ligne, et
 * cadrer là-dessus reviendrait à ne jamais cadrer sur rien. Les cibles d'un
 * `dim` sont donc ignorées tant qu'une autre op du step dit quelque chose.
 */
const OPS_HORS_SUJET = new Set(['dim']);

/**
 * Les jetons que ce step regarde — ceux qu'il faut avoir sous les yeux.
 *
 * On ne demande pas au scénario de le dire : on le déduit de ses ops. Toute
 * chaîne qui NOMME un jeton vivant est une cible ; tout objet qui est un
 * sélecteur (`{group:'g1'}`) est résolu. Le reste — les mots du vocabulaire,
 * les libellés, les identifiants de jetons pas encore créés — ne désigne rien
 * qui soit à l'écran, et se trouve écarté par la seule appartenance à la scène.
 *
 * @param {object} step
 * @param {import('./scene.js').Scene} scene
 * @param {{vivants?:boolean}} [opt] `vivants` : ne garder que ce qui est encore là
 * @returns {string[]}
 */
export function ciblesDuStep(step, scene, opt = {}) {
  const out = new Set();
  const vivantsSeuls = opt.vivants === true;

  const garder = (id) => {
    const n = scene.get(id);
    if (!n) return;
    if (vivantsSeuls && !n.alive) return;
    if (!scene.pos(id)) return;
    out.add(id);
  };

  const visiter = (v) => {
    if (typeof v === 'string') { garder(v); return; }
    if (Array.isArray(v)) { v.forEach(visiter); return; }
    if (!v || typeof v !== 'object') return;
    const cles = Object.keys(v);
    if (cles.length && cles.every((k) => CLES_SELECTEUR.includes(k))) {
      // Un sélecteur ne désigne que des jetons vivants du flux : `resolve` s'en
      // charge, et ne peut pas échouer sur ces quatre formes.
      for (const id of scene.resolve(v, '')) garder(id);
      return;
    }
    for (const val of Object.values(v)) visiter(val);
  };

  for (const op of step.ops || []) {
    if (op && OPS_HORS_SUJET.has(op.op)) continue;
    visiter(op);
  }
  // Un step qui ne fait qu'estomper : c'est bien lui, le sujet, faute d'autre.
  if (!out.size) for (const op of step.ops || []) visiter(op);
  return [...out];
}

/** Boîte englobante de la ligne — tout ce qui est encore dans le flux. */
export function boiteDuFlux(scene) {
  return bboxOf(scene.flow, scene.positions, scene.metrics, 0);
}

/**
 * Le décalage de vue qui amène `focus` au centre, sans jamais découvrir de vide.
 *
 * Trois règles, dans cet ordre :
 *
 *  1. **La ligne tient ?** Alors rien ne défile : le layout la centre déjà.
 *     C'est le cas de l'immense majorité des saisies, et il ne coûte rien.
 *  2. **L'action est déjà sous les yeux ?** Alors la vue ne bouge pas non plus.
 *     C'est la « zone morte », et c'est elle qui fait la différence entre une
 *     caméra qui accompagne et une caméra qui poursuit : quatre steps de suite
 *     sur le même morceau de texte donnent quatre fois zéro mouvement, au lieu
 *     de quatre recadrages d'une poignée d'unités dont chacun se voit.
 *  3. Sinon, l'action vient au centre — **sans jamais découvrir de vide**. Le
 *     bord gauche de la ligne ne peut pas entrer dans la scène tant qu'il reste
 *     du texte à droite, et réciproquement : sans ce bridage, cadrer le premier
 *     jeton d'une longue URL laisserait les deux tiers de la scène vides.
 *
 * @param {?{cx:number,x:number,w:number}} focus   ce qu'on veut voir
 * @param {?{x:number,w:number}} contenu           toute la ligne
 * @param {{centerX:number, maxWidth:number}} layoutOpts
 * @param {{x:number,w:number}} viewBox
 * @param {{x:number,y:number}} [actuel]           le cadrage en vigueur
 * @returns {{x:number,y:number}}
 */
export function panPour(focus, contenu, layoutOpts, viewBox, actuel = { x: 0, y: 0 }) {
  if (!contenu || contenu.w <= layoutOpts.maxWidth) return { x: 0, y: 0 };

  const min = (viewBox.x + viewBox.w - MARGIN) - (contenu.x + contenu.w);
  const max = (viewBox.x + MARGIN) - contenu.x;
  const brider = (x) => (x < min ? min : x > max ? max : x);
  const courant = { x: arrondir(brider(actuel.x)), y: 0 };

  // Rien de désigné — un simple `move` de réarrangement, un `wait`, ou un step
  // dont toutes les cibles viennent d'être consommées. Ce qui s'est passé s'est
  // passé LÀ : on y reste. Recentrer sur « toute la ligne » ramènerait la vue
  // au milieu du texte juste après avoir montré son début.
  if (!focus) return courant;

  const bordG = viewBox.x + MARGIN;
  const bordD = viewBox.x + viewBox.w - MARGIN;
  if (focus.x + courant.x >= bordG && focus.x + focus.w + courant.x <= bordD) return courant;
  return { x: arrondir(brider(layoutOpts.centerX - focus.cx)), y: 0 };
}

/** Deux cadrages sont-ils confondus ? (sous le dixième d'unité viewBox) */
export function memePan(a, b) {
  return Math.abs(a.x - b.x) < 0.1 && Math.abs(a.y - b.y) < 0.1;
}

function arrondir(v) {
  return Math.round(v * 1000) / 1000;
}
