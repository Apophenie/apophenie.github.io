// src/recherche/assemblage.js
// Jointure sur signature de méthode : comment trois 6 deviennent un 666.
// CONTRACTS.md §5 · research/heuristique.md §3.4.
//
// ── LA CIBLE, ET CE QU'ELLE CHANGE ICI ─────────────────────────────────────
//
// Ce module a été écrit pour un seul nombre. Il compte des 6, les groupe par
// trois, et appelle « série » le résultat. Rien de tout cela n'était faux — mais
// rien de tout cela n'était général, et l'auteur demande désormais de viser
// `111`, `777`, `13`, `007` ou `000`.
//
// La généralisation tient en une reformulation, et une seule (`cible.js` :
// `seriesDe`). L'ancienne question était « quels index portent un 6 ? », suivie
// d'une division par trois. La nouvelle est « quelles positions, lues de gauche
// à droite, ÉCRIVENT la cible ? ». Sur `666` les deux formulations rendent le
// même résultat, index pour index : chercher « six, puis six, puis six » ne peut
// prendre que des 6, dans l'ordre où ils viennent. C'est ce repli exact qui
// autorise le remplacement, et c'est lui qu'un test tient.
//
// Trois conséquences, qu'on assume :
//
//  · **Les modes à plusieurs parts ont désormais `cible.longueur` parts**, pas
//    trois. Une cible de deux chiffres se partitionne en deux morceaux, une de
//    six en six. Et la part de rang `i` doit rendre le chiffre `cᵢ` : sur
//    `007`, le premier morceau donne 0, le deuxième 0, le troisième 7. Sur une
//    cible homogène, cette contrainte est vide — d'où la non-régression.
//  · **La RÉSONANCE exige une cible homogène.** Elle repose sur « le même
//    programme appliqué aux trois occurrences du même motif » ; un même
//    programme sur un même texte rend un même chiffre, et ne peut donc pas
//    écrire `007`. Ce n'est pas une limite d'implémentation, c'est ce que le
//    mode SIGNIFIE.
//  · **La garantie « jamais bredouille » (§5.3) reste une garantie sur 666.**
//    Le joker français itère `n → nombre de lettres de son nom`, dont le cycle
//    attracteur est 4 → 6 → 3 → 5 → 4 : il atteint 3, 4, 5 et 6, et rien
//    d'autre. Viser `111` ou `007` peut donc légitimement ne rien rendre, et la
//    page de résultats le dit au lieu de faire semblant.
//
// Le README insiste : « idéalement 3 d'affilée, idéalement selon la même
// méthode ». Prendre le meilleur chemin de chaque fragment indépendamment
// produit trois méthodes hétéroclites — peu convaincant. On joint donc les
// index de chemins par SIGNATURE DE MÉTHODE : une intersection de tables de
// hachage, O(nb de chemins), quasi gratuite.

import {
  signature, comparerCodes, scorePartiel, maniere, normaliserCurseurs, auDefaut, longueurRendue,
} from './score.js';
import {
  A_MERITER_SA_PLACE, OPERATEURS_QUI_ECARTENT, FICELLES, nbTriptyques, compterTraductionsDivergentes,
} from './elegance.js';
import {
  CIBLE_DEFAUT, normaliserCible, seriesDe, indexUtiles, ecrit, profilDeCible,
  verdict as ecrireVerdict,
} from './cible.js';
import { politique } from './politique.js';
import {
  appliquerOp, etat, normaliserCatalogue, operateursPourCible,
  cleEtat, cleTrace, rendreValeur, codeAvant,
} from './bfs.js';
// L'étage des RETOUCHES réécrit la saisie, donc il la re-tokenise : une portée
// d'URL se compte en jetons (§4.2), et ceux du texte réécrit ne sont pas ceux
// du texte tapé. `fragments.js` ne dépend que de `bfs.js` — aucun cycle.
import { tokeniser } from './fragments.js';
import { MAX_SERIES } from '../config.js';
import {
  axesIntermediaires, noteDeQualite, partDesSieges, siegeDeQualite, reserveDeQualite, litTout,
} from './score-intermediaire.js';

/**
 * Modes d'assemblage, du plus convaincant au moins :
 *  MOISSON     des 6 récoltés sur des PORTÉES DISJOINTES — chaque jeton donne
 *              les siens, aucun caractère ne sert deux fois — puis groupés par
 *              trois (voir ci-dessous)
 *  RESONANCE   les 3 fragments sont littéralement le même texte, répété (le cas
 *              `hope-hope-hope` du README) — bonus +8
 *  DIRECT      un seul chemin passe littéralement par 666
 *  GROUPEMENT  un seul calcul rend un VECTEUR qui porte déjà trois 6 ou plus ;
 *              on les groupe par trois (voir ci-dessous)
 *  CONVERGENCE la MÊME chaîne, prise de trois manières DIFFÉRENTES, qui tombent
 *              toutes trois sur 6 (voir ci-dessous)
 *  PARTITION   trois morceaux contigus qui couvrent la saisie
 *  SIX_OFFERT  au moins deux « 6 offerts » (tirets de la touche AZERTY, 6 littéral)
 *  LIBRE       trois fragments disjoints non couvrants — malus ×0,80
 *  JOKER       le terminateur français, dernier recours — malus ×0,45
 *
 * ── Ce qui a DISPARU : le triplement, dit « décret ». ────────────────────────
 * Un mode obtenait UN seul 6 sur la saisie entière et l'écrivait trois fois par
 * convention. Il avait d'abord été pénalisé (`MALUS.decret`, ×0,40) sous un
 * intitulé qui l'avouait — « le même 6, trois fois ». L'aveu ne suffit pas : la
 * démarche n'est pas vraisemblable, et une liste où douze lignes sur douze
 * décrètent leurs deux derniers 6 ne démontre rien. Il n'est plus PRODUIT.
 *
 * Le mode `DECRET` subsiste comme DIAGNOSTIC — `deduireMode` le pose encore,
 * `assembler` le jette, et `rejouer` le reconnaît pour qu'un lien partagé avant
 * ce changement continue de s'ouvrir plutôt que d'échouer (CONTRACTS §4.3,
 * lecture tolérante). C'est la seule porte qui lui reste, et elle ne va que dans
 * un sens : rien ne la fabrique.
 *
 * ── Ce qui le remplace sur une saisie courte : le GROUPEMENT. ───────────────
 * `hope` sous l'afficheur quatorze segments donne `[6,6,6,6]` : quatre 6 en un
 * seul geste, parce que six segments dessinent D, E, G, H, N, O comme P. Le
 * moteur les réduisait à un seul (moyenne, somme puis racine…) et décrétait les
 * deux autres. Il les GROUPE désormais par trois : trois 6 réellement calculés,
 * montrés côte à côte, et le reste tombe.
 *
 * ── Et la CONVERGENCE, l'autre héritière du décret. ─────────────────────────
 * « Pour les saisies courtes, l'idée sera d'utiliser la séquence complète de
 * trois manières différentes, pour produire les 6 6 6. » — l'auteur.
 *
 * La distinction avec le décret est exactement celle qui manquait : le décret
 * appliquait LE MÊME calcul trois fois et n'en démontrait qu'un ; la convergence
 * applique TROIS calculs distincts, et chacun des trois 6 est gagné. Sur
 * `hope` : les quatorze segments donnent 6, le compte des lettres et des
 * voyelles donne 6, la numérologie chaldéenne donne 6.
 *
 * Trois manières DIFFÉRENTES, pas trois codes différents : « segments
 * allumés », « traits fusionnés » et « traits en capitale » ne font qu'une seule
 * manière aux yeux d'un lecteur. C'est `score.js › maniere` qui tranche.
 *
 * ── Et la MOISSON, qui les surclasse toutes. ────────────────────────────────
 * « Privilégie celle qui donne le plus de séries de 666 sans réutiliser les
 * mêmes caractères, puis les plus simples qui donnent 666, et enfin celles qui
 * réutilisent les mêmes lettres de manières différentes. » — l'auteur.
 *
 * Le GROUPEMENT ne récolte que dans UN vecteur, donc sous UNE méthode : sur
 * `hope-hope-hope.fr`, le quatorze segments rend douze 6 sur les lettres, mais
 * il cale sur les tirets (aucun segment ne dessine un `-`) et sur `fr`. Ces
 * trois 6 manquants existent pourtant — le tiret est sur la touche du 6 en
 * AZERTY, et `fr` vaut 4 + 2 en sept segments. Ce qui les empêchait de
 * rejoindre les douze autres n'était pas l'arithmétique : c'était de vouloir
 * les tirer d'un seul programme.
 *
 * La moisson les tire de plusieurs, un par PORTÉE. Les jetons de la saisie sont
 * naturellement disjoints — `0.1` les lettres du premier `hope`, `1.1` le
 * premier tiret, `6.1` le `fr` —, et la grammaire d'URL sait déjà écrire une
 * portée par fragment (§4.2). Il n'y a donc rien à exprimer comme « toutes les
 * lettres sauf les séparateurs » : il y a six portées, six programmes, et
 * quinze 6 dont aucun ne recompte un caractère déjà compté.
 *
 * Le choix des portées est un PROBLÈME D'ORDONNANCEMENT PONDÉRÉ : chaque
 * intervalle de jetons rapporte le nombre de 6 de son meilleur programme, et
 * l'on cherche la famille disjointe qui en rapporte le plus. Une programmation
 * dynamique sur les jetons le résout exactement, en O(jetons × candidats), sans
 * énumérer les 2ⁿ familles.
 */
export const MODES = ['MOISSON', 'RESONANCE', 'DIRECT', 'GROUPEMENT', 'CONVERGENCE', 'PARTITION', 'SIX_OFFERT', 'LIBRE', 'JOKER'];

/**
 * Trois 6 font un 666 — l'unité de regroupement DE LA CIBLE PAR DÉFAUT.
 *
 * ★ Ce n'est plus une loi, c'est un défaut. La longueur d'une série est celle
 * de la cible (`cible.longueur`) : deux pour `13`, trois pour `666` et `007`.
 * La constante subsiste parce qu'elle est exportée, lue par `scenario.js` et
 * gelée par un test — et parce qu'elle reste vraie de la seule cible que le
 * site promette dans son titre.
 */
export const SERIE = 3;

// ⚠️ **CE HUIT ÉTAIT LE PLAFOND LE PLUS BAS DE TOUTE LA CHAÎNE, et le plus
//   silencieux.** Il reste le défaut — une recherche qui n'annonce pas son cran
//   travaille comme avant —, mais `ctx.parFragment` le relève désormais avec le
//   curseur de fouille (`config.js › largeurDAssemblage`).
const K_PAR_FRAGMENT = 8;   // chemins retenus par fragment pour l'assemblage
const MAX_PARTITIONS = 200; // garde-fou combinatoire
const MAX_LIBRES = 12;      // C(12,3) = 220 combinaisons

/**
 * Bornes du GROUPEMENT et de la MOISSON.
 *
 * `MAX_SERIES` plafonne le nombre de 666 montrés d'un coup. Rien n'interdit
 * arithmétiquement d'en aligner huit sur un paragraphe ; la scène, elle, doit
 * rester lisible, et le verdict tenir sur une ligne.
 *
 * Il valait 4 — « au plus 666 666 666 666 ». Il vaut 6 : `hope-hope-hope.fr`
 * en aligne cinq (douze lettres en quatorze segments, deux tirets par la touche
 * du 6, `fr` par le sept segments), et `https://hope-hope-hope.fr/` en aligne
 * six, le schéma en donnant trois de plus. Plafonner à 4 aurait consisté à
 * jeter deux séries démontrées ; `reveal` (moteur visuel) met le verdict à
 * l'échelle de la scène, dix-huit chiffres tiennent donc dans le cadre comme
 * trois — plus petits, mais entiers.
 *
 * ★ **IL VAUT 9, ET LA RAISON A CHANGÉ DE NATURE.** J'avais écrit « au-delà de
 *   six, ce n'est plus une chute, c'est un tableau : la borne reste ». La borne
 *   n'est pas restée, parce que l'argument était faux : une borne de LISIBILITÉ
 *   n'a aucune raison de s'appliquer au COMPTAGE. En rabotant `series`, elle ne
 *   rendait pas la scène plus lisible — le verdict affiche ce que la ligne
 *   porte —, elle faisait mentir le score sur ce que la voie avait démontré.
 *
 *   Mesuré : `0.1:fr14+tca+m14+mpf,3.1+5.1+7.1:ffr3+tca+m14+mpf,4.1+6.1:tca+mtc+cs,9.1:fr9+tca+m7`
 *   sur `https://hope-hope-hope.fr/` récolte VINGT-TROIS 6, soit sept séries et
 *   deux surnuméraires. Le plafond en annonçait six et jetait la septième :
 *   « le verdict ne le gère pas et détruit tout ce qui dépasse 6×666 — à
 *   corriger » (l'auteur). C'est corrigé, et la scène compile ses sept séries.
 *
 *   Neuf, et non `Infinity`, parce que `seriesDe` s'en sert aussi comme sortie
 *   anticipée : c'est un garde-fou de balayage, pas un jugement esthétique. Ce
 *   qui déborde vraiment le cadre est l'affaire de `reveal`, qui met à
 *   l'échelle, et lui seul est en position d'en juger.
 */
const MAX_FRAGMENTS_VECTEUR = 6;    // fragments soumis à l'énumération des vecteurs
const MAX_VECTEURS_PAR_FRAGMENT = 8; // = K_PAR_FRAGMENT : même largeur que le reste
// `MAX_SERIES` vit dans `config.js` — voir l'import en tête et le pavé là-bas.
const MAX_CONVERGENCES = 3;         // trios de manières distinctes par fragment

/**
 * Bornes propres à la MOISSON.
 *
 * L'énumération des vecteurs coûte ~1 500 applications d'opérateurs par portée
 * (mesuré : 3 ms sur un jeton d'une à cinq lettres). On la borne au nombre de
 * jetons, pas à leur longueur : c'est le seul paramètre qui puisse s'emballer.
 */
const MAX_JETONS_MOISSON = 24;      // portées atomiques soumises à l'énumération
/**
 * ★ Programmes retenus par portée. **Passé de 6 à 10 le jour où le catalogue a
 * gagné une FORME de programme**, et c'est la raison, pas un ajustement.
 *
 * Cette fenêtre ne borne pas un nombre de résultats mais une DIVERSITÉ : elle
 * doit tenir les façons distinctes d'attaquer une même portée. Tant qu'il y en
 * avait quatre — filtre, découpe, mappeur, raffinage —, six places suffisaient
 * avec de la marge. L'étage de rangement (TOKENS → TOKENS) en ajoute une
 * cinquième, et chaque programme existant a désormais un jumeau rangé : à six
 * places, les jumeaux occupaient la fenêtre et **évinçaient leurs aînés**.
 *
 * ⚠️ BALAYAGE COMPLET sur `Donald Trump` — 6, 8, 10, 12, 15, 20. Trois régimes,
 * et pas une pente :
 *
 *   · **6 et 8** — le jumeau rangé `tca+mtal+m14,tca+mtal+mx6+mrn` prend la
 *     tête : il aligne plus de 6, donc il gagne le tri, mais il tombe à **446**
 *     d'élégance. La voie de référence de l'auteur DISPARAÎT à 6, revient en 2ᵉ
 *     à 8.
 *   · **10** — la voie de référence (`tca+m14+m36,fr13+tca+m14+m36`, **743**)
 *     reprend la tête.
 *   · **12, 15, 20** — classement identique aux trois valeurs, et une voie que
 *     les fenêtres étroites CACHAIENT prend la tête :
 *     `fatb+tca+mt9+mr9,tca+msfr+cp`, **1 082** d'élégance et **4 862** de score
 *     — meilleure que la référence sur les DEUX tableaux (743 / 4 722), qui
 *     reste alors en 2ᵉ ligne.
 *
 * `Macron` ne bouge à aucune des six valeurs.
 *
 * ★ **ET LA FENÊTRE NE COÛTE RIEN** — elle découpe une liste déjà calculée. Pire
 * temps CPU, JIT chaud, sur les trois saisies les plus lourdes du banc : 250 ms
 * à 10, 307 à 12, 253 à 15, 242 à 20. Aucune tendance. Le seul coût visible est
 * celui du DÉMARRAGE À FROID, que le test de budget mesure en même temps que le
 * calcul : à 12, ce premier appel franchit la seconde alors que le calcul chaud
 * n'a pas bougé.
 *
 * Reste donc 10, en attendant l'arbitrage : c'est un choix de VITRINE — laisser
 * la voie nommée par l'auteur en tête, ou laisser sortir celle qui la bat.
 */
const MAX_CANDIDATS_PORTEE = 10;

/** Combien de vecteurs déjà calculés on retente avec l'absorption additive
 *  quand le faisceau n'en a produit aucune (voir le rattrapage, plus bas). */
const RATTRAPAGE_ADDITIF_MAX = 40;
// Les chaînes qu'on accepte de relire sous une substitution. Douze, mesuré :
// au-delà, le gain tombe à zéro et le coût continue de monter.
const RATTRAPAGE_SUBSTITUTION_MAX = 12;

/**
 * Bornes de l'étage des RETOUCHES (voir `groupementsRetouches`).
 *
 * Elles bornent un PRODUIT — mots × filtres × vecteurs — et non trois listes
 * indépendantes : c'est le produit qui décide du coût, et le catalogue fournit
 * déjà les vingt et un filtres `STR → STR` sans qu'on ait rien à dire.
 *
 * Six mots et quatre vecteurs, donc au plus 504 programmes rejoués. Le budget du
 * pipeline complet est d'une seconde, et la saisie la plus lourde du banc en
 * consomme déjà l'essentiel — d'où des bornes serrées plutôt que généreuses. Ce
 * qu'elles coûtent malgré tout est mesuré dans `.planning/A-VENIR-retouches.md`.
 *
 * ★ **ELLES SUIVENT LE CRAN** — `config.js › motsARetoucher`,
 *   `vecteursARetoucher`, et ces deux constantes n'en sont plus que la valeur au
 *   cran 0 (vérifié égales par `lents/curseurs.test.js`). Elles avaient été laissées fixes
 *   parce qu'en suivant le cran elles changeaient le quatuor de tête et faisaient
 *   disparaître sept voies retouchées de « Millicent Billette » visant 1998 aux
 *   crans du haut. La recherche cumulative a retiré l'objection : la liste d'un
 *   cran est l'union des sélections des crans inférieurs (`index.js ›
 *   deroulerResolution`), une voie montrée plus bas ne peut plus disparaître.
 */
export const MAX_JETONS_RETOUCHE = 6;
export const MAX_VECTEURS_RETOUCHES = 4;

/** L'opérateur « trois 6 d'affilée » — voir `prefererLeTriptyqueMontre`. */
const ID_TRIPTYQUE = 'm.troisSixDAffilee';
const MAX_MOISSONS = 4;             // variantes rendues (la maximale + les homogènes)

/**
 * Index d'un fragment : ses chemins rangés par signature de méthode.
 *
 * ★ `chiffre` filtre sur la valeur ATTEINTE. Les modes à plusieurs parts
 * assignent un chiffre de la cible à chaque part — le premier morceau de `007`
 * doit rendre 0, le dernier 7 — et la jointure sur signature ne doit apparier
 * que des chemins qui remplissent leur case. Sur une cible homogène, ou quand
 * `chiffre` vaut `null`, le filtre ne retire rien.
 */
function indexer(chemins, chiffre = null) {
  const parSig = new Map();
  for (const c of chemins) {
    if (chiffre !== null && valeurFinale(c) !== chiffre) continue;
    const s = signature(c);
    if (!parSig.has(s)) parSig.set(s, []);
    parSig.get(s).push(c);
  }
  return parSig;
}

function meilleur(chemins) {
  let m = null;
  for (const c of chemins) {
    if (!m) { m = c; continue; }
    const sa = scorePartiel(c);
    const sm = scorePartiel(m);
    if (sa > sm || (sa === sm && comparerCodes(c.ops.map((o) => o.code), m.ops.map((o) => o.code)) < 0)) m = c;
  }
  return m;
}

function approche(mode, parts, extra = {}) {
  return { mode, parts, resonance: false, ...extra };
}

// ══════════════════════════════════ la LIAISON : deux mots, deux nombres, une division

/**
 * ★ **« JAMES BOND » VAUT 007 — deux résultats réunis sur la ligne assemblée.**
 *
 * > « Un exemple que je trouverais magistral : "James Bond" : James converti en
 * >   un nombre qui, divisé par le nombre issu de Bond, donne pile 007. »
 * >   (l'auteur)
 *
 * Tous les autres modes demandent à chaque part d'ÉCRIRE un morceau de la
 * cible. Ici aucune ne le fait : « James » rend 126, « Bond » rend 18, et c'est
 * un opérateur de LIAISON (`op.liaison`, `mappeurs.js › operateurDivisionDeDeux`)
 * qui les réunit — `126 ÷ 18` posé à la potence, `0 0 7`.
 *
 * ★ **POURQUOI PAS LE BFS.** Il ne rend que des chemins qui finissent sur un
 *   chiffre de la cible (`bfs.js › rechercheBrute`), et 126 n'en est pas un ;
 *   MESURÉ en visant 126 exprès, même à seize fois le budget, il n'atteint pas
 *   `fr21+tca+mx6+cali` — le balayage des César le noie. On déroule donc la même
 *   forme fermée que le groupement (`vecteursDeSix` : filtre, découpe, mappeur,
 *   raffinage), suivie d'un combinateur `NUMS → NUM` : c'est exhaustif sur cette
 *   forme, sans horloge, et la TABLE qui en sort — valeur → programmes — ne
 *   dépend que du mot et de la cible. Elle se garde dans le cache du moteur.
 *
 * ★ **LA JOINTURE N'ESSAIE PAS TOUTES LES PAIRES.** Deux mille valeurs de part et
 *   d'autre feraient quatre millions de divisions. Mais une potence qui écrit la
 *   cible `C` (lue comme l'entier `N`) avec `k` décimales vérifie
 *   `A·10ᵏ ∈ [N·B, (N+1)·B)` — les zéros de tête ne changent pas la valeur lue.
 *   Pour chaque `B`, les `A` possibles tiennent donc dans un intervalle, qu'on
 *   cherche par dichotomie ; chacun est ensuite VÉRIFIÉ par l'opérateur lui-même,
 *   qui seul sait ce qu'il écrit.
 *
 * ★ **LE MÊME PROGRAMME D'ABORD.** « Idéalement selon la même méthode » (le
 *   README) : les paires qui lisent les deux mots de la même façon passent
 *   devant, et ce sont elles que la jointure cherche en premier —
 *   `fr21+tca+mx6+cali` sur « James » et sur « Bond ».
 *
 * ⚠️ **LES BORNES, ET CE QU'ELLES COÛTENT.** Une table coûte une à deux secondes
 *   à froid par mot (mesuré : 1,9 s + 0,7 s pour « James », 0,7 s + 0,5 s pour
 *   « Bond »). La liaison ne se cherche donc que pour une cible chiffrée
 *   DEMANDÉE — jamais pour le 666 par défaut, dont chaque recherche paierait le
 *   prix —, sur deux ou trois mots, par paires voisines, dans l'ordre de
 *   lecture. Élargir est une décision à mesurer, pas une ligne à changer.
 */
const LIAISON_MOTS_MAX = 3;
const LIAISON_PAR_VALEUR = 3;
const LIAISON_VOIES = 6;

/** Les valeurs d'une liste TRIÉE qui tombent dans `[lo, hi]`. */
function dansIntervalle(tries, lo, hi) {
  let g = 0;
  let d = tries.length;
  while (g < d) {
    const m = (g + d) >> 1;
    if (tries[m] < lo) g = m + 1; else d = m;
  }
  const out = [];
  for (let i = g; i < tries.length && tries[i] <= hi; i++) out.push(tries[i]);
  return out;
}

/** Deux chemins, le plus court d'abord, puis l'ordre des codes (§4.4). */
function comparerLiaison(a, b) {
  return a.ops.length - b.ops.length
    || comparerCodes(a.ops.map((o) => o.code), b.ops.map((o) => o.code));
}

/**
 * Ce qu'un mot SAIT donner comme nombre entier : valeur → ses meilleurs
 * programmes, et programme → sa valeur. Gardée dans le cache du moteur.
 */
function tableDeValeurs(texte, explorables, combinateurs, cbl, cache) {
  // ★ Le jeu d'opérateurs entre dans la clé : il dépend du cran (`op.desLeCran`).
  const cle = `liaison|${cbl.texte}|${texte.normalize('NFC')}|${cleDesOps(explorables)}`;
  if (cache && cache.has(cle)) return cache.get(cle);
  const vecteurs = vecteursDeSix(texte, explorables, 0, 1e6, cbl, { miseEnForme: false, tousLesReglages: true });
  const parCodes = new Map();
  const parValeur = new Map();
  for (const c of vecteurs) {
    const fin = c.etats[c.etats.length - 1];
    for (const o of combinateurs) {
      const e = appliquerOp(o, fin);
      if (!e || e.type !== 'NUM' || !Number.isInteger(e.valeur) || e.valeur < 0) continue;
      const chemin = { ops: [...c.ops, o], etats: [...c.etats, e], valeur: e.valeur, cout: (c.cout || 0) + 1 };
      const codes = chemin.ops.map((x) => x.code).join('+');
      if (!parCodes.has(codes)) parCodes.set(codes, chemin);
      const l = parValeur.get(e.valeur) || [];
      l.push(chemin);
      l.sort(comparerLiaison);
      if (l.length > LIAISON_PAR_VALEUR) l.length = LIAISON_PAR_VALEUR;
      parValeur.set(e.valeur, l);
    }
  }
  const table = { parCodes, parValeur, valeursTriees: [...parValeur.keys()].sort((x, y) => x - y) };
  if (cache) cache.set(cle, table);
  return table;
}

/**
 * Les approches à LIAISON d'une saisie : deux mots voisins, un opérateur qui
 * réunit leurs nombres et écrit EXACTEMENT la cible.
 *
 * @param {Object[]} fragments
 * @param {{catalogue:Object, cache?:Map}} ctx
 * @param {Object} cbl  la cible normalisée
 * @returns {Object[]} approches non notées, mode `OPERATION`
 */
export function liaisons(fragments, ctx, cbl) {
  // ★ UNE LIAISON ÉCRIT DES CHIFFRES, ET RIEN D'AUTRE. Un texte ne se cherche
  //   pas tel quel (`nature === 'mot'`) ; et la cible SOUS-JACENTE d'une
  //   relecture peut être une suite de VALEURS — « 4.9.1.2.12.5 », les rangs de
  //   « Diable » —, que la potence ne sait pas viser : elle pose un quotient
  //   chiffre à chiffre, pas des nombres de deux chiffres.
  //   ⚠️ Le refus était SILENCIEUX et accidentel : `Number('4.9.1.2.12.5')`
  //     vaut NaN, les bornes de l'intervalle valaient NaN, et la recherche n'y
  //     trouvait rien sans que personne l'ait décidé. En entiers exacts, le
  //     même appel LÈVE — c'est ce qui l'a révélé. On le refuse donc ici, en le
  //     disant, plutôt que par un NaN qui traverse trois calculs.
  if (!ctx || !ctx.catalogue || !politique(profilDeCible(cbl)).liaison) return [];
  const lieurs = normaliserCatalogue(ctx.catalogue).filter((o) => o && o.liaison);
  if (!lieurs.length) return [];
  const mots = fragments.filter((f) => f.famille === 'unite').sort((a, b) => a.offset - b.offset);
  if (mots.length < 2 || mots.length > LIAISON_MOTS_MAX) return [];
  const explorables = operateursPourCible(ctx.catalogue, cbl, ctx.cran ?? 0);
  const combinateurs = explorables.filter((o) => o.from === 'NUMS' && o.to === 'NUM');
  const tables = mots.map((f) => tableDeValeurs(f.texte, explorables, combinateurs, cbl, ctx.cache));
  const attendu = cbl.chiffres.join('');
  // ★ EN ENTIERS EXACTS (BigInt) : une cible de vingt chiffres dépasse 2⁵³, et
  //   `N · b` en flottant arrondirait l'intervalle — donc manquerait des A, en
  //   silence. Les bornes se calculent exactement ; seules celles qui tiennent
  //   dans un entier sûr peuvent contenir une valeur de table.
  const N = BigInt(cbl.texte);
  const SUR = BigInt(Number.MAX_SAFE_INTEGER);

  const candidats = [];
  const vus = new Set();
  const retenir = (i, op, cA, cB, meme) => {
    const cle = `${i}|${op.code}|${cA.ops.map((o) => o.code).join('+')}|${cB.ops.map((o) => o.code).join('+')}`;
    if (vus.has(cle)) return;
    vus.add(cle);
    candidats.push({ i, op, cA, cB, meme });
  };
  for (let i = 0; i + 1 < mots.length; i++) {
    const TA = tables[i];
    const TB = tables[i + 1];
    for (const op of lieurs) {
      const ecrit = (a, b) => {
        const r = op.apply([a, b], []);
        return Boolean(r) && r.valeur.join('') === attendu;
      };
      // 1. le même programme sur les deux mots
      for (const [codes, cA] of TA.parCodes) {
        const cB = TB.parCodes.get(codes);
        if (cB && ecrit(cA.valeur, cB.valeur)) retenir(i, op, cA, cB, true);
      }
      // 2. deux programmes : pour chaque B, les A qui écrivent la cible
      for (const [b, cBs] of TB.parValeur) {
        if (b <= 0) continue;
        const B = BigInt(b);
        for (let k = 0; k <= 3; k++) {
          const p = 10n ** BigInt(k);
          const lo = (N * B + p - 1n) / p;         // ⌈N·b / 10ᵏ⌉
          const hi = ((N + 1n) * B - 1n) / p;      // ⌊((N+1)·b − 1) / 10ᵏ⌋
          if (lo > SUR) continue;
          for (const a of dansIntervalle(TA.valeursTriees, Number(lo), Number(hi > SUR ? SUR : hi))) {
            if (ecrit(a, b)) retenir(i, op, TA.parValeur.get(a)[0], cBs[0], false);
          }
        }
      }
    }
  }
  candidats.sort((x, y) => (x.meme === y.meme ? 0 : x.meme ? -1 : 1)
    || (x.cA.ops.length + x.cB.ops.length) - (y.cA.ops.length + y.cB.ops.length)
    || comparerLiaison(x.cA, y.cA) || comparerLiaison(x.cB, y.cB)
    || comparerCodes([x.op.code], [y.op.code]));
  return candidats.slice(0, LIAISON_VOIES).map((c) => approche('OPERATION', [
    { fragment: mots[c.i], chemin: c.cA },
    { fragment: mots[c.i + 1], chemin: c.cB },
  ], { liaison: Object.freeze({ code: c.op.code, op: c.op }) }));
}

// ══════════════════════════════════ le GROUPEMENT : des 6 par paquets de trois

/**
 * Les 6 que porte l'état final d'un chemin, groupés par trois.
 *
 * Un chemin ordinaire finit sur un `NUM` valant 6 : un seul 6, il n'y a rien à
 * grouper. Un chemin de GROUPEMENT s'arrête un cran plus tôt, sur le `NUMS` — le
 * vecteur d'avant la réduction —, et c'est là que les 6 sont en nombre.
 *
 * @param {Object} chemin
 * @returns {{indices:number[], series:number, disponibles:number}|null}
 */
export function serieDeSix(chemin, cible = CIBLE_DEFAUT) {
  if (!chemin || !chemin.etats || !chemin.etats.length) return null;
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin || fin.type !== 'NUMS') return null;
  const c = normaliserCible(cible);
  const series = seriesDe(fin.valeur, c, MAX_SERIES);
  if (!series.length) return null;
  return {
    indices: series.flat(),
    series: series.length,
    // « Disponibles » = ce qui aurait PU servir, quel que soit son rang. Sur
    // `666`, c'est le compte des 6, mot pour mot comme avant.
    disponibles: indexUtiles(fin.valeur, c).length,
  };
}

/**
 * Ce qu'un chemin apporte à une moisson : ses 6, et sur combien de valeurs.
 *
 * Un chemin ordinaire finit sur un `NUM` — il apporte un 6, ou rien. Un chemin
 * qui s'arrête sur le `NUMS` en apporte autant que le vecteur en porte, et
 * chacun vient d'un jeton distinct.
 *
 * ★ C'est le seul endroit où se vérifie la promesse « aucun caractère compté
 * deux fois ». Un mappeur du catalogue rend une valeur PAR JETON reçu ; on
 * l'exige plutôt que de le supposer, en comparant la largeur du vecteur à celle
 * du dernier état `TOKENS` traversé. Un opérateur qui dupliquerait ses jetons
 * ferait tomber le chemin de la moisson au lieu de lui offrir des 6 gratuits.
 *
 * @param {Object} chemin
 * @returns {{indices:number[], six:number, total:number}|null}
 */
export function sixDuChemin(chemin, cible = CIBLE_DEFAUT) {
  if (!chemin || !chemin.etats || !chemin.etats.length) return null;
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin) return null;
  const c = normaliserCible(cible);
  if (fin.type === 'NUM') {
    return c.alphabet.includes(fin.valeur)
      ? { indices: [0], six: 1, total: 1, chiffres: [fin.valeur] } : null;
  }
  if (fin.type !== 'NUMS') return null;
  const indices = indexUtiles(fin.valeur, c);
  if (!indices.length) return null;
  if (!uneValeurParJeton(chemin, fin)) return null;
  // ★ `chiffres` — la SUITE que la portée apporte, dans l'ordre de lecture.
  //   Compter ne suffit plus : sur `007`, deux portées qui rapportent chacune
  //   « un chiffre utile » n'écrivent pas la même chose selon que ce chiffre
  //   est un 0 ou un 7. La moisson concatène ces suites et lit le tout d'un
  //   trait (`compterMoisson`). Sur `666`, toutes ces suites ne portent que des
  //   6, et concaténer puis diviser par trois redonne l'ancien calcul.
  return {
    indices, six: indices.length, total: fin.valeur.length,
    chiffres: indices.map((i) => fin.valeur[i]),
  };
}

function uneValeurParJeton(chemin, fin) {
  for (let i = chemin.etats.length - 2; i >= 0; i--) {
    const e = chemin.etats[i];
    if (e.type === 'TOKENS') return fin.valeur.length <= e.valeur.length;
  }
  return true;
}

/**
 * ★ Des segments de phrase qui ne recopient rien : portées deux à deux
 * disjointes, et chacune APRÈS la précédente dans le texte — le verdict lit la
 * ligne dans l'ordre de la saisie, donc le premier segment doit y venir en
 * premier.
 */
export function segmentsSansCopie(parts) {
  if (!Array.isArray(parts) || !parts.length) return false;
  if (!parts.every((p) => p.fragment && Array.isArray(p.fragment.intervalles))) return false;
  if (!porteesDisjointes(parts)) return false;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].fragment.offset < parts[i - 1].fragment.offset + parts[i - 1].fragment.longueur) return false;
  }
  return true;
}

