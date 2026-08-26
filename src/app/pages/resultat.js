/** Page de résultat — `…/##{b58}` */

import { e } from '../dom.js';
import { logoEntete } from '../logo.js';
import { guillemets, phraseApproches, abreger } from '../typo.js';
import { t, localiser } from '../../i18n/index.js';
import { titreApproche, regleApproche, methodeFragment } from '../libelles.js';
import { boutonCopier } from '../partage.js';
import * as pont from '../pont.js';
import { interrupteurs } from '../entete.js';

/**
 * ★ LE COMPTEUR DE SÉRIES — « 5 × 6⋅6⋅6 », à cheval sur le bord DROIT du cadre.
 *
 * Le pendant du numéro de rang, qui chevauche le bord gauche : même hauteur,
 * même fond opaque qui découpe le filet, même casse machine. Deux repères
 * posés sur la même ligne d'horizon, l'un disant OÙ la voie se classe, l'autre
 * CE QU'ELLE RAPPORTE.
 *
 * ★ Pourquoi ici, alors qu'on vient de le retirer des titres.
 *
 * Ce n'est pas une contradiction, c'est la même règle appliquée à deux moments
 * de la lecture. Dans le LISTING, on choisit une voie : savoir que celle-ci
 * donne cinq séries plutôt qu'une aide à choisir, et il n'y a encore rien à
 * gâcher — on n'a rien vu. Sur la PAGE D'ANIMATION, on a choisi : l'annoncer
 * d'avance retire à la démonstration sa seule surprise. Le titre, lui, voyage
 * dans les deux pages ; c'est pour ça qu'il ne peut pas le porter, et que ce
 * compteur, qui ne quitte jamais le listing, le peut (`src/recherche/titres.js`).
 *
 * ★ `n === 1` n'affiche RIEN. « 1 × 6⋅6⋅6 » n'apprend rien — toute voie mène à
 * 666, c'est la promesse du site — et douze cartes portant toutes le même
 * badge n'en distingueraient aucune. Le compteur ne paraît que là où il dit
 * quelque chose : la majorité des cartes reste nue, et l'œil va droit aux
 * quelques-unes qui portent la marque.
 *
 * ★ Deux écritures pour deux lectures. « 5 × 6⋅6⋅6 » est un dessin : les points
 * médians séparent les trois 6 comme sur un cadran, et un lecteur d'écran en
 * ferait une bouillie de symboles. Le badge est donc `aria-hidden`, doublé
 * d'une phrase pleine — « cinq séries de 666 » — dans un `.visuellement-cachee`.
 * Une seule information, deux formes, chacune adressée à qui sait la lire.
 */
function compteurSeries(approche) {
  const n = (approche && approche.series) || 1;
  if (n < 2) return null;
  return e('span.voie__series', {}, [
    e('span', { texte: t('resultat.voieSeriesBadge', { n }), 'aria-hidden': 'true' }),
    e('span.visuellement-cachee', { texte: t('resultat.voieSeries', { n }) }),
  ]);
}

/**
 * Un panneau de voie complète.
 *
 * ★ DEUX ACCÈS EN PIED, ET NON PLUS UN SEUL — et c'est pour ça que le panneau
 * cesse d'être un lien.
 *
 * Le pied portait « 6·6·6 », qui répétait ce que le titre disait déjà (« cinq
 * séries de 666 ») et n'était cliquable que parce que toute la carte l'était.
 * Il porte désormais les deux MISES EN SCÈNE de la voie : la sobre, plus
 * crédible, et la scénique, plus frappante. Même programme, même verdict, même
 * rang — un marqueur d'URL les sépare (`src/recherche/url.js`).
 *
 * Une carte ne peut pas être un lien et contenir deux liens : un `<a>` dans un
 * `<a>` est invalide, et un panneau qui a deux destinations n'en a plus une.
 * La règle « la carte est cliquable en entier » ne s'applique donc plus — elle
 * n'existait que parce qu'il n'y avait qu'un endroit où aller.
 *
 * ★ Chaque accès dit OÙ IL MÈNE, pas seulement comment. « Sobre » tout seul,
 * répété douze fois dans la page, ne distingue rien pour qui parcourt la liste
 * des liens au lecteur d'écran : le nom accessible porte donc le titre de la
 * voie (`resultat.acces.sobreLabel`), là où le libellé visible reste court.
 */
function carteVoie(approche, i, { surChoix, lienDisponible }) {
  const rang = approche.rang ?? i + 1;
  const regle = regleApproche(approche);
  const titre = titreApproche(approche) || t('resultat.voieSansTitre', { rang: i + 1 });
  const entete = [
    e('span.voie__numero', { texte: t('resultat.voieNumero', { rang }) }),
    compteurSeries(approche),
    e('span.voie__titre', { texte: titre }),
    regle ? e('span.voie__resume', { texte: regle }) : null,
  ];
  const note = approche.joker ? e('span.legende', { texte: t('resultat.jokerNote') }) : null;

  // Le repli n'a pas d'URL du tout (`pont.js` : « un repli ne fabrique jamais
  // d'URL de partage »). Il n'y a alors qu'une destination, donc rien à
  // choisir : le panneau redevient un bouton cliquable en entier.
  if (!lienDisponible || !(approche.urlSobre && approche.urlScenique)) {
    return e('button.voie', {
      type: 'button',
      sur: { click: () => surChoix(approche, i) },
    }, [...entete, e('span.voie__pied', {}, [
      e('span.voie__fleche', { texte: '▸', 'aria-hidden': 'true' }),
    ]), note]);
  }

  const acces = (cle, url) => e(`a.voie__acces.voie__acces--${cle}`, {
    href: url,
    'aria-label': t(`resultat.acces.${cle}Label`, { titre }),
  }, [
    e('span.voie__acces-nom', { texte: t(`resultat.acces.${cle}`) }),
    e('span.voie__fleche', { texte: '▸', 'aria-hidden': 'true' }),
  ]);

  return e('div.voie.voie--double', {}, [
    ...entete,
    e('span.voie__pied.voie__pied--double', {}, [
      acces('sobre', approche.urlSobre),
      acces('scenique', approche.urlScenique),
    ]),
    note,
  ]);
}

