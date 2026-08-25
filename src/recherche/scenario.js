// src/recherche/scenario.js
// ★ Le pont arithmétique ↔ visuel. Chemin → Scenario/Step/Op.
// CONTRACTS.md §3 (normatif) · research/moteur-visuel.md §2 et §4.
//
// Ce module APPARTIENT au moteur de recherche (CONTRACTS.md §1) : c'est le seul
// point de contact entre le catalogue et le lecteur SVG. Il :
//   1. assemble les `Step[]` émis par les opérateurs (`op.steps(avant, apres, ctx)`) ;
//   2. alloue les `id` de tokens — stables, uniques, JAMAIS réutilisés ;
//   3. VÉRIFIE les 8 invariants avant émission, plutôt que de laisser échouer la
//      compilation côté visuel.
//
// ── Conventions d'émission ──────────────────────────────────────────────────
// Les paramètres émis sont exactement ceux qu'accepte `src/visuel/primitives/`
// (vérifié par `tests/integration-visuel.test.js`, qui compile chaque scénario
// avec le compilateur réel). En particulier :
//
//   · `substitute.pairs[]` part d'UN seul token et arrive sur un OU PLUSIEURS :
//     `{target:'a0', to:{id,text,kind}}` ou `{target:'a0', to:[{…},{…},{…}]}`.
//     La forme multiple couvre l'éclatement (`44` → `4`,`4`) et la résonance
//     (le même 6 recopié trois fois).
//   · `sum` refuse d'afficher un calcul faux : la somme des textes des opérandes
//     doit valoir `to.text`. Un comptage (`4 lettres → 4`) n'est donc PAS un
//     `sum` : c'est `annotate` + `substitute` + `drop`.
//   · `reduce` exige `to`, au moins deux `digits` qui reconstituent le token
//     source, et une somme des chiffres égale à `to`. Les réductions à plusieurs
//     paliers (199 → 19 → 10 → 1) sont émises en un `reduce` PAR PALIER, chacun
//     dans son propre step (recherche visuelle §4.8). Quand l'arithmétique ne
//     tombe pas sur une somme de chiffres (`−28 → 6` par réduction signée), on
//     ne force pas `reduce` : `annotate` + `substitute` disent la règle sans
//     mentir sur le calcul.
//   · `insertOperators` n'exige PAS d'`ids` : les signes appartiennent au moteur
//     visuel, qui les nomme `@…` et les fait absorber par le `sum` suivant.
//   · Les ops ne ciblent que des tokens VIVANTS. Le suivi `courants` remplace les
//     ids au fil des substitutions ; l'atténuation du hors-fragment passe par le
//     sélecteur `{groupNot}`, qui ne retient que les nœuds vivants.
//   · Aucune `duration` n'est émise : le compilateur la déduit de l'étendue des
//     ops (une `duration` trop courte est une erreur de compilation). Seul le
//     `hold` de charnière (0,4 s, CONTRACTS §0.4) est fourni.
//
//   · Une seule op « géométrique » par step : deux ops qui recalculent le
//     layout dans le même step animent deux fois `translate` sur les mêmes
//     tokens, ce que le compilateur signale comme des animations concurrentes.
//
// Un opérateur qui fournit `steps()` est prioritaire ; ses steps ne sont retenus
// que s'ils créent exactement un token par élément de l'état résultant (ou ne
// font que supprimer). Sinon on retombe sur le rendu générique ci-dessous, et on
// le signale dans `scenario.avertissements`.

import { rendreValeur } from './bfs.js';
// Le titre et la règle d'une approche vivent dans `titres.js` (voir la note en
// fin de fichier) ; on les importe pour continuer à les ré-exporter d'ici.
import { titreApproche, regleApproche } from './titres.js';
import { serieDeSix, sixDuChemin, compterMoisson, SERIE } from './assemblage.js';

/**
 * Une chaîne affichable du catalogue est un couple `{fr, en}` (voir
 * `src/moteur/i18n.js`). Le moteur de recherche ne dépend pas du moteur
 * arithmétique — il code contre le contrat, pas contre le module : d'où cette
 * lecture locale, tolérante à une chaîne nue.
 */
const LANGUE_DEFAUT = 'fr';
function dire(texte, langue = LANGUE_DEFAUT) {
  if (texte === null || texte === undefined) return null;
  if (typeof texte === 'string') return texte;
  if (typeof texte !== 'object') return null;
  return texte[langue] ?? texte[LANGUE_DEFAUT] ?? texte.en ?? null;
}

/** Vocabulaire fermé des ops — CONTRACTS.md §3.1. Hors de cette liste = erreur. */
export const VOCABULAIRE = new Set([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns',
]);

/**
 * Durées — CONTRACTS.md §0.4. Seul le `hold` de charnière est émis : la durée
 * d'un step est déduite par le compilateur de l'étendue réelle de ses ops (une
 * `duration` plus courte que cette étendue est une erreur de compilation).
 */
export const DUREE_CHARNIERE = 400;
export const DUREE_MIN = 16; // invariant 6

const RE_LETTRE = /\p{L}/u;
const RE_CHIFFRE = /\p{N}/u;
const RE_ESPACE = /\s/u;
const SEPARATEURS = new Set(['-', '.', '/', '_', ':', '?', '&', '=', '#', '@', ',', '+']);

function genreDe(c) {
  if (RE_LETTRE.test(c)) return 'letter';
  if (RE_CHIFFRE.test(c)) return 'digit';
  if (RE_ESPACE.test(c)) return 'space';
  if (SEPARATEURS.has(c)) return 'sep';
  return 'punct';
}

// ══════════════════════════════════ décomposition d'un état en éléments

/** Les « éléments » d'un état = ce que le spectateur voit comme unités distinctes. */
export function elementsDe(e) {
  switch (e.type) {
    case 'STR': return [...e.valeur];
    case 'TOKENS': return e.valeur.slice();
    case 'NUMS': return e.valeur.map(String);
    case 'NUM': return [String(e.valeur)];
    default: return [rendreValeur(e)];
  }
}

function genreEtat(type) {
  return type === 'NUM' || type === 'NUMS' ? 'number' : null;
}

/**
 * ★ Une transformation qui ne transforme RIEN À L'ÉCRAN est sautée
 * silencieusement — elle disparaît du Registre **et** de la numérotation, sans
 * y laisser de trou (les steps ne sont numérotés qu'à l'émission).
 *
 * Le critère est la suite des ÉLÉMENTS, c'est-à-dire les unités que le
 * spectateur distingue — pas le type de l'état, ni la chaîne rendue.
 *
 *  · `t1` « on prend les lettres une par une » fait passer `STR 'hope'` à
 *    `TOKENS ['h','o','p','e']` : le type change, les quatre glyphes de la
 *    ligne sont exactement les mêmes. Rien à montrer.
 *    N3 (`research/heuristique.md §4.8`) ne peut PAS l'attraper : retirer `t1`
 *    du chemin le rend mal typé (`me` part de `TOKENS`), donc le chemin
 *    n'aboutit plus du tout. C'est bien une question de rendu, pas de
 *    recherche — d'où ce filtre ici.
 *  · À l'inverse, `STR 'hope'` → `TOKENS ['hope']` (découpe en mots d'un mot
 *    unique) rend la MÊME chaîne mais pas les mêmes éléments : quatre glyphes
 *    deviennent un seul jeton. L'ancien critère (l'égalité de `rendreValeur`)
 *    sautait ce cas, et laissait la table d'ids désynchronisée de l'état —
 *    trois jetons survivaient à l'écran sans rien représenter.
 */
