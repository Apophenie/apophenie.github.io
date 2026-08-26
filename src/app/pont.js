/** Le pont vers les autres moteurs.
 *
 *  `src/moteur/`, `src/recherche/` et `src/visuel/` appartiennent à d'autres
 *  agents. Ce module les charge, normalise ce que l'interface consomme, et se
 *  rabat proprement quand une pièce manque.
 *
 *  Deux règles de conduite :
 *    · La grammaire d'URL et le base58 sont la propriété de `src/recherche/`.
 *      L'interface ne les réimplémente PAS : si `src/recherche/url.js` ne se
 *      charge pas, on le dit et on s'arrête là. Deux encodeurs divergents, ce
 *      sont des liens qui s'écrivent d'un côté et ne se relisent pas de l'autre.
 *    · Un repli reste un repli : il affiche l'échec, il ne fabrique jamais
 *      d'URL de partage.
 *
 *  Aucune branche ne jette : une page dégradée mais honnête vaut mieux qu'une
 *  page blanche. */

import * as secours from './secours.js';
import { langue } from '../i18n/index.js';

/** @type {{url:string, recherche:string, visuel:string, raison:?string}} */
export const etat = {
  url: 'attente',        // 'branché' | 'absent'
  recherche: 'attente',  // 'branché' | 'absent'
  visuel: 'attente',     // 'branché' | 'absent'
  raison: null,
};

const M = {};   // les fonctions réellement obtenues

/**
 * Le registre des modules voisins : un spécificateur littéral par pièce.
 *
 * Le pont doit rester capable de constater qu'une pièce manque — c'est toute sa
 * raison d'être. Il lui faut donc un `import()`, dont l'échec se rattrape, là où
 * un `import` statique emporterait la page entière. Mais un `import(variable)`
 * est opaque à l'empaqueteur : il ne saurait ni suivre la dépendance, ni la
 * replier dans le fichier unique que réclame l'ouverture en `file://`.
 * D'où cette table : le chargement reste paresseux et rattrapable, le chemin
 * redevient lisible par une machine.
 *
 * Une pièce hors registre est traitée exactement comme une pièce absente.
 */
const MODULES = {
  '../recherche/url.js': () => import('../recherche/url.js'),
  '../recherche/scenario.js': () => import('../recherche/scenario.js'),
  '../recherche/index.js': () => import('../recherche/index.js'),
  '../visuel/index.js': () => import('../visuel/index.js'),
};

async function charger(chemin) {
  const importer = MODULES[chemin];
  if (!importer) return { __erreur: new Error(`module « ${chemin} » hors du registre du pont`) };
  try { return await importer(); } catch (err) { return { __erreur: err }; }
}
const ok = (m) => m && !m.__erreur;

let promesse = null;

