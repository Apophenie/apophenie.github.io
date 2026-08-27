/**
 * Combinateurs — `NUMS → NUM` et dénombrements `TOKENS → NUM`. Codes `c…`.
 *
 * Rendu : les opérateurs apparaissent entre les nombres (`insertOperators`),
 * puis les opérandes volent vers la case résultat pendant que celle-ci compte
 * (`sum`, avec les sommes partielles — research §4.7).
 */

import { def, etape, token, fusion, nomsTokens, nomToken, enchainer, retirerAccolade } from './commun.js';
import { bilingue, dire } from '../i18n.js';
import { NUM_MIN, NUM_MAX } from '../etat.js';

const borne = (n) => (Number.isFinite(n) && Number.isInteger(n) && n >= NUM_MIN && n <= NUM_MAX ? n : null);

// ───────────────────────────────────────────────────────────────────────────
// « les chiffres » ou « les nombres » ? — le titre dit ce qu'on additionne
// ───────────────────────────────────────────────────────────────────────────

/**
 * ★ Un combinateur ne travaille pas toujours sur la même matière.
 *
 * Un comptage de segments, de traits, d'extrémités, une réduction chiffre à
 * chiffre : ce sont des **chiffres**, 0 à 9, un signe chacun. Un rang dans
 * l'alphabet (`hope` → 8, 15, 16, 5), un score de Scrabble cumulé, un code
 * ASCII : ce sont des **nombres**, qui s'écrivent à plusieurs chiffres.
 * Annoncer « on additionne les chiffres » devant `8 + 15 + 16 + 5` serait faux
 * — 15 n'est pas un chiffre.
 *
 * Le critère est donc CE QUI EST À L'ÉCRAN, pas l'opérateur qui l'a produit :
 * le titre décrit les jetons que le spectateur a sous les yeux au moment où
 * l'accolade se ferme. Tous les opérandes tiennent en un signe → « chiffres » ;
 * dès qu'un seul en demande deux → « nombres ». C'est la même discipline que
 * le contrôle croisé de CONTRACTS §0.3 : on ne dit que ce qu'on montre.
 *
 * Conséquence assumée : le même opérateur `cs` intitule son étape « on
 * additionne les chiffres » sur `3 + 4 + 4 + 4` et « on additionne les
 * nombres » sur `8 + 15 + 16 + 5`. C'est voulu — le libellé statique de
 * l'opérateur (`libelle`, celui de la liste des méthodes) reste, lui,
 * invariant.
 */
export const MOT_OPERANDES = Object.freeze({
  chiffre: bilingue('chiffres', 'digits'),
  nombre: bilingue('nombres', 'numbers'),
});

const tientEnUnChiffre = (v) => Number.isInteger(v) && Math.abs(v) <= 9;

/** `'chiffre'` si tous les opérandes s'écrivent d'un seul signe, `'nombre'` sinon. */
export function natureOperandes(valeurs) {
  const vs = Array.isArray(valeurs) ? valeurs : [valeurs];
  return vs.length && vs.every(tientEnUnChiffre) ? 'chiffre' : 'nombre';
}

/**
 * Titre d'étape d'un combinateur. Quand l'opérateur porte un `gabarit`, le
 * `%s` y reçoit « chiffres » ou « nombres » selon les opérandes réels ; sinon
 * le libellé statique fait l'affaire (les combinateurs qui ne NOMMENT pas leur
 * matière — « on alterne plus et moins » — n'ont rien à accorder).
 */
function titreEtape(spec, valeurs, langue) {
  const gabarit = dire(spec.gabarit, langue);
  if (!gabarit) return dire(spec.libelle, langue);
  return gabarit.replace('%s', dire(MOT_OPERANDES[natureOperandes(valeurs)], langue));
}

