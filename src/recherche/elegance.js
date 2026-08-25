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
// CE QUE LE BILAN NE SAIT PAS MESURER — dit ici, et pas ailleurs
// ══════════════════════════════════════════════════════════════════════════════
//
// Trois demandes de l'auteur ne trouvent RIEN à mesurer dans le catalogue, parce
// que l'opérateur qu'elles pénalisent n'existe pas — et le registre est FERMÉ
// (§4.1), donc il ne peut pas être créé pour l'occasion :
//
//  · « le plus fréquent l'emporte » — aucun opérateur ne supprime les valeurs
//    minoritaires d'un vecteur ;
//  · « garder un caractère sur deux » — aucun opérateur ne décime un vecteur ;
//  · « l'addition SÉLECTIVE de chiffres contigus » (`6, 5+1, 6, 8`) — `c.somme`
//    additionne le vecteur ENTIER ; aucun opérateur n'additionne une
//    sous-plage choisie.
//
// Les trois paliers de laideur correspondants sont donc écrits dans le barème
// ci-dessous, à leur place dans la hiérarchie, mais leurs compteurs valent
// toujours zéro. Ce n'est pas un oubli : c'est la place réservée, pour que le
// jour où l'un de ces opérateurs serait alloué, le barème n'ait pas à être
// repensé. `BAREME_INACTIF` les énumère, et un test vérifie qu'ils sont bien
// inactifs — sans quoi on croirait mesurer ce qu'on ne mesure pas.

/** Trois 6 font un 666 (`assemblage.js › SERIE`). */
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
   * qu'on ait rien réarrangé. C'est ce que `mz` constate et que les cornes
   * montrent ; c'est aussi ce qu'un vecteur peut porter sans qu'aucun opérateur
   * ne le nomme. Le bonus se gagne sur la GÉOMÉTRIE du vecteur, jamais sur la
   * présence d'un code : `[6,6,6,4,4]` le gagne, qu'on ait employé `mz` ou non.
   */
  TRIPTYQUE_CONTIGU: 260,

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
   * vecteur (`mz`, `mu`) et le surplus que le verdict laisse tomber.
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

  // ── Les trois paliers RÉSERVÉS (voir l'en-tête : aucun opérateur ne les
  //    déclenche aujourd'hui, le registre étant fermé). Ils sont écrits pour
  //    tenir leur place dans la hiérarchie, pas pour agir.
  MAJORITE: 200,        // « le plus frequent l'emporte » — peu élégant
  DECIMATION: 140,      // « garder un caractère sur deux » — moins fort que la majorité
  ADDITION_SELECTIVE: 110, // `6, 5+1, 6, 8` — « de la triche en dernier recours »

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

/** Les paliers du barème qu'aucun opérateur ne peut déclencher (voir l'en-tête). */
export const BAREME_INACTIF = Object.freeze(['MAJORITE', 'DECIMATION', 'ADDITION_SELECTIVE']);

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

/** Combien de 6 porte un état ? */
function nbSix(e) {
  const vs = valeursDe(e);
  if (!vs) return 0;
  let n = 0;
  for (const v of vs) if (v === 6) n++;
  return n;
}

/**
 * Le rang (1 fondé) de la fin de la PREMIÈRE suite de trois 6 d'affilée, ou 0.
 *
 * ★ « D'affilée » est le mot qui interdit l'assouplissement (CONTRACTS §3.1,
 * amendement `horns`) : trois 6 non contigus, c'est l'autre geste, celui qui
 * coûte. On lit donc la contiguïté sur le vecteur, et rien d'autre.
 */
export function finDuTriptyque(valeurs) {
  if (!Array.isArray(valeurs)) return 0;
  let suite = 0;
  for (let i = 0; i < valeurs.length; i++) {
    suite = valeurs[i] === 6 ? suite + 1 : 0;
    if (suite >= SERIE) return i + 1;
  }
  return 0;
}

/** Un état porte-t-il trois 6 d'affilée, ou vaut-il littéralement 666 ? */
function porteUnTriptyque(e) {
  if (!e) return false;
  if (e.type === 'NUM') return e.valeur === 666;
  return finDuTriptyque(valeursDe(e)) > 0;
}

