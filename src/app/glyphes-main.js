/**
 * ★ **LA PAGE DE COMPARAISON DES GLYPHES — `glyphes.html`.**
 *
 * > « Fais une page AB-glyphes qui affiche l'alphabet complet version actuelle
 * >   et version JetBrains, en minuscule et en majuscule ; comme ça je verrai
 * >   bien ce que j'en pense. » (l'auteur)
 *
 * Trois colonnes par signe, et l'ordre n'est pas indifférent :
 *
 *  1. **LA POLICE** — la lettre écrite en JetBrains Mono, c'est-à-dire
 *     EXACTEMENT ce que la scène affiche sur sa ligne (`visuel/constants.js ›
 *     FONT_FAMILY`). Ce n'est pas une image de référence, c'est le texte rendu
 *     par le navigateur : la comparaison porte donc sur le vrai, pas sur une
 *     copie que quelqu'un aurait extraite ;
 *  2. **LE TRACÉ RETENU** — `moteur/tables/glyphes.js`, celui que la zone de
 *     traçage dessine et que `mtrb`, `mexb` et `mbob` facturent ;
 *  3. **LE TRACÉ À L'ÉTUDE** — ce que la chaîne produit en l'état, points et
 *     poignées apparents. C'est le candidat au prochain `--adopter`.
 *
 * ★ **DEUX COLONNES INTERMÉDIAIRES ONT ÉTÉ RETIRÉES, ET C'EST LA PREUVE QUE LE
 *   TRAVAIL A ABOUTI.** « La recette » posait des arcs elliptiques sur des
 *   mesures ; « l'axe » montrait la police repliée à graisse nulle. Toutes deux
 *   étaient des étapes de fabrication, utiles tant qu'on cherchait la méthode.
 *   Depuis que la colonne 2 est elle-même un relevé, ce qui compte n'est plus
 *   « d'où ça vient » mais « est-ce mieux que ce qui est en place » :
 *
 *   > « Supprime les colonnes intermédiaires que je puisse comparer la version
 *   >   actuelle à celle que tu t'apprêtes à produire. » (l'auteur)
 *
 *   Deux autres avaient été retirées avant elles, et l'auteur avait raison les
 *   deux fois. « Recalé sur les bords » : « il n'y a rien à en tirer » — elle
 *   déplaçait de deux unités un tracé déjà juste à deux unités près.
 *   « Squelette », extrait par érosion d'une image du contour : « la suite est
 *   mieux, sans aucun doute » — une érosion passe par une grille, et une grille
 *   tremble.
 *
 * ★ **CE QUE LA COLONNE 2 EST DEVENUE.**
 *
 *   > « Si tu repars des sources de la font, as-tu ce qu'il faut plutôt que de
 *   >   chercher à le recréer ? » (l'auteur)
 *
 *   Oui, mais pas comme on l'espérait : **les sources ne contiennent aucun
 *   squelette** — `JetBrainsMono.glyphs` est dessiné au contour, sans un seul
 *   attribut d'épaisseur. Elles contiennent mieux : trois masters
 *   point-compatibles et LEURS FÛTS DÉCLARÉS. L'épaisseur s'annule à wght −275,
 *   et à ce poids les deux bords d'un trait se rejoignent sur son axe. Les
 *   cinquante-deux glyphes du moteur en sortent (`src/gfx/jetbrains-axe.py`), et
 *   le défaut que cette page existait pour montrer — « le glyphe qui est mené
 *   dans la zone de traçage devrait correspondre à celui qui est tracé »
 *   (l'auteur) — n'est plus visible entre la 1ʳᵉ et la 2ᵈ colonne.
 *
 * ⚠️ **SOUS CHAQUE TRACÉ, SES TROIS COMPTES**, et c'est l'enjeu caché de tout
 *   redessin : `traits`, `extrémités` et `boucles` nourrissent trois opérateurs
 *   du catalogue, si bien qu'un dessin plus juste qui changerait un compte
 *   DÉPLACERAIT des scores. Les voir côte à côte dit d'un coup d'œil ce qu'un
 *   remplacement coûterait — l'adoption faite ici en a coûté un seul vecteur
 *   gelé, `mexb` sur le `p`.
 */