/** Deux fragments se recouvrent-ils, ne serait-ce que d'un caractère ? */
function porteesDisjointes(parts) {
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      if (chevauche(parts[i].fragment, parts[j].fragment)) return false;
    }
  }
  return true;
}

/**
 * La moisson d'une approche : combien de 6 elle récolte, sur combien de valeurs,
 * et combien de séries de trois cela fait.
 *
 * STRUCTUREL, comme tout ce qui décide d'un mode : une URL rejouée doit
 * retrouver le compte exact de la liste dont elle est issue (§4.3). Une part qui
 * n'apporte AUCUN 6 disqualifie l'approche entière — on ne fait pas figurer une
 * portée dans une moisson pour gonfler sa couverture.
 *
 * @param {Array<{fragment:Object, chemin:Object}>} parts
 * @returns {{six:number, total:number, series:number}|null}
 */
export function compterMoisson(parts, cible = CIBLE_DEFAUT) {
  if (!parts || parts.length < 2) return null;
  if (!parts.every((p) => p.fragment && Array.isArray(p.fragment.intervalles))) return null;
  if (!porteesDisjointes(parts)) return null;
  const c = normaliserCible(cible);
  let six = 0;
  let total = 0;
  const suite = [];
  for (const p of parts) {
    const s = sixDuChemin(p.chemin, c);
    if (!s) return null;
    six += s.six;
    total += s.total;
    suite.push(...s.chiffres);
  }
  // Les portées sont lues DANS L'ORDRE où elles seront montrées, et la cible
  // est cherchée sur la concaténation. Sur `666` cela vaut `six / 3` à
  // l'entier près — c'est exactement l'ancien calcul.
  const series = Math.min(seriesDe(suite, c, MAX_SERIES).length, MAX_SERIES);
  // ★ **LE SEUIL SUIT LA CIBLE, ET IL N'AVAIT JAMAIS DIT POURQUOI IL VALAIT 2.**
  //
  //   « Une seule série, c'est un 666 ordinaire » : la phrase est exacte, et
  //   c'est ce qui la rend LOCALE. Elle vaut parce que sur une cible homogène,
  //   une portée qui rapporte `longueur` chiffres utiles écrit la cible À ELLE
  //   SEULE — le GROUPEMENT le fait déjà, en un geste et sur une seule portée.
  //   Une moisson n'a donc de raison d'être que si elle en enchaîne DEUX.
  //
  //   Sur une cible mêlée, l'argument tombe : `01111984` demande un 0, quatre 1,
  //   un 9, un 8 et un 4 DANS CET ORDRE, et aucun vecteur du catalogue ne les
  //   écrit d'un trait (mesuré : zéro sur les six fragments de `Henri Prunelle
  //   Chochotte`). Une seule série y est déjà l'ouvrage conjoint de plusieurs
  //   portées — c'est-à-dire, très exactement, ce que ce mode existe pour
  //   montrer. Exiger d'en doubler la longueur reviendrait à demander seize
  //   chiffres à leur place pour accepter d'en montrer huit.
  //
  //   ⚠️ Repli EXACT sur 666 comme sur 111, 777 et 000 : toutes homogènes, le
  //     seuil y reste 2, et pas une moisson ne change.
  if (series < (c.homogene ? 2 : 1)) return null;
  return { six, total, series };
}

/**
 * Le verdict à afficher : `666`, ou `666 666` quand il y a de quoi — et `007`
 * ou `007 007` quand c'est ce qu'on visait.
 *
 * ★ L'écriture vient de la CIBLE, pas d'un littéral, et c'est pour ça qu'une
 * cible est une chaîne de chiffres et non un nombre : `Number('007')` vaut 7,
 * et afficher « 7 » là où l'on a promis « 007 » serait exactement le genre de
 * demi-mensonge que ce projet refuse.
 */
export function verdictDe(approche, cible = approche && approche.cible) {
  const n = approche && approche.series ? approche.series : 1;
  return ecrireVerdict(n, cible);
}

/**
 * Énumère les chemins qui MÈNENT à un vecteur portant au moins trois 6.
 *
 * Ils ne peuvent pas venir du BFS : celui-ci ne rend que des chemins terminés
 * sur un `NUM` valant 6 (`bfs.js › rechercheBrute`), et le vecteur intermédiaire
 * qui nous intéresse est justement ce qu'il s'empresse de réduire. On énumère
 * donc à part, sur une forme fermée et courte :
 *
 *     [un filtre] → une découpe → un mappeur → [un raffinage]
 *
 * C'est exhaustif sur cette forme, borné par le catalogue, et sans horloge : le
 * résultat ne dépend ni de la machine ni de ce qui a été cherché avant
 * (CONTRACTS §4.4). Les états `TOKENS` sont dédoublonnés par clé avant l'étage
 * des mappeurs — c'est ce qui empêche `fmaj+tca+m14` de doubler `tca+m14` quand le
 * filtre ne change rien aux jetons, et divise par quatre le coût de l'étage le
 * plus large.
 *
 * `minSix` vaut 3 pour le GROUPEMENT — il lui faut de quoi faire un 666 à lui
 * seul — et 1 pour la MOISSON, qui additionne ce que chaque portée rapporte :
 * sur `hope-hope-hope.fr`, le premier tiret n'apporte qu'un 6, et c'est
 * précisément ce 6-là qui manquait au quatorze segments pour boucler sa
 * cinquième série.
 *
 * @param {string} texte
 * @param {Object[]} ops  opérateurs explorables du catalogue
 * @param {number} [minSix]  nombre de 6 exigé du vecteur
 * @param {number} [plafond] chemins canonicalisés puis rendus
 * @returns {Object[]} chemins finissant sur un `NUMS` à ≥ minSix six, les meilleurs d'abord
 */
/** La clé d'une liste d'opérateurs pour le mémo de `vecteursDeSix` : ses codes,
 *  dans l'ordre. Calculée une fois par liste — la même liste revient à chaque
 *  mot d'une moisson. */
const clesDesOps = new WeakMap();
function cleDesOps(ops) {
  let cle = clesDesOps.get(ops);
  if (cle === undefined) {
    cle = ops.map((o) => o.code).join('+');
    clesDesOps.set(ops, cle);
  }
  return cle;
}

/**
 * ★ **L'ÉTAGE 3 DE `vecteursDeSix`, POUR UN MAPPEUR ET UN JEU DE JETONS** — le
 * corps de sa boucle, tel quel, sorti de la fermeture.
 *
 * ⚠️ MESURÉ sur « Lorem ipsum… », le pire cas du test de budget : la fermeture
 *   `derouler` naît à chaque appel et n'est appelée qu'une fois, si bien que V8
 *   l'optimisait PAR REMPLACEMENT SUR PILE à chaque portée, puis la désoptimisait
 *   à la sortie de la boucle (34 désoptimisations, 295 ms de compilation sur les
 *   fils du moteur JavaScript, que `process.cpuUsage` facture). Une fonction de
 *   module appelée des milliers de fois s'optimise une fois pour toutes.
 * ★ Le COMPORTEMENT ne change pas : même ordre, mêmes applications, même travail
 *   compté ; `d` porte ce que la fermeture lisait.
 */
function deroulerUnMappeur(j, m, secondRaffinage, d) {
  // ★ Le TRAVAIL de l'étage 3 — c'est lui qui coûte (`moissons`, la borne).
  //   Pesé par la LONGUEUR de ce qu'on lit : mesuré, « désinformation »
  //   coûte deux fois « garantie » pour le même nombre d'applications.
  d.compte.travail += Math.max(1, j.etat.valeur.length);
  const v = appliquerOp(m, j.etat);
  if (v === null) return;
  if (!secondRaffinage) d.retenir(j.ops.concat(m), j.etats.concat([v]));
  const lignesVues = secondRaffinage ? new Set([cleEtat(v)]) : null;
  // ★ Les lignes du premier niveau qu'une chaîne de retouches peut prolonger —
  //   seulement quand le cran en ouvre une (`d.raffinages > 1`, voir
  //   `prolongerLesRetouches`). Au cran 0, rien n'est collecté.
  const aProlonger = !secondRaffinage && d.raffinages > 1 ? [] : null;
  for (const r of d.raffineurs) {
    // ★ Un raffinage qui GONFLE n'a rien à faire dans le premier déroulé :
    //   il n'existe que pour le dernier recours (voir `assembler`).
    if (!secondRaffinage && r.gonfle) continue;
    d.compte.travail += Math.max(1, v.valeur.length);
    const w = appliquerOp(r, v);
    if (w === null) continue;
    if (!secondRaffinage) {
      d.retenir(j.ops.concat(m, r), j.etats.concat([v, w]));
      if (aProlonger) aProlonger.push({ ops: j.ops.concat(m, r), etats: j.etats.concat([v, w]), r, w });
      continue;
    }
    if (r.absorbe || w.type !== 'NUMS') continue;
    const k = cleEtat(w);
    if (lignesVues.has(k)) continue;
    lignesVues.add(k);
    for (const a of d.absorbants) {
      const x = appliquerOp(a, w);
      if (x !== null) d.retenir(j.ops.concat(m, r, a), j.etats.concat([v, w, x]));
    }
    /* ★ **DEUX GONFLEMENTS À LA SUITE — pour la seule matière d'une phrase.**
         « Oui, les deux, en dernier recours » (l'autrice). Un gonflant, puis
         un éclatement en chiffres, puis un second gonflant, puis
         l'absorption : c'est ce qui porte « https://reinfocovid.fr/ » à 143
         chiffres de ligne, assez pour les 57 de « C'est de la merde ! » en
         ASCII. Seulement quand `index.js` cherche le bloc d'une phrase
         (`options.matiereDePhrase`), et seulement sur un premier gonflant :
         rien ne change pour 666 ni pour aucune cible chiffrée. */
    if (!d.matiereDePhrase || !r.gonfle) continue;
    for (const e of d.eclateurs) {
      const y = appliquerOp(e, w);
      if (y === null) continue;
      for (const r2 of d.raffineurs) {
        if (!r2.gonfle) continue;
        const z = appliquerOp(r2, y);
        if (z === null || z.type !== 'NUMS') continue;
        const k2 = cleEtat(z);
        if (lignesVues.has(k2)) continue;
        lignesVues.add(k2);
        for (const a of d.absorbants) {
          const x = appliquerOp(a, z);
          if (x !== null) d.retenir(j.ops.concat(m, r, e, r2, a), j.etats.concat([v, w, y, z, x]));
        }
      }
    }
  }
  if (aProlonger && aProlonger.length) prolongerLesRetouches(v, aProlonger, d);
}

/**
 * ★ **LES RETOUCHES S'ENCHAÎNENT APRÈS LA CONVERSION — et la longueur de la
 *   chaîne suit le cran de fouille.**
 *
 * > « Plus largement, mais si le coût est élevé, c'est le genre de chose à faire
 * >   évoluer entre le cran 0 et le cran 10 : plus on avance dans les crans,
 * >   plus des cas complexes sont envisageables. » (l'autrice, 18 septembre 2026)
 *
 * L'étage 3 déroulait « mappeur, puis UN raffinage » : `fl+tca+mt9+mtri+mam+meg`
 * — ranger, additionner des voisins vers la moyenne, égaliser — n'était jamais
 * construit, et `mam`, qui n'existe que pour préparer `meg`, ne sortait jamais.
 * Ce n'était pas la profondeur (`dMax`), c'était la FORME, exactement comme pour
 * les retraits grammaticaux de l'étage 1. La forme s'élargit donc : jusqu'à
 * `d.raffinages` retouches `NUMS → NUMS` à la suite (`config.js ›
 * raffinagesEnChaine`), une au cran 0 — le déroulé d'avant, au bit près.
 *
 * ★ **EN LARGEUR, UNE LIGNE UNE FOIS.** Chaque niveau part des lignes du niveau
 *   précédent, dans l'ordre du catalogue (§4.4 règle 3). Une ligne déjà atteinte
 *   — par la conversion, ou par une chaîne plus courte — n'est pas reprise :
 *   elle a déjà son chemin le plus court, et la prolonger referait le même
 *   travail sous un nom plus long. C'est aussi ce qui écarte la retouche qui ne
 *   change rien (N3) et l'aller-retour qui revient sur ses pas.
 * ★ **NI ABSORPTION, NI GONFLEMENT DANS LA CHAÎNE.** Une absorption consomme
 *   toute la ligne et n'écrit que la cible : rien ne se retouche après elle, et
 *   la faire précéder de retouches, c'est la seconde passe de dernier recours
 *   (`derouler(true)`), que seule une liste vide déclenche — « mab est un
 *   dernier recours, à éviter quand on peut » (l'autrice). Le gonflement reste
 *   à cette même passe. La chaîne n'enchaîne donc que des RETOUCHES.
 * ★ **ET LA CHAÎNE NE REGONFLE PAS LA LIGNE.** Une retouche peut rendre une
 *   ligne plus LONGUE que celle de la conversion — la potence (`mdc*`) écrit un
 *   nombre en ses décimales, `2 5 3` devient une vingtaine de chiffres. Elle
 *   reste retenue telle quelle, comme avant ; mais on ne la prolonge pas. Une
 *   chaîne de retouches RAFFINE ce que la conversion a lu, elle ne fabrique pas
 *   de la matière pour la raffiner ensuite : fabriquer de la matière, c'est le
 *   gonflement, et il est réservé au dernier recours. MESURÉ, et c'est ce qui a
 *   fait écrire la règle : sans elle, les chaînes partaient des lignes gonflées
 *   — `fr21+tca+mas+mdc3+mam+meg`, vingt-deux 6 sur « Donald Trump » — et
 *   `prolongerLesRetouches` pesait 58 % d'une recherche au cran 8 (89 s CPU au
 *   lieu de 49), dans les plans les plus chers (`mrdf`, `mrd`, `megf`) appliqués
 *   à des lignes de trente chiffres ; et ces voies alambiquées, fournies en 6,
 *   montaient en tête de liste devant `fl+mazc+meg`.
 * ★ Le travail se compte comme au premier niveau, pesé par la longueur de la
 *   ligne lue : c'est lui que la borne de la moisson lit (§4.4).
 */
function prolongerLesRetouches(v, premiers, d) {
  const vues = new Set([cleEtat(v)]);
  let niveau = [];
  for (const p of premiers) {
    const k = cleEtat(p.w);
    if (vues.has(k)) continue;
    vues.add(k);
    if (!p.r.absorbe && p.w.type === 'NUMS') niveau.push(p);
  }
  const largeur = v.valeur.length;
  const prolongeable = (w) => w.valeur.length <= largeur;
  niveau = niveau.filter((p) => prolongeable(p.w));
  for (let n = 2; n <= d.raffinages && niveau.length; n++) {
    const suivant = [];
    for (const p of niveau) {
      for (const r of d.raffineurs) {
        if (r.gonfle || r.absorbe) continue;
        d.compte.travail += Math.max(1, p.w.valeur.length);
        const w = appliquerOp(r, p.w);
        if (w === null || w.type !== 'NUMS') continue;
        const k = cleEtat(w);
        if (vues.has(k)) continue;
        vues.add(k);
        const ops = p.ops.concat(r);
        const etats = p.etats.concat([w]);
        d.retenir(ops, etats);
        if (prolongeable(w)) suivant.push({ ops, etats, r, w });
      }
    }
    niveau = suivant;
  }
}