function rienAMontrer(avant, apres) {
  const a = elementsDe(avant);
  const b = elementsDe(apres);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// ══════════════════════════════════ allocateur d'identifiants

function creerAllocateur() {
  const utilises = new Set();
  let n = 0;
  return {
    utilises,
    nouvel(prefixe = 'k') {
      let id;
      do { id = `${prefixe}${++n}`; } while (utilises.has(id));
      utilises.add(id);
      return id;
    },
    reserver(id) {
      if (utilises.has(id)) return false;
      utilises.add(id);
      return true;
    },
  };
}

// ══════════════════════════════════ alignement avant → après

/** Groupement pur : les éléments d'après sont des concaténations de ceux d'avant. */
function alignerGroupement(avant, apres) {
  const groupes = [];
  const restes = [];
  let i = 0;
  for (const cible of apres) {
    const g = [];
    let acc = '';
    while (i < avant.length && acc.length < cible.length) {
      if (cible.startsWith(acc + avant[i])) { acc += avant[i]; g.push(i); i++; } else if (g.length === 0) { restes.push(i); i++; } else return null;
    }
    if (acc !== cible) return null;
    groupes.push(g);
  }
  while (i < avant.length) { restes.push(i); i++; }
  return { groupes, restes };
}

/**
 * Alignement en sous-suite : `apres` s'obtient en RETIRANT des éléments de
 * `avant`. C'est le cas de tous les filtres (voyelles, consonnes, initiales…),
 * et la fenêtre bornée de l'alignement générique s'y casse les dents dès que
 * les trous sont longs (« Le chat dort… » → « LCD »).
 * @returns {Array<{de:number[], vers:number[]}>|null}
 */
function alignerSousSuite(avant, apres) {
  const out = [];
  let i = 0;
  for (let j = 0; j < apres.length; j++) {
    const debut = i;
    while (i < avant.length && avant[i] !== apres[j]) i++;
    if (i >= avant.length) return null;
    for (let k = debut; k < i; k++) out.push({ de: [k], vers: [] });
    out.push({ de: [i], vers: [j] });
    i++;
  }
  for (let k = i; k < avant.length; k++) out.push({ de: [k], vers: [] });
  return out;
}

/**
 * Alignement de dernier recours — il ne rend JAMAIS `null`.
 * Les `min(n,m)` premiers éléments se correspondent un pour un ; le surplus de
 * `avant` tombe, le surplus de `apres` naît du dernier élément apparié (le
 * `substitute` du vocabulaire accepte un `to` multiple).
 */
function alignerParDefaut(avant, apres) {
  const out = [];
  const n = Math.min(avant.length, apres.length);
  for (let i = 0; i < n; i++) {
    const vers = (i === n - 1 && apres.length > n) ? rangee(i, apres.length) : [i];
    out.push({ de: [i], vers });
  }
  for (let i = n; i < avant.length; i++) out.push({ de: [i], vers: [] });
  return out;
}

/** Alignement générique par points de synchronisation (fenêtre bornée). */
function aligner(avant, apres) {
  const sousSuite = alignerSousSuite(avant, apres);
  if (sousSuite) return sousSuite;
  // Autant d'éléments d'un côté que de l'autre : la lecture 1:1 est la seule
  // honnête (« hope » → « HOPE », une lettre → un nombre). La fenêtre de
  // synchronisation ci-dessous se casserait les dents dessus, faute du moindre
  // point commun entre les deux suites.
  if (avant.length === apres.length) return avant.map((_, i) => ({ de: [i], vers: [i] }));
  const out = [];
  let i = 0;
  let j = 0;
  const FENETRE = 6;
  while (i < avant.length || j < apres.length) {
    if (i < avant.length && j < apres.length && avant[i] === apres[j]) {
      out.push({ de: [i], vers: [j] });
      i++; j++;
      continue;
    }
    let trouve = null;
    for (let d = 1; d <= FENETRE * 2 && !trouve; d++) {
      for (let a = 0; a <= Math.min(d, FENETRE) && !trouve; a++) {
        const b = d - a;
        if (b > FENETRE) continue;
        if (i + a < avant.length && j + b < apres.length && avant[i + a] === apres[j + b]) trouve = { a, b };
      }
    }
    if (!trouve) {
      out.push({ de: rangee(i, avant.length), vers: rangee(j, apres.length) });
      break;
    }
    out.push({ de: rangee(i, i + trouve.a), vers: rangee(j, j + trouve.b) });
    i += trouve.a; j += trouve.b;
  }
  return out.filter((p) => p.de.length || p.vers.length);
}

function rangee(d, f) {
  const out = [];
  for (let i = d; i < f; i++) out.push(i);
  return out;
}

// ══════════════════════════════════ émetteur générique

const EST_ENTIER = /^\d+$/;

/** Somme des chiffres décimaux d'une chaîne de chiffres. */
function sommeChiffres(txt) {
  let s = 0;
  for (const c of txt) s += Number(c);
  return s;
}

/**
 * Paliers d'une réduction théosophique : 199 → 19 → 10 → 1.
 * `null` si la cible n'est pas atteinte par sommes de chiffres successives.
 */
function paliers(depart, arrivee) {
  const out = [];
  let x = depart;
  for (let garde = 0; garde < 12; garde++) {
    if (x === arrivee) return out;
    if (!EST_ENTIER.test(String(x))) return null;
    const suivant = sommeChiffres(String(x));
    if (suivant === x) return null;
    out.push(suivant);
    x = suivant;
  }
  return null;
}

/**
 * Produit les blocs d'étapes d'un passage `avant → apres`, et la nouvelle table
 * d'ids. Retourne `null` si le vocabulaire fermé ne permet pas de le montrer.
 * @returns {{blocs:Array<{titre?:string, legende?:string, ops:Object[]}>, courants:string[][]}|null}
 */
function emettreGenerique(op, avant, apres, courants, alloc, langue = LANGUE_DEFAUT) {
  const A = elementsDe(avant);
  const B = elementsDe(apres);
  const kind = genreEtat(apres.type) || 'letter';
  const titre = dire(op.libelle, langue) || op.id;
  const legende = dire(op.regle, langue);
  const bloc = (ops, t, l) => ({ titre: t || titre, legende: l === undefined ? legende : l, ops });

  // Cas 1 — regroupement pur (STR → TOKENS : les caractères forment des mots).
  if (avant.type === 'STR' && apres.type === 'TOKENS') {
    const g = alignerGroupement(A, B);
    if (g) {
      const ops = [];
      const nouveaux = [];
      g.groupes.forEach((idx) => {
        const cibles = idx.flatMap((i) => courants[i]);
        if (cibles.length > 1) ops.push({ op: 'group', targets: cibles, shape: 'brace' });
        nouveaux.push(cibles);
      });
      if (g.restes.length) ops.push({ op: 'dim', targets: g.restes.flatMap((i) => courants[i]) });
      if (!ops.length) ops.push({ op: 'pulse', targets: nouveaux.flat() });
      return { blocs: decouper(ops, bloc), courants: nouveaux };
    }
  }

  // Cas 2 — retournement du 9 (le gag du README, méthode 6).
  if (avant.type === 'NUM' && apres.type === 'NUM' && avant.valeur === 9 && apres.valeur === 6) {
    const id = alloc.nouvel('f');
    return {
      blocs: [bloc([{ op: 'flip180', target: courants[0][0], to: { id, text: '6', kind: 'number' } }])],
      courants: [[id]],
    };
  }

  // Cas 3 — réduction théosophique, UN reduce par palier (recherche visuelle §4.8).
  if (avant.type === 'NUM' && apres.type === 'NUM' && EST_ENTIER.test(String(avant.valeur))) {
    const suite = paliers(avant.valeur, apres.valeur);
    if (suite && suite.length) {
      const blocs = [];
      let courant = courants[0][0];
      let texte = String(avant.valeur);
      for (const palier of suite) {
        const chiffres = [...texte].map((c) => ({ id: alloc.nouvel('d'), text: c, kind: 'digit' }));
        const resultat = { id: alloc.nouvel('r'), text: String(palier), kind: 'number' };
        blocs.push(bloc([{ op: 'reduce', target: courant, digits: chiffres, to: resultat }],
          suite.length > 1 ? `${titre} (${texte} → ${palier})` : titre));
        courant = resultat.id;
        texte = String(palier);
      }
      return { blocs, courants: [[courant]] };
    }
  }

  // Cas 4 — effondrement en une seule valeur (somme, comptage, mesure).
  if (B.length === 1 && A.length >= 1 && !(A.length === 1 && A[0] === B[0])) {
    const tous = courants.flat();
    const id = alloc.nouvel('s');
    const cible = { id, text: B[0], kind: 'number' };
    const numeriques = avant.type === 'NUMS' || avant.type === 'NUM';
    const valeurs = numeriques ? A.map(Number) : null;
    const additive = numeriques && valeurs.every(Number.isFinite)
      && valeurs.reduce((a, b) => a + b, 0) === Number(B[0]);

    const ops = [];
    if (numeriques && tous.length > 1) {
      // Les signes appartiennent au moteur visuel : il les nomme et le `sum`
      // qui suit les absorbe.
      ops.push({ op: 'insertOperators', between: tous, glyph: signeDe(op) });
    }
    if (additive) {
      // `sum` refuse d'afficher un calcul faux : on ne l'emploie que si la
      // somme des opérandes tombe vraiment sur le résultat.
      ops.push({ op: 'sum', targets: tous, to: cible });
    } else {
      ops.push({ op: 'annotate', anchor: tous, text: legende || titre });
      ops.push({ op: 'substitute', pairs: [{ target: tous[0], to: cible }] });
      if (tous.length > 1) ops.push({ op: 'drop', targets: tous.slice(1) });
    }
    return { blocs: decouper(ops, bloc), courants: [[id]] };
  }

  // Cas 5 — alignement général : substitutions 1:1 et chutes.
  return emettreAlignement(aligner(A, B), A, B, courants, alloc, kind, bloc)
    || emettreAlignement(alignerParDefaut(A, B), A, B, courants, alloc, kind, bloc);
}

/**
 * Traduit un alignement en `substitute` + `drop`. `null` si l'alignement
 * proposé n'est pas exprimable dans le vocabulaire fermé — l'appelant retente
 * alors avec `alignerParDefaut`, qui l'est toujours.
 */
function emettreAlignement(paires, A, B, courants, alloc, kind, bloc) {
  const pairsSub = [];
  const chutes = [];
  const table = [];
  for (const p of paires) {
    const ids = p.de.flatMap((i) => courants[i]);
    if (!p.vers.length) { chutes.push(...ids); continue; }
    const identique = p.de.length === p.vers.length && p.de.every((i, n) => A[i] === B[p.vers[n]]);
    if (identique) {
      p.vers.forEach((j, n) => { table[j] = courants[p.de[n]]; });
      continue;
    }
    if (p.de.length === 1 && p.vers.length > 1) {
      // Éclatement : un token en devient plusieurs (`44` → `4`, `4`).
      const cibles = p.vers.map((j) => {
        const c = { id: alloc.nouvel('n'), text: B[j], kind };
        table[j] = [c.id];
        return c;
      });
      pairsSub.push({ target: ids[0], to: cibles });
      continue;
    }
    if (p.vers.length > p.de.length) return null;
    p.vers.forEach((j, n) => {
      const cible = { id: alloc.nouvel('n'), text: B[j], kind };
      table[j] = [cible.id];
      pairsSub.push({ target: ids[n], to: cible });
    });
    chutes.push(...ids.slice(p.vers.length));
  }
  const ops = [];
  if (pairsSub.length) ops.push({ op: 'substitute', pairs: pairsSub, stagger: 90 });
  if (chutes.length) ops.push({ op: 'drop', targets: chutes });
  if (!ops.length) return null;
  const finales = [];
  for (let j = 0; j < B.length; j++) {
    if (!table[j]) return null;
    finales.push(table[j]);
  }
  return { blocs: decouper(ops, bloc), courants: finales };
}

/**
 * Une seule op « géométrique » par step — voir `SANS_LAYOUT` plus bas. Deux ops
 * qui recalculent le layout dans le même step animent deux fois `translate` sur
 * les mêmes tokens : le compilateur visuel le signale comme des animations
 * concurrentes, et le scrubbing devient ambigu (recherche visuelle §2.4,
 * contrainte 4).
 */

function decouper(ops, bloc) {
  const blocs = [];
  let courant = [];
  let occupe = false;
  for (const o of ops) {
    const geometrique = !SANS_LAYOUT.has(o.op);
    if (geometrique && occupe) { blocs.push(bloc(courant)); courant = []; occupe = false; }
    courant.push(o);
    if (geometrique) occupe = true;
  }
  if (courant.length) blocs.push(bloc(courant));
  return blocs;
}

function signeDe(op) {
  const id = String(op && op.id ? op.id : '');
  if (/sous|moins|minus|sub|altern/i.test(id)) return '−';
  if (/produit|prod|mult/i.test(id)) return '×';
  return '+';
}

// ══════════════════════════════════ steps fournis par le catalogue

/** Recense les ids créés / supprimés par une op, sur le vocabulaire fermé. */
function inventaire(o) {
  const crees = [];
  const supprimes = [];
  const ajouter = (t) => {
    if (!t) return;
    if (Array.isArray(t)) { t.forEach(ajouter); return; }
    if (typeof t === 'object' && typeof t.id === 'string' && t.id) crees.push(t.id);
  };
  switch (o.op) {
    case 'substitute':
      for (const p of o.pairs || []) ajouter(p.to);
      break;
    case 'reduce':
      // Les `digits` naissent puis sont consommés par l'addition ; seul `to`
      // survit au step et représente l'élément résultant.
      ajouter(o.digits);
      ajouter(o.to);
      break;
    case 'insertOperators':
      // `ids` est facultatif : sans lui, les signes sont nommés « @… » par le
      // moteur visuel et n'appartiennent pas au scénario.
      for (const id of normaliserCibles(o.ids)) crees.push(id);
      break;
    case 'drop':
      supprimes.push(...normaliserCibles(o.targets));
      break;
    case 'sum':
      ajouter(o.to);
      supprimes.push(...normaliserCibles(o.targets), ...normaliserCibles(o.consume));
      break;
    case 'flip180': case 'keyboard':
    case 'sevenSeg': case 'fourteenSeg': case 'countStrokes':
      // Ces cinq-là remplacent leur cible quand — et seulement quand — un `to`
      // leur est donné : le clavier fait redescendre son chiffre, l'encart le
      // nombre de son compteur.
      ajouter(o.to);
      if (o.to) supprimes.push(...normaliserCibles(o.target));
      break;
    case 'table':
      // La table de correspondance travaille jeton par jeton : la lettre monte
      // vers sa case, sa valeur en redescend. Comme le clavier, elle ne
      // remplace sa cible que si un `to` lui est donné.
      ajouter(o.to);
      if (o.to) supprimes.push(...normaliserCibles(o.target));
      break;
    case 'partition':
      break; // découper ne crée ni ne supprime : ça regroupe
    case 'horns':
      // Les cornes ne créent aucun JETON — le nœud du dessin appartient au
      // moteur visuel, qui le nomme « @… » comme un halo. Elles suppriment en
      // revanche tout ce que « efface » désigne : c'est le geste même, et il
      // doit se voir dans l'inventaire, faute de quoi le pont croirait que ces
      // jetons vivent encore à l'étape suivante.
      supprimes.push(...normaliserCibles(o.efface));
      break;
    default:
      ajouter(o.to);
      break;
  }
  return { crees, supprimes };
}

function normaliserCibles(t) {
  if (!t) return [];
  if (typeof t === 'string') return [t];
  if (Array.isArray(t)) return t.filter((x) => typeof x === 'string');
  return []; // sélecteur déclaratif {group:…} — pas d'id explicite
}

/** Toutes les références d'id d'une op (pour l'invariant 3). */
function referencesDe(o) {
  const refs = [];
  refs.push(...normaliserCibles(o.targets));
  refs.push(...normaliserCibles(o.target));
  refs.push(...normaliserCibles(o.between));
  refs.push(...normaliserCibles(o.anchor));
  refs.push(...normaliserCibles(o.order));
  for (const p of o.pairs || []) {
    refs.push(...normaliserCibles(p.target));
    refs.push(...normaliserCibles(p.targets));
  }
  for (const g of o.groups || []) refs.push(...normaliserCibles(g.targets));
  return refs;
}

// ══════════════════════════════════ mise en parallèle des groupes

/**
 * Signature d'un chemin : la suite des codes d'opérateurs.
 * Deux morceaux qui la partagent subissent LA MÊME MÉTHODE — c'est la condition
 * pour la leur appliquer en même temps plutôt que l'un après l'autre.
 */
function signatureChemin(chemin) {
  return (chemin.ops || []).map((o) => o.code).join('>');
}

/**
 * Ops qui ne touchent pas au layout — plusieurs peuvent cohabiter dans un step.
 * Une seule op géométrique par step : deux qui recalculent le flux animeraient
 * deux fois `translate` sur les mêmes tokens (recherche visuelle §2.4).
 */
// `horns` en fait partie : il efface sur place et pose un décor accroché, sans
// jamais appeler `reflow` — le 666 est déjà d'un seul tenant, il n'y a aucun
// trou à refermer entre ses trois chiffres.
const SANS_LAYOUT = new Set(['highlight', 'dim', 'pulse', 'reveal', 'annotate', 'wait', 'horns']);

/** Ops dont la fusion consiste simplement à réunir les cibles. */
const FUSION_PAR_CIBLES = new Set(['drop', 'highlight', 'dim', 'pulse', 'reveal']);

/**
 * Fusionne les blocs de plusieurs groupes en un seul jeu de blocs, quand la
 * même transformation peut s'appliquer à tous EN MÊME TEMPS.
 *
 * Rend `null` dès que ce n'est pas exprimable — une somme par groupe, une
 * accolade par groupe, un clavier par groupe : chacune de ces ops recalcule le
 * flux ou anime la caméra pour son compte, et trois d'un coup se
 * contrediraient. L'appelant enchaîne alors les groupes.
 *
 * @param {Array<Array<{titre:string, legende:?string, ops:Object[]}>>} parGroupe
 * @returns {Array<{titre:string, legende:?string, ops:Object[]}>|null}
 */
function fusionnerBlocs(parGroupe) {
  const n = parGroupe[0].length;
  if (!parGroupe.every((b) => b.length === n)) return null;
  const out = [];
  for (let k = 0; k < n; k++) {
    const variantes = parGroupe.map((b) => b[k]);
    const ops = fusionnerOps(variantes.map((v) => v.ops));
    if (!ops) return null;
    // Une figure décrit UN jeton ; deux groupes qui n'en montrent pas la même
    // ne peuvent pas partager un step, sinon le Registre en tairait une.
    const fig = JSON.stringify(variantes[0].figure ?? null);
    if (variantes.some((v) => JSON.stringify(v.figure ?? null) !== fig)) return null;
    out.push({
      titre: variantes[0].titre,
      legende: variantes[0].legende,
      figure: variantes[0].figure ?? null,
      ops,
      hold: variantes[0].hold,
    });
  }
  return out;
}

function fusionnerOps(listes) {
  const n = listes[0].length;
  if (!listes.every((l) => l.length === n && l.every((o, j) => o.op === listes[0][j].op))) return null;
  const out = [];
  for (let j = 0; j < n; j++) {
    const fusion = fusionnerOp(listes.map((l) => l[j]));
    if (!fusion) return null;
    out.push(fusion);
  }
  if (out.filter((o) => !SANS_LAYOUT.has(o.op)).length > 1) return null;
  return out;
}

/** Fusionne une même op appliquée à plusieurs groupes. `null` si impossible. */
function fusionnerOp(variantes) {
  const premier = variantes[0];
  // Identiques mot pour mot (`{op:'move'}` : un simple recalcul du flux) : une
  // seule suffit, et elle vaut pour toute la ligne.
  const ref = JSON.stringify(premier);
  if (variantes.every((o) => JSON.stringify(o) === ref)) return premier;

  if (premier.op === 'substitute') {
    if (!variantes.every((o) => Array.isArray(o.pairs))) return null;
    return { ...premier, pairs: variantes.flatMap((o) => o.pairs) };
  }
  if (FUSION_PAR_CIBLES.has(premier.op)) {
    if (!variantes.every((o) => Array.isArray(o.targets))) return null;
    // Les autres champs (mode, regroup, at…) doivent coïncider : sinon ce n'est
    // pas le même geste, et les réunir en mentirait sur la règle.
    if (!variantes.every((o) => memesReglages(o, premier, ['targets']))) return null;
    return { ...premier, targets: variantes.flatMap((o) => o.targets) };
  }
  return null;
}

function memesReglages(a, b, sauf) {
  const cles = new Set([...Object.keys(a), ...Object.keys(b)].filter((k) => !sauf.includes(k)));
  for (const k of cles) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

// ══════════════════════════════════ construction du scénario

/**
 * @param {Object} approche  approche notée (assemblage.js + score.js)
 * @param {Object} ctx {saisie, methode:{id,label,rule}, resultat, langue:'fr'|'en'}
 * @returns {Object} Scenario conforme à CONTRACTS.md §3
 */
/**
 * ★ Le décor d'une conversion, gardé d'une étape à l'autre.
 *
 * L'aller-retour reste **individuel** : une lettre monte vers la table (ou un
 * caractère vers sa touche), sa valeur en redescend aussitôt, puis la
 * suivante. Ce qui se mutualise, c'est le **déploiement** — quand plusieurs
 * conversions emploient le MÊME décor, il monte à la première, demeure, et ne
 * se retire qu'à la dernière. La caméra fait de même : un recul, un retour,
 * rien entre les deux.
 *
 * Cela vaut pour **les deux décors** : la table de correspondance ET le
 * clavier. Sur `hope-hope-hope.fr`, les deux tirets du 6 se convertissent l'un
 * après l'autre ; faire redescendre le clavier puis le remonter entre les deux
 * n'a aucun sens.
 *
 * L'identité d'un décor est celle de son DESSIN (mise en page, colonnes,
 * correspondances ; disposition et mesure pour le clavier) : une méthode qui
 * change, c'est un décor qui change, et l'ancien se retire donc bien avant que
 * le nouveau ne monte.
 *
 * ★ **Une étape sans décor ne referme pas la série** — si elle ne touche pas à
 * la ligne. Entre les deux tirets du 6, l'assemblage intercale « On isole le
 * troisième morceau » : une simple désignation. Rabattre le clavier pour elle
 * puis le relever aussitôt ferait un clignotement gratuit ; le laisser en
 * place dit la vérité, qui est qu'on ne l'a pas quitté. Seules les étapes
 * **inertes pour la mise en page** peuvent être traversées ainsi
 * (`SANS_LAYOUT` moins `reveal`, qui conclut) : une étape qui déplace,
 * substitue ou regroupe des jetons referme la série, parce que la ligne
 * bouge sous un décor qui, lui, ne suivrait pas.
 *
 * ★ Pourquoi ici. `steps()` est appelé opérateur par opérateur : sur
 * `hope-hope-hope`, les trois groupes sont trois appels distincts, et aucun ne
 * peut savoir que le suivant montrera la même grille. Seul l'assemblage le
 * voit. Corollaire assumé : les deux étapes qui portent les drapeaux (la
 * première et la dernière de la série) cessent d'être alpha-équivalentes aux
 * autres, et perdent donc l'accélération des redites — elles font en effet
 * quelque chose de plus, et ce n'est pas une redite de ne rien montrer de neuf.
 *
 * @param {Array} steps — modifié en place
 */
/** Étapes qu'une série de décor peut traverser sans se refermer. */
const TRAVERSABLES = new Set(['highlight', 'dim', 'pulse', 'annotate', 'wait']);

function mutualiserDecor(steps) {
  const cleDecor = (s) => {
    if (!s || !Array.isArray(s.ops) || s.ops.length !== 1) return null;
    const o = s.ops[0];
    if (o && o.op === 'table') {
      return JSON.stringify(['table',
        o.disposition || 'reglette', o.colonnes ?? null, o.ordre ?? null,
        o.cycle ?? null, o.teinte ?? null,
        (o.entries || []).map((e) => [e.char, e.value, e.note ?? '', e.label ?? '']),
      ]);
    }
    if (o && o.op === 'keyboard') {
      // Le dessin du clavier, et lui seul : la touche éclairée change à chaque
      // caractère, le CLAVIER ne change pas.
      return JSON.stringify(['keyboard', o.layout || 'azerty', o.mesure || 'touche']);
    }
    return null;
  };
  const traversable = (s) => s && Array.isArray(s.ops) && s.ops.length > 0
    && s.ops.every((o) => o && TRAVERSABLES.has(o.op));

  let i = 0;
  while (i < steps.length) {
    const cle = cleDecor(steps[i]);
    if (cle === null) { i++; continue; }
    // La série s'étend tant qu'on retrouve le même décor, en sautant par-dessus
    // les étapes inertes — mais elle se TERMINE sur une étape à décor, jamais
    // sur une traversée : sinon le drapeau `retire` tomberait dans le vide.
    const membres = [i];
    let j = i + 1;
    let enAttente = [];
    while (j < steps.length) {
      const c = cleDecor(steps[j]);
      if (c === cle) { membres.push(j); enAttente = []; j++; continue; }
      if (c === null && traversable(steps[j])) { enAttente.push(j); j++; continue; }
      break;
    }
    const dernier = membres[membres.length - 1];
    for (const k of membres) {
      steps[k].ops[0].montre = k === i;
      steps[k].ops[0].retire = k === dernier;
    }
    i = dernier + 1;
  }
}

/**
 * Récolte les 6 d'un vecteur final et fait tomber le reste — le geste propre au
 * mode GROUPEMENT (`assemblage.js`).
 *
 * Rend la liste des jetons à révéler (un multiple de trois), ou `null` si le
 * chemin ne finit pas sur un vecteur à trois 6 — auquel cas l'appelant reprend
 * son cours ordinaire.
 *
 * ── En mode MOISSON, la récolte est TOTALE. ────────────────────────────────
 * Le GROUPEMENT tire ses séries d'un seul vecteur : quatre 6 y font une série
 * de trois, et le quatrième tombe avec le reste. La MOISSON, elle, additionne
 * ce que rapportent plusieurs portées — les quatre 6 de `hope` ne valent une
 * série qu'accompagnés du 6 du tiret voisin. Ne garder que trois 6 par portée y
 * reviendrait à jeter le quart de la récolte avant même de l'avoir comptée : le
 * verdict annonçait « 666 666 666 666 666 » et la scène ne révélait que douze
 * chiffres. On garde donc TOUS les 6, et c'est l'appelant qui, une fois toutes
 * les portées passées, rogne l'appoint qui ne fait pas trois.
 *
 * ── Et le tri se fait EN UNE FOIS, juste avant le verdict. ────────────────
 * « On ne garde que les 6 » ne devrait jamais servir ailleurs qu'en avant-
 * dernière étape (l'auteur). La raison est de crédibilité, pas de rythme : une
 * démonstration qui trie quatre fois en cours de route montre quatre fois
 * qu'elle savait d'avance ce qu'elle cherchait. Le GROUPEMENT n'a qu'un vecteur
 * et triait déjà là ; la MOISSON en a un par portée et triait après chacune.
 * Elle DIFFÈRE donc : chaque portée dit ce qu'elle garde et ce qu'elle laisse,
 * personne ne le montre encore, et un seul geste final ramasse les 6 de toutes
 * les portées — l'appoint qui ne fait pas trois compris. Mesuré sur
 * `https://hope-hope-hope.fr/` en gématrie anglaise : quatre étapes de tri plus
 * une d'appoint deviennent **une**.
 *
 * @param {{courants:Array<string[]>}} groupe
 * @param {Object} chemin
 * @param {Function} poser  `poserBloc`, pour émettre l'étape de tri
 * @param {'fr'|'en'} langue
 * @param {boolean} [tous]  garder tous les 6, et pas seulement un multiple de 3
 * @param {string[]} [differe]  s'il est fourni : on n'émet RIEN, on y accumule
 *   ce qui est à jeter, et l'appelant s'en charge d'un seul geste à la fin
 * @returns {string[]|null}
 */
function recolterLesSix(groupe, chemin, poser, langue, tous = false, differe = null) {
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin) return null;
  // Une portée qui finit sur un nombre unique n'a rien à trier : son 6 est déjà
  // seul à l'écran. Le cas n'existe qu'en moisson (un tiret, un `fr`).
  if (fin.type === 'NUM') {
    if (!tous || fin.valeur !== 6) return null;
    const id = (groupe.courants[0] || [])[0] || null;
    return id ? [id] : null;
  }
  // Les 6 retenus sont ceux qu'a désignés `assemblage.js` : la scène ne
  // recalcule pas le découpage, elle le MONTRE. Deux comptes de séries qui
  // divergeraient donneraient un verdict « 666 666 » sur quatre jetons révélés.
  const serie = tous ? sixDuChemin(chemin) : serieDeSix(chemin);
  if (!serie) return null;
  const gardes = serie.indices;
  const premierDe = (k) => (groupe.courants[k] || [])[0] || null;
  const aGarder = gardes.map(premierDe);
  // Le vecteur et les jetons de scène doivent se correspondre un pour un ; si
  // l'opérateur a rendu autre chose, on ne bricole pas — on laisse le rendu
  // ordinaire faire ce qu'il peut.
  if (aGarder.some((x) => !x) || groupe.courants.length !== fin.valeur.length) return null;

  const set = new Set(gardes);
  const aJeter = [];
  for (let i = 0; i < groupe.courants.length; i++) {
    if (set.has(i)) continue;
    const id = premierDe(i);
    if (id) aJeter.push(id);
  }
  if (aJeter.length) {
    if (differe) differe.push(...aJeter);
    else {
      // `tous` (la moisson) passe toujours par `differe` : on n'arrive ici que
      // pour un GROUPEMENT, dont la récolte est déjà la dernière étape avant le
      // verdict — c'est-à-dire la seule place que l'auteur lui reconnaît.
      poser({
        titre: MOTS.recolter[langue],
        legende: MOTS.recolterLegende(serie.series, aJeter.length, langue),
        ops: [
          { op: 'highlight', targets: aGarder, mode: 'select' },
          { op: 'drop', targets: aJeter, mode: 'fall', at: 350 },
          { op: 'move', at: 700 },
        ],
      });
    }
  }
  groupe.courants = gardes.map((k) => groupe.courants[k]);
  return aGarder;
}

export function construireScenario(approche, ctx = {}) {
  const saisie = String(ctx.saisie ?? approche.saisie ?? '').normalize('NFC');
  const langue = ctx.langue === 'en' ? 'en' : LANGUE_DEFAUT;
  const alloc = creerAllocateur();
  const avertissements = [];

  // Les parts identiques (joker) ne sont rendues qu'une fois : les tokens d'un
  // fragment ne peuvent pas être consommés trois fois — un id supprimé n'est
  // jamais réutilisé (invariant 4).
  //
  // ⚠️ La clé porte la PORTÉE **et** le PROGRAMME. Avec la portée seule, une
  // CONVERGENCE — la même chaîne lue de trois manières différentes — s'effondrait
  // sur sa première part : la scène montrait un calcul, puis recopiait son 6 en
  // trois exemplaires. C'est-à-dire qu'elle DÉCRÉTAIT à l'écran ce que
  // l'assemblage venait justement de démontrer trois fois. Le décret n'a pas à
  // rentrer par la porte du rendu après avoir été chassé par celle du moteur.
  // La MOISSON se reconnaît à sa GÉOMÉTRIE — des portées disjointes qui
  // rapportent ensemble au moins deux séries —, jamais au champ `mode` posé sur
  // l'approche : `scenarioDe` reçoit aussi bien une approche de la liste qu'une
  // approche rejouée depuis une URL, et les deux doivent montrer la même scène.
  const recolteTotale = compterMoisson(approche.parts);
  const moisson = Boolean(recolteTotale);

  const partsUniques = [];
  const vues = new Set();
  for (const p of approche.parts) {
    const portee = p.fragment ? p.fragment.intervalles.map((iv) => iv.join('.')).join('|') : '';
    const cle = portee + '' + p.chemin.ops.map((o) => o.code).join('+');
    if (vues.has(cle)) continue;
    vues.add(cle);
    partsUniques.push(p);
  }
  const repete = partsUniques.length < approche.parts.length;

  // CONVERGENCE : plusieurs parts sur EXACTEMENT la même portée. Il n'y a qu'un
  // jeu de jetons pour trois lectures, et le premier calcul les consommerait
  // tous. On les recopie donc d'abord — un geste montré, pas un escamotage —
  // puis chaque copie suit sa méthode.
  const porteeDe = (p) => (p.fragment ? p.fragment.intervalles.map((iv) => iv.join('.')).join('|') : '');
  const convergente = partsUniques.length > 1
    && new Set(partsUniques.map(porteeDe)).size === 1;

  // Chaque caractère de la saisie est un token, étiqueté du groupe de la part
  // qui l'exploite. Le groupe permet d'atténuer le hors-fragment par sélecteur
  // `{groupNot}` — qui ne retient que les tokens VIVANTS, contrairement à une
  // liste d'ids figée qui pointerait des tokens déjà consommés.
  const groupeDe = new Array(saisie.length).fill(null);
  partsUniques.forEach((part, i) => {
    // Sur une convergence, les trois parts couvrent les mêmes positions : le
    // tag de groupe irait au dernier arrivé et les sélecteurs `{group}` se
    // tromperaient de cible. Les copies porteront leurs ids en clair.
    if (convergente && i > 0) return;
    for (const pos of positionsDe(part.fragment, saisie.length)) groupeDe[pos] = `p${i}`;
  });
  const tokens = [...saisie].map((c, i) => {
    const id = `t${i}`;
    alloc.reserver(id);
    const t = { id, text: c, kind: genreDe(c) };
    if (groupeDe[i]) t.group = groupeDe[i];
    return t;
  });
  const idsParPosition = tokens.map((t) => t.id);

  const steps = [];
  const resultats = [];
  // Ce que les portées d'une moisson écartent, en attendant le geste unique qui
  // le montrera juste avant le verdict (voir `recolterLesSix`).
  const rejets = [];
  let nStep = 0;
  let nCle = 0; // préfixe unique offert aux opérateurs pour nommer leurs tokens
  const nouvelleEtape = (titre, legende, ops, options) => {
    if (!ops || !ops.length) return null;
    // `hold` = le temps d'arrêt AVANT la charnière de fin, pour laisser lire ce
    // que l'étape vient de produire. Par défaut la charnière ordinaire ; le
    // verdict en demande davantage (voir plus bas).
    const hold = options && Number.isFinite(options.hold) ? options.hold : DUREE_CHARNIERE;
    const s = { id: `s${nStep++}`, title: titre, ops, hold };
    if (legende) s.caption = legende;
    steps.push(s);
    return s;
  };

  /**
   * Un passage `avant → apres` d'un groupe, ramené à des blocs comparables
   * `{titre, legende, ops}` — que les steps viennent du catalogue ou du rendu
   * générique. C'est cette forme commune qui rend la mise en parallèle possible.
   */
  const produire = (op, avant, apres, courants) => {
    const titreOp = dire(op.libelle, langue) || op.id;
    const emis = typeof op.steps === 'function'
      ? essayerCatalogue(op, avant, apres, courants, alloc, avertissements, `x${nCle++}`, langue)
      : null;
    if (emis) {
      return {
        blocs: emis.steps.map((st) => ({
          titre: st.title || titreOp,
          legende: st.caption ?? null,
          // La FIGURE d'un step — le petit afficheur sept segments du Registre.
          // Elle voyage avec le libellé : c'est de l'équivalent accessible, pas
          // du geste (CONTRACTS §6). Voir `figureSeg7` dans `mappeurs.js`.
          figure: st.figure ?? null,
          ops: st.ops,
          hold: st.hold,
        })),
        courants: emis.courants,
      };
    }
    const g = emettreGenerique(op, avant, apres, courants, alloc, langue);
    if (!g) {
      throw new ErreurRendu(
        `« ${titreOp} » (${op.code}) transforme ${elementsDe(avant).length} élément(s) `
        + `en ${elementsDe(apres).length} : aucune primitive du vocabulaire fermé ne sait le montrer. `
        + 'Cet opérateur doit fournir son propre steps(), ou le moteur visuel doit gagner la primitive '
        + 'correspondante (CONTRACTS §3.1).',
        op,
      );
    }
    return { blocs: g.blocs.map((b) => ({ ...b, hold: undefined })), courants: g.courants };
  };

  const poserBloc = (b, suffixe = '') => {
    if (!b.ops || !b.ops.length) return null;
    const st = { id: `s${nStep++}`, title: b.titre + suffixe, ops: b.ops, hold: b.hold === undefined ? DUREE_CHARNIERE : b.hold };
    if (b.legende) st.caption = b.legende;
    if (b.figure) st.figure = b.figure;
    steps.push(st);
    return st;
  };

  // ── Le découpage en sous-groupes ──────────────────────────────────────────
  // Quand la saisie porte plusieurs morceaux — `hope-hope-hope`, typiquement —
  // le tout premier geste est de MONTRER le découpage : trois accolades
  // numérotées, tracées ensemble. Sans lui, la démonstration passait du premier
  // morceau au deuxième sans jamais dire qu'il y en avait trois, ni qu'ils
  // étaient comparables — alors que c'est la promesse du README.
  const groupes = partsUniques.map((part, i) => ({
    part,
    tag: `p${i}`,
    positions: positionsDe(part.fragment, saisie.length),
    courants: positionsDe(part.fragment, saisie.length).map((k) => [idsParPosition[k]]),
  }));
  const horsGroupe = idsParPosition.filter((_, i) => groupeDe[i] === null);

  // ── La RECOPIE de la convergence ──────────────────────────────────────────
  //
  // Trois lectures d'une même chaîne réclament trois jeux de jetons. On les
  // fabrique en un geste visible : chaque signe est remplacé par autant de
  // copies qu'il y a de lectures, puis un `move` les remet dans l'ordre — les
  // copies interfoliées `h h h o o o…` redeviennent `hope hope hope`.
  //
  // Ce n'est PAS le décret qu'on vient de supprimer : là, un seul 6 était
  // recopié à l'arrivée sans avoir été calculé ; ici, c'est la chaîne DE DÉPART
  // qu'on recopie, et les trois 6 sont ensuite gagnés séparément.
  if (convergente) {
    const positions = groupes[0].positions;
    const copies = positions.map(() => []);
    const paires = positions.map((pos, k) => {
      const source = idsParPosition[pos];
      const trio = groupes.map(() => ({
        id: alloc.nouvel('d'), text: saisie[pos], kind: genreDe(saisie[pos]),
      }));
      copies[k] = trio;
      return { target: source, to: trio };
    });
    // L'ordre final : une copie complète de la chaîne par groupe, à la suite.
    const ordre = [];
    groupes.forEach((_, i) => { for (const trio of copies) ordre.push(trio[i].id); });
    // Deux étapes, et non deux ops dans une : `substitute` translate déjà les
    // copies pour les écarter, et un `move` dans la même étape animerait le même
    // `translate` sur le même token — le compilateur du moteur visuel le
    // signale comme « animations concurrentes » (§2.4, contrainte 4).
    poserBloc({
      titre: MOTS.recopier(groupes.length, langue),
      legende: MOTS.recopierLegende(groupes.length, langue),
      ops: [{ op: 'substitute', pairs: paires, stagger: 80 }],
    });
    poserBloc({
      titre: MOTS.ranger(groupes.length, langue),
      legende: null,
      ops: [{ op: 'move', order: ordre }],
    });
    groupes.forEach((g, i) => { g.courants = copies.map((trio) => [trio[i].id]); });
  }

  // La même méthode pour tous ? C'est à cette condition qu'on peut l'appliquer
  // à chaque groupe EN MÊME TEMPS plutôt que l'un après l'autre.
  const memeMethode = groupes.length > 1
    && groupes.every((g) => signatureChemin(g.part.chemin) === signatureChemin(groupes[0].part.chemin));

  if (groupes.length > 1 && !convergente) {
    poserBloc({
      titre: MOTS.decouper[langue],
      legende: memeMethode ? MOTS.decouperLegende[langue] : null,
      ops: [
        {
          op: 'partition',
          groups: groupes.map((g, i) => ({
            targets: g.positions.map((k) => idsParPosition[k]),
            tag: g.tag,
            label: MOTS.groupe(i + 1, langue),
          })),
        },
        horsGroupe.length ? { op: 'dim', targets: horsGroupe, at: 1500 } : null,
      ].filter(Boolean),
    });
  }

  if (memeMethode) {
    // ── En parallèle : un seul geste pour les trois groupes ────────────────
    const nbOps = groupes[0].part.chemin.ops.length;
    for (let i = 0; i < nbOps; i++) {
      const rendus = groupes.map((g) => {
        const chemin = g.part.chemin;
        const avant = chemin.etats[i];
        const apres = chemin.etats[i + 1];
        if (rienAMontrer(avant, apres)) return null; // le spectateur verrait la même chose
        return produire(chemin.ops[i], avant, apres, g.courants);
      });
      const actifs = rendus.filter(Boolean);
      if (!actifs.length) continue;

      // Fusionnable ? Alors la transformation s'applique à chaque groupe
      // SIMULTANÉMENT — c'est littéralement « trois d'affilée, selon la même
      // méthode ». Sinon (une somme par groupe, une accolade par groupe, une
      // caméra par groupe), on les enchaîne, groupe après groupe : la règle
      // reste la même, elle se répète sous les yeux.
      const fusionnes = actifs.length === groupes.length ? fusionnerBlocs(actifs.map((r) => r.blocs)) : null;
      if (fusionnes) {
        for (const b of fusionnes) poserBloc(b);
      } else {
        actifs.forEach((r, k) => {
          const suffixe = actifs.length > 1 ? MOTS.suffixeGroupe(k + 1, langue) : '';
          for (const b of r.blocs) poserBloc(b, suffixe);
        });
      }
      rendus.forEach((r, k) => { if (r) groupes[k].courants = r.courants; });
    }
    for (const g of groupes) {
      // Une moisson dont toutes les portées se lisent de la même façon passe
      // par ici — trois `hope` en quatorze segments, douze 6 d'un seul geste.
      // Sans récolte, la scène n'en révélait qu'un par groupe.
      const recolte = moisson
        ? recolterLesSix(g, g.part.chemin, poserBloc, langue, true, rejets)
        : null;
      if (recolte) { resultats.push(...recolte); continue; }
      const dernier = g.courants.flat()[0];
      if (dernier) resultats.push(dernier);
    }
  } else {
    // ── L'un après l'autre : les méthodes diffèrent d'un morceau à l'autre ──
    for (const g of groupes) {
      const indexPart = groupes.indexOf(g);
      // Isolation du fragment (inutile s'il couvre déjà toute la saisie, et
      // inutile aussi si le découpage vient de la montrer).
      if (groupes.length === 1 && g.positions.length && g.positions.length < saisie.length) {
        poserBloc({
          titre: MOTS.isolerPassage[langue],
          legende: g.part.fragment ? citer(g.part.fragment.texte, langue) : null,
          ops: [
            { op: 'highlight', targets: { group: g.tag }, mode: 'select' },
            { op: 'dim', targets: { groupNot: g.tag }, at: 200 },
          ],
        });
      } else if (groupes.length > 1) {
        // Sur une convergence, les copies n'ont pas de tag de groupe (elles
        // naissent en cours de scène) : on désigne leurs ids en clair.
        const cibles = convergente ? g.courants.flat() : { group: g.tag };
        poserBloc({
          titre: convergente
            ? MOTS.lecture(indexPart + 1, langue)
            : MOTS.isolerMorceau(indexPart + 1, langue),
          legende: g.part.fragment ? citer(g.part.fragment.texte, langue) : null,
          ops: [{ op: 'highlight', targets: cibles, mode: 'select' }],
        });
      }

      const chemin = g.part.chemin;
      for (let i = 0; i < chemin.ops.length; i++) {
        const avant = chemin.etats[i];
        const apres = chemin.etats[i + 1];
        if (rienAMontrer(avant, apres)) continue;
        const r = produire(chemin.ops[i], avant, apres, g.courants);
        for (const b of r.blocs) poserBloc(b);
        g.courants = r.courants;
      }
      // ── Le GROUPEMENT : le calcul ne finit pas sur UN 6, il finit sur un
      //    VECTEUR qui en porte plusieurs. On les garde, on jette le reste, et
      //    ce qui reste s'assemble par trois. Sans cette récolte, le verdict
      //    révélait le premier nombre venu en annonçant « 666 » — c'est-à-dire
      //    qu'il décrétait, ce que ce mode existe précisément pour ne plus faire.
      const recolte = recolterLesSix(g, chemin, poserBloc, langue, moisson, moisson ? rejets : null);
      if (recolte) { resultats.push(...recolte); continue; }
      const dernier = g.courants.flat()[0];
      if (dernier) resultats.push(dernier);
    }
  }

  let finaux = resultats.filter(Boolean);
  if (!finaux.length) throw new ErreurRendu('aucun résultat à révéler', null);

  // ── LA RÉCOLTE de la moisson, en un seul geste et à la toute fin ──────────
  //
  // Deux choses tombent ici, et elles tombent ENSEMBLE :
  //
  //  · ce qu'aucune portée n'a retenu — les valeurs qui ne font pas 6. Chaque
  //    portée l'a mis de côté sans le montrer (`rejets`), précisément pour
  //    qu'on ne trie qu'une fois : trier quatre fois en cours de route montre
  //    quatre fois qu'on savait d'avance ce qu'on cherchait ;
  //  · l'APPOINT — ce qui dépasse le multiple de trois, ou le plafond
  //    `MAX_SERIES`. Quinze 6 font cinq séries pile ; seize en feraient cinq et
  //    un 6 qui traîne. (L'assemblage élague déjà les portées entièrement
  //    surnuméraires ; ce qui subsiste ici est le surplus qui tombe À
  //    L'INTÉRIEUR d'une portée par ailleurs indispensable.)
  //
  // Le nombre de chiffres révélés est ainsi TOUJOURS celui que le verdict
  // annonce, et il l'est d'un seul geste, juste avant lui.
  if (moisson) {
    const garde = recolteTotale.series * SERIE;
    const surplus = finaux.slice(garde);
    finaux = finaux.slice(0, garde);
    const aJeter = [...rejets, ...surplus];
    if (aJeter.length) {
      poserBloc({
        titre: MOTS.recolter[langue],
        legende: MOTS.recolterLegende(recolteTotale.series, aJeter.length, langue),
        ops: [
          { op: 'highlight', targets: finaux, mode: 'select' },
          { op: 'drop', targets: aJeter, mode: 'fall', at: 350 },
          { op: 'move', at: 700 },
        ],
      });
    }
  }

  let aReveler = finaux;
  if (finaux.length === 1 && repete) {
    // Résonance : la même règle vaut pour les trois 6. Le `substitute` à `to`
    // multiple recopie le résultat en trois tokens — les copies naissent au
    // même point et le layout les écarte.
    const source = finaux[0];
    const copies = [0, 1, 2].map(() => ({ id: alloc.nouvel('x'), text: '6', kind: 'number' }));
    nouvelleEtape(MOTS.resonance[langue], MOTS.resonanceLegende[langue],
      [{ op: 'substitute', pairs: [{ target: source, to: copies }], stagger: 140 }]);
    aReveler = copies.map((c) => c.id);
  }

  if (aReveler.length > 1) {
    // Pas de `move` ici : `reveal` efface lui-même les jetons écartés et laisse
    // le layout recentrer ce qui reste. Un `move ... to: 'front'` ne ferait plus
    // que tirer les chiffres vers la gauche pendant une demi-seconde, avant que
    // `reveal` ne défasse ce déplacement.
    // Le `hold` donne à la chute le temps d'exister : sans lui, le 666 atteint
    // sa taille pleine à la dernière milliseconde de la timeline, et le lecteur
    // s'arrête dessus au moment même où il finit de grandir.
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || '666', [
      { op: 'reveal', targets: aReveler, at: 250, stagger: 150 },
    ], { hold: 1200 });
  } else {
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || '666', [
      { op: 'reveal', targets: aReveler },
      { op: 'annotate', anchor: aReveler, text: ctx.resultat || '666', place: 'below', at: 400 },
    ]);
  }

  // ★ Le DÉCOR des tables se mutualise ici, et nulle part ailleurs : c'est le
  //   seul endroit qui voit la suite complète des étapes. Un opérateur ne
  //   connaît que les siennes.
  mutualiserDecor(steps);

  const scenario = {
    version: 1,
    input: saisie,
    method: {
      id: ctx.methode && ctx.methode.id !== undefined ? ctx.methode.id : (approche.rang ?? 1),
      label: (ctx.methode && ctx.methode.label) || titreApproche(approche, langue),
      rule: (ctx.methode && ctx.methode.rule) || regleApproche(approche, langue),
    },
    result: ctx.resultat || '666',
    tokens,
    steps,
  };
  if (avertissements.length) scenario.avertissements = avertissements;

  const violations = validerScenario(scenario);
  if (violations.length) {
    const e = new ErreurRendu('scénario invalide : ' + violations.join(' ; '), null);
    e.violations = violations;
    throw e;
  }
  return scenario;
}

