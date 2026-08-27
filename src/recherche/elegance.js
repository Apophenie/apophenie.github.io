// src/recherche/elegance.js
// ★ L'ÉLÉGANCE D'UNE SOLUTION, RENDUE MESURABLE — CONTRACTS.md §5, amendement
//   « l'élégance se mesure sur le CHEMIN ».
//
// « J'ai bien conscience qu'attribuer des scores aux étapes et au chemin en plus
//  d'en attribuer au résultat final complexifie, mais c'est je pense ce qui va
//  permettre de rendre mesurable l'élégance d'une solution par rapport à une
//  autre. » — l'auteur.
//
// ══════════════════════════════════════════════════════════════════════════════
// POURQUOI UN MODULE À PART, ET POURQUOI ICI
// ══════════════════════════════════════════════════════════════════════════════
//
// Les six critères de `score.js` se lisent tous sur l'ÉTAT FINAL d'une approche
// — la méthode employée, la couverture de la saisie, la longueur rendue, les
// nombres traversés. Ce que l'auteur décrit est d'une autre nature : une
// comptabilité de ce qui se passe PENDANT le calcul. « Un 6 déjà apparu qu'on
// convertit en autre chose », « casser un 666 contigu déjà trouvé », « une
// moyenne qui nécessite un arrondi » — rien de tout cela ne se lit sur le
// dernier état. Il faut instrumenter les états INTERMÉDIAIRES, et c'est le seul
// travail de ce module.
//
// Il est séparé de `score.js` pour trois raisons, dans cet ordre :
//  1. `score.js` est sur le chemin CHAUD du BFS (`scoreDeAcc` est appelé ~10⁶
//     fois par saisie). Rien de ce qui suit n'y a sa place : le bilan se calcule
//     UNE fois par approche retenue, sur une poignée d'objets ;
//  2. les réglages d'un barème qu'on veut ÉTALONNER doivent tenir en un seul
//     endroit, lisible d'un œil (même doctrine que `POIDS` et `REGLAGES`) ;
//  3. le bilan est publié tel quel (`approche.bilan`) : c'est ce qui permet au
//     banc de mesure d'afficher POURQUOI une approche perd, et pas seulement de
//     combien. Un barème qu'on ne peut pas déboguer ne se règle pas.
//
// ══════════════════════════════════════════════════════════════════════════════
// LES DEUX RÈGLES QUI CONTRAIGNENT TOUT LE RESTE
// ══════════════════════════════════════════════════════════════════════════════
//
// · **Déterminisme strict** (§4.4) : arithmétique ENTIÈRE de bout en bout. Pas
//   un flottant, pas un `Math.round` sur un quotient, pas d'`Intl`, pas de
//   `localeCompare`. Les fractions sont écrites `[numérateur, dénominateur]` et
//   appliquées par `Math.floor((x * num) / den)`.
//
// · **Rejouabilité depuis une URL** (§4.3) : tout ce qui suit se RECALCULE
//   depuis les parts et leurs chemins — c'est-à-dire depuis ce que `rejouer`
//   reconstruit en exécutant les codes de l'URL. Rien n'est transporté, rien
//   n'est mémorisé d'une exécution à l'autre, rien ne dépend de la place dans la
//   liste. Une URL rejouée retrouve donc exactement le bilan, donc exactement le
//   score, de la ligne dont elle est issue. C'est vérifié par un test.
//
// ══════════════════════════════════════════════════════════════════════════════
// ★ LES TROIS PALIERS QUI DORMAIENT — ET QUI MORDENT DÉSORMAIS
// ══════════════════════════════════════════════════════════════════════════════
//
// Trois demandes de l'auteur ne trouvaient RIEN à mesurer dans le catalogue,
// parce que l'opérateur qu'elles pénalisent n'existait pas : « le plus fréquent
// l'emporte », « garder un caractère sur deux », « l'addition SÉLECTIVE de
// chiffres contigus » (`6, 5+1, 6, 8`). Leurs paliers étaient écrits, à leur
// place dans la hiérarchie, mais leurs compteurs valaient toujours zéro.
//
// L'auteur a tranché : « je me doute — ma demande c'est AUSSI de les ajouter au
// catalogue, mais avec un score bas, mais moins bas que la suppression
// arbitraire de ce qui n'est pas 6. » Trois opérateurs ont donc été alloués
// (`mpf` le plus fréquent, `m1s2` un rang sur deux, `mad` l'addition sélective —
// `src/moteur/transformations/mappeurs.js`), et les trois compteurs sont
// branchés dessus.
//
// ★ **L'UNITÉ DES TROIS PALIERS EST CELLE DE `VALEUR_JETEE` : ce que la ficelle
// COÛTE PAR VALEUR.** C'est ce qui rend la phrase de l'auteur mesurable —
// « moins bas que la suppression arbitraire de ce qui n'est pas 6 » compare deux
// façons de se débarrasser d'une valeur, et elles doivent donc se comparer au
// même prix unitaire. Se débarrasser d'un 4 parce que le 6 est majoritaire
// (`MAJORITE`) coûte un peu moins cher que s'en débarrasser parce que ce n'est
// pas un 6 (`VALEUR_JETEE`) ; un rang sur deux coûte moins encore ; et
// l'addition sélective, qui ne jette rien mais ABSORBE, est la moins chère des
// quatre — l'auteur le dit lui-même, se débarrasser de chiffres n'est
// acceptable que « si ça évite de se débarrasser artificiellement de chiffres
// qu'on peut absorber arithmétiquement ».
//
// ★ **ET LA PEINE N'EST COMPTÉE QU'UNE FOIS.** Ce que ces trois opérateurs
// écartent n'entre PAS dans `valeursJetees` : leur palier EST le prix de
// l'écartement, il ne s'y ajoute pas. Les compter aux deux endroits ferait de la
// ficelle une chose PLUS chère que le tri arbitraire qu'elle est censée valoir
// mieux que — c'est-à-dire l'inverse exact de la consigne. C'est la même
// discipline que `SIX_DETRUIT`, qui exclut déjà le rétrécissement d'un vecteur
// « sans quoi un même chiffre serait puni deux fois pour un seul geste ».
//
// ★ **`adHoc` ne double pas le barème non plus.** `critereAntiAdHoc`
// (`score.js`) mesure une chose GÉNÉRIQUE — « cette méthode est-elle taillée
// pour la cible ? » — sur le score de conviction ; le barème d'élégance mesure
// une chose SPÉCIFIQUE — « qu'a-t-on fait, exactement, pendant le calcul ? » —
// sur le chemin. Les deux se composent, comme ils se composent déjà pour `mr9`
// (adHoc 0,35, aucun palier) et pour `c.moyenne` (adHoc bas, palier `ARRONDI`).

import { CIBLE_DEFAUT, normaliserCible, indexUtiles } from './cible.js';

/**
 * Trois 6 font un 666 (`assemblage.js › SERIE`) — pour la cible PAR DÉFAUT.
 *
 * ★ Le barème est désormais relatif à la cible : « trois 6 d'affilée » se lit
 * « la cible écrite d'affilée », « le solde multiple de trois » se lit
 * « multiple de la longueur d'une série ». Sur `666`, tout ce fichier calcule
 * exactement les mêmes entiers qu'avant — c'est ce qu'un test vérifie, poste
 * par poste, sur une liste réelle.
 *
 * La constante subsiste pour un seul usage qui, lui, ne dépend PAS de la
 * cible : le seuil de « bloc court » d'`abandons`, qui mesure une longueur de
 * MOT dans la saisie et n'a jamais parlé du nombre visé.
 */
const SERIE = 3;

const borner = (x, min, max) => (x < min ? min : x > max ? max : x);

/** Fraction entière : `x × num / den`, tronquée. Aucun flottant n'en sort. */
const fraction = (x, [num, den]) => Math.floor((x * num) / den);

// ══════════════════════════════════════════════════════════════════════════════
// ★ LE BARÈME — LE SEUL ENDROIT À RÉGLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Crédits et débits, en milli-unités d'élégance. Le crédit part de `SOCLE`,
 * les bonus l'augmentent, les malus le diminuent.
 *
 * ⚠️ **Ces valeurs sont une PRÉDICTION jusqu'à ce que le banc les confirme**,
 * exactement comme les six pondérations de `score.js` (§7-1). Le banc
 * `.planning/banc/classement.mjs` affiche le classement et le détail du bilan
 * avant/après ; `.planning/banc/elegance.mjs` affiche le bilan d'une saisie
 * ligne par ligne. Sans eux, on ne règle rien — on devine.
 *
 * ★ **L'ordre de grandeur n'est pas libre.** Les malus « artificiels » sont
 * classés par l'auteur, du plus laid au moins laid, et le barème doit
 * reproduire CET ORDRE :
 *
 *     ne garder que les 6  >  moyenne arrondie  >  min/max  >  lettre → lettre
 *
 * …et une SECONDE chaîne, dictée dans les mêmes termes, qui part du même
 * sommet :
 *
 *     ne garder que les 6  >  le plus fréquent  >  un rang sur deux
 *                          >  addition sélective
 *
 * Les deux chaînes partagent leur premier maillon — « ne garder
 * artificiellement que les 6 en ignorant le reste » est la pire des deux
 * listes — et ne se croisent nulle part ailleurs : l'auteur n'a jamais comparé
 * une moyenne arrondie à un rang sur deux, et le barème ne prétend donc rien
 * en dire.
 *
 * Un test le vérifie sur le barème lui-même : si un réglage inverse deux
 * paliers, il échoue. C'est le seul garde-fou possible contre un étalonnage qui
 * dériverait à force de petites retouches.
 */
