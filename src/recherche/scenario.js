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
import { serieDeSix, sixDuChemin, compterMoisson } from './assemblage.js';
import { CIBLE_DEFAUT, normaliserCible, seriesDe, indexUtiles } from './cible.js';

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
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns', 'merge', 'shift', 'collapse', 'fraction',
  'rule', 'convert', 'insert',
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
 *  · `tca` « on prend les lettres une par une » fait passer `STR 'hope'` à
 *    `TOKENS ['h','o','p','e']` : le type change, les quatre glyphes de la
 *    ligne sont exactement les mêmes. Rien à montrer.
 *    N3 (`research/heuristique.md §4.8`) ne peut PAS l'attraper : retirer `tca`
 *    du chemin le rend mal typé (`m7F` part de `TOKENS`), donc le chemin
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
    case 'merge':
      // Coller n jetons en un seul : les sources s'en vont, l'arrivée reste.
      ajouter(o.to);
      supprimes.push(...normaliserCibles(o.targets));
      break;
    case 'fraction':
      // Le diviseur naît puis s'efface avec la barre ; seul le quotient reste.
      ajouter(o.to);
      supprimes.push(...normaliserCibles(o.targets));
      break;
    case 'collapse':
      // Chaque famille se rejoint : tout part sauf le gardé, s'il y en a un.
      for (const f of o.familles || []) {
        for (const id of normaliserCibles(f && f.membres)) {
          if (f && f.garde === id) continue;
          supprimes.push(id);
        }
      }
      break;
    case 'flip180': case 'keyboard':
    case 'sevenSeg': case 'fourteenSeg': case 'countStrokes':
      // Ces cinq-là remplacent leur cible quand — et seulement quand — un `to`
      // leur est donné : le clavier fait redescendre son chiffre, l'encart le
      // nombre de son compteur.
      //
      // ⚠️ `flip180` connaît une seconde forme : un BLOC qui se retourne d'un
      //   seul geste (`targets` + `to` en tableau, voir `primitives/flip180.js`).
      //   Elle consomme et rend autant de jetons qu'elle en reçoit.
      if (Array.isArray(o.to)) {
        for (const t of o.to) ajouter(t);
        supprimes.push(...normaliserCibles(o.targets));
      } else {
        ajouter(o.to);
        if (o.to) supprimes.push(...normaliserCibles(o.target));
      }
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
    case 'reveal':
      // Le verdict fait le vide autour de lui — mais un seul de ces
      // effacements est NOMMÉ, et c'est le seul qui soit un geste : le 6 en
      // trop qui explose. Le reste (ce qu'un `dim` avait laissé en veilleuse)
      // n'est désigné par personne, la primitive le balaie sur la ligne.
      supprimes.push(...normaliserCibles(o.surnumeraires));
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
  // `shift` — le tamis désigne ce qui monte, ce qui descend et ce qui se rend.
  refs.push(...normaliserCibles(o.up));
  refs.push(...normaliserCibles(o.down));
  refs.push(...normaliserCibles(o.reset));
  for (const f of o.familles || []) {
    refs.push(...normaliserCibles(f && f.membres));
    if (f && typeof f.garde === 'string') refs.push(f.garde);
  }
  // `reveal` — les 6 en trop qui survivent jusqu'au verdict pour y exploser.
  refs.push(...normaliserCibles(o.surnumeraires));
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
      // Les groupes fusionnés jouent le MÊME programme (c'est la condition de
      // la fusion) : leur provenance est la même, et elle traverse.
      code: variantes[0].code,
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

/**
 * Au-delà, on renonce à unifier : une roue de plus de soixante rangées coûte
 * plus à dessiner qu'un remontage n'en coûte à regarder. Même borne que
 * `posts.js › MODULO_RANGEES_DESSINEES_MAX`, et pour la même raison.
 */
const CYCLE_RANGEES_MAX = 60;

/**
 * ★ **LA ROUE ROULE D'UNE VALEUR À L'AUTRE — elle ne se remonte plus entre.**
 *
 * > « S'il y a plusieurs valeurs à convertir chacune modulo 9, es-tu capable de
 * >   naviguer correctement dans la roue entre chaque ? […] Tu pourrais
 * >   identifier quelle a été la dernière valeur convertie pour placer/maintenir
 * >   la roue sur cette position et rouler depuis celle-ci vers la nouvelle. »
 * >   (l'auteur)
 *
 * J'avais répondu que ce n'était pas possible, et c'était faux — mais faux pour
 * une raison qu'il fallait nommer. L'identité d'un décor est DÉRIVÉE de son
 * dessin (`visuel/primitives/table.js › cleDeTable`), ce qui est une bonne règle
 * et n'est pas en cause. Ce qui était en cause, c'est que chaque cycle ne
 * dessinait QUE ce dont sa propre valeur avait besoin : `18 % 9` s'arrête à la
 * rangée 2, `252 % 9` va jusqu'à la 28. Deux dessins, donc deux décors, donc un
 * remontage — et la roue repartait de zéro.
 *
 * Le remède n'est pas de toucher à l'identité : c'est de faire dessiner aux
 * cycles d'une même démonstration LA MÊME ROUE, celle qui porte toutes leurs
 * rangées. Ils deviennent alors le même décor par la règle existante, sans
 * exception ni cas particulier — et la roue, restée en place, roule de la
 * position où l'étape précédente l'a laissée jusqu'à la nouvelle. Rien à
 * mémoriser, rien à transmettre : c'est la persistance du nœud qui porte
 * l'information, exactement comme l'auteur le décrivait.
 *
 * ★ **CE QUI EST UNIFIÉ, ET CE QUI NE L'EST PAS.** Deux cycles ne se
 *   rejoignent que s'ils partagent leur MODULO et leur titre : `modulo 9` et
 *   `modulo 10` sont deux roues différentes, et les confondre dessinerait une
 *   table dont les colonnes mentiraient. Un seul cycle dans la démonstration ne
 *   change pas d'un pouce — l'union d'un ensemble avec lui-même.
 */
function unifierLesCycles(steps) {
  const cycles = new Map();
  for (const s of steps) {
    for (const o of (s && s.ops) || []) {
      if (!o || o.op !== 'table' || o.disposition !== 'modulo') continue;
      const m = o.colonnes;
      if (!Number.isInteger(m) || m < 2) continue;
      const cle = `${m}|${o.titre ?? ''}`;
      if (!cycles.has(cle)) cycles.set(cle, []);
      cycles.get(cle).push(o);
    }
  }

  for (const [, ops] of cycles) {
    if (ops.length < 2) continue;
    const rangees = new Set();
    for (const o of ops) {
      for (const e of o.entries || []) {
        const n = Number(e.char);
        if (Number.isFinite(n)) rangees.add(Math.floor(n / o.colonnes));
      }
    }
    if (rangees.size > CYCLE_RANGEES_MAX) continue;
    const toutes = [...rangees].sort((a, b) => a - b);
    for (const o of ops) {
      const m = o.colonnes;
      const entries = [];
      for (const ligne of toutes) {
        for (let c = 0; c < m; c++) {
          const n = ligne * m + c;
          entries.push({ char: String(n), value: String(n % m) });
        }
      }
      o.entries = entries;
    }
  }
}

function mutualiserDecor(steps) {
  const cleDecor = (s) => {
    if (!s || !Array.isArray(s.ops) || s.ops.length !== 1) return null;
    const o = s.ops[0];
    if (o && o.op === 'table') {
      return JSON.stringify(['table',
        o.disposition || 'reglette', o.colonnes ?? null, o.ordre ?? null,
        o.cycle ?? null, o.teinte ?? null, o.titre ?? null,
        (o.entries || []).map((e) => [e.char, e.value, e.note ?? '', e.label ?? '']),
      ]);
    }
    if (o && o.op === 'keyboard') {
      // Le dessin du clavier, et lui seul : la touche éclairée change à chaque
      // caractère, le CLAVIER ne change pas.
      return JSON.stringify(['keyboard', o.layout || 'azerty', o.mesure || 'touche', o.titre ?? null]);
    }
    // ★ L'AFFICHEUR À SEGMENTS est un décor comme les autres. « Comme pour les
    // tables ou claviers, pas besoin de l'effacer entre chaque conversion
    // d'affilée, tu peux garder l'afficheur d'une fois sur l'autre »
    // (l'auteur). Ce qui l'identifie est ce qu'il MONTRE : l'afficheur, son
    // régime — segments comptés un par un, ou traits fusionnés, qui ne se
    // dessinent même pas pareil — et le nom sous lequel il s'annonce. Les
    // segments ALLUMÉS, eux, changent à chaque lettre : c'est le geste, il ne
    // se mutualise jamais.
    if (o && (o.op === 'sevenSeg' || o.op === 'fourteenSeg')) {
      return JSON.stringify([o.op, o.fusion !== false, o.titre ?? null]);
    }
    return null;
  };
  // ★ Un COURONNEMENT différé est traversable, lui aussi. Une fois son
  // effacement reporté (`reglerLesCornes`), l'étape ne touche plus du tout à la
  // ligne : elle pose un décor accroché, et rien d'autre. Rabattre une table
  // pour elle puis la relever aussitôt ferait un clignotement gratuit, pour la
  // raison exacte qui vaut déjà pour « On isole le troisième morceau ». Un
  // couronnement qui efface ENCORE, lui, referme la série : la ligne bouge.
  const inerte = (o) => TRAVERSABLES.has(o.op)
    || (o.op === 'horns' && !(o.efface || []).length);
  const traversable = (s) => s && Array.isArray(s.ops) && s.ops.length > 0
    && s.ops.every((o) => o && inerte(o));

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
function recolterLesSix(groupe, chemin, poser, langue, tous = false, differe = null,
  cible = CIBLE_DEFAUT) {
  const cbl = normaliserCible(cible);
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin) return null;
  // Une portée qui finit sur un nombre unique n'a rien à trier : son 6 est déjà
  // seul à l'écran. Le cas n'existe qu'en moisson (un tiret, un `fr`).
  if (fin.type === 'NUM') {
    if (!tous || !cbl.alphabet.includes(fin.valeur)) return null;
    const id = (groupe.courants[0] || [])[0] || null;
    return id ? { ids: [id], valeurs: [fin.valeur] } : null;
  }
  // Les 6 retenus sont ceux qu'a désignés `assemblage.js` : la scène ne
  // recalcule pas le découpage, elle le MONTRE. Deux comptes de séries qui
  // divergeraient donneraient un verdict « 666 666 » sur quatre jetons révélés.
  const serie = tous ? sixDuChemin(chemin, cbl) : serieDeSix(chemin, cbl);
  if (!serie) return null;
  // ★ LE 6 DE TROP NE TOMBE PLUS ICI — il reste sur la ligne, au milieu, et
  //   c'est le verdict qui le fera exploser (voir `lesPlusCentraux`). En
  //   MOISSON la question ne se pose pas encore : la portée garde tous ses 6 et
  //   c'est l'appelant qui, une fois toutes les portées passées, arbitre
  //   l'appoint sur la ligne entière.
  const boum = tous ? null : lesPlusCentraux(fin.valeur, serie.indices, cbl);
  const gardes = boum ? boum.gardes : serie.indices;
  const premierDe = (k) => (groupe.courants[k] || [])[0] || null;
  const aGarder = gardes.map(premierDe);
  // Le vecteur et les jetons de scène doivent se correspondre un pour un ; si
  // l'opérateur a rendu autre chose, on ne bricole pas — on laisse le rendu
  // ordinaire faire ce qu'il peut.
  if (aGarder.some((x) => !x) || groupe.courants.length !== fin.valeur.length) return null;
  const surnumeraires = boum ? boum.surnumeraires.map(premierDe) : [];
  if (surnumeraires.some((x) => !x)) return null;

  // Ce qui RESTE à l'écran après cette étape : les jetons retenus ET les
  // surnuméraires, qui ne sont pas faux — ils sont en trop, ce qui n'est pas la
  // même chose et ne se montre pas de la même façon.
  const set = new Set([...gardes, ...(boum ? boum.surnumeraires : [])]);
  const restants = [];
  const valeursRestantes = [];
  const aJeter = [];
  // Les VALEURS de ce qui tombe, dans le même ordre que `aJeter` : c'est la
  // seconde moitié de la ligne, et sans elle on ne peut pas dire si ce qu'on
  // garde est majoritaire (`recolteMajoritaire`). Une portée de moisson les
  // fait suivre à l'appelant, qui trie tout d'un seul geste à la fin.
  const valeursJetees = [];
  for (let i = 0; i < groupe.courants.length; i++) {
    const id = premierDe(i);
    if (set.has(i)) { if (id) { restants.push(id); valeursRestantes.push(fin.valeur[i]); } continue; }
    if (id) { aJeter.push(id); valeursJetees.push(fin.valeur[i]); }
  }
  const valeursGardees = gardes.map((i) => fin.valeur[i]);
  if (aJeter.length) {
    if (differe) { differe.ids.push(...aJeter); differe.valeurs.push(...valeursJetees); }
    else {
      // `tous` (la moisson) passe toujours par `differe` : on n'arrive ici que
      // pour un GROUPEMENT, dont la récolte est déjà la dernière étape avant le
      // verdict — c'est-à-dire la seule place que l'auteur lui reconnaît.
      // ★ Et ce qu'on annonce est ce qui se voit : le surnuméraire compte parmi
      //   les valeurs GARDÉES, puisqu'il est encore là quand l'étape s'achève.
      const majoritaire = recolteMajoritaire(valeursRestantes, valeursJetees, cbl);
      // Des exemplaires du chiffre visé tombent-ils ? Le titre en dépend — voir
      // `MOTS.recolter` : « on ne garde que les 6 » serait faux s'il en tombe.
      const sacrifies = valeursJetees.some((v) => cbl.alphabet.includes(v));
      poser({
        titre: MOTS.recolter(cbl, majoritaire, langue, sacrifies),
        legende: MOTS.recolterLegende(serie.series, aJeter.length, cbl, majoritaire, langue),
        recolte: { series: serie.series, jetes: aJeter.length, cible: cbl.texte, majoritaire },
        ops: [
          { op: 'highlight', targets: restants, mode: 'select' },
          { op: 'drop', targets: aJeter, mode: 'fall', at: 350 },
          { op: 'move', at: 700 },
        ],
      });
    }
  }
  groupe.courants = gardes.map((k) => groupe.courants[k]);
  // ★ Les VALEURS partent avec les identifiants. Tant que la cible valait 666,
  //   savoir « combien de 6 » suffisait à tout — le verdict prenait les trois
  //   premiers, puis les trois suivants. Sur `007`, les chiffres ne sont plus
  //   interchangeables : c'est la SUITE qu'il faut relire pour savoir lesquels
  //   écrivent la cible, et lesquels tombent. On ne peut pas la relire sans les
  //   valeurs, et on ne peut pas les recalculer plus loin sans refaire une
  //   seconde fois un découpage que ce module s'interdit précisément de
  //   refaire (voir plus haut : « la scène ne recalcule pas, elle MONTRE »).
  return { ids: aGarder, valeurs: valeursGardees, surnumeraires };
}