/** Étape d'agrégation : opérateurs intercalés, puis accumulation. */
function etapeAgregation(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    const partiels = spec.partiels ? spec.partiels(avant.valeur) : null;
    const ops = [];
    const glyphe = (i) => (typeof spec.glyphe === 'function' ? spec.glyphe(i) : spec.glyphe);
    const signes = ctx.ids.slice(1).map((_, i) => `${ctx.cle}op${i}`);
    if (spec.glyphe && ctx.ids.length > 1) {
      ops.push({
        op: 'insertOperators',
        between: ctx.ids,
        ids: signes,
        glyph: glyphe(0),
        // Un signe par interstice : la somme alternée n'est pas une
        // soustraction en chaîne, et l'écran doit dire lequel des deux.
        glyphs: ctx.ids.slice(1).map((_, i) => glyphe(i)),
      });
    }
    const sum = {
      op: 'sum',
      targets: ctx.ids,
      // ★ Les signes appartiennent au calcul : ils s'en vont avec lui. Nommés
      // par l'émetteur, ils ne sont pas absorbés d'office par `sum` (qui
      // n'absorbe que les siens, préfixés « @ ») — il faut les lui déclarer,
      // faute de quoi une rangée de « + » survivait jusqu'au verdict.
      ...(spec.glyphe && signes.length ? { consume: signes } : {}),
      to: token(sortie[0], apres.valeur, 'number'),
      // ★ Chaque combinateur DIT ce qu'il fait : le symbole paraît sous la
      // pointe de l'accolade, entre les sources et le résultat. Une accolade
      // nue ne distingue pas une somme d'un produit.
      symbol: spec.symbole || 'Σ',
    };
    if (partiels) sum.partials = partiels;
    ops.push(sum);
    return [etape(ctx, titreEtape(spec, avant.valeur, ctx.langue),
      `${avant.valeur.join(` ${spec.lecture || '+'} `)} = ${apres.valeur}`,
      enchainer(ops), { hold: 500 })];
  };
}

/**
 * Étape de dénombrement : on encadre, ça se ramasse, un nombre reste.
 * Les trois gestes sont ENCHAÎNÉS : `group`, `drop` et `substitute` recalculent
 * chacun le layout, les superposer produirait des animations concurrentes.
 *
 * C'est aussi le rendu des agrégations qui ne sont PAS des sommes (écart,
 * moyenne, collage) : `sum` refuse — à juste titre — d'afficher une addition
 * dont le total n'est pas celui qu'elle annonce.
 */
function etapeDecompte(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    // Le titre est accordé aux opérandes RÉELS (chiffres ou nombres), et
    // l'accolade porte le même mot que le Registre : ils décrivent le même
    // geste, ils ne peuvent pas se contredire.
    const titre = titreEtape(spec, avant.valeur, ctx.langue);
    return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, retirerAccolade(enchainer([
      // L'accolade porte le symbole ET la règle en toutes lettres : un
      // dénombrement n'a pas de signe consacré, il faut donc l'écrire.
      ctx.ids.length > 1
        ? { op: 'group', targets: ctx.ids, symbol: spec.symbole || '#', label: titre }
        : null,
      ctx.ids.length > 1 ? { op: 'drop', targets: ctx.ids.slice(1), stagger: 20 } : null,
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to: token(sortie[0], apres.valeur, 'number') }] },
    ])))];
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Le ramassage sous l'accolade — décompte, nivellement, sélection
// ───────────────────────────────────────────────────────────────────────────

/**
 * Poids des phases du ramassage sous l'accolade, en millisecondes nominales.
 *
 * ⚠ **Miroir** de `poidsRamassage` (`src/visuel/primitives/helpers.js`), pour
 * la même raison que `DUREE_OP` : le moteur arithmétique ne dépend pas du
 * moteur visuel (CONTRACTS §1), mais c'est lui qui doit dimensionner la durée
 * d'une étape dont le contenu varie — neuf transferts de nivellement ne se
 * jouent pas dans le temps d'un seul. Un test croisé échoue si les deux
 * divergent : sans lui, l'étape garderait sa durée et le geste se jouerait
 * accéléré, sans que rien ne le signale.
 */
export const POIDS_RAMASSAGE = Object.freeze({
  accolade: 900, doubles: 800,
  nivellement0: 260, nivellement1: 520,
  effacement0: 380, effacement1: 90,
  vol0: 620, vol1: 260,
  remontee: 760,
});

/** Durée d'un ramassage, d'après ce qu'il aura à montrer. */
export function dureeRamassage({ voler = 0, effacer = 0, doubles = 0, transferts = 0 } = {}) {
  const P = POIDS_RAMASSAGE;
  return P.accolade
    + (doubles ? P.doubles : 0)
    + (transferts ? P.nivellement0 + transferts * P.nivellement1 : 0)
    + (effacer ? P.effacement0 + effacer * P.effacement1 : 0)
    + P.vol0 + voler * P.vol1
    + P.remontee;
}

