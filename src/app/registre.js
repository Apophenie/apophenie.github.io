/** Le Registre — l'équivalent textuel de la scène.
 *
 *  La scène SVG est `aria-hidden` : elle ne porte aucune information pour les
 *  technologies d'assistance. Le Registre n'est donc PAS un bonus, c'est
 *  l'équivalent accessible obligatoire (CONTRACTS §6) et le repli quand le
 *  moteur visuel échoue. La page reste valide sans la scène.
 *
 *  Il porte aussi la région live : mise à jour aux SEULES charnières, une
 *  annonce par étape au maximum — sinon la lecture continue noie le lecteur
 *  d'écran. */

import { e } from './dom.js';
import { badgeT } from './typo.js';
import { t } from '../i18n/index.js';
import { titreEtape, legendeEtape } from './libelles.js';

/**
 * @param {Object} lecteur   l'API du lecteur (pur reflet)
 * @param {{titre?:string}} [options]
 */
export function creerRegistre(lecteur, options = {}) {
  const etapes = lecteur.steps || [];
  const total = etapes.length;
  const items = [];

  const liste = e('ol.registre__liste');
  etapes.forEach((etape, i) => {
    const bouton = e('button.registre__lien', {
      type: 'button',
      sur: { click: () => lecteur.seekToStep(i) },
    }, [
      e('span.registre__num', { texte: String(i + 1) + '.', 'aria-hidden': 'true' }),
      e('span', {}, [
        e('span', { texte: titreEtape(etape, i) }),
        legendeEtape(etape)
          ? e('span.registre__calcul', { texte: legendeEtape(etape) })
          : null,
      ]),
    ]);
    const li = e('li.registre__item', {}, [bouton]);
    items.push(li);
    liste.appendChild(li);
  });

  const region = e('p#etape-courante.etape-courante.region-live', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  const bloc = e('section.registre', { 'aria-labelledby': 'registre-titre' }, [
    e('h2#registre-titre.h2-machine', { texte: t('registre.titre') }),
    liste,
  ]);

  let dernierAnnonce = -1;

  /** Texte de l'étape i, tel qu'annoncé et affiché. */
  function phraseEtape(i) {
    const etape = etapes[i];
    if (!etape) return '';
    return t('registre.etape', { i: i + 1, total, titre: titreEtape(etape, i) });
  }

  function marquer(i) {
    items.forEach((li, k) => {
      if (k === i) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  /** Appelé aux charnières uniquement (évènement `stepenter`).
   *  `src/visuel/player.js` émet `{stepIndex, step}` ; le lecteur de secours
   *  émet un entier. On accepte les deux plutôt que d'imposer une forme. */
  function surCharniere(arg) {
    const i = typeof arg === 'number' ? arg : (arg && arg.stepIndex) || 0;
    marquer(i);
    if (i === dernierAnnonce) return;      // au plus une annonce par étape
    dernierAnnonce = i;
    const etape = etapes[i];
    region.textContent = '';
    region.appendChild(e('strong', { texte: phraseEtape(i) }));
    const legende = legendeEtape(etape);
    if (legende) region.appendChild(document.createTextNode(' ' + legende));
  }

  function annoncerFin(resultat) {
    region.textContent = t('registre.termine', { resultat: resultat || '666' });
  }

  const off1 = lecteur.on ? lecteur.on('stepenter', surCharniere) : () => {};
  const off2 = lecteur.on ? lecteur.on('end', () => annoncerFin(options.resultat)) : () => {};
  surCharniere(lecteur.stepIndex || 0);

  return {
    element: bloc,
    regionLive: region,
    badge: (i) => badgeT(i, total),
    detruire() { if (typeof off1 === 'function') off1(); if (typeof off2 === 'function') off2(); },
  };
}
