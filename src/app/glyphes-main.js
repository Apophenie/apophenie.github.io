/**
 * ★ **LA PAGE DE COMPARAISON DES GLYPHES — `glyphes.html`.**
 *
 * > « Fais une page AB-glyphes qui affiche l'alphabet complet version actuelle
 * >   et version JetBrains, en minuscule et en majuscule ; comme ça je verrai
 * >   bien ce que j'en pense. » (l'auteur)
 *
 * Six colonnes par signe, et l'ordre n'est pas indifférent :
 *
 *  1. **LA POLICE** — la lettre écrite en JetBrains Mono, c'est-à-dire
 *     EXACTEMENT ce que la scène affiche sur sa ligne (`visuel/constants.js ›
 *     FONT_FAMILY`). Ce n'est pas une image de référence, c'est le texte rendu
 *     par le navigateur : la comparaison porte donc sur le vrai, pas sur une
 *     copie que quelqu'un aurait extraite ;
 *  2. **LE TRACÉ ACTUEL** — `moteur/tables/glyphes.js`, celui que la zone de
 *     traçage dessine aujourd'hui pour `mtrb`, `mexb` et `mbob` ;
 *  3. **LA RECETTE** — le candidat produit par `src/gfx/jetbrains-traces.py`,
 *     qui pose des arcs elliptiques sur les mesures de la police ;
 *  4. **LE SQUELETTE** — celui que `src/gfx/jetbrains-squelette.py` EXTRAIT par
 *     érosion du contour réel ;
 *  5. **L'AXE** — la police extrapolée jusqu'à l'épaisseur nulle. Ni grille, ni
 *     amincissement, ni filtre : c'est JetBrains Mono elle-même, à une graisse
 *     qu'elle ne propose pas mais qu'elle décrit ;
 *  6. **LES TRAITS SUR L'AXE** — la topologie DÉCLARÉE par la recette, posée sur
 *     cet axe exact. La seule des six à porter des JONCTIONS, donc la seule
 *     dont les comptes soient utilisables — et la seule adoptable.
 *
 * ★ **ET LA SIXIÈME REND LES QUATRE PRÉCÉDENTES CADUQUES.**
 *
 *   > « Si tu repars des sources de la font, as-tu ce qu'il faut plutôt que de
 *   >   chercher à le recréer ? » (l'auteur)
 *
 *   Oui — et sans même aller chercher les sources : le woff2 du dépôt est
 *   VARIABLE, et JetBrains Mono est MONOLINÉAIRE. L'axe médian est donc la
 *   limite de ses contours quand la graisse tend vers zéro, et cette limite se
 *   calcule (`src/gfx/jetbrains-axe.py`). Les colonnes 3 à 5 reconstruisent ce
 *   que la 6ᵉ se contente de LIRE ; on les garde pour ce qu'elles montrent —
 *   l'écart entre deviner, mesurer, et savoir.
 *
 * ⚠️ La colonne « recalé sur les bords » a été retirée : « il n'y a rien à en
 *   tirer » (l'auteur), et c'était exact — elle déplaçait de deux unités un
 *   tracé déjà juste à deux unités près.
 *
 * ★ **LA TROISIÈME DEVINE, LA QUATRIÈME MESURE, LA SIXIÈME LIT** — et c'est
 *   tout l'objet de les avoir côte à côte. Une recette décrit une courbe par un
 *   arc, qui n'a qu'un seul sens de courbure ; l'érosion suit l'axe du dessin,
 *   quel qu'il soit, mais à travers une grille ; l'extrapolation ne suit rien,
 *   elle relit la police à une graisse qu'elle n'expose pas.
 *
 * ⚠️ Bas de casse seulement pour les quatre dernières : les capitales n'ont ni
 *   recette, ni squelette, ni axe engendré.
 *
 * ★ **LE DÉFAUT SE VOIT ENTRE LA 1ʳᵉ ET LA 2ᵈ COLONNE**, et c'est tout l'objet
 *   de la page : « le glyphe qui est mené dans la zone de traçage devrait
 *   correspondre à celui qui est tracé » (l'auteur). Un `a` qui entre en
 *   double-étage et ressort en lentille, un `l` qui entre avec un empattement et
 *   ressort en barre nue — la page le montre sans qu'on ait à l'affirmer.
 *
 * ⚠️ **LES COMPTES NE S'AFFICHENT QUE SOUS LES TRACÉS QUI EN ONT** — ceux qui
 *   portent des jonctions. C'est l'enjeu caché du redessin : `traits`,
 *   `extrémités` et `boucles` nourrissent trois opérateurs du catalogue, et un
 *   dessin plus juste qui changerait un compte déplacerait des scores. Les voir
 *   côte à côte dit d'un coup d'œil ce qu'un remplacement coûterait.
 */

