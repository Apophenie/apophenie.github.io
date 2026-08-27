/** La page de récapitulation du barème — `debug.html`.
 *
 *  ★ ELLE NE RECOPIE RIEN. C'est sa seule règle, et elle prime sur tout le
 *  reste, y compris sur la lisibilité de ce fichier.
 *
 *  « Cette page ne doit pas être une duplication des règles mais une vue
 *  calculée depuis les règles, pour qu'elle ne diverge pas au fur et à mesure
 *  des évolutions » (l'auteur).
 *
 *  Concrètement, aucun nombre, aucun nom de palier, aucun code d'opérateur
 *  n'est écrit ici. Tout est obtenu en PARCOURANT les objets exportés
 *  (`Object.entries`, `CATALOGUE.map`) : ajouter un palier au barème ou un
 *  opérateur au catalogue le fait apparaître ici sans qu'on y touche, et en
 *  retirer un l'en retire. Une page de débogage qui ment est pire que pas de
 *  page du tout — c'est le seul document où l'on vient précisément parce qu'on
 *  ne fait plus confiance à sa mémoire.
 *
 *  ★ CE QU'ELLE NE PEUT PAS MONTRER, et il faut le savoir en la lisant : les
 *  COMMENTAIRES. Le pourquoi de chaque tarif est écrit en JSDoc dans les
 *  sources, et le JavaScript n'a aucun accès à ses propres commentaires à
 *  l'exécution. Chaque section renvoie donc au fichier où lire le raisonnement.
 *  Ce n'est pas une lacune qu'on comblerait en recopiant les phrases ici : ce
 *  serait rouvrir exactement la porte que l'auteur ferme.
 *
 *  ★ AUCUN ACCÈS DEPUIS LE SITE. « Un récapitulatif complet sur une page sans
 *  accès autre que la saisir dans l'URL » (l'auteur). Aucun lien n'y mène, et
 *  cette page n'en propose aucun retour : elle n'est pas une page du site, elle
 *  est un instrument posé à côté.
 *
 *  ═══ DEUX CHOSES QUE LE TABLEAU SEUL NE DISAIT PAS ═══
 *
 *  ★ 1. UN BOUTON « JOUER » PAR OPÉRATEUR. « `m.redecoupageChoisi`, je ne
 *  comprends pas ce qu'il fait. Idéalement, associe à chaque méthode un bouton
 *  play qui joue l'exemple dans une scène en lightbox, que je puisse voir
 *  comment est faite visuellement la transformation, et comment elle est nommée
 *  dans l'interface (son titre et description dans le registre) » (l'auteur).
 *
 *  L'exemple n'est PAS une table saisie-par-opérateur — ce serait la
 *  duplication interdite, et elle pourrirait au premier opérateur ajouté. Il
 *  est CHERCHÉ : une recherche en largeur, depuis quelques saisies témoins,
 *  trouve le plus court programme qui amène l'état dans une forme où
 *  l'opérateur s'applique (voir `programmePour`). Quand elle échoue, la
 *  lightbox le DIT — « aucun exemple trouvé » est une information, un faux
 *  exemple serait un mensonge.
 *
 *  ★ 2. LE SENS DES PALIERS DU BARÈME. « Dans la partie élégance, j'ai
 *  l'impression qu'il y a des bonus et des malus dans ce que tu décris, mais ça
 *  ne se voit pas » (l'auteur). `BAREME` est une liste de nombres tous
 *  positifs : rien dans sa DÉCLARATION ne dit lesquels s'ajoutent au crédit et
 *  lesquels s'en retranchent — la séparation n'existe que dans un commentaire,
 *  et un commentaire n'existe pas à l'exécution.
 *
 *  Le signe est donc MESURÉ, jamais deviné d'après le nom du palier : on
 *  applique le barème à des bilans témoins, on fait varier un palier, et on
 *  regarde si le crédit monte ou descend (voir `sensDesPaliers`). Une table de
 *  correspondance nom → signe aurait menti au premier palier ajouté ; une
 *  mesure, au pire, ne conclut pas — et alors la page le dit aussi.
 */

import {
  CATALOGUE, PAR_ID, appliquer, operateursActifs,
} from '../../moteur/catalogue.js';
import { depuisSaisie, signature } from '../../moteur/etat.js';
import {
  BAREME, FICELLES, NOTE_MAX, bilanApproche, credit, facteur,
} from '../../recherche/elegance.js';
import {
  POIDS, BONUS, MALUS, PART_CRITERES, REGLAGES,
} from '../../recherche/score.js';
// `v` est aliasé : trois fonctions de rendu de ce fichier prennent une valeur
// nommée `v`, et un import du même nom s'y ferait masquer sans prévenir.
import { localiser, v as valeurTraduite } from '../../i18n/index.js';
import { titreApproche, regleApproche } from '../libelles.js';
import { creerRegistre } from '../registre.js';
import { creerTransport, brancherClavier } from '../transport.js';
import { infobuller } from '../infobulle.js';
import * as pont from '../pont.js';
import { e, svg as s } from '../dom.js';

/* ═══════════════════════════ Rendu générique ══════════════════════════════
   Tout ce qui suit travaille sur des objets quelconques : c'est ce qui permet
   à la page de suivre les sources sans être modifiée.
   ══════════════════════════════════════════════════════════════════════════ */

/** Une valeur, quelle que soit sa forme, rendue lisible sans être interprétée.
 *
 *  Les intervalles du barème sont des paires (`[45, 100]` = 45 %) et les
 *  paliers des objets imbriqués. On les montre tels quels plutôt que de les
 *  traduire : traduire, c'est décider, et décider ici serait affirmer quelque
 *  chose que la source ne dit pas. */
function ecrireValeur(v) {
  if (Array.isArray(v)) {
    // Une paire numérique est presque toujours une fraction dans ce code
    // (`[num, den]`). On l'écrit comme telle ET en pourcentage, sans choisir.
    if (v.length === 2 && v.every((x) => typeof x === 'number') && v[1] !== 0) {
      return `${v[0]}⁄${v[1]}  (${((v[0] / v[1]) * 100).toFixed(1)} %)`;
    }
    return `[${v.join(', ')}]`;
  }
  if (v && typeof v === 'object') return null;      // traité par `sousTable`
  return String(v);
}

