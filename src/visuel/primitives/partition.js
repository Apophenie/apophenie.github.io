/**
 * `partition` — « on découpe la saisie en sous-groupes ».
 *
 * ## Pourquoi une primitive de plus
 *
 * Le README promet « trois d'affilée, **selon la même méthode** ». Sur
 * `hope-hope-hope.fr`, la démonstration traitait pourtant le premier morceau,
 * puis le deuxième, puis le troisième, sans jamais montrer qu'il s'agissait du
 * même mot répété trois fois : le découpage — le fait même qu'il y ait trois
 * groupes — n'était visible nulle part. `partition` est cette étape manquante.
 *
 * ## Le geste
 *
 * Un temps, trois registres :
 *
 *  1. les tokens **s'écartent aux frontières** de groupe et se resserrent à
 *    l'intérieur — l'espacement dit le découpage avant même le dessin ;
 *  2. une accolade se trace **sous chaque groupe**, toutes ensemble ou en
 *    léger décalage (`stagger`) ;
 *  3. chaque accolade porte son numéro : *groupe 1*, *groupe 2*, *groupe 3*.
 *
 * Ce qui suit peut alors s'adresser aux groupes plutôt qu'aux caractères :
 * `partition` pose (ou repose) le `group` de chaque token, de sorte que les ops
 * suivantes les désignent par sélecteur `{group:'…'}` — la même transformation,
 * appliquée à chaque groupe.
 *
 * ```js
 * { op:'partition',
 *   groups:[ { targets:['t0','t1','t2','t3'], label:'1', tag:'g0' }, … ] }
 * ```
 */

import { tracerAccolade } from './helpers.js';
import { layoutFlow, bboxOf } from '../layout.js';
import { EASE, MARGIN } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'partition';

/** Écartement appliqué à la frontière entre deux groupes, en multiples de `gap`. */
const ECART = 4.5;

/** Longueur maximale de ce qui DISTINGUE deux légendes abrégeables (« 1 », « 12 »). */
const MARQUE_MAX = 3;

export function plan(ctx) {
  const brut = ctx.op.groups;
  if (!Array.isArray(brut) || brut.length < 2) {
    fail(`${ctx.where}« groups » doit lister au moins DEUX groupes : découper en un seul morceau ne découpe rien.`);
  }

  const groupes = brut.map((g, i) => {
    if (!g || typeof g !== 'object') fail(`${ctx.where}groups[${i}] : objet { targets, label, tag } attendu.`);
    const ids = ctx.scene.resolve(g.targets, `${ctx.where}groups[${i}].targets : `);
    if (!ids.length) fail(`${ctx.where}groups[${i}] ne désigne aucun token vivant.`);
    if (g.tag !== undefined && typeof g.tag !== 'string') fail(`${ctx.where}groups[${i}].tag doit être une chaîne.`);
    if (g.label !== undefined && typeof g.label !== 'string') fail(`${ctx.where}groups[${i}].label doit être une chaîne.`);
    return { ids, tag: g.tag ?? null, label: g.label ?? null, id: g.id };
  });

  // Un token ne peut pas appartenir à deux groupes : l'ambiguïté se verrait
  // immédiatement à l'écran (deux accolades se chevauchant sur le même glyphe).
  const vus = new Set();
  for (const [i, g] of groupes.entries()) {
    for (const id of g.ids) {
      if (vus.has(id)) fail(`${ctx.where}le token « ${id} » figure dans deux groupes (le ${i + 1}ᵉ le reprend) : un découpage partitionne, il ne recouvre pas.`);
      vus.add(id);
    }
  }

  const T = ctx.dur;
  const gap = ctx.layoutOpts.gap;
  const serre = typeof ctx.op.tighten === 'number' ? ctx.op.tighten : 0.7;
  const ecart = typeof ctx.op.spread === 'number' ? ctx.op.spread : ECART;

  // --- 1. l'espacement dit le découpage ------------------------------------
  for (const g of groupes) {
    g.ids.forEach((id, k) => {
      const n = ctx.scene.get(id);
      if (g.tag) n.group = g.tag;
      n.gapBefore = k === 0 ? gap * ecart : gap * serre;
    });
    // Le tout premier token de la ligne n'a pas de voisin de gauche : son
    // `gapBefore` n'espace rien, c'est une MARGE DE TÊTE (`layout.js`). Lui
    // laisser un écart de frontière décentrerait la ligne entière ; on le
    // remet à zéro, et la marge de tête est ensuite calculée pour ce qu'elle
    // doit faire — recentrer le découpage.
    const premier = ctx.scene.flowIndex(g.ids[0]);
    if (premier === 0) ctx.scene.get(g.ids[0]).gapBefore = 0;
  }
  recentrerLeDecoupage(ctx, groupes);
  ctx.reflow({ at: 0, dur: T * 0.42, ease: EASE.move });

  // --- 2 et 3. une accolade numérotée par groupe ---------------------------
  const etiquettes = etiquetterLesGroupes(ctx, groupes);
  const cadence = ctx.stagger || (T * 0.14) / Math.max(1, groupes.length - 1);
  const traces = [];
  groupes.forEach((g, i) => {
    const acc = tracerAccolade(ctx, g.ids, {
      shape: ctx.op.shape || 'brace',
      // Le resserrement a déjà été fait ci-dessus, en un seul reflow : le
      // refaire ici animerait `translate` une deuxième fois sur les mêmes
      // tokens (recherche §2.4, contrainte 4).
      tighten: 0,
      label: etiquettes[i],
      id: g.id,
      at: T * 0.3 + i * cadence,
      dur: T * 0.52 - i * cadence,
    });
    if (acc) traces.push(...acc.ids);
  });

  // ★ Les accolades se retirent à la fin du step, et c'est voulu.
  //
  // Elles ne suivent pas le flux : une accolade est posée à un endroit, pas
  // accrochée à des tokens, et dès la première transformation elle se
  // décrocherait de ce qu'elle embrasse. Pire, elle occuperait la ligne où les
  // accolades de calcul (`sum`, `group`) doivent venir se poser, et on lirait
  // deux accolades superposées.
  //
  // Ce qui reste, en revanche, c'est **l'écartement** : les frontières de
  // groupe gardent leur `gapBefore`, et les tokens qui remplacent les tokens
  // écartés en héritent (`helpers.espacementDe`). Le découpage continue donc de
  // se voir pendant toute la suite, sans qu'aucun trait n'ait à le redire.
  if (ctx.op.persist !== true) {
    for (const id of traces) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: T * 0.88, dur: T * 0.12 });
    }
  }
}

