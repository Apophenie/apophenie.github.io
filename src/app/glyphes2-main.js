/**
 * ★ **LA PAGE DE COMPARAISON DES GLYPHES DE JOST — `glyphes2.html`.**
 *
 * La jumelle de `glyphes-main.js`, bâtie sur **Jost** au lieu de JetBrains Mono.
 * Mêmes trois colonnes, même cadre, même barème sous chaque dessin : ce qui
 * change est la police lue, et donc la troisième colonne.
 *
 *  1. **LA POLICE** — la lettre écrite en Jost par le navigateur. Ce n'est pas
 *     une image de référence : c'est le texte rendu, donc le vrai ;
 *  2. **LE TRACÉ RETENU** — `moteur/tables/glyphes.js`, relevé sur JetBrains
 *     Mono, celui que la zone de traçage dessine aujourd'hui et que `mtrb`,
 *     `mexb` et `mbob` facturent ;
 *  3. **LE TRACÉ JOST** — ce que la chaîne `jost-source → jost-traces →
 *     jost-axe` produit, points et poignées apparents.
 *
 * ★ **ET SOUS LA TROISIÈME, L'ÉCART DES TROIS COMPTES — c'est la raison d'être
 *   de toute cette page.**
 *
 *   > « Jost est géométrique sans empattement : c'est tout l'intérêt, nettement
 *   >   moins d'extrémités que JetBrains, qui empatte le `i`, le `I`, le `l`, le
 *   >   `j`, le `t`, le `f`. » (l'auteur)
 *
 *   La question n'est pas « lequel est plus beau » mais « combien d'extrémités
 *   la variante fait-elle gagner, et sur quelles lettres ». On l'affiche donc
 *   signe par signe, en vert quand Jost économise et en rouge quand elle coûte —
 *   parce que les deux existent, et qu'il n'y a aucune raison de ne montrer que
 *   les premières. Mesuré à la génération : **−24 traits, −1 extrémité, 0 boucle
 *   de différence** sur les cinquante-deux signes, et le détail est ci-dessous.
 *
 * ⚠️ **LES BOUCLES DOIVENT ÊTRE IDENTIQUES, ET C'EST UN CONTRÔLE, PAS UN
 *   CONSTAT.** « Ça ne devrait pas changer quelle que soit la police ou
 *   presque » (l'auteur) : un `g` à deux boucles existe ailleurs, pas ici. Une
 *   boucle qui apparaît ou disparaît entre les deux polices est un défaut de
 *   lecture, et `glyphes2.test.js` le refuse.
 *
 * ⚠️ **LA TEINTE DOIT ÊTRE UNE COULEUR, et `tokens.css` n'en contient pas que.**
 *   Deux colonnes de `glyphes.html` sont restées vides pour l'avoir oublié :
 *   `--oracle` et `--pedagogue` existent — un `grep` le confirmait — mais ce sont
 *   des familles de POLICES, et `stroke: "Jost", Futura, …` est invalide. Le
 *   piège est particulièrement tendu ICI, où la page parle justement de Jost.
 */

import { e, svg as s } from './dom.js';
import { GLYPHES, METRIQUES } from '../moteur/tables/glyphes.js';
import { setGlyphes, deriveGlyph, parsePath } from '../visuel/glyphes.js';
import { MESURES } from '../gfx/_jost-candidats.js';
import { TRAITS } from '../gfx/_jost-axe.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const MINUSCULES = [...'abcdefghijklmnopqrstuvwxyz'];
const CAPITALES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/* ★ **LA BOÎTE EST LA MÊME POUR LES TROIS COLONNES, ET LA MÊME QUE SUR
   `glyphes.html`.** Deux dessins à des échelles différentes se comparent mal ;
   deux PAGES à des échelles différentes aussi, et c'est bien de page à page
   qu'on veut lire l'écart. On reprend donc le cadre à l'unité près.

   Le repère du moteur a son ORIGINE EN BAS À GAUCHE ; SVG l'a en haut. On
   retourne d'un `scale(1,-1)` plutôt que de recalculer chaque point — c'est la
   convention de `visuel/assets.js › glyphToLocal`. */
