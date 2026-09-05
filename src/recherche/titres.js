// src/recherche/titres.js
// Le NOM d'une méthode — pas l'énumération de ses opérations, et pas son
// résultat non plus.
//
// Le README ne dit pas « On prend les lettres une par une, Numérologie
// chaldéenne, On fait la moyenne ». Il dit « Méthode 1 — Le détour
// linguistique », « Méthode 5 — L'affichage 7 segments », « Méthode 6 —
// L'astuce AZERTY et le retournement du 9 ». Un titre NOMME et RACONTE ; il
// permet de choisir une démonstration sans l'ouvrir. La liste des opérations,
// elle, garde toute sa valeur — mais en sous-titre (`regleApproche`).
//
// ══════════════ ★ LA RÈGLE DE FORMATION, ET LES TROIS DÉCISIONS QUI LA FONDENT
//
// Un titre est une locution PRÉPOSITIONNELLE, sans dash, sans énumération,
// sans résultat :
//
//     « Par gématrie anglaise sur les consonnes »
//     « En quatorze segments »
//     « En spacialisation AZERTY »
//
//   1. LA MENTION D'ASSEMBLAGE A DISPARU. Elle disait comment les trois 6
//      étaient réunis — « les 6 groupés par trois », « deux séries de 666 »,
//      « trois voies convergent ». C'est LE RÉSULTAT : l'annoncer au-dessus
//      d'une démonstration qu'on n'a pas encore ouverte en divulgue la chute.
//      L'information n'est pas perdue pour autant — elle est REMONTÉE dans le
//      LISTING, où elle sert à choisir (le compteur « n × 6⋅6⋅6 » à cheval sur
//      le bord droit du panneau, `src/app/pages/resultat.js`) et où elle ne
//      gâche rien, puisqu'on n'a encore rien vu. Elle ne redescend jamais dans
//      le titre, qui suit la voie jusque dans la page d'animation.
//
//   2. LA FORME EST PRÉPOSITIONNELLE, plus nominale. « La gématrie anglaise »
//      était le nom d'une chose ; « Par gématrie anglaise » est le nom d'un
//      CHEMIN — et c'est un chemin qu'on choisit dans cette liste. La
//      préposition n'est pas la même pour tous : elle est choisie par FAMILLE,
//      parce qu'une seule plaquée partout ferait entendre le gabarit au lieu de
//      la méthode (voir la table `NOMS`, où chaque section porte la sienne).
//
//   3. LE QUALIFIANT EST FONDU DANS LA PHRASE. « — On ne garde que les
//      consonnes » est une phrase complète greffée derrière un tiret ; « sur
//      les consonnes » se lit d'un seul souffle. D'où la table `PRECISIONS` :
//      chaque opérateur y a une forme COURTE et PRÉPOSITIONNELLE, distincte de
//      son `libelle` de catalogue, qui reste une phrase parce qu'il s'affiche
//      dans Le Registre où il doit se lire seul.
//
// Le titre est donc dérivé de la SIGNATURE du chemin, jamais de la
// concaténation des libellés :
//
//   1. une VEDETTE — l'opérateur qui donne son nom à la méthode : le mappeur
//      principal, à défaut la mesure, à défaut le dénombrement ; un filtre
//      caractéristique (traduction, Atbash, César…) l'emporte sur tout, parce
//      que c'est lui que le spectateur retiendra ;
//   2. une PRÉCISION DISTINCTIVE — ce que cette voie a en propre dans la liste
//      où elle figure (« sur les consonnes »), posée par `distinguerTitres` ;
//   3. un QUALIFIANT — la pirouette qui distingue deux emplois de la même
//      vedette (« par soustraction », « avec le 9 retourné »).
//
// Bilingue `{fr, en}` comme le reste du catalogue (`src/moteur/i18n.js`).
// L'anglais subit la MÊME transformation que le français — préposition en tête,
// fragment fondu — et non une traduction mot à mot : « By English gematria on
// consonants », « In fourteen segments ».
//
// Aucune source d'entropie, aucun `Intl`, aucun `localeCompare` (CONTRACTS
// §4.4 règle 4) : deux exécutions produisent le même titre au caractère près.

/**
 * Une chaîne affichable du catalogue est un couple `{fr, en}`. Le moteur de
 * recherche code contre le contrat, pas contre le module `src/moteur/i18n.js` :
 * d'où cette lecture locale, tolérante à une chaîne nue (même convention que
 * `scenario.js`).
 */
export const LANGUE_DEFAUT = 'fr';

export function dire(texte, langue = LANGUE_DEFAUT) {
  if (texte === null || texte === undefined) return null;
  if (typeof texte === 'string') return texte;
  if (typeof texte !== 'object') return null;
  return texte[langue] ?? texte[LANGUE_DEFAUT] ?? texte.en ?? null;
}

const b = (fr, en) => ({ fr, en });

// ══════════════════════════════════ 1. les vedettes

/**
 * Priorité de vedette, du plus parlant au moins. Un opérateur absent de cette
 * table ne peut pas donner son nom à la méthode tant qu'un autre le peut.
 */
/**
 * ★ **LES VINGT-QUATRE CÉSARS SANS NOM, EN UNE LIGNE PAR TABLE.**
 *
 * Ils partagent tout sauf leur décalage : les nommer un par un serait
 * vingt-quatre lignes à tenir d'accord dans chacune des trois tables, et la
 * première divergence passerait inaperçue. On les dérive donc du même compte que
 * `transformations/filtres.js › CESARS`, et le treizième garde ses entrées
 * propres — il porte un nom que les autres n'ont pas.
 *
 * @param {(n:number) => any} valeur ce que la table associe au décalage `n`
 */
function cesars(valeur) {
  const out = {};
  for (let n = 1; n <= 25; n++) if (n !== 13) out[`f.cesar${n}`] = valeur(n);
  return out;
}

const PRIORITE = {
  'f.traduitFR': 0, 'f.traduitEN': 0, 'f.atbash': 0, 'f.rot13': 0, 'f.leet': 0,
  ...cesars(() => 0),
  'f.motRepete': 1, 'f.initiales': 1,
  joker: 0,
  mappeur: 2,
  mesure: 3,
  combinateur: 4,
  decoupe: 6,
  filtre: 7,
  finisseur: 8,
};

/**
 * Les mappeurs de service, qui ne nomment rien : ils retouchent un résultat.
 *
 * ★ `m.troisSixDAffilee` (`m36`) les rejoint depuis que le titre ne dit plus le
 * résultat. Il ne calcule rien — il SOULIGNE trois 6 déjà contigus. Laissé
 * vedette, il aurait donné à toute une famille de voies un nom qui annonce
 * exactement la chute qu'on vient de retirer des titres.
 */
const MAPPEURS_DE_SERVICE = new Set([
  'm.reduireChaque', 'm.retirerZeros', 'm.troisSixDAffilee',
  // ★ Le rangement croissant et le redécoupage les rejoignent, pour la même
  //   raison exactement : ils ne CONVERTISSENT rien. Le premier remet dans
  //   l'ordre ce qu'une autre méthode a calculé, le second relit ce qu'elle a
  //   écrit. Aucun des deux ne dit par quel chemin on est passé de la saisie
  //   aux nombres — c'est-à-dire la seule chose qu'un nom de voie doive dire.
  //   Laissés vedettes, ils auraient nommé des dizaines de voies d'après leur
  //   dernière retouche, et le redécoupage aurait en outre intitulé une voie
  //   entière du nom de sa triche.
  'm.triCroissant', 'm.redecoupageChoisi',
  // ★ Le tri alphabétique est du même bois : il RANGE, il ne conclut pas.
  'm.triAlphabetique',
  // ★ Et la LECTURE, plus radicalement encore : elle ne fait rien du tout.
  //   « Par la lecture des chiffres » nommerait une voie d'après le geste de
  //   constater que 9 s'écrit 9 — c'est-à-dire d'après rien. Un opérateur qui
  //   ne s'écrit pas dans l'URL ne peut pas davantage y donner son nom.
  'm.chiffreTelQuel',
]);

