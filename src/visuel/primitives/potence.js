/**
 * `potence` — LA DIVISION POSÉE, COMME AU TABLEAU.
 *
 * > « Trace une barre verticale entre A et B et une barre horizontale sous B
 * >   qui s'arrête sur la barre verticale. La valeur B est extraite autant de
 * >   fois qu'elle se trouve dans le premier chiffre de A et incrémente d'1 par
 * >   exemplaire le premier chiffre sous B. Quand le premier chiffre de A < B
 * >   on inclut le 2ⁿᵈ chiffre de A et on refait de même […] jusqu'à ce que
 * >   A < B, à ce moment-là ON DÉCALE A SUR LA GAUCHE POUR INSÉRER ",0" à sa
 * >   droite, avant la barre verticale qui le sépare de B, ET ON FAIT DE MÊME
 * >   SOUS B (on ajoute ",0"), puis on extrait B du reste A,0 comme si c'était
 * >   le nombre ×10 et ça incrémente ",0", puis on rajoute un 0 de plus ce qui
 * >   donne "0,A0" ; on continue jusqu'à ce que ça tombe juste ou jusqu'à
 * >   épuisement du nombre de chiffres après la virgule choisi (1, 2 ou 3),
 * >   puis A et B disparaissent avec les deux barres et le nombre sous B prend
 * >   leur place en perdant sa virgule dans le déplacement. » (l'auteur)
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
 * ★ **CE QUI EST MONTRÉ, DANS L'ORDRE** — `13 ÷ 5`, une décimale
 *
 * ```
 *      13 │ 5          ①  on ÉCARTE A et B (on ne les efface pas) pour loger
 *     ────┼────            la barre verticale ; l'horizontale se pose sous B
 *      13 │ 0          ②  50 ne tient pas dans 13 : rien ne part, on écrit 0
 *       3 │ 02         ③  deux « 5 » quittent 13 — 13, 8, 3 — et le chiffre
 *                          sous la barre monte 0 → 1 → 2 à chaque atterrissage
 *     3,0 │ 02,0       ④  A GLISSE À GAUCHE, « ,0 » s'inscrit à sa droite,
 *                          et « ,0 » s'inscrit de même sous la barre
 *     0,0 │ 02,6       ⑤  six « 0,5 » quittent 3,0 — 2,5 … 0,0 — et le zéro
 *                          décimal monte jusqu'à 6
 *                      ⑥  tout s'efface, le quotient descend sans sa virgule
 * ```
 *
 * ★ **LA COLONNE DE GAUCHE MONTRE CE QU'IL RESTE À DIVISER, EN ENTIER.**
 *
 * Une version antérieure y écrivait le dividende PARTIEL — `1`, puis `13`, puis
 * `3` : le nombre grandissait avant de rapetisser, et le « 1 » réapparaissait au
 * milieu du geste. C'est le défaut que l'auteur a nommé sur la division à
 * l'accolade — « tu effaces les chiffres pour les remettre […] ça ne va pas » —
 * et il vaut ici : **rien ne s'efface pour reparaître ailleurs**. La colonne
 * porte donc la valeur restante vraie, du premier au dernier tour, et elle ne
 * fait que décroître.
 *
 * ⚠️ **CONSÉQUENCE : LE PAQUET EMPORTE CE QU'IL EMPORTE.** Si la colonne montre
 *   `105` et qu'on travaille la colonne des dizaines, ce n'est pas `5` qui la
 *   quitte, c'est `50` — sans quoi le nombre affiché mentirait sur ce qu'on lui
 *   retire (§0.3, « ce qui est montré est ce qui est compté »). Aux unités le
 *   paquet vaut donc `B` tout court, aux dizaines `B0`, sous la virgule `0,B` :
 *   c'est ce qui explique, sans un mot, POURQUOI le chiffre du quotient s'écrit
 *   dans cette colonne-là. Et comme à l'accolade, il vaut `1` en arrivant :
 *   on retire cinquante, ça compte pour un.
 *
 * ★ **LA COLONNE EST CALÉE À DROITE, contre la barre.** C'est la discipline de
 *   la potence : les unités sous les unités. Elle se paie d'un saut de position
 *   instantané (1 ms) à chaque fois que le nombre perd un chiffre — invisible,
 *   puisque ce sont les COLONNES qui ne bougent pas —, et elle rend le geste
 *   demandé par l'auteur littéral : insérer « ,0 » à droite, c'est pousser A
 *   d'une colonne vers la gauche.
 *
 * ⚠️ **LA VIRGULE NE SE GARDE PAS**, et ce n'est pas un oubli : la ligne du
 *   site ne porte que des chiffres. `2,6` redescend en `2` et `6`, deux jetons
 *   voisins — c'est ce que l'auteur demande, et c'est aussi ce qui permet à la
 *   suite du programme de continuer à compter des chiffres. Elle s'efface
 *   pendant la descente, « en perdant sa virgule dans le déplacement ».
 *
 * ⚠️ **LE CALCUL EST REFAIT ICI, PAS RELU.** L'émetteur annonce les jetons du
 *   quotient ; cette primitive divise elle-même et refuse si les deux ne
 *   coïncident pas. C'est la règle du moteur visuel (§0.3) : il ne peint pas un
 *   calcul faux, même si on le lui demande poliment. Et la colonne de gauche
 *   est vérifiée de même : la valeur restante, obtenue en retirant les paquets
 *   un à un, doit tomber sur le reste annoncé par le déroulé.
 */

