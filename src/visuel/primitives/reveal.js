/**
 * `reveal` — le verdict.
 *
 * C'est la chute de toute la démonstration : elle doit se voir. L'ordre des
 * gestes est le propos, et il dépend de ce qu'il y a à révéler — **un** 666,
 * ou plusieurs.
 *
 * ## 1. La scène se vide
 *
 * Tout ce qui traînait encore — les `-`, le `.fr`, ce qui n'a pas été retenu et
 * qu'un `dim` avait laissé en veilleuse — **s'efface**. Un filigrane n'est pas
 * neutre : il continue de compter dans la ligne, il pousse les chiffres du
 * verdict hors du centre, et il donne à lire un résultat qui traîne des restes.
 * Ce qui n'est pas le verdict quitte donc la scène avant que le verdict ne se
 * forme. Les jetons ne sont **pas** retirés du DOM (CONTRACTS §3.2 règle 7) :
 * ils sortent du flux de layout, et un `seek()` en arrière les ramène.
 *
 * ## 2. Les chiffres se regroupent, au centre
 *
 * Une fois seuls dans le flux, ils sont centrés **par le layout**, pas par un
 * placement à la main : leur largeur et leur espacement sont mis à l'échelle,
 * et `reflow` fait le reste. Le geste reste donc idempotent — un `reflow`
 * ultérieur ne les déplacerait pas d'un iota.
 *
 * ## 3. Ils grandissent jusqu'à prendre la scène
 *
 * L'agrandissement est **calculé**, jamais deviné : la hauteur de capitale et
 * la largeur totale sont ramenées à une fraction de la scène, en gardant de
 * l'air autour. Le facteur est le plus contraignant des deux.
 *
 * ★ Et le décor ACCROCHÉ aux chiffres compte dans cette hauteur. Les cornes du
 * 666 dépassent bien plus haut qu'une capitale ; les ignorer les enverrait hors
 * du cadre dès que le verdict grossit. Ce que l'on pose sur les chiffres leur
 * prend donc de la taille — ce qui est le bon arbitrage : un 666 un peu plus
 * petit se lit encore, un 666 dont les cornes sortent du cadre, non.
 *
 * ## Quand il y a PLUS qu'un 666
 *
 * Une moisson rend « 666 666 666 666 666 ». Quinze chiffres jetés d'un bloc au
 * milieu de la scène ne se lisent pas : ni comme un nombre (personne ne compte
 * quinze rangs), ni comme cinq fois 666 (rien ne le dit). Et les grossir tous
 * ensemble sur une ligne les rapetisse, puisque c'est la LARGEUR qui borne
 * l'agrandissement — cinq séries d'un seul tenant ne montent qu'à ×1,7 là où
 * une série monte à ×8,5.
 *
 * Le geste se déplie donc en trois temps, et **chaque temps dit une chose** :
 *
 *  1. **rassembler** — le reste s'efface, les chiffres se rejoignent au centre,
 *     **à leur taille**. On voit d'abord qu'il ne reste qu'eux.
 *  2. **découper** — un vide s'ouvre tous les trois chiffres. Les séries se
 *     séparent d'elles-mêmes : `666 666 666 666 666`. C'est le moment où la
 *     suite cesse d'être un nombre pour devenir un compte.
 *  3. **grossir** — et là seulement. Au-delà de trois séries, elles se
 *     répartissent sur **deux lignes** : c'est la seule façon de les grossir
 *     davantage, puisque chaque ligne devient deux fois plus courte.
 *
 * Deux lignes ici ne contredisent pas la doctrine du « jamais deux lignes »
 * (`defilement.js`) : celle-ci défend une SÉQUENCE, qui se lit d'un bout à
 * l'autre et qu'une coupure au milieu trahirait. Le verdict n'est pas une
 * séquence, c'est un **compte** — cinq objets identiques dont l'ordre ne dit
 * rien. Les répartir sur deux rangs ne coupe aucune lecture, et la coupure ne
 * tombe jamais dans une série : toujours entre deux.
 *
 * ## Ce qui a été retiré, et pourquoi
 *
 * Le halo doré derrière chaque chiffre. Un halo dit « regarde ici » ; à
 * l'instant où les chiffres occupent l'essentiel de la scène, il n'y a plus
 * rien d'autre à regarder, et le cartouche ne se lit plus que comme un fond
 * posé sous un chiffre. La palette dit déjà tout ce qu'il y a à dire : les
 * chiffres passent en **rubrique**, la couleur de l'affirmation (design §2.3).
 * `halo: true` le rétablit pour qui en voudrait.
 */

