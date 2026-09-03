/** Le plein écran de la scène — l'API du navigateur, et rien d'autre.
 *
 *  « Peux-tu aussi ajouter un "mode plein écran" aux contrôleurs de lecture
 *  pour pouvoir passer la scène en plein écran, avec le contrôleur de lecture
 *  qui n'apparaît alors qu'au survol (ou clic pour que les mobiles puissent y
 *  accéder) dans le quart inférieur de l'image. Le contrôleur permet aussi de
 *  sortir du mode plein écran. Sur mobile, le mode plein écran passe
 *  automatiquement en paysage. » (l'auteur)
 *
 *  ══════════════════════════════════════════════════════════════════════════
 *  ★ CE QUI PASSE EN PLEIN ÉCRAN, C'EST `.demo__scene`, PAS `#scene`.
 *  ══════════════════════════════════════════════════════════════════════════
 *
 *  Le réflexe serait de demander le plein écran sur le cadre de la scène, qui
 *  est bien « l'image » dont parle la demande. Il est faux, et pas d'un cheveu :
 *  **le navigateur ne rend que l'élément plein écran et sa descendance** (il le
 *  hisse dans la couche supérieure et masque le reste du document). La barre de
 *  transport étant un FRÈRE du cadre, elle cesserait purement et simplement
 *  d'exister à l'écran — donc le bouton qui permet de RESSORTIR n'existerait
 *  plus non plus. On aurait fabriqué un mode dont la seule sortie est `Échap`,
 *  c'est-à-dire un piège pour qui ne connaît pas la touche.
 *
 *  Deux issues, une seule tenable :
 *
 *  · **Déplacer la barre DANS le cadre** le temps du plein écran. Rejetée : un
 *    nœud qu'on retire puis réinsère perd le focus. Or le bouton qui déclenche
 *    le plein écran vit dans cette barre — un utilisateur au clavier appuierait
 *    donc sur Entrée et verrait son focus retomber sur `<body>`, précisément au
 *    moment où il en a le plus besoin. C'est la contrainte d'accessibilité qui
 *    tranche, pas le confort d'écriture.
 *
 *  · **Demander le plein écran sur le PARENT qui porte déjà les deux** — la
 *    colonne `.demo__scene`, faite exactement de la scène et de ses commandes.
 *    Aucune mutation du DOM, donc aucun focus perdu, aucune animation relancée,
 *    aucun écouteur à replacer. C'est celle-là.
 *
 *  ══════════════════════════════════════════════════════════════════════════
 *  ★ L'ÉTAT N'EST JAMAIS UN DRAPEAU QU'ON TIENDRAIT SOI-MÊME.
 *  ══════════════════════════════════════════════════════════════════════════
 *
 *  `Échap` sort du plein écran sans passer par nous ; la barre d'onglets de
 *  certains navigateurs aussi ; un `requestFullscreen` peut être refusé après
 *  coup. Un booléen local mentirait dans les trois cas. La seule vérité est
 *  `document.fullscreenElement`, relue à chaque `fullscreenchange` — c'est ce
 *  que fait `actif()`, et il n'existe pas d'autre source ici.
 *
 *  ══════════════════════════════════════════════════════════════════════════
 *  ★ SI L'API MANQUE, LE BOUTON N'EXISTE PAS.
 *  ══════════════════════════════════════════════════════════════════════════
 *
 *  `apiPleinEcran()` rend `null` plutôt qu'un objet inerte. Un bouton présent
 *  mais sans effet est exactement le mensonge que ce projet refuse ailleurs
 *  (voir le bouton du son, `src/app/transport.js`) : sur un iPhone, où
 *  `Element.requestFullscreen` n'existe pas, mieux vaut six commandes honnêtes
 *  que sept dont une ne fait rien.
 */

/** La part BASSE de l'image où le contrôleur se laisse trouver — le « quart
 *  inférieur » de la demande. La valeur vit ici parce que c'est un contrat
 *  d'interface, mais elle est APPLIQUÉE en CSS (`src/styles/controls.css`,
 *  `height: 25%`) : la zone révélatrice est un élément, pas un calcul par
 *  mouvement de souris. Un test compare les deux, faute de quoi elles
 *  dériveraient en silence. */
export const PART_REVELATRICE = 0.25;

