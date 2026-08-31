/**
 * Filtres — `STR → STR`. Codes `f…` (CONTRACTS §4.1).
 *
 * Trois gestes visuels : ceux qui **retirent** des caractères émettent un `drop`
 * (les tokens conservés gardent leur identifiant), ceux qui **remplacent**
 * émettent un `substitute` (ils créent donc de nouveaux tokens) — et ceux qui
 * **chiffrent**, c'est-à-dire qui remplacent une lettre par une autre selon une
 * règle, MONTRENT leur table : `table`, une lettre à la fois, exactement comme
 * les mappeurs lettre → nombre. Une conversion par table n'est vérifiable que
 * si la table est sous les yeux (CONTRACTS §0.3) ; « A devient Z » est une
 * affirmation tant qu'on n'a pas vu les deux alphabets face à face.
 *
 * Convention : un filtre qui ne changerait rien retourne `null`. Une étape qui
 * ne fait rien n'a pas à être montrée, et le moteur de recherche l'élague.
 */

import { LETTRES, VOYELLES, VOYELLES_Y, sansAccents, atbash, cesar } from '../tables/alphabet.js';
import { DICO_EN_FR, DICO_FR_EN } from '../tables/traduction.js';
import { bilingue, dire } from '../i18n.js';
import {
  def, apparier, sortieCreee, sortieConservee, etape, token, fusion, enchainer, nomToken,
  retirerAccolade,
} from './commun.js';

/**
 * ★ Le décalage du César « classique » — celui que tout le monde appelle ROT13.
 *
 * Il est écrit UNE fois : le libellé, la fonction appliquée, la réglette dessinée
 * et le nom affiché dans la scène le lisent tous ici. Un jour où le catalogue
 * accueillera les autres décalages, aucun d'eux n'aura à recopier quoi que ce
 * soit — il lui suffira de son nombre.
 */
const CESAR_CLASSIQUE = 13;

/**
 * ★ Le nom de l'OUTIL d'un chiffre de César, **dérivé de son décalage**.
 *
 * Exporté parce qu'il est fait pour servir plusieurs fois : le jour où les
 * vingt-cinq décalages entreront au catalogue, chacun s'annoncera dans la scène
 * « Chiffre de César (7) » en appelant cette fonction, et pas une seule chaîne
 * ne sera écrite deux fois. Treize garde sa mention « classique » : c'est le
 * seul décalage que la culture nomme, et le seul qui soit sa propre réciproque.
 *
 * @param {number} decalage  le nombre de rangs dont l'alphabet glisse
 */
// ★ **UN SEUL GABARIT POUR LES VINGT-CINQ.** ROT13 portait « classique » ;
//   « enlève "classique" à la version 13 pour homogénéiser » (l'auteur). Le
//   décalage 13 n'a rien qui se voie de plus que les autres à l'écran — c'est
//   la même réglette qui coulisse d'un cran de plus ou de moins —, et le
//   distinguer par le nom laissait croire à une autre méthode. Sa notoriété,
//   elle, reste supérieure : c'est là que la différence est réelle.
export const outilCesar = (decalage) => bilingue(
  `Chiffre de César (${decalage})`,
  `Caesar cipher (${decalage})`,
);

/**
 * ★ LE DÉCALAGE, LU SUR LA TABLE — et donc sur la fonction qui chiffre.
 *
 * Un chiffre de César n'a pas à DÉCLARER son décalage : sa réglette le dit. On
 * la lit comme le moteur visuel la lira pour animer le coulissement — la
 * question est la même (« de combien de rangs l'alphabet a-t-il glissé ? ») et
 * la réponse doit venir de la même source, sinon le titre et le mouvement
 * pourraient se contredire.
 *
 * Est un glissement, et rien d'autre : les vingt-six lettres, dans l'ordre, et
 * une valeur qui les suit d'un pas de +1 constant modulo 26. Le miroir de
 * l'Atbash (pas de −1) n'en est pas un — il n'est pas *un* César, il est le
 * sien propre, et il porte donc son nom en propre.
 *
 * @param {ReadonlyArray<{char:string,value:string}>} table
 * @returns {number|null} le décalage, ou `null` si ce n'est pas un glissement
 */
function decalageDe(table) {
  if (!Array.isArray(table) || table.length !== LETTRES.length) return null;
  const rang = (c) => LETTRES.indexOf(String(c).toUpperCase());
  const pas = [];
  for (let i = 0; i < table.length; i++) {
    const e = table[i];
    if (!e || rang(e.char) !== i || String(e.value).length !== 1) return null;
    const v = rang(e.value);
    if (v < 0) return null;
    pas.push((v - i + 26) % 26);
  }
  // Un décalage, c'est le MÊME écart partout ; et zéro n'est pas un chiffrement.
  if (!pas[0] || pas.some((p) => p !== pas[0])) return null;
  return pas[0];
}

/**
 * Le nom de l'outil qu'un chiffrement montre, quand il se déduit de sa table.
 *
 * ★ C'est le pendant exact d'`outilDuGeste` chez les mappeurs, et il existe
 * pour la même raison : ajouter `fr7` ne doit demander AUCUNE chaîne de plus.
 * L'opérateur donne sa fonction, la fonction donne la réglette, la réglette
 * donne le décalage, et le décalage donne le nom — « Chiffre de César (7) »,
 * sous la table, sans que rien n'ait été recopié nulle part.
 */
const outilDuChiffrement = (spec) => {
  const n = decalageDe(spec.table);
  return n === null ? null : outilCesar(n);
};

// Libellés dont `steps()` a besoin avant que `def()` ait figé l'opérateur.
const LIB_RAPPROCHER = bilingue('On rapproche ce qui reste', 'Close the gaps');
const REG_RAPPROCHER = bilingue('Les lettres retenues se remettent côte à côte',
  'The letters we kept move back side by side');

const estLettreLarge = (c) => /\p{L}/u.test(c);
const pli = (c) => sansAccents(c).toUpperCase();
const estVoyelle = (c, avecY) => (avecY ? VOYELLES_Y : VOYELLES).includes(pli(c)[0] || '');

/** Découpe `valeur` en éléments `{c, t}` (caractère + ses intervalles d'origine). */
const items = (valeur, traces) => [...valeur].map((c, i) => ({ c, t: traces[i] || [] }));
const rendu = (its) => (its.length
  ? { valeur: its.map((x) => x.c).join(''), traces: its.map((x) => x.t) }
  : null);

/** Filtre caractère par caractère ; `null` si rien n'a bougé ou si tout part. */
/**
 * Dédoublonnage : de chaque famille de lettres identiques, on garde CELLE DE
 * RANG `rang` — la première par défaut, la deuxième, la troisième…
 *
 * ★ Pourquoi plusieurs rangs, et pourquoi le même nom. Le geste est le même —
 *   les exemplaires se rejoignent — et le seul choix qui reste est celui de la
 *   place où le survivant retombe. En faire cinq opérateurs distincts par leur
 *   NOM laisserait croire à cinq règles ; ils portent donc le même libellé, et
 *   se distinguent par leur code (`fd`, `fd2`… `fd5`) comme les vingt-cinq
 *   césars par leur décalage.
 *
 * Un rang plus grand que la famille désigne son dernier : demander le cinquième
 * quand il n'y en a que trois, c'est demander le dernier, pas échouer.
 */
/** Les indices des caractères identiques, par famille, dans l'ordre de la ligne. */
function famillesDeLettres(valeur) {
  const parCle = new Map();
  [...valeur].forEach((c, i) => {
    const k = pli(c);
    if (!parCle.has(k)) parCle.set(k, []);
    parCle.get(k).push(i);
  });
  return [...parCle.values()].filter((ids) => ids.length > 1);
}

function dedoublonner(valeur, traces, rang) {
  const chars = [...valeur];
  const familles = new Map();
  chars.forEach((c, i) => {
    const k = pli(c);
    if (!familles.has(k)) familles.set(k, []);
    familles.get(k).push(i);
  });
  const gardes = new Set();
  for (const [, indices] of familles) {
    gardes.add(indices[Math.min(Math.max(1, rang), indices.length) - 1]);
  }
  return garder(valeur, traces, (_, i) => gardes.has(i));
}

/**
 * Le prédicat de l'annulation par paires : survit ce qui reste quand on retire
 * les exemplaires deux à deux. Concrètement, le DERNIER d'une famille en nombre
 * impair — les autres se sont détruits.
 */
function parite(valeur) {
  const chars = [...valeur];
  const familles = new Map();
  chars.forEach((c, i) => {
    const k = pli(c);
    if (!familles.has(k)) familles.set(k, []);
    familles.get(k).push(i);
  });
  const gardes = new Set();
  for (const [, indices] of familles) {
    if (indices.length % 2 === 1) gardes.add(indices[indices.length - 1]);
  }
  return (_, i) => gardes.has(i);
}

function garder(valeur, traces, predicat) {
  const its = items(valeur, traces);
  const gardes = its.filter((x, i) => predicat(x.c, i, its));
  if (gardes.length === its.length || gardes.length === 0) return null;
  return rendu(gardes);
}

/**
 * Étape « on retire » — **deux temps nettement séparés**, un step chacun.
 *
 * ```
 *   h  o  p  e  -  h  o  p  e        ①  on efface ce qui n'est pas retenu,
 *      o     e        o     e            un caractère à la fois, SUR PLACE
 *
 *      o     e        o     e        ②  puis, seulement ensuite,
 *          o  e  o  e                    on rapproche ce qui reste
 * ```
 *
 * ★ **Aucun surlignage.** L'ancienne version expédiait le filtre en une chute
 * unique, doublée d'un `highlight` sur les survivants. Or la disparition suffit
 * à désigner : ce qui reste est ce qui n'a pas été effacé. Souligner en plus,
 * c'est dire deux fois la même chose — et le halo doré finissait par accompagner
 * la moitié de la ligne.
 *
 * Deux steps, donc deux charnières : on peut s'arrêter *entre* l'effacement et
 * le rapprochement, et repartir en arrière. C'est là que se lit la règle.
 */