/**
 * L'op d'un COMPTAGE : l'accolade se ferme, chaque jeton compté descend dans sa
 * pointe et fait avancer le compteur d'un cran, le total remonte dans la ligne.
 *
 * `count` désigne ce qui compte (par défaut : tout ce qui est embrassé) ; le
 * reste s'efface sur place, sans compter. `doubles` recopie sur une ligne
 * étiquetée, juste au-dessus, les jetons qui comptent **deux** fois.
 *
 * Partagé avec les mesures (`mappeurs.js`) : « compter les lettres » et
 * « compter les jetons » sont le même geste sur deux matières.
 */
export function opComptage({ ids, count = null, doubles = [], doublesLabel = null, symbole = '#', libelle = null, to }) {
  const comptes = count || ids;
  return {
    op: 'group',
    targets: ids,
    ...(count ? { count } : {}),
    ...(doubles.length ? { doubles, ...(doublesLabel ? { doublesLabel } : {}) } : {}),
    symbol: symbole,
    ...(libelle ? { label: libelle } : {}),
    to,
    dur: dureeRamassage({
      voler: comptes.length + doubles.length,
      effacer: ids.length - comptes.length,
      doubles: doubles.length,
    }),
  };
}

/** Étape de comptage : un `group` qui compte, et c'est tout. */
function etapeComptage(spec) {
  return (avant, apres, ctx) => {
    if (ctx.ids.length < 2) return etapeDecompte(spec)(avant, apres, ctx);
    const sortie = nomsTokens(ctx, 1);
    const titre = titreEtape(spec, avant.valeur, ctx.langue);
    const count = spec.cibles ? spec.cibles(avant.valeur).map((i) => ctx.ids[i]) : null;
    return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, [opComptage({
      ids: ctx.ids,
      count,
      symbole: spec.symbole || '#',
      libelle: titre,
      to: token(sortie[0], apres.valeur, 'number'),
    })], { hold: 400 })];
  };
}

/**
 * ★ Le NIVELLEMENT — comment une moyenne se montre au lieu de s'annoncer.
 *
 * On prend 1 au plus grand, on le donne au plus petit, on recommence jusqu'à
 * ce qu'aucun écart ne dépasse 1. La somme est invariante, donc la valeur
 * commune atteinte EST la moyenne ; et les jetons qui ne l'atteignent pas
 * sont, littéralement, l'arrondi.
 *
 * La suite converge : chaque transfert diminue d'au moins 2 la somme des
 * carrés des écarts (`Δ = 2 − 2(vᵢ − vⱼ)`, avec `vᵢ − vⱼ ≥ 2`), et une
 * quantité entière positive strictement décroissante s'arrête. Le nombre de
 * transferts, lui, croît comme la variance : au-delà de `MAX_TRANSFERTS`, on
 * rend `converge: false` et l'appelant retombe sur le geste sobre.
 *
 * ⚠ **Jumeau** de `nivellementDe` (`src/visuel/primitives/helpers.js`) : le
 * moteur visuel le rejoue sur les nombres qu'il a À L'ÉCRAN, et refuse le
 * geste si les deux ne tombent pas d'accord. Un test croisé les compare.
 */
export const MAX_TRANSFERTS = 18;

export function nivellementDe(valeurs, maxTransferts = MAX_TRANSFERTS) {
  const v = valeurs.slice();
  const transferts = [];
  while (transferts.length <= maxTransferts) {
    let hi = 0;
    let lo = 0;
    for (let i = 1; i < v.length; i++) {
      if (v[i] > v[hi]) hi = i;
      if (v[i] < v[lo]) lo = i;
    }
    if (v[hi] - v[lo] <= 1) return { transferts, valeurs: v, converge: true };
    if (transferts.length === maxTransferts) break;
    v[hi] -= 1;
    v[lo] += 1;
    transferts.push({ de: hi, vers: lo, source: v[hi], cible: v[lo] });
  }
  return { transferts, valeurs: v, converge: false };
}

