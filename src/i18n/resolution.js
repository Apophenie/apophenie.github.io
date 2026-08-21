/** Résolution i18n — **pur**, sans DOM, sans `localStorage`, sans `Intl`.
 *
 *  Tout ce qui est testable hors navigateur vit ici (`i18n.test.js`).
 *  Aucune source d'entropie (CONTRACTS §4.4 règle 4) : comparaisons de chaînes
 *  en unités de code, jamais `localeCompare`. */

/** Les deux seules langues du site. Le français est la langue de repli. */
export const LANGUES = ['fr', 'en'];
export const LANGUE_DEFAUT = 'fr';

/** `'fr-BE'` → `'fr'`, `'EN_us'` → `'en'`, tout le reste → `null`. */
export function normaliserLangue(brut) {
  if (typeof brut !== 'string') return null;
  const base = brut.trim().toLowerCase().replace('_', '-').split('-')[0];
  return LANGUES.includes(base) ? base : null;
}

/**
 * Détection initiale : première langue reconnue de la liste du navigateur,
 * repli français. `navigator.languages` d'abord, `navigator.language` ensuite —
 * la liste porte l'ordre de préférence, la valeur simple ne le porte pas.
 * @param {string[]|string|undefined} preferees
 */
export function detecterLangue(preferees) {
  const liste = Array.isArray(preferees) ? preferees : (preferees ? [preferees] : []);
  for (const brut of liste) {
    const l = normaliserLangue(brut);
    if (l) return l;
  }
  return LANGUE_DEFAUT;
}

/**
 * Résout un chemin pointé dans un dictionnaire.
 * @returns {*} la valeur, ou `undefined` si absente (jamais d'exception).
 */
export function lireChemin(dico, chemin) {
  if (!dico || typeof chemin !== 'string' || !chemin) return undefined;
  let valeur = dico;
  for (const segment of chemin.split('.')) {
    if (valeur === null || typeof valeur !== 'object' || !(segment in valeur)) return undefined;
    valeur = valeur[segment];
  }
  return valeur;
}

/** Remplace `{nom}` par `vars.nom`. Un jeton non fourni reste visible tel quel :
 *  un trou dans une phrase se voit, une chaîne vide se cache. */
export function interpoler(modele, vars) {
  if (!vars) return modele;
  return String(modele).replace(/\{(\w+)\}/g, (entier, nom) =>
    (vars[nom] === undefined || vars[nom] === null ? entier : String(vars[nom])));
}

/**
 * Résout `chemin` dans `langue`, sinon dans la langue de repli, sinon rend le
 * chemin lui-même — un chemin brut à l'écran est un signal de développement
 * lisible, très supérieur à une chaîne vide silencieuse.
 * @param {Object<string,Object>} dictionnaires  `{ fr, en }`
 */
export function resoudre(dictionnaires, langue, chemin, vars) {
  const direct = lireChemin(dictionnaires[langue], chemin);
  const valeur = typeof direct === 'string'
    ? direct
    : lireChemin(dictionnaires[LANGUE_DEFAUT], chemin);
  if (typeof valeur !== 'string') return chemin;
  return interpoler(valeur, vars);
}

/** Même résolution, mais sans repli sur la chaîne : rend la valeur brute
 *  (tableau, objet, nombre…). Sert aux listes — `accueil.exemples`. */
export function resoudreValeur(dictionnaires, langue, chemin) {
  const direct = lireChemin(dictionnaires[langue], chemin);
  if (direct !== undefined) return direct;
  return lireChemin(dictionnaires[LANGUE_DEFAUT], chemin);
}

/**
 * Consomme un libellé **produit ailleurs** — catalogue arithmétique, moteur de
 * recherche, jeu d'essai — dont la forme traduite est `{fr, en}`.
 *
 * Cette forme appartient au catalogue (elle y est définie par l'agent
 * arithmétique) : on ne la redéfinit pas, on la LIT. Les trois formes tolérées :
 *   · `{ fr: '…', en: '…' }` → la langue demandée, repli français ;
 *   · `'…'` (chaîne nue, pas encore traduite) → rendue telle quelle ;
 *   · `null` / `undefined` → `''`.
 */
export function localiser(valeur, langue) {
  if (valeur === null || valeur === undefined) return '';
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'object') {
    const choisi = valeur[langue];
    if (typeof choisi === 'string') return choisi;
    const repli = valeur[LANGUE_DEFAUT];
    if (typeof repli === 'string') return repli;
  }
  return String(valeur);
}

/** Liste à plat des chemins d'un dictionnaire — l'outil des tests de complétude.
 *  Les tableaux sont des feuilles (leur contenu n'est pas un chemin). */
export function chemins(dico, prefixe = '') {
  const sortie = [];
  for (const [cle, valeur] of Object.entries(dico || {})) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      sortie.push(...chemins(valeur, chemin));
    } else {
      sortie.push(chemin);
    }
  }
  return sortie;
}
