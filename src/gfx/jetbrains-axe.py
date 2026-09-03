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

    # ★ La seconde lecture : les traits DÉCLARÉS par les recettes, reposés sur
    #   l'axe EXACT. C'est celle qui porte des jonctions, donc des comptes.
    import importlib.util as _iu
    _sp = _iu.spec_from_file_location('jetbrains_traces', str(RACINE / 'src' / 'gfx' / 'jetbrains-traces.py'))
    _tr = _iu.module_from_spec(_sp)
    sys.modules['jetbrains_traces'] = _tr
    _argv, sys.argv = sys.argv, [sys.argv[0]]
    _sp.loader.exec_module(_tr)
    sys.argv = _argv
    _rec = _tr.recettes(_tr.mesures())
    poses = {ch: traits(ch, _rec[ch], _tr.points_du_trace)
             for ch in 'abcdefghijklmnopqrstuvwxyz'}

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
    lignes.append('')
    lignes.append('/** Les traits DÉCLARÉS par les recettes, reposés sur l’axe EXACT. */')
    lignes.append('export const TRAITS = {')
    for ch, (t, jonc) in poses.items():
        lignes.append('  %r: { traits: [%s], jonctions: %s },' % (
            ch,
            ', '.join('{ d: %r, ouvert: %s }' % (x['d'], 'true' if x['ouvert'] else 'false') for x in t),
            '[' + ', '.join('[%d, %d]' % (int(j[0]), int(j[1])) for j in jonc) + ']'))
    lignes.append('};')
    CIBLE.write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_glyphes-axe.js (%d lettres)' % len(lettres))




# ═══════════════════════════════════════════════════════════════════════════
#  ★ **LES TRAITS — la topologie DÉCLARÉE, posée sur l'axe EXACT.**
#
#  Le contour extrapolé est un aller-retour : il longe l'axe puis revient par
#  l'autre bord, à moins d'une unité. C'est sans conséquence pour l'œil, mais
#  `moteur/tables/glyphes.js` compte des sous-chemins, des extrémités et des
#  boucles — il faut donc en tirer des TRAITS.
#
#  ★ **ET ON NE LES CHERCHE PAS DANS L'AXE : on les y APPORTE.** Deux tentatives
#    ont voulu les déduire — repérer les rebroussements, apparier les brins deux
#    à deux. La seconde tombait juste dix fois sur vingt-six, parce qu'un test
#    d'angle ne distingue pas un demi-tour arrondi d'un coin franc : le `z`
#    déclarait quatre extrémités pour deux, le `j` deux pour quatre.
#
#    Or la topologie n'a jamais eu à se mesurer. Les recettes de
#    `jetbrains-traces.py` la DÉCLARENT — combien de traits, lesquels se
#    touchent, où le crayon se lève — et c'est une lecture du dessin, pas une
#    donnée du fichier. C'est le même partage qu'ailleurs, avec cette fois une
#    géométrie qui n'a plus rien d'approché : ni grille, ni amincissement, ni
#    filtre. Le doublon de l'aller-retour ne gêne même pas — chaque abscisse
#    rend la MOYENNE de ce qui s'y projette, et un point compté deux fois pèse
#    comme un point compté une fois.
# ═══════════════════════════════════════════════════════════════════════════

#: Combien d'abscisses par trait déclaré, et à quelle finesse on suit l'axe.
ABSCISSES = 26
PAS_AXE = 2.0


def _plat(ch, div=10):
    """L'axe extrapolé, aplati en points — tous sous-contours confondus."""
    subs, cur, pos = [], [], None
    for op, args in axe(ch):
        if op == 'moveTo':
            if cur:
                subs.append(cur)
            pos = args[0]
            cur = [pos]
        elif op == 'lineTo':
            pos = args[0]
            cur.append(pos)
        elif op == 'qCurveTo':
            pts = [p for p in args if p is not None]
            for i in range(len(pts) - 1):
                a, b = pts[i], pts[i + 1]
                fin = b if i == len(pts) - 2 else ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                for t in range(1, div + 1):
                    u = t / div
                    cur.append(((1 - u) ** 2 * pos[0] + 2 * (1 - u) * u * a[0] + u * u * fin[0],
                                (1 - u) ** 2 * pos[1] + 2 * (1 - u) * u * a[1] + u * u * fin[1]))
                pos = fin
        elif op == 'closePath' and cur:
            subs.append(cur)
            cur = []
    if cur:
        subs.append(cur)
    return [p for s in subs for p in _regulier(s)]


def _regulier(pts, pas=PAS_AXE):
    """Points équidistants le long d'un contour fermé."""
    import math
    out, reste = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:] + [pts[0]]):
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        if d < 1e-9:
            continue
        t = reste
        while t < d:
            u = t / d
            out.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
            t += pas
        reste = t - d
    return out


def _curviligne(pts):
    import math
    s, out = 0.0, [0.0]
    for a, b in zip(pts, pts[1:]):
        s += math.hypot(b[0] - a[0], b[1] - a[1])
        out.append(s)
    return out, s


def _au(seq, s, longueur, u):
    cible = u * longueur
    for i in range(len(s) - 1):
        if s[i + 1] >= cible:
            f = (cible - s[i]) / max(1e-9, s[i + 1] - s[i])
            return (seq[i][0] + (seq[i + 1][0] - seq[i][0]) * f,
                    seq[i][1] + (seq[i + 1][1] - seq[i][1]) * f)
    return seq[-1]