/**
 * ★ CE QU'ON MONTRE D'UNE VALEUR QUI N'EST PAS UN NOMBRE.
 *
 * Plusieurs champs du catalogue portent des fonctions (`additions`, `cibles`,
 * `compte`) ou des tables entières (`gabarit`, `table`). Les passer à `String`
 * produisait « [object Object] » et des pages de code source dans une cellule
 * de tableau : illisible, et surtout TROMPEUR — un lecteur pressé croit lire
 * une valeur là où il n'y a qu'un accident de conversion.
 *
 * On rend donc une MARQUE : le fait qu'il y a quelque chose, et de quelle
 * nature. « ƒ » pour une fonction, « {12} » pour une table de douze entrées.
 * C'est peu, mais c'est vrai, et ça renvoie à la source pour le reste — ce que
 * cette page fait déjà pour tous les pourquoi.
 */
function apercu(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'function') return 'ƒ';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (v instanceof Map || v instanceof Set) return `${v.constructor.name}(${v.size})`;
  if (typeof v === 'object') return `{${Object.keys(v).length}}`;
  return String(v);
}

/** Une table clé → valeur, dérivée d'un objet. Les valeurs composites
 *  descendent d'un cran plutôt que d'être aplaties : la structure de la source
 *  est une information. */
function tableDe(objet) {
  const lignes = [];
  for (const [cle, valeur] of Object.entries(objet)) {
    const plat = ecrireValeur(valeur);
    if (plat !== null) {
      lignes.push(e('tr', {}, [
        e('td.dbg__cle', { texte: cle }),
        e('td.dbg__val', { texte: plat }),
      ]));
      continue;
    }
    lignes.push(e('tr.dbg__groupe', {}, [
      e('td.dbg__cle', { texte: cle }),
      e('td.dbg__val', {}, [sousTable(valeur)]),
    ]));
  }
  return e('table.dbg__table', {}, [e('tbody', {}, lignes)]);
}

function sousTable(objet) {
  return e('table.dbg__table.dbg__table--imbriquee', {}, [
    e('tbody', {}, Object.entries(objet).map(([c, v]) => e('tr', {}, [
      e('td.dbg__cle', { texte: c }),
      e('td.dbg__val', { texte: ecrireValeur(v) ?? '…' }),
    ]))),
  ]);
}

/** Une section : un titre, l'endroit où lire le POURQUOI, et un contenu. */
function section(titre, source, ...contenu) {
  return e('section.dbg__section', {}, [
    e('h2', { texte: titre }),
    e('p.dbg__source', { texte: `Source : ${source}` }),
    ...contenu,
  ]);
}

/* ══════════════════════════ Les saisies témoins ═══════════════════════════
   ★ ELLES NE SONT PAS CHOISIES PAR OPÉRATEUR, et c'est tout l'enjeu.

   Une table « cet opérateur-ci se montre sur cette saisie-là » serait exactement
   la duplication que cette page refuse : cent lignes à tenir à jour, qui
   pourriraient au premier opérateur ajouté et mentiraient en silence au premier
   renommage. On part donc d'une poignée de saisies COMMUNES, et c'est la
   recherche qui trouve, pour chaque opérateur, un chemin qui l'emploie.

   Les premières viennent du site lui-même : ce sont les « exemples troublants »
   de la page d'accueil (`src/i18n/*.js › accueil.exemples`), donc les saisies
   que le site met déjà en vitrine. On ne les recopie pas, on les LIT.

   Les deux dernières comblent ce que la vitrine ne contient pas — un `www.`,
   des accents, une saisie de chiffres purs — parce que quelques filtres ne
   s'appliquent qu'à ça. Elles ne visent aucun opérateur en particulier : si
   demain un opérateur n'est jouable sur aucune d'elles, la lightbox l'écrira,
   et c'est ce constat-là qui appellera une saisie de plus.
   ══════════════════════════════════════════════════════════════════════════ */

/** Ce que les exemples du site ne montrent pas — et rien de plus. */
export const TEMOINS_COMPLEMENTAIRES = Object.freeze([
  'https://www.numérologie-évidente.fr/preuve',
  '2024',
]);

/** Les saisies témoins, dans l'ordre où elles seront essayées. */
export function saisiesTemoins() {
  const vitrine = valeurTraduite('accueil.exemples');
  const textes = (Array.isArray(vitrine) ? vitrine : [])
    .map((x) => (typeof x === 'string' ? x : x && x.texte))
    .filter((x) => typeof x === 'string' && x);
  return [...new Set([...textes, ...TEMOINS_COMPLEMENTAIRES])];
}

/* ═══════════════ Un exemple qui emploie RÉELLEMENT l'opérateur ════════════
   Le problème : un opérateur ne s'applique qu'à un type d'état (`op.from`), et
   l'état de départ est toujours une chaîne. Pour montrer un opérateur qui
   travaille sur des nombres, il faut d'abord l'amener là.

   La solution est une recherche en largeur ordinaire — mais menée sur TOUTES
   les saisies témoins de front, niveau par niveau. C'est ce qui garantit qu'on
   rend le plus court programme toutes saisies confondues, et non le plus court
   de la première saisie qui marche : un filtre d'URL se montre en un coup sur
   une adresse, il ne faut pas aller le chercher en quatre coups ailleurs.

   Le programme rendu se termine TOUJOURS par l'opérateur demandé : c'est lui la
   dernière transformation, donc celle que la scène finit par montrer.
   ══════════════════════════════════════════════════════════════════════════ */

/** Profondeur maximale du préfixe cherché — la longueur d'un programme réel. */
export const PROFONDEUR_EXEMPLE = 4;
/** Plafond d'états explorés par saisie témoin : la page doit rester vive. */
export const NOEUDS_EXEMPLE = 2500;

/**
 * ★ L'EXPLORATION EST FAITE UNE FOIS, PAS CENT.
 *
 * Les états atteignables depuis les saisies témoins ne dépendent pas de
 * l'opérateur qu'on cherche à montrer : c'est le même arbre pour tout le monde.
 * On le déplie donc une seule fois, niveau par niveau, et chaque opérateur ne
 * fait plus que le parcourir jusqu'à trouver un état où il s'applique.
 *
 * Cent recherches en largeur sont devenues une. C'est ce qui rend le bouton
 * instantané au deuxième clic — et ce qui évite qu'un test qui les essaie tous
 * n'occupe la machine pendant que les autres se chronomètrent.
 */
let explorationMemo = null;

