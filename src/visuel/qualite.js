/** Le RÉGISSEUR — il règle la richesse du feu sur ce que la machine tient.
 *
 *  ★ POURQUOI IL EXISTE.
 *
 *  Le feu du verdict est une pile de `drop-shadow()` à l'échelle huit. Son coût
 *  ne se devine pas : il dépend du moteur de rendu, du processeur, de la
 *  présence d'un GPU. Mesuré sur la même page, même trajet :
 *
 *    · Chromium : le grossissement saccade, quelques images à 100 ms ;
 *    · Firefox  : « près d'une minute entre la fin du grossissement et
 *                 l'allumage » (l'auteur).
 *
 *  Deux ordres de grandeur d'écart. Aucune constante écrite une fois pour
 *  toutes ne peut convenir aux deux : trop riche, Firefox s'arrête ; assez
 *  pauvre pour Firefox, Chromium se prive pour rien.
 *
 *  ★ LA RÈGLE, telle que l'auteur l'a posée.
 *
 *  « Si le site peut mesurer le nombre d'images/seconde, peux-tu adapter en
 *  fonction des performances de la machine pour ne jamais descendre en dessous
 *  de 15 images/seconde (15 réglable en fichier de config) ? Et pour éviter un
 *  effet de "la pire image dégrade l'ensemble du rendu" : si l'animation monte
 *  à 2× le minimum d'images/seconde, tu peux réaugmenter la complexité/taille
 *  des flous de 10 %, attendre la prochaine image, si toujours au-dessus de 2×
 *  encore 10 % de plus, etc., jusqu'à la taille max visée ou descendre en
 *  dessous de 2× le minimum. »
 *
 *  D'où une échelle qui MONTE, une marche par image, et qui s'arrête d'elle-même
 *  là où la machine cesse de suivre. On part BAS : les premières images sont
 *  donc bon marché partout, et c'est ce qui supprime le gel initial. Le palier
 *  d'équilibre est trouvé par mesure, jamais par supposition.
 *
 *  ★ CE QUE LE RÉGISSEUR NE TOUCHE PAS.
 *
 *  Rien de ce qui est DÉMONTRÉ. Il ne change ni une valeur, ni une géométrie,
 *  ni un rang, ni une ligne du Registre : il ne règle que l'ampleur d'un décor.
 *  La démonstration reste la même sur une machine lente et sur une rapide —
 *  seule sa mise en scène est moins ample. C'est la même frontière que celle qui
 *  garde l'orage hors du vocabulaire (CONTRACTS §3.1).
 *
 *  Il n'entame pas non plus le déterminisme (§4.4) : `performance.now()` mesure
 *  le rendu, il n'entre dans aucun calcul compilé. Deux machines montrent le
 *  même 666, avec des flammes plus ou moins hautes.
 */

/* ══════════════════════════ LE FICHIER DE RÉGLAGE ═════════════════════════
   « 15 réglable en fichier de config pour que je puisse le monter à 30 ou le
   descendre à 10 selon ce qui me semble pertinent » (l'auteur). Tout est ici,
   et rien de ce qui suit n'est écrit ailleurs.
   ════════════════════════════════════════════════════════════════════════ */
export const REGLAGES = {
  /** Le plancher : on ne descend jamais en dessous, quitte à appauvrir le feu.
   *  Monter à 30 rend le feu plus pauvre et plus fluide ; descendre à 10 le
   *  rend plus riche et plus lourd. */
  plancherIps: 15,

  /** La marche de l'échelle, en fraction de l'ampleur visée. Une marche par
   *  image, tant que la machine tient le double du plancher. */
  pas: 0.10,

  /** D'où l'on part. Bas : c'est ce qui rend les premières images bon marché
   *  sur toutes les machines, donc ce qui supprime le gel de l'allumage. */
  depart: 0.25,

  /** En dessous du plancher, on ne descend pas d'une marche mais de trois :
   *  une machine qui décroche doit être soulagée tout de suite, pas dans une
   *  demi-seconde. */
  chuteBrusque: 3,

  /** ★ L'ampleur à partir de laquelle on ose la pile RICHE — cinq couches au
   *  lieu de trois. « Trois couches si les performances le nécessitent, sinon
   *  tu peux rester à 5, c'est aussi à faire en fonction du régisseur »
   *  (l'auteur). On n'y touche qu'une fois l'ampleur au sommet : une machine
   *  qui peine sur trois couches n'a rien à gagner à en recevoir cinq. */
  seuilRiche: 1,

  /** Et on ne redescend qu'en dessous de ce seuil-ci. L'écart entre les deux
   *  est l'HYSTÉRÉSIS : sans elle, une machine posée pile à la limite
   *  basculerait d'une pile à l'autre à chaque image, et chaque bascule coûte
   *  un nouveau tramage — le remède serait pire que le mal. */
  seuilSobre: 0.75,
};

