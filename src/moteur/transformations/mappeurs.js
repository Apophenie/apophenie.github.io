/**
 * Mesures (`STR → NUM`, codes `n…`) et mappeurs (`TOKENS → NUMS`, `NUMS → NUMS`,
 * codes `m…`).
 *
 * Les mappeurs de valeur de lettre exigent des **jetons d'un seul caractère**
 * (sinon `null`) : « la valeur d'un mot » n'a pas de définition non arbitraire,
 * et le moteur préfère élaguer que bricoler. `m.longueurToken` couvre le cas des
 * mots.
 *
 * ## Gestes dédiés du vocabulaire fermé (CONTRACTS §3.1)
 *
 * - **`sevenSeg`** (`m7`, `m7F`), **`fourteenSeg`** (`m14`, `m14F`) et
 *   **`countStrokes`** (`mtrc`…`mbob` — traits,
 *   extrémités, boucles) partagent une seule grammaire (`src/visuel/primitives/
 *   encart.js`), et l'émission est la même : **un step par jeton**. La lettre
 *   monte dans un encart, y change de police (l'afficheur sept segments, ou son
 *   propre tracé de crayon), un compteur paraît, les segments — ou les traits,
 *   les pointes, les boucles — s'allument **un par un** en faisant monter le
 *   compteur, et le nombre du compteur redescend remplacer la lettre.
 *   C'est l'exigence de CONTRACTS §0.3 : « ce que le spectateur voit à l'écran
 *   est, littéralement, ce qui a été compté ». Les tables de comptage
 *   (`tables/derivees.js`) et le tracé animé sortent du même
 *   `tables/glyphes.js`, et `count` fait échouer la compilation s'ils
 *   divergeaient.
 * - **`table`** (`ma1`…`mms`, `mmt`…`masb`, `mhe`, `mgr`, `mln`) : **la table de
 *   correspondance, MONTRÉE**. Une conversion par table n'est vérifiable que si
 *   la table est sous les yeux — « P = 7 » est une affirmation tant qu'on n'a
 *   pas vu la colonne du 7. La table paraît sous la ligne, la case s'allume, la
 *   lettre y vole, la valeur en redescend. Le geste ne change jamais ; seule la
 *   MISE EN PAGE varie, et elle est une option (`forme`), pas une primitive de
 *   plus : `reglette` (**une case = une lettre + un nombre**, dans l'ordre
 *   alphabétique — c'est le cas de TOUTES les tables) et `pave` (les touches à
 *   leur place sur le téléphone : T9). ★ **Seul le clavier téléphonique a
 *   plusieurs lettres pour un chiffre** : c'est la réalité de l'objet, pas une
 *   commodité de mise en page. Une case porte jusqu'à trois lignes — le
 *   glyphe, l'INTERMÉDIAIRE quand il en existe un (le code morse, la lettre
 *   hébraïque, le nom français), et la valeur : « H → ···· → 4 » se compte,
 *   « H → 4 » se croit.
 *
 *   Deux options de réglette DÉMONTRENT quelque chose et ne décorent rien :
 *   `cycle` casse la ligne là où la table recommence (la pythagoricienne y
 *   aligne `A J S` = 1, `B K T` = 2 : la règle se voit), et `teinte` fonce le
 *   fond de case avec la valeur (le Scrabble), sans jamais porter seule
 *   l'information, qui reste écrite dans la case.
 *
 *   ★ Contrôle croisé. La table qui voyage dans l'op est **dérivée de `fn`**,
 *   la fonction même qu'`apply()` applique (`tableDe`) : la table montrée et la
 *   table employée sont une seule source. La primitive refuse en outre de faire
 *   redescendre une valeur qui n'est pas dans la case qu'elle dessine, et le
 *   pont recoupe une troisième fois. Seul l'alphabet garde un oracle
 *   INDÉPENDANT (`ordre`) : le moteur visuel y recalcule le rang au lieu de
 *   nous croire.
 *
 *   ★ UN ALLER-RETOUR PAR LETTRE, complet : la lettre monte, sa valeur
 *   redescend aussitôt à sa place, puis la suivante. Un step par lettre —
 *   grouper les départs puis les retours ferait perdre quelle lettre a donné
 *   quel nombre. Ce qui se mutualise, c'est le DÉCOR : `montre` sur la
 *   première, `retire` sur la dernière, et la table reste montée entre les
 *   deux (l'assemblage l'étend même aux transformations d'affilée qui
 *   emploient la même table — `src/recherche/scenario.js`).
 * - **`keyboard`** (`mazc`…`mqwr`, `mtc`) : le clavier monte, la touche — ou la
 *   colonne, ou la rangée — s'illumine, le caractère y vole, et le nombre en
 *   redescend. Trois mesures : `'touche'` (le « tiret du 6 » : le chiffre qui
 *   partage la touche), `'colonne'` et `'rangee'`. Pour la colonne, c'est
 *   l'index de la **réglette numérotée de 1 à 10** qui descend, jamais le label
 *   de la touche du dessus : le `p` est en colonne 10 alors que la touche
 *   au-dessus porte `0`. La primitive refuse d'afficher un nombre différent de
 *   celui qu'annonce l'arithmétique — c'est le contrôle croisé qui empêche
 *   `tables/claviers.js` et la géométrie du moteur visuel de diverger.
 *   Une op `keyboard` anime la caméra : on en émet **une par step**, donc un
 *   step par jeton.
 */

import {
  A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6, NOM_LETTRE_FR,
  VOYELLES, sansAccents, estLettre, valeur as valeurTable, LETTRES,
} from '../tables/alphabet.js';
import { SCRABBLE_FR, SCRABBLE_EN, T9, MORSE, morseSignaux, morseTraits } from '../tables/jeux.js';
import {
  segmentsDe, compteSegments, compteTraitsFusionnes, MENTION_SEG7, SEG7_APPROXIMATIONS,
} from '../tables/seg7.js';
import {
  segments14De, compteSegments14, compteTraitsFusionnes14, MENTION_SEG14,
} from '../tables/seg14.js';
import {
  AZERTY, QWERTY, colonne, rangee, chiffreDeTouche, CHIFFRE_DE_TOUCHE, NOTE_AFNOR,
} from '../tables/claviers.js';
import { mesure as mesureGlyphe } from '../tables/derivees.js';
import { GLYPHES } from '../tables/glyphes.js';
import {
  valeurHebreu, valeurGrec, NOTE_SOURCAGE, TRANSLIT_HEBREU, TRANSLIT_GREC,
} from '../tables/ecritures.js';
import { decouperMots } from './filtres.js';
import { def, etape, token, fusion, nomsTokens, nomToken, enchainer, retirerAccolade } from './commun.js';
import { opComptage } from './combinateurs.js';
import { bilingue, dire } from '../i18n.js';

const pli = (c) => sansAccents(String(c)).toUpperCase();
const estVoyelle = (c) => VOYELLES.includes(pli(c));

// Libellés dont `steps()` a besoin avant que `def()` ait figé l'opérateur.
const LIB_REDUIRE_CHAQUE = bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit');
const LIB_ZEROS = bilingue('On retire les zéros', 'Drop the zeros');
const REG_ZEROS = bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum');
const LIB_RETOURNER_9 = bilingue('On retourne les 9', 'Turn the 9s upside down');
const LIB_TROUVAILLE = bilingue(
  'Trois 6 d’affilée — le 666 était déjà écrit',
  'Three 6s in a row — the 666 was already written',
);

/**
 * Le titre de L'ÉTAPE de `m36`, distinct de son libellé d'opérateur.
 *
 * ★ Les deux disaient la même phrase, et c'était juste tant que l'opérateur
 * faisait les deux choses à la fois : couronner et tronquer. Il ne couronne
 * plus (voir `steps`), et l'assemblage pose le couronnement à part, sous le
 * titre de la trouvaille. Deux étapes voisines portant la même phrase se
 * liraient comme une redite ; celle-ci dit ce qu'elle fait, et elle seule —
 * on s'arrête de lire, le reste s'efface.
 *
 * Le LIBELLÉ de l'opérateur, lui, ne bouge pas : il nomme la méthode dans le
 * titre de la voie, et la méthode est bien la trouvaille.
 */
const LIB_ARRET = bilingue(
  'On s’arrête aux trois 6 d’affilée — le reste s’efface',
  'Stop at the three 6s in a row — the rest is erased',
);

/** Longueur de la suite cherchée. 666 fait trois 6, ni deux, ni quatre. */
const SUITE = 3;

/** Le nombre cherché, chiffre par chiffre. Il vaut 6, et il ne vaudra jamais rien d’autre. */
const SIX = 6;

/**
 * L'index du premier 6 de la première suite de trois 6 CONTIGUS, ou −1.
 *
 * Source unique de `apply`, de `sortie` et de `steps` : les trois posent la
 * même question au même vecteur, donc aucune ne peut désigner d'autres jetons
 * que les deux autres (CONTRACTS §0.3, « ce qui est montré est ce qui est
 * compté »).
 *
 * « Contigus » se lit sur les INDEX du vecteur, sans exception ni tolérance :
 * `[6,6,7,6]` ne contient pas de 666, il contient trois 6 dont deux voisins.
 */
function debutDesTroisSix(valeur) {
  let court = 0;
  for (let i = 0; i < valeur.length; i++) {
    court = valeur[i] === 6 ? court + 1 : 0;
    if (court === SUITE) return i - (SUITE - 1);
  }
  return -1;
}

// ───────────────────────────────────────────────────────────────────────────
// ★ Les trois ficelles assumées — le relevé, la parité, la découpe
// ───────────────────────────────────────────────────────────────────────────
//
// Trois opérateurs (`mpf`, `m1s2`, `mad`) branchent les trois paliers de malus
// que `src/recherche/elegance.js` gardait en réserve. Tout ce qui DÉCIDE y est
// calculé ici, une fois, et relu par `apply`, `sortie` et `steps` : une seule
// source, donc aucun écart possible entre ce qui est compté et ce qui est
// montré (CONTRACTS §0.3).

const LIB_PLUS_FREQUENT = bilingue('Le plus fréquent l’emporte', 'The most frequent wins');
const LIB_UN_SUR_DEUX = bilingue(
  'On ne garde qu’une position sur deux',
  'Keep only every other position',
);
// ★ Un titre ORDINAIRE, et c'est une consigne de l'auteur : « l'idée est de ne
// pas la différencier des additions qui la précèdent ou la succèdent, c'est
// juste une de plus (ou une de moins si on saute un 6 pour le conserver) ».
// Rien n'est caché pour autant — la `regle` et la `note` de l'opérateur disent
// la sélection en toutes lettres, et c'est le score d'élégance qui la nomme.
const LIB_ADDITION_SELECTIVE = bilingue(
  'On additionne des chiffres contigus',
  'Add up adjacent digits',
);
const LIB_CHIFFRE_A_CHIFFRE = bilingue(
  'On écrit chaque nombre chiffre à chiffre',
  'Write every number out digit by digit',
);

/**
 * ★ La valeur STRICTEMENT la plus fréquente d'un vecteur — ou `null`.
 *
 * Trois refus, et chacun ferme une porte que le déterminisme (§4.4) ne peut pas
 * laisser ouverte :
 *
 *  · **ex æquo ⇒ refus.** Départager deux valeurs aussi fréquentes l'une que
 *    l'autre demanderait une préférence — la première rencontrée, la plus
 *    petite, celle qui vaut 6 — et chacune serait un choix déguisé en règle.
 *    « Le plus fréquent l'emporte » n'a de sens que s'il y en a UN ; sinon la
 *    règle ne s'applique pas, et c'est le seul départage qui n'invente rien.
 *    Corollaire : le résultat ne dépend pas de l'ordre d'itération de la `Map`,
 *    qui ne sert qu'à des comparaisons d'entiers ;
 *  · **tout le vecteur ⇒ refus.** Un opérateur qui rend son entrée fabrique une
 *    étape que `scenario.js` saute en silence (« une transformation qui ne
 *    transforme RIEN À L'ÉCRAN »), et l'URL porterait alors un code que la
 *    démonstration ne montre nulle part (même raison que `mr9` et `m36`) ;
 *  · **pas de 666 au bout ⇒ refus** (`portePleinement`, ci-dessous). La ficelle
 *    ne s'autorise que de ce qu'elle prétend servir — « se débarrasser du 4 si
 *    besoin pour former un triptyque supplémentaire ». Si le résultat n'écrit
 *    pas 666 d'affilée, elle a coûté quelque chose et n'a rien acheté.
 *
 * ★ **Ce dernier refus ne truque pas le vainqueur, il ferme la boutique.** La
 * règle reste « le plus fréquent », quel qu'il soit : jamais l'opérateur ne
 * choisit le 6 contre une autre valeur plus fréquente. Simplement, quand le
 * vainqueur n'est pas un 6 — ou qu'il n'y en a pas trois —, la ficelle ne
 * s'applique PAS, au lieu de rendre un `[4,4,4]` que personne n'a demandé et
 * que la scène montrerait pour rien.
 */
function valeurDominante(valeur) {
  const comptes = new Map();
  for (const v of valeur) comptes.set(v, (comptes.get(v) || 0) + 1);
  let meilleure = null;
  let max = 0;
  let exAequo = false;
  for (const [v, n] of comptes) {
    if (n > max) { max = n; meilleure = v; exAequo = false; }
    else if (n === max) exAequo = true;
  }
  if (meilleure === null || exAequo) return null;
  if (max === valeur.length) return null;
  if (!portePleinement(Array.from({ length: max }, () => meilleure))) return null;
  return { valeur: meilleure, compte: max };
}

/** Le vecteur écrit-il 666 d'affilée ? C'est le seul but que ces ficelles servent. */
const portePleinement = (v) => debutDesTroisSix(v) >= 0;

/** Le relevé écrit — `6 ×4 · 4 ×1` —, par ordre de PREMIÈRE apparition. */
function releveEcrit(valeur) {
  const comptes = new Map();
  for (const v of valeur) comptes.set(v, (comptes.get(v) || 0) + 1);
  return [...comptes].map(([v, n]) => `${v} ×${n}`).join(' · ');
}

/**
 * ★ La parité de rang qui porte le plus de 6 — `0` (1ᵉʳ, 3ᵉ, 5ᵉ…), `1`
 * (2ᵉ, 4ᵉ, 6ᵉ…), ou `−1` quand la règle refuse de s'appliquer.
 *
 * « Si sur l'ensemble des caractères, en garder 1 sur 2 permet d'isoler les 6 »
 * — l'auteur. Le critère est donc les 6, dans ses propres termes, et il est
 * annoncé à l'écran avant d'être appliqué : ce n'est pas un choix fait après
 * coup, c'est le choix ANNONCÉ, chiffres à l'appui.
 *
 * ★ Et là encore, l'ex æquo est un REFUS et non un arbitrage : à nombre de 6
 * égal, aucune des deux parités ne vaut mieux que l'autre, et prétendre le
 * contraire serait remettre par la fenêtre l'arbitraire qu'on chasse par la
 * porte. Il n'y a donc aucune règle de départage à retenir — il n'y a rien à
 * départager.
 *
 * ★ Et le côté retenu doit ÉCRIRE 666 d'affilée, sinon la règle ne s'applique
 * pas : décimer pour qu'il reste deux nombres, ou trois 6 encore dispersés,
 * ce n'est pas isoler les 6, c'est en perdre. Même exigence que pour `mpf`, et
 * pour la même raison — une ficelle qui n'achète rien ne doit pas être jouée.
 */
function paritePorteuse(valeur) {
  const six = [0, 0];
  valeur.forEach((v, i) => { if (v === 6) six[i % 2]++; });
  if (six[0] === six[1]) return -1;
  const p = six[0] > six[1] ? 0 : 1;
  const garde = valeur.filter((_, i) => i % 2 === p);
  return portePleinement(garde) ? p : -1;
}

/** Le relevé des deux parités, écrit — c'est lui qui dit POURQUOI cette parité. */
function releveDesParites(valeur, langue) {
  const six = [0, 0];
  valeur.forEach((v, i) => { if (v === 6) six[i % 2]++; });
  return dire(bilingue(
    `positions impaires : ${six[0]} six · positions paires : ${six[1]} six`,
    `odd positions: ${six[0]} sixes · even positions: ${six[1]} sixes`,
  ), langue);
}

/**
 * ★ LA DÉCOUPE DE L'ADDITION SÉLECTIVE — et la borne d'exploration, dite.
 *
 * « Une conversion de lettres donne `6, 5, 16, 8`. La logique voudrait faire
 * `6+5+1+6+8`, ou `6, 5, 1+6, 8`, mais faire `6, 5+1, 6, 8` pour obtenir
 * `666, 8` est acceptable bien que pénalisé. » — l'auteur.
 *
 * ★ **Le nombre de découpes explose, et on ne l'explore pas.** Choisir quelles
 * suites de chiffres additionner, c'est choisir une composition de la séquence :
 * il y en a 2^(n−1). On n'en cherche donc AUCUNE « meilleure » — on en prend
 * UNE, par un balayage glouton de gauche à droite qui coûte O(n × 6) et ne
 * dépend d'aucun tri :
 *
 *  1. on écrit tous les nombres chiffre à chiffre, dans l'ordre ;
 *  2. à chaque rang, on prend **la plus courte** suite qui commence là et dont
 *     la somme fait **exactement 6** ; à défaut, le chiffre reste seul et l'on
 *     avance d'un cran.
 *
 * Trois refus bornent le reste :
 *
 *  · **aucun terme déjà égal à 6.** Un 6 n'a pas besoin qu'on l'aide, et
 *    l'additionner à un voisin le DÉTRUIRAIT — ce que le barème d'élégance
 *    punit par ailleurs (`SIX_DETRUIT`). La ficelle ne se paie pas deux fois ;
 *  · **aucun terme nul.** `6 + 0` n'est pas une addition, c'est un zéro qu'on
 *    fait disparaître ; `m0` existe pour ça et le dit honnêtement. Corollaire
 *    utile : des termes tous ≥ 1 et de somme 6 font **au plus six termes**, si
 *    bien que la fenêtre est bornée par la CIBLE et non par un réglage ;
 *  · **aucune addition ⇒ refus.** Sans quoi l'opérateur ne serait qu'un
 *    découpage en chiffres qui n'a jamais été demandé, et il porterait dans
 *    l'URL un code pour un geste qu'il ne fait pas ;
 *  · **pas de 666 d'affilée au bout ⇒ refus** (voir `portePleinement`).
 *
 * La largeur est bornée elle aussi (`CHIFFRES_MAX`) : au-delà, on n'additionne
 * plus, on bricole — et la scène deviendrait illisible.
 */
const CHIFFRES_MAX = 12;