function exploration() {
  if (explorationMemo) return explorationMemo;
  explorationMemo = saisiesTemoins().map((saisie) => {
    const depart = depuisSaisie(saisie);
    return {
      saisie,
      niveaux: [depart ? [{ etat: depart, codes: [] }] : []],
      vus: new Set(depart ? [signature(depart)] : []),
      noeuds: 0,
    };
  });
  return explorationMemo;
}

/**
 * Déplie l'arbre d'UN cran de plus, et seulement si on n'y est pas déjà.
 *
 * ★ Le dépliage est PARESSEUX, et ce n'est pas de l'optimisation prématurée :
 * aujourd'hui aucun opérateur du catalogue n'a besoin de plus de trois
 * transformations d'approche, si bien que le dernier niveau autorisé n'est
 * jamais construit. Le construire d'office coûterait plusieurs secondes pour
 * n'être jamais consulté. Le jour où un opérateur en aura besoin, il se
 * construira tout seul.
 */
/**
 * Les opérateurs d'amont, RANGÉS PAR TYPE D'ENTRÉE.
 *
 * Ce sont ceux que le moteur explore vraiment : un exemple qui passerait par un
 * opérateur déprécié ou par le joker montrerait un chemin que la recherche ne
 * prendrait jamais.
 *
 * ★ Le rangement par `from` n'est pas de la coquetterie : sans lui, chaque état
 * de l'arbre était présenté aux cent opérateurs, dont les trois quarts le
 * refusaient d'emblée sur son seul type. Les clés viennent des opérateurs
 * eux-mêmes — aucun nom de type n'est écrit ici.
 */
let amontMemo = null;

function amontParType() {
  if (amontMemo) return amontMemo;
  amontMemo = new Map();
  for (const op of operateursActifs({ maitres: true })) {
    if (!amontMemo.has(op.from)) amontMemo.set(op.from, []);
    amontMemo.get(op.from).push(op);
  }
  return amontMemo;
}

function deplierJusqua(niveau) {
  const parType = amontParType();
  for (const p of exploration()) {
    while (p.niveaux.length <= niveau) {
      const precedent = p.niveaux[p.niveaux.length - 1];
      const suivante = [];
      for (const noeud of precedent) {
        if (p.noeuds >= NOEUDS_EXEMPLE) break;
        for (const amontOp of parType.get(noeud.etat.type) || []) {
          const apres = appliquer(amontOp, noeud.etat);
          if (apres === null) continue;
          const cle = signature(apres);
          if (p.vus.has(cle)) continue;
          p.vus.add(cle);
          p.noeuds++;
          suivante.push({ etat: apres, codes: [...noeud.codes, amontOp.code] });
        }
      }
      p.niveaux.push(suivante);
    }
  }
}

/**
 * Le plus court programme, depuis l'une des saisies témoins, dont la DERNIÈRE
 * transformation est `op`.
 *
 * Le parcours va NIVEAU par niveau, toutes saisies confondues — et non saisie
 * par saisie : c'est ce qui garantit le plus court programme toutes saisies
 * confondues. Un filtre d'adresse se montre en un coup sur une URL ; il ne faut
 * pas aller le chercher en quatre coups ailleurs parce qu'une autre saisie
 * passait en premier.
 *
 * @param {Object} op un opérateur du catalogue
 * @returns {{saisie:string, codes:string[]}|null} `null` = aucun exemple trouvé
 */
export function programmePour(op) {
  if (!op || !op.code) return null;
  const pistes = exploration();
  for (let niveau = 0; niveau <= PROFONDEUR_EXEMPLE; niveau++) {
    deplierJusqua(niveau);
    for (const p of pistes) {
      for (const noeud of p.niveaux[niveau] || []) {
        // Le type se compare avant de tenter : `appliquer` le referait, mais
        // après avoir construit un contexte pour rien.
        if (noeud.etat.type !== op.from) continue;
        if (appliquer(op, noeud.etat) !== null) {
          return { saisie: p.saisie, codes: [...noeud.codes, op.code] };
        }
      }
    }
  }
  return null;
}

/* ═══════════════ Le SENS de chaque palier du barème, mesuré ═══════════════
   ⚠ LE NOM DU PALIER NE DIT RIEN, et on ne lui demande rien.

   Deviner le signe d'après le nom (« tout ce qui commence par EFFACE_ est un
   malus ») serait une table de correspondance recopiée — la faute même que
   cette page existe pour ne pas commettre —, et elle mentirait au premier
   palier ajouté.

   On MESURE donc, et la mesure est celle qu'on ferait à la main : on prend un
   bilan témoin, on augmente un palier de mille, et on regarde ce que devient le
   crédit. Il monte : ce palier s'ajoute. Il descend : il se retranche. Il ne
   bouge pas : ce bilan-là n'active pas ce palier, on en essaie un autre.

   ★ POURQUOI PLUSIEURS BILANS TÉMOINS, et pas un seul. Beaucoup de postes ne
   comptent que sous condition — « le solde de 6 est-il multiple de la longueur
   d'une série ? », « y a-t-il plus de transformations que le socle n'en
   offre ? ». Un bilan unique en laisserait la moitié à zéro, et on conclurait
   « sans effet » là où il n'y a que « pas d'occasion ». On fait donc varier les
   compteurs : d'abord tous à la même valeur (ce qui satisfait les conditions de
   divisibilité), puis décalés les uns par rapport aux autres.

   ★ LA FORME DU BILAN N'EST PAS ÉCRITE ICI NON PLUS. On part d'un bilan RÉEL,
   calculé sur un chemin témoin, et on ne fait que repeupler ses nombres. Un
   compteur ajouté à `bilanApproche` entre donc tout seul dans la mesure.
   ══════════════════════════════════════════════════════════════════════════ */

/** De combien on pousse un palier pour voir où va le crédit. */
const POUSSEE = 1000;
/** Les valeurs que prennent les compteurs des bilans témoins. */
const VALEURS_TEMOINS = Object.freeze([0, 1, 2, 3, 5, 12, 40, 1000]);