/**
 * Nom de méthode par opérateur vedette — une locution PRÉPOSITIONNELLE.
 *
 * ★ La préposition est choisie par FAMILLE, et pas une seule plaquée partout.
 * Elle dit le RAPPORT entre la saisie et la méthode, et ce rapport n'est pas
 * le même selon ce qu'on convoque :
 *
 *   · « Par … »  — un BARÈME, une tradition, un instrument de calcul qu'on
 *                  applique : gématries, numérologies, chiffrements, ASCII,
 *                  opérations arithmétiques. On passe PAR une table.
 *   · « En … »   — une ÉCRITURE, une représentation dans laquelle on relit la
 *                  lettre : segments, traits de crayon, boucles, morse,
 *                  spacialisation clavier. On écrit la lettre EN autre chose.
 *   · « Sur … »  — un SUPPORT physique ou une portion de la saisie qu'on
 *                  désigne : les touches du téléphone, le motif qui revient.
 *   · « En comptant … » — les MESURES. Le gérondif est la seule forme française
 *                  qui reste prépositionnelle sans devenir un nom : « Par le
 *                  compte des voyelles » réintroduit le nominal qu'on vient de
 *                  quitter.
 *   · sans préposition — les DÉCOUPES, déjà adverbiales par nature (« Lettre à
 *                  lettre »). Leur ajouter « En lisant » n'apporterait qu'une
 *                  syllabe.
 *
 * ★ Les paires capitale / bas de casse portent leur précision en APPOSITION
 * après une virgule (« En traits de crayon, capitales ») plutôt qu'en seconde
 * préposition (« …, en capitales ») : deux « en » d'affilée font bégayer la
 * ligne, et l'apposition dit aussi bien de quoi il s'agit.
 */
export const NOMS = {
  // ── filtres caractéristiques
  'f.traduitFR': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitFR2': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitFR3': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitFR4': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitFR5': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitEN': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitEN2': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitEN3': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitEN4': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.traduitEN5': b('Par le détour linguistique', 'Through the linguistic detour'),
  'f.atbash': b('Par le chiffre Atbash', 'Through the Atbash cipher'),
  'f.rot13': b('Par le chiffre de César', 'Through the Caesar cipher'),
  ...cesars((n) => b(`Par le chiffre de César (${n})`, `Through the Caesar cipher (${n})`)),
  'f.leet': b('En leetspeak', 'In leetspeak'),
  'f.motRepete': b('Sur le motif qui revient', 'On the pattern that recurs'),
  'f.initiales': b('Par les initiales', 'By the initials'),

  // ── mesures (STR → NUM) : le gérondif, qui compte au lieu de nommer un compte
  'n.longueur': b('En comptant les lettres', 'By counting the letters'),
  'n.voyelles': b('En comptant les voyelles', 'By counting the vowels'),
  'n.consonnes': b('En comptant les consonnes', 'By counting the consonants'),
  'n.lettresDistinctes': b('En comptant les lettres distinctes', 'By counting the distinct letters'),
  'n.separateurs': b('En comptant les séparateurs', 'By counting the separators'),
  // Les quatre compteurs précis : chacun NOMME le signe qu'il compte, sans
  // quoi quatre voies différentes porteraient le même nom dans la liste.
  'n.barres': b('En comptant les barres obliques', 'By counting the slashes'),
  'n.points': b('En comptant les points', 'By counting the dots'),
  'n.espaces': b('En comptant les espaces', 'By counting the spaces'),
  'n.tirets': b('En comptant les tirets', 'By counting the dashes'),
  'n.mots': b('En comptant les mots', 'By counting the words'),
  'n.lettresPlusVoyelles': b('En comptant lettres et voyelles', 'By counting letters and vowels'),
  'n.lettresPlusConsonnes': b('En comptant lettres et consonnes', 'By counting letters and consonants'),

  // ── mappeurs (la table de conversion qui fait la méthode)
  // ★ « gématrie simple » — et non « numérologie latine », qui a servi un
  // temps. Deux raisons. La première : une fois que `m.englishX6` s'appelle « la
  // gématrie anglaise », les deux barèmes A=1…Z=26 et A=6…Z=156 se retrouvent
  // côte à côte dans la liste sans rien qui les relie ; « simple » et
  // « anglaise » disent d'un coup d'œil que c'est la même famille, l'une nue,
  // l'autre multipliée — et c'est le nom que ce barème porte réellement chez
  // ceux qui pratiquent. La seconde : dans « pythagoricienne, chaldéenne,
  // latine », les deux premières nomment des TRADITIONS et la troisième un
  // ALPHABET ; le lecteur croyait voir une troisième tradition là où il n'y a
  // que le rang de la lettre. L'identifiant `m.a1z26` et le code d'URL `ma1`, eux,
  // ne changent JAMAIS — registre append-only (CONTRACTS §4.1).
  'm.a1z26': b('Par gématrie simple', 'By simple gematria'),
  'm.z26a1': b('Par l’alphabet à rebours', 'By the alphabet backwards'),
  'm.pythagore': b('Par numérologie pythagoricienne', 'By Pythagorean numerology'),
  'm.chaldeen': b('Par numérologie chaldéenne', 'By Chaldean numerology'),
  'm.englishX6': b('Par gématrie anglaise', 'By English gematria'),
  // Le Scrabble se joue : on y compte des points « au » Scrabble, comme on
  // marque au tennis. « Par les points du Scrabble français » disait la même
  // chose en trois mots de plus.
  'm.scrabbleFR': b('Au Scrabble français', 'In French Scrabble'),
  'm.scrabbleEN': b('Au Scrabble anglais', 'In English Scrabble'),
  'm.t9': b('Sur les touches du téléphone', 'On the phone keypad'),
  'm.morseSignaux': b('En morse', 'In Morse code'),
  'm.morseTraits': b('En traits de morse', 'In Morse dashes'),
  'm.asciiMaj': b('Par le code ASCII, capitales', 'By ASCII, capitals'),
  'm.asciiMin': b('Par le code ASCII, bas de casse', 'By ASCII, lower case'),
  'm.seg7': b('En sept segments', 'In seven segments'),
  'm.seg7Fusion': b('En sept segments, traits fusionnés',
    'In seven segments, strokes merged'),
  'm.seg14': b('En quatorze segments', 'In fourteen segments'),
  'm.seg14Fusion': b('En quatorze segments, traits fusionnés',
    'In fourteen segments, strokes merged'),
  'm.traitsMaj': b('En traits de crayon, capitales', 'In pen strokes, capitals'),
  'm.traitsMin': b('En traits de crayon, bas de casse', 'In pen strokes, lower case'),
  'm.extremitesMaj': b('En extrémités libres, capitales', 'In free ends, capitals'),
  'm.extremitesMin': b('En extrémités libres, bas de casse', 'In free ends, lower case'),
  'm.bouclesMaj': b('En boucles fermées, capitales', 'In closed loops, capitals'),
  'm.bouclesMin': b('En boucles fermées, bas de casse', 'In closed loops, lower case'),
  // ★ « spacialisation » et non « géographie » : c'est le mot de l'auteur, et il
  // vaut mieux. Une géographie décrit un territoire donné ; la méthode, elle,
  // PROJETTE la lettre sur une grille — elle la spacialise. Le mot dit le geste.
  'm.azertyColonne': b('En spacialisation AZERTY', 'In AZERTY spatialisation'),
  'm.azertyRangee': b('En rangées AZERTY', 'In AZERTY rows'),
  'm.qwertyColonne': b('En spacialisation QWERTY', 'In QWERTY spatialisation'),
  'm.qwertyRangee': b('En rangées QWERTY', 'In QWERTY rows'),
  'm.azertyRangee4': b('En rangées AZERTY, chiffres compris', 'In AZERTY rows, digits included'),
  'm.qwertyRangee4': b('En rangées QWERTY, chiffres compris', 'In QWERTY rows, digits included'),
  'm.hebreu': b('Par gématrie hébraïque', 'By Hebrew gematria'),
  'm.grec': b('Par isopséphie grecque', 'By Greek isopsephy'),
  'm.longueurNom': b('Par le nom des lettres', 'By the names of the letters'),
  'm.longueurToken': b('Par la longueur des mots', 'By the length of the words'),
  'm.toucheChiffre': b('Par l’astuce AZERTY', 'By the AZERTY trick'),
  // ★ Trois règles de SÉLECTION, pas de conversion : elles ne remplacent pas la
  // valeur d'un jeton, elles décident lesquels restent. D'où « Par la valeur… »
  // et « Un rang sur deux », qui disent un tri, quand « En… » dirait une
  // écriture. `m.unRangSurDeux` se passe de préposition comme les découpes :
  // « un rang sur deux » est déjà une locution adverbiale complète.
  'm.plusFrequent': b('Par la valeur la plus fréquente', 'By the most frequent value'),
  'm.unRangSurDeux': b('Un rang sur deux', 'Every other rank'),
  'm.additionSelective': b('Par addition sélective', 'By selective addition'),
  'm.reduireChaque': b('Par réduction chiffre à chiffre', 'By digit-by-digit reduction'),
  'm.retirerZeros': b('Sans les zéros', 'Without the zeros'),
  // Le pluriel distingue la vedette (un vecteur entier de 9 se retourne) du
  // qualifiant de `p.retournement`, « avec le 9 retourné », qui ne parle que
  // d'un nombre isolé. Deux méthodes, deux noms — sans quoi une liste pourrait
  // porter deux fois la même ligne.
  'm.retournerLesNeuf': b('Par le retournement des 9', 'By flipping the 9s'),
  // ★ Les quatre du 27 août. Deux sont des vedettes possibles — le retournement
  //   par trios et le décompte des chiffres transforment vraiment ce qu'ils
  //   touchent — et deux sont de service (voir `MAPPEURS_DE_SERVICE`), mais
  //   toutes portent un nom : un opérateur sans nom retomberait sur son
  //   `libelle`, c'est-à-dire sur une phrase entière au milieu d'une locution.
  //
  // ⚠️ Le libellé de `mr39` est celui de l'auteur — « On retourne les 666 qui se
  //   cachent » — et il DIVULGUE la chute. C'est parfait dans Le Registre, où
  //   l'on regarde le geste se faire ; c'est interdit dans un titre de liste,
  //   où l'on n'a encore rien vu (test « jamais le résultat dans le nom de la
  //   voie »). Le nom de vedette dit donc le geste et tait ce qu'il produit.
  'm.egalisation': b('Par répartition homogène', 'By evening out'),
  'm.triCroissant': b('Par rangement croissant', 'By ascending order'),
  'm.triAlphabetique': b('Par rangement alphabétique', 'By alphabetical order'),
  'm.retournerLesTrios': b('Par le retournement des trios', 'By flipping the trios'),
  'm.compterLesChiffres': b('Par le décompte des chiffres', 'By tallying the digits'),
  'm.redecoupageChoisi': b('Par redécoupage choisi', 'By chosen recutting'),
  // Jamais employé — il est mappeur de service — mais le registre des noms
  // est EXHAUSTIF, et un trou ici serait un trou le jour où la règle changerait.
  'm.chiffreTelQuel': b('Par la lecture des chiffres', 'By reading the digits'),
  // ★ Elle NOMME une voie, elle, et c'est ce qui la sépare des mappeurs de
  //   service ci-dessus : « on écrit le chiffre en toutes lettres » dit par
  //   quel chemin on est passé — c'est un détour qu'on prend, pas une
  //   retouche qu'on applique à ce qu'un autre a calculé.
  'm.chiffreEnLettres': b('Par le détour des lettres', 'Through the letters detour'),
  // ★ `m36` ne nomme rien et ne DOIT rien nommer : il souligne un 666 déjà écrit,
  // c'est-à-dire le résultat. Il est écarté des vedettes (`MAPPEURS_DE_SERVICE`)
  // et son nom de repli reste muet sur ce qu'il montre.
  'm.troisSixDAffilee': b('Avec le trio souligné', 'With the trio underlined'),

  // ── combinateurs qui, faute de mappeur, font la méthode à eux seuls
  'c.compteTokens': b('Par simple dénombrement', 'By plain counting'),
  'c.compteTokensDistincts': b('Par dénombrement des jetons distincts', 'By counting the distinct tokens'),
  'c.somme': b('Par simple addition', 'By plain addition'),
  'c.soustraction': b('Par soustraction', 'By subtraction'),
  'c.produit': b('Par multiplication', 'By multiplication'),
  'c.alternee': b('En alternant les signes', 'By alternating the signs'),
  // Même nom de méthode que sa jumelle : ce qui les sépare est une PHASE, pas
  // une idée, et un titre de voie n'a pas à trancher entre deux façons de
  // commencer la même alternance.
  'c.alterneeInverse': b('En alternant les signes', 'By alternating the signs'),
  'c.maxMoinsMin': b('Par l’écart des valeurs', 'By the spread of the values'),
  'c.moyenne': b('En moyenne', 'On average'),
'c.moyenneDivisee': b('En moyenne', 'On average'),
  'c.mediane': b('Par la valeur médiane', 'By the median value'),
  'c.cardinal': b('Par le nombre de valeurs', 'By the number of values'),
  'c.concat': b('En collant les chiffres', 'By gluing the digits together'),
  'c.max': b('Par la plus grande valeur', 'By the largest value'),
  'c.min': b('Par la plus petite valeur', 'By the smallest value'),

  // ── découpes, faute de tout le reste : déjà adverbiales, on n'y ajoute rien
  't.caracteres': b('Lettre à lettre', 'Letter by letter'),
  't.mots': b('Mot à mot', 'Word by word'),
  't.separateurs': b('Par les séparateurs', 'By the separators'),
  't.syllabes': b('Syllabe à syllabe', 'Syllable by syllable'),
  't.chiffres': b('Chiffre à chiffre', 'Digit by digit'),

  // ── le joker (CONTRACTS §0.4 : affiché et assumé)
  'j.nomFrancais': b('Par le joker français', 'By the French joker'),
};