function planAdditionSelective(valeur) {
  if (!valeur.length) return null;
  if (valeur.some((v) => !Number.isInteger(v) || v < 0)) return null;
  const chiffres = [];
  valeur.forEach((v, i) => {
    for (const c of String(v)) chiffres.push({ v: Number(c), src: i });
  });
  if (chiffres.length > CHIFFRES_MAX) return null;
  const multi = new Set();
  const parSource = new Map();
  chiffres.forEach((c) => parSource.set(c.src, (parSource.get(c.src) || 0) + 1));
  for (const [src, n] of parSource) if (n > 1) multi.add(src);

  const sortie = [];
  let i = 0;
  let additions = 0;
  while (i < chiffres.length) {
    let pris = 0;
    let somme = 0;
    for (let L = 1; L <= SIX && i + L <= chiffres.length; L++) {
      const c = chiffres[i + L - 1].v;
      if (c === 0 || c === SIX) break;
      somme += c;
      if (somme > SIX) break;
      if (L >= 2 && somme === SIX) { pris = L; break; }
    }
    if (pris) { sortie.push({ v: SIX, debut: i, fin: i + pris }); i += pris; additions++; }
    else { sortie.push({ v: chiffres[i].v, debut: i, fin: i + 1 }); i++; }
  }
  if (!additions) return null;
  // ★ Même exigence que les deux autres ficelles : le résultat doit ÉCRIRE 666
  //   d'affilée. « Faire `6, 5+1, 6, 8` POUR OBTENIR `666, 8` » — c'est
  //   l'auteur qui met le but dans la phrase, et sans ce but l'addition
  //   sélective n'est plus qu'une addition qu'on a refusé de faire partout.
  return portePleinement(sortie.map((x) => x.v)) ? { chiffres, sortie, multi } : null;
}

/**
 * L'identifiant de scène du kᵉ chiffre. Un nombre d'un seul chiffre n'est pas
 * découpé : son jeton ne bouge pas, il garde donc son identifiant. Le recréer
 * ferait clignoter un jeton que rien n'a transformé (même raison que le tiret
 * de `hope-hope-hope`, `sortieMuee` dans `filtres.js`).
 */
const idChiffre = (plan, ctx, k) => (plan.multi.has(plan.chiffres[k].src)
  ? `${ctx.cle}c${k}` : ctx.ids[plan.chiffres[k].src]);

/** L'identifiant de scène du jᵉ terme de sortie — neuf si, et seulement si, il naît d'une addition. */
const idSortie = (plan, ctx, s, j) => (s.fin - s.debut < 2
  ? idChiffre(plan, ctx, s.debut) : `${ctx.cle}s${j}`);


// ───────────────────────────────────────────────────────────────────────────
// ★ LES QUATRE TRANSFORMATIONS DEMANDÉES LE 27 AOÛT — le tri, les trios,
//   le décompte, le redécoupage
// ───────────────────────────────────────────────────────────────────────────
//
// Elles viennent d'un retour d'auteur consigné mot pour mot
// (`.planning/A-VENIR-retours-cornes-et-moteur.md`, §7) et forment une seule
// démonstration, dans cet ordre :
//
//     redécoupage → tri croissant → cornes → « on retourne les 666 qui se
//     cachent »
//
// Comme pour les trois ficelles, tout ce qui DÉCIDE est calculé ici, une fois,
// et relu par `apply`, `sortie` et `steps` : une seule source, donc aucun écart
// possible entre ce qui est compté et ce qui est montré (CONTRACTS §0.3).

const LIB_TRI_CROISSANT = bilingue(
  'On range les nombres par ordre croissant',
  'Sort the numbers in ascending order',
);
// ★ Le titre est celui de l'auteur, mot pour mot : « On retourne les 666 qui se
//   cachent ». Il dit ce que le geste TROUVE (un 666), pas ce qu'il manipule
//   (des 9) — et c'est justement la différence avec `mr9`, qui retourne les 9 un
//   par un sans savoir ce qu'il en sortira.
const LIB_TRIOS_DE_NEUF = bilingue(
  'On retourne les 666 qui se cachent',
  'Turn over the 666s in hiding',
);
const LIB_COMPTER_LES_CHIFFRES = bilingue(
  'On compte les chiffres',
  'Count the digits',
);
const LIB_REDECOUPAGE = bilingue(
  'On redécoupe en paquets qui tombent sur 6',
  'Recut into packets that land on 6',
);

/**
 * ★ L'ORDRE CROISSANT — la permutation, pas le tableau trié.
 *
 * On rend les INDEX dans leur nouvel ordre plutôt que les valeurs, parce que
 * `steps()` en a besoin pour nommer les jetons qui se déplacent : un tri, à
 * l'écran, n'est ni une substitution ni un effacement, c'est un `move` — les
 * mêmes jetons, dans un autre ordre.
 *
 * ★ **Le départage est ÉCRIT, il n'est pas hérité du moteur.** `Array.sort`
 * est stable depuis ES2019, mais s'appuyer là-dessus reviendrait à faire
 * dépendre une URL rejouable (§4.3) d'une garantie de plateforme. À valeurs
 * égales, c'est donc l'index de départ qui départage, explicitement : deux 6
 * restent dans l'ordre où on les a lus, et le déterminisme (§4.4) ne doit rien
 * à personne.
 */
function ordreCroissant(valeur) {
  return valeur.map((_, i) => i).sort((a, b) => valeur[a] - valeur[b] || a - b);
}

/**
 * ★ LE TRI RASSEMBLE-T-IL VRAIMENT ? — la seule condition, et elle ne regarde
 *   pas la cible.
 *
 * Deux exigences en une seule mesure, le nombre de PLAGES de valeurs identiques
 * (`plagesDe`) :
 *
 *  · **il doit déplacer quelque chose**, sinon l'étape ne montrerait rien et
 *    `scenario.js` la sauterait en silence — l'URL porterait alors un code
 *    invisible à l'écran (même refus que `mr9`, `m36` et les trois ficelles) ;
 *  · **il doit RASSEMBLER**, c'est-à-dire laisser STRICTEMENT MOINS de plages
 *    qu'il n'en a trouvé. C'est le propos que l'auteur lui donne — « qui permet
 *    de faire apparaître 666 contigu » —, et c'est tout ce qu'un rangement
 *    achète : mettre côte à côte ce qui était dispersé. Un tri qui promène les
 *    valeurs sans en réunir deux a défait l'ordre de lecture pour rien.
 *
 * ★ Et cette condition ne dit pas un mot du 6. Elle vaut telle quelle pour
 * `111`, pour `777`, et même pour `13` — `[3,1,3,1]` rangé donne `[1,1,3,3]`,
 * deux plages au lieu de quatre, et deux fois la cible écrite. C'est pour ça
 * que cet opérateur reste explorable quelle que soit la cible, là où le
 * redécoupage (`mrd`), lui, en sort (`src/recherche/bfs.js`).
 */
function triRassemble(valeur) {
  const ordre = ordreCroissant(valeur);
  if (!ordre.some((src, i) => valeur[src] !== valeur[i])) return false;
  const plusLongue = (v) => plagesDe(v).reduce((m, p) => Math.max(m, p.compte), 0);
  return plusLongue(valeur) < SUITE && plusLongue(ordre.map((i) => valeur[i])) >= SUITE;
}

/**
 * ★ LES 9 QUI FORMENT UN TRIO CONTIGU — et eux seuls.
 *
 * « Puis de retourner les neufs non pas individuellement mais en trio contigu
 * (plus élégant) pour faire apparaître directement 666. » — l'auteur.
 *
 * On balaie les suites maximales de 9 et l'on ne retourne, dans chacune, que
 * les `3 × ⌊L/3⌋` premiers : un trio se retourne d'un bloc, un 9 esseulé reste
 * un 9. Sur une suite de quatre, le quatrième ne bouge pas — le couper en deux
 * n'aurait pas de sens, et prendre les trois DERNIERS demanderait de choisir
 * là où la lecture de gauche à droite désigne déjà (même argument que
 * `debutDesTroisSix`).
 *
 * @returns {number[]} les index à retourner, croissants
 */
function triosDeNeuf(valeur) {
  const out = [];
  let i = 0;
  while (i < valeur.length) {
    if (valeur[i] !== 9) { i++; continue; }
    let j = i;
    while (j < valeur.length && valeur[j] === 9) j++;
    const complets = Math.floor((j - i) / SUITE) * SUITE;
    for (let k = 0; k < complets; k++) out.push(i + k);
    i = j;
  }
  return out;
}

/**
 * ★ LES PLAGES DE VALEURS IDENTIQUES — la lecture de « on compte les chiffres ».
 *
 * « `34455666999` → `1324253639` » — un 3, deux 4, deux 5, trois 6, trois 9.
 *
 * ★ **Ce sont des PLAGES CONTIGUËS, pas un relevé par valeur**, et la
 * différence compte même si l'exemple de l'auteur ne la montre pas (il porte
 * sur un vecteur déjà trié, où les deux lectures coïncident). Trois raisons,
 * dans cet ordre :
 *
 *  · un relevé par valeur devrait DÉCIDER de l'ordre de sortie — croissant ?
 *    par première apparition ? — et chacun serait un choix déguisé en règle,
 *    exactement ce que les ficelles refusent de faire (`valeurDominante`) ;
 *  · la plage contiguë se lit de gauche à droite, sans rien comparer : c'est
 *    l'ordre de la ligne, celui que la démonstration doit garder ;
 *  · c'est la suite de Conway, « look and say », que le public a déjà
 *    rencontrée — le décompte par valeur, lui, n'a de nom nulle part.
 *
 * Et c'est ce qui fait du couple `tri croissant` + `on compte les chiffres` une
 * suite qui a du sens : trier RASSEMBLE les plages, compter les nomme.
 */
function plagesDe(valeur) {
  const out = [];
  let i = 0;
  while (i < valeur.length) {
    let j = i;
    while (j < valeur.length && valeur[j] === valeur[i]) j++;
    out.push({ debut: i, fin: j, valeur: valeur[i], compte: j - i });
    i = j;
  }
  return out;
}

/**
 * ★ LE REDÉCOUPAGE TRICHEUR — et il est assumé comme tel.
 *
 * « Après l'étape 15, il y a 32 chiffres. C'est le moment de TRICHER pour
 * réduire chaque nombre à un chiffre en redécoupant de manière à ce que ça
 * tombe sur 6 le plus souvent possible. » — l'auteur, et le mot « tricher »
 * est de lui. Le barème d'élégance le pénalise en conséquence
 * (`REDECOUPAGE`, `src/recherche/elegance.js`), au même titre que les trois
 * ficelles.
 *
 * ── Ce qui le sépare de l'addition sélective (`mad`) ────────────────────────
 *
 * `mad` n'additionne QUE les suites qui font exactement 6 et laisse tout le
 * reste tel quel : c'est une sélection, mais une sélection qui ne touche
 * presque à rien. Celui-ci redécoupe la LIGNE ENTIÈRE, chaque chiffre tombant
 * dans un paquet, et il réduit chaque paquet par racine numérique — donc
 * `4+8 = 12 → 3`. Il ne se contente pas de saisir une occasion : il refait la
 * lecture du nombre pour que le résultat lui convienne.
 *
 * ── « Le plus souvent possible » est une OPTIMISATION, pas une occasion ─────
 *
 * L'auteur dit « de manière à ce que ça tombe sur 6 le plus souvent possible ».
 * Ce n'est pas ce que fait un balayage glouton — c'est une programmation
 * dynamique, et elle tient en `O(n × 6)` :
 *
 *  1. **maximiser le nombre de paquets valant 6.** C'est la consigne, mot pour
 *     mot ;
 *  2. **à égalité, minimiser le nombre de paquets.** Ce qui ne tombe pas sur 6
 *     est absorbé plutôt que laissé à traîner : un redécoupage qui sème des
 *     zéros et des 1 derrière lui n'a pas redécoupé, il a émietté ;
 *  3. **à égalité encore, la coupe la plus courte d'abord** — l'ordre de
 *     lecture, et le seul départage qui n'invente rien (§4.4).
 *
 * ⚠️ MESURE, sur l'exemple même de l'auteur. Ses 32 chiffres
 * (`48120120961141088436181322436108`) portent trois 6 ; sa découpe à la main
 * en rend six sur douze, celle-ci en rend **huit sur onze**
 * (`63666666369`), et le tri croissant qui suit y écrit `33666666669` —
 * **deux 666 d'affilée** là où la sienne en donne deux également, mais après
 * un second geste (le retournement des 999). L'optimisation ne trahit donc pas
 * l'exemple : elle le remplit mieux que la main.
 *
 * ── Trois refus, et ils bornent tout le reste ───────────────────────────────
 *
 *  · **aucun 6 déjà là n'est absorbé.** Un 6 est un acquis ; l'additionner à un
 *    voisin le détruirait, ce que le barème punit par ailleurs
 *    (`SIX_DETRUIT`). C'est la doctrine de `mad`, reprise telle quelle — et
 *    c'est aussi ce que fait l'auteur dans son propre calcul, où les 6 du
 *    vecteur de départ restent seuls dans leur paquet ;
 *  · **le résultat doit porter STRICTEMENT PLUS de 6 que la ligne de chiffres
 *    dont il sort.** Une triche qui coûte sans rien acheter n'a pas lieu d'être
 *    jouée (même discipline que `mpf`, `m1s2`, `mad`) ;
 *  · **au moins un paquet de plusieurs chiffres**, sans quoi l'opérateur n'a
 *    fait qu'écrire les nombres chiffre à chiffre — un geste que personne ne
 *    lui a demandé, et qui porterait dans l'URL un code pour rien.
 *
 * ── Ce que le plan rend ─────────────────────────────────────────────────────
 *
 * `{ chiffres, multi, paquets }`, où `chiffres` est la ligne éclatée
 * (`{v, src}`), `multi` l'ensemble des nombres qui ont vraiment été éclatés, et
 * `paquets` la découpe retenue (`{debut, fin, somme, v}`).
 */
const CHIFFRES_REDECOUPE_MAX = 36;

/**
 * ★ Et une largeur MINIMALE, parce que c'est un DERNIER RECOURS.
 *
 * « Après l'étape 15, il y a 32 chiffres. C'est le moment de tricher » —
 * l'auteur situe lui-même le geste : on redécoupe une ligne devenue trop
 * longue pour être lue, pas une poignée de nombres qu'on saurait traiter
 * autrement.
 *
 * ★ **Le seuil est DEUX FOIS la portée de `mad`, plus un — vingt-cinq.**
 * L'addition sélective renonce au-delà de douze chiffres (« on n'additionne
 * plus, on bricole », `CHIFFRES_MAX`). Le redécoupage ne commence que là où
 * même DEUX fois cette portée ne suffirait pas : une ligne qu'on ne pourrait
 * pas sauver en additionnant deux fois plus loin que la première triche ne
 * l'ose. Les deux ne se recouvrent donc jamais, et il reste entre elles une
 * plage — de treize à vingt-quatre chiffres — où AUCUNE des deux ne s'applique,
 * ce qui est le comportement voulu : ni assez court pour la retouche, ni assez
 * long pour la refonte.
 *
 * ⚠️ MESURÉ, et le chiffre vient de la mesure autant que de l'analogie. Deux
 * dégâts distincts, tous deux sur des saisies témoins, et deux paliers :
 *
 *  1. **sans aucun seuil**, `mrd` s'appliquait à presque tous les vecteurs et
 *     saturait les listes de candidats — non pas en battant les voies
 *     honnêtes, mais en les évinçant AVANT le classement (le moteur ne
 *     canonicalise que les premiers chemins de chaque fragment,
 *     `assemblage.js › K_CANONISABLES`). « Donald Trump » perdait alors
 *     `tca+m14+m36,fr13+tca+m14+m36` (score 6 475) au profit de `fatb+tca+mt9+mr9,n7`
 *     (4 278) — une voie qui n'emploie même pas `mrd` —, et « Wikipedia »
 *     perdait `fr+tca+masb+mrn` (8 296) pour `fr13+tca+mhe+mrn` (4 361). Aucun réglage
 *     du barème n'y pouvait rien : ce qui tombait n'était pas classé plus bas,
 *     il n'était plus là. Un seuil à dix-neuf les ramène tous les deux ;
 *  2. **à dix-neuf et à vingt-deux**, il restait « Millicent », où
 *     `fr13+tca+mx6+mrd` (trois séries) se glissait au rang 2 derrière
 *     `fr13+tca+mx6+mrn` (deux séries) : la liste affichait un compte de séries qui
 *     REMONTE, ce qu'un test de classement interdit depuis toujours. Et aucun
 *     tarif ne pouvait le corriger — au rang des séries, c'est leur NOMBRE qui
 *     commande, avant le score (`score.js › ordreTotal`). À vingt-cinq, la voie
 *     ne se propose plus, et le corpus entier des dix-neuf saisies témoins est
 *     stable.
 *
 * L'exemple de l'auteur — trente-deux chiffres — reste au-dessus du seuil,
 * lequel n'a jamais été autre chose que ce qu'il décrit : « après l'étape 15,
 * il y a 32 chiffres. C'est le moment de tricher ».
 */
const CHIFFRES_REDECOUPE_MIN = 2 * CHIFFRES_MAX + 1;

/**
 * Largeur maximale d'un paquet. Six chiffres, et c'est un CHOIX de lisibilité
 * plutôt qu'une borne arithmétique : une racine numérique de 6 s'obtient avec
 * une somme de 6, 15, 24, 33… donc, en principe, avec autant de chiffres qu'on
 * veut. Au-delà de six termes sous une même accolade, la scène ne se lit plus
 * et l'addition cesse d'être vérifiable d'un coup d'œil — c'est le même seuil
 * que `mad`, pour la même raison de mise en scène.
 */
const PAQUET_MAX = 6;

/** La racine numérique — « somme, répétée si besoin », dans les mots de l'auteur. */
function racineNumerique(n) {
  let x = n;
  while (x > 9) {
    let s = 0;
    for (const c of String(x)) s += Number(c);
    x = s;
  }
  return x;
}