/** Combien de temps le contrôleur reste visible à l'entrée en plein écran.
 *
 *  Il ne s'agit pas d'un délai de confort mais d'une PRÉSENTATION : au moment
 *  où l'image prend tout l'écran, rien n'indique où sont passées les
 *  commandes. On les montre une fois, à leur place, puis on les efface — la
 *  découverte est offerte, la règle « au survol » n'est pas trahie. */
export const DELAI_PRESENTATION = 2400;

/** Les dialectes de l'API, du standard aux préfixes, dans l'ordre de préférence.
 *
 *  Le tableau est nommé plutôt que devinné par concaténation de préfixes : les
 *  noms ne sont PAS réguliers (`mozRequestFullScreen` prend un S majuscule que
 *  `webkitRequestFullscreen` n'a pas, `mozCancelFullScreen` ne s'appelle même
 *  pas « exit », et `MSFullscreenChange` est le seul évènement capitalisé). Une
 *  règle de fabrication aurait produit des noms plausibles et faux. */
const DIALECTES = [
  {
    demander: 'requestFullscreen',
    sortir: 'exitFullscreen',
    element: 'fullscreenElement',
    permis: 'fullscreenEnabled',
    evenement: 'fullscreenchange',
  },
  {
    demander: 'webkitRequestFullscreen',
    sortir: 'webkitExitFullscreen',
    element: 'webkitFullscreenElement',
    permis: 'webkitFullscreenEnabled',
    evenement: 'webkitfullscreenchange',
  },
  {
    demander: 'mozRequestFullScreen',
    sortir: 'mozCancelFullScreen',
    element: 'mozFullScreenElement',
    permis: 'mozFullScreenEnabled',
    evenement: 'mozfullscreenchange',
  },
  {
    demander: 'msRequestFullscreen',
    sortir: 'msExitFullscreen',
    element: 'msFullscreenElement',
    permis: 'msFullscreenEnabled',
    evenement: 'MSFullscreenChange',
  },
];

/**
 * L'API de plein écran de ce document, ou `null` s'il n'y en a pas.
 *
 * Trois refus, et chacun compte :
 *   · pas de méthode de demande sur les éléments (iOS Safari) ;
 *   · pas de méthode de sortie sur le document (une moitié d'API est pire
 *     qu'aucune : on entrerait sans pouvoir sortir) ;
 *   · `fullscreenEnabled === false` — c'est le cas d'un `<iframe>` sans
 *     `allow="fullscreen"`. L'API est là, l'appel échouerait quand même.
 *
 * @param {Document} [doc]
 * @param {Element}  [modele] l'élément sur lequel sonder les méthodes ; le
 *   `documentElement` par défaut, injectable pour les tests.
 * @returns {?{evenement:string, element:Function, demander:Function, sortir:Function}}
 */
export function apiPleinEcran(doc, modele) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return null;
  const sonde = modele || d.documentElement;
  if (!sonde) return null;

  const dialecte = DIALECTES.find((x) => typeof sonde[x.demander] === 'function'
    && typeof d[x.sortir] === 'function');
  if (!dialecte) return null;
  // `false` seulement : `undefined` veut dire « ce dialecte n'a pas ce
  // témoin », ce qui n'est pas un refus.
  if (d[dialecte.permis] === false) return null;

  return {
    evenement: dialecte.evenement,
    element: () => d[dialecte.element] || null,
    /* Les appels sont enveloppés : les dialectes préfixés ne rendaient pas de
       promesse, et une exception synchrone (`TypeError` sur un élément détaché)
       ne doit pas remonter jusqu'au gestionnaire de clic. */
    demander(el) {
      try { return Promise.resolve(el[dialecte.demander]()); }
      catch (err) { return Promise.reject(err); }
    },
    sortir() {
      try { return Promise.resolve(d[dialecte.sortir]()); }
      catch (err) { return Promise.reject(err); }
    },
  };
}

/**
 * ★ LE PAYSAGE, ET POURQUOI IL SE DEMANDE SANS JAMAIS S'EXIGER.
 *
 * `screen.orientation.lock()` est refusé partout sauf dans un document déjà en
 * plein écran, et il n'existe pas du tout sur iOS. Le repli est donc SILENCIEUX
 * — l'échec n'est pas une anomalie, c'est le cas courant. Le promettre dans un
 * message d'erreur ou le retenter serait du bruit pour une fonction qui, quand
 * elle ne marche pas, ne coûte rien : l'image reste en portrait, elle est
 * simplement moins large.
 *
 * ★ Et il ne se tente QUE sur un pointeur grossier. Sur un bureau, verrouiller
 * l'orientation d'un moniteur n'a aucun sens ; l'appel y échouerait de toute
 * façon, mais Firefox l'inscrit dans la console, et une console qui crie à
 * chaque plein écran finit par ne plus être lue.
 *
 * @param {Screen}  ecran   `window.screen`, injectable
 * @param {boolean} tactile vrai si le pointeur est grossier
 * @returns {Promise<boolean>} vrai si le verrou a bien été posé
 */
