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
  A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6, NOM_LETTRE_FR, NOM_CHIFFRE_FR,
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
  AZERTY, QWERTY, colonne, rangee, rangeeDepuisLesChiffres,
  chiffreDeTouche, CHIFFRE_DE_TOUCHE, NOTE_AFNOR,
} from '../tables/claviers.js';
import { mesure as mesureGlyphe } from '../tables/derivees.js';
import { GLYPHES } from '../tables/glyphes.js';
import {
  valeurHebreu, valeurGrec, NOTE_SOURCAGE, TRANSLIT_HEBREU, TRANSLIT_GREC,
} from '../tables/ecritures.js';
import { decouperMots } from './filtres.js';
import { estSeparateur } from './tokeniseurs.js';
import {
  def, selonLaCible, etape, token, fusion, nomsTokens, nomToken, enchainer, retirerAccolade,
  ordreCroissant,
} from './commun.js';
import { opComptage } from './combinateurs.js';
import { bilingue, dire } from '../i18n.js';
import { nivellementDe, dureeRamassage } from './combinateurs.js';

const pli = (c) => sansAccents(String(c)).toUpperCase();

/**
 * UN chiffre, et rien d'autre — voir `m.chiffreTelQuel`.
 *
 * ⚠️ **UN SEUL, ET C'EST TOUTE LA DIFFÉRENCE ENTRE LIRE ET ASSEMBLER.** Le
 *   premier jet acceptait un jeton de plusieurs chiffres, « 42 » valant
 *   quarante-deux : refuser aurait supposé de savoir comment la ligne avait été
 *   découpée. C'était FAUX, et la scène l'a dit — sur `tm+m09` (« 42 » en un
 *   mot), deux glyphes devaient fondre en un seul nombre, et le compilateur a
 *   refusé de réduire un token « 4 » en chiffres « 42 ».
 *
 *   Une fusion est un GESTE : il faut la montrer, donc elle fait une étape,
 *   donc elle se facture — c'est-à-dire tout le contraire d'un opérateur
 *   invisible. « Chaque chiffre vaut lui-même » est vrai d'un chiffre ; d'un
 *   groupe de chiffres, c'est déjà une lecture positionnelle qu'on assemble.
 *
 * ⚠️ `0-9` et non `\p{N}` : le second accepte les chiffres arabo-indiens, les
 *   idéogrammes numériques et les fractions, dont `Number()` ne sait rien faire
 *   (`Number('٩')` rend `NaN`). Une lecture qui rend `NaN` sur ce qu'elle vient
 *   d'accepter serait pire qu'un refus.
 */
const RE_UN_CHIFFRE = /^[0-9]$/;
const estVoyelle = (c) => VOYELLES.includes(pli(c));

/* ── ★ LE NOM DES OUTILS QUE LA SCÈNE MONTE ──────────────────────────────────
 *
 * En plein écran, le décor est tout ce qu'on voit : un clavier, un afficheur,
 * une grille de vingt-six cases. Sans son nom, on ne sait pas de quelle méthode
 * il est la preuve. Ces noms vivent donc au CATALOGUE (champ `outil`, voir
 * `commun.js › def`), et la scène les reçoit tout traduits — jamais recopiés
 * là-bas, sans quoi renommer un opérateur laisserait la scène annoncer
 * l'ancien nom.
 *
 * ★ Et ils se DÉDUISENT du geste plutôt que d'être écrits opérateur par
 * opérateur : deux claviers, quatre afficheurs, et pas une chaîne en double —
 * l'AZERTY et le QWERTY partagent une phrase, le sept et le quatorze segments
 * en partagent une autre.
 */

/** Le nom d'un clavier — sa disposition suffit à le nommer. */
const outilClavier = (disposition) => {
  const d = String(disposition || 'azerty').toUpperCase();
  return bilingue(`Clavier ${d}`, `${d} keyboard`);
};

/**
 * Le nom d'un afficheur à segments — et la mention de la FUSION, écrite une
 * seule fois pour les deux afficheurs.
 *
 * En comptage individuel, l'outil est l'afficheur lui-même. En fusion, ce ne
 * sont plus les segments qu'on compte mais leurs ALIGNEMENTS — `b` et `c` n'y
 * font qu'un trait — et le nom doit le dire, sinon deux scènes rigoureusement
 * différentes s'annonceraient pareil.
 */
const outilAfficheur = (segments, mode) => (mode === 'fusion'
  ? bilingue(`Alignements sur afficheur ${segments} segments`,
    `Aligned strokes on a ${segments}-segment display`)
  : bilingue(`Afficheur ${segments} segments`, `${segments}-segment display`));

/**
 * Le nom de l'outil qu'un geste monte — `null` quand le geste ne monte aucun
 * décor nommé (une table de correspondance porte le nom de sa MÉTHODE, qui est
 * déjà le libellé de l'opérateur : « Numérologie pythagoricienne », « Points du
 * Scrabble français »).
 */
function outilDuGeste(spec) {
  if (spec.geste === 'keyboard') return outilClavier(spec.disposition);
  if (spec.geste === 'sevenSeg') return outilAfficheur(7, spec.mode);
  if (spec.geste === 'fourteenSeg') return outilAfficheur(14, spec.mode);
  return null;
}

/**
 * Un mappeur à décor déclaré à la main — l'opérateur d'un côté, le GESTE de
 * l'autre, et le nom de l'outil calculé UNE fois pour les deux.
 *
 * Les mappeurs lettre → nombre passent par une fabrique commune, qui s'en
 * charge ; trois d'entre eux (`mtc`, `m14`, `m14F`) sont écrits à la main
 * parce que leur `apply` ne se déduit pas d'une table. Sans ce petit
 * intermédiaire, le nom de l'outil devrait être écrit deux fois — une fois
 * pour le catalogue, une fois pour la scène — et deux écritures d'une même
 * chose finissent toujours par diverger.
 *
 * @param {object} spec   le descripteur d'opérateur (sans `steps`)
 * @param {object} geste  ce que `etapeMappeur` a besoin de savoir de la scène
 */
function mappeurGeste(spec, geste) {
  const outil = spec.outil || outilDuGeste(geste) || spec.libelle;
  return def({ ...spec, outil, steps: etapeMappeur({ ...geste, outil }) });
}

// Libellés dont `steps()` a besoin avant que `def()` ait figé l'opérateur.
const LIB_REDUIRE_CHAQUE = bilingue('On réduit chaque nombre à un chiffre', 'Reduce every number to a single digit');
const LIB_ZEROS = bilingue('On retire les zéros', 'Drop the zeros');
const REG_ZEROS = bilingue('Un zéro n’apporte rien à la somme', 'A zero brings nothing to the sum');
const LIB_RETOURNER_9 = bilingue('On retourne les 9', 'Turn the 9s upside down');
/**
 * ★ **NOMMER LA CIBLE DANS UNE PHRASE**, sans jamais l'y écrire en dur.
 *
 * « Trois 6 d'affilée » est la phrase historique, et elle n'est juste que parce
 * que 666 répète UN chiffre TROIS fois. Sur `111` elle doit dire « trois 1 »,
 * sur `01111984` elle ne peut plus rien dire de tel — il n'y a pas de « n fois
 * le chiffre d », il y a une suite. La phrase se fabrique donc, et elle se
 * fabrique à partir de la visée :
 *
 *  · visée HOMOGÈNE — `trois 6`, `trois 1`, `deux 7`. Le nombre s'écrit en
 *    toutes lettres, comme un francophone le dirait, et le chiffre reste un
 *    chiffre. Sur `666`, cela rend « trois 6 » : le repli est EXACT, mot pour
 *    mot, ce que les tests de langue vérifient ;
 *  · visée HÉTÉROGÈNE — on cite la suite entre guillemets, `« 01111984 »`. Il
 *    n'y a pas de compte à annoncer, il y a un motif à reconnaître.
 *
 * Le nom du nombre vient de `NOM_CHIFFRE_FR` (`tables/alphabet.js`) pour le
 * français — la table que le joker et `mlet` emploient déjà, donc jamais deux
 * orthographes du même nombre dans un même site (CONTRACTS §0.3). L'anglais a
 * la sienne, ici, faute d'une table équivalente.
 */
