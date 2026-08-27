// src/recherche/url.js
// Grammaire d'URL : lecture tolérante, écriture toujours canonique.
// CONTRACTS.md §4.2, §4.3, §4.4.
//
//   url        := {chemin} '#' [approche] '#' b58(saisie)
//   approche   := marqueur* fragment (',' fragment)*
//   marqueur   := registre '!' | 'c' chiffre+ '!'
//   registre   := 'so' | 'sce'        (formes longues encore LUES, plus écrites)
//   fragment   := [portee ':'] programme
//   portee     := offset '.' longueur          // en jetons ; absent ⇒ saisie entière
//   programme  := code ('+' code)*
//
// `+` sépare les OPÉRATIONS d'un même fragment (arbitrage utilisateur).
// `,` sépare les FRAGMENTS dont les 6 s'assemblent en 666.
// `×3:programme` abrège la résonance (le même programme sur les 3 occurrences).
// `so!` / `sce!` préfixe l'approche entière — voir ci-dessous.
//
// ── LA CIBLE, `c111!` — viser autre chose que 666 ──────────────────────────
//
// « Via la page de listing, pouvoir indiquer un autre objectif que 666, par
// exemple 111 ou 777 ou 13 ou 000 ou 007, et relancer la recherche mais pour
// produire ces résultats. » (l'auteur)
//
// Le marqueur suit le précédent du registre, point par point — même position
// (en tête de l'approche entière, jamais dans un fragment), même séparateur
// (`!`, qui n'apparaît nulle part ailleurs dans la grammaire), même brièveté :
// « l'URL reste essentiellement cryptique et ça participe à l'effet de
// surprise ». Une lettre, les chiffres visés, un point d'exclamation.
//
// ★ **Ce n'est pas un opérateur, et le registre §4.1 reste fermé.** Même
// argument que pour `so!` / `sce!` : un opérateur transforme l'état, il a un
// `from`, un `to`, un `apply()`. La cible ne transforme rien — elle dit ce
// qu'on CHERCHE, donc ce que le moteur retiendra. C'est une extension de la
// GRAMMAIRE, au même titre que `×3:` et que les portées `0.1:`.
//
// ★ **Aucune ambiguïté avec un code de combinateur.** Quand la cible a été
// écrite, `cs` était le code de la somme et `c111!` commençait par les mêmes
// signes ; c'est le `!` qui les séparait sans reste — il est interdit dans un
// programme, et le marqueur ne se lit qu'en TÊTE, avant le premier fragment.
// Depuis le passage aux codes parlants, la coïncidence n'existe même plus :
// aucun combinateur ne s'écrit avec un chiffre au deuxième signe (`cs`, `cst`,
// `cp`, `cal`, `cmm`, `cmo`, `cnv`, `ccat`, `cmx`, `cmn`, `cnj`, `cnjd`). Le
// `!` reste néanmoins la séparation qui fait foi, parce qu'un code neuf de la
// famille `c` pourrait un jour porter un chiffre. `#cs+mch#…` est donc un
// programme qui commence par la somme, et `#c111!cs+mch#…` la même somme visant
// 111.
//
// ★ **L'ABSENCE DE MARQUEUR VAUT 666, ET LE MARQUEUR N'EST PAS ÉCRIT QUAND IL
// VAUT 666.** C'est la seule différence avec le registre, et elle est
// délibérée. `ecrire()` pose TOUJOURS `sce!` ou `so!`, même au défaut, parce
// que ce défaut-là avait été tranché entre deux lectures également
// défendables : il fallait qu'un lien cesse d'en dépendre. Ici, il n'y a rien
// à trancher — 666 est la promesse du site, elle est écrite dans son titre, et
// aucun lien existant n'a jamais voulu dire autre chose. Écrire `c666!` sur
// chaque lien coûterait six signes à la totalité des URL pour lever une
// ambiguïté qui n'existe pas, et — surtout — CHANGERAIT la forme canonique de
// tous les liens déjà partagés, que `canoniser()` réécrit à chaque ouverture.
// Le marqueur ne paraît donc que là où il dit quelque chose.