export const BAREME = {
  /** Point de départ du crédit. Un chemin sans mérite ni faute vaut ceci. */
  SOCLE: 1000,

  // ── CE QUI SE GAGNE ────────────────────────────────────────────────────────

  /**
   * ★ « Plus des séquences de 6 se forment sans supprimer des nombres au
   * milieu, mieux c'est. » — un 666 qui s'écrit tout seul, dans l'ordre, sans
   * qu'on ait rien réarrangé. C'est ce que `m36` constate et que les cornes
   * montrent ; c'est aussi ce qu'un vecteur peut porter sans qu'aucun opérateur
   * ne le nomme. Le bonus se gagne sur la GÉOMÉTRIE du vecteur, jamais sur la
   * présence d'un code : `[6,6,6,4,4]` le gagne, qu'on ait employé `m36` ou non.
   */
  TRIPTYQUE_CONTIGU: 260,

  /**
   * ★ Le 666 suivant du MÊME vecteur — un tiers du tarif plein (voir juste
   * au-dessus pour la mesure qui l'impose et pour l'autre réglage possible).
   *
   * Mesuré : `fl+tca+m14` passe de 1 576 (compte faux) à **1 909** (compte juste,
   * tarif dégressif) — elle y gagne franchement, et la moisson qui lit toute la
   * saisie garde la tête à 2 293. Au tarif plein elle serait à 2 419 et
   * passerait devant.
   */
  TRIPTYQUE_REPETE: 90,

  /**
   * ★ **AUTANT DE BONUS QUE DE 666 RÉELLEMENT ÉCRITS D'AFFILÉE — et le tarif du
   * deuxième.**
   *
   * ⚠️ DÉFAUT MESURÉ. Le bonus se comptait PAR PORTÉE qui porte un triptyque,
   * jamais par triptyque : sur `hope-hope-hope.fr`, `fl+tca+m14` appliqué au motif
   * répété rend **douze 6 d'affilée, donc QUATRE 666**, et ne touchait qu'un
   * seul bonus. « Plus tu produis de 6, mieux c'est » se trouvait démenti à
   * l'endroit exact où le vecteur en produit le plus. Le compte est réparé
   * (`nbTriptyques`, ⌊L/3⌋ par suite contiguë), et le total reste plafonné au
   * nombre de séries du verdict : on ne crédite pas un 666 que personne ne
   * verra.
   *
   * ⚠️ **MESURE — et elle contredit le remède qui avait été prescrit.** Le
   * compte réparé au TARIF PLEIN porte `fl+tca+m14` (motif `hope-hope-hope`) à
   * **2 419** et lui fait dépasser la moisson à cinq séries (**2 293**) :
   * `hope-hope-hope.fr` perd sa voie de référence. Le remède prévu était
   * d'alourdir `VALEUR_JETEE` — **il n'a aucune prise ici, et c'est mesuré** :
   * la voie qui prend la tête est celle qui porte sur le MOTIF RÉPÉTÉ
   * `hope-hope-hope`, donc `[6×12]`, **PURE, `valeursJetees = 0`**. (Une
   * seconde voie porte les mêmes codes sur la saisie ENTIÈRE — `[6×12,5,7]`,
   * deux valeurs jetées — et c'est elle qu'on lit dans le banc quand elle
   * gagne le tri des candidats ; les deux existent, et la plus élégante des
   * deux ne jette rien.) Balayage : `VALEUR_JETEE` porté de 36 à 78, 150, 300
   * puis **600** ne déplace pas d'une milli-unité un bilan qui ne jette rien —
   * la tête reste `fl+tca+m14` à 2 419 aux quatre valeurs.
   *
   * Ce qui sépare réellement les deux voies n'est donc pas le gaspillage :
   *
   *  · le groupement écrit **quatre** 666 tous contigus, sur une seule portée,
   *    et laisse de côté le bloc `fr` (deux lettres — l'exception que l'auteur
   *    autorise, −4) ;
   *  · la moisson en délivre **cinq**, dont trois seulement sont contigus : les
   *    deux autres sont assemblés à partir de 6 pris sur des portées
   *    différentes, et le barème ne les crédite **pas du tout**.
   *
   * Au tarif plein, « contiguïté » l'emporte donc sur « quantité », et le
   * verdict annonce quatre séries là où cinq existent. Deux réglages peuvent
   * refermer cet écart ; c'est le premier qui est retenu, et le second est
   * documenté au §5 du contrat pour que l'arbitrage reste ouvert :
   *
   *  1. **le deuxième 666 du même vecteur vaut moins** (ci-dessous) — le
   *     premier d'une portée est une TROUVAILLE : cette portion-là de la
   *     saisie, lue de cette façon-là, écrit 666. Les suivants du même vecteur
   *     sont la même trouvaille qui continue : ils ne coûtent rien de plus à
   *     obtenir, ne disent rien de plus de la saisie, et leur abondance est
   *     **déjà payée** par `SIX_SURNUMERAIRE` ;
   *  2. **créditer les séries ASSEMBLÉES** — un 666 fait de trois 6 pris sur
   *     trois portées est un 666 que le verdict montre, et il ne rapporte
   *     aujourd'hui rien. Mesuré : au-delà de **64** milli-unités par série
   *     assemblée, la moisson repasse devant. Ce serait plus fidèle à la règle
   *     de tête de l'auteur (« privilégie celle qui donne le plus de séries »),
   *     mais c'est un bonus qui touche TOUTES les approches et demande son
   *     propre étalonnage — il n'est pas pris ici de but en blanc.
   *
   * ⚠️ **MESURE — le réglage 2 ne fait PAS ce qu'on attendait de lui, et il faut
   * l'écrire avant que quelqu'un le rouvre.** L'auteur signale une PARTITION
   * qu'il juge très élégante et qu'il ne retrouve plus :
   * `#so!0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8ev…` sur
   * `https://reinfocovid.fr/` — trois morceaux d'URL, trois méthodes
   * différentes, un 6 chacun, et RIEN de calculé qui ne serve
   * (`valeursJetees = 0`). Elle est deuxième à l'élégance (**1 092**) derrière
   * une moisson à trois séries (**1 151**), donc cinquième au classement, parce
   * que la première place est la seule que le rang de conviction n'écrase pas.
   *
   * Balayage d'un poste « série assemblée » à 0 / 60 / 130 / 260 / 420
   * milli-unités : **son rang ne bouge pas d'un cran**, et l'écart d'élégance
   * se CREUSE — la moisson assemble deux à trois séries là où la partition n'en
   * assemble qu'une, si bien que le bonus la sert deux à trois fois mieux. Même
   * chose par l'autre bout : `EFFACE_ALNUM` (le poste qui coûte le plus cher à
   * cette voie — cinq voyelles arrachées, −130) balayé de 26 à 0 ne la fait pas
   * remonter non plus, la moisson en arrachant SIX.
   *
   * Ce qui sépare ces deux voies n'est donc pas un poids mal réglé : sur la
   * même saisie, la moisson fait davantage de tout ce que le barème récompense.
   * Le seul levier qui déplacerait cette voie n'est pas dans le barème, il est
   * dans la SÉLECTION (`index.js › selectionner`), qui ne réserve QU'UNE place
   * au champion de l'élégance — le second, si élégant soit-il, retombe dans le
   * mixte où le nombre de séries commande. C'est un arbitrage de l'auteur, pas
   * un défaut de mesure, et le barème n'a pas à être tordu pour le trancher.
   */


  /**
   * ★ « Plus tôt, mieux c'est. » — mesuré en CONVERSIONS ÉLÉMENTAIRES, pas en
   * opérateurs. Une conversion par table émet un aller-retour par lettre
   * (§3.1) : sur `Donald`, le 666 est écrit après la TROISIÈME des six lettres,
   * et c'est là que les cornes poussent (`scenario.js › placeDuCouronnement`).
   * Le rang du dernier 6 du triptyque dans le vecteur final dit donc exactement
   * à quel moment de la démonstration le triptyque est complet.
   *
   * Le bonus est proportionnel à ce qui RESTE après lui : `(largeur − fin) /
   * largeur`. `[6,6,6,4,4]` prend 2/5 du bonus, `[4,4,6,6,6]` n'en prend aucun.
   */
  COURONNEMENT_TOT: 150,

  /** ★ « Plus tu produis de 6, mieux c'est » — par 6 au-delà des trois premiers. */
  SIX_SURNUMERAIRE: 22,
  /** Plafond du précédent : dix-huit 6 valent mieux que six, mais pas six fois. */
  SIX_SURNUMERAIRE_MAX: 15,

  /** ★ « Le solde net de 6 compte beaucoup, particulièrement s'il est multiple de 3. » */
  SOLDE_MULTIPLE_DE_TROIS: 90,

  /**
   * ★ « Les additions de chiffres ont un bonus par rapport aux autres opérations
   * arithmétiques ; les additions de nombres ont un bonus aussi mais moindre. »
   */
  ADDITION_CHIFFRES: 55,
  ADDITION_NOMBRES: 22,

  // ── CE QUI SE PERD ─────────────────────────────────────────────────────────

  /**
   * ★ « Dès qu'un 666 contigu est trouvé, il doit y avoir un malus significatif
   * à casser l'enchaînement, afin de ne le faire que si ça en vaut vraiment la
   * peine. » Et : « casser un triptyque contigu existant pour en reformer un
   * plus tard manque cruellement d'élégance, donc gros malus ».
   *
   * ★ Ce malus ne parle PAS de position dans la séquence, il parle du PROCESSUS.
   * On le lit en balayant les états : dès qu'un état porte trois 6 d'affilée, on
   * exige que le chemin s'arrête là-dessus — sur le vecteur qui les porte, ou
   * sur le nombre 666 lui-même. Tout le reste est une casse.
   */
  CASSE_TRIPTYQUE: 430,

  /**
   * ★ « Un 6 déjà apparu qu'on convertit en autre chose (6 + 6 = 12). »
   * Contrebalancé, dit l'auteur, par le bonus final de triptyque si ça tombe
   * juste — et c'est exactement ce que fait l'addition des deux lignes.
   * Convertir des 6 EN un 6 ou EN 666 n'est pas les convertir « en autre
   * chose » : c'est le but, et c'est exempté.
   */
  SIX_DETRUIT: 48,

  /**
   * ★ « Moins il y a de transformations à faire pour atteindre les 6, mieux
   * c'est. » Le socle est compté PAR PART — une découpe et un mappeur suffisent
   * à faire un vecteur, et c'est le chemin le plus court qui existe ; une
   * approche à trois parts a donc trois fois droit à ce minimum.
   *
   * ★ **Le réglage est BAS, et c'est délibéré : la longueur est DÉJÀ punie**
   * par le critère de concision (`C = 0,88 ^ (L − 9)`, poids 0,150). Ce que
   * l'élégance ajoute n'est pas une seconde peine, c'est la NUANCE que C ne sait
   * pas dire : qu'une addition de chiffres qui reboucle ne compte presque pas
   * (`ADDITION_EN_CHAINE`, ci-dessous, ~3,5 fois moins cher).
   *
   * ⚠️ MESURE qui a imposé ce réglage. À 34, la méthode 6 du README — l'AZERTY
   * et le retournement du 9, quinze étapes rendues — tombait de 60,6 à 40,1 sur
   * 100, c'est-à-dire SOUS le plafond du joker (45). Le test d'étalonnage
   * refuse cela, et il a raison : elle serait alors passée derrière une
   * démonstration qui ne démontre rien. Le défaut n'était pas dans la règle
   * mais dans le doublon — C punissait déjà les quinze étapes, et l'élégance
   * les punissait une seconde fois. À 14, elle revient à 59,3.
   */
  SOCLE_TRANSFORMATIONS: 2,
  TRANSFORMATION: 14,

  /**
   * ★ « Les additions de chiffres successives ont un malus de longueur très
   * faible : ce n'est pas aussi bien que d'arriver sur 6 plus tôt, mais c'est
   * bien moins pénalisant que d'ajouter des transformations autres que la même
   * addition de chiffres en boucle. » — `10 32 → 1+0, 3+2 → 1 5 → 1+5 → 6`.
   * La PREMIÈRE addition d'une chaîne coûte le prix plein ; les suivantes,
   * celui-ci.
   */
  ADDITION_EN_CHAINE: 4,

  /**
   * ★ « Tout chiffre ou lettre effacé/ignoré » — le malus plein, quand c'est un
   * caractère pris au milieu d'un bloc dont le reste sert.
   */
  EFFACE_ALNUM: 26,
  /** « …moindre si c'est un bloc entier séparé par un caractère ni lettre ni chiffre. » */
  EFFACE_BLOC: 8,
  /**
   * ★ Et moindre encore si ce bloc faisait moins de trois lettres au départ.
   * C'est la seule exception que l'auteur autorise dans une stratégie qu'il
   * appelle « sans malus » (première suggestion) : `estPur` s'appuie dessus.
   */
  EFFACE_BLOC_COURT: 2,
  /** ★ « Tout caractère ignoré — malus faible pour la ponctuation. » */
  EFFACE_PONCTUATION: 1,

  // ── Les quatre transformations « artificielles », par ordre décroissant de
  //    laideur. L'ordre est celui de l'auteur, et un test le gèle.

  /**
   * 1. ★ « Ne garder artificiellement que les 6 en ignorant le reste » — la
   * pire. C'est l'étape de tri du scénario (§3.1, « On ne garde que les 6 »),
   * qui n'a pas de code : elle se lit sur la géométrie, comme tout le reste —
   * une valeur calculée, montrée, puis écartée.
   *
   * ⚠️ On ne compte PAS ici ce qu'une somme absorbe : additionner quatre
   * nombres pour en faire un n'écarte rien, cela agrège. L'auteur le dit
   * lui-même — se débarrasser de chiffres est acceptable « si ça évite de se
   * débarrasser artificiellement de chiffres qu'on peut absorber
   * arithmétiquement ». Seul l'ÉCARTEMENT compte : le rétrécissement d'un
   * vecteur (`m36`, `m0`) et le surplus que le verdict laisse tomber.
   *
   * ★ **IL RESTE À 36 — et ce n'est pas un oubli, c'est une mesure.**
   *
   * L'échelle des abandons monte d'un facteur trois à chaque barreau :
   *
   *     ponctuation 1  →  bloc court 2  →  bloc entier 8  →  lettre arrachée 26
   *
   * `VALEUR_JETEE` en est le barreau suivant, et il n'en respecte pas le pas :
   * 36, soit à peine 1,4 fois le barreau du dessous, là où la règle voudrait
   * 26 × 3 = 78. L'alourdir jusque-là a été essayé, sur consigne, avec l'idée
   * qu'une valeur calculée puis jetée est du travail fait pour rien — donc plus
   * grave qu'un caractère qu'on n'a jamais lu. **Trois mesures l'ont fait
   * renoncer**, et elles sont écrites ici pour qu'on ne recommence pas :
   *
   * ⚠️ **1. Le levier n'a aucune prise sur le cas qui le motivait.** Il
   * s'agissait d'empêcher `fl+tca+m14` de passer devant la moisson à cinq séries
   * une fois le compte des triptyques réparé. Or la voie qui prend la tête est
   * celle qui porte sur le MOTIF RÉPÉTÉ `hope-hope-hope` : `[6×12]`, **PURE,
   * `valeursJetees = 0`**. Balayage 36 → 78 → 150 → 300 → **600** : la tête
   * reste `fl+tca+m14` à 2 419 aux cinq valeurs, sans bouger d'une milli-unité.
   * On n'alourdit pas une peine que l'accusé ne paie pas.
   *
   * ⚠️ **2. Il écrase la MOISSON, qui est le mode que l'auteur met en tête.**
   * Une moisson récolte sur plusieurs portées et laisse donc, par construction,
   * du surplus derrière elle (`jeteesAuTri`). Mesuré sur le corpus de dix-neuf
   * saisies : **à 45 déjà**, `Le chat dort sur le tapis rouge` tombe de cinq
   * séries à une ; à 55, `Éléonore à Nîmes` passe de trois à deux ; à 78,
   * **cinq têtes de liste changent, dont quatre PERDENT des séries** —
   * `https://www.example.com/path/to/page` de cinq à une, `jean-michel` de deux
   * à une. Le barème punirait l'ampleur, pas le gaspillage.
   *
   * ⚠️ **3. Et il promeut MÉCANIQUEMENT les ficelles.** C'est le retournement
   * décisif : `mpf`, `m1s2` et `mad` ne paient PAS ce poste — leur palier le
   * remplace (voir l'en-tête). Plus le gaspillage coûte cher, plus la ruse qui
   * l'escamote devient rentable. Mesuré sur `Le chat dort sur le tapis rouge`,
   * pour neuf milli-unités d'écart :
   *
   *     à 36 → 1. moisson 5×666 (1 129) · la ficelle n'est pas dans les trois
   *     à 45 → 1. `fr13+tca+m14+mpf` 1×666 (1 102) · la moisson tombe à 1 057
   *
   * Alourdir le gaspillage, c'est donc payer la ficelle pour cacher le
   * gaspillage. Le réglage reste à 36, l'irrégularité de l'échelle est assumée,
   * et ce qui devait arbitrer `hope-hope-hope.fr` l'arbitre ailleurs — au
   * tarif du triptyque répété (`TRIPTYQUE_REPETE`).
   *
   * ★ **Et ce que l'alourdissement aurait « payé » est plus petit qu'il n'en a
   * l'air.** `facteur()` borne le crédit à [`FACTEUR_PLANCHER`, 1 000] : au
   * -dessus de 1 000, l'élégance est neutre sur le score de conviction. Sur le
   * corpus, 36 → 78 déplace **109 crédits mais seulement 70 scores** — le tiers
   * restant est absorbé par ce plafond, et le reste se compose
   * multiplicativement avec `rendementSix` (`score.js`), qui mesure déjà la
   * PROPORTION du vecteur qui vaut 6. Les deux mesures sont complémentaires
   * (l'une en proportion sur le vecteur final, l'autre en valeur absolue et
   * voyant en plus les rétrécissements de milieu de chemin), mais elles se
   * multiplient : doubler la seconde ne double pas la peine, elle la compose.
   */
  VALEUR_JETEE: 36,

  /**
   * 2. ★ « Les moyennes qui nécessitent un arrondi — malus selon l'amplitude de
   * l'arrondi. » L'amplitude est exacte, et entière : `c.moyenne` calcule
   * `round(somme / n)`, donc l'écart au nombre juste vaut `min(r, n − r) / n`
   * avec `r = somme mod n`. On le rend en millièmes de DEMI-unité, ce qui met
   * l'arrondi maximal (une demie) à 1 000.
   */
  ARRONDI: 96,

  /** 3. ★ « Les min et les max. » */
  MIN_MAX: 72,

  /**
   * 4. ★ « Les conversions de lettres vers d'autres lettres (l'inversion
   * d'alphabet ; vois s'il y en a d'autres dans le catalogue). »
   *
   * Il y en a trois, et trois seulement — le catalogue a été relu opérateur par
   * opérateur : `f.atbash` (l'inversion d'alphabet, celle que l'auteur nomme),
   * `f.rot13` (le chiffre de César) et `f.leet` (le leetspeak). Les autres
   * `STR→STR` qui touchent aux lettres ne les CONVERTISSENT pas — la casse et
   * les accents ne changent pas de lettre, et les traductions changent de mot.
   *
   * ★ Le réglage est le plus BAS des quatre, et c'est décisif : le chiffre de
   * César porte à lui seul deux des quatre cas de référence de l'auteur (le
   * `Trump` de « Donald Trump », et la voie de `Macron`). Un malus qui les
   * ferait tomber ne mesurerait pas l'élégance, il la contredirait.
   */
  LETTRE_VERS_LETTRE: 40,

  // ── ★ LES TROIS FICELLES, dans l'ordre de laideur de l'auteur.
  //
  // ★ **Unité : ce que la ficelle coûte PAR VALEUR ÉCARTÉE** (par chiffre
  // absorbé pour la troisième), exactement comme `VALEUR_JETEE`. Le tarif
  // REMPLACE `VALEUR_JETEE` pour ces valeurs-là ; il ne s'y ajoute pas (voir
  // l'en-tête, « la peine n'est comptée qu'une fois »).
  //
  // ⚠️ **Et il est PLUS ÉLEVÉ que `VALEUR_JETEE`, ce qui n'est pas une
  // contradiction avec la consigne — c'est ce qui la rend vraie.** L'auteur
  // demande « un SCORE bas, mais moins bas que la suppression arbitraire de ce
  // qui n'est pas 6 ». C'est un solde, pas un tarif : les deux gestes n'achètent
  // pas la même chose. Le tri arbitraire laisse les 6 dispersés et ne gagne
  // rien ; la ficelle, elle, RASSEMBLE — elle encaisse `TRIPTYQUE_CONTIGU`
  // (260), le couronnement (jusqu'à 150) et le solde multiple de trois (90),
  // soit un demi-millier de milli-unités que le tri ne touchera jamais. Un tarif
  // aligné sur `VALEUR_JETEE` ferait donc de la ficelle une AFFAIRE, et elle
  // passerait devant les méthodes élégantes — c'est ce que la première mesure a
  // montré, noir sur blanc :
  //
  //   à 32 / 24 / 16 par valeur, `Macron` perdait sa voie de référence
  //   (`fr13+tca+m14+m36`, César + quatorze segments) au profit de `tca+mt9+mpf`, et
  //   `Donald Trump` perdait la sienne (`tca+m14+m36,fr13+tca+m14+m36`) entièrement.
  //   Trois des quatre cas de référence tombaient.
  //
  // Les tarifs ci-dessous sont donc calibrés pour que le solde reste **juste
  // positif** face au tri arbitraire, et franchement négatif face à une méthode
  // qui atteint le même 666 sans ficelle. Deux tests le gèlent — l'un sur le
  // solde (« la ficelle bat le tri arbitraire, de peu »), l'autre sur les quatre
  // cas de référence.

  /**
   * 2. ★ « Le plus fréquent l'emporte » (`mpf`) — par valeur écartée.
   *
   * La plus chère des trois : c'est la seule dont la règle REGARDE les valeurs
   * avant de décider, donc la seule qui puisse être accusée d'avoir choisi son
   * critère après avoir vu le résultat.
   */
  MAJORITE: 180,

  /**
   * 3. ★ « Garder un caractère sur deux » (`m1s2`) — par valeur écartée.
   *
   * « Ça peut être plus élégant que “le plus fréquent l'emporte” […] mais ça
   * reste une astuce faible à considérer avec malus aussi, mais moindre que la
   * majorité. » — l'auteur, mot pour mot. Plus élégant parce que la règle ne
   * connaît que les RANGS : « un sur deux » s'énonce avant d'avoir vu le
   * vecteur, là où « le plus fréquent » ne s'énonce qu'après l'avoir compté.
   */
  DECIMATION: 130,

  /**
   * 4. ★ L'addition sélective (`mad`) — par CHIFFRE ABSORBÉ.
   *
   * La moins chère des quatre, et l'auteur en donne lui-même la raison : elle
   * ne JETTE rien. `5 + 1 = 6` garde les deux chiffres dans le résultat, là où
   * les trois autres gestes en font disparaître. « Se débarrasser de chiffres
   * est acceptable si ça évite de se débarrasser artificiellement de chiffres
   * qu'on peut absorber arithmétiquement » : ici tout est absorbé, et il ne
   * reste à punir que la SÉLECTION — le fait de n'additionner que ce qui
   * arrange.
   *
   * ⚠️ Elle ne touche PAS le bonus `ADDITION_CHIFFRES` : `classeDeTransformation`
   * la laisse en « autre » (voir `ADDITIONS_DE_CHIFFRES`). Le bonus récompense
   * l'addition SYSTÉMATIQUE ; l'accorder ici reviendrait à payer la ficelle
   * pour ce qui fait précisément d'elle une ficelle.
   */
  ADDITION_SELECTIVE: 100,

  /**
   * 3 bis. ★ Le redécoupage tricheur (`mrd`) — par CHIFFRE ABSORBÉ, dilué.
   *
   * « C'est le moment de TRICHER pour réduire chaque nombre à un chiffre en
   * redécoupant de manière à ce que ça tombe sur 6 le plus souvent possible. »
   * — l'auteur, et le mot est de lui.
   *
   * ★ **Le TARIF le plus élevé des triches d'opérateur — et il n'est comparable
   * à aucun autre, parce qu'il est le seul (avec l'addition sélective) à être
   * DIVISÉ avant d'être facturé.** L'auteur n'a jamais comparé celui-ci aux
   * trois ficelles ; on ne lui prête donc aucun rang qu'il n'ait dicté, et sa
   * chaîne (« majorité > un rang sur deux > addition sélective ») reste gelée
   * telle quelle par son test. Ce qui suit est un arbitrage, écrit comme tel :
   *
   *  · **il décide en regardant LE CHIFFRE QU'ON CHERCHE**, seul du catalogue à
   *    le faire aussi ouvertement. « Un rang sur deux » s'énonce avant d'avoir
   *    vu le vecteur ; « le plus fréquent » se compte après, mais sans préférer
   *    personne. Ce redécoupage-ci essaie toutes les découpes et retient celle
   *    qui donne le plus de 6 : c'est la faute de `mpf` (choisir après avoir vu)
   *    sans en avoir l'excuse (une règle qu'on peut énoncer d'avance) ;
   *  · **il n'ÉCARTE pourtant rien** — tout chiffre entre dans un paquet et
   *    ressort dans une somme. C'est ce qui le maintient sous l'effacement sans
   *    motif, et ce qui lui vaut la dilution ;
   *  · **et il DILUE**, contrairement aux deux autres (voir `dilution`). C'est
   *    ce qui explique le TARIF, et c'est la seule chose qui rende les deux
   *    lectures compatibles : l'auteur demande à la fois qu'il soit
   *    « fortement pénalisé » et que la peine devienne « presque négligeable »
   *    sur son exemple aux seize paquets. Un tarif comparable à celui des trois
   *    ficelles satisferait la seconde demande et pas la première.
   *
   * ⚠️ MESURÉ, sur le corpus de dix-neuf saisies, tarif par tarif :
   *
   *     150 · `Millicent` bascule sur `fr13+tca+mx6+mrd` (3×666, élégance 1 475)
   *           et évince `fr13+tca+mx6+mrn` (2×666, 1 310) : la triche paie 98
   *           milli-unités et en encaisse 482. Inacceptable.
   *     300 · idem, `Millicent` tombe toujours.
   *     450 · `Millicent` revient à la voie honnête, et **plus aucune tête de
   *           liste du corpus ne change du fait de `mrd`**.
   *     600 et au-delà · rien ne bouge plus : le corpus est déjà stable, on
   *           n'achète que de la sévérité gratuite.
   *
   * (Le seuil de largeur de `mrd` a été réglé dans le même mouvement, et c'est
   * lui qui a fait le gros du travail — un tarif ne peut rien contre une voie
   * qui est évincée AVANT le classement. Voir `CHIFFRES_REDECOUPE_MIN`,
   * `transformations/mappeurs.js`.)
   *
   * ★ Et sur l'exemple de l'auteur — ses 32 chiffres, sept additions —, la
   * dilution ramène le poids de **21 000** millièmes (le compte brut des
   * chiffres absorbés) à **1 223**, soit **550 milli-unités** au tarif retenu :
   * un dix-huitième du prix plein, pour une triche qui rapporte deux 666.
   * « Presque négligeable, vu le nombre d'additions » — ce sont ses mots, et
   * c'est ce que la mesure rend.
   */
  REDECOUPAGE: 450,

  /**
   * 5. ★ Le RÉARRANGEMENT — le tri croissant (`mtri`), par valeur déplacée.
   *
   * ★ **Le moins cher du barème, et l'auteur ne l'appelle pas une triche.** Il
   * l'écrit sans réserve : « Coté transformation il y a aussi "Tri croissant"
   * `95956636494` → `34455666999`, qui permet de faire apparaître 666
   * contigu. » Le mot « tricher », il le réserve explicitement au redécoupage
   * (§7.4 de ses retours). On ne lui fait donc pas dire le contraire, et ce
   * palier n'entre dans AUCUNE des deux chaînes de laideur qu'il a dictées.
   *
   * ★ **Mais il ne peut pas être gratuit, et c'est le barème lui-même qui
   * l'impose.** `TRIPTYQUE_CONTIGU` récompense un 666 « qui se forme sans
   * supprimer des nombres au milieu », c'est-à-dire « sans qu'on ait rien
   * réarrangé » — ce sont les mots du poste. Un tri qui rapproche les 6
   * encaisse donc un bonus de 260 pour n'avoir pas fait ce qu'il vient
   * précisément de faire. Le palier ferme ce trou, et rien de plus.
   *
   * ★ **Unité : la valeur DÉPLACÉE**, c'est-à-dire un rang dont la valeur
   * change après rangement. Un tri qui ne bouge presque rien ne coûte presque
   * rien — et l'opérateur refuse de s'appliquer quand il ne bouge rien du tout.
   *
   * ⚠️ MESURÉ au banc : à 20, aucune tête de liste du corpus de dix-neuf
   * saisies ne change, et les quatre cas de référence de l'auteur gardent leur
   * rang.
   */
  REARRANGEMENT: 20,

  /**
   * 0. ★ **L'EFFACEMENT SANS MOTIF — le sommet de l'échelle**, par valeur
   * effacée.
   *
   * « L'effacement est une étape à part, et s'il n'a pas de motif (chiffre
   * minoritaire, pair/impair) c'est probablement la pire des triches, à
   * pénaliser en conséquence. » — l'auteur, mot pour mot.
   *
   * ★ **Un MOTIF, c'est ce qui permet de dire pourquoi ceux-là et pas les
   * autres.** Être minoritaire (`mpf`), occuper un rang pair ou impair
   * (`m1s2`) : ce sont des règles qu'on énonce, qu'on affiche sous l'accolade,
   * et que le spectateur peut vérifier. Effacer parce que ça arrange, sans rien
   * pouvoir en dire, c'est exactement ce que tout le site prétend ne pas
   * faire — d'où le tarif le plus élevé de la liste des triches, **au-dessus de
   * la majorité**.
   *
   * ★ **Et il coûte, par valeur, plus cher que casser un 666** (430) : UNE
   * valeur effacée sans motif dépasse déjà le plus gros malus de l'autre
   * échelle. Ce n'est pas une contradiction — les deux ne mesurent pas la même
   * chose et ne s'expriment pas dans la même unité : `CASSE_TRIPTYQUE` est un
   * forfait par triptyque défait, celui-ci un tarif par valeur escamotée. La
   * hiérarchie des GESTES est intacte ; c'est celle des tarifs qui n'a jamais
   * été un classement (voir la note des trois ficelles, plus haut).
   *
   * ⚠️ **Ce chiffre est une PRÉDICTION, et il n'a pas encore été mesuré** —
   * comme l'étaient toutes les valeurs de ce barème avant leur banc. Il ne peut
   * pas l'être : aucun opérateur ne l'alimente, donc aucun classement ne bouge
   * quand on le fait varier. Celui qui branchera le compteur devra le passer au
   * banc (`.planning/banc/classement.mjs`) avant de le considérer comme réglé.
   *
   * ⚠️ **Le compteur `effacementSansMotif` existe et vaut zéro aujourd'hui** :
   * aucun opérateur du catalogue n'efface sans motif. Il attend la scission du
   * geste de `m36` — qui couronne ET tronque en un seul mouvement indivisible —
   * en cours dans un autre chantier. Pour le brancher, il suffit d'inscrire
   * l'identifiant de l'opérateur dans `FICELLES` en face de
   * `'effacementSansMotif'` : le décompte, la ligne de crédit et l'exemption de
   * `valeursJetees` suivent d'eux-mêmes (voir `ECARTEMENTS`).
   *
   * ⚠️ **`VALEUR_JETEE` (36) n'est PAS touché**, et ce n'est pas un oubli. Ce
   * poste-là mesure le tri du VERDICT, qui n'est pas un opérateur, qui ne
   * figure dans aucune URL, et dont trois mesures écrites plus haut expliquent
   * pourquoi l'alourdir écrase la moisson et promeut les ficelles. Ce que
   * l'auteur nomme ici, c'est un GESTE DU CATALOGUE qui efface sans savoir
   * dire quoi ni pourquoi — pas la troncature finale que le verdict assume.
   */
  EFFACEMENT_SANS_MOTIF: 520,

  // ── Comment le crédit redescend sur le score de conviction ─────────────────

  /**
   * ★ **L'ÉLÉGANCE NE PEUT QUE RETIRER, JAMAIS AJOUTER.**
   *
   * C'est la leçon, mesurée et écrite, de l'amendement « les trois rangs de
   * conviction » : un bonus additif se prélève sur la RÉSERVE (`PART_CRITERES`),
   * et ouvrir 3 000 milli-unités de réserve écrase la part des critères de 0,83
   * à 0,55 — les sept méthodes du README tombent d'un tiers et la sixième passe
   * sous le plafond du joker. Le facteur multiplicatif, lui, ne touche pas à
   * l'échelle : il ne fait que descendre ceux qui le méritent.
   *
   * Conséquence à assumer : sur le score de conviction, **aucune approche ne
   * peut monter**. Un crédit au-dessus du socle protège des malus, il ne rapporte
   * rien. Ce qu'il rapporte, il le rapporte AILLEURS — dans le classement par
   * élégance (`ordreElegance`), qui lit le crédit brut et non le facteur.
   */
  FACTEUR_PLANCHER: 520,
};