export function verrouillerPaysage(ecran, tactile) {
  if (!tactile) return Promise.resolve(false);
  const o = ecran && ecran.orientation;
  if (!o || typeof o.lock !== 'function') return Promise.resolve(false);
  try {
    return Promise.resolve(o.lock('landscape')).then(() => true, () => false);
  } catch (_) {
    return Promise.resolve(false);
  }
}

/** Rend son orientation à l'appareil. Muet lui aussi : on n'a pas à savoir si
 *  le verrou avait été posé pour avoir le droit de le lever. */
export function libererOrientation(ecran) {
  const o = ecran && ecran.orientation;
  if (!o || typeof o.unlock !== 'function') return;
  try { o.unlock(); } catch (_) { /* rien à rattraper : il n'y avait pas de verrou */ }
}

/** Le pointeur de cet appareil est-il un doigt ? Sert au seul verrou
 *  d'orientation ; le reste du dispositif ne fait aucune différence entre une
 *  souris et un doigt, il écoute les deux. */
function pointeurGrossier(fenetre) {
  const mm = fenetre && fenetre.matchMedia;
  if (typeof mm !== 'function') return false;
  try { return !!mm.call(fenetre, '(pointer: coarse)').matches; }
  catch (_) { return false; }
}

/** Un évènement de pointeur vient-il d'une SOURIS ?
 *
 *  La distinction commande tout le dispositif de révélation : une souris
 *  survole (`pointerenter` / `pointerleave`), un doigt ne survole pas — il
 *  touche, et son `pointerenter` arrive collé au `pointerdown`. Traiter les
 *  deux pareillement ferait, sur mobile, apparaître la barre à l'entrée puis
 *  disparaître à l'appui : un clignotement au lieu d'une révélation.
 *  Un `pointerType` absent (vieux navigateur, évènement synthétique) est traité
 *  comme une souris : c'est le comportement historique, et il est réversible
 *  d'un mouvement. */
const vientDUneSouris = (ev) => !ev.pointerType || ev.pointerType === 'mouse';

/**
 * Le contrôleur de plein écran d'une scène.
 *
 * Il ne dessine rien : la barre de transport lui demande son état et lui envoie
 * les clics (`src/app/transport.js`), la mise en page vit en CSS. Ce qu'il
 * porte, c'est l'API du navigateur, le verrou d'orientation et la RÉVÉLATION du
 * contrôleur — trois choses qui n'ont pas leur place dans une barre de boutons.
 *
 * @param {Object} options
 * @param {Element|Function} options.cible l'élément à passer en plein écran, ou
 *   une fonction qui le rend. Une fonction, parce que la page construit la
 *   colonne APRÈS la barre qui porte le bouton : ce qui est déclaré plus bas ne
 *   se nomme pas plus haut, il se lit plus tard.
 * @param {Element|Function} options.zone la zone révélatrice — le nœud qui
 *   couvre le quart inférieur et porte le contrôleur.
 * @param {Document} [options.doc]
 * @param {Window}   [options.fenetre]
 * @param {Screen}   [options.ecran]
 * @param {?Object}  [options.api] pour les tests ; `undefined` déclenche la
 *   détection normale, `null` simule une absence d'API.
 * @returns {{disponible:boolean, actif:Function, basculer:Function,
 *            on:Function, detruire:Function}}
 */
