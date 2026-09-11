// src/recherche/cible.js
// LA CIBLE — la suite de chiffres que la démonstration doit écrire.
//
// Tout ce site a été construit autour d'un nombre unique. « 666 » n'était pas
// un paramètre : c'était une constante, écrite en toutes lettres dans le
// bassin d'attraction, dans le faisceau, dans l'assemblage, dans le barème et
// jusque dans les libellés. Ce module en fait une VALEUR, et une seule règle
// gouverne tout ce qui suit :
//
//   ★ **Quand la cible vaut 666, rien ne change.** Ni les approches trouvées,
//     ni leur classement, ni les URL écrites, ni un seul libellé. C'est la
//     garantie de non-régression, et c'est aussi le critère de conception :
//     toute généralisation proposée ici se REPLIE exactement sur l'ancien code
//     quand on lui donne `[6, 6, 6]`. Là où ce repli n'était pas exact, la
//     généralisation a été refusée.
//
// ── Ce qu'est une cible, et ce qu'elle n'est PAS ───────────────────────────
//
// L'auteur a donné cinq exemples : `111`, `777`, `13`, `007`, `000`. Ils
// disent, ensemble, exactement ce que la cible doit être :
//
//  · `111` et `777` — un chiffre répété. C'est le cas de `666`, et c'est ce
//    qu'on aurait implémenté si l'on n'avait lu qu'eux ;
//  · `13` — DEUX chiffres, et deux chiffres DIFFÉRENTS. La longueur n'est
//    donc pas trois, et « la série » n'est pas « le triplet » ;
//  · `007` et `000` — des zéros de TÊTE. Un nombre ne sait pas les porter :
//    `Number('007')` vaut 7, et l'afficher rendrait « 7 » là où l'on a promis
//    « 007 ».
//
// Une cible est donc une **suite de chiffres décimaux**, jamais un nombre. Le
// nombre, quand il existe, n'est qu'un attribut dérivé (`nombre`), et il vaut
// `null` dès que l'écriture décimale ne le retrouve pas — ce qui ferme la
// porte au mode DIRECT pour `007` plutôt que de le laisser mentir.
//
// ── La longueur est bornée à six, et ce n'est pas un réglage ────────────────
//
// `config.js › MAX_SERIES` plafonne déjà (à neuf) le nombre de séries montrées
// d'un coup, « parce que la scène doit rester lisible et le verdict tenir sur
// une ligne ». Une cible de plus de six chiffres pose exactement le même
// problème par l'autre bout, et elle en pose un second : les modes qui
// assemblent des fragments disjoints énumèrent des combinaisons de `longueur`
// portées parmi douze, soit C(12, 6) = 924 au pire — le plafond est ce qui
// garde ce nombre fini.
//
// ── Ce que le zéro coûte, et pourquoi on l'accepte quand même ───────────────
//
// Le catalogue contient un opérateur « on retire les zéros » (`m0`), et le
// barème d'élégance récompense la concision : viser `000` demande au moteur de
// produire ce que le reste du site s'emploie à faire disparaître. On l'accepte
// tel quel — la cible ne modifie NI le catalogue NI le barème, elle change
// seulement ce qu'on y cherche. Si `000` rend peu de voies, c'est un fait sur
// la saisie, pas un défaut à corriger en truquant la mesure.
//
// ── LA CIBLE TEXTUELLE — « Sarah Kerrigan → Zerg » ──────────────────────────
//
// « Je voudrais la possibilité d'aller d'une saisie (lettre, chiffre...) vers
// une autre qui n'est pas nécessairement des chiffres. Ça peut se faire par
// simple réagencement + filtre dans certains cas, ou par conversion en chiffres
// puis conversion chiffre vers lettre quand nécessaire. » (l'auteur)
//
// Une cible peut donc être un MOT. Et un mot n'est pas ici une autre espèce de
// cible : c'est une suite de RANGS alphabétiques. `zerg` s'écrit `26 5 18 7`
// exactement comme `007` s'écrit `0 0 7` ; le champ `chiffres` porte ces rangs,
// et `nature` dit qu'il s'agit d'un mot.
//
// ★ **Les rangs, et pas un second moteur — parce que c'est mesuré.** Nourri des
//   rangs, le pipeline existant (fragments, bassins, assemblage, barème, URL)
//   trouve sans une ligne de plus `Zerg → zerg` par `tca+ma1`, et même quatre
//   lectures convergentes de « Zerg » qui rendent Z, E, R et G ; il trouve la
//   portée « Sarah » de « Sarah Kerrigan → sarah ». Tout ce que le site sait
//   faire pour écrire `007` sert à écrire un mot — y compris le refus des
//   suppressions en fin de chemin (`elegance.js › elagueALaFin`) : un mot est
//   une cible hétérogène, on n'y garde pas « les lettres qui arrangent ».
//
// ★ **Le retour aux lettres est MONTRÉ, pas décrété.** Les voies écrivent des
//   rangs ; le verdict les fait passer un à un par la réglette alphabétique lue
//   à rebours (`m1a`, « 26 → Z ») avant de révéler le mot. C'est un opérateur
//   du catalogue, avec sa table et ses étapes — mais il n'est pas exploré : il
//   est la dernière étape de TOUTE voie vers un mot, et le laisser entrer dans
//   la recherche aurait changé ce qu'on explore pour les cibles chiffrées
//   (`mappeurs.js › operateurRangEnLettre`).
//
// ★ **Casse et accents ne comptent pas** : « Fantôme », « FANTOME » et
//   « fantome » sont une seule cible, `fantome`. La réglette a vingt-six cases,
//   sans casse ni accent — `ma1` plie déjà « é » sur « e » —, et une cible qui
//   distinguerait `ô` de `o` promettrait ce qu'aucun rang ne sait écrire.
//   L'écriture canonique est en bas de casse sans accent : c'est elle qui
//   voyage dans l'URL (`czerg!`). L'AFFICHAGE est en capitales — celles que la
//   réglette fait descendre au verdict, pour qu'on n'annonce pas « zerg »
//   au-dessus d'un « ZERG ».
//
// ★ **Ce qui n'est PAS une cible** : un mot mêlé de chiffres (`c3po`), plusieurs
//   mots (`reine des lames`), un trait d'union ou une apostrophe, une lettre que
//   le pliage ne ramène pas dans A…Z (`œ`, `ß`). On refuse, et l'URL le dit
//   (`url.js › BANDEAUX.cibleIllisible`) : deviner une cible, c'est en viser
//   une autre.
//
// ⚠️ **Les quatre exemples de l'auteur restent hors de portée**, et ce n'est pas
//   ce module qui y peut quelque chose : « Sarah Kerrigan » n'a ni Z, ni T, ni
//   O, et aucune conversion du catalogue ne les fait tomber juste. Mesuré de
//   quatre façons — voir `tests/lents/cible-mot.test.js`, qui les porte en
//   `todo` avec ce qu'il faudrait ajouter.

