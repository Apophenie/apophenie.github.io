/** Les réglages de la barre haute : animation, thème, langue.
 *
 *  Trois contrôles, deux mécaniques :
 *    · l'animation reste une BASCULE à deux états (complète / réduite) — un
 *      bouton unique à nom accessible variable, sans `aria-pressed` ;
 *    · le thème et la langue sont des SÉLECTEURS repliés (`selecteur.js`), parce
 *      qu'ils ont plus de deux états : le thème en a trois (clair / auto /
 *      sombre) et « auto » n'est pas l'absence de choix, c'est un choix.
 *
 *  Aucun texte en dur : tout passe par `src/i18n/`. */

import { e } from './dom.js';
import { icoAnimation, PICTOS_THEME, PICTOS_LANGUE } from './pictos.js';
import { creerSelecteur } from './selecteur.js';
import {
  THEMES, definirTheme, themePrefere, basculerAnimation, animationEffective, onReglages,
} from './reglages.js';
import { t, langue, definirLangue, autonyme, LANGUES_OFFERTES } from '../i18n/index.js';

const ID_THEME = 'selecteur-theme';
const ID_LANGUE = 'selecteur-langue';

/* ───────────────────────────── L'animation ───────────────────────────── */

function boutonAnimation() {
  const bouton = e('button.interrupteur', { type: 'button' });

  function peindre() {
    const complete = animationEffective() === 'complete';
    const nom = t(complete ? 'entete.animation.reduire' : 'entete.animation.retablir');
    bouton.replaceChildren(icoAnimation(complete), e('span.visuellement-cachee', { texte: nom }));
    bouton.setAttribute('aria-label', nom);
    bouton.setAttribute('title', nom);
  }

  bouton.addEventListener('click', basculerAnimation);
  peindre();
  return { element: bouton, peindre };
}

/* ────────────────────────────── Le thème ────────────────────────────── */

function selecteurTheme() {
  return creerSelecteur({
    id: ID_THEME,
    label: t('entete.theme.label'),
    titre: (libelle) => t('entete.theme.titre', { valeur: libelle }),
    options: THEMES.map((valeur) => ({
      valeur,
      libelle: t(`entete.theme.${valeur}`),
      picto: PICTOS_THEME[valeur],
    })),
    valeur: themePrefere,
    surChoix: definirTheme,
  });
}

/* ────────────────────────────── La langue ───────────────────────────── */

function selecteurLangue() {
  return creerSelecteur({
    id: ID_LANGUE,
    label: t('entete.langue.label'),
    titre: (libelle) => t('entete.langue.titre', { valeur: libelle }),
    // L'autonyme, jamais traduit : on écrit « English » en français et
    // « Français » en anglais. C'est la seule façon de rester lisible par qui
    // ne comprend pas la langue affichée.
    options: LANGUES_OFFERTES.map((code) => ({
      valeur: code,
      libelle: autonyme(code),
      picto: PICTOS_LANGUE[code],
    })),
    valeur: langue,
    surChoix: (code) => {
      definirLangue(code);
      // Le changement de langue fait re-router toute la page : le déclencheur
      // qu'on vient de quitter n'existe plus. On rend le focus à son remplaçant,
      // sinon il retomberait sur `<body>` et la navigation clavier serait perdue.
      queueMicrotask(() => {
        const neuf = document.getElementById(ID_LANGUE);
        if (neuf) neuf.focus();
      });
    },
  });
}

/* ──────────────────────────── L'assemblage ──────────────────────────── */

/** Le groupe de réglages, tel qu'il apparaît dans la barre haute et sur
 *  l'accueil. S'auto-repeint sur tout changement de réglage. */
export function interrupteurs() {
  const anim = boutonAnimation();
  const theme = selecteurTheme();
  const lang = selecteurLangue();

  const groupe = e('div.reglages', {
    role: 'group',
    'aria-label': t('entete.reglages'),
  }, [anim.element, theme.element, lang.element]);

  // Le routeur remplace la barre haute en bloc, sans prévenir personne : plutôt
  // qu'un observateur permanent, l'abonnement se coupe LUI-MÊME à la première
  // notification reçue alors qu'il n'est plus dans le document. Coût nul en
  // régime normal, aucune fuite d'une navigation à l'autre.
  const desabonner = onReglages(() => {
    if (!groupe.isConnected) {
      desabonner();
      theme.detruire();
      lang.detruire();
      return;
    }
    anim.peindre();
    theme.peindre();
  });

  return groupe;
}
