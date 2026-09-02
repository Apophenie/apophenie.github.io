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
// `assemblage.js › MAX_SERIES` plafonne déjà à six le nombre de séries montrées
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
 */
export const MAX_CHIFFRES = 10;

/** L'écriture de la cible par défaut. Toute la promesse du site tient ici. */
export const TEXTE_DEFAUT = '666';

const RE_CIBLE = /^[0-9]+$/;

/**
 * @typedef {Object} Cible
 * @property {string} texte        l'écriture décimale, zéros de tête compris
 * @property {number[]} chiffres   les chiffres, gelés
 * @property {number} longueur     `chiffres.length` — la longueur d'une série
 * @property {number[]} alphabet   les chiffres DISTINCTS, croissants, gelés
 * @property {boolean} homogene    un seul chiffre distinct (`666`, `111`, `000`)
 * @property {boolean} defaut      vaut-elle `666` ?
 * @property {number|null} nombre  l'entier, ou `null` si l'écriture ne le retrouve pas
 */

/**
 * Lit une cible écrite. Rend `null` sur tout ce qui n'est pas une suite de
 * chiffres décimaux non vide et d'au plus `MAX_CHIFFRES` signes.
 *
 * ★ **Aucune tolérance, et c'est délibéré.** On pourrait accepter les espaces,
 * les points médians, ou un `6·6·6` recopié depuis l'ancien pied de panneau.
 * Mais cette chaîne voyage dans l'URL (`url.js`), et une lecture tolérante à
 * l'entrée demande une écriture canonique à la sortie, donc deux formes pour
 * une même cible et une question de plus à trancher à chaque comparaison. Le
 * champ de saisie de la page de listing filtre au clavier ; ce qui arrive ici
 * est déjà propre, ou n'est pas une cible.
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
  if (!RE_CIBLE.test(texte)) return null;
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
 * qu'une cible est une CHAÎNE et pas un nombre.
 */
export function verdict(nSeries, cible) {
  const c = normaliserCible(cible);
  const n = Math.max(1, nSeries || 1);
  return Array.from({ length: n }, () => c.texte).join(' ');
}