// ══════════════════════════════════ 2. les qualifiants

/**
 * La pirouette qui distingue deux emplois de la même vedette. Un seul est
 * retenu — celui de plus faible rang —, sinon le titre redevient l'énumération
 * qu'on cherchait justement à éviter.
 *
 * ★ Ce sont des FRAGMENTS, pas des phrases : ils s'ajoutent au nom après une
 * simple virgule (« En sept segments, en multipliant »), là où un tiret
 * cadratin les tenait naguère à distance.
 *
 * ★ Aucun ne commence par « par » / « by ». La moitié des noms de vedette
 * s'ouvre déjà sur cette préposition, et « Par gématrie simple par
 * multiplication » bégaye. Les combinateurs passent donc au gérondif — « en
 * multipliant », « multiplying » —, qui dit la même chose en disant en plus que
 * c'est une action qu'on exécute pendant le calcul, et non un second barème.
 *
 * Les réductions ordinaires (`p.racineNumerique`, `p.sommeChiffres`,
 * `p.racineMaitres`) n'y figurent pas : elles sont la grammaire commune de la
 * numérologie, elles ne distinguent rien.
 */
export const QUALIFIANTS = {
  'p.retournement': [0, b('avec le 9 retourné', 'with the 9 flipped')],
  'p.miroir': [1, b('lu à l’envers', 'read backwards')],
  'p.complement9': [1, b('au complément à neuf', 'to the nines complement')],
  'p.ecartChiffres': [1, b('en prenant l’écart des chiffres', 'taking the gap between the digits')],
  'p.modulo9': [2, b('modulo neuf', 'modulo nine')],
  'p.modulo10': [2, b('au dernier chiffre', 'down to the last digit')],
  'p.abs': [2, b('en valeur absolue', 'in absolute value')],
  'p.reductionSignee': [2, b('en gardant le signe', 'keeping the sign')],
  'c.soustraction': [3, b('en soustrayant', 'subtracting')],
  'c.produit': [3, b('en multipliant', 'multiplying')],
  'c.alternee': [3, b('en alternant les signes', 'alternating the signs')],
  'c.alterneeInverse': [3, b('en alternant les signes', 'alternating the signs')],
  'c.maxMoinsMin': [3, b('en prenant l’écart', 'taking the spread')],
  'c.moyenne': [3, b('en moyenne', 'on average')],
  'c.mediane': [3, b('à la médiane', 'at the median')],
  'c.concat': [3, b('chiffres collés', 'digits glued together')],
  'c.max': [3, b('au plus grand', 'at the largest')],
  'c.min': [3, b('au plus petit', 'at the smallest')],
  'c.cardinal': [3, b('au nombre de valeurs', 'at the number of values')],
};

// ══════════════════════════════════ 3. les précisions distinctives

/**
 * ★ LA FORME COURTE DE CHAQUE OPÉRATEUR — celle qui se FOND dans un titre.
 *
 * Le catalogue donne à chaque opérateur un `libelle` qui est une PHRASE
 * COMPLÈTE — « On ne garde que les consonnes ». C'est le bon format là où il
 * sert : Le Registre l'affiche seul, ligne à ligne, et une phrase s'y lit sans
 * contexte. Greffée derrière un tiret cadratin dans un titre, en revanche, elle
 * casse la locution en deux et fait de la ligne une énumération :
 *
 *     « La gématrie anglaise — On ne garde que les consonnes »   ← deux blocs
 *     « Par gématrie anglaise sur les consonnes »                ← une phrase
 *
 * D'où cette seconde table. Elle n'est PAS une traduction du `libelle` : c'est
 * un autre registre de langue pour le même opérateur — prépositionnel, minuscule
 * initiale, soudable. Les deux coexistent parce qu'ils servent deux endroits
 * différents ; les confondre reviendrait à choisir lequel des deux endroits on
 * accepte de mal servir.
 *
 * ★ Elle est EXHAUSTIVE, et un test le vérifie (`titres — chaque opérateur du
 * catalogue a sa forme courte`). Le repli sur `op.libelle` existe encore pour ne
 * jamais rendre un titre vide, mais y tomber serait une régression visible : la
 * ligne rattraperait sa phrase à rallonge.
 */