// ── LE REGISTRE, et pourquoi ce n'est PAS un opérateur ──────────────────────
//
// Le registre de codes d'opérateurs est FERMÉ (CONTRACTS §4.1) : aucun code ne
// peut être alloué pour dire « sobre » ou « scénique ». Et ce serait de toute
// façon une faute de modélisation : un opérateur TRANSFORME l'état — il a un
// `from`, un `to`, un `apply()` —, alors que le registre ne touche à rien de ce
// qui est calculé. Deux liens qui ne diffèrent que par lui portent le MÊME
// programme, produisent le MÊME verdict et méritent le MÊME score : ils sont la
// même voie, montrée de deux manières. C'est donc une extension de la
// GRAMMAIRE (§4.2), au même titre que le préfixe de résonance `×3:` ou les
// portées `0.1:` — qui, eux non plus, ne sont pas des opérateurs.
//
// Il préfixe l'APPROCHE ENTIÈRE et non chaque fragment : montrer un fragment
// sobrement et le suivant en fanfare n'aurait aucun sens. Une seule mise en
// scène par démonstration, donc un seul marqueur, en tête.
//
// ── L'ABSENCE DE MARQUEUR VAUT « SOBRE ». Voici pourquoi ──────────────────
//
// ★ **C'est un renversement, et il est assumé.** Le défaut a valu « scénique »
// tant qu'on croyait devoir protéger des liens déjà partagés : sous cette
// contrainte, seule la lecture qui ne changeait pas le nombre d'étapes d'un
// vieux lien était tenable. L'auteur a confirmé qu'aucun lien n'a été diffusé
// hors des scénarios de test de ce dépôt. La contrainte tombe, et avec elle le
// seul argument qui tenait « scénique » debout.
//
// Ce qui reste est l'argument de fond, et il va dans l'autre sens : **la mise
// en scène s'OPTE**. Un lien nu doit rendre la version la plus crédible — celle
// qu'on peut montrer à quelqu'un sans qu'il voie d'abord des cornes de diable —
// et le spectacle doit être demandé. « Sobre » est ce qu'on obtient quand on
// n'a rien dit ; « scénique » est ce qu'on obtient quand on l'a écrit.
//
// ⚠️ Le registre de CODES D'OPÉRATEURS (§4.1) n'est pas concerné et reste
// clos : ce qui vient d'être levé porte sur les LIENS, pas sur la grammaire.
// Aucun code ne change de sens ici, aucun n'est réattribué.
//
// ── ET UN REGISTRE QU'ON NE SAIT PAS JOUER RETOMBE SUR « SOBRE » ──────────
//
// « Quand `bo!`, `ma!` ou `sce!` est utilisé dans un cas non supporté → repli
// en sobre. » (l'auteur)
//
// La mise en scène du verdict est aujourd'hui celle du 666 : les cornes de
// diable, et rien d'autre. Une cible qui n'a pas encore d'emblème — 111, 777,
// 13, 007, 000 — n'a donc pas de version scénique à jouer. Trois conduites
// étaient possibles, et deux sont mauvaises : ÉCHOUER (un lien mort pour une
// décoration manquante) ou JOUER AUTRE CHOSE (des cornes au-dessus d'un 111,
// c'est-à-dire un mensonge dessiné). La troisième est le repli sur le plus
// neutre — on montre la démonstration, sans la costumer.
//
// ★ Le repli est fait à la LECTURE **et** à l'ÉCRITURE, sans quoi l'aller-retour
// mentirait : `ecrire({registre:'scenique', cible:'111'})` rend `so!`, et
// relire `so!` rend « sobre ». Une forme canonique, une seule lecture.
// `lecture.registreDemande` conserve ce que le lien portait, pour qui voudrait
// le dire à l'écran — mais le site ne l'affiche pas : ce n'est pas une erreur
// du visiteur, c'est un décor que nous n'avons pas encore dessiné.
//
// Le principe de fond : **l'URL transporte le programme, pas un rang**. Un rang
// est le résultat d'un calcul ; le publier revient à publier un pointeur vers
// une structure mutable, et les liens cassent à la première évolution du
// catalogue. Ici un lien est rejouable sans recherche.

import { encoderTexte, decoderTexte, estBase58, LIMITE_SAISIE } from './base58.js';
import { normaliserCatalogue } from './bfs.js';
import { lireCible, normaliserCible, CIBLE_DEFAUT, MAX_CHIFFRES } from './cible.js';

