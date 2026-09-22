/**
 * PLACER DES OBJETS LARGES AU-DESSUS D'OBJETS ÉTROITS — le solveur des
 * afficheurs à segments.
 *
 * > « En Simultané il en faut un par caractère à convertir, posé près du
 * >   caractère concerné. Les afficheurs ne se superposent JAMAIS entre eux ;
 * >   aucun ne sort de la zone d'affichage. Si la place manque, il faut dégrader
 * >   proprement (réduire l'échelle, ou retomber sur des vagues successives)
 * >   plutôt que déborder. » (l'auteur)
 *
 * ## ★ LE PROBLÈME EST GÉOMÉTRIQUE, ET IL N'A PAS DE SOLUTION NAÏVE
 *
 * Un encart d'afficheur fait `2,6 × fs` de côté, soit **124,8 unités** avec la
 * police du site, et son compteur le prolonge à droite ; deux caractères
 * voisins de la ligne sont distants d'une chasse, soit **28,8**. Un afficheur
 * est donc **plus de quatre fois plus large que le pas de la ligne** qu'il
 * commente.
 *
 * « Un afficheur par caractère, posé près du caractère concerné » est par
 * conséquent une contrainte qu'on ne peut pas satisfaire littéralement dès
 * qu'il y en a deux : les poser exactement au-dessus des leurs les ferait se
 * recouvrir aux quatre cinquièmes. Quelque chose doit céder, et c'est
 * précisément ce que l'auteur autorise. Trois leviers, dans cet ordre :
 *
 *  1. **écarter** — chacun glisse le moins possible de la verticale du sien.
 *     C'est le levier gratuit : à deux ou trois afficheurs sur une ligne large,
 *     il suffit, et personne ne voit qu'on a triché ;
 *  2. **réduire** — quand l'écartement ne suffit plus, tous rapetissent d'un
 *     même facteur. Un même facteur pour tous, jamais un par afficheur : deux
 *     afficheurs de tailles différentes se liraient comme deux choses
 *     différentes ;
 *  3. **relayer** — sous un plancher de lisibilité, on renonce à les montrer
 *     tous ensemble. `combienTiennent` dit alors combien forment une vague.
 *
 * ## ★ « LE MOINS POSSIBLE » EST UN PROBLÈME EXACT, PAS UNE HEURISTIQUE
 *
 * Écarter des points ordonnés en respectant un écart minimal et des bornes, en
 * minimisant la somme des carrés des déplacements, est une **régression
 * isotonique** — le même problème que celui des blocs adjacents (*pool adjacent
 * violators*). Il se résout en un balayage, et la solution est unique.
 *
 * On ne s'en prive pas pour une raison de goût mais de DÉTERMINISME (§4.4) : un
 * tassement approché « qui a l'air bien » dépend de l'ordre où l'on répare les
 * conflits, et deux exécutions peuvent en donner deux. Le résultat d'ici ne
 * dépend que de ses entrées.
 *
 * ★ **L'ORDRE DE LA LIGNE EST UNE CONTRAINTE, PAS UNE CONSÉQUENCE.** Les
 *   afficheurs gardent l'ordre de leurs caractères, même quand le tassement les
 *   pousse loin : celui du « h » reste à gauche de celui du « o ». Un afficheur
 *   qui doublerait son voisin désignerait le mauvais caractère.
 *
 * ## ★ ON REFUSE L'IMPOSSIBLE, ON NE LE RABOTE PAS
 *
 * ⚠️ La première version rendait « quelque chose » quand on lui en demandait
 *   plus que la zone n'en peut porter : un rangement serré et centré, qui
 *   DÉBORDAIT des deux côtés. Mesuré : douze afficheurs de 190 unités donnaient
 *   un bord gauche à **−14**, c'est-à-dire hors du `viewBox`. C'est exactement
 *   ce que l'auteur interdit — « plutôt que déborder ».
 *
 *   `rangerLesAfficheurs` **échoue** donc quand on lui en demande trop, au lieu
 *   de rendre une image fausse. C'est la règle de ce moteur (CONTRACTS §3 : une
 *   op hors vocabulaire est une erreur de compilation, pas une op ignorée) : un
 *   défaut bruyant vaut mieux qu'un rendu silencieusement faux. L'appelant
 *   demande `combienTiennent` d'abord, et fait ses vagues.
 */

