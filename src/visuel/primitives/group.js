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
  espacementDe, exigerPoint, suivreLesAccolades,
} from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'group';

export function plan(ctx) {
  const ids = targetsOf(ctx);


  // ★ L'ÉGALISATION — niveler, et s'arrêter là.
  //
  //   La moyenne fait deux choses en un geste : elle égalise, puis elle
  //   fusionne ce qui est devenu égal. Ce sont deux règles, et la première se
  //   tient toute seule — « ça ne serait donc pas une moyenne mais une
  //   répartition homogène » (l'auteur). L'accolade se ferme, les `1` passent
  //   du plus grand au plus petit, et la ligne reste une ligne de nombres.
  if (ctx.op.egaliser) { planEgalisation(ctx, ids); return; }
  if (ctx.op.modulo) { planModulo(ctx, ids); return; }
  // ⚠️ **LA DIVISION SE RECONNAÎT AVANT LE RAMASSAGE, et l'ordre compte.** Elle
  //   porte un `to` comme un décompte, mais ce `to` est une LISTE et sa
  //   fabrication est tout autre : le compte se construit sous la pointe au
  //   rythme des retraits. Testé après, `planRamassage` l'attrapait au passage
  //   et se plaignait d'un « to » sans « id » — la liste n'en étant pas un.
  if (ctx.op.division) { planDivision(ctx, ids); return; }

  // L'accolade qui tient sa promesse elle-même : décompte ou nivellement.
  if (ctx.op.to !== undefined) {
    planRamassage(ctx, ids);
    return;
  }

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
    // ★ De quel côté elle s'ouvre. « Jusqu'ici on n'a pas d'accolade en haut,
    //   c'est à créer » (l'auteur) : une accolade qui DÉSIGNE un rangement se
    //   pose au-dessus de la ligne, parce que ce qu'elle annonce ne descend
    //   pas — rien ne tombe sous sa pointe, les jetons se réagencent sur
    //   place. En dessous, elle promettrait un résultat qui ne viendra pas.
    sens: ctx.op.sens,
    // Une accolade qui ne calcule pas ne promet rien sous sa pointe.
    promet: ctx.op.promet,
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
/**
 * ★ **LE MODULO — « B absorbe autant de fois sa valeur que A la contient ».**
 *
 * > « Une accolade de modulo se forme, façon `meg` ; B absorbe autant de fois
 * >   sa valeur que A la contient, jusqu'à ce que 0 ≤ A < B. Là, deux
 * >   variantes : l'une dissout B dans l'accolade et fait disparaître
 * >   l'accolade dans le processus, l'autre garde B, qui n'a servi que de
 * >   catalyseur sans être consommé. » (l'auteur)
 *
 * Le geste est celui de l'égalisation — des paquets qui quittent un nombre pour
 * en rejoindre un autre —, à ceci près que ce qui voyage vaut B et non 1, et
 * que le voyage s'arrête sur une condition d'arrêt arithmétique, pas sur un
 * équilibre. `garderLeDiviseur` distingue les deux variantes : le catalyseur
 * reste sur la ligne, l'absorbé s'efface avec l'accolade.
 *
 * ⚠️ **CONTRÔLE CROISÉ.** On ne fait pas confiance à l'émetteur : le nombre de
 *   paquets, le reste et l'invariant `A = k·B + r` sont recalculés ici, et
 *   `resultat` doit correspondre. Le moteur visuel refuse d'afficher un calcul
 *   faux (§0.3), et un modulo faux est exactement le genre de chose qu'on ne
 *   verrait pas.
 */
function planModulo(ctx, ids) {
  /* ★ **LE SIGNE `%` EST UN JETON, il n'est pas seulement sous la pointe.**
     « A%B, une accolade de modulo se forme, façon `meg` » (l'auteur) : le signe
     s'écrit ENTRE les deux nombres, comme le `/` de la division. L'accolade le
     redit sous sa pointe ; elle ne le remplace pas. C'est pourquoi le geste ne
     lit plus `ids` comme une paire mais demande qui divise qui. */
  const idA = typeof ctx.op.dividende === 'string' ? ctx.op.dividende : ids[0];
  const idB = typeof ctx.op.diviseur === 'string' ? ctx.op.diviseur : ids[ids.length - 1];
  if (idA === idB || !ids.includes(idA) || !ids.includes(idB)) {
    fail(`${ctx.where}un modulo demande un dividende et un diviseur DISTINCTS, tous deux `
      + 'embrassés par l’accolade.');
  }
  const operandes = [idA, idB];
  const valeurs = operandes.map((id) => numberOf(ctx.scene.live(id, ctx.where).text, ctx, id));
  const [a, b] = valeurs;
  if (!Number.isInteger(a) || !Number.isInteger(b) || b <= 0 || a < 0) {
    fail(`${ctx.where}modulo ${a} % ${b} : on ne divise que des entiers, par un diviseur strictement positif.`);
  }
  const paquets = Math.floor(a / b);
  const reste = a - paquets * b;
  if (reste < 0 || reste >= b) {
    fail(`${ctx.where}modulo ${a} % ${b} : le reste ${reste} n'est pas dans [0, ${b}[.`);
  }
  if (paquets > MAX_TRANSFERTS) {
    fail(`${ctx.where}modulo ${a} % ${b} : ${paquets} paquets, le geste serait interminable.`);
  }
  const garde = ctx.op.garderLeDiviseur === true;
  const attendu = garde ? [reste, b] : [reste];
  const dits = ctx.op.resultat;
  if (Array.isArray(dits) && dits.join(',') !== attendu.join(',')) {
    fail(`${ctx.where}incohérence : ${a} % ${b} laisse ${attendu.join(', ')}, `
      + `mais l'émetteur annonce ${dits.join(', ')}. Le moteur visuel refuse d'afficher un calcul faux.`);
  }

  const T = ctx.dur;
  const acc = tracerAccolade(ctx, ids, {
    shape: 'brace', tighten: 0.66,
    symbol: ctx.op.symbol || '%', label: ctx.op.label || null,
    promet: false, marquer: false,
    at: 0, dur: T * 0.28,
  });
  // Chaque paquet part de A et rejoint B ; A décroît de B à chaque fois, B ne
  // bouge pas — il absorbe sans grossir, c'est ce qui en fait un diviseur.
  const transferts = [];
  let restant = a;
  for (let k = 0; k < paquets; k++) {
    restant -= b;
    transferts.push({ de: 0, vers: 1, source: restant, cible: b, montant: b });
  }
  // Les largeurs réservées, comme pour l'égalisation : un jeton qui rétrécit de
  // `135` à `5` ne doit pas faire danser ses voisins en cours de route.
  const paliers = new Map();
  operandes.forEach((id, i) => paliers.set(id, [{ k: 0, text: String(valeurs[i]) }]));
  transferts.forEach((tr, k) => {
    paliers.get(idA).push({ k: k + 1, text: String(tr.source), role: 'de' });
    paliers.get(idB).push({ k: k + 1, text: String(tr.cible), role: 'vers' });
  });
  for (const [id, ps] of paliers) {
    const large = Math.max(...ps.map((p) => [...p.text].length));
    const node = ctx.scene.get(id);
    node.w = Math.max(node.w, large * ctx.metrics.advance);
  }
  if (transferts.length) {
    jouerTransferts(ctx, { operands: operandes, transferts, paliers, at: T * 0.28, dur: T * 0.52 });
  }
  /* ⚠️ **CE GESTE NE POSE PAS LE RÉSULTAT, ET C'EST VOULU.**
     `jouerTransferts` anime les paliers ; il ne réécrit pas le jeton. Comme
     l'égalisation, le modulo laisse donc l'émetteur poser sa valeur par un
     `substitute` explicite — voir `mappeurs.js › m.modulo`.

     Mesuré, faute de quoi : le jeton gardait `13` après un `13 % 5`, et l'étape
     SUIVANTE calculait sur un nombre que la scène n'affichait plus. C'est le
     `sum` d'un scénario voisin qui l'a dit — « la somme vaut 18, mais `to.text`
     annonce autre chose ». Le contrôle croisé a fait exactement son travail :
     il a refusé un calcul juste posé sur une ligne fausse. */
  /* ★ **L'ACCOLADE PEUT TENIR AU-DELÀ DE CE GESTE.**
     « L'une dissout B dans l'accolade et fait disparaître l'accolade dans le
     processus » (l'auteur) : la dissolution est un `drop` qui suit, dans le
     même step, et l'accolade doit encore être là pour qu'on voie le diviseur
     tomber dedans. L'émetteur dit donc quand elle s'en va (`retirerAccolade`) ;
     faute de quoi elle part avec ce geste-ci, comme avant. */
  if (acc) {
    const part = typeof ctx.op.fadeAt === 'number' ? ctx.op.fadeAt : T * 0.88;
    for (const id of acc.ids) ctx.anim({ id, prop: 'opacity', to: 0, at: part, dur: 300 });
  }
  ctx.reflow({ at: T * 0.9, dur: T * 0.1, ease: EASE.move });
}

/**
 * ★ **LA DIVISION — on retire tant qu'on peut, et l'on compte les retraits.**
 *
 * > « `A/B`, avec le divisé entre les deux, pas en vertical. Une accolade en
 * >   dessous avec le symbole division. Puis B est retranché à A : part de A,
 * >   passe au niveau de B, avant de descendre en dessous de l'accolade où 1
 * >   est ajouté — la valeur de B est retranchée à A et se déplace comme les 1
 * >   de `meg`. Le processus est répété jusqu'à ce que A < B. » (l'auteur)
 *
 * Le quotient ne tombe pas du ciel : il se COMPTE, un retrait à la fois, sous
 * la pointe de l'accolade. C'est ce qui distingue ce geste d'un résultat posé —
 * on voit pourquoi le quotient vaut ce qu'il vaut.
 *
 * ⚠️ **CE GESTE ÉCRIT SON RÉSULTAT** — contrairement au modulo et à
 *   l'égalisation, qui laissent l'émetteur poser leur valeur par un
 *   `substitute`. Il le faut : le compte se FABRIQUE sous la pointe, cran par
 *   cran, et le nombre qui entre dans la ligne doit être celui-là même, pas un
 *   homonyme rallumé au même endroit une fois le compteur éteint. Le rejeu le
 *   sait (`recherche/scenario.js › case 'group'`).
 *
 * ⚠️ **LE COMPTEUR SOUS LA POINTE AVAIT ÉTÉ DÉCLARÉ IMPOSSIBLE, ET IL NE
 *   L'ÉTAIT PAS.** La note d'alors disait que « placer un jeton sous la pointe
 *   demande la position verticale des jetons, et elle n'existe pas quand ce
 *   plan s'écrit ». C'est faux : `tracerAccolade` REND le point où tombe son
 *   résultat (`acc.resultat`) — c'est par lui que toute somme pose sa case
 *   depuis toujours. La bonne conclusion aurait été de le lire, pas de renoncer
 *   au geste que l'auteur avait décrit.
 */
function planDivision(ctx, ids) {
  const idA = typeof ctx.op.dividende === 'string' ? ctx.op.dividende : ids[0];
  const idB = typeof ctx.op.diviseur === 'string' ? ctx.op.diviseur : ids[ids.length - 1];
  if (idA === idB || !ids.includes(idA) || !ids.includes(idB)) {
    fail(`${ctx.where}une division demande un dividende et un diviseur DISTINCTS, tous deux `
      + 'embrassés par l’accolade.');
  }
  const a = numberOf(ctx.scene.live(idA, ctx.where).text, ctx, idA);
  const b = numberOf(ctx.scene.live(idB, ctx.where).text, ctx, idB);
  if (!Number.isInteger(a) || !Number.isInteger(b) || b <= 0 || a < 0) {
    fail(`${ctx.where}division ${a} / ${b} : on ne divise que des entiers, par un diviseur strictement positif.`);
  }
  const quotient = Math.floor(a / b);
  const reste = a - quotient * b;
  if (quotient > MAX_TRANSFERTS) {
    fail(`${ctx.where}division ${a} / ${b} : ${quotient} retraits, le geste serait interminable.`);
  }
  const gardeLeReste = ctx.op.gardeLeReste === true;
  /* ★ **DEUX FAÇONS DE GARDER LE RESTE, ET CE NE SONT PAS DEUX ANIMATIONS DU
       MÊME RÉSULTAT** — j'avais cru le contraire, l'auteur a tranché :

     > « Le résultat n'est pas le même : 13/5 → 23, 13/5 → 32. » (l'auteur)

     · le COMPTE d'abord — « l'accolade rétrécit pour ne laisser que le reste,
       puis le compteur remonte AVANT le reste en ré-étirant l'accolade » ;
     · le RESTE d'abord — « le reste de A reste, le compteur sous l'accolade
       vient se placer JUSTE APRÈS le reste ».

     Deux gestes, deux lignes, deux nombres — et les deux se voient ici, à
     l'accolade qui se resserre ou non avant que le compte ne remonte. */
  const resteDAbord = ctx.op.resteDAbord === true;
  const attendu = gardeLeReste
    ? (resteDAbord ? [reste, quotient] : [quotient, reste])
    : [quotient];

  /* ★ **CE GESTE ÉCRIT SON RÉSULTAT, et c'est un changement de contrat.**

     Il ANIMAIT seulement, et l'émetteur posait la valeur par un `substitute`
     qui suivait. Le compte, lui, se fabrique SOUS LA POINTE, un retrait à la
     fois — « B est retranché à A : part de A, passe au niveau de B, avant de
     descendre en dessous de l'accolade où 1 est ajouté » (l'auteur). Un
     `substitute` qui aurait reposé ce même nombre juste après aurait effacé le
     compteur pour en rallumer un autre au même endroit : le raccord se voyait,
     et surtout le nombre qu'on venait de voir se construire n'était pas celui
     qui entrait dans la ligne.

     C'est le geste d'`accumulate`, et le rejeu le modélise comme tel
     (`recherche/scenario.js › case 'group'`, `accumulerPlusieurs`). */
  const specs = (Array.isArray(ctx.op.to) ? ctx.op.to : [ctx.op.to])
    .map((t, i) => tokenSpec(ctx, t, `to[${i}]`));
  if (specs.length !== attendu.length
    || specs.some((t, i) => t.text !== String(attendu[i]))) {
    fail(`${ctx.where}incohérence : ${a} / ${b} donne ${attendu.join(', ')}, `
      + `mais l'émetteur annonce ${specs.map((t) => t.text).join(', ')}. `
      + 'Le moteur visuel refuse d’afficher un calcul faux.');
  }
  const specQ = specs[resteDAbord ? 1 : 0];
  const specS = gardeLeReste ? specs[resteDAbord ? 0 : 1] : null;

  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  const tAcc = Math.min(600, T * 0.2);
  const tFin = Math.min(1600, T * 0.34);
  const tRet = Math.max(1, T - tAcc - tFin);
  const tFin0 = tAcc + tRet;

  const acc = tracerAccolade(ctx, ids, {
    shape: 'brace', tighten: 0.66,
    symbol: ctx.op.symbol || '÷', label: ctx.op.label || null,
    // Elle ne PROMET rien : ce n'est pas un `substitute` qui viendra se poser
    // sous sa pointe, c'est ce geste-ci qui y fabrique son compte.
    promet: false, marquer: false,
    at: 0, dur: tAcc,
  });
  const ancre = acc ? acc.resultat : null;
  if (!ancre) {
    fail(`${ctx.where}division ${a} / ${b} : l’accolade n’a pas pu être tracée, `
      + 'le compte n’aurait nulle part où se former.');
  }

  // --- les largeurs réservées ---------------------------------------------
  // Le dividende décroît de `13` à `3` : le canal discret change le TEXTE,
  // jamais la mise en page, et un jeton qui rétrécit en cours de route ferait
  // danser ses voisins. On réserve donc la plus large des valeurs qu'il prendra.
  {
    const large = Math.max(...Array.from({ length: quotient + 1 },
      (_, k) => String(a - k * b).length));
    const node = ctx.scene.get(idA);
    node.w = Math.max(node.w, large * ctx.metrics.advance);
  }

  // --- le compte, sous la pointe, qui part de zéro -------------------------
  const posA = ctx.scene.pos(idA);
  const posB = ctx.scene.pos(idB);
  ctx.scene.create({
    id: specQ.id, text: '0', kind: specQ.kind, group: specQ.group,
    role: 'text', inFlow: false, ...espacementDe(ctx, idA),
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(specQ.id, exigerPoint(ctx, ancre,
    'le compte des retraits, sous la pointe de l’accolade', specQ.id));
  ctx.anim({ id: specQ.id, prop: 'opacity', to: 1, at: tAcc, dur: Math.max(1, tRet * 0.1) });
  ctx.anim({
    id: specQ.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1],
    at: tAcc, dur: Math.max(1, tRet * 0.15), ease: EASE.pop,
  });

  // --- les retraits : un paquet de B par tour ------------------------------
  /* ★ **LE PAQUET VAUT `B` EN PARTANT ET `1` EN ARRIVANT.**
     C'est le trajet que l'auteur décrit, et le changement de valeur en son
     milieu est ce qui le rend lisible : on RETIRE cinq, et ça COMPTE pour un.
     Sans ce basculement, un `5` qui atterrit sur un compteur affichant `2` le
     ferait lire comme un `+5`. */
  const pas = tRet / (quotient + 0.35);
  const arrivees = [];
  for (let k = 0; k < quotient; k++) {
    const at = tAcc + k * pas;
    const dur = Math.max(1, pas * 1.2);
    arrivees.push(at + dur);
    const id = ctx.gensym('retrait');
    ctx.scene.create({
      id, role: 'text', text: String(b), kind: 'digit', inFlow: false,
      base: { opacity: 0, scale: 0.5, fill: ctx.palette.gold },
    }, { where: ctx.where });
    ctx.scene.place(id, exigerPoint(ctx, { x: posA.x, y: posA.y },
      'le paquet retranché au dividende', id));
    const chemin = [
      ...pointsDArc(posA, posB, fs * 0.9, 3),
      ...pointsDArc(posB, ancre, 0, 3).slice(1),
    ];
    ctx.anim({ id, prop: 'translate', values: chemin, at, dur, ease: EASE.linear });
    ctx.anim({ id, prop: 'opacity', values: [0, 1, 1, 0], offsets: [0, 0.12, 0.88, 1], at, dur });
    ctx.anim({ id, prop: 'scale', values: [0.5, 0.62, 0.5], offsets: [0, 0.5, 1], at, dur });
    ctx.discrete({
      id, channel: 'text', at, dur,
      render: (x) => (x < 0.5 ? String(b) : '1'),
    });
  }

  // Le dividende décroît AU DÉPART de chaque paquet — pas à son arrivée : ce
  // qui a quitté le nombre n'est plus en lui, il est dans le paquet qui vole.
  if (quotient) {
    const seuils = [];
    for (let k = 0; k < quotient; k++) {
      seuils.push({ u: (k + 0.20) / (quotient + 0.35), text: String(a - (k + 1) * b) });
    }
    ctx.discrete({
      id: idA, channel: 'text', at: tAcc, dur: Math.max(1, tRet),
      render: (x) => {
        let out = String(a);
        for (const s of seuils) if (x >= s.u) out = s.text;
        return out;
      },
    });
  }

  // Le compteur suit les ATTERRISSAGES, un cran chacun. Fonction pure de `t`,
  // donc exacte au scrubbing, en avant comme en arrière.
  {
    const span = Math.max(1, (tFin0 + tFin) - tAcc);
    const bornes = arrivees.map((t) => (t - tAcc) / span);
    ctx.discrete({
      id: specQ.id, channel: 'text', at: tAcc, dur: span,
      render: (x) => {
        let n = 0;
        while (n < bornes.length && x >= bornes[n]) n++;
        return String(n);
      },
    });
  }

  // --- le reste demeure : il prend le relais du dividende, sans bouger -----
  //
  // Le dividende AFFICHE déjà le reste — le canal discret l'y a mené. Le jeton
  // de sortie naît donc exactement sur lui, avec le même texte : rien ne bouge
  // à l'écran, mais la ligne cesse de porter un jeton dont l'identité disait
  // « le dividende » alors qu'il montre le reste.
  if (specS) {
    ctx.scene.create({
      id: specS.id, text: specS.text, kind: specS.kind, group: specS.group,
      role: 'text', inFlow: false, ...espacementDe(ctx, idA),
      base: { opacity: 0, fill: ctx.palette.fg },
    }, { where: ctx.where });
    ctx.scene.place(specS.id, exigerPoint(ctx, { x: posA.x, y: posA.y },
      'le reste, à la place du dividende', specS.id));
    ctx.anim({ id: specS.id, prop: 'opacity', to: 1, at: tFin0, dur: 1 });
    ctx.anim({ id: idA, prop: 'opacity', to: 0, at: tFin0, dur: 1 });
  }

  // --- ce qui se dissout DANS l'accolade -----------------------------------
  //
  // « Seul /B disparaît, dissous dans l'accolade » (l'auteur). Dissoudre n'est
  // pas effacer sur place : le diviseur et son signe DESCENDENT vers la pointe,
  // là où leur travail a laissé le compte, et s'éteignent en chemin.
  const dissous = ids.filter((id) => id !== idA && id !== specS?.id);
  if (!specS) dissous.push(idA);
  const tDis = Math.max(1, tFin * 0.45);
  for (const id of dissous) {
    ctx.anim({ id, prop: 'translate', to: { x: ancre.x, y: ancre.y }, at: tFin0, dur: tDis, ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.65, at: tFin0, dur: tDis });
    ctx.anim({ id, prop: 'opacity', to: 0, at: tFin0 + tDis * 0.55, dur: tDis * 0.45 });
  }

  // --- l'accolade se resserre sur ce qui reste -----------------------------
  //
  // C'est ici que `mdiv` et `mdvr` cessent de se ressembler : le premier
  // rétrécit l'accolade sur le seul reste avant que le compte ne remonte
  // DEVANT lui ; le second la laisse telle quelle, le compte venant se poser
  // APRÈS le reste.
  if (specS && !resteDAbord) {
    ctx.scene.poserAccolade(acc.id, [specS.id]);
    // ⚠️ **EXACTEMENT PENDANT LA DISSOLUTION, ni avant ni après.** Le
    //   resserrement et le ré-étirement animent le même tracé ; s'ils se
    //   chevauchent, ne serait-ce que de trente millisecondes, le compilateur
    //   signale deux animations concurrentes — et il a raison, on ne saurait
    //   pas dire où l'accolade est à cet instant. Elle se resserre donc
    //   pendant que `/B` descend, et pas une milliseconde de plus.
    suivreLesAccolades(ctx, { at: tFin0, dur: tDis });
  }

  // --- le compte remonte dans la ligne, l'accolade s'en va -----------------
  const place = ctx.scene.flowIndex(idA);
  for (const id of ids) ctx.scene.kill(id, ctx.where);
  const ordre = specs.map((t) => t.id);
  ordre.forEach((id, k) => {
    ctx.scene.enterFlow(id, place < 0 ? undefined : place + k, ctx.where);
  });
  const tRem = Math.max(1, tFin - tDis);
  ctx.reflow({ at: tFin0 + tDis, dur: tRem, ease: EASE.move });
  // ★ ET L'ACCOLADE SE RÉ-ÉTIRE SUR LA LIGNE NEUVE avant de s'effacer — elle
  //   embrasse ce qu'elle a produit, le temps qu'on le lise. `ctx.reflow` a
  //   déjà recalculé les positions, `suivreLesAccolades` les lit.
  ctx.scene.poserAccolade(acc.id, ordre);
  suivreLesAccolades(ctx, { at: tFin0 + tDis, dur: tRem });
  for (const id of acc.ids) {
    ctx.anim({ id, prop: 'opacity', to: 0, at: tFin0 + tDis + tRem * 0.55, dur: Math.max(1, tRem * 0.45) });
  }
}

/** Points d'une trajectoire courbe de `a` à `b` — quadratique, sommet en haut. */
function pointsDArc(a, b, hauteur, n) {
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - hauteur };
  const pt = (t) => ({
    x: Math.round(((1 - t) * (1 - t) * a.x + 2 * t * (1 - t) * c.x + t * t * b.x) * 100) / 100,
    y: Math.round(((1 - t) * (1 - t) * a.y + 2 * t * (1 - t) * c.y + t * t * b.y) * 100) / 100,
  });
  return Array.from({ length: n + 1 }, (_, i) => pt(i / n));
}

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
    // Elle DÉSIGNE, elle ne calcule pas : rien ne descendra sous sa pointe, et
    // le relevé d'identité qui referme le geste ne doit pas y plonger.
    promet: false,
    // Et elle n'écarte pas non plus : les valeurs vont changer sous elle.
    marquer: false,
    at: 0, dur: T * 0.28,
  });
  // Les largeurs réservées, comme dans `accumulate` : un jeton qui passera de
  // `8` à `11` doit avoir sa place avant de changer, sinon il recouvre son
  // voisin à mi-parcours.
  const paliers = new Map();
  const courant = valeurs.map((v) => String(v));
  ids.forEach((id, i) => paliers.set(id, [{ k: 0, text: courant[i] }]));
  transferts.forEach((tr, k) => {
    paliers.get(ids[tr.de]).push({ k: k + 1, text: String(tr.source), role: 'de' });
    paliers.get(ids[tr.vers]).push({ k: k + 1, text: String(tr.cible), role: 'vers' });
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
  // ★ **ON REND LES LARGEURS RÉSERVÉES AVANT DE REPOSER LA LIGNE.**
  //
  //   > « `meg` crée des espaces entre les premiers 3 chiffres, mais pas entre
  //   >   les suivants. Ça devrait être homogène. » (l'auteur)
  //
  //   La réservation ci-dessus est nécessaire — un jeton qui passera de `8` à
  //   `11` doit avoir sa place avant de changer, sinon il recouvre son voisin à
  //   mi-parcours — mais elle est prise au PLUS LARGE de tout le trajet, et
  //   `Math.max` ne la rend jamais. Sur « Capitalisme », `3 10 5 9 2 7` réserve
  //   deux caractères au deuxième jeton : une fois tout le monde à 6, ce jeton
  //   restait large de deux, et les trois premiers chiffres s'espaçaient là où
  //   les trois suivants se touchaient.
  //
  //   ★ **ET C'EST UNE ÉGALISATION : à la fin, tous portent le MÊME nombre**,
  //     donc la même largeur. Rendre les réservations juste avant le reflow ne
  //     demande donc aucun arbitrage — la largeur due est celle du texte que
  //     chacun porte désormais, et `relayout` est synchrone, si bien que le
  //     mouvement qu'il calcule est déjà celui de la ligne resserrée.
  ids.forEach((id, i) => {
    const node = ctx.scene.get(id);
    node.w = [...String(nivelees[i])].length * ctx.metrics.advance;
  });
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