import { tokenSpec, numberOf } from './helpers.js';
import { filetD } from '../layout.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'potence';

/**
 * Le tempo, en millisecondes — et il n'est PAS proportionnel à la durée
 * annoncée par l'émetteur.
 *
 * > « C'est trop rapide, même en ×0.25 je peine à suivre. Rends l'extraction
 * >   des chiffres 6× plus lente (mais sans ralentir la partie accolade). »
 * >   (l'auteur, de la division à l'accolade)
 *
 * ★ **LE GESTE DURE CE QU'IL A À MONTRER.** L'ancienne version partageait une
 *   durée fixe entre tous les tours : `2 ÷ 3` à trois décimales y faisait
 *   passer DIX-HUIT retraits en quatre secondes et demie — 145 ms chacun, soit
 *   deux images et demie. Le nombre de retraits, lui, dépend du calcul, pas du
 *   scénario : c'est donc lui qui commande. La durée du step s'en déduit (le
 *   compilateur la calcule sur l'étendue réelle des ops, `compile.js`), et la
 *   durée annoncée ne sert plus que de PLANCHER — si elle est plus longue que
 *   ce qu'il faut, le geste s'étire pour l'occuper.
 *
 * ★ Et le tracé des barres, lui, ne ralentit pas : c'est dans l'extraction que
 *   la compréhension se joue.
 */
const TEMPO = Object.freeze({
  BARRES: 760,      // ① l'écart, puis les deux traits
  POSE: 300,        //   le chiffre du quotient paraît, à zéro
  PAS: 700,         // ⚠️ UN EXEMPLAIRE TOUTES LES 700 ms — le cœur du geste
  REPOS: 640,       //   le temps de lire un zéro dont personne n'est parti
  RESPIRE: 240,     //   après le dernier atterrissage
  INSERTION: 620,   // ④ A glisse à gauche, « ,0 » s'inscrit
  EFFACEMENT: 640,  // ⑥ les barres et les opérandes s'en vont
  DESCENTE: 840,    //   le quotient rejoint la ligne
});

/** La part du pas que dure le vol d'un exemplaire — le reste est du silence. */
const PART_DU_VOL = 0.92;

/**
 * ⚠️ **UNE POTENCE DE SOIXANTE-DIX RETRAITS NE PEUT PAS DURER UNE MINUTE.**
 * Le pas nominal vaut pour les divisions qu'on montre vraiment (une vingtaine
 * d'exemplaires au plus) ; au-delà il se resserre, sans jamais descendre sous
 * le plancher — mieux vaut un geste rapide qu'un geste qu'on abandonne.
 */
