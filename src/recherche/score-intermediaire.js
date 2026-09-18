/**
 * ★ **LE SCORE INTERMÉDIAIRE — ce que les curseurs disent d'une voie avant
 *   qu'elle soit assemblée, et combien de sièges ils lui accordent.**
 *
 * > « Idéalement, c'est les curseurs qui priorisent quelles voies méritent
 * >   d'être finalisées, donc il faudrait inclure du score intermédiaire pondéré
 * >   pour arbitrer ça. Si l'exhaustivité prime au score, alors les voies
 * >   recherchées sont celles qui maximisent l'exhaustivité. Si la simplicité
 * >   prime au score, alors les voies courtes/simples sont celles qui sont
 * >   recherchées en priorité… Le nombre de sièges en cours de recherche
 * >   devrait donc être dynamique en fonction des critères de recherche. »
 * >   (l'auteur)
 *
 * ── LE DÉFAUT QUI A MENÉ ICI, MESURÉ ─────────────────────────────────────
 *
 * Sur « Le jardin sur le rocher de la maison », `fart+fprp+tm+mlm` — sans
 * articles ni préposition, « jardin rocher maison », `6 6 6` — vaut 7 317 points
 * au barème, le meilleur des voies à une série. Elle était ABSENTE de la liste
 * aux crans 0, 1 et 2, et le barème n'y était pour rien : il ne la voyait
 * jamais. La réserve de qualité de `assemblage.js › vecteursDeSix` décidait
 * avant lui, par un pré-tri LEXICOGRAPHIQUE — ficelles, netteté, jetons lus,
 * longueur —, et le troisième critère comptait des JETONS : `tm` en rend trois
 * (trois mots), `tca` vingt-neuf (vingt-neuf lettres). Un seul jeton de moins
 * suffisait à la reléguer quel que soit le reste ; elle sortait 14ᵉ sur 16, et
 * la coupe à huit par fragment faisait le reste.
 *
 * ── LA VARIANTE SUIVIE : LE « REPLI » (`score-v2.js`) ─────────────────────
 *
 * Des quatre pistes du score v2, c'est celle que l'auteur a fait itérer : ses
 * trois arbitrages (« pousser l'exhaustivité drastiquement », « `meg` une
 * fois », puis la perte selon sa cause et « peut-être concave 80 suffira ») ont
 * été appliqués au repli, et à lui seul (`.planning/banc/score-v2-comparatif.md`,
 * itérations 2 à 4). Le comparatif en recommande la STRUCTURE — une seule mesure
 * par chose, les critères du moteur rangés par axe — et l'ARITHMÉTIQUE entre les
 * axes, « parce que c'est ce que le lecteur voit ».
 *
 * C'est aussi la seule qui se laisse calculer ICI sans rien inventer : elle
 * replie des critères qui existent déjà (`score.js › critereConcision`,
 * `critereNotoriete`, `critereAntiAdHoc`, `critereElegance`), et ceux-là se
 * lisent sur un chemin seul. La piste géométrique demanderait une racine S-ième
 * en BigInt par candidat ; la piste « produit » tient ses constantes d'une
 * descente sur des approches finies ; la piste « cap » repart de zéro — aucune
 * des trois n'a été choisie par l'auteur.
 *
 * ── CE QU'UN CHEMIN SEUL PERMET DE SAVOIR, AXE PAR AXE ────────────────────
 *
 *  · SIMPLICITÉ — la brièveté C, sur la longueur que le moteur FACTURE
 *    (`longueurRendue` : `tca` gratuit, les retraits grammaticaux en remise).
 *    L'unité de méthode H, qui la complète dans le repli, vaut 1 000 pour tous
 *    les candidats d'un fragment — un seul chemin, une seule méthode.
 *  · EXHAUSTIVITÉ — la LECTURE (caractères signifiants réellement lus) et le
 *    RENDEMENT (ce que le verdict gardera du vecteur), à parts égales comme dans
 *    le repli (400 / 400). Les « pertes en route » du barème ne se lisent que
 *    sur une approche notée : elles ne sont pas devinées ici.
 *  · COHÉRENCE — familiarité N, absence de bidouille A, lisibilité des nombres
 *    E, aux poids du repli (200 / 120 / 100). La PROPRETÉ du barème se calcule
 *    sur une approche assemblée : elle n'est pas devinée non plus.
 *  · QUANTITÉ — elle n'entre PAS dans cette note, parce qu'elle a déjà sa
 *    file : le tri principal de `vecteursDeSix` range par compte de 6. Le
 *    curseur de quantité agit sur le PARTAGE des sièges (`partDesSieges`), pas
 *    sur l'ordre de la réserve — sans quoi il serait compté deux fois.
 *
 * ★ **UNE CONSTANTE COMMUNE À TOUS LES CANDIDATS N'ENTRE PAS DANS UN AXE.** H
 *   vaut 1 000 partout, et le garder dans la simplicité (150·C + 250·H) / 400
 *   ne changerait rien au classement… sauf à diviser par 2,7 le poids que le
 *   visiteur a donné au curseur. Un curseur de simplicité à 200 qui pèserait
 *   comme un curseur à 75 serait un curseur qui ment. Même raison pour les
 *   pertes en route et la propreté : un terme qu'on ne connaît pas n'est pas
 *   remplacé par une valeur « neutre » qui diluerait les autres.
 *
 * ⚠️ **UNE SUPPRESSION ÉLÉGANTE RESTE UNE SUPPRESSION.**
 *
 *   > « Ça rentre dans les suppressions élégantes, et on est en train de tenter
 *   >   d'éradiquer les suppressions qui ne le sont pas. Pour autant, une
 *   >   suppression élégante reste une suppression et réduit l'exhaustivité. »
 *   >   (l'auteur)
 *
 *   Un caractère écarté par un filtre — fût-ce les articles, par une règle
 *   grammaticale nommée — n'est PAS lu, et se compte comme perdu, au même prix
 *   que tout autre. La voie `fart+fprp+tm+mlm` lit 18 lettres sur 29 et le
 *   paie : 539 de lecture sur la courbe concave. Ce qu'elle gagne, elle le
 *   gagne ailleurs — rendement plein, aucune bidouille, des nombres lisibles —,
 *   et c'est au visiteur, par ses curseurs, de dire si cela vaut la perte.
 *
 * ── DÉTERMINISME (§4.4) ──────────────────────────────────────────────────
 * Tout est entier, en pour-mille. La seule courbe non linéaire est celle du
 * repli (`score-v2.js › puissanceCentiemes`, une racine centième en BigInt par
 * dichotomie), tabulée ici sur ses 1 001 entrées possibles.
 */

