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
  boiteEmbrassee, ECART_TERMES, COLLE_AU_SIGNE,
  reserverLaPlace, occuperLaPlace, rangDansLaPlace, finirSousAccolade,
  quitterLAccolade, suivreSesSources, poserDansLaPlace,
} from './helpers.js';
import { EASE, progressionDe } from '../constants.js';
import { planExposants, planPuissance, planFactorielle } from './produits.js';
import { planDenombrement } from './series.js';
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
  // Le carré porte un `to` lui aussi : même raison de le reconnaître avant.
  if (ctx.op.carre) { planCarre(ctx, ids); return; }
  // La puissance : les exposants se forment, puis chaque produit se fabrique
  // sous son accolade (`produits.js`).
  if (ctx.op.exposants) { planExposants(ctx, ids); return; }
  if (ctx.op.puissance) { planPuissance(ctx, ids); return; }
  // La factorielle n'a pas d'accolade : un titre en tient lieu, et la colonne
  // se déplie sous le nombre (`produits.js`).
  if (ctx.op.factorielle) { planFactorielle(ctx, ids); return; }
  // Le dénombrement sériel : une série, une accolade, un compte (`series.js`).
  if (ctx.op.denombrement) { planDenombrement(ctx, ids); return; }

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
      // Effacée par l'émetteur : la fin commune (`finirSousAccolade`) ne l'efface pas deux fois.
      ctx.scene.get(id).data.retiree = true;
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
  /* ★ **L'ACCOLADE NE RALENTIT PAS AVEC LES RETRAITS.** Le geste dure ce que
     ses paquets exigent — et l'auteur les veut lents —, mais « la vitesse pour
     tracer l'accolade devrait être la même qu'ailleurs, à savoir très rapide.
     Ce n'est pas ça qui donne la lisibilité ». Elle est donc BORNÉE, et tout le
     temps qu'elle ne prend pas revient aux paquets, qui eux ont à montrer. */
  const tAcc = Math.min(600, T * 0.28);
  const acc = tracerAccolade(ctx, ids, {
    shape: 'brace', tighten: 0.66,
    symbol: ctx.op.symbol || '%', label: ctx.op.label || null,
    promet: false, marquer: false,
    at: 0, dur: tAcc,
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
    jouerTransferts(ctx, { operands: operandes, transferts, paliers, at: tAcc, dur: T - tAcc - Math.min(1600, T * 0.2) });
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
  /* ⚠️ **LA LARGEUR EST CELLE DU COMPTE FINAL, pas celle du zéro de départ.**

     > « Quand tu insères le quotient à la fin, l'espace que tu lui donnes a
     >   l'air un peu juste, ça donne des chiffres collés les uns aux autres —
     >   ou alors c'est que tu ne t'adaptes pas au nombre de chiffres. »
     >   (l'auteur)

     C'était bien cela. Le jeton naît en portant `0` — il doit partir de zéro —,
     et la scène mesure sa place sur ce qu'il porte à l'instant de sa création.
     Le canal discret change ensuite le TEXTE, jamais la mise en page : un
     quotient à deux chiffres se retrouvait dans la case d'un seul, collé à son
     voisin. On réserve donc dès maintenant la place du nombre qu'il DEVIENDRA. */
  ctx.scene.get(specQ.id).w = Math.max(
    ctx.scene.get(specQ.id).w,
    [...specQ.text].length * ctx.metrics.advance,
  );
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
  // ★ CE QUI SE DISSOUT QUITTE L'ACCOLADE : le tracé se resserre sur le reste,
  //   ou s'efface s'il n'en reste pas (`suivreSesSources`, la règle de tout
  //   geste à accolade). Cela vaut pour les trois divisions — `mdvr` compris,
  //   qui gardait sa largeur : c'est désormais l'ORDRE du compte, devant ou
  //   derrière le reste, qui les distingue.
  //
  // ⚠️ **EXACTEMENT PENDANT LA DISSOLUTION, ni avant ni après.** Le
  //   resserrement et le ré-étirement animent le même tracé ; s'ils se
  //   chevauchent, le compilateur signale deux animations concurrentes.
  suivreSesSources(ctx, acc.id, specS ? [specS.id] : [], { at: tFin0, dur: tDis });

  // --- le compte remonte dans la place gardée, PUIS l'accolade s'en va -------
  // ★ La ligne garde la largeur de « A / B » pendant que le compte remonte : il
  //   se pose au milieu, les voisins ne bougent pas. Elle ne se referme qu'une
  //   fois l'accolade effacée (`helpers.js › finirSousAccolade`).
  const rangA = ctx.scene.flowIndex(idA);
  const garde = reserverLaPlace(ctx, ids);
  for (const id of ids) ctx.scene.kill(id, ctx.where);
  const ordre = specs.map((t) => t.id);
  const tRem = Math.max(1, (tFin - tDis) * 0.55);
  const tRetrait = Math.max(1, tFin - tDis - tRem);
  // Un compte plus large que « A / B » ouvre sa place avant de remonter.
  const monte = poserDansLaPlace(ctx, garde, ordre, { at: tFin0 + tDis, dur: tRem, rang: rangA });
  // ★ ET L'ACCOLADE SE RÉ-ÉTIRE SUR LA LIGNE NEUVE avant de s'effacer — elle
  //   embrasse ce qu'elle a produit, le temps qu'on le lise. `ctx.reflow` a
  //   déjà recalculé les positions, `suivreLesAccolades` les lit.
  if (!ctx.scene.get(acc.id).data.traceEffacee) {
    ctx.scene.poserAccolade(acc.id, ordre);
    suivreLesAccolades(ctx, monte);
  }
  // ★ PUIS l'accolade s'efface, et la ligne se referme sur le compte.
  finirSousAccolade(ctx, { at: tFin0 + tDis + tRem, dur: tRetrait });
}

/**
 * ★ **LE CARRÉ — dans l'ordre de l'autrice, six temps.**
 *
 * > « Il y a tous les ingrédients mais pas dans le bon ordre. » (l'autrice)
 *
 * ```
 *    115                ① l'accolade se tire sous le nombre seul : « au carré »
 *    115→115            ② l'espace s'étire, le double SORT de l'original et glisse
 *    115 ×115           ③ le second arrivé, le × apparaît entre les deux
 *    ⌣‾‾‾‾‾‾‾‾⌣
 *     13225             ④ les trois descendent et fusionnent sous l'accolade
 *    13225              ⑤ le résultat remonte sur la ligne, à la place gardée
 *    13225              ⑥ PUIS l'accolade disparaît et la ligne se réajuste
 * ```
 *
 * ① > « l'accolade sur le nombre unique avec "au carré" sous l'accolade, pas
 *   >   besoin de ² qui n'est pas lisible sans un nombre avant pour se rendre
 *   >   compte qu'il est en exposant. »
 *
 * ② > « l'espace dans l'accolade s'étire et le nombre est dupliqué, pas en le
 *   >   faisant apparaître du néant, mais depuis le nombre existant. »
 *
 *   ⚠️ **LE DOUBLE EST VISIBLE DÈS SA SORTIE.** Il ne s'allumait qu'une fois
 *     dégagé de l'original, pour qu'aucun jeton n'en recouvre un autre — et vu
 *     de l'écran, il surgissait du néant. Il part désormais exactement SUR
 *     l'original : deux textes identiques à la même place ne se lisent que
 *     comme un seul nombre, et c'est en glissant qu'il s'en détache. C'est le
 *     geste même du dédoublement, comme les paquets de la potence naissent sur
 *     le chiffre dont on les retire.
 *
 *   ★ **ET IL GLISSE DANS DU VIDE.** L'espace s'ouvre PENDANT la glissade, par
 *     le même reflow et sur la même courbe : le voisin s'écarte du même
 *     mouvement que le double avance. L'écart entre eux varie linéairement
 *     entre deux positions qui ne se chevauchent pas — il ne peut donc pas
 *     devenir négatif en chemin. L'accolade s'étire sur ce même temps.
 *
 * ③ > « Dès que le 2ᵈ nombre est en place, l'opérateur de multiplication
 *   >   apparaît entre les deux. » — pas avant, pas pendant la glissade.
 *
 * ④ la descente et la fusion, inchangées : même translation verticale pour les
 *   trois, puis ils se resserrent en leur produit, qu'on lit sous l'accolade.
 *
 * ⑤ > « le résultat remonte sur la ligne principale » — à la verticale, au
 *   milieu de la place que tenait l'expression, qui est GARDÉE : le produit a
 *   au plus deux fois les chiffres du nombre, il tient dans « N × N ».
 *
 * ⑥ > « l'accolade disparaît et l'espace se réajuste si besoin sur la ligne
 *   >   principale » — APRÈS la remontée. La ligne se referme alors sur la
 *   largeur réelle du produit.
 *
 * ⚠️ **CONTRÔLE CROISÉ.** Le produit est recalculé sur le texte que la ligne
 *   porte, et `to.text` doit l'égaler : le moteur visuel refuse d'afficher un
 *   calcul faux.
 *
 * ★ **ZÉRO ET UN AUSSI.** « 1² est à faire aussi par cohérence » (l'autrice) :
 *   rien ici ne les distingue.
 */
function planCarre(ctx, ids) {
  if (ids.length !== 1) {
    fail(`${ctx.where}un carré s'élève sur UN nombre, et l'accolade en embrasse ${ids.length} : `
      + 'l’émetteur joue un geste par nombre.');
  }
  const idN = ids[0];
  const source = ctx.scene.live(idN, ctx.where);
  const n = numberOf(source.text, ctx, idN);
  if (!Number.isInteger(n) || n < 0) {
    fail(`${ctx.where}carré de « ${source.text} » : on n'élève au carré que des entiers positifs ou nuls.`);
  }
  const produit = n * n;
  if (!Number.isSafeInteger(produit)) {
    fail(`${ctx.where}carré de ${n} : ${produit} sort des entiers exacts.`);
  }
  const to = tokenSpec(ctx, ctx.op.to, 'to');
  if (!to.kind || to.kind === 'letter') to.kind = 'number';
  if (to.text !== String(produit)) {
    fail(`${ctx.where}incohérence : ${n} × ${n} = ${produit}, mais l'émetteur annonce « ${to.text} ». `
      + 'Le moteur visuel refuse d’afficher un calcul faux.');
  }
  const rang = ctx.scene.flowIndex(idN);
  if (rang < 0) fail(`${ctx.where}« ${idN} » n'est pas dans la ligne : il n'y a pas d'espace à élargir.`);

  // --- la découpe du temps --------------------------------------------------
  // L'accolade est BORNÉE comme partout (« la vitesse pour tracer l'accolade
  // devrait être la même qu'ailleurs, à savoir très rapide ») ; tout le reste
  // se partage entre les temps qui ont quelque chose à montrer.
  const T = ctx.dur;
  const tAcc = Math.min(600, T * 0.12);
  const reste = Math.max(1, T - tAcc);
  const d = (k) => Math.max(1, reste * CARRE[k]);
  const t2 = tAcc;                               // ② le double sort, l'espace s'étire
  const t3 = t2 + d('GLISSADE');                 // ③ le × apparaît
  const t4 = t3 + d('SIGNE') + d('LECTURE');     // ④ la descente
  const t4b = t4 + d('DESCENTE');                //    la fusion
  const t5 = t4b + d('FUSION') + d('RESULTAT');  // ⑤ la remontée
  const t6 = t5 + d('REMONTEE');                 // ⑥ l'accolade s'efface, la ligne se réajuste

  // --- ① l'accolade, sous le nombre seul, « au carré » ------------------------
  const acc = tracerAccolade(ctx, [idN], {
    shape: 'brace', tighten: 0,
    // Pas de symbole par défaut : « ² n'est pas lisible sans un nombre avant »
    // (l'autrice). Les mots suffisent, et ils prennent la place du symbole.
    symbol: ctx.op.symbol || null, label: ctx.op.label || null,
    // Elle ne PROMET rien à un `substitute` : c'est ce geste-ci qui pose le
    // produit sous sa pointe. Et elle n'écarte rien : un nombre seul ne se
    // confond avec personne.
    promet: false, marquer: false,
    at: 0, dur: tAcc,
  });
  if (!acc) {
    fail(`${ctx.where}carré de ${n} : l’accolade n’a pas pu être tracée, le calcul n’aurait nulle part où se lire.`);
  }

  // --- ② le double sort de l'original, pendant que l'espace s'étire ----------
  // Il entre dans la ligne JUSTE APRÈS l'original, naît SUR lui, visible, et
  // le reflow qui fait la place l'emmène jusqu'à la sienne. Le signe entre dans
  // la ligne en même temps — sa place doit être faite —, mais reste éteint.
  const posN = ctx.scene.pos(idN);
  const idDouble = ctx.gensym('double');
  const idFois = ctx.gensym('fois');
  const gap = ctx.layoutOpts.gap;
  ctx.scene.create({
    id: idDouble, text: source.text, kind: source.kind || 'number',
    role: 'text', inFlow: true, insertAt: rang + 1, gapBefore: gap * COLLE_AU_SIGNE,
    base: { opacity: 0 },
  }, { where: ctx.where });
  ctx.scene.place(idDouble, exigerPoint(ctx, { x: posN.x, y: posN.y },
    'le double du nombre, né sur l’original', idDouble));
  // ⚠️ **ÉTEINT PAR BASE, ALLUMÉ D'UN COUP À SA SORTIE.** L'état de base d'un
  //   nœud vaut depuis le PREMIER instant de la scène, pas depuis son étape :
  //   posé visible par base, le double se peignait dès t = 0, par-dessus la
  //   ligne d'avant (mesuré : « 115 » sur le « 1 » voisin). Il s'allume donc en
  //   une milliseconde, exactement sur l'original qu'il recouvre : l'œil ne voit
  //   rien paraître, puis un nombre qui se détache.
  ctx.anim({ id: idDouble, prop: 'opacity', to: 1, at: tAcc, dur: 1 });
  ctx.scene.create({
    id: idFois, text: '×', kind: 'operator',
    role: 'text', inFlow: true, insertAt: rang + 1, gapBefore: gap * ECART_TERMES,
    base: { opacity: 0, scale: 0.5, fill: ctx.palette.phos },
  }, { where: ctx.where });
  const membres = [idN, idFois, idDouble];
  ctx.reflow({ at: t2, dur: d('GLISSADE'), ease: EASE.move });
  // L'accolade s'étire sur l'expression, au rythme de l'espace.
  ctx.scene.poserAccolade(acc.id, membres);
  suivreLesAccolades(ctx, { at: t2, dur: d('GLISSADE') });

  // --- ③ le second arrivé, le × apparaît entre les deux ----------------------
  ctx.anim({ id: idFois, prop: 'opacity', to: 1, at: t3, dur: d('SIGNE') });
  ctx.anim({ id: idFois, prop: 'scale', to: 1, at: t3, dur: d('SIGNE'), ease: EASE.pop });

  // --- ④ l'expression descend d'un bloc, et fusionne en son produit ----------
  // Même translation verticale pour les trois : les écarts sont conservés, et
  // « 115 ×115 » se lit encore en arrivant sous la pointe.
  const boite = boiteEmbrassee(ctx, membres);
  const ancre = exigerPoint(ctx, { x: boite ? boite.cx : NaN, y: acc.resultat.y },
    'le point, sous l’accolade, où le produit se lit', to.id);
  const ligneY = posN.y;
  // ★ « N'embrasse que ce qui est encore là » : l'expression quitte la ligne tout
  //   entière, et le tracé s'en va pendant qu'elle descend. « au carré » reste,
  //   et attend la fin, comme le symbole d'une somme.
  quitterLAccolade(ctx, membres, { at: t4, dur: d('DESCENTE') });
  for (const id of membres) {
    const p = ctx.scene.pos(id);
    ctx.anim({ id, prop: 'translate', to: { x: p.x, y: ancre.y }, at: t4, dur: d('DESCENTE'), ease: EASE.move });
  }
  for (const id of membres) {
    ctx.anim({ id, prop: 'translate', to: { x: ancre.x, y: ancre.y }, at: t4b, dur: d('FUSION'), ease: EASE.move });
    ctx.anim({ id, prop: 'scale', to: 0.65, at: t4b, dur: d('FUSION') });
    ctx.anim({ id, prop: 'opacity', to: 0, at: t4b + d('FUSION') * 0.55, dur: d('FUSION') * 0.45 });
  }
  ctx.scene.create({
    id: to.id, text: to.text, kind: to.kind, group: to.group,
    role: 'text', inFlow: false, ...espacementDe(ctx, idN),
    base: { opacity: 0, fill: ctx.palette.phos },
  }, { where: ctx.where });
  ctx.scene.place(to.id, ancre);
  const tPop = t4b + d('FUSION') * 0.6;
  ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: tPop, dur: d('FUSION') * 0.3 });
  ctx.anim({
    id: to.id, prop: 'scale', values: [0.8, 1.12, 1], offsets: [0, 0.7, 1],
    at: tPop, dur: d('FUSION') * 0.4, ease: EASE.pop,
  });

  // --- ⑤ le résultat remonte sur la ligne, à la place gardée -----------------
  // L'expression éteinte tient encore sa place dans le flux : la ligne ne bouge
  // pas pendant que le résultat remonte, à la verticale, au milieu de cette place.
  ctx.place(to.id, { x: ancre.x, y: ligneY }, { at: t5, dur: d('REMONTEE'), ease: EASE.move });

  // --- ⑥ PUIS l'accolade disparaît, et la ligne se réajuste ------------------
  for (const id of membres) ctx.scene.kill(id, ctx.where);
  ctx.scene.enterFlow(to.id, rang, ctx.where);
  ctx.reflow({ at: t6, dur: d('RETRAIT'), ease: EASE.move });
  // Ce qui reste de l'accolade — la légende, le tracé s'il n'est pas déjà parti — s'éteint.
  for (const id of acc.ids) {
    if (ctx.scene.get(id).data && ctx.scene.get(id).data.retiree) continue;
    ctx.anim({ id, prop: 'opacity', to: 0, at: t6, dur: d('RETRAIT') * 0.6 });
  }
}

/** La part de chaque temps du carré, accolade mise à part. */
const CARRE = Object.freeze({
  GLISSADE: 0.16, SIGNE: 0.07, LECTURE: 0.07, DESCENTE: 0.13, FUSION: 0.14,
  RESULTAT: 0.09, REMONTEE: 0.15, RETRAIT: 0.19,
});

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
    garderPlace: ctx.op.garderPlace === true,
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
    garderPlace: ctx.op.garderPlace === true,
    symbol,
    label,
  });
}