/**
 * ★ **LES TITRES COURTS — deux mots par méthode, pour l'écran de liste.**
 *
 * > « Un titre énumérant avec concision les méthodes employées, max 2 mots par
 * >   méthode/étape. » (l'auteur, sur la carte d'une voie)
 *
 * ★ **POURQUOI UNE TABLE, ET NON UN CHAMP DU CATALOGUE.** C'est le choix déjà
 *   fait pour `NOMS` et `PRECISIONS` juste à côté, et pour la même raison : un
 *   titre court est un travail d'ÉCRITURE, pas une propriété de l'opérateur. Le
 *   rassembler en un seul endroit permet de l'accorder — deux méthodes voisines
 *   doivent s'abréger de la même façon —, ce que cent cinquante déclarations
 *   éparpillées dans quatre fichiers rendraient impossible à relire.
 *
 * ★ **CE N'EST PAS LE TITRE DU REGISTRE, et les deux doivent coexister.** Le
 *   Registre annonce ce qui se passe, en phrase, et il s'accorde à ce que la
 *   ligne porte (« les chiffres » ou « les nombres »). Mesuré : sur 148
 *   opérateurs, HUIT seulement tiennent en deux mots à l'écran, quarante-huit en
 *   font quatre. Les abréger là où ils s'affichent aurait appauvri la
 *   démonstration pour arranger une liste ; ce sont deux textes pour deux
 *   usages.
 *
 * ⚠️ **CE PREMIER JET EST DÉRIVÉ, DONC APPROXIMATIF.** Il a été fabriqué en
 *   retenant les deux premiers mots pleins du libellé, ce qui donne « garde
 *   lettres » (juste) mais aussi « garde ce » et « analyse nom » (boiteux).
 *   L'auteur les reprend ; ce qui compte ici est qu'AUCUN ne manque, et un test
 *   le garantit.
 */
export const TITRES_COURTS = {
  'c.alternee': b('alternance +-+-', 'alternating +-+-'), // cal
  'c.alterneeInverse': b('alternance -+-+', 'alternating -+-+'), // cali
  'c.concat': b('', ''), // ccat
  'c.mediane': b('médiane', 'median'), // cme
  'c.maxMoinsMin': b('Δ maximum', 'Δ spread'), // cmm
  'c.min': b('minimum', 'minimum'), // cmn
  'c.moyenne': b('moyenne', 'average'), // cmo
  'c.moyenneDivisee': b('moyenne', 'average'), // cmod
  'c.max': b('maximum', 'maximum'), // cmx
  'c.compteTokens': b('nombre de caractères', 'character count'), // cnj
  'c.compteTokensDistincts': b('caractères différents', 'distinct characters'), // cnjd
  'c.cardinal': b('cardinal', 'cardinal'), // cnv
  'c.produit': b('multiplication', 'multiplication'), // cp
  'c.somme': b('addition', 'addition'), // cs
  'c.soustraction': b('soustraction', 'subtraction'), // cst
  'f.sansAccents': b('désaccentuation', 'accents stripped'), // fac
  'f.apresSlash': b('extrait /...', 'extracts /...'), // fap
  'f.atbash': b('miroir Atbash', 'Atbash mirror'), // fatb
  'f.avantSlash': b('extrait .../', 'extracts .../'), // fav
  'f.chiffres': b('chiffres seulement', 'digits only'), // fch
  'f.consonnes': b('consonnes', 'consonants'), // fc
  'f.chemin': b('chemin /.../', 'path /.../'), // fchm
  'f.dedoublonne': b('dédoublonnage', 'de-duplication'), // fd
  'f.dedoublonne2': b('dédoublonnage', 'de-duplication'), // fd2
  'f.dedoublonne3': b('dédoublonnage', 'de-duplication'), // fd3
  'f.dedoublonne4': b('dédoublonnage', 'de-duplication'), // fd4
  'f.dedoublonne5': b('dédoublonnage', 'de-duplication'), // fd5
  'f.domaine': b('domaine.xyz', 'domain.xyz'), // fdom
  'f.traduitEN': b('traduction EN', 'EN translation'), // fen
  'f.traduitEN2': b('traduction EN', 'EN translation'), // fen2
  'f.traduitEN3': b('traduction EN', 'EN translation'), // fen3
  'f.traduitEN4': b('traduction EN', 'EN translation'), // fen4
  'f.traduitEN5': b('traduction EN', 'EN translation'), // fen5
  'f.traduitFR': b('traduction FR', 'FR translation'), // ffr
  'f.traduitFR2': b('traduction FR', 'FR translation'), // ffr2
  'f.traduitFR3': b('traduction FR', 'FR translation'), // ffr3
  'f.traduitFR4': b('traduction FR', 'FR translation'), // ffr4
  'f.traduitFR5': b('traduction FR', 'FR translation'), // ffr5
  'f.initiales': b('initiales', 'initials'), // fi
  'f.lettres': b('lettres seulement', 'letters only'), // fl
  'f.leet': b('leetspeak', 'leetspeak'), // flt
  'f.majuscule': b('MAJUSCULE', 'UPPERCASE'), // fmaj
  'f.minuscule': b('minuscule', 'lowercase'), // fmin
  'f.motRepete': b('dédoublonnage', 'de-duplication'), // fmr
  'f.protocole': b('', ''), // fp
  'f.page': b('extrait page.html', 'extracts page.html'), // fpag
  'f.annulationPaires': b('anti-pair', 'pairs cancel'), // fpr
  'f.repetees': b('lettres répétées', 'repeated letters'), // fr
  'f.cesar1': b('César 1', 'Caesar 1'), // fr1
  'f.cesar2': b('César 2', 'Caesar 2'), // fr2
  'f.cesar3': b('César 3', 'Caesar 3'), // fr3
  'f.cesar4': b('César 4', 'Caesar 4'), // fr4
  'f.cesar5': b('César 5', 'Caesar 5'), // fr5
  'f.cesar6': b('César 6', 'Caesar 6'), // fr6
  'f.cesar7': b('César 7', 'Caesar 7'), // fr7
  'f.cesar8': b('César 8', 'Caesar 8'), // fr8
  'f.cesar9': b('César 9', 'Caesar 9'), // fr9
  'f.cesar10': b('César 10', 'Caesar 10'), // fr10
  'f.cesar11': b('César 11', 'Caesar 11'), // fr11
  'f.cesar12': b('César 12', 'Caesar 12'), // fr12
  'f.cesar14': b('César 14', 'Caesar 14'), // fr14
  'f.cesar15': b('César 15', 'Caesar 15'), // fr15
  'f.cesar16': b('César 16', 'Caesar 16'), // fr16
  'f.cesar17': b('César 17', 'Caesar 17'), // fr17
  'f.cesar18': b('César 18', 'Caesar 18'), // fr18
  'f.cesar19': b('César 19', 'Caesar 19'), // fr19
  'f.cesar20': b('César 20', 'Caesar 20'), // fr20
  'f.cesar21': b('César 21', 'Caesar 21'), // fr21
  'f.cesar22': b('César 22', 'Caesar 22'), // fr22
  'f.cesar23': b('César 23', 'Caesar 23'), // fr23
  'f.cesar24': b('César 24', 'Caesar 24'), // fr24
  'f.cesar25': b('César 25', 'Caesar 25'), // fr25
  'f.rot13': b('César 13', 'Caesar 13'), // fr13
  'f.tld': b('sans extension', 'no extension'), // ftld
  'f.unique': b('caractère unique', 'never repeated'), // fun
  'f.voyelles': b('voyelles', 'vowels'), // fv
  'f.voyellesY': b('voyelles', 'vowels'), // fvy
  'f.www': b('', ''), // fw
  'j.nomFrancais': b('', ''), // jnf
  'm.retirerZeros': b('sans zéros', 'no zeros'), // m0
  'm.chiffreTelQuel': b('', ''), // m09
  'm.seg14': b('14 segments', '14 segments'), // m14
  'm.seg14Fusion': b('14 droites', '14 strokes'), // m14F
  'm.unRangSurDeux': b('un sur deux', 'every other'), // m1s2
  'm.troisSixDAffilee': b('', ''), // m36
  'm.seg7': b('7 segments', '7 segments'), // m7
  'm.seg7Fusion': b('7 droites', '7 strokes'), // m7F
  'm.a1z26': b('position alphabétique', 'alphabet position'), // ma1
  'm.additionSelective': b('addition', 'addition'), // mad
  'm.asciiMin': b('code ASCII', 'ASCII code'), // masb
  'm.asciiMaj': b('code ASCII', 'ASCII code'), // masc
  'm.azertyRangee4': b('rangée AZERTY', 'AZERTY row'), // maz4
  'm.azertyColonne': b('colonne AZERTY', 'AZERTY column'), // mazc
  'm.azertyRangee': b('rangée AZERTY', 'AZERTY row'), // mazr
  'm.bouclesMin': b('graphie hermétique', 'closed loops'), // mbob
  'm.bouclesMaj': b('graphie hermétique', 'closed loops'), // mboc
  'm.compterLesChiffres': b('dénombrement sériel', 'serial tally'), // mcc
  'm.chaldeen': b('numérologie chaldéenne', 'Chaldean numerology'), // mch
  'm.egalisation': b('égalisation', 'evening out'), // meg
  'm.extremitesMin': b('extrémités libres', 'free ends'), // mexb
  'm.extremitesMaj': b('extrémités libres', 'free ends'), // mexc
  'm.grec': b('isopséphie grecque', 'Greek isopsephy'), // mgr
  'm.hebreu': b('gématrie hébraïque', 'Hebrew gematria'), // mhe
  'm.chiffreEnLettres': b('chiffre en lettres', 'digit in words'), // mlet
  'm.longueurToken': b('nombre de caractères', 'character count'), // mlm
  'm.longueurNom': b('nombre de caractères', 'character count'), // mln
  // ⚠️ « signaux morse » se lit comme un nom composé bancal ; l'auteur veut
  //   « signaux EN morse », qui dit l'ALPHABET dans lequel on lit et non une
  //   espèce de signal. Même chose pour les traits.
  'm.morseSignaux': b('signaux en morse', 'signals in Morse'), // mms
  'm.morseTraits': b('traits en morse', 'dashes in Morse'), // mmt
  'm.plusFrequent': b('chiffre hégémonique', 'dominant digit'), // mpf
  'm.pythagore': b('numérologie pythagoricienne', 'Pythagorean numerology'), // mpy
  'm.qwertyRangee4': b('rangée QWERTY', 'QWERTY row'), // mqw4
  'm.qwertyColonne': b('colonne QWERTY', 'QWERTY column'), // mqwc
  'm.qwertyRangee': b('rangée QWERTY', 'QWERTY row'), // mqwr
  'm.retournerLesTrios': b('retournement', 'half-turn'), // mr39
  'm.retournerLesNeuf': b('retournement', 'half-turn'), // mr9
  'm.redecoupageChoisi': b('additions futées', 'shrewd additions'), // mrd
  'm.reduireChaque': b('addition', 'addition'), // mrn
  'm.scrabbleEN': b('Scrabble EN', 'EN Scrabble'), // msen
  'm.scrabbleFR': b('Scrabble FR', 'FR Scrabble'), // msfr
  'm.t9': b('clavier téléphonique', 'phone keypad'), // mt9
  'm.triAlphabetique': b('tri', 'sorting'), // mtal
  'm.toucheChiffre': b('touche chiffrée', 'keyed digit'), // mtc
  'm.traitsMin': b('graphie tracée', 'pen strokes'), // mtrb
  'm.traitsMaj': b('graphie tracée', 'pen strokes'), // mtrc
  'm.triCroissant': b('tri', 'sorting'), // mtri
  'm.englishX6': b('gématrie anglaise', 'English gematria'), // mx6
  'm.z26a1': b('alphabet inversé', 'reversed alphabet'), // mz26
  'n.consonnes': b('nombre de consonnes', 'consonant count'), // nc
  'n.lettresDistinctes': b('lettres distinctes', 'distinct letters'), // nd
  'n.espaces': b('nombre d’espaces', 'space count'), // nes
  'n.longueur': b('nombre de lettres', 'letter count'), // nl
  'n.lettresPlusConsonnes': b('lettres+consonnes', 'letters+consonants'), // nlc
  'n.lettresPlusVoyelles': b('lettres+voyelles', 'letters+vowels'), // nlv
  'n.mots': b('nombre de mots', 'word count'), // nm
  'n.points': b('nombre de points', 'dot count'), // npt
  'n.barres': b('nombre de barres', 'slash count'), // nsl
  'n.separateurs': b('nombre de séparateurs', 'separator count'), // nsp
  'n.tirets': b('nombre de tirets', 'dash count'), // ntr
  'n.voyelles': b('nombre de voyelles', 'vowel count'), // nv
  'p.abs': b('valeur absolue', 'absolute value'), // pabs
  'p.complement9': b('complément à 9', 'nines complement'), // pc9
  'p.ecartChiffres': b('delta', 'delta'), // pec
  'p.modulo10': b('modulo 10', 'modulo 10'), // pm10
  'p.modulo9': b('modulo 9', 'modulo 9'), // pm9
  'p.miroir': b('inversion des chiffres', 'digits reversed'), // pmr
  'p.retournement': b('retournement', 'half-turn'), // pr9
  'p.racineMaitres': b('addition', 'addition'), // prm
  'p.racineNumerique': b('addition', 'addition'), // prn
  'p.reductionSignee': b('somme', 'sum'), // prs
  'p.sommeChiffres': b('addition', 'addition'), // psc
  't.caracteres': b('', ''), // tca
  't.chiffres': b('', ''), // tch
  't.mots': b('découpe en mots', 'split into words'), // tm
  't.separateurs': b('séparateurs', 'separators'), // tsp
  't.syllabes': b('découpe en syllabes', 'split into syllables'), // tsy
};

