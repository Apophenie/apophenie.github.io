// src/recherche/bfs.js
// Fermeture d'accessibilité canonicalisée + faisceau local par état.
// CONTRACTS.md §5 · research/heuristique.md §2.
//
// Résultat de recherche mesuré : l'espace canonique fait 10² à 10³ états
// (105 pour « hope », 2 668 pour une URL longue) alors que l'espace des chemins
// bruts vaut ~178 000 à d=6. On énumère donc EXHAUSTIVEMENT plutôt que de faire
// du A* (dont l'heuristique admissible est plafonnée à 3, cf. §2.3).
//
// Ce module n'importe pas bassin.js : le bassin est injecté par le contexte,
// ce qui évite un cycle d'import et rend le module testable isolément.

import {
  scorePartiel, scoreDeAcc, accumulateurInitial, accumuler,
} from './score.js';
// ★ Les bornes de TEMPS vivent dans `src/config.js` — voir l'en-tête de ce
//   fichier-là pour la condition qui permettrait de les relever.
import { BUDGET_MS, BUDGET_MS_FILET, BUDGET_TOTAL_MS } from '../config.js';

/** Constantes de garde-fou — CONTRACTS.md §5. */
export const D_MAX = 4;        // + 2 niveaux gratuits par le bassin → profondeur effective 6
export const P_BEAM = 12;      // chemins conservés par état canonique
export const MAX_NODES = 20000;
export { BUDGET_MS };          // par fragment
export const N_FRAG_MAX = 64;
/**
 * ★ **BORNE DE MÉMOIRE — ET ELLE GARDE LES MEILLEURS, PLUS LES PREMIERS ARRIVÉS.**
 *
 * Mesuré 24..404 chemins par saisie ; la borne n'est donc atteinte que sur les
 * saisies les plus riches. Elle l'était en coupant net : `if (resultats.length
 * >= MAX_RESULTATS) break`, c'est-à-dire **au premier arrivé, dans l'ordre du
 * catalogue**.
 *
 * ⚠️ **CE N'ÉTAIT PAS UNE BORNE, C'ÉTAIT UN CLASSEMENT PAR ORDRE ALPHABÉTIQUE
 * DES CODES**, et il a fallu ajouter un opérateur pour le voir. Le tri
 * alphabétique (`mtal`) atteignait le but 21 fois sur `Macron` — mesuré, sonde à
 * l'appui — et aucune de ces 21 réussites n'entrait dans la liste : les 400
 * places étaient prises avant qu'on y arrive. Un opérateur inscrit tard au
 * registre était donc invisible sur toutes les saisies qui saturent, et personne
 * ne pouvait le savoir : rien ne le signalait.
 *
 * On garde donc les MEILLEURS. Le tableau grossit jusqu'au double, puis se
 * compacte par `comparerPrefixes` — score décroissant, coût croissant, codes
 * croissants, l'ordre déjà utilisé partout ailleurs. Le compactage est amorti
 * (une fois par lot de 400) et l'ordre reste strictement déterministe.
 */
export const MAX_RESULTATS = 400;
/** Où le tableau se compacte : le double, pour n'amortir qu'un tri par lot. */
const MARGE_RESULTATS = 2;

/**
 * ══════════════ Filets de sécurité temporels — et rien de plus ══════════════
 *
 * Ces deux constantes bornaient la recherche ; elles ne la bornent plus. Ce
 * qui la borne est le budget de TRAVAIL, ci-dessous, qui ne dépend que de la
 * saisie. Une borne lue à l'horloge est une source d'entropie, et le §4.4 n'en
 * tolère aucune : sous charge, la même saisie explorait moins de fragments et
 * rendait un autre classement (mesuré : trois classements distincts en six
 * exécutions, deux visiteurs voyant deux listes).
 *
 * Il en reste un arrêt d'urgence, réglé assez haut pour ne jamais mordre dans
 * un cas normal : sept fois le pire cas déterministe mesuré (411 ms), ce qui
 * couvre le démarrage à froid du JIT cumulé à une machine trois fois chargée.
 * Il ne protège plus le budget d'une seconde — c'est le travail qui s'en
 * charge — mais l'imprévu : machine absurdement lente, opérateur pathologique.
 * Et quand il mord, `resoudre` renvoie `tronqueTemps` et l'interface le DIT :
 * un classement non reproductible ne doit jamais passer pour reproductible.
 *
 * `BUDGET_MS` (250 ms, CONTRACTS §5) reste le plafond par défaut d'un appel
 * direct à `chercherSix` — le contrat est tenu là où il a été écrit. Dans le
 * pipeline complet, `resoudre` lui substitue le filet.
 *
 * ★ **ET IL SE DÉBRANCHE, PAR UNE OPTION EXPLICITE** — `filetTemporel: false`.
 *
 * Le filet a beau être réglé haut, il reste la DERNIÈRE source d'entropie du
 * moteur : quand la machine est chargée, il mord avant le budget de travail et
 * le classement change. Mesuré sur ce dépôt : le test « déterminisme — deux
 * exécutions donnent le même classement » échoue environ une fois sur trois
 * sous charge, et il échouait déjà en v1.0.0 (deux échecs sur quatre en
 * rejouant sur le tag). Tant qu'il est branché, deux barèmes ne peuvent pas
 * être comparés — la base bouge sous la mesure.
 *
 * Débranché, il ne reste QUE des bornes déterministes (`BUDGET_TRAVAIL`,
 * `MAX_NODES`, `D_MAX`) : la recherche termine toujours, simplement elle
 * termine sur une borne qui ne dépend que de la saisie. C'est pour cela que le
 * débranchement est sûr, et c'est pour cela qu'il est une OPTION EXPLICITE et
 * jamais un contournement silencieux : un appelant qui ne demande rien garde le
 * filet, et un appelant qui le retire l'a écrit noir sur blanc.
 *
 * Deux usages, et deux seulement : le banc de mesure (`.planning/banc/`) et les
 * tests qui comparent deux classements. L'application, elle, garde son filet —
 * un navigateur peut être arbitrairement lent, et un onglet qui ne rend jamais
 * la main est pire qu'un classement écourté qui le dit.
 */
// ★ Les bornes de TEMPS sont sorties d'ici : elles sont les seules qu'on vienne
//   changer sans lire ce fichier, et elles vivent donc dans `src/config.js`, où
//   la condition posée par l'auteur pour les relever est écrite noir sur blanc.
//   Elles restent réexportées : c'est ici qu'on les cherche depuis le moteur.
export { BUDGET_MS_FILET, BUDGET_TOTAL_MS };