/** Le vocabulaire fermé ne sait pas montrer cette transformation. */
export class ErreurRendu extends Error {
  constructor(message, op) {
    super(message);
    this.name = 'ErreurRendu';
    this.op = op ? { id: op.id, code: op.code } : null;
  }
}

/**
 * Formes de paramètres exigées par les primitives de `src/visuel/primitives/`.
 * Le vocabulaire est fermé, mais chaque primitive a ses paramètres : un `op`
 * bien nommé mais mal paramétré échouerait à la compilation, côté visuel, au
 * moment où l'utilisateur clique. On le rattrape ici.
 * @returns {string|null} le grief, ou null si la forme est conforme
 */
export function validerFormeOp(o) {
  const chaine = (x) => typeof x === 'string' && x.length > 0;
  const cibles = (x) => chaine(x) || (Array.isArray(x) && x.length && x.every(chaine))
    || (x && typeof x === 'object' && !Array.isArray(x)
      && ['group', 'groupNot', 'kind', 'all'].some((k) => k in x));
  const tok = (x) => x && typeof x === 'object' && !Array.isArray(x) && chaine(x.id)
    && typeof x.text === 'string' && !x.id.startsWith('@');

  switch (o.op) {
    case 'highlight': case 'dim': case 'drop': case 'pulse': case 'reveal': case 'group':
      return cibles(o.targets) ? null : '« targets » manquant ou mal formé';
    case 'move':
      // Sans cible ni ordre, `move` est un simple recalcul du flux — c'est la
      // forme qu'emploie le second temps d'un filtre (« on rapproche ce qui
      // reste »), où l'ordre n'a pas changé, seuls les trous se referment.
      if (o.order === undefined && o.targets === undefined) return null;
      return (Array.isArray(o.order) && o.order.every(chaine)) || cibles(o.targets)
        ? ((o.to === undefined || o.to === 'front' || o.to === 'back') ? null : '« to » doit valoir « front » ou « back »')
        : '« targets » ou « order » manquant';
    case 'partition': {
      if (!Array.isArray(o.groups) || o.groups.length < 2) return '« groups » doit lister au moins deux groupes';
      for (const g of o.groups) {
        if (!g || typeof g !== 'object' || !cibles(g.targets)) return '« groups[].targets » manquant ou mal formé';
      }
      return null;
    }
    case 'table': {
      // La table dessinée est celle de l'opérateur : sans `entries` (ou sans
      // `ordre`, la réglette alphabétique que le moteur visuel sait
      // recalculer), il n'y a rien à MONTRER — et une conversion qu'on ne
      // montre pas est une affirmation (CONTRACTS §0.3).
      const aTable = o.ordre !== undefined
        || (Array.isArray(o.entries) && o.entries.length
          && o.entries.every((e) => e && typeof e === 'object'
            && chaine(e.char) && e.value !== undefined && e.value !== null));
      if (!aTable) return '« entries » doit lister les correspondances {char, value}, ou « ordre » la réglette alphabétique';
      // Trois mises en page, et chacune dit quelque chose : la réglette (une
      // case = une lettre + sa valeur), la GLISSIÈRE (deux réglettes alignées,
      // celle du bas étant celle du haut déplacée — les chiffrements par
      // substitution) et le pavé, seul endroit où une case porte plusieurs
      // lettres parce que la touche 7 porte vraiment « PQRS ».
      if (o.disposition !== undefined && !['reglette', 'glissiere', 'pave'].includes(o.disposition)) {
        return '« disposition » doit valoir reglette, glissiere ou pave';
      }
      if (o.teinte !== undefined && o.teinte !== 'valeur') return '« teinte » doit valoir valeur';
      if (o.cycle !== undefined && typeof o.cycle !== 'boolean') return '« cycle » doit être un booléen';
      if (!chaine(o.target)) return '« target » manquant';
      // Le décor se mutualise d'une étape à l'autre : deux drapeaux, deux
      // booléens, rien de plus.
      for (const k of ['montre', 'retire']) {
        if (o[k] !== undefined && typeof o[k] !== 'boolean') return `« ${k} » doit être un booléen`;
      }
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    }
    case 'substitute': {
      if (!Array.isArray(o.pairs) || !o.pairs.length) return '« pairs » manquant';
      for (const p of o.pairs) {
        const source = chaine(p.target) || (Array.isArray(p.targets) && p.targets.length === 1 && chaine(p.targets[0]));
        if (!source) return '« pairs[].target » doit désigner UN seul token de départ';
        const arrivees = Array.isArray(p.to) ? p.to : [p.to];
        if (!arrivees.length || !arrivees.every(tok)) return '« pairs[].to » doit être {id, text} ou une liste de {id, text}';
      }
      return null;
    }
    case 'sum':
      if (!cibles(o.targets)) return '« targets » manquant';
      return tok(o.to) ? null : '« to » doit être {id, text}';
    case 'reduce':
      if (!chaine(o.target)) return '« target » manquant';
      if (!Array.isArray(o.digits) || o.digits.length < 2 || !o.digits.every(tok)) return '« digits » doit lister au moins deux {id, text}';
      return tok(o.to) ? null : '« to » doit être {id, text}';
    case 'insertOperators': {
      if (!Array.isArray(o.between) || o.between.length < 2 || !o.between.every(chaine)) return '« between » doit lister au moins deux identifiants';
      const n = o.between.length - 1;
      if (o.glyphs !== undefined
        && !(Array.isArray(o.glyphs) && o.glyphs.length === n && o.glyphs.every(chaine))) {
        return `« glyphs », s'il est fourni, doit contenir exactement ${n} signe(s), un par interstice`;
      }
      if (o.ids === undefined) return null; // le moteur visuel les nomme lui-même
      return Array.isArray(o.ids) && o.ids.length === n && o.ids.every(chaine)
        ? null : `« ids », s'il est fourni, doit contenir exactement ${n} identifiant(s)`;
    }
    case 'keyboard':
      if (!chaine(o.target)) return '« target » manquant';
      // Le décor se mutualise d'une étape à l'autre, comme celui de la table :
      // deux drapeaux, deux booléens, rien de plus.
      for (const k of ['montre', 'retire']) {
        if (o[k] !== undefined && typeof o[k] !== 'boolean') return `« ${k} » doit être un booléen`;
      }
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    case 'horns': {
      // Trois cibles, pas deux, pas quatre : 666 fait trois 6. Et `efface` est
      // une liste d'identifiants, éventuellement vide (rien à effacer autour
      // d'un 666 qui occupe déjà toute la ligne).
      if (!Array.isArray(o.targets) || o.targets.length !== 3 || !o.targets.every(chaine)) {
        return '« targets » doit désigner exactement les trois 6 du 666';
      }
      if (o.efface !== undefined && !(Array.isArray(o.efface) && o.efface.every(chaine))) {
        return '« efface » doit lister des identifiants de jetons';
      }
      return null;
    }
    case 'flip180': case 'countStrokes':
      if (!chaine(o.target)) return '« target » manquant';
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    case 'sevenSeg':
      if (!chaine(o.target)) return '« target » manquant';
      if (typeof o.segments !== 'string' || !/^[a-g]+$/.test(o.segments)) return '« segments » doit être une chaîne de a à g';
      return null;
    case 'fourteenSeg': {
      // Quatorze segments : `segments` est un TABLEAU de noms, parce que deux
      // d'entre eux font deux caractères (`g1`, `g2`). Voir
      // `src/visuel/primitives/fourteenSeg.js` et `tables/seg14.js`.
      if (!chaine(o.target)) return '« target » manquant';
      const connus = ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm'];
      if (!Array.isArray(o.segments) || !o.segments.length
        || !o.segments.every((x) => connus.includes(x))
        || new Set(o.segments).size !== o.segments.length) {
        return `« segments » doit être un tableau de segments allumés, sans doublon, parmi ${connus.join(', ')}`;
      }
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    }
    case 'annotate':
      return typeof o.text === 'string' && o.text.trim() ? null : '« text » non vide obligatoire';
    case 'wait':
      return null;
    default:
      return `op « ${o.op} » hors vocabulaire`;
  }
}

