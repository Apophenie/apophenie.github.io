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

import { signature, comparerCodes, scorePartiel, maniere } from './score.js';
import { A_MERITER_SA_PLACE, nbTriptyques, compterTraductionsDivergentes } from './elegance.js';
import {
  CIBLE_DEFAUT, normaliserCible, seriesDe, indexUtiles, ecrit, verdict as ecrireVerdict,
} from './cible.js';
import {
  appliquerOp, etat, normaliserCatalogue, operateursPourCible,
  cleEtat, cleTrace, rendreValeur, codeAvant,
} from './bfs.js';
// L'étage des RETOUCHES réécrit la saisie, donc il la re-tokenise : une portée
// d'URL se compte en jetons (§4.2), et ceux du texte réécrit ne sont pas ceux
// du texte tapé. `fragments.js` ne dépend que de `bfs.js` — aucun cycle.
import { tokeniser } from './fragments.js';

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
 * trois — plus petits, mais entiers. Au-delà de six, ce n'est plus une chute,
 * c'est un tableau : la borne reste.
 */
const MAX_FRAGMENTS_VECTEUR = 6;    // fragments soumis à l'énumération des vecteurs
const MAX_VECTEURS_PAR_FRAGMENT = 8; // = K_PAR_FRAGMENT : même largeur que le reste
const MAX_SERIES = 6;               // au plus « 666 » six fois
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
 */