/**
 * ★ LES TROIS FICELLES, par identifiant d'opérateur — et le compteur qu'elles
 * alimentent.
 *
 * Par IDENTIFIANT, jamais par code, pour la raison qui vaut déjà pour
 * `ADDITIONS_DE_CHIFFRES` et `MIN_MAX` : le code est une adresse d'URL (§4.1),
 * l'identifiant est une intention.
 *
 * ★ Publié, parce que c'est ce qui permet à un test de vérifier que le barème
 * et le catalogue ne peuvent pas se perdre de vue : si l'un de ces trois
 * identifiants disparaissait du catalogue, ou si un quatrième opérateur du même
 * genre apparaissait sans être inscrit ici, le palier correspondant se
 * remettrait à dormir en silence — et l'on croirait mesurer ce qu'on ne
 * mesurerait plus.
 */
export const FICELLES = Object.freeze({
  'm.plusFrequent': 'majorite',
  'm.unRangSurDeux': 'decimation',
  'm.additionSelective': 'additionSelective',
  'm.redecoupageChoisi': 'redecoupage',
  // ⚠️ `effacementSansMotif` n'a pas encore d'opérateur : la scission du geste
  //    de `m36` (couronner / effacer) est en cours ailleurs. Inscrire ici
  //    l'identifiant de la moitié « effacer » suffira à brancher le palier.
});

