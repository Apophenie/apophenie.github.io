// src/recherche/index.js
// Point d'entrée du moteur de recherche heuristique.
// Assemble bfs + bassin + fragments + assemblage + score + scenario + url.
//
// L'interface `postMessage` (CONTRACTS.md §0.4) N'EST PLUS UNE PRÉPARATION :
// `src/recherche/travailleur.js` la branche pour de bon sur un Worker, et
// `src/app/travailleur.js` retombe sur le même protocole, en tranches, quand
// aucun travailleur ne peut naître. Les deux chemins passent par `creerCanal`.
//
// ★ Ce qui a changé ici, et rien d'autre : `resoudre` est désormais le
//   CONDUCTEUR d'un générateur (`deroulerResolution`) qui s'arrête entre deux
//   fragments. La version synchrone le pousse d'un trait — pas une ligne de
//   comportement ne bouge, et c'est celle que les tests et le banc appellent ;
//   la version en tranches lui laisse rendre la main, pour que la jauge dise
//   quelque chose de vrai (`src/recherche/tranches.js`).

import { LIMITE_SAISIE, encoderTexte } from './base58.js';
import {
  chercherSix, normaliserCatalogue, validerCatalogue,
  appliquerOp, etat, operateursPourCible, operateursRetires,
  N_FRAG_MAX, FRAGMENTS_GARANTIS,
  // ⚠️ Les deux filets TEMPORELS (`BUDGET_TOTAL_MS`, `BUDGET_MS_FILET`) ne se
  //   lisent plus ici mais dans `config.js › reglagesDeBudget`, qui les rend
  //   déjà multipliés par le cran de fouille. Les budgets de TRAVAIL, eux,
  //   restent lus dans `bfs.js` où ils se justifient, et c'est `facteur` qui les
  //   met à l'échelle au point d'appel.
  BUDGET_TRAVAIL, BUDGET_TRAVAIL_TOTAL, BUDGET_TRAVAIL_RESERVE,
} from './bfs.js';
import { construireBassin } from './bassin.js';
import { genererFragments, zonesSignifiantes, tokeniser, motifsRepetes } from './fragments.js';
import {
  assembler, approcheJoker, deduireMode, normaliserChemins, verdictDe, vecteursDeSix, segmentsSansCopie,
  MAX_JETONS_RETOUCHE, MAX_VECTEURS_RETOUCHES,
} from './assemblage.js';
import {
  noter, diversifier, ordreTotal, ordrePondere, ordreElegance, ordreTriptyques, REGLAGES,
  ponderer, normaliserCurseurs, pourcentagesDe, scoresParAxe,
  CURSEURS, CURSEUR_DEFAUT, CURSEUR_MAX, CURSEURS_DEFAUT, CORRESPONDANCE,
  facteurDEcartAuxCurseurs, ordreDExactitude, ometLaPonctuation,
} from './score.js';
import {
  reglagesDeBudget, normaliserPuissance, PUISSANCE_ENUMERATION,
  PUISSANCE_DE_FOUILLE_DEFAUT, PUISSANCE_DE_FOUILLE_MAX, BORNE_MOISSON_REVELER, CRAN_RAPIDE,
} from '../config.js';
import { emploieUneFicelle, elagueALaFin } from './elegance.js';
import { indexUtiles } from './cible.js';

import { construireScenario } from './scenario.js';
import {
  titreApproche, regleApproche, titreBilingue, regleBilingue, nommer, titreCourtDe,
} from './titres.js';

/**
 * ★ **LA FORME COURTE D'UN CODE — le seul pont possible avec l'interface.**
 *
 * Une carte de la liste énumère les méthodes d'une voie, et elle n'a pour cela
 * que les CODES : les opérateurs sont des objets du catalogue, ils ne survivent
 * pas à la sérialisation d'un `postMessage` vers le travailleur. Cette fonction
 * fait la traversée du bon côté — celui où le catalogue vit —, et rend une
 * chaîne bilingue que l'interface n'a plus qu'à localiser.
 *
 * Rend `null` pour un code inconnu, et une entrée VIDE pour un opérateur qui
 * choisit de ne pas se nommer (les implicites) : l'appelant saute les deux.
 */
export function titreCourtDuCode(code, catalogue = null) {
  // ⚠️ Le catalogue voyage sous DEUX formes selon d'où il vient : un tableau
  //   d'opérateurs (`chargerCatalogue`) ou l'objet `{ operateurs }` que les
  //   tests fabriquent. On accepte les deux plutôt que de rendre `null` en
  //   silence sur la seconde — c'est ce que faisait le premier jet, et
  //   l'énumération d'une carte y perdait toutes ses méthodes d'un coup.
  const table = Array.isArray(catalogue) ? catalogue
    : (catalogue && Array.isArray(catalogue.operateurs) ? catalogue.operateurs : null);
  if (!table || !code) return null;
  const op = table.find((o) => o.code === code);
  return op ? titreCourtDe(op) : null;
}

/** La forme courte d'un opérateur — l'énumération des cartes s'en sert. */
export { titreCourtDe };
import {
  lire, ecrire, descripteursDe, retouchesDe, ecrireRetouches, BANDEAUX, RE_A_TROUVER,
} from './url.js';
import { IMPLICITE_DEPUIS } from '../config.js';
import {
  CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES, MAX_SIGNES_TEXTE, profilDeCible,
} from './cible.js';
import { politique } from './politique.js';

import {
  relecturesPour, relecturePour, relectureDuLien, signesSansRelecture, RELECTURE_PAR_DEFAUT, segmentsDe,
} from './conversions.js';
import { deroulerParTranches } from './tranches.js';

export { LIMITE_SAISIE, BANDEAUX, REGLAGES };
export { CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES, MAX_SIGNES_TEXTE };
// ★ Tout ce que le PANNEAU DE RÉGLAGES de la liste a besoin de savoir, réexporté
//   ici : l'écran ne doit pas avoir à connaître le découpage interne du moteur
//   pour dessiner quatre curseurs et une réglette. Les noms, les bornes, le
//   défaut, la table de correspondance (pour dire ce qu'un curseur touche) et
//   les deux fonctions qui traduisent des positions en pourcentages affichés.
export {
  ponderer, normaliserCurseurs, pourcentagesDe, scoresParAxe,
  CURSEURS, CURSEUR_DEFAUT, CURSEUR_MAX, CURSEURS_DEFAUT, CORRESPONDANCE,
};
export {
  reglagesDeBudget, normaliserPuissance,
  PUISSANCE_DE_FOUILLE_DEFAUT, PUISSANCE_DE_FOUILLE_MAX,
};

/**
 * Réponses écrites à la main — CONTRACTS.md §0.4.
 * « Le site échouant à prouver que 666 vaut 666 est un cadeau comique. »
 */
export const REPONSES_DEDIEES = new Map([
  ['666', {
    titre: 'Nous avons vérifié : 666 ne vaut pas 666.',
    texte: 'Le moteur a exploré la totalité des chemins et n’est pas parvenu à démontrer '
      + 'que 666 vaut 666. C’est mathématiquement vexant et, admettons-le, parfaitement '
      + 'dans le ton de la maison. Nous vous proposons tout de même une démonstration de secours.',
    ton: 'aveu',
  }],
  ['6', {
    titre: 'Six vaut six. Il vous en manque deux.',
    texte: 'Nous ne nous abaisserons pas à démontrer l’évidence. Revenez avec un mot, '
      + 'une phrase, une adresse — quelque chose qui résiste un peu.',
    ton: 'hautain',
  }],
  ['diable', {
    titre: 'Le diable, lui, n’a pas eu besoin de nous.',
    texte: 'Six lettres. Vous l’avez écrit vous-même, en toutes lettres, sans aide. '
      + 'La numérologie n’a rien à ajouter : elle constate.',
    ton: 'constat',
  }],
  ['satan', {
    titre: 'Satan : cinq lettres. Une de moins que le diable.',
    texte: 'C’est tout le drame de l’onomastique infernale. Nous vous laissons méditer '
      + 'l’écart, puis nous vous démontrons quand même le 666.',
    ton: 'pince-sans-rire',
  }],
]);

/**
 * Catalogues chargeables, énumérés un par un.
 *
 * Le chargement reste paresseux — le catalogue n'est lu que si on le demande —
 * mais le spécificateur est désormais **littéral**, donc analysable : un
 * `import(variable)` est indéchiffrable pour un empaqueteur, qui ne peut ni
 * suivre la dépendance ni la faire entrer dans le fichier unique dont la
 * version `file://` a besoin. La table de correspondance dit la même chose en
 * restant lisible des deux côtés.
 */
const CATALOGUES = {
  '../moteur/catalogue.js': () => import('../moteur/catalogue.js'),
};

/**
 * Charge le catalogue réel (`src/moteur/catalogue.js`, écrit par l'agent
 * arithmétique). Échec bruyant si absent : pas de dégradation silencieuse.
 * @returns {Promise<Object>}
 */
export async function chargerCatalogue(specificateur = '../moteur/catalogue.js') {
  const charger = CATALOGUES[specificateur];
  if (!charger) throw new Error(`catalogue « ${specificateur} » hors du registre de src/recherche/index.js`);
  const mod = await charger();
  return mod.CATALOGUE || mod.catalogue || mod.default || mod;
}

/**
 * @param {Object} catalogue
 * @param {{valider?:boolean, plageBassin?:Object, maintenant?:()=>number,
 *   filetTemporel?:boolean, elegance?:boolean, retouches?:boolean}} [options]
 *
 * ★ `retouches: false` DÉBRANCHE l'étage amont du GROUPEMENT — « on chiffre un
 *   mot, puis on lit tout » (`assemblage.js › groupementsRetouches`). Il est
 *   BRANCHÉ par défaut depuis que le barème le charge (`elegance.js ›
 *   BAREME.RETOUCHE`) ; la raison complète est écrite au point d'appel. Reste
 *   une option pour que le banc puisse comparer les deux classements sans
 *   toucher au moteur.
 *
 * ★ `filetTemporel: false` débranche l'arrêt d'urgence à l'horloge — la
 *   DERNIÈRE source d'entropie du moteur (`bfs.js`, en-tête). Deux usages, et
 *   deux seulement : le banc de mesure et les tests qui comparent deux
 *   classements. Sans lui, un barème avant/après se compare sur une base qui
 *   bouge avec la charge de la machine, ce qui ne veut rien dire. C'est une
 *   option EXPLICITE : l'appelant qui ne demande rien garde son filet.
 */
/**
 * ★ **EN DESSOUS DE CINQ VOIES, ON CREUSE** — le seuil du dernier recours.
 *
 * > « En dessous de 5, creuse. » (l'auteur)
 *
 * La seconde passe de l'assemblage (`assemblage.js › vecteursDeSix`) ne
 * s'ouvrait que sur une liste VIDE. Cinq, parce qu'une liste d'une ou deux
 * voies n'est pas une liste : le visiteur n'a rien à comparer, et c'est
 * exactement le cas où une voie longue et bancale vaut mieux que le vide. Une
 * liste bien fournie, elle, ne déclenche rien — c'est ce qui garantit que les
 * voies courtes de 666 ne bougent pas.
 *
 * ⚠️ Ce n'est PAS le nombre de lignes affichées (`budgets.voies`, douze au
 *   cran 0) : c'est un plancher de diversité, et il ne dépend pas du cran de
 *   fouille. Le lier aux places afficherait la même liste en creusant douze fois
 *   plus souvent.
 */
export const VOIES_AVANT_DE_CREUSER = 5;

/**
 * ★ Combien de SEGMENTS une phrase peut demander au cran 0 — voir la rampe de
 * `deroulerTexte`. Chaque cran en ajoute un.
 */
export const SEGMENTS_AU_CRAN_0 = 2;

/** Combien de suites de portées une phrase compose au plus, par relecture. */
export const COMPOSITIONS_MAX = 24;

/**
 * ★ **AU CRAN 5 ET AU-DELÀ, ON CREUSE QUOI QU'IL ARRIVE.**
 *
 * > « Si tu as moyen de prédire si la seconde passe a des chances de trouver de
 * >   nouveaux cas qui surpasseraient les existants, ça vaut le coup de
 * >   l'activer quoi qu'il arrive quand on pousse le curseur de profondeur de
 * >   recherche à 5 et plus. » (l'auteur)
 *
 * Le curseur de fouille dit déjà « cherche plus loin, je paierai le temps »
 * (`config.js › reglagesDeBudget`, les quatre budgets multipliés par 2ⁿ). À
 * partir du cran 5 — trente-deux fois le budget nominal —, celui qui l'a poussé
 * ne demande plus la liste la plus courte : il demande tout ce qu'on sait
 * trouver. Le plancher de voies (`VOIES_AVANT_DE_CREUSER`) cesse donc de
 * décider, et la seconde passe se déroule même sous une liste pleine.
 *
 * ⚠️ Les crans 0 à 4 ne bougent pas d'un cheveu — et le cran 0 est celui du
 *   site. Ce n'est pas une porte dérobée pour changer les listes publiées : il
 *   faut avoir poussé le curseur pour en voir la couleur.
 */
export const FOUILLE_QUI_CREUSE_TOUJOURS = 5;

/** ★ Le passage d'un cran au suivant (`deroulerResolution`) : un symbole, pour
 *  qu'aucun appelant ne le pose par mégarde dans ses options. */
const PRECEDENT = Symbol('cranPrecedent');

/** ★ Le CRAN RAPIDE (−1, `config.js › CRAN_RAPIDE`) : un symbole aussi. Il n'a
 *  pas de lien et ne se demande pas — c'est la montée qui le pose. */
const RAPIDE = Symbol('cranRapide');

/** Combien d'états de cran le moteur garde pour ne pas refaire une montée. */
const MEMO_DES_CRANS = 24;

