/**
 * LE RYTHME DES GESTES — « Pas à pas » ou « Simultané ».
 *
 * Deux façons de jouer le MÊME scénario. Ce module ne touche ni à
 * l'arithmétique, ni aux valeurs, ni aux identifiants, ni aux URL : il réécrit
 * les seuls `at` des ops d'un step, c'est-à-dire **l'ordonnancement**. Le
 * scénario reste l'objet pur qu'il était (CONTRACTS §3, invariant 8) ; c'est la
 * compilation qui en tire deux lignes de temps différentes, comme elle en tire
 * déjà deux pour `reduced` et pour `speed`.
 *
 * ## Les deux modes, et le fait qu'ils n'en font qu'un
 *
 * > « **Pas à pas** — une opération après l'autre, la suivante ne commence que
 * >   quand la précédente est finie. **Simultané** — toutes les opérations de
 * >   MÊME TYPE qui ne touchent PAS les mêmes caractères démarrent presque en
 * >   même temps, décalées de 0,1 s l'une de l'autre pour faire un effet de
 * >   vague. » (l'auteur)
 *
 * Les deux énoncés décrivent la même mécanique à un paramètre près, et c'est ce
 * qui permet de n'écrire qu'un seul ordonnanceur plutôt que deux qui se
 * seraient mis à diverger :
 *
 *   Les ops d'un même TYPE se rangent en **vagues**. Une vague part quand la
 *   précédente est finie ; à l'intérieur d'une vague, le membre de rang `r`
 *   part `r × ONDE` après le premier.
 *
 *   · **Pas à pas** : une vague ne prend JAMAIS deux membres. Chaque op attend
 *     donc la fin de la précédente — « les unes après les autres ».
 *   · **Simultané** : une vague prend tout ce qui ne se marche pas dessus,
 *     c'est-à-dire toute op dont l'empreinte est disjointe de celles déjà dans
 *     la vague. Une op qui touche un caractère déjà pris ouvre une vague neuve.
 *
 * En Pas à pas, chaque geste transformant attend la fin du précédent,
 * quel que soit son type. Les marques (étiquettes, surlignages, attentes)
 * accompagnent les gestes sans occuper ce verrou. En Simultané, seules les
 * opérations de même type et d'empreintes disjointes rejoignent une vague.
 *
 * ## ★ L'ORDRE DE LECTURE EST PRÉSERVÉ, ET C'EST UNE CONTRAINTE DURE
 *
 * Réordonner, ici, ne veut jamais dire PERMUTER. Une op écrite après une autre
 * se joue après elle, dans les deux modes : le scénario dit une suite de
 * gestes, et cette suite porte le raisonnement qu'on démontre. Ce qui change
 * est seulement l'instant où chacun démarre.
 *
 * Conséquence mécanique : quand une op est repoussée, **tout ce qui la suit
 * l'est d'autant**. C'est le rôle de `decalage`. Sans lui, le `move` final
 * d'une étape d'additions (`mappeurs.js › etapeDAdditions`, écrit à 3 500 ms
 * pour tomber juste après une vague unique de sommes) se déclencherait au
 * milieu de la troisième addition d'une série sérialisée — il refermerait la
 * ligne sous les gestes en cours. MESURÉ sur `fmaj+mas+mrdE` : sept sommes à
 * 2 800 ms chacune finissent à 20 300 ms, et c'est là que le `move` doit
 * tomber, pas à 3 500.
 *
 * ## ★ L'EMPREINTE : ce qu'une op « touche »
 *
 * Elle est LUE sur l'op, par les champs que le vocabulaire fermé définit
 * (CONTRACTS §3.1) — jamais déclarée à côté, ce qui serait une seconde table de
 * vérité à laisser diverger. Deux précautions :
 *
 *  · un sélecteur déclaratif (`{group:…}`, `{all:true}`) ne nomme aucun id : on
 *    le tient pour UNIVERSEL, c'est-à-dire intersectant tout. Une op qui peut
 *    toucher n'importe quoi ne rejoint jamais une vague — le doute se tranche
 *    du côté qui ne casse rien ;
 *  · les ids PRODUITS comptent comme les ids référencés. Ils ne peuvent pas
 *    entrer en collision (un id n'est jamais réutilisé, invariant 4), donc les
 *    inclure ne change rien aujourd'hui ; les exclure serait un pari sur le
 *    fait que cet invariant tienne, et il n'y a rien à gagner à le prendre.
 */

