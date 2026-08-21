/** Page de résultat — `…/##{b58}` */

import { e } from '../dom.js';
import { logoEntete } from '../logo.js';
import { guillemets, phraseApproches, abreger } from '../typo.js';
import { t, localiser } from '../../i18n/index.js';
import { titreApproche, regleApproche, methodeFragment } from '../libelles.js';
import { boutonCopier } from '../partage.js';
import * as pont from '../pont.js';
import { interrupteurs } from '../entete.js';

function carteVoie(approche, i, { surChoix, lienDisponible }) {
  const rang = approche.rang ?? i + 1;
  const regle = regleApproche(approche);
  const contenu = [
    e('span.voie__numero', { texte: t('resultat.voieNumero', { rang }) }),
    e('span.voie__titre', {
      texte: titreApproche(approche) || t('resultat.voieSansTitre', { rang: i + 1 }),
    }),
    regle ? e('span.voie__resume', { texte: regle }) : null,
    e('span.voie__pied', {}, [
      e('span.voie__resultat', { texte: (approche.resultat || '666').split('').join('·') }),
      e('span.voie__fleche', { texte: '▸', 'aria-hidden': 'true' }),
    ]),
    approche.joker ? e('span.legende', { texte: t('resultat.jokerNote') }) : null,
  ];

  // La carte est cliquable en entier, jamais seulement le titre.
  if (lienDisponible && approche.url) {
    return e('a.voie', { href: approche.url }, contenu);
  }
  return e('button.voie', {
    type: 'button',
    sur: { click: () => surChoix(approche, i) },
  }, contenu);
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