import {
  critereConcision, longueurRendue, critereNotoriete, critereAntiAdHoc, critereElegance,
  nombresIntermediaires, CURSEURS, CURSEUR_DEFAUT, CURSEUR_MAX,
} from './score.js';
import { OPERATEURS_QUI_ECARTENT } from './elegance.js';
import { normaliserCible, seriesDe } from './cible.js';
import { puissanceCentiemes } from './score-v2.js';
import { MAX_SERIES } from '../config.js';

const MILLE = 1000;
const borner = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Les poids du repli, RECOPIÉS et gelés.
 *
 * ⚠️ Pas importés : `score-v2.js › REGLAGES` est un objet que le banc modifie
 *   (`configurer`) pour balayer ses réglages. Le lire d'ici aurait fait
 *   dépendre la RECHERCHE de ce que le banc vient de balayer — une mesure qui
 *   change ce qu'elle mesure. Seule la courbe, fonction pure, est partagée.
 */
export const REGLAGES = Object.freeze({
  // exhaustivité — `POIDS_LECTURE`, `POIDS_RENDEMENT` du repli
  POIDS_LECTURE: 400,
  POIDS_RENDEMENT: 400,
  /* ★ **LA COURBE DES PERTES : concave, exposant 80.** « Pousser
     l'exhaustivité drastiquement, la rendre bien plus punitive sur les
     premières pertes », puis : « concave, mais […] peut-être concave 80
     suffira » (l'auteur). Le banc a trouvé 80 au point d'équilibre (itération
     4 du comparatif). À 80, perdre 10 % coûte 16 %, perdre 38 % en coûte 46. */
  EXPOSANT_PERTE: 80,
  // cohérence — `POIDS_FAMILIARITE`, `POIDS_SANS_BIDOUILLE`, `POIDS_LISIBILITE` du repli
  POIDS_FAMILIARITE: 200,
  POIDS_SANS_BIDOUILLE: 120,
  POIDS_LISIBILITE: 100,
  /* ★ **UN SIÈGE POUR TROIS, AU DÉFAUT — le partage historique.** La réserve
     de qualité tenait un siège sur quatre, la quantité les trois autres : c'est
     ce que rend `partDesSieges` quand les quatre curseurs sont à 100. */
  SIEGES_DE_QUANTITE_PAR_SIEGE_DE_QUALITE: 3,
});

