/**
 * `potence` — LA DIVISION POSÉE, COMME AU TABLEAU.
 *
 * > « Trace une barre verticale entre A et B et une barre horizontale sous B
 * >   qui s'arrête sur la barre verticale. La valeur B est extraite autant de
 * >   fois qu'elle se trouve dans le premier chiffre de A et incrémente d'1 par
 * >   exemplaire le premier chiffre sous B. Quand le premier chiffre de A < B
 * >   on inclut le 2ⁿᵈ chiffre de A et on refait de même […] jusqu'à ce que
 * >   A < B, à ce moment-là on décale A sur la gauche pour insérer ",0" à sa
 * >   droite […] et on fait de même sous B […] puis on extrait B du reste A,0
 * >   comme si c'était le nombre ×10 […] on continue jusqu'à ce que ça tombe
 * >   juste ou jusqu'à épuisement du nombre de chiffres après la virgule choisi
 * >   (1, 2 ou 3), puis A et B disparaissent avec les deux barres et le nombre
 * >   sous B prend leur place en perdant sa virgule. » (l'auteur)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ★ **POURQUOI UNE PRIMITIVE, ET NON UNE SUITE D'ACCOLADES.**
 *
 * La première version montrait le même calcul avec l'accolade des autres
 * divisions : la partie entière se retirait, puis le reste était multiplié par
 * dix, et l'on recommençait. C'était juste — chaque chiffre du quotient naissait
 * d'un retrait qu'on voyait — et pourtant ce n'était pas ce qu'on demande ici.
 *
 * La potence n'est pas une décoration de la division : c'est la SEULE
 * disposition où l'on voit pourquoi le quotient s'écrit de gauche à droite,
 * pourquoi un zéro apparaît parfois au milieu, et pourquoi la virgule tombe
 * exactement là. Un enfant de primaire la reconnaît ; une accolade qui répète
 * le même geste trois fois ne lui apprend rien.
 *
 * ★ **CE QUI EST MONTRÉ, DANS L'ORDRE**
 *
 * ```
 *      13 │ 5          ①  la barre verticale sépare, la barre horizontale
 *     ────┼───             se pose sous le diviseur seul
 *         │ 0          ②  5 ne tient pas dans 1 : on écrit 0
 *         │ 02         ③  5 tient 2 fois dans 13 : on écrit 2, il reste 3
 *     3,0 │ 02,        ④  le reste prend « ,0 » — et le quotient sa virgule
 *         │ 02,6       ⑤  5 tient 6 fois dans 30 : on écrit 6
 *                      ⑥  tout s'efface, le quotient descend sans sa virgule
 * ```
 *
 * ⚠️ **LA VIRGULE NE SE GARDE PAS**, et ce n'est pas un oubli : la ligne du
 *   site ne porte que des chiffres. `2,6` redescend en `2` et `6`, deux jetons
 *   voisins — c'est ce que l'auteur demande, et c'est aussi ce qui permet à la
 *   suite du programme de continuer à compter des chiffres.
 *
 * ⚠️ **LE CALCUL EST REFAIT ICI, PAS RELU.** L'émetteur annonce les jetons du
 *   quotient ; cette primitive divise elle-même et refuse si les deux ne
 *   coïncident pas. C'est la règle du moteur visuel (§0.3) : il ne peint pas un
 *   calcul faux, même si on le lui demande poliment.
 */

import { tokenSpec, numberOf } from './helpers.js';
import { filetD } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'potence';

/** Les six temps du geste, en parts de la durée totale. */
const TEMPS = Object.freeze({
  POTENCE: 0.14,   // ① les deux barres se tracent
  ENTIERE: 0.30,   // ② et ③ la partie entière : chiffres et restes
  VIRGULE: 0.10,   // ④ le « ,0 » et la virgule du quotient
  DECIMALES: 0.28, // ⑤ un chiffre par décimale
  EFFACEMENT: 0.10, // ⑥ les barres et les opérandes s'en vont
  DESCENTE: 0.08,  // le quotient rejoint la ligne
});

/** L'écart entre la ligne et la barre horizontale, en parts de corps. */
const SOUS_LA_LIGNE = 0.78;
/** Le débord de la barre horizontale au-delà du diviseur. */
const DEBORD = 6;
/** La demi-hauteur de la barre verticale, en parts de corps. */
const HAUTEUR_VERTICALE = 1.15;

/**
 * Le déroulé d'une division posée : ce qu'on écrit au quotient, et ce qui reste
 * à gauche, tour par tour.
 *
 * On avance chiffre par chiffre sur le dividende — c'est ce qui fait apparaître
 * les zéros intercalaires du quotient —, puis, une fois le dividende épuisé, on
 * ajoute des zéros décimaux tant qu'il reste quelque chose et qu'on n'a pas
 * épuisé les décimales permises.
 */
