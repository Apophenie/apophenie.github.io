/**
 * `convert` — L'ATELIER DE CONVERSION : une expression monte sous l'accolade,
 * s'y voit égalée à une autre, et c'est l'autre qui redescend à sa place.
 *
 * > « Une nouvelle accolade au-dessus indiquant "Qualification animale" ; vache
 * >   s'y déplace ; au niveau du compteur de l'accolade, vache se retrouve
 * >   suivi de "→ bête à pis" ; puis bête à pis vient prendre la place
 * >   d'origine de vache (en adaptant la largeur de l'accolade et de la barre
 * >   de fraction) ; puis l'accolade s'efface avec "vache →". […] Et quand une
 * >   expression va à la pointe de l'accolade, elle y va centrée, puis ajoute
 * >   flèche et nouvelle expression, puis coulisse pour centrer la cible, puis
 * >   la cible vient prendre la place d'origine (puis disparition de
 * >   l'accolade). » (l'auteur)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ★ **CE QUE `substitute` NE SAIT PAS DIRE, ET POURQUOI ÇA COMPTE ICI.**
 *
 * `substitute` remplace : le jeton d'avant s'efface pendant que celui d'après
 * paraît, au même endroit. C'est le geste juste quand la nouvelle valeur est la
 * MÊME CHOSE autrement écrite — un `5` qui devient `V`, un `44` qui devient
 * `8`. On voit alors une identité, et c'est bien ce qu'on veut voir.
 *
 * Une conversion par RÈGLE est autre chose. « Vache » ne devient pas « bête à
 * pis » : quelqu'un AFFIRME que l'un vaut l'autre, et c'est cette affirmation
 * qu'il faut montrer — sans quoi la substitution passe pour un fait. D'où
 * l'atelier : on sort l'expression de la ligne, on l'écrit à côté de sa
 * traduction sous le nom de la règle invoquée, et l'on ne remet dans la ligne
 * que ce que la règle a produit. Le spectateur voit d'où ça vient.
 *
 * ★ **ET LA FLÈCHE N'EST PAS UN ÉGAL.** « Tu peux remplacer mes `=` par des
 *   flèches pour les conversions des accolades » (l'auteur). Un `=` est
 *   symétrique et se relit dans les deux sens ; `→` dit une DIRECTION, donc une
 *   règle appliquée. C'est plus honnête, et c'est plus exact : « bête à pis »
 *   ne redonne pas « vache ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ## Les six temps
 *
 * ```
 *              ⌢‾‾‾‾‾‾‾‾‾‾⌢          ① l'accolade s'ouvre du côté demandé
 *            Qualification animale    …avec le nom de la RÈGLE
 *              V A C H E              ② l'expression y monte, centrée
 *              V A C H E → bête à pis ③ la flèche et la cible paraissent
 *      V A C H E → bête à pis         ④ l'attelage coulisse : la CIBLE se centre
 *              bête à pis             ⑤ la cible redescend prendre la place
 *                                     ⑥ l'accolade et la source s'effacent
 * ```
 *
 * ★ **LE COULISSEMENT EST LE TEMPS QUI FAIT TOUT COMPRENDRE.** Sans lui, la
 *   cible naîtrait décentrée puis sauterait dans la ligne — deux mouvements
 *   sans rapport. Avec lui, l'axe de l'accolade désigne d'abord ce qu'on
 *   convertit, puis ce qu'on obtient : c'est le même axe qui change de sujet,
 *   et la descente n'est plus qu'une chute verticale.
 *
 * ⚠️ **LA PLACE RESTE RÉSERVÉE.** Les sources ne sont retirées du flux qu'au
 *   moment où la cible y entre, à leur index. Les tuer plus tôt refermerait la
 *   ligne pendant que l'atelier travaille — et sur une fraction, le trou se
 *   verrait doublement : le trait se raccourcirait pour rien, puis se
 *   rallongerait.
 */

import {
  targetsOf, tokenSpec, tracerAccolade, suivreLaZone, espacementDe,
} from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'convert';

/** Découpe du temps — un temps par geste, dans l'ordre où l'œil les lit. */
const TEMPS = Object.freeze({
  ACCOLADE: 0.14,
  MONTEE: 0.18,
  ECRITURE: 0.18,
  COULISSE: 0.16,
  DESCENTE: 0.24,
  RETRAIT: 0.10,
});