export const PRECISIONS = {
  // ── filtres : ce sur quoi on travaille, ou ce qu'on écarte
  'f.protocole': b('sans le protocole', 'without the protocol'),
  'f.www': b('sans le « www. »', 'without the “www.”'),
  'f.tld': b('sans l’extension', 'without the extension'),
  'f.avantSlash': b('avant le « / »', 'before the “/”'),
  'f.apresSlash': b('après le « / »', 'after the “/”'),
  // Les trois découpes nommées disent l'OBJET, quand leurs aînées disaient la
  // position : c'est toute la différence, et le titre est le seul endroit où le
  // lecteur peut la voir.
  'f.domaine': b('sur le domaine', 'on the domain'),
  'f.chemin': b('sur le chemin', 'on the path'),
  'f.page': b('sur le nom de la page', 'on the page name'),
  'f.lettres': b('sur les lettres seules', 'on the letters alone'),
  'f.chiffres': b('sur les chiffres seuls', 'on the digits alone'),
  'f.voyelles': b('sur les voyelles', 'on the vowels'),
  'f.voyellesY': b('sur les voyelles, Y compris', 'on the vowels, Y included'),
  'f.consonnes': b('sur les consonnes', 'on the consonants'),
  'f.dedoublonne': b('sans les doublons', 'without the duplicates'),
  // Les quatre cadets disent la MÊME chose : c'est la même règle, et la place
  // où le survivant retombe n'a pas à encombrer le titre d'une voie.
  'f.dedoublonne2': b('sans les doublons', 'without the duplicates'),
  'f.dedoublonne3': b('sans les doublons', 'without the duplicates'),
  'f.dedoublonne4': b('sans les doublons', 'without the duplicates'),
  'f.dedoublonne5': b('sans les doublons', 'without the duplicates'),
  'f.annulationPaires': b('les paires annulées', 'with pairs cancelled out'),
  'f.unique': b('sur ce qui ne se répète pas', 'on what never repeats'),
  'f.repetees': b('sur les lettres répétées', 'on the repeated letters'),
  'f.initiales': b('sur les initiales', 'on the initials'),
  'f.motRepete': b('sur le motif répété', 'on the repeated pattern'),
  'f.traduitFR': b('traduit en français', 'translated into French'),
  'f.traduitEN': b('traduit en anglais', 'translated into English'),
  'f.traduitFR2': b('traduit en français', 'translated into French'),
  'f.traduitFR3': b('traduit en français', 'translated into French'),
  'f.traduitFR4': b('traduit en français', 'translated into French'),
  'f.traduitFR5': b('traduit en français', 'translated into French'),
  'f.traduitEN2': b('traduit en anglais', 'translated into English'),
  'f.traduitEN3': b('traduit en anglais', 'translated into English'),
  'f.traduitEN4': b('traduit en anglais', 'translated into English'),
  'f.traduitEN5': b('traduit en anglais', 'translated into English'),
  'f.majuscule': b('en capitales', 'in capitals'),
  'f.minuscule': b('en bas de casse', 'in lower case'),
  'f.sansAccents': b('sans les accents', 'without the accents'),
  'f.leet': b('en leetspeak', 'in leetspeak'),
  'f.atbash': b('après un Atbash', 'after an Atbash'),
  'f.rot13': b('après le chiffre de César', 'after the Caesar cipher'),
  // ⚠️ Minuscule initiale : une précision se soude derrière le nom de la voie,
  //    elle ne recommence pas la ligne (voir le test des titres).
  ...cesars((n) => b(`après un décalage de ${n}`, `after a shift of ${n}`)),

  // ── découpes : le grain de lecture
  't.caracteres': b('lettre à lettre', 'letter by letter'),
  't.mots': b('mot à mot', 'word by word'),
  't.separateurs': b('sur les séparateurs', 'on the separators'),
  't.syllabes': b('syllabe à syllabe', 'syllable by syllable'),
  't.chiffres': b('chiffre à chiffre', 'digit by digit'),

  // ── mesures : « au compte de… », qui reste nominal parce qu'il est en second
  'n.longueur': b('au compte des lettres', 'by letter count'),
  'n.voyelles': b('au compte des voyelles', 'by vowel count'),
  'n.consonnes': b('au compte des consonnes', 'by consonant count'),
  'n.lettresDistinctes': b('au compte des lettres distinctes', 'by distinct-letter count'),
  'n.separateurs': b('au compte des séparateurs', 'by separator count'),
  'n.barres': b('au compte des barres', 'by slash count'),
  'n.points': b('au compte des points', 'by dot count'),
  'n.espaces': b('au compte des espaces', 'by space count'),
  'n.tirets': b('au compte des tirets', 'by dash count'),
  'n.mots': b('au compte des mots', 'by word count'),
  'n.lettresPlusVoyelles': b('lettres et voyelles', 'letters and vowels'),
  'n.lettresPlusConsonnes': b('lettres et consonnes', 'letters and consonants'),

  // ── mappeurs : la même préposition que leur nom de vedette, en minuscule
  'm.a1z26': b('par gématrie simple', 'by simple gematria'),
  'm.z26a1': b('par l’alphabet à rebours', 'by the alphabet backwards'),
  'm.pythagore': b('par la pythagoricienne', 'by the Pythagorean table'),
  'm.chaldeen': b('par la chaldéenne', 'by the Chaldean table'),
  'm.englishX6': b('par la gématrie anglaise', 'by English gematria'),
  'm.scrabbleFR': b('au Scrabble français', 'in French Scrabble'),
  'm.scrabbleEN': b('au Scrabble anglais', 'in English Scrabble'),
  'm.t9': b('sur les touches du téléphone', 'on the phone keypad'),
  'm.morseSignaux': b('en morse', 'in Morse code'),
  'm.morseTraits': b('en traits de morse', 'in Morse dashes'),
  'm.asciiMaj': b('en ASCII, capitales', 'in ASCII, capitals'),
  'm.asciiMin': b('en ASCII, bas de casse', 'in ASCII, lower case'),
  'm.seg7': b('en sept segments', 'in seven segments'),
  'm.seg7Fusion': b('en sept segments fusionnés', 'in merged seven segments'),
  'm.seg14': b('en quatorze segments', 'in fourteen segments'),
  'm.seg14Fusion': b('en quatorze segments fusionnés', 'in merged fourteen segments'),
  'm.traitsMaj': b('en traits de crayon, capitales', 'in pen strokes, capitals'),
  'm.traitsMin': b('en traits de crayon, bas de casse', 'in pen strokes, lower case'),
  'm.extremitesMaj': b('en extrémités libres, capitales', 'in free ends, capitals'),
  'm.extremitesMin': b('en extrémités libres, bas de casse', 'in free ends, lower case'),
  'm.bouclesMaj': b('en boucles fermées, capitales', 'in closed loops, capitals'),
  'm.bouclesMin': b('en boucles fermées, bas de casse', 'in closed loops, lower case'),
  'm.azertyColonne': b('en spacialisation AZERTY', 'in AZERTY spatialisation'),
  'm.azertyRangee': b('en rangées AZERTY', 'in AZERTY rows'),
  'm.qwertyColonne': b('en spacialisation QWERTY', 'in QWERTY spatialisation'),
  'm.qwertyRangee': b('en rangées QWERTY', 'in QWERTY rows'),
  // ★ « chiffres compris » plutôt qu'un numéro : deux formes courtes qui ne
  //   différeraient que par un « 4 » se liraient comme une coquille, alors que
  //   ce qui change est la CONVENTION — on compte la rangée des chiffres, ou
  //   on ne la compte pas.
  'm.azertyRangee4': b('en rangées AZERTY, chiffres compris', 'in AZERTY rows, digits included'),
  'm.qwertyRangee4': b('en rangées QWERTY, chiffres compris', 'in QWERTY rows, digits included'),
  'm.hebreu': b('par la gématrie hébraïque', 'by Hebrew gematria'),
  'm.grec': b('par l’isopséphie grecque', 'by Greek isopsephy'),
  'm.longueurNom': b('par le nom des lettres', 'by the names of the letters'),
  'm.longueurToken': b('par la longueur des mots', 'by the length of the words'),
  'm.toucheChiffre': b('par l’astuce AZERTY', 'by the AZERTY trick'),
  'm.plusFrequent': b('au plus fréquent', 'at the most frequent'),
  'm.unRangSurDeux': b('un rang sur deux', 'every other rank'),
  'm.additionSelective': b('par addition sélective', 'by selective addition'),
  'm.reduireChaque': b('réduit chiffre à chiffre', 'reduced digit by digit'),
  'm.retirerZeros': b('sans les zéros', 'without the zeros'),
  'm.retournerLesNeuf': b('les 9 retournés', 'with the 9s flipped'),
  // ★ Les quatre du 27 août — mêmes précautions que pour les noms de vedette :
  //   le geste, jamais ce qu'il produit.
  'm.egalisation': b('égalisés', 'evened out'),
  'm.triCroissant': b('rangé par ordre croissant', 'sorted in ascending order'),
  'm.triAlphabetique': b('les lettres rangées dans l’ordre', 'with the letters put in order'),
  'm.retournerLesTrios': b('les trios retournés', 'with the trios flipped'),
  'm.compterLesChiffres': b('les chiffres comptés', 'with the digits tallied'),
  'm.redecoupageChoisi': b('redécoupé en paquets', 'recut into packets'),
  // ⚠️ Elle existe, mais ne devrait jamais servir : `m.chiffreTelQuel` est un
  //    mappeur de service, et deux voies ne se distinguent pas par le fait
  //    d'avoir lu leurs chiffres. Sans elle, `precisionDe` se rabattrait sur le
  //    libellé et souderait « Chaque chiffre vaut lui-même » derrière un nom de
  //    voie — une majuscule en milieu de phrase, pour une étape que la
  //    démonstration ne joue pas. Elle est donc au ras du sol, et minuscule.
  'm.chiffreTelQuel': b('les chiffres lus tels quels', 'with the digits read as they stand'),
  'm.chiffreEnLettres': b('écrit en toutes lettres', 'written out in words'),
  // ★ Muet sur ce qu'il souligne — voir `MAPPEURS_DE_SERVICE`. « 666 déjà
  // écrit » serait exact et divulguerait la chute d'une ligne de la liste.
  'm.troisSixDAffilee': b('avec le trio souligné', 'with the trio underlined'),

  // ── combinateurs
  'c.somme': b('par addition', 'by addition'),
  'c.soustraction': b('par soustraction', 'by subtraction'),
  'c.produit': b('par multiplication', 'by multiplication'),
  'c.alternee': b('en alternant les signes', 'alternating the signs'),
  'c.alterneeInverse': b('en alternant les signes', 'alternating the signs'),
  'c.maxMoinsMin': b('par l’écart', 'by the spread'),
  'c.moyenne': b('en moyenne', 'on average'),
'c.moyenneDivisee': b('en moyenne', 'on average'),
  'c.mediane': b('à la médiane', 'at the median'),
  'c.cardinal': b('au nombre de valeurs', 'by the number of values'),
  'c.concat': b('chiffres collés', 'digits glued together'),
  'c.max': b('au plus grand', 'at the largest'),
  'c.min': b('au plus petit', 'at the smallest'),
  'c.compteTokens': b('au nombre de jetons', 'by the number of tokens'),
  'c.compteTokensDistincts': b('au nombre de jetons distincts', 'by the number of distinct tokens'),

  // ── finisseurs
  'p.racineNumerique': b('réduit à un chiffre', 'reduced to a single digit'),
  'p.sommeChiffres': b('chiffres additionnés', 'digits added up'),
  'p.abs': b('en valeur absolue', 'in absolute value'),
  'p.reductionSignee': b('en gardant le signe', 'keeping the sign'),
  'p.ecartChiffres': b('par l’écart des chiffres', 'by the gap between the digits'),
  'p.miroir': b('lu à l’envers', 'read backwards'),
  'p.complement9': b('par complément à neuf', 'by the nines complement'),
  'p.modulo9': b('modulo neuf', 'modulo nine'),
  'p.modulo10': b('au dernier chiffre', 'down to the last digit'),
  'p.retournement': b('avec le 9 retourné', 'with the 9 flipped'),
  'p.racineMaitres': b('hors nombres maîtres', 'master numbers apart'),

  // ── joker
  'j.nomFrancais': b('par le joker français', 'by the French joker'),
};

