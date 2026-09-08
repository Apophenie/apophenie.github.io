/** La jauge de recherche — « pas un waiter à durée non identifiée ».
 *
 *  « L'important n'est pas que ça paraisse instantané, mais que l'utilisateur
 *  voie que c'est en cours et que le résultat est en vue » (l'auteur). Tout ce
 *  fichier découle de cette phrase, et de sa conséquence : **une jauge qui ment
 *  est pire qu'une absence de jauge**. Elle n'anime donc rien d'elle-même :
 *  aucune animation d'attente, aucun mouvement de barre qui ne corresponde pas
 *  à du travail réellement fait. Ce qu'elle affiche vient du moteur, qui compte
 *  son travail (`recherche/index.js › avancementDe`).
 *
 *  ── ★ CE QU'ELLE DIT EN PLUS, DEPUIS QUE LA RECHERCHE EST LONGUE ──────────
 *
 *  > « Maintenant que la recherche prend plus de temps, la barre de progression
 *  >   en 3 étapes n'est plus assez précise. Il faut qu'on la voie avancer
 *  >   progressivement, et idéalement qu'elle indique sommairement ce qu'elle
 *  >   fait, le temps écoulé et le temps restant estimé. » (l'auteur)
 *
 *  Trois ajouts, et le troisième revient sur une règle de ce fichier.
 *
 *   · **La phase.** Le moteur nomme désormais ce qu'il fait — lire les
 *     morceaux, assembler les voies, classer les résultats. C'est une mesure,
 *     pas une devinette : les trois phases sont pondérées d'après leur coût
 *     relevé (`recherche/index.js › POIDS_DES_PHASES`).
 *   · **Le temps écoulé**, qui court tout seul. C'est la seule chose ici qui
 *     bouge sans rapport du moteur, et elle ne prétend rien : une horloge dit
 *     l'heure, elle ne prédit pas la fin. Elle a un rôle précis — entre deux
 *     rapports, il s'écoule jusqu'à une seconde et demie sur les saisies
 *     longues, et une page entièrement immobile pendant ce temps-là fait douter
 *     qu'il se passe quelque chose.
 *   · **Le temps restant estimé**, et c'est un REVIREMENT : ce fichier
 *     interdisait « aucune estimation ». L'interdit visait les jauges qui
 *     inventent une progression ; celle-ci divise un temps mesuré par une
 *     fraction mesurée. Elle reste prudente — rien avant d'avoir vu assez de
 *     travail pour que le quotient veuille dire quelque chose, un lissage pour
 *     ne pas donner le tournis, et un arrondi qui n'affiche jamais plus de
 *     précision qu'elle n'en a.
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

/** Sous ce seuil, le quotient temps/fraction ne veut encore rien dire : on se
 *  tait plutôt que d'annoncer « 40 s » sur les premiers pour-cent. */
const FRACTION_MINIMALE_POUR_ESTIMER = 0.12;
/** Et pas avant d'avoir vraiment cherché : un démarrage à froid fausse tout. */
const MS_MINIMALES_POUR_ESTIMER = 500;
/** Le lissage de l'estimation — la part de l'ancienne valeur qu'on garde.
 *  Sans lui, chaque rapport fait sauter le chiffre annoncé d'une seconde à
 *  l'autre, et un nombre qui danse est moins lisible qu'un nombre approché. */
const LISSAGE = 0.6;
/** ⚠️ **ET UN PLAFOND, sans quoi le lissage ne CONVERGE PAS.** Simulé sur une
 *  recherche de quatre secondes : à 98 % d'avancement, la moyenne glissante
 *  annonçait encore deux secondes restantes — elle traînait derrière elle les
 *  estimations pessimistes du début. Une jauge qui promet deux secondes alors
 *  qu'il en reste un dixième ment autant qu'une barre figée. L'estimation
 *  lissée ne peut donc jamais dépasser le double de l'estimation instantanée :
 *  elle monte doucement, mais elle redescend dès que la mesure le dit.
 *  Avec ce plafond, la même simulation donne 4,5 → 4,2 → 3,3 → 1,6 → 0,2 s. */