import { DEFAULT_DUR } from './constants.js';
import { fail } from './errors.js';

/** Les deux rythmes, dans l'ordre d'affichage du sélecteur. */
export const RYTHMES = ['pasAPas', 'simultane'];

/**
 * ★ **LE DÉFAUT EST ICI, ET C'EST UNE SEULE CONSTANTE.**
 *
 * > « Quand ça sera au point, on passera probablement en parallèle/par lots par
 * >   défaut, et séquentiel/pas à pas sur demande. » (l'auteur)
 *
 * Le jour venu, il n'y a QUE cette ligne à changer : `'simultane'` à la place
 * de `'pasAPas'`. Tout le reste — la compilation, le bouton, la persistance —
 * la lit et ne la recopie nulle part. C'est délibérément une constante de
 * module et non une valeur écrite dans `reglages.js` ou dans la barre de
 * transport : trois copies d'un défaut, ce sont trois occasions de n'en changer
 * que deux.
 */
export const RYTHME_DEFAUT = 'pasAPas';

/**
 * L'écart entre deux membres d'une même vague, en millisecondes.
 *
 * > « décalées de 0,1 s l'une de l'autre pour faire un effet de vague »
 * >   (l'auteur)
 *
 * Ce n'est pas un réglage de confort : c'est ce qui distingue « ça part
 * ensemble » de « ça part d'un bloc ». Strictement simultané, l'œil voit un
 * saut et ne sait pas qu'il y avait plusieurs gestes ; à un dixième de seconde
 * d'écart, il voit une vague, donc il voit qu'il y en a plusieurs et dans quel
 * ordre ils se lisent — de gauche à droite, puisque c'est l'ordre d'émission.
 */
export const ONDE_SIMULTANE = 100;

/** Marque d'empreinte universelle — un sélecteur déclaratif, qui peut tout viser. */
const PARTOUT = Symbol('empreinte universelle');

/**
 * ★ **LES MARQUES — ce que le rythme ne gouverne pas, et pourquoi.**
 *
 * Un step mêle deux natures d'ops, et les confondre rend le mode « Pas à pas »
 * absurde au lieu de le rendre strict :
 *
 *  · les **GESTES** transforment la ligne — ils somment, substituent, laissent
 *    tomber, réordonnent, recalculent la mise en page. Ce sont eux, les
 *    « opérations » dont l'auteur dit qu'il faut les faire « les unes après les
 *    autres » : l'œil n'a qu'un endroit où regarder à la fois ;
 *  · les **MARQUES** ne transforment rien, elles DÉSIGNENT — un surlignage, un
 *    estompage, une étiquette, les cornes du 666, une attente.
 *
 * MESURÉ, et c'est ce qui a tranché : sur `cmm` (l'écart entre le plus grand et
 * le plus petit), deux `annotate` posent « MAX » et « MIN » au même instant,
 * chacune sur son nombre, et chacune dure 4,6 s parce qu'elle reste lisible
 * pendant tout le calcul. Les sérialiser posait « MIN » quatre secondes et demie
 * après « MAX » — et repoussait d'autant la soustraction elle-même. Sur `fi`,
 * trois étiquettes faisaient glisser le `drop` de 2 200 à 8 000 ms. Ce n'est pas
 * « une opération à la fois », c'est une étiquette qui attend son tour pour
 * désigner quelque chose que personne ne regarde plus.
 *
 * Une marque **reçoit** le décalage de ses voisines — elle accompagne un geste,
 * donc elle le suit s'il recule — mais elle n'en **crée** jamais : elle ne forme
 * pas de vague et n'attend la fin de personne.
 *
 * ⚠️ **CETTE LISTE A UNE JUMELLE**, `recherche/scenario.js › SANS_LAYOUT`, et
 *   ce n'est pas une coïncidence : « ne recalcule pas la mise en page » et « ne
 *   transforme pas la ligne » sont la même propriété, lue une fois côté émetteur
 *   (qui s'en sert pour n'autoriser qu'une op géométrique par step) et une fois
 *   ici. Les deux copies existent parce que l'agent heuristique ne dépend pas du
 *   moteur visuel (CONTRACTS §1) ; deux copies, c'est deux occasions de
 *   diverger, et la divergence serait SILENCIEUSE. Un test les fait donc se
 *   regarder — `recherche/tests/lents/integration-visuel.test.js`, au même
 *   endroit que la confrontation des deux copies du vocabulaire d'ops.
 */
