/**
 * Le catalogue — grammaire des codes, **gel des codes publiés**, pureté.
 *
 * Le tableau `VECTEURS` est le test de non-régression exigé par CONTRACTS §4.1 :
 * un vecteur `code → entrée → sortie` par opérateur publié. Changer le
 * comportement d'un code casse ce test — et la règle est alors d'**allouer un
 * nouveau code** en dépréciant l'ancien, jamais de modifier celui-ci : les liens
 * partagés doivent continuer à rejouer la même démonstration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOGUE, PAR_CODE, PAR_ID, appliquer, appliquerProgramme, etapes, idsApres, derouler,
  rangCode, ORDRE_CANONIQUE, operateursActifs, operateursDepuis, JOKER, LANGUES,
} from './catalogue.js';
import { RE_CODE } from './transformations/commun.js';
import {
  depuisSaisie, tokens, nums, num, NUM_MIN, NUM_MAX, estEtat,
} from './etat.js';

const S = (v) => depuisSaisie(v);
const T = (v) => tokens(v, v.map((_, i) => [[i, i + 1]]));
const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const U = (v) => num(v, [[0, 1]]);
const HOPE = ['h', 'o', 'p', 'e'];

/**
 * ★ Registre gelé — `code`, état d'entrée, valeur de sortie attendue.
 * Les valeurs des mappeurs sont celles de `research §2.3` / `§3.1`, aux écarts
 * assumés de `tables/derivees.js` près : `mexb` (extrémités bas de casse) rend
 * `3` pour le `h` et `2` pour le `p`.
 *
 * ⚠️ **UN VECTEUR A BOUGÉ LE JOUR OÙ LES TRACÉS SONT DEVENUS DES RELEVÉS**, et
 *   c'est exactement ce que ce registre existe pour dire : `mexb` sur « hope »
 *   rendait `[3, 0, 1, 1]`, il rend `[3, 0, 2, 1]`. Le `p` a deux pointes dans
 *   JetBrains Mono — son jambage descend sous la panse, son fût monte au-dessus
 *   — là où le `p` dessiné à la main n'en avait qu'une. Un lien publié qui
 *   passait par cet opérateur sur cette lettre ne rendra donc plus le même
 *   nombre. C'est le prix, connu d'avance, de tracés qui ressemblent enfin aux
 *   lettres affichées : « le glyphe qui est mené dans la zone de traçage devrait
 *   correspondre à celui qui est tracé » (l'auteur). Les deux autres mappeurs de
 *   glyphes — `mtrb` et `mbob` — rendent, eux, exactement ce qu'ils rendaient.
 */