function etapeRetrait(op) {
  return (avant, apres, ctx) => {
    const gardes = new Set(apparier(avant, apres).filter((i) => i >= 0));
    const perdus = ctx.ids.filter((_, i) => !gardes.has(i));
    const restants = ctx.ids.filter((_, i) => gardes.has(i));
    const titre = dire(op.libelle, ctx.langue);
    const regle = dire(op.regle, ctx.langue);

    if (!perdus.length) {
      return [etape(ctx, titre, regle, [{ op: 'move', targets: restants }])];
    }

    // ★ LE TAMIS, quand le filtre DIT ce qu'il retient — ET IL A DEUX FORMES.
    //
    //   Un filtre nommé — les consonnes, les voyelles, les lettres — sait de
    //   quel côté il trie, et c'est cela qu'il faut montrer. L'accolade écrit
    //   ce qu'on cherche ; ce qui suit dépend de CE QUI EST REJETÉ.
    //
    //   ① LE PARTAGE, quand les rejetés sont des signes VISIBLES. La ligne se
    //      coupe en deux d'un seul mouvement — les retenus descendent, les
    //      autres montent, et c'est la SIMULTANÉITÉ qui fait lire un partage.
    //      On lit le tri pendant que rien n'est encore perdu, puis seulement
    //      les rejetés s'effacent et les retenus reviennent. Le rapprochement
    //      est un second step, à part.
    //
    //   ② L'EFFACEMENT SUR PLACE, quand au moins un rejeté est un BLANC. Un
    //      seul temps : les rejetés s'effacent où ils sont, la ligne se referme
    //      et l'accolade rétrécit AVEC elle, puis s'en va.
    //
    //   ★ ET LE CRITÈRE EST « CE QUI MONTE », pas le nom du filtre. Je l'avais
    //     d'abord posé sur le filtre, en supprimant le partage PARTOUT — une
    //     sur-généralisation, corrigée par l'auteur : « pourtant je l'ai
    //     demandé, en particulier pour les filtres voyelles ou consonne, c'est
    //     le comportement attendu ».
    //
    //     Sa demande initiale portait sur `fl` — « les caractères autres
    //     devraient simplement être supprimés avec une accolade qui indique ce
    //     qui se passe, et les étapes 7 et 8 sont à fusionner » — et elle
    //     donnait sa propre limite dans la phrase suivante : « l'effet de
    //     descente et montée marche mal quand il s'agit de faire monter un
    //     ESPACE ». Un blanc qui monte ne monte pas — il n'a rien à montrer —,
    //     et la ligne semble alors se déformer au lieu de se partager. Sur
    //     `fv`/`fc`, où montent des lettres, le partage se lit parfaitement.
    //
    //     D'où la lecture littérale, et locale : on regarde les caractères
    //     réellement rejetés à cette étape-ci. `fl` sur « Donald Trump » rejette
    //     l'espace, donc ② ; `fv` sur le même mot rejette des consonnes, donc ①.
    //     Le même opérateur peut prendre l'une ou l'autre selon la saisie, et
    //     c'est voulu : ce qu'on protège est ce que l'œil peut suivre.
    //
    //   ⚠️ Dans la forme ②, `regroup: true` remplace le second step : `drop.js`
    //     efface sur place, PUIS referme la ligne, PUIS fait suivre les
    //     accolades (`suivreLesAccolades`). Le rapprochement n'est pas supprimé,
    //     il est rendu à la primitive qui savait déjà l'enchaîner.
    //
    //   Sans `mention`, le filtre n'a rien à écrire sous son accolade et
    //   retombe sur l'effacement sobre : mieux vaut un geste nu qu'une accolade
    //   qui promet un nom et n'en donne aucun.
    const mention = restants.length > 1 && op.mentionPluriel
      ? dire(op.mentionPluriel, ctx.langue)
      : dire(op.mention, ctx.langue);
    if (mention && restants.length) {
      // Ce qui monterait, lu sur les caractères eux-mêmes : `ctx.ids` est aligné
      // sur `avant.valeur`, signe par signe.
      //
      // ★ LA QUESTION EST « QUELQUE CHOSE MONTE-T-IL ? », pas « y a-t-il un
      //   blanc ? ». J'ai d'abord disqualifié le partage dès qu'un seul blanc
      //   était rejeté — ce qui l'annulait sur toute saisie à plusieurs mots,
      //   `fv` et `fc` compris, puisque l'espace n'est ni une voyelle ni une
      //   consonne. C'était rendre par une autre porte la sur-généralisation
      //   qu'on venait de corriger.
      //
      //   Ce que l'auteur décrit — « l'effet de descente et montée marche mal
      //   quand il s'agit de faire monter un ESPACE » — est le cas où la moitié
      //   qui monte est INVISIBLE EN ENTIER : on voit alors les retenus
      //   descendre face à rien. `fl` sur « Donald Trump » ne rejette que
      //   l'espace, et c'est exactement ce cas. `fv` sur le même mot rejette
      //   huit consonnes et l'espace : huit signes montent, le partage se lit,
      //   et le blanc qui les accompagne ne gêne personne.
      const signes = [...String(avant.valeur)];
      const rienNeMonte = !signes.some((c, i) => !gardes.has(i) && c.trim());
      const monteDuBlanc = rienNeMonte;

      const corps = enchainer(monteDuBlanc
        ? [
          { op: 'group', targets: ctx.ids, symbol: op.symbole || '⊃', label: mention },
          { op: 'drop', targets: perdus, mode: 'erase', regroup: true },
        ]
        : [
          { op: 'group', targets: ctx.ids, symbol: op.symbole || '⊃', label: mention },
          // Un seul `shift` pour les deux moitiés : deux ops enchaînées feraient
          // monter puis descendre, c'est-à-dire deux gestes au lieu d'un partage.
          { op: 'shift', down: restants, up: perdus },
          { op: 'drop', targets: perdus, mode: 'erase', regroup: false },
          { op: 'shift', reset: restants },
        ]);

      // Le signe qui pointe chaque retenu, s'il y en a un. Il vit à côté de
      // l'enchaînement — il ne touche aucun jeton — et s'efface avec l'étape.
      // Il se pose au moment où le tri devient lisible : avec le partage quand
      // il y en a un, avec l'accolade sinon — et tient jusqu'à l'effacement.
      if (typeof op.designe === 'string' && op.designe) {
        const pose = (monteDuBlanc ? corps[0].at : corps[1] && corps[1].at) || 0;
        const dernier = monteDuBlanc ? (corps[1] ? corps[1].at : 400) : corps[corps.length - 1].at;
        const tenue = Math.max(400, dernier - pose);
        for (const id of restants) {
          corps.push({
            op: 'annotate', anchor: [id], text: op.designe, place: 'below',
            ecart: 0.62, fugace: true, at: pose, dur: tenue,
          });
        }
      }

      const premier = etape(ctx, titre, regle, retirerAccolade(corps),
        { id: `s_${ctx.cle}_0`, hold: 300 });
      if (monteDuBlanc) return [premier];
      // Après un partage, le comblement reste un temps À PART — c'est la
      // discipline de `drop.js` : replacer sur la ligne, PUIS rassembler.
      return [
        premier,
        etape(ctx, dire(LIB_RAPPROCHER, ctx.langue), dire(REG_RAPPROCHER, ctx.langue),
          [{ op: 'move' }], { id: `s_${ctx.cle}_1` }),
      ];
    }

    return [
      // ① l'effacement. `regroup: false` : rien d'autre ne bouge, et le
      // stagger laisse voir partir chaque caractère.
      etape(ctx, titre, regle,
        [{ op: 'drop', targets: perdus, mode: 'erase', regroup: false }],
        { id: `s_${ctx.cle}_0` }),
      // ② le rapprochement, seul geste de son step. `move` sans cible est un
      // simple recalcul du flux : l'ordre n'a pas changé, seuls les trous
      // laissés par l'effacement se referment.
      etape(ctx, dire(LIB_RAPPROCHER, ctx.langue), dire(REG_RAPPROCHER, ctx.langue),
        [{ op: 'move' }],
        { id: `s_${ctx.cle}_1` }),
    ];
  };
}

/**
 * ★ COUPER UNE ADRESSE — on montre d'abord ce qu'on écarte, ensuite on l'écarte.
 *
 * « L'exemple montre à merveille le problème : il ne s'agit pas de garder le
 * premier caractère qui correspond au résultat quelle que soit sa position,
 * mais bien ceux qui suivent le / concerné » (l'auteur). Le geste effaçait, et
 * un effacement ne dit pas OÙ passe la coupe : sur `https://reinfocovid.fr/`,
 * garder ce qui suit la barre ou garder ce qui la précède produisaient à
 * l'écran deux disparitions, sans que la frontière apparaisse jamais.
 *
 * Trois temps, et le premier est celui qui manquait :
 *
 *  ① on ESTOMPE ce qui va partir — la coupe devient visible, et rien n'est
 *    encore perdu : c'est le moment où l'on peut vérifier qu'elle est au bon
 *    endroit ;
 *  ② on DÉSIGNE ce qui reste, sous son nom (« le domaine », « le chemin ») ;
 *  ③ on efface, et la ligne se referme.
 */
function etapeDecoupeAdresse(op) {
  return (avant, apres, ctx) => {
    // ★ **LA COUPE SE LIT SUR SES BORNES, ELLE NE SE DEVINE PAS.**
    //
    //   Ce geste demandait à `apparier` quels jetons survivent — c'est-à-dire
    //   qu'il RETROUVAIT le résultat dans la saisie au lieu de le lire là où il
    //   est. Or `apparier` n'a que deux moyens : les traces, qui ne discriminent
    //   pas ici (tous les caractères d'un `STR` partagent la même), et la
    //   sous-suite commune, qui prend la PREMIÈRE occurrence de chaque
    //   caractère, où qu'elle soit.
    //
    //   ⚠️ MESURÉ sur `https://www.example.com/path/to/page` : `fchm` garde
    //     `path`, points de code 24 à 27. L'appariement par sous-suite, lui,
    //     cherchait `p`, `a`, `t`, `h` de gauche à droite et tombait sur des
    //     lettres éparpillées dans `https://www.example.com/…` — la scène
    //     effaçait alors des caractères pris au hasard et gardait les autres.
    //     C'est le défaut relevé par l'auteur : « visiblement tu identifies les
    //     caractères à conserver puis tu cherches leur première occurrence dans
    //     la string, peu importe que ce soit dans la zone du chemin ». Il vaut
    //     pour les CINQ découpes, et pas seulement pour `fchm`.
    //
    //   Les cinq savent pourtant exactement où elles coupent : elles gardent un
    //   INTERVALLE CONTIGU, et elles le calculent déjà pour `apply`. Elles le
    //   publient donc (champ `bornes`, comme un César publie son `decalage`) et
    //   la scène le lit. Ce qui est montré est ce qui est calculé, sans
    //   intermédiaire qui suppose.
    //
    //   Le repli sur `apparier` reste pour un opérateur qui aurait `coupe: true`
    //   sans bornes ; un test interdit ce cas, il ne devrait jamais servir.
    const bornes = typeof op.bornes === 'function' ? op.bornes(avant.valeur) : null;
    const gardes = bornes
      ? new Set(ctx.ids.map((_, k) => k).filter((k) => k >= bornes[0] && k < bornes[1]))
      : new Set(apparier(avant, apres).filter((i) => i >= 0));
    const perdus = ctx.ids.filter((_, i) => !gardes.has(i));
    const restants = ctx.ids.filter((_, i) => gardes.has(i));
    const titre = dire(op.libelle, ctx.langue);
    const regle = dire(op.regle, ctx.langue);
    if (!perdus.length || !restants.length) {
      return [etape(ctx, titre, regle, [{ op: 'move', targets: restants }])];
    }
    const mention = dire(op.mention, ctx.langue);
    const corps = enchainer([
      // ① la coupe se montre : ce qui part s'estompe, ce qui reste ne bouge pas.
      { op: 'dim', targets: perdus, to: 0.18 },
      // ② et l'on dit ce qu'on garde, sous ce qu'on garde.
      mention ? { op: 'annotate', anchor: restants, text: mention, place: 'below', ecart: 0.7, fugace: true } : null,
      // ③ seulement alors, l'effacement — puis le rapprochement, à part.
      { op: 'drop', targets: perdus, mode: 'erase', regroup: false },
    ]);
    return [
      etape(ctx, titre, regle, corps, { id: `s_${ctx.cle}_0`, hold: 300 }),
      etape(ctx, dire(LIB_RAPPROCHER, ctx.langue), dire(REG_RAPPROCHER, ctx.langue),
        [{ op: 'move' }], { id: `s_${ctx.cle}_1` }),
    ];
  };
}

