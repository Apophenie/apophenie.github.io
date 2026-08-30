/**
 * `fraction` — ON POSE LE CALCUL, PUIS ON LE FAIT.
 *
 * ★ POURQUOI UNE PRIMITIVE, ET PAS SIX OPS ENCHAÎNÉES.
 *
 * La moyenne jouée en deux temps — d'abord toute l'addition, puis toute la
 * division — montrait deux calculs qui se suivent, pas un calcul. « D'abord tu
 * poses le calcul, ensuite tu le fais » (l'auteur) : c'est la règle de l'écolier,
 * et elle a une raison. Une fraction n'est pas une somme suivie d'un quotient,
 * c'est UNE écriture — un numérateur, une barre, un dénominateur — qu'on
 * construit entièrement avant d'en tirer quoi que ce soit. Tant qu'elle n'est
 * pas posée, il n'y a rien à lire ; une fois posée, tout ce qui suit se lit
 * dessus.
 *
 * Six ops enchaînées ne pouvaient pas rendre ça : chacune finit son geste avant
 * que la suivante ne commence, et la couture entre l'addition et la division se
 * voyait — l'accolade se retirait, une autre se traçait, la somme renaissait
 * sous un autre nom. Ici les phases partagent une même géométrie, calculée une
 * fois.
 *
 * ## Les six temps
 *
 *  ① l'accolade se ferme sur les nombres, à leur largeur — sans les resserrer
 *    pour les écarter ensuite : ils sont déjà à leur place ;
 *  ② ils MONTENT au-dessus de la barre, qui prend la largeur de l'accolade ;
 *  ③ la barre paraît, et les `+` s'insèrent entre les nombres, au-dessus ;
 *  ④ l'accolade DESCEND pour faire place au dénominateur, et un `1` glisse de
 *    chaque nombre vers lui : le diviseur se construit sous les yeux, il n'est
 *    pas décrété — on voit qu'il vaut le nombre de termes parce qu'on l'a vu
 *    se remplir un par un ;
 *  ⑤ les nombres descendent un à un sous l'accolade, et le total avance à
 *    chaque arrivée — sans discontinuité avec ce qui précède ;
 *  ⑥ la barre s'efface, le quotient prend sa place, centré, puis l'accolade se
 *    retire et la ligne se referme.
 *
 * ★ LA BARRE SUIT L'ACCOLADE, en largeur comme en position. Les deux désignent
 *   la même zone : une barre plus courte que ce qu'elle divise, ou plus longue,
 *   dirait qu'on divise autre chose.
 */

import { tokenSpec, targetsOf, numberOf, exigerPoint, espacementDe } from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'fraction';

/** Découpe du temps, en fractions de la durée — un temps par phase. */
const TEMPS = Object.freeze({
  ACCOLADE: 0.12,
  MONTEE: 0.10,
  BARRE: 0.10,
  DIVISEUR: 0.26,
  ADDITION: 0.30,
  RESULTAT: 0.12,
});

/** De combien les nombres montent au-dessus de la barre, en casses. */
const HAUT = 1.15;
/** Où la barre se pose sous eux, en casses depuis la ligne de base d'origine. */
const BARRE_SOUS = 0.42;
/** Marge de la barre au-delà de la boîte des nombres. */
const DEBORD = 10;

