/** L'infobulle — une bulle qui pointe vers ce qui parle.
 *
 *  « Utilise le même style que dans g1migrator pour les clics sur une adresse
 *  g1 : la mini infobulle, centrée avec un triangle qui pointe vers l'élément
 *  qui "parle" » (l'auteur). Le dessin vient de `.address-copied-tooltip`
 *  (g1migrator, `src/style.css`) : fond de la couleur du texte, texte de la
 *  couleur du fond, un triangle en `::after` sous la bulle, une entrée en fondu
 *  qui monte de quelques pixels.
 *
 *  Elle sert DEUX fois, et c'est délibéré : l'accusé de copie du partage, et
 *  les titres d'étape de la jauge — qui étaient des attributs `title`. Un
 *  `title` natif n'est pas stylable, paraît après une seconde qu'on ne choisit
 *  pas, disparaît quand on veut le lire, et ne sait pas aller à la ligne. Deux
 *  composants pour un même geste auraient fini par diverger : il n'y en a
 *  qu'un.
 *
 *  ★ POSITIONNÉE EN `fixed`, ET MONTÉE SUR `<body>`.
 *
 *  Une bulle en `absolute` dans son hôte demande que chaque hôte soit
 *  positionné, et se fait couper par le premier ancêtre en `overflow` — or les
 *  dalles de la jauge vivent justement dans une rangée qui peut défiler. En
 *  `fixed` sur `<body>`, rien ne la coupe ; en échange elle doit se refermer au
 *  défilement, ce qu'elle fait.
 *
 *  ★ PUREMENT VISUELLE. Le nom accessible reste sur l'élément hôte
 *  (`aria-label`) : la bulle est en `aria-hidden`, sinon les technologies
 *  d'assistance liraient deux fois le même texte. Elle rend visible à la souris
 *  ce que le lecteur d'écran savait déjà.
 *
 *  ★ WCAG 2.2 — 1.4.13 « Content on Hover or Focus ». La bulle de survol est
 *  écartable (Échap), survolable (le pointeur peut entrer dedans sans la faire
 *  fuir) et persistante (elle ne se referme pas toute seule). */

import { e } from './dom.js';

/** Distance entre la pointe du triangle et le bord de l'élément qui parle. */
const ECART = 8;
/** Demi-largeur du triangle, en pixels — doit valoir le `border-width` du
 *  `::after` dans `src/styles/pages.css`. */
const TRIANGLE = 5;
/** Marge minimale entre la bulle et le bord de la fenêtre. */
const MARGE = 8;

/** La bulle est UNIQUE : une seconde demande remplace la première plutôt que
 *  d'empiler deux bulles qui se recouvriraient. */
let active = null;

/** Ferme la bulle en cours, s'il y en a une. */
export function fermerInfobulle() {
  if (active) active.fermer();
}

function creerBulle(texte) {
  const lignes = String(texte).split('\n');
  return e('div.infobulle', { 'aria-hidden': 'true', role: 'presentation' },
    lignes.map((ligne) => e('span.infobulle__ligne', { texte: ligne })));
}

/** Place la bulle au-dessus de la cible, ou en dessous s'il n'y a pas la place.
 *  Le triangle suit : il pointe toujours vers le centre de la cible, même
 *  quand la bulle a dû se décaler pour ne pas sortir de la fenêtre. */
function placer(bulle, cible) {
  const r = cible.getBoundingClientRect();
  const b = bulle.getBoundingClientRect();
  const centre = r.left + r.width / 2;

  // Au-dessus par défaut ; en dessous seulement si la bulle déborderait en haut.
  const dessous = r.top - b.height - ECART < MARGE;
  bulle.classList.toggle('infobulle--dessous', dessous);
  const haut = dessous ? r.bottom + ECART : r.top - b.height - ECART;

  // Le décalage horizontal est BORNÉ à la fenêtre : une bulle centrée sur une
  // dalle de bord sortirait de l'écran, et un navigateur ne la ramène pas.
  const maxi = Math.max(MARGE, window.innerWidth - b.width - MARGE);
  const gauche = Math.min(Math.max(centre - b.width / 2, MARGE), maxi);

  bulle.style.top = `${Math.round(haut)}px`;
  bulle.style.left = `${Math.round(gauche)}px`;
  // La pointe reste sur le centre de la cible, bornée à la largeur de la bulle
  // pour ne jamais dépasser des coins arrondis.
  const pointe = Math.min(Math.max(centre - gauche, TRIANGLE + 4), b.width - TRIANGLE - 4);
  bulle.style.setProperty('--pointe', `${Math.round(pointe)}px`);
}

