/** Page d'accueil. */

import { e, qs } from '../dom.js';
import { logoTitre } from '../logo.js';
import { t, v } from '../../i18n/index.js';
import * as pont from '../pont.js';
import { interrupteurs } from '../entete.js';

const SEUIL_COMPTEUR = 200;

export function pageAccueil({ saisieInitiale = '' } = {}) {
  const plafond = pont.LIMITE_SAISIE();

  const champ = e('input#saisie.champ', {
    type: 'text',
    name: 'saisie',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    maxlength: String(plafond),
    placeholder: t('accueil.placeholder'),
    'aria-describedby': 'aide-saisie',
    value: saisieInitiale,
  });

  const compteur = e('span#compteur-saisie.compteur', { hidden: true, 'aria-hidden': 'true' });
  const erreur = e('p#erreur-saisie.message-erreur', { role: 'alert' });
  const aide = e('p#aide-saisie.legende', { texte: t('accueil.aide', { plafond }) });

  const bouton = e('button.bouton-primaire', { type: 'submit', texte: t('accueil.reveler') });

  const formulaire = e('form.champ-groupe', { novalidate: true }, [
    e('label', { for: 'saisie', texte: t('accueil.label') }),
    e('div.champ-boite', {}, [champ, compteur]),
    bouton,
    erreur,
    aide,
  ]);

  function majCompteur() {
    const n = champ.value.length;
    if (n < SEUIL_COMPTEUR) { compteur.hidden = true; return; }
    compteur.hidden = false;
    compteur.textContent = `${n}/${plafond}`;
    compteur.classList.toggle('compteur--limite', n >= plafond);
  }
  champ.addEventListener('input', () => {
    majCompteur();
    if (erreur.textContent) {
      erreur.textContent = '';
      champ.removeAttribute('aria-invalid');
    }
  });
  majCompteur();

  formulaire.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const saisie = champ.value.trim();
    if (!saisie) {
      // Le bouton n'est jamais désactivé : une impasse silencieuse est pire.
      erreur.textContent = t('accueil.erreurVide');
      champ.setAttribute('aria-invalid', 'true');
      champ.setAttribute('aria-describedby', 'erreur-saisie aide-saisie');
      champ.focus();
      return;
    }
    const hash = pont.ecrireHash({ saisie });
    if (!hash) {
      erreur.textContent = t('accueil.erreurUrl');
      return;
    }
    bouton.setAttribute('aria-busy', 'true');
    bouton.textContent = t('accueil.consultation');
    location.hash = hash;
  });

  const exemples = e('div.exemples', {}, [
    e('p.exemples__titre', { texte: t('accueil.exemplesTitre') }),
    e('div.exemples__liste', {}, (v('accueil.exemples') || []).map((x) => e('button.puce', {
      type: 'button',
      texte: x,
      sur: {
        click: () => {
          champ.value = x;
          majCompteur();
          champ.focus();
        },
      },
    }))),
  ]);

  return e('div.accueil', {}, [
    e('div.accueil__reglages', {}, [interrupteurs()]),
    logoTitre() || e('h1', { texte: t('global.titre') }),
    e('p.accueil__baseline', { texte: t('accueil.baseline') }),
    e('div.accueil__filet', { role: 'presentation' }),
    formulaire,
    exemples,
    e('div.accueil__mentions', {}, [
      e('p', { texte: t('accueil.mentionCalcul') }),
      e('p', { texte: t('accueil.mentionParodie') }),
    ]),
  ]);
}

/** Le champ reçoit le focus quand on arrive depuis une page interne. */
export function focaliserSaisie(racine) {
  const champ = qs('#saisie', racine);
  if (champ) champ.focus({ preventScroll: true });
}
