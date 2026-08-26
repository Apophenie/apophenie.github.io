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
import { titreEtape, legendeEtape, figureEtape, texteFigure } from './libelles.js';

/* ══════════════════════════════════════════════════════════════════════════
   La figure « afficheur » — sept ou quatorze segments

   Le Registre est l'équivalent accessible OBLIGATOIRE (CONTRACTS §6). Sur la
   méthode « sept segments », écrire « H → 3 » en Jost* y perdait le sujet : la
   question posée est « combien de lignes droites dans le H D'UNE CALCULETTE ».
   Le Registre montre donc la lettre sur l'afficheur, lui aussi.

   ★ Une POLICE, pas un SVG. Un dessin aurait fallu être doublé d'un
   équivalent textuel écrit à la main : il CRÉE le trou d'accessibilité qu'il
   faut ensuite reboucher. Un caractère n'en crée aucun — le DOM porte « H »,
   donc un lecteur d'écran lit H sans qu'on le lui explique, le texte est
   sélectionnable, copiable, trouvable par la recherche du navigateur, et il
   grandit avec le zoom. Dans l'équivalent accessible de la scène, du vrai
   texte est exactement ce qu'il faut.

   Les polices sont DSEG7 Classic et DSEG14 Classic (OFL 1.1, sous-réglées à
   36 signes) ; le repli est `--machine`, donc un « H » ordinaire si elles ne
   chargent pas.

   ★ Une différence entre les deux, et elle compte. La table `SEG7` est saisie
   à la main d'après la recherche : DSEG7 dessine SA version des lettres, qui
   diverge de la table sur 12 des 36 signes (`tables/seg7.js`,
   `ECARTS_POLICE_SEG7`) — la police y ILLUSTRE, elle n'atteste pas. La table
   `SEG14`, elle, est DÉRIVÉE de DSEG14 contour par contour : le glyphe montré
   ici et les segments qu'allume la scène sont le même dessin, et recompter le
   glyphe redonne le nombre annoncé juste à côté.
   ══════════════════════════════════════════════════════════════════════════ */

/** Classe de la lettre, selon l'afficheur dont la figure vient. */
const CLASSE_AFFICHEUR = { seg7: 'registre__seg7', seg14: 'registre__seg14' };