export const MARQUES = new Set(['highlight', 'dim', 'pulse', 'reveal', 'annotate', 'wait', 'horns']);

/**
 * Normalise et valide le rythme demandé.
 * @param {string|null|undefined} v
 * @returns {'pasAPas'|'simultane'}
 */
export function normaliserRythme(v) {
  if (v === undefined || v === null || v === '') return RYTHME_DEFAUT;
  if (!RYTHMES.includes(v)) {
    fail(`option « rythme » invalide : ${JSON.stringify(v)} — attendu ${RYTHMES.map((r) => `« ${r} »`).join(' ou ')}.`);
  }
  return v;
}

/**
 * Les identifiants de jetons qu'une op touche — référencés ou produits.
 *
 * @param {object} op
 * @returns {Set<string>|typeof PARTOUT}
 */
export function empreinteDe(op) {
  const ids = new Set();
  let universel = false;

  /** Une désignation de cible : id, liste d'ids, ou sélecteur déclaratif. */
  const cible = (v) => {
    if (typeof v === 'string') { ids.add(v); return; }
    if (Array.isArray(v)) { v.forEach(cible); return; }
    // `{group:…}`, `{groupNot:…}`, `{kind:…}`, `{all:true}` : aucun id nommé.
    if (v && typeof v === 'object') universel = true;
  };

  /** Un jeton produit : `{id, text, kind}`, ou une liste de ceux-là. */
  const produit = (v) => {
    if (Array.isArray(v)) { v.forEach(produit); return; }
    if (v && typeof v === 'object' && typeof v.id === 'string') ids.add(v.id);
  };

  if (!op || typeof op !== 'object') return ids;
  // merge redistribue toute la ligne : même des sources disjointes animent
  // les voisins (mrdf/mrf9). Cette empreinte inclut donc le reflow implicite.
  if (op.op === 'merge') return PARTOUT;

  // — ce que l'op DÉSIGNE ----------------------------------------------------
  // La liste suit le tableau des champs du vocabulaire fermé (CONTRACTS §3.1).
  // Un champ oublié ne fait pas d'erreur silencieuse dans le mauvais sens : il
  // rend l'empreinte plus PETITE, donc deux ops se croiraient disjointes. C'est
  // pourquoi `verifierEmpreintes` (voir les tests) relit cette liste face au
  // validateur de `recherche/scenario.js › referencesDe`, qui la tient aussi.
  for (const k of ['target', 'targets', 'between', 'anchor', 'order', 'up', 'down',
    'reset', 'consume', 'surnumeraires', 'efface', 'dividende', 'diviseur',
    'couvre', 'avant', 'apres', 'ids']) {
    if (op[k] !== undefined) cible(op[k]);
  }
  for (const lot of Array.isArray(op.lots) ? op.lots : []) {
    if (lot && lot.between !== undefined) cible(lot.between);
    if (lot && lot.ids !== undefined) cible(lot.ids);
  }
  for (const paire of Array.isArray(op.pairs) ? op.pairs : []) {
    if (!paire || typeof paire !== 'object') continue;
    if (paire.target !== undefined) cible(paire.target);
    if (paire.targets !== undefined) cible(paire.targets);
    produit(paire.to);
  }
  for (const groupe of Array.isArray(op.groups) ? op.groups : []) {
    if (groupe && groupe.targets !== undefined) cible(groupe.targets);
  }
  for (const famille of Array.isArray(op.familles) ? op.familles : []) {
    if (!famille || typeof famille !== 'object') continue;
    if (famille.membres !== undefined) cible(famille.membres);
    if (famille.garde !== undefined) cible(famille.garde);
  }

  // — ce que l'op PRODUIT ----------------------------------------------------
  produit(op.to);
  produit(op.digits);
  produit(op.tokens);
  if (typeof op.tag === 'string') ids.add(op.tag);

  return universel ? PARTOUT : ids;
}