/** Le plus court chemin, depuis une saisie témoin, qui aboutit à un nombre. */
function cheminTemoin(saisie) {
  const depart = depuisSaisie(saisie);
  if (!depart) return null;
  const parType = amontParType();
  const file = [{ etat: depart, ops: [], etats: [depart], cout: 0 }];
  const vus = new Set([signature(depart)]);
  let noeuds = 0;
  while (file.length && noeuds++ < NOEUDS_EXEMPLE) {
    const noeud = file.shift();
    if (noeud.etat.type === 'NUM') {
      return { ops: noeud.ops, etats: noeud.etats, valeur: noeud.etat.valeur, cout: noeud.cout };
    }
    if (noeud.ops.length >= PROFONDEUR_EXEMPLE) continue;
    for (const op of parType.get(noeud.etat.type) || []) {
      const apres = appliquer(op, noeud.etat);
      if (apres === null) continue;
      const cle = signature(apres);
      if (vus.has(cle)) continue;
      vus.add(cle);
      file.push({
        etat: apres,
        ops: [...noeud.ops, op],
        etats: [...noeud.etats, apres],
        cout: noeud.cout + (op.cout || 0),
      });
    }
  }
  return null;
}

/** Un bilan RÉEL, sur le premier chemin témoin trouvé. Il ne sert que de
 *  MOULE : ce sont ses champs, pas ses valeurs, qui comptent. */
function bilanTemoin() {
  for (const saisie of saisiesTemoins()) {
    const chemin = cheminTemoin(saisie);
    if (!chemin) continue;
    const longueur = [...saisie].length;
    const approche = {
      parts: [{
        fragment: {
          texte: saisie,
          offset: 0,
          longueur,
          intervalles: [[0, longueur]],
          tokenDebut: 0,
          tokenLong: 1,
          famille: 'entier',
          priorite: 5,
        },
        chemin,
      }],
    };
    try {
      const b = bilanApproche(approche, { saisie });
      if (b && Number.isFinite(credit(b))) return b;
    } catch { /* on essaie la saisie suivante */ }
  }
  return null;
}

/** Repeuple tous les nombres d'un bilan, en gardant sa forme. */
function repeupler(valeur, decalage, compteur) {
  if (typeof valeur === 'number') {
    return decalage === null
      ? compteur.uniforme
      : VALEURS_TEMOINS[(decalage + compteur.rang++) % VALEURS_TEMOINS.length];
  }
  if (Array.isArray(valeur)) return valeur.map((x) => repeupler(x, decalage, compteur));
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur)
      .map(([cle, x]) => [cle, repeupler(x, decalage, compteur)]));
  }
  return valeur;
}

function bilansTemoins(moule) {
  const jeu = [moule];
  // Tous les compteurs à la même valeur : c'est le seul régime qui satisfait
  // les conditions de divisibilité (« le solde de 6 est-il multiple de trois »).
  for (const uniforme of VALEURS_TEMOINS) jeu.push(repeupler(moule, null, { uniforme, rang: 0 }));
  // Puis décalés, pour que deux compteurs voisins ne soient plus jamais égaux.
  for (let i = 0; i < VALEURS_TEMOINS.length * 3; i++) jeu.push(repeupler(moule, i, { rang: 0 }));
  return jeu;
}

/** Le barème accepte-t-il d'être poussé ? Gelé, il ne se mesure pas. */
function baremePoussable() {
  const cle = Object.keys(BAREME)[0];
  if (cle === undefined) return false;
  const avant = BAREME[cle];
  try {
    BAREME[cle] = avant + 1;
    const bouge = BAREME[cle] !== avant;
    BAREME[cle] = avant;
    return bouge;
  } catch { return false; }
}

/** Une mesure : combien de bilans témoins ont vu la grandeur monter, descendre,
 *  ou ne pas bouger quand on a poussé ce palier. */
function pousser(cle, temoins, grandeur) {
  const avant = BAREME[cle];
  let hausses = 0; let baisses = 0; let nuls = 0;
  for (const b of temoins) {
    let c0; let c1;
    try {
      c0 = grandeur(b);
      BAREME[cle] = avant + POUSSEE;
      c1 = grandeur(b);
    } catch { c0 = NaN; c1 = NaN; } finally { BAREME[cle] = avant; }
    if (!Number.isFinite(c0) || !Number.isFinite(c1)) continue;
    if (c1 > c0) hausses++;
    else if (c1 < c0) baisses++;
    else nuls++;
  }
  const sens = hausses && baisses ? '±' : (hausses ? '+' : (baisses ? '−' : null));
  return { sens, hausses, baisses, nuls, total: hausses + baisses + nuls };
}

/**
 * Le sens de chaque palier du barème, MESURÉ. Sans mémoïsation : c'est cette
 * version que les tests interrogent, parce qu'ils font varier le barème sous
 * elle pour prouver qu'elle ne lit jamais les NOMS.
 *
 * @returns {{mesurable:boolean, raison:?string, temoins:number,
 *            paliers:Map<string,{sens:?string, hausses:number, baisses:number,
 *                                nuls:number, total:number, surFacteur:?Object}>}}
 */
export function mesurerLesPaliers() {
  const paliers = new Map();
  if (!baremePoussable()) {
    return {
      mesurable: false,
      raison: 'le barème est gelé : on ne peut pas faire varier un palier pour '
            + 'observer où va le crédit.',
      temoins: 0,
      paliers,
    };
  }
  const moule = bilanTemoin();
  if (!moule) {
    return {
      mesurable: false,
      raison: 'aucun chemin témoin n’a pu être calculé : sans bilan, le barème '
            + 'ne s’applique à rien et son signe n’est pas observable.',
      temoins: 0,
      paliers,
    };
  }
  const temoins = bilansTemoins(moule);
  for (const cle of Object.keys(BAREME)) {
    if (typeof BAREME[cle] !== 'number') { paliers.set(cle, null); continue; }
    const mesure = pousser(cle, temoins, credit);
    // Un palier qui n'entre pas dans le crédit agit peut-être ailleurs : le
    // facteur d'élégance est la seule autre grandeur que le barème gouverne.
    mesure.surFacteur = mesure.sens ? null : pousser(cle, temoins, (b) => facteur(credit(b)));
    paliers.set(cle, mesure);
  }
  return { mesurable: true, raison: null, temoins: temoins.length, paliers };
}

let sensMemo = null;

/** La même mesure, faite une seule fois par chargement de page. */
export function sensDesPaliers() {
  if (!sensMemo) sensMemo = mesurerLesPaliers();
  return sensMemo;
}

/* ═════════════════════════ Le catalogue, mesuré ═══════════════════════════ */

