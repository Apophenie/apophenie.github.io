/** La jauge de recherche — « pas un waiter à durée non identifiée ».
 *
 *  « L'important n'est pas que ça paraisse instantané, mais que l'utilisateur
 *  voie que c'est en cours et que le résultat est en vue » (l'auteur). Tout ce
 *  fichier découle de cette phrase, et de sa conséquence : **une jauge qui ment
 *  est pire qu'une absence de jauge**. Elle n'anime donc rien d'elle-même —
 *  aucune animation d'attente, aucune estimation, aucun mouvement qui ne
 *  corresponde pas à un fragment réellement cherché. Ce qu'elle affiche vient
 *  du moteur, qui compte son travail (`recherche/index.js › avancementDe`).
 *
 *  ── Ce qu'un lecteur d'écran en entend ────────────────────────────────────
 *
 *  Une barre de progression accessible, ce n'est pas seulement `role`
 *  + `aria-valuenow` : c'est aussi savoir QUAND se taire.
 *
 *   · `role="progressbar"` avec `aria-valuemin/max/now` : la valeur est lue à
 *     la demande, quand on interroge l'élément. C'est le socle (WAI-ARIA).
 *   · `aria-valuetext` DOUBLE la valeur d'une phrase : « 45 %, huit fragments
 *     sur dix-huit ». Sans lui, un pourcentage nu ne dit pas de quoi il parle.
 *   · une région `aria-live="polite"` séparée, mais **au quart seulement**. Un
 *     `aria-live` sur la valeur elle-même bavarderait dix-huit fois en une
 *     seconde et couvrirait tout le reste ; quatre annonces disent la même
 *     chose et laissent parler la page.
 *   · le libellé visible est `aria-hidden` : il redit ce que `aria-valuetext`
 *     porte déjà, et l'entendre deux fois n'apprend rien.
 *
 *  ── Et `prefers-reduced-motion` ───────────────────────────────────────────
 *
 *  Le remplissage glisse d'une valeur à l'autre par une transition CSS. Sous
 *  `prefers-reduced-motion`, la transition est coupée (`styles/controls.css`) :
 *  la barre saute d'un palier à l'autre. Elle reste parfaitement lisible — ce
 *  qu'on regarde ici, c'est une longueur, pas un mouvement.
 */

import { e } from './dom.js';
import { t } from '../i18n/index.js';

/** Le pas d'annonce vocale, en pourcents. Quatre annonces pour une recherche :
 *  assez pour suivre, trop peu pour couvrir le reste de la page. */
const PAS_ANNONCE = 25;

/**
 * @param {{libelle?:string}} [reglages]
 * @returns {{element:HTMLElement, avancer:(a:Object)=>void, achever:()=>void}}
 */
export function creerJaugeRecherche(reglages = {}) {
  const libelle = reglages.libelle || t('progression.label');

  const remplissage = e('span.jauge-recherche__remplissage', { 'aria-hidden': 'true' });
  const piste = e('span.jauge-recherche__piste', { 'aria-hidden': 'true' }, [remplissage]);
  const legende = e('span.jauge-recherche__legende', { 'aria-hidden': 'true', texte: t('progression.demarrage') });
  const annonce = e('span.visuellement-cachee', { 'aria-live': 'polite', 'aria-atomic': 'true' });

  const element = e('div.jauge-recherche', {
    role: 'progressbar',
    'aria-label': libelle,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    'aria-valuetext': t('progression.demarrage'),
  }, [piste, legende, annonce]);

  let dernierPalier = -1;
  let dernierPourcent = 0;

  /**
   * @param {{fraction:number, fragments:number, fragmentsTotal:number}} avancement
   */
  function avancer(avancement) {
    if (!avancement) return;
    const brut = Math.round((avancement.fraction || 0) * 100);
    // ★ La jauge ne RECULE jamais, même si l'avancement le lui demandait. Le
    //   moteur donne un maximum de deux rapports croissants, donc le cas ne
    //   devrait pas se produire ; s'il se produisait, une barre qui redescend
    //   ferait douter de tout le reste, et c'est trop cher payé pour un bogue
    //   d'arrondi.
    const pourcent = Math.max(dernierPourcent, Math.min(100, brut));
    dernierPourcent = pourcent;

    const phrase = t('progression.etat', {
      pourcent,
      faits: avancement.fragments ?? 0,
      total: avancement.fragmentsTotal ?? 0,
    });
    remplissage.style.setProperty('--jauge-part', String(pourcent / 100));
    element.setAttribute('aria-valuenow', String(pourcent));
    element.setAttribute('aria-valuetext', phrase);
    legende.textContent = phrase;

    const palier = Math.floor(pourcent / PAS_ANNONCE);
    if (palier > dernierPalier) {
      dernierPalier = palier;
      annonce.textContent = phrase;
    }
  }

  /** La recherche est finie. On pose 100 % avant de disparaître : une jauge qui
   *  s'évapore à 80 % laisse croire qu'elle a été interrompue. */
  function achever() {
    dernierPourcent = 100;
    remplissage.style.setProperty('--jauge-part', '1');
    element.setAttribute('aria-valuenow', '100');
    element.setAttribute('aria-valuetext', t('progression.termine'));
    legende.textContent = t('progression.termine');
    annonce.textContent = t('progression.termine');
  }

  return { element, avancer, achever };
}
