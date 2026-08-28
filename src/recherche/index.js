// src/recherche/index.js
// Point d'entrée du moteur de recherche heuristique.
// Assemble bfs + bassin + fragments + assemblage + score + scenario + url.
//
// L'interface `postMessage` est prévue dès maintenant (CONTRACTS.md §0.4) mais
// l'exécution est INLINE en v1 : la mesure donne 1,2 ms en moyenne et 48 ms au
// pire pour une fermeture complète, le budget d'une seconde est tenu 20×.
// Passer au Worker se fera sans refondre l'appelant : même protocole de message.

import { LIMITE_SAISIE, encoderTexte } from './base58.js';
import {
  chercherSix, normaliserCatalogue, validerCatalogue,
  appliquerOp, etat, operateursPourCible,
  N_FRAG_MAX, BUDGET_MS_FILET, BUDGET_TOTAL_MS, FRAGMENTS_GARANTIS,
  BUDGET_TRAVAIL, BUDGET_TRAVAIL_TOTAL, BUDGET_TRAVAIL_RESERVE,
} from './bfs.js';
import { construireBassin } from './bassin.js';
import { genererFragments, zonesSignifiantes, tokeniser, motifsRepetes } from './fragments.js';
import {
  assembler, approcheJoker, deduireMode, normaliserChemins, verdictDe,
} from './assemblage.js';
import {
  noter, diversifier, ordreTotal, ordreElegance, ordreTriptyques, REGLAGES,
} from './score.js';
import { emploieUneFicelle } from './elegance.js';
import { construireScenario } from './scenario.js';
import { titreApproche, regleApproche, titreBilingue, regleBilingue, nommer } from './titres.js';
import {
  lire, ecrire, descripteursDe, retouchesDe, ecrireRetouches, BANDEAUX,
} from './url.js';
import { CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES } from './cible.js';

