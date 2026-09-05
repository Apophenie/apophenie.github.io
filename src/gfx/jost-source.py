#!/usr/bin/env python3
"""★ **L'EXTRAIT DES CONTOURS DE JOST — la jumelle géométrique de JetBrains.**

> « Jost est géométrique sans empattement […] c'est tout l'intérêt : nettement
>   moins d'extrémités que JetBrains, qui empatte le `i`, le `I`, le `l`, le
>   `j`, le `t`, le `f`. » (l'auteur)

Ce script rend, dans **exactement le schéma de `_jetbrains-source.json`**, les
contours de Jost à deux graisses. C'est délibéré : `jetbrains-axe.py` ne lit que
ce fichier-là, et lui donner la même forme fait tourner les quatre gestes de la
chaîne — effondrer, dégrafer, replier, reposer — sur une seconde police sans en
réécrire une ligne. C'est la réponse mesurée à la question que l'auteur avait
posée au moteur : « fais-tu des correctifs au cas par cas ou une mise à jour des
règles pour que ça marche aussi si je changeais de fonte ? »

★ **CE QUE JOST DONNE QUE JETBRAINS NE DONNAIT PAS : L'ENCRE S'ANNULE PRESQUE
  SUR PLACE.** Fût vertical du `I` : **10 unités à wght 100, 85 à wght 400**. La
  droite coupe zéro à **wght 60** — soit t = −0,1333 en dehors du segment
  relevé, une extrapolation de **×1,133**. JetBrains devait descendre à
  wght −275, c'est-à-dire **×2,25** : deux fois plus loin hors du domaine où la
  police a été dessinée, donc deux fois plus de foi accordée à l'hypothèse
  affine. Ici l'hypothèse est presque une interpolation.

★ **ET LES DEUX FÛTS S'ANNULENT AU MÊME ENDROIT — À 2,9 wght PRÈS.** Fût
  horizontal (la barre médiane du `E`) : 10 → 80, donc zéro à **wght 57,1**.
  Jost est monolinéaire à 2,9 unités de graisse près ; JetBrains écartait ses
  deux zéros de dix (−275 contre −265). Le repliage (③) rattrape l'écart dans
  les deux cas, mais il a nettement moins à rattraper ici.

⚠️ **LE FORMAT DES NŒUDS N'EST PAS LE MÊME, ET C'EST LA SEULE VRAIE DIFFÉRENCE.**
  `JetBrainsMono.glyphs` livre des cubiques ; un TTF livre des **quadratiques
  TrueType**, avec des points sur-courbe IMPLICITES — deux hors-courbe
  consécutifs sous-entendent un nœud à leur milieu. On ne les recompose pas à la
  main : `fontTools.pens.recordingPen` rend les segments tels quels et
  `decomposeQuadraticSegment` les scinde. La conversion quadratique → cubique,
  elle, est **exacte** et tient en deux lignes :

      C₁ = P₀ + ⅔·(Q − P₀)      C₂ = P₁ + ⅔·(Q − P₁)

  Ce n'est pas une approximation (contrairement à `cu2quPen`, qui va dans
  l'autre sens et doit, lui, subdiviser) : les deux courbes ont le même
  paramétrage et les mêmes points en tout t. Aucune tolérance n'apparaît donc
  nulle part dans ce fichier.

★ **LA COMPATIBILITÉ POINT À POINT EST ACQUISE, PAS ESPÉRÉE.** Deux instances
  d'une même police variable partagent leur `glyf` : `gvar` ne fait que déplacer
  des points existants. Le contrôle qui coûtait une sortie en erreur à
  `jetbrains-source.py` (des masters `.glyphs` pouvant diverger) est ici une
  formalité — on le garde quand même, il coûte trois lignes et il attraperait
  un `instancer` qui déciderait un jour de simplifier un contour.

★ **CE QUE LES CONTOURS DISENT, ET QUI CHANGE TOUT POUR LA SUITE.** Jost est
  dessinée **TRAIT PAR TRAIT, sans fusion des recouvrements** : le `E` sort en
  QUATRE rectangles disjoints — le fût plus ses trois barres —, le `t` en deux,
  le `i` en deux (le point et le fût nu), le `k` en deux. Là où JetBrains livrait
  une seule masse d'encre dont il fallait deviner la lecture, Jost livre la
  lecture elle-même. C'est de là que viennent les extrémités gagnées, et c'est
  aussi pourquoi son budget de nœuds est plus serré (voir `jost-traces.py`).

⚠️ **`src/gfx/jost.ttf` EST DÉJÀ DANS LE DÉPÔT** — il sert au générateur du logo
  (`logo-jost-trace.py`). On ne le retélécharge pas, et l'extrait qui en sort est
  couvert par la même SIL OFL 1.1, déjà reproduite dans `src/fonts/OFL-Jost.txt`.

Usage :

    python3 src/gfx/jost-source.py
"""