/**
 * ★ Six accolades, six légendes — et « groupe 1groupe 2groupe 3 ».
 *
 * La légende d'une accolade est centrée sous son groupe. Tant que les groupes
 * sont larges, elle tient dans son écart ; mais une moisson découpe sur des
 * portées d'UN caractère — les deux tirets de `hope-hope-hope.fr` —, et le mot
 * « groupe 1 » est alors trois fois plus large que ce qu'il désigne. Mesuré :
 * 126,7 unités de légende pour 105,3 d'écart entre deux groupes, soit **21,4
 * unités de chevauchement**, cinq fois de suite.
 *
 * ★ **Ce qui est retiré, c'est la redite, pas l'information.** Le mot n'est
 * écrit qu'une fois — sous la première accolade — et les suivantes ne portent
 * que leur numéro : « groupe 1 · 2 · 3 · 4 ». C'est la convention des légendes
 * de figures, et elle se lit sans qu'on ait à l'expliquer.
 *
 * ★ **Le mot commun est DÉRIVÉ, jamais deviné.** On prend le plus long préfixe
 * commun à toutes les légendes, ramené à la dernière espace — donc « groupe »
 * en français, « group » en anglais, et rien du tout si les légendes ne se
 * ressemblent pas. Aucune langue n'est écrite en dur, et une légende qui ne
 * suit pas le motif reste intacte.
 *
 * Trois états, dans l'ordre, et on s'arrête au premier qui tient : tout en
 * toutes lettres ; le mot sur la première seulement ; les numéros seuls.
 */
function etiquetterLesGroupes(ctx, groupes) {
  const labels = groupes.map((g) => (typeof g.label === 'string' ? g.label : null));
  if (!labels.some(Boolean)) return labels;

  const boites = groupes.map((g) => bboxOf(g.ids, ctx.scene.positions, ctx.metrics, 10));
  // Même mesure que `tracerAccolade` : la légende est posée à `data.scale` 0,5,
  // et sa largeur nominale vaut 0,55 chasse par caractère.
  const largeur = (t) => (t ? ctx.metrics.advance * 0.55 * [...t].length : 0);
  const marge = ctx.metrics.advance * 0.5;
  const tient = (essai) => essai.every((t, i) => {
    if (i === 0 || !t || !essai[i - 1] || !boites[i] || !boites[i - 1]) return true;
    return boites[i].cx - largeur(t) / 2
      >= boites[i - 1].cx + largeur(essai[i - 1]) / 2 + marge;
  });

  if (tient(labels)) return labels;

  const mot = motCommun(labels);
  if (!mot) return labels;
  const court = labels.map((t) => (t ? t.slice(mot.length) : t));
  // ★ On n'abrège que ce qui est une REDITE suivie d'une marque distinctive :
  // « groupe 1 » → « 1 ». Si ce qui reste est un mot entier — « le protocole »,
  // « le domaine », dont le préfixe commun n'est qu'un article —, on ne touche
  // à rien : des légendes qui se touchent valent mieux que des légendes
  // amputées de la moitié de ce qu'elles disent.
  if (court.some((t, i) => labels[i] && (!t || [...t].length > MARQUE_MAX))) return labels;

  const garderLePremier = labels.map((t, i) => (i === 0 ? t : court[i]));
  return tient(garderLePremier) ? garderLePremier : court;
}