const VECTEURS = [
  ['fp', S('https://hope.fr'), 'hope.fr'],
  ['fw', S('www.hope.fr'), 'hope.fr'],
  ['ftld', S('hope.fr'), 'hope'],
  ['fav', S('hope.fr/a/b'), 'hope.fr'],
  ['fap', S('hope.fr/a/b'), 'a/b'],
  // ★ Les trois découpes NOMMÉES, sur la même adresse que leurs aînées — c'est
  //   la comparaison qui les définit. `fav` rendrait ici « hope.fr » comme
  //   `fdom`, mais préfixez l'adresse de « https:// » et `fav` garde le
  //   protocole quand `fdom` le laisse : ils ne disent pas la même chose.
  ['fdom', S('https://hope.fr/a/b'), 'hope.fr'],
  ['fchm', S('hope.fr/a/b'), 'a'],
  ['fpag', S('hope.fr/a/b'), 'b'],
  // ★ Le jumeau de `fl`, et le vecteur porte les deux matières : « c01111984! »
  //   a une lettre devant, un point d'exclamation derrière, et huit chiffres au
  //   milieu. C'est exactement la saisie qui ne trouvait rien avant lui.
  ['fch', S('c01111984!'), '01111984'],
  /* ★ Les quatre retraits GRAMMATICAUX. Chacun emporte sa classe ENTIÈRE — c'est
     ce qui les distingue d'une suppression arbitraire : `fart` ne peut pas
     prendre « le » en laissant « la ». Et `faux` s'arrête à être et avoir :
     « J'ai un chat » perd son `ai`, « J'aime un chat » ne perd rien, parce que
     `aime` n'est pas générique (l'auteur). */
  ['fart', S('le chat mange la souris'), ' chat mange  souris'],
  ['fprp', S('la souris par le chat'), 'la souris  le chat'],
  ['fcnj', S('le chat et la souris'), 'le chat  la souris'],
  ['faux', S('j ai un chat'), 'j  un chat'],
  ['fl', S('h0pe-2'), 'hpe'],
  ['fv', S('hope'), 'oe'],
  ['fvy', S('hopey'), 'oey'],
  ['fc', S('hope'), 'hp'],
  ['fd', S('hello'), 'helo'],
  // Les quatre cadets : même règle, autre rang du survivant. Sur « hello »,
  // le second « l » est en 4ᵉ position — au-delà, on prend le dernier.
  ['fd2', S('hello'), 'helo'],
  ['fd3', S('hello'), 'helo'],
  ['fd4', S('hello'), 'helo'],
  ['fd5', S('hello'), 'helo'],
  // Les deux « l » s'annulent l'un l'autre : il n'en reste aucun.
  ['fpr', S('hello'), 'heo'],
  ['fun', S('hello'), 'heo'],
  ['fr', S('hello'), 'll'],
  ['fi', S('le chat dort'), 'lcd'],
  ['fmr', S('hope-hope-hope'), 'hope'],
  // ★ « espérer », et pas « espoir ». Le dictionnaire n'est plus une liste
  //   écrite ici : il est extrait de FreeDict (`src/gfx/freedict-traduction.py`),
  //   et c'est FreeDict qui donne le verbe en première acception. Le gel note
  //   donc ce que la source dit, pas ce qui nous arrangerait — c'était tout
  //   l'intérêt d'aller chercher un dictionnaire dehors.
  ['ffr', S('hope'), 'espérer'],
  // Les acceptions suivantes du même mot : le verbe, son synonyme, le nom.
  ['ffr2', S('hope'), 'souhaiter'],
  ['ffr3', S('hope'), 'espérance'],
  ['ffr4', S('light'), 'lumineux'],
  ['ffr5', S('light'), 'lumière'],
  ['fen', S('espoir'), 'hope'],
  ['fen2', S('temps'), 'while'],
  ['fen3', S('temps'), 'weather'],
  ['fen4', S('abaisser'), 'lower'],
  ['fen5', S('abaisser'), 'abate'],

  ['fmaj', S('hope'), 'HOPE'],
  ['fmin', S('HOPE'), 'hope'],
  ['fac', S('créé'), 'cree'],
  ['flt', S('h0p3'), 'hope'],
  ['fatb', S('hope'), 'slkv'],
  ['fr13', S('hope'), 'ubcr'],
  // ★ Les vingt-quatre autres décalages, gelés comme le treizième. Les sorties
  //   sont calculées ici À LA MAIN — `hope` décalé de n — précisément pour
  //   qu'elles ne viennent pas de la même fonction que ce qu'elles vérifient.
  ['fr1', S('hope'), 'ipqf'],
  ['fr2', S('hope'), 'jqrg'],
  ['fr3', S('hope'), 'krsh'],
  ['fr4', S('hope'), 'lsti'],
  ['fr5', S('hope'), 'mtuj'],
  ['fr6', S('hope'), 'nuvk'],
  ['fr7', S('hope'), 'ovwl'],
  ['fr8', S('hope'), 'pwxm'],
  ['fr9', S('hope'), 'qxyn'],
  ['fr10', S('hope'), 'ryzo'],
  ['fr11', S('hope'), 'szap'],
  ['fr12', S('hope'), 'tabq'],
  ['fr14', S('hope'), 'vcds'],
  ['fr15', S('hope'), 'wdet'],
  ['fr16', S('hope'), 'xefu'],
  ['fr17', S('hope'), 'yfgv'],
  ['fr18', S('hope'), 'zghw'],
  ['fr19', S('hope'), 'ahix'],
  ['fr20', S('hope'), 'bijy'],
  ['fr21', S('hope'), 'cjkz'],
  ['fr22', S('hope'), 'dkla'],
  ['fr23', S('hope'), 'elmb'],
  ['fr24', S('hope'), 'fmnc'],
  ['fr25', S('hope'), 'gnod'],
  ['tca', S('hope'), ['h', 'o', 'p', 'e']],
  ['tm', S('a-b.c'), ['a', 'b', 'c']],
  ['tsp', S('a-b.c'), ['-', '.']],
  ['tsy', S('espoir'), ['es', 'poir']],
  ['tch', U(44), [4, 4]],
  ['nl', S('hope'), 4],
  ['nv', S('hope'), 2],
  ['nc', S('hope'), 2],
  ['nd', S('hello'), 4],
  // ★ « a-b.c » ne porte que des signes que l'ancienne définition connaissait
  //   déjà : le gel ne bouge donc pas, alors même que le compte a changé sur
  //   les adresses (voir `n.separateurs`, le `:` manquait).
  ['nsp', S('a-b.c'), 2],
  // Les quatre compteurs précis, sur une saisie qui porte les quatre signes.
  ['nsl', S('a/b c-d.e/f'), 2],
  ['npt', S('a/b c-d.e/f'), 1],
  ['nes', S('a/b c-d.e/f'), 1],
  ['ntr', S('a/b c-d.e/f'), 1],
  ['nm', S('a-b.c'), 3],
  ['nlv', S('hope'), 6],
  ['nlc', S('hope'), 6],
  ['ma1', T(HOPE), [8, 15, 16, 5]],
  ['mz26', T(HOPE), [19, 12, 11, 22]],
  ['mpy', T(HOPE), [8, 6, 7, 5]],
  ['mch', T(HOPE), [5, 7, 8, 5]],
  ['mx6', T(HOPE), [48, 90, 96, 30]],
  ['msfr', T(HOPE), [4, 1, 3, 1]],
  ['msen', T(HOPE), [4, 1, 3, 1]],
  ['mt9', T(HOPE), [4, 6, 7, 3]],
  ['mms', T(HOPE), [4, 3, 4, 1]],
  ['mmt', T(HOPE), [0, 3, 2, 0]],
  ['masc', T(HOPE), [72, 79, 80, 69]],
  ['masb', T(HOPE), [104, 111, 112, 101]],
  ['m7', T(HOPE), [5, 6, 5, 5]],
  ['m7F', T(HOPE), [3, 4, 4, 4]],
  ['mtrc', T(HOPE), [3, 1, 2, 4]],
  ['mtrb', T(HOPE), [2, 1, 2, 2]],
  ['mexc', T(HOPE), [4, 0, 1, 3]],
  ['mexb', T(HOPE), [3, 0, 2, 1]],
  // ★ **LA SECONDE LECTURE, SUR LES MÊMES QUATRE LETTRES.** Jost dessine sans
  //   empattement et compte ses traits d'un seul geste, ce qui se voit d'un coup
  //   d'œil sur les capitales : `mtrc` rend [3,1,2,4] pour « HOPE », `mtjc` rend
  //   [3,1,1,2] — le `P` de Jost se trace d'une traite (son fût et sa panse se
  //   rejoignent aux deux bouts) et son `E` en deux gestes au lieu de quatre.
  //   Les EXTRÉMITÉS, elles, se suivent de très près : [3,0,2,1] des deux côtés
  //   en bas de casse. C'est tout l'enseignement de la variante — elle déplace
  //   les traits, presque pas les extrémités.
  ['mtjc', T(HOPE), [3, 1, 1, 2]],
  ['mtjb', T(HOPE), [2, 1, 2, 1]],
  ['mejc', T(HOPE), [4, 0, 1, 3]],
  ['mejb', T(HOPE), [3, 0, 2, 1]],
  ['mboc', T(HOPE), [0, 1, 1, 0]],
  ['mbob', T(HOPE), [0, 1, 1, 1]],
  ['mazc', T(HOPE), [6, 9, 10, 3]],
  ['mazr', T(HOPE), [2, 1, 1, 1]],
  ['mqwc', T(HOPE), [6, 9, 10, 3]],
  ['mqwr', T(HOPE), [2, 1, 1, 1]],
  // ★ Les mêmes touches, comptées depuis la rangée des CHIFFRES : chaque valeur
  //   monte d'exactement un cran. C'est le contrôle qui dit que les deux
  //   conventions mesurent bien la même chose — et donc qu'elles ne peuvent pas
  //   cohabiter dans une voie (`recherche/bfs.js › conventionContraire`).
  ['maz4', T(HOPE), [3, 2, 2, 2]],
  ['mqw4', T(HOPE), [3, 2, 2, 2]],
  ['mhe', T(HOPE), [8, 70, 80, 5]],
  ['mgr', T(HOPE), [8, 70, 80, 5]],
  ['mln', T(HOPE), [5, 1, 2, 1]],
  ['mlm', T(['hope', 'fr']), [4, 2]],
  ['mrn', N([44, 15]), [8, 6]],
  ['m0', N([8, 0, 15]), [8, 15]],
  // ★ « le tiret du 6 » : les deux séparateurs de hope-hope-hope valent 6 et 6.
  ['mtc', T(['-', '-']), [6, 6]],
  // ★ Quatorze segments. `HOPE` y vaut 6·6·6·6 — sept lettres valent 6 segments
  // (`D E G H N O P`) contre deux en sept segments. Les traits fusionnés, eux,
  // retombent sur 3·4·4·4, le vecteur même de la méthode 5 du README : deux
  // afficheurs, deux dessins, un seul compte.
  ['m14', T(HOPE), [6, 6, 6, 6]],
  ['m14F', T(HOPE), [3, 4, 4, 4]],
  // ★ « On retourne les 9 » — le pendant vectoriel de `pr9`. Les 9 deviennent
  // des 6, tout le reste est laissé strictement en place, y compris le −9 :
  // un demi-tour ne sait rien faire d'un signe.
  ['mr9', N([3, 9, 6, -9]), [3, 6, 6, -9]],
  // ★ **L'ENTRÉE DU CATALOGUE EST CELLE BÂTIE SUR `999`**, sa visée de
  //   référence : c'est elle que `PAR_CODE` porte, et c'est donc son geste que
  //   le registre gèle — le miroir exact de `mr9` juste au-dessus. Ce que 666 en
  //   fait est une autre question, et `classerPourCible` y répond DESACTIVE.
  ['mr6', N([3, 9, 6, -9]), [3, 9, 9, -9]],
  // ★ « Trois 6 d'affilée » — le 666 est DÉJÀ écrit dans le vecteur, contigu ;
  // on le garde et l'on efface le reste. Ce n'est pas un tri : trois 6 dispersés
  // ne conviennent pas (voir le test dédié plus bas).
  ['m36', N([6, 6, 6, 7, 3, 6]), [6, 6, 6]],
  // ★ LES TROIS FICELLES ASSUMÉES — codes neufs, alloués le registre FERMÉ
  // (CONTRACTS §4.1), aux trois rangs qui suivent `m36`. Les trois vecteurs
  // sont EXACTEMENT les cas que l'auteur a
  // nommés dans sa demande, et c'est délibéré : ce qui est gelé ici, c'est ce
  // qu'il a demandé, pas ce que l'implémentation a trouvé commode.
  //
  // « Le plus fréquent l'emporte » : sur `[6,4,6,6,6]`, le 4 s'en va.
  ['mpf', N([6, 4, 6, 6, 6]), [6, 6, 6, 6]],
  // « Garder un caractère sur deux » : sur `[4,6,4,6,4,6,4]`, c'est la parité
  // des rangs PAIRS (2ᵉ, 4ᵉ, 6ᵉ) qui porte les trois 6, et c'est elle qui reste.
  ['m1s2', N([4, 6, 4, 6, 4, 6, 4]), [6, 6, 6]],
  // « L'addition sélective » : `6, 5, 16, 8` → `6, 5+1, 6, 8` → `666, 8`.
  ['mad', N([6, 5, 16, 8]), [6, 6, 6, 8]],
  // ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT — codes neufs, alloués la clôture
  // du registre LEVÉE (CONTRACTS §4.1, amendement du 27 août 2026 : aucun lien
  // n'avait été diffusé), aux quatre rangs qui suivent `mad`.
  // Les vecteurs sont, mot pour mot, les exemples chiffrés de l'auteur.
  //
  // « Tri croissant » : `95956636494` → `34455666999` — trois 6 qui étaient
  // dispersés deviennent contigus, sans que rien ne soit écarté.
  ['mtal', T(['M', 'a', 'c', 'r', 'o', 'n']), ['a', 'c', 'M', 'n', 'o', 'r']],
  ['meg', N([8, 15, 16, 5]), [11, 11, 11, 11]],
  ['mtri', N([9, 5, 9, 5, 6, 6, 3, 6, 4, 9, 4]), [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]],
  // « On retourne les 666 qui se cachent » : par TRIO contigu, jamais un par
  // un. Quatre 9 d'affilée n'en donnent que trois ; les 9 isolés ne bougent pas.
  ['mr39', N([9, 9, 9, 9, 3, 9]), [6, 6, 6, 9, 3, 9]],
  // « On compte les chiffres » : `34455666999` → `1324253639` — un 3, deux 4,
  // deux 5, trois 6, trois 9.
  ['mcc', N([3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]), [1, 3, 2, 4, 2, 5, 3, 6, 3, 9]],
  // « Le redécoupage tricheur » : LES TRENTE CHIFFRES DE L'AUTEUR, pris tels
  // qu'il les écrit, et la sortie qu'il a lui-même calculée à la main —
  // `999991691662692`. Coupe pour coupe : `999 7+1+1 2+1+0+5+1 1 6 9 7+1+0+8
  // 1+0+5 1+1 5+1+0 9 1+0+1`.
  //
  // Le vecteur gèle donc les deux règles qui ont corrigé le calcul : un 9 vaut
  // un 6 acquis (`mr9` le retournera), donc il ne s'absorbe pas et un paquet
  // qui tombe dessus compte ; et la somme d'un paquet s'écrit TELLE QU'ELLE
  // TOMBE — `7+1+0+8 = 16` rend « 1 6 » et non « 7 », qui perdrait le 6 qu'on
  // venait de fabriquer.
  // (Et il gèle la borne basse : `mrd` refuse en deçà de vingt-cinq chiffres.)
  ['mrd', N('9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number)),
    [9, 9, 9, 9, 9, 1, 6, 9, 1, 6, 6, 2, 6, 9, 2]],
  // ★ LA LECTURE, qui n'est pas une conversion : chaque chiffre vaut lui-même.
  //   UN chiffre par jeton — « 24 » d'un coup serait déjà assembler, et la scène
  //   l'a dit (voir `RE_UN_CHIFFRE`). Les refus sont éprouvés plus bas.
  ['m09', T(['9', '0', '2', '6']), [9, 0, 2, 6]],
  // ★ Le seul opérateur qui remonte le courant : un nombre redevient du texte.
  //   Le nom sort de `NOM_CHIFFRE_FR`, la table du joker `jnf` — une seule
  //   source pour les deux, donc jamais deux orthographes du même chiffre.
  ['mlet', U(7), 'sept'],
  // ★ L'ABSORPTION ARITHMÉTIQUE : la cible écrite exactement, rien de jeté.
  //   `64 5 6 64` s'éclate en `6 4 5 6 6 4`, découpé `6 · 456 · 64` : le
  //   premier 6 reste, `4+5+6 = 15 → 6`, et `6 × 4 = 24 → 6` — la somme, la
  //   réduction et le produit sur un seul vecteur, et `666` au bout sans
  //   qu'un seul chiffre ne tombe.
  ['mab', N([64, 5, 6, 64]), [6, 6, 6]],
  // ★ Le redécoupage EXACT : toute la ligne, et la cible sans un chiffre de
  //   plus. `6 · 5+1 · 9+3+3` — le 6 reste seul, `5+1` fait 6, et `9+3+3 = 15`
  //   se RÉDUIT à 6 (racine numérique) : un chiffre de la cible qui absorbe
  //   des voisins dont la somme est un multiple de neuf ressort intact. Aucun
  //   chiffre n'est laissé de côté.
  ['mrdE', N([6, 5, 1, 9, 3, 3]), [6, 6, 6]],
  // ★ Les deux absorptions mono-opération, sur la même ligne que `mab` :
  //   `6 · 456 · 64` — le 6 reste, `4+5+6 = 15 → 6`, puis `6 × 4 = 24 → 6`
  //   pour le produit ; la différence prend une autre coupe.
  ['mabx', N([64, 5, 6, 64]), [6, 6, 6]],
  // ★ La différence a besoin d'une autre ligne — et c'est tout le propos de la
  //   séparer du produit : `9−3 = 6` trois fois, là où le produit ne saurait
  //   rien faire de `9 3`. Une opération annoncée d'avance ne s'applique pas
  //   partout, et c'est ce qui la distingue d'une sélection ad hoc.
  ['mabd', N([9, 3, 9, 3, 9, 3]), [6, 6, 6]],
  /* ★ Les deux modulos. La découpe est celle de l'auteur : le DERNIER chiffre
     est le diviseur, tout ce qui précède est le dividende — `135` se lit
     `13 % 5`, et le reste est 3. Le catalyseur garde son diviseur sur la ligne,
     l'autre le dissout. */
  ['mmod', N([135]), [3]],
  ['mmoc', N([135]), [3, 5]],
  /* ★ Les deux divisions, même découpe : `135` se lit `13 / 5`, soit deux et
     reste trois. L'une garde les deux côte à côte — « 13/5 → 23 » (l'auteur) —,
     l'autre laisse le reste s'effacer avec l'accolade. */
  ['mdiv', N([135]), [2, 3]],
  ['mdvq', N([135]), [2]],
  /* ★ Les trois divisions décimales, et l'exemple est celui de l'auteur :
     `23 → 2/3 → 0,666 → 0 6 6 6`. La virgule ne se garde pas. On s'arrête dès
     que ça tombe juste — `135` vaut `2,6` même quand trois décimales sont
     permises. */
  // ★ SANS zéro initial depuis que l'auteur a doublé la famille : `2 ÷ 3` ne
  //   s'écrit plus `0 6 6 6` mais `6 6 6`. Le gel CHANGE ici, et c'est voulu —
  //   l'ancien comportement a pris les codes `md0*`, gelés plus bas.
  ['mdc1', N([23]), [6]],
  ['mdc2', N([23]), [6, 6]],
  ['mdc3', N([23]), [6, 6, 6]],
  /* ★ La division qui laisse le RESTE DEVANT. « Le résultat n'est pas le même :
     13/5 → 23, 13/5 → 32 » (l'auteur) — deux gestes, deux lignes, deux nombres,
     et non deux animations d'un même résultat. */
  ['mdvr', N([135]), [3, 2]],
  // ★ LE RANG QUI REDEVIENT LETTRE — l'inverse de `ma1`, rien au-delà de 26,
  //   en bas de casse : une lettre relue n'a pas de casse à elle.
  ['m1a', N([26, 5, 18, 7]), ['z', 'e', 'r', 'g']],
  // ★ UNE TOUCHE DÉSIGNÉE PAR DEUX NOMBRES — colonne, puis rangée.
  ['mcaz', N([2, 1, 3, 1, 4, 1, 5, 2]), ['z', 'e', 'r', 'g']],
  ['mcqw', N([1, 3, 3, 1, 4, 1, 5, 2]), ['z', 'e', 'r', 'g']],
  // ★ LA POTENCE AVEC SES ZÉROS DE TÊTE — ce que `mdc*` rendait avant que
  //   l'auteur ne double la famille : `2 ÷ 3` s'écrit `0 6 6 6`, « 0×3 dans 2 ».
  ['md01', N([23]), [0, 6]],
  ['md02', N([23]), [0, 6, 6]],
  ['md03', N([23]), [0, 6, 6, 6]],
  // ★ LA DIVISION DE DEUX NOMBRES — le vecteur même de l'auteur : « James »
  //   donne 126, « Bond » 18, et 126 ÷ 18 s'écrit `0 0 7` avec ses zéros de
  //   tête, `7` sans.
  ['mdl0', N([126, 18]), [0, 0, 7]],
  ['mdlc', N([126, 18]), [7]],
  // ★ LES RELECTURES PAR PAIRES — deux petits chiffres pour une lettre.
  ['m1a2', N([2, 6, 0, 5, 1, 8, 0, 7]), ['z', 'e', 'r', 'g']],
  ['mpol', N([5, 5, 1, 5, 4, 2, 2, 2]), ['z', 'e', 'r', 'g']],
  ['mtap', N([9, 4, 3, 2, 7, 3, 4, 1]), ['z', 'e', 'r', 'g']],
  ['masi', N([1, 2, 2, 1, 0, 1, 1, 1, 4, 1, 0, 3]), ['z', 'e', 'r', 'g']],
  ['mast', T([...'fr/']), [102, 114, 47]],
  ['mecl', N([13924, 7, 25]), [1, 3, 9, 2, 4, 7, 2, 5]],
  // Le carré : trois chiffres deviennent cinq, et c'est tout ce qu'on lui demande.
  ['mcar', N([115, 97, 114]), [13225, 9409, 12996]],
  // La puissance regarde le PREMIER CHIFFRE du nombre suivant — 5², puis 2⁵,
  // le dernier revenant au premier.
  ['mpui', N([5, 2]), [25, 32]],
  // La factorielle s'écrit comme elle se calcule : 4 × 3 × 2 × 1, puis 3 × 2 × 1.
  ['mfac', N([4, 3]), [24, 6]],
  ['cs', N([8, 15, 16, 5]), 44],
  ['cst', N([8, 15, 16, 5]), -28],
  ['cp', N([8, 15, 16, 5]), 9600],
  ['cal', N([8, 15, 16, 5]), 4],
  // ★ L'autre phase de la même alternance : `−8 +15 −16 +5`. Elle vaut
  //   exactement l'opposé de la précédente, ce qui est la définition même de
  //   « commencer par retrancher » — et ce que le gel doit tenir, parce que
  //   c'est ce qui rend les deux codes distinguables dans un lien.
  ['cali', N([8, 15, 16, 5]), -4],
  ['cmm', N([8, 15, 16, 5]), 11],
  ['cmo', N([8, 15, 16, 5]), 11],
  ['cmod', N([8, 15, 16, 5]), 11],
  // ★ La médiane, sur le MÊME vecteur que la moyenne — c'est la comparaison
  //   qui la définit. Rangé, `8 15 16 5` donne `5 8 15 16` : les extrêmes 5
  //   et 16 s'annulent, restent 8 et 15, dont la demi-somme arrondie vaut 12.
  //   La moyenne, elle, dit 11 — et l'écart est tout le sujet.
  ['cme', N([8, 15, 16, 5]), 12],
  ['cnv', N([8, 15, 16, 5]), 4],
  ['ccat', N([8, 15, 16, 5]), 815165],
  ['cmx', N([8, 15, 16, 5]), 16],
  ['cmn', N([8, 15, 16, 5]), 5],
  ['cnj', T(HOPE), 4],
  ['cnjd', T(['a', 'a', 'b']), 2],
  ['prn', U(44), 8],
  ['psc', U(44), 8],
  ['pabs', U(-28), 28],
  ['prs', U(-28), 6],
  ['pec', U(28), 6],
  ['pmr', U(28), 82],
  ['pc9', U(3), 6],
  ['pm9', U(44), 8],
  ['pr9', U(9), 6],
  ['prm', U(29), 11],
  ['pm10', U(44), 4],
  ['jnf', U(4), 6],
];

/**
 * ★ Gestes dédiés du vocabulaire fermé (CONTRACTS §0.3 / §3.1).
 *
 * Ces méthodes comptent quelque chose de VISIBLE : le spectateur doit voir
 * l'afficheur s'allumer, ou le glyphe se redessiner trait par trait. Retomber
 * sur une substitution commentée serait une régression silencieuse — la
 * démonstration continuerait de « marcher », mais elle cesserait de prouver.
 */
const PRIMITIVE_ATTENDUE = Object.freeze({
  ma1: 'table', mz26: 'table', mpy: 'table', mch: 'table', mx6: 'table',
  msfr: 'table', msen: 'table', mt9: 'table', mms: 'table', mmt: 'table',
  masc: 'table', masb: 'table', mhe: 'table', mgr: 'table', mln: 'table',
  m7: 'sevenSeg', m7F: 'sevenSeg',
  m14: 'fourteenSeg', m14F: 'fourteenSeg',
  mtrc: 'countStrokes', mtrb: 'countStrokes', mexc: 'countStrokes',
  mexb: 'countStrokes', mboc: 'countStrokes', mbob: 'countStrokes',
  mazc: 'keyboard', mazr: 'keyboard', mqwc: 'keyboard', mqwr: 'keyboard',
  mtc: 'keyboard',
  // ★ `m36` n'émet plus `horns`. Les cornes ne sont plus le geste d'un
  //   OPÉRATEUR — elles ne changent aucune valeur, elles n'ont donc rien à
  //   faire dans un programme ni dans une URL —, et l'assemblage les pose
  //   désormais sur la ligne, en registre scénique
  //   (`recherche/scenario.js › couronnerLesTriptyques`). Ce qui reste ici est
  //   la seule moitié qui soit de l'arithmétique : la gomme qui tronque le
  //   vecteur à ses trois 6 contigus.
  m36: 'drop',
  // ★ Le tri croissant ne substitue rien et n'efface rien : il DÉPLACE. Le
  //   geste dédié est donc `move`, la primitive du réarrangement — sans elle,
  //   le rangement serait affirmé par une légende au lieu d'être montré.
  mtri: 'move',
  //   Le redécoupage tricheur doit montrer sa DÉCISION, c'est-à-dire la
  //   découpe : `partition` trace une accolade par paquet avant que la moindre
  //   addition ne soit faite. Une triche qu'on cache est pire qu'une triche
  //   qu'on n'implémente pas (CONTRACTS §4.1, amendement des trois ficelles).
  mrd: 'partition',
  //   L'absorption arithmétique montre d'abord sa découpe, pour la même raison
  //   — et c'est la seule primitive qu'on lui impose : ce qui suit (sommes,
  //   produits, différences, réductions) dépend de la ligne.
  mab: 'partition',
  // Le redécoupage EXACT montre sa découpe de la même façon — une accolade par
  // paquet, avant la moindre addition —, et la seconde passe la remontre.
  mrdE: 'partition',
  mabx: 'partition',
  mabd: 'partition',
  // Le rang qui redevient lettre se montre sur la réglette, lue à rebours.
  m1a: 'table',
  // La touche désignée par deux nombres se montre sur le clavier, ses deux
  // repères dessinés (mesure « coordonnees »).
  mcaz: 'keyboard', mcqw: 'keyboard',
  // Les relectures par paires : on colle la paire, puis la case de la table
  // rend sa lettre.
  m1a2: 'table', mpol: 'table', mtap: 'table',
  // Le code ASCII : on colle les trois chiffres, puis la case rend son signe.
  masi: 'table',
  // Le code ASCII de chaque signe : une case par signe, désignée par son code.
  mast: 'table',
});

/**
 * Le vocabulaire fermé des ops — CONTRACTS §3.1, vingt et une primitives, pas
 * une de plus. Le socle de dix-sept, plus `partition` (découper en
 * sous-groupes), `table` (la table de correspondance affichée — réglette,
 * glissière ou pavé), `fourteenSeg` (l'afficheur quatorze segments) et `horns`
 * (les cornes du 666 déjà formé), ajoutées selon la clause d'extension du
 * contrat.
 */
const OPS_AUTORISEES = new Set([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns', 'merge', 'shift', 'collapse', 'fraction',
  // ★ La division POSÉE — la potence de l'école primaire, seule disposition où
  //   l'on voit pourquoi le quotient s'écrit de gauche à droite.
  'potence',
]);

test('grammaire, unicité et ordre du registre (CONTRACTS §4.1)', () => {
  const vus = new Set();
  let precedent = 0;
  for (const op of CATALOGUE) {
    assert.match(op.code, RE_CODE, `code hors grammaire : ${op.code}`);
    assert.ok(!vus.has(op.code), `code dupliqué : ${op.code}`);
    vus.add(op.code);
    const r = rangCode(op.code);
    assert.ok(r !== null && r > precedent, `ordre de déclaration rompu en ${op.code}`);
    precedent = r;
  }
  assert.equal(vus.size, CATALOGUE.length, 'cent codes, cent opérateurs');
  assert.equal(rangCode('z1'), null, 'préfixe de famille inconnu');
  assert.equal(rangCode('mzz'), null, 'code de bonne grammaire mais jamais alloué');
  assert.equal(rangCode('m14f'), null, 'la casse compte : « m14f » n’est pas « m14F »');
  assert.equal(rangCode('M14F'), null, 'la lettre de famille est en bas de casse');
  assert.equal(rangCode('m14FF'), null, 'une seule majuscule de variante, et en fin de code');
});

/**
 * ★ **L'unicité des codes est EXIGÉE, pas relue.** Le test ci-dessus la vérifie
 * sur le catalogue tel qu'il est ; celui-ci la vérifie sur le REGISTRE, qui est
 * la liste où un code neuf s'écrit. Les deux sont nécessaires : un doublon
 * inscrit au registre sans opérateur derrière ne se verrait nulle part ailleurs,
 * et c'est précisément la faute qu'un renommage de masse peut commettre.
 *
 * ★ Et il vérifie la longueur, parce que c'est une consigne de l'auteur et non
 * un goût : « 2, 3 ou 4 caractères, évite d'aller au-delà ». Un code plus long
 * qu'une portée (`0.1:`) cesse d'être une abréviation.
 */
// ★ Le titre disait « cent » ; ils sont cent vingt-cinq depuis que les
//   vingt-quatre décalages de César ont rejoint le treizième
//   (`transformations/filtres.js › CESARS`). Le compte exact vit dans
//   l'assertion, pas dans le titre — c'est elle qui doit rougir, pas lui.
test('le registre : des codes distincts, de deux à quatre signes (CONTRACTS §4.1)', () => {
  assert.equal(ORDRE_CANONIQUE.length, 193); // …+1 éclatement en chiffres (mecl), +1 code ASCII de chaque signe (mast), +1 code ASCII en signe (masi), +1 carré (mcar), +1 puissance (mpui), +1 factorielle (mfac), +1 rang en lettre (m1a), +2 touches par coordonnées (mcaz, mcqw), +3 potences à zéros de tête (md0*), +2 divisions de deux nombres (mdl0, mdlc), +3 relectures par paires (m1a2, mpol, mtap)
    assert.equal(new Set(ORDRE_CANONIQUE).size, 193, 'aucun code alloué deux fois');
  assert.deepEqual(ORDRE_CANONIQUE, CATALOGUE.map((o) => o.code),
    'le registre et l’ordre de déclaration disent la même chose');
  for (const code of ORDRE_CANONIQUE) {
    assert.match(code, RE_CODE, `code hors grammaire : ${code}`);
    assert.ok(code.length >= 2 && code.length <= 4, `${code} : ${code.length} signes, hors de [2,4]`);
  }
  // Deux codes qui ne diffèrent que par la casse seraient deux pièges : l'un
  // pour l'œil, l'autre pour toute lecture d'URL un jour rendue tolérante.
  const replies = ORDRE_CANONIQUE.map((c) => c.toLowerCase());
  assert.equal(new Set(replies).size, 193, 'deux codes ne diffèrent jamais par la seule casse');
});

test('le code p9 est réservé au retournement du 9', () => {
  const op = PAR_CODE.get('pr9');
  assert.equal(op.id, 'p.retournement');
  assert.equal(appliquer(op, U(9)).valeur, 6);
  assert.equal(appliquer(op, U(6)), null, 'on ne retourne pas le 6');
});

/**
 * ★ `m36` — « trois 6 d'affilée » est une TROUVAILLE, pas un tri.
 *
 * Toute la valeur de cet opérateur tient dans ce qu'il REFUSE. S'il acceptait
 * des 6 non contigus, il cesserait d'être « le 666 était déjà écrit » pour
 * devenir « on ne garde que les 6 » — une étape que la doctrine du projet
 * réserve à l'avant-dernier rang et fait payer au score (CONTRACTS §3.1). Ces
 * refus sont donc le cœur du contrat, pas des cas limites.
 */
test('★ le code mz ne trouve que trois 6 CONTIGUS, et refuse tout le reste', () => {
  const op = PAR_CODE.get('m36');
  assert.equal(op.id, 'm.troisSixDAffilee');
  assert.equal(op.from, 'NUMS');
  assert.equal(op.to, 'NUMS');

  const sortie = (v) => { const r = appliquer(op, N(v)); return r && r.valeur; };

  // Ce qu'il trouve : une suite de trois, où qu'elle commence.
  assert.deepEqual(sortie([6, 6, 6, 7, 3, 6]), [6, 6, 6], 'Donald en quatorze segments');
  assert.deepEqual(sortie([6, 6, 6, 4, 4]), [6, 6, 6], 'Trump en César puis quatorze segments');
  assert.deepEqual(sortie([1, 6, 6, 6, 1]), [6, 6, 6], 'la suite peut être au milieu');

  // Ce qu'il refuse, et c'est le point : des 6 SÉPARÉS, même nombreux.
  assert.equal(sortie([6, 6, 7, 6]), null, 'trois 6 dont deux voisins ne font pas un 666');
  assert.equal(sortie([6, 1, 6, 1, 6, 1, 6]), null, 'quatre 6 dispersés : toujours pas');
  assert.equal(sortie([6, 6]), null, 'deux 6 ne font pas trois');
  assert.equal(sortie([6, 6, 7, 6, 6]), null, 'deux paires ne font pas un triplet');

  // Et il refuse aussi de ne rien faire : sans reste à effacer, l'étape
  // n'aurait rien à montrer, et l'URL porterait un code invisible à l'écran.
  assert.equal(sortie([6, 6, 6]), null, 'un vecteur déjà réduit n’a pas besoin de l’être');

  // Déterminisme : plusieurs suites, on prend LA PREMIÈRE — lire, pas comparer.
  // Les traces le prouvent mieux que les valeurs, qui sont identiques.
  const r = appliquer(op, N([7, 6, 6, 6, 1, 6, 6, 6]));
  assert.deepEqual(r.valeur, [6, 6, 6]);
  assert.deepEqual(r.origines.map((t) => t[0][0]), [1, 2, 3], 'la première suite, pas la seconde');

  // Une suite plus longue est ramenée à trois : 666 fait trois 6, pas quatre,
  // et le verdict se refuse à décider lui-même où couper (`reveal.js`).
  assert.deepEqual(sortie([6, 6, 6, 6]), [6, 6, 6]);
});

/**
 * ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT — et ce que chacune REFUSE.
 *
 * Comme pour `m36`, la valeur de ces opérateurs tient d'abord dans leurs refus :
 * un mappeur qui rend son entrée, ou qui s'applique sans rien acheter, fabrique
 * une étape que `scenario.js` saute EN SILENCE — et l'URL porte alors un code
 * que la démonstration ne montre nulle part. Chaque refus ci-dessous ferme une
 * de ces portes, et les exemples chiffrés sont ceux de l'auteur.
 */
test('★ les quatre transformations du 27 août — ce qu’elles font, et ce qu’elles refusent', () => {
  const sortie = (code, v) => {
    const r = appliquer(PAR_CODE.get(code), N(v));
    return r && r.valeur;
  };

  // ── m13, « Tri croissant » ────────────────────────────────────────────────
  // L'exemple de l'auteur, mot pour mot : trois 6 dispersés deviennent contigus.
  assert.deepEqual(sortie('mtri', [9, 5, 9, 5, 6, 6, 3, 6, 4, 9, 4]),
    [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9], 'l’exemple de l’auteur');
  // Un vecteur déjà rangé n'a rien à montrer.
  assert.equal(sortie('mtri', [1, 2, 3]), null, 'déjà croissant : rien à déplacer');
  /* ★ **CE QUE LE TRI DOIT RASSEMBLER N'EST PLUS JUGÉ ICI.** « Ranger ne réunit
       personne » et « la plage existe déjà » sont des jugements d'UTILITÉ —
       est-ce que ce geste vaut la peine d'être cherché ? —, et c'est une
       politique de recherche : elle a été recalibrée trois fois tant qu'elle
       vivait dans le moteur. Elle est tenue par
       `recherche/tests/politique.test.js`, sur les mêmes vecteurs. Le moteur, lui,
       garde l'invariant : un tri qui ne déplace rien n'est pas une étape. */
  assert.deepEqual(sortie('mtri', [3, 1, 2]), [1, 2, 3],
    'le moteur range : c’est la recherche qui dira si ça valait la peine');
  assert.deepEqual(sortie('mtri', [6, 4, 6, 1, 6]), [1, 4, 6, 6, 6],
    'trois 6 dispersés, réunis — et le départage à valeur égale suit l’ordre de lecture');

  // ── m14, « On retourne les 666 qui se cachent » ───────────────────────────
  // Par TRIO contigu, jamais un par un : c'est ce qui le sépare de `mr9`.
  assert.deepEqual(sortie('mr39', [9, 9, 9, 9, 3, 9]), [6, 6, 6, 9, 3, 9],
    'trois d’un bloc ; le quatrième et l’esseulé ne bougent pas');
  assert.deepEqual(sortie('mr39', [9, 9, 9, 9, 9, 9]), [6, 6, 6, 6, 6, 6],
    'six 9 d’affilée font deux trios');
  assert.equal(sortie('mr39', [9, 3, 9, 3, 9]), null,
    'trois 9 dispersés ne sont pas un 999 : c’est `mr9` qui les prendrait, pas celui-ci');
  assert.equal(sortie('mr39', [9, 9]), null, 'deux 9 ne font pas un trio');
  // ★ Aucune corne n'est émise ici : c'est `couronnerLesTriptyques`
  //   (`src/recherche/scenario.js`) qui couronne, parce que lui seul sait si le
  //   trio arrivera au verdict — et si la cible est bien 666.
  const stepsTrio = etapes(PAR_CODE.get('mr39'), N([9, 9, 9]), N([6, 6, 6]),
    { ids: ['a', 'b', 'c'], cle: 'e1', langue: 'fr' });
  assert.ok(!stepsTrio.flatMap((s) => s.ops).some((o) => o.op === 'horns'),
    'un opérateur ne couronne pas à l’aveugle : il ne sait pas ce que la suite fera de ses 6');

  /* ★ **ET LE TRIO A CHANGÉ DE MAIN : c'est `mr9` qui le montre désormais.**

     « Supprimer `mr39` et utiliser `mr9` partout où l'on veut retourner des
     neuf, mais dans l'animation, détecter s'il y a 999 contigu » (l'auteur).
     Ce qui est vérifié ici est exactement la couture entre les deux :

      · le CALCUL de `mr9` ne connaît pas les trios — tous les 9 tombent, y
        compris le quatrième et l'esseulé, que `mr39` laissait debout ;
      · le GESTE, lui, les connaît : un seul `flip180` porte les trois premiers
        (`targets`, au pluriel), et les 9 restants gardent chacun le leur
        (`target`, au singulier).

     Sans cette double lecture, la doctrine §0.3 se romprait dans un sens ou
     dans l'autre : soit la scène grouperait des chiffres que le calcul n'a pas
     groupés, soit elle montrerait trois demi-tours là où elle en annonce un. */
  assert.deepEqual(sortie('mr9', [9, 9, 9, 9, 2, 9]), [6, 6, 6, 6, 2, 6],
    'le calcul ignore les trios : tous les 9 se retournent');
  const stepsNeuf = etapes(PAR_CODE.get('mr9'), N([9, 9, 9, 9, 2, 9]), N([6, 6, 6, 6, 2, 6]),
    { ids: ['a', 'b', 'c', 'd', 'e', 'f'], cle: 'e1', langue: 'fr' });
  const demiTours = stepsNeuf.flatMap((s) => s.ops).filter((o) => o.op === 'flip180');
  assert.deepEqual(demiTours.map((o) => o.targets || o.target),
    [['a', 'b', 'c'], 'd', 'f'],
    'un bloc pour le 999 d’affilée, puis un demi-tour par 9 esseulé, dans l’ordre de la ligne');
  assert.equal(demiTours[0].to.length, 3,
    'le bloc annonce ses trois jetons d’arrivée : la primitive rend ce qu’elle a reçu');
  // Six 9 d'affilée font DEUX blocs, et pas un seul de six : on pivote un 999,
  // pas une plage. C'est `triosDeNeuf` qui le garantit, et il est partagé.
  const stepsSix = etapes(PAR_CODE.get('mr9'), N([9, 9, 9, 9, 9, 9]), N([6, 6, 6, 6, 6, 6]),
    { ids: ['a', 'b', 'c', 'd', 'e', 'f'], cle: 'e2', langue: 'fr' });
  assert.deepEqual(stepsSix.flatMap((s) => s.ops).filter((o) => o.op === 'flip180')
    .map((o) => o.targets), [['a', 'b', 'c'], ['d', 'e', 'f']], 'six 9 d’affilée font deux blocs');

  /* ★ **LA LECTURE — ce qu'elle rend, et surtout ce qu'elle REFUSE.**

     `m09` est implicite : il ne s'écrit pas dans les liens et ne se facture pas.
     Une porte gratuite doit donc être ÉTROITE, faute de quoi elle laisse passer
     gratuitement des gestes qui se paient. Ses deux refus sont son contrat.

      · une LETTRE n'a pas de valeur à rendre — lui en donner une serait la
        conversion même qu'il refuse d'être — et il écarte la ligne ENTIÈRE
        plutôt que le jeton qui le gêne : écarter est le métier des filtres ;
      · un jeton de PLUSIEURS chiffres, parce que lire « 42 » d'un coup fait
        fondre deux glyphes en un nombre. C'est un geste, il se montre, donc il
        fait une étape. La scène l'avait dit avant nous : sur `tm+m09`, le
        compilateur a refusé de réduire un token « 4 » en chiffres « 42 ». */
  const lu = (jetons) => { const r = appliquer(PAR_CODE.get('m09'), T(jetons)); return r && r.valeur; };
  assert.deepEqual(lu(['0', '1', '9', '8', '4']), [0, 1, 9, 8, 4],
    'une date de naissance, lue chiffre par chiffre');
  assert.equal(lu(['h', 'o', 'p', 'e']), null, 'des lettres : rien à lire');
  assert.equal(lu(['4', 'a', '2']), null,
    'une seule lettre suffit à refuser la ligne — on n’écarte pas, on renonce');
  assert.equal(lu(['42']), null, 'deux chiffres d’un coup, c’est assembler, pas lire');
  assert.equal(lu([' ']), null, 'une espace n’est pas un chiffre');

  // ── m15, « On compte les chiffres » ───────────────────────────────────────
  // L'exemple de l'auteur : un 3, deux 4, deux 5, trois 6, trois 9.
  assert.deepEqual(sortie('mcc', [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]),
    [1, 3, 2, 4, 2, 5, 3, 6, 3, 9], 'l’exemple de l’auteur');
  // ★ Des PLAGES CONTIGUËS, pas un relevé par valeur : `6 4 6` fait trois
  //   plages, pas deux valeurs. Ici, le décompte n'y gagne rien — il est refusé.
  assert.equal(sortie('mcc', [6, 4, 6]), null,
    'trois plages d’un signe : compter écrirait six signes pour trois, ce n’est pas compter');
  assert.deepEqual(sortie('mcc', [6, 6, 6, 6]), [4, 6], 'une plage de quatre se dit « 4 6 »');
  assert.equal(sortie('mcc', [1, 2, 3]), null, 'rien à condenser');

  // ── m16, « Le redécoupage tricheur » ──────────────────────────────────────
  /* ★ **IL NE REFUSE PLUS LES LIGNES COURTES — C'EST LE BARÈME QUI LES PAIE.**
     Il portait un seuil (`CHIFFRES_REDECOUPE_MIN`, 25 chiffres) et rendait
     `null` en deçà. « Au lieu d'un seuil unique je voudrais un malus
     dégressif : à 2 chiffres malus maximum, à 20 chiffres malus négligeable, à
     10 acceptable » (l'auteur). Un refus disait « cette règle n'existe pas
     ici », ce qui était faux : elle s'applique parfaitement à six chiffres,
     elle y est seulement très voyante — et c'est un PRIX, pas une grammaire.
     Voir `elegance.js › degressiviteRedecoupage`. */
  assert.deepEqual(sortie('mrd', [1, 2, 3, 6, 4, 2]), [6, 6, 6],
    'six chiffres : le redécoupage s’applique — cher, mais il s’applique');
  const longue = '9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number);
  const paquets = sortie('mrd', longue);
  assert.equal(paquets.join(''), '999991691662692',
    'les trente chiffres de l’auteur, et la sortie qu’il a calculée à la main');
  // ★ Il ACHÈTE des 6-ou-9, sinon il ne se joue pas : onze contre six au départ.
  const gagnants = (vs) => vs.filter((v) => v === 6 || v === 9).length;
  assert.equal(gagnants(longue), 6);
  assert.equal(gagnants(paquets), 11);
  // ★ **Un 9 n’est jamais absorbé, pas plus qu’un 6** : les trois 9 de tête, le
  //   6 du milieu et les deux 9 isolés se retrouvent intacts et à leur place.
  assert.deepEqual(paquets.slice(0, 3), [9, 9, 9], 'les trois 9 de tête restent seuls');
  // ★ Et une somme qui dépasse neuf s’écrit chiffre à chiffre, sans être
  //   réduite : `7+1+0+8 = 16` rend « 1 6 » — c’est de là que vient le 6 du
  //   rang 8, et le réduire à 7 le ferait disparaître.
  assert.deepEqual(paquets.slice(8, 10), [1, 6], 'la somme 16 s’écrit « 1 6 »');
  const tailles = PAR_CODE.get('mrd').additions(longue);
  assert.ok(tailles.length > 0 && tailles.every((t) => t >= 2),
    'les additions déclarées portent toutes au moins deux termes');
  // Rien à acheter : une ligne longue mais qui ne gagne rien est refusée.
  assert.equal(sortie('mrd', new Array(30).fill(6)), null,
    'trente 6 : chacun reste seul, rien n’est gagné, la triche ne se joue pas');
  assert.equal(sortie('mrd', new Array(30).fill(9)), null,
    'trente 9 : même refus, et c’est ce que la règle des 9 implique');
  // ★ Et la suite que l’auteur en tire se rejoue telle quelle : `mr9` retourne
  //   les 9 et la ligne écrit `666661661662662`.
  assert.equal(appliquerProgramme(['mrd', 'mr9'], N(longue)).valeur.join(''),
    '666661661662662', 'la suite de l’auteur, un cran plus loin');
});

/**
 * ★ LA MÉDIANE — ce qu'elle calcule, et ce qui la sépare de la moyenne.
 *
 * « Un opérateur `cme`, la MÉDIANE, à côté de `cmo` la moyenne » (l'auteur). Les
 * deux répondent à la même question ; ce test gèle le fait qu'elles ne donnent
 * pas la même réponse, et il gèle les deux formes de son geste — un centre, ou
 * deux.
 */
test('★ la médiane : on range, les extrêmes s’annulent, le centre reste', () => {
  const mediane = (v) => appliquer(PAR_CODE.get('cme'), N(v)).valeur;
  const moyenne = (v) => appliquer(PAR_CODE.get('cmo'), N(v)).valeur;

  // ── un compte IMPAIR : il reste un nombre, et on ne lui fait rien.
  assert.equal(mediane([3, 1, 2]), 2, 'rangé « 1 2 3 », les extrêmes partent, 2 reste');
  // ── un compte PAIR : il en reste deux, et c’est leur demi-somme.
  assert.equal(mediane([8, 15, 16, 5]), 12, 'rangé « 5 8 15 16 », il reste 8 et 15');
  // ★ …et l’arrondi est celui de la moyenne, sur ces deux-là seulement.
  assert.equal(PAR_CODE.get('cme').arrondiSur([8, 15, 16, 5]).join(' '), '8 15',
    'l’opérateur PUBLIE ce sur quoi il arrondit — le barème ne le devine pas');

  // ★ CE QUI LA SÉPARE DE LA MOYENNE, et c’est tout son intérêt : un extrême
  //   tire l’une et pas l’autre.
  assert.equal(moyenne([1, 5, 6, 6, 60]), 16);
  assert.equal(mediane([1, 5, 6, 6, 60]), 6);

  // Deux nombres : il n’y a rien à retirer, ils SONT le centre.
  assert.equal(mediane([6, 6]), 6);
  // Un seul : une médiane demande au moins deux nombres, comme une moyenne.
  assert.equal(appliquer(PAR_CODE.get('cme'), N([6])), null);
});

/**
 * ★ LES COMPTEURS DE SÉPARATEURS — sur l'adresse même de l'auteur.
 *
 * « Soit seuls les `/` sont comptés ce qui fait 3, soit tous les séparateurs le
 * sont, et il manque `:` donc le total fait 5 et non 4. » (l'auteur)
 *
 * Ce test tient les deux lectures, et surtout la CONFRONTATION qui a révélé le
 * bug : `tsp` MONTRE les séparateurs, `nsp` les COMPTE, et il n'existe qu'une
 * seule définition du mot — donc les deux ne peuvent plus se contredire.
 */
test('★ séparateurs : ce que `tsp` montre est ce que `nsp` compte', () => {
  const url = 'https://reinfocovid.fr/';
  const montres = appliquer(PAR_CODE.get('tsp'), S(url)).valeur;
  const comptes = appliquer(PAR_CODE.get('nsp'), S(url)).valeur;
  assert.deepEqual(montres, [':', '/', '/', '.', '/'], 'cinq séparateurs, le « : » compris');
  assert.equal(comptes, montres.length,
    'le compte et la montre sortent de la MÊME définition (CONTRACTS §0.3)');
  assert.equal(comptes, 5, '« il manque : donc le total fait 5 et non 4 » — l’auteur');

  // ★ Et les compteurs PRÉCIS, qui donnent l’autre lecture qu’il propose.
  assert.equal(appliquer(PAR_CODE.get('nsl'), S(url)).valeur, 3, '« seuls les / … ce qui fait 3 »');
  assert.equal(appliquer(PAR_CODE.get('npt'), S(url)).valeur, 1, 'un seul point');
  // Rien à compter, rien à montrer : une mesure qui rend zéro ne se joue pas.
  assert.equal(appliquer(PAR_CODE.get('nes'), S(url)), null, 'aucune espace dans une adresse');
  assert.equal(appliquer(PAR_CODE.get('ntr'), S(url)), null, 'aucun tiret non plus');
  assert.equal(appliquer(PAR_CODE.get('ntr'), S('hope-hope-hope.fr')).valeur, 2, 'deux tirets');
  assert.equal(appliquer(PAR_CODE.get('nes'), S('Le chat dort')).valeur, 2, 'deux espaces');
});

/**
 * ★ LE JOKER COMPTE SES LETTRES UNE PAR UNE.
 *
 * « `jnf` devrait être "combien de caractères ?" et les compter 1 par 1 de la
 * même manière que juste avant » (l'auteur). Le geste faisait autre chose : le
 * chiffre devenait le mot d'un seul bloc et le compte paraissait — l'étape
 * AFFIRMAIT que « quatre » a six lettres au lieu de le montrer.
 */
test('★ le joker écrit son mot, puis en compte les lettres une par une', () => {
  const op = PAR_CODE.get('jnf');
  const avant = U(4);
  const apres = appliquer(op, avant);
  assert.equal(apres.valeur, 6, '« quatre » — six lettres');
  const [step] = etapes(op, avant, apres, { ids: ['t0'], cle: 'e0', langue: 'fr' });
  const [ecrire, compter] = step.ops;
  // ① le mot s’écrit lettre par lettre : six jetons, pas un bloc.
  assert.equal(ecrire.op, 'substitute');
  assert.deepEqual(ecrire.pairs[0].to.map((t) => t.text), ['q', 'u', 'a', 't', 'r', 'e']);
  // ② et chaque lettre est comptée, sous l’accolade — le geste de tous les
  //    comptages du site, emprunté et non recopié.
  assert.equal(compter.op, 'group');
  assert.equal(compter.targets.length, 6, 'six lettres embrassées');
  assert.equal(compter.to.text, '6', 'et le compte qui en sort');
});

test('★ gel des codes publiés : chaque code rend exactement la même sortie', () => {
  assert.equal(VECTEURS.length, CATALOGUE.length, 'un vecteur par opérateur publié');
  const couverts = new Set(VECTEURS.map(([c]) => c));
  for (const op of CATALOGUE) assert.ok(couverts.has(op.code), `pas de vecteur pour ${op.code}`);
  for (const [code, entree, attendu] of VECTEURS) {
    const op = PAR_CODE.get(code);
    assert.ok(op, `code inconnu : ${code}`);
    const sortie = appliquer(op, entree);
    assert.ok(sortie !== null, `${code} (${op.id}) : rendu null au lieu de ${JSON.stringify(attendu)}`);
    assert.deepEqual(sortie.valeur, attendu, `${code} (${op.id})`);
    assert.equal(sortie.type, op.to);
  }
});

test('métadonnées de classement complètes (heuristique §7.2)', () => {
  for (const op of CATALOGUE) {
    assert.ok(op.notoriete >= 0 && op.notoriete <= 1, op.id);
    assert.ok(op.adHoc >= 0 && op.adHoc <= 1, op.id);
    assert.equal(typeof op.commute, 'boolean');
    for (const langue of LANGUES) {
      assert.ok(op.libelle[langue].length > 3 && op.regle[langue].length > 3, `${op.id} (${langue})`);
    }
    assert.ok(Object.isFrozen(op), `${op.id} n'est pas gelé`);
  }
});

test('pureté : deux applications identiques, aucune mutation de l’entrée', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const avant = JSON.stringify(entree);
    const a = appliquer(op, entree);
    const b = appliquer(op, entree);
    assert.equal(JSON.stringify(entree), avant, `${code} a muté son entrée`);
    assert.deepEqual(a && a.valeur, b && b.valeur, `${code} n'est pas déterministe`);
    assert.deepEqual(a && a.traces, b && b.traces, `${code} : traces instables`);
  }
});

