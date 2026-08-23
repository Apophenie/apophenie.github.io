/**
 * Filtres — `STR → STR`. Codes `f…` (CONTRACTS §4.1).
 *
 * Deux gestes visuels seulement : ceux qui **retirent** des caractères émettent
 * un `drop` (les tokens conservés gardent leur identifiant), ceux qui
 * **remplacent** émettent un `substitute` (ils créent donc de nouveaux tokens).
 *
 * Convention : un filtre qui ne changerait rien retourne `null`. Une étape qui
 * ne fait rien n'a pas à être montrée, et le moteur de recherche l'élague.
 */

import { VOYELLES, VOYELLES_Y, sansAccents, atbash, cesar } from '../tables/alphabet.js';
import { bilingue, dire } from '../i18n.js';
import {
  def, apparier, sortieCreee, sortieConservee, etape, token, fusion, enchainer,
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

const brut = [
  {
    id: 'f.protocole', code: 'f1', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.www', code: 'f2', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.tld', code: 'f3', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.avantSlash', code: 'f4', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.apresSlash', code: 'f5', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.lettres', code: 'f6', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les lettres', 'Keep the letters only'),
    regle: bilingue('Chiffres et ponctuation sont du décor', 'Digits and punctuation are mere scenery'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, estLettreLarge),
  },
  {
    id: 'f.voyelles', code: 'f7', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les voyelles', 'Keep the vowels only'),
    regle: bilingue('A, E, I, O, U — le souffle du mot', 'A, E, I, O, U — the breath of the word'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces, (c) => estVoyelle(c, false)),
  },
  {
    id: 'f.voyellesY', code: 'f8', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.consonnes', code: 'f9', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On ne garde que les consonnes', 'Keep the consonants only'),
    regle: bilingue('Toutes les lettres sauf A, E, I, O, U', 'Every letter but A, E, I, O, U'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => garder(valeur, traces,
      (c) => estLettreLarge(c) && !estVoyelle(c, false)),
  },
  {
    id: 'f.dedoublonne', code: 'fa', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.repetees', code: 'fb', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.initiales', code: 'fc', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.motRepete', code: 'fd', famille: 'filtre', from: 'STR', to: 'STR',
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
    id: 'f.traduitFR', code: 'fe', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On traduit en français', 'Translate into French'),
    regle: bilingue('Le sens ne dépend pas de la langue', 'Meaning does not depend on the language'),
    notoriete: 0.15, adHoc: 0.1,
    apply: (valeur, traces) => traduire(valeur, traces, DICO_EN_FR),
    remplace: true,
  },
  {
    id: 'f.traduitEN', code: 'ff', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On traduit en anglais', 'Translate into English'),
    regle: bilingue('Le sens ne dépend pas de la langue', 'Meaning does not depend on the language'),
    notoriete: 0.15, adHoc: 0.1,
    apply: (valeur, traces) => traduire(valeur, traces, DICO_FR_EN),
    remplace: true,
  },
  {
    id: 'f.majuscule', code: 'fg', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en capitales', 'Switch to capitals'),
    regle: bilingue('La capitale n’a pas le même tracé que le bas de casse',
      'A capital is not drawn like a lower-case letter'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toUpperCase()),
    remplace: true,
  },
  {
    id: 'f.minuscule', code: 'fh', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On passe en bas de casse', 'Switch to lower case'),
    regle: bilingue('Le bas de casse n’a pas le même tracé que la capitale',
      'A lower-case letter is not drawn like a capital'),
    notoriete: 0.90, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, (s) => s.toLowerCase()),
    remplace: true,
  },
  {
    id: 'f.sansAccents', code: 'fi', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On retire les accents', 'Strip the accents'),
    regle: bilingue('é devient e, ç devient c', 'é becomes e, ç becomes c'),
    notoriete: 0.85, commute: true,
    apply: (valeur, traces) => muer(valeur, traces, sansAccents),
    remplace: true,
  },
  {
    id: 'f.leet', code: 'fj', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On décode le leetspeak', 'Decode the leetspeak'),
    regle: bilingue('4→a, 3→e, 1→i, 0→o, 5→s, 7→t', '4→a, 3→e, 1→i, 0→o, 5→s, 7→t'),
    notoriete: 0.30, adHoc: 0.15,
    apply: (valeur, traces) => muer(valeur, traces,
      (s) => s.replace(/[431057]/g, (c) => ({ 4: 'a', 3: 'e', 1: 'i', 0: 'o', 5: 's', 7: 't' }[c] ?? c))),
    remplace: true,
  },
  {
    id: 'f.atbash', code: 'fk', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On applique l’Atbash', 'Apply the Atbash cipher'),
    regle: bilingue('A devient Z, B devient Y… le miroir de l’alphabet',
      'A becomes Z, B becomes Y… the alphabet held up to a mirror'),
    notoriete: 0.30, adHoc: 0.2,
    apply: (valeur, traces) => muer(valeur, traces, atbash),
    remplace: true,
  },
  {
    id: 'f.rot13', code: 'fl', famille: 'filtre', from: 'STR', to: 'STR',
    libelle: bilingue('On applique le chiffre de César (13)', 'Apply the Caesar cipher (13)'),
    regle: bilingue('Chaque lettre avance de 13 rangs', 'Every letter moves thirteen places along'),
    notoriete: 0.25, adHoc: 0.25,
    apply: (valeur, traces) => muer(valeur, traces, (s) => cesar(s, 13)),
    remplace: true,
  },
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

export const FILTRES = Object.freeze(brut.map((spec) => {
  const { remplace, ...reste } = spec;
  const base = { ...reste, sortie: remplace ? sortieCreee : sortieConservee };
  return def({ ...base, steps: remplace ? etapeRemplacement(base) : etapeRetrait(base) });
}));