function planRedecoupage(valeur) {
  if (!valeur.length) return null;
  if (valeur.some((v) => !Number.isInteger(v) || v < 0)) return null;
  const chiffres = [];
  valeur.forEach((v, i) => {
    for (const c of String(v)) chiffres.push({ v: Number(c), src: i });
  });
  const n = chiffres.length;
  if (n < CHIFFRES_REDECOUPE_MIN || n > CHIFFRES_REDECOUPE_MAX) return null;

  // ── la programmation dynamique, de la fin vers le début
  const meilleur = Array.from({ length: n + 1 }, () => null);
  meilleur[n] = { six: 0, paquets: 0, coupe: 0, somme: 0, v: 0 };
  for (let i = n - 1; i >= 0; i--) {
    // Un 6 déjà écrit reste seul dans son paquet : on ne l'absorbe jamais.
    const large = chiffres[i].v === SIX ? 1 : PAQUET_MAX;
    let somme = 0;
    for (let L = 1; L <= large && i + L <= n; L++) {
      // …et l'on ne va pas non plus le chercher plus loin dans le paquet.
      if (L > 1 && chiffres[i + L - 1].v === SIX) break;
      somme += chiffres[i + L - 1].v;
      const suite = meilleur[i + L];
      if (!suite) continue;
      const v = racineNumerique(somme);
      const six = suite.six + (v === SIX ? 1 : 0);
      const paquets = suite.paquets + 1;
      const cur = meilleur[i];
      // Départage explicite, dans l'ordre dicté : plus de 6, puis moins de
      // paquets, puis la coupe la plus courte — c'est-à-dire la première
      // rencontrée, `L` étant croissant.
      if (!cur || six > cur.six || (six === cur.six && paquets < cur.paquets)) {
        meilleur[i] = { six, paquets, coupe: L, somme, v };
      }
    }
  }

  const paquets = [];
  const multi = new Set();
  const parSource = new Map();
  chiffres.forEach((c) => parSource.set(c.src, (parSource.get(c.src) || 0) + 1));
  for (const [src, k] of parSource) if (k > 1) multi.add(src);

  let i = 0;
  let groupes = 0;
  while (i < n) {
    const b = meilleur[i];
    if (!b || !b.coupe) return null;
    paquets.push({ debut: i, fin: i + b.coupe, somme: b.somme, v: b.v });
    if (b.coupe > 1) groupes++;
    i += b.coupe;
  }
  if (!groupes) return null;
  const avant = chiffres.filter((c) => c.v === SIX).length;
  const apres = paquets.filter((p) => p.v === SIX).length;
  return apres > avant ? { chiffres, multi, paquets } : null;
}

/** L'identifiant de scène du kᵉ chiffre — même règle que pour `mad`. */
const idChiffreRedecoupe = (plan, ctx, k) => (plan.multi.has(plan.chiffres[k].src)
  ? `${ctx.cle}c${k}` : ctx.ids[plan.chiffres[k].src]);

/** L'identifiant du jᵉ paquet — neuf si, et seulement si, il naît d'une addition. */
const idPaquet = (plan, ctx, p, j) => (p.fin - p.debut < 2
  ? idChiffreRedecoupe(plan, ctx, p.debut) : `${ctx.cle}s${j}`);


// ───────────────────────────────────────────────────────────────────────────
// La figure « sept segments » du Registre
// ───────────────────────────────────────────────────────────────────────────

/**
 * ★ Le Registre est l'équivalent accessible OBLIGATOIRE (CONTRACTS §6) : la
 * scène est `aria-hidden`, donc tout ce qui est montré doit s'y retrouver.
 *
 * Écrire « H → 3 » en typographie courante y perdait le sujet même de la
 * méthode : la question n'est pas « combien de lignes dans un H de Jost\* »,
 * c'est « combien de lignes dans le H d'une calculette ». Le Registre montre
 * donc la lettre SUR L'AFFICHEUR, lui aussi — en police sept segments
 * (`src/app/registre.js`, `--afficheur`), pas en dessin : un caractère reste
 * un caractère, lisible par un lecteur d'écran, sélectionnable, copiable,
 * agrandissable, sans équivalent textuel à écrire à la main.
 *
 * Le scénario reste du JSON pur (CONTRACTS §3, invariant 8) : il ne transporte
 * pas de rendu, seulement DE QUOI rendre — le glyphe, les segments allumés que
 * la scène va allumer, le compte, et `texte`, l'équivalent en une ligne pour
 * la région live et pour tout repli sans DOM.
 *
 * `segments` n'est pas décoratif : c'est la trace de ce que la SCÈNE allume,
 * conservée à côté du glyphe pour que les deux restent confrontables (voir la
 * réserve de fidélité notée dans `tables/seg7.js`).
 */
function figureSeg7(glyphe, segments, fusionne, valeur) {
  if (!segments) return null;
  return {
    type: 'seg7',
    glyphe,
    segments,
    fusion: fusionne,
    valeur,
    texte: `${glyphe} \u2192 ${valeur}`,
  };
}

/**
 * La même figure, pour l'afficheur **quatorze** segments.
 *
 * Une différence de fond avec `figureSeg7`, et elle est heureuse : la table
 * `SEG14` est DÉRIVÉE de DSEG14 Classic, la police même que Le Registre
 * affiche (voir l'en-tête de `tables/seg14.js`). Le glyphe montré et les
 * segments allumés par la scène sont donc le même dessin — il n'y a pas
 * d'« écart de police » à consigner, et le lecteur qui recompte les segments
 * du glyphe retombe sur le nombre annoncé juste à côté.
 *
 * `segments` voyage en TABLEAU : deux des quatorze noms de segments font deux
 * caractères (`g1`, `g2`), une chaîne les rendrait ambigus.
 */
function figureSeg14(glyphe, segments, fusionne, valeur) {
  if (!segments) return null;
  return {
    type: 'seg14',
    glyphe,
    segments: [...segments],
    fusion: fusionne,
    valeur,
    texte: `${glyphe} \u2192 ${valeur}`,
  };
}

/** Paliers d'une réduction théosophique : 199 → [19, 10, 1]. */
function paliersReduction(depart, arrivee) {
  const out = [];
  let v = Math.abs(depart);
  for (let garde = 0; garde < 12 && v !== arrivee; garde++) {
    const suivant = [...String(v)].reduce((a, d) => a + Number(d), 0);
    if (suivant === v) break;
    out.push(suivant);
    v = suivant;
  }
  return out;
}

/**
 * ★ La table de correspondance **dérivée de l'opérateur lui-même**.
 *
 * C'est le cœur du contrôle croisé exigé par CONTRACTS §0.3, appliqué aux
 * conversions par table : ce qui sera DESSINÉ n'est pas une seconde copie de
 * `PYTHAGORE`, de `SCRABBLE_FR` ou de `T9` — c'est `fn`, la fonction même que
 * `apply()` emploie, évaluée sur les vingt-six lettres. Une divergence entre la
 * table montrée et la table utilisée est donc **impossible par construction**,
 * exactement comme `tables/derivees.js` rend impossible qu'un compte de traits
 * diffère du tracé qu'on dessine.
 *
 * Le moteur visuel refuse en outre de faire redescendre une valeur qui ne
 * serait pas dans la case (`src/visuel/primitives/table.js`), et le pont la
 * recoupe une troisième fois (`src/recherche/scenario.js`).
 *
 * @param {(c:string)=>number|null} fn      la fonction de l'opérateur
 * @param {{noteDe?:Function, labelDe?:Function}} [opts]
 *        `noteDe` — l'intermédiaire à MONTRER quand il y en a un (le code
 *        morse, la lettre hébraïque, le nom français de la lettre) : sans lui,
 *        « H → 4 » resterait une affirmation même table à l'appui.
 * @returns {ReadonlyArray<{char:string,value:number,note?:string,label?:string}>}
 */
function tableDe(fn, opts = {}) {
  const out = [];
  for (const char of LETTRES) {
    const v = fn(char);
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const e = { char, value: v };
    const label = opts.labelDe ? opts.labelDe(char) : null;
    if (label && label !== char) e.label = label;
    const note = opts.noteDe ? opts.noteDe(char) : null;
    if (note) e.note = note;
    out.push(Object.freeze(e));
  }
  return Object.freeze(out);
}

/** Le morse, écrit comme il se lit : points ronds et traits longs, même compte. */
const morseLisible = (c) => {
  const m = MORSE[c];
  return m === undefined ? null : [...m].map((s) => (s === '-' ? '\u2013' : '\u00b7')).join('');
};

/** Un mappeur lettre à lettre : `null` dès qu'un jeton n'est pas une lettre seule. */
function parLettre(fn) {
  return (valeur, traces) => {
    const out = [];
    for (const tok of valeur) {
      const chars = [...String(tok)];
      if (chars.length !== 1) return null;
      const v = fn(chars[0]);
      if (v === null || v === undefined || !Number.isFinite(v)) return null;
      out.push(v);
    }
    if (!out.length) return null;
    return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
  };
}

/**
 * Étape d'un mappeur : chaque jeton devient son nombre.
 *
 * Les primitives dédiées travaillent **jeton par jeton** — `target`, pas
 * `pairs` : une op par lettre, pas une op pour toute la ligne.
 *
 * `sevenSeg` et `countStrokes` MONTRENT le comptage au-dessus de chaque lettre
 * sans rien remplacer : la substitution des lettres par leurs nombres vient dans
 * un SECOND step, sinon les deux animeraient l'opacité des mêmes tokens en même
 * temps.
 *
 * `keyboard` émet **un step par jeton** : chaque op anime la caméra (recul,
 * recentrage, retour), et deux claviers dans un même step se contrediraient —
 * `src/visuel/scenario.js` le refuse statiquement.
 */
function etapeMappeur(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, apres.valeur.length);
    const carDe = (i) => [...String(avant.valeur[i] ?? '')][0] || '';
    // `pli` = sans accent, en capitale — exactement le pliage qu'applique
    // `apply()`. Sans lui, « é » chercherait un glyphe « É » qui n'existe pas.
    const pliCar = (i) => pli(carDe(i));
    const substitution = {
      op: 'substitute',
      stagger: 90,
      pairs: apres.valeur.map((n, i) => ({ target: ctx.ids[i], to: token(sortie[i], n, 'number') })),
    };

    const afficheur = spec.geste === 'sevenSeg' || spec.geste === 'fourteenSeg';
    if (afficheur || spec.geste === 'countStrokes') {
      // ★ UN STEP PAR JETON. Les trois primitives — sept segments, quatorze
      // segments, tracé de crayon — montent la lettre dans un
      // encart, l'y changent de police (afficheur, ou tracé de crayon), posent
      // un compteur, allument un élément à la fois — et c'est le nombre du
      // compteur qui, à la fin, redescend remplacer la lettre. Montrer quatre
      // lettres à la fois donnerait quatre chantiers simultanés : illisible.
      // Une chose à la fois, et tant pis pour la durée.
      //
      // `count` est le contrôle croisé exigé par CONTRACTS §0.3 : le moteur
      // visuel refuse d'allumer, de tracer ou de pointer un nombre différent de
      // celui qu'annonce l'arithmétique. Il redérive le compte du tracé qu'il
      // dessine — les deux viennent de `tables/glyphes.js`, donc ce que le
      // spectateur voit est littéralement ce qui a été compté.
      const montrer = (n, i) => {
        const to = token(sortie[i], n, 'number');
        if (spec.geste === 'fourteenSeg') {
          return {
            op: 'fourteenSeg',
            target: ctx.ids[i],
            // Un TABLEAU de noms : deux des quatorze segments s'écrivent sur
            // deux caractères (`g1`, `g2`), une chaîne les rendrait ambigus.
            segments: [...(segments14De(pliCar(i)) || [])],
            fusion: spec.mode === 'fusion',
            count: n,
            to,
          };
        }
        if (spec.geste === 'sevenSeg') {
          return {
            op: 'sevenSeg',
            target: ctx.ids[i],
            segments: segmentsDe(pliCar(i)) || '',
            // L'afficheur 7 segments connaît aussi les CHIFFRES, la table
            // vectorielle non (52 glyphes, les lettres). Un chiffre n'a donc pas
            // de tracé de référence à montrer — et n'en a pas besoin : il est
            // déjà la forme que l'afficheur va dessiner.
            glyph: GLYPHES[pliCar(i)] ? pliCar(i) : '',
            fusion: spec.mode === 'fusion',
            count: n,
            to,
          };
        }
        return {
          op: 'countStrokes',
          target: ctx.ids[i],
          mode: spec.metrique,
          // Même pliage que `apply()` (`pli`, puis la casse de la méthode) :
          // c'est le glyphe COMPTÉ qui doit être le glyphe DESSINÉ.
          glyph: spec.casse === 'maj' ? pliCar(i) : pliCar(i).toLowerCase(),
          count: n,
          to,
        };
      };
      return apres.valeur.map((n, i) => {
        // ★ Sur un afficheur, la lettre est MONTRÉE sur l'afficheur dans le
        // Registre aussi, pas seulement dans la scène (`figureSeg7`,
        // `figureSeg14`).
        // La règle y devient la question posée — « combien faut-il de lignes
        // droites pour former cette lettre ? » — et la réponse est la figure
        // elle-même : l'afficheur, une flèche, le nombre.
        let figure = null;
        if (spec.geste === 'sevenSeg') {
          figure = figureSeg7(pliCar(i), segmentsDe(pliCar(i)) || '', spec.mode === 'fusion', n);
        } else if (spec.geste === 'fourteenSeg') {
          figure = figureSeg14(pliCar(i), segments14De(pliCar(i)) || null, spec.mode === 'fusion', n);
        }
        return etape(
          ctx,
          dire(spec.libelle, ctx.langue),
          figure ? dire(spec.regle, ctx.langue) : `${dire(spec.regle, ctx.langue)} : ${carDe(i)} → ${n}`,
          [montrer(n, i)],
          figure ? { id: `s_${ctx.cle}_${i}`, figure } : { id: `s_${ctx.cle}_${i}` },
        );
      });
    }

    if (spec.geste === 'table') {
      // ★ LA TABLE EST MONTRÉE, PAS ANNONCÉE — et l'aller-retour est INDIVIDUEL.
      //
      // Une lettre monte vers la table, sa case s'allume, **sa valeur en
      // redescend aussitôt à sa place** — puis seulement la lettre suivante.
      // Faire partir les quatre lettres puis revenir les quatre nombres d'un
      // bloc fait gagner du temps et perdre la démonstration : on ne voit plus
      // quelle lettre a donné quel nombre, c'est-à-dire exactement ce qu'il
      // fallait montrer. Un step par lettre, donc, comme pour l'encart de
      // comptage et pour le clavier.
      //
      // ★ Ce qu'on mutualise, c'est le DÉCOR. `montre` sur la première lettre,
      // `retire` sur la dernière : entre les deux, la table **reste montée**
      // et la caméra ne rebouge pas. Le déploiement se paie une fois, les
      // allers-retours gardent chacun leur rythme plein.
      const cases = new Map((spec.table || []).map((e) => [e.char, e]));
      const lettreDe = (i) => pliCar(i);
      const montrable = cases.size > 0 && apres.valeur.every((n, i) => {
        const e = cases.get(lettreDe(i));
        return e !== undefined && String(e.value) === String(n);
      });
      if (montrable) {
        const dernier = apres.valeur.length - 1;
        return apres.valeur.map((n, i) => {
          const e = cases.get(lettreDe(i));
          // L'intermédiaire est MONTRÉ dans Le Registre comme dans la scène :
          // « H → ···· → 4 » se suit, « H → 4 » se croit. Et c'est le glyphe
          // de la case qui est cité, pas la clé : la méthode ASCII du bas de
          // casse se lit « h → 104 ».
          const glyphe = e.label || e.char;
          const detail = e.note ? `${glyphe} → ${e.note} → ${n}` : `${glyphe} → ${n}`;
          return etape(
            ctx,
            dire(spec.libelle, ctx.langue),
            `${dire(spec.regle, ctx.langue)} : ${detail}`,
            [{
              op: 'table',
              disposition: spec.forme || 'reglette',
              ...(spec.colonnes ? { colonnes: spec.colonnes } : {}),
              // Le retour à la ligne au cycle et la teinte par valeur ne sont
              // pas des ornements : ils MONTRENT la règle de la table. Ils
              // voyagent donc avec elle, et le moteur visuel les recoupe.
              ...(spec.cycle ? { cycle: true } : {}),
              ...(spec.teinte ? { teinte: spec.teinte } : {}),
              // `ordre` déclenche l'oracle indépendant du moteur visuel : pour
              // la seule réglette alphabétique, il recalcule le rang au lieu de
              // nous croire, et confronte notre table à la sienne.
              ...(spec.ordre ? { ordre: spec.ordre } : {}),
              entries: (spec.table || []).map((t) => ({ ...t })),
              target: ctx.ids[i],
              letter: lettreDe(i),
              to: token(sortie[i], n, 'number'),
              // Le décor : monté à la première, gardé au milieu, retiré à la
              // dernière. Une seule op de caméra à chaque bout.
              montre: i === 0,
              retire: i === dernier,
            }],
            { id: `s_${ctx.cle}_${i}` },
          );
        });
      }
      // Repli : un caractère hors de la table. On n'affirme rien qu'on ne sait
      // pas montrer — on substitue, sans table.
    }

    if (spec.geste === 'keyboard') {
      const mesure = spec.mesureClavier || 'touche';
      const disposition = spec.disposition === 'qwerty' ? 'qwerty' : 'azerty';
      const rangees = disposition === 'qwerty' ? QWERTY : AZERTY;
      // Le pliage doit être celui d'`apply()` : la mesure « touche » lit le
      // caractère TEL QUEL (« - », « è »), les deux autres le replient sur sa
      // lettre (« É » → « e »), comme `colonne()` et `rangee()` le font.
      const toucheDe = (i) => (mesure === 'touche'
        ? carDe(i).toLowerCase()
        : pliCar(i).toLowerCase());
      // Filtre en amont, sur les tables du moteur : le jeu de caractères du
      // clavier est connu ici, il n'a pas à être découvert à la compilation.
      const surLeClavier = (c) => (mesure === 'touche'
        ? chiffreDeTouche(c) !== null
        : colonne(c, rangees) !== null);

      if (apres.valeur.every((_, i) => surLeClavier(toucheDe(i)))) {
        // Un step par jeton : chaque `keyboard` anime la caméra, et deux
        // claviers dans un même step se contrediraient.
        return apres.valeur.map((n, i) => etape(
          ctx,
          dire(spec.libelle, ctx.langue),
          `${dire(spec.regle, ctx.langue)} : ${toucheDe(i)} → ${n}`,
          [{
            op: 'keyboard',
            target: ctx.ids[i],
            key: toucheDe(i),
            layout: disposition,
            mesure,
            to: token(sortie[i], n, 'number'),
          }],
          { id: `s_${ctx.cle}_${i}` },
        ));
      }
      // Repli : une touche hors du clavier modélisé. On n'affirme rien qu'on ne
      // sait pas montrer — on substitue, sans clavier.
    }

    const regle = dire(spec.regle, ctx.langue);
    const legende = spec.geste ? `${regle} — ${apres.valeur.join(', ')}` : regle;
    return [etape(ctx, dire(spec.libelle, ctx.langue), legende, [substitution])];
  };
}