/**
 * Le plafond de longueur — voir l'en-tête.
 *
 * ★ **IL VAUT 10, ET L'ARGUMENT QUI LE TENAIT À 6 ÉTAIT FAUX.**
 *
 * > « Pour les cibles autres que 666, pourquoi limiter à 6 chiffres ? 8 ou 10
 * >   c'est bien, non ? Je voudrais au moins 8 pour pouvoir y mettre des dates
 * >   de naissance. » (l'auteur)
 *
 * L'en-tête justifiait 6 par la combinatoire : « les modes qui assemblent des
 * fragments disjoints énumèrent des combinaisons de `longueur` portées parmi
 * douze, soit C(12, 6) = 924 au pire — le plafond est ce qui garde ce nombre
 * fini ». Or 924 est le MAXIMUM du binôme, atteint précisément à 6 : C(12, 8)
 * vaut 495 et C(12, 10) vaut 66. Relever le plafond ne fait pas grossir le pire
 * cas, il l'éloigne. Le raisonnement partait de l'idée qu'une borne plus haute
 * élargit toujours, ce qui est vrai d'une somme et faux d'un binôme.
 *
 * Reste l'argument de LISIBILITÉ, qui lui est réel : dix chiffres par série,
 * c'est un verdict long. Mais c'est `reveal` qui met le verdict à l'échelle de
 * la scène, et lui seul est en position d'en juger — la même erreur avait été
 * commise sur `MAX_SERIES`, où une borne de lisibilité rabotait un COMPTAGE.
 *
 * Dix plutôt que huit : une date de naissance s'écrit `01012000` en huit
 * chiffres, mais aussi `0101200019` ou `19012000` selon les usages, et deux
 * chiffres de marge ne coûtent rien puisque la combinatoire décroît.
 *
 * ★ Il borne aussi un MOT, à dix lettres, et pour la même raison : c'est la
 * longueur d'une série, quel que soit l'alphabet dans lequel elle s'écrit.
 */
