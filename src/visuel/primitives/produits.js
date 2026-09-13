/**
 * Les produits répétés — la PUISSANCE et la FACTORIELLE.
 *
 * Ce fichier n'est PAS une primitive (comme `afficheur.js` ou `decor.js`) : ce
 * sont des modes de `group`, qui les appelle sur `op.exposants`,
 * `op.puissance` et `op.factorielle`. Le vocabulaire reste fermé ; seul le remplissage change.
 */

import {
  tracerAccolade, tokenSpec, numberOf, espacementDe, exigerPoint, suivreLesAccolades,
} from './helpers.js';
import { EASE, CAMERA_ID, progressionDe } from '../constants.js';
import { fail } from '../errors.js';

/**
 * Les découpages nominaux, en ms. L'émetteur en tient un miroir
 * (`mappeurs.js › dureeExposants`, `dureePuissance`) : le moteur arithmétique
 * n'importe pas le moteur visuel. Un écart ne casserait rien — la primitive
 * répartit la durée qu'on lui donne au prorata de ces poids.
 */
const EXPOSANTS = Object.freeze({ OUVERTURE: 300, PAR_EXPOSANT: 1500 });
const PUISSANCE = Object.freeze({ POSE: 600, ACCOLADE: 600, SOUFFLE: 300, VOL: 1800, FIN: 1400 });
/** L'exposant est un chiffre rétréci ; la copie qui voyage, un demi-chiffre (façon `meg`). */
const ECHELLE_EXPOSANT = 0.55;
const ECHELLE_COPIE = 0.5;
/** De combien l'exposant se pose au-dessus de la ligne, en casses. */
const HAUTEUR_EXPOSANT = 0.5;
/**
 * ★ **CE QUI ATTEND SON TOUR ATTEND SUSPENDU — hors de la ligne.**
 *
 * L'exposant et le « ! » sont formés pour tous les nombres avant le premier
 * calcul, et vivent donc d'une étape à l'autre. Leur place sur la ligne, elle,
 * ne s'ouvre QUE pendant l'étape du nombre qui les emploie, et s'y referme.
 *
 * ⚠️ **C'EST UNE FRONTIÈRE, SINON.** Ils réservaient leur place dès leur
 *   formation, en élargissant l'écart devant le nombre suivant — et cet écart
 *   survivait aux frontières d'étape. Or un écart plus large que l'ordinaire
 *   est une FRONTIÈRE de groupe pour le modèle de ligne de la recherche
 *   (`recherche/scenario.js › suivreLaLigne`), qui ne l'avait pas calculée :
 *   entre deux étapes, la scène montrait une ligne découpée que le moteur ne
 *   comptait pas. Mesuré par `recherche/tests/lents/integration-visuel.test.js`
 *   sur « 42 » (`tca+mtal+m7+mpui+mab`), et par la même mesure sur `mfac`.
 */
const SUSPENSION = 0.95;
/** La hauteur à laquelle l'exposant voyage, au-dessus de ceux déjà suspendus. */
const VOL_HAUT = 1.5;
/** Le « ! » suspendu est plus petit que le « ! » posé. */
const ECHELLE_POINT_SUSPENDU = 0.6;

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
 * ⚠️ **ILS ATTENDENT SUSPENDUS**, au-dessus du bord droit de leur base, et ne
 *   touchent pas à la ligne : leur place ne s'ouvre qu'avec la puissance de
 *   leur base (voir `SUSPENSION`).
 */