const PLAFOND_SUR_L_INSTANTANE = 2;
/** Le battement de l'horloge affichée. Assez pour qu'on la voie vivre, assez
 *  peu pour ne pas repeindre la page en permanence. */
const BATTEMENT_MS = 200;

/** Une durée en secondes, telle qu'on la lit : « 1,4 s » puis « 12 s ». */
function enSecondes(ms) {
  const s = ms / 1000;
  return s < 10 ? t('progression.secondes', { n: s.toFixed(1) }) : t('progression.secondes', { n: String(Math.round(s)) });
}

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
  let phaseCourante = null;
  let fractionCourante = 0;
  let depart = null;          // posé au premier rapport, pas à la construction
  let resteLisse = null;
  let battement = null;

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

    if (avancement.phase) phaseCourante = avancement.phase;
    fractionCourante = Math.max(fractionCourante, avancement.fraction || 0);
    if (depart === null) depart = Date.now();
    if (battement === null) battement = setInterval(redire, BATTEMENT_MS);

    const phrase = redire(pourcent);
    remplissage.style.setProperty('--jauge-part', String(pourcent / 100));
    element.setAttribute('aria-valuenow', String(pourcent));

    const palier = Math.floor(pourcent / PAS_ANNONCE);
    if (palier > dernierPalier) {
      dernierPalier = palier;
      annonce.textContent = phrase;
    }
  }

  /* ★ **LA PHRASE SE RECOMPOSE AUSSI SANS RAPPORT DU MOTEUR** — c'est ce qui
       fait courir l'horloge pendant qu'il calcule. La BARRE, elle, ne bouge pas
       d'un pixel ici : seuls le temps écoulé et l'estimation se rafraîchissent.
       La règle du fichier tient — rien n'avance qui ne corresponde à du travail
       fait. */
  function redire(pourcentForce) {
    const pourcent = typeof pourcentForce === 'number' ? pourcentForce : dernierPourcent;
    const phase = phaseCourante ? t(`progression.phases.${phaseCourante}`) : null;
    if (!phase || depart === null) return t('progression.demarrage');
    const ecouleMs = Date.now() - depart;
    let phrase;
    // L'estimation : le temps déjà passé, rapporté à ce qu'il reste à faire.
    // Elle ne paraît que lorsque les deux mesures qu'elle divise ont un sens.
    if (fractionCourante >= FRACTION_MINIMALE_POUR_ESTIMER && ecouleMs >= MS_MINIMALES_POUR_ESTIMER) {
      const brut = (ecouleMs * (1 - fractionCourante)) / fractionCourante;
      const lisse = resteLisse === null ? brut : resteLisse * LISSAGE + brut * (1 - LISSAGE);
      resteLisse = Math.min(lisse, brut * PLAFOND_SUR_L_INSTANTANE);
      phrase = t('progression.etatPhase', {
        pourcent, phase, ecoule: enSecondes(ecouleMs), restant: enSecondes(Math.max(0, resteLisse)),
      });
    } else {
      phrase = t('progression.etatPhaseSansReste', { pourcent, phase, ecoule: enSecondes(ecouleMs) });
    }
    element.setAttribute('aria-valuetext', phrase);
    legende.textContent = phrase;
    return phrase;
  }

  /** La recherche est finie. On pose 100 % avant de disparaître : une jauge qui
   *  s'évapore à 80 % laisse croire qu'elle a été interrompue. */
  function achever() {
    if (battement !== null) { clearInterval(battement); battement = null; }
    dernierPourcent = 100;
    remplissage.style.setProperty('--jauge-part', '1');
    element.setAttribute('aria-valuenow', '100');
    element.setAttribute('aria-valuetext', t('progression.termine'));
    legende.textContent = t('progression.termine');
    annonce.textContent = t('progression.termine');
  }

  return { element, avancer, achever };
}
