/**
 * Le catalogue — agrège les cinq familles, **vérifie** et **gèle**.
 *
 * Garanties exigées par CONTRACTS §2.2, vérifiées ici **au chargement** (échec
 * bruyant, jamais de dégradation silencieuse) :
 *
 * 1. métadonnées de classement présentes et dans `[0,1]` ;
 * 2. `code` unique et conforme à la grammaire §4.1 (préfixe de famille + index
 *    base36), cohérent avec la famille ;
 * 3. **ordre de déclaration = ordre des codes croissants** — c'est aussi l'ordre
 *    d'itération du moteur de recherche et l'ordre de tri de la
 *    canonicalisation (§4.4 règle 3) ;
 * 4. typage `from`/`to` dans les quatre types d'état ;
 * 5. `apply` et `steps` présents et exécutables.
 *
 * Le registre des codes est **append-only** (§4.1) : un code alloué l'est à vie,
 * changer le comportement d'un opérateur impose d'allouer un nouveau code et de
 * déprécier l'ancien *en conservant son comportement*. `catalogue.test.js` gèle
 * les codes publiés par un jeu de vecteurs `code → entrée → sortie`.
 */

import { FILTRES } from './transformations/filtres.js';
import { TOKENISEURS } from './transformations/tokeniseurs.js';
import { MESURES_STR, MAPPEURS } from './transformations/mappeurs.js';
import { COMBINATEURS } from './transformations/combinateurs.js';
import { POSTS, JOKERS } from './transformations/posts.js';
import { ORDRE_PREFIXES, PREFIXE, FAMILLES, tracesDe } from './transformations/commun.js';
import { estBilingue, langueValide, LANGUES, LANGUE_DEFAUT, dire } from './i18n.js';
import {
  TYPES, str, tokens, nums, num, estEtat, estType, taille,
} from './etat.js';

/** Erreur de chargement du catalogue. */
export class ErreurCatalogue extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ErreurCatalogue';
    Object.assign(this, details);
  }
}

const echec = (msg, d) => { throw new ErreurCatalogue(msg, d); };

/** Rang d'un code, pour l'ordre total : (famille, index base36). */
export function rangCode(code) {
  if (typeof code !== 'string' || code.length < 2) return null;
  const f = ORDRE_PREFIXES.indexOf(code[0]);
  const i = parseInt(code.slice(1), 36);
  if (f < 0 || !Number.isInteger(i) || i < 1) return null;
  if (code.slice(1) !== i.toString(36)) return null;
  return f * 1e6 + i;
}

/** Comparateur d'opérateurs par code croissant (§4.1 règle 3). */
export const parCode = (a, b) => rangCode(a.code) - rangCode(b.code);

const TOUS = [
  ...FILTRES, ...TOKENISEURS, ...MESURES_STR, ...MAPPEURS,
  ...COMBINATEURS, ...POSTS, ...JOKERS,
];

function verifier(liste) {
  const vus = new Map();
  let precedent = 0;
  for (const op of liste) {
    const ou = `opérateur « ${op.id || '?'} » (code ${op.code})`;
    if (typeof op.id !== 'string' || !op.id) echec(`${ou} : identifiant manquant.`);
    if (!FAMILLES.includes(op.famille)) echec(`${ou} : famille inconnue.`);
    const rang = rangCode(op.code);
    if (rang === null) {
      echec(`${ou} : code hors grammaire §4.1 (préfixe de famille + index base36 sans zéro de tête).`);
    }
    if (op.code[0] !== PREFIXE[op.famille]) {
      echec(`${ou} : préfixe « ${op.code[0]} » incohérent avec la famille ${op.famille}.`);
    }
    if (vus.has(op.code)) echec(`${ou} : code déjà pris par « ${vus.get(op.code)} » — un code est alloué à vie (§4.1).`);
    vus.set(op.code, op.id);
    if (rang <= precedent) {
      echec(`${ou} : ordre de déclaration ≠ ordre des codes croissants (§4.1 règle 3).`);
    }
    precedent = rang;
    if (!TYPES.includes(op.from) || !TYPES.includes(op.to)) echec(`${ou} : typage from/to invalide.`);
    for (const champ of ['notoriete', 'adHoc']) {
      const v = op[champ];
      if (typeof v !== 'number' || !(v >= 0 && v <= 1)) {
        echec(`${ou} : « ${champ} » doit être un nombre de [0,1] — sans lui, pas de score (heuristique §7.2).`);
      }
    }
    if (typeof op.cout !== 'number' || op.cout < 0) echec(`${ou} : « cout » invalide.`);
    if (typeof op.apply !== 'function') echec(`${ou} : « apply » manquant.`);
    if (typeof op.steps !== 'function') echec(`${ou} : « steps » manquant — une transformation sans rendu n'a pas sa place (CONTRACTS §3.1).`);
    if (typeof op.sortie !== 'function') echec(`${ou} : « sortie » manquant.`);
    if (!estBilingue(op.libelle)) echec(`${ou} : « libelle » doit porter ses deux langues (§ i18n).`);
    if (!estBilingue(op.regle)) echec(`${ou} : « regle » doit porter ses deux langues (§ i18n).`);
    if (op.note !== null && !estBilingue(op.note)) {
      echec(`${ou} : « note » doit être null ou porter ses deux langues (§ i18n).`);
    }
    if (op.isJoker && op.famille !== 'joker') echec(`${ou} : isJoker réservé à la famille joker.`);
  }
  return liste;
}

/** Le catalogue complet, gelé, dans l'ordre des codes croissants. */
export const CATALOGUE = Object.freeze(verifier(TOUS));