export function vecteursDeSix(texte, ops, minSix = SERIE, plafond = MAX_VECTEURS_PAR_FRAGMENT * 2,
  cible = CIBLE_DEFAUT, options = {}) {
  // ★ **DEUX APPELANTS, DEUX QUESTIONS** — et un seul des deux veut un faisceau
  //   mis en forme.
  //
  //   Le GROUPEMENT demande « quelles voies proposer au lecteur » : onze réglages
  //   de César interchangeables y sont du bruit, et la réserve de qualité y a
  //   tout son sens. `candidatsDePortee`, lui, demande « qu'est-ce que cette
  //   portée SAIT donner » : c'est de la matière première, dans laquelle
  //   `reduireLeSurplus` ira ensuite chercher, précisément, le réglage qui
  //   gaspille le moins.
  //
  //   ⚠️ MESURÉ, et c'est ce qui a imposé la distinction : la déduplication
  //     appliquée aux deux retirait de la matière à la moisson, et
  //     `https://hope-hope-hope.fr/` ressortait à sept 6 récoltés pour six
  //     montrés — un déchet que la variante supprimée savait éviter.
  const miseEnForme = options.miseEnForme !== false;
  const cbl = normaliserCible(cible);
  /* ★ **LE MÉMO DU MOTEUR** (`options.memo`, le cache de `creerMoteur`).
       Cette fonction ne lit que ses arguments : la même question rend la même
       réponse. La recherche cumulative la pose pourtant plusieurs fois — le
       cran rapide (−1), puis le cran 0, puis les suivants énumèrent les mêmes
       vecteurs des mêmes mots, quel que soit leur budget de fragments. Mesuré
       sur une phrase de 113 signes : 4,5 s de moisson, refaits à chaque cran.
       ★ Le TRAVAIL est refacturé au compteur à chaque réemploi, au tarif exact
         du déroulé qu'il économise — comme `bfs.js › chercherSix` : la borne de
         la moisson décide pareil, que le mémo serve ou non (§4.4). */
  const memo = options.memo instanceof Map ? options.memo : null;
  /* ★ **LA LONGUEUR DES CHAÎNES DE RETOUCHES** après la conversion
       (`prolongerLesRetouches`), que le cran de fouille commande (`config.js ›
       raffinagesEnChaine`). Une au défaut : le déroulé d'avant. Elle entre dans
       les deux clés du mémo — la même portée déroulée à deux longueurs n'est pas
       la même question. */
  const raffinages = options.raffinages ?? 1;
  if (!Number.isInteger(raffinages) || raffinages < 1) {
    throw new Error(`vecteursDeSix : « raffinages » doit être un entier ≥ 1, reçu ${raffinages}`);
  }
  const cleMemo = memo ? JSON.stringify(['vecteursDeSix', String(texte).normalize('NFC'), cbl.texte, minSix,
    plafond, miseEnForme, options.profond === true, options.matiereDePhrase === true,
    options.curseurs ?? null, cleDesOps(ops), options.parFamille === true, raffinages]) : null;
  /* ★ **L'ÉNUMÉRATION SE PARTAGE ENTRE LES DEUX FENÊTRES DE LA MATIÈRE.**
       `candidatsDePortee` demande la même portée deux fois — la fenêtre d'avant,
       puis celle qui sert une place par famille (`moissons`, la réunion). Les
       étages 1 à 3 ne dépendent ni de la fenêtre ni du plafond : on garde ce
       qu'ils ont trouvé, AVANT le tri, et la seconde demande ne refait que la
       coupe. Seule la matière est concernée : le GROUPEMENT n'a qu'une fenêtre. */
  const cleEnumeration = memo && !miseEnForme ? JSON.stringify(['vecteursDeSix:enumeration',
    String(texte).normalize('NFC'), cbl.texte, minSix, options.profond === true,
    options.matiereDePhrase === true, cleDesOps(ops), raffinages]) : null;
  if (memo) {
    const deja = memo.get(cleMemo);
    if (deja) {
      if (options.compteur) options.compteur.travail += deja.travail;
      return deja.chemins.slice();
    }
  }
  const compte = { travail: 0 };
  // ★ Deux exigences, et non deux seuils. Le GROUPEMENT veut de quoi ÉCRIRE la
  //   cible à lui seul ; la MOISSON veut au moins un chiffre utile, parce
  //   qu'elle additionne ce que chaque portée rapporte. Sur `666` avec
  //   `minSix = 3`, « écrire 666 » et « porter trois 6 » sont la même chose :
  //   le repli est exact. Sur `007`, ils cessent de l'être, et c'est bien
  //   « écrire 007 » qu'il faut demander — trois chiffres utiles peuvent être
  //   trois zéros.
  const exigeSerie = minSix >= cbl.longueur;
  // ★ **CINQ ÉTAGES, ET LE CINQUIÈME A COÛTÉ CHER À DÉCOUVRIR.**
  //
  // Cette fonction n'explore pas : elle DÉROULE une forme de programme connue —
  // filtre, découpe, mappeur, raffinage. Tant que le catalogue ne contenait que
  // ces quatre signatures, la boucle ci-dessous les rangeait toutes. Le jour où
  // `m.triAlphabetique` (TOKENS → TOKENS) est arrivé, elle l'a laissé tomber
  // **en silence** : aucun `else` ne le recevait, et le groupement ne pouvait
  // plus jamais le jouer. L'opérateur existait, la recherche le trouvait, le
  // barème le notait — et il n'apparaissait nulle part.
  //
  // ⚠️ Le silence est le vrai défaut, pas l'oubli. Un opérateur d'une signature
  // non prévue doit se voir, et c'est ce que `nonRanges` sert à dire : la
  // fonction rend maintenant la liste de ce qu'elle n'a pas su ranger, et un
  // test la garde à vide. Le prochain ajout se signalera tout seul.
  const filtres = [];
  const decoupes = [];
  const rangements = [];
  const mappeurs = [];
  const raffineurs = [];
  // ★ Les ÉCLATEURS (`op.eclate`, `mecl`) : ni raffinage ni absorption — ils ne
  //   servent qu'entre deux gonflements, pour la matière d'une phrase.
  const eclateurs = [];
  const nonRanges = [];
  for (const o of ops) {
    if (o.from === 'STR' && o.to === 'STR') filtres.push(o);
    else if (o.from === 'STR' && o.to === 'TOKENS') decoupes.push(o);
    else if (o.from === 'TOKENS' && o.to === 'TOKENS') rangements.push(o);
    else if (o.from === 'TOKENS' && o.to === 'NUMS') mappeurs.push(o);
    else if (o.from === 'NUMS' && o.to === 'NUMS' && o.eclate) eclateurs.push(o);
    else if (o.from === 'NUMS' && o.to === 'NUMS') raffineurs.push(o);
    else if (o.to !== 'NUM') nonRanges.push(o.code);
  }
  vecteursDeSix.nonRanges = nonRanges;
  const depart = etat('STR', String(texte).normalize('NFC'), [[0, texte.length]]);

  // Étage 1 — la saisie nue, puis chaque filtre. L'ordre du catalogue est
  // l'ordre des codes croissants (§4.4-3) : la déduplication qui suit garde
  // donc toujours le représentant le plus simple.
  const bases = [{ ops: [], etats: [depart], etat: depart }];
  for (const f of filtres) {
    const r = appliquerOp(f, depart);
    if (r !== null) bases.push({ ops: [f], etats: [depart, r], etat: r });
  }
  /* ★ **LES RETRAITS GRAMMATICAUX S'EMPILENT — et eux seuls.**

     > « Je me demande juste si plusieurs filtres grammaticaux peuvent
     >   s'enchaîner, ou si l'algo de recherche limite les étapes trop fort pour
     >   que ça ait lieu. » (l'auteur)

     Ils ne le pouvaient pas, et ce n'était pas la profondeur (`D_MAX` vaut 15) :
     c'était la FORME. Cet étage appliquait « la saisie nue, puis chaque filtre »
     — UN filtre —, et l'étage 2 bis le dit en toutes lettres : « un filtre est
     déjà passé : on n'empile pas ». Mesuré sur « Le jardin sur le rocher de la
     maison » : `fart+fprp+tm+mlm` écrit `[6 6 6]` en quatre gestes, et la
     recherche ne le proposait à aucun rang.

     ⚠️ **ET LA REMISE DE CLASSE ÉTAIT LETTRE MORTE.** `score.js ›
       longueurRendue` compte le deuxième filtre grammatical pour moitié —
       l'auteur l'a demandé —, mais aucune voie réellement trouvée n'en portait
       deux. On avait tarifé un chemin qui n'existait pas.

     ★ **POURQUOI CEUX-LÀ, ET PAS TOUS LES FILTRES.** Empiler deux filtres
       quelconques, c'est superposer deux choix : on garde les lettres, puis
       les voyelles de ce qui reste. Les retraits grammaticaux, eux, appliquent
       une SEULE doctrine — « on ne garde que ce qui porte le sens » — à quatre
       inventaires fermés : écarter les articles puis les prépositions n'est pas
       une seconde décision, c'est la même poursuivie. C'est aussi ce qui
       justifie leur remise.

     ★ **L'ORDRE DU REGISTRE, ET RIEN QUE LUI.** Ils commutent : `fart+fprp` et
       `fprp+fart` écartent les mêmes mots. On ne déroule donc que les suites
       CROISSANTES dans l'ordre du catalogue — une par combinaison, jamais ses
       permutations —, ce qui garde l'énumération déterministe (§4.4) et
       divise son coût par le nombre d'ordres possibles.

     ★ **CE QUE ÇA COÛTE, MESURÉ** : rien du tout là où la saisie ne porte aucun
       mot outil — `hope-hope-hope.fr`, `Donald Trump`, `Capitalisme`,
       `Sarah Kerrigan` n'en ajoutent pas une base —, un enchaînement sur une
       phrase ordinaire, onze au pire sur une phrase qui porte les quatre
       classes. La déduplication de l'étage 2 fait le reste. */
  const grammaticaux = filtres.filter((f) => f.classeGrammaticale);
  const empiler = (base, depuis) => {
    for (let i = depuis; i < grammaticaux.length; i++) {
      const g = grammaticaux[i];
      const r = appliquerOp(g, base.etat);
      if (r === null) continue;
      const suite = { ops: base.ops.concat(g), etats: base.etats.concat([r]), etat: r };
      bases.push(suite);
      empiler(suite, i + 1);
    }
  };
  for (const b of bases.filter((x) => x.ops.length === 1 && x.ops[0].classeGrammaticale)) {
    empiler(b, grammaticaux.indexOf(b.ops[0]) + 1);
  }

  // Étage 2 — les découpes, dédoublonnées sur les jetons obtenus.
  const jetons = new Map();
  for (const b of bases) {
    for (const d of decoupes) {
      const t = appliquerOp(d, b.etat);
      if (t === null) continue;
      const k = cleEtat(t);
      if (!jetons.has(k)) jetons.set(k, { ops: b.ops.concat(d), etats: b.etats.concat([t]), etat: t });
    }
  }

  // Étage 2 bis — les rangements de jetons (TOKENS → TOKENS).
  //
  // « S'il devrait y avoir un tri, il faudrait le faire en premier : classer les
  // lettres par ordre alphabétique en une étape, pour faire apparaître ensuite
  // le 666 naturellement, puisque le t9 est alphabétique » (l'auteur). C'est
  // ici que ce « en premier » prend corps : le rangement s'insère AVANT le
  // mappeur, et le vecteur sort déjà groupé au lieu d'être trié après coup.
  //
  // Les états rangés s'ajoutent à `jetons` sans remplacer les autres : les deux
  // ordres restent jouables, et c'est le barème qui tranche. La déduplication
  // par `cleEtat` fait le reste — un rangement qui ne range rien retombe sur son
  // entrée et n'ajoute pas de ligne.
  // ⚠️ **ET SEULEMENT SUR LES JETONS NON FILTRÉS** — « quand il y en a besoin »
  //    (l'auteur), pas partout. Ranger APRÈS avoir filtré, ce serait deux
  //    sélections superposées : d'abord on choisit les lettres qu'on regarde,
  //    ensuite on choisit l'ordre où on les lit. L'auteur vient de dire que la
  //    première est déjà « moins élégante » quand elle ne porte pas sur tout
  //    (`FILTRE_SELECTIF`) ; les cumuler n'achèterait qu'une ligne de plus.
  //
  //    ⚠️ MESURÉ, et c'est aussi ce qui rend l'étage payable : appliqué à TOUS
  //    les jetons, il double l'étage 3 — 31 mappeurs × 12 raffinages sur deux
  //    fois plus d'états — et le pipeline passait de 974 à **1 080 ms CPU**,
  //    au-dessus du budget d'une seconde. Restreint aux jetons nus, il coûte
  //    une poignée d'états et garde ce qui l'intéresse : sur `Macron`,
  //    `tca+mtal+mt9` sort en deuxième ligne.
  for (const j of [...jetons.values()]) {
    if (j.ops.length > 1) continue; // un filtre est déjà passé : on n'empile pas
    for (const r of rangements) {
      const t = appliquerOp(r, j.etat);
      if (t === null) continue;
      const k = cleEtat(t);
      if (!jetons.has(k)) {
        jetons.set(k, { ops: j.ops.concat(r), etats: j.etats.concat([t]), etat: t });
      }
    }
  }

  // Étage 3 — les mappeurs, puis un raffinage facultatif.
  //
  // Les chemins sont construits À LA MAIN, à partir des états déjà calculés, et
  // non rejoués : `rejouerOps` refait tourner tout le programme, et
  // `normaliserChemin` le refait tourner une fois par étape candidate. Sur un
  // paragraphe de 220 signes cela coûtait 750 ms pour les cent trente vecteurs
  // trouvés — vingt fois le reste de l'assemblage. On ne canonicalise donc que
  // les rescapés, une fois le tri et le plafond passés.
  const out = [];
  const vus = new Set();
  const retenir = (ops, etats) => {
    const fin = etats[etats.length - 1];
    if (!fin || fin.type !== 'NUMS') return;
    if (exigeSerie ? !ecrit(fin.valeur, cbl) : compterSix(fin, cbl) < minSix) return;
    const chemin = {
      ops,
      etats,
      valeur: null,
      cout: ops.reduce((s, o) => s + (o.cout || 0), 0),
    };
    const cle = cleTrace(chemin);
    if (vus.has(cle)) return;
    vus.add(cle);
    out.push(chemin);
  };
  /* ★ **UN SECOND RAFFINAGE, QUAND LE SECOND ABSORBE ET QUE LA VISÉE EST LONGUE.**

     > « Certaines de tes conversions changent une lettre en 3 chiffres […] tu
     >   peux donc augmenter le nombre de chiffres à volonté […] et la matière
     >   tu vas l'avoir. » (l'auteur)

     MESURÉ, et ce n'était pas la matière : la plus longue ligne de « Sarah
     Kerrigan » fait trente-six chiffres avec ou sans raffinage — aucun
     opérateur ne multiplie les nombres entre eux, et un produit est
     log-additif, donc il n'allonge rien (les treize codes ASCII multipliés font
     vingt-sept chiffres au lieu de trente-six). Ce qui manquait était la FORME :
     cette fonction déroulait « filtre, découpe, mappeur, raffinage », un seul
     raffinage, si bien qu'un geste qui RANGE ou qui GONFLE la ligne ne pouvait
     jamais être suivi d'une absorption. `fl+tca+masb+mtri+mab` — les codes
     ASCII rangés par ordre croissant, puis dissous — écrit les quatorze
     chiffres de « Fantome », et aucune recherche ne pouvait le trouver.

     ★ Le second doit ABSORBER (`op.absorbe`, déclaré par l'opérateur) : il
       consomme toute la ligne et n'écrit que la cible, donc ce qui le précède
       ne décide de rien. Deux gestes qui choisissent, eux, resteraient deux
       décisions superposées — c'est la doctrine de l'étage 2 bis.
     ★ Quelle que soit la CIBLE, 666 compris : ce qui décide n'est pas sa
       longueur, c'est que la recherche soit revenue les mains presque vides
       (voir plus bas, et `index.js › VOIES_AVANT_DE_CREUSER`).
     ⚠️ Deux raffinages qui rendent la MÊME ligne ne sont pas deux matières :
       on ne tente l'absorption qu'une fois par ligne obtenue, le premier
       rencontré dans l'ordre du catalogue (§4.4 règle 3), comme l'étage 2. */
  const absorbants = raffineurs.filter((o) => o.absorbe);
  /* ★ Le déroulé d'UN mappeur sur UN jeu de jetons vit hors de cette fonction
       (`deroulerUnMappeur`) : voir là-bas pourquoi. */
  const deroulage = {
    raffineurs, absorbants, eclateurs, matiereDePhrase: options.matiereDePhrase, compte, retenir, raffinages,
  };
  const derouler = (secondRaffinage) => {
    for (const j of jetons.values()) {
      for (const m of mappeurs) deroulerUnMappeur(j, m, secondRaffinage, deroulage);
    }
  };
  const enumeree = cleEnumeration ? memo.get(cleEnumeration) : null;
  if (enumeree) {
    for (const c of enumeree.chemins) out.push(c);
    for (const k of enumeree.cles) vus.add(k);
    compte.travail = enumeree.travail;
  } else derouler(false);
  /* ★ **LA SECONDE PASSE EST UN DERNIER RECOURS, ET C'EST LA RECHERCHE QUI LE
       DÉCIDE — pas cette fonction, et pas la longueur de la cible.**

     > « Si des solutions courtes et élégantes sont trouvées, pas besoin de
     >   chercher les options longues et bancales, mais si rien n'est trouvé,
     >   approfondir avec le budget temps disponible est pertinent. » (l'auteur)

     Une recherche qui a déjà des voies ne paie donc RIEN pour celle-ci : ni
     temps, ni place en tête de liste. C'est `index.js` qui pose `profond` —
     après un premier assemblage RESTÉ VIDE, et lui seul est en position de le
     savoir : creuser fragment par fragment ferait creuser sous une liste déjà
     pleine, pour y ajouter des voies bancales dont personne n'a besoin
     (mesuré : « Sarah Kerrigan → Diable » passait de 7 voies à 9, pour un tiers
     de temps en plus, alors que ses 7 voies courtes existaient).

     Ce que la passe ajoute alors est une ligne RANGÉE ou GONFLÉE avant d'être
     dissoute — un geste qui ne décide de rien, suivi d'une absorption qui
     consomme tout. Ces voies-là arrivent derrière par construction : le barème
     facture le rangement (`elegance.js › REARRANGEMENT`) et l'absorption est la
     ficelle la plus chère du catalogue. Elles n'ont pas à être belles ; elles
     ont à exister quand il n'y a rien d'autre.

     ★ **AUCUNE HORLOGE ICI, et c'est voulu** (§4.4) : ce qui borne la recherche
       est le TRAVAIL. La seconde passe ne relance AUCUNE recherche de fragment
       — les chemins du faisceau sont déjà là —, elle redéroule la forme fermée
       sur les mêmes états ; et elle ne se déroule que sur une liste vide, donc
       jamais en concurrence avec une réponse qui existe.

     ★ **LE VERROU DE LONGUEUR EST LEVÉ** — « oui lève » (l'auteur). Il bornait
       cette passe aux visées de plus de dix chiffres, pour garantir que rien ne
       bougeait en deçà ; c'était une garde de non-régression, pas une règle. La
       règle est le MANQUE : une saisie qui ne sait pas écrire 666 a le même
       droit qu'un mot de sept lettres à ce qu'on creuse pour elle. Ce qui
       protège encore l'existant n'est plus une borne mais le seuil lui-même :
       une liste bien fournie ne déclenche rien, donc les voies courtes de 666
       restent exactement ce qu'elles étaient.

     ⚠️ Même en passe profonde, un fragment qui sait DÉJÀ écrire la cible ne
       creuse pas : il a sa voie courte, elle lui suffit. « Rien trouvé » se lit
       ici sur ce qui ÉCRIT la cible, pas sur la récolte — `retenir` garde aussi
       les vecteurs qui ne font que CONTRIBUER (c'est la matière de la moisson),
       et sur une cible longue presque toute ligne en porte. */
  const ecritLaCible = (c) => ecrit(c.etats[c.etats.length - 1].valeur, cbl);
  if (!enumeree && options.profond === true && !out.some(ecritLaCible)) derouler(true);
  if (cleEnumeration && !enumeree) {
    memo.set(cleEnumeration, { chemins: out.slice(), cles: [...vus], travail: compte.travail });
  }
  // ★ LA QUALITÉ SE CONSULTE AVANT LE PLAFOND, PAS APRÈS.
  //
  //   Le tri rangeait : plus de 6 d'abord, puis le moins dilué, puis le moins
  //   de ficelles. La troisième clef n'était donc lue qu'entre ex æquo — et le
  //   plafond, lui, coupe après la deuxième. Une ficelle qui arrache un 6 de
  //   plus passait devant tout le monde et occupait la place AVANT que le
  //   filtre de qualité (`apporteQuelqueChose`, plus bas) n'ait eu à se
  //   prononcer. C'est la maladie déjà soignée dans `bfs.js › MAX_RESULTATS` :
  //   « ce n'était pas une borne, c'était un classement par ordre
  //   alphabétique ».
  //
  //   MESURÉ sur `Macron` : `fr24+tca+mx6+mad` — une ficelle — arrivait en
  //   TÊTE du faisceau avec cinq 6, pour une élégance finale de 318, devant
  //   `fr1+tca+m14+mpf` (881) et `fr24+tca+mx6+mrn` (928). Elle achetait sa
  //   place avec un chiffre de plus et la payait au triple à l'arrivée.
  //
  //   ★ Le compte de 6 reste PREMIER, et c'est délibéré : c'est ce que le
  //     fragment doit rapporter, et une voie propre qui n'écrit pas la cible ne
  //     sert à rien. Mais à quantité MOINDRE d'une seule unité, une voie sans
  //     ficelle vaut mieux qu'une voie qui triche — d'où la comparaison par
  //     paliers : on n'oppose pas 5 six à 3, on oppose 5 six tricheurs à 4 six
  //     honnêtes.
  // ★ Mesures gardées par chemin (`mesuresDuChemin`) : le tri ci-dessous les
  //   relit au lieu de les recalculer à chaque comparaison.
  const six = (c) => sixDuDernierEtat(c, cbl);
  const dilue = (c) => largeurDuChemin(c, c.etats[c.etats.length - 1].valeur.length) - six(c);
  // Le meilleur compte de 6 atteint SANS ficelle : c'est lui l'étalon. Une voie
  // à ficelle doit le dépasser d'au moins deux pour mériter sa place devant.
  let etalon = 0;
  for (const c of out) if (!ficellesDuChemin(c)) etalon = Math.max(etalon, six(c));
  const rang = (c) => {
    const n = six(c);
    if (!ficellesDuChemin(c)) return n;
    // Une ficelle qui n'apporte qu'un 6 de plus que la meilleure voie honnête
    // est ramenée derrière elle : ce qu'elle achète ne vaut pas ce qu'elle
    // coûtera (`elegance.js`, les paliers de ficelle).
    return n > etalon + 1 ? n : Math.min(n, etalon) - 1;
  };
  out.sort((a, b) => (rang(b) - rang(a)) || (ficellesDuChemin(a) - ficellesDuChemin(b))
    || (dilue(a) - dilue(b)) || comparerChemins(a, b));

  // ★ UN RÉGLAGE PAR FORME, ET PAS ONZE.
  //
  //   MESURÉ sur `Macron`, et c'est le relevé qui a imposé la règle : sur les
  //   trente-quatre vecteurs trouvés, les ONZE PREMIERS étaient le même geste —
  //   `fr{N}+tca+{mappeur}+meg` — à onze décalages de César près. Cinq d'entre
  //   eux ne différaient que par le N. Le faisceau dépensait donc un tiers de
  //   sa place à répéter une seule idée, et `tca+mt9+mpf` — trois étapes, six
  //   tout rond, la voie que l'auteur tient pour la plus élégante du corpus —
  //   attendait au rang 23, hors de portée du GROUPEMENT.
  //
  //   ★ Ce n'est pas un jugement sur le décalage : « utiliser fr{N} ne pose pas
  //     problème » (l'auteur). C'est un constat sur le CHOIX. Vingt-cinq
  //     réglettes essayées à la file, ce n'est pas vingt-cinq méthodes, c'est
  //     une méthode et un balayage — et un balayage fait tomber juste à peu
  //     près n'importe quelle propriété globale de la ligne, ce qui est
  //     précisément comment `meg` gagnait ses places.
  //
  //   La forme, c'est le programme dont on a ôté les réglages : `fr13+tca+m14`
  //   et `fr15+tca+m14` en ont UNE. Le tri vient de passer, donc le premier
  //   rencontré est le meilleur des siens — on le garde, on laisse les autres.
  //   Le décalage est LU sur l'opérateur (`filtres.js`, champ `decalage`), pas
  //   deviné sur son code : un outil réglable qui arriverait demain entrerait
  //   ici sans qu'on touche à cette ligne.
  //
  //   ⚠️ Et c'est bien par FRAGMENT : une moisson qui veut `fr14` sur un
  //     morceau et `fr9` sur un autre les trouve toujours, ce sont deux listes
  //     de vecteurs distinctes. Ce qu'on refuse, c'est onze candidats
  //     interchangeables pour le même morceau.
  //   ★ Un réglage qui n'est pas un nombre se DÉCLARE aussi : `reglageDe` nomme
  //     la méthode dont l'opérateur n'est qu'un réglage — la potence avec ou sans
  //     zéros de tête (`mdc3`, `md03`) en a une seule. Lue en premier, comme le
  //     décalage : rien n'est deviné sur le code.
  //   ⚠️ Pas `forme` : ce nom existe déjà sur les tables à glissière (`fr*`,
  //     `fatb`) et à réglette (`flt`), où il nomme la forme DESSINÉE. Le lire ici
  //     faisait de l'Atbash un « réglage » des César.
  const formeDe = (c) => (c.ops || []).map((o) => {
    if (typeof o.reglageDe === 'string' && o.reglageDe) return o.reglageDe;
    return Number.isFinite(o.decalage) ? String(o.code).replace(/\d+$/, '') : o.code;
  }).join('+');
  if (miseEnForme) {
    const formes = new Set();
    const garde = [];
    for (const c of out) {
      const f = formeDe(c);
      if (formes.has(f)) continue;
      formes.add(f);
      garde.push(c);
    }
    out.length = 0;
    out.push(...garde);
  } else if (options.tousLesReglages !== true) {
    /* ★ **DANS LA MATIÈRE AUSSI, UNE FORME NE PREND QU'UNE PLACE — et ICI, avant
       la coupe, pas après.** Deux réglages d'un même outil — deux décalages de
       César, deux acceptions d'une traduction, la potence avec ou sans zéros de
       tête — ne sont pas deux matières. La meilleure variante de chaque forme
       passe d'abord ; les autres ne prennent que les places qui restent
       (`unePlaceParFamille`).

       ⚠️ MESURÉ, deux fois. Les deux réglages de la potence occupaient deux des
         vingt places de la portée `https`, et `fr14+tca+m14+mpf` tombait sous
         le plafond : la moisson de `https://hope-hope-hope.fr/` passait de sept
         séries à six (`elegance.test.js › étalonnage`, `› ficelles`). Puis les
         césars : « les décalages y restent distincts » laissait vingt-cinq
         réglages concourir pour vingt places, et sur « hope » `tca+m14` sortait
         21ᵉ — la voie groupée de `hope-hope-hope.fr`, que l'autrice veut en 3ᵉ
         place, n'était plus fabriquée depuis que les césars sont explorés.

       ★ La famille est PUBLIÉE par l'opérateur (`familleDeReglages`), jamais
         devinée. Les tables de la LIAISON demandent `tousLesReglages` : elles
         veulent tout ce qu'un mot sait donner, et 18 par `md03` n'est pas 18
         par `mdc3`. */
    if (options.parFamille === true) {
      const ordonnes = unePlaceParFamille(out, formeReglee);
      if (ordonnes !== out) {
        out.length = 0;
        out.push(...ordonnes);
      }
    } else {
      // La fenêtre d'AVANT, au bit près : seule la potence déclarée partage sa place.
      const formes = new Set();
      const garde = [];
      for (const c of out) {
        if (!c.ops.some((o) => typeof o.reglageDe === 'string' && o.reglageDe)) { garde.push(c); continue; }
        const f = c.ops.map((o) => (typeof o.reglageDe === 'string' && o.reglageDe ? o.reglageDe : o.code)).join('+');
        if (formes.has(f)) continue;
        formes.add(f);
        garde.push(c);
      }
      out.length = 0;
      out.push(...garde);
    }
  }

  // N2/N3 puis N1, comme partout ailleurs : `fmaj+tca+m14` — passer en capitales
  // avant de compter les segments — montre le même vecteur que `tca+m14`, la
  // capitale n'y changeant rien. Sans normalisation, les deux occupaient deux
  // lignes de la liste, distinguées par leurs seuls codes. On en canonicalise
  // deux fois le plafond, pour que la déduplication ait de quoi puiser.
  // ★ UNE FICELLE QUI N'APPORTE RIEN N'EST PAS PROPOSÉE.
  //
  // « De la triche à utiliser en DERNIER RECOURS si des méthodes plus élégantes
  // ne parviennent pas à 666 » — l'auteur. Le barème d'élégance la punit, mais
  // il ne la punit qu'à l'arrivée : entre-temps, la sélection par diversité
  // (`score.js › diversifier`) VOIT une méthode de plus et lui fait de la place,
  // parce que sa signature diffère. Mesuré sur `hope-hope-hope.fr` :
  // `fl+tca+m14+mpf` (élégance 1 539) évinçait `fl+tca+m14` (1 909) de la liste, les
  // deux montrant exactement les mêmes douze 6.
  //
  // On coupe donc à la racine : une voie à ficelle est écartée dès qu'une voie
  // SANS ficelle, sur la même portée, fait au moins aussi bien sur les trois
  // choses que la ficelle prétend acheter — autant de 6, pas plus de gaspillage,
  // autant de 666 écrits d'affilée. Elle n'a alors rien apporté du tout.
  //
  // ⚠️ Et elle n'est PAS écartée quand elle apporte quelque chose : sur
  // `Macron`, `tca+mt9` rend `[6,2,2,7,6,6]` — trois 6 dispersés, aucun 666 — et
  // `tca+mt9+mpf` rend `[6,6,6]`. La ficelle reste, et c'est le barème qui la
  // range où elle doit être.
  // ★ LA QUALITÉ N'ATTEND PLUS LE CLASSEMENT : ELLE A DES PLACES RÉSERVÉES.
  //
  //   « Il va falloir retravailler l'algo de recherche pour qu'il intègre la
  //   qualité/notoriété/élégance plus tôt afin d'améliorer ses choix de pistes,
  //   même si certains critères ne peuvent arriver qu'après coup » (l'auteur).
  //   Voici l'endroit : le tri ci-dessus range sur le COMPTE DE 6, et c'est
  //   légitime — un fragment doit rapporter —, mais une voie courte et propre
  //   qui écrit la cible UNE fois ne rattrapera jamais une voie qui en écrit
  //   deux. Elle n'atteignait donc pas le régime d'élégance, qui existe pourtant
  //   pour la couronner (`index.js › selectionner`).
  //
  //   ★ MESURÉ sur `Macron` : `tca+mt9+mpf` — trois étapes, `[6,6,6]` tout rond,
  //     la voie que l'auteur tient pour la plus élégante du corpus (« La version
  //     "avant" brille par sa simplicité et son élégance extrême […] ça devrait
  //     clairement rester celle-ci ») — sortait au rang 23 sur 34, puis 14 après
  //     la déduplication des réglages, et le GROUPEMENT ne descend pas si bas.
  //
  //   Le critère de qualité employé ici est CELUI DE L'AUTEUR, et il tient en
  //   une phrase : « sur l'élégance, la brièveté est un critère fort, en plus de
  //   ne pas supprimer de caractères ». Donc, dans l'ordre : rien qui doive
  //   mériter sa place, une ligne NETTE à l'arrivée, puis le moins d'étapes.
  //   Ce n'est pas le barème — il ne peut pas tourner ici, il se calcule sur des
  //   approches assemblées —, c'en est le pressentiment, avec les seules données
  //   que ce niveau possède.
  //
  //   ★ LA NETTETÉ EST CE QUE LA VOIE POSE, la dilution ce qu'elle a calculé en
  //     route ; les deux se ressemblent et ne disent pas la même chose. Trié sur
  //     la dilution, ce filtre écartait `tca+mt9+mpf` — qui calcule six valeurs
  //     pour n'en garder que trois — au profit de `fr1+tca+m14`, qui en calcule
  //     six et en laisse six, dont deux qui ne sont pas des 6. C'est l'inverse
  //     de ce qu'on cherche : la seconde laisse un verdict encombré, et jeter en
  //     route se paie ailleurs, au barème, où c'est sa place.
  //
  //   ⚠️ Et `ecrit` ne suffit pas comme filtre : il demande seulement qu'il y ait
  //     DE QUOI écrire la cible, pas qu'elle soit écrite. `tca+mt9` rend
  //     `[6,2,2,7,6,6]` — trois 6 qui ne se touchent pas — et le passe.
  //
  //   ⚠️ Elles sont RÉSERVÉES, pas prioritaires : un siège sur quatre. La
  //     quantité garde les trois autres, et un vecteur qui gagne sur les deux
  //     tableaux n'en occupe qu'un.
  //
  //   ⚠️⚠️ ET ELLES SONT ENTRELACÉES, pas ajoutées à la fin — c'est ce qui
  //     décide si la mesure sert à quelque chose. L'appelant demande `plafond`
  //     vecteurs puis n'en garde que la MOITIÉ (`assembler`, mode G :
  //     `.slice(0, kParFragment)`), si bien qu'une réserve posée en
  //     queue était intégralement jetée une ligne plus loin. Un siège sur quatre
  //     doit valoir pour TOUT préfixe de la liste, pas pour la liste entière.
  // Ce que la voie POSE sur la ligne, une fois finie : les chiffres qui ne sont
  // pas ceux de la cible. Zéro veut dire « il ne reste que 666 ».
  // ⚠️ `six` (défini plus haut) prend le CHEMIN et lit son dernier état ;
  //   `compterSix` prend l'ÉTAT. Passer le chemin au second rend 0 en silence —
  //   il ne trouve pas `type === 'NUMS'` — et la netteté se réduisait alors à
  //   « le vecteur le plus court », ce qui donne le même classement sur les cas
  //   mesurés et le mauvais partout ailleurs (`[1,2,3]` valait `[6,6,6]`).
  // ★ **NETTE, C'EST-À-DIRE : LE VERDICT N'A RIEN À JETER.** La netteté se
  //   comptait en chiffres HORS ALPHABET, et sur une cible homogène c'est la
  //   même chose à un détail près ; sur une cible mêlée, ce n'est plus la même
  //   chose du tout. `fc+tca+masb+mrn` rend `19992889988` sur « Millicent
  //   Billette » visant 1998 — onze chiffres, tous de l'alphabet, NETTETÉ ZÉRO —
  //   et le verdict en jette sept. Une voie qui rend `1998` tout rond ne
  //   pouvait donc pas passer devant elle au siège de qualité, alors que c'est
  //   précisément elle que ce siège existe pour retenir.
  //
  //   On compte donc ce que le VERDICT écartera : la largeur moins les séries
  //   qu'il gardera (`cible.js › seriesDe`, plafonnées comme au verdict). C'est
  //   la même grandeur que `elegance.js › bilanApproche › jeteesAuTri`, lue
  //   ici sur le seul vecteur, avant l'assemblage. Zéro veut toujours dire
  //   « il ne reste que 666 » — et, désormais, « rien que 666 » : un quatrième
  //   6 qui tombera au tri ne rend plus la ligne nette.
  const nettete = (c) => {
    const v = c.etats[c.etats.length - 1].valeur;
    return v.length - Math.min(seriesDe(v, cbl).length, MAX_SERIES) * cbl.longueur;
  };
  // ★ **ET « NE PAS SUPPRIMER DE CARACTÈRES » SE LIT AVANT LA BRIÈVETÉ.** Le
  //   critère de l'auteur cité plus haut a deux moitiés, et la seconde n'était
  //   pas lue : entre deux voies nettes de même longueur, le départage tombait
  //   sur la dilution puis sur les codes, si bien que `fc+tca+mqwc+mrdE` — les
  //   consonnes seules — passait devant `fl+tca+mt9+mrdE`, qui lit toutes les
  //   lettres et rend le même `1998`. On compte ce que la voie a LU : les jetons
  //   que le mappeur reçoit — la largeur du dernier état `TOKENS` du chemin.
  //   Plus est mieux.
  //
  //   ⚠️ Pas les traces : dans ce monde-ci elles sont GROSSIÈRES — la portée
  //     entière sur le premier caractère, rien sur les autres
  //     (`bfs.js › appliquerOp`, « tolérant sur la forme ») —, et la
  //     couverture réelle n'est recalculée que par `score.js`, sur le programme
  //     rejoué. Mesurer l'étendue ici rendait zéro pour tout le monde.
  const lues = (c) => {
    let n = 0;
    for (const e of c.etats) if (e.type === 'TOKENS' && e.valeur.length > n) n = e.valeur.length;
    return n;
  };
  /* ★ **LA RÉSERVE OBÉIT AUX CURSEURS — son ordre ET sa taille.**

     > « Idéalement, c'est les curseurs qui priorisent quelles voies méritent
     >   d'être finalisées […]. Le nombre de sièges en cours de recherche devrait
     >   donc être dynamique en fonction des critères de recherche. » (l'auteur)

     Le pré-tri lexicographique ci-dessous décidait seul — ficelles, netteté,
     jetons lus, longueur —, et son troisième critère comptait des JETONS, pas
     des caractères. Mesuré sur « Le jardin sur le rocher de la maison » :
     `fart+fprp+tm+mlm` (trois mots, 7 317 points au barème) sortait 14ᵉ sur
     16 derrière des voies en `tca` qui lisent vingt-neuf jetons, et la coupe à
     huit par fragment l'éliminait avant que le barème ne la voie.

     Dès que le visiteur a touché aux curseurs, la réserve se range par
     `score-intermediaire.js › noteDeQualite` — simplicité, exhaustivité,
     cohérence, pondérées par leurs trois curseurs —, et l'ancien pré-tri ne
     sert plus qu'à départager les ex æquo. Sa TAILLE suit le partage des sièges
     entre quantité et qualité (`partDesSieges`).

     ⚠️ **AU DÉFAUT, LE PRÉ-TRI HISTORIQUE, AU BIT PRÈS** — la doctrine de
       `score.js › noter` : une pondération n'agit que si elle se déclare
       personnalisée. Et ce n'est pas une prudence de principe, c'est MESURÉ.
       Rangée par la note à parts égales, la réserve changeait 27 listes sur
       29 au banc (`.planning/banc/sieges-banc.mjs`) et six premières places —
       et `tca+mt9+mpf` quittait la liste de `Macron`, l'un des quatre cas de
       référence, la voie que l'auteur tient pour la plus élégante du corpus. La note ne voit pas
       ce que le barème lui paie (le triptyque contigu, la propreté) : elle ne
       se calcule que sur un chemin, et ces postes-là sur une approche assemblée.
       Le pré-tri historique, lui, a été réglé sur ce cas précis. Le partage des
       sièges vaut un sur quatre au défaut : l'entrelacement est celui d'avant. */
  const curseurs = normaliserCurseurs(options.curseurs);
  const pilotee = !auDefaut(curseurs);
  const part = partDesSieges(curseurs);
  const RESERVE_QUALITE = reserveDeQualite(plafond, part);
  // ★ On CANONICALISE en marchant, et il le faut : `fmaj+tca+mt9+mpf` et
  //   `fmin+tca+mt9+mpf` montrent exactement ce que montre `tca+mt9+mpf` — la
  //   capitale ne change rien au compte de segments —, et sans cette passe ils
  //   prenaient deux des quatre places réservées pour se faire dédupliquer
  //   trois lignes plus bas. Le coût est borné par la réserve, pas par le
  //   faisceau : on ne canonicalise que jusqu'à l'avoir remplie.
  const parLaQualite = [];
  if (miseEnForme && RESERVE_QUALITE > 0) {
    // La note se calcule une fois par candidat : le tri la redemande à chaque
    // comparaison.
    const notes = new Map();
    const noteDe = (c) => {
      let n = notes.get(c);
      if (n === undefined) {
        n = noteDeQualite(axesIntermediaires(c, depart.valeur, cbl), curseurs);
        notes.set(c, n);
      }
      return n;
    };
    const candidats = out
      .filter((c) => ecrit(c.etats[c.etats.length - 1].valeur, cbl))
      .sort((a, b) => (pilotee ? noteDe(b) - noteDe(a) : 0)
        || (nbFicelles(a) - nbFicelles(b)) || (nettete(a) - nettete(b))
        || (lues(b) - lues(a))
        || (a.ops.length - b.ops.length) || (dilue(a) - dilue(b)) || comparerChemins(a, b));
    // ⚠️ La canonicalisation est CHÈRE (`normaliserChemin` rejoue le programme
    //   une fois par étape candidate) et la boucle ci-dessous ne s'arrête que
    //   lorsqu'elle a rempli la réserve. Sur un fragment où beaucoup de voies
    //   se ramènent au même canon, elle les canonicaliserait toutes. On borne
    //   donc aussi le nombre d'ESSAIS : quatre fois la réserve suffit largement
    //   à trouver quatre voies distinctes, et à défaut la réserve reste
    //   partielle — ce qui est sans conséquence, elle n'est pas obligatoire.
    const formes = new Set();
    let essais = 0;
    for (const c of candidats) {
      if (parLaQualite.length >= RESERVE_QUALITE || essais >= RESERVE_QUALITE * 4) break;
      essais++;
      const cle = cleTrace(normaliserChemin(c));
      if (formes.has(cle)) continue;
      formes.add(cle);
      parLaQualite.push(c);
    }
  }
  /* ★ **UN SIÈGE PAR CHIFFRE DEMANDÉ — la troisième réserve, et celle sans
       laquelle une cible-MOTIF est hors d'atteinte.**

     Le tri ci-dessus range par COMPTE de chiffres utiles, et le plafond coupe
     là. Sur une cible homogène c'est sans conséquence : tous les chiffres
     utiles sont le même. Sur une cible mêlée, c'est fatal — le chiffre le plus
     FRÉQUENT de la cible gonfle le compte, donc les voies qui le produisent en
     masse raflent toutes les places, et les chiffres rares n'arrivent jamais
     jusqu'à l'assemblage.

     ⚠️ MESURÉ sur `Henri Prunelle Chochotte` visant `01111984` : chacun des
       trois mots SAIT produire un 0, un 4, un 8 et un 9 — la matière existe —,
       mais les vingt vecteurs qui franchissaient le plafond étaient tous des
       lectures riches en 1. La portée arrivait donc à la moisson incapable de
       fournir quatre des cinq chiffres demandés, et aucun algorithme en aval ne
       pouvait plus rien y faire. Le biais de comptage n'était pas dans le
       choix : il était déjà dans la MATIÈRE.

     On réserve donc une place à la meilleure voie qui SAIT DONNER chacun des
     chiffres de la cible, dans l'ordre croissant de l'alphabet — un ordre, pas
     une préférence (§4.4 règle 3).

     ★ Repli EXACT sur toute cible homogène (`666`, `111`, `777`, `000`) : la
       réserve n'est même pas calculée. Et sur les voies du GROUPEMENT elle est
       vide de toute façon — celles-là écrivent déjà la cible entière
       (`exigeSerie`), elles portent donc tous ses chiffres. */
  /* ⚠️ **ET LA RÉSERVE VA D'ABORD AUX VOIES SANS FICELLE.** Ce n'est pas une
       préférence esthétique posée ici : la MOISSON refuse les ficelles à
       l'entrée (`candidatsDePortee`, « aucune ficelle dans une moisson »), et
       elle est justement celle qui a besoin de cette réserve. Mesuré : sur
       `Henri` visant `01111984`, les dix-huit vecteurs qui portent un 0, un 4
       ou un 8 emploient TOUS `mrd` — le siège réservé partait donc à une voie
       que l'appelant jetterait une ligne plus loin, et la portée arrivait
       toujours aussi démunie. On ne retombe sur une ficelle que si aucune voie
       honnête ne sait donner ce chiffre-là. */
  const parLeMotif = [];
  if (politique(profilDeCible(cbl)).siegeParChiffre) {
    const donne = (x, d) => !parLeMotif.includes(x)
      && x.etats[x.etats.length - 1].valeur.includes(d);
    for (const d of cbl.alphabet) {
      const c = out.find((x) => !nbFicelles(x) && donne(x, d)) || out.find((x) => donne(x, d));
      if (c) parLeMotif.push(c);
    }
  }
  const tete = [...parLeMotif.slice(0, plafond)];
  {
    /* ★ **UNE PROMOTION NE COÛTE PAS SA PLACE — la réserve n'EXCLUT plus de la
         quantité.**

       MESURÉ, et c'est la cause d'une violation d'invariant : la réserve de
       qualité se dimensionne sur le plafond (`reserveDeQualite`), donc elle
       s'agrandit quand le cran monte. Un candidat qui entrait par la QUANTITÉ à
       la largeur d'avant s'y trouve PROMU à la largeur suivante — et la
       quantité l'excluait alors. Or les sièges de qualité sont rares (un sur
       quatre au défaut) : promu, il est servi bien plus tard, et il tombe hors
       de la tête. Sur « Jim » visant 666, `fr17+tca+mz26+mdc3` — cinquième de
       la quantité, retenu au cran 0 — devient cinquième de la réserve au cran 1
       et disparaît, alors qu'il vaut 2 803 et que la liste garde des voies à
       1 912.

       La réserve GARANTIT des places à la qualité ; elle n'a jamais eu pour
       rôle d'en retirer. Un candidat réservé garde donc son rang de quantité,
       et l'on saute simplement ce qui est déjà pris. */
    const parLaQuantite = out.filter((c) => !tete.includes(c));
    const pris = new Set(tete);
    let iQte = 0;
    let iQal = 0;
    const suivant = (liste, i) => {
      let k = i;
      while (k < liste.length && pris.has(liste[k])) k++;
      return k;
    };
    const poser = (c) => { tete.push(c); pris.add(c); };
    while (tete.length < plafond) {
      iQte = suivant(parLaQuantite, iQte);
      iQal = suivant(parLaQualite, iQal);
      if (iQte >= parLaQuantite.length && iQal >= parLaQualite.length) break;
      // Les sièges de la qualité tombent là où sa part cumulée franchit un
      // entier (`siegeDeQualite`) — au défaut, le quatrième de chaque quatre,
      // comme avant —, et le tour revient à la quantité dès que la réserve est
      // épuisée (et réciproquement).
      const auTourDeLaQualite = siegeDeQualite(tete.length + 1, part);
      if (auTourDeLaQualite && iQal < parLaQualite.length) poser(parLaQualite[iQal++]);
      else if (iQte < parLaQuantite.length) poser(parLaQuantite[iQte++]);
      else if (iQal < parLaQualite.length) poser(parLaQualite[iQal++]);
      else break;
    }
  }
  /* ★ **UN SIÈGE POUR LA VOIE SANS PERTE — la quatrième réserve.**

     > « Je voudrais arriver à toujours proposer un chemin sans aucune perte,
     >   même s'il ne remonte pas toujours en premier résultat ; si avec les
     >   réglages je fais primer l'exhaustivité, alors il doit remonter. »
     >   (l'auteur)

     Le tri ci-dessus range par COMPTE, la réserve de qualité par netteté puis
     brièveté, et une voie qui dissout TOUT (`mab`, l'absorption arithmétique)
     est une ficelle aux yeux du faisceau (`A_MERITER_SA_PLACE`) : elle passe
     derrière toute voie honnête à compte voisin, et le plafond la coupe avant
     l'assemblage. Le barème ne peut alors plus rien pour elle — il ne la voit
     jamais —, et les curseurs de l'écran de liste non plus.

     ⚠️ MESURÉ sur « Donald Trump » visant 666 : `fl+tca+ma1+mab` rejouée par
       son lien vaut 7 218 points (deux séries, rendement 1 000, rien de
       jeté) ; la tête de liste en valait 4 077, et la liste ne la proposait
       pas. Même relevé sur « Éléonore à Nîmes » visant 111 (7 186 contre
       5 959) et sur « Le chat dort sur le tapis rouge » (7 113, trois séries).

     On réserve donc UN siège — pas plus — à la meilleure voie dont la ligne
     finale est la cible, écrite un nombre entier de fois, et rien d'autre,
     et dont aucune étape n'ÉCARTE (`OPERATEURS_QUI_ECARTENT` : ce que `mpf`,
     `m36` ou `m1s2` retirent est perdu ; ce que `mab` ou `meg` absorbent ou
     réécrivent ne l'est pas — `dilue` ne fait pas la différence, il compte la
     ligne la plus large traversée, et une absorption la traverse entière).
     Le moins de ficelles d'abord — une voie honnête qui y parvient vaut
     mieux —, puis LE PLUS DE CARACTÈRES LUS (`caracteresLus` : une voie qui ne
     lit que les consonnes a perdu les voyelles avant même de compter —
     mesuré, `fc+tca+masc+mab` passait devant `fl+tca+mch+mab` sur « Henri
     Prunelle Chochotte »), puis le moins d'étapes, puis l'ordre des chemins.
     Le siège est le DERNIER de la première moitié : c'est celle que l'appelant
     garde (`assembler`, `.slice(0, kParFragment)`), et poser la réserve en
     tête déplacerait toutes les autres d'un rang.

     ★ Repli EXACT : sans une telle voie, ou si elle est déjà dans la première
       moitié, rien ne bouge. Et l'élu est DISPENSÉ de « une ficelle qui
       n'apporte rien n'est pas proposée » (`apporteQuelqueChose`) : cette
       règle compare sur `dilue`, qui tient l'absorption pour du gaspillage —
       précisément ce que l'auteur conteste —, et une voie honnête « au moins
       aussi bonne » sur ces trois mesures peut très bien laisser un reliquat
       au verdict. L'élu répond à une autre question ; c'est le barème qui le
       classe. */
  // ★ **DEUX ÉLUS, ET LE SECOND EST LA VOIE PUREMENT ADDITIVE.**
  //
  //   > « Là où l'addition peut, en davantage d'étapes que `mab`, la voie par
  //   >   addition apparaît-elle ? » (l'auteur)
  //
  //   Elle n'apparaissait pas : le siège était UNIQUE et se tranchait au plus
  //   court, donc `mab` — qui dispose du produit et de la différence — le
  //   prenait chaque fois que les deux existaient. Mesuré sur
  //   `hope-hope-hope.fr` : `fl+ma1+mrdE+mr9` écrit 666 sans rien jeter
  //   (score 3 552) et n'était proposée à AUCUN cran, parce que
  //   `fl+ma1+mab` (3 684) tenait le siège avec une étape de moins.
  //
  //   L'auteur a demandé les deux — « une approche addition uniquement, EN PLUS
  //   de `mab`, pas à la place » —, et le lecteur a le droit de voir laquelle
  //   il préfère. On réserve donc un second siège à la meilleure voie sans
  //   perte dont aucune étape n'emploie l'absorption : elle ne passe que par
  //   des sommes et des racines, quitte à y mettre une étape de plus.
  const elus = [];
  {
    const exactement = (c) => {
      const v = c.etats[c.etats.length - 1].valeur;
      return v.length > 0 && nbTriptyques(v, cbl) * cbl.longueur === v.length;
    };
    const ecarte = (c) => c.ops.some((o) => o && o.id && OPERATEURS_QUI_ECARTENT.has(o.id));
    // ★ Les caractères lus AVANT le nombre de ficelles : « sans perte » se
    //   juge d'abord sur la saisie. Mesuré sur « Éléonore à Nîmes » visant 111 :
    //   `fi+tca+msfr` — les initiales, trois lettres sur quatorze — prenait le
    //   siège de `fl+tca+mch+mab`, qui les lit toutes, parce qu'il est honnête.
    /* ★ **UN RATTRAPAGE, PARCE QUE LE FAISCEAU NE FABRIQUE PAS TOUT.**

       > « Selon comment tu convertis, la séquence chiffrée n'est pas la même.
       >   Du coup, dans le lot, il devrait y avoir des chemins qui mènent au
       >   résultat par addition sans surplus. Ils sont juste plus difficiles à
       >   calculer, j'imagine. » (l'auteur)

       Il avait raison, et la mesure lui donne raison deux fois. Sur « Donald
       Trump », `mrdE` accepte SEIZE des lignes que les mappeurs produisent, et
       l'une d'elles — `fl+tca+mx6+mrdE` — écrit `[6 6 6 6 6 6]` d'un trait,
       deux séries, rien de jeté (score 3 602). Elle n'était proposée à aucun
       cran : le faisceau du BFS l'avait élaguée avant l'assemblage, et un
       siège ne peut élire que ce qu'on lui présente.

       On tente donc l'absorption additive SUR PLACE, à la fin de la
       fabrication : pour chaque vecteur déjà calculé, une application de
       `mrdE`, et l'on garde ce qui écrit la cible exactement. C'est borné —
       une application par vecteur, sur les vecteurs qu'on a déjà —, et cela ne
       s'exécute que si aucune voie additive sans perte n'est ressortie du
       faisceau. */
    const additifs = (ops || [])
      .filter((o) => o && o.id === 'm.redecoupageExact');
    if (additifs.length) {
      // ⚠️ La question n'est pas « une voie sans perte existe-t-elle » — `meg`
      //   en fournit souvent une — mais « en existe-t-il une PAR ADDITION ».
      //   Le premier critère, trop large, éteignait le rattrapage six fois sur
      //   sept sur « Donald Trump ».
      const dejaAdditive = out.some((c) => !ecarte(c) && exactement(c)
        && c.ops.some((o) => o && o.id === 'm.redecoupageExact'));
      if (!dejaAdditive) {
        const vierge = (c) => !c.ops.some((o) => o && o.id
          && (o.id === 'm.redecoupageExact' || o.id === 'm.absorption'
            || Object.prototype.hasOwnProperty.call(FICELLES, o.id)));
        for (const c of out.slice(0, RATTRAPAGE_ADDITIF_MAX)) {
          const fin = c.etats[c.etats.length - 1];
          if (!fin || fin.type !== 'NUMS') continue;
          if (!vierge(c)) continue;
          for (const op of additifs) {
            const suite = appliquerOp(op, fin);
            if (!suite) continue;
            retenir(c.ops.concat([op]), c.etats.concat([suite]));
          }
        }

        /* ★ **RELIRE AUTREMENT CE QU'ON A DÉJÀ CHOISI : une substitution
             glissée AU MILIEU d'une chaîne qui marchait presque.**

           > « Selon comment tu convertis Sarah Kerrigan (gématrie, 14
           >   segments…), la séquence chiffrée n'est pas la même. Du coup,
           >   dans le lot, il devrait y avoir des chemins qui mènent au
           >   résultat par addition sans surplus. » (l'auteur)

           Encore raison, et la mesure le confirme : sur « Sarah Kerrigan »
           visant 31031998, `fl+fr2+tca+masc+mrdE` écrit `[3 1 0 3 1 9 9 8]`
           par sommes seules, sans rien jeter. Le faisceau ne la fabriquait
           pas, parce que son premier étage n'applique jamais QU'UN filtre.

           ⚠️ **ON N'ÉLARGIT PAS L'ÉTAGE 1 POUR AUTANT.** Mesuré : y autoriser
             tous les couples sélection × substitution fait passer le pipeline
             de ~1 s à 12-27 s ET dégrade le résultat — sur « Henri Prunelle
             Chochotte », la voie sans perte DISPARAÎT, noyée sous 450 bases
             que le faisceau élague au petit bonheur. Payer quinze fois plus
             cher pour trouver moins, c'est le contraire d'une recherche.

           On garde donc la sélection trouvée par le faisceau et on se
           contente de la RELIRE : pour les quelques meilleures chaînes, on
           insère une substitution (un César, un Atbash — tout filtre qui
           conserve la longueur) juste après les filtres de tête, on rejoue la
           suite telle quelle, et l'on tente l'absorption additive au bout.
           Borné, et seulement quand le rattrapage simple n'a rien donné. */
        const additifTrouve = () => out.some((c) => !ecarte(c) && exactement(c)
          && c.ops.some((o) => o && o.id === 'm.redecoupageExact'));
        if (!additifTrouve()) {
          const substitutions = [];
          for (const c of out.slice(0, 1)) {
            const d = c.etats[0];
            if (!d || d.type !== 'STR') break;
            for (const o of ops) {
              if (o.from !== 'STR' || o.to !== 'STR') continue;
              const r = appliquerOp(o, d);
              if (r === null) continue;
              // Substituer, c'est remplacer un caractère par un autre : la
              // longueur ne bouge pas. Sélectionner en retire. On le lit sur
              // le résultat, le catalogue n'a pas à le déclarer.
              if ([...String(r.valeur)].length !== [...String(d.valeur)].length) continue;
              if (String(r.valeur) === String(d.valeur)) continue;
              substitutions.push(o);
            }
          }
          for (const c of out.slice(0, RATTRAPAGE_SUBSTITUTION_MAX)) {
            if (!vierge(c) || !c.etats.length) continue;
            let k = 0;
            while (k < c.ops.length && c.ops[k] && c.ops[k].from === 'STR'
              && c.ops[k].to === 'STR') k += 1;
            for (const g of substitutions) {
              const suite = c.ops.slice(0, k).concat([g], c.ops.slice(k));
              const etats = [c.etats[0]];
              let e = c.etats[0];
              for (const o of suite) {
                e = appliquerOp(o, e);
                if (e === null) break;
                etats.push(e);
              }
              // ⚠️ **À CHAQUE ÉTAPE CHIFFRÉE DU REJEU, PAS SEULEMENT AU BOUT.**
              //   La chaîne d'origine finit souvent par un redécoupage à elle
              //   (`mrd`) ; y coller l'absorption additive donne un autre
              //   chemin que celui qu'on cherche. La voie mesurée sur
              //   « Sarah Kerrigan » est `fl+fr2+tca+masc+mrdE` : elle S'ARRÊTE
              //   au mappeur et absorbe là. On tente donc chaque préfixe qui
              //   passe par la substitution insérée.
              for (let i = k + 1; i < etats.length; i += 1) {
                if (etats[i].type !== 'NUMS') continue;
                for (const op of additifs) {
                  const bout = appliquerOp(op, etats[i]);
                  if (!bout) continue;
                  retenir(suite.slice(0, i).concat([op]), etats.slice(0, i + 1).concat([bout]));
                }
              }
            }
            if (additifTrouve()) break;
          }
        }
      }
    }
    const sansPerte = out
      .filter((c) => !ecarte(c) && exactement(c))
      .sort((a, b) => (caracteresLus(b, texte) - caracteresLus(a, texte))
        || (nbFicelles(a) - nbFicelles(b))
        || (a.ops.length - b.ops.length) || comparerChemins(a, b));
    // Le meilleur toutes méthodes, puis le meilleur qui n'absorbe que par
    // additions — l'absorption additive d'abord, à défaut toute voie sans
    // ficelle ni absorption. Le second n'est retenu que s'il diffère du premier.
    // ⚠️ **ET SANS AUCUNE FICELLE.** Le second siège cherche la voie « addition
    //   uniquement » ; une ficelle qui absorbe — `mad` — n'en est pas une, et
    //   le tri par caractères lus la faisait passer devant. Mesuré sur
    //   « Macron » : `fatb+tca+mms+mad` prenait la 1ʳᵉ place, et le garde-fou
    //   des quatre cas de référence rougissait à bon droit.
    //   ⚠️ Sur les VRAIES ficelles du barème (`FICELLES`), et non sur
    //     `nbFicelles` — qui compte `A_MERITER_SA_PLACE`, où le redécoupage
    //     exact figure lui aussi : s'en servir ici excluait précisément la voie
    //     qu'on cherche.
    const honnete = (c) => !c.ops.some((o) => o && o.id
      && (o.id === 'm.absorption' || Object.prototype.hasOwnProperty.call(FICELLES, o.id)));
    const additive = sansPerte.find((c) => honnete(c)
      && c.ops.some((o) => o && o.id === 'm.redecoupageExact'))
      || sansPerte.find(honnete);
    /* ★ **UN TROISIÈME ÉLU : LA VOIE COURTE QUI LIT TOUT.**

       > « Que fl+m14 sorte est dérangeant. Une voie aussi simple est
       >   précieuse. » (l'autrice, 18 septembre 2026, sur « Louis Fouché »)

       Son goût, consigné : « court et exhaustif, sans passer par mab ». Or rien
       dans cette fonction ne tient ces deux mots ensemble. Le tri range par
       COMPTE de 6, la réserve de qualité par netteté (ce que le verdict n'aura
       pas à jeter), les deux premiers élus par l'absence de perte. Une voie de
       deux gestes qui lit toutes les lettres et écrit la cible une fois, en
       laissant quelques valeurs au verdict, n'est première sur aucun de ces
       critères — elle ne tenait sa place que tant que la concurrence était
       rare. MESURÉ sur « Louis Fouché » : `fl+tca+m14` était 5ᵉ de la fenêtre
       du fragment entier ; `mas` et `mu8`, qui codent chaque caractère d'une
       ligne de douze et fabriquent des lignes riches en 6 (`fr2+tca+mu8+mdc3`,
       `tca+mu8+mabx`…), l'ont repoussée au 23ᵉ rang, et elle a quitté la
       liste — non pas classée plus bas : plus FABRIQUÉE. Au global, elle
       aurait été 3ᵉ (647).

       ★ La règle est générale, et c'est celle de l'autrice mot pour mot :
         parmi les voies SANS FICELLE (`nbFicelles` : ni absorption, ni
         égalisation, ni rien de ce qui doit mériter sa place) qui ÉCRIVENT la
         cible et LISENT tous les caractères signifiants du fragment
         (`score-intermediaire.js › litTout`), la plus COURTE au tarif du
         barème (`score.js › longueurRendue` : `tca` gratuit, les retraits
         grammaticaux en remise), puis la plus fournie, puis l'ordre des
         chemins (§4.4). Aucun code d'opérateur n'y est nommé.
       ★ Elle entre comme les deux autres élus : EN PLUS, à la fin de la
         moitié gardée, sans prendre la place d'un siège réservé ; et, sans
         ficelle, elle n'a pas à mériter sa place. Si elle y est déjà, rien ne
         bouge.
       ★ Au GROUPEMENT seulement (`miseEnForme`) : c'est lui qui propose des
         voies au lecteur. La MATIÈRE d'une moisson garde sa fenêtre d'avant
         au chemin près — la garantie « zéro voie sortie » de la fenêtre par
         famille (`familles.test.js`). */
    const courte = !miseEnForme ? null : out
      .filter((c) => !nbFicelles(c) && ecrit(c.etats[c.etats.length - 1].valeur, cbl) && litTout(c, texte))
      .sort((a, b) => (longueurRendue([a]) - longueurRendue([b])) || (six(b) - six(a)) || comparerChemins(a, b))[0];
    for (const c of [sansPerte[0], additive, courte]) if (c && !elus.includes(c)) elus.push(c);
    // ⚠️ Les places visées sont les DERNIÈRES de la première moitié, et jamais
    //   négatives : sur une liste courte (`plafond` à deux), `fenetre - 1 - rang`
    //   passait sous zéro et `splice` insérait alors depuis la FIN — la voie
    //   sans perte de `hope` disparaissait au lieu d'être posée.
    const fenetre = Math.max(1, Math.floor(plafond / 2));
    /* ★ **QUAND LES CURSEURS PILOTENT, UN ÉLU PREND LA PLACE D'UN SIÈGE DE
         QUANTITÉ — jamais celle d'un siège réservé, ni celle de l'autre élu.**

         Poser un élu au bout de la première moitié en repousse le dernier
         occupant hors de ce que l'assemblage garde, quel qu'il soit. Deux
         sièges promis s'y perdent, et chacun contredit une consigne écrite plus
         haut :

          · le SECOND élu repousse le PREMIER. Posé en `fenetre − 2`, il décale
            d'un cran celui qu'on vient de poser en `fenetre − 1`, qui sort. Or
            l'auteur a demandé la voie additive « EN PLUS de `mab`, pas à la
            place » — et c'est « à la place » que le code fait, chaque fois que
            les deux élus sont neufs. MESURÉ sur « Le jardin sur le rocher de la
            maison » : `tm+mlm+mab`, qui lit toute la saisie, sort juste après la
            coupe, chassé par `fl+tca+msen+mrdE` ;
          · l'élu repousse le dernier siège de la RÉSERVE — au défaut, le
            quatrième de chaque quatre, par construction. Une réserve dont les
            curseurs règlent la taille doit tenir les sièges qu'elle annonce.

         ★ **ET C'EST CORRIGÉ PARTOUT, curseurs par défaut compris** — sur
           décision de l'auteur : « pour ce qui est du bug corrigé seulement avec
           curseur personnalisé, il me semblerait pertinent de le corriger
           partout ».

           La correction n'a d'abord été appliquée qu'aux curseurs touchés, pour
           ne pas changer seule la tête de liste : au défaut, elle change 28
           listes sur 29 au banc (`.planning/banc/sieges-banc.mjs`) et NEUF
           premières places, qui passent toutes à une voie d'absorption (`mab`,
           `mad`) — Millicent, Wikipedia, apophenie, satan, le jardin, « La
           numérologie… », Henri Prunelle, « Les 7 nains », « Le 6 est sur le
           mur ». C'est ce que « EN PLUS, pas à la place » veut dire au pied de
           la lettre, et l'auteur l'a voulu. */
    const protege = (x) => elus.includes(x) || parLaQualite.includes(x) || parLeMotif.includes(x);
    elus.forEach((c, rang) => {
      const deja = tete.indexOf(c);
      if (deja >= 0 && deja < fenetre) return;
      if (deja >= 0) tete.splice(deja, 1);
      const place = Math.max(0, Math.min(fenetre - 1 - rang, tete.length));
      tete.splice(place, 0, c);
      if (tete.length > fenetre && protege(tete[fenetre])) {
        let j = fenetre - 1;
        while (j >= 0 && protege(tete[j])) j--;
        if (j >= 0) {
          const [cede] = tete.splice(j, 1);
          tete.splice(fenetre, 0, cede);
        }
      }
      if (tete.length > plafond) tete.length = plafond;
    });
  }
  const mesureDe = (c) => {
    const fin = c.etats[c.etats.length - 1];
    return { six: six(c), dilue: dilue(c), trip: nbTriptyques(fin.valeur, cbl) };
  };
  const honnetes = tete.filter((c) => !nbFicelles(c)).map(mesureDe);
  const apporteQuelqueChose = (c) => {
    if (!nbFicelles(c)) return true;
    const m = mesureDe(c);
    return !honnetes.some((h) => h.six >= m.six && h.dilue <= m.dilue && h.trip >= m.trip);
  };

  const finaux = [];
  const vusCan = new Set();
  for (const c of tete) {
    if (!elus.includes(c) && !apporteQuelqueChose(c)) continue;
    const n = normaliserChemin(c);
    const cle = cleTrace(n);
    if (vusCan.has(cle)) continue;
    vusCan.add(cle);
    finaux.push(n);
  }
  if (options.compteur) options.compteur.travail += compte.travail;
  if (memo) memo.set(cleMemo, { chemins: finaux, travail: compte.travail });
  return memo ? finaux.slice() : finaux;
}

