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
 */

import { CATALOGUE, PAR_ID } from '../../moteur/catalogue.js';
import { BAREME, FICELLES, NOTE_MAX } from '../../recherche/elegance.js';
import {
  POIDS, BONUS, MALUS, PART_CRITERES, REGLAGES,
} from '../../recherche/score.js';
import { e } from '../dom.js';

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
      return e(`tr${FICELLES[op.id] ? '.dbg__ficelle' : ''}`, {},
        cellules.map((t, i) => e(i === 0 ? 'th.dbg__code' : 'td', {
          texte: t, ...(i === 0 ? { scope: 'row' } : {}),
        })));
    });

  return e('table.dbg__table.dbg__table--large', {}, [
    e('thead', {}, [e('tr', {}, colonnes.map((c) => e('th', { scope: 'col', texte: c })))]),
    e('tbody', {}, lignes),
  ]);
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
  const lignes = [];
  for (const [cle, valeur] of Object.entries(BAREME)) {
    const nom = cle.toLowerCase().replace(/_/g, '');
    const palier = [...alimentes].find((p) => p.toLowerCase() === nom);
    if (!palier && !nom.includes('sansmotif')) continue;
    const ids = parPalier.get(palier) || [];
    lignes.push(e(`tr${ids.length ? '' : '.dbg__dort'}`, {}, [
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
      e('thead', {}, [e('tr', {}, ['palier', 'tarif', 'alimenté par']
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
           + 'pourquoi.',
    }),

    section(`Les opérateurs (${CATALOGUE.length})`,
      'src/moteur/catalogue.js · src/moteur/transformations/',
      e('p.dbg__note', {
        texte: [...parFamille.entries()].sort()
          .map(([f, n]) => `${f} : ${n}`).join('  ·  '),
      }),
      tableauDesOperateurs()),

    section('Le crédit d’élégance', 'src/recherche/elegance.js › BAREME',
      e('p.dbg__note', { texte: `Note maximale : ${NOTE_MAX}` }),
      tableDe(BAREME)),

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
