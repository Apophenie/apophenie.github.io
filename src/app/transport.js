/** La barre de transport et la jauge.
 *
 *  Règle absolue (CONTRACTS §3.3 et §6) : l'UI est un **pur reflet** du lecteur.
 *  Aucune logique d'animation ici, aucune horloge, aucun état dupliqué — on lit
 *  `lecteur.atStart`, `lecteur.playing`, `lecteur.stepIndex` et on se redessine.
 *
 *  Deux règles d'accessibilité qui ne se négocient pas :
 *    · `aria-disabled` et JAMAIS l'attribut `disabled` — un bouton `disabled`
 *      sort de l'ordre de tabulation, donc à la fin de la démonstration le focus
 *      clavier serait éjecté vers le début du document ;
 *    · un seul bouton Lecture/Pause, dont le NOM ACCESSIBLE change, et SANS
 *      `aria-pressed` — les deux ensemble produisent une annonce contradictoire.
 *
 *  Une seule exception au « pur reflet » : les PRÉFÉRENCES DE LECTURE — la
 *  vitesse, le rythme, le son, le plein écran. Ce ne sont pas des commandes
 *  d'avancement, mais elles règlent la façon dont l'avancement se joue, donc
 *  leur place est ici, à côté des cinq boutons, et pas dans la barre haute avec
 *  le thème. Celles qui changent la TIMELINE n'agissent pas sur le lecteur :
 *  elles écrivent dans `reglages.js`, et c'est la page de démonstration qui,
 *  prévenue, fait recompiler. La barre reste un reflet, d'un réglage cette fois
 *  plutôt que du lecteur.
 */

import { e, svg as s } from './dom.js';
import { t, langue } from '../i18n/index.js';
import { interpoler } from '../i18n/resolution.js';
import { titreEtape } from './libelles.js';
import { infobuller } from './infobulle.js';
import {
  sonActif, basculerSon, onReglages, rythmeChoisi, definirRythme,
} from './reglages.js';
import { RYTHMES } from '../visuel/rythme.js';

const ico = (...enfants) =>
  s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, enfants);

const ICONES = {
  debut: () => ico(
    s('path', { class: 'ico-trait', d: 'M6 5V19' }),
    s('path', { class: 'ico-plein', d: 'M19 5 L9 12 L19 19 Z' })),
  precedent: () => ico(
    s('path', { class: 'ico-plein', d: 'M17 4 L7 12 L17 20 Z' })),
  lecture: () => ico(
    s('path', { class: 'ico-plein', d: 'M7 4 L19 12 L7 20 Z' })),
  pause: () => ico(
    s('path', { class: 'ico-plein', d: 'M8 5 h3 v14 h-3 Z M13 5 h3 v14 h-3 Z' })),
  suivant: () => ico(
    s('path', { class: 'ico-plein', d: 'M7 4 L17 12 L7 20 Z' })),
  fin: () => ico(
    s('path', { class: 'ico-plein', d: 'M5 5 L15 12 L5 19 Z' }),
    s('path', { class: 'ico-trait', d: 'M18 5V19' })),
  // Le son : le haut-parleur, et ses ondes ou sa croix. AU TRAIT quand les cinq
  // commandes d'avancement sont pleines : la différence de facture dit du
  // premier coup d'œil que ce bouton règle quelque chose au lieu de déplacer la
  // tête de lecture.
  //
  // ★ Trois icônes et non deux, parce qu'il y a trois états RÉELS (voir
  // `src/app/sons.js`) : coupé ; actif ; et « actif, mais le navigateur n'a pas
  // encore laissé passer ». Le troisième porte un point d'exclamation plutôt
  // que des ondes — dire « ça sonne » quand rien ne sort serait exactement le
  // mensonge que ce bouton existe pour éviter.
  sonCoupe: () => ico(
    s('path', { class: 'ico-plein', d: 'M4 9 h3 L11 5 v14 L7 15 H4 Z' }),
    s('path', { class: 'ico-trait', d: 'M15 9 L20 15' }),
    s('path', { class: 'ico-trait', d: 'M20 9 L15 15' })),
  sonActif: () => ico(
    s('path', { class: 'ico-plein', d: 'M4 9 h3 L11 5 v14 L7 15 H4 Z' }),
    s('path', { class: 'ico-trait', d: 'M14.5 9.5 A4 4 0 0 1 14.5 14.5' }),
    s('path', { class: 'ico-trait', d: 'M17.5 6.5 A8 8 0 0 1 17.5 17.5' })),
  sonAttente: () => ico(
    s('path', { class: 'ico-plein', d: 'M4 9 h3 L11 5 v14 L7 15 H4 Z' }),
    s('path', { class: 'ico-trait', d: 'M17 7 V13' }),
    s('path', { class: 'ico-trait', d: 'M17 16 V17.5' })),
  // Le plein écran : quatre équerres, et RIEN d'autre dans le viewBox.
  //
  // Le picto ne dessine pas un écran, il dessine un CADRE qui s'ouvre ou se
  // ferme — c'est l'idiome des lecteurs vidéo depuis toujours, et c'est le seul
  // qui tienne à 24 px sans qu'on doive deviner ce qu'il y a dedans. Les deux
  // états ne se distinguent pas par une couleur ni par une barre ajoutée, mais
  // par la POSITION des coins : dehors, ils poussent vers les bords ; dedans,
  // ils rentrent vers le centre. Le geste que le bouton fera se lit donc dans
  // la direction du dessin.
  //
  // Au TRAIT comme le son, et pour la même raison : ce bouton règle
  // l'affichage, il ne déplace pas la tête de lecture.
  pleinEcran: () => ico(
    s('path', { class: 'ico-trait', d: 'M4 9 V4 H9' }),
    s('path', { class: 'ico-trait', d: 'M15 4 H20 V9' }),
    s('path', { class: 'ico-trait', d: 'M20 15 V20 H15' }),
    s('path', { class: 'ico-trait', d: 'M9 20 H4 V15' })),
  sortiePleinEcran: () => ico(
    s('path', { class: 'ico-trait', d: 'M9 4 V9 H4' }),
    s('path', { class: 'ico-trait', d: 'M15 4 V9 H20' }),
    s('path', { class: 'ico-trait', d: 'M20 15 H15 V20' }),
    s('path', { class: 'ico-trait', d: 'M4 15 H9 V20' })),
};