/** Charge tout ce qui est chargeable. Idempotent, jamais bloquant. */
export function preparer() {
  if (promesse) return promesse;
  promesse = (async () => {
    /* ── 1. La grammaire d'URL : dépendance dure, propriété de src/recherche ── */
    const url = await charger('../recherche/url.js');
    if (ok(url) && typeof url.lire === 'function' && typeof url.ecrire === 'function') {
      M.lire = url.lire;
      M.ecrire = url.ecrire;
      M.canoniser = url.canoniser;
      M.BANDEAUX = url.BANDEAUX;
      // Le REGISTRE de mise en scène appartient à la grammaire d'URL, comme
      // tout le reste : l'interface ne redéfinit ni ses noms, ni son défaut,
      // ni sa bascule. Deux tables de registres divergentes, ce seraient des
      // liens qui s'écrivent d'un côté et se relisent de travers de l'autre.
      M.REGISTRES = url.REGISTRES;
      M.REGISTRE_DEFAUT = url.REGISTRE_DEFAUT;
      M.autreRegistre = url.autreRegistre;
      M.registresDisponibles = url.registresDisponibles;
      M.miseEnSceneDisponible = url.miseEnSceneDisponible;
      etat.url = 'branché';
    } else {
      etat.url = 'absent';
      etat.raison = 'src/recherche/url.js est introuvable ou incomplet.';
      console.error('[NumHeroLOLgeek] grammaire d’URL indisponible :', url && url.__erreur);
    }

    /* ── 1 bis. Les libellés d'approche, dans la langue de l'interface ──
       `moteur.resoudre()` compose `titre` et `regle` à partir des libellés
       bilingues du catalogue, mais avec la langue de repli — il ne reçoit pas
       la langue. Les deux fabriques sont exportées par `src/recherche/
       scenario.js` et prennent la langue en second argument : on les récupère
       ici pour recomposer les titres à chaque résolution. Sans elles,
       l'interface anglaise afficherait des titres de méthode en français. */
    const sc = await charger('../recherche/scenario.js');
    if (ok(sc) && typeof sc.titreApproche === 'function') {
      M.titreApproche = sc.titreApproche;
      M.regleApproche = sc.regleApproche;
    }

    /* ── 2. Le moteur de recherche (dépend du catalogue arithmétique) ── */
    const rech = await charger('../recherche/index.js');
    if (ok(rech) && typeof rech.creerMoteur === 'function') {
      M.REPONSES_DEDIEES = rech.REPONSES_DEDIEES || new Map();
      M.LIMITE_SAISIE = rech.LIMITE_SAISIE || 500;
      // La CIBLE appartient au moteur de recherche, comme la grammaire d'URL :
      // l'interface ne redéfinit ni son écriture, ni son plafond, ni son défaut.
      // Deux lecteurs de cible divergents, ce seraient des liens qu'on écrit
      // d'un côté et qu'on relit de travers de l'autre — la même faute que pour
      // le base58, et pour la même raison.
      M.lireCible = rech.lireCible;
      M.normaliserCible = rech.normaliserCible;
      M.CIBLE_DEFAUT = rech.CIBLE_DEFAUT;
      M.MAX_CHIFFRES = rech.MAX_CHIFFRES;
      try {
        const catalogue = await rech.chargerCatalogue();
        M.moteur = rech.creerMoteur(catalogue);
        etat.recherche = 'branché';
      } catch (err) {
        etat.recherche = 'absent';
        console.warn('[NumHeroLOLgeek] catalogue arithmétique indisponible :', err && err.message);
      }
    } else {
      etat.recherche = 'absent';
      console.warn('[NumHeroLOLgeek] moteur de recherche indisponible :', rech && rech.__erreur);
    }

    /* ── 3. Le moteur visuel ── */
    const vis = await charger('../visuel/index.js');
    if (ok(vis) && typeof vis.createPlayer === 'function') {
      M.createPlayer = vis.createPlayer;
      M.prepare = typeof vis.prepare === 'function' ? vis.prepare : async () => {};
      M.REPEAT_SPEED = typeof vis.REPEAT_SPEED === 'number' ? vis.REPEAT_SPEED : 5;
      etat.visuel = 'branché';
    } else {
      etat.visuel = 'absent';
      console.warn('[NumHeroLOLgeek] moteur visuel indisponible :', vis && vis.__erreur);
    }
    return etat;
  })();
  return promesse;
}

export const LIMITE_SAISIE = () => M.LIMITE_SAISIE || 500;
export const bandeaux = () => M.BANDEAUX || {};

/* ─────────────────────────────── La cible ───────────────────────────────── */

/** Le plafond de longueur d'une cible, relayé depuis `src/recherche/cible.js`. */
export const MAX_CHIFFRES = () => M.MAX_CHIFFRES || 6;

/** Lecture d'une cible saisie : `null` si ce n'en est pas une. */
export const lireCible = (texte) => (M.lireCible ? M.lireCible(texte) : null);

/** La cible, normalisée — 666 quand elle manque ou qu'elle est illisible. */
export const normaliserCible = (x) => (M.normaliserCible ? M.normaliserCible(x) : null);

/** L'écriture d'une cible, quelle que soit la forme sous laquelle elle arrive.
 *  Sans moteur chargé, on n'invente pas : la page affichera ce qu'elle a. */
export function texteCible(x) {
  if (x && typeof x === 'object' && typeof x.texte === 'string') return x.texte;
  const c = normaliserCible(x);
  return c ? c.texte : (typeof x === 'string' && x ? x : '666');
}

/* Le registre de mise en scene, relaye tel quel depuis `src/recherche/url.js`.
   Les valeurs de repli ne servent que si la grammaire ne s'est pas chargee du
   tout — auquel cas la page ne montre de toute facon aucune demonstration.

   ★ Le defaut vaut desormais SOBRE : la mise en scene s'opte (voir `url.js`).
   `pages/accueil.js` lit cette constante pour decider vers quelle URL mene le
   bouton « Reveler » — il ouvrira donc la version sobre, ce qui est la lecture
   litterale de la nouvelle regle et ne demande aucune decision de plus. */
export const REGISTRE_DEFAUT = 'sobre';
export const autreRegistre = (r, cible) =>
  (M.autreRegistre ? M.autreRegistre(r, cible) : null);
/* Les registres qu'une cible sait offrir. Sans grammaire chargee, aucun
   panneau n'est affiche de toute facon : le repli est le plus neutre. */
export const registresDisponibles = (cible) =>
  (M.registresDisponibles ? M.registresDisponibles(cible) : ['sobre']);

/* ───────────────────────────── Grammaire d'URL ───────────────────────────── */

/** Lecture tolérante. `null` si la grammaire n'est pas disponible du tout. */
export function lireHash(hash) {
  if (!M.lire) return null;
  try { return M.lire(hash); } catch (err) {
    console.error('[NumHeroLOLgeek] lecture d’URL impossible :', err);
    return null;
  }
}

