/** Le logo — « Numérologie » qui cache « Num Hero LOL geek ».
 *
 *  Le tracé SVG lui-même est inline dans index.html : la page doit rester
 *  lisible sans JavaScript, et le logo est le titre de niveau 1. Ce module ne
 *  fait que le cloner et lui donner ses trois états.
 *
 *  Le tracé de référence (round 8) et sa feuille de style sont dans
 *  `_logo-test.html`, produit par `.planning/research/proto/logo-jost-trace.py`
 *  (bâton géométrique monolinéaire, Jost*, OFL — sans empattement, sans gras,
 *  sans délié). C'est de là que le `<svg class="logo">` d'index.html et les
 *  règles `.lg-*` de styles/ doivent être repris.
 *
 *  Seize fentes, quatre groupes : num | hero | lol | geek. Deux gabarits : le
 *  repos, compact et d'un seul tenant, et la révélation, écartée. Le logo
 *  RÉSERVE la marge de cet écartement de part et d'autre : au repos le mot
 *  occupe le centre de sa boîte, au clic le texte s'écarte sur place et rien
 *  n'est jamais réduit pour faire de la place.
 *    · le h de hero  — réduit, surélevé, penché de 60°, À CHEVAL sur la
 *      frontière m|é : il ouvre « hero », il vient donc juste après « num ».
 *      Sa hampe devenue diagonale sert d'accent aigu au e qui suit.
 *    · le 2e l de lol — le même dessin, réduit, relevé, pivoté de 45°, entre
 *      le o et le g.
 *    · la fin du mot — « gie » devient « geek » par une chorégraphie où AUCUNE
 *      lettre ne s'efface et AUCUNE n'apparaît : que des trajets. Les rounds
 *      précédents SUGGÉRAIENT le k (un fût planté sur la panse d'un c) : ça se
 *      lit « b ». Ici le k est CONSTRUIT — c'est celui de Jost, démonté en
 *      trois barres, et il n'y a donc rien à deviner :
 *        ① le point du i est un e miniature. Il DESCEND à la fente qu'occupait
 *           le i et prend sa taille normale : c'est le 1er e de geek ;
 *        ② le e final ne se transforme en rien — il EST le 2e e de geek. Il
 *           glisse d'une fente vers la droite pour laisser sa place au premier ;
 *        ③ le fût du i est le fût du k, couché à la hauteur d'x. Il PIVOTE SOUS
 *           LE e FINAL comme un satellite, sur 180° : de la gauche du e, par en
 *           dessous, jusqu'à sa droite. ① et ③ sont SIMULTANÉS — deux fragments
 *           du même i qui partent chacun de leur côté ;
 *        ④ arrivé, le fût S'ALLONGE (hauteur d'x → hauteur de hampe), pied
 *           planté ;
 *        ⑤ puis les deux BARRES du k, ABSENTES jusque-là — au repos le mot est
 *           « Numérologie » et rien d'autre, il ne reste rien à voir sur le
 *           fût du i —, APPARAISSENT couchées dedans, à taille réelle, et
 *           s'ouvrent COMME UN COMPAS, chacune depuis son bout : celle du haut
 *           pivote par le haut, celle du bas par le bas. Leur apparition est
 *           invisible puisqu'elles naissent confondues avec le fût (68,9 et
 *           77,5 u de large pour un fût de 80 : planche de preuve dans le banc
 *           d'essai) ; ce qu'on voit, c'est leur ouverture.
 *      Le retour au repos rejoue la chorégraphie à l'envers (classe
 *      `logo--retour`) : retirer une animation ne déclenche aucune transition,
 *      et sans ça « geek » redeviendrait « gie » d'un coup sec. Ce n'est pas
 *      la même @keyframes jouée à rebours : c'est `fermeture`, qui rejoue les
 *      quatre étapes dans l'ordre 1-2-4-3.
 *  Aucun « 6 » dans le logo : le seul chiffre de l'identité est le favicon,
 *  `favicon.svg`, un 6 de Jost penché à 45°.
 *
 *  LE RYTHME (round 8) — QUATRE ÉTAPES SUCCESSIVES, une chose à la fois. Tout
 *  partait ensemble et durait 1,5 s : l'œil ne pouvait pas suivre.
 *    ① 1 s   la place du h — l'écart num|hero — et le h qui s'y pose ;
 *    ② 1 s   la place du l — les écarts hero|lol et lol|geek — et le l qui y
 *            descend ;
 *    ③ 1 s   le e final se décale PENDANT que l'autre e descend et grandit
 *            PENDANT que la barre passe sous le e final et le dépasse, puis
 *            s'allonge. Seule étape où trois choses bougent ensemble : elles
 *            sont indissociables ;
 *    ④ 0,5 s les deux barres du k apparaissent, couchées dans le fût, et
 *            s'ouvrent au compas.
 *  La FERMETURE n'est pas la marche arrière : ordre 1-2-4-3. Les deux barres
 *  doivent se refermer ET disparaître (④ inversée) AVANT que le fût ne reparte
 *  en orbite (③ inversée), sinon il voyagerait barres déployées.
 *
 *  LE LECTEUR — la révélation se navigue comme une démonstration : début,
 *  précédent, lecture/pause, suivant, fin, et la jauge à quatre segments, un
 *  par étape. C'est `src/app/logo-lecteur.js` qui promène le `currentTime` des
 *  @keyframes, et `src/app/transport.js` — la barre des démonstrations, sans
 *  la moindre variante — qui l'affiche. La barre n'apparaît qu'APRÈS le clic
 *  qui révèle : la page d'accueil reste nue tant qu'on n'a pas demandé à voir.
 *
 *  Trois états, jamais deux :
 *    repos      — on lit « Numérologie ». Point final.
 *    éveil      — survol / focus (en CSS) : un fantôme AU TRAIT dévoile SUR
 *                 PLACE ce que chaque forme est déjà. Rien ne bouge de place.
 *                 Le survol ne révèle JAMAIS tout.
 *    révélation — clic ou Entrée : classe `logo--revele`. Retour au repos au
 *                 second clic, ou 6 s après la fin de l'animation SI on n'a
 *                 pas touché au lecteur — dès qu'on s'en sert, plus rien ne
 *                 nous reprend le logo. Par la classe `logo--retour`, ôtée une
 *                 fois arrivée.
 *  La mise en place obéit à trois commandes CSS, `--u1 --u2 --u3`, déclarées
 *  avec `@property` : 1 au repos, 0 une fois l'écart de leur étape ouvert. La
 *  chorégraphie de la fin du mot est en `@keyframes`. En
 *  `prefers-reduced-motion` la durée tombe à 1 ms : l'état d'arrivée, sans le
 *  trajet — et alors pas de lecteur, il n'y a plus de trajet à parcourir. */