def _lisser(pts, dur=frozenset(), tours=1):
    """Moyenne mobile sur trois points, en tenant les BOUTS et les COINS."""
    for _ in range(tours):
        if len(pts) < 3:
            return pts
        sortie = [pts[0]]
        for i in range(1, len(pts) - 1):
            if i in dur:
                sortie.append(pts[i])
                continue
            sortie.append(((pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4,
                           (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4))
        sortie.append(pts[-1])
        pts = sortie
    return pts


def _anguleux(guide, seuil=None):
    """Les indices où le guide CHANGE DE DIRECTION franchement."""
    import math
    if seuil is None:
        seuil = math.radians(45)
    dur = set()
    for i in range(1, len(guide) - 1):
        ax, ay = guide[i][0] - guide[i - 1][0], guide[i][1] - guide[i - 1][1]
        bx, by = guide[i + 1][0] - guide[i][0], guide[i + 1][1] - guide[i][1]
        na, nb = math.hypot(ax, ay), math.hypot(bx, by)
        if na < 1e-9 or nb < 1e-9:
            continue
        cos = max(-1.0, min(1.0, (ax * bx + ay * by) / (na * nb)))
        if math.acos(cos) > seuil:
            dur.add(i)
    return dur


#: Sous quelle distance deux tracés se TOUCHENT — la tolérance de `deriveGlyph`
#: (`visuel/glyphes.js › TOL`). Une autre valeur relèverait des contacts que le
#: comptage ne voit pas, ou en manquerait qu'il voit.
CONTACT = 6.0


def _distSegment(p, a, b):
    import math
    vx, vy = b[0] - a[0], b[1] - a[1]
    n = vx * vx + vy * vy
    if n < 1e-12:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / n))
    return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy)


def _contacts(pa, pb):
    """Les extrémités de `pa` qui touchent `pb` — AU SEGMENT, pas aux points."""
    import math
    out = []
    for i in (0, -1):
        if len(pb) > 1:
            d = min(_distSegment(pa[i], pb[k], pb[k + 1]) for k in range(len(pb) - 1))
        else:
            d = math.hypot(pa[i][0] - pb[0][0], pa[i][1] - pb[0][1])
        if d <= CONTACT:
            out.append(i)
    return out


def _catmull(P):
    n = len(P)
    d = ['M %s %s' % (r(P[0][0]), r(P[0][1]))]
    for i in range(n - 1):
        p0 = P[i - 1] if i > 0 else P[0]
        p1, p2 = P[i], P[i + 1]
        p3 = P[i + 2] if i + 2 < n else P[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append('C %s %s %s %s %s %s' % (r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1]),
                                          r(p2[0]), r(p2[1])))
    return ' '.join(d)


def _allege(pts, combien=14):
    if len(pts) <= combien:
        return pts
    pas = (len(pts) - 1) / (combien - 1)
    return [pts[min(len(pts) - 1, int(round(k * pas)))] for k in range(combien)]


def traits(ch, recette, points_du_trace):
    """Les traits DÉCLARÉS par `recette`, reposés sur l'axe EXACT de `ch`."""
    nuage = _plat(ch)
    decl, jonctions = recette

    guides = []
    for t in decl:
        pts = points_du_trace(t['d'])
        s, longueur = _curviligne(pts)
        guides.append([_au(pts, s, longueur, k / ABSCISSES) for k in range(ABSCISSES + 1)])

    # ① chaque point de l'axe rejoint le trait, puis l'abscisse, les plus proches
    seaux = [[[] for _ in range(ABSCISSES + 1)] for _ in decl]
    for p in nuage:
        choix, meilleur = None, None
        for t, guide in enumerate(guides):
            for k, q in enumerate(guide):
                d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
                if meilleur is None or d < meilleur:
                    meilleur, choix = d, (t, k)
        seaux[choix[0]][choix[1]].append(p)

    # ② chaque abscisse rend la MOYENNE ; les trous s'interpolent entre les
    #    points MESURÉS voisins, jamais depuis le guide — alterner deviné et
    #    mesuré fait serpenter les traits droits.
    lignes = []
    for t, guide in enumerate(guides):
        if max(abs(q[0] - guide[0][0]) + abs(q[1] - guide[0][1]) for q in guide) < 1e-6:
            lignes.append(list(guide))          # un point : le `i`, le `j`
            continue
        mes = [None] * len(guide)
        for k in range(len(guide)):
            lot = seaux[t][k]
            if lot:
                mes[k] = (sum(z[0] for z in lot) / len(lot),
                          sum(z[1] for z in lot) / len(lot))
        connus = [k for k, x in enumerate(mes) if x is not None]
        ligne = []
        for k, q in enumerate(guide):
            if mes[k] is not None:
                ligne.append(mes[k])
            elif connus:
                av = max([c for c in connus if c < k], default=None)
                ap = min([c for c in connus if c > k], default=None)
                if av is None:
                    ligne.append(mes[ap])
                elif ap is None:
                    ligne.append(mes[av])
                else:
                    f = (k - av) / (ap - av)
                    a0, a1 = mes[av], mes[ap]
                    ligne.append((a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f))
            else:
                ligne.append(q)
        lignes.append(_lisser(ligne, _anguleux(guide)))

    # ③ les contacts se REPRODUISENT tels que la recette les réalise
    origines = [points_du_trace(t['d']) for t in decl]
    for jonc in jonctions:
        a, b = int(jonc[0]), int(jonc[1])
        if not (0 <= a < len(lignes) and 0 <= b < len(lignes)):
            continue
        for (u, v) in ((a, b), (b, a)):
            for iBout in _contacts(origines[u], origines[v]):
                p = lignes[u][iBout]
                lignes[u][iBout] = min(lignes[v],
                                       key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)

    return ([{'d': _catmull(_allege(ligne)), 'ouvert': decl[t].get('ouvert', True)}
             for t, ligne in enumerate(lignes)], jonctions)


if __name__ == '__main__':
    main()