import json
import pathlib
import sys

try:
    from fontTools.pens.basePen import decomposeQuadraticSegment
    from fontTools.pens.recordingPen import RecordingPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError:  # pragma: no cover
    sys.exit('fontTools est requis : pip install fonttools')

RACINE = pathlib.Path(__file__).resolve().parents[2]
TTF = RACINE / 'src' / 'gfx' / 'jost.ttf'
CIBLE = RACINE / 'src' / 'gfx' / '_jost-source.json'

#: Les deux graisses instanciées, et le nom que Jost leur donne elle-même
#: (`fvar`, instances nommées). ⚠️ **ON NE VA PAS PLUS BAS QUE 100** : c'est le
#: minimum de l'axe, et `instancer` extrapolerait au lieu d'interpoler. Tout ce
#: qui se passe en deçà est le travail de `jetbrains-axe.py › effondre`, qui le
#: fait sur des NŒUDS APPARIÉS et non sur des deltas `gvar`.
RELEVES = (('Thin', 100), ('Regular', 400))

SIGNES = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

#: ★ **LES DEUX FÛTS SE MESURENT, ils ne sont pas déclarés.** Un `.glyphs` porte
#:   `stemValues` ; un TTF n'a rien de tel — `OS/2` ne connaît que des poids
#:   nominaux. On les relève donc sur les deux glyphes où ils sont NUS :
#:
#:    · le **vertical** sur le `I`, qui est un rectangle de quatre nœuds et rien
#:      d'autre (`M 80,700 L 80,0 L 165,0 L 165,700 Z` à wght 400) — sa largeur
#:      EST le fût, sans une courbe ni un empattement pour la troubler ;
#:    · l'**horizontal** sur la plus mince des quatre barres du `E`, elles aussi
#:      des rectangles nus. On prend le minimum des hauteurs de contour, ce qui
#:      désigne mécaniquement une barre et jamais le fût (80 contre 700).
#:
#:   Aucun des deux ne demande d'interprétation : ce sont des côtés de
#:   rectangle, lus dans la police, à la graisse voulue.
FUT_VERTICAL = 'I'
FUT_HORIZONTAL = 'E'


def instance(wght):
    """Jost figée à une graisse. `inplace` sur une copie fraîche : l'instancier
    consomme le `gvar` du `TTFont` qu'on lui donne, il en faut donc un par
    graisse."""
    return instancer.instantiateVariableFont(
        TTFont(TTF), {'wght': wght}, inplace=True, updateFontNames=False)


def contours(gs, cmap, ch):
    """Les contours de `ch` au format Glyphs : `[[x, y, type], …]` par contour.

    ⚠️ **TROIS PIÈGES DE TRUETYPE, ET LES TROIS SONT ICI.**

     1. **Les sur-courbe implicites.** `qCurveTo(o₁, o₂, …, on)` sous-entend un
        nœud entre chaque paire de hors-courbe consécutifs.
        `decomposeQuadraticSegment` rend la liste `[(off, on), …]` déjà
        recomposée — la refaire à la main, c'est se tromper d'un demi-point sur
        les lettres rondes, où ces implicites sont la règle.
     2. **Le contour tout en hors-courbe.** Un cercle TrueType peut n'avoir
        AUCUN nœud sur-courbe ; `qCurveTo` le signale par un `None` final. Le
        point de départ est alors le milieu du dernier et du premier hors-courbe.
        Jost n'en produit pas sur les cinquante-deux signes, mais le cas est
        légal et il coûte quatre lignes.
     3. **`closePath` sans retour explicite au départ.** Le contour est cyclique ;
        `morceaux()` le sait déjà et repart du dernier sur-courbe. On n'ajoute
        donc pas de nœud de fermeture, qui ferait un doublon.

    ★ **LA CONVERSION QUADRATIQUE → CUBIQUE EST EXACTE**, et c'est ce qui permet
      d'écrire des `'o'` par paires comme le fait Glyphs : le reste de la chaîne
      (`morceaux`, `evalue`, `_casteljau`) lit indifféremment une ou deux
      poignées, mais tous les seuils de forme ont été calibrés sur des cubiques.
    """
    stylo = RecordingPen()
    gs[cmap[ord(ch)]].draw(stylo)
    out, cur, ici = [], None, None
    for op, args in stylo.value:
        if op == 'moveTo':
            ici = args[0]
            cur = [[float(ici[0]), float(ici[1]), 'l']]
        elif op == 'lineTo':
            ici = args[0]
            cur.append([float(ici[0]), float(ici[1]), 'l'])
        elif op == 'curveTo':          # cubique native : Jost n'en a pas, mais
            for p in args[:-1]:        # rien n'interdit à un TTF d'en porter.
                cur.append([float(p[0]), float(p[1]), 'o'])
            ici = args[-1]
            cur.append([float(ici[0]), float(ici[1]), 'c'])
        elif op == 'qCurveTo':
            pts = list(args)
            if pts[-1] is None:        # ② contour entièrement hors-courbe
                pts = pts[:-1]
                ici = ((pts[-1][0] + pts[0][0]) / 2.0, (pts[-1][1] + pts[0][1]) / 2.0)
                cur = [[float(ici[0]), float(ici[1]), 'l']]
                pts = pts + [ici]
            for hors, sur in decomposeQuadraticSegment(tuple(pts)):  # ①
                cur.append([ici[0] + 2.0 / 3.0 * (hors[0] - ici[0]),
                            ici[1] + 2.0 / 3.0 * (hors[1] - ici[1]), 'o'])
                cur.append([sur[0] + 2.0 / 3.0 * (hors[0] - sur[0]),
                            sur[1] + 2.0 / 3.0 * (hors[1] - sur[1]), 'o'])
                cur.append([float(sur[0]), float(sur[1]), 'c'])
                ici = sur
        elif op in ('closePath', 'endPath'):   # ③
            out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return out