/**
 * ★ DES EXEMPLAIRES IDENTIQUES SE REJOIGNENT — le geste de `fd`, `fpr` et `fun`.
 *
 * Les trois opérateurs font le même mouvement et se distinguent par ce qu'il en
 * reste : un exemplaire (dédoublonnage), rien par paires (annulation), rien du
 * tout (unique). Les jouer avec le même dessin n'est pas une économie de code,
 * c'est ce qui les rend COMPARABLES à l'écran — trois règles voisines, trois
 * résultats différents, et la différence se lit dans le résultat, pas dans une
 * chorégraphie qu'on aurait inventée pour chacune.
 *
 * `garde` dit où le survivant retombe : au premier exemplaire, au deuxième…
 * C'est l'index déclaré par l'opérateur (`rang`), borné au nombre réel de
 * copies — demander le cinquième quand il n'y en a que trois, c'est demander le
 * dernier.
 */
function etapeRapprochement(op) {
  return (avant, apres, ctx) => {
    // Ce qui fait FAMILLE se déclare : des caractères identiques par défaut, la
    // k-ième lettre de chaque répétition pour un motif de mots. Le geste, lui,
    // ne change pas — et c'est ce qui permet de lire les deux échelles comme
    // une seule règle.
    const groupes = typeof op.familles === 'function'
      ? op.familles(avant.valeur)
      : famillesDeLettres(avant.valeur);
    const familles = [];
    for (const indices of groupes) {
      const membres = indices.map((i) => ctx.ids[i]).filter(Boolean);
      if (membres.length < 2) continue;
      const f = { membres };
      if (op.mode === 'fusion') {
        const rang = Math.min(Math.max(1, op.rang || 1), membres.length) - 1;
        f.garde = membres[rang];
      }
      familles.push(f);
    }
    // Rien à rejoindre : aucune lettre n'a de jumelle. Le filtre n'aurait rien
    // changé de toute façon — `apply` l'a déjà refusé —, mais le rendu ne doit
    // pas émettre une op vide pour autant.
    if (!familles.length) return [etape(ctx, dire(op.libelle, ctx.langue), dire(op.regle, ctx.langue), [{ op: 'move' }])];

    // ★ CE QUI N'APPARTIENT À AUCUNE FAMILLE, ET QUI PART QUAND MÊME.
    //
    //   Un motif de mots laisse ses séparateurs de côté : ils ne rejoignent
    //   personne, et pourtant l'état d'arrivée ne les contient pas. Les laisser
    //   à l'écran ferait diverger ce qui est montré de ce qui est compté — le
    //   même défaut que le découpage en mots avait sur les barres obliques. On
    //   lit donc ce qui SURVIT dans l'arrivée, et le reste s'efface avec le
    //   rapprochement.
    const survivants = new Set(apparier(avant, apres).filter((i) => i >= 0).map((i) => ctx.ids[i]));
    const rejoints = new Set(familles.flatMap((f) => f.membres));
    const perdus = ctx.ids.filter((id) => !survivants.has(id) && !rejoints.has(id));

    const mention = dire(op.mention, ctx.langue);
    const corps = enchainer([
      mention ? { op: 'group', targets: ctx.ids, symbol: op.symbole || '⊃', label: mention } : null,
      { op: 'collapse', mode: op.mode, familles },
      perdus.length ? { op: 'drop', targets: perdus, mode: 'erase', regroup: false } : null,
      { op: 'move' },
    ]);
    return [etape(ctx, dire(op.libelle, ctx.langue), dire(op.regle, ctx.langue),
      mention ? retirerAccolade(corps) : corps, { hold: 350 })];
  };
}

/**
 * Étape « on remplace » — `substitute`, l'opérateur nomme les tokens créés.
 *
 * Le mot d'arrivée n'a pas forcément la longueur du mot de départ (« hope » →
 * « espoir »). `substitute` accepte un `to` MULTIPLE : le dernier caractère de
 * départ porte alors la queue du mot d'arrivée, et les caractères en trop
 * tombent. Aucun `insertOperators` ici — les signes d'un calcul n'ont rien à
 * faire dans une traduction.
 */
function etapeRemplacement(op) {
  return (avant, apres, ctx) => {
    const sortie = op.sortie(avant, apres, ctx);
    const cible = [...apres.valeur];
    const n = Math.min(ctx.ids.length, cible.length);
    const pairs = ctx.ids.slice(0, n).map((src, i) => ({
      target: src,
      to: (i === n - 1 && cible.length > n)
        ? cible.slice(i).map((c, k) => token(sortie[i + k], c, 'letter'))
        : token(sortie[i], cible[i], 'letter'),
    }));
    const ops = [{ op: 'substitute', pairs, stagger: 60 }];
    if (cible.length < ctx.ids.length) {
      ops.push({ op: 'drop', targets: ctx.ids.slice(cible.length), stagger: 40 });
    }
    // La MENTION du geste, sous la ligne, le temps de l'étape (voir `commun.js`).
    // Elle vit à côté des substitutions, pas dans leur enchaînement : elle ne
    // touche à aucun jeton, donc rien ne l'oblige à attendre son tour.
    // ★ L'ancre est prise sur les jetons d'ARRIVÉE, jamais sur ceux de départ :
    //   ceux-là sont morts à l'instant où la substitution se plane, et un id
    //   supprimé ne se référence plus (invariant 4).
    const mention = dire(op.mention, ctx.langue);
    const corps = enchainer(ops);
    const arrivees = [];
    for (const p of pairs) for (const t of (Array.isArray(p.to) ? p.to : [p.to])) arrivees.push(t.id);
    if (mention && arrivees.length) {
      corps.push({ op: 'annotate', anchor: arrivees, text: mention, place: 'below', fugace: true, at: 0 });
    }
    // ★ **UN TEMPS DE LECTURE, parce qu'il n'y a qu'une étape pour tout le mot.**
    //
    //   Un chiffrement à réglette (`etapeTable`) déroule une étape PAR LETTRE :
    //   son titre reste sous les yeux le temps de six ou sept étapes. Celui-ci
    //   substitue tout d'un coup, et sa seule étape durait 1 690 ms sur
    //   « Macron » — contre 4 872 ms pour la première étape de l'Atbash sur le
    //   même mot. « fac, fmaj, fmin devraient avoir le titre qui s'affiche
    //   durant toute la durée du processus ; là on n'a pas le temps de le
    //   lire » (l'auteur).
    //
    //   Le geste ne change pas — il n'a rien de plus à montrer, et l'étirer
    //   ferait une substitution au ralenti, ce qui ne se lit pas mieux. C'est
    //   le TEMPS D'ARRÊT qui s'allonge : l'étape tient une seconde de plus une
    //   fois le mot changé, ce qui est le moment où l'on compare le titre à ce
    //   qu'on voit.
    //
    //   ⚠️ `hold` est bien de l'emballage, pas du geste (`visuel/compile.js`,
    //     « step.duration, step.hold — l'emballage, pas le geste ») : il
    //     s'ajoute à l'étendue des ops et disparaît sous l'accélération des
    //     redites, exactement comme il faut.
    return [etape(ctx, dire(op.libelle, ctx.langue), dire(op.regle, ctx.langue), corps,
      { hold: 2000 })];
  };
}

/**
 * ★ La réglette d'un chiffrement, **dérivée de la fonction qui chiffre**.
 *
 * Même discipline que `tableDe` chez les mappeurs (CONTRACTS §0.3) : ce qui
 * sera DESSINÉ n'est pas une seconde copie de la règle Atbash ou César, c'est
 * `fn` — la fonction même qu'`apply()` applique — évaluée sur les caractères de
 * son domaine. Une divergence entre la table montrée et la table employée est
 * impossible par construction ; le moteur visuel refuse en outre de faire
 * redescendre une lettre qui ne serait pas dans la case
 * (`src/visuel/primitives/table.js`), et le pont la recoupe une troisième fois
 * (`src/recherche/scenario.js`).
 *
 * @param {string|string[]} domaine  les caractères que le chiffrement traite
 * @param {(c:string)=>string} fn    la fonction de l'opérateur
 */
function regletteDe(domaine, fn) {
  return Object.freeze([...domaine].map((char) => {
    const value = fn(char);
    if (typeof value !== 'string' || [...value].length !== 1) {
      throw new Error(`réglette : « ${char} » ne rend pas une lettre unique (${JSON.stringify(value)}).`);
    }
    return Object.freeze({ char, value });
  }));
}

/**
 * Sortie d'un filtre qui MUE caractère par caractère : **les inchangés gardent
 * leur identifiant**.
 *
 * Un chiffrement par substitution ne touche pas au tiret de `hope-hope-hope` ni
 * au chiffre d'un `h0pe` : le recréer à l'identique ferait clignoter un jeton
 * que rien n'a transformé, et l'animation raconterait un travail qui n'a pas eu
 * lieu. `sortieCreee` reste le repli quand les longueurs diffèrent — là, plus
 * rien ne s'aligne, et c'est `etapeRemplacement` qui prend la main.
 */