/**
 * Montre une bulle attachée à `cible`.
 *
 * @param {Element} cible    l'élément vers lequel pointe le triangle
 * @param {string}  texte    le message ; les `\n` deviennent des lignes
 * @param {{duree?:number, survolable?:boolean}} [options]
 *        `duree` : millisecondes avant l'adieu. Le fondu occupe la DERNIÈRE
 *        seconde — « elle disparaît progressivement durant la 5ᵉ seconde »
 *        (l'auteur) —, donc `duree: 5000` tient quatre secondes pleines puis
 *        s'efface pendant la cinquième. Omise, la bulle reste jusqu'à ce qu'on
 *        la ferme.
 * @returns {{fermer:Function}}
 */
export function montrerInfobulle(cible, texte, options = {}) {
  fermerInfobulle();
  if (!cible || !texte || typeof document === 'undefined') return { fermer() {} };

  const bulle = creerBulle(texte);
  document.body.appendChild(bulle);
  placer(bulle, cible);
  // Le fondu d'entrée démarre à la frame suivante : posée et classée dans le
  // même tic, la transition n'aurait pas d'état de départ à quitter.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => bulle.classList.add('infobulle--vue'));
  } else bulle.classList.add('infobulle--vue');

  let minuteur = null;
  let adieu = null;
  let ferme = false;

  function fermer() {
    if (ferme) return;
    ferme = true;
    clearTimeout(minuteur);
    clearTimeout(adieu);
    bulle.remove();
    document.removeEventListener('pointerdown', surClicAilleurs, true);
    document.removeEventListener('keydown', surTouche, true);
    window.removeEventListener('scroll', fermer, true);
    window.removeEventListener('resize', fermer);
    if (active && active.bulle === bulle) active = null;
  }

  // ★ « L'infobulle disparaît dès qu'on clique ailleurs. » Le clic sur la CIBLE
  //   n'est pas « ailleurs » : sans cette exception, re-cliquer sur Partager
  //   fermerait la bulle que ce même clic vient de rouvrir.
  function surClicAilleurs(ev) {
    if (cible.contains(ev.target) || bulle.contains(ev.target)) return;
    fermer();
  }
  function surTouche(ev) { if (ev.key === 'Escape') fermer(); }

  document.addEventListener('pointerdown', surClicAilleurs, true);
  document.addEventListener('keydown', surTouche, true);
  // Une bulle en `fixed` ne suit pas ce qui défile : plutôt que de la voir
  // dériver loin de ce qu'elle désigne, on la referme.
  window.addEventListener('scroll', fermer, true);
  window.addEventListener('resize', fermer);

  if (options.duree > 0) {
    // Le fondu occupe la dernière seconde ; en mouvement réduit, il n'y a pas
    // de fondu du tout et la bulle s'en va d'un coup à l'échéance.
    const doux = typeof matchMedia === 'function'
      && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fondu = doux ? Math.min(1000, options.duree) : 0;
    if (fondu) {
      adieu = setTimeout(() => bulle.classList.add('infobulle--adieu'),
        options.duree - fondu);
    }
    minuteur = setTimeout(fermer, options.duree);
  }

  active = { bulle, fermer };
  return { fermer };
}

/**
 * Attache une bulle de SURVOL à un élément — le remplaçant de `title`.
 *
 * Elle paraît au survol comme au focus clavier (sinon la souris seule y aurait
 * droit), et ne s'en va qu'au départ du pointeur, à la perte du focus, ou sur
 * Échap.
 *
 * @returns {Function} de quoi la détacher
 */
export function infobuller(element, texte) {
  if (!element || !texte) return () => {};
  let mien = null;
  let surLaBulle = false;

  const ouvrir = () => {
    if (mien && active && active.bulle) return;
    mien = montrerInfobulle(element, texte);
    // ★ « Survolable » (WCAG 1.4.13) : entrer dans la bulle ne doit pas la
    //   faire fuir — sinon un texte long devient impossible à lire en entier.
    const bulle = active && active.bulle;
    if (bulle) {
      bulle.addEventListener('pointerenter', () => { surLaBulle = true; });
      bulle.addEventListener('pointerleave', () => { surLaBulle = false; fermer(); });
    }
  };
  const fermer = () => {
    if (surLaBulle) return;
    if (mien) mien.fermer();
    mien = null;
  };

  element.addEventListener('pointerenter', ouvrir);
  element.addEventListener('pointerleave', fermer);
  element.addEventListener('focus', ouvrir);
  element.addEventListener('blur', fermer);

  return () => {
    element.removeEventListener('pointerenter', ouvrir);
    element.removeEventListener('pointerleave', fermer);
    element.removeEventListener('focus', ouvrir);
    element.removeEventListener('blur', fermer);
    if (mien) mien.fermer();
  };
}