export function plan(ctx) {
  const operandes = targetsOf(ctx);
  if (operandes.length < 2) {
    fail(`${ctx.where}une fraction demande au moins deux termes à additionner.`);
  }
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';
  const diviseurSpec = tokenSpec(ctx, ctx.op.diviseur, 'diviseur');
  const valeurs = operandes.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  const somme = valeurs.reduce((a, b) => a + b, 0);
  const n = operandes.length;

  // Contrôle croisé : la moyenne des nombres MONTRÉS est-elle celle qu'on
  // annonce ? Le calcul est refait ici, sur ce que porte la ligne.
  const moyenne = Math.round(somme / n);
  if (String(moyenne) !== to.text) {
    fail(`${ctx.where}incohérence : la moyenne de ${valeurs.join(', ')} vaut ${moyenne}, `
      + `mais « to.text » annonce « ${to.text} ». Le moteur visuel refuse d'afficher un calcul faux.`);
  }
  if (String(n) !== diviseurSpec.text) {
    fail(`${ctx.where}incohérence : il y a ${n} termes, mais le diviseur annonce « ${diviseurSpec.text} ».`);
  }

  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  const tAcc = T * TEMPS.ACCOLADE;
  const tMont = T * TEMPS.MONTEE;
  const tBar = T * TEMPS.BARRE;
  const tDiv = T * TEMPS.DIVISEUR;
  const tAdd = T * TEMPS.ADDITION;
  const tRes = T * TEMPS.RESULTAT;
  const t1 = tAcc;              // fin de l'accolade
  const t2 = t1 + tMont;        // fin de la montée
  const t3 = t2 + tBar;         // fin de la barre et des signes
  const t4 = t3 + tDiv;         // fin du diviseur
  const t5 = t4 + tAdd;         // fin de l'addition
  const t6 = t5 + tRes;         // fin

  const boite = bboxOf(operandes, ctx.scene.positions, ctx.metrics, DEBORD);
  if (!boite) fail(`${ctx.where}les termes de la fraction ne sont pas positionnés.`);
  const ligneY = boite.cy;
  const hautY = ligneY - fs * HAUT;
  const barreY = ligneY - fs * BARRE_SOUS + fs * 0.5;

  // ── ① l'accolade, à la largeur des nombres ───────────────────────────────
  //
  // Elle ne resserre RIEN : « inutile de les resserrer pour ensuite les
  // écarter » (l'auteur). Elle prend la ligne telle qu'elle est.
  const accolade = ctx.gensym('fracacc');
  const accY = () => barreY + fs * 0.95;
  ctx.scene.create({
    id: accolade, role: 'bracket', inFlow: false, w: boite.w,
    data: { d: barreD(boite.w / 2), shape: 'line' },
    base: { opacity: 0, strokeDashoffset: 100, stroke: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(accolade, exigerPoint(ctx, { x: boite.cx, y: ligneY + fs * 0.95 },
    'la barre de l’accolade de la fraction', accolade));
  ctx.anim({ id: accolade, prop: 'opacity', to: 1, at: 0, dur: Math.max(1, tAcc * 0.5) });
  ctx.anim({
    id: accolade, prop: 'strokeDashoffset', from: 100, to: 0,
    at: 0, dur: Math.max(1, tAcc), ease: EASE.fade,
  });

  // Le symbole de l'opération, sous l'accolade — « moy. », et rien de plus.
  const symbole = ctx.gensym('fracsym');
  const symboleTexte = typeof ctx.op.symbol === 'string' && ctx.op.symbol ? ctx.op.symbol : 'moy.';
  ctx.scene.create({
    id: symbole, role: 'label', text: symboleTexte, inFlow: false,
    w: ctx.metrics.advance * 0.8 * [...symboleTexte].length,
    data: { scale: 0.86 },
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(symbole, exigerPoint(ctx, { x: boite.cx, y: ligneY + fs * 1.6 },
    'le symbole de la fraction', symbole));
  ctx.anim({ id: symbole, prop: 'opacity', to: 1, at: tAcc * 0.4, dur: Math.max(1, tAcc * 0.6) });

  // ── ② les nombres montent ────────────────────────────────────────────────
  for (const id of operandes) {
    const p = ctx.scene.pos(id);
    ctx.place(id, { x: p.x, y: hautY, w: p.w }, { at: t1, dur: Math.max(1, tMont), ease: EASE.move });
  }
  // L'accolade et son symbole descendent d'autant : ils font place à la barre
  // et au dénominateur qui vont s'écrire entre eux et les nombres.
  ctx.place(accolade, { x: boite.cx, y: accY(), w: boite.w },
    { at: t1, dur: Math.max(1, tMont), ease: EASE.move });
  ctx.place(symbole, { x: boite.cx, y: accY() + fs * 0.62 },
    { at: t1, dur: Math.max(1, tMont), ease: EASE.move });

  // ── ③ la barre de division, à la largeur de l'accolade ───────────────────
  const barre = ctx.gensym('fracbar');
  ctx.scene.create({
    id: barre, role: 'bracket', inFlow: false, w: boite.w,
    data: { d: barreD(boite.w / 2), shape: 'line' },
    base: { opacity: 0, strokeDashoffset: 100, stroke: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(barre, exigerPoint(ctx, { x: boite.cx, y: barreY },
    'la barre de division', barre));
  ctx.anim({ id: barre, prop: 'opacity', to: 1, at: t2, dur: Math.max(1, tBar * 0.4) });
  ctx.anim({
    id: barre, prop: 'strokeDashoffset', from: 100, to: 0,
    at: t2, dur: Math.max(1, tBar * 0.9), ease: EASE.fade,
  });

  // …et les signes entre les nombres, au-dessus d'elle. Ils sont posés à la
  // main plutôt que par `insertOperators` : celui-ci travaille dans le flux,
  // et les nombres n'y sont plus — ils sont montés.
  const signes = [];
  for (let i = 0; i < operandes.length - 1; i++) {
    const g = ctx.scene.pos(operandes[i]);
    const d = ctx.scene.pos(operandes[i + 1]);
    const ng = ctx.scene.get(operandes[i]);
    const nd = ctx.scene.get(operandes[i + 1]);
    const sid = ctx.gensym('fracplus');
    ctx.scene.create({
      id: sid, role: 'text', text: '+', kind: 'operator', inFlow: false,
      w: ctx.metrics.advance,
      base: { opacity: 0, scale: 0.6, fill: ctx.palette.phos },
    }, { where: ctx.where });
    ctx.scene.place(sid, exigerPoint(ctx, {
      x: ((g.x + ng.w / 2) + (d.x - nd.w / 2)) / 2, y: hautY,
    }, 'un « + » de la fraction', sid));
    const a = t2 + tBar * 0.2 + i * (tBar * 0.15);
    ctx.anim({ id: sid, prop: 'opacity', to: 1, at: a, dur: Math.max(1, tBar * 0.5) });
    ctx.anim({ id: sid, prop: 'scale', to: 1, at: a, dur: Math.max(1, tBar * 0.5), ease: EASE.pop });
    signes.push(sid);
  }

  // ── ④ le dénominateur, nourri d'un `1` par terme ─────────────────────────
  //
  // ★ Il ne s'écrit pas, il se REMPLIT. Un diviseur posé d'un coup demande
  //   qu'on croie qu'il vaut le nombre de termes ; celui-ci le montre — chaque
  //   terme envoie son unité, et le compteur monte d'autant de crans.
  const posDiviseur = { x: boite.cx, y: barreY + fs * 0.72 };
  ctx.scene.create({
    id: diviseurSpec.id, text: diviseurSpec.text, kind: diviseurSpec.kind || 'number',
    role: 'text', inFlow: false,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(diviseurSpec.id, exigerPoint(ctx, posDiviseur, 'le diviseur de la fraction', diviseurSpec.id));
  ctx.anim({ id: diviseurSpec.id, prop: 'opacity', to: 1, at: t3, dur: Math.max(1, tDiv * 0.12) });

  const pas = tDiv / (n + 0.3);
  const arriveesUnite = [];
  operandes.forEach((id, i) => {
    const p = ctx.scene.pos(id);
    const uid = ctx.gensym('fracun');
    ctx.scene.create({
      id: uid, role: 'text', text: '1', kind: 'digit', inFlow: false,
      base: { opacity: 0, scale: 0.55, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(uid, exigerPoint(ctx, { x: p.x, y: hautY }, 'un « 1 » du diviseur', uid));
    const a = t3 + i * pas;
    const d = Math.max(1, pas * 1.2);
    arriveesUnite.push(a + d);
    ctx.anim({ id: uid, prop: 'translate', to: { x: posDiviseur.x, y: posDiviseur.y }, at: a, dur: d, ease: EASE.move });
    ctx.anim({ id: uid, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.18, 0.8, 1], at: a, dur: d });
    ctx.anim({ id: uid, prop: 'scale', values: [0.55, 0.62, 0.5], offsets: [0, 0.5, 1], at: a, dur: d });
  });
  // Le compteur du dénominateur suit les arrivées, comme celui d'une somme.
  compteur(ctx, diviseurSpec.id, t3, Math.max(1, t4 - t3), arriveesUnite,
    ['', ...arriveesUnite.map((_, i) => String(i + 1))]);

  // ── ⑤ les nombres descendent, le total avance ────────────────────────────
  const resultat = ctx.gensym('fractot');
  const posTotal = { x: boite.cx, y: accY() + fs * 1.35 };
  ctx.scene.create({
    id: resultat, role: 'text', text: String(somme), kind: 'number', inFlow: false,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(resultat, exigerPoint(ctx, posTotal, 'le total de la fraction', resultat));
  ctx.anim({ id: resultat, prop: 'opacity', to: 1, at: t4, dur: Math.max(1, tAdd * 0.1) });

  const cadence = tAdd / (n + 0.3);
  const arriveesTerme = [];
  const partiels = [];
  let cumul = 0;
  operandes.forEach((id, i) => {
    const a = t4 + i * cadence;
    const d = Math.max(1, cadence * 1.15);
    arriveesTerme.push(a + d);
    cumul += valeurs[i];
    partiels.push(String(cumul));
    ctx.anim({ id, prop: 'translate', to: { x: posTotal.x, y: posTotal.y }, at: a, dur: d, ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.62, at: a, dur: d });
    ctx.anim({ id, prop: 'opacity', to: 0, at: a + d * 0.62, dur: d * 0.38 });
    // Le signe qui ouvrait ce terme s'en va avec lui — il n'a plus rien à
    // séparer (voir `helpers.accumulate`, même règle).
    const sid = signes[i - 1];
    if (sid) {
      ctx.anim({ id: sid, prop: 'translate', to: { x: posTotal.x, y: posTotal.y }, at: a, dur: d, ease: EASE.move });
      ctx.anim({ id: sid, prop: 'opacity', to: 0, at: a + d * 0.62, dur: d * 0.38 });
    }
  });
  compteur(ctx, resultat, t4, Math.max(1, t5 - t4 + tRes), arriveesTerme, ['', ...partiels]);

  // ── ⑥ la barre s'efface, le quotient prend sa place ──────────────────────
  //
  // ★ LE QUOTIENT SE POSE OÙ ÉTAIT LA BARRE, et c'est le geste qui referme le
  //   calcul : ce qui séparait le numérateur du dénominateur devient leur
  //   résultat. Le total et le diviseur s'en vont, la fraction est résolue.
  ctx.anim({ id: barre, prop: 'opacity', to: 0, at: t5, dur: Math.max(1, tRes * 0.4) });
  for (const id of [diviseurSpec.id, resultat]) {
    ctx.place(id, { x: boite.cx, y: barreY }, { at: t5, dur: Math.max(1, tRes * 0.6), ease: EASE.move });
    ctx.anim({ id, prop: 'opacity', to: 0, at: t5 + tRes * 0.35, dur: Math.max(1, tRes * 0.3) });
  }
  const espacement = espacementDe(ctx, operandes[0]);
  const tete = ctx.scene.flowIndex(operandes[0]);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacement,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(to.id, exigerPoint(ctx, { x: boite.cx, y: barreY }, `le quotient « ${to.text} »`, to.id));
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: t5 + tRes * 0.4, dur: Math.max(1, tRes * 0.3) });
  ctx.anim({
    id: to.id, prop: 'scale', values: [0.8, 1.1, 1], offsets: [0, 0.7, 1],
    at: t5 + tRes * 0.4, dur: Math.max(1, tRes * 0.4), ease: EASE.pop,
  });

  // L'accolade et son symbole se retirent avec le reste du décor.
  for (const id of [accolade, symbole]) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t5 + tRes * 0.3, dur: Math.max(1, tRes * 0.5) });
  }

  // Le quotient remonte prendre la place dans la ligne, et l'espace des termes
  // se referme sur lui.
  for (const id of [...operandes, ...signes]) ctx.scene.kill(id, ctx.where);
  ctx.scene.enterFlow(to.id, tete < 0 ? undefined : tete, ctx.where);
  ctx.place(to.id, { x: boite.cx, y: ligneY }, { at: t6 - tRes * 0.2, dur: Math.max(1, tRes * 0.2), ease: EASE.move });
  ctx.reflow({ at: t6 - tRes * 0.2, dur: Math.max(1, tRes * 0.2), ease: EASE.move });
}

/** Un trait horizontal centré, de demi-largeur `w`. */
function barreD(w) {
  return `M ${-w} 0 H ${w}`;
}

/**
 * Le canal discret d'un compteur : le texte avance d'un cran à chaque arrivée.
 * Fonction pure de `t`, donc exacte au scrubbing — même mécanique que
 * `helpers.accumulate`, et pour la même raison.
 */
function compteur(ctx, id, at, dur, arrivees, textes) {
  if (!arrivees.length) return;
  const seuils = arrivees.map((t) => (t - at) / dur);
  ctx.discrete({
    id,
    channel: 'text',
    at,
    dur,
    render: (x) => {
      let k = 0;
      while (k < seuils.length && x >= seuils[k]) k++;
      return textes[Math.min(textes.length - 1, k)];
    },
  });
}
