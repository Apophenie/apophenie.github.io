/**
 * Les séries — le DÉNOMBREMENT SÉRIEL de `mcc`.
 *
 * Ce fichier n'est PAS une primitive (comme `produits.js`) : c'est un mode de
 * `group`, qui l'appelle sur `op.denombrement`. Le vocabulaire reste fermé.
 */

import {
  tracerAccolade, tokenSpec, numberOf, espacementDe, exigerPoint,
  reserverLaPlace, poserDansLaPlace, suivreSesSources, finirSousAccolade,
} from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

/**
 * Le découpage nominal, en ms. L'émetteur en tient un miroir
 * (`mappeurs.js › dureeDenombrement`) ; la primitive répartit la durée qu'on
 * lui donne au prorata de ces poids.
 */
const DENOMBREMENT = Object.freeze({ ACCOLADE: 600, PAR_EXEMPLAIRE: 700, SOUFFLE: 200, REMONTEE: 1400, FIN: 700 });
/** Le « 1 » qui descend est une copie à demi-taille, comme celles de `meg`. */
const ECHELLE_UN = 0.5;

/**
 * ★ **LE DÉNOMBREMENT SÉRIEL — une série, une accolade, un compte.**
 *
 * > « Il va falloir retravailler mcc : au lieu de tout faire à la fois,
 * >   accolade par accolade. Accolade avec en dessous "Dénombrement sériel".
 * >   Un 1 descend de chaque chiffre dans l'accolade pour atteindre le nombre
 * >   d'exemplaires dans le compteur sous l'accolade, puis ce compte remonte se
 * >   mettre devant pendant que les différents exemplaires sont fusionnés. »
 * >   (l'autrice)
 *
 * ```
 *    6 6 6 4 4          ① l'accolade se tire sous la série : « Dénombrement sériel »
 *    ↓ ↓ ↓              ② de chaque exemplaire, un « 1 » descend : le compteur fait 1, 2, 3
 *   3 6      4 4        ③ le compte remonte DEVANT, les exemplaires se fondent en un seul,
 *                          et le tracé se resserre sur lui
 *   3 6 4 4             ④ la légende s'efface, la ligne se referme
 * ```
 *
 * ★ **CE QUI EST MONTRÉ EST CE QUI EST COMPTÉ.** Le compte est celui des « 1 »
 *   qui arrivent, un par exemplaire ; la primitive relit la série sur la ligne
 *   — des jetons contigus, tous identiques — et refuse un `to` qui ne dit pas
 *   « nombre d'exemplaires, valeur ».
 *
 * ★ Les règles de tout geste à accolade s'y appliquent : le tracé n'embrasse
 *   que ce qui est encore là (les exemplaires fusionnent, il se resserre sur
 *   celui qui reste) ; « compte valeur » plus large que la série ouvre sa place
 *   avant de remonter ; et la fin est en deux temps.
 */