test('aucune exception, jamais : « null » est le seul signal d’échec', () => {
  const pieges = [
    depuisSaisie(''), depuisSaisie('666'), depuisSaisie('!!!'), depuisSaisie('   '),
    depuisSaisie('a'), depuisSaisie('🙂🙃'), depuisSaisie('ÉCOLE'), depuisSaisie('a'.repeat(500)),
    tokens([], []), tokens(['']), T(['hope']), T(['4', '2']),
    nums([], []), N([0]), N([-3, 0, 999999]),
    num(0), num(-999999), num(1000000), num(9),
  ];
  for (const op of CATALOGUE) {
    for (const e of pieges) {
      if (!e) continue;
      const r = appliquer(op, e);
      assert.ok(r === null || estEtat(r), `${op.id} : sortie invalide`);
      if (r && r.type === 'NUM') {
        assert.ok(r.valeur >= NUM_MIN && r.valeur <= NUM_MAX, `${op.id} : NUM hors bornes`);
      }
      if (r && r.type === 'NUMS') {
        for (const v of r.valeur) assert.ok(v >= NUM_MIN && v <= NUM_MAX, `${op.id} : NUMS hors bornes`);
      }
    }
  }
});

test('bornes : un NUM hors de [-10⁶, 10⁶] fait retourner null', () => {
  const grand = nums([999999, 999999], [[[0, 1]], [[1, 2]]]);
  assert.equal(appliquer(PAR_CODE.get('cs'), grand), null, 'somme hors bornes');
  assert.equal(appliquer(PAR_CODE.get('cp'), grand), null, 'produit hors bornes');
  assert.equal(num(1e6 + 1), null);
  assert.equal(num(-1e6 - 1), null);
  assert.equal(num(1e6).valeur, 1e6);
});