// La courbe concave, tabulée : 1 001 entrées au plus, chacune calculée une fois.
const _apres = new Map();
/** Ce qu'il reste après une perte (‰), sur la courbe concave : 1000 − 1000·(perte/1000)^e. */
export function apresPerte(perte) {
  const p = borner(perte | 0, 0, MILLE);
  let r = _apres.get(p);
  if (r === undefined) {
    r = MILLE - puissanceCentiemes(p, REGLAGES.EXPOSANT_PERTE);
    _apres.set(p, r);
  }
  return r;
}

const SIGNIFIANT = /[\p{L}\p{N}]/u;
const nbSignifiants = (s) => {
  let n = 0;
  for (const ch of String(s)) if (SIGNIFIANT.test(ch)) n++;
  return n;
};

/**
 * Les caractères signifiants que le chemin LIT : ceux de la dernière chaîne
 * avant la découpe. Un filtre qui écarte les articles les a écartés — ils ne
 * sont pas lus, quelle que soit la règle qui les écarte.
 *
 * ⚠️ Pas les JETONS : c'est exactement l'erreur que ce module répare. `tm`
 *   rend trois jetons pour dix-huit lettres, `tca` vingt-neuf pour vingt-neuf.
 */
function signifiantsLus(chemin) {
  let lus = null;
  for (const e of chemin.etats) {
    if (e.type === 'STR') lus = nbSignifiants(e.valeur);
    else break;
  }
  if (lus === null) throw new Error('score intermédiaire : un chemin de vecteur doit partir d’une chaîne');
  return lus;
}

/**
 * Le chemin lit-il TOUS les caractères signifiants du fragment ? — la lecture
 * sans perte de `axesIntermediaires`, en oui ou non (`assemblage.js ›
 * vecteursDeSix`, le siège de la voie courte qui lit tout).
 */
export function litTout(chemin, texte) {
  return signifiantsLus(chemin) >= nbSignifiants(texte);
}

/**
 * Le rendement du vecteur final : ce que le verdict en GARDERA, rapporté à ce
 * qu'on a calculé. Même lecture que `score.js › rendementSix` : pour ce qui
 * ÉCARTE (`mpf`, `m36`…), la ligne la plus large du chemin ; pour le reste, la
 * dernière — une absorption ne jette rien.
 */
function rendement(chemin, cbl) {
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin || fin.type !== 'NUMS' || !fin.valeur.length) {
    throw new Error('score intermédiaire : un chemin de vecteur doit finir sur un NUMS non vide');
  }
  let largeur = fin.valeur.length;
  if (chemin.ops.some((o) => o && o.id && OPERATEURS_QUI_ECARTENT.has(o.id))) {
    for (const e of chemin.etats) if (e.type === 'NUMS' && e.valeur.length > largeur) largeur = e.valeur.length;
  }
  const gardes = Math.min(seriesDe(fin.valeur, cbl).length, MAX_SERIES) * cbl.longueur;
  return borner(Math.floor((gardes * MILLE) / largeur), 0, MILLE);
}

/**
 * Les trois axes qu'un chemin seul permet d'estimer, en pour-mille.
 *
 * @param {Object} chemin  un chemin de `vecteursDeSix` (`ops`, `etats`)
 * @param {string} texte   le fragment lu
 * @param {*} [cible]
 * @returns {{simplicite:number, exhaustivite:number, coherence:number}}
 */
export function axesIntermediaires(chemin, texte, cible) {
  if (!chemin || !Array.isArray(chemin.ops) || !Array.isArray(chemin.etats) || !chemin.etats.length) {
    throw new Error('score intermédiaire : chemin illisible');
  }
  const cbl = normaliserCible(cible);
  const R = REGLAGES;

  const simplicite = critereConcision(longueurRendue([chemin]));

  const total = nbSignifiants(texte);
  const perteDeLecture = total > 0 ? MILLE - Math.floor((signifiantsLus(chemin) * MILLE) / total) : 0;
  const lecture = apresPerte(perteDeLecture);
  const garde = apresPerte(MILLE - rendement(chemin, cbl));
  const exhaustivite = Math.floor((R.POIDS_LECTURE * lecture + R.POIDS_RENDEMENT * garde)
    / (R.POIDS_LECTURE + R.POIDS_RENDEMENT));

  const ops = chemin.ops;
  const coherence = Math.floor((R.POIDS_FAMILIARITE * critereNotoriete(ops.length ? ops : [{ notoriete: 0 }])
    + R.POIDS_SANS_BIDOUILLE * critereAntiAdHoc(ops)
    + R.POIDS_LISIBILITE * critereElegance(nombresIntermediaires(chemin)))
    / (R.POIDS_FAMILIARITE + R.POIDS_SANS_BIDOUILLE + R.POIDS_LISIBILITE));

  return { simplicite, exhaustivite, coherence };
}

