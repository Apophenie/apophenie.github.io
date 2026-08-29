/**
 * Fabrique et outils communs aux cinq familles d'opérateurs.
 *
 * ## Le descripteur (CONTRACTS §2.2)
 *
 * ```js
 * { id, code, deprecated, from, to, apply, couverture, famille, notoriete,
 *   adHoc, commute, cout, isJoker, libelle, regle, note, steps }
 * ```
 *
 * ## Lecture retenue de `apply(valeur, traces)`
 *
 * Le contrat fixe la signature ; il reste à fixer la forme des `traces`. Ici :
 *
 * - `traces` est **un jeu d'intervalles par élément** de `valeur` — un par
 *   caractère (`STR`), par token (`TOKENS`), par nombre (`NUMS`), et un seul
 *   pour un `NUM`. C'est ce qui permet à `apply` de faire suivre la traçabilité
 *   sans que le moteur ait à deviner quel caractère est devenu quel nombre ;
 * - `apply` retourne `{ valeur, traces }` de la même forme, ou **`null`** si
 *   l'opérateur ne s'applique pas. Jamais d'exception, jamais de mutation.
 *
 * `appliquer(op, etat)` (voir `catalogue.js`) emballe le tout dans un `Etat`.
 *
 * ## `additions(valeur)` — champ OPTIONNEL, pour les seules triches d'addition
 *
 * Rend, dans l'ordre de lecture, **le nombre de TERMES de chaque addition**
 * que l'opérateur ferait sur ce vecteur — `[]` s'il n'en fait aucune. Deux
 * opérateurs le portent aujourd'hui : `mad` (l'addition sélective) et `mrd`
 * (le redécoupage tricheur).
 *
 * ★ **Pourquoi il existe.** L'auteur a tranché que le malus d'une triche
 * d'addition se DILUE avec le nombre d'additions qui se suivent : « plus il y
 * en a, moins la triche se verra ». Or cette information n'est PAS lisible sur
 * les états d'entrée et de sortie — `[6,5,16,8] → [6,6,6,8]` dit qu'un chiffre
 * a été absorbé, jamais en combien de gestes. Seul l'opérateur, qui tient son
 * plan de découpe, le sait. Il le dit donc, plutôt que de laisser le barème le
 * deviner : une seule source, comme partout ailleurs (CONTRACTS §0.3).
 *
 * ★ **Pur, déterministe, sans exception**, comme `apply` — c'est le même plan,
 * relu. Un opérateur qui ne le porte pas n'est pas fautif : le barème retombe
 * alors sur le compte brut des chiffres absorbés, c'est-à-dire sur la peine
 * pleine (`src/recherche/elegance.js`). L'absence coûte cher, elle ne
 * blanchit rien.
 *
 * ## Émission de la démonstration — `steps(avant, apres, ctx)`
 *
 * `ctx` vaut `{ ids, cle }` :
 *
 * - `ids` — l'identifiant du token qui représente **chaque élément** de `avant`
 *   dans la scène (même longueur que la valeur de `avant`) ;
 * - `cle` — un préfixe **unique dans le scénario**, alloué par l'appelant
 *   (typiquement `'e' + numéro d'étape`), à partir duquel l'opérateur nomme les
 *   tokens qu'il crée : `cle + '_' + rang`. C'est bien l'émetteur qui nomme
 *   (CONTRACTS §3), et les noms sont prévisibles : `op.sortie(avant, apres, ctx)`
 *   rend la liste des ids représentant `apres`, que l'appelant réinjecte dans le
 *   `ctx` de l'étape suivante.
 */

import { estEtat, origineDe, normaliserTraces, unionTraces } from '../etat.js';
import { estBilingue, LANGUES } from '../i18n.js';

export const FAMILLES = Object.freeze([
  'filtre', 'decoupe', 'mesure', 'mappeur', 'combinateur', 'finisseur', 'joker',
]);

/** Préfixe de code par famille (CONTRACTS §4.1). */
export const PREFIXE = Object.freeze({
  filtre: 'f', decoupe: 't', mesure: 'n', mappeur: 'm',
  combinateur: 'c', finisseur: 'p', joker: 'j',
});

/** Ordre des familles dans le catalogue = ordre des préfixes. */
export const ORDRE_PREFIXES = Object.freeze(['f', 't', 'n', 'm', 'c', 'p', 'j']);

