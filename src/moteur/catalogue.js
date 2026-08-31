/**
 * Le catalogue — agrège les cinq familles, **vérifie** et **gèle**.
 *
 * Garanties exigées par CONTRACTS §2.2, vérifiées ici **au chargement** (échec
 * bruyant, jamais de dégradation silencieuse) :
 *
 * 1. métadonnées de classement présentes et dans `[0,1]` ;
 * 2. `code` unique, conforme à la grammaire §4.1 (lettre de famille + corps
 *    parlant + majuscule de variante facultative), cohérent avec la famille, et
 *    **inscrit au registre** `ORDRE_CANONIQUE` ;
 * 3. **ordre de déclaration = ordre du registre** — c'est aussi l'ordre
 *    d'itération du moteur de recherche (§4.4 règle 3) ;
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
import {
  ORDRE_PREFIXES, PREFIXE, FAMILLES, RE_CODE, tracesDe,
} from './transformations/commun.js';
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

/**
 * **Le registre** — les cent codes dans l'ordre canonique du catalogue.
 *
 * ★ Pourquoi cette liste existe, alors qu'elle n'existait pas avant. Un code
 * était jadis « préfixe de famille + index base36 » : l'ordre du catalogue se
 * LISAIT dans le code (`m1` avant `m2` avant `ma`, en base36), et `rangCode` n'avait qu'à
 * décoder l'index. Depuis les codes parlants (`tca`, `pm9`, `m14F`…), le code
 * ne dit plus son rang — il dit ce que l'opérateur FAIT, ce qui est tout
 * l'objet du changement. L'ordre doit donc être écrit quelque part, et le
 * moins pire des endroits est ici : une liste unique, relue à chaque
 * chargement contre l'ordre de déclaration des cinq familles.
 *
 * ★ Pourquoi PAS un simple tri alphabétique des codes. Parce que l'ordre du
 * catalogue n'est pas décoratif : c'est l'ordre d'exploration du moteur de
 * recherche (§4.4 règle 3), et il est CURÉ — les mappeurs de lettres notoires
 * d'abord, les triches numériques ensuite. Trier « m0, m14, m14F, m1s2, m36,
 * m7… » mettrait les triches en tête par pur hasard alphabétique. La liste
 * conserve l'ordre historique d'allocation, qui portait cette intention.
 *
 * ★ Pourquoi PAS non plus « l'ordre de déclaration fait foi, point ». Parce
 * qu'alors plus rien ne se vérifie : deux sources qui se contrôlent l'une
 * l'autre valent mieux qu'une seule qu'on croit sur parole. Déplacer un
 * opérateur dans son fichier sans toucher au registre fait échouer le
 * chargement, bruyamment, comme le veut §2.2.
 *
 * ★ **Append-only** (§4.1) : un code neuf s'ajoute EN FIN de liste, jamais au
 * milieu — insérer, c'est décaler les rangs suivants, donc changer l'ordre
 * d'exploration de tout ce qui suit et le classement avec.
 */
export const ORDRE_CANONIQUE = Object.freeze([
  'fp', 'fw', 'ftld', 'fav', 'fap',
  // Les trois découpes qui NOMMENT ce qu'elles gardent, après les deux qui se
  // contentent de couper à la barre (`filtres.js`).
  'fdom', 'fchm', 'fpag',
  'fl', 'fv', 'fvy', 'fc', 'fd',
  // Les quatre cadets du dédoublonnage, par rang du survivant, puis les deux
  // annulations — même geste, résultats différents (`filtres.js`).
  'fd2', 'fd3', 'fd4', 'fd5', 'fpr', 'fun', 'fr',
  'fi', 'fmr',
  // Les trois acceptions de chaque sens de traduction (`filtres.js`).
  'ffr', 'ffr2', 'ffr3', 'ffr4', 'ffr5', 'fen', 'fen2', 'fen3', 'fen4', 'fen5', 'fmaj', 'fmin', 'fac', 'flt', 'fatb', 'fr13',
  // ★ Les vingt-quatre autres décalages, par ordre croissant — voir
  //   `transformations/filtres.js › CESARS`. `fr13` garde son rang d'aîné.
  'fr1', 'fr2', 'fr3', 'fr4', 'fr5', 'fr6', 'fr7', 'fr8', 'fr9', 'fr10', 'fr11', 'fr12', 'fr14', 'fr15', 'fr16', 'fr17', 'fr18', 'fr19', 'fr20', 'fr21', 'fr22', 'fr23', 'fr24', 'fr25',
  'tca', 'tm', 'tsp', 'tsy', 'tch', 'nl', 'nv', 'nc', 'nd', 'nsp', 'nm',
  'nlv', 'nlc', 'ma1', 'mz26', 'mpy', 'mch', 'mx6', 'msfr', 'msen', 'mt9',
  'mms', 'mmt', 'masc', 'masb', 'm7', 'm7F', 'mtrc', 'mtrb', 'mexc', 'mexb',
  'mboc', 'mbob', 'mazc', 'mazr', 'mqwc', 'mqwr', 'maz4', 'mqw4', 'mhe', 'mgr', 'mln',
  'mlm', 'mrn', 'm0', 'mtc', 'm14', 'm14F', 'mr9', 'm36', 'mpf', 'm1s2',
  'mad', 'meg', 'mtri', 'mtal', 'mr39', 'mcc', 'mrd', 'cs', 'cst', 'cp', 'cal', 'cmm',
  'cmo', 'cmod', 'cnv', 'ccat', 'cmx', 'cmn', 'cnj', 'cnjd', 'prn', 'psc', 'pabs',
  'prs', 'pec', 'pmr', 'pc9', 'pm9', 'pr9', 'prm', 'pm10', 'jnf',
]);