/** La flèche, quand l'émetteur n'en dicte pas d'autre. */
const FLECHE = '→';

export function plan(ctx) {
  const sources = targetsOf(ctx);
  if (!sources.length) fail(`${ctx.where}« targets » : rien à convertir.`);

  const brut = ctx.op.to;
  if (!Array.isArray(brut) || !brut.length) {
    fail(`${ctx.where}« to » doit lister les jetons de l'expression obtenue.`);
  }
  const specs = brut.map((s, i) => tokenSpec(ctx, s, `to[${i}]`));

  const sens = ctx.op.sens === 'bas' ? 'bas' : 'haut';
  const s = sens === 'bas' ? 1 : -1;
  const fleche = typeof ctx.op.arrow === 'string' && ctx.op.arrow ? ctx.op.arrow : FLECHE;

  const T = ctx.dur;
  const tAcc = T * TEMPS.ACCOLADE;
  const tMon = T * TEMPS.MONTEE;
  const tEcr = T * TEMPS.ECRITURE;
  const tCou = T * TEMPS.COULISSE;
  const tDes = T * TEMPS.DESCENTE;
  const tRet = T * TEMPS.RETRAIT;

  const fs = ctx.metrics.fontSize;
  const av = ctx.metrics.advance;
  const gap = ctx.layoutOpts.gap;

  // ① L'accolade, du côté demandé, portant le nom de la règle. Elle DÉSIGNE une
  //    zone qu'on va vider — elle ne calcule pas —, donc elle ne promet rien
  //    sous sa pointe : c'est l'atelier qui pose ce qui s'y écrit, pas un
  //    `substitute` venu lire une ancre.
  const acc = tracerAccolade(ctx, sources, {
    shape: 'brace',
    sens,
    label: ctx.op.label || null,
    promet: false,
    marquer: false,
    at: 0,
    dur: tAcc,
  });
  if (!acc) fail(`${ctx.where}l'accolade n'a pas pu être tracée : les sources ne sont pas positionnées.`);

  // Le plan de travail : l'axe de l'accolade, à la hauteur où son résultat se
  // lit. C'est `tracerAccolade` qui le calcule — au-delà de la pointe, au-delà
  // de la légende —, et non ce fichier : deux arithmétiques pour un même point
  // finiraient par diverger.
  const axeX = acc.resultat.x;
  const banc = acc.resultat.y;

  // ② L'expression monte au banc, d'un bloc : même translation pour tous, donc
  //    les écarts internes sont conservés. Un déplacement calculé jeton par
  //    jeton les aurait égalisés, et « VACHE L » aurait perdu son espace.
  const depart = new Map(sources.map((id) => [id, ctx.scene.pos(id)]));
  const boite = bboxOf(sources, ctx.scene.positions, ctx.metrics, 0);
  if (!boite) fail(`${ctx.where}les sources ne sont pas positionnées.`);
  const dxSrc = axeX - boite.cx;
  const dySrc = banc - boite.cy;
  const t2 = tAcc;
  for (const id of sources) {
    const p = depart.get(id);
    ctx.place(id, { x: p.x + dxSrc, y: p.y + dySrc, w: p.w },
      { at: t2, dur: tMon, ease: EASE.move });
  }

  // ③ La flèche, puis la cible, à la droite de l'expression montée.
  const droiteSrc = boite.x + boite.w + dxSrc;
  const wFleche = av;
  const xFleche = droiteSrc + gap * 2 + wFleche / 2;

  const fid = ctx.gensym('fleche');
  ctx.scene.create({
    id: fid, role: 'text', text: fleche, kind: 'operator', inFlow: false, w: wFleche,
    base: { opacity: 0, fill: ctx.palette.fg2 },
  }, { where: ctx.where });
  ctx.scene.place(fid, { x: xFleche, y: banc, w: wFleche });

  // Les jetons de la cible naissent hors flux, alignés à droite de la flèche,
  // avec leurs propres écarts (`gapBefore`) — c'est là que les espaces d'une
  // expression comme « bête à pis » se posent.
  let curseur = xFleche + wFleche / 2 + gap * 2;
  const poses = [];
  for (const spec of specs) {
    const w = Math.max(1, [...spec.text].length) * av;
    const ecart = spec.gapBefore !== undefined ? spec.gapBefore : 0;
    curseur += poses.length ? ecart : 0;
    ctx.scene.create({
      ...spec,
      role: 'text',
      inFlow: false,
      w,
      base: { opacity: 0 },
    }, { where: ctx.where });
    ctx.scene.place(spec.id, { x: curseur + w / 2, y: banc, w });
    poses.push({ id: spec.id, w, x: curseur + w / 2 });
    curseur += w + gap;
  }
  const gaucheCible = poses.length ? poses[0].x - poses[0].w / 2 : curseur;
  const droiteCible = poses.length ? poses[poses.length - 1].x + poses[poses.length - 1].w / 2 : curseur;

  const t3 = t2 + tMon;
  ctx.anim({ id: fid, prop: 'opacity', to: 1, at: t3, dur: tEcr * 0.4, ease: EASE.fade });
  poses.forEach((p, k) => {
    ctx.anim({
      id: p.id, prop: 'opacity', to: 1,
      at: t3 + tEcr * 0.25 + k * (tEcr * 0.45) / Math.max(1, poses.length),
      dur: tEcr * 0.4, ease: EASE.fade,
    });
  });

  // ④ Le coulissement : l'attelage entier glisse pour que la CIBLE se centre
  //    sur l'axe. L'accolade ne bouge pas — c'est elle le repère.
  const dxCoul = axeX - (gaucheCible + droiteCible) / 2;
  const t4 = t3 + tEcr;
  const attelage = [...sources, fid, ...poses.map((p) => p.id)];
  for (const id of attelage) {
    const p = ctx.scene.pos(id);
    if (!p) continue;
    ctx.place(id, { x: p.x + dxCoul, y: p.y, w: p.w }, { at: t4, dur: tCou, ease: EASE.move });
  }

  // ⑤ La cible prend la place. Les sources quittent le flux à l'instant où la
  //    cible y entre, à leur index : la ligne ne s'est jamais refermée entre
  //    les deux.
  const t5 = t4 + tCou;
  const index = Math.min(...sources.map((id) => ctx.scene.flowIndex(id)).filter((i) => i >= 0));
  const heritage = espacementDe(ctx, sources[0]);
  for (const id of sources) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t5, dur: tDes * 0.4, ease: EASE.fade });
    ctx.scene.kill(id, ctx.where);
  }
  ctx.anim({ id: fid, prop: 'opacity', to: 0, at: t5, dur: tDes * 0.4, ease: EASE.fade });
  ctx.scene.kill(fid, ctx.where);

  poses.forEach((p, k) => {
    const n = ctx.scene.get(p.id);
    // Le premier jeton de la cible hérite de la mise en page du premier jeton
    // remplacé : sa ligne, son écart de tête. Sans quoi une conversion sous la
    // barre de fraction remonterait au numérateur.
    if (k === 0) {
      if (heritage.gapBefore !== undefined) n.gapBefore = heritage.gapBefore;
      if (heritage.breakBefore !== undefined) n.breakBefore = heritage.breakBefore;
    }
    ctx.scene.enterFlow(p.id, index + k, ctx.where);
  });
  // Le reflow fait descendre la cible à sa place ET referme la ligne autour
  // d'elle : un seul mouvement, celui que l'auteur décrit.
  ctx.reflow({ at: t5, dur: tDes, ease: EASE.move });

  // ⑥ L'accolade s'efface — « avec vache → », c'est-à-dire une fois la place
  //    prise, jamais avant : elle est ce qui justifie ce qui vient d'arriver.
  const t6 = t5 + tDes;
  for (const id of acc.ids) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t6, dur: tRet, ease: EASE.fade });
    ctx.scene.kill(id, ctx.where);
  }
  // Et tant qu'elle est là, elle suit ce qu'elle embrasse : la cible est plus
  // courte (ou plus longue) que la source, et une accolade qui garderait la
  // largeur d'avant désignerait du vide.
  suivreLaZone(ctx, { ...acc, sources: poses.map((p) => p.id) }, { at: t5, dur: tDes });
}