function sortieMuee(avant, apres, ctx) {
  const av = [...avant.valeur];
  const ap = [...apres.valeur];
  if (av.length !== ap.length) return sortieCreee(avant, apres, ctx);
  return ap.map((c, i) => (c === av[i] ? ctx.ids[i] : nomToken(ctx, i)));
}

/**
 * Étape « on chiffre » — **la table est MONTRÉE, et un aller-retour par lettre**.
 *
 * ```
 *   h  t  t  p  s        ①  « h » monte vers sa colonne de la glissière,
 *   ↑                        elle s'allume, « S » en redescend à sa place
 *   A B C … H … Z
 *   Z Y X … S … A
 * ```
 *
 * ★ Pourquoi une table, alors que le résultat tient en une lettre. Parce que
 * `h → s` est une AFFIRMATION tant qu'on n'a pas vu pourquoi. L'Atbash décide
 * désormais de la sixième série de 666 sur `hope-hope-hope.fr` : une étape qui
 * pèse ce poids ne peut pas rester une substitution muette. La glissière montre
 * les deux alphabets, l'un à l'endroit, l'autre à l'envers — et la règle se lit
 * d'un coup d'œil au lieu d'être crue sur parole.
 *
 * ★ **Un aller-retour par lettre, jamais groupé** — même raison que les tables
 * lettre → nombre : faire monter les cinq lettres de `https` puis redescendre
 * les cinq résultats d'un bloc fait perdre QUELLE lettre a donné QUOI, ce qui
 * est précisément ce qu'il fallait montrer.
 *
 * ★ **Ce qui se mutualise, c'est le DÉCOR.** `montre` sur la première lettre,
 * `retire` sur la dernière : entre les deux, la glissière reste montée et la
 * caméra ne rebouge pas. `mutualiserDecor` (`src/recherche/scenario.js`) étend
 * ensuite la série par-dessus les étapes voisines qui emploient la même table.
 *
 * ★ **Les lettres inchangées ne font pas d'étape.** Le tiret de `hope-hope-hope`
 * n'est pas dans l'alphabet : l'Atbash ne le touche pas, et rien à l'écran ne
 * doit laisser croire le contraire.
 */
function etapeTable(op) {
  return (avant, apres, ctx) => {
    const sortie = op.sortie(avant, apres, ctx);
    const av = [...avant.valeur];
    const ap = [...apres.valeur];
    const titre = dire(op.libelle, ctx.langue);
    const regle = dire(op.regle, ctx.langue);
    // ★ Le nom de l'OUTIL, affiché sous la réglette — dérivé du catalogue, et
    //   jamais recopié dans la scène (voir `commun.js › def`, champ « outil »).
    //   En plein écran, la table est tout ce qu'on voit : sans son nom, on
    //   regarde vingt-six cases sans savoir de quelle méthode elles sont la
    //   preuve.
    const nomOutil = dire(op.outil, ctx.langue);

    // Longueurs désalignées : plus rien à mettre en face de quoi. On rend la
    // main au geste générique, qui sait faire porter la queue du mot d'arrivée.
    if (av.length !== ap.length) return etapeRemplacement(op)(avant, apres, ctx);

    const cases = new Map(op.table.map((e) => [e.char, e]));
    const mues = ap.map((c, i) => (c === av[i] ? -1 : i)).filter((i) => i >= 0);
    if (!mues.length) return [etape(ctx, titre, regle, [{ op: 'move' }])];

    // Repli : une lettre changée dont on ne saurait pas montrer la case. On
    // n'affirme rien qu'on ne sait pas montrer — on substitue, sans table.
    if (!mues.every((i) => cases.has(pli(av[i])))) {
      return [etape(ctx, titre, regle, enchainer([{
        op: 'substitute', stagger: 60,
        pairs: mues.map((i) => ({ target: ctx.ids[i], to: token(sortie[i], ap[i], 'letter') })),
      }]))];
    }

    const dernier = mues[mues.length - 1];
    return mues.map((i) => etape(
      ctx,
      titre,
      `${regle} : ${av[i]} → ${ap[i]}`,
      [{
        op: 'table',
        disposition: op.forme || 'reglette',
        titre: nomOutil,
        entries: op.table.map((e) => ({ ...e })),
        target: ctx.ids[i],
        // La lettre PLIÉE — c'est celle qu'`apply()` a convertie, et celle que
        // la réglette porte : elle est écrite en capitales, la ligne garde sa
        // casse.
        letter: pli(av[i]),
        to: token(sortie[i], ap[i], 'letter'),
        montre: i === mues[0],
        retire: i === dernier,
      }],
      { id: `s_${ctx.cle}_${i}` },
    ));
  };
}

/**
 * ★ LE DICTIONNAIRE VIENT D'AILLEURS, ET C'EST LE POINT.
 *
 * Il comptait quarante-neuf mots, choisis un par un. C'était un gadget : le
 * filtre ne trouvait rien sur une saisie réelle, et les rares fois où il
 * trouvait, c'est qu'on avait mis le mot dans la liste — une méthode qui ne
 * marche que sur les exemples de son auteur n'en est pas une, et le reproche
 * d'avoir trié les mots qui arrangent aurait été mérité.
 *
 * Les tables sont maintenant EXTRAITES de FreeDict (GNU GPL 2.0 ou ultérieure,
 * compatible avec l'AGPL 3.0 de ce dépôt) : six mille quatre cents entrées dans
 * chaque sens, du vocabulaire courant, maintenu par des tiers. Zéro dépendance
 * et zéro requête réseau restent vrais — c'est un fichier de données généré, au
 * même titre que les tables de segments ou de glyphes
 * (`src/gfx/freedict-traduction.py`).
 */
export { DICO_EN_FR, DICO_FR_EN } from '../tables/traduction.js';

/** Traduction d'un mot entier — `null` si le mot est inconnu. */
/**
 * Traduction d'un mot entier, à l'acception `rang` — `null` si le mot est
 * inconnu, ou s'il n'a pas tant d'acceptions.
 *
 * ★ UN RANG QUI NE TROUVE RIEN REND `null`, il ne se replie pas sur le
 *   précédent. Sans quoi `ffr3` jouerait `ffr` sur les quatre mille mots qui
 *   n'ont qu'une lecture, et l'URL annoncerait un troisième choix là où il n'y
 *   en avait qu'un : trois codes pour une seule démonstration, indiscernables
 *   au rejeu. Un opérateur qui ne s'applique pas doit le dire.
 */
function traduire(valeur, traces, dico, rang = 1) {
  const mot = sansAccents(valeur).toLowerCase();
  const acceptions = dico[mot] ?? dico[valeur.toLowerCase()];
  const cible = Array.isArray(acceptions) ? acceptions[rang - 1] : (rang === 1 ? acceptions : null);
  if (!cible || cible.toLowerCase() === valeur.toLowerCase()) return null;
  const toutes = fusion(traces);
  return { valeur: cible, traces: [...cible].map(() => toutes) };
}

/** Transformation caractère à caractère, `null` si rien ne change. */
function muer(valeur, traces, fn) {
  const cible = fn(valeur);
  if (typeof cible !== 'string' || cible === valeur) return null;
  const src = [...valeur];
  const dst = [...cible];
  if (dst.length === src.length) return { valeur: cible, traces: dst.map((_, i) => traces[i] || []) };
  const toutes = fusion(traces);
  return { valeur: cible, traces: dst.map(() => toutes) };
}

const PROTOCOLES = /^(?:https?|ftp|ftps|ssh|file):\/\//i;

/**
 * ★ À QUOI RESSEMBLE UNE EXTENSION DE NOM DE DOMAINE — une FORME, pas une liste.
 *
 * On pourrait embarquer la racine IANA : mille cinq cents lignes, exactes le
 * jour de la copie et périmées le lendemain. Surtout, elle serait FAUSSE pour
 * ce site : `.onion`, `.local`, `.test`, `.internal` ne sont délégués nulle
 * part et se tapent tous les jours. Une liste officielle refuserait de
 * reconnaître des adresses que tout le monde reconnaît, et il faudrait alors
 * lui ajouter des exceptions — c'est-à-dire admettre que ce n'est pas la liste
 * qui décide. Autant le dire tout de suite et décrire la forme :
 *
 *  · **deux caractères au moins** — aucune extension d'une seule lettre n'a
 *    jamais été déléguée, et personne n'en écrit ;
 *  · **des lettres, rien d'autre** — ni chiffre, ni tiret. Les extensions
 *    internationalisées vivent en racine sous leur forme punycode (`xn--…`),
 *    mais ce n'est pas ce qu'on tape : on tape `.рф`, et un moteur qui ne lit
 *    que l'ASCII n'a pas à faire semblant de la reconnaître ;
 *  · **dix-huit caractères au plus** — la longueur de la plus longue extension
 *    déléguée en lettres latines (`.travelersinsurance`, `.northwesternmutual`).
 *    Le plafond ne sert pas à recaler l'exotique, il sert à ce qu'une phrase
 *    ponctuée de points ne passe pas pour une adresse.
 *
 * ★ Le plafond valait SIX, et il recalait `.website`, `.technology`,
 * `.photography` — des extensions on ne peut plus ordinaires. « On ignore
 * l'extension » ne faisait donc rien du tout sur `hope.technology`, sans le
 * dire. Un opérateur qui ne s'applique pas doit le dire ; celui-là mentait par
 * un chiffre.
 */
const TLD = '[a-z]{2,18}';

/**
 * L'extension FINALE d'une chaîne — ce que `f.tld` retire.
 *
 * ⚠️ Elle n'exige pas qu'il y ait un domaine devant : `.html` est une extension
 * elle aussi, et `f.tld` dit « l'extension », pas « le TLD ». C'est le seul
 * endroit où la forme partagée s'emploie sans la reconnaissance d'un hôte, et
 * c'est délibéré — retirer un suffixe et reconnaître une adresse sont deux
 * métiers, les confondre ferait échouer l'un ou mentir l'autre.
 */
const RE_EXTENSION = new RegExp(`\\.${TLD}$`, 'i');

/**
 * Une ÉTIQUETTE de nom de domaine — ce qu'il y a entre deux points.
 *
 * ★ Toutes les lettres, pas seulement l'ASCII. La saisie témoin du site est
 * `https://www.numérologie-évidente.fr/preuve` : refuser les accents ferait
 * échouer la reconnaissance sur l'exemple même que le site montre, et sur la
 * moitié des adresses françaises. Un tiret est admis, mais jamais en bordure —
 * c'est la seule contrainte que la résolution de noms impose vraiment.
 */
const ETIQUETTE = '[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?';

