/**
 * Les produits répétés — la PUISSANCE (et la factorielle, qui suit).
 *
 * Ce fichier n'est PAS une primitive (comme `afficheur.js` ou `decor.js`) : ce
 * sont des modes de `group`, qui les appelle sur `op.exposants` et
 * `op.puissance`. Le vocabulaire reste fermé ; seul le remplissage change.
 */

import {
  tracerAccolade, tokenSpec, numberOf, espacementDe, exigerPoint, suivreLesAccolades,
} from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

/**
 * Les découpages nominaux, en ms. L'émetteur en tient un miroir
 * (`mappeurs.js › dureeExposants`, `dureePuissance`) : le moteur arithmétique
 * n'importe pas le moteur visuel. Un écart ne casserait rien — la primitive
 * répartit la durée qu'on lui donne au prorata de ces poids.
 */
const EXPOSANTS = Object.freeze({ OUVERTURE: 300, PAR_EXPOSANT: 1500 });
const PUISSANCE = Object.freeze({ ACCOLADE: 600, SOUFFLE: 300, VOL: 1800, FIN: 1400 });
/** L'exposant est un chiffre rétréci ; la copie qui voyage, un demi-chiffre (façon `meg`). */
const ECHELLE_EXPOSANT = 0.55;
const ECHELLE_COPIE = 0.5;
/** De combien l'exposant se pose au-dessus de la ligne, en casses. */
const HAUTEUR_EXPOSANT = 0.5;

/**
 * La place qu'un exposant réserve après sa base : de quoi le poser, ET de quoi
 * laisser descendre par là les copies de la base, à demi-taille.
 */
const reserveDe = (ctx, texteBase) => Math.max(
  ctx.metrics.advance * ECHELLE_EXPOSANT,
  [...texteBase].length * ctx.metrics.advance * ECHELLE_COPIE,
) + 6;

/**
 * ★ **LES EXPOSANTS SE FORMENT — tous, avant le premier calcul.**
 *
 * > « l'exposant monte et rétrécit pour former un exposant » (l'autrice)
 *
 * Dans `mpui`, l'exposant d'un nombre est le premier chiffre du nombre SUIVANT,
 * et le dernier regarde le premier. Le suivant reste en place — il sera élevé à
 * son tour — : c'est une COPIE de son premier chiffre qui monte au-dessus de
 * lui, puis rétrécit en allant se poser en haut à droite de la base. Un nombre
 * à la fois, de gauche à droite.
 *
 * ⚠️ **TOUS AVANT LE PREMIER CALCUL**, parce que la dépendance est circulaire :
 *   joué nombre par nombre, le dernier irait lire son exposant sur un premier
 *   nombre déjà élevé (`5` devenu `125`). Les exposants vivent donc d'une
 *   étape à l'autre : ils portent le nom que l'émetteur leur donne, et ils sont
 *   ACCROCHÉS à leur base (`data.suit`) — un reflow qui la déplace les emmène.
 *
 * ⚠️ **LEUR PLACE EST RÉSERVÉE** : l'écart qui suit la base s'élargit, et il
 *   est rendu par la puissance, quand le produit entre dans la ligne.
 */