/** Étape de moyenne : on nivelle, puis les nombres égaux à la moyenne fusionnent. */
function etapeMoyenne(spec) {
  return (avant, apres, ctx) => {
    const { transferts, valeurs, converge } = nivellementDe(avant.valeur);
    const gagnants = valeurs.filter((v) => v === apres.valeur).length;
    // Repli honnête : un nivellement interminable ne se montre pas, on retombe
    // sur l'accolade sobre plutôt que sur un geste qu'on ne saurait pas finir.
    if (!converge || !gagnants) return etapeDecompte(spec)(avant, apres, ctx);
    const sortie = nomsTokens(ctx, 1);
    const titre = titreEtape(spec, avant.valeur, ctx.langue);
    // La légende dit ce qu'on VA voir — et rien de plus : quand tout se tient
    // déjà à 1 près, il n'y a aucun transfert à annoncer.
    const legende = dire(transferts.length ? bilingue(
      `On donne 1 du plus grand au plus petit jusqu’à ce que tout se tienne à 1 près, puis les ${apres.valeur} fusionnent`,
      `Hand 1 from the largest to the smallest until nothing is more than 1 apart, then the ${apres.valeur}s merge`,
    ) : bilingue(
      `Tout se tient déjà à 1 près : les ${apres.valeur} fusionnent, le reste est l’arrondi`,
      `Nothing is more than 1 apart already: the ${apres.valeur}s merge, what is left is the rounding`,
    ), ctx.langue);
    return [etape(ctx, titre, `${legende} : ${apres.valeur}`, [{
      op: 'group',
      targets: ctx.ids,
      niveler: true,
      symbol: spec.symbole || 'moy.',
      label: titre,
      to: token(sortie[0], apres.valeur, 'number'),
      dur: dureeRamassage({
        voler: gagnants,
        effacer: ctx.ids.length - gagnants,
        transferts: transferts.length,
      }),
    }], { hold: 500 })];
  };
}

/**
 * ★ SÉLECTIONNER n'est pas CALCULER.
 *
 * « On garde le plus grand » se jouait comme un dénombrement : tout se
 * ramassait sous l'accolade, le premier jeton — qui n'était pas le maximum —
 * survivait, puis un `substitute` le remplaçait par la bonne valeur. Le geste
 * mentait deux fois : il gardait le mauvais, et il faisait passer une
 * sélection pour un calcul.
 *
 * Le geste juste est plus simple, et il n'a besoin d'aucune accolade : **on
 * désigne le gagnant, on efface les autres, la ligne se resserre**. Le gagnant
 * ne bouge pas, ne change pas de valeur, et garde son identité de jeton
 * (`sortie` ci-dessous) — parce qu'il est le même nombre avant et après.
 */
function etapeSelection(spec) {
  return (avant, apres, ctx) => {
    const i = avant.valeur.indexOf(apres.valeur);
    // Un sélecteur dont le résultat n'est aucun de ses opérandes n'en est pas
    // un : on ne devine pas, on retombe sur le geste générique.
    if (i < 0) return etapeDecompte(spec)(avant, apres, ctx);
    const gagnant = ctx.ids[i];
    const perdants = ctx.ids.filter((_, k) => k !== i);
    const titre = titreEtape(spec, avant.valeur, ctx.langue);
    return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, enchainer([
      { op: 'highlight', targets: [gagnant] },
      // « erase », pas « fall » : les perdants ne tombent pas dans un calcul,
      // ils s'effacent sur place, un par un. Et le rapprochement est un temps
      // À PART — c'est la discipline de `drop.js`.
      perdants.length ? { op: 'drop', targets: perdants, mode: 'erase', regroup: false, dur: 1400 } : null,
      perdants.length ? { op: 'move', dur: 900 } : null,
    ]), { hold: 400 })];
  };
}

/** Le jeton qui survit à une sélection : le gagnant lui-même, pas un neuf. */
function sortieSelection(avant, apres, ctx) {
  const i = avant.valeur.indexOf(apres.valeur);
  return [i >= 0 ? ctx.ids[i] : nomToken(ctx, 0)];
}

/**
 * Les gestes disponibles, par nom. Un combinateur DIT lequel lui va : le nom du
 * geste est la première chose qu'on lit d'une spécification, comme le nom d'une
 * op est la première chose qu'on lit d'un scénario (CONTRACTS §3.1).
 */
const GESTES = Object.freeze({
  decompte: etapeDecompte,   // on encadre, ça se ramasse, un nombre reste
  comptage: etapeComptage,   // ça se compte, un jeton à la fois
  moyenne: etapeMoyenne,     // ça se nivelle, puis ça fusionne
  selection: etapeSelection, // on garde l'élu, on efface le reste
});

