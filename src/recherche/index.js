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
  appliquerOp, etat, operateursPourCible,
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
  assembler, approcheJoker, deduireMode, normaliserChemins, verdictDe, vecteursDeSix,
} from './assemblage.js';
import {
  noter, diversifier, ordreTotal, ordrePondere, ordreElegance, ordreTriptyques, REGLAGES,
  ponderer, normaliserCurseurs, pourcentagesDe,
  CURSEURS, CURSEUR_DEFAUT, CURSEUR_MAX, CURSEURS_DEFAUT, CORRESPONDANCE,
} from './score.js';
import {
  reglagesDeBudget, normaliserPuissance, PUISSANCE_ENUMERATION,
  PUISSANCE_DE_FOUILLE_DEFAUT, PUISSANCE_DE_FOUILLE_MAX,
} from '../config.js';
import { emploieUneFicelle } from './elegance.js';
import { indexUtiles } from './cible.js';

import { construireScenario } from './scenario.js';
import { titreApproche, regleApproche, titreBilingue, regleBilingue, nommer } from './titres.js';
import {
  lire, ecrire, descripteursDe, retouchesDe, ecrireRetouches, BANDEAUX, RE_A_TROUVER,
  CODE_DECOUPE_IMPLICITE,
} from './url.js';
import { CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES } from './cible.js';
import { deroulerParTranches } from './tranches.js';