test('les traces remontent jusqu’à la saisie d’origine', () => {
  const r = derouler(['ftld', 'fmr', 'tca', 'ma1', 'cs', 'prn'], S('hope-hope-hope.fr'));
  assert.ok(r);
  assert.equal(r.etat.valeur, 8);
  assert.deepEqual(r.etat.traces, [[0, 4]], 'le 8 vient des quatre premiers caractères');
  const tokensEtape = r.etapes[2].apres;
  assert.deepEqual(tokensEtape.origines, [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]]);
  for (const et of r.etapes) {
    assert.ok(Array.isArray(et.apres.traces) && et.apres.traces.length > 0, `${et.code} sans trace`);
  }
});

test('les couvertures désignent bien ce qui est consommé', () => {
  assert.deepEqual(PAR_CODE.get('fp').couverture('https://hope.fr'), [[0, 8]]);
  assert.deepEqual(PAR_CODE.get('fw').couverture('www.hope.fr'), [[0, 4]]);
  assert.deepEqual(PAR_CODE.get('ftld').couverture('hope.fr'), [[4, 7]]);
  assert.deepEqual(PAR_CODE.get('fmr').couverture('hope-hope-hope'), [[0, 4], [5, 9], [10, 14]]);
});

/**
 * ★ LES TROIS FICELLES SE MONTRENT — `mpf`, `m1s2`, `mad`.
 *
 * Ce sont des astuces assumées, et l'auteur a dit exactement comment elles
 * doivent paraître. Une régression silencieuse vers le rendu générique
 * (`scenario.js` retombe dessus sans rien casser) leur ferait AFFIRMER ce
 * qu'elles doivent MONTRER — c'est la doctrine §0.3, et c'est ici qu'on la gèle.
 *
 *  · `mpf` — « indique sous l'accolade : "chiffre majoritaire : 6" et fais
 *    disparaître les autres » ; l'accolade embrasse la ligne ENTIÈRE, puisque
 *    c'est sur elle entière qu'on a compté ;
 *  · `m1s2` — « l'astuce est de nommer "position paire" ou "position impaire"
 *    pour justifier de supprimer l'autre » : le nom est écrit, la parité aussi ;
 *  · `mad` — « ne pas la différencier des additions qui la précèdent ou la
 *    succèdent » : des `+` ordinaires, entre les seuls termes retenus, et un
 *    `sum` qui recoupe la somme. Les 6 déjà là ne sont jamais des opérandes.
 */
