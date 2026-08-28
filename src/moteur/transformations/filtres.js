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
import { bilingue, dire } from '../i18n.js';
import {
  def, apparier, sortieCreee, sortieConservee, etape, token, fusion, enchainer, nomToken,
} from './commun.js';

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
    return [etape(ctx, dire(op.libelle, ctx.langue), dire(op.regle, ctx.langue), enchainer(ops))];
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

/** Petit dictionnaire embarqué (zéro dépendance, zéro requête réseau). */
export const DICO_EN_FR = Object.freeze({
  hope: 'espoir', love: 'amour', life: 'vie', death: 'mort', god: 'dieu',
  devil: 'diable', beast: 'bête', number: 'nombre', name: 'nom', world: 'monde',
  money: 'argent', power: 'pouvoir', truth: 'vérité', light: 'lumière',
  dark: 'sombre', night: 'nuit', day: 'jour', sun: 'soleil', moon: 'lune',
  star: 'étoile', fire: 'feu', water: 'eau', earth: 'terre', air: 'air',
  book: 'livre', word: 'mot', king: 'roi', queen: 'reine', dream: 'rêve',
  time: 'temps', house: 'maison', dog: 'chien', cat: 'chat', bird: 'oiseau',
  news: 'nouvelles', game: 'jeu', code: 'code', net: 'toile', web: 'toile',
  cloud: 'nuage', mail: 'courrier', shop: 'boutique', free: 'libre',
  peace: 'paix', war: 'guerre', good: 'bien', evil: 'mal', end: 'fin',
});

/** Dictionnaire inverse (première traduction gagnante, ordre de déclaration). */
export const DICO_FR_EN = Object.freeze(Object.fromEntries(
  Object.entries(DICO_EN_FR).map(([en, fr]) => [fr, en]).reverse(),
));

