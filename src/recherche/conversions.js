// src/recherche/conversions.js
// LES RELECTURES — d'un texte visé aux cibles chiffrées qu'on sait chercher.
//
// > « Passer par les chiffres et toutes les possibilités de transformation
// >   qu'on a pour arriver pile au mappage nécessaire pour retranscrire en
// >   fonction de la position sur un clavier ou un autre, ou dans l'alphabet…
// >   Je pense qu'il faudrait produire un mappage inverse "objectif vers
// >   chiffres" avec chacun des opérateurs chiffre→lettre et fournir la séquence
// >   de chiffres produite comme objectif pour notre outillage actuel. »
// >   (l'auteur)
//
// Un opérateur de RELECTURE est un opérateur du catalogue qui va des chiffres
// aux lettres et le déclare (`relecture: { domaine }`) : `m1a` (le rang dans
// l'alphabet), `mcaz` et `mcqw` (une touche désignée par sa colonne et sa
// rangée). Pour chacun, ce module calcule la suite de valeurs qui, relue,
// écrit la cible — et c'est cette suite que la recherche chiffrée existante
// vise, sans rien savoir de plus.
//
// ★ **L'INVERSE N'EST JAMAIS RECOPIÉ, IL SE CALCULE.** On applique l'opérateur
//   à chaque point de son domaine déclaré, et l'on retient ce qu'il écrit : la
//   table inverse est donc exactement celle de `apply`, pas une seconde table
//   qu'il faudrait tenir d'accord avec la première (CONTRACTS §0.3). Une
//   relecture qui écrirait la même lettre de deux façons ne serait pas une
//   relecture — elle choisirait — et le module refuse de la charger.
//
// ★ **Le module dépend du CONTRAT du catalogue, pas de son code** : il reçoit
//   les opérateurs en paramètre et les applique par `bfs.js`, comme tout le
//   reste de la recherche (CONTRACTS §1).

import { normaliserCatalogue, appliquerOp, etat } from './bfs.js';
import { cibleDeValeurs, plierMot, ecartDeForme, sansPonctuation } from './cible.js';

/**
 * La relecture qu'on suppose quand un lien vise un texte sans en nommer : le
 * rang dans l'alphabet, la plus notoire. Le site écrit toujours la sienne ;
 * ce défaut ne sert qu'aux liens écrits à la main.
 */
export const RELECTURE_PAR_DEFAUT = 'm1a';

/** Les opérateurs de relecture d'un catalogue, dans son ordre. */
export function operateursDeRelecture(catalogue) {
  return normaliserCatalogue(catalogue).filter((op) => op && op.relecture && !op.deprecated);
}

const INVERSES = new WeakMap();

/**
 * La table inverse d'une relecture : lettre écrite → valeurs qui l'écrivent.
 * Calculée une fois par opérateur, en parcourant son domaine déclaré.
 * @returns {Map<string, number[]>}
 */
export function inverseDe(op) {
  const memo = INVERSES.get(op);
  if (memo) return memo;
  const domaine = op && op.relecture && op.relecture.domaine;
  if (!Array.isArray(domaine) || !domaine.length || !domaine.every((d) => Array.isArray(d) && d.length)) {
    throw new Error(`relecture ${op && op.code} : « relecture.domaine » doit lister les valeurs de chaque place.`);
  }
  const inverse = new Map();
  const parcourir = (k, pris) => {
    if (k === domaine.length) {
      const e = appliquerOp(op, etat('NUMS', pris, []));
      if (!e || e.type !== 'TOKENS' || e.valeur.length !== 1) return;
      const lettre = e.valeur[0];
      if (inverse.has(lettre)) {
        throw new Error(`relecture ${op.code} : « ${lettre} » s'écrit par ${inverse.get(lettre).join(' ')} `
          + `ET par ${pris.join(' ')}. Une relecture qui choisit n'est plus une relecture.`);
      }
      inverse.set(lettre, Object.freeze([...pris]));
      return;
    }
    for (const v of domaine[k]) parcourir(k + 1, [...pris, v]);
  };
  parcourir(0, []);
  INVERSES.set(op, inverse);
  return inverse;
}

/**
 * Les valeurs qui écrivent UN signe : le signe TEL QUEL s'il est dans la table,
 * sinon sa forme pliée. `undefined` si ni l'un ni l'autre.
 *
 * ★ Tel quel d'abord : la table ASCII (`masi`) écrit « C » et « c », et plier
 *   d'office lui ferait payer une casse qu'elle sait écrire. Les autres tables
 *   n'ont que des bas de casse : pour elles, rien ne change.
 */
const valeursDuSigne = (inverse, signe) => inverse.get(signe) || inverse.get(plierMot(signe));