import { e, svg as s } from './dom.js';
import { GLYPHES, METRIQUES } from '../moteur/tables/glyphes.js';
import { setGlyphes, deriveGlyph, parsePath } from '../visuel/glyphes.js';
import { MESURES } from '../gfx/_glyphes-candidats.js';
import { TRAITS } from '../gfx/_glyphes-axe.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const MINUSCULES = [...'abcdefghijklmnopqrstuvwxyz'];
const CAPITALES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/* ★ **LA BOÎTE EST LA MÊME POUR LES TROIS COLONNES**, et c'est ce qui rend la
   page honnête : deux dessins à des échelles différentes se comparent mal, et
   un `viewBox` ajusté au contenu ferait paraître grand ce qui est petit. On
   fixe donc un cadre unique, assez large pour contenir les deux répertoires —
   l'avance du repère fait 493,2, l'encre pousse jusqu'à 442,8 en largeur et
   −150 en jambage.

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
function dessin(traits, teinte, ossature = false) {
  return cadre([
    s('g', { transform: 'scale(1,-1)' }, [
      ...traits.map((t) => s('path', {
        d: t.d,
        fill: 'none',
        stroke: teinte,
        'stroke-width': ossature ? 10 : 26,
        'stroke-opacity': ossature ? '0.45' : '1',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      })),
      ...(ossature ? traits.flatMap((t) => ossatureDe(t.d)) : []),
    ]),
  ]);
}

/**
 * ★ **LES POINTS ET LES POIGNÉES — parce qu'on ne juge pas un tracé sur sa
 *   seule silhouette.**
 *
 * > « trop de points par rapport au nécessaire » (l'auteur)
 *
 * C'est un reproche qui ne se vérifie qu'en les VOYANT. Un `l` en soixante
 * cubiques et un `l` en cinq ont la même allure à l'écran ; seule l'ossature
 * dit lequel décrit la lettre et lequel décrit le relevé. On la montre donc
 * sous le tracé, qui s'efface d'autant.
 *
 * ⚠️ Les poignées se lisent SUR LE CHEMIN et non sur les données qui l'ont
 *   produit : ce qui est affiché est ce qui sera lu par le moteur.
 */
function ossatureDe(d) {
  const out = [];
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  const noeud = (px, py) => s('circle', {
    cx: px, cy: py, r: 9, fill: 'var(--gold)', 'fill-opacity': '0.9',
  });
  const poignee = (ax, ay, bx, by) => {
    out.push(s('line', {
      x1: ax, y1: ay, x2: bx, y2: by, stroke: 'var(--rubric-hi)',
      'stroke-width': 3, 'stroke-opacity': '0.7',
    }));
    out.push(s('circle', {
      cx: bx, cy: by, r: 5, fill: 'none', stroke: 'var(--rubric-hi)',
      'stroke-width': 3, 'stroke-opacity': '0.7',
    }));
  };
  for (const { cmd, args } of parsePath(d)) {
    const c = cmd.toUpperCase();
    if (c === 'M') { [x, y] = args; sx = x; sy = y; out.push(noeud(x, y)); } else if (c === 'L') {
      [x, y] = args; out.push(noeud(x, y));
    } else if (c === 'C') {
      poignee(x, y, args[0], args[1]);
      poignee(args[4], args[5], args[2], args[3]);
      x = args[4]; y = args[5]; out.push(noeud(x, y));
    } else if (c === 'Q') {
      poignee(x, y, args[0], args[1]);
      x = args[2]; y = args[3]; out.push(noeud(x, y));
    } else if (c === 'Z') { x = sx; y = sy; }
  }
  return out;
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
function case_(titre, traits, jonctions, teinte, ossature = false) {
  return e('div.gl__case', {}, [
    dessin(traits, teinte, ossature),
    e('div.gl__nom', { texte: titre }),
    e('div.gl__comptes', { texte: comptes(traits, jonctions) }),
  ]);
}

function rangee(c) {
  const actuel = GLYPHES[c];
  const poses = TRAITS[c];
  return e('section.gl__rangee', {}, [
    e('h2.gl__lettre', { texte: c }),
    caseDeLaPolice(c),
    actuel
      ? case_('retenu', actuel.traits, actuel.jonctions, 'var(--gold)')
      : e('div.gl__case.gl__case--vide', { texte: 'aucun tracé' }),
    /* ★ Les traits affichent leurs comptes — ils ont des jonctions, donc
       `deriveGlyph` sait les lire. Ils doivent coïncider avec ceux de la
       recette, dont ils reprennent la topologie. */
    poses
      ? case_('à l’étude', poses.traits, poses.jonctions, 'var(--phos)', true)
      : e('div.gl__case.gl__case--vide', { texte: 'pas de traits' }),
  ]);
}

function page() {
  return e('div.gl', {}, [
    e('header.gl__entete', {}, [
      e('h1', { texte: 'Glyphes — police, retenu, à l’étude' }),
      e('p.gl__appel', {
        texte: 'La première colonne est ce que la SCÈNE affiche sur sa ligne ; la deuxième, '
          + 'ce que la zone de traçage dessine aujourd’hui — désormais relevé sur la police '
          + 'et non plus dessiné à la main. La troisième est le prochain relevé, celui que '
          + 'la chaîne produit en l’état, points et poignées apparents : c’est elle qu’il '
          + 'faut regarder pour dire si le suivant vaut mieux que celui qui est en place.',
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