/**
 * ★ LE GROUPEMENT SOUS RETOUCHE — « on fait la conversion fr13 sur le 2ᵈ mot,
 *   puis on trie l'ensemble, on applique m14 à l'ensemble » (l'auteur).
 *
 * La grammaire sait désormais l'écrire (`url.js`, le `;`) et le moteur sait le
 * rejouer (`index.js`). Reste à le TROUVER, et c'est ici.
 *
 * ★ **On n'explore pas un espace de plus, on RETESTE ce qu'on a déjà trouvé.**
 * L'étage prend les vecteurs que `vecteursDeSix` vient de rendre sur la saisie
 * entière et les rejoue à l'identique sur une saisie dont UN mot a été réécrit.
 * C'est exactement la question de l'auteur — « la même méthode, si l'on chiffre
 * ce mot-là, donne-t-elle davantage ? » — et c'est ce qui rend l'étage abordable :
 * aucune énumération neuve, seulement des programmes connus rejoués.
 *
 * ★ **Et la réponse ne compte que si elle est OUI.** Une retouche qui laisse le
 * compte de séries inchangé n'est pas une variante, c'est un détour : la même
 * démonstration, une opération de plus, et rien de plus à montrer. On exige
 * donc STRICTEMENT plus de séries qu'avant retouche.
 *
 * ⚠️ **Ce garde-fou a tenu lieu de barème, et il ne le tient plus.** Il a été
 * écrit du temps où les opérations d'une retouche n'étaient vues ni par
 * `score.js` ni par `elegance.js` — elles voyagent à côté des parts, jamais
 * dedans (voir `index.js › rejouer`, et le pavé qui explique pourquoi les
 * mettre dedans fabriquerait un mode faux) —, si bien qu'une voie retouchée
 * était notée comme si son étage amont était gratuit. Le barème le charge
 * désormais (`elegance.js › BAREME.RETOUCHE`), et c'est LUI qui arbitre.
 *
 * ★ Le seuil reste, et il change de rôle : ce n'est plus un prix de
 * remplacement, c'est un filtre de GÉNÉRATION. Une retouche qui ne rapporte pas
 * une série est un détour — la même démonstration, une opération de plus, et
 * rien de plus à montrer —, et il n'y a pas de raison d'aller jusqu'à la noter
 * pour l'apprendre. Il économise du travail ; il ne prononce plus de verdict.
 *
 * ★ **Trois bornes, et elles sont là pour le budget, pas pour la doctrine.** Le
 * pipeline complet tient sous la seconde (`recherche.test.js`) et la saisie la
 * plus lourde du banc en consomme déjà 96 %. Le produit `mots × filtres ×
 * vecteurs` est ce qui pourrait s'emballer : on le borne aux premiers mots, aux
 * vecteurs de tête, et à la saisie entière — jamais aux sous-fragments, dont la
 * recombinaison n'apporterait qu'une explosion.
 *
 * ⚠️ Et même ainsi bornées, elles coûtent quelque chose. MESURÉ à JIT chaud, sur
 * les cinq cas du test de budget, l'étage branché contre l'étage tu :
 *
 *     Lorem ipsum… (60 fragments) ....  770 → 826 ms CPU   (+56)
 *     `x` × 400 ......................  492 → 529 ms       (+37)
 *     Le chat dort sur le tapis… ......  450 → 410 ms       (−40, sous le bruit)
 *     https://hope-hope-hope.fr/ ......  383 → 283 ms       (−100, sous le bruit)
 *
 * Le pire cas reste à 826 des 1 000 ms du contrat. À FROID, la mesure ne dit
 * plus rien — le premier `resoudre` d'un processus paie 2 à 3 secondes de JIT,
 * avec ou sans l'étage —, et c'est ce que `budget — le pipeline complet tient
 * sous la seconde` constate quand il rougit.
 *
 * ⚠️ Les trois bornes n'ont toujours pas été balayées L'UNE CONTRE L'AUTRE : on
 * sait ce que leur produit coûte, pas ce que chacune achète. C'est le chantier
 * qui reste ouvert sur cet étage.
 *
 * @param {string} saisie
 * @param {Object[]} jetons        la tokenisation de la saisie (§4.2)
 * @param {Object[]} vecteurs      les chemins-vecteurs déjà trouvés sur la saisie entière
 * @param {Object[]} ops           opérateurs explorables
 * @returns {Object[]} approches GROUPEMENT portant `retouches` et `saisieRetouchee`
 */
function groupementsRetouches(saisie, jetons, vecteurs, ops, cible = CIBLE_DEFAUT, progres = null, gardes = {}) {
  const cbl = normaliserCible(cible);
  const mots = jetons.filter((j) => j.genre === 'W').slice(0, gardes.mots ?? MAX_JETONS_RETOUCHE);
  if (!mots.length) return [];
  const retoucheurs = ops.filter((o) => o.from === 'STR' && o.to === 'STR');
  const tete = vecteurs.slice(0, gardes.vecteurs ?? MAX_VECTEURS_RETOUCHES);
  // Le compte de séries AVANT retouche, mesuré une fois par vecteur : c'est le
  // seuil que la retouche doit battre.
  const avant = tete.map((c) => { const s = serieDeSix(c, cbl); return s ? s.series : 0; });

  /* ★ **LE MÉMO DU MOTEUR** (`gardes.memo`, le cache de `creerMoteur`).
       MESURÉ au profileur sur le paragraphe « Lorem ipsum… » du test de budget :
       depuis le cran rapide (−1), cet étage tournait DEUX fois à l'identique —
       au cran −1, puis au cran 0, sur les mêmes vecteurs de la saisie entière
       (ceux-là ne dépendent pas du budget de fragments) —, et passait de 323 à
       653 ms. Il ne lit que ses arguments : la même question rend la même
       réponse.
       ★ Des COPIES, dans les deux sens : les approches rendues sont notées puis
         classées en place (`noter`, `finaliser`), et un cran ne doit rien
         écrire sur les voies d'un autre. On garde un gabarit intact, on rend
         une copie, et la marque « hors des gardes historiques » est reposée
         sur la copie. */
  const memo = gardes.memo instanceof Map ? gardes.memo : null;
  const cleMemo = memo ? JSON.stringify(['groupementsRetouches', String(saisie).normalize('NFC'), cbl.texte,
    gardes.mots ?? MAX_JETONS_RETOUCHE, gardes.vecteurs ?? MAX_VECTEURS_RETOUCHES, cleDesOps(ops),
    tete.map((c) => c.ops.map((o) => o.code).join('+'))]) : null;
  const copier = (a) => ({
    ...a,
    parts: a.parts.map((p) => ({ ...p })),
    ...(Array.isArray(a.retouches) ? { retouches: a.retouches.map((r) => ({ ...r })) } : {}),
  });
  if (memo) {
    const deja = memo.get(cleMemo);
    if (deja) {
      if (progres) progres(1);
      return deja.map(({ gabarit, horsGardes }) => {
        const c = copier(gabarit);
        if (horsGardes && gardes.horsGardes) gardes.horsGardes.add(c);
        return c;
      });
    }
  }
  const gabarits = [];

  const out = [];
  const vus = new Set();
  /* ★ Le rapport de progression : ce mode pèse 814 à 1 168 ms (voir
     `assembler`), et il calcule longtemps avant de produire sa première
     approche. Sans rapport ICI, la jauge restait immobile toute sa durée. */
  let motsVus = 0;
  for (const j of mots) {
    motsVus += 1;
    if (progres) progres(motsVus / Math.max(1, mots.length));
    const iJeton = jetons.indexOf(j);
    const depart = etat('STR', j.texte, [[0, j.texte.length]]);
    for (const f of retoucheurs) {
      const apres = appliquerOp(f, depart);
      // Une retouche qui ne change rien au mot n'est pas une retouche : elle
      // ajouterait une étape à la scène pour montrer que rien ne bouge.
      if (apres === null || apres.type !== 'STR' || !apres.valeur.length
        || apres.valeur === j.texte) continue;
      const texte = saisie.slice(0, j.offset) + apres.valeur + saisie.slice(j.offset + j.longueur);
      const motHorsGardes = motsVus > MAX_JETONS_RETOUCHE;
      tete.forEach((c, i) => {
        const rejoue = rejouerOps(texte, c.ops);
        if (!rejoue) return;
        const s = serieDeSix(rejoue, cbl);
        if (!s || s.series <= avant[i]) return;
        // Deux retouches différentes peuvent rendre le même texte (`fmaj` et
        // `fmin` sur un mot déjà en capitales, par exemple) : le spectacle
        // serait le même, et la déduplication d'aval ne les verrait pas passer
        // — elle compare les parts, et les parts sont ici identiques.
        const cle = texte + ' ' + cleTrace(rejoue);
        if (vus.has(cle)) return;
        vus.add(cle);
        const retouchee = approche('GROUPEMENT', [{
          fragment: {
            texte, offset: 0, longueur: texte.length,
            intervalles: [[0, texte.length]], tokenDebut: 0, tokenLong: tokeniser(texte).length,
            famille: 'entier', priorite: 5, entier: true,
          },
          chemin: rejoue,
        }], {
          retouches: [{
            fragment: {
              texte: j.texte, offset: j.offset, longueur: j.longueur,
              intervalles: [[j.offset, j.offset + j.longueur]],
              tokenDebut: iJeton,
              tokenLong: 1,
              /* ★ **UNE RETOUCHE QUI COUVRE TOUT S'ÉCRIT SANS PORTÉE** — verdict
                 n° 4 de l'autrice (15 septembre 2026) :

                 > « Pourquoi : `0:fr13;ma1+mab` plutôt que `fr13+ma1+mab` ? il
                 >   n'y a qu'un mot. »

                 Ce descripteur est bâti PAR JETON, et il l'annonçait toujours
                 comme une portée. Or `url.js › porteeDe` n'omet la portée que
                 pour la famille `'entier'` : sur une saisie d'un seul mot, le
                 lien écrivait `0:` pour désigner… toute la saisie. Le jeton et
                 la saisie sont alors la MÊME chose, et c'est la famille qui doit
                 le dire.

                 ⚠️ Le `;` reste, lui, et il le faut : il marque l'ÉTAGE, pas la
                   portée. Sans lui, `fr13;ma1+mab` deviendrait `fr13+ma1+mab`,
                   qui est un programme ordinaire parfaitement valide — deux
                   démonstrations distinctes sous un seul lien. */
              famille: (j.offset === 0 && j.longueur === saisie.length) ? 'entier' : 'portee',
              priorite: 2,
            },
            chemin: { ops: [f], etats: [depart, apres], valeur: null, cout: f.cout || 0 },
          }],
          saisie,
          saisieRetouchee: texte,
        });
        // ★ Née au-delà des gardes historiques (six mots, quatre vecteurs) :
        //   `index.js › finaliser` la sélectionne à part, pour que la rampe
        //   n'ôte rien à ce que les anciennes gardes auraient montré.
        const horsGardes = motHorsGardes || i >= MAX_VECTEURS_RETOUCHES;
        if (gardes.horsGardes && horsGardes) gardes.horsGardes.add(retouchee);
        if (memo) gabarits.push({ gabarit: copier(retouchee), horsGardes });
        out.push(retouchee);
      });
    }
  }
  if (memo) memo.set(cleMemo, gabarits);
  return out;
}

/** Combien de valeurs d'un vecteur APPARTIENNENT à la cible. Sur `666`, les 6. */
function compterSix(e, cible = CIBLE_DEFAUT) {
  if (!e || e.type !== 'NUMS') return 0;
  return indexUtiles(e.valeur, cible).length;
}

/** La valeur finale d'un chemin, ou `null` si son état final n'est pas un `NUM`. */
function valeurFinale(chemin) {
  const e = chemin && chemin.etats && chemin.etats[chemin.etats.length - 1];
  return e && e.type === 'NUM' ? e.valeur : null;
}

/**
 * ★ LA LARGEUR RÉELLEMENT MONTRÉE PAR UN CHEMIN — le plus large de ses vecteurs.
 *
 * Deux tris départagent les candidats « à nombre de 6 égal » par la DILUTION :
 * un `[6,6,6,6]` vaut mieux qu'un `[6,6,6,5,7]`, qui laisse deux valeurs
 * tomber. Le critère est juste — mais il se lisait sur le DERNIER vecteur, et
 * un opérateur qui rétrécit le vecteur AVANT la fin le blanchissait :
 * `fatb+tca+m14` finit sur `[x,6,6,y,6]` (dilution 2) là où `fatb+tca+m14+mpf` finit
 * sur `[6,6,6]` (dilution 0), alors que les DEUX ont calculé et montré cinq
 * valeurs. Le second n'a pas moins dilué : il a jeté plus tôt.
 *
 * ⚠️ MESURÉ. C'est par là que les trois ficelles (`mpf`, `m1s2`, `mad`)
 * évinçaient les voies de référence : sur `https://hope-hope-hope.fr/`, la
 * moisson à six séries changeait de premier fragment, et la voie du contrat
 * disparaissait de la liste — non parce qu'elle était moins élégante (2 233
 * contre 2 219), mais parce qu'elle ne franchissait plus le tri des candidats.
 *
 * On lit donc la dilution sur le vecteur LE PLUS LARGE du chemin. C'est la
 * lecture que CONTRACTS §7-5 laisse ouverte pour le critère de rendement `R` —
 * et elle reste ouverte : ici, elle ne touche AUCUN score, seulement l'ordre
 * dans lequel des candidats équivalents sont examinés.
 */
function largeurMontree(chemin, plancher = 0) {
  let max = plancher;
  for (const e of (chemin && chemin.etats) || []) {
    if (e && e.type === 'NUMS' && e.valeur.length > max) max = e.valeur.length;
  }
  return max;
}

/**
 * ★ Combien de gestes du chemin doivent MÉRITER leur place
 * (`elegance.js › A_MERITER_SA_PLACE`) — les ficelles, l'égalisation, et le
 * redécoupage choisi.
 *
 * ⚠️ Ce n'est PAS `FICELLES`, et ça l'a été. La table des ficelles est un
 * jugement sur le geste, qui décide de paliers d'élégance ; celle-ci dit
 * seulement qu'à quantité comparable, la voie ne prouve pas autant — ce qui est
 * la question que le classement ci-dessus pose, et la seule. L'égalisation en
 * fait partie sans être une ficelle : elle réécrit la ligne entière d'un geste,
 * donc elle produit des 6 en masse par construction. Le redécoupage choisi y est
 * pour la même raison, et depuis qu'il a quitté les ficelles lui aussi : sa
 * découpe est CHOISIE pour tomber sur 6 ou sur 9 le plus souvent possible.
 *
 * ⚠️ MESURÉ, et c'est le second piège que ces trois opérateurs tendaient. Sur
 * `hope-hope-hope.fr`, `fl+tca+m14` rend `[6,6,6,6,6,6,6,6,6,6,6,6,5,7]` et
 * `fl+tca+m14+mpf` rend les douze 6 tout seuls : MÊME récolte, MÊME lecture,
 * MÊME gaspillage (les deux ont calculé quatorze valeurs). Rien ne les
 * départageait, et c'est la ficelle qui passait — elle représentait alors la
 * portée, et la voie honnête disparaissait de la liste.
 *
 * À récolte, lecture et gaspillage ÉGAUX, la ficelle n'a rien apporté : elle
 * passe donc derrière. Ce n'est pas le barème d'élégance qui parle ici — il
 * n'est calculé que bien plus tard, sur les approches assemblées —, c'est la
 * même idée, appliquée là où le choix se fait réellement.
 */
function nbFicelles(chemin) {
  let n = 0;
  for (const o of (chemin && chemin.ops) || []) {
    if (o && o.id && A_MERITER_SA_PLACE.has(o.id)) n++;
  }
  return n;
}

/**
 * ★ **LES MESURES D'UN CHEMIN, CALCULÉES UNE FOIS.**
 *
 * Les tris de `vecteursDeSix` et de `candidatsDePortee` départagent sur des
 * mesures du chemin — son compte de 6, ses ficelles, sa dilution, les caractères
 * qu'il lit — et les recalculaient à CHAQUE comparaison, donc des milliers de
 * fois pour une portée. Ce sont des fonctions pures du chemin (et de la cible, ou
 * du texte de la portée) : on les garde, par chemin, dans un `WeakMap`.
 *
 * ⚠️ MESURÉ sur « Lorem ipsum… », le pire cas du test de budget, quand la fenêtre
 *   par famille a doublé les appels de `candidatsDePortee` : `indexUtiles` 458 ms,
 *   `nbFicelles` 205 ms de temps propre, et le test sortait du budget global
 *   (10 391 à 10 720 ms CPU pour 10 000).
 *
 * ★ Le COMPORTEMENT ne change pas : mêmes valeurs, même comparateur, même ordre
 *   (le tri est stable). Et `normaliserChemin` rend le même objet pour un même
 *   chemin : ce que la fenêtre d'avant a mesuré sert à la fenêtre par famille.
 * ⚠️ Un chemin n'est jamais modifié après sa construction — ses `ops` et ses
 *   `etats` sont des tableaux neufs à chaque étape (`retenir`, le rattrapage) :
 *   c'est ce qui rend le cache par objet exact.
 */
const MESURES_DES_CHEMINS = new WeakMap();
/* ★ Une mesure par clé (cible, texte, plancher), et presque toujours UNE seule
     clé par chemin : la dernière est gardée en clair, et un `Map` n'est créé
     qu'à la deuxième clé distincte. MESURÉ : quatre `Map` par chemin coûtaient
     152 ms de temps propre sur « Lorem ipsum… », sans compter le ramasse-miettes. */
//   Ni fermeture ni tableau par consultation : la fonction de calcul et son
//   argument sont passés tels quels (`calculer(chemin, arg)`), et la CLÉ est
//   celle qu'employait le `Map` — `cbl.texte`, le texte de portée, le plancher.
function mesure(chemin, champ, cle, calculer, arg) {
  const m = mesuresDuChemin(chemin);
  const c = m[champ];
  if (c === null) {
    const v = calculer(chemin, arg);
    m[champ] = { cle, v, autres: null };
    return v;
  }
  if (c.cle === cle) return c.v;
  if (c.autres === null) c.autres = new Map();
  if (!c.autres.has(cle)) c.autres.set(cle, calculer(chemin, arg));
  return c.autres.get(cle);
}
function compterSixDuDernierEtat(chemin, cbl) {
  return compterSix(chemin.etats[chemin.etats.length - 1], cbl);
}
function mesuresDuChemin(chemin) {
  let m = MESURES_DES_CHEMINS.get(chemin);
  if (!m) {
    m = { ficelles: nbFicelles(chemin), six: null, sixDuChemin: null, lus: null, largeur: null };
    MESURES_DES_CHEMINS.set(chemin, m);
  }
  return m;
}
/** `nbFicelles`, gardé. */
function ficellesDuChemin(chemin) {
  return mesuresDuChemin(chemin).ficelles;
}
/** `compterSix` du dernier état, gardé par cible. */
function sixDuDernierEtat(chemin, cbl) {
  return mesure(chemin, 'six', cbl.texte, compterSixDuDernierEtat, cbl);
}
/** `sixDuChemin`, gardé par cible. */
function sixDuCheminGarde(chemin, cbl) {
  return mesure(chemin, 'sixDuChemin', cbl.texte, sixDuChemin, cbl);
}
/** `caracteresLus`, gardé par texte de portée. */
function lusDuChemin(chemin, texte) {
  return mesure(chemin, 'lus', texte, caracteresLus, texte);
}
/** `largeurMontree`, gardée par plancher. */
function largeurDuChemin(chemin, plancher) {
  return mesure(chemin, 'largeur', plancher, largeurMontree, plancher);
}

/**
 * À quels fragments on demande un vecteur.
 *
 * L'énumération coûte ~1 500 applications d'opérateurs par fragment — trois
 * ordres de grandeur sous le budget de la recherche, mais pas gratuit pour
 * autant sur les 64 fragments d'un paragraphe. On la réserve aux fragments qui
 * portent réellement l'assemblage : la saisie entière (c'est là que les 6 sont
 * les plus nombreux), les motifs répétés, puis les unités naturelles.
 *
 * Les fragments sans caractère SIGNIFIANT en sont exclus. Sans ce filtre, le
 * moteur démontrait 666 sur le `www` de `https://www.google.com` en ignorant
 * `google.com` : le critère de couverture le notait bien 0, mais les cinq autres
 * critères, parfaits sur un chemin de deux étapes, le hissaient tout de même au
 * milieu de la liste. Un fragment de boilerplate n'a rien à démontrer.
 */
