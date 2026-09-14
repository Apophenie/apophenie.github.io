/**
 * ★ **LA LIGNE PRINCIPALE RESTE À L'ÉCRAN — l'œil qui le vérifie.**
 *
 * > « Il y a plusieurs animations buggées (sort de l'écran vers le haut). Peux-tu
 * >   ajouter une garde qui vérifie que la ligne principale est toujours à
 * >   l'écran pour toutes les animations. » (l'autrice)
 *
 * Partagé par la garde de routine (`cadre.test.js`, un exemple par opérateur)
 * et par les gardes lentes (`lents/`, les vraies voies) : un seul œil, une
 * seule définition, sans quoi deux gardes finiraient par ne pas surveiller la
 * même chose.
 *
 * ## Ce que « la ligne est à l'écran » veut dire
 *
 * **La ligne principale**, à l'instant t d'une étape, ce sont les jetons de
 * TEXTE du flux de mise en page — `scene.flow` — relevé à l'entrée de l'étape
 * ET à sa sortie (l'entrée de la suivante) : ceux qu'on regarde au départ, et
 * ceux qui les remplacent. Parmi eux, seuls comptent ceux qui sont VISIBLES à
 * cet instant (opacité > 0,1, texte non vide), à leur position, leur échelle et
 * leur texte animés — le lecteur `_lecteur.js` rejoue la timeline comme le
 * navigateur.
 *
 * **Ce qui en est exclu, et pourquoi** — tout ce qui n'est pas dans le flux :
 *  · les DÉCORS (tables, claviers, afficheurs, encarts, potence, accolades,
 *    règles, halos) : ils vivent hors de la ligne, au-dessus ou au-dessous, et
 *    ont leur propre cadrage — on ne demande pas qu'une réglette de vingt-six
 *    cases tienne, on demande que la ligne ne s'en aille pas pour lui faire
 *    place ;
 *  · les ÉTIQUETTES et TITRES (nom d'outil, « Factorielle ! », légendes) ;
 *  · les COPIES EN VOL et exemplaires intermédiaires (paquets de la potence,
 *    colonne de la factorielle, doubles du carré, « ! » suspendus) : ils se
 *    détachent de la ligne, c'est le geste ;
 *  · les nœuds du moteur (`@camera`, `@pan`).
 *
 * Un jeton du flux qui s'envole lui-même (la lettre qui monte vers sa case)
 * reste compté tant qu'il est visible : il vole vers un décor que la caméra
 * cadre, et un jeton de la ligne qui sortirait du cadre en chemin serait un
 * défaut au même titre.
 *
 * **Le cadre visible** est le `viewBox` de la scène. La position à l'écran
 * d'un point `p` de la scène est — MESURÉ au navigateur sur la chaîne de
 * `dom.js › enchainer`, et non supposé :
 *
 *     écran = T_caméra + C + s · (p + pan − C)
 *
 * où `C` est le centre du viewBox (l'origine du recul), `s` le `scale` de
 * `@camera`, `T_caméra` son `translate` et `pan` celui de `@pan`. Le
 * `translate` de la caméra porte la chaîne EXTÉRIEURE : il n'est PAS multiplié
 * par le recul.
 *
 * **La tolérance retenue** :
 *  · VERTICALEMENT, la boîte des jetons entière — de leur haut à leur bas, à
 *    leur échelle — tient dans le cadre, à `TOLERANCE` unité près (arrondis de
 *    la compilation). Une ligne dont on ne voit que la moitié basse est déjà
 *    illisible : exiger seulement la ligne de base aurait laissé passer une
 *    ligne tranchée par le bord.
 *  · HORIZONTALEMENT, la ligne doit seulement CROISER le cadre sur au moins une
 *    chasse. Une ligne plus large que la scène déborde par doctrine (« jamais
 *    deux lignes, on fait défiler », `defilement.js`) : exiger qu'elle tienne
 *    en entier condamnerait toute URL.
 */

import { Scene } from '../scene.js';
import { compile } from '../compile.js';
import { lecteur } from './_lecteur.js';

/** Unités viewBox tolérées au bord : les arrondis de compilation, pas plus. */
export const TOLERANCE = 1;

/** Pas d'échantillonnage par défaut, en millisecondes de timeline. */
export const PAS = 25;

/**
 * Compile un scénario en relevant la ligne à l'entrée de chaque étape.
 *
 * Le mouchard est posé sur `scene.oublierAncres()`, appelé UNE fois par étape
 * avant ses ops (même instrument que `integration-visuel.test.js`) ; il observe
 * sans rien remplacer, et il est rendu au propre dans tous les cas.
 *
 * @returns {{tl:object, lignes:string[][]}} `lignes[i]` = le flux à l'entrée de
 *   l'étape i ; `lignes[n]` = le flux final
 */