/* ⚠️ **LE CADRE DE `glyphes.html` TRONQUAIT JOST, et c'est la rançon de vouloir
   comparer deux pages à l'unité près.** JetBrains est une monospace : ses
   cinquante-deux signes tiennent dans une avance unique de 493,2, et un cadre
   de −40 à 520 les contient tous. Jost n'a aucune avance commune — son `W`
   pousse à 794, son `J` descend à −113 —, si bien que les lettres larges
   sortaient du `viewBox` et arrivaient COUPÉES. Un cadre qui ampute est pire
   qu'un cadre à une autre échelle : il donne à voir un défaut de dessin là où
   il n'y a qu'un défaut de fenêtre.
   Les bornes sont donc celles des tracés eux-mêmes, marge ronde comprise. */
const GAUCHE = -130;
const DROITE = 820;
const BAS = -210;
const HAUT = 690;

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
  reglure(0, 0.34),
  reglure(METRIQUES.hauteurX, 0.16),
  reglure(METRIQUES.capitale, 0.16),
  ...enfants,
]);

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
 * C'est ici que Jost se distingue le plus nettement : son `l` est un rectangle
 * nu, son axe un segment, et il s'écrit en DEUX nœuds et zéro poignée là où le
 * `l` empatté de JetBrains en demande cinq et deux. Un `l` en cinq nœuds et un
 * `l` en deux ont la même allure à l'écran ; seule l'ossature dit lequel décrit
 * la lettre et lequel décrit le relevé.
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
 * ★ **LA LETTRE DE LA POLICE EST DESSINÉE DANS LE MÊME CADRE**, et l'échelle
 *   n'est pas réglée à vue — elle SE CALCULE.
 *
 * ⚠️ **ET CE N'EST PAS LA MÊME QUE SUR `glyphes.html`.** La hauteur de capitale
 *   de JetBrains Mono vaut `730/1000` de cadratin, celle de Jost `700/1000` :
 *   reprendre 0,73 poserait la capitale de Jost à 575 au lieu de 600, soit
 *   vingt-cinq unités de décalage sous la réglure — un écart qu'on aurait mis
 *   sur le compte du dessin. Le chiffre est lu dans `OS/2.sCapHeight` par
 *   `jost-source.py`, qui l'inscrit dans l'extrait, et c'est le même que la
 *   chaîne utilise pour mettre l'axe à l'échelle.
 */
const CAP_EM = 0.70; // Jost : sCapHeight 700, unitsPerEm 1000
const CORPS = METRIQUES.capitale / CAP_EM;

const caseDeLaPolice = (c) => e('div.gl__case', {}, [
  cadre([
    /* ★ **LE TEXTE SE POSE SUR L'ORIGINE DU GLYPHE, PAS AU MILIEU DU CADRE.**
       Centrer n'avait de sens que pour une monospace, où l'avance est la même
       pour tous : le milieu du cadre EST alors le milieu de chaque signe. Chez
       Jost, centrer décalait chaque lettre de la moitié de l'écart entre son
       avance propre et celle du cadre — jusqu'à deux cents unités —, et la
       comparaison avec le tracé, lui posé sur l'origine, ne voulait plus rien
       dire. On aligne donc les deux sur le même zéro. */
    s('text', {
      x: 0,
      y: 0,
      'text-anchor': 'start',
      'font-size': CORPS.toFixed(1),
      'font-family': "'Jost', Futura, 'Century Gothic', sans-serif",
      fill: 'currentColor',
      texte: c,
    }),
  ]),
  e('div.gl__nom', { texte: 'police' }),
  e('div.gl__comptes', { texte: 'Jost' }),
]);

/** Les trois comptes d'un tracé, tels que le catalogue les lira. */
function comptes(traits, jonctions) {
  try {
    return deriveGlyph({ traits, jonctions });
  } catch (err) {
    return null;
  }
}

const enTexte = (d) => (d ? `${d.traits} · ${d.extremites} · ${d.boucles}` : 'illisible');

/** Une case : un dessin, sa légende, ses comptes. */
function case_(titre, traits, jonctions, teinte, ossature = false, ecart = null) {
  const d = comptes(traits, jonctions);
  return e('div.gl__case', {}, [
    dessin(traits, teinte, ossature),
    e('div.gl__nom', { texte: titre }),
    e('div.gl__comptes', { texte: enTexte(d) }),
    ...(ecart ? [ecart] : []),
  ]);
}