/** L'état où le chemin s'arrête est-il un aboutissement légitime du triptyque ? */
function aboutissementLegitime(e) {
  if (!e) return false;
  if (e.type === 'NUM') return e.valeur === 666;
  return finDuTriptyque(valeursDe(e)) > 0;
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
export function bilanChemin(chemin) {
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
    triptyqueVu: false,
    triptyqueTenu: false,
    casseTriptyque: false,
    six: 0,
    largeur: 0,
    finTriptyque: 0,
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
    // — `mz`, `mu` — n'est pas une conversion, c'est un rejet, et il se compte
    // plus bas avec les autres rejets. Sans cette séparation, un même chiffre
    // serait puni deux fois pour un seul geste.
    const conversion = apres.type === 'NUM'
      || (apres.type === 'NUMS' && avant.type === 'NUMS'
        && apres.valeur.length === avant.valeur.length);
    if (conversion) {
      const perdus = nbSix(avant) - nbSix(apres);
      // …sauf quand ce qui en sort EST le but : faire un 6 ou un 666 de ses 6
      // n'est pas les convertir « en autre chose ».
      const but = apres.type === 'NUM' && (apres.valeur === 6 || apres.valeur === 666);
      if (perdus > 0 && !but) b.sixDetruits += perdus;
    }

    // ── ★ Le rejet : un vecteur qui rétrécit, c'est des valeurs calculées puis
    //    écartées, et la scène les MONTRE tomber.
    if (avant.type === 'NUMS' && apres.type === 'NUMS'
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
    if (!porteUnTriptyque(e)) continue;
    b.triptyqueVu = true;
    break;
  }
  if (b.triptyqueVu) {
    b.triptyqueTenu = aboutissementLegitime(fin);
    b.casseTriptyque = !b.triptyqueTenu;
  }

  // ── la géométrie du vecteur final : ce que le verdict aura sous les yeux
  const finales = valeursDe(fin);
  if (finales) {
    b.largeur = finales.length;
    for (const v of finales) if (v === 6) b.six++;
    b.finTriptyque = fin.type === 'NUM' ? (fin.valeur === 666 ? 1 : 0) : finDuTriptyque(finales);
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
    casses: 0,
    six: 0,
    montrees: 0,
    couronnementTot: 0,   // en pour-mille, moyenné sur les triptyques contigus
    finirPar666: false,
    // les trois paliers réservés — voir `BAREME_INACTIF`
    majorite: 0,
    decimation: 0,
    additionSelective: 0,
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
    const bc = bilanChemin(p.chemin);
    b.transformations += bc.transformations;
    b.additionsChiffres += bc.additionsChiffres;
    b.additionsNombres += bc.additionsNombres;
    b.additionsEnChaine += bc.additionsEnChaine;
    b.arrondi += bc.arrondi;
    b.minMax += bc.minMax;
    b.lettreVersLettre += bc.lettreVersLettre;
    b.sixDetruits += bc.sixDetruits;
    b.valeursJetees += bc.valeursJetees;
    b.six += bc.six;
    b.montrees += bc.largeur;
    if (bc.casseTriptyque) b.casses++;
    if (bc.triptyqueTenu && bc.finTriptyque > 0) {
      b.triptyquesContigus++;
      // ★ « Plus tôt, mieux c'est » — la part du vecteur qui RESTE après que le
      //   triptyque est complet. Sur un vecteur d'un seul tenant (`[6,6,6]`,
      //   `666`), il n'y a rien après : le triptyque est le vecteur, et le
      //   bonus est plein.
      const reste = bc.largeur > 0 ? bc.largeur - bc.finTriptyque : 0;
      let gain = bc.largeur > SERIE ? Math.floor((reste * 1000) / bc.largeur) : 1000;
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
        gain = bc.largeur > SERIE
          ? Math.floor(((bc.largeur - SERIE) * 1000) / bc.largeur)
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
  const gardees = Math.min(b.six, series * SERIE);
  b.jeteesAuTri = Math.max(0, b.montrees - gardees);
  b.valeursJetees += b.jeteesAuTri;
  b.gardees = gardees;
  b.series = series;

  b.abandons = abandons(approche, ctx);
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
  const surplus = Math.min(Math.max(0, b.six - SERIE), B.SIX_SURNUMERAIRE_MAX);
  const socle = B.SOCLE_TRANSFORMATIONS * Math.max(1, b.parts || 1);
  const enTrop = Math.max(0, b.transformations - socle);
  const lignes = [
    ['socle', 1, B.SOCLE],
    // ── ce qui se gagne
    ['triptyque contigu', b.triptyquesContigus, B.TRIPTYQUE_CONTIGU * b.triptyquesContigus],
    [b.finirPar666 ? 'couronnement tôt (ou final)' : 'couronnement tôt',
      b.couronnementTot, fraction(B.COURONNEMENT_TOT, [b.couronnementTot, 1000])],
    ['6 surnuméraires', surplus, B.SIX_SURNUMERAIRE * surplus],
    ['solde multiple de 3', b.six > 0 && b.six % SERIE === 0 ? 1 : 0,
      b.six > 0 && b.six % SERIE === 0 ? B.SOLDE_MULTIPLE_DE_TROIS : 0],
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
    // ── les trois paliers réservés (voir l'en-tête : toujours nuls)
    ['le plus fréquent l’emporte', b.majorite, -B.MAJORITE * b.majorite],
    ['un caractère sur deux', b.decimation, -B.DECIMATION * b.decimation],
    ['addition sélective', b.additionSelective, -B.ADDITION_SELECTIVE * b.additionSelective],
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
    && b.arrondi === 0
    && b.minMax === 0
    && b.lettreVersLettre === 0
    && (a.alnum || 0) === 0
    && (a.bloc || 0) === 0
    && !(a.opaque);
}