/**
 * ★ LE 6 DE TROP — où il se tient, et à quelle condition il peut exploser.
 *
 * > « `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#…` insère une étape 24 pour
 * > retirer le 6 excédentaire alors que c'est durant le verdict, une fois les 6
 * > collés les uns contre les autres, que le 6 central devrait disparaître par
 * > explosion pour propulser les deux triptyques dans leur agrandissement. »
 * > (l'auteur)
 *
 * Deux gestes sont demandés là, et le second suppose le premier.
 *
 *  1. **Le surnuméraire n'est plus JETÉ, il est GARDÉ jusqu'au verdict.** Une
 *     étape qui s'intitule « on ne garde que les 6 » et qui fait tomber un 6 se
 *     contredit à voix haute ; dans le cas de l'auteur elle ne faisait même que
 *     cela, si bien qu'elle disparaît entièrement. C'est l'affaire de
 *     l'appelant : cette fonction-ci ne dit QUE lequel des 6 est en trop.
 *  2. **Et ce n'est pas n'importe lequel : c'est celui DU MILIEU.** Un 6 qui
 *     s'en va par le bout de la ligne ne pousse personne. Entre les deux
 *     triptyques, il est très exactement ce qui les sépare — et la place qu'il
 *     libère en explosant EST le blanc que le verdict ouvre entre deux séries.
 *     Au centième d'unité, et sans que personne l'ait cherché : le blanc de
 *     série vaut deux écarts et une chasse (`reveal.js › videDeSerie`), soit
 *     deux pas de centre à centre, et un jeton qui occupe un pas en sépare
 *     justement deux. L'explosion ne fait donc pas que retirer un jeton : elle
 *     ÉCRIT la séparation, et c'est pour cela que le verdict n'a plus de temps
 *     de découpage à jouer (`tests/explosion.test.js` le mesure).
 *
 * ★ **La permutation est LICITE parce que les jetons sont interchangeables, et
 * cette fonction renonce dès qu'ils cessent de l'être.** Sur `666`, tous les
 * jetons récoltés portent la même valeur : « lesquels des sept forment les deux
 * séries » est une question sans contenu arithmétique, et y répondre est une
 * décision de mise en scène, pas un truquage. Sur `007`, non — la suite
 * `0 7 0 0 7` n'écrit `007` qu'en sautant le deuxième jeton (`cible.js ›
 * seriesDe`), et permuter changerait ce qui est démontré. La condition est donc
 * la **cible homogène**, et rien de moins.
 *
 * ★ **UNE SEULE SÉRIE SUFFIT — l'exigence de deux est levée.**
 *
 *   Elle disait : « une explosion PROPULSE, il lui faut quelqu'un à pousser de
 *   chaque côté ; un triptyque seul avec un 6 qui traîne n'a pas de milieu ».
 *   L'argument portait sur la BELLE FIGURE du geste, et il oubliait de compter
 *   ce que son refus coûtait. L'auteur a fait le compte :
 *
 *   > « Quitte à jeter de toute façon le surplus à la fin, pourquoi ne pas le
 *   > faire durant le verdict, vu qu'il sait faire ça et le facture moins
 *   > cher ? […] Pour un 4ᵉ 6, l'explosion finale au verdict me semble plus
 *   > pertinente. »
 *
 *   MESURÉ, et c'est accablant : sur `#m14#` (« hope »), la ligne d'arrivée est
 *   `6 6 6 6` — QUE des 6 —, et le refus faisait retomber le quatrième dans la
 *   récolte ordinaire. On obtenait donc une étape entière intitulée **« On ne
 *   garde que les 6 »** sur une ligne où il n'y a QUE des 6, et dont le seul
 *   geste était d'en jeter un. Le titre ne décrivait rien ; il contredisait ce
 *   qu'on voyait. C'est exactement le défaut que l'en-tête ci-dessus dit avoir
 *   corrigé — il ne l'avait corrigé qu'au-dessus de deux séries.
 *
 *   Avec une seule série, la coupure tombe AVANT le triptyque (`coupure = 0`) :
 *   le surnuméraire est le premier jeton interchangeable, pas le dernier. C'est
 *   ce qu'il faut — « un 6 qui s'en va par le bout de la ligne ne pousse
 *   personne » vise la fin, et un départ par la tête pousse tout le reste. Et
 *   quand le 6 en trop n'est PAS collé au triptyque — `6 4 6 6 6` —, c'est lui
 *   qui part, ce qui est la seule lecture possible.
 *
 *   ⚠️ Ce qui disparaît alors n'est pas seulement un titre menteur : c'est une
 *     ÉTAPE, donc une longueur, donc un malus de récolte. La voie devient plus
 *     courte ET plus honnête, sans qu'on ait touché au barème.
 *
 * ★ La coupure choisie sépare DEUX SÉRIES, jamais l'intérieur de l'une d'elles
 * — sans quoi le triptyque qu'on prétend propulser serait coupé en deux — et
 * parmi elles la plus proche du milieu. À égalité, la plus à gauche : l'ordre
 * de lecture, donc rien à départager, donc rien à truquer (CONTRACTS §4.4).
 *
 * ★ **Fonction PURE, et EXPORTÉE pour être éprouvée.** Ce n'est pas une
 * commodité de test : le choix de la coupure est une décision de mise en scène
 * qui ne se lit nulle part ailleurs — ni dans le scénario émis, où l'on ne voit
 * que son résultat, ni dans la scène, où l'on ne voit plus que six chiffres.
 * Un test qui ne l'atteindrait qu'à travers un lien ne gèlerait que le cas de
 * ce lien-là.
 *
 * @param {number[]} valeurs — les valeurs de la ligne, dans l'ordre de lecture
 * @param {number[]} gardes — les index que la récolte retenait, série par série
 * @param {import('./cible.js').Cible} cible
 * @returns {{gardes:number[], surnumeraires:number[]}|null} `null` quand le
 *   geste ne s'applique pas : l'appelant reprend la chute ordinaire.
 */
export function lesPlusCentraux(valeurs, gardes, cible) {
  const cbl = normaliserCible(cible);
  if (!cbl.homogene) return null;
  const chiffre = cbl.chiffres[0];
  if (!Array.isArray(valeurs) || !Array.isArray(gardes) || !gardes.length) return null;
  if (!gardes.every((i) => valeurs[i] === chiffre)) return null;
  const nSeries = gardes.length / cbl.longueur;
  if (!Number.isInteger(nSeries) || nSeries < 1) return null;
  // Les jetons INTERCHANGEABLES : ceux qui portent le chiffre de la cible, que
  // la récolte les ait retenus ou non. Les autres ne sont pas surnuméraires,
  // ils sont FAUX — ils tombent comme avant, et à leur étape.
  const memes = [];
  for (let i = 0; i < valeurs.length; i++) if (valeurs[i] === chiffre) memes.push(i);
  const surplus = memes.length - gardes.length;
  if (surplus <= 0) return null;
  /* ★ **UNE SEULE SÉRIE : ON EXPLOSE AUX EXTRÉMITÉS, PAS AU MILIEU.**
     « S'il y a cinq 6 au total, alors fais exploser les deux aux extrémités, et
     passe au centre à partir de 2 × 666 » (l'auteur).

     Le milieu n'a de sens qu'entre DEUX séries : la place qu'un jeton y libère
     EST le blanc que le verdict ouvre entre elles. Avec une seule série il n'y
     a pas de blanc à écrire, et creuser le triptyque le casserait. Ce qui reste
     à décider est donc l'inverse : ce qu'on GARDE est le plus central, et ce qui
     part est ce qui déborde de part et d'autre.

     Les surnuméraires sont pris alternativement à gauche puis à droite, en
     commençant par la GAUCHE. Sur cinq, cela donne les deux bouts et le trio du
     centre, exactement ce que l'auteur décrit. Sur quatre, un seul part, et
     c'est celui de tête : « un 6 qui s'en va par le bout de la ligne ne pousse
     personne » vise la fin, et un départ par la tête pousse tout le reste. */
  if (nSeries === 1) {
    /* ⚠️ **LE SURPLUS EST STRUCTURELLEMENT PLUS PETIT QUE LA CIBLE**, et le
       vérifier n'est pas de la paranoïa : c'est ce qui borne l'alternance aux
       deux BOUTS. `serieDeSix` rend des séries COMPLÈTES ; s'il restait autant
       d'exemplaires que la cible a de chiffres, ils en formeraient une de plus
       et la récolte les aurait pris. Sur `666`, le surplus vaut donc 1 ou 2, et
       jamais 3 — « à 6 on garde tout » (l'auteur), parce que six 6 font deux
       séries et zéro surnuméraire.

       Si un appelant présentait malgré tout un `gardes` incohérent, l'alternance
       mordrait sur ce qui devait rester une série. On renonce plutôt que de la
       casser : c'est la règle de cette fonction partout ailleurs. */
    if (surplus >= cbl.longueur) return null;
    const surn = [];
    let g = 0;
    let d = memes.length - 1;
    for (let k = 0; k < surplus; k++) surn.push(k % 2 === 0 ? memes[g++] : memes[d--]);
    const ecartes = new Set(surn);
    return {
      gardes: memes.filter((i) => !ecartes.has(i)),
      surnumeraires: surn.sort((a, b) => a - b),
    };
  }
  const coupure = Math.min(nSeries - 1, Math.max(1, Math.floor(nSeries / 2)));
  const debut = coupure * cbl.longueur;
  return {
    gardes: [...memes.slice(0, debut), ...memes.slice(debut + surplus)],
    surnumeraires: memes.slice(debut, debut + surplus),
  };
}

/** La valeur du dernier état d'un chemin, quand c'est un nombre unique. */
function valeurTerminale(chemin) {
  const fin = chemin && chemin.etats && chemin.etats[chemin.etats.length - 1];
  if (!fin) return null;
  if (fin.type === 'NUM') return fin.valeur;
  if (fin.type === 'NUMS' && fin.valeur.length) return fin.valeur[0];
  return null;
}

// ══════════════════════════════════ LA LIGNE, rejouée pas à pas

/**
 * ★ LA LIGNE — la suite ORDONNÉE des jetons vivants, rejouée step par step.
 *
 * Pourquoi ce module existe, alors que `inventaire()` sait déjà dire ce qu'une
 * op crée et ce qu'elle supprime : parce que la contiguïté est une question
 * d'ORDRE, et qu'un inventaire ne la connaît pas. « Trois 6 qui se touchent »
 * ne se lit pas dans un ensemble d'identifiants, il se lit dans une file.
 *
 * ★ **C'est un double du modèle de scène, et le double est ASSUMÉ — à une
 * condition, qui est tenue ici.** Le vrai flux appartient au moteur visuel
 * (`visuel/scene.js`), et ce module ne peut pas l'importer : `scenario.js`
 * appartient au moteur de recherche, il ÉMET pour le visuel et ne s'exécute
 * jamais dedans (CONTRACTS §1, règle de non-collision). La condition est donc
 * celle-ci : **on ne rejoue que ce qu'on sait rejouer exactement, et on rend
 * la main dès qu'on ne sait plus.** Une op hors de la table ci-dessous, un
 * sélecteur déclaratif (`{group: …}`) dont les identifiants ne sont pas écrits,
 * un jeton qu'on ne retrouve pas : la ligne devient `null` à partir de là, et
 * tout ce qui s'appuie dessus renonce. Personne ne couronne « au jugé ».
 *
 * ★ **Et le double est MESURÉ** — `tests/integration-visuel.test.js` compile
 * chaque scénario avec le compilateur RÉEL et compare, step par step, la ligne
 * rejouée ici au `scene.flow` du moteur visuel. Une divergence est un test
 * rouge, pas une surprise au clic de l'utilisateur.
 *
 * ★ **Et le troisième verrou reste le dernier mot.** Même juste, cette
 * simulation ne dispense de rien : `visuel/primitives/horns.js` relit la
 * contiguïté sur LA LIGNE au moment de compiler, et fait échouer la
 * compilation si elle n'y est pas (CONTRACTS §3.1). Ce module sert à SAVOIR
 * OÙ couronner, jamais à prouver qu'on en a le droit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ★ LES FRONTIÈRES DE GROUPE — pourquoi la file d'identifiants ne suffit pas
 *
 * « Il y a eu 2 ajouts de cornes anticipées, l'un sur `6 6 6`, l'autre sur
 * `6 66` » (l'auteur). Les trois 6 y occupaient bel et bien trois rangs
 * consécutifs — le rejeu le disait, le troisième verrou l'a confirmé — et
 * pourtant ils ne se lisaient pas `666` : un DÉCOUPAGE était passé par là, et
 * l'écart de frontière qu'il laisse derrière lui est quatre fois et demie
 * l'écart ordinaire. Trois chiffres séparés par ça ne sont pas côte à côte,
 * ce sont trois chiffres qu'on lit un par un.
 *
 * Le rejeu suit donc, en plus de l'ordre, **ce qui se voit entre deux voisins**.
 * `partition` pose un écart large devant le premier jeton de chaque groupe et
 * un écart serré devant les autres (`visuel/primitives/partition.js`), et cet
 * écart SURVIT aux substitutions : le jeton qui en remplace un autre hérite de
 * son espacement (`helpers.espacementDe`), sans quoi le découpage disparaîtrait
 * à la première conversion. On modélise exactement ces deux gestes — la pose et
 * l'héritage —, et rien d'autre.
 *
 * ★ **Et c'est MESURÉ, à l'identique** (`tests/integration-visuel.test.js`) :
 * l'ensemble des frontières rejouées ici doit coïncider, jeton pour jeton, avec
 * l'ensemble des jetons dont le `gapBefore` réel dépasse l'écart ordinaire. Le
 * jour où une primitive écartera la ligne pour une autre raison — `helpers.
 * marquerLesNombres` élargit à 2,2 fois quand une ligne porte des nombres à
 * plusieurs chiffres, et ce cas ne se produit encore nulle part dans le jeu
 * d'essai —, le test rougit ici plutôt qu'une corne ne s'égare là-bas.
 *
 * @param {{id:string}[]} tokens — les jetons de départ, dans l'ordre de lecture
 * @param {Object[]} steps
 * @returns {Array<{ids:string[], frontieres:Set<string>}|null>} `lignes[i]` =
 *   l'état APRÈS le step `i` — la file des jetons vivants et, parmi eux, ceux
 *   devant lesquels s'ouvre une frontière de groupe. `null` dès que le rejeu a
 *   perdu le fil (et pour tous les steps suivants).
 */
