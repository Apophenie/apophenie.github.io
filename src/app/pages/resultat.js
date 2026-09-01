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
 * ★ LE COMPTEUR DE SÉRIES — « 5 × 666 », à cheval sur le bord DROIT du cadre.
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
 * ★ `n === 1` n'affiche RIEN. « 1 × 666 » n'apprend rien — toute voie mène à
 * 666, c'est la promesse du site — et douze cartes portant toutes le même
 * badge n'en distingueraient aucune. Le compteur ne paraît que là où il dit
 * quelque chose : la majorité des cartes reste nue, et l'œil va droit aux
 * quelques-unes qui portent la marque.
 *
 * ★ Deux écritures pour deux lectures. « 5 × 666 » est un raccourci de
 * comptable : un lecteur d'écran en ferait « cinq fois six cent soixante-six »,
 * ce qui n'est pas ce qu'on veut dire. Le badge est donc `aria-hidden`, doublé
 * d'une phrase pleine — « cinq séries de 666 » — dans un `.visuellement-cachee`.
 * Une seule information, deux formes, chacune adressée à qui sait la lire.
 *
 * ★ Les points médians ont disparu. « 5 × 6⋅6⋅6 » séparait les trois 6 comme
 * sur un cadran ; l'auteur a tranché pour « 5 × 666 », qui est le nombre dont
 * le site parle et non son épellation.
 */
