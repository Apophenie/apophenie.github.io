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
 *  Une seule exception au « pur reflet » : la BASCULE DES REDITES. Ce n'est pas
 *  une commande d'avancement, c'est une préférence de lecture — mais elle règle
 *  le rythme de l'avancement, donc sa place est ici, à côté des cinq boutons, et
 *  pas dans la barre haute avec le thème. Elle n'agit pas sur le lecteur : elle
 *  écrit dans `reglages.js`, et c'est la page de démonstration qui, prévenue,
 *  fait recompiler la timeline. La barre reste un reflet, d'un réglage cette
 *  fois plutôt que du lecteur.
 */

import { e, svg as s } from './dom.js';
import { t } from '../i18n/index.js';
import { interpoler } from '../i18n/resolution.js';
import { titreEtape } from './libelles.js';
import {
  repetitionsAccelerees, basculerRepetitions, animationEffective,
  sonActif, basculerSon, onReglages,
} from './reglages.js';

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
  // Les redites : DEUX chevrons quand elles filent, UN quand elles se lisent en
  // entier — l'idiome universel de la vitesse de lecture, et le seul qui tienne
  // à 24 px. La barre oblique a été essayée puis abandonnée : sur un chevron au
  // trait de 2 px, le liseré de fond qui l'empêche de se fondre dedans hachait
  // le glyphe en morceaux illisibles.
  //
  // Ces deux-là sont AU TRAIT quand les cinq commandes d'avancement sont
  // pleines : la différence de facture dit du premier coup d'œil que ce bouton
  // règle quelque chose au lieu de déplacer la tête de lecture.
  rapide: () => ico(
    s('path', { class: 'ico-trait', d: 'M4 6 L10 12 L4 18' }),
    s('path', { class: 'ico-trait', d: 'M13 6 L19 12 L13 18' })),
  pleines: () => ico(
    s('path', { class: 'ico-trait', d: 'M8 5 L15 12 L8 19' })),
  // Le son : le haut-parleur, et ses ondes ou sa croix. Au TRAIT comme les
  // redites — même famille de facture, parce que c'est le même genre de
  // bouton : il règle, il ne déplace pas la tête de lecture.
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
};

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
 * @param {{repetitions?:boolean|number}} [options] une valeur véridique ajoute
 *   la bascule « redites accélérées » ; un nombre donne en plus le facteur à
 *   annoncer dans le libellé. Réservé aux démonstrations : la révélation du
 *   logo ne répète aucun geste, le bouton n'y aurait rien à régler.
 * @returns {{element:HTMLElement, rafraichir:Function, detruire:Function}}
 */