export function creerMoteur(catalogue, options = {}) {
  /* ★ **LE SEUIL EST UN RÉGLAGE DE MESURE, ET RIEN D'AUTRE.**
   *
   * `creerMoteur(catalogue, { voiesAvantDeCreuser: 3 })` déplace le plancher
   * pour un banc qui veut chiffrer ce que le seuil coûte et rapporte. Au défaut
   * il vaut `VOIES_AVANT_DE_CREUSER`, et pas une recherche du site ne change.
   * Il vit ici plutôt que dans un `if` de banc parce qu'un banc qui recopie la
   * règle mesure sa copie ; celui-ci mesure le moteur. */
  const voiesAvantDeCreuser = Number.isInteger(options.voiesAvantDeCreuser)
    && options.voiesAvantDeCreuser >= 0 ? options.voiesAvantDeCreuser : VOIES_AVANT_DE_CREUSER;
  /* ★ **`cumulatif: false` — LE MÊME GENRE DE RÉGLAGE : DE MESURE, ET RIEN
   * D'AUTRE.** Il rend la liste d'un cran telle qu'il la sélectionne seul,
   * sans les crans inférieurs (`deroulerResolution`). C'est l'étalon du
   * « aucune baisse de qualité » : la liste cumulative doit la contenir. */
  const cumulatif = options.cumulatif !== false;
  /* ★ **`cranRapide: false` — RÉGLAGE DE MESURE, lui aussi.** La montée part
   * alors du cran 0, comme avant le cran rapide : c'est l'étalon du « le temps
   * du cran 0 n'explose pas » et du bilan de ce qui entre au cran 0. */
  const avecCranRapide = options.cranRapide !== false;
  /* ★ **`rampeDesRetouches: false` — RÉGLAGE DE MESURE AUSSI.** Il garde les
   * gardes de retouche à leurs valeurs historiques (six mots, quatre vecteurs)
   * à tous les crans : c'est l'étalon du « la rampe n'ôte rien ». */
  const rampeDesRetouches = options.rampeDesRetouches !== false;
  if (options.valider !== false) {
    const pbs = validerCatalogue(catalogue);
    if (pbs.length) throw new Error('catalogue non conforme (CONTRACTS §2.2) :\n  - ' + pbs.join('\n  - '));
  }
  const ops = normaliserCatalogue(catalogue);
  // ★ Les opérateurs par code — c'est par là que le rejeu et le scénario d'un
  //   TEXTE visé retrouvent sa relecture (`conversions.js`), le code étant
  //   écrit dans le lien. `scenario.js` ne dépend pas du catalogue : il reçoit
  //   l'opérateur, jamais le module.
  const opParCode = new Map(ops.filter(Boolean).map((o) => [o.code, o]));
  const cache = new Map();
  const maintenant = options.maintenant || (() => performance.now());
  /* ★ **CE QU'UN CRAN A LAISSÉ AU SUIVANT** — voir `deroulerResolution`.
       `etatsDesResultats` relie une réponse à la liste qu'elle a rendue sans
       rien publier de plus (un `WeakMap` ne voyage ni en `postMessage` ni en
       `JSON`) ; `memoDesCrans` en garde des COPIES, pour qu'une recherche au
       cran n qui suit une recherche au cran n−1 sur la même question ne refasse
       pas les crans inférieurs. Borné : c'est un raccourci, pas une archive. */
  const etatsDesResultats = new WeakMap();
  const memoDesCrans = new Map();
  /* ★ La double sélection (`finaliser`) : les voies qu'ont retenues les
       anciennes gardes, et leur compte par liste. Deux registres du moteur, pour
       qu'aucun champ neuf ne voyage sur les voies. */
  const auxAnciennesGardes = new WeakSet();
  const comptesDesAnciennesGardes = new WeakMap();

  // ★ UN BASSIN PAR CHIFFRE VISÉ, construit à la demande et gardé.
  //
  //   Le bassin d'attraction est un précalcul sur `[-2000, 2000]` : il coûte,
  //   et il ne dépend que du catalogue et du chiffre visé. Le construire par
  //   chiffre plutôt que par recherche, c'est le payer une fois pour toutes les
  //   saisies d'une même session. Celui de 6 est bâti tout de suite, parce que
  //   c'est celui de la cible par défaut et que `moteur.bassin` le publie
  //   depuis toujours.
  const bassins = new Map();
  const bassinPour = (chiffre) => {
    let b = bassins.get(chiffre);
    if (b === undefined) {
      b = construireBassin(catalogue, options.plageBassin, chiffre);
      bassins.set(chiffre, b);
    }
    return b;
  };
  const bassin = bassinPour(6);
  // Les tables à consulter pour une cible donnée, dans l'ordre CROISSANT des
  // chiffres (§4.4 règle 3 : l'ordre d'itération décide du classement).
  const tablesDe = (cbl) => cbl.alphabet.map((but) => ({ but, table: bassinPour(but) }));

  // ★ Un TEXTE ne se cherche pas : ce sont ses relectures qui se cherchent
  //   (`deroulerTexte`). Qu'il arrive jusqu'ici, c'est qu'un chemin l'a laissé
  //   passer — et le chercher tel quel ne viserait RIEN (ses `chiffres` sont
  //   vides), en silence. On le dit.
  const garderTexteHorsRecherche = (cbl) => {
    if (cbl && cbl.nature === 'mot') {
      throw new Error(`recherche : le texte « ${cbl.texte} » se cherche par ses relectures, pas tel quel`);
    }
  };
  const contexteBase = (cbl, sur = {}) => (garderTexteHorsRecherche(cbl), {
    catalogue,
    operateurs: operateursPourCible(catalogue, cbl),
    bassin,
    bassins: tablesDe(cbl),
    cible: cbl,
    cache,
    maintenant,
    dMax: options.dMax,
    pBeam: options.pBeam,
    maxNodes: options.maxNodes,
    maxTravail: options.maxTravail,
    budgetMs: options.budgetMs,
    filetTemporel: options.filetTemporel,
    // ★ Les surcharges de la RÉGLETTE DE FOUILLE (`config.js ›
    //   reglagesDeBudget`). Elles ne servent qu'à l'énumération : une recherche
    //   ordinaire n'en passe aucune et retrouve exactement le régime d'avant.
    ...sur,
  });

  /**
   * ★ **LA RECHERCHE CUMULATIVE — une voie trouvée à un cran reste trouvée à
   * tous les crans supérieurs, et monter le curseur ne chasse jamais une voie
   * que ce cran aurait montrée.**
   *
   * > « Le seul cas où ça pourrait appauvrir la liste, c'est si seules des
   * >   solutions avec meilleur score saturaient les résultats possibles, mais
   * >   dans ce cas, mieux vaut élargir le nombre de résultats pour en faire
   * >   effectivement un invariant. » (l'auteur)
   *
   * **La liste du cran n est l'UNION des sélections des crans 0 à n** : le
   * cran n cherche et sélectionne exactement comme s'il était seul — sur ses
   * propres candidats, avec son quota par méthode et ses places —, puis il
   * ajoute les voies de la liste du cran n−1 qu'il n'a pas. Deux conséquences,
   * et ce sont les deux exigences :
   *
   *   · l'invariant tient par construction : la liste du cran n−1 est dans
   *     celle du cran n ;
   *   · AUCUNE BAISSE DE QUALITÉ : ce que le cran n aurait montré seul y est
   *     aussi, en entier. Les voies reprises ne prennent ni sa place ni son
   *     quota ; c'est le nombre de lignes qui grandit.
   *
   * ⚠️ **CE QUI A ÉTÉ MESURÉ AVANT, et écarté.** Garder les voies du cran n−1
   *   PUIS compléter les places par le MMR (21 baisses, toutes sur
   *   « hope-hope-hope.fr ») : les reprises épuisaient places et quota, et
   *   chassaient `fl+m14+mpf` (7 084). Sélection ordinaire PUIS reprises
   *   manquantes, mais sur une réserve où les candidats des crans inférieurs
   *   concourent (15 baisses) : c'étaient ces candidats portés qui prenaient
   *   les places du MMR. Reprises hors quota (27 baisses). La sélection d'un
   *   cran ne voit donc QUE ses candidats.
   *
   * ★ **LA TÊTE** est recalculée sur l'union — le champion de l'élégance et
   *   celui des triptyques (`champions`) : une voie plus élégante trouvée au
   *   cran inférieur ne perd pas la première ligne parce que le cran courant
   *   ne la reconstruit plus.
   * ★ **LE CRAN 0 N'A PAS DE CRAN INFÉRIEUR** : il passe tel quel, au
   *   caractère près.
   * ★ **DIRECT OU CRAN PAR CRAN, LA MÊME LISTE** : le cran n se calcule
   *   toujours depuis le cran 0 ; le mémo ne fait que sauter les crans déjà
   *   calculés, sur des copies qui ne bougent plus.
   * ⚠️ **LE PRIX** : les crans 0 à n−1 se déroulent avant le cran n. Ce qui
   *   se réemploie est dit dans `bfs.js › chercherSix`.
   * ★ **LA JAUGE** couvre toute la montée : chaque cran y pèse son facteur 2ᵏ
   *   (celui des budgets), et elle ne recule pas d'un cran au suivant.
   */
  function* deroulerResolution(saisieBrute, optionsResolution = {}) {
    const fouille = normaliserPuissance(optionsResolution.fouille ?? options.fouille);
    if (!cumulatif) return yield* deroulerUnCran(saisieBrute, optionsResolution);
    /* ★ **LA MONTÉE PART DU CRAN RAPIDE (−1)** — `config.js › CRAN_RAPIDE`.
         Le cran 0 n'est plus le premier : sa liste est l'union de sa sélection
         et de celle du cran −1, par la même règle que les autres crans. Le cran
         0 publié gagne donc les voies rapides qui lui manquaient, et rien n'en
         sort (arbitrage de l'autrice). */
    const bas = avecCranRapide ? CRAN_RAPIDE.cran : 0;
    /* ★ Le poids d'un cran dans la jauge : celui de ses budgets, le cran rapide
         pesant la moitié du cran 0. */
    const poidsDu = (k) => (k < 0 ? 1 : 2 ** (k + 1));
    let depart = bas;
    let precedent = null;
    for (let k = fouille - 1; k >= bas; k--) {
      const e = memoDesCrans.get(cleDuCran(saisieBrute, optionsResolution, k));
      if (e) { depart = k + 1; precedent = e; break; }
    }
    const canal = typeof optionsResolution.surAvancement === 'function'
      ? optionsResolution.surAvancement : null;
    /* ★ **LES LISTES PROVISOIRES — la liste d'un cran inférieur, montrée pendant
         que le cran demandé se calcule.** Facultatif, en lecture seule, comme
         `surAvancement` : son absence ne change rien au calcul, et sa présence
         non plus — il ne reçoit que des COPIES. Il n'est appelé qu'entre deux
         crans, jamais au milieu d'une exploration.
       ★ Chaque liste est celle, cumulative, du cran k, ses liens réécrits AU
         CRAN DEMANDÉ : une voie de la liste provisoire porte exactement le lien
         qu'elle aura dans la liste finale, où la cumulation la garde. */
    const surListe = typeof optionsResolution.surListe === 'function' ? optionsResolution.surListe : null;
    const montrer = surListe ? (reponse, retenues, k) => {
      surListe(listeProvisoire(saisieBrute, optionsResolution, reponse, retenues, fouille),
        { cran: k, fouille });
    } : null;
    // Un cran déjà en mémoire se montre tout de suite, avant tout calcul.
    if (montrer && precedent && precedent.reponse) {
      montrer(precedent.reponse, copierEtat(precedent).retenues
        .map((a, i) => ({ ...a, suggestion: precedent.suggestions[i] })), depart - 1);
    }
    let total = 0;
    for (let k = depart; k <= fouille; k++) total += poidsDu(k);
    let fait = 0;
    let plusHaut = 0;
    let tronque = precedent ? precedent.tronque : false;
    let tronqueTemps = false;
    let resultat = null;
    for (let k = depart; k <= fouille; k++) {
      const poids = poidsDu(k);
      const echelle = (a) => {
        if (!a || typeof a.fraction !== 'number') return a;
        const f = (fait + poids * Math.min(1, Math.max(0, a.fraction))) / total;
        plusHaut = Math.max(plusHaut, Math.min(1, f));
        return { ...a, fraction: plusHaut };
      };
      const sous = deroulerUnCran(saisieBrute, {
        ...optionsResolution,
        fouille: Math.max(0, k),
        [RAPIDE]: k < 0,
        [PRECEDENT]: precedent,
        surAvancement: canal ? (a) => canal(echelle(a)) : undefined,
      });
      let pas = sous.next();
      while (!pas.done) {
        const pause = yield echelle(pas.value);
        pas = sous.next(pause);
      }
      resultat = pas.value;
      fait += poids;
      if (resultat.tronque) tronque = true;
      if (resultat.tronqueTemps) tronqueTemps = true;
      // ⚠️ Un filet temporel qui a mordu rend la suite dépendante de la
      //   machine : on cumule quand même, mais on ne mémorise plus rien.
      precedent = memoriserLeCran(saisieBrute, optionsResolution, k, resultat, tronque, tronqueTemps);
      if (montrer && k < fouille) montrer(resultat, resultat.approches, k);
    }
    // Ce qu'un cran inférieur a subi, la réponse le porte : sa liste en dépend.
    if (tronque) resultat.tronque = true;
    if (tronqueTemps) {
      resultat.tronqueTemps = true;
      if (!resultat.avertissement) resultat.avertissement = BANDEAUX.rechercheTronquee;
    }
    return resultat;
  }

  /**
   * ★ **LA BORNE DE LA MOISSON D'UNE RECHERCHE** — celle qu'on demande, sinon
   * celle de « Révéler », sinon aucune.
   *
   * > « Révéler sous 5 s : borne sur l'assemblage, pour Révéler SEUL. La liste
   * >   énumérée et ses liens ne changent pas. » (l'autrice)
   *
   * Une borne de TRAVAIL, jamais d'horloge (§4.4) : la même saisie rend la même
   * première voie sur toutes les machines. Le lien de cette voie est un lien
   * ordinaire — un programme —, qui se rejoue à l'identique hors de Révéler.
   */
  function borneDeLaMoisson(optionsResolution) {
    if (Number.isFinite(optionsResolution.borneAssemblage)) return optionsResolution.borneAssemblage;
    // ★ Le cran rapide borne sa moisson comme Révéler (`config.js › CRAN_RAPIDE`).
    if (optionsResolution[RAPIDE] === true) return CRAN_RAPIDE.borneMoisson;
    return optionsResolution.pourReveler === true ? BORNE_MOISSON_REVELER : undefined;
  }

  /** La clé d'un cran : tout ce qui décide de sa liste, et rien d'autre. */
  function cleDuCran(saisieBrute, optionsResolution, k) {
    const cbl = normaliserCible(optionsResolution.cible ?? options.cible);
    const { curseurs } = ponderer(optionsResolution.curseurs ?? options.curseurs);
    return [
      String(saisieBrute ?? '').normalize('NFC'), cbl.nature, cbl.texte, JSON.stringify(curseurs), k,
      optionsResolution.profond === true, optionsResolution.dernierRecours !== false,
      optionsResolution.matiereDePhrase === true,
      // ★ Une liste bornée ne sert JAMAIS de cran inférieur à une liste qui ne l'est pas.
      borneDeLaMoisson(optionsResolution) ?? '',
    ].join('\u0000');
  }

  /**
   * ★ **UNE LISTE PROVISOIRE — la liste du cran k, telle que la page peut la
   * montrer pendant que le cran demandé se calcule.**
   *
   * Des COPIES : la réponse du cran k reste intacte, elle sert au cran suivant.
   * Les liens des voies sont réécrits au cran DEMANDÉ, par la même recette que
   * `unirAuCranInferieur` et `relierAuTexte` — la liste finale les contiendra
   * au caractère près, puisque la cumulation garde ces voies. Le lien de la
   * liste est celui de la liste demandée : le copier pendant la recherche mène
   * à la liste qui se calcule, pas à une étape.
   *
   * ⚠️ **ÉCHEC BRUYANT.** Avant de réécrire, la recette est rejouée au cran
   *   d'origine et doit rendre le lien que la voie porte déjà. Si elle ne le
   *   rend pas, c'est que la recette a divergé de celle du moteur, et une liste
   *   provisoire montrerait des liens qui ne rejouent peut-être pas ce qu'ils
   *   montrent : on jette plutôt que de le risquer.
   * ★ La liste des FRAGMENTS n'est pas reprise : ses liens portent le cran
   *   d'origine et ne se réécrivent pas sans relire l'URL. Elle arrive avec la
   *   liste finale, sous les voies.
   */
  function listeProvisoire(saisieBrute, optionsResolution, reponse, retenues, fouille) {
    const saisie = String(saisieBrute ?? '').normalize('NFC');
    const cbl = normaliserCible(optionsResolution.cible ?? options.cible);
    const { curseurs } = ponderer(optionsResolution.curseurs ?? options.curseurs);
    const lienA = (a, f, registre) => ecrire({
      saisie,
      cible: cbl,
      retouches: a.lien.retouches,
      liaison: a.lien.liaison,
      fragments: a.lien.fragments,
      ...(a.relecture ? { relecture: a.relecture.code } : {}),
      curseurs,
      fouille: f,
      registre,
    });
    const approches = retenues.map((a) => {
      if (!a.lien) throw new Error(`liste provisoire : la voie « ${a.codes} » n'a pas de lien à réécrire`);
      if (lienA(a, reponse.fouille, 'sobre') !== a.urlSobre || lienA(a, reponse.fouille, 'scenique') !== a.urlScenique) {
        throw new Error(`liste provisoire : la réécriture du lien de « ${a.codes} » ne rend pas celui du moteur`);
      }
      const urlSobre = lienA(a, fouille, 'sobre');
      const urlScenique = lienA(a, fouille, 'scenique');
      return { ...a, urlSobre, urlScenique, url: urlScenique };
    });
    return {
      ...reponse,
      approches,
      fragments: [],
      fouille,
      urlResultats: ecrire({ saisie, cible: cbl, curseurs, fouille }),
    };
  }

  /** Garde une COPIE de la liste d'un cran, et la rend : c'est elle qui sert au suivant. */
  function memoriserLeCran(saisieBrute, optionsResolution, k, resultat, tronque = false, tronqueTemps = false) {
    const etat = etatsDesResultats.get(resultat);
    if (!etat) return null;
    const copie = copierEtat({ ...etat, tronque: tronque || !!resultat.tronque });
    // ★ Ce qu'il faut pour MONTRER ce cran plus tard (`listeProvisoire`) : la
    //   réponse sans ses voies, et les suggestions que `copierEtat` retire.
    const { approches, ...reponse } = resultat;
    copie.reponse = reponse;
    copie.suggestions = (approches || []).map((a) => a.suggestion);
    if (tronqueTemps || resultat.tronqueTemps) return copie;
    const cle = cleDuCran(saisieBrute, optionsResolution, k);
    memoDesCrans.delete(cle);
    memoDesCrans.set(cle, copie);
    while (memoDesCrans.size > MEMO_DES_CRANS) memoDesCrans.delete(memoDesCrans.keys().next().value);
    return copie;
  }

  /**
   * Pipeline complet, DÉROULÉ PAS À PAS. Ne rend JAMAIS la main bredouille (§5)
   * — **quand la cible vaut 666**. Voir `assemblage.js › approcheJoker` : le
   * dernier recours du site est une propriété du français, pas des chiffres.
   *
   * ★ C'est un GÉNÉRATEUR, et il n'a qu'un seul point d'arrêt : la fin d'un
   *   fragment cherché. Ce n'est pas un détail d'implémentation, c'est la
   *   condition du déterminisme (§4.4) — on ne s'arrête jamais AU MILIEU d'une
   *   exploration, donc l'ensemble exploré ne dépend pas d'où l'on s'est arrêté.
   *   Ce que le `yield` produit est l'avancement RÉEL (voir `avancementDe`) ;
   *   ce qu'il reçoit en retour est la durée rendue à l'appelant, que le filet
   *   temporel doit ignorer.
   *
   * Deux conducteurs le poussent : `resoudre`, d'un trait ; et
   * `resoudreProgressif`, par tranches (`tranches.js`).
   *
   * ★ **LES DEUX RÉGLAGES DE L'ÉCRAN DE LISTE**, et ils traversent tout le
   *   pipeline sans se ressembler :
   *
   *   · `curseurs` — les quatre positions (`score.js › ponderer`). Elles ne
   *     changent RIEN à ce qui est exploré : elles repondèrent la NOTATION et
   *     donc le classement. Une liste repondérée est la même récolte, triée
   *     autrement.
   *   · `fouille` — le cran 2^N de `config.js › reglagesDeBudget`. Lui, à
   *     l'inverse, ne change rien à la notation : il change ce qu'on a eu le
   *     temps de CHERCHER, donc ce qu'il y a à classer.
   *
   *   Les deux se lisent d'abord dans `optionsResolution` — c'est un réglage
   *   par recherche —, puis dans les options du moteur, pour qu'un banc de
   *   mesure puisse en fixer un pour toute une campagne.
   *
   * @param {string} saisieBrute
   * @param {{cible?:import('./cible.js').Cible|string, curseurs?:Object,
   *   fouille?:number}} [optionsResolution]
   */
  function* deroulerUnCran(saisieBrute, optionsResolution = {}) {
    const cbl = normaliserCible(optionsResolution.cible ?? options.cible);
    /* ★ **LE PROFIL DE LA CIBLE, ET CE QU'IL AUTORISE** — `cible.js ›
         profilDeCible` nomme les faits, `politique.js` en tire ce qu'on
         s'autorise. Treize réglages relisaient la cible chacun à sa façon ;
         ceux qui se rangent naturellement se lisent désormais ici. */
    const regles = politique(profilDeCible(cbl));
    // ★ Un TEXTE visé se cherche par ses relectures — voir `deroulerTexte`.
    if (regles.parRelectures) return yield* deroulerTexte(saisieBrute, cbl, optionsResolution);
    const ponderation = ponderer(optionsResolution.curseurs ?? options.curseurs);
    const fouille = normaliserPuissance(optionsResolution.fouille ?? options.fouille);
    const budgets = reglagesDeBudget(fouille);
    // ★ Le CRAN RAPIDE (−1) : les budgets du cran 0, le travail divisé, sans passe profonde.
    const rapide = optionsResolution[RAPIDE] === true;
    const diviseurDeTravail = rapide ? CRAN_RAPIDE.diviseurDeTravail : 1;
    // ★ La liste du cran inférieur (`deroulerResolution`) — `null` au cran 0.
    const precedent = optionsResolution[PRECEDENT] || null;
    // Ce que l'écran de liste doit retrouver dans TOUTE réponse, y compris les
    // deux replis ci-dessous : sans quoi le panneau de réglages perdrait ses
    // positions sur une saisie vide ou trop longue.
    const reglagesRendus = {
      curseurs: ponderation.curseurs,
      pourcentages: ponderation.pourcentages,
      poids: ponderation.poids,
      fouille,
    };
    const saisie = String(saisieBrute ?? '').normalize('NFC'); // §4.4 règle 5
    if (!saisie.length) {
      return {
        saisie, cible: cbl, approches: [], fragments: [], dedie: null, vide: true,
        ...reglagesRendus,
      };
    }
    if (saisie.length > LIMITE_SAISIE) {
      return {
        saisie: saisie.slice(0, LIMITE_SAISIE), cible: cbl,
        approches: [], fragments: [], dedie: null, vide: false,
        ...reglagesRendus,
        avertissement: BANDEAUX.saisieTropLongue,
      };
    }

    // ★ Les réponses dédiées ne valent QUE pour la cible par défaut. « Nous
    //   avons vérifié : 666 ne vaut pas 666 » n'a rien de drôle au-dessus d'une
    //   liste qui vise 111, et « Six vaut six, il vous en manque deux » est
    //   faux si l'on cherche `6`. Le gag est une propriété du couple
    //   (saisie, cible), et la moitié de ce couple vient de changer.
    const dedie = regles.reponsesDediees ? (REPONSES_DEDIEES.get(saisie.toLowerCase().trim()) || null) : null;
    const ctxRecherche = contexteBase(cbl);
    const signifiants = zonesSignifiantes(saisie);
    const jetons = tokeniser(saisie);
    const frags = genererFragments(saisie, { max: options.nFragMax ?? N_FRAG_MAX });

    // ── phase de recherche, sous budget GLOBAL (research §2.6, repli 5).
    // L'ordre de recherche n'est pas celui d'affichage : le fragment « saisie
    // entière » porte à lui seul les modes DIRECT et TRIPLEMENT, il passe donc
    // juste après les répétitions, avant les unités. Quand le budget s'épuise,
    // ce sont les fragments de queue — n-grammes, mots surnuméraires — qui
    // sautent, jamais ceux qui portent l'assemblage.
    //
    // ── Ce qui borne la phase est le TRAVAIL, pas le temps (§4.4 règle 4).
    // La borne primaire est un budget d'applications d'opérateurs réparti entre
    // les fragments : elle ne dépend que de la saisie, donc deux machines — ou
    // la même machine à deux moments — explorent exactement le même ensemble.
    // Le budget de temps ne subsiste qu'en FILET DE SÉCURITÉ : il ne doit
    // jamais se déclencher dans les cas normaux, et quand il se déclenche le
    // résultat part marqué `tronque` plutôt que de varier en silence.
    const parFrag = new Map();
    // ★ Débranché, le filet ne LIT même pas l'horloge (voir `bfs.js`).
    const filetTemporel = options.filetTemporel !== false;
    let debutRecherche = filetTemporel ? maintenant() : 0;
    // ★ LA PUISSANCE DE FOUILLE MULTIPLIE LES QUATRE BUDGETS, ET SEULEMENT EUX.
    //   `budgets.facteur` vaut 2^N ; au cran 0 il vaut 1 et pas une constante ne
    //   bouge (`config.js › reglagesDeBudget`). Les quatre montent ENSEMBLE parce
    //   qu'ils forment un système : n'en relever qu'un déplace le goulot au lieu
    //   de chercher plus loin — voir le pavé de `config.js`, qui porte la mesure.
    //   ⚠️ Les surcharges explicites de l'appelant (`options.budget*`) restent
    //   PRIORITAIRES et ne sont PAS multipliées : le banc de mesure qui fixe un
    //   budget le fixe pour de bon, sinon deux réglages se battraient en silence.
    const budgetTotal = options.budgetTotalMs ?? budgets.budgetTotalMs;
    const travailTotal = options.budgetTravailTotal
      ?? Math.floor((BUDGET_TRAVAIL_TOTAL * budgets.facteur) / diviseurDeTravail);
    const travailParFragment = Math.floor((BUDGET_TRAVAIL * budgets.facteur) / diviseurDeTravail);
    const travailDeReserve = Math.floor((BUDGET_TRAVAIL_RESERVE * budgets.facteur) / diviseurDeTravail);
    let cherches = 0;
    let travailRestant = travailTotal;
    let tronqueTravail = false;  // borne déterministe atteinte : reproductible
    let tronqueTemps = false;    // filet de sécurité : à signaler à l'utilisateur
    // ★ LE DÉNOMINATEUR DE LA JAUGE, et il est compté, pas estimé : les
    //   fragments DISTINCTS que la boucle va parcourir. Distincts, parce que
    //   `ordreDeRecherche` peut proposer deux fois le même texte (une répétition
    //   et une unité, par exemple) et que la boucle saute le doublon sans rien
    //   chercher — le compter ferait une jauge qui s'arrête à 90 % sur les
    //   saisies à motif répété, c'est-à-dire précisément celles du site.
    /* ★ **LE CANAL DE PROGRESSION, ouvert avant la première recherche.**
       Il ne sert qu'à dire où l'on en est ; il est facultatif, en lecture seule,
       et son absence ne change rien au calcul. Voir `avancementDe` pour les
       phases et leurs poids mesurés. */
    /* ⚠️ **LE GARDE-FOU ANTI-RECUL EST ICI, ET NON PAR FRAGMENT.** Mesuré : avec
         un compteur remis à zéro à chaque fragment, la fraction publiée passait
         de 11 % à 5 % en cours de route. La jauge, elle, ne recule jamais
         (`jauge-recherche.js`), si bien que le défaut ne se voyait pas — il
         faisait simplement disparaître des rapports, donc stagner la barre.
         Un rapport qui ment n'est pas moins grave parce que l'affichage le
         rattrape. */
    const canal = typeof optionsResolution.surAvancement === 'function'
      ? optionsResolution.surAvancement : null;
    /* ⚠️ **DEUX CHEMINS MÈNENT À LA JAUGE, ET LA MONOTONIE DOIT VALOIR POUR LES
         DEUX.** Le `yield` de la boucle des fragments remonte par le dérouleur,
         les rapports intra-fragment et ceux de l'assemblage par ce canal-ci. Un
         garde-fou posé sur le second laissait donc passer les reculs du premier
         — mesuré, trois par recherche sur « Le chat dort sur le tapis rouge ».
         `marquer` est le passage obligé : il borne la fraction par le plus haut
         déjà annoncé, quel que soit le chemin emprunté. */
    let plusHaut = 0;
    const marquer = (avancement) => {
      const fraction = Math.max(plusHaut, avancement.fraction);
      plusHaut = fraction;
      return { ...avancement, fraction };
    };
    // Un rapport par millième : au-delà, on poste des messages que la barre ne
    // peut pas distinguer.
    let dernierMillieme = -1;
    let dernierePhase = null;
    const publier = canal ? (avancement) => {
      const a = marquer(avancement);
      const m = Math.round(a.fraction * 1000);
      // ★ **UN CHANGEMENT DE PHASE PASSE TOUJOURS**, même sans gain de fraction.
      //   « Idéalement qu'elle indique sommairement ce qu'elle fait » : passer
      //   de l'assemblage au classement EST une information, et la retenir au
      //   motif que la barre n'avance pas laissait la jauge annoncer
      //   « assemblage des voies » jusqu'au dernier instant.
      if (m <= dernierMillieme && a.phase === dernierePhase) return;
      dernierMillieme = Math.max(dernierMillieme, m);
      dernierePhase = a.phase;
      canal(a);
    } : null;
    const ordre = ordreDeRecherche(frags);
    const aChercher = new Set(ordre.map((f) => f.texte.normalize('NFC'))).size;
    // ★ Le PLAFOND de travail, réserve comprise — le dénominateur honnête de la
    //   jauge, et pas `travailTotal`. Le budget global épuisé, la recherche ne
    //   s'arrête pas : les fragments garantis se cherchent encore, sur la
    //   réserve (voir plus bas, et `bfs.js › BUDGET_TRAVAIL_RESERVE`). Rapporter
    //   l'avancement au seul budget global le ferait donc atteindre 100 % alors
    //   qu'il reste jusqu'à douze fragments à faire — la jauge à cent pour cent
    //   qui continue de tourner, c'est-à-dire le mensonge le plus détesté.
    //
    // ⚠️ **ET IL FAUT Y AJOUTER UN FRAGMENT ENTIER**, ce qui manquait. La boucle
    //   décide d'entrer AVANT de savoir ce que le fragment coûtera : elle teste
    //   `travailRestant <= 0`, si bien qu'un fragment qui commence avec une
    //   unité de budget dépense tout de même son plafond ordinaire
    //   (`BUDGET_TRAVAIL`), et non la réserve. Le vrai plafond est donc le
    //   budget global, PLUS ce débordement d'un fragment, PLUS la réserve des
    //   garantis.
    //
    //   MESURÉ, et c'est `D_MAX` porté à six qui l'a révélé : sur « La
    //   numérologie est une science exacte, disent-ils », le travail atteint
    //   1 625 018 pour un dénominateur annoncé à 1 480 000 — la jauge restait
    //   pleine QUATRE paliers pendant qu'il restait quatre fragments à chercher.
    //   Exactement le mensonge que ce dénominateur existe pour empêcher. À
    //   profondeur quatre le total tombait à 1 479 619, sous le plafond d'un
    //   cheveu : le défaut dormait là depuis toujours.
    //
    //   La jauge n'en finit pas plus bas pour autant : elle est le MAXIMUM de
    //   deux rapports, et celui des fragments atteint 1 au dernier. Le budget,
    //   lui, se contente désormais de ne plus mentir en chemin.
    //   ★ ET LES TROIS TERMES SUIVENT LA RÉGLETTE DE FOUILLE : au cran N ils
    //     valent tous 2^N fois leur valeur nominale (`config.js`). Un
    //     dénominateur qui resterait au cran 0 rendrait la jauge fausse pour la
    //     raison exacte que ce commentaire vient de décrire, à l'envers.
    const plafondTravail = travailTotal + travailParFragment
      + FRAGMENTS_GARANTIS * travailDeReserve;
    for (const f of ordre) {
      const cle = f.texte.normalize('NFC');
      if (parFrag.has(cle)) continue;
      const epuise = travailRestant <= 0;
      if (epuise && cherches >= FRAGMENTS_GARANTIS) { tronqueTravail = true; break; }
      // Le filet, lui, ne connaît pas de fragment garanti : c'est un arrêt
      // d'urgence, il doit pouvoir arrêter. Un seul fragment est cherché
      // inconditionnellement, faute de quoi `resoudre` pourrait rendre la main
      // sans avoir rien cherché du tout.
      if (filetTemporel && cherches >= 1 && maintenant() - debutRecherche > budgetTotal) {
        tronqueTemps = true;
        break;
      }
      // Le plafond du fragment ne prend que DEUX valeurs, jamais un reliquat de
      // budget : le régime normal, et la réserve une fois le budget global
      // épuisé. Un fragment garanti cherché après épuisement n'a droit qu'à la
      // réserve — sans quoi le plancher des douze perce le budget (mesuré :
      // douze mots de quarante caractères, 1 450 ms). Deux valeurs discrètes
      // et non un reliquat continu, parce que `chercherSix` mémoïse par
      // (fragment, plafond) : un plafond continu multiplierait les entrées de
      // cache sans rien garantir de plus.
      // Le budget global, lui, ne décide que du NOMBRE de fragments cherchés.
      ctxRecherche.maxTravail = options.maxTravail
        ?? (epuise ? travailDeReserve : travailParFragment);
      ctxRecherche.budgetMs = options.budgetMs ?? budgets.budgetMsFilet;
      // ★ La profondeur suit le cran ICI aussi, et pas seulement dans
      //   l'énumération des trous : c'est ce que `debug.html` annonce comme
      //   « ce que la recherche emploie », et il ne mentait qu'à cet endroit.
      ctxRecherche.dMax = options.dMax ?? budgets.dMax;
      // Le fragment EN COURS avance la jauge à l'intérieur de sa propre part :
      // sans cela, une saisie d'un seul fragment ne bouge qu'à la fin.
      ctxRecherche.surProgres = publier ? (p) => {
        const part = (cherches + Math.min(1, Math.max(0, p))) / Math.max(1, aChercher);
        publier(avancementDe({ phase: 'fragments', part, fragments: cherches, fragmentsTotal: aChercher }));
      } : null;
      const avant = ctxRecherche.travail || 0;
      parFrag.set(cle, chercherSix(f.texte, ctxRecherche));
      travailRestant -= (ctxRecherche.travail || 0) - avant;
      cherches++;
      // ── L'UNIQUE point d'arrêt du dérouleur. Ce qui remonte est vrai : un
      //    fragment vient d'être cherché, et le travail dépensé est celui que
      //    `chercherSix` a réellement compté.
      //
      //    ★ Le total des fragments se CORRIGE une fois le budget épuisé. La
      //      boucle s'arrête alors dès que le plancher garanti est atteint : ce
      //      ne sont plus les `aChercher` fragments qui restent à faire, mais
      //      les `FRAGMENTS_GARANTIS` premiers. Annoncer l'ancien total ferait
      //      une jauge qui s'arrête à 40 % — et le dénominateur ne fait que
      //      rétrécir, donc la jauge ne recule jamais.
      const pause = yield marquer(avancementDe({
        phase: 'fragments',
        fragments: cherches,
        fragmentsTotal: travailRestant > 0
          ? aChercher
          : Math.min(aChercher, Math.max(FRAGMENTS_GARANTIS, cherches)),
        travail: travailTotal - travailRestant,
        travailTotal: plafondTravail,
      }));
      // Le temps rendu à l'appelant n'est pas du temps de recherche : on recule
      // l'origine du filet d'autant (voir `tranches.js`, qui mesure la pause).
      // Conduit d'un trait, `pause` vaut zéro et rien ne bouge.
      if (filetTemporel && pause > 0) debutRecherche += pause;
    }
    if (ctxRecherche.tronque && !ctxRecherche.tronqueTemps) tronqueTravail = true;
    if (ctxRecherche.tronqueTemps) tronqueTemps = true;

    // ★ L'ÉTAGE AMONT DU GROUPEMENT (`assemblage.js › groupementsRetouches`)
    //   est BRANCHÉ — « on chiffre un mot, puis on lit tout ».
    //
    //   Il est resté débranché tant que le barème ne le chargeait pas : les
    //   opérations d'une retouche voyagent à côté des parts et jamais dedans
    //   (voir `rejouer`), si bien qu'une voie retouchée était notée comme si son
    //   étage amont était gratuit. Ce n'est plus le cas — `elegance.js` lit
    //   `approche.retouches`, en facture les gestes au tarif ordinaire, et
    //   ajoute le palier `RETOUCHE`, réglé au banc.
    //
    //   ⚠️ Ce que le branchement coûte en TEMPS reste réel, et le générateur
    //   porte ses trois bornes pour cela (six mots, quatre vecteurs, la saisie
    //   entière seule). Le budget d'une seconde est mesuré par
    //   `recherche.test.js`, qui reste le garde-fou.
    const ctxAssemblage = {
      saisie, jetons, signifiants, catalogue, cible: cbl, retouches: options.retouches !== false,
      // ★ La largeur d'assemblage suit le cran : c'est elle qui décide combien
      //   d'approches peuvent seulement EXISTER (`config.js`).
      parFragment: budgets.parFragment,
      // ★ Les gardes de l'étage des retouches suivent le cran (`config.js`).
      // ★ Ce que la rampe fait naître au-delà des gardes historiques — voir
      //   `finaliser`, la double sélection. Partagé avec la passe profonde.
      horsGardesHistoriques: new WeakSet(),
      // ★ La BORNE DE TRAVAIL de la moisson (`assemblage.js › moissons`) —
      //   absente au défaut : la liste du site ne la connaît pas.
      borneAssemblage: borneDeLaMoisson(optionsResolution),
      motsRetouches: rampeDesRetouches ? budgets.motsRetouches : MAX_JETONS_RETOUCHE,
      vecteursRetouches: rampeDesRetouches ? budgets.vecteursRetouches : MAX_VECTEURS_RETOUCHES,
      // ★ Les curseurs descendent jusqu'à la réserve de qualité de
      //   `assemblage.js › vecteursDeSix` : ce sont eux qui décident quelles
      //   voies méritent d'être finalisées (`score-intermediaire.js`).
      curseurs: ponderation.curseurs,
      // ★ Le cache du moteur, pour les tables de valeurs des LIAISONS : ce que
      //   « James » sait donner ne dépend ni de la cible ni de la recherche, et
      //   se calcule une fois par session (`assemblage.js › liaisons`).
      cache,
      // ★ Le DERNIER RECOURS, quand l'appelant l'a déjà décidé : un texte visé
      //   refait le tour de ses relectures en passe profonde (`deroulerTexte`),
      //   et chacune doit alors s'autoriser le geste de plus dès le premier
      //   assemblage, sans refaire celui qui vient d'échouer.
      profond: optionsResolution.profond === true,
      // ★ LA MATIÈRE D'UNE PHRASE — posée par `deroulerTexte` pour le bloc d'une
      //   phrase trop longue, et par lui seul.
      matiereDePhrase: optionsResolution.matiereDePhrase === true,
      // ★ Ce que l'assemblage sait ne PAS pouvoir jouer, et qu'il dira
      //   (`assemblage.js`, les modes à autant de portées que de chiffres).
      modesImpossibles: [],
    };
    /* ★ **L'ASSEMBLAGE REND COMPTE DE LUI-MÊME** — voir `assemblage.js`, où la
         mesure est écrite. Il ne peut pas `yield` : il est appelé DEPUIS ce
         générateur. Mais tout ceci tourne dans un travailleur, dont l'interface
         n'attend pas : le rapport se poste directement sur le canal que
         l'appelant fournit (`surAvancement`), et l'absence de canal ne change
         rien au calcul.

       ⚠️ **AU PLUS UN RAPPORT PAR CENTIÈME**, sans quoi le groupement sous
         retouche en posterait un par approche produite — des centaines de
         messages pour une barre qui ne bouge pas d'un pixel. */
    ctxAssemblage.surProgres = publier ? (part) => {
      publier(avancementDe({ phase: 'assemblage', part, fragments: cherches, fragmentsTotal: cherches }));
    } : null;
    /** Le passage à la phase de CLASSEMENT — annoncé après chaque assemblage,
     *  car un dernier recours en déroule un second et repasse par ici : le
     *  dernier rapport d'une recherche doit toujours être celui du classement. */
    const annoncerLeClassement = () => {
      if (publier) publier(avancementDe({ phase: 'classement', part: 0, fragments: cherches, fragmentsTotal: cherches }));
    };

    /**
     * ★ **DE L'ASSEMBLAGE BRUT À LA LISTE** — la queue du pipeline, en une
     * fonction parce qu'elle se joue DEUX fois quand la première passe rend une
     * liste maigre (voir le dernier recours, plus bas) : notation, refus des
     * suppressions en fin de chemin, tri, sélection, titres, liens.
     *
     * ⚠️ Elle ne partage rien entre deux appels : chaque assemblage rend ses
     *   propres approches, et tout ce qu'on écrit ici est écrit SUR elles.
     */
    const finaliser = (brutes) => {
      let liste = brutes;
      if (!liste.length) {
        const j = approcheJoker(saisie, ctxAssemblage); // garantie absolue (§5.3)
        if (j) liste = [j];
      }

      // ★ `elegance: false` débranche le BARÈME D'ÉLÉGANCE — le facteur sur le
      //   score et la sélection à trois objectifs — sans débrancher la mesure :
      //   `approche.bilan` et `approche.elegance` restent publiés. C'est ce qui
      //   permet au banc de mesurer l'avant et l'après d'une seule exécution
      //   (`.planning/banc/classement.mjs --avant`). Réservé à la mesure.
      const barèmeDElegance = options.elegance !== false;
      // ★ La pondération descend jusqu'à `noter` par le CONTEXTE, comme la cible et
      //   les zones signifiantes : c'est une propriété de la question posée, pas
      //   une propriété de l'approche. Au défaut elle se déclare non personnalisée
      //   et `noter` ne change pas une ligne de branche.
      const ctxScore = {
        saisie, signifiants, elegance: barèmeDElegance, cible: cbl, ponderation,
      };
      // ★ Une approche RETOUCHÉE se note sur le texte qu'elle lit réellement, pas
      //   sur celui qu'on a tapé. Ses portions, sa couverture et le barème
      //   d'élégance comptent tous en positions de caractères, et la retouche peut
      //   allonger ou raccourcir ce qu'elle touche : la noter sur la saisie
      //   d'origine décalerait le masque des zones signifiantes d'autant.
      //   Le calcul n'est fait QUE pour ces approches-là, et mémoïsé par texte :
      //   `zonesSignifiantes` refait un parse d'URL à chaque appel.
      const ctxRetouche = new Map();
      const contexteDe = (a) => {
        if (!a.saisieRetouchee || a.saisieRetouchee === saisie) return ctxScore;
        let c = ctxRetouche.get(a.saisieRetouchee);
        if (!c) {
          c = { ...ctxScore, saisie: a.saisieRetouchee, signifiants: zonesSignifiantes(a.saisieRetouchee) };
          ctxRetouche.set(a.saisieRetouchee, c);
        }
        return c;
      };
      for (const a of liste) { noter(a, contexteDe(a)); marquerLesCodes(a); }

      /* ★ **LE REFUS DES SUPPRESSIONS EN FIN DE CHEMIN** — voir
           `elegance.js › elagueALaFin` pour ce qu'on refuse et pourquoi la cible
           homogène en est exemptée.

         Le refus tombe ICI, après la notation et avant le tri : il lui faut le
         bilan, et il ne doit pas être un rang de plus dans le classement. Une
         approche qui produit treize chiffres et n'en montre que huit ne descend
         pas la liste — elle n'y est pas.

         ⚠️ **ET QUAND IL NE RESTE RIEN, IL NE RESTE RIEN.** Le joker est repêché
           s'il existe — c'est la garantie du §5.3, et c'est la voie assumée comme
           telle (§0.4). Mais il n'existe QUE pour 666 (`assemblage.js ›
           approcheJoker`), et le refus, lui, ne mord que hors de 666 : les deux
           ne se croisent presque jamais. Alors la liste reste VIDE, et la page le
           dit (`resultat.js › resultat.aucuneVoieCible`).
           Retomber ici sur les voies qu'on vient de refuser serait exactement la
           dégradation silencieuse que §2.2 interdit — mesuré sur
           `hope → 31031998`, où c'est précisément ce qui se produisait : quatre
           lettres, treize chiffres calculés, huit montrés, et l'approche
           « refusée » servie en tête comme si de rien n'était. */
      const cibleHomogene = regles.tolereLesSuppressions;
      const tenables = liste.filter((a) => !elagueALaFin(a.bilan, cibleHomogene));
      if (tenables.length !== liste.length) {
        const j = tenables.length ? null : approcheJoker(saisie, ctxAssemblage);
        if (j) { noter(j, contexteDe(j)); marquerLesCodes(j); tenables.push(j); }
        liste = tenables;
      }
      // ★ Le comparateur du mode personnalisé — au défaut, `ordrePondere` rend un
      //   ordre identique à `ordreTotal`, mais on prend `ordreTotal` lui-même pour
      //   qu'aucune indirection ne s'interpose sur le chemin par défaut.
      const ordreDeLaListe = ponderation.personnalisee ? ordrePondere(ponderation) : ordreTotal;
      liste.sort(ordreDeLaListe);

      // Le joker est affiché et assumé, en bas de liste (§0.4). Il n'est plus le
      // seul : le DÉCRET — un unique 6 recopié trois fois — porte désormais son
      // propre malus (`MALUS.decret`, ×0,40), si bien que le classement suffit à
      // le renvoyer en fond de liste sans qu'on ait à l'y pousser à la main. Ce
      // qui compte, et qui est vérifié plus bas, c'est qu'il ne passe JAMAIS
      // devant une approche qui produit réellement trois 6.
      const jokers = liste.filter((a) => a.mode === 'JOKER');
      const honnetes = liste.filter((a) => a.mode !== 'JOKER');
      // ★ Les places viennent du CRAN, plus d'une constante : c'est ce qui rend le
      //   curseur capable de montrer davantage, et pas seulement de chercher plus
      //   longtemps (`config.js › reglagesDeBudget`).
      const place = budgets.voies - (jokers.length ? 1 : 0);
      // ★ **EN MODE PERSONNALISÉ, LES DEUX RÉGIMES SONT DÉBRANCHÉS.**
      //
      //   `selectionner` réserve la 1ʳᵉ ligne au champion de l'ÉLÉGANCE et la 2ᵈ
      //   au champion des TRIPTYQUES, chacune jugée sur un crédit repondéré à elle
      //   (`score.js › POIDS_DES_REGIMES`). C'est la réponse du site à une
      //   question que l'auteur avait posée AVANT les curseurs : « ce n'est pas un
      //   tri unique ». Les curseurs sont l'autre réponse à la même question —
      //   celle où c'est le visiteur qui dit ce qu'il cherche.
      //
      //   Les faire cohabiter n'aurait pas de sens : trois lignes calculées avec
      //   trois pondérations différentes, dont deux que le visiteur n'a pas
      //   demandées, au-dessus de neuf qui obéissent à ses curseurs. Il pousserait
      //   « quantité » à fond et verrait toujours, en tête, la voie que le régime
      //   « élégance » a choisie. Dès qu'un curseur bouge, la liste entière est
      //   donc classée avec les MÊMES critères, et le MMR (§4.8) garnit les douze
      //   places par `ordreTotal` — c'est-à-dire par le barème que le visiteur
      //   vient de régler.
      const parLesRegimes = barèmeDElegance && !ponderation.personnalisee;
      const choisir = (candidates) => (parLesRegimes
        ? selectionner(candidates, place, budgets.parMappeur, budgets.lambda)
        : diversifier(candidates, {
          limite: place, maxParMappeur: budgets.parMappeur, lambda: budgets.lambda, ponderation,
        }));
      /* ★ **LA DOUBLE SÉLECTION — la rampe des retouches n'ôte rien.**
           > « Mieux vaut élargir le nombre de résultats pour en faire
           >   effectivement un invariant. » (l'auteur)
           La liste réunit la sélection faite avec les anciennes gardes (six
           mots, quatre vecteurs — exactement la liste d'avant la rampe) et celle
           faite avec la rampe. Mesuré sur la rampe simple : les retouchées de
           plus prenaient places et quota, et chassaient `fl+mtjc+mtri` (4 854)
           de « Donald Trump » visant 111 au cran 3. Sans rien au-delà des
           gardes — le cran 0 —, une seule sélection, celle d'avant.
           ⚠️ La sélection de la rampe passe AVANT celle des anciennes gardes :
           les deux posent leur suggestion et leur score ajusté sur les voies, et
           c'est la seconde qui doit avoir le dernier mot sur celles qu'elle
           garde. */
      const horsGardes = ctxAssemblage.horsGardesHistoriques;
      const historiques = horsGardes ? honnetes.filter((a) => !horsGardes.has(a)) : honnetes;
      const deLaRampe = historiques.length !== honnetes.length ? choisir(honnetes) : null;
      let retenues = choisir(historiques);
      if (jokers.length) retenues.push(jokers[0]);
      else if (!retenues.length) {
        const j = approcheJoker(saisie, ctxAssemblage);
        if (j) { noter(j, ctxScore); retenues.push(j); }
      }
      const compteDesAnciennesGardes = retenues.length;
      for (const a of retenues) auxAnciennesGardes.add(a);
      if (deLaRampe) {
        const enPlus = deLaRampe.filter((a) => !retenues.includes(a));
        if (enPlus.length) {
          const jokersRetenus = retenues.filter((a) => a.mode === 'JOKER');
          const union = retenues.filter((a) => a.mode !== 'JOKER').concat(enPlus);
          retenues = (parLesRegimes ? rangerParRegimes(union) : union.sort(ordreDeLaListe)).concat(jokersRetenus);
        }
      }
      comptesDesAnciennesGardes.set(retenues, compteDesAnciennesGardes);

      // Les titres sont posés en une passe sur la LISTE, pas approche par
      // approche : c'est la seule façon de garantir que deux lignes ne portent
      // pas le même nom (`titres.js → distinguerTitres`). La distinction se pose
      // sur l'approche, jamais sur la chaîne rendue, pour que `src/app/pont.js`
      // recompose exactement le même titre en changeant de langue.
      nommer(retenues);
      retenues.forEach((a, i) => {
        a.rang = i + 1;
        // ★ DEUX liens par voie, pas un — le panneau de la liste en offre deux
        //   boutons (« sobre » / « scénique »). Ce sont deux MISES EN SCÈNE de la
        //   même voie : mêmes codes, même verdict, même score, même rang. Le
        //   registre n'entre ni dans `descripteursDe`, ni dans la notation, ni
        //   dans la déduplication — il n'appartient pas au programme (`url.js`).
        //   ★ Et les RETOUCHES entrent dans le lien au même titre que les
        //   fragments : sans elles, le lien rejouerait le programme sur le texte
        //   TAPÉ, donc une autre démonstration que celle qu'on affiche (§4.3).
        //   ⚠️ Les descripteurs des fragments se comptent en jetons du texte
        //   RETOUCHÉ : c'est lui que les portées désignent (`index.js › rejouer`).
        const lu = a.saisieRetouchee || saisie;
        const descripteurs = descripteursDe(a, {
          nbJetons: lu === saisie ? jetons.length : tokeniser(lu).length,
        });
        const retouches = retouchesDe(a);
        // Ce qui fait le lien, gardé à part : une voie trouvée sur une RELECTURE
        // réécrit le sien vers le texte visé (`versLeTexte`), sans repasser par
        // une URL qu'il faudrait relire.
        // La LIAISON voyage avec le lien (`=mdl0!`), comme les retouches.
        const liaison = a.liaison ? a.liaison.code : undefined;
        a.lien = { fragments: descripteurs, retouches, liaison };
        //   ★ Et les CURSEURS et la FOUILLE, quand ils ne sont pas au défaut : le
        //   score que la voie rejouée affichera est celui de CETTE liste-ci, donc
        //   il dépend d'eux (`url.js`, en-tête). Au défaut, `ecrire()` n'écrit
        //   rien de plus et les liens sont ceux d'avant, au caractère près.
        const reglages = { curseurs: ponderation.curseurs, fouille };
        a.urlSobre = ecrire({ saisie, retouches, liaison, fragments: descripteurs, registre: 'sobre', cible: cbl, ...reglages });
        a.urlScenique = ecrire({ saisie, retouches, liaison, fragments: descripteurs, registre: 'scenique', cible: cbl, ...reglages });
        // `url` reste le lien de référence de la voie — la version scénique,
        // celle que le site montre par défaut (voir `url.js`, le registre).
        a.url = a.urlScenique;
        a.joker = a.mode === 'JOKER';
      });
      return retenues;
    };

    /* ★ **LE DERNIER RECOURS — et il se déclenche sur une liste MAIGRE.**

       > « Si des solutions courtes et élégantes sont trouvées, pas besoin de
       >   chercher les options longues et bancales, mais si rien n'est trouvé,
       >   approfondir avec le budget temps disponible est pertinent. »
       >   « En dessous de 5, creuse. » (l'auteur)

       L'assemblage redéroule alors sa forme fermée en s'autorisant un geste de
       plus — ranger ou gonfler la ligne AVANT de la dissoudre
       (`assemblage.js › vecteursDeSix`, la seconde passe). Il ne relance AUCUNE
       recherche de fragment : les chemins du faisceau sont déjà là, et c'est le
       budget de travail déjà dépensé qui décide de ce qu'ils contiennent.

       ★ **LE COMPTE EST CELUI DES VOIES RETENUES, pas des approches
         assemblées**, et ça n'est pas un détail : sur `q` visant 666,
         l'assemblage rend de quoi ne pas creuser alors que la liste affichée
         compte DEUX lignes. C'est la liste que le visiteur a sous les yeux qui
         décide, donc on finalise, on compte, et on recommence s'il le faut.

       ⚠️ **ET ON NE GARDE LA PASSE PROFONDE QUE SI ELLE APPORTE.** Elle ne peut
         qu'ajouter — un fragment qui sait déjà écrire la cible ne creuse pas —,
         mais l'égalité arrive (rien de plus à trouver), et reprendre la liste
         profonde changerait alors l'ordre pour rien. */
    /**
     * ★ La liste de ce cran, augmentée des voies du cran inférieur qu'elle n'a
     * pas — reprises en COPIES (une réponse déjà rendue ne bouge pas), leur
     * lien réécrit au cran courant. Un même programme n'y est qu'une fois : la
     * voie de ce cran est gardée. La tête est recalculée sur l'union, le reste
     * rangé par l'ordre de la liste, puis les titres posés sur l'ensemble.
     */
    const unirAuCranInferieur = (duCran) => {
      const cleDe = (a) => ecrire({
        saisie, cible: cbl, registre: 'scenique',
        retouches: a.lien.retouches, liaison: a.lien.liaison, fragments: a.lien.fragments,
      });
      const vus = new Set(duCran.map(cleDe));
      const reprises = copierEtat(precedent).retenues.filter((a) => !vus.has(cleDe(a)));
      if (!reprises.length) return duCran;
      const reglages = { curseurs: ponderation.curseurs, fouille };
      for (const a of reprises) {
        const commun = {
          saisie, cible: cbl, retouches: a.lien.retouches, liaison: a.lien.liaison,
          fragments: a.lien.fragments, ...reglages,
        };
        a.urlSobre = ecrire({ ...commun, registre: 'sobre' });
        a.urlScenique = ecrire({ ...commun, registre: 'scenique' });
        a.url = a.urlScenique;
      }
      const union = duCran.concat(reprises);
      const jokers = union.filter((a) => a.mode === 'JOKER');
      const honnetes = union.filter((a) => a.mode !== 'JOKER');
      const rangees = (options.elegance !== false && !ponderation.personnalisee)
        ? rangerParRegimes(honnetes)
        : honnetes.sort(ponderation.personnalisee ? ordrePondere(ponderation) : ordreTotal);
      if (jokers.length) rangees.push(jokers[0]);
      nommer(rangees);
      rangees.forEach((a, i) => { a.rang = i + 1; });
      return rangees;
    };

    const brutes = assembler(saisie, frags, parFrag, ctxAssemblage);
    annoncerLeClassement();
    let retenues = finaliser(brutes);
    // ★ La décision de creuser se fonde sur la sélection des ANCIENNES gardes
    //   (`finaliser`, la double sélection) : c'est elle que la liste d'avant la
    //   rampe comptait, et la rampe ne doit pas changer quelle passe est gardée.
    const compter = (liste) => comptesDesAnciennesGardes.get(liste) ?? liste.length;
    // ★ Le cran de fouille passe outre le plancher : voir `FOUILLE_QUI_CREUSE_TOUJOURS`.
    const creuserQuoiQuIlArrive = fouille >= FOUILLE_QUI_CREUSE_TOUJOURS;
    if ((compter(retenues) < voiesAvantDeCreuser || creuserQuoiQuIlArrive)
      && !ctxAssemblage.profond && optionsResolution.dernierRecours !== false && !rapide) {
      const creusees = assembler(saisie, frags, parFrag, { ...ctxAssemblage, profond: true });
      annoncerLeClassement();
      const profondes = finaliser(creusees);
      if (compter(profondes) > compter(retenues)) retenues = profondes;
    }
    // ★ L'UNION AVEC LE CRAN INFÉRIEUR — après la sélection de ce cran, qui ne
    //   l'a pas vue (`deroulerResolution`).
    if (precedent) retenues = unirAuCranInferieur(retenues);

    const listeFragments = [];
    for (const f of frags) {
      // Mêmes chemins canoniques que ceux de l'assemblage : sans quoi la liste
      // des fragments proposerait des URL passant par des étapes décoratives
      // que la liste des approches, elle, a retirées.
      const bruts = parFrag.get(f.texte.normalize('NFC'));
      if (!bruts || !bruts.length) continue;
      const chemins = normaliserChemins(bruts);
      if (!chemins.length) continue;
      listeFragments.push({
        texte: f.texte,
        offset: f.offset,
        longueur: f.longueur,
        famille: f.famille,
        nbChemins: chemins.length,
        // ★ Le chiffre RÉELLEMENT atteint par le chemin proposé. Tant que la
        //   cible valait 666, il valait 6 et la liste l'écrivait en dur ; sur
        //   `007`, un fragment vaut 0 et le suivant 7, et afficher « 007 » dans
        //   les deux pastilles serait exactement le genre d'à-peu-près que ce
        //   projet refuse. Il est lu sur l'état final du chemin, pas déduit de
        //   la cible : ce qui est montré est ce qui a été calculé.
        valeur: valeurFinaleDe(chemins[0]),
        url: ecrire({
          saisie,
          cible: cbl,
          curseurs: ponderation.curseurs,
          fouille,
          fragments: [{
            portee: f.tokenDebut >= 0 && f.tokenLong > 0
              ? { offset: f.tokenDebut, longueur: f.tokenLong } : null,
            resonance: null,
            codes: chemins[0].ops.map((o) => o.code),
          }],
        }),
      });
      if (listeFragments.length >= REGLAGES.MAX_FRAGMENTS) break;
    }

    // ── Marquage de la troncature. Deux natures bien distinctes :
    //  · `tronque` seul — la borne DÉTERMINISTE a mordu. Le résultat est
    //    partiel mais reproductible à l'identique partout : rien à signaler.
    //  · `tronqueTemps` — le filet de sécurité s'est déclenché. Là, et là
    //    seulement, la liste dépend de la charge de la machine : on le DIT,
    //    plutôt que de laisser un rang varier en silence (§4.3).
    const avertissement = tronqueTemps ? BANDEAUX.rechercheTronquee : undefined;
    const resultat = {
      saisie,
      cible: cbl,
      dedie,
      vide: false,
      approches: retenues,
      fragments: listeFragments,
      // ★ LE LIEN DE LA LISTE porte les curseurs et la fouille : c'est lui qu'on
      //   partage quand on a réglé quelque chose, et sans eux il rendrait la
      //   liste du site plutôt que celle qu'on a sous les yeux.
      urlResultats: ecrire({ saisie, cible: cbl, curseurs: ponderation.curseurs, fouille }),
      // Ce que le panneau de réglages doit relire pour se redessiner : les
      // positions telles qu'elles ont été comprises (bornées), les pourcentages
      // affichés, les six poids qui en découlent, et le cran de fouille.
      ...reglagesRendus,
      /* ★ **CE QUI S'EST RETIRÉ DEVANT CETTE CIBLE, ET POURQUOI** — dix
           opérateurs lisent la cible et ont le droit de se retirer ; ils
           n'ont pas le droit de le faire sans le dire (`bfs.js ›
           operateursRetires`). Sur la cible sous-jacente d'un mot relu par
           les rangs, ce sont DIX absences d'un coup. */
      operateursRetires: operateursRetires(catalogue, cbl),
      /* ★ Les modes hors jeu par construction — dédoublonnés, parce qu'un
           dernier recours rejoue l'assemblage et le redirait. */
      modesImpossibles: [...new Map(ctxAssemblage.modesImpossibles.map((m) => [m.mode, m])).values()],
      tronque: tronqueTravail || tronqueTemps,
      tronqueTemps,
      ...(avertissement ? { avertissement } : {}),
    };
    etatsDesResultats.set(resultat, { retenues });
    return resultat;
  }

  /**
   * ★ **VISER UN TEXTE — chercher chacune de ses relectures, puis fusionner.**
   *
   * Un texte ne se cherche pas : le moteur écrit des chiffres. Chaque relecture
   * du catalogue (`conversions.js`) en fait une cible chiffrée sous-jacente, et
   * c'est `deroulerResolution` — le pipeline chiffré, INCHANGÉ — qui la
   * cherche. Ce qui est propre au texte tient ici, en trois gestes :
   *
   *   1. une recherche par relecture, poussée par le MÊME générateur : ses
   *      points d'arrêt remontent tels quels, la jauge remise à l'échelle de
   *      leur nombre (la k-ième couvre la k-ième tranche, et ne recule pas) ;
   *   2. chaque voie trouvée devient une voie vers le TEXTE (`versLeTexte`) :
   *      sa relecture est nommée, son lien réécrit, son score payé de l'écart
   *      de forme (`cible.js › ECARTS`) ;
   *   3. une seule liste, classée par l'ordre du site et coupée à ses places.
   *
   * ⚠️ **Ce qui est perdu à la fusion, et dit.** Les deux lignes réservées —
   *   champions de l'élégance et des triptyques (`selectionner`) — sont
   *   choisies DANS chaque relecture ; la liste fusionnée est ensuite classée
   *   par l'ordre total, qui ne les connaît pas. Sur un texte, elles peuvent
   *   donc descendre. Une fusion qui garderait la réservation reste à écrire.
   * ⚠️ **Le temps** : une recherche par relecture, trois aujourd'hui. Deux
   *   relectures qui visent la même suite (GHOST en AZERTY et en QWERTY ont les
   *   mêmes coordonnées) se servent du cache de fragments sans rien refaire.
   * ★ La liste des FRAGMENTS n'est pas rendue : ses pastilles disent le chiffre
   *   qu'un morceau vaut, et un chiffre de la cible sous-jacente n'est pas un
   *   signe du texte. La montrer mentirait sur ce qu'on cherche.
   */
  function* deroulerTexte(saisieBrute, mot, optionsResolution) {
    const ponderation = ponderer(optionsResolution.curseurs ?? options.curseurs);
    const fouille = normaliserPuissance(optionsResolution.fouille ?? options.fouille);
    const saisie = String(saisieBrute ?? '').normalize('NFC');
    const relectures = relecturesPour(mot, ops);
    const base = {
      saisie,
      cible: mot,
      dedie: null,
      vide: !saisie.length,
      fragments: [],
      urlResultats: ecrire({ saisie, cible: mot, curseurs: ponderation.curseurs, fouille }),
      curseurs: ponderation.curseurs,
      pourcentages: ponderation.pourcentages,
      poids: ponderation.poids,
      fouille,
      // ★ LE DIAGNOSTIC — les relectures TENTÉES, la suite chiffrée que chacune
      //   a donnée à la recherche, et combien de voies celle-ci y a trouvées
      //   (`voies`, rempli plus bas). C'est ce qui dit, quand la liste est
      //   vide, si c'est la recherche qui a échoué — et sur quelle suite — ou
      //   le texte qui ne se laisse relire par aucune.
      relectures: relectures.map((r) => ({
        code: r.code, cible: r.cible.texte, nature: r.cible.nature, longueur: r.cible.longueur,
        produit: r.produit, ecart: r.ecart, voies: null,
        // ★ Ce qui se retire devant CETTE cible sous-jacente : sur une suite de
        //   valeurs (les rangs), toute la famille des absorptions s'en va.
        operateursRetires: operateursRetires(catalogue, r.cible),
      })),
    };
    if (!saisie.length) return { ...base, approches: [] };
    if (!relectures.length) {
      // Les signes qu'aucune relecture ne sait écrire — ce qui bloque, nommé.
      return {
        ...base, approches: [], avertissement: BANDEAUX.aucuneRelecture,
        signesSansRelecture: signesSansRelecture(mot, ops),
      };
    }

    const canal = typeof optionsResolution.surAvancement === 'function'
      ? optionsResolution.surAvancement : null;
    const n = relectures.length;
    let tronque = false;
    let tronqueTemps = false;
    let avertissement;
    /* ⚠️ **LA JAUGE NE RECULE PAS, MÊME À DEUX BALAYAGES.** Le second reprend
         les relectures à zéro ; publier sa fraction brute ferait retomber la
         barre de 100 % à 20 %. On borne donc par le plus haut déjà annoncé, ici
         comme `deroulerResolution` le fait pour ses propres rapports. */
    /* ★ **LA RAMPE — combien de segments ce cran s'autorise.**
         « Le cran 0 a peu de chances de trouver l'approche précise et se
         contente de l'approximation » (l'auteur). Un segment, c'est une
         recherche : au cran 0, deux au plus — le téléphone approche « C'est de
         la merde ! » en deux ; la table ASCII, qui l'écrit exactement, en
         demande quatre, et n'est cherchée qu'à partir du cran 2. Plus le curseur
         monte, plus la recherche s'élargit. */
    const segmentsAutorises = SEGMENTS_AU_CRAN_0 + fouille;
    const jetonsDeLaSaisie = tokeniser(saisie);
    const ctxNote = {
      saisie, signifiants: zonesSignifiantes(saisie), ponderation,
    };
    /** Une voie d'un segment se compose si elle l'écrit d'un seul vecteur, sans rien d'autre. */
    const estUnSegment = (a) => a.parts.length === 1 && a.mode === 'GROUPEMENT' && (a.series || 1) === 1
      && !a.liaison && !(a.retouches && a.retouches.length);
    const porteeDe = (a) => a.parts[0].fragment.intervalles.map((iv) => iv.join('.')).join('|');
    /**
     * ★ **COMPOSER UNE PHRASE — SANS JAMAIS RECOPIER LA SAISIE.**
     *
     * > « Évite de recopier la saisie ; les opérateurs carré, factorielle &
     * >   compagnie sont là pour produire la matière quand nécessaire. Dupliquer
     * >   l'original est très maladroit et à éviter (voire interdire). »
     * >   (l'autrice)
     *
     * Chaque segment prend SA portion de la saisie : des portées deux à deux
     * disjointes, dans l'ordre du texte (`assemblage.js › segmentsSansCopie`).
     * La première version composait sur la MÊME portée relue une fois par
     * segment, et la scène recopiait la saisie : c'est désormais refusé. Le
     * surplus de matière vient des opérateurs gonflants, que la passe profonde
     * autorise (`vecteursDeSix`).
     *
     * Pour chaque segment on garde la meilleure voie de chaque portée ; on
     * énumère ensuite les suites de portées croissantes et disjointes, dans
     * l'ordre lexicographique des portées — aucun tri sur une note, donc rien
     * d'entropique (§4.4) —, bornées à `COMPOSITIONS_MAX`.
     */
    function composer(rel, segs, voiesParSegment) {
      const meilleures = voiesParSegment.map((voies) => {
        const m = new Map();
        for (const a of voies) if (estUnSegment(a) && !m.has(porteeDe(a))) m.set(porteeDe(a), a);
        return [...m.values()].sort((x, y) => x.parts[0].fragment.offset - y.parts[0].fragment.offset
          || x.parts[0].fragment.longueur - y.parts[0].fragment.longueur);
      });
      const suites = [];
      const pile = [];
      const descendre = (k, fin) => {
        if (suites.length >= COMPOSITIONS_MAX) return;
        if (k === segs.length) { suites.push(pile.slice()); return; }
        for (const a of meilleures[k]) {
          if (a.parts[0].fragment.offset < fin) continue;
          pile.push(a.parts[0]);
          if (segmentsSansCopie(pile)) descendre(k + 1, a.parts[0].fragment.offset + a.parts[0].fragment.longueur);
          pile.pop();
        }
      };
      descendre(0, 0);
      const out = [];
      for (const parts of suites) {
        const approche = {
          parts,
          ...deduireMode(parts, { saisie, jetons: jetonsDeLaSaisie, cible: rel.cible, segments: segs }),
        };
        approche.segments = segs;
        approche.retouches = [];
        approche.saisie = saisie;
        noter(approche, { ...ctxNote, cible: rel.cible });
        marquerLesCodes(approche);
        approche.lien = {
          fragments: descripteursDe(approche, { nbJetons: jetonsDeLaSaisie.length }), retouches: [],
        };
        out.push(approche);
      }
      return out;
    }
    /**
     * ★ **LA DOUBLE COMPOSITION — la rampe des retouches n'ôte rien à une
     * phrase non plus.** Chaque segment rend une liste doublement sélectionnée
     * (`finaliser`) ; composer sur elle seule changerait « la meilleure voie par
     * portée » dès qu'une voie de la rampe passe devant, et une phrase que les
     * anciennes gardes composaient pourrait ne plus l'être. On compose donc sur
     * les voies des anciennes gardes — exactement la composition d'avant la
     * rampe —, puis sur toutes, et on réunit. Sans voie de la rampe dans aucun
     * segment, une seule composition, celle d'avant.
     */
    function composerDeuxFois(rel, segs, voiesParSegment) {
      const anciennes = composer(rel, segs,
        voiesParSegment.map((voies) => voies.filter((a) => auxAnciennesGardes.has(a))));
      for (const a of anciennes) auxAnciennesGardes.add(a);
      if (voiesParSegment.every((voies) => voies.every((a) => auxAnciennesGardes.has(a)))) return anciennes;
      const cle = (a) => JSON.stringify(a.lien.fragments);
      const vus = new Set(anciennes.map(cle));
      return anciennes.concat(composer(rel, segs, voiesParSegment).filter((a) => !vus.has(cle(a))));
    }
    let plusHaut = 0;
    const echelleDe = (k) => (a) => {
      const brute = (k + Math.min(1, Math.max(0, (a && a.fraction) || 0))) / n;
      plusHaut = Math.max(plusHaut, brute);
      return { ...a, fraction: plusHaut };
    };
    /**
     * Un balayage : une recherche par relecture, fusionnées. `profond` dit si
     * l'assemblage s'autorise le geste de plus (`assemblage.js ›
     * vecteursDeSix`, la seconde passe).
     */
    function* balayer(profond) {
      const trouvees = [];
      for (let k = 0; k < n; k++) {
        const rel = relectures[k];
        const echelle = echelleDe(k);
        const segs = segmentsDe(rel);
        if (segs) {
          base.relectures[k].segments = segs.map((sg) => sg.texte);
          // ★ Hors de ce cran, les SEGMENTS se taisent — dit, pas tu. Le BLOC, lui,
          //   reste tenté en passe profonde : c'est une seule recherche, et c'est
          //   par lui que l'exacte ASCII arrive (voir plus bas).
          const segmentsHorsDuCran = segs.length > segmentsAutorises;
          if (segmentsHorsDuCran) {
            base.relectures[k].horsDuCran = true;
            base.relectures[k].voies = 0;
          }
          const voiesParSegment = [];
          for (let sIdx = 0; !segmentsHorsDuCran && sIdx < segs.length; sIdx++) {
            const echelleSeg = (a) => echelle({
              ...a, fraction: (sIdx + Math.min(1, Math.max(0, (a && a.fraction) || 0))) / segs.length,
            });
            const sousSeg = deroulerUnCran(saisieBrute, {
              ...optionsResolution,
              [PRECEDENT]: null,
              cible: segs[sIdx].cible,
              profond,
              dernierRecours: false,
              surAvancement: canal ? (a) => canal(echelleSeg(a)) : undefined,
            });
            let pasSeg = sousSeg.next();
            while (!pasSeg.done) {
              const pause = yield echelleSeg(pasSeg.value);
              pasSeg = sousSeg.next(pause);
            }
            const rs = pasSeg.value;
            if (rs.tronque) tronque = true;
            if (rs.tronqueTemps) tronqueTemps = true;
            voiesParSegment.push(rs.approches || []);
          }
          const composees = segmentsHorsDuCran ? [] : composerDeuxFois(rel, segs, voiesParSegment);
          base.relectures[k].voies = composees.length;
          for (const a of composees) {
            versLeTexte(a, rel, saisie, ponderation.curseurs, fouille);
            trouvees.push(a);
          }
          /* ★ **LE BLOC GONFLÉ — la phrase d'un seul tenant, en passe profonde.**
               « Rassemble tous les morceaux avant de faire gonfler l'ensemble »
               (l'autrice) : toute la saisie, ponctuation comprise, en une ligne
               (`mast`), gonflée, absorbée, relue par UNE relecture. Tenté en
               passe profonde seulement : sans gonflant, un bloc de plus de 26
               chiffres n'a jamais rendu de voie (mesuré aux crans 0, 3 et 5). */
          if (profond) {
            const echelleBloc = (a) => echelle({ ...a, fraction: Math.min(1, Math.max(0, (a && a.fraction) || 0)) });
            const sousBloc = deroulerUnCran(saisieBrute, {
              ...optionsResolution,
              [PRECEDENT]: null,
              cible: rel.cible,
              profond: true,
              matiereDePhrase: true,
              dernierRecours: false,
              surAvancement: canal ? (a) => canal(echelleBloc(a)) : undefined,
            });
            let pasBloc = sousBloc.next();
            while (!pasBloc.done) {
              const pause = yield echelleBloc(pasBloc.value);
              pasBloc = sousBloc.next(pause);
            }
            const rb = pasBloc.value;
            if (rb.tronque) tronque = true;
            if (rb.tronqueTemps) tronqueTemps = true;
            const blocs = (rb.approches || []).filter((a) => a.mode !== 'JOKER');
            base.relectures[k].voiesDuBloc = blocs.length;
            for (const a of blocs) {
              versLeTexte(a, rel, saisie, ponderation.curseurs, fouille);
              trouvees.push(a);
            }
          }
          continue;
        }
        const sous = deroulerUnCran(saisieBrute, {
          ...optionsResolution,
          [PRECEDENT]: null,
          cible: rel.cible,
          profond,
          // ★ Le dernier recours se décide sur le TEXTE, pas sur une relecture :
          //   une recherche qui n'a rien trouvé sur le carré de Polybe n'a pas à
          //   creuser si le multi-tap, lui, a des voies. C'est ici qu'on le sait.
          dernierRecours: false,
          surAvancement: canal ? (a) => canal(echelle(a)) : undefined,
        });
        let pas = sous.next();
        while (!pas.done) {
          const pause = yield echelle(pas.value);
          pas = sous.next(pause);
        }
        const r = pas.value;
        base.relectures[k].voies = (r.approches || []).length;
        if (r.tronque) tronque = true;
        if (r.tronqueTemps) tronqueTemps = true;
        if (r.avertissement) avertissement = r.avertissement;
        for (const a of r.approches || []) {
          // Le joker est une propriété du français et du 6 (§0.4) : il ne relit
          // rien, et n'a rien à faire sous l'annonce d'un texte.
          if (a.mode === 'JOKER') continue;
          versLeTexte(a, rel, saisie, ponderation.curseurs, fouille);
          trouvees.push(a);
        }
      }
      return trouvees;
    }
    let approches = yield* balayer(false);
    /* ★ **LE DERNIER RECOURS D'UN TEXTE — quand AUCUNE relecture n'a rien
         rendu.** « Si des solutions courtes et élégantes sont trouvées, pas
         besoin de chercher les options longues et bancales, mais si rien n'est
         trouvé, approfondir avec le budget temps disponible est pertinent »
         (l'auteur). Un mot qui a ses voies ne paie donc rien ; un mot qui n'en a
         aucune refait le tour de ses relectures en s'autorisant, cette fois, de
         ranger ou de gonfler la ligne avant de la dissoudre. */
    /* ★ **UNE APPROXIMATION NE SUFFIT PAS À S'ARRÊTER.** « Tant qu'aucune voie
         exacte n'existe, on creuse » : seules les voies qui écrivent la
         ponctuation comptent pour le plancher. Mesuré sur « C'est » : vingt
         approchées rendaient le seuil muet, et la table ASCII n'y livrait
         qu'une voie au lieu de six. */
    // ★ Comptées sur les voies des ANCIENNES gardes : la rampe ne décide pas de creuser.
    const exactes = approches.filter((a) => auxAnciennesGardes.has(a) && !ometLaPonctuation(a)).length;
    // ★ Le cran rapide (−1) ne creuse jamais : c'est tout ce qui le distingue d'un texte au cran 0.
    if (optionsResolution[RAPIDE] !== true
      && (exactes < voiesAvantDeCreuser || fouille >= FOUILLE_QUI_CREUSE_TOUJOURS)) {
      approches = yield* balayer(true);
    }
    const ordreDeLaListe = ponderation.personnalisee ? ordrePondere(ponderation) : ordreTotal;
    const exactitude = ordreDExactitude(ponderation.curseurs);
    // ★ La règle d'ordre passe AVANT tout le reste — voir `score.js › ordreDExactitude`.
    const ordreDuTexte = (a, b) => exactitude(a, b) || ordreDeLaListe(a, b);
    approches.sort(ordreDuTexte);
    /* ★ **LA DOUBLE COUPE** (`finaliser`, la double sélection) : les places
         prises parmi les voies des anciennes gardes — la liste d'avant la
         rampe —, réunies à celles prises parmi toutes. */
    const placesDuTexte = reglagesDeBudget(fouille).voies;
    let retenues = approches.filter((a) => auxAnciennesGardes.has(a)).slice(0, placesDuTexte);
    const deLaRampe = approches.slice(0, placesDuTexte).filter((a) => !retenues.includes(a));
    if (deLaRampe.length) retenues = retenues.concat(deLaRampe).sort(ordreDuTexte);
    /* ★ **L'UNION AVEC LE CRAN INFÉRIEUR, POUR UN TEXTE AUSSI**
         (`deroulerResolution`) : la liste de ce cran, telle qu'il la coupe seul,
         plus les voies du cran inférieur qu'elle n'a pas — segments compris,
         puisque c'est la voie composée qui est reprise. Leurs liens sont
         réécrits au cran courant. */
    const precedent = optionsResolution[PRECEDENT] || null;
    if (precedent) {
      const cleDuTexte = (a) => ecrire({
        saisie, cible: mot, relecture: a.relecture.code, registre: 'scenique',
        fragments: (a.lien || {}).fragments, retouches: (a.lien || {}).retouches, liaison: (a.lien || {}).liaison,
      });
      const vus = new Set(retenues.map(cleDuTexte));
      const reprises = copierEtat(precedent).retenues.filter((a) => !vus.has(cleDuTexte(a)));
      for (const a of reprises) {
        const rel = relectures.find((r) => r.code === a.relecture.code);
        if (!rel) throw new Error(`recherche cumulative : la relecture ${a.relecture.code} a disparu d'un cran à l'autre`);
        relierAuTexte(a, rel, saisie, ponderation.curseurs, fouille);
      }
      if (reprises.length) retenues = retenues.concat(reprises).sort(ordreDuTexte);
    }
    nommer(retenues);
    retenues.forEach((a, i) => { a.rang = i + 1; });
    const resultat = {
      ...base,
      approches: retenues,
      tronque,
      tronqueTemps,
      ...(avertissement ? { avertissement } : {}),
    };
    etatsDesResultats.set(resultat, { retenues });
    return resultat;
  }

  /**
   * Une voie trouvée sur une relecture devient une voie vers le TEXTE : on
   * nomme sa relecture, on paie son écart de forme, on réécrit ses liens — le
   * texte derrière le troisième `#`, la relecture en marqueur (`url.js`).
   */
  function versLeTexte(a, rel, saisie, curseurs, fouille) {
    a.relecture = Object.freeze({ code: rel.code, mot: rel.mot.texte });
    // ★ L'écart se repaie AUX CURSEURS : la ponctuation omise en dépend
    //   (`score.js › facteurPonctuation`).
    const facteur = facteurDEcartAuxCurseurs(rel.ecart, curseurs);
    a.ecartDeForme = Object.freeze({ ...rel.ecart, facteur });
    a.produit = rel.produit;
    // L'écart se PAIE, entier sur entier : aucun flottant ne décide d'un rang.
    a.score = Math.round((a.score * facteur) / 1000);
    relierAuTexte(a, rel, saisie, curseurs, fouille);
  }

  /** Les liens d'une voie vers le texte, au cran et aux curseurs donnés. */
  function relierAuTexte(a, rel, saisie, curseurs, fouille) {
    const lien = a.lien || {};
    const commun = {
      saisie, fragments: lien.fragments, retouches: lien.retouches, liaison: lien.liaison,
      cible: rel.mot, relecture: rel.code, curseurs, fouille,
    };
    a.urlSobre = ecrire({ ...commun, registre: 'sobre' });
    a.urlScenique = ecrire({ ...commun, registre: 'scenique' });
    a.url = a.urlScenique;
  }

  /**
   * ★ LA VERSION SYNCHRONE, ET ELLE LE RESTE (CONTRACTS §5).
   *
   * Des centaines de tests et le banc de mesure appellent `moteur.resoudre(x)`
   * et lisent le résultat sur la ligne suivante. Le dérouleur est donc poussé
   * d'un trait, sans jamais rendre la main : `next(0)` annonce une pause nulle,
   * le filet temporel ne bouge pas, et l'ensemble exploré est exactement celui
   * d'avant. Le générateur ne coûte ici que ses reprises — une par fragment,
   * quelques microsecondes en tout.
   */
  function resoudre(saisieBrute, optionsResolution = {}) {
    const derouleur = deroulerResolution(saisieBrute, optionsResolution);
    let pas = derouleur.next();
    while (!pas.done) pas = derouleur.next(0);
    return pas.value;
  }

  /**
   * ★ `enumerer` — LA MÊME RECHERCHE, NOMMÉE PAR CE QU'ELLE SERT.
   *
   * L'écran d'accueil demande UNE démonstration ; l'écran de liste demande
   * DOUZE voies, et c'est le seul des deux qui porte les quatre curseurs et la
   * réglette de fouille. Les deux passent par le même pipeline — il n'y a qu'une
   * recherche, et la première voie est simplement la tête de la liste.
   *
   * ⚠️ **Ce n'est donc pas un second pipeline, et il ne faut pas en faire un.**
   * Ce que cette fonction ajoute est un NOM et un contrat écrit : « voici l'appel
   * qui accepte les réglages de l'écran de liste ». Un appelant qui lit
   * `moteur.enumerer(saisie, { curseurs, fouille })` sait où passent les
   * curseurs ; le même appelant devant `resoudre` devait le deviner ou le
   * chercher. Le prix est de quatre lignes, et le gain est qu'on ne branche pas
   * les curseurs sur `resoudre` au petit bonheur depuis trois écrans différents.
   *
   * @param {string} saisieBrute
   * @param {{cible?:*, curseurs?:Object, fouille?:number}} [optionsListe]
   * @returns {Object} le résultat de `resoudre`, réglages compris
   *   (`curseurs`, `pourcentages`, `poids`, `fouille`, `urlResultats`).
   */
  function enumerer(saisieBrute, optionsListe = {}) {
    return resoudre(saisieBrute, optionsListe);
  }

  /** Le pendant progressif d'`enumerer` — même contrat, mais qui rend la main. */
  function enumererProgressif(saisieBrute, optionsListe = {}) {
    return resoudreProgressif(saisieBrute, optionsListe);
  }

  /**
   * ★ LA VERSION QUI SE VOIT — même pipeline, mais qui rend la main.
   *
   * @param {string} saisieBrute
   * @param {Object} [optionsResolution]  celles de `resoudre`, plus :
   *   `surAvancement(avancement)`, `annule()`, `trancheMs`.
   * @returns {Promise<Object|null>}  `null` si `annule()` a dit oui.
   */
  function resoudreProgressif(saisieBrute, optionsResolution = {}) {
    return deroulerParTranches(
      deroulerResolution(saisieBrute, optionsResolution),
      { maintenant, ...optionsResolution },
    );
  }

  /**
   * Rejoue une URL canonique SANS relancer la recherche (§4.3).
   * @returns {{ok:boolean, approche?:Object, bandeau?:string, raison?:string}}
   */
  function rejouer(lecture) {
    if (!lecture || lecture.forme !== 'canonique') {
      return { ok: false, raison: 'forme non canonique', bandeau: lecture && lecture.bandeau };
    }
    const saisie = lecture.saisie;
    // La cible vient du LIEN, et de nulle part ailleurs — comme le registre.
    // Un lien sans marqueur vise 666, c'est `url.js` qui le résout.
    let cbl = normaliserCible(lecture.cible);
    // ★ UN TEXTE SE REJOUE PAR SA RELECTURE, celle que le lien nomme
    //   (`mcaz!`) — le rang dans l'alphabet s'il n'en nomme aucune. Tout le
    //   reste du rejeu se fait sur la cible chiffrée SOUS-JACENTE, exactement
    //   comme la recherche l'a trouvée ; seul le lien et le verdict revoient le
    //   texte.
    let rel = null;
    if (cbl.nature === 'mot') {
      const code = lecture.relecture || RELECTURE_PAR_DEFAUT;
      const op = opParCode.get(code);
      if (!op || !op.relecture) {
        return { ok: false, raison: `relecture inconnue : ${code}`, bandeau: BANDEAUX.codeInconnu };
      }
      // ★ L'exacte, sinon l'approchée (ponctuation omise) — le même choix que la liste.
      rel = relectureDuLien(cbl, op);
      if (!rel) return { ok: false, raison: 'relecture impossible', bandeau: BANDEAUX.relectureImpossible };
      cbl = rel.cible;
    } else if (lecture.relecture) {
      return { ok: false, raison: 'relecture sans texte', bandeau: BANDEAUX.relectureSansTexte };
    }
    // ★ LA LIAISON que le lien nomme (`=mdl0!`) : un opérateur du catalogue qui
    //   DÉCLARE réunir deux résultats (`op.liaison`), et aucun autre.
    let lia = null;
    if (lecture.liaison) {
      lia = opParCode.get(lecture.liaison) || null;
      if (!lia || !lia.liaison) {
        return { ok: false, raison: `liaison inconnue : ${lecture.liaison}`, bandeau: BANDEAUX.codeInconnu };
      }
    }
    // ★ **LA TABLE DES CODES SUIT LA CIBLE DU LIEN**, et il le faut absolument.
    //
    //   Un code ne dit pas TOUT ce qu'un opérateur fait : six d'entre eux lisent
    //   la cible (`moteur/transformations/commun.js › selonLaCible`), et `m36`
    //   sur `c111!` cherche trois 1 là où le même code sur `666` cherche trois
    //   6. Résoudre le code sur le catalogue nu rejouerait donc la version
    //   visant 666 sous un lien qui vise autre chose — c'est-à-dire une AUTRE
    //   démonstration que celle dont le lien est issu, ce que §4.3 interdit.
    //
    //   La cible est dans l'URL (`c111!`), donc la résolution est reproductible :
    //   même lien, même cible, même opérateur, même scène. Sur un lien sans
    //   marqueur — la cible vaut 666 —, `viser` rend l'opérateur du catalogue
    //   lui-même (identité garantie, `catalogue.js › verifier`) : rien ne change.
    //
    //   ⚠️ On part de `ops`, le catalogue ENTIER, et non des explorables : un
    //   lien peut porter le joker (`jnf`) ou un code déprécié, et rejouer un
    //   lien déjà partagé passe avant l'exploration (§4.3). Un opérateur que sa
    //   propre règle désactive pour cette cible ne rentre pas dans la table, et
    //   `executerProgramme` refuse alors le programme — bruyamment, plutôt que
    //   de jouer une règle qui n'a pas de sens.
    const tableDesCodes = (visee) => {
      const table = new Map();
      for (const o of ops) {
        const vise = typeof o.viser === 'function' ? o.viser(visee.texte) : o;
        if (vise) table.set(o.code, vise);
      }
      return table;
    };
    const parCode = tableDesCodes(cbl);
    // ★ **UNE PHRASE EN SEGMENTS** (`conversions.js › segmentsDe`) : le découpage
    //   se refait sur la relecture, et chaque part lit les opérateurs qui visent
    //   SON segment — `mab` n'absorbe pas vers la phrase entière. Il ne s'applique
    //   qu'à un lien qui a exactement une part par segment ; tout autre lien se
    //   rejoue comme avant.
    const segs = rel ? segmentsDe(rel) : null;
    const enSegments = Boolean(segs) && lecture.fragments.length === segs.length && !lia
      && !(lecture.retouches || []).length
      && lecture.fragments.every((d) => !d.resonance && !(d.codes.length === 1 && /^\?+$/.test(d.codes[0])));
    const tablesDesSegments = enSegments ? segs.map((sg) => tableDesCodes(sg.cible)) : null;

    // ── ÉTAGE AMONT : les RETOUCHES (`2.1:fr13;…`, voir `url.js`) ───────────
    //
    // Chacune prend une portée du texte COURANT, lui applique son programme, et
    // repose le résultat à sa place. Le texte qui en sort est celui que l'étage
    // suivant lira — c'est tout le sens du `;`.
    //
    // ★ Les jetons sont recomptés à CHAQUE étage, jamais une fois pour toutes :
    //   une retouche peut allonger ou raccourcir ce qu'elle touche, et une
    //   portée `2.1:` désigne le deuxième jeton du texte que la retouche
    //   TROUVE, pas de celui que l'utilisateur avait tapé. C'est la seule
    //   lecture qui rende `a;b` équivalent à « d'abord a, puis b sur le
    //   résultat » — et donc la seule qui se relise sans ambiguïté.
    const retouches = [];
    let texte = saisie;
    for (const desc of lecture.retouches || []) {
      const jt = tokeniser(texte);
      const f = desc.portee
        ? fragmentDePortee(texte, jt, desc.portee)
        : fragmentEntier(texte, jt);
      if (!f) return { ok: false, raison: 'portée hors bornes', bandeau: BANDEAUX.formatInconnu };
      const journal = [];
      const chemin = executerProgramme(f.texte, desc.codes, parCode, journal);
      if (!chemin) {
        const d = diagnostic(journal);
        return { ok: false, raison: 'programme inapplicable', bandeau: d.bandeau, detail: d.detail };
      }
      const fin = chemin.etats[chemin.etats.length - 1];
      // ★ Une retouche doit rendre du TEXTE — c'est ici, et nulle part ailleurs,
      //   que la règle se vérifie : `url.js` lit la grammaire sans catalogue et
      //   ne sait pas ce que `fr13` produit. Un programme qui finit sur un
      //   nombre ne saurait pas se reposer dans la saisie ; on refuse le lien
      //   en le disant, plutôt que de jouer autre chose (§4.3).
      if (!fin || fin.type !== 'STR') {
        return { ok: false, raison: 'retouche non textuelle', bandeau: BANDEAUX.codeInconnu };
      }
      texte = texte.slice(0, f.offset) + fin.valeur + texte.slice(f.offset + f.longueur);
      retouches.push({ fragment: f, chemin });
    }

    // À partir d'ici, « la saisie » est la saisie RETOUCHÉE : les portées des
    // fragments, la tokenisation, la couverture et le barème s'y rapportent
    // tous. Le texte d'origine, lui, reste celui du base58 et celui que la
    // scène affiche au premier rideau — c'est `approche.saisie`.
    const jetons = tokeniser(texte);
    const parts = [];
    // ★ Le rejeu n'ouvre une recherche QUE si le lien en commande une ; le
    //   contexte est donc construit ici, une fois, et ne coûte rien sinon.
    const ctxRejeu = contexteBase(cbl);
    let commandes = false;

    for (const [rangDesc, desc] of lecture.fragments.entries()) {
      let portees = [];
      if (desc.resonance) {
        const rep = motifsRepetes(jetons)[0];
        if (!rep || rep.occurrences.length < desc.resonance) {
          return { ok: false, raison: 'motif répété introuvable', bandeau: BANDEAUX.formatInconnu };
        }
        portees = rep.occurrences.slice(0, desc.resonance).map((o) => ({
          texte: o.texte, offset: o.offset, longueur: o.longueur,
          intervalles: [[o.offset, o.offset + o.longueur]],
          tokenDebut: jetons.indexOf(o), tokenLong: 1, famille: 'repetition', priorite: 1,
        }));
      } else if (desc.portee) {
        const f = fragmentDePortee(texte, jetons, desc.portee);
        if (!f) return { ok: false, raison: 'portée hors bornes', bandeau: BANDEAUX.formatInconnu };
        portees = [f];
      } else {
        portees = [fragmentEntier(texte, jetons)];
      }

      // ★ Une COMMANDE (`????`) au lieu d'un programme : voir `trouverProgramme`.
      const commande = desc.codes.length === 1 && /^\?+$/.test(desc.codes[0])
        ? desc.codes[0].length : 0;
      if (commande) commandes = true;
      for (const fragment of portees) {
        let chemin;
        if (commande) {
          const trouves = trouverProgramme(fragment.texte, commande, ctxRejeu, cbl);
          // Le rejeu ORDINAIRE ne garde que le compte exact : un lien qui joue
          // une démonstration doit jouer celle qu'il annonce. C'est
          // `enumerer()` qui montre les approchants, et lui seul.
          chemin = trouves.length && trouves[0].ecart === 0 ? trouves[0].chemin : null;
          if (!chemin) {
            return {
              ok: false,
              raison: 'commande sans réponse',
              bandeau: BANDEAUX.commandeSansReponse(commande),
              detail: `« ${fragment.texte} » : aucun programme connu n’en tire `
                + `exactement ${commande} valeur(s) utile(s).`,
            };
          }
        } else {
          const journal = [];
          chemin = executerProgramme(fragment.texte, desc.codes,
            tablesDesSegments ? tablesDesSegments[rangDesc] : parCode, journal);
          if (!chemin) {
            const d = diagnostic(journal);
            return { ok: false, raison: 'programme inapplicable', bandeau: d.bandeau, detail: d.detail };
          }
        }
        parts.push({ fragment, chemin });
      }
    }

    // Le mode n'est pas transporté par l'URL : on le redéduit de la géométrie
    // des fragments, exactement comme le fait `assembler`. C'est ce qui garantit
    // qu'un lien rejoué affiche le même score que la liste dont il est issu.
    /* ★ **UNE LIAISON SE VÉRIFIE, ELLE NE SE CROIT PAS.** Deux parts qui rendent
       chacune un entier, l'opérateur appliqué à la paire, et la ligne qu'il
       écrit doit être EXACTEMENT la cible : sinon le lien promettait « 007 »
       et la scène montrerait autre chose (§4.3). */
    if (lia) {
      const valeurs = parts.map((p) => p.chemin.etats[p.chemin.etats.length - 1]);
      const entiers = valeurs.every((e) => e && e.type === 'NUM' && Number.isInteger(e.valeur));
      const lue = parts.length === 2 && entiers ? lia.apply(valeurs.map((e) => e.valeur), []) : null;
      if (!lue || lue.valeur.join('') !== cbl.chiffres.join('')) {
        return { ok: false, raison: 'liaison qui n’écrit pas la cible', bandeau: BANDEAUX.liaisonImpossible };
      }
    }
    const approche = {
      parts,
      ...deduireMode(parts, { saisie: texte, jetons, cible: cbl, liaison: lia, segments: enSegments ? segs : undefined }),
    };
    if (enSegments) {
      // ★ **REFUSÉ, ET BRUYAMMENT : une phrase qui recopie la saisie.** Un lien
      //   écrit avant cette règle — ou à la main — dont deux segments relisent
      //   les mêmes caractères ne se rejoue pas : il montrerait une duplication
      //   que l'autrice interdit.
      if (!segmentsSansCopie(parts)) {
        return { ok: false, raison: 'segments qui recopient la saisie', bandeau: BANDEAUX.formatInconnu };
      }
      approche.segments = segs;
    }
    if (lia) approche.liaison = Object.freeze({ code: lia.code, op: lia });
    // ★ Les RETOUCHES voyagent À CÔTÉ des parts, jamais dedans. `parts` a un
    //   sens précis partout ailleurs — « un morceau qui rend un chiffre » — et
    //   c'est sur lui que se lisent le mode, la moisson, le verdict et la
    //   géométrie des portées disjointes. Une retouche ne rend pas de chiffre :
    //   la glisser là fabriquerait une PARTITION là où il n'y a qu'une
    //   préparation, et un mode faux se propagerait jusqu'au titre.
    //   ★ Le barème les VOIT quand même — pas en tant que parts, mais par
    //   `approche.retouches` : `elegance.js` facture leurs gestes au tarif
    //   ordinaire et ajoute le palier `BAREME.RETOUCHE` (voir l'étage amont du
    //   groupement, plus haut). La note « le barème ne voit pas ces
    //   opérations-là » datait d'avant ce branchement (audit).
    approche.retouches = retouches;
    // La SAISIE que la démonstration lit n'est plus toujours celle qu'on a
    // tapée : le barème, la couverture et les portées se rapportent au texte
    // retouché, l'affichage à l'original. Les deux sont publiés plutôt que
    // devinés — `scenario.js` a besoin des deux à la fois.
    approche.saisie = saisie;
    approche.saisieRetouchee = texte;
    // ★ La PONDÉRATION vient du LIEN, comme la cible et le registre. Un lien
    //   émis depuis une liste repondérée porte ses quatre crans (`url.js`) : sans
    //   eux, la voie rejouée afficherait un score que la liste d'origine ne
    //   montrait pas, et §4.3 interdit de rendre en silence autre chose que ce
    //   qu'on a promis. Un lien sans marqueur note au barème du site.
    noter(approche, {
      saisie: texte,
      signifiants: zonesSignifiantes(texte),
      cible: cbl,
      ponderation: ponderer(lecture.curseurs),
    });
    marquerLesCodes(approche);
    // Hors liste, il n'y a personne dont se distinguer : le titre est celui que
    // `titres.js` compose à partir de la seule signature du chemin.
    approche.titre = titreBilingue(approche);
    approche.regle = regleBilingue(approche);
    // Le registre du lien rejoué est celui qu'il porte : on ne le devine pas,
    // on le relit (`lecture.registre`, résolu par `url.js`).
    const registre = lecture.registre;
    /* ★ **UNE COMMANDE RÉSOLUE S'ÉCRIT RÉSOLUE.**
       « Remplacer les fragments dont le programme est `????` » (l'auteur) — le
       verbe est bien « remplacer ». Un lien partagé doit être la description
       exacte d'une démonstration : garder `????` dedans en ferait une DEMANDE,
       qui rejouerait une recherche à chaque ouverture et pourrait rendre autre
       chose le jour où le catalogue bouge. Le lien rendu porte donc les codes
       trouvés — et rien n'empêche de réécrire une commande à la main pour en
       chercher une autre, ce qui est bien tout l'intérêt.
       ⚠️ Une commande partagée par PLUSIEURS portées peut se résoudre
         différemment sur chacune : « https » et « fr » ne rendent pas deux 6 par
         le même chemin. On écrit donc un descripteur PAR PART, et `ecrire`
         regroupera ceux qui se retrouvent identiques. */
    const fragmentsEcrits = commandes
      ? parts.map((p) => ({
        portee: p.fragment.tokenDebut >= 0 && p.fragment.tokenLong > 0
          ? { offset: p.fragment.tokenDebut, longueur: p.fragment.tokenLong } : null,
        resonance: null,
        codes: p.chemin.ops.map((o) => o.code),
      }))
      : lecture.fragments;
    // Et les réglages voyagent avec, à l'identique : un lien réécrit doit rester
    // le même lien, et la voie doit pouvoir ramener vers SA liste.
    // ★ Une voie vers un TEXTE : même écart payé que dans la liste, et un lien
    //   qui vise le texte, pas sa cible sous-jacente (`versLeTexte`).
    if (rel) {
      approche.relecture = Object.freeze({ code: rel.code, mot: rel.mot.texte });
      const facteur = facteurDEcartAuxCurseurs(rel.ecart, lecture.curseurs);
      approche.ecartDeForme = Object.freeze({ ...rel.ecart, facteur });
      approche.produit = rel.produit;
      approche.score = Math.round((approche.score * facteur) / 1000);
    }
    const lien = {
      saisie, fragments: fragmentsEcrits, retouches: lecture.retouches, cible: rel ? rel.mot : cbl,
      relecture: rel ? rel.code : undefined,
      liaison: lia ? lia.code : undefined,
      curseurs: lecture.curseurs, fouille: lecture.fouille,
    };
    approche.urlSobre = ecrire({ ...lien, registre: 'sobre' });
    approche.urlScenique = ecrire({ ...lien, registre: 'scenique' });
    approche.url = ecrire({ ...lien, registre });
    return { ok: true, approche };
  }

  function scenarioDe(approche, ctx = {}) {
    // La langue traverse jusqu'aux `steps()` du catalogue : sans elle, les libellés
    // repartent en français quelle que soit l'interface (CONTRACTS §0.4, bilinguisme).
    const langue = ctx.langue || 'fr';
    // ★ Une voie vers un TEXTE se termine par sa RELECTURE, jouée au verdict
    //   (`scenario.js`). L'opérateur est pris ici, par le code que la voie
    //   porte ; la cible du scénario est la cible chiffrée SOUS-JACENTE — c'est
    //   elle que la voie écrit —, quoi que l'appelant ait passé.
    const rel = approche.relecture ? {
      code: approche.relecture.code,
      mot: approche.relecture.mot,
      op: opParCode.get(approche.relecture.code) || null,
      ecart: approche.ecartDeForme || null,
      // ★ Ce que la relecture ÉCRIT réellement : sans la ponctuation omise, il
      //   n'a pas la longueur du texte visé, et c'est lui que le verdict découpe.
      produit: approche.produit || null,
    } : null;
    return construireScenario(approche, {
      saisie: ctx.saisie || approche.saisie,
      langue,
      // Le REGISTRE traverse jusqu'ici parce qu'il change ce que le SCÉNARIO
      // contient : en sobre, les cornes ne poussent pas (`url.js`, et
      // `scenario.js › sobrifierLesCornes`). La scénographie du verdict, elle,
      // ne change rien au scénario et se règle à la compilation visuelle.
      registre: ctx.registre,
      // La CIBLE traverse jusqu'au scénario : c'est elle qui décide de la
      // longueur d'une série au verdict, et des libellés qui nommaient « 6 ».
      cible: rel ? approche.cible : (ctx.cible || approche.cible),
      relecture: rel,
      // ★ Une PHRASE EN SEGMENTS : chaque part se récolte sur le sien.
      segments: approche.segments || null,
      // ★ La LIAISON se joue après les parts, avant la relecture (`scenario.js`).
      liaison: approche.liaison ? {
        code: approche.liaison.code,
        op: approche.liaison.op || opParCode.get(approche.liaison.code) || null,
      } : null,
      methode: ctx.methode || {
        id: approche.rang ?? 1,
        label: titreApproche(approche, langue),
        rule: regleApproche(approche, langue),
      },
      // Le verdict n'est plus forcément « 666 » : un GROUPEMENT dont le vecteur
      // porte douze 6 en aligne quatre séries, et l'annoncer « 666 » reviendrait
      // à cacher les trois quarts de ce qu'on vient de montrer (`verdictDe`).
      resultat: rel ? undefined : (ctx.resultat || verdictDe(approche)),
    });
  }

  /**
   * ★ **L'ÉNUMÉRATION D'UNE VOIE À TROUS.**
   *
   * ⚠️ À ne pas confondre avec `enumerer`, qui cherche une liste pour une
   *   SAISIE avec les curseurs de l'écran de liste. Celle-ci part d'un
   *   PROGRAMME déjà écrit et n'énumère que ce qui remplit ses `????`.
   *
   * > « `????` devrait mener vers une page d'énumération dont la recherche est
   * >   dédiée à remplacer ces `????`. » (l'auteur)
   *
   * Un lien qui commande ne désigne pas UNE démonstration mais une FAMILLE :
   * toutes celles qui remplissent les trous. On les énumère donc, on les note
   * comme n'importe quelle voie, et on applique le malus d'écart avant de
   * classer — de sorte que ce que l'auteur attendait sorte en tête et que
   * l'à-peu-près reste visible dessous.
   *
   * ★ **CHAQUE CANDIDATE EST REJOUÉE COMME UN LIEN ORDINAIRE**, avec sa
   *   commande remplacée par des codes réels. Rien n'est calculé deux fois par
   *   deux chemins différents : le mode, la moisson, le barème et l'URL sortent
   *   du même `rejouer` que tout le reste. C'est ce qui garantit qu'une voie
   *   énumérée ici et la même voie ouverte directement affichent le même score.
   *
   * ★ **LE PRODUIT EST BORNÉ, et il faut qu'il le soit** : deux portées
   *   commandées à six candidates chacune font trente-six démonstrations à
   *   noter. On garde les meilleures candidates de chaque portée puis on borne
   *   le total — la liste n'en montrera de toute façon qu'une douzaine.
   */
  function enumererLesTrous(lecture, reglages = {}) {
    if (!lecture || lecture.forme !== 'canonique') {
      return { ok: false, raison: 'forme non canonique', bandeau: lecture && lecture.bandeau };
    }
    const cbl = normaliserCible(lecture.cible);
    const saisie = lecture.saisie;
    const jetons = tokeniser(saisie);
    // ★ La fouille de l'énumération est plus patiente que celle de l'accueil —
    //   voir `config.js › reglagesDeBudget` pour les deux régimes et leur
    //   raison. La puissance vient de la réglette, sinon du LIEN (`f<N>!`),
    //   sinon celle d'ouverture.
    //
    //   ⚠️ **LE LIEN N'ÉTAIT PAS LU** (audit) : `lire('#f5!0:???…').fouille`
    //     valait 5 et l'énumération tournait au cran 2, tandis que le panneau
    //     se redessinait au défaut. Un lien à trous partagé ne rendait donc pas
    //     la liste qu'on avait sous les yeux en le copiant.
    const b = reglagesDeBudget(
      reglages.puissance ?? (lecture.fouilleEcrite ? lecture.fouille : PUISSANCE_ENUMERATION),
    );
    // ★ Et les CURSEURS du lien classent la liste comme ils l'ont notée :
    //   `rejouer` pondère chaque voie avec `lecture.curseurs`, il serait absurde
    //   de les trier ensuite par le barème du défaut.
    const ponderation = ponderer(lecture.curseurs);
    const ctxE = contexteBase(cbl, {
      dMax: b.dMax,
      maxTravail: BUDGET_TRAVAIL * b.facteur,
      budgetMs: b.budgetTotalMs,
    });

    // ── 1. déplier : une commande portant sur trois portées en fait trois.
    const plan = [];
    for (const desc of lecture.fragments || []) {
      const combien = desc.codes.length === 1 && RE_A_TROUVER.test(desc.codes[0])
        ? desc.codes[0].length : 0;
      if (!combien) { plan.push({ fixe: desc }); continue; }
      const portees = desc.portee
        ? [fragmentDePortee(saisie, jetons, desc.portee)]
        : [fragmentEntier(saisie, jetons)];
      for (const f of portees) {
        if (!f) return { ok: false, raison: 'portée hors bornes', bandeau: BANDEAUX.formatInconnu };
        plan.push({
          portee: desc.portee,
          combien,
          choix: trouverProgramme(f.texte, combien, ctxE, cbl).slice(0, CANDIDATS_PAR_TROU),
          texte: f.texte,
        });
      }
    }
    const trous = plan.filter((x) => !x.fixe);
    if (!trous.length) {
      return { ok: false, raison: 'aucune commande', bandeau: BANDEAUX.formatInconnu };
    }
    if (trous.some((t) => !t.choix.length)) {
      const muet = trous.find((t) => !t.choix.length);
      return {
        ok: false,
        raison: 'commande sans réponse',
        bandeau: BANDEAUX.commandeSansReponse(muet.combien),
        detail: `« ${muet.texte} » : aucun programme connu n’en tire de valeur utile.`,
      };
    }

    // ── 2. le produit, borné.
    let combinaisons = [[]];
    for (const t of trous) {
      const suite = [];
      for (const debut of combinaisons) {
        for (const c of t.choix) {
          if (suite.length >= COMBINAISONS_MAX) break;
          suite.push([...debut, c]);
        }
      }
      combinaisons = suite;
    }

    // ── 3. chaque combinaison se rejoue comme un lien ordinaire.
    const approches = [];
    for (const combi of combinaisons) {
      let k = 0;
      const fragments = [];
      let ecart = 0;
      for (const x of plan) {
        if (x.fixe) { fragments.push(x.fixe); continue; }
        const c = combi[k++];
        ecart += Math.abs(c.ecart);
        fragments.push({
          portee: x.portee,
          resonance: null,
          codes: c.chemin.ops.map((o) => o.code),
        });
      }
      const r = rejouer({ ...lecture, fragments });
      if (!r.ok) continue;
      const a = r.approche;
      if (ecart) {
        // ★ **LA PEINE SE PAIE TROU PAR TROU, pas sur la somme signée.** L'audit
        //   l'a relevé : un 6 de trop sur un trou et un 6 manquant sur l'autre
        //   s'annulaient — facteur 1, écart affiché 0 — là où le pavé ci-dessous
        //   promet ×0,80 par 6 de trop ET ×0,25 par 6 manquant. Chaque part
        //   paie la sienne, et les facteurs se multiplient.
        let num = 1;
        let den = 1;
        for (const c of combi) {
          if (!c.ecart) continue;
          const [n, d] = facteurDEcart(c.ecart);
          num *= n;
          den *= d;
        }
        a.score = Math.floor((a.score * num) / den);
        // Le signe dit le sens DOMINANT (un manque est négatif, et les liens à
        // « trop de ? » le lisent ainsi) ; l'absolu dit la distance réelle.
        a.ecartCommande = combi.reduce((t, c) => t + c.ecart, 0);
        a.ecartAbsolu = ecart;
      }
      approches.push(a);
    }
    if (!approches.length) {
      return { ok: false, raison: 'commande sans réponse', bandeau: BANDEAUX.formatInconnu };
    }
    approches.sort(ponderation.personnalisee ? ordrePondere(ponderation) : ordreTotal);
    approches.forEach((a, i) => { a.rang = i + 1; });
    return {
      ok: true,
      saisie,
      cible: cbl,
      // ★ Les places suivent le cran, comme pour la liste ordinaire — la
      //   douzaine en dur d'avant ignorait la réglette (audit).
      approches: approches.slice(0, b.voies),
      commande: true,
      puissance: b.puissance,
      facteur: b.facteur,
      // ★ Rendus pour que la page se dessine avec les réglages APPLIQUÉS, pas
      //   avec le défaut : le routeur les transmet à `pageResultat`.
      curseurs: ponderation.curseurs,
      curseursEcrits: Boolean(lecture.curseursEcrits),
      fouille: b.puissance,
    };
  }

  return {
    resoudre, resoudreProgressif, deroulerResolution,
    // ★ DEUX ÉNUMÉRATIONS, ET CE NE SONT PAS LES MÊMES QUESTIONS.
    //   `enumerer` cherche une LISTE pour une saisie, avec les curseurs et la
    //   fouille de l'écran de liste. `enumererLesTrous` prend une voie DÉJÀ
    //   ÉCRITE dont le programme porte des `????` et énumère ce qui peut les
    //   remplir. La première part d'un texte, la seconde d'un programme.
    enumerer, enumererProgressif, enumererLesTrous,
    rejouer, scenarioDe, catalogue, bassin, cache, ops,
  };
}