import { targetsOf, ensureHalo } from './helpers.js';
import { EASE } from '../constants.js';

export const name = 'reveal';

/** Longueur d'une série. Le 666 du titre, et rien d'autre. */
const SERIE = 3;

/** Part de la hauteur de scène occupée par la hauteur de capitale du verdict. */
const AIR_VERTICAL = 0.62;

/**
 * Idem, mais pour un verdict sur DEUX rangs : c'est la hauteur du bloc entier
 * qui est bornée, interligne compris. On peut y prendre plus de place — le
 * verdict est seul en scène, et deux rangs serrés se lisent moins bien que
 * deux rangs qui respirent.
 */
const AIR_VERTICAL_BLOC = 0.88;

/** Interligne du verdict, en hauteurs de capitale. */
const INTERLIGNE = 1.45;

/** Part de la largeur utile occupée par le verdict. */
const AIR_HORIZONTAL = 0.92;

/**
 * Le vide qui sépare deux séries — **exactement un blanc**.
 *
 * Pas un écart choisi à l'œil : la chasse est fixe (JetBrains Mono), donc
 * « 666 666 » écrit à la main mettrait un caractère d'espace entre les deux, et
 * la distance de centre à centre y serait le double de celle qui sépare deux
 * chiffres voisins. C'est cette distance-là que le découpage reproduit. Le
 * lecteur ne voit pas une séparation décorative, il voit une espace.
 */
function videDeSerie(ctx) {
  return 2 * ctx.layoutOpts.gap + ctx.metrics.advance;
}