/** Les colonnes du tableau des opérateurs.
 *
 *  ⚠ Elles sont DÉRIVÉES d'un opérateur réel, pas listées à la main — sauf
 *  l'ordre, qui est le seul choix éditorial de ce fichier. Un champ ajouté au
 *  catalogue apparaîtra donc ici, en fin de ligne, au lieu d'être ignoré en
 *  silence. C'est le contraire du piège que ce dépôt connaît bien : une
 *  troisième copie du vocabulaire qui oublie une entrée. */
const EN_TETE = ['code', 'id', 'famille', 'from', 'to', 'notoriete', 'adHoc', 'cout'];

function champsSupplementaires() {
  const connus = new Set([...EN_TETE, 'libelle', 'regle', 'apply', 'steps', 'note',
    'sortie', 'couverture', 'deprecated', 'commute', 'isJoker', 'actifParDefaut']);
  const vus = new Set();
  for (const op of CATALOGUE) for (const k of Object.keys(op)) if (!connus.has(k)) vus.add(k);
  return [...vus].sort();
}

function tableauDesOperateurs() {
  const extras = champsSupplementaires();
  const colonnes = [...EN_TETE, ...extras, 'ficelle', 'état'];

  const lignes = [...CATALOGUE]
    .sort((a, b) => String(a.code).localeCompare(String(b.code), 'en'))
    .map((op) => {
      const etats = [];
      if (op.deprecated) etats.push('déprécié');
      if (op.isJoker) etats.push('joker');
      if (op.actifParDefaut === false) etats.push('inactif par défaut');
      const cellules = colonnes.map((c) => {
        if (c === 'ficelle') return FICELLES[op.id] || '';
        if (c === 'état') return etats.join(' · ');
        return apercu(op[c]);
      });
      return e(`tr${FICELLES[op.id] ? '.dbg__ficelle' : ''}`, {}, [
        e('td.dbg__jouer-cellule', {}, [boutonJouer(op)]),
        ...cellules.map((t, i) => e(i === 0 ? 'th.dbg__code' : 'td', {
          texte: t, ...(i === 0 ? { scope: 'row' } : {}),
        })),
      ]);
    });

  return e('table.dbg__table.dbg__table--large', {}, [
    e('thead', {}, [e('tr', {}, ['jouer', ...colonnes]
      .map((c) => e('th', { scope: 'col', texte: c })))]),
    e('tbody', {}, lignes),
  ]);
}

/* ══════════════════ LA LIGHTBOX : voir et entendre nommer ═════════════════
   « Un bouton play qui joue l'exemple dans une scène en lightbox, que je puisse
   voir comment est faite visuellement la transformation, et comment elle est
   nommée dans l'interface (son titre et description dans le registre) »
   (l'auteur).

   Deux moitiés, donc, et la seconde compte autant que la première :

    · LA SCÈNE — le vrai moteur visuel, le vrai lecteur, la vraie barre de
      transport. Rien n'est réimplémenté : ce qu'on regarde ici est exactement ce
      qu'un visiteur verrait, sinon la page mentirait sur ce qu'elle montre.

    · LES NOMS — le titre et la règle de l'approche tels que l'interface les
      compose, et LE REGISTRE lui-même, qui porte le titre de la méthode en
      en-tête et le titre de chaque étape dans sa liste. C'est LUI la réponse à
      « comment est-elle nommée » : on ne recopie pas ses libellés, on le monte.

   ★ AUCUN LIBELLÉ D'OPÉRATEUR N'EST ÉCRIT ICI. `libelle`, `regle` et `note`
   sont des formes bilingues portées par le catalogue ; on les localise, comme
   le reste du site (`src/app/libelles.js`).
   ══════════════════════════════════════════════════════════════════════════ */

/** L'identifiant du titre de la lightbox, pour `aria-labelledby`. */
const ID_TITRE_MODALE = 'dbg-modale-titre';

/** Ce qui a le focus au moment d'ouvrir, et la lightbox en cours. */
let modaleOuverte = null;

const FOCUSABLES = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

function boutonJouer(op) {
  const bouton = e('button.dbg__jouer', {
    type: 'button',
    'aria-label': `Jouer un exemple de ${op.code}`,
    sur: { click: () => ouvrirLaScene(op, bouton) },
  }, [
    // ★ NOTRE bulle, jamais l'attribut `title` — banni de ce projet
    //   (`src/app/infobulle.js`). Le nom accessible dit déjà la bonne chose ;
    //   la bulle le rend visible à la souris.
    s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
      s('path', { class: 'ico-plein', d: 'M7 4 L19 12 L7 20 Z' }),
    ]),
  ]);
  infobuller(bouton, () => `Jouer un exemple de ${op.code} — ${localiser(op.libelle) || op.id}`);
  return bouton;
}

/**
 * Compose la démonstration d'un opérateur, de bout en bout, par les mêmes
 * chemins que le site : grammaire d'URL → rejeu → scénario.
 *
 * Passer par l'URL n'est pas un détour décoratif. `rejouer()` est le seul point
 * d'entrée qui fabrique une approche COMPLÈTE — mode déduit, score noté, titre
 * et règle composés par `titres.js` — sans relancer la recherche. Le lien
 * produit est en outre un vrai lien : il s'ouvre dans le site.
 */
async function composerLaDemonstration(op, registre) {
  await pont.preparer();
  // Polices mesurées et table de glyphes chargée : sans elles, un scénario de
  // comptage de segments échoue bruyamment (`src/visuel/index.js › prepare`).
  if (pont.etat.visuel === 'branché') await pont.preparerVisuel();
  const prog = programmePour(op);
  if (!prog) return { echec: 'exemple', saisies: saisiesTemoins() };

  const hash = pont.ecrireHash({
    saisie: prog.saisie,
    fragments: [{ portee: null, resonance: null, codes: prog.codes }],
    registre,
  });
  if (!hash) return { echec: 'url', prog };
  const lecture = pont.lireHash(hash);
  const rejeu = lecture ? pont.rejouer(lecture) : null;
  if (!rejeu || !rejeu.ok) return { echec: 'rejeu', prog, hash, raison: rejeu && rejeu.raison };

  const { scenario, source } = pont.scenarioDe(rejeu.approche, prog.saisie, {
    registre: lecture.registre,
  });
  return { prog, hash, lecture, approche: rejeu.approche, scenario, source };
}