export function suivreLaLigne(tokens, steps) {
  let ligne = (tokens || []).map((t) => t.id);
  let perdu = false;
  // Les jetons devant lesquels s'ouvre une frontière de groupe. Vide au
  // départ : une saisie non découpée est d'un seul tenant.
  const frontieres = new Set();
  // Les signes d'opération que le moteur visuel s'alloue lui-même quand
  // `insertOperators` ne les nomme pas : ils occupent une place dans la ligne
  // — c'est tout ce qu'on a besoin de savoir d'eux — et une somme les absorbe.
  const signes = new Set();
  const lignes = [];

  /** Les identifiants explicitement écrits, ou `null` pour un sélecteur. */
  const ids = (t) => {
    if (t === undefined || t === null) return [];
    if (typeof t === 'string') return [t];
    if (Array.isArray(t) && t.every((x) => typeof x === 'string')) return t;
    return null;
  };
  /**
   * L'ESPACEMENT SUIT LE JETON QUI PREND LA PLACE — et lui seul.
   *
   * `helpers.espacementDe` recopie le `gapBefore` du jeton remplacé sur le
   * PREMIER de ceux qui le remplacent (`substitute`, `reduce`, `flip180`…), et
   * sur lui seul : les suivants naissent avec l'écart ordinaire, puisqu'ils
   * s'insèrent DANS la place de leur source, pas devant elle.
   */
  const heriterEcart = (source, neufs) => {
    const ouvre = frontieres.delete(source);
    neufs.forEach((id, k) => {
      if (k === 0 && ouvre) frontieres.add(id);
      else frontieres.delete(id);
    });
  };
  const remplacer = (cible, neufs) => {
    const i = ligne.indexOf(cible);
    if (i < 0) return false;
    heriterEcart(cible, neufs);
    ligne.splice(i, 1, ...neufs);
    return true;
  };
  /**
   * ★ N JETONS REMPLACÉS PAR N JETONS, place pour place.
   *
   * Le geste du BLOC retourné (`primitives/flip180.js`) : les cibles doivent
   * être contiguës et dans l'ordre de la ligne — c'est ce qu'un trio de `999`
   * est par construction —, et chacune cède sa place à son homologue. On refuse
   * plutôt que de deviner si elles ne le sont pas : un modèle de ligne qui
   * réarrange au jugé cesserait d'être un contrôle.
   */
  const remplacerPlusieurs = (cibles, neufs) => {
    const rangs = cibles.map((id) => ligne.indexOf(id));
    if (rangs.some((r) => r < 0)) return false;
    for (let k = 1; k < rangs.length; k++) if (rangs[k] !== rangs[k - 1] + 1) return false;
    cibles.forEach((cible, k) => heriterEcart(cible, [neufs[k]]));
    ligne.splice(rangs[0], cibles.length, ...neufs);
    return true;
  };
  const nes = (to) => (Array.isArray(to) ? to : [to])
    .filter((t) => t && typeof t.id === 'string').map((t) => t.id);
  /**
   * Le geste d'`accumulate` (`visuel/primitives/helpers.js`), à la virgule
   * près : on relève la place du PREMIER opérande, on consomme les opérandes,
   * ce qui a été déclaré et les signes qui les séparent, puis le résultat entre
   * dans le flux à la place relevée. C'est le même ordre là-bas, et il compte —
   * relever la place après les suppressions donnerait un autre rang.
   */
  const accumuler = (operandes, consomme, to) => {
    if (!operandes || !operandes.length || !to || typeof to.id !== 'string') return false;
    const rangs = operandes.map((id) => ligne.indexOf(id));
    if (rangs.some((r) => r < 0)) return false;
    const lo = Math.min(...rangs);
    const hi = Math.max(...rangs);
    const absorbes = ligne.slice(lo + 1, hi).filter((id) => signes.has(id));
    const morts = new Set([...operandes, ...(consomme || []), ...absorbes]);
    const place = rangs[0];
    // Le résultat prend l'espacement du PREMIER opérande — c'est sa place qu'il
    // occupe, et c'est ce que fait `helpers.accumulate` (`espacementDe(ctx,
    // operands[0])`). Les autres opérandes disparaissent avec leur écart.
    heriterEcart(operandes[0], [to.id]);
    for (const id of morts) frontieres.delete(id);
    ligne = ligne.filter((id) => !morts.has(id));
    ligne.splice(Math.max(0, Math.min(place, ligne.length)), 0, to.id);
    return true;
  };

  for (const st of steps) {
    for (const o of (st && st.ops) || []) {
      if (perdu) break;
      switch (o.op) {
        // Ces gestes ne touchent pas à la ligne : ils désignent, estompent,
        // annotent, attendent, ou tracent une accolade autour de ce qui est là.
        // `shift` écarte verticalement puis rend l'écart : il ne crée, ne
        // supprime ni ne réordonne rien. La ligne est la même avant et après.
        case 'highlight': case 'dim': case 'pulse': case 'annotate': case 'wait': case 'shift':
          break;
        case 'partition': {
          // Le découpage ne change ni l'ordre ni la composition de la ligne —
          // il ÉCARTE. Écart large devant le premier jeton de chaque groupe,
          // serré devant les autres (`visuel/primitives/partition.js`), et rien
          // pour ce qui n'appartient à aucun groupe. La frontière du tout
          // premier jeton de la ligne est remise à zéro là-bas : elle
          // n'espacerait rien, elle décentrerait tout.
          for (const g of o.groups || []) {
            const cibles = ids(g && g.targets);
            if (!cibles || !cibles.length) { perdu = true; break; }
            cibles.forEach((id, k) => {
              if (k === 0 && ligne.indexOf(id) > 0) frontieres.add(id);
              else frontieres.delete(id);
            });
          }
          break;
        }
        case 'move': {
          if (Array.isArray(o.order)) {
            const voulus = o.order.filter((id) => ligne.includes(id));
            if (voulus.length !== o.order.length) { perdu = true; break; }
            // ★ RÉARRANGEMENT SUR PLACE — voir `visuel/primitives/move.js`, qui
            //   dit la même chose et pour la même raison. Les jetons rangés
            //   reprennent les places qu'ils occupaient déjà ; ils ne remontent
            //   PAS en tête du flux.
            //
            //   ⚠️ C'est le second exemplaire de la même sémantique, et c'est ce
            //   test d'intégration qui existe pour les tenir d'accord : corriger
            //   la primitive sans corriger ce modèle a fait rougir « ligne après
            //   l'étape 35 » sur `https://www.example.com/path/to/page`, où le
            //   septième fragment se range. Les deux se lisent l'un l'autre.
            const aRanger = new Set(voulus);
            const places = [];
            ligne.forEach((id, k) => { if (aRanger.has(id)) places.push(k); });
            const suite = ligne.slice();
            voulus.forEach((id, k) => { suite[places[k]] = id; });
            ligne = suite;
          } else if (o.targets !== undefined) {
            const cibles = ids(o.targets);
            if (!cibles) { perdu = true; break; }
            const reste = ligne.filter((id) => !cibles.includes(id));
            ligne = (o.to || 'front') === 'back' ? [...reste, ...cibles] : [...cibles, ...reste];
          }
          break;                                   // sans `order` ni `targets` : un simple recalcul
        }
        case 'drop': {
          const cibles = ids(o.targets);
          if (!cibles) { perdu = true; break; }
          const morts = new Set(cibles);
          for (const id of morts) frontieres.delete(id);
          ligne = ligne.filter((id) => !morts.has(id));
          break;
        }
        case 'horns': {
          // Les cornes ne créent aucun jeton — le décor appartient au moteur
          // visuel. Elles n'ôtent que ce qu'`efface` désigne, et cette liste
          // est vide quand le couronnement a été séparé de l'effacement.
          const morts = new Set(ids(o.efface) || []);
          if (morts.size) {
            for (const id of morts) frontieres.delete(id);
            ligne = ligne.filter((id) => !morts.has(id));
          }
          break;
        }
        case 'substitute': {
          for (const p of o.pairs || []) {
            const source = typeof p.target === 'string' ? p.target : (ids(p.targets) || [])[0];
            const arrivee = nes(p.to);
            if (!source || !arrivee.length || !remplacer(source, arrivee)) { perdu = true; break; }
          }
          break;
        }
        // Un jeton pour un jeton, exactement à sa place — et seulement quand un
        // `to` est donné : sans lui, l'afficheur ou la table ne fait que MONTRER.
        case 'table': case 'keyboard': case 'sevenSeg': case 'fourteenSeg':
        case 'countStrokes': case 'flip180': case 'reduce': {
          if (o.to === undefined) break;
          // ★ LE BLOC RETOURNÉ — autant de jetons rendus que reçus, DANS L'ORDRE
          //   DE LA LIGNE. La rotation échange bien la gauche et la droite à
          //   l'écran, mais l'émetteur donne ses deux listes en ordre de ligne
          //   et c'est la primitive qui applique le miroir : ici, on remplace
          //   donc place pour place, et le modèle ne peut pas diverger de la
          //   scène sur ce point-là.
          if (Array.isArray(o.to)) {
            const cibles = ids(o.targets);
            const arrivees = o.to.flatMap((t) => nes(t));
            if (!cibles || cibles.length !== arrivees.length
              || !remplacerPlusieurs(cibles, arrivees)) { perdu = true; }
            break;
          }
          const arrivee = nes(o.to);
          if (typeof o.target !== 'string' || arrivee.length !== 1
            || !remplacer(o.target, arrivee)) { perdu = true; }
          break;
        }
        case 'sum': {
          const operandes = ids(o.targets);
          const consomme = ids(o.consume);
          if (!operandes || !consomme || !accumuler(operandes, consomme, o.to)) perdu = true;
          break;
        }
        case 'collapse': {
          // Les exemplaires se rejoignent : tous s'en vont sauf le gardé, qui
          // reprend sa place — celle qu'il occupait déjà.
          for (const f of o.familles || []) {
            const membres = ids(f && f.membres);
            if (!membres || membres.length < 2) { perdu = true; break; }
            const morts = membres.filter((id) => id !== f.garde);
            // L'annulation par paires laisse le dernier quand le compte est
            // impair — même règle que `visuel/primitives/collapse.js`.
            const impair = (o.mode === 'annulation') && membres.length % 2 === 1;
            const rescape = impair ? membres[membres.length - 1] : null;
            for (const id of morts) {
              if (id === rescape) continue;
              const i = ligne.indexOf(id);
              if (i < 0) { perdu = true; break; }
              frontieres.delete(id);
              ligne.splice(i, 1);
            }
          }
          break;
        }
        case 'fraction': {
          // Les termes s'en vont, le quotient prend la place du premier — le
          // diviseur et la barre ne sont jamais entrés dans la ligne.
          const termes = ids(o.targets);
          if (!termes || !accumuler(termes, [], o.to)) perdu = true;
          break;
        }
        case 'merge': {
          // Coller, c'est accumuler sans rien absorber entre les termes : le
          // jeton unique prend la place et l'espacement du premier, et les
          // autres s'en vont avec la leur (`visuel/primitives/merge.js`).
          const colles = ids(o.targets);
          if (!colles || !accumuler(colles, [], o.to)) perdu = true;
          break;
        }
        case 'group': {
          // L'accolade qui tient sa promesse elle-même (décompte, nivellement)
          // consomme ce qu'elle embrasse et pose le résultat à sa place : c'est
          // le geste d'une somme. Sans `to`, elle ne fait que l'entourer.
          if (o.to === undefined) break;
          const embrasses = ids(o.targets);
          if (!embrasses || !accumuler(embrasses, [], o.to)) perdu = true;
          break;
        }
        case 'insertOperators': {
          const entre = ids(o.between);
          if (!entre || entre.length < 2) { perdu = true; break; }
          const nommes = ids(o.ids);
          for (let i = 0; i < entre.length - 1; i++) {
            const rang = ligne.indexOf(entre[i]);
            if (rang < 0) { perdu = true; break; }
            // ★ Le nom d'un signe anonyme est celui que le MOTEUR VISUEL lui
            //   donne, à la lettre près : `@op:<gauche>:<rang>`
            //   (`primitives/insertOperators.js`). Inventer une numérotation
            //   parallèle marchait tant que ces signes étaient absorbés avant
            //   la première comparaison ; dès qu'un geste les laisse survivre —
            //   un collage, par exemple, qui ne ramasse rien —, les deux
            //   lignes cessent de porter les mêmes noms et le contrôle croisé
            //   accuse un désaccord qui n'existe pas.
            const id = nommes && nommes[i] ? nommes[i] : `@op:${entre[i]}:${i}`;
            signes.add(id);
            ligne.splice(rang + 1, 0, id);
            // ★ LE SIGNE OUVRE LE TERME, il ne ferme pas le précédent : l'écart
            //   large se pose DEVANT lui, et le nombre qu'il gouverne s'y colle
            //   (`visuel/primitives/helpers.js › insertOperatorTokens`). C'est
            //   ce qui fait lire « 5  −11  +2 » plutôt que « 5−  11+  2 ».
            frontieres.add(id);
            frontieres.delete(entre[i + 1]);
          }
          break;
        }
        // Le verdict RASSEMBLE : il efface tout ce qui n'est pas révélé et
        // repose les séries. Après lui il n'y a rien, et ce module n'a donc
        // aucune raison de savoir le rejouer.
        case 'reveal': perdu = true; break;
        default: perdu = true; break;
      }
    }
    lignes.push(perdu ? null : { ids: ligne.slice(), frontieres: new Set(frontieres) });
  }
  return lignes;
}

// ══════════════════════════════════ les cornes : QUAND, et dans quel ordre

/**
 * Ops qui DÉSIGNENT sans jamais déplacer : elles peuvent nommer les trois 6
 * sans mettre en cause ni leur existence ni leur voisinage.
 *
 * `reveal` en fait partie : il regroupe les chiffres révélés série par série,
 * et une série EST un triptyque — il ne peut donc ni le disperser ni y insérer
 * quoi que ce soit. `horns` aussi, mais seulement quand il n'efface rien (voir
 * `transparentAvant`).
 */
const DESIGNENT_SANS_DEPLACER = new Set([
  'highlight', 'dim', 'pulse', 'annotate', 'wait', 'reveal', 'horns',
]);

/**
 * Ops qui remplacent UN jeton par UN jeton, exactement à sa place dans la
 * ligne. Ce sont les seules qu'un triptyque déjà formé peut traverser sans
 * qu'on ait à simuler la mise en page : l'ordre des rangs est inchangé, donc
 * deux voisins le restent et deux non-voisins aussi.
 */
const REMPLACENT_UN_POUR_UN = new Set([
  'table', 'keyboard', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'flip180',
]);

/** Une op touche-t-elle l'un des trois jetons ? */
function touche(o, trio) {
  const inv = inventaire(o);
  if (inv.supprimes.some((id) => trio.has(id))) return true;
  return referencesDe(o).some((id) => trio.has(id));
}

/**
 * L'op peut-elle se glisser ENTRE le couronnement avancé et sa place d'origine
 * sans mettre en cause ce qui autorise l'avance ?
 *
 * ★ C'est ici que se joue la démonstration, et elle est courte. À sa place
 * d'origine, la contiguïté des trois 6 est établie — c'est le troisième verrou
 * (`visuel/primitives/horns.js`), qui lit la LIGNE avant d'effacer quoi que ce
 * soit. Si, entre la place avancée et celle-là, aucune op ne change l'ORDRE des
 * rangs, alors la contiguïté d'arrivée est aussi celle du départ : on ne
 * suppose pas, on remonte le temps sur une suite d'opérations qui préservent
 * l'ordre. D'où le tamis, volontairement étroit : ou bien l'op ne touche pas à
 * la ligne, ou bien elle y remplace un jeton par un autre à la même place.
 *
 * Tout le reste — un effacement, une somme, un regroupement, une substitution
 * qui multiplie, un `move`, un découpage — peut faire ou défaire un voisinage,
 * et l'avance est alors refusée. Un couronnement posé sur un 666 qui se
 * déferait ensuite serait un mensonge visuel, exactement celui que le projet
 * refuse partout ailleurs.
 */
function transparentAvant(o, trio) {
  if (touche(o, trio)) return false;
  if (o.op === 'horns') return !(o.efface || []).length;
  if (DESIGNENT_SANS_DEPLACER.has(o.op)) return inventaire(o).crees.length === 0;
  if (REMPLACENT_UN_POUR_UN.has(o.op)) {
    return Boolean(o.to) && typeof o.target === 'string';
  }
  return false;
}

/**
 * L'op laisse-t-elle le triptyque intact APRÈS le couronnement, et jusqu'au
 * verdict ?
 *
 * Le tamis est plus large qu'avant : à partir du couronnement, les trois 6 sont
 * contigus, et rien ne peut plus s'insérer entre deux voisins sans les
 * référencer. Restent trois dangers, et on les nomme : qu'on en efface un,
 * qu'on en remplace un, qu'on rebatte l'ordre de toute la ligne.
 */
function transparentApres(o, trio) {
  if (touche(o, trio) && !DESIGNENT_SANS_DEPLACER.has(o.op)) return false;
  if (inventaire(o).supprimes.some((id) => trio.has(id))) return false;
  if (o.op === 'partition') return false;                 // rebat les groupes
  if (o.op === 'move' && Array.isArray(o.order)) return false; // rebat l'ordre
  return true;
}

/** L'étape qui a fait naître le dernier des trois 6, ou −1 s'ils sont d'origine. */
function naissanceDuTriptyque(steps, avant, trio) {
  for (let k = avant - 1; k >= 0; k--) {
    for (const o of steps[k].ops || []) {
      if (inventaire(o).crees.some((id) => trio.has(id))) return k;
    }
  }
  return -1;
}

/**
 * ★ LA VÉRIFICATION QUI AUTORISE — OU REFUSE — LE COURONNEMENT ANTICIPÉ.
 *
 * Rend l'index auquel le couronnement peut remonter ; `iCornes` lui-même quand
 * rien ne l'autorise. Fonction **pure** : elle ne lit que la liste des étapes,
 * et elle est exportée pour être éprouvée directement, y compris sur des cas
 * que le catalogue ne produit pas encore.
 *
 * Trois conditions, toutes vérifiées, aucune supposée :
 *
 *  1. **les trois 6 existent** — la place visée est celle qui suit l'étape
 *    ayant fait naître le dernier d'entre eux. On ne couronne pas un chiffre
 *    qui n'est pas encore là ;
 *  2. **rien ne change l'ordre des rangs entre les deux places** — seules sont
 *    traversées les étapes inertes et les remplacements un pour un
 *    (`transparentAvant`). C'est ce qui permet de conclure : la contiguïté
 *    établie à la place d'origine (troisième verrou, `visuel/primitives/
 *    horns.js`) vaut alors aussi à la place avancée ;
 *  3. **ils survivent jusqu'au bout, et leur contiguïté avec** — aucune étape
 *    postérieure ne les efface, ne les remplace, ni ne rebat l'ordre de la
 *    ligne (`transparentApres`).
 *
 * Si l'une des trois manque, le couronnement reste où l'opérateur l'a posé.
 * Des cornes posées sur un 666 que la suite déferait seraient un mensonge
 * visuel — précisément celui que ce projet refuse partout ailleurs.
 */
export function placeDuCouronnement(steps, iCornes) {
  const op = (steps[iCornes].ops || []).find((o) => o && o.op === 'horns');
  if (!op) return iCornes;
  const trio = new Set(op.targets || []);
  if (trio.size !== 3) return iCornes;

  const vise = naissanceDuTriptyque(steps, iCornes, trio) + 1;
  if (vise >= iCornes) return iCornes;
  for (let k = vise; k < iCornes; k++) {
    if (!(steps[k].ops || []).every((o) => transparentAvant(o, trio))) return iCornes;
  }
  for (let k = iCornes + 1; k < steps.length; k++) {
    if (!(steps[k].ops || []).every((o) => transparentApres(o, trio))) return iCornes;
  }
  return vise;
}

/**
 * ★ « CONTIGUS », AU SENS OÙ ÇA SE LIT — trois rangs qui se suivent ET rien
 * qui s'ouvre entre eux.
 *
 * Deux conditions, et la première seule ne suffisait pas. L'auteur a relevé
 * deux couronnements fautifs, l'un sur « 6 6 6 », l'autre sur « 6 66 » : dans
 * les deux cas les trois jetons occupaient bel et bien trois rangs consécutifs
 * de la ligne, et dans les deux cas un DÉCOUPAGE avait laissé entre eux
 * l'écart de frontière — quatre fois et demie l'écart ordinaire. Ce qui se lit
 * alors n'est pas un 666, ce sont trois 6 qu'on énumère.
 *
 * La frontière est celle que suit `suivreLaLigne` (voir « LES FRONTIÈRES DE
 * GROUPE »). Elle ne compte que DEVANT le deuxième et le troisième jeton :
 * celle qui précède le premier ne sépare rien du triptyque, elle le détache de
 * ce qui vient avant — et c'est même ce qui le fait ressortir.
 *
 * @param {{ids:string[], frontieres:Set<string>}} ligne
 * @param {string[]} trio
 */