/**
 * Un nom de domaine EN TÊTE de la chaîne : des étiquettes séparées par des
 * points, puis l'extension, puis la fin ou ce qui n'appartient déjà plus au nom
 * (`/`, `:`, `?`, `#`). C'est la règle que l'auteur a écrite —
 * `(https?://)?[…]+\.[tld]/?` —, à ceci près que le protocole se retire au lieu
 * de se garder : `https://` dit comment on y va, pas comment le site s'appelle.
 *
 * ★ POURQUOI L'ÉTIQUETTE ACCEPTE TOUTE LETTRE ET L'EXTENSION NON. Ce n'est pas
 * une inattention : l'étiquette ne décide de rien, l'élargir ne fait que
 * reconnaître plus d'adresses réelles. L'extension, elle, PORTE la décision —
 * c'est elle qui répond « ceci est une adresse ». Lui ouvrir tout l'Unicode
 * ferait passer n'importe quelle phrase ponctuée d'un point pour un site, et la
 * règle ne dirait plus rien. On paie ce choix en refusant `сайт.рф` ; c'est
 * écrit ici pour que personne n'ait à le redécouvrir.
 */
const RE_HOTE = new RegExp(`^(?:${ETIQUETTE}\\.)+${TLD}(?=[:/?#]|$)`, 'iu');

/**
 * Le leet speak, dans le sens où on le DÉCODE : le chiffre, puis la lettre.
 *
 * La substitution est écrite une fois ; `deleet` l'applique, et la réglette
 * montrée s'obtient en appliquant `deleet` — pas en relisant la table. Le
 * dessin ne peut donc pas diverger du calcul.
 */
// ★ NEUF CORRESPONDANCES, et les trois dernières se lisent à la CASSE près :
//   le 6 a la panse et la hampe d'un « b » de bas de casse, le 8 les deux
//   panses d'un « B » capital, le 9 la boucle et la jambe d'un « g ». Écrire
//   « 8 → b » perdrait ce qui fait la substitution — c'est le DESSIN qui la
//   justifie, pas la valeur du chiffre.
const LEET = Object.freeze({
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 6: 'b', 7: 't', 8: 'B', 9: 'g',
});
// La classe se DÉDUIT de la table : ajouter une correspondance suffit, il n'y
// a pas de liste de chiffres à tenir à jour à côté.
const CHIFFRES_LEET = new RegExp(`[${Object.keys(LEET).join('')}]`, 'g');
const deleet = (s) => s.replace(CHIFFRES_LEET, (c) => LEET[c] ?? c);

/**
 * ★ **LES VINGT-CINQ CÉSARS, D'UNE SEULE SOURCE.**
 *
 * « Ajoute soit un opérateur configurable, soit plusieurs opérateurs pour
 * tester : fr1 fr2 fr3 fr4… avec pour titre "Chiffre de César ({décalage})" »
 * (l'auteur).
 *
 * **Configurable, le catalogue ne sait pas faire** : la signature d'un
 * opérateur est `apply(valeur, traces)`, sans paramètre, et tout le reste du
 * moteur — l'URL, le registre, le score, la scène — l'identifie par son code
 * seul. Un opérateur paramétré demanderait de porter son argument dans l'URL,
 * donc une extension de la grammaire, pour un gain nul : vingt-cinq décalages,
 * ce sont vingt-cinq gestes distincts que le spectateur doit pouvoir nommer.
 *
 * Ils sont donc vingt-cinq — et écrits UNE fois. Le libellé, la règle, la
 * fonction et la réglette se dérivent tous du seul décalage : il n'existe pas
 * d'endroit où l'un pourrait mentir sur l'autre, et ajouter un pas se ferait en
 * changeant une borne.
 *
 * ★ **`fr13` garde son rang, son code et son titre à part.** Il était là avant
 * les autres et il n'est pas leur égal : ROT13 est le seul décalage que le
 * public reconnaisse, le seul qui soit son propre inverse, et le seul dont le
 * nom circule. « Chiffre de César classique (13) », dit l'auteur — le reste,
 * « Chiffre de César (7) ».
 *
 * ★ **NOTORIÉTÉ : 0,25 pour treize, 0,20 pour trois, 0,10 pour les autres.**
 * Ce n'est pas une décroissance décorative :
 *
 *  · **13** est ROT13, connu de qui a fréquenté un forum — il garde sa valeur ;
 *  · **3** est le décalage de Jules César lui-même, celui que racontent les
 *    manuels d'histoire : moins su que ROT13, su tout de même ;
 *  · **les vingt-trois autres** ne sont connus de personne. Choisir « avance de
 *    sept rangs » plutôt que de six n'a aucune justification hors du résultat
 *    qu'on en attend — ils ne valent donc presque rien, sans valoir zéro : le
 *    procédé, lui, reste le chiffre de César, et il s'explique en une phrase.
 *
 * ★ **AD HOC : 0,25 pour treize et trois, 0,45 pour les autres.** Le critère
 * demande « cette méthode est-elle taillée pour la cible ? » (heuristique §4.5),
 * et la réponse est franchement oui pour un décalage qu'on ne peut motiver que
 * par son résultat. Un décalage nommé — ROT13, le César historique — se
 * justifie AVANT de regarder ce qu'il donne ; les autres, non.
 */
// ★ `CESAR_CLASSIQUE` est déclaré plus haut, avec la réglette qui s'en déduit.
const CESAR_HISTORIQUE = 3;

/** Le nom du décalage, en toutes lettres, pour la règle affichée. */
const RANGS = Object.freeze([
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept',
  'dix-huit', 'dix-neuf', 'vingt', 'vingt et un', 'vingt-deux', 'vingt-trois',
  'vingt-quatre', 'vingt-cinq',
]);
const RANGS_EN = Object.freeze([
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
  'twenty-three', 'twenty-four', 'twenty-five',
]);

/** Un césar, tout entier dérivé de son décalage. */
function cesarDe(n) {
  const classique = n === CESAR_CLASSIQUE;
  return {
    // ★ **`f.rot13` GARDE SON IDENTIFIANT**, alors que ses vingt-quatre cadets
    //   s'appellent `f.cesarN`. Ce n'est pas de la nostalgie : un identifiant
    //   est la clé stable de l'opérateur — les tables de titres, le barème et
    //   les notes de `.planning/` le nomment ainsi —, et le renommer aurait
    //   coûté une migration pour ne gagner qu'une régularité de façade. ROT13
    //   porte d'ailleurs un nom que les autres n'ont pas.
    id: n === CESAR_CLASSIQUE ? 'f.rot13' : `f.cesar${n}`, code: `fr${n}`, famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue(`Chiffre de César (${n})`, `Caesar cipher (${n})`),
    regle: bilingue(
      `Chaque lettre avance de ${RANGS[n]} rang${n > 1 ? 's' : ''}`,
      `Every letter moves ${RANGS_EN[n]} place${n > 1 ? 's' : ''} along`,
    ),
    notoriete: classique ? 0.25 : (n === CESAR_HISTORIQUE ? 0.20 : 0.10),
    adHoc: (classique || n === CESAR_HISTORIQUE) ? 0.25 : 0.45,
    // ★ **LE DÉCALAGE EST PUBLIÉ**, et pas seulement appliqué. La scène doit
    //   pouvoir faire coulisser la réglette du bon nombre de crans sans le
    //   deviner du code ni le recompter de la table (`visuel/primitives/
    //   table.js`) : le lire ici est la seule façon d'être sûr que ce qui glisse
    //   à l'écran est ce qui a été calculé (CONTRACTS §0.3).
    decalage: n,
    apply: (valeur, traces) => muer(valeur, traces, (s) => cesar(s, n)),
    remplace: true,
    // ★ Un décalage se montre par une réglette qui GLISSE : la bande du bas est
    //   la même que celle du haut, partie n rangs plus loin. Sa couture — le
    //   vide entre `Z` et `A` — est le modulo, à l'endroit exact où il opère,
    //   comme le retour à la ligne de la pythagoricienne pour son 9.
    forme: 'glissiere',
    table: regletteDe(LETTRES, (c) => cesar(c, n)),
  };
}

/**
 * ⚠️ **L'ORDRE COMPTE** : la déclaration doit suivre le registre
 * (`catalogue.js › ORDRE_CANONIQUE`, §4.1 règle 3). `fr13` était inscrit avant
 * les autres ; il reste donc en tête de la série, et les vingt-quatre nouveaux
 * viennent après, par décalage croissant.
 */
const CESARS = Object.freeze([
  cesarDe(CESAR_CLASSIQUE),
  ...Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((n) => n !== CESAR_CLASSIQUE)
    .map(cesarDe),
]);