/** Le contenu de la lightbox une fois la démonstration composée. */
function corpsDeLaScene(op, d, registre) {
  if (d.echec === 'exemple') {
    // ★ « Aucun exemple trouvé » est une information ; un faux exemple serait
    //   un mensonge. On dit donc ce qui a été essayé, pour qu'on sache quoi
    //   ajouter aux saisies témoins.
    return {
      element: e('div', {}, [
        e('p.dbg__alerte', {
          texte: 'Aucun exemple trouvé : aucune des saisies témoins ne mène à un état '
               + `sur lequel « ${op.code} » s’applique, en ${PROFONDEUR_EXEMPLE} `
               + 'transformations d’approche ou moins. Il manque une saisie témoin — '
               + 'ou cet opérateur n’est jouable sur rien.',
        }),
        e('p.dbg__note', { texte: `Saisies essayées : ${d.saisies.join('  ·  ')}` }),
      ]),
      detruire() {},
    };
  }
  if (d.echec) {
    return {
      element: e('p.dbg__alerte', {
        texte: `L’exemple a été trouvé (${d.prog.codes.join('+')} sur « ${d.prog.saisie} ») `
             + `mais n’a pas pu être joué : ${d.echec}${d.raison ? ` — ${d.raison}` : ''}.`,
      }),
      detruire() {},
    };
  }

  const scene = s('svg', {
    class: 'scene',
    'aria-hidden': 'true',
    focusable: 'false',
    preserveAspectRatio: 'xMidYMid meet',
  });
  const cadre = e('div.scene-cadre', {
    role: 'group',
    tabindex: '0',
    'aria-label': 'La scène de l’exemple',
    'aria-describedby': 'etape-courante',
  }, [scene]);

  const { lecteur, source: sourceLecteur } = pont.creerLecteur(scene, d.scenario, {
    reducedMotion: 'auto',
    speed: 1,
    repeatSpeed: pont.facteurRepetitions(),
    // La scénographie du verdict n'a de sens que dans le registre qui n'est pas
    // celui par défaut : c'est la mise en scène qu'on opte (voir `url.js`).
    scenographie: registre !== pont.REGISTRE_DEFAUT,
    // Le clic qui a ouvert la lightbox EST le geste : la scène part toute
    // seule, et le lecteur applique lui-même la règle du mouvement réduit.
    autoplay: true,
  });
  const transport = creerTransport(lecteur, {}, { repetitions: pont.facteurRepetitions() });
  const registreVue = creerRegistre(lecteur, { titre: titreApproche(d.approche) });
  const detacherClavier = brancherClavier(cadre, lecteur);

  const regle = regleApproche(d.approche);
  const element = e('div.dbg__demo', {}, [
    // ★ Le titre et la règle de l'approche, tels que l'interface les compose.
    //   Ils viennent de `recherche/titres.js` en passant par `libelles.js` : ce
    //   sont, mot pour mot, ceux qu'un visiteur lirait.
    regle ? e('p.dbg__regle', { texte: regle }) : null,
    e('div.dbg__scene', {}, [cadre, transport.element]),
    registreVue.element,
    registreVue.regionLive,
    d.source === 'secours' || sourceLecteur === 'secours'
      ? e('p.dbg__alerte', { texte: '△ Repli : le moteur n’a pas rendu la vraie scène.' })
      : null,
  ]);

  return {
    element,
    detruire() {
      detacherClavier();
      registreVue.detruire();
      transport.detruire();
      if (typeof lecteur.destroy === 'function') lecteur.destroy();
    },
  };
}

/**
 * ★ ACCESSIBILITÉ DE LA LIGHTBOX, et rien n'y est négociable :
 *   · Échap ferme, un clic hors du panneau ferme ;
 *   · le focus ENTRE au montage et REVIENT au bouton d'origine à la fermeture ;
 *   · la tabulation tourne en rond dans le panneau tant qu'il est ouvert —
 *     sinon on tabulerait dans un tableau qu'on ne voit plus ;
 *   · le reste de la page passe en `inert` : ce qui est masqué à l'œil doit
 *     l'être aussi au lecteur d'écran.
 */
function ouvrirLaScene(op, bouton) {
  if (modaleOuverte) modaleOuverte.fermer();

  const registre = pont.REGISTRE_DEFAUT;
  const corps = e('div.dbg__corps', {}, [e('p.dbg__note', { texte: 'Recherche d’un exemple…' })]);
  let contenu = null;
  let ferme = false;

  const fermeture = e('button.dbg__fermer', {
    type: 'button',
    'aria-label': 'Fermer',
    sur: { click: () => fermer() },
  }, [e('span', { texte: '×', 'aria-hidden': 'true' })]);

  const panneau = e('div.dbg__modale', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': ID_TITRE_MODALE,
  }, [
    fermeture,
    e(`h2#${ID_TITRE_MODALE}`, { texte: `${op.code} — ${localiser(op.libelle) || op.id}` }),
    // La règle et la note du catalogue, localisées — jamais recopiées.
    localiser(op.regle) ? e('p.dbg__source', { texte: localiser(op.regle) }) : null,
    localiser(op.note) ? e('p.dbg__note', { texte: localiser(op.note) }) : null,
    corps,
  ]);

  const voile = e('div.dbg__voile', {
    sur: { pointerdown: (ev) => { if (ev.target === voile) fermer(); } },
  }, [panneau]);

  const rendu = document.activeElement;
  const racine = document.getElementById('dbg');
  if (racine && 'inert' in racine) racine.inert = true;
  document.body.appendChild(voile);
  document.addEventListener('keydown', surTouche, true);
  fermeture.focus();

  // ★ La recherche d'un exemple prend jusqu'à une seconde la première fois
  //   (l'arbre se déplie, voir `deplierJusqua`). La lightbox s'ouvre AVANT, sur
  //   son attente : un bouton qui ne fait rien pendant une seconde passe pour
  //   cassé, et on le reclique.
  composerLaDemonstration(op, registre).then((d) => {
    if (ferme) return;                              // refermée entre-temps
    contenu = corpsDeLaScene(op, d, registre);
    corps.replaceChildren(contenu.element);
    if (!d.echec) corps.appendChild(ficheDeLExemple(d));
  }).catch((err) => {
    if (ferme) return;
    corps.replaceChildren(e('p.dbg__alerte', {
      texte: `L’exemple n’a pas pu être composé : ${err && err.message}`,
    }));
    console.error('[NumHeroLOLgeek] lightbox du récapitulatif :', err);
  });

  function surTouche(ev) {
    if (ev.key === 'Escape') { ev.stopPropagation(); fermer(); return; }
    if (ev.key !== 'Tab') return;
    const cibles = [...panneau.querySelectorAll(FOCUSABLES)]
      .filter((el) => el.offsetParent !== null || el === fermeture);
    if (!cibles.length) return;
    const premier = cibles[0];
    const dernier = cibles[cibles.length - 1];
    if (!panneau.contains(document.activeElement)) { ev.preventDefault(); premier.focus(); return; }
    if (ev.shiftKey && document.activeElement === premier) { ev.preventDefault(); dernier.focus(); }
    else if (!ev.shiftKey && document.activeElement === dernier) { ev.preventDefault(); premier.focus(); }
  }

  // ★ Un DRAPEAU, et non une comparaison avec l'objet rendu plus bas : `fermer`
  //   est appelable dès le premier clic sur la croix, c'est-à-dire avant que la
  //   dernière ligne de cette fonction n'ait eu lieu. Nommer là une constante
  //   déclarée après, ce serait lire une zone morte temporelle.
  function fermer() {
    if (ferme) return;
    ferme = true;
    if (modaleOuverte && modaleOuverte.fermer === fermer) modaleOuverte = null;
    document.removeEventListener('keydown', surTouche, true);
    if (contenu) contenu.detruire();
    voile.remove();
    if (racine && 'inert' in racine) racine.inert = false;
    const retour = bouton || rendu;
    if (retour && typeof retour.focus === 'function') retour.focus();
  }

  const api = { fermer, element: voile };
  modaleOuverte = api;
  return api;
}

