/**
 * ★ **CE QU'ON PEUT LAISSER DE CÔTÉ SANS MENTIR — et à quelle condition.**
 *
 * > « Ignorer un mot (non couvert) → grave. Ignorer un petit mot de liaison →
 * >   pas grave (`de`, `les`, `.fr`…). Mais entre `hope` et `avec`, ou `age` et
 * >   `les`, ce n'est pas le nombre de caractères qui distingue, c'est un
 * >   dictionnaire grammatical. Ne jamais écarter un nom ou un mot rare, alors
 * >   qu'ignorer un mot extrêmement commun est moins grave. »
 * >
 * > « Cependant chaque suppression doit être justifiée par une règle : on ne
 * >   peut pas supprimer `le` mais garder `la`. On peut en revanche supprimer
 * >   `le` et `la` mais garder `est` et `par` — globalement ça voudrait dire
 * >   une règle pour supprimer les articles, une pour les `par` et compagnie,
 * >   une pour les verbes génériques peu signifiants (être et avoir), une pour
 * >   les TLD, une pour les protocoles… bref, il faut une justification. »
 * >   (l'auteur)
 *
 * Deux exigences, et la seconde est la plus importante.
 *
 * **1. Une CLASSE, pas une longueur.** `age` fait trois lettres et `avec` en
 * fait quatre ; le premier est un nom, le second une préposition. Aucune mesure
 * de taille ne les sépare — seule une liste le fait. Les classes ci-dessous
 * sont donc FERMÉES et écrites à la main : ce sont des inventaires de langue,
 * pas des heuristiques. Un mot absent de toutes est traité comme un nom, c'est-
 * à-dire au plein tarif : l'ignorance par défaut penche du côté sévère.
 *
 * **2. Une RÈGLE, pas un choix.** Écarter `le` en gardant `la` n'est pas une
 * règle, c'est un arrangement — et c'est exactement ce que tout le site reproche
 * aux numérologues. La justification se VÉRIFIE donc : une classe n'excuse un
 * abandon que si TOUS ses membres présents dans la saisie sont abandonnés. « Le
 * chat mange la souris » peut perdre `le` et `la` ; il ne peut pas perdre `le`
 * seul. Et les classes se justifient une par une : perdre les articles n'excuse
 * pas de perdre aussi `est`.
 *
 * ⚠️ **AUCUNE DÉTECTION DE LANGUE.** Les deux lexiques sont consultés ensemble.
 *   Deviner la langue d'une saisie de trois mots serait une source d'erreur de
 *   plus, et le site accepte les deux — « Le chat dort sur le tapis rouge »
 *   comme « hope-hope-hope.fr ». Un mot qui est outil dans l'une des deux
 *   langues l'est ici.
 *
 * ⚠️ **CE FICHIER EST DU CÔTÉ MOTEUR, ET IL LE FAUT.** Il a d'abord vécu dans
 *   `src/recherche/`, où seul le barème le lisait. Depuis que quatre filtres
 *   l'emploient — `f.articles`, `f.prepositions`, `f.conjonctions`,
 *   `f.auxiliaires` —, il doit être ici : le moteur ne dépend jamais de la
 *   recherche, l'inverse est permis (CONTRACTS §1). Les deux côtés lisent donc
 *   le MÊME inventaire, et un mot ne peut pas être outil pour l'opérateur et
 *   plein pour le barème.
 *
 * ⚠️ **DÉTERMINISME (§4.4).** Listes gelées, comparaison sur une forme
 *   normalisée sans `localeCompare` : minuscules ASCII et diacritiques
 *   retirés, pour que `À` et `a` tombent au même endroit à chaque exécution et
 *   sur toute machine.
 */

/** Minuscule sans diacritique — la forme sous laquelle on compare les mots. */
export function formeNue(mot) {
  return String(mot).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* ── LES CLASSES ────────────────────────────────────────────────────────────
 *
 * Chacune porte son nom affichable : c'est la RÈGLE que le lecteur verra, et
 * elle doit se lire comme une phrase — « les articles », « les prépositions ».
 * Une classe dont on ne saurait pas énoncer la règle n'a rien à faire ici.
 */

const ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux',
  'ce', 'cet', 'cette', 'ces', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];