/**
 * Le facteur, écrit comme on le lit : « 0,25 » en français, « 0.25 » ailleurs.
 *
 * ⚠️ PAS de `toLocaleString` : `Intl` est proscrit (§4.4, déterminisme), et deux
 *   navigateurs n'écriraient pas la même chose sur la même valeur. La virgule
 *   française est donc posée à la main, sur la seule règle qui la gouverne.
 */
function formaterFacteur(v) {
  const brut = String(v);
  return langue() === 'fr' ? brut.replace('.', ',') : brut;
}

function boutonTransport(cle, libelle, nomAccessible, principal = false) {
  const icone = ICONES[cle]();
  const b = e(`button.transport__bouton${principal ? '.transport__bouton--principal' : ''}`, {
    type: 'button',
    'aria-label': nomAccessible,
  }, [icone, e('span.transport__libelle', { texte: libelle, 'aria-hidden': 'true' })]);
  b.dataset.role = cle;
  b._icone = icone;
  b._libelle = b.querySelector('.transport__libelle');
  return b;
}

/**
 * @param {Object} lecteur  l'API de src/visuel/player.js — ou de tout objet qui
 *   la respecte, comme `src/app/logo-lecteur.js`. La barre ne connaît que le
 *   contrat §3.3, jamais ce qu'il y a derrière.
 * @param {Object<string,string>} [libelles] surcharges des clés `transport.*`,
 *   pour ce qui se déroule sans être une « démonstration » — le logo, dont les
 *   quatre étapes ne sont pas des « transformations » et dont le bouton de
 *   lecture ne « lance » pas une démonstration. Toute clé absente retombe sur
 *   le dictionnaire : la barre des démonstrations n'en passe aucune.
 * @param {{vitesses?:boolean, rythmes?:boolean, sons?:Object, pleinEcran?:Object}} [options]
 *   `pleinEcran` : le contrôleur de `src/app/pleinecran.js`. La barre ne sait ni
 *   quel élément agrandir, ni comment — elle lui demande son état et lui envoie
 *   les clics, exactement comme elle fait du lecteur.
 * @returns {{element:HTMLElement, rafraichir:Function, detruire:Function}}
 */