/**
 * ★ L'AVANCEMENT, ET POURQUOI C'EST UN MAXIMUM DE DEUX RAPPORTS.
 *
 * « Un avancement qui ment est pire que pas d'avancement. » La phase de
 * recherche s'arrête à la PREMIÈRE des deux bornes atteintes (voir la boucle
 * ci-dessus) :
 *
 *   · tous les fragments cherchés — le rapport `fragments / fragmentsTotal` ;
 *   · le budget de travail épuisé — le rapport `travail / travailTotal`, la
 *     borne déterministe de §4.4, celle qui décide vraiment.
 *
 * Puisque la fin arrive à la première des deux, l'avancement honnête est le
 * PLUS GRAND des deux rapports : c'est celui qui est le plus près de sa borne.
 * Prendre les fragments seuls mentirait sur une saisie longue, où le budget de
 * travail tombe bien avant le dernier fragment — la jauge irait tranquillement
 * jusqu'à 40 % puis sauterait à la fin. Prendre le travail seul mentirait sur
 * une saisie courte, qui n'en dépense qu'une fraction et finirait à 15 %.
 *
 * ⚠️ Les deux dénominateurs sont fournis par l'appelant, et ce ne sont pas les
 * deux qu'on croit : `travailTotal` est le PLAFOND réserve comprise, et
 * `fragmentsTotal` se corrige quand le budget s'épuise. Les deux termes restent
 * alors croissants — un numérateur qui monte, un dénominateur qui ne fait que
 * rétrécir —, donc leur maximum aussi : **la jauge ne recule jamais**.
 *
 * Elle peut en revanche **finir avant 100 %**, quand la dernière borne est
 * franchie d'un coup, et c'est le sens qu'on préfère à l'autre : mieux vaut une
 * jauge qui saute à la fin qu'une jauge assise à 100 % pendant qu'on calcule
 * encore.
 *
 * @param {{fragments:number, fragmentsTotal:number, travail:number, travailTotal:number}} compte
 */
