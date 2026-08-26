/** Page de démonstration — `…/#{programme}#{b58}` */

import { e, svg as s } from '../dom.js';
import { logoEntete } from '../logo.js';
import { guillemets, abreger, badgeT } from '../typo.js';
import { t, localiser } from '../../i18n/index.js';
import { titreApproche, titreEtape } from '../libelles.js';
import { creerTransport, brancherClavier } from '../transport.js';
import { creerRegistre } from '../registre.js';
import { boutonPartage } from '../partage.js';
import { creerSons, brancherSons } from '../sons.js';
import { interrupteurs } from '../entete.js';
import {
  animationEffective, themeEffectif, repetitionsAccelerees, onReglages,
  sonActif, sonTranche, sonParDefautActif,
} from '../reglages.js';
import { brancherLeRegisseur } from '../../visuel/qualite.js';
import * as pont from '../pont.js';

/** Largeur de fenêtre à partir de laquelle la démonstration tient sur deux
 *  colonnes — scène à gauche, Le Registre en colonne latérale collante.
 *
 *  En dessous, tout reste sur UNE colonne et le Registre passe dans un
 *  `<details>` ouvert, sous la scène. Le seuil vaut celui du « bureau » de la
 *  charte (§2.4), et non les 760 px qu'elle annonçait : la colonne latérale
 *  est fixe (22rem, 352 px) et la gouttière en vaut 48, si bien qu'à 760 px il
 *  ne resterait que 312 px pour la scène — moins que sur un téléphone.
 *  ⚠ Ce nombre est en double avec la media query de `.demo__grille`
 *  (src/styles/pages.css) : CSS ne sait pas lire une variable dans un
 *  `@media`. Les deux doivent bouger ensemble. */
export const SEUIL_DEUX_COLONNES = 1100;

/**
 * ★ Un élément tient-il ENTIÈREMENT dans la fenêtre ?
 *
 * « Aucune des extrémités ne sort de la zone actuellement visible » (l'auteur).
 * C'est bien l'inclusion complète qui est demandée, pas un recouvrement : un
 * élément plus haut que la fenêtre ne peut donc jamais la satisfaire, et c'est
 * voulu — si les commandes dépassent, le spectateur ne les a pas sous les yeux.
 *
 * On mesure sur `documentElement.clientHeight` et non `window.innerHeight` :
 * le premier exclut les barres de défilement, donc il décrit la surface où
 * quelque chose peut réellement être vu.
 */
export function tientDansLaVue(r, largeur, hauteur) {
  if (!r || !(largeur > 0) || !(hauteur > 0)) return false;
  if (!(r.width > 0) || !(r.height > 0)) return false;
  return r.top >= 0 && r.left >= 0 && r.bottom <= hauteur && r.right <= largeur;
}

function entierementVisible(el) {
  if (!el || !el.isConnected || typeof el.getBoundingClientRect !== 'function') return false;
  const racine = document.documentElement;
  return tientDansLaVue(
    el.getBoundingClientRect(),
    racine.clientWidth || window.innerWidth || 0,
    racine.clientHeight || window.innerHeight || 0,
  );
}

function reglageMouvement() {
  const choix = animationEffective();
  // 'auto' seulement si l'utilisateur n'a rien tranché : sinon son choix gagne
  // dans les deux sens (certains règlent leur OS en « réduit » pour d'autres
  // raisons et veulent voir l'animation ici, et inversement).
  return choix === 'reduite' ? 'force' : 'off';
}

/**
 * @param {{saisie:string, approche:Object, scenario:Object, sourceScenario:string,
 *          urlCanonique:?string, bandeau:?string, debug:boolean}} ctx
 * @returns {{element:HTMLElement, monter:Function, detruire:Function}}
 */
