#!/usr/bin/env python3
"""★ **L'AXE DES LETTRES, DONNÉ PAR LA POLICE ELLE-MÊME.**

    python3 src/gfx/jetbrains-axe.py        # → src/gfx/_glyphes-axe.js

═══════════════════════════════════════════════════════════════════════════════

★ **LA QUESTION QUI A TOUT CHANGÉ.**

> « Je peine à comprendre comment tu peines autant à reproduire le squelette de
>   cette font. À tel point que ça me donne l'impression que j'aurais plus vite
>   fait à la main… Mais si tu repars des sources de la font — c'est l'intérêt
>   d'une font open —, as-tu ce qu'il faut plutôt que de chercher à le
>   recréer ? » (l'auteur)

Oui. Et il n'y avait même pas à aller chercher les sources : **le woff2 du dépôt
est une police VARIABLE**, axe `wght` de 100 à 800, et JetBrains Mono est
MONOLINÉAIRE — tous ses traits ont la même épaisseur, laquelle est précisément
ce que l'axe de graisse fait varier.

★ **L'AXE MÉDIAN EST DONC LA LIMITE DES CONTOURS QUAND LA GRAISSE TEND VERS
  ZÉRO**, et cette limite se CALCULE. Une police variable garantit que ses
  masters s'interpolent point par point — c'est la condition même de son
  existence —, donc on peut aussi bien EXTRAPOLER sous le minimum. Mesuré sur le
  tiret, dont la hauteur EST l'épaisseur du trait :

    wght  400 →  80,0 unités        wght    0 →  33,3
    wght  200 →  59,0                wght −100 →  21,7
    wght  100 →  45,0                wght −200 →  10,0
                                     wght −280 →   0,7

  À `wght = −280`, le contour s'est refermé sur son axe.

★ **CE QUE CELA REMPLACE, ET CE QUE ÇA DIT DE LA MÉTHODE PRÉCÉDENTE.**
  `jetbrains-squelette.py` rastérise, amincit, ébarbe, apparie — quatre étages
  d'approximation, quatre familles de défauts (épines de congé, escaliers de
  grille, tremblement des moyennes, angles émoussés), et des jours à les
  poursuivre. Ici : deux lectures de la même police et une soustraction. Il n'y
  a rien à régler parce qu'il n'y a rien d'approché.

⚠️ **CE QUI RESTE À FAIRE POUR L'ADOPTION.** Le contour extrapolé est un
  ALLER-RETOUR : il longe l'axe dans un sens puis revient par l'autre bord, à
  moins d'une unité de distance. C'est sans conséquence pour l'ŒIL — un trait
  parcouru deux fois se peint une fois — mais `moteur/tables/glyphes.js` compte
  des sous-chemins, des extrémités et des boucles : il faudra REPLIER ce
  contour, c'est-à-dire apparier ses deux moitiés et n'en garder qu'une. C'est
  la seule chose qui manque, et elle est purement combinatoire — plus rien à
  mesurer, plus rien à deviner.
"""

import json
import pathlib
import sys

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.recordingPen import DecomposingRecordingPen
except ImportError:  # pragma: no cover
    sys.exit('fontTools est requis : pip install fonttools brotli')

RACINE = pathlib.Path(__file__).resolve().parents[2]
POLICE = RACINE / 'src' / 'fonts' / 'jetbrains-mono-var.woff2'
CIBLE = RACINE / 'src' / 'gfx' / '_glyphes-axe.js'

#: Le repère du moteur : la capitale vaut 600 (`glyphes.js › METRIQUES`).
CAPITALE_CIBLE = 600

#: Les deux graisses LUES. Elles ne servent qu'à établir la droite le long de
#: laquelle chaque point se déplace ; toute autre paire donnerait la même, à la
#: précision des deltas près. On prend les deux extrêmes disponibles du côté
#: fin, où la linéarité est la mieux tenue.
LU = (100, 400)

#: La graisse EXTRAPOLÉE. Elle n'est pas choisie à l'œil : c'est celle où
#: l'épaisseur du tiret s'annule (voir l'en-tête). On s'arrête juste avant zéro
#: — à épaisseur nulle exacte, les deux bords se confondraient au millième et
#: les courbes dégénéreraient en points.
MAIGRE = -278

_INSTANCES = {}


def instance(poids):
    """La police instanciée à une graisse — mémorisée, l'opération est lourde."""
    if poids not in _INSTANCES:
        f = TTFont(POLICE)
        _INSTANCES[poids] = instancer.instantiateVariableFont(
            f, {'wght': poids}, inplace=True)
    return _INSTANCES[poids]


def trace(poids, ch):
    """Le contour d'une lettre, décomposé — `i` et `j` sont des composites."""
    inst = instance(poids)
    gs = inst.getGlyphSet()
    pen = DecomposingRecordingPen(gs)
    gs[inst.getBestCmap()[ord(ch)]].draw(pen)
    return pen.value