const PREPOSITIONS = ['a', 'de', 'par', 'pour', 'en', 'dans', 'sur', 'sous', 'avec', 'sans',
  'chez', 'vers', 'entre', 'contre', 'depuis', 'pendant', 'apres', 'avant', 'jusque', 'jusqu',
  'selon', 'malgre', 'parmi', 'envers', 'devant', 'derriere',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'without', 'from', 'into', 'over',
  'under', 'between', 'through', 'during', 'before', 'after', 'about'];

const CONJONCTIONS = ['et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qu', 'si', 'comme',
  'quand', 'lorsque', 'puisque', 'and', 'or', 'but', 'so', 'nor', 'yet', 'if', 'when', 'while',
  'because', 'that', 'than', 'as'];

const AUXILIAIRES = ['est', 'sont', 'etait', 'etaient', 'ete', 'etre', 'suis', 'es', 'sommes',
  'etes', 'sera', 'seront', 'soit', 'a', 'ai', 'as', 'ont', 'avait', 'avaient', 'eu', 'avoir',
  'avons', 'avez', 'aura', 'auront', 'ait',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'has', 'have', 'had', 'having',
  'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must', 'do', 'does', 'did'];

/* ⚠️ Les TLD et les protocoles ne sont pas de la grammaire — ce sont les mots
 *   outils de l'adresse, et l'auteur les a nommés dans la même phrase. Ils
 *   obéissent à la même exigence : perdre `.fr` est excusable, perdre `.fr`
 *   quand on garde `.com` ne l'est pas. */
const TLD = ['fr', 'com', 'org', 'net', 'eu', 'be', 'ch', 'ca', 'uk', 'us', 'de', 'es', 'it',
  'io', 'dev', 'app', 'info', 'biz', 'xyz', 'me', 'tv', 'co', 'gov', 'edu'];

const PROTOCOLES = ['http', 'https', 'ftp', 'www', 'mailto', 'file'];

/**
 * Les classes, dans un ordre FIXE — c'est celui dans lequel un mot appartenant
 * à deux d'entre elles sera classé, et il ne doit pas dépendre de l'exécution.
 *
 * ⚠️ Les recoupements sont réels et voulus : `de` est article et préposition,
 *   `a` est préposition et auxiliaire, `that` est article et conjonction. Le
 *   premier de la liste gagne. Ce qui compte n'est pas de trancher juste en
 *   linguistique — c'est que la règle affichée soit la même à chaque fois.
 */
/* ★ **QUATRE CLASSES PORTENT UN FILTRE, DEUX N'EN PORTENT PAS.**

   Les extensions de domaine et les protocoles ont déjà leurs opérateurs —
   `ftld`, `fp`, `fw`, déclarés bien avant ce fichier. On ne fabrique pas de
   doublons : `filtre` reste absent pour ces deux-là, et `filtres.js` ne
   déclare que celles qui en portent un.

   Le libellé EST la règle que le lecteur verra à l'écran, juste avant que les
   mots disparaissent sous l'accolade. Il doit donc se lire comme une phrase et
   nommer une catégorie, jamais une liste. */