/**
 * La forme courte d'un opérateur, à souder dans un titre.
 * Repli sur le `libelle` de catalogue : jamais rien, quitte à être long.
 * @param {{id:string, libelle:*}} op
 */
export function precisionDe(op) {
  if (!op) return null;
  return PRECISIONS[op.id] || op.libelle || null;
}

// ══════════════════════════════════ lecture d'un chemin

const opsDe = (approche) => {
  const out = [];
  for (const p of (approche.parts || [])) for (const o of p.chemin.ops) out.push(o);
  return out;
};

const signatureOps = (chemin) => chemin.ops.map((o) => o.id).join('>');

/**
 * La part qui donne son nom : celle dont la signature revient le plus souvent.
 * Sur une RÉSONANCE les trois parts sont identiques ; sur un assemblage
 * hétérogène, c'est la méthode majoritaire qui nomme, et la mention
 * d'assemblage dit qu'il y en a d'autres.
 */
function partPrincipale(approche) {
  const parts = approche.parts || [];
  if (!parts.length) return null;
  const compte = new Map();
  for (const p of parts) {
    const s = signatureOps(p.chemin);
    compte.set(s, (compte.get(s) || 0) + 1);
  }
  let meilleure = null;
  let meilleurCompte = -1;
  for (const p of parts) {
    const n = compte.get(signatureOps(p.chemin));
    if (n > meilleurCompte) { meilleurCompte = n; meilleure = p; }
  }
  return meilleure;
}