import { e, svg as s } from './dom.js';
import { GLYPHES, METRIQUES } from '../moteur/tables/glyphes.js';
import { setGlyphes, deriveGlyph } from '../visuel/glyphes.js';
import { CANDIDATS, MESURES } from '../gfx/_glyphes-candidats.js';
import { SQUELETTES } from '../gfx/_glyphes-squelette.js';
import { AXES, TRAITS } from '../gfx/_glyphes-axe.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const MINUSCULES = [...'abcdefghijklmnopqrstuvwxyz'];
const CAPITALES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/* ★ **LA BOÎTE EST LA MÊME POUR LES SIX COLONNES**, et c'est ce qui rend la
   page honnête : deux dessins à des échelles différentes se comparent mal, et
   un `viewBox` ajusté au contenu ferait paraître grand ce qui est petit. On
   fixe donc un cadre unique, assez large pour contenir les deux répertoires —
   le repère du dépôt tient dans `0..400`, les candidats poussent jusqu'à 464 en
   largeur et −148 en jambage.

   Le repère du moteur a son ORIGINE EN BAS À GAUCHE ; SVG l'a en haut. On
   retourne d'un `scale(1,-1)` plutôt que de recalculer chaque point — c'est la
   convention de `visuel/assets.js › glyphToLocal`. */
const GAUCHE = -40;
const DROITE = 520;
const BAS = -190;
const HAUT = 660;

/* Le repère SVG a son y vers le BAS : `svgY = −glyphY`. Une réglure se pose
   donc directement, sans transformation. */
const reglure = (y, opacite) => s('line', {
  x1: GAUCHE, y1: -y, x2: DROITE, y2: -y,
  stroke: 'currentColor', 'stroke-width': 3, opacity: String(opacite),
});

const cadre = (enfants) => s('svg', {
  class: 'gl__dessin',
  viewBox: `${GAUCHE} ${-HAUT} ${DROITE - GAUCHE} ${HAUT - BAS}`,
  role: 'img',
  'aria-hidden': 'true',
}, [
  // Ligne de base, hauteur d'x, hauteur de capitale : l'œil compare alors des
  // PROPORTIONS, et pas seulement des formes.
  reglure(0, 0.34),
  reglure(METRIQUES.hauteurX, 0.16),
  reglure(METRIQUES.capitale, 0.16),
  ...enfants,
]);

/**
 * Un tracé, dessiné dans le repère du moteur.
 *
 * ⚠️ **LA TEINTE DOIT ÊTRE UNE COULEUR, et `tokens.css` n'en contient pas que.**
 *   Deux colonnes sont restées VIDES pour l'avoir oublié : `--oracle` et
 *   `--pedagogue` existent bien — un `grep` le confirmait — mais ce sont des
 *   familles de POLICES. `stroke: "Jost", Futura, …` est invalide, et un tracé
 *   sans `stroke` valide ne se peint pas. Vérifier qu'un jeton existe ne dit
 *   pas ce qu'il contient ; c'est le même défaut que la classe `.nhl-filet`,
 *   qui n'existait nulle part et laissait le trait de fraction transparent.
 */
function dessin(traits, teinte) {
  return cadre([
    s('g', { transform: 'scale(1,-1)' }, traits.map((t) => s('path', {
      d: t.d,
      fill: 'none',
      stroke: teinte,
      'stroke-width': 26,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }))),
  ]);
}

/**
 * ★ **LA LETTRE DE LA POLICE EST DESSINÉE DANS LE MÊME CADRE**, et non à côté
 *   dans une boîte de texte : deux dessins à des échelles voisines mais non
 *   identiques se comparent mal, et l'œil accuse alors la forme d'un écart qui
 *   n'est que d'échelle.
 *
 * La mise à l'échelle n'est pas réglée à vue — elle SE CALCULE : la hauteur de
 * capitale de JetBrains Mono vaut `730/1000` de cadratin, et le repère du dépôt
 * la pose à `600`. Un corps de `600 / 0,73 ≈ 822` unités aligne donc les deux
 * exactement, capitale sur capitale et pied sur ligne de base.
 */
const CAP_EM = 0.73; // JetBrains Mono : capHeight 730, upm 1000
const CORPS = METRIQUES.capitale / CAP_EM;

const caseDeLaPolice = (c) => e('div.gl__case', {}, [
  cadre([
    s('text', {
      x: (GAUCHE + DROITE) / 2,
      y: 0,
      'text-anchor': 'middle',
      'font-size': CORPS.toFixed(1),
      'font-family': "'JetBrains Mono', ui-monospace, monospace",
      fill: 'currentColor',
      texte: c,
    }),
  ]),
  e('div.gl__nom', { texte: 'police' }),
  e('div.gl__comptes', { texte: 'JetBrains Mono' }),
]);