/**
 * ★ Les ficelles qui ÉCARTENT — leur peine se compte par valeur disparue.
 *
 * C'est l'unité de `VALEUR_JETEE`, et c'est ce qui rend les deux comparables :
 * on parle des mêmes objets — une valeur calculée, montrée, puis retirée de la
 * ligne.
 */
const ECARTEMENTS = new Set(['majorite', 'decimation', 'effacementSansMotif']);

/**
 * ★ Les ficelles qui ABSORBENT par ADDITION — leur peine se dilue.
 *
 * Ce sont les deux seules dont l'auteur ait dit que le malus devait fondre avec
 * le nombre d'additions (voir `dilution`). Elles ne jettent rien : chaque
 * chiffre entre dans une somme et ressort dedans.
 */
const ABSORPTIONS_ADDITIVES = new Set(['additionSelective', 'redecoupage']);

/**
 * ★ Les ficelles qui ÉCARTENT, par identifiant d'opérateur — publié pour
 *   `score.js`, qui en a besoin et ne doit pas en tenir une seconde liste.
 *
 * Le rendement (`score.js › rendementSix`) lit, POUR CELLES-LÀ SEULEMENT, le
 * vecteur le plus large du chemin plutôt que le dernier : les noter sur ce
 * qu'il reste les récompenserait d'avoir jeté davantage. Le raisonnement
 * s'arrête là où l'écartement s'arrête — une ficelle qui ABSORBE (`mad`,
 * `mrd`) ne jette rien, et sa ligne de chiffres momentanément élargie n'est pas
 * du gaspillage : c'est le même nombre, écrit autrement, le temps d'une
 * addition. La lui compter au dénominateur lui reprocherait précisément d'avoir
 * MONTRÉ son calcul.
 *
 * ⚠️ MESURÉ : sans cette distinction, `fl+tca+m14+mrd` affichait un rendement de
 * 789 pour une scène qui garde quinze jetons et n'en jette que deux (≈ 882) —
 * l'écart venait des dix-neuf chiffres traversés pendant les additions, que
 * personne n'a jetés.
 */
/**
 * ★ Ce bilan emploie-t-il une FICELLE ? — lu sur les compteurs, jamais sur les
 *   codes.
 *
 * Les compteurs sont la trace de ce que le chemin a FAIT ; les codes ne sont
 * qu'une adresse d'URL (§4.1). C'est la même doctrine que partout ailleurs dans
 * ce module, et elle a ici une conséquence utile : un bilan recalculé depuis une
 * URL rejouée répond la même chose que celui de la liste dont il sort.
 */
export function emploieUneFicelle(bilan) {
  if (!bilan) return false;
  for (const compteur of new Set(Object.values(FICELLES))) {
    if ((bilan[compteur] || 0) > 0) return true;
  }
  return false;
}

export const FICELLES_QUI_ECARTENT = Object.freeze(new Set(
  Object.keys(FICELLES).filter((id) => ECARTEMENTS.has(FICELLES[id])),
));

/**
 * ★ Les opérateurs qui RÉARRANGENT sans rien retirer — le tri croissant.
 *
 * Un vecteur trié a la même largeur, les mêmes valeurs, la même somme : aucun
 * poste du barème ne le voyait passer. Il gagnait pourtant `TRIPTYQUE_CONTIGU`
 * pour une contiguïté qu'il venait de fabriquer. `REARRANGEMENT` ferme ce trou.
 */
