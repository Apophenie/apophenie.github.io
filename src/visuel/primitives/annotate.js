/**
 * `annotate` — étiquette explicative, éventuellement fléchée.
 *
 * Recherche §4.13. Le texte de l'annotation est fourni par le scénario : c'est
 * de la pédagogie, pas de la décoration. Il est aussi repris dans le Registre
 * accessible via `step.caption` — la scène SVG étant `aria-hidden` (CONTRACTS §6).
 */

import { targetsOf } from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE, DEFAULT_DUR } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'annotate';

/**
 * La casse d'une annotation qui COMMENTE — la moitié de celle des jetons.
 *
 * C'est le réglage historique, et il est juste pour ce qu'il sert : une
 * étiquette qui se lit en second doit se voir sans se disputer la ligne. Il
 * cesse de l'être dès que l'annotation n'est plus un commentaire mais une
 * NOTATION (voir `taille`, plus bas).
 */
const TAILLE_COMMENTAIRE = 0.55;

/**
 * La durée NOMINALE d'une annotation — celle du vocabulaire (`constants.js`).
 *
 * Elle sert de plafond au geste d'ENTRÉE, qui ne s'allonge pas quand
 * l'étiquette doit tenir : une désignation qui accompagne un rangement de
 * quatre secondes n'entre pas en quatre secondes, elle entre puis attend.
 */
const DUREE_NOMINALE = DEFAULT_DUR.annotate;

/**
 * D'où l'annotation arrive : de quelques unités en deçà de sa place, du côté
 * où elle se pose. Le glissement est ce qui la fait lire comme une venue, et
 * non comme une apparition.
 */
function depart(at, place) {
  if (place === 'left') return { x: at.x - 10, y: at.y };
  if (place === 'right') return { x: at.x + 10, y: at.y };
  return { x: at.x, y: at.y + (place === 'above' ? 10 : -10) };
}

