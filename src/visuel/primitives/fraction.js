/**
 * `fraction` — ON POSE LE CALCUL, PUIS ON LE FAIT.
 *
 * ★ POURQUOI UNE PRIMITIVE, ET PAS SEPT OPS ENCHAÎNÉES.
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
 * Sept ops enchaînées ne pouvaient pas rendre ça : chacune finit son geste avant
 * que la suivante ne commence, et la couture entre l'addition et la division se
 * voyait — l'accolade se retirait, une autre se traçait, la somme renaissait
 * sous un autre nom. Ici les phases partagent une même géométrie, calculée une
 * fois.
 *
 * ## Les sept temps
 *
 *  ① l'ACCOLADE se ferme sur les nombres, à leur largeur — une vraie accolade,
 *    celle de tous les autres gestes (`helpers.braceD`), et sans les resserrer
 *    pour les écarter ensuite : ils sont déjà à leur place ;
 *  ② ils MONTENT au-dessus de la barre, et l'accolade descend d'autant — elle
 *    creuse la place où la fraction va s'écrire ;
 *  ③ la BARRE paraît, juste sous eux et à la largeur de l'accolade, et les `+`
 *    s'insèrent entre les nombres, au-dessus ;
 *  ④ le DÉNOMINATEUR se remplit d'un `1` venu de chaque terme : le diviseur se
 *    construit sous les yeux, il n'est pas décrété — on voit qu'il vaut le
 *    nombre de termes parce qu'on l'a vu se remplir un par un ;
 *  ⑤ les termes DESCENDENT un à un sous l'accolade, et le total avance à
 *    chaque arrivée — sans discontinuité avec ce qui précède ;
 *  ⑥ la barre se CONTRACTE devant le diviseur et devient le signe `÷` ; le
 *    couple `÷ n` descend à son tour sous l'accolade, et le total devient le
 *    quotient ;
 *  ⑦ le quotient REMONTE sur la ligne de base, la ligne se referme, et
 *    l'accolade — qui a suivi sa zone jusqu'au bout — s'efface.
 *
 * ★ LA BARRE NE S'EFFACE PAS, ELLE DEVIENT LE SIGNE. « La barre de division
 *   vient se placer devant le diviseur en rétrécissant, et forme le symbole de
 *   division. Une fois ce symbole devant le diviseur, il descend sous
 *   l'accolade pour s'appliquer à son tour au résultat » (l'auteur). C'est ce
 *   qui fait de la division un geste et non une conclusion : le trait qui
 *   séparait le numérateur du dénominateur se change en opérateur, et cet
 *   opérateur rejoint la somme comme un terme de plus. Rien n'apparaît de
 *   nulle part, rien ne disparaît sans devenir autre chose.
 *
 * ★ LA BARRE SUIT L'ACCOLADE, en largeur comme en position, tant qu'elle est
 *   barre. Les deux désignent la même zone : une barre plus courte que ce
 *   qu'elle divise, ou plus longue, dirait qu'on divise autre chose.
 */

import {
  tokenSpec, targetsOf, numberOf, exigerPoint, espacementDe,
  braceD, suivreLaZone, ACCOLADE,
} from './helpers.js';
import { bboxOf } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'fraction';

/** Découpe du temps, en fractions de la durée — un temps par phase. */
const TEMPS = Object.freeze({
  ACCOLADE: 0.10,
  MONTEE: 0.08,
  BARRE: 0.09,
  DIVISEUR: 0.20,
  ADDITION: 0.24,
  DIVISION: 0.17,
  RESULTAT: 0.12,
});

/**
 * ★ LA HAUTEUR DE LA FRACTION EST UN BUDGET, PAS TROIS DÉCISIONS SÉPARÉES.
 *
 * « La barre de division est trop basse — ou les nombres trop hauts et la
 * future accolade trop haute aussi pour laisser la place au diviseur »
 * (l'auteur). Les deux formulations décrivent la même faute : quatre étages
 * (numérateur, barre, dénominateur, accolade) étaient posés chacun depuis la
 * ligne de base, et rien ne garantissait qu'ils ne se marchent pas dessus. Le
 * dénominateur s'écrivait sur les bras de l'accolade.
 *
 * Ils s'empilent donc désormais LES UNS SOUS LES AUTRES : chaque écart se
 * mesure depuis l'étage précédent, et l'accolade se pose sous le dénominateur
 * réel, avec la marge qu'exigent ses bras. La place du diviseur ne peut plus
 * manquer, elle est réservée par construction.
 */
