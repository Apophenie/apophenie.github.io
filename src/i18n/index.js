/** Le point d'entrée i18n de l'application — singleton + effets de bord DOM.
 *
 *  Toute la logique testable vit dans `resolution.js` et `etat.js` ; ce module
 *  ne fait que la brancher sur le vrai navigateur :
 *    · `localStorage` pour la persistance du choix ;
 *    · `navigator.languages` pour la détection initiale ;
 *    · `lang` sur `<html>`, tenu à jour à chaque changement ;
 *    · les rares nœuds statiques d'`index.html` (`data-i18n`), que le routeur
 *      ne reconstruit pas — le pied de page et le lien d'évitement.
 *
 *  Deux langues, pas une de plus (CONTRACTS §6 est écrit en français ; l'anglais
 *  est la seule autre langue servie). Le français reste la langue de repli :
 *  une clé absente en anglais s'affiche en français plutôt que de disparaître. */

import { creerI18n } from './etat.js';
import { fr } from './fr.js';
import { en } from './en.js';

export { LANGUES, LANGUE_DEFAUT, localiser as localiserAvec } from './resolution.js';

const dictionnaires = { fr, en };

const environnement = typeof window !== 'undefined' ? window : {};

const i18n = creerI18n({
  dictionnaires,
  magasin: (() => {
    try { return environnement.localStorage || null; } catch { return null; }
  })(),
  languesNavigateur: (() => {
    const nav = environnement.navigator;
    if (!nav) return [];
    return (Array.isArray(nav.languages) && nav.languages.length)
      ? nav.languages
      : (nav.language ? [nav.language] : []);
  })(),
});

export const langue = i18n.langue;
export const langueChoisie = i18n.langueChoisie;
export const onLangue = i18n.onLangue;
export const t = i18n.t;
export const v = i18n.v;
export const autonyme = i18n.autonyme;

/** Libellé `{fr, en}` venu du catalogue ou du moteur, rendu dans la langue
 *  courante. On **consomme** cette forme, on ne la redéfinit pas. */
export const localiser = i18n.localiser;

/** Les deux langues, dans l'ordre d'affichage du sélecteur. */
export const LANGUES_OFFERTES = ['fr', 'en'];

/* ─────────────────────────── Application au DOM ─────────────────────────── */

/** Traduit les nœuds statiques d'`index.html` que le routeur ne refait jamais.
 *  `data-i18n` remplace le texte ; `data-i18n-html` remplace le balisage (le
 *  pied de page contient `<em>` et un lien de licence) ; `data-i18n-attr`
 *  vise un attribut, sous la forme `attribut:chemin`. */
export function traduireStatique(racine = (typeof document !== 'undefined' ? document : null)) {
  if (!racine || !racine.querySelectorAll) return;
  for (const el of racine.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.getAttribute('data-i18n'));
  }
  for (const el of racine.querySelectorAll('[data-i18n-html]')) {
    // Contenu de confiance : nos propres dictionnaires, jamais de saisie utilisateur.
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  }
  for (const el of racine.querySelectorAll('[data-i18n-attr]')) {
    for (const paire of el.getAttribute('data-i18n-attr').split(/\s+/)) {
      const sep = paire.indexOf(':');
      if (sep > 0) el.setAttribute(paire.slice(0, sep), t(paire.slice(sep + 1)));
    }
  }
}

/** Pose `lang` sur `<html>` — indispensable aux synthèses vocales, à la
 *  césure et au choix de fonte. */
export function appliquerLangue() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('lang', langue());
  traduireStatique(document);
}

/** Le document se met à jour AVANT tout autre auditeur : l'abonnement est posé
 *  ici, à l'import, donc avant celui du routeur. L'ordre d'un `Set` est celui de
 *  l'insertion — quand le routeur reconstruit les pages, `<html lang>` est déjà
 *  juste. */
i18n.onLangue(() => appliquerLangue());

/** Change la langue, persiste le choix, met le document à jour, prévient. */
export const definirLangue = i18n.definirLangue;