/** Deux empreintes se marchent-elles dessus ? L'universelle marche sur tout. */
function seCroisent(a, b) {
  if (a === PARTOUT || b === PARTOUT) return true;
  // On parcourt la plus petite : l'appartenance à un `Set` est en temps constant.
  const [petit, grand] = a.size <= b.size ? [a, b] : [b, a];
  for (const id of petit) if (grand.has(id)) return true;
  return false;
}

/**
 * L'étendue réelle d'une op, en millisecondes de scénario.
 *
 * ★ Le `stagger` COMPTE, et c'est le même calcul que celui de l'émetteur
 *   (`moteur/transformations/commun.js › enchainer`). Une substitution de douze
 *   caractères décalés de 90 ms ne dure pas 1 100 ms mais 2 090 : la croire
 *   finie au bout de 1 100 ferait démarrer la suivante par-dessus les trois
 *   derniers caractères — exactement le chevauchement qu'on vient d'interdire.
 */
export function etendueDe(op) {
  const dur = op.dur ?? DEFAULT_DUR[op.op] ?? 0;
  const stagger = op.stagger ?? 0;
  if (!stagger) return dur;
  return dur + stagger * Math.max(0, nbCibles(op) - 1);
}

/** Combien d'éléments le `stagger` d'une op échelonne. */
function nbCibles(op) {
  if (Array.isArray(op.pairs)) return op.pairs.length;
  if (Array.isArray(op.targets)) return op.targets.length;
  if (Array.isArray(op.digits)) return op.digits.length;
  if (Array.isArray(op.between)) return op.between.length;
  return 1;
}

/**
 * Réordonne les ops d'un step selon le rythme demandé.
 *
 * Ne modifie RIEN : rend une nouvelle liste `{op, i, at}`, triée dans l'ordre
 * temporel, où `at` remplace `op.at`. Les ops elles-mêmes sont les objets du
 * scénario, intacts — le scénario est partagé entre les compilations (deux
 * lecteurs, deux thèmes), le salir serait le rendre dépendant de l'ordre dans
 * lequel on l'a compilé.
 *
 * ★ **ET `fadeAt` SUIT, parce que c'est une DÉPENDANCE déguisée en nombre.**
 *
 * `moteur/transformations/commun.js › retirerAccolade` écrit sur l'op `group`
 * un `fadeAt` = « l'accolade s'efface tant de millisecondes après mon début ».
 * Ce nombre n'est pas un réglage : c'est le résultat d'un calcul —
 * `fin de l'action + attendre − at de l'accolade` — fait sur les instants
 * DÉCLARÉS des autres ops du step. Il encode donc « quand l'action finit »,
 * et il le fige.
 *
 * Décaler les ops sans le décaler laisse l'accolade s'effacer au milieu de
 * l'action, ce qui est exactement la faute que la garde de routine
 * (`tests/fin-des-accolades.test.js`) existe pour attraper. MESURÉ avant
 * correction : sur `fart`, l'accolade s'effaçait à 2 700 ms pour une action
 * finissant à 4 000 ; sur `fi`, à 5 100 ms pour une action finissant à 10 900.
 *
 * La correction est exacte, et pas approchée. L'action se termine avec la
 * dernière op du step, donc son décalage est le décalage TOTAL `D` ; `fadeAt`
 * étant relatif au début de son accolade, qui a elle-même glissé de `dA`, le
 * nouveau `fadeAt` vaut `fadeAt + D − dA`. Le `move` de fermeture, écrit à la
 * fin de l'action, se retrouve alors exactement sur le même instant absolu —
 * ce que la règle demande : « au même instant, un `move` nu referme la ligne ».
 *
 * Quand l'op qui fixait la fin de l'action n'est pas la dernière à être
 * planifiée, `D` la surestime : l'accolade s'attarde un peu. C'est le bon sens
 * de l'erreur — la règle interdit qu'elle parte TROP TÔT, jamais trop tard.
 *
 * @param {object} step
 * @param {{rythme:'pasAPas'|'simultane'}} options
 * @returns {{op:object, i:number, at:number, fadeAt?:number}[]}
 */
