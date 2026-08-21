/** L'état de langue — fabrique **injectable**, donc testable sans navigateur.
 *
 *  `index.js` en fait un singleton branché sur le vrai `localStorage` et le vrai
 *  `navigator` ; les tests en fabriquent autant qu'ils veulent avec des doublures.
 *
 *  Ordre de détermination de la langue initiale, une seule fois :
 *    1. choix explicite persisté (`nhlg.langue`) ;
 *    2. `navigator.languages` / `navigator.language` ;
 *    3. français. */

import {
  LANGUES, LANGUE_DEFAUT, normaliserLangue, detecterLangue,
  resoudre, resoudreValeur, localiser,
} from './resolution.js';

export const CLE_LANGUE = 'nhlg.langue';

/** Magasin sans effet, pour les environnements sans `localStorage`. */
const magasinMuet = { getItem: () => null, setItem: () => {} };

/**
 * @param {{dictionnaires:Object, magasin?:Storage, languesNavigateur?:string[]}} options
 */
export function creerI18n(options = {}) {
  const dictionnaires = options.dictionnaires || {};
  const magasin = options.magasin || magasinMuet;

  const lireMagasin = () => {
    try { return magasin.getItem(CLE_LANGUE); } catch { return null; }
  };
  const ecrireMagasin = (v) => {
    try { magasin.setItem(CLE_LANGUE, v); } catch { /* mode privé : best effort */ }
  };

  /** `'fr'|'en'|null` — `null` signifie « aucun choix explicite ». */
  const langueChoisie = () => normaliserLangue(lireMagasin());

  let courante = langueChoisie() || detecterLangue(options.languesNavigateur);

  const auditeurs = new Set();
  const prevenir = () => { for (const f of Array.from(auditeurs)) f(courante); };

  function definirLangue(brut) {
    const l = normaliserLangue(brut);
    if (!l) return courante;
    // On PERSISTE même quand la langue ne change pas : choisir explicitement la
    // langue déjà affichée est une décision — « garde le français », alors que le
    // navigateur, lui, pourrait dire autre chose demain. Sans cette écriture, ce
    // choix ne survivrait pas à un changement de préférence système.
    ecrireMagasin(l);
    if (l === courante) return courante;
    courante = l;
    prevenir();
    return courante;
  }

  return {
    LANGUES,
    LANGUE_DEFAUT,
    /** La langue effective, toujours une des deux. */
    langue: () => courante,
    /** Le choix explicite, ou `null` s'il n'y en a jamais eu. */
    langueChoisie,
    definirLangue,
    /** @returns {Function} le désabonnement */
    onLangue(f) { auditeurs.add(f); return () => auditeurs.delete(f); },

    /** Traduction d'un chemin pointé, avec interpolation `{nom}`. */
    t: (chemin, vars) => resoudre(dictionnaires, courante, chemin, vars),
    /** Valeur brute (tableau, nombre…) d'un chemin pointé. */
    v: (chemin) => resoudreValeur(dictionnaires, courante, chemin),
    /** Libellé `{fr, en}` produit par le catalogue ou le moteur. */
    localiser: (valeur) => localiser(valeur, courante),
    /** L'autonyme d'une langue — jamais traduit. */
    autonyme: (code) => (dictionnaires[code] && dictionnaires[code].autonyme) || code,
  };
}