function fragmentsAVecteur(fragments, ctx) {
  const rang = (f) => (f.entier || f.famille === 'entier' ? 0
    : f.famille === 'repetition' || f.famille === 'periodicite' ? 1
      : f.famille === 'unite' ? 2 : 3);
  const vus = new Set();
  return fragments
    .map((f, i) => ({ f, i, r: rang(f) }))
    .filter((x) => x.r < 3 && nbSignifiants(x.f, ctx) >= 2)
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .filter((x) => {
      const cle = x.f.texte.normalize('NFC');
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .slice(0, MAX_FRAGMENTS_VECTEUR)
    .map((x) => x.f);
}

/**
 * Trios de chemins qui prennent LA MÊME chaîne de trois manières différentes.
 *
 * L'exigence de diversité est le cœur du mode : trois codes différents ne font
 * pas trois manières. On demande donc trois `maniere` deux à deux distinctes
 * (`score.js`) — ce qui écarte d'un coup « sept segments », « sept segments
 * fusionnés » et « quatorze segments », qui montreraient trois fois le même
 * geste sous trois noms.
 *
 * La sélection est GLOUTONNE et non exhaustive : les chemins arrivent triés par
 * `comparerPrefixes` (bfs.js), on prend le meilleur de chaque manière, puis on
 * avance d'un cran. Un trio par tour, `MAX_CONVERGENCES` tours — assez pour
 * offrir un choix, pas assez pour noyer la liste sous les recombinaisons d'un
 * même jeu de trois méthodes.
 *
 * Le TRI PAR MANIÈRE se fait sur les chemins bruts et la canonicalisation ne
 * frappe que les élus : `normaliserChemin` rejoue le programme une fois par
 * étape candidate, et canonicaliser les quatre-vingt-seize chemins d'un
 * fragment coûtait, mesuré, 480 ms sur le seul mot « hope ». La manière, elle,
 * se lit sur la signature — déjà mémoïsée par le score.
 *
 * @param {Object[]} bruts  chemins du fragment, triés, déjà dédoublonnés par trace
 * @returns {Object[][]} trios, les plus convaincants d'abord
 */
function convergences(bruts, cible = CIBLE_DEFAUT, progres = null) {
  const c = normaliserCible(cible);
  // Manière → chiffre atteint → chemins. Le second niveau est ce que la cible
  // impose : sur `13`, la manière qui rend 1 et celle qui rend 3 ne sont pas
  // interchangeables. Sur `666`, il n'y a qu'un chiffre, et cette `Map` de
  // second niveau n'a jamais qu'une entrée — l'ancien code, à un déréférencement
  // près.
  const parManiere = new Map();
  for (const ch of bruts) {
    const v = valeurFinale(ch);
    if (v === null || !c.alphabet.includes(v)) continue;
    const m = maniere(ch);
    let parChiffre = parManiere.get(m);
    if (parChiffre === undefined) { parChiffre = new Map(); parManiere.set(m, parChiffre); }
    let liste = parChiffre.get(v);
    if (liste === undefined) { liste = []; parChiffre.set(v, liste); }
    if (liste.length < MAX_CONVERGENCES) liste.push(ch);
  }
  const manieres = [...parManiere.keys()];
  if (manieres.length < c.longueur) return [];
  // Canonicalisation des seuls élus, puis re-déduplication : deux chemins d'une
  // même manière peuvent s'effondrer l'un sur l'autre une fois le décor retiré.
  let manieresVues = 0;
  for (const m of manieres) {
    // Même raison que pour les retouches : la convergence coûte 775 à 1 431 ms
    // et ne rendait la main qu'entre deux fragments.
    manieresVues += 1;
    if (progres) progres(manieresVues / Math.max(1, manieres.length));
    const parChiffre = parManiere.get(m);
    for (const [v, liste] of parChiffre) {
      const vus = new Set();
      const propres = [];
      for (const ch of liste) {
        const n = normaliserChemin(ch);
        const cle = cleTrace(n);
        if (vus.has(cle)) continue;
        vus.add(cle);
        propres.push(n);
      }
      parChiffre.set(v, propres);
    }
  }
  const out = [];
  for (let tour = 0; tour < MAX_CONVERGENCES; tour++) {
    const suite = [];
    const pris = new Set();
    // Une manière par case, dans l'ordre de la cible : on cherche, pour le
    // chiffre attendu, la première manière encore libre qui sache le rendre.
    // Glouton et sans départage — donc déterministe (§4.4).
    for (const chiffre of c.chiffres) {
      const m = manieres.find((x) => {
        if (pris.has(x)) return false;
        const liste = parManiere.get(x).get(chiffre);
        return liste !== undefined && liste.length > tour;
      });
      if (m === undefined) break;
      pris.add(m);
      suite.push(parManiere.get(m).get(chiffre)[tour]);
    }
    if (suite.length < c.longueur) break;
    out.push(suite);
  }
  return out;
}

// ══════════════════════════════════ la MOISSON : des 6 de plusieurs sources
//
// Trois temps, et le troisième est le seul qui demande un algorithme.
//
//  1. Les PORTÉES candidates. Chaque jeton en est une — c'est la décomposition
//     disjointe la plus fine que la grammaire d'URL sache écrire (`0.1`, `1.1`,
//     …). On y ajoute la saisie entière et les fragments déjà cherchés, pour
//     qu'une méthode qui ne prend son sens que sur plusieurs mots (la longueur
//     des mots, le compte des jetons) ait sa chance.
//
//  2. Les PROGRAMMES de chaque portée, avec leur rapport en 6 : les vecteurs
//     énumérés ici même, et les chemins du faisceau qui atterrissent sur 6.
//
//  3. Le CHOIX. Il s'agit d'un ordonnancement pondéré d'intervalles : maximiser
//     la somme des 6 sous contrainte de disjonction. Une programmation dynamique
//     de droite à gauche le résout exactement — `dp[i]` = ce que rapportent au
//     mieux les jetons `i…n`. Aucune énumération de familles, aucun glouton :
//     le glouton se trompe (prendre `hope-hope-hope` d'un bloc rapporte douze 6,
//     le découper en cinq portées en rapporte quatorze).

/**
 * Les programmes qu'une portée peut rendre, du plus fourni en 6 au moins.
 * @returns {Array<{six:number, total:number, chemin:Object, maniere:string}>}
 */
function candidatsDePortee(texte, ops, chemins, cible = CIBLE_DEFAUT, compteur = null, memo = null,
  parFamille = false) {
  const cbl = normaliserCible(cible);
  const vus = new Set();
  const out = [];
  const ajouter = (chemin) => {
    // ★ AUCUNE FICELLE DANS UNE MOISSON. Le mode vaut par ce que chaque portée
    //   SAIT donner — « chaque jeton donne ce qu'il sait donner, par le
    //   programme qui lui convient ». Une ficelle ne prend pas ce qu'un jeton
    //   donne : elle jette ce qu'il donne en trop, à l'intérieur de la portée,
    //   et avant que la moisson ne compte. C'est le dernier endroit où le
    //   blanchiment pouvait encore passer, et c'est le pire.
    //
    //   ⚠️ MESURÉ. Sur « La numérologie est un art taquin », `tca+m14+mpf`
    //   fabriquait une SIXIÈME série là où les voies honnêtes en font cinq :
    //   la liste affichait alors 5 séries au rang 1 (championne d'élégance) et
    //   6 au rang 2 (championne des triptyques), c'est-à-dire un compte qui
    //   REMONTE — ce qu'un test de classement interdit depuis toujours.
    //
    //   Les ficelles restent pleinement disponibles au GROUPEMENT, qui est le
    //   mode de tous les exemples de l'auteur : un vecteur, une ficelle, un 666.
    if (ficellesDuChemin(chemin)) return;
    /* ★ **LA FENÊTRE PAR FAMILLE REFUSE CE QUE LE REJEU NE SAURAIT PAS REJOUER**
         (`rejouableSousLaCible`). Un lien affiché qui ne se rejoue pas est un
         échec bruyant, pas un arbitrage (§4.3).
         ⚠️ Le refus est LOCAL, et c'est voulu. Le corriger à la racine — passer
           par `viser` même sous 666, dans `bfs.js › operateursPourCible` —
           changerait ce qu'explore CHAQUE recherche du site, et élaguer `mr6`
           sous 666 perturbait déjà des listes publiées (mesuré). La fenêtre par
           famille, elle, ne fait qu'AJOUTER : l'y refuser ne retire rien de ce
           que la fenêtre d'avant montrait. */
    if (parFamille && !rejouableSousLaCible(chemin, cbl)) return;
    const s = sixDuCheminGarde(chemin, cbl);
    if (!s) return;
    const cle = chemin.ops.map((o) => o.code).join('+');
    if (vus.has(cle)) return;
    vus.add(cle);
    out.push({
      six: s.six, total: s.total, chiffres: s.chiffres, chemin, maniere: maniere(chemin),
    });
  };
  if (ops && ops.length) {
    // `miseEnForme: false` — on veut ici la MATIÈRE, pas une sélection : voir
    // l'en-tête de `vecteursDeSix`, « deux appelants, deux questions ».
    const bruts = vecteursDeSix(texte, ops, 1, MAX_CANDIDATS_PORTEE * 2, cbl, {
      miseEnForme: false, compteur, memo, parFamille,
    });
    for (const c of bruts) ajouter(c);
  }
  for (const c of chemins || []) ajouter(c);
  // Le plus de 6 d'abord ; à égalité, celui qui LIT le plus de la portée ; puis
  // celui qui laisse le moins de valeurs tomber ; puis l'ordre déterministe du
  // faisceau.
  //
  // ★ Le second critère n'est pas cosmétique. Sur la portée `fr`, deux
  // programmes donnent un 6 sur une seule valeur : `fi+tca+ma1` — la règle des
  // initiales, qui garde le `f` (sixième lettre) et JETTE le `r` — et
  // `tca+m7+cs` — le sept segments, 4 + 2, qui lit les deux. La couverture ne
  // les distingue pas : elle compte les caractères de la PORTÉE, pas ceux que
  // le programme regarde. Ici, si.
  const lus = (c) => lusDuChemin(c.chemin, texte);
  // ★ La dilution se lit sur le vecteur LE PLUS LARGE du chemin (voir
  //   `largeurMontree`) : `c.total` est celui du dernier état, et un opérateur
  //   qui rétrécit avant la fin s'y ferait passer pour économe — `m36` le fait
  //   déjà, honnêtement, et la mesure doit le voir.
  const jetees = (c) => largeurDuChemin(c.chemin, c.total) - c.six;
  out.sort((a, b) => (b.six - a.six)
    || (lus(b) - lus(a))
    || (jetees(a) - jetees(b))
    || comparerChemins(a.chemin, b.chemin));
  return retenirLesCandidats(out, cbl, parFamille);
}

/**
 * ★ **LA FAMILLE DE RÉGLAGES D'UN OPÉRATEUR — lue sur le catalogue, jamais sur
 *   une liste de codes.**
 *
 * > « Les 25 césars comptent pour UNE famille : la meilleure variante prend la
 * >   place, et `m14`, `m7`, `mt9`… gardent la leur. » (l'autrice)
 *
 * Un opérateur engendré d'une seule source avec un paramètre PUBLIE ce paramètre,
 * et c'est lui qu'on lit :
 *
 *  · `reglageDe` — il nomme la méthode dont l'opérateur n'est qu'un réglage (la
 *    potence avec ou sans zéros de tête) ; lu en premier, comme partout ;
 *  · `decalage` — les vingt-cinq césars, et les deux phases de l'alternance
 *    (`cal`, `cali`), qui publient en plus leur `familleOutil` ;
 *  · `acception` — les cinq lectures d'une traduction, dans chaque sens ;
 *  · `rang` — les cinq dédoublonnages, qui ne diffèrent que par l'exemplaire
 *    gardé.
 *
 * La famille est alors `familleOutil`, à défaut le code sans son réglage : la
 * convention que le barème emploie déjà pour les réglages en trop et pour les
 * traductions divergentes (`elegance.js`). Un opérateur qui ne publie aucun
 * réglage n'a pas de famille : il est sa propre méthode.
 *
 * ⚠️ Les CLAVIERS n'en sont pas une : `mazc`, `mazr` et `mtc` partagent l'outil
 *   « Clavier AZERTY », mais lisent trois choses différentes de la touche, et
 *   aucun ne se déclare réglage d'un autre.
 *
 * @param {Object} op
 * @returns {?string}
 */
/**
 * ★ La MARQUE d'une voie née de la fenêtre par famille (`moissons`, la réunion).
 * Un symbole, pas un registre à part : la liste d'un cran est COPIÉE voie par voie
 * avant d'entrer dans le cran suivant (`index.js › copierEtat`), et la marque doit
 * y survivre. Elle ne s'écrit ni dans le lien ni dans le JSON rendu.
 */
export const NEE_D_UNE_FAMILLE = Symbol('nee-d-une-famille');

/** ★ La MARQUE d'une voie que seule la nouvelle réduction du surplus fabrique
 *  (`moissons`, la réunion). Même régime que `NEE_D_UNE_FAMILLE`. */
export const NEE_DE_LA_REDUCTION = Symbol('nee-de-la-reduction');

/**
 * ★ La MARQUE d'une voie ASSISE par le siège d'un fragment (`assembler`, mode G).
 * Même régime que `NEE_D_UNE_FAMILLE` : `index.js › finaliser` la sélectionne à
 * part, de sorte qu'un siège ALLONGE la liste sans en chasser personne.
 *
 * ⚠️ Elle n'est PAS une extension (`estUneExtension`) : une voie assise garde le
 *   droit de tenir une ligne réservée — c'est tout l'objet du siège.
 */
export const NEE_D_UN_SIEGE = Symbol('nee-d-un-siege');

/**
 * ★ Une voie née d'une EXTENSION de la moisson — fenêtre par famille ou nouvelle
 * réduction du surplus. `index.js › finaliser` les sélectionne à part et les
 * écarte des lignes réservées : elles allongent la liste, elles ne changent ni
 * ce qu'elle montrait ni sa tête.
 */
export function estUneExtension(a) {
  return Boolean(a) && (a[NEE_D_UNE_FAMILLE] === true || a[NEE_DE_LA_REDUCTION] === true);
}

export function familleDeReglages(op) {
  if (!op) return null;
  if (typeof op.reglageDe === 'string' && op.reglageDe) return op.reglageDe;
  if (!Number.isFinite(op.decalage) && !Number.isFinite(op.acception) && !Number.isFinite(op.rang)) return null;
  if (typeof op.familleOutil === 'string' && op.familleOutil) return op.familleOutil;
  return String(op.code).replace(/\d+$/, '');
}

/**
 * ★ **UN CHEMIN QUE LE REJEU SAIT REJOUER** — chacun de ses opérateurs est celui
 *   que la table du rejeu associe à son code sous cette cible.
 *
 * Le rejeu (`index.js › tableDesCodes`) résout chaque code par `viser(cible)`
 * quand l'opérateur lit la cible, et le retire de la table quand sa règle n'a pas
 * de sens pour elle. La recherche, elle, part du catalogue TEL QUEL sous la cible
 * par défaut (`bfs.js › operateursPourCible`) : un opérateur bâti sur une autre
 * visée y est joué avec sa règle d'origine. C'est le défaut ancien que décrit
 * `bfs.js › operateursRetires`.
 *
 * ⚠️ MESURÉ sur `https://hope-hope-hope.fr/` : `mr6` — « un 6 retourné donne un
 *   9 », bâti pour 999 — y est joué sous 666, et `tca+mtc+mr6+cs+pr9` fait
 *   l'aller-retour 6 → 9 → 6 : il écrit bien un 6. Deux moissons nées de la
 *   fenêtre par famille le portaient (×2 1 077 et ×2 1 092) ; leurs liens
 *   étaient refusés au rejeu, « mr6 n'existe pas dans ce catalogue ».
 *
 * ★ **L'ÉGALITÉ EST STRICTE** : `viser(cible)` doit rendre CET opérateur, pas
 *   seulement un opérateur. Un code que le rejeu résoudrait vers une autre règle
 *   rejouerait une autre démonstration, avec un autre score (§4.3).
 *
 * @param {Object} chemin
 * @param {{texte:string}} cible  la cible normalisée
 * @returns {boolean}
 */
export function rejouableSousLaCible(chemin, cible) {
  for (const o of (chemin && chemin.ops) || []) {
    if (!o || typeof o.viser !== 'function') continue;
    if (o.viser(cible.texte) !== o) return false;
  }
  return true;
}

/** La FORME d'un chemin : ses opérateurs, les réglages effacés — `fr14+tca+m14`
 *  et `fr9+tca+m14` en ont une, `tca+m14` une autre. */
export function formeReglee(chemin) {
  return ((chemin && chemin.ops) || []).map((o) => {
    const f = familleDeReglages(o);
    return f === null ? o.code : `${f}*`;
  }).join('+');
}

/**
 * ★ **UNE PLACE PAR FORME, PUIS LES VARIANTES — l'ordre dans lequel une fenêtre
 *   se remplit.**
 *
 * Rend la même liste, réordonnée : le premier de chaque forme, dans l'ordre du
 * tri, puis les autres variantes, dans l'ordre du tri. La liste vient d'être
 * triée, donc le premier d'une forme est la meilleure variante : c'est elle qui
 * prend la place.
 *
 * ★ Les variantes ne sont PAS jetées : elles ne prennent que les places qui
 *   restent une fois chaque forme servie. Une portée courte les garde toutes, et
 *   `reduireLeSurplus` peut encore y choisir le réglage qui gaspille le moins ;
 *   une portée riche n'en voit plus aucune évincer une autre méthode.
 *
 * ⚠️ MESURÉ sur `hope-hope-hope.fr`, avant : la portée « hope » comptait 606
 *   chemins, et `tca+m14` était 21ᵉ derrière des césars et des traductions — hors
 *   des vingt places. Une place par forme la met 17ᵉ.
 *
 * @template T
 * @param {T[]} liste     triée, du meilleur au moins bon
 * @param {(x:T)=>string} formeDe
 * @returns {T[]}
 */
function unePlaceParFamille(liste, formeDe) {
  const vues = new Set();
  const premiers = [];
  const variantes = [];
  for (const x of liste) {
    const f = formeDe(x);
    if (vues.has(f)) { variantes.push(x); continue; }
    vues.add(f);
    premiers.push(x);
  }
  return variantes.length ? premiers.concat(variantes) : liste;
}

/**
 * ★ **CE QU'UNE PORTÉE GARDE — et pourquoi « les dix plus fournis » ne suffit
 *   plus dès que la cible est un motif.**
 *
 * Le tri ci-dessus range par QUANTITÉ de chiffres utiles, et l'on n'en gardait
 * que les dix premiers. C'est le bon critère quand tous les chiffres utiles se
 * valent — sur `666`, un 6 est un 6 —, et c'est le pire possible sur une cible
 * mêlée.
 *
 * ⚠️ MESURÉ sur `Henri Prunelle Chochotte` visant `01111984` : les dix
 *   meilleurs candidats de chaque mot sont tous des lectures riches en 1 (le
 *   chiffre le plus fréquent de la cible, donc celui qui gonfle le compte), et
 *   AUCUN ne rapporte de 0, de 8 ni de 4. La portée arrivait donc à la moisson
 *   incapable d'offrir quatre des cinq chiffres demandés — quel que soit
 *   l'algorithme qui suivait, il ne pouvait plus rien écrire. Le biais de
 *   comptage n'était pas seulement dans le CHOIX, il était déjà dans la
 *   MATIÈRE.
 *
 * On réserve donc, pour chaque chiffre de la cible, la meilleure lecture qui
 * SAIT LE DONNER, avant de compléter par l'ordre ordinaire. Une portée arrive
 * ainsi à la moisson capable de fournir chacun des chiffres qu'on lui demande,
 * pas seulement celui qu'elle a en abondance.
 *
 * ★ Repli EXACT sur une cible homogène — `666`, `111`, `777`, `000` : l'alphabet
 *   n'y a qu'un chiffre, la réservation désigne le premier de la liste, qui y
 *   était déjà. Même liste, même ordre, mêmes dix.
 *
 * ★ Et la borne ne bouge pas : `MAX_CANDIDATS_PORTEE` reste dix. Ce qui change
 *   est QUI occupe les dix places, jamais combien il y en a — la moisson
 *   énumère sur ce produit, et l'élargir se paierait sur toutes les cibles.
 */
function retenirLesCandidats(candidats, cible, parFamille = false) {
  if (candidats.length <= MAX_CANDIDATS_PORTEE) return candidats;
  const retenus = [];
  const pris = new Set();
  const garder = (c) => {
    if (pris.has(c) || retenus.length >= MAX_CANDIDATS_PORTEE) return;
    pris.add(c);
    retenus.push(c);
  };
  // Un siège par chiffre demandé, dans l'ordre croissant de l'alphabet — un
  // ordre, pas une préférence : il faut que deux exécutions retiennent les
  // mêmes (§4.4 règle 3).
  for (const d of cible.alphabet) garder(candidats.find((c) => c.chiffres.includes(d)));
  // ★ Puis UNE PLACE PAR FORME, avant les variantes d'un même réglage — voir
  //   `unePlaceParFamille`. Mesuré sur la portée « fr » de `hope-hope-hope.fr` :
  //   `mpy+mr9` et neuf césars à deux 6 prenaient les dix places, plus aucun
  //   programme à un seul 6 n'arrivait à la moisson, et la voie groupée tombait
  //   pour un surnuméraire.
  for (const c of parFamille ? unePlaceParFamille(candidats, (x) => formeReglee(x.chemin)) : candidats) garder(c);
  // L'ordre RENDU reste celui du tri : la moisson lit ses candidats du plus
  // fourni au moins, et les départages en dépendent.
  return candidats.filter((c) => pris.has(c));
}

/**
 * Combien de caractères de la portée le programme regarde réellement : la
 * largeur de la dernière chaîne avant la découpe, à défaut celle du texte.
 */
function caracteresLus(chemin, texte) {
  let large = 0;
  for (const e of chemin.etats) {
    if (e.type === 'STR') large = [...e.valeur].length;
    else if (e.type === 'TOKENS') return large || e.valeur.length;
    else break;
  }
  return large || [...texte].length;
}

/* ══════════ LA MOISSON D'UN MOTIF — quand compter ne suffit plus ══════════
   « Comment faire une recherche où c'est un MOTIF qu'il faut trouver et pas un
    même chiffre à maximiser ? » (l'auteur)

   ★ **LE DIAGNOSTIC, MESURÉ.** Sur `Henri Prunelle Chochotte` visant
   `01111984`, la moisson ordinaire choisit portée par portée le programme le
   plus FOURNI — c'est `meilleureMoisson`, une programmation dynamique qui
   maximise la somme des chiffres utiles. Elle retient alors `tca+mlm` sur les
   trois mots et récolte :

       Henri → 1 1 1 1 1 · Prunelle → 1 1 1 1 1 1 1 1 · Chochotte → 1×9

   soit VINGT-DEUX chiffres utiles… et ZÉRO série, parce que `01111984` ne
   demande pas vingt-deux 1, il demande un 0, quatre 1, un 9, un 8, un 4, dans
   cet ordre. Pendant ce temps une autre lecture — `tca+mlm`, `fr10+tca+mbob`,
   `fr13+tca+masb+mrn` — récolte moins et écrit la cible une fois.

   L'objectif était donc le bon pour 666 et le mauvais ici : sur une cible
   homogène, « le plus de chiffres utiles » et « le plus de séries » sont la
   MÊME quantité à la division par trois près ; sur une cible mêlée, ils
   divergent jusqu'à l'absurde.

   ★ **CE QU'ON CHANGE, ET CE QU'ON NE CHANGE PAS.** On n'échange pas un
   objectif contre l'autre : on AJOUTE une variante, et seulement quand la
   cible n'est pas homogène. La moisson de 666 n'est pas touchée d'une ligne —
   même programmation dynamique, mêmes départages, mêmes choix —, ce qu'exige
   `cible.js` (« quand la cible vaut 666, rien ne change »). Sur `111` non
   plus : l'alphabet n'y a qu'un chiffre, compter et écrire sont la même chose,
   et une seconde variante ne rendrait que des doublons.

   ★ **CE QUE ÇA REND, MESURÉ** — quatre saisies, six cibles mêlées, nombre de
   voies proposées avant → après (les trois correctifs ensemble : la matière,
   le choix, le seuil) :

                              13      007    1984  01012000 01111984 19012000
       Henri Prunelle Ch.   12→12    1→12   0→12     1→11     0→1      0→2
       Millicent Billette   12→12    0→12   1→11     0→8      0→2      0→1
       hope-hope-hope.fr    12→12    2→12   5→12     0→4      0→1      0→3
       Donald Trump         12→12    0→12   2→11     0→1      0→0      0→0

   Toutes les voies rendues ÉCRIVENT la cible au moins une fois — c'est vérifié
   chiffre par chiffre, pas compté. Les deux cases restées vides sont sur
   `Donald Trump` : deux mots, donc deux portées, et huit chiffres à écrire dans
   l'ordre avec ce que deux portées savent donner. Ce n'est pas un défaut de
   l'algorithme, c'est un fait sur la saisie — et la page de résultats le dit au
   lieu de faire semblant (§5.3, « la garantie jamais bredouille est une
   garantie sur 666 »).

   ★ **LE MOTIF SE PORTE DANS L'ÉTAT DE LA PROGRAMMATION DYNAMIQUE.** C'est
   toute l'idée, et elle tient en une phrase : ce qu'une portée rapporte ne
   dépend plus seulement d'elle, mais de L'ENDROIT DE LA CIBLE où la portée
   précédente s'est arrêtée. `dp[i][r]` = ce que rapportent au mieux les jetons
   `i…n` lorsqu'on cherche le `r`-ième chiffre de la cible. Une portée fait
   passer de `r` à `r'` en complétant `k` séries, ce que `avancerLeMotif`
   calcule d'un balayage. L'état est fini — au plus dix rangs (`MAX_CHIFFRES`)
   —, donc la table reste petite et le parcours exact : aucun glouton, aucun
   tri, rien à départager en secret (§4.4). */

/**
 * Ce qu'une suite de chiffres écrit quand on cherche déjà le `rang`-ième
 * chiffre de la cible : combien de séries elle achève, et où elle laisse la
 * lecture.
 *
 * ★ C'est `cible.js › seriesDe` avec un rang de DÉPART. Les deux balaient de
 *   gauche à droite et sautent ce qui ne sert pas ; celui-ci se souvient
 *   simplement d'où l'on en était. À rang 0, ils rendent le même compte —
 *   c'est ce qui garantit que la variante ne raconte pas une autre arithmétique
 *   que le verdict.
 */
function avancerLeMotif(chiffres, rang, cible) {
  let r = rang;
  let series = 0;
  for (const d of chiffres) {
    if (d !== cible.chiffres[r]) continue;
    r++;
    if (r === cible.longueur) { series++; r = 0; }
  }
  return { series, rang: r };
}

/**
 * La famille de portées disjointes qui ÉCRIT le plus de fois la cible.
 *
 * Départages, dans l'ordre, et tous entiers (§4.4 règle 2) : plus de séries,
 * puis plus de chiffres utiles récoltés — à séries égales, une portée qui donne
 * de la matière vaut mieux qu'une qui n'en donne pas —, puis MOINS de portées,
 * parce qu'une démonstration en trois temps se lit mieux qu'en six. À égalité
 * complète, le premier rencontré gagne : les portées viennent dans l'ordre de
 * la ligne et les candidats dans celui de `candidatsDePortee`, donc « le
 * premier » est un fait de lecture et pas un hasard de table.
 *
 * @param {Array<Array<Object>>} parDebut  portées indexées par jeton de départ
 * @param {number} n  nombre de jetons
 * @param {(c:Object)=>boolean} accepte
 * @param {import('./cible.js').Cible} cible
 * @returns {{series:number, choix:Object[]}}
 */
function moissonDuMotif(parDebut, n, accepte, cible) {
  const K = cible.longueur;
  // `dp[i][r]` — l'état est (jeton courant, rang cherché dans la cible).
  const dp = Array.from({ length: n + 1 }, () => new Array(K).fill(null));
  for (let r = 0; r < K; r++) dp[n][r] = { series: 0, six: 0, portees: 0, pris: null };
  const meilleurQue = (a, b) => !b || a.series > b.series
    || (a.series === b.series && (a.six > b.six
      || (a.six === b.six && a.portees < b.portees)));

  for (let i = n - 1; i >= 0; i--) {
    for (let r = 0; r < K; r++) {
      // Sauter le jeton : il ne participera à rien.
      let cur = { ...dp[i + 1][r], pris: null };
      for (const portee of parDebut[i] || []) {
        for (const c of portee.candidats) {
          if (!accepte(c, null)) continue;
          const { series, rang } = avancerLeMotif(c.chiffres, r, cible);
          const suite = dp[i + portee.longueur][rang];
          if (!suite) continue;
          const essai = {
            series: suite.series + series,
            six: suite.six + c.six,
            portees: suite.portees + 1,
            pris: { portee, candidat: c, rang },
          };
          if (meilleurQue(essai, cur)) cur = essai;
        }
      }
      dp[i][r] = cur;
    }
  }

  const choix = [];
  let i = 0;
  let r = 0;
  while (i < n) {
    const etat = dp[i][r];
    if (!etat || !etat.pris) { i++; continue; }
    choix.push({ portee: etat.pris.portee, candidat: etat.pris.candidat });
    i += etat.pris.portee.longueur;
    r = etat.pris.rang;
  }
  return { series: dp[0][0] ? dp[0][0].series : 0, choix };
}

/**
 * Ordonnancement pondéré : la famille de portées disjointes qui récolte le plus
 * de 6, parmi celles dont un programme satisfait `accepte`.
 *
 * @param {Array<Array<Object>>} parDebut  portées indexées par jeton de départ
 * @param {number} n  nombre de jetons
 * @param {(c:Object)=>boolean} accepte
 * @returns {{six:number, choix:Object[]}}
 */
function meilleureMoisson(parDebut, n, accepte) {
  const dp = new Int32Array(n + 1);
  const choix = new Array(n + 1).fill(null);
  for (let i = n - 1; i >= 0; i--) {
    dp[i] = dp[i + 1];
    for (const portee of parDebut[i] || []) {
      const c = portee.candidats.find(accepte);
      if (!c) continue;
      const valeur = c.six + dp[i + portee.longueur];
      if (valeur > dp[i]) { dp[i] = valeur; choix[i] = { portee, candidat: c }; }
    }
  }
  const retenus = [];
  let i = 0;
  while (i < n) {
    const c = choix[i];
    // `choix[i]` n'est retenu que s'il est encore OPTIMAL en `i` : la relaxation
    // `dp[i] = dp[i+1]` peut l'avoir dépassé après coup.
    if (c && c.candidat.six + dp[i + c.portee.longueur] === dp[i]) {
      retenus.push(c);
      i += c.portee.longueur;
    } else i++;
  }
  return { six: dp[0], choix: uniformiserLesProgrammes(retenus) };
}

/**
 * ★ **À RÉCOLTE ÉGALE, LE MÊME PROGRAMME PARTOUT** — pour que l'URL se
 *   factorise, et pour que la scène n'ait qu'une phase à jouer.
 *
 * L'ordonnancement ci-dessus choisit chaque portée SÉPARÉMENT : il prend, pour
 * chacune, le premier candidat acceptable, c'est-à-dire le plus fourni. Deux
 * portées qui se lisent de la même façon en ressortaient donc avec deux
 * programmes voisins mais distincts, et l'écriture ne pouvait plus les grouper.
 *
 * ⚠️ MESURÉ sur `https://hope-hope-hope.fr/` : les trois « hope » sortaient en
 *   `ffr3`, `ffr` et `ffr2` — trois acceptions de la MÊME traduction, chacune
 *   rendant autant de 6. L'auteur : « elle ne groupe pas ce qu'elle aurait dû
 *   grouper […] 3.1+5.1+7.1:ffr3+tca+m14+mpf ».
 *
 * ★ La passe ne CHANGE RIEN au compte. Une portée n'adopte le programme d'une
 *   autre que si elle le possède parmi ses candidats ET qu'il lui rend
 *   exactement autant de 6. Si l'uniformité coûtait un seul chiffre, on la
 *   refuse : ce mode vaut par ce que chaque portée sait donner, et c'est le
 *   classement — pas le générateur — qui arbitre entre fourni et homogène.
 *
 * Le programme retenu comme étalon est celui qui sert DÉJÀ le plus de portées ;
 * à égalité, l'ordre de la ligne tranche, donc le résultat est déterministe
 * (§4.4).
 */
function uniformiserLesProgrammes(retenus, options = {}) {
  // `auMoins` : accepter aussi un jumeau qui rapporte DAVANTAGE. C'est le
  // second appel — après `reduireLeSurplus`, qui a le droit de baisser la
  // récolte d'une portée pour gaspiller moins. À l'égalité stricte, la variante
  // groupée n'était alors plus constructible (mesuré sur les trois « hope » :
  // `ffr` rend 4 six là où `ffr3` en rend 5). Ce qu'on ne fait jamais, dans les
  // deux cas : adopter un programme qui rapporte MOINS.
  const auMoins = options.auMoins === true;
  if (retenus.length < 2) return retenus;
  const codesDe = (c) => c.chemin.ops.map((o) => o.code).join('+');
  const compte = new Map();
  for (const r of retenus) {
    const k = codesDe(r.candidat);
    compte.set(k, (compte.get(k) || 0) + 1);
  }
  // Les programmes en présence, du plus répandu au moins ; l'ordre d'apparition
  // sur la ligne départage, jamais l'ordre d'une table de hachage.
  const rangDApparition = new Map();
  retenus.forEach((r, i) => {
    const k = codesDe(r.candidat);
    if (!rangDApparition.has(k)) rangDApparition.set(k, i);
  });
  const tries = [...compte.keys()].sort((a, b) => (compte.get(b) - compte.get(a))
    || (rangDApparition.get(a) - rangDApparition.get(b)));
  // ★ Une place d'étalon par FORME avant les variantes d'un même réglage
  //   (`unePlaceParFamille`) : `ETALONS_MAX` coupe plus bas, et deux décalages
  //   de César n'y valent pas deux alignements à essayer. Le premier étalon —
  //   le seul que demande `meilleureMoisson` — ne bouge jamais.
  const formeDuProgramme = new Map();
  for (const r of retenus) {
    const k = codesDe(r.candidat);
    if (!formeDuProgramme.has(k)) formeDuProgramme.set(k, formeReglee(r.candidat.chemin));
  }
  const etalons = options.parFamille ? unePlaceParFamille(tries, (k) => formeDuProgramme.get(k)) : tries;

  /* ★ **UNE VARIANTE PAR ÉTALON, ET NON LA SEULE DU PROGRAMME LE PLUS RÉPANDU.**

     Cette fonction n'essayait que le programme majoritaire, puis rendait une
     variante unique. Sur `hope-hope-hope.fr` cela donnait `ffr3` — deux des
     trois « hope » le portaient —, lequel récolte DIX-NEUF 6 pour dix-huit
     montrés : un surnuméraire, donc la variante était rejetée plus bas, et
     l'homogénéité perdue avec elle. Or `m14`, minoritaire, aligne les trois
     « hope » sur QUINZE 6 pour quinze montrés — propre.

     > « Elle ne jette que le `.` et se sert de tout le reste, ce qui compense la
     >   longueur légèrement plus importante. […] L'usage maximal de la saisie
     >   utilisateur est à récompenser autant que possible. » (l'auteur)

     Le majoritaire n'est donc pas le bon critère : il décrit ce que la moisson
     maximale a choisi portée par portée, pas ce qui s'aligne le mieux. On rend
     toutes les uniformisations constructibles et l'on laisse le classement
     trancher — c'est la doctrine du module, « le générateur ne tranche pas ».

     ⚠️ Bornées à `ETALONS_MAX` : chaque variante coûte une réduction, un
       élagage et une notation. Les étalons sont classés du plus répandu au
       moins, donc la borne coupe les plus marginaux. */
  const sorties = [];
  for (const etalon of etalons.slice(0, options.tousLesEtalons ? ETALONS_MAX : 1)) {
    const out = retenus.map((r) => r);
    let touche = false;
    for (let i = 0; i < out.length; i++) {
      const actuel = out[i].candidat;
      if (codesDe(actuel) === etalon) continue;
      /* ★ **UNE VARIANTE PEUT RAPPORTER MOINS — c'est même souvent la bonne.**

         La règle était « jamais adopter un programme qui rapporte MOINS », et
         elle interdisait très exactement la voie que l'auteur désigne : aligner
         les trois « hope » sur `tca+m14` récolte moins que `ffr3+tca+m14+mpf`,
         et ne gaspille RIEN — quinze 6 pour quinze montrés, contre dix-neuf
         pour dix-huit.

         > « Même si l'autre est courte et que les jetés/filtrés le sont de
         >   manière propre, ça ne doit pas compenser l'usage maximal de la
         >   saisie utilisateur. » (l'auteur)

         Quand on ÉNUMÈRE les variantes, on ne tranche donc pas sur la récolte :
         on les construit toutes et le classement décide, ce qui est la doctrine
         du module. Le garde-fou reste entier ailleurs — le verdict est
         intangible (`nbSeries`), la variante groupée est rejetée si elle laisse
         un surnuméraire, et le coût la coupe si elle traîne. */
      const jumeau = out[i].portee.candidats.find((c) => codesDe(c) === etalon
        && (options.tousLesEtalons || (auMoins ? c.six >= actuel.six : c.six === actuel.six)));
      if (jumeau) { out[i] = { portee: out[i].portee, candidat: jumeau }; touche = true; }
    }
    if (touche) sorties.push(out);
  }
  // ★ Deux appelants, deux besoins. `meilleureMoisson` veut UN alignement — le
  //   plus répandu, celui qui ne défait rien de ce qu'elle vient de choisir ; la
  //   fabrique de variantes les veut TOUS, pour que le classement tranche. On
  //   rend donc la liste ou son premier élément, jamais deux fonctions qui
  //   pourraient diverger.
  return options.tousLesEtalons ? sorties : (sorties[0] || retenus);
}

/** Programmes essayés comme étalon d'uniformisation — voir la fonction. */
const ETALONS_MAX = 4;

/**
 * Les approches de MOISSON d'une saisie.
 *
 * Quatre variantes au plus : la moisson MAXIMALE — celle que demande l'auteur,
 * « le plus de séries » —, puis une par manière dominante, où toutes les portées
 * sont lues de la même façon. Ces dernières récoltent moins, mais elles sont
 * homogènes : le classement les départage, le générateur ne tranche pas.
 *
 * @returns {Object[]} approches non notées
 */
function moissons(saisie, jetons, fragments, parFrag, ops, cible = CIBLE_DEFAUT,
  kParFragment = K_PAR_FRAGMENT, borneTravail = Infinity, memo = null, evaluerUneVoie = null) {
  const cbl = normaliserCible(cible);
  if (!jetons || jetons.length < 2) return [];
  const n = Math.min(jetons.length, MAX_JETONS_MOISSON);
  const cheminsDe = (texte) => parFrag.get(texte.normalize('NFC')) || [];

  /* ★ **LA BORNE DE TRAVAIL DE LA MOISSON** — `borneTravail`, en applications
       de mappeurs et de raffinages (`vecteursDeSix`, l'étage 3).
       MESURÉ sur une phrase de 113 signes : la moisson y dépense 4,5 s sur les
       vecteurs de ses dix-huit jetons, un par un — la saisie entière, d'un
       tenant, n'en coûte que 0,26 s. Au-delà de la borne, une portée garde les
       chemins que la recherche de fragments lui a déjà trouvés, et n'en
       énumère plus d'autres. La décision se prend AVANT chaque portée, jamais
       au milieu d'un déroulé : un vecteur commencé est fini, et l'ensemble
       exploré ne dépend que de la saisie (§4.4). Infinie au défaut : la liste
       du site ne la connaît pas. */
  const compteur = { travail: 0 };

  // ── 1 & 2. les portées et leurs programmes
  /* ★ **DEUX FENÊTRES, ET LA SECONDE N'ÔTE RIEN À LA PREMIÈRE.**

       > « Les 25 césars comptent pour UNE famille : la meilleure variante prend
       >   la place, et `m14`, `m7`, `mt9`… gardent la leur. » (l'autrice)
       > « Une voie ne sort jamais pour une moins bonne. » (l'autrice)

       Chaque portée reçoit ses candidats deux fois : par la fenêtre d'AVANT,
       et par celle qui sert d'abord une place par famille (`unePlaceParFamille`).
       La récolte se fait sur chacune, et la seconde n'AJOUTE que les moissons
       que la première ne fabrique pas — marquées `NEE_D_UNE_FAMILLE`, donc
       sélectionnées à part et jamais aux lignes réservées (`index.js ›
       finaliser`, `rangerParRegimes`) : la liste s'allonge, rien de ce qu'elle
       montrait n'en sort ni n'en descend.

       ⚠️ MESURÉ, et c'est ce qui a imposé la réunion : la fenêtre par famille
         seule rendait la voie groupée de `hope-hope-hope.fr`, mais faisait
         baisser la tête de « Donald Trump » (4 983 → 4 723) et sortir cinq voies
         de quatre listes publiées. Sur « Trump », les césars à trois 6 qu'elle
         admettait changeaient les manières dominantes et le point de départ de
         la moisson « clavier » : `fatb+mt9+mr9` et `fr5+mt9+mr9` (huit 6),
         que la réduction du surplus ramenait à `fr11+mt9+mr9` et `mt9+cmn`.

       ★ La seconde fenêtre ne facture aucun travail : son énumération est celle
         de la première (`vecteursDeSix`, le mémo), et la borne de la moisson
         décide exactement comme avant. */
  // ★ La note d'une variante, telle que la liste la publierait : élaguée, puis
  //   notée par le moteur (`index.js › evaluerUneVoie`). `reduireLeSurplus` s'en
  //   sert pour départager à déchet égal ; elle la mémorise par configuration.
  const evaluer = evaluerUneVoie ? (retenus) => evaluerUneVoie(approche('MOISSON', elaguerLaMoisson(
    retenus.map(({ portee, candidat }) => ({
      fragment: fragmentDeJetons(saisie, jetons, portee.debut, portee.longueur),
      chemin: candidat.chemin,
    })), cbl,
  ))) : null;
  const portees = [];
  const porteesParFamille = [];
  const vues = new Set();
  const ajouterPortee = (debut, longueur, texte, avecVecteurs) => {
    if (debut < 0 || longueur <= 0 || debut + longueur > n) return;
    const cle = `${debut}.${longueur}`;
    if (vues.has(cle)) return;
    vues.add(cle);
    const enumerer = avecVecteurs && compteur.travail < borneTravail;
    // ★ La largeur suit le cran ici aussi — l'audit a relevé que la MOISSON,
    //   « le mode que l'auteur met en tête », restait à huit chemins par
    //   portée quand le GROUPEMENT en recevait jusqu'à cinquante.
    const chemins = normaliserChemins(cheminsDe(texte), Math.max(K_CANONISABLES, kParFragment))
      .slice(0, kParFragment);
    const candidats = candidatsDePortee(texte, enumerer ? ops : null, chemins, cbl, compteur, memo);
    if (candidats.length) portees.push({ debut, longueur, texte, candidats });
    const parFamille = candidatsDePortee(texte, enumerer ? ops : null, chemins, cbl, null, memo, true);
    if (parFamille.length) porteesParFamille.push({ debut, longueur, texte, candidats: parFamille });
  };
  // Les jetons : les atomes de la saisie, et le cœur du mode.
  for (let i = 0; i < n; i++) ajouterPortee(i, 1, jetons[i].texte, true);
  // La saisie entière, puis les fragments déjà cherchés — sans énumération
  // supplémentaire pour ces derniers : leurs chemins existent déjà.
  const finDe = (i, l) => jetons[i + l - 1].offset + jetons[i + l - 1].longueur;
  if (n > 1) ajouterPortee(0, n, saisie.slice(jetons[0].offset, finDe(0, n)), true);
  for (const f of fragments) {
    if (f.tokenDebut < 0 || f.tokenLong <= 1) continue;
    ajouterPortee(f.tokenDebut, f.tokenLong, f.texte, false);
  }

  const out = [];
  const signatures = new Set();
  /* ★ **QUATRE RÉCOLTES, UNE RÉUNION.** Les fenêtres d'avant avec l'ancienne
       réduction — la récolte d'hier, telle quelle —, puis ce que chaque extension
       AJOUTE : la fenêtre par famille, la nouvelle réduction, et les deux ensemble.
       Une moisson déjà fabriquée ne l'est pas deux fois (`signatures`), et une
       moisson ajoutée n'entre que si son lien se REJOUE (`rejouableSousLaCible`) :
       la nouvelle réduction peut choisir, sur les portées d'avant, un chemin que
       l'ancienne ne publiait jamais — `tca+mtc+mr6+cs+pr9` y figure. */
  for (const a of recolter(portees, false, reduireLeSurplusHistorique)) { signatures.add(a.cle); out.push(a.approche); }
  const ajouter = (recoltees, marques) => {
    for (const a of recoltees) {
      if (signatures.has(a.cle)) continue;
      if (!a.approche.parts.every((p) => rejouableSousLaCible(p.chemin, cbl))) continue;
      signatures.add(a.cle);
      for (const m of marques) a.approche[m] = true;
      out.push(a.approche);
    }
  };
  ajouter(recolter(porteesParFamille, true, reduireLeSurplusHistorique), [NEE_D_UNE_FAMILLE]);
  ajouter(recolter(portees, false, reduireLeSurplus), [NEE_DE_LA_REDUCTION]);
  ajouter(recolter(porteesParFamille, true, reduireLeSurplus), [NEE_D_UNE_FAMILLE, NEE_DE_LA_REDUCTION]);
  return out;

  /** La récolte d'un jeu de portées — le code d'avant, tel quel. */
  function recolter(portees, parFamille, reduire) {
    const parDebut = Array.from({ length: n }, () => []);
    for (const p of portees) parDebut[p.debut].push(p);

    // ── 3. le choix, une fois sans contrainte puis une fois par manière
    const parManiere = new Map();
    for (const p of portees) {
      for (const c of p.candidats) parManiere.set(c.maniere, (parManiere.get(c.maniere) || 0) + c.six);
    }
    const dominantes = [...parManiere.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
      .slice(0, MAX_MOISSONS - 1)
      .map((x) => x[0]);

    const filtres = [() => true, ...dominantes.map((m) => (c) => c.maniere === m)];
    const out = [];
    const signatures = new Set();
    let coutMaximale = Infinity;
    // ★ CHAQUE FILTRE REND DEUX MOISSONS : celle qui gaspille le moins, et celle
    //   qui SE GROUPE le mieux. Quand les deux coïncident, la seconde est
    //   silencieusement dédupliquée quelques lignes plus bas (`signatures`).
    //
    //   « Elle rate les 7×666 et elle ne groupe pas ce qu'elle aurait dû grouper :
    //   3.1+5.1+7.1:ffr3+tca+m14+mpf » (l'auteur). `uniformiserLesProgrammes`
    //   aligne bien les trois « hope » sur un seul programme, mais
    //   `reduireLeSurplus` défait ensuite l'alignement : `ffr` et `ffr2`
    //   gaspillent une valeur de moins que `ffr3`, et la boucle de réduction
    //   n'optimise que cela. Elle a raison de le faire — c'est son travail —, et
    //   il n'y a pas de bonne façon d'arbitrer LOCALEMENT entre « une valeur
    //   jetée en moins » et « une phase de scène au lieu de trois ».
    //
    //   On ne tranche donc pas : on propose les deux, et c'est le barème qui
    //   décide, sur l'approche entière, là où les deux effets sont enfin
    //   comparables. Mesuré sur `https://hope-hope-hope.fr/` : les deux rendent
    //   SIX séries, et leurs scores tiennent en dix points (1 211 contre 1 221).
    //
    //   ⚠️ Ce que cela ne fait PAS, et qui reste ouvert : rien ne RÉCOMPENSE
    //     encore l'homogénéité. À dix points près, la variante groupée passe
    //     derrière. Lui donner sa prime demande un poste de barème et son
    //     balayage — voir la remarque de l'auteur sur « le bonus de score/élégance
    //     lié à l'homogénéité permettant de factoriser ensuite ».
    const variantes = [];
    for (const accepte of filtres) {
      // ★ **UNE VARIANTE DE PLUS QUAND LA CIBLE EST UN MOTIF**, et elle passe
      //   DEVANT : sur une cible mêlée, « le plus de séries » est la question
      //   posée, et « le plus de chiffres utiles » n'en est plus qu'une
      //   approximation — celle qui récolte vingt-deux 1 pour zéro série sur
      //   `01111984` (voir l'en-tête de `moissonDuMotif`). Sur une cible
      //   homogène, elle n'est même pas calculée : les deux objectifs y sont le
      //   même à la division près, et la seconde ne rendrait que des doublons que
      //   `signatures` jetterait.
      if (politique(profilDeCible(cbl)).moissonDuMotif) {
        const { choix: motif } = moissonDuMotif(parDebut, n, accepte, cbl);
        if (motif.length >= 2) variantes.push({ accepte, retenu: reduire(motif, accepte, cbl, evaluer) });
      }
      const { choix } = meilleureMoisson(parDebut, n, accepte);
      if (choix.length < 2) continue;
      const sobre = reduire(choix, accepte, cbl, evaluer);
      variantes.push({ accepte, retenu: sobre });
      for (const groupee of uniformiserLesProgrammes(sobre, { auMoins: true, tousLesEtalons: true, parFamille })) {
        // ★ ET ON RÉDUIT DE NOUVEAU, SANS DÉFAIRE LE GROUPEMENT.
        //
        //   `auMoins` autorise une portée à adopter un programme qui rapporte
        //   DAVANTAGE, et un 6 de plus qui ne fait pas de série de plus est un 6
        //   qu'il faudra montrer puis écarter. MESURÉ sur `hope-hope-hope.fr` :
        //   la variante groupée récoltait dix-neuf 6 pour dix-huit montrés — un
        //   surnuméraire, exactement ce que `reduireLeSurplus` existe pour éviter.
        //
        //   On la repasse donc à la réduction, mais en ne lui laissant à choisir
        //   QUE les programmes déjà en place : elle peut retirer le déchet, elle
        //   ne peut pas rompre l'alignement qu'on vient de faire.
        /* ★ **CE QU'IL NE FAUT PAS DÉFAIRE, C'EST L'ALIGNEMENT — pas la ligne.**

           La restriction était « seulement les programmes DÉJÀ EN PLACE », ce qui
           gelait aussi les portées qui ne participent à aucun alignement. Mesuré
           sur `hope-hope-hope.fr` : les trois « hope » alignés sur `tca+m14`
           donnent quinze 6, mais le « fr » restait sur `tca+mpy+mr9` qui en rend
           deux là qu'un seul suffit — seize 6 pour quinze montrés, donc variante
           rejetée pour un surnuméraire qui n'avait rien à voir avec le
           groupement.

           Ce qu'on protège est donc l'ÉTALON : une portée qui le porte ne bouge
           plus, les autres restent libres de gaspiller moins. C'est la lecture
           exacte de « elle peut retirer le déchet, elle ne peut pas rompre
           l'alignement qu'on vient de faire ». */
        const codesEtalon = (() => {
          const n = new Map();
          for (const r of groupee) {
            const k = r.candidat.chemin.ops.map((o) => o.code).join('+');
            n.set(k, (n.get(k) || 0) + 1);
          }
          let meilleur = null;
          for (const [k, v] of n) if (!meilleur || v > n.get(meilleur)) meilleur = k;
          return meilleur;
        })();
        const memeProgramme = (c, actuel) => (actuel
          && actuel.chemin.ops.map((o) => o.code).join('+') === codesEtalon
          ? c.chemin.ops.map((o) => o.code).join('+') === codesEtalon
          : true);
        const nette = reduire(groupee, memeProgramme, cbl, evaluer);
        // ★ ET SI LE DÉCHET SURVIT, ON RENONCE À LA VARIANTE.
        //
        //   La réduction ci-dessus ne peut échanger qu'entre les programmes déjà
        //   en place ; quand aucun d'eux ne sait faire plus court, le surnuméraire
        //   reste. MESURÉ sur `hope-hope-hope.fr` : les trois « hope » alignés sur
        //   `ffr3` récoltent DIX-NEUF 6 pour six séries, soit dix-huit montrés —
        //   un 6 calculé, affiché, puis écarté au verdict.
        //
        //   « On ne récolte que ce qu'on montre » n'est pas une préférence, c'est
        //   un invariant du mode, et l'homogénéité ne l'achète pas : montrer une
        //   valeur pour l'écarter aussitôt donne à voir que le compte était arrêté
        //   d'avance, ce qui est exactement le reproche que ce site adresse à la
        //   numérologie. La variante groupée est donc proposée quand elle est
        //   propre, et abandonnée sinon — sans repli, la moisson sobre reste là.
        //
        //   ⚠️ ET LE CONTRÔLE SE FAIT APRÈS L'ÉLAGAGE, pas ici. Je l'avais posé à
        //     cet endroit, sur `nette` : `elaguerLaMoisson` retire ensuite les
        //     portées entièrement surnuméraires, ce qui change LES DEUX termes du
        //     compte, et une variante déclarée propre ici ressortait à sept 6 pour
        //     six montrés. On se contente donc de marquer la variante, et on la
        //     juge plus bas, sur ce qui sera réellement montré.
        variantes.push({ accepte, retenu: nette, groupee: true });
      }
    }
    for (const { retenu, groupee } of variantes) {
      const parts = elaguerLaMoisson(
        retenu.map(({ portee, candidat }) => ({
          fragment: fragmentDeJetons(saisie, jetons, portee.debut, portee.longueur),
          chemin: candidat.chemin,
        })), cbl,
      );
      // `compterMoisson` rend `{six, total, series}` — la récolte ET ce qui sera
      // montré, mesurés sur les parts APRÈS élagage. Les deux termes du contrôle
      // sont donc là, déjà calculés.
      const moisson = compterMoisson(parts, cbl);
      if (!moisson) continue;
      /* ★ **AUCUNE VARIANTE NE RÉCOLTE PLUS QU'ELLE NE MONTRE.**

         Ce contrôle ne valait que pour la variante GROUPÉE : « la sobre sort de
         `reduireLeSurplus` et n'a pas à se justifier une seconde fois ». Elle le
         doit, et une voie l'a prouvé — sur « Le chat dort sur le tapis rouge »,
         `tca+mexc+cp, tca+m7+cmx, fen2+tca+m14+mpf, fr3+tca+m14, fr14+tca+m14+mpf,
         tca+m14+mpf` récolte SEIZE six et n'en montre que quinze.

         `elaguerLaMoisson` ne pouvait rien : il coupe en QUEUE, et le six
         surnuméraire tombait à l'intérieur de la dernière portée — la retirer en
         aurait perdu trois pour en économiser un. Reste donc à ne pas produire
         l'approche, ce que la doctrine dit déjà : « mieux vaut ne pas produire le
         déchet que le pénaliser après coup ».

         ⚠️ Ce durcissement n'écarte rien de ce qui passait : le test
           `★ moisson — on ne récolte que ce qu'on montre` exige cette égalité de
           TOUTES les moissons retenues, donc toutes celles d'hier la
           respectaient. Il n'a fallu élargir le catalogue pour qu'une voie
           fautive remonte assez haut pour être vue. */
      if (moisson.six !== moisson.series * cbl.longueur) continue;
      const cout = parts.reduce((s, p) => s + p.chemin.ops.reduce((t, o) => t + (o.cout || 0), 0), 0);
      // ★ Une variante homogène qui récolte MOINS que la moisson maximale et
      // coûte DAVANTAGE n'apporte rien : elle demande plus de temps de scène pour
      // un verdict plus court. Mesuré sur `https://hope-hope-hope.fr/` : la
      // variante « alphabet » aligne trois séries en 71 étapes, soit trois
      // minutes de démonstration, contre six séries en 33 étapes pour la
      // maximale. On la coupe ici, et non par un plafond arbitraire de longueur —
      // ce qui la disqualifie est la COMPARAISON, pas une constante.
      if (cout > coutMaximale) continue;
      if (coutMaximale === Infinity) coutMaximale = cout;
      const cle = parts.map((p) => `${p.fragment.tokenDebut}.${p.fragment.tokenLong}:`
        + p.chemin.ops.map((o) => o.code).join('+')).join(',');
      if (signatures.has(cle)) continue;
      signatures.add(cle);
      out.push({ cle, approche: approche('MOISSON', parts) });
    }
    return out;
  }
}

/**
 * ★ À NOMBRE DE SÉRIES ÉGAL, on prend le programme qui gaspille le moins.
 *
 * L'ordonnancement pondéré maximise les **6** ; le verdict en compte des séries
 * de **trois**. Un 6 de plus qui ne fait pas une série de plus n'est pas un
 * gain : c'est un 6 qu'il faudra montrer, puis écarter. Et l'écarter est
 * précisément ce que l'auteur veut voir le moins possible — trier, c'est
 * avouer qu'on savait d'avance ce qu'on cherchait.
 *
 * Le cas qui l'a révélé : sur `hope-hope-hope.fr`, la portée « fr » rend UN 6
 * en sept segments (`f` = 4, `r` = 2, somme) et DEUX en pythagoricienne suivie
 * du retournement des 9 (`f` = 6, `r` = 9 retourné). La programmation dynamique
 * prenait le second — seize 6, cinq séries, et un 6 sur le carreau. Le premier
 * donne quinze 6, les mêmes cinq séries, et rien à jeter.
 *
 * ★ Le rendement (`score.js`) plafonne bien son numérateur au compte annoncé,
 * donc il VOIT ce 6 en trop — mais il ne le voit qu'après coup, comme un malus
 * sur une démonstration qui l'aura tout de même montré puis écarté à l'écran.
 * Le bon ordre est celui-ci : mieux vaut ne pas produire le déchet que le
 * pénaliser une fois produit.
 *
 * ── Ce qu'on minimise, et pourquoi le compte des 6 n'était qu'un PRÉTEXTE ───
 *
 * La première version descendait de la dernière portée vers la première et
 * prenait, pour chacune, le candidat le MOINS FOURNI EN 6 qui laisse encore de
 * quoi tenir le compte. Le nombre de 6 y servait de mesure du gaspillage — et
 * c'est un mauvais indicateur, parce qu'un programme peut rendre moins de 6 en
 * calculant BEAUCOUP PLUS de valeurs.
 *
 * Mesuré sur `Donald Trump`, où le défaut saute aux yeux. La portée `Trump`
 * disposait de `fr13+tca+m14+m36` — chiffre de César, quatorze segments, puis les
 * trois 6 d'affilée : **trois 6 sur trois valeurs, rien de jeté** — et d'un
 * `fatb+tca+m14` qui rend **deux 6 sur cinq valeurs**. Il y avait un 6 de trop dans
 * la récolte ; l'ancienne règle a donc troqué le premier contre le second,
 * échangeant *un 6 en trop* contre *trois valeurs calculées puis écartées*.
 * C'est exactement le contraire de ce que ce § annonce.
 *
 * Le déchet, c'est **tout ce qu'on montre puis qu'on écarte** : les valeurs qui
 * ne valent pas 6, et les 6 qui dépassent le compte. Les deux se lisent d'un
 * seul nombre — la somme des largeurs de vecteur, moins le compte gardé — et
 * c'est ce nombre-là qu'on minimise désormais.
 *
 * ── Une recherche locale, parce qu'un balayage ne suffit pas ────────────────
 *
 * Le balayage unique de droite à gauche ne pouvait pas trouver la bonne
 * réponse : réduire `Trump` fait retomber le compte, ce qui INTERDIT ensuite de
 * réduire `Donald`, alors que c'est `Donald` qu'il fallait réduire. On procède
 * donc par améliorations successives : à chaque tour, on cherche le
 * remplacement d'UNE portée qui diminue le plus le déchet, et on le joue.
 *
 * Trois garde-fous, et ils sont tous les trois indispensables :
 *  · une portée garde toujours au moins un 6 — une part qui n'apporte rien
 *    disqualifie l'approche entière (`compterMoisson`) ;
 *  · le VERDICT ne bouge pas. Le nombre de séries après remplacement doit être
 *    exactement celui d'avant : on élague le gaspillage, on ne renégocie pas ce
 *    qui est annoncé (même doctrine qu'`elaguerLaMoisson`) ;
 *  · chaque tour fait strictement DÉCROÎTRE un entier positif, donc la boucle
 *    s'arrête ; le plafond explicite n'est là que pour le dire.
 *
 * ── Les ex æquo, et pourquoi on balaie DE LA FIN VERS LE DÉBUT ─────────────
 *
 * Deux retouches différentes suppriment souvent le même déchet : sur
 * `hope-hope-hope.fr`, la récolte a un 6 de trop, et on peut aussi bien le
 * retirer du `fr` final que d'un `hope` du milieu. La règle de départage est
 * celle qui valait déjà : **le surplus est en queue**. On balaie donc les
 * portées de la dernière vers la première, et l'on ne retient qu'une
 * amélioration STRICTE.
 *
 * ── À déchet égal : le meilleur score GLOBAL, et plus jamais d'aller-retour ──
 *
 * > « Corrige, mais s'il y a différence de score global, c'est probablement à
 * >   prendre en compte. » (l'autrice)
 *
 * ⚠️ MESURÉ, et c'est le défaut corrigé : la boucle départageait à déchet égal
 *   par homogénéité, et ce départage acceptait un échange qui n'améliorait RIEN.
 *   Sur « Donald Trump », moisson « clavier », elle échangeait `fatb+mt9+mr9` ⇄
 *   `fr11+mt9+mr9` jusqu'au plafond de tours, et la variante finale dépendait de
 *   la PARITÉ du nombre d'échanges — donc du point de départ.
 *
 * La règle, en deux temps :
 *  1. la DESCENTE ne joue un remplacement que s'il jette STRICTEMENT moins ET
 *     ne fait pas baisser le score global (A) ; entre plusieurs remplacements au
 *     même meilleur gain, la meilleure variante ;
 *  2. le PALIER, une fois qu'aucun gain strict ne reste : une portée ne change
 *     de lecture que pour une variante à déchet égal STRICTEMENT meilleure.
 * « Meilleure » se lit, dans l'ordre : le score GLOBAL de la carte, le score du
 * moteur, puis l'ordre des codes — celui-là seul quand aucun évaluateur n'est
 * donné. Chaque changement améliore strictement cette clé : aucun cycle n'est
 * possible, et le résultat ne dépend ni du nombre de tours ni du point de départ.
 *
 * Déterminisme (CONTRACTS §4.4) : ordres de balayage fixes, comparaisons
 * strictes, aucune horloge.
 */

/** Plafond de tours de la recherche locale. Le déchet décroît strictement. */
const MAX_RETOUCHES = 32;

/**
 * @param {Array<{portee:Object, candidat:Object}>} choix
 * @param {(c:Object, actuel:Object)=>boolean} accepte
 * @param {string|Object} [cible]
 * @param {?(retenus:Array)=>{global:?number, score:number}} [evaluer]  la note
 *   de la moisson que ces choix publieraient (`moissons`, `index.js ›
 *   evaluerUneVoie`) ; absente, seul l'ordre des codes départage.
 */
export function reduireLeSurplus(choix, accepte, cible = CIBLE_DEFAUT, evaluer = null) {
  const cbl = normaliserCible(cible);
  const out = choix.slice();
  // ★ Le compte des séries se lit sur la SUITE des chiffres rapportés, pas sur
  //   leur nombre : deux portées qui rapportent chacune « un chiffre utile »
  //   n'écrivent pas la même chose selon l'ordre, dès que la cible n'est pas
  //   homogène. Sur `666`, `nbSeries` vaut exactement `⌊six / 3⌋`.
  const nbSeries = (liste) => Math.min(
    seriesDe(liste.flatMap((c) => c.candidat.chiffres), cbl, MAX_SERIES).length, MAX_SERIES,
  );
  // ★ L'HOMOGÉNÉITÉ COMME DERNIER DÉPARTAGE — voir `uniformiserLesProgrammes`.
  //
  //   Cette boucle échange un candidat contre un autre pour réduire le déchet,
  //   et deux candidats rendent souvent le MÊME déchet : ce sont alors deux
  //   programmes équivalents, et rien ne les départageait. Elle défaisait ainsi
  //   l'uniformisation faite juste avant — sur `https://hope-hope-hope.fr/`,
  //   trois « hope » alignés en `ffr3` ressortaient en `ffr3`, `ffr` et `ffr2`,
  //   trois acceptions de la même traduction, et l'écriture ne pouvait plus les
  //   grouper.
  //
  //   On compte donc, à déchet et à récolte égaux, combien de portées portent
  //   déjà le programme envisagé : le plus répandu gagne. C'est un DÉPARTAGE,
  //   pas une préférence — un candidat qui gaspille moins passe toujours devant,
  //   quelle qu'en soit l'homogénéité.
  const codesDe = (c) => c.chemin.ops.map((o) => o.code).join('+');
  // ★ LA CLÉ D'UNE VARIANTE : son score global, son score du moteur, puis ses
  //   codes portée par portée — un ordre, pas une préférence (§4.4 règle 3).
  //   L'homogénéité n'est plus un départage à part : le score la voit déjà
  //   (critère H), et c'est lui qui tranche désormais.
  const cleStable = (liste) => liste
    .map((x) => `${x.portee.debut}.${x.portee.longueur}:${codesDe(x.candidat)}`).join(',');
  const notes = new Map();
  const noteDe = (liste) => {
    if (!evaluer) return null;
    const k = cleStable(liste);
    if (!notes.has(k)) notes.set(k, evaluer(liste) || null);
    return notes.get(k);
  };
  /** Négatif si `a` est la meilleure des deux variantes. */
  const comparer = (a, b) => {
    const na = noteDe(a);
    const nb = noteDe(b);
    if (na && nb) {
      const ga = na.global ?? -1;
      const gb = nb.global ?? -1;
      if (ga !== gb) return gb - ga;
      if (na.score !== nb.score) return nb.score - na.score;
    }
    const ka = cleStable(a);
    const kb = cleStable(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  };
  /* ★ (A) — UN GAIN DE DÉCHET NE SE PAIE PAS EN SCORE GLOBAL. « S'il y a
       différence de score global, c'est à prendre en compte » (l'autrice), et
       aucune baisse de qualité. MESURÉ sans ce garde-fou : sur
       `https://hope-hope-hope.fr/`, une moisson ×2 remplaçait `fr14+tca+m14+mpf`
       par `fr5+tca+mt9+mr9` — un 6 jeté en moins, global 438 → 433. */
  const faitBaisserLeGlobal = (essai, actuelle) => {
    if (!actuelle) return false;
    const n = noteDe(essai);
    return Boolean(n) && (n.global ?? -1) < (actuelle.global ?? -1);
  };
  let six = out.reduce((n, c) => n + c.candidat.six, 0);
  let total = out.reduce((n, c) => n + c.candidat.total, 0);
  // Le point de départ peut DÉJÀ diverger — l'ordonnancement pondéré ne s'en
  // soucie pas. On n'aggrave pas ; on ne prétend pas non plus réparer ici.
  const divergentes = compterTraductionsDivergentes(out.map((x) => ({ chemin: x.candidat.chemin })));
  const series = nbSeries(out);
  const garde = series * cbl.longueur;
  // Le déchet : les valeurs calculées qui ne finiront pas dans le verdict.
  let dechet = total - garde;

  // Les remplacements d'UNE portée qui gardent le verdict et n'ajoutent aucune
  // lecture divergente, avec le déchet qu'ils laisseraient.
  const remplacements = () => {
    const possibles = [];
    for (let i = out.length - 1; i >= 0; i--) {
      const { portee, candidat } = out[i];
      for (const c of portee.candidats) {
        if (c === candidat || c.six < 1 || !accepte(c, candidat)) continue;
        // Le verdict est intangible : ni une série de moins, ni une de plus.
        const essai = out.slice();
        essai[i] = { portee, candidat: c };
        if (nbSeries(essai) !== series) continue;
        // ★ JAMAIS DEUX LECTURES DU MÊME MOT, quel qu'en soit le prix en déchet.
        //
        //   « Traduire un même mot de manière différente dans une même voie est
        //   encore pire que d'utiliser des conversions de César différentes […]
        //   Mieux vaut un peu de déchet que ça » (l'auteur).
        //
        //   C'est un INTERDIT, pas un départage : cette boucle ne cherche qu'à
        //   réduire le gaspillage, et elle y arrivait en échangeant `ffr3`
        //   contre `ffr2` sur l'un des trois « hope » — une valeur jetée en
        //   moins, et le mot qui cesse de vouloir dire la même chose d'un bout à
        //   l'autre de la démonstration. Le barème le facture (`elegance.js ›
        //   TRADUCTION_DIVERGENTE`, 600) ; mieux vaut ne pas le produire.
        //
        //   ⚠️ Le compte vient de `compterTraductionsDivergentes`, celui-là même
        //     que le barème emploie : interdire ici et facturer là-bas deux
        //     choses différentes serait le pire des deux mondes.
        if (compterTraductionsDivergentes(essai.map((x) => ({ chemin: x.candidat.chemin })))
          > divergentes) continue;
        possibles.push({ essai, d: (total - candidat.total + c.total) - garde, total: total - candidat.total + c.total });
      }
    }
    return possibles;
  };
  const jouer = (p) => {
    out.length = 0;
    out.push(...p.essai);
    total = p.total;
    dechet = p.d;
  };

  // 1. La DESCENTE : un gain STRICT, et, entre plusieurs gains égaux, la meilleure variante.
  for (let tour = 0; tour < MAX_RETOUCHES && dechet > 0; tour++) {
    const possibles = remplacements().filter((p) => p.d < dechet);
    if (!possibles.length) break;
    /* ★ (A) SE VÉRIFIE PAR GAIN DÉCROISSANT, et s'arrête au premier gain qui a un
         remplacement accepté. C'est EXACTEMENT l'ensemble que retiendrait le
         calcul complet — le plus fort gain parmi les remplacements acceptés —,
         mais les gains plus faibles ne sont plus notés : chaque note coûte une
         notation entière de la moisson. */
    const actuelle = noteDe(out.slice());
    const gains = [...new Set(possibles.map((p) => p.d))].sort((x, y) => x - y);
    let gagnants = [];
    for (const d of gains) {
      gagnants = possibles.filter((p) => p.d === d && !faitBaisserLeGlobal(p.essai, actuelle));
      if (gagnants.length) break;
    }
    if (!gagnants.length) break;
    gagnants.sort((a, b) => comparer(a.essai, b.essai));
    jouer(gagnants[0]);
  }
  // 2. Le PALIER : à déchet égal, une variante STRICTEMENT meilleure, jusqu'à ce qu'il n'y en ait plus.
  for (let tour = 0; tour < MAX_RETOUCHES; tour++) {
    const egaux = remplacements().filter((p) => p.d === dechet && comparer(p.essai, out) < 0);
    if (!egaux.length) break;
    egaux.sort((a, b) => comparer(a.essai, b.essai));
    jouer(egaux[0]);
  }
  six = out.reduce((n, c) => n + c.candidat.six, 0);
  return out;
}

/* ★ **L'ANCIENNE RÉDUCTION, GARDÉE À L'IDENTIQUE — la moitié historique de la réunion.**
     `moissons` récolte avec elle ET avec `reduireLeSurplus` ; ce que seule la
     nouvelle fabrique s'AJOUTE (`NEE_DE_LA_REDUCTION`). Rien de ce que cette
     réduction-ci montrait ne sort donc de la liste — « zéro baisse de qualité ».
     ⚠️ Elle porte le défaut corrigé à côté (allers-retours à déchet égal, variante
       finale selon la parité des tours). Ne pas la « réparer » : ce serait
       changer ce que les listes publiées montrent, ce que la réunion interdit.
       MESURÉ sans la réunion : sept voies publiées sortaient, dont un groupement
       ×2 de « Donald Trump » en v2 et un LIBRE de « Le chat dort sur le tapis
       rouge » — changer les moissons changeait ce que la sélection gardait. */
function reduireLeSurplusHistorique(choix, accepte, cible = CIBLE_DEFAUT) {
  const cbl = normaliserCible(cible);
  const out = choix.slice();
  // ★ Le compte des séries se lit sur la SUITE des chiffres rapportés, pas sur
  //   leur nombre : deux portées qui rapportent chacune « un chiffre utile »
  //   n'écrivent pas la même chose selon l'ordre, dès que la cible n'est pas
  //   homogène. Sur `666`, `nbSeries` vaut exactement `⌊six / 3⌋`.
  const nbSeries = (liste) => Math.min(
    seriesDe(liste.flatMap((c) => c.candidat.chiffres), cbl, MAX_SERIES).length, MAX_SERIES,
  );
  // ★ L'HOMOGÉNÉITÉ COMME DERNIER DÉPARTAGE — voir `uniformiserLesProgrammes`.
  //
  //   Cette boucle échange un candidat contre un autre pour réduire le déchet,
  //   et deux candidats rendent souvent le MÊME déchet : ce sont alors deux
  //   programmes équivalents, et rien ne les départageait. Elle défaisait ainsi
  //   l'uniformisation faite juste avant — sur `https://hope-hope-hope.fr/`,
  //   trois « hope » alignés en `ffr3` ressortaient en `ffr3`, `ffr` et `ffr2`,
  //   trois acceptions de la même traduction, et l'écriture ne pouvait plus les
  //   grouper.
  //
  //   On compte donc, à déchet et à récolte égaux, combien de portées portent
  //   déjà le programme envisagé : le plus répandu gagne. C'est un DÉPARTAGE,
  //   pas une préférence — un candidat qui gaspille moins passe toujours devant,
  //   quelle qu'en soit l'homogénéité.
  const codesDe = (c) => c.chemin.ops.map((o) => o.code).join('+');
  const combienPortent = (liste, codes) => liste.reduce(
    (n, x) => n + (codesDe(x.candidat) === codes ? 1 : 0), 0,
  );
  let six = out.reduce((n, c) => n + c.candidat.six, 0);
  let total = out.reduce((n, c) => n + c.candidat.total, 0);
  // Le point de départ peut DÉJÀ diverger — l'ordonnancement pondéré ne s'en
  // soucie pas. On n'aggrave pas ; on ne prétend pas non plus réparer ici.
  const divergentes = compterTraductionsDivergentes(out.map((x) => ({ chemin: x.candidat.chemin })));
  const series = nbSeries(out);
  const garde = series * cbl.longueur;
  // Le déchet : les valeurs calculées qui ne finiront pas dans le verdict.
  let dechet = total - garde;

  for (let tour = 0; tour < MAX_RETOUCHES && dechet > 0; tour++) {
    let meilleurI = -1;
    let meilleurC = null;
    let meilleurDechet = dechet;
    let meilleurSix = six;
    let meilleurHomogene = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      const { portee, candidat } = out[i];
      for (const c of portee.candidats) {
        if (c === candidat || c.six < 1 || !accepte(c, candidat)) continue;
        const sixApres = six - candidat.six + c.six;
        // Le verdict est intangible : ni une série de moins, ni une de plus.
        const essai = out.slice();
        essai[i] = { portee, candidat: c };
        if (nbSeries(essai) !== series) continue;
        // ★ JAMAIS DEUX LECTURES DU MÊME MOT, quel qu'en soit le prix en déchet.
        //
        //   « Traduire un même mot de manière différente dans une même voie est
        //   encore pire que d'utiliser des conversions de César différentes […]
        //   Mieux vaut un peu de déchet que ça » (l'auteur).
        //
        //   C'est un INTERDIT, pas un départage : cette boucle ne cherche qu'à
        //   réduire le gaspillage, et elle y arrivait en échangeant `ffr3`
        //   contre `ffr2` sur l'un des trois « hope » — une valeur jetée en
        //   moins, et le mot qui cesse de vouloir dire la même chose d'un bout à
        //   l'autre de la démonstration. Le barème le facture (`elegance.js ›
        //   TRADUCTION_DIVERGENTE`, 600) ; mieux vaut ne pas le produire.
        //
        //   ⚠️ Le compte vient de `compterTraductionsDivergentes`, celui-là même
        //     que le barème emploie : interdire ici et facturer là-bas deux
        //     choses différentes serait le pire des deux mondes.
        if (compterTraductionsDivergentes(essai.map((x) => ({ chemin: x.candidat.chemin })))
          > divergentes) continue;
        const d = (total - candidat.total + c.total) - garde;
        const h = combienPortent(essai, codesDe(c));
        if (d < meilleurDechet
          || (d === meilleurDechet && sixApres < meilleurSix)
          || (d === meilleurDechet && sixApres === meilleurSix && h > meilleurHomogene)) {
          meilleurDechet = d;
          meilleurSix = sixApres;
          meilleurHomogene = h;
          meilleurI = i;
          meilleurC = c;
        }
      }
    }
    if (meilleurI < 0) break;
    const { portee, candidat } = out[meilleurI];
    six = meilleurSix;
    total = total - candidat.total + meilleurC.total;
    dechet = meilleurDechet;
    out[meilleurI] = { portee, candidat: meilleurC };
  }
  return out;
}

/**
 * ★ Une portée qu'on récolte pour la jeter ensuite n'a rien à faire là.
 *
 * L'ordonnancement pondéré maximise les **6**, et le verdict compte des
 * **séries de trois** : les deux ne coïncident pas. Sur
 * `https://hope-hope-hope.fr/`, la moisson ramassait 3 + 4 + 4 + 4 = 15 six sur
 * ses quatre premières portées — cinq séries pile —, puis ajoutait « fr » pour
 * un seizième 6 qui ne faisait pas une sixième série. La démonstration
 * convertissait donc `f` et `r`, les additionnait, et **jetait le résultat cinq
 * étapes plus loin** : quatre étapes de calcul et une de rejet, pour rien.
 *
 * Ce n'est pas seulement du temps perdu, c'est un aveu : montrer qu'on calcule
 * une valeur pour l'écarter aussitôt donne à voir que le compte était arrêté
 * d'avance. Une portée qui ne pèse que dans le SURPLUS est retirée de
 * l'approche — donc de son URL, de son coût, de son score — et ses caractères
 * sont simplement écartés au découpage, du même geste que le point qui les
 * précède, à la première étape.
 *
 * On garde le plus court PRÉFIXE qui atteint encore le compte gardé : le
 * surplus est toujours en queue (`scenario.js` tronque `finaux` par la fin),
 * donc ce qui est entièrement surnuméraire est forcément en fin de liste.
 * L'étape d'appoint subsiste pour ce qu'elle seule sait faire — le surplus qui
 * tombe *à l'intérieur* d'une portée, celle-ci restant indispensable.
 */
function elaguerLaMoisson(parts, cible = CIBLE_DEFAUT) {
  const cbl = normaliserCible(cible);
  const compte = compterMoisson(parts, cbl);
  if (!compte) return parts;
  const garde = compte.series * cbl.longueur;
  let cumul = 0;
  let k = 0;
  while (k < parts.length && cumul < garde) {
    const s = sixDuChemin(parts[k].chemin, cbl);
    cumul += s ? s.six : 0;
    k++;
  }
  if (k >= parts.length) return parts;
  const court = parts.slice(0, k);
  // Élaguer ne doit RIEN changer au verdict : si le compte bouge, on n'y touche
  // pas. C'est le garde-fou qui rend l'élagage sûr sans avoir à raisonner sur
  // les plafonds (`MAX_SERIES`) ni sur les portées à zéro 6.
  const apres = compterMoisson(court, cbl);
  return apres && apres.series === compte.series ? court : parts;
}

/** Un fragment aligné sur une plage de jetons — donc écrivable en portée d'URL. */
function fragmentDeJetons(saisie, jetons, debut, longueur) {
  const premier = jetons[debut];
  const dernierJeton = jetons[debut + longueur - 1];
  const d = premier.offset;
  const f = dernierJeton.offset + dernierJeton.longueur;
  return {
    texte: saisie.slice(d, f),
    offset: d,
    longueur: f - d,
    intervalles: [[d, f]],
    tokenDebut: debut,
    tokenLong: longueur,
    famille: longueur === 1 && premier.genre === 'S' ? 'separateurs' : 'portee',
    priorite: 2,
  };
}

/** Caractères du fragment qui comptent (hors `https://`, `www.`, `/` final). */
function nbSignifiants(fragment, ctx) {
  const m = ctx && ctx.signifiants && ctx.signifiants.masque;
  if (!m) return fragment.longueur;
  let n = 0;
  for (const [d, f] of fragment.intervalles) {
    for (let i = d; i < f && i < m.length; i++) if (m[i]) n++;
  }
  return n;
}

// ══════════════════════════════════ N2 et N3, appliqués au chemin entier
//
// `research/heuristique.md §4.8` prévoit quatre niveaux d'anti-doublons. Deux
// d'entre eux ne mordaient pas, et pour la même raison : ils étaient appliqués
// LOCALEMENT, sur une étape, alors qu'ils portent sur le chemin.
//
//  · N3 — « élimination des opérations neutres ». Le BFS écarte bien l'étape
//    qui ne change rien à l'état COURANT (`kc === cleSrc`, bfs.js). Mais sur
//    `hope-hope-hope.fr`, `f.lettres` change l'état courant — il donne
//    « hopehopehopefr » — et pourtant il ne change RIEN À LA SUITE : le filtre
//    des voyelles qui vient après aboutit à « oeoeoe » dans les deux cas. Le
//    chemin `fl+fv+nl` est donc `fv+nl` avec une étape de décor, et les deux
//    apparaissaient côte à côte dans la liste (défauts 3 et 4). La neutralité
//    n'est ici vraie que SUR CETTE SAISIE — c'est suffisant, puisque la
//    démonstration ne porte que sur elle.
//
//  · N2 — « normalisation des filtres commutatifs ». Le prototype trie les
//    codes pour la CLÉ, mais laisse le chemin dans son ordre d'origine ; comme
//    la clé porte aussi la trace des valeurs, et que la trace diffère,
//    `fp+ftld+nc` et `ftld+fp+nc` survivaient tous les deux. §4.8 demande de trier
//    la suite commutante AVANT de calculer N1 : c'est le chemin qu'on
//    réordonne, pas seulement sa clé.
//
// Les deux se composent : réordonner peut fusionner deux suites commutantes et
// rendre une étape neutre, retirer une étape peut rapprocher deux filtres. On
// itère donc jusqu'au point fixe (au plus `TOURS_NORMALISATION` tours).

const TOURS_NORMALISATION = 4;

/** Rejoue une suite d'opérateurs depuis le texte de départ d'un chemin. */
function rejouerOps(source, ops) {
  let courant = etat('STR', source, [[0, source.length]]);
  const etats = [courant];
  let cout = 0;
  for (const op of ops) {
    const apres = appliquerOp(op, courant);
    if (apres === null) return null;
    etats.push(apres);
    cout += op.cout || 0;
    courant = apres;
  }
  return {
    ops: ops.slice(),
    etats,
    valeur: courant.type === 'NUM' ? courant.valeur : null,
    cout,
  };
}

/**
 * Deux chemins finissent-ils sur exactement le même état ? C'est l'invariant
 * inviolable de toute simplification : on a le droit d'enlever du décor, jamais
 * de changer le résultat. Sans ce garde-fou, retirer la DERNIÈRE étape passait
 * toujours le test de trace (la trace attendue perd justement le dernier état),
 * et `fv+nl` se « simplifiait » en `fv` — un chemin qui n'arrive nulle part.
 */
function memeAboutissement(a, b) {
  const fa = a.etats[a.etats.length - 1];
  const fb = b.etats[b.etats.length - 1];
  return fa.type === fb.type && rendreValeur(fa) === rendreValeur(fb);
}

/**
 * N3 étendu : retire la première étape INOPÉRANTE — celle dont l'absence laisse
 * le chemin aboutir exactement au même endroit.
 *
 * Le critère est le RÉSULTAT, pas l'image intermédiaire. C'est délibéré, et
 * c'est ce qui fait la différence entre attraper le doublon et le laisser
 * passer : sur `https://www.google.com`, `fp+ftld+fv+nlv` et `ftld+fv+nlv` montrent
 * deux images intermédiaires différentes — « www.google » contre
 * « https://www.google » — mais le filtre des voyelles les ramène toutes deux à
 * « ooe ». Le premier filtre n'a rien fait ; exiger l'égalité des images
 * intermédiaires l'aurait déclaré indispensable.
 *
 * Le typage des opérateurs protège le cœur de la méthode : on ne peut pas
 * retirer `t.caracteres` d'un `tca+ma1+cs`, parce que `ma1` n'accepte pas un `STR`.
 * Ce qui saute est ce qui peut sauter : du décor.
 */
function retirerUneEtapeInoperante(chemin, source) {
  for (let i = 0; i < chemin.ops.length; i++) {
    const sans = chemin.ops.slice(0, i).concat(chemin.ops.slice(i + 1));
    if (!sans.length) continue;
    const rejoue = rejouerOps(source, sans);
    if (!rejoue) continue;
    if (memeAboutissement(rejoue, chemin)) return rejoue;
  }
  return null;
}

/** N2 : trie chaque suite maximale d'opérateurs commutants par code croissant. */
function reordonnerCommutants(chemin, source) {
  const ops = chemin.ops;
  const trie = [];
  let bloc = [];
  const vider = () => {
    if (!bloc.length) return;
    bloc.sort((a, x) => codeAvant(a.code, x.code));
    trie.push(...bloc);
    bloc = [];
  };
  for (const op of ops) {
    if (op.commute) bloc.push(op);
    else { vider(); trie.push(op); }
  }
  vider();
  if (trie.every((op, i) => op === ops[i])) return null;
  const rejoue = rejouerOps(source, trie);
  // Réordonner change les images intermédiaires — c'est le but —, mais jamais
  // le résultat : sinon ce n'était pas une commutation.
  if (!rejoue || !memeAboutissement(rejoue, chemin)) return null;
  return rejoue;
}

/**
 * Forme canonique d'un chemin : filtres commutants triés, étapes décoratives
 * retirées. Mémoïsée sur l'objet chemin — l'assemblage repasse dessus des
 * dizaines de fois.
 * @param {Object} chemin
 * @returns {Object} le chemin canonique (le même objet s'il l'était déjà)
 */
export function normaliserChemin(chemin) {
  if (chemin._can) return chemin._can;
  const depart = chemin.etats[0];
  if (!depart || depart.type !== 'STR') { chemin._can = chemin; return chemin; }
  const source = depart.valeur;
  let courant = chemin;
  for (let tour = 0; tour < TOURS_NORMALISATION; tour++) {
    const range = reordonnerCommutants(courant, source);
    if (range) courant = range;
    const allege = retirerUneEtapeInoperante(courant, source);
    if (!allege) { if (!range) break; continue; }
    courant = allege;
  }
  if (courant !== chemin && !memeAboutissement(courant, chemin)) courant = chemin;
  if (courant !== chemin) {
    courant.tronque = chemin.tronque;
    courant.tronqueTemps = chemin.tronqueTemps;
    courant._can = courant;
  }
  chemin._can = courant;
  return courant;
}

/** Ordre déterministe local, calqué sur celui du faisceau (bfs.js). */
function comparerChemins(a, b) {
  const sa = scorePartiel(a);
  const sb = scorePartiel(b);
  if (sa !== sb) return sb - sa;
  if (a.ops.length !== b.ops.length) return a.ops.length - b.ops.length;
  return comparerCodes(a.ops.map((o) => o.code), b.ops.map((o) => o.code));
}

/**
 * Combien de chemins on canonicalise par fragment.
 *
 * La canonicalisation rejoue le programme une fois par étape candidate : c'est
 * quadratique en la longueur du chemin, donc à réserver aux chemins qui ont une
 * chance de servir. La liste arrive triée par `comparerPrefixes` (bfs.js) et
 * l'assemblage n'en garde que `K_PAR_FRAGMENT` ; on prend une marge de trois
 * pour que la déduplication ait de quoi puiser, pas plus. Mesuré sur le
 * paragraphe de test : 3 050 ms sans borne, 300 ms avec.
 */
const K_CANONISABLES = K_PAR_FRAGMENT * 3;

/**
 * Canonicalise puis re-déduplique une liste de chemins. C'est ici que
 * disparaissent les quasi-doublons — `fl+fv+nl` s'effondre sur `fv+nl`,
 * `ftld+fp+nc` sur `fp+ftld+nc`.
 */
export function normaliserChemins(chemins, plafond = K_CANONISABLES) {
  const vus = new Map();
  for (const c of chemins.slice(0, plafond)) {
    const n = normaliserChemin(c);
    const cle = cleTrace(n) + '' + n.ops.map((o) => o.code).join('+');
    const ancien = vus.get(cle);
    if (!ancien || comparerChemins(n, ancien) < 0) vus.set(cle, n);
  }
  return [...vus.values()].sort(comparerChemins);
}

/**
 * @param {string} saisie
 * @param {import('./fragments.js').Fragment[]} fragments
 * @param {Map<string, Object[]>} parFrag  texte normalisé → chemins
 * @param {Object} ctx  {jetons, signifiants, catalogue, cible}
 * @returns {Object[]} approches non notées
 */
export function assembler(saisie, fragments, parFrag, ctx) {
  const cbl = normaliserCible(ctx.cible);
  const kParFragment = ctx.parFragment || K_PAR_FRAGMENT;
  const K = cbl.longueur;              // le nombre de parts d'une approche assemblée
  /* ★ **CE QUE L'ASSEMBLAGE DIT DE LUI-MÊME PENDANT QU'IL TRAVAILLE.**

     > « Maintenant que la recherche prend plus de temps, la barre de
     >   progression en 3 étapes n'est plus assez précise. Il faut qu'on la voie
     >   avancer progressivement, et idéalement qu'elle indique sommairement ce
     >   qu'elle fait. » (l'auteur)

     Mesuré avant de toucher à quoi que ce soit : l'assemblage pèse 37 à 60 %
     du temps d'une recherche — 449 ms sur `hope`, 2 841 sur « Le chat dort sur
     le tapis rouge » — et il n'émettait RIEN. La jauge finissait sa course sur
     les fragments, puis restait figée la moitié de l'attente. Ce n'était pas
     une jauge trop grossière, c'était une jauge qui s'arrêtait avant la fin.

     Et le temps n'est pas réparti : deux modes le prennent presque tout — le
     groupement sous retouche (814 / 1 168 ms) et la convergence (775 / 1 431).
     Les six autres tiennent dans quelques millisecondes. Les poids ci-dessous
     viennent de cette mesure, pas d'une intuition.

     ⚠️ **UN CALLBACK, ET PAS UN `yield`.** `assembler` est appelé DEPUIS le
       générateur de résolution : il ne peut pas rendre la main lui-même. Mais
       dans le navigateur, tout ceci tourne dans un travailleur — l'interface
       n'est pas bloquée, un simple rapport posté suffit à faire avancer la
       barre. Le callback est en LECTURE SEULE : il ne peut rien changer au
       résultat, et son absence ne change rien non plus. */
  const POIDS = { avant: 6, retouche: 45, convergence: 49 };
  const progres = typeof ctx.surProgres === 'function' ? ctx.surProgres : null;
  let faitAvant = 0;
  const dire = (part) => { if (progres) progres(Math.min(1, Math.max(0, part))); };

  const approches = [];
  // Les chemins sont canonicalisés AVANT d'entrer dans un assemblage (N2/N3
  // ci-dessus) : c'est ce qui empêche « voyelles → compter » et « lettres →
  // voyelles → compter » d'occuper deux lignes de la même liste. Le résultat est
  // mémoïsé par fragment — `assembler` redemande les mêmes chemins des dizaines
  // de fois (résonance, partitions, trios libres).
  const canoniques = new Map();
  const cheminsDe = (f) => {
    const cle = f.texte.normalize('NFC');
    let v = canoniques.get(cle);
    if (v === undefined) {
      // ⚠️ **LE PLAFOND DE CANONICALISATION DOIT SUIVRE, sinon il tronque
      //   AVANT le `slice`.** `normaliserChemins` s'arrête au défaut à vingt-
      //   quatre — trois fois la largeur historique —, si bien qu'au cran 10 on
      //   découperait trente-neuf chemins dans une liste qui n'en porterait
      //   déjà plus que vingt-quatre : la largeur monterait sans rien apporter.
      //   Le `max` est ce qui empêche d'y toucher AVANT : jusqu'au cran 7 la
      //   largeur reste sous vingt-quatre, et le plafond historique s'applique
      //   mot pour mot.
      v = normaliserChemins(parFrag.get(cle) || [], Math.max(K_CANONISABLES, kParFragment))
        .slice(0, kParFragment);
      canoniques.set(cle, v);
    }
    return v;
  };
  const cheminsBruts = (f) => parFrag.get(f.texte.normalize('NFC')) || [];
  // Les chemins d'un fragment qui atteignent UN chiffre donné. Sur une cible
  // homogène, c'est la liste entière — le BFS n'a cherché que ce chiffre-là.
  const cheminsPour = (f, chiffre) => cheminsDe(f).filter((c) => valeurFinale(c) === chiffre);

  // ── mode A : RÉSONANCE — les 3 fragments sont littéralement le même texte
  const parMotif = new Map();
  for (const f of fragments) {
    if (f.famille !== 'repetition' && f.famille !== 'periodicite') continue;
    const cle = f.motif || f.texte;
    if (!parMotif.has(cle)) parMotif.set(cle, []);
    parMotif.get(cle).push(f);
  }
  // ★ La résonance EXIGE une cible homogène, et ce n'est pas une limite
  //   d'implémentation. Le mode dit « le même programme, sur les trois
  //   occurrences du même motif » — et un même programme sur un même texte rend
  //   un même chiffre. Il ne peut donc pas écrire `007` : ce serait un autre
  //   mode, portant un autre nom. Sur une cible homogène, le programme doit en
  //   outre rendre CE chiffre-là, ce qui ne filtre rien quand il n'y en a qu'un.
  if (politique(profilDeCible(cbl)).resonance) {
    for (const [, occ] of parMotif) {
      if (occ.length < K) continue;
      const groupe = occ.slice(0, K);
      for (const chemin of cheminsPour(groupe[0], cbl.chiffres[0])) {
        approches.push(approche('RESONANCE', groupe.map((f) => ({ fragment: f, chemin })), { resonance: true }));
      }
    }
  }

  // ── mode E : 666 direct — un chemin passe littéralement par 666
  for (const f of fragments) {
    if (!f.entier && f.famille !== 'entier') continue;
    for (const c of cheminsDe(f)) {
      const tronque = tronquerA666(c, cbl);
      if (tronque) approches.push(approche('DIRECT', [{ fragment: f, chemin: tronque }], { direct666: true }));
    }
  }

  // ── mode G : GROUPEMENT — un vecteur qui porte déjà trois 6, ou six, ou neuf.
  //    C'est ce qui remplace le décret sur une saisie courte, et c'est ce que
  //    demande l'auteur : « quand tu arrives à faire autant de 6, plutôt que de
  //    les réduire à trois, regroupe-les par trois ».
  const opsExplorables = ctx.catalogue ? operateursPourCible(ctx.catalogue, cbl, ctx.cran ?? 0) : [];
  /* ★ **LES OPÉRATEURS QUI GONFLENT LA LIGNE N'EXISTENT QUE POUR LE DERNIER
       RECOURS.** Ils se déclarent (`op.gonfle`) et sont INACTIFS en recherche
       (`actifParDefaut: false`), donc ni le faisceau ni la première passe ne les
       voient jamais : « ces opérateurs ne servent que la passe de dernier
       recours, ils ne doivent pas polluer les voies courtes » (l'auteur). On ne
       les ajoute à la matière que lorsque `index.js` a posé `profond`, et
       `vecteursDeSix` les refuse encore dans son premier déroulé. */
  /* ★ **ET LA MATIÈRE D'UNE PHRASE** (`op.matiereDePhrase`, le code ASCII de
       chaque signe) : seulement quand `index.js` cherche le BLOC d'une phrase
       (`ctx.matiereDePhrase`), en passe profonde. Aucune autre cible ne la voit. */
  const opsGonflantes = ctx.profond === true && ctx.catalogue
    ? normaliserCatalogue(ctx.catalogue).filter((o) => o && !o.deprecated
      && (o.gonfle || (ctx.matiereDePhrase === true && (o.matiereDePhrase || o.eclate))))
    : [];
  const opsPourVecteurs = opsExplorables.concat(opsGonflantes);
  const porteuses = fragmentsAVecteur(fragments, ctx);
  // Les vecteurs du fragment qui couvre TOUT, gardés pour l'étage des retouches
  // ci-dessous : on ne les recalcule pas, on les rejoue sur un texte réécrit.
  let vecteursEntiers = null;
  if (opsExplorables.length) {
    for (const f of porteuses) {
      // ★ **ET C'EST CE PLAFOND-CI QUI TENAIT TOUT LE RESTE.** Vingt-sept des
      //   vingt-huit candidates mesurées sur « Millicent Billette » visant 1998
      //   sont des GROUPEMENTS : elles ne viennent pas du BFS — aucun chemin de
      //   `parFrag` ne porte seulement `mrd` — mais d'ici. Huit vecteurs par
      //   fragment porteur, en dur, c'était la borne réelle de la liste entière.
      const tous = vecteursDeSix(f.texte, opsPourVecteurs, K, kParFragment * 2, cbl,
        // ★ `profond` — la seconde passe de dernier recours, posée par
        //   `index.js` quand un premier assemblage n'a rien rendu.
        {
          curseurs: ctx.curseurs, profond: ctx.profond === true, matiereDePhrase: ctx.matiereDePhrase === true,
          memo: ctx.cache instanceof Map ? ctx.cache : null,
          // ★ La longueur des chaînes de retouches, que le cran commande.
          raffinages: ctx.raffinages ?? 1,
        });
      const vecteurs = tous.slice(0, kParFragment);
      if (f.entier || f.famille === 'entier') vecteursEntiers = vecteurs;
      for (const c of vecteurs) {
        approches.push(approche('GROUPEMENT', [{ fragment: f, chemin: c }]));
      }
      /* ★ **UN SIÈGE PAR FRAGMENT, À LA MIEUX NOTÉE AU SCORE GLOBAL — piste B.**

         La coupe garde les `kParFragment` premières du pré-tri, qui range par
         COMPTE de 6. Une voie courte et juste peut donc être écartée sans que
         le barème l'ait jamais vue : sur « hope », `tca+m14` est 16ᵉ de la
         fenêtre et vaut 7 301 au moteur, 704 au global.

         ★ **QUEL « GLOBAL » POUR UN CANDIDAT DE FRAGMENT.** Le global se calcule
           sur une voie ENTIÈRE ; un chemin nu n'en a pas. On note donc la voie
           que ce candidat formerait à lui seul — le GROUPEMENT d'un fragment et
           d'un chemin, c'est-à-dire exactement ce que la liste montrerait —, par
           `index.js › evaluerUneVoie` : le vrai `noter`, puis `scoreGlobal` sous
           les curseurs de la recherche. Ce n'est pas un score approché, c'est le
           score de la voie elle-même. `montree: false` y est le choix déjà fait
           par `reduireLeSurplus` pour tout ce qui FABRIQUE la matière — le
           recalibrage du 15 septembre ne devait changer que l'ordre de la liste.

         ★ Le siège est pris HORS de la coupe, et l'approche est MARQUÉE : elle
           s'ajoute, elle ne prend la place de personne (`index.js › finaliser`). */
      if (typeof ctx.evaluerUneVoie === 'function') {
        /* ★ **LE SIÈGE REGARDE PLUS LOIN QUE LA COUPE, SANS LA DÉPLACER.**

           MESURÉ : `tca+m14` n'est pas dans la fenêtre du cran 0 (plafond 16) —
           il n'y paraît qu'à partir du plafond 32, au rang 16. Un siège ne peut
           pas élire ce que la fenêtre ne lui montre pas.

           Mais élargir le plafond de la fenêtre QUI SERT LA COUPE réordonne la
           réserve de qualité (`reserveDeQualite` suit le plafond) et chasse des
           titulaires : 26 listes sur 26 changées, mesuré. On demande donc une
           SECONDE fenêtre, plus large, réservée au choix du siège. La coupe
           garde exactement ce qu'elle gardait ; le siège, lui, voit plus loin.

           ⚠️ Les deux fenêtres rendent des chemins CANONISÉS DISTINCTS — un
             plafond différent est une autre clé de mémo, et `normaliserChemin`
             rend un autre objet. On les compare donc par leurs CODES, jamais par
             identité d'objet. */
        const codesDe = (c) => c.ops.map((o) => o.code).join('+');
        const large = vecteursDeSix(f.texte, opsPourVecteurs, K, kParFragment * 4, cbl, {
          curseurs: ctx.curseurs,
          profond: ctx.profond === true,
          matiereDePhrase: ctx.matiereDePhrase === true,
          memo: ctx.cache instanceof Map ? ctx.cache : null,
          raffinages: ctx.raffinages ?? 1,
        });
        const dejaGardes = new Set(vecteurs.map(codesDe));
        let assise = null;
        let meilleur = -1;
        for (const c of large) {
          if (dejaGardes.has(codesDe(c))) continue;
          /* ★ **UN SIÈGE N'ASSOIT PAS CE QUI JETTE.**
             >  « Le siège refuse ce qui JETTE, pas les ficelles. » (l'autrice)

             Il a d'abord refusé les FICELLES, et c'était la mauvaise prise. Le
             jour où `mad` en est sortie — « `mad` n'est pas pire que `mrdE`,
             donc retire-le des ficelles » (l'autrice) —, le garde s'est ouvert
             tout seul et `fl+tca+m14+mad` s'est rassise sur
             `https://hope-hope-hope.fr/`, rendant les deux bornes que son refus
             avait guéries : 21 approches pour 20 places, et `m.seg14` trois fois
             pour un quota de deux. Un critère qui dépend d'une LISTE se défait
             le jour où la liste bouge ; un critère qui dépend de ce que la voie
             FAIT tient tout seul.

             ★ **CE QU'ON MESURE EST CE QU'ELLE JETTE D'ÉTRANGER**, et c'est
               exactement la règle que l'autrice a posée pour la ligne Élégance —
               « mérite de détrôner si elle ne jette rien » (`index.js ›
               rangerParLeGlobal`). Le bilan y distingue deux reliquats, et la
               distinction fait tout : du surplus qui EST le chiffre visé
               (`reliquatDeCible`), et des valeurs qui ne le sont pas
               (`reliquatHorsCible`). Sur « hope », `tca+m14` écrit `6666` : le
               verdict laisse tomber un 6 de trop, elle n'a rien jeté d'étranger
               — et elle DOIT rester assise, c'est tout l'objet du cas 13. Une
               voie qui abandonne des valeurs étrangères, elle, n'est pas assise.

             ⚠️ **COMPTÉ SUR LA LIGNE, PAS SUR LE BILAN — et c'est MESURÉ.** La
               première version demandait `emploieUneFicelle(essai.bilan)` et ne
               s'est JAMAIS déclenchée : `index.js › evaluerUneVoie` est MÉMOÏSÉ,
               et sur un coup de cache il rend la note sans appeler `noter`, si
               bien que `essai.bilan` reste indéfini. On compte donc ici même, sur
               la ligne finale du chemin — ce que `reliquatHorsCible` compte —,
               sans dépendre d'aucune notation ni d'aucun cache.

             ★ Aucun repli : si tout ce que la fenêtre offre au-delà de la coupe
               jette, le fragment n'a pas de siège. Un siège est facultatif ; en
               forcer un rouvrirait la porte qu'on ferme. */
          /* ★ **LE SIÈGE A SA PROPRE LISTE DE REFUS**, et elle n'est pas celle du
             barème. `FICELLES` sert à FACTURER et à QUALIFIER ; le siège, lui,
             décide qui peut être ASSIS. Les deux questions ne se confondent pas,
             et c'est ce qui réconcilie les deux verdicts de l'autrice :

               · « `mad` n'est pas pire que `mrdE`, donc retire-le des ficelles »
                 — au BARÈME, `mad` n'est plus une suspecte, et elle reste hors
                 de `FICELLES` ;
               · mais elle ne se RASSOIT pas pour autant : son retour au siège
                 était la cause directe des deux bornes rouvertes
                 (`jean-michel : 22 approches pour 20 places`, puis
                 `https://hope-hope-hope.fr/ : 21 pour 20` et `m.seg14` trois
                 fois pour un quota de deux).

             ⚠️ `m.additionSelective` est donc nommée ICI, en dur, et c'est
               délibéré — alors même que le retrait de `mad` des ficelles a
               montré qu'un critère adossé à une table se défait quand la table
               bouge. La raison : aucune propriété déclarée ne la sépare des
               autres additions (elle ne porte pas de `recours`), et c'est une
               décision d'arbitrage, pas une propriété du geste. Si l'arbitrage
               change, c'est cette ligne-ci qu'il faut rouvrir.

             ★ Le RECOURS, lui, se lit sur le catalogue et jamais sur une liste :
               `op.recours` est « la part de cohérence qu'une voie cède pour
               avoir employé ce geste », et son défaut (`commun.js`) cite
               l'arbitrage du 15 septembre — « traduire, compléter à neuf ou
               absorber ne se montre qu'en dernier recours ». Il attrape `mab`,
               `mabx`, `mabd` (0,35), `pc9`, `pmr` et les traductions (0,70),
               sans toucher `mrd` ni `mrdE`, qui n'en déclarent aucun.

             ★ **« CE QUI JETTE DE L'ÉTRANGER » A ÉTÉ ESSAYÉ ICI, PUIS RETIRÉ.**
               Refuser le candidat dont la ligne finale porte une valeur hors
               cible est une idée juste — c'est la règle que l'autrice pose pour
               la ligne Élégance, « mérite de détrôner si elle ne jette rien ».
               Au SIÈGE, elle ne tient pas, et deux mesures le disent.

               ⚠️ **ELLE N'EST PAS REDONDANTE — elle est NUISIBLE**, ce qui n'est
                 pas la même chose et se vérifie autrement. Redondante, on
                 l'aurait laissée sans dommage : mesuré, 203 candidats survivent
                 à la liste de refus ci-dessus ET jettent encore. Elle mord donc
                 bel et bien. C'est son SOLDE qui est négatif :

                   ·                          liste seule   liste + « jette »
                   · évictions                      2              13
                   · têtes déplacées / 26           0               2
                   · listes changées / 26           2              13
                   · `sieges.test.js`             5/5             4/5
                   · `sortie`, `diversité N4`     1/1 1/1         1/1 1/1

                 Les deux bornes sont tenues des DEUX côtés : le critère
                 n'achète rien que la liste ne donne déjà, et il coûte onze
                 évictions de plus — dont apophenie 721 → 706 et Emmanuel Macron
                 756 → 675 sur les têtes.

               ★ **LA RAISON, ET ELLE VAUT AU-DELÀ DE CE CRITÈRE-CI** : le siège
                 élit UN candidat par fragment. Refuser un candidat ne soustrait
                 donc pas — cela PROMEUT LE SUIVANT. Un refus de plus n'allège
                 pas la liste, il en change l'élu, et c'est ainsi que la voie
                 grammaticale rentrait à simplicité 200 (`sieges.test.js`, ligne
                 99). Toute règle ajoutée ici doit être jugée sur ce qu'elle fait
                 ÉLIRE, jamais sur ce qu'elle écarte. */
          const refuseAuSiege = (o) => {
            if (!o || !o.id) return false;
            if (Object.prototype.hasOwnProperty.call(FICELLES, o.id)) return true;
            if (o.id === 'm.additionSelective') return true;
            return (o.recours || 0) > 0;
          };
          if (c.ops.some(refuseAuSiege)) continue;
          /* ★ CE QUE LE RECOURS ATTRAPE, VÉRIFIÉ AU CATALOGUE : `mab`, `mabx`,
             `mabd` déclarent 0,35 ; `pc9` et `pmr` 0,70, les traductions 0,70 ;
             `mrd` et `mrdE` n'en déclarent AUCUN et restent au défaut 0. La
             ligne tombe donc exactement où l'autrice la trace, sans que ce
             fichier ait à nommer un seul de ces opérateurs.

             ★ MESURÉ avant d'écrire : la règle retire 23 candidats sur dix
               saisies — absorptions et traductions —, et AUCUN fragment ne se
               retrouve sans siège (0/10). « hope » y perd le plus, 9 des 11,
               toutes des traductions `ffr*`. */
          const essai = approche('GROUPEMENT', [{ fragment: f, chemin: c }]);
          const note = ctx.evaluerUneVoie(essai);
          const g = note && Number.isFinite(note.global) ? note.global : -1;
          if (g > meilleur) { meilleur = g; assise = essai; }
        }
        if (assise) {
          assise[NEE_D_UN_SIEGE] = true;
          approches.push(assise);
        }
      }
    }
  }

  // ── mode G bis : le GROUPEMENT SOUS RETOUCHE — un mot réécrit, puis tout lu.
  //
  // ★ **BRANCHÉ.** Il est resté débranché tant que le barème ne chargeait pas
  //   l'étage amont : une voie retouchée était notée comme si sa préparation
  //   était gratuite, et sur « Donald Trump » cela suffisait à détrôner la voie
  //   que l'auteur a nommée lui-même. Le barème le charge désormais — les gestes
  //   de la retouche au tarif ordinaire, plus le palier `BAREME.RETOUCHE` réglé
  //   au banc —, et l'arbitrage est rendu : plus aucune tête de liste du corpus
  //   ne change du fait d'une retouche, et vingt voies retouchées restent
  //   proposées dans neuf listes sur dix-neuf.
  //
  //   `ctx.retouches === false` les tait encore, pour que le banc puisse
  //   comparer les deux classements sans toucher au moteur.
  dire(POIDS.avant / 100);
  if (ctx.retouches && vecteursEntiers && vecteursEntiers.length) {
    // Le générateur ne dit pas combien il produira : on rapporte sur ce qu'on a
    // vu passer, borné à la part du mode. Une barre qui n'avance plus vaut
    // mieux qu'une barre qui dépasse ce qu'elle a promis.
    for (const a of groupementsRetouches(saisie, ctx.jetons || [], vecteursEntiers, opsExplorables, cbl,
      (part) => dire((POIDS.avant + POIDS.retouche * part) / 100),
      {
        mots: ctx.motsRetouches, vecteurs: ctx.vecteursRetouches, horsGardes: ctx.horsGardesHistoriques,
        // ★ Le cache du moteur : cet étage ne se refait pas d'un cran au suivant.
        memo: ctx.cache instanceof Map ? ctx.cache : null,
      })) {
      approches.push(a);
    }
  }
  faitAvant = POIDS.avant + POIDS.retouche;
  dire(faitAvant / 100);

  // ── mode I : MOISSON — les 6 de portées DISJOINTES, groupés par trois.
  //    C'est le mode que l'auteur met en tête : « privilégie celle qui donne le
  //    plus de séries de 666 sans réutiliser les mêmes caractères ». Le
  //    GROUPEMENT ne récolte que sous une seule méthode ; la moisson prend à
  //    chaque jeton ce qu'il sait donner, par le programme qui lui convient.
  if (opsExplorables.length) {
    for (const a of moissons(saisie, ctx.jetons || [], fragments, parFrag, opsExplorables, cbl,
      kParFragment, ctx.borneAssemblage ?? Infinity, ctx.cache instanceof Map ? ctx.cache : null,
      typeof ctx.evaluerUneVoie === 'function' ? ctx.evaluerUneVoie : null)) {
      approches.push(a);
    }
  }

  // ── mode H : CONVERGENCE — la même chaîne, trois manières différentes.
  //    « Pour les saisies courtes, l'idée sera d'utiliser la séquence complète
  //    de trois manières différentes, pour produire les 6 6 6. » Chacun des
  //    trois 6 est calculé ; aucun n'est décrété.
  //
  //    La chaîne en question est LA SAISIE ENTIÈRE, et rien d'autre : c'est ce
  //    que demande l'auteur, et c'est aussi ce qui distingue ce mode d'un trio
  //    libre — il n'y a rien à cueillir, on prend tout, trois fois.
  //
  //    Le vivier est la liste BRUTE du fragment, pas les huit chemins canoniques
  //    que consomme le reste de l'assemblage : ce mode se nourrit de DIVERSITÉ,
  //    et les huit meilleurs chemins d'un fragment sont souvent huit variantes
  //    du même comptage. Mesuré sur « Millicent » : huit chemins → une seule
  //    manière ; la liste entière → deux. (Deux, pas trois : voir le rapport —
  //    ce mode n'est pas universel.)
  let vusH = 0;
  for (const f of fragments) {
    // La part du mode se répartit entre les fragments ; chaque fragment
    // rapporte À L'INTÉRIEUR de la sienne, par manière examinée.
    const debutF = faitAvant + (POIDS.convergence * vusH) / Math.max(1, fragments.length);
    const largeurF = POIDS.convergence / Math.max(1, fragments.length);
    vusH += 1;
    dire(debutF / 100);
    if (!f.entier && f.famille !== 'entier') continue;
    for (const suite of convergences(cheminsBruts(f), cbl, (part) => dire((debutF + largeurF * part) / 100))) {
      approches.push(approche('CONVERGENCE', suite.map((c) => ({ fragment: f, chemin: c }))));
    }
  }

  // ── L'ASSEMBLAGE MIXTE n'est plus un repli. ───────────────────────────────
  //
  // La jointure sur signature répond au « idéalement selon la même méthode » du
  // README, et elle a raison de le faire : l'homogénéité pèse 0,25, le plus fort
  // des six critères. Mais elle décidait aussi de ce qui EXISTE — le mélange
  // n'était fabriqué QUE lorsque aucune signature commune ne se présentait. Un
  // trio dont deux fragments partagent une méthode ne pouvait donc jamais être
  // montré autrement, même quand la troisième source (un tiret de la touche du
  // 6, un `fr` converti) valait mieux que la variante homogène.
  //
  // Le mélange est donc TOUJOURS proposé, en plus des combinaisons homogènes.
  // L'homogénéité reste préférable — elle le dit dans le score, pas dans le
  // générateur —, mais elle n'empêche plus un 666 d'exister.
  //
  // ⚠️ MESURE : sur les huit saisies témoins, cette levée ne change AUCUNE liste
  // affichée. Les 666 mixtes qui existaient (« un `hope` chaldéen, un tiret
  // AZERTY, un `fr` sept segments » vaut 3 038 sur `hope-hope-hope.fr`) venaient
  // déjà du repli, et ceux que la levée ajoute restent derrière leur variante
  // homogène. Ce qui les tient en bas n'est pas la règle levée ici, c'est leur
  // COUVERTURE : trois fragments cueillis couvrent 26 % de la saisie contre 59 %
  // pour la résonance et 100 % pour le groupement. Le garde-fou est désormais
  // dans le score et nulle part ailleurs — c'est ce qui était demandé —, mais il
  // ne faut pas attendre de cette seule levée qu'elle fasse remonter le mixte.
  // ★ CHAQUE PART REND LE CHIFFRE DE SON RANG. Le premier morceau de `007` doit
  //   rendre 0, le deuxième 0, le troisième 7 — c'est l'ordre de lecture qui
  //   fait la démonstration, et il n'y a rien à permuter. Sur une cible
  //   homogène, la contrainte est vide : toutes les parts veulent le même
  //   chiffre, et le BFS n'a cherché que celui-là.
  const melange = (mode, groupe) => {
    const parts = groupe.map((f, i) => ({
      fragment: f, chemin: meilleur(cheminsPour(f, cbl.chiffres[i])),
    }));
    if (parts.every((p) => p.chemin)) approches.push(approche(mode, parts));
  };
  const signaturesCommunes = (index) => {
    if (!index.length) return [];
    return [...index[0].keys()].filter((s) => index.every((idx) => idx.has(s))).sort();
  };

  /* ★ **UN MODE QUI NE PEUT PAS S'APPLIQUER LE DIT.**
   *
   * Deux modes demandent AUTANT DE PORTÉES QUE LA CIBLE A DE CHIFFRES : la
   * PARTITION en veut des contiguës qui couvrent la saisie, le LIBRE des
   * disjointes parmi les douze meilleures (`MAX_LIBRES`). Au-delà, ils ne
   * rendent rien — et ne rendaient rien SANS LE DIRE : sur une cible de
   * quatorze chiffres, deux des neuf modes du site sont hors jeu par
   * construction, et la réponse n'en disait pas un mot. L'échec bruyant vaut
   * aussi pour ce qui ne s'applique pas (§2.2).
   *
   * ⚠️ On ne CORRIGE rien ici : ces bornes sont ce qu'elles sont — un mode qui
   *   assemble quatorze morceaux disjoints n'aurait ni sens ni scène. On
   *   l'annonce, c'est tout. */
  if (Array.isArray(ctx.modesImpossibles)) {
    const portees = fragments.filter((f) => f.famille !== 'entier' && f.intervalles.length === 1).length;
    if (K > portees) {
      ctx.modesImpossibles.push({
        mode: 'PARTITION',
        dit: `il faudrait ${K} morceaux contigus, la saisie n’en offre que ${portees}`,
      });
    }
    if (K > MAX_LIBRES) {
      ctx.modesImpossibles.push({
        mode: 'LIBRE',
        dit: `il faudrait ${K} portées disjointes, et l’énumération n’en retient que ${MAX_LIBRES}`,
      });
    }
  }

  // ── mode B : PARTITION contiguë couvrante, jointe sur signature
  for (const groupe of partitionsContigues(fragments, ctx, K)) {
    const index = groupe.map((f, i) => indexer(cheminsDe(f), cbl.chiffres[i]));
    for (const s of signaturesCommunes(index)) {
      approches.push(approche('PARTITION', groupe.map((f, i) => ({
        fragment: f, chemin: meilleur(index[i].get(s)),
      }))));
    }
    melange('PARTITION', groupe);
  }

  // ── modes C et D : fragments disjoints (avec ou sans « 6 offert »)
  for (const groupe of trioLibres(fragments, parFrag, K)) {
    const index = groupe.map((f, i) => indexer(cheminsDe(f), cbl.chiffres[i]));
    const offerts = groupe.filter((f) => estSixOffert(f, cbl)).length;
    const mode = offerts >= 2 ? 'SIX_OFFERT' : 'LIBRE';
    for (const s of signaturesCommunes(index).slice(0, 3)) {
      approches.push(approche(mode, groupe.map((f, i) => ({ fragment: f, chemin: meilleur(index[i].get(s)) }))));
    }
    melange(mode, groupe);
  }

  // ── mode OPERATION : deux mots, deux nombres, une LIAISON (`liaisons`)
  approches.push(...liaisons(fragments, ctx, cbl));

  // Le mode est RECALCULÉ à partir de la géométrie des fragments, jamais laissé
  // au générateur qui a produit l'approche : c'est ce qui garantit qu'une URL
  // rejouée retrouve exactement le même score que la liste d'origine (le mode
  // porte un malus, et il n'est pas transporté par l'URL). La LIAISON, elle, est
  // transportée (`=mdl0!`) : le rejeu la passe au même endroit.
  for (const a of approches) {
    Object.assign(a, deduireMode(a.parts, a.liaison ? { ...ctx, liaison: a.liaison.op } : ctx));
  }
  // Le décret est jeté ICI, et non pénalisé plus loin : il n'est plus une
  // approche faible, il n'est plus une approche. Un générateur peut encore en
  // fabriquer un par accident — trois occurrences d'un motif qui retombent sur
  // la même portée, une partition dégénérée —, ce filtre est la garantie qu'il
  // n'atteindra jamais la liste.
  dire(1);
  return dedupliquerApproches(approches).filter((a) => a.mode !== 'DECRET');
}

/**
 * @param {Array<{fragment:Object, chemin:Object}>} parts
 * ★ La CIBLE est rendue avec le mode, et voyage donc avec l'approche. C'est
 * elle qui écrit le verdict (`verdictDe`) et qui décide de la longueur d'une
 * série ; la porter ici garantit qu'une approche assemblée et une approche
 * rejouée depuis une URL en portent une seule et même — celle du contexte, pas
 * une reconstruction.
 *
 * @param {{saisie:string, jetons?:Object[], cible?:Object}} ctx
 * @returns {{mode:string, resonance:boolean, series?:number, cible:Object}}
 */
export function deduireMode(parts, ctx) {
  const cbl = normaliserCible(ctx && ctx.cible);
  const avec = (r) => ({ ...r, cible: cbl });
  if (parts.some((p) => p.chemin.ops.some((o) => o.isJoker))) return avec({ mode: 'JOKER', resonance: false });
  // ★ LA PHRASE EN SEGMENTS — chaque part écrit UN segment de la cible, dans
  //   l'ordre (`conversions.js › segmentsDe`). Ni convergence ni décret : deux
  //   parts au même programme visent deux segments différents. Une série.
  //   ★ Et sur des portées DISJOINTES, rangées dans l'ordre du texte : « éviter
  //   de recopier la saisie » (l'autrice). Deux segments sur les mêmes
  //   caractères ne sont pas une phrase — ce mode ne les nomme pas.
  if (ctx && Array.isArray(ctx.segments) && ctx.segments.length === parts.length
    && segmentsSansCopie(parts)) {
    return avec({ mode: 'PHRASE', resonance: false, series: 1 });
  }
  // ★ LA LIAISON prime sur la géométrie : deux parts qui rendent chacune un
  //   nombre, réunies par un opérateur sur la ligne assemblée. Ni partition ni
  //   moisson — aucune part n'écrit la cible à elle seule.
  if (ctx && ctx.liaison) return avec({ mode: 'OPERATION', resonance: false });
  if (parts.length === 1) {
    const chemin = parts[0].chemin;
    const fin = chemin.etats[chemin.etats.length - 1];
    if (fin.type === 'NUM' && cbl.nombre !== null && fin.valeur === cbl.nombre) {
      return avec({ mode: 'DIRECT', resonance: false });
    }
    const serie = serieDeSix(chemin, cbl);
    if (serie) return avec({ mode: 'GROUPEMENT', resonance: false, series: serie.series });
    // Un seul fragment, un seul 6 : les deux autres seraient décrétés.
    return avec({ mode: 'DECRET', resonance: false });
  }
  // La MOISSON avant tout le reste : plusieurs portées DISJOINTES qui rapportent
  // ensemble au moins deux séries de trois 6. C'est structurel — le compte est
  // refait sur la géométrie et sur les états finaux, jamais lu dans l'URL —, si
  // bien qu'un lien rejoué retrouve le même nombre de séries et le même score.
  const recolte = compterMoisson(parts, cbl);
  if (recolte) {
    const noms = parts.map((p) => p.fragment.texte.toLowerCase());
    const unSeulMotif = new Set(noms).size === 1
      && compterOccurrences(ctx.saisie, noms[0]) >= parts.length;
    return avec({ mode: 'MOISSON', resonance: unSeulMotif, series: recolte.series });
  }
  // Même portée pour toutes les parts : ou bien c'est le même programme, et
  // deux des trois 6 sont décrétés ; ou bien ce sont trois manières différentes
  // de lire la même chaîne, et les trois 6 sont gagnés. Toute la différence
  // entre ce qu'on a supprimé et ce qui le remplace tient dans ce `if`.
  const cles = parts.map((p) => p.fragment.intervalles.map((iv) => iv.join('.')).join('|'));
  if (new Set(cles).size === 1) {
    // Le critère est celui d'`estDecret` : même portée ET même programme. Trois
    // programmes distincts sur la même chaîne, ce sont trois 6 gagnés — pas un
    // 6 recopié. Le générateur, lui, exige en plus trois MANIÈRES distinctes
    // (`convergences`) ; ce test-ci sert aussi à rejouer une URL, où il n'a pas
    // à refuser ce qui existe déjà.
    const programmes = parts.map((p) => p.chemin.ops.map((o) => o.code).join('+'));
    return new Set(programmes).size < parts.length
      ? avec({ mode: 'DECRET', resonance: false })
      : avec({ mode: 'CONVERGENCE', resonance: false });
  }

  const textes = parts.map((p) => p.fragment.texte.toLowerCase());
  const memeTexte = new Set(textes).size === 1;
  if (memeTexte && politique(profilDeCible(cbl)).resonance && parts.length >= cbl.longueur
    && compterOccurrences(ctx.saisie, textes[0]) >= parts.length) {
    return avec({ mode: 'RESONANCE', resonance: true });
  }
  if (parts.filter((p) => estSixOffert(p.fragment, cbl)).length >= 2) {
    return avec({ mode: 'SIX_OFFERT', resonance: false });
  }
  return avec({ mode: couvrante(parts, ctx) ? 'PARTITION' : 'LIBRE', resonance: false });
}

function compterOccurrences(saisie, motif) {
  if (!saisie || !motif) return 0;
  const s = saisie.toLowerCase();
  let n = 0;
  let i = s.indexOf(motif);
  while (i >= 0) { n++; i = s.indexOf(motif, i + motif.length); }
  return n;
}

/** Partition couvrante : les trous entre fragments ne portent aucun caractère de mot. */
function couvrante(parts, ctx) {
  const bornes = parts
    .map((p) => [p.fragment.offset, p.fragment.offset + p.fragment.longueur])
    .sort((a, b) => a[0] - b[0]);
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  let curseur = 0;
  for (const [d, f] of bornes) {
    if (d < curseur) return false; // chevauchement
    if (!trouAcceptable(ctx, curseur, d)) return false;
    curseur = f;
  }
  return trouAcceptable(ctx, curseur, fin);
}

/**
 * Un fragment « 6 offert » : séparateur de la touche 6 en AZERTY, ou chiffre 6
 * littéral.
 *
 * ★ Généralisé au chiffre de la CIBLE écrit tel quel — sur `007`, un `7` dans
 * la saisie est offert au même titre qu'un `6` l'était. Le tiret, lui, reste
 * conditionné à la présence du 6 dans la cible : il n'est offert que parce
 * qu'il partage la touche du 6 sur un AZERTY, et cet argument-là ne se
 * transporte pas. Sur `666`, les deux clauses valent exactement l'ancienne.
 */
function estSixOffert(f, cible = CIBLE_DEFAUT) {
  const c = normaliserCible(cible);
  if (f.famille === 'separateurs') return true;
  if (c.alphabet.includes(6) && f.texte === '-') return true;
  return /^[0-9]$/.test(f.texte) && c.alphabet.includes(Number(f.texte));
}

/**
 * Le chemin passe-t-il littéralement par le NOMBRE que la cible écrit ?
 *
 * ★ Et il faut que la cible en ait un. `007` n'a pas de nombre — `Number('007')`
 * vaut 7, et un `NUM` valant 7 ne démontre pas `007` : il démontre 7. Le mode
 * DIRECT est donc simplement indisponible pour les cibles à zéro de tête
 * (`cible.js › nombre`), plutôt que d'afficher un verdict que l'arithmétique
 * n'a pas produit.
 */
function tronquerA666(chemin, cible = CIBLE_DEFAUT) {
  const but = normaliserCible(cible).nombre;
  if (but === null) return null;
  for (let i = 1; i < chemin.etats.length; i++) {
    const e = chemin.etats[i];
    if (e.type === 'NUM' && e.valeur === but) {
      return { ops: chemin.ops.slice(0, i), etats: chemin.etats.slice(0, i + 1), valeur: but, cout: chemin.ops.slice(0, i).reduce((s, o) => s + (o.cout || 0), 0) };
    }
  }
  return null;
}

/**
 * Partitions contiguës en `n` parts dont les morceaux sont des fragments déjà
 * cherchés — `n` étant la longueur de la cible.
 *
 * ★ Les trois boucles imbriquées sont devenues une descente en profondeur, à
 * l'ordre d'énumération près : rien. Le parcours reste lexicographique sur les
 * index, les mêmes prédicats élaguent les mêmes branches, et à `n = 3` la liste
 * rendue est identique — élément pour élément, dans le même ordre. C'était la
 * condition pour toucher à ce code.
 */
function partitionsContigues(fragments, ctx, n = SERIE) {
  const utiles = fragments
    .filter((f) => f.famille !== 'entier' && f.intervalles.length === 1)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  const pile = [];
  const descendre = (curseur) => {
    if (out.length >= MAX_PARTITIONS) return;
    if (pile.length === n) {
      // Couvrante : les trous ne portent que du non-signifiant ou des séparateurs.
      if (trouAcceptable(ctx, curseur, fin)) out.push(pile.slice());
      return;
    }
    for (let i = 0; i < utiles.length && out.length < MAX_PARTITIONS; i++) {
      const f = utiles[i];
      if (f.offset < curseur) continue;
      if (!trouAcceptable(ctx, curseur, f.offset)) continue;
      pile.push(f);
      descendre(f.offset + f.longueur);
      pile.pop();
    }
  };
  if (n >= 1) descendre(0);
  return out;
}

const RE_MOT = /[\p{L}\p{N}]/u;

function trouAcceptable(ctx, d, f) {
  if (f <= d) return true;
  const s = ctx.saisie || '';
  for (let i = d; i < f; i++) if (RE_MOT.test(s[i])) return false;
  return true;
}

/**
 * Combinaisons de `n` fragments DISJOINTS parmi les meilleurs — bornées à
 * C(12, n), soit 220 à trois parts et 924 au pire (six).
 *
 * ★ À `n = 3`, la descente rend exactement les mêmes triplets, dans le même
 * ordre, que les trois boucles `i < j < k` qu'elle remplace.
 */
function trioLibres(fragments, parFrag, n = SERIE) {
  const notes = fragments
    .filter((f) => (parFrag.get(f.texte.normalize('NFC')) || []).length)
    .map((f) => ({ f, s: scorePartiel((parFrag.get(f.texte.normalize('NFC')) || [])[0]) }))
    .sort((a, b) => b.s - a.s || a.f.offset - b.f.offset)
    .slice(0, MAX_LIBRES)
    .map((x) => x.f)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  const pile = [];
  const descendre = (depart) => {
    if (pile.length === n) { out.push(pile.slice()); return; }
    for (let i = depart; i < notes.length; i++) {
      if (pile.some((f) => chevauche(f, notes[i]))) continue;
      pile.push(notes[i]);
      descendre(i + 1);
      pile.pop();
    }
  };
  if (n >= 1) descendre(0);
  return out;
}

function chevauche(a, b) {
  for (const [d1, f1] of a.intervalles) {
    for (const [d2, f2] of b.intervalles) if (d1 < f2 && d2 < f1) return true;
  }
  return false;
}

/**
 * Anti-doublons N1 de niveau approche : « on déduplique sur ce qui est MONTRÉ,
 * pas sur ce qui est calculé » (§4.8). Le mode d'assemblage ne fait donc pas
 * partie de la clé, et les noms d'opérateurs non plus.
 *
 * Conséquence assumée : sur `hope`, « lettres + voyelles » et
 * « lettres + consonnes » (méthodes 2 et 3 du README) affichent exactement la
 * même suite d'images `hope → HOPE → 6`. Une seule des deux survit — c'est
 * précisément ce que recommandait la recherche arithmétique, qui les qualifie de
 * « statistiquement corrélées, pas indépendantes ».
 */
export function dedupliquerApproches(approches) {
  const vus = new Map();
  for (const a of approches) {
    if (!a.parts.every((p) => p.chemin)) continue;
    // La clé porte le TEXTE du fragment, pas son offset, et elle est triée.
    // Sur `hope-hope-hope.fr`, « le premier hope et les deux tirets » et « le
    // deuxième hope et les deux tirets » calculent exactement les mêmes trois
    // 6 sur exactement les mêmes trois textes : c'est un seul spectacle, et
    // l'occurrence choisie n'est pas une différence de méthode. L'offset, lui,
    // ne servait qu'à les faire passer pour deux lignes distinctes.
    const cle = a.parts
      .map((p) => p.fragment.texte + '' + cleTrace(p.chemin))
      .sort()
      .join('|');
    if (!vus.has(cle)) vus.set(cle, a);
  }
  return prefererLeTriptyqueMontre([...vus.values()]);
}

/**
 * ★ « C'est la même méthode : elle ne devrait pas exister avec ET sans faire
 * remarquer le 666 contigu. » (l'auteur)
 *
 * L'opérateur « trois 6 d'affilée » (`m.troisSixDAffilee`) est un opérateur
 * comme un autre pour la recherche : elle explore donc les deux branches, avec
 * et sans. Sur `Macron`, le chiffre de César suivi du quatorze segments rend
 * `[4, 6, 6, 6, 7, 7]` — et le groupement, lui, retient exactement les trois 6
 * du milieu, avec ou sans l'opérateur. Deux lignes du classement, le même
 * spectacle : d'un côté « le 666 était déjà écrit », de l'autre le même 666
 * ramassé sans le dire. Le lecteur n'a aucun moyen de comprendre ce qui les
 * sépare, parce que rien ne les sépare.
 *
 * Le triptyque n'est pas une méthode, c'est un **fait** : quand il est là et
 * qu'il tient jusqu'au bout, on le montre. Toujours.
 *
 * ★ Le garde-fou est dans la clé, et il compte : deux approches ne sont
 * confondues que si elles ont le même mode ET **le même nombre de séries**.
 * L'opérateur tronque à trois ; sur un vecteur qui porte six 6 contigus il
 * ferait perdre une série entière, et cette variante-là n'est pas la même
 * démonstration — elle reste. On ne fusionne que ce qui rend exactement le même
 * verdict.
 */
/* ⚠️ **CETTE FONCTION EST AUJOURD'HUI INERTE, et c'est voulu.**
   `m.troisSixDAffilee` est DÉPRÉCIÉ (voir `mappeurs.js`) : la recherche ne le
   propose plus, aucune approche ne le porte, et il n'y a donc plus deux
   branches à départager. On ne la retire pas pour autant — elle est
   l'application d'un arbitrage de l'auteur (« c'est la même méthode, elle ne
   devrait pas exister avec ET sans »), et cet arbitrage redevient nécessaire au
   mot près le jour où l'on retire le `deprecated`. La supprimer reviendrait à
   perdre la règle en même temps que l'opérateur, alors qu'ils ne se
   déprécient pas ensemble. */
function prefererLeTriptyqueMontre(approches) {
  const groupes = new Map();
  for (const a of approches) {
    const nu = (p) => p.fragment.texte + '\u0000'
      + p.chemin.ops.filter((o) => o.id !== ID_TRIPTYQUE).map((o) => o.code).join('+');
    const cle = [a.mode ?? '', a.series ?? 1, ...a.parts.map(nu).sort()].join('|');
    const montre = a.parts.reduce(
      (n, p) => n + p.chemin.ops.filter((o) => o.id === ID_TRIPTYQUE).length, 0,
    );
    const tenant = groupes.get(cle);
    // `Map.set` sur une clé existante GARDE sa place : remplacer le tenant ne
    // réordonne pas la liste, et le classement en aval reste déterministe.
    if (!tenant || montre > tenant.montre) groupes.set(cle, { a, montre });
  }
  return [...groupes.values()].map((x) => x.a);
}

// ══════════════════════════════════ garantie « jamais bredouille » (§5)

/**
 * Le joker français, appliqué une fois par chiffre de la cible (donc homogène,
 * H = 1, quand la cible l'est).
 * « Remplacer un nombre par le nombre de lettres de son nom en français. »
 * L'itération admet le cycle attracteur 4 → 6 → 3 → 5 → 4, qui contient 6 ;
 * tout chiffre de 0 à 9 atteint 6 en au plus 3 étapes. C'est une propriété du
 * FRANÇAIS : en anglais `four` a 4 lettres, donc 4 est un point fixe et
 * l'itération converge vers 4 sans jamais passer par 6.
 *
 * ★ **ET C'EST POUR CELA QUE LA GARANTIE « JAMAIS BREDOUILLE » EST UNE GARANTIE
 * SUR 666.** Le cycle attracteur ne visite que 3, 4, 5 et 6 : le joker sait
 * fabriquer ces quatre chiffres-là, et aucun autre. Viser `111`, `007` ou `000`
 * peut donc légitimement ne rien rendre du tout — la page de résultats le DIT
 * (`i18n › resultat.aucuneVoieCible`) au lieu de faire semblant. Le dernier
 * recours du site est une propriété du français ; il n'a jamais promis d'être
 * une propriété des chiffres.
 *
 * @returns {Object|null} une approche, ou null si le catalogue n'a pas de joker
 */
export function approcheJoker(saisie, ctx) {
  const cbl = normaliserCible(ctx && ctx.cible);
  const ops = normaliserCatalogue(ctx.catalogue);
  const joker = ops.find((o) => o.isJoker && o.from === 'NUM' && o.to === 'NUM');
  if (!joker) return null;
  const mesures = ops.filter((o) => o.from === 'STR' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
  const reducteurs = ops.filter((o) => o.from === 'NUM' && o.to === 'NUM' && !o.deprecated && !o.isJoker);

  const s = String(saisie).normalize('NFC');
  const depart = etat('STR', s, [[0, s.length]]);
  let base = null;

  // Amorce 1 — une mesure directe STR→NUM.
  for (const m of mesures) {
    const apres = appliquerOp(m, depart);
    if (apres === null) continue;
    base = { ops: [m], etats: [depart, apres], valeur: apres.valeur, cout: m.cout || 1 };
    break;
  }
  // Amorce 2 — découpe puis dénombrement. Indispensable : le catalogue réel n'a
  // aucune mesure qui compte TOUS les signes (`n.longueur` ne compte que les
  // lettres), si bien qu'une saisie sans lettre — « !!! », « 42 », « … » —
  // n'aurait aucune amorce. Or la chaîne de garantie de research §5.3 repose sur
  // « toute saisie non vide possède au moins une longueur ».
  if (!base) {
    const decoupes = ops.filter((o) => o.from === 'STR' && o.to === 'TOKENS' && !o.deprecated && !o.isJoker);
    const denombrements = ops.filter((o) => o.from === 'TOKENS' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
    boucle:
    for (const d of decoupes) {
      const tokens = appliquerOp(d, depart);
      if (tokens === null) continue;
      for (const n of denombrements) {
        const apres = appliquerOp(n, tokens);
        if (apres === null) continue;
        base = {
          ops: [d, n],
          etats: [depart, tokens, apres],
          valeur: apres.valeur,
          cout: (d.cout || 1) + (n.cout || 1),
        };
        break boucle;
      }
    }
  }
  if (!base) return null;

  // Réduction à un chiffre, puis itération française (≤ 3 étapes, prouvé).
  let reduit = base;
  for (let garde = 0; garde < 12 && Math.abs(dernier(reduit).valeur) > 9; garde++) {
    const red = reducteurs.map((o) => ({ o, r: appliquerOp(o, dernier(reduit)) }))
      .find((x) => x.r !== null && Math.abs(x.r.valeur) < Math.abs(dernier(reduit).valeur));
    if (!red) break;
    reduit = prolonger(reduit, red.o, red.r);
  }

  // Un chemin par CHIFFRE distinct de la cible — mémoïsé, si bien que sur une
  // cible homogène les parts partagent le même objet chemin, exactement comme
  // avant.
  const parChiffre = new Map();
  const chemins = [];
  for (const but of cbl.chiffres) {
    let chemin = parChiffre.get(but);
    if (chemin === undefined) {
      chemin = reduit;
      for (let garde = 0; garde < 6 && dernier(chemin).valeur !== but; garde++) {
        const r = appliquerOp(joker, dernier(chemin));
        if (r === null) break;
        chemin = prolonger(chemin, joker, r);
      }
      if (dernier(chemin).valeur !== but) return null;
      parChiffre.set(but, chemin);
    }
    chemins.push(chemin);
  }

  const fragment = {
    texte: s, offset: 0, longueur: s.length, intervalles: [[0, s.length]],
    tokenDebut: 0, tokenLong: -1, famille: 'entier', priorite: 5,
  };
  return approche('JOKER', chemins.map((chemin) => ({ fragment, chemin })),
    { joker: true, resonance: false, cible: cbl });
}

const dernier = (c) => c.etats[c.etats.length - 1];

function prolonger(c, op, cible) {
  return {
    ops: c.ops.concat([op]),
    etats: c.etats.concat([cible]),
    valeur: cible.type === 'NUM' ? cible.valeur : null,
    cout: c.cout + (op.cout || 0),
  };
}
