/**
 * `flip180` — retourner un 9 en 6.
 *
 * Recherche §4.9. La rotation seule ne suffit pas : dans beaucoup de polices, un
 * `9` pivoté ne donne pas un `6` convaincant. On retient donc l'option robuste :
 * **rotation de 180° ET crossfade vers un vrai `6` au voisinage de 90°**, là où
 * l'œil ne peut pas trancher. L'escamotage est parfaitement dans l'esprit du
 * projet.
 *
 * Le token d'arrivée démarre à `rotate: 180deg` (donc visuellement à l'envers,
 * mais invisible) et finit à `360deg` : les deux tournent ensemble, seul
 * l'opacité les distingue. Le demi-tour se fait autour de l'**ancre de mise en
 * page** du jeton — l'origine de son repère local, celle que `layout.js`
 * positionne et autour de laquelle le glyphe est dessiné (CONTRACTS §3.2
 * règle 4). Sans cette origine explicite, la rotation se ferait autour du
 * centre du canevas entier.
 */

import { tokenSpec, espacementDe, targetsOf } from './helpers.js';
import { demiEllipse } from './ellipse.js';
import { EASE, LINE_HEIGHT } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'flip180';

/**
 * ★ Le seul demi-tour que la typographie autorise (CONTRACTS §0.3 : « ce qui
 * est montré est ce qui est compté »).
 *
 * `9 → 6` et `6 → 9`, et rien d'autre. Le crossfade de la ligne 90° est un
 * escamotage assumé ; il le resterait tout autant si l'on faisait naître un 8
 * d'un 3, à ceci près que la scène affirmerait alors quelque chose de faux sous
 * couvert de le montrer. La primitive refuse donc, bruyamment, plutôt que
 * d'animer une rotation qui ne prouve rien — comme `table` refuse de faire
 * redescendre une valeur absente de sa case et `keyboard` un chiffre que la
 * touche ne porte pas.
 *
 * ★ **LA TABLE EST SYMÉTRIQUE, ET ELLE NE L'ÉTAIT PAS.**
 *
 * > « `mr9` par exemple est peu pertinent pour autre chose que des 6 (mais il
 * >   pourrait être adapté pour convertir des 6 en 9 quand c'est 9 qui est
 * >   visé). » (l'auteur)
 *
 * Elle ne portait que `9 → 6`, et la note disait « le 6 ne se retourne pas :
 * ce serait, disons, contre-productif ». C'était vrai tant que le site ne visait
 * que 666 — et c'est exactement le genre d'hypothèse que la cible libre a rendue
 * fausse. Un 6 retourné DONNE un 9 : la géométrie est la même dans les deux
 * sens, seul l'intérêt change. Refuser le sens montant, c'était refuser à `mr9`
 * de servir une cible qui demande des 9, pour une raison qui n'était pas
 * géométrique mais éditoriale.
 *
 * ⚠️ Le reste de la garde ne bouge PAS : un 8 ne devient toujours pas un 3, et
 *   la valeur d'arrivée doit toujours venir du calcul et non d'une seconde
 *   copie. On a élargi la table d'une entrée, pas ouvert la porte.
 */
const DEMI_TOUR = Object.freeze({ 9: '6', 6: '9' });