const brut = [
  {
    id: 'f.protocole', code: 'fp', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ignore le protocole', 'Ignore the protocol'),
    regle: bilingue('https:// , http:// , ftp:// ne disent rien de l’adresse',
      'https://, http://, ftp:// say nothing about the address'),
    notoriete: 0.70, commute: true,
    apply(valeur, traces) {
      const m = PROTOCOLES.exec(valeur);
      if (!m) return null;
      return garder(valeur, traces, (_, i) => i >= m[0].length);
    },
    couverture(valeur) {
      const m = PROTOCOLES.exec(valeur);
      return m ? [[0, m[0].length]] : [];
    },
  },
  {
    id: 'f.www', code: 'fw', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ignore le « www. »', 'Ignore the "www."'),
    regle: bilingue('Le sous-domaine www n’appartient pas au nom',
      'The www subdomain is no part of the name'),
    notoriete: 0.70, commute: true,
    apply(valeur, traces) {
      if (!/^www\./i.test(valeur)) return null;
      return garder(valeur, traces, (_, i) => i >= 4);
    },
    couverture: (valeur) => (/^www\./i.test(valeur) ? [[0, 4]] : []),
  },
  {
    id: 'f.tld', code: 'ftld', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ignore l’extension', 'Ignore the extension'),
    regle: bilingue('.fr, .com, .org… ne sont qu’un rayon de bibliothèque',
      '.fr, .com, .org… are only a shelf in the library'),
    notoriete: 0.70, commute: true,
    apply(valeur, traces) {
      const m = RE_EXTENSION.exec(valeur);
      if (!m) return null;
      const debut = valeur.length - m[0].length;
      return garder(valeur, traces, (_, i) => i < debut);
    },
    couverture(valeur) {
      const m = RE_EXTENSION.exec(valeur);
      return m ? [[valeur.length - m[0].length, valeur.length]] : [];
    },
  },
  {
    id: 'f.avantSlash', code: 'fav', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On garde ce qui précède le « / »', 'Keep what comes before the "/"'),
    regle: bilingue('Le domaine, pas le chemin', 'The domain, not the path'),
    mention: bilingue('Le domaine', 'The domain'),
    coupe: true,
    // ★ SOUS L'ATBASH, ET C'EST MÉRITÉ. Ils étaient notés 0,70 et 0,60 — au
    //   niveau des filtres que tout le monde reconnaît. Or couper une adresse à
    //   la première barre oblique n'est un geste évident QUE si l'on sait déjà
    //   quelle moitié on veut : les deux moitiés existent, l'opérateur choisit,
    //   et ce choix ne se lit nulle part dans la saisie. C'est la définition
    //   même de l'ad hoc. « Ils devraient être pires que fatb » (l'auteur) —
    //   l'Atbash, lui, est un chiffrement nommé qui ne choisit rien.
    notoriete: 0.20, adHoc: 0.25,
    bornes: bornesAvantSlash,
    apply: (valeur, traces) => garderBornes(valeur, traces, bornesAvantSlash(valeur)),
  },
  {
    id: 'f.apresSlash', code: 'fap', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On garde ce qui suit le « / »', 'Keep what comes after the "/"'),
    regle: bilingue('Le chemin, pas le domaine', 'The path, not the domain'),
    mention: bilingue('Le chemin', 'The path'),
    coupe: true,
    // Encore un cran en dessous de son jumeau : garder le domaine est au moins
    // le réflexe de qui lit une adresse ; garder le chemin ne l'est pas.
    notoriete: 0.15, adHoc: 0.30,
    bornes: bornesApresSlash,
    apply: (valeur, traces) => garderBornes(valeur, traces, bornesApresSlash(valeur)),
  },
  // ★ LES TROIS DÉCOUPES QUI DISENT LEUR NOM.
  //
  //   `fav` et `fap` sont POSITIONNELS : ils coupent à la première barre
  //   oblique et gardent un côté. Ils ne prétendent rien savoir de ce qu'ils
  //   gardent — d'où leur note basse, et d'où la demande de l'auteur : « il
  //   faudrait aussi nommer ce qu'on fait ». Les trois qui suivent nomment.
  //   Ils ne coupent pas à un endroit, ils RECONNAISSENT un objet — le domaine,
  //   un tronçon de chemin, la page — et s'abstiennent quand l'objet n'est pas
  //   là. C'est pour cela qu'ils coexistent avec leurs aînés au lieu de les
  //   remplacer : sur `hope.fr/a`, `fap` et `fpag` rendent tous deux « a », et
  //   pourtant l'un a dit « ce qui suit la barre » quand l'autre a dit « la
  //   page ». Deux affirmations différentes, dont une seule survit à
  //   `hope.fr/a/b`.
  {
    id: 'f.domaine', code: 'fdom', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On analyse le domaine', 'Analyse the domain'),
    regle: bilingue('Le nom du site : ni le protocole, ni ce qui suit',
      'The site’s name: neither the protocol nor what follows'),
    mention: bilingue('Le domaine', 'The domain'),
    coupe: true,
    // ★ PILE SUR LA LIGNE DE L'ATBASH (0,25 / 0,20), et c'est le seul des cinq
    //   à y avoir droit. Ses aînés sont dessous parce qu'ils CHOISISSENT une
    //   moitié, et que ce choix ne se lit pas dans la saisie ; celui-ci ne
    //   choisit rien — la forme d'un nom de domaine est écrite dans l'adresse,
    //   il la reconnaît ou il s'abstient. Pas au-dessus non plus : décider de
    //   regarder l'adresse plutôt que le texte reste une décision.
    notoriete: 0.25, adHoc: 0.20,
    bornes: bornesDomaine,
    apply: (valeur, traces) => garderBornes(valeur, traces, bornesDomaine(valeur)),
  },
  {
    id: 'f.chemin', code: 'fchm', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On analyse le chemin', 'Analyse the path'),
    regle: bilingue('Le premier tronçon après le domaine, pas le reste',
      'The first leg after the domain, not the rest'),
    mention: bilingue('Le chemin', 'The path'),
    coupe: true,
    // Le dernier de la file, et de loin. Il reconnaît son domaine comme
    // `f.domaine` — il ne coupe donc pas au hasard —, mais ce qu'il GARDE est
    // le plus arbitraire des cinq : ni le site, ni la page, un tronçon du
    // milieu. `fap` gardait le chemin entier, ce qui se discute encore ;
    // s'arrêter au premier tronçon ne se discute pas, cela s'assume.
    notoriete: 0.12, adHoc: 0.35,
    bornes: bornesChemin,
    apply: (valeur, traces) => garderBornes(valeur, traces, bornesChemin(valeur)),
  },
  {
    id: 'f.page', code: 'fpag', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On analyse le nom de la page', 'Analyse the page name'),
    regle: bilingue('Ce qui suit la dernière barre, la barre finale ne comptant pas',
      'What follows the last slash, a trailing slash aside'),
    mention: bilingue('Le nom de la page', 'The page name'),
    coupe: true,
    // Entre les deux aînés : « la page » est un objet que tout le monde nomme,
    // mais s'y arrêter plutôt que de lire le site est déjà un choix.
    notoriete: 0.18, adHoc: 0.30,
    bornes: bornesPage,
    apply: (valeur, traces) => garderBornes(valeur, traces, bornesPage(valeur)),
  },
  {
    id: 'f.lettres', code: 'fl', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les lettres', 'Keep the letters only'),
    regle: bilingue('Chiffres et ponctuation sont du décor', 'Digits and punctuation are mere scenery'),
    mention: bilingue('Lettres', 'Letters'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, estLettreLarge),
  },
  {
    id: 'f.voyelles', code: 'fv', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les voyelles', 'Keep the vowels only'),
    regle: bilingue('A, E, I, O, U — le souffle du mot', 'A, E, I, O, U — the breath of the word'),
    mention: bilingue('Voyelles', 'Vowels'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, (c) => estVoyelle(c, false)),
  },
  {
    id: 'f.voyellesY', code: 'fvy', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les voyelles, Y compris', 'Keep the vowels only, Y included'),
    regle: bilingue('A, E, I, O, U et Y', 'A, E, I, O, U and Y'),
    mention: bilingue('Voyelles, Y compris', 'Vowels, Y included'),
    notoriete: 0.75, commute: true,
    note: bilingue(
      'Le Y est une voyelle « selon les écoles » : les deux lectures existent dans le catalogue.',
      'Whether Y is a vowel depends on who you ask: the catalogue carries both readings.',
    ),
    apply: (valeur, traces) => garder(valeur, traces, (c) => estVoyelle(c, true)),
  },
  {
    id: 'f.consonnes', code: 'fc', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les consonnes', 'Keep the consonants only'),
    regle: bilingue('Toutes les lettres sauf A, E, I, O, U', 'Every letter but A, E, I, O, U'),
    mention: bilingue('Consonnes', 'Consonants'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces,
      (c) => estLettreLarge(c) && !estVoyelle(c, false)),
  },
  {
    id: 'f.dedoublonne', code: 'fd', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On supprime les doublons', 'Drop the duplicates'),
    regle: bilingue('Une lettre déjà vue ne compte pas deux fois', 'A letter already seen does not count twice'),
    mention: bilingue('Dédoublonnage', 'De-duplication'),
    mode: 'fusion', rang: 1,
    notoriete: 0.55, commute: true,
    apply: (valeur, traces) => dedoublonner(valeur, traces, 1),
  },
  // ★ LES QUATRE CADETS DU DÉDOUBLONNAGE. Même règle, même accolade, même
  //   geste : seule change la place où le survivant retombe. « Une variante
  //   pour le faire remonter à la position du dernier exemplaire, sans porter
  //   un nom différent » (l'auteur) — et, pour les triplets, celle du milieu.
  //   Ils sont donc engendrés d'une seule source, comme les césars, et leur
  //   ad-hoc monte avec le rang : garder la première occurrence est ce que
  //   fait n'importe qui ; garder la quatrième demande une raison.
  ...[2, 3, 4, 5].map((rang) => ({
    id: `f.dedoublonne${rang}`, code: `fd${rang}`, famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On supprime les doublons', 'Drop the duplicates'),
    regle: bilingue(
      `On garde le ${['', '', 'deuxième', 'troisième', 'quatrième', 'cinquième'][rang]} exemplaire`,
      `Keep the ${['', '', 'second', 'third', 'fourth', 'fifth'][rang]} copy`),
    mention: bilingue('Dédoublonnage', 'De-duplication'),
    mode: 'fusion', rang,
    notoriete: 0.20, adHoc: 0.25 + rang * 0.05,
    apply: (valeur, traces) => dedoublonner(valeur, traces, rang),
  })),
  {
    // ★ ANNULATION PAR PAIRES — et ce n'est pas un dédoublonnage.
    //
    //   « Contrairement au dédoublonnage, on ne garde AUCUN des deux
    //   exemplaires » (l'auteur). Deux jumeaux montent, se jettent l'un sur
    //   l'autre, disparaissent ensemble. Ce qui survit, c'est ce qui n'avait
    //   personne contre qui s'annuler : les lettres uniques, et l'exemplaire
    //   surnuméraire d'une famille en nombre impair. Trois `o` laissent donc un
    //   `o`, cinq en laissent un — et c'est une bien meilleure justification de
    //   garder le troisième ou le cinquième qu'un choix décrété.
    id: 'f.annulationPaires', code: 'fpr', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('Les paires s’annulent', 'Pairs cancel out'),
    regle: bilingue('Deux exemplaires identiques se détruisent l’un l’autre',
      'Two identical copies destroy each other'),
    mention: bilingue('Annulation par paires', 'Pairwise cancellation'),
    mode: 'annulation',
    notoriete: 0.25, adHoc: 0.35,
    apply: (valeur, traces) => garder(valeur, traces, parite(valeur)),
  },
  {
    // ★ UNIQUE — tous les exemplaires d'une lettre répétée s'annulent, y
    //   compris le dernier. Ne survit que ce qui n'a jamais eu de jumeau.
    //   C'est le complément exact de `f.repetees` (« l'union fait la force »),
    //   et les deux se lisent ensemble : l'un garde ce qui revient, l'autre ce
    //   qui ne revient pas.
    id: 'f.unique', code: 'fun', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que ce qui ne se répète pas', 'Keep only what never repeats'),
    regle: bilingue('Une lettre vue deux fois s’annule entièrement',
      'A letter seen twice cancels out entirely'),
    mention: bilingue('Unique', 'Unique'),
    mode: 'unique',
    notoriete: 0.30, adHoc: 0.25,
    apply(valeur, traces) {
      const compte = new Map();
      for (const c of valeur) compte.set(pli(c), (compte.get(pli(c)) || 0) + 1);
      return garder(valeur, traces, (c) => (compte.get(pli(c)) || 0) === 1);
    },
  },
  {
    id: 'f.repetees', code: 'fr', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les lettres répétées', 'Keep the repeated letters only'),
    regle: bilingue('Ce qui revient au moins deux fois', 'Whatever comes back at least twice'),
    mention: bilingue('L’union fait la force', 'Strength in numbers'),
    notoriete: 0.50, commute: true,
    apply: (valeur, traces) => {
      const compte = new Map();
      for (const c of valeur) compte.set(pli(c), (compte.get(pli(c)) || 0) + 1);
      return garder(valeur, traces, (c) => (compte.get(pli(c)) || 0) >= 2);
    },
  },
  {
    id: 'f.initiales', code: 'fi', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les initiales', 'Keep the initials only'),
    regle: bilingue('La première lettre de chaque mot', 'The first letter of every word'),
    // ★ ACCORDÉ SUR CE QU'ON VOIT, comme le titre d'une agrégation l'est sur
    //   ses opérandes (`combinateurs.js › natureOperandes`). Un mot, une
    //   initiale ; trois mots, trois initiales. « Initiale(s) » avec sa
    //   parenthèse serait la forme de personne — celle d'un formulaire, pas
    //   d'une démonstration.
    mention: bilingue('Initiale', 'Initial'),
    mentionPluriel: bilingue('Initiales', 'Initials'),
    // Le signe qui DÉSIGNE : un accent circonflexe sous chaque lettre retenue,
    // pointé vers elle. Il dit « celle-ci », là où l'accolade dit « celles-ci ».
    designe: '^',
    notoriete: 0.65,
    apply: (valeur, traces) => {
      const its = [...valeur];
      let debutMot = true;
      return garder(valeur, traces, (c, i) => {
        const lettre = estLettreLarge(its[i]);
        const garde = lettre && debutMot;
        debutMot = !lettre;
        return garde;
      });
    },
  },
  {
    id: 'f.motRepete', code: 'fmr', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On isole le motif répété', 'Isolate the repeated pattern'),
    regle: bilingue('X-X-X : trois fois la même chose, donc une seule',
      'X-X-X: the same thing three times over, so just the once'),
    mention: bilingue('Dédoublonnage', 'De-duplication'),
    // ★ LE MÊME GESTE, UNE ÉCHELLE PLUS HAUT. « Même nom et animation que pour
    //   le dédoublonnage, mais à l'échelle des mots » (l'auteur). Une famille
    //   n'est plus faite de lettres identiques mais des k-ièmes lettres de
    //   chaque répétition : le `h` du deuxième « hope » rejoint le `h` du
    //   premier, le `o` rejoint le `o`… et les trois mots se superposent
    //   littéralement. Les séparateurs, eux, n'appartiennent à aucune famille
    //   et s'en vont avec le reste.
    mode: 'fusion', rang: 1,
    familles(valeur) {
      const parts = decouperMots(valeur);
      if (parts.length < 2) return [];
      const long = parts[0].fin - parts[0].debut;
      if (!parts.every((p) => p.fin - p.debut === long)) return [];
      return Array.from({ length: long }, (_, k) => parts.map((p) => p.debut + k));
    },
    notoriete: 0.70,
    apply(valeur, traces) {
      const parts = decouperMots(valeur);
      if (parts.length < 2) return null;
      const ref = parts[0].texte.toLowerCase();
      if (!ref || !parts.every((p) => p.texte.toLowerCase() === ref)) return null;
      const { debut, fin } = parts[0];
      return garder(valeur, traces, (_, i) => i >= debut && i < fin);
    },
    couverture(valeur) {
      const parts = decouperMots(valeur);
      if (parts.length < 2) return [];
      return parts.map((p) => [p.debut, p.fin]);
    },
  },
  // ★ TROIS LECTURES D'UN MOT, TROIS OPÉRATEURS — et le choix est dans l'URL.
  //
  //   « hope » se traduit par « espérer », « souhaiter » ou « espérance » : le
  //   verbe, son synonyme, le nom. Trois mots de longueurs différentes, donc
  //   trois démonstrations différentes. N'en offrir qu'une revenait à trancher
  //   à la place du lecteur — et à trancher pour celle que le dictionnaire cite
  //   en premier, ce qui n'est le choix de personne.
  //
  //   « Il serait utile que l'opérateur soit déclinable en plusieurs variantes,
  //   comme ça on peut garder la traduction qui nous arrange, tout en ayant un
  //   vrai dictionnaire » (l'auteur). Le choix devient alors VISIBLE : il
  //   s'écrit dans le lien, il se relit, et il se paie en ad-hoc — préférer la
  //   troisième acception parce qu'elle tombe juste est exactement le
  //   magasinage qu'un décalage de César choisi après coup nous coûte déjà.
  ...[
    ['f.traduitFR', 'ffr', DICO_EN_FR, bilingue('On traduit en français', 'Translate into French')],
    ['f.traduitEN', 'fen', DICO_FR_EN, bilingue('On traduit en anglais', 'Translate into English')],
  ].flatMap(([id, code, dico, libelle]) => [1, 2, 3, 4, 5].map((rang) => ({
    id: rang === 1 ? id : `${id}${rang}`,
    code: rang === 1 ? code : `${code}${rang}`,
    famille: 'filtre', from: 'STR', to: 'STR',
    libelle,
    regle: rang === 1
      ? bilingue('Le sens ne dépend pas de la langue', 'Meaning does not depend on the language')
      : bilingue(`Le sens ne dépend pas de la langue — ${rang}ᵉ acception`,
        `Meaning does not depend on the language — sense ${rang}`),
    mention: bilingue('Traduction', 'Translation'),
    // ★ LE MÊME PRIX POUR LES CINQ, et c'est un choix mesuré.
    //
    //   J'avais fait monter l'ad-hoc avec le rang, par analogie avec les
    //   vingt-cinq césars. L'analogie est fausse, et l'auteur l'a corrigée :
    //   « bien plus discret que les césars, pas de malus à choisir les
    //   suivantes ». Un décalage de César n'a AUCUN sens hors du résultat qu'il
    //   produit — treize plutôt que douze, c'est le nombre qui tombe juste et
    //   rien d'autre. Une acception, si : « espoir » et « espérer » sont deux
    //   lectures légitimes du même mot, et préférer l'une reste une lecture.
    //
    //   « Le choix après coup est le principe même du site : on choisit ce
    //   qu'on veut obtenir et on cherche le chemin le plus élégant pour y
    //   arriver » (l'auteur). Ce qui se paie, c'est de changer de langue —
    //   une fois, au même tarif pour les cinq.
    notoriete: 0.15,
    adHoc: 0.30,
    // ★ L'ACCEPTION EST PUBLIÉE, comme un César publie son décalage.
    //
    //   Elle ne sert pas au geste — `apply` a déjà `rang` en portée —, elle sert
    //   à ce que le barème puisse RECONNAÎTRE deux lectures du même mot sans
    //   déduire quoi que ce soit d'un code. C'est la règle du projet : ce qui
    //   est jugé est déclaré, jamais deviné à la forme d'une chaîne.
    //
    //   Ce qu'elle permet, et qui est un arbitrage de l'auteur : « traduire le
    //   même mot différemment dans une même voie peut être considéré comme une
    //   ficelle ou comme du ad-hoc très élevé » — voir
    //   `recherche/elegance.js › TRADUCTIONS_DIVERGENTES`.
    acception: rang,
    apply: (valeur, traces) => traduire(valeur, traces, dico, rang),
    remplace: true,
  }))),
  {
    id: 'f.majuscule', code: 'fmaj', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en capitales', 'Switch to capitals'),
    regle: bilingue('La capitale n’a pas le même tracé que le bas de casse',
      'A capital is not drawn like a lower-case letter'),
    mention: bilingue('En capitales', 'To capitals'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toUpperCase()),
    remplace: true,
  },
  {
    id: 'f.minuscule', code: 'fmin', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en bas de casse', 'Switch to lower case'),
    regle: bilingue('Le bas de casse n’a pas le même tracé que la capitale',
      'A lower-case letter is not drawn like a capital'),
    mention: bilingue('En bas de casse', 'To lower case'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toLowerCase()),
    remplace: true,
  },
  {
    id: 'f.sansAccents', code: 'fac', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On retire les accents', 'Strip the accents'),
    regle: bilingue('é devient e, ç devient c', 'é becomes e, ç becomes c'),
    mention: bilingue('Normalisation sans accents', 'Accent-free normalisation'),
    // ★ 0,95 — « son score de notoriété peut grimper » (l'auteur). Retirer les
    //   accents n'est pas un tour de passe-passe : c'est ce que fait tout
    //   moteur de recherche, tout identifiant d'URL, tout tri de bibliothèque.
    notoriete: 0.95, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, sansAccents),
    remplace: true,
  },
  {
    id: 'f.leet', code: 'flt', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On décode le leetspeak', 'Decode the leetspeak'),
    // Le libellé dit le GESTE, l'outil dit ce qu'on a sous les yeux : une table
    // de neuf correspondances, et rien d'autre à démontrer.
    outil: bilingue('Table du leetspeak', 'Leetspeak table'),
    regle: bilingue('0→o, 1→i, 3→e, 4→a, 5→s, 6→b, 7→t, 8→B, 9→g',
      '0→o, 1→i, 3→e, 4→a, 5→s, 6→b, 7→t, 8→B, 9→g'),
    notoriete: 0.30, adHoc: 0.15,
    apply: (valeur, traces) => muer(valeur, traces, deleet),
    remplace: true,
    // ★ Neuf correspondances, arbitraires : rien à démontrer, tout à MONTRER.
    //   Une réglette ordinaire suffit — le chiffre en haut, la lettre dessous —
    //   et la règle cesse d'être une ligne de légende qu'il faut croire. Pas de
    //   glissière ici : le leet n'est pas un déplacement de l'alphabet, et le
    //   moteur visuel refuserait ce dessin (`primitives/table.js`).
    forme: 'reglette',
    table: regletteDe(Object.keys(LEET).sort(), deleet),
  },
  {
    id: 'f.atbash', code: 'fatb', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On applique l’Atbash', 'Apply the Atbash cipher'),
    // Ce que la scène montre n'est pas le geste mais l'OBJET : un miroir tendu
    // à l'alphabet. Le nom l'annonce, et l'animation de la table le joue — la
    // seconde réglette part identique à la première, puis se retourne.
    outil: bilingue('Miroir Atbash', 'Atbash mirror'),
    regle: bilingue('A devient Z, B devient Y… le miroir de l’alphabet',
      'A becomes Z, B becomes Y… the alphabet held up to a mirror'),
    notoriete: 0.25, adHoc: 0.2,
    apply: (valeur, traces) => muer(valeur, traces, atbash),
    remplace: true,
    // ★ La règle EST une symétrie : elle se montre par deux alphabets alignés,
    //   l'un à l'endroit, l'autre à l'envers. `A` en face de `Z`, `B` en face
    //   de `Y`, et l'axe du miroir tombe pile au milieu de la bande. La
    //   glissière est refusée à qui n'est pas un déplacement de la réglette :
    //   celle-ci l'est, d'un pas de −1.
    forme: 'glissiere',
    table: regletteDe(LETTRES, atbash),
  },
  // ★ Les vingt-cinq décalages, dont `f.rot13`. Aucun ne déclare son `outil` :
  //   il se DÉDUIT de la réglette, qui se déduit elle-même de `cesar` — si bien
  //   qu'aucun ne peut annoncer un décalage qu'il n'applique pas.
  ...CESARS,
];