import { fail } from './errors.js';

/**
 * Le plancher de lisibilité d'un afficheur à segments.
 *
 * ★ **CE N'EST PAS UN NOMBRE DE CONFORT.** En dessous, ce qu'on demande à l'œil
 *   devient impossible : `sevenSeg` en régime « comptage individuel » dessine
 *   des segments DISJOINTS, séparés par un interstice qui vaut quelques
 *   centièmes du côté de l'encart. À la moitié de la taille nominale, cet
 *   interstice tombe sous l'unité de viewBox, et deux segments voisins se
 *   touchent à l'écran : le spectateur ne peut plus les compter, ce qui est la
 *   seule chose que cet afficheur existe pour faire. Mieux vaut deux vagues
 *   lisibles qu'une image où le compte est indécidable.
 */
export const ECHELLE_PLANCHER = 0.5;

/** L'air qu'on laisse entre deux afficheurs voisins, en unités de viewBox. */
export const RESPIRATION = 8;

/**
 * Les abscisses admissibles pour un CENTRE, à une échelle donnée.
 * Le cadre borne les BORDS ; un objet plus petit laisse son centre approcher
 * davantage de la marge, et c'est ce qui rend la réduction utile.
 */
function zoneDesCentres(spec, echelle) {
  const demi = (spec.cote * echelle) / 2;
  return { min: spec.cadre.min + demi, max: spec.cadre.max - demi };
}

/**
 * Combien d'afficheurs la zone peut porter en même temps, au pire des cas
 * (l'échelle plancher). C'est la taille d'une vague.
 *
 * @param {{cote:number, marge?:number, cadre:{min:number,max:number}, plancher?:number}} spec
 * @returns {number} au moins 1 — un afficheur seul se pose toujours, quitte à
 *   être à l'étroit : ne pas le montrer du tout serait pire.
 */
export function combienTiennent(spec) {
  const plancher = spec.plancher ?? ECHELLE_PLANCHER;
  const marge = spec.marge ?? RESPIRATION;
  const zone = zoneDesCentres(spec, plancher);
  const large = zone.max - zone.min;
  const pas = spec.cote * plancher + marge;
  if (!(large > 0) || !(pas > 0)) return 1;
  return Math.max(1, Math.floor(large / pas) + 1);
}

/**
 * Place des objets de même largeur au plus près de leurs ancres, sans
 * recouvrement et sans sortir de la zone.
 *
 * @param {number[]} ancres  les abscisses souhaitées, **dans l'ordre de la ligne**
 * @param {number} pas       l'encombrement de chaque objet, respiration comprise
 * @param {{min:number, max:number}} zone  les abscisses admissibles pour un CENTRE
 * @returns {number[]} les abscisses retenues, dans le même ordre
 */
export function tasser(ancres, pas, zone) {
  const n = ancres.length;
  if (!n) return [];
  /* ★ **ON RÉSOUT SUR DES POSITIONS DÉCALÉES.** Contraindre `x[i+1] − x[i] ≥ pas`
     n'est pas une contrainte d'isotonie ; poser `u[i] = x[i] − i × pas` la rend
     telle — `u` doit simplement être croissant au sens large. C'est le
     changement de variable habituel, et il rend le problème exactement
     soluble au lieu qu'approximativement. */
  const u = ancres.map((a, i) => a - i * pas);
  const bas = zone.min;
  const haut = zone.max - (n - 1) * pas;
  if (haut < bas - 1e-9) {
    fail(`placement : ${n} objets de pas ${arrondir(pas)} ne tiennent pas dans `
      + `[${arrondir(zone.min)}, ${arrondir(zone.max)}]. Demandez « combienTiennent » et faites des vagues : `
      + 'un rangement qui déborde du cadre est pire que pas d’image du tout.');
  }

  /* Régression isotonique par blocs adjacents : chaque bloc retient sa somme et
     son poids ; un bloc qui passe sous son prédécesseur fusionne avec lui. */
  const blocs = [];
  for (const v of u) {
    let bloc = { somme: v, poids: 1 };
    while (blocs.length && blocs[blocs.length - 1].somme / blocs[blocs.length - 1].poids
      > bloc.somme / bloc.poids) {
      const prec = blocs.pop();
      bloc = { somme: prec.somme + bloc.somme, poids: prec.poids + bloc.poids };
    }
    blocs.push(bloc);
  }
  const plat = [];
  for (const b of blocs) {
    // Les bornes valent pour tous les `u` : les couper ici ne rompt pas la
    // croissance, puisqu'on coupe tout le monde au même endroit.
    const v = Math.min(haut, Math.max(bas, b.somme / b.poids));
    for (let k = 0; k < b.poids; k++) plat.push(v);
  }
  return plat.map((v, i) => arrondir(v + i * pas));
}