/**
 * La grammaire d'un code (CONTRACTS §4.1) : lettre de famille, corps parlant en
 * minuscules et chiffres, majuscule de variante facultative (`m14F`).
 *
 * ⚠ Recopiée depuis `moteur/transformations/commun.js`, et **pas importée** :
 * `src/recherche` ne connaît le catalogue que par injection, c'est ce qui lui
 * permet d'être testé sur un catalogue de fantaisie. Le prix de ce découpage
 * est cette copie ; il est payé par un test qui exige les trois écritures
 * identiques (`url.test.js`), plutôt que par une dépendance qui les
 * réconcilierait en cassant l'injection.
 */
export const RE_CODE = /^[ftnmcpj][0-9a-z]+[A-Z]?$/;
const RE_PORTEE = /^(\d+)\.(\d+)$/;
const RE_RESONANCE = /^[×xX*](\d+)$/;
const RE_RANGS = /^\d+(\+\d+)*$/;

/**
 * Les deux registres de mise en scène, et le mot qui les écrit dans l'URL.
 *
 * ★ **`so!` et `sce!`, abrégés.** Le premier jet écrivait « sobre » et
 * « scenique » en toutes lettres, au nom de la lisibilité. L'auteur a tranché
 * dans l'autre sens, et son argument est meilleur que le mien : « l'URL reste
 * essentiellement cryptique et ça participe à l'effet de surprise ». Le reste
 * de la grammaire est déjà illisible — `0.1:fatb+tca+m14` —, et un seul mot clair
 * au milieu ne rendait pas le lien compréhensible : il annonçait juste, à qui
 * reçoit le lien, qu'il y a quelque chose à voir. Trois lettres suffisent à
 * distinguer les deux registres sans rien divulguer.
 *
 * Sans accent, comme tout le reste de la grammaire : une URL accentuée
 * s'échappe en `%C3%A9` dès qu'une messagerie la touche.
 *
 * ★ Les identifiants INTERNES (`'sobre'`, `'scenique'`) ne changent pas : c'est
 * du code, il se lit. Seul le mot écrit dans l'URL est abrégé.
 */
export const REGISTRES = Object.freeze(['sobre', 'scenique']);

/** Le mot de chaque registre dans l'URL. */
const MOT_URL = Object.freeze({ sobre: 'so', scenique: 'sce' });

/**
 * Le registre appliqué à un lien qui n'en porte pas — voir l'en-tête.
 * ★ **`sobre`**, depuis que la mise en scène s'opte au lieu de se subir.
 */
export const REGISTRE_DEFAUT = 'sobre';

/**
 * ★ QUELLES CIBLES ONT UNE MISE EN SCÈNE — une seule, aujourd'hui.
 *
 * Le décor du verdict est celui du 666 : les cornes de diable, dérivées de la
 * police et calées au flanc du 6 (`visuel/primitives/horns.js`), émises par
 * l'opérateur `m36`. L'auteur a décrit un emblème par cible — une auréole pour
 * 111, un jackpot pour 777, un fer à cheval ou une bouse pour 13, une référence
 * à James Bond pour 007, un trou noir, une faux ou deux dés pour 000 — et a
 * demandé de les REMETTRE À PLUS TARD (`.planning/A-VENIR-cibles.md`).
 *
 * Tant qu'ils ne sont pas dessinés, les autres cibles n'ont rien à mettre en
 * scène, et le dire ici est ce qui permet au repli d'être une règle et non une
 * suite de cas particuliers : le jour où l'auréole existe, une ligne change.
 */
export const miseEnSceneDisponible = (cible) => normaliserCible(cible).defaut;

/**
 * Le registre RÉELLEMENT joué pour une cible — le demandé, ou « sobre » quand
 * ce qu'on demande n'existe pas encore pour cette cible.
 */
export function registreEffectif(registre, cible) {
  const r = REGISTRES.includes(registre) ? registre : REGISTRE_DEFAUT;
  if (r === 'sobre') return 'sobre';
  return miseEnSceneDisponible(cible) ? r : 'sobre';
}

/** Les registres qu'une cible sait offrir — un seul bouton quand elle n'en a qu'un. */
export const registresDisponibles = (cible) =>
  (miseEnSceneDisponible(cible) ? REGISTRES : ['sobre']);