/** De combien les nombres montent au-dessus de la ligne, en casses. */
const HAUT = 0.85;
/** Écart de la barre sous le numérateur monté. */
const BARRE_SOUS = 0.62;
/** Écart du dénominateur sous la barre — le même, la fraction est symétrique. */
const DENOM_SOUS = 0.62;
/** Marge de la barre et de l'accolade au-delà de la boîte des nombres. */
const DEBORD = 10;

/** Le signe `÷` : demi-largeur de sa barre, rayon d'un point, écart des points. */
const DIV_BARRE = 0.20;
const DIV_POINT = 0.05;
const DIV_ECART = 0.17;

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
  const tDivi = T * TEMPS.DIVISION;
  const tRes = T * TEMPS.RESULTAT;
  const t1 = tAcc;              // fin de l'accolade
  const t2 = t1 + tMont;        // fin de la montée
  const t3 = t2 + tBar;         // fin de la barre et des signes
  const t4 = t3 + tDiv;         // fin du dénominateur
  const t5 = t4 + tAdd;         // fin de l'addition
  const t6 = t5 + tDivi;        // fin de la division
  // (t6 + tRes = ctx.dur : la dernière phase ferme la durée du geste.)

  const boite = bboxOf(operandes, ctx.scene.positions, ctx.metrics, DEBORD);
  if (!boite) fail(`${ctx.where}les termes de la fraction ne sont pas positionnés.`);
  const ligneY = boite.cy;

  // Les quatre étages, chacun mesuré depuis le précédent (voir plus haut).
  const hautY = ligneY - fs * HAUT;
  const barreY = hautY + fs * BARRE_SOUS;
  const divY = barreY + fs * DENOM_SOUS;
  // L'accolade se pose sous ce qu'elle embrasse, exactement comme partout
  // ailleurs (`helpers.tracerAccolade`) : sous les nombres d'abord, sous le
  // dénominateur ensuite — et jamais plus haut que sa position d'origine, sans
  // quoi elle remonterait au lieu de faire place.
  const sousLeBas = (bas) => bas + DEBORD + ACCOLADE.bras + 6;
  const basDesNombres = boite.y + boite.h - DEBORD;
  const basDuDiviseur = divY + fs / 2;
  const accY0 = sousLeBas(basDesNombres);
  const accY1 = Math.max(accY0, sousLeBas(basDuDiviseur));
  const symboleY = (acc) => acc + ACCOLADE.pointe + fs * 0.52;
  const posTotal = { x: boite.cx, y: symboleY(accY1) + fs * 0.92 };

  // ── ① l'accolade, à la largeur des nombres ───────────────────────────────
  //
  // Elle ne resserre RIEN : « inutile de les resserrer pour ensuite les
  // écarter » (l'auteur). Elle prend la ligne telle qu'elle est. C'est aussi
  // pourquoi elle est tracée ici et non par `tracerAccolade`, qui resserre,
  // publie une ancre de résultat et pose son symbole sous la pointe : de tout
  // cela, la fraction ne veut que le TRACÉ.
  const accolade = ctx.gensym('fracacc');
  ctx.scene.create({
    id: accolade, role: 'bracket', inFlow: false, w: boite.w,
    data: { d: braceD(boite.w / 2), shape: 'brace' },
    base: { opacity: 0, strokeDashoffset: 100, stroke: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(accolade, exigerPoint(ctx, { x: boite.cx, y: accY0 },
    'l’accolade de la fraction', accolade));
  ctx.anim({ id: accolade, prop: 'opacity', to: 1, at: 0, dur: Math.max(1, tAcc * 0.5) });
  ctx.anim({
    id: accolade, prop: 'strokeDashoffset', from: 100, to: 0,
    at: 0, dur: Math.max(1, tAcc), ease: EASE.fade,
  });

  // Le symbole de l'opération, sous la pointe — « moy. », et rien de plus.
  const symbole = ctx.gensym('fracsym');
  const symboleTexte = typeof ctx.op.symbol === 'string' && ctx.op.symbol ? ctx.op.symbol : 'moy.';
  ctx.scene.create({
    id: symbole, role: 'label', text: symboleTexte, inFlow: false,
    w: ctx.metrics.advance * 0.8 * [...symboleTexte].length,
    data: { scale: 0.86 },
    base: { opacity: 0, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.place(symbole, exigerPoint(ctx, { x: boite.cx, y: symboleY(accY0) },
    'le symbole de la fraction', symbole));
  ctx.anim({ id: symbole, prop: 'opacity', to: 1, at: tAcc * 0.4, dur: Math.max(1, tAcc * 0.6) });

  // ── ② les nombres montent, l'accolade descend ────────────────────────────
  for (const id of operandes) {
    const p = ctx.scene.pos(id);
    ctx.place(id, { x: p.x, y: hautY, w: p.w }, { at: t1, dur: Math.max(1, tMont), ease: EASE.move });
  }
  // L'accolade et son symbole creusent la place : entre eux et les nombres
  // montés s'écriront la barre et le dénominateur.
  ctx.place(accolade, { x: boite.cx, y: accY1, w: boite.w },
    { at: t1, dur: Math.max(1, tMont), ease: EASE.move });
  ctx.place(symbole, { x: boite.cx, y: symboleY(accY1) },
    { at: t1, dur: Math.max(1, tMont), ease: EASE.move });

  // ── ③ la barre de division, à la largeur de l'accolade ───────────────────
  const barre = ctx.gensym('fracbar');
  ctx.scene.create({
    id: barre, role: 'bracket', inFlow: false, w: boite.w,
    data: { d: diviseD(boite.w / 2, 0, 0), shape: 'line' },
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
  const posDiviseur = { x: boite.cx, y: divY };
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
  ctx.scene.create({
    id: resultat, role: 'text', text: String(somme), kind: 'number', inFlow: false,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(resultat, exigerPoint(ctx, posTotal, 'le total de la fraction', resultat));
  ctx.anim({ id: resultat, prop: 'opacity', to: 1, at: t4, dur: Math.max(1, tAdd * 0.1) });

  const cadence = tAdd / (n + 0.3);
  const arrivees = [];
  const partiels = [];
  let cumul = 0;
  operandes.forEach((id, i) => {
    const a = t4 + i * cadence;
    const d = Math.max(1, cadence * 1.15);
    arrivees.push(a + d);
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

  // ── ⑥ la barre devient `÷`, et le couple `÷ n` descend ───────────────────
  //
  // ★ C'est la phase que la fraction avait perdue en route. Sans elle, le
  //   quotient venait prendre la place de la barre : la division était
  //   ANNONCÉE, pas jouée — on lisait un résultat, on ne voyait pas d'où il
  //   venait. Ici le trait se contracte, se colle devant son diviseur, et le
  //   couple rejoint le total comme un terme de plus. La division est un geste
  //   de la même famille que l'addition qui la précède, et elle se lit comme
  //   tel.
  const demiSigne = fs * DIV_BARRE;
  const largeurDiv = ctx.scene.pos(diviseurSpec.id).w;
  const xSigne = posDiviseur.x - largeurDiv / 2 - fs * 0.16 - demiSigne;
  const tContract = Math.max(1, tDivi * 0.42);
  const demi0 = boite.w / 2;
  ctx.discrete({
    id: barre,
    channel: 'd',
    at: t5,
    dur: tContract,
    // Le tracé est recalculé image par image, jamais mis à l'échelle : une
    // barre étirée épaissirait son trait d'un côté (même raison que
    // `helpers.suivreLaZone`). Et il reste une fonction pure de `t`, donc
    // exact au scrubbing.
    render: (x) => {
      const k = Math.min(1, Math.max(0, x));
      const points = Math.min(1, Math.max(0, (k - 0.45) / 0.55));
      return diviseD(demi0 + (demiSigne - demi0) * k, fs * DIV_POINT * points, fs * DIV_ECART);
    },
  });
  ctx.place(barre, { x: xSigne, y: divY, w: demiSigne * 2 },
    { at: t5, dur: tContract, ease: EASE.move });

  const tDesc = t5 + tDivi * 0.46;
  const dDesc = Math.max(1, tDivi * 0.46);
  arrivees.push(tDesc + dDesc);
  partiels.push(to.text);
  for (const id of [barre, diviseurSpec.id]) {
    ctx.place(id, { x: posTotal.x, y: posTotal.y }, { at: tDesc, dur: dDesc, ease: EASE.move });
    ctx.anim({ id, prop: 'opacity', to: 0, at: tDesc + dDesc * 0.62, dur: dDesc * 0.38 });
  }
  ctx.anim({ id: diviseurSpec.id, prop: 'scale', to: 0.62, at: tDesc, dur: dDesc });

  // ★ UN SEUL COMPTEUR POUR LES DEUX PHASES. Le total passe de rien à la somme
  //   puis de la somme au quotient sur le MÊME canal : c'est ce qui interdit
  //   qu'un second nombre naisse à côté du premier. La division ne remplace pas
  //   le total, elle le fait avancer d'un cran de plus.
  //   La fenêtre du compteur court jusqu'à la FIN du geste, et pas jusqu'à la
  //   dernière arrivée : sans cela le quotient s'inscrirait à l'instant précis
  //   où le total s'efface, et personne ne l'aurait lu. Il faut un temps de
  //   lecture entre « ça vaut 6 » et « 6 remonte sur la ligne ».
  compteur(ctx, resultat, t4, Math.max(1, t6 + tRes - t4), arrivees, ['', ...partiels]);

  // ── ⑦ le quotient remonte sur la ligne, l'accolade se referme ────────────
  const espacement = espacementDe(ctx, operandes[0]);
  const tete = ctx.scene.flowIndex(operandes[0]);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacement,
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  // Il naît LÀ OÙ LE TOTAL S'EST ARRÊTÉ, et le relais est invisible : même
  // texte, même place. Ce que le spectateur suit, c'est un seul nombre qui
  // remonte, pas un nombre qui en remplace un autre.
  ctx.scene.place(to.id, exigerPoint(ctx, posTotal, `le quotient « ${to.text} »`, to.id));
  const relais = t6 + tRes * 0.25;
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: relais, dur: Math.max(1, tRes * 0.15) });
  ctx.anim({ id: resultat, prop: 'opacity', to: 0, at: relais, dur: Math.max(1, tRes * 0.15) });

  for (const id of [...operandes, ...signes]) ctx.scene.kill(id, ctx.where);
  ctx.scene.enterFlow(to.id, tete < 0 ? undefined : tete, ctx.where);
  const remontee = { at: t6 + tRes * 0.4, dur: Math.max(1, tRes * 0.45), ease: EASE.move };
  ctx.place(to.id, { x: boite.cx, y: ligneY }, remontee);
  ctx.reflow(remontee);

  // ★ L'ACCOLADE SUIT SA ZONE JUSQU'AU BOUT, et c'est le dernier geste. Elle
  //   embrassait trois nombres, elle n'en embrasse plus qu'un : garder sa
  //   largeur, ne serait-ce que le temps d'un fondu, ce serait désigner du vide
  //   (voir `helpers.suivreLaZone`). Elle se referme sur le quotient, PUIS
  //   s'efface — « redimensionnement et effacement » (l'auteur), dans cet
  //   ordre.
  suivreLaZone(ctx, { id: accolade, shape: 'brace', sources: [to.id] },
    { at: t6 + tRes * 0.45, dur: Math.max(1, tRes * 0.42) });
  for (const id of [accolade, symbole]) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t6 + tRes * 0.62, dur: Math.max(1, tRes * 0.38) });
  }
}

/**
 * Le tracé qui va de la barre de division au signe `÷` — c'est le MÊME chemin.
 *
 * Une barre de fraction et un `÷` sont le même trait à deux longueurs près ; le
 * second porte en plus les deux points qui disent où étaient le numérateur et
 * le dénominateur. Les dessiner d'un seul chemin, c'est ce qui
 * permet au geste de se faire par interpolation plutôt que par substitution :
 * il n'y a jamais deux objets à l'écran, il n'y en a qu'un qui change de forme.
 *
 * @param {number} w   demi-largeur de la barre
 * @param {number} r   rayon des points (0 = pas de point : c'est une barre)
 * @param {number} dy  écart des points à la barre
 */
function diviseD(w, r, dy) {
  const trait = `M ${round(-w)} 0 H ${round(w)}`;
  if (!(r > 0.4)) return trait;
  const point = (y) => `M ${round(-r)} ${round(y)} `
    + `a ${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0 `
    + `a ${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0`;
  return `${trait} ${point(-dy)} ${point(dy)}`;
}

function round(v) {
  return Math.round(v * 1000) / 1000;
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
