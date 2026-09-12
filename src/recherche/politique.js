// src/recherche/politique.js
// LA POLITIQUE DE RECHERCHE — ce qu'on s'autorise selon le PROFIL de la cible.
//
// > « Sur le garde-fou du tri et d'autres, je pense qu'il faudrait pouvoir
// >   filtrer/paramétrer la recherche : cible 666 : les optimisations associées
// >   sont activées ; cible à plusieurs chiffres identiques : les optimisations
// >   qui favorisent les assemblages homogènes ; cible en chiffres, hétérogène :
// >   optimisations/filtres différents ; cible en lettres : méthodes
// >   différentes. » (l'auteur)
//
// ── CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS ─────────────────────────────
//
// Il ne calcule rien et ne cherche rien. Il RÉPOND, pour un profil
// (`cible.js › profilDeCible`), aux questions que la recherche se posait
// jusqu'ici en relisant la cible à treize endroits, chacun à sa façon :
// « le joker a-t-il cours ? », « la liaison s'applique-t-elle ? », « la
// résonance a-t-elle un sens ? », « la moisson doit-elle suivre un motif ? ».
//
// ★ **LA FRONTIÈRE, ET C'EST TOUT L'OBJET DU MODULE.**
//
//   · Le MOTEUR a le droit de connaître la CIBLE : un opérateur qui adapte sa
//     règle à ce qu'on vise (`commun.js › selonLaCible`) énonce un fait sur la
//     cible — « ce paquet ne peut pas écrire ce chiffre-là ». Il n'a pas le
//     droit de savoir QUI l'applique ni dans quelle passe : ce serait le moteur
//     qui dépend de la recherche (CONTRACTS §1).
//   · La RECHERCHE, elle, décide de la POLITIQUE : quels opérateurs sont
//     admis, combien de sièges, quels modes, quelles passes, quels budgets.
//     C'est ici.
//
// ★ **À COMPORTEMENT CONSTANT, ET VÉRIFIABLE.** Chaque réponse ci-dessous est
//   l'expression qui était écrite à l'endroit qu'elle remplace, au caractère
//   près. Le déplacement ne change donc aucune liste — ce qu'un test gèle
//   (`tests/politique.test.js`, `politique(666)` champ par champ) et que
//   l'instantané des cibles chiffrées juge en appel.
//
// ⚠️ **UNE POLITIQUE SE LIT SUR LES FAITS, PAS SUR L'ÉTIQUETTE.** `profil.classe`
//   nomme les cinq cas de l'auteur pour les rapports ; les réponses, elles, se
//   calculent sur `nature`, `defaut`, `homogene`, `longue`. Une cible de VALEURS
//   homogène — la cible sous-jacente d'un mot relu par les rangs — n'est ni
//   « 666 » ni « chiffres hétérogène », et un `switch` sur l'étiquette l'aurait
//   rangée dans la mauvaise boîte sans qu'on le voie.

/**
 * @typedef {Object} Politique
 * @property {boolean} joker            le terminateur français a-t-il cours ? (§5.3)
 * @property {boolean} reponsesDediees  les réponses écrites d'avance (666 seulement)
 * @property {boolean} liaison          deux mots réunis par une division (`mdl*`)
 * @property {boolean} resonance        le même programme sur un motif répété
 * @property {boolean} moissonDuMotif   la moisson suit-elle un MOTIF, ou compte-t-elle ?
 * @property {boolean} siegeParChiffre  une portée réserve-t-elle un siège par chiffre visé ?
 * @property {boolean} tolereLesSuppressions  les suppressions en fin de chemin
 * @property {boolean} parRelectures    la cible se cherche-t-elle par ses relectures ?
 */

/** Mémoïsée par profil : une politique est une fonction pure de six faits. */
const VUES = new Map();

/**
 * La politique d'un profil de cible.
 * @param {{classe:string, nature:string, longueur:number, homogene:boolean,
 *   defaut:boolean, longue:boolean}} profil
 * @returns {Politique}
 */
export function politique(profil) {
  if (!profil || typeof profil !== 'object' || typeof profil.nature !== 'string') {
    throw new Error('politique : un profil de cible est attendu (`cible.js › profilDeCible`)');
  }
  const cle = `${profil.nature}|${profil.defaut}|${profil.homogene}|${profil.longue}`;
  const vue = VUES.get(cle);
  if (vue) return vue;
  const p = Object.freeze({
    // ★ Le JOKER et les RÉPONSES DÉDIÉES sont des promesses du 666, pas des
    //   méthodes : « nous avons vérifié : 666 ne vaut pas 666 » n'a rien de
    //   drôle au-dessus d'une liste qui vise 111 (`index.js`, `approcheJoker`).
    joker: profil.defaut,
    reponsesDediees: profil.defaut,
    // ★ La LIAISON pose une potence : elle écrit des chiffres, et rien d'autre.
    //   Jamais pour 666 — chaque recherche en paierait la table —, jamais pour
    //   un texte ni pour une suite de VALEURS, que le quotient ne sait pas viser.
    liaison: !profil.defaut && profil.nature === 'chiffres',
    // ★ La RÉSONANCE exige une cible homogène, et ce n'est pas une limite
    //   d'implémentation : le même programme sur le même texte rend le même
    //   chiffre, il ne peut donc pas écrire `007`.
    resonance: profil.homogene,
    // ★ La MOISSON compte les chiffres utiles sur une cible homogène — compter
    //   et écrire y sont la même chose — et suit le MOTIF sinon : vingt-deux 1
    //   ne font pas `01111984`.
    moissonDuMotif: !profil.homogene,
    // ★ Un siège par chiffre demandé n'a de sens que si la cible en demande
    //   plusieurs : sur une cible homogène, la réservation désigne le premier
    //   de la liste, qui y était déjà.
    siegeParChiffre: !profil.homogene,
    // ★ Le refus des suppressions en fin de chemin ne mord PAS sur une cible
    //   homogène (`elegance.js › elagueALaFin`) : c'est là que le joker existe,
    //   et les deux ne doivent pas se croiser.
    tolereLesSuppressions: profil.homogene,
    // ★ Un TEXTE ne se cherche pas : ce sont ses relectures qui se cherchent.
    parRelectures: profil.nature === 'mot',
  });
  VUES.set(cle, p);
  return p;
}