def echelle():
    """De l'unité de la police à celle du moteur : capitale sur capitale."""
    return CAPITALE_CIBLE / instance(LU[1])['OS/2'].sCapHeight


def axe(ch, maigre=MAIGRE):
    """Le contour de `ch` extrapolé jusqu'à l'épaisseur nulle, à l'échelle.

    ⚠️ Les deux relevés DOIVENT avoir la même structure — mêmes commandes, même
      nombre de points, dans le même ordre. C'est ce qu'une police variable
      garantit, et c'est ce qui rend la soustraction licite ; on le vérifie
      plutôt que de le supposer, parce qu'un glyphe composite mal décomposé
      romprait l'accord sans rien signaler.
    """
    a, b = trace(LU[0], ch), trace(LU[1], ch)
    if [op for op, _ in a] != [op for op, _ in b]:
        raise ValueError(f'« {ch} » : les deux graisses ne se correspondent pas')
    t = (maigre - LU[0]) / float(LU[1] - LU[0])
    k = echelle()
    out = []
    for (op, argsA), (_, argsB) in zip(a, b):
        pts = []
        for pa, pb in zip(argsA, argsB):
            if pa is None or pb is None:
                pts.append(None)
                continue
            pts.append(((pa[0] + (pb[0] - pa[0]) * t) * k,
                        (pa[1] + (pb[1] - pa[1]) * t) * k))
        out.append((op, pts))
    return out


def r(v):
    x = round(v, 1)
    return str(int(x)) if x == int(x) else str(x)


def versD(enregistrement):
    """Le `d` SVG d'un contour enregistré.

    ★ Les `qCurveTo` de TrueType chaînent leurs points de contrôle : les points
      SUR la courbe sont les milieux implicites de deux contrôles consécutifs.
      Les développer ici plutôt que de les approcher par des segments garde au
      tracé la douceur que la police lui a donnée.
    """
    d = []
    pos = None
    for op, args in enregistrement:
        if op == 'moveTo':
            pos = args[0]
            d.append('M %s %s' % (r(pos[0]), r(pos[1])))
        elif op == 'lineTo':
            pos = args[0]
            d.append('L %s %s' % (r(pos[0]), r(pos[1])))
        elif op == 'qCurveTo':
            pts = [p for p in args if p is not None]
            for i in range(len(pts) - 1):
                a, b = pts[i], pts[i + 1]
                fin = b if i == len(pts) - 2 else ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                d.append('Q %s %s %s %s' % (r(a[0]), r(a[1]), r(fin[0]), r(fin[1])))
                pos = fin
            if len(pts) == 1:
                d.append('L %s %s' % (r(pts[0][0]), r(pts[0][1])))
                pos = pts[0]
        elif op == 'curveTo':
            d.append('C %s %s %s %s %s %s' % (
                r(args[0][0]), r(args[0][1]), r(args[1][0]), r(args[1][1]),
                r(args[2][0]), r(args[2][1])))
            pos = args[2]
        elif op == 'closePath':
            d.append('Z')
    return ' '.join(d)


def main():
    k = echelle()
    print('— l’axe extrait par EXTRAPOLATION de la graisse —')
    print('  lu à wght %d et %d, extrapolé à wght %d' % (LU[0], LU[1], MAIGRE))
    tiret = axe('-')
    ys = [p[1] for _, args in tiret for p in args if p]
    print('  épaisseur résiduelle du tiret : %s unités (échelle %.4f)'
          % (r(max(ys) - min(ys)), k))

    lettres = {}
    for ch in 'abcdefghijklmnopqrstuvwxyz':
        lettres[ch] = versD(axe(ch))

    lignes = ["/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-axe.py` — ne pas éditer à la main.",
              " *",
              " * L'AXE des lettres, obtenu en extrapolant la police variable jusqu'à",
              " * l'épaisseur nulle. Ce n'est pas une reconstruction : c'est JetBrains Mono",
              " * elle-même, à une graisse qu'elle ne propose pas mais qu'elle décrit.",
              " *",
              " * ⚠️ Chaque contour est un ALLER-RETOUR — il longe l'axe puis revient par",
              " *   l'autre bord, à moins d'une unité. Sans conséquence pour l'œil ; il",
              " *   faudra le REPLIER avant que `moteur/tables/glyphes.js` puisse en compter",
              " *   les traits, les extrémités et les boucles.",
              " */",
              "export const AXES = {"]
    for ch, d in lettres.items():
        lignes.append('  %r: %r,' % (ch, d))
    lignes.append('};')
    CIBLE.write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_glyphes-axe.js (%d lettres)' % len(lettres))


if __name__ == '__main__':
    main()