export function plan(ctx) {
  const text = ctx.op.text;
  if (typeof text !== 'string' || !text.trim()) {
    fail(`${ctx.where}« text » non vide obligatoire.`);
  }
  const ids = ctx.op.anchor !== undefined
    ? ctx.scene.resolve(ctx.op.anchor, ctx.where)
    : targetsOf(ctx);
  const box = bboxOf(ids, ctx.scene.positions, ctx.metrics, 6);
  if (!box) fail(`${ctx.where}aucune ancre positionnée pour l'annotation.`);

  // ★ QUATRE CÔTÉS, ET LE POURQUOI DES DEUX DERNIERS.
  //
  //   Une annotation commente, donc elle se pose au-dessus ou au-dessous : deux
  //   places suffisaient tant qu'il s'agissait de nommer. Encadrer est un autre
  //   besoin — `|−28|` n'est pas un commentaire sur le nombre, c'est une
  //   NOTATION qui l'entoure, et elle n'a de sens qu'à sa gauche et à sa droite.
  //   « Durant la transition, le nombre devrait être encadré par le symbole de
  //   abs » (l'auteur, à propos de `p.abs`).
  //
  //   Les deux nouvelles places se calent sur le FLANC de la boîte et se
  //   centrent verticalement dessus ; elles n'entrent pas dans le flux, comme
  //   toute annotation, donc elles ne poussent rien.
  const place = ctx.op.place || 'below';
  if (!['above', 'below', 'left', 'right'].includes(place)) {
    fail(`${ctx.where}« place » = ${JSON.stringify(place)} — les quatre côtés modélisés sont above, below, left, right.`);
  }
  const above = place === 'above';
  const deCote = place === 'left' || place === 'right';
  // ★ À QUELLE DISTANCE — et ce n'est pas la même selon ce qu'on annote.
  //
  //   Une conclusion (« 666 ») se pose à distance de lecture : elle commente
  //   toute la ligne, et la coller au dernier jeton la ferait passer pour une
  //   suite de celui-ci. Une DÉSIGNATION (« MAX » au-dessus d'un nombre, « ^ »
  //   sous une initiale) fait l'inverse : elle ne vaut que pour CE jeton-là, et
  //   c'est la proximité qui l'attache — « MAX et MIN sont trop loin au-dessus
  //   du nombre qu'ils désignent » (l'auteur). L'écart se déclare donc, en
  //   fractions de casse, et vaut la distance de lecture par défaut.
  const ecart = typeof ctx.op.ecart === 'number' && ctx.op.ecart > 0 ? ctx.op.ecart : 1.05;

  // ★ À QUELLE TAILLE — et pourquoi une NOTATION n'a pas celle d'un commentaire.
  //
  //   Une annotation commente : elle se lit en second, et sa demi-casse
  //   (`TAILLE_COMMENTAIRE`) dit exactement cela — voici un mot sur ce qui est
  //   écrit, pas ce qui est écrit. Une NOTATION est l'inverse : les barres de
  //   `|−28|` ne commentent pas le nombre, elles l'ENTOURENT, et elles font
  //   partie de l'expression au même titre que ses chiffres.
  //
  //   « Elles sont plus petites que les nombres associés » (l'auteur). C'était
  //   exact et c'était faux à deux titres : à la demi-casse, une barre est
  //   moitié moins haute que le `2` qu'elle encadre — une notation qui
  //   n'atteint pas ce qu'elle enserre ne l'enserre pas —, et le gris de
  //   commentaire la posait en retrait d'un nombre en phosphore, c'est-à-dire
  //   à côté de l'expression plutôt que dedans.
  //
  //   La taille se déclare donc, en casse pleine, et le TON suit : `1` et la
  //   couleur des nombres pour une notation, la demi-casse grise par défaut
  //   pour tout ce qui reste un commentaire.
  const taille = typeof ctx.op.taille === 'number' && ctx.op.taille > 0
    ? ctx.op.taille : TAILLE_COMMENTAIRE;
  const teinte = typeof ctx.op.ton === 'string' && ctx.palette[ctx.op.ton]
    ? ctx.palette[ctx.op.ton] : ctx.palette.fg2;

  const dy = ctx.metrics.fontSize * ecart;
  // ★ De côté, l'écart se mesure de BORD à BORD, pas de bord à centre. Une
  //   étiquette est ancrée sur son milieu (`text-anchor: middle`) : à la
  //   demi-casse la différence était d'un quart de chasse et ne se voyait pas,
  //   mais une barre en casse pleine, posée à un demi-cadratin du nombre,
  //   chevauchait son premier chiffre.
  const demi = (ctx.metrics.advance * taille * [...text].length) / 2;
  const dx = demi + ctx.metrics.advance
    * (typeof ctx.op.ecart === 'number' && ctx.op.ecart > 0 ? ctx.op.ecart : 0.45);
  const at = deCote
    ? { x: place === 'left' ? box.x - dx : box.x + box.w + dx, y: box.y + box.h / 2 }
    : { x: box.cx, y: above ? box.y - dy : box.y + box.h + dy };

  // ★ SUIVRE SON JETON — quand l'étiquette DÉSIGNE au lieu de conclure.
  //
  //   Une annotation se pose à un endroit et y reste : c'est ce qu'il faut d'une
  //   conclusion, qui commente la ligne entière et à qui rien n'arrive. Une
  //   DÉSIGNATION vit autrement — « MAX » ne parle pas de la ligne, il parle de
  //   CE nombre-là, et si le nombre bouge sans lui, l'étiquette se met à
  //   désigner son voisin.
  //
  //   ⚠️ MESURÉ sur `c.maxMoinsMin`, où le geste range le max devant le min
  //   avant de poser le signe : `MAX` restait à la place que `16` occupait, et
  //   c'est `5` — le MINIMUM — qui venait s'y installer. L'étiquette annonçait
  //   donc le contraire de ce qu'elle désignait, pendant huit dixièmes de
  //   seconde. « MAX et MIN devraient suivre leur nombre » (l'auteur).
  //
  //   L'accrochage est celui des cornes et du halo (`scene.satellitesDe`), à
  //   l'écart près : une étiquette n'est pas POSÉE sur son jeton, elle est
  //   posée à côté, et c'est cet écart-là qu'elle emporte (`data.decalage`).
  const suit = ctx.op.suit === true && ids.length === 1 ? ids[0] : null;
  const ancre = suit ? ctx.scene.pos(suit) : null;

  const id = ctx.op.id && !String(ctx.op.id).startsWith('@') ? ctx.op.id : ctx.gensym('annot');
  ctx.scene.create({
    id, role: 'label', text, inFlow: false,
    w: ctx.metrics.advance * taille * [...text].length,
    data: {
      scale: taille,
      ...(ancre ? { suit, decalage: { dx: at.x - ancre.x, dy: at.y - ancre.y } } : {}),
    },
    base: { opacity: 0, fill: teinte, translate: depart(at, place) },
  }, { where: ctx.where });
  ctx.scene.place(id, depart(at, place));
  // ★ L'ARRIVÉE A SA PROPRE LONGUEUR, indépendante de la TENUE.
  //
  //   Elle valait sept dixièmes de la durée de l'op, ce qui est juste tant que
  //   cette durée EST le geste. Une étiquette qui doit tenir plusieurs secondes
  //   — le temps qu'on range les nombres qu'elle désigne — déclare une durée
  //   longue, et son entrée s'étirait d'autant : dix unités de glissement sur
  //   quatre secondes et demie, c'est-à-dire une dérive imperceptible qui
  //   n'entre jamais vraiment, et qui entrait en collision avec les
  //   déplacements de son jeton (« animations concurrentes », `compile.js`).
  //
  //   L'entrée est donc plafonnée à la longueur nominale d'une annotation :
  //   au-delà, ce qui s'allonge est le temps de LECTURE, pas le geste d'entrer.
  const entree = Math.min(ctx.dur, DUREE_NOMINALE) * 0.7;
  ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: entree });
  ctx.place(id, at, { at: 0, dur: entree });

  // ★ FUGACE — l'étiquette qui NOMME un geste, et s'en va avec lui.
  //
  //   Une annotation ordinaire reste : c'est une conclusion, elle appartient à
  //   ce qui suit. Nommer une transformation est autre chose — « on retire les
  //   accents », « en capitales » — : la mention accompagne le geste, et si
  //   elle survivait, la ligne finirait couverte de sous-titres d'étapes déjà
  //   jouées. Elle paraît, elle tient le temps qu'on la lise, elle s'efface.
  if (ctx.op.fugace) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: ctx.dur * 0.78, dur: Math.max(1, ctx.dur * 0.22), ease: EASE.fade });
  }

  if (ctx.op.arrow) {
    const aid = ctx.gensym('arrow');
    const y0 = above ? box.y - 6 : box.y + box.h + 6;
    const y1 = above ? at.y + 16 : at.y - 16;
    const d = `M 0 ${y1 - at.y} L 0 ${y0 - at.y}`;
    ctx.scene.create({
      id: aid, role: 'bracket', inFlow: false, w: 2, data: { d },
      base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.fg3 },
    }, { where: ctx.where });
    ctx.scene.place(aid, at);
    ctx.anim({ id: aid, prop: 'strokeDashoffset', from: 100, to: 0, at: ctx.dur * 0.2, dur: ctx.dur * 0.6, ease: EASE.fade });
  }
}