/** D'où vient l'exemple : la saisie, le programme, et le lien qui le rejoue. */
function ficheDeLExemple(d) {
  const lignes = [
    ['saisie témoin', d.prog.saisie],
    ['programme', d.prog.codes.join('+')],
    ['registre', d.lecture ? d.lecture.registre : ''],
    ['lien', d.hash],
  ];
  return e('dl.dbg__fiche', {}, lignes.flatMap(([cle, valeur]) => [
    e('dt', { texte: cle }),
    e('dd', { texte: String(valeur) }),
  ]));
}

/* ══════════════════ Le recoupement que seule cette page fait ══════════════ */

/**
 * ★ LES PALIERS QUI DORMENT — le seul contenu de cette page qui ne soit pas un
 * simple reflet, et sa raison d'être.
 *
 * Le barème porte des paliers de ficelle ; `FICELLES` dit quel opérateur
 * alimente lequel. Un palier que personne n'alimente a un compteur toujours
 * nul : son tarif est alors une PRÉDICTION, pas une mesure. C'est arrivé
 * plusieurs fois dans ce dépôt — trois paliers ont dormi jusqu'à ce que les
 * opérateurs correspondants soient écrits, et un autre attend encore.
 *
 * Le rapprochement est fait ici parce qu'aucun des deux fichiers ne peut le
 * faire seul : le barème ignore le catalogue, et le catalogue ignore le barème.
 */
function paliersQuiDorment() {
  const alimentes = new Set(Object.values(FICELLES));
  const parPalier = new Map();
  for (const [id, palier] of Object.entries(FICELLES)) {
    if (!parPalier.has(palier)) parPalier.set(palier, []);
    parPalier.get(palier).push(id);
  }

  // Les paliers du barème qui ressemblent à des ficelles : ceux dont le nom,
  // ramené en minuscules, figure parmi les valeurs de `FICELLES`. Rien n'est
  // deviné — c'est la table qui parle.
  const mesure = sensDesPaliers();
  const lignes = [];
  for (const [cle, valeur] of Object.entries(BAREME)) {
    const nom = cle.toLowerCase().replace(/_/g, '');
    const palier = [...alimentes].find((p) => p.toLowerCase() === nom);
    if (!palier && !nom.includes('sansmotif')) continue;
    const ids = parPalier.get(palier) || [];
    // Le même signe mesuré qu'au-dessus : un tarif nu ne dit pas s'il s'ajoute
    // ou se retranche, et ces paliers-là sont justement des peines.
    const m = mesure.mesurable ? mesure.paliers.get(cle) : null;
    const marque = e('td.dbg__sens.dbg__sens--seul', { texte: m && m.sens ? m.sens : '·' });
    if (mesure.mesurable) infobuller(marque, () => texteDeMesure(cle, m));
    lignes.push(e(`tr${ids.length ? '' : '.dbg__dort'}`, {}, [
      marque,
      e('td.dbg__cle', { texte: cle }),
      e('td.dbg__val', { texte: String(valeur) }),
      e('td', { texte: ids.length ? ids.join(', ') : '— aucun opérateur : compteur toujours nul' }),
    ]));
  }

  // Et l'inverse : un identifiant inscrit dans `FICELLES` qui ne désignerait
  // aucun opérateur du catalogue. Ce serait une faute franche, et silencieuse.
  const orphelins = Object.keys(FICELLES).filter((id) => !PAR_ID.has(id));

  return e('div', {}, [
    e('table.dbg__table', {}, [
      e('thead', {}, [e('tr', {}, ['sens', 'palier', 'tarif', 'alimenté par']
        .map((c) => e('th', { scope: 'col', texte: c })))]),
      e('tbody', {}, lignes),
    ]),
    orphelins.length
      ? e('p.dbg__alerte', {
        texte: `⚠ ${orphelins.length} identifiant(s) de FICELLES ne désignent aucun `
             + `opérateur du catalogue : ${orphelins.join(', ')}`,
      })
      : e('p.dbg__ok', { texte: 'Tout identifiant de FICELLES désigne bien un opérateur du catalogue.' }),
  ]);
}

/* ═════════════ Le barème, rangé par ce que chaque palier FAIT ═════════════
   « J'ai l'impression qu'il y a des bonus et des malus dans ce que tu décris,
   mais ça ne se voit pas » (l'auteur). Il a raison, et la faute n'est pas dans
   l'affichage : elle est dans la déclaration. `BAREME` est une liste de nombres
   tous positifs ; la séparation entre ce qui se gagne et ce qui se perd n'existe
   que dans un commentaire, et un commentaire n'existe pas à l'exécution.

   On range donc les paliers par le résultat de la MESURE (`sensDesPaliers`), et
   l'ordre de déclaration est conservé à l'intérieur de chaque groupe : c'est
   encore la source qui décide, on ne fait que la trier.
   ══════════════════════════════════════════════════════════════════════════ */