/**
 * La note de la réserve : la moyenne des trois axes, pondérée par les trois
 * curseurs qui les nomment. Rien d'autre — pas de rang, pas de préséance.
 *
 * Trois curseurs à zéro : il n'y a rien à pondérer, la note vaut zéro pour tout
 * le monde, et `partDesSieges` ne donne de toute façon aucun siège à la réserve.
 *
 * @param {{simplicite:number, exhaustivite:number, coherence:number}} axes
 * @param {{simplicite:number, exhaustivite:number, coherence:number}} curseurs  positions normalisées
 */
export function noteDeQualite(axes, curseurs) {
  const s = curseurs.simplicite;
  const e = curseurs.exhaustivite;
  const c = curseurs.coherence;
  const poids = s + e + c;
  if (poids === 0) return 0;
  return Math.floor((s * axes.simplicite + e * axes.exhaustivite + c * axes.coherence) / poids);
}

/**
 * ★ **LE PARTAGE DES SIÈGES — la part de la réserve, en fraction entière.**
 *
 * Deux files se partagent les sièges d'un fragment : la QUANTITÉ (le tri
 * principal, par compte de 6) et la QUALITÉ (la réserve, par `noteDeQualite`).
 * Leur rapport suit les curseurs : la moyenne des trois curseurs de qualité
 * contre le curseur de quantité, trois fois — un siège pour trois au défaut,
 * le partage historique au siège près.
 *
 *     part de la réserve = (s + e + c) / (s + e + c + 9·q)
 *
 *   · défaut (100 partout)  → 300 / 1 200 = 1/4 — un siège sur quatre, comme avant ;
 *   · simplicité à 200      → 400 / 1 300 ≈ 31 % ;
 *   · quantité à 200        → 300 / 2 100 = 1/7 ;
 *   · quantité à 0          → tout à la réserve : le compte ne réclame plus rien ;
 *   · les trois autres à 0  → rien à la réserve : seul le compte a été demandé.
 *
 * ★ Tout ce qui compte est la PROPORTION : quatre curseurs à 200 donnent la
 *   même part que quatre à 100, comme les pourcentages affichés à côté d'eux.
 *
 * ★ Les quatre à zéro, et seulement eux, ne disent rien : on garde le partage
 *   du défaut plutôt que d'en inventer un. C'est le seul repli, et il est dit —
 *   même doctrine que `score.js › ponderer`.
 *
 * @param {{simplicite:number, exhaustivite:number, quantite:number, coherence:number}} curseurs  positions normalisées
 * @returns {{num:number, den:number}}
 */
export function partDesSieges(curseurs) {
  // ⚠️ Des positions qui n'ont pas traversé `normaliserCurseurs` sont une faute
  //   de l'appelant, pas un réglage : on refuse, on ne corrige pas.
  for (const cle of CURSEURS) {
    const v = curseurs && curseurs[cle];
    if (!Number.isInteger(v) || v < 0 || v > CURSEUR_MAX) {
      throw new Error(`partage des sièges : positions non normalisées (${JSON.stringify(curseurs)})`);
    }
  }
  const k = REGLAGES.SIEGES_DE_QUANTITE_PAR_SIEGE_DE_QUALITE;
  const qualite = curseurs.simplicite + curseurs.exhaustivite + curseurs.coherence;
  const quantite = 3 * k * curseurs.quantite; // 3 curseurs de qualité, k sièges par siège
  if (qualite + quantite === 0) {
    const d = CURSEUR_DEFAUT;
    return { num: 3 * d, den: 3 * d + 3 * k * d };
  }
  return { num: qualite, den: qualite + quantite };
}

/**
 * Le k-ième siège (à partir de 1) revient-il à la réserve ? Répartition de
 * Bresenham : la réserve reçoit un siège chaque fois que sa part cumulée
 * franchit un entier. À 1/4, ce sont les sièges 4, 8, 12… — exactement le
 * « un siège sur quatre, le quatrième » d'avant, et donc un siège sur quatre
 * dans TOUT préfixe de la liste, ce qui compte : l'assemblage n'en garde que la
 * première moitié.
 */
export function siegeDeQualite(k, part) {
  return Math.floor((k * part.num) / part.den) > Math.floor(((k - 1) * part.num) / part.den);
}

/** Combien de sièges la réserve peut occuper sur `plafond` — au moins un dès qu'elle a une part. */
export function reserveDeQualite(plafond, part) {
  if (part.num === 0) return 0;
  return Math.max(1, Math.floor((plafond * part.num) / part.den));
}