/** Le rendu d'une figure d'étape, ou `null` si l'étape n'en porte pas. */
function figureDe(etape) {
  const figure = figureEtape(etape);
  const classe = figure && CLASSE_AFFICHEUR[figure.type];
  if (!classe || !figure.glyphe) return null;
  // Tout est du texte : rien à décrire, rien à masquer, rien à répéter.
  return e('span.registre__figure', {}, [
    e(`span.${classe}`, { texte: figure.glyphe }),
    e('span.registre__fleche', { texte: '\u2192' }),
    e('span.registre__valeur', { texte: String(figure.valeur) }),
  ]);
}

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
        figureDe(etape),
      ]),
    ]);
    const li = e('li.registre__item', {}, [bouton]);
    items.push(li);
    liste.appendChild(li);
  });

  // ★ Le rappel d'étape ne s'AFFICHE plus, il s'ANNONCE.
  //
  // « Ce scroll peut défiler au fur et à mesure de l'animation pour garder mise
  // en avant l'étape en cours ; ça permet par la même occasion de supprimer la
  // reprise des étapes juste en dessous du player » (l'auteur). Le Registre,
  // qui suit désormais la lecture, montre l'étape en cours à sa place, dans son
  // contexte — la ligne sous le lecteur redisait la même chose hors contexte.
  //
  // Elle reste dans le DOM, et c'est délibéré : c'est une région `aria-live`,
  // le seul canal par lequel un lecteur d'écran apprend qu'on a changé d'étape,
  // et le conteneur de la scène la désigne en `aria-describedby`. La retirer
  // rendrait la démonstration muette pour qui ne la voit pas.
  const region = e('p#etape-courante.visuellement-cachee.region-live', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });
  // L'annonce de fin ne s'AFFICHE pas : écrire « Résultat : 666 » sous la scène
  // raconte la chute, et l'animation vient de la montrer. Elle reste due aux
  // lecteurs d'écran, qui n'ont pas vu le 666 se former — d'où cette seconde
  // région, vocale seulement (CONTRACTS §6 : Le Registre est l'équivalent
  // accessible obligatoire).
  const regionFin = e('p.visuellement-cachee', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  const bloc = e('section.registre', { 'aria-labelledby': 'registre-titre' }, [
    e('h2#registre-titre.h2-machine', { texte: t('registre.titre') }),
    liste,
    regionFin,
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
    suivre(items[i]);
  }

  /**
   * ★ Le Registre suit la lecture dans son propre défilement.
   *
   * La liste est bornée en hauteur (`pages.css`) pour ne pas divulguer le
   * verdict avant qu'il n'arrive ; il faut donc l'amener à l'étape en cours,
   * sinon la mise en avant se produirait hors du champ visible.
   *
   * ★ On calcule le décalage à la main plutôt que d'appeler `scrollIntoView` :
   * celui-ci fait défiler TOUS les ancêtres scrollables, donc la page entière —
   * la scène quitterait l'écran à chaque charnière. Ici seul le conteneur de la
   * liste bouge, et il ne bouge que si l'étape est réellement sortie du cadre :
   * un défilement à chaque étape, même de deux pixels, se remarque et fatigue.
   *
   * ★ `prefers-reduced-motion` coupe le glissement, pas le suivi. Quelqu'un qui
   * a demandé moins de mouvement veut toujours voir où il en est — il saute à
   * la bonne ligne au lieu d'y glisser.
   */
  let suiviEnAttente = null;

  function suivre(li) {
    if (!li || !liste || typeof liste.scrollTo !== 'function') return;
    // ★ On mesure à la FRAME SUIVANTE, jamais dans la foulée du marquage.
    //
    // `marquer` est appelé depuis une charnière du lecteur, c'est-à-dire au
    // milieu d'un cycle où le DOM vient de changer : mesuré, `clientHeight`
    // valait alors 0 et le suivi renonçait en silence — le Registre restait
    // planté sur sa première ligne pendant que la démonstration avançait.
    // Une frame plus tard, la mise en page est faite et les nombres sont vrais.
    //
    // Les demandes se COALESCENT : pendant un scrubbing, dix charnières se
    // succèdent en quelques images, et seule la dernière compte.
    suiviEnAttente = li;
    if (typeof requestAnimationFrame !== 'function') { placer(li); return; }
    if (suivre.planifie) return;
    suivre.planifie = true;
    requestAnimationFrame(() => {
      suivre.planifie = false;
      const cible = suiviEnAttente;
      suiviEnAttente = null;
      if (cible) placer(cible);
    });
  }

  function placer(li) {
    if (!li || !li.isConnected) return;
    const hauteurVue = liste.clientHeight;
    // Une liste non bornée (mise en page étroite, `<details>` replié) n'a rien
    // à faire défiler : `scrollHeight` y vaut `clientHeight`.
    if (!hauteurVue || liste.scrollHeight <= hauteurVue + 1) return;
    const haut = li.offsetTop - liste.offsetTop;
    const bas = haut + li.offsetHeight;
    let cible = null;
    if (haut < liste.scrollTop) cible = haut;
    else if (bas > liste.scrollTop + hauteurVue) cible = bas - hauteurVue;
    if (cible === null) return;
    const doux = typeof matchMedia === 'function'
      && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    liste.scrollTo({ top: cible, behavior: doux ? 'smooth' : 'auto' });
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
    // La région live n'a pas de dessin : la figure y passe par son équivalent
    // textuel (« la lettre H en sept segments → 3 »).
    const dessin = texteFigure(etape);
    if (dessin) region.appendChild(document.createTextNode(' ' + dessin));
  }

  function annoncerFin(resultat) {
    regionFin.textContent = t('registre.termine', { resultat: resultat || '666' });
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