/**
 * ★ La forme longue est encore LUE, jamais écrite.
 *
 * Elle n'aura vécu qu'une version — la 1.2.0, publiée quelques heures —, mais
 * les liens de cette fenêtre-là existent. Les relire coûte deux alternatives
 * dans une expression rationnelle ; les casser coûterait un lien mort à qui
 * s'en est servi. `ecrire()` ne produit plus que la forme brève, et
 * `canoniser()` réécrit la barre d'adresse : un vieux lien se corrige tout seul
 * dès qu'on l'ouvre.
 */
const RE_REGISTRE = /^(so|sce|sobre|scenique)!/;

/**
 * Le marqueur de CIBLE — `c111!`, `c007!`, `c13!`.
 *
 * Il n'est pas borné à `MAX_CHIFFRES` ici : une suite de dix chiffres est
 * bien un marqueur de cible, simplement une cible ILLISIBLE, et il vaut mieux
 * le dire (bandeau + repli sur la page de résultats, §4.3) que la laisser
 * passer pour un fragment et échouer plus loin sur « code inconnu ».
 */
const RE_CIBLE = /^c([0-9]+)!/;

/** Le mot lu dans l'URL → l'identifiant interne. */
const REGISTRE_DU_MOT = Object.freeze({
  so: 'sobre', sce: 'scenique', sobre: 'sobre', scenique: 'scenique',
});

/**
 * @typedef {Object} FragmentUrl
 * @property {{offset:number,longueur:number}|null} portee
 * @property {number|null} resonance   nombre d'occurrences si abrégé `×3:`
 * @property {string[]} codes
 *
 * @typedef {Object} LectureUrl
 * @property {'canonique'|'heritee'|'resultats'|'invalide'} forme
 * @property {string|null} saisie
 * @property {FragmentUrl[]|null} fragments
 * @property {'sobre'|'scenique'|null} registre  résolu ; `null` hors forme canonique
 * @property {boolean} registreEcrit  le lien le portait-il en toutes lettres ?
 * @property {import('./cible.js').Cible} cible  la suite visée ; `666` par défaut
 * @property {boolean} cibleEcrite  le lien portait-il un marqueur `c…!` ?
 * @property {number[]|null} rangs
 * @property {string|null} bandeau     message à afficher (jamais silencieux)
 * @property {string|null} raison
 */

/**
 * Lecture tolérante du fragment d'URL.
 * Un lien ne renvoie JAMAIS silencieusement vers une autre démonstration :
 * soit il rejoue exactement, soit il l'annonce.
 *
 * @param {string} hash          `location.hash` (avec ou sans `#` initial)
 * @param {{catalogue?:Object}} [options]
 * @returns {LectureUrl}
 */
