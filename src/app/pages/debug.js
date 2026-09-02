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
 *  ★ 1 bis. ET LE PLUS COURT NE SUFFIT PAS. « Les démos dans les lightbox sont
 *  trop alambiquées, elles ne montrent pas l'élément et rien que lui »
 *  (l'auteur). À profondeur égale, l'exemple retenu est donc celui qui SÉPARE
 *  le mieux l'opérateur de ses semblables, et, à égalité, le plus lisible —
 *  trois termes distincts plutôt qu'un ou vingt-deux. Voir la section
 *  « l'élément, et rien que lui ».
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
  CATALOGUE, PAR_ID, appliquer, operateursActifs, classerPourCible, CLASSES_CIBLE,
} from '../../moteur/catalogue.js';
import { lireCible, normaliserCible, MAX_CHIFFRES, TEXTE_DEFAUT } from '../../recherche/cible.js';
import { operateursExplorables, operateursPourCible } from '../../recherche/bfs.js';
import { depuisSaisie, signature } from '../../moteur/etat.js';
import {
  BAREME, NATURE, FICELLES, NOTE_MAX, bilanApproche, credit, facteur,
} from '../../recherche/elegance.js';
import {
  POIDS, BONUS, MALUS, PART_CRITERES, REGLAGES,
} from '../../recherche/score.js';
// La découpe en jetons est celle de la recherche, pas une seconde : une portée
// écrite ici et lue là-bas doit tomber sur les mêmes frontières.
import { tokeniser } from '../../recherche/fragments.js';
// `v` est aliasé : trois fonctions de rendu de ce fichier prennent une valeur
// nommée `v`, et un import du même nom s'y ferait masquer sans prévenir.
import { localiser, v as valeurTraduite, langue } from '../../i18n/index.js';
import { titreApproche, regleApproche } from '../libelles.js';
import { titreCourtDe } from '../../recherche/titres.js';
import { creerRegistre } from '../registre.js';
import { creerTransport, brancherClavier } from '../transport.js';
import { infobuller } from '../infobulle.js';
import * as pont from '../pont.js';
import { e, svg as s, vider, ajouter } from '../dom.js';

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

   Les suivantes comblent ce que la vitrine ne contient pas — un `www.`, des
   accents, une saisie de chiffres purs, des chiffres mêlés à des lettres,
   une adresse posée au milieu d'une phrase — parce que quelques filtres ne
   s'appliquent qu'à ça. Elles ne visent aucun opérateur en particulier : si
   demain un opérateur n'est jouable sur aucune d'elles, la lightbox l'écrira,
   et c'est ce constat-là qui appellera une saisie de plus.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ★ UNE SAISIE TÉMOIN PEUT DÉSIGNER UNE ZONE, ET PAS SEULEMENT UN TEXTE.
 *
 * « Je voudrais qu'il y ait des caractères supplémentaires avant et après la
 * zone dont on fait la moyenne, afin de mieux visualiser l'étape dans un
 * contexte lisible. Par exemple, tu peux partir de "avant 5 11 2 /après" pour
 * arriver à "avant 6 /après" » (l'auteur).
 *
 * Un programme joué sur la saisie ENTIÈRE consomme toute la ligne : au moment
 * où le geste s'exécute, il n'y a plus que ce qu'il transforme, et on ne voit
 * pas ce qu'il laisse tranquille. Or c'est justement là que se lit la portée
 * d'un opérateur — « ceci, et rien d'autre ». Un témoin peut donc s'écrire
 * `{ texte, zone }` : le programme ne s'applique qu'à la `zone`, le reste du
 * texte demeure de part et d'autre, et la lightbox montre le geste dans une
 * phrase plutôt que dans le vide.
 *
 * La zone est donnée EN TOUTES LETTRES, pas en indices de jetons : un
 * `{ offset: 2, longueur: 7 }` serait faux dès qu'on ajoute un mot au texte, et
 * personne ne le verrait. Elle est convertie en jetons ici (`porteeDe`), là où
 * le texte et sa découpe sont sous les yeux.
 */
/** Ce que les exemples du site ne montrent pas — et rien de plus. */
export const TEMOINS_COMPLEMENTAIRES = Object.freeze([
  'https://www.numérologie-évidente.fr/preuve',
  '2024',
  // ★ CHIFFRES ET LETTRES MÊLÉS, DANS LA MÊME SAISIE. « Ton exemple est mal
  //   choisi, il contient un espace mais pas de lettre ; "Les 7 nains" sera
  //   plus adapté » (l'auteur) : un filtre qui ne garde que les lettres ne
  //   démontre rien sur une saisie qui n'en contient que, ni sur une saisie qui
  //   n'en contient aucune. Il lui faut les deux matières à la fois, pour qu'on
  //   VOIE ce qui part et ce qui reste.
  'Les 7 nains',
  // La même adresse que la vitrine, mais AU MILIEU D'UNE PHRASE : ce qui se
  // joue dessus se joue sous les yeux de « voir » et de « demain », qui ne
  // bougent pas. C'est le seul témoin qui montre la frontière d'un geste.
  Object.freeze({ texte: 'voir https://reinfocovid.fr/ demain', zone: 'https://reinfocovid.fr/' }),
]);

/* ⚠️ CE QU'ON N'AJOUTE PAS ICI, ET POURQUOI : « voir 99922969 demain ».
   ─────────────────────────────────────────────────────────────────────────────
   « L'exemple pour `mr9` devrait être "voir 99922969 demain" » (l'auteur) — le
   demi-tour ayant deux formes depuis qu'il a absorbé les trios, il lui faut un
   état qui porte `999` d'affilée ET des 9 esseulés. La saisie le porte à l'œil.
   La ligne, elle, ne le portera jamais.

   MESURÉ, jusqu'à quatre étapes, sur la saisie seule puis sur la phrase
   entière : AUCUN état atteignable ne contient trois 9 contigus venus de ces
   chiffres-là. La cause n'est pas un plafond d'exploration, c'est le
   catalogue — **aucun opérateur ne lit un chiffre comme sa propre valeur.**
   `tca` fait de « 999 » trois jetons `9`, et les trente TOKENS→NUMS qui
   suivent CONVERTISSENT tous : `m7` compte les segments du glyphe (donc 6),
   `ma1` le rang de la lettre, `mt9` la touche… Un chiffre tapé n'entre dans la
   ligne que déguisé.

   C'est le même mur que sur `#c01111984!#`, qui « ne trouve rien » : une date
   de naissance est faite de chiffres, et les chiffres n'ont pas de porte.

   Le besoin est donc satisfait ailleurs, et mieux : `mr9` déclare lui-même ce
   que son exemple doit exercer (`exempleUtile`, `mappeurs.js`), et la page va
   chercher un état qui l'exerce vraiment — `tca+masb+mrd` sur « Capitalisme »
   rend `9 9 9 9 9 1 6 9 1 6 6 2 6 9 2`, où l'on voit du même coup le trio qui
   pivote, les deux 9 de trop qui ne le rejoignent pas, et les esseulés qui
   tournent sur eux-mêmes. */

/** Le texte d'un témoin, qu'il désigne une zone ou non. */
const texteDe = (t) => (typeof t === 'string' ? t : t && t.texte);

/** Les saisies témoins, dans l'ordre où elles seront essayées. */
export function saisiesTemoins() {
  return graines().map((g) => g.texte);
}

/**
 * La zone d'un témoin, traduite en portée de jetons — la forme qu'attendent
 * l'URL et le rejeu (`recherche/url.js`, `recherche/index.js`).
 *
 * Rend `null` quand la zone ne tombe pas sur des frontières de jetons : mieux
 * vaut un exemple sans contexte qu'un exemple dont la portée déborde.
 */
function porteeDe(texte, zone) {
  if (!zone) return null;
  const jetons = tokeniser(texte);
  const debut = jetons.findIndex((j) => j.offset === texte.indexOf(zone));
  if (debut < 0) return null;
  const fin = jetons.findIndex((j) => j.offset + j.longueur === texte.indexOf(zone) + zone.length);
  if (fin < debut) return null;
  return { offset: debut, longueur: fin - debut + 1 };
}

/**
 * Les graines de l'exploration : le texte joué, la portée éventuelle, et la
 * SAISIE sur laquelle le programme travaille vraiment — le texte entier, ou la
 * seule zone désignée. C'est cette dernière qui part en recherche : un
 * programme scopé ne voit rien d'autre.
 */
function graines() {
  const vitrine = valeurTraduite('accueil.exemples');
  const textes = (Array.isArray(vitrine) ? vitrine : [])
    .map((x) => (typeof x === 'string' ? x : x && x.texte))
    .filter((x) => typeof x === 'string' && x);
  const par = new Map();
  for (const t of [...textes, ...TEMOINS_COMPLEMENTAIRES]) {
    const texte = texteDe(t);
    if (!texte) continue;
    const portee = typeof t === 'string' ? null : porteeDe(texte, t.zone);
    const graine = { texte, portee, saisie: portee ? t.zone : texte };
    const vue = par.get(graine.saisie);
    // ★ MÊME SAISIE JOUÉE, UNE SEULE EXPLORATION — et c'est celle qui la montre
    //   en contexte qui reste. Deux témoins qui donnent le même texte au
    //   programme déplient exactement le même arbre : le second ne trouverait
    //   rien de plus, mais il consommerait la moitié du plafond de candidats et
    //   repousserait les autres témoins hors de portée. À état identique, le
    //   contexte est gratuit — il ne change pas ce qu'on démontre, seulement ce
    //   qu'on en voit autour.
    if (!vue) par.set(graine.saisie, graine);
    else if (!vue.portee && portee) par.set(graine.saisie, graine);
  }
  return [...par.values()];
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
/**
 * Plafond d'états explorés par saisie témoin : la page doit rester vive.
 *
 * ★ Il monte AVEC LE CATALOGUE, et pas d'un cran arbitraire. Chaque opérateur
 *   ajouté multiplie les états atteignables à profondeur égale ; à plafond
 *   constant, l'exploration s'arrête donc plus tôt dans l'arbre, et un
 *   opérateur qui avait son exemple hier ne l'a plus aujourd'hui — sans que
 *   rien n'ait changé pour LUI. C'est ce qui est arrivé à `m.retournerLesTrios`
 *   le jour où six filtres de rapprochement sont entrés au catalogue.
 */
export const NOEUDS_EXEMPLE = 4500;

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
  explorationMemo = graines().map((graine) => {
    const depart = depuisSaisie(graine.saisie);
    return {
      ...graine,
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

/* ─────────────────── « l'élément, et rien que lui » ──────────────────────
   ★ LE PLUS COURT NE SUFFIT PAS : ENCORE FAUT-IL QUE ÇA SE VOIE.

   « Les démos dans les lightbox sont trop alambiquées, elles ne montrent pas
   l'élément et rien que lui. […] c.maxMoinsMin, il te faudra au moins trois
   nombres différents, pour qu'on comprenne la différence avec une
   soustraction » (l'auteur).

   Le diagnostic était exact, et mesurable. Le premier état venu à la bonne
   profondeur était `[4,4,4,2]` — les longueurs des mots de
   `hope-hope-hope.fr` —, et sur ces quatre nombres-là DIX combinateurs n'en
   montrent que six résultats distincts : `c.min`, `c.alternee` et
   `c.maxMoinsMin` rendent tous 2, `c.max`, `c.moyenne` et `c.cardinal` rendent
   tous 4. Une démonstration qui ne sépare pas l'opérateur de ses voisins ne
   démontre rien.

   On garde donc le plus court — c'est ce qui évite l'approche interminable —
   mais, À PROFONDEUR ÉGALE, on prend l'état sur lequel l'opérateur se
   DISTINGUE le plus de ses semblables. « Semblables » n'est pas une liste
   écrite ici : ce sont les opérateurs actifs de même signature (`from` → `to`),
   lus du catalogue. Un opérateur ajouté demain entre tout seul dans la
   comparaison, et un exemple cesse tout seul d'être bon le jour où un voisin
   se met à lui ressembler.

   À discrimination égale, le plus lisible gagne : peu de termes, petits
   nombres, texte court. Et à lisibilité égale, l'ordre du parcours tranche,
   pour que deux ouvertures de la lightbox montrent la même chose.
   ────────────────────────────────────────────────────────────────────────── */

/** Combien d'états d'un même niveau on met en concurrence. Au-delà, le gain de
 *  discrimination est nul et la page s'alourdit pour rien. */
export const CANDIDATS_EXEMPLE = 60;

/** Les opérateurs actifs de même signature que `op`, lui excepté. */
function semblables(op) {
  return (amontParType().get(op.from) || [])
    .filter((autre) => autre.code !== op.code && autre.to === op.to);
}

/**
 * Combien de semblables l'état `etat` sépare de `op` : un semblable qui rend
 * autre chose — ou qui ne s'applique pas du tout — est un semblable écarté.
 */
function discrimination(op, etat, resultat) {
  const mien = signature(resultat);
  let n = 0;
  for (const autre of semblables(op)) {
    const sien = appliquer(autre, etat);
    if (sien === null || signature(sien) !== mien) n++;
  }
  return n;
}

/**
 * ★ COMBIEN DE TERMES DIFFÉRENTS IL FAUT POUR QUE ÇA SE VOIE. Trois.
 *
 * « c.maxMoinsMin, il te faudra au moins trois nombres différents, pour qu'on
 * comprenne la différence avec une soustraction » (l'auteur). Le chiffre vient
 * de là, et il se généralise sans qu'on ait à le redire opérateur par
 * opérateur : à deux termes, `max − min` et la soustraction ne diffèrent que
 * par un signe, et une addition à UN terme (`[11] → 11`) ne montre aucune
 * addition du tout. Trois termes distincts, c'est le minimum pour qu'un geste
 * sur une liste ait l'air d'un geste sur une liste.
 *
 * Ce n'est pas un plancher mais une CIBLE : on s'en écarte aussi peu que
 * possible, par en dessous comme par au-dessus. Vingt-deux nombres alignés ne
 * démontrent pas mieux que trois, ils fatiguent.
 */
export const TERMES_IDEAUX = 3;

/**
 * Le poids visuel d'un état : ce qu'il en coûte à l'œil de le lire.
 *
 * L'écart à la cible d'abord — c'est lui qui écarte `[11]` et
 * `[99,97,112,105,116,97,108,105,115,109,101]` du même mouvement —, puis
 * l'ampleur des nombres : `[9,6,2]` se lit d'un coup, `[1836,4,912]` non.
 *
 * ⚠️ Ce critère ne passe QU'APRÈS la discrimination. Les opérateurs qui ont
 * réellement besoin de matière — `m.plusFrequent` veut une fréquence,
 * `m.troisSixDAffilee` veut trois 6 d'affilée — ne se distinguent de leurs
 * semblables que sur une longue liste, et gardent donc la leur : c'est la
 * discrimination qui le décide, pas cette fonction.
 */
function encombrement(etat) {
  const v = etat.valeur;
  if (!Array.isArray(v)) return String(v).length;
  const distincts = new Set(v.map((x) => String(x))).size;
  const ecart = Math.abs(distincts - TERMES_IDEAUX);
  return ecart * 1000 + v.length * 10 + v.reduce((t, x) => t + String(x).length, 0);
}

/**
 * Le programme qui montre `op` le mieux : le plus court d'abord, puis le plus
 * démonstratif, puis le plus lisible.
 *
 * Le parcours va NIVEAU par niveau, toutes saisies confondues — et non saisie
 * par saisie : c'est ce qui garantit le plus court programme toutes saisies
 * confondues. Un filtre d'adresse se montre en un coup sur une URL ; il ne faut
 * pas aller le chercher en quatre coups ailleurs parce qu'une autre saisie
 * passait en premier.
 *
 * @param {Object} op un opérateur du catalogue
 * @returns {{saisie:string, codes:string[], distingue:number, semblables:number}|null}
 *   `null` = aucun exemple trouvé
 */
export function programmePour(op) {
  if (!op || !op.code) return null;
  const pistes = exploration();
  const rivaux = semblables(op).length;
  // Ce qu'on garderait faute de mieux — voir `exempleUtile` plus bas.
  const replis = [];
  for (let niveau = 0; niveau <= PROFONDEUR_EXEMPLE; niveau++) {
    deplierJusqua(niveau);
    let meilleur = null;
    let examines = 0;
    for (const p of pistes) {
      for (const noeud of p.niveaux[niveau] || []) {
        // Le type se compare avant de tenter : `appliquer` le referait, mais
        // après avoir construit un contexte pour rien.
        if (noeud.etat.type !== op.from) continue;
        const resultat = appliquer(op, noeud.etat);
        if (resultat === null) continue;
        // ★ **UN EXEMPLE QUI N'EXERCE PAS LE GESTE N'EN EST PAS UN.**
        //
        //   Le choix ci-dessous ne connaît que des CRITÈRES GÉNÉRIQUES — écarter
        //   les opérateurs voisins, ne pas encombrer la ligne. Ils suffisent tant
        //   que le geste est le même quelle que soit la valeur. Il ne l'est pas
        //   toujours : la table des restes ne DÉFILE qu'au-delà de sa fenêtre, et
        //   `pm10` sur 18 montrait deux rangées immobiles — un exemple juste, qui
        //   ne montrait pas ce que l'opérateur fait.
        //
        //   L'opérateur le dit donc lui-même (`exempleUtile`), comme il déclare
        //   déjà sa réglette, son décalage ou sa convention. C'est le seul qui
        //   sache ce que son geste exige ; cette page ne peut que l'écouter.
        //
        //   ⚠️ C'est une PRÉFÉRENCE, pas une exigence : si aucun état ne la
        //     satisfait à aucune profondeur, on rend quand même le meilleur des
        //     autres. Une page de debug qui n'affiche rien n'aide personne.
        if (typeof op.exempleUtile === 'function' && !op.exempleUtile(noeud.etat)) {
          if (!replis[niveau]) replis[niveau] = [];
          replis[niveau].push({
            saisie: p.saisie, texte: p.texte, portee: p.portee,
            codes: [...noeud.codes, op.code],
            distingue: discrimination(op, noeud.etat, resultat),
            semblables: rivaux,
            poids: encombrement(noeud.etat),
          });
          continue;
        }
        const candidat = {
          saisie: p.saisie,
          texte: p.texte,
          portee: p.portee,
          codes: [...noeud.codes, op.code],
          distingue: discrimination(op, noeud.etat, resultat),
          semblables: rivaux,
          poids: encombrement(noeud.etat),
        };
        // ★ ET À LISIBILITÉ ÉGALE, LE CONTEXTE TRANCHE. Deux exemples qui
        //   montrent exactement le même état ne se valent pas si l'un le montre
        //   seul au monde et l'autre au milieu d'une phrase : « des caractères
        //   supplémentaires avant et après la zone […] afin de mieux visualiser
        //   l'étape dans un contexte lisible » (l'auteur). Ce critère passe en
        //   DERNIER, après la discrimination et l'encombrement : du contexte ne
        //   rachète jamais une démonstration confuse ou illisible.
        if (!meilleur
          || candidat.distingue > meilleur.distingue
          || (candidat.distingue === meilleur.distingue && candidat.poids < meilleur.poids)
          || (candidat.distingue === meilleur.distingue && candidat.poids === meilleur.poids
            && candidat.portee && !meilleur.portee)) {
          meilleur = candidat;
        }
        // ⚠️ On NE s'arrête PAS au premier état qui écarte tous les semblables :
        // il en existe souvent plusieurs, et c'est justement entre eux que la
        // lisibilité départage. S'arrêter là rendait `m.redecoupageChoisi` sur
        // onze points de code — parfaitement discriminant, illisible.
        if (++examines >= CANDIDATS_EXEMPLE) break;
      }
      if (examines >= CANDIDATS_EXEMPLE) break;
    }
    if (meilleur) {
      delete meilleur.poids;
      return meilleur;
    }
  }
  // ★ LE REPLI — le meilleur de ceux que `exempleUtile` avait écartés, au
  //   niveau le plus court où il en existait un. On ne rend jamais rien plutôt
  //   qu'un exemple imparfait : la préférence de l'opérateur cède devant
  //   l'existence.
  for (const niveau of replis) {
    if (!niveau || !niveau.length) continue;
    let meilleur = null;
    for (const c of niveau) {
      if (!meilleur || c.distingue > meilleur.distingue
        || (c.distingue === meilleur.distingue && c.poids < meilleur.poids)) meilleur = c;
    }
    if (meilleur) { delete meilleur.poids; return meilleur; }
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

/**
 * ★ LE SIGNE VIENT MAINTENANT DE LA DÉCLARATION, ET LA MESURE DEVIENT UN
 *   CONTRÔLE CROISÉ — c'est un raccord entre deux chantiers menés en parallèle.
 *
 * Quand cette page a été écrite, `BAREME` était une liste de nombres tous
 * positifs et rien, de l'extérieur, ne permettait de distinguer un bonus d'un
 * malus sans réimplémenter le calcul. D'où la mesure ci-dessus : pousser chaque
 * palier et regarder où va le crédit. C'était la seule voie honnête.
 *
 * Entre-temps, `elegance.js` a gagné `NATURE`, qui DÉCLARE pour chaque poste son
 * signe et sa famille — et `elegance.test.js` recoupe cette déclaration avec ce
 * que le crédit applique réellement, sur des bilans réels. Le contrôle croisé
 * existe donc déjà, à l'endroit où il doit être : dans les tests du barème.
 *
 * La page lit désormais la déclaration. Elle y gagne deux choses :
 *   · elle ne fait plus tourner le moteur de recherche au chargement — la mesure
 *     coûtait plus d'une seconde de processeur, et l'a rendue coûteuse à tester ;
 *   · elle dit la même chose que le barème PAR CONSTRUCTION, au lieu de le
 *     redécouvrir par l'expérience et de risquer d'en différer.
 *
 * ⚠ Ce n'est pas un retour à la table recopiée que l'auteur interdit : `NATURE`
 * est lue, jamais dupliquée, et un poste ajouté sans y être déclaré fait rougir
 * `elegance.test.js`. `mesurerLesPaliers` reste exportée : c'est l'instrument du
 * contrôle croisé, et le jour où l'on doutera de `NATURE`, il est là.
 */
export function sensDesPaliers() {
  if (sensMemo) return sensMemo;
  const paliers = new Map();
  const SIGNE = { 1: '+', '-1': '−', 0: '·' };
  for (const cle of Object.keys(BAREME)) {
    const n = NATURE[cle];
    paliers.set(cle, n ? { sens: SIGNE[n.sens], famille: n.famille, declare: true } : null);
  }
  sensMemo = { mesurable: true, raison: null, temoins: 0, declare: true, paliers };
  return sensMemo;
}

/* ══════════════════ Les opérateurs face à la CIBLE ════════════════════════
   « Quels opérateurs sont compatibles avec autre chose que 6 comme cible et
    lesquels ne le sont pas ? Lesquels peux-tu adapter, lesquels faut-il
    désactiver quand la cible est différente ? (et ça doit apparaître dans
    debug.html) » (l'auteur)

   ★ **RIEN N'EST RECOPIÉ ICI, PAS MÊME LES TROIS NOMS DE CLASSES.** La classe
   d'un opérateur se calcule en lui MONTRANT la cible (`catalogue.js ›
   classerPourCible`), et cette page ne fait que rendre le résultat. Une table
   « ces cinq-là sont liés à 666 » serait exactement la faute que le canal
   `viser` vient de corriger dans `bfs.js` : elle mentirait au premier opérateur
   ajouté, et cette page est justement celle qui devrait le voir.

   ★ **ET LE CHANGEMENT DE CIBLE SE VOIT.** Un champ, dix chiffres au plus, et
   la page se relit : les compteurs, la colonne « cible » des deux tableaux
   d'opérateurs et la RÈGLE de chacun. C'est le seul moyen de vérifier ce que
   §0.3 exige — qu'un opérateur adapté annonce ce qu'il fera, et non ce qu'il
   faisait en visant 666. */

/**
 * Ce que chaque classe raconte, en une phrase.
 *
 * ⚠️ C'est la seule chose de cette section qui soit ÉCRITE et non calculée, et
 * il faut savoir pourquoi on l'accepte : une phrase française n'est pas
 * dérivable d'un identifiant. Le garde-fou est ailleurs — l'ORDRE et
 * l'EXISTENCE des classes viennent de `CLASSES_CIBLE`, et un test exige qu'il
 * n'en manque aucune ici. Une quatrième classe ajoutée demain fera donc rougir
 * la CI au lieu de disparaître de la page en silence.
 */
const DIT_LA_CLASSE = Object.freeze({
  INDIFFERENT: 'ne peut pas lire la cible — sa règle ne la consulte jamais',
  ADAPTE: 'lit la cible, et sa règle s’y transpose',
  DESACTIVE: 'lit la cible, et sa règle n’a pas de sens pour celle-ci',
});

/** Exporté pour le test qui recoupe cette table contre `CLASSES_CIBLE`. */
export const PHRASES_DE_CLASSE = DIT_LA_CLASSE;

/** La cible affichée par la page, et ceux qui veulent le savoir quand elle change. */
const cibleAffichee = { texte: TEXTE_DEFAUT };
const abonnesCible = new Set();

function changerLaCible(texte) {
  const c = lireCible(texte);
  if (!c) return false;
  cibleAffichee.texte = c.texte;
  for (const redessiner of abonnesCible) redessiner(c);
  return true;
}

/** S'abonne, et se dessine tout de suite : un abonné n'attend pas un changement. */
function suivreLaCible(redessiner) {
  abonnesCible.add(redessiner);
  redessiner(normaliserCible(cibleAffichee.texte));
}

/**
 * Le champ de cible. Filtré au clavier comme celui de la page de liste : ce qui
 * en sort est une suite de chiffres, ou n'en sort pas (`cible.js › lireCible`,
 * « aucune tolérance, et c'est délibéré »).
 */
function champDeCible() {
  const champ = e('input.dbg__cible-champ', {
    type: 'text',
    inputmode: 'numeric',
    id: 'dbg-cible',
    value: cibleAffichee.texte,
    maxlength: MAX_CHIFFRES,
    'aria-describedby': 'dbg-cible-aide',
  });
  champ.addEventListener('input', () => {
    const propre = champ.value.replace(/[^0-9]/g, '').slice(0, MAX_CHIFFRES);
    if (propre !== champ.value) champ.value = propre;
    changerLaCible(propre || TEXTE_DEFAUT);
  });
  return e('p.dbg__cible-barre', {}, [
    e('label', { for: 'dbg-cible', texte: 'Cible visée : ' }),
    champ,
    ' ',
    e('span.dbg__note#dbg-cible-aide', {
      texte: `une suite de chiffres, ${MAX_CHIFFRES} au plus ; vide vaut ${TEXTE_DEFAUT}.`,
    }),
  ]);
}

/**
 * Le relevé complet : combien d'opérateurs dans chaque classe, et le détail de
 * ceux qui LISENT la cible — les seuls dont la réponse dépende d'elle.
 *
 * ★ Les indifférents ne sont pas détaillés ici, et ce n'est pas un oubli : ils
 *   sont détaillés dans les deux grands tableaux, colonne « cible », où chaque
 *   opérateur du catalogue porte sa classe. Les lister une seconde fois par
 *   dizaines n'apprendrait rien de plus que le compte.
 */
function sectionFaceALaCible() {
  const resume = e('p.dbg__note');
  const corps = e('tbody');
  const explorables = e('p.dbg__note');

  suivreLaCible((cible) => {
    // `source` est l'opérateur du catalogue, `vise` celui qu'on jouerait pour
    // cette cible — le même objet quand la cible ne change rien, `null` quand
    // l'opérateur se désactive. Les deux sont nommés : les confondre, c'est
    // afficher la règle d'hier au-dessus de la classe d'aujourd'hui.
    const classes = CATALOGUE.map((source) => {
      const { classe, op: vise, litLaCible } = classerPourCible(source, cible.texte);
      return { source, vise, classe, litLaCible };
    });
    const compte = (c) => classes.filter((x) => x.classe === c).length;
    resume.textContent = CLASSES_CIBLE
      .map((c) => `${c.toLowerCase()} : ${compte(c)}`).join('  ·  ')
      + `  —  sur ${CATALOGUE.length} opérateurs du catalogue.`;

    // ★ Le compte des EXPLORABLES vient de `bfs.js`, pas d'un filtre réécrit
    //   ici : c'est lui qui décide de ce que la recherche voit, et un second
    //   comptage divergerait au premier changement de règle.
    const tous = operateursExplorables(CATALOGUE).length;
    const pour = operateursPourCible(CATALOGUE, cible).length;
    explorables.textContent = `La recherche explore ${pour} opérateurs sur ${tous} `
      + `en visant ${cible.texte}${pour === tous ? ' — aucun n’est écarté.' : '.'}`;

    vider(corps);
    for (const x of classes) {
      if (!x.litLaCible) continue;
      // La règle MONTRÉE est celle de l'opérateur VISÉ — ce qui sera réellement
      // joué —, et non celle du catalogue (CONTRACTS §0.3). Un opérateur
      // désactivé n'a plus de règle à montrer : on dit pourquoi, pas ce qu'il
      // aurait fait.
      ajouter(corps, e(`tr.dbg__cible-${x.classe.toLowerCase()}`, {}, [
        e('th.dbg__code', { scope: 'row', texte: x.source.code }),
        e('td', { texte: x.classe.toLowerCase() }),
        e('td', {
          texte: x.vise ? localiser(x.vise.regle) : DIT_LA_CLASSE.DESACTIVE,
        }),
      ]));
    }
  });

  return section('Les opérateurs face à la cible',
    'moteur/catalogue.js › classerPourCible · recherche/bfs.js › operateursPourCible',
    e('p.dbg__note', {
      texte: 'Classement CALCULÉ, jamais recopié : on montre la cible à chaque opérateur '
        + 'et l’on regarde ce qu’il en fait. Un opérateur sans canal `viser` ne PEUT pas '
        + 'la lire — c’est ce qui rend « indifférent » vérifiable plutôt que promis. '
        + CLASSES_CIBLE.map((c) => `${c.toLowerCase()} : ${DIT_LA_CLASSE[c]}`).join(' · ') + '.',
    }),
    champDeCible(),
    resume,
    explorables,
    e('table.dbg__table.dbg__table--large', {}, [
      e('thead', {}, [e('tr', {}, ['code', 'classe', 'règle appliquée pour cette cible']
        .map((c, i) => e(`th${i === 0 ? '.dbg__code' : ''}`, { scope: 'col', texte: c })))]),
      corps,
    ]));
}

/* ═════════════════════════ Le catalogue, mesuré ═══════════════════════════ */

/** ★ **UNE COLONNE N'EN EST UNE QUE SI TOUT LE MONDE LA REMPLIT.**
 *
 *  Le tableau portait UNE colonne par champ rencontré dans le catalogue —
 *  quarante et une —, dont la plupart vides sur presque toutes les lignes :
 *  `familles` est renseigné par 1 opérateur sur 144, `designe` par 1, `doubles`
 *  par 2. On lisait donc un damier.
 *
 *  Le partage se MESURE, il ne se choisit pas : huit champs sont remplis par
 *  les 144 opérateurs, et le suivant tombe à 32. Ceux-là restent des colonnes ;
 *  tout le reste se replie dans une seule case, où chaque particularité arrive
 *  précédée de son nom. Un champ ajouté demain au catalogue apparaîtra donc
 *  encore — dans les particularités s'il est rare, en colonne s'il est
 *  universel — au lieu d'être ignoré en silence.
 *
 *  ⚠️ `cout` en est SORTI, et c'est ce qu'il y avait à en apprendre : il vaut
 *    1 pour les 144 opérateurs, sans exception. Le coût d'un chemin
 *    (`bfs.js › prolonger`) est donc exactement son NOMBRE D'ÉTAPES, et rien
 *    d'autre — un fait qui mérite d'être écrit une fois ici plutôt qu'une
 *    colonne de 144 fois « 1 ». Le champ reste au catalogue, où `bfs.js`
 *    l'additionne ; il a cessé d'être une information à afficher.
 */
/**
 * ★ **LE TITRE DU REGISTRE — celui qui s'affiche, pas celui du catalogue.**
 *
 * > « Il y a des opérateurs dont le titre tient déjà en 2 mots. Ajoute à la page
 * >   debug une colonne titre registre, je vais voir s'il y a besoin d'ajouter
 * >   titre court, ou si l'actuel fait le job. » (l'auteur)
 *
 * ⚠️ **CE N'EST PAS `op.libelle`, ET LA DIFFÉRENCE EST MESURÉE.** Sur 113
 *   opérateurs éprouvés, TREIZE affichent dans Le Registre autre chose que leur
 *   libellé — `cs` est intitulé « On additionne » au catalogue et « On
 *   additionne les nombres » à l'écran, `mrd` annonce son premier temps (« On
 *   écrit chaque nombre chiffre à chiffre ») et non son geste d'ensemble.
 *   Afficher le libellé sous le nom de « titre registre » aurait donc fait juger
 *   l'auteur sur une chaîne que personne ne lit.
 *
 * ★ **ET IL N'EST PAS CONSTANT.** Plusieurs opérateurs accordent leur titre à ce
 *   que la ligne porte — « on additionne les CHIFFRES » ou « les NOMBRES »,
 *   selon (`combinateurs.js › natureOperandes`). Il n'existe donc pas UN titre
 *   par opérateur : il en existe un par situation. On en montre un vrai,
 *   fabriqué en jouant l'opérateur sur l'état le plus simple qu'il accepte —
 *   c'est ce que le visiteur verra le plus souvent, et c'est mesuré plutôt que
 *   décrété.
 *
 * ★ Le COMPTE DE MOTS accompagne le titre, parce que c'est la question posée :
 *   « deux mots, ou pas ». Le lire d'un coup d'œil sur cent quarante-huit lignes
 *   est tout l'objet de la colonne.
 */
const ETATS_TEMOINS = [
  { type: 'STR', valeur: 'Donald Trump', traces: [[0, 12]] },
  { type: 'TOKENS', valeur: [...'hope'], traces: [...'hope'].map((_, i) => [[i, i + 1]]) },
  { type: 'NUMS', valeur: [8, 15, 16, 5], traces: [0, 1, 2, 3].map((i) => [[i, i + 1]]) },
  { type: 'NUM', valeur: 44, traces: [[0, 2]] },
];

export function titreRegistreDe(op) {
  if (!op || typeof op.steps !== 'function') return null;
  for (const avant of ETATS_TEMOINS) {
    if (op.from !== avant.type) continue;
    let apres;
    try { apres = op.apply(avant.valeur, avant.traces); } catch { continue; }
    if (!apres) continue;
    const ids = (Array.isArray(avant.valeur) ? avant.valeur : [avant.valeur]).map((_, i) => `t${i}`);
    let steps;
    try {
      // ★ La langue de l'INTERFACE, jamais une constante écrite ici : le titre
      //   montré doit être celui que le visiteur lira. Et « fr » écrit en dur
      //   est aussi un code d'opérateur — le garde-fou de cette page l'attrape,
      //   à juste titre.
      steps = op.steps(avant, { type: op.to, ...apres }, { ids, cle: 'dbg', langue: langue() });
    } catch { continue; }
    if (steps && steps.length && steps[0].title) return String(steps[0].title);
  }
  return null;
}

/**
 * Le compte de SIGNES d'un titre.
 *
 * > « Pas besoin de préciser le nombre de mots devant le titre, je m'en aperçois
 * >   bien. À la limite le nombre de caractères serait plus utile. » (l'auteur)
 *
 * Il a raison, et pas seulement par économie : deux mots ne disent rien de la
 * PLACE que le titre prendra. « Modulo 9 » et « Numérologie chaldéenne » en font
 * deux tous les deux, et vingt-trois signes d'écart — or c'est la largeur qui
 * décide si l'énumération d'une carte tient sur sa ligne. Le compte de mots, lui,
 * se lit d'un coup d'œil sur le titre : l'afficher revenait à commenter ce qui
 * est déjà sous les yeux.
 */
const signesDe = (titre) => (titre ? [...titre.trim()].length : 0);

const EN_TETE = ['code', 'id', 'famille', 'from', 'to', 'notoriete', 'adHoc'];

/** Les champs que l'affichage traite lui-même, ou qui n'ont rien à montrer. */
const HORS_TABLEAU = new Set([...EN_TETE, 'cout', 'libelle', 'regle', 'apply', 'steps',
  'sortie', 'deprecated', 'isJoker', 'actifParDefaut']);

/**
 * Les particularités d'un opérateur : tout ce qui n'est ni universel ni traité
 * ailleurs, chacune précédée de son nom.
 */
function particularitesDe(op) {
  const out = [];
  for (const cle of Object.keys(op).sort()) {
    if (HORS_TABLEAU.has(cle)) continue;
    const v = op[cle];
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v) && !v.length) continue;
    out.push({ cle, valeur: apercu(v) });
  }
  if (FICELLES[op.id]) out.unshift({ cle: 'ficelle', valeur: FICELLES[op.id] });
  return out;
}

/** L'état d'un opérateur, ou `null` s'il est simplement actif. */
function etatDe(op) {
  const etats = [];
  if (op.deprecated) etats.push('déprécié');
  if (op.isJoker) etats.push('joker');
  if (op.actifParDefaut === false) etats.push('inactif par défaut');
  return etats.length ? etats.join(' · ') : null;
}

/**
 * ★ **DEUX TABLEAUX, PARCE QUE CE SONT DEUX POPULATIONS.**
 *
 * « Fais un tableau avec les opérateurs actifs et un avec ceux
 * dépréciés/désactivés » (l'auteur). Les seconds ne concourent pas : ils ne
 * sortent d'aucune recherche (`bfs.js` les filtre) et ne se jouent que d'ici.
 * Les mêler aux premiers, c'était laisser croire que la liste des voies
 * possibles les contient.
 *
 * ★ Et la colonne `code` PASSE EN TÊTE, devant le bouton. L'auteur l'autorise
 *   — « tu peux inverser la colonne code et la colonne jouer si c'est plus
 *   simple pour épingler la colonne CODE » — et c'est en effet ce qui la rend
 *   épinglable sans arithmétique de largeurs : une colonne collée à gauche doit
 *   être la première, sinon il faut connaître la largeur de celles qui la
 *   précèdent, laquelle dépend du contenu.
 */
function tableauDesOperateurs(ops, avecEtat) {
  /* ★ **L'ORDRE DEMANDÉ : code, titre registre, titre court, jouer, puis le
     reste.** C'est celui du travail en cours — l'auteur relit les titres courts
     en les comparant à ceux du Registre, et veut les deux à portée de regard,
     juste après la colonne épinglée. Le bouton « jouer » et l'identifiant, qui
     servaient d'ancrage tant que les titres n'existaient pas, reculent derrière
     eux. */
  const colonnes = ['code', 'titre registre', 'titre court', 'jouer',
    ...EN_TETE.slice(1), 'cible', ...(avecEtat ? ['état'] : []), 'particularités'];

  const lignes = [...ops]
    .sort((a, b) => String(a.code).localeCompare(String(b.code), 'en'))
    .map((op) => {
      const parts = particularitesDe(op);
      // ★ LA COLONNE « CIBLE » SE REDESSINE AVEC LE CHAMP. C'est ce que l'auteur
      //   demande — « qu'on puisse voir l'effet d'un changement de cible ». Elle
      //   n'est pas calculée une fois au montage : elle s'abonne, et une cible
      //   tapée plus haut la met à jour ligne par ligne.
      const cellCible = e('td.dbg__cible-classe');
      suivreLaCible((cible) => {
        const { classe } = classerPourCible(op, cible.texte);
        cellCible.textContent = classe.toLowerCase();
        cellCible.className = `dbg__cible-classe dbg__cible-${classe.toLowerCase()}`;
      });
      const cellules = colonnes.slice(1).map((c) => {
        if (c === 'jouer') return e('td.dbg__jouer-cellule', {}, [boutonJouer(op)]);
        if (c === 'titre court') {
          // ★ La colonne que l'auteur vient corriger : deux mots, ou le trou qui
          //   se voit. Voir `titres.js › TITRES_COURTS` pour le pourquoi de la
          //   table, et pourquoi elle ne remplace pas le titre du Registre.
          const bref = localiser(titreCourtDe(op));
          return e('td.dbg__titre-court', {}, bref
            ? [e('span.dbg__titre-mots', { texte: String(signesDe(bref)) }), ' ', e('span', { texte: bref })]
            : [e('span.dbg__part-cle', { texte: '— manquant' })]);
        }
        if (c === 'titre registre') {
          const titre = titreRegistreDe(op);
          const n = signesDe(titre);
          return e('td.dbg__titre-registre', {}, titre
            ? [
              e('span.dbg__titre-mots', { texte: String(n) }),
              ' ',
              e('span', { texte: titre }),
            ]
            : [e('span.dbg__part-cle', { texte: '—' })]);
        }
        if (c === 'cible') return cellCible;
        if (c === 'état') return e('td', { texte: etatDe(op) || '' });
        if (c === 'particularités') {
          return e('td.dbg__particularites', {}, parts.map((x) => e('span.dbg__part', {}, [
            e('span.dbg__part-cle', { texte: x.cle }),
            ' ',
            e('span.dbg__part-val', { texte: x.valeur }),
          ])));
        }
        return e('td', { texte: apercu(op[c]) });
      });
      return e(`tr${FICELLES[op.id] ? '.dbg__ficelle' : ''}`, {}, [
        // `code` d'abord — c'est la colonne épinglée (voir l'en-tête).
        e('th.dbg__code', { scope: 'row', texte: op.code }),
        ...cellules,
      ]);
    });

  return e('table.dbg__table.dbg__table--large.dbg__table--collante', {}, [
    e('thead', {}, [e('tr', {}, colonnes
      .map((c, i) => e(`th${i === 0 ? '.dbg__code' : ''}`, { scope: 'col', texte: c })))]),
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

  // Le texte joué est celui du témoin ; la PORTÉE dit sur quelle part de ce
  // texte le programme s'applique. Sans portée, les deux se confondent — et
  // c'est le cas de la plupart des témoins.
  const hash = pont.ecrireHash({
    saisie: prog.texte || prog.saisie,
    fragments: [{ portee: prog.portee || null, resonance: null, codes: prog.codes }],
    registre,
  });
  if (!hash) return { echec: 'url', prog };
  const lecture = pont.lireHash(hash);
  const rejeu = lecture ? pont.rejouer(lecture) : null;
  if (!rejeu || !rejeu.ok) return { echec: 'rejeu', prog, hash, raison: rejeu && rejeu.raison };

  const { scenario, source } = pont.scenarioDe(rejeu.approche, prog.texte || prog.saisie, {
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
  // ★ ON NE JOUE QUE L'ÉTAPE DÉCRITE — pas ce qui la précède, pas ce qui la
  //   suit. Le programme d'exemple porte des transformations d'approche parce
  //   qu'il faut bien AMENER l'opérateur à s'appliquer, et le scénario finit
  //   par la récolte et le verdict parce que c'est ce que fait une
  //   démonstration ; mais cette page-ci ne pose qu'une question — de quoi cet
  //   opérateur a-t-il l'air à l'écran ? Le reste est du contexte qui répond à
  //   côté. Voir `cadrerSurLOperateur`.
  const cadrage = cadrerSurLOperateur(lecteur, d.scenario, op);
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
    e('p.dbg__note', { texte: cadrage.note }),
    registreVue.element,
    registreVue.regionLive,
    d.source === 'secours' || sourceLecteur === 'secours'
      ? e('p.dbg__alerte', { texte: '△ Repli : le moteur n’a pas rendu la vraie scène.' })
      : null,
  ]);

  return {
    element,
    detruire() {
      cadrage.detacher();
      detacherClavier();
      registreVue.detruire();
      transport.detruire();
      if (typeof lecteur.destroy === 'function') lecteur.destroy();
    },
  };
}

/**
 * Cale la lecture sur les SEULS steps que l'opérateur a produits : on part de
 * son premier et on s'arrête à la fin de son dernier.
 *
 * ★ La provenance est LUE, pas devinée. Chaque step porte le code de
 *   l'opérateur qui l'a émis (`recherche/scenario.js › produire`) ; recouper
 *   les titres à la place serait une table de correspondance recopiée, et elle
 *   se tromperait au premier libellé retouché. Un step sans code — le verdict,
 *   la récolte, une retouche — n'appartient à aucun opérateur, et c'est
 *   exactement ce qu'on veut écarter.
 *
 * ★ Le reste de la timeline n'est pas COUPÉ, seulement dépassé. Les commandes
 *   de transport y donnent toujours accès, et l'arrêt automatique ne joue
 *   qu'une fois : qui relance après la borne veut manifestement voir la suite,
 *   et un bouton qui se remettrait en pause tout seul passerait pour cassé.
 */
function cadrerSurLOperateur(lecteur, scenario, op) {
  // Les steps du SCÉNARIO portent la provenance ; ceux de la TIMELINE portent
  // les temps. On passe de l'un à l'autre par l'id, jamais par l'indice : c'est
  // la seule jointure que le moteur visuel garantit (CONTRACTS §3.3).
  const marques = new Set(
    ((scenario && scenario.steps) || []).filter((s) => s.code === op.code).map((s) => s.id),
  );
  const joues = (typeof lecteur.steps === 'object' && lecteur.steps) || [];
  const total = joues.length;
  let debut = -1;
  let fin = -1;
  for (let i = 0; i < total; i++) {
    if (!marques.has(joues[i].id)) continue;
    if (debut < 0) debut = i;
    fin = i;
  }
  if (debut < 0 || typeof lecteur.seekToStep !== 'function') {
    return {
      // ★ « Aucun step » n'est pas une panne : certains opérateurs ne CHANGENT
      //   rien de visible — `tca` découpe en caractères une ligne déjà rendue
      //   caractère par caractère —, et le scénario refuse alors d'émettre une
      //   étape qui ne montrerait rien (`scenario.js › rienAMontrer`). C'est un
      //   RÉSULTAT de mesure, pas un incident, et il mérite d'être écrit.
      note: marques.size === 0
        ? `△ « ${op.code} » n’émet aucune étape : il ne déplace rien à l’écran. `
          + `La scène est jouée en entier (${total} étapes).`
        : `△ Lecteur sans navigation par étape : la scène est jouée en entier (${total} étapes).`,
      detacher() {},
    };
  }

  const borne = joues[fin].t1;
  let arrete = false;
  lecteur.seekToStep(debut);
  const detacher = lecteur.on('change', () => {
    if (arrete || !lecteur.playing) return;
    if (lecteur.currentTime < borne) return;
    arrete = true;
    lecteur.pause();
    // Recaler exactement : la frame qui a franchi la borne l'a dépassée, et on
    // veut l'état de fin d'étape, pas le début de la suivante.
    lecteur.seek(borne);
  });

  const nombre = fin - debut + 1;
  return {
    note: `Étape isolée : ${nombre === 1 ? `l’étape ${debut + 1}` : `les étapes ${debut + 1} à ${fin + 1}`} `
        + `sur ${total} — l’approche et le verdict restent joignables par les commandes.`,
    detacher,
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
  // ★ La partition vient du CATALOGUE lui-même — `operateursActifs`, déjà
  //   importé —, jamais d'un prédicat réécrit ici. La règle « ni déprécié, ni
  //   joker, ni inactif par défaut » vit à un seul endroit ; en tenir une copie
  //   dans une page de debug, c'est fabriquer la seconde vérité qui dérivera au
  //   premier ajout, et cette page-là est justement celle qui devrait le voir.
  const ACTIFS = operateursActifs();
  const dansLeJeu = new Set(ACTIFS.map((o) => o.id));
  const HORS_JEU = CATALOGUE.filter((op) => !dansLeJeu.has(op.id));
  const parFamille = new Map();
  for (const op of ACTIFS) parFamille.set(op.famille, (parFamille.get(op.famille) || 0) + 1);

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

    // ★ AVANT les deux grands tableaux, parce que c'est LUI qui commande leur
    //   colonne « cible » : on lit d'abord ce qu'on vise, ensuite ce que chacun
    //   en fait.
    sectionFaceALaCible(),

    section(`Les opérateurs actifs (${ACTIFS.length})`,
      'src/moteur/catalogue.js · src/moteur/transformations/',
      e('p.dbg__note', {
        texte: [...parFamille.entries()].sort()
          .map(([f, n]) => `${f} : ${n}`).join('  ·  '),
      }),
      tableauDesOperateurs(ACTIFS, false)),

    section(`Les opérateurs hors recherche (${HORS_JEU.length})`,
      'catalogue.js — dépréciés, jokers, inactifs par défaut',
      e('p.dbg__note', {
        texte: 'Ils sont au catalogue et se jouent d’ici, mais aucune recherche ne '
          + 'les propose : `recherche/bfs.js` les écarte avant d’explorer. Un code '
          + 'déprécié reste réservé — on ne raye pas du registre (§4.1).',
      }),
      tableauDesOperateurs(HORS_JEU, true)),

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
