/**
 * `potence` — LA DIVISION POSÉE, COMME AU TABLEAU.
 *
 * > « Trace une barre verticale entre A et B et une barre horizontale sous B
 * >   qui s'arrête sur la barre verticale. La valeur B est extraite autant de
 * >   fois qu'elle se trouve dans le premier chiffre de A et incrémente d'1 par
 * >   exemplaire le premier chiffre sous B. Quand le premier chiffre de A < B
 * >   ON INCLUT LE 2ⁿᵈ CHIFFRE DE A et on refait de même […] jusqu'à ce que
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
 * ★ **CE QUI EST MONTRÉ, DANS L'ORDRE** — `105 ÷ 5`, puis `13 ÷ 5`
 *
 * ```
 *      1̲0̶5̶ │ 5        ②  seul le PREMIER chiffre est en jeu, le reste est
 *     ─────┼─────         estompé : 5 ne tient pas dans 1, on écrit 0
 *      1̲0̲5̶ │ 02       ③  le 2ᵉ chiffre entre en jeu ; deux « 5 » s'en vont,
 *                          la zone passe de 10 à 05 puis 00
 *      0̲0̲5̲ │ 021      ④  le 3ᵉ entre à son tour, un « 5 » s'en va
 *
 *      3̲,̲0̲ │ 02,0     ⑤  (13 ÷ 5) A GLISSE À GAUCHE, « ,0 » s'inscrit à sa
 *                          droite — et « ,0 » s'inscrit de même sous la barre
 *      0̲,̲0̲ │ 02,6     ⑥  six « 5 » quittent la zone : 3,0 … 0,0
 *                      ⑦  tout s'efface, le quotient descend sans sa virgule
 * ```
 *
 * ★ **LA ZONE EN JEU EST DÉSIGNÉE PAR L'ESTOMPAGE, et le paquet vaut `B`.**
 *
 * > « La solution est soit de flouter tout ce qui n'est pas en jeu (donc "5"
 * >   dans "105" quand on enlève 5 au niveau des dizaines), soit de mettre une
 * >   accolade au-dessus des chiffres concernés et de la déplacer au fur et à
 * >   mesure que le calcul avance. » (l'auteur)
 *
 * C'est l'estompage qui a été retenu : la scène porte déjà deux barres, une
 * colonne, un quotient et une virgule — une accolade mobile y ajouterait un
 * cinquième objet en mouvement, alors que l'estompage fait porter l'information
 * par les chiffres eux-mêmes.
 *
 * ⚠️ **ET C'EST CE QUI RÉSOUT LA CONTRADICTION.** Une version intermédiaire
 *   affichait à gauche la valeur restante ENTIÈRE (`105`, `55`, `5`) ; il
 *   fallait alors faire voler des paquets de `50` pour ne pas mentir sur la
 *   soustraction. L'auteur a tranché : le paquet vaut `B`, toujours. La ligne
 *   ne prétend donc plus montrer un nombre unique — elle montre un dividende
 *   dont une partie seulement est en jeu, et c'est dans CETTE zone que `B` est
 *   retiré. La ligne entière, elle, continue de se lire comme le reste vrai
 *   (`105` → `055` → `005` → `000`), ce que le contrôle croisé vérifie.
 *
 * ★ **RIEN NE BOUGE, RIEN NE S'EFFACE.** Chaque chiffre garde sa colonne du
 *   début à la fin ; seuls changent son opacité (il entre en jeu) et sa valeur
 *   (on lui retire `B`). Le défaut nommé par l'auteur sur la division à
 *   l'accolade — « tu effaces les chiffres pour les remettre […] ça ne va
 *   pas » — n'a donc pas d'équivalent ici : la ligne ne se réécrit jamais, et
 *   ce qu'elle vaut ne fait que décroître.
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
 *   calcul faux, même si on le lui demande poliment.
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
  BARRES: 760,      // ① l'écart, les deux traits, et l'estompage
  POSE: 300,        //   le chiffre entre en jeu, celui du quotient paraît à zéro
  PAS: 700,         // ⚠️ UN EXEMPLAIRE TOUTES LES 700 ms — le cœur du geste
  REPOS: 640,       //   le temps de lire un zéro dont personne n'est parti
  RESPIRE: 240,     //   après le dernier atterrissage
  INSERTION: 620,   // ⑤ A glisse à gauche, « ,0 » s'inscrit
  EFFACEMENT: 640,  // ⑦ les barres et les opérandes s'en vont
  DESCENTE: 840,    //   le quotient rejoint la ligne
});

/** La part du pas que dure le vol d'un exemplaire — le reste est du silence. */
const PART_DU_VOL = 0.92;