import { e, qs, vider, remplir } from './dom.js';
import { memoriserLogoVu, logoDejaVu, animationEffective } from './reglages.js';
import { t, v } from '../i18n/index.js';
import { creerLecteurLogo, dureeChoregraphie } from './logo-lecteur.js';
import { creerTransport } from './transport.js';

const LECTURE = 'Numérologie';
const CACHE = 'Num Hero LOL geek';
const RETOUR_MS = 6000;
let modele = null;
let compteur = 0;

/** Mémorise le tracé inline avant que le routeur ne réécrive la page. */
export function capturerModele(racine = document) {
  const trouve = qs('svg.logo', racine);
  if (trouve && !modele) modele = trouve.cloneNode(true);
  return !!modele;
}

/** Un clone au tracé identique, avec des identifiants uniques. */
function cloner() {
  if (!modele) return null;
  const n = ++compteur;
  const svg = modele.cloneNode(true);
  svg.classList.remove('logo--revele', 'logo--retour');
  for (const el of svg.querySelectorAll('[id]')) {
    const ancien = el.id;
    const nouveau = `${ancien}-${n}`;
    el.id = nouveau;
    const cible = svg.getAttribute('aria-labelledby');
    if (cible) svg.setAttribute('aria-labelledby', cible.split(/\s+/)
      .map((r) => (r === ancien ? nouveau : r)).join(' '));
  }
  return svg;
}

/**
 * Branche le bouton du logo, et — s'il y a un trajet à parcourir — le lecteur
 * pas à pas dans `slot`.
 *
 * L'ordre des opérations à la révélation n'est pas indifférent : la classe
 * `logo--revele` doit être posée AVANT que le lecteur ne cherche les
 * animations, puisque ce sont elles qu'il vient chercher. `getAnimations()`
 * force un recalcul de style : elles existent donc dès l'instruction suivante.
 */