const REARRANGEMENTS = new Set(['m.triCroissant']);

/**
 * ★ Les opérateurs qui RÉTRÉCISSENT en agrégeant, sans rien écarter.
 *
 * « On compte les chiffres » remplace `6 6 6` par « 3 6 » : la ligne raccourcit
 * d'une unité, mais rien n'a été jeté — les trois 6 sont ENTIÈREMENT dans le
 * « 3 ». Les compter en `valeursJetees` reviendrait à facturer une addition
 * comme une suppression, ce que l'en-tête interdit explicitement (« additionner
 * quatre nombres pour en faire un n'écarte rien, cela agrège »).
 *
 * ★ En revanche, ce qu'une agrégation fait perdre de la CIBLE se paie : trois 6
 * qui deviennent « 3 6 », ce sont deux 6 convertis en autre chose, et
 * `SIX_DETRUIT` est fait pour ça. Le poste ordinaire ne les voit pas — il
 * n'examine que les transformations à largeur constante —, on les lui donne
 * donc ici.
 */
const AGREGATIONS = new Set(['m.compterLesChiffres']);

/**
 * ★ LA DILUTION D'UNE TRICHE D'ADDITION — « le malus se dilue avec le nombre
 *   d'additions d'affilée ».
 *
 * > « Pour les additions sélectives comme triche : le malus de triche devrait
 * > être dilué avec le nombre d'additions d'affilée. Plus il y en a, moins la
 * > triche se verra, et plus la triche est éloignée de la première et de la
 * > dernière addition d'affilée, plus le fait d'en ajouter une ou d'en retirer
 * > une, ou de découper les chiffres des nombres différemment, passera inaperçu
 * > et donc avec une bien moindre pénalité (qui devient presque négligeable
 * > pour l'exemple que je t'ai donné, vu le nombre d'additions). » — l'auteur.
 *
 * Le principe est une règle de MESURE, et elle est juste : **une triche se paie
 * à hauteur de ce qu'elle se voit.** Une addition tordue au milieu de vingt
 * autres est indétectable ; la même, seule sur la ligne, saute aux yeux.
 *
 * ── La forme ────────────────────────────────────────────────────────────────
 *
 * Soit `N` additions jouées à la suite et `j` le rang de l'une d'elles
 * (0 fondé). Deux facteurs, ceux que l'auteur nomme, et rien d'autre :
 *
 *  · **la longueur de la série** — on divise par `N` ;
 *  · **la distance aux extrémités** — `bord = min(j, N−1−j)`, nulle aux deux
 *    bouts, maximale au milieu ; on divise par `1 + 2 × bord`.
 *
 *     poids(j) = ⌊ 1000 × chiffres absorbés par l'addition j
 *                  ÷ (N × (1 + 2 × bord(j))) ⌋
 *
 * exprimé en **millièmes d'un chiffre absorbé**, pour que l'arithmétique reste
 * entière de bout en bout (§4.4) — pas un flottant, pas un arrondi de quotient.
 *
 * ── Ce que ça donne, et pourquoi la forme est celle-là ──────────────────────
 *
 * Pour des additions absorbant chacune un chiffre :
 *
 *     N = 1  → 1000            (la peine PLEINE — non-régression exacte :
 *                               `[6,5,16,8]` coûte exactement ce qu'il coûtait)
 *     N = 2  →  500 + 500      = 1000
 *     N = 3  →  333 + 111 + 333 =  777
 *     N = 5  →  200 + 66 + 40 + 66 + 200 = 572
 *     N = 8  →  125 + 41 + 25 + 17 + 17 + 25 + 41 + 125 = 416
 *
 * La série entière coûte donc, au pire, ce que coûterait UNE triche isolée, et
 * de moins en moins ensuite. C'est exactement la lecture de l'auteur : ce n'est
 * pas le nombre de tricheries qui se paie, c'est leur VISIBILITÉ, et elle
 * s'effondre quand la série s'allonge.
 *
 * ── Les deux garde-fous ─────────────────────────────────────────────────────
 *
 *  · **entier**, on l'a dit ;
 *  · **jamais nul.** `Math.max(1, …)` par addition, et la ligne de crédit
 *    plancher à une milli-unité dès que le compteur bouge (`peine`). Une triche
 *    diluée reste une triche : elle coûte peu, elle ne coûte pas rien — sans
 *    quoi un chemin assez long deviendrait gratuitement malhonnête, ce que le
 *    barème existe précisément pour empêcher.
 *
 * ★ **« D'affilée » se lit sur le GESTE, pas sur les rangs de la ligne.** Dans
 * l'exemple de l'auteur, les seize paquets alternent additions et chiffres
 * laissés seuls (`… 9 · 6 · 1+1+4 · 1+0+8 …`) — et il les compte pourtant tous
 * comme une seule série (« vu le nombre d'additions »). C'est juste : elles sont
 * jouées l'une après l'autre dans le même mouvement, sous les mêmes accolades,
 * et c'est ce mouvement-là que le spectateur voit d'un bloc.
 *
 * @param {number[]} tailles  le nombre de TERMES de chaque addition, en ordre
 * @returns {number} le poids, en millièmes d'un chiffre absorbé
 */
export function dilution(tailles) {
  const N = Array.isArray(tailles) ? tailles.length : 0;
  if (!N) return 0;
  let poids = 0;
  for (let j = 0; j < N; j++) {
    const absorbes = Math.max(0, (tailles[j] | 0) - 1);
    if (!absorbes) continue;
    const bord = Math.min(j, N - 1 - j);
    poids += Math.max(1, Math.floor((1000 * absorbes) / (N * (1 + 2 * bord))));
  }
  return poids;
}

/**
 * La peine d'un poste dilué, en milli-unités : le tarif appliqué à un poids
 * exprimé en millièmes, **avec un plancher à une milli-unité** dès que le
 * compteur n'est pas nul (voir `dilution`, second garde-fou).
 */
const peine = (tarif, millemes) => (millemes > 0
  ? Math.max(1, fraction(tarif, [millemes, 1000])) : 0);

// ══════════════════════════════════════════════════════════════════════════════
// La classification des opérateurs — par identifiant, jamais par code
// ══════════════════════════════════════════════════════════════════════════════
//
// Par IDENTIFIANT parce que le code est une adresse d'URL (§4.1) et l'identifiant
// une intention. Un opérateur absent de ces tables est « une transformation »,
// sans plus : la table restreint, elle n'invente pas de parenté (même doctrine
// que `MANIERES` dans `score.js`).

/**
 * ★ Les additions de CHIFFRES — celles qui décomposent un nombre en ses chiffres
 * et les additionnent. Les quatre sont exactement cela :
 *  · `p.sommeChiffres` — « on additionne les chiffres », une fois ;
 *  · `p.racineNumerique` — la même, en boucle jusqu'au chiffre unique ;
 *  · `p.racineMaitres` — la même, avec l'exception des nombres maîtres ;
 *  · `m.reduireChaque` — la même, sur chaque valeur d'un vecteur.
 * `c.somme` les rejoint quand ses opérandes tiennent tous en un chiffre : c'est
 * le critère `natureOperandes` de `combinateurs.js`, relu ici sur les VALEURS.
 *
 * ★ `m.additionSelective` (`mad`) n'y est PAS, et c'est délibéré. Elle
 * additionne bien des chiffres — mais pas TOUS, et c'est précisément ce qui en
 * fait une ficelle. Lui accorder le bonus des additions de chiffres reviendrait
 * à la payer pour ce que le palier `ADDITION_SELECTIVE` lui reproche : elle
 * reste donc « une transformation », sans plus.
 */
const ADDITIONS_DE_CHIFFRES = new Set([
  'p.sommeChiffres', 'p.racineNumerique', 'p.racineMaitres', 'm.reduireChaque',
]);

/** L'addition de nombres — le même opérateur, jugé sur ses opérandes. */
const ADDITION = 'c.somme';

/** ★ « Les min et les max. » `c.maxMoinsMin` emploie les deux. */
const MIN_MAX = new Set(['c.max', 'c.min', 'c.maxMoinsMin']);

/** ★ Les conversions lettre → lettre. Trois, et le catalogue n'en porte pas d'autre. */
const LETTRE_VERS_LETTRE = new Set(['f.atbash', 'f.rot13', 'f.leet']);

/** La moyenne — le seul opérateur qui arrondisse. */
const MOYENNE = 'c.moyenne';

/** `natureOperandes` de `combinateurs.js`, relu ici (un test gèle l'accord). */
const tientEnUnChiffre = (v) => Number.isInteger(v) && Math.abs(v) <= 9;

/**
 * La classe d'une transformation, lue sur l'opérateur ET sur ses opérandes.
 * @returns {'chiffres'|'nombres'|'moyenne'|'minmax'|'lettres'|'autre'}
 */
export function classeDeTransformation(op, avant) {
  if (!op) return 'autre';
  if (ADDITIONS_DE_CHIFFRES.has(op.id)) return 'chiffres';
  if (op.id === ADDITION) {
    const vs = avant && Array.isArray(avant.valeur) ? avant.valeur : [];
    return vs.length && vs.every(tientEnUnChiffre) ? 'chiffres' : 'nombres';
  }
  if (op.id === MOYENNE) return 'moyenne';
  if (MIN_MAX.has(op.id)) return 'minmax';
  if (LETTRE_VERS_LETTRE.has(op.id)) return 'lettres';
  return 'autre';
}

// ══════════════════════════════════════════════════════════════════════════════
// Lecture des états — tout est entier, tout est pur
// ══════════════════════════════════════════════════════════════════════════════

const estAlnum = (c) => /[0-9\p{L}]/u.test(c);

/** Les valeurs d'un état, sous forme de tableau — un `NUM` en porte une. */
function valeursDe(e) {
  if (!e) return null;
  if (e.type === 'NUM') return [e.valeur];
  if (e.type === 'NUMS') return e.valeur;
  return null;
}

/** Combien de chiffres de la CIBLE un état porte-t-il ? Sur `666`, ses 6. */
function nbSix(e, cible = CIBLE_DEFAUT) {
  const vs = valeursDe(e);
  if (!vs) return 0;
  return indexUtiles(vs, cible).length;
}

/**
 * Le rang (1 fondé) de la fin de la PREMIÈRE suite de trois 6 d'affilée, ou 0.
 *
 * ★ « D'affilée » est le mot qui interdit l'assouplissement (CONTRACTS §3.1,
 * amendement `horns`) : trois 6 non contigus, c'est l'autre geste, celui qui
 * coûte. On lit donc la contiguïté sur le vecteur, et rien d'autre.
 */
export function finDuTriptyque(valeurs, cible = CIBLE_DEFAUT) {
  if (!Array.isArray(valeurs)) return 0;
  const c = normaliserCible(cible);
  let rang = 0;
  for (let i = 0; i < valeurs.length; i++) {
    // « D'affilée » se lit sur les INDEX : dès qu'une valeur n'est pas celle
    // qu'on attend, la suite repart de zéro — sauf si cette valeur est
    // justement le premier chiffre de la cible, auquel cas elle amorce une
    // nouvelle tentative. Sur `666`, cette nuance est invisible (un 6 continue
    // toujours la suite) ; sur `007`, elle évite de rater `0 0 0 7`.
    if (valeurs[i] === c.chiffres[rang]) rang++;
    else rang = valeurs[i] === c.chiffres[0] ? 1 : 0;
    if (rang >= c.longueur) return i + 1;
  }
  return 0;
}

