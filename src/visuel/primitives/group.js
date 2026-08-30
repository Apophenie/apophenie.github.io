/**
 * `group` — l'accolade : « ceci, pris ensemble, donne cela ».
 *
 * ## Composition
 *
 * L'accolade **embrasse ses sources** : ses deux bras remontent aux extrémités,
 * les éléments comptés sont donc à l'intérieur, et sa pointe centrale descend
 * vers le dessous, là où le résultat va paraître. Trois registres, dans cet
 * ordre de lecture, alignés sur le même axe vertical :
 *
 * ```
 *          H   O   P   E          ← les sources, dans l'accolade
 *      ⌣___________________⌣
 *               ▼                  ← la pointe
 *               Σ                  ← CE QU'ON FAIT (jamais implicite)
 *              44                  ← le résultat, sous la pointe
 * ```
 *
 * ## Le symbole n'est pas décoratif
 *
 * Une accolade nue ne dit pas si l'on additionne, si l'on multiplie ou si l'on
 * dénombre : trois opérations, trois résultats, un seul dessin. Chaque
 * combinateur **doit** donc dire ce qu'il fait — `symbol: 'Σ'` pour une somme,
 * `'∏'` pour un produit, `'#'` pour un comptage, `'−'` pour une soustraction
 * en chaîne — et peut l'appuyer d'un `label` en toutes lettres.
 *
 * ## ★ Trois remplissages, une seule accolade
 *
 * Le vocabulaire nomme des **gestes**, et le geste est ici toujours le même :
 * l'accolade se ferme sur des choses et il en sort une valeur. Ce qui change,
 * c'est ce qui se passe **dedans**. `to` fourni, l'accolade tient la promesse
 * elle-même au lieu de la déléguer à un `substitute` (qui faisait naître la
 * valeur dans la ligne, à côté de l'axe que la pointe désigne) :
 *
 * | forme | ce qu'on voit |
 * |---|---|
 * | *sans `to`* | l'accolade seule — un autre geste posera le résultat |
 * | `to` + `count` | **le décompte** : chaque jeton compté descend dans la pointe et le compteur avance de 1 ; ce qui n'est pas compté s'efface sur place |
 * | `to` + `niveler` | **le nivellement** : un `1` passe du plus grand au plus petit jusqu'à ce qu'aucun écart ne dépasse 1, puis les nombres égaux à la moyenne fusionnent |
 *
 * `doubles` ajoute au décompte une **ligne étiquetée juste au-dessus**, où les
 * jetons qui comptent double sont recopiés. « Les lettres, plus les voyelles »
 * cesse alors d'être une formule : les voyelles montent d'un cran sous le mot
 * « voyelle », et l'on voit chacune passer deux fois dans l'accolade.
 *
 * Le décompte et le nivellement se paient un **contrôle croisé** chacun : le
 * nombre de jetons réellement comptés, et la moyenne réellement calculée sur
 * les nombres affichés, doivent égaler `to.text`. Sinon, échec de compilation.
 *
 * ## Géométrie
 *
 * `getTotalLength()` n'est jamais appelé (coûteux, et indisponible hors DOM) :
 * on pose `pathLength="100"` sur le tracé, ce qui normalise `stroke-dasharray`
 * et `stroke-dashoffset` — la longueur réelle devient sans objet. Tout est en
 * unités viewBox (CONTRACTS §3.2 règle 5).
 */

import {
  targetsOf, tracerAccolade, tokenSpec, accumulate, numberOf,
  nivellementDe, MAX_TRANSFERTS, jouerTransferts,
} from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'group';

