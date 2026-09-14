/** Changer ce qui est AU-DESSUS de ce qu'on lit, sans que ce qu'on lit bouge.
 *
 *  Deux gestes de la liste progressive en ont besoin : repeindre la liste sur
 *  place (`routeur.js › repeindre`), et retirer le bandeau « recherche
 *  terminée » une fois qu'il a dit ce qu'il avait à dire.
 *
 *  ★ **LA MESURE, PAS LA SUPPOSITION.** On relève la position à l'écran d'un
 *    REPÈRE — le corps de la liste —, on fait le geste, on la relève encore, et
 *    la page défile de la différence. Ce qui a grandi ou rétréci au-dessus ne
 *    se voit donc pas. Aucune hauteur n'est calculée d'avance : c'est la page
 *    qui dit ce qui a bougé.
 *
 *  ⚠️ **`behavior: 'instant'`, TOUJOURS.** `html` porte `scroll-behavior:
 *    smooth` (`styles/base.css`) : un `scrollBy` nu y glisserait pendant une
 *    demi-seconde, et la compensation deviendrait elle-même le saut qu'elle
 *    doit cacher. C'est aussi pourquoi un `scrollTo` lu aussitôt semblait ne
 *    rien faire au banc du navigateur.
 *
 *  ⚠️ **CE QU'AUCUN DÉFILEMENT NE RATTRAPE** : en haut de page, un contenu qui
 *    rétrécit au-dessus fait remonter la suite, et il n'y a pas de défilement
 *    négatif pour compenser. Le bandeau s'efface donc EN DOUCEUR quand il est à
 *    l'écran — il pâlit, puis se replie —, et d'un coup, compensé, quand il est
 *    sorti par le haut. Ce module ne touche au DOM qu'à l'appel (§ du
 *    travailleur, `app/travailleur.js`). */

/** Combien de temps le bandeau « terminée » reste lisible avant de s'effacer. */
export const DELAI_ADIEU_MS = 4000;
/** La durée du repli (`.bandeau--adieu`, `styles/base.css`) — et le filet qui
 *  retire le bandeau si `transitionend` ne vient jamais (mouvement réduit). */
export const DUREE_ADIEU_MS = 900;

/**
 * Fait `geste()`, puis défile de ce dont le repère a bougé à l'écran.
 * @param {{scrollBy:Function}} fenetre
 * @param {() => ?Element} repere  relu APRÈS le geste : il peut avoir été remplacé
 * @param {() => void} geste
 * @returns {number} le défilement appliqué, en pixels
 */
export function sansSaut(fenetre, repere, geste) {
  const avantEl = repere();
  const avant = avantEl ? avantEl.getBoundingClientRect().top : null;
  geste();
  const apresEl = repere();
  if (avant === null || !apresEl) return 0;
  const delta = apresEl.getBoundingClientRect().top - avant;
  if (delta) fenetre.scrollBy({ top: delta, left: 0, behavior: 'instant' });
  return delta;
}

/**
 * Efface un bandeau sans faire sauter la page.
 *
 * @param {Element} bandeau
 * @param {{fenetre:{scrollBy:Function}, repere:() => ?Element,
 *   planifier?:(f:Function, ms:number) => void}} contexte
 * @returns {'absent'|'hors-champ'|'en-douceur'}
 */
export function effacerEnDouceur(bandeau, { fenetre, repere, planifier = (f, ms) => setTimeout(f, ms) }) {
  if (!bandeau || !bandeau.parentNode) return 'absent';
  const retirer = () => {
    if (!bandeau.parentNode) return;
    sansSaut(fenetre, repere, () => bandeau.parentNode.removeChild(bandeau));
  };
  const cadre = bandeau.getBoundingClientRect();
  // Sorti par le haut : on le retire d'un coup, et le défilement compense tout.
  if (cadre.bottom <= 0) { retirer(); return 'hors-champ'; }
  // À l'écran : il pâlit, puis se replie — la suite remonte en glissant. La
  // hauteur de départ est posée en ligne, sans quoi `height` ne se transite pas.
  bandeau.style.height = `${cadre.height}px`;
  bandeau.getBoundingClientRect();
  bandeau.classList.add('bandeau--adieu');
  bandeau.style.height = '0px';
  let fini = false;
  const finir = () => { if (fini) return; fini = true; retirer(); };
  bandeau.addEventListener('transitionend', (ev) => { if (!ev || ev.propertyName === 'height') finir(); });
  planifier(finir, DUREE_ADIEU_MS);
  return 'en-douceur';
}