export function lire(hash, options = {}) {
  const vide = {
    forme: 'invalide', saisie: null, fragments: null,
    registre: null, registreEcrit: false,
    cible: CIBLE_DEFAUT, cibleEcrite: false, registreDemande: null,
    rangs: null, bandeau: null, raison: null,
  };
  if (typeof hash !== 'string') return { ...vide, raison: 'hash absent' };

  let brut = hash;
  try { brut = decodeURIComponent(hash); } catch { /* on garde la forme brute */ }
  if (brut.startsWith('#')) brut = brut.slice(1);
  if (brut === '') return { ...vide, forme: 'resultats', saisie: null };

  const parts = brut.split('#');
  if (parts.length !== 2) {
    return { ...vide, raison: 'format inconnu', bandeau: BANDEAUX.formatInconnu };
  }
  let [approche, b58] = parts;

  // ★ Les MARQUEURS se détachent AVANT tout le reste : ils préfixent l'approche
  //   entière, ils n'appartiennent à aucun fragment. Deux existent — le
  //   registre de mise en scène et la cible —, et la boucle les accepte dans
  //   L'UN OU L'AUTRE ORDRE.
  //
  //   ★ Pourquoi tolérer les deux ordres alors qu'on n'en écrit qu'un. Ce sont
  //   deux marqueurs indépendants, portant sur deux choses sans rapport (ce
  //   qu'on démontre, comment on le montre) : rien dans la grammaire ne fonde
  //   une préséance, et un lien recopié à la main dans le mauvais ordre serait
  //   refusé pour une raison que personne ne pourrait deviner. `ecrire()` en
  //   fixe UN — registre puis cible —, et `canoniser()` réécrit la barre
  //   d'adresse : la forme canonique reste unique, la lecture reste indulgente.
  //   C'est exactement la doctrine de §4.3.
  //
  //   Le registre absent vaut « scénique » (règle de lecture héritée, voir
  //   l'en-tête) ; la cible absente vaut 666 (la promesse du site).
  let registre = REGISTRE_DEFAUT;
  let registreEcrit = false;
  let cible = CIBLE_DEFAUT;
  let cibleEcrite = false;
  for (;;) {
    const mReg = registreEcrit ? null : RE_REGISTRE.exec(approche);
    if (mReg) {
      registre = REGISTRE_DU_MOT[mReg[1]];
      registreEcrit = true;
      approche = approche.slice(mReg[0].length);
      continue;
    }
    const mCib = cibleEcrite ? null : RE_CIBLE.exec(approche);
    if (mCib) {
      const lue = lireCible(mCib[1]);
      // Une cible illisible — plus de `MAX_CHIFFRES` signes — n'est pas repliée
      // en silence sur 666 : le lien promettait autre chose, et §4.3 interdit
      // de renvoyer sans le dire vers une autre démonstration.
      if (!lue) {
        return { ...vide, raison: `cible illisible : ${mCib[1]}`, bandeau: BANDEAUX.cibleIllisible };
      }
      cible = lue;
      cibleEcrite = true;
      approche = approche.slice(mCib[0].length);
      continue;
    }
    break;
  }

  if (!estBase58(b58)) {
    return { ...vide, raison: 'saisie base58 invalide', bandeau: BANDEAUX.lienIllisible };
  }
  const saisie = decoderTexte(b58);
  if (saisie === null) {
    return { ...vide, raison: 'saisie base58 illisible', bandeau: BANDEAUX.lienIllisible };
  }
  if (saisie.length > LIMITE_SAISIE) {
    return { ...vide, saisie, raison: 'saisie trop longue', bandeau: BANDEAUX.saisieTropLongue };
  }

  if (approche === '') {
    // `sobre!` tout seul ne désigne aucune démonstration : un marqueur de mise
    // en scène sans programme à mettre en scène est un lien tronqué, pas une
    // page de résultats. On le dit plutôt que de retomber en silence — §4.3.
    if (registreEcrit) {
      return { ...vide, saisie, raison: 'registre sans programme', bandeau: BANDEAUX.formatInconnu };
    }
    // ★ La CIBLE, elle, a parfaitement sa place sur une page de résultats — et
    //   c'est même le lien que la page de listing doit savoir écrire quand on
    //   lui demande de viser autre chose. `#c111!#…` est la liste des voies
    //   menant à 111, exactement comme `##…` est celle des voies menant à 666.
    //   La différence avec le registre n'est pas un caprice : le registre dit
    //   comment MONTRER une démonstration, et une liste n'en montre aucune ;
    //   la cible dit ce qu'on CHERCHE, et une liste est le résultat d'une
    //   recherche.
    return {
      forme: 'resultats', saisie, fragments: null,
      registre: null, registreEcrit: false,
      cible, cibleEcrite,
      rangs: null, bandeau: null, raison: null,
    };
  }

  // Forme héritée du README : des rangs, pas un programme.
  if (RE_RANGS.test(approche)) {
    return {
      forme: 'heritee',
      saisie,
      fragments: null,
      // Une forme héritée relance la recherche : elle n'aboutit pas à une
      // démonstration mais à un rang du classement courant, et c'est ce rang
      // qui apportera son propre lien canonique — registre compris.
      registre: null,
      registreEcrit: false,
      // La cible, elle, SURVIT au recalcul : elle dit ce qu'on cherche, pas
      // quelle ligne du classement on voulait. `#c111!3#…` relance donc bien
      // la recherche de 111 et va au troisième rang de CETTE liste.
      cible,
      cibleEcrite,
      rangs: approche.split('+').map(Number),
      bandeau: BANDEAUX.recalculee,
      raison: null,
    };
  }

  const fragments = [];
  for (const brutFrag of approche.split(',')) {
    const f = lireFragment(brutFrag);
    if (!f) return { ...vide, saisie, raison: `fragment illisible : ${brutFrag}`, bandeau: BANDEAUX.formatInconnu };
    fragments.push(f);
  }

  if (options.catalogue) {
    const connus = new Set(normaliserCatalogue(options.catalogue).map((o) => o.code));
    for (const f of fragments) {
      for (const c of f.codes) {
        if (!connus.has(c)) {
          return { ...vide, saisie, raison: `code inconnu : ${c}`, bandeau: BANDEAUX.codeInconnu };
        }
      }
    }
  }

  return {
    forme: 'canonique', saisie, fragments,
    // ★ Le registre rendu est celui qu'on JOUERA, pas celui qu'on a lu : un
    //   `sce!` sur une cible sans emblème retombe sur « sobre » (voir
    //   l'en-tête). Ce qui était écrit reste lisible dans `registreDemande`.
    registre: registreEffectif(registre, cible),
    registreDemande: registre,
    registreEcrit, cible, cibleEcrite,
    rangs: null, bandeau: null, raison: null,
  };
}