/** Combien de fois le plancher il faut tenir pour avoir le droit de monter.
 *  C'est le « 2× » de l'auteur, et sa raison : viser le plancher tout juste
 *  ferait osciller autour de lui, chaque montée provoquant la chute suivante. */
export const MARGE_POUR_MONTER = 2;

/**
 * Décide de l'ampleur suivante, à partir de la durée de la dernière image.
 *
 * Fonction PURE : c'est elle que les tests interrogent, sans navigateur et sans
 * horloge. Le reste du module n'est qu'une boucle qui l'appelle.
 *
 * @param {number} ampleur   l'ampleur en cours, dans `[depart, 1]`
 * @param {number} msImage   la durée de la dernière image, en millisecondes
 * @param {object} [reglages]
 * @returns {number} l'ampleur pour l'image suivante
 */
export function ampleurSuivante(ampleur, msImage, reglages = REGLAGES) {
  const { plancherIps, pas, depart, chuteBrusque } = reglages;
  // Une image de durée nulle ou absurde ne dit rien : on ne bouge pas.
  if (!(msImage > 0) || !Number.isFinite(msImage)) return ampleur;

  const ips = 1000 / msImage;

  // ★ Sous le plancher : on tombe de plusieurs marches d'un coup. Descendre
  //   d'une seule laisserait la machine ramer le temps de la descente — c'est
  //   exactement « la pire image dégrade l'ensemble du rendu » que l'auteur
  //   veut éviter.
  if (ips < plancherIps) return Math.max(depart, ampleur - pas * chuteBrusque);

  // ★ Au-dessus du double du plancher : une marche, et on retente à l'image
  //   suivante. L'échelle s'arrête d'elle-même là où la machine cesse de
  //   suivre — c'est ce qui rend le palier d'équilibre MESURÉ.
  if (ips > plancherIps * MARGE_POUR_MONTER) return Math.min(1, ampleur + pas);

  // Entre les deux : la zone de repos. On ne touche à rien, sinon l'ampleur
  // oscillerait sans jamais se poser.
  return ampleur;
}

/**
 * Branche le régisseur sur une scène.
 *
 * Il ne tourne QUE lorsqu'il y a un feu à régler (`data-embrasement`) : une
 * boucle qui mesurerait des images sans rien à décider serait du travail pur.
 *
 * @param {Element} scene   la racine `<svg class="scene">`
 * @param {object} [reglages]
 * @returns {Function} de quoi le débrancher
 */
export function brancherLeRegisseur(scene, reglages = REGLAGES) {
  if (!scene || typeof requestAnimationFrame !== 'function') return () => {};

  let ampleur = reglages.depart;
  let riche = false;
  let precedent = 0;
  let jeton = 0;
  let vivant = true;

  /* ★ LA BASCULE DE RICHESSE — trois couches ou cinq.
     Chaque corps porte ses deux chaînes en attributs (`dom.js`) : basculer, ce
     n'est donc que choisir laquelle écrire. C'est une écriture par corps, et
     chacune force un nouveau tramage — d'où l'hystérésis, qui rend la bascule
     rare. */
  const habiller = (versRiche) => {
    if (versRiche === riche) return;
    riche = versRiche;
    const cle = versRiche ? 'data-feu-riche' : 'data-feu-sobre';
    for (const corps of scene.querySelectorAll('.nhl-feu')) {
      const chaine = corps.getAttribute(cle);
      if (chaine) corps.style.filter = chaine;
    }
  };

  const poser = (v) => {
    // Deux décimales : au-delà, on réécrirait la propriété pour un changement
    // invisible — et TOUTE écriture force un nouveau tramage des flous.
    const arrondi = Math.round(v * 100) / 100;
    if (arrondi === poser.dernier) return;
    poser.dernier = arrondi;
    scene.style.setProperty('--nhl-feu-ampleur', String(arrondi));
  };
  poser(ampleur);

  const battre = (t) => {
    if (!vivant) return;
    jeton = requestAnimationFrame(battre);
    if (!scene.hasAttribute('data-embrasement')) { precedent = t; return; }
    if (precedent) {
      ampleur = ampleurSuivante(ampleur, t - precedent, reglages);
      poser(ampleur);
      // La richesse suit l'ampleur, avec son hystérésis.
      if (!riche && ampleur >= reglages.seuilRiche) habiller(true);
      else if (riche && ampleur < reglages.seuilSobre) habiller(false);
    }
    precedent = t;
  };
  jeton = requestAnimationFrame(battre);

  return () => {
    vivant = false;
    if (jeton) cancelAnimationFrame(jeton);
    scene.style.removeProperty('--nhl-feu-ampleur');
  };
}