export function plan(ctx) {
  if (ctx.op.targets !== undefined) return planBloc(ctx);
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const spin = ctx.dur;

  ctx.anim({ id: src.id, prop: 'rotate', to: 180, at: 0, dur: spin, ease: EASE.move });

  if (ctx.op.to === undefined) return; // rotation pure, sans substitution

  const to = tokenSpec(ctx, ctx.op.to, 'to');
  const attendu = DEMI_TOUR[String(src.text)];
  if (attendu === undefined) {
    fail(`${ctx.where}« target » porte « ${src.text} » : seuls un 9 et un 6 se `
      + 'retournent l’un en l’autre. Un demi-tour sur autre chose ne montrerait '
      + 'rien, il l’affirmerait.', { id: src.id });
  }
  if (String(to.text) !== attendu) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais « ${src.text} » retourné donne `
      + `${attendu}. La valeur d’arrivée doit venir du calcul, jamais d’une seconde copie.`,
    { id: src.id });
  }
  const idx = ctx.scene.flowIndex(src.id);
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind || 'digit', group: to.group ?? src.group,
    role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + 1,
    ...espacementDe(ctx, src.id),
    base: { opacity: 0, rotate: 180, fill: ctx.palette.gold },
  }, { where: ctx.where });
  ctx.scene.kill(src.id, ctx.where);
  ctx.reflow({ at: 0, dur: spin, ease: EASE.move });

  // Crossfade centré sur le passage à 90°, là où le glyphe est illisible.
  ctx.anim({ id: src.id, prop: 'opacity', values: [1, 1, 0, 0], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  ctx.anim({ id: to.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  ctx.anim({ id: to.id, prop: 'rotate', from: 180, to: 360, at: 0, dur: spin, ease: EASE.move });
}


/**
 * ★ **LE CHEMIN EST UN CERCLE — tant que la ligne du dessus le permet.**
 *
 * `demiEllipse` s'aplatit par défaut à 0,22 : c'est le réglage du MIROIR, où
 * une bande de vingt-six cases doit se retourner sans quitter la scène. Ici,
 * l'objet retourné est un carré de trois chiffres, et ce qu'on imite n'est plus
 * un pivotement de bande mais la rotation RIGIDE d'une image : chaque point
 * décrit alors un cercle autour du centre, et son écart vertical maximal égale
 * exactement sa distance au centre. Aplatir ce cercle-là, c'est écraser la
 * seule chose que le geste avait à dire.
 *
 * ⚠️ **MAIS LA SCÈNE A DES LIGNES, ET ELLES SONT PROCHES.** Mesuré sur
 *   « Capitalisme » : le trio écarte ses extrêmes de 112 unités, donc le cercle
 *   exact ferait voler les chiffres à 56 unités de leur ligne — au beau milieu
 *   de la ligne du dessus, qui n'est qu'à 78 (`LINE_HEIGHT`), avec des
 *   capitales hautes de 35. Le pivot juste devient alors illisible : deux
 *   chiffres se superposent à d'autres chiffres.
 *
 *   On borne donc la bosse à une PART de l'interligne, et cette part se calcule
 *   plutôt qu'elle ne se décrète : 35 (la hauteur d'un glyphe) plus 35 (la
 *   bosse) restent sous 78, dans les deux sens. Le cercle est conservé partout
 *   où il tient — un bloc plus resserré s'en tirera exactement rond.
 */
const PART_DE_LIGNE = 0.45;

/** L'aplatissement à donner à `demiEllipse` pour une demi-course de `a`. */
const aplatissementPour = (a) => (a > 0 ? Math.min(1, (LINE_HEIGHT * PART_DE_LIGNE) / a) : 1);

/**
 * ★ **LE TRIO SE RETOURNE D'UN BLOC, comme un seul glyphe.**
 *
 * « Retourner 999 comme si c'était une image qu'on pivote à 180° : le 9 central
 * va donc se retourner comme les 9 indépendants, mais les 2 autres neuf vont
 * suivre le mouvement, l'un par le haut, l'autre par le bas » (l'auteur). C'est
 * une autre affirmation que trois demi-tours à la file : trois demi-tours
 * disent « chacun de ces 9 vaut un 6 », un seul dit « ce 999-là, retourné, EST
 * un 666 ». Le second est ce que le geste prétend montrer.
 *
 * ★ **CHACUN VA PAR SON ARC, ET C'EST LÀ TOUT LE GESTE.** Un demi-tour de bloc
 *   n'est pas un demi-tour de chacun : la rotation se fait autour du centre du
 *   BLOC, donc le jeton de gauche finit à droite et réciproquement. Mais les
 *   envoyer là EN LIGNE DROITE les fait se traverser au milieu — rien ne dit
 *   alors lequel est allé où, et le mouvement se lit comme un échange, pas
 *   comme un retournement. C'était le défaut mesuré : « l'animation est
 *   bancale » (l'auteur).
 *
 *   `demiEllipse` porte déjà exactement cette règle pour le miroir, et la bosse
 *   y garde le SIGNE du déplacement : celui qui part à droite se creuse d'un
 *   côté, celui qui part à gauche de l'autre. Les deux passent donc l'un
 *   au-dessus, l'autre au-dessous, et le central — qui ne se déplace pas — reste
 *   sur place à tourner sur lui-même. C'est le mouvement d'une seule pièce.
 *
 * ★ **LE 6 QUI NAÎT PARCOURT LE MÊME ARC QUE LE 9 QUI MEURT.** Le crossfade se
 *   joue au voisinage de 90°, c'est-à-dire au SOMMET de la course : si le jeton
 *   d'arrivée attendait, immobile, à sa place définitive, le glyphe se
 *   téléporterait au beau milieu du vol. Les deux suivent donc le même chemin,
 *   et l'échange de l'un pour l'autre se fait sans que rien ne bouge d'un pixel.
 *
 *   Son arc est calculé APRÈS le `reflow`, sur la position que la mise en page
 *   lui a réellement donnée : la deviner reviendrait à parier que le 6 a
 *   exactement la chasse du 9, et un écart d'un demi-point se verrait en fin de
 *   course comme un sursaut.
 *
 * ★ **`targets` et `to` sont donnés dans l'ORDRE DE LA LIGNE**, avant et après.
 *   Le miroir est appliqué ICI, pas par l'émetteur : le jeton de la place `k`
 *   devient celui de la place `n-1-k`. C'est ce qui permet au modèle de ligne
 *   (`recherche/scenario.js › suivreLaLigne`) de remplacer bêtement place pour
 *   place, sans rien savoir de la rotation — et donc de ne pas pouvoir en
 *   diverger.
 *
 * ⚠️ UN SEUL `reflow`, comme pour le demi-tour simple : trois `flip180`
 *   simultanés en demanderaient trois, et deux reflow concurrents animeraient
 *   deux fois `translate` sur les mêmes jetons. C'est la raison pour laquelle
 *   les demi-tours s'enchaînaient au lieu de se jouer ensemble ; le bloc lève
 *   la contrainte au lieu de la contourner.
 */
function planBloc(ctx) {
  const spin = ctx.dur;
  const noms = targetsOf(ctx);
  if (noms.length < 2) {
    fail(`${ctx.where}« targets » : un bloc se retourne à plusieurs — un jeton seul prend « target ».`);
  }
  const srcs = noms.map((id) => ctx.scene.live(id, `${ctx.where}« targets » : `));
  const tos = Array.isArray(ctx.op.to) ? ctx.op.to : null;
  if (!tos || tos.length !== srcs.length) {
    fail(`${ctx.where}« to » doit porter autant de jetons que « targets » (${srcs.length}) : `
      + 'un bloc retourné rend exactement ce qu’il a reçu, à sa valeur près.');
  }

  for (const src of srcs) {
    const attendu = DEMI_TOUR[String(src.text)];
    if (attendu === undefined) {
      fail(`${ctx.where}« targets » porte « ${src.text} » : seuls un 9 et un 6 se `
        + 'retournent l’un en l’autre. Un demi-tour sur autre chose ne montrerait '
        + 'rien, il l’affirmerait.', { id: src.id });
    }
  }
  const specs = tos.map((t, k) => tokenSpec(ctx, t, `to[${k}]`));
  // ⚠️ **CHAQUE JETON RÉPOND DE SA PROPRE SOURCE.** La garde exigeait « 6 » pour
  //   tout le bloc, ce qui suffisait tant que seuls les 9 tournaient. Depuis que
  //   la table est symétrique, un bloc de 6 doit rendre des 9 — et surtout,
  //   comparer chaque arrivée à SA source interdit un bloc panaché qui rendrait
  //   n'importe quoi.
  specs.forEach((spec, k) => {
    const attendu = DEMI_TOUR[String(srcs[k].text)];
    if (String(spec.text) !== attendu) {
      fail(`${ctx.where}« to » annonce « ${spec.text} » : « ${srcs[k].text} » retourné `
        + `donne ${attendu}, et rien d’autre.`);
    }
  });

  // Les places d'AVANT, relevées avant que rien ne bouge : ce sont les deux
  // bouts de chaque arc, et le `reflow` de la fin les aurait effacées.
  const places = srcs.map((s) => ctx.scene.pos(s.id));
  const n = srcs.length;
  const idx = ctx.scene.flowIndex(srcs[0].id);

  /**
   * L'arc d'un point du bloc, de `depart` à `arrivee`, prêt à être animé.
   *
   * Rend `null` quand il n'y a rien à parcourir — c'est le cas du jeton
   * CENTRAL, qui tourne sur lui-même sans changer de place. Ne pas l'animer du
   * tout est plus juste que l'animer vers là où il est déjà : le canal reste
   * libre, et le `pulse` qui suit n'a personne à bousculer.
   */
  const arc = (depart, arrivee) => {
    if (!depart || !arrivee || Math.abs(arrivee.x - depart.x) <= 0.5) return null;
    const { trajet } = demiEllipse(depart, arrivee,
      { aplatissement: aplatissementPour(Math.abs(arrivee.x - depart.x) / 2) });
    return { values: trajet, offsets: trajet.map((_, i) => i / (trajet.length - 1)) };
  };

  srcs.forEach((src, k) => {
    ctx.anim({ id: src.id, prop: 'rotate', to: 180, at: 0, dur: spin, ease: EASE.move });
    const chemin = arc(places[k], places[n - 1 - k]);
    // Le jeton de départ est TUÉ au bout du demi-tour : sa position enregistrée
    // ne sert plus à personne — ni au `reflow`, qui ne relaie que le flux, ni à
    // un step suivant, qui ne le retrouvera pas. On anime donc son vol sans le
    // « placer » : `ctx.place` émettrait une seconde animation de `translate`,
    // en ligne droite, sur le canal que l'arc occupe déjà.
    if (chemin) ctx.anim({ id: src.id, prop: 'translate', ...chemin, at: 0, dur: spin, ease: EASE.move });
    ctx.anim({ id: src.id, prop: 'opacity', values: [1, 1, 0, 0], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
  });

  // Le jeton qui naît à la place `k` vient de celui qui s'y rend, c'est-à-dire
  // de l'ancien `n-1-k`. Il naît donc À SA PLACE D'ARRIVÉE, déjà retourné.
  //
  // ⚠️ **MAIS SON ESPACEMENT ET SON PAQUET SONT CEUX DE LA PLACE `k`, pas ceux
  //   de la source qui l'y amène.** La rotation déplace des GLYPHES ; elle ne
  //   déplace pas la géométrie de la ligne. Un blanc ouvert avant le premier
  //   jeton du bloc reste avant le premier, et le paquet auquel une place
  //   appartient ne change pas parce qu'un chiffre a fait un demi-tour.
  //
  //   MESURÉ : les hériter de la source miroir décalait la frontière de deux
  //   crans — le modèle de ligne (`recherche/scenario.js › suivreLaLigne`) la
  //   voyait sur `x4_0`, la scène sur `x4_2`. Le modèle avait raison, et le
  //   défaut ne s'est vu que le jour où `mr9` a repris le geste : le bloc ne se
  //   jouait jusque-là que par des liens rejoués à la main.
  specs.forEach((spec, k) => {
    ctx.scene.create({
      id: spec.id, text: spec.text, kind: spec.kind || 'digit', group: spec.group ?? srcs[k].group,
      role: 'text', inFlow: true, insertAt: idx < 0 ? undefined : idx + k,
      ...espacementDe(ctx, srcs[k].id),
      base: { opacity: 0, rotate: 180, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.anim({ id: spec.id, prop: 'opacity', values: [0, 0, 1, 1], offsets: [0, 0.4, 0.6, 1], at: 0, dur: spin });
    ctx.anim({ id: spec.id, prop: 'rotate', from: 180, to: 360, at: 0, dur: spin, ease: EASE.move });
  });

  for (const src of srcs) ctx.scene.kill(src.id, ctx.where);
  ctx.reflow({ at: 0, dur: spin, ease: EASE.move });

  // Le vol des jetons qui naissent, une fois la mise en page faite : `reflow`
  // vient de leur donner leur place définitive, et c'est d'elle que l'arc a
  // besoin. Un nœud qui vient de naître n'a pas été « déplacé » — `reflow` ne
  // lui a donc rien animé, et le canal `translate` est libre.
  specs.forEach((spec, k) => {
    const chemin = arc(places[n - 1 - k], ctx.scene.pos(spec.id));
    if (chemin) ctx.anim({ id: spec.id, prop: 'translate', ...chemin, at: 0, dur: spin, ease: EASE.move });
  });
}