function priorite(op) {
  const p = PRIORITE[op.id];
  if (p !== undefined) return p;
  if (op.isJoker) return PRIORITE.joker;
  if (op.famille === 'mappeur' && MAPPEURS_DE_SERVICE.has(op.id)) return PRIORITE.filtre;
  const f = PRIORITE[op.famille];
  return f === undefined ? 9 : f;
}

/** L'opérateur qui donne son nom à la méthode. */
export function vedette(chemin) {
  let choisi = null;
  let rang = Infinity;
  for (const op of chemin.ops) {
    const r = priorite(op);
    if (r < rang) { rang = r; choisi = op; }
  }
  return choisi;
}

function qualifiant(chemin, idVedette) {
  let choisi = null;
  let rang = Infinity;
  for (const op of chemin.ops) {
    if (op.id === idVedette) continue;
    const q = QUALIFIANTS[op.id];
    if (q && q[0] < rang) { rang = q[0]; choisi = q[1]; }
  }
  return choisi;
}

// ══════════════════════════════════ le décret (défaut n° 1)

/**
 * L'approche ne produit-elle qu'UN SEUL 6, écrit trois fois par décret ?
 *
 * Le test est structurel, pas nominal : toutes les parts portent la même portée
 * ET le même programme, donc un seul calcul est montré. C'est la définition
 * exacte du reproche — « le site obtient un 6, puis affirme que ça fait 666 ».
 * Une approche à un seul fragment qui atteint LITTÉRALEMENT 666 n'est pas un
 * décret : elle démontre son résultat d'un seul tenant.
 */
export function estDecret(approche) {
  const parts = approche && approche.parts;
  if (!parts || !parts.length) return false;
  if (parts.length === 1) {
    // Une part unique ne décrète rien dans deux cas : elle atteint 666 d'un
    // seul tenant, ou son vecteur final porte déjà les trois 6 — trois 6
    // calculés, pas un 6 recopié (mode GROUPEMENT, `assemblage.js`).
    return !atteint666(parts[0].chemin) && !porteTroisSix(parts[0].chemin);
  }
  const cle = (p) => `${p.fragment.offset}.${p.fragment.longueur} `
    + p.chemin.ops.map((o) => o.code).join('+');
  const premier = cle(parts[0]);
  return parts.every((p) => cle(p) === premier);
}

function atteint666(chemin) {
  const fin = chemin.etats[chemin.etats.length - 1];
  return fin && fin.type === 'NUM' && fin.valeur === 666;
}

/**
 * L'état final est-il un vecteur portant au moins trois 6 ?
 *
 * Le critère est recalculé ici plutôt qu'importé d'`assemblage.js` : `score.js`
 * importe ce module, `assemblage.js` importe `score.js`, et refermer le triangle
 * créerait un cycle. Trois lignes valent mieux qu'un cycle.
 */
function porteTroisSix(chemin) {
  const fin = chemin && chemin.etats && chemin.etats[chemin.etats.length - 1];
  if (!fin || fin.type !== 'NUMS') return false;
  let n = 0;
  for (const x of fin.valeur) if (x === 6) n++;
  return n >= 3;
}

// ══════════════════════════════════ le titre

/**
 * Le titre bilingue d'une approche : un nom de méthode, pas une énumération —
 * et pas non plus un résultat.
 *
 * ★ Trois morceaux au plus, et DEUX JOINTS DIFFÉRENTS — parce que les deux
 * morceaux ajoutés ne font pas le même travail :
 *
 *     nom + ESPACE + précision distinctive + VIRGULE + qualifiant
 *     « Par gématrie anglaise » + « sur les consonnes » + « en multipliant »
 *     → « Par gématrie anglaise sur les consonnes, en multipliant »
 *
 * La PRÉCISION restreint le domaine de la méthode : elle complète la locution,
 * elle en fait partie, et une virgule l'en détacherait — c'est la forme exacte
 * que l'auteur a donnée en exemple, « Par gématrie anglaise sur les consonnes ».
 * Le QUALIFIANT, lui, parle d'autre chose : de ce qui arrive aux nombres une
 * fois la méthode appliquée. C'est un second membre, et il prend la virgule.
 *
 * ★ Aucune mention d'assemblage. Le nombre de séries de 666, le fait que trois
 * lectures convergent, qu'un 6 soit recopié trois fois — c'est ce que la
 * démonstration doit RÉVÉLER. Le listing le montre à part (« n × 6⋅6⋅6 » sur le
 * bord droit du panneau) ; le titre, lui, voyage jusque dans la page
 * d'animation, où le dire d'avance gâcherait la chute.
 *
 * @param {Object} approche
 * @returns {{fr:string, en:string}}
 */
export function titreBilingue(approche) {
  const part = partPrincipale(approche);
  if (!part) return b('Démonstration', 'Demonstration');
  const chemin = part.chemin;
  const tete = vedette(chemin);
  const nom = (tete && NOMS[tete.id])
    || (tete && tete.libelle)
    || b('Démonstration', 'Demonstration');
  const q = tete ? qualifiant(chemin, tete.id) : null;
  return assembler(nom, approche.distinction, q);
}

/**
 * Assemble les trois morceaux d'un titre, chacun à sa jointure.
 *
 * ★ Le doublon exact est écarté. La précision et le qualifiant sortent parfois
 * du MÊME opérateur — `p.retournement` donne « avec le 9 retourné » des deux
 * côtés —, et « … avec le 9 retourné, avec le 9 retourné » serait le seul
 * bégaiement que ces tables puissent produire. On compare sur le français, qui
 * fait foi : les deux langues sont posées ensemble dans un même `b()`, elles ne
 * peuvent pas diverger sur la PRÉSENCE d'un morceau.
 */
function assembler(nom, precision, qualif) {
  const rendu = {};
  const dejaFr = new Set();
  const retenir = (m) => {
    const cle = dire(m, 'fr');
    if (!cle || !cle.length || dejaFr.has(cle)) return false;
    dejaFr.add(cle);
    return true;
  };
  const morceaux = [];
  if (retenir(nom)) morceaux.push([' ', nom]);
  if (retenir(precision)) morceaux.push([' ', precision]);
  if (retenir(qualif)) morceaux.push([', ', qualif]);

  for (const langue of ['fr', 'en']) {
    let texte = '';
    for (const [joint, m] of morceaux) {
      const mot = dire(m, langue);
      if (!mot || !mot.length) continue;
      texte = texte ? texte + joint + mot : mot;
    }
    rendu[langue] = texte || (langue === 'en' ? 'Demonstration' : 'Démonstration');
  }
  return rendu;
}

/**
 * Le titre d'une approche dans une langue donnée.
 * Signature conservée depuis `scenario.js`, qui l'exporte toujours.
 */
export function titreApproche(approche, langue = LANGUE_DEFAUT) {
  return dire(titreBilingue(approche), langue)
    || (langue === 'en' ? 'Demonstration' : 'Démonstration');
}

/**
 * La règle affichée sous le titre : la suite des libellés de règle, dédoublonnée.
 * C'est le SOUS-TITRE — l'énumération garde sa valeur, elle ne fait juste plus
 * office de nom.
 */
export function regleApproche(approche, langue = LANGUE_DEFAUT) {
  const regles = [];
  // ★ Les RETOUCHES d'abord, et dans l'ordre où elles ont été jouées. Le
  //   sous-titre énumère ce qu'on fait à la saisie ; taire l'étage qui la
  //   RÉÉCRIT ferait annoncer une règle qui ne mène pas au résultat montré —
  //   sur « Donald Trump », « on trie, on compte les segments » sans dire qu'on
  //   a d'abord chiffré le second mot. Le TITRE, lui, ne bouge pas : il nomme
  //   la méthode par sa vedette, et une préparation n'est pas la méthode.
  for (const p of [...(approche.retouches || []), ...(approche.parts || [])]) {
    for (const o of p.chemin.ops) {
      const r = dire(o.regle, langue);
      if (r && !regles.includes(r)) regles.push(r);
    }
  }
  return regles.join(' · ');
}