/**
 * Grammaire d'un code d'opérateur (CONTRACTS §4.1) : **une lettre de famille**,
 * puis un **corps parlant** en minuscules et chiffres, puis — facultative — une
 * **majuscule de variante**.
 *
 * ★ Pourquoi la majuscule finale, et pourquoi elle seule. Depuis le passage aux
 * codes parlants, deux opérateurs peuvent être le MÊME geste à un détail près :
 * `mr39` compte les segments allumés, `m14F` compte les mêmes segments une fois
 * les traits Fusionnés ; `msen`/`m7F` disent la même chose en sept segments. La
 * majuscule marque ce détail, et elle le marque à l'œil : on lit « quatorze
 * segments, variante F » sans avoir à consulter le registre. Elle est limitée à
 * UN caractère en fin de code pour que deux codes ne puissent jamais différer
 * par la seule casse d'un caractère interne — `m14f` et `m14F` seraient un
 * piège à relecture, et un piège à lecture tolérante d'URL.
 *
 * ★ Le corps admet les chiffres partout, y compris en tête (`m0` retire les
 * zéros, `m36` cherche trois 6). L'ancienne interdiction du zéro de tête n'avait
 * de sens que tant que le corps était un index base36 : un index `01` et un
 * index `1` auraient désigné le même rang sous deux écritures. Un corps parlant
 * n'est plus un nombre, la question ne se pose plus.
 */
export const RE_CODE = /^[ftnmcpj][0-9a-z]+[A-Z]?$/;

// ───────────────────────────────────────────────────────────────────────────
// Traces
// ───────────────────────────────────────────────────────────────────────────

/** Traces par élément d'un état (une liste d'intervalles par élément). */
export function tracesDe(etat) {
  if (!estEtat(etat)) return null;
  if (etat.type === 'NUM') return [normaliserTraces(etat.traces)];
  const n = etat.type === 'STR' ? [...etat.valeur].length : etat.valeur.length;
  return Array.from({ length: n }, (_, i) => origineDe(etat, i));
}

/** Union de plusieurs jeux d'intervalles, normalisée (voir `unionTraces`). */
export const fusion = unionTraces;

/** Signature d'un jeu d'intervalles — sert à apparier avant/après. */
export const cleTrace = (t) => normaliserTraces(t).map(([d, f]) => `${d}-${f}`).join('.');

/** Éléments comparables d'un état — un par token de scène. */
export function elementsDe(etat) {
  if (!estEtat(etat)) return [];
  switch (etat.type) {
    case 'STR': return [...etat.valeur];
    case 'NUM': return [String(etat.valeur)];
    default: return etat.valeur.map(String);
  }
}

/**
 * Apparie les éléments de `apres` à ceux de `avant` par identité de trace.
 * Utilisé par les filtres qui ne font que retirer des caractères : les tokens
 * conservés gardent leur identifiant de scène.
 *
 * ★ Repli par sous-suite de valeurs. Les traces ne sont exploitables que si
 * l'état porte des `origines` **par élément** (`etat.js`). Or le moteur de
 * recherche fait circuler ses propres états — `{type, valeur, traces}`, sans
 * `origines` (CONTRACTS §2.1 n'impose que `traces`) : `origineDe` y rend alors
 * la même valeur pour tous les éléments, et l'appariement par trace dégénère.
 * Comme ces opérateurs ne font que RETIRER des éléments, l'appariement par
 * sous-suite de valeurs est exact — et il ne dépend d'aucune trace.
 *
 * @returns {number[]} pour chaque élément de `apres`, l'index dans `avant` (ou −1)
 */
export function apparier(avant, apres) {
  // ★ L'appariement par trace ne DISCRIMINE que si chaque élément a la sienne.
  //
  // Le défaut, mesuré sur `https://www.example.com/path/to/page` : « On ne
  // garde que les consonnes » appliqué à `path` effaçait le **h** et gardait le
  // **a**. Les états du moteur de recherche ne portent pas d'`origines` par
  // élément (CONTRACTS §2.1 n'impose que `traces`) : `origineDe` rend alors la
  // MÊME trace pour les quatre lettres, et l'appariement par trace, au lieu
  // d'échouer franchement, apparie **dans l'ordre** — `pth` → `p a t`. Comme
  // il ne rendait aucun `-1`, le repli par sous-suite n'était jamais consulté,
  // et c'est un appariement faux qui décidait quel caractère s'efface à
  // l'écran. On regarde donc d'abord si les traces séparent quoi que ce soit.
  if (tracesDiscriminantes(avant)) {
    const parTrace = apparierParTrace(avant, apres);
    if (parTrace.every((i) => i >= 0)) return parTrace;
  }
  const parValeur = apparierParSousSuite(avant, apres);
  if (parValeur && parValeur.every((i) => i >= 0)) return parValeur;
  return apparierParTrace(avant, apres);
}