const BUDGET_EXTRACTION = 15000;
const PAS_PLANCHER = 200;

/** L'air qu'on fait entre A et B pour loger la barre, en parts de corps. */
const ECART_BARRE = 0.8;
/** L'écart entre la ligne et la barre horizontale, en parts de corps. */
const SOUS_LA_LIGNE = 0.78;
/** Où s'écrit le quotient sous la barre horizontale, en parts de corps. */
const SOUS_LA_BARRE = 0.86;
/** Le débord de la barre horizontale au-delà de ce qu'elle couvre. */
const DEBORD = 8;
/** La barre verticale : ce qu'elle monte au-dessus de la ligne, ce qu'elle
 *  descend en dessous — elle longe le quotient, comme au tableau. */
const HAUT_VERTICAL = 0.85;
const BAS_VERTICAL = 2.05;

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

/**
 * Le nombre `v`, lu à l'échelle 10⁻ᵈ, écrit comme la colonne l'écrit.
 * `formate(30, 1)` → `3,0` ; `formate(20, 3)` → `0,020` ; `formate(0, 1)` → `0,0`.
 */
export function formate(v, d) {
  const s = String(v);
  if (d === 0) return s;
  const plein = s.padStart(d + 1, '0');
  return `${plein.slice(0, plein.length - d)},${plein.slice(plein.length - d)}`;
}