/** Index par code. */
export const PAR_CODE = Object.freeze(new Map(CATALOGUE.map((o) => [o.code, o])));
/** Index par identifiant. */
export const PAR_ID = Object.freeze(new Map(CATALOGUE.map((o) => [o.id, o])));

/**
 * Opérateurs explorables par le moteur de recherche : ni dépréciés, ni jokers,
 * ni désactivés par défaut (les nombres maîtres, CONTRACTS §0.4).
 * @param {{maitres?:boolean}} [options]
 */
export function operateursActifs(options = {}) {
  return CATALOGUE.filter((o) => !o.deprecated && !o.isJoker
    && (o.actifParDefaut || (options.maitres && o.id === 'p.racineMaitres')));
}

/** Opérateurs applicables à un type d'état donné, par codes croissants. */
export const operateursDepuis = (type, options) => operateursActifs(options).filter((o) => o.from === type);

/** L'opérateur de secours (heuristique §5.4). */
export const JOKER = PAR_ID.get('j.nomFrancais');

// ───────────────────────────────────────────────────────────────────────────
// Application
// ───────────────────────────────────────────────────────────────────────────

const construire = {
  STR: (v, t) => str(v, t),
  TOKENS: (v, t) => tokens(v, t),
  NUMS: (v, t) => nums(v, t),
  NUM: (v, t) => num(v, (t && t[0]) || []),
};

/**
 * Applique un opérateur à un état. **Pur, déterministe, sans exception** :
 * retourne `null` si l'opérateur ne s'applique pas (signal d'élagage).
 * @param {object} op
 * @param {object} etat
 * @returns {object|null} le nouvel état, ou `null`
 */
export function appliquer(op, etat) {
  if (!op || typeof op.apply !== 'function') return null;
  if (!estType(etat, op.from)) return null;
  const traces = tracesDe(etat);
  let brut;
  try {
    brut = op.apply(etat.valeur, traces);
  } catch {
    // Le contrat interdit les exceptions ; on ne les laisse pas remonter pour
    // autant : une erreur d'opérateur ne doit pas faire tomber la recherche.
    return null;
  }
  if (brut === null || brut === undefined) return null;
  const fabrique = construire[op.to];
  if (!fabrique) return null;
  const suivant = fabrique(brut.valeur, brut.traces);
  return estEtat(suivant) ? suivant : null;
}

/**
 * Émet les `Step[]` d'une transformation (CONTRACTS §3).
 *
 * @param {object} op
 * @param {object} avant état d'entrée
 * @param {object} apres état de sortie (celui rendu par `appliquer`)
 * @param {{ids:string[], cle:string, langue?:'fr'|'en'}} ctx identifiants des
 *        tokens de `avant`, préfixe unique pour nommer ceux que l'opérateur
 *        crée, et langue d'affichage (défaut : français)
 * @returns {Array<object>} steps purs, JSON sérialisables
 */
export function etapes(op, avant, apres, ctx) {
  if (!op || typeof op.steps !== 'function') return [];
  if (!estEtat(avant) || !estEtat(apres)) return [];
  if (!ctx || !Array.isArray(ctx.ids) || typeof ctx.cle !== 'string' || !ctx.cle) return [];
  // La langue du scénario voyage dans le `ctx` : les titres et légendes des
  // steps sont du texte affiché, ils doivent sortir déjà traduits.
  return op.steps(avant, apres, { ...ctx, langue: langueValide(ctx.langue) });
}

/**
 * Identifiants des tokens représentant `apres` — à réinjecter dans le `ctx` de
 * l'étape suivante. C'est l'émetteur qui nomme (CONTRACTS §3).
 */
export function idsApres(op, avant, apres, ctx) {
  if (!op || typeof op.sortie !== 'function') return [];
  return op.sortie(avant, apres, ctx);
}

/** Applique une suite de codes à un état. `null` dès qu'une étape échoue. */
export function appliquerProgramme(codes, etat) {
  let courant = etat;
  for (const code of codes) {
    const op = PAR_CODE.get(code);
    if (!op) return null;
    courant = appliquer(op, courant);
    if (courant === null) return null;
  }
  return courant;
}

/**
 * Déroule un programme et rend le détail par étape — c'est ce que consomme
 * `src/recherche/scenario.js` pour fabriquer un `Scenario`.
 * @returns {{etat:object, etapes:Array}|null}
 */
export function derouler(codes, etat, ctxInitial) {
  let courant = etat;
  let ids = (ctxInitial && ctxInitial.ids) || Array.from({ length: taille(etat) || 0 }, (_, i) => `t${i}`);
  const langue = langueValide(ctxInitial && ctxInitial.langue);
  const sortie = [];
  codes.forEach((code, k) => {
    if (courant === null) return;
    const op = PAR_CODE.get(code);
    if (!op) { courant = null; return; }
    const apres = appliquer(op, courant);
    if (apres === null) { courant = null; return; }
    const ctx = { ids, cle: `e${k}`, langue };
    sortie.push({
      code, opId: op.id, libelle: op.libelle, regle: op.regle, note: op.note,
      avant: courant, apres, steps: etapes(op, courant, apres, ctx),
      couverture: op.from === 'STR' && op.couverture ? op.couverture(courant.valeur) : null,
    });
    ids = idsApres(op, courant, apres, ctx);
    courant = apres;
  });
  return courant === null ? null : { etat: courant, etapes: sortie };
}

export { TYPES, LANGUES, LANGUE_DEFAUT, dire, langueValide, estBilingue };
