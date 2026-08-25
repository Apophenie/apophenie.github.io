/** Le sélecteur replié — la mécanique partagée du thème et de la langue.
 *
 *  Ergonomie (reprise du sélecteur de `dapp-g1-framework`, réécrite ici en
 *  vanilla sans build, sans Shadow DOM et sans dépendance) :
 *
 *    · un BOUTON DÉCLENCHEUR replié n'affichant qu'un picto — celui de l'état
 *      ACTIF — bordé d'un liseret ;
 *    · au clic, un PANNEAU déroulant listant les options en picto + libellé ;
 *      le libellé n'apparaît QUE dans le panneau ;
 *    · fermeture par Échap, par un clic extérieur, ou par la sélection ;
 *    · le panneau NE VOLE PAS le focus à l'ouverture — on ouvre pour regarder.
 *      La flèche bas (ou Entrée depuis le clavier) y entre délibérément ;
 *    · déclencheur visuellement 40 px, **cible cliquable 48 px** (WCAG 2.5.5
 *      exige 44 ; CONTRACTS §6 exige 48 : on prend le plus exigeant), obtenue
 *      par un pseudo-élément transparent qui déborde — le dessin ne grossit pas ;
 *    · le panneau se réaligne s'il sortait du viewport.
 *
 *  Aucun `disabled` : l'option courante reste focusable (CONTRACTS §6). */

import { e } from './dom.js';

/**
 * @param {{
 *   id: string,                      identifiant stable du déclencheur (refocus)
 *   label: string,                   nom accessible du groupe (« Thème », « Langue »)
 *   titre: (libelle:string)=>string, infobulle du déclencheur replié
 *   options: Array<{valeur:string, libelle:string, picto:()=>SVGElement}>,
 *   pictoDeclencheur?: ()=>SVGElement,   // à défaut : le picto de l'option active
 *   valeur: ()=>string,              la valeur active, relue à chaque peinture
 *   surChoix: (valeur:string)=>void
 * }} config
 * @returns {{element:HTMLElement, peindre:Function, fermer:Function, detruire:Function}}
 */