def _futs(gs, cmap):
    """`[horizontal, vertical]`, mesurés sur le `E` et le `I` (voir plus haut)."""
    ci = contours(gs, cmap, FUT_VERTICAL)
    xs = [p[0] for c in ci for p in c]
    vertical = max(xs) - min(xs)
    horizontal = min(max(p[1] for p in c) - min(p[1] for p in c)
                     for c in contours(gs, cmap, FUT_HORIZONTAL))
    return [horizontal, vertical]


def main():
    if not TTF.exists():
        sys.exit('police absente : %s' % TTF)

    fontes, extrait, futs = {}, {}, {}
    for nom, wght in RELEVES:
        f = instance(wght)
        fontes[nom] = f
        gs, cmap = f.getGlyphSet(), f.getBestCmap()
        futs[nom] = _futs(gs, cmap)
        for ch in SIGNES:
            extrait.setdefault(ch, {})[nom] = contours(gs, cmap, ch)

    # ⚠️ La compatibilité point à point n'est pas une politesse : c'est ce qui
    #   rend la soustraction entre graisses licite. Acquise ici par construction
    #   (`gvar` déplace, n'ajoute pas), on la VÉRIFIE quand même.
    for ch in SIGNES:
        formes = {n: tuple(len(c) for c in extrait[ch][n]) for n, _ in RELEVES}
        if len(set(formes.values())) != 1:
            sys.exit('« %s » : contours incompatibles entre graisses — %r' % (ch, formes))

    ref = fontes[RELEVES[-1][0]]
    charge = {
        'police': ref['name'].getDebugName(1) or 'Jost',
        'depot': 'https://github.com/indestructible-type/Jost',
        'version': (ref['name'].getDebugName(5) or '').replace('Version ', ''),
        'date': '',
        'licence': 'SIL OFL 1.1 — voir src/fonts/OFL-Jost.txt',
        'unitesParCadratin': int(ref['head'].unitsPerEm),
        'capitale': int(ref['OS/2'].sCapHeight),
        'graisses': {nom: wght for nom, wght in RELEVES},
        'futs': futs,
        'releves': [nom for nom, _ in RELEVES],
        'glyphes': extrait,
    }
    CIBLE.write_text(json.dumps(charge, ensure_ascii=False, separators=(',', ':')) + '\n')

    a, b = RELEVES[0][1], RELEVES[-1][1]
    print('— extrait des contours %s v%s —' % (charge['police'], charge['version']))
    for nom, wght in RELEVES:
        print('  %-10s wght %3d   fûts %s' % (nom, wght, futs[nom]))
    for k, quoi in ((1, 'vertical  (I)'), (0, 'horizontal (E)')):
        ea = futs[RELEVES[0][0]][k]
        eb = futs[RELEVES[-1][0]][k]
        zero = a - ea * (b - a) / float(eb - ea)
        print('  fût %s : %g → %g, l’encre s’annule à wght %.1f (t = %+.4f, ×%.3f)'
              % (quoi, ea, eb, zero, (zero - a) / float(b - a),
                 1 + abs(zero - a) / float(b - a)))
    print('  → src/gfx/_jost-source.json (%d signes, %.0f Ko)'
          % (len(extrait), CIBLE.stat().st_size / 1024))
    contes = sorted(((len(extrait[c][RELEVES[-1][0]]), c) for c in SIGNES), reverse=True)
    print('  contours par signe (Jost dessine TRAIT PAR TRAIT, sans fusion) :')
    print('    ' + '  '.join('%s:%d' % (c, n) for n, c in
                             sorted(contes, key=lambda t: SIGNES.index(t[1]))))


if __name__ == '__main__':
    main()