/** Chaque élément porte-t-il SA trace ? Sinon l'appariement par trace est aveugle. */
function tracesDiscriminantes(etat) {
  const ts = tracesDe(etat);
  if (!ts || ts.length < 2) return true;
  return new Set(ts.map(cleTrace)).size === ts.length;
}

function apparierParTrace(avant, apres) {
  const ta = tracesDe(avant) || [];
  const tb = tracesDe(apres) || [];
  const index = new Map();
  ta.forEach((t, i) => {
    const k = cleTrace(t);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(i);
  });
  const pris = new Set();
  return tb.map((t) => {
    const cands = index.get(cleTrace(t)) || [];
    for (const i of cands) if (!pris.has(i)) { pris.add(i); return i; }
    return -1;
  });
}

/** `apres` s'obtient-il en retirant des éléments de `avant` ? (gloutonne, exacte) */
function apparierParSousSuite(avant, apres) {
  const a = elementsDe(avant);
  const b = elementsDe(apres);
  if (!b.length || b.length > a.length) return null;
  const out = [];
  let i = 0;
  for (const cible of b) {
    while (i < a.length && a[i] !== cible) i++;
    if (i >= a.length) return null;
    out.push(i);
    i++;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Identifiants de tokens
// ───────────────────────────────────────────────────────────────────────────

/** Nom d'un token créé par l'opérateur courant. */
export const nomToken = (ctx, i) => `${ctx.cle}_${i}`;

/** `n` identifiants frais, dans l'ordre. */
export const nomsTokens = (ctx, n) => Array.from({ length: n }, (_, i) => nomToken(ctx, i));

/** Sortie par défaut : l'opérateur a créé un token par élément de `apres`. */
export function sortieCreee(avant, apres, ctx) {
  const n = apres.type === 'NUM' ? 1 : (apres.type === 'STR' ? [...apres.valeur].length : apres.valeur.length);
  return nomsTokens(ctx, n);
}

/** Sortie d'un filtre qui ne fait que retirer : les ids conservés. */
export function sortieConservee(avant, apres, ctx) {
  return apparier(avant, apres).map((i, j) => (i >= 0 ? ctx.ids[i] : nomToken(ctx, j)));
}

// ───────────────────────────────────────────────────────────────────────────
// Étapes
// ───────────────────────────────────────────────────────────────────────────

/**
 * Construit un `Step` conforme à CONTRACTS §3 (JSON pur, aucune fonction).
 *
 * `title` et `caption` sont des chaînes DÉJÀ dans la langue du scénario : un
 * step est du texte affiché, et le moteur visuel exige un `title` non vide de
 * type chaîne (`src/visuel/scenario.js`). C'est donc à `steps()` de choisir la
 * langue, via `dire(…, ctx.langue)`.
 */
export function etape(ctx, title, caption, ops, extra = {}) {
  const step = { id: `s_${ctx.cle}`, title, ops: ops.filter(Boolean), ...extra };
  if (caption) step.caption = caption;
  return step;
}

/** Token de scène décrit pour une op qui en crée un. */
export const token = (id, text, kind = 'number') => ({ id, text: String(text), kind });

/**
 * Durées par défaut des primitives — **miroir** de `src/visuel/constants.js`.
 *
 * Le moteur arithmétique ne dépend pas du moteur visuel (CONTRACTS §1) : il ne
 * peut donc pas importer la table, il en tient une copie. Un test croisé
 * (`src/visuel/tests/compile.test.js`) échoue si les deux divergent — sans quoi
 * `enchainer` calculerait des `at` sur des durées périmées et les gestes se
 * chevaucheraient à nouveau.
 */
export const DUREE_OP = Object.freeze({
  highlight: 600, dim: 700, drop: 2000, substitute: 1100, move: 900, group: 1300,
  insertOperators: 700, sum: 2800, reduce: 2600, flip180: 1100, sevenSeg: 3000,
  fourteenSeg: 3400, countStrokes: 3000, keyboard: 2400, annotate: 800, pulse: 600, reveal: 1400,
  wait: 900, partition: 1800, table: 2600, horns: 2200, merge: 1000, shift: 900,
});

/** Nombre de cibles échelonnées par `stagger`, pour mesurer l'étendue réelle. */
function nbCibles(o) {
  if (Array.isArray(o.pairs)) return o.pairs.length;
  if (Array.isArray(o.targets)) return o.targets.length;
  if (Array.isArray(o.between)) return o.between.length;
  return 1;
}

/**
 * ★ Joue les ops **l'une après l'autre** — c'est la règle de composition d'un
 * step du catalogue.
 *
 * Deux ops qui appellent `ctx.reflow()` en même temps animent DEUX FOIS
 * `translate` sur les mêmes tokens ; deux ops qui touchent le même token
 * animent deux fois son opacité ou son échelle. Le compilateur visuel signale
 * les unes comme les autres (« animations concurrentes », research §2.4,
 * contrainte 4) et le scrubbing devient ambigu. Une seule discipline évite les
 * deux : le geste suivant commence quand le précédent a fini.
 *
 * `at` est CALCULÉ, jamais deviné : un `at` fourni par l'appelant est ignoré —
 * c'est précisément ce qui produisait les chevauchements.
 */
export function enchainer(ops, depart = 0) {
  let curseur = depart;
  return ops.filter(Boolean).map((brut) => {
    const o = { ...brut, at: curseur };
    const dur = o.dur ?? DUREE_OP[o.op] ?? 700;
    curseur += dur + (o.stagger || 0) * Math.max(0, nbCibles(o) - 1);
    return o;
  });
}

/**
 * Fin réelle d'une suite d'ops déjà enchaînées, en ms depuis le début du step.
 * Sert à faire se retirer une accolade **une fois les trois gestes joués** —
 * elle doit tenir pendant le ramassage et la substitution, pas seulement
 * pendant sa propre durée.
 */
export function finDe(ops) {
  let fin = 0;
  for (const o of ops) {
    const dur = o.dur ?? DUREE_OP[o.op] ?? 700;
    fin = Math.max(fin, (o.at || 0) + dur + (o.stagger || 0) * Math.max(0, nbCibles(o) - 1));
  }
  return fin;
}

/** Programme le retrait de l'accolade d'une suite enchaînée, si elle existe. */
export function retirerAccolade(ops) {
  const acc = ops.find((o) => o.op === 'group');
  if (acc) acc.fadeAt = Math.max(0, finDe(ops) - (acc.at || 0) - 300);
  return ops;
}

// ───────────────────────────────────────────────────────────────────────────
// Fabrique
// ───────────────────────────────────────────────────────────────────────────

const CHAMPS = ['id', 'code', 'from', 'to', 'famille', 'libelle', 'regle', 'apply'];

/**
 * Complète, vérifie et gèle un descripteur d'opérateur.
 * Échec bruyant : un descripteur incomplet est une erreur de programmation, pas
 * un cas d'exécution (CONTRACTS §2.2, heuristique §7.2).
 */
export function def(spec) {
  for (const c of CHAMPS) {
    if (spec[c] === undefined || spec[c] === null) {
      throw new Error(`opérateur « ${spec.id || '?'} » : champ « ${c} » obligatoire.`);
    }
  }
  const op = {
    deprecated: false,
    notoriete: 0.5,
    adHoc: 0,
    commute: false,
    cout: 1,
    isJoker: false,
    note: null,
    actifParDefaut: true,
    couverture: null,
    steps: null,
    sortie: null,
    outil: null,
    mention: null,
    mentionPluriel: null,
    designe: null,
    ...spec,
  };
  // ★ LE NOM DE L'OUTIL — ce que la scène AFFICHE sous le décor qu'elle monte.
  //
  // Pourquoi un champ de plus, alors que `libelle` existe. Les deux ne disent
  // pas la même chose : `libelle` nomme le GESTE (« On applique le chiffre de
  // César (13) »), l'étape que Le Registre annonce ; `outil` nomme la CHOSE
  // qu'on voit à l'écran (« Chiffre de César classique (13) ») — la réglette,
  // le clavier, l'afficheur. En plein écran, la scène seule est visible : sans
  // ce nom, on regarde une grille de vingt-six cases sans savoir de quelle
  // méthode elle est la preuve.
  //
  // ★ Et il vit ICI, au catalogue, jamais dans le moteur visuel. Une scène qui
  // écrirait « Miroir Atbash » en dur serait une seconde source de vérité :
  // renommer l'opérateur laisserait la scène annoncer l'ancien nom, c'est-à-dire
  // exactement le contraire de « ce qui est montré est ce qui est compté ».
  //
  // ★ Le défaut est le libellé, et c'est ce qui rend l'oubli impossible : un
  // opérateur qui monte un décor sans avoir déclaré son `outil` affiche son
  // libellé — moins précis, jamais faux, jamais vide. On ne déclare donc un
  // `outil` que là où l'objet montré porte un nom propre.
  if (!op.outil) op.outil = op.libelle;
  if (!FAMILLES.includes(op.famille)) {
    throw new Error(`opérateur « ${op.id} » : famille inconnue « ${op.famille} ».`);
  }
  // Toute chaîne AFFICHABLE porte ses deux langues (voir `../i18n.js`).
  for (const champ of ['libelle', 'regle', 'outil']) {
    if (!estBilingue(op[champ])) {
      throw new Error(`opérateur « ${op.id} » : « ${champ} » doit être un couple `
        + `{ ${LANGUES.join(', ')} } de chaînes non vides — reçu ${JSON.stringify(op[champ])}.`);
    }
  }
  // ★ LA MENTION — le nom du geste, écrit sous la ligne le temps qu'il dure.
  //
  // Elle ne remplace ni `libelle` (que Le Registre annonce, hors de la scène)
  // ni `outil` (qui nomme un DÉCOR monté : une réglette, un clavier). Elle
  // répond à un troisième besoin : une transformation qui n'a ni décor ni
  // accolade — retirer les accents, passer en capitales — se joue à l'écran
  // sans que rien ne dise ce qu'on est en train de faire. La mention le dit, et
  // s'efface avec l'étape (`visuel/primitives/annotate.js`, champ « fugace »).
  //
  // Facultative : un geste qui se lit tout seul n'a pas à être sous-titré.
  for (const champ of ['mention', 'mentionPluriel']) {
    if (op[champ] !== null && !estBilingue(op[champ])) {
      throw new Error(`opérateur « ${op.id} » : « ${champ} » doit être null ou un couple `
        + `{ ${LANGUES.join(', ')} } — reçu ${JSON.stringify(op[champ])}.`);
    }
  }
  // Un pluriel sans singulier ne s'accorderait à rien.
  if (op.mentionPluriel && !op.mention) {
    throw new Error(`opérateur « ${op.id} » : « mentionPluriel » sans « mention ».`);
  }
  if (op.note !== null && !estBilingue(op.note)) {
    throw new Error(`opérateur « ${op.id} » : « note » doit être null ou un couple `
      + `{ ${LANGUES.join(', ')} } — reçu ${JSON.stringify(op.note)}.`);
  }
  // `gabarit` est un libellé d'étape à trou (« On additionne les %s ») : il est
  // AFFICHÉ, donc il porte ses deux langues comme le reste, et le trou doit
  // exister dans chacune — sinon l'accord chiffres/nombres tomberait en silence
  // dans une seule langue (voir `combinateurs.js`).
  if (op.gabarit !== undefined) {
    if (!estBilingue(op.gabarit)) {
      throw new Error(`opérateur « ${op.id} » : « gabarit » doit être un couple `
        + `{ ${LANGUES.join(', ')} } — reçu ${JSON.stringify(op.gabarit)}.`);
    }
    for (const l of LANGUES) {
      if (!op.gabarit[l].includes('%s')) {
        throw new Error(`opérateur « ${op.id} » : « gabarit.${l} » ne porte pas de « %s ».`);
      }
    }
  }
  if (op.code[0] !== PREFIXE[op.famille]) {
    throw new Error(`opérateur « ${op.id} » : le code « ${op.code} » ne porte pas le préfixe `
      + `« ${PREFIXE[op.famille]} » de la famille ${op.famille} (CONTRACTS §4.1).`);
  }
  if (!op.sortie) op.sortie = sortieCreee;
  if (!op.couverture && op.from === 'STR') {
    op.couverture = (valeur) => (typeof valeur === 'string' && valeur.length
      ? [[0, [...valeur].length]] : []);
  }
  return Object.freeze(op);
}