export function creerTransport(lecteur, libelles = {}, options = {}) {
  const nbEtapes = Math.max(1, (lecteur.steps || []).length);
  const tt = (cle, params) => (libelles[cle] !== undefined
    ? interpoler(libelles[cle], params)
    : t(`transport.${cle}`, params));

  /* ── la jauge : une case par transformation, en vrais boutons ── */
  const cases = [];
  /* Les bulles de survol posent des écouteurs sur chaque dalle : on garde de
     quoi les retirer, sinon `detruire()` laisserait derrière lui autant de
     fermetures que d'étapes. */
  const detachements = [];
  const jauge = e('div.jauge', {
    role: 'group',
    'aria-label': tt('jauge'),
  });
  for (let i = 0; i < nbEtapes; i++) {
    const etape = (lecteur.steps || [])[i] || {};
    // Le titre de l'étape vient du scénario : forme `{fr, en}` du catalogue.
    const titre = etape.title ? titreEtape(etape, i) : '';
    const nom = titre
      ? tt('jaugeCaseTitree', { i: i + 1, total: nbEtapes, titre })
      : tt('jaugeCase', { i: i + 1, total: nbEtapes });
    const c = e('button.jauge__case', {
      type: 'button',
      'aria-label': nom,
      sur: { click: () => lecteur.seekToStep(i) },
    });
    // ★ Le même texte en INFO-BULLE, pour la souris.
    //
    // « Chaque dalle d'étape pourrait avoir le titre de l'étape en info-bulle
    // au survol ; tant pis pour les mobiles, ils ont le registre pour ça »
    // (l'auteur). Le nom accessible existait déjà et disait exactement la
    // bonne chose : la bulle le rend visible à qui n'a ni lecteur d'écran ni
    // envie de lire tout le registre. On ne compose donc pas un second texte —
    // deux formulations du même fait finissent toujours par diverger.
    //
    // ★ NOTRE bulle, plus l'attribut `title`. « Même composant pour afficher
    // les title que je t'ai fait ajouter aux étapes de l'animation »
    // (l'auteur). Un `title` natif n'est pas stylable, paraît après un délai
    // qu'on ne choisit pas, s'efface au bout de quelques secondes alors qu'on
    // le lit, et ne sait pas aller à la ligne. Voir `src/app/infobulle.js`.
    detachements.push(infobuller(c, nom));
    cases.push(c);
    jauge.appendChild(c);
  }

  /* ── les cinq contrôles ── */
  const bDebut = boutonTransport('debut', tt('debutCourt'), tt('debut'));
  const bPrec = boutonTransport('precedent', tt('precCourt'), tt('precedent'));
  const bLect = boutonTransport('lecture', tt('lectureCourt'), tt('lancer'), true);
  const bSuiv = boutonTransport('suivant', tt('suivCourt'), tt('suivant'));
  const bFin = boutonTransport('fin', tt('finCourt'), tt('fin'));

  /* ══ la VITESSE GLOBALE, SIXIÈME contrôle ════════════════════════════════
     > « Je voudrais un réglage de vitesse globale […] x0.25 … x10 » puis « à
     >   placer avant redites pour éviter qu'on pense que c'est aux redites
     >   qu'il s'applique » (l'auteur).

     ★ **L'ORDRE PORTE UNE PORTÉE.** La consigne visait le voisin d'alors — la
       bascule des redites, retirée depuis (`reglages.js`) —, mais sa RAISON
       survit au voisin : l'adjacence se lit comme une SUBORDINATION, donc le
       réglage le plus général passe devant et le plus particulier le suit. La
       vitesse porte sur toute la lecture ; le rythme, qui la suit désormais,
       ne porte que sur l'ordre des gestes à l'intérieur d'une étape.

     ★ **NI LIÈVRE NI TORTUE.** « Vu le design, abandonne les lièvre et
       tortue » (l'auteur). Les émoji sont en couleur et d'une autre famille de
       dessin que les six icônes tracées de la barre ; deux systèmes de signes
       dans une même rangée, c'est une rangée qui n'en est plus une. Le facteur
       lui-même — « ×1 », « ×2,5 » — dit tout ce que l'animal disait, et il le
       dit en chiffres, ce qui est plus précis.

     ★ **UN `<select>` TRANSPARENT PAR-DESSUS UN BOUTON ORDINAIRE.** Le contrôle
       doit ressembler EXACTEMENT aux autres — « ×1 doit être à la même hauteur
       et taille que les picto, et juste en dessous, même police que pour le
       reste, "vitesse" » —, or un `<select>` n'affiche que le texte de son
       option et ne sait pas porter deux lignes. On dessine donc le bouton comme
       les six autres (une zone d'icône de 24 px, un libellé dessous) et l'on
       étale le `<select>` par-dessus, invisible. Il garde son clavier, son
       sélecteur roulant sur mobile et son nom accessible ; l'œil, lui, ne voit
       qu'un septième bouton de la même famille.

     ★ **IL N'EXISTE QUE S'IL PEUT AGIR**, comme le son et le plein écran. Sous
       `prefers-reduced-motion` ou sans WAAPI, le moteur ne joue pas : il pose
       l'image d'un instant. Régler la vitesse d'une image fixe est un réglage
       qui ment. */
  /* ★ **LA PLUS RAPIDE EN HAUT — c'est la convention des lecteurs en ligne.**
     « Le select doit mettre les vitesses dans l'autre sens (plus lente en bas,
     plus rapide en haut), c'est la convention sur tous les players en ligne »
     (l'auteur). Elle n'est pas arbitraire : la liste se déroule vers le bas, et
     l'œil qui descend doit voir le rythme RALENTIR — comme une manette qu'on
     baisse. Trier par valeur croissante était l'ordre du tableur, pas celui du
     geste. */
  const VITESSES = [10, 5, 4, 3, 2.5, 2, 1.75, 1.5, 1.25, 1, 0.75, 0.5, 0.25];
  const facteurAffiche = (v) => tt('vitesseFacteur', { n: formaterFacteur(v) });
  let bVitesse = null;
  let vitesseValeur = null;
  if (options.vitesses !== false && !lecteur.reduced) {
    const courante = lecteur.vitesse ?? 1;
    vitesseValeur = e('span.transport__facteur', {
      texte: facteurAffiche(courante), 'aria-hidden': 'true',
    });
    const choix = e('select.transport__vitesse-choix', {
      'aria-label': tt('vitesse'),
    }, VITESSES.map((v) => e('option', {
      value: String(v),
      texte: facteurAffiche(v),
      ...(v === courante ? { selected: 'selected' } : {}),
    })));
    bVitesse = e('span.transport__bouton.transport__bouton--reglage.transport__vitesse', {}, [
      vitesseValeur,
      e('span.transport__libelle', { texte: tt('vitesseCourt'), 'aria-hidden': 'true' }),
      choix,
    ]);
    bVitesse.dataset.role = 'vitesse';
    choix.addEventListener('change', () => {
      const v = Number(choix.value);
      lecteur.vitesse = v;
      vitesseValeur.textContent = facteurAffiche(v);
      rafraichir();
    });
  }

  /* ══ le RYTHME DES GESTES, SEPTIÈME contrôle — juste après la vitesse ═════
     > « Pas à pas — une opération après l'autre, la suivante ne commence que
     >   quand la précédente est finie. Simultané — toutes les opérations de même
     >   type qui ne touchent pas les mêmes caractères démarrent presque en même
     >   temps. » (l'auteur)

     ★ **IL PREND LA PLACE DES REDITES, IL N'EN EST PAS L'HÉRITIER.** Les redites
       réglaient des DURÉES, et le curseur de vitesse le fait mieux — c'est pour
       cela qu'elles sont parties. Le rythme règle un ORDONNANCEMENT, ce
       qu'aucune vitesse ne sait faire : ×10 sur sept additions simultanées
       donne sept additions simultanées, en plus rapide. Deux réglages voisins
       de place, et sans rien de commun sur le fond.

     ★ **DESSINÉ COMME LA VITESSE, ET POUR LA MÊME RAISON.** Une valeur
       au-dessus, un libellé dessous, un `<select>` transparent par-dessus. Ce
       n'est pas une bascule à deux états qu'on retourne au clic comme le son :
       c'est un CHOIX PARMI DEUX, qui en admettra peut-être un troisième, et un
       `<select>` dit cela quand un bouton-bascule ment dès le troisième. Il
       garde en prime son clavier, son nom accessible et le sélecteur roulant
       des mobiles.

     ★ **PAS D'ICÔNE, ET C'EST UN CHOIX.** Aucun picto de 24 px ne distingue
       « l'un après l'autre » de « tous ensemble » sans légende — et s'il faut la
       légende, l'icône ne sert plus qu'à occuper la place. Le mot occupe donc la
       place lui-même, exactement comme « ×1 » l'occupe pour la vitesse : la
       rangée garde sa hauteur et son alignement, et personne n'a à deviner.

     ★ **IL N'EXISTE QUE S'IL PEUT AGIR**, comme la vitesse, le son et le plein
       écran. Sous `prefers-reduced-motion` ou sans WAAPI, le moteur ne joue
       pas : il pose l'image d'un instant, tous les gestes sont à zéro et il n'y
       a aucun ordre à régler. Le compilateur l'ignore d'ailleurs explicitement
       dans ce mode (`visuel/compile.js`). Un bouton qui ne peut rien faire est
       du bruit ; un bouton présent mais inerte est un mensonge. */
  let bRythme = null;
  let rythmeValeur = null;
  if (options.rythmes !== false && !lecteur.reduced) {
    const nomDuRythme = (r) => tt(r === 'simultane' ? 'rythmeSimultane' : 'rythmePasAPas');
    const courant = rythmeChoisi();
    rythmeValeur = e('span.transport__facteur', {
      texte: nomDuRythme(courant), 'aria-hidden': 'true',
    });
    const choixRythme = e('select.transport__vitesse-choix', {
      'aria-label': tt('rythme'),
    }, RYTHMES.map((r) => e('option', {
      value: r,
      texte: nomDuRythme(r),
      ...(r === courant ? { selected: 'selected' } : {}),
    })));
    bRythme = e('span.transport__bouton.transport__bouton--reglage.transport__vitesse', {}, [
      rythmeValeur,
      e('span.transport__libelle', { texte: tt('rythmeCourt'), 'aria-hidden': 'true' }),
      choixRythme,
    ]);
    bRythme.dataset.role = 'rythme';
    /* Le sélecteur n'appelle rien sur le lecteur : le rythme est une option de
       COMPILATION. Il écrit la préférence, et `onReglages` fait recompiler la
       timeline chez qui l'a construite — exactement comme le faisait la bascule
       des redites, et pour la même raison : les charnières se déplacent. */
    choixRythme.addEventListener('change', () => {
      rythmeValeur.textContent = nomDuRythme(choixRythme.value);
      definirRythme(choixRythme.value);
    });
  }

  /* ── la coupure du son, HUITIÈME contrôle ──
     Même nature que les deux précédents, donc même place et même facture :
     une préférence de lecture, à portée immédiate de ce qu'elle règle. Le
     bouton n'existe QUE s'il y a quelque chose à couper — registre scénique
     ET format lisible par ce navigateur (`options.sons`). Un bouton qui ne
     peut rien faire est du bruit, et un bouton présent mais inerte serait
     précisément le mensonge que ce réglage doit éviter. */
  const sons = options.sons || null;
  const bSon = sons && sons.disponible
    ? boutonTransport('sonCoupe', tt('sonCourt'), tt('sonActiver'))
    : null;
  if (bSon) {
    bSon.classList.add('transport__bouton--reglage');
    bSon.dataset.role = 'son';
  }

  /* ── le plein écran, NEUVIÈME contrôle et dernier de la barre ────────────
     Même famille que les deux précédents : il ne déplace pas la tête de
     lecture, il règle la façon dont on regarde. Et même règle qu'eux — il
     n'existe QUE s'il peut agir. Sur un iPhone, où `requestFullscreen` n'existe
     pas sur les éléments, `disponible` est faux et il n'y a pas de bouton :
     six commandes honnêtes valent mieux que sept dont une ment.

     Il est le DERNIER, et pas par hasard : c'est le seul dont l'effet déborde
     de la démonstration — il change ce qu'on voit de la page entière. Le lire
     en bout de rangée, après ce qui règle la vitesse, le rythme puis le son,
     suit l'ordre du plus local au plus général. */
  const plein = options.pleinEcran || null;
  const bPlein = plein && plein.disponible
    ? boutonTransport('pleinEcran', tt('pleinEcranCourt'), tt('pleinEcran'))
    : null;
  if (bPlein) {
    bPlein.classList.add('transport__bouton--reglage');
    bPlein.dataset.role = 'pleinEcran';
  }

  /* ══ LES RÉGLAGES SONT UN BLOC, ET C'EST CE BLOC QUI PASSE À LA LIGNE ══════
     > « En portrait, la scène déborde sur le côté […] ce player doit passer sur
     >   2 lignes sur écran étroit (en coupant après Fin, pour que vitesse,
     >   redite, agrandir et son soient sur la 2nde ligne) » (l'auteur ;
     >   « redite » est depuis devenu « rythme », mais la consigne de coupure
     >   est la même, et le bloc qui bascule est toujours le même bloc).

     ⚠️ **LE DÉBORDEMENT VENAIT D'ICI, ET IL TIRAIT LA SCÈNE AVEC LUI.** Mesuré
       sur un écran de 390 px : la barre réclamait 466 px de large (526 avec le
       bouton du son), la colonne `.demo__scene` s'élargissait pour la contenir,
       et le SVG, qui fait `width: 100%`, sortait de l'écran à sa suite. Le
       coupable n'était donc pas le moteur visuel — sa `viewBox` est fixe — mais
       une rangée de neuf boutons qui ne savait pas se replier.

     ★ **UN CONTENEUR PLUTÔT QU'UN POINT DE RUPTURE EN PIXELS.** On aurait pu
       poser un séparateur `flex-basis: 100%` sous une largeur donnée. Il aurait
       fallu la calculer, et elle n'est PAS calculable : la barre porte de six à
       neuf contrôles selon ce que le navigateur permet (son, plein écran), et
       les libellés — visibles au-delà de 560 px — n'ont pas la même longueur en
       français et en anglais. Toute valeur écrite ici aurait été juste pour une
       combinaison et fausse pour les autres. Les quatre réglages étant réunis
       dans un seul élément flex, c'est le navigateur qui décide : le bloc reste
       en bout de rangée tant qu'il y tient, et bascule d'un seul tenant sur une
       seconde ligne dès qu'il n'y tient plus. La coupure tombe donc toujours
       APRÈS « Fin », sans qu'aucun seuil n'ait à être maintenu. */
  const reglages = [
    // La vitesse EN TÊTE : le plus général devant, le plus particulier
    // derrière — voir le pavé de `bVitesse`.
    ...(bVitesse ? [bVitesse] : []), ...(bRythme ? [bRythme] : []),
    ...(bSon ? [bSon] : []), ...(bPlein ? [bPlein] : []),
  ];
  /* Aucun réglage disponible — la révélation du logo, un navigateur sans plein
     écran ni son en mouvement réduit : pas de conteneur vide. Une boîte flex
     sans enfant compterait quand même dans la gouttière de la rangée. */
  const blocReglages = reglages.length ? e('div.transport__reglages', {}, reglages) : null;

  const barre = e('div.transport', {
    role: 'group',
    'aria-label': tt('groupe'),
  }, [bDebut, bPrec, bLect, bSuiv, bFin, ...(blocReglages ? [blocReglages] : [])]);

  const element = e('div.transport-groupe', {}, [jauge, barre]);

  /* Un bouton neutralisé reste focusable : on refuse simplement l'action. */
  const agir = (bouton, action) => bouton.addEventListener('click', () => {
    if (bouton.getAttribute('aria-disabled') === 'true') return;
    action();
    rafraichir();
  });
  agir(bDebut, () => lecteur.toStart());
  agir(bPrec, () => lecteur.prev());
  agir(bSuiv, () => lecteur.next());
  agir(bFin, () => lecteur.toEnd());
  bLect.addEventListener('click', () => {
    dejaLance = true;
    lecteur.playing ? lecteur.pause() : lecteur.play();
    rafraichir();
  });
  // ★ Le clic sur ce bouton EST un geste utilisateur : c'est donc l'occasion
  //   où le navigateur laissera passer le son. On bascule la préférence, et le
  //   joueur en profite pour se déverrouiller (`sons.js › sonder`, branché sur
  //   `pointerdown`). L'ordre n'a pas d'importance — la sonde a déjà eu lieu au
  //   `pointerdown`, avant le `click`.
  if (bSon) bSon.addEventListener('click', basculerSon);
  /* ★ SYNCHRONE, et sans `rafraichir()` derrière.
     `requestFullscreen` exige une activation utilisateur : elle est consommée
     par tout ce qui attend une promesse avant l'appel. On appelle donc droit,
     dans le gestionnaire. Et on ne repeint RIEN ici — la demande peut être
     refusée, différée, ou déjà annulée par l'utilisateur avant d'aboutir. Le
     bouton se repeint sur `fullscreenchange`, qui est le seul évènement qui
     dise ce qui s'est réellement passé. */
  if (bPlein) bPlein.addEventListener('click', () => { plein.basculer(); });

  let dejaLance = false;

  const neutraliser = (b, off) => b.setAttribute('aria-disabled', off ? 'true' : 'false');

  function rafraichir() {
    const debut = lecteur.atStart;
    const fin = lecteur.atEnd;
    neutraliser(bDebut, debut);
    neutraliser(bPrec, debut);
    neutraliser(bSuiv, fin);
    neutraliser(bFin, fin);

    // Un seul bouton, nom accessible variable, pas d'aria-pressed.
    const enLecture = lecteur.playing;
    const nom = enLecture ? tt('pause') : (fin ? tt('rejouer') : tt('lancer'));
    bLect.setAttribute('aria-label', nom);
    bLect._libelle.textContent = enLecture
      ? tt('pauseCourt')
      : (fin ? tt('rejouerCourt') : tt('lectureCourt'));
    const neuve = enLecture ? ICONES.pause() : ICONES.lecture();
    bLect.replaceChild(neuve, bLect._icone);
    bLect._icone = neuve;
    if (dejaLance || enLecture) bLect.removeAttribute('data-vierge');
    else bLect.setAttribute('data-vierge', '1');

    const courant = lecteur.stepIndex;
    const etapes = lecteur.steps || [];
    cases.forEach((c, i) => {
      c.dataset.etat = i < courant ? 'franchie' : (i === courant ? 'courante' : 'a-venir');
      if (i === courant) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
  }

  /* ★ Le bouton du son dit L'ÉTAT RÉEL, pas la préférence.
     Trois états, pas deux (voir `src/app/sons.js`) : coupé ; actif ; et
     « actif, mais le navigateur n'a pas encore laissé passer » — le cas d'un
     visiteur qui revient avec sa préférence retrouvée, sur une page qui
     s'autojoue et où rien ne sort encore. Afficher « son activé » à cet
     instant serait un mensonge, et c'est exactement celui que ce bouton
     existe pour éviter. Comme Lecture/Pause, le NOM ACCESSIBLE dit ce qu'un
     clic FERA, jamais `aria-pressed`. */
  function peindreSon() {
    if (!bSon) return;
    const actif = sonActif();
    const attente = actif && !sons.debloque;
    const etat = actif ? (attente ? 'attente' : 'actif') : 'coupe';
    const nom = actif ? tt('sonCouper') : tt('sonActiver');
    bSon.setAttribute('aria-label', nom);
    bSon.dataset.etat = etat;
    const neuve = ICONES[etat === 'coupe' ? 'sonCoupe' : (etat === 'attente' ? 'sonAttente' : 'sonActif')]();
    bSon.replaceChild(neuve, bSon._icone);
    bSon._icone = neuve;
  }

  /* ★ LE PLEIN ÉCRAN DIT CE QU'UN CLIC FERA, comme Lecture/Pause et comme le
     son : un seul bouton, un NOM ACCESSIBLE variable, jamais `aria-pressed`.
     Les deux ensemble produiraient l'annonce contradictoire « Quitter le plein
     écran, activé ».

     ★ Et son état ne vient PAS d'ici. `plein.actif()` relit
     `document.fullscreenElement` : `Échap`, le menu du navigateur ou un refus
     de la demande changent l'état sans nous prévenir autrement que par
     `fullscreenchange`. Un drapeau tenu dans cette fermeture mentirait dans les
     trois cas, et il mentirait précisément sur le bouton qui sert à sortir. */
  function peindrePleinEcran() {
    if (!bPlein) return;
    const dedans = plein.actif();
    bPlein.setAttribute('aria-label', libellePleinEcran());
    bPlein._libelle.textContent = dedans ? tt('sortiePleinEcranCourt') : tt('pleinEcranCourt');
    bPlein.dataset.etat = dedans ? 'plein' : 'fenetre';
    const neuve = dedans ? ICONES.sortiePleinEcran() : ICONES.pleinEcran();
    bPlein.replaceChild(neuve, bPlein._icone);
    bPlein._icone = neuve;
  }
  /* L'infobulle lit une FONCTION, pas une chaîne figée : le libellé de ce
     bouton change d'état, et une bulle attachée une fois pour toutes
     annoncerait « Passer en plein écran » alors qu'on en sort. C'est le même
     texte que le nom accessible — deux formulations du même fait finiraient
     par diverger (voir les dalles de la jauge, plus haut). */
  function libellePleinEcran() {
    return plein.actif() ? tt('sortiePleinEcran') : tt('pleinEcran');
  }
  if (bPlein) detachements.push(infobuller(bPlein, libellePleinEcran));

  /* ★ LES DEUX DERNIERS `title` NATIFS S'EN VONT.
     Ils avaient survécu au passage des dalles d'étape à l'infobulle maison, et
     c'était une incohérence : un `title` natif n'est pas stylable, paraît après
     un délai qu'on ne choisit pas, s'efface au bout de quelques secondes alors
     qu'on le lit, et ne sait pas aller à la ligne. Les raisons qui l'ont banni
     ailleurs valaient ici aussi.

     ⚠ Le libellé de ces boutons CHANGE d'état — son coupé, actif ou en
     attente ; plein écran ou fenêtre. On passe donc une FONCTION, que l'infobulle
     rappelle à chaque ouverture : un texte figé à la construction mentirait dès
     la première bascule. Le son a en outre un mot de plus lorsqu'il attend un
     geste du navigateur, que son nom accessible ne porte pas — c'est
     précisément le genre de précision qu'une infobulle sait dire et qu'un nom
     accessible n'a pas à répéter. */
  if (bSon) {
    detachements.push(infobuller(bSon, () => {
      const attente = sonActif() && !sons.debloque;
      return attente ? tt('sonEnAttente') : bSon.getAttribute('aria-label');
    }));
  }

  // `rafraichir` suit le lecteur — donc chaque image de la lecture. Les
  // bascules, elles, ne suivent que les réglages : elles se repeignent sur
  // `onReglages`, pas soixante fois par seconde pour rien. Le bouton du son
  // écoute EN PLUS le joueur, qui prévient quand le déblocage change — c'est
  // un fait du navigateur, pas une préférence, et rien d'autre ne le sait.
  // Le plein écran, lui, n'écoute QUE le navigateur : ce n'est ni un réglage
  // persisté ni un état du lecteur.
  const desabonner = lecteur.on ? lecteur.on('change', rafraichir) : () => {};
  const desabonnerReglages = bSon ? onReglages(peindreSon) : () => {};
  const desabonnerSons = bSon ? sons.on(peindreSon) : () => {};
  const desabonnerPlein = bPlein ? plein.on(peindrePleinEcran) : () => {};
  peindreSon();
  peindrePleinEcran();
  rafraichir();

  return {
    element,
    rafraichir,
    detruire() {
      if (typeof desabonner === 'function') desabonner();
      desabonnerReglages();
      desabonnerSons();
      desabonnerPlein();
      detachements.forEach((off) => off());
    },
  };
}

/** Raccourcis clavier, actifs quand le focus est dans la région de démonstration
 *  et jamais quand il est dans un champ de saisie. */
export function brancherClavier(region, lecteur, { surAide } = {}) {
  const dansUnChamp = (cible) =>
    cible && (cible.matches('input, textarea, select') || cible.isContentEditable);
  // Espace et Entrée appartiennent au contrôle qui a le focus : on ne les vole pas.
  const surUnControle = (cible) => cible && cible.matches('button, a[href], summary, [role="button"]');

  const surTouche = (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (dansUnChamp(ev.target)) return;
    if ((ev.key === ' ' || ev.key === 'Enter') && surUnControle(ev.target)) return;
    const k = ev.key;
    const bas = k.length === 1 ? k.toLowerCase() : k;
    let pris = true;
    if (k === ' ' || bas === 'k') lecteur.playing ? lecteur.pause() : lecteur.play();
    else if (k === 'ArrowLeft' || bas === 'j') lecteur.prev();
    else if (k === 'ArrowRight' || bas === 'l') lecteur.next();
    else if (k === 'Home') lecteur.toStart();
    else if (k === 'End') lecteur.toEnd();
    else if (k === '?' && surAide) surAide();
    else pris = false;
    if (pris) ev.preventDefault();   // Espace ne doit pas faire défiler la page
  };

  region.addEventListener('keydown', surTouche);
  return () => region.removeEventListener('keydown', surTouche);
}