test('★ les trois ficelles se MONTRENT — accolade nommée, additions ordinaires', () => {
  const geste = (code, entree) => {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : l'opérateur doit s'appliquer au vecteur du gel`);
    const ctx = { ids: entree.valeur.map((_, i) => `t${i}`), cle: 'e0' };
    return { op, entree, apres, ctx, steps: etapes(op, entree, apres, ctx) };
  };

  // ── m10 : l'accolade dit le verdict, puis les minoritaires tombent
  {
    const { entree, ctx, steps } = geste('mpf', N([6, 4, 6, 6, 6]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.ok(acc, 'm10 : pas d’accolade — le verdict serait affirmé sans être posé');
    assert.equal(acc.label, 'chiffre majoritaire : 6',
      'm10 : l’accolade doit nommer le chiffre majoritaire, et le bon');
    assert.deepEqual(acc.targets, ctx.ids,
      'm10 : on a compté sur la ligne ENTIÈRE, l’accolade doit l’embrasser entière');
    const chute = ops.find((o) => o.op === 'drop');
    assert.deepEqual(chute.targets, ['t1'], 'm10 : seul le 4 minoritaire tombe');
    assert.ok(steps[0].caption.includes('6 ×4'),
      'm10 : le Registre doit porter le relevé, pour qu’on refasse le compte');
    // ★ L'étiquette est DÉRIVÉE du vecteur, jamais écrite en dur : elle sort du
    //   même relevé qu'`apply()`. Et quand le plus fréquent n'est pas un 6,
    //   l'opérateur ne le remplace pas par un 6 — il REFUSE de s'appliquer
    //   (`elegance.test.js`, « à égalité, la règle refuse au lieu de choisir »).
    assert.equal(appliquer(PAR_CODE.get('mpf'), N([4, 6, 4, 4, 4])), null,
      'm10 : une majorité de 4 n’écrit pas 666 — on renonce, on ne truque pas');
    assert.equal(entree.valeur.length, 5);
  }

  // ── m11 : la parité est NOMMÉE, franchement
  {
    const { ctx, steps } = geste('m1s2', N([4, 6, 4, 6, 4, 6, 4]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.equal(acc.label, 'on ne garde que les positions paires',
      'm11 : la parité retenue doit être nommée — c’est TOUTE l’astuce');
    assert.deepEqual(ops.find((o) => o.op === 'drop').targets, ['t0', 't2', 't4', 't6'],
      'm11 : les positions impaires tombent, et elles seules');
    assert.deepEqual(ops.find((o) => o.op === 'highlight').targets, ['t1', 't3', 't5']);
    assert.ok(steps[0].caption.includes('positions impaires : 0 six'),
      'm11 : le Registre doit donner le relevé des DEUX parités');
    assert.equal(ctx.ids.length, 7);
  }

  // ── m12 : des additions ordinaires, sur les seuls termes retenus
  {
    const { steps } = geste('mad', N([6, 5, 16, 8]));
    const ops = steps.flatMap((s) => s.ops);
    // 1. `16` s'écrit chiffre à chiffre, sinon « 5+1 » n'a pas de « 1 »
    const eclat = ops.find((o) => o.op === 'substitute');
    assert.ok(eclat, 'm12 : `16` doit être écrit chiffre à chiffre avant qu’on additionne');
    assert.deepEqual(eclat.pairs[0].to.map((t) => t.text), ['1', '6']);
    // 2. les `+` ne paraissent qu'entre les termes retenus
    const signes = ops.filter((o) => o.op === 'insertOperators');
    assert.equal(signes.length, 1, 'm12 : une seule addition sur ce vecteur');
    assert.equal(signes[0].between.length, 2, 'm12 : `5+1` porte sur DEUX termes');
    assert.equal(signes[0].glyph, '+');
    // 3. la somme est recoupée par la primitive elle-même
    const somme = ops.find((o) => o.op === 'sum');
    assert.equal(somme.to.text, '6', 'm12 : ce qui descend sous la pointe est le 6 obtenu');
    assert.deepEqual(somme.targets, signes[0].between,
      'm12 : on additionne exactement les termes entre lesquels le + est paru');
  }
});

/**
 * ★ `pc9` POSE le calcul avant de le faire.
 *
 * Il se contentait du geste générique — `3` s'efface, `6` paraît — et le neuf
 * dont on prend le complément n'entrait jamais en scène : la légende disait
 * « 3 → 6 » et l'image montrait une substitution arbitraire. Le geste attendu
 * est celui de `c.maxMoinsMin`, à ceci près que l'un des deux termes vient de
 * la RÈGLE et non de la ligne. On vérifie donc les quatre temps, et surtout que
 * le compteur sous l'accolade passe bien par 9 avant d'afficher le reste.
 */
test('★ pc9 — le complément se pose : « 9 − 3 », puis 9 descend, puis −3', () => {
  const op = PAR_CODE.get('pc9');
  const entree = U(3);
  const apres = appliquer(op, entree);
  assert.equal(apres.valeur, 6);
  const steps = etapes(op, entree, apres, { ids: ['t0'], cle: 'e0' });
  assert.equal(steps.length, 1, 'pc9 : un seul step — c’est UNE transformation');
  const ops = steps[0].ops;

  // ① le nombre se déploie en `9` et lui-même : le neuf naît du nombre.
  const pose = ops.find((o) => o.op === 'substitute');
  assert.ok(pose, 'pc9 : sans déploiement, le 9 n’apparaîtrait de nulle part');
  assert.equal(pose.pairs[0].target, 't0');
  assert.deepEqual(pose.pairs[0].to.map((t) => t.text), ['9', '3'],
    'pc9 : la ligne doit écrire le 9 ET garder le nombre — c’est le calcul posé');

  // ② le signe s'intercale entre les deux, et c'est un MOINS.
  const signes = ops.find((o) => o.op === 'insertOperators');
  assert.equal(signes.glyph, '−', 'pc9 : un complément est une soustraction, pas une somme');
  assert.deepEqual(signes.between, pose.pairs[0].to.map((t) => t.id));

  // ③ l'accolade dit ce qu'elle fait ET à quel titre.
  const somme = ops.find((o) => o.op === 'sum');
  assert.equal(somme.symbol, '9 −', 'pc9 : le symbole sous la pointe doit porter le neuf');
  assert.equal(somme.label, 'On prend le complément à neuf');

  // ④ deux paliers : le 9 se pose, le terme le retranche. C'est ce que le
  //    compteur affiche, et `sum` refuse d'annoncer un total qu'il ne montre pas.
  assert.deepEqual(somme.partials, [9, 6]);
  assert.equal(somme.to.text, '6');
  assert.deepEqual(somme.consume, [signes.ids[0]],
    'pc9 : le « − » appartient au calcul, il s’en va avec lui');
});

/**
 * ★ `pmr` retourne la LIGNE, pas une table.
 *
 * « Ce n'est pas un miroir de table mais un miroir directement sur les données
 * de la ligne » (l'auteur). Le geste générique remplaçait `28` par `82` sans
 * qu'aucun chiffre n'ait bougé : le miroir n'était nulle part. On vérifie donc
 * les trois temps, et surtout que le déplacement demande le chemin en ellipse —
 * deux chiffres qui échangent leurs places en ligne droite se traversent.
 */
test('★ pmr — le nombre s’éclate, les chiffres s’échangent en ellipse, et se recollent', () => {
  const op = PAR_CODE.get('pmr');
  const steps = (v) => {
    const entree = U(v);
    const apres = appliquer(op, entree);
    return { apres, ops: etapes(op, entree, apres, { ids: ['t0'], cle: 'e0' })[0].ops };
  };

  const { apres, ops } = steps(28);
  assert.equal(apres.valeur, 82);
  const eclat = ops.find((o) => o.op === 'substitute');
  assert.deepEqual(eclat.pairs[0].to.map((t) => t.text), ['2', '8'],
    'les chiffres doivent RECONSTITUER le jeton : c’est ce que `substitute` exige');
  const bouge = ops.find((o) => o.op === 'move');
  assert.equal(bouge.geste, 'miroir', 'sans le chemin en ellipse, les chiffres se traversent');
  assert.deepEqual(bouge.order, [...eclat.pairs[0].to.map((t) => t.id)].reverse());
  const colle = ops.find((o) => o.op === 'merge');
  assert.deepEqual(colle.targets, bouge.order, 'on recolle ce qu’on vient de retourner');
  assert.equal(colle.to.text, '82');

  // ★ Le signe garde sa place de tête : `-28` se lit `-82`, pas `82-`. Il doit
  //   figurer dans l'éclatement, faute de quoi les chiffres ne reconstitueraient
  //   pas le jeton `-28`.
  const negatif = steps(-28);
  assert.equal(negatif.apres.valeur, -82);
  const parts = negatif.ops.find((o) => o.op === 'substitute').pairs[0].to;
  assert.deepEqual(parts.map((t) => t.text), ['-', '2', '8']);
  const ordre = negatif.ops.find((o) => o.op === 'move').order;
  assert.equal(ordre[0], parts[0].id, 'le signe ne se retourne pas avec les chiffres');
  assert.equal(negatif.ops.find((o) => o.op === 'merge').to.text, '-82');

  // ★ Le zéro de tête retombe sur le geste sobre : `20` se lit `02`, qui vaut
  //   `2` — un chiffre s’y perd, et `merge` refuserait le collage. Montrer `02`
  //   puis le remplacer par `2` serait une seconde règle que personne n’a dite.
  const zero = steps(20);
  assert.equal(zero.apres.valeur, 2);
  assert.ok(!zero.ops.some((o) => o.op === 'move'), 'pas de miroir quand un chiffre se perd');
});

/**
 * ★ `mlm` compte, il n'annonce pas — et il ne fait doublon avec personne.
 *
 * Deux questions de l'auteur, deux réponses mesurées.
 *
 * 1. L'ANIMATION. Elle se contentait du geste sobre : `hope` s'efface, `4`
 *    paraît. C'est la faute exacte que `n.longueur` avait déjà corrigée pour la
 *    ligne entière. « Appliquer ce que je dis pour `jnf` » — c'est-à-dire le
 *    comptage sous accolade de `cnj` et de `nl` : le mot s'éclate en lettres,
 *    chacune descend dans la pointe et fait avancer le compteur.
 *
 * 2. LE DOUBLON. « En quoi ne fait-il pas doublon [avec `cnj` / `nl`] ? » — la
 *    réponse est dans les types, et ce test la fige plutôt que de l'affirmer.
 */
test('★ mlm — un mot se compte lettre par lettre, et ne double ni cnj ni nl', () => {
  const entree = T(['hope', 'fr']);
  const op = PAR_CODE.get('mlm');
  const apres = appliquer(op, entree);
  assert.deepEqual(apres.valeur, [4, 2]);

  // ① UN STEP PAR MOT : compter deux mots à la fois, ce sont deux chantiers
  //    simultanés, et l'on ne voit plus quel mot a donné quel nombre.
  const steps = etapes(op, entree, apres, { ids: ['t0', 't1'], cle: 'e0' });
  assert.equal(steps.length, 2);

  // ② Le mot S'ÉCLATE en ses lettres, qui le reconstituent — sans quoi
  //    `substitute` refuserait —, puis l'accolade les compte une par une.
  const [eclat, compte] = steps[0].ops;
  assert.equal(eclat.op, 'substitute');
  assert.equal(eclat.pairs[0].to.map((t) => t.text).join(''), 'hope');
  assert.equal(compte.op, 'group');
  assert.deepEqual(compte.targets, eclat.pairs[0].to.map((t) => t.id));
  assert.equal(compte.to.text, '4', 'le compteur remonte le nombre qu’il a compté');
  assert.equal(compte.symbol, '#');

  // ③ LE DOUBLON, mesuré : aucun opérateur du catalogue ne rend ce que rend
  //    `mlm`, et aucune composition de deux codes non plus.
  const attendu = JSON.stringify(apres.valeur);
  const memeSortie = (o) => {
    const r = appliquer(o, entree);
    return r && JSON.stringify(r.valeur) === attendu;
  };
  const jumeaux = CATALOGUE.filter((o) => o.code !== 'mlm' && memeSortie(o));
  assert.deepEqual(jumeaux.map((o) => o.code), [], 'aucun jumeau au catalogue');

  // ④ Et la raison tient dans les TYPES : `cnj` compte les MORCEAUX, `mlm`
  //    compte les LETTRES de chacun. Sur un mot unique, l'un rend 1, l'autre 4.
  const un = T(['hope']);
  assert.deepEqual(appliquer(PAR_CODE.get('mlm'), un).valeur, [4]);
  assert.equal(appliquer(PAR_CODE.get('cnj'), un).valeur, 1);
  // `nl`, lui, travaille sur la CHAÎNE — avant tout découpage — et rend un
  // scalaire : une fois la ligne découpée, il n'est plus applicable du tout.
  assert.equal(PAR_CODE.get('nl').from, 'STR');
  assert.equal(PAR_CODE.get('mlm').to, 'NUMS', 'ce que mlm apporte, c’est le VECTEUR');
  assert.equal(appliquer(PAR_CODE.get('nl'), entree), null);
});

test('steps : vocabulaire fermé, JSON pur, identifiants nommés par l’émetteur', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    const n = entree.type === 'STR' ? [...entree.valeur].length
      : entree.type === 'NUM' ? 1 : entree.valeur.length;
    const ctx = { ids: Array.from({ length: n }, (_, i) => `t${i}`), cle: 'e0' };
    const steps = etapes(op, entree, apres, ctx);
    assert.ok(Array.isArray(steps), `${code} : steps n’est pas une liste`);

    /* ★ **ZÉRO STEP EST PERMIS — À UNE SEULE CONDITION, ET ELLE SE VÉRIFIE.**
       Un opérateur muet est normalement un défaut : il porte un code dans
       l'URL que la démonstration ne montre nulle part, et deux programmes
       distincts rejouent alors la même scène. Il existe pourtant un cas où se
       taire est JUSTE — celui où il n'y a rien à voir : `m09` lit le jeton
       « 9 » comme le nombre 9, à la même place, sous le même dessin. Une étape
       y serait un temps mort portant un titre.

       La permission n'est donc pas une exception nommée, c'est un CONTRAT :
       pas de step ⟺ la ligne est identique après, jetons ET dessin. Un
       opérateur qui oublierait ses steps demain fera rougir ici, puisque sa
       ligne, elle, aura changé. */
    if (!steps.length) {
      assert.deepEqual(idsApres(op, entree, apres, ctx), ctx.ids,
        `${code} : aucun step, mais les jetons changent d’identité`);
      const dessin = (etat) => (etat.type === 'NUM' ? [String(etat.valeur)]
        : etat.type === 'STR' ? [...etat.valeur] : etat.valeur.map(String));
      assert.deepEqual(dessin(apres), dessin(entree),
        `${code} : aucun step, mais la ligne n’affiche plus la même chose`);
      continue;
    }

    // pureté : sérialisable, aucune fonction
    assert.deepEqual(JSON.parse(JSON.stringify(steps)), steps, `${code} : steps non purs`);

    const connus = new Set(ctx.ids);
    const idsSteps = new Set();
    for (const step of steps) {
      assert.ok(step.id && !idsSteps.has(step.id), `${code} : id de step manquant ou dupliqué`);
      idsSteps.add(step.id);
      assert.ok(typeof step.title === 'string' && step.title.trim(), `${code} : titre vide`);
      for (const o of step.ops) {
        assert.ok(OPS_AUTORISEES.has(o.op), `${code} : op « ${o.op} » hors vocabulaire`);
        for (const g of o.groups || []) {
          for (const cible of [].concat(g.targets || [])) {
            assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
          }
        }
        for (const cible of [].concat(o.targets || [], o.target || [], o.between || [])) {
          assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
        }
        for (const p of o.pairs || []) {
          assert.ok(connus.has(p.target), `${code} : paire sur un id inconnu « ${p.target} »`);
          // `to` est soit un token, soit une LISTE de tokens (éclatement 1 → n,
          // CONTRACTS §3 / src/visuel/primitives/substitute.js).
          for (const t of [].concat(p.to || [])) connus.add(t.id);
        }
        for (const d of o.digits || []) connus.add(d.id);
        for (const id of o.ids || []) connus.add(id);
        // ★ `to` est un token, ou une LISTE de tokens. La seconde forme n'était
        //   connue que des `pairs` ; `flip180` l'emploie désormais aussi, pour
        //   le trio de 9 qui se retourne d'un bloc (`primitives/flip180.js`).
        //   Sans cette ligne, les jetons qu'un bloc fait naître restaient
        //   inconnus, et le `pulse` qui les désigne juste après passait pour
        //   viser un identifiant fantôme.
        for (const t of [].concat(o.to || [])) if (t && t.id) connus.add(t.id);
      }
    }

    // les identifiants annoncés par `sortie` existent bien dans la scène
    for (const id of idsApres(op, entree, apres, ctx)) {
      assert.ok(connus.has(id), `${code} : l'id de sortie « ${id} » n'a jamais été créé`);
    }

    // ★ le geste dédié est bien émis, et il porte de quoi être vérifié
    const attendue = PRIMITIVE_ATTENDUE[code];
    if (attendue) {
      const emises = steps.flatMap((s) => s.ops).filter((o) => o.op === attendue);
      assert.ok(emises.length > 0,
        `${code} (${op.id}) : la primitive « ${attendue} » n'est pas émise — `
        + 'le comptage ne serait plus montré, seulement affirmé (CONTRACTS §0.3)');
      for (const o of emises) {
        if (code === 'm36') {
          // ★ L'EFFACEMENT NE TRAVAILLE PAS JETON PAR JETON, et son contrôle
          // croisé n'est ni `count` ni `to.text` : c'est le MOTIF. « Si elle
          // n'a pas de motif, c'est probablement la pire des triches »
          // (l'auteur). Ici le motif est la CONTIGUÏTÉ, et il est montré avant
          // d'être exercé — un `highlight` désigne les trois 6 qu'on garde,
          // puis la gomme n'emporte que le reste. On vérifie donc les deux
          // ensemble : que les désignés sont bien trois 6 consécutifs de la
          // ligne, et que ce qui tombe est exactement leur complément.
          const designe = steps.flatMap((st) => st.ops)
            .find((x) => x.op === 'highlight' && Array.isArray(x.targets));
          assert.ok(designe, `${code} : rien ne DÉSIGNE ce qu'on garde — l'effacement serait sans motif`);
          assert.equal(designe.targets.length, 3, `${code} : on garde les trois 6 du 666, ni deux ni quatre`);
          const rangs = designe.targets.map((id) => ctx.ids.indexOf(id));
          assert.ok(rangs.every((r) => r >= 0), `${code} : un jeton désigné hors de la ligne`);
          assert.deepEqual(rangs, [rangs[0], rangs[0] + 1, rangs[0] + 2],
            `${code} : les trois 6 ne se touchent pas — ce serait un tri, pas une trouvaille`);
          for (const r of rangs) {
            assert.equal(String(entree.valeur[r]), '6',
              `${code} : on garderait autre chose qu'un 6`);
          }
          assert.equal(o.mode, 'erase', `${code} : la gomme efface sur place, elle ne fait pas tomber`);
          assert.equal(o.regroup, false, `${code} : rien ne se resserre — le 666 est déjà d'un seul tenant`);
          assert.deepEqual([...o.targets].sort(), ctx.ids.filter((id) => !designe.targets.includes(id)).sort(),
            `${code} : ce qui tombe doit être EXACTEMENT le complément de ce qu'on garde`);
          continue;
        }
        if (attendue === 'move') {
          // ★ Un rangement ne travaille pas jeton par jeton : il rend un ORDRE.
          //   Le contrôle croisé est donc que cet ordre soit UNE PERMUTATION de
          //   la ligne — pas un jeton oublié, pas un jeton compté deux fois —
          //   et que les valeurs qu'il désigne soient effectivement croissantes.
          //   Le moteur visuel ne peut pas le vérifier : il ne connaît pas les
          //   valeurs. Ici, on les a encore sous la main.
          assert.ok(Array.isArray(o.order) && o.order.length === ctx.ids.length,
            `${code} : « order » doit renommer toute la ligne, dans son nouvel ordre`);
          assert.equal(new Set(o.order).size, o.order.length,
            `${code} : un jeton figure deux fois dans « order »`);
          const rangs = o.order.map((id) => ctx.ids.indexOf(id));
          assert.ok(rangs.every((r) => r >= 0), `${code} : « order » désigne un jeton hors ligne`);
          const rangees = rangs.map((r) => entree.valeur[r]);
          assert.deepEqual(rangees, [...rangees].sort((x, y) => x - y),
            `${code} : l'ordre envoyé à la scène n'est pas croissant`);
          continue;
        }
        if (attendue === 'partition') {
          // ★ Découper, c'est PARTITIONNER : au moins deux morceaux, aucun
          //   vide, aucun jeton dans deux morceaux à la fois. La primitive
          //   refuse déjà les trois cas (`visuel/primitives/partition.js`) ;
          //   on le rattrape ici plutôt qu'au clic de l'utilisateur.
          assert.ok(Array.isArray(o.groups) && o.groups.length >= 2,
            `${code} : découper en un seul morceau ne découpe rien`);
          const vus = new Set();
          for (const g of o.groups) {
            assert.ok(Array.isArray(g.targets) && g.targets.length,
              `${code} : un groupe sans jeton`);
            for (const id of g.targets) {
              assert.ok(!vus.has(id), `${code} : le jeton « ${id} » est dans deux groupes`);
              vus.add(id);
            }
          }
          continue;
        }
        // ★ Jeton par jeton — sauf la touche désignée par DEUX nombres
        //   (`keyboard`, mesure « coordonnees », `mcaz` et `mcqw`) : elle
        //   travaille PAIRE par paire, et c'est encore un geste par lettre.
        //   L'exception est nommée et vérifiée, pas accordée à qui la demande.
        if (o.op === 'keyboard' && o.mesure === 'coordonnees') {
          assert.ok(Array.isArray(o.targets) && o.targets.length === 2
            && o.targets.every((id) => typeof id === 'string'),
          `${code} : la touche désignée part de deux jetons, la colonne puis la rangée`);
        } else {
          assert.equal(typeof o.target, 'string', `${code} : « ${attendue} » travaille jeton par jeton`);
        }
        if (attendue === 'table') {
          // ★ L'aller-retour est INDIVIDUEL : une lettre monte, sa valeur
          // redescend, puis la suivante. Ce qui se mutualise, c'est le DÉCOR.
          // ★ TROIS mises en page. Une case vaut une lettre et un nombre, sauf
          //   au clavier téléphonique (`pave`), qui en met plusieurs.
          //
          //   ⚠️ La GLISSIÈRE a été ajoutée ici le jour où `m.z26a1` l'a prise :
          //     elle existait déjà pour les filtres — c'est la mise en scène de
          //     l'Atbash, deux bandes alignées dont la seconde se retourne —,
          //     et cette liste-ci ne connaissait que les mappeurs. Elle n'est
          //     pas une troisième façon de dessiner une case : c'est la même
          //     case, dans une table qui DÉRIVE sa seconde bande de la première
          //     au lieu de l'affirmer (`visuel/assets.js › pasDeGlissiere`).
          assert.ok(['reglette', 'pave', 'glissiere'].includes(o.disposition),
            `${code} : mise en page inconnue`);
          assert.ok(o.teinte === undefined || o.teinte === 'valeur',
            `${code} : encodage de teinte inconnu`);
          assert.ok(o.cycle === undefined || o.cycle === true,
            `${code} : « cycle » est un drapeau, pas un réglage`);
          // Le contrôle croisé n'est pas `count` mais la TABLE elle-même : elle
          // voyage dans l'op, dérivée de la fonction de l'opérateur, et la
          // primitive refuse de faire redescendre une valeur qui n'y est pas.
          // ★ Vingt-cinq au moins, et non vingt-six : le carré de Polybe a vingt-cinq
          //   cases, i et j dans la même — sa table est COMPLÈTE, elle n'a pas de
          //   vingt-sixième case à montrer.
          assert.ok(Array.isArray(o.entries) && o.entries.length >= 25,
            `${code} : « entries » manquant — la conversion serait affirmée, pas montrée`);
          const cases = new Map(o.entries.map((e) => [e.char, String(e.value)]));
          // ★ À REBOURS (`ordre: '1a26'`, `m1a`), les rôles s'échangent et rien
          //   d'autre : c'est un RANG qui monte chercher sa case, une LETTRE qui
          //   en redescend. Le contrôle est le même, retourné — pas relâché.
          // ★ Et toute table qui RELIT une lettre — les relectures par paires
          //   (`m1a2`, `mpol`, `mtap`) — est à rebours de la même façon.
          const aRebours = o.ordre === '1a26' || /^[a-z]$/.test(String(o.to && o.to.text));
          // ★ `mast` désigne sa case par le CODE : sa table porte « h » et « H ».
          const parCode = code === 'mast';
          assert.match(String(o.letter), aRebours || parCode ? /^\d+$/ : /^[A-Z]$/,
            `${code} : « letter » manquant ou non replié`);
          assert.match(String(o.to && o.to.text), aRebours ? /^[a-z]$/ : /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si la table montrait autre chose que la valeur annoncée');
          assert.equal(cases.get(o.letter), String(o.to.text),
            `${code} : la table montrée et le nombre annoncé divergent sur « ${o.letter} »`);
        } else if (attendue === 'keyboard') {
          // Le contrôle croisé de `keyboard` n'est pas `count` mais `to.text` :
          // c'est le nombre qui redescend de la touche, et la primitive refuse
          // de le faire descendre s'il diffère de ce que le clavier montre.
          assert.ok(['azerty', 'qwerty'].includes(o.layout), `${code} : disposition inconnue`);
          if (o.mesure === 'coordonnees') {
            // ★ Le trajet INVERSE (`mcaz`, `mcqw`) : deux nombres partent — la
            //   colonne, puis la rangée —, une lettre redescend. Le contrôle est
            //   le même, retourné : la primitive relit la touche au croisement
            //   et refuse une lettre qui n'est pas la sienne.
            assert.ok(Array.isArray(o.targets) && o.targets.length === 2,
              `${code} : « targets » doit désigner la colonne puis la rangée`);
            assert.match(String(o.to && o.to.text), /^[a-z]$/,
              `${code} : « to.text » manquant — c'est la lettre de la touche désignée`);
          } else {
            assert.equal(typeof o.key, 'string', `${code} : « key » manquant`);
            assert.ok(['touche', 'colonne', 'rangee'].includes(o.mesure), `${code} : mesure inconnue`);
            assert.match(String(o.to && o.to.text), /^\d+$/,
              `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
              + 'si le clavier montrait autre chose que le nombre annoncé');
          }
        } else {
          assert.equal(typeof o.count, 'number',
            `${code} : « count » manquant — c'est lui qui fait échouer la compilation `
            + 'si le tracé montré et le nombre annoncé divergeaient');
        }
      }
      if (attendue === 'keyboard' || attendue === 'table') {
        // Une op de caméra par step, jamais deux : elles se contrediraient.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » animeraient deux fois la caméra`);
        }
      }
      if (attendue === 'table') {
        // ★ Le décor est mutualisé : déployé UNE fois, retiré UNE fois. Entre
        // les deux la table reste montée — c'est là qu'est l'économie, pas
        // dans l'aller-retour, qui reste entier pour chaque lettre.
        assert.equal(emises.filter((o) => o.montre === true).length, 1,
          `${code} : la table doit se déployer exactement une fois`);
        assert.equal(emises.filter((o) => o.retire === true).length, 1,
          `${code} : la table doit se retirer exactement une fois`);
        assert.equal(emises[0].montre, true, `${code} : elle monte à la première lettre`);
        assert.equal(emises[emises.length - 1].retire, true, `${code} : elle part à la dernière`);
      }
      if (attendue === 'sevenSeg' || attendue === 'countStrokes') {
        // Un encart par step : deux comptages simultanés, c'est le fouillis
        // qu'on vient de retirer.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » ouvriraient deux encarts`);
        }
        for (const o of emises) {
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to » manquant — c'est le nombre du compteur qui remplace la lettre`);
        }
      }
      if (attendue === 'countStrokes') {
        for (const o of emises) {
          assert.match(o.glyph, /^[A-Za-z]$/, `${code} : « glyph » doit être le caractère redessiné`);
          assert.ok(['traits', 'extremites', 'boucles'].includes(o.mode), `${code} : mode inconnu`);
        }
      }
    }
  }
});

