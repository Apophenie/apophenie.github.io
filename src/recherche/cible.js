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
// une autre qui n'est pas nécessairement des chiffres. » (l'auteur)
//
// Une cible peut donc être un TEXTE — n'importe lequel : « Zerg », « Fantôme »,
// « reine des lames ». Il est visé sous sa forme EXACTE, casse et accents
// compris : « casse et accents doivent être pris en compte pour maximiser
// exhaustivité et cohérence » (l'auteur).
//
// ★ **Un texte ne se cherche pas : ce sont ses RELECTURES qui se cherchent.**
//   Le moteur sait écrire des suites de chiffres. Pour écrire un mot, il écrit
//   les chiffres qu'un opérateur « chiffres → lettre » relira en ce mot : `m1a`
//   (le rang dans l'alphabet), `mcaz` et `mcqw` (la touche désignée par sa
//   colonne et sa rangée). Chaque relecture donne UNE cible chiffrée
//   sous-jacente — « Zerg » vaut `26 5 18 7` en rangs, `21314152` en
//   coordonnées AZERTY —, et l'inverse n'est jamais recopié : il se CALCULE sur
//   l'opérateur lui-même (`conversions.js`). « Produire un mappage inverse
//   "objectif vers chiffres" avec chacun des opérateurs chiffre→lettre et
//   fournir la séquence de chiffres produite comme objectif pour notre
//   outillage actuel » (l'auteur) : c'est littéralement ce qui se passe, puis
//   les listes des relectures sont fusionnées (`index.js › deroulerTexte`).
//
// ★ **Ce qu'on peut viser n'est borné que par la RECHERCHE, pas par le
//   format.** Un texte d'au plus `MAX_SIGNES_TEXTE` signes, sans caractère de
//   commande, est une cible — espaces, traits d'union et apostrophes compris,
//   puisque l'URL la porte en base58. S'il contient un signe qu'aucune
//   relecture ne sait écrire (une espace, un « œ »), il n'a simplement pas de
//   voie, et la liste le dit.
//
// ★ **L'écart de forme se PAIE, il n'interdit pas.** Les relectures écrivent en
//   bas de casse et sans accent : viser « Fantôme » par elles rend « fantome ».
//   La voie reste montrée, sous son vrai verdict, et son score est multiplié
//   par le barème d'écart (`ECARTS`, plus bas) — la hiérarchie de l'auteur,
//   chiffrée.
//
// ⚠️ Un des quatre exemples de l'auteur reste hors de portée — Fantome ; Terran
//   est atteint, par le clavier comme par les paires : voir
//   `tests/lents/cible-mot.test.js`, qui dit pourquoi.

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
 * ★ Il ne borne PAS un texte visé — voir `MAX_SIGNES_TEXTE`. Un texte ne se
 * cherche pas lui-même : ce sont ses relectures qui se cherchent, et leurs
 * cibles sous-jacentes n'ont pas de plafond (`cibleDeValeurs`).
 *
 * ★ **IL VAUT 20.** « Il faudrait aussi étendre les cibles numériques au-delà
 *   de 12, ça faciliterait les cibles textuelles dans la foulée » (l'auteur).
 *   Ce qui retenait une cible longue n'était ni ce plafond ni la combinatoire
 *   des fragments, mais l'ABSORPTION : elle n'écrit qu'un chiffre visé pour
 *   trois ou quatre chiffres de ligne, et une ligne s'arrêtait à trente-six
 *   chiffres (`mappeurs.js › plafondDAbsorption`, qui porte la mesure). Le
 *   plafond de ligne suit désormais la visée au-delà de dix chiffres ; une cible
 *   chiffrée de onze à vingt chiffres se cherche donc comme la cible
 *   sous-jacente d'un mot, par le même chemin. Vingt : un mot de dix lettres
 *   relu par paires, un numéro de téléphone avec son indicatif, deux dates.
 *   Au-delà, c'est la recherche qui ne suit plus — voir le banc
 *   (`.planning/banc/cibles-mots-banc.mjs`, corpus des chiffres).
 *   ⚠️ En deçà de onze chiffres, rien ne bouge : c'est ce que tient
 *   l'instantané des cibles chiffrées (`tests/lents/cible-mot.test.js`).
 */
export const MAX_CHIFFRES = 20;

/** L'écriture de la cible par défaut. Toute la promesse du site tient ici. */
export const TEXTE_DEFAUT = '666';

const RE_CIBLE = /^[0-9]+$/;

/**
 * @typedef {Object} Cible
 * @property {string} texte        l'écriture décimale, zéros de tête compris
 * @property {number[]} chiffres   les chiffres (ou les valeurs), gelés — VIDE pour un texte :
 *                                 ce sont ses relectures qui en ont
 * @property {number} longueur     `chiffres.length` — la longueur d'une série
 * @property {number[]} alphabet   les chiffres DISTINCTS, croissants, gelés
 * @property {boolean} homogene    un seul chiffre distinct (`666`, `111`, `000`)
 * @property {boolean} defaut      vaut-elle `666` ?
 * @property {number|null} nombre  l'entier, ou `null` si l'écriture ne le retrouve pas
 * @property {'chiffres'|'valeurs'|'mot'} nature  des chiffres décimaux ; une suite de valeurs
 *                                 (la cible sous-jacente d'une relecture) ; un texte visé
 * @property {string} affichage    ce qu'on MONTRE : l'écriture, telle quelle
 */

/**
 * Lit une cible écrite. Rend `null` sur tout ce qui n'est ni une suite de
 * chiffres décimaux non vide et d'au plus `MAX_CHIFFRES` signes, ni un TEXTE
 * d'au plus `MAX_SIGNES_TEXTE` signes (voir l'en-tête, « la cible textuelle »).
 *
 * ★ **Aucune tolérance, et c'est délibéré.** On pourrait accepter les espaces,
 * les points médians, ou un `6·6·6` recopié depuis l'ancien pied de panneau.
 * Mais cette chaîne voyage dans l'URL (`url.js`), et une lecture tolérante à
 * l'entrée demande une écriture canonique à la sortie, donc deux formes pour
 * une même cible et une question de plus à trancher à chaque comparaison. Le
 * champ de saisie de la page de listing filtre au clavier ; ce qui arrive ici
 * est déjà propre, ou n'est pas une cible.
 *
 * ⚠️ **Un texte se lit TEL QUEL** — NFC, blancs de bord retirés, et rien
 * d'autre. « Fantôme » et « fantome » sont deux cibles : l'écart entre ce
 * qu'une voie écrit et ce qu'on vise se PAIE au barème (`ecartDeForme`), il ne
 * se replie pas en silence sur une forme voisine.
 *
 * @param {string|number|number[]|Cible} entree
 * @returns {Cible|null}
 */
export function lireCible(entree) {
  if (entree && typeof entree === 'object' && Array.isArray(entree.chiffres)) {
    return /** @type {Cible} */ (entree); // déjà lue : on ne la relit pas
  }
  // ★ Un objet qui n'est pas une cible déjà lue n'en devient pas une en passant
  //   par `String` : « [object Object] » serait un TEXTE parfaitement visable,
  //   depuis que les textes le sont. On refuse, comme avant.
  if (entree !== null && typeof entree === 'object' && !Array.isArray(entree)) return null;
  let texte;
  if (Array.isArray(entree)) {
    if (!entree.every((d) => Number.isInteger(d) && d >= 0 && d <= 9)) return null;
    texte = entree.join('');
  } else {
    texte = String(entree ?? '').trim();
  }
  // Ce qui n'est pas une suite de chiffres peut encore être un TEXTE — sauf un
  // tableau, qui ne porte que des chiffres. Une suite de chiffres trop longue,
  // elle, n'est pas un texte : elle est refusée juste en dessous.
  if (!RE_CIBLE.test(texte)) return Array.isArray(entree) ? null : lireMot(texte);
  if (texte.length > MAX_CHIFFRES) return null;

  const chiffres = Object.freeze([...texte].map(Number));
  const alphabet = Object.freeze([...new Set(chiffres)].sort((a, b) => a - b));
  // ★ Le nombre n'existe que si l'écriture décimale le RETROUVE. `007` et `000`
  //   n'en ont donc pas : c'est ce qui interdit au mode DIRECT de prétendre
  //   qu'un `NUM` valant 7 démontre `007`.
  //   Et seulement s'il est un entier SÛR : au-delà de 2⁵³, `Number` arrondit,
  //   et un nombre arrondi n'est plus celui qu'on a demandé.
  const n = Number(texte);
  const nombre = Number.isSafeInteger(n) && String(n) === texte ? n : null;

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
 * ★ LE PLIAGE — ce qu'une relecture sait écrire d'une lettre : sa forme de
 * base, sans diacritique, en bas de casse.
 *
 * Il ne sert plus à confondre deux cibles — l'auteur veut la forme exacte —,
 * il sert à chercher, pour chaque signe de la cible, ce qu'un opérateur de
 * relecture écrirait à sa place. L'écart qui reste se paie (`ecartDeForme`).
 * `toLowerCase` et non `toLocaleLowerCase` : aucune source d'entropie (§4.4
 * règle 4).
 */
export function plierMot(texte) {
  return String(texte ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Le plafond d'un TEXTE visé, en signes.
 *
 * Il n'a rien de la combinatoire qui borne les chiffres : un texte ne se
 * cherche pas lui-même. Il borne ce qui se LIT — le verdict d'un texte de vingt
 * signes tient encore sur une ligne — et la recherche, puisque chaque signe
 * coûte une ou deux valeurs à la cible sous-jacente.
 */
export const MAX_SIGNES_TEXTE = 20;

const RE_COMMANDE = /\p{Cc}/u;

/**
 * Lit une cible écrite en TEXTE, telle quelle. `null` si elle est vide, trop
 * longue, ou porte un caractère de commande — qu'aucun champ ne produit, et
 * qu'aucune scène ne sait montrer.
 *
 * ★ `chiffres` est VIDE : un texte ne s'écrit pas en chiffres, ce sont ses
 *   relectures qui en ont (`conversions.js`). Le laisser entrer tel quel dans la
 *   recherche chiffrée ne viserait rien — `index.js` l'en empêche, bruyamment.
 * @returns {Cible|null}
 */
function lireMot(brut) {
  const texte = String(brut ?? '').normalize('NFC').trim();
  const signes = [...texte];
  if (!signes.length || signes.length > MAX_SIGNES_TEXTE || RE_COMMANDE.test(texte)) return null;
  return Object.freeze({
    texte,
    chiffres: Object.freeze([]),
    longueur: signes.length,
    alphabet: Object.freeze([]),
    homogene: false,
    defaut: false,
    nombre: null,
    nature: 'mot',
    affichage: texte,
  });
}

/**
 * ★ LA CIBLE SOUS-JACENTE d'une relecture — une suite de valeurs que la
 * recherche chiffrée sait viser.
 *
 * Faite de chiffres décimaux, c'est une cible chiffrée ORDINAIRE, et tout le
 * moteur s'y applique — y compris les opérateurs qui lisent la cible (`mab`,
 * `mrd`…) : c'est ce qui a ouvert ZERG et GHOST en coordonnées de clavier.
 * Sinon — un rang de 26, une colonne de 10 —, c'est une suite de VALEURS : même
 * lecture de gauche à droite (`seriesDe`), mais les opérateurs visés, qui
 * raisonnent en chiffres décimaux, s'en retirent d'eux-mêmes (`lireVisee`
 * refuse l'écriture `26.5.18.7`).
 *
 * ★ **Jamais la cible par défaut, jamais un nombre.** `fff` vaut `6 6 6` en
 *   rangs, et n'a pas pour autant droit aux cornes, au joker ni aux réponses
 *   dédiées : ce sont les promesses du 666, pas celles d'une relecture. Et le
 *   mode DIRECT est fermé (`nombre: null`) : une relecture lit ses valeurs une
 *   à une, et lire 123 comme 1, 2, 3 serait déjà une démonstration.
 *
 * ★ Pas de plafond : au-delà de dix valeurs, les modes qui assemblent douze
 *   fragments au plus ne peuvent plus l'écrire, et il reste les voies d'un
 *   seul vecteur. C'est la recherche qui le dit, pas un refus de principe.
 *
 * @param {number[]} valeurs  entiers positifs ou nuls
 * @returns {Cible|null}
 */
export function cibleDeValeurs(valeurs) {
  if (!Array.isArray(valeurs) || !valeurs.length
    || !valeurs.every((v) => Number.isInteger(v) && v >= 0)) return null;
  const chiffres = Object.freeze([...valeurs]);
  const alphabet = Object.freeze([...new Set(chiffres)].sort((a, b) => a - b));
  const decimale = chiffres.every((v) => v <= 9);
  return Object.freeze({
    texte: decimale ? chiffres.join('') : chiffres.join('.'),
    chiffres,
    longueur: chiffres.length,
    alphabet,
    homogene: alphabet.length === 1,
    defaut: false,
    nombre: null,
    nature: decimale ? 'chiffres' : 'valeurs',
    affichage: decimale ? chiffres.join('') : chiffres.join(' '),
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

/** La cible est-elle un TEXTE ? (voir l'en-tête, « la cible textuelle ») */
export const estMot = (entree) => normaliserCible(entree).nature === 'mot';

/**
 * L'écriture qu'on MONTRE : `666`, `007`, ou `Zerg`. Une cible reçue d'ailleurs
 * sans `affichage` — un objet fabriqué à la main — se montre par son écriture.
 */
export const ecritureDe = (entree) => {
  const c = normaliserCible(entree);
  return c.affichage ?? c.texte;
};

// ═════════════════════════════════ l'écart de forme

/**
 * ★ LE BARÈME D'ÉCART DE FORME — ce que coûte de rendre un texte qui n'est pas
 *   exactement la cible. Des millièmes du score, multiplicatifs et entiers.
 *
 * > « Casse et accents doivent être pris en compte pour maximiser exhaustivité
 * >   et cohérence. Ceci dit, le coût pour une version sans accent doit être
 * >   faible, et le coût pour une casse différente mais homogène (Fantome
 * >   FANTOME fantome, pas FaNtOMe) doit être faible aussi. Passer entièrement
 * >   en majuscule une saisie qui ne l'était pas est ce qui doit coûter le plus
 * >   cher après une casse hétérogène (sauf première lettre majuscule qui coûte
 * >   très peu comme écart). » (l'auteur)
 *
 * Du moins cher au plus cher, ce que la voie ÉCRIT face à ce qu'on VISE :
 *
 *   | écart       | exemple (écrit → visé)  | facteur |
 *   |-------------|-------------------------|---------|
 *   | aucun       | Zerg → Zerg             |   1,000 |
 *   | initiale    | zerg → Zerg             |   0,970 |
 *   | accents     | fantome → fantôme       |   0,930 |
 *   | casse       | zerg → ZERG             |   0,900 |
 *   | capitales   | ZERG → Zerg             |   0,650 |
 *   | mêlée       | zErG → Zerg             |   0,400 |
 *
 * Les écarts se CUMULENT par produit : « fantome » pour « Fantôme » paie
 * l'accent ET l'initiale, 0,930 × 0,970 ≈ 0,902.
 *
 * ⚠️ **À VALIDER PAR L'AUTEUR**, et sur deux points précis :
 *   · les valeurs, qui ne sont qu'une traduction chiffrée de son ordre ;
 *   · la LECTURE de « passer entièrement en majuscule une saisie qui ne l'était
 *     pas » : « la saisie » est lue comme la CIBLE saisie dans le champ. Écrire
 *     ZERG pour « Zerg » coûte cher ; écrire zerg pour « ZERG » est une casse
 *     homogène, qui coûte peu. Le passage en capitales est donc asymétrique,
 *     et c'est ce qui concilie « FANTOME » dans la liste des casses bon marché
 *     avec « tout en majuscules » dans celle des chères.
 */
export const ECARTS = Object.freeze({
  initiale: Object.freeze({
    facteur: 970, dit: Object.freeze({ fr: 'à la capitale initiale près', en: 'but for the initial capital' }),
  }),
  accents: Object.freeze({
    facteur: 930, dit: Object.freeze({ fr: 'aux accents près', en: 'but for the accents' }),
  }),
  casse: Object.freeze({
    facteur: 900, dit: Object.freeze({ fr: 'à la casse près', en: 'but for the case' }),
  }),
  capitales: Object.freeze({
    facteur: 650, dit: Object.freeze({ fr: 'tout en capitales', en: 'all in capitals' }),
  }),
  melee: Object.freeze({
    facteur: 400, dit: Object.freeze({ fr: 'en casse mêlée', en: 'in mixed case' }),
  }),
});

const sansAccents = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');

/**
 * L'écart entre ce qu'une voie ÉCRIT et le texte VISÉ. `null` s'ils ne sont pas
 * le même texte au pliage près : ce n'est plus un écart, c'est un autre mot.
 *
 * ★ Il se mesure sur ce qui est RÉELLEMENT écrit, pas sur la méthode : deux
 *   relectures qui écrivent la même chose paient la même chose.
 * @returns {{natures:string[], facteur:number}|null}
 */
export function ecartDeForme(produit, vise) {
  const p = String(produit ?? '').normalize('NFC');
  const v = String(vise ?? '').normalize('NFC');
  if (plierMot(p) !== plierMot(v) || [...p].length !== [...v].length) return null;
  const natures = [];
  // Les accents d'abord : ils se lisent à casse égale.
  if (p.toLowerCase() !== v.toLowerCase()) natures.push('accents');
  // Puis la casse, accents retirés des deux côtés.
  const pa = [...sansAccents(p)];
  const va = [...sansAccents(v)];
  if (pa.join('') !== va.join('')) {
    const reste = (s) => s.slice(1).join('');
    const tout = pa.join('');
    if (reste(pa) === reste(va)) natures.push('initiale');
    else if (tout === tout.toUpperCase()) natures.push('capitales');
    else if (tout === tout.toLowerCase()
      || (pa[0] === pa[0].toUpperCase() && reste(pa) === reste(pa).toLowerCase())) natures.push('casse');
    else natures.push('melee');
  }
  let facteur = 1000;
  for (const n of natures) facteur = Math.round((facteur * ECARTS[n].facteur) / 1000);
  return Object.freeze({ natures: Object.freeze(natures), facteur });
}

/** L'écart dit en toutes lettres — « à la capitale initiale près ». */
export function libelleEcart(ecart, langue = 'fr') {
  if (!ecart || !ecart.natures || !ecart.natures.length) return '';
  const l = langue === 'en' ? 'en' : 'fr';
  return ecart.natures.map((n) => ECARTS[n].dit[l]).join(l === 'en' ? ' and ' : ' et ');
}

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