export function pageDemonstration(ctx) {
  const { saisie, approche, scenario } = ctx;
  const nbEtapes = (scenario.steps || []).length;

  /* ── le REGISTRE de mise en scène ────────────────────────────────────────
     Il vient du LIEN (`src/recherche/url.js`) et se lit ici sur le SCÉNARIO,
     qui le porte : le scénario sobre a déjà perdu ses cornes à la
     construction, et il serait absurde de lui rendre l'orage du verdict. Une
     seule source de vérité, plutôt que deux drapeaux qui pourraient se
     contredire. `ctx.registre` n'est qu'un repli — un scénario de secours n'en
     porte pas. */
  const scenique = (scenario.registre || ctx.registre || 'scenique') !== 'sobre';

  /* ─────────────────────────── la scène ─────────────────────────── */

  // La scène SVG est aria-hidden : elle ne porte aucune information pour les
  // technologies d'assistance. C'est le conteneur qui est focusable, pour que
  // les raccourcis clavier existent sans exposer un arbre SVG muet.
  const sceneSvg = s('svg', {
    class: 'scene',
    'aria-hidden': 'true',
    focusable: 'false',
    preserveAspectRatio: 'xMidYMid meet',
  });

  // ★ Le cartouche est DÉCORATIF pour les technologies d'assistance.
  //
  // « {step}/{total}, qui peut avoir un alt contenant "Étape 11 sur 23" si
  // besoin » (l'auteur). Le besoin n'existe pas : `#etape-courante` est une
  // région `aria-live` qui annonce déjà « Étape 11 sur 23 — <titre> » à chaque
  // changement. Nommer le cartouche en plus ferait entendre le même compte deux
  // fois. Il porte donc un `title` — pour la souris, qui n'a pas la région
  // vivante — et se retire de l'arbre d'accessibilité.
  const badge = e('p.badge-transformation', {
    texte: badgeT(0, nbEtapes),
    'aria-hidden': 'true',
    title: t('demo.etapeSur', { i: 1, total: nbEtapes }),
  });

  const panneauDebug = e('dl.debug', { hidden: !ctx.debug });

  const cadre = e('div#scene.scene-cadre', {
    role: 'group',
    tabindex: '0',
    'aria-label': t('demo.sceneLabel'),
    'aria-describedby': 'etape-courante',
  }, [sceneSvg, badge, panneauDebug]);

  /* ── LE RIDEAU DU REGISTRE SCÉNIQUE ──────────────────────────────────────

     « En mode scénique, pour avoir le son activé par défaut, plutôt qu'un
     autoplay, estompe la scène initiale (façon arrière-plan de lightbox) et
     mets un gros bouton play devant, par-dessus la scène, pour que
     l'affordance soit maximale. En mode sobre, laisse l'autoplay. » (l'auteur)

     ★ **POURQUOI CE TROC EST GAGNANT, et ce n'est pas une question de goût.**

     Le navigateur bloque le son tant qu'aucun geste n'a eu lieu. Une
     démonstration qui s'autojoue ne peut donc JAMAIS avoir de son — c'était la
     raison b) du silence par défaut (`src/app/sons.js`) : « un réglage dont
     l'effet dépend de ce que l'utilisateur a fait juste avant n'est pas un
     réglage, c'est une loterie ». Un **clic sur lecture EST ce geste**. En
     renonçant à l'autoplay on ne perd donc pas une commodité : on échange une
     seconde d'attente contre la seule mise en scène sonore qui puisse
     fonctionner de façon fiable.

     Et les trois autres raisons du silence par défaut tombent du même coup :
     plus de drone lâché dans une pièce à l'ouverture d'un lien partagé (a),
     plus de son automatique de plus de trois secondes à arrêter (c, WCAG
     1.4.2), plus de surprise contraire à ce que promet le pied de page (d).

     ★ **En sobre, l'autoplay reste**, tel quel. Il n'y a là ni scénographie ni
     son : rien à débloquer, donc rien à échanger contre un clic.

     ★ **ACCESSIBILITÉ.** Le voile est un vrai `<button>` avec un nom
     accessible, il ne piège pas le focus (on peut en sortir au clavier comme
     de n'importe quel bouton), et il est **retiré du DOM** au clic plutôt que
     masqué : une fois parti, il ne peut plus cacher la scène à personne. */
  const rideau = scenique ? construireRideau() : null;
  if (rideau) {
    cadre.classList.add('scene-cadre--rideau');
    cadre.appendChild(rideau.element);
  }

  /* ──────────────────────── lecteur et reflets ──────────────────── */

  // Le rythme des redites est un réglage de COMPILATION : le lecteur le porte
  // dans ses options et le repasse à `compile()` à chaque construction, y
  // compris sur `rebuild()`. Voir `visuel/compile.js` § Répétitions.
  const facteurRedites = () => (repetitionsAccelerees() ? pont.facteurRepetitions() : 1);

  // ★ Déclaré AVANT le lecteur, et initialisé à `null`.
  //
  // La condition d'autoplay ci-dessous le lit dans une fermeture. Un `const`
  // déclaré plus bas serait dans sa zone morte temporelle : le simple fait de
  // le nommer lèverait une `ReferenceError` si le contrôle avait lieu pendant
  // la création du lecteur — et un garde `transport && …` n'y changerait rien,
  // puisque c'est la lecture qui échoue. `null` se teste ; une zone morte, non.
  let transport = null;

  const { lecteur, source: sourceLecteur } = pont.creerLecteur(sceneSvg, scenario, {
    reducedMotion: reglageMouvement(),
    speed: 1,
    repeatSpeed: facteurRedites(),
    // ★ La SCÉNOGRAPHIE du verdict — fond lugubre, éclair, embrasement — est
    //   une option de COMPILATION, au même titre que `reducedMotion` et
    //   `repeatSpeed`. Elle ne change rien au scénario, qui reste le même objet
    //   pur dans les deux registres : elle décide seulement de ce que le
    //   compilateur ajoute autour du verdict (`visuel/primitives/reveal.js`).
    scenographie: scenique,
    // ★ `autoplay: true` — et non un instantané des conditions.
    //
    // Cette ligne portait `autoplayAutorise()`, qui recopiait ici les quatre
    // conditions du §3.4 et les figeait AU MOMENT DE CONSTRUIRE LA PAGE. Or à
    // cet instant `readyState` vaut « interactive » et l'onglet n'a pas
    // forcément le focus : l'expression rendait donc faux presque toujours, et
    // `options.autoplay` restant faux, la ré-évaluation que le lecteur fait sur
    // « load », « focus » et « visibilitychange » ne pouvait plus rien
    // rattraper. L'autoplay était éteint avant d'avoir eu sa chance.
    //
    // La page dit désormais ce qu'elle veut — « oui, cette page-là s'autojoue »
    // — et les conditions restent où elles peuvent être RE-testées : dans le
    // lecteur. Le mouvement réduit y est vérifié aussi (`this.reduced`), il n'a
    // pas besoin d'être redit ici.
    // ★ En SCÉNIQUE, pas d'autoplay : c'est le clic sur le rideau qui lance,
    //   et c'est ce clic qui autorise le son (voir `construireRideau`). En
    //   SOBRE, l'autoplay reste exactement ce qu'il était.
    autoplay: !scenique,
    // ★ La scène ET les commandes, entièrement à l'écran — sinon la
    // démonstration démarrerait sous les yeux de quelqu'un qui ne sait pas
    // encore qu'il peut l'arrêter. `transport` n'existe pas encore quand cette
    // ligne s'écrit : la fermeture le lira au moment du contrôle, c'est-à-dire
    // après le montage. Tant qu'il manque, la condition est fausse — et une
    // condition fausse ne CONSOMME pas l'autoplay (`player.js`), si bien que le
    // premier contrôle utile est celui qui suit le chargement.
    autoplayQuand: () => entierementVisible(cadre)
      && !!transport && entierementVisible(transport.element),
  });

  /* ── l'orage sonore ──────────────────────────────────────────────────────
     Créé APRÈS le lecteur et AVANT la barre : celle-ci a besoin de savoir s'il
     y a quelque chose à couper avant de dessiner son bouton (`options.sons`).
     En registre sobre — ou si le navigateur ne lit pas le format —, `creerSons`
     rend un joueur inerte : rien n'est chargé, et la barre n'affiche pas de
     bouton pour un réglage qui n'existerait pas. */
  const sons = creerSons({ registre: scenique ? 'scenique' : 'sobre' });
  const debrancherSons = brancherSons(lecteur, sons, { scenario });

  transport = creerTransport(lecteur, {}, {
    repetitions: pont.facteurRepetitions(),
    sons,
  });
  /* ★ LE RÉGISSEUR — il règle la richesse du feu sur ce que la machine tient.
     Il ne tourne qu'en scénique : sans feu, il n'y a rien à régler. Le pourquoi
     et le barème sont dans `src/visuel/qualite.js`, dont l'en-tête porte le
     réglage de plancher (15 images/seconde par défaut). */
  const debrancherRegisseur = scenique ? brancherLeRegisseur(sceneSvg) : () => {};

  const titreMethode = t('demo.methode', {
    rang: approche.rang ?? 1,
    titre: titreApproche(approche) || t('demo.sansTitre'),
  });
  /* ★ LE RIDEAU SE LÈVE SUR N'IMPORTE QUELLE COMMANDE, PAS SEULEMENT SUR LUI.

     « Quand je lance non pas en cliquant sur "Démonstration étape par étape"
     mais sur Lecture, celui-ci reste devant » (l'auteur). Le voile n'écoutait
     que son propre bouton : la barre de transport, elle, est SOUS le voile et
     reste cliquable — on lançait donc la démonstration derrière un rideau
     baissé, et rien ne le relevait.

     On s'abonne à `change`, qui est émis à chaque mouvement de la tête de
     lecture, quelle qu'en soit l'origine : lecture, étape suivante, saut au
     résultat, clic sur une dalle de la jauge, clic sur une ligne du Registre,
     raccourci clavier. Tous ces gestes ont ceci en commun qu'ils changent ce
     qu'il y a sur la scène — donc tous méritent qu'on la découvre.

     `lever()` est idempotent (`parti`), et le désabonnement a lieu au premier
     lever : ce qui n'a plus rien à surveiller ne surveille plus. */
  if (rideau) {
    const offRideau = lecteur.on('change', () => {
      if (!lecteur.playing && !(lecteur.stepIndex > 0) && !(lecteur.currentTime > 0)) return;
      rideau.lever({ focus: false, jouer: false });
      if (typeof offRideau === 'function') offRideau();
    });
  }

  const registre = creerRegistre(lecteur, {
    resultat: scenario.result,
    // ★ LE REGISTRE PORTE DÉSORMAIS LE TITRE DE LA PAGE.
    //
    // « On va renommer \u00ab\u00a0Le registre\u00a0\u00bb en \u00ab\u00a0M\u00e9thode 1 \u2014 En quatorze segments\u00a0\u00bb
    // (ou autre titre dynamique de la page), pour \u00e9purer encore davantage le
    // texte au-dessus de la sc\u00e8ne » (l'auteur). Le mot n'a pas \u00e9t\u00e9 remplac\u00e9 par
    // un autre mot : la ligne qui annon\u00e7ait la m\u00e9thode au-dessus de la sc\u00e8ne a
    // \u00e9t\u00e9 D\u00c9PLAC\u00c9E ici. Un seul endroit la dit, et c'est celui o\u00f9 elle sert de
    // titre \u00e0 quelque chose.
    titre: titreMethode,
  });

  const messages = [];
  if (ctx.bandeau) messages.push(localiser(ctx.bandeau));
  if (sourceLecteur === 'secours') {
    messages.push(t('bandeaux.illustration'));
    cadre.classList.add('scene-cadre--vide');
  }
  if (ctx.sourceScenario === 'secours' && sourceLecteur === 'secours') {
    messages.push(t('bandeaux.jeuDEssai'));
  }

  const bandeaux = messages.map((m) => e('p.bandeau', {}, [
    e('span.bandeau__marque', { texte: '△', 'aria-hidden': 'true' }),
    e('span', { texte: m }),
  ]));

  function majBadge() {
    const i = lecteur.stepIndex;
    badge.textContent = badgeT(i, nbEtapes);
    badge.title = t('demo.etapeSur', { i: i + 1, total: nbEtapes });
    if (ctx.debug) {
      const etape = (lecteur.steps || [])[i] || {};
      panneauDebug.replaceChildren(
        e('dt', { texte: t('demo.debug.etape') }),
        e('dd', { texte: `${i + 1}/${nbEtapes} — ${etape.id || '?'}` }),
        e('dt', { texte: t('demo.debug.temps') }),
        e('dd', { texte: `${Math.round(lecteur.currentTime)} / ${Math.round(lecteur.total)} ms` }),
        e('dt', { texte: t('demo.debug.source') }),
        e('dd', { texte: t('demo.debug.valeurSource', { lecteur: sourceLecteur, scenario: ctx.sourceScenario }) }),
        e('dt', { texte: t('demo.debug.url') }),
        e('dd', { texte: ctx.urlCanonique || t('demo.debug.indisponible') }),
      );
    }
  }
  const offChange = lecteur.on ? lecteur.on('change', () => { majBadge(); majArrivee(); }) : () => {};
  majBadge();

  /* ─────────────────── le thème et la timeline ──────────────────── */

  // Contrainte technique du moteur visuel : il RÉSOUT LES COULEURS À LA
  // COMPILATION, parce que WAAPI n'interpole pas `var(--gold)` — il lui faut
  // une valeur calculée. Une timeline compilée en « nuit d'encre » reste donc
  // en nuit d'encre après un passage au « parchemin » : les tokens de la scène
  // garderaient l'ancienne palette au milieu d'une page repeinte.
  // Un changement de thème pendant une démonstration impose `rebuild()`.
  //
  // Et SEULEMENT un changement de thème : `onReglages` se déclenche aussi pour
  // le réglage d'animation et pour une bascule système en mode « auto ». On
  // compare donc le thème EFFECTIF à celui avec lequel la timeline a été bâtie.
  //
  // Le rythme des redites impose lui aussi une recompilation, mais pas la même :
  // il CHANGE LES DURÉES, donc les charnières se déplacent. Conserver
  // `currentTime` tel quel — ce que fait `rebuild()` — ferait sauter le
  // spectateur à un tout autre endroit du récit. On conserve l'ÉTAPE et la
  // fraction parcourue à l'intérieur : le geste en cours reste le geste en
  // cours, à la même avancée, seule sa vitesse change.
  //
  // Même raisonnement pour le NIVEAU D'ANIMATION : il était jusqu'ici posé une
  // fois pour toutes à la création du lecteur, si bien qu'un « réduire les
  // animations » demandé en cours de démonstration ne prenait effet qu'au
  // rechargement — et la bascule des redites annonçait « sans effet » alors que
  // l'accélération, elle, courait toujours. Il se recompile donc aussi.
  let themeCompile = themeEffectif();
  let reditesCompile = repetitionsAccelerees();
  let mouvementCompile = reglageMouvement();

  function recompilerEnGardantLEtape(patch) {
    if (typeof lecteur.rebuild !== 'function') return;
    const i = lecteur.stepIndex;
    const avant = (lecteur.steps || [])[i];
    const part = avant && avant.duration > 0
      ? Math.min(1, Math.max(0, (lecteur.currentTime - avant.t0) / avant.duration))
      : 0;
    lecteur.rebuild(patch);
    const apres = (lecteur.steps || [])[i];
    if (apres) lecteur.seek(apres.t0 + part * apres.duration);
  }

  const offTheme = onReglages(() => {
    const theme = themeEffectif();
    const redites = repetitionsAccelerees();
    const mouvement = reglageMouvement();
    if (theme === themeCompile && redites === reditesCompile && mouvement === mouvementCompile) return;
    // Le thème ne touche qu'aux couleurs : `currentTime` reste juste. Le rythme
    // des redites et le niveau d'animation déplacent les charnières : il faut
    // alors conserver l'étape, pas l'instant.
    const dureesChangent = redites !== reditesCompile || mouvement !== mouvementCompile;
    themeCompile = theme;
    reditesCompile = redites;
    mouvementCompile = mouvement;
    if (dureesChangent) {
      recompilerEnGardantLEtape({ reducedMotion: mouvement, repeatSpeed: facteurRedites() });
    } else if (typeof lecteur.rebuild === 'function') {
      lecteur.rebuild();
    }
    transport.rafraichir();
    majBadge();
    majArrivee();
  });

  /* ───────────────────────── l'arrivée ──────────────────────────── */

  // Il n'y a plus de bloc d'arrivée. Il affichait « 6 6 6 » et « C.Q.F.D. »
  // sous la scène, atténués à 12 % avant la fin — assez pour lire la chute
  // dès la première seconde, alors que toute la démonstration consiste à y
  // amener. L'animation produit déjà le 666 à sa dernière étape ; le répéter
  // n'ajoutait rien et le pré-afficher retirait tout.
  // L'annonce de fin subsiste pour les lecteurs d'écran seuls (`registre.js`).
  const majArrivee = () => {};

  /* ───────────────────────── le partage ────────────────────────── */

  // ★ EN TÊTE, À DROITE DU TITRE — plus en bas de page.
  //
  // « Le bouton partager, plutôt qu'en dessous du contrôleur de lecture, viens
  // le mettre au-dessus de la scène à droite (et donc tout à droite du titre) »
  // (l'auteur). Il y gagne deux choses : il est visible sans faire défiler, et
  // il libère le bas de page, où il ne restait plus que lui.
  //
  // Son accusé de copie a suivi le déménagement : une ligne de texte qui
  // apparaît à côté d'un bouton en bas de page ne dérange personne, mais en
  // tête elle déplacerait le titre à chaque clic. C'est désormais une infobulle
  // qui flotte au-dessus de la mise en page (`src/app/infobulle.js`).
  const partage = boutonPartage({
    saisie,
    titreMethode: titreApproche(approche),
    resultat: scenario.result,
    url: ctx.urlCanonique ? location.origin + location.pathname + ctx.urlCanonique : null,
  });

  /* ───────────────────────── les raccourcis ─────────────────────── */

  const raccourcis = e('details.raccourcis', {}, [
    e('summary', { texte: t('demo.raccourcis.titre') }),
    e('table', {}, [
      e('tbody', {}, [
        ['espace', 'lecturePause'],
        ['gauche', 'precedente'],
        ['droite', 'suivante'],
        ['origine', 'debut'],
        ['fin', 'resultat'],
        ['d', 'panneau'],
      ].map(([cleTouche, cleAction]) => e('tr', {}, [
        e('th', { scope: 'row' }, [e('kbd', { texte: t(`demo.raccourcis.${cleTouche}`) })]),
        e('td', { texte: t(`demo.raccourcis.${cleAction}`) }),
      ]))),
    ]),
  ]);

  /* ───────────────────────── assemblage ─────────────────────────── */

  /* ★ LA GRILLE NE PORTE PLUS QUE LA SCÈNE ET SES COMMANDES.
     « Cale-le pour qu'il aille du haut de la scène jusqu'au bas du contrôleur
     de lecture, ni plus, ni moins » (l'auteur). C'est une contrainte de
     HAUTEUR, et CSS ne sait aligner deux colonnes que sur la hauteur de leur
     RANGÉE : tant que la colonne de gauche portait aussi la région live, le
     partage et les raccourcis, elle était plus haute que la scène, et une
     colonne étirée dessus dépassait forcément le contrôleur.
     Ce qui vit sous les commandes est donc sorti de la grille, et la rangée ne
     mesure plus que ce qu'elle doit mesurer. `align-items: stretch` (pages.css)
     fait le reste : le Registre reçoit exactement cette hauteur-là, et sa liste
     l'occupe jusqu'au dernier pixel. */
  const colonneGauche = e('div.demo__scene', {}, [cadre, transport.element]);

  const large = matchMedia(`(min-width: ${SEUIL_DEUX_COLONNES}px)`).matches;
  const colonneRegistre = large
    ? e('aside.registre-colonne', {}, [registre.element])
    // ★ En UNE colonne, plus de `<details>` : « sur mobile, très bien, sauf
    //   qu'il peut prendre toute la largeur comme la scène dès lors qu'il ne
    //   loge plus convenablement à côté » (l'auteur). Le `<summary>` répétait
    //   le titre que le Registre porte désormais lui-même, et le repli
    //   n'apportait rien : il était ouvert par défaut.
    : e('div.registre-pleine-largeur', {}, [registre.element]);

  const section = e('div.page.demo', {}, [
    e('a.evitement', { href: '#registre-titre', texte: t('demo.allerAuRegistre') }),
    ...bandeaux,
    e('div.demo__entete', {}, [
      // ★ PLUS DE LIGNE « MÉTHODE 1 — … » ICI : elle est devenue le titre du
      // Registre, à droite (`creerRegistre`, option `titre`).
      e('div.demo__titre', {}, [
        e('div', {}, [
          e('p.surtitre', { texte: t('demo.surtitre') }),
          e('h1', {}, [e('span.saisie-citee', { texte: guillemets(abreger(saisie, 120)) })]),
        ]),
        partage,
      ]),
      // ★ PLUS DE DESCRIPTION ICI — et c'est le pendant exact de ce qui a été
      // retiré des titres. La suite des règles (« On prend les lettres une par
      // une · Numérologie chaldéenne · On fait la moyenne ») a toute sa valeur
      // dans le LISTING, où elle aide à choisir une voie sans l'ouvrir. Sur
      // cette page-ci, on vient précisément de l'ouvrir : l'annoncer en tête
      // est soit du spoiler — la scène va montrer chaque opération à son tour,
      // et la lire d'avance en retire la surprise —, soit de la redite, puisque
      // Le Registre l'écrit étape par étape, et lui l'écrit AU MOMENT où elle
      // se produit.
    ]),
    e('div.demo__grille', {}, [colonneGauche, colonneRegistre]),
    registre.regionLive,
    raccourcis,
  ]);

  const detacherClavier = brancherClavier(section, lecteur, {
    surAide: () => { raccourcis.open = true; raccourcis.querySelector('summary').focus(); },
  });

  const surTouche = (ev) => {
    if (ev.key === 'd' || ev.key === 'D') {
      if (ev.target && ev.target.matches('input, textarea')) return;
      ctx.debug = !ctx.debug;
      panneauDebug.hidden = !ctx.debug;
      majBadge();
    }
  };
  section.addEventListener('keydown', surTouche);

  /**
   * Le rideau : un voile sur la scène, et un gros bouton de lecture devant.
   *
   * Il est construit AVANT le lecteur (la scène le contient dès le montage),
   * mais il lit `lecteur`, `transport` et `sons` dans une fermeture au moment
   * du clic — c'est-à-dire longtemps après leur création. Même dispositif que
   * la condition d'autoplay, et pour la même raison : ce qui est déclaré plus
   * bas ne se NOMME pas ici, il se lit plus tard.
   */
  function construireRideau() {
    const bouton = e('button.scene-jouer', {
      type: 'button',
      // Le nom accessible dit ce qui va se passer, son inclus : c'est la seule
      // chose que le voile ait à annoncer, et elle n'est pas devinable.
      'aria-label': t(sonActif() || !sonTranche() ? 'demo.jouerAvecSon' : 'demo.jouerSansSon'),
    }, [
      // Le triangle est purement graphique — le nom accessible est sur le
      // bouton. Un `<svg>` décoratif de plus dans l'arbre serait du bruit.
      s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [
        s('path', { d: 'M8 5.2v13.6L19 12z', fill: 'currentColor' }),
      ]),
      e('span.scene-jouer__mot', { texte: t('demo.jouerLabel') }),
    ]);

    const element = e('div.scene-voile', {}, [bouton]);

    let parti = false;
    /**
     * @param {{focus?:boolean, jouer?:boolean}} [comment]
     *   Les deux valent `true` quand c'est le bouton du voile qui lève : il
     *   vient de disparaître sous le pointeur, donc le focus doit atterrir
     *   quelque part, et rien n'a encore été lancé.
     *   Ils valent `false` quand le lever est PROVOQUÉ par une commande de la
     *   barre de transport : la lecture est déjà partie — la relancer
     *   rembobinerait —, et déplacer le focus arracherait le clavier au bouton
     *   sur lequel on vient d'appuyer, où l'on s'attend à retrouver Espace.
     */
    const lever = (comment = {}) => {
      if (parti) return;
      parti = true;
      const { focus = true, jouer = true } = comment;
      // ★ LE SON PART ACTIF — sauf refus explicite. `sonParDefautActif` ne
      //   touche à rien si le visiteur s'est déjà prononcé : c'est « activé par
      //   défaut », pas « activé de force » (`reglages.js`, `sonTranche`).
      sonParDefautActif();
      cadre.classList.remove('scene-cadre--rideau');
      // ★ RETIRÉ, pas masqué : un voile qui survit caché reste un nœud que les
      //   technologies d'assistance peuvent rencontrer, et un piège potentiel
      //   pour le focus. Ce qui n'a plus rien à faire là s'en va.
      element.remove();
      // Le focus suit ce qui vient de disparaître : sans ça, il retomberait sur
      // `<body>` et le clavier repartirait du haut de la page.
      if (focus) cadre.focus({ preventScroll: true });
      if (jouer) lecteur.play();
      if (transport) transport.rafraichir();
    };

    bouton.addEventListener('click', lever);
    return { element, lever };
  }

  return {
    element: section,
    monter() {
      // ★ En scénique, c'est le BOUTON qui reçoit le focus, pas la scène : il
      //   est la seule action possible à cet instant, et l'y poser évite de
      //   faire chercher au clavier ce qui saute aux yeux à la souris.
      const cible = rideau ? rideau.element.querySelector('button') : cadre;
      (cible || cadre).focus({ preventScroll: true });
    },
    detruire() {
      section.removeEventListener('keydown', surTouche);
      detacherClavier();
      if (typeof offChange === 'function') offChange();
      offTheme();
      // Le son d'abord : une piste qui survivrait à sa page continuerait de
      // jouer sous la suivante, et personne n'aurait plus de bouton pour
      // l'arrêter.
      debrancherRegisseur();
      debrancherSons();
      sons.detruire();
      transport.detruire();
      registre.detruire();
      if (typeof lecteur.destroy === 'function') lecteur.destroy();
    },
  };
}

/** L'en-tête de la page de démonstration.
 *
 *  ★ Le retour mène à L'ACCUEIL, plus au listing — et il ne prend donc plus
 *  d'URL de résultats. « Il ne reste que le lien d'énumération sur la page
 *  d'accueil qui permet d'accéder au listing » (l'auteur) : le listing cesse
 *  d'être une étape du parcours pour devenir une sortie de secours, à un seul
 *  endroit et nommée pour ce qu'elle fait.
 */
export function enteteDemonstration() {
  return e('header.barre-haute', {}, [
    e('a.lien-retour', { href: '#' }, [
      e('span', { texte: '◂', 'aria-hidden': 'true' }),
      e('span', { texte: t('entete.accueil') }),
    ]),
    logoEntete(),
    interrupteurs(),
  ]);
}