export { LIMITE_SAISIE, BANDEAUX, REGLAGES };
export { CIBLE_DEFAUT, normaliserCible, lireCible, MAX_CHIFFRES };

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
 * ★ `retouches: true` BRANCHE l'étage amont du GROUPEMENT — « on chiffre un
 *   mot, puis on lit tout » (`assemblage.js › groupementsRetouches`). Il est
 *   débranché par défaut tant que le barème ne charge pas cet étage-là ; la
 *   raison complète est écrite au point d'appel, et le chemin pour le brancher
 *   dans `.planning/A-VENIR-retouches.md`.
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

  const contexteBase = (cbl) => ({
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
  });

  /**
   * Pipeline complet. Ne rend JAMAIS la main bredouille (§5) — **quand la cible
   * vaut 666**. Voir `assemblage.js › approcheJoker` : le dernier recours du
   * site est une propriété du français, pas des chiffres.
   *
   * @param {string} saisieBrute
   * @param {{cible?:import('./cible.js').Cible|string}} [optionsResolution]
   */
  function resoudre(saisieBrute, optionsResolution = {}) {
    const cbl = normaliserCible(optionsResolution.cible ?? options.cible);
    const saisie = String(saisieBrute ?? '').normalize('NFC'); // §4.4 règle 5
    if (!saisie.length) {
      return { saisie, cible: cbl, approches: [], fragments: [], dedie: null, vide: true };
    }
    if (saisie.length > LIMITE_SAISIE) {
      return {
        saisie: saisie.slice(0, LIMITE_SAISIE), cible: cbl,
        approches: [], fragments: [], dedie: null, vide: false,
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
    const debutRecherche = filetTemporel ? maintenant() : 0;
    const budgetTotal = options.budgetTotalMs ?? BUDGET_TOTAL_MS;
    const travailTotal = options.budgetTravailTotal ?? BUDGET_TRAVAIL_TOTAL;
    let cherches = 0;
    let travailRestant = travailTotal;
    let tronqueTravail = false;  // borne déterministe atteinte : reproductible
    let tronqueTemps = false;    // filet de sécurité : à signaler à l'utilisateur
    for (const f of ordreDeRecherche(frags)) {
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
        ?? (epuise ? BUDGET_TRAVAIL_RESERVE : BUDGET_TRAVAIL);
      ctxRecherche.budgetMs = options.budgetMs ?? BUDGET_MS_FILET;
      const avant = ctxRecherche.travail || 0;
      parFrag.set(cle, chercherSix(f.texte, ctxRecherche));
      travailRestant -= (ctxRecherche.travail || 0) - avant;
      cherches++;
    }
    if (ctxRecherche.tronque && !ctxRecherche.tronqueTemps) tronqueTravail = true;
    if (ctxRecherche.tronqueTemps) tronqueTemps = true;

    // ★ `retouches` BRANCHE l'étage amont du GROUPEMENT (`assemblage.js ›
    //   groupementsRetouches`). Il est DÉBRANCHÉ par défaut, pour deux raisons
    //   dont la première suffirait — et aucune n'est un doute sur le générateur,
    //   que trois tests éprouvent.
    //   1. Le barème ne voit PAS les opérations d'une retouche : elles voyagent
    //      à côté des parts, jamais dedans (voir `rejouer`). Une voie retouchée
    //      est donc notée comme si son étage amont était gratuit, et sur
    //      « Donald Trump » cela suffit à sortir des DEUX premières lignes la
    //      voie que l'auteur a nommée lui-même — un arbitrage qui ne revient pas
    //      au moteur.
    //   2. Le budget n'a plus la place : +64 ms mesurés sur la saisie la plus
    //      lourde du banc, qui consomme déjà 960 ms sur les 1 000 du contrat.
    //   Le chemin pour le brancher est écrit dans `.planning/A-VENIR-retouches.md`.
    const ctxAssemblage = {
      saisie, jetons, signifiants, catalogue, cible: cbl, retouches: options.retouches === true,
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
    const ctxScore = { saisie, signifiants, elegance: barèmeDElegance, cible: cbl };
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
    approches.sort(ordreTotal);

    // Le joker est affiché et assumé, en bas de liste (§0.4). Il n'est plus le
    // seul : le DÉCRET — un unique 6 recopié trois fois — porte désormais son
    // propre malus (`MALUS.decret`, ×0,40), si bien que le classement suffit à
    // le renvoyer en fond de liste sans qu'on ait à l'y pousser à la main. Ce
    // qui compte, et qui est vérifié plus bas, c'est qu'il ne passe JAMAIS
    // devant une approche qui produit réellement trois 6.
    const jokers = approches.filter((a) => a.mode === 'JOKER');
    const honnetes = approches.filter((a) => a.mode !== 'JOKER');
    const place = REGLAGES.MAX_APPROCHES - (jokers.length ? 1 : 0);
    const retenues = barèmeDElegance
      ? selectionner(honnetes, place)
      : diversifier(honnetes, { limite: place });
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
      a.urlSobre = ecrire({ saisie, retouches, fragments: descripteurs, registre: 'sobre', cible: cbl });
      a.urlScenique = ecrire({ saisie, retouches, fragments: descripteurs, registre: 'scenique', cible: cbl });
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
      urlResultats: ecrire({ saisie, cible: cbl }),
      tronque: tronqueTravail || tronqueTemps,
      tronqueTemps,
      ...(avertissement ? { avertissement } : {}),
    };
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
    const parCode = new Map(ops.map((o) => [o.code, o]));

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
      const chemin = executerProgramme(f.texte, desc.codes, parCode);
      if (!chemin) return { ok: false, raison: 'programme inapplicable', bandeau: BANDEAUX.codeInconnu };
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

      for (const fragment of portees) {
        const chemin = executerProgramme(fragment.texte, desc.codes, parCode);
        if (!chemin) return { ok: false, raison: 'programme inapplicable', bandeau: BANDEAUX.codeInconnu };
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
    noter(approche, { saisie: texte, signifiants: zonesSignifiantes(texte), cible: cbl });
    marquerLesCodes(approche);
    // Hors liste, il n'y a personne dont se distinguer : le titre est celui que
    // `titres.js` compose à partir de la seule signature du chemin.
    approche.titre = titreBilingue(approche);
    approche.regle = regleBilingue(approche);
    // Le registre du lien rejoué est celui qu'il porte : on ne le devine pas,
    // on le relit (`lecture.registre`, résolu par `url.js`).
    const registre = lecture.registre;
    const lien = { saisie, fragments: lecture.fragments, retouches: lecture.retouches, cible: cbl };
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

  return { resoudre, rejouer, scenarioDe, catalogue, bassin, cache, ops };
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
  // ★ **Et jamais une FICELLE.** Cette place-là ne récompense qu'une chose : le
  //   NOMBRE de séries qu'une méthode sait donner. Une ficelle n'en donne pas
  //   davantage, elle en FABRIQUE — en effaçant ce qui gêne (`mpf`, `m1s2`) ou
  //   en relisant la ligne jusqu'à ce qu'elle tombe juste (`mad`, `mrd`). La
  //   promouvoir ici afficherait « celle-ci en aligne une de plus » au-dessus
  //   d'une voie honnête, c'est-à-dire exactement l'inverse de ce que le barème
  //   vient de décider.
  //
  //   C'est la même règle que CONTRACTS §4.1 pose déjà pour la MOISSON —
  //   « aucune ficelle dans une moisson ; le mode vaut par ce que chaque portée
  //   SAIT donner » —, appliquée à l'autre endroit où la quantité est mise en
  //   avant pour elle-même. Les ficelles restent pleinement éligibles à la
  //   première place (l'élégance) et au mixte : c'est là qu'elles se font juger
  //   sur le solde, ce qu'elles doivent.
  //
  //   ⚠️ MESURÉ, et c'est ce qui a imposé la règle : sur « Millicent »,
  //   `fr13+tca+mx6+mrd` (trois séries, élégance 1 278) prenait la seconde place
  //   au-dessus de `fr13+tca+mx6+mrn` (deux séries, élégance 1 310) — et la liste
  //   affichait deux séries au rang 1 puis trois au rang 2, un compte qui
  //   REMONTE, ce qu'un test de classement interdit depuis toujours
  //   (`recherche.test.js`).
  const fournie = approches.slice()
    .filter((a) => !emploieUneFicelle(a.bilan))
    .sort(ordreTriptyques)[0];
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

function executerProgramme(texte, codes, parCode) {
  let courant = etat('STR', String(texte).normalize('NFC'), [[0, texte.length]]);
  const chemin = { ops: [], etats: [courant], valeur: null, cout: 0 };
  for (const code of codes) {
    const op = parCode.get(code);
    if (!op) return null;
    const apres = appliquerOp(op, courant);
    if (apres === null) return null;
    chemin.ops.push(op);
    chemin.etats.push(apres);
    chemin.cout += op.cout || 0;
    courant = apres;
  }
  chemin.valeur = courant.type === 'NUM' ? courant.valeur : null;
  return chemin;
}

// ══════════════════════════════════ interface postMessage (inline en v1)

/**
 * Protocole : `{type:'resoudre', generation, saisie}` →
 *   `{type:'resultat', generation, …}` ou `{type:'erreur', generation, message}`.
 * Le compteur `generation` permet d'annuler les recherches obsolètes quand
 * l'utilisateur continue de taper (équivalent d'un AbortController).
 */
export function creerCanal(moteur, poster) {
  let generation = 0;
  const envoyer = poster || ((m) => m);
  return {
    get generation() { return generation; },
    /** À brancher sur `worker.onmessage` le jour où l'on passe au Worker. */
    traiter(message) {
      if (!message || message.type !== 'resoudre') return null;
      generation = message.generation ?? generation + 1;
      try {
        const r = moteur.resoudre(message.saisie);
        return envoyer({ type: 'resultat', generation, ...serialisable(r) });
      } catch (err) {
        return envoyer({ type: 'erreur', generation, message: err.message });
      }
    },
    demander(saisie) {
      return this.traiter({ type: 'resoudre', generation: ++generation, saisie });
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