export function derouleDeLaDivision(a, b, decimales) {
  const tours = [];
  const chiffresA = [...String(a)];
  let courant = 0;
  /* ★ **UN CHIFFRE DE QUOTIENT PAR CHIFFRE DU DIVIDENDE, ZÉRO COMPRIS.**

     > « 105/5 devrait donner 021, réunis ou séparés, peu importe. […] Le zéro
     >   initial bien de 105/5 : 0×5 dans 1 de 105. » (l'auteur)

     Une première version sautait les zéros de tête, pour ne pas écrire « 05 ».
     C'était une complication, et une infidélité : à la potence, on pose le
     premier chiffre du dividende, on demande combien de fois le diviseur y
     tient — zéro fois, ici — et ON ÉCRIT ZÉRO. C'est même le premier geste que
     l'écolier apprend, et le sauter rendrait la colonne des restes
     incompréhensible : le `1` de `105` doit rester en face de son `0`. */
  for (let i = 0; i < chiffresA.length; i++) {
    courant = courant * 10 + Number(chiffresA[i]);
    const c = Math.floor(courant / b);
    tours.push({ chiffre: c, courantAvant: courant, reste: courant - c * b, decimal: false });
    courant -= c * b;
  }
  for (let k = 0; k < decimales && courant !== 0; k++) {
    const avant = courant * 10;
    const c = Math.floor(avant / b);
    tours.push({ chiffre: c, courantAvant: avant, reste: avant - c * b, decimal: true });
    courant = avant - c * b;
  }
  return tours;
}