export function ordonnerLesOps(step, { rythme } = {}) {
  const mode = normaliserRythme(rythme);
  const simultane = mode === 'simultane';

  // L'ordre de lecture : l'instant écrit d'abord, le rang d'écriture ensuite.
  // C'est celui que `compile.js` employait déjà pour suivre les valeurs
  // « dernière connue » d'un couple (élément, propriété), et il ne change pas :
  // on ne permute jamais, on ne fait que décaler.
  const ops = (step.ops || []).map((op, i) => ({ op, i }));
  ops.sort((a, b) => (a.op.at ?? 0) - (b.op.at ?? 0) || a.i - b.i);

  // Par type d'op, la vague en cours : quand elle a commencé, combien de
  // membres elle porte, ce qu'ils touchent, et quand le type redevient libre.
  const vagues = new Map();
  let decalage = 0;
  /* ★ **LE VERROU D'ORDRE — une op ne démarre jamais avant celle qui la
       précède dans le scénario.**

     Il est nécessaire, et c'est un test qui l'a montré (« l'ordre de lecture
     n'est jamais permuté »). En Simultané, une op peut REJOINDRE une vague déjà
     partie, donc démarrer plus tôt que son instant écrit ; le décalage devient
     alors négatif, et il tire en arrière tout ce qui suit. Mesuré : sur une
     étape de cinq ops, la sortie sortait dans l'ordre 0, 4, 1, 2, 3 — la
     dernière op passait en deuxième position.

     Rejoindre une vague est bien l'effet voulu (c'est ce qui met « ensemble »
     des gestes que l'émetteur avait écrits à la file), mais pas au prix d'une
     permutation : le scénario dit une SUITE de gestes, et cette suite porte le
     raisonnement. Un geste peut donc rattraper son prédécesseur, jamais le
     doubler. */
  let dernierDebut = -Infinity;
  let finDuGeste = 0;
  const sortie = [];

  for (const { op, i } of ops) {
    const type = op.op;

    // Une MARQUE accompagne, elle n'opère pas : elle reçoit le décalage de ses
    // voisines et n'en crée aucun (voir `MARQUES`).
    if (MARQUES.has(type)) {
      const quand = Math.max((op.at ?? 0) + decalage, dernierDebut);
      dernierDebut = quand;
      sortie.push({ op, i, at: quand, dA: decalage });
      continue;
    }

    const emp = empreinteDe(op);
    const base = (op.at ?? 0) + decalage;
    let v = vagues.get(type);

    const rejoint = simultane && v && v.membres.every((m) => !seCroisent(emp, m));
    let debut;
    if (rejoint) {
      debut = Math.max(v.debut + v.rang * ONDE_SIMULTANE, dernierDebut);
    } else {
      // Vague neuve : elle part au plus tôt à son instant écrit, et jamais
      // avant que la vague précédente du même type soit finie.
      debut = Math.max(v ? Math.max(base, v.fin) : base, dernierDebut, simultane ? 0 : finDuGeste);
      v = { debut, rang: 0, membres: [], fin: 0 };
      vagues.set(type, v);
    }
    dernierDebut = debut;
    finDuGeste = Math.max(finDuGeste, debut + etendueDe(op));

    // Tout ce qui suit est poussé d'autant : l'ordre de lecture est une
    // contrainte dure, et une op retardée retarde sa suite (voir l'en-tête).
    decalage += debut - base;

    v.rang += 1;
    v.membres.push(emp);
    v.fin = Math.max(v.fin, debut + etendueDe(op));

    // `dA` — de combien CETTE op a glissé. Sert au report de `fadeAt`.
    sortie.push({ op, i, at: debut, dA: decalage });
  }

  // Second passage : les dépendances figées en nombres suivent le décalage
  // TOTAL du step (voir l'en-tête, « `fadeAt` suit »). Il faut connaître la fin
  // pour les corriger, d'où le passage séparé.
  const D = decalage;
  for (const e of sortie) {
    if (typeof e.op.fadeAt === 'number') e.fadeAt = Math.max(0, e.op.fadeAt + D - e.dA);
    delete e.dA;
  }

  // Un décalage ne peut pas défaire l'ordre temporel, mais il peut rendre deux
  // instants égaux : on re-trie pour que `compile.js` planifie bien dans
  // l'ordre où les choses se produisent.
  sortie.sort((a, b) => a.at - b.at);
  return sortie;
}