function dUnSeulTenant(ligne, trio) {
  const r = trio.map((id) => ligne.ids.indexOf(id));
  if (r.some((x) => x < 0)) return false;
  for (let k = 1; k < r.length; k++) {
    if (r[k] !== r[k - 1] + 1) return false;
    if (ligne.frontieres.has(trio[k])) return false;
  }
  return true;
}

/**
 * ★ COURONNER SANS EFFACER — le geste que personne n'émettait.
 *
 * ★ **Et c'est aujourd'hui LE SEUL émetteur de cornes du projet.** Aucun
 * opérateur n'en pose plus : un couronnement qui dépendrait d'un code
 * dépendrait de l'URL, et deux liens arithmétiquement identiques montreraient
 * l'un des cornes et l'autre pas. Voir `transformations/mappeurs.js`, « CET
 * OPÉRATEUR NE COURONNE PLUS », et CONTRACTS §3.1.
 *
 * **Le manque, tel qu'il se constatait.** L'unique source de cornes du projet
 * était alors l'opérateur `m36` (`m.troisSixDAffilee`), et il faisait DEUX
 * choses : il couronnait trois 6 contigus **et il tronquait le vecteur à ces
 * trois-là**. C'est
 * juste quand le vecteur ne rapporte qu'une série — sur `Donald Trump`, il n'y
 * a rien à garder après le 666 —, et c'est ruineux dès qu'il en rapporte
 * plusieurs : sur `hope-hope-hope.fr`, `m36` ne garderait que 3 des 15 six, une
 * série au lieu de cinq, et le classement le rejette à juste titre. La voie
 * mise en vitrine (`src/i18n/fr.js`) est donc, très légitimement, une voie
 * SANS `m36` — et elle ne montrait aucune corne, faute d'émetteur.
 *
 * **Ce que l'auteur demande.** « Les 3 premiers 6 devraient pouvoir recevoir
 * leur corne entre l'étape 5 et 6, puis entre 13 et 14 pour les 666 de "ope"
 * du 2nd hope. » Autrement dit : **dès que trois 6 deviennent contigus au fil
 * de la démonstration, on les couronne à cet instant-là, sans rien effacer.**
 * C'est très exactement la moitié « couronnement » du geste de `m36`, détachée
 * de sa moitié « effacement » — laquelle n'a aucune raison d'exister ici,
 * puisqu'il n'y a rien à jeter : les autres 6 sont d'autres séries.
 *
 * ★ **TROIS CONDITIONS CUMULATIVES, et l'auteur les a resserrées lui-même.**
 * Le premier jet couronnait dès que trois 6 occupaient trois rangs consécutifs,
 * et il a couronné deux fois de trop — « il y a eu 2 ajouts de cornes
 * anticipées, l'un sur `6 6 6`, l'autre sur `6 66` ». Sa règle finale :
 *
 *  1. **contigus** — trois rangs qui se suivent ET rien qui s'ouvre entre eux.
 *     Une frontière de découpage laisse un écart quatre fois et demie
 *     l'ordinaire ; trois chiffres séparés par ça s'énumèrent, ils ne se lisent
 *     pas `666`. Voir `dUnSeulTenant`, et `suivreLaLigne › LES FRONTIÈRES DE
 *     GROUPE` pour ce qui les suit ;
 *  2. **et ils le RESTENT jusqu'à la fin** — « seulement s'ils sont censés les
 *     avoir jusqu'à la fin ». La contiguïté est donc exigée sur chaque ligne
 *     connue, de l'instant du couronnement à la dernière étape avant le
 *     verdict. Si le rejeu rend la main avant, on renonce : ne pas savoir n'est
 *     pas savoir que oui ;
 *  3. **et la ligne d'arrivée au verdict N'ENTRE PAS EN COMPTE.** « Quand les
 *     666 sont déjà contigus et resteront assemblés de cette manière à la fin,
 *     ajoute-leur les cornes tout de suite en mode scène, même s'ils arrivent
 *     en 2ⁿᵈ ligne au verdict. » Ce module ignore donc superbement l'agencement
 *     final ; c'est `visuel/primitives/reveal.js` qui, au moment de l'agencer,
 *     fait s'effriter les cornes des triptyques relégués.
 *
 * ★ **Pourquoi ICI et pas dans le catalogue** (CONTRACTS §3.1, et le même
 * argument que pour le décor mutualisé des tables). Un opérateur ne voit que sa
 * propre étape : `m14` appliqué au « h » du deuxième `hope` ne peut savoir ni
 * que le « e » du premier et le tiret qui suit portent déjà un 6, ni que les
 * trois formeront une série au verdict. L'assemblage, lui, voit les deux choses
 * qu'il faut voir ensemble — **la suite complète des étapes** et **la liste des
 * jetons que le verdict révélera**, dans l'ordre. Il n'y a pas d'autre endroit
 * d'où la question puisse seulement se poser.
 *
 * ★ **Et le registre de codes n'est pas touché** (CONTRACTS §4.1, registre
 * CLOS). Aucun code neuf, aucun sens changé : ces couronnements ne sont pas une
 * ÉTAPE DE CALCUL, ils ne transforment aucune valeur, ils ne figurent dans
 * aucune URL. La même URL rend la même arithmétique qu'hier ; ce qui change,
 * c'est qu'on montre enfin ce qu'elle a écrit.
 *
 * ★ **Les séries qui ne se réunissent qu'au verdict n'ont PAS de couronnement
 * ici**, et c'est voulu : la contiguïté ne se constate pas encore. Sur
 * `hope-hope-hope.fr`, la cinquième série — le « p » et le « e » du troisième
 * `hope`, puis le 6 de `fr` — reste séparée par le point du nom de domaine
 * jusqu'à ce que `reveal` l'efface. Elle appartient au rang du bas, dont
 * `reveal` retire de toute façon les cornes (« seulement sur les 666 de la
 * ligne du haut », l'auteur) : le silence d'ici et l'effacement de là-bas
 * disent la même chose.
 *
 * ★ **Un couronnement DÉJÀ POSÉ n'est pas doublé.** Une moisson peut mêler des
 * portées qui passent par `m36` et d'autres non ; on ne recouronne pas ce que
 * l'opérateur a déjà couronné (un id de nœud de décor est dérivé du jeton, deux
 * couronnements sur le même 6 se disputeraient le même nœud).
 *
 * @param {Object[]} steps — modifié en place
 * @param {{id:string}[]} tokens
 * @param {string[]} aReveler — les jetons du verdict, dans l'ordre de la ligne
 * @param {'fr'|'en'} langue
 * @returns {number} le nombre de couronnements insérés
 */

function couronnerLesTriptyques(steps, tokens, aReveler, langue, cible = CIBLE_DEFAUT) {
  /* ★ HORS DE 666, AUCUNE CORNE — et la longueur des séries suit la cible.
     Point d'intégration entre deux chantiers menés en parallèle : celui des
     cornes, qui couronne les triptyques que personne ne couronnait, et celui
     des cibles, qui ouvre le verdict à une suite de chiffres quelconque.

     Deux raisons de s'arrêter net quand la cible n'est pas 666, et la première
     suffit : une corne de diable est l'emblème du 666, elle ne veut rien dire
     au-dessus d'un 111 ou d'un 007. La seconde est de méthode — les emblèmes
     propres aux autres cibles sont spécifiés mais pas encore dessinés
     (`.planning/A-VENIR-cibles.md`) : poser des cornes en attendant serait
     affirmer là où l'on prétend montrer.

     ⚠ Et la longueur d'une série ne vaut plus trois : elle vaut celle de la
     cible. Le `SERIE` en dur qui traînait ici venait d'un monde où le verdict
     ne pouvait être qu'un multiple de trois. Il est remplacé par la mesure,
     même si le garde-fou ci-dessus rend le cas inatteignable aujourd'hui — une
     constante fausse qui dort est une constante qui mordra. */
  if (!cible.defaut) return 0;
  const serie = cible.texte.length;

  // Le verdict ne découpe en séries que ce qui est fait de séries ENTIÈRES
  // (`decouperEnSeries`, `visuel/primitives/reveal.js`). Un verdict qui n'est
  // pas un multiple de la cible n'a pas de série à couronner.
  if (!aReveler.length || aReveler.length % serie !== 0) return 0;

  // ★ ON NE RECOURONNE JAMAIS UN 6 DÉJÀ COURONNÉ. Le nœud de décor est nommé
  //   d'après le jeton qu'il couronne (`@cornes:<id>`, `visuel/primitives/
  //   horns.js`) : deux couronnements sur un même chiffre se disputeraient le
  //   même identifiant, et la compilation échouerait au clic.
  //
  //   Depuis que les cornes ont quitté l'URL, cette fonction est le SEUL
  //   émetteur de `horns` du projet — plus aucun opérateur n'en pose (voir
  //   `transformations/mappeurs.js`, « CET OPÉRATEUR NE COURONNE PLUS »), et
  //   les séries d'un même verdict sont disjointes par construction. Le relevé
  //   ne devrait donc jamais rien trouver. On le garde quand même : c'est une
  //   garde de cohérence, pas une optimisation, et elle vaut exactement le peu
  //   qu'elle coûte le jour où un scénario relu d'ailleurs en portera.
  const deja = new Set();
  for (const st of steps) {
    for (const o of st.ops || []) {
      if (o.op === 'horns') for (const id of o.targets || []) deja.add(id);
    }
  }

  const lignes = suivreLaLigne(tokens, steps);
  // Jusqu'où la preuve doit porter : la dernière étape AVANT le verdict.
  // `reveal` rassemble et repose les séries — sa ligne n'existe pas dans le
  // rejeu, et elle n'aurait rien à dire de la contiguïté d'avant.
  const iVerdict = steps.findIndex((st) => (st.ops || []).some((o) => o.op === 'reveal'));
  const finDeLaPreuve = iVerdict < 0 ? steps.length : iVerdict;
  const poses = [];
  for (let rang = 0; rang * serie < aReveler.length; rang++) {
    const trio = aReveler.slice(rang * serie, rang * serie + serie);
    if (trio.some((id) => deja.has(id))) continue;
    // ★ L'INSTANT, et il n'y en a QU'UN : celui où le trio est au complet.
    //
    // Non pas « le premier step où les trois se touchent », mais « le step où
    // le troisième arrive » — et l'on regarde alors s'il arrive CONTRE les deux
    // autres. La nuance n'est pas de rythme, elle est de nature, et c'est
    // exactement celle que le vocabulaire tient depuis le début
    // (CONTRACTS §3.1, amendement `horns`) :
    //
    //  · trois 6 déjà côte à côte au moment où le dernier paraît, c'est un 666
    //    qu'on CONSTATE — « on ne le fabrique pas, on le lit » ;
    //  · trois 6 qui ne se touchent qu'après qu'on a ôté ce qui les séparait,
    //    c'est un 666 qu'on RASSEMBLE — l'autre geste, celui qui s'avoue une
    //    fois, juste avant le verdict, et qui coûte au score.
    //
    // Chercher « le premier step où ils se touchent » confondrait les deux : sur
    // `https://hope-hope-hope.fr/`, une série ne devient contiguë qu'au moment
    // où « On ne garde que les 6 » fait tomber ce qui l'encombrait. Y planter
    // des cornes, ce serait couronner le tri en prétendant l'avoir trouvé —
    // et, accessoirement, glisser une étape entre le tri et le verdict, que ce
    // module s'interdit par ailleurs.
    let complet = -1;
    for (let k = 0; k < lignes.length; k++) {
      // La ligne a perdu le fil : plus rien n'est démontrable au-delà, et l'on
      // ne couronne jamais au jugé (voir `suivreLaLigne`).
      if (!lignes[k]) break;
      if (trio.every((id) => lignes[k].ids.includes(id))) { complet = k; break; }
    }
    if (complet < 0) continue;
    // ★ DEUXIÈME CONDITION : d'un seul tenant, et pas seulement à la suite.
    //   Trois rangs consécutifs ne font pas un 666 si une frontière de groupe
    //   passe entre deux d'entre eux — voir `suivreLaLigne`, « LES FRONTIÈRES
    //   DE GROUPE », et les deux cornes fautives que l'auteur a relevées.
    if (!dUnSeulTenant(lignes[complet], trio)) continue;
    // ★ TROISIÈME CONDITION : et ça TIENT jusqu'au bout.
    //
    //   « Seuls les 666 non séparés reçoivent des cornes anticipées, et encore,
    //   seulement s'ils sont censés les avoir jusqu'à la fin » (l'auteur). Un
    //   triptyque que la suite disperserait, ou qu'un découpage écarterait,
    //   serait couronné sur une promesse que la démonstration ne tient pas —
    //   c'est le mensonge visuel que ce projet refuse partout ailleurs.
    //
    //   On l'exige donc sur CHAQUE ligne connue, jusqu'à la dernière avant le
    //   verdict. Et si le rejeu a rendu la main plus tôt, on renonce : ne pas
    //   savoir n'est pas savoir que oui. La seule ligne dont on se passe est
    //   celle du verdict lui-même, qui n'existe pas — `reveal` RASSEMBLE, il
    //   repose les séries côte à côte, et c'est justement ce qu'il montre.
    let tient = true;
    for (let k = complet + 1; k < finDeLaPreuve; k++) {
      if (!lignes[k] || !dUnSeulTenant(lignes[k], trio)) { tient = false; break; }
    }
    if (!tient) continue;
    poses.push({ rang, trio, apres: complet });
  }
  if (!poses.length) return 0;

  // De la fin vers le début : insérer une étape en amont décalerait les places
  // visées par les suivantes. À place égale, du dernier triptyque au premier,
  // pour que l'ordre de lecture reste celui des séries.
  for (const p of [...poses].sort((a, b) => b.apres - a.apres || b.rang - a.rang)) {
    steps.splice(p.apres + 1, 0, {
      id: `s${steps.length}`,
      title: MOTS.couronner[langue],
      caption: MOTS.couronnerLegende[langue],
      // ★ Aucun `efface` : c'est tout le propos. `m36` couronnait ET tronquait ;
      // ici il n'y a rien à jeter — ce qui entoure ce 666 est un autre 666, ou
      // le sera. La primitive accepte la liste vide sans rien changer d'autre
      // (`visuel/primitives/horns.js`), et `mutualiserDecor` sait déjà qu'un
      // couronnement qui n'efface pas ne touche pas à la ligne.
      ops: [{ op: 'horns', targets: [...p.trio] }],
      hold: DUREE_CHARNIERE,
    });
  }
  // Les identifiants suivent la lecture ; `reglerLesCornes` les repose de toute
  // façon, mais un scénario ne doit à aucun moment porter deux fois le même.
  steps.forEach((s, i) => { s.id = `s${i}`; });
  return poses.length;
}

/**
 * ★ LE COURONNEMENT AU PLUS TÔT — et il n'y a plus que ce moment-là à régler.
 *
 * **Ce que cette fonction faisait, et ne fait plus.** Elle réglait DEUX
 * horloges. `m36` émettait un geste unique — les cornes poussaient pendant que
 * le reste de la séquence s'effaçait — et il fallait le scinder : avancer le
 * couronnement dès que les trois 6 contigus existaient, repousser l'effacement
 * jusqu'au seul geste d'écartement que la démonstration s'autorise, juste avant
 * le verdict.
 *
 * Les deux moitiés ont depuis été séparées à la source. Le couronnement
 * n'appartient plus à aucun opérateur : il est posé par l'assemblage, sur la
 * LIGNE et selon le REGISTRE (`couronnerLesTriptyques`), et il est posé
 * d'emblée à l'instant où le triptyque s'écrit. L'effacement, lui, reste chez
 * `m36` — c'est sa part d'arithmétique, celle que l'URL nomme —, et il y est
 * devenu une étape à part entière, avec son motif montré avant d'être exercé
 * (`transformations/mappeurs.js`). Il n'y a donc plus rien à différer : ce qui
 * s'efface s'efface là où le code le dit.
 *
 * **Ce qu'il reste à faire ici, et pourquoi ce n'est pas rien.** Un
 * couronnement peut encore GAGNER une étape sur la place où l'assemblage l'a
 * posé — quand les trois 6 sont là depuis le départ, par exemple sur la saisie
 * `666`, où aucune étape ne les a fait naître. `placeDuCouronnement` mesure ce
 * gain, en vérifiant qu'aucune étape traversée ne change l'ordre des rangs ;
 * `jalonsDesCornes` le publie pour le barème. C'est le seul geste qui reste, et
 * il ne se joue que là où il est prouvé.
 *
 * ★ **L'ordre des deux gestes ne s'inverse jamais.** Le contrôle croisé des
 * cornes exige que la contiguïté soit vérifiée sur la ligne TELLE QU'ELLE EST,
 * avant tout effacement (`visuel/primitives/horns.js`). Le couronnement ne fait
 * que remonter, jamais descendre : le verrou est donc plus serré, pas plus
 * lâche. La primitive continue de lire une ligne pleine.
 *
 * @param {Array} steps — modifié en place
 * @returns {Object|null} les jalons, pour le score (voir `jalonsDesCornes`)
 */
