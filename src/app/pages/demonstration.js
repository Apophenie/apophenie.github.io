/** Page de démonstration — `…/#{programme}#{b58}` */

import { e, svg as s } from '../dom.js';
import { logoEntete } from '../logo.js';
import { guillemets, abreger, badgeT } from '../typo.js';
import { t, localiser } from '../../i18n/index.js';
import { titreApproche, regleApproche, titreEtape } from '../libelles.js';
import { creerTransport, brancherClavier } from '../transport.js';
import { creerRegistre } from '../registre.js';
import { boutonPartage } from '../partage.js';
import { interrupteurs } from '../entete.js';
import {
  animationEffective, themeEffectif, repetitionsAccelerees, onReglages,
} from '../reglages.js';
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

/** Les quatre conditions de l'autoplay (CONTRACTS §3.4), consommées une fois. */
function autoplayAutorise() {
  return document.readyState === 'complete'
    && document.visibilityState === 'visible'
    && document.hasFocus()
    && animationEffective() !== 'reduite';
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
 *          urlCanonique:?string, urlResultats:?string, bandeau:?string, debug:boolean}} ctx
 * @returns {{element:HTMLElement, monter:Function, detruire:Function}}
 */
export function pageDemonstration(ctx) {
  const { saisie, approche, scenario } = ctx;
  const nbEtapes = (scenario.steps || []).length;

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

  const badge = e('p.badge-transformation', { texte: badgeT(0, nbEtapes) });

  const panneauDebug = e('dl.debug', { hidden: !ctx.debug });

  const cadre = e('div#scene.scene-cadre', {
    role: 'group',
    tabindex: '0',
    'aria-label': t('demo.sceneLabel'),
    'aria-describedby': 'etape-courante',
  }, [sceneSvg, badge, panneauDebug]);

  /* ──────────────────────── lecteur et reflets ──────────────────── */

  // Le rythme des redites est un réglage de COMPILATION : le lecteur le porte
  // dans ses options et le repasse à `compile()` à chaque construction, y
  // compris sur `rebuild()`. Voir `visuel/compile.js` § Répétitions.
  const facteurRedites = () => (repetitionsAccelerees() ? pont.facteurRepetitions() : 1);

  const { lecteur, source: sourceLecteur } = pont.creerLecteur(sceneSvg, scenario, {
    reducedMotion: reglageMouvement(),
    speed: 1,
    repeatSpeed: facteurRedites(),
    autoplay: autoplayAutorise(),
  });

  const transport = creerTransport(lecteur, {}, { repetitions: pont.facteurRepetitions() });
  const registre = creerRegistre(lecteur, { resultat: scenario.result });

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

  /* ───────────────────────── les actions ────────────────────────── */

  const actions = e('div.actions-finales', {}, [
    boutonPartage({
      saisie,
      titreMethode: titreApproche(approche),
      resultat: scenario.result,
      url: ctx.urlCanonique ? location.origin + location.pathname + ctx.urlCanonique : null,
    }),
    e('button.bouton-secondaire', {
      type: 'button',
      texte: t('demo.revoir'),
      sur: { click: () => { lecteur.toStart(); lecteur.play(); transport.rafraichir(); } },
    }),
    ctx.urlResultats
      ? e('a.bouton-secondaire', { href: ctx.urlResultats, texte: t('demo.autreVoie') })
      : null,
    e('a.bouton-secondaire', { href: '#', texte: t('demo.nouvelleRecherche') }),
  ]);

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

  const colonneGauche = e('div', {}, [
    cadre,
    transport.element,
    registre.regionLive,
    actions,
    raccourcis,
  ]);

  const large = matchMedia(`(min-width: ${SEUIL_DEUX_COLONNES}px)`).matches;
  const colonneRegistre = large
    ? e('aside.registre-colonne', {}, [registre.element])
    : e('details.registre-repli', { open: true }, [
      e('summary.h2-machine', { texte: t('registre.titre') }),
      registre.element,
    ]);

  const section = e('div.page.demo', {}, [
    e('a.evitement', { href: '#registre-titre', texte: t('demo.allerAuRegistre') }),
    ...bandeaux,
    e('div.demo__entete', {}, [
      e('p.demo__methode', {
        texte: t('demo.methode', {
          rang: approche.rang ?? 1,
          titre: titreApproche(approche) || t('demo.sansTitre'),
        }),
      }),
      e('p.surtitre', { texte: t('demo.surtitre') }),
      e('h1', {}, [e('span.saisie-citee', { texte: guillemets(abreger(saisie, 120)) })]),
      regleApproche(approche) ? e('p.demo__regle', { texte: regleApproche(approche) }) : null,
    ]),
    e('div.demo__grille', {}, [colonneGauche, colonneRegistre]),
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

  return {
    element: section,
    monter() { cadre.focus({ preventScroll: true }); },
    detruire() {
      section.removeEventListener('keydown', surTouche);
      detacherClavier();
      if (typeof offChange === 'function') offChange();
      offTheme();
      transport.detruire();
      registre.detruire();
      if (typeof lecteur.destroy === 'function') lecteur.destroy();
    },
  };
}

/** L'en-tête de la page de démonstration. */
export function enteteDemonstration(urlResultats) {
  return e('header.barre-haute', {}, [
    e('a.lien-retour', { href: urlResultats || '#' }, [
      e('span', { texte: '◂', 'aria-hidden': 'true' }),
      e('span', { texte: t('entete.toutesLesVoies') }),
    ]),
    logoEntete(),
    interrupteurs(),
  ]);
}