export { LIMITE_SAISIE, BANDEAUX, REGLAGES };
export { CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES };
// ★ Tout ce que le PANNEAU DE RÉGLAGES de la liste a besoin de savoir, réexporté
//   ici : l'écran ne doit pas avoir à connaître le découpage interne du moteur
//   pour dessiner quatre curseurs et une réglette. Les noms, les bornes, le
//   défaut, la table de correspondance (pour dire ce qu'un curseur touche) et
//   les deux fonctions qui traduisent des positions en pourcentages affichés.
export {
  ponderer, normaliserCurseurs, pourcentagesDe,
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
export function creerMoteur(catalogue, options = {}) {
  if (options.valider !== false) {
    const pbs = validerCatalogue(catalogue);
    if (pbs.length) throw new Error('catalogue non conforme (CONTRACTS §2.2) :\n  - ' + pbs.join('\n  - '));
  }
  const ops = normaliserCatalogue(catalogue);
  const cache = new Map();
  const maintenant = options.maintenant || (() => performance.now());

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

  const contexteBase = (cbl, sur = {}) => ({
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
  function* deroulerResolution(saisieBrute, optionsResolution = {}) {
    const cbl = normaliserCible(optionsResolution.cible ?? options.cible);
    const ponderation = ponderer(optionsResolution.curseurs ?? options.curseurs);
    const fouille = normaliserPuissance(optionsResolution.fouille ?? options.fouille);
    const budgets = reglagesDeBudget(fouille);
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
    const dedie = cbl.defaut ? (REPONSES_DEDIEES.get(saisie.toLowerCase().trim()) || null) : null;
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
    const travailTotal = options.budgetTravailTotal ?? BUDGET_TRAVAIL_TOTAL * budgets.facteur;
    const travailParFragment = BUDGET_TRAVAIL * budgets.facteur;
    const travailDeReserve = BUDGET_TRAVAIL_RESERVE * budgets.facteur;
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
      const pause = yield avancementDe({
        fragments: cherches,
        fragmentsTotal: travailRestant > 0
          ? aChercher
          : Math.min(aChercher, Math.max(FRAGMENTS_GARANTIS, cherches)),
        travail: travailTotal - travailRestant,
        travailTotal: plafondTravail,
      });
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
    };
    let approches = assembler(saisie, frags, parFrag, ctxAssemblage);

    if (!approches.length) {
      const j = approcheJoker(saisie, ctxAssemblage); // garantie absolue (§5.3)
      if (j) approches = [j];
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
    for (const a of approches) { noter(a, contexteDe(a)); marquerLesCodes(a); }
    // ★ Le comparateur du mode personnalisé — au défaut, `ordrePondere` rend un
    //   ordre identique à `ordreTotal`, mais on prend `ordreTotal` lui-même pour
    //   qu'aucune indirection ne s'interpose sur le chemin par défaut.
    const ordreDeLaListe = ponderation.personnalisee ? ordrePondere(ponderation) : ordreTotal;
    approches.sort(ordreDeLaListe);

    // Le joker est affiché et assumé, en bas de liste (§0.4). Il n'est plus le
    // seul : le DÉCRET — un unique 6 recopié trois fois — porte désormais son
    // propre malus (`MALUS.decret`, ×0,40), si bien que le classement suffit à
    // le renvoyer en fond de liste sans qu'on ait à l'y pousser à la main. Ce
    // qui compte, et qui est vérifié plus bas, c'est qu'il ne passe JAMAIS
    // devant une approche qui produit réellement trois 6.
    const jokers = approches.filter((a) => a.mode === 'JOKER');
    const honnetes = approches.filter((a) => a.mode !== 'JOKER');
    const place = REGLAGES.MAX_APPROCHES - (jokers.length ? 1 : 0);
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
    const retenues = (barèmeDElegance && !ponderation.personnalisee)
      ? selectionner(honnetes, place)
      : diversifier(honnetes, { limite: place, ponderation });
    if (jokers.length) retenues.push(jokers[0]);
    else if (!retenues.length) {
      const j = approcheJoker(saisie, ctxAssemblage);
      if (j) { noter(j, ctxScore); retenues.push(j); }
    }

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
      //   ★ Et les CURSEURS et la FOUILLE, quand ils ne sont pas au défaut : le
      //   score que la voie rejouée affichera est celui de CETTE liste-ci, donc
      //   il dépend d'eux (`url.js`, en-tête). Au défaut, `ecrire()` n'écrit
      //   rien de plus et les liens sont ceux d'avant, au caractère près.
      const reglages = { curseurs: ponderation.curseurs, fouille };
      a.urlSobre = ecrire({ saisie, retouches, fragments: descripteurs, registre: 'sobre', cible: cbl, ...reglages });
      a.urlScenique = ecrire({ saisie, retouches, fragments: descripteurs, registre: 'scenique', cible: cbl, ...reglages });
      // `url` reste le lien de référence de la voie — la version scénique,
      // celle que le site montre par défaut (voir `url.js`, le registre).
      a.url = a.urlScenique;
      a.joker = a.mode === 'JOKER';
    });

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
    return {
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
      tronque: tronqueTravail || tronqueTemps,
      tronqueTemps,
      ...(avertissement ? { avertissement } : {}),
    };
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
    const cbl = normaliserCible(lecture.cible);
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
    const parCode = new Map();
    for (const o of ops) {
      const vise = typeof o.viser === 'function' ? o.viser(cbl.texte) : o;
      if (vise) parCode.set(o.code, vise);
    }

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

    for (const desc of lecture.fragments) {
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
          chemin = executerProgramme(fragment.texte, desc.codes, parCode, journal);
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
    const approche = { parts, ...deduireMode(parts, { saisie: texte, jetons, cible: cbl }) };
    // ★ Les RETOUCHES voyagent À CÔTÉ des parts, jamais dedans. `parts` a un
    //   sens précis partout ailleurs — « un morceau qui rend un chiffre » — et
    //   c'est sur lui que se lisent le mode, la moisson, le verdict et la
    //   géométrie des portées disjointes. Une retouche ne rend pas de chiffre :
    //   la glisser là fabriquerait une PARTITION là où il n'y a qu'une
    //   préparation, et un mode faux se propagerait jusqu'au titre.
    //   ⚠️ Conséquence assumée et NON tranchée : le barème ne voit donc pas ces
    //   opérations-là (voir `.planning/A-VENIR-retouches.md`).
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
    const lien = {
      saisie, fragments: fragmentsEcrits, retouches: lecture.retouches, cible: cbl,
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
      cible: ctx.cible || approche.cible,
      methode: ctx.methode || {
        id: approche.rang ?? 1,
        label: titreApproche(approche, langue),
        rule: regleApproche(approche, langue),
      },
      // Le verdict n'est plus forcément « 666 » : un GROUPEMENT dont le vecteur
      // porte douze 6 en aligne quatre séries, et l'annoncer « 666 » reviendrait
      // à cacher les trois quarts de ce qu'on vient de montrer (`verdictDe`).
      resultat: ctx.resultat || verdictDe(approche),
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
    //   raison. La puissance vient du lien ou de la réglette ; à défaut, celle
    //   d'ouverture.
    const b = reglagesDeBudget(reglages.puissance ?? PUISSANCE_ENUMERATION);
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
        const [n, d] = facteurDEcart(combi.reduce((t, c) => t + c.ecart, 0));
        a.score = Math.floor((a.score * n) / d);
        a.ecartCommande = combi.reduce((t, c) => t + c.ecart, 0);
      }
      approches.push(a);
    }
    if (!approches.length) {
      return { ok: false, raison: 'commande sans réponse', bandeau: BANDEAUX.formatInconnu };
    }
    approches.sort(ordreTotal);
    approches.forEach((a, i) => { a.rang = i + 1; });
    return {
      ok: true,
      saisie,
      cible: cbl,
      approches: approches.slice(0, REGLAGES.MAX_APPROCHES),
      commande: true,
      puissance: b.puissance,
      facteur: b.facteur,
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
export function avancementDe(compte) {
  const parFragments = compte.fragmentsTotal > 0 ? compte.fragments / compte.fragmentsTotal : 1;
  const parTravail = compte.travailTotal > 0 ? compte.travail / compte.travailTotal : 0;
  const fraction = Math.min(1, Math.max(0, parFragments, parTravail));
  return { ...compte, fraction };
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
function selectionner(approches, limite) {
  if (!approches.length || limite <= 0) return [];
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

  const reste = diversifier(
    approches.filter((a) => !tete.includes(a)),
    { limite: limite - tete.length, amorce: tete },
  );
  for (const a of reste) if (!a.suggestion) a.suggestion = 'mixte';
  return [...tete, ...reste];
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
  if (!approche || !approche.retouches || !approche.retouches.length) return;
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
    /* ★ **LE DÉCOUPAGE IMPLICITE SE RÉINSÈRE ICI.** Voir
       `url.js › CODE_DECOUPE_IMPLICITE` : `tca` ne s'écrit plus dans les liens.
       On le remet quand — et seulement quand — l'état courant est du TEXTE et
       que l'opérateur qui vient réclame des JETONS.

       ⚠️ La règle ne devine pas : elle CONSTATE. Un lien qui écrit `tm`, `tsp`
         ou `tsy` fournit lui-même ses jetons, l'état n'est plus `STR` quand
         l'opérateur suivant se présente, et rien n'est inséré. Un lien qui écrit
         `tca` explicitement — tous ceux d'hier — le voit appliqué normalement,
         puis l'état n'est plus `STR` : la réinsertion ne peut pas le doubler. */
    if (op && courant.type === 'STR' && op.from === 'TOKENS') {
      const decoupe = parCode.get(CODE_DECOUPE_IMPLICITE);
      const jetons = decoupe && appliquerOp(decoupe, courant);
      if (jetons) {
        chemin.ops.push(decoupe);
        chemin.etats.push(jetons);
        chemin.cout += decoupe.cout || 0;
        courant = jetons;
      }
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
    approches: (resultat.approches || []).map((a) => ({
      rang: a.rang, mode: a.mode, score: a.score, scoreAjuste: a.scoreAjuste,
      // ★ L'élégance et la suggestion qui a valu sa place à la ligne : ce sont
      //   des grandeurs d'affichage au même titre que le score, et elles se
      //   recalculent depuis les parts, donc un lien rejoué les retrouve.
      elegance: a.elegance, suggestion: a.suggestion, series: a.series,
      decret: a.decret, L: a.L, titre: a.titre,
      regle: a.regle, url: a.url, urlSobre: a.urlSobre, urlScenique: a.urlScenique,
      joker: a.joker, criteres: a.criteres,
      codes: a.codes,
    })),
  };
}

export { lire, ecrire, encoderTexte, descripteursDe };