export function creerSelecteur(config) {
  const racine = e('div.selecteur', { 'data-ouvert': 'non' });

  const declencheur = e(`button#${config.id}.selecteur__declencheur`, {
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': config.label,
  });

  const liste = e('ul.selecteur__liste', { role: 'listbox', 'aria-label': config.label });
  const panneau = e('div.selecteur__panneau', { hidden: true }, [liste]);

  racine.append(declencheur, panneau);

  let ouvert = false;
  let detacherGlobal = null;

  /* ──────────────────────────── ouverture ──────────────────────────── */

  /** Le panneau est plus large que son déclencheur : ancré par défaut sur le
   *  bord de fin de ligne (`inset-inline-end: 0`), il peut malgré tout sortir de
   *  l'écran quand la barre haute se replie. On ne corrige QUE si ça déborde —
   *  sinon aucun style en ligne n'est posé et le CSS garde la main. */
  function reglerDansLeViewport() {
    panneau.style.removeProperty('left');
    panneau.style.removeProperty('right');
    const boite = panneau.getBoundingClientRect();
    if (!boite.width) return;
    const largeur = window.innerWidth || 0;
    if (boite.left < 0) { panneau.style.left = '0'; panneau.style.right = 'auto'; }
    else if (largeur && boite.right > largeur) { panneau.style.right = '0'; panneau.style.left = 'auto'; }
  }

  function ouvrir({ focaliser = false } = {}) {
    if (ouvert) return;
    ouvert = true;
    panneau.hidden = false;
    racine.setAttribute('data-ouvert', 'oui');
    declencheur.setAttribute('aria-expanded', 'true');
    reglerDansLeViewport();

    // Le clic extérieur est écouté en CAPTURE, donc avant qu'un `stopPropagation`
    // interne ne l'avale. L'écouteur est posé pendant le clic d'ouverture : la
    // phase de capture du document est déjà passée pour cet évènement-là, il ne
    // se refermera donc pas immédiatement.
    const surClicAilleurs = (ev) => { if (!racine.contains(ev.target)) fermer(); };
    // Échap est écouté sur le document : il ferme même si le focus est resté sur
    // le déclencheur, ou n'est nulle part.
    const surEchap = (ev) => {
      if (ev.key !== 'Escape') return;
      ev.stopPropagation();
      fermer({ rendreLeFocus: true });
    };
    document.addEventListener('click', surClicAilleurs, true);
    document.addEventListener('keydown', surEchap, true);
    window.addEventListener('resize', reglerDansLeViewport);
    detacherGlobal = () => {
      document.removeEventListener('click', surClicAilleurs, true);
      document.removeEventListener('keydown', surEchap, true);
      window.removeEventListener('resize', reglerDansLeViewport);
      detacherGlobal = null;
    };

    if (focaliser) {
      const cible = liste.querySelector('[aria-selected="true"]') || liste.firstElementChild;
      if (cible) cible.focus();
    }
  }

  function fermer({ rendreLeFocus = false } = {}) {
    if (!ouvert) return;
    ouvert = false;
    panneau.hidden = true;
    racine.setAttribute('data-ouvert', 'non');
    declencheur.setAttribute('aria-expanded', 'false');
    if (detacherGlobal) detacherGlobal();
    if (rendreLeFocus) declencheur.focus();
  }

  function basculer() { ouvert ? fermer() : ouvrir(); }

  /* ──────────────────────────── peinture ──────────────────────────── */

  function peindre() {
    const courante = config.valeur();
    const active = config.options.find((o) => o.valeur === courante) || config.options[0];

    // Le nom accessible du déclencheur porte le GROUPE **et** l'état actif —
    // « Thème : Sombre » — parce qu'un bouton replié n'affiche qu'un picto :
    // « Thème » seul laisserait ignorer ce qui est en vigueur. Le panneau, lui,
    // garde le nom court (« Thème ») : la liste dit déjà l'état, option par option.
    const nom = config.titre(active ? active.libelle : '');
    // ★ `pictoDeclencheur` — un déclencheur nomme le CONTRÔLE, une option nomme
    // le CHOIX, et ce ne sont pas toujours les mêmes signes.
    //
    // Sur le thème, ils coïncident : le soleil ou le croissant disent à la fois
    // « réglage de thème » et « celui-ci est en vigueur ». Sur la langue, non —
    // les deux marques de citation distinguent parfaitement le français de
    // l'anglais **une fois posées côte à côte**, mais seule sur un bouton, l'une
    // d'elles ne dit pas de quoi il s'agit. Le déclencheur peut donc porter son
    // propre picto ; à défaut, il garde celui de l'option active, et rien ne
    // change pour les sélecteurs qui n'en demandent pas.
    const picto = typeof config.pictoDeclencheur === 'function'
      ? config.pictoDeclencheur
      : (active ? active.picto : null);
    declencheur.replaceChildren(picto ? picto() : null);
    declencheur.setAttribute('title', nom);
    declencheur.setAttribute('aria-label', nom);

    liste.replaceChildren(...config.options.map((option) => {
      const choisie = option.valeur === courante;
      const item = e('li.selecteur__option', {
        role: 'option',
        tabindex: '0',
        'aria-selected': choisie ? 'true' : 'false',
      }, [
        e('span.selecteur__picto', { 'aria-hidden': 'true' }, [option.picto()]),
        e('span.selecteur__libelle', { texte: option.libelle }),
      ]);
      item.dataset.valeur = option.valeur;
      return item;
    }));
  }

  /* ──────────────────────────── interactions ──────────────────────────── */

  declencheur.addEventListener('click', () => basculer());
  declencheur.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      ouvrir({ focaliser: true });
    }
  });

  const choisir = (valeur) => {
    fermer({ rendreLeFocus: true });
    config.surChoix(valeur);
  };

  liste.addEventListener('click', (ev) => {
    const item = ev.target.closest('.selecteur__option');
    if (item) choisir(item.dataset.valeur);
  });

  liste.addEventListener('keydown', (ev) => {
    const item = ev.target.closest('.selecteur__option');
    if (!item) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      choisir(item.dataset.valeur);
      return;
    }
    // Navigation par flèches à l'intérieur du panneau, sans bouclage : arrivé en
    // haut, la flèche haut rend la main au déclencheur.
    const items = Array.from(liste.children);
    const i = items.indexOf(item);
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      (items[i + 1] || items[items.length - 1]).focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (i === 0) declencheur.focus(); else items[i - 1].focus();
    } else if (ev.key === 'Home') {
      ev.preventDefault(); items[0].focus();
    } else if (ev.key === 'End') {
      ev.preventDefault(); items[items.length - 1].focus();
    } else if (ev.key === 'Tab') {
      // Sortir du panneau au clavier le referme : il n'a plus de raison d'être.
      fermer();
    }
  });

  peindre();

  return {
    element: racine,
    peindre,
    fermer,
    detruire() { if (detacherGlobal) detacherGlobal(); },
  };
}