const MAX_JETONS_RETOUCHE = 6;
const MAX_VECTEURS_RETOUCHES = 4;

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
  if (series < 2) return null; // une seule série, c'est un 666 ordinaire
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
  const nonRanges = [];
  for (const o of ops) {
    if (o.from === 'STR' && o.to === 'STR') filtres.push(o);
    else if (o.from === 'STR' && o.to === 'TOKENS') decoupes.push(o);
    else if (o.from === 'TOKENS' && o.to === 'TOKENS') rangements.push(o);
    else if (o.from === 'TOKENS' && o.to === 'NUMS') mappeurs.push(o);
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
  for (const j of jetons.values()) {
    for (const m of mappeurs) {
      const v = appliquerOp(m, j.etat);
      if (v === null) continue;
      retenir(j.ops.concat(m), j.etats.concat([v]));
      for (const r of raffineurs) {
        const w = appliquerOp(r, v);
        if (w !== null) retenir(j.ops.concat(m, r), j.etats.concat([v, w]));
      }
    }
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
  const six = (c) => compterSix(c.etats[c.etats.length - 1], cbl);
  const dilue = (c) => largeurMontree(c, c.etats[c.etats.length - 1].valeur.length) - six(c);
  // Le meilleur compte de 6 atteint SANS ficelle : c'est lui l'étalon. Une voie
  // à ficelle doit le dépasser d'au moins deux pour mériter sa place devant.
  let etalon = 0;
  for (const c of out) if (!nbFicelles(c)) etalon = Math.max(etalon, six(c));
  const rang = (c) => {
    const n = six(c);
    if (!nbFicelles(c)) return n;
    // Une ficelle qui n'apporte qu'un 6 de plus que la meilleure voie honnête
    // est ramenée derrière elle : ce qu'elle achète ne vaut pas ce qu'elle
    // coûtera (`elegance.js`, les paliers de ficelle).
    return n > etalon + 1 ? n : Math.min(n, etalon) - 1;
  };
  out.sort((a, b) => (rang(b) - rang(a)) || (nbFicelles(a) - nbFicelles(b))
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
  const formeDe = (c) => (c.ops || []).map((o) => (Number.isFinite(o.decalage)
    ? String(o.code).replace(/\d+$/, '') : o.code)).join('+');
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
  //     `.slice(0, MAX_VECTEURS_PAR_FRAGMENT)`), si bien qu'une réserve posée en
  //     queue était intégralement jetée une ligne plus loin. Un siège sur quatre
  //     doit valoir pour TOUT préfixe de la liste, pas pour la liste entière.
  // Ce que la voie POSE sur la ligne, une fois finie : les chiffres qui ne sont
  // pas ceux de la cible. Zéro veut dire « il ne reste que 666 ».
  // ⚠️ `six` (défini plus haut) prend le CHEMIN et lit son dernier état ;
  //   `compterSix` prend l'ÉTAT. Passer le chemin au second rend 0 en silence —
  //   il ne trouve pas `type === 'NUMS'` — et la netteté se réduisait alors à
  //   « le vecteur le plus court », ce qui donne le même classement sur les cas
  //   mesurés et le mauvais partout ailleurs (`[1,2,3]` valait `[6,6,6]`).
  const nettete = (c) => c.etats[c.etats.length - 1].valeur.length - six(c);
  const RESERVE_QUALITE = Math.max(1, Math.floor(plafond / 4));
  // ★ On CANONICALISE en marchant, et il le faut : `fmaj+tca+mt9+mpf` et
  //   `fmin+tca+mt9+mpf` montrent exactement ce que montre `tca+mt9+mpf` — la
  //   capitale ne change rien au compte de segments —, et sans cette passe ils
  //   prenaient deux des quatre places réservées pour se faire dédupliquer
  //   trois lignes plus bas. Le coût est borné par la réserve, pas par le
  //   faisceau : on ne canonicalise que jusqu'à l'avoir remplie.
  const parLaQualite = [];
  if (miseEnForme) {
    const candidats = out
      .filter((c) => ecrit(c.etats[c.etats.length - 1].valeur, cbl))
      .sort((a, b) => (nbFicelles(a) - nbFicelles(b)) || (nettete(a) - nettete(b))
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
  const tete = [];
  {
    const parLaQuantite = out.filter((c) => !parLaQualite.includes(c));
    let iQte = 0;
    let iQal = 0;
    while (tete.length < plafond && (iQte < parLaQuantite.length || iQal < parLaQualite.length)) {
      // Un siège sur quatre à la qualité — le quatrième —, et le tour revient à
      // la quantité dès que la réserve est épuisée (et réciproquement).
      const auTourDeLaQualite = (tete.length + 1) % 4 === 0;
      if (auTourDeLaQualite && iQal < parLaQualite.length) tete.push(parLaQualite[iQal++]);
      else if (iQte < parLaQuantite.length) tete.push(parLaQuantite[iQte++]);
      else if (iQal < parLaQualite.length) tete.push(parLaQualite[iQal++]);
      else break;
    }
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
    if (!apporteQuelqueChose(c)) continue;
    const n = normaliserChemin(c);
    const cle = cleTrace(n);
    if (vusCan.has(cle)) continue;
    vusCan.add(cle);
    finaux.push(n);
  }
  return finaux;
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
function groupementsRetouches(saisie, jetons, vecteurs, ops, cible = CIBLE_DEFAUT) {
  const cbl = normaliserCible(cible);
  const mots = jetons.filter((j) => j.genre === 'W').slice(0, MAX_JETONS_RETOUCHE);
  if (!mots.length) return [];
  const retoucheurs = ops.filter((o) => o.from === 'STR' && o.to === 'STR');
  const tete = vecteurs.slice(0, MAX_VECTEURS_RETOUCHES);
  // Le compte de séries AVANT retouche, mesuré une fois par vecteur : c'est le
  // seuil que la retouche doit battre.
  const avant = tete.map((c) => { const s = serieDeSix(c, cbl); return s ? s.series : 0; });

  const out = [];
  const vus = new Set();
  for (const j of mots) {
    const iJeton = jetons.indexOf(j);
    const depart = etat('STR', j.texte, [[0, j.texte.length]]);
    for (const f of retoucheurs) {
      const apres = appliquerOp(f, depart);
      // Une retouche qui ne change rien au mot n'est pas une retouche : elle
      // ajouterait une étape à la scène pour montrer que rien ne bouge.
      if (apres === null || apres.type !== 'STR' || !apres.valeur.length
        || apres.valeur === j.texte) continue;
      const texte = saisie.slice(0, j.offset) + apres.valeur + saisie.slice(j.offset + j.longueur);
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
        out.push(approche('GROUPEMENT', [{
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
              tokenDebut: iJeton, tokenLong: 1, famille: 'portee', priorite: 2,
            },
            chemin: { ops: [f], etats: [depart, apres], valeur: null, cout: f.cout || 0 },
          }],
          saisie,
          saisieRetouchee: texte,
        }));
      });
    }
  }
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
 * (`elegance.js › A_MERITER_SA_PLACE`) — les ficelles, et l'égalisation.
 *
 * ⚠️ Ce n'est PAS `FICELLES`, et ça l'a été. La table des ficelles est un
 * jugement sur le geste, qui décide de paliers d'élégance ; celle-ci dit
 * seulement qu'à quantité comparable, la voie ne prouve pas autant — ce qui est
 * la question que le classement ci-dessus pose, et la seule. L'égalisation en
 * fait partie sans être une ficelle : elle réécrit la ligne entière d'un geste,
 * donc elle produit des 6 en masse par construction.
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
function convergences(bruts, cible = CIBLE_DEFAUT) {
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
  for (const m of manieres) {
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
function candidatsDePortee(texte, ops, chemins, cible = CIBLE_DEFAUT) {
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
    if (nbFicelles(chemin)) return;
    const s = sixDuChemin(chemin, cbl);
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
    const bruts = vecteursDeSix(texte, ops, 1, MAX_CANDIDATS_PORTEE * 2, cbl, { miseEnForme: false });
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
  const lus = (c) => caracteresLus(c.chemin, texte);
  // ★ La dilution se lit sur le vecteur LE PLUS LARGE du chemin (voir
  //   `largeurMontree`) : `c.total` est celui du dernier état, et un opérateur
  //   qui rétrécit avant la fin s'y ferait passer pour économe — `m36` le fait
  //   déjà, honnêtement, et la mesure doit le voir.
  const jetees = (c) => largeurMontree(c.chemin, c.total) - c.six;
  out.sort((a, b) => (b.six - a.six)
    || (lus(b) - lus(a))
    || (jetees(a) - jetees(b))
    || comparerChemins(a.chemin, b.chemin));
  return out.slice(0, MAX_CANDIDATS_PORTEE);
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
  const etalons = [...compte.keys()].sort((a, b) => (compte.get(b) - compte.get(a))
    || (rangDApparition.get(a) - rangDApparition.get(b)));

  const out = retenus.map((r) => r);
  for (const etalon of etalons) {
    for (let i = 0; i < out.length; i++) {
      const actuel = out[i].candidat;
      if (codesDe(actuel) === etalon) continue;
      const jumeau = out[i].portee.candidats.find(
        (c) => codesDe(c) === etalon && (auMoins ? c.six >= actuel.six : c.six === actuel.six),
      );
      if (jumeau) out[i] = { portee: out[i].portee, candidat: jumeau };
    }
  }
  return out;
}

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
function moissons(saisie, jetons, fragments, parFrag, ops, cible = CIBLE_DEFAUT) {
  const cbl = normaliserCible(cible);
  if (!jetons || jetons.length < 2) return [];
  const n = Math.min(jetons.length, MAX_JETONS_MOISSON);
  const cheminsDe = (texte) => parFrag.get(texte.normalize('NFC')) || [];

  // ── 1 & 2. les portées et leurs programmes
  const portees = [];
  const vues = new Set();
  const ajouterPortee = (debut, longueur, texte, avecVecteurs) => {
    if (debut < 0 || longueur <= 0 || debut + longueur > n) return;
    const cle = `${debut}.${longueur}`;
    if (vues.has(cle)) return;
    vues.add(cle);
    const candidats = candidatsDePortee(
      texte, avecVecteurs ? ops : null,
      normaliserChemins(cheminsDe(texte)).slice(0, K_PAR_FRAGMENT), cbl,
    );
    if (!candidats.length) return;
    portees.push({ debut, longueur, texte, candidats });
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
    const { choix } = meilleureMoisson(parDebut, n, accepte);
    if (choix.length < 2) continue;
    const sobre = reduireLeSurplus(choix, accepte, cbl);
    variantes.push({ accepte, retenu: sobre });
    const groupee = uniformiserLesProgrammes(sobre, { auMoins: true });
    if (groupee.some((r, i) => r.candidat !== sobre[i].candidat)) {
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
      const enPlace = new Set(groupee.map((r) => r.candidat.chemin.ops.map((o) => o.code).join('+')));
      const memeProgramme = (c) => enPlace.has(c.chemin.ops.map((o) => o.code).join('+'));
      const nette = reduireLeSurplus(groupee, memeProgramme, cbl);
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
    // ★ La variante groupée n'est retenue que si elle ne laisse RIEN sur le
    //   carreau — voir plus haut. La sobre, elle, sort de `reduireLeSurplus` et
    //   n'a pas à se justifier une seconde fois.
    if (groupee && moisson.six !== moisson.series * cbl.longueur) continue;
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
    out.push(approche('MOISSON', parts));
  }
  return out;
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
 * amélioration STRICTE — à déchet égal, c'est la portée la plus tardive qui
 * cède, celle dont le calcul serait de toute façon montré en dernier.
 *
 * À déchet égal encore, on préfère la récolte la plus MAIGRE : un 6 de plus qui
 * ne fait pas une série de plus est un 6 qu'il faudra montrer puis écarter.
 *
 * Déterminisme (CONTRACTS §4.4) : ordres de balayage fixes, comparaisons
 * strictes, aucune horloge.
 */

/** Plafond de tours de la recherche locale. Le déchet décroît strictement. */
const MAX_RETOUCHES = 32;

function reduireLeSurplus(choix, accepte, cible = CIBLE_DEFAUT) {
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
        if (c === candidat || c.six < 1 || !accepte(c)) continue;
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
  const K = cbl.longueur;              // le nombre de parts d'une approche assemblée
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
      v = normaliserChemins(parFrag.get(cle) || []).slice(0, K_PAR_FRAGMENT);
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
  if (cbl.homogene) {
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
  const opsExplorables = ctx.catalogue ? operateursPourCible(ctx.catalogue, cbl) : [];
  const porteuses = fragmentsAVecteur(fragments, ctx);
  // Les vecteurs du fragment qui couvre TOUT, gardés pour l'étage des retouches
  // ci-dessous : on ne les recalcule pas, on les rejoue sur un texte réécrit.
  let vecteursEntiers = null;
  if (opsExplorables.length) {
    for (const f of porteuses) {
      const vecteurs = vecteursDeSix(f.texte, opsExplorables, K, MAX_VECTEURS_PAR_FRAGMENT * 2, cbl)
        .slice(0, MAX_VECTEURS_PAR_FRAGMENT);
      if (f.entier || f.famille === 'entier') vecteursEntiers = vecteurs;
      for (const c of vecteurs) {
        approches.push(approche('GROUPEMENT', [{ fragment: f, chemin: c }]));
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
  if (ctx.retouches && vecteursEntiers && vecteursEntiers.length) {
    for (const a of groupementsRetouches(saisie, ctx.jetons || [], vecteursEntiers, opsExplorables, cbl)) {
      approches.push(a);
    }
  }

  // ── mode I : MOISSON — les 6 de portées DISJOINTES, groupés par trois.
  //    C'est le mode que l'auteur met en tête : « privilégie celle qui donne le
  //    plus de séries de 666 sans réutiliser les mêmes caractères ». Le
  //    GROUPEMENT ne récolte que sous une seule méthode ; la moisson prend à
  //    chaque jeton ce qu'il sait donner, par le programme qui lui convient.
  if (opsExplorables.length) {
    for (const a of moissons(saisie, ctx.jetons || [], fragments, parFrag, opsExplorables, cbl)) {
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
  for (const f of fragments) {
    if (!f.entier && f.famille !== 'entier') continue;
    for (const suite of convergences(cheminsBruts(f), cbl)) {
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

  // Le mode est RECALCULÉ à partir de la géométrie des fragments, jamais laissé
  // au générateur qui a produit l'approche : c'est ce qui garantit qu'une URL
  // rejouée retrouve exactement le même score que la liste d'origine (le mode
  // porte un malus, et il n'est pas transporté par l'URL).
  for (const a of approches) Object.assign(a, deduireMode(a.parts, ctx));
  // Le décret est jeté ICI, et non pénalisé plus loin : il n'est plus une
  // approche faible, il n'est plus une approche. Un générateur peut encore en
  // fabriquer un par accident — trois occurrences d'un motif qui retombent sur
  // la même portée, une partition dégénérée —, ce filtre est la garantie qu'il
  // n'atteindra jamais la liste.
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
  if (memeTexte && cbl.homogene && parts.length >= cbl.longueur
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