/**
 * ★ Étape d'une mesure : un comptage SE COMPTE, caractère par caractère.
 *
 * Le geste précédent — on encadre, tout se ramasse d'un bloc, un nombre reste —
 * *affirmait* : rien n'y distinguait « on compte les lettres » de « on compte
 * les voyelles », et le nombre annoncé n'était jamais celui qu'on avait vu se
 * former. Désormais chaque caractère **compté** descend dans la pointe de
 * l'accolade et fait avancer le compteur d'un cran ; ce qui n'est pas compté
 * s'efface sur place, sans le faire bouger. C'est ce qui rend la règle visible
 * : sur `hope.fr`, le point ne compte pas, et on le voit ne pas compter.
 *
 * `cibles(valeur)` dit QUELS caractères comptent (par leur rang), `doubles`
 * ceux qui comptent **deux** fois — ils sont recopiés sur une ligne étiquetée
 * juste au-dessus, et l'on voit chaque voyelle passer deux fois dans
 * l'accolade. Sans cette ligne, « les lettres, plus les voyelles » resterait
 * une formule.
 *
 * Garde-fou d'émetteur : si le nombre de cibles (doublons compris) ne retombe
 * pas sur `compte(valeur)`, on n'émet pas le geste — le moteur visuel le
 * refuserait de toute façon (contrôle croisé), mais un échec de compilation se
 * produirait au clic de l'utilisateur. On retombe alors sur le geste sobre.
 */
function etapeMesure(spec) {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, 1);
    const titre = dire(spec.libelle, ctx.langue);
    const to = token(sortie[0], apres.valeur, 'number');
    const compte = comptageDe(spec, avant.valeur, apres.valeur, ctx);
    if (compte) {
      return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`,
        [opComptage({ ...compte, symbole: '#', libelle: titre, to })], { hold: 400 })];
    }
    return [etape(ctx, titre, `${dire(spec.regle, ctx.langue)} : ${apres.valeur}`, retirerAccolade(enchainer([
      // Une mesure est un dénombrement : le symbole seul (`#`) serait cryptique,
      // l'accolade porte donc aussi la règle en toutes lettres.
      ctx.ids.length > 1
        ? { op: 'group', targets: ctx.ids, symbol: '#', label: titre }
        : null,
      ctx.ids.length > 1 ? { op: 'drop', targets: ctx.ids.slice(1), stagger: 20 } : null,
      { op: 'substitute', pairs: [{ target: ctx.ids[0], to }] },
    ])))];
  };
}

/**
 * Ce que l'accolade comptera, ou `null` si la mesure ne sait pas le désigner
 * caractère par caractère (elle retombe alors sur le geste sobre).
 */
function comptageDe(spec, valeur, total, ctx) {
  if (typeof spec.cibles !== 'function' || ctx.ids.length < 2) return null;
  const rangs = spec.cibles(valeur);
  const rangsDoubles = typeof spec.doubles === 'function' ? spec.doubles(valeur) : [];
  const valide = (r) => Number.isInteger(r) && r >= 0 && r < ctx.ids.length;
  if (!Array.isArray(rangs) || !rangs.every(valide)) return null;
  if (!Array.isArray(rangsDoubles) || !rangsDoubles.every((r) => valide(r) && rangs.includes(r))) return null;
  // Contrôle croisé côté émetteur : ce qu'on va MONTRER doit faire le compte.
  if (rangs.length + rangsDoubles.length !== total) return null;
  const chars = [...valeur];
  return {
    ids: ctx.ids,
    count: rangs.map((r) => ctx.ids[r]),
    doubles: rangsDoubles.map((r) => ({
      target: ctx.ids[r],
      to: token(`${ctx.cle}d${r}`, chars[r], 'letter'),
    })),
    doublesLabel: rangsDoubles.length ? dire(spec.motDouble, ctx.langue) : null,
  };
}

/** Fabrique une mesure `STR → NUM`. */
const mesureStr = (spec) => def({
  ...spec,
  famille: 'mesure',
  from: 'STR',
  to: 'NUM',
  apply: (valeur, traces) => {
    const n = spec.compte(valeur);
    if (n === null || !Number.isFinite(n)) return null;
    return { valeur: n, traces: [fusion(traces)] };
  },
  steps: etapeMesure(spec),
});

const lettres = (s) => [...s].filter(estLettre);

// ── Ce que l'accolade compte, par rang de caractère ────────────────────────
// Un rang, un caractère à l'écran : `ctx.ids[r]` est le jeton du r-ième signe
// de la saisie. Ces prédicats sont la SOURCE de ce qui vole dans l'accolade,
// et `compte()` reste la source du nombre : le contrôle croisé confronte les
// deux, et l'étape retombe sur le geste sobre s'ils ne s'accordent pas.
const rangs = (s, test) => [...s].map((c, i) => (test(c, i) ? i : -1)).filter((i) => i >= 0);
const rangsLettres = (s) => rangs(s, estLettre);
const rangsVoyelles = (s) => rangs(s, (c) => estLettre(c) && estVoyelle(c));
const rangsConsonnes = (s) => rangs(s, (c) => estLettre(c) && !estVoyelle(c));
const MOT_VOYELLE = bilingue('voyelle', 'vowel');
const MOT_CONSONNE = bilingue('consonne', 'consonant');