export function regleBilingue(approche) {
  return { fr: regleApproche(approche, 'fr'), en: regleApproche(approche, 'en') };
}

// ══════════════════════════════════ unicité dans une liste (défaut n° 4)

/**
 * Deux lignes d'une même liste ne peuvent pas porter le même titre : le visiteur
 * n'aurait aucun moyen de les distinguer sans les ouvrir.
 *
 * On ne numérote pas — « (2) » n'apprend rien. On cherche, pour chaque
 * homonyme, le PREMIER opérateur qui n'appartient qu'à lui dans le groupe, et
 * on le donne comme distinction — sous sa FORME COURTE (`PRECISIONS`), la seule
 * qui se soude au nom. Faute d'opérateur propre (deux approches aux mêmes
 * opérateurs sur des fragments différents), on distingue par le texte des
 * fragments. En dernier recours seulement, par la suite des codes — qui est
 * unique par construction.
 *
 * ★ CE MÉCANISME PORTE PLUS LOURD QU'AVANT. Les titres ont raccourci : la
 * mention d'assemblage les distinguait gratuitement (« deux séries de 666 » vs
 * « les 6 groupés par trois »), et elle a disparu. Deux voies qui ne
 * différaient que par leur récolte se retrouvent donc homonymes et redescendent
 * ici. C'est voulu — la distinction qu'on fabrique alors nomme une VRAIE
 * différence de méthode, là où le compte de séries n'était qu'un résultat — mais
 * ça met l'échelle des recours sous tension, d'où le palier supplémentaire
 * ajouté avant le dernier (voir plus bas, « la portée »).
 *
 * La distinction est POSÉE SUR L'APPROCHE (`a.distinction`), jamais sur la
 * chaîne rendue : `titreApproche` reste une fonction pure de l'approche, si
 * bien qu'un changement de langue dans l'interface (`src/app/pont.js`)
 * recompose exactement le même titre, distinction comprise.
 *
 * @param {Object[]} approches liste ordonnée, mutée en place
 * @returns {Object[]} la même liste
 */
export function distinguerTitres(approches) {
  for (const a of approches) a.distinction = null;
  const groupes = new Map();
  for (const a of approches) {
    const cle = titreApproche(a, 'fr');
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(a);
  }
  for (const [, groupe] of groupes) {
    if (groupe.length < 2) continue;
    const ailleurs = groupe.map((a) => {
      const autres = new Set();
      for (const x of groupe) {
        if (x === a) continue;
        for (const o of opsDe(x)) autres.add(o.id);
      }
      return autres;
    });
    groupe.forEach((a, i) => {
      const propre = opsDe(a).find((o) => !ailleurs[i].has(o.id));
      if (propre) { a.distinction = precisionDe(propre); return; }
      // Rien en propre parce qu'on est le PLUS DÉPOUILLÉ du groupe : les autres
      // ajoutent un filtre, une pirouette, et nous non. C'est une différence
      // parfaitement nommable — « la règle seule » —, et il ne peut y en avoir
      // qu'un, puisqu'on exige d'être STRICTEMENT le plus court. Sans elle, la
      // ligne se distinguait par sa suite de codes : « Par l'alphabet à rebours
      // tca+mz26+mrn », qui n'apprend rien à personne.
      // ★ « sans autre règle » et non « la règle seule » : le morceau se SOUDE
      // au nom sans ponctuation d'attente, comme toutes les précisions.
      const taille = (x) => new Set(opsDe(x).map((o) => o.id)).size;
      if (groupe.every((x) => x === a || taille(x) > taille(a))) {
        a.distinction = { fr: 'sans autre règle', en: 'with no other rule' };
        return;
      }
      const textes = [...new Set((a.parts || []).map((p) => p.fragment.texte))].join(' · ');
      const autresTextes = groupe
        .filter((x) => x !== a)
        .map((x) => [...new Set((x.parts || []).map((p) => p.fragment.texte))].join(' · '));
      if (textes && !autresTextes.includes(textes)) {
        a.distinction = { fr: `sur « ${textes} »`, en: `on “${textes}”` };
        return;
      }
      // ★ Ce qui distingue n'est pas toujours UN opérateur : c'est parfois une
      // COMBINAISON. À trois lignes ou plus, chaque opérateur peut se retrouver
      // ailleurs sans qu'aucune ligne se répète — `fatb+tca+mt9+mr9` face à
      // `fatb+tca+mpy+mr9` et `fatb+tca+mt9` : ni le clavier téléphonique ni le
      // retournement des 9 ne lui appartiennent, leur RENCONTRE si. On nomme
      // alors tout ce qui varie dans le groupe, c'est-à-dire ce que cette ligne
      // a en propre une fois retiré le fonds commun. C'est plus long qu'un nom,
      // mais ça se lit — au contraire de « fatb+tca+mt9+mr9 », qui n'apprend rien à
      // personne et donne à voir la plomberie.
      const commun = new Set(opsDe(groupe[0]).map((o) => o.id));
      for (const x of groupe.slice(1)) {
        const siens = new Set(opsDe(x).map((o) => o.id));
        for (const id of [...commun]) if (!siens.has(id)) commun.delete(id);
      }
      const propres = [];
      const vus = new Set();
      for (const o of opsDe(a)) {
        if (commun.has(o.id) || vus.has(o.id)) continue;
        vus.add(o.id);
        propres.push(precisionDe(o));
      }
      if (propres.length) {
        a.distinction = {
          fr: propres.map((l) => dire(l, 'fr')).filter(Boolean).join(', '),
          en: propres.map((l) => dire(l, 'en')).filter(Boolean).join(', '),
        };
        if (a.distinction.fr) return;
      }
      // ★ AVANT-DERNIER RECOURS : LA PORTÉE, c'est-à-dire OÙ la méthode
      // s'applique. Deux voies peuvent partager tous leurs opérateurs et ne
      // différer que par le NOMBRE de morceaux qu'elles moissonnent, ou par
      // leur place dans la saisie ; le texte des fragments ne les sépare pas
      // (branche précédente) parce qu'il est identique à l'ensemble près —
      // « hope » deux fois contre « hope » trois fois donne la même liste
      // dédoublonnée. On nomme alors ce qui varie vraiment : le compte de
      // portées, et à défaut leur position.
      //
      // Ce palier n'existait pas tant que la mention d'assemblage tenait les
      // homonymes à distance. Il dit une différence de MÉTHODE (sur combien de
      // morceaux on travaille), jamais le résultat (combien de 666 en sortent) :
      // trois portées peuvent rendre une série comme trois.
      const portees = (a.parts || []).length;
      const autresPortees = groupe.filter((x) => x !== a).map((x) => (x.parts || []).length);
      if (portees && !autresPortees.includes(portees)) {
        a.distinction = portees === 1
          ? { fr: 'sur une seule portée', en: 'on a single stretch' }
          : { fr: `sur ${portees} portées`, en: `on ${portees} stretches` };
        return;
      }
      const offsets = (a.parts || []).map((p) => p.fragment.offset).join('-');
      const autresOffsets = groupe
        .filter((x) => x !== a)
        .map((x) => (x.parts || []).map((p) => p.fragment.offset).join('-'));
      if (offsets && !autresOffsets.includes(offsets)) {
        const debut = (a.parts || [])[0];
        a.distinction = {
          fr: `à partir du caractère ${(debut && debut.fragment.offset) + 1}`,
          en: `from character ${(debut && debut.fragment.offset) + 1}`,
        };
        return;
      }
      // Dernier recours : la suite des codes, unique par construction. On n'y
      // arrive que si deux lignes ont exactement les mêmes opérateurs sur les
      // mêmes fragments — auquel cas il n'y a plus rien à dire d'elles.
      const codes = (a.parts || []).map((p) => p.chemin.ops.map((o) => o.code).join('+')).join(',');
      a.distinction = { fr: codes, en: codes };
    });
  }
  return approches;
}

/** Pose `titre` et `regle` bilingues sur chaque approche, titres rendus uniques. */
export function nommer(approches) {
  distinguerTitres(approches);
  for (const a of approches) {
    a.titre = titreBilingue(a);
    a.regle = regleBilingue(a);
  }
  return approches;
}

/**
 * Le titre court d'un opérateur — voir `TITRES_COURTS`.
 *
 * Rendu `null` quand il manque, plutôt qu'un repli silencieux sur le libellé :
 * un titre de quatre mots glissé dans une énumération qui en promet deux se
 * verrait moins qu'un trou, et c'est le trou qu'on veut voir.
 */
export function titreCourtDe(op) {
  return (op && TITRES_COURTS[op.id]) || null;
}