function lireFragment(brut) {
  if (!brut) return null;
  let portee = null;
  let resonance = null;
  let programme = brut;
  const i = brut.indexOf(':');
  if (i >= 0) {
    const tete = brut.slice(0, i);
    programme = brut.slice(i + 1);
    const mp = RE_PORTEE.exec(tete);
    const mr = RE_RESONANCE.exec(tete);
    if (mp) portee = { offset: Number(mp[1]), longueur: Number(mp[2]) };
    else if (mr) resonance = Number(mr[1]);
    else return null;
  }
  if (!programme) return null;
  const codes = programme.split('+');
  if (!codes.length || !codes.every((c) => RE_CODE.test(c))) return null;
  return { portee, resonance, codes };
}

export const BANDEAUX = {
  recalculee: 'Démonstration recalculée : ce lien désigne des rangs, pas une méthode.',
  codeInconnu: 'Ce lien emploie une règle que cette version ne connaît pas.',
  cibleIllisible: `Ce lien vise une suite que le moteur ne sait pas viser : au plus ${MAX_CHIFFRES} chiffres.`,
  formatInconnu: 'Ce lien a été créé par une autre version du site.',
  lienIllisible: 'Ce lien est illisible : la saisie n’a pas pu être décodée.',
  // Seul bandeau du moteur : le filet de sécurité temporel a mordu. Le
  // classement rendu n'est alors PAS reproductible — il dépend de la charge de
  // la machine — et le contrat §4.3 interdit de laisser varier un rang en
  // silence. Traduit, parce qu'il s'affiche via `localiser()` côté interface.
  rechercheTronquee: {
    fr: 'Recherche écourtée : cette machine a manqué de temps, la liste ci-dessous '
      + 'est partielle et ses rangs ne sont pas reproductibles. Les liens de partage, eux, '
      + 'restent exacts : ils transportent la méthode, pas le rang.',
    en: 'Search cut short: this machine ran out of time, so the list below is partial and '
      + 'its ranks are not reproducible. Share links remain exact: they carry the method, '
      + 'not the rank.',
  },
  saisieTropLongue: `Ce lien dépasse le plafond de ${LIMITE_SAISIE} caractères.`,
};

// ══════════════════════════════════ écriture canonique

/**
 * ★ Le registre est écrit EN TOUTES LETTRES, même quand il vaut le défaut.
 *
 * Un lien qui se tait sur sa mise en scène dépend d'une règle de lecture, et
 * une règle de lecture peut être discutée, oubliée, ou lue de travers dix ans
 * plus tard. Trois caractères achètent une chose : plus jamais de lien ambigu.
 * Et le registre écrit est celui qu'on JOUERA — replié sur « sobre » si la
 * cible n'a pas d'emblème —, de sorte que relire ce qu'on vient d'écrire rende
 * exactement ce qu'on a écrit.
 *
 * La page de RÉSULTATS, elle, n'en porte pas : elle ne montre aucune
 * démonstration, il n'y a rien à mettre en scène.
 *
 * ★ La CIBLE, elle, n'est écrite QUE si elle diffère de 666 — voir l'en-tête.
 * Et elle est écrite même sans programme : `#c111!#…` désigne la LISTE des
 * voies menant à 111, qui est précisément le lien que la page de listing doit
 * pouvoir partager quand on lui a demandé de viser autre chose.
 *
 * @param {{saisie:string, fragments?:FragmentUrl[], registre?:'sobre'|'scenique',
 *          cible?:import('./cible.js').Cible|string}} demonstration
 * @returns {string} le fragment d'URL complet, `#…#…`
 */