/**
 * Les fragments étant parcourus par priorité décroissante (§3.3), ce sont les
 * candidats les moins porteurs — n-grammes, unités surnuméraires — qui sautent
 * en premier quand le budget s'épuise. Les `FRAGMENTS_GARANTIS` premiers sont
 * cherchés quoi qu'il en coûte : en dessous, l'assemblage n'aurait plus de quoi
 * former trois 6.
 */
export const FRAGMENTS_GARANTIS = 12; // = MAX_LIBRES de assemblage.js

/**
 * ══════════ Borne PRIMAIRE, déterministe : le travail, pas le temps ══════════
 *
 * Une borne mesurée à l'horloge est une source d'entropie, et le §4.4 n'en
 * tolère aucune : sous charge, la même saisie explorait moins de fragments et
 * rendait un AUTRE classement (mesuré : trois classements distincts en six
 * exécutions). Le temps écoulé dépend de la machine ; le nombre d'applications
 * d'opérateurs ne dépend que de l'entrée.
 *
 * L'unité de travail est **une application d'opérateur pondérée par la taille
 * de l'état source** — pas le nœud, et pas l'application nue. Le nœud ne dit
 * rien (il en engendre de 1 à 88 selon son type) ; l'application nue coûte
 * vingt fois plus sur une chaîne de 400 caractères que sur un mot de quatre.
 * Mesuré sur 231 fragments : l'application nue s'étale sur ×30 par
 * milliseconde, l'application pondérée sur ×7. C'est ce facteur qui décide si
 * le filet temporel se déclenche ou non dans les cas normaux.
 *
 * `MAX_NODES` (contrat §5) reste en place : il borne la MÉMOIRE, quand le
 * travail borne le TEMPS. Les deux sont déterministes, aucun ne remplace l'autre.
 *
 * Étalonnage (mesures de ce dépôt, Node 24, corpus de 19 saisies) :
 *  · débit observé 2 137 à 4 868 unités/ms selon la forme de la saisie ;
 *  · pire temps de la phase de recherche à 1 000 000 : 411 ms ;
 *  · plafond par fragment à 420 000 : 197 ms au débit le plus lent ;
 *  · les filets sont réglés à ~5× et ~7× ces valeurs (1 000 ms et 3 000 ms),
 *    de sorte qu'une machine plusieurs fois plus lente — ou plusieurs fois
 *    plus chargée — rende encore exactement le même classement ;
 *  · aucune des 19 saisies du corpus ne déclenche de filet, ni au repos, ni
 *    sous une charge de douze processus sur huit cœurs.
 */
export const BUDGET_TRAVAIL = 420000;         // par fragment, régime normal
export const BUDGET_TRAVAIL_TOTAL = 1000000;  // phase de recherche entière

/**
 * Plafond par fragment une fois le budget global épuisé — le pendant
 * déterministe de l'ancien `BUDGET_FRAGMENT_MIN = 40 ms`.
 *
 * `FRAGMENTS_GARANTIS` fragments sont cherchés quoi qu'il en coûte, budget
 * global épuisé ou non : sans eux l'assemblage n'a plus de quoi former trois 6.
 * Sans plafond réduit, ce plancher est un trou dans le budget — mesuré :
 * douze mots de quarante caractères font 1 450 ms à eux seuls, la seconde
 * saute. C'est le pendant exact de ce que faisait l'ancien budget temporel en
 * rétrécissant la part de chaque fragment à mesure qu'il s'épuisait.
 * Le pire cas total est donc, par construction :
 *
 *     BUDGET_TRAVAIL_TOTAL + FRAGMENTS_GARANTIS × BUDGET_TRAVAIL_RESERVE
 */
export const BUDGET_TRAVAIL_RESERVE = 40000;

export const BORNE_NUM = 1000000; // CONTRACTS.md §2.3

const TYPES = new Set(['STR', 'TOKENS', 'NUMS', 'NUM']);

// ─────────────────────────────────────────────────────────── états

/**
 * @typedef {'STR'|'TOKENS'|'NUMS'|'NUM'} TypeEtat
 * @typedef {{type:TypeEtat, valeur:any, traces:Array<[number,number]>}} Etat
 */

/**
 * @returns {Etat}
 * `_k` est le champ de mémoïsation de `cleEtat`. Il est DÉCLARÉ ici, à `null`,
 * pour que tous les états partagent une seule forme cachée : c'est ce qui rend
 * la boucle chaude monomorphe.
 */
export function etat(type, valeur, traces = []) {
  return { type, valeur, traces, _k: null };
}

/**
 * Clé de canonicalisation : deux états de même clé sont observationnellement
 * égaux. C'est *elle* qui fait tout le travail — l'espace des chemins bruts
 * (~178 000 à d=6) s'effondre sur 10²–10³ états.
 * Mémoïsée sur l'objet état : la boucle chaude l'appelle des dizaines de
 * milliers de fois. La mémoïsation passe par une AFFECTATION ORDINAIRE sur un
 * champ déclaré dans la forme de l'état (`_k`), jamais par `Object.defineProperty` :
 * celui-ci fait basculer l'objet en mode dictionnaire, et le BFS crée des
 * centaines de milliers d'états.
 */
export function cleEtat(e) {
  const memo = e._k;
  if (memo !== undefined && memo !== null) return memo;
  const k = calculerCle(e);
  e._k = k;
  return k;
}

function calculerCle(e) {
  switch (e.type) {
    case 'STR': return 'STR|' + e.valeur;
    case 'NUM': return 'NUM|' + e.valeur;
    case 'TOKENS': return 'TOKENS|' + e.valeur.join('\u0000');
    case 'NUMS': return 'NUMS|' + e.valeur.join(',');
    default: return e.type + '|' + JSON.stringify(e.valeur);
  }
}

/** Rendu textuel d'une valeur d'état — sert à la déduplication N1 (« ce qui est montré »). */
export function rendreValeur(e) {
  switch (e.type) {
    case 'STR': return e.valeur;
    case 'NUM': return String(e.valeur);
    case 'TOKENS': return e.valeur.join(' ');
    case 'NUMS': return e.valeur.join(' ');
    default: return String(e.valeur);
  }
}

function valeurValide(type, v) {
  switch (type) {
    case 'STR':
      return typeof v === 'string' && v.length > 0;
    case 'TOKENS':
      return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.length > 0);
    case 'NUMS':
      return Array.isArray(v) && v.length > 0
        && v.every((x) => Number.isFinite(x) && Math.abs(x) <= BORNE_NUM);
    case 'NUM':
      return Number.isFinite(v) && Math.abs(v) <= BORNE_NUM;
    default:
      return false;
  }
}