/** Sommes partielles successives, pour animer un compteur. */
const partielsSomme = (vs) => vs.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], [0]);

const agregations = [
  {
    id: 'c.somme', code: 'cs',
    symbole: 'Σ',
    libelle: bilingue('On additionne', 'Add them up'),
    gabarit: bilingue('On additionne les %s', 'Add up the %s'),
    regle: bilingue('La somme des valeurs', 'The sum of the values'),
    notoriete: 1.00, glyphe: '+', lecture: '+',
    calcul: (vs) => vs.reduce((a, b) => a + b, 0),
    partiels: partielsSomme,
  },
  {
    id: 'c.soustraction', code: 'cst',
    symbole: '−',
    libelle: bilingue('On soustrait à la chaîne', 'Subtract along the chain'),
    gabarit: bilingue('On soustrait les %s à la chaîne', 'Subtract the %s along the chain'),
    regle: bilingue('Le premier moins tous les autres — les tirets sont des moins',
      'The first one minus all the others — the dashes are minus signs'),
    notoriete: 0.45, adHoc: 0.15, glyphe: (i) => '−', lecture: '−',
    calcul: (vs) => vs.slice(1).reduce((a, b) => a - b, vs[0]),
    partiels: (vs) => vs.reduce((acc, v, i) => [...acc, i === 0 ? v : acc[acc.length - 1] - v], [0]),
    minimum: 2,
  },
  {
    id: 'c.produit', code: 'cp',
    symbole: '∏',
    libelle: bilingue('On multiplie', 'Multiply them'),
    gabarit: bilingue('On multiplie les %s', 'Multiply the %s'),
    regle: bilingue('Le produit des valeurs', 'The product of the values'),
    notoriete: 0.60, glyphe: '×', lecture: '×',
    calcul: (vs) => vs.reduce((a, b) => a * b, 1),
    partiels: (vs) => vs.reduce((acc, v) => [...acc, acc[acc.length - 1] * v], [1]),
    minimum: 2,
  },
  {
    id: 'c.alternee', code: 'cal',
    symbole: '∓',
    libelle: bilingue('On alterne plus et moins', 'Alternate plus and minus'),
    regle: bilingue('v₀ − v₁ + v₂ − v₃… comme un critère de divisibilité',
      'v₀ − v₁ + v₂ − v₃… the way a divisibility test goes'),
    notoriete: 0.35, adHoc: 0.2, glyphe: (i) => (i % 2 === 0 ? '−' : '+'), lecture: '∓',
    calcul: (vs) => vs.reduce((a, b, i) => (i === 0 ? b : a + (i % 2 ? -b : b)), 0),
    // Sans sommes partielles, `sum` afficherait l'addition simple et refuserait
    // de tomber sur le total alterné : ce serait un calcul faux à l'écran.
    partiels: (vs) => vs.reduce((acc, v, i) => [...acc, i === 0 ? v : acc[acc.length - 1] + (i % 2 ? -v : v)], [0]),
    minimum: 2,
  },
  {
    id: 'c.maxMoinsMin', code: 'cmm',
    symbole: 'Δ',
    libelle: bilingue('On prend l’écart', 'Take the spread'),
    gabarit: bilingue('On prend l’écart entre les %s', 'Take the spread between the %s'),
    regle: bilingue('Le plus grand moins le plus petit', 'The largest one minus the smallest'),
    notoriete: 0.30, adHoc: 0.2, lecture: '…',
    calcul: (vs) => Math.max(...vs) - Math.min(...vs),
    geste: 'decompte', minimum: 2,
  },
  {
    id: 'c.moyenne', code: 'cmo',
    symbole: 'moy.',
    libelle: bilingue('On fait la moyenne', 'Take the average'),
    gabarit: bilingue('On fait la moyenne des %s', 'Take the average of the %s'),
    regle: bilingue('La somme divisée par le nombre de valeurs, arrondie',
      'The sum divided by how many values there are, rounded'),
    notoriete: 0.55, adHoc: 0.1, lecture: '+',
    calcul: (vs) => Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
    geste: 'moyenne', minimum: 2,
  },
  {
    id: 'c.cardinal', code: 'cnv',
    symbole: '#',
    libelle: bilingue('On compte les valeurs', 'Count the values'),
    gabarit: bilingue('On compte les %s', 'Count the %s'),
    regle: bilingue('Combien de nombres en tout', 'How many numbers there are in all'),
    notoriete: 0.80,
    calcul: (vs) => vs.length,
    geste: 'comptage',
  },
  {
    id: 'c.concat', code: 'ccat',
    symbole: '⁀',
    libelle: bilingue('On colle les chiffres', 'Glue the digits together'),
    gabarit: bilingue('On colle les %s bout à bout', 'Glue the %s end to end'),
    regle: bilingue('On met les nombres bout à bout et on relit',
      'Set the numbers end to end and read the result'),
    notoriete: 0.20, adHoc: 0.3, lecture: '⁀',
    calcul: (vs) => Number(vs.map((v) => String(Math.abs(v))).join('')),
    geste: 'decompte', minimum: 2,
  },
  {
    id: 'c.max', code: 'cmx',
    symbole: 'max',
    libelle: bilingue('On garde le plus grand', 'Keep the largest'),
    gabarit: bilingue('On garde le plus grand des %s', 'Keep the largest of the %s'),
    regle: bilingue('Le maximum des valeurs', 'The largest of the values'),
    notoriete: 0.50, adHoc: 0.15,
    calcul: (vs) => Math.max(...vs),
    geste: 'selection', minimum: 2,
  },
  {
    id: 'c.min', code: 'cmn',
    symbole: 'min',
    libelle: bilingue('On garde le plus petit', 'Keep the smallest'),
    gabarit: bilingue('On garde le plus petit des %s', 'Keep the smallest of the %s'),
    regle: bilingue('Le minimum des valeurs', 'The smallest of the values'),
    notoriete: 0.50, adHoc: 0.15,
    calcul: (vs) => Math.min(...vs),
    geste: 'selection', minimum: 2,
  },
].map((spec) => {
  const { calcul, minimum = 1, geste, cibles, glyphe, lecture, partiels, ...reste } = spec;
  const base = { ...reste, glyphe, lecture, partiels };
  return def({
    ...reste,
    famille: 'combinateur',
    from: 'NUMS',
    to: 'NUM',
    apply: (valeur, traces) => {
      if (valeur.length < minimum) return null;
      const n = borne(calcul(valeur));
      if (n === null) return null;
      return { valeur: n, traces: [fusion(traces)] };
    },
    steps: GESTES[geste] ? GESTES[geste]({ ...reste, cibles }) : etapeAgregation(base),
    // ★ Une SÉLECTION ne crée pas de jeton : elle en garde un. C'est le
    // gagnant qui représente l'état d'arrivée, à sa place, avec son identité.
    ...(geste === 'selection' ? { sortie: sortieSelection } : {}),
  });
});