/**
 * Vérifie que ce qui sera AFFICHÉ est ce qui est calculé — le moteur visuel
 * « refuse d'afficher un calcul faux » et échoue à la compilation, c'est-à-dire
 * au clic de l'utilisateur. On le rattrape ici, où l'on connaît encore les
 * valeurs de l'état d'entrée.
 * @returns {string|null}
 */
function validerArithmetiqueOp(o, ctxOp) {
  /** Le pliage d'`apply()` : sans accent, en capitale. */
  const plier = (c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const valeurDe = (id) => {
    const i = ctxOp.ids.indexOf(id);
    return i < 0 ? null : ctxOp.elements[i];
  };
  if (o.op === 'sum' && Array.isArray(o.targets) && o.to) {
    const textes = o.targets.map(valeurDe);
    if (textes.some((t) => t === null)) return null; // opérandes créés par l'op : non vérifiable ici
    const nombres = textes.map(Number);
    if (nombres.some((n) => !Number.isFinite(n))) {
      return `« sum » porte sur « ${textes.find((t) => !Number.isFinite(Number(t)))} », qui n'est pas un nombre`;
    }
    const attendu = Array.isArray(o.partials) && o.partials.length
      ? o.partials[o.partials.length - 1]
      : nombres.reduce((a, b) => a + b, 0);
    if (String(attendu) !== String(o.to.text)) {
      return `« sum » afficherait ${attendu} alors que « to.text » annonce « ${o.to.text} »`;
    }
  }
  if (o.op === 'flip180' && o.to) {
    // ★ Le demi-tour ne vaut que du 9 vers le 6. `src/visuel/primitives/
    // flip180.js` le refuse déjà, mais il ne le refuse qu'AU CLIC : on le
    // rattrape ici, où l'on connaît encore la valeur du jeton de départ, et où
    // un opérateur du catalogue qui se tromperait retombe sur le rendu
    // générique avec un avertissement plutôt que de faire échouer la page.
    const source = valeurDe(o.target);
    if (source !== null && String(source) !== '9') {
      return `« flip180 » retournerait « ${source} » : seul un 9 se retourne en 6`;
    }
    if (String(o.to.text) !== '6') {
      return `« flip180 » afficherait « ${o.to.text} » : un 9 retourné donne 6, et rien d'autre`;
    }
  }
  if (o.op === 'horns') {
    // ★ Deuxième verrou du contrôle croisé des cornes (le premier est dans
    // `transformations/mappeurs.js`, le troisième dans
    // `src/visuel/primitives/horns.js`). Celui-ci est le seul à voir ENCORE la
    // valeur des jetons de départ ET leur ordre dans la ligne : on vérifie donc
    // ici les deux choses que la primitive vérifiera sur la scène — trois 6, et
    // trois rangs consécutifs. Un opérateur qui se tromperait retombe alors sur
    // le rendu générique avec un avertissement, plutôt que de faire échouer la
    // page au clic de l'utilisateur.
    const rangs = o.targets.map((id) => ctxOp.ids.indexOf(id));
    if (rangs.some((r) => r < 0)) {
      return '« horns » couronnerait un jeton absent de la ligne';
    }
    const textes = rangs.map((r) => String(ctxOp.elements[r]));
    if (!textes.every((t) => t === '6')) {
      return `« horns » couronnerait « ${textes.join(' ')} » : seuls trois 6 font un 666`;
    }
    if (rangs[1] !== rangs[0] + 1 || rangs[2] !== rangs[1] + 1) {
      return `« horns » couronnerait les rangs ${rangs.join(', ')}, qui ne se touchent pas : `
        + 'trois 6 dispersés ne sont pas un 666 trouvé';
    }
  }
  if (o.op === 'table') {
    // ★ La table AFFICHÉE est-elle celle qui a servi ? Le moteur visuel refuse
    // déjà de faire redescendre une valeur qui n'est pas dans la case ; on le
    // rattrape ici, où l'on connaît encore le jeton de départ — et où l'on peut
    // donc vérifier la troisième chose, celle qu'aucun des deux ne voit seul :
    // que la lettre envoyée dans la table est bien celle qui est à l'écran.
    const table = new Map();
    for (const e of o.entries || []) table.set(String(e.char).toUpperCase(), String(e.value));
    const source = valeurDe(o.target);
    const lettre = String(o.letter ?? source ?? '').toUpperCase();
    if (source !== null && o.letter !== undefined && plier(String(source)) !== lettre) {
      return `« table » enverrait « ${lettre} » dans la table alors que la ligne porte « ${source} »`;
    }
    if (o.to && table.size) {
      const montre = table.get(lettre);
      if (montre === undefined) {
        return `« table » n'a pas de case pour « ${lettre} » : la conversion serait affirmée, pas montrée`;
      }
      // ★ À la casse près, et à la casse près SEULEMENT. La valeur d'une case
      // peut être une LETTRE (Atbash, César) : la réglette est écrite en
      // capitales, la ligne garde sa casse — « h » en redescend « s » là où la
      // case porte « S ». C'est le pliage qu'appliquent `atbash` et `cesar`
      // eux-mêmes. Les tables lettre → nombre ne bougent pas d'un pouce : un
      // nombre n'a pas de casse.
      if (montre.toUpperCase() !== String(o.to.text).toUpperCase()) {
        return `« table » montre « ${lettre} = ${montre} » alors que « to.text » annonce « ${o.to.text} »`;
      }
    }
  }
  if (o.op === 'reduce' && Array.isArray(o.digits) && o.to) {
    const source = valeurDe(o.target);
    const joint = o.digits.map((d) => d.text).join('');
    if (source !== null && joint !== source) {
      return `« reduce » éclate « ${source} » en « ${joint} » : les chiffres ne reconstituent pas le nombre`;
    }
    const somme = o.digits.reduce((a, d) => a + Number(d.text), 0);
    if (String(somme) !== String(o.to.text)) {
      return `« reduce » afficherait ${somme} alors que « to.text » annonce « ${o.to.text} »`;
    }
  }
  return null;
}

/**
 * Tente d'employer les `Step[]` de l'opérateur.
 *
 * Contrat effectif du catalogue (`src/moteur/catalogue.js`) :
 *   `op.steps(avant, apres, {ids, cle})`  → Step[]
 *   `op.sortie(avant, apres, {ids, cle})` → ids des tokens représentant `apres`
 * `cle` est un préfixe UNIQUE dans tout le scénario : l'opérateur en dérive les
 * identifiants des tokens qu'il crée, et deux étapes ne doivent jamais le
 * partager (invariant 4 : un id créé n'est jamais recréé).
 *
 * Les steps ne sont retenus que s'ils sont conformes au vocabulaire ET à la
 * forme attendue par les primitives visuelles. Sinon on retombe sur le rendu
 * générique et on le signale : mieux vaut une démonstration plus sobre qu'une
 * page qui échoue au clic.
 */
function essayerCatalogue(op, avant, apres, courants, alloc, avertissements, cle, langue = LANGUE_DEFAUT) {
  const ctxOp = {
    ids: courants.map((c) => c[0]),
    cle,
    langue,
    groupes: courants,
    elements: elementsDe(avant),
    cibles: elementsDe(apres),
    nouvelId: (p) => alloc.nouvel(p || 'c'),
    op,
  };

  let bruts;
  try {
    bruts = op.steps(avant, apres, ctxOp);
  } catch (err) {
    avertissements.push(`${op.id} : steps() a levé une exception (${err.message}) — rendu générique`);
    return null;
  }
  if (!Array.isArray(bruts) || !bruts.length) return null;

  const crees = [];
  const supprimes = [];
  for (const s of bruts) {
    if (!s || !Array.isArray(s.ops) || !s.ops.length) {
      avertissements.push(`${op.id} : step sans ops — rendu générique`);
      return null;
    }
    for (const o of s.ops) {
      if (!o || !VOCABULAIRE.has(o.op)) {
        avertissements.push(`${op.id} : op « ${o && o.op} » hors vocabulaire — rendu générique`);
        return null;
      }
      const grief = validerFormeOp(o) || validerArithmetiqueOp(o, ctxOp);
      if (grief) {
        avertissements.push(`${op.id} : op « ${o.op} » — ${grief} (attendu par src/visuel/primitives/${o.op}.js) — rendu générique`);
        return null;
      }
      const inv = inventaire(o);
      for (const id of inv.crees) {
        if (crees.includes(id)) {
          avertissements.push(`${op.id} : id « ${id} » créé deux fois — rendu générique`);
          return null;
        }
        if (!alloc.reserver(id)) {
          avertissements.push(`${op.id} : id « ${id} » déjà employé — rendu générique`);
          return null;
        }
        crees.push(id);
      }
      supprimes.push(...inv.supprimes);
    }
  }

  const attendus = elementsDe(apres).length;
  // `op.sortie()` fait autorité quand l'opérateur la fournit : c'est l'émetteur
  // qui nomme, et lui seul sait quels tokens portent l'état d'arrivée.
  if (typeof op.sortie === 'function') {
    let sortie = null;
    try { sortie = op.sortie(avant, apres, ctxOp); } catch { sortie = null; }
    const disponibles = new Set([...crees, ...ctxOp.ids.filter((id) => !supprimes.includes(id))]);
    const formeOk = Array.isArray(sortie) && sortie.length === attendus
      && sortie.every((id) => typeof id === 'string' && id && !id.startsWith('@'));
    // `sortie()` doit désigner des tokens qui EXISTENT : soit créés par les
    // steps qu'on vient d'accepter, soit déjà vivants en entrée. Un opérateur
    // qui annonce des identifiants que ses propres steps n'ont jamais créés
    // ferait échouer la compilation au clic de l'utilisateur — on le rattrape.
    if (formeOk && sortie.every((id) => disponibles.has(id))) {
      for (const id of sortie) alloc.reserver(id);
      return { steps: bruts, courants: sortie.map((id) => [id]) };
    }
    if (!formeOk) {
      avertissements.push(`${op.id} : sortie() ne rend pas ${attendus} identifiant(s) — rendu générique`);
    } else {
      const fantomes = sortie.filter((id) => !disponibles.has(id));
      avertissements.push(
        `${op.id} : sortie() annonce ${fantomes.slice(0, 3).map((x) => `« ${x} »`).join(', ')}`
        + `${fantomes.length > 3 ? '…' : ''}, que ses steps ne créent pas — rendu générique`,
      );
    }
    return null;
  }

  if (crees.length === attendus) return { steps: bruts, courants: crees.map((id) => [id]) };
  const survivants = courants.flat().filter((id) => !supprimes.includes(id));
  if (!crees.length && survivants.length === attendus) {
    return { steps: bruts, courants: survivants.map((id) => [id]) };
  }
  avertissements.push(
    `${op.id} : ${crees.length} token(s) créé(s) pour ${attendus} élément(s) — rendu générique`,
  );
  return null;
}

function positionsDe(fragment, longueurSaisie) {
  if (!fragment) return rangee(0, longueurSaisie);
  const out = [];
  for (const [d, f] of (fragment.intervalles || [[fragment.offset, fragment.offset + fragment.longueur]])) {
    for (let i = Math.max(0, d); i < Math.min(f, longueurSaisie); i++) out.push(i);
  }
  return out;
}

function ordinal(n) {
  return n === 1 ? 'premier' : n === 2 ? 'deuxième' : n === 3 ? 'troisième' : `${n}ᵉ`;
}

function ordinalEn(n) {
  const suffixe = n % 10 === 1 && n % 100 !== 11 ? 'st'
    : n % 10 === 2 && n % 100 !== 12 ? 'nd'
      : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${suffixe}`;
}

/**
 * Les guillemets ne sont pas les mêmes des deux côtés de la Manche — et c'est
 * la même règle que `src/app/typo.js → guillemets()` : chevrons et espaces
 * fines insécables (U+202F) en français, guillemets DROITS en anglais. Deux
 * typographies pour une même chaîne selon qu'elle vient du scénario ou de
 * l'interface se verrait immédiatement.
 */
const FINE = '\u202f'; // espace fine insécable
function citer(texte, langue) {
  return langue === 'en' ? `"${texte}"` : `«${FINE}${texte}${FINE}»`;
}

/**
 * Les quelques phrases que `scenario.js` écrit lui-même — celles qui n'ont pas
 * d'opérateur derrière elles. Même règle que le catalogue : les deux langues,
 * ou rien (`src/moteur/i18n.js`).
 */
const MOTS = Object.freeze({
  decouper: { fr: 'On découpe en sous-groupes', en: 'Cut it into sub-groups' },
  decouperLegende: {
    fr: 'Trois morceaux comparables : la même méthode vaudra pour chacun',
    en: 'Three comparable pieces: one and the same method will do for each',
  },
  groupe: (n, langue) => (langue === 'en' ? `group ${n}` : `groupe ${n}`),
  suffixeGroupe: (n, langue) => (langue === 'en' ? ` — group ${n}` : ` — groupe ${n}`),
  isolerPassage: { fr: 'On isole le passage utile', en: 'Single out the part that matters' },
  isolerMorceau: (n, langue) => (langue === 'en'
    ? `Single out the ${ordinalEn(n)} piece`
    : `On isole le ${ordinal(n)} morceau`),
  resonance: { fr: 'Trois fois la même règle', en: 'The same rule, three times over' },
  resonanceLegende: {
    fr: 'Le même calcul vaut pour les trois 6',
    en: 'One and the same calculation gives all three 6s',
  },
  recopier: (n, langue) => (langue === 'en'
    ? `Write it out ${n === 3 ? 'three times' : `${n} times`}`
    : `On la recopie ${n === 3 ? 'trois fois' : `${n} fois`}`),
  ranger: (n, langue) => (langue === 'en'
    ? `${n === 3 ? 'Three' : n} copies, side by side`
    : `On range les ${n === 3 ? 'trois' : n} copies`),
  recopierLegende: (n, langue) => (langue === 'en'
    ? `The same string, read ${n === 3 ? 'three' : n} different ways`
    : `La même chaîne, lue de ${n === 3 ? 'trois' : n} manières différentes`),
  // « lecture » est féminin : `ordinal()` rend le masculin (« premier morceau »).
  lecture: (n, langue) => (langue === 'en'
    ? `${ordinalEn(n)} reading`
    : `${n === 1 ? 'Première' : n === 2 ? 'Deuxième' : n === 3 ? 'Troisième' : `${n}ᵉ`} lecture`),
  recolter: { fr: 'On ne garde que les 6', en: 'Keep the 6s, and only those' },
  recolterLegende: (series, jetes, langue) => {
    if (langue === 'en') {
      return series > 1
        ? `${series} runs of three — the other ${jetes} value${jetes > 1 ? 's fall' : ' falls'} away`
        : `Three of them, side by side — the other ${jetes} value${jetes > 1 ? 's fall' : ' falls'} away`;
    }
    const reste = jetes > 1 ? `les ${jetes} autres valeurs tombent` : 'l’autre valeur tombe';
    return series > 1
      ? `${series} séries de trois — ${reste}`
      : `Trois, côte à côte — ${reste}`;
  },
  // ★ Deux légendes ont disparu avec le tri par portée : « On en garde N » (la
  // récolte d'une portée) et « le 6 en trop reste sur le carreau » (l'appoint).
  // Elles disaient chacune une moitié de ce que dit maintenant, en une fois,
  // `recolterLegende` : combien de séries on garde, combien de valeurs tombent.
  verdict: { fr: 'Le verdict', en: 'The verdict' },
});

// Le titre et la règle d'une approche vivent désormais dans `titres.js` : un
// titre NOMME une méthode (« L'astuce AZERTY et le retournement du 9 ») là où
// l'ancienne version d'ici concaténait trois libellés d'opérateurs. Ce module
// n'en garde que le point d'entrée, parce que `src/app/pont.js` le charge ici
// pour recomposer les titres à chaque changement de langue.
export { titreApproche, regleApproche };

// ══════════════════════════════════ validation des 8 invariants (§7.1 visuel)

/**
 * @param {Object} sc
 * @returns {string[]} violations — vide = scénario conforme
 */
export function validerScenario(sc) {
  const v = [];
  if (!sc || sc.version !== 1) v.push('invariant 1 : version ≠ 1');
  if (!sc || !Array.isArray(sc.tokens) || !Array.isArray(sc.steps)) {
    v.push('structure : tokens/steps absents');
    return v;
  }

  // 2 — ids de tokens uniques, non vides, stables
  const vivants = new Set();
  const jamaisRecrees = new Set();
  for (const t of sc.tokens) {
    if (!t || typeof t.id !== 'string' || !t.id) { v.push('invariant 2 : id de token vide'); continue; }
    if (vivants.has(t.id)) v.push(`invariant 2 : id de token dupliqué « ${t.id} »`);
    vivants.add(t.id);
    jamaisRecrees.add(t.id);
  }

  // 5 — au moins un step, id unique, titre non vide
  if (!sc.steps.length) v.push('invariant 5 : aucun step');
  const idsSteps = new Set();
  for (const s of sc.steps) {
    if (!s || typeof s.id !== 'string' || !s.id) { v.push('invariant 5 : id de step vide'); continue; }
    if (idsSteps.has(s.id)) v.push(`invariant 5 : id de step dupliqué « ${s.id} »`);
    idsSteps.add(s.id);
    if (typeof s.title !== 'string' || !s.title.trim()) v.push(`invariant 5 : step « ${s.id} » sans titre`);
    // 6 — durée
    if (s.duration !== undefined && !(s.duration >= DUREE_MIN)) {
      v.push(`invariant 6 : step « ${s.id} » de durée ${s.duration} < ${DUREE_MIN} ms`);
    }
    if (!Array.isArray(s.ops) || !s.ops.length) { v.push(`step « ${s.id} » sans ops`); continue; }

    for (const o of s.ops) {
      // 7 — vocabulaire fermé
      if (!o || !VOCABULAIRE.has(o.op)) { v.push(`invariant 7 : op inconnue « ${o && o.op} » dans « ${s.id} »`); continue; }
      // 3 — toute référence pointe un id existant à ce point de la timeline
      for (const ref of referencesDe(o)) {
        if (!vivants.has(ref)) v.push(`invariant 3 : « ${s.id} »/${o.op} référence l'id inconnu « ${ref} »`);
      }
      const inv = inventaire(o);
      for (const id of inv.crees) {
        // 4 — un id créé n'est jamais recréé
        if (jamaisRecrees.has(id)) v.push(`invariant 4 : id « ${id} » créé deux fois`);
        jamaisRecrees.add(id);
        vivants.add(id);
      }
      // 4bis — un id supprimé n'est jamais réutilisé : les tokens restent dans le
      // DOM (§3.2-7), donc `vivants` ne rétrécit pas ; c'est le contrat.
    }
  }

  // 8 — pureté : JSON sérialisable, aucune fonction ni référence DOM
  const impur = chercherImpurete(sc, 'scenario', new Set());
  if (impur) v.push(`invariant 8 : ${impur}`);

  return v;
}

function chercherImpurete(x, chemin, vus) {
  const t = typeof x;
  if (x === null || t === 'string' || t === 'number' || t === 'boolean' || t === 'undefined') return null;
  if (t === 'function') return `fonction en ${chemin}`;
  if (t === 'symbol' || t === 'bigint') return `${t} en ${chemin}`;
  // `vus` porte les ANCÊTRES, pas tous les nœuds visités : un même tableau
  // référencé deux fois (les mêmes `targets` dans deux ops) est parfaitement
  // sérialisable, ce n'est pas un cycle.
  if (vus.has(x)) return `cycle en ${chemin}`;
  vus.add(x);
  let faute = null;
  if (Array.isArray(x)) {
    for (let i = 0; i < x.length && !faute; i++) faute = chercherImpurete(x[i], `${chemin}[${i}]`, vus);
  } else if (Object.getPrototypeOf(x) !== Object.prototype && Object.getPrototypeOf(x) !== null) {
    faute = `objet non littéral en ${chemin}`;
  } else {
    for (const k of Object.keys(x)) {
      faute = chercherImpurete(x[k], `${chemin}.${k}`, vus);
      if (faute) break;
    }
  }
  vus.delete(x);
  return faute;
}