test('sélection : jokers, dépréciés et nombres maîtres hors recherche', () => {
  const actifs = operateursActifs();
  assert.ok(!actifs.some((o) => o.isJoker), 'le joker n’est jamais exploré');
  assert.ok(!actifs.some((o) => o.deprecated));
  assert.ok(!actifs.some((o) => o.id === 'p.racineMaitres'), 'nombres maîtres désactivés par défaut');
  assert.ok(operateursActifs({ maitres: true }).some((o) => o.id === 'p.racineMaitres'));
  assert.ok(operateursDepuis('STR').every((o) => o.from === 'STR'));
  const codes = operateursDepuis('TOKENS').map((o) => o.code);
  assert.deepEqual(codes, [...codes].sort((a, b) => rangCode(a) - rangCode(b)));
});

test('le joker français : tout chiffre atteint 6 en au plus trois étapes', () => {
  assert.equal(JOKER.isJoker, true);
  assert.equal(JOKER.adHoc, 0.5);
  for (let d = 0; d <= 9; d++) {
    let v = num(d, [[0, 1]]);
    let pas = 0;
    while (v.valeur !== 6 && pas < 5) { v = appliquer(JOKER, v); pas++; }
    assert.equal(v.valeur, 6, `${d} n’atteint pas 6`);
    assert.ok(pas <= 3, `${d} demande ${pas} étapes`);
  }
});