/**
 * Applique un opérateur à un état. Retourne null si inapplicable.
 * Tolérant sur la forme du retour de `apply` : valeur brute, ou `{valeur, traces}`.
 * @returns {Etat|null}
 */
export function appliquerOp(op, e) {
  if (op.from !== e.type) return null;
  let brut;
  try {
    brut = op.apply(e.valeur, e.traces);
  } catch {
    // Le contrat interdit les exceptions (§2.2) ; on ne fait pas confiance pour autant.
    return null;
  }
  if (brut === null || brut === undefined) return null;

  let valeur = brut;
  let traces = e.traces;
  if (brut && typeof brut === 'object' && !Array.isArray(brut) && 'valeur' in brut) {
    valeur = brut.valeur;
    if (Array.isArray(brut.traces)) traces = brut.traces;
  }
  if (!valeurValide(op.to, valeur)) return null;

  // Affinage de la couverture pour les opérateurs partant d'une chaîne.
  if (e.type === 'STR' && typeof op.couverture === 'function' && traces === e.traces) {
    try {
      const c = op.couverture(e.valeur);
      if (Array.isArray(c) && c.length) traces = decalerTraces(c, e.traces);
    } catch { /* couverture optionnelle : on garde les traces héritées */ }
  }
  return { type: op.to, valeur, traces, _k: null };
}

/** Traduit des intervalles relatifs au fragment en intervalles de la saisie d'origine. */
function decalerTraces(relatifs, heritees) {
  const base = heritees.length ? heritees[0][0] : 0;
  const out = [];
  for (const iv of relatifs) {
    if (!Array.isArray(iv) || iv.length < 2) continue;
    out.push([base + iv[0], base + iv[1]]);
  }
  return out.length ? out : heritees;
}

// ─────────────────────────────────────────────────────────── catalogue

/**
 * Accepte un tableau, `{operateurs}`, `{ops}` ou une Map ; renvoie toujours un
 * tableau d'opérateurs dans l'ordre déclaré (= ordre des codes croissants, §4.1-3).
 */
export function normaliserCatalogue(catalogue) {
  if (!catalogue) throw new Error('recherche: catalogue absent');
  let liste = null;
  if (Array.isArray(catalogue)) liste = catalogue;
  else if (Array.isArray(catalogue.operateurs)) liste = catalogue.operateurs;
  else if (Array.isArray(catalogue.ops)) liste = catalogue.ops;
  else if (typeof catalogue.values === 'function') liste = [...catalogue.values()];
  if (!liste) throw new Error('recherche: forme de catalogue non reconnue');
  return liste;
}

// Recopie de la grammaire du moteur (CONTRACTS §4.1) : voir `url.js`, même
// raison — `src/recherche` ne connaît le catalogue que par injection.
const RE_CODE = /^[ftnmcpj][0-9a-z]+[A-Z]?$/;
const RANG_FAMILLE = { f: 0, t: 1, n: 2, m: 3, c: 4, p: 5, j: 6 };

/**
 * Ordre d'un code pour la **canonicalisation N2** — ranger une suite
 * d'opérateurs commutants pour que `fl+fac` et `fac+fl` s'écrivent pareil.
 *
 * ★ (rang de famille, chaîne comparée en unités de code). Le second membre
 * était jadis un index base36, parce qu'un code était un index : il fallait
 * bien que `fc` précède `f10`. Depuis les codes parlants, le corps d'un code
 * n'est plus un nombre — `m14F` ne se lit même pas en base36, et `mrd` encore
 * moins —, donc la seule comparaison qui garde un sens est celle des
 * caractères, que §4.4 règle 4 impose déjà partout ailleurs.
 *
 * ★ Le rang de famille reste devant la chaîne, et il n'est pas décoratif :
 * l'ordre des familles est `f t n m c p j`, qui n'est PAS l'ordre
 * alphabétique. Un bloc commutant qui mêlerait un filtre et un mappeur se
 * rangerait à l'envers sans lui.
 *
 * ★ **Cet ordre est celui de l'URL, pas celui du catalogue.** Le catalogue,
 * lui, suit son registre (`moteur/catalogue.js › ORDRE_CANONIQUE`), qui porte
 * l'ordre d'allocation et l'intention qui va avec. Les deux ne coïncident plus
 * depuis les codes parlants, et c'est assumé : l'un doit être rejouable par qui
 * lit un lien sans catalogue sous la main, l'autre doit rester stable quand un
 * code neuf arrive.
 */
export function ordreCode(code) {
  return [RANG_FAMILLE[code[0]] ?? 99, code];
}