/* ★ **LES TROIS PHASES, ET LEURS POIDS SONT MESURÉS.**

   > « Il faut qu'on la voie avancer progressivement, et idéalement qu'elle
   >   indique sommairement ce qu'elle fait, le temps écoulé et le temps restant
   >   estimé. » (l'auteur)

   Relevé sur quatre saisies, en millisecondes — chercher les fragments,
   assembler, noter puis classer :

   | saisie | fragments | assemblage | notation + tri |
   |---|---|---|---|
   | `hope` | 761 | 449 | 27 |
   | `Donald Trump` | 1 492 | 1 429 | 18 |
   | `Le chat dort sur le tapis rouge` | 1 755 | 2 841 | 218 |
   | `https://hope-hope-hope.fr/` | 1 188 | 1 661 | 47 |

   L'assemblage pèse donc autant que la recherche elle-même, et il était MUET :
   la jauge atteignait son maximum, puis ne bougeait plus pendant la moitié de
   l'attente. Les poids ci-dessous sont la moyenne de ces quatre relevés.

   ⚠️ **CE SONT DES POIDS, PAS DES PROMESSES.** Une saisie peut faire mentir la
     moyenne — `hope` passe 62 % de son temps sur les fragments, « Le chat » 37 %.
     La jauge ne recule jamais (`jauge-recherche.js`), donc le pire cas est une
     barre qui ralentit, jamais une barre qui revient en arrière. */