/** Première barre oblique qui ne fait pas partie d'un « :// ». */
function positionSlash(valeur) {
  for (let i = 0; i < valeur.length; i++) {
    if (valeur[i] !== '/') continue;
    if (valeur[i - 1] === ':' || valeur[i - 1] === '/' || valeur[i + 1] === '/') continue;
    return i;
  }
  return -1;
}

/**
 * ★ LES BORNES DES DEUX AÎNÉS, écrites comme celles des trois cadets.
 *
 * `fav` et `fap` gardaient un côté de la barre par un prédicat sur l'index ;
 * c'est la même chose qu'un intervalle, dit autrement. Les écrire sous la même
 * forme n'est pas un rangement : c'est ce qui permet à la SCÈNE de savoir où
 * passe la coupe (voir `etapeDecoupeAdresse`), pour les cinq et de la même
 * façon.
 *
 * ⚠️ `positionSlash` rend un index de CHAÎNE ; les bornes se comptent en points
 *   de code (voir juste en dessous). D'où `enPoints`, comme partout ailleurs.
 */
/**
 * ★ **DES BORNES QUI NE COUPENT RIEN N'EN SONT PAS** — et il faut le dire ici,
 *   une fois, plutôt que dans cinq `apply`.
 *
 * `garder` refuse déjà deux cas : ne rien garder, et ne rien retirer. Un
 * opérateur qui ne s'applique pas doit le DIRE — c'est la règle du fichier —, et
 * `apply` la respectait donc en rendant `null`. Mais les bornes, elles, étaient
 * rendues telles quelles : sur `https://hope-hope-hope.fr/`, `f.apresSlash`
 * trouvait la barre FINALE et publiait un intervalle vide, non nul. La scène
 * aurait alors affiché une coupe là où le moteur s'abstient.
 *
 * Les deux passent donc par ici, et disent la même chose.
 */