export function creerPleinEcran(options = {}) {
  const doc = options.doc || (typeof document !== 'undefined' ? document : null);
  const fenetre = options.fenetre || (typeof window !== 'undefined' ? window : null);
  const ecran = options.ecran !== undefined
    ? options.ecran
    : (fenetre ? fenetre.screen : null);
  const api = options.api !== undefined ? options.api : apiPleinEcran(doc);

  const lire = (v) => (typeof v === 'function' ? v() : v);
  const cible = () => lire(options.cible);
  const zone = () => lire(options.zone);

  const abonnes = new Set();
  let minuteur = null;
  let attaches = false;

  /* ── la révélation du contrôleur ─────────────────────────────────────────
     `data-commandes` plutôt que `:hover` seul, et pour une raison qui n'est
     pas de commodité : le survol n'existe pas au doigt. Une seule marque porte
     donc les trois voies d'accès — la souris qui survole, le doigt qui tape, et
     la présentation d'entrée —, si bien que le CSS n'a qu'un état à peindre.
     Le CLAVIER, lui, n'est pas dans cette marque : il passe par `:focus-within`
     (`src/styles/controls.css`), qui est vrai dès que le focus entre dans la
     barre — donc AVANT que quoi que ce soit ici ne puisse réagir. Un contrôle
     qui n'apparaît qu'à la souris est un contrôle inaccessible. */
  function montrer(effacementAuto = false) {
    clearTimeout(minuteur);
    minuteur = null;
    const z = zone();
    if (!z) return;
    z.dataset.commandes = 'vues';
    if (effacementAuto) minuteur = setTimeout(() => cacher(), DELAI_PRESENTATION);
  }

  function cacher() {
    clearTimeout(minuteur);
    minuteur = null;
    const z = zone();
    if (z && z.dataset) delete z.dataset.commandes;
  }

  const surEntree = (ev) => { if (vientDUneSouris(ev)) montrer(); };
  const surSortie = (ev) => { if (vientDUneSouris(ev)) cacher(); };
  /* La souris qui bouge SANS être entrée : c'est le cas au premier instant du
     plein écran, où le pointeur est déjà posé sur le bouton qu'on vient de
     cliquer — donc déjà dans la zone, donc aucun `pointerenter` à venir. */
  const surMouvement = (ev) => {
    if (!vientDUneSouris(ev)) return;
    const z = zone();
    if (z && z.dataset && z.dataset.commandes === 'vues' && !minuteur) return;
    montrer();
  };
  /* ══ LE DOIGT BASCULE — ET IL BASCULE DEPUIS TOUTE L'IMAGE ════════════════
     > « Le player s'affiche et se masque correctement en plein écran sur
     >   ordinateur, mais sur mon mobile, en plein écran, même en cliquant en
     >   haut de l'écran, il ne se masque pas. Conséquence : une partie de
     >   l'animation passe sous la barre de contrôle. » (l'auteur)

     ⚠️ **L'APPUI ÉTAIT POSÉ SUR LA ZONE, DONC SUR LE QUART INFÉRIEUR SEUL.**
       Ce qui MONTRE la barre peut vivre là : on tape en bas, les commandes
       viennent. Mais ce qui la CACHE ne le peut pas. À la souris, le masquage
       n'est pas un geste — c'est `pointerleave`, l'absence de geste, et il se
       déclenche partout ailleurs sur l'écran par construction. Au doigt, il
       n'existe pas de « partir » : taper hors du quart inférieur n'atteignait
       aucun écouteur, et la barre restait posée sur l'animation jusqu'à la
       sortie du plein écran. Le dispositif avait donc une entrée tactile et
       aucune sortie tactile.

     ★ **L'APPUI ÉCOUTE MAINTENANT LA CIBLE**, c'est-à-dire l'écran entier du
       plein écran, dont la zone est une descendante : un seul écouteur couvre
       les deux moitiés du geste, et l'évènement qui naît dans la zone y remonte
       de lui-même. Pas de second écouteur, donc pas de double bascule.
       C'est aussi l'idiome de tous les lecteurs vidéo tactiles : une tape sur
       l'image montre les commandes, la suivante les rend à l'image.

     ★ Le survol, lui, RESTE sur la zone. `pointerenter` sur la cible entière
       vaudrait « le pointeur est quelque part sur l'écran », ce qui est vrai en
       permanence : la barre ne se cacherait plus jamais à la souris.

     Une exception, inchangée : l'appui qui vise une commande ne bascule pas,
     sinon le bouton qu'on vient d'atteindre s'évanouit sous le doigt qui
     l'actionne et le clic suivant retombe dans le vide.
     ⚠️ `select` est dans la liste : le réglage de vitesse est un `<select>`
     étalé sur un faux bouton (`src/app/transport.js`), il n'est ni un `button`
     ni un `[role=button]` — sans lui, ouvrir la liste des vitesses au doigt
     effaçait la barre sous le menu qui s'ouvrait. */
  const surAppui = (ev) => {
    if (vientDUneSouris(ev)) return;
    const surUnControle = ev.target && typeof ev.target.closest === 'function'
      && ev.target.closest('button, a[href], select, [role="button"]');
    const z = zone();
    const deja = !!(z && z.dataset && z.dataset.commandes === 'vues');
    if (surUnControle || !deja) montrer();
    else cacher();
  };

  /* Les nœuds effectivement écoutés sont MÉMORISÉS, pas relus au détachement :
     `zone` et `cible` sont des fonctions, et rien ne garantit qu'elles rendront
     le même nœud une fois la page démontée. Retirer un écouteur d'un autre
     élément que celui qui le porte ne fait rien — et ne le dit pas. */
  let zoneEcoutee = null;
  let cibleEcoutee = null;

  function attacher() {
    if (attaches) return;
    const z = zone();
    const c = cible();
    if (!z && !c) return;
    attaches = true;
    if (z) {
      zoneEcoutee = z;
      z.addEventListener('pointerenter', surEntree);
      z.addEventListener('pointerleave', surSortie);
      z.addEventListener('pointermove', surMouvement);
    }
    if (c) {
      cibleEcoutee = c;
      c.addEventListener('pointerdown', surAppui);
    }
  }

  function detacher() {
    if (!attaches) return;
    attaches = false;
    if (zoneEcoutee) {
      zoneEcoutee.removeEventListener('pointerenter', surEntree);
      zoneEcoutee.removeEventListener('pointerleave', surSortie);
      zoneEcoutee.removeEventListener('pointermove', surMouvement);
      zoneEcoutee = null;
    }
    if (cibleEcoutee) {
      cibleEcoutee.removeEventListener('pointerdown', surAppui);
      cibleEcoutee = null;
    }
  }

  /** Vrai si c'est bien NOTRE cible qui occupe l'écran. Une vidéo passée en
   *  plein écran ailleurs dans la page ne doit pas allumer notre bouton. */
  function actif() {
    if (!api) return false;
    const el = api.element();
    return !!el && el === cible();
  }

  const prevenir = () => abonnes.forEach((f) => f());

  /* L'unique point de synchronisation : ce que dit le navigateur. Il couvre
     `Échap`, la sortie par le menu du navigateur, le refus d'une demande, et
     la sortie provoquée par le retrait de la cible du DOM. */
  function surChangement() {
    const dedans = actif();
    const c = cible();
    if (c && c.dataset) {
      if (dedans) c.dataset.pleinEcran = '1';
      else delete c.dataset.pleinEcran;
    }
    if (dedans) {
      attacher();
      montrer(true);
    } else {
      cacher();
      detacher();
      libererOrientation(ecran);
    }
    prevenir();
  }

  if (api && doc) doc.addEventListener(api.evenement, surChangement);

  return {
    /** Le bouton n'a le droit d'exister que si quelque chose peut se passer. */
    disponible: !!api,
    actif,
    /**
     * Entre ou sort — c'est le MÊME bouton, comme Lecture/Pause.
     *
     * ⚠ Appelée SYNCHRONEMENT depuis le gestionnaire de clic : `requestFullscreen`
     * exige une activation utilisateur, et un `await` intercalé la consommerait.
     * Le verrou d'orientation, lui, doit au contraire attendre que le plein
     * écran soit accordé — d'où l'enchaînement sur la promesse.
     */
    basculer() {
      if (!api) return Promise.resolve(false);
      if (actif()) {
        libererOrientation(ecran);
        return api.sortir().then(() => false, () => false);
      }
      const c = cible();
      if (!c) return Promise.resolve(false);
      return api.demander(c).then(
        () => verrouillerPaysage(ecran, pointeurGrossier(fenetre)).then(() => true),
        () => false,
      );
    },
    /** S'abonner aux changements d'état. Rend de quoi se désabonner. */
    on(f) {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    detruire() {
      clearTimeout(minuteur);
      minuteur = null;
      detacher();
      abonnes.clear();
      if (api && doc) doc.removeEventListener(api.evenement, surChangement);
      // Quitter la page en plein écran laisserait l'appareil verrouillé en
      // paysage sous la page suivante, qui n'a plus aucun bouton pour le
      // rendre. Le navigateur sort du plein écran tout seul quand la cible
      // disparaît du DOM ; l'orientation, elle, ne se rend pas toute seule.
      if (actif()) api.sortir().catch(() => {});
      libererOrientation(ecran);
    },
  };
}