function reglerLesCornes(steps) {
  const couronnements = [];
  for (let i = 0; i < steps.length; i++) {
    const ops = steps[i].ops || [];
    if (ops.length !== 1 || ops[0].op !== 'horns') continue;
    couronnements.push({ index: i, op: ops[0] });
  }
  if (!couronnements.length) return null;

  // ── 1. jusqu'où chaque couronnement peut-il remonter ? ───────────────────
  for (const c of couronnements) {
    c.origine = c.index;
    c.cible = placeDuCouronnement(steps, c.index);
  }

  // ── 2. on déplace, du plus tardif au plus précoce ────────────────────────
  //
  // De la fin vers le début : déplacer un step antérieur décalerait les index
  // des suivants, et c'est le genre de bug qu'on ne voit qu'à la troisième
  // paire de cornes.
  for (const c of [...couronnements].sort((a, b) => b.origine - a.origine)) {
    if (c.cible === c.origine) continue;
    const [st] = steps.splice(c.origine, 1);
    steps.splice(c.cible, 0, st);
  }

  /* ★ LE REPORT DE L'EFFACEMENT A DISPARU — et avec lui une garde de libellé.

     Tant que `m36` faisait un seul geste indivisible — couronner ET effacer —,
     l'assemblage pouvait avancer le couronnement et repousser l'effacement
     jusque devant le verdict, où il rejoignait le tri. D'où une précaution :
     ce tri s'était dit « majoritaire » sur la ligne qu'il avait alors sous les
     yeux, et lui joindre des valeurs qu'il n'avait pas comptées pouvait rendre
     cette affirmation fausse — `m36` tronquant à trois chiffres d'affilée,
     `[6,6,6,6]` y perdait son quatrième. On retirait donc l'affirmation.

     `m36` n'émet plus de cornes : il ne lui reste que sa gomme, qui se joue à
     SON étape, avec son motif montré avant d'être exercé. Il n'y a donc plus
     rien à reporter, plus rien à joindre au tri, et plus rien à retirer. La
     garde n'est pas supprimée parce qu'elle gênait : elle est supprimée parce
     que le cas qu'elle traitait ne peut plus se produire.

     ⚠ Si un jour un geste redevient scindable en « montrer ici, effacer
     là-bas », c'est cette précaution-là qu'il faudra remettre : une étape qui
     affirme une majorité ne doit jamais voir tomber, dans le même mouvement,
     ce qu'elle n'a pas compté. */

  // Les identifiants suivent la lecture : `s0`, `s1`… dans l'ordre où les
  // étapes se jouent. Rien n'en dépend hors du scénario (l'URL ne les porte
  // pas), mais un `s12` joué avant un `s9` rendrait tout journal illisible.
  steps.forEach((s, i) => { s.id = `s${i}`; });

  return jalonsDesCornes({ steps }, couronnements);
}

/**
 * LE REGISTRE SOBRE — les cornes ne poussent pas, et la trouvaille se dit
 * quand même.
 *
 * ★ **Ce qu'on retire, c'est le DESSIN, et rien d'autre.** Un couronnement ne
 * transforme aucune valeur : il constate que trois 6 sont écrits côte à côte
 * (`couronnerLesTriptyques`). Le registre sobre ne peut donc pas le supprimer
 * sans supprimer un constat — il le RÉÉCRIT dans ce que le vocabulaire sait
 * dire de plus sobre : on DÉSIGNE les trois 6 (`highlight`), sans rien poser
 * dessus.
 *
 * La LÉGENDE ne bouge pas, le titre non plus, le nombre d'étapes non plus. Le
 * spectateur lit la même démonstration, avec la même justification écrite dans
 * Le Registre ; seule la mise en scène a changé, ce qui est très exactement la
 * promesse du registre — même programme, même verdict, même score, même rang,
 * deux mises en scène.
 *
 * ★ **Et `efface` n'existe plus ici.** Le geste des cornes ne portait un
 * effacement que du temps où `m36` les émettait, couronnement et troncature
 * d'un seul tenant. Les deux ont été séparés à la source : l'effacement est
 * resté chez `m36`, sous forme d'étape à part entière, identique dans les deux
 * registres (`transformations/mappeurs.js`). On garde néanmoins la branche —
 * la primitive accepte toujours un `efface`, et un scénario relu d'ailleurs
 * pourrait en porter un.
 *
 * ★ **Les verrous du contrôle croisé ne sont pas relâchés.** Ils ont déjà joué
 * quand cette fonction s'exécute : l'assemblage n'a couronné qu'un triptyque
 * d'un seul tenant, vérifié sur la ligne rejouée et jusqu'au verdict. Ce que la
 * réécriture fait disparaître, c'est le troisième verrou
 * (`primitives/horns.js`), et il n'a plus rien à vérifier puisqu'il n'y a plus
 * de couronne à mériter.
 *
 * @param {Array} steps — modifié en place
 * @returns {null} aucun jalon : sans couronnement, il n'y a rien à mesurer
 */
function sobrifierLesCornes(steps) {
  for (const st of steps) {
    const ops = st.ops || [];
    const i = ops.findIndex((o) => o && o.op === 'horns');
    if (i < 0) continue;
    const { targets, efface } = ops[i];
    const sobre = [{ op: 'highlight', targets: [...targets] }];
    // `efface` peut être vide — un 666 qui occupe déjà toute la ligne n'a rien
    // autour de lui. Un `drop` sans cible serait refusé par `validerFormeOp`.
    if (efface && efface.length) {
      sobre.push({ op: 'drop', targets: [...efface], mode: 'erase', regroup: false });
    }
    ops.splice(i, 1, ...sobre);
  }
  return null;
}

/**
 * ★ CE QUE LES CORNES DISENT AU SCORE — l'information, rendue disponible.
 *
 * « Les amener à l'étape 5 plutôt qu'à l'étape 9 devrait apporter un bonus de
 * score » (l'auteur). Le calcul de ce bonus appartient au barème
 * (`src/recherche/score.js`), qui est en cours de remaniement ; ce module ne
 * décide de rien, il MESURE et publie. Trois grandeurs, et elles suffisent :
 *
 *  · `total` — le nombre d'étapes de la démonstration. Un couronnement à la
 *    sixième d'une démonstration qui en compte vingt-trois n'a pas la même
 *    valeur que le même rang sur une démonstration qui en compte sept ;
 *  · `couronnements[].etape` — le rang (à partir de 1) de chaque couronnement,
 *    et `part`, ce rang ramené au total. C'est la « rapidité d'apparition »
 *    dont parle l'auteur ;
 *  · `premier` — le plus précoce des couronnements, celui qui marque
 *    l'apparition du premier 666 contigu.
 *
 * `avance` dit combien d'étapes le couronnement a gagné sur la place où
 * l'opérateur l'avait posé : zéro quand la vérification a refusé l'avance.
 *
 * Fonction PURE : elle se relit sur un scénario seul, y compris un scénario
 * relu d'ailleurs. Le champ `scenario.cornes` en est le résultat mémorisé.
 */
export function jalonsDesCornes(scenario, mesures = null) {
  const steps = (scenario && scenario.steps) || [];
  const total = steps.length;
  const parIndex = new Map();
  if (mesures) for (const m of mesures) parIndex.set(m.op, m.origine - m.cible);
  const couronnements = [];
  steps.forEach((s, i) => {
    for (const o of s.ops || []) {
      if (o.op !== 'horns') continue;
      couronnements.push({
        jetons: [...(o.targets || [])],
        etape: i + 1,
        part: total ? Math.round(((i + 1) / total) * 1000) / 1000 : 0,
        avance: parIndex.get(o) ?? 0,
      });
    }
  });
  return {
    total,
    couronnements,
    premier: couronnements.length ? couronnements[0].etape : null,
  };
}