/**
 * ★ COMBIEN de 666 contigus un vecteur écrit-il — pas « en écrit-il un ».
 *
 * ⚠️ DÉFAUT MESURÉ, et corrigé ici. Le bonus se comptait PAR PORTÉE qui porte
 * un triptyque, jamais par triptyque : sur `hope-hope-hope.fr`, la voie
 * `fl+tca+m14` (on ne garde que les lettres, puis quatorze segments) rend
 * `[6,6,6,6,6,6,6,6,6,6,6,6,5,7]` — **douze 6 d'affilée, donc QUATRE 666** —
 * et ne touchait qu'un seul bonus, comme une portée qui n'en écrit qu'un.
 * « Plus tu produis de 6, mieux c'est » se trouvait démenti à l'endroit exact
 * où le vecteur en produit le plus.
 *
 * Une suite de `L` six d'affilée vaut `⌊L/3⌋` triptyques : 666 fait trois 6, et
 * l'on ne coupe pas un quatrième 6 en deux. C'est la même arithmétique que
 * `serieDeSix` (`assemblage.js`), et pour la même raison.
 */
export function nbTriptyques(valeurs, cible = CIBLE_DEFAUT) {
  if (!Array.isArray(valeurs)) return 0;
  const c = normaliserCible(cible);
  let total = 0;
  let rang = 0;
  for (const v of valeurs) {
    if (v === c.chiffres[rang]) rang++;
    else rang = v === c.chiffres[0] ? 1 : 0;
    if (rang >= c.longueur) { total++; rang = 0; }
  }
  return total;
}

/** Un état écrit-il la cible d'affilée, ou vaut-il littéralement le nombre visé ? */
function porteUnTriptyque(e, cible = CIBLE_DEFAUT) {
  if (!e) return false;
  const c = normaliserCible(cible);
  if (e.type === 'NUM') return c.nombre !== null && e.valeur === c.nombre;
  return finDuTriptyque(valeursDe(e), c) > 0;
}

/** L'état où le chemin s'arrête est-il un aboutissement légitime du triptyque ? */
function aboutissementLegitime(e, cible = CIBLE_DEFAUT) {
  return porteUnTriptyque(e, cible);
}

// ══════════════════════════════════════════════════════════════════════════════
// La survie des caractères — qui, du texte de départ, arrive au bout
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Les indices (dans le texte de départ du chemin) des caractères encore présents
 * quand le chemin quitte le domaine du texte, c'est-à-dire au dernier état
 * `STR` ou `TOKENS`.
 *
 * ★ On ALIGNE plutôt qu'on ne compte. Un filtre rend une sous-suite de son
 * entrée — « on ne garde que les lettres » retire des caractères sans en
 * déplacer aucun —, donc l'alignement dit exactement LESQUELS tombent, et non
 * seulement combien. C'est ce qui permet ensuite de distinguer « une lettre
 * arrachée au milieu d'un mot » de « un bloc entier laissé de côté », qui n'ont
 * pas le même prix.
 *
 * ★ Et quand l'alignement échoue, on le DIT (`opaque`) au lieu de deviner. Un
 * chiffrement conserve la longueur — c'est une bijection, personne ne tombe.
 * Une traduction, elle, change tout : on ne sait plus qui vient d'où, et
 * prétendre le savoir serait inventer une mesure.
 *
 * @param {Object} chemin
 * @returns {{vivants:Set<number>, depart:string, opaque:boolean}}
 */
export function survieDesCaracteres(chemin) {
  const etats = (chemin && chemin.etats) || [];
  const premier = etats[0];
  const depart = premier && premier.type === 'STR' ? String(premier.valeur) : '';
  let indices = Array.from({ length: [...depart].length }, (_, i) => i);
  let texte = [...depart];
  let opaque = false;

  for (let i = 1; i < etats.length; i++) {
    const e = etats[i];
    let suite;
    if (e.type === 'STR') suite = [...String(e.valeur)];
    else if (e.type === 'TOKENS') suite = [...e.valeur.join('')];
    else break; // on quitte le domaine du texte : les nombres prennent le relais
    if (suite.length === texte.length) {
      // Bijection — chiffrement, casse, accents. Personne ne tombe.
      texte = suite;
      continue;
    }
    const align = aligner(suite, texte);
    if (!align) { opaque = true; break; }
    indices = align.map((k) => indices[k]);
    texte = suite;
  }
  return { vivants: new Set(indices), depart, opaque };
}

/**
 * Si `suite` est une sous-suite de `texte`, rend les positions de `texte`
 * qu'elle occupe ; sinon `null`. Glouton de gauche à droite : c'est exact pour
 * une sous-suite, et c'est tout ce qu'on lui demande.
 */
function aligner(suite, texte) {
  const positions = [];
  let j = 0;
  for (let i = 0; i < suite.length; i++) {
    while (j < texte.length && texte[j] !== suite[i]) j++;
    if (j >= texte.length) return null;
    positions.push(j);
    j++;
  }
  return positions;
}

// ══════════════════════════════════════════════════════════════════════════════
// Le bilan d'un CHEMIN
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Tout ce qui se passe PENDANT un chemin, en compteurs entiers.
 *
 * @param {Object} chemin  {ops, etats}
 * @returns {Object} le bilan, tous champs entiers
 */
export function bilanChemin(chemin, cible = CIBLE_DEFAUT) {
  const c = normaliserCible(cible);
  const ops = (chemin && chemin.ops) || [];
  const etats = (chemin && chemin.etats) || [];
  const b = {
    transformations: 0,
    additionsChiffres: 0,
    additionsNombres: 0,
    additionsEnChaine: 0,
    arrondi: 0,          // somme des amplitudes, en millièmes de demi-unité
    minMax: 0,
    lettreVersLettre: 0,
    sixDetruits: 0,
    valeursJetees: 0,
    // ★ les ficelles — voir `FICELLES` et l'en-tête
    majorite: 0,
    decimation: 0,
    // ★ ces deux-là se comptent en MILLIÈMES d'un chiffre absorbé : leur peine
    //   est diluée par le nombre d'additions qui se suivent (`dilution`).
    additionSelective: 0,
    redecoupage: 0,
    // ★ le sommet de l'échelle, en attente d'un opérateur (voir le barème).
    effacementSansMotif: 0,
    // ★ ce qu'un tri croissant déplace, valeur par valeur.
    rearrangement: 0,
    triptyqueVu: false,
    triptyqueTenu: false,
    casseTriptyque: false,
    six: 0,
    largeur: 0,
    finTriptyque: 0,
    nbTriptyques: 0,
  };

  let classePrecedente = null;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const avant = etats[i];
    const apres = etats[i + 1];
    if (!avant || !apres) break;

    // ── la nature de la transformation, et son coût de longueur
    const classe = classeDeTransformation(op, avant);
    if (classe === 'chiffres') {
      b.additionsChiffres++;
      // ★ La même addition de chiffres qui reboucle ne coûte presque rien :
      //   `1 5 → 1+5 → 6` après `10 32 → 1+0, 3+2` est la MÊME idée poursuivie,
      //   pas une idée de plus. Seule la première d'une chaîne coûte le prix
      //   plein d'une transformation.
      if (classePrecedente === 'chiffres') b.additionsEnChaine++;
      else b.transformations++;
    } else {
      b.transformations++;
      if (classe === 'nombres') b.additionsNombres++;
      else if (classe === 'minmax') b.minMax++;
      else if (classe === 'lettres') b.lettreVersLettre++;
      else if (classe === 'moyenne') b.arrondi += amplitudeArrondi(avant.valeur);
    }
    classePrecedente = classe;

    // ── ★ « Un 6 déjà apparu qu'on convertit en autre chose »
    //
    // Deux formes seulement, et l'ÉCARTEMENT n'en fait pas partie : l'agrégation
    // d'un vecteur en un nombre (`6 + 6 = 12`) et le remplacement terme à terme
    // (un 6 qui devient autre chose à sa place). Le rétrécissement d'un vecteur
    // — `m36`, `m0` — n'est pas une conversion, c'est un rejet, et il se compte
    // plus bas avec les autres rejets. Sans cette séparation, un même chiffre
    // serait puni deux fois pour un seul geste.
    const conversion = apres.type === 'NUM'
      || (apres.type === 'NUMS' && avant.type === 'NUMS'
        && apres.valeur.length === avant.valeur.length);
    if (conversion) {
      const perdus = nbSix(avant, c) - nbSix(apres, c);
      // …sauf quand ce qui en sort EST le but : faire un 6 ou un 666 de ses 6
      // n'est pas les convertir « en autre chose ».
      const but = apres.type === 'NUM'
        && (c.alphabet.includes(apres.valeur)
          || (c.nombre !== null && apres.valeur === c.nombre));
      if (perdus > 0 && !but) b.sixDetruits += perdus;
    }

    // ── ★ LES TROIS FICELLES — comptées ICI, et NULLE PART AILLEURS.
    //
    // Chacune se paie à son propre tarif, et ce tarif REMPLACE `VALEUR_JETEE`
    // au lieu de s'y ajouter : c'est ce qui rend vraie la consigne de l'auteur,
    // « moins bas que la suppression arbitraire de ce qui n'est pas 6 ». Les
    // compter aux deux endroits ferait de la ficelle une chose plus chère que
    // le tri qu'elle est censée valoir mieux que.
    const ficelle = op.id && Object.prototype.hasOwnProperty.call(FICELLES, op.id)
      ? FICELLES[op.id] : null;
    if (ECARTEMENTS.has(ficelle)) {
      // Ce que la ruse ÉCARTE, à son tarif. Même unité que `VALEUR_JETEE` :
      // une valeur calculée, montrée, puis écartée.
      b[ficelle] += Math.max(0, avant.valeur.length - apres.valeur.length);
    } else if (ABSORPTIONS_ADDITIVES.has(ficelle)) {
      // Ce que la ruse ABSORBE : le nombre de CHIFFRES qui disparaissent dans
      // une addition. `[6,5,16,8]` porte cinq chiffres et n'en rend que quatre
      // termes : un chiffre a été absorbé, donc une sélection a été faite.
      // Rien n'est jeté ici — d'où les tarifs les plus bas de la liste.
      //
      // ★ Et la peine est DILUÉE par le nombre d'additions qui se suivent
      //   (`dilution`) : c'est l'opérateur qui dit combien il en fait et de
      //   quelle taille, parce que les états ne le disent pas. Sans ce champ —
      //   un opérateur qui ne le porterait pas —, on retombe sur le compte brut
      //   des chiffres absorbés, c'est-à-dire sur la peine PLEINE : l'absence
      //   d'information coûte cher, elle ne blanchit rien.
      let chiffres = 0;
      for (const v of avant.valeur) chiffres += String(Math.abs(v)).length;
      const absorbes = Math.max(0, chiffres - apres.valeur.length);
      b[ficelle] += typeof op.additions === 'function'
        ? dilution(op.additions(avant.valeur)) : absorbes * 1000;
    }

    // ── ★ Le RÉARRANGEMENT : rien n'est jeté, rien n'est converti, mais
    //    l'ordre de lecture ne survit pas. On compte les rangs dont la valeur
    //    change — c'est ce que le spectateur voit se déplacer.
    if (REARRANGEMENTS.has(op.id) && Array.isArray(avant.valeur) && Array.isArray(apres.valeur)) {
      let bouges = 0;
      for (let k = 0; k < avant.valeur.length; k++) {
        if (avant.valeur[k] !== apres.valeur[k]) bouges++;
      }
      b.rearrangement += bouges;
    }

    // ── ★ L'AGRÉGATION : la ligne raccourcit sans que rien ne soit jeté.
    //    Ce qu'elle fait perdre de la cible se paie quand même — trois 6 qui
    //    deviennent « 3 6 », ce sont deux 6 convertis en autre chose, et le
    //    poste ordinaire ne les voit pas (il n'examine que les transformations
    //    à largeur constante).
    const agrege = AGREGATIONS.has(op.id);
    if (agrege) {
      const perdus = nbSix(avant, c) - nbSix(apres, c);
      if (perdus > 0) b.sixDetruits += perdus;
    }

    // ── ★ Le rejet : un vecteur qui rétrécit, c'est des valeurs calculées puis
    //    écartées, et la scène les MONTRE tomber. Les ficelles en sont exclues :
    //    elles viennent de payer, ci-dessus, ce même rétrécissement. Les
    //    agrégations aussi : elles n'écartent rien, elles absorbent.
    if (!ficelle && !agrege && avant.type === 'NUMS' && apres.type === 'NUMS'
      && apres.valeur.length < avant.valeur.length) {
      b.valeursJetees += avant.valeur.length - apres.valeur.length;
    }
    // …et un mappeur qui ne sait pas convertir tous ses jetons en laisse tomber
    //    aussi (le quatorze segments cale sur un tiret).
    if (avant.type === 'TOKENS' && apres.type === 'NUMS'
      && apres.valeur.length < avant.valeur.length) {
      b.valeursJetees += avant.valeur.length - apres.valeur.length;
    }
  }

  // ── ★ Le triptyque contigu, et la CASSE — lus sur les états, dans l'ordre.
  //
  // « Dès qu'un 666 contigu est trouvé, il doit y avoir un malus significatif à
  // casser l'enchaînement. » On cherche donc le PREMIER état qui en porte un ;
  // s'il en existe un, le chemin doit s'arrêter sur un aboutissement légitime —
  // un vecteur qui porte encore trois 6 d'affilée, ou le nombre 666 lui-même.
  // Tout le reste a défait ce qui était écrit.
  const fin = etats[etats.length - 1];
  for (const e of etats) {
    if (!porteUnTriptyque(e, c)) continue;
    b.triptyqueVu = true;
    break;
  }
  if (b.triptyqueVu) {
    b.triptyqueTenu = aboutissementLegitime(fin, c);
    b.casseTriptyque = !b.triptyqueTenu;
  }

  // ── la géométrie du vecteur final : ce que le verdict aura sous les yeux
  const finales = valeursDe(fin);
  if (finales) {
    b.largeur = finales.length;
    b.six = nbSix(fin, c);
    const direct = fin.type === 'NUM' && c.nombre !== null && fin.valeur === c.nombre ? 1 : 0;
    b.finTriptyque = fin.type === 'NUM' ? direct : finDuTriptyque(finales, c);
    b.nbTriptyques = fin.type === 'NUM' ? direct : nbTriptyques(finales, c);
  }
  return b;
}