function brancher(bouton, svg, slot = null) {
  const titre = svg.querySelector('title');
  const lectureVisible = titre ? titre.textContent : LECTURE;
  let minuterie = 0;
  let finRetour = 0;
  let lecteur = null;
  let transport = null;
  let apprivoise = false;   // l'utilisateur s'est servi du lecteur

  /** La barre s'en va ; le lecteur, lui, peut avoir encore à rembobiner. */
  const demonterBarre = () => {
    clearTimeout(minuterie);
    if (transport) { transport.detruire(); transport = null; }
    apprivoise = false;
    if (slot) { vider(slot); slot.hidden = true; }
  };

  const demonterLecteur = () => {
    demonterBarre();
    if (lecteur) { lecteur.destroy(); lecteur = null; }
  };

  const monterLecteur = () => {
    if (!slot) return;
    lecteur = creerLecteurLogo(svg, {
      titre: (cle) => t(cle),
    });
    // Mouvement réduit : pas de trajet, donc pas de barre. Elle n'aurait rien
    // à parcourir et n'ajouterait qu'un contrôle mort sur la page d'accueil.
    if (!lecteur) return;
    // Le vocabulaire des démonstrations ne convient pas ici : les quatre
    // étapes du logo ne sont pas des « transformations », et « Lancer la
    // démonstration » mentirait sur ce qui va se passer. La barre reste la
    // MÊME, seuls ses noms accessibles changent.
    transport = creerTransport(lecteur, v('logo.transport') || {});
    remplir(slot, [transport.element]);
    slot.hidden = false;
    // La minuterie de repli ne part qu'une fois l'animation finie — et elle
    // est révoquée dès qu'on touche à la barre : rien ne doit reprendre le
    // logo à quelqu'un en train de l'explorer.
    lecteur.on('end', () => {
      if (apprivoise) return;
      clearTimeout(minuterie);
      minuterie = setTimeout(() => poser(false), RETOUR_MS);
    });
    slot.addEventListener('pointerdown', apprivoiser);
    slot.addEventListener('keydown', apprivoiser);
    slot.addEventListener('focusin', apprivoiser);
  };

  const apprivoiser = () => { apprivoise = true; clearTimeout(minuterie); };

  const poser = (revele) => {
    const etaitRevele = svg.classList.contains('logo--revele');
    if (revele === etaitRevele && !svg.classList.contains('logo--retour')) return;
    clearTimeout(minuterie);
    clearTimeout(finRetour);
    // Si le focus est dans la barre au moment où elle disparaît, il serait
    // éjecté en tête de document : on le rend au logo AVANT de démonter.
    if (!revele && slot && slot.contains(document.activeElement)) bouton.focus();

    // ── refermer une révélation INACHEVÉE : on rembobine ──────────────────
    // `fermeture` part de l'état pleinement révélé. La jouer alors qu'on n'y
    // est pas encore fait sauter le logo à l'arrivée d'abord — 68 px et une
    // barre téléportée si on referme au bout de 200 ms. On défait donc
    // simplement ce qu'on vient de faire, sur le trajet même de l'aller.
    if (!revele && etaitRevele && lecteur && !lecteur.atEnd) {
      demonterBarre();
      bouton.setAttribute('aria-expanded', 'false');
      if (titre) titre.textContent = lectureVisible;
      const ancien = lecteur;
      lecteur = null;
      ancien.rembobiner(() => {
        ancien.destroy();
        // `logo--revele` ne part qu'ARRIVÉ : l'ôter plus tôt supprimerait les
        // @keyframes en pleine marche arrière, et le logo sauterait au repos.
        svg.classList.remove('logo--revele', 'logo--retour');
      });
      return;
    }

    demonterLecteur();
    svg.classList.toggle('logo--revele', revele);
    // Retirer une animation ne déclenche aucune transition : le retour au
    // repos serait un saut sec. On en joue donc une AUTRE, `fermeture`, qui
    // rejoue les quatre étapes dans l'ordre 1-2-4-3 et finit exactement sur
    // l'état de repos — la classe peut être ôtée ensuite sans le moindre saut.
    svg.classList.toggle('logo--retour', !revele && etaitRevele);
    if (!revele && etaitRevele) {
      finRetour = setTimeout(() => svg.classList.remove('logo--retour'),
        dureeChoregraphie(svg));
    }
    bouton.setAttribute('aria-expanded', revele ? 'true' : 'false');
    if (titre) titre.textContent = revele ? CACHE : lectureVisible;
    if (revele) {
      memoriserLogoVu();
      monterLecteur();
      // Sans lecteur (mouvement réduit) il n'y a pas d'événement « end » pour
      // armer le repli : on le pose tout de suite.
      if (!lecteur) minuterie = setTimeout(() => poser(false), RETOUR_MS);
    }
  };

  bouton.addEventListener('click', () => poser(!svg.classList.contains('logo--revele')));
  // sur tactile il n'y a pas de survol : le tap va directement à la révélation.
  bouton.addEventListener('blur', () => { if (animationEffective() === 'reduite') poser(false); });
  return poser;
}

/**
 * Le logo comme titre de page (page d'accueil), et le lecteur qui le déroule.
 *
 * Le lecteur ne peut pas vivre DANS le `<h1>` : un titre n'a pas à contenir
 * cinq boutons et une jauge. Il vit donc juste dessous, dans un bloc à lui, et
 * n'apparaît qu'au clic — la page d'accueil reste nue tant qu'on n'a pas
 * demandé à voir.
 * @returns {HTMLElement|null}
 */
export function logoTitre() {
  const svg = cloner();
  if (!svg) return null;
  svg.classList.add('logo-titre');
  const bouton = e('button.logo-bouton', {
    type: 'button',
    'aria-expanded': 'false',
    'aria-describedby': 'logo-aide',
  }, [svg]);
  const slot = e('div.logo-bloc__lecteur', { hidden: true });
  brancher(bouton, svg, slot);
  return e('div.logo-bloc', {}, [
    e('h1', {}, [
      bouton,
      e('span.visuellement-cachee', { texte: t('global.logoTexte') }),
      e('span#logo-aide.visuellement-cachee', {
        texte: t(logoDejaVu() ? 'global.logoAideRevu' : 'global.logoAide'),
      }),
    ]),
    slot,
  ]);
}

/** Le logo réduit, en tête des pages internes : un lien vers l'accueil. */
export function logoEntete() {
  const svg = cloner();
  if (!svg) return e('a.lien-retour', { href: '#', texte: LECTURE });
  return e('a.logo-entete', { href: '#', 'aria-label': t('global.logoRetour', { lecture: LECTURE }) }, [svg]);
}