/**
 * ★ **L'ÉCART DES TROIS COMPTES, SIGNÉ.** Une extrémité gagnée est un point de
 *   `mexb` déplacé ; une perdue aussi. On les écrit avec leur signe plutôt que
 *   de n'annoncer que le total, parce que « le `i` oui il a une extrémité de
 *   plus, c'est sûr, la police, n'essaie pas de tricher » (l'auteur) vaut dans
 *   les deux sens : on montre aussi ce que Jost coûte.
 */
function ecartDe(a, b) {
  if (!a || !b) return null;
  const parts = [['t', b.traits - a.traits], ['e', b.extremites - a.extremites],
    ['b', b.boucles - a.boucles]].filter(([, v]) => v !== 0);
  if (!parts.length) return e('div.gl__delta', { texte: '= mêmes comptes' });
  const somme = parts.reduce((n, [, v]) => n + v, 0);
  return e(somme < 0 ? 'div.gl__delta.gl__delta--gain' : 'div.gl__delta.gl__delta--perte', {
    texte: parts.map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`).join(' '),
  });
}

function rangee(c) {
  const actuel = GLYPHES[c];
  const poses = TRAITS[c];
  const ref = actuel ? comptes(actuel.traits, actuel.jonctions) : null;
  const neuf = poses ? comptes(poses.traits, poses.jonctions) : null;
  return e('section.gl__rangee', {}, [
    e('h2.gl__lettre', { texte: c }),
    caseDeLaPolice(c),
    actuel
      ? case_('retenu (JetBrains)', actuel.traits, actuel.jonctions, 'var(--gold)')
      : e('div.gl__case.gl__case--vide', { texte: 'aucun tracé' }),
    poses
      ? case_('Jost, à l’étude', poses.traits, poses.jonctions, 'var(--phos)', true,
        ecartDe(ref, neuf))
      : e('div.gl__case.gl__case--vide', { texte: 'pas de traits' }),
  ]);
}

/** Le total des trois comptes sur les cinquante-deux signes, des deux côtés. */
function totaux() {
  const somme = { retenu: [0, 0, 0], jost: [0, 0, 0] };
  for (const c of [...MINUSCULES, ...CAPITALES]) {
    for (const [cle, g] of [['retenu', GLYPHES[c]], ['jost', TRAITS[c]]]) {
      const d = g ? comptes(g.traits, g.jonctions) : null;
      if (!d) continue;
      somme[cle][0] += d.traits;
      somme[cle][1] += d.extremites;
      somme[cle][2] += d.boucles;
    }
  }
  return somme;
}

function page() {
  const t = totaux();
  const signe = (v) => (v > 0 ? `+${v}` : String(v));
  return e('div.gl', {}, [
    e('header.gl__entete', {}, [
      e('h1', { texte: 'Glyphes ② — Jost : police, retenu, à l’étude' }),
      e('p.gl__appel', {
        texte: 'La première colonne est la lettre écrite en Jost par le navigateur ; la '
          + 'deuxième, ce que la zone de traçage dessine aujourd’hui — relevé sur JetBrains '
          + 'Mono. La troisième est ce que la même chaîne produit en repartant de Jost, '
          + 'points et poignées apparents. Jost est géométrique et sans empattement : c’est '
          + 'là que se joue l’écart.',
      }),
      e('p.gl__appel', {
        texte: `Sous chaque tracé : traits · extrémités · boucles — les trois comptes que `
          + `mtrb, mexb et mbob facturent, puis l’écart signé de Jost au retenu. `
          + `Total sur les 52 signes : retenu ${t.retenu.join(' / ')}, `
          + `Jost ${t.jost.join(' / ')} — soit `
          + `${signe(t.jost[0] - t.retenu[0])} trait(s), `
          + `${signe(t.jost[1] - t.retenu[1])} extrémité(s), `
          + `${signe(t.jost[2] - t.retenu[2])} boucle(s).`,
      }),
      e('p.gl__appel', {
        texte: `Mesures relevées dans Jost : avance ${MESURES.avance}, fût ${MESURES.fut}, `
          + `hauteur d’x ${MESURES.hauteurX} (le repère du dépôt en pose `
          + `${METRIQUES.hauteurX}). L’encre s’y annule à wght 60, soit une extrapolation `
          + `de ×1,13 — JetBrains demandait wght −275, soit ×2,25.`,
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