/** Le préfixe commun à toutes les légendes, ramené à la dernière espace. */
function motCommun(labels) {
  const vues = labels.filter(Boolean);
  if (vues.length < 2) return '';
  let n = vues[0].length;
  for (const t of vues.slice(1)) {
    let k = 0;
    while (k < n && k < t.length && t[k] === vues[0][k]) k++;
    n = k;
  }
  const brut = vues[0].slice(0, n);
  // S'arrêter à une frontière de mot : sans ça, « groupe 10 » et « groupe 11 »
  // partageraient « groupe 1 », et le second se réduirait à « 1 ».
  return brut.slice(0, brut.lastIndexOf(' ') + 1);
}

/**
 * ★ Centrer la ligne ne centre pas le DÉCOUPAGE.
 *
 * Le moteur de layout centre ce qu'il dispose : toute la ligne. C'est le bon
 * centre tant que la ligne se lit d'un seul œil — mais `partition` change ce
 * régime. À partir d'ici, les groupes sont le sujet et tout le reste s'estompe
 * (`dim`, émis dans le même step). Or le reste n'est presque jamais réparti à
 * parts égales de chaque côté, et le sujet se retrouve donc DÉCENTRÉ alors que
 * la ligne, elle, est parfaitement centrée. Deux mesures sur
 * `hope-hope-hope.fr` :
 *
 * · découpage **contigu** (`×3:` — les trois « hope ») : le reste (« .fr ») est
 *   tout entier à droite, les trois groupes tombent 52 unités **à gauche** ;
 * · découpage **dispersé** (`MOISSON` — les deux tirets et le « fr », en
 *   sautant les « hope ») : le reste est devant et entre, les trois groupes
 *   tombent 80 unités **à droite**.
 *
 * Les deux sens existent donc, et c'est le premier enseignement de la moisson :
 * une compensation qui ne sait pousser que d'un côté ne compense rien. Le
 * report est **signé** (`layoutOpts.decalage`, voir `layout.js`) et se lit
 * d'une phrase : *amener le milieu des groupes au milieu de la vue*. Il ne
 * suppose rien sur la forme du découpage — contigu, dispersé, en tête, en
 * queue —, il lit une boîte englobante.
 *
 * ★ Il est **bridé** pour ne jamais découvrir de vide : la ligne entière doit
 * rester dans la zone utile. Quand le sujet ne peut pas venir au centre sans
 * sortir la ligne du cadre, on va aussi loin que le cadre le permet — et si la
 * ligne déborde déjà, on ne touche à rien : c'est le défilement (`@pan`) qui a
 * la main, et deux recadrages qui s'ajoutent se contrarieraient.
 *
 * ★ Il **traverse les steps**, parce que le découpage aussi : les groupes
 * restent le sujet jusqu'au verdict. `reveal` le remet à zéro — le verdict n'a
 * plus ni groupes ni reste, il retrouve le centre exact — et c'est le seul
 * moment où la ligne se recentre, noyé dans le mouvement d'ensemble du verdict.
 */
function recentrerLeDecoupage(ctx, groupes) {
  const opts = ctx.layoutOpts;
  const vb = opts.viewBox;
  const vivants = ctx.scene.flow.filter((id) => ctx.scene.get(id).alive);
  const ids = [];
  for (const g of groupes) for (const id of g.ids) if (vivants.includes(id)) ids.push(id);
  if (!ids.length) return;

  // La ligne telle qu'elle sera APRÈS le resserrement : on la calcule sans la
  // poser, pour lire d'un coup la boîte du découpage et celle de la ligne.
  const items = vivants.map((id) => {
    const n = ctx.scene.get(id);
    return { id, w: n.w, gapBefore: n.gapBefore, breakBefore: n.breakBefore };
  });
  const { positions } = layoutFlow(items, { ...opts, decalage: 0 });
  const ligne = bboxOf(vivants, positions, ctx.metrics, 0);
  const sujet = bboxOf(ids, positions, ctx.metrics, 0);
  if (!ligne || !sujet) return;

  // Une ligne qui déborde appartient au défilement, pas à nous.
  if (ligne.w > opts.maxWidth) { opts.decalage = 0; return; }

  const marge = Math.min(MARGE_VUE, Math.max(0, (vb.w - ligne.w) / 2));
  const jeu = Math.max(0, (vb.w - 2 * marge - ligne.w) / 2);
  const vise = opts.centerX - sujet.cx;
  opts.decalage = round(Math.max(-jeu, Math.min(jeu, vise)));
}

/** Marge minimale entre la ligne et le bord de la vue, une fois décalée. */
const MARGE_VUE = MARGIN;

function round(v) {
  return Math.round(v * 1000) / 1000;
}