export const PHASES = Object.freeze(['fragments', 'assemblage', 'classement']);
export const POIDS_DES_PHASES = Object.freeze({ fragments: 48, assemblage: 50, classement: 2 });

/** La part [0,1] déjà acquise quand une phase commence. */
function seuilDeLaPhase(phase) {
  let cumul = 0;
  for (const p of PHASES) {
    if (p === phase) return cumul / 100;
    cumul += POIDS_DES_PHASES[p];
  }
  return cumul / 100;
}

export function avancementDe(compte) {
  const parFragments = compte.fragmentsTotal > 0 ? compte.fragments / compte.fragmentsTotal : 1;
  const parTravail = compte.travailTotal > 0 ? compte.travail / compte.travailTotal : 0;
  // La part accomplie DANS la phase : celle que l'appelant donne, ou celle que
  // le compte des fragments dicte.
  const locale = compte.part !== undefined
    ? Math.min(1, Math.max(0, compte.part))
    : Math.min(1, Math.max(0, parFragments, parTravail));
  const phase = compte.phase || 'fragments';
  /* ⚠️ **EN MILLIÈMES ENTIERS, PUIS UNE SEULE DIVISION.** §4.4 veut de
     l'arithmétique entière, et ce n'est pas une coquetterie : `0,9 × 0,48` rend
     `0,43200000000000005` ou `0,432` selon l'ordre où on multiplie, et deux
     chemins qui devraient donner la même jauge donnaient deux nombres
     différents. Le millième est la précision utile — la barre s'affiche au
     pour-cent — et il est exact. */
  const mille = Math.min(1000, Math.round(seuilDeLaPhase(phase) * 1000)
    + Math.round((POIDS_DES_PHASES[phase] ?? 0) * locale * 10));
  return { ...compte, phase, fraction: mille / 1000 };
}

