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
import { cibleDeValeurs, plierMot, ecartDeForme } from './cible.js';

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
 * La relecture d'un texte par UN opérateur : la cible sous-jacente, ce qu'elle
 * écrira réellement, et l'écart de forme qui sépare les deux. `null` si un
 * signe du texte n'a pas de valeurs qui l'écrivent.
 *
 * ★ Chaque signe est cherché PLIÉ (`plierMot`) : une relecture écrit « z »,
 *   jamais « Z » ni « ẑ ». Ce qu'elle écrit n'est donc pas toujours ce qu'on
 *   vise, et l'écart se mesure sur le texte obtenu, pas sur l'intention.
 */
export function relecturePour(mot, op) {
  if (!mot || typeof mot.texte !== 'string') return null;
  const inverse = inverseDe(op);
  const valeurs = [];
  for (const signe of mot.texte) {
    const v = inverse.get(plierMot(signe));
    if (!v) return null;
    valeurs.push(...v);
  }
  const cible = cibleDeValeurs(valeurs);
  const ecrit = appliquerOp(op, etat('NUMS', valeurs, []));
  if (!cible || !ecrit || ecrit.type !== 'TOKENS') return null;
  const produit = ecrit.valeur.join('');
  const ecart = ecartDeForme(produit, mot.texte);
  if (!ecart) return null;
  return Object.freeze({ code: op.code, op, mot, cible, produit, ecart });
}

/** Toutes les relectures d'un texte, dans l'ordre du catalogue. */
export function relecturesPour(mot, catalogue) {
  const out = [];
  for (const op of operateursDeRelecture(catalogue)) {
    const r = relecturePour(mot, op);
    if (r) out.push(r);
  }
  return out;
}