const MESURES = [
  {
    id: 'n.longueur', code: 'nl',
    libelle: bilingue('On compte les lettres', 'Count the letters'),
    regle: bilingue('Le nombre de lettres du mot', 'How many letters the word has'),
    notoriete: 0.60,
    compte: (s) => lettres(s).length || null,
    cibles: rangsLettres,
  },
  {
    id: 'n.voyelles', code: 'nv',
    libelle: bilingue('On compte les voyelles', 'Count the vowels'),
    regle: bilingue('A, E, I, O, U', 'A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter(estVoyelle).length || null,
    cibles: rangsVoyelles,
  },
  {
    id: 'n.consonnes', code: 'nc',
    libelle: bilingue('On compte les consonnes', 'Count the consonants'),
    regle: bilingue('Toutes les lettres sauf A, E, I, O, U', 'Every letter but A, E, I, O, U'),
    notoriete: 0.85,
    compte: (s) => lettres(s).filter((c) => !estVoyelle(c)).length || null,
    cibles: rangsConsonnes,
  },
  {
    id: 'n.lettresDistinctes', code: 'nd',
    libelle: bilingue('On compte les lettres distinctes', 'Count the distinct letters'),
    regle: bilingue('Une lettre répétée ne compte qu’une fois', 'A repeated letter counts only once'),
    notoriete: 0.70,
    compte: (s) => new Set(lettres(s).map(pli)).size || null,
    // Seule la PREMIÈRE occurrence compte ; les redites s'effacent sans faire
    // avancer le compteur, et c'est là qu'on voit la règle.
    cibles: (s) => {
      const vus = new Set();
      return rangs(s, (c) => {
        if (!estLettre(c) || vus.has(pli(c))) return false;
        vus.add(pli(c));
        return true;
      });
    },
  },
  {
    id: 'n.separateurs', code: 'nsp',
    libelle: bilingue('On compte les séparateurs', 'Count the separators'),
    regle: bilingue('Les tirets, points et barres', 'Dashes, dots and slashes'),
    notoriete: 0.65,
    compte: (s) => [...s].filter((c) => /[-._/]/.test(c)).length || null,
    cibles: (s) => rangs(s, (c) => /[-._/]/.test(c)),
  },
  {
    id: 'n.mots', code: 'nm',
    libelle: bilingue('On compte les mots', 'Count the words'),
    regle: bilingue('Ce que séparent les tirets, points et barres',
      'Whatever the dashes, dots and slashes set apart'),
    notoriete: 0.80,
    compte: (s) => decouperMots(s).length || null,
    // Un mot n'est pas un jeton : c'est sa PREMIÈRE lettre qui le représente
    // dans l'accolade — une par mot, et l'on compte bien des mots.
    cibles: (s) => decouperMots(s).map((m) => m.debut),
  },
  {
    id: 'n.lettresPlusVoyelles', code: 'nlv',
    libelle: bilingue('Les lettres, plus les voyelles', 'The letters, plus the vowels'),
    regle: bilingue('Nombre de lettres + nombre de voyelles', 'Letter count + vowel count'),
    notoriete: 0.40, adHoc: 0.1,
    compte: (s) => {
      const l = lettres(s);
      return l.length ? l.length + l.filter(estVoyelle).length : null;
    },
    cibles: rangsLettres,
    doubles: rangsVoyelles,
    motDouble: MOT_VOYELLE,
  },
  {
    id: 'n.lettresPlusConsonnes', code: 'nlc',
    libelle: bilingue('Les lettres, plus les consonnes', 'The letters, plus the consonants'),
    regle: bilingue('Nombre de lettres + nombre de consonnes', 'Letter count + consonant count'),
    notoriete: 0.40, adHoc: 0.1,
    note: bilingue(
      'Cousine de la précédente : sur un mot dont voyelles et consonnes '
      + 's’équilibrent, les deux tombent juste en même temps.',
      'A close cousin of the previous one: on a word where vowels and consonants '
      + 'balance out, the two land on the same number at the same time.',
    ),
    compte: (s) => {
      const l = lettres(s);
      return l.length ? l.length + l.filter((c) => !estVoyelle(c)).length : null;
    },
    cibles: rangsLettres,
    doubles: rangsConsonnes,
    motDouble: MOT_CONSONNE,
  },
].map(mesureStr);

const MAPPEURS_LETTRE = [
  {
    id: 'm.a1z26', code: 'ma1',
    libelle: bilingue('Chaque lettre vaut son rang dans l’alphabet',
      'Each letter is worth its alphabetical rank'),
    regle: bilingue('A=1, B=2, … Z=26', 'A=1, B=2, … Z=26'),
    notoriete: 0.90,
    geste: 'table', forme: 'reglette', ordre: 'a1z26',
    fn: (c) => valeurTable(A1Z26, pli(c)),
  },
  {
    id: 'm.z26a1', code: 'mz26',
    libelle: bilingue('Chaque lettre vaut son rang inversé',
      'Each letter is worth its reversed alphabetical rank'),
    regle: bilingue('A=26, B=25, … Z=1', 'A=26, B=25, … Z=1'),
    notoriete: 0.45,
    geste: 'table', forme: 'reglette', ordre: 'z26a1',
    fn: (c) => valeurTable(Z26A1, pli(c)),
  },
  {
    id: 'm.pythagore', code: 'mpy',
    libelle: bilingue('Numérologie pythagoricienne', 'Pythagorean numerology'),
    regle: bilingue('Le rang réduit à un chiffre : 1 à 9, cycliquement',
      'The rank cut down to one digit: 1 to 9, over and over'),
    notoriete: 0.80,
    // ★ Une case par lettre, dans l'ordre alphabétique — et un RETOUR À LA
    // LIGNE là où la table recommence. La pythagoricienne réduit le rang
    // modulo 9 : en cassant la ligne à chaque retour au 1, on obtient trois
    // rangées qui s'alignent colonne par colonne — « A J S » valent 1, « B K
    // T » valent 2 — et la règle SE VOIT au lieu d'être affirmée. Le
    // découpage est dérivé des valeurs, pas d'un « 9 » écrit ici : le moteur
    // visuel refuserait cette mise en page si les colonnes ne se répondaient
    // pas (`src/visuel/primitives/table.js`, `verifierCycle`).
    geste: 'table', forme: 'reglette', cycle: true,
    fn: (c) => valeurTable(PYTHAGORE, pli(c)),
  },
  {
    id: 'm.chaldeen', code: 'mch',
    libelle: bilingue('Numérologie chaldéenne', 'Chaldean numerology'),
    regle: bilingue('Table chaldéenne traditionnelle — elle ignore le 9',
      'The traditional Chaldean table — it leaves out the 9'),
    notoriete: 0.55,
    // ★ Réglette simple, ordre alphabétique, deux rangées de treize — la MÊME
    // forme que la gématrie simple, et c'est tout l'argument. La table
    // chaldéenne ne vient pas d'un calcul mais d'une tradition sonore : elle
    // n'est pas positionnelle, elle n'emploie jamais le 9, et rien ne s'y
    // répète cycliquement. Un retour à la ligne (`cycle`) y serait un MENSONGE
    // VISUEL — il suggérerait une régularité qui n'existe pas ; le moteur
    // visuel le refuserait d'ailleurs. Un regroupement par valeur affirmerait
    // que « ces lettres vont ensemble » sans jamais dire pourquoi. Reste
    // l'ordre alphabétique : on y cherche sa lettre comme dans un
    // dictionnaire, et l'absence de 9 se constate en parcourant les cases.
    geste: 'table', forme: 'reglette',
    fn: (c) => valeurTable(CHALDEEN, pli(c)),
  },
  {
    id: 'm.englishX6', code: 'mx6',
    libelle: bilingue('Gématrie anglaise', 'English gematria'),
    regle: bilingue('Le rang multiplié par six : A=6, B=12, … Z=156',
      'The rank times six: A=6, B=12, … Z=156'),
    notoriete: 0.30, adHoc: 0.15,
    geste: 'table', forme: 'reglette',
    fn: (c) => valeurTable(ENGLISH_X6, pli(c)),
  },
  {
    id: 'm.scrabbleFR', code: 'msfr',
    libelle: bilingue('Points du Scrabble français', 'French Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition française',
      'The tile values of the game, French edition'),
    notoriete: 0.75,
    // Une case par lettre, ordre alphabétique — l'ordre où l'on CHERCHE une
    // lettre —, et un fond de case d'autant plus contrasté que le jeton vaut
    // cher : le « K » à 10 points se repère avant d'être lu. La teinte
    // redouble le nombre écrit dans la case, elle ne le remplace jamais
    // (design §5.1, « couleur seule : jamais »).
    geste: 'table', forme: 'reglette', teinte: 'valeur',
    fn: (c) => valeurTable(SCRABBLE_FR, pli(c)),
  },
  {
    id: 'm.scrabbleEN', code: 'msen',
    libelle: bilingue('Points du Scrabble anglais', 'English Scrabble points'),
    regle: bilingue('La valeur des jetons du jeu, édition anglaise',
      'The tile values of the game, English edition'),
    notoriete: 0.70,
    geste: 'table', forme: 'reglette', teinte: 'valeur',
    fn: (c) => valeurTable(SCRABBLE_EN, pli(c)),
  },
  {
    id: 'm.t9', code: 'mt9',
    libelle: bilingue('Touche du clavier téléphonique', 'Phone keypad key'),
    regle: bilingue('ABC=2, DEF=3, … WXYZ=9 (norme ITU E.161)',
      'ABC=2, DEF=3, … WXYZ=9 (ITU E.161 standard)'),
    notoriete: 0.70,
    // ★ Le PAVÉ, et la SEULE table où une case porte plusieurs lettres : les
    // huit touches à leur place sur le téléphone, la touche 1 dessinée vide
    // parce qu'elle l'est. Ici le groupement n'est pas une commodité de mise
    // en page, c'est l'objet lui-même — la touche 7 porte vraiment « PQRS ».
    // Une réglette de vingt-six cases aurait dit la même chose sans jamais
    // ressembler à ce dont elle parle.
    geste: 'table', forme: 'pave',
    fn: (c) => valeurTable(T9, pli(c)),
  },
  {
    id: 'm.morseSignaux', code: 'mms',
    libelle: bilingue('Signaux du morse', 'Morse signals'),
    regle: bilingue('Le nombre de points et de traits de la lettre',
      'How many dots and dashes the letter takes'),
    notoriete: 0.60,
    // Le code EST l'argument : « B → –··· → 4 » se compte à l'œil, « B → 4 »
    // se croit. La note porte donc le code, et la valeur le compte.
    geste: 'table', forme: 'reglette', noteDe: morseLisible,
    fn: (c) => morseSignaux(pli(c)),
  },
  {
    id: 'm.morseTraits', code: 'mmt',
    libelle: bilingue('Traits du morse', 'Morse dashes'),
    regle: bilingue('Les traits seuls, sans les points', 'The dashes alone, dots not counted'),
    notoriete: 0.35, adHoc: 0.15,
    geste: 'table', forme: 'reglette', noteDe: morseLisible,
    fn: (c) => morseTraits(pli(c)),
  },
  {
    id: 'm.asciiMaj', code: 'masc',
    libelle: bilingue('Code ASCII de la capitale', 'ASCII code of the capital'),
    regle: bilingue('A=65, B=66, … Z=90', 'A=65, B=66, … Z=90'),
    notoriete: 0.45,
    geste: 'table', forme: 'reglette',
    fn: (c) => (estLettre(pli(c)) ? pli(c).charCodeAt(0) : null),
  },
  {
    id: 'm.asciiMin', code: 'masb',
    libelle: bilingue('Code ASCII du bas de casse', 'ASCII code of the lower-case letter'),
    regle: bilingue('a=97, b=98, … z=122', 'a=97, b=98, … z=122'),
    notoriete: 0.45,
    // La table montre le BAS DE CASSE, puisque c'est lui qu'on code : afficher
    // « A → 97 » ferait mentir la case.
    geste: 'table', forme: 'reglette', labelDe: (c) => c.toLowerCase(),
    fn: (c) => (estLettre(pli(c)) ? pli(c).toLowerCase().charCodeAt(0) : null),
  },
  {
    id: 'm.seg7', code: 'm7',
    libelle: bilingue('Lettre vers nombre de segments', 'Letter to number of segments'),
    regle: bilingue('Sur afficheur 7 segments (calculette par exemple), combien faut-il '
      + 'allumer de segments pour former cette lettre ?',
      'On a seven-segment display (a pocket calculator, say), how many segments have to '
      + 'light up to form this letter?'),
    notoriete: 0.55,
    note: MENTION_SEG7, geste: 'sevenSeg', mode: 'segments',
    fn: (c) => compteSegments(pli(c)),
  },
  {
    id: 'm.seg7Fusion', code: 'm7F',
    // ★ « TRAITS », pas « lignes ». Le mot « ligne » est RÉSERVÉ à un comptage
    // distinct, à venir : celui des seules HORIZONTALES de l'afficheur — les
    // segments a, d et g, trois horizontales disjointes (voir
    // `tables/seg7.js`). Employer « ligne » ici ferait se confondre les deux
    // méthodes le jour où la seconde arrivera. La légende, elle, garde
    // « lignes droites » : elle décrit le geste du dessin, pas l'unité comptée.
    libelle: bilingue('Lettre vers nombre de traits', 'Letter to number of strokes'),
    regle: bilingue('Sur afficheur 7 segments (calculette par exemple), combien faut-il '
      + 'de lignes droites pour former cette lettre ?',
      'On a seven-segment display (a pocket calculator, say), how many straight lines does '
      + 'it take to form this letter?'),
    notoriete: 0.50, note: MENTION_SEG7, geste: 'sevenSeg', mode: 'fusion',
    fn: (c) => compteTraitsFusionnes(pli(c)),
  },
  {
    id: 'm.traitsMaj', code: 'mtrc',
    libelle: bilingue('Traits de crayon, en capitale', 'Pen strokes, in capitals'),
    regle: bilingue('Le nombre de levées de stylo pour tracer la capitale',
      'How many times the pen goes down to draw the capital'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'traits', casse: 'maj',
    fn: (c) => mesureGlyphe('traits', 'maj', pli(c)),
  },
  {
    id: 'm.traitsMin', code: 'mtrb',
    libelle: bilingue('Traits de crayon, en bas de casse', 'Pen strokes, in lower case'),
    regle: bilingue('Le nombre de levées de stylo pour tracer la minuscule',
      'How many times the pen goes down to draw the small letter'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'traits', casse: 'min',
    fn: (c) => mesureGlyphe('traits', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.extremitesMaj', code: 'mexc',
    libelle: bilingue('Extrémités libres, en capitale', 'Free ends, in capitals'),
    regle: bilingue('Les bouts de trait qui ne rejoignent rien', 'The stroke ends that meet nothing'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'extremites', casse: 'maj',
    fn: (c) => mesureGlyphe('extremites', 'maj', pli(c)),
  },
  {
    id: 'm.extremitesMin', code: 'mexb',
    libelle: bilingue('Extrémités libres, en bas de casse', 'Free ends, in lower case'),
    regle: bilingue('Les bouts de trait qui ne rejoignent rien', 'The stroke ends that meet nothing'),
    notoriete: 0.40,
    geste: 'countStrokes', metrique: 'extremites', casse: 'min',
    fn: (c) => mesureGlyphe('extremites', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.bouclesMaj', code: 'mboc',
    libelle: bilingue('Boucles fermées, en capitale', 'Closed loops, in capitals'),
    regle: bilingue('Les trous du glyphe', 'The holes in the glyph'),
    notoriete: 0.50,
    geste: 'countStrokes', metrique: 'boucles', casse: 'maj',
    fn: (c) => mesureGlyphe('boucles', 'maj', pli(c)),
  },
  {
    id: 'm.bouclesMin', code: 'mbob',
    libelle: bilingue('Boucles fermées, en bas de casse', 'Closed loops, in lower case'),
    regle: bilingue('a, b, d, e, g, o, p, q valent 1, les autres 0',
      'a, b, d, e, g, o, p, q are worth 1, the rest 0'),
    notoriete: 0.50,
    geste: 'countStrokes', metrique: 'boucles', casse: 'min',
    fn: (c) => mesureGlyphe('boucles', 'min', pli(c).toLowerCase()),
  },
  {
    id: 'm.azertyColonne', code: 'mazc',
    libelle: bilingue('Colonne de la touche, en AZERTY', 'Key column, on a French AZERTY'),
    regle: bilingue('Le rang de la touche dans sa rangée — donc le chiffre juste au-dessus',
      'Where the key sits in its row — hence the digit right above it'),
    notoriete: 0.30, note: NOTE_AFNOR, geste: 'keyboard', disposition: 'azerty', mesureClavier: 'colonne',
    fn: (c) => colonne(pli(c), AZERTY),
  },
  {
    id: 'm.azertyRangee', code: 'mazr',
    libelle: bilingue('Rangée de la touche, en AZERTY', 'Key row, on a French AZERTY'),
    regle: bilingue('1 en haut, 2 au milieu, 3 en bas', '1 at the top, 2 in the middle, 3 at the bottom'),
    notoriete: 0.20, adHoc: 0.2,
    note: NOTE_AFNOR, geste: 'keyboard', disposition: 'azerty', mesureClavier: 'rangee',
    fn: (c) => rangee(pli(c), AZERTY),
  },
  {
    id: 'm.qwertyColonne', code: 'mqwc',
    libelle: bilingue('Colonne de la touche, en QWERTY', 'Key column, on a US QWERTY'),
    regle: bilingue('Le rang de la touche dans sa rangée, sur un clavier américain',
      'Where the key sits in its row, on a US keyboard'),
    notoriete: 0.30, geste: 'keyboard', disposition: 'qwerty', mesureClavier: 'colonne',
    fn: (c) => colonne(pli(c), QWERTY),
  },
  {
    id: 'm.qwertyRangee', code: 'mqwr',
    libelle: bilingue('Rangée de la touche, en QWERTY', 'Key row, on a US QWERTY'),
    regle: bilingue('1 en haut, 2 au milieu, 3 en bas', '1 at the top, 2 in the middle, 3 at the bottom'),
    notoriete: 0.20, adHoc: 0.2,
    geste: 'keyboard', disposition: 'qwerty', mesureClavier: 'rangee',
    fn: (c) => rangee(pli(c), QWERTY),
  },
  {
    id: 'm.hebreu', code: 'mhe',
    libelle: bilingue('Gématrie hébraïque', 'Hebrew gematria'),
    regle: bilingue('On translittère en hébreu, puis on lit la valeur des lettres',
      'Transliterate into Hebrew, then read off the value of each letter'),
    notoriete: 0.55,
    note: NOTE_SOURCAGE,
    // La translittération est la moitié de la méthode : la case montre la
    // lettre hébraïque avant sa valeur, sans quoi le saut « P → 80 » serait
    // une affirmation de plus.
    geste: 'table', forme: 'reglette', noteDe: (c) => TRANSLIT_HEBREU[c] || null,
    fn: (c) => valeurHebreu(pli(c)),
  },
  {
    id: 'm.grec', code: 'mgr',
    libelle: bilingue('Isopséphie grecque', 'Greek isopsephy'),
    regle: bilingue('On translittère en grec, puis on lit la valeur des lettres',
      'Transliterate into Greek, then read off the value of each letter'),
    notoriete: 0.55,
    note: NOTE_SOURCAGE,
    geste: 'table', forme: 'reglette', noteDe: (c) => TRANSLIT_GREC[c] || null,
    fn: (c) => valeurGrec(pli(c)),
  },
  {
    id: 'm.longueurNom', code: 'mln',
    libelle: bilingue('Longueur du nom de la lettre', 'Length of the letter’s French name'),
    regle: bilingue('On épelle : « effe » vaut 4, « double vé » vaut 8',
      'Spell it out in French: "effe" is 4 letters, "double vé" is 8'),
    // La table des noms de lettres est FRANÇAISE (`NOM_LETTRE_FR`) : la méthode
    // reste française quelle que soit la langue de l'interface. On le dit.
    note: bilingue(
      'Les noms de lettres employés sont les noms français : « effe », « double vé », « i grec ».',
      'The letter names used here are the French ones — "effe", "double vé", "i grec" — '
      + 'not the English "ef", "double-u", "why". The method is French, and stays French.',
    ),
    notoriete: 0.15, adHoc: 0.25,
    // ★ Ce n'en est pas moins une table lettre → nombre : simplement, la
    // correspondance passe par un MOT, et c'est le mot qui prouve le nombre.
    // La case porte donc les trois : « W → double vé → 8 ». Neuf colonnes,
    // parce que « double vé » ne tient pas dans une case de treizième.
    geste: 'table', forme: 'reglette', colonnes: 9,
    noteDe: (c) => NOM_LETTRE_FR[c] || null,
    fn: (c) => {
      const nom = NOM_LETTRE_FR[pli(c)];
      return nom ? [...sansAccents(nom)].filter(estLettre).length : null;
    },
  },
].map((spec) => {
  const {
    fn, geste, mode, metrique, casse, disposition, mesureClavier,
    forme, colonnes, cycle, teinte, noteDe, labelDe, ...reste
  } = spec;
  const base = {
    ...reste, geste, mode, metrique, casse, disposition, mesureClavier,
    forme, colonnes, cycle, teinte,
    // ★ La table MONTRÉE est dérivée de `fn`, la fonction même que `apply()`
    // applique. Une seule source, donc aucune divergence possible.
    table: geste === 'table' ? tableDe(fn, { noteDe, labelDe }) : null,
  };
  return def({
    ...reste,
    famille: 'mappeur',
    from: 'TOKENS',
    to: 'NUMS',
    apply: parLettre(fn),
    steps: etapeMappeur(base),
  });
});

const AUTRES_MAPPEURS = [
  def({
    id: 'm.longueurToken', code: 'mlm', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Chaque mot vaut son nombre de lettres', 'Each word is worth its letter count'),
    regle: bilingue('On compte les lettres de chaque jeton', 'Count the letters of every token'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const out = valeur.map((tok) => [...String(tok)].filter(estLettre).length);
      if (!out.length || out.some((n) => n === 0)) return null;
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    steps: etapeMappeur({
      libelle: bilingue('Chaque mot vaut son nombre de lettres', 'Each word is worth its letter count'),
      regle: bilingue('On compte les lettres de chaque jeton', 'Count the letters of every token'),
    }),
  }),
  def({
    id: 'm.reduireChaque', code: 'mrn', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit'),
    regle: bilingue('Réduction théosophique, nombre par nombre',
      'Theosophical reduction, one number at a time'),
    notoriete: 0.65,
    apply: (valeur, traces) => {
      const racine = (n) => (n === 0 ? 0 : 1 + ((Math.abs(n) - 1) % 9));
      const out = valeur.map(racine);
      if (out.every((v, i) => v === valeur[i])) return null;
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // La sortie n'invente d'identifiant que pour les nombres qui CHANGENT :
    // un nombre déjà réduit garde le sien, et aucun step ne le touche.
    sortie: (avant, apres, ctx) => apres.valeur.map((v, i) => (v === avant.valeur[i]
      ? ctx.ids[i] : nomToken(ctx, i))),
    /**
     * Un `reduce` par PALIER et un step par palier (research visuel §4.8) : le
     * moteur visuel ne boucle jamais tout seul, et `reduce` refuse d'afficher
     * une somme de chiffres qui ne tombe pas sur son résultat — 199 passe donc
     * par 19 puis 10, jamais d'un bond.
     */
    steps: (avant, apres, ctx) => {
      const steps = [];
      apres.valeur.forEach((cible, i) => {
        if (cible === avant.valeur[i]) return;
        const suite = paliersReduction(avant.valeur[i], cible);
        let source = ctx.ids[i];
        let texte = String(Math.abs(avant.valeur[i]));
        suite.forEach((v, k) => {
          const dernier = k === suite.length - 1;
          const cibleId = dernier ? nomToken(ctx, i) : `${ctx.cle}_${i}r${k}`;
          steps.push(etape(ctx, dire(LIB_REDUIRE_CHAQUE, ctx.langue), `${texte} → ${[...texte].join(' + ')} → ${v}`, [{
            op: 'reduce',
            target: source,
            digits: [...texte].map((d, j) => token(`${ctx.cle}_${i}d${k}x${j}`, d, 'digit')),
            to: token(cibleId, v, 'number'),
          }], { id: `s_${ctx.cle}_${i}_${k}` }));
          source = cibleId;
          texte = String(v);
        });
      });
      return steps;
    },
  }),
  def({
    id: 'm.retirerZeros', code: 'm0', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: bilingue('On retire les zéros', 'Drop the zeros'),
    regle: bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum'),
    notoriete: 0.35, adHoc: 0.2, commute: true,
    apply: (valeur, traces) => {
      const gardes = [];
      valeur.forEach((v, i) => { if (v !== 0) gardes.push(i); });
      if (!gardes.length || gardes.length === valeur.length) return null;
      return { valeur: gardes.map((i) => valeur[i]), traces: gardes.map((i) => traces[i] || []) };
    },
    sortie: (avant, apres, ctx) => ctx.ids.filter((_, i) => avant.valeur[i] !== 0),
    // `drop` resserre déjà les survivants : un `move` de plus animerait
    // « translate » une seconde fois sur les mêmes tokens.
    steps: (avant, apres, ctx) => [etape(ctx, dire(LIB_ZEROS, ctx.langue), dire(REG_ZEROS, ctx.langue), enchainer([
      { op: 'drop', targets: ctx.ids.filter((_, i) => avant.valeur[i] === 0), stagger: 40 },
      { op: 'highlight', targets: ctx.ids.filter((_, i) => avant.valeur[i] !== 0), mode: 'select' },
    ]))],
  }),
  // ★ « Le tiret du 6 » — méthode 6 du README, enfin atteignable.
  //
  // Le registre des codes est append-only (CONTRACTS §4.1) : `m0` était le
  // dernier alloué, celui-ci prend `mtc`. Il n'existait AUCUN opérateur capable
  // de rendre 6 sur les deux tirets de `hope-hope-hope` — la table
  // `TIRET_DU_SIX` existait, mais personne ne l'exploitait, et `m.azertyColonne`
  // cherche dans les rangées de LETTRES : la colonne d'un « - » y vaut `null`.
  def({
    id: 'm.toucheChiffre', code: 'mtc', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Le chiffre qui partage la touche',
      'The digit that shares the same key'),
    regle: bilingue(
      'Sur un AZERTY, le tiret est sur la touche du 6 — et de même & = 1, é = 2, " = 3, '
      + "' = 4, ( = 5, è = 7, _ = 8, ç = 9, à = 0",
      'On a French AZERTY the dash sits on the 6 key — and likewise & = 1, é = 2, " = 3, '
      + "' = 4, ( = 5, è = 7, _ = 8, ç = 9, à = 0",
    ),
    notoriete: 0.75, adHoc: 0.05,
    note: NOTE_AFNOR,
    apply: parLettre(chiffreDeTouche),
    steps: etapeMappeur({
      libelle: bilingue('Le chiffre qui partage la touche',
        'The digit that shares the same key'),
      regle: bilingue('Le tiret du 6, et ses neuf voisines de la rangée du haut',
        'The dash on the 6 — and its nine neighbours on the top row'),
      geste: 'keyboard', disposition: 'azerty', mesureClavier: 'touche',
    }),
  }),
  // ★ L'afficheur QUATORZE segments — deux méthodes de plus, et deux codes
  // neufs. Le registre est append-only (CONTRACTS §4.1) : `mtc` était le dernier
  // alloué, ceux-ci prennent `m14` et `m14F`. Rien n'est recyclé, `m7` et `m7F`
  // gardent leur comportement mot pour mot.
  //
  // Ce que le quatorze segments apporte au CALCUL — c'est la question posée :
  // sept lettres y valent 6 segments (`D E G H N O P`) contre deux en sept
  // segments (`A` et `O`), si bien que `HOP` s'y écrit littéralement 6·6·6 ;
  // et la borne des traits fusionnés passe de 5 à 10, ce qui ouvre des sommes
  // que le sept segments ne savait pas produire.
  def({
    id: 'm.seg14', code: 'm14', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Lettre vers nombre de segments, en 14 segments',
      'Letter to number of segments, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments (celui des autoradios et des tableaux '
      + 'd’affichage), combien faut-il allumer de segments pour former cette lettre ?',
      'On a fourteen-segment display (the one in car radios and station boards), how many '
      + 'segments have to light up to form this letter?'),
    notoriete: 0.40,
    note: MENTION_SEG14,
    apply: parLettre((c) => compteSegments14(pli(c))),
    steps: etapeMappeur({
      libelle: bilingue('Lettre vers nombre de segments, en 14 segments',
        'Letter to number of segments, on a fourteen-segment display'),
      regle: bilingue('Sur afficheur 14 segments (celui des autoradios et des tableaux '
        + 'd’affichage), combien faut-il allumer de segments pour former cette lettre ?',
        'On a fourteen-segment display (the one in car radios and station boards), how many '
        + 'segments have to light up to form this letter?'),
      geste: 'fourteenSeg', mode: 'segments',
    }),
  }),
  def({
    id: 'm.seg14Fusion', code: 'm14F', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    // ★ « TRAITS », pas « lignes » — même réserve qu'en sept segments (`m7F`) :
    // le mot « ligne » reste réservé au comptage des seules HORIZONTALES.
    // Le quatorze segments en compte trois (`a`, `d`, et la médiane `g1`+`g2`
    // qui n'en fait qu'une), ce qui rendrait la confusion d'autant plus facile.
    libelle: bilingue('Lettre vers nombre de traits, en 14 segments',
      'Letter to number of strokes, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments, combien faut-il de lignes droites '
      + 'continues pour former cette lettre ?',
      'On a fourteen-segment display, how many unbroken straight lines does it take to '
      + 'form this letter?'),
    notoriete: 0.35,
    note: MENTION_SEG14,
    apply: parLettre((c) => compteTraitsFusionnes14(pli(c))),
    steps: etapeMappeur({
      libelle: bilingue('Lettre vers nombre de traits, en 14 segments',
        'Letter to number of strokes, on a fourteen-segment display'),
      regle: bilingue('Sur afficheur 14 segments, combien faut-il de lignes droites '
        + 'continues pour former cette lettre ?',
        'On a fourteen-segment display, how many unbroken straight lines does it take to '
        + 'form this letter?'),
      geste: 'fourteenSeg', mode: 'fusion',
    }),
  }),
  // ★ « On retourne les 9 » — le pendant VECTORIEL de `p.retournement` (`pr9`).
  //
  // Ce que le moteur faisait jusqu'ici des 9 qu'il produisait : il les
  // additionnait. Deux 9 font 18, qui se réduit en 9, qu'on additionnait à un
  // 3 pour faire 12, qui se réduit en 3 — et ce 3 finissait par rencontrer un
  // autre 3 pour faire le 6 qu'on cherchait, au prix de trois étapes et de
  // deux valeurs sacrifiées. Or le catalogue savait DÉJÀ qu'un 9 retourné est
  // un 6 : il ne le savait que sur un nombre isolé (`pr9`, `NUM → NUM`), après
  // que tout eut été réduit à un seul. Sur un vecteur, chaque 9 vaut un 6
  // gratuit — et c'est un 6 de plus par jeton, pas un 6 à la place de trois.
  //
  // Le gisement est réel et il est systématique. La gématrie anglaise (`mx6` :
  // A = 6, B = 12 … Z = 156) ne rend que des multiples de 6, donc de 3 ;
  // la réduction chiffre à chiffre (`mrn`) d'un multiple de 3 est un multiple
  // de 3 à un chiffre, c'est-à-dire 3, 6 ou 9 et rien d'autre. Un vecteur
  // `m5 + mt` est donc, littéralement, un tiers de 6, un tiers de 9 —
  // et ce tiers-là était perdu.
  //
  // ★ Ce n'est PAS un filtre. Rien n'est jeté, rien n'est réordonné, la
  // largeur du vecteur ne bouge pas d'un jeton : c'est ce qui la rend honnête
  // (on ne choisit pas ses valeurs après coup), et c'est aussi ce qui la rend
  // recevable par la MOISSON, qui exige une valeur par jeton reçu
  // (`src/recherche/assemblage.js › uneValeurParJeton`). Un filtre « on ne
  // garde que les 9 » aurait rapporté les mêmes 6 en trichant.
  //
  // Registre append-only (CONTRACTS §4.1) : `m14F` était le dernier alloué,
  // celui-ci prend `mr9`. `pr9` n'est pas touché et garde son comportement mot
  // pour mot — les deux coexistent, l'un sur un nombre, l'autre sur un vecteur.
  def({
    id: 'm.retournerLesNeuf', code: 'mr9', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_RETOURNER_9,
    regle: bilingue('Un 9 retourné d’un demi-tour donne un 6',
      'Give a 9 a half-turn and it becomes a 6'),
    // ★ Mêmes chiffres que `pr9`, et pour les mêmes raisons. La ficelle est
    // connue de tout le monde sans être respectée de personne (notoriété 0,25),
    // et elle est franchement ad hoc (0,35) : elle ne s'autorise que d'une
    // coïncidence de dessin, pas d'une propriété du nombre. Le fait qu'elle
    // rapporte davantage sur un vecteur ne change ni ce que le public en sait,
    // ni ce qu'elle vaut : la déclarer moins ad hoc parce qu'elle est devenue
    // rentable reviendrait à truquer le classement pour se donner raison.
    notoriete: 0.25, adHoc: 0.35,
    note: bilingue(
      'On ne retourne que les 9. Retourner un 6 serait, disons, contre-productif.',
      'Only the 9s get turned. Turning a 6 would be, shall we say, counter-productive.',
    ),
    apply: (valeur, traces) => {
      // ★ L'`exige` de `pr9` (« n === 9 »), transposé au vecteur : sans un seul
      // 9, l'opérateur REFUSE au lieu de rendre son entrée. Un mappeur qui rend
      // ce qu'il a reçu fabrique une étape que `scenario.js` saute
      // silencieusement (« une transformation qui ne transforme RIEN À
      // L'ÉCRAN ») — le chemin porterait alors dans son URL un code que la
      // démonstration ne montre nulle part, et deux programmes distincts
      // rejoueraient la même scène.
      if (!valeur.some((n) => n === 9)) return null;
      const out = valeur.map((n) => (n === 9 ? 6 : n));
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // Seuls les 9 reçoivent un identifiant neuf. Les autres gardent le leur :
    // aucun step ne les touche, et un renommage sans geste ferait croire au
    // pont qu'un jeton a été remplacé alors qu'il n'a pas bougé.
    sortie: (avant, apres, ctx) => apres.valeur.map((v, i) => (v === avant.valeur[i]
      ? ctx.ids[i] : nomToken(ctx, i))),
    /**
     * ★ Un seul step, et les 9 s'y retournent L'UN APRÈS L'AUTRE.
     *
     * `enchainer` donne à chaque `flip180` un `at` calculé sur la fin du
     * précédent : le spectateur voit une vague traverser la ligne, pas un
     * clignotement collectif. C'est la contrainte de lisibilité du projet — une
     * accélération qui « efface tout puis remet tout d'un coup » a déjà été
     * rejetée —, et c'est aussi une nécessité technique : `flip180` muni d'un
     * `to` appelle `ctx.reflow()`, et deux reflow simultanés animeraient deux
     * fois `translate` sur les mêmes jetons (voir `enchainer`, commun.js).
     *
     * Un step et non un par 9, contrairement à `table` ou `sevenSeg` : ceux-là
     * doivent montrer QUELLE lettre a donné QUEL nombre, donc un aller-retour à
     * la fois. Ici le 9 tourne SUR PLACE et devient un 6 à sa place : il n'y a
     * aucune attribution à préserver, et douze steps portant le même titre
     * noieraient Le Registre au lieu de l'instruire.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3). La valeur d'arrivée n'est jamais
     * écrite en dur : elle est LUE dans `apres.valeur[i]`, c'est-à-dire dans ce
     * qu'`apply()` a calculé, et la comparaison avec `avant.valeur[i]` décide
     * seule quels jetons bougent. Il n'existe donc pas de seconde copie qui
     * puisse diverger. `src/visuel/primitives/flip180.js` recoupe une deuxième
     * fois — il refuse de faire naître autre chose qu'un 6 d'autre chose qu'un
     * 9 — et `src/recherche/scenario.js` une troisième, où l'on connaît encore
     * la valeur du jeton de départ.
     */
    steps: (avant, apres, ctx) => {
      const ops = [];
      const neufs = [];
      apres.valeur.forEach((v, i) => {
        if (v === avant.valeur[i]) return; // ce jeton n'est pas un 9 : il ne bouge pas
        const id = nomToken(ctx, i);
        neufs.push(id);
        ops.push({ op: 'flip180', target: ctx.ids[i], to: token(id, v, 'number') });
      });
      if (!ops.length) return [];
      // Le `pulse` final vient APRÈS le dernier demi-tour, jamais pendant :
      // pendant, le jeton d'arrivée voit déjà son `scale` animé par le
      // crossfade de `flip180` (même raison que dans `posts.js`).
      ops.push({ op: 'pulse', targets: neufs, stagger: 60 });
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_RETOURNER_9, ctx.langue), legende, enchainer(ops))];
    },
  }),
  // ★ « Trois 6 d'affilée » — une TROUVAILLE, et surtout pas un tri.
  //
  // ── Ce que ce n'est PAS ────────────────────────────────────────────────────
  // Ce n'est pas « On ne garde que les 6 » (`recolterLesSix`, `src/recherche/
  // scenario.js`). Cette étape-là RASSEMBLE : elle va chercher des 6 dispersés
  // dans le vecteur, écarte ce qui les sépare et les met bout à bout. C'est un
  // aveu — elle dit que le calcul a produit autre chose que des 6 et qu'on
  // choisit après coup —, et la doctrine de l'auteur la traite comme telle :
  // une seule fois, en avant-dernière étape, et au prix d'un malus de score
  // (CONTRACTS §3.1, amendement « On ne garde que les 6 »).
  //
  // Ici, rien n'est rassemblé. Les trois 6 sont DÉJÀ côte à côte dans le
  // vecteur, dans cet ordre, sans rien entre eux : le 666 est écrit avant
  // qu'on le regarde. On ne le fabrique pas, on le CONSTATE — et c'est
  // exactement ce qui autorise à effacer le reste. Effacer ce qui n'appartient
  // pas à une suite qu'on n'a pas choisie n'est pas du tri : c'est arrêter de
  // lire quand la phrase est finie.
  //
  // ★ Le nom porte cette différence, et il doit continuer de la porter :
  // « d'affilée » est le mot qui interdit l'assouplissement. La question
  // « et si on acceptait trois 6 non contigus ? » a une réponse, c'est non —
  // trois 6 non contigus, c'est précisément l'autre geste, celui qui coûte.
  //
  // ── Plusieurs suites, ou une suite plus longue ? ───────────────────────────
  // On prend LA PREMIÈRE suite, et ses TROIS PREMIERS 6. Deux raisons, et
  // aucune n'est une préférence esthétique :
  //
  //  · la première, parce que c'est celle qu'on rencontre en lisant de gauche
  //    à droite. Prendre « la plus longue » ou « la mieux placée » demanderait
  //    de COMPARER les suites, c'est-à-dire de choisir — et le jour où l'on
  //    choisit, on est revenu au tri qu'on refuse. Lire n'est pas comparer ;
  //  · trois, parce que 666 fait trois 6 et pas quatre. Un `[6,6,6,6]` gardé
  //    entier obligerait le verdict à trancher lui-même où couper, et il s'y
  //    refuse à juste titre (`primitives/reveal.js` : « y ouvrir un vide après
  //    le troisième affirmerait un 666 + 6 que personne n'a démontré »).
  //
  // C'est déterministe (CONTRACTS §4.4) : une URL rejouée retrouve la même
  // suite, sans dépendre d'un tri, d'un maximum, ni de l'ordre d'itération.
  //
  // Registre append-only (CONTRACTS §4.1, registre FERMÉ) : `mr9` était le
  // dernier alloué, celui-ci prend `m36`. Aucun code existant n'est touché.
  def({
    id: 'm.troisSixDAffilee', code: 'm36', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_TROUVAILLE,
    regle: bilingue(
      'Une suite de trois 6 contigus, prise telle quelle. On ne rassemble rien, on la trouve.',
      'A run of three adjacent 6s, taken as it stands. Nothing is gathered, it is found.',
    ),
    // ★ Notoriété 0,80. Personne n'a besoin qu'on lui explique que trois 6
    // écrits côte à côte font 666 — c'est le seul endroit du catalogue où la
    // règle est déjà connue du spectateur avant d'être énoncée. Ce n'est pas
    // 1,00 pour autant : la moitié « et l'on s'arrête là » est une convention
    // de la maison, pas un savoir partagé. La moitié qu'on reconnaît vaut le
    // barème plein (heuristique §4.3, ligne « A1Z26 »), l'autre nettement
    // moins ; 0,80 est le point honnête entre les deux.
    //
    // ★ AdHoc 0,20, et pas zéro. Cet opérateur n'existe que parce qu'on
    // cherche 666 : c'est, au sens strict, une étape taillée pour la cible.
    // Mais il ne FABRIQUE rien — pas de coïncidence de dessin comme le
    // retournement du 9 (0,35), pas de valeur absolue de secours (0,25) —, et
    // il ne choisit pas où s'arrêter : la contiguïté désigne un seul endroit
    // possible. On pénalise donc, moitié moins que la pirouette, sans exclure
    // (heuristique §4.5).
    notoriete: 0.30, adHoc: 0.20,
    note: bilingue(
      'Contigus, vraiment. Trois 6 éparpillés dans le vecteur ne font pas un 666, ils font trois 6.',
      'Adjacent, truly. Three 6s scattered through the vector are not a 666, they are three 6s.',
    ),
    apply: (valeur, traces) => {
      const d = debutDesTroisSix(valeur);
      if (d < 0) return null;
      // ★ REFUS quand il n'y a rien à effacer, pour la raison qui a déjà fait
      // refuser `mr9` sur un vecteur sans 9 : un mappeur qui rend son entrée
      // fabrique une étape que `scenario.js` saute silencieusement (« une
      // transformation qui ne transforme RIEN À L'ÉCRAN »), et le chemin
      // porterait alors dans son URL un code que la démonstration ne montre
      // nulle part. Un vecteur qui vaut déjà `[6,6,6]` n'a pas besoin qu'on
      // lui dise qu'il vaut `[6,6,6]`.
      if (valeur.length === SUITE) return null;
      return {
        valeur: [6, 6, 6],
        traces: [0, 1, 2].map((k) => traces[d + k] || []),
      };
    },
    // Les trois survivants GARDENT leur identifiant de jeton : ils n'ont pas
    // bougé, ils n'ont pas changé de valeur, et rien ne les a remplacés. Leur
    // donner un nom neuf ferait croire au pont qu'un jeton en a remplacé un
    // autre, et l'animation raconterait un travail qui n'a pas eu lieu.
    sortie: (avant, apres, ctx) => {
      const d = debutDesTroisSix(avant.valeur);
      return d < 0 ? [] : [0, 1, 2].map((k) => ctx.ids[d + k]);
    },
    /**
     * ★ CET OPÉRATEUR NE COURONNE PLUS — il DÉSIGNE et il EFFACE.
     *
     * **Ce qui a changé, et pourquoi.** Il émettait `horns` : les cornes
     * poussaient sur les trois 6 pendant que le reste de la séquence
     * s'effaçait, en un seul geste indivisible. L'auteur a tranché :
     *
     * > « L'ajout des cornes ne devrait pas modifier l'url mais être fait à la
     * > volée en mode `sce!` — ça éviterait d'avoir des liens `sce!` sans
     * > cornes parce qu'ils ont été créés avant. »
     *
     * Un couronnement qui dépend d'un CODE dépend de l'URL : un lien écrit
     * avant l'existence de `m36` ne montrait aucune corne, et un lien qui le
     * porte en montrait là où un autre, arithmétiquement identique, n'en
     * montrait pas. Or les cornes ne sont pas une étape de calcul — elles ne
     * changent ni une valeur, ni un rang, ni un compte. Elles n'ont donc rien
     * à faire dans un programme. Le couronnement appartient désormais à
     * l'assemblage, qui le décide sur la LIGNE et sur le REGISTRE, jamais sur
     * un code (`recherche/scenario.js › couronnerLesTriptyques`).
     *
     * **Et l'effacement, alors ?** Il reste ici, et il devient une étape à part
     * entière. C'est le seul des deux gestes qui soit de l'arithmétique : le
     * vecteur passe de `[6,6,6,7,3,6]` à `[6,6,6]`, la valeur change, le
     * programme doit donc en rendre compte et l'URL le nommer. Le couronnement,
     * lui, ne constate qu'une chose qui était déjà écrite.
     *
     * > « L'effacement est une étape à part, et si elle n'a pas de motif
     * > (chiffre minoritaire, pair/impair) c'est probablement la pire des
     * > triches, à pénaliser en conséquence. » (l'auteur)
     *
     * Le motif est ici MONTRÉ avant d'être exercé : le `highlight` désigne les
     * trois 6 contigus — c'est-à-dire la raison de garder ceux-là et pas
     * d'autres — et la gomme n'emporte que le reste. Ce que le barème
     * (`recherche/elegance.js`) fait de ce motif ne se décide pas ici.
     *
     * ★ **Le contrôle croisé n'y perd rien, et il y gagne un cran.** Le
     * troisième verrou (`visuel/primitives/horns.js`, la contiguïté relue sur
     * la ligne pleine) redoutait qu'un `drop` efface AVANT lui, le laissant
     * couronner trois 6 seuls donc trivialement voisins. C'est structurellement
     * impossible maintenant : l'assemblage ne couronne qu'à l'instant où le
     * troisième 6 PARAÎT, c'est-à-dire nécessairement avant cette étape-ci, et
     * il exige de surcroît que la contiguïté tienne jusqu'au verdict.
     *
     * ★ Restent les deux verrous d'ici, inchangés : `efface` et les désignés
     * sont dérivés du MÊME index `d`, relu sur `avant.valeur` — la valeur
     * qu'`apply()` a examinée —, et `recherche/scenario.js` recoupe.
     */
    steps: (avant, apres, ctx) => {
      const d = debutDesTroisSix(avant.valeur);
      if (d < 0) return [];
      const gardes = [0, 1, 2].map((k) => ctx.ids[d + k]);
      const efface = ctx.ids.filter((_, i) => i < d || i > d + 2);
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join('')}`;
      // La gomme de `drop` en mode `erase`, sans regroupement : un par un, sur
      // place, sans que rien ne bouge. Les trois 6 sont déjà d'un seul tenant,
      // il n'y a aucun trou à refermer entre eux — et un resserrement ferait
      // croire qu'on a fabriqué le 666 en rapprochant des chiffres épars.
      return [etape(ctx, dire(LIB_ARRET, ctx.langue), legende, [
        { op: 'highlight', targets: gardes, mode: 'select' },
        { op: 'drop', targets: efface, mode: 'erase', regroup: false, at: 300 },
      ])];
    },
  }),
  // ══════════════════════════════════════════════════════════════════════════
  // ★ LES TROIS FICELLES ASSUMÉES — `mpf`, `m1s2`, `mad`
  // ══════════════════════════════════════════════════════════════════════════
  //
  // « Ma demande c'est aussi de les ajouter au catalogue, mais avec un score
  //  bas, mais moins bas que la suppression arbitraire de ce qui n'est pas 6. »
  //  — l'auteur.
  //
  // Le barème d'élégance (`src/recherche/elegance.js`) portait depuis sa
  // construction trois paliers de malus — `MAJORITE`, `DECIMATION`,
  // `ADDITION_SELECTIVE` — dont les compteurs valaient TOUJOURS zéro : aucun
  // opérateur ne faisait ces choses-là. Les voici. Ils sont écrits pour être
  // pénalisés, et le barème les pénalise dans l'ordre que l'auteur dicte :
  //
  //     ne garder que les 6  >  le plus fréquent  >  un rang sur deux
  //                          >  l'addition sélective
  //
  // ★ **Registre append-only, registre FERMÉ** (CONTRACTS §4.1). `m36` était le
  // dernier code alloué ; ceux-ci prennent les trois rangs suivants. Aucun code
  // existant n'est touché, renommé ni réattribué, et aucune pierre tombale
  // n'est reprise. Le catalogue passe de 93 à 96 opérateurs. *(Ils se sont
  // d'abord écrits `mpf`, `m1s2`, `mad` : un code était alors un index base36,
  // et 36 s'y écrit « 10 ». Le renommage en codes parlants leur a donné `mpf`,
  // `m1s2` et `mad` ; leur rang au registre, lui, n'a pas bougé.)*
  //
  // ★ **Chacun doit se MONTRER** (CONTRACTS §0.3). C'est là que ces trois-là
  // sont difficiles : ce sont des ficelles, et une ficelle qu'on cache est pire
  // qu'une ficelle qu'on n'implémente pas. Aucune primitive n'a été ajoutée —
  // le vocabulaire reste à vingt et une (§3.1) —, mais chacun montre CE QUI
  // DÉCIDE avant de montrer ce qu'il fait : le décompte par valeur, le décompte
  // par parité, les termes qui s'additionnent.
  //
  // ★ **Chacun refuse d'être arbitraire.** Là où la règle pourrait avoir à
  // départager des ex æquo, elle ne tranche pas : elle REFUSE de s'appliquer.
  // C'est le seul départage qui ne soit pas un choix déguisé, et il rend le
  // déterminisme (§4.4) gratuit — aucun ordre de `Map`, aucun tri, aucune
  // préférence tacite pour le 6 ne peut s'y glisser.

  def({
    id: 'm.plusFrequent', code: 'mpf', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_PLUS_FREQUENT,
    regle: bilingue(
      'On compte chaque valeur ; la plus fréquente reste, les autres s’effacent. '
      + 'À égalité, personne ne l’emporte et la règle ne s’applique pas.',
      'Every value is tallied; the most frequent one stays, the rest are erased. '
      + 'On a tie nobody wins and the rule does not apply.',
    ),
    // ★ Notoriété 0,15. Personne, nulle part, n'a jamais entendu dire qu'en
    // numérologie « le chiffre majoritaire l'emporte » : c'est une règle de la
    // maison, inventée pour se débarrasser d'un gêneur. On ne lui prête donc
    // presque rien — juste ce que vaut l'idée de majorité, que tout le monde
    // comprend même si personne ne l'attend ici.
    //
    // ★ AdHoc 0,45, juste sous le joker (0,50). C'est la plus ad hoc des trois :
    // elle ne s'autorise d'aucune propriété du nombre, d'aucune coïncidence de
    // dessin — seulement d'un décompte fait après coup sur le résultat qu'on
    // vient d'obtenir. Elle n'est pas exclue pour autant (heuristique §4.5) :
    // le barème d'élégance porte la peine SPÉCIFIQUE du geste, `adHoc` ne porte
    // que la peine GÉNÉRIQUE — « taillé pour la cible ». Les deux ne mesurent
    // pas la même chose et ne se doublent donc pas.
    notoriete: 0.15, adHoc: 0.45,
    note: bilingue(
      'Le plus fréquent, quel qu’il soit — pas le 6. Faire gagner le 6 d’office, ce serait '
      + 'le tri arbitraire, c’est-à-dire le geste que celui-ci prétend valoir mieux que.',
      'The most frequent one, whichever it is — not the 6. Rigging it for the 6 would be '
      + 'the arbitrary sort, that is, the very gesture this one claims to beat.',
    ),
    apply: (valeur, traces) => {
      const dom = valeurDominante(valeur);
      if (!dom) return null;
      const gardes = [];
      valeur.forEach((v, i) => { if (v === dom.valeur) gardes.push(i); });
      return {
        valeur: gardes.map((i) => valeur[i]),
        traces: gardes.map((i) => traces[i] || []),
      };
    },
    // Les survivants n'ont ni bougé ni changé de valeur : ils gardent leur
    // identifiant de jeton. En inventer un neuf ferait croire au pont qu'un
    // jeton en a remplacé un autre (même raison que `m0` et `m36`).
    sortie: (avant, apres, ctx) => {
      const dom = valeurDominante(avant.valeur);
      return dom ? ctx.ids.filter((_, i) => avant.valeur[i] === dom.valeur) : [];
    },
    /**
     * ★ L'ACCOLADE DIT LE VERDICT, PUIS LES AUTRES DISPARAISSENT.
     *
     * « Indique sous l'accolade : "chiffre majoritaire : 6" et fais disparaître
     * les autres. » — l'auteur, mot pour mot. C'est le geste des combinateurs,
     * repris tel quel : l'accolade embrasse la ligne ENTIÈRE — c'est bien sur
     * elle entière qu'on a compté — et porte sous sa pointe la seule chose qui
     * décide. Puis les minoritaires tombent, et `drop` resserre les survivants
     * (un `move` de plus animerait « translate » une seconde fois sur les mêmes
     * jetons — voir `m0`).
     *
     * ★ La légende du Registre porte en outre le RELEVÉ complet — `6 ×4 · 4 ×1`
     * —, dérivé du même comptage qu'`apply()`. La scène dit qui gagne,
     * l'équivalent accessible (CONTRACTS §6) dit de combien : ce qui est montré
     * reste ce qui est compté, et l'on peut refaire l'addition soi-même.
     */
    steps: (avant, apres, ctx) => {
      const dom = valeurDominante(avant.valeur);
      if (!dom) return [];
      const gardes = ctx.ids.filter((_, i) => avant.valeur[i] === dom.valeur);
      const jetes = ctx.ids.filter((_, i) => avant.valeur[i] !== dom.valeur);
      const verdict = dire(bilingue(
        `chiffre majoritaire : ${dom.valeur}`,
        `most frequent digit: ${dom.valeur}`,
      ), ctx.langue);
      const ops = retirerAccolade(enchainer([
        { op: 'group', targets: ctx.ids, label: verdict, tighten: 0 },
        { op: 'drop', targets: jetes, mode: 'fall', stagger: 40 },
        { op: 'highlight', targets: gardes, mode: 'select' },
      ]));
      const legende = `${releveEcrit(avant.valeur)}  —  ${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_PLUS_FREQUENT, ctx.langue), legende, ops)];
    },
  }),
  def({
    id: 'm.unRangSurDeux', code: 'm1s2', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_UN_SUR_DEUX,
    regle: bilingue(
      'Une position sur deux — les impaires, ou les paires : celle des deux qui porte '
      + 'le plus de 6. À égalité de 6, aucune ne vaut mieux et la règle ne s’applique pas.',
      'Every other position — the odd ones or the even ones: whichever carries the most '
      + '6s. On an equal count neither is better and the rule does not apply.',
    ),
    // ★ Notoriété 0,20, à peine plus que la majorité : décimer une liste est un
    // geste que tout le monde sait faire, mais que personne n'attend d'une
    // numérologie. ★ AdHoc 0,38 — moins que la majorité (0,45), plus que le
    // retournement du 9 (0,35) : la parité est une propriété du RANG, pas une
    // propriété inventée sur mesure, mais le choix de la parité, lui, regarde
    // bien le résultat qu'on cherche. C'est l'ordre de laideur de l'auteur,
    // reporté sur `adHoc`.
    notoriete: 0.20, adHoc: 0.38,
    note: bilingue(
      'Oui, c’est biaisé : on nomme « position paire » ou « position impaire » pour se '
      + 'donner le droit de supprimer l’autre. On le dit plutôt que de le maquiller.',
      'Yes, it is rigged: naming it “even position” or “odd position” is what licenses '
      + 'deleting the other half. We say so rather than dress it up.',
    ),
    apply: (valeur, traces) => {
      const p = paritePorteuse(valeur);
      if (p < 0) return null;
      const gardes = [];
      valeur.forEach((_, i) => { if (i % 2 === p) gardes.push(i); });
      return {
        valeur: gardes.map((i) => valeur[i]),
        traces: gardes.map((i) => traces[i] || []),
      };
    },
    sortie: (avant, apres, ctx) => {
      const p = paritePorteuse(avant.valeur);
      return p < 0 ? [] : ctx.ids.filter((_, i) => i % 2 === p);
    },
    /**
     * ★ ON NOMME LA PARITÉ. ON NE LA JUSTIFIE PAS.
     *
     * « Oui, c'est de la triche décidée de manière biaisée. L'astuce est de
     * nommer "position paire" ou "position impaire" pour justifier de supprimer
     * l'autre. Le côté triche se traduit par un score d'élégance faible. » —
     * l'auteur, et c'est l'exacte consigne suivie ici.
     *
     * Il n'y a donc AUCUNE mise en scène qui chercherait à rendre le choix
     * légitime : l'accolade porte « on ne garde que les positions impaires »,
     * et c'est tout. Le geste est celui de `mpf`, au mot près — parce que c'est
     * la même chose : une règle énoncée, et ce qui n'y répond pas qui tombe.
     * Ce qui les sépare n'est pas le dessin, c'est le PRIX (`elegance.js` :
     * `DECIMATION` < `MAJORITE`, « moindre que la majorité », dit l'auteur).
     *
     * ★ Le Registre, lui, donne le relevé des DEUX parités : c'est ce qui
     * permet de vérifier que la règle de départage a été appliquée et non
     * inventée — mais c'est de l'équivalent accessible, pas un plaidoyer.
     */
    steps: (avant, apres, ctx) => {
      const p = paritePorteuse(avant.valeur);
      if (p < 0) return [];
      const gardes = ctx.ids.filter((_, i) => i % 2 === p);
      const jetes = ctx.ids.filter((_, i) => i % 2 !== p);
      const nomme = dire(p === 0
        ? bilingue('on ne garde que les positions impaires', 'keeping only the odd positions')
        : bilingue('on ne garde que les positions paires', 'keeping only the even positions'),
      ctx.langue);
      const ops = retirerAccolade(enchainer([
        { op: 'group', targets: ctx.ids, label: nomme, tighten: 0 },
        { op: 'drop', targets: jetes, mode: 'fall', stagger: 40 },
        { op: 'highlight', targets: gardes, mode: 'select' },
      ]));
      const legende = `${releveDesParites(avant.valeur, ctx.langue)}  —  ${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_UN_SUR_DEUX, ctx.langue), legende, ops)];
    },
  }),
  def({
    id: 'm.additionSelective', code: 'mad', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_ADDITION_SELECTIVE,
    regle: bilingue(
      'Chaque nombre s’écrit chiffre à chiffre, puis on n’additionne QUE les suites '
      + 'contiguës de chiffres dont la somme fait exactement 6 — jamais un 6 déjà là, '
      + 'jamais un zéro, et toujours la plus courte, de gauche à droite.',
      'Every number is written out digit by digit, then only the adjacent runs of digits '
      + 'that add up to exactly 6 are summed — never a 6 already there, never a zero, and '
      + 'always the shortest run, left to right.',
    ),
    // ★ Notoriété 0,30, la plus haute des trois : additionner des chiffres
    // contigus est le geste le plus banal de toute la numérologie — c'est ce
    // que fait la racine numérique. Ce qui est louche n'est pas l'addition,
    // c'est le fait de ne pas les additionner TOUS.
    //
    // ★ AdHoc 0,30, la plus basse des trois, et c'est l'auteur qui l'ordonne :
    // « c'est de la triche à utiliser en dernier recours », mais elle ne jette
    // rien — elle ABSORBE arithmétiquement, ce que l'auteur préfère
    // explicitement à « se débarrasser artificiellement de chiffres ».
    notoriete: 0.30, adHoc: 0.30,
    note: bilingue(
      'Sélective, donc discutable : on additionne 5+1 pour faire un 6, et l’on saute '
      + 'les 6 déjà là plutôt que de les détruire. Les signes + ne paraissent qu’entre '
      + 'les termes retenus — la sélection est sous les yeux, c’est le score qui la juge.',
      'Selective, hence arguable: 5+1 is added to make a 6, and the 6s already there are '
      + 'skipped rather than destroyed. The plus signs appear only between the chosen '
      + 'terms — the selection is in plain sight, and the score is what judges it.',
    ),
    apply: (valeur, traces) => {
      const plan = planAdditionSelective(valeur);
      if (!plan) return null;
      return {
        valeur: plan.sortie.map((s) => s.v),
        traces: plan.sortie.map((s) => fusion(
          ...plan.chiffres.slice(s.debut, s.fin).map((c) => traces[c.src] || []),
        )),
      };
    },
    // ★ Ce que la triche fait VOIR — voir `additions` dans `commun.js`.
    additions: (valeur) => {
      const plan = planAdditionSelective(valeur);
      return plan ? plan.sortie.filter((s) => s.fin - s.debut >= 2)
        .map((s) => s.fin - s.debut) : [];
    },
    sortie: (avant, apres, ctx) => {
      const plan = planAdditionSelective(avant.valeur);
      return plan ? plan.sortie.map((s, j) => idSortie(plan, ctx, s, j)) : [];
    },
    /**
     * ★ DEUX STEPS, PARCE QUE CE SONT DEUX GESTES.
     *
     * 1. **On écrit chaque nombre chiffre à chiffre.** `16` devient `1` `6` :
     *    sans cela, « 5+1 » est incompréhensible — le `1` n'est nulle part.
     *    Le step n'est émis que s'il y a quelque chose à découper.
     * 2. **On additionne les termes retenus, et EUX SEULS.** C'est là que la
     *    triche se cache, et c'est donc là qu'il faut le plus la montrer : les
     *    signes `+` paraissent (`insertOperators`) entre les termes d'une
     *    suite retenue, et NULLE PART ailleurs. Un spectateur voit donc, d'un
     *    seul coup d'œil, quels chiffres ont été additionnés et lesquels ont
     *    été laissés côte à côte sans rien faire.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3) : `apply`, `sortie` et `steps`
     * appellent le MÊME `planAdditionSelective` sur le MÊME vecteur — il n'y a
     * pas de seconde copie qui puisse diverger. `sum` recoupe une deuxième fois
     * (la somme des opérandes affichés doit égaler `to.text`, sinon échec de
     * compilation) et `recherche/scenario.js` une troisième, là où il connaît
     * encore la valeur des jetons de départ.
     */
    steps: (avant, apres, ctx) => {
      const plan = planAdditionSelective(avant.valeur);
      if (!plan) return [];
      const steps = [];
      const idc = (k) => idChiffre(plan, ctx, k);

      // ── 1. chiffre à chiffre, pour les seuls nombres à plusieurs chiffres
      const paires = [];
      avant.valeur.forEach((v, i) => {
        const ks = plan.chiffres
          .map((c, k) => (c.src === i ? k : -1)).filter((k) => k >= 0);
        if (ks.length < 2) return;
        paires.push({ target: ctx.ids[i], to: ks.map((k) => token(idc(k), plan.chiffres[k].v, 'digit')) });
      });
      if (paires.length) {
        const legende = `${avant.valeur.join(' ')} → ${plan.chiffres.map((c) => c.v).join(' ')}`;
        steps.push(etape(ctx, dire(LIB_CHIFFRE_A_CHIFFRE, ctx.langue), legende,
          enchainer([{ op: 'substitute', pairs: paires }]), { id: `s_${ctx.cle}_x` }));
      }

      // ── 2. les additions retenues, et elles seules
      const ops = [];
      plan.sortie.forEach((s, j) => {
        if (s.fin - s.debut < 2) return;
        const termes = [];
        for (let k = s.debut; k < s.fin; k++) termes.push(idc(k));
        const signes = termes.slice(1).map((_, t) => `${ctx.cle}p${j}x${t}`);
        ops.push({ op: 'insertOperators', between: termes, ids: signes, glyph: '+' });
        ops.push({
          op: 'sum',
          targets: termes,
          consume: signes,
          to: token(idSortie(plan, ctx, s, j), s.v, 'number'),
          symbol: '+',
        });
      });
      const vus = plan.chiffres.map((c) => c.v).join(' ');
      steps.push(etape(ctx, dire(LIB_ADDITION_SELECTIVE, ctx.langue),
        `${vus} → ${apres.valeur.join(' ')}`, enchainer(ops), { id: `s_${ctx.cle}_s` }));
      return steps;
    },
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT — `mtri`, `mr39`, `mcc`, `mrd`
  // ══════════════════════════════════════════════════════════════════════════
  //
  // ★ **Registre append-only, clôture LEVÉE** (CONTRACTS §4.1, amendement du
  // 27 août 2026). Le registre était déclaré CLOS au motif que des liens écrits
  // à la main circulaient ; l'auteur a confirmé qu'aucun lien n'avait été
  // diffusé, et la clôture est levée. Ce qui ne bouge pas d'un pouce : un code
  // reste unique, un code ne change jamais de sens, et l'ordre de déclaration
  // reste celui du registre. Ces quatre-là prennent donc les quatre rangs qui
  // suivent `mad`, aucun code existant n'est touché, renommé ni réattribué, et
  // le catalogue passe de 96 à 100 opérateurs. *(Ils se sont d'abord écrits
  // `mtri` à `mrd`, index base36 ; le renommage en codes parlants leur a donné
  // `mtri`, `mr39`, `mcc` et `mrd`.)*
  //
  // ★ **Aucune primitive ajoutée** : le vocabulaire reste à vingt et une
  // (§3.1). Le tri emprunte `move` (la primitive du réarrangement, celle-là
  // même que la recopie de `hope-hope-hope` emploie), le décompte emprunte
  // `partition` + `substitute` + `drop`, le redécoupage emprunte `substitute`,
  // `partition`, `insertOperators`, `sum` et `reduce`, et les trios de 9
  // reprennent le `flip180` de `mr9` et de `pr9`.
  //
  // ★ **Et aucune corne n'est émise ici.** L'auteur écrit, pour les trios :
  // « en leur ajoutant les cornes une fois retournés ». C'est exactement ce que
  // fait déjà `couronnerLesTriptyques` (`src/recherche/scenario.js`) — il
  // couronne, au fil de la démonstration, tout triptyque qui devient contigu et
  // le reste jusqu'au verdict, y compris quand aucun opérateur ne l'a demandé.
  // L'émettre ici serait le faire deux fois, et surtout ce serait le faire à
  // l'aveugle : un opérateur ne voit que sa propre étape, il ne sait pas si ses
  // trois 6 arriveront au verdict — ni même si la cible est 666
  // (`src/recherche/cible.js`). L'assemblage, lui, sait les deux.

  def({
    id: 'm.triCroissant', code: 'mtri', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_TRI_CROISSANT,
    regle: bilingue(
      'Les nombres sont rangés du plus petit au plus grand ; à valeur égale, ils gardent '
      + 'l’ordre où on les a lus.',
      'The numbers are lined up from smallest to largest; equal values keep the order they '
      + 'were read in.',
    ),
    // ★ Notoriété 0,65. Ranger des nombres du plus petit au plus grand est un
    // geste que tout le monde sait faire et que personne n'a besoin qu'on lui
    // explique — c'est le point commun avec « trois 6 d'affilée » (0,80). Ce
    // n'est pas davantage parce que PERSONNE n'attend d'une numérologie qu'elle
    // range ses nombres : la moitié « on a le droit » est une convention de la
    // maison, comme pour `m36`.
    //
    // ★ AdHoc 0,20. `adHoc` mesure une chose et une seule : « cette méthode
    // est-elle taillée pour la cible ? » (heuristique §4.5). Le tri croissant
    // ne regarde ni le 6, ni 666, ni rien de ce qu'on cherche — il range, et il
    // rangerait de la même façon si l'on visait 111 ou 007. C'est donc bas, et
    // ce n'est pas zéro : on ne le joue jamais pour ranger, on le joue pour
    // rapprocher ce qui doit se toucher.
    //
    // ⚠️ **Ce n'est pas ici que le tri se paie.** Il se paie au barème
    // d'élégance, par valeur DÉPLACÉE (`REARRANGEMENT`, `elegance.js`) : rendre
    // contigu ce qui ne l'était pas est précisément ce que `TRIPTYQUE_CONTIGU`
    // récompense de n'avoir pas eu à faire.
    notoriete: 0.65, adHoc: 0.20,
    note: bilingue(
      'Ranger n’est pas trier au sens du site : rien n’est écarté, rien n’est choisi. '
      + 'Mais l’ordre de lecture, lui, ne survit pas — et c’est ce que le score facture.',
      'Lining up is not the site’s kind of sorting: nothing is discarded, nothing is picked. '
      + 'But the reading order does not survive it — and that is what the score charges for.',
    ),
    apply: (valeur, traces) => {
      // ★ REFUS quand le tri ne déplace rien, pour la raison qui a déjà fait
      // refuser `mr9`, `m36` et les trois ficelles : un mappeur qui rend son
      // entrée fabrique une étape que `scenario.js` saute silencieusement, et
      // l'URL porterait alors un code que la démonstration ne montre nulle
      // part.
      if (!triRassemble(valeur)) return null;
      const ordre = ordreCroissant(valeur);
      return {
        valeur: ordre.map((i) => valeur[i]),
        traces: ordre.map((i) => traces[i] || []),
      };
    },
    // Les jetons ne changent ni de valeur ni de nature : ils changent de PLACE.
    // Ils gardent donc leur identifiant — en inventer un neuf ferait croire au
    // pont qu'un jeton en a remplacé un autre, et l'animation raconterait une
    // substitution qui n'a pas eu lieu.
    sortie: (avant, apres, ctx) => ordreCroissant(avant.valeur).map((i) => ctx.ids[i]),
    /**
     * ★ UN SEUL GESTE, ET C'EST `move` — la primitive du réarrangement.
     *
     * Le moteur arithmétique n'envoie jamais de coordonnées (CONTRACTS §7.3) :
     * `move` décrit un ORDRE dans le flux, et le moteur visuel calcule les
     * positions. Les jetons glissent donc les uns devant les autres jusqu'à
     * leur nouvelle place, et le spectateur voit le rangement se faire au lieu
     * de le trouver fait.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3) : l'ordre envoyé à la scène et la
     * valeur calculée par `apply()` sortent du MÊME `ordreCroissant`, appelé
     * sur le MÊME vecteur. Il n'existe pas de seconde copie qui puisse diverger,
     * et la légende du Registre écrit les deux suites côte à côte — on peut
     * refaire le rangement soi-même.
     */
    steps: (avant, apres, ctx) => {
      const ordre = ordreCroissant(avant.valeur);
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_TRI_CROISSANT, ctx.langue), legende, enchainer([
        { op: 'move', order: ordre.map((i) => ctx.ids[i]) },
      ]))];
    },
  }),

  def({
    id: 'm.retournerLesTrios', code: 'mr39', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_TRIOS_DE_NEUF,
    regle: bilingue(
      'Trois 9 côte à côte se retournent ensemble et donnent 666. Un 9 esseulé reste un 9.',
      'Three 9s side by side turn over together and give 666. A lone 9 stays a 9.',
    ),
    // ★ Notoriété 0,30, un peu au-dessus de `mr9` (0,25). C'est le MÊME
    // demi-tour, et il n'est pas mieux connu pour être fait par trois ; mais
    // « 999 retourné donne 666 » est une image que le public reconnaît d'un
    // coup, là où « chaque 9 vaut un 6 » demande qu'on y pense.
    //
    // ★ AdHoc 0,20 contre 0,35 à `mr9`, et c'est l'auteur qui l'ordonne :
    // « retourner les neufs non pas individuellement mais en trio contigu
    // (PLUS ÉLÉGANT) ». La raison tient en une phrase, et c'est celle de `m36` :
    // celui-ci ne CHOISIT pas où frapper. `mr9` retourne chaque 9 partout où il
    // en traîne un, parce que ça rapporte ; celui-ci n'agit que là où la ligne
    // écrit déjà `999` d'affilée — la contiguïté désigne un seul endroit
    // possible, et le geste est déclenché par la géométrie, pas par
    // l'opportunité.
    notoriete: 0.30, adHoc: 0.20,
    note: bilingue(
      'Par trois, et par trois seulement : sur quatre 9 d’affilée, le quatrième ne bouge pas. '
      + 'Un demi-666 ne se retourne pas.',
      'By threes, and only by threes: on four 9s in a row, the fourth stays put. '
      + 'You cannot turn over half a 666.',
    ),
    apply: (valeur, traces) => {
      const trios = triosDeNeuf(valeur);
      if (!trios.length) return null;
      const bouge = new Set(trios);
      const out = valeur.map((n, i) => (bouge.has(i) ? SIX : n));
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // Seuls les 9 retournés reçoivent un identifiant neuf — même règle que
    // `mr9` : les autres n'ont pas bougé, et un renommage sans geste ferait
    // croire au pont qu'un jeton a été remplacé.
    sortie: (avant, apres, ctx) => apres.valeur.map((v, i) => (v === avant.valeur[i]
      ? ctx.ids[i] : nomToken(ctx, i))),
    /**
     * ★ UN SEUL STEP, ET LES TRIOS SE RETOURNENT L'UN APRÈS L'AUTRE.
     *
     * `enchainer` donne à chaque `flip180` un `at` calculé sur la fin du
     * précédent : le spectateur voit la vague traverser le trio, pas un
     * clignotement collectif. C'est la contrainte de lisibilité du projet, et
     * c'est aussi une nécessité technique — `flip180` muni d'un `to` appelle
     * `ctx.reflow()`, et deux reflow simultanés animeraient deux fois
     * `translate` sur les mêmes jetons (voir `enchainer`, `commun.js`).
     *
     * ★ Le `pulse` final ne porte QUE le dernier trio couché sur la ligne au
     * moment où il s'achève : trois 6 neufs et contigus, c'est-à-dire
     * exactement ce que `couronnerLesTriptyques` viendra couronner à l'étape
     * suivante si le verdict les retient.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3), trois verrous, les mêmes que `mr9` :
     *  1. ici, la valeur d'arrivée est LUE dans `apres.valeur[i]`, jamais
     *     écrite en dur, et c'est la comparaison avec `avant.valeur[i]` qui
     *     décide seule quels jetons bougent ;
     *  2. `src/recherche/scenario.js` refuse tout demi-tour qui ne parte pas
     *     d'un 9 pour arriver sur un 6, là où il connaît encore la valeur du
     *     jeton de départ ;
     *  3. `src/visuel/primitives/flip180.js` recoupe une troisième fois, sur la
     *     scène.
     */
    steps: (avant, apres, ctx) => {
      const trios = triosDeNeuf(avant.valeur);
      if (!trios.length) return [];
      const neufs = [];
      const ops = trios.map((i) => {
        const id = nomToken(ctx, i);
        neufs.push(id);
        return { op: 'flip180', target: ctx.ids[i], to: token(id, apres.valeur[i], 'number') };
      });
      // Le `pulse` vient APRÈS le dernier demi-tour, jamais pendant : pendant,
      // le jeton d'arrivée voit déjà son `scale` animé par le crossfade de
      // `flip180` (même raison que dans `posts.js` et dans `mr9`).
      ops.push({ op: 'pulse', targets: neufs, stagger: 60 });
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_TRIOS_DE_NEUF, ctx.langue), legende, enchainer(ops))];
    },
  }),

  def({
    id: 'm.compterLesChiffres', code: 'mcc', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_COMPTER_LES_CHIFFRES,
    regle: bilingue(
      'Chaque plage de nombres identiques est remplacée par son décompte suivi de sa '
      + 'valeur : trois 6 s’écrivent « 3 6 ».',
      'Every run of identical numbers is replaced by its tally then its value: three 6s '
      + 'are written “3 6”.',
    ),
    // ★ Notoriété 0,55. C'est la suite de Conway — « look and say », `1211`,
    // `111221` —, qu'une bonne part du public a déjà croisée sans forcément
    // savoir la nommer. Nettement plus qu'une astuce de la maison, nettement
    // moins qu'A1Z26.
    //
    // ★ AdHoc 0,05, le plus bas du catalogue avec la somme. Compter les
    // chiffres ne regarde pas ce qu'on cherche : c'est une lecture de la suite,
    // et elle rendrait le même résultat en visant 111 ou 007. L'auteur le dit
    // d'ailleurs lui-même — « ce n'est pas arrangeant/utile ici, mais il y a
    // aussi la transformation ». On ne l'a pas taillée pour la cible ; on l'a
    // mise au catalogue parce qu'elle existe.
    notoriete: 0.55, adHoc: 0.05,
    note: bilingue(
      'Des plages CONTIGUËS, pas un relevé par valeur : `6 4 6` donne « 1 6 1 4 1 6 », '
      + 'et non « 2 6 1 4 ». Compter suppose de lire dans l’ordre.',
      'Adjacent runs, not a tally by value: `6 4 6` gives “1 6 1 4 1 6”, not “2 6 1 4”. '
      + 'Counting means reading in order.',
    ),
    apply: (valeur, traces) => {
      const plages = plagesDe(valeur);
      if (!plages.length) return null;
      // ★ REFUS quand le décompte ne CONDENSE pas. Une plage d'un seul élément
      //   rend « 1 v » : deux signes pour un. Si le total n'y gagne rien, le
      //   décompte n'a rien compté, il a commenté — et la scène montrerait une
      //   ligne qui s'allonge en promettant de la résumer. C'est aussi ce qui
      //   borne la recherche : la largeur ne peut que décroître, donc la
      //   transformation ne peut pas s'enchaîner indéfiniment sur elle-même.
      if (plages.length * 2 >= valeur.length) return null;
      const out = [];
      const org = [];
      for (const p of plages) {
        const t = fusion(...valeur.slice(p.debut, p.fin).map((_, k) => traces[p.debut + k] || []));
        out.push(p.compte, p.valeur);
        org.push(t, t);
      }
      return { valeur: out, traces: org };
    },
    // Toute la ligne est réécrite : une plage n'est pas « ses jetons moins
    // quelques-uns », c'est une DESCRIPTION de ces jetons. Les deux signes qui
    // en sortent sont donc neufs tous les deux, et le pont n'a rien à faire
    // suivre.
    sortie: (avant, apres, ctx) => plagesDe(avant.valeur)
      .flatMap((_, j) => [`${ctx.cle}n${j}`, `${ctx.cle}v${j}`]),
    /**
     * ★ ON MONTRE LES PLAGES AVANT DE LES COMPTER.
     *
     * Trois gestes, dans cet ordre, et chacun dit une moitié de la règle :
     *
     *  1. `partition` — les plages s'écartent les unes des autres et chacune
     *     reçoit son accolade, qui porte son décompte (`×3`). C'est là que la
     *     lecture se voit : trois 6 d'affilée forment UNE plage, trois 6
     *     dispersés en forment trois. Sur une ligne d'une seule plage,
     *     `partition` refuserait de découper (« découper en un seul morceau ne
     *     découpe rien ») : c'est l'accolade simple du `group` qui prend le
     *     relais ;
     *  2. `substitute` — le premier signe de chaque plage devient le couple
     *     « décompte valeur » ;
     *  3. `drop` — le reste de la plage tombe, puisqu'il vient d'être compté.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3) : `apply`, `sortie` et `steps`
     * appellent le MÊME `plagesDe` sur le MÊME vecteur ; les accolades, les
     * couples substitués et les valeurs calculées sortent tous de cette unique
     * lecture, et il n'existe pas de seconde copie qui puisse diverger.
     */
    steps: (avant, apres, ctx) => {
      const plages = plagesDe(avant.valeur);
      if (!plages.length) return [];
      const ops = [];
      const groupes = plages.map((p, j) => ({
        targets: ctx.ids.slice(p.debut, p.fin),
        tag: `${ctx.cle}g${j}`,
        label: `×${p.compte}`,
      }));
      if (groupes.length >= 2) ops.push({ op: 'partition', groups: groupes });
      else ops.push({ op: 'group', targets: ctx.ids, label: `×${plages[0].compte}`, tighten: 0 });
      ops.push({
        op: 'substitute',
        pairs: plages.map((p, j) => ({
          target: ctx.ids[p.debut],
          to: [
            token(`${ctx.cle}n${j}`, p.compte, 'number'),
            token(`${ctx.cle}v${j}`, p.valeur, 'number'),
          ],
        })),
        stagger: 60,
      });
      const comptes = [];
      for (const p of plages) for (let k = p.debut + 1; k < p.fin; k++) comptes.push(ctx.ids[k]);
      if (comptes.length) ops.push({ op: 'drop', targets: comptes, mode: 'fall', stagger: 40 });
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_COMPTER_LES_CHIFFRES, ctx.langue), legende,
        retirerAccolade(enchainer(ops)))];
    },
  }),

  def({
    id: 'm.redecoupageChoisi', code: 'mrd', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_REDECOUPAGE,
    regle: bilingue(
      'Chaque nombre s’écrit chiffre à chiffre, puis on redécoupe la ligne en paquets '
      + 'choisis pour tomber sur 6 le plus souvent possible ; chaque paquet est réduit à un '
      + 'chiffre par addition, répétée si besoin. Un 6 déjà là reste seul.',
      'Every number is written out digit by digit, then the line is recut into packets '
      + 'chosen to land on 6 as often as possible; each packet is reduced to a single digit '
      + 'by addition, repeated if need be. A 6 already there is left alone.',
    ),
    // ★ Notoriété 0,10, la plus basse du catalogue hors joker. Réduire un
    // nombre par addition de ses chiffres est banal (c'est la racine
    // numérique) ; REDÉCOUPER la ligne pour choisir quels chiffres s'additionnent
    // ne se fait nulle part, ne s'enseigne nulle part, et ne s'attend nulle
    // part. Ce qui est connu ici, c'est l'addition ; ce qui ne l'est pas, c'est
    // la découpe — et c'est la découpe qui fait tout le travail.
    //
    // ★ AdHoc 0,48, juste sous le joker (0,50) et au-dessus de « le plus
    // fréquent l'emporte » (0,45) : c'est l'opérateur le plus taillé pour la
    // cible de tout le catalogue. `mpf` décide en regardant le vecteur qu'il
    // vient d'obtenir ; celui-ci décide en regardant le CHIFFRE QU'ON CHERCHE,
    // et il essaie toutes les découpes jusqu'à trouver celle qui en donne le
    // plus. On ne peut pas être plus explicitement au service du 6.
    notoriete: 0.10, adHoc: 0.48,
    note: bilingue(
      'Oui, c’est de la triche, et l’auteur l’écrit ainsi : « c’est le moment de tricher ». '
      + 'On le montre plutôt que de le maquiller — les accolades disent où l’on a coupé, '
      + 'les signes + disent ce qu’on a additionné, et le score dit ce que ça coûte.',
      'Yes, this is cheating, and the author says so: “time to cheat”. We show it rather '
      + 'than dress it up — the braces say where the cuts were made, the plus signs say what '
      + 'was added, and the score says what it costs.',
    ),
    apply: (valeur, traces) => {
      const plan = planRedecoupage(valeur);
      if (!plan) return null;
      return {
        valeur: plan.paquets.map((p) => p.v),
        traces: plan.paquets.map((p) => fusion(
          ...plan.chiffres.slice(p.debut, p.fin).map((c) => traces[c.src] || []),
        )),
      };
    },
    // ★ Ce que la triche fait VOIR — voir `additions` dans `commun.js`. C'est
    //   par là que le barème apprend combien d'additions se suivent, donc à
    //   quel point chacune passe inaperçue.
    additions: (valeur) => {
      const plan = planRedecoupage(valeur);
      return plan ? plan.paquets.filter((p) => p.fin - p.debut >= 2)
        .map((p) => p.fin - p.debut) : [];
    },
    sortie: (avant, apres, ctx) => {
      const plan = planRedecoupage(avant.valeur);
      return plan ? plan.paquets.map((p, j) => idPaquet(plan, ctx, p, j)) : [];
    },
    /**
     * ★ DEUX STEPS, ET LE SECOND MONTRE LA TRICHE EN FACE.
     *
     * 1. **On écrit chaque nombre chiffre à chiffre.** `12` devient `1` `2` :
     *    sans cela, « 1+2+3 » est incompréhensible. Le step n'est émis que s'il
     *    y a quelque chose à éclater.
     * 2. **On redécoupe, puis on additionne.** Les accolades de `partition`
     *    tombent d'abord — c'est la DÉCISION, et c'est elle qu'il faut montrer
     *    avant tout, parce que c'est elle qui triche : le choix des coupes.
     *    Puis, dans chaque paquet de plus d'un chiffre, les signes `+`
     *    paraissent et la somme se fait ; si elle dépasse neuf, un `reduce`
     *    la ramène à un chiffre, autant de fois qu'il le faut.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3) : `apply`, `sortie` et `steps`
     * appellent le MÊME `planRedecoupage` sur le MÊME vecteur — pas de seconde
     * copie possible. `sum` recoupe une deuxième fois (la somme des opérandes
     * affichés doit égaler `to.text`, sinon échec de compilation), `reduce` une
     * troisième (les chiffres montrés doivent reconstituer le nombre ET leur
     * somme doit égaler ce qui en sort), et `recherche/scenario.js` une
     * quatrième, là où il connaît encore la valeur des jetons de départ.
     */
    steps: (avant, apres, ctx) => {
      const plan = planRedecoupage(avant.valeur);
      if (!plan) return [];
      const steps = [];
      const idc = (k) => idChiffreRedecoupe(plan, ctx, k);

      // ── 1. chiffre à chiffre, pour les seuls nombres à plusieurs chiffres
      const paires = [];
      avant.valeur.forEach((v, i) => {
        const ks = plan.chiffres
          .map((c, k) => (c.src === i ? k : -1)).filter((k) => k >= 0);
        if (ks.length < 2) return;
        paires.push({
          target: ctx.ids[i],
          to: ks.map((k) => token(idc(k), plan.chiffres[k].v, 'digit')),
        });
      });
      if (paires.length) {
        const legende = `${avant.valeur.join(' ')} → ${plan.chiffres.map((c) => c.v).join(' ')}`;
        steps.push(etape(ctx, dire(LIB_CHIFFRE_A_CHIFFRE, ctx.langue), legende,
          enchainer([{ op: 'substitute', pairs: paires }]), { id: `s_${ctx.cle}_x` }));
      }

      // ── 2. la découpe, puis les additions
      const ops = [];
      const groupes = plan.paquets.map((p, j) => ({
        targets: Array.from({ length: p.fin - p.debut }, (_, k) => idc(p.debut + k)),
        tag: `${ctx.cle}q${j}`,
      }));
      if (groupes.length >= 2) ops.push({ op: 'partition', groups: groupes });
      plan.paquets.forEach((p, j) => {
        if (p.fin - p.debut < 2) return;
        const termes = [];
        for (let k = p.debut; k < p.fin; k++) termes.push(idc(k));
        const signes = termes.slice(1).map((_, t) => `${ctx.cle}p${j}x${t}`);
        ops.push({ op: 'insertOperators', between: termes, ids: signes, glyph: '+' });
        // La somme d'abord, telle qu'elle tombe — puis, si elle dépasse neuf,
        // autant de réductions qu'il en faut pour n'avoir plus qu'un chiffre.
        // Les paliers sont CALCULÉS, jamais devinés : `reduce` refuse d'afficher
        // une addition dont le total ne correspond pas aux chiffres montrés.
        const paliers = [p.somme];
        while (paliers[paliers.length - 1] > 9) {
          let s = 0;
          for (const c of String(paliers[paliers.length - 1])) s += Number(c);
          paliers.push(s);
        }
        const nom = (t) => (t === paliers.length - 1
          ? idPaquet(plan, ctx, p, j) : `${ctx.cle}t${j}x${t}`);
        ops.push({
          op: 'sum',
          targets: termes,
          consume: signes,
          to: token(nom(0), paliers[0], 'number'),
          symbol: '+',
        });
        for (let t = 1; t < paliers.length; t++) {
          ops.push({
            op: 'reduce',
            target: nom(t - 1),
            digits: [...String(paliers[t - 1])]
              .map((d, k) => token(`${ctx.cle}d${j}x${t}x${k}`, d, 'digit')),
            to: token(nom(t), paliers[t], 'number'),
          });
        }
      });
      const vus = plan.chiffres.map((c) => c.v).join(' ');
      steps.push(etape(ctx, dire(LIB_REDECOUPAGE, ctx.langue),
        `${vus} → ${apres.valeur.join(' ')}`, enchainer(ops), { id: `s_${ctx.cle}_d` }));
      return steps;
    },
  }),
];

/** Les dix caractères que « le tiret du 6 » sait convertir — exposé pour l'UI. */
export const TOUCHES_CHIFFREES = Object.freeze(Object.keys(CHIFFRE_DE_TOUCHE));

/** Approximations 7 segments assumées — exposé pour l'UI (CONTRACTS §0.4). */
export { SEG7_APPROXIMATIONS };

/** Le quatorze segments n'en a aucune à assumer — il le dit lui-même. */
export { MENTION_SEG14 };

export const MESURES_STR = Object.freeze(MESURES);
export const MAPPEURS = Object.freeze([...MAPPEURS_LETTRE, ...AUTRES_MAPPEURS]);
