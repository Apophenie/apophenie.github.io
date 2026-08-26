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

  /** La marche de l'échelle, en fraction de l'ampleur visée. */
  pas: 0.10,

  /** D'où l'on part. Bas : c'est ce qui rend les premières images bon marché
   *  sur toutes les machines, donc ce qui supprime le gel de l'allumage. */
  depart: 0.25,

  /** Sous le plancher, on tombe de plusieurs marches d'un coup : une machine
   *  qui décroche doit être soulagée tout de suite, pas dans une demi-seconde. */
  chuteBrusque: 3,

  /** ★ LE REPOS APRÈS CHAQUE CHANGEMENT — et c'est LE correctif du
   *  scintillement.
   *
   *  « Le feu semble s'embraser puis, par scintillement, sauter à plus petit
   *  puis reprendre… bref, les ajustements selon les performances sont trop
   *  brutaux » (l'auteur).
   *
   *  La cause était une boucle qui se mordait la queue : écrire l'ampleur force
   *  un nouveau tramage des flous, donc l'image SUIVANTE est lente — non pas
   *  parce que la machine peine, mais parce qu'on vient de lui demander de
   *  retramer. Le régisseur lisait cette lenteur comme un décrochage et
   *  retombait de trois marches ; l'image d'après redevenait rapide, il
   *  remontait. D'où le battement.
   *
   *  On ignore donc les images qui suivent un changement : elles mesurent le
   *  coût de la décision, pas celui du feu. */
  repos: 6,

  /** ★ LA CALIBRATION EST BORNÉE, PUIS L'AMPLEUR SE FIGE.
   *
   *  Un feu dont la taille suivrait indéfiniment l'humeur de la machine
   *  respirerait au mauvais rythme — et ce battement-là, personne ne l'a
   *  demandé. Le régisseur cherche donc son palier pendant la germination, où
   *  ses marches se confondent avec la pousse des flammes, puis il se tait.
   *
   *  En millisecondes depuis l'embrasement. */
  fenetreMs: 2200,

  /** ★ LE GUET — après la calibration, le régisseur ne parle plus qu'en cas de
   *  décrochage FRANC et DURABLE : autant d'images consécutives sous le
   *  plancher. Une image lente est un accident ; quarante d'affilée sont un
   *  aveu. Il descend alors d'une marche et se retait. */
  gardeImages: 40,

  /** ★ L'ampleur à partir de laquelle on ose la pile RICHE — cinq couches au
   *  lieu de trois. « Trois couches si les performances le nécessitent, sinon
   *  tu peux rester à 5, c'est aussi à faire en fonction du régisseur »
   *  (l'auteur). Une machine qui peine sur trois couches n'a rien à gagner à en
   *  recevoir cinq. */
  seuilRiche: 1,

  /** Et on ne redescend qu'en dessous de ce seuil-ci. L'écart entre les deux
   *  est l'HYSTÉRÉSIS : sans elle, une machine posée pile à la limite
   *  basculerait d'une pile à l'autre à chaque image, et chaque bascule coûte
   *  un tramage — le remède serait pire que le mal. */
  seuilSobre: 0.75,
};

/** Combien de fois le plancher il faut tenir pour avoir le droit de monter.
 *  C'est le « 2× » de l'auteur, et sa raison : viser le plancher tout juste
 *  ferait osciller autour de lui, chaque montée provoquant la chute suivante. */
export const MARGE_POUR_MONTER = 2;

/** L'état de départ du régisseur. Pur, sérialisable, testable. */
export function etatInitial(reglages = REGLAGES) {
  return {
    ampleur: reglages.depart,
    /** Images de repos restantes — voir `REGLAGES.repos`. */
    repos: reglages.repos,
    /** Millisecondes écoulées depuis l'embrasement. */
    ecoule: 0,
    /** Vrai une fois la calibration close : l'ampleur ne bouge plus qu'au guet. */
    fige: false,
    /** Images consécutives sous le plancher, une fois figé. */
    manquements: 0,
    /** Vrai si le changement de cet appel mérite d'être écrit. */
    change: false,
  };
}

/**
 * Une image de plus : décide de l'ampleur suivante.
 *
 * Fonction PURE — c'est elle que les tests interrogent, sans navigateur et sans
 * horloge. Le reste du module n'est qu'une boucle qui l'appelle.
 *
 * @param {object} etat     l'état précédent (`etatInitial`)
 * @param {number} msImage  la durée de la dernière image, en millisecondes
 * @param {object} [reglages]
 * @returns {object} le nouvel état
 */
export function reglerLeFeu(etat, msImage, reglages = REGLAGES) {
  const suite = { ...etat, change: false };
  if (!(msImage > 0) || !Number.isFinite(msImage)) return suite;

  suite.ecoule = etat.ecoule + msImage;
  const ips = 1000 / msImage;

  // ★ Repos : cette image mesure le coût de la décision précédente, pas celui
  //   du feu. On la laisse passer sans rien en conclure.
  if (etat.repos > 0) { suite.repos = etat.repos - 1; return suite; }

  const bouger = (v) => {
    if (v === etat.ampleur) return;
    suite.ampleur = v;
    suite.repos = reglages.repos;
    suite.change = true;
  };

  /* ── APRÈS LA CALIBRATION : le guet, et rien d'autre ──────────────────── */
  if (etat.fige) {
    if (ips >= reglages.plancherIps) { suite.manquements = 0; return suite; }
    suite.manquements = etat.manquements + 1;
    if (suite.manquements < reglages.gardeImages) return suite;
    // Décrochage franc et durable : une marche, puis on se retait.
    suite.manquements = 0;
    bouger(Math.max(reglages.depart, etat.ampleur - reglages.pas));
    return suite;
  }

  /* ── PENDANT LA CALIBRATION : on cherche le palier ────────────────────── */
  if (suite.ecoule >= reglages.fenetreMs) suite.fige = true;

  if (ips < reglages.plancherIps) {
    bouger(Math.max(reglages.depart, etat.ampleur - reglages.pas * reglages.chuteBrusque));
  } else if (ips > reglages.plancherIps * MARGE_POUR_MONTER) {
    bouger(Math.min(1, etat.ampleur + reglages.pas));
  }
  return suite;
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

  let etat = etatInitial(reglages);
  let riche = false;
  let precedent = 0;
  let jeton = 0;
  let vivant = true;

  /* ★ LA BASCULE DE RICHESSE — trois couches ou cinq.
     Chaque corps porte ses deux chaînes en attributs (`dom.js`) : basculer, ce
     n'est donc que choisir laquelle écrire. C'est une écriture par corps, et
     chacune force un nouveau tramage — d'où l'hystérésis, qui rend la bascule
     rare, et le repos qui suit, qui empêche d'en tirer une conclusion. */
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
  poser(etat.ampleur);

  const battre = (t) => {
    if (!vivant) return;
    jeton = requestAnimationFrame(battre);
    // ★ Tant que le feu n'a pas pris, il n'y a rien à régler — et surtout rien
    //   à MESURER : les images d'avant l'embrasement ne disent rien du coût du
    //   feu, et les prendre pour telles ferait partir le régisseur au sommet.
    if (!scene.hasAttribute('data-embrasement')) { precedent = t; return; }
    if (precedent) {
      etat = reglerLeFeu(etat, t - precedent, reglages);
      if (etat.change) {
        poser(etat.ampleur);
        if (!riche && etat.ampleur >= reglages.seuilRiche) habiller(true);
        else if (riche && etat.ampleur < reglages.seuilSobre) habiller(false);
      }
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
