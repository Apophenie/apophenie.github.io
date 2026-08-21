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
  'sum', 'reduce', 'flip180', 'sevenSeg', 'countStrokes', 'keyboard', 'annotate',
  'pulse', 'reveal', 'wait',
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
 * Une seule op « géométrique » par step. Deux ops qui recalculent le layout
 * dans le même step animent deux fois `translate` sur les mêmes tokens : le
 * compilateur visuel le signale comme des animations concurrentes, et le
 * scrubbing devient ambigu (recherche visuelle §2.4, contrainte 4).
 */
const SANS_LAYOUT = new Set(['highlight', 'dim', 'pulse', 'reveal', 'annotate', 'wait']);

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
      ajouter(o.to);
      if (o.to) supprimes.push(...normaliserCibles(o.target));
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
  return refs;
}

// ══════════════════════════════════ construction du scénario

/**
 * @param {Object} approche  approche notée (assemblage.js + score.js)
 * @param {Object} ctx {saisie, methode:{id,label,rule}, resultat, langue:'fr'|'en'}
 * @returns {Object} Scenario conforme à CONTRACTS.md §3
 */
export function construireScenario(approche, ctx = {}) {
  const saisie = String(ctx.saisie ?? approche.saisie ?? '').normalize('NFC');
  const langue = ctx.langue === 'en' ? 'en' : LANGUE_DEFAUT;
  const alloc = creerAllocateur();
  const avertissements = [];

  // Les parts identiques (joker, triplement) ne sont rendues qu'une fois : les
  // tokens d'un fragment ne peuvent pas être consommés trois fois — un id
  // supprimé n'est jamais réutilisé (invariant 4).
  const partsUniques = [];
  const vues = new Set();
  for (const p of approche.parts) {
    const cle = p.fragment ? p.fragment.intervalles.map((iv) => iv.join('.')).join('|') : '';
    if (vues.has(cle)) continue;
    vues.add(cle);
    partsUniques.push(p);
  }
  const repete = partsUniques.length < approche.parts.length;

  // Chaque caractère de la saisie est un token, étiqueté du groupe de la part
  // qui l'exploite. Le groupe permet d'atténuer le hors-fragment par sélecteur
  // `{groupNot}` — qui ne retient que les tokens VIVANTS, contrairement à une
  // liste d'ids figée qui pointerait des tokens déjà consommés.
  const groupeDe = new Array(saisie.length).fill(null);
  partsUniques.forEach((part, i) => {
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
  let nStep = 0;
  let nCle = 0; // préfixe unique offert aux opérateurs pour nommer leurs tokens
  const nouvelleEtape = (titre, legende, ops) => {
    if (!ops || !ops.length) return null;
    const s = { id: `s${nStep++}`, title: titre, ops, hold: DUREE_CHARNIERE };
    if (legende) s.caption = legende;
    steps.push(s);
    return s;
  };

  partsUniques.forEach((part, indexPart) => {
    const positions = positionsDe(part.fragment, saisie.length);
    let courants = positions.map((i) => [idsParPosition[i]]);
    const groupe = `p${indexPart}`;

    // Isolation du fragment (inutile s'il couvre déjà toute la saisie).
    if (positions.length && positions.length < saisie.length) {
      nouvelleEtape(
        approche.parts.length > 1 ? MOTS.isolerMorceau(indexPart + 1, langue) : MOTS.isolerPassage[langue],
        part.fragment ? citer(part.fragment.texte, langue) : null,
        [
          { op: 'highlight', targets: { group: groupe }, mode: 'select' },
          { op: 'dim', targets: { groupNot: groupe }, at: 200 },
        ],
      );
    }

    const chemin = part.chemin;
    for (let i = 0; i < chemin.ops.length; i++) {
      const op = chemin.ops[i];
      const avant = chemin.etats[i];
      const apres = chemin.etats[i + 1];
      if (rendreValeur(avant) === rendreValeur(apres)) continue; // rien à montrer

      const emis = typeof op.steps === 'function'
        ? essayerCatalogue(op, avant, apres, courants, alloc, avertissements, `x${nCle++}`, langue)
        : null;
      if (emis) {
        for (const s of emis.steps) {
          s.id = `s${nStep++}`;
          if (!s.title) s.title = dire(op.libelle, langue) || op.id;
          if (s.hold === undefined) s.hold = DUREE_CHARNIERE;
          steps.push(s);
        }
        courants = emis.courants;
        continue;
      }
      const g = emettreGenerique(op, avant, apres, courants, alloc, langue);
      if (!g) {
        throw new ErreurRendu(
          `« ${dire(op.libelle, langue) || op.id} » (${op.code}) transforme ${elementsDe(avant).length} élément(s) `
          + `en ${elementsDe(apres).length} : aucune primitive du vocabulaire fermé ne sait le montrer. `
          + 'Cet opérateur doit fournir son propre steps(), ou le moteur visuel doit gagner la primitive '
          + 'correspondante (CONTRACTS §3.1).',
          op,
        );
      }
      for (const b of g.blocs) nouvelleEtape(b.titre, b.legende, b.ops);
      courants = g.courants;
    }
    const dernier = courants.flat()[0];
    if (dernier) resultats.push(dernier);
  });

  const finaux = resultats.filter(Boolean);
  if (!finaux.length) throw new ErreurRendu('aucun résultat à révéler', null);

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
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || '666', [
      { op: 'move', targets: aReveler, to: 'front' },
      { op: 'reveal', targets: aReveler, at: 250, stagger: 150 },
    ]);
  } else {
    nouvelleEtape(MOTS.verdict[langue], ctx.resultat || '666', [
      { op: 'reveal', targets: aReveler },
      { op: 'annotate', anchor: aReveler, text: ctx.resultat || '666', place: 'below', at: 400 },
    ]);
  }

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
      return (Array.isArray(o.order) && o.order.every(chaine)) || cibles(o.targets)
        ? ((o.to === undefined || o.to === 'front' || o.to === 'back') ? null : '« to » doit valoir « front » ou « back »')
        : '« targets » ou « order » manquant';
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
      if (o.ids === undefined) return null; // le moteur visuel les nomme lui-même
      const n = o.between.length - 1;
      return Array.isArray(o.ids) && o.ids.length === n && o.ids.every(chaine)
        ? null : `« ids », s'il est fourni, doit contenir exactement ${n} identifiant(s)`;
    }
    case 'flip180': case 'keyboard': case 'countStrokes':
      if (!chaine(o.target)) return '« target » manquant';
      return o.to === undefined || tok(o.to) ? null : '« to » doit être {id, text}';
    case 'sevenSeg':
      if (!chaine(o.target)) return '« target » manquant';
      if (typeof o.segments !== 'string' || !/^[a-g]+$/.test(o.segments)) return '« segments » doit être une chaîne de a à g';
      return null;
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
  isolerPassage: { fr: 'On isole le passage utile', en: 'Single out the part that matters' },
  isolerMorceau: (n, langue) => (langue === 'en'
    ? `Single out the ${ordinalEn(n)} piece`
    : `On isole le ${ordinal(n)} morceau`),
  resonance: { fr: 'Trois fois la même règle', en: 'The same rule, three times over' },
  resonanceLegende: {
    fr: 'Le même calcul vaut pour les trois 6',
    en: 'One and the same calculation gives all three 6s',
  },
  verdict: { fr: 'Le verdict', en: 'The verdict' },
});

export function titreApproche(approche, langue = LANGUE_DEFAUT) {
  const noms = [];
  for (const p of approche.parts) {
    for (const o of p.chemin.ops) {
      const nom = dire(o.libelle, langue);
      if (nom && !noms.includes(nom)) noms.push(nom);
    }
  }
  return noms.slice(0, 3).join(', ') || (langue === 'en' ? 'Demonstration' : 'Démonstration');
}

export function regleApproche(approche, langue = LANGUE_DEFAUT) {
  const regles = [];
  for (const p of approche.parts) {
    for (const o of p.chemin.ops) {
      const r = dire(o.regle, langue);
      if (r && !regles.includes(r)) regles.push(r);
    }
  }
  return regles.join(' · ');
}

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