export const MAX_CHIFFRES = 10;

/** L'écriture de la cible par défaut. Toute la promesse du site tient ici. */
export const TEXTE_DEFAUT = '666';

const RE_CIBLE = /^[0-9]+$/;

/**
 * @typedef {Object} Cible
 * @property {string} texte        l'écriture décimale, zéros de tête compris
 * @property {number[]} chiffres   les chiffres, gelés — pour un MOT, ses rangs (a=1 … z=26)
 * @property {number} longueur     `chiffres.length` — la longueur d'une série
 * @property {number[]} alphabet   les chiffres DISTINCTS, croissants, gelés
 * @property {boolean} homogene    un seul chiffre distinct (`666`, `111`, `000`)
 * @property {boolean} defaut      vaut-elle `666` ?
 * @property {number|null} nombre  l'entier, ou `null` si l'écriture ne le retrouve pas
 * @property {'chiffres'|'mot'} nature  une suite de chiffres, ou un mot (voir l'en-tête)
 * @property {string} affichage    ce qu'on MONTRE : l'écriture, en capitales pour un mot
 */

/**
 * Lit une cible écrite. Rend `null` sur tout ce qui n'est ni une suite de
 * chiffres décimaux non vide et d'au plus `MAX_CHIFFRES` signes, ni un MOT
 * d'au plus `MAX_CHIFFRES` lettres (voir l'en-tête, « la cible textuelle »).
 *
 * ★ **Aucune tolérance, et c'est délibéré.** On pourrait accepter les espaces,
 * les points médians, ou un `6·6·6` recopié depuis l'ancien pied de panneau.
 * Mais cette chaîne voyage dans l'URL (`url.js`), et une lecture tolérante à
 * l'entrée demande une écriture canonique à la sortie, donc deux formes pour
 * une même cible et une question de plus à trancher à chaque comparaison. Le
 * champ de saisie de la page de listing filtre au clavier ; ce qui arrive ici
 * est déjà propre, ou n'est pas une cible.
 *
 * ⚠️ **Le pliage d'un mot n'est pas une tolérance.** « Fantôme » et « FANTOME »
 * ne sont pas deux écritures d'une même cible qu'on accepterait par
 * indulgence : ce sont deux saisies d'une cible qui n'a qu'une écriture, parce
 * que la réglette n'a ni casse ni accent. L'écriture canonique reste unique.
 *
 * @param {string|number|number[]|Cible} entree
 * @returns {Cible|null}
 */
export function lireCible(entree) {
  if (entree && typeof entree === 'object' && Array.isArray(entree.chiffres)) {
    return /** @type {Cible} */ (entree); // déjà lue : on ne la relit pas
  }
  let texte;
  if (Array.isArray(entree)) {
    if (!entree.every((d) => Number.isInteger(d) && d >= 0 && d <= 9)) return null;
    texte = entree.join('');
  } else {
    texte = String(entree ?? '').trim();
  }
  // Ce qui n'est pas une suite de chiffres peut encore être un MOT — sauf un
  // tableau, qui ne porte que des chiffres.
  if (!RE_CIBLE.test(texte)) return Array.isArray(entree) ? null : lireMot(texte);
  if (texte.length > MAX_CHIFFRES) return null;

  const chiffres = Object.freeze([...texte].map(Number));
  const alphabet = Object.freeze([...new Set(chiffres)].sort((a, b) => a - b));
  // ★ Le nombre n'existe que si l'écriture décimale le RETROUVE. `007` et `000`
  //   n'en ont donc pas : c'est ce qui interdit au mode DIRECT de prétendre
  //   qu'un `NUM` valant 7 démontre `007`.
  const n = Number(texte);
  const nombre = String(n) === texte ? n : null;

  return Object.freeze({
    texte,
    chiffres,
    longueur: chiffres.length,
    alphabet,
    homogene: alphabet.length === 1,
    defaut: texte === TEXTE_DEFAUT,
    nombre,
    nature: 'chiffres',
    affichage: texte,
  });
}