/** Garde-fou : au-delà, un glyphe unique deviendrait grotesque. */
const ZOOM_MAX = 14;

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const withHalo = ctx.op.halo === true;
  const efface = ctx.op.clear !== false;

  // Combien de 666 ? Un découpage n'a de sens que si la suite EST faite de
  // séries entières — sinon on n'invente pas des frontières qui n'existent pas.
  const series = decouperEnSeries(ids);
  const multi = series.length > 1;
  const lignes = series.length > 3 ? 2 : 1;
  const grow = typeof ctx.op.scale === 'number'
    ? ctx.op.scale
    : zoomDuVerdict(ctx, ids, series, lignes);

  // Quinze chiffres à 150 ms d'écart, ce sont deux secondes rien que pour les
  // allumer. La cadence se resserre avec le nombre : c'est le même geste, il
  // dure le même temps.
  const stagger = ctx.stagger || (ctx.reduced ? 0 : ctx.dur * 0.18);
  const cadence = ids.length > 1
    ? Math.min(stagger, (ctx.dur * 0.5) / (ids.length - 1))
    : stagger;

  // --- 1. ce qui n'est pas le verdict quitte la scène -----------------------
  const restes = efface ? ctx.scene.flow.filter((id) => !ids.includes(id)) : [];
  const fonduRestes = Math.max(1, ctx.dur * 0.3);
  const cadenceRestes = restes.length > 1 ? (ctx.dur * 0.22) / (restes.length - 1) : 0;
  restes.forEach((id, i) => {
    const at = i * cadenceRestes;
    // Un décor accroché s'en va avec ce qu'il désignait : le halo, comme toute
    // autre marque posée sur le jeton. Le laisser survivre à sa cible ferait
    // flotter une désignation orpheline au milieu du verdict — et le faire
    // partir plus vite (c'était 0,7 fois la durée, sans courbe déclarée) fait
    // s'annuler la désignation avant son objet. Même départ, même durée, même
    // courbe, sur les deux canaux : `animSolidaire`.
    ctx.animSolidaire({ id, prop: 'opacity', to: 0, at, dur: fonduRestes, ease: EASE.fade });
    ctx.animSolidaire({ id, prop: 'scale', to: 0.8, at, dur: fonduRestes, ease: EASE.fade });
    ctx.scene.kill(id, ctx.where);
  });

  // ★ Les halos naissent ICI, avant tout déplacement — pas dans la boucle qui
  // les allume. Un décor accroché ne suit son jeton au reflow que s'il EXISTE
  // au moment où celui-ci part : créé après, il était simplement posé à
  // l'arrivée, sans animation, et sautait donc à sa place pendant que son
  // chiffre, lui, y voyageait. Même famille de défaut que les courbes qui
  // divergent, et même remède — le décor partage tout, y compris son instant
  // de naissance.
  const halos = withHalo ? ids.map((id) => ensureHalo(ctx, id, 'gold')) : [];

  // --- 2. le regroupement : quand le canal est libre, et pas avant ----------
  //
  // ★ Un `move` peut précéder `reveal` dans le même step (le scénario du
  // verdict en émet un). Deux animations concurrentes sur `translate`
  // s'écraseraient l'une l'autre et se contrediraient à l'écran : on attend
  // donc que la précédente ait fini (`ctx.libreA`). L'effacement, lui, a
  // commencé tout de suite — on efface AVANT de grouper.
  let depart = ctx.dur * 0.34;
  for (const id of ids) depart = Math.max(depart, ctx.libreA(id, 'translate'));
  depart = Math.min(depart, ctx.dur * 0.75);

  // ★ Le verdict rend son centre à la ligne. `partition` avait décalé le cadrage
  // pour garder le DÉCOUPAGE au milieu de la vue pendant que le reste était
  // estompé (`layoutOpts.decalage`, voir `layout.js`) ; ici il n'y a plus ni
  // groupes ni reste — des chiffres, et rien d'autre à regarder. Le report est
  // donc levé, et il l'est pendant le geste qui rassemble.
  ctx.layoutOpts.decalage = 0;

  // ★ Le décor accroché déborde VERS LE HAUT et rien ne le contrebalance en
  // bas : le bloc « cornes + chiffres » n'a pas son milieu sur les chiffres. On
  // descend donc la ligne de la moitié de ce débord, pour que ce soit le BLOC
  // — ce qu'on regarde — qui soit centré, et non l'ancre des glyphes. Même
  // raison que `layoutOpts.decalage` pour le découpage, et même signature : un
  // report, pas un placement à la main. Zéro quand il n'y a pas de décor.
  const report = Math.max(0, debordDuDecor(ctx, ids) - hauteurDeCapitale(ctx) / 2) * grow / 2;
  const centrerLeBloc = () => {
    ctx.layoutOpts.centerY = ctx.layoutOpts.viewBox.y + ctx.layoutOpts.viewBox.h / 2 + report;
  };

  let tGrossir;
  let dGrossir;

  // ★ UNE SEULE COURBE POUR TOUT L'AGRANDISSEMENT — c'est ce qui rend le geste
  // SOLIDAIRE, et ce n'est pas un réglage d'esthète.
  //
  // Le verdict grossit le groupe par DEUX canaux à la fois : `translate`
  // écarte les chiffres, `scale` grossit les glyphes. Le décor accroché, lui,
  // n'en a qu'un — son `scale`, qui porte à la fois sa taille et sa largeur.
  // Tant que les deux canaux marchaient sur deux courbes (`move` pour les
  // positions, `pop` pour les tailles), l'ensemble n'était une homothétie
  // qu'aux deux extrémités du trajet : au milieu, `pop` avait déjà dépassé sa
  // valeur d'arrivée quand `move` n'était qu'à mi-chemin. Les cornes étaient
  // donc trop larges pour l'écartement des 6 qu'elles couronnaient — la
  // déformation signalée par l'auteur —, et les chiffres eux-mêmes se
  // chevauchaient, leur chasse ayant grandi plus vite que leurs écarts.
  //
  // Avec une seule courbe `u(t)`, l'exactitude est ARITHMÉTIQUE et non
  // approchée : le layout amène chaque jeton de `p₀` à `p₁ = c + (p₀ − c)·G`
  // autour du centre `c`, donc `p(t) = p₀ + (p₁ − p₀)·u = c + (p₀ − c)·(1 +
  // (G − 1)·u)`, tandis que son échelle vaut `1 + (G − 1)·u`. Les deux
  // portent le même facteur à chaque instant : le groupe est une homothétie
  // exacte tout au long du trajet, dépassement compris. On garde donc `pop`
  // — le coup de poing du verdict —, mais sur les DEUX canaux.
  const courbeVerdict = EASE.pop;

  if (!multi) {
    // Un seul 666 : rassembler et grossir sont le MÊME geste. Rien à découper,
    // rien à répartir, et l'intercaler ferait un temps mort au moment de la
    // chute.
    tGrossir = depart;
    dGrossir = Math.max(1, ctx.dur - depart);
    poserLeFlux(ctx, ids, series, { echelle: grow, separation: true, lignes: 1 });
    centrerLeBloc();
    ctx.reflow({ at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  } else {
    const pas = Math.max(1, ctx.dur * 0.6);

    // (a) rassembler — à leur taille. On voit qu'il ne reste qu'eux.
    poserLeFlux(ctx, ids, series, { echelle: 1, separation: false, lignes: 1 });
    ctx.reflow({ at: depart, dur: pas, ease: EASE.move });

    // (b) découper — le vide s'ouvre tous les trois chiffres.
    poserLeFlux(ctx, ids, series, { echelle: 1, separation: true, lignes: 1 });
    ctx.reflow({ at: depart + pas, dur: pas, ease: EASE.move });

    // (c) grossir — et se répartir sur deux rangs s'il y a de quoi.
    tGrossir = depart + 2 * pas;
    dGrossir = Math.max(1, pas * 1.5);
    poserLeFlux(ctx, ids, series, { echelle: grow, separation: true, lignes });
    centrerLeBloc();
    ctx.reflow({ at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  }

  // La hauteur réelle du verdict, pour que ce qui se pose « en dessous » (une
  // annotation) se pose bien en dessous et non au milieu des chiffres.
  const hauteur = ctx.metrics.fontSize * grow;
  for (const id of ids) {
    const p = ctx.scene.pos(id);
    if (p) p.h = hauteur;
  }

  // --- 3. ils paraissent, rougissent, et grandissent ------------------------
  // ★ Au-delà de trois séries, les cornes ne couronnent QUE LE RANG DU HAUT.
  //
  // « Quand il y a plusieurs séries de 666, [les cornes] seulement sur les 666
  // de la ligne du haut, pour éviter de surcharger en effet » (l'auteur). Cinq
  // paires de cornes sur deux rangs, ce n'est plus une trouvaille qu'on
  // souligne, c'est un motif de papier peint. Sur un seul rang, tous ceux qui
  // sont couronnés le restent : il n'y a rien à alléger.
  const rangDuBas = lignes > 1 ? Math.ceil(series.length / 2) : Infinity;
  const detrones = new Set();
  series.forEach((serie, s) => {
    if (s < rangDuBas) return;
    for (const id of serie) for (const sid of ctx.scene.accrochesA(id)) detrones.add(sid);
  });

  ids.forEach((id, i) => {
    const at = i * cadence;
    ctx.anim({ id, prop: 'opacity', to: 1, at, dur: Math.max(1, ctx.dur * 0.3) });
    ctx.anim({ id, prop: 'fill', to: ctx.palette.rubric, at, dur: Math.max(1, ctx.dur * 0.45) });
    // ★ Ce qui est POSÉ SUR un chiffre grandit avec lui — les cornes du 666.
    //
    // Le verdict grossit les glyphes ET leurs écarts du même facteur, sur une
    // seule et même courbe (voir `courbeVerdict`) : le groupe entier subit une
    // homothétie autour de son centre, qui est l'ancre du décor. Un simple
    // `scale` suffit donc, sans arithmétique de rattrapage. Sans lui, les
    // cornes resteraient à leur taille au-dessus de chiffres huit fois plus
    // hauts — c'est-à-dire quelque part au milieu d'eux.
    //
    // ★ Le halo, lui, n'a plus à être nommé : c'est un décor accroché
    // (`@halo:<id>`, `scene.satellitesDe`), donc `animSolidaire` le fait
    // grandir avec son chiffre. Ne reste que son allumage, qui n'appartient
    // qu'à lui.
    if (halos[i]) ctx.anim({ id: halos[i], prop: 'opacity', to: 0.24, at, dur: Math.max(1, ctx.dur * 0.45) });
    ctx.animSolidaire({ id, prop: 'scale', to: grow, at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  });

  // Les cornes du rang du bas s'effacent — au moment où la coupure s'ouvre,
  // c'est-à-dire quand le second rang naît. Elles gardent le `scale` que
  // `animSolidaire` vient de leur donner : rien ne se désolidarise, elles
  // deviennent seulement invisibles.
  for (const sid of detrones) {
    ctx.anim({ id: sid, prop: 'opacity', to: 0, at: tGrossir, dur: dGrossir * 0.5, ease: EASE.fade });
  }
}

/**
 * Découpe les chiffres révélés en séries de trois.
 *
 * Renvoie **une seule** série — donc « pas de découpage » — dès que la suite
 * n'est pas faite de séries entières, ou qu'il n'y en a qu'une. Un verdict de
 * quatre chiffres existe (les bancs d'essai en ont un) : y ouvrir un vide après
 * le troisième affirmerait un « 666 + 6 » que personne n'a démontré.
 */
function decouperEnSeries(ids) {
  if (ids.length <= SERIE || ids.length % SERIE !== 0) return [ids];
  const out = [];
  for (let i = 0; i < ids.length; i += SERIE) out.push(ids.slice(i, i + SERIE));
  return out;
}

/**
 * Écrit dans le flux l'état visé : largeur des jetons, écarts, coupure de rang.
 *
 * Tout passe par le LAYOUT — largeurs et écarts grandissent avec les glyphes,
 * et c'est le moteur de layout qui centre. Le geste reste donc idempotent : le
 * rejouer ne déplace rien, et une recompilation (`rebuild()` au
 * redimensionnement) repart des mêmes mesures nominales.
 */
function poserLeFlux(ctx, ids, series, { echelle, separation, lignes }) {
  const gap = ctx.layoutOpts.gap * echelle;
  const vide = separation ? videDeSerie(ctx) * echelle : gap;
  // La coupure tombe entre deux séries, jamais dedans : la moitié haute prend
  // le rang du dessus (5 séries → 3 puis 2).
  const coupure = lignes > 1 ? Math.ceil(series.length / 2) : -1;

  series.forEach((serie, s) => {
    serie.forEach((id, k) => {
      const n = ctx.scene.get(id);
      n.w = mesureNominale(ctx, id) * echelle;
      n.breakBefore = k === 0 && s === coupure;
      if (s === 0 && k === 0) n.gapBefore = undefined;
      else n.gapBefore = k === 0 ? vide : gap;
    });
  });

  if (ctx.scene.flowIndex(ids[0]) === 0) ctx.scene.get(ids[0]).gapBefore = 0;

  // `coupuresExplicites` n'ouvre PAS le repli automatique (`wrap`) : il rend
  // seulement effectives les coupures que la primitive a posées elle-même.
  // Une ligne qui déborde continue de défiler, elle ne se replie pas.
  ctx.layoutOpts.coupuresExplicites = lignes > 1;
  if (lignes > 1) {
    ctx.layoutOpts.lineHeight = hauteurDeCapitale(ctx) * echelle * INTERLIGNE;
  }
}

/**
 * Le facteur d'agrandissement : « qu'ils prennent l'essentiel de l'espace
 * d'affichage animé, tout en laissant un peu d'air autour ».
 *
 * Deux contraintes, la plus serrée gagne : la hauteur de capitale (ou, sur deux
 * rangs, la hauteur du bloc entier) ne dépasse pas sa part de la scène, et la
 * largeur du rang le plus long pas `AIR_HORIZONTAL` de la zone utile.
 *
 * ★ C'est presque toujours la LARGEUR qui borne, et c'est pour cela que le
 * second rang existe : sur cinq séries, passer de un à deux rangs fait monter
 * l'agrandissement de ×1,7 à ×2,9.
 */
function zoomDuVerdict(ctx, ids, series, lignes) {
  const capitale = hauteurDeCapitale(ctx);
  const largeur = plusLongRang(ctx, series, lignes);
  // ★ POSER QUELQUE CHOSE AU-DESSUS DES CHIFFRES, C'EST LEUR PRENDRE DE LA
  // HAUTEUR. Les cornes du 666 dépassent l'ancre du jeton de bien plus que la
  // demi-capitale ; agrandir comme s'il n'y avait que des glyphes enverrait
  // leurs pointes hors du cadre (mesuré : ×8,5 sur un 666 seul met la pointe
  // 200 unités au-dessus du bord). Le verdict le paie donc en TAILLE, pas en
  // débordement — c'est la même règle que pour la largeur, appliquée en haut.
  const haut = Math.max(capitale / 2, debordDuDecor(ctx, ids));
  const hauteurNominale = haut + capitale / 2;
  const bloc = lignes > 1
    ? (ctx.layoutOpts.viewBox.h * AIR_VERTICAL_BLOC)
      / Math.max(1, hauteurNominale + capitale * (lignes - 1) * INTERLIGNE)
    : (ctx.layoutOpts.viewBox.h * AIR_VERTICAL) / Math.max(1, hauteurNominale);
  const parLaLargeur = (ctx.layoutOpts.maxWidth * AIR_HORIZONTAL) / Math.max(1, largeur);
  const z = Math.min(bloc, parLaLargeur, ZOOM_MAX);
  return Math.max(1, Math.round(z * 1000) / 1000);
}

/**
 * De combien le décor accroché aux chiffres dépasse vers le haut, en unités
 * NOMINALES (avant agrandissement) — 0 s'il n'y en a pas.
 *
 * La valeur est annoncée par la primitive qui a posé le décor (`data.debord`),
 * jamais recalculée ici : le verdict ne connaît pas le dessin des cornes, et il
 * n'a pas à le connaître — il lui suffit de savoir de combien il dépasse.
 */
function debordDuDecor(ctx, ids) {
  let d = 0;
  for (const id of ids) {
    for (const sid of ctx.scene.accrochesA(id)) {
      const n = ctx.scene.get(sid);
      const v = n && n.data ? Number(n.data.debord) : 0;
      if (Number.isFinite(v) && v > d) d = v;
    }
  }
  return d;
}

/** Largeur nominale du rang le plus long, séparations comprises. */
function plusLongRang(ctx, series, lignes) {
  const gap = ctx.layoutOpts.gap;
  const vide = series.length > 1 ? videDeSerie(ctx) : gap;
  const coupure = lignes > 1 ? Math.ceil(series.length / 2) : -1;
  let max = 0;
  let courant = 0;
  series.forEach((serie, s) => {
    if (s === coupure) { max = Math.max(max, courant); courant = 0; }
    if (courant > 0) courant += vide;
    serie.forEach((id, k) => {
      if (k > 0) courant += gap;
      courant += mesureNominale(ctx, id);
    });
  });
  return Math.max(max, courant);
}

function hauteurDeCapitale(ctx) {
  return ctx.metrics.capHeight || ctx.metrics.fontSize * 0.73;
}

/**
 * La largeur d'un jeton **avant** tout agrandissement.
 *
 * `reveal` peut être rejoué par une recompilation (`rebuild()` au
 * redimensionnement) : partir de `node.w` sans précaution reviendrait à
 * multiplier deux fois. On la redérive donc du texte et de la chasse.
 */
function mesureNominale(ctx, id) {
  const n = ctx.scene.get(id);
  const chars = typeof n.text === 'string' ? [...n.text].length : 0;
  return Math.max(chars, 1) * ctx.metrics.advance;
}