/** Traduction d'un mot entier — `null` si le mot est inconnu. */
function traduire(valeur, traces, dico) {
  const mot = sansAccents(valeur).toLowerCase();
  const cible = dico[mot] ?? dico[valeur.toLowerCase()];
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
 * Le leet speak, dans le sens où on le DÉCODE : le chiffre, puis la lettre.
 *
 * La substitution est écrite une fois ; `deleet` l'applique, et la réglette
 * montrée s'obtient en appliquant `deleet` — pas en relisant la table. Le
 * dessin ne peut donc pas diverger du calcul.
 */
const LEET = Object.freeze({ 4: 'a', 3: 'e', 1: 'i', 0: 'o', 5: 's', 7: 't' });
const deleet = (s) => s.replace(/[431057]/g, (c) => LEET[c] ?? c);

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
const CESAR_CLASSIQUE = 13;
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
    libelle: classique
      ? bilingue('Chiffre de César classique (13)', 'Classic Caesar cipher (13)')
      : bilingue(`Chiffre de César (${n})`, `Caesar cipher (${n})`),
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
      const m = /\.[a-z]{2,6}$/i.exec(valeur);
      if (!m) return null;
      const debut = valeur.length - m[0].length;
      return garder(valeur, traces, (_, i) => i < debut);
    },
    couverture(valeur) {
      const m = /\.[a-z]{2,6}$/i.exec(valeur);
      return m ? [[valeur.length - m[0].length, valeur.length]] : [];
    },
  },
  {
    id: 'f.avantSlash', code: 'fav', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On garde ce qui précède le « / »', 'Keep what comes before the "/"'),
    regle: bilingue('Le domaine, pas le chemin', 'The domain, not the path'),
    notoriete: 0.70,
    apply(valeur, traces) {
      const i = positionSlash(valeur);
      if (i < 0) return null;
      return garder(valeur, traces, (_, k) => k < i);
    },
  },
  {
    id: 'f.apresSlash', code: 'fap', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On garde ce qui suit le « / »', 'Keep what comes after the "/"'),
    regle: bilingue('Le chemin, pas le domaine', 'The path, not the domain'),
    notoriete: 0.60,
    apply(valeur, traces) {
      const i = positionSlash(valeur);
      if (i < 0) return null;
      return garder(valeur, traces, (_, k) => k > i);
    },
  },
  {
    id: 'f.lettres', code: 'fl', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les lettres', 'Keep the letters only'),
    regle: bilingue('Chiffres et ponctuation sont du décor', 'Digits and punctuation are mere scenery'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, estLettreLarge),
  },
  {
    id: 'f.voyelles', code: 'fv', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les voyelles', 'Keep the vowels only'),
    regle: bilingue('A, E, I, O, U — le souffle du mot', 'A, E, I, O, U — the breath of the word'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, (c) => estVoyelle(c, false)),
  },
  {
    id: 'f.voyellesY', code: 'fvy', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les voyelles, Y compris', 'Keep the vowels only, Y included'),
    regle: bilingue('A, E, I, O, U et Y', 'A, E, I, O, U and Y'),
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
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces,
      (c) => estLettreLarge(c) && !estVoyelle(c, false)),
  },
  {
    id: 'f.dedoublonne', code: 'fd', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On supprime les doublons', 'Drop the duplicates'),
    regle: bilingue('Une lettre déjà vue ne compte pas deux fois', 'A letter already seen does not count twice'),
    notoriete: 0.55, commute: true,
    apply: (valeur, traces) => {
      const vus = new Set();
      return garder(valeur, traces, (c) => {
        const k = pli(c);
        if (vus.has(k)) return false;
        vus.add(k);
        return true;
      });
    },
  },
  {
    id: 'f.repetees', code: 'fr', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les lettres répétées', 'Keep the repeated letters only'),
    regle: bilingue('Ce qui revient au moins deux fois', 'Whatever comes back at least twice'),
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
  {
    id: 'f.traduitFR', code: 'ffr', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On traduit en français', 'Translate into French'),
    regle: bilingue('Le sens ne dépend pas de la langue', 'Meaning does not depend on the language'),
    notoriete: 0.15, adHoc: 0.1,
    apply: (valeur, traces) => traduire(valeur, traces, DICO_EN_FR),
    remplace: true,
  },
  {
    id: 'f.traduitEN', code: 'fen', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On traduit en anglais', 'Translate into English'),
    regle: bilingue('Le sens ne dépend pas de la langue', 'Meaning does not depend on the language'),
    notoriete: 0.15, adHoc: 0.1,
    apply: (valeur, traces) => traduire(valeur, traces, DICO_FR_EN),
    remplace: true,
  },
  {
    id: 'f.majuscule', code: 'fmaj', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en capitales', 'Switch to capitals'),
    regle: bilingue('La capitale n’a pas le même tracé que le bas de casse',
      'A capital is not drawn like a lower-case letter'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toUpperCase()),
    remplace: true,
  },
  {
    id: 'f.minuscule', code: 'fmin', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en bas de casse', 'Switch to lower case'),
    regle: bilingue('Le bas de casse n’a pas le même tracé que la capitale',
      'A lower-case letter is not drawn like a capital'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toLowerCase()),
    remplace: true,
  },
  {
    id: 'f.sansAccents', code: 'fac', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On retire les accents', 'Strip the accents'),
    regle: bilingue('é devient e, ç devient c', 'é becomes e, ç becomes c'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, sansAccents),
    remplace: true,
  },
  {
    id: 'f.leet', code: 'flt', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On décode le leetspeak', 'Decode the leetspeak'),
    regle: bilingue('4→a, 3→e, 1→i, 0→o, 5→s, 7→t', '4→a, 3→e, 1→i, 0→o, 5→s, 7→t'),
    notoriete: 0.30, adHoc: 0.15,
    apply: (valeur, traces) => muer(valeur, traces, deleet),
    remplace: true,
    // ★ Six correspondances, arbitraires : rien à démontrer, tout à MONTRER.
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
    sortie: parTable ? sortieMuee : (remplace ? sortieCreee : sortieConservee),
  };
  const steps = parTable ? etapeTable(base)
    : (remplace ? etapeRemplacement(base) : etapeRetrait(base));
  return def({ ...base, steps });
}));