export function plan(ctx) {
  const idA = ctx.scene.resolve(ctx.op.dividende, `${ctx.where}« dividende » : `)[0];
  const idB = ctx.scene.resolve(ctx.op.diviseur, `${ctx.where}« diviseur » : `)[0];
  if (!idA || !idB) fail(`${ctx.where}une potence demande un dividende ET un diviseur.`);
  const a = numberOf(ctx.scene.live(idA, ctx.where).text, ctx, idA);
  const b = numberOf(ctx.scene.live(idB, ctx.where).text, ctx, idB);
  if (!Number.isInteger(a) || !Number.isInteger(b) || b <= 0 || a < 0) {
    fail(`${ctx.where}potence ${a} ÷ ${b} : on ne divise que des entiers, par un diviseur strictement positif.`);
  }
  const decimales = Number.isInteger(ctx.op.decimales) ? ctx.op.decimales : 0;
  if (decimales < 0 || decimales > 3) {
    fail(`${ctx.where}potence : « decimales » vaut ${ctx.op.decimales} — on en montre de zéro à trois.`);
  }
  const sorties = (ctx.op.to || []).map((t, i) => tokenSpec(ctx, t, `to[${i}]`));
  if (!sorties.length) fail(`${ctx.where}une potence rend au moins un chiffre : « to » est vide.`);

  const tours = derouleDeLaDivision(a, b, decimales);
  // ⚠️ Contrôle croisé : les chiffres qu'on va écrire au quotient sont-ils ceux
  //   que l'émetteur annonce ? On compare chiffre à chiffre, pas le total.
  const attendus = tours.map((t) => String(t.chiffre));
  const dits = sorties.map((s) => s.text);
  if (attendus.join(',') !== dits.join(',')) {
    fail(`${ctx.where}incohérence : ${a} ÷ ${b} s'écrit ${attendus.join(' ')} à la potence, `
      + `mais « to » annonce ${dits.join(' ')}. Le moteur visuel refuse d'afficher un calcul faux.`);
  }

  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  const posA = ctx.scene.pos(idA);
  const posB = ctx.scene.pos(idB);
  if (!posA || !Number.isFinite(posA.x) || !posB || !Number.isFinite(posB.x)) {
    fail(`${ctx.where}potence : le dividende et le diviseur doivent être posés sur la ligne.`);
  }
  // ★ La ligne de base vient des JETONS, pas d'une constante : c'est la seule
  //   façon que la potence se pose là où le calcul est, quelle que soit la
  //   hauteur qu'a prise la scène au-dessus.
  const ligneY = Number.isFinite(posA.y) ? posA.y : posB.y;
  if (!Number.isFinite(ligneY)) {
    fail(`${ctx.where}potence : la ligne de base n'est pas mesurable — les jetons ne sont pas encore placés.`);
  }
  const barreX = (posA.x + posB.x) / 2;
  const barreY = ligneY + fs * SOUS_LA_LIGNE;
  const demiLargeur = Math.max(fs, Math.abs(posB.x - barreX) + DEBORD);

  const t1 = T * TEMPS.POTENCE;
  const t2 = t1 + T * TEMPS.ENTIERE;
  const t3 = t2 + T * TEMPS.VIRGULE;
  const t4 = t3 + T * TEMPS.DECIMALES;
  const t5 = t4 + T * TEMPS.EFFACEMENT;

  // ── ① les deux barres ────────────────────────────────────────────────────
  //
  // La verticale d'abord — elle SÉPARE, et c'est le premier geste du tableau —
  // puis l'horizontale sous le diviseur seul, qui s'arrête sur elle.
  const idVert = ctx.gensym('potvert');
  ctx.scene.create({
    id: idVert, role: 'filet', inFlow: false, w: 1,
    data: { d: `M 0 ${-fs * HAUTEUR_VERTICALE} V ${fs * HAUTEUR_VERTICALE}` },
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idVert, { x: barreX, y: ligneY });
  ctx.anim({ id: idVert, prop: 'opacity', to: 1, at: 0, dur: t1 * 0.6, ease: EASE.enter });

  const idHoriz = ctx.gensym('pothoriz');
  ctx.scene.create({
    id: idHoriz, role: 'filet', inFlow: false, w: demiLargeur,
    data: { d: filetD(demiLargeur) },
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idHoriz, { x: barreX + demiLargeur, y: barreY });
  ctx.anim({ id: idHoriz, prop: 'opacity', to: 1, at: t1 * 0.4, dur: t1 * 0.6, ease: EASE.enter });

  /* ── ② à ⑤ le calcul ──────────────────────────────────────────────────────
     À gauche, le dividende devient le reste, tour après tour. À droite, sous la
     barre, le quotient s'écrit chiffre à chiffre — et la virgule paraît juste
     avant le premier chiffre décimal, à sa place, comme au tableau. */
  const entiers = tours.filter((t) => !t.decimal).length;
  const parTour = tours.length ? (t2 - t1 + (t4 - t3)) / tours.length : 0;
  const chiffres = [];
  tours.forEach((tour, k) => {
    const debut = k < entiers ? t1 + parTour * k : t3 + parTour * (k - entiers);
    // le chiffre du quotient, sous la barre, à la suite des précédents
    const spec = sorties[k];
    ctx.scene.create({
      id: spec.id, role: 'text', text: spec.text, kind: spec.kind || 'digit', inFlow: false,
      base: { opacity: 0, scale: 0.7 },
    }, { where: ctx.where });
    const x = barreX + fs * 0.75 + chiffres.length * ctx.metrics.advance
      + (tour.decimal ? ctx.metrics.advance * 0.55 : 0);
    ctx.scene.place(spec.id, { x, y: barreY + fs * 0.92 });
    ctx.anim({ id: spec.id, prop: 'opacity', to: 1, at: debut, dur: parTour * 0.5, ease: EASE.enter });
    ctx.anim({ id: spec.id, prop: 'scale', to: 1, at: debut, dur: parTour * 0.5, ease: EASE.enter });
    chiffres.push(spec.id);
    /* Le reste, à gauche : le dividende porte ce qui reste à diviser. Le texte
       bascule à mi-course, quand le chiffre du quotient a fini de paraître —
       on lit d'abord « combien de fois », puis « ce qui reste ». */
    const avant = tour.decimal ? `${tour.courantAvant / 10},0` : String(tour.courantAvant);
    const apres = String(tour.reste);
    ctx.discrete({
      id: idA,
      channel: 'text',
      at: debut,
      dur: Math.max(1, parTour),
      render: (u) => (u < 0.55 ? avant : apres),
    });
  });

  // ④ la virgule : elle ne paraît que s'il y a des décimales, et JUSTE avant
  //    la première — ni avant, ni ailleurs.
  if (entiers < tours.length) {
    const idVirg = ctx.gensym('potvirg');
    ctx.scene.create({
      id: idVirg, role: 'text', text: ',', kind: 'punct', inFlow: false,
      base: { opacity: 0 },
    }, { where: ctx.where });
    ctx.scene.place(idVirg, {
      x: barreX + fs * 0.75 + entiers * ctx.metrics.advance,
      y: barreY + fs * 0.92,
    });
    ctx.anim({ id: idVirg, prop: 'opacity', to: 1, at: t2, dur: (t3 - t2) * 0.7, ease: EASE.enter });
    // ⑥ Elle s'en va avec les barres : « le nombre sous B prend leur place en
    //    perdant sa virgule » — c'est ici qu'elle se perd.
    ctx.anim({ id: idVirg, prop: 'opacity', to: 0, at: t4, dur: t5 - t4 });
    ctx.scene.kill(idVirg, ctx.where);
  }

  // ── ⑥ tout s'efface, sauf le quotient ────────────────────────────────────
  for (const id of [idVert, idHoriz, idA, idB]) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t4, dur: t5 - t4 });
  }
  ctx.scene.kill(idVert, ctx.where);
  ctx.scene.kill(idHoriz, ctx.where);
  ctx.scene.kill(idA, ctx.where);
  ctx.scene.kill(idB, ctx.where);

  /* ★ **LE QUOTIENT REJOINT LA LIGNE, ET C'EST LUI QUI RESTE.**
     Les chiffres étaient hors flux le temps du calcul — ils appartenaient à la
     potence, pas à la démonstration. Ils y entrent maintenant, à la place que
     le dividende occupait, et la ligne se referme sur eux. */
  const place = ctx.scene.flowIndex(idA);
  chiffres.forEach((id, i) => {
    ctx.scene.enterFlow(id, place >= 0 ? place + i : undefined, ctx.where);
  });
  ctx.reflow({ at: t5, dur: T - t5, ease: EASE.move });
}
