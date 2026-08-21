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
 */

import { e, svg as s } from './dom.js';
import { t } from '../i18n/index.js';
import { interpoler } from '../i18n/resolution.js';
import { titreEtape } from './libelles.js';

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
 * @returns {{element:HTMLElement, rafraichir:Function, detruire:Function}}
 */
export function creerTransport(lecteur, libelles = {}) {
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

  const barre = e('div.transport', {
    role: 'group',
    'aria-label': tt('groupe'),
  }, [bDebut, bPrec, bLect, bSuiv, bFin]);

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
    cases.forEach((c, i) => {
      c.dataset.etat = i < courant ? 'franchie' : (i === courant ? 'courante' : 'a-venir');
      if (i === courant) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
  }

  const desabonner = lecteur.on ? lecteur.on('change', rafraichir) : () => {};
  rafraichir();

  return {
    element,
    rafraichir,
    detruire() { if (typeof desabonner === 'function') desabonner(); },
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