/** Comparateur N2 sur deux codes — l'expression réutilisable de `ordreCode`. */
export function codeAvant(a, b) {
  const [fa, ia] = ordreCode(a);
  const [fb, ib] = ordreCode(b);
  if (fa !== fb) return fa - fb;
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

/**
 * Vérifie les garanties exigées au chargement (CONTRACTS.md §2.2) :
 * échec bruyant, pas de dégradation silencieuse.
 * @returns {string[]} liste des violations (vide = catalogue conforme)
 */
export function validerCatalogue(catalogue) {
  const liste = normaliserCatalogue(catalogue);
  const pbs = [];
  const codes = new Set();
  const ids = new Set();
  let precedent = '';
  for (const op of liste) {
    const ou = op && (op.id || op.code) ? `${op.id || ''}/${op.code || ''}` : '(anonyme)';
    if (!op || typeof op.apply !== 'function') { pbs.push(`${ou}: apply manquant`); continue; }
    if (!TYPES.has(op.from) || !TYPES.has(op.to)) pbs.push(`${ou}: typage from/to invalide`);
    if (typeof op.code !== 'string' || !RE_CODE.test(op.code)) pbs.push(`${ou}: code non conforme §4.1`);
    else {
      if (codes.has(op.code)) pbs.push(`${ou}: code dupliqué`);
      codes.add(op.code);
      // ⚠ Ce qui se vérifie ici, c'est le GROUPEMENT des familles, plus l'ordre
      // des codes à l'intérieur. Depuis les codes parlants, l'ordre du
      // catalogue est celui de son registre (§4.1) et ce registre vit dans le
      // moteur ; `src/recherche` ne le connaît pas, puisqu'on lui injecte un
      // catalogue quelconque. Ce qui reste vérifiable sans le registre, c'est
      // que les familles se suivent dans l'ordre des préfixes — ce dont
      // `operateursDepuis` et la lecture d'un lien dépendent tous les deux.
      if (precedent && RANG_FAMILLE[op.code[0]] < RANG_FAMILLE[precedent[0]]) {
        pbs.push(`${ou}: familles non groupées dans l'ordre f t n m c p j (après ${precedent})`);
      }
      precedent = op.code;
    }
    if (typeof op.id !== 'string' || !op.id) pbs.push(`${ou}: id manquant`);
    else { if (ids.has(op.id)) pbs.push(`${ou}: id dupliqué`); ids.add(op.id); }
    if (typeof op.famille !== 'string') pbs.push(`${ou}: famille manquante`);
    if (typeof op.notoriete !== 'number' || op.notoriete < 0 || op.notoriete > 1) pbs.push(`${ou}: notoriete hors [0,1]`);
    if (typeof op.adHoc !== 'number' || op.adHoc < 0 || op.adHoc > 1) pbs.push(`${ou}: adHoc hors [0,1]`);
    if (typeof op.cout !== 'number' || op.cout < 0) pbs.push(`${ou}: cout manquant`);
  }
  return pbs;
}

/**
 * ★ **LES VINGT-CINQ DÉCALAGES SONT EXPLORÉS — l'attente est levée.**
 *
 * Ils ont vécu quelques heures hors de l'exploration, le temps que la jauge
 * existe : « tous explorables », disait l'auteur, mais il avait lui-même posé la
 * condition — « on peut assouplir le budget temps en insérant une jauge de
 * progression pour la phase de recherche ». Elle existe (`src/app/travailleur.js`,
 * `src/recherche/tranches.js`), le budget est à 5 000 ms, et la recherche ne
 * bloque plus le fil principal : la condition est remplie, la liste se vide.
 *
 * Ce qu'elle retenait, et qui est maintenant assumé :
 *
 *  · **le temps.** Vingt-quatre filtres de plus, ce sont vingt-quatre bases de
 *    plus à l'étage 1 de `vecteursDeSix` : 230 ms → 733 ms à JIT chaud sur la
 *    saisie la plus lourde. C'est précisément ce que la jauge rend supportable ;
 *  · **le magasinage de décalage.** « Avance de quinze rangs » ne se justifie par
 *    rien d'autre que le résultat qu'on en attend, et six têtes de liste sur
 *    dix-neuf s'y adossent une fois les vingt-trois lâchés. C'est ce que leur
 *    `adHoc` de 0,45 facture — et si l'auteur juge la peine trop douce, c'est ce
 *    réglage-là qu'il faut monter, pas l'exploration qu'il faut refermer.
 */

/** Opérateurs explorables : ni dépréciés, ni jokers, ni en attente de la jauge. */
export function operateursExplorables(catalogue) {
  return normaliserCatalogue(catalogue).filter((op) => !op.deprecated && !op.isJoker);
}

/**
 * ★ LES CINQ OPÉRATEURS ÉCRITS AUTOUR DU CHIFFRE 6 — et pourquoi ils sortent
 *   de la recherche dès que la cible change.
 *
 * Le catalogue est, à quatre exceptions près, indifférent au nombre visé : A1Z26
 * convertit des lettres, le quatorze segments compte des segments, la somme
 * additionne. Quatre opérateurs, eux, DÉCIDENT en regardant le chiffre 6 :
 *
 *  · `m36` — « trois 6 d'affilée », qui repère un 666 déjà écrit et TRONQUE le
 *    vecteur dessus. C'est lui qui émet la primitive `horns` : le laisser courir
 *    sur une cible visant 111 ferait pousser des cornes de diable au-dessus de
 *    trois 6 qui ne sont pas le verdict ;
 *  · `mpf`, `m1s2`, `mad` — les trois ficelles, dont chaque garde-fou
 *    (`portePleinement`, `paritePorteuse`, la fenêtre de somme) est écrit en
 *    « 6 » et en « 666 ». Elles refusent d'elles-mêmes de s'appliquer quand le
 *    résultat n'écrit pas 666 d'affilée ; les explorer sur une autre cible
 *    revient donc à dépenser du budget de recherche pour des `null` ;
 *  · `mrd` — le redécoupage tricheur, dont la programmation dynamique MAXIMISE
 *    le nombre de paquets valant 6 et qui refuse de s'appliquer s'il n'en gagne
 *    pas. Tout, chez lui, est écrit en « 6 » : l'objectif, le départage, le
 *    refus. Le lâcher sur une cible visant 111 lui ferait fabriquer des 6 que
 *    personne ne cherche, et payer une triche pour rien.
 *
 * ★ **Et les trois autres transformations du 27 août n'y sont PAS** — c'est
 * délibéré, et c'est ce qui les distingue de `mrd`. Le tri croissant (`mtri`)
 * range, le décompte des chiffres (`mcc`) compte, et ni l'un ni l'autre ne
 * regarde ce qu'on cherche : ils rendraient le même résultat en visant 007. Ils
 * servent même MIEUX les autres cibles que le 666 — trier rapproche les 1 d'un
 * `111` aussi bien que les 6. Quant aux trios de 9 (`mr39`), ils font ce que
 * `mr9` fait déjà, en trio plutôt qu'un par un : ils produisent des 6 sans
 * jamais rien affirmer, et ils n'émettent aucune corne (c'est
 * `couronnerLesTriptyques` qui couronne, et lui suit la cible).
 *
 * On les RETIRE plutôt que de les généraliser, et c'est un choix de portée, pas
 * de paresse : leur généraliser demanderait de faire voyager la cible jusque
 * dans `apply()`, donc d'étendre la signature d'opérateur de CONTRACTS §2.2 —
 * un contrat gelé, dont dépend le registre de codes clos §4.1. Ce chantier-là
 * est noté à part (`.planning/A-VENIR-cibles.md`).
 *
 * ★ Conséquence assumée, et mesurable : viser autre chose que 666 donne accès à
 * 95 opérateurs au lieu de 100. Aucun de ces cinq n'aurait rendu autre chose
 * que `null` de toute façon, sauf `m36` — dont la seule contribution possible
 * eût été de mentir.
 */
export const OPERATEURS_LIES_A_666 = Object.freeze([
  'm.troisSixDAffilee', 'm.plusFrequent', 'm.unRangSurDeux', 'm.additionSelective',
  'm.redecoupageChoisi',
]);

/**
 * Les opérateurs explorables POUR UNE CIBLE. Sur la cible par défaut, c'est
 * `operateursExplorables` mot pour mot — même tableau, même ordre.
 *
 * @param {Object} catalogue
 * @param {{defaut:boolean}} cible
 */
export function operateursPourCible(catalogue, cible) {
  const tous = operateursExplorables(catalogue);
  if (!cible || cible.defaut !== false) return tous;
  return tous.filter((op) => !OPERATEURS_LIES_A_666.includes(op.id));
}

// ─────────────────────────────────────────────────────────── chemins

/**
 * @typedef {{ops:Object[], etats:Etat[], valeur:number, cout:number}} Chemin
 */

/**
 * Pendant la recherche, un chemin est une LISTE CHAÎNÉE (parent + arête), pas
 * un couple de tableaux. Le faisceau conserve 12 préfixes par état canonique et
 * chaque arête les prolonge tous : matérialiser des tableaux à chaque extension
 * coûtait, mesuré, la moitié du temps de recherche (deux `concat` par arête,
 * ~300 000 allocations sur une URL). Les tableaux ne sont construits que pour
 * les chemins RETENUS (≤ 400 par fragment).
 *
 * `_sp` (score partiel) et `_cc` (clé de codes) sont DÉCLARÉS dans la forme :
 * le score est calculé à la création — il est de toute façon nécessaire pour
 * décider de l'entrée au faisceau — et la clé de codes n'est remplie qu'au
 * premier départage d'ex æquo.
 * @typedef {{parent:Object|null, op:Object|null, etat:Etat, prof:number, cout:number, acc:Object, _sp:number, _cc:string|null}} Prefixe
 */

/** @returns {Prefixe} */
export function cheminVide(depart) {
  cleEtat(depart);
  const acc = accumulateurInitial(depart);
  return {
    parent: null, op: null, etat: depart, prof: 0, cout: 0, acc, _sp: scoreDeAcc(acc), _cc: null,
  };
}

/**
 * Étend un préfixe, mais SEULEMENT si le résultat peut encore entrer dans un
 * faisceau dont le pire élément vaut `seuil`.
 *
 * L'ordre du faisceau commence par le score décroissant (`comparerPrefixes`) :
 * un préfixe dont le score est STRICTEMENT inférieur au pire du faisceau plein
 * est donc coupé à coup sûr. Le tester avant d'allouer le nœud est une coupe
 * EXACTE — elle ne retire aucun chemin qui aurait survécu — et c'est elle qui
 * évite l'essentiel des allocations et des tris : sur une phrase de neuf mots,
 * 4 préfixes candidats sur 5 sont rejetés à ce point.
 * @returns {Prefixe|null}
 */
function etendreSi(prefixe, op, cible, seuil) {
  const acc = accumuler(prefixe.acc, op, cible);
  const sp = scoreDeAcc(acc);
  if (sp < seuil) return null;
  return {
    parent: prefixe,
    op,
    etat: cible,
    prof: prefixe.prof + 1,
    cout: prefixe.cout + (op.cout || 0),
    acc,
    _sp: sp,
    _cc: null,
  };
}

function etendre(prefixe, op, cible) {
  return etendreSi(prefixe, op, cible, -1);
}

/** Le chemin repasse-t-il par un état déjà traversé ? (chemins de longueur ≤ 6) */
function traverse(prefixe, cle) {
  for (let n = prefixe; n; n = n.parent) if (cleEtat(n.etat) === cle) return true;
  return false;
}

/** Déplie la liste chaînée en `{ops, etats, valeur, cout}` — le Chemin public. */
export function materialiser(prefixe) {
  const ops = new Array(prefixe.prof);
  const etats = new Array(prefixe.prof + 1);
  let n = prefixe;
  for (let i = prefixe.prof; i > 0; i--) {
    ops[i - 1] = n.op;
    etats[i] = n.etat;
    n = n.parent;
  }
  etats[0] = n.etat;
  const fin = prefixe.etat;
  return {
    ops,
    etats,
    valeur: fin.type === 'NUM' ? fin.valeur : null,
    cout: prefixe.cout,
    acc: prefixe.acc,
    _sp: prefixe._sp,   // déjà calculé : `scorePartiel` n'aura rien à refaire
    _cc: prefixe._cc,
  };
}

/** Suite des codes d'un préfixe, sans le matérialiser. */
function codesPrefixe(prefixe) {
  const out = new Array(prefixe.prof);
  let n = prefixe;
  for (let i = prefixe.prof; i > 0; i--) { out[i - 1] = n.op.code; n = n.parent; }
  return out;
}

export function codesDe(chemin) {
  return chemin.ops ? chemin.ops.map((o) => o.code) : codesPrefixe(chemin);
}

/**
 * Clé de départage des ex æquo : la suite des codes, aplatie en une chaîne
 * terminée par `+`. Le séparateur `+` (0x2B) trie AVANT tous les caractères
 * autorisés dans un code (`[0-9a-z]`, ≥ 0x30) : comparer les deux chaînes rend
 * donc exactement le même verdict que `comparerCodes` élément par élément, mais
 * en une seule comparaison de chaîne au lieu d'une allocation de tableau.
 * Calculée paresseusement : seuls les ex æquo en ont besoin.
 */
function cleCodes(x) {
  const memo = x._cc;
  if (memo !== undefined && memo !== null) return memo;
  const codes = codesDe(x);
  const c = codes.length ? codes.join('+') + '+' : '';
  x._cc = c;
  return c;
}

/** Ordre déterministe des préfixes dans le faisceau : score DESC, coût ASC, codes ASC. */
function comparerPrefixes(a, b) {
  const sa = a._sp !== undefined && a._sp !== null ? a._sp : scorePartiel(a);
  const sb = b._sp !== undefined && b._sp !== null ? b._sp : scorePartiel(b);
  if (sa !== sb) return sb - sa;
  const na = a.ops ? a.ops.length : a.prof;
  const nb = b.ops ? b.ops.length : b.prof;
  if (na !== nb) return na - nb;
  const ca = cleCodes(a);
  const cb = cleCodes(b);
  return ca < cb ? -1 : ca > cb ? 1 : 0;
}

// ────────────────────────────────────────────────────── canonicalisation N2/N3

/**
 * N2 — tri des suites maximales d'opérateurs commutants par code croissant.
 * `lower ∘ dropVowels` et `dropVowels ∘ lower` deviennent une seule clé.
 *
 * ⚠ N2 ne s'applique plus DANS la clé de `canonicaliser` (voir l'amendement
 * ci-dessous) : il s'applique sur le CHEMIN lui-même, dans
 * `assemblage.js › normaliserChemins`, comme CONTRACTS §5 le demande. Deux
 * chemins qui ne diffèrent que par l'ordre d'opérateurs commutants montrent de
 * toute façon la même chose, donc portent déjà la même trace. Cette fonction
 * reste l'expression réutilisable de la règle.
 */
export function codesCanoniques(chemin) {
  const out = [];
  let bloc = [];
  for (const op of chemin.ops) {
    if (op.commute) bloc.push(op.code);
    else {
      if (bloc.length) { bloc.sort(codeAvant); out.push(...bloc); bloc = []; }
      out.push(op.code);
    }
  }
  if (bloc.length) { bloc.sort(codeAvant); out.push(...bloc); }
  return out;
}

/** N1 — clé de doublon visuel : la suite des valeurs réellement rendues. */
export function cleTrace(chemin) {
  const vues = [];
  for (let i = 0; i < chemin.etats.length; i++) {
    if (i > 0 && (chemin.ops[i - 1].cout || 0) === 0) continue; // étape invisible
    vues.push(rendreValeur(chemin.etats[i]));
  }
  return vues.join('\u001f');
}

/**
 * N1 + N2 : déduplication sur ce qui est montré, filtres commutatifs normalisés.
 *
 * > *Amendement — la clé N1 est la trace SEULE, plus la suite des codes.*
 * >
 * > La clé valait `cleTrace + codes canoniques`. Or ajouter les codes RAFFINE
 * > la clé : deux chemins qui montrent exactement la même chose survivaient
 * > tous les deux dès que leurs codes différaient d'une lettre — c'est-à-dire
 * > que N1, dont le contrat est la « déduplication sur ce qui est MONTRÉ »
 * > (CONTRACTS §5), ne dédupliquait pas.
 * >
 * > Le défaut est resté invisible tant qu'aucun mappeur ne rendait un vecteur
 * > CONSTANT. L'afficheur quatorze segments en rend un sur `hope` — `H`, `O`,
 * > `P` et `E` allument six segments chacun —, et alors « en moyenne », « au
 * > plus grand » et « au plus petit » donnent le même 6 par le même dessin :
 * > trois chemins, une seule démonstration à l'écran. Ils occupaient trois des
 * > huit places que l'assemblage garde par fragment (`K_PAR_FRAGMENT`) et en
 * > chassaient les trois approches pythagoriciennes.
 * >
 * > Mesuré sur quatorze saisies : la liste de `hope-hope-hope.fr` retrouve ses
 * > douze approches (dont les deux pythagoriciennes, plus « A1Z26 par
 * > multiplication » qui n'y figurait pas), et dix autres saisies passent de
 * > quatre ou six lignes à huit ou douze. Aucune méthode ne disparaît. Le
 * > représentant conservé reste choisi par `comparerPrefixes` — score
 * > décroissant, coût croissant, codes croissants —, donc le plus notoire des
 * > jumeaux gagne : entre sept et quatorze segments montrant les mêmes
 * > nombres, c'est le sept segments qui reste.
 * >
 * > Effet de bord mesuré, à connaître : `comparerPrefixes` compare des scores
 * > LOCAUX de préfixe, pas le score de l'approche assemblée. Sur
 * > `numherololgeek`, le représentant retenu pour un fragment change et
 * > l'approche de tête passe de 4 764 à 4 552 points. C'est le même écart
 * > local/global qui existait déjà ; il devient seulement visible ailleurs.
 */
export function canonicaliser(chemins) {
  const vus = new Map();
  for (const c of chemins) {
    // ★ La trace SEULE (voir ci-dessus) — ce que le spectateur voit défiler.
    const cle = cleTrace(c);
    const ancien = vus.get(cle);
    if (!ancien || comparerPrefixes(c, ancien) < 0) vus.set(cle, c);
  }
  return [...vus.values()];
}

// ─────────────────────────────────────────────────────────── recherche

/**
 * @typedef {Object} ContexteRecherche
 * @property {Object} catalogue
 * @property {Map<number,{dist:number, ops:Object[]}>} bassin
 * @property {Map<string,Chemin[]>} [cache]
 * @property {number} [dMax] @property {number} [pBeam]
 * @property {number} [maxNodes] @property {number} [budgetMs]
 * @property {() => number} [maintenant]
 * @property {boolean} [filetTemporel] — `false` débranche le filet d'horloge
 *   (voir l'en-tête « Filets de sécurité temporels »). Explicite, jamais deviné.
 */

/**
 * Fermeture exhaustive depuis un fragment jusqu'à tous les chemins menant à 6.
 * @param {string} fragment
 * @param {ContexteRecherche} ctx
 * @returns {Chemin[]}
 */
export function chercherSix(fragment, ctx) {
  const cache = ctx.cache || (ctx.cache = new Map());
  // La clé porte les PLAFONDS autant que le texte : le même fragment cherché
  // sous deux plafonds différents n'est pas la même recherche, et servir l'un
  // pour l'autre rendrait le classement dépendant de l'ordre des saisies
  // précédentes — exactement l'entropie que le §4.4 interdit.
  // ★ Les BUTS entrent dans la clé au même titre que les plafonds. Le même
  //   fragment cherché pour 6 et cherché pour 0 n'est pas la même recherche, et
  //   servir l'un pour l'autre rendrait la liste de 111 dépendante du fait
  //   qu'on ait consulté 666 avant — exactement l'entropie que §4.4 interdit,
  //   et exactement le piège dans lequel la mémoïsation était déjà tombée une
  //   fois (voir la refacturation du coût, plus bas).
  const cle = normaliserFragment(fragment)
    + '\u0000' + butsDe(ctx).map((b) => b.but).join('.')
    + '\u0000' + (ctx.maxTravail ?? BUDGET_TRAVAIL)
    + '\u0000' + (ctx.maxNodes ?? MAX_NODES);
  const memo = cache.get(cle);
  // ── Un fragment déjà connu coûte zéro EN TEMPS, mais il est REFACTURÉ au
  // budget de travail, au tarif exact de la recherche qu'il économise.
  //
  // Sans cette refacturation, le nombre de fragments explorés dépendait de ce
  // que le moteur avait cherché AVANT — donc de ce que le visiteur avait tapé
  // avant. Mesuré sur `https://fr.wikipedia.org/wiki/Nombre_de_la_bête` : le
  // premier appel explorait 15 fragments et rendait `tronque`, le second en
  // explorait 17 sans troncature, et les rangs 5 à 12 changeaient — en silence.
  // Le cache était donc une source d'entropie au même titre que l'horloge
  // (§4.4 règle 4) : l'ordre des saisies passées n'a pas à décider du classement.
  //
  // Le tarif mémoïsé est exactement celui qu'aurait coûté la recherche : même
  // fragment, mêmes plafonds (ils sont dans la clé), même parcours déterministe.
  // Le cache reste intégralement gagnant en TEMPS, et devient neutre sur le
  // RÉSULTAT — ce qu'on attend d'un cache.
  if (memo !== undefined) {
    comptabiliser(ctx, memo[COUT] || COUT_NUL);
    return memo;
  }

  const resultats = rechercheBrute(fragment, ctx);
  cache.set(cle, resultats);
  return resultats;
}

/**
 * Coût d'une recherche de fragment, porté par le tableau de résultats lui-même
 * via un symbole : invisible de `JSON`, de `for…in` et de `Object.keys`, donc
 * sans effet sur `assemblage`, `score`, ni sur ce qui part en `postMessage`.
 */
const COUT = Symbol('coutRecherche');
const COUT_NUL = Object.freeze({ travail: 0, noeuds: 0, tronque: false, tronqueTemps: false });

/** Reporte le coût d'une recherche — vive ou mémoïsée — sur le contexte appelant. */
function comptabiliser(ctx, cout) {
  ctx.travail = (ctx.travail || 0) + cout.travail;
  ctx.noeuds = (ctx.noeuds || 0) + cout.noeuds;
  if (cout.tronque) ctx.tronque = true;
  if (cout.tronqueTemps) ctx.tronqueTemps = true;
}

/** Mémoïsation : deux fragments qui ne diffèrent que par la casse partagent leur recherche. */
export function normaliserFragment(fragment) {
  return String(fragment).normalize('NFC');
}

const AUCUN = Object.freeze([]);

/**
 * Indexe les opérateurs par type d'entrée, en conservant l'ordre du catalogue
 * (= codes croissants, §4.4-3). Mémoïsé sur le contexte : le même jeu sert aux
 * 64 fragments d'une saisie.
 */
function grouperParType(ctx, ops) {
  if (ctx._parTypeOps === ops && ctx._parType) return ctx._parType;
  const par = { STR: [], TOKENS: [], NUMS: [], NUM: [] };
  const buts = { STR: [], TOKENS: [], NUMS: [], NUM: [] };
  for (const op of ops) {
    if (!par[op.from]) continue;
    par[op.from].push(op);
    if (op.to === 'NUM') buts[op.from].push(op);
  }
  for (const t of TYPES) {
    if (!par[t].length) par[t] = AUCUN;
    if (!buts[t].length) buts[t] = AUCUN;
  }
  par.buts = buts;
  ctx._parTypeOps = ops;
  ctx._parType = par;
  return par;
}

/**
 * ★ LES BUTS D'UNE RECHERCHE — un par chiffre distinct de la cible.
 *
 * Le moteur cherchait « les chemins qui mènent à 6 » ; il cherche désormais
 * « les chemins qui mènent à l'un des chiffres de la cible ». Pour `666`,
 * `111` ou `000`, c'est UN but et le parcours est identique au précédent, à
 * l'instruction près. Pour `13` ou `007`, ce sont deux buts, donc deux bassins
 * consultés à chaque `NUM` produit — et deux fois plus de chemins rendus.
 *
 * ★ **L'ordre est CROISSANT et il compte** (§4.4 règle 3) : les résultats sont
 * empilés dans cet ordre, et le tri qui suit n'est pas total sur les seules
 * clés qu'il compare. Trier les buts, c'est refuser à l'ordre d'insertion d'une
 * `Map` le droit de décider d'un classement.
 *
 * ★ **Compatibilité descendante assumée** : un contexte qui ne porte qu'un
 * `bassin` (la forme d'avant, celle des tests et du banc) vaut « un seul but,
 * 6 ». Rien n'a besoin d'être réécrit pour continuer de viser 666.
 *
 * @returns {Array<{but:number, table:Map}>}
 */
function butsDe(ctx) {
  if (Array.isArray(ctx.bassins) && ctx.bassins.length) return ctx.bassins;
  return ctx.bassin ? [{ but: 6, table: ctx.bassin }] : [];
}

function rechercheBrute(fragment, ctx) {
  const ops = ctx.operateurs || (ctx.operateurs = operateursExplorables(ctx.catalogue));
  const parTypeSource = grouperParType(ctx, ops);
  const buts = butsDe(ctx);
  const dMax = ctx.dMax ?? D_MAX;
  const pBeam = ctx.pBeam ?? P_BEAM;
  const maxNodes = ctx.maxNodes ?? MAX_NODES;
  const maxTravail = ctx.maxTravail ?? BUDGET_TRAVAIL;
  const budgetMs = ctx.budgetMs ?? BUDGET_MS;
  // ★ Le filet se débranche, et alors l'horloge n'est même pas LUE : pas de
  // `maintenant()`, pas de `t0`, pas de comparaison. Un débranchement qui
  // laisserait l'appel en place et se contenterait d'ignorer son résultat
  // laisserait aussi la porte ouverte à ce qu'on l'y remette par distraction.
  const filet = ctx.filetTemporel !== false;
  const maintenant = filet ? (ctx.maintenant || (() => performance.now())) : null;

  const depart = etat('STR', normaliserFragment(fragment), ctx.traces || [[0, fragment.length]]);
  const etats = new Map();
  etats.set(cleEtat(depart), { etat: depart, chemins: [cheminVide(depart)] });
  let frontiere = [cleEtat(depart)];
  const resultats = [];
  const t0 = filet ? maintenant() : 0;
  let noeuds = 1;
  let travail = 0;      // applications pondérées — borne primaire, déterministe
  let tronque = false;
  let tronqueTemps = false; // ★ le filet de sécurité s'est déclenché : c'est un DÉFAUT

  for (let d = 0; d < dMax; d++) {
    if (!frontiere.length) break;
    if (noeuds >= maxNodes || travail >= maxTravail) { tronque = true; break; }
    if (filet && maintenant() - t0 > budgetMs) { tronque = true; tronqueTemps = true; break; }
    const suivante = [];
    // ── Coupe du dernier niveau. Les états créés à la dernière extension ne
    // seront jamais étendus : seuls comptent ceux qui sont DÉJÀ un but, c'est-à-
    // dire un `NUM` (le bassin fournit ensuite les deux niveaux gratuits, §2.4).
    // Un `STR`, un `TOKENS` ou un `NUMS` produit ici est du travail pur perte —
    // aucun résultat n'en sort, personne ne le relit. On n'applique donc que les
    // opérateurs `→ NUM`. La coupe est EXACTE : à sortie identique, elle divise
    // par trois le nombre d'applications d'opérateurs du niveau le plus large.
    const dernierNiveau = d === dMax - 1;
    for (const k of frontiere) {
      // Les budgets sont contrôlés à CHAQUE état étendu, pas seulement en tête
      // de niveau : une seule couche de profondeur peut coûter plus que le
      // budget entier sur une saisie longue, et le garde-fou serait sans effet.
      // Le travail passe EN PREMIER : c'est lui qui doit trancher dans les cas
      // normaux, l'horloge ne devant jamais avoir l'occasion de le faire.
      if (travail >= maxTravail) { tronque = true; break; }
      if (filet && maintenant() - t0 > budgetMs) { tronque = true; tronqueTemps = true; break; }
      const src = etats.get(k);
      const cleSrc = cleEtat(src.etat);
      const cheminsSrc = src.chemins;
      // Opérateurs pré-groupés par type d'entrée : sans cela, chaque état
      // rebalaye les 88 opérateurs pour n'en retenir qu'un tiers.
      const applicables = dernierNiveau
        ? parTypeSource.buts[src.etat.type] : parTypeSource[src.etat.type];
      // Poids d'une application depuis cet état : la taille de l'état source.
      // `cleSrc` est déjà calculée et mémoïsée — sa longueur mesure exactement
      // le contenu que chaque opérateur va devoir parcourir. Mesuré sur 231
      // fragments : l'unité brute (une application = 1) s'étale sur ×30 par
      // milliseconde, l'unité pondérée sur ×7. C'est cette différence qui rend
      // le filet temporel réellement inutile dans les cas normaux.
      const poids = 1 + cleSrc.length;
      for (const op of applicables) { // ordre du catalogue = codes croissants (§4.4-3)
        travail += poids;
        const cible = appliquerOp(op, src.etat);
        if (cible === null) continue;
        const kc = cleEtat(cible);
        if (kc === cleSrc) continue; // N3 — opération neutre, invisible à l'écran

        // But, élargi par le bassin d'attraction (test O(1), §2.4). Il y a
        // autant de tables que la cible a de chiffres distincts ; sur `666`,
        // il y en a une, et `atteints` vaut soit la liste vide soit une seule
        // entrée — c'est-à-dire exactement l'ancien `b`.
        const atteints = cible.type === 'NUM' ? entreesDeBassin(buts, cible.valeur) : AUCUN;
        const b = atteints.length ? atteints[0] : undefined;

        // Seuil d'entrée au faisceau : le score du pire préfixe déjà retenu,
        // quand le faisceau est plein. Coupe exacte (cf. `etendreSi`).
        const existant = etats.get(kc);
        const seuil = existant && existant.chemins.length >= pBeam
          ? existant.chemins[existant.chemins.length - 1]._sp : -1;

        let nouveaux = null;
        for (const p of cheminsSrc) {
          // N3 bis — aucun chemin ne repasse par un état déjà traversé. Sans
          // cette coupe, un opérateur involutif (`complément à 9` appliqué deux
          // fois) engendre des chemins gonflés qui n'ajoutent rien au spectacle.
          if (traverse(p, kc)) continue;
          // Un état-but doit être étendu même s'il n'entre pas au faisceau :
          // c'est un RÉSULTAT, pas une étape.
          const noeud = etendreSi(p, op, cible, b ? -1 : seuil);
          if (noeud === null) continue;
          for (const e of atteints) {
            const complet = prolongerParBassin(noeud, e);
            if (!complet) continue;
            resultats.push(complet);
            // ★ On ne refuse plus le nouveau venu : on retire le plus faible.
            //   Voir `MAX_RESULTATS` — refuser à l'arrivée revenait à classer
            //   les opérateurs par l'ordre de leur code.
            if (resultats.length >= MAX_RESULTATS * MARGE_RESULTATS) {
              resultats.sort(comparerPrefixes);
              resultats.length = MAX_RESULTATS;
            }
          }
          if (noeud._sp < seuil) continue;
          if (nouveaux === null) nouveaux = [];
          nouveaux.push(noeud);
        }
        if (nouveaux === null) continue;

        if (existant) {
          const fusion = existant.chemins.concat(nouveaux);
          fusion.sort(comparerPrefixes);
          existant.chemins = fusion.length > pBeam ? fusion.slice(0, pBeam) : fusion;
        } else {
          if (nouveaux.length > 1) nouveaux.sort(comparerPrefixes);
          etats.set(kc, {
            etat: cible,
            chemins: nouveaux.length > pBeam ? nouveaux.slice(0, pBeam) : nouveaux,
          });
          noeuds++;
          suivante.push(kc);
          if (noeuds >= maxNodes) { tronque = true; break; }
        }
      }
      if (tronque) break;
    }
    frontiere = suivante;
  }

  // Comptabilité rendue à l'appelant par le contexte : c'est elle qui permet à
  // `index.js` de répartir un budget de travail GLOBAL entre les fragments sans
  // jamais regarder l'horloge. Le coût reste attaché au résultat, pour que
  // `chercherSix` le refacture à l'identique quand il ressert la mémoïsation :
  // le budget global doit être dépensé de la même façon sur un moteur neuf et
  // sur un moteur qui a déjà servi, sans quoi le classement dépendrait des
  // saisies précédentes.
  const cout = { travail, noeuds, tronque, tronqueTemps };
  comptabiliser(ctx, cout);

  // Dernier compactage : le tableau peut porter jusqu'au double de la borne.
  if (resultats.length > MAX_RESULTATS) {
    resultats.sort(comparerPrefixes);
    resultats.length = MAX_RESULTATS;
  }
  const canoniques = canonicaliser(resultats);
  canoniques.sort(comparerPrefixes);
  if (tronque) {
    for (const c of canoniques) {
      c.tronque = true;
      if (tronqueTemps) c.tronqueTemps = true;
    }
  }
  canoniques[COUT] = cout;
  return canoniques;
}

/**
 * Les entrées de bassin qui reçoivent `valeur` — une par chiffre de la cible
 * qu'elle sait atteindre. Sur une cible homogène, zéro ou une.
 *
 * @param {Array<{but:number, table:Map}>} buts
 * @returns {Array<{but:number, dist:number, ops:Object[]}>}
 */
function entreesDeBassin(buts, valeur) {
  let out = null;
  for (const b of buts) {          // ordre croissant des buts (§4.4 règle 3)
    const e = b.table.get(valeur);
    if (!e) continue;
    if (out === null) out = [];
    out.push({ but: b.but, dist: e.dist, ops: e.ops });
  }
  return out || AUCUN;
}

/** Ajoute les opérateurs NUM→NUM du bassin pour terminer sur le but visé. */
function prolongerParBassin(prefixe, entree) {
  let courant = prefixe;
  for (const op of entree.ops) {
    const cible = appliquerOp(op, courant.etat);
    if (cible === null) return null;
    if (traverse(courant, cleEtat(cible))) return null;
    courant = etendre(courant, op, cible);
  }
  if (courant.etat.type !== 'NUM' || courant.etat.valeur !== entree.but) return null;
  return materialiser(courant);
}