export const CLASSES = Object.freeze([
  Object.freeze({ cle: 'articles', regle: { fr: 'les articles et déterminants', en: 'articles and determiners' },
    filtre: {
      code: 'fart',
      libelle: { fr: 'On ignore les articles', en: 'Ignore the articles' },
      regle: { fr: '« le », « la », « un »… annoncent le nom, ils ne le portent pas',
        en: '"the", "a", "this"… announce the noun, they do not carry it' },
    }, mots: Object.freeze(new Set(ARTICLES.map(formeNue))) }),
  Object.freeze({ cle: 'prepositions', regle: { fr: 'les prépositions', en: 'prepositions' },
    filtre: {
      code: 'fprp',
      libelle: { fr: 'On ignore les prépositions', en: 'Ignore the prepositions' },
      regle: { fr: '« de », « par », « avec »… relient, et ne disent rien d’eux-mêmes',
        en: '"of", "by", "with"… link, and say nothing of themselves' },
    }, mots: Object.freeze(new Set(PREPOSITIONS.map(formeNue))) }),
  Object.freeze({ cle: 'conjonctions', regle: { fr: 'les conjonctions', en: 'conjunctions' },
    filtre: {
      code: 'fcnj',
      libelle: { fr: 'On ignore les conjonctions', en: 'Ignore the conjunctions' },
      regle: { fr: '« et », « ou », « mais »… nouent la phrase sans rien y ajouter',
        en: '"and", "or", "but"… tie the sentence without adding to it' },
    }, mots: Object.freeze(new Set(CONJONCTIONS.map(formeNue))) }),
  Object.freeze({ cle: 'auxiliaires', regle: { fr: 'les verbes être et avoir', en: 'the verbs to be and to have' },
    filtre: {
      code: 'faux',
      /* ★ « Ce n'est pas une question de tournure active ou passive, mais de
         GÉNÉRICITÉ DU VERBE : "Le chat EST dans la cuisine" — `est` peut
         sauter ; "Le chat MANGE dans la cuisine" — `mange` ne peut pas. »
         (l'auteur). D'où l'inventaire fermé d'être et d'avoir : `aime`,
         `mange`, `dort` n'y sont pas et n'y seront jamais. */
      libelle: { fr: 'On ignore être et avoir', en: 'Ignore to be and to have' },
      regle: { fr: '« est », « a », « était »… portent le temps, pas le sens',
        en: '"is", "has", "was"… carry tense, not meaning' },
    }, mots: Object.freeze(new Set(AUXILIAIRES.map(formeNue))) }),
  Object.freeze({ cle: 'tld', regle: { fr: 'les extensions de domaine', en: 'domain extensions' }, mots: Object.freeze(new Set(TLD.map(formeNue))) }),
  Object.freeze({ cle: 'protocoles', regle: { fr: 'les protocoles et sous-domaines', en: 'protocols and subdomains' }, mots: Object.freeze(new Set(PROTOCOLES.map(formeNue))) }),
]);

/**
 * La classe d'un mot, ou `null` s'il n'en a pas — auquel cas c'est un nom, un
 * verbe plein, un mot rare : de la matière, et l'abandonner se paie plein tarif.
 *
 * @param {string} mot
 * @returns {string|null} la clé de la classe
 */
export function classeDuMot(mot) {
  const nu = formeNue(mot);
  if (!nu) return null;
  for (const c of CLASSES) if (c.mots.has(nu)) return c.cle;
  return null;
}

/** La règle affichable d'une classe, bilingue — pour dire ce qu'on a écarté. */
export function regleDeLaClasse(cle) {
  const c = CLASSES.find((x) => x.cle === cle);
  return c ? c.regle : null;
}

/**
 * ★ **LA JUSTIFICATION SE VÉRIFIE, elle ne se déclare pas.**
 *
 * Rend l'ensemble des classes dont TOUS les membres présents dans la saisie
 * sont abandonnés. Ce sont les seules qui excusent quelque chose : une classe
 * à moitié écartée n'est pas une règle, c'est un choix, et l'abandon repasse
 * au plein tarif.
 *
 * ⚠️ **PAR OCCURRENCE, ET SURTOUT PAS PAR FORME.** Comparer des ensembles de
 *   mots laisserait passer « le chat mange **le** poisson » avec un seul des
 *   deux `le` abandonné : la forme `le` figurerait dans les deux listes et la
 *   règle paraîtrait tenue. Or garder un `le` et jeter l'autre est précisément
 *   l'arrangement qu'on refuse. On indexe donc les mots de la saisie et on
 *   demande, pour chacun, s'il est abandonné.
 *
 * @param {string[]} motsDeLaSaisie  tous les mots de la saisie, dans l'ordre
 * @param {boolean[]|Uint8Array} abandonne  parallèle : le mot i est-il abandonné
 * @returns {Set<string>} les clés des classes intégralement abandonnées
 */
export function classesJustifiees(motsDeLaSaisie, abandonne) {
  const justifiees = new Set();
  for (const c of CLASSES) {
    let present = 0;
    let gardes = 0;
    for (let i = 0; i < motsDeLaSaisie.length; i++) {
      if (!c.mots.has(formeNue(motsDeLaSaisie[i]))) continue;
      // ★ La classe se juge sur ce que la SAISIE contient, pas sur le lexique :
      //   « le chat mange la souris » n'a pas à perdre `un` pour que la règle
      //   « les articles » soit tenue — il n'y en a pas.
      present++;
      if (!abandonne[i]) gardes++;
    }
    if (present > 0 && gardes === 0) justifiees.add(c.cle);
  }
  return justifiees;
}