export function creerTransport(lecteur, libelles = {}, options = {}) {
  const nbEtapes = Math.max(1, (lecteur.steps || []).length);
  const tt = (cle, params) => (libelles[cle] !== undefined
    ? interpoler(libelles[cle], params)
    : t(`transport.${cle}`, params));

  /* ── la jauge : une case par transformation, en vrais boutons ── */
  const cases = [];
  const jauge = e('div.jauge', {
    role: 'group',
    'aria-label': tt('jauge'),
  });
  for (let i = 0; i < nbEtapes; i++) {
    const etape = (lecteur.steps || [])[i] || {};
    // Le titre de l'étape vient du scénario : forme `{fr, en}` du catalogue.
    const titre = etape.title ? titreEtape(etape, i) : '';
    const c = e('button.jauge__case', {
      type: 'button',
      'aria-label': titre
        ? tt('jaugeCaseTitree', { i: i + 1, total: nbEtapes, titre })
        : tt('jaugeCase', { i: i + 1, total: nbEtapes }),
      sur: { click: () => lecteur.seekToStep(i) },
    });
    cases.push(c);
    jauge.appendChild(c);
  }

  /* ── les cinq contrôles ── */
  const bDebut = boutonTransport('debut', tt('debutCourt'), tt('debut'));
  const bPrec = boutonTransport('precedent', tt('precCourt'), tt('precedent'));
  const bLect = boutonTransport('lecture', tt('lectureCourt'), tt('lancer'), true);
  const bSuiv = boutonTransport('suivant', tt('suivCourt'), tt('suivant'));
  const bFin = boutonTransport('fin', tt('finCourt'), tt('fin'));

  /* ── la bascule des redites, sixième contrôle et seule préférence ──
     Elle ne pilote pas le lecteur, elle règle le RYTHME de ce que les cinq
     autres parcourent : c'est pourquoi elle vit ici et pas dans la barre haute.
     Un bouton unique à nom accessible variable, sans `aria-pressed` — même
     règle que Lecture/Pause. */
  const facteurRedites = typeof options.repetitions === 'number' ? options.repetitions : 5;
  const bRedites = options.repetitions
    ? boutonTransport('rapide', tt('reditesCourt'), tt('reditesAccelerer', { facteur: facteurRedites }))
    : null;
  if (bRedites) {
    bRedites.classList.add('transport__bouton--reglage');
    bRedites.dataset.role = 'redites';
  }

  /* ── la coupure du son, SEPTIÈME contrôle, juste après les redites ──
     Même nature que la bascule des redites, donc même place et même facture :
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

  const barre = e('div.transport', {
    role: 'group',
    'aria-label': tt('groupe'),
  }, [bDebut, bPrec, bLect, bSuiv, bFin,
    ...(bRedites ? [bRedites] : []), ...(bSon ? [bSon] : [])]);

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
  // La bascule n'appelle rien sur le lecteur : elle écrit la préférence, et
  // `onReglages` fait recompiler la timeline chez qui l'a construite.
  if (bRedites) bRedites.addEventListener('click', basculerRepetitions);
  // ★ Le clic sur ce bouton EST un geste utilisateur : c'est donc l'occasion
  //   où le navigateur laissera passer le son. On bascule la préférence, et le
  //   joueur en profite pour se déverrouiller (`sons.js › sonder`, branché sur
  //   `pointerdown`). L'ordre n'a pas d'importance — la sonde a déjà eu lieu au
  //   `pointerdown`, avant le `click`.
  if (bSon) bSon.addEventListener('click', basculerSon);

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
      // Une case plus étroite pour les redites accélérées : la jauge dit alors
      // POURQUOI ça vient de filer, sans mentir sur le nombre d'étapes.
      // `rafraichir` tourne à chaque image pendant la lecture : on n'écrit que
      // si la valeur change, sinon c'est un recalcul de style par image et par
      // case pour rien.
      const redite = !!(etapes[i] && etapes[i].accelerated);
      if (redite === (c.dataset.redite === '1')) return;
      if (redite) c.dataset.redite = '1';
      else delete c.dataset.redite;
    });
  }

  /* Le bouton dit ce qu'un clic FERA, comme Lecture/Pause. En mouvement réduit,
     il n'y a plus de trajet à abréger — seulement un temps de lecture — et le
     compilateur ignore l'accélération : on le dit au lieu de faire semblant. */
  function peindreRedites() {
    if (!bRedites) return;
    const rapide = repetitionsAccelerees();
    const sansEffet = animationEffective() === 'reduite';
    const nom = sansEffet
      ? tt('reditesSansEffet')
      : (rapide ? tt('reditesRalentir') : tt('reditesAccelerer', { facteur: facteurRedites }));
    bRedites.setAttribute('aria-label', nom);
    bRedites.setAttribute('title', nom);
    bRedites.dataset.etat = rapide ? 'accelerees' : 'pleines';
    if (sansEffet) bRedites.dataset.inoperant = '1';
    else delete bRedites.dataset.inoperant;
    const neuve = rapide ? ICONES.rapide() : ICONES.pleines();
    bRedites.replaceChild(neuve, bRedites._icone);
    bRedites._icone = neuve;
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
    bSon.setAttribute('title', attente ? tt('sonEnAttente') : nom);
    bSon.dataset.etat = etat;
    const neuve = ICONES[etat === 'coupe' ? 'sonCoupe' : (etat === 'attente' ? 'sonAttente' : 'sonActif')]();
    bSon.replaceChild(neuve, bSon._icone);
    bSon._icone = neuve;
  }

  // `rafraichir` suit le lecteur — donc chaque image de la lecture. Les deux
  // bascules, elles, ne suivent que les réglages : elles se repeignent sur
  // `onReglages`, pas soixante fois par seconde pour rien. Le bouton du son
  // écoute EN PLUS le joueur, qui prévient quand le déblocage change — c'est
  // un fait du navigateur, pas une préférence, et rien d'autre ne le sait.
  const desabonner = lecteur.on ? lecteur.on('change', rafraichir) : () => {};
  const desabonnerReglages = (bRedites || bSon)
    ? onReglages(() => { peindreRedites(); peindreSon(); })
    : () => {};
  const desabonnerSons = bSon ? sons.on(peindreSon) : () => {};
  peindreRedites();
  peindreSon();
  rafraichir();

  return {
    element,
    rafraichir,
    detruire() {
      if (typeof desabonner === 'function') desabonner();
      desabonnerReglages();
      desabonnerSons();
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