/**
 * Amplitude de l'arrondi d'une moyenne, en millièmes de DEMI-unité — 0 quand la
 * division tombe juste, 1 000 au pire (une demie).
 *
 * `c.moyenne` calcule `round(somme / n)`. L'écart au nombre juste vaut donc
 * `min(r, n − r) / n` avec `r = somme mod n`, et il ne dépasse jamais 1/2.
 * Rapporté à cette demie, il tient sur [0, 1 000] sans qu'un flottant
 * intervienne nulle part.
 */
export function amplitudeArrondi(valeurs) {
  if (!Array.isArray(valeurs) || !valeurs.length) return 0;
  const n = valeurs.length;
  let somme = 0;
  for (const v of valeurs) somme += v;
  const r = ((somme % n) + n) % n;
  const ecart = Math.min(r, n - r);
  return borner(Math.floor((ecart * 2000) / n), 0, 1000);
}

// ══════════════════════════════════════════════════════════════════════════════
// Le bilan d'une APPROCHE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ★ Les caractères de la saisie que l'approche ABANDONNE, en trois tas.
 *
 * « Tout chiffre ou lettre effacé/ignoré — moindre si c'est un bloc entier
 * séparé par un caractère qui n'était ni lettre ni chiffre au départ. Tout
 * caractère ignoré — malus faible pour ceux qui ne sont ni chiffres ni lettres. »
 *
 * Trois tas, donc, et la frontière entre les deux premiers est celle que
 * l'auteur trace : un BLOC est une suite maximale de lettres et de chiffres de
 * la saisie de départ, bornée par autre chose. Laisser un bloc entier de côté,
 * c'est ne pas s'y intéresser ; arracher une lettre au milieu d'un bloc dont on
 * garde le reste, c'est truquer.
 *
 * ★ Ce qui n'est pas SIGNIFIANT ne coûte rien — `https://`, `www.`, le `/`
 * final. C'est le même masque que le critère de couverture (§5), et pour la
 * même raison : personne ne reproche à une démonstration d'ignorer un protocole.
 */
export function abandons(approche, ctx) {
  const saisie = String((ctx && ctx.saisie) || '');
  const caracteres = [...saisie];
  const masque = ctx && ctx.signifiants ? ctx.signifiants.masque : null;
  const vus = new Uint8Array(caracteres.length);

  let opaque = false;
  for (const p of approche.parts || []) {
    const survie = survieDesCaracteres(p.chemin);
    const base = p.fragment && Number.isInteger(p.fragment.offset) ? p.fragment.offset : 0;
    if (survie.opaque) {
      // On ne sait plus qui vient d'où : on crédite la portée ENTIÈRE plutôt
      // que d'inventer des victimes. L'approche n'est pas punie de notre
      // ignorance — mais le drapeau part avec le bilan, pour qu'on sache que
      // ce compte-là est un minorant.
      opaque = true;
      for (const [d, f] of intervallesDe(p.fragment)) {
        for (let i = d; i < f && i < vus.length; i++) vus[i] = 1;
      }
      continue;
    }
    for (const i of survie.vivants) {
      const g = base + i;
      if (g >= 0 && g < vus.length) vus[g] = 1;
    }
  }

  // Les blocs de la saisie : suites maximales de lettres et de chiffres.
  const blocs = [];
  let debut = -1;
  for (let i = 0; i <= caracteres.length; i++) {
    const alnum = i < caracteres.length && estAlnum(caracteres[i]);
    if (alnum && debut < 0) debut = i;
    else if (!alnum && debut >= 0) { blocs.push([debut, i]); debut = -1; }
  }

  const a = { alnum: 0, bloc: 0, blocCourt: 0, ponctuation: 0, opaque };
  const dansUnBlocEntier = new Uint8Array(caracteres.length);
  for (const [d, f] of blocs) {
    let unVu = false;
    let signifiant = false;
    for (let i = d; i < f; i++) {
      if (vus[i]) unVu = true;
      if (!masque || masque[i]) signifiant = true;
    }
    if (unVu || !signifiant) continue; // le bloc sert, ou bien il est gratuit
    const court = f - d < SERIE;
    for (let i = d; i < f; i++) { dansUnBlocEntier[i] = court ? 2 : 1; }
  }

  for (let i = 0; i < caracteres.length; i++) {
    if (vus[i]) continue;
    if (masque && !masque[i]) continue; // gratuit : ni compté ni reproché
    if (!estAlnum(caracteres[i])) { a.ponctuation++; continue; }
    if (dansUnBlocEntier[i] === 2) a.blocCourt++;
    else if (dansUnBlocEntier[i] === 1) a.bloc++;
    else a.alnum++;
  }
  return a;
}

/**
 * Où finit la matière SIGNIFIANTE de la saisie — la fin du « dernier mot ».
 * À défaut de masque, c'est la fin de la saisie.
 */
function finDesSignifiants(ctx) {
  const masque = ctx && ctx.signifiants ? ctx.signifiants.masque : null;
  if (!masque) return ctx && ctx.saisie ? [...String(ctx.saisie)].length : 0;
  for (let i = masque.length - 1; i >= 0; i--) if (masque[i]) return i + 1;
  return 0;
}

/** La portée d'un fragment atteint-elle la fin de la matière signifiante ? */
function toucheLaFin(fragment, finSignifiante) {
  if (!finSignifiante) return true;
  let fin = -1;
  for (const [, f] of intervallesDe(fragment)) if (f > fin) fin = f;
  return fin >= finSignifiante;
}

function intervallesDe(fragment) {
  if (!fragment) return [];
  if (Array.isArray(fragment.intervalles) && fragment.intervalles.length) return fragment.intervalles;
  return [[fragment.offset, fragment.offset + fragment.longueur]];
}

/**
 * ★ LE BILAN COMPLET D'UNE APPROCHE — la matière du barème.
 *
 * Pur, entier, recalculable depuis les seules parts : c'est ce qui rend le score
 * rejouable depuis une URL (§4.3). Il ne lit ni la place dans la liste, ni le
 * mode nominal, ni rien qui aurait été décidé ailleurs — seulement la géométrie.
 *
 * @param {Object} approche  {parts:[{fragment, chemin}], series?}
 * @param {Object} ctx       {saisie, signifiants:{total, masque}}
 * @returns {Object} le bilan
 */
export function bilanApproche(approche, ctx = {}) {
  const parts = (approche && approche.parts) || [];
  const series = approche && approche.series ? approche.series : 1;
  // La cible du contexte prime ; à défaut, celle que l'approche porte
  // (`deduireMode` l'y attache) ; à défaut encore, 666.
  const cbl = normaliserCible((ctx && ctx.cible) || (approche && approche.cible));
  const LSERIE = cbl.longueur;

  const b = {
    transformations: 0,
    additionsChiffres: 0,
    additionsNombres: 0,
    additionsEnChaine: 0,
    arrondi: 0,
    minMax: 0,
    lettreVersLettre: 0,
    sixDetruits: 0,
    valeursJetees: 0,
    triptyquesContigus: 0,
    triptyquesRepetes: 0,
    casses: 0,
    six: 0,
    montrees: 0,
    couronnementTot: 0,   // en pour-mille, moyenné sur les triptyques contigus
    finirPar666: false,
    // ★ les ficelles assumées — voir `FICELLES` et l'en-tête
    majorite: 0,
    decimation: 0,
    // ★ en MILLIÈMES d'un chiffre absorbé : la peine est diluée (`dilution`).
    additionSelective: 0,
    redecoupage: 0,
    // ★ le sommet de l'échelle, en attente d'un opérateur (voir le barème).
    effacementSansMotif: 0,
    // ★ ce qu'un tri croissant déplace, valeur par valeur.
    rearrangement: 0,
  };

  // ★ Où s'arrête la matière signifiante de la saisie — c'est ce qui définit
  //   « le dernier mot ». Le masque de `zonesSignifiantes` exclut déjà le `/`
  //   final d'une URL : finir sur le dernier mot d'une adresse ne doit pas être
  //   refusé au motif qu'une barre oblique traîne derrière.
  const finSignifiante = finDesSignifiants(ctx);

  let poidsTot = 0;
  let sommeTot = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const bc = bilanChemin(p.chemin, cbl);
    b.transformations += bc.transformations;
    b.additionsChiffres += bc.additionsChiffres;
    b.additionsNombres += bc.additionsNombres;
    b.additionsEnChaine += bc.additionsEnChaine;
    b.arrondi += bc.arrondi;
    b.minMax += bc.minMax;
    b.lettreVersLettre += bc.lettreVersLettre;
    b.sixDetruits += bc.sixDetruits;
    b.valeursJetees += bc.valeursJetees;
    b.majorite += bc.majorite;
    b.decimation += bc.decimation;
    b.additionSelective += bc.additionSelective;
    b.redecoupage += bc.redecoupage;
    b.effacementSansMotif += bc.effacementSansMotif;
    b.rearrangement += bc.rearrangement;
    b.six += bc.six;
    b.montrees += bc.largeur;
    if (bc.casseTriptyque) b.casses++;
    if (bc.triptyqueTenu && bc.finTriptyque > 0) {
      // ★ Le compte est JUSTE — autant de 666 que le vecteur en écrit d'affilée
      //   —, et le premier de la portée vaut plein tarif quand les suivants du
      //   même vecteur valent le tiers (voir `TRIPTYQUE_CONTIGU`). Le total est
      //   plafonné plus bas par ce que le VERDICT montre.
      b.triptyquesContigus++;
      b.triptyquesRepetes += Math.max(0, bc.nbTriptyques - 1);
      // ★ « Plus tôt, mieux c'est » — la part du vecteur qui RESTE après que le
      //   triptyque est complet. Sur un vecteur d'un seul tenant (`[6,6,6]`,
      //   `666`), il n'y a rien après : le triptyque est le vecteur, et le
      //   bonus est plein.
      const reste = bc.largeur > 0 ? bc.largeur - bc.finTriptyque : 0;
      let gain = bc.largeur > LSERIE ? Math.floor((reste * 1000) / bc.largeur) : 1000;
      // ★ « Si [4,4,6,6,6] apparaît sur le DERNIER mot, le bonus est ANNULÉ :
      //   finir par 666 est bien aussi. » — l'auteur.
      //
      //   Ce qui est annulé, c'est l'ÉCART entre les deux, pas le mérite : le
      //   triptyque de queue reçoit alors exactement ce que le MÊME vecteur
      //   aurait reçu avec son triptyque en tête (`[4,4,6,6,6]` touche ce que
      //   touche `[6,6,6,4,4]`). Lui donner le bonus PLEIN le ferait au
      //   contraire passer DEVANT, et l'auteur dit « légèrement supérieur »
      //   dans l'autre sens — l'égalité est le bon point d'arrivée.
      //
      //   « Le dernier mot » se lit sur la GÉOMÉTRIE : la dernière part de
      //   l'approche, dont la portée touche la fin de la matière signifiante.
      //   Un groupement sur le premier mot d'une phrase n'y a pas droit, même
      //   s'il est seul — il finit sa portée, pas la lecture.
      if (reste === 0 && i === parts.length - 1 && toucheLaFin(p.fragment, finSignifiante)) {
        gain = bc.largeur > LSERIE
          ? Math.floor(((bc.largeur - LSERIE) * 1000) / bc.largeur)
          : 1000;
        b.finirPar666 = true;
      }
      sommeTot += gain;
      poidsTot++;
    }
  }
  // Le bonus est porté par `couronnementTot` SEUL ; `finirPar666` n'est plus
  // qu'une observation publiée, pour que le banc sache nommer ce qu'il montre.
  b.couronnementTot = poidsTot ? Math.floor(sommeTot / poidsTot) : 0;
  b.parts = parts.length;

  // ── ★ Ce que le verdict laisse tomber : « ne garder artificiellement que les
  //    6 ». Le compte gardé est celui du verdict — `series × 3`, plafonné aux 6
  //    réellement récoltés —, exactement comme `score.js › rendementSix`, et il
  //    vient de `deduireMode`, donc de la géométrie (§4.3).
  // ★ Le plafond des triptyques crédités : ce que le VERDICT montre. Une part
  //   qui écrit quatre 666 dans une approche à une seule série en a montré un ;
  //   les trois autres sont du surplus, et le surplus se paie plus bas
  //   (`jeteesAuTri`), il ne se crédite pas. Les répétés cèdent la place les
  //   premiers : une trouvaille vaut mieux que sa continuation.
  b.triptyquesContigus = Math.min(b.triptyquesContigus, series);
  b.triptyquesRepetes = Math.min(b.triptyquesRepetes, Math.max(0, series - b.triptyquesContigus));
  const gardees = Math.min(b.six, series * LSERIE);
  b.jeteesAuTri = Math.max(0, b.montrees - gardees);
  b.valeursJetees += b.jeteesAuTri;
  b.gardees = gardees;
  b.series = series;

  b.abandons = abandons(approche, ctx);
  // La cible voyage avec le bilan : `detailDuCredit` en a besoin, et elle doit
  // y arriver par le bilan plutôt que par un second argument — deux chemins
  // pour une même valeur, c'est deux occasions de diverger.
  b.longueurSerie = LSERIE;
  return b;
}