/**
 * ★ LA SÉLECTION À OBJECTIFS MULTIPLES — « ce n'est pas un tri unique ».
 *
 * « 1ʳᵉ suggestion — l'élégance. 2ᵈ suggestion — le nombre de triptyques, au prix
 *  d'une élégance éventuellement moindre, sans l'ignorer. 3ᵉ et suivantes — un
 *  mixte pondéré des deux, comme aujourd'hui. » — l'auteur.
 *
 * Trois questions, donc trois réponses, et la liste les donne dans cet ordre.
 * `score.js` fournit les trois comparateurs (`ordreElegance`, `ordreTriptyques`,
 * `ordreTotal`) ; ici on ne fait que les interroger l'un après l'autre.
 *
 * ★ **La seconde suggestion n'est retenue que si elle a QUELQUE CHOSE À DIRE** —
 * c'est-à-dire strictement plus de séries que la première. Sans ce garde-fou,
 * « le champion des triptyques » désigne, neuf fois sur dix, une approche au
 * même nombre de séries que la précédente : elle n'offrirait pas un autre
 * arbitrage, elle prendrait juste la place d'une ligne mieux notée. Mesuré sur
 * le corpus du banc : la seconde suggestion ne se distingue de la première que
 * là où un compte supérieur existe réellement, et elle ne bouge alors qu'une
 * ligne.
 *
 * ★ **Le MMR garde la main sur tout le reste**, et il connaît la tête qu'on lui
 * a imposée (`amorce`) : le quota par mappeur et la pénalité de redondance
 * s'appliquent comme si elle avait été piochée par lui. La diversité de §4.8
 * n'est donc pas suspendue sur les deux premières lignes, elle en tient compte.
 *
 * Chaque approche repart avec la `suggestion` à laquelle elle doit sa place —
 * l'interface peut le dire, comme elle dit déjà le nombre de séries.
 *
 * @param {Object[]} approches  déjà notées
 * @param {number} limite
 * @returns {Object[]}
 */