test('les identifiants d’opérateurs sont uniques et lisibles', () => {
  assert.equal(PAR_ID.size, CATALOGUE.length);
  for (const op of CATALOGUE) assert.match(op.id, /^[a-z]\.[A-Za-z0-9]+$/);
});

/**
 * ★ **UNE DÉCOUPE D'ADRESSE MONTRE LA ZONE QU'ELLE COUPE, PAS SES LETTRES.**
 *
 * Le défaut relevé par l'auteur : « visiblement tu identifies les caractères à
 * conserver (ceux du chemin) puis tu cherches leur PREMIÈRE OCCURRENCE dans la
 * string, peu importe que ce soit dans la zone du chemin, et tu le gardes en
 * virant les autres. Résultat, des caractères qui semblent pris au hasard sont
 * gardés et le reste supprimé. »
 *
 * C'était exact, et pour trois des cinq découpes. `etapeDecoupeAdresse`
 * demandait à `apparier` quels jetons survivent ; faute de traces
 * discriminantes, celui-ci retombe sur la plus longue sous-suite commune, qui
 * prend la première occurrence de chaque caractère. Sur
 * `https://www.example.com/path/to/page`, `fchm` garde `path` — mais la scène
 * gardait le `p` de `https`, le `a` d'`example`, puis le `th` de `path` :
 *
 * ```
 *   bornes       ························path········
 *   appariement  ···p··········a···········th········   ← ce qu'on voyait
 * ```
 *
 * Les cinq publient donc leurs `bornes`, et la scène les lit. Ce test croise
 * les deux — la zone déclarée et le texte rendu par `apply` — sur une adresse
 * qui les met toutes en défaut, et il tombe si l'une des deux dérive.
 */
test('★ découpes d’adresse — la zone déclarée EST le texte rendu', () => {
  const coupes = CATALOGUE.filter((o) => o.coupe);
  assert.ok(coupes.length >= 5, `attendu au moins cinq découpes, vu ${coupes.length}`);

  for (const saisie of [
    'https://www.example.com/path/to/page',
    'https://hope-hope-hope.fr/',
    'hope.fr/a/b',
    'https://www.numérologie-évidente.fr/preuve',
  ]) {
    for (const op of coupes) {
      // ★ TOUTE découpe doit publier ses bornes : sans elles, la scène retombe
      //   sur l'appariement, c'est-à-dire sur le défaut qu'on vient de fermer.
      assert.equal(typeof op.bornes, 'function',
        `${op.code} coupe sans publier ses bornes`);
      const bornes = op.bornes(saisie);
      const rendu = op.apply(saisie, [...saisie].map(() => []));
      if (!bornes || !rendu) {
        // S'abstenir est licite — mais les deux doivent s'abstenir ENSEMBLE.
        assert.equal(!bornes, !rendu,
          `${op.code} sur « ${saisie} » : bornes et rendu ne s’accordent pas`);
        continue;
      }
      assert.equal([...saisie].slice(bornes[0], bornes[1]).join(''), rendu.valeur,
        `${op.code} sur « ${saisie} » : la zone déclarée n’est pas ce qui est rendu`);

      /* ★ **ET LA SORTIE AUSSI — c'est la moitié qui manquait.**

         Les bornes servaient au calcul et au geste, mais `sortie()` était
         restée sur `apparier`, qui cherche la première occurrence de chaque
         caractère où qu'elle soit. Les deux se contredisaient, et
         `scenario.js` — qui refuse à juste titre une `sortie()` désignant des
         jetons que les steps n'ont pas gardés — se rabattait EN SILENCE sur le
         rendu générique : un effacement nu, sans estompage, sans le nom de ce
         qu'on garde, sans rapprochement.

         MESURÉ sur `https://www.example.com/path/to/page` : `fpag` garde
         « page » (32 à 35) et annonçait `t3`, `t14` — le `p` de « https », un
         `a` d'« example ». `fdom` y échappait par pure chance, la première
         occurrence de ce qu'il garde étant celle qu'il garde. */
      const etat = depuisSaisie(saisie);
      const ids = [...saisie].map((_, i) => `t${i}`);
      const sortie = op.sortie(etat, appliquer(op, etat), { ids, cle: 'e0', langue: 'fr' });
      assert.deepEqual(sortie, ids.slice(bornes[0], bornes[1]),
        `${op.code} sur « ${saisie} » : sortie() ne nomme pas les jetons de la zone`);
    }
  }
});

/**
 * ★ **`mad` ET `mrd` JOUENT LA MÊME PARTIE, ET SUR LE MÊME TERRAIN.**
 *
 * > « Test de remonter `mad` pour qu'il soit en concurrence avec `mrd`. Vu d'ici
 * >   j'ai l'impression que les deux font la même chose. » (l'auteur)
 *
 * Ils s'en approchent, sans se confondre — mesuré sur les mêmes entrées :
 *
 *     [5,1,6,4,2,6]  → 666        mad « 6 6 6 6 »      mrd « 6 6 6 6 »
 *     [19,1,18,1,8]  → 1998       mad « 1 9 1 9 1 8 »  mrd « 1 9 2 9 8 »
 *     [7,1,0,8,3,3]  → 666        mad refusé           mrd « 1 6 6 »
 *
 * `mad` est GLOUTON — il prend le premier paquet qui va —, `mrd` est OPTIMAL,
 * par programmation dynamique. D'où des découpes différentes, et un `mad` qui
 * refuse là où l'autre trouve.
 *
 * ⚠️ **MAIS ILS NE JOUAIENT PAS SUR LE MÊME TERRAIN, et c'était invisible.**
 *   `mad` s'arrêtait à douze chiffres, `mrd` en accepte trente-six — sans que
 *   rien ne justifie qu'additionner soit trois fois moins lisible que regrouper.
 *   Sur une saisie de treize lettres, un mappeur rend vingt-sept chiffres, si
 *   bien que `mad` refusait AVANT de regarder la cible : il n'apparaissait dans
 *   aucune voie du corpus, et l'on pouvait croire le classement responsable.
 *   Bornes alignées, il en gagne — mesuré : deux voies sur « Millicent Billette »
 *   vers 1998, une sur « Sarah Kerrigan » vers 31031998 —, et il les prend à
 *   `mrd`, qui passe de huit à cinq. C'est bien une concurrence.
 */
test('★ `mad` et `mrd` ont la même largeur — sinon l’un ne concourt pas', () => {
  const mad = PAR_CODE.get('mad');
  const mrd = PAR_CODE.get('mrd');
  assert.ok(mad && mrd);

  // Vingt-sept chiffres : ce que rend un mappeur sur treize lettres, et ce que
  // `mad` refusait tout net. Les deux doivent maintenant l'accepter ou le
  // refuser pour la MÊME raison — leur règle —, jamais pour leur largeur.
  const long = Array.from({ length: 27 }, (_, i) => (i % 9) + 1);
  const tenu = (op) => {
    const r = op.apply(long, long.map(() => []));
    return r !== null;
  };
  assert.equal(tenu(mad), tenu(mrd),
    'l’un accepte une ligne de 27 chiffres et l’autre non : leurs bornes ont divergé');

  // ★ Et ils ne font PAS la même chose : le glouton et l'optimal se séparent.
  const N = (v) => v.map(() => []);
  const v = [19, 1, 18, 1, 8];
  const a = mad.viser('1998').apply(v, N(v));
  const b = mrd.viser('1998').apply(v, N(v));
  assert.ok(a && b, 'les deux savent écrire 1998 depuis cette ligne');
  assert.notDeepEqual(a.valeur, b.valeur,
    'le glouton et l’optimal rendent la même découpe : l’un des deux est de trop');
});

/**
 * ★ **LE REDÉCOUPAGE EXACT (`mrdE`) — toute la ligne, la cible, et rien d'autre.**
 *
 * > « Obtenir non pas approximativement l'objectif mais précisément l'objectif
 * >   — donc additionner les autres chiffres autant de fois que nécessaire pour
 * >   les dissoudre dans l'existant. » (l'auteur)
 *
 * Ce que ce test gèle, dans l'ordre : l'exactitude (la sortie EST la cible,
 * répétée ou non, jamais « presque ») ; la racine numérique comme levier
 * (`d + 9k → d`) ; la seconde passe et le partage d'une somme entre deux
 * voisins ; les refus — l'invariant modulo neuf, la ligne trop courte, la ligne
 * qui n'a rien à additionner — ; et la mise en scène, une étape par addition.
 */