/**
 * Décide de l'échelle et des positions d'une rangée d'afficheurs.
 *
 * ⚠️ **ÉCHOUE** si `ancres.length > combienTiennent(spec)` — voir l'en-tête.
 *
 * @param {number[]} ancres  les abscisses des caractères, dans l'ordre de la ligne
 * @param {{cote:number, marge?:number, cadre:{min:number,max:number},
 *          plancher?:number}} spec
 *   `cote` l'encombrement horizontal NOMINAL d'un afficheur (compteur compris),
 *   `cadre` les abscisses que les BORDS ne doivent pas franchir.
 * @returns {{echelle:number, x:number[]}}
 */
export function rangerLesAfficheurs(ancres, spec) {
  const plancher = spec.plancher ?? ECHELLE_PLANCHER;
  const marge = spec.marge ?? RESPIRATION;
  const n = ancres.length;
  if (!n) return { echelle: 1, x: [] };

  const tiennent = combienTiennent(spec);
  if (n > tiennent) {
    fail(`placement : ${n} afficheurs demandés, ${tiennent} tiennent dans le cadre à l’échelle `
      + `plancher (${plancher}). Faites des vagues de ${tiennent} — réduire davantage rendrait `
      + 'le comptage des segments indécidable, et déborder le rendrait invisible.');
  }

  /* ★ **L'ÉCHELLE EST LA PLUS GRANDE QUI TIENNE, jamais une valeur choisie.**
     À l'échelle `e`, `n` objets ont besoin de `(n − 1) × (cote·e + marge)`
     d'étendue entre les centres extrêmes, et la zone en offre
     `(cadre − cote·e)`. L'inégalité se résout à la main plutôt que par
     dichotomie : « presque juste » se voit sur un bord.

       (n−1)(cote·e + marge) ≤ large₀ − cote·e
       e ≤ (large₀ − (n−1)·marge) / (n·cote)

     où `large₀` est la largeur du cadre. */
  const large0 = spec.cadre.max - spec.cadre.min;
  let echelle = 1;
  if (n > 1) {
    echelle = (large0 - (n - 1) * marge) / (n * spec.cote);
  }
  /* ⚠️ **ON ARRONDIT L'ÉCHELLE AVANT DE S'EN SERVIR, jamais après.** La
     première version rendait `arrondir(echelle)` mais calculait les positions
     avec la valeur pleine : l'appelant dimensionnait donc ses nœuds avec un
     nombre légèrement différent de celui qui avait servi à les espacer, et le
     bord tombait à côté de la marge. MESURÉ : un bord gauche à 71,99 pour un
     cadre qui commence à 72 — un centième d'unité, invisible à l'œil, et une
     garantie fausse. Une garantie qui rate d'un centième n'est pas une
     garantie ; c'est un test qui finira par clignoter.

     ★ Et l'arrondi ne peut que REDESCENDRE : `Math.min` sur l'arrondi au
       millième inférieur, pour qu'une échelle arrondie ne redevienne jamais
       plus grande que celle qui tenait. */
  echelle = Math.max(plancher, Math.min(1, plancherAuMillieme(echelle)));

  const zone = zoneDesCentres(spec, echelle);
  return {
    echelle,
    x: tasser(ancres, spec.cote * echelle + marge, zone),
  };
}

/** Le millième immédiatement inférieur — voir `rangerLesAfficheurs`. */
function plancherAuMillieme(v) {
  return Math.floor(v * 1000) / 1000;
}

function arrondir(v) {
  return Math.round(v * 1000) / 1000;
}