/** Le nom de chaque groupe, et sa classe. L'ordre des groupes est le seul
 *  choix éditorial : d'abord ce qui rapporte, puis ce qui coûte. */
const GROUPES = [
  ['+', 'Ce qui fait MONTER le crédit', 'dbg__gain'],
  ['−', 'Ce qui le fait DESCENDRE', 'dbg__perte'],
  ['±', 'Ce qui fait les deux, selon le chemin', 'dbg__mixte'],
  [null, 'Ce qui n’entre pas dans le crédit', 'dbg__neutre'],
];

function texteDeMesure(cle, mesure) {
  if (!mesure) return `${cle} : ce palier n’est pas un nombre — rien à mesurer.`;
  const dit = `${mesure.hausses} hausse(s), ${mesure.baisses} baisse(s), `
    + `${mesure.nuls} sans effet, sur ${mesure.total} bilans témoins.`;
  if (mesure.sens) return `Mesuré sur le crédit d’élégance : ${dit}`;
  const f = mesure.surFacteur;
  const surF = f && f.sens
    ? `\nSur le facteur d’élégance, en revanche : ${f.sens === '+' ? 'il monte' : 'il descend'} `
      + `(${f.hausses} hausse(s), ${f.baisses} baisse(s)).`
    : '\nNi sur le facteur d’élégance.';
  return `Mesuré sur le crédit d’élégance : ${dit}${surF}`;
}

function ligneDePalier(cle, valeur, mesure) {
  const marque = e('td.dbg__sens', { texte: mesure && mesure.sens ? mesure.sens : '·' });
  infobuller(marque, () => texteDeMesure(cle, mesure));
  const plat = ecrireValeur(valeur);
  return e('tr', {}, [
    marque,
    e('td.dbg__cle', { texte: cle }),
    plat !== null
      ? e('td.dbg__val', { texte: plat })
      : e('td.dbg__val', {}, [sousTable(valeur)]),
  ]);
}

function baremeRange() {
  const mesure = sensDesPaliers();
  if (!mesure.mesurable) {
    // ★ On le DIT plutôt que d'inventer un classement : « le signe de ces
    //   paliers n'est pas déductible de leur déclaration » est un constat utile,
    //   qui appellera la correction.
    return e('div', {}, [
      e('p.dbg__alerte', {
        texte: `⚠ Le signe des paliers n’a pas pu être mesuré — ${mesure.raison} `
             + 'Le tableau ci-dessous les montre donc à plat, sans dire lesquels '
             + 'sont des bonus et lesquels des malus : le déduire de leur nom '
             + 'serait une table recopiée, qui mentirait au premier palier ajouté.',
      }),
      tableDe(BAREME),
    ]);
  }

  const entrees = Object.entries(BAREME);
  const blocs = [];
  for (const [sens, titre, classe] of GROUPES) {
    const dedans = entrees.filter(([cle]) => {
      const m = mesure.paliers.get(cle);
      return (m && m.sens ? m.sens : null) === sens;
    });
    if (!dedans.length) continue;
    blocs.push(e(`div.dbg__groupe-barème.${classe}`, {}, [
      e('h3.dbg__groupe-titre', { texte: `${sens || '·'}  ${titre}  (${dedans.length})` }),
      e('table.dbg__table', {}, [
        e('tbody', {}, dedans.map(([cle, valeur]) =>
          ligneDePalier(cle, valeur, mesure.paliers.get(cle)))),
      ]),
    ]));
  }

  return e('div', {}, [
    e('p.dbg__note', {
      texte: `Signe MESURÉ, jamais deviné : chaque palier est poussé de ${POUSSEE} `
           + `sur ${mesure.temoins} bilans témoins, et l’on regarde où va le crédit. `
           + 'Rien ici ne dépend du nom du palier. Survolez la marque pour lire la mesure.',
    }),
    ...blocs,
  ]);
}

/* ════════════════════════════ L'assemblage ════════════════════════════════ */

export function pageDebug() {
  const parFamille = new Map();
  for (const op of CATALOGUE) parFamille.set(op.famille, (parFamille.get(op.famille) || 0) + 1);

  return e('div.dbg', {}, [
    e('h1', { texte: 'Récapitulatif du barème' }),
    e('p.dbg__avertissement', {
      texte: 'Vue CALCULÉE depuis les sources, jamais recopiée : ajouter un palier ou un '
           + 'opérateur le fait apparaître ici sans qu’on y touche. Les commentaires, eux, '
           + 'ne sont pas accessibles à l’exécution — chaque section indique où lire le '
           + 'pourquoi. Le bouton ▷ de chaque opérateur en joue un exemple CHERCHÉ, pas '
           + 'choisi d’avance ; le signe de chaque palier du barème est MESURÉ, pas déduit '
           + 'de son nom.',
    }),

    section(`Les opérateurs (${CATALOGUE.length})`,
      'src/moteur/catalogue.js · src/moteur/transformations/',
      e('p.dbg__note', {
        texte: [...parFamille.entries()].sort()
          .map(([f, n]) => `${f} : ${n}`).join('  ·  '),
      }),
      tableauDesOperateurs()),

    section('Le crédit d’élégance — ce qui se gagne, ce qui se perd',
      'src/recherche/elegance.js › BAREME',
      e('p.dbg__note', { texte: `Note maximale : ${NOTE_MAX}` }),
      baremeRange()),

    section('Les paliers de ficelle, et ceux qui dorment',
      'recoupement de elegance.js › BAREME et elegance.js › FICELLES',
      paliersQuiDorment()),

    section('Le score de conviction — les poids des critères',
      'src/recherche/score.js › POIDS',
      tableDe(POIDS)),

    section('Le score de conviction — bonus', 'src/recherche/score.js › BONUS', tableDe(BONUS)),
    section('Le score de conviction — malus', 'src/recherche/score.js › MALUS', tableDe(MALUS)),

    section('Le partage entre critères et élégance', 'src/recherche/score.js › PART_CRITERES',
      e('p.dbg__note', { texte: ecrireValeur(PART_CRITERES) })),

    section('Les réglages du score', 'src/recherche/score.js › REGLAGES', tableDe(REGLAGES)),
  ]);
}