export function plan(ctx) {
  const ids = targetsOf(ctx);

  // L'accolade qui tient sa promesse elle-même : décompte ou nivellement.
  if (ctx.op.to !== undefined) {
    planRamassage(ctx, ids);
    return;
  }

  // ★ L'ÉGALISATION — niveler, et s'arrêter là.
  //
  //   La moyenne fait deux choses en un geste : elle égalise, puis elle
  //   fusionne ce qui est devenu égal. Ce sont deux règles, et la première se
  //   tient toute seule — « ça ne serait donc pas une moyenne mais une
  //   répartition homogène » (l'auteur). L'accolade se ferme, les `1` passent
  //   du plus grand au plus petit, et la ligne reste une ligne de nombres.
  if (ctx.op.egaliser) { planEgalisation(ctx, ids); return; }

  const shape = ctx.op.shape || 'brace';
  if (shape !== 'brace' && shape !== 'box') {
    fail(`${ctx.where}« shape » = « ${shape} » : seules « brace » et « box » existent.`);
  }
  const tighten = typeof ctx.op.tighten === 'number' ? ctx.op.tighten : 0.7;

  const acc = tracerAccolade(ctx, ids, {
    shape,
    tighten,
    symbol: ctx.op.symbol,
    label: ctx.op.label,
    id: ctx.op.id,
    at: 0,
    dur: ctx.dur,
  });

  // ★ `fadeAt` — l'accolade se retire quand son travail est fait.
  //
  // Un dénombrement se joue en trois gestes enchaînés dans un même step : on
  // accole, les jetons se ramassent, un nombre reste. L'accolade doit tenir
  // pendant les trois — donc au-delà de sa propre durée — puis disparaître.
  // Sans quoi elle survivait au step, et l'on voyait « # · On compte les
  // voyelles » flotter sous les trois 6 du verdict.
  if (acc && typeof ctx.op.fadeAt === 'number') {
    for (const id of acc.ids) {
      ctx.anim({ id, prop: 'opacity', to: 0, at: ctx.op.fadeAt, dur: 300 });
    }
  }
}

/** L'accolade qui rend une valeur : décompte (`count`) ou nivellement (`niveler`). */
function planRamassage(ctx, ids) {
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';
  const symbol = typeof ctx.op.symbol === 'string' && ctx.op.symbol ? ctx.op.symbol : '#';
  const label = typeof ctx.op.label === 'string' && ctx.op.label ? ctx.op.label : null;
  if (ctx.op.niveler) planNivellement(ctx, ids, to, symbol, label);
  else planDecompte(ctx, ids, to, symbol, label);
}

/** L'accolade qui nivelle sans rien ramasser : `c.egalisation`. */
function planEgalisation(ctx, ids) {
  const valeurs = ids.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  if (valeurs.length < 2) {
    fail(`${ctx.where}une égalisation demande au moins deux nombres : il n'y a rien à égaliser.`);
  }
  const { transferts, valeurs: nivelees, converge } = nivellementDe(valeurs);
  if (!converge) {
    fail(`${ctx.where}l'égalisation de ${valeurs.join(', ')} demanderait plus de ${MAX_TRANSFERTS} `
      + 'transferts : le geste serait interminable.');
  }
  // Contrôle croisé : un transfert donne autant qu'il prend, la somme est un
  // invariant. On le vérifie plutôt que de le supposer.
  const avant = valeurs.reduce((a, b) => a + b, 0);
  const apres = nivelees.reduce((a, b) => a + b, 0);
  if (avant !== apres) {
    fail(`${ctx.where}l'égalisation a perdu ${avant - apres} en route : un transfert donne autant qu'il prend.`);
  }
  // Ce que l'émetteur annonce doit être ce que le nivellement produit.
  const dits = ctx.op.resultat;
  if (Array.isArray(dits) && dits.join(',') !== nivelees.join(',')) {
    fail(`${ctx.where}incohérence : l'égalisation de ${valeurs.join(', ')} donne ${nivelees.join(', ')}, `
      + `mais l'émetteur annonce ${dits.join(', ')}. Le moteur visuel refuse d'afficher un calcul faux.`);
  }

  const T = ctx.dur;
  const acc = tracerAccolade(ctx, ids, {
    shape: 'brace', tighten: 0.66,
    symbol: ctx.op.symbol || '≡', label: ctx.op.label || null,
    at: 0, dur: T * 0.28,
  });
  // Les largeurs réservées, comme dans `accumulate` : un jeton qui passera de
  // `8` à `11` doit avoir sa place avant de changer, sinon il recouvre son
  // voisin à mi-parcours.
  const paliers = new Map();
  const courant = valeurs.map((v) => String(v));
  ids.forEach((id, i) => paliers.set(id, [{ k: 0, text: courant[i] }]));
  transferts.forEach((tr, k) => {
    paliers.get(ids[tr.de]).push({ k: k + 1, text: String(tr.source) });
    paliers.get(ids[tr.vers]).push({ k: k + 1, text: String(tr.cible) });
  });
  for (const [id, ps] of paliers) {
    const large = Math.max(...ps.map((p) => [...p.text].length));
    const node = ctx.scene.get(id);
    node.w = Math.max(node.w, large * ctx.metrics.advance);
  }
  if (transferts.length) {
    jouerTransferts(ctx, { operands: ids, transferts, paliers, at: T * 0.28, dur: T * 0.58 });
  }
  if (acc) {
    for (const id of acc.ids) ctx.anim({ id, prop: 'opacity', to: 0, at: T * 0.88, dur: T * 0.12 });
  }
  ctx.reflow({ at: T * 0.88, dur: T * 0.12, ease: EASE.move });
}