/** Ce que vaut l'opacité d'un chiffre qui n'est PAS en jeu. */
const ESTOMPE = 0.3;

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
 * Le déroulé d'une division posée : ce qu'on écrit au quotient, quel dividende
 * PARTIEL on travaille, et ce qui en reste, tour par tour.
 *
 * On avance chiffre par chiffre sur le dividende — c'est ce qui fait apparaître
 * les zéros intercalaires du quotient —, puis, une fois le dividende épuisé, on
 * ajoute des zéros décimaux tant qu'il reste quelque chose et qu'on n'a pas
 * épuisé les décimales permises.
 *
 * `courantAvant` est exactement ce que la ZONE EN JEU affiche au début du tour,
 * et `reste` ce qu'elle affiche à la fin : la scène n'a rien à recalculer, elle
 * n'a qu'à l'écrire dans les colonnes qu'il faut.
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
 * Ce que la LIGNE ENTIÈRE affiche à un instant donné, chiffres seuls, virgule
 * exclue : la zone en jeu (complétée de zéros à gauche, comme au tableau) suivie
 * des chiffres pas encore descendus.
 *
 * @param {number} zone   la valeur travaillée à cet instant
 * @param {number} large  le nombre de colonnes qu'elle occupe
 * @param {string} queue  les chiffres du dividende encore estompés
 */