/** Écriture canonique. `null` si indisponible — on n'invente jamais un lien. */
export function ecrireHash(demonstration) {
  if (!M.ecrire) return null;
  try { return M.ecrire(demonstration); } catch (err) {
    console.error('[NumHeroLOLgeek] écriture d’URL impossible :', err);
    return null;
  }
}

/** Réécrit la barre d'adresse en forme canonique (CONTRACTS §4.3). */
export function canoniser(demonstration) {
  if (!M.canoniser) return null;
  try { return M.canoniser(demonstration); } catch { return null; }
}

export const reponseDediee = (saisie) =>
  (M.REPONSES_DEDIEES ? M.REPONSES_DEDIEES.get(String(saisie).toLowerCase().trim()) || null : null);

/* ────────────────────────────── Recherche ───────────────────────────────── */

/**
 * @returns {{saisie:string, approches:Array, fragments:Array, dedie:?Object,
 *            urlResultats:?string, source:'moteur'|'secours'}}
 */
export function resoudre(saisie, cible) {
  if (M.moteur) {
    try {
      const r = M.moteur.resoudre(saisie, { cible });
      return { ...r, approches: (r.approches || []).map(traduireApproche), source: 'moteur' };
    } catch (err) {
      console.error('[NumHeroLOLgeek] la recherche a échoué :', err);
    }
  }
  return {
    saisie,
    approches: secours.APPROCHES_ESSAI,
    fragments: secours.FRAGMENTS_ESSAI,
    dedie: null,
    urlResultats: null,        // un repli ne fabrique pas d'URL
    source: 'secours',
  };
}

/** Recompose `titre` et `regle` d'une approche dans la langue courante.
 *  Copie de surface : on ne mutile pas l'objet du moteur, qui peut être
 *  mémoïsé et qui porte `parts`, indispensable à la compilation du scénario. */
function traduireApproche(approche) {
  if (!approche || !M.titreApproche) return approche;
  const l = langue();
  try {
    return { ...approche, titre: M.titreApproche(approche, l), regle: M.regleApproche(approche, l) };
  } catch { return approche; }
}

/** Rejoue une lecture canonique sans relancer la recherche (CONTRACTS §4.3). */
export function rejouer(lecture) {
  if (!M.moteur) return { ok: false, raison: 'moteur absent' };
  try {
    const r = M.moteur.rejouer(lecture);
    return r && r.ok ? { ...r, approche: traduireApproche(r.approche) } : r;
  } catch (err) {
    console.error('[NumHeroLOLgeek] rejeu impossible :', err);
    return { ok: false, raison: 'rejeu impossible' };
  }
}

/** @returns {{scenario:Object, source:'moteur'|'secours'}} */
export function scenarioDe(approche, saisie, options = {}) {
  if (M.moteur && typeof M.moteur.scenarioDe === 'function' && approche && approche.parts) {
    try {
      // La langue traverse jusqu'aux `steps()` du catalogue : sans elle, les
      // titres d'étape repartent en français quelle que soit l'interface.
      // Le registre traverse pour la même raison : c'est le SCÉNARIO qui perd
      // ses cornes en sobre, pas le lecteur (`recherche/scenario.js`).
      const sc = M.moteur.scenarioDe(approche, {
        saisie, langue: langue(), registre: options.registre, cible: options.cible,
      });
      if (sc && Array.isArray(sc.steps)) return { scenario: sc, source: 'moteur' };
    } catch (err) {
      console.error('[NumHeroLOLgeek] compilation du scénario impossible :', err);
    }
  }
  return { scenario: secours.scenarioDEssai(approche, saisie), source: 'secours' };
}

/* ─────────────────────────────── Lecteur ────────────────────────────────── */

/** Prépare le moteur visuel (polices + glyphes) avant toute mesure (§3.2 r.8). */
export async function preparerVisuel() {
  if (!M.prepare) return false;
  try { await M.prepare(); return true; } catch (err) {
    console.warn('[NumHeroLOLgeek] préparation du moteur visuel incomplète :', err && err.message);
    return false;
  }
}

/**
 * L'UI est un pur reflet du lecteur : elle n'a aucune logique d'animation.
 * @returns {{lecteur:Object, source:'moteur'|'secours'}}
 */
/** Facteur d'accélération des étapes qui redisent une étape déjà jouée. Le
 *  lecteur le reçoit dans ses options (`repeatSpeed`) et le repasse à la
 *  compilation : aucun état partagé entre le lecteur du logo et celui de la
 *  démonstration. */
export const facteurRepetitions = () => M.REPEAT_SPEED || 5;

export function creerLecteur(racineSvg, scenario, options) {
  if (M.createPlayer && racineSvg) {
    try {
      const l = M.createPlayer(racineSvg, scenario, options);
      if (l && typeof l.seek === 'function') return { lecteur: l, source: 'moteur' };
    } catch (err) {
      console.error('[NumHeroLOLgeek] le moteur visuel a échoué :', err);
    }
  }
  return { lecteur: secours.creerLecteurDeSecours(scenario, options), source: 'secours' };
}