test('★ `mrdE` — le redécoupage exact ne laisse rien, ou ne fait rien', () => {
  const op = PAR_CODE.get('mrdE');
  const sur = (cible, v) => { const r = appliquer(op.viser(cible), N(v)); return r && r.valeur; };

  // ── exactitude : le vecteur du gel, et ce qu'il montre
  assert.deepEqual(sur('666', [6, 5, 1, 9, 3, 3]), [6, 6, 6]);
  assert.deepEqual(op.additions([6, 5, 1, 9, 3, 3]), [2, 3], 'deux additions : 5+1, puis 9+3+3');
  // ── la racine numérique : un chiffre de la cible absorbe des voisins ≡ 0 (mod 9)
  assert.deepEqual(sur('111', [1, 1, 1, 9]), [1, 1, 1], '1 + 9 = 10 → 1 : le 1 ressort intact');
  assert.deepEqual(sur('31031998', [3, 9, 1, 0, 3, 1, 9, 9, 8, 4, 5]), [3, 1, 0, 3, 1, 9, 9, 8],
    'les intrus 9, 4 et 5 se fondent : 3+9 = 12 → 3, 8+4+5 = 17 → 8');
  // ── la seconde passe et le partage : `5 8 7 1` ne s'écrit pas `66` d'une coupe
  assert.deepEqual(sur('66', [5, 8, 7, 1]), [6, 6]);
  assert.deepEqual(op.viser('66').additions([5, 8, 7, 1]), [3, 2],
    '8+7+1 = 16 → « 1 6 » d’abord, puis 5+1 = 6 en seconde passe');
  // ── plusieurs séries quand la ligne le permet, et jamais un chiffre de plus
  assert.deepEqual(sur('666', [6, 6, 6, 6, 5, 1, 6]), [6, 6, 6, 6, 6, 6],
    'sept chiffres, somme 36 : deux séries, et le 5+1 fait le sixième 6');
  // ── le demi-tour ne sert qu'à défaut : à sommes égales, on repasse plutôt
  //    que de poser un 9 (l'ordre du coût : demi-tours, puis seconde passe).
  assert.deepEqual(sur('666', [12, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5]),
    [6, 6, 6, 9, 6, 6, 6, 9, 6], 'deux 9 posés, parce qu’aucune découpe n’en évite un');

  // ── les refus, chacun pour sa raison
  assert.equal(sur('666', [8, 15, 16, 5]), null, 'somme 26 ≢ 0, 3 ou 6 (mod 9) : l’invariant refuse');
  assert.equal(sur('31031998', [3, 1, 0, 3, 1, 9, 9, 8]), null, 'déjà la cible : rien à additionner');
  assert.equal(sur('111', [1, 2]), null, 'deux chiffres n’écrivent pas trois');
  assert.equal(sur('666', [6, 6, 6]), null, 'rien à faire, donc rien à montrer');
  assert.equal(sur('01111984', [5, 5, 1, 1, 1, 9, 8, 4]), null,
    'un 0 en tête ne naît d’aucune addition : la cible est hors d’atteinte');
  assert.equal(op.viser('000'), null, 'viser 000 n’a pas de sens : des sommes ne font pas des zéros');
  assert.equal(op.viser('666'), op, 'le repli sur 666 est l’identité');

  /* ── la mise en scène : une étape par addition, le découpage MUET en tête

     ⚠️ **LA DÉCOUPE N'A PLUS D'ÉTAPE À ELLE**, et c'est une consigne :

     > « Plutôt que de pré-découper visuellement et d'afficher les accolades
     >   pour chaque segment, ne fais la découpe visuelle que sur le moment de
     >   l'opération impliquant ces chiffres. »
     > « `partition` n'a que l'affichage à changer : ça devient une étape
     >   invisible, mais techniquement elle fait la même chose. » (l'auteur)

     Le partitionnement demeure — il pose les groupes, c'est de la structure —
     mais il se glisse en tête du premier calcul de sa passe, avec
     `visible: false`. Ce qui n'a pas bougé : une étape par addition, et la
     seconde passe qui se nomme.

     ★ **ET CHAQUE ADDITION NE PORTE PLUS QUE DEUX TERMES** — « ne fais les
     opérations qu'entre deux valeurs » (l'auteur). `8 + 7 + 1` se montre
     `8 + 7 = 15`, puis `15 + 1 = 16`, et c'est la dernière paire qui écrit la
     somme ENTIÈRE chiffre à chiffre. Le gel porte donc sur TROIS étapes au
     lieu de deux ; la sortie, elle, n'a pas bougé d'un identifiant. */
  const entree = N([5, 8, 7, 1]);
  const vise = op.viser('66');
  const apres = appliquer(vise, entree);
  const ctx = { ids: ['t0', 't1', 't2', 't3'], cle: 'e0', langue: 'fr' };
  const steps = etapes(vise, entree, apres, ctx);
  assert.deepEqual(steps.map((s) => s.ops.map((o) => o.op)), [
    ['partition', 'insertOperators', 'sum'],
    ['insertOperators', 'sum', 'substitute'],
    ['partition', 'insertOperators', 'sum'],
  ], 'deux passes, une étape par paire, le découpage en tête de chacune');
  assert.ok(steps.every((x) => x.ops[0].op !== 'partition' || x.ops[0].visible === false),
    'le découpage est MUET : il ne trace rien, il pose les groupes');
  assert.deepEqual(steps.map((s) => s.caption),
    ['8 + 7 = 15', '15 + 1 = 16 → 1 6', '5 + 1 = 6']);
  assert.ok(steps[2].title.includes('seconde passe'), 'la seconde passe se nomme');
  assert.deepEqual(vise.sortie(entree, apres, ctx), ['e0q1s0', 'e0q0s1x1'],
    'le 6 de gauche naît en seconde passe, celui de droite est l’unité du 16');
  // ── et la racine se montre par un `reduce`, comme `mrn` — sur la somme
  //    ENTIÈRE du paquet, que la dernière paire vient de former
  const r = etapes(op, N([6, 5, 1, 9, 3, 3]), appliquer(op, N([6, 5, 1, 9, 3, 3])),
    { ids: ['t0', 't1', 't2', 't3', 't4', 't5'], cle: 'e0', langue: 'fr' });
  const racine = r.find((s) => s.ops.some((o) => o.op === 'reduce'));
  assert.ok(racine, 'la réduction 15 → 6 est un geste, pas une affirmation');
  assert.equal(racine.caption, '12 + 3 = 15 → 1 + 5 → 6');
});

/* ★ LE RANG QUI REDEVIENT LETTRE — `m1a` (la cible textuelle). Ses refus, et sa
   place hors de la recherche : c'est elle qui garantit que viser un mot ne
   change rien à ce qu'on trouve pour 666. */
test('m1a — de 1 à 26, et rien d’autre : pas de tour de l’alphabet', () => {
  const op = PAR_CODE.get('m1a');
  assert.deepEqual([...appliquer(op, N([1, 26])).valeur], ['a', 'z']);
  assert.equal(appliquer(op, N([0])), null, 'zéro n’a pas de lettre');
  assert.equal(appliquer(op, N([27])), null, '27 n’est pas A : ce serait un modulo caché');
  assert.equal(appliquer(op, N([5, 27, 7])), null, 'un seul rang illisible, et la ligne ne se lit pas');
  assert.equal(appliquer(op, N([-3])), null);
});

test('m1a — inactif en recherche, exécutable partout, et ses lettres sont muées', () => {
  const op = PAR_CODE.get('m1a');
  assert.equal(operateursActifs().includes(op), false,
    'exploré, il changerait la dépense du budget — donc la liste — des cibles chiffrées');
  const avant = N([26, 5, 18, 7]);
  const lettres = appliquer(op, avant);
  assert.equal(lettres.mue, true, 'ce ne sont pas les lettres de la saisie');
  // Sa réglette est celle que le moteur visuel sait recalculer, à rebours.
  const steps = etapes(op, avant, lettres, { ids: ['a', 'b', 'c', 'd'], cle: 'k' });
  assert.equal(steps.length, 4, 'un aller-retour par rang, jamais groupé');
  const t = steps[0].ops[0];
  assert.equal(t.op, 'table');
  assert.equal(t.ordre, '1a26');
  assert.equal(t.letter, '26', 'c’est le NOMBRE qui monte chercher sa case');
  assert.equal(t.to.text, 'z');
  assert.equal(t.montre, true);
  assert.equal(steps[3].ops[0].retire, true);
});

/* ★ UNE TOUCHE DÉSIGNÉE PAR DEUX NOMBRES — `mcaz`, `mcqw`. La convention de
   `mazc`/`mazr` lue à l'envers, et rien d'autre. */
test('mcaz, mcqw — la colonne puis la rangée, et l’aller-retour avec mazc/mazr est exact', () => {
  for (const [code, col, rang] of [['mcaz', 'mazc', 'mazr'], ['mcqw', 'mqwc', 'mqwr']]) {
    const op = PAR_CODE.get(code);
    assert.equal(operateursActifs().includes(op), false, `${code} : inactif en recherche`);
    // Pour CHAQUE lettre : ses coordonnées mesurées par mazc/mazr, relues par
    // mcaz, redonnent la lettre. Deux conventions qui divergeraient d'un cran
    // se verraient ici, sur les vingt-six.
    for (const l of 'abcdefghijklmnopqrstuvwxyz') {
      const x = appliquer(PAR_CODE.get(col), T([l])).valeur[0];
      const y = appliquer(PAR_CODE.get(rang), T([l])).valeur[0];
      assert.deepEqual([...appliquer(op, N([x, y])).valeur], [l], `${code} : (${x}, ${y})`);
    }
  }
  const az = PAR_CODE.get('mcaz');
  assert.equal(appliquer(az, N([2, 1, 3])), null, 'deux nombres par lettre, pas trois');
  assert.equal(appliquer(az, N([7, 3])), null, 'la rangée du bas n’a que six lettres en AZERTY');
  assert.equal(appliquer(az, N([0, 1])), null, 'les colonnes se comptent depuis 1');
  assert.equal(appliquer(az, N([1, 4])), null, 'trois rangées de lettres, pas quatre');
  assert.equal(appliquer(az, N([2, 1])).mue, true, 'ce ne sont pas les lettres de la saisie');
});

/* ★ LES RELECTURES PAR PAIRES — `m1a2`, `mpol`, `mtap`. Chaque paire relue
   redonne sa lettre, et seules les paires de la table se relisent. */
test('m1a2, mpol, mtap — deux chiffres, une lettre : la table entière, et rien d’autre', () => {
  const lettres = 'abcdefghijklmnopqrstuvwxyz';
  for (const [code, attendu, horsTable] of [
    ['m1a2', 26, [[2, 7], [0, 0]]],
    ['mpol', 25, [[6, 1], [1, 6], [0, 1]]],
    // ★ 27 pour le multi-tap : ses 26 lettres, et l'ESPACE sur le 1 (un appui).
    ['mtap', 27, [[1, 2], [2, 4], [7, 5], [0, 1]]],
  ]) {
    const op = PAR_CODE.get(code);
    assert.equal(operateursActifs().includes(op), false, `${code} : inactif en recherche`);
    const ecrites = new Set();
    for (let a = 0; a <= 9; a++) {
      for (let b = 0; b <= 9; b++) {
        const e = appliquer(op, N([a, b]));
        if (e) ecrites.add(e.valeur[0]);
      }
    }
    assert.equal(ecrites.size, attendu, `${code} : ${attendu} lettres, chacune par une seule paire`);
    for (const l of ecrites) {
      assert.ok(lettres.includes(l) || (code === 'mtap' && l === ' '), `${code} : « ${l} » en bas de casse`);
    }
    for (const [a, b] of horsTable) assert.equal(appliquer(op, N([a, b])), null, `${code} : ${a} ${b} hors table`);
    assert.equal(appliquer(op, N([2, 1, 3])), null, `${code} : deux chiffres par lettre, pas trois`);
    assert.equal(appliquer(op, N([12, 1])), null, `${code} : des chiffres, pas des nombres`);
  }
  // Le carré confond i et j, et le dit : il ne relit JAMAIS un j.
  assert.deepEqual([...appliquer(PAR_CODE.get('mpol'), N([2, 4])).valeur], ['i']);
  // Le multi-tap : quatre appuis sur le 7, c'est s.
  assert.deepEqual([...appliquer(PAR_CODE.get('mtap'), N([7, 4])).valeur], ['s']);
  // Et un appui sur le 1, c'est l'espace — la seule chose que ce clavier écrit hors des lettres.
  assert.deepEqual([...appliquer(PAR_CODE.get('mtap'), N([1, 1])).valeur], [' ']);
});

/* ★ ÉCLATER LES NOMBRES EN CHIFFRES — `mecl`. Aucun chiffre créé, un geste montré. */
test('mecl — chaque nombre éclate en ses chiffres, et le geste le montre', () => {
  const op = PAR_CODE.get('mecl');
  assert.equal(operateursActifs().includes(op), false, 'mecl : inactif en recherche');
  assert.equal(op.eclate, true);
  // ★ Sans étape, comme `tca` : la scène joue son geste en ouverture du suivant.
  assert.equal(op.sansEtape, true);
  assert.equal(op.notoriete, 1, 'il n’affirme rien : la notoriété de `m09`');
  assert.equal(op.adHoc, 0, 'il ne regarde pas la cible');
  const entree = N([13924, 7, 25]);
  const apres = appliquer(op, entree);
  assert.deepEqual([...apres.valeur], [1, 3, 9, 2, 4, 7, 2, 5]);
  assert.equal(appliquer(op, N([1, 7, 0])), null, 'que des chiffres seuls : rien à éclater');
  const steps = etapes(op, entree, apres, { ids: ['t0', 't1', 't2'], cle: 'e0' });
  const subs = steps.flatMap((st) => st.ops).filter((o) => o.op === 'substitute');
  assert.equal(subs.length, 1);
  assert.deepEqual(subs[0].pairs.map((pr) => [pr.target, pr.to.map((t) => t.text).join('')]),
    [['t0', '13924'], ['t2', '25']], 'le 7 ne bouge pas, les chiffres recomposent chaque nombre');
});

/* ★ LE CODE ASCII DE CHAQUE SIGNE — `mast`, la matière d'une phrase. */
test('mast — chaque signe imprimable devient son code, ponctuation comprise', () => {
  const op = PAR_CODE.get('mast');
  assert.equal(operateursActifs().includes(op), false, 'mast : inactif en recherche');
  assert.equal(op.matiereDePhrase, true);
  assert.deepEqual([...appliquer(op, T([...'https://reinfocovid.fr/'])).valeur].slice(0, 8),
    [104, 116, 116, 112, 115, 58, 47, 47]);
  assert.deepEqual([...appliquer(op, T(['H', 'h', ' '])).valeur], [72, 104, 32]);
  assert.equal(appliquer(op, T(['é'])), null, 'ASCII n’a pas d’accent');
  assert.equal(appliquer(op, T(['ab'])), null, 'un signe par jeton');
  // ★ La case se désigne par son CODE, et son ÉTIQUETTE est le signe à l'écran —
  //   c'est ce que le pont vérifie (`recherche/scenario.js`, contrôle de `table`).
  const entree = T(['h', 'H', ':']);
  const apres = appliquer(op, entree);
  const steps = etapes(op, entree, apres, { ids: ['t0', 't1', 't2'], cle: 'e0' });
  const tables = steps.flatMap((st) => st.ops).filter((o) => o.op === 'table');
  assert.equal(tables.length, 3, 'un aller-retour par signe');
  tables.forEach((o, i) => {
    const caseDesignee = o.entries.find((e) => e.char === o.letter);
    assert.equal(caseDesignee.label, entree.valeur[i], `la case ${o.letter} s'écrit « ${entree.valeur[i]} »`);
    assert.equal(String(caseDesignee.value), o.to.text);
  });
});

/* ★ LE CODE ASCII EN SIGNE — `masi`. Trois chiffres par signe, les 95 imprimables,
   casse et ponctuation comprises ; rien en dessous de 32, rien au-dessus de 126. */
test('masi — trois chiffres, un signe : les 95 imprimables, et rien d’autre', () => {
  const op = PAR_CODE.get('masi');
  assert.equal(operateursActifs().includes(op), false, 'masi : inactif en recherche');
  assert.equal(op.relecture.reserve, true, 'masi : une relecture de réserve');
  const ecrits = new Set();
  for (let n = 0; n <= 199; n++) {
    const e = appliquer(op, N([Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10]));
    if (e) ecrits.add(e.valeur[0]);
  }
  assert.equal(ecrits.size, 95);
  assert.deepEqual([...appliquer(op, N([0, 6, 7, 0, 3, 9, 0, 3, 3, 0, 3, 2])).valeur], ['C', "'", '!', ' ']);
  assert.equal(appliquer(op, N([0, 3, 1])), null, '31 est un caractère de commande');
  assert.equal(appliquer(op, N([1, 2, 7])), null, '127 aussi');
  assert.equal(appliquer(op, N([6, 7])), null, 'trois chiffres par signe, pas deux');
  assert.equal(appliquer(op, N([67, 0, 0])), null, 'des chiffres, pas des nombres');
});