export function construireScenario(approche, ctx = {}) {
  const saisie = String(ctx.saisie ?? approche.saisie ?? '').normalize('NFC');
  const langue = ctx.langue === 'en' ? 'en' : LANGUE_DEFAUT;
  // Le REGISTRE de mise en scène (`src/recherche/url.js`). Il ne touche qu'à
  // UNE chose dans ce module — les cornes —, et rien d'autre : ni les codes,
  // ni les valeurs, ni le verdict, ni le nombre de jetons. Une valeur inconnue
  // vaut « scénique », comme dans la grammaire d'URL.
  // ★ La CIBLE — la suite de chiffres que la démonstration doit écrire. Elle
  //   décide de ce qu'on récolte, de ce qu'on jette et de ce que le verdict
  //   annonce. `666` par défaut, et tout ce module se replie alors exactement
  //   sur ce qu'il faisait avant qu'elle existe.
  const cible = normaliserCible(ctx.cible || approche.cible);
  // ★ Et la mise en scène se REPLIE sur « sobre » dès que la cible n'a pas
  //   d'emblème. Les cornes sont celles du 666 ; il n'y a rien à jouer au-dessus
  //   d'un 111 tant que l'auréole n'est pas dessinée
  //   (`.planning/A-VENIR-cibles.md`), et jouer des cornes serait pire que ne
  //   rien jouer. `url.js › registreEffectif` applique la même règle à la
  //   lecture d'un lien ; on la répète ici parce que `construireScenario` est
  //   aussi appelé sans lien du tout (démonstration de secours).
  const registre = ctx.registre === 'sobre' || !cible.defaut ? 'sobre' : 'scenique';
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
  const recolteTotale = compterMoisson(approche.parts, cible);
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

  // ★ LES RETOUCHES — l'étage qui RÉÉCRIT la saisie avant qu'on la lise
  //   (`url.js`, la notation `2.1:fr13;…`). La scène part donc du texte TAPÉ,
  //   pas du texte retouché : c'est justement la réécriture qu'il faut montrer,
  //   sans quoi le spectateur verrait « Gehzc » apparaître sans savoir d'où il
  //   sort. Les portées des fragments, elles, se rapportent au texte RETOUCHÉ —
  //   c'est celui qui existe quand ils entrent en scène.
  const retouches = approche.retouches || [];
  const saisieLue = retouches.length
    ? String(approche.saisieRetouchee ?? saisie).normalize('NFC')
    : saisie;

  // Chaque caractère de la saisie est un token, étiqueté du groupe de la part
  // qui l'exploite. Le groupe permet d'atténuer le hors-fragment par sélecteur
  // `{groupNot}` — qui ne retient que les tokens VIVANTS, contrairement à une
  // liste d'ids figée qui pointerait des tokens déjà consommés.
  const groupeDe = new Array(saisieLue.length).fill(null);
  partsUniques.forEach((part, i) => {
    // Sur une convergence, les trois parts couvrent les mêmes positions : le
    // tag de groupe irait au dernier arrivé et les sélecteurs `{group}` se
    // tromperaient de cible. Les copies porteront leurs ids en clair.
    if (convergente && i > 0) return;
    for (const pos of positionsDe(part.fragment, saisieLue.length)) groupeDe[pos] = `p${i}`;
  });
  // ★ **Sous retouche, AUCUN tag de groupe.** L'étiquette est posée à la
  //   déclaration du token, une fois pour toutes ; or les jetons que la
  //   retouche fait naître n'existent pas encore ici, et une retouche peut
  //   allonger ou raccourcir ce qu'elle touche — les positions du texte lu ne
  //   sont alors plus celles du texte tapé. Étiqueter d'après `saisieLue`
  //   désignerait les mauvais caractères. On désigne donc les jetons EN CLAIR
  //   (`cibleGroupe` ci-dessous), ce qui est licite ici parce que la retouche
  //   passe AVANT tout le monde : les ids qu'on nomme sont vivants.
  const marquerLesGroupes = retouches.length === 0;
  const tokens = [...saisie].map((c, i) => {
    const id = `t${i}`;
    alloc.reserver(id);
    const t = { id, text: c, kind: genreDe(c) };
    if (marquerLesGroupes && groupeDe[i]) t.group = groupeDe[i];
    return t;
  });
  // La ligne des identifiants, POSITION PAR POSITION dans le texte courant. Elle
  // suit les retouches : ce qui remplace « Trump » prend la place de « Trump ».
  let idsParPosition = tokens.map((t) => t.id);

  const steps = [];
  const resultats = [];
  // Ce que les portées d'une moisson écartent, en attendant le geste unique qui
  // le montrera juste avant le verdict (voir `recolterLesSix`). Les VALEURS
  // voyagent avec les identifiants : le tri final doit pouvoir dire si ce qu'il
  // garde est majoritaire sur la ligne, et une ligne ne se compte pas sur des
  // identifiants.
  const rejets = { ids: [], valeurs: [] };
  // Les valeurs des jetons de `resultats`, dans le même ordre — voir
  // `recolterLesSix` : sur une cible non homogène, le verdict doit relire la
  // SUITE et non compter des occurrences.
  const valeursFinales = [];
  // ★ LES SURNUMÉRAIRES — les 6 en trop qui ne tombent PAS avant le verdict.
  //   Ils restent sur la ligne jusqu'au bout, se rassemblent avec les autres,
  //   et c'est le verdict qui les fait exploser (voir `lesPlusCentraux` et
  //   `visuel/primitives/reveal.js`). Ils ne sont donc jamais dans `resultats` :
  //   ce n'est pas eux qu'on révèle, c'est eux qui poussent.
  let surnumeraires = [];
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
          // ★ LA PROVENANCE — le code de l'opérateur qui a produit ce bloc.
          //   Elle ne change rien à ce qui est joué ; elle dit seulement QUI
          //   l'a demandé. Sans elle, personne ne peut isoler « l'étape de
          //   `mpf` » dans une timeline où les steps ne portent qu'un numéro :
          //   la page de debug devrait recouper des titres, c'est-à-dire une
          //   table de correspondance recopiée qui mentirait au premier
          //   renommage (`app/pages/debug.js`). Le verdict, la récolte et les
          //   retouches n'en portent pas : ils ne viennent d'aucun opérateur.
          code: op.code,
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
    return { blocs: g.blocs.map((b) => ({ ...b, code: op.code, hold: undefined })), courants: g.courants };
  };

  const poserBloc = (b, suffixe = '') => {
    if (!b.ops || !b.ops.length) return null;
    const st = { id: `s${nStep++}`, title: b.titre + suffixe, ops: b.ops, hold: b.hold === undefined ? DUREE_CHARNIERE : b.hold };
    if (b.legende) st.caption = b.legende;
    if (b.figure) st.figure = b.figure;
    // ★ La marque du TRI (« On ne garde que les 6 »), transportée jusqu'au
    // réglage des cornes : c'est le seul geste d'écartement que le scénario
    // s'autorise, et l'effacement différé des cornes doit le REJOINDRE plutôt
    // que de se poser à côté de lui. Deux gommes qui se suivent diraient qu'on
    // a écarté deux fois — voir `reglerLesCornes`.
    if (b.recolte) st.recolte = b.recolte;
    // La provenance survit à la pose (voir `produire`) et à la fusion.
    if (b.code) st.code = b.code;
    steps.push(st);
    return st;
  };

  // ── L'ÉTAGE DES RETOUCHES, joué EN PREMIER ────────────────────────────────
  //
  // Une retouche réécrit une portée de la saisie, et ce qui suit lit le
  // résultat (`url.js`, la notation `2.1:fr13;…`). À l'écran c'est un geste
  // ordinaire — on désigne un passage, on le transforme —, à ceci près que ce
  // qui en sort ne quitte pas la ligne : il y reprend exactement la place de ce
  // qu'il remplace, et la démonstration continue sur le mot voisin comme si de
  // rien n'était. C'est toute la différence avec un fragment : un fragment
  // EXTRAIT et rend un chiffre, une retouche RÉÉCRIT et rend du texte.
  //
  // ★ Il fallait que ce soit montré, et pas seulement calculé. Le moteur, lui,
  //   pourrait très bien partir du texte retouché : `rejouer` le construit
  //   d'avance. Mais la scène qui commencerait là afficherait « Donald Gehzc »
  //   au lever de rideau, c'est-à-dire une saisie que personne n'a tapée —
  //   exactement le genre d'escamotage que le décret a valu à ce projet.
  let texteCourant = saisie;
  for (const r of retouches) {
    const positions = positionsDe(r.fragment, texteCourant.length);
    if (!positions.length) continue;
    const vises = positions.map((k) => idsParPosition[k]);
    const autres = idsParPosition.filter((_, k) => !positions.includes(k));
    if (autres.length) {
      poserBloc({
        titre: MOTS.retoucher[langue],
        legende: citer(r.fragment.texte, langue),
        // ★ ON DÉSIGNE, ON N'ÉTEINT PAS — et c'est un arbitrage de l'auteur.
        //
        //   Ce bloc estompait tout le reste de la ligne. Sur
        //   `2.1:fr13;0.1+2.1:tca+m14+mpf`, la retouche porte sur le SECOND mot,
        //   si bien que la scène ouvrait en grisant « Donald » — « commencé par
        //   2.1 grise le premier mot alors qu'il va servir ensuite ». Estomper
        //   veut dire « celui-là, on ne le lira pas » : c'est vrai quand on
        //   isole un fragment et qu'on abandonne le reste (`jouerSeul`,
        //   `isolerPassage`), c'est faux ici, où toute la ligne sera lue une
        //   fois la retouche faite.
        //
        //   Le `highlight` en mode `select` suffit à dire lequel on retouche —
        //   c'est déjà le choix fait pour `isolerMorceau` quand plusieurs
        //   morceaux vont servir, et pour la même raison.
        ops: [{ op: 'highlight', targets: vises, mode: 'select' }],
      });
    }
    let courants = positions.map((k) => [idsParPosition[k]]);
    for (let i = 0; i < r.chemin.ops.length; i++) {
      const avant = r.chemin.etats[i];
      const apres = r.chemin.etats[i + 1];
      if (rienAMontrer(avant, apres)) continue;
      const rendu = produire(r.chemin.ops[i], avant, apres, courants);
      for (const b of rendu.blocs) poserBloc(b);
      courants = rendu.courants;
    }
    const fin = r.chemin.etats[r.chemin.etats.length - 1];
    const remplacants = courants.flat();
    // ★ Le contrôle qui vaut mieux qu'une scène fausse. Les portées qui suivent
    //   comptent en POSITIONS du texte retouché ; si la ligne ne porte pas
    //   autant de jetons que ce texte a de signes, tout ce qui vient après
    //   désignerait à côté. On préfère le dire — la page sait afficher un échec
    //   de rendu — plutôt que de montrer une démonstration décalée d'un cran.
    if (remplacants.length !== [...String(fin.valeur)].length) {
      throw new ErreurRendu(
        `retouche « ${r.chemin.ops.map((o) => o.code).join('+')} » : `
        + `${remplacants.length} jeton(s) à l'écran pour ${String(fin.valeur).length} signe(s) réécrit(s)`,
        r.chemin.ops[r.chemin.ops.length - 1],
      );
    }
    idsParPosition = [
      ...idsParPosition.slice(0, positions[0]),
      ...remplacants,
      ...idsParPosition.slice(positions[positions.length - 1] + 1),
    ];
    texteCourant = texteCourant.slice(0, r.fragment.offset) + String(fin.valeur)
      + texteCourant.slice(r.fragment.offset + r.fragment.longueur);
  }

  // ── Le découpage en sous-groupes ──────────────────────────────────────────
  // Quand la saisie porte plusieurs morceaux — `hope-hope-hope`, typiquement —
  // le tout premier geste est de MONTRER le découpage : trois accolades
  // numérotées, tracées ensemble. Sans lui, la démonstration passait du premier
  // morceau au deuxième sans jamais dire qu'il y en avait trois, ni qu'ils
  // étaient comparables — alors que c'est la promesse du README.
  const groupes = partsUniques.map((part, i) => ({
    part,
    tag: `p${i}`,
    positions: positionsDe(part.fragment, saisieLue.length),
    courants: positionsDe(part.fragment, saisieLue.length).map((k) => [idsParPosition[k]]),
  }));
  const horsGroupe = idsParPosition.filter((_, i) => groupeDe[i] === null);
  /**
   * Désigner un groupe : par son TAG quand les jetons le portent, par leurs
   * IDENTIFIANTS sinon. Les deux écritures disent la même chose au moment où
   * elles sont posées ; le tag a le mérite de ne retenir que les jetons encore
   * vivants, ce qui n'a d'importance qu'après la naissance du groupe — et sous
   * retouche il n'y a pas de tag du tout (voir plus haut).
   */
  const cibleGroupe = (g) => (marquerLesGroupes
    ? { group: g.tag }
    : g.positions.map((k) => idsParPosition[k]));
  const cibleHorsGroupe = (g) => (marquerLesGroupes
    ? { groupNot: g.tag }
    : idsParPosition.filter((_, k) => !g.positions.includes(k)));

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

  // ★ LE PARCOURS HORIZONTAL — une opération à la fois, sur tous les morceaux
  //   qui la partagent, plutôt qu'un programme entier morceau par morceau.
  //
  //   « `ffr3` devrait être appliqué aux 3 blocs, puis `tca` aux 3 blocs, puis
  //   `m14` aux 3 blocs, puis `mpf` aux 3 blocs — et non `ffr3+tca+m14+mpf` au
  //   premier bloc, puis au 2ᵈ, puis au 3ᵉ. Ce parcours horizontal est d'autant
  //   plus important pour que les versions redites soient optimisées »
  //   (l'auteur). Deux raisons, et la seconde est la plus forte :
  //
  //   · ce qu'on démontre, c'est UNE méthode appliquée à plusieurs morceaux.
  //     La jouer en entier sur le premier, puis en entier sur le second, montre
  //     trois démonstrations qui se ressemblent ; la jouer geste par geste sur
  //     les trois montre une seule démonstration, à trois endroits ;
  //   · une redite ne s'accélère qu'entourée de ses pareilles
  //     (`visuel/compile.js › repeatAccelerables`). En vertical, chaque geste
  //     est isolé entre deux gestes différents et garde son rythme plein ; en
  //     horizontal, les répétitions se touchent et l'accélération peut jouer.
  //
  //   ⚠️ CE N'EST PLUS TOUT OU RIEN. La mise en parallèle exigeait que TOUS les
  //   morceaux partagent la même méthode ; il suffisait qu'un seul diffère pour
  //   que la voie entière retombe en vertical. On regroupe donc par méthode :
  //   les morceaux qui se lisent pareil forment un PAQUET joué horizontalement,
  //   et les paquets s'enchaînent dans l'ordre de leur premier membre. Un
  //   paquet d'un seul morceau se joue comme avant — c'est le même code.
  const paquets = [];
  {
    const parSignature = new Map();
    for (const g of groupes) {
      const sig = signatureChemin(g.part.chemin);
      if (!parSignature.has(sig)) {
        const neuf = [];
        parSignature.set(sig, neuf);
        paquets.push(neuf);
      }
      parSignature.get(sig).push(g);
    }
    ordonnerLesPaquets(paquets);
  }

  /**
   * ★ **L'ORDRE DES PAQUETS — de gauche à droite, sauf quand l'un ENJAMBE
   *   l'autre.**
   *
   * > « S'il n'y a pas de regroupement, continue de gauche à droite. S'il y a
   * >   regroupement, par défaut reste de gauche à droite, mais pour chaque
   * >   groupe, compare-le à chacun des autres. Nommons deux groupes A et B : si
   * >   A a un fragment avant ceux de B et un fragment après ceux de B, alors le
   * >   groupe ayant le plus de caractères est traité en premier. »
   * >   (l'auteur)
   *
   * ★ **POURQUOI L'ENJAMBEMENT, ET LUI SEUL.** Deux paquets qui se suivent sur
   *   la ligne se lisent dans l'ordre de la ligne, et il n'y a rien à arbitrer.
   *   Mais quand A commence avant B ET finit après lui, aucun des deux n'est
   *   « à gauche » de l'autre : l'ordre de lecture ne tranche plus, il faut un
   *   autre critère. Celui de l'auteur est la MASSE — le paquet qui porte le
   *   plus de caractères de la saisie passe devant, parce que c'est lui que le
   *   spectateur tient pour le sujet principal.
   *
   * ★ **UNE SÉLECTION, PAS UN TRI.** « A enjambe B » n'est pas une relation
   *   d'ordre : trois paquets peuvent s'enjamber en rond, et un comparateur non
   *   transitif rendrait un résultat qui dépend de l'algorithme de tri du
   *   moteur JavaScript — c'est-à-dire de l'entropie, que §4.4 interdit. On
   *   choisit donc explicitement, un paquet à la fois : le plus à gauche, sauf
   *   si un autre l'enjambe ET pèse plus lourd. À poids égal, le plus à gauche
   *   gagne — la comparaison est STRICTE, et c'est ce qui rend le choix unique.
   */
  function ordonnerLesPaquets(paquets) {
    if (paquets.length < 2) return;
    const bornes = new Map();
    for (const p of paquets) {
      let min = Infinity;
      let max = -Infinity;
      let taille = 0;
      for (const g of p) {
        const f = (g.part && g.part.fragment) || {};
        const d = Number.isInteger(f.offset) ? f.offset : 0;
        const l = Number.isInteger(f.longueur) ? f.longueur : 0;
        if (d < min) min = d;
        if (d + l > max) max = d + l;
        taille += l;
      }
      bornes.set(p, { min, max, taille });
    }
    // A enjambe B : A commence avant lui ET finit après lui.
    const enjambe = (a, b) => bornes.get(a).min < bornes.get(b).min
      && bornes.get(a).max > bornes.get(b).max;

    const reste = [...paquets].sort((a, b) => bornes.get(a).min - bornes.get(b).min);
    const sortie = [];
    while (reste.length) {
      let choisi = 0;
      for (let i = 1; i < reste.length; i++) {
        const c = reste[i];
        const t = reste[choisi];
        if ((enjambe(c, t) || enjambe(t, c)) && bornes.get(c).taille > bornes.get(t).taille) {
          choisi = i;
        }
      }
      sortie.push(reste[choisi]);
      reste.splice(choisi, 1);
    }
    paquets.length = 0;
    paquets.push(...sortie);
  }

  /** Un paquet de morceaux qui se lisent pareil : un geste à la fois, pour tous. */
  const jouerEnsemble = (membres) => {
    const nbOps = membres[0].part.chemin.ops.length;
    for (let i = 0; i < nbOps; i++) {
      const rendus = membres.map((g) => {
        const chemin = g.part.chemin;
        const avant = chemin.etats[i];
        const apres = chemin.etats[i + 1];
        if (rienAMontrer(avant, apres)) return null; // le spectateur verrait la même chose
        return produire(chemin.ops[i], avant, apres, g.courants);
      });
      const actifs = rendus.filter(Boolean);
      if (!actifs.length) continue;

      // Fusionnable ? Alors la transformation s'applique à chaque morceau
      // SIMULTANÉMENT — c'est littéralement « trois d'affilée, selon la même
      // méthode ». Sinon (une somme par morceau, une accolade par morceau, une
      // caméra par morceau), on les enchaîne : la règle reste la même, elle se
      // répète sous les yeux, et c'est déjà mieux que trois programmes entiers.
      const fusionnes = actifs.length === membres.length ? fusionnerBlocs(actifs.map((r) => r.blocs)) : null;
      if (fusionnes) {
        for (const b of fusionnes) poserBloc(b);
      } else {
        // ★ ET QUAND LA FUSION EST IMPOSSIBLE, ON DÉROULE MORCEAU PAR MORCEAU —
        //   mais toujours À L'INTÉRIEUR DE L'OPÉRATION.
        //
        //   Certaines transformations ne se jouent pas à trois endroits en même
        //   temps : un afficheur à quatorze segments monte un décor et recule la
        //   caméra, trois d'un coup se contrediraient. Le repli d'origine était
        //   de dérouler le PROGRAMME du morceau 1 en entier, puis celui du 2 —
        //   c'est-à-dire le parcours vertical qu'on vient de quitter, réintroduit
        //   par la bande. Ce n'est pas ce qu'on fait : la boucle qui englobe
        //   celle-ci est la boucle des opérations, et on n'en sort pas. Le
        //   parcours reste horizontal — `m14` partout, PUIS `mpf` partout.
        //
        //   ★ ARBITRÉ. J'avais entrelacé PAR RANG : la première lettre des deux
        //     morceaux, puis la deuxième des deux, et ainsi de suite. L'auteur a
        //     tranché l'inverse — « la partie 0.1+2.1 fait une action de chaque
        //     côté plutôt qu'une phase pour l'ensemble, puis la suivante […] il
        //     devrait faire de gauche à droite la phase m14 sur l'ensemble de la
        //     partie 0.1 puis l'ensemble de la partie 2.1 ». Mesuré sur
        //     `2.1:fr13;0.1+2.1:tca+m14+mpf` : la scène alternait `x1_0, x2_0,
        //     x1_1, x2_1…`, si bien que les cornes du premier triptyque
        //     tombaient au milieu des conversions du second.
        //
        //   ★ Et l'argument qui m'avait fait entrelacer se retourne : je
        //     cherchais à rendre voisins deux gestes identiques pour que
        //     l'accélération des redites joue (`visuel/compile.js ›
        //     repeatAccelerables`). Six conversions d'affilée SUR LE MÊME
        //     MORCEAU sont une redite plus longue et plus franche que deux
        //     morceaux qui se relaient — le décor mutualisé reste monté d'autant
        //     plus longtemps.
        actifs.forEach((r, k) => {
          const suffixe = actifs.length > 1 ? MOTS.suffixeGroupe(k + 1, langue) : '';
          for (const b of r.blocs) poserBloc(b, suffixe);
        });
      }
      rendus.forEach((r, k) => { if (r) membres[k].courants = r.courants; });
    }
    for (const g of membres) {
      // Une moisson dont plusieurs portées se lisent de la même façon passe par
      // ici — trois `hope` en quatorze segments, douze 6 d'un seul geste. Sans
      // récolte, la scène n'en révélait qu'un par morceau.
      const recolte = moisson
        ? recolterLesSix(g, g.part.chemin, poserBloc, langue, true, rejets, cible)
        : null;
      if (recolte) {
        resultats.push(...recolte.ids);
        valeursFinales.push(...recolte.valeurs);
        surnumeraires.push(...(recolte.surnumeraires || []));
        continue;
      }
      const dernier = g.courants.flat()[0];
      if (dernier) { resultats.push(dernier); valeursFinales.push(valeurTerminale(g.part.chemin)); }
    }
  };

  /** Un morceau seul de sa méthode : on l'isole, puis on le mène jusqu'au bout. */
  const jouerSeul = (g) => {
    const indexPart = groupes.indexOf(g);
    // Isolation du fragment (inutile s'il couvre déjà toute la saisie, et
    // inutile aussi si le découpage vient de la montrer).
    if (groupes.length === 1 && g.positions.length && g.positions.length < saisieLue.length) {
      poserBloc({
        titre: MOTS.isolerPassage[langue],
        legende: g.part.fragment ? citer(g.part.fragment.texte, langue) : null,
        ops: [
          { op: 'highlight', targets: cibleGroupe(g), mode: 'select' },
          { op: 'dim', targets: cibleHorsGroupe(g), at: 200 },
        ],
      });
    } else if (groupes.length > 1) {
      // Sur une convergence, les copies n'ont pas de tag de groupe (elles
      // naissent en cours de scène) : on désigne leurs ids en clair.
      const cibles = convergente ? g.courants.flat() : cibleGroupe(g);
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
    const recolte = recolterLesSix(
      g, chemin, poserBloc, langue, moisson, moisson ? rejets : null, cible,
    );
    if (recolte) {
      resultats.push(...recolte.ids);
      valeursFinales.push(...recolte.valeurs);
      surnumeraires.push(...(recolte.surnumeraires || []));
      return;
    }
    const dernier = g.courants.flat()[0];
    if (dernier) { resultats.push(dernier); valeursFinales.push(valeurTerminale(chemin)); }
  };

  for (const paquet of paquets) {
    if (paquet.length > 1) jouerEnsemble(paquet);
    else jouerSeul(paquet[0]);
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
    // ★ Ce qu'on garde, ce sont les positions qui ÉCRIVENT la cible — pas les
    //   `séries × 3` premières. Sur `666` les deux reviennent au même (tous les
    //   jetons récoltés valent 6, on prend le préfixe) ; sur `007`, non : la
    //   suite `0 7 0 0 7` n'écrit `007` qu'en sautant le deuxième jeton, et
    //   couper au préfixe révélerait `0 7 0` sous un verdict qui annonce `007`.
    const series = seriesDe(valeursFinales, cible, recolteTotale.series);
    // ★ Et l'APPOINT ne tombe plus forcément : quand les 6 récoltés sont
    //   interchangeables, celui (ou ceux) du milieu reste sur la ligne et
    //   c'est le verdict qui le fait exploser (`lesPlusCentraux`). Ce qui
    //   tombe ici se réduit alors aux valeurs FAUSSES — et sur « Donald
    //   Trump » il n'en reste aucune, si bien que l'étape entière disparaît.
    const boum = lesPlusCentraux(valeursFinales, series.flat(), cible);
    const garde = new Set(boum ? boum.gardes : series.flat());
    const explosifs = new Set(boum ? boum.surnumeraires : []);
    const reste = (i) => garde.has(i) || explosifs.has(i);
    const surplus = finaux.filter((_, i) => !reste(i));
    // Les valeurs suivent la même coupe que les jetons — c'est ce qui permet de
    // compter la ligne, gardés et tombés ensemble (`recolteMajoritaire`). Un
    // surnuméraire compte parmi les GARDÉS : il est encore là quand l'étape
    // s'achève, et ce qui est dit reste ce qui est montré.
    const restants = finaux.filter((_, i) => reste(i));
    const valeursRestantes = valeursFinales.filter((_, i) => reste(i));
    const surplusValeurs = valeursFinales.filter((_, i) => !reste(i));
    // ★ ON AJOUTE, ON N'ÉCRASE PAS. Les surnuméraires viennent de deux étages :
    //   chaque part en désigne un quand sa propre récolte en laisse un
    //   (`recolterLesSix`), et la récolte GLOBALE en désigne quand c'est la
    //   somme des parts qui dépasse. Écraser ici perdait les premiers — et sur
    //   « Donald Trump », dont chaque moitié rend son 6 de trop, il ne restait
    //   plus rien à faire exploser.
    surnumeraires.push(...finaux.filter((_, i) => explosifs.has(i)));
    finaux = finaux.filter((_, i) => garde.has(i));
    const aJeter = [...rejets.ids, ...surplus];
    const valeursJetees = [...rejets.valeurs, ...surplusValeurs];
    if (aJeter.length) {
      const majoritaire = recolteMajoritaire(valeursRestantes, valeursJetees, cible);
      const sacrifies = valeursJetees.some((v) => normaliserCible(cible).alphabet.includes(v));
      poserBloc({
        titre: MOTS.recolter(cible, majoritaire, langue, sacrifies),
        legende: MOTS.recolterLegende(
          recolteTotale.series, aJeter.length, cible, majoritaire, langue,
        ),
        recolte: {
          series: recolteTotale.series,
          jetes: aJeter.length,
          // L'écriture, pas l'objet : un step reste du JSON pur (CONTRACTS §3),
          // et `normaliserCible` relit une chaîne aussi bien qu'une cible.
          cible: cible.texte,
          majoritaire,
        },
        ops: [
          { op: 'highlight', targets: restants, mode: 'select' },
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
    // Autant de copies que la cible a de chiffres, et chacune porte LE SIEN.
    // Sur `666`, trois copies écrivant « 6 » — mot pour mot l'ancien code.
    const copies = cible.chiffres.map((d) => ({
      id: alloc.nouvel('x'), text: String(d), kind: 'number',
    }));
    nouvelleEtape(MOTS.resonance[langue], MOTS.resonanceLegende[langue],
      [{ op: 'substitute', pairs: [{ target: source, to: copies }], stagger: 140 }]);
    aReveler = copies.map((c) => c.id);
  }

  // ★ **LE VERDICT RASSEMBLE DANS L'ORDRE DE LA LIGNE, PAS DANS CELUI DES
  //   PORTÉES.**
  //
  // « Au verdict, tous les 6, peu importe l'ordre dans lequel ils ont été
  // convertis, doivent être rassemblés puis redécoupés par trio » (l'auteur).
  //
  // `aReveler` était construit en parcourant les PARTS, donc dans l'ordre où
  // l'approche les nomme — qui n'est pas l'ordre où elles s'affichent. Tant que
  // les deux coïncidaient, personne ne pouvait voir la différence. Ils cessent
  // de coïncider dès qu'une approche range ses portées autrement, ce que la
  // notation groupée encourage : `0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,…`
  // nomme ses places 0, 2, 4, 1, 3, 6 pour que les jumelles se touchent.
  //
  // `reveal` découpe alors des trios dont les jetons sont DISPERSÉS dans la
  // ligne — et l'auteur l'a vu : « les 6 n'étaient pas affichés/groupés
  // correctement lors du verdict ». Le moteur visuel n'y est pour rien : sa
  // primitive respecte l'ordre du tableau qu'on lui donne (`scene.resolve`), ce
  // qui est la bonne règle. C'est le tableau qui était dans le désordre.
  //
  // ⚠️ On trie donc sur la LIGNE MODÉLISÉE, celle que `suivreLaLigne` rejoue —
  //    la même source que le couronnement des cornes, qui découpe `aReveler` en
  //    trios lui aussi. Deux tris différents ici et là feraient couronner un
  //    triptyque que le verdict n'assemble pas, et le test d'accord entre les
  //    deux mesures rougirait — à raison.
  // ★ Relevé AVANT le tri : celui-ci recopie `aReveler` dans un tableau neuf,
  //   et comparer les références après lui ferait croire que le verdict révèle
  //   autre chose que ce que la récolte a rendu. C'est ce qui faisait taire
  //   l'explosion du 6 en trop sur « Donald Trump ».
  const verdictRecolte = aReveler === finaux;
  const ligneFinale = (() => {
    const suivies = suivreLaLigne(tokens, steps);
    for (let k = suivies.length - 1; k >= 0; k--) if (suivies[k]) return suivies[k].ids;
    return null;
  })();
  if (ligneFinale && aReveler.length > 1) {
    const rang = new Map(ligneFinale.map((id, i) => [id, i]));
    // Un jeton que le rejeu n'a pas su suivre garde sa place : on ne réordonne
    // que ce dont on est sûr, et jamais au jugé.
    if (aReveler.every((id) => rang.has(id))) {
      aReveler = [...aReveler].sort((a, b) => rang.get(a) - rang.get(b));
    }
  }
  // ★ Les surnuméraires n'appartiennent qu'au verdict d'une ligne récoltée. La
  //   résonance recopie UN chiffre en trois : elle n'a rien de trop à faire
  //   exploser, et les jetons qu'elle révèle ne sont même pas ceux d'avant.
  if (!verdictRecolte) surnumeraires = [];

  if (aReveler.length > 1) {
    // Pas de `move` ici : `reveal` efface lui-même les jetons écartés et laisse
    // le layout recentrer ce qui reste. Un `move ... to: 'front'` ne ferait plus
    // que tirer les chiffres vers la gauche pendant une demi-seconde, avant que
    // `reveal` ne défasse ce déplacement.
    // Le `hold` donne à la chute le temps d'exister : sans lui, le 666 atteint
    // sa taille pleine à la dernière milliseconde de la timeline, et le lecteur
    // s'arrête dessus au moment même où il finit de grandir.
    // ★ `serie` — la longueur d'une série, POUR CE VERDICT. La primitive
    //   `reveal` découpait en groupes de trois, ce qui n'a aucun sens sur `13`
    //   (deux chiffres) et se trompe de coupe sur toute cible qui n'en fait pas
    //   trois. Le nombre est DÉRIVÉ de la cible et voyage dans l'op, plutôt que
    //   d'être une constante recopiée dans le moteur visuel : c'était déjà la
    //   quatrième copie de « 3 » dans ce dépôt.
    // ★ `surnumeraires` — les 6 en trop, qui n'ont PAS été jetés en chemin et
    //   qui explosent une fois la ligne rassemblée (voir `lesPlusCentraux` et
    //   `visuel/primitives/reveal.js`). Le champ n'est écrit que s'il y en a :
    //   un verdict qui n'a rien de trop reste le scénario d'hier, à l'octet.
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || cible.texte, [
      {
        op: 'reveal', targets: aReveler, at: 250, stagger: 150, serie: cible.longueur,
        ...(surnumeraires.length ? { surnumeraires } : {}),
      },
    ], { hold: 1200 });
  } else {
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || cible.texte, [
      { op: 'reveal', targets: aReveler, serie: cible.longueur },
      { op: 'annotate', anchor: aReveler, text: ctx.resultat || cible.texte, place: 'below', at: 400 },
    ]);
  }

  // ★ Les CORNES sont remises à l'heure ici, et nulle part ailleurs — même
  //   raison que pour le décor des tables : `m36` ne voit que sa propre étape,
  //   et ne peut donc savoir ni quand ses trois 6 sont nés, ni ce que la suite
  //   leur fera. Avant `mutualiserDecor`, parce que déplacer une étape change
  //   les séries qu'une table traverse.
  //
  // ★ …ou ne poussent pas du tout : c'est ici, et ici seulement, que le
  //   REGISTRE sobre se distingue du scénique côté scénario. Tout le reste —
  //   l'arithmétique, les codes, le verdict, le score, le rang — est
  //   rigoureusement identique dans les deux (voir `sobrifierLesCornes`).
  // ★ Les triptyques que PERSONNE n'aurait couronnés le sont ici — voir
  //   `couronnerLesTriptyques`. Avant `reglerLesCornes`, qui se charge ensuite
  //   de les avancer plus tôt encore si la ligne le permet : les deux fonctions
  //   ne répondent pas à la même question. Celle-ci demande « où le 666 est-il
  //   écrit pour la première fois ? » ; celle-là, « peut-on le dire plus tôt
  //   que là où l'étape a été posée ? ». La seconde suppose la première.
  couronnerLesTriptyques(steps, tokens, aReveler, langue, cible);

  const cornes = registre === 'sobre'
    ? sobrifierLesCornes(steps)
    : reglerLesCornes(steps);

  // ★ Le DÉCOR des tables se mutualise ici, et nulle part ailleurs : c'est le
  //   seul endroit qui voit la suite complète des étapes. Un opérateur ne
  //   connaît que les siennes.
  // ★ Les CYCLES d'abord : ils doivent dessiner la même roue pour que le décor
  //   les reconnaisse comme un seul. Voir `unifierLesCycles`.
  unifierLesCycles(steps);
  mutualiserDecor(steps);

  const scenario = {
    version: 1,
    input: saisie,
    method: {
      id: ctx.methode && ctx.methode.id !== undefined ? ctx.methode.id : (approche.rang ?? 1),
      label: (ctx.methode && ctx.methode.label) || titreApproche(approche, langue),
      rule: (ctx.methode && ctx.methode.rule) || regleApproche(approche, langue),
    },
    result: ctx.resultat || cible.texte,
    tokens,
    steps,
  };
  // ★ Le registre voyage AVEC le scénario. Le lecteur en a besoin — c'est lui
  //   qui décide de l'orage et du son —, et le faire suivre par un canal
  //   séparé donnerait deux sources de vérité pour une même décision : un
  //   scénario dont les cornes ont été retirées pourrait alors se retrouver
  //   compilé avec la scénographie, ce qui n'a aucun sens.
  scenario.registre = registre;
  if (avertissements.length) scenario.avertissements = avertissements;
  // ★ Les jalons des cornes — mis à DISPOSITION du barème, jamais consommés
  //   ici. Voir `jalonsDesCornes`.
  if (cornes) scenario.cornes = cornes;

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
 * Ce qu'un décor mutualisé ajoute à la forme d'une op : son nom d'outil et les
 * deux drapeaux de son cycle de vie. Écrit une fois — les afficheurs à segments
 * partagent mot pour mot ce que la table et le clavier exigent déjà.
 */
function formeDeDecor(o) {
  const chaine = (x) => typeof x === 'string' && x.length > 0;
  if (o.titre !== undefined && !chaine(o.titre)) return '« titre » doit être le nom de l’outil, non vide';
  for (const k of ['montre', 'retire']) {
    if (o[k] !== undefined && typeof o[k] !== 'boolean') return `« ${k} » doit être un booléen`;
  }
  return null;
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
    case 'reveal': {
      if (!cibles(o.targets)) return '« targets » manquant ou mal formé';
      // Les surnuméraires sont des jetons NOMMÉS, jamais un sélecteur : le
      // verdict doit savoir lesquels il fait exploser, et un `{group:…}` ne le
      // dirait pas. Et ils ne peuvent pas être parmi les révélés — ce serait
      // demander à la fois de montrer et de détruire le même chiffre.
      if (o.surnumeraires === undefined) return null;
      if (!Array.isArray(o.surnumeraires) || !o.surnumeraires.length
        || !o.surnumeraires.every(chaine)) {
        return '« surnumeraires », s’il est fourni, doit lister des identifiants de jetons';
      }
      const reveles = new Set(normaliserCibles(o.targets));
      if (o.surnumeraires.some((id) => reveles.has(id))) {
        return '« surnumeraires » ne peut pas contenir un jeton que le verdict révèle';
      }
      return null;
    }
    case 'highlight': case 'dim': case 'drop': case 'pulse': case 'group':
      return cibles(o.targets) ? null : '« targets » manquant ou mal formé';
    case 'move':
      // Le CHEMIN, quand la ligne droite ment : un miroir se joue en ellipse,
      // sans quoi deux jetons qui échangent leurs places se traversent et rien
      // ne dit lequel est allé où (`visuel/primitives/ellipse.js`).
      if (o.geste !== undefined && o.geste !== 'droit' && o.geste !== 'miroir') {
        return '« geste » doit valoir « droit » ou « miroir »';
      }
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
      // Quatre mises en page, et chacune dit quelque chose : la réglette (une
      // case = une lettre + sa valeur), la GLISSIÈRE (deux réglettes alignées,
      // celle du bas étant celle du haut déplacée — les chiffrements par
      // substitution), le pavé, seul endroit où une case porte plusieurs
      // lettres parce que la touche 7 porte vraiment « PQRS », et le MODULO
      // (les entiers en rangées de m, le reste écrit une fois en tête de
      // colonne — la colonne où un nombre tombe EST son reste).
      if (o.disposition !== undefined && !['reglette', 'glissiere', 'pave', 'modulo'].includes(o.disposition)) {
        return '« disposition » doit valoir reglette, glissiere, pave ou modulo';
      }
      if (o.teinte !== undefined && o.teinte !== 'valeur') return '« teinte » doit valoir valeur';
      if (o.cycle !== undefined && typeof o.cycle !== 'boolean') return '« cycle » doit être un booléen';
      if (!chaine(o.target)) return '« target » manquant';
      // Le décor se mutualise d'une étape à l'autre, et il porte le nom de
      // l'outil : un titre, deux drapeaux, rien de plus (`formeDeDecor`).
      const decor = formeDeDecor(o);
      if (decor) return decor;
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
      if (o.ordre !== undefined && o.ordre !== 'volDabord') return '« ordre » ne connaît que « volDabord »';
      if (o.accolade !== undefined && o.accolade !== 'existante') return '« accolade » ne connaît que « existante »';
      for (const champ of ['voler', 'effacer']) {
        if (o[champ] !== undefined && !cibles(o[champ])) return `« ${champ} » mal formé`;
      }
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
    case 'keyboard': {
      if (!chaine(o.target)) return '« target » manquant';
      // Même décor mutualisé, même contrôle que la table (`formeDeDecor`).
      const decor = formeDeDecor(o);
      if (decor) return decor;
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    }
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
      // ★ LA FORME BLOC de `flip180` — un trio de 9 qui se retourne comme un
      //   seul glyphe (`visuel/primitives/flip180.js`). Elle prend `targets` et
      //   un `to` en TABLEAU, de même longueur : un bloc retourné rend
      //   exactement ce qu'il a reçu.
      if (o.op === 'flip180' && o.targets !== undefined) {
        if (!Array.isArray(o.targets) || o.targets.length < 2 || !o.targets.every(chaine)) {
          return '« targets » doit lister au moins deux jetons';
        }
        if (!Array.isArray(o.to) || o.to.length !== o.targets.length || !o.to.every(tok)) {
          return '« to » doit porter autant de {id, text} que « targets »';
        }
        return null;
      }
      if (!chaine(o.target)) return '« target » manquant';
      if (o.op === 'countStrokes' && o.titre !== undefined && !chaine(o.titre)) {
        return '« titre » doit être le nom de l’outil, non vide';
      }
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    case 'sevenSeg':
      if (!chaine(o.target)) return '« target » manquant';
      if (typeof o.segments !== 'string' || !/^[a-g]+$/.test(o.segments)) return '« segments » doit être une chaîne de a à g';
      return formeDeDecor(o);
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
      if (o.to !== undefined && !tok(o.to)) return '« to » doit être {id, text}';
      return formeDeDecor(o);
    }
    case 'merge': {
      // Coller demande au moins deux jetons — un seul ne se colle à rien — et
      // le nombre annoncé sera recoupé contre les textes collés à la
      // compilation (`visuel/primitives/merge.js`).
      if (!Array.isArray(o.targets) || o.targets.length < 2 || !o.targets.every(chaine)) {
        return '« targets » doit lister au moins deux jetons voisins à coller';
      }
      return tok(o.to) ? null : '« to » doit être {id, text}';
    }
    case 'collapse': {
      if (!['fusion', 'annulation', 'unique'].includes(o.mode || 'fusion')) {
        return '« mode » doit valoir fusion, annulation ou unique';
      }
      if (!Array.isArray(o.familles) || !o.familles.length) return '« familles » doit lister au moins un groupe';
      for (const f of o.familles) {
        if (!f || !Array.isArray(f.membres) || f.membres.length < 2 || !f.membres.every(chaine)) {
          return '« familles[].membres » doit lister au moins deux exemplaires';
        }
        if (f.garde !== undefined && !chaine(f.garde)) return '« familles[].garde » doit être un identifiant';
      }
      return null;
    }
    case 'fraction': {
      if (!cibles(o.targets)) return '« targets » manquant';
      if (!tok(o.to)) return '« to » doit être {id, text}';
      return tok(o.diviseur) ? null : '« diviseur » doit être {id, text}';
    }
    case 'shift': {
      // Le tamis écarte, ou rend ce qu'il a écarté. Sans aucune des trois
      // listes il ne ferait rien, et un geste qui ne fait rien n'a pas à être
      // émis.
      for (const champ of ['up', 'down', 'reset']) {
        if (o[champ] !== undefined && !cibles(o[champ])) return `« ${champ} » mal formé`;
      }
      if (o.up === undefined && o.down === undefined && o.reset === undefined) {
        return 'au moins un de « up », « down » ou « reset » est attendu';
      }
      if (o.amount !== undefined && !(typeof o.amount === 'number' && o.amount > 0)) {
        return '« amount » doit être une fraction de casse strictement positive';
      }
      return null;
    }
    case 'annotate':
      if (o.ecart !== undefined && !(typeof o.ecart === 'number' && o.ecart > 0)) {
        return '« ecart » doit être une fraction de casse strictement positive';
      }
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
    //
    // ⚠️ Le contrôle vaut pour les DEUX formes. Il ne connaissait que la simple,
    //   si bien qu'un bloc passait sans être vérifié — et, pire, `validerFormeOp`
    //   le déclarait mal formé : `m.retournerLesTrios` retombait donc sur le
    //   rendu générique et sa scène montrait une substitution là où l'opérateur
    //   annonce un demi-tour. Une dégradation silencieuse, exactement ce que ces
    //   garde-fous existent pour empêcher.
    const cibles = Array.isArray(o.targets) ? o.targets : [o.target];
    const arrivees = Array.isArray(o.to) ? o.to : [o.to];
    for (const cible of cibles) {
      const source = valeurDe(cible);
      if (source !== null && String(source) !== '9') {
        return `« flip180 » retournerait « ${source} » : seul un 9 se retourne en 6`;
      }
    }
    for (const t of arrivees) {
      if (String(t.text) !== '6') {
        return `« flip180 » afficherait « ${t.text} » : un 9 retourné donne 6, et rien d'autre`;
      }
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
 * Les longueurs de série écrites en toutes lettres — « séries de trois ».
 *
 * ★ La table s'arrête à six, et ce n'est pas une paresse : `cible.js ›
 * MAX_CHIFFRES` plafonne une cible à six chiffres, donc une série ne peut pas
 * être plus longue. Au-delà, `recolterLegende` retombe sur le chiffre, ce qui
 * ne peut arriver que si ce plafond bouge — et l'on préfère « séries de 7 » à
 * un `undefined` dans le Registre.
 */
const EN_LETTRES = Object.freeze({
  fr: ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'],
  en: ['', 'one', 'two', 'three', 'four', 'five', 'six'],
});

/** Capitale initiale, sans `toLocaleUpperCase` (§4.4 : pas d'`Intl`). */
const majuscule = (mot) => (mot ? mot[0].toUpperCase() + mot.slice(1) : mot);

/**
 * ★ LA MAJORITÉ EST UNE MESURE, PAS UNE FIGURE DE STYLE.
 *
 * « Les 6 sont majoritaires, on les garde / Les chiffres minoritaires ne sont
 * pas significatifs, on les retire » — l'auteur, sur l'étape 14 de
 * `#sce!3.1:tca+mpy+mr9#3A8ev…`. La phrase est belle parce qu'elle donne une
 * RAISON là où l'ancienne se contentait de désigner ; elle n'est belle que
 * tant qu'elle est vraie.
 *
 * Trois conditions, et chacune ferme un mensonge possible :
 *
 *  1. **cible homogène.** « Les 6 » nomme un chiffre ; sur `13` ou `007` il n'y
 *     en a pas un seul à nommer, ce sont des positions qu'on retient.
 *  2. **aucun exemplaire du chiffre ne tombe.** Un vecteur à sept 6 dont le
 *     verdict n'aligne que deux séries en laisse un sur le carreau : « on les
 *     garde » serait faux pour celui-là. On exige donc que les gardés soient
 *     TOUS les porteurs de la valeur visée.
 *  3. **majorité STRICTE de la ligne.** Plus de la moitié des valeurs à
 *     l'écran, pas seulement la valeur la plus fréquente. « Majoritaire » se
 *     dit des deux en français, et l'on prend le sens qui ne se discute pas :
 *     sur le témoin `c777!`, trois 7 sur onze valeurs ne sont majoritaires dans
 *     aucun sens du mot, et c'est exactement le cas que l'auteur nous reproche
 *     d'avoir mal nommé.
 *
 * ★ On ne compte PAS ce que le vecteur contenait à une étape antérieure : la
 * ligne dont on parle est celle que le spectateur a sous les yeux au moment du
 * tri — les valeurs gardées plus les valeurs qui tombent. Ce qui est dit reste
 * ce qui est montré (CONTRACTS §0.3).
 *
 * @param {number[]} gardees   les valeurs retenues
 * @param {number[]} jetees    les valeurs qui tombent
 * @param {import('./cible.js').Cible} cible
 */
function recolteMajoritaire(gardees, jetees, cible) {
  const cbl = normaliserCible(cible);
  if (!cbl.homogene) return false;
  const chiffre = cbl.chiffres[0];
  if (!gardees.length || !gardees.every((v) => v === chiffre)) return false;
  if (jetees.some((v) => v === chiffre)) return false;
  return gardees.length * 2 > gardees.length + jetees.length;
}

/**
 * ★ **LE TITRE DU TRI — exporté pour être ÉPROUVÉ, comme `lesPlusCentraux`.**
 *
 * Ce n'est pas une commodité de test. Ses quatre variantes se choisissent sur
 * des conditions que le corpus ne produit pas toutes : celle qui compte le plus
 * — « des exemplaires du chiffre visé tombent » — est justement devenue
 * introuvable le jour où le verdict a pris en charge le surnuméraire d'une série
 * unique. Un test qui ne l'atteindrait qu'à travers une saisie ne gèlerait donc
 * rien du tout, et la formulation redeviendrait fausse le jour où le cas
 * revient — sans que rien ne rougisse.
 */
export function titreDeRecolte(cible, majoritaire, langue, sacrifies = false) {
  const cbl = normaliserCible(cible);
  if (majoritaire) {
    return langue === 'en'
      ? `The ${cbl.chiffres[0]}s are in the majority, so they stay`
      : `Les ${cbl.chiffres[0]} sont majoritaires, on les garde`;
  }
  /* ★ **QUAND DES 6 TOMBENT, ON NE PEUT PAS DIRE QU'ON GARDE LES 6.**
     « Ça ne dispense pas de corriger la formulation si elle reste trompeuse :
     si elle supprime des 6, alors elle ne garde pas que les 6 » (l'auteur).

     Le titre « On ne garde que les 6 » décrit un tri par VALEUR ; il est juste
     tant que tout ce qui tombe est faux. Dès qu'un exemplaire du chiffre visé
     tombe — parce qu'il ne complète aucune série —, il devient un mensonge, et
     de la pire espèce : celui que le spectateur peut vérifier d'un coup d'œil.
     Ce qu'on garde alors n'est pas « les 6 », c'est les 666 ENTIERS, et
     l'appoint qui n'en forme pas un s'en va avec le reste. C'est ce que dit le
     titre, et c'est ce que la ligne montre.

     ⚠️ Rien à jeter, pas d'étape : `recolterLesSix` ne pose son bloc que si
       `aJeter` n'est pas vide. Une étape qui n'ôte rien n'a jamais lieu. */
  if (sacrifies) {
    return langue === 'en'
      ? `Keep only whole ${cbl.texte}s`
      : `On ne garde que les ${cbl.texte} complets`;
  }
  if (cbl.homogene) {
    return langue === 'en'
      ? `Keep the ${cbl.chiffres[0]}s, and only those`
      : `On ne garde que les ${cbl.chiffres[0]}`;
  }
  return langue === 'en'
    ? `Keep only what spells out ${cbl.texte}`
    : `On ne garde que ce qui écrit ${cbl.texte}`;
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
  // ★ « On retouche » et non « On isole ». Ce titre-ci ouvre une RETOUCHE
  //   (`url.js`, `2.1:fr13;…`), et la nuance est tout ce qui la distingue d'un
  //   fragment : `isolerPassage` annonce qu'on va lire un morceau et laisser le
  //   reste de côté ; ici on ne laisse rien de côté — on réécrit un passage, et
  //   tout le monde lira la suite. Le dire d'entrée évite au spectateur de
  //   croire que « Donald » vient d'être abandonné.
  retoucher: { fr: 'On retouche d’abord un passage', en: 'First, rework one passage' },
  // ★ « On s'occupe du » et non « On isole ».
  //
  // Ce titre ne sert QUE derrière un découpage (`groupes.length > 1`), et le
  // découpage a déjà montré les morceaux : les redire isolés annonce un geste
  // qui a eu lieu une étape plus tôt. L'étape reste — le registre doit pouvoir
  // s'y rendre —, mais elle dit ce qu'elle fait vraiment : elle prend le
  // morceau suivant en main.
  //
  // La forme suit celle de tout le registre — « On découpe », « On additionne »,
  // « On ne garde que les 6 » —, d'où « On s'occupe » plutôt que « Traitons » :
  // une seule voix, du premier titre au dernier.
  //
  // `isolerPassage` (juste au-dessus) garde son « On isole » : là il n'y a pas
  // eu de découpage, et c'est bien cette étape qui écarte le reste.
  isolerMorceau: (n, langue) => (langue === 'en'
    ? `Now for the ${ordinalEn(n)} piece`
    : `On s’occupe du ${ordinal(n)} morceau`),
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
  /**
   * ★ LE TRI FINAL — trois façons de le dire, et c'est la MESURE qui choisit.
   *
   * « "On ne garde que les 6", or ce sont les 7 que tu gardes. Le titre est à
   * rendre dynamique » — l'auteur, sur `#so!c777!tca+masb+mrn#Hi75aotg77MXEgC`. Le
   * « 6 » en dur datait d'un monde où le verdict ne pouvait rien écrire d'autre ;
   * depuis `cible.js`, il ment dès qu'on vise autre chose, et il mentait déjà à
   * l'oreille sur `13` (« séries de trois » pour des séries de deux).
   *
   * ⚠ **Le chiffre n'est PAS recopié ici : il est lu sur la cible**, qui est le
   * seul endroit qui la porte. Ce dépôt a déjà payé le prix des constantes
   * recopiées (`cible.js`, en-tête) ; on ne rouvre pas l'ardoise pour un
   * libellé.
   *
   * ── Les trois formulations ────────────────────────────────────────────────
   *
   *  1. **« Les 6 sont majoritaires, on les garde »** — la formulation demandée
   *     par l'auteur pour `#sce!3.1:tca+mpy+mr9#3A8ev…` (étape 14). C'est la seule
   *     qui ARGUMENTE : elle ne dit plus « on garde ce qu'on cherchait », elle
   *     invoque la majorité, c'est-à-dire une propriété de la ligne qu'on a sous
   *     les yeux. C'est de la rhétorique numérologique, et c'est le propos du
   *     site — mais une rhétorique qui s'appuie sur un fait FAUX ne serait plus
   *     de la rhétorique, ce serait une erreur de Registre. Elle n'est donc
   *     employée que lorsque `recolteMajoritaire` l'établit (voir là-bas).
   *  2. **« On ne garde que les 7 »** — l'ancienne phrase, le chiffre en moins.
   *     C'est le repli quand la cible est homogène mais que la majorité n'est
   *     pas au rendez-vous : sur le témoin `c777!`, les 7 gardés sont trois sur
   *     onze, et les dire majoritaires serait le second mensonge après le
   *     premier.
   *  3. **« On ne garde que ce qui écrit 007 »** — hors cible homogène, il n'y a
   *     aucun chiffre unique à nommer : ce sont des POSITIONS qu'on garde, dans
   *     l'ordre, et la phrase le dit (`seriesDe`, `cible.js`).
   *
   * ★ Sur `666`, le cas 1 ou le cas 2 s'appliquent selon la ligne, et le cas 2
   * rend MOT POUR MOT l'ancienne chaîne : le repli exigé par `cible.js` est
   * exact partout où la majorité n'est pas acquise.
   */
  recolter: titreDeRecolte,

  /**
   * La légende du tri — ce qu'on garde, et ce qui tombe.
   *
   * ★ **Quand la majorité est acquise, la légende ARGUMENTE elle aussi**, et
   * c'est la seconde ligne demandée par l'auteur : « Les chiffres minoritaires
   * ne sont pas significatifs, on les retire. » Le relevé chiffré cède la place
   * — il disait « 2 séries de trois », que l'étape suivante (« Le verdict :
   * 666 666 ») écrit de toute façon en toutes lettres, et le nombre de valeurs
   * tombées se lit sur la ligne qu'on vient de montrer.
   *
   * ★ Hors de ce cas, le relevé reste — et sa longueur de série suit la cible :
   * « séries de trois » pour `666`, « séries de deux » pour `13`. C'était le
   * second « trois » en dur, et il se voyait moins que le premier.
   */
  recolterLegende: (series, jetes, cible, majoritaire, langue) => {
    const en = langue === 'en';
    if (majoritaire) {
      return en
        ? 'Minority digits are not significant, so out they go.'
        : 'Les chiffres minoritaires ne sont pas significatifs, on les retire.';
    }
    const cbl = normaliserCible(cible);
    const reste = en
      ? `the other ${jetes} value${jetes > 1 ? 's fall' : ' falls'} away`
      : (jetes > 1 ? `les ${jetes} autres valeurs tombent` : 'l’autre valeur tombe');
    // ★ Une série d'UN chiffre ne se met pas « côte à côte » avec elle-même :
    //   la phrase des séries longues n'a simplement pas de sens ici, et une
    //   cible d'un signe est parfaitement légale (`cible.js`).
    if (cbl.longueur === 1) {
      return en
        ? `${series > 1 ? `${series} of them` : 'Just the one'} — ${reste}`
        : `${series > 1 ? `${series} fois le ${cbl.texte}` : `Un seul ${cbl.texte}`} — ${reste}`;
    }
    const bloc = EN_LETTRES[en ? 'en' : 'fr'][cbl.longueur] || String(cbl.longueur);
    return en
      ? (series > 1
        ? `${series} runs of ${bloc} — ${reste}`
        : `${majuscule(bloc)} of them, side by side — ${reste}`)
      : (series > 1
        ? `${series} séries de ${bloc} — ${reste}`
        : `${majuscule(bloc)}, côte à côte — ${reste}`);
  },
  // ★ Deux légendes ont disparu avec le tri par portée : « On en garde N » (la
  // récolte d'une portée) et « le 6 en trop reste sur le carreau » (l'appoint).
  // Elles disaient chacune une moitié de ce que dit maintenant, en une fois,
  // `recolterLegende` : combien de séries on garde, combien de valeurs tombent.
  verdict: { fr: 'Le verdict', en: 'The verdict' },
  // ── Les deux moments des cornes (voir `reglerLesCornes`) ────────────────
  //
  // Tant que le couronnement et l'effacement ne faisaient qu'un geste, la
  // légende de `m36` disait les deux d'un coup (« 6 6 6 7 3 6 → 666 »).
  // Séparés, chacun a la sienne, et chacune ne dit que ce qui se passe sous
  // les yeux du spectateur à cet instant-là.
  // ★ Le TITRE du couronnement, et pourquoi il est écrit ici aussi.
  //
  // Les couronnements posés par l'assemblage (`couronnerLesTriptyques`) n'ont
  // aucun opérateur derrière eux — ils ne transforment rien, ils constatent —,
  // donc pas de libellé à emprunter. La phrase reste celle de la trouvaille,
  // parce que c'est ce que le spectateur voit : le 666 était déjà écrit.
  // ★ `m36`, lui, ne porte plus ce titre : il ne couronne plus, il s'ARRÊTE aux
  // trois 6 et efface le reste, et son étape le dit maintenant en propre
  // (`LIB_ARRET`, `transformations/mappeurs.js`). Deux gestes distincts, deux
  // phrases distinctes — les confondre ferait lire deux fois le même.
  couronner: {
    fr: 'Trois 6 d’affilée — le 666 était déjà écrit',
    en: 'Three 6s in a row — the 666 was already written',
  },
  couronnerLegende: {
    fr: 'Trois 6 côte à côte — le 666 est écrit, et rien ne le défera plus',
    en: 'Three 6s side by side — the 666 is written, and nothing will undo it',
  },
  // ★ Deux libellés ont disparu avec la séparation des deux gestes : « On
  // efface le reste » et sa légende. Ils nommaient l'étape que `reglerLesCornes`
  // fabriquait en repoussant l'effacement de `m36` devant le verdict. Il n'y a
  // plus rien à repousser : l'effacement est resté chez son opérateur, où il
  // est devenu une étape à part entière portant SON motif
  // (`transformations/mappeurs.js`, « CET OPÉRATEUR NE COURONNE PLUS »).
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
