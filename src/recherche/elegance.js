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

/**
 * ★ En deçà de cette longueur, le rangement se paie PLEIN TARIF ; au-delà, il se
 * dilue (voir `BAREME › REARRANGEMENT`).
 *
 * Ce n'est pas un palier et il n'a rien à faire dans `BAREME` : un palier est un
 * TARIF, quelque chose qui s'ajoute ou se retranche au crédit et dont `NATURE`
 * doit pouvoir dire le signe. Celui-ci est un SEUIL — il ne vaut aucune
 * milli-unité, il dit seulement à partir de combien de gestes la dilution
 * commence.
 */
const LONGUEUR_PLEIN_TARIF = 4;

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
   *
   * ★ **C'EST UNE REMISE, ET ELLE S'AFFICHE COMME TELLE.** « ADDITION_EN_CHAINE
   * −4 devrait être +10, car TRANSFORMATION est −14 : si on veut laisser 4 de
   * coût, c'est un bonus de 10 qu'on applique. Fais que ce qui est un bonus
   * apparaisse en tant que bonus et pas en tant que pénalité » (l'auteur).
   *
   * Le poste ne facturait pas 4 : il facturait 14 en moins 10. Écrit en malus
   * de 4, il donnait à lire une peine là où il y a une faveur, et le
   * récapitulatif le rangeait parmi « ce qui se perd ». La chaîne paie donc
   * désormais le prix plein d'une transformation, comme tout le monde, et
   * REÇOIT cette remise. **Le solde est identique au centième près — 14 − 10 =
   * 4 —, et c'est vérifié par un test** : ce changement est de présentation,
   * pas de barème.
   *
   * ⚠️ La remise se compte dans `detailDuCredit`, PAS dans `bilanApproche` :
   * `enTrop` est borné à zéro par le bas (`max(0, transformations − socle)`), et
   * verser les chaînes dans `b.transformations` ferait franchir ce plancher à
   * certaines approches — le solde changerait. On ajoute donc les chaînes à la
   * LIGNE des transformations en trop, sans toucher au compteur.
   */
  REMISE_ADDITION_EN_CHAINE: 10,

  /**
   * ★ **CE QU'ON N'A JAMAIS REGARDÉ, EN PROPORTION.**
   *
   * « Ce qui manque cruellement d'élégance, ce n'est pas le fait d'avoir un seul
   * 666 — on a dit que la pondération quantitative ne pesait que 1 % pour le
   * résultat focus élégance. En revanche, le nombre ou la proportion de texte
   * ignoré d'entrée de jeu manque catastrophiquement d'élégance. Ignorer
   * presque la moitié de la saisie utilisateur devrait faire s'effondrer
   * l'élégance drastiquement » (l'auteur).
   *
   * Les quatre barreaux ci-dessous comptent des CARACTÈRES ; celui-ci compte une
   * PART. C'est ce qui manquait : sur `Donald Trump`, la voie de tête ne lisait
   * que « Donal » — **cinq caractères sur douze** — et l'abandon de « d Trump »
   * ne lui coûtait que 5 × 8 + 26 + 1 = **67 milli-unités**, un dixième de ce
   * qu'un seul rétrécissement de vecteur coûte. Une démonstration qui répond à
   * la moitié de la question passait pour élégante.
   *
   * Le tarif est prélevé au prorata : ignorer la moitié de la matière coûte la
   * moitié du palier. Il s'ajoute aux quatre barreaux — ceux-ci disent QUOI on
   * a laissé (une virgule, un bloc entier, une lettre arrachée), celui-ci dit
   * COMBIEN de la question on n'a pas lue. Les deux sont vrais en même temps.
   *
   * ⚠️ **1 600, ET LE CHIFFRE EST TENU PAR L'AUTRE BOUT DE LA CHAÎNE.** Il a
   * d'abord valu 900, ce qui suffisait tant que le reliquat du verdict coûtait
   * 50 par valeur. Le jour où celui-ci est passé à 90 (voir
   * `RELIQUAT_HORS_CIBLE`), le rapport s'est inversé : laisser huit valeurs
   * étrangères au bord coûtait 8 × 90 + le prorata, soit près de 1 200, quand
   * ignorer la moitié de la saisie n'en coûtait que 495 — et le barème s'est
   * remis à préférer ne pas lire. Mesuré sur les dix-neuf saisies : la part de
   * la question lue par la voie de tête retombait de 97 % à 90 %.
   *
   * Balayage 900 → 1 200 → 1 600 → 2 000 → 2 600 : la couverture remonte à
   * 93 %, puis 97 %, puis ne bouge plus. On s'arrête au premier palier qui
   * atteint le plateau — au-delà, on paierait une sévérité qui ne change rien.
   *
   * ⚠️ Les blocs de moins de trois lettres n'entrent PAS au numérateur : c'est
   * l'exception que l'auteur accorde explicitement (« exclure des blocs entiers
   * séparés par espace ou ponctuation et de moins de 3 lettres »), et le `.fr`
   * de `hope-hope-hope.fr` en vit. La ponctuation n'entre nulle part : personne
   * ne reproche à une méthode d'ignorer un point.
   */
  PORTEE_IGNOREE: 1600,

  /**
   * ★ **ON NE REVIENT PAS SUR UNE ÉTAPE APRÈS ÊTRE PASSÉ À AUTRE CHOSE.**
   *
   * « C'est plus élégant de faire la même étape partout où elle peut avoir lieu
   * plutôt que d'y revenir plusieurs fois, entrecoupé avec d'autres choses »
   * (l'auteur), et « trouver un ordre qui permet de factoriser les étapes pour
   * les appliquer le plus largement possible est préférable ».
   *
   * ⚠️ **MESURÉ : le barème ne voyait RIEN de cet ordre.** Les deux écritures
   * d'une même démonstration sur `hope-hope-hope.fr` —
   * `0.1:P,1.1:Q,2.1:P,3.1:Q,4.1:P,6.1:R` et `0.1:P,2.1:P,4.1:P,1.1:Q,3.1:Q,6.1:R`
   * — notaient **2 120 / 3 771 l'une comme l'autre, au point près**. Rien ne
   * distinguait la démonstration qui fait trois fois la même chose d'affilée de
   * celle qui fait ces trois choses en alternance.
   *
   * ★ **CE QUI SE PAIE EST LE RETOUR, PAS LA RÉPÉTITION.** Répéter un programme
   * sur plusieurs portées n'est pas un défaut — c'est même ce que l'auteur
   * demande d'encourager, et la résonance le récompense déjà (`score.js ›
   * BONUS.resonance`). Ce qui coûte, c'est de le QUITTER puis d'y REVENIR : le
   * spectateur doit alors rouvrir un raisonnement qu'il avait refermé.
   *
   * On compte donc les changements de programme le long des parts, et on en
   * retranche le minimum incompressible — il en faut toujours `distincts − 1`
   * pour passer d'un programme au suivant. Ce qui dépasse est un retour, et
   * chaque retour se paie. Un ordre parfaitement groupé ne paie rien, quel que
   * soit le nombre de programmes ; l'alternance maximale paie le plus.
   *
   * ⚠️ Aucun double comptage avec la résonance : celle-ci récompense trois parts
   * qui portent LE MÊME TEXTE, ce poste facture un ORDRE. Une résonance a un
   * seul programme, donc zéro retour possible — les deux ne se rencontrent
   * jamais sur la même approche.
   */
  RETOUR_SUR_UNE_ETAPE: 60,

  /**
   * ★ **UN FILTRE QU'ON N'APPLIQUE QU'À UN MOT EST UN FILTRE SÉLECTIF.**
   *
   * « Si ce n'est pas une suppression arbitraire mais via un filtre voyelle ou
   * consonne, pas de problème. Si le filtre est appliqué à un des mots et pas à
   * l'ensemble, c'est moins élégant — un peu comme une addition sélective,
   * c'est un filtre sélectif. Ça reste valable, mais moins élégant que si on
   * peut appliquer la même méthode à l'ensemble » (l'auteur).
   *
   * Le grief est exactement celui des ficelles, et il porte le même nom : ce qui
   * se paie n'est pas le geste, c'est le CHOIX de l'endroit où le faire. Sur
   * `jean-michel`, la voie de tête garde les voyelles de `jean` et laisse
   * `michel` entier — une méthode par morceau, présentée comme une méthode.
   *
   * ⚠️ Le tarif est celui de l'addition sélective (100), parce que c'est
   * l'analogie que l'auteur pose lui-même, et il se compte PAR PART qui
   * s'écarte du filtrage commun — pas par caractère. Une approche dont toutes
   * les parts subissent les mêmes filtres ne paie rien, y compris quand aucune
   * n'en subit.
   */
  FILTRE_SELECTIF: 100,

  /**
   * ★ PLUSIEURS DÉCALAGES DIFFÉRENTS DU MÊME CHIFFREMENT, dans une seule voie.
   *
   * « Utiliser fr{N} ne pose pas problème, mais utiliser plusieurs N différents
   * dans une même voie devrait mettre un malus » (l'auteur), et la raison tient
   * en une phrase : un chiffrement de César est UNE méthode, son décalage est
   * son réglage. Lire un morceau avec quatorze crans et le suivant avec neuf,
   * ce n'est pas appliquer une méthode à l'ensemble — c'est régler l'outil
   * morceau par morceau jusqu'à ce que chacun tombe juste, et la démonstration
   * ne prouve alors que l'existence du réglage.
   *
   * Compté PAR DÉCALAGE SURNUMÉRAIRE, comme `FILTRE_SELECTIF` compte les parts
   * qui s'écartent de la majorité : deux césars différents coûtent une fois,
   * trois en coûtent deux. Un seul décalage, si obscur soit-il, ne coûte rien
   * ici — c'est l'`adHoc` de l'opérateur qui s'en charge, et il le fait déjà.
   */
  REGLAGE_PAR_MORCEAU: 240,

  /**
   * ★ **LE MÊME MOT, TRADUIT DE DEUX FAÇONS DANS LA MÊME VOIE.**
   *
   * « Traduire un même mot de manière différente dans une même voie est encore
   * PIRE que d'utiliser des conversions de César différentes dans une même
   * voie. Autant la traduction n'est pas une ficelle, autant traduire le même
   * mot différemment dans une même voie peut être considéré comme une ficelle
   * ou comme du ad-hoc très élevé » (l'auteur). D'où 600, deux fois et demie
   * `REGLAGE_PAR_MORCEAU` — et le rapport n'est pas décoratif, c'est
   * exactement ce que la phrase demande.
   *
   * ★ POURQUOI C'EST PIRE, alors que choisir une acception ne coûte rien.
   *
   *   Une acception est une LECTURE : « espoir » et « espérer » sont deux
   *   lectures légitimes de `hope`, et en préférer une reste une lecture — c'est
   *   pourquoi les cinq se paient au même tarif (`filtres.js`, « le même prix
   *   pour les cinq »). Mais dire, dans la MÊME démonstration, que `hope` veut
   *   dire « espoir » ici et « espérer » là, ce n'est plus lire : c'est se
   *   servir du dictionnaire comme d'un jeu de réglages, en choisissant à chaque
   *   occurrence celle qui tombe juste. Le mot ne signifie plus rien, il rend
   *   un compte.
   *
   *   Le César n'a pas cette aggravation parce qu'il ne prétend à aucun sens :
   *   `fr14` puis `fr9` est un magasinage avoué. Ici le magasinage se cache
   *   derrière une prétention de sens, et c'est ce qui coûte davantage.
   *
   * ⚠️ Compté par ACCEPTION SURNUMÉRAIRE ET PAR MOT — deux lectures d'un mot
   *   coûtent une fois, trois en coûtent deux, et deux mots différents lus
   *   chacun à leur façon ne coûtent RIEN : la divergence n'existe que sur un
   *   même mot. C'est la lecture littérale de « un même mot ».
   */
  TRADUCTION_DIVERGENTE: 600,

  /**
   * ★ **ON A RÉÉCRIT LA QUESTION AVANT D'Y RÉPONDRE** — par étage amont.
   *
   * Une RETOUCHE prend une portée de la saisie, lui applique un programme qui
   * rend du TEXTE, et repose le résultat à sa place ; tout ce qui suit lit le
   * texte réécrit (`url.js`, le `;` ; `index.js › rejouer`). Sur « Donald
   * Trump », `2.1:fr13;fl+tca+m14` chiffre `Trump` en `Gehzc`, puis lit
   * `Donald Gehzc` d'un seul geste et en tire deux séries au lieu d'une.
   *
   * ★ **CE PALIER N'EST PAS LE PRIX DES GESTES DE LA RETOUCHE — ceux-là se
   * paient désormais au tarif de tout le monde.** Depuis que `bilanApproche` lit
   * `approche.retouches`, une retouche compte ses transformations comme
   * n'importe quel morceau de chemin, et leur NATURE avec : `fr13` et `fatb`
   * sont des conversions `lettre → lettre` et paient `LETTRE_VERS_LETTRE`.
   * C'était le premier trou, et le plus grossier — un étage entier ne coûtait
   * rien du tout.
   *
   * ⚠️ **Mais le socle ne pouvait pas suffire, et l'écart est mesuré.** Le geste
   * de `fr13` facturé à l'ordinaire vaut 14 + 40 = **54 milli-unités**. Ce que la
   * retouche ACHÈTE, sur les vingt et une voies retouchées que le corpus de
   * dix-neuf saisies propose — le même programme rejoué SANS elle, crédit contre
   * crédit, palier à zéro — vaut tout autre chose :
   *
   *     gain le plus faible ....  266   (`7.1:fr25;fl+tca+masc+mrd`, google.com)
   *     gain MÉDIAN ............  544
   *     gain le plus fort ......  720   (`2.1:fatb;fl+tca+mpy+mr9`, Marie Curie)
   *
   * (Une seule voie y perd — `6.1:fen2;…` sur « Le chat dort… », −417 : elle
   * gagne une série et la paie plus cher qu'elle ne la vend.) Facturer 54 ce qui
   * en rapporte 544 revient à vendre une série au dixième de son prix — et le
   * générateur n'en propose une QUE si elle rapporte (`groupementsRetouches`
   * exige strictement plus de séries), si bien que le socle seul ferait de
   * l'étage un profit garanti par construction.
   *
   * ★ **CE QUI SE PAIE ICI EST DE MÊME NATURE QUE `FILTRE_SELECTIF`, D'UN CRAN
   * AU-DESSUS.** « Ce qui se paie n'est pas le geste, c'est le CHOIX de
   * l'endroit où le faire » — c'est le mot du filtre sélectif, et il vaut
   * intégralement ici. La différence tient en une phrase : un filtre sélectif
   * choisit où appliquer une MÉTHODE ; une retouche choisit où réécrire la
   * MATIÈRE. Tout ce qui suit démontre alors sur un texte que personne n'a tapé,
   * et le spectateur doit accepter la substitution avant de pouvoir suivre le
   * raisonnement. D'où un tarif au-dessus de `REGLAGE_PAR_MORCEAU` (240), qui ne
   * fait que régler l'outil morceau par morceau.
   *
   * ★ **ET IL N'Y A QU'UN SEUL PALIER, PAS DEUX.** Retoucher puis lire la portée
   * réécrite AVEC les autres (`2.1:fr13;fl+tca+m14`) est la forme que l'auteur
   * trouve remarquable ; retoucher pour ne lire QUE la portée réécrite
   * (`2.1:fr13;2.1:tca+m14`) est un tour de passe-passe. La tentation était de
   * surtaxer la seconde — **le barème le fait déjà, et lourdement**. ⚠️ MESURÉ,
   * les deux formes de la MÊME retouche sur « Donald Trump » :
   *
   *     2.1:fr13;fl+tca+m14    2 séries, crédit  430
   *     2.1:fr13;2.1:tca+m14   1 série,  crédit −405
   *
   * …et les 835 milli-unités d'écart ne doivent RIEN à ce palier, que les deux
   * paient à l'identique : ne lire qu'un mot laisse l'autre jamais lu, donc
   * **−872 de `PORTEE_IGNOREE` et −48 d'`EFFACE_BLOC`**. Un second palier ne
   * ferait que facturer une deuxième fois le même reproche — la faute que
   * l'en-tête interdit (« la peine n'est comptée qu'une fois »).
   *
   * ★ **LE COÛT CROÎT AVEC LE NOMBRE D'ÉTAGES, ET LINÉAIREMENT.** Il se compte
   * PAR RETOUCHE : deux portées réécrites coûtent deux fois. Le rendre
   * superlinéaire a été écarté faute de pouvoir le mesurer —
   * `groupementsRetouches` n'émet jamais plus d'UN étage, et aucune voie du
   * corpus n'en porte deux. On ne règle pas un exposant sur zéro observation. Et
   * le total croît de toute façon plus vite que le palier seul : chaque étage
   * supplémentaire paie AUSSI ses propres transformations et sa propre nature.
   *
   * ⚠️ **420 — BALAYÉ AU BANC**, générateur branché, en comparant chaque liste à
   * celle que rend l'étage DÉBRANCHÉ (dix-neuf saisies, `--json` à l'appui) :
   *
   *       0 · « Marie Curie » bascule sur `2.1:fatb;fl+tca+mpy+mr9` (crédit 763)
   *           et évince la moisson honnête à deux séries (518). La retouche est
   *           gratuite, elle prend la tête. Inacceptable.
   *     240 · le tarif du réglage par morceau : « Marie Curie » tombe toujours,
   *           de 5 milli-unités (523 contre 518). À ce prix, l'étage reste une
   *           affaire.
   *     246 · la moisson repasse d'un cheveu. **Plus aucune tête de liste ne
   *           change** — mais trois voies retouchées tiennent encore la 2ᵈ ligne.
   *     420 · `jean-michel` rend la sienne : `2.1:fr2;fl+tca+m14+mtri` cède la
   *           2ᵈ ligne à la moisson honnête `tca+m14,fr2+tca+m14+mpf`, qui
   *           aligne **le même compte de séries**. C'est le premier palier où
   *           plus aucune voie du corpus n'est déplacée par une retouche.
   *     540 · rien ne bouge (c'est pourtant le gain MÉDIAN mesuré plus haut).
   *     720, 1 000 · rien ne bouge non plus : vingt voies retouchées dans neuf
   *           listes, zéro en 1ʳᵉ ligne, deux en 2ᵈ, aux trois valeurs.
   *
   * On s'arrête donc au premier palier qui atteint le plateau, comme
   * `PORTEE_IGNOREE` et `REDECOUPAGE` avant lui — au-delà, on paierait une
   * sévérité qui ne change rien, et l'on finirait par chasser des listes une
   * démonstration que l'auteur a demandée.
   *
   * ★ **ET LES VOIES RETOUCHÉES RESTENT PROPOSÉES**, ce qui est tout l'objet de
   * l'étage : vingt d'entre elles, dans neuf listes sur dix-neuf — 3ᵉ sur
   * « Donald Trump », 3ᵉ sur `jean-michel`, 2ᵉ sur « Emmanuel Macron », où elle
   * aligne quatre séries contre trois. Visibles, jamais offertes.
   *
   * ⚠️ **ET DEUX D'ENTRE ELLES NE BOUGERONT PAS, quel que soit le tarif — dit
   * ici pour qu'on n'essaie pas.** Balayage poussé jusqu'à **5 000** : les deux
   * voies retouchées de 2ᵈ ligne (« Emmanuel Macron », « Marie Curie ») y sont
   * encore, au mot près. Elles n'y sont pas par leur crédit — sur « Emmanuel
   * Macron » c'est le COMPTE de séries qui décide (quatre contre trois), sur
   * « Marie Curie » c'est `index.js › diversifier`, qui remplit le reste de la
   * liste sur la variété et non sur le barème. Alourdir le palier pour les
   * déloger reviendrait à tordre un poste d'élégance pour agir sur une règle de
   * SÉLECTION, qui n'est pas la sienne.
   */
  RETOUCHE: 420,

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
  VALEUR_JETEE: 300,

  /**
   * ★ **CE QU'ON LAISSE À LA FIN N'EST PAS CE QU'ON JETTE EN ROUTE.** Le palier
   * unique facturait deux gestes que rien ne rapproche, et l'alourdir sur
   * consigne l'a rendu visible d'un coup : à 360 pour les deux, `[6,6,6,6,6]`
   * tombait à 611 de crédit quand `[6,6]` montait à 875 — **produire cinq 6
   * devenait une faute face à en produire deux**, parce que les deux 6 que le
   * verdict ne groupe pas étaient facturés comme du travail jeté. « `[6,6,6,6,6]`
   * ne doit pas être inférieur à `[6,6]` » (l'auteur), et il avait raison.
   *
   * Les trois tarifs sont ceux qu'il a fixés :
   *
   *   · en cours de route ................................ 300
   *   · laissé à la fin, et ce n'était pas ce qu'on cherche  90
   *   · laissé à la fin, et c'était ce qu'on cherche ......  50
   *
   * L'ordre dit la doctrine. Jeter en route est du **travail fait pour rien** —
   * on a calculé une valeur, puis on l'a effacée. Laisser un reliquat à la fin
   * est un **reste**, pas un gâchis : la démonstration ne l'a pas produit exprès,
   * elle n'a simplement pas pu le grouper.
   *
   * ★ **ET LES DEUX DERNIERS SONT DANS CET ORDRE-LÀ, PAS DANS L'AUTRE.** Ils ont
   * d'abord été posés à 50 / 90 — un 6 qu'on avait valant plus cher qu'un
   * chiffre étranger. La mesure a montré le contraire : à ce réglage, une
   * ficelle qui rogne `[6,4,6,3,6] → [6,6,6]` marquait **811** contre **769**
   * pour une voie honnête `[6,6,6,6,6]`, parce qu'un 6 produit et non montré
   * valait 22 − 90 = **−68 net** — ce qui contredit frontalement « plus tu
   * produis de 6, mieux c'est ».
   *
   * « C'est moins grave de supprimer à la fin des 6 surnuméraires que de
   * supprimer autre chose : mieux vaut supprimer des 6 silencieusement au
   * verdict que de supprimer autre chose silencieusement. Ce qui veut dire que
   * le reste est à supprimer plus tôt, d'une manière qui n'est pas considérée
   * comme une suppression mais comme une fusion » (l'auteur). Les deux tarifs
   * sont donc échangés, et un 6 en trop vaut désormais 22 − 50 = −28 net.
   */
  RELIQUAT_HORS_CIBLE: 90,
  RELIQUAT_DE_CIBLE: 50,

  /**
   * ★ **ET LA PART DU VECTEUR QUE LE VERDICT NE MONTRE PAS.**
   *
   * « Le nombre de caractères supprimés pour ne garder que 666 est bien trop
   * important pour considérer la solution comme élégante. Cette suppression doit
   * être lourdement pénalisée. Le malus est-il appliqué une seule fois ou pour
   * chaque caractère supprimé ? C'est cette option qui devrait être appliquée,
   * car il est plus grave de supprimer 7 caractères que 1 ou 2, et c'est
   * d'autant plus important qu'on n'en garde que 3. Il faudrait donc un malus
   * quantitatif ET un malus proportionnel » (l'auteur).
   *
   * Les deux tarifs ci-dessus sont le malus QUANTITATIF : ils comptent les
   * valeurs, une par une. Celui-ci est le PROPORTIONNEL, et il dit ce que le
   * compte ne sait pas dire — laisser huit valeurs sur onze n'est pas huit fois
   * laisser une valeur, c'est ne montrer qu'un quart de son travail.
   *
   * ⚠️ Il ne compte QUE le reliquat HORS CIBLE, jamais les 6 surnuméraires. Un 6
 * de plus que le verdict n'en montre n'est pas « une part de la réponse qu'on
 * cache » : c'est de la réponse en trop, et l'auteur veut qu'on en produise
 * beaucoup. Le compter ici punirait l'abondance une seconde fois — mesuré :
 * `[6,6,6,6,6]` tombait à 609 contre 811 pour une ficelle qui rogne.
 *
 * C'est le pendant exact de `PORTEE_IGNOREE`, à l'autre bout de la chaîne :
   * l'un mesure la part de la QUESTION qu'on n'a pas lue, l'autre la part de la
   * RÉPONSE qu'on ne montre pas. Les deux gestes se ressemblent — on écarte sans
   * le dire — et ils se paient au même barème.
   */
  RELIQUAT_PROPORTIONNEL: 600,

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

  // ── ★ LA DOUBLE PEINE DES TRICHES — MESURÉE, ET CONSERVÉE DE JUSTESSE ──────
  //
  // > « Je ne suis pas sûr que les triches nécessitent une pénalité en plus de
  // >  leur faible notoriété qui a déjà cet effet, comme les approches qui ne
  // >  trichent pas vraiment mais qui sont très artificielles/inélégantes. »
  // >  — l'auteur.
  //
  // Le doute est fondé, et il porte sur un fait exact : les quatre opérateurs
  // tricheurs sont punis DEUX FOIS. Une première dans le score de conviction —
  // notoriété basse, `adHoc` haut, donc un critère N et un critère A qui
  // s'effondrent — et une seconde ici, par les quatre paliers ci-dessous.
  //
  // La question se tranche par la mesure, et par elle seule. Le banc porte donc
  // un drapeau qui met les quatre paliers à zéro sans rien toucher d'autre :
  // `node .planning/banc/classement.mjs --sans-triches`. Ce qui suit est ce
  // qu'il rend, sur les dix-neuf saisies témoins, à deux moments différents.
  //
  // ⚠️ **AVANT que la quantité soit ramenée à 1 % dans le classement d'élégance**
  // (`score.js › POIDS_DES_REGIMES`), la seconde peine était ce qui tenait la
  // tête de liste. Sans elle, QUATRE têtes changeaient, et les quatre au profit
  // d'une triche :
  //
  //   · `Éléonore à Nîmes` — `t1+mw+m10`, « le plus fréquent l'emporte », DEUX
  //     séries, prenait la tête à une moisson honnête qui en aligne TROIS ;
  //   · `https://www.example.com/path/to/page` — `f6+t1+mw+m10`, QUATRE séries,
  //     prenait la tête à une moisson honnête qui en aligne CINQ ;
  //   · `Le chat dort sur le tapis rouge` et `Emmanuel Macron` — `m16`, le
  //     redécoupage que l'auteur nomme lui-même « tricher », prenait la tête.
  //
  //   Le compte des triches figurant dans les DEUX premières lignes passait de
  //   cinq à huit, dont cinq en première ligne au lieu d'une.
  //
  // ⚠️ **APRÈS**, la mesure change du tout au tout, et c'est la découverte : la
  // repondération de la quantité fait à elle seule le travail que la double
  // peine faisait. Une triche gagne en produisant PLUS de motifs ; à 1 % de
  // quantité, ce gain s'évapore. Résultat, `--sans-triches` ne déplace plus
  // **AUCUNE tête de liste sur les dix-neuf saisies**, et les deux premières
  // lignes restent vierges de toute triche dans les deux cas.
  //
  // ★ **Ce qui reste, et qui a suffi à la conserver.** La seconde peine continue
  // de travailler au MILIEU de la liste, et l'exemple est net — sur
  // `https://www.google.com` comme sur `Nombre de la bête`, la retirer fait
  // ENTRER `f6+t1+mw+m10` dans les douze et en fait SORTIR `f6+t1+mw`. Ce sont
  // les mêmes codes, à la triche près, et elles alignent le même compte : deux
  // séries. La seule chose que `m10` ajoute est de jeter ce qui n'est pas
  // majoritaire — et sans les paliers, ce geste-là est RÉCOMPENSÉ (crédit 1 452
  // contre 1 011) au point d'évincer la voie qui ne jette rien. C'est
  // exactement ce que le barème existe pour empêcher.
  //
  // ★ **L'arbitrage reste donc ouvert, et il est désormais bon marché.** Ce que
  // la double peine coûte est une complication du barème ; ce qu'elle achète
  // n'est plus une tête de liste mais deux ou trois rangs au milieu, sur deux
  // saisies sur dix-neuf. Qui voudra la retirer n'aura plus à craindre pour la
  // vitrine — seulement à accepter qu'une voie tricheuse passe devant son
  // équivalente honnête, à compte égal, quelque part entre le 4ᵉ et le 7ᵉ rang.

  // ── ★ LES FICELLES, dans l'ordre de laideur de l'auteur.
  //
  // ⚠️ **ELLES ÉTAIENT TROIS ; `m.plusFrequent` N'EN EST PLUS.** « mpf ne doit
  // plus être considéré comme une ficelle ! » (l'auteur). Le palier `MAJORITE`
  // reste et garde sa valeur — c'est le prix d'un rejet de minorité, et il se
  // paie toujours —, mais il est devenu le tarif ORDINAIRE d'un geste énoncé,
  // et non plus la peine d'une ruse. Voir `ENONCENT_LA_MAJORITE` : ce qui
  // sépare désormais 180 de 260, c'est de dire sa règle ou de s'en servir en
  // sous-main.
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
   * ★ ÉGALISER — par valeur réécrite.
   *
   * `m.egalisation` prend `8 15 16 5` et rend `11 11 11 11` : un `1` passe du
   * plus grand au plus petit jusqu'à ce que tout se tienne. Le geste est
   * arithmétiquement irréprochable — la somme est un invariant du transfert,
   * c'est ce qui garantit que la valeur commune atteinte est la moyenne — et
   * c'est justement ce qui le rend redoutable.
   *
   * Car il ne jette rien, ne choisit rien, n'énonce aucun critère : il ne
   * tombait donc sous AUCUN compteur, et ne payait que les 14 du socle. Or
   * dès que la moyenne vaut le chiffre cherché, la ligne entière devient ce
   * chiffre — six lettres donnent deux séries d'un coup. Mesuré à l'ouverture :
   * il raflait quatre têtes de liste sur cinq (`Macron` 1553, `reinfocovid`
   * 1611, `Capitalisme` 1597, `Marie Curie` 1509), là où les meilleures voies
   * honnêtes plafonnaient vers 930.
   *
   * Ce qui se paie n'est pas la malhonnêteté — il n'y en a pas — mais le fait
   * que **le résultat ne vient plus de la saisie** : douze valeurs distinctes
   * deviennent douze fois la même, et ce que la démonstration montre ensuite
   * ne dit plus rien du mot qu'on lisait. Par valeur réécrite, donc : uniformiser
   * trois nombres n'est pas uniformiser douze.
   *
   * ⚠️ Réglé par BALAYAGE, comme `RETOUCHE` (voir plus bas) : c'est la première
   *    valeur qui rend les têtes de liste aux voies qui lisent vraiment.
   */
  EGALISATION: 200,

  /**
   * ★ **LA MÊME RÈGLE, MAIS SANS LA DIRE — ET ÇA COÛTE PLUS CHER.**
   *
   * `m36` et `m.plusFrequent` font, sur `[2,2,6,6,6,7]`, exactement le même
   * geste : ils rendent `[6,6,6]`. Ils ne disent pas la même chose pour autant.
   * L'un ÉNONCE l'argument — « le plus fréquent l'emporte », vérifiable en
   * comptant, et qui vaudrait pour n'importe quelle valeur ; l'autre s'en sert
   * en sous-main, en annonçant seulement « il y a trois 6 d'affilée, on garde
   * ça », c'est-à-dire la conclusion prise pour prémisse.
   *
   * ⚠️ Le tarif a d'abord été posé ÉGAL (180 tous les deux), en pariant que la
   * dilution des ficelles suffirait à départager. **Mesuré : elle ne s'applique
   * pas ici, et les deux voies sortaient à 932 d'élégance pile.** « `mpf` est
   * nettement plus élégant que `m36` […] `m36` doit être une alternative de
   * secours à `mpf`, et non l'inverse » (l'auteur) : il fallait donc l'écrire,
   * pas l'espérer.
   *
   * 260, soit un peu moins d'une fois et demie. Assez pour que l'argument énoncé
   * l'emporte toujours quand les deux sont jouables ; pas assez pour reléguer le
   * rejet tacite au rang des ficelles — il reste une alternative de secours,
   * c'est le mot de l'auteur, et il est nettement sous `VALEUR_JETEE` (300),
   * qui, lui, punit le rejet sans AUCUNE excuse.
   */
  MAJORITE_TACITE: 260,

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
   * ⚠️ **Ce palier survit à la sortie des ficelles.** L'auteur a demandé plus
   * tard que `mrd` « soit retiré des ficelles pour devenir un opérateur à 0.2 de
   * notoriété » (voir `FICELLES`). Il n'y est donc plus, il n'évince plus et ne
   * se fait plus évincer — mais son geste n'a pas changé d'un pouce, et ce qui
   * se paie ici, c'est le GESTE. Même partage que pour `mpf` et pour
   * `m.egalisation` : sortir des ficelles n'est pas devenir gratuit.
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
   *
   * ★ **ET IL PÈSE MOINS SUR UNE LONGUE DÉMONSTRATION.** « Le fait d'ajouter
   * `mtal` ici devrait peser du fait de la concision du processus, mais peser
   * moins quand il y a de toute façon plus d'étapes » (l'auteur).
   *
   * Le grief est juste et il est de PROPORTION : ranger la ligne dans une
   * démonstration de quatre gestes, c'est un geste sur quatre — le spectateur
   * le voit ; dans une démonstration de douze, il passe inaperçu, et le facturer
   * au même prix reviendrait à punir deux fois la longueur, que le critère de
   * concision mesure déjà (`score.js › POIDS.concision`).
   *
   * ⚠️ **La peine ne MONTE pas sur les courtes, elle DESCEND sur les longues**,
   * et le choix n'est pas neutre : la monter aurait érodé le seul écart que
   * l'auteur venait de demander de préserver — « entre `fr13+tca+m14+mpf` et
   * `tca+mtal+mt9+mpf`, le second devrait avoir un meilleur score, mais pas de
   * beaucoup ». Il est de 40 milli-unités (932 contre 892) ; alourdir le
   * rangement l'aurait mangé. `LONGUEUR_PLEIN_TARIF` est donc posée à la
   * longueur de ces deux voies-là : à quatre gestes et en deçà, rien ne change.
   *
   * ⚠️ **ET LA DILUTION NE MORD SUR RIEN AUJOURD'HUI — mesuré, et dit ici pour
   * qu'on ne le redécouvre pas.** Cinq voies du corpus rangent quelque chose, et
   * les cinq tiennent en trois ou quatre gestes : `tca+mtal+m14+mtri` sur
   * « Donald Trump », `fatb+tca+mt9+mtri` sur « Millicent », `fl+tca+m14+mtri`
   * sur « jean-michel »… Aucune n'atteint le seuil. La règle est donc écrite
   * pour le jour où un rangement se glissera dans une longue démonstration ;
   * elle ne déplace pas une milli-unité du classement actuel.
   *
   * On l'écrit quand même, et pas par acquit de conscience : sans elle, ce jour-
   * là, le rangement se paierait au prix d'un geste sur quatre dans une
   * démonstration de douze, et la longueur serait punie deux fois — une fois
   * ici, une fois par le critère de concision.
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

  /**
   * ★ **ÉCRIRE UN CHIFFRE EN TOUTES LETTRES — le seul geste qui remonte le
   *   courant.**
   *
   * « Avec un gros malus puisqu'on essaie plutôt d'aller en sens inverse, mais
   * occasionnellement ça peut dépanner […] c'est plutôt à considérer comme une
   * ficelle. » (l'auteur)
   *
   * Tout le catalogue lit du texte pour en tirer des nombres. Celui-ci rend des
   * lettres à un nombre, et ces lettres-là ne viennent pas de la saisie : elles
   * viennent de nous. Ce n'est pas un effacement — rien ne disparaît —, ce n'est
   * pas une absorption — rien n'est additionné — et ce n'est pas un rejet de
   * minorité. C'est une RÉÉCRITURE, et c'est le quatrième genre de ficelle.
   *
   * ★ **Un FORFAIT, par emploi, et pas un tarif par valeur.** Les autres
   * ficelles se comptent par ce qu'elles font disparaître ; celle-ci ne fait
   * disparaître qu'une chose, le nombre, quel qu'il soit. Écrire « six » ne
   * coûte pas moins qu'écrire « quatre » : ce qui se paie est le CHANGEMENT DE
   * SENS, une fois, à chaque fois qu'on le prend.
   *
   * ★ **Au niveau de la retouche (420), et c'est l'analogie qui le fixe.** Une
   * retouche réécrit un mot de la saisie avant de le lire ; celle-ci réécrit un
   * nombre qu'on venait de calculer. Les deux ajoutent au raisonnement une
   * étape qui ne prouve rien par elle-même, et les deux se paient une fois par
   * emploi — même geste, même unité, même prix. En dessous
   * d'`EFFACEMENT_SANS_MOTIF` (520), qui, lui, fait perdre de la matière.
   *
   * ⚠️ MESURÉ sur les huit saisies témoins : à ce tarif, aucune tête de liste
   * ne change, et l'opérateur ne s'invite dans aucune. C'est exactement ce que
   * l'auteur en attend — « occasionnellement ça peut dépanner ».
   */
  ECRITURE_EN_LETTRES: 420,


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
 * ══════════ ★ LE SIGNE ET LA FAMILLE DE CHAQUE POSTE — DÉCLARÉS, PAS DÉDUITS ══
 *
 * ★ **Pourquoi cette table existe.** Jusqu'ici, tous les postes de `BAREME`
 * étaient des nombres POSITIFS, et le signe d'un palier ne se lisait nulle part
 * dans sa déclaration : il n'apparaissait qu'à l'endroit où le poste était
 * consommé, sous la forme d'un `-` devant la multiplication, au milieu de
 * `detailDuCredit`. Autrement dit, la seule façon de savoir si
 * `LETTRE_VERS_LETTRE: 40` récompense ou punit était de retrouver sa ligne
 * d'usage et d'y regarder un caractère.
 *
 * C'est un défaut de LISIBILITÉ du barème, et c'en est un de PORTABILITÉ : rien
 * de ce qui lit `BAREME` de l'extérieur — la page de récapitulation du barème,
 * un banc de mesure, un test — ne peut distinguer un bonus d'un malus sans
 * réimplémenter le calcul. Le signe est désormais DIT ici, une fois, et
 * `detailDuCredit` ne fait plus que l'appliquer.
 *
 * ★ **Et la FAMILLE, tant qu'on y est — parce que le classement en a besoin.**
 * L'auteur demande trois régimes de classement (voir `score.js › LES TROIS
 * CLASSEMENTS`), dont deux repondèrent le crédit : la première place ramène à
 * 1 % ce que la QUANTITÉ de motifs rapporte, la seconde ramène à 33 % ce que
 * l'ÉLÉGANCE proprement dite pèse. Pour faire cela, il faut savoir, poste par
 * poste, lequel des deux mérites il mesure. C'était jusqu'ici une connaissance
 * implicite, répartie entre trois commentaires ; elle est ici, en clair.
 *
 * Trois familles, et trois seulement :
 *
 *  · `'socle'`    — le point de départ. Ni gagné ni perdu, jamais repondéré :
 *                   repondérer le socle reviendrait à changer l'unité du crédit
 *                   d'un régime à l'autre, et les trois classements ne seraient
 *                   plus lisibles dans la même échelle.
 *  · `'quantite'` — ce qui rapporte PARCE QU'ON A TROUVÉ LE MOTIF, une fois ou
 *                   plusieurs. Trois postes, et trois seulement : le triptyque
 *                   contigu, le triptyque répété du même vecteur, et les 6
 *                   surnuméraires. Ce sont exactement les trois que l'auteur
 *                   vise — « le fait de trouver 1 fois ou plusieurs fois le
 *                   motif ne devrait pas apporter de bonus ».
 *  · `'elegance'` — tout le reste : la manière. Ce qui se gagne à arriver tôt,
 *                   à tomber juste, à n'additionner que des chiffres ; ce qui se
 *                   perd à casser, à jeter, à arrondir, à effacer, à tricher.
 *
 * ⚠️ **`SOLDE_MULTIPLE_DE_TROIS` est de la famille `'elegance'`, et c'est un
 * arbitrage qu'il faut assumer.** Il se déclenche au vu d'un COMPTE (le nombre
 * de 6 est un multiple de la longueur de série), ce qui le fait ressembler à un
 * poste de quantité. Il n'en mesure pourtant pas la quantité : il vaut 90
 * qu'on ait un 666 ou quatre, et ce qu'il récompense est de ne RIEN LAISSER
 * TRAÎNER — un solde qui tombe juste, pas un solde qui abonde. C'est la même
 * chose que `COURONNEMENT_TOT` mesure dans le temps, mesurée dans le compte.
 *
 * ⚠️ **`CASSE_TRIPTYQUE` et `SIX_DETRUIT` sont eux aussi de la famille
 * `'elegance'`**, bien qu'ils parlent de motifs. Ils ne comptent pas ce qu'on a
 * trouvé, ils comptent ce qu'on a DÉFAIT — c'est un geste, pas une récolte.
 * Les mettre en `'quantite'` reviendrait à les diviser par cent au moment
 * précis où le classement prétend juger la manière.
 *
 * ★ Les trois `'reglage'` ne produisent aucune ligne de crédit : ce sont un
 * plafond, un seuil et un plancher. Ils figurent ici pour que la table soit
 * EXHAUSTIVE — un test le vérifie —, faute de quoi un poste ajouté demain
 * pourrait n'être ni signé ni classé sans que rien ne le signale.
 */
export const NATURE = Object.freeze({
  SOCLE: { sens: +1, famille: 'socle' },

  // ── ce qui se gagne parce qu'on a TROUVÉ le motif
  TRIPTYQUE_CONTIGU: { sens: +1, famille: 'quantite' },
  TRIPTYQUE_REPETE: { sens: +1, famille: 'quantite' },
  SIX_SURNUMERAIRE: { sens: +1, famille: 'quantite' },

  // ── ce qui se gagne par la MANIÈRE
  COURONNEMENT_TOT: { sens: +1, famille: 'elegance' },
  SOLDE_MULTIPLE_DE_TROIS: { sens: +1, famille: 'elegance' },
  ADDITION_CHIFFRES: { sens: +1, famille: 'elegance' },
  ADDITION_NOMBRES: { sens: +1, famille: 'elegance' },

  // ── ce qui se perd par la MANIÈRE
  CASSE_TRIPTYQUE: { sens: -1, famille: 'elegance' },
  SIX_DETRUIT: { sens: -1, famille: 'elegance' },
  TRANSFORMATION: { sens: -1, famille: 'elegance' },
  REMISE_ADDITION_EN_CHAINE: { sens: +1, famille: 'elegance' },
  PORTEE_IGNOREE: { sens: -1, famille: 'elegance' },
  RETOUR_SUR_UNE_ETAPE: { sens: -1, famille: 'elegance' },
  FILTRE_SELECTIF: { sens: -1, famille: 'elegance' },
  REGLAGE_PAR_MORCEAU: { sens: -1, famille: 'elegance' },
  TRADUCTION_DIVERGENTE: { sens: -1, famille: 'elegance' },
  RETOUCHE: { sens: -1, famille: 'elegance' },
  VALEUR_JETEE: { sens: -1, famille: 'elegance' },
  RELIQUAT_HORS_CIBLE: { sens: -1, famille: 'elegance' },
  RELIQUAT_DE_CIBLE: { sens: -1, famille: 'elegance' },
  RELIQUAT_PROPORTIONNEL: { sens: -1, famille: 'elegance' },
  ARRONDI: { sens: -1, famille: 'elegance' },
  MIN_MAX: { sens: -1, famille: 'elegance' },
  LETTRE_VERS_LETTRE: { sens: -1, famille: 'elegance' },
  EFFACE_ALNUM: { sens: -1, famille: 'elegance' },
  EFFACE_BLOC: { sens: -1, famille: 'elegance' },
  EFFACE_BLOC_COURT: { sens: -1, famille: 'elegance' },
  EFFACE_PONCTUATION: { sens: -1, famille: 'elegance' },

  // ── ce qui se perd par une TRICHE assumée
  EFFACEMENT_SANS_MOTIF: { sens: -1, famille: 'elegance' },
  MAJORITE: { sens: -1, famille: 'elegance' },
  EGALISATION: { sens: -1, famille: 'elegance' },
  MAJORITE_TACITE: { sens: -1, famille: 'elegance' },
  DECIMATION: { sens: -1, famille: 'elegance' },
  ADDITION_SELECTIVE: { sens: -1, famille: 'elegance' },
  REDECOUPAGE: { sens: -1, famille: 'elegance' },
  ECRITURE_EN_LETTRES: { sens: -1, famille: 'elegance' },
  REARRANGEMENT: { sens: -1, famille: 'elegance' },

  // ── ni bonus ni malus : des bornes, qui ne produisent aucune ligne
  SIX_SURNUMERAIRE_MAX: { sens: 0, famille: 'reglage' },
  SOCLE_TRANSFORMATIONS: { sens: 0, famille: 'reglage' },
  FACTEUR_PLANCHER: { sens: 0, famille: 'reglage' },
});

/**
 * ★ LE POIDS PLEIN — le crédit tel qu'il a toujours été calculé.
 *
 * Les deux familles à 1 000 ‰ : c'est le régime du classement MIXTE (`score.js ›
 * ordreTotal`), celui de la 3ᵉ ligne et des suivantes, et c'est aussi celui du
 * facteur qui redescend sur le score de conviction. Un régime repondéré ne sert
 * qu'à CLASSER ; il ne touche jamais au score.
 */
export const POIDS_PLEIN = Object.freeze({ quantite: 1000, elegance: 1000 });

/**
 * La repondération d'une ampleur de ligne, en pour-mille de son poids plein.
 *
 * ★ **Troncature VERS ZÉRO** (`Math.trunc`), et pas `Math.floor` : l'ampleur est
 * toujours positive ici — le signe vient de `NATURE` —, donc les deux coïncident
 * aujourd'hui. Le choix est écrit quand même, parce qu'il dit l'intention : un
 * poids réduit ATTÉNUE, dans les deux sens ; il ne doit jamais rendre un malus
 * plus lourd que son poids plein par un effet d'arrondi.
 *
 * Le socle n'est jamais repondéré (voir `NATURE`), et un poids de 1 000 ‰ sort
 * sans passer par la division : le crédit plein reste bit à bit celui d'avant.
 */
const pondererAmpleur = (ampleur, famille, poids) => {
  if (!poids || famille === 'socle' || famille === 'reglage') return ampleur;
  const p = poids[famille];
  if (p === undefined || p === 1000) return ampleur;
  return Math.trunc((ampleur * p) / 1000);
};

/**
 * ★ LES FICELLES, par identifiant d'opérateur — et le compteur qu'elles
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
  // ⚠️ **`m.plusFrequent` N'EN FAIT PLUS PARTIE** — « mpf ne doit plus être
  //    considéré comme une ficelle ! » (l'auteur), et le retrait a des effets
  //    bien au-delà de son tarif, qui sont tout l'objet de la consigne :
  //
  //     · elle cesse d'être ÉVINÇABLE. La règle de sélection
  //       (`assemblage.js › apporteQuelqueChose`) écarte une ficelle dès qu'une
  //       voie « sans ficelle » fait aussi bien — et sur `Macron`, l'incumbent
  //       honnête était `m36`, celui-là même qu'elle est censée dépanner ;
  //     · elle cesse d'ÉVINCER, et de compter dans `nbFicelles` ;
  //     · son geste se facture désormais par la voie ORDINAIRE, celle de tous
  //       les rétrécissements — au tarif de la majorité ÉNONCÉE (`MAJORITE`),
  //       là où un rejet qui ne dit pas sa règle paie `MAJORITE_TACITE`.
  //
  //    Ce qu'elle garde : son geste reste compté, et le rendement continue de la
  //    voir écarter (`OPERATEURS_QUI_ECARTENT`). Sortir des ficelles n'est pas
  //    devenir gratuite, c'est cesser d'être traitée en suspecte.
  'm.unRangSurDeux': 'decimation',
  'm.additionSelective': 'additionSelective',
  // ★ La troisième, et d'un genre à elle : elle ne jette rien et n'absorbe
  //   rien, elle RÉÉCRIT — un nombre redevient du texte. « C'est plutôt à
  //   considérer comme une ficelle » (l'auteur), et c'en est une au sens
  //   posé en tête de cette table : elle aboutit quel que soit le mot, tout
  //   chiffre ayant un nom.
  'm.chiffreEnLettres': 'ecritureEnLettres',
  // ★ **`m.redecoupageChoisi` N'EN FAIT PLUS PARTIE** — « `mrd`, l'idée est là,
  //   à retirer des ficelles pour en faire un opérateur à 0.2 de notoriété »
  //   (l'auteur). C'est le même mouvement que pour `mpf` et pour `m.egalisation`
  //   avant lui, et il se lit à la définition posée en tête de cette table : une
  //   ficelle ABOUTIT quel que soit le mot. Le redécoupage, lui, refuse de
  //   s'appliquer dès qu'il ne gagne pas de 6-ou-9, et il refuse en deçà de
  //   vingt-cinq chiffres — sur la quasi-totalité des saisies, il ne se propose
  //   même pas.
  //
  //   Ce qu'il garde, et ce sont les deux moitiés de la phrase :
  //
  //    · le palier `REDECOUPAGE`, compté par chiffre absorbé et dilué par le
  //      nombre d'additions, exactement comme avant — voir
  //      `ABSORBENT_PAR_ADDITION`. Sortir des ficelles n'est pas devenir
  //      gratuit ;
  //    · sa place dans `A_MERITER_SA_PLACE`, parce que la question du faisceau
  //      n'est pas celle du barème : il produit des 6 EN MASSE par construction,
  //      ce qui est précisément le critère de cette table-là.
  //
  //   Ce qu'il perd : il cesse d'être évinçable et d'évincer (`nbFicelles`,
  //   `assemblage.js`), et il redevient éligible à la seconde suggestion, celle
  //   qui met en avant le NOMBRE de séries (`index.js › selectionner`).
  // ⚠️ `effacementSansMotif` n'a pas encore d'opérateur : la scission du geste
  //    de `m36` (couronner / effacer) est en cours ailleurs. Inscrire ici
  //    l'identifiant de la moitié « effacer » suffira à brancher le palier.
  // ★ **`m.egalisation` N'EST PAS UNE FICELLE**, et c'est un arbitrage rendu.
  //
  //   Elle y a figuré une journée. J'avais écrit ici « ça marche toujours, et
  //   ça ne prouve rien » — l'auteur a tranché l'inverse, et sur le fond :
  //   « meg ne marche pas toujours, l'égalisation pourrait être autre que sur
  //   6 ». C'est exact, et c'est ce qui la distingue des trois ci-dessus.
  //   L'égalisation ne CHOISIT pas sa valeur : elle tombe sur la moyenne de la
  //   ligne, qui vaut ce qu'elle vaut. Sur `8 15 16 5` elle donne 11, et la
  //   voie meurt. Elle ne réussit que là où la ligne portait DÉJÀ la moyenne
  //   cherchée — ce qui est une propriété du mot lu, pas du geste posé. Une
  //   ficelle, elle, aboutit quel que soit le mot ; c'est la définition
  //   retenue en tête de cette table, et l'égalisation n'y répond pas.
  //
  //   Ce qu'elle garde : le palier `EGALISATION`, compté par valeur réécrite
  //   (elle réécrit toute la ligne, et cela se paie), et une notoriété
  //   abaissée à 0.20 — le geste est peu connu, non malhonnête.
  //
  //   Le journal de la mesure, parce qu'il explique le palier : à l'ouverture
  //   elle prenait SEPT têtes de liste sur huit (`Macron` 1553, `Millicent`
  //   1733, `reinfocovid` 1611…) là où les voies honnêtes plafonnaient vers
  //   930. C'est ce qui a fixé `EGALISATION` à 200 — pas son inscription ici.
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
 * ★ Les ficelles qui RÉÉCRIVENT — leur peine est un forfait, par emploi.
 *
 * Ni l'unité de `VALEUR_JETEE` (rien ne disparaît) ni celle de la dilution
 * (rien n'est additionné) : le geste ne se décompose pas, il se prend ou ne se
 * prend pas. On compte donc les fois où on l'a pris.
 */
const REECRITURES = new Set(['ecritureEnLettres']);

/**
 * ★ CE QUI ABSORBE PAR ADDITION — par identifiant d'opérateur, ficelle ou non.
 *
 * Ce sont les deux gestes dont l'auteur ait dit que le malus devait fondre avec
 * le nombre d'additions (voir `dilution`). Ils ne jettent rien : chaque chiffre
 * entre dans une somme et ressort dedans.
 *
 * ★ **La table est distincte de `FICELLES`, et depuis peu.** Les deux se
 * confondaient tant que les deux seuls absorbeurs étaient aussi les deux
 * dernières ficelles. `m.redecoupageChoisi` est sorti des ficelles sur
 * arbitrage de l'auteur ; son geste, lui, n'a pas changé d'un pouce et se paie
 * toujours. Séparer les deux tables est la seule façon d'écrire cela sans
 * mentir d'un côté ou de l'autre — c'est déjà ce qui a été fait pour
 * `A_MERITER_SA_PLACE`, et pour la même raison.
 */
const ABSORBENT_PAR_ADDITION = Object.freeze({
  'm.additionSelective': 'additionSelective',
  'm.redecoupageChoisi': 'redecoupage',
});

/**
 * ★ **LA DÉGRESSIVITÉ DU REDÉCOUPAGE — le prix suit la longueur de la ligne.**
 *
 * > « Au lieu d'un seuil unique `CHIFFRES_REDECOUPE_MIN` je voudrais un malus
 * >   dégressif : à 2 chiffres, malus maximum ; à 20 chiffres, malus
 * >   négligeable ; à 10, malus acceptable. » (l'auteur)
 *
 * ★ **POURQUOI LA LONGUEUR, ET PAS AUTRE CHOSE.** Redécouper, c'est choisir où
 *   poser les coupes pour que les paquets tombent sur 6. Sur une ligne de deux
 *   chiffres, il n'y a qu'une coupe possible : le choix EST le résultat, et le
 *   spectateur voit qu'on a décidé de l'arrivée. Sur vingt chiffres, il y a
 *   des milliers de découpes et personne ne peut les tenir en tête — le geste
 *   redevient ce qu'il prétend être, une lecture parmi d'autres. Ce n'est pas
 *   la même ruse à deux échelles, c'est deux gestes que la longueur sépare.
 *
 * ★ **UNE DÉCROISSANCE GÉOMÉTRIQUE, PAS TROIS PALIERS.** Trois valeurs données,
 *   trois paliers auraient suffi — et auraient créé deux falaises où un chiffre
 *   de plus change brutalement le classement. Un facteur constant par chiffre
 *   passe par les trois points demandés sans discontinuité :
 *
 *       2 chiffres → 1 000 ‰   (plein tarif, le maximum demandé)
 *      10 chiffres →   291 ‰   (« acceptable »)
 *      20 chiffres →    62 ‰   (« négligeable »)
 *
 *   Le rapport 6/7 n'est pas choisi pour lui-même : c'est la fraction simple
 *   qui traverse au plus près les trois ancrages de l'auteur.
 *
 * ★ Arithmétique ENTIÈRE et boucle bornée par la longueur — pas de `Math.pow`,
 *   donc pas de flottant, donc reproductible partout (§4.4).
 *
 * @param {number} chiffres  le nombre de chiffres de la ligne AVANT le geste
 * @returns {number} un facteur en millièmes, de 1 000 à ~0
 */
export function degressiviteRedecoupage(chiffres) {
  const n = chiffres | 0;
  let f = 1000;
  for (let i = PLEIN_TARIF_REDECOUPE; i < n; i++) f = Math.floor((f * 6) / 7);
  return f;
}

/** En deçà, le redécoupage est au maximum : c'est le plus court sur quoi il opère. */
const PLEIN_TARIF_REDECOUPE = 2;

/**
 * ★ Les ficelles qui ÉCARTENT, par identifiant d'opérateur — publié pour
 *   `score.js`, qui en a besoin et ne doit pas en tenir une seconde liste.
 *
 * Le rendement (`score.js › rendementSix`) lit, POUR CELLES-LÀ SEULEMENT, le
 * vecteur le plus large du chemin plutôt que le dernier : les noter sur ce
 * qu'il reste les récompenserait d'avoir jeté davantage. Le raisonnement
 * s'arrête là où l'écartement s'arrête — un geste qui ABSORBE (`mad`, ficelle,
 * `mrd`, qui ne l'est plus) ne jette rien, et sa ligne momentanément élargie n'est pas
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
 * ★ **TOUT CE QUI RÉTRÉCIT UN VECTEUR EN ÉCARTANT** — ficelles comprises, mais
 *   pas seulement.
 *
 * Le rendement (`score.js › rendementSix`) mesure la part de ce qu'on a calculé
 * qui vaut la cible. Restait à dire sur QUEL vecteur : le dernier, ou le plus
 * large que le chemin ait montré. Le dernier l'emportait, **sauf pour les trois
 * ficelles** — et `m36` en profitait, au motif qu'il « rétrécit honnêtement,
 * après avoir constaté un 666 déjà écrit ».
 *
 * ⚠️ **MESURÉ, cette exemption inversait exactement l'ordre que l'auteur
 * voulait.** Sur `Macron`, `tca+mtal+mt9+mpf` et `tca+mtal+mt9+m36` partent du
 * MÊME vecteur `[2,2,6,6,6,7]` et rendent le MÊME `[6,6,6]` — même geste, même
 * matière, même résultat. Le rendement disait pourtant 500 à l'une et **1 000**
 * à l'autre, et ce seul écart valait 1 700 points de score.
 *
 * « `m36` doit être une alternative de secours à `mpf`, et non l'inverse »
 * (l'auteur). L'exemption est donc levée : ce qui écarte se fait noter sur ce
 * qu'il a écarté, quel que soit son nom. `m.retirerZeros` entre par la même
 * porte et pour la même raison — il tronque, lui aussi.
 *
 * ⚠️ Ce qui ABSORBE n'y entre pas, et c'est la ligne de partage de tout le
 * fichier : `m.compterLesChiffres` remplace `6 6 6` par « 3 6 », la ligne
 * raccourcit mais les trois 6 sont ENTIÈREMENT dans le « 3 ». Agréger n'est pas
 * écarter.
 */
export const OPERATEURS_QUI_ECARTENT = Object.freeze(new Set([
  ...FICELLES_QUI_ECARTENT,
  // ⚠️ `m.plusFrequent` est ici bien qu'elle ne soit plus une ficelle : ce que
  //    cette liste nomme, c'est le GESTE — retirer des valeurs de la ligne —, et
  //    non le statut de celui qui le fait.
  'm.plusFrequent',
  'm.troisSixDAffilee',
  'm.retirerZeros',
]));

/**
 * ★ **QUI ÉNONCE LA RÈGLE DE MAJORITÉ, ET QUI S'EN SERT SANS LE DIRE.**
 *
 * Le geste est le même — garder ce qui est le plus nombreux, écarter le reste —
 * et sur `[2,2,6,6,6,7]` `m.plusFrequent` et `m.troisSixDAffilee` rendent tous
 * deux `[6,6,6]`. Ce qu'ils DISENT diffère, et c'est cela qui se paie : « le
 * plus fréquent l'emporte » est un argument, vérifiable en comptant, et qui
 * vaudrait pour n'importe quelle valeur ; « il y a trois 6 d'affilée, on garde
 * ça » est la conclusion prise pour prémisse.
 *
 * Celui qui énonce paie `MAJORITE` (180), celui qui se tait `MAJORITE_TACITE`
 * (260). C'est ce qui fait de `m36` une alternative de SECOURS à `mpf`, et non
 * l'inverse — la consigne de l'auteur, écrite là où elle s'applique.
 */
const ENONCENT_LA_MAJORITE = Object.freeze(new Set(['m.plusFrequent']));

/**
 * Les opérateurs qui UNIFORMISENT une ligne — ils rendent autant de valeurs
 * qu'ils en reçoivent, mais toutes égales. Nommés plutôt que devinés : deviner
 * demanderait de comparer les vecteurs à chaque étape et frapperait au passage
 * une réduction qui tombe juste par hasard (`mrn` sur `[9, 18, 27]`).
 */
export const UNIFORMISENT = Object.freeze(new Set(['m.egalisation']));

/**
 * ★ **CE QUI DOIT MÉRITER SA PLACE DANS LE FAISCEAU** — et ce n'est PAS la même
 *   question que « est-ce une ficelle ».
 *
 * `assemblage.js › vecteursDeSix` garde un nombre borné de vecteurs par
 * fragment, et il les classe d'abord sur le compte de 6. Certains gestes rendent
 * ce classement inéquitable : ils produisent des 6 EN MASSE par construction, si
 * bien qu'ils occupent toutes les places avant qu'aucun critère de qualité n'ait
 * eu à se prononcer. Le plafond consultait `FICELLES` pour les reconnaître — et
 * confondait ainsi deux choses sans rapport.
 *
 * ★ MESURÉ, le jour où `m.egalisation` est sortie des ficelles sur arbitrage de
 *   l'auteur : elle a repris SIX têtes de liste sur huit. Et le palier
 *   `EGALISATION` n'y peut rien — balayé de 200 à 1 500, l'élégance de ces
 *   voies tombe à zéro et elles mènent toujours, parce que ce qui les porte est
 *   le SCORE, c'est-à-dire la quantité. Le plafond du faisceau était le seul
 *   levier qui ait jamais agi sur elle.
 *
 * La table est donc scindée. `FICELLES` reste ce qu'elle dit : un jugement sur
 * le geste, qui décide de paliers d'élégance. Celle-ci dit autre chose, et de
 * structurel — « à quantité comparable, cette voie-là ne prouve pas autant » —,
 * et c'est elle que le faisceau consulte. Une ficelle y est par définition ;
 * l'égalisation y est parce qu'elle réécrit la ligne ENTIÈRE d'un geste, ce qui
 * n'est pas une performance mais un changement de sujet.
 *
 * ★ **Et le redécoupage y reste alors qu'il vient de quitter les ficelles.**
 *   C'est le cas d'école qui justifie la scission : sa découpe est CHOISIE pour
 *   tomber sur 6 ou sur 9 le plus souvent possible — il n'y a pas, dans tout le
 *   catalogue, de geste qui produise plus de 6 par construction. Le retirer
 *   d'ici en même temps que des ficelles lui aurait rendu, d'un seul mouvement,
 *   le plafond du faisceau — c'est-à-dire le seul levier qui ait jamais agi sur
 *   ce genre de voie. L'auteur a demandé qu'il cesse d'être traité en ficelle,
 *   pas qu'il cesse de mériter sa place.
 */
export const A_MERITER_SA_PLACE = Object.freeze(new Set([
  ...Object.keys(FICELLES),
  ...UNIFORMISENT,
  'm.redecoupageChoisi',
]));

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
 * ★ CE QUI RESTE ÉTAIT-IL LA MAJORITÉ DE CE QU'ON AVAIT ?
 *
 * Vrai quand le vecteur d'arrivée ne contient qu'une seule valeur distincte et
 * que cette valeur était **strictement la plus fréquente** du vecteur de départ.
 * `[6,6,6,7,3,6] → [6,6,6]` : oui, quatre 6 contre un 7 et un 3. `[6,4,6,3,6] →
 * [6,6,6]` : oui également, trois 6 contre un 4 et un 3. `[6,6,4,4] → [6,6]` :
 * non — il y a autant de 4 que de 6, et « la majorité » ne veut plus rien dire.
 *
 * ⚠️ On ne demande PAS que la valeur gardée soit la cible. La règle que l'auteur
 * autorise est « la majorité l'emporte », pas « les 6 l'emportent » : elle vaut
 * pour n'importe quelle valeur, sans quoi ce serait la conclusion qui
 * justifierait la prémisse.
 */
function majoriteTacite(avant, apres) {
  if (!Array.isArray(apres.valeur) || apres.valeur.length === 0) return false;
  const garde = apres.valeur[0];
  for (const v of apres.valeur) if (v !== garde) return false;
  const compte = new Map();
  for (const v of avant.valeur) compte.set(v, (compte.get(v) || 0) + 1);
  const mien = compte.get(garde) || 0;
  if (mien === 0) return false;
  for (const [v, n] of compte) if (v !== garde && n >= mien) return false;
  return true;
}

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

/**
 * ★ Le mot tel que le DICTIONNAIRE le range — copie réécrite, et assumée.
 *
 * `filtres.js › traduire` cherche `sansAccents(valeur).toLowerCase()`, donc
 * `Hope`, `hope` et `hôpe` y désignent la même entrée. Pour savoir si deux
 * étapes ont traduit LE MÊME MOT, il faut replier de la même façon.
 *
 * ⚠️ C'est une copie, et le contrat l'impose : aucun module de `src/recherche/`
 *   n'importe `src/moteur/` (CONTRACTS §2.2) — la recherche code contre le
 *   DESCRIPTEUR d'opérateur, pas contre les entrailles d'un autre agent. Même
 *   discipline que « la règle réécrite » de `classeDeTransformation`, et même
 *   garde-fou : un test croise les deux (`tests/elegance.test.js`).
 */
function replierPourLeDictionnaire(mot) {
  return String(mot).normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .toLowerCase();
}

/**
 * ★ **DEUX CONVENTIONS QUI SE CONTREDISENT, DANS UNE MÊME VOIE.**
 *
 * Certains opérateurs mesurent la MÊME chose selon deux conventions également
 * défendables — et c'est précisément ce qui les rend dangereux ensemble. La
 * rangée d'une touche vaut 1, 2, 3 si l'on ne compte que les lettres, et 2, 3,
 * 4 si l'on compte la rangée des chiffres que le clavier montre. Aucune n'est
 * plus vraie que l'autre.
 *
 * « Tu peux choisir l'une ou l'autre selon ce qui donne le meilleur score, mais
 * jamais mixer les deux dans une même voie : ce serait une ficelle bien trop
 * visible » (l'auteur). C'est exact, et c'est l'inverse d'un malus : choisir sa
 * convention est libre, en changer EN COURS DE ROUTE ne l'est pas. Une
 * démonstration qui compte les rangées d'une façon ici et d'une autre là ne
 * mesure plus rien — elle cherche le chiffre qui l'arrange.
 *
 * ★ La convention est DÉCLARÉE par l'opérateur (champ `convention`), jamais
 *   devinée d'un code : deux opérateurs qui se contredisent le disent
 *   eux-mêmes, et l'un qui arriverait demain n'aurait qu'à se nommer.
 *
 * @param {Array<{chemin:Object}>} parts
 * @returns {number} le nombre de conventions surnuméraires — 0 quand la voie
 *   n'en change jamais.
 */
export function compterConventionsMelangees(parts) {
  const familles = new Map();
  for (const p of parts || []) {
    for (const op of (p && p.chemin && p.chemin.ops) || []) {
      const famille = familleDeConvention(op);
      if (!famille) continue;
      if (!familles.has(famille)) familles.set(famille, new Set());
      familles.get(famille).add(op.convention);
    }
  }
  let n = 0;
  for (const [, vues] of familles) n += Math.max(0, vues.size - 1);
  return n;
}

/**
 * La FAMILLE de convention d'un opérateur — ce qui précède le « : ».
 *
 * `clavier:3rangees` et `clavier:4rangees` sont deux conventions de la famille
 * « clavier » : elles mesurent la même chose et se contredisent. Deux familles
 * différentes ne se contredisent jamais — elles ne parlent pas de la même
 * mesure.
 *
 * ★ EXPORTÉE parce que deux endroits la lisent, et qu'ils ne doivent pas
 *   diverger : le barème, qui COMPTE le mélange après coup, et
 *   `bfs.js › etendreSi`, qui le REFUSE pendant qu'il explore. La règle est un
 *   interdit — « jamais mixer les deux dans une même voie » —, donc c'est le
 *   second qui fait le travail ; le premier est le filet qui dirait qu'il a
 *   fui.
 *
 * @returns {string|null}
 */
export function familleDeConvention(op) {
  if (!op || typeof op.convention !== 'string' || !op.convention) return null;
  const i = op.convention.indexOf(':');
  return i < 0 ? op.convention : op.convention.slice(0, i);
}

/**
 * ★ **COMBIEN DE FOIS UN MÊME MOT EST TRADUIT DE DEUX FAÇONS** dans une voie.
 *
 * L'unité de `BAREME.TRADUCTION_DIVERGENTE` — voir ce palier pour le pourquoi.
 * Compté par acception surnuméraire ET par mot : deux lectures d'un mot coûtent
 * une fois, trois en coûtent deux, et deux mots différents lus chacun à leur
 * façon ne coûtent rien.
 *
 * ★ EXPORTÉE PARCE QUE DEUX ENDROITS LA POSENT, et qu'ils ne doivent pas
 *   diverger : le barème, qui la FACTURE après coup, et `assemblage.js ›
 *   reduireLeSurplus`, qui l'INTERDIT pendant qu'il choisit. « Mieux vaut un
 *   peu de déchet que ça » (l'auteur) — pour que la seconde puisse obéir, il
 *   faut qu'elle compte exactement ce que la première facture.
 *
 * @param {Array<{chemin:Object}>} parts
 * @returns {number}
 */
export function compterTraductionsDivergentes(parts) {
  // L'acception est PUBLIÉE par l'opérateur (`filtres.js`, champ `acception`) :
  // on ne la déduit pas du code. Le SENS de la traduction entre dans la clé —
  // traduire un mot vers le français ici et vers l'anglais là n'est pas deux
  // lectures d'une même traduction, c'est deux traductions.
  //
  // ⚠️ Ce qu'on lit est le texte D'ENTRÉE de l'étape, pas la portée : une
  //   traduction peut suivre un filtre qui a déjà changé le mot, et c'est bien
  //   ce mot-là qui est traduit.
  const lectures = new Map();
  for (const p of parts || []) {
    const ops = (p && p.chemin && p.chemin.ops) || [];
    const etats = (p && p.chemin && p.chemin.etats) || [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (!op || !Number.isFinite(op.acception)) continue;
      const entree = etats[i];
      if (!entree || typeof entree.valeur !== 'string') continue;
      const sens = String(op.code).replace(/\d+$/, '');
      const cle = `${sens}\u0000${replierPourLeDictionnaire(entree.valeur)}`;
      if (!lectures.has(cle)) lectures.set(cle, new Set());
      lectures.get(cle).add(op.acception);
    }
  }
  let n = 0;
  for (const [, vues] of lectures) n += Math.max(0, vues.size - 1);
  return n;
}

/**
 * ★ Les conversions lettre → lettre — RECONNUES À LEUR RÉGLETTE, plus nommées.
 *
 * Elles l'ont été, et la liste disait « trois, et le catalogue n'en porte pas
 * d'autre » : `f.atbash`, `f.rot13`, `f.leet`. C'était vrai le jour où elle a
 * été écrite. Les vingt-quatre autres décalages de César sont entrés depuis
 * sous `f.cesar1`…`f.cesar25`, et la liste ne les a jamais vus : `fr15` ne
 * payait RIEN là où `fr13` payait 40, pour le geste identique. On mesurait donc
 * un alphabet gratuit — vingt-cinq réglettes à essayer sans frais, ce qui suffit
 * à faire tomber juste à peu près n'importe quelle propriété globale de la
 * ligne. C'est ce qui portait `fr15+tca+m14+meg` en tête sur `Macron`.
 *
 * ★ La réglette EST le critère, et ce n'est pas un raccourci : `spec.table` est
 * exactement ce que la scène affiche sous l'étape (voir `outilDuChiffrement`,
 * `filtres.js`) — une lettre en face d'une lettre. Compter ce qui est montré,
 * plutôt qu'une liste recopiée qui peut diverger, c'est la doctrine du projet
 * (CONTRACTS) et c'est ce qui empêche cette divergence-ci de se reformer.
 */
const porteUneReglette = (op) => !!(op && op.table);

/**
 * ★ CE QUI ARRONDIT — la moyenne, et la médiane quand ils sont deux au centre.
 *
 * La liste disait « le seul opérateur qui arrondisse », et c'était vrai le jour
 * où elle a été écrite. `c.mediane` divise elle aussi par deux dès que le compte
 * est pair, et sa division ne tombe pas toujours juste.
 *
 * ★ **Mais elle n'arrondit pas sur les MÊMES nombres.** La moyenne divise toute
 * la ligne ; la médiane ne divise que les un ou deux qui restent au centre. Ce
 * sur quoi l'arrondi se mesure est donc PUBLIÉ par l'opérateur (`arrondiSur`) —
 * même doctrine que le décalage d'un César ou les additions d'une triche : le
 * barème lit ce que l'opérateur déclare, il ne le devine pas de son vecteur
 * d'entrée. Sans ce champ, on retombe sur la ligne entière, c'est-à-dire sur la
 * lecture de la moyenne — ce qui est exact pour elle et pour elle seule.
 */
const ARRONDISSENT = new Set(['c.moyenne', 'c.moyenneDivisee', 'c.mediane']);

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
  if (ARRONDISSENT.has(op.id)) return 'moyenne';
  if (MIN_MAX.has(op.id)) return 'minmax';
  if (porteUneReglette(op)) return 'lettres';
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
    majoriteTacite: 0,
    egalisees: 0,
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
    // ★ le chiffre réécrit en toutes lettres — un forfait, par emploi.
    ecritureEnLettres: 0,
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
      else if (classe === 'moyenne') {
        b.arrondi += amplitudeArrondi(typeof op.arrondiSur === 'function'
          ? op.arrondiSur(avant.valeur) : avant.valeur);
      }
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

    // ── ★ LES FICELLES — comptées ICI, et NULLE PART AILLEURS.
    //
    // Chacune se paie à son propre tarif, et ce tarif REMPLACE `VALEUR_JETEE`
    // au lieu de s'y ajouter : c'est ce qui rend vraie la consigne de l'auteur,
    // « moins bas que la suppression arbitraire de ce qui n'est pas 6 ». Les
    // compter aux deux endroits ferait de la ficelle une chose plus chère que
    // le tri qu'elle est censée valoir mieux que.
    const ficelle = op.id && Object.prototype.hasOwnProperty.call(FICELLES, op.id)
      ? FICELLES[op.id] : null;
    // …et l'absorption par addition se compte que le geste soit une ficelle ou
    // non : `mad` en est une, `mrd` n'en est plus une, tous deux additionnent.
    const absorption = op.id
      && Object.prototype.hasOwnProperty.call(ABSORBENT_PAR_ADDITION, op.id)
      ? ABSORBENT_PAR_ADDITION[op.id] : null;
    if (ECARTEMENTS.has(ficelle)) {
      // Ce que la ruse ÉCARTE, à son tarif. Même unité que `VALEUR_JETEE` :
      // une valeur calculée, montrée, puis écartée.
      b[ficelle] += Math.max(0, avant.valeur.length - apres.valeur.length);
    } else if (REECRITURES.has(ficelle)) {
      // Ce que la ruse RÉÉCRIT : un forfait, une fois par emploi. Il n'y a
      // rien à compter d'autre — le geste ne se fait pas à moitié.
      b[ficelle] += 1;
    } else if (absorption) {
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
      const poids = typeof op.additions === 'function'
        ? dilution(op.additions(avant.valeur)) : absorbes * 1000;
      // ★ Et le redécoupage, LUI SEUL, s'allège avec la longueur de la ligne :
      //   voir `degressiviteRedecoupage`. L'addition sélective garde son tarif
      //   plein — l'auteur n'a rien demandé pour elle, et son geste ne change
      //   pas de nature avec la longueur : elle additionne des suites qui font
      //   6, ce qui se vérifie d'un coup d'œil quelle que soit la ligne.
      b[absorption] += absorption === 'redecoupage'
        ? Math.floor((poids * degressiviteRedecoupage(chiffres)) / 1000)
        : poids;
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
    if (!ficelle && !absorption && !agrege && avant.type === 'NUMS' && apres.type === 'NUMS'
      && apres.valeur.length < avant.valeur.length) {
      const jetees = avant.valeur.length - apres.valeur.length;
      // ★ **MAIS TOUT REJET N'A PAS LA MÊME EXCUSE.**
      //
      // « `m36` semble privilégié à effacer le reste sous couvert de "majorité
      // signifiante, minorité négligeable", plutôt que juste au prétexte que le
      // motif est présent. Ajuste les pondérations : 3×6, 2×7, 1×4 — les 6 sont
      // majoritaires, donc cette règle est utilisable » (l'auteur).
      //
      // Le geste est le même — on ne garde qu'une partie du vecteur —, mais ce
      // qu'on peut en DIRE ne l'est pas. « Je garde les 6 parce qu'ils sont les
      // plus nombreux » est un argument ; « je garde les 6 parce que j'en vois
      // trois d'affilée » n'en est pas un, c'est la conclusion prise pour
      // prémisse. Quand ce qui reste est la valeur la plus fréquente de ce qu'on
      // avait, le rejet se paie donc au tarif de la majorité (`MAJORITE`) et non
      // à celui du gaspillage (`VALEUR_JETEE`).
      //
      // ⚠️ Le tarif est PLUS CHER que celui de `m.plusFrequent`, qui, lui,
      //    ÉNONCE la règle au lieu de s'en servir en sous-main — voir
      //    `MAJORITE_TACITE`. On avait d'abord parié que la dilution des
      //    ficelles suffirait à les départager ; mesuré, elle ne s'applique pas
      //    ici et les deux voies sortaient à égalité parfaite. Il a fallu
      //    l'écrire.
      if (majoriteTacite(avant, apres)) {
        // ★ Énoncée ou tue : deux tarifs, un seul geste (voir
        //   `ENONCENT_LA_MAJORITE`).
        if (ENONCENT_LA_MAJORITE.has(op.id)) b.majorite += jetees;
        else b.majoriteTacite += jetees;
      }
      else b.valeursJetees += jetees;
    }
    // ★ L'UNIFORMISATION — autant de valeurs, mais toutes la même. Elle ne
    //   jette rien, donc aucun compteur de rejet ne la voyait ; ce qu'elle
    //   coûte, c'est que la ligne cesse de dire quoi que ce soit du mot lu.
    if (UNIFORMISENT.has(op.id) && avant.type === 'NUMS' && apres.type === 'NUMS') {
      let reecrites = 0;
      for (let k = 0; k < apres.valeur.length; k++) {
        if (apres.valeur[k] !== avant.valeur[k]) reecrites++;
      }
      b.egalisees += reecrites;
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

  // ★ `signifiants` / `lus` : la PROPORTION, et pas seulement le compte. Voir
  //   `PORTEE_IGNOREE` — ignorer six lettres sur douze n'est pas le même geste
  //   qu'en ignorer six sur deux cents.
  const a = { alnum: 0, bloc: 0, blocCourt: 0, ponctuation: 0, signifiants: 0, lus: 0, opaque };
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
    if (masque && !masque[i]) continue; // gratuit : ni compté ni reproché
    if (!estAlnum(caracteres[i])) { if (!vus[i]) a.ponctuation++; continue; }
    // ★ Le dénominateur de la proportion : la matière que l'auteur a tapée et
    //   que la démonstration AURAIT PU lire. La ponctuation n'en fait pas
    //   partie — personne ne reproche à une méthode d'ignorer un point.
    a.signifiants++;
    if (vus[i]) { a.lus++; continue; }
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
/**
 * ★ CE QU'UN BILAN DE CHEMIN DIT DU **PROCESSUS** — par opposition à ce qu'il
 * dit de la GÉOMÉTRIE du vecteur d'arrivée.
 *
 * La liste sert à l'étage des RETOUCHES, et à lui seul : une retouche a un
 * chemin, donc un processus, mais elle finit sur du TEXTE et n'a aucun vecteur.
 * Ses `six`, sa `largeur`, ses triptyques et sa casse n'ont pas de sens, et les
 * additionner à ceux des parts crédierait une récolte que le verdict ne montre
 * pas. Ce qui reste — ce qu'on a FAIT, et à quel prix — s'additionne, lui, sans
 * réserve : une transformation est une transformation, où qu'elle ait lieu.
 *
 * ⚠️ Écrite en clair plutôt que déduite de `Object.keys` : un compteur ajouté
 * demain à `bilanChemin` doit être RANGÉ d'un côté ou de l'autre par quelqu'un
 * qui sait ce qu'il mesure, pas versé au processus par défaut.
 */
const POSTES_DU_PROCESSUS = Object.freeze([
  'transformations', 'additionsChiffres', 'additionsNombres', 'additionsEnChaine',
  'arrondi', 'minMax', 'lettreVersLettre', 'sixDetruits', 'majoriteTacite',
  'valeursJetees', 'majorite', 'decimation', 'additionSelective', 'redecoupage',
  'effacementSansMotif', 'rearrangement',
]);

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
    majoriteTacite: 0,
    egalisees: 0,
    valeursJetees: 0,
    filtresSelectifs: 0,
    reglagesEnTrop: 0,
    traductionsDivergentes: 0,
    retours: 0,
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
    // ★ le chiffre réécrit en toutes lettres — un forfait, par emploi.
    ecritureEnLettres: 0,
    // ★ ce qu'un tri croissant déplace, valeur par valeur.
    rearrangement: 0,
    // ★ combien de portées ont été RÉÉCRITES avant que le reste ne les lise.
    retouches: 0,
  };

  // ★ Où s'arrête la matière signifiante de la saisie — c'est ce qui définit
  //   « le dernier mot ». Le masque de `zonesSignifiantes` exclut déjà le `/`
  //   final d'une URL : finir sur le dernier mot d'une adresse ne doit pas être
  //   refusé au motif qu'une barre oblique traîne derrière.
  const finSignifiante = finDesSignifiants(ctx);

  // ★ LE FILTRAGE EST-IL LE MÊME PARTOUT ? — voir `FILTRE_SELECTIF`.
  //   La signature d'une part est la suite de ses filtres, dans l'ordre. On
  //   compte les parts qui s'écartent de la signature MAJORITAIRE : c'est
  //   « appliquer la même méthode à l'ensemble » qui est gratuit, et s'en
  //   écarter qui se paie — pas l'inverse.
  // ★ LES RETOURS — voir `RETOUR_SUR_UNE_ETAPE`. On lit les programmes ENTIERS
  //   des parts, dans l'ordre où l'approche les nomme, et l'on compte ce que les
  //   changements ont de superflu.
  const programmes = parts.map((p) => (p.chemin && p.chemin.ops ? p.chemin.ops : [])
    .map((op) => op.code).join('+'));
  if (programmes.length > 1) {
    let changements = 0;
    for (let i = 1; i < programmes.length; i++) if (programmes[i] !== programmes[i - 1]) changements++;
    const distincts = new Set(programmes).size;
    b.retours = Math.max(0, changements - (distincts - 1));
  }

  const signatures = parts.map((p) => (p.chemin && p.chemin.ops ? p.chemin.ops : [])
    .filter((op) => op.famille === 'filtre').map((op) => op.code).join('+'));
  if (signatures.length > 1) {
    const compte = new Map();
    for (const sig of signatures) compte.set(sig, (compte.get(sig) || 0) + 1);
    let dominante = 0;
    for (const [, n] of compte) if (n > dominante) dominante = n;
    b.filtresSelectifs = signatures.length - dominante;
  }

  // ★ LES RÉGLAGES D'UN MÊME OUTIL, comptés par famille d'outil.
  //
  //   Le décalage est PUBLIÉ par l'opérateur (`filtres.js`, champ `decalage`) :
  //   on ne le déduit ni du code ni du libellé, on le lit. Un outil réglable
  //   dont deux réglages différents servent dans la même voie coûte un
  //   surnuméraire par réglage au-delà du premier.
  const reglages = new Map();
  for (const p of parts) {
    for (const op of (p.chemin && p.chemin.ops) || []) {
      if (!Number.isFinite(op.decalage)) continue;
      // La famille d'outil, c'est ce qui reste du code sans son réglage :
      // `fr14` et `fr9` sont deux réglages de `fr`.
      //
      // ★ …sauf quand l'opérateur la PUBLIE (`familleOutil`), et il le fait dès
      //   que le code ne la dit pas. `cal` et `cali` sont les deux phases d'une
      //   même alternance — `+-+-` et `-+-+` —, mais `cali` ne se lit pas comme
      //   « `cal` réglé sur 1 » : son réglage est dans les LETTRES du code, pas
      //   dans un nombre en fin de mot. Deviner l'aurait manqué en silence, ce
      //   qui est précisément le défaut que ce poste existe pour couvrir.
      const outil = typeof op.familleOutil === 'string' && op.familleOutil
        ? op.familleOutil : String(op.code).replace(/\d+$/, '');
      if (!reglages.has(outil)) reglages.set(outil, new Set());
      reglages.get(outil).add(op.decalage);
    }
  }
  for (const [, vus] of reglages) b.reglagesEnTrop += Math.max(0, vus.size - 1);

  // ★ LE MÊME MOT, TRADUIT DE DEUX FAÇONS — voir `BAREME.TRADUCTION_DIVERGENTE`.
  //
  //   L'acception est PUBLIÉE par l'opérateur (`filtres.js`, champ `acception`),
  //   comme le décalage juste au-dessus : on ne la déduit pas du code. Et la clé
  //   est le MOT, replié comme le dictionnaire le replie — sans accents, en bas
  //   de casse (`traduire`) —, de sorte que « Hope » et « hope » soient bien le
  //   même mot. Le sens de la traduction entre dans la clé : traduire un mot
  //   vers le français ici et vers l'anglais là n'est pas deux lectures d'une
  //   même traduction, c'est deux traductions.
  //
  //   ⚠️ Ce qu'on lit est le texte D'ENTRÉE de l'étape, pas la portée : une
  //     traduction peut suivre un filtre qui a déjà changé le mot, et c'est bien
  //     ce mot-là qui est traduit.
  b.traductionsDivergentes += compterTraductionsDivergentes(parts);

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
    b.majoriteTacite += bc.majoriteTacite;
    b.egalisees += bc.egalisees;
    b.valeursJetees += bc.valeursJetees;
    b.majorite += bc.majorite;
    b.decimation += bc.decimation;
    b.additionSelective += bc.additionSelective;
    b.redecoupage += bc.redecoupage;
    b.effacementSansMotif += bc.effacementSansMotif;
    b.ecritureEnLettres += bc.ecritureEnLettres;
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
  // ★ Le reliquat du verdict est compté À PART de ce qu'on jette en route, et
  //   séparé en deux : les cibles qu'on avait et qu'on ne montre pas, et le
  //   reste du vecteur. Les deux ont leur tarif (voir `RELIQUAT_DE_CIBLE`).
  b.reliquatDeCible = Math.max(0, b.six - gardees);
  b.reliquatHorsCible = Math.max(0, b.montrees - b.six);
  b.jeteesAuTri = b.reliquatDeCible + b.reliquatHorsCible;
  b.gardees = gardees;
  b.series = series;

  // ── ★ L'ÉTAGE AMONT : les RETOUCHES — voir `BAREME.RETOUCHE`.
  //
  //    Elles voyagent À CÔTÉ des parts et jamais dedans (`index.js › rejouer`
  //    dit pourquoi : les y verser fabriquerait une PARTITION là où il n'y a
  //    qu'une préparation). Le barème ne les voyait donc pas du tout, et un
  //    étage entier ne coûtait rien. Il coûte maintenant DEUX choses, et deux
  //    seulement : le prix ORDINAIRE de ses gestes, ci-dessous, et le palier
  //    propre à l'étage, dans `detailDuCredit`.
  //
  // ★ **On ne retient d'une retouche que le PROCESSUS, jamais la GÉOMÉTRIE.**
  //   Une retouche finit sur du TEXTE — `rejouer` refuse le lien si ce n'est pas
  //   le cas —, elle n'a donc pas de vecteur : ses 6, sa largeur, ses triptyques
  //   et sa casse n'existent pas, et les verser dans le bilan y fabriquerait une
  //   récolte que le verdict ne montre pas. Les postes retenus sont listés en
  //   clair (`POSTES_DU_PROCESSUS`) plutôt que copiés en bloc, pour que
  //   l'exclusion soit une décision lisible et non un oubli.
  const lesRetouches = (approche && approche.retouches) || [];
  b.retouches = lesRetouches.length;
  for (const r of lesRetouches) {
    const bc = bilanChemin(r.chemin, cbl);
    for (const poste of POSTES_DU_PROCESSUS) b[poste] += bc[poste];
  }

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
 * ★ **Chaque ligne porte désormais son SENS et sa FAMILLE**, lus dans `NATURE`
 * et non plus écrits à la main dans le calcul. Une ligne se lit donc seule :
 * « quel poste, combien de fois, bonus ou malus, quel mérite ». C'est ce qu'il
 * faut à une page de débogage pour distinguer ce qui monte de ce qui descend
 * sans réimplémenter le barème, et c'est ce qu'il faut aux régimes de classement
 * pour repondérer une famille sans repondérer l'autre.
 *
 * ★ **L'AMPLEUR et les POINTS sont deux choses.** `ampleur` est la valeur
 * absolue de ce que le poste pèse, `points` est ce qu'il ajoute au crédit —
 * `sens × ampleur`, une fois la repondération faite. Séparer les deux évite
 * l'ambiguïté d'un nombre négatif qu'on ne sait pas lire : −430, est-ce un malus
 * de 430 ou un bonus de −430 ?
 *
 * @param {Object} b      un bilan de `bilanApproche`
 * @param {Object} [poids] pondération par famille, en pour-mille — `POIDS_PLEIN`
 *                         par défaut. Voir `score.js › POIDS_DES_REGIMES`.
 * @returns {Array<{poste:string, cle:string, quantite:number, sens:number,
 *                  famille:string, ampleur:number, points:number}>}
 */
export function detailDuCredit(b, poids) {
  const B = BAREME;
  const a = b.abandons || { alnum: 0, bloc: 0, blocCourt: 0, ponctuation: 0 };
  // ★ Ce qu'on n'a pas lu, hors l'exception des blocs courts (voir le palier).
  const ignores = (a.alnum || 0) + (a.bloc || 0);
  const LSERIE = b.longueurSerie || SERIE;
  const surplus = Math.min(Math.max(0, b.six - LSERIE), B.SIX_SURNUMERAIRE_MAX);
  const socle = B.SOCLE_TRANSFORMATIONS * Math.max(1, b.parts || 1);
  // ★ Les additions en chaîne paient le prix plein d'une transformation ICI —
  //   `b.transformations` ne les compte pas, pour ne pas franchir le plancher
  //   à zéro — et la remise leur est rendue plus bas, dans « ce qui se gagne ».
  const enTrop = Math.max(0, b.transformations - socle) + (b.additionsEnChaine || 0);
  const lignes = [
    ['socle', 'SOCLE', 1, B.SOCLE],
    // ── ce qui se gagne
    ['triptyque contigu', 'TRIPTYQUE_CONTIGU', b.triptyquesContigus,
      B.TRIPTYQUE_CONTIGU * b.triptyquesContigus],
    ['triptyque répété (même vecteur)', 'TRIPTYQUE_REPETE', b.triptyquesRepetes || 0,
      B.TRIPTYQUE_REPETE * (b.triptyquesRepetes || 0)],
    [b.finirPar666 ? 'couronnement tôt (ou final)' : 'couronnement tôt', 'COURONNEMENT_TOT',
      b.couronnementTot, fraction(B.COURONNEMENT_TOT, [b.couronnementTot, 1000])],
    ['6 surnuméraires', 'SIX_SURNUMERAIRE', surplus, B.SIX_SURNUMERAIRE * surplus],
    ['solde multiple de 3', 'SOLDE_MULTIPLE_DE_TROIS', b.six > 0 && b.six % LSERIE === 0 ? 1 : 0,
      b.six > 0 && b.six % LSERIE === 0 ? B.SOLDE_MULTIPLE_DE_TROIS : 0],
    ['additions de chiffres', 'ADDITION_CHIFFRES', b.additionsChiffres,
      B.ADDITION_CHIFFRES * b.additionsChiffres],
    ['additions de nombres', 'ADDITION_NOMBRES', b.additionsNombres,
      B.ADDITION_NOMBRES * b.additionsNombres],
    ['remise sur addition en chaîne', 'REMISE_ADDITION_EN_CHAINE', b.additionsEnChaine || 0,
      B.REMISE_ADDITION_EN_CHAINE * (b.additionsEnChaine || 0)],
    // ── ce qui se perd
    ['★ triptyque cassé', 'CASSE_TRIPTYQUE', b.casses, B.CASSE_TRIPTYQUE * b.casses],
    ['6 converti en autre chose', 'SIX_DETRUIT', b.sixDetruits, B.SIX_DETRUIT * b.sixDetruits],
    ['transformations en trop', 'TRANSFORMATION', enTrop, B.TRANSFORMATION * enTrop],
    ['valeurs calculées puis jetées en route', 'VALEUR_JETEE', b.valeursJetees,
      B.VALEUR_JETEE * b.valeursJetees],
    ['ligne uniformisée', 'EGALISATION', b.egalisees || 0, B.EGALISATION * (b.egalisees || 0)],
    ['rejet tacite d’une minorité', 'MAJORITE_TACITE', b.majoriteTacite || 0,
      B.MAJORITE_TACITE * (b.majoriteTacite || 0)],
    ['reste du vecteur, à la fin', 'RELIQUAT_HORS_CIBLE', b.reliquatHorsCible || 0,
      B.RELIQUAT_HORS_CIBLE * (b.reliquatHorsCible || 0)],
    ['6 produits que le verdict ne montre pas', 'RELIQUAT_DE_CIBLE', b.reliquatDeCible || 0,
      B.RELIQUAT_DE_CIBLE * (b.reliquatDeCible || 0)],
    ['part du vecteur écartée en silence', 'RELIQUAT_PROPORTIONNEL', b.reliquatHorsCible || 0,
      b.montrees ? fraction(B.RELIQUAT_PROPORTIONNEL, [b.reliquatHorsCible || 0, b.montrees]) : 0],
    ['arrondi de moyenne', 'ARRONDI', b.arrondi, fraction(B.ARRONDI, [b.arrondi, 1000])],
    ['min / max', 'MIN_MAX', b.minMax, B.MIN_MAX * b.minMax],
    ['lettre → lettre', 'LETTRE_VERS_LETTRE', b.lettreVersLettre,
      B.LETTRE_VERS_LETTRE * b.lettreVersLettre],
    ['retour sur une étape déjà quittée', 'RETOUR_SUR_UNE_ETAPE', b.retours || 0,
      B.RETOUR_SUR_UNE_ETAPE * (b.retours || 0)],
    ['filtre appliqué à une part seulement', 'FILTRE_SELECTIF', b.filtresSelectifs || 0,
      B.FILTRE_SELECTIF * (b.filtresSelectifs || 0)],
    ['même outil, réglé morceau par morceau', 'REGLAGE_PAR_MORCEAU', b.reglagesEnTrop || 0,
      B.REGLAGE_PAR_MORCEAU * (b.reglagesEnTrop || 0)],
    ['même mot, traduit de deux façons', 'TRADUCTION_DIVERGENTE', b.traductionsDivergentes || 0,
      B.TRADUCTION_DIVERGENTE * (b.traductionsDivergentes || 0)],
    ['portée réécrite avant d’être lue', 'RETOUCHE', b.retouches || 0,
      B.RETOUCHE * (b.retouches || 0)],
    ['part de la saisie jamais lue', 'PORTEE_IGNOREE', ignores,
      a.signifiants ? fraction(B.PORTEE_IGNOREE, [ignores, a.signifiants]) : 0],
    ['lettre ou chiffre arraché', 'EFFACE_ALNUM', a.alnum, B.EFFACE_ALNUM * a.alnum],
    ['bloc entier écarté', 'EFFACE_BLOC', a.bloc, B.EFFACE_BLOC * a.bloc],
    ['bloc entier court écarté', 'EFFACE_BLOC_COURT', a.blocCourt,
      B.EFFACE_BLOC_COURT * a.blocCourt],
    ['ponctuation ignorée', 'EFFACE_PONCTUATION', a.ponctuation,
      B.EFFACE_PONCTUATION * a.ponctuation],
    // ── ★ les ficelles assumées, au tarif qui remplace `VALEUR_JETEE`
    ['★ effacement sans motif', 'EFFACEMENT_SANS_MOTIF', b.effacementSansMotif || 0,
      B.EFFACEMENT_SANS_MOTIF * (b.effacementSansMotif || 0)],
    ['chiffre écrit en toutes lettres', 'ECRITURE_EN_LETTRES', b.ecritureEnLettres || 0,
      B.ECRITURE_EN_LETTRES * (b.ecritureEnLettres || 0)],
    ['le plus fréquent l’emporte', 'MAJORITE', b.majorite, B.MAJORITE * b.majorite],
    // ★ Ces deux-là sont comptés en MILLIÈMES d'un chiffre absorbé — leur peine
    //   est diluée par le nombre d'additions qui se suivent (`dilution`), et
    //   elle ne descend jamais à zéro tant que le compteur bouge (`peine`).
    ['redécoupage choisi (millièmes)', 'REDECOUPAGE', b.redecoupage || 0,
      peine(B.REDECOUPAGE, b.redecoupage || 0)],
    ['un rang sur deux', 'DECIMATION', b.decimation, B.DECIMATION * b.decimation],
    ['addition sélective (millièmes)', 'ADDITION_SELECTIVE', b.additionSelective,
      peine(B.ADDITION_SELECTIVE, b.additionSelective)],
    // ★ Dilué par la longueur de la démonstration — voir `REARRANGEMENT` et
    //   `LONGUEUR_PLEIN_TARIF`. À quatre gestes ou moins, le tarif est plein.
    ['réarrangement', 'REARRANGEMENT', b.rearrangement || 0,
      fraction(B.REARRANGEMENT * (b.rearrangement || 0),
        [LONGUEUR_PLEIN_TARIF, Math.max(LONGUEUR_PLEIN_TARIF, b.transformations || 0)])],
  ];
  return lignes.map(([poste, cle, quantite, brut]) => {
    const { sens, famille } = NATURE[cle];
    const ampleur = pondererAmpleur(brut, famille, poids);
    return { poste, cle, quantite, sens, famille, ampleur, points: sens * ampleur };
  });
}

/**
 * Le CRÉDIT d'élégance d'un bilan, en milli-unités. Peut dépasser le socle
 * (c'est ce qui fait le classement par élégance) et peut descendre sous zéro
 * (c'est ce que le plancher du facteur rattrape).
 *
 * ★ `poids` repondère une famille sans toucher à l'autre — c'est ce que les
 * trois régimes de classement demandent (`score.js › POIDS_DES_REGIMES`). Sans
 * argument, c'est le poids plein : le crédit d'avant, à la milli-unité près.
 *
 * @param {Object} b       un bilan de `bilanApproche`
 * @param {Object} [poids] pondération par famille, en pour-mille
 * @returns {number} entier, non borné
 */
export function credit(b, poids) {
  let c = 0;
  for (const ligne of detailDuCredit(b, poids)) c += ligne.points;
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
  // ★ Une portée RÉÉCRITE avant lecture sort de la définition, et sans
  //   discussion : « sans malus autre que d'exclure des blocs courts » n'a
  //   jamais autorisé à changer la question. Une retouche est le plus lourd
  //   malus d'élégance du barème (`BAREME.RETOUCHE`) ; l'oublier ici ferait
  //   passer une voie retouchée pour « sans reproche » au dernier cran du tri.
  return (b.retouches || 0) === 0
    && b.casses === 0
    && b.sixDetruits === 0
    && b.valeursJetees === 0
    && (b.majoriteTacite || 0) === 0
    && (b.jeteesAuTri || 0) === 0
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