export function planDenombrement(ctx, ids) {
  const noeuds = ids.map((id) => ctx.scene.live(id, ctx.where));
  const rangs = ids.map((id) => ctx.scene.flowIndex(id));
  if (rangs.some((r) => r < 0) || rangs.some((r, k) => k && r !== rangs[k - 1] + 1)) {
    fail(`${ctx.where}un dénombrement sériel porte sur des jetons CONTIGUS de la ligne, dans l'ordre.`);
  }
  const valeurs = noeuds.map((n) => numberOf(n.text, ctx, n.id));
  if (valeurs.some((v) => v !== valeurs[0])) {
    fail(`${ctx.where}une série ne réunit que des exemplaires identiques : ${valeurs.join(' ')}.`);
  }
  const compte = ids.length;
  const specs = (Array.isArray(ctx.op.to) ? ctx.op.to : []).map((t, i) => tokenSpec(ctx, t, `to[${i}]`));
  if (specs.length !== 2 || specs[0].text !== String(compte) || specs[1].text !== String(valeurs[0])) {
    fail(`${ctx.where}incohérence : ${compte} exemplaire(s) de ${valeurs[0]} s'écrivent « ${compte} ${valeurs[0]} », `
      + `mais l'émetteur annonce « ${specs.map((t) => t.text).join(' ')} ». Le moteur visuel refuse d’afficher un compte faux.`);
  }
  const [specCompte, specValeur] = specs;
  for (const s of specs) if (!s.kind || s.kind === 'letter') s.kind = 'number';

  const fs = ctx.metrics.fontSize;
  const T = ctx.dur;
  const P = DENOMBREMENT;
  const u = T / (P.ACCOLADE + P.PAR_EXEMPLAIRE * compte + P.SOUFFLE + P.REMONTEE + P.FIN);
  const tAcc = P.ACCOLADE * u;
  const pas = P.PAR_EXEMPLAIRE * u;
  const t2 = tAcc;                                   // les « 1 » descendent
  const t3 = tAcc + compte * pas + P.SOUFFLE * u;    // le compte remonte, la série fusionne
  const tRemontee = P.REMONTEE * u;
  const tFin = P.FIN * u;

  // --- ① l'accolade, sous la série ------------------------------------------
  const acc = tracerAccolade(ctx, ids, {
    shape: 'brace', tighten: 0,
    symbol: ctx.op.symbol || null, label: ctx.op.label || null,
    promet: false, marquer: false,
    at: 0, dur: tAcc,
  });
  if (!acc) fail(`${ctx.where}dénombrement de ${valeurs[0]} : l’accolade n’a pas pu être tracée.`);
  const ancre = exigerPoint(ctx, acc.resultat, 'le compteur sous l’accolade', specCompte.id);

  // --- le compteur, sous la pointe : il part de rien -------------------------
  ctx.scene.create({
    id: specCompte.id, text: specCompte.text, kind: specCompte.kind, group: specCompte.group,
    role: 'text', inFlow: false, ...espacementDe(ctx, ids[0]),
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(specCompte.id, ancre);

  // --- ② de chaque exemplaire, un « 1 » descend dans le compteur -------------
  const arrivees = [];
  ids.forEach((id, k) => {
    const p = ctx.scene.pos(id);
    const at = t2 + k * pas;
    const dur = pas * 0.85;
    arrivees.push(at + dur);
    const uid = ctx.gensym('un');
    ctx.scene.create({
      id: uid, role: 'text', text: '1', kind: 'digit', inFlow: false,
      base: { opacity: 0, scale: ECHELLE_UN, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(uid, exigerPoint(ctx, { x: p.x, y: p.y }, 'le 1 qui quitte son exemplaire', uid));
    ctx.anim({
      id: uid, prop: 'translate', values: [{ x: p.x, y: p.y }, { x: p.x, y: p.y + fs * 0.6 }, ancre],
      offsets: [0, 0.35, 1], at, dur, ease: EASE.linear,
    });
    ctx.anim({ id: uid, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.15, 0.85, 1], at, dur });
  });
  const finCanal = t3 + tRemontee + tFin;
  ctx.discrete({
    id: specCompte.id, channel: 'text', at: t2, dur: Math.max(1, finCanal - t2),
    render: (x) => {
      const t = t2 + x * (finCanal - t2);
      let n = 0;
      while (n < arrivees.length && t >= arrivees[n]) n++;
      return n ? String(n) : '';
    },
  });
  arrivees.forEach((a, k) => {
    if (k === 0) ctx.anim({ id: specCompte.id, prop: 'opacity', to: 1, at: a - pas * 0.08, dur: pas * 0.08 });
    ctx.anim({ id: specCompte.id, prop: 'scale', values: [1, 1.18, 1], offsets: [0, 0.5, 1], at: a, dur: pas * 0.12, ease: EASE.pop });
  });

  // --- ③ le compte remonte DEVANT, les exemplaires fusionnent -----------------
  const p0 = ctx.scene.pos(ids[0]);
  const origines = new Map(ids.map((id) => [id, ctx.scene.pos(id)]));
  ctx.scene.create({
    id: specValeur.id, text: specValeur.text, kind: specValeur.kind, group: specValeur.group,
    role: 'text', inFlow: false,
    base: { opacity: 0, fill: ctx.palette.fg },
  }, { where: ctx.where });
  ctx.scene.place(specValeur.id, { x: p0.x, y: p0.y });
  const garde = reserverLaPlace(ctx, ids);
  for (const id of ids) ctx.scene.kill(id, ctx.where);
  const monte = poserDansLaPlace(ctx, garde, [specCompte.id, specValeur.id], { at: t3, dur: tRemontee, rang: rangs[0] });
  // Les exemplaires se rejoignent là où l'unique exemplaire se pose, et s'y fondent.
  const cible = ctx.scene.pos(specValeur.id);
  for (const id of ids) {
    const o = origines.get(id);
    ctx.anim({ id, prop: 'translate', values: [{ x: o.x, y: o.y }, { x: cible.x, y: cible.y }], at: monte.at, dur: monte.dur, ease: EASE.move });
    ctx.anim({ id, prop: 'opacity', values: [1, 1, 0], offsets: [0, 0.7, 1], at: monte.at, dur: monte.dur });
  }
  ctx.anim({ id: specValeur.id, prop: 'opacity', values: [0, 0, 1], offsets: [0, 0.7, 1], at: monte.at, dur: monte.dur });
  // Le tracé n'embrasse que ce qui est encore là : il se resserre sur l'exemplaire unique.
  suivreSesSources(ctx, acc.id, [specValeur.id], { at: monte.at, dur: monte.dur });

  // --- ④ PUIS la légende s'efface, et la ligne se referme ---------------------
  finirSousAccolade(ctx, { at: monte.at + monte.dur, dur: tFin });
}