const RANG_AU_REGISTRE = new Map(ORDRE_CANONIQUE.map((c, i) => [c, i + 1]));

/**
 * Rang d'un code au registre — l'ordre total du catalogue (§4.1 règle 3).
 *
 * Rend `null` pour tout ce qui n'est pas un code alloué : chaîne hors grammaire
 * (§4.1), ou code grammaticalement valide mais jamais alloué. Les deux cas se
 * traitent pareil — il n'y a pas de rang pour ce qui n'existe pas —, et c'est
 * ce `null` que `verifier` transforme en échec de chargement.
 */
export function rangCode(code) {
  if (typeof code !== 'string' || !RE_CODE.test(code)) return null;
  return RANG_AU_REGISTRE.get(code) ?? null;
}

/** Comparateur d'opérateurs par rang de registre croissant (§4.1 règle 3). */
export const parCode = (a, b) => rangCode(a.code) - rangCode(b.code);

/**
 * Comparateur de CODES pour la canonicalisation N2 — l'ordre d'écriture dans
 * une URL, qui n'est pas celui du registre.
 *
 * ★ Deux ordres, et c'est voulu. Le registre ordonne le CATALOGUE : il porte
 * une intention (les notoires d'abord) et il doit rester stable même quand un
 * code neuf arrive. N2, lui, range une suite d'opérateurs **commutants** à
 * l'intérieur d'une URL, pour que `fl+fac` et `fac+fl` s'écrivent pareil ; il
 * lui faut un ordre que le lecteur d'un lien puisse REFAIRE sans le catalogue,
 * donc un ordre lisible sur la chaîne seule. C'est l'ordre des unités de code
 * (§4.4 règle 4), déjà appliqué tel quel par `bfs.js › codesCanoniques`.
 */
export const comparerCodes = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

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
    if (typeof op.code !== 'string' || !RE_CODE.test(op.code)) {
      echec(`${ou} : code hors grammaire §4.1 (lettre de famille, corps parlant en `
        + 'minuscules et chiffres, majuscule de variante facultative).');
    }
    const rang = rangCode(op.code);
    if (rang === null) {
      echec(`${ou} : code absent du registre — tout code alloué s'inscrit dans `
        + '`ORDRE_CANONIQUE`, sinon le catalogue n\'a plus d\'ordre (§4.1 règle 3).');
    }
    if (op.code[0] !== PREFIXE[op.famille]) {
      echec(`${ou} : préfixe « ${op.code[0]} » incohérent avec la famille ${op.famille}.`);
    }
    if (vus.has(op.code)) echec(`${ou} : code déjà pris par « ${vus.get(op.code)} » — un code est alloué à vie (§4.1).`);
    vus.set(op.code, op.id);
    if (rang <= precedent) {
      echec(`${ou} : ordre de déclaration ≠ ordre du registre (§4.1 règle 3).`);
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
    // `outil` — le nom AFFICHÉ DANS LA SCÈNE du décor que l'opérateur monte
    // (réglette, clavier, afficheur). Il est toujours présent : `def` le fait
    // retomber sur le libellé quand l'objet montré n'a pas de nom propre. Il
    // est donc affichable, donc bilingue, comme tout le reste.
    if (!estBilingue(op.outil)) echec(`${ou} : « outil » doit porter ses deux langues (§ i18n).`);
    if (op.note !== null && !estBilingue(op.note)) {
      echec(`${ou} : « note » doit être null ou porter ses deux langues (§ i18n).`);
    }
    if (op.isJoker && op.famille !== 'joker') echec(`${ou} : isJoker réservé à la famille joker.`);
  }
  // Le registre ne contient pas de rang fantôme : un code inscrit sans
  // opérateur derrière creuserait un trou dans l'ordre, et surtout laisserait
  // croire qu'une pierre tombale est encore vivante. Retirer un opérateur, ce
  // n'est pas le rayer du registre — c'est le déclarer `deprecated` (§4.1).
  const orphelins = ORDRE_CANONIQUE.filter((c) => !vus.has(c));
  if (orphelins.length) {
    echec(`registre : ${orphelins.length} code(s) inscrits sans opérateur — ${orphelins.join(', ')}.`);
  }
  // Les familles restent groupées, et dans l'ordre des préfixes : c'est ce qui
  // rend `operateursDepuis` lisible, et ce qui permet à un lecteur d'URL de
  // deviner la famille d'un code sans consulter le catalogue (§4.1).
  const familles = [...new Set(ORDRE_CANONIQUE.map((c) => c[0]))];
  const attendu = ORDRE_PREFIXES.filter((p) => familles.includes(p));
  if (familles.join('') !== attendu.join('')) {
    echec(`registre : familles dans l'ordre « ${familles.join('')} » au lieu de « ${attendu.join('')} » (§4.1).`);
  }
  return liste;
}

/** Le catalogue complet, gelé, dans l'ordre du registre. */
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