// ══════════════════════════════════════════════════════════════════════════════
// Le barème appliqué : du bilan au crédit
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ★ LE DÉTAIL DU CRÉDIT — poste par poste, et c'est LUI la source du total.
 *
 * `credit()` n'est que la somme de ce tableau. C'est délibéré : un barème qu'on
 * ne peut pas déboguer ne se règle pas, et deux fonctions — l'une qui calcule,
 * l'autre qui explique — finissent toujours par diverger. Le banc de mesure
 * (`.planning/banc/elegance.mjs`) affiche ce tableau tel quel.
 *
 * @param {Object} b  un bilan de `bilanApproche`
 * @returns {Array<{poste:string, quantite:number, points:number}>}
 */
export function detailDuCredit(b) {
  const B = BAREME;
  const a = b.abandons || { alnum: 0, bloc: 0, blocCourt: 0, ponctuation: 0 };
  const LSERIE = b.longueurSerie || SERIE;
  const surplus = Math.min(Math.max(0, b.six - LSERIE), B.SIX_SURNUMERAIRE_MAX);
  const socle = B.SOCLE_TRANSFORMATIONS * Math.max(1, b.parts || 1);
  const enTrop = Math.max(0, b.transformations - socle);
  const lignes = [
    ['socle', 1, B.SOCLE],
    // ── ce qui se gagne
    ['triptyque contigu', b.triptyquesContigus, B.TRIPTYQUE_CONTIGU * b.triptyquesContigus],
    ['triptyque répété (même vecteur)', b.triptyquesRepetes || 0,
      B.TRIPTYQUE_REPETE * (b.triptyquesRepetes || 0)],
    [b.finirPar666 ? 'couronnement tôt (ou final)' : 'couronnement tôt',
      b.couronnementTot, fraction(B.COURONNEMENT_TOT, [b.couronnementTot, 1000])],
    ['6 surnuméraires', surplus, B.SIX_SURNUMERAIRE * surplus],
    ['solde multiple de 3', b.six > 0 && b.six % LSERIE === 0 ? 1 : 0,
      b.six > 0 && b.six % LSERIE === 0 ? B.SOLDE_MULTIPLE_DE_TROIS : 0],
    ['additions de chiffres', b.additionsChiffres, B.ADDITION_CHIFFRES * b.additionsChiffres],
    ['additions de nombres', b.additionsNombres, B.ADDITION_NOMBRES * b.additionsNombres],
    // ── ce qui se perd
    ['★ triptyque cassé', b.casses, -B.CASSE_TRIPTYQUE * b.casses],
    ['6 converti en autre chose', b.sixDetruits, -B.SIX_DETRUIT * b.sixDetruits],
    ['transformations en trop', enTrop, -B.TRANSFORMATION * enTrop],
    ['additions en chaîne', b.additionsEnChaine, -B.ADDITION_EN_CHAINE * b.additionsEnChaine],
    ['valeurs calculées puis jetées', b.valeursJetees, -B.VALEUR_JETEE * b.valeursJetees],
    ['arrondi de moyenne', b.arrondi, -fraction(B.ARRONDI, [b.arrondi, 1000])],
    ['min / max', b.minMax, -B.MIN_MAX * b.minMax],
    ['lettre → lettre', b.lettreVersLettre, -B.LETTRE_VERS_LETTRE * b.lettreVersLettre],
    ['lettre ou chiffre arraché', a.alnum, -B.EFFACE_ALNUM * a.alnum],
    ['bloc entier écarté', a.bloc, -B.EFFACE_BLOC * a.bloc],
    ['bloc entier court écarté', a.blocCourt, -B.EFFACE_BLOC_COURT * a.blocCourt],
    ['ponctuation ignorée', a.ponctuation, -B.EFFACE_PONCTUATION * a.ponctuation],
    // ── ★ les ficelles assumées, au tarif qui remplace `VALEUR_JETEE`
    ['★ effacement sans motif', b.effacementSansMotif || 0,
      -B.EFFACEMENT_SANS_MOTIF * (b.effacementSansMotif || 0)],
    ['le plus fréquent l’emporte', b.majorite, -B.MAJORITE * b.majorite],
    // ★ Ces deux-là sont comptés en MILLIÈMES d'un chiffre absorbé — leur peine
    //   est diluée par le nombre d'additions qui se suivent (`dilution`), et
    //   elle ne descend jamais à zéro tant que le compteur bouge (`peine`).
    ['redécoupage choisi (millièmes)', b.redecoupage || 0,
      -peine(B.REDECOUPAGE, b.redecoupage || 0)],
    ['un rang sur deux', b.decimation, -B.DECIMATION * b.decimation],
    ['addition sélective (millièmes)', b.additionSelective,
      -peine(B.ADDITION_SELECTIVE, b.additionSelective)],
    ['réarrangement', b.rearrangement || 0, -B.REARRANGEMENT * (b.rearrangement || 0)],
  ];
  return lignes.map(([poste, quantite, points]) => ({ poste, quantite, points }));
}

/**
 * Le CRÉDIT d'élégance d'un bilan, en milli-unités. Peut dépasser le socle
 * (c'est ce qui fait le classement par élégance) et peut descendre sous zéro
 * (c'est ce que le plancher du facteur rattrape).
 *
 * @param {Object} b  un bilan de `bilanApproche`
 * @returns {number} entier, non borné
 */
export function credit(b) {
  let c = 0;
  for (const ligne of detailDuCredit(b)) c += ligne.points;
  return c;
}

/**
 * ★ Le facteur multiplicatif appliqué au score de conviction, en pour-mille.
 *
 * Borné à [`FACTEUR_PLANCHER`, 1 000] : **l'élégance ne peut que retirer**. Un
 * crédit au-dessus du socle protège des malus, il ne rapporte rien au score —
 * voir `BAREME.FACTEUR_PLANCHER` pour la mesure qui impose cette règle.
 */
export function facteur(c) {
  return borner(c, BAREME.FACTEUR_PLANCHER, 1000);
}

/**
 * ★ La note d'élégance publiée (`approche.elegance`), bornée par le bas à zéro
 * et par le haut assez haut pour ne jamais mordre.
 *
 * Elle garde la tête au-dessus du socle — c'est là que se joue le classement par
 * élégance (`score.js › ordreElegance`), et l'écraser à 1 000 y remettrait à
 * égalité une démonstration remarquable et une démonstration correcte.
 *
 * ⚠️ MESURE : un premier plafond à 2 000 mordait, et il mordait exactement où il
 * ne fallait pas — les moissons de `hope-hope-hope.fr` (2 883) et de
 * `https://hope-hope-hope.fr/` (2 847 et 2 693) s'y écrasaient toutes à 2 000,
 * si bien que le classement par élégance ne les distinguait plus et retombait
 * sur son cran suivant. Un plafond de note ne doit jamais faire ce travail-là.
 * `NOTE_MAX` est donc réglé au-delà du crédit maximal atteignable et ne sert que
 * de garde-fou de forme.
 */
export const NOTE_MAX = 6000;

export function note(c) {
  return borner(c, 0, NOTE_MAX);
}

/**
 * ★ Une stratégie est-elle PURE au sens de la première suggestion de l'auteur ?
 *
 * « Sans malus autre que d'exclure des blocs entiers séparés par espace ou
 * ponctuation et de moins de 3 lettres initialement. » C'est la seule exception
 * qu'il accorde, et elle est étroite : un bloc entier, court, laissé de côté.
 * Tout le reste — une lettre arrachée au milieu d'un mot, un bloc long ignoré,
 * une valeur calculée puis jetée, un arrondi, un min, un chiffrement — sort de
 * la définition.
 *
 * ★ La ponctuation ignorée n'en sort PAS : « exclure des blocs séparés par
 * espace ou ponctuation » suppose qu'on laisse le séparateur de côté. Le
 * séparateur EST ce qui sépare ; le compter contre l'approche interdirait
 * l'exception au moment même où on l'accorde.
 */
export function estPur(b) {
  const a = b.abandons || {};
  return b.casses === 0
    && b.sixDetruits === 0
    && b.valeursJetees === 0
    // ★ Aucune ficelle ne peut figurer dans une stratégie « sans malus » : ce
    //   sont, par construction, exactement des malus. Le réarrangement non
    //   plus — il ne jette rien, mais il défait l'ordre de lecture, et « sans
    //   malus » ne souffre pas d'exception.
    && b.majorite === 0
    && b.decimation === 0
    && b.additionSelective === 0
    && (b.redecoupage || 0) === 0
    && (b.effacementSansMotif || 0) === 0
    && (b.rearrangement || 0) === 0
    && b.arrondi === 0
    && b.minMax === 0
    && b.lettreVersLettre === 0
    && (a.alnum || 0) === 0
    && (a.bloc || 0) === 0
    && !(a.opaque);
}