export function ecrire({ saisie, fragments, registre, cible }) {
  const b58 = encoderTexte(saisie);
  const c = marqueurCible(cible);
  if (!fragments || !fragments.length) return `#${c}#${b58}`;
  return `#${marqueur(registre, cible)}${c}${ecrireApproche(fragments)}#${b58}`;
}

/** Le préfixe de registre, normalisé — et REPLIÉ sur ce que la cible sait jouer,
 *  faute de quoi l'aller-retour mentirait (voir l'en-tête). */
function marqueur(registre, cible) {
  return `${MOT_URL[registreEffectif(registre, cible)]}!`;
}

/** Le préfixe de cible — vide au défaut, `c111!` sinon. */
function marqueurCible(cible) {
  const c = normaliserCible(cible);
  return c.defaut ? '' : `c${c.texte}!`;
}

/**
 * Le registre OPPOSÉ — l'autre bouton du panneau de voie.
 *
 * ★ Sur une cible sans emblème, il n'y a pas d'autre registre : la bascule
 * rendrait un lien identique à celui d'où l'on vient, donc un bouton qui ne
 * fait rien. On rend alors `null`, et l'interface n'affiche pas le bouton
 * (`registresDisponibles` dit la même chose sous l'autre forme).
 */
export function autreRegistre(registre, cible = CIBLE_DEFAUT) {
  if (!miseEnSceneDisponible(cible)) return null;
  return registre === 'sobre' ? 'scenique' : 'sobre';
}

export function ecrireApproche(fragments) {
  return fragments.map(ecrireFragment).join(',');
}

function ecrireFragment(f) {
  const programme = f.codes.join('+');
  if (f.resonance) return `×${f.resonance}:${programme}`;
  if (f.portee) return `${f.portee.offset}.${f.portee.longueur}:${programme}`;
  return programme;
}

/**
 * Traduit une approche notée en descripteurs d'URL.
 * Applique l'abréviation de résonance quand les 3 programmes sont identiques.
 * @param {Object} approche
 * @param {{nbJetons?:number}} [ctx]
 * @returns {FragmentUrl[]}
 */
export function descripteursDe(approche, ctx = {}) {
  const parts = approche.parts.map((p) => ({
    codes: p.chemin.ops.map((o) => o.code),
    fragment: p.fragment,
  }));
  const memeProgramme = parts.length === 3
    && parts.every((p) => p.codes.join('+') === parts[0].codes.join('+'));

  if (approche.resonance && memeProgramme) {
    return [{ portee: null, resonance: parts.length, codes: parts[0].codes }];
  }
  return parts.map((p) => ({
    portee: porteeDe(p.fragment, ctx),
    resonance: null,
    codes: p.codes,
  }));
}

function porteeDe(fragment, ctx) {
  if (!fragment) return null;
  const nb = ctx.nbJetons ?? -1;
  if (fragment.tokenDebut === 0 && (fragment.tokenLong === nb || fragment.famille === 'entier')) return null;
  if (fragment.tokenDebut < 0 || fragment.tokenLong < 0) return null;
  return { offset: fragment.tokenDebut, longueur: fragment.tokenLong };
}

/**
 * Réécrit la barre d'adresse en forme canonique, sans empiler d'historique.
 * L'utilisateur qui copie l'URL copie un lien permanent sans avoir à le savoir.
 */
export function canoniser(demonstration, portee = globalThis) {
  const frag = ecrire(demonstration);
  const h = portee && portee.history;
  const loc = portee && portee.location;
  if (!h || typeof h.replaceState !== 'function' || !loc) return frag;
  if (loc.hash === frag) return frag;
  h.replaceState(null, '', (loc.pathname || '') + (loc.search || '') + frag);
  return frag;
}