function selectionner(approches, limite, maxParMappeur, lambda) {
  if (!approches.length || limite <= 0) return [];
  const tete = champions(approches);

  const reste = diversifier(
    approches.filter((a) => !tete.includes(a)),
    // ★ Le quota par mappeur suit le cran, comme les places : sans lui, élargir
    //   la liste ne ferait qu'ajouter des voies d'autres méthodes, jamais les
    //   variantes d'une même méthode que le curseur est censé faire remonter.
    { limite: limite - tete.length, maxParMappeur, lambda, amorce: tete },
  );
  for (const a of reste) if (!a.suggestion) a.suggestion = 'mixte';
  return [...tete, ...reste];
}

/**
 * ★ Les deux lignes réservées — le champion de l'ÉLÉGANCE, puis celui des
 * TRIPTYQUES s'il apporte davantage de séries. Extrait de `selectionner` tel
 * quel, pour que l'union des crans (`deroulerResolution`) recalcule la tête
 * avec exactement la même règle.
 */
function champions(approches) {
  const tete = [];
  const prendre = (a, suggestion) => {
    if (!a || tete.includes(a)) return;
    a.suggestion = suggestion;
    tete.push(a);
  };

  const elegante = approches.slice().sort(ordreElegance)[0];
  prendre(elegante, 'elegance');

  // La seconde suggestion ne prend sa place que si elle apporte réellement plus
  // de triptyques que la première — sinon elle ne suggère rien de neuf.
  //
  // ★ **UNE FICELLE Y EST ADMISE — À CONDITION DE PAYER EN EXEMPLAIRES.**
  //
  //   « `mad` met un malus d'élégance, mais l'élégance n'était pas le critère
  //   principal du 2ⁿᵈ résultat ; celui-ci devrait accepter facilement des
  //   versions avec ficelles du moment que ça permet d'atteindre l'objectif avec
  //   un maximum d'exemplaires. » — l'auteur. La place est donc rendue aux
  //   ficelles, et la condition qu'il pose est reprise mot pour mot : *du moment
  //   que* le compte y gagne.
  //
  //   Concrètement, une seule règle, et elle tient en une phrase : **à compte
  //   égal, la voie honnête garde la place ; à compte SUPÉRIEUR, la ficelle la
  //   prend.** C'est ce qui réconcilie la demande de l'auteur avec la raison qui
  //   avait fait poser l'interdit — cette place-là ne récompense qu'une chose,
  //   le NOMBRE de séries qu'une méthode sait donner, et une ficelle qui n'en
  //   donne pas davantage ne l'a pas gagnée : elle l'aurait prise pour avoir
  //   effacé ce qui gêne (`m1s2`) ou relu la ligne jusqu'à ce qu'elle tombe
  //   juste (`mad`, `mrd`), c'est-à-dire pour un geste que le barème vient
  //   précisément de punir. Dès qu'elle en donne davantage, en revanche, elle
  //   répond exactement à la question que cette place pose, et la taire
  //   reviendrait à annoncer un maximum d'exemplaires qu'on sait dépassé.
  //
  //   ★ **L'ARGUMENT QUI AVAIT IMPOSÉ L'INTERDIT A CESSÉ DE VALOIR.** Il tenait
  //   à une mesure — sur « Millicent », `fr13+tca+mx6+mrd` (trois séries)
  //   passait au-dessus de `fr13+tca+mx6+mrn` (deux séries), « et la liste
  //   affichait deux séries au rang 1 puis trois au rang 2, un compte qui
  //   REMONTE, ce qu'un test de classement interdit depuis toujours ». Ce test a
  //   depuis été amendé, et sur ce point même : « l'invariant commence APRÈS les
  //   deux places réservées […] dire que la 2ᵈ aligne PLUS de 666 que la 1ʳᵉ,
  //   c'est dire ce qui la met là » (`recherche.test.js`). L'obstacle technique
  //   n'existe donc plus ; ce qui restait était une doctrine, et l'auteur la
  //   tranche ici dans l'autre sens.
  //
  //   Les ficelles restaient de toute façon pleinement éligibles à la première
  //   place (l'élégance) et au mixte : ce § ne leur ouvre que la seule porte qui
  //   leur était fermée, et il ne l'ouvre qu'à celles qui apportent un compte.
  //
  //   ⚠️ MESURÉ, et il faut le dire : sur les vingt-deux saisies du banc, cette
  //   règle ne déplace AUCUNE ligne. Le champion des triptyques est une ficelle
  //   sur trois d'entre elles (`reinfocovid`, `Capitalisme`, `NumHeroLOLgeek`),
  //   et les trois fois à compte ÉGAL avec la meilleure voie honnête — donc la
  //   place ne change pas de main. Ce n'est pas un argument contre : c'est la
  //   preuve que l'interdit ne coûtait rien tant qu'une ficelle ne produit pas
  //   davantage, et que le jour où elle en produira, la liste le dira au lieu de
  //   le cacher.
  const parLeCompte = approches.slice().sort(ordreTriptyques);
  const champion = parLeCompte[0];
  const championHonnete = parLeCompte.find((a) => !emploieUneFicelle(a.bilan));
  const fournie = champion && emploieUneFicelle(champion.bilan) && championHonnete
    && (championHonnete.series || 1) >= (champion.series || 1)
    ? championHonnete : champion;
  if (fournie && elegante && (fournie.series || 1) > (elegante.series || 1)) {
    prendre(fournie, 'triptyques');
  }
  return tete;
}

/**
 * ★ Une liste DÉJÀ choisie, rangée comme `selectionner` range la sienne : les
 * champions en tête, le reste par l'ordre total. Sans MMR ni places : l'union
 * des crans ne choisit plus, elle ordonne ce que chaque cran a choisi.
 */
function rangerParRegimes(approches) {
  for (const a of approches) delete a.suggestion;
  const tete = champions(approches);
  const reste = approches.filter((a) => !tete.includes(a)).sort(ordreTotal);
  for (const a of reste) a.suggestion = 'mixte';
  return [...tete, ...reste];
}

/**
 * Une COPIE de la liste d'un cran — les voies copiées en surface. Ce qu'un cran
 * réécrit sur ses voies (rang, titre, liens, suggestion) ne touche ainsi jamais
 * une réponse déjà rendue.
 */
function copierEtat(etat) {
  return {
    retenues: etat.retenues.map((a) => {
      const c = { ...a };
      delete c.suggestion;
      return c;
    }),
    tronque: !!etat.tronque,
  };
}

/**
 * Ordre dans lequel les fragments sont CHERCHÉS — distinct de l'ordre dans
 * lequel ils sont affichés (`genererFragments` trie par priorité, §3.3).
 *
 * Seule différence : le fragment « saisie entière » (priorité 5) remonte juste
 * derrière les répétitions. Il porte à lui seul les modes DIRECT et TRIPLEMENT,
 * et sur un mot unique il est le seul assemblage possible ; le laisser en queue
 * reviendrait à le sacrifier le premier quand le budget global s'épuise.
 * Le tri est stable et sans entropie : à priorité égale, l'ordre d'entrée est
 * conservé, donc la recherche reste déterministe.
 */
function ordreDeRecherche(fragments) {
  const rang = (f) => (f.entier || f.famille === 'entier' ? 1.5 : f.priorite);
  return fragments
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (rang(a.f) - rang(b.f)) || (a.i - b.i))
    .map((x) => x.f);
}

/** La valeur du dernier état d'un chemin, quand c'est un nombre. */
function valeurFinaleDe(chemin) {
  const fin = chemin && chemin.etats && chemin.etats[chemin.etats.length - 1];
  return fin && fin.type === 'NUM' ? fin.valeur : null;
}

