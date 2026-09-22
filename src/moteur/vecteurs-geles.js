/**
 * Les VECTEURS GELÉS du catalogue — un par opérateur publié.
 *
 * Ils vivaient dans `catalogue.test.js`, qui les emploie toujours pour geler les
 * codes publiés (CONTRACTS §4.1). Ils en sortent parce qu'un second lecteur en a
 * besoin : la garde du cadre (`visuel/tests/cadre.test.js`) joue le geste de
 * CHAQUE opérateur sur son vecteur, pour vérifier que la ligne reste à l'écran.
 * `catalogue.test.js` exige un vecteur par opérateur ; un opérateur ajouté est
 * donc surveillé par la garde sans que personne n'y pense.
 *
 * Un module et non un fichier de test : importer un `.test.js` y inscrirait ses
 * tests dans la suite de l'importateur.
 */

import { depuisSaisie, tokens, nums, num } from './etat.js';

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
export const VECTEURS = [
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
  /* ★ LES QUATORZE CÉSARS JUSTIFIÉS — et ils ne peuvent PAS être gelés sur
     « hope », qui n'a qu'un mot : chacun exige une saisie dont la lecture
     « caractères communs à chaque mot » écrit son propre décalage
     (`filtres.js › lectureDesCommuns`). Le vecteur gèle donc les deux moitiés
     d'un coup — la preuve ET le décalage —, ce qui est exactement ce qu'on veut
     tenir : un `fj22` qui accepterait une saisie ne disant pas 22 aurait perdu
     sa seule raison d'exister.

     ★ Les deux cas de l'auteur sont en tête, en toutes lettres. Les douze
     autres emploient un `x` répété, et c'est délibéré : un seul caractère
     commun, compté autant de fois qu'il paraît, met la lecture à nu (« un `x`
     d'un côté, cinq de l'autre : 15 ») et rend la sortie vérifiable de tête —
     `x` est la 24ᵉ lettre, on lui ajoute le décalage, on retranche 26.

     Comme pour leurs aînés, les sorties sont calculées À LA MAIN, pour qu'elles
     ne viennent pas de la fonction qu'elles vérifient. */
  ['fj11', S('Didier Raoult'), 'Ototpc Clzfwe'],
  ['fj22', S('Louis Fouché'), 'Hkqeo Bkqydé'],
  ['fj21', S('xx x'), 'ss s'],
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
  //
  // ★ **CE CALCUL EST DEVENU CELUI DE `mrd9`** (19 septembre 2026) : « fais
  //   `mrd9` qui garde les 9, et `mrdE` ne les garde pas » (l'autrice). `mrd` ne
  //   vise plus que le 6 — un 9 s'y additionne comme un intrus —, et sur les
  //   mêmes trente chiffres il écrit sept 6 (deux séries) là où `mrd9` écrit
  //   quatre 6 et sept 9 (trois séries, une fois `mr9` passé). Le calcul de
  //   l'auteur est gelé plus bas, sous son nouveau code, au chiffre près.
  ['mrd', N('9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number)),
    [3, 6, 2, 6, 2, 6, 2, 6, 6, 6, 1, 2]],
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
  // ★ Le code ASCII casse comprise : la capitale, le bas de casse, l'apostrophe
  //   droite, et l'accent retiré (« é » vaut « e », 101).
  ['mas', T([...'Mé\'m']), [77, 101, 39, 109]],
  // ★ Le point de code : le même « é » vaut 233, et « M » 77 comme en ASCII.
  ['mu8', T([...'Mé\'m']), [77, 233, 39, 109]],
  // ★ L'addition vers la moyenne : « Donald Trump » en `fl+tca+mt9+mtri`,
  //   S = 61. Dix termes au lieu d'onze — `2 + 3` —, et `meg` en tirera neuf 6.
  ['mam', N([2, 3, 3, 5, 6, 6, 6, 7, 7, 8, 8]), [5, 3, 5, 6, 6, 6, 7, 7, 8, 8]],
  // Le carré : trois chiffres deviennent cinq, et c'est tout ce qu'on lui demande.
  ['mcar', N([115, 97, 114]), [13225, 9409, 12996]],
  // La puissance regarde le PREMIER CHIFFRE du nombre suivant — 5², puis 2⁵,
  // le dernier revenant au premier.
  ['mpui', N([5, 2]), [25, 32]],
  // La factorielle s'écrit comme elle se calcule : 4 × 3 × 2 × 1, puis 3 × 2 × 1.
  ['mfac', N([4, 3]), [24, 6]],
  // ★ Les trois redécoupages qui FUSIONNENT, chacun sur une ligne où son modèle
  //   écrit moins. `2 2 4 4` : `mrd` n'y trouve qu'un 6 (`2+4` au milieu) ;
  //   accolés, `22 + 44 = 66` en écrit deux.
  ['mrdf', N([2, 2, 4, 4]), [6, 6]],
  // `6 5 6 1` : le 6 reste, et `5 + 61 = 66` écrit les deux suivants — `mrdE`
  //   n'y écrit rien, aucune somme de chiffres voisins n'y tombant deux fois.
  ['mrfE', N([6, 5, 6, 1]), [6, 6, 6]],
  // `9 14 1 8 3 5 5 8 4 16` : égalisée telle quelle, la ligne tombe sur des 7
  //   et des 8 — aucun 6. Coupé en `1 6`, le dernier nombre la fait tomber sur
  //   neuf 6 : une coupe, quinze transferts.
  ['megf', N([9, 14, 1, 8, 3, 5, 5, 8, 4, 16]), [6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 6]],
  // ★ LES VARIANTES AVEC 9 — chacune sur une ligne où elle garde un 9 pour le
  //   demi-tour d'un `mr9`, là où son modèle, qui ne vise que le 6, écrit moins
  //   ou se tait. Une variante qui ne garde aucun 9 se tait (`mappeurs.js ›
  //   declinerAvecNeuf`).
  // `5 16 8 16` : `8 + 1 = 9`, gardé pour le demi-tour — `mad` en fait `8 1`.
  ['mad9', N([5, 16, 8, 16]), [6, 6, 9, 6]],
  // Le calcul de l'auteur, `999991691662692`, qui était celui de `mrd` : voir
  //   plus haut. Coupe pour coupe : `999 7+1+1 2+1+0+5+1 1 6 9 7+1+0+8 1+0+5
  //   1+1 5+1+0 9 1+0+1`.
  ['mrd9', N('9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number)),
    [9, 9, 9, 9, 9, 1, 6, 9, 1, 6, 6, 2, 6, 9, 2]],
  // `6 5 1 9 3 3 6 9` : la somme (42) n'est pas un multiple de neuf, `mrdE`
  //   ne peut rien écrire ; en gardant les deux 9, deux séries : `6 · 5+1 · 9
  //   · 3+3 · 6 · 9`.
  ['md9E', N([6, 5, 1, 9, 3, 3, 6, 9]), [6, 6, 9, 6, 6, 9]],
  // `2 2 7 7` : `22 + 77 = 99`, deux 9 d'une addition, que `mr9` rendra `66` —
  //   `mrdf` s'y tait.
  ['mrf9', N([2, 2, 7, 7]), [9, 9]],
  // `1 6 5 9` : `1 + 65 = 66`, et le 9 reste seul — `mrfE` n'y écrit rien.
  ['mf9E', N([1, 6, 5, 9]), [6, 6, 9]],
  // `8 8 8 1 1` : `1 1` soudés en `11`, et l'égalisation tombe sur trois 9 et
  //   un 8 — `megf`, qui ne vise que le 6, s'y tait.
  ['mef9', N([8, 8, 8, 1, 1]), [9, 9, 8, 9]],
  // ★ LE REDÉCOUPAGE EXACT AVEC TRI. `3 6 3 3 3` : aucune découpe exacte de la
  //   ligne telle qu'elle est (`3 + 6 = 9` ne vaut rien, `mrdE` se tait) ; le 6
  //   passe devant, les quatre 3 se touchent, `3 + 3` et `3 + 3`.
  ['mrtE', N([3, 6, 3, 3, 3]), [6, 6, 6]],
  // `6 3 4 3 5` : le 6 devant, `3 3 4 5` rangés derrière — `3 + 3 = 6`, et
  //   `4 + 5 = 9` à retourner. `md9E` n'y écrit rien sans ranger.
  ['mt9E', N([6, 3, 4, 3, 5]), [6, 6, 9]],
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