export function compilerEnRelevant(scenario, options) {
  const lignes = [];
  const original = Scene.prototype.oublierAncres;
  Scene.prototype.oublierAncres = function mouchard() {
    lignes.push(this.flow.slice());
    return original.call(this);
  };
  let tl;
  try {
    tl = compile(scenario, options);
  } finally {
    Scene.prototype.oublierAncres = original;
  }
  lignes.push(tl.scene.flow.slice());
  return { tl, lignes };
}

/**
 * Les instants où l'on regarde une étape : ses deux bouts, et un pas régulier
 * entre eux. La fin est prise un souffle AVANT la charnière — à la charnière
 * même, c'est l'étape suivante qui répond.
 */
function instantsDe(st, pas) {
  const n = Math.max(2, Math.ceil(st.duration / pas));
  const out = [];
  for (let k = 0; k <= n; k++) out.push(st.t0 + (st.duration * k) / n);
  out[out.length - 1] = Math.max(st.t0, st.t1 - 0.5);
  return out;
}

/**
 * Où la ligne principale est-elle, à l'écran, à l'instant t ?
 * @returns {?{haut:number,bas:number,gauche:number,droite:number}} `null` si
 *   aucun jeton de la ligne n'est visible
 */
export function boiteALEcran(tl, lire, ids, t) {
  const vb = tl.viewBox;
  const C = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
  const s = lire.valeur('@camera', 'scale', t) ?? 1;
  const T = lire.valeur('@camera', 'translate', t) ?? { x: 0, y: 0 };
  const pan = lire.valeur('@pan', 'translate', t) ?? { x: 0, y: 0 };
  const ex = (x) => T.x + C.x + s * (x + pan.x - C.x);
  const ey = (y) => T.y + C.y + s * (y + pan.y - C.y);
  let boite = null;
  for (const j of lire.visibles(t)) {
    if (!ids.has(j.id)) continue;
    const b = { haut: ey(j.y - j.h / 2), bas: ey(j.y + j.h / 2), gauche: ex(j.g), droite: ex(j.d) };
    boite = boite ? {
      haut: Math.min(boite.haut, b.haut), bas: Math.max(boite.bas, b.bas),
      gauche: Math.min(boite.gauche, b.gauche), droite: Math.max(boite.droite, b.droite),
    } : b;
  }
  return boite;
}

/**
 * Les sorties de cadre de la ligne principale, la pire par étape.
 *
 * @param {object} tl        la timeline compilée
 * @param {string[][]} lignes le relevé de `compilerEnRelevant`
 * @param {{pas?:number}} [opt]
 * @returns {{step:number, titre:string, t:number, dt:number, sens:string, ecart:number}[]}
 */
export function sortiesDeCadre(tl, lignes, opt = {}) {
  const pas = opt.pas ?? PAS;
  const lire = lecteur(tl);
  const vb = tl.viewBox;
  const chasse = tl.metrics.advance;
  const out = [];
  for (const st of tl.steps) {
    const ids = new Set([...(lignes[st.index] || []), ...(lignes[st.index + 1] || [])]);
    let pire = null;
    for (const t of instantsDe(st, pas)) {
      const b = boiteALEcran(tl, lire, ids, t);
      if (!b) continue;
      const ecarts = {
        haut: vb.y - b.haut,
        bas: b.bas - (vb.y + vb.h),
        // Horizontalement, on n'exige que de croiser le cadre sur une chasse.
        gauche: (vb.x + chasse) - b.droite,
        droite: b.gauche - (vb.x + vb.w - chasse),
      };
      for (const [sens, e] of Object.entries(ecarts)) {
        if (e > TOLERANCE && (!pire || e > pire.ecart)) {
          pire = {
            step: st.index, titre: st.title, t: Math.round(t), dt: Math.round(t - st.t0),
            duree: Math.round(st.duration), sens, ecart: Math.round(e * 10) / 10,
          };
        }
      }
    }
    if (pire) out.push(pire);
  }
  return out;
}

/** Une sortie de cadre, dite en une ligne lisible dans un message d'assertion. */
export function dire(s) {
  return `étape ${s.step} « ${s.titre} », t = ${s.t} ms (${s.dt}/${s.duree} ms dans l'étape) : `
    + `la ligne sort de ${s.ecart} unités vers ${s.sens === 'haut' ? 'le haut' : s.sens === 'bas' ? 'le bas' : `la ${s.sens}`}`;
}