/**
 * La relecture d'un texte par UN opérateur : la cible sous-jacente, ce qu'elle
 * écrira réellement, et l'écart de forme qui sépare les deux. `null` si un
 * signe du texte n'a pas de valeurs qui l'écrivent.
 *
 * ★ Chaque signe est cherché tel quel, puis PLIÉ (`plierMot`) : le rang écrit
 *   « z », jamais « Z » ni « ẑ ». Ce qu'elle écrit n'est donc pas toujours ce
 *   qu'on vise, et l'écart se mesure sur le texte obtenu, pas sur l'intention.
 */
export function relecturePour(mot, op, { ponctuationOmise = false } = {}) {
  if (!mot || typeof mot.texte !== 'string') return null;
  // ★ LA PONCTUATION OMISE : on relit le texte sans elle, et l'écart se mesure
  //   toujours sur le texte VISÉ — c'est lui qui dit ce qui manque.
  const texte = ponctuationOmise ? sansPonctuation(mot.texte) : mot.texte;
  if (!texte || (ponctuationOmise && texte === mot.texte)) return null;
  const inverse = inverseDe(op);
  const valeurs = [];
  for (const signe of texte) {
    const v = valeursDuSigne(inverse, signe);
    if (!v) return null;
    valeurs.push(...v);
  }
  const cible = cibleDeValeurs(valeurs);
  const ecrit = appliquerOp(op, etat('NUMS', valeurs, []));
  if (!cible || !ecrit || ecrit.type !== 'TOKENS') return null;
  const produit = ecrit.valeur.join('');
  const ecart = ecartDeForme(produit, mot.texte);
  if (!ecart) return null;
  return Object.freeze({
    code: op.code, op, mot, cible, produit, ecart, ...(ponctuationOmise ? { ponctuationOmise: true } : {}),
  });
}

/**
 * ★ LA RELECTURE QU'UN LIEN DÉSIGNE — l'exacte si elle existe, sinon l'approchée.
 *
 * Un lien ne dit que le CODE (`mtap!`). Il n'est pas ambigu pour autant : pour
 * un texte et un opérateur donnés, `relecturesPour` ne produit JAMAIS les deux
 * — l'approchée n'est tentée que si l'exacte n'existe pas. Le rejeu refait le
 * même choix, dans le même ordre (`index.js › rejouer`).
 */
export function relectureDuLien(mot, op) {
  return relecturePour(mot, op) || (op && op.relecture && !op.relecture.reserve
    ? relecturePour(mot, op, { ponctuationOmise: true }) : null);
}

/**
 * ★ LE DIAGNOSTIC DES SIGNES — ceux du texte qu'AUCUNE relecture ne sait
 * écrire, dans l'ordre où ils paraissent, chacun une fois. Une espace, un « œ »,
 * un « j » pour qui n'aurait que le carré de Polybe : c'est ce qui bloque, et
 * le dire vaut mieux qu'une liste vide sans raison.
 * @returns {string[]}
 */
export function signesSansRelecture(mot, catalogue) {
  const inverses = operateursDeRelecture(catalogue).map(inverseDe);
  const out = [];
  for (const signe of (mot && mot.texte) || '') {
    if (inverses.some((inv) => valeursDuSigne(inv, signe)) || out.includes(signe)) continue;
    out.push(signe);
  }
  return out;
}

/**
 * Toutes les relectures d'un texte, dans l'ordre du catalogue.
 *
 * ★ **LES RELECTURES DE RÉSERVE** (`relecture.reserve`, la table ASCII) ne sont
 *   tentées que si le texte porte un signe qu'AUCUNE relecture ordinaire
 *   n'écrit — une apostrophe, un point d'exclamation. « Si des solutions courtes
 *   et élégantes sont trouvées, pas besoin de chercher les options longues et
 *   bancales » (l'auteur) : trois chiffres par signe, c'est une option longue,
 *   et un mot que le rang ou le téléphone savent écrire n'a pas à la payer.
 *   C'est ce qui laisse « Zerg », « Fantôme » ou « de la merde » exactement où
 *   ils étaient.
 */
export function relecturesPour(mot, catalogue) {
  const ops = operateursDeRelecture(catalogue);
  const ordinaires = ops.filter((op) => !op.relecture.reserve).map(inverseDe);
  const signes = [...((mot && mot.texte) || '')];
  const besoinDeReserve = signes.some((s) => !ordinaires.some((inv) => valeursDuSigne(inv, s)));
  const out = [];
  for (const op of ops) {
    if (op.relecture.reserve && !besoinDeReserve) continue;
    // ★ Une relecture ORDINAIRE qui n'écrit pas la ponctuation vise le texte
    //   sans elle, et paie l'écart (`cible.js › ECARTS.ponctuation`). Une
    //   relecture de réserve, elle, existe justement pour l'écrire.
    const r = relectureDuLien(mot, op);
    if (r) out.push(r);
  }
  return out;
}