/** La partie entière de ce que la colonne écrit — ce que porte le jeton `A`. */
const partieEntiere = (v, d) => (d === 0 ? String(v) : formate(v, d).split(',')[0]);
/** Le jᵉ chiffre après la virgule (j de 1 à d). */
const chiffreDecimal = (v, d, j) => formate(v, d).split(',')[1][j - 1];

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
  const av = ctx.metrics.advance;
  const entiers = tours.filter((t) => !t.decimal).length;

  /* ── LA COLONNE DE GAUCHE, TOUR PAR TOUR ──────────────────────────────────
     Ce que la colonne montre au début du tour, ce que chaque exemplaire lui
     retire, et ce qu'il en reste à la fin. Tout est tenu en ENTIERS, à
     l'échelle du dernier rang affiché (10⁻ᵈ) : `3,0` est le nombre 30 avec
     d = 1, et lui retirer un « 0,5 » c'est lui retirer 5. La virgule n'est
     qu'une marque de rang — « comme si c'était le nombre ×10 » (l'auteur). */
  const colonne = [];
  {
    let reste = a;
    let d = 0;
    tours.forEach((tour, i) => {
      if (tour.decimal) { reste *= 10; d += 1; }          // « on rajoute un 0 »
      const rang = tour.decimal ? 0 : entiers - 1 - i;    // colonnes depuis la droite
      const emporte = b * (tour.decimal ? 1 : 10 ** rang);
      const debut = reste;
      reste -= tour.chiffre * emporte;
      if (reste < 0) {
        fail(`${ctx.where}potence ${a} ÷ ${b} : le tour ${i + 1} retirerait plus qu'il n'y a.`);
      }
      /* ⚠️ **DEUX CALCULS, UNE SEULE VÉRITÉ.** `derouleDeLaDivision` suit le
         dividende PARTIEL (la méthode de l'écolier) ; la colonne, elle, suit la
         valeur restante ENTIÈRE en lui retirant les paquets un à un. Les deux
         ne parlent du MÊME nombre qu'une fois le dividende épuisé — au dernier
         tour entier, puis à chaque décimale — et là ils doivent tomber
         d'accord, sans quoi la scène montrerait un nombre que le calcul ne
         produit pas (§0.3). */
      if ((tour.decimal || i === entiers - 1) && reste !== tour.reste) {
        fail(`${ctx.where}potence ${a} ÷ ${b} : au tour ${i + 1} la colonne tombe sur `
          + `${reste} quand le déroulé annonce ${tour.reste}. Le moteur visuel refuse `
          + 'd’afficher un calcul faux.');
      }
      colonne.push({ tour, d, rang, emporte, debut, fin: reste });
    });
  }

  /* ── LE TEMPO ─────────────────────────────────────────────────────────────
     On compte d'abord ce qu'il y a à montrer, on en déduit ce que ça dure. */
  const exemplaires = tours.reduce((n, t) => n + t.chiffre, 0);
  const pas = exemplaires
    ? Math.min(TEMPO.PAS, Math.max(PAS_PLANCHER, BUDGET_EXTRACTION / exemplaires))
    : TEMPO.PAS;
  const dureeDuTour = (c) => (c.tour.decimal ? TEMPO.INSERTION : 0) + TEMPO.POSE
    + (c.tour.chiffre ? c.tour.chiffre * pas + TEMPO.RESPIRE : TEMPO.REPOS);
  const naturel = TEMPO.BARRES + TEMPO.EFFACEMENT + TEMPO.DESCENTE
    + colonne.reduce((s, c) => s + dureeDuTour(c), 0);
  // La durée annoncée est un plancher, jamais un plafond : si elle est plus
  // large que nécessaire, le geste s'y étend ; si elle est trop courte, c'est
  // elle qui cède — le compilateur déduit la durée du step de l'étendue réelle.
  const etire = T > naturel ? T / naturel : 1;
  const ms = (x) => x * etire;

  /* ── ① L'ÉCART, PUIS LES DEUX BARRES ──────────────────────────────────────

     > « Espace-les pour insérer l'opérateur mais ne les efface pas. » (l'auteur)

     ⚠️ **ET LA BARRE ÉTAIT DESSINÉE SUR LE DIVIDENDE.** Elle se posait au
       milieu des CENTRES de A et de B ; sur `13 │ 5`, ce milieu tombe dans le
       « 3 ». On écarte donc les deux jetons d'abord, et la barre se pose au
       milieu de l'INTERVALLE — entre le bord droit de A et le bord gauche de
       B —, où elle ne mord sur rien. */
  const noeudB = ctx.scene.get(idB);
  noeudB.gapBefore = Math.max(noeudB.gapBefore || 0, fs * ECART_BARRE);
  ctx.reflow({ at: 0, dur: ms(TEMPO.BARRES) * 0.5, ease: EASE.move });

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
  const largeurA = ctx.scene.get(idA).w;
  const largeurB = noeudB.w;
  const bordDroit = posA.x + largeurA / 2;   // le bord droit de la colonne de gauche
  const gaucheB = posB.x - largeurB / 2;
  const barreX = (bordDroit + gaucheB) / 2;
  const barreY = ligneY + fs * SOUS_LA_LIGNE;

  /* Les colonnes de la potence, comptées depuis la droite : la colonne 0 est
     celle qui touche la barre. C'est le repère de TOUT ce qui s'écrit à gauche —
     et c'est pourquoi rien n'y bouge quand un chiffre de tête disparaît. */
  const colonneX = (rang) => bordDroit - (rang + 0.5) * av;
  // Le centre du jeton `A` : il porte la partie entière, calée à droite, juste
  // avant la virgule et les décimales quand il y en a.
  const centreEntier = (longueur, d) => bordDroit - (d > 0 ? (d + 1) * av : 0) - (longueur * av) / 2;

  // Le quotient s'écrit sous la barre, à partir du bord gauche de B — une
  // colonne par chiffre, plus une pour la virgule. La barre horizontale DOIT
  // le couvrir : c'est elle qui dit « ceci est le résultat ».
  const colonnesQuotient = tours.length + (entiers < tours.length ? 1 : 0);
  const quotientX = (col) => gaucheB + (col + 0.5) * av;
  const quotientY = barreY + fs * SOUS_LA_BARRE;
  const finQuotient = gaucheB + colonnesQuotient * av;
  const longueurBarre = Math.max(largeurB + 2 * DEBORD, finQuotient + DEBORD - barreX);

  const idVert = ctx.gensym('potvert');
  ctx.scene.create({
    id: idVert, role: 'filet', inFlow: false, w: 1,
    data: { d: `M 0 ${-fs * HAUT_VERTICAL} V ${fs * BAS_VERTICAL}` },
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idVert, { x: barreX, y: ligneY });
  ctx.anim({ id: idVert, prop: 'opacity', to: 1, at: ms(TEMPO.BARRES) * 0.15, dur: ms(TEMPO.BARRES) * 0.4, ease: EASE.fade });

  const idHoriz = ctx.gensym('pothoriz');
  ctx.scene.create({
    id: idHoriz, role: 'filet', inFlow: false, w: longueurBarre,
    data: { d: filetD(longueurBarre / 2) },
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idHoriz, { x: barreX + longueurBarre / 2, y: barreY });
  ctx.anim({ id: idHoriz, prop: 'opacity', to: 1, at: ms(TEMPO.BARRES) * 0.5, dur: ms(TEMPO.BARRES) * 0.45, ease: EASE.fade });

  /* ── ② à ⑤ LE CALCUL ─────────────────────────────────────────────────────
     À gauche, la colonne perd ce qui la quitte. À droite, sous la barre, le
     quotient se COMPTE, chiffre par chiffre — et la virgule paraît des deux
     côtés au même instant, parce que c'est le même geste. */
  const chiffres = [];       // les jetons du quotient, dans l'ordre de lecture
  const decimalesA = [];     // les chiffres après la virgule, colonne de gauche
  let idVirgA = null;        // la virgule de la colonne de gauche
  let idVirgQ = null;        // celle du quotient
  let longueurA = String(a).length;
  let t = ms(TEMPO.BARRES);

  colonne.forEach((c, i) => {
    const spec = sorties[i];
    const d = c.d;

    /* ④ **LE DÉCALAGE, ET C'EST UN DÉPLACEMENT, PAS UN CHANGEMENT DE TEXTE.**

       > « On décale A sur la gauche pour insérer ",0" à sa droite, avant la
       >   barre verticale qui le sépare de B, et on fait de même sous B. »

       La version précédente réécrivait simplement le texte du jeton : rien ne
       glissait, rien ne s'insérait, et « 3 » devenait « 3,0 » d'un coup, à
       cheval sur la barre. Ici la colonne garde son bord droit contre la
       barre : A recule d'une colonne (de deux, la première fois, pour la
       virgule ET le zéro), et ce qui s'inscrit à sa droite naît à sa place. */
    if (c.tour.decimal) {
      const glisse = ms(TEMPO.INSERTION);
      ctx.place(idA, { x: centreEntier(longueurA, d), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      // la virgule et les décimales déjà écrites reculent d'une colonne
      if (idVirgA) ctx.place(idVirgA, { x: colonneX(d), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      decimalesA.forEach((dec, k) => {
        ctx.place(dec, { x: colonneX(d - 1 - k), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      });
      if (!idVirgA) {
        idVirgA = ctx.gensym('potvirga');
        ctx.scene.create({
          id: idVirgA, role: 'text', text: ',', kind: 'punct', inFlow: false, base: { opacity: 0 },
        }, { where: ctx.where });
        ctx.scene.place(idVirgA, { x: colonneX(d), y: ligneY });
        ctx.anim({ id: idVirgA, prop: 'opacity', to: 1, at: t + glisse * 0.35, dur: glisse * 0.65, ease: EASE.fade });
      }
      // le zéro qu'on abaisse — il naît à zéro et c'est de lui qu'on retirera
      const idZero = ctx.gensym('potdec');
      ctx.scene.create({
        id: idZero, role: 'text', text: '0', kind: 'digit', inFlow: false,
        base: { opacity: 0, scale: 0.7 },
      }, { where: ctx.where });
      ctx.scene.place(idZero, { x: colonneX(0), y: ligneY });
      ctx.anim({ id: idZero, prop: 'opacity', to: 1, at: t + glisse * 0.35, dur: glisse * 0.65, ease: EASE.fade });
      ctx.anim({ id: idZero, prop: 'scale', to: 1, at: t + glisse * 0.35, dur: glisse * 0.65, ease: EASE.pop });
      decimalesA.push(idZero);
      // « et on fait de même sous B » : la virgule du quotient, au même instant
      if (!idVirgQ) {
        idVirgQ = ctx.gensym('potvirg');
        ctx.scene.create({
          id: idVirgQ, role: 'text', text: ',', kind: 'punct', inFlow: false, base: { opacity: 0 },
        }, { where: ctx.where });
        ctx.scene.place(idVirgQ, { x: quotientX(entiers), y: quotientY });
        ctx.anim({ id: idVirgQ, prop: 'opacity', to: 1, at: t + glisse * 0.35, dur: glisse * 0.65, ease: EASE.fade });
      }
      t += glisse;
    }

    // --- le chiffre du quotient : il paraît À ZÉRO, et il montera seul -------
    const col = i + (i >= entiers ? 1 : 0);   // la virgule occupe une colonne
    const place = { x: quotientX(col), y: quotientY };
    ctx.scene.create({
      id: spec.id, role: 'text', text: spec.text, kind: spec.kind || 'digit', inFlow: false,
      base: { opacity: 0, scale: 0.7 },
    }, { where: ctx.where });
    ctx.scene.place(spec.id, place);
    ctx.anim({ id: spec.id, prop: 'opacity', to: 1, at: t, dur: ms(TEMPO.POSE) * 0.8, ease: EASE.fade });
    ctx.anim({ id: spec.id, prop: 'scale', to: 1, at: t, dur: ms(TEMPO.POSE) * 0.8, ease: EASE.pop });
    chiffres.push(spec.id);

    const debutTour = t;
    const depart0 = t + ms(TEMPO.POSE);
    const n = c.tour.chiffre;
    const finTour = n
      ? depart0 + n * ms(pas) + ms(TEMPO.RESPIRE)
      : depart0 + ms(TEMPO.REPOS);
    const span = Math.max(1, finTour - debutTour);

    /* ★ **LE CHIFFRE SE COMPTE, IL NE SE POSE PAS.**

       > « La valeur B est EXTRAITE autant de fois qu'elle se trouve dans le
       >   premier chiffre de A et INCRÉMENTE D'1 PAR EXEMPLAIRE le premier
       >   chiffre sous B. » (l'auteur)

       C'est le même geste que la division à l'accolade, et pour la même
       raison : un chiffre qui paraît tout fait n'apprend rien. Quand il n'en
       part aucun — « 50 ne tient pas dans 13 » —, le chiffre reste à zéro, et
       ce zéro-là est justement celui qu'il faut voir s'écrire ; c'est pourquoi
       un tour vide prend quand même son temps. */
    const atterrissages = [];
    for (let e = 0; e < n; e++) {
      const at = depart0 + e * ms(pas);
      const vol = Math.max(1, ms(pas) * PART_DU_VOL);
      atterrissages.push(at + vol);

      const id = ctx.gensym('potpaquet');
      const emporte = formate(c.emporte, d);
      ctx.scene.create({
        id, role: 'text', text: emporte, kind: 'digit', inFlow: false,
        base: { opacity: 0, scale: 0.5, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, { x: colonneX(c.rang), y: ligneY });
      ctx.anim({
        id,
        prop: 'translate',
        values: [
          { x: colonneX(c.rang), y: ligneY },
          { x: barreX, y: ligneY - fs * 0.42 },
          { x: posB.x, y: ligneY + fs * 0.12 },
          { x: place.x, y: place.y },
        ],
        at,
        dur: vol,
        ease: EASE.linear,
      });
      ctx.anim({ id, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.12, 0.86, 1], at, dur: vol });
      ctx.anim({ id, prop: 'scale', values: [0.55, 0.68, 0.55], offsets: [0, 0.5, 1], at, dur: vol });
      /* Il vaut ce qu'il emporte en partant, `1` en arrivant : on retire
         cinquante, ça compte pour un. Même bascule qu'à l'accolade, et pour la
         même raison — un « 50 » qui atterrit sur un compteur affichant `1` se
         lirait comme un `+50`. */
      ctx.discrete({
        id, channel: 'text', at, dur: vol,
        render: (u) => (u < 0.55 ? emporte : '1'),
      });

      /* La colonne est calée à droite : quand elle perd un chiffre de tête, ce
         sont ses COLONNES qui restent en place, donc le jeton doit sauter d'une
         demi-chasse. Un saut d'une milliseconde, à l'instant exact du départ —
         rien ne se voit bouger, et tout reste aligné. */
      const apres = c.debut - (e + 1) * c.emporte;
      const longueur = partieEntiere(apres, d).length;
      if (longueur !== longueurA) {
        longueurA = longueur;
        ctx.place(idA, { x: centreEntier(longueurA, d), y: ligneY }, { at, dur: 1, ease: EASE.linear });
      }
    }

    // combien d'exemplaires sont PARTIS à l'instant u — la colonne se vide au
    // départ, pas à l'arrivée : ce qui a quitté le nombre n'est plus en lui.
    const departs = atterrissages.map((_, e) => (depart0 + e * ms(pas) - debutTour) / span);
    const partis = (u) => {
      let k = 0;
      while (k < departs.length && u >= departs[k]) k++;
      return k;
    };
    const valeur = (u) => c.debut - partis(u) * c.emporte;

    ctx.discrete({
      id: idA, channel: 'text', at: debutTour, dur: span,
      render: (u) => partieEntiere(valeur(u), d),
    });
    decimalesA.forEach((dec, k) => {
      ctx.discrete({
        id: dec, channel: 'text', at: debutTour, dur: span,
        render: (u) => chiffreDecimal(valeur(u), d, k + 1),
      });
    });

    // Le chiffre du quotient suit les ATTERRISSAGES, un cran chacun. Fonction
    // pure de `t`, donc exacte au scrubbing, en avant comme en arrière.
    const bornes = atterrissages.map((x) => (x - debutTour) / span);
    ctx.discrete({
      id: spec.id, channel: 'text', at: debutTour, dur: span,
      render: (u) => {
        let compte = 0;
        while (compte < bornes.length && u >= bornes[compte]) compte++;
        return String(compte);
      },
    });

    t = finTour;
  });

  /* ── ⑥ TOUT S'EFFACE, SAUF LE QUOTIENT ───────────────────────────────────
     « Puis A et B disparaissent avec les deux barres et le nombre sous B prend
     leur place en perdant sa virgule DANS LE DÉPLACEMENT. » — la virgule du
     quotient ne s'en va donc pas avec le reste : elle s'éteint pendant que les
     chiffres montent, et l'écart qu'elle laissait se referme de lui-même. */
  const tEffacement = ms(TEMPO.EFFACEMENT);
  const tDescente = ms(TEMPO.DESCENTE);
  const aEffacer = [idVert, idHoriz, idA, idB, ...decimalesA];
  if (idVirgA) aEffacer.push(idVirgA);
  for (const id of aEffacer) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: t, dur: tEffacement });
  }
  if (idVirgQ) {
    ctx.anim({ id: idVirgQ, prop: 'opacity', to: 0, at: t + tEffacement, dur: tDescente * 0.6 });
  }

  /* ★ **LE QUOTIENT REJOINT LA LIGNE, ET C'EST LUI QUI RESTE.**
     Les chiffres étaient hors flux le temps du calcul — ils appartenaient à la
     potence, pas à la démonstration. Ils y entrent maintenant, à la place que
     le dividende occupait, et la ligne se referme sur eux.

     ⚠️ **LA PLACE SE LIT AVANT LA MISE À MORT.** `flowIndex` d'un jeton retiré
       du flux rend `-1` : le quotient s'ajoutait alors EN FIN DE LIGNE. Cela ne
       se voyait pas tant que la division était le dernier nombre de la ligne —
       et se serait vu au premier `7 135`. */
  const rang = ctx.scene.flowIndex(idA);
  for (const id of aEffacer) ctx.scene.kill(id, ctx.where);
  if (idVirgQ) ctx.scene.kill(idVirgQ, ctx.where);
  chiffres.forEach((id, i) => {
    ctx.scene.enterFlow(id, rang >= 0 ? rang + i : undefined, ctx.where);
  });
  ctx.reflow({ at: t + tEffacement, dur: tDescente, ease: EASE.move });
}