/** Le libellé de méthode d'un fragment : celui qu'il porte, sinon un résumé
 *  fabriqué à partir du nombre de chemins trouvés. */
function libelleFragment(fragment) {
  const propre = methodeFragment(fragment);
  if (propre) return propre;
  if (!fragment.nbChemins) return '';
  const n = fragment.nbChemins;
  const chemins = t(n > 1 ? 'resultat.cheminsPluriels' : 'resultat.cheminUnique', { n });
  if (!fragment.famille) return chemins;
  // `famille` est un identifiant du moteur de recherche (`unite`, `ngramme`…),
  // pas une chaîne d'affichage : on le traduit ici. Une famille inconnue
  // s'affiche telle quelle plutôt que de disparaître.
  const cle = `resultat.familles.${fragment.famille}`;
  const nom = t(cle);
  return `${chemins} · ${nom === cle ? fragment.famille : nom}`;
}

function rangeeFragment(fragment, lienDisponible) {
  const contenu = [
    e('span.fragment__valeur', { texte: String(fragment.valeur ?? 6) }),
    e('span.fragment__texte', { texte: guillemets(fragment.texte) }),
    e('span.fragment__methode', { texte: libelleFragment(fragment) }),
  ];
  return lienDisponible && fragment.url
    ? e('a.fragment', { href: fragment.url }, contenu)
    : e('div.fragment', {}, contenu);
}

/**
 * @param {{saisie:string, resultat:Object, surChoixSecours:Function}} ctx
 */
export function pageResultat({ saisie, resultat, surChoixSecours }) {
  const secours = resultat.source === 'secours';
  const approches = resultat.approches || [];
  const fragments = resultat.fragments || [];

  const bandeaux = [];
  if (secours) {
    bandeaux.push(e('p.bandeau', {}, [
      e('span.bandeau__marque', { texte: '△', 'aria-hidden': 'true' }),
      e('span', { texte: t('bandeaux.moteurAbsent') }),
    ]));
  }
  if (resultat.avertissement) {
    bandeaux.push(e('p.bandeau', {}, [
      e('span.bandeau__marque', { texte: '△', 'aria-hidden': 'true' }),
      e('span', { texte: localiser(resultat.avertissement) }),
    ]));
  }

  const dedie = resultat.dedie
    ? e('div.cadre', { style: { padding: '18px', marginBottom: '36px' } }, [
      e('h2', { texte: localiser(resultat.dedie.titre), style: { marginBottom: '12px' } }),
      e('p.secondaire', { texte: localiser(resultat.dedie.texte) }),
    ])
    : null;

  const memo = e('section.panneau-terminal', {}, [
    e('h2', { texte: t('resultat.memo.titre') }),
    e('dl', {}, [
      e('dt', { texte: t('resultat.memo.grammaire') }),
      e('dd', { texte: t('resultat.memo.grammaireTexte') }),
      e('dt', { texte: t('resultat.memo.resonance') }),
      e('dd', { texte: t('resultat.memo.resonanceTexte') }),
      e('dt', { texte: t('resultat.memo.portee') }),
      e('dd', { texte: t('resultat.memo.porteeTexte') }),
      // Le registre de mise en scène fait partie de la grammaire (§4.2) : le
      // mémo la documente en entier, sinon les deux boutons ci-dessus
      // resteraient deux liens qu'on ne saurait pas écrire soi-même.
      e('dt', { texte: t('resultat.memo.registre') }),
      e('dd', { texte: t('resultat.memo.registreTexte') }),
    ]),
    e('div.panneau-terminal__actions', {}, [
      boutonCopier(t('resultat.memo.copier'), () =>
        (resultat.urlResultats ? location.origin + location.pathname + resultat.urlResultats : null)),
    ]),
  ]);

  const aucune = approches.length === 0
    ? e('div.cadre', { style: { padding: '18px' } }, [
      e('p', { texte: t('resultat.aucuneVoie') }),
    ])
    : null;

  return e('div.page.page--etroite.resultat', {}, [
    ...bandeaux,
    e('p.surtitre', { texte: t('resultat.surtitre') }),
    e('h1', {}, [e('span.saisie-citee', { texte: guillemets(abreger(saisie, 120)) })]),
    e('p.resultat__annonce', { texte: phraseApproches(approches.length) }),
    dedie,
    e('section.section', {}, [
      e('h2.h2-machine', { texte: t('resultat.voiesTitre') }),
      aucune || e('div.voies', {}, approches.map((a, i) =>
        carteVoie(a, i, { surChoix: surChoixSecours, lienDisponible: !secours }))),
    ]),
    fragments.length ? e('section.section', {}, [
      e('h2.h2-machine', { texte: t('resultat.fragmentsTitre') }),
      e('div.fragments', {}, fragments.map((f) => rangeeFragment(f, !secours))),
    ]) : null,
    memo,
  ]);
}

/** L'en-tête commun aux pages internes. */
export function enteteResultat() {
  return e('header.barre-haute', {}, [
    e('a.lien-retour', { href: '#' }, [
      e('span', { texte: '◂', 'aria-hidden': 'true' }),
      e('span', { texte: t('entete.recommencer') }),
    ]),
    logoEntete(),
    interrupteurs(),
  ]);
}