const denombrements = [
  {
    id: 'c.compteTokens', code: 'cnj',
    symbole: '#',
    libelle: bilingue('On compte les jetons', 'Count the tokens'),
    regle: bilingue('Combien de morceaux', 'How many pieces there are'),
    notoriete: 0.4,
    calcul: (toks) => toks.length,
    geste: 'comptage',
  },
  {
    id: 'c.compteTokensDistincts', code: 'cnjd',
    symbole: '#',
    libelle: bilingue('On compte les jetons distincts', 'Count the distinct tokens'),
    regle: bilingue('Combien de morceaux différents', 'How many different pieces there are'),
    notoriete: 0.60,
    calcul: (toks) => new Set(toks.map((t) => t.toLowerCase())).size,
    geste: 'comptage',
    // On ne compte QUE la première occurrence de chaque morceau ; les redites
    // s'effacent sans faire avancer le compteur — c'est ce qui montre la règle.
    cibles: (toks) => {
      const vus = new Set();
      const out = [];
      toks.forEach((t, i) => {
        const k = String(t).toLowerCase();
        if (vus.has(k)) return;
        vus.add(k);
        out.push(i);
      });
      return out;
    },
  },
].map((spec) => {
  const { calcul, geste, cibles, ...reste } = spec;
  return def({
    ...reste,
    famille: 'combinateur',
    from: 'TOKENS',
    to: 'NUM',
    apply: (valeur, traces) => {
      const n = borne(calcul(valeur));
      return n === null || n === 0 ? null : { valeur: n, traces: [fusion(traces)] };
    },
    steps: (GESTES[geste] || etapeDecompte)({ ...reste, cibles }),
  });
});

export const COMBINATEURS = Object.freeze([...agregations, ...denombrements]);