export function planExposants(ctx, ids) {
  const liste = ctx.op.exposants;
  if (!Array.isArray(liste) || !liste.length) {
    fail(`${ctx.where}« exposants » doit lister les {base, source, id} des exposants à former.`);
  }
  const fs = ctx.metrics.fontSize;
  const av = ctx.metrics.advance;
  const gap = ctx.layoutOpts.gap;
  const T = ctx.dur;
  const u = T / (EXPOSANTS.OUVERTURE + EXPOSANTS.PAR_EXPOSANT * liste.length);
  const tOuv = EXPOSANTS.OUVERTURE * u;
  const pas = EXPOSANTS.PAR_EXPOSANT * u;

  liste.forEach((spec, k) => {
    const where = `${ctx.where}exposants[${k}] : `;
    if (!spec || typeof spec.base !== 'string' || typeof spec.source !== 'string'
      || typeof spec.id !== 'string' || spec.id.startsWith('@')) {
      fail(`${where}il faut une « base », une « source » et un « id » d'émetteur.`);
    }
    if (spec.base === spec.source) fail(`${where}l'exposant vient d'un AUTRE nombre que la base.`);
    if (!ids.includes(spec.base) || !ids.includes(spec.source)) {
      fail(`${where}la base et la source doivent être parmi les nombres désignés.`);
    }
    const base = ctx.scene.live(spec.base, where);
    const source = ctx.scene.live(spec.source, where);
    const chiffre = [...source.text][0];
    const e = Number(chiffre);
    if (!Number.isInteger(e) || e < 1) {
      fail(`${where}le premier chiffre de « ${source.text} » vaut « ${chiffre} » : un exposant va de 1 à 9.`);
    }
    const rang = ctx.scene.flowIndex(spec.base);
    if (rang < 0) fail(`${where}« ${spec.base} » n'est pas dans la ligne.`);

    const at = tOuv + k * pas;
    // Relevée AVANT que l'espace ne s'ouvre : c'est de là que la copie part.
    const pS = ctx.scene.pos(spec.source);
    const depart = { x: pS.x - ([...source.text].length * av) / 2 + av / 2, y: pS.y };
    const monte = { x: depart.x, y: depart.y - fs * 0.9 };

    const voisinId = ctx.scene.flow[rang + 1];
    const voisin = voisinId ? ctx.scene.get(voisinId) : null;
    const reserve = reserveDe(ctx, base.text);
    const ecart0 = voisin ? voisin.gapBefore : undefined;
    const g0 = voisin ? (ecart0 ?? gap) : gap;
    if (voisin) voisin.gapBefore = g0 + reserve;
    ctx.reflow({ at: at + pas * 0.25, dur: pas * 0.3, ease: EASE.move });

    const pB = ctx.scene.pos(spec.base);
    const decalage = { dx: base.w / 2 + g0 / 2 + reserve / 2, dy: -fs * HAUTEUR_EXPOSANT };
    const pose = { x: pB.x + decalage.dx, y: pB.y + decalage.dy };
    ctx.scene.create({
      id: spec.id, role: 'text', text: chiffre, kind: 'digit', inFlow: false,
      // Accroché à sa base : ce qui la déplace l'emmène, à l'écart déclaré.
      data: { suit: spec.base, decalage, voisin: voisinId || null, ecart0, reserve },
      base: { opacity: 0, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(spec.id, exigerPoint(ctx, depart, 'la copie du premier chiffre du nombre suivant', spec.id));
    // Elle monte au-dessus du chiffre et ne s'allume qu'une fois dégagée ; elle
    // voyage en HAUTEUR en rétrécissant, puis descend à la verticale dans
    // l'écart réservé.
    // ⚠️ Le trajet direct glissait presque à hauteur d'exposant, et l'exposant
    //   du dernier nombre — qui vient du premier, tout à gauche — passait sur
    //   sa propre base avant de se poser. Mesuré sur `5 34 2`.
    const auDessus = { x: pose.x, y: monte.y };
    ctx.anim({
      id: spec.id, prop: 'translate', values: [depart, monte, auDessus, pose], offsets: [0, 0.25, 0.8, 1],
      at, dur: pas * 0.9, ease: EASE.linear,
    });
    ctx.anim({ id: spec.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.23, 0.3, 1], at, dur: pas * 0.9 });
    ctx.anim({
      id: spec.id, prop: 'scale', values: [1, 1, ECHELLE_EXPOSANT, ECHELLE_EXPOSANT], offsets: [0, 0.25, 0.8, 1],
      at, dur: pas * 0.9, ease: EASE.linear,
    });
    ctx.scene.place(spec.id, pose);
  });
}

/**
 * ★ **LA PUISSANCE — la valeur passe par l'exposant, qui compte à rebours.**
 *
 * > « accolade "puissance" → […] une copie (façon meg) de la valeur passe par
 * >   l'exposant et le décrémente puis descend au compteur sous l'accolade → la
 * >   copie suivante fait de même mais hérite de l'opérateur "×" quand elle
 * >   descend après avoir décrémenté l'exposant → quand l'exposant arrive à 1,
 * >   la valeur n'est plus copiée mais déplacée vers l'exposant qui est
 * >   décrémenté à 0 puis disparaît pendant que la valeur descend et forme le
 * >   résultat final sous l'accolade → le résultat remonte pendant que
 * >   l'exposant disparaît… » (l'autrice)
 *
 * ```
 *     5³ 34             ① l'accolade « puissance » se tire sous la base
 *     5² 34   ↓5        ② une copie de 5 passe par l'exposant (3→2) et descend : compteur 5
 *     5¹ 34   ↓×5       ③ la suivante (2→1) hérite du × : 5 × 5 → 25
 *        ⁰ 34 ↓×5       ④ la base ELLE-MÊME passe par l'exposant (1→0) : 25 × 5 → 125
 *   125 34              ⑤ le produit remonte, l'exposant et l'accolade s'effacent
 * ```
 *
 * ★ **LA COPIE EST CELLE DE `meg`** (`helpers.js › jouerTransferts`) : dorée,
 *   à demi-taille, qui s'allume en quittant son nombre et s'éteint en arrivant.
 *
 * ★ **DEUX VALEURS À LA FOIS, JAMAIS PLUS.** Le compteur fusionne avec chaque
 *   copie qui arrive : 5, puis 5 × 5 = 25, puis 25 × 5 = 125.
 *
 * ⚠️ **CONTRÔLE CROISÉ.** La base et l'exposant posé sont relus sur la scène,
 *   le produit est recalculé par paires, et `to.text` doit l'égaler.
 */
export function planPuissance(ctx, ids) {
  if (ids.length !== 1) {
    fail(`${ctx.where}une puissance élève UN nombre, et l'accolade en embrasse ${ids.length}.`);
  }
  const idB = ids[0];
  const base = ctx.scene.live(idB, ctx.where);
  const v = numberOf(base.text, ctx, idB);
  if (!Number.isInteger(v) || v < 0) {
    fail(`${ctx.where}puissance de « ${base.text} » : on n'élève que des entiers positifs ou nuls.`);
  }
  const idE = ctx.op.exposant;
  if (typeof idE !== 'string') fail(`${ctx.where}« exposant » doit désigner l'exposant formé sur cette base.`);
  const noeudE = ctx.scene.live(idE, `${ctx.where}exposant : `);
  if (!noeudE.data || noeudE.data.suit !== idB) {
    fail(`${ctx.where}l'exposant « ${idE} » n'est pas posé sur « ${idB} » : il faut d'abord le former (« exposants »).`);
  }
  const e = Number(noeudE.text);
  if (!Number.isInteger(e) || e < 1) fail(`${ctx.where}exposant « ${noeudE.text} » : il faut un chiffre de 1 à 9.`);
  const partiels = [];
  let r = 1;
  for (let k = 0; k < e; k++) {
    r = k === 0 ? v : r * v;
    partiels.push(r);
  }
  if (!Number.isSafeInteger(r)) fail(`${ctx.where}${v} puissance ${e} sort des entiers exacts.`);
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';
  if (to.text !== String(r)) {
    fail(`${ctx.where}incohérence : ${partiels.map(() => v).join(' × ')} = ${r}, mais l'émetteur annonce `
      + `« ${to.text} ». Le moteur visuel refuse d’afficher un calcul faux.`);
  }
  const rang = ctx.scene.flowIndex(idB);
  if (rang < 0) fail(`${ctx.where}« ${idB} » n'est pas dans la ligne.`);

  const fs = ctx.metrics.fontSize;
  const av = ctx.metrics.advance;
  const T = ctx.dur;
  const u = T / (PUISSANCE.ACCOLADE + PUISSANCE.SOUFFLE + PUISSANCE.VOL * e + PUISSANCE.FIN);
  const tAcc = PUISSANCE.ACCOLADE * u;
  const pas = PUISSANCE.VOL * u;
  const tFin = PUISSANCE.FIN * u;
  const t2 = tAcc + PUISSANCE.SOUFFLE * u;   // les voyages commencent
  const t3 = t2 + e * pas;                    // le produit remonte

  // --- ① l'accolade, sous la base seule -----------------------------------
  const acc = tracerAccolade(ctx, [idB], {
    shape: 'brace', tighten: 0,
    symbol: ctx.op.symbol || null, label: ctx.op.label || null,
    promet: false, marquer: false,
    at: 0, dur: tAcc,
  });
  if (!acc) fail(`${ctx.where}puissance de ${v} : l’accolade n’a pas pu être tracée.`);

  const pB = ctx.scene.pos(idB);
  const pE = ctx.scene.pos(idE);
  const ancre = exigerPoint(ctx, { x: pB.x, y: acc.resultat.y }, 'le compteur sous l’accolade', to.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacementDe(ctx, idB),
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(to.id, ancre);

  // --- ②③④ les voyages : par l'exposant, puis sous l'accolade ---------------
  // On descend dans l'écart réservé à droite de la base, là où il n'y a
  // personne : ni la base, ni le voisin.
  const bas = { x: pE.x, y: pB.y + fs * 1.1 };
  const PASSAGE = 0.35;
  const passages = [];
  const arrivees = [];
  const demiCopie = ([...base.text].length * av * ECHELLE_COPIE) / 2;
  for (let k = 0; k < e; k++) {
    const at = t2 + k * pas;
    const dur = pas * 0.9;
    const dernier = k === e - 1;
    passages.push(at + dur * PASSAGE);
    arrivees.push(at + dur);
    let id = idB;
    if (!dernier) {
      id = ctx.gensym('copie');
      ctx.scene.create({
        id, role: 'text', text: base.text, kind: 'number', inFlow: false,
        base: { opacity: 0, scale: ECHELLE_COPIE, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, pB);
    }
    ctx.anim({
      id, prop: 'translate', values: [pB, pE, bas, ancre], offsets: [0, PASSAGE, 0.65, 1],
      at, dur, ease: EASE.linear,
    });
    if (dernier) {
      // « la valeur n'est plus copiée mais DÉPLACÉE » : la base quitte sa place
      // et prend la taille d'une copie pour passer par l'exposant.
      ctx.anim({ id, prop: 'scale', values: [1, ECHELLE_COPIE, ECHELLE_COPIE], offsets: [0, PASSAGE, 1], at, dur });
      ctx.anim({ id, prop: 'opacity', values: [1, 1, 0], offsets: [0, 0.88, 1], at, dur });
    } else {
      ctx.anim({ id, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.16, 0.88, 1], at, dur });
      ctx.anim({
        id, prop: 'scale', values: [ECHELLE_COPIE, 0.62, ECHELLE_COPIE, ECHELLE_COPIE],
        offsets: [0, PASSAGE, 0.65, 1], at, dur,
      });
    }
    // « la copie suivante hérite de l'opérateur × quand elle descend » : le
    // signe naît sur l'exposant, et descend accolé à sa gauche.
    if (k >= 1) {
      const fid = ctx.gensym('fois');
      const dx = -(demiCopie + (av * ECHELLE_COPIE) / 2 + 1);
      const decale = (p) => ({ x: p.x + dx, y: p.y });
      ctx.scene.create({
        id: fid, role: 'text', text: '×', kind: 'operator', inFlow: false,
        base: { opacity: 0, scale: ECHELLE_COPIE, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(fid, decale(pE));
      const reste = dur * (1 - PASSAGE);
      ctx.anim({
        id: fid, prop: 'translate', values: [decale(pE), decale(bas), decale(ancre)],
        offsets: [0, (0.65 - PASSAGE) / (1 - PASSAGE), 1],
        at: at + dur * PASSAGE, dur: reste, ease: EASE.linear,
      });
      ctx.anim({ id: fid, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.12, 0.82, 1], at: at + dur * PASSAGE, dur: reste });
    }
  }

  // L'exposant décompte au PASSAGE de chaque voyageur.
  const finCanal = t3 + tFin;
  const span = Math.max(1, finCanal - t2);
  ctx.discrete({
    id: idE, channel: 'text', at: t2, dur: span,
    render: (x) => {
      const t = t2 + x * span;
      let n = e;
      for (const p of passages) if (t >= p) n -= 1;
      return String(n);
    },
  });
  // À 0, il s'efface — pendant que la valeur descend, et jusqu'à la remontée.
  const tZero = passages[passages.length - 1];
  ctx.anim({ id: idE, prop: 'opacity', to: 0, at: tZero, dur: Math.max(1, t3 + tFin * 0.5 - tZero) });

  // Le compteur fusionne avec chaque arrivée : une paire à la fois.
  ctx.discrete({
    id: to.id, channel: 'text', at: t2, dur: span,
    render: (x) => {
      const t = t2 + x * span;
      let n = 0;
      while (n < arrivees.length && t >= arrivees[n]) n++;
      return n ? String(partiels[n - 1]) : '';
    },
  });
  arrivees.forEach((a, k) => {
    if (k === 0) {
      ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: a - pas * 0.08, dur: pas * 0.08 });
      ctx.anim({ id: to.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1], at: a, dur: pas * 0.25, ease: EASE.pop });
    } else {
      ctx.anim({ id: to.id, prop: 'scale', values: [1, 1.14, 1], offsets: [0, 0.5, 1], at: a, dur: pas * 0.25, ease: EASE.pop });
    }
  });

  // --- ⑤ le produit remonte, l'écart est rendu, l'accolade s'efface --------
  ctx.scene.kill(idB, ctx.where);
  ctx.scene.kill(idE, ctx.where);
  ctx.scene.enterFlow(to.id, rang, ctx.where);
  const { voisin, ecart0 } = noeudE.data;
  const noeudVoisin = voisin ? ctx.scene.get(voisin) : null;
  if (noeudVoisin && noeudVoisin.alive) noeudVoisin.gapBefore = ecart0;
  ctx.reflow({ at: t3, dur: Math.max(1, tFin), ease: EASE.move });
  ctx.scene.poserAccolade(acc.id, [to.id]);
  suivreLesAccolades(ctx, { at: t3, dur: Math.max(1, tFin) });
  for (const id of acc.ids) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t3, dur: Math.max(1, tFin * 0.5) });
  }
}