const NOMBRE_EN = Object.freeze([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);
/** `dix` complète `NOM_CHIFFRE_FR`, qui s'arrête à neuf — une cible va jusqu'à dix chiffres. */
const nombreEcrit = (n) => bilingue(n === 10 ? 'dix' : NOM_CHIFFRE_FR[n], NOMBRE_EN[n] || String(n));
/** Une majuscule d'initiale, en unités de code — pas d'`Intl` (CONTRACTS §4.4). */
const capitale = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * « trois 6 » / « three 6s » — le groupe nominal, sans article, quand la visée
 * répète un seul chiffre. `null` sinon : il n'y a alors PAS de compte à
 * annoncer, et forcer la formule donnerait « huit 0 » pour `01111984`.
 * @param {import('./commun.js').Visee} visee
 */
function compteDite(visee) {
  if (!visee.homogene) return null;
  const n = nombreEcrit(visee.longueur);
  const d = visee.chiffres[0];
  // `nb` et `chiffre` séparés : l'anglais glisse son adjectif ENTRE les deux
  // (« three adjacent 6s ») là où le français le met après (« trois 6
  // contigus »). Rendre la phrase toute faite obligerait à la recoudre.
  return { ...bilingue(`${n.fr} ${d}`, `${n.en} ${d}s`), nb: n, chiffre: d };
}

const libTrouvaille = (visee) => {
  const s = compteDite(visee);
  if (!s) {
    return bilingue(
      `« ${visee.texte} » d’affilée — la suite était déjà écrite`,
      `“${visee.texte}” in a row — the run was already written`,
    );
  }
  return bilingue(
    `${capitale(s.fr)} d’affilée — le ${visee.texte} était déjà écrit`,
    `${capitale(s.en)} in a row — the ${visee.texte} was already written`,
  );
};

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
const libArret = (visee) => {
  const s = compteDite(visee);
  if (!s) {
    return bilingue(
      `On s’arrête à « ${visee.texte} » — le reste s’efface`,
      `Stop at “${visee.texte}” — the rest is erased`,
    );
  }
  return bilingue(
    `On s’arrête aux ${s.fr} d’affilée — le reste s’efface`,
    `Stop at the ${s.en} in a row — the rest is erased`,
  );
};

/**
 * Longueur d'un TRIO de 9 retournés. Trois, et ce trois-là ne suit AUCUNE
 * cible : un demi-tour ne sait produire qu'un 6 (`visuel/primitives/flip180.js`
 * le vérifie), et il en faut trois pour écrire 666. Le nombre de chiffres d'une
 * série, lui, se lit sur la visée — voir `Visee.longueur`.
 */
const TRIO = 3;

/**
 * ★ **LE CHIFFRE VISÉ N'EST PLUS UNE CONSTANTE DE MODULE.**
 *
 * Il en était une — `CIBLE_CHIFFRE = 6` —, et son propre commentaire annonçait
 * la suite : « le jour où la recherche saura la leur passer, il suffira de la
 * faire descendre ». Ce jour est arrivé. La cible descend désormais jusqu'ici
 * par le canal `viser` (`commun.js › selonLaCible`), et les cinq opérateurs qui
 * la lisent sont FABRIQUÉS pour une visée donnée au lieu de consulter un
 * nombre écrit au-dessus d'eux.
 *
 * Conséquence directe, et c'est tout l'intérêt : `bfs.js` n'a plus de liste
 * d'opérateurs « liés à 666 » à tenir à la main. Un opérateur porte `viser` ou
 * ne le porte pas, et c'est le seul fait qui décide (CONTRACTS §0.3).
 *
 * ⚠️ **ET LE 0 NE S'ATTEINDRA JAMAIS PAR L'ADDITION.** « Quand on veut 777 la
 * cible ne sera pas la même ; quand on veut des 0 il faudra faire des 10, des
 * 100, des 1000 — et donc les opérateurs manquants sont peut-être soustraction
 * sélective et multiplication sélective » (l'auteur). C'est exact et c'est
 * arithmétique : une somme de chiffres positifs ne se réduit jamais à 0 sans
 * que tous ses termes soient nuls, et un paquet de zéros appauvrit la ligne
 * (voir `paquetRecevable`). Viser `000` demandera donc soit une soustraction
 * qui annule deux valeurs égales, soit une multiplication qui absorbe par le
 * 0 — deux opérateurs qui n'existent pas encore. `mad` le CONSTATE désormais au
 * lieu de le subir : `viser('000')` rend `null`, et l'opérateur se désactive.
 */

/**
 * L'index du premier chiffre de la première occurrence CONTIGUË de la cible,
 * ou −1.
 *
 * Source unique de `apply`, de `sortie` et de `steps` : les trois posent la
 * même question au même vecteur, donc aucune ne peut désigner d'autres jetons
 * que les deux autres (CONTRACTS §0.3, « ce qui est montré est ce qui est
 * compté »).
 *
 * « Contiguë » se lit sur les INDEX du vecteur, sans exception ni tolérance :
 * `[6,6,7,6]` ne contient pas de 666, il contient trois 6 dont deux voisins.
 *
 * ★ Le repli sur l'existant est EXACT. Sur la visée `666`, chercher « 6 puis 6
 * puis 6 à la file » et compter trois 6 consécutifs sont la même question, et
 * la réponse est le même index. Sur `007` elles cessent de l'être — l'ordre des
 * chiffres fait partie de ce qu'on démontre —, et c'est cette formulation-ci
 * qui reste vraie.
 */
function debutDeLaCible(valeur, visee) {
  const c = visee.chiffres;
  for (let i = 0; i + c.length <= valeur.length; i++) {
    let k = 0;
    while (k < c.length && valeur[i + k] === c[k]) k++;
    if (k === c.length) return i;
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
function valeurDominante(valeur, visee) {
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
  if (!portePleinement(Array.from({ length: max }, () => meilleure), visee)) return null;
  return { valeur: meilleure, compte: max };
}

/**
 * ★ **DANS QUEL ORDRE LES MINORITAIRES TOMBENT** — une vague par valeur, du plus
 *   rare au moins rare.
 *
 * « Elle doit supprimer non pas en une fois, mais les chiffres présents en un
 * seul exemplaire, chiffre par chiffre, puis ceux en deux exemplaires — par
 * chiffre unique, mais s'il y a `6634346`, les deux 3 sont à supprimer en même
 * temps, puis les deux 4 » (l'auteur).
 *
 * Les deux consignes n'en font qu'une : **une vague par VALEUR distincte,
 * rangées par effectif croissant.** Un chiffre présent une seule fois forme à
 * lui seul sa vague — « chiffre par chiffre » —, et deux exemplaires de la même
 * valeur tombent ensemble parce qu'ils sont un seul argument, pas deux.
 *
 * Ce que le spectateur voit alors n'est plus une disparition mais un
 * DÉPOUILLEMENT : on retire d'abord ce qui ne pesait rien, et le plus fréquent
 * reste debout en dernier. L'argument se joue au lieu de s'annoncer.
 *
 * À effectif égal, l'ordre est celui de la PREMIÈRE APPARITION dans le vecteur —
 * déterministe, et c'est celui que l'œil suit (§4.4).
 *
 * @returns {Array<{valeur:number, indices:number[]}>} les vagues, dans l'ordre
 */
function vaguesDEffacement(valeur, gardee) {
  const parValeur = new Map();
  valeur.forEach((v, i) => {
    if (v === gardee) return;
    if (!parValeur.has(v)) parValeur.set(v, []);
    parValeur.get(v).push(i);
  });
  return [...parValeur.entries()]
    .map(([v, indices]) => ({ valeur: v, indices }))
    .sort((a, b) => (a.indices.length - b.indices.length) || (a.indices[0] - b.indices[0]));
}

/** Le vecteur écrit-il la cible d'affilée ? C'est le seul but que ces ficelles servent. */
const portePleinement = (v, visee) => debutDeLaCible(v, visee) >= 0;

/** Le relevé écrit — `6 ×4 · 4 ×1` —, par ordre de PREMIÈRE apparition. */
function releveEcrit(valeur) {
  const comptes = new Map();
  for (const v of valeur) comptes.set(v, (comptes.get(v) || 0) + 1);
  return [...comptes].map(([v, n]) => `${v} ×${n}`).join(' · ');
}

/**
 * ★ La parité de rang qui porte le plus de chiffres UTILES — `0` (1ᵉʳ, 3ᵉ,
 * 5ᵉ…), `1` (2ᵉ, 4ᵉ, 6ᵉ…), ou `−1` quand la règle refuse de s'appliquer.
 *
 * « Si sur l'ensemble des caractères, en garder 1 sur 2 permet d'isoler les 6 »
 * — l'auteur. Le critère est donc les 6, dans ses propres termes, et il est
 * annoncé à l'écran avant d'être appliqué : ce n'est pas un choix fait après
 * coup, c'est le choix ANNONCÉ, chiffres à l'appui.
 *
 * ★ « Les 6 » se lit « les chiffres qui servent à écrire la cible » dès que la
 * cible change, et le repli est exact : sur `666`, l'alphabet de la visée est
 * `{6}` et l'on recompte très exactement les 6.
 *
 * ★ Et là encore, l'ex æquo est un REFUS et non un arbitrage : à nombre égal,
 * aucune des deux parités ne vaut mieux que l'autre, et prétendre le contraire
 * serait remettre par la fenêtre l'arbitraire qu'on chasse par la porte. Il n'y
 * a donc aucune règle de départage à retenir — il n'y a rien à départager.
 *
 * ★ Et le côté retenu doit ÉCRIRE la cible d'affilée, sinon la règle ne
 * s'applique pas : décimer pour qu'il reste deux nombres, ou trois 6 encore
 * dispersés, ce n'est pas isoler les 6, c'est en perdre. Même exigence que pour
 * `mpf`, et pour la même raison — une ficelle qui n'achète rien ne doit pas
 * être jouée.
 */
function paritePorteuse(valeur, visee) {
  const utiles = comptesParParite(valeur, visee);
  if (utiles[0] === utiles[1]) return -1;
  const p = utiles[0] > utiles[1] ? 0 : 1;
  const garde = valeur.filter((_, i) => i % 2 === p);
  return portePleinement(garde, visee) ? p : -1;
}

/** Les chiffres utiles portés par chaque parité de rang — `[impaires, paires]`. */
function comptesParParite(valeur, visee) {
  const utiles = [0, 0];
  valeur.forEach((v, i) => { if (visee.utile(v)) utiles[i % 2]++; });
  return utiles;
}

/** Le relevé des deux parités, écrit — c'est lui qui dit POURQUOI cette parité. */
function releveDesParites(valeur, langue, visee) {
  const utiles = comptesParParite(valeur, visee);
  // ★ CE QU'ON COMPTE DOIT ÊTRE NOMMÉ POUR CE QUE C'EST (CONTRACTS §0.3).
  //   Sur `111`, la phrase historique annoncerait « 4 six » au-dessus d'un
  //   comptage de 1 : un relevé qui ne dit pas ce qu'il compte est pire qu'un
  //   relevé absent.
  //
  //   ★ La cible par défaut GARDE son mot, au mot près — « 4 six » se lit
  //   « quatre 6 », le français nomme le chiffre. Ce tour ne se transpose pas :
  //   « 4 un » ne se lit pas, et fabriquer les dix noms de chiffres dans deux
  //   langues pour une légende de bas de page serait payer cher un mot juste.
  //   Ailleurs, on dit donc ce qui est réellement compté — les chiffres qui
  //   SERVENT, qu'il y en ait un seul ou cinq.
  const nom = visee.defaut
    ? bilingue('six', 'sixes')
    : bilingue('chiffres utiles', 'useful digits');
  return dire(bilingue(
    `positions impaires : ${utiles[0]} ${nom.fr} · positions paires : ${utiles[1]} ${nom.fr}`,
    `odd positions: ${utiles[0]} ${nom.en} · even positions: ${utiles[1]} ${nom.en}`,
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

/**
 * ★ **LES CHIFFRES QU'UNE SOMME SÉLECTIVE NE CONSOMME JAMAIS**, et pourquoi
 *   chacun.
 *
 * Ils étaient écrits en dur dans la boucle (`if (c === 0 || c === SIX) break`),
 * ce qui donnait à lire deux nombres magiques là où il y a deux raisons
 * distinctes — et rendait invisible le fait qu'elles ne se transposent pas de
 * la même façon à une autre cible :
 *
 *  · **le 0 est l'ÉLÉMENT NEUTRE de l'addition.** L'absorber n'ajoute rien à la
 *    somme : la scène montrerait une addition qui ne change pas le résultat,
 *    c'est-à-dire une étape pour rien. Cette raison-là ne dépend pas de la
 *    cible — elle vaudra encore pour 777 ou pour 13.
 *
 *  · **la cible elle-même est DÉJÀ ACQUISE.** Consommer un 6 pour en refaire un
 *    à partir d'autres chiffres, c'est défaire pour refaire ; et si on le fond
 *    dans une somme qui vaut autre chose, c'est détruire ce qu'on cherchait
 *    (`SIX_DETRUIT`, au barème). Cette raison-là suit la cible : viser 777
 *    interdirait le 7, pas le 6.
 *
 * @param {number} cible le chiffre cherché
 */
const INTERDITS_A_LA_SOMME = (cible) => new Set([0, cible]);

/**
 * ★ **CE QU'UN PAQUET A LE DROIT DE FAIRE — la règle qui remplace les deux
 *   interdits d'entrée.**
 *
 * `INTERDITS_A_LA_SOMME` refusait un paquet dès qu'un 0 ou un 6 s'y présentait,
 * et coupait le balayage. C'était trop grossier, et l'auteur l'a montré par un
 * contre-exemple : sur `661506967872`, il attendait `6 6 6 6 9 6 15 9`, dont le
 * quatrième 6 naît de `0 + 6`. L'ancienne règle l'interdisait deux fois — pour
 * le 0 ET pour le 6 — alors que ce paquet ne détruit rien : il fait disparaître
 * un zéro parasite et rend le 6 intact. « Un 6 peut entrer dans un paquet si le
 * paquet vaut encore 6 » (l'auteur), « mais attention à ne pas faire rentrer
 * plusieurs 6 pour n'en sortir qu'un ».
 *
 * Cette seconde phrase EST l'invariant, et il se dit mieux en comptant qu'en
 * interdisant : **un paquet ne doit pas appauvrir la ligne**. Ce qui entre en
 * 6 doit ressortir en 6, ce qui entre en 9 doit ressortir en 9. Écrite ainsi,
 * la règle couvre d'un coup les cas que deux interdits ne voyaient pas :
 *
 *   · `0+6 → 6`    un zéro absorbé, le 6 intact          → AUTORISÉ
 *   · `6+6 → 12`   deux 6 pour aucun                     → refusé
 *   · `9+6 → 15`   un 6 dissous dans « 1 5 »             → refusé
 *   · `9+9 → 18`   deux 9 pour un seul                   → refusé
 *   · `1+5 → 6`    un 6 gagné                            → AUTORISÉ
 *   · `7+2 → 9`    un 9 gagné                            → AUTORISÉ
 *   · `7+8 → 15`   rien gagné, rien perdu, et `15` se
 *                  réduit à 6 au coup suivant            → AUTORISÉ
 *
 * ★ **ET L'UTILITÉ, séparément.** Ne rien détruire ne suffit pas : `3+4 → 7`
 *   ne détruit rien et ne sert à rien. Un paquet doit VISER — sa somme se
 *   réduit à 6, ou à 9 « à défaut » (l'auteur). C'est ce qui autorise `7+8`,
 *   dont l'auteur note lui-même qu'il faudra enchaîner (`15 → 6`).
 */
const reduire = (n) => {
  let v = Math.abs(n);
  while (v > 9) v = chiffresDe(v).reduce((a, b) => a + b, 0);
  return v;
};

/** Combien de fois le chiffre `d` paraît dans une liste de chiffres. */
const compte = (liste, d) => liste.reduce((n, c) => n + (c === d ? 1 : 0), 0);

/**
 * ★ **CE QU'UN PAQUET A LE DROIT DE VISER**, et pourquoi le 9 n'est pas toujours
 *   de la partie.
 *
 * Les chiffres de la cible d'abord, dans l'ordre croissant — un ordre, pas une
 * préférence : le balayage les essaie tous et le déterminisme (§4.4) exige
 * qu'il les essaie toujours dans le même sens.
 *
 * Puis le 9, MAIS SEULEMENT SI LA CIBLE VEUT DES 6. Le 9 n'a jamais été un but :
 * c'est un 6 qui n'a pas encore tourné, et il ne vaut que parce que `mr9` et
 * `mr39` savent le retourner (`RETOURNABLE`). Or le demi-tour ne rend qu'un 6 et
 * rien d'autre — `visuel/primitives/flip180.js` le refuse noir sur blanc. Une
 * cible qui ne demande pas de 6 n'a donc rien à faire d'un 9 : le lui offrir
 * « à défaut » serait fabriquer un chiffre qui ne servira jamais.
 *
 * ★ Repli exact sur `666` : l'alphabet vaut `{6}`, le 6 y est, la liste est
 * `[6, 9]` — mot pour mot l'ancien `[cible, RETOURNABLE]`.
 */
function butsDuPaquet(visee) {
  const buts = [...visee.alphabet];
  if (visee.utile(SIX_RETOURNE) && !buts.includes(RETOURNABLE)) buts.push(RETOURNABLE);
  return buts;
}

/** Le chiffre qu'un demi-tour PRODUIT — voir `flip180`, qui ne connaît que celui-là. */
const SIX_RETOURNE = 6;

/**
 * Un paquet est-il recevable ?
 *
 * @param {number[]} entree  les chiffres consommés
 * @param {number[]} buts    ce que le paquet a le droit de viser
 */
function paquetRecevable(entree, buts) {
  if (entree.length < 2) return false;
  const somme = entree.reduce((a, b) => a + b, 0);
  const r = reduire(somme);
  // 1. viser quelque chose : un chiffre de la cible, ou le 9 qu'un demi-tour rendra.
  if (!buts.includes(r)) return false;
  // 2. et ne rien appauvrir — l'avertissement de l'auteur, compté.
  const sortie = chiffresDe(somme);
  for (const d of buts) {
    if (compte(sortie, d) < compte(entree, d)) return false;
  }
  return true;
}

/** Largeur maximale d'un paquet d'addition sélective — même lisibilité que `PAQUET_MAX`. */
const PAQUET_ADDITION_MAX = 6;

/**
 * @param {number[]} valeur
 * @param {import('./commun.js').Visee} visee  la cible à fabriquer — reçue, plus jamais devinée
 */
function planAdditionSelective(valeur, visee) {
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

  const buts = butsDuPaquet(visee);
  const sortie = [];
  let i = 0;
  let additions = 0;
  while (i < chiffres.length) {
    // ★ On cherche le paquet le plus COURT qui vise juste, puis, à défaut, le
    //   plus court qui vise le suivant. Une passe par but plutôt qu'un
    //   départage : le 6 ne se négocie pas contre un 9, il passe avant (« ou
    //   les 9 à défaut »), et l'ordre de `butsDuPaquet` fixe ce « avant » une
    //   fois pour toutes.
    let pris = 0;
    let valeur = 0;
    for (const vise of buts) {
      for (let L = 2; L <= PAQUET_ADDITION_MAX && i + L <= chiffres.length; L++) {
        const entree = [];
        for (let k = i; k < i + L; k++) entree.push(chiffres[k].v);
        if (!paquetRecevable(entree, buts)) continue;
        const somme = entree.reduce((a, b) => a + b, 0);
        if (reduire(somme) !== vise) continue;
        pris = L;
        valeur = somme;
        break;
      }
      if (pris) break;
    }
    if (pris) { sortie.push({ v: valeur, debut: i, fin: i + pris }); i += pris; additions++; }
    else { sortie.push({ v: chiffres[i].v, debut: i, fin: i + 1 }); i++; }
  }
  if (!additions) return null;
  // ★ Même exigence que les deux autres ficelles : le résultat doit ÉCRIRE la
  //   cible d'affilée. « Faire `6, 5+1, 6, 8` POUR OBTENIR `666, 8` » — c'est
  //   l'auteur qui met le but dans la phrase, et sans ce but l'addition
  //   sélective n'est plus qu'une addition qu'on a refusé de faire partout.
  return portePleinement(sortie.map((x) => x.v), visee) ? { chiffres, sortie, multi } : null;
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

const LIB_TRI_ALPHABETIQUE = bilingue(
  'On range les lettres par ordre alphabétique',
  'Sort the letters in alphabetical order',
);
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
const LIB_EN_LETTRES = bilingue(
  'On écrit le chiffre en toutes lettres',
  'Write the digit out in French words',
);

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
 * ★ Cette condition ne dit pas un mot du 6 — mais elle disait un mot de TROIS,
 * et c'était la même faute d'un cran plus bas. Elle vaut telle quelle pour
 * `111` et pour `777`, dont les séries font trois chiffres ; sur `13`, elle
 * exigeait une plage de TROIS valeurs identiques pour écrire une cible qui en
 * fait DEUX. `[3,1,3,1]` rangé donne `[1,1,3,3]` — deux plages au lieu de
 * quatre, et la cible écrite —, et l'ancienne condition le refusait.
 *
 * C'est pourquoi cet opérateur porte désormais `viser` : la LONGUEUR d'une
 * série se lit sur la cible, exactement comme le chiffre. Le repli sur `666`
 * est exact — la visée y fait trois chiffres, et `visee.longueur` vaut le
 * `SUITE` d'hier, valeur pour valeur.
 *
 * ⚠️ Ce qui n'est PAS généralisé, et c'est délibéré : le critère reste « la
 * plus longue plage de valeurs IDENTIQUES ». Sur une cible hétérogène, ce n'est
 * qu'un indice — ranger rapproche les semblables, et c'est de ce
 * rapprochement-là que naît un `1 1 3 3`. Compter les occurrences de la cible
 * elle-même serait plus juste et changerait le classement sur `666` (la plus
 * longue plage et le nombre d'occurrences ne varient pas ensemble) ; la
 * non-régression passe avant, et ce raffinement-là attend une mesure.
 *
 * ★ **IL PEUT DÉSORMAIS RANGER UNE LIGNE QUI GAGNE DÉJÀ**, et c'est un
 *   arbitrage de l'auteur.
 *
 *   Il refusait toute ligne portant déjà une plage de la longueur d'une série :
 *   `plusLongue(valeur) < SUITE`. L'intention était bonne — ne pas laisser un
 *   tri s'attribuer un 666 qui était là avant lui — mais elle interdisait le
 *   geste utile : « `mtri` doit pouvoir agir sur une ligne ayant déjà 666, il
 *   s'agit simplement d'en RAJOUTER ; et `mtri` n'était pas gratuit,
 *   l'opération ne sera retenue que si elle est rentable » (l'auteur).
 *
 *   ⚠️ MESURÉ, et c'est ce qui bloquait la suite de son exemple : sur
 *     `666661661662662`, le tri donne `112266666666666` — cinq 6 d'affilée de
 *     plus —, et il était refusé parce que la ligne en portait déjà trois.
 *
 *   La condition devient donc : la plus longue plage doit AUGMENTER, et
 *   atteindre au moins une série. Un tri qui déplace tout sans allonger la
 *   meilleure plage reste refusé — il aurait défait l'ordre de lecture pour
 *   rien. Ce qui garantit qu'on ne s'attribue pas le mérite d'un 666 préexistant
 *   n'est plus un interdit ici, c'est le barème : le rangement se paie
 *   (`elegance.js › REARRANGEMENT`), et une étape qui ne rapporte pas plus
 *   qu'elle ne coûte ne survit pas au classement.
 */
function triRassemble(valeur, visee) {
  const ordre = ordreCroissant(valeur);
  if (!ordre.some((src, i) => valeur[src] !== valeur[i])) return false;
  const plusLongue = (v) => plagesDe(v).reduce((m, p) => Math.max(m, p.compte), 0);
  const avant = plusLongue(valeur);
  const apres = plusLongue(ordre.map((i) => valeur[i]));
  return apres > avant && apres >= visee.longueur;
}

/**
 * ★ LA CLÉ DE RANGEMENT D'UN JETON — sans `localeCompare`.
 *
 * `Intl` et `localeCompare` sont bannis (CONTRACTS §4.4) : leur ordre dépend de
 * la machine, et deux visiteurs verraient deux démonstrations. On range donc sur
 * une clé qu'on fabrique — accents retirés, casse pliée —, et l'ordre est celui
 * des points de code, qui est le même partout. `é` se range avec `e`, `Ç` avec
 * `c`, exactement là où un lecteur francophone les cherche.
 */
function cleAlphabetique(jeton) {
  return String(jeton).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
}

/** L'ordre alphabétique des jetons, stable à clé égale. */
function ordreAlphabetique(jetons) {
  const cles = jetons.map(cleAlphabetique);
  return jetons.map((_, i) => i).sort((a, b) => (
    cles[a] < cles[b] ? -1 : cles[a] > cles[b] ? 1 : a - b));
}

/**
 * ★ MÊME EXIGENCE QUE `triRassemble`, UN CRAN PLUS TÔT DANS LA CHAÎNE.
 *
 * « S'il devrait y avoir un tri, il faudrait le faire en premier : classer les
 * lettres par ordre alphabétique en une étape, pour faire apparaître ensuite le
 * 666 naturellement — puisque le t9 est alphabétique, ça devrait marcher très
 * bien dans pas mal de scénarios » (l'auteur).
 *
 * C'est exact, et c'est mesurable : les tables alphabétiques (`mt9`, `ma1`,
 * `mpy`, `mz26`) donnent la MÊME valeur à des lettres voisines de l'alphabet.
 * Ranger les lettres AVANT de les convertir rassemble donc les valeurs égales
 * sans qu'on ait rien à choisir — là où `mtri`, qui range APRÈS, arrive une fois
 * les nombres écrits et se voit reprocher de défaire l'ordre de lecture pour
 * corriger le tir.
 *
 * ⚠️ **LA CONDITION N'EST PAS CELLE DE `mtri`, ET C'EST MESURÉ.** On a d'abord
 * exigé, comme pour les nombres, que le rangement RASSEMBLE — qu'il laisse moins
 * de plages qu'il n'en a trouvé. Sur les jetons, cette mesure compte des plages
 * de LETTRES IDENTIQUES, et elle refusait `Macron` : `M a c r o n` rangé donne
 * `a c M n o r`, six lettres toutes différentes, aucune plage réunie. Or c'est
 * précisément le cas que l'auteur cite, et il a raison — `a c M n o r` passé au
 * clavier téléphonique donne `2 2 6 6 6 7`, **666 d'affilée**, parce que la
 * table assigne la même touche à des lettres VOISINES et non identiques.
 *
 * Mesurer les lettres pour prédire les nombres était donc une erreur de niveau.
 * Et la garantie qu'on cherchait est structurelle : après un rangement
 * alphabétique, la suite des lettres est croissante, donc TOUTE table qui
 * assigne ses valeurs par tranches d'alphabet (`mt9`, `ma1`, `mpy`, `mz26`,
 * `mx6`) rend une suite où les valeurs égales sont forcément côte à côte. Il n'y
 * a rien à vérifier : c'est vrai par construction.
 *
 * Il ne reste donc que l'exigence commune à tous les mappeurs — **déplacer
 * quelque chose** —, sans quoi l'étape ne montrerait rien et `scenario.js` la
 * sauterait en silence, laissant dans l'URL un code invisible à l'écran. Ce que
 * le rangement coûte, lui, se paie ailleurs : par jeton DÉPLACÉ, au barème
 * d'élégance (`REARRANGEMENT`), comme pour `mtri`.
 */
function rangementUtile(jetons) {
  const ordre = ordreAlphabetique(jetons);
  return ordre.some((src, i) => cleAlphabetique(jetons[src]) !== cleAlphabetique(jetons[i]));
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
 * `debutDeLaCible`).
 *
 * @returns {number[]} les index à retourner, croissants
 */
function triosDeNeuf(valeur, chiffre = 9) {
  const out = [];
  let i = 0;
  while (i < valeur.length) {
    if (valeur[i] !== chiffre) { i++; continue; }
    let j = i;
    while (j < valeur.length && valeur[j] === chiffre) j++;
    const complets = Math.floor((j - i) / TRIO) * TRIO;
    for (let k = 0; k < complets; k++) out.push(i + k);
    i = j;
  }
  return out;
}

/**
 * ★ **LE GESTE DU DEMI-TOUR — commun aux deux sens.**
 *
 * Il était écrit dans `mr9` et n'y connaissait que le 9. Depuis que `flip180`
 * est symétrique, le même geste sert au demi-tour MONTANT (`mr6`, les 6 qui
 * deviennent des 9) : seul change le chiffre qui tourne. On l'extrait plutôt
 * que de le recopier — une seconde copie de trente lignes d'animation serait la
 * garantie que les deux divergent au premier réglage.
 *
 * ★ **LES TRIPLÉS D'AFFILÉE SE RETOURNENT D'UN BLOC.** Le calcul ne change pas
 *   d'un iota — chaque chiffre tourne un par un, et c'est `apply` qui le dit —,
 *   mais le GESTE distingue : là où la ligne écrit déjà `999`, on ne retourne
 *   pas trois chiffres, on retourne une image. `triosDeNeuf` marque les indices
 *   concernés, et il le fait comme on lit : par plages contiguës, trois par
 *   trois depuis la gauche, sans jamais entamer un quatrième chiffre esseulé.
 */
function stepsDuDemiTour(avant, apres, ctx, depuis, lib) {
  const enTrio = new Set(triosDeNeuf(avant.valeur, depuis));
  const ops = [];
  const tournes = [];
  let i = 0;
  while (i < apres.valeur.length) {
    if (apres.valeur[i] === avant.valeur[i]) { i++; continue; } // il ne bouge pas
    if (enTrio.has(i)) {
      const bloc = [i, i + 1, i + 2];
      const nes = bloc.map((k) => token(nomToken(ctx, k), apres.valeur[k], 'number'));
      for (const t of nes) tournes.push(t.id);
      // `targets` et `to` dans l'ORDRE DE LA LIGNE : le miroir de la rotation
      // est l'affaire de la primitive, pas la nôtre. Le modèle de ligne
      // remplace ainsi place pour place, sans rien savoir du pivot.
      ops.push({ op: 'flip180', targets: bloc.map((k) => ctx.ids[k]), to: nes });
      i += TRIO;
      continue;
    }
    const id = nomToken(ctx, i);
    tournes.push(id);
    ops.push({ op: 'flip180', target: ctx.ids[i], to: token(id, apres.valeur[i], 'number') });
    i++;
  }
  if (!ops.length) return [];
  // Le `pulse` final vient APRÈS le dernier demi-tour, jamais pendant : pendant,
  // le jeton d'arrivée voit déjà son `scale` animé par le crossfade de
  // `flip180` (même raison que dans `posts.js`).
  ops.push({ op: 'pulse', targets: tournes, stagger: 60 });
  const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
  return [etape(ctx, dire(lib, ctx.langue), legende, enchainer(ops))];
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
 * dans un paquet, et il RÉÉCRIT chaque paquet par sa somme. Il ne se contente
 * pas de saisir une occasion : il refait la lecture du nombre pour que le
 * résultat lui convienne.
 *
 * ── ★ CE QU'UN PAQUET RAPPORTE : un 6 **OU** un 9 ──────────────────────────
 *
 * « Si l'objectif est 6, garder les 9 et les 6 (`mr9` ou `mr39` convertiront
 * les 9 en 6) ; si l'objectif est autre que 6, alors tente de convertir vers
 * l'objectif. » — l'auteur, et c'est la règle générale qu'il énonce.
 *
 * Un 9 n'est donc PAS un chiffre perdu : c'est un 6 qui n'a pas encore fait son
 * demi-tour, et le catalogue porte deux opérateurs qui le lui feront faire.
 * Deux conséquences, et elles sont symétriques :
 *
 *  · un 9 déjà écrit **n'est jamais absorbé**, exactement comme un 6 — c'est
 *    lui aussi un acquis, et l'additionner à un voisin le détruirait ;
 *  · un paquet qui **tombe sur 9** compte comme une réussite, au même titre
 *    qu'un paquet qui tombe sur 6.
 *
 * ★ **LA SECONDE MOITIÉ DE LA RÈGLE S'ÉCRIT DÉSORMAIS ICI** — « si l'objectif
 * est autre que 6, tente de convertir vers l'objectif ». Elle ne le pouvait pas
 * tant que la cible n'atteignait pas `apply()` ; elle l'atteint, par `viser`
 * (`commun.js › selonLaCible`), et sans que la signature §2.2 ait bougé d'un
 * signe — c'est le DESCRIPTEUR qui se fabrique pour une cible, `apply` la
 * tenant par fermeture.
 *
 * ⚠️ Le 9, lui, ne suit PAS la cible, et c'est la seule chose qui reste écrite
 * en dur : un demi-tour ne rend qu'un 6 (`visuel/primitives/flip180.js` le
 * refuse noir sur blanc). Il n'est donc « à défaut » que lorsque la cible veut
 * des 6 — voir `rapporte` et `butsDuPaquet`, qui posent la même règle pour
 * `mad`.
 *
 * ── ★ LA SOMME S'ÉCRIT TELLE QU'ELLE TOMBE — plus de racine numérique ───────
 *
 * L'opérateur réduisait chaque paquet « à un chiffre par addition, répétée si
 * besoin » : `7+1+0+8 = 16` devenait 7. C'était une étape de trop, et elle
 * DÉTRUISAIT ce qu'on cherche — 16 porte un 6, 7 n'en porte aucun. L'auteur le
 * montre dans son propre calcul, où `7+1+0+8` reste `16` et où le 6 ainsi écrit
 * se retrouve jusque dans le verdict.
 *
 * La somme rejoint donc la ligne **chiffre à chiffre**, comme tout le reste :
 * un paquet qui fait 16 rend deux signes, `1` et `6`. La ligne reste une ligne
 * de chiffres — ce qu'elle était déjà en entrant —, et rien n'y est plus caché
 * qu'ailleurs : le spectateur voit la somme tomber, puis s'écrire.
 *
 * ── « Le plus souvent possible » est une OPTIMISATION, pas une occasion ─────
 *
 * L'auteur dit « de manière à ce que ça tombe sur 6 le plus souvent possible ».
 * Ce n'est pas ce que fait un balayage glouton — c'est une programmation
 * dynamique, et elle tient en `O(n × 6)` :
 *
 *  1. **maximiser le nombre de chiffres de sortie qui valent 6 ou 9.** C'est la
 *     consigne, augmentée de la règle des 9 ci-dessus ;
 *  2. **à égalité, minimiser le nombre de paquets.** Ce qui ne tombe pas sur 6
 *     est absorbé plutôt que laissé à traîner : un redécoupage qui sème des
 *     zéros et des 1 derrière lui n'a pas redécoupé, il a émietté ;
 *  3. **à égalité encore, la coupe la plus courte d'abord** — l'ordre de
 *     lecture, et le seul départage qui n'invente rien (§4.4).
 *
 * ⚠️ MESURE, sur l'exemple que l'auteur a écrit à la main. Ses trente chiffres
 *
 *     9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1
 *
 * doivent, dit-il, se découper `999 7+1+1 2+1+0+5+1 1 6 9 7+1+0+8 1+0+5 1+1
 * 5+1+0 9 1+0+1` et rendre `999991691662692`. **C'est exactement, coupe pour
 * coupe, ce que rend la programmation dynamique ci-dessous** — les trois
 * départages n'ont pas été choisis pour cela, ils étaient déjà écrits ; ce sont
 * la règle des 9 et l'abandon de la racine numérique qui font tomber la découpe
 * juste. Un test le gèle (`catalogue.test.js`).
 *
 * Et la suite que l'auteur en tire se rejoue telle quelle : `mr9` écrit
 * `666661661662662`, un tri (`mtri` ou `mtal`) `112266666666666`, et un dernier
 * `mad` ou `mrd` — `1+1+2+2 → 6` — donne `666 666 666 666`.
 *
 * ── Trois refus, et ils bornent tout le reste ───────────────────────────────
 *
 *  · **aucun 6 ni aucun 9 déjà là n'est absorbé.** L'un et l'autre sont des
 *    acquis ; les additionner à un voisin les détruirait, ce que le barème
 *    punit par ailleurs (`SIX_DETRUIT`). C'est la doctrine de `mad`, reprise
 *    telle quelle — et c'est aussi ce que fait l'auteur dans son propre calcul,
 *    où les `999`, le `6` et les deux `9` isolés restent seuls dans leur
 *    paquet ;
 *  · **le résultat doit porter STRICTEMENT PLUS de 6-ou-9 que la ligne de
 *    chiffres dont il sort.** Une triche qui coûte sans rien acheter n'a pas
 *    lieu d'être jouée (même discipline que `mpf`, `m1s2`, `mad`) ;
 *  · **au moins un paquet de plusieurs chiffres**, sans quoi l'opérateur n'a
 *    fait qu'écrire les nombres chiffre à chiffre — un geste que personne ne
 *    lui a demandé, et qui porterait dans l'URL un code pour rien.
 *
 * ── Ce que le plan rend ─────────────────────────────────────────────────────
 *
 * `{ chiffres, multi, paquets }`, où `chiffres` est la ligne éclatée
 * (`{v, src}`), `multi` l'ensemble des nombres qui ont vraiment été éclatés, et
 * `paquets` la découpe retenue (`{debut, fin, somme, sortie}`) — `sortie` étant
 * les chiffres que le paquet écrit, un seul le plus souvent, deux quand la
 * somme dépasse neuf.
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
 *
 * ★ **LE SEUIL EST SUPPRIMÉ, ET CE QUI PRÉCÈDE RESTE ÉCRIT PARCE QUE C'EST UN
 *   AVERTISSEMENT.** L'auteur veut un malus dégressif plutôt qu'une porte
 *   fermée, et il a raison sur le fond : `mrd` s'applique parfaitement à douze
 *   chiffres, il y est simplement plus voyant. Mais les deux symptômes relevés
 *   ci-dessus n'étaient PAS des symptômes de tarif — c'étaient des symptômes
 *   d'ÉVICTION : les voies honnêtes ne tombaient pas plus bas au classement,
 *   elles n'atteignaient plus le classement (`assemblage.js ›
 *   K_CANONISABLES`). Un barème ne peut rien pour ce qu'il ne voit jamais.
 *
 *   La dégressivité est donc la bonne réponse à la question posée, et elle ne
 *   répond pas à celle-là. Ce qu'elle donne sur le corpus est mesuré et
 *   consigné dans le commit ; si l'éviction revient, elle se corrigera là où
 *   elle a lieu — dans la largeur du faisceau —, pas en refermant la porte.
 */

/**
 * Largeur maximale d'un paquet. Six chiffres, et c'est un CHOIX de lisibilité
 * plutôt qu'une borne arithmétique : une racine numérique de 6 s'obtient avec
 * une somme de 6, 15, 24, 33… donc, en principe, avec autant de chiffres qu'on
 * veut. Au-delà de six termes sous une même accolade, la scène ne se lit plus
 * et l'addition cesse d'être vérifiable d'un coup d'œil — c'est le même seuil
 * que `mad`, pour la même raison de mise en scène.
 */
const PAQUET_MAX = 6;

/**
 * ★ LE 9 EST UN 6 QUI N'A PAS ENCORE TOURNÉ.
 *
 * « Garder les 9 et les 6 (`mr9` ou `mr39` convertiront les 9 en 6) »
 * (l'auteur). Ce n'est pas une faveur faite au 9 : c'est la constatation que le
 * catalogue porte deux opérateurs — `mr9` un par un, `mr39` par trios — dont
 * c'est tout le métier. Un 9 gardé est donc un 6 acquis, à un demi-tour près,
 * et le redécoupage le traite comme tel : il ne l'absorbe pas, et il compte
 * comme une réussite un paquet qui tombe dessus.
 *
 * Le nombre est écrit ICI et nulle part ailleurs dans cette fonction, et il n'a
 * pas eu à descendre : le demi-tour ne rend qu'un 6
 * (`visuel/primitives/flip180.js`), donc le 9 ne « rapporte » que quand la
 * cible veut des 6. La cible, elle, descend par `viser` — voir
 * `butsDuPaquet`, qui pose exactement la même règle pour `mad`.
 */
const RETOURNABLE = 9;

/**
 * Ce chiffre-là sert-il la cible ? Un chiffre qu'elle demande, ou le 9 qu'un
 * demi-tour changera en 6 — ce dernier seulement si elle veut des 6.
 *
 * ★ Repli exact sur `666` : l'alphabet vaut `{6}`, le 6 y est, la réponse est
 * « 6 ou 9 » — mot pour mot l'ancien `d === SIX || d === RETOURNABLE`.
 */
const rapporte = (d, visee) => visee.utile(d)
  || (d === RETOURNABLE && visee.utile(SIX_RETOURNE));

/** Les chiffres qu'un nombre écrit — la ligne ne porte jamais autre chose. */
const chiffresDe = (n) => [...String(n)].map(Number);

function planRedecoupage(valeur, visee) {
  if (!valeur.length) return null;
  if (valeur.some((v) => !Number.isInteger(v) || v < 0)) return null;
  // ★ Deux prédicats, et il faut bien les deux. `paye` dit « ce chiffre sert »
  //   — la cible, ou le 9 qu'un demi-tour rendra ; `vise` dit « ce chiffre EST
  //   la cible ». Le premier compte les gains, le second départage les ex æquo
  //   (« à tout prendre, plus de 6 que de 9 »). Ils sont nommés ici plutôt que
  //   passés en `filter` : `Array.prototype.filter` donne l'INDEX en second
  //   argument, et `filter(rapporte)` remettrait un entier là où la visée
  //   s'attend.
  const paye = (d) => rapporte(d, visee);
  const vise = (d) => visee.utile(d);
  const chiffres = [];
  valeur.forEach((v, i) => {
    for (const c of String(v)) chiffres.push({ v: Number(c), src: i });
  });
  const n = chiffres.length;
  // ★ **PLUS DE SEUIL BAS — c'est le BARÈME qui décide, plus la grammaire.**
  //   « Au lieu d'un seuil unique je voudrais un malus dégressif : à 2 chiffres
  //   malus maximum, à 20 chiffres malus négligeable, à 10 acceptable »
  //   (l'auteur). Voir `elegance.js › degressiviteRedecoupage`. Un refus pur et
  //   simple disait « cette règle n'existe pas ici », ce qui est faux : elle
  //   existe, elle est juste CHÈRE sur une ligne courte — et le prix est
  //   précisément ce que le barème sait exprimer.
  if (n > CHIFFRES_REDECOUPE_MAX) return null;

  // ── la programmation dynamique, de la fin vers le début
  const meilleur = Array.from({ length: n + 1 }, () => null);
  meilleur[n] = { gains: 0, six: 0, paquets: 0, coupe: 0, somme: 0, sortie: [] };
  for (let i = n - 1; i >= 0; i--) {
    // Un chiffre qui sert déjà — de la cible, ou le 9 qu'un demi-tour rendra —
    // reste seul dans son paquet : on ne l'absorbe jamais.
    const large = paye(chiffres[i].v) ? 1 : PAQUET_MAX;
    let somme = 0;
    for (let L = 1; L <= large && i + L <= n; L++) {
      // …et l'on ne va pas non plus le chercher plus loin dans le paquet.
      if (L > 1 && paye(chiffres[i + L - 1].v)) break;
      somme += chiffres[i + L - 1].v;
      const suite = meilleur[i + L];
      if (!suite) continue;
      // Un paquet d'un seul chiffre le RECOPIE ; un paquet qui additionne écrit
      // sa somme, chiffre à chiffre — `7+1+0+8` rend « 1 6 », pas « 7 ».
      const sortie = L === 1 ? [chiffres[i].v] : chiffresDe(somme);
      const gains = suite.gains + sortie.filter(paye).length;
      const six = suite.six + sortie.filter(vise).length;
      const paquets = suite.paquets + 1;
      const cur = meilleur[i];
      // Départage explicite, dans l'ordre dicté : plus de chiffres qui SERVENT,
      // puis moins de paquets, puis — à tout prendre — plus de chiffres de la
      // cible que de 9 à retourner, puis la coupe la plus courte, c'est-à-dire
      // la première rencontrée, `L` étant croissant.
      //
      // ★ Le troisième critère est un ARBITRAGE, et il est gratuit sur
      //   l'exemple de l'auteur (mesuré : la découpe ne bouge pas d'une coupe).
      //   Un 9 gardé vaut un 6 « à un demi-tour près » — mais ce demi-tour est
      //   un geste de plus, donc à égalité stricte le 6 vaut mieux. Le monter
      //   plus haut dans la liste, en revanche, DÉFAIT sa découpe : mesuré, le
      //   placer avant le compte de paquets rend `9999262691662692` là où il
      //   écrit `999991691662692`. On ne le fait donc pas.
      const meilleurQue = !cur || gains > cur.gains
        || (gains === cur.gains && (paquets < cur.paquets
          || (paquets === cur.paquets && six > cur.six)));
      if (meilleurQue) {
        meilleur[i] = { gains, six, paquets, coupe: L, somme, sortie };
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
    paquets.push({ debut: i, fin: i + b.coupe, somme: b.somme, sortie: b.sortie });
    if (b.coupe > 1) groupes++;
    i += b.coupe;
  }
  if (!groupes) return null;
  const avant = chiffres.filter((c) => paye(c.v)).length;
  const apres = paquets.reduce((t, p) => t + p.sortie.filter(paye).length, 0);
  return apres > avant ? { chiffres, multi, paquets } : null;
}

/** L'identifiant de scène du kᵉ chiffre — même règle que pour `mad`. */
const idChiffreRedecoupe = (plan, ctx, k) => (plan.multi.has(plan.chiffres[k].src)
  ? `${ctx.cle}c${k}` : ctx.ids[plan.chiffres[k].src]);

/**
 * Les identifiants de scène des chiffres que le jᵉ paquet ÉCRIT.
 *
 * Un paquet d'un seul chiffre ne fait que le laisser vivre : il garde son
 * identité de jeton. Un paquet qui additionne écrit des signes neufs — un
 * quand la somme tient en un chiffre, deux quand elle déborde.
 */
const idsPaquet = (plan, ctx, p, j) => (p.fin - p.debut < 2
  ? [idChiffreRedecoupe(plan, ctx, p.debut)]
  : p.sortie.map((_, t) => `${ctx.cle}s${j}x${t}`));

/** Le jeton où la SOMME d'un paquet atterrit, avant de s'écrire chiffre à chiffre. */
const idSomme = (plan, ctx, p, j) => (p.sortie.length < 2
  ? idsPaquet(plan, ctx, p, j)[0] : `${ctx.cle}t${j}`);


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
    // ★ Le nom de l'OUTIL, affiché dans la scène sous le décor qu'elle monte —
    //   dérivé du catalogue (`commun.js › def`, champ « outil »), jamais écrit
    //   côté visuel. En plein écran, le décor est tout ce qu'on voit : sans son
    //   nom, on regarde un clavier ou un afficheur sans savoir de quelle
    //   méthode il est la preuve.
    const nomOutil = dire(spec.outil || spec.libelle, ctx.langue);
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
            titre: nomOutil,
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
            titre: nomOutil,
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
          titre: nomOutil,
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
              titre: nomOutil,
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
            titre: nomOutil,
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
    /**
     * ★ **IL COMPTE DÉSORMAIS CE QUE `tsp` MONTRE — et c'était un bug.**
     *
     * « Soit seuls les `/` sont comptés ce qui fait 3, soit tous les séparateurs
     * le sont, et il manque `:` donc le total fait 5 et non 4. » (l'auteur)
     *
     * ⚠️ MESURÉ, sur la saisie qu'il donne. Sur `https://reinfocovid.fr/`,
     * `tsp` — « on ne garde que les séparateurs » — rend CINQ jetons
     * (`: / / . /`), et celui-ci en annonçait QUATRE : il lisait `[-._/]`, une
     * seconde définition du mot « séparateur », plus étroite, recopiée ici et
     * qui avait divergé de celle de `tokeniseurs.js`. Deux opérateurs du même
     * catalogue, portant le même nom, ne comptaient pas la même chose.
     *
     * C'est la faute que CONTRACTS §0.3 nomme, et elle se corrige d'une seule
     * façon : en supprimant la copie. `estSeparateur` est désormais la question
     * posée à la SEULE source (`tokeniseurs.js`), celle-là même dont `tsp` tire
     * ce qu'il affiche.
     *
     * ⚠️ **Un code alloué change donc de compte**, ce que le registre
     * append-only (§4.1) n'autorise pas à la légère. C'est assumé comme une
     * CORRECTION et non comme une variante : l'ancien compte n'était pas une
     * autre lecture défendable, c'était le désaccord de deux opérateurs sur le
     * sens d'un mot. Le vecteur gelé (`a-b.c` → 2) ne bouge pas ; ce qui bouge,
     * ce sont les saisies portant `:`, `?`, `&`, `=`, `,`, `;`, `!`, `~`, `+`
     * ou une espace — c'est-à-dire les adresses.
     */
    id: 'n.separateurs', code: 'nsp',
    libelle: bilingue('Combien de séparateurs ?', 'How many separators?'),
    regle: bilingue(
      'Tout ce qui sépare : tirets, points, barres, deux-points, espaces…',
      'Everything that separates: dashes, dots, slashes, colons, spaces…',
    ),
    notoriete: 0.65,
    compte: (s) => [...s].filter(estSeparateur).length || null,
    cibles: (s) => rangs(s, estSeparateur),
  },
  // ★ **LES QUATRE COMPTEURS PRÉCIS** — « tu peux faire plusieurs opérateurs :
  //   un pour les séparateurs, un pour les `/`, un pour les `.`, pourquoi pas
  //   un pour les espaces et un pour les `-` » (l'auteur).
  //
  //   Ils ne sont pas redondants avec celui du dessus : sur
  //   `https://reinfocovid.fr/`, « tous les séparateurs » fait 5, « les barres »
  //   3, « les points » 1. Trois lectures, trois nombres, et chacune s'énonce
  //   AVANT d'avoir vu la saisie — ce qui est précisément ce qui les sépare
  //   d'une ficelle.
  //
  //   ⚠️ Chacun COMPTE CE QU'IL MONTRE : l'accolade embarque un caractère à la
  //   fois (`cibles`, le même prédicat que `compte`), et le contrôle croisé de
  //   `comptageDe` refuse le geste si les deux ne tombent pas d'accord.
  ...[
    ['n.barres', 'nsl', 0.55, '/', bilingue('Combien de barres obliques ?', 'How many slashes?'),
      bilingue('Les barres obliques d’une adresse', 'The slashes in an address')],
    ['n.points', 'npt', 0.55, '.', bilingue('Combien de points ?', 'How many dots?'),
      bilingue('Les points d’une adresse ou d’une phrase', 'The dots in an address or a sentence')],
    ['n.espaces', 'nes', 0.60, ' ', bilingue('Combien d’espaces ?', 'How many spaces?'),
      bilingue('Ce qui sépare les mots', 'What sets the words apart')],
    ['n.tirets', 'ntr', 0.55, '-', bilingue('Combien de tirets ?', 'How many dashes?'),
      bilingue('Les tirets, et eux seuls', 'The dashes, and nothing else')],
  ].map(([id, code, notoriete, signe, libelle, regle]) => ({
    id,
    code,
    libelle,
    regle,
    notoriete,
    // ★ Un `adHoc` un cran au-dessus des mesures de lettres (0) : choisir QUEL
    //   signe compter, parmi cinq, est déjà un choix — même s'il s'énonce
    //   d'avance. Il reste très bas : le signe ne dépend pas du nombre cherché.
    adHoc: 0.15,
    // La comparaison est faite sur le caractère lui-même, jamais sur une
    // expression rationnelle recopiée : un signe est un signe.
    compte: (s) => [...s].filter((c) => c === signe).length || null,
    cibles: (s) => rangs(s, (c) => c === signe),
  })),
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
    // ★ **EN GLISSIÈRE, COMME L'ATBASH** — parce que c'est le même geste.
    //
    //   Il se montrait en réglette : une case par lettre, portant d'emblée
    //   « A 26 ». Le rang inversé y était AFFIRMÉ, jamais dérivé — et il l'est
    //   pourtant, à partir du rang ordinaire que tout le monde connaît.
    //
    //   « Amène-le comme l'Atbash : sors la numérotation dans l'ordre, puis
    //   retourne-la en ellipse, puis fusionne aux touches, puis fais la
    //   conversion » (l'auteur). C'est exactement ce que la glissière joue déjà
    //   pour `f.atbash` : la bande du bas paraît alignée sur celle du haut,
    //   elle se retourne, elle se recolle, et la lettre descend alors sur la
    //   case qui lui fait face.
    //
    //   ⚠️ La glissière EXIGE que la bande du bas parcoure son alphabet d'un pas
    //     constant de ±1 (`verifierGlissiere`) : deux réglettes alignées qui ne
    //     se déduisent pas l'une de l'autre affirmeraient une règle que la table
    //     n'a pas. `26, 25, … 1` descend d'exactement 1 — la condition est donc
    //     satisfaite, et c'est elle qui autorise cette mise en scène plutôt
    //     qu'une simple ressemblance de forme.
    geste: 'table', forme: 'glissiere', ordre: 'z26a1',
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
    // Ne compte QUE les lettres — voir sa jumelle à quatre rangées, et
    // l'exclusion qui les sépare (`recherche/elegance.js`).
    convention: 'clavier:3rangees',
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
    // Ne compte QUE les lettres — voir sa jumelle à quatre rangées, et
    // l'exclusion qui les sépare (`recherche/elegance.js`).
    convention: 'clavier:3rangees',
    fn: (c) => rangee(pli(c), QWERTY),
  },
  // ★ **LES DEUX RANGÉES À QUATRE LIGNES** — le clavier entier, chiffres compris.
  //
  //   Leurs aînées comptent 1, 2, 3 sur les seules rangées de lettres ;
  //   celles-ci comptent 2, 3, 4, la rangée des chiffres étant la première. Les
  //   deux conventions se tiennent, et c'est bien le problème : pouvoir choisir
  //   après coup laquelle tombe juste serait « une ficelle bien trop visible »
  //   (l'auteur). Elles ne peuvent donc PAS se rencontrer dans une même voie —
  //   la règle vit dans `recherche/elegance.js › CONVENTIONS_EXCLUSIVES`, et
  //   c'est le champ `convention` ci-dessous qui la rend lisible sans deviner.
  //
  //   ⚠️ Plus ad hoc que leurs aînées, et d'un cran seulement : compter la
  //     rangée des chiffres est ce que le clavier MONTRE — la colonne le fait
  //     déjà —, mais ne compter que les lettres est ce qu'on fait
  //     spontanément. Le choix demande donc une justification que le premier
  //     n'exige pas.
  {
    id: 'm.azertyRangee4', code: 'maz4',
    libelle: bilingue('Rangée de la touche, chiffres compris, en AZERTY',
      'Key row counting the digit row, on a French AZERTY'),
    regle: bilingue('1 pour les chiffres, puis 2, 3, 4 en descendant',
      '1 for the digits, then 2, 3, 4 going down'),
    notoriete: 0.20, adHoc: 0.3,
    note: NOTE_AFNOR, geste: 'keyboard', disposition: 'azerty', mesureClavier: 'rangee',
    convention: 'clavier:4rangees',
    fn: (c) => rangeeDepuisLesChiffres(pli(c), AZERTY),
  },
  {
    id: 'm.qwertyRangee4', code: 'mqw4',
    libelle: bilingue('Rangée de la touche, chiffres compris, en QWERTY',
      'Key row counting the digit row, on a US QWERTY'),
    regle: bilingue('1 pour les chiffres, puis 2, 3, 4 en descendant',
      '1 for the digits, then 2, 3, 4 going down'),
    notoriete: 0.20, adHoc: 0.3,
    geste: 'keyboard', disposition: 'qwerty', mesureClavier: 'rangee',
    convention: 'clavier:4rangees',
    fn: (c) => rangeeDepuisLesChiffres(pli(c), QWERTY),
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
    // ★ **DÉPRÉCIÉ — « trop alambiqué, à supprimer » (l'auteur).**
    //
    //   Il fallait, pour lire une seule lettre, passer par son NOM français,
    //   puis compter les lettres de ce nom : « W → double vé → 8 ». Trois
    //   affirmations enchaînées, dont la deuxième ne se démontre pas — elle se
    //   récite. Et la table qui la porte demandait neuf colonnes au lieu de
    //   treize, pour que « double vé » tienne dans sa case.
    //
    //   ⚠️ DÉPRÉCIÉ, PAS RAYÉ : le code reste réservé, l'opérateur quitte la
    //     recherche (`bfs.js`) et reste jouable depuis `debug.html`.
    deprecated: true,
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
  // ★ Le nom AFFICHÉ DANS LA SCÈNE : celui que l'opérateur déclare, sinon celui
  // que son geste porte (clavier, afficheur), sinon son libellé. Il est calculé
  // ici, une fois, pour que `steps()` et le catalogue lisent la MÊME chaîne.
  const outil = spec.outil || outilDuGeste(spec) || reste.libelle;
  const base = {
    ...reste, geste, mode, metrique, casse, disposition, mesureClavier,
    forme, colonnes, cycle, teinte, outil,
    // ★ La table MONTRÉE est dérivée de `fn`, la fonction même que `apply()`
    // applique. Une seule source, donc aucune divergence possible.
    table: geste === 'table' ? tableDe(fn, { noteDe, labelDe }) : null,
  };
  return def({
    ...reste,
    outil,
    famille: 'mappeur',
    from: 'TOKENS',
    to: 'NUMS',
    apply: parLettre(fn),
    steps: etapeMappeur(base),
  });
});

const LIB_MLM = bilingue('Chaque mot vaut son nombre de lettres', 'Each word is worth its letter count');
const REGLE_MLM = bilingue('On compte les lettres de chaque jeton', 'Count the letters of every token');

/**
 * ★ **UN MOT SE COMPTE, LETTRE PAR LETTRE — comme tout le reste.**
 *
 * `m.longueurToken` se contentait du geste sobre : `hope` s'effaçait, `4`
 * paraissait, `fr` s'effaçait, `2` paraissait. C'était la faute exacte que
 * `n.longueur` avait déjà corrigée pour la ligne entière — « rien n'y
 * distinguait "on compte les lettres" de "on compte les voyelles", et le
 * nombre annoncé n'était jamais celui qu'on avait vu se former ». Un mot qui
 * devient un nombre sans qu'on ait vu compter est une affirmation de plus.
 *
 * « Animation manquante/catastrophique, appliquer ce que je dis pour `jnf` »
 * (l'auteur) — c'est-à-dire le comptage sous accolade de `cnj` et de
 * `n.longueur`. Le geste est donc le leur, mot pour mot, et il vient du même
 * endroit (`opComptage`, `combinateurs.js`) :
 *
 *  ① le mot S'ÉCLATE en ses lettres — nées sur leurs propres glyphes, puisque
 *    mises bout à bout elles réécrivent le mot (`substitute` l'exige) ;
 *  ② l'accolade se ferme, chaque lettre descend dans sa pointe et fait avancer
 *    le compteur d'un cran, et le nombre remonte prendre la place du mot.
 *
 * ★ **Un step PAR MOT.** Même raison que pour les tables et les afficheurs :
 * compter quatre mots à la fois, ce sont quatre chantiers simultanés, et l'on
 * ne voit plus quel mot a donné quel nombre — c'est-à-dire précisément ce
 * qu'il fallait montrer.
 *
 * ★ **Ce qui n'est pas une lettre ne compte pas, et on le VOIT ne pas
 * compter** : `count` ne désigne que les lettres, le reste s'efface sur place
 * sans faire bouger le compteur. C'est la règle d'`etapeMesure`, appliquée à
 * l'intérieur d'un mot au lieu de la ligne entière.
 *
 * ★ **Un mot d'une seule lettre garde le geste sobre.** L'éclater en
 * lui-même pour compter jusqu'à un ne montrerait rien : il n'y a pas de
 * comptage à voir, il y a un `1` à écrire.
 */
function etapeLongueurMot() {
  return (avant, apres, ctx) => {
    const sortie = nomsTokens(ctx, apres.valeur.length);
    const titre = (langue) => dire(LIB_MLM, langue);
    return avant.valeur.map((mot, i) => {
      const chars = [...String(mot)];
      const n = apres.valeur[i];
      const to = token(sortie[i], n, 'number');
      const t = titre(ctx.langue);
      const legende = `${dire(REGLE_MLM, ctx.langue)} : ${mot} → ${n}`;
      if (chars.length < 2) {
        return etape(ctx, t, legende, enchainer([
          { op: 'substitute', pairs: [{ target: ctx.ids[i], to }] },
          { op: 'pulse', targets: [sortie[i]] },
        ]), { id: `s_${ctx.cle}_${i}` });
      }
      const lettres = chars.map((_, k) => `${ctx.cle}l${i}x${k}`);
      const comptees = lettres.filter((_, k) => estLettre(chars[k]));
      return etape(ctx, t, legende, enchainer([
        {
          op: 'substitute',
          pairs: [{
            target: ctx.ids[i],
            to: chars.map((c, k) => token(lettres[k], c, estLettre(c) ? 'letter' : 'sep')),
          }],
        },
        opComptage({
          ids: lettres,
          // `count` n'est déclaré que s'il RESTREINT : un mot tout en lettres
          // compte entièrement, et le dire deux fois n'ajoute rien.
          count: comptees.length === lettres.length ? null : comptees,
          symbole: '#',
          libelle: t,
          to,
        }),
      ]), { id: `s_${ctx.cle}_${i}`, hold: 400 });
    });
  };
}

const AUTRES_MAPPEURS = [
  def({
    id: 'm.longueurToken', code: 'mlm', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: LIB_MLM,
    regle: REGLE_MLM,
    // ★ **« EN QUOI NE FAIT-IL PAS DOUBLON avec `cnj` / `nl` ? »** (l'auteur).
    //
    //   Réponse MESURÉE, pas argumentée. Sur un corpus de dix découpages en
    //   mots, on a comparé la sortie de `mlm` à celle de **tous** les autres
    //   opérateurs du catalogue, puis à celle de **toutes** les compositions de
    //   deux codes : aucun ne la reproduit, pas une fois.
    //
    //   La raison tient dans les TYPES, et elle est nette :
    //
    //   | code  | de → vers      | ce qu'il rend                          |
    //   |-------|----------------|----------------------------------------|
    //   | `nl`  | `STR → NUM`    | un nombre, AVANT tout découpage         |
    //   | `cnj` | `TOKENS → NUM` | un nombre : **combien de morceaux**     |
    //   | `mlm` | `TOKENS → NUMS`| **un nombre PAR morceau**               |
    //
    //   Sur `["hope"]`, `mlm` rend `[4]` et `cnj` rend `1` — l'un compte les
    //   lettres du mot, l'autre compte les mots. Ils ne se ressemblent que sur
    //   `nl("hope") = 4`, et encore : `nl` travaille sur la chaîne, avant
    //   qu'un tokeniseur ait pu passer, et rend un scalaire. Une fois la ligne
    //   découpée, `nl` n'est plus applicable du tout.
    //
    //   Ce que `mlm` apporte et que rien d'autre n'apporte, c'est donc le
    //   VECTEUR : `hope-hope-hope.fr` → `[4, 4, 4, 2]`, sur lequel un
    //   combinateur peut ensuite prendre l'écart, le maximum, la moyenne. Le
    //   réduire à un scalaire, c'est perdre le découpage — c'est-à-dire
    //   précisément ce que le README promet de montrer.
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const out = valeur.map((tok) => [...String(tok)].filter(estLettre).length);
      if (!out.length || out.some((n) => n === 0)) return null;
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    steps: etapeLongueurMot(),
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
  mappeurGeste({
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
  }, {
    libelle: bilingue('Le chiffre qui partage la touche',
      'The digit that shares the same key'),
    regle: bilingue('Le tiret du 6, et ses neuf voisines de la rangée du haut',
      'The dash on the 6 — and its nine neighbours on the top row'),
    geste: 'keyboard', disposition: 'azerty', mesureClavier: 'touche',
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
  mappeurGeste({
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
  }, {
    libelle: bilingue('Lettre vers nombre de segments, en 14 segments',
      'Letter to number of segments, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments (celui des autoradios et des tableaux '
      + 'd’affichage), combien faut-il allumer de segments pour former cette lettre ?',
      'On a fourteen-segment display (the one in car radios and station boards), how many '
      + 'segments have to light up to form this letter?'),
    geste: 'fourteenSeg', mode: 'segments',
  }),
  mappeurGeste({
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
  }, {
    libelle: bilingue('Lettre vers nombre de traits, en 14 segments',
      'Letter to number of strokes, on a fourteen-segment display'),
    regle: bilingue('Sur afficheur 14 segments, combien faut-il de lignes droites '
      + 'continues pour former cette lettre ?',
      'On a fourteen-segment display, how many unbroken straight lines does it take to '
      + 'form this letter?'),
    geste: 'fourteenSeg', mode: 'fusion',
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
      'On ne retourne que les 9. Retourner un 6 serait, disons, contre-productif. '
      + 'Trois 9 côte à côte pivotent d’un seul bloc : 999 renversé, c’est 666.',
      'Only the 9s get turned. Turning a 6 would be, shall we say, counter-productive. '
      + 'Three 9s side by side pivot as one block: 999 upside down is 666.',
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
    // ★ CE QUE SON EXEMPLE DOIT EXERCER (`debug.js › programmePour`).
    //
    //   Le demi-tour a DEUX formes depuis qu'il a absorbé les trios : le bloc
    //   qui pivote d'une pièce, et le 9 esseulé qui tourne sur lui-même. Un
    //   état sans `999` d'affilée n'en montre qu'une — et laisse croire qu'il
    //   n'y en a qu'une. C'est exactement le cas que `exempleUtile` sert :
    //   l'opérateur seul sait ce que son geste exige, la page de debug ne peut
    //   qu'en tenir compte.
    //
    //   ⚠️ Une PRÉFÉRENCE, pas une exigence : faute d'un tel état, la page rend
    //     tout de même le meilleur des autres. Mieux vaut un exemple partiel
    //     qu'une case vide.
    exempleUtile: (etat) => triosDeNeuf(etat.valeur).length > 0,
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
     * ★ **UN 999 D'AFFILÉE SE RETOURNE COMME UNE IMAGE, PAS COMME TROIS
     *   CHIFFRES**, et c'est la seule chose que le trio change ici.
     *
     *   « Supprimer `mr39` et utiliser `mr9` partout où l'on veut retourner des
     *   neuf, mais dans l'animation, détecter s'il y a 999 contigu, et dans ce
     *   cas, retourner 999 comme si c'était une image qu'on pivote à 180° »
     *   (l'auteur). Deux opérateurs se disputaient le même demi-tour, et c'est
     *   toujours `mr9` qui l'emportait : il retourne TOUS les 9 là où `mr39`
     *   n'en retournait que des paquets de trois, donc il rend davantage de 6
     *   sur la même ligne, donc il passe devant — même quand les trois 9 sont
     *   là. La distinction ne tenait pas au classement ; elle tenait au regard.
     *   Elle passe donc du catalogue à la scène : un seul opérateur, et une
     *   animation qui VOIT la contiguïté (`m.retournerLesTrios`, déprécié).
     *
     *   ⚠️ Le calcul est intact — tous les 9 deviennent des 6, ce que `apply`
     *     établit sans jamais consulter les trios. Ce qui se groupe est le
     *     GESTE, et le contrôle croisé ci-dessous vaut pour les deux formes.
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
    steps: (avant, apres, ctx) => stepsDuDemiTour(avant, apres, ctx, 9, LIB_RETOURNER_9),
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
  // ★ **IL SUIT LA CIBLE, ET C'EST TOUT CE QU'IL LUI FALLAIT.** Il était le
  // premier des cinq opérateurs que `bfs.js` retirait dès qu'on visait autre
  // chose que 666 : « le laisser courir sur une cible visant 111 ferait pousser
  // des cornes de diable au-dessus de trois 6 qui ne sont pas le verdict ».
  // L'argument était juste et il ne l'est plus — les cornes ne viennent plus
  // d'ici (voir `steps`), et le motif cherché descend maintenant par `viser`.
  // Sur `111` il trouve trois 1 d'affilée, sur `01111984` il trouve la suite
  // entière, et il n'affirme rien de plus qu'avant : que c'était déjà écrit.
  selonLaCible((visee) => ({
    id: 'm.troisSixDAffilee', code: 'm36', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    // ★ **DÉPRÉCIÉ — le verdict fait son travail, et le fait mieux.**
    //
    //   « Je ne vois pas où `m36` reste pertinent. La mécanique d'explosion a
    //   été créée ultérieurement. Si `m36` n'est pas à déprécier, il va falloir
    //   que tu m'expliques mieux pourquoi » (l'auteur). Il n'y a pas d'excuse à
    //   fournir : la première réponse s'appuyait sur un argument de COHÉRENCE
    //   (`assemblage.js › prefererLeTriptyqueMontre` impose la variante avec
    //   `m36` quand les deux se valent) et non d'UTILITÉ. L'auteur l'a vu, et
    //   la question était : à quoi sert-il encore ?
    //
    //   ── Ce qu'il faisait, et qui s'est vidé en deux temps ──────────────────
    //
    //    · **couronner** — il ne le fait plus depuis longtemps :
    //      `scenario.js › couronnerLesTriptyques` est aujourd'hui le SEUL
    //      émetteur de cornes du projet, parce qu'un couronnement qui dépendrait
    //      d'un code dépendrait de l'URL ;
    //    · **tronquer aux trois** — c'est ce que le verdict fait désormais, par
    //      l'EXPLOSION du surnuméraire, depuis que celle-ci accepte une série
    //      unique (`lesPlusCentraux`). Le verdict le fait sans étape, donc sans
    //      longueur facturée, donc moins cher.
    //
    //   MESURÉ sur `#m14#` (« hope »), ligne d'arrivée `6 6 6 6` : sans `m36`,
    //   quatre conversions, les cornes, le verdict — le quatrième 6 y explose.
    //   Avec `m36`, la même chose plus une étape pour effacer ce même 6. Il ne
    //   reste donc, littéralement, qu'un coût.
    //
    //   ── Le seul cas qui résistait, et pourquoi il ne suffit pas ────────────
    //   Sur une ligne MÊLÉE — `1 2 3 4 5 6 6 6` —, `m36` dit « on s'arrête aux
    //   trois 6 d'affilée » là où la récolte dit « on ne garde que les 6 », et
    //   la doctrine attache un malus d'aveu à la seconde. Une meilleure PHRASE,
    //   donc. Mais l'effacement est le même — cinq chiffres jetés dans les deux
    //   cas —, et la récolte sait déjà dire « Trois, côte à côte » dans sa
    //   légende. Une nuance de formulation ne vaut pas un opérateur qui, par
    //   l'effet de `prefererLeTriptyqueMontre`, TAXE d'une étape toutes les
    //   voies où il s'applique.
    //
    //   ⚠️ DÉPRÉCIÉ, PAS RAYÉ (§4.1) : le code reste réservé, l'opérateur quitte
    //     la recherche, reste jouable depuis `debug.html`, et les liens déjà
    //     partagés qui le portent continuent de s'ouvrir.
    deprecated: true,
    libelle: libTrouvaille(visee),
    regle: (() => {
      const s = compteDite(visee);
      return s
        ? bilingue(
          `Une suite de ${s.fr} contigus, prise telle quelle. On ne rassemble rien, on la trouve.`,
          `A run of ${s.nb.en} adjacent ${s.chiffre}s, taken as it stands. `
          + 'Nothing is gathered, it is found.',
        )
        : bilingue(
          `La suite « ${visee.texte} » écrite d’un seul tenant, prise telle quelle. `
          + 'On ne rassemble rien, on la trouve.',
          `The run “${visee.texte}” written in one piece, taken as it stands. `
          + 'Nothing is gathered, it is found.',
        );
    })(),
    // ★ Notoriété 0,30. Personne n'a besoin qu'on lui explique que trois 6
    // écrits côte à côte font 666 — mais ce n'est pas ça qu'on lui demande de
    // croire. Ce qu'il faut avaler, c'est « et l'on efface tout le reste », qui
    // n'est pas un savoir partagé mais une convention de la maison : « 0,8 c'est
    // bien trop, 0,3 serait plus adapté, si c'est bien lui qui supprime les
    // chiffres excédentaires » (l'auteur).
    //
    // ★ **AdHoc 0,55 — RELEVÉ de 0,20, et c'est sa propre justification qui
    //   l'imposait.** Elle disait déjà, mot pour mot : « cet opérateur n'existe
    //   que parce qu'on cherche 666 : c'est, au sens strict, une étape taillée
    //   pour la cible » — puis facturait 0,20, moins que le retournement du 9
    //   (0,35) et moitié moins que `m.plusFrequent` (0,40), qui, lui, ne regarde
    //   PAS la cible. Le critère mesure une chose et une seule (heuristique
    //   §4.5) : « cette méthode est-elle taillée pour ce qu'on cherche ? ». Aucun
    //   opérateur du catalogue ne l'est davantage que celui-ci — il cherche le
    //   motif visé, s'arrête dessus, et ne saurait rien faire d'autre.
    //
    // ⚠️ C'est ce qui met `m36` DERRIÈRE `mpf`, comme l'auteur le demande :
    //   « m36 doit être une alternative de secours à mpf et non l'inverse ».
    //   Garder les 6 parce qu'ils sont les plus nombreux est un argument qui
    //   vaudrait pour n'importe quel chiffre ; les garder parce qu'ils sont des
    //   6 n'est pas un argument, c'est la conclusion prise pour prémisse.
    notoriete: 0.30, adHoc: 0.55,
    note: (() => {
      const s = compteDite(visee);
      return s
        ? bilingue(
          `Contigus, vraiment. ${capitale(s.fr)} éparpillés dans le vecteur ne font pas `
          + `un ${visee.texte}, ils font ${s.fr}.`,
          `Adjacent, truly. ${capitale(s.en)} scattered through the vector are not `
          + `a ${visee.texte}, they are ${s.en}.`,
        )
        : bilingue(
          `D’un seul tenant, vraiment. Les chiffres de ${visee.texte} éparpillés dans le `
          + 'vecteur n’écrivent rien : c’est l’ordre et la contiguïté qui font la suite.',
          `In one piece, truly. The digits of ${visee.texte} scattered through the vector `
          + 'write nothing: order and adjacency are what make the run.',
        );
    })(),
    apply: (valeur, traces) => {
      const d = debutDeLaCible(valeur, visee);
      if (d < 0) return null;
      // ★ REFUS quand il n'y a rien à effacer, pour la raison qui a déjà fait
      // refuser `mr9` sur un vecteur sans 9 : un mappeur qui rend son entrée
      // fabrique une étape que `scenario.js` saute silencieusement (« une
      // transformation qui ne transforme RIEN À L'ÉCRAN »), et le chemin
      // porterait alors dans son URL un code que la démonstration ne montre
      // nulle part. Un vecteur qui vaut déjà `[6,6,6]` n'a pas besoin qu'on
      // lui dise qu'il vaut `[6,6,6]`.
      if (valeur.length === visee.longueur) return null;
      return {
        valeur: [...visee.chiffres],
        traces: visee.chiffres.map((_, k) => traces[d + k] || []),
      };
    },
    // Les survivants GARDENT leur identifiant de jeton : ils n'ont pas bougé,
    // ils n'ont pas changé de valeur, et rien ne les a remplacés. Leur donner un
    // nom neuf ferait croire au pont qu'un jeton en a remplacé un autre, et
    // l'animation raconterait un travail qui n'a pas eu lieu.
    sortie: (avant, apres, ctx) => {
      const d = debutDeLaCible(avant.valeur, visee);
      return d < 0 ? [] : visee.chiffres.map((_, k) => ctx.ids[d + k]);
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
      const d = debutDeLaCible(avant.valeur, visee);
      if (d < 0) return [];
      const fin = d + visee.longueur - 1;
      const gardes = visee.chiffres.map((_, k) => ctx.ids[d + k]);
      const efface = ctx.ids.filter((_, i) => i < d || i > fin);
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join('')}`;
      // La gomme de `drop` en mode `erase`, sans regroupement : un par un, sur
      // place, sans que rien ne bouge. Les chiffres retenus sont déjà d'un seul
      // tenant, il n'y a aucun trou à refermer entre eux — et un resserrement
      // ferait croire qu'on a fabriqué le 666 en rapprochant des chiffres épars.
      return [etape(ctx, dire(libArret(visee), ctx.langue), legende, [
        { op: 'highlight', targets: gardes, mode: 'select' },
        { op: 'drop', targets: efface, mode: 'erase', regroup: false, at: 300 },
      ])];
    },
  })),
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

  // ★ **IL SE DÉSACTIVE TOUT SEUL SUR UNE CIBLE HÉTÉROGÈNE, ET IL LE PROUVE.**
  //
  // Ce que cet opérateur laisse derrière lui est un vecteur d'UNE SEULE valeur
  // répétée — c'est la définition même de « le plus fréquent reste ». Or son
  // garde-fou exige que ce qui reste ÉCRIVE la cible d'affilée
  // (`portePleinement`). Une suite d'un seul chiffre ne peut écrire que `666`,
  // `111`, `000` : jamais `13`, jamais `007`, jamais `01111984`.
  //
  // Le refus n'est donc pas une opinion qu'on inscrirait quelque part — c'est
  // une conséquence, et `viser` la CALCULE : sur une cible hétérogène, la
  // fabrique rend `null` et l'opérateur sort de la recherche. Le laisser courir
  // reviendrait à dépenser du budget pour des `null` garantis (c'est très
  // exactement ce que `bfs.js` disait de lui, et le voilà démontré au lieu
  // d'être décrété).
  selonLaCible((visee) => (!visee.homogene ? null : {
    id: 'm.plusFrequent', code: 'mpf', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_PLUS_FREQUENT,
    regle: bilingue(
      'On compte chaque valeur ; la plus fréquente reste, les autres s’effacent. '
      + 'À égalité, personne ne l’emporte et la règle ne s’applique pas.',
      'Every value is tallied; the most frequent one stays, the rest are erased. '
      + 'On a tie nobody wins and the rule does not apply.',
    ),
    // ★ Notoriété 0,35 — RÉHABILITÉE, et c'est l'auteur qui le demande : « mpf
    // est à réhabiliter ; ce n'est pas très qualitatif, mais ça reste ok ».
    //
    // Elle valait 0,15, au motif que personne, nulle part, n'a jamais entendu
    // dire qu'en numérologie « le chiffre majoritaire l'emporte » — une règle de
    // la maison, inventée pour se débarrasser d'un gêneur. Le motif tenait tant
    // que l'alternative honnête était gratuite. Elle ne l'est plus : depuis que
    // laisser un chiffre étranger au bord du verdict se paie
    // (`RELIQUAT_HORS_CIBLE`), « je garde le plus nombreux » est devenu un
    // ARGUMENT face à « je laisse le verdict trancher en silence », et un
    // argument qu'on peut vérifier en comptant. On ne lui prête pas beaucoup
    // pour autant : 0,35, sous le tri croissant (0,65), très loin d'A1Z26.
    //
    // ⚠️ **MESURÉ : ce réglage ne déplace aucun classement sur les dix-neuf
    // saisies témoins.** Balayage de la notoriété (0,15 → 0,25 → 0,35 → 0,45) et
    // du palier d'élégance (`MAJORITE`, 180 → 80) : `mpf` figure dans deux
    // listes sur dix-neuf, et dans aucune tête, à TOUTES les valeurs. Ce n'est
    // donc pas son prix qui la retenait — c'est qu'elle s'applique rarement
    // (il lui faut une pluralité STRICTE dont le vainqueur écrit 666 d'affilée).
    // Ce chiffre énonce une doctrine ; il ne truque pas un résultat.
    //
    // ★ **AdHoc 0,15 — ABAISSÉ de 0,40, et pour la même raison qui a relevé
    //   celui de `m36`.** `adHoc` ne mesure ni la laideur ni l'arbitraire : il
    //   mesure « cette méthode est-elle taillée pour ce qu'on cherche ? »
    //   (heuristique §4.5). Or celle-ci ne regarde pas la cible — sa propre note
    //   le dit : « le plus fréquent, quel qu'il soit — pas le 6 ». Elle
    //   garderait des 4 si les 4 étaient les plus nombreux, et elle rendrait le
    //   même service en visant 111 ou 007.
    //
    //   Ce n'est pas zéro : le garde-fou `portePleinement` refuse de s'appliquer
    //   quand le vainqueur n'écrit pas la cible, et ce refus-là, lui, regarde
    //   bien ce qu'on cherche. C'est une entorse réelle, mais mince — 0,15.
    //
    // ⚠️ Ce que la ficelle a de laid reste facturé, et ailleurs : le barème
    //   d'élégance porte la peine SPÉCIFIQUE du geste (`MAJORITE`), `adHoc` ne
    //   porte que la peine GÉNÉRIQUE. Les deux ne mesurent pas la même chose et
    //   ne se doublent pas ; les confondre est ce qui avait mis ces deux
    //   opérateurs à l'envers l'un de l'autre.
    notoriete: 0.35, adHoc: 0.15,
    // ★ Le chiffre nommé ici est celui de la CIBLE, et il est lu sur elle : cet
    //   opérateur ne s'instancie que sur une visée homogène (voir plus haut),
    //   donc `visee.chiffres[0]` est bien LE chiffre cherché. Sur `666`, la
    //   phrase est celle d'hier, mot pour mot.
    note: bilingue(
      `Le plus fréquent, quel qu’il soit — pas le ${visee.chiffres[0]}. Faire gagner `
      + `le ${visee.chiffres[0]} d’office, ce serait le tri arbitraire, c’est-à-dire le `
      + 'geste que celui-ci prétend valoir mieux que.',
      `The most frequent one, whichever it is — not the ${visee.chiffres[0]}. Rigging it `
      + `for the ${visee.chiffres[0]} would be the arbitrary sort, that is, the very `
      + 'gesture this one claims to beat.',
    ),
    apply: (valeur, traces) => {
      const dom = valeurDominante(valeur, visee);
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
      const dom = valeurDominante(avant.valeur, visee);
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
      const dom = valeurDominante(avant.valeur, visee);
      if (!dom) return [];
      const gardes = ctx.ids.filter((_, i) => avant.valeur[i] === dom.valeur);
      const jetes = ctx.ids.filter((_, i) => avant.valeur[i] !== dom.valeur);
      const verdict = dire(bilingue(
        `chiffre majoritaire : ${dom.valeur}`,
        `most frequent digit: ${dom.valeur}`,
      ), ctx.langue);
      // ★ Une vague par valeur, du plus rare au moins rare (voir
      //   `vaguesDEffacement`). Les jetons d'une même vague tombent ENSEMBLE —
      //   `stagger: 0` — parce qu'ils sont un seul argument ; c'est entre les
      //   vagues que le temps passe, et c'est là que l'argument se lit.
      const vagues = vaguesDEffacement(avant.valeur, dom.valeur);
      const chutes = vagues.map((v) => ({
        op: 'drop', targets: v.indices.map((i) => ctx.ids[i]), mode: 'fall', stagger: 0,
      }));
      const ops = retirerAccolade(enchainer([
        { op: 'group', targets: ctx.ids, label: verdict, tighten: 0 },
        ...chutes,
        { op: 'highlight', targets: gardes, mode: 'select' },
      ]));
      const legende = `${releveEcrit(avant.valeur)}  —  ${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_PLUS_FREQUENT, ctx.langue), legende, ops)];
    },
  })),
  // ★ **IL SUIT LA CIBLE, QUELLE QU'ELLE SOIT.** Contrairement à `mpf`, ce qu'il
  // garde n'est pas UNE valeur répétée mais une position sur deux : le vecteur
  // qui survit est encore mêlé, donc il peut écrire `13`, `007` ou une date de
  // naissance. Le seul « 6 » de sa règle est le chiffre qu'on COMPTE pour
  // choisir la parité, et celui-là descend par `viser`.
  selonLaCible((visee) => ({
    id: 'm.unRangSurDeux', code: 'm1s2', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_UN_SUR_DEUX,
    regle: (() => {
      // Sur une visée homogène, la règle nomme LE chiffre — « le plus de 6 »,
      // la phrase d'hier sur `666`. Sur une visée mêlée, ce sont les chiffres
      // qui SERVENT qu'on compte, et il faut le dire ainsi : annoncer un
      // chiffre unique là où l'on en compte cinq serait un relevé qui ment.
      const quoi = visee.homogene
        ? bilingue(`de ${visee.chiffres[0]}`, `${visee.chiffres[0]}s`)
        : bilingue('de chiffres utiles', 'useful digits');
      return bilingue(
        'Une position sur deux — les impaires, ou les paires : celle des deux qui porte '
        + `le plus ${quoi.fr}. À égalité ${quoi.fr}, aucune ne vaut mieux et la règle ne `
        + 's’applique pas.',
        'Every other position — the odd ones or the even ones: whichever carries the most '
        + `${quoi.en}. On an equal count neither is better and the rule does not apply.`,
      );
    })(),
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
      const p = paritePorteuse(valeur, visee);
      if (p < 0) return null;
      const gardes = [];
      valeur.forEach((_, i) => { if (i % 2 === p) gardes.push(i); });
      return {
        valeur: gardes.map((i) => valeur[i]),
        traces: gardes.map((i) => traces[i] || []),
      };
    },
    sortie: (avant, apres, ctx) => {
      const p = paritePorteuse(avant.valeur, visee);
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
      const p = paritePorteuse(avant.valeur, visee);
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
      const legende = `${releveDesParites(avant.valeur, ctx.langue, visee)}  —  ${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_UN_SUR_DEUX, ctx.langue), legende, ops)];
    },
  })),
  // ★ **IL SUIT LA CIBLE — SAUF QUAND ELLE NE VEUT QUE DES ZÉROS.**
  //
  // « Quand on veut des 0 il faudra faire des 10, des 100, des 1000 — et donc
  // les opérateurs manquants sont peut-être soustraction sélective et
  // multiplication sélective » (l'auteur). C'est arithmétique et sans appel :
  // une somme se réduit à 0 seulement si tous ses termes sont nuls, et un paquet
  // de zéros APPAUVRIT la ligne (`paquetRecevable` : `0 + 0 → 0`, deux zéros
  // pour un). Viser `0`, `00` ou `000` par l'addition ne rendra donc jamais rien.
  //
  // On le CONSTATE ici plutôt que de laisser la recherche le redécouvrir à
  // chaque fragment : `viser('000')` rend `null`, l'opérateur se désactive, et
  // la page de débogage l'annonce. Toute autre cible — homogène ou non — le
  // garde : ses paquets visent alors les chiffres qu'elle demande.
  selonLaCible((visee) => (butsDuPaquet(visee).every((d) => d === 0) ? null : {
    id: 'm.additionSelective', code: 'mad', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_ADDITION_SELECTIVE,
    regle: (() => {
      // Les buts se LISENT sur `butsDuPaquet` : la règle affichée est la règle
      // appliquée, pas une phrase parallèle qui pourrait dériver (§0.3). Sur
      // `666` la liste vaut `[6, 9]`, et la phrase est celle d'hier.
      const buts = butsDuPaquet(visee);
      const retourne = buts[buts.length - 1] === RETOURNABLE && !visee.utile(RETOURNABLE);
      const vises = (retourne ? buts.slice(0, -1) : buts).join(', ');
      const defaut = retourne
        ? bilingue(` — ou ${RETOURNABLE} à défaut, qu’un demi-tour rendra`,
          ` — or at ${RETOURNABLE} failing that, which half a turn will convert —`)
        : bilingue('', '');
      return bilingue(
        'Chaque nombre s’écrit chiffre à chiffre, puis on n’additionne QUE les suites '
        + `contiguës dont la somme vise ${vises}${defaut.fr}. `
        + `Une suite qui ferait perdre un ${buts.join(' ou un ')} déjà `
        + `${buts.length > 1 ? 'écrits' : 'écrit'} est refusée. `
        + 'Toujours la plus courte, de gauche à droite.',
        'Every number is written out digit by digit, then only the adjacent runs aiming '
        + `at ${vises}${defaut.en} are summed. A run that `
        + `would cost a ${buts.join(' or a ')} already written is refused. `
        + 'Always the shortest run, left to right.',
      );
    })(),
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
    // ★ L'EXEMPLE de la note est CALCULÉ sur la cible, jamais recopié. « 5+1 »
    //   ne fait un 6 que parce qu'on vise 6 ; sur `111` la note doit montrer une
    //   somme qui fait 1. On prend la plus petite paire qui vise juste — deux
    //   termes non nuls dont la somme se réduit au premier chiffre de la cible —,
    //   et si aucune n'existe on se passe d'exemple plutôt que d'en inventer un.
    note: (() => {
      const but = visee.alphabet.find((d) => d !== 0) ?? visee.alphabet[0];
      const paire = (() => {
        for (let a = 1; a <= 9; a++) {
          for (let b = 1; b <= 9; b++) if (reduire(a + b) === but) return `${a}+${b}`;
        }
        return null;
      })();
      const ex = paire
        ? bilingue(`on additionne ${paire} pour faire un ${but}, et l’on ne touche `,
          `${paire} is added to make a ${but}, and a ${but} already there is only `)
        : bilingue('on additionne des chiffres contigus, et l’on ne touche ',
          `adjacent digits are added up, and a ${but} already there is only `);
      return bilingue(
        `Sélective, donc discutable : ${ex.fr}à un ${but} déjà là que pour lui faire avaler `
        + 'un zéro — il en ressort intact. Les signes + ne paraissent qu’entre les termes '
        + 'retenus : la sélection est sous les yeux, c’est le score qui la juge.',
        `Selective, hence arguable: ${ex.en}touched to swallow a zero — it comes out `
        + 'intact. The plus signs appear only between the chosen terms: the selection is '
        + 'in plain sight, and the score is what judges it.',
      );
    })(),
    apply: (valeur, traces) => {
      const plan = planAdditionSelective(valeur, visee);
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
      const plan = planAdditionSelective(valeur, visee);
      return plan ? plan.sortie.filter((s) => s.fin - s.debut >= 2)
        .map((s) => s.fin - s.debut) : [];
    },
    sortie: (avant, apres, ctx) => {
      const plan = planAdditionSelective(avant.valeur, visee);
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
      const plan = planAdditionSelective(avant.valeur, visee);
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

      /* ── 2. les additions retenues, UNE ÉTAPE CHACUNE ─────────────────────

         > « `mrd` (ou `mad`, j'ai l'impression qu'ils font ou devraient faire la
         >   même chose) devrait décomposer ses étapes par addition de 2 chiffres
         >   et générer une étape dans le registre pour chaque, comme ça on peut
         >   naviguer dedans convenablement. » (l'auteur)

         Elles tenaient toutes dans UN step. À l'écran, cela donnait plusieurs
         additions qui se jouaient à la suite sans qu'on puisse s'arrêter entre
         deux — et, dans Le Registre, une seule ligne pour un geste qui en
         comporte quatre ou cinq. Or Le Registre est l'équivalent accessible
         OBLIGATOIRE de la scène (CONTRACTS §6) : ce qui se voit en quatre temps
         doit s'y lire en quatre lignes, sans quoi il ne rend pas compte.

         Chaque étape porte donc SON addition et rien d'autre, avec pour légende
         l'opération elle-même — `1 + 5 = 6`, qui se vérifie d'un coup d'œil. */
      const vus = plan.chiffres.map((c) => c.v).join(' ');
      plan.sortie.forEach((s, j) => {
        if (s.fin - s.debut < 2) return;
        const termes = [];
        const valeurs = [];
        for (let k = s.debut; k < s.fin; k++) { termes.push(idc(k)); valeurs.push(plan.chiffres[k].v); }
        const signes = termes.slice(1).map((_, t) => `${ctx.cle}p${j}x${t}`);
        steps.push(etape(ctx, dire(LIB_ADDITION_SELECTIVE, ctx.langue),
          `${valeurs.join(' + ')} = ${s.v}`, enchainer([
            { op: 'insertOperators', between: termes, ids: signes, glyph: '+' },
            {
              op: 'sum',
              targets: termes,
              consume: signes,
              to: token(idSortie(plan, ctx, s, j), s.v, 'number'),
              symbol: '+',
            },
          ]), { id: `s_${ctx.cle}_s${j}` }));
      });
      // ⚠️ Aucune addition retenue ne peut arriver ici : `planAdditionSelective`
      //   rend `null` sans elles (`if (!additions) return null`). Le relevé
      //   d'ensemble reste néanmoins utile à qui lit Le Registre d'une traite,
      //   et il ne coûte qu'une ligne — celle du DÉCOUPAGE, pas d'un calcul.
      if (!steps.length) {
        steps.push(etape(ctx, dire(LIB_ADDITION_SELECTIVE, ctx.langue),
          `${vus} → ${apres.valeur.join(' ')}`, [], { id: `s_${ctx.cle}_s` }));
      }
      return steps;
    },
  })),

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
    // ★ ÉGALISER N'EST PAS FAIRE LA MOYENNE — c'est la première moitié du
    //   geste, et elle se tient toute seule.
    //
    //   La moyenne nivelle, puis fusionne ce qui est devenu égal. Le
    //   nivellement seul rend une LIGNE de nombres égaux (à l'arrondi près) :
    //   « ça ne serait donc pas une moyenne mais une répartition homogène, ou
    //   normalisation, ou égalisation — je pense que le terme "égalisation"
    //   correspond le mieux » (l'auteur). C'est un mappeur, pas un
    //   combinateur : il rend autant de nombres qu'il en reçoit.
    //
    //   La somme est un INVARIANT du transfert : ce qu'on ôte au plus grand,
    //   on le donne au plus petit. C'est ce qui garantit que la valeur commune
    //   atteinte est bien la moyenne, et le moteur visuel le recoupe.
    id: 'm.egalisation', code: 'meg', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: bilingue('On égalise', 'Even them out'),
    regle: bilingue('On donne 1 du plus grand au plus petit jusqu’à ce que tout se tienne à 1 près',
      'Hand 1 from the largest to the smallest until nothing is more than 1 apart'),
    // ★ NOTORIÉTÉ 0.20 — arbitrée. Égaliser une ligne de nombres n'est pas un
    //   geste que le lecteur a déjà vu ailleurs ; il se comprend en le voyant,
    //   il ne se reconnaît pas. Elle est descendue de 0.30 le jour où elle est
    //   SORTIE des ficelles (`recherche/elegance.js › FICELLES`) : le prix de
    //   son manque de notoriété remplace le soupçon, il ne s'y ajoute pas.
    notoriete: 0.20, adHoc: 0.30, cout: 1,
    // ★ ARBITRÉ, ET ACTIVÉ. Il est resté inactif le temps d'un aller-retour :
    //   son relevé d'identité — les jetons changent de valeur sans changer de
    //   place, et il faut le DÉCLARER au modèle de ligne — plongeait sous
    //   l'accolade pour remonter aussitôt, ce que l'auteur a vu et fait
    //   corriger. Une accolade ne promet un résultat sous sa pointe que quand
    //   elle calcule ; celle-ci désigne. Le geste jugé, l'opérateur cherche.
    // ★ LES JETONS CHANGENT D'IDENTITÉ À LA FIN, et il le faut.
    //
    //   À l'écran, ce sont les MÊMES jetons qui changent de valeur, un par un,
    //   à mesure que les `1` les rejoignent : c'est tout le propos du geste.
    //   Mais le modèle de ligne (`recherche/scenario.js › suivreLaLigne`) suit
    //   les jetons par leur IDENTIFIANT, et un jeton qui change de valeur sans
    //   changer d'identifiant lui reste invisible — le verdict couronnait alors
    //   « 8 2 2 » en croyant y lire trois 6. Le nivellement se referme donc sur
    //   une substitution, silencieuse à l'œil (même texte, même place) mais qui
    //   DÉCLARE ce qui a changé.
    sortie: (avant, apres, ctx) => nomsTokens(ctx, apres.valeur.length),
    apply(valeur, traces) {
      if (valeur.length < 2) return null;
      const { valeurs, converge, transferts } = nivellementDe(valeur);
      if (!converge || !transferts.length) return null;
      return { valeur: valeurs, traces: valeurs.map((_, i) => traces[i] || []) };
    },
    steps: (avant, apres, ctx) => {
      const { transferts } = nivellementDe(avant.valeur);
      const sortie = nomsTokens(ctx, apres.valeur.length);
      return [etape(ctx, dire(bilingue('On égalise', 'Even them out'), ctx.langue),
        `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`, enchainer([
          {
            op: 'group',
            targets: ctx.ids,
            egaliser: true,
            symbol: '≡',
            label: dire(bilingue('Égalisation', 'Evening out'), ctx.langue),
            resultat: apres.valeur,
            dur: dureeRamassage({ transferts: transferts.length }),
          },
          // Le relevé d'identité : même texte, même place, fondu imperceptible.
          // Il ne montre rien — il DIT ce que le nivellement vient de faire.
          {
            op: 'substitute',
            dur: 120,
            pairs: ctx.ids.map((id, i) => ({
              target: id, to: token(sortie[i], apres.valeur[i], 'number'),
            })),
          },
        ]), { hold: 400 })];
    },
  }),
  // ★ **IL LIT LA CIBLE, ET PERSONNE NE L'AVAIT VU.** Sa règle ne dit pas un mot
  // du 6 — mais son garde-fou disait TROIS : « la plus longue plage doit
  // augmenter, et atteindre au moins une série ». Une série fait trois chiffres
  // quand on vise 666, DEUX quand on vise 13, huit quand on vise une date de
  // naissance. Il exigeait donc trois valeurs identiques pour écrire une cible
  // qui en demande deux, et son propre commentaire affirmait le contraire (« et
  // cette condition ne dit pas un mot du 6 […] même pour `13` »).
  // Voir `triRassemble`, où le repli sur `666` reste exact.
  selonLaCible((visee) => ({
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
      if (!triRassemble(valeur, visee)) return null;
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
  })),

  def({
    id: 'm.triAlphabetique', code: 'mtal', famille: 'mappeur', from: 'TOKENS', to: 'TOKENS',
    libelle: LIB_TRI_ALPHABETIQUE,
    regle: bilingue(
      'Les lettres sont rangées dans l’ordre de l’alphabet ; les accents se rangent avec '
      + 'la lettre nue, et deux lettres identiques gardent l’ordre où on les a lues.',
      'The letters are lined up in alphabetical order; accented letters sort with the bare '
      + 'letter, and identical letters keep the order they were read in.',
    ),
    // ★ Notoriété 0,70, un cran au-dessus du tri croissant (0,65). Ranger des
    // lettres par ordre alphabétique est le seul rangement que TOUT LE MONDE a
    // appris à l'école et sait refaire de tête ; ranger des nombres se sait
    // aussi, mais personne ne le fait spontanément à une liste qu'on lui donne.
    //
    // ★ AdHoc 0,15, sous les 0,20 du tri croissant, et pour une raison mesurable
    // plutôt qu'esthétique : celui-ci s'applique AVANT toute conversion. Il ne
    // peut pas savoir quels nombres il rapproche, donc il ne peut pas être
    // taillé pour la cible — il rangerait « Macron » de la même façon qu'on
    // vise 666, 111 ou 007. Le tri des nombres, lui, voit ce qu'il déplace.
    notoriete: 0.70, adHoc: 0.15,
    note: bilingue(
      'Les tables alphabétiques donnent la même valeur à des lettres voisines : ranger les '
      + 'lettres d’abord fait apparaître les répétitions sans qu’on ait rien choisi.',
      'Alphabetical tables give neighbouring letters the same value: sorting the letters '
      + 'first makes repetitions appear without anything being picked.',
    ),
    apply: (valeur, traces) => {
      // ★ MÊME REFUS que `mtri` : un rangement qui ne rassemble rien fabrique
      // une étape que `scenario.js` saute, et l'URL porterait un code que la
      // démonstration ne montre nulle part.
      if (!rangementUtile(valeur)) return null;
      const ordre = ordreAlphabetique(valeur);
      return {
        valeur: ordre.map((i) => valeur[i]),
        traces: ordre.map((i) => traces[i] || []),
      };
    },
    // Les jetons changent de PLACE, pas de nature : ils gardent leur identifiant
    // (même raison que `mtri`).
    sortie: (avant, apres, ctx) => ordreAlphabetique(avant.valeur).map((i) => ctx.ids[i]),
    steps: (avant, apres, ctx) => {
      const ordre = ordreAlphabetique(avant.valeur);
      const legende = `${avant.valeur.join(' ')} → ${apres.valeur.join(' ')}`;
      return [etape(ctx, dire(LIB_TRI_ALPHABETIQUE, ctx.langue), legende, enchainer([
        { op: 'move', order: ordre.map((i) => ctx.ids[i]) },
      ]))];
    },
  }),

  def({
    id: 'm.retournerLesTrios', code: 'mr39', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    // ★ **DÉPRÉCIÉ — le geste passe à `mr9`, qui le fait sans se dédoubler.**
    //
    //   « J'ai deux soucis avec `mr39`. L'un : même avec 3 9 d'affilée, c'est
    //   `mr9` qui a l'air de se déclencher. Et l'animation de `mr39` est
    //   bancale. La solution : supprimer `mr39` et utiliser `mr9` partout où
    //   l'on veut retourner des neuf, mais dans l'animation, détecter s'il y a
    //   999 contigu » (l'auteur).
    //
    //   Le premier reproche n'était pas un défaut de réglage, et aucune
    //   notoriété n'y aurait rien changé : les deux opérateurs partent du même
    //   état et `mr9` en retourne STRICTEMENT PLUS — tous les 9, contre les
    //   seuls paquets de trois. Il rend donc plus de 6 sur la même ligne, et il
    //   passera devant tant que le classement récompensera les 6. La contiguïté
    //   ne se défendait pas au score ; elle se défend à l'écran, et c'est là
    //   qu'elle est allée (`mr9 › steps`, et `visuel/primitives/flip180.js` pour
    //   le pivot d'un bloc).
    //
    //   Ce qu'il coûte de le retirer : rien du tout. La voie qui l'employait
    //   s'écrit `mr9`, elle retourne au moins autant de chiffres, et elle montre
    //   le trio du même geste.
    //
    //   ⚠️ DÉPRÉCIÉ, PAS RAYÉ. « Retirer un opérateur, ce n'est pas le rayer du
    //     registre » (`catalogue.js`, §4.1) : le code reste réservé, l'opérateur
    //     quitte la recherche (`bfs.js`) et reste jouable depuis `debug.html`.
    //     Les liens déjà partagés qui le portent continuent donc de s'ouvrir.
    deprecated: true,
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
      const out = valeur.map((n, i) => (bouge.has(i) ? SIX_RETOURNE : n));
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
      // ★ **UN DEMI-TOUR PAR TRIO, PAS PAR NEUF** — « retourner d'un bloc le
      //   triptyque 999 comme si c'était un seul glyphe » (l'auteur). Trois
      //   demi-tours à la file disent « chacun de ces 9 vaut un 6 » ; un seul
      //   dit « ce 999-là, retourné, EST un 666 », et c'est ce que l'opérateur
      //   prétend montrer.
      //
      //   Les indices arrivent à plat : on les regroupe par TRIPLETS CONTIGUS,
      //   ce que `triosDeNeuf` garantit déjà — il ne marque que des trios
      //   complets et d'un seul tenant.
      const blocs = [];
      for (let k = 0; k < trios.length; k += 3) blocs.push(trios.slice(k, k + 3));
      const neufs = [];
      const ops = blocs.map((bloc) => {
        const nes = bloc.map((i) => token(nomToken(ctx, i), apres.valeur[i], 'number'));
        for (const t of nes) neufs.push(t.id);
        // `targets` et `to` sont donnés dans l'ORDRE DE LA LIGNE — avant et
        // après. Le miroir de la rotation est appliqué par la primitive, pas
        // ici : le modèle de ligne remplace ainsi place pour place.
        return { op: 'flip180', targets: bloc.map((i) => ctx.ids[i]), to: nes };
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

  // ★ **IL SUIT LA CIBLE — SAUF QUAND ELLE NE VEUT QUE DES ZÉROS**, exactement
  // comme `mad`, et pour la même raison arithmétique : une somme de chiffres ne
  // retombe sur 0 qu'en n'additionnant que des 0, ce qui appauvrit la ligne au
  // lieu de la servir. `viser('000')` rend donc `null`.
  //
  // Tout le reste descend : le chiffre que les paquets cherchent, et le 9 qui
  // n'est « à défaut » que lorsque la cible veut des 6 — voir `rapporte`.
  selonLaCible((visee) => (butsDuPaquet(visee).every((d) => d === 0) ? null : {
    id: 'm.redecoupageChoisi', code: 'mrd', famille: 'mappeur', from: 'NUMS', to: 'NUMS',
    libelle: LIB_REDECOUPAGE,
    regle: (() => {
      // La phrase LIT `butsDuPaquet`, comme celle de `mad` : ce qui est annoncé
      // est ce que la programmation dynamique cherche réellement (§0.3).
      const buts = butsDuPaquet(visee);
      const retourne = buts[buts.length - 1] === RETOURNABLE && !visee.utile(RETOURNABLE);
      const vises = (retourne ? buts.slice(0, -1) : buts).join(', ');
      const defaut = retourne
        ? bilingue(` — ou sur ${RETOURNABLE}, qu’un demi-tour rendra —`,
          ` — or on ${RETOURNABLE}, which a half-turn will settle —`)
        : bilingue('', '');
      return bilingue(
        'Chaque nombre s’écrit chiffre à chiffre, puis on redécoupe la ligne en paquets '
        + `choisis pour tomber sur ${vises}${defaut.fr} le plus souvent possible ; chaque `
        + `paquet est remplacé par sa somme. Un ${buts.join(' ou un ')} déjà là reste seul.`,
        'Every number is written out digit by digit, then the line is recut into packets '
        + `chosen to land on ${vises}${defaut.en} as often as possible; each packet is `
        + `replaced by its sum. A ${buts.join(' or a ')} already there is left alone.`,
      );
    })(),
    // ★ Notoriété 0,20 — « `mrd`, l'idée est là, à retirer des ficelles pour en
    // faire un opérateur à 0.2 de notoriété » (l'auteur). Elle valait 0,10, la
    // plus basse du catalogue hors joker, du temps où l'opérateur était compté
    // parmi les ficelles ; il n'y est plus (`elegance.js › FICELLES`), et
    // l'auteur fixe lui-même le chiffre. Ce qui ne change pas, c'est le
    // RAISONNEMENT derrière : additionner des chiffres est banal, REDÉCOUPER la
    // ligne pour choisir lesquels s'additionnent ne se fait nulle part et ne
    // s'attend nulle part. Ce qui est connu ici, c'est l'addition ; ce qui ne
    // l'est pas, c'est la découpe — et c'est la découpe qui fait tout le
    // travail.
    //
    // ★ AdHoc 0,48, juste sous le joker (0,50) et au-dessus de « le plus
    // fréquent l'emporte » (0,45) : c'est l'opérateur le plus taillé pour la
    // cible de tout le catalogue. `mpf` décide en regardant le vecteur qu'il
    // vient d'obtenir ; celui-ci décide en regardant le CHIFFRE QU'ON CHERCHE,
    // et il essaie toutes les découpes jusqu'à trouver celle qui en donne le
    // plus. On ne peut pas être plus explicitement au service du 6.
    notoriete: 0.20, adHoc: 0.48,
    note: bilingue(
      'Oui, c’est de la triche, et l’auteur l’écrit ainsi : « c’est le moment de tricher ». '
      + 'On le montre plutôt que de le maquiller — les accolades disent où l’on a coupé, '
      + 'les signes + disent ce qu’on a additionné, et le score dit ce que ça coûte.',
      'Yes, this is cheating, and the author says so: “time to cheat”. We show it rather '
      + 'than dress it up — the braces say where the cuts were made, the plus signs say what '
      + 'was added, and the score says what it costs.',
    ),
    apply: (valeur, traces) => {
      const plan = planRedecoupage(valeur, visee);
      if (!plan) return null;
      const sortie = [];
      const org = [];
      for (const p of plan.paquets) {
        // Les deux chiffres d'une somme à deux signes viennent des MÊMES
        // caractères : ils portent donc la même trace, celle du paquet entier.
        const t = fusion(...plan.chiffres.slice(p.debut, p.fin).map((c) => traces[c.src] || []));
        for (const d of p.sortie) { sortie.push(d); org.push(t); }
      }
      return { valeur: sortie, traces: org };
    },
    // ★ Ce que la triche fait VOIR — voir `additions` dans `commun.js`. C'est
    //   par là que le barème apprend combien d'additions se suivent, donc à
    //   quel point chacune passe inaperçue.
    additions: (valeur) => {
      const plan = planRedecoupage(valeur, visee);
      return plan ? plan.paquets.filter((p) => p.fin - p.debut >= 2)
        .map((p) => p.fin - p.debut) : [];
    },
    sortie: (avant, apres, ctx) => {
      const plan = planRedecoupage(avant.valeur, visee);
      return plan ? plan.paquets.flatMap((p, j) => idsPaquet(plan, ctx, p, j)) : [];
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
     *    paraissent et la somme se fait ; si elle dépasse neuf, un `substitute`
     *    l'écrit chiffre à chiffre — le MÊME geste qu'au step 1, parce que
     *    c'est la même chose qui se passe : un nombre à deux signes rejoint une
     *    ligne de chiffres.
     *
     * ⚠️ **Et surtout PAS un `reduce`.** C'est ce que faisait la version
     * précédente : `16` y était ramené à `7` par racine numérique, et le 6 que
     * l'auteur venait de fabriquer disparaissait sous nos yeux. Le geste était
     * juste, la règle ne l'était pas.
     *
     * ★ Contrôle croisé (CONTRACTS §0.3) : `apply`, `sortie` et `steps`
     * appellent le MÊME `planRedecoupage` sur le MÊME vecteur — pas de seconde
     * copie possible. `sum` recoupe une deuxième fois (la somme des opérandes
     * affichés doit égaler `to.text`, sinon échec de compilation), et
     * `recherche/scenario.js` une troisième, là où il connaît encore la valeur
     * des jetons de départ.
     */
    steps: (avant, apres, ctx) => {
      const plan = planRedecoupage(avant.valeur, visee);
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

      /* ── 2. la DÉCOUPE, puis UNE ÉTAPE PAR ADDITION ───────────────────────

         > « `mrd` (ou `mad`…) devrait décomposer ses étapes par addition de 2
         >   chiffres et générer une étape dans le registre pour chaque, comme ça
         >   on peut naviguer dedans convenablement. » (l'auteur)

         Tout tenait dans UN step : la découpe et les cinq ou six additions se
         jouaient d'affilée, sans arrêt possible entre deux, et Le Registre n'en
         gardait qu'une ligne. Or il est l'équivalent accessible OBLIGATOIRE de
         la scène (§6) — ce qui se voit en six temps doit s'y lire en six lignes.

         ★ **LA DÉCOUPE RESTE SEULE DANS SA PROPRE ÉTAPE**, et c'est le bon
           découpage plutôt qu'un découpage commode : elle n'additionne rien, elle
           ANNONCE les paquets. La coller à la première addition ferait commencer
           un calcul dans l'étape qui pose la question. */
      const vus = plan.chiffres.map((c) => c.v).join(' ');
      const groupes = plan.paquets.map((p, j) => ({
        targets: Array.from({ length: p.fin - p.debut }, (_, k) => idc(p.debut + k)),
        tag: `${ctx.cle}q${j}`,
      }));
      if (groupes.length >= 2) {
        const decoupe = plan.paquets
          .map((p) => plan.chiffres.slice(p.debut, p.fin).map((c) => c.v).join('')).join(' · ');
        steps.push(etape(ctx, dire(LIB_REDECOUPAGE, ctx.langue),
          `${vus} → ${decoupe}`, enchainer([{ op: 'partition', groups: groupes }]),
          { id: `s_${ctx.cle}_d` }));
      }

      plan.paquets.forEach((p, j) => {
        if (p.fin - p.debut < 2) return;
        const termes = [];
        const valeurs = [];
        for (let k = p.debut; k < p.fin; k++) { termes.push(idc(k)); valeurs.push(plan.chiffres[k].v); }
        const signes = termes.slice(1).map((_, t) => `${ctx.cle}p${j}x${t}`);
        const sortie = idsPaquet(plan, ctx, p, j);
        const ops = [
          { op: 'insertOperators', between: termes, ids: signes, glyph: '+' },
          // La somme d'abord, telle qu'elle tombe. Puis, si elle dépasse neuf,
          // elle s'écrit chiffre à chiffre — et c'est tout : rien ne la réduit.
          {
            op: 'sum',
            targets: termes,
            consume: signes,
            to: token(idSomme(plan, ctx, p, j), p.somme, 'number'),
            symbol: '+',
          },
        ];
        if (p.sortie.length > 1) {
          ops.push({
            op: 'substitute',
            pairs: [{
              target: idSomme(plan, ctx, p, j),
              to: p.sortie.map((d, t) => token(sortie[t], d, 'digit')),
            }],
          });
        }
        // ★ La légende dit l'addition ET son écriture : `7 + 8 = 15`, puis
        //   `15 → 1 5` quand la somme déborde. Les deux temps sont dans la même
        //   étape parce qu'ils sont le même fait — un nombre qui ne tient pas
        //   sur un chiffre s'écrit avec deux.
        const eclate = p.sortie.length > 1 ? ` → ${p.sortie.join(' ')}` : '';
        steps.push(etape(ctx, dire(LIB_REDECOUPAGE, ctx.langue),
          `${valeurs.join(' + ')} = ${p.somme}${eclate}`, enchainer(ops),
          { id: `s_${ctx.cle}_p${j}` }));
      });

      // Un redécoupage sans aucun paquet à additionner n'existe pas
      // (`planRedecoupage` exige `groupes`), mais un relevé d'ensemble reste dû
      // à qui lit Le Registre d'une traite.
      if (!steps.length) {
        steps.push(etape(ctx, dire(LIB_REDECOUPAGE, ctx.langue),
          `${vus} → ${apres.valeur.join(' ')}`, [], { id: `s_${ctx.cle}_d` }));
      }
      return steps;
    },
  })),

  def({
    /**
     * ★ **UN CHIFFRE VAUT LUI-MÊME — et jusqu'ici, il n'avait pas de porte.**
     *
     * « Bien sûr que chaque chiffre se vaut lui-même. Comme `tca`, si ça manque
     * c'est à ajouter comme opérateur invisible/implicite qui ne compte pas
     * comme une étape et n'a pas à apparaître dans l'URL » (l'auteur).
     *
     * ⚠️ **LE MANQUE ÉTAIT RÉEL, ET MESURÉ.** Le catalogue portait trente
     *   opérateurs `TOKENS → NUMS`, et TOUS convertissaient : `m7` compte les
     *   segments du glyphe (un « 9 » y vaut 6), `ma1` le rang de la lettre,
     *   `mt9` la touche du téléphone. Aucun ne rendait le chiffre lui-même. Une
     *   saisie de chiffres purs n'entrait donc dans la ligne que DÉGUISÉE :
     *   depuis `99922969`, aucun état atteignable en quatre étapes ne portait
     *   trois 9 contigus, et `#c01111984!#` — une date de naissance — ne
     *   trouvait rien du tout. On n'avait pas oublié une méthode : on avait
     *   oublié la LECTURE.
     *
     * ★ **IMPLICITE, COMME `tca`, ET POUR LA MÊME RAISON.** Il ne s'écrit pas
     *   dans les liens (`url.js › CODES_IMPLICITES`) et ne se facture pas comme
     *   une étape (`score.js › coutRendu`). Ce n'est pas une faveur : c'est que
     *   lire un chiffre n'AFFIRME rien. Toutes les autres conversions
     *   soutiennent quelque chose — « cette lettre vaut 3 », « ce glyphe fait
     *   six segments » — et une affirmation se paie. Celle-ci n'en fait aucune,
     *   et il n'y a rien à démontrer : elle ne coûte donc rien.
     *
     * ★ **ET IL NE MONTRE RIEN, PARCE QU'IL N'Y A RIEN À VOIR.** `steps` rend
     *   la liste vide, et les identifiants de jetons sont CONSERVÉS : le « 9 »
     *   de la ligne devient le nombre 9 à la même place, sous le même dessin.
     *   Une étape ici serait un temps mort portant un titre — exactement ce que
     *   la doctrine reproche à une transformation qui ne transforme rien à
     *   l'écran. Et l'objection habituelle tombe d'elle-même : un code que la
     *   démonstration ne montre nulle part serait gênant s'il figurait dans
     *   l'URL, et celui-ci n'y figure pas.
     *
     * ★ **UN JETON, UN CHIFFRE, ET RIEN D'AUTRE.** Une lettre n'a pas de valeur
     *   à rendre — lui en donner une serait précisément la conversion qu'on
     *   refuse d'être —, donc l'opérateur REFUSE la ligne entière dès qu'un
     *   jeton n'est pas un chiffre, plutôt que d'écarter ce qui le gêne.
     *   Écarter, c'est le métier des filtres, et cela se paie.
     *
     *   ⚠️ Un jeton de PLUSIEURS chiffres est refusé lui aussi, et ce n'est pas
     *     une timidité : lire « 42 » comme quarante-deux fait fondre deux
     *     glyphes en un nombre. C'est un geste, il faut le montrer, donc il fait
     *     une étape et se facture — le contraire même d'un opérateur invisible.
     *     Voir `RE_UN_CHIFFRE`, où la scène a tranché.
     *
     *   Sous `tca` — le découpage implicite —, les jetons sont de toute façon
     *   des caractères : c'est là que cet opérateur travaille, et les découpages
     *   par mots ou par syllabes ne lui présentent rien qu'il sache lire.
     *
     * ★ Notoriété 1,00, la note du signe « + » : c'est la seule règle du
     *   catalogue que personne n'a jamais eu à apprendre. AdHoc 0,00, la seule
     *   du catalogue : elle rendrait le même résultat en visant 666, 111 ou 007,
     *   et elle ne regarde ni la cible, ni ce qu'on espère en tirer.
     */
    id: 'm.chiffreTelQuel', code: 'm09', famille: 'mappeur', from: 'TOKENS', to: 'NUMS',
    libelle: bilingue('Chaque chiffre vaut lui-même', 'Every digit is worth itself'),
    regle: bilingue('Un 9 écrit vaut neuf : il n’y a rien à convertir.',
      'A written 9 is worth nine: there is nothing to convert.'),
    notoriete: 1.00, adHoc: 0,
    cout: 1,
    note: bilingue(
      'La ligne entière doit être faite de chiffres seuls : une lettre n’a pas de valeur à '
      + 'rendre, et lire « 42 » d’un coup serait déjà assembler.',
      'The whole line must be single digits: a letter has no value to give back, and reading '
      + '“42” in one go would already be assembling.',
    ),
    apply: (valeur, traces) => {
      if (!valeur.length) return null;
      const out = [];
      for (const jeton of valeur) {
        const texte = String(jeton);
        if (!RE_UN_CHIFFRE.test(texte)) return null;
        out.push(Number(texte));
      }
      return { valeur: out, traces: out.map((_, i) => traces[i] || []) };
    },
    // Un nombre par jeton, à sa place, sous le même dessin : les identifiants
    // sont ceux d'avant. Les renommer ferait croire au pont qu'un jeton a été
    // remplacé alors que rien n'a bougé (même règle que `mr9` sur ses non-9).
    sortie: (avant, apres, ctx) => ctx.ids,
    // Aucune étape : voir l'en-tête. Ce n'est pas un oubli, c'est le geste.
    steps: () => [],
  }),
  def({
    /**
     * ★ LE CHIFFRE ÉCRIT EN TOUTES LETTRES — et c'est le sens INVERSE de tout
     *   le reste du site.
     *
     * « Un opérateur "chiffre écrit en lettres" (7 → « sept »), avec un gros
     * malus puisqu'on essaie plutôt d'aller en sens inverse, mais
     * occasionnellement ça peut dépanner […] c'est plutôt à considérer comme une
     * ficelle. » (l'auteur)
     *
     * Tout le catalogue lit du texte pour en tirer des nombres ; celui-ci
     * rembobine. Ce n'est pas une gêne technique — le moteur sait très bien
     * repartir d'un `STR` —, c'est une gêne de DÉMONSTRATION : on avait promis
     * de faire parler la saisie, et on lui redonne des lettres qu'on vient
     * d'inventer. D'où le malus, et d'où sa place parmi les ficelles.
     *
     * ★ **Il REMPLACE l'idée d'un opérateur qui écrirait la lettre pour compter
     * ses lettres** : ce compte-là existe déjà, c'est le joker `jnf`
     * (`posts.js`), qui va de 7 à 4 sans passer par le texte. Écrire le mot ET
     * le compter aurait été deux fois le même geste, en deux étapes.
     *
     * ★ **Français seulement, et c'est assumé** — comme `jnf`, comme le « tiret
     * du 6 ». Le nom sort de `NOM_CHIFFRE_FR` (`tables/alphabet.js`), la table
     * que le joker emploie déjà : une seule source, donc jamais deux
     * orthographes du même chiffre dans une même démonstration (CONTRACTS §0.3).
     *
     * ★ Notoriété 0,80 : écrire un chiffre en lettres est ce qu'on apprend à
     * l'école primaire, et un chèque le demande encore. Ce qui est louche ici
     * n'est pas le geste, c'est le SENS dans lequel on le fait — et cela se
     * paie ailleurs, au barème (`ECRITURE_EN_LETTRES`) et par un `adHoc` élevé,
     * pas en prétendant que personne ne connaît.
     *
     * ★ AdHoc 0,45 : on ne réécrit pas un nombre en lettres pour le plaisir, on
     * le fait quand on espère que les lettres, elles, tomberont juste. C'est le
     * niveau de « le plus fréquent l'emporte », et pour la même raison.
     */
    id: 'm.chiffreEnLettres', code: 'mlet', famille: 'mappeur', from: 'NUM', to: 'STR',
    libelle: LIB_EN_LETTRES,
    regle: bilingue(
      'Le chiffre s’écrit en toutes lettres, en français : 7 devient « sept »',
      'The digit is written out in French words: 7 becomes “sept”',
    ),
    notoriete: 0.80, adHoc: 0.45,
    note: bilingue(
      'On remonte le courant : tout le reste du site lit des lettres pour en tirer des '
      + 'nombres. Ça dépanne, et ça se paie — le barème le compte comme une ficelle.',
      'This runs against the current: everything else here reads letters to get numbers. '
      + 'It helps now and then, and it costs — the scoring counts it as a trick.',
    ),
    apply: (valeur, traces) => {
      const nom = NOM_CHIFFRE_FR[valeur];
      if (nom === undefined) return null;
      // Chaque lettre du mot vient du MÊME nombre : elles portent toutes sa
      // trace, et la saisie d'origine reste atteignable depuis chacune.
      return { valeur: nom, traces: [...nom].map(() => traces[0] || []) };
    },
    sortie: (avant, apres, ctx) => [...apres.valeur].map((_, i) => `${ctx.cle}l${i}`),
    /**
     * ★ UN SEUL GESTE : le nombre devient son mot, lettre par lettre.
     *
     * `substitute` sait faire naître plusieurs jetons d'un seul — c'est ce qui
     * sert déjà à écrire un nombre chiffre à chiffre (`mrd`). Ici les jetons
     * créés sont des LETTRES, et c'est tout ce qui change : le mot n'est pas un
     * bloc, c'est la ligne de lettres que la suite de la démonstration va lire.
     */
    steps: (avant, apres, ctx) => {
      const lettres = [...apres.valeur];
      const legende = `${avant.valeur} → « ${apres.valeur} »`;
      return [etape(ctx, dire(LIB_EN_LETTRES, ctx.langue), legende, enchainer([{
        op: 'substitute',
        pairs: [{
          target: ctx.ids[0],
          to: lettres.map((c, i) => token(`${ctx.cle}l${i}`, c, 'letter')),
        }],
        dur: 900,
      }]))];
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