/** Les trois comptes d'un tracé, tels que le catalogue les lira. */
function comptes(traits, jonctions) {
  try {
    const d = deriveGlyph({ traits, jonctions });
    return `${d.traits} · ${d.extremites} · ${d.boucles}`;
  } catch (err) {
    return `illisible (${err.message.slice(0, 40)})`;
  }
}

/** Une case : un dessin, sa légende, ses comptes. */
function case_(titre, traits, jonctions, teinte) {
  return e('div.gl__case', {}, [
    dessin(traits, teinte),
    e('div.gl__nom', { texte: titre }),
    e('div.gl__comptes', { texte: comptes(traits, jonctions) }),
  ]);
}

function rangee(c) {
  const actuel = GLYPHES[c];
  const candidat = CANDIDATS[c];
  const squelette = SQUELETTES[c];
  const poses = TRAITS[c];
  return e('section.gl__rangee', {}, [
    e('h2.gl__lettre', { texte: c }),
    caseDeLaPolice(c),
    actuel
      ? case_('tracé actuel', actuel.traits, actuel.jonctions, 'var(--gold)')
      : e('div.gl__case.gl__case--vide', { texte: 'aucun tracé' }),
    candidat
      ? case_('recette', candidat.traits, candidat.jonctions, 'var(--rubric)')
      : e('div.gl__case.gl__case--vide', { texte: 'pas de recette' }),
    /* ⚠️ Le squelette n'affiche PAS ses comptes : son découpage en traits n'est
       pas fiable sur les lettres à panse tangente (`b d g p q`), où l'érosion
       sème une échelle de faux carrefours. Le DESSIN, lui, l'est — et c'est ce
       qu'on regarde ici. Afficher des comptes qu'on sait faux les ferait passer
       pour un résultat. */
    squelette
      ? e('div.gl__case', {}, [
        dessin(squelette, 'var(--line-ui)'),
        e('div.gl__nom', { texte: 'squelette' }),
        e('div.gl__comptes', { texte: `${squelette.length} branche(s)` }),
      ])
      : e('div.gl__case.gl__case--vide', { texte: 'pas de squelette' }),
    /* ★ L'apparié, LUI, affiche ses comptes — et c'est toute la différence :
       il a des jonctions, donc `deriveGlyph` sait les lire. Ils doivent
       coïncider avec ceux de la recette, dont il reprend la topologie. */
    /* ⚠️ L'axe BRUT n'affiche pas de comptes : son contour est un ALLER-RETOUR,
       donc `deriveGlyph` y verrait une boucle par trait. C'est la colonne
       suivante qui lui donne une topologie — non pas en la cherchant dans le
       dessin, mais en l'y APPORTANT depuis la recette. */
    AXES[c]
      ? e('div.gl__case', {}, [
        dessin([{ d: AXES[c] }], 'var(--rubric-hi)'),
        e('div.gl__nom', { texte: 'axe de la police' }),
        e('div.gl__comptes', { texte: 'extrapolé à graisse nulle' }),
      ])
      : e('div.gl__case.gl__case--vide', { texte: 'pas d’axe' }),
    poses
      ? case_('traits sur l’axe', poses.traits, poses.jonctions, 'var(--phos)')
      : e('div.gl__case.gl__case--vide', { texte: 'pas de traits' }),
  ]);
}

function page() {
  return e('div.gl', {}, [
    e('header.gl__entete', {}, [
      e('h1', { texte: 'Glyphes — police, actuel, recette, squelette, axe, traits' }),
      e('p.gl__appel', {
        texte: 'La première colonne est ce que la SCÈNE affiche sur sa ligne ; la deuxième, '
          + 'ce que la zone de traçage dessine aujourd’hui. La troisième DEVINE la courbe '
          + 'avec des arcs, la quatrième l’EXTRAIT du contour par érosion, la cinquième '
          + 'ne reconstruit rien — c’est la police elle-même, extrapolée jusqu’à '
          + 'l’épaisseur nulle —, et la sixième y pose la topologie que la recette déclare.',
      }),
      e('p.gl__appel', {
        texte: `Sous chaque tracé : traits · extrémités · boucles — les trois comptes que `
          + `mtrb, mexb et mbob facturent. Mesures relevées dans la police : avance `
          + `${MESURES.avance}, fût ${MESURES.fut}, hauteur d’x ${MESURES.hauteurX} `
          + `(le repère du dépôt en pose ${METRIQUES.hauteurX}).`,
      }),
    ]),
    e('h2.gl__titre', { texte: 'Bas de casse' }),
    ...MINUSCULES.map(rangee),
    e('h2.gl__titre', { texte: 'Capitales' }),
    ...CAPITALES.map(rangee),
  ]);
}

const racine = document.getElementById('glyphes');
if (racine) racine.appendChild(page());