/**
 * ★ Un comptage SE COMPTE, jeton par jeton.
 *
 * « On compte les lettres : 4 » était une affirmation : l'accolade se fermait,
 * tout tombait d'un bloc et un 4 paraissait. Rien, dans ce geste, ne
 * distinguait « compter les lettres » de « compter les voyelles » ou de
 * n'importe quel autre nombre sorti d'ailleurs. Désormais chaque jeton compté
 * descend dans la pointe de l'accolade et **fait avancer le compteur d'un
 * cran** : le nombre annoncé est celui qu'on a vu se former.
 */
function planDecompte(ctx, ids, to, symbol, label) {
  const compte = ctx.op.count === undefined ? ids : ctx.scene.resolve(ctx.op.count, ctx.where);
  for (const id of compte) {
    if (!ids.includes(id)) {
      fail(`${ctx.where}« count » désigne « ${id} », qui n'est pas embrassé par l'accolade : `
        + 'on ne compte que ce que le geste montre.');
    }
  }
  const vus = new Set();
  for (const id of compte) {
    if (vus.has(id)) fail(`${ctx.where}« count » désigne deux fois « ${id} » : un jeton ne se compte qu'une fois.`);
    vus.add(id);
  }

  const doubles = (ctx.op.doubles || []).map((d, i) => {
    if (!d || typeof d.target !== 'string' || !d.target) {
      fail(`${ctx.where}doubles[${i}] : « target » manquant — un doublon recopie UN jeton.`);
    }
    if (!ids.includes(d.target)) {
      fail(`${ctx.where}doubles[${i}] : « ${d.target} » n'est pas embrassé par l'accolade.`);
    }
    if (!vus.has(d.target)) {
      fail(`${ctx.where}doubles[${i}] : « ${d.target} » est recopié mais n'est pas compté une première fois — `
        + 'un doublon compte DEUX fois, pas une.');
    }
    const spec = tokenSpec(ctx, d.to, `doubles[${i}].to`);
    const src = ctx.scene.live(d.target, `${ctx.where}doubles[${i}].target : `);
    if (spec.text !== src.text) {
      fail(`${ctx.where}doubles[${i}] : la copie porte « ${spec.text} » là où l'original porte « ${src.text} » — `
        + 'un doublon est une COPIE, il ne transforme rien.');
    }
    return { src: d.target, spec };
  });

  // Contrôle croisé : le total annoncé est celui des jetons qui entrent
  // réellement dans l'accolade, doublons compris.
  const total = compte.length + doubles.length;
  if (String(total) !== to.text) {
    fail(`${ctx.where}incohérence : l'accolade compte ${total} jeton(s) — ${compte.length} sur la ligne`
      + `${doubles.length ? ` et ${doubles.length} en doublon` : ''} —, mais « to.text » annonce « ${to.text} ». `
      + 'Le moteur visuel refuse d\'afficher un compte qu\'il ne montre pas.');
  }

  accumulate(ctx, {
    operands: ids,
    to,
    at: 0,
    dur: ctx.dur,
    numerique: false,
    // Un comptage, c'est une accumulation dont chaque terme vaut 1.
    partials: Array.from({ length: total }, (_, i) => i + 1),
    voler: [...compte, ...doubles.map((d) => d.spec.id)],
    effacer: ids.filter((id) => !vus.has(id)),
    // Le comptage peut se glisser sous une accolade DÉJÀ tracée : c'est le cas
    // quand un geste l'a posée avant lui dans le même step (`c.compteTokensDistincts`
    // rapproche les exemplaires identiques avant de compter ce qui reste).
    accoladeExistante: ctx.op.accolade === 'existante',
    doubles,
    doublesLabel: typeof ctx.op.doublesLabel === 'string' ? ctx.op.doublesLabel : null,
    symbol,
    label,
  });
}