function compteurSeries(approche, cible) {
  const n = (approche && approche.series) || 1;
  if (n < 2) return null;
  return e('span.voie__series', {}, [
    e('span', { texte: t('resultat.voieSeriesBadge', { n, cible }), 'aria-hidden': 'true' }),
    e('span.visuellement-cachee', { texte: t('resultat.voieSeries', { n, cible }) }),
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
function carteVoie(approche, i, { surChoix, lienDisponible, cible, registres }) {
  const rang = approche.rang ?? i + 1;
  const regle = regleApproche(approche);
  const titre = titreApproche(approche) || t('resultat.voieSansTitre', { rang: i + 1 });
  const entete = [
    e('span.voie__numero', { texte: t('resultat.voieNumero', { rang }) }),
    compteurSeries(approche, cible),
    e('span.voie__titre', { texte: titre }),
    regle ? e('span.voie__resume', { texte: regle }) : null,
  ];
  const note = approche.joker ? e('span.legende', { texte: t('resultat.jokerNote') }) : null;

  // Le repli n'a pas d'URL du tout (`pont.js` : « un repli ne fabrique jamais
  // d'URL de partage »). Il n'y a alors qu'une destination, donc rien à
  // choisir : le panneau redevient un bouton cliquable en entier.
  // ★ UN SEUL ACCÈS QUAND LA CIBLE N'A QU'UN REGISTRE. La mise en scène du
  //   verdict est celle du 666 ; une cible sans emblème n'a rien à jouer, et
  //   `url.js` replie alors « scénique » sur « sobre » (`registreEffectif`).
  //   Afficher deux boutons qui mènent au MÊME lien serait une promesse fausse
  //   — et un panneau à une seule destination redevient un bouton entier, ce
  //   qui est justement ce que la règle « la carte est cliquable en entier »
  //   disait avant qu'il y en ait deux.
  const doubleAcces = registres.length > 1;
  if (!lienDisponible || !doubleAcces || !(approche.urlSobre && approche.urlScenique)) {
    const seul = lienDisponible && approche.urlSobre;
    const pied = e('span.voie__pied', {}, [
      e('span.voie__fleche', { texte: '▸', 'aria-hidden': 'true' }),
    ]);
    if (seul) {
      return e('a.voie', { href: seul, 'aria-label': titre }, [...entete, pied, note]);
    }
    return e('button.voie', {
      type: 'button',
      sur: { click: () => surChoix(approche, i) },
    }, [...entete, pied, note]);
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

/**
 * ══════════════════ ★ LE PODIUM — deux questions, deux encadrés ═════════════
 *
 * Les deux premières lignes d'un listing ne répondent PAS à la même question.
 * « 1ʳᵉ suggestion — l'élégance. […] 2ᵈ suggestion — le nombre de triptyques, au
 * prix d'une élégance éventuellement moindre, sans l'ignorer. 3ᵉ et suivantes —
 * un mixte pondéré des deux » (l'auteur, cité par `src/recherche/score.js ›
 * POIDS_DES_REGIMES`). Le reste de la liste est trié à un troisième barème.
 *
 * Trois barèmes affichés à l'identique, ça ne se voit pas : la liste ressemble
 * à un classement unique dont les deux premières lignes seraient parfois mal
 * rangées — « pourquoi celle-ci, avec ses deux séries, passe-t-elle devant
 * celle-là qui en a cinq ? ». L'encadré répond avant qu'on pose la question :
 * ce ne sont pas deux places, ce sont deux réponses.
 *
 * ★ **La marque vient de `approche.suggestion`, JAMAIS du rang.** C'est
 * `src/recherche/index.js › selectionner()` qui la pose, et lui seul sait si la
 * seconde suggestion avait quelque chose à dire — elle ne prend sa place que
 * quand elle aligne réellement PLUS de séries que la première, faute de quoi
 * elle n'existe pas. Se fier au rang encadrerait alors une ligne du mixte en
 * lui faisant dire ce qu'elle ne dit pas. Une liste courte, un résultat de
 * secours ou une liste rejouée à un barème unique n'en portent aucune : il n'y
 * a alors pas d'encadré du tout, et surtout pas d'encadré vide.
 *
 * ★ **« maximisation », alors que le moteur dit « triptyques ».** Le moteur
 * nomme ce qu'il COMPTE — les séries de 666 —, la page nomme ce qu'on VIENT
 * chercher. « Triptyques » est un mot d'ingénieur, exact et opaque ; l'encadré
 * n'explique pas le barème, il annonce une intention. Même écart qu'entre
 * `elegance` (l'identifiant) et « Élégance » (l'intitulé) : les deux tables ne
 * se confondent pas, et c'est ici — dans la page — qu'elles se rejoignent.
 */
const PLACES_DU_PODIUM = Object.freeze([
  Object.freeze({ suggestion: 'elegance', cle: 'elegance' }),
  Object.freeze({ suggestion: 'triptyques', cle: 'maximisation' }),
]);

/**
 * Un encadré de podium : son intitulé, sa glose, et la carte qu'il englobe.
 *
 * ★ Le titre est un `h3`, sous le `h2` « Les voies complètes » qui ouvre la
 * section : l'encadré est une subdivision de la liste, pas une section de plus.
 * La hiérarchie de la page reste donc h1 (la saisie) → h2 (les listes) → h3
 * (les deux places).
 *
 * ★ La GLOSE tient en trois mots — « la plus belle », « la plus fournie ». Ce
 * n'est pas une explication du barème (il en faudrait un paragraphe, et il est
 * déjà écrit dans `score.js`) : c'est le mot que l'auteur emploie lui-même pour
 * dire, en passant, ce que la place récompense.
 *
 * ★ L'encadré n'a PAS de fond à lui, et c'est nécessaire, pas décoratif : le
 * numéro de rang et le compteur de séries de la carte sont à cheval sur son
 * filet, avec un aplat de `--canvas` qui le découpe (`.voie__numero`,
 * `.voie__series`). Un encadré peint aurait laissé deux rectangles de la
 * couleur du fond de page au milieu.
 */
function socleDePodium(cle, carte) {
  return e(`section.podium__place.podium__place--${cle}`, {}, [
    e('h3.podium__titre', { texte: t(`resultat.podium.${cle}`) }),
    e('p.podium__glose', { texte: t(`resultat.podium.${cle}Glose`) }),
    carte,
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

function rangeeFragment(fragment, lienDisponible, chiffreParDefaut) {
  const contenu = [
    e('span.fragment__valeur', { texte: String(fragment.valeur ?? chiffreParDefaut) }),
    e('span.fragment__texte', { texte: guillemets(fragment.texte) }),
    e('span.fragment__methode', { texte: libelleFragment(fragment) }),
  ];
  return lienDisponible && fragment.url
    ? e('a.fragment', { href: fragment.url }, contenu)
    : e('div.fragment', {}, contenu);
}

/**
 * ★ LES CIBLES MISES EN VITRINE — celles que l'auteur nomme, dans son ordre.
 *
 * « Demandez, demandez les calculs pour obtenir : [111] [777] [000] [13] [007]
 * ou la valeur de votre choix. » Ce sont des RACCOURCIS, pas une liste close :
 * le champ libre à côté accepte tout ce que la grammaire accepte, et c'est lui
 * qui porte la promesse. Les cinq puces ne sont là que pour montrer à quoi
 * ressemble une réponse — dont deux, `13` et `007`, disent en un coup d'œil que
 * la cible n'est ni forcément de longueur trois, ni forcément un chiffre
 * répété.
 *
 * ★ Elles ne contiennent pas 666, et c'est le principe même de la section :
 * on propose de sortir de la maison, pas d'y rester. La cible courante, elle,
 * est écartée de la liste plus bas — proposer d'aller où l'on est déjà n'est
 * pas une proposition.
 */
const CIBLES_EN_VITRINE = Object.freeze(['111', '777', '000', '13', '007']);

/**
 * ★ LA COMMANDE DE CIBLE — « trop diabolique pour vous ? »
 *
 * Cinq raccourcis, un champ libre, un bouton. Le résultat est la MÊME page,
 * pour une autre cible : on ne quitte pas le listing, on le recalcule.
 *
 * ── Le titre suit la cible, et il ne connaît pas de liste ─────────────────
 *
 * « Et "Trop diabolique pour vous ?" devient alors "Trop prévisible ?" (si les
 * résultats au-dessus sont calés sur autre chose que 666 comme objectif.) »
 * (l'auteur). La question se pose donc à la cible elle-même — `cible.defaut` —
 * et non à une liste de cibles réputées diaboliques qu'il faudrait tenir à jour
 * quelque part. C'est la même discipline que partout ailleurs ici : le nombre
 * 666 n'est écrit qu'à UN endroit du dépôt (`src/recherche/cible.js`), et tout
 * ce qui a besoin de savoir s'il est en jeu le lui demande.
 *
 * ── Pourquoi un `<form>` et non trois écouteurs ───────────────────────────
 *
 * Un formulaire donne gratuitement ce qu'il faudrait sinon écrire : la touche
 * Entrée valide, le bouton est le bouton par défaut, le champ est associé à son
 * étiquette, et un lecteur d'écran annonce un groupe de saisie plutôt qu'un
 * champ perdu. `inputmode="numeric"` fait monter le pavé numérique sur mobile
 * sans interdire le clavier physique, là où `type="number"` aurait apporté des
 * flèches, un séparateur de milliers selon la locale, et surtout la perte des
 * zéros de tête — c'est-à-dire exactement `007`, l'un des cinq exemples.
 *
 * ── Et la navigation passe par le HASH, jamais par un rendu direct ────────
 *
 * Changer de cible, c'est changer d'URL : `#c111!#<b58>`. Le routeur fait le
 * reste. Rendre la page nous-mêmes donnerait un listing dont l'adresse ment,
 * qu'on ne pourrait ni partager ni recharger — et le partage est la raison
 * d'être de toute cette grammaire.
 */
function commandeDeCible({ saisie, cible, texteCible }) {
  const lien = (texte) => pont.ecrireHash({ saisie, cible: texte });
  // Un repli sans grammaire d'URL ne fabrique aucun lien (`pont.js`) : la
  // commande n'aurait alors nulle part où mener, et une commande qui ne commande
  // rien vaut moins que pas de commande du tout.
  if (!lien(CIBLES_EN_VITRINE[0])) return null;

  const max = pont.MAX_CHIFFRES();
  const defaut = !cible || cible.defaut;

  // La cible COURANTE sort de la vitrine : « demandez les calculs pour obtenir
  // 111 » n'a rien à proposer à qui les regarde déjà.
  const raccourcis = CIBLES_EN_VITRINE.filter((c) => c !== texteCible);

  const champ = e('input.champ.champ--cible', {
    type: 'text',
    inputmode: 'numeric',
    pattern: `[0-9]{1,${max}}`,
    maxlength: String(max),
    autocomplete: 'off',
    id: 'cible-libre',
    name: 'cible',
    placeholder: CIBLES_EN_VITRINE[0],
    'aria-describedby': 'cible-aide',
  });

  const formulaire = e('form.commande-cible__forme', {
    sur: {
      submit: (ev) => {
        ev.preventDefault();
        const lue = pont.lireCible(champ.value.trim());
        if (!lue) {
          // On refuse SUR PLACE plutôt que de replier en silence sur 666 : le
          // visiteur a demandé quelque chose de précis, et lui rendre autre
          // chose sans le dire est le seul comportement que §4.3 interdit
          // formellement.
          champ.setAttribute('aria-invalid', 'true');
          champ.focus();
          return;
        }
        champ.removeAttribute('aria-invalid');
        const cible = lue.texte;
        const href = lien(cible);
        if (href) location.hash = href;
      },
      input: () => champ.removeAttribute('aria-invalid'),
    },
  }, [
    e('label.visuellement-cachee', { for: 'cible-libre', texte: t('resultat.cible.champLabel') }),
    champ,
    e('button.bouton-secondaire.commande-cible__valider', {
      type: 'submit', texte: t('resultat.cible.calculer'),
    }),
  ]);

  return e('section.section.commande-cible', {}, [
    e('h2.h2-machine', {
      texte: t(defaut ? 'resultat.cible.titreDiabolique' : 'resultat.cible.titreAutre'),
    }),
    e('p.commande-cible__appel', { texte: t('resultat.cible.appel') }),
    e('ul.commande-cible__raccourcis', {}, raccourcis.map((c) => e('li', {}, [
      e('a.bouton-secondaire.commande-cible__puce', {
        href: lien(c),
        'aria-label': t('resultat.cible.raccourciLabel', { cible: c }),
        texte: c,
      }),
    ]))),
    e('p.commande-cible__ou', { texte: t('resultat.cible.ou') }),
    formulaire,
    e('p.legende#cible-aide', { texte: t('resultat.cible.champAide', { max }) }),
    // Ce que le visiteur regarde en ce moment. Discret, mais présent : sur une
    // page calée sur 007, la vitrine ne montre plus 007, et rien ne dirait
    // autrement d'où l'on part.
    defaut ? null : e('p.legende', { texte: t('resultat.cible.courante', { cible: texteCible }) }),
  ]);
}

/**
 * La page de listing.
 *
 * ★ `podium` — le drapeau qui éteint les deux encadrés.
 *
 * Il vaut `true` par défaut, parce que c'est le cas normal : la liste vient de
 * `selectionner()`, ses deux premières lignes répondent à deux questions
 * distinctes, et les encadrés le disent. Il devra valoir `false` dès qu'un
 * classement à barème UNIQUE produira la liste — la pondération personnalisée
 * en préparation, où toutes les voies sont notées au même curseur. Là, il n'y a
 * plus qu'une question : encadrer les deux premières ligne leur ferait dire
 * qu'elles répondent à autre chose que les suivantes, ce qui serait faux.
 *
 * Éteindre le drapeau ne retire aucune voie : les approches marquées repassent
 * simplement dans la grille commune, à leur rang. C'est pour ça que le drapeau
 * est ici et non dans le moteur — c'est une décision d'AFFICHAGE, et la marque
 * `approche.suggestion` reste posée par `src/recherche/index.js` quoi qu'il
 * arrive.
 *
 * @param {{saisie:string, resultat:Object, cible?:Object|string,
 *          surChoixSecours:Function, podium?:boolean}} ctx
 */
export function pageResultat({ saisie, resultat, cible, surChoixSecours, podium = true }) {
  const secours = resultat.source === 'secours';
  const approches = resultat.approches || [];
  const fragments = resultat.fragments || [];
  // ★ LA CIBLE EN COURS — lue à UN seul endroit, et relayée partout. Elle
  //   décide de trois choses dans cette page : ce que les phrases annoncent
  //   (« mènent à 666 » / « mènent à 111 »), combien d'accès porte un panneau,
  //   et le titre de la commande du bas. Aucune de ces trois n'a le droit de
  //   réécrire « 666 » : la constante vit dans `src/recherche/cible.js`, et il
  //   n'en existe pas de septième copie.
  const cibleObjet = pont.normaliserCible(cible ?? resultat.cible);
  const texteCible = pont.texteCible(cible ?? resultat.cible);
  const chiffreCible = cibleObjet && cibleObjet.homogene
    ? String(cibleObjet.chiffres[0]) : texteCible;
  const registres = pont.registresDisponibles(cibleObjet || texteCible);

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
      // Les portées GROUPÉES suivent immédiatement la portée : c'est la même
      // notation, écrite une fois pour plusieurs places. Le mémo doit la
      // porter parce que le site l'ÉCRIT (`url.js`) — sans elle, un visiteur
      // verrait dans ses propres liens un « + » avant le « : » que rien ici
      // n'expliquerait.
      e('dt', { texte: t('resultat.memo.portees') }),
      e('dd', { texte: t('resultat.memo.porteesTexte') }),
      // Le registre de mise en scène fait partie de la grammaire (§4.2) : le
      // mémo la documente en entier, sinon les deux boutons ci-dessus
      // resteraient deux liens qu'on ne saurait pas écrire soi-même.
      e('dt', { texte: t('resultat.memo.registre') }),
      e('dd', { texte: t('resultat.memo.registreTexte') }),
      // La cible fait partie de la grammaire (§4.2) au même titre que le
      // registre : le mémo la documente, sinon la commande ci-dessus resterait
      // un bouton dont on ne saurait pas écrire le lien soi-même.
      e('dt', { texte: t('resultat.memo.cible') }),
      e('dd', { texte: t('resultat.memo.cibleTexte') }),
    ]),
    e('div.panneau-terminal__actions', {}, [
      boutonCopier(t('resultat.memo.copier'), () =>
        (resultat.urlResultats ? location.origin + location.pathname + resultat.urlResultats : null)),
    ]),
  ]);

  // ★ Deux aveux, et le second n'est pas une plaisanterie. « C'est
  //   mathématiquement impossible » repose sur la garantie « jamais bredouille »
  //   de §5.3 — qui est une propriété du JOKER FRANÇAIS, dont le cycle
  //   attracteur ne visite que 3, 4, 5 et 6 (`assemblage.js › approcheJoker`).
  //   Elle ne vaut donc que pour 666. Sur une autre cible, ne rien trouver est
  //   un résultat possible, et le dire vaut mieux que blaguer à côté.
  const aucune = approches.length === 0
    ? e('div.cadre', { style: { padding: '18px' } }, [
      e('p', {
        texte: cibleObjet && !cibleObjet.defaut
          ? t('resultat.aucuneVoieCible', { cible: texteCible })
          : t('resultat.aucuneVoie'),
      }),
    ])
    : null;

  // ── Le podium, s'il y a lieu ────────────────────────────────────────────
  // Les places sont cherchées PAR LEUR MARQUE (`suggestion`), et l'index
  // d'origine voyage avec l'approche : c'est lui que `carteVoie` utilise pour
  // numéroter et pour rappeler `surChoixSecours`. Sortir une approche de la
  // grille ne doit pas la renuméroter — le n° 2 reste le n° 2, encadré ou non.
  const places = (podium ? PLACES_DU_PODIUM : [])
    .map(({ suggestion, cle }) => {
      const i = approches.findIndex((a) => a && a.suggestion === suggestion);
      return i < 0 ? null : { cle, i, approche: approches[i] };
    })
    .filter(Boolean);
  const encadrees = new Set(places.map((p) => p.i));
  const grille = approches
    .map((approche, i) => ({ approche, i }))
    .filter(({ i }) => !encadrees.has(i));

  const carte = ({ approche, i }) => carteVoie(approche, i, {
    surChoix: surChoixSecours, lienDisponible: !secours, cible: texteCible, registres,
  });
  // `null` plutôt qu'un conteneur vide dans les deux sens : une liste de deux
  // voies toutes deux encadrées ne laisse rien à la grille, et une liste sans
  // marque ne laisse rien au podium. `e()` ignore les `null`.
  const listeDesVoies = [
    places.length ? e('div.podium', {}, places.map((p) => socleDePodium(p.cle, carte(p)))) : null,
    grille.length ? e('div.voies', {}, grille.map(carte)) : null,
  ];

  return e('div.page.page--etroite.resultat', {}, [
    // ⚠️ Le bandeau d'erreur du routeur s'insère devant `firstChild` : ce qui
    //    ouvre la page doit rester un enfant direct, sinon il atterrirait dans
    //    une colonne. C'est aussi pourquoi l'en-tête ne descend pas dans le
    //    corps à deux colonnes ci-dessous.
    ...bandeaux,
    e('p.surtitre', { texte: t('resultat.surtitre') }),
    e('h1', {}, [e('span.saisie-citee', { texte: guillemets(abreger(saisie, 120)) })]),
    e('p.resultat__annonce', { texte: phraseApproches(approches.length, texteCible) }),
    dedie,
    /**
     * ★ LE CORPS À DEUX COLONNES — « sur grand écran, tout ce qui va de "Trop
     *   diabolique pour vous ?" jusqu'à la fin de l'encart "Assembler vos
     *   propres arcanes" passe en aside, dans une 2ᵈ colonne à droite »
     *   (l'auteur).
     *
     * Deux boîtes, et la bascule est ENTIÈREMENT dans `pages.css` : aucun
     * `matchMedia`, aucune mesure, aucun re-rendu au redimensionnement. Le DOM
     * est le même aux deux largeurs, dans le même ordre — sous le seuil, le
     * flux puis l'aside se retrouvent l'un sous l'autre exactement là où ils
     * sont aujourd'hui. C'est ce qui garantit que l'ordre de lecture au clavier
     * et au lecteur d'écran ne dépend pas de la largeur de la fenêtre.
     */
    e('div.resultat__corps', {}, [
      e('div.resultat__flux', {}, [
        e('section.section', {}, [
          e('h2.h2-machine', { texte: t('resultat.voiesTitre') }),
          ...(aucune ? [aucune] : listeDesVoies),
        ]),
        fragments.length ? e('section.section', {}, [
          e('h2.h2-machine', {
            texte: cibleObjet && !cibleObjet.homogene
              ? t('resultat.fragmentsTitreMele', { cible: texteCible })
              : t('resultat.fragmentsTitre', { chiffre: chiffreCible }),
          }),
          e('div.fragments', {}, fragments.map((f) => rangeeFragment(f, !secours, chiffreCible))),
        ]) : null,
      ]),
      // Un `<aside>` est un point de repère (`complementary`) : il se nomme,
      // sinon il s'annonce « complémentaire » et rien de plus dans la liste des
      // repères d'un lecteur d'écran. Le nom dit ce qu'on y trouve — de quoi
      // aller plus loin —, pas où c'est posé à l'écran : sous le seuil, il n'y
      // a plus de colonne de droite, et le nom doit rester vrai.
      e('aside.resultat__aside', { 'aria-label': t('resultat.asideLabel') }, [
        // ★ La commande de cible vient AVANT le mémo d'URL, comme l'auteur le
        //   demande : « en bas de page de listing, avant les explications pour
        //   construire des URL sur mesure ». L'ordre n'est pas cosmétique — on
        //   propose d'abord un geste, on explique ensuite comment l'écrire à la
        //   main.
        commandeDeCible({ saisie, cible: cibleObjet, texteCible }),
        /**
         * ★ L'EMPLACEMENT DES CURSEURS — réservé, vide, et nommé.
         *
         * « Laisse la place, dans cet aside, pour un bloc de curseurs qui
         * viendra s'insérer ENTRE la commande de cible et le mémo » (l'auteur,
         * qui le posera lui-même). C'est le futur réglage de PONDÉRATION
         * PERSONNALISÉE — celui qui, quand il sera branché, fera passer
         * `podium: false` à cette même page.
         *
         * Le nœud est créé même vide, et il porte un `id` : c'est le point
         * d'ancrage stable (`document.getElementById('curseurs-ponderation')`),
         * là où un commentaire dans le code ne serait accrochable par rien.
         * `:empty` le fait disparaître tant qu'on n'y met rien, sans quoi il
         * laisserait un blanc entre la commande et le mémo (`pages.css`).
         */
        e('div.resultat__curseurs#curseurs-ponderation'),
        memo,
      ]),
    ]),
  ]);
}

/** L'en-tête commun aux pages internes. */
export function enteteResultat() {
  return e('header.barre-haute', {}, [
    e('a.lien-retour', { href: '#' }, [
      e('span', { texte: '◂', 'aria-hidden': 'true' }),
      e('span', { texte: t('entete.accueil') }),
    ]),
    logoEntete(),
    interrupteurs(),
  ]);
}