/**
 * ★ Les CODES d'une approche disent ce que son LIEN dit — retouches comprises.
 *
 * `score.js › noter` compose `approche.codes` à partir des seules parts, ce qui
 * était exact tant qu'une approche n'était QUE ses parts. Deux voies qui ne
 * diffèrent que par leur étage amont — le même programme, un autre mot réécrit —
 * portaient alors la même chaîne : le classement les déclarait indiscernables
 * (`ordreTotal` se termine sur les codes) et l'ordre total cessait d'être total,
 * ce que §4.4-1 interdit. Mesuré sur « Le chat dort sur le tapis rouge », deux
 * voies `fl+tca+m14+mrd` à 3 063 points, l'une chiffrant `chat`, l'autre `dort`.
 *
 * Le préfixe est celui de l'URL, au caractère près — `2.1:fr13;` —, de sorte
 * que la chaîne qui nomme une voie dans le classement, dans le banc de mesure
 * et dans le dernier départage soit LA MÊME que celle qu'on peut copier.
 *
 * ⚠️ La PORTÉE y figure, alors que celles des fragments n'y ont jamais figuré
 * (`tca+m14+m36,fr13+tca+m14+m36` ne dit pas `0.1:` ni `2.1:`). Ce n'est pas une
 * incohérence : c'est justement la portée qui sépare deux retouches par ailleurs
 * identiques — `2.1:fr13` et `4.1:fr13` sur « Le chat dort sur le tapis rouge »
 * —, alors que deux fragments de portées différentes portent, eux, des TEXTES
 * différents, que la déduplication voit déjà (`dedupliquerApproches`).
 */
function marquerLesCodes(approche) {
  if (!approche) return;
  // ★ La LIAISON se lit dans les codes comme dans le lien : `=mdl0!` devant.
  //   Deux voies dont les parts coïncident mais dont l'une les divise ne sont
  //   pas la même voie, et l'ordre total doit pouvoir le dire (§4.4-1).
  if (approche.liaison) approche.codes = `=${approche.liaison.code}!${approche.codes}`;
  if (!approche.retouches || !approche.retouches.length) return;
  approche.codes = ecrireRetouches(retouchesDe(approche)) + approche.codes;
}

/** La portée « toute la saisie », dans la forme qu'attend l'assemblage. */
function fragmentEntier(saisie, jetons) {
  return {
    texte: saisie, offset: 0, longueur: saisie.length,
    intervalles: [[0, saisie.length]], tokenDebut: 0, tokenLong: jetons.length,
    // ★ `entier` n'est pas décoratif : c'est ce que lit `url.js › porteeDe`
    //   pour décider qu'une portée couvre tout et n'a donc pas à être écrite.
    famille: 'entier', priorite: 5,
  };
}

function fragmentDePortee(saisie, jetons, portee) {
  const { offset, longueur } = portee;
  if (offset < 0 || longueur <= 0 || offset + longueur > jetons.length) return null;
  const premier = jetons[offset];
  const dernier = jetons[offset + longueur - 1];
  const d = premier.offset;
  const f = dernier.offset + dernier.longueur;
  return {
    texte: saisie.slice(d, f), offset: d, longueur: f - d,
    intervalles: [[d, f]], tokenDebut: offset, tokenLong: longueur,
    famille: 'portee', priorite: 2,
  };
}

/** Chemins rendus par `vecteursDeSix` pour une commande. Large : on filtre après. */
const MAX_A_TROUVER = 200;

/** Candidates gardées par trou, et plafond du produit — voir `enumerer`. */
const CANDIDATS_PAR_TROU = 6;
const COMBINAISONS_MAX = 24;

/**
 * ★ **UNE VOIE À TROUS — le programme écrit `????`, le moteur le remplit.**
 *
 * > « Une voie indiquée comme ça pourrait déclencher une recherche spécifique
 * >   pour remplacer les fragments dont le programme est `????` par exactement
 * >   autant de 6 (ou de caractères dans le motif recherché) qu'il y a de "?".
 * >   Ça permettrait de construire des voies sur mesure. » (l'auteur)
 *
 * On cherche donc les chemins de CETTE portée — la même fermeture exhaustive
 * que la recherche ordinaire, `chercherSix` —, et l'on garde ceux qui rendent
 * exactement le compte demandé.
 *
 * ★ **« EXACTEMENT », ET C'EST LE MOT QUI COMPTE.** Un chemin qui rend cinq 6
 *   là où quatre étaient demandés ne convient PAS : la commande sert à composer
 *   une moisson qui tombe juste, et un 6 de trop décale tout ce qui suit. C'est
 *   d'ailleurs tout l'intérêt de la construire à la main plutôt que de la
 *   laisser chercher.
 *
 * ★ **CE QUI DÉPARTAGE, à compte égal : le chemin le plus COURT, puis l'ordre
 *   des codes.** Pas le score : noter demande une approche entière, qui n'existe
 *   pas encore — on est en train de la construire. Deux critères sans horloge ni
 *   hasard, donc un choix reproductible (§4.4), et le plus court est de toute
 *   façon ce que l'élégance récompensera ensuite.
 *
 * @param {string} texte     le texte de la portée
 * @param {number} combien   le nombre de `?`, donc de valeurs utiles voulues
 * @param {object} ctx       contexte de recherche (`chercherSix`)
 * @param {object} cible
 * @returns {{ops:object[], etats:object[], valeur:?number, cout:number}|null}
 */
function trouverProgramme(texte, combien, ctx, cible) {
  // ★ **DEUX SOURCES, PARCE QU'IL Y A DEUX FAÇONS DE RENDRE DES 6.**
  //
  //   `chercherSix` rend les chemins qui aboutissent à UN 6 — un nombre, seul.
  //   `vecteursDeSix` rend ceux qui aboutissent à une LIGNE en portant
  //   plusieurs. Une commande `?` relève de la première, `????` de la seconde,
  //   et rien ne dit d'avance laquelle : on interroge les deux et on compte.
  //
  //   ⚠️ C'est le piège dans lequel la première version est tombée : n'appeler
  //     que `chercherSix` faisait répondre « aucun programme » à tout ce qui
  //     dépassait un seul 6, puisque tous ses chemins en rendent exactement un.
  const utiles = (c) => {
    const fin = c.etats[c.etats.length - 1];
    const v = Array.isArray(fin.valeur) ? fin.valeur : [fin.valeur];
    return indexUtiles(v, cible).length;
  };
  const chemins = [
    ...chercherSix(texte, ctx),
    ...(combien >= 2
      ? vecteursDeSix(texte, ctx.operateurs, combien, MAX_A_TROUVER, cible)
      : []),
  ];
  const classes = chemins.map((c) => ({ chemin: c, ecart: utiles(c) - combien }));
  if (!classes.length) return [];
  // ★ L'ordre : le compte demandé d'abord, puis le SURPLUS avant le MANQUE, puis
  //   le plus court. Voir `PENALITE_SURPLUS` / `PENALITE_MANQUE` pour le
  //   pourquoi de l'asymétrie.
  classes.sort((a, b) => {
    const ra = rangDEcart(a.ecart);
    const rb = rangDEcart(b.ecart);
    if (ra !== rb) return ra - rb;
    if (a.chemin.ops.length !== b.chemin.ops.length) return a.chemin.ops.length - b.chemin.ops.length;
    const ca = a.chemin.ops.map((o) => o.code).join('+');
    const cb = b.chemin.ops.map((o) => o.code).join('+');
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
  return classes;
}

/**
 * ★ **CE QUE COÛTE UN ÉCART AU COMPTE DEMANDÉ — et pourquoi il n'est pas
 *   symétrique.**
 *
 * > « Objectif : autant de `?` qu'a la saisie. Mais s'il y en a plus, c'est
 * >   juste un malus de score à appliquer, pour que les premiers résultats
 * >   correspondent à ce qui est attendu. S'il y en a moins, c'est un énorme
 * >   malus à appliquer, mais mieux vaut des résultats que aucun. » (l'auteur)
 *
 * L'asymétrie n'est pas un réglage, elle est dans la nature des deux fautes.
 * Un 6 DE TROP se voit : il reste sur la ligne, le spectateur le compte, la
 * démonstration est bavarde mais elle tient. Un 6 QUI MANQUE casse la série
 * qu'on était en train de composer — la voie sur mesure ne rend plus ce pour
 * quoi on l'écrivait. La première se pardonne, la seconde ruine.
 *
 * ★ Et AUCUNE des deux n'est un refus : « mieux vaut des résultats que aucun ».
 *   Une page d'énumération qui ne montre rien n'apprend rien ; une page qui
 *   montre l'à-peu-près en bas de liste dit au moins ce que le mot sait faire.
 */
const PENALITE_SURPLUS = [80, 100];   // ×0,80 par 6 de trop
const PENALITE_MANQUE = [25, 100];    // ×0,25 par 6 manquant — « énorme »

/** 0 pour le compte juste, 1 par 6 en trop, 100 + n pour un manque. */
const rangDEcart = (e) => (e === 0 ? 0 : (e > 0 ? e : 100 - e));

/** Le facteur à appliquer au score, en fraction entière. */
function facteurDEcart(ecart) {
  const [n, d] = ecart > 0 ? PENALITE_SURPLUS : PENALITE_MANQUE;
  let num = 1;
  let den = 1;
  for (let i = 0; i < Math.abs(ecart); i++) { num *= n; den *= d; }
  return [num, den];
}

function executerProgramme(texte, codes, parCode, journal = null) {
  let courant = etat('STR', String(texte).normalize('NFC'), [[0, texte.length]]);
  const chemin = { ops: [], etats: [courant], valeur: null, cout: 0 };
  for (const code of codes) {
    const op = parCode.get(code);
    /* ★ **LES IMPLICITES SE RÉINSÈRENT ICI.** Voir `url.js` : `tca` — « un
       caractère, un jeton » — et `m09` — « chaque chiffre vaut lui-même » — ne
       s'écrivent plus dans les liens. On les remet quand — et seulement quand —
       l'état courant ne présente pas le type que l'opérateur qui vient réclame,
       et qu'une porte existe depuis ce type-là (`config.js › IMPLICITE_DEPUIS`).

       ⚠️ La règle ne devine pas : elle CONSTATE. Un lien qui écrit `tm`, `tsp`
         ou `tsy` fournit lui-même ses jetons, l'état n'est plus `STR` quand
         l'opérateur suivant se présente, et rien n'est inséré. Un lien qui écrit
         `tca` explicitement — tous ceux d'hier — le voit appliqué normalement,
         puis l'état n'est plus `STR` : la réinsertion ne peut pas le doubler. La
         même chose vaut pour les trente conversions `TOKENS → NUMS`, qui
         s'écrivent toutes.

       ★ **LA CHAÎNE PEUT FAIRE DEUX PAS**, et c'est le cas de `#mtri#` sur une
         date de naissance : `STR → TOKENS → NUMS`. Elle s'arrête d'elle-même —
         il n'y a qu'une porte par type, aucune ne ramène à un type déjà vu, et
         la boucle rend la main dès qu'un pas échoue (une lettre n'a pas de
         valeur à rendre) ou dès que le type attendu est là. */
    while (op && courant.type !== op.from && IMPLICITE_DEPUIS[courant.type]) {
      const porte = parCode.get(IMPLICITE_DEPUIS[courant.type]);
      const suivant = porte && appliquerOp(porte, courant);
      if (!suivant || suivant.type === courant.type) break;
      chemin.ops.push(porte);
      chemin.etats.push(suivant);
      chemin.cout += porte.cout || 0;
      courant = suivant;
    }
    // ★ **DEUX ÉCHECS QUI N'ONT RIEN À VOIR, ET QUI SE DISAIENT PAREIL.**
    //
    //   > « Pourquoi es-tu capable d'identifier ce qui bloque, mais que rien
    //   >   n'est affiché en console pour comprendre ce qui ne va pas
    //   >   précisément, en plus du message d'erreur générique qui s'affiche
    //   >   sur le site ? » (l'auteur)
    //
    //   Les deux sorties rendaient `null`, l'appelant posait le même bandeau —
    //   « ce lien emploie une règle que cette version ne connaît pas » — et
    //   c'était FAUX une fois sur deux. `mrd` est parfaitement connu ; ce qu'il
    //   refuse, c'est la VALEUR qu'on lui présente. Envoyer quelqu'un chercher
    //   une version manquante alors que son opérateur est là et vient de dire
    //   non, c'est une piste fausse, pas une information incomplète.
    //
    //   Le journal note donc lequel des deux, quel code, à quel rang, et sur
    //   quel état — la seule chose qui permette de comprendre sans relire le
    //   catalogue.
    if (!op) {
      if (journal) journal.push({ cause: 'inconnu', code, rang: chemin.ops.length });
      return null;
    }
    const apres = appliquerOp(op, courant);
    if (apres === null) {
      if (journal) {
        journal.push({
          cause: 'refus', code, rang: chemin.ops.length,
          type: courant.type,
          valeur: Array.isArray(courant.valeur) ? courant.valeur.join(' ') : String(courant.valeur),
        });
      }
      return null;
    }
    chemin.ops.push(op);
    chemin.etats.push(apres);
    chemin.cout += op.cout || 0;
    courant = apres;
  }
  chemin.valeur = courant.type === 'NUM' ? courant.valeur : null;
  return chemin;
}

/**
 * Ce qu'on dit d'un programme qui n'a pas pu se jouer — en clair, et exact.
 *
 * Deux causes, deux phrases, et surtout deux CONDUITES différentes pour qui
 * lit : un code inconnu se répare en changeant de version ou de lien, un refus
 * se répare en changeant la valeur qu'on présente à l'opérateur — ou en
 * corrigeant l'opérateur, quand c'est lui qui a tort.
 */
function diagnostic(journal) {
  const e = journal && journal[journal.length - 1];
  if (!e) return null;
  if (e.cause === 'inconnu') {
    return {
      bandeau: BANDEAUX.codeInconnu,
      detail: `« ${e.code} » (position ${e.rang + 1}) n’existe pas dans ce catalogue.`,
    };
  }
  return {
    bandeau: BANDEAUX.regleRefusee(e.code),
    detail: `« ${e.code} » (position ${e.rang + 1}) refuse ${e.type} « ${e.valeur} » : `
      + 'l’opérateur existe, mais sa règle ne s’applique pas à cette valeur.',
  };
}

// ══════════════════════════════ interface postMessage (Worker ou fil principal)

/**
 * Protocole : `{type:'resoudre', generation, saisie, cible}` →
 *   `{type:'avancement', generation, fraction, …}` (zéro, une ou n fois), puis
 *   `{type:'resultat', generation, …}` ou `{type:'erreur', generation, message}`.
 * Le compteur `generation` permet d'annuler les recherches obsolètes quand
 * l'utilisateur continue de taper (équivalent d'un AbortController).
 *
 * ★ Ce n'est plus une préparation : `src/recherche/travailleur.js` branche
 *   `traiterProgressif` sur `self.onmessage` dans un vrai Worker, et
 *   `src/app/travailleur.js` branche exactement le même canal sur le fil
 *   principal quand aucun travailleur ne peut naître. Un seul protocole, deux
 *   moteurs d'exécution — c'est pour ça que le repli ne coûte pas une ligne de
 *   plus à l'appelant.
 */
export function creerCanal(moteur, poster) {
  let generation = 0;
  const envoyer = poster || ((m) => m);
  /** La cible voyage en CLAIR dans le message : `serialisable()` la réduit déjà
   *  à son texte, et un objet cible ne survivrait pas au clonage structuré. */
  const optionsDe = (message) => ({
    ...(message.cible ? { cible: message.cible } : {}),
    // Les curseurs sont un objet de nombres, la fouille un nombre : les deux
    // survivent au clonage structuré sans rien de particulier, à la différence
    // de la cible. Ils ne sont transmis que s'ils sont là — un message qui se
    // tait garde le barème et le budget du site.
    ...(message.curseurs ? { curseurs: message.curseurs } : {}),
    ...(message.fouille === undefined ? {} : { fouille: message.fouille }),
    // ★ « Révéler » : la première voie seule, sous la borne de la moisson.
    ...(message.reveler === true ? { pourReveler: true } : {}),
  });
  return {
    get generation() { return generation; },
    /**
     * La voie SYNCHRONE — sans avancement, et c'est son intérêt : elle rend le
     * résultat sur la ligne suivante. C'est celle des tests de protocole.
     */
    traiter(message) {
      if (!message || message.type !== 'resoudre') return null;
      generation = message.generation ?? generation + 1;
      try {
        const r = moteur.resoudre(message.saisie, optionsDe(message));
        return envoyer({ type: 'resultat', generation, ...serialisable(r) });
      } catch (err) {
        return envoyer({ type: 'erreur', generation, message: err.message });
      }
    },
    /**
     * La voie qui SE VOIT. Elle poste un `avancement` par fragment cherché, et
     * abandonne d'elle-même dès qu'une génération plus récente est demandée :
     * qui continue de taper n'attend pas la recherche d'avant.
     * @returns {Promise<Object|null>}
     */
    async traiterProgressif(message) {
      if (!message || message.type !== 'resoudre') return null;
      const mienne = message.generation ?? generation + 1;
      generation = mienne;
      try {
        const r = await moteur.resoudreProgressif(message.saisie, {
          ...optionsDe(message),
          annule: () => generation !== mienne,
          surAvancement: (a) => envoyer({ type: 'avancement', generation: mienne, ...a }),
          // ★ Les LISTES PROVISOIRES ne voyagent que sur demande : « Révéler »
          //   n'ouvre que la première voie de la liste finale, et sérialiser
          //   des listes que personne ne lira coûterait pour rien.
          ...(message.provisoires ? {
            surListe: (liste, info) => {
              if (generation !== mienne) return;
              envoyer({ type: 'provisoire', generation: mienne, cran: info.cran, ...serialisable(liste) });
            },
          } : {}),
        });
        // `null` : une recherche plus récente l'a coiffée. On ne poste rien —
        // un résultat périmé qui arrive après le neuf est pire qu'un silence.
        if (r === null) return null;
        return envoyer({ type: 'resultat', generation: mienne, ...serialisable(r) });
      } catch (err) {
        return envoyer({ type: 'erreur', generation: mienne, message: err.message });
      }
    },
    demander(saisie, cible) {
      return this.traiter({ type: 'resoudre', generation: ++generation, saisie, cible });
    },
  };
}

/** Retire les objets opérateurs (non clonables) avant un éventuel postMessage. */
function serialisable(resultat) {
  return {
    saisie: resultat.saisie,
    cible: resultat.cible ? resultat.cible.texte : undefined,
    dedie: resultat.dedie,
    vide: resultat.vide,
    urlResultats: resultat.urlResultats,
    fragments: resultat.fragments,
    // Les réglages tels qu'ils ont été COMPRIS — bornés, résolus, accompagnés
    // des pourcentages affichés et des six poids qui en découlent. L'écran de
    // liste redessine son panneau avec ça, sans refaire le calcul de son côté.
    curseurs: resultat.curseurs,
    pourcentages: resultat.pourcentages,
    poids: resultat.poids,
    fouille: resultat.fouille,
    tronque: resultat.tronque,
    tronqueTemps: resultat.tronqueTemps,
    avertissement: resultat.avertissement,
    // ★ Le DIAGNOSTIC d'une recherche vers un texte — ce que chaque relecture a
    //   visé et trouvé, ou les signes qu'aucune ne sait écrire. Sans lui, la
    //   page ne saurait dire que « aucune route », sans dire pourquoi.
    relectures: resultat.relectures,
    signesSansRelecture: resultat.signesSansRelecture,
    operateursRetires: resultat.operateursRetires,
    modesImpossibles: resultat.modesImpossibles,
    approches: (resultat.approches || []).map((a) => ({
      rang: a.rang, mode: a.mode, score: a.score, scoreAjuste: a.scoreAjuste,
      // ★ La LIAISON par son code — l'opérateur lui-même ne traverse pas.
      liaison: a.liaison ? a.liaison.code : undefined,
      // ★ L'élégance et la suggestion qui a valu sa place à la ligne : ce sont
      //   des grandeurs d'affichage au même titre que le score, et elles se
      //   recalculent depuis les parts, donc un lien rejoué les retrouve.
      elegance: a.elegance, suggestion: a.suggestion, series: a.series,
      decret: a.decret, L: a.L, titre: a.titre,
      regle: a.regle, url: a.url, urlSobre: a.urlSobre, urlScenique: a.urlScenique,
      joker: a.joker, criteres: a.criteres,
      codes: a.codes,
      // ★ La conversion lettre → chiffre qui porte la voie, et combien de
      //   caractères elle a traités : c'est le titre de sa carte, et il se
      //   calcule là où les états intermédiaires vivent (`score.js`).
      conversion: a.conversion,
      // ★ Et, pour une voie vers un TEXTE, la relecture qui la termine, ce
      //   qu'elle écrit réellement et l'écart payé (`cible.js › ECARTS`).
      relecture: a.relecture, produit: a.produit, ecartDeForme: a.ecartDeForme,
    })),
  };
}

export { lire, ecrire, encoderTexte, descripteursDe };