/**
 * ★ LE PLIAGE — ce qui fait de « Fantôme », « FANTOME » et « fantome » une
 * seule cible : décomposition canonique, diacritiques retirés, bas de casse.
 * Exactement ce que la réglette sait écrire. `toLowerCase` et non
 * `toLocaleLowerCase` : aucune source d'entropie (§4.4 règle 4).
 */
export function plierMot(texte) {
  return String(texte ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const RE_MOT = /^[a-z]+$/;

/**
 * Lit une cible écrite en LETTRES — un mot, et un seul. `null` sur tout le
 * reste : plusieurs mots, un chiffre mêlé, un signe que le pliage ne ramène pas
 * dans A…Z, plus de `MAX_CHIFFRES` lettres.
 *
 * ★ `chiffres` porte les RANGS : c'est ce que les voies écrivent, et ce que
 *   `seriesDe`, les bassins et l'assemblage comparent. `nombre` vaut `null` :
 *   un mot n'a pas d'écriture décimale, le mode DIRECT ne le concerne pas.
 * @returns {Cible|null}
 */
function lireMot(brut) {
  const texte = plierMot(brut);
  if (!RE_MOT.test(texte) || texte.length > MAX_CHIFFRES) return null;
  const chiffres = Object.freeze([...texte].map((c) => c.charCodeAt(0) - 96));
  const alphabet = Object.freeze([...new Set(chiffres)].sort((a, b) => a - b));
  return Object.freeze({
    texte,
    chiffres,
    longueur: chiffres.length,
    alphabet,
    homogene: alphabet.length === 1,
    defaut: false,
    nombre: null,
    nature: 'mot',
    affichage: texte.toUpperCase(),
  });
}

/** La cible par défaut — celle de tout le site, et de tout lien déjà partagé. */
export const CIBLE_DEFAUT = /** @type {Cible} */ (lireCible(TEXTE_DEFAUT));

/**
 * Normalise ce qu'un appelant a bien voulu passer. Une cible illisible retombe
 * sur `666` plutôt que de faire échouer la recherche : le moteur ne rend jamais
 * la main bredouille (CONTRACTS §5), et une cible est un CONFORT, pas un
 * contrat. La grammaire d'URL, elle, refuse et le dit (`url.js`) — c'est là que
 * l'erreur doit se voir, pas trois couches plus bas.
 */
export function normaliserCible(entree) {
  if (entree === undefined || entree === null || entree === '') return CIBLE_DEFAUT;
  return lireCible(entree) || CIBLE_DEFAUT;
}

/** Deux cibles sont-elles la même ? (comparaison sur l'écriture, qui est canonique) */
export const memeCible = (a, b) => normaliserCible(a).texte === normaliserCible(b).texte;

/** La cible est-elle un MOT ? (voir l'en-tête, « la cible textuelle ») */
export const estMot = (entree) => normaliserCible(entree).nature === 'mot';

/**
 * L'écriture qu'on MONTRE : `666`, `007`, ou `ZERG` pour un mot. Une cible
 * reçue d'ailleurs sans `affichage` — un objet fabriqué à la main — se montre
 * par son écriture, qui est la même pour des chiffres.
 */
export const ecritureDe = (entree) => {
  const c = normaliserCible(entree);
  return c.affichage ?? c.texte;
};

/**
 * Le code de l'opérateur qui relit un rang en lettre — `m1a`. Le verdict d'une
 * cible-mot le joue (`scenario.js`), et `index.js` le prend dans le catalogue
 * qu'on lui a donné : la recherche ne dépend pas du moteur arithmétique, elle
 * en connaît le contrat, et un code est alloué à vie (§4.1).
 */
export const CODE_RANG_EN_LETTRE = 'm1a';

// ═════════════════════════════════ écrire la cible dans un vecteur

/**
 * ★ LES SÉRIES QU'UN VECTEUR ÉCRIT — le cœur de la généralisation.
 *
 * L'ancien code posait la question ainsi : « quels index portent un 6 ? », puis
 * groupait la réponse par trois. Cette formulation ne survit pas à `007` : les
 * chiffres n'y sont pas interchangeables, et leur ORDRE fait partie de ce qu'on
 * démontre.
 *
 * La bonne question est donc : **quelles positions, lues de gauche à droite,
 * écrivent la cible ?** On balaie le vecteur une fois, en cherchant `c₁`, puis
 * `c₂`, … jusqu'à `cₖ` ; la série est complète, on repart de `c₁`. Les valeurs
 * qui ne servent pas sont simplement sautées — exactement comme l'ancien code
 * sautait ce qui ne valait pas 6.
 *
 * ★ **Le repli sur l'existant est EXACT**, et c'est ce qui autorise ce
 * remplacement. Sur `[6, 2, 6, 6, 6]` et la cible `666`, le balayage rend
 * `[[0, 2, 3]]` — les trois premiers 6 dans l'ordre —, ce que rendait le
 * groupement par trois de la liste des index à 6. Sur une cible homogène, les
 * deux formulations sont la même : chercher « six, puis six, puis six » ne peut
 * prendre que des 6, dans l'ordre où ils viennent.
 *
 * ★ **Glouton, et sans regret.** Un balayage glouton ne trouve pas toujours le
 * plus grand nombre de séries : sur `[0, 7, 0, 0, 7]` visant `007`, il prend
 * `0` (index 0), cherche un second `0` — c'est l'index 2 —, puis un `7` —
 * l'index 4 : une série, alors qu'aucune autre lecture n'en donne deux non plus.
 * On peut construire des cas où un algorithme plus malin ferait mieux ; on ne le
 * fait pas, pour deux raisons. La première est que le glouton de gauche à droite
 * est ce que ferait un lecteur humain, et que la démonstration doit se lire dans
 * l'ordre de la ligne. La seconde est le déterminisme (§4.4) : un balayage sans
 * choix n'a rien à départager, donc rien à truquer.
 *
 * @param {number[]} valeurs
 * @param {Cible} cible
 * @param {number} [maxSeries]  plafond, `Infinity` par défaut
 * @returns {number[][]} une liste d'index par série, dans l'ordre de lecture
 */
export function seriesDe(valeurs, cible, maxSeries = Infinity) {
  const c = normaliserCible(cible);
  const out = [];
  if (!Array.isArray(valeurs) || !valeurs.length) return out;
  let serie = [];
  let rang = 0;
  for (let i = 0; i < valeurs.length && out.length < maxSeries; i++) {
    if (valeurs[i] !== c.chiffres[rang]) continue;
    serie.push(i);
    rang++;
    if (rang === c.longueur) {
      out.push(serie);
      serie = [];
      rang = 0;
    }
  }
  return out;
}

/**
 * Les valeurs d'un vecteur qui APPARTIENNENT à la cible — celles qui peuvent
 * servir, quel que soit leur rang.
 *
 * C'est la mesure de « ce qu'une portée rapporte » : la moisson additionne ce
 * que chaque portée donne, sans savoir encore dans quel ordre les portées se
 * suivront. Sur une cible homogène, c'est mot pour mot l'ancien « compte des
 * 6 ».
 *
 * @returns {number[]} les index, croissants
 */
export function indexUtiles(valeurs, cible) {
  const c = normaliserCible(cible);
  const out = [];
  if (!Array.isArray(valeurs)) return out;
  for (let i = 0; i < valeurs.length; i++) if (c.alphabet.includes(valeurs[i])) out.push(i);
  return out;
}

/** Le vecteur écrit-il la cible au moins une fois, d'un bout à l'autre ? */
export const ecrit = (valeurs, cible) => seriesDe(valeurs, cible, 1).length === 1;

/**
 * Le verdict à afficher : `666`, ou `666 666` quand il y a de quoi.
 * L'écriture est celle de la cible, zéros de tête compris — c'est bien pour ça
 * qu'une cible est une CHAÎNE et pas un nombre. Un mot s'y écrit en capitales,
 * comme la réglette le rend (`affichage`).
 */
export function verdict(nSeries, cible) {
  const c = normaliserCible(cible);
  const n = Math.max(1, nSeries || 1);
  return Array.from({ length: n }, () => c.affichage ?? c.texte).join(' ');
}