export const ligneAffichee = (zone, large, queue) => String(zone).padStart(large, '0') + queue;

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
  const chiffresA = [...String(a)];
  const L = chiffresA.length;
  const entiers = tours.filter((t) => !t.decimal).length;

  /* ── LE PLAN DE LA LIGNE, TOUR PAR TOUR ───────────────────────────────────
     Quelles colonnes sont en jeu, quelle valeur elles portent, et ce que la
     ligne entière vaut alors. C'est le seul endroit où l'on parle d'arithmétique
     ; tout ce qui suit ne fait que placer, éclairer et animer. */
  const plans = [];
  {
    let reste = a;    // la valeur restante VRAIE, à l'échelle 10⁻ᵈ
    let d = 0;        // décimales abaissées
    tours.forEach((tour, i) => {
      if (tour.decimal) { reste *= 10; d += 1; }          // « on rajoute un 0 »
      // les colonnes en jeu : le préfixe du dividende, plus les décimales
      // abaissées ; elles s'étendent d'exactement une colonne par tour.
      const large = tour.decimal ? L + d : i + 1;
      const queue = tour.decimal ? '' : chiffresA.slice(i + 1).join('');
      /* ★ **CE QUE LE PAQUET RETIRE À LA ZONE, ET CE QU'IL RETIRE À LA LIGNE.**
         Il vaut `B` — c'est ce que l'auteur a tranché, et c'est ce qu'on voit
         voler. Retiré dans la colonne des dizaines, il fait perdre `B0` à la
         ligne : ce n'est pas une contradiction, c'est la définition même des
         colonnes, et c'est ce qui explique pourquoi le chiffre du quotient
         s'écrit à ce rang-là. */
      const pasDeLaLigne = b * (tour.decimal ? 1 : 10 ** (L - 1 - i));
      /* ⚠️ **CONTRÔLE CROISÉ (§0.3) : CE QUI EST ÉCRIT EST CE QUI EST COMPTÉ.**
         À chaque exemplaire près, la ligne affichée — zone complétée de zéros,
         suivie des chiffres estompés — doit se lire exactement comme la valeur
         restante. Deux chemins de calcul, une seule vérité ; sinon la scène
         montrerait un nombre que le calcul ne produit pas. */
      for (let p = 0; p <= tour.chiffre; p++) {
        const affiche = Number(ligneAffichee(tour.courantAvant - p * b, large, queue));
        if (affiche !== reste - p * pasDeLaLigne) {
          fail(`${ctx.where}potence ${a} ÷ ${b} : au tour ${i + 1}, après ${p} retrait(s), `
            + `la ligne montrerait ${affiche} quand il reste ${reste - p * pasDeLaLigne}. `
            + 'Le moteur visuel refuse d’afficher un calcul faux.');
        }
      }
      reste -= tour.chiffre * pasDeLaLigne;
      plans.push({ tour, d, large });
    });
  }

  /* ── LE TEMPO ─────────────────────────────────────────────────────────────
     On compte d'abord ce qu'il y a à montrer, on en déduit ce que ça dure. */
  const exemplaires = tours.reduce((n, t) => n + t.chiffre, 0);
  const pas = exemplaires
    ? Math.min(TEMPO.PAS, Math.max(PAS_PLANCHER, BUDGET_EXTRACTION / exemplaires))
    : TEMPO.PAS;
  const dureeDuTour = (tour) => (tour.decimal ? TEMPO.INSERTION : 0) + TEMPO.POSE
    + (tour.chiffre ? tour.chiffre * pas + TEMPO.RESPIRE : TEMPO.REPOS);
  const naturel = TEMPO.BARRES + TEMPO.EFFACEMENT + TEMPO.DESCENTE
    + tours.reduce((s, t) => s + dureeDuTour(t), 0);
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
  const bordDroit = posA.x + largeurA / 2;   // le bord droit du dividende
  const gaucheB = posB.x - largeurB / 2;
  const barreX = (bordDroit + gaucheB) / 2;
  const barreY = ligneY + fs * SOUS_LA_LIGNE;

  /* Les colonnes de la potence, comptées depuis la droite : la colonne 0 est
     celle qui touche la barre. Aucun chiffre n'en change jamais — c'est le
     repère qui rend le geste lisible, et ce qui permet d'estomper plutôt que
     de déplacer. Seule l'insertion d'une décimale pousse tout le monde d'une
     colonne vers la gauche, parce que l'auteur l'a demandé ainsi. */
  const colonneX = (rang) => bordDroit - (rang + 0.5) * av;
  const xEntier = (c, d) => colonneX((L - 1 - c) + (d > 0 ? d + 1 : 0));
  const xDecimale = (k, d) => colonneX(d - k);

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
  ctx.anim({ id: idVert, prop: 'opacity', to: 1, at: ms(TEMPO.BARRES) * 0.12, dur: ms(TEMPO.BARRES) * 0.35, ease: EASE.fade });

  const idHoriz = ctx.gensym('pothoriz');
  ctx.scene.create({
    id: idHoriz, role: 'filet', inFlow: false, w: longueurBarre,
    data: { d: filetD(longueurBarre / 2) },
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idHoriz, { x: barreX + longueurBarre / 2, y: barreY });
  ctx.anim({ id: idHoriz, prop: 'opacity', to: 1, at: ms(TEMPO.BARRES) * 0.3, dur: ms(TEMPO.BARRES) * 0.35, ease: EASE.fade });

  /* ── ② LE DIVIDENDE S'OUVRE EN COLONNES, ET S'ESTOMPE ─────────────────────

     Un jeton porte UN texte et une seule opacité ; désigner « le premier
     chiffre de A » demande donc une colonne par chiffre. Elles naissent à la
     place EXACTE des glyphes qu'elles reprennent — même chasse, même ligne de
     base, opacité pleine — et le jeton du dividende se réduit au même instant à
     son premier chiffre. Rien ne bouge, rien ne clignote : à l'image, il ne se
     passe rien du tout, jusqu'à ce que les colonnes qui ne sont pas en jeu
     s'estompent. C'est ce fondu-là, et lui seul, qui se voit.

     ⚠️ Le partage a lieu APRÈS l'écart : tant que la ligne se réagence, les
       glyphes de A n'ont pas de place fixe où poser des colonnes. */
  const tPartage = ms(TEMPO.BARRES) * 0.5;
  const colonnesA = [idA];
  for (let c = 1; c < L; c++) {
    const id = ctx.gensym('potchiffre');
    ctx.scene.create({
      id, role: 'text', text: chiffresA[c], kind: 'digit', inFlow: false, base: { opacity: 0 },
    }, { where: ctx.where });
    ctx.scene.place(id, { x: xEntier(c, 0), y: ligneY });
    // il paraît sans transition, exactement là où le glyphe était déjà…
    ctx.anim({ id, prop: 'opacity', to: 1, at: tPartage, dur: 1, ease: EASE.linear });
    // …puis il recule dans l'ombre : il n'est pas encore en jeu.
    ctx.anim({
      id, prop: 'opacity', to: ESTOMPE,
      at: tPartage + 1, dur: Math.max(1, ms(TEMPO.BARRES) * 0.45), ease: EASE.fade,
    });
    colonnesA.push(id);
  }
  if (L > 1) {
    // le jeton du dividende ne garde que sa première colonne : il saute d'une
    // demi-chasse pour que SON chiffre ne bouge pas d'un pixel.
    ctx.place(idA, { x: xEntier(0, 0), y: ligneY }, { at: tPartage, dur: 1, ease: EASE.linear });
  }

  /* ── ③ à ⑥ LE CALCUL ─────────────────────────────────────────────────────
     À gauche, la zone en jeu s'étend d'une colonne par tour et perd `B` par
     exemplaire. À droite, sous la barre, le quotient se COMPTE, chiffre par
     chiffre — et la virgule paraît des deux côtés au même instant, parce que
     c'est le même geste. */
  const chiffres = [];       // les jetons du quotient, dans l'ordre de lecture
  const decimalesA = [];     // les zéros abaissés, colonne de gauche
  let idVirgA = null;        // la virgule de la colonne de gauche
  let idVirgQ = null;        // celle du quotient
  let t = ms(TEMPO.BARRES);

  plans.forEach((p, i) => {
    const spec = sorties[i];
    const { tour, d, large } = p;
    // l'instant où le chiffre du quotient paraît : le début du tour, sauf sous
    // la virgule, où il s'inscrit AVEC elle (voir plus bas).
    let apparition = t;

    /* ⑤ **LE DÉCALAGE, ET C'EST UN DÉPLACEMENT, PAS UN CHANGEMENT DE TEXTE.**

       > « On décale A sur la gauche pour insérer ",0" à sa droite, avant la
       >   barre verticale qui le sépare de B, et on fait de même sous B. »

       Une version précédente réécrivait simplement le texte du jeton : rien ne
       glissait, rien ne s'insérait, et « 3 » devenait « 3,0 » d'un coup, à
       cheval sur la barre. Ici la ligne garde son bord droit contre la barre :
       tout le dividende recule d'une colonne (de deux, la première fois, pour
       la virgule ET le zéro), et ce qui s'inscrit à sa droite naît à sa place. */
    if (tour.decimal) {
      const glisse = ms(TEMPO.INSERTION);
      colonnesA.forEach((id, c) => {
        ctx.place(id, { x: xEntier(c, d), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      });
      if (idVirgA) ctx.place(idVirgA, { x: colonneX(d), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      decimalesA.forEach((id, k) => {
        ctx.place(id, { x: xDecimale(k + 1, d), y: ligneY }, { at: t, dur: glisse, ease: EASE.move });
      });
      if (!idVirgA) {
        idVirgA = ctx.gensym('potvirga');
        ctx.scene.create({
          id: idVirgA, role: 'text', text: ',', kind: 'punct', inFlow: false, base: { opacity: 0 },
        }, { where: ctx.where });
        ctx.scene.place(idVirgA, { x: colonneX(d), y: ligneY });
        ctx.anim({ id: idVirgA, prop: 'opacity', to: 1, at: t + glisse * 0.35, dur: glisse * 0.65, ease: EASE.fade });
      }
      /* Le zéro qu'on abaisse — « on rajoute un 0 de plus, ce qui donne
         "0,A0" ». Il naît EN JEU, à pleine encre : c'est de lui qu'on va
         retirer `B`. */
      const idZero = ctx.gensym('potdec');
      ctx.scene.create({
        id: idZero, role: 'text', text: '0', kind: 'digit', inFlow: false,
        base: { opacity: 0, scale: 0.7 },
      }, { where: ctx.where });
      ctx.scene.place(idZero, { x: xDecimale(d, d), y: ligneY });
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
      // ★ « ON FAIT DE MÊME SOUS B (on ajoute ",0") » : la virgule ET le zéro.
      //   Le chiffre du quotient de ce tour-ci EST ce zéro-là — il paraît donc
      //   avec la virgule, et non un temps plus tard : c'est un seul geste, des
      //   deux côtés de la barre.
      apparition = t + glisse * 0.35;
      t += glisse;
    }

    /* ★ **LE CHIFFRE SUIVANT ENTRE EN JEU — c'est un ÉCLAIRAGE, pas un
       déplacement.** « Quand le premier chiffre de A < B, on inclut le 2ⁿᵈ
       chiffre de A » : le chiffre était là depuis le début, estompé ; il passe
       à pleine encre, dans sa colonne, sans avoir bougé d'un pixel. */
    if (!tour.decimal && i > 0) {
      ctx.anim({
        id: colonnesA[i], prop: 'opacity', to: 1,
        at: t, dur: Math.max(1, ms(TEMPO.POSE) * 0.9), ease: EASE.fade,
      });
    }

    // --- le chiffre du quotient : il paraît À ZÉRO, et il montera seul -------
    const col = i + (i >= entiers ? 1 : 0);   // la virgule occupe une colonne
    const place = { x: quotientX(col), y: quotientY };
    ctx.scene.create({
      id: spec.id, role: 'text', text: spec.text, kind: spec.kind || 'digit', inFlow: false,
      base: { opacity: 0, scale: 0.7 },
    }, { where: ctx.where });
    ctx.scene.place(spec.id, place);
    const poseQ = Math.max(1, ms(TEMPO.POSE) * 0.8);
    ctx.anim({ id: spec.id, prop: 'opacity', to: 1, at: apparition, dur: poseQ, ease: EASE.fade });
    ctx.anim({ id: spec.id, prop: 'scale', to: 1, at: apparition, dur: poseQ, ease: EASE.pop });
    chiffres.push(spec.id);

    const debutTour = t;
    const depart0 = t + ms(TEMPO.POSE);
    const n = tour.chiffre;
    const finTour = n
      ? depart0 + n * ms(pas) + ms(TEMPO.RESPIRE)
      : depart0 + ms(TEMPO.REPOS);

    /* ★ **LE CHIFFRE SE COMPTE, IL NE SE POSE PAS.**

       > « La valeur B est EXTRAITE autant de fois qu'elle se trouve dans le
       >   premier chiffre de A et INCRÉMENTE D'1 PAR EXEMPLAIRE le premier
       >   chiffre sous B. » (l'auteur)

       C'est le même geste que la division à l'accolade, et pour la même
       raison : un chiffre qui paraît tout fait n'apprend rien. Quand il n'en
       part aucun — « 5 ne tient pas dans 1 » —, le chiffre reste à zéro, et
       ce zéro-là est justement celui qu'il faut voir s'écrire ; c'est pourquoi
       un tour vide prend quand même son temps. */
    const departX = tour.decimal ? xDecimale(d, d) : xEntier(i, d);
    const atterrissages = [];
    for (let e = 0; e < n; e++) {
      const at = depart0 + e * ms(pas);
      const vol = Math.max(1, ms(pas) * PART_DU_VOL);
      atterrissages.push(at + vol);

      const id = ctx.gensym('potpaquet');
      ctx.scene.create({
        id, role: 'text', text: String(b), kind: 'digit', inFlow: false,
        base: { opacity: 0, scale: 0.5, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, { x: departX, y: ligneY });
      ctx.anim({
        id,
        prop: 'translate',
        values: [
          { x: departX, y: ligneY },
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
      /* Il vaut `B` en partant — la valeur qu'on retire à la zone — et `1` en
         arrivant : on retire cinq, ça compte pour un. Même bascule qu'à
         l'accolade, et pour la même raison : sans elle, un « 5 » qui atterrit
         sur un compteur affichant `1` se lirait comme un `+5`. */
      ctx.discrete({
        id, channel: 'text', at, dur: vol,
        render: (u) => (u < 0.55 ? String(b) : '1'),
      });
    }

    /* La zone en jeu perd `B` AU DÉPART de chaque exemplaire — pas à son
       arrivée : ce qui a quitté le nombre n'est plus en lui. Chaque colonne
       rend son propre chiffre, fonction pure du temps ; le premier tour prend
       son canal dès le partage, pour qu'aucun jeton ne montre un instant le
       texte qu'il avait avant d'être partagé. */
    const debutCanal = i === 0 ? tPartage : debutTour;
    const span = Math.max(1, finTour - debutCanal);
    const departs = atterrissages.map((_, e) => (depart0 + e * ms(pas) - debutCanal) / span);
    const partis = (u) => {
      let k = 0;
      while (k < departs.length && u >= departs[k]) k++;
      return k;
    };
    const texte = (u) => ligneAffichee(tour.courantAvant - partis(u) * b, large, '');
    const enJeu = tour.decimal ? [...colonnesA, ...decimalesA] : colonnesA.slice(0, i + 1);
    enJeu.forEach((id, c) => {
      ctx.discrete({
        id, channel: 'text', at: debutCanal, dur: span, render: (u) => texte(u)[c],
      });
    });

    // Le chiffre du quotient suit les ATTERRISSAGES, un cran chacun. Fonction
    // pure de `t`, donc exacte au scrubbing, en avant comme en arrière.
    const spanQ = Math.max(1, finTour - apparition);
    const bornes = atterrissages.map((x) => (x - apparition) / spanQ);
    ctx.discrete({
      id: spec.id, channel: 'text', at: apparition, dur: spanQ,
      render: (u) => {
        let compte = 0;
        while (compte < bornes.length && u >= bornes[compte]) compte++;
        return String(compte);
      },
    });

    t = finTour;
  });

  /* ── ⑦ TOUT S'EFFACE, SAUF LE QUOTIENT ───────────────────────────────────
     « Puis A et B disparaissent avec les deux barres et le nombre sous B prend
     leur place en perdant sa virgule DANS LE DÉPLACEMENT. » — la virgule du
     quotient ne s'en va donc pas avec le reste : elle s'éteint pendant que les
     chiffres montent, et l'écart qu'elle laissait se referme de lui-même. */
  const tEffacement = ms(TEMPO.EFFACEMENT);
  const tDescente = ms(TEMPO.DESCENTE);
  const aEffacer = [idVert, idHoriz, ...colonnesA, idB, ...decimalesA];
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