export function planExposants(ctx, ids) {
  const liste = ctx.op.exposants;
  if (!Array.isArray(liste) || !liste.length) {
    fail(`${ctx.where}« exposants » doit lister les {base, source, id} des exposants à former.`);
  }
  const fs = ctx.metrics.fontSize;
  const av = ctx.metrics.advance;
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
    const monte = { x: depart.x, y: depart.y - fs * VOL_HAUT };

    const pB = ctx.scene.pos(spec.base);
    const decalage = { dx: base.w / 2, dy: -fs * SUSPENSION };
    const pose = { x: pB.x + decalage.dx, y: pB.y + decalage.dy };
    ctx.scene.create({
      id: spec.id, role: 'text', text: chiffre, kind: 'digit', inFlow: false,
      // Accroché à sa base : ce qui la déplace l'emmène, à l'écart déclaré.
      data: { suit: spec.base, decalage },
      base: { opacity: 0, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(spec.id, exigerPoint(ctx, depart, 'la copie du premier chiffre du nombre suivant', spec.id));
    // Elle monte au-dessus du chiffre et ne s'allume qu'une fois dégagée ; elle
    // voyage en HAUTEUR en rétrécissant — au-dessus des exposants déjà
    // suspendus —, puis descend se suspendre au-dessus de sa base.
    // ⚠️ Le trajet direct glissait presque à hauteur d'exposant, et l'exposant
    //   du dernier nombre — qui vient du premier, tout à gauche — passait sur
    //   sa propre base avant de se poser. Mesuré sur `5 34 2`.
    const auDessus = { x: pose.x, y: monte.y };
    ctx.anim({
      id: spec.id, prop: 'translate', values: [depart, monte, auDessus, pose], offsets: [0, 0.25, 0.8, 1],
      at, dur: pas * 0.9, ease: EASE.linear,
    });
    ctx.anim({ id: spec.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.2, 0.28, 1], at, dur: pas * 0.9 });
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
 *     5  34             ⓪ la place de l'exposant s'ouvre, l'exposant suspendu s'y pose
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
  const u = T / (PUISSANCE.POSE + PUISSANCE.ACCOLADE + PUISSANCE.SOUFFLE + PUISSANCE.VOL * e + PUISSANCE.FIN);
  const tPose = PUISSANCE.POSE * u;
  const tAcc = PUISSANCE.ACCOLADE * u;
  const pas = PUISSANCE.VOL * u;
  const tFin = PUISSANCE.FIN * u;
  const t2 = tPose + tAcc + PUISSANCE.SOUFFLE * u;   // les voyages commencent
  const t3 = t2 + e * pas;                            // le produit remonte

  // --- ⓪ la place de l'exposant s'ouvre, et il y descend -------------------
  // L'écart qui suit la base s'élargit de ce qu'il faut à l'exposant ET aux
  // copies qui descendront par là. Il est rendu à la fin de CETTE étape : aucun
  // écart ne franchit une frontière d'étape (voir `SUSPENSION`).
  const gap = ctx.layoutOpts.gap;
  const voisinId = ctx.scene.flow[rang + 1];
  const voisin = voisinId ? ctx.scene.get(voisinId) : null;
  const reserve = reserveDe(ctx, base.text);
  const ecart0 = voisin ? voisin.gapBefore : undefined;
  const g0 = voisin ? (ecart0 ?? gap) : gap;
  noeudE.data.decalage = { dx: base.w / 2 + g0 / 2 + reserve / 2, dy: -fs * HAUTEUR_EXPOSANT };
  if (voisin) voisin.gapBefore = g0 + reserve;
  // Si la base bouge, le reflow emmène l'exposant à son nouvel écart ; sinon,
  // on l'y descend — le même mouvement, jamais deux.
  ctx.reflow({ at: 0, dur: tPose, ease: EASE.move });
  {
    const b = ctx.scene.pos(idB);
    const d = noeudE.data.decalage;
    ctx.place(idE, { x: b.x + d.dx, y: b.y + d.dy }, { at: 0, dur: tPose, ease: EASE.move });
  }

  // --- ① l'accolade, sous la base seule -----------------------------------
  const acc = tracerAccolade(ctx, [idB], {
    shape: 'brace', tighten: 0,
    symbol: ctx.op.symbol || null, label: ctx.op.label || null,
    promet: false, marquer: false,
    at: tPose, dur: tAcc,
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
  if (voisin && voisin.alive) voisin.gapBefore = ecart0;
  ctx.reflow({ at: t3, dur: Math.max(1, tFin), ease: EASE.move });
  ctx.scene.poserAccolade(acc.id, [to.id]);
  suivreLesAccolades(ctx, { at: t3, dur: Math.max(1, tFin) });
  for (const id of acc.ids) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t3, dur: Math.max(1, tFin * 0.5) });
  }
}

/**
 * Le découpage nominal d'une factorielle, en ms — miroir dans
 * `mappeurs.js › dureeFactorielle`. Réparti au prorata, comme la puissance.
 */
const FACTORIELLE = Object.freeze({
  ANNONCE: 1800, POSE: 700, DEPLI: 1000, DEPLI_PAR_FACTEUR: 250, FUSION: 1500, UN: 1200, FIN: 700, CLOTURE: 1000,
});
/** L'interligne de la colonne, en casses : au-delà de ce qui sépare deux lignes lisibles. */
const INTERLIGNE = 0.9;
/** Le × embarqué rétrécit : il accompagne le nombre, il ne s'aligne pas avec lui. */
const ECHELLE_FOIS_EMBARQUE = 0.6;
/** Le titre, sous la ligne principale : sa hauteur et sa taille. */
const TITRE_SOUS_LA_LIGNE = 1.7;
const TITRE_TAILLE = 0.62;
/** Au-delà, la colonne ne tiendrait plus à l'écran, même en reculant la caméra. */
const FACTEURS_MAX = 12;

/** La hauteur, sur la scène, du rang `r` d'une colonne de `R` rangs centrée sur la ligne. */
const rangY = (ligneY, r, R, pas) => ligneY + (r - (R - 1) / 2) * pas;

/**
 * ★ **LA FACTORIELLE — la colonne se déplie, et se replie en multipliant.**
 *
 * > « Pour factorielle, le calcul étant moins connu, on va procéder
 * >   différemment :
 * >   1. mets les "!" associés à chaque chiffre où factorielle va être
 * >      appliquée, et "Factorielle !" est affiché comme un titre centré sous
 * >      la ligne principale.
 * >   2. le premier chiffre en factorielle déplie verticalement chaque n−1 … 1,
 * >      centré sur la ligne principale (donc pour 5! L1: 1, L2: ×, L3: 2,
 * >      L4: ×, L5: 3, L6: ×, L7: 4, L8: ×, L9: 5, avec L5 qui reste au niveau
 * >      de la ligne principale)
 * >   3. les multiplications s'effectuent les unes après les autres : le 1er
 * >      chiffre descend sur le 2ᵈ en embarquant l'opérateur au passage et la
 * >      fusion fait apparaître le résultat, puis ce résultat descend sur le
 * >      chiffre suivant en embarquant l'opérateur… le tout en remontant
 * >      progressivement les lignes pour maintenir le centrage, afin que la
 * >      dernière fusion aboutisse sur la ligne principale.
 * >   4. on reprend 2. puis 3. pour chaque chiffre à passer en factorielle, et
 * >      on déplace le titre "Factorielle !" vers la droite ou la gauche pour
 * >      qu'il ne recouvre pas les calculs en cours.
 * >   5. une fois toute la ligne passée en factorielle, le titre peut
 * >      disparaître. » (l'autrice)
 *
 * UN nombre par op, donc par étape — la légende dit « 5! = 1 × 2 × 3 × 4 × 5
 * = 120 », et le défilement suit le nombre en cours. Ce qui vit d'une étape à
 * l'autre — le titre et les « ! » — porte un nom d'émetteur : la première op
 * les pose (`annonce`), la dernière retire le titre (`dernier`).
 *
 * ★ **LA COLONNE EST CENTRÉE SUR LA LIGNE**, et la caméra recule le temps de
 *   la ligne pour qu'elle tienne : elle recule autour du centre de la scène,
 *   qui est la hauteur de la ligne, si bien que rien ne se décale.
 *
 * ⚠️ **LA PLACE DU RÉSULTAT EST RÉSERVÉE AVANT LE DÉPLI** : la case du nombre
 *   s'élargit à la largeur de sa factorielle. Les produits intermédiaires sont
 *   plus étroits, et la dernière fusion aboutit dans une case déjà à sa taille.
 *
 * ⚠️ **CONTRÔLE CROISÉ.** Le nombre est relu sur la ligne, chaque fusion est
 *   recalculée par paires, et `to.text` doit égaler le dernier produit.
 */
export function planFactorielle(ctx, ids) {
  if (ids.length !== 1) {
    fail(`${ctx.where}une factorielle se déplie sur UN nombre, et l'op en désigne ${ids.length}.`);
  }
  const idN = ids[0];
  const noeudN = ctx.scene.live(idN, ctx.where);
  const n = numberOf(noeudN.text, ctx, idN);
  if (!Number.isInteger(n) || n < 1 || n > FACTEURS_MAX) {
    fail(`${ctx.where}factorielle de « ${noeudN.text} » : il faut un entier de 1 à ${FACTEURS_MAX} — `
      + 'au-delà, la colonne ne tiendrait pas à l’écran.');
  }
  const produits = [];
  for (let k = 2, p = 1; k <= n; k++) { p *= k; produits.push(p); }
  const f = produits.length ? produits[produits.length - 1] : 1;
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';
  if (to.text !== String(f)) {
    fail(`${ctx.where}incohérence : ${n}! = ${f}, mais l'émetteur annonce « ${to.text} ». `
      + 'Le moteur visuel refuse d’afficher un calcul faux.');
  }
  const titre = ctx.op.titre;
  if (!titre || typeof titre.id !== 'string' || titre.id.startsWith('@') || typeof titre.text !== 'string') {
    fail(`${ctx.where}« titre » doit être le {id, text} du titre de la factorielle.`);
  }
  const annonce = Array.isArray(ctx.op.annonce) ? ctx.op.annonce : null;
  const dernier = ctx.op.dernier === true;
  const rang = ctx.scene.flowIndex(idN);
  if (rang < 0) fail(`${ctx.where}« ${idN} » n'est pas dans la ligne.`);

  const fs = ctx.metrics.fontSize;
  const av = ctx.metrics.advance;
  const gap = ctx.layoutOpts.gap;
  const pas = fs * INTERLIGNE;
  const R = 2 * n - 1;
  const T = ctx.dur;
  const nominal = (annonce ? FACTORIELLE.ANNONCE : 0) + FACTORIELLE.POSE + FACTORIELLE.DEPLI
    + FACTORIELLE.DEPLI_PAR_FACTEUR * (n - 1) + FACTORIELLE.FUSION * (n - 1)
    + (n === 1 ? FACTORIELLE.UN : 0) + FACTORIELLE.FIN + (dernier ? FACTORIELLE.CLOTURE : 0);
  const u = T / nominal;
  const tAnn = annonce ? FACTORIELLE.ANNONCE * u : 0;
  const tPose = FACTORIELLE.POSE * u;
  const tDep = (FACTORIELLE.DEPLI + FACTORIELLE.DEPLI_PAR_FACTEUR * (n - 1)) * u;
  const tFus = FACTORIELLE.FUSION * u;
  const tUn = n === 1 ? FACTORIELLE.UN * u : 0;
  const tFin = FACTORIELLE.FIN * u;
  const tClo = dernier ? FACTORIELLE.CLOTURE * u : 0;
  const tB = tAnn + tPose;                      // le dépli
  const tC = tB + tDep;                         // les fusions
  const tD = tC + (n - 1) * tFus + tUn;         // la case se referme
  const camera = ctx.scene.get(CAMERA_ID);
  const repos = camera.base.scale ?? 1;

  // --- 1. l'annonce : les « ! », le titre, la caméra qui recule ------------
  // ★ Les « ! » paraissent SUSPENDUS au-dessus de leur nombre : chacun ne
  //   descend à côté du sien qu'à l'étape de ce nombre, qui lui fait sa place
  //   et la referme (voir `SUSPENSION`).
  if (annonce) {
    const cadence = annonce.length > 1 ? (tAnn * 0.3) / (annonce.length - 1) : 0;
    annonce.forEach((a, j) => {
      const where = `${ctx.where}annonce[${j}] : `;
      if (!a || typeof a.cible !== 'string' || typeof a.id !== 'string' || a.id.startsWith('@')) {
        fail(`${where}il faut la « cible » et l'« id » d'émetteur de chaque « ! ».`);
      }
      ctx.scene.live(a.cible, where);
      if (ctx.scene.flowIndex(a.cible) < 0) fail(`${where}« ${a.cible} » n'est pas dans la ligne.`);
      const decalage = { dx: 0, dy: -fs * SUSPENSION };
      const pc = ctx.scene.pos(a.cible);
      ctx.scene.create({
        id: a.id, role: 'text', text: '!', kind: 'operator', inFlow: false,
        data: { suit: a.cible, decalage },
        base: { opacity: 0, scale: 0.4, fill: ctx.palette.phos },
      }, { where: ctx.where });
      ctx.scene.place(a.id, exigerPoint(ctx, { x: pc.x + decalage.dx, y: pc.y + decalage.dy }, 'le « ! » de la factorielle', a.id));
      const at = tAnn * 0.35 + j * cadence;
      ctx.anim({ id: a.id, prop: 'opacity', to: 1, at, dur: tAnn * 0.2 });
      ctx.anim({ id: a.id, prop: 'scale', to: ECHELLE_POINT_SUSPENDU, at, dur: tAnn * 0.2, ease: EASE.pop });
    });
    // Le titre, centré sous la ligne — au milieu de la VUE, qui peut défiler.
    const largeurTitre = av * TITRE_TAILLE * [...titre.text].length * 1.07;
    const ligneY = ctx.scene.pos(idN).y;
    ctx.scene.create({
      id: titre.id, role: 'label', text: titre.text, inFlow: false, w: largeurTitre,
      data: { scale: TITRE_TAILLE },
      base: { opacity: 0, fill: ctx.palette.fg },
    }, { where: ctx.where });
    ctx.scene.place(titre.id, exigerPoint(ctx,
      { x: ctx.layoutOpts.centerX - (ctx.pan ? ctx.pan.x : 0), y: ligneY + fs * TITRE_SOUS_LA_LIGNE },
      'le titre de la factorielle', titre.id));
    ctx.anim({ id: titre.id, prop: 'opacity', to: 1, at: tAnn * 0.55, dur: tAnn * 0.3 });
    // La caméra recule juste assez pour la plus haute des colonnes de la ligne.
    const rangees = Number.isInteger(ctx.op.rangees) && ctx.op.rangees > 0 ? ctx.op.rangees : R;
    const hauteur = (rangees - 1) * pas + fs;
    const zoom = Math.min(1, (ctx.layoutOpts.viewBox.h - 2 * fs) / hauteur);
    if (zoom < 0.999) {
      ctx.anim({ id: CAMERA_ID, prop: 'scale', to: Math.round(repos * zoom * 1000) / 1000, at: 0, dur: tAnn * 0.6, ease: EASE.move });
    }
  }

  const noeudTitre = ctx.scene.live(titre.id, `${ctx.where}titre : `);
  const idPoint = ctx.op.point;
  const noeudPoint = typeof idPoint === 'string' ? ctx.scene.live(idPoint, `${ctx.where}point : `) : null;
  if (!noeudPoint || !noeudPoint.data || noeudPoint.data.suit !== idN) {
    fail(`${ctx.where}« point » doit désigner le « ! » posé sur « ${idN} » par l'annonce.`);
  }

  // --- 1 bis. le « ! » de ce nombre descend à côté de lui -------------------
  // Sa place s'ouvre maintenant, et se refermera à la fin de cette étape.
  const reserve = av + 4;
  const voisinId = ctx.scene.flow[rang + 1];
  const voisin = voisinId ? ctx.scene.get(voisinId) : null;
  const ecart0 = voisin ? voisin.gapBefore : undefined;
  const g0 = voisin ? (ecart0 ?? gap) : gap;
  if (voisin) voisin.gapBefore = g0 + reserve;
  // ① la place s'ouvre — le « ! » suspendu suit son nombre s'il bouge ;
  const dOuvre = tPose * 0.3;
  ctx.reflow({ at: tAnn, dur: dOuvre, ease: EASE.move });
  // ② puis il glisse à sa hauteur jusqu'au-dessus de la place, et y descend à
  //    la verticale en grandissant.
  // ⚠️ En ligne droite, il descendait en diagonale PAR-DESSUS son nombre :
  //   mesuré sur `1!`, le « ! » recouvrait le « 1 » de quatorze unités.
  const suspendu = ctx.scene.pos(idPoint);
  noeudPoint.data.decalage = { dx: noeudN.w / 2 + g0 / 2 + reserve / 2, dy: 0 };
  const b = ctx.scene.pos(idN);
  const place = { x: b.x + noeudPoint.data.decalage.dx, y: b.y };
  const dPose = tPose * 0.45;
  ctx.anim({
    id: idPoint, prop: 'translate', values: [suspendu, { x: place.x, y: suspendu.y }, place], offsets: [0, 0.45, 1],
    at: tAnn + dOuvre, dur: dPose, ease: EASE.linear,
  });
  ctx.scene.place(idPoint, place);
  ctx.anim({
    id: idPoint, prop: 'scale', values: [ECHELLE_POINT_SUSPENDU, ECHELLE_POINT_SUSPENDU, 1], offsets: [0, 0.45, 1],
    at: tAnn + dOuvre, dur: dPose, ease: EASE.linear,
  });

  // --- 2. le dépli -----------------------------------------------------------
  // Le « ! » a dit ce qui allait se passer : il s'efface quand ça commence.
  ctx.anim({ id: idPoint, prop: 'opacity', to: 0, at: tB, dur: tDep * 0.15 });
  // La case prend la largeur de la factorielle — ou celle, plus grande, d'un
  // produit intermédiaire flanqué du × qu'il embarque : la fusion qui passe au
  // niveau de la ligne ne doit pas mordre sur le voisin.
  // ⚠️ MESURÉ sur `3 1 5` : réservée à la seule largeur de 120, la case laissait
  //   le × embarqué par « 24 » dépasser à gauche et toucher le « 1 » voisin.
  const largeurFois = av * ECHELLE_FOIS_EMBARQUE;
  const embarques = n > 1 ? [1, ...produits.slice(0, n - 2)] : [];
  const largeurCase = Math.max([...to.text].length * av,
    ...embarques.map((v) => [...String(v)].length * av + 2 * (largeurFois + 2)));
  if (largeurCase > noeudN.w) {
    noeudN.w = largeurCase;
    ctx.reflow({ at: tB + tDep * 0.08, dur: tDep * 0.22, ease: EASE.move });
  }
  const pN = ctx.scene.pos(idN);
  const ligneY = pN.y;
  // Le titre s'écarte de la colonne, du côté où la vue a de la place.
  {
    const vueX = pN.x + (ctx.pan ? ctx.pan.x : 0);
    const cote = vueX < ctx.layoutOpts.centerX ? 1 : -1;
    const x = pN.x + cote * (noeudN.w / 2 + noeudTitre.w / 2 + av);
    ctx.place(titre.id, { x, y: ctx.scene.pos(titre.id).y, w: noeudTitre.w }, { at: tB, dur: tDep * 0.3, ease: EASE.move });
  }
  // La colonne, de haut en bas : 1, ×, 2, ×, … , n — n est le nombre de la ligne.
  const colonne = [];
  const yDe = new Map();
  const tDepli = tB + tDep * 0.35;
  const dDepli = tDep * 0.45;
  const courbe = progressionDe(EASE.move);
  let uVisible = 1;
  for (let k = 0; k <= 200; k++) if (courbe(k / 200) >= 0.47) { uVisible = k / 200; break; }
  for (let k = 1; k <= n; k++) {
    const y = rangY(ligneY, 2 * (k - 1), R, pas);
    let id = idN;
    if (k < n) {
      id = ctx.gensym('facteur');
      ctx.scene.create({
        id, role: 'text', text: String(k), kind: 'number', inFlow: false,
        base: { opacity: 0 },
      }, { where: ctx.where });
      ctx.scene.place(id, pN);
      // Il ne paraît qu'une fois dégagé de ceux qui se déplient avec lui.
      ctx.anim({ id, prop: 'opacity', to: 1, at: tDepli + dDepli * uVisible, dur: dDepli * 0.3 });
    }
    if (R > 1) ctx.anim({ id, prop: 'translate', to: { x: pN.x, y }, at: tDepli, dur: dDepli, ease: EASE.move });
    yDe.set(id, y);
    colonne.push(id);
    if (k < n) {
      const fid = ctx.gensym('fois');
      const yf = rangY(ligneY, 2 * k - 1, R, pas);
      ctx.scene.create({
        id: fid, role: 'text', text: '×', kind: 'operator', inFlow: false,
        base: { opacity: 0, fill: ctx.palette.phos },
      }, { where: ctx.where });
      ctx.scene.place(fid, { x: pN.x, y: yf });
      ctx.anim({ id: fid, prop: 'opacity', to: 1, at: tDepli + dDepli + tDep * 0.05 + k * (tDep * 0.1) / n, dur: tDep * 0.08 });
      yDe.set(fid, yf);
      colonne.push(fid);
    }
  }
  if (n === 1) {
    // 1! : la colonne est réduite à ce qu'elle est — le 1 lui-même.
    ctx.anim({ id: idN, prop: 'scale', values: [1, 1.15, 1], offsets: [0, 0.5, 1], at: tC, dur: tUn * 0.6, ease: EASE.pop });
  }

  // --- 3. les fusions, une paire à la fois ------------------------------------
  const deplacer = (id, y, at, dur) => {
    ctx.anim({ id, prop: 'translate', to: { x: pN.x, y }, at, dur, ease: EASE.move });
    yDe.set(id, y);
  };
  let uMoitie = 0.5;
  for (let k = 0; k <= 200; k++) if (courbe(k / 200) >= 0.5) { uMoitie = k / 200; break; }
  let valeur = 1;
  for (let k = 1; k < n; k++) {
    const at = tC + (k - 1) * tFus;
    const [a1, x1, a2] = colonne;
    const yA2 = yDe.get(a2);
    const dDesc = tFus * 0.4;
    // Le premier descend sur le suivant…
    deplacer(a1, yA2, at, dDesc);
    // … et embarque le × au passage, accolé à sa gauche.
    const largeurA1 = [...String(valeur)].length * av;
    const tEmb = at + dDesc * uMoitie;
    ctx.anim({
      id: x1, prop: 'translate', to: { x: pN.x - (largeurA1 / 2 + largeurFois / 2 + 2), y: yA2 },
      at: tEmb, dur: at + dDesc - tEmb, ease: EASE.move,
    });
    ctx.anim({ id: x1, prop: 'scale', to: ECHELLE_FOIS_EMBARQUE, at: tEmb, dur: at + dDesc - tEmb, ease: EASE.move });
    // La fusion : le produit paraît où ils se sont rejoints.
    valeur *= k + 1;
    if (valeur !== produits[k - 1]) fail(`${ctx.where}${n}! : la fusion ${k} rendrait ${valeur}.`);
    const tFu = at + dDesc;
    for (const id of [a1, x1, a2]) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: tFu, dur: tFus * 0.2 });
      ctx.anim({ id, prop: 'scale', to: id === x1 ? ECHELLE_FOIS_EMBARQUE * 0.8 : 0.8, at: tFu, dur: tFus * 0.2 });
    }
    const final = k === n - 1;
    const pid = final ? to.id : ctx.gensym('produit');
    ctx.scene.create({
      id: pid, text: String(valeur), kind: 'number', group: final ? to.group : null,
      role: 'text', inFlow: false, ...(final ? espacementDe(ctx, idN) : {}),
      base: { opacity: 0, fill: ctx.palette.phos },
    }, { where: ctx.where });
    ctx.scene.place(pid, { x: pN.x, y: yA2 });
    ctx.anim({ id: pid, prop: 'opacity', to: 1, at: tFu + tFus * 0.08, dur: tFus * 0.15 });
    ctx.anim({ id: pid, prop: 'scale', values: [0.8, 1.15, 1], offsets: [0, 0.6, 1], at: tFu + tFus * 0.08, dur: tFus * 0.25, ease: EASE.pop });
    yDe.set(pid, yA2);
    // … et la colonne remonte d'un rang : elle reste centrée sur la ligne.
    const reste = [pid, ...colonne.slice(3)];
    for (const id of reste) deplacer(id, yDe.get(id) - pas, tFu + tFus * 0.3, tFus * 0.3);
    colonne.splice(0, colonne.length, ...reste);
    if (final) ctx.scene.place(pid, { x: pN.x, y: yDe.get(pid) });
  }

  // --- la case se referme sur le résultat, le « ! » rend sa place ------------
  if (n === 1) {
    ctx.scene.create({
      id: to.id, text: to.text, kind: to.kind, group: to.group,
      role: 'text', inFlow: false, ...espacementDe(ctx, idN),
      base: { opacity: 0, fill: ctx.palette.phos },
    }, { where: ctx.where });
    ctx.scene.place(to.id, pN);
    ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: tD - tUn * 0.3, dur: tUn * 0.25 });
    ctx.anim({ id: idN, prop: 'opacity', to: 0, at: tD - tUn * 0.3, dur: tUn * 0.25 });
  }
  ctx.scene.kill(idN, ctx.where);
  ctx.scene.kill(idPoint, ctx.where);
  ctx.scene.enterFlow(to.id, rang, ctx.where);
  if (voisin && voisin.alive) voisin.gapBefore = ecart0;
  ctx.reflow({ at: tD, dur: tFin, ease: EASE.move });

  // --- 5. la ligne entière est passée : le titre s'en va, la caméra revient --
  if (dernier) {
    ctx.anim({ id: titre.id, prop: 'opacity', to: 0, at: tD + tFin, dur: tClo * 0.6 });
    ctx.scene.kill(titre.id, ctx.where);
    ctx.anim({ id: CAMERA_ID, prop: 'scale', to: repos, at: tD + tFin, dur: tClo * 0.8, ease: EASE.move });
  }
}