function bornesUtiles(valeur, bornes) {
  if (!bornes) return null;
  const [debut, fin] = bornes;
  if (fin <= debut) return null;                              // rien à garder
  if (debut <= 0 && fin >= points(valeur).length) return null; // rien à retirer
  return bornes;
}

function bornesAvantSlash(valeur) {
  const i = positionSlash(valeur);
  return i < 0 ? null : bornesUtiles(valeur, [0, enPoints(valeur, i)]);
}

function bornesApresSlash(valeur) {
  const i = positionSlash(valeur);
  return i < 0 ? null : bornesUtiles(valeur, [enPoints(valeur, i) + 1, points(valeur).length]);
}

/**
 * ★ LES BORNES SE COMPTENT EN POINTS DE CODE, jamais en unités UTF-16.
 *
 * C'est `garder` qui impose l'unité : son prédicat reçoit l'index dans
 * `[...valeur]`. Une expression régulière, elle, rend un index de chaîne. Un
 * seul émoji dans un chemin — ils existent, dans les adresses comme ailleurs —
 * suffirait à décaler d'un cran tout ce qui suit, et la coupe tomberait à côté
 * sans que rien ne proteste.
 */
const points = (valeur) => [...valeur];
const enPoints = (valeur, i) => (i < 0 ? -1 : points(valeur.slice(0, i)).length);

/** Ne garder que l'intervalle reconnu — et `null` quand il n'y en a pas. */
const garderBornes = (valeur, traces, bornes) => (bornes
  ? garder(valeur, traces, (_, k) => k >= bornes[0] && k < bornes[1])
  : null);

/**
 * Le NOM DE DOMAINE en tête de la chaîne (`RE_HOTE`), protocole exclu.
 *
 * `null` dès que rien ne ressemble à un domaine : c'est ce qui distingue
 * `f.domaine` de `f.avantSlash`, lequel coupe à la barre même quand ce qui
 * précède est une phrase.
 */
function bornesDomaine(valeur) {
  const protocole = PROTOCOLES.exec(valeur);
  const tete = protocole ? protocole[0] : '';
  const m = RE_HOTE.exec(valeur.slice(tete.length));
  if (!m) return null;
  const debut = points(tete).length;
  return bornesUtiles(valeur, [debut, debut + points(m[0]).length]);
}

/**
 * Le PREMIER TRONÇON de chemin — « domaine/{ceci}/… », la forme écrite par
 * l'auteur, y compris le mot « domaine » qu'elle contient.
 *
 * ★ Le tronçon se compte donc APRÈS UN DOMAINE RECONNU, pas après la première
 * barre venue. C'est ce qui sépare `f.chemin` de `f.apresSlash` : sur `a/b`, la
 * seconde garde « b » sans se demander ce qu'était « a », la première s'abstient
 * — il n'y a pas de chemin là où il n'y a pas de site. Et c'est aussi ce qui la
 * rend juste sur `https://hope.fr/a/b`, où la première barre utile n'est plus
 * celle du chemin.
 *
 * Une chaîne de requête n'est pas du chemin : `?` et `#` ferment le tronçon au
 * même titre que la barre suivante.
 */
function bornesChemin(valeur) {
  const domaine = bornesDomaine(valeur);
  if (!domaine) return null;
  const cs = points(valeur);
  // Un port n'est pas du chemin, mais il s'intercale entre le domaine et lui :
  // le sauter coûte deux lignes, et l'oublier ferait s'abstenir l'opérateur sur
  // une adresse qui a pourtant un chemin parfaitement lisible.
  let barre = domaine[1];
  if (cs[barre] === ':') { do { barre++; } while (barre < cs.length && cs[barre] >= '0' && cs[barre] <= '9'); }
  if (cs[barre] !== '/') return null;
  let fin = barre + 1;
  while (fin < cs.length && !'/?#'.includes(cs[fin])) fin++;
  return bornesUtiles(valeur, fin > barre + 1 ? [barre + 1, fin] : null);
}

/**
 * Le NOM DE LA PAGE — « ^.+/{ceci sans / final}$ ».
 *
 * La barre finale ne compte pas : `…/manifeste/` et `…/manifeste` nomment la
 * même page, et une adresse ne devrait pas dépendre de la façon dont on l'a
 * recopiée. Le début doit tomber APRÈS la première barre : sous celle-ci on est
 * encore dans le domaine, et `https://hope.fr` n'a pas de page — l'opérateur le
 * dit en rendant `null` plutôt qu'en rendant le domaine sous un autre nom.
 */
function bornesPage(valeur) {
  const i = enPoints(valeur, positionSlash(valeur));
  if (i < 0) return null;
  const cs = points(valeur);
  let fin = cs.length;
  while (fin > 0 && cs[fin - 1] === '/') fin--;
  let debut = fin;
  while (debut > 0 && cs[debut - 1] !== '/') debut--;
  return bornesUtiles(valeur, debut > i && debut < fin ? [debut, fin] : null);
}

/** Découpe en mots sur `- . _ / espace`, avec les bornes dans la chaîne. */
export function decouperMots(valeur) {
  const out = [];
  let debut = null;
  const chars = [...valeur];
  chars.forEach((c, i) => {
    const sep = /[-._/\s+~]/.test(c);
    if (!sep && debut === null) debut = i;
    if (sep && debut !== null) { out.push({ texte: chars.slice(debut, i).join(''), debut, fin: i }); debut = null; }
  });
  if (debut !== null) out.push({ texte: chars.slice(debut).join(''), debut, fin: chars.length });
  return out;
}

/**
 * Trois gestes, et le choix se lit dans le descripteur :
 *
 * | le filtre… | sortie | geste |
 * |------------|--------|-------|
 * | retire des caractères | ids conservés | `drop`, puis `move` |
 * | remplace, **table à l'appui** | ids des seuls mués | `table`, une lettre à la fois |
 * | remplace | ids recréés | `substitute` |
 *
 * ★ La table n'est pas donnée à tous les `remplace`, et c'est délibéré. Elle
 * répond à « comment fais-tu cette conversion ? » : l'Atbash, César et le leet
 * speak doivent une réponse, parce que rien dans `h → s` ne se devine. La
 * capitale, le bas de casse et le retrait des accents n'en doivent aucune — le
 * glyphe d'arrivée montre lui-même ce qui s'est passé, et une réglette de
 * vingt-six cases où `A` donne `A` serait une tautologie mise en scène. La
 * traduction, elle, ne travaille pas lettre à lettre : c'est le mot entier qui
 * change, et sa table serait le dictionnaire.
 */
export const FILTRES = Object.freeze(brut.map((spec) => {
  const { remplace, ...reste } = spec;
  const parTable = remplace && Array.isArray(spec.table) && spec.table.length > 0;
  const base = {
    ...reste,
    // Le nom AFFICHÉ DANS LA SCÈNE : celui que l'opérateur déclare, sinon celui
    // que sa table dicte (un chiffre de César se nomme par son décalage), sinon
    // son libellé. Calculé ici, une fois, AVANT que `steps()` ne se referme
    // dessus : la scène et le catalogue doivent lire la MÊME chaîne, pas deux
    // replis qui se ressemblent.
    outil: reste.outil || outilDuChiffrement(reste) || reste.libelle,
    sortie: parTable ? sortieMuee : (remplace ? sortieCreee : sortieConservee),
  };
  // ★ Le geste se DÉDUIT de ce que l'opérateur déclare, dans cet ordre : une
  //   table à montrer, un rapprochement d'exemplaires, un remplacement, un
  //   retrait. Aucune liste de codes nulle part.
  const steps = parTable ? etapeTable(base)
    : (base.coupe ? etapeDecoupeAdresse(base)
      : (base.mode ? etapeRapprochement(base)
        : (remplace ? etapeRemplacement(base) : etapeRetrait(base))));
  return def({ ...base, steps });
}));