/**
 * ★ Une moyenne SE NIVELLE.
 *
 * « La somme divisée par le nombre de valeurs » est une définition, pas un
 * geste : à l'écran, elle donnait une accolade et un nombre tombé du ciel. Une
 * moyenne, c'est un **partage équitable** — on prend 1 au plus grand, on le
 * donne au plus petit, et on recommence jusqu'à ce que tout le monde ait la
 * même chose à une unité près. Ce qui reste alors sur la ligne EST la moyenne,
 * et les jetons qui n'ont pas atteint la valeur commune sont, littéralement,
 * l'arrondi.
 */
function planNivellement(ctx, ids, to, symbol, label) {
  const valeurs = ids.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  if (valeurs.length < 2) {
    fail(`${ctx.where}un nivellement demande au moins deux nombres : il n'y a rien à égaliser.`);
  }
  // Contrôle croisé n° 1 — la moyenne des nombres MONTRÉS est-elle celle qu'on
  // annonce ? Le calcul est refait ici, sur ce que porte la ligne.
  const somme = valeurs.reduce((a, b) => a + b, 0);
  const moyenne = Math.round(somme / valeurs.length);
  if (String(moyenne) !== to.text) {
    fail(`${ctx.where}incohérence : la moyenne de ${valeurs.join(', ')} vaut ${moyenne}, `
      + `mais « to.text » annonce « ${to.text} ». Le moteur visuel refuse d'afficher un calcul faux.`);
  }

  const { transferts, valeurs: nivelees, converge } = nivellementDe(valeurs);
  if (!converge) {
    fail(`${ctx.where}le nivellement de ${valeurs.join(', ')} demanderait plus de ${MAX_TRANSFERTS} `
      + 'transferts : le geste serait interminable. L\'émetteur doit retomber sur le geste sobre '
      + '(accolade, ramassage, valeur) au lieu d\'émettre « niveler ».');
  }
  // Contrôle croisé n° 2 — le nivellement conserve la somme, donc il aboutit
  // forcément sur la moyenne ; on le vérifie plutôt que de le supposer.
  const sommeApres = nivelees.reduce((a, b) => a + b, 0);
  if (sommeApres !== somme) {
    fail(`${ctx.where}le nivellement a perdu ${somme - sommeApres} en route : un transfert donne autant qu'il prend.`);
  }
  const gagnants = ids.filter((_, i) => nivelees[i] === moyenne);
  if (!gagnants.length) {
    fail(`${ctx.where}aucun nombre n'atteint ${moyenne} après nivellement (${nivelees.join(', ')}) : `
      + 'la fusion n\'aurait rien à fusionner.');
  }

  accumulate(ctx, {
    operands: ids,
    to,
    at: 0,
    dur: ctx.dur,
    transferts,
    voler: gagnants,
    effacer: ids.filter((id) => !gagnants.includes(id)),
    // Chaque jeton qui fusionne vaut déjà la moyenne : la case ne compte pas,
    // elle accueille. Elle reste donc vide jusqu'au premier arrivé.
    partials: gagnants.map(() => moyenne),
    depart: '',
    symbol,
    label,
  });
}
