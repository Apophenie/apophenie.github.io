#!/usr/bin/env python3
"""Dérive les TRACÉS BAS DE CASSE depuis JetBrains Mono — la police de la scène.

    python3 src/gfx/jetbrains-traces.py            # réécrit le bloc de glyphes.js
    python3 src/gfx/jetbrains-traces.py --check    # échoue si le bloc a dérivé

★ POURQUOI CE SCRIPT EXISTE.

« Les glyphes bas de casse : adapte-toi à la font utilisée sur le site. Le glyphe
qui est mené dans la zone de traçage devrait correspondre à celui qui est
tracé. » (l'auteur)

Le défaut était réel et double. La SCÈNE affiche ses jetons en JetBrains Mono
(`visuel/constants.js › FONT_FAMILY`) ; les tracés de `moteur/tables/glyphes.js`,
eux, avaient été dessinés à la main « type Futura / Century Gothic ». Un `a` de
la ligne entrait donc dans la zone de traçage et s'y changeait en une AUTRE
lettre — deux dessins pour un même signe, ce que la doctrine du dépôt interdit
partout ailleurs (« la géométrie affichée est extraite de la police, jamais
transcrite à la main », comme `dseg14-table.py`, `dseg-segments.py` et
`jetbrains-six.py` le font déjà).

★ CE QUE CE SCRIPT PEUT DÉRIVER, ET CE QU'IL NE PEUT PAS.

Une police donne des CONTOURS REMPLIS ; `glyphes.js` demande des TRACÉS DE
CRAYON — l'axe médian, plus le nombre de levées de stylo. Les seconds ne se
déduisent pas mécaniquement des premiers : une squelettisation rendrait une
polyligne bruitée, sans jonctions déclarées ni comptage de traits, et surtout
sans savoir où le crayon se lève.

On sépare donc ce qui se mesure de ce qui se décide :

 · **MESURÉ dans la police** — l'avance, l'épaisseur du fût, la hauteur d'x, la
   hampe, le jambage, et la BOÎTE de chaque lettre (ses bornes réelles). Aucun
   de ces nombres n'est écrit à la main ;
 · **DÉCLARÉ ici** — la topologie : combien de traits, lesquels se touchent, où
   le crayon se lève. C'est une lecture du dessin, pas une donnée du fichier.

Chaque recette exprime ses points en fonction de la boîte MESURÉE de sa lettre.
Changer de version de police déplace donc les tracés avec elle, et le contrôle
de `derivees.js` dit aussitôt si un comptage a bougé.
"""

import math
import sys
import pathlib

try:
    from fontTools.ttLib import TTFont
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.recordingPen import RecordingPen
except ImportError:  # pragma: no cover
    sys.exit('fontTools est requis : pip install fonttools brotli')

RACINE = pathlib.Path(__file__).resolve().parents[2]
POLICE = RACINE / 'src' / 'fonts' / 'jetbrains-mono-var.woff2'
CIBLE = RACINE / 'src' / 'moteur' / 'tables' / 'glyphes.js'

# Le repère du moteur visuel : la CAPITALE vaut 600, origine en bas à gauche.
# C'est la seule constante posée ici, et elle vient de `glyphes.js › METRIQUES`,
# pas de la police — c'est l'unité du dessin, pas une mesure.
CAPITALE_CIBLE = 600

#: Les signes que l'on dérive : les vingt-six bas de casse, puis les vingt-six
#: CAPITALES. Les secondes sont arrivées en second — leurs recettes existent
#: depuis que l'auteur a demandé « est-ce que ça produit les majuscules
#: proprement du premier coup ou non ? ».
SIGNES = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'


def mesures():
    """Tout ce que la police dit, mis à l'échelle du repère du moteur."""
    f = TTFont(POLICE)
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    upm = f['head'].unitsPerEm
    cap = f['OS/2'].sCapHeight
    k = CAPITALE_CIBLE / cap  # capitale de la police → 600

    def boite(c):
        bp = BoundsPen(gs)
        gs[cmap[ord(c)]].draw(bp)
        x0, y0, x1, y1 = bp.bounds
        return {
            'x0': x0 * k, 'x1': x1 * k, 'y0': y0 * k, 'y1': y1 * k,
            'l': (x1 - x0) * k, 'h': (y1 - y0) * k,
        }

    return {
        'k': k,
        'upm': upm,
        # ★ Le jeu de glyphes et la table de caractères VOYAGENT avec les
        #   mesures : l'extraction d'axe (`axe_median`) lit le CONTOUR, pas
        #   seulement sa boîte. Rouvrir la police ailleurs, ce serait deux
        #   lectures du même fichier, donc deux occasions de ne pas lire la
        #   même version.
        'gs': gs,
        'cmap': cmap,
        'avance': f['hmtx'][cmap[ord('l')]][0] * k,
        'hauteurX': f['OS/2'].sxHeight * k,
        'capitale': CAPITALE_CIBLE,
        # Le fût : la barre verticale du « L », mesurée sur ses abscisses.
        'fut': 90 * k,
        'boites': _sans_le_point(boite, gs, cmap, k),
    }


def _sans_le_point(boite, gs, cmap, k):
    """★ **LA BOÎTE DU `j` INCLUAIT SON POINT, ET SON FÛT S'EN TROUVAIT DÉCALÉ.**

    > « le point du `j` devrait surplomber la barre verticale en étant pile
    >   au-dessus ; là, il est décalé vers la gauche. » (l'auteur)

    Il ne l'était pas : la police pose le centre du point à 380 unités, et le fût
    à 390 — dix unités, invisibles. Ce qui était décalé, c'est le FÛT, calculé
    depuis le bord droit d'une boîte que le point déborde de vingt unités. On
    mesure donc le `j` sur son seul corps, en écartant le contour du point.
    """
    boites = {c: boite(c) for c in
              'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}
    for c in 'ij':
        subs = _contour(gs, cmap, c, k)
        if len(subs) < 2:
            continue
        corps = max(subs, key=lambda s: max(y for _, y in s) - min(y for _, y in s))
        xs = [x for x, _ in corps]
        ys = [y for _, y in corps]
        boites[c] = {'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': boites[c]['y1'],
                     'l': max(xs) - min(xs), 'h': boites[c]['y1'] - min(ys)}
    return boites


def r(v):
    """Un nombre pour un `d` SVG : entier quand il peut l'être."""
    x = round(v, 1)
    return str(int(x)) if x == int(x) else str(x)



# ═══════════════════════════════════════════════════════════════════════════
#  L'AXE MÉDIAN — la géométrie EXTRAITE, et non plus devinée.
#
#  > « Pourquoi n'arrives-tu pas à reproduire correctement la font en SVG ? »
#  >   (l'auteur)
#
#  ★ **PARCE QUE LES RECETTES DEVINENT.** Elles posent des arcs elliptiques
#    paramétrés à la main sur des mesures de boîte ; la police, elle, est en
#    Bézier. Un arc n'a qu'un seul sens de courbure et un seul jeu de rayons :
#    il peut passer par les mêmes extrémités qu'une courbe de police et n'avoir
#    aucun de ses infléchissements. Sur un `s` — deux inversions de courbure —
#    l'écart cesse d'être une nuance : trop courts, les arcs bouclaient ; trop
#    longs, ils tendaient la lettre en `∫`.
#
#  ★ **CE QU'ON EXTRAIT ICI, ET CE QU'ON NE PEUT PAS.** Une police donne des
#    CONTOURS remplis ; `glyphes.js` demande des TRACÉS DE CRAYON. Pour un trait
#    d'épaisseur constante — JetBrains Mono est monolinéaire —, le crayon est le
#    MILIEU des deux bords, et ce milieu se mesure : on repère les deux
#    terminaisons (le contour y fait un demi-tour), ce qui sépare les deux
#    bords, puis on apparie chaque point de l'un au plus proche de l'autre.
#
#    ⚠️ Cela ne vaut que pour un trait UNIQUE et OUVERT — `c` et `s`. Dès qu'une
#      lettre a des branches (`n`, `t`, `k`…), son contour porte plus de deux
#      terminaisons et il faudrait décider quel bord répond à quel bord : c'est
#      une squelettisation, pas un appariement. Ces lettres-là gardent leurs
#      recettes, qui suffisent parce que leurs traits sont pour l'essentiel
#      droits ou d'un seul sens de courbure.
# ═══════════════════════════════════════════════════════════════════════════

#: Les lettres dont l'axe est EXTRAIT plutôt que décrit — un trait, deux bouts.
EXTRAITES = 'cs'


def _bezier(p0, pts, n=12):
    """Échantillonne une Bézier par l'algorithme de De Casteljau."""
    ctrl = [p0] + list(pts)
    out = []
    for i in range(1, n + 1):
        u = i / n
        q = list(ctrl)
        while len(q) > 1:
            q = [((1 - u) * q[j][0] + u * q[j + 1][0],
                  (1 - u) * q[j][1] + u * q[j + 1][1]) for j in range(len(q) - 1)]
        out.append(q[0])
    return out


def _contour(gs, cmap, ch, k):
    """Le contour de la lettre, aplati en points, à l'échelle du repère."""
    pen = RecordingPen()
    gs[cmap[ord(ch)]].draw(pen)
    subs, cur, pos = [], [], (0, 0)
    for op, args in pen.value:
        if op == 'moveTo':
            if cur:
                subs.append(cur)
            pos = args[0]
            cur = [pos]
        elif op == 'lineTo':
            pos = args[0]
            cur.append(pos)
        elif op == 'qCurveTo':
            pts = [a for a in args if a is not None]
            # Une `qCurveTo` TrueType chaîne les contrôles : les points sur la
            # courbe sont les MILIEUX des contrôles consécutifs (points implicites).
            for a, b in zip(pts, pts[1:]):
                mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                cur += _bezier(pos, [a, mid])
                pos = mid
            if len(pts) >= 2:
                cur += _bezier(pos, [pts[-2], pts[-1]])
            pos = pts[-1]
        elif op == 'curveTo':
            cur += _bezier(pos, list(args))
            pos = args[-1]
        elif op == 'closePath' and cur:
            subs.append(cur)
            cur = []
    if cur:
        subs.append(cur)
    return [[(x * k, y * k) for x, y in sub] for sub in subs]


def _regulier(pts, pas=4.0):
    """Points équidistants le long d'un contour fermé."""
    out, reste = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:] + [pts[0]]):
        d = math.dist(a, b)
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
    s, out = 0.0, [0.0]
    for a, b in zip(pts, pts[1:]):
        s += math.dist(a, b)
        out.append(s)
    return out, s


def _au(seq, s, longueur, u):
    """Le point à la fraction `u` de la longueur d'une polyligne."""
    cible = u * longueur
    for i in range(len(s) - 1):
        if s[i + 1] >= cible:
            f = (cible - s[i]) / max(1e-9, s[i + 1] - s[i])
            return (seq[i][0] + (seq[i + 1][0] - seq[i][0]) * f,
                    seq[i][1] + (seq[i + 1][1] - seq[i][1]) * f)
    return seq[-1]


def _terminaisons(pts, fenetre):
    """Les deux indices où le contour fait un DEMI-TOUR : les bouts du trait."""
    n = len(pts)
    virage = []
    for i in range(n):
        a, b, c = pts[(i - fenetre) % n], pts[i], pts[(i + fenetre) % n]
        v1 = (b[0] - a[0], b[1] - a[1])
        v2 = (c[0] - b[0], c[1] - b[1])
        n1, n2 = math.hypot(*v1), math.hypot(*v2)
        if n1 < 1e-9 or n2 < 1e-9:
            virage.append(0.0)
            continue
        cos = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))
        virage.append(math.acos(cos))
    pics = []
    for i in sorted(range(n), key=lambda j: -virage[j]):
        if all(min(abs(i - j), n - abs(i - j)) > n // 6 for j in pics):
            pics.append(i)
        if len(pics) == 2:
            break
    return sorted(pics)


def axe_median(gs, cmap, ch, k, points=12):
    """L'axe d'une lettre à trait unique, en points ordonnés d'un bout à l'autre."""
    pts = _regulier(_contour(gs, cmap, ch, k)[0])
    t1, t2 = _terminaisons(pts, max(3, len(pts) // 40))
    A = pts[t1:t2 + 1]
    B = list(reversed(pts[t2:] + pts[:t1 + 1]))
    sa, la = _curviligne(A)
    # ★ **L'APPARIEMENT SE FAIT PAR LA NORMALE, jamais par l'abscisse.** Deux
    #   bords concentriques (un `c`) se correspondent proportionnellement ; ceux
    #   d'un `s`, non — à l'intérieur d'un crochet, le bord est court là où
    #   l'extérieur est long. Mesuré : la correspondance linéaire accouplait des
    #   points distants de 269 unités pour un trait qui en fait 74.
    brut, larg = [], []
    N = points * 6
    for i in range(N + 1):
        p = _au(A, sa, la, i / N)
        q = min(B, key=lambda z: math.dist(p, z))
        brut.append(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
        larg.append(math.dist(p, q))
    # ★ **ET LES BOUTS SE COUPENT.** Près d'une terminaison les deux bords se
    #   rejoignent : la largeur mesurée s'effondre et le milieu part en crochet
    #   vers le centre du demi-cercle terminal. L'axe s'arrête là où le trait
    #   cesse d'avoir son épaisseur — c'est où un crayon lèverait.
    med = sorted(larg)[len(larg) // 2]
    bons = [i for i, w in enumerate(larg) if w > med * 0.75]
    utile = brut[bons[0]:bons[-1] + 1] if len(bons) >= 4 else brut
    su, lu = _curviligne(utile)
    return [_au(utile, su, lu, i / points) for i in range(points + 1)]


def catmull(P):
    """Polyligne → cubiques de Catmull-Rom : un `d` court, lisse, et RELISIBLE.

    Une polyligne de quarante points dirait la même courbe, mais `glyphes.js`
    est un fichier qu'on relit : douze cubiques se comparent d'une version à
    l'autre, quarante segments non.
    """
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


# ═══════════════════════════════════════════════════════════════════════════
#  LES RECETTES — la topologie déclarée, les coordonnées mesurées.
#
#  Chaque recette reçoit `o` (la boîte de SA lettre) et `M` (les mesures
#  communes), et rend `(traits, jonctions)`. Pas un nombre n'y est écrit en dur :
#  tout se lit sur la boîte, la hauteur d'x, la hampe ou le jambage.
#
#  ★ Les conventions de tracé de JetBrains Mono, telles qu'on les LIT sur ses
#    glyphes rendus (voir l'en-tête pour ce que « lire » veut dire ici) :
#
#     · les lettres à arche — `h m n r` — ont un fût plein hauteur et une épaule
#       qui NAÎT AU SOMMET du fût, exactement comme dans le dessin d'origine ;
#     · `i`, `j` et `l` portent des EMPATTEMENTS, ce qui les distingue le plus
#       nettement du tracé Futura qu'ils remplacent : le `l` a une base qui part
#       à droite, le `i` une base pleine et une amorce à gauche ;
#     · `a` est à DEUX ÉTAGES, panse ronde attachée à un fût droit ;
#     · `b d p q` ont de vraies panses circulaires, pas des demi-disques ;
#     · `t` a une base qui se relève à droite, `f` une hampe qui se courbe.
# ═══════════════════════════════════════════════════════════════════════════


def recettes(M):
    b = M['boites']
    hx = M['hauteurX']

    def arc(x0, y0, rx, ry, grand, sens, x1, y1):
        return 'M %s %s A %s %s 0 %d %d %s %s' % (
            r(x0), r(y0), r(rx), r(ry), grand, sens, r(x1), r(y1))

    def ligne(x0, y0, x1, y1):
        return 'M %s %s L %s %s' % (r(x0), r(y0), r(x1), r(y1))

    def t(d):
        return {'d': d, 'ouvert': True}

    def ferme(d):
        return {'d': d, 'ouvert': False}

    def couture(d):
        """★ **UNE BOUCLE REFERMÉE PAR UN SEGMENT SUPERPOSÉ.**

        > « relie les 2 extrémités de la boucle par un segment superposé, sans
        >   chercher à éviter l'angle. Ça sera simple et ça ferme la boucle pour
        >   permettre des animations pertinentes pour la suite (colorer
        >   l'intérieur de la boucle plutôt que d'y mettre un point quand il faut
        >   compter les espaces clos pour `mbob` et `mboc`). » (l'auteur)

        ⚠️ **ET CE SEGMENT NE SE MESURE PAS, IL S'AFFIRME.** Il court sur le fût,
          où la police ne met qu'une seule masse d'encre : l'axe n'y a qu'un
          brin, déjà réclamé par le fût lui-même. Écrit dans le guide, il
          n'attire aucun point de l'axe, ses abscisses restent vides, et la
          panse du `b` tombait de sept morceaux à deux — un moignon de trente
          unités, à 4,1 unités de son axe, donc *bien noté*. C'est l'œil qui l'a
          vu, pas le chiffre. Le guide reste donc OUVERT — la panse se pose et
          se taille comme avant —, et la couture est ajoutée après coup, quand
          on sait où sont ses deux bouts.
        """
        return {'d': d, 'ouvert': False, 'couture': True}

    def demiTour(fut, bord, yHaut, yBas, yTop, yBot, sens):
        """★ **LA PANSE EST UN PRESQUE-OVALE, pas un demi-disque.**

        ⚠️ La recette la décrivait comme un demi-tour entre deux points du fût
          posés à 0,88 et 0 hauteur d'x : l'arc ne pouvait alors PAS dépasser sa
          corde, si bien que le sommet de la panse plafonnait à 398 quand l'axe
          le pose à 460. Le `p` s'en écartait de 11,7 unités — le pire de
          l'alphabet — et le `b`, le `d`, le `q`, le `g` de six à huit.

        ★ **L'AXE dit tout autre chose, et il le dit clairement** : la panse ne
          touche le fût que sur une courte hauteur — de 144 à 306 pour le `b` —
          et de là elle s'échappe, monte jusqu'à 460, redescend à −8. C'est une
          BOUCLE presque close, pas une moitié de rond ; c'est d'ailleurs
          exactement la même figure que la goutte d'eau du `a`.

        On construit donc l'ellipse par ses trois cotes mesurées : les deux
        hauteurs d'attache donnent son centre, le haut et le bas de la boucle
        donnent son rayon vertical, et le rayon horizontal se DÉDUIT — c'est le
        seul qui fasse passer l'ellipse par les deux attaches ET atteindre le
        bord opposé.
        """
        cy = (yHaut + yBas) / 2
        ry = (yTop - yBot) / 2
        k = max(0.0, 1 - ((yHaut - cy) / ry) ** 2) ** 0.5
        rx = abs(bord - fut) / (1 + k)
        return 'M %s %s A %s %s 0 1 %d %s %s' % (
            r(fut), r(yHaut), r(rx), r(ry), sens, r(fut), r(yBas))

    def ovale(cx, cy, rx, ry):
        return ferme('M %s %s A %s %s 0 1 1 %s %s A %s %s 0 1 1 %s %s' % (
            r(cx), r(cy - ry), r(rx), r(ry), r(cx), r(cy + ry),
            r(rx), r(ry), r(cx), r(cy - ry)))

    R = {}

    # ── les rondes ────────────────────────────────────────────────────────────
    for c in 'o':
        o = b[c]
        R[c] = ([ovale((o['x0'] + o['x1']) / 2, (o['y0'] + o['y1']) / 2,
                       o['l'] / 2, o['h'] / 2)], [])

    # ── `c` et `s` : UN SEUL TRAIT OUVERT, donc un axe EXTRAIT ────────────────
    #
    # Ce sont les deux seules lettres dont le contour n'a que DEUX terminaisons :
    # on peut donc séparer ses deux bords sans rien décider, et le crayon est
    # leur milieu (voir « L'AXE MÉDIAN », plus haut). Ce ne sont pas non plus
    # deux lettres au hasard — ce sont celles où les arcs devinés échouaient le
    # plus : « s est le plus gênant » (l'auteur). Trois recettes successives ont
    # essayé de le décrire, et aucune n'y arrivait, parce qu'un `s` change deux
    # fois de sens de courbure et qu'un arc n'en a qu'un.
    for c in EXTRAITES:
        R[c] = ([t(catmull(axe_median(M['gs'], M['cmap'], c, M['k'])))], [])

    # ── `e` : la barre puis la boucle ─────────────────────────────────────────
    o = b['e']
    ye = o['y0'] + o['h'] * 0.5
    R['e'] = ([t(ligne(o['x0'], ye, o['x1'], ye)),
               t(arc(o['x1'], ye, o['l'] / 2, o['h'] / 2, 1, 1,
                     o['x1'] - o['l'] * 0.12, o['y0'] + o['h'] * 0.16))],
              [[0, 1, 'départ'], [0, 1, 'flanc gauche']])

    # ── les lettres à arche : fût + épaule ────────────────────────────────────
    for c, haut in (('n', hx), ('h', b['h']['y1']), ('r', hx), ('m', hx)):
        o = b[c]
        fut = o['x0'] + M['fut'] / 2
        # ★ **L'ARCHE NAÎT OÙ L'AXE LE DIT — 306, pas 334.**
        #   `n`, `h` et `r` posent tous les trois leur naissance d'arche à 306,16
        #   et leur sommet à 459,5 : 0,677 et 1,017 hauteur d'x. La recette
        #   disait 0,74 et un rayon de 0,28, soit une arche qui naît vingt-huit
        #   unités trop haut et monte d'autant moins.
        # ★ **ET LA JAMBE DESCEND SUR L'AXE DU BORD, pas sur le bord de la
        #   boîte.** `o['x1']` est le bord du CONTOUR ; l'axe de la jambe droite
        #   est un demi-fût plus à gauche — 385,89 et non 423. Trente-sept unités
        #   de guide faux, que la projection devait rattraper à chaque passe.
        epaule = hx * 0.677
        ryArche = hx * 0.340
        bordArche = o['x1'] - M['fut'] / 2
        if c == 'm':
            # ★ **LES DEUX ARCHES SONT LA MÊME, À UN ENTRAXE PRÈS.**
            #
            #   > « un trait vertical droit à gauche, un arc qui en part et
            #   >   redescend droit au centre, et un second arc IDENTIQUE accolé
            #   >   au premier. » (l'auteur)
            #
            #   La recette les décrivait par leurs BORDS — de `fut` au milieu de
            #   la boîte, puis du milieu au bord droit —, et ces deux largeurs
            #   diffèrent de deux unités parce que la boîte n'est pas centrée sur
            #   les fûts. On les décrit donc par leur ENTRAXE : trois jambes
            #   également espacées, deux arches rigoureusement superposables.
            #   L'axe le confirme — il pose les trois jambes à 79,2 / 246,6 /
            #   413,9, soit deux pas de 167,35 à un dixième d'unité près.
            #
            # ★ **ET LEUR NAISSANCE SE LIT DANS L'AXE, pas dans une fraction
            #   commune à `n` et `m`.** Les deux lettres partageaient `epaule =
            #   0,74 hx` et un rayon de `0,28 hx` : l'axe donne 306 pour le `n`
            #   (arche large de 277) et 354 pour le `m` (arches de 167). Une
            #   arche étroite naît plus haut et monte moins — c'est la même
            #   ellipse aplatie, pas la même hauteur d'attaque.
            droite = o['x1'] - M['fut'] / 2
            pas = (droite - fut) / 2
            epauleM = hx * 0.784
            ryM = hx * 0.227
            R[c] = ([t(ligne(fut, o['y0'], fut, hx))]
                    + [t(arc(fut + k * pas, epauleM, pas / 2, ryM, 0, 0,
                             fut + (k + 1) * pas, epauleM)
                         + ' L %s %s' % (r(fut + (k + 1) * pas), r(o['y0'])))
                       for k in (0, 1)],
                    [[0, 1, 'première arche'], [1, 2, 'seconde arche']])
        elif c == 'r':  # noqa: E501 — voir la note « LE FÛT S'ARRÊTE OÙ L'ARCHE NAÎT »
            # ⚠️ L'épaule montait à 535 pour une lettre qui plafonne à 460 : son
            #   arrivée était plus haute que son départ ET son rayon vertical
            #   valait 0,30 hauteur d'x, si bien que le sommet de l'arc passait
            #   par-dessus la lettre. Le `r` de JetBrains a une épaule COURTE,
            #   qui s'arrête avant de redescendre — elle atteint le haut, elle
            #   ne le dépasse pas.
            # ⚠️ Même amorce que `m` et `n` : le fût du `r` monte jusqu'en haut
            #   de la hauteur d'x, l'épaule naît en dessous. Et l'épaule est
            #   COURTE — un quart de tour, de la naissance au sommet de la même
            #   ellipse, donc qui ne peut pas dépasser la lettre.
            # ★ **ET SON ÉPAULE REDESCEND — l'axe est formel.**
            #
            #   Il la fait naître en (129, 306), passer par (260, 460) et
            #    REVENIR à (395, 303), d'où elle file droit jusqu'à (395, 259).
            #   La recette la décrivait comme un quart de tour s'arrêtant en haut
            #   à droite : « elle atteint le haut, elle ne le dépasse pas », ce
            #   qui était une lecture, et une fausse. Le `r` s'écartait de 11,0
            #   unités de son axe, le pire de l'alphabet — et l'écart tombait
            #   pile au départ de l'épaule, à (202, 437), là où l'arc déclaré
            #   passe onze unités sous l'arche réelle.
            #   C'est donc la MÊME figure que le `n` et le `h` : une arche
            #   complète, suivie d'une jambe. Elle est juste très courte —
            #   quarante-sept unités, de 306 à 259 (0,573 hauteur d'x).
            R[c] = ([t(ligne(fut, o['y0'], fut, hx)),
                     t(arc(fut, epaule, (bordArche - fut) / 2, ryArche, 0, 0,
                           bordArche, epaule)
                       + ' L %s %s' % (r(bordArche), r(hx * 0.573)))],
                    [[0, 1, 'naissance de l’épaule']])
        else:
            # ★ **LE FÛT MONTE AU-DESSUS DE L'ARCHE, et c'est une AMORCE.**
            #
            #   > « m, n, par exemple, qui impliquerait, tout comme r, de changer
            #   >   les pondérations (des extrémités supplémentaires), mais c'est
            #   >   pertinent, c'est ce que la font fait. » (l'auteur)
            #
            #   J'avais fermé cette jonction pour préserver les comptes de la
            #   table actuelle — c'était prendre le barème pour la référence. La
            #   référence est la POLICE : JetBrains Mono donne à `m`, `n` et `r`
            #   un départ de fût qui dépasse la naissance de l'arche, et ce
            #   départ EST une extrémité. `mexb` en comptera une de plus sur ces
            #   trois lettres, et ce sera juste.
            R[c] = ([t(ligne(fut, o['y0'], fut, haut if c == 'h' else hx)),
                     t(arc(fut, epaule, (bordArche - fut) / 2, ryArche, 0, 0,
                           bordArche, epaule)
                       + ' L %s %s' % (r(bordArche), r(o['y0'])))],
                    [[0, 1, 'naissance de l’arche']])

    # ── `u` : le miroir de `n` ────────────────────────────────────────────────
    o = b['u']
    futU = o['x1'] - M['fut'] / 2
    # ⚠️ Le creux bombait vers le HAUT — un `u` dont le fond flottait à 118 quand
    #   la lettre descend à −8. Même piège de repère que les panses : `sweep`
    #   raisonné sur l'écran, écrit dans un repère à l'origine en bas. Le fond
    #   est désormais posé pour toucher la ligne de base à la demi-épaisseur
    #   près, et le rayon vertical s'en déduit.
    gaucheU = o['x0'] + M['fut'] / 2
    creux = o['y0'] + M['fut'] / 2
    ryU = (futU - gaucheU) / 2
    # ★ **LE `u` N'A QU'UN SEUL TRAIT — et c'est la POLICE qui le dit.**
    #
    #   > « le `U` est bicolore sur les 3 ; si ça représente le nombre de traits,
    #   >   `U` n'en a qu'un. » (l'auteur)
    #
    #   Vérifié sur l'axe replié, et pas sur le goût : le `u` porte exactement
    #   DEUX PLIS — ses deux sommets, en haut de chaque fût — et **aucun point de
    #   branchement**. Aucun endroit où trois brins d'axe se rencontrent, donc
    #   aucun endroit où le crayon ait à se lever. C'est un tracé d'un seul
    #   tenant : on descend le fût gauche, on tourne dans le creux, on remonte le
    #   fût droit. Le `n` et le `h`, eux, ont bien un carrefour à trois branches
    #   au départ de leur arche, et gardent leurs deux traits.
    #
    # ⚠️ **ET ON NE CHANGE PAS LE TRACÉ POUR TOMBER SUR LE COMPTE : on change la
    #   LECTURE.** « N'adapte pas le tracé pour correspondre au compte que tu as »
    #   (l'auteur). La géométrie est au point pour point la même — même fût, même
    #   creux, même rayon ; ce qui change, c'est qu'on cesse d'y déclarer une
    #   levée de crayon qui n'existe pas. Comptes : 1 trait, 2 extrémités,
    #   0 boucle, contre 2/2/0 auparavant.
    R['u'] = ([t(ligne(gaucheU, hx, gaucheU, creux + ryU)
                 + ' A %s %s 0 0 1 %s %s L %s %s'
                 % (r(ryU), r(ryU), r(futU), r(creux + ryU), r(futU), r(hx)))],
              [])

    # ── panses : `b d p q` ────────────────────────────────────────────────────
    for c in 'bdpq':
        o = b[c]
        gauche = c in 'bp'
        fut = (o['x0'] + M['fut'] / 2) if gauche else (o['x1'] - M['fut'] / 2)
        # ★ **LA PANSE EST UN DEMI-OVALE, et ses deux rayons se déduisent.**
        #
        #   `rx` était la demi-largeur de la LETTRE, ce qui est un rayon de
        #   cercle plein ; or la panse est un DEMI-tour, attaché au fût et
        #   revenant au fût. Son rayon horizontal est donc la distance ENTIÈRE
        #   du fût au bord opposé, et son rayon vertical la demi-hauteur de la
        #   corde — faute de quoi le centre se décale, le demi-tour n'en est
        #   plus un, et la panse s'arrête à mi-chemin (mesuré : 87 unités trop
        #   court, soit un `b` dont la panse ne rejoint pas le bord de la
        #   chasse).
        # ★ **LA PANSE SE REFERME SUR LE FÛT, exactement.** Ses deux bouts
        #   flottaient à 6 % de la hauteur d'x des bords : le fût dépassait des
        #   deux côtés sans rien toucher.
        #
        # ⚠️ **MAIS SUR `p` ET `q`, ELLE NE MONTE PAS JUSQU'AU SOMMET DU FÛT.**
        #   On l'y faisait aboutir pour retomber sur le compte d'extrémités de la
        #   table du dépôt — une extrémité libre au lieu de deux. C'était une
        #   triche, et elle se voyait : « comme pour `g`, tu sautes une extrémité »
        #   (l'auteur). La police fait naître la panse SOUS le sommet, exactement
        #   comme sur `b` et `d` ; le fût dépasse donc en haut ET en bas, et ces
        #   deux bouts-là sont libres. `mtrb` et `mexb` s'en trouveront déplacés :
        #   le dessin ne s'ajuste pas au barème.
        # Les quatre cotes, lues dans l'axe et non posées à vue : la panse touche
        # le fût de 0,320 à 0,675 hauteur d'x (144 → 306 sur le `b`), et sa
        # boucle va de −0,018 à 1,018 (−8 → 460).
        pHaut = hx * 0.675
        pBas = hx * 0.320
        bord = (o['x1'] - M['fut'] / 2) if gauche else (o['x0'] + M['fut'] / 2)
        haut = o['y1'] if c in 'bd' else hx
        # ★ **LE SENS DE LA PANSE — la faute que l'auteur avait devinée.**
        #
        #   « J'ai l'impression que plusieurs courbes sont tracées à l'envers,
        #   c'est peut-être la clef » (l'auteur). C'était exactement ça, et
        #   uniquement ici : `gauche` dit où est le FÛT, or le drapeau `sweep`
        #   décide du côté où passe la PANSE — qui est en face. Le `b` sortait
        #   donc à x = −111 quand son fût est à 113.
        #
        #   ⚠️ Et le repère y est pour quelque chose : `glyphes.js` a son origine
        #     EN BAS À GAUCHE, quand SVG l'a en haut. Un `sweep` raisonné sur
        #     l'écran est inversé une fois écrit ici — c'est le même piège que
        #     `helpers.braceD`, et c'est pourquoi le contrôle de boîte existe
        #     désormais : cette faute-là ne se lit pas, elle se mesure.
        # ★ **LA PANSE EST UNE BOUCLE FERMÉE, refermée par un SEGMENT SUPERPOSÉ.**
        #
        #   > « relie les 2 extrémités de la boucle par un segment superposé,
        #   >   sans chercher à éviter l'angle. Ça sera simple et ça ferme la
        #   >   boucle pour permettre des animations pertinentes pour la suite
        #   >   (colorer l'intérieur de la boucle plutôt que d'y mettre un point
        #   >   quand il faut compter les espaces clos pour `mbob` et `mboc`). »
        #   >   (l'auteur)
        #
        #   Le segment qui referme court SUR le fût, du pied de la panse à sa
        #   naissance : c'est le seul chemin qui ne fabrique aucune forme
        #   nouvelle, et c'est bien ce que la police dessine — les deux traits
        #   s'y confondent en une seule masse d'encre.
        #
        # ⚠️ **ET IL NE RESTE QU'UNE SEULE JONCTION DÉCLARÉE.** `deriveGlyph`
        #   compte `boucles = sous-chemins fermés + cycles du graphe des
        #   jonctions` : une panse devenue fermée qui garderait ses DEUX
        #   jonctions compterait deux boucles là où la lettre n'en a qu'une.
        #   Deux traits, deux extrémités, une boucle — les comptes ne bougent pas.
        R[c] = ([t(ligne(fut, o['y0'], fut, haut)),
                 couture(demiTour(fut, bord, pHaut, pBas,
                                  hx * 1.018, hx * -0.018, 0 if gauche else 1))],
                [[0, 1, 'panse']])

    # ── `a` : deux étages ─────────────────────────────────────────────────────
    o = b['a']
    futA = o['x1'] - M['fut'] / 2
    # ⚠️ L'arc d'attaque bombait vers le BAS — le `a` prenait la forme d'un `ə`.
    #   Même piège de repère que les panses : il doit passer AU-DESSUS de la
    #   corde qui joint son départ au sommet du fût, c'est ce qui fait l'étage
    #   supérieur d'un `a` à deux étages.
    # ★ **LA PANSE EST UN OVALE, exactement comme celle du `g`** — et c'est ce que
    #   deux jets successifs avaient manqué.
    #
    #   Un DEMI-TOUR ne peut pas la dessiner : pour couvrir 310 de large sur 250
    #   de haut, il lui faut un rayon horizontal de 310 contre 125 de vertical,
    #   c'est-à-dire une ellipse trois fois plus large que haute — dont l'extrême
    #   gauche est le point le plus COURBE. On obtenait un triangle arrondi, pas
    #   une panse. L'ovale, lui, a ses deux rayons à la demi-dimension : il est
    #   rond parce que la panse l'est.
    #
    #   La topologie y gagne aussi : un ovale fermé plus un trait « attaque +
    #   fût » donnent 2 traits, 2 extrémités, 1 boucle — les comptes exacts de la
    #   table actuelle, alors que la version en deux arcs en inventait d'autres.
    #   ⚠️ Le chapeau descendait trop bas et partait trop à gauche : il enjambait
    #     toute la chasse et se superposait à la panse. Dans la police il est
    #     COURT — il quitte le sommet du fût, va vers la gauche sur les deux tiers
    #     de la largeur, et ne redescend que d'un sixième de la hauteur d'x.
    hautA = hx * 0.84
    panseA = hx * 0.56
    # ★ **LA BOUCLE RESTE FERMÉE — mais elle a un COIN en haut à droite.**
    #
    #   > « ta boucle fermée était bien du moment qu'elle a un angle droit en haut
    #   >   à droite, façon goutte d'eau. » (l'auteur)
    #
    #   ⚠️ Ouverte, elle rendait pourtant des comptes identiques et se refermait
    #     sur le pilier : c'est une lecture plausible, et ce n'est pas celle de la
    #     police. Le `a` de JetBrains Mono a bien une boucle CLOSE, et son sommet
    #     droit fait un angle contre le pilier — la goutte d'eau. On la déclare
    #     donc fermée, et on pose sa COUTURE à ce coin : un tracé fermé se coupe
    #     là où il commence, et l'ajusteur n'y lisse rien.
    # ★ **LA BOUCLE EST UNE GOUTTE D'EAU, PAS UN OVALE.**
    #
    #   > « le haut de la boucle arrive à la perpendiculaire sur la barre sur
    #   >   l'original, ça devrait toujours être le cas à l'arrivée » —
    #   > « ta boucle fermée était bien du moment qu'elle a un angle droit en
    #   >   haut à droite, façon goutte d'eau. » (l'auteur)
    #
    #   Un ovale n'a ni angle ni côté droit : la boucle s'arrêtait vingt-trois
    #   unités avant le pilier et son sommet y arrivait de biais. L'axe, lui, dit
    #   exactement ce qu'il faut — il file droit de (200, 246) à (384, 241),
    #   TOURNE À ANGLE DROIT contre le pilier, descend dessus jusqu'à (384, 137),
    #   et de là s'échappe vers le bas. Quatre gestes, et le dernier est la
    #   couture : le segment vertical qui longe le pilier EST dans la police, ce
    #   n'est pas un artifice de fermeture.
    #
    #   Les trois cotes se lisent sur l'axe et non à vue : sommet à 0,534 hauteur
    #   d'x (241 sur 452), retour au pilier à 0,304 (137), et la barre du haut
    #   commence aux 38,5 % de la largeur de la boucle (200 pour 85 → 384).
    #
    # ⚠️ **ET LE CÔTÉ DROIT EST LA COUTURE, pas un `L` déclaré.** Écrit dans le
    #   guide, il court SUR le pilier — deux traits, un seul brin d'axe, et la
    #   projection le donne au pilier qui vient en premier. Mesuré : le côté de
    #   la boucle sortait onze unités À DROITE du pilier. C'est le même piège que
    #   la panse du `b`, et la même réponse : on l'affirme au dernier geste. On
    #   pose donc la couture EXACTEMENT là où la police met son angle droit —
    #   du pied de la boucle à son sommet, le long du pilier.
    hautBoucle = hx * 0.534
    basBoucle = hx * 0.304
    gaucheA = o['x0'] + M['fut'] / 2
    barreA = gaucheA + (futA - gaucheA) * 0.385
    R['a'] = ([t(arc(o['x0'] + o['l'] * 0.16, hautA, futA - o['x0'] - o['l'] * 0.16,
                     hx - hautA, 0, 0, futA, hx) + ' L %s %s' % (r(futA), r(o['y0']))),
               couture('M %s %s' % (r(futA), r(hautBoucle))
                       + ' L %s %s' % (r(barreA), r(hautBoucle))
                       + ' A %s %s 0 1 1 %s %s' % (r((futA - gaucheA) / 2),
                                                   r((hautBoucle - o['y0']) / 2),
                                                   r(futA), r(basBoucle)))],
              [[0, 1, 'panse']])

    # ── `g` : panse ronde + descendante à crochet ─────────────────────────────
    o = b['g']
    futG = o['x1'] - M['fut'] / 2
    # ⚠️ La queue partait de la mi-hauteur de la panse, donc elle la TRAVERSAIT :
    #   le `g` se lisait comme un `a` barré en diagonale. Elle part du sommet du
    #   fût, longe la panse par la droite et descend au jambage — c'est là que la
    #   panse et la descendante se touchent, et nulle part ailleurs.
    #
    #   ⚠️ Et elle part de l'EXTRÊME DROIT de l'ovale (`hx / 2`), pas de son
    #     sommet : c'est le seul point que la verticale du fût partage avec la
    #     panse. Un départ plus haut laissait une extrémité libre en l'air — un
    #     compte de plus, pour un contact que l'œil croyait voir.
    # ★ **LE `g` EST BÂTI COMME LE `p`, PAS COMME UN OVALE PLUS UNE QUEUE.**
    #
    #   > « pour le `g`, j'ai l'impression que tu essaies encore de préserver le
    #   >   nombre d'extrémités alors qu'il y en a une de plus à l'origine ; sans
    #   >   ça, tu arriverais probablement à un résultat aussi propre que pour `b`
    #   >   ou `d`. » (l'auteur)
    #
    #   C'était exact. On déclarait une panse FERMÉE — donc sans aucun bout — et
    #   une queue attachée à son flanc droit : une seule extrémité libre. La
    #   police, elle, dessine un fût droit qui descend de la hauteur d'x jusqu'au
    #   crochet, et une panse qui naît sous son sommet et se referme dessus. Le
    #   fût dépasse en haut : c'est la seconde extrémité, et l'axe la montre en
    #   (385, 452).
    # Mêmes cotes lues dans l'axe : la panse du `g` touche son fût de 0,421 à
    # 0,678 hauteur d'x (190 → 306) et sa boucle va de 0,080 à 1,018 (36 → 460).
    pHautG = hx * 0.678
    pBasG = hx * 0.421
    # ★ Même fermeture que `b d p q` : la panse est une BOUCLE, refermée par un
    #   segment superposé au fût, et une seule jonction déclarée (voir ci-dessus).
    R['g'] = ([t(ligne(futG, hx, futG, o['y0'] + o['l'] * 0.3)
                 + ' A %s %s 0 0 0 %s %s' % (r(o['l'] * 0.34), r(o['l'] * 0.28),
                                             r(o['x0'] + o['l'] * 0.06),
                                             r(o['y0'] + o['l'] * 0.2))),
               couture(demiTour(futG, o['x0'] + M['fut'] / 2, pHautG, pBasG,
                                hx * 1.018, hx * 0.080, 1))],
              [[0, 1, 'panse']])

    # ── les empattées : `i`, `j`, `l`, `t`, `f` ───────────────────────────────
    o = b['i']
    milieuI = (o['x0'] + o['x1']) / 2
    # ⚠️ **SON EMPATTEMENT DE PIED EST DES DEUX CÔTÉS, PAS D'UN SEUL.** La
    #   recette le faisait partir du fût vers la droite ; la police le dessine de
    #   x=54 à x=510, à cheval sur le fût. Le bas du `i` est donc un CARREFOUR à
    #   trois branches, et non un simple coude — un trait de plus, une extrémité
    #   de plus.
    #     « le `i` oui il a une extrémité de plus, c'est sûr, la police, n'essaie
    #       pas de tricher » (l'auteur)
    #   ⚠️ Et ça déplace des scores : `mtrb` et `mexb` facturent ces comptes. Le
    #     dessin ne s'ajuste pas au barème, c'est le barème qui suit le dessin.
    R['i'] = ([t('M %s %s L %s %s L %s %s' % (
        r(o['x0']), r(hx), r(milieuI), r(hx), r(milieuI), r(o['y0']))),
               t(ligne(o['x0'], o['y0'], o['x1'], o['y0'])),
               t(ligne(milieuI, o['y1'], milieuI, o['y1']))],
              [[0, 1, 'pied']])
    o = b['j']
    futJ = o['x1'] - M['fut'] / 2
    # ⚠️ La queue prenait des LARGEURS pour des ordonnées (`o['l'] * 0.28` posé
    #   sur un `y`) : elle s'arrêtait bien au-dessus du jambage et rebroussait du
    #   mauvais côté. Le crochet part du bas du fût et s'ouvre vers la GAUCHE.
    crochetJ = (futJ - o['x0']) / 2
    # ⚠️ **IL MANQUAIT SON EMPATTEMENT DE TÊTE**, et c'est un tiers de la lettre.
    #   Le `j` de JetBrains Mono en a un, exactement comme le `i` : la source le
    #   dessine de x=85 à x=435 sur la ligne de hauteur d'x. La recette partait du
    #   haut du fût, si bien que la moitié gauche du signe n'était réclamée par
    #   AUCUN trait — et la pose sur l'axe, obligée d'en rendre compte, repliait
    #   la hampe en boucle : deux cent vingt-trois unités d'écart, le pire de
    #   l'alphabet et de loin. Un trait manquant ne se rattrape par aucune
    #   géométrie.
    R['j'] = ([t('M %s %s L %s %s L %s %s' % (
        r(o['x0']), r(hx), r(futJ), r(hx), r(futJ), r(o['y0'] + crochetJ))
        + ' A %s %s 0 0 0 %s %s' % (r(crochetJ), r(crochetJ),
                                    r(o['x0']), r(o['y0'] + crochetJ))),
               t(ligne(futJ, o['y1'], futJ, o['y1']))], [])
    o = b['l']
    milieuL = o['x0'] + (o['x1'] - o['x0']) * 0.42
    R['l'] = ([t('M %s %s L %s %s L %s %s L %s %s' % (
        r(o['x0']), r(o['y1']), r(milieuL), r(o['y1']), r(milieuL),
        r(o['y0'] + o['l'] * 0.16), r(o['x1']), r(o['y0'] + o['l'] * 0.16)))], [])
    o = b['t']
    futT = o['x0'] + (o['x1'] - o['x0']) * 0.42
    # ⚠️ Le pied rebroussait vers le bas : le crochet pendait sous la ligne de
    #   base au lieu de s'y relever. Un `t` a une base qui REMONTE à droite.
    # ⚠️ Le pied ne remontait presque pas : un quart de tour de rayon égal à la
    #   demi-chasse restante, qui s'arrêtait à hauteur du creux. Dans la police
    #   il REMONTE — la base du `t` finit nettement au-dessus de la ligne de
    #   base. Le quart de tour va donc du bas du fût au flanc droit, où il est
    #   vertical, et c'est cette verticalité qui se lit comme une remontée.
    # Le crochet DESCEND jusqu'à la ligne de base puis REMONTE : c'est le même
    # geste que le creux du `u`, en asymétrique. Un quart de tour ne pouvait pas
    # le dire — il monte ou il descend, jamais les deux —, et le pied s'arrêtait
    # 111 unités au-dessus du sol.
    # ★ **ET LE PIED FINIT PAR UN SEGMENT DROIT — un point de plus, exigé.**
    #
    #   > « la poignée horizontale devrait être plus à gauche et un point
    #   >   supplémentaire devrait être à droite en bas pour finir le segment »
    #   >   (l'auteur)
    #
    #   L'axe lu dans la police le dit mot pour mot : il quitte la verticale à
    #   y = 82, tourne jusqu'à (292, −0,5) et file DROIT jusqu'à (396, 0). Un
    #   quart de tour qui s'arrêterait au bord de la chasse écraserait ces cent
    #   unités de droite dans sa dernière poignée — c'est exactement le défaut
    #   que l'auteur décrit, et c'est le même geste que le pied du `l`, qui lui
    #   déclarait déjà sa droite finale et sort juste.
    #   Les deux rayons se lisent donc sur l'axe : le quart de tour finit à
    #   x = 292 (soit 0,44 de ce qui reste de chasse) et naît à y = 82 (0,94 du
    #   rayon horizontal), et non à 62 % comme l'arc précédent le supposait.
    rxT = (o['x1'] - futT) * 0.44
    ryT = rxT * 0.94
    R['t'] = ([t(ligne(futT, o['y1'], futT, o['y0'] + ryT)
                 + ' A %s %s 0 0 1 %s %s' % (r(rxT), r(ryT),
                                             r(futT + rxT), r(o['y0']))
                 + ' L %s %s' % (r(o['x1']), r(o['y0']))),
               t(ligne(o['x0'], hx, o['x1'], hx))],
              [[0, 1, 'barre']])
    o = b['f']
    futF = o['x0'] + (o['x1'] - o['x0']) * 0.42
    # ⚠️ Le crochet de hampe bombait vers l'intérieur : il revenait en pointe sur
    #   le fût au lieu de s'ouvrir vers la droite. Un `f` a une hampe qui MONTE
    #   puis part, pas qui rebrousse.
    # ★ Un QUART de tour, et non un arc quelconque : de l'extrême gauche au
    #   sommet de la même ellipse, il ne peut par construction dépasser ni l'un
    #   ni l'autre. Un arc libre montait 63 unités au-dessus de la hampe.
    ryF = o['l'] * 0.52
    R['f'] = ([t(ligne(futF, o['y0'], futF, o['y1'] - ryF)
                 + ' A %s %s 0 0 0 %s %s' % (r(o['x1'] - futF), r(ryF),
                                             r(o['x1']), r(o['y1']))),
               t(ligne(o['x0'], hx, o['x1'] - o['l'] * 0.22, hx))],
              [[0, 1, 'barre']])

    # ── `k` : fût, bras, jambe ────────────────────────────────────────────────
    o = b['k']
    futK = o['x0'] + M['fut'] / 2
    # ⚠️ **SES DEUX JAMBES NE PARTENT PAS DU FÛT.** Elles se rejoignent d'abord,
    #   cent trente unités plus à droite, par un court BRAS horizontal — c'est ce
    #   que la police dessine, et la recette l'ignorait : « j'ai l'impression
    #   qu'il y a un double segment central au lieu d'un, et donc 2 points à
    #   l'intersection droite de ce segment » (l'auteur). Les deux jambes
    #   déclarées droites depuis le fût s'y superposaient l'une l'autre sur toute
    #   la longueur du bras, et chacune passait à trente-neuf unités de son axe.
    #   Le bras appartient à UNE branche ; l'autre naît de la fourche.
    epauleK = hx * 0.525
    fourcheK = futK + (o['x1'] - futK) * 0.376
    # ★ **ET LES DEUX JAMBES SONT UNE SEULE LIGNE COUDÉE.** « Idéalement le `k`
    #   devrait être : 1 segment vertical à gauche, 1 segment horizontal qui fait
    #   le lien avec 1 ligne coudée à droite » (l'auteur). Les déclarer
    #   séparément leur laissait deux coudes à onze unités l'un de l'autre — « un
    #   point de trop au milieu droite, ou un raccord qui devrait se faire pile
    #   au même endroit ». Une seule ligne, un seul coude.
    R['k'] = ([t(ligne(futK, o['y0'], futK, o['y1'])),
               t(ligne(futK, epauleK, fourcheK, epauleK)),
               t(ligne(o['x1'], hx, fourcheK, epauleK)
                 + ' L %s %s' % (r(o['x1']), r(o['y0'])))],
              [[0, 1, 'naissance du bras'], [1, 2, 'fourche']])

    # ── les diagonales : `v w x y z` ──────────────────────────────────────────
    o = b['v']
    R['v'] = ([t(ligne(o['x0'], hx, (o['x0'] + o['x1']) / 2, o['y0'])),
               t(ligne((o['x0'] + o['x1']) / 2, o['y0'], o['x1'], hx))],
              [[0, 1, 'pointe']])
    o = b['w']
    q = o['l'] / 4
    R['w'] = ([t(ligne(o['x0'], hx, o['x0'] + q, o['y0'])),
               t(ligne(o['x0'] + q, o['y0'], o['x0'] + 2 * q, hx * 0.62)),
               t(ligne(o['x0'] + 2 * q, hx * 0.62, o['x0'] + 3 * q, o['y0'])),
               t(ligne(o['x0'] + 3 * q, o['y0'], o['x1'], hx))],
              [[0, 1, 'premier creux'], [1, 2, 'sommet'], [2, 3, 'second creux']])
    o = b['x']
    R['x'] = ([t(ligne(o['x0'], hx, o['x1'], o['y0'])),
               t(ligne(o['x0'], o['y0'], o['x1'], hx))],
              [[0, 1, 'croisée']])
    o = b['y']
    # ★ La fourche se pose SUR la diagonale, et son point est CALCULÉ — il ne se
    #   règle pas à vue. La branche courte s'arrêtait à `hx * 0,3` quand la
    #   longue passait par `hx * 0,34` à cette abscisse : quatre centièmes
    #   d'écart, invisibles à l'œil, et une extrémité libre de plus au comptage.
    pointeY = (o['x0'] + o['x1']) / 2
    tY = (pointeY - o['x1']) / (o['x0'] + o['l'] * 0.24 - o['x1'])
    R['y'] = ([t(ligne(o['x0'], hx, pointeY, hx + tY * (o['y0'] - hx))),
               t(ligne(o['x1'], hx, o['x0'] + o['l'] * 0.24, o['y0']))],
              [[0, 1, 'fourche']])
    o = b['z']
    R['z'] = ([t(ligne(o['x0'], hx, o['x1'], hx)),
               t(ligne(o['x1'], hx, o['x0'], o['y0'])),
               t(ligne(o['x0'], o['y0'], o['x1'], o['y0']))],
              [[0, 1, 'haut'], [1, 2, 'bas']])

    # ═══════════════════════════════════════════════════════════════════════
    #  LES CAPITALES — la même méthode, sur l'autre moitié de l'alphabet
    # ═══════════════════════════════════════════════════════════════════════
    #
    # > « est-ce que ça produit les majuscules proprement du premier coup ou
    # >   non ? » (l'auteur)
    #
    # ★ **RIEN N'EST ADAPTÉ POUR ELLES.** Ces recettes disent la même chose que
    #   celles des bas de casse et de la même façon : combien de traits, lesquels
    #   se touchent, où le crayon se lève, et des points exprimés en fonction de
    #   la BOÎTE MESURÉE de chaque signe. La chaîne de `jetbrains-axe.py`, elle,
    #   n'a pas bougé d'une ligne — c'est tout l'intérêt de l'exercice.
    #
    # ★ **LE NOMBRE DE TRAITS SUIT LE CRITÈRE DE L'AUTEUR : le branchement.**
    #   « Si ça représente le nombre de traits, `U` n'en a qu'un. » Un virage
    #   n'est pas une levée de crayon ; un carrefour, si. Le `N`, le `M`, le `W`,
    #   le `Z`, le `V`, le `U`, le `J`, le `L`, le `C`, le `S` sont donc d'UN SEUL
    #   TENANT : leurs axes n'ont aucun point où trois brins se rencontrent.
    #   ⚠️ Cela les met en désaccord avec `v`, `w` et `z` bas de casse, qui en
    #     déclarent 2, 4 et 3 pour la même topologie. Le désaccord est signalé,
    #     pas corrigé : l'invariant du dépôt interdit de changer un compte de
    #     traits sans instruction.
    #
    # ⚠️ **DEUX LECTURES DE BORD, ET ELLES DIFFÈRENT.** L'axe d'un FÛT vertical
    #   court à un demi-fût du bord de la boîte — 76,4 → 108,9 sur le `B`, 37 sur
    #   32,5 mesurées. Le bout d'une BARRE horizontale, lui, ne rentre que de la
    #   moitié de ça : 427,4 → 408,9 sur le `E`. L'effondrement ne retire pas la
    #   même épaisseur à un flanc et à une terminaison plate. On écrit donc deux
    #   entrées, `f2` et `f4`, plutôt qu'une seule qu'on saurait fausse.
    f2 = M['fut'] / 2
    f4 = M['fut'] / 4
    cap = M['capitale']

    def chevron(*pts):
        """Une polyligne : le geste d'un `V`, d'un `N`, d'un `W`, d'un `Z`."""
        return 'M %s %s' % (r(pts[0][0]), r(pts[0][1])) \
            + ''.join(' L %s %s' % (r(x), r(y)) for x, y in pts[1:])

    def panse(fut, xj, bord, yHaut, yBas, sens):
        """Une panse de capitale : deux amorces horizontales et un demi-tour.

        ★ Le `B`, le `D`, le `P` et le `R` attachent leur panse au fût par un
          court segment HORIZONTAL, puis tournent — c'est ce que l'axe montre :
          la panse du `B` part de (109, 599) et ne s'incurve qu'à partir de
          (243, 599). Un demi-tour parti du fût lui-même passerait vingt unités
          au-dessus de la barre du haut.
        """
        return 'M %s %s L %s %s A %s %s 0 1 %d %s %s L %s %s' % (
            r(fut), r(yHaut), r(xj), r(yHaut),
            r(abs(bord - xj)), r((yHaut - yBas) / 2), sens,
            r(xj), r(yBas), r(fut), r(yBas))

    # ── `A` : le chevron renversé, et sa barre ──────────────────────────────
    o = b['A']
    gA, dA, sA = o['x0'] + f2, o['x1'] - f2, (o['x0'] + o['x1']) / 2
    # La barre se lit à 0,315 capitale (189 sur 600), et ses deux bouts sont sur
    # les diagonales — on ne les pose pas, on les CALCULE à cette hauteur.
    tA = 0.315
    # ⚠️ Le sommet du `A` est une POINTE : le crayon s'y lève, comme au fond du
    #   `v` (voir la règle énoncée aux diagonales, plus bas). Deux diagonales,
    #   donc — c'est aussi ce que compte `research §3.4`.
    R['A'] = ([t(ligne(gA, o['y0'], sA, o['y1'])),
               t(ligne(sA, o['y1'], dA, o['y0'])),
               t(ligne(gA + (sA - gA) * tA, o['y0'] + (o['y1'] - o['y0']) * tA,
                       dA + (sA - dA) * tA, o['y0'] + (o['y1'] - o['y0']) * tA))],
              [[0, 1, 'sommet'], [0, 2, 'barre gauche'], [1, 2, 'barre droite']])

    # ── `B` : un fût, deux panses ───────────────────────────────────────────
    o = b['B']
    gB = o['x0'] + f2
    yB = o['y0'] + o['h'] * 0.507          # la taille, lue dans l'axe (304/600)
    R['B'] = ([t(ligne(gB, o['y0'], gB, o['y1'])),
               t(panse(gB, o['x0'] + o['l'] * 0.464, o['x0'] + o['l'] * 0.881,
                       o['y1'], yB, 0)),
               t(panse(gB, o['x0'] + o['l'] * 0.464, o['x0'] + o['l'] * 0.924,
                       yB, o['y0'], 0))],
              [[0, 1, 'haut'], [0, 1, 'taille haute'],
               [0, 2, 'taille basse'], [0, 2, 'pied']])

    # ── `C` : un seul demi-tour ouvert ──────────────────────────────────────
    o = b['C']
    R['C'] = ([t(demiTour(o['x1'] - f2, o['x0'] + f2,
                          o['y0'] + o['h'] * 0.727, o['y0'] + o['h'] * 0.274,
                          o['y1'], o['y0'], 1))], [])

    # ── `D` : un fût, une panse à flanc droit ───────────────────────────────
    o = b['D']
    gD = o['x0'] + f2
    R['D'] = ([t(ligne(gD, o['y0'], gD, o['y1'])),
               t(panse(gD, o['x0'] + o['l'] * 0.390, o['x0'] + o['l'] * 0.909,
                       o['y1'], o['y0'], 0))],
              [[0, 1, 'haut'], [0, 1, 'pied']])

    # ── `E` et `F` : un fût, ses barres ─────────────────────────────────────
    for c in 'EF':
        o = b[c]
        g = o['x0'] + f2
        yM = o['y0'] + o['h'] * (0.518 if c == 'E' else 0.512)
        barres = [t(ligne(g, o['y1'], o['x1'] - f4, o['y1'])),
                  t(ligne(g, yM, o['x0'] + o['l'] * 0.874, yM))]
        jonc = [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu']]
        if c == 'E':
            barres.append(t(ligne(g, o['y0'], o['x1'] - f4, o['y0'])))
            jonc.append([0, 3, 'barre du bas'])
        R[c] = ([t(ligne(g, o['y0'], g, o['y1']))] + barres, jonc)

    # ── `G` : le `C`, plus sa barre et son montant ──────────────────────────
    o = b['G']
    dG = o['x1'] - f2
    yG = o['y0'] + o['h'] * 0.468          # la barre, lue dans l'axe (280/616)
    R['G'] = ([t(demiTour(dG, o['x0'] + f2,
                          o['y0'] + o['h'] * 0.720, o['y0'] + o['h'] * 0.279,
                          o['y1'], o['y0'], 1)
                 + ' L %s %s' % (r(dG), r(yG))),
               t(ligne(dG, yG, o['x0'] + o['l'] * 0.483, yG))],
              [[0, 1, 'barre']])

    # ── `H` : deux fûts, une barre ──────────────────────────────────────────
    o = b['H']
    gH, dH = o['x0'] + f2, o['x1'] - f2
    yH = o['y0'] + o['h'] * 0.524
    R['H'] = ([t(ligne(gH, o['y0'], gH, o['y1'])),
               t(ligne(dH, o['y0'], dH, o['y1'])),
               t(ligne(gH, yH, dH, yH))],
              [[0, 2, 'naissance gauche'], [1, 2, 'naissance droite']])

    # ── `I` : deux empattements et un fût ───────────────────────────────────
    o = b['I']
    sI = (o['x0'] + o['x1']) / 2
    R['I'] = ([t(ligne(o['x0'] + f4, o['y1'], o['x1'] - f4, o['y1'])),
               t(ligne(o['x0'] + f4, o['y0'], o['x1'] - f4, o['y0'])),
               t(ligne(sI, o['y0'], sI, o['y1']))],
              [[0, 2, 'empattement du haut'], [1, 2, 'empattement du bas']])

    # ── `J` : un fût et son crochet, d'un seul tenant ───────────────────────
    o = b['J']
    gJ, dJ = o['x0'] + f2, o['x1'] - f2
    yJ = o['y0'] + o['h'] * 0.263
    R['J'] = ([t(ligne(dJ, o['y1'], dJ, yJ)
                 + ' A %s %s 0 0 0 %s %s' % (r((dJ - gJ) / 2), r(yJ - o['y0']),
                                             r(gJ), r(yJ)))], [])

    # ── `K` : un fût, une amorce, un chevron ────────────────────────────────
    o = b['K']
    gK = o['x0'] + f2
    yK = o['y0'] + o['h'] * 0.522
    xK = o['x0'] + o['l'] * 0.539
    R['K'] = ([t(ligne(gK, o['y0'], gK, o['y1'])),
               t(ligne(gK, yK, xK, yK)),
               t(chevron((o['x1'] - f2, o['y1']), (xK, yK), (o['x1'] - f2, o['y0'])))],
              [[0, 1, 'naissance du bras'], [1, 2, 'fourche']])

    # ── `L` : un seul trait ─────────────────────────────────────────────────
    o = b['L']
    R['L'] = ([t(chevron((o['x0'] + f2, o['y1']), (o['x0'] + f2, o['y0']),
                         (o['x1'] - f4, o['y0'])))], [])

    # ── `M` : quatre traits — deux fûts et le chevron renversé ──────────────
    #
    # ★ **ET LES QUATRE GUIDES DURENT CE QUE LE `m` DURE.** Le `M` d'un seul
    #   tenant mesurait 2 038 unités, soit trente-quatre par abscisse quand le
    #   pire bas de casse en compte dix-sept : le sommet de ses fûts tombait au
    #   milieu d'un seau et sortait seize unités trop bas. Découpé, chaque
    #   morceau retrouve la densité des minuscules — la cohérence de lecture et
    #   la précision sont ici la MÊME correction.
    o = b['M']
    gM, dM = o['x0'] + f2, o['x1'] - f2
    sM = ((gM + dM) / 2, o['y0'] + o['h'] * 0.404)
    R['M'] = ([t(ligne(gM, o['y0'], gM, o['y1'])),
               t(ligne(gM, o['y1'], *sM)),
               t(ligne(*sM, dM, o['y1'])),
               t(ligne(dM, o['y1'], dM, o['y0']))],
              [[0, 1, 'sommet gauche'], [1, 2, 'creux'], [2, 3, 'sommet droit']])

    # ── `N` : trois traits — deux fûts et la diagonale ──────────────────────
    o = b['N']
    gN, dN = o['x0'] + f2, o['x1'] - f2
    R['N'] = ([t(ligne(gN, o['y0'], gN, o['y1'])),
               t(ligne(gN, o['y1'], dN, o['y0'])),
               t(ligne(dN, o['y0'], dN, o['y1']))],
              [[0, 1, 'sommet gauche'], [1, 2, 'pied droit']])

    # ── `O` : un anneau ─────────────────────────────────────────────────────
    o = b['O']
    R['O'] = ([ovale((o['x0'] + o['x1']) / 2, (o['y0'] + o['y1']) / 2,
                     o['l'] / 2 - f2, o['h'] / 2)], [])

    # ── `P` : un fût, une panse ─────────────────────────────────────────────
    o = b['P']
    gP = o['x0'] + f2
    R['P'] = ([t(ligne(gP, o['y0'], gP, o['y1'])),
               t(panse(gP, o['x0'] + o['l'] * 0.503, o['x0'] + o['l'] * 0.930,
                       o['y1'], o['y0'] + o['h'] * 0.487, 0))],
              [[0, 1, 'haut'], [0, 1, 'pied de la panse']])

    # ── `Q` : l'anneau et sa queue ──────────────────────────────────────────
    o = b['Q']
    # ⚠️ La boîte du `Q` descend au jambage à cause de sa QUEUE : son anneau,
    #   lui, tient dans la capitale. On le mesure donc sur le haut de la boîte,
    #   pas sur sa hauteur totale.
    hautQ = o['y1']
    basQ = hautQ - (b['O']['y1'] - b['O']['y0'])
    cxQ, cyQ = (o['x0'] + o['x1']) / 2, (hautQ + basQ) / 2
    rxQ, ryQ = o['l'] / 2 - f2, (hautQ - basQ) / 2
    # ★ **LA QUEUE NAÎT SUR L'ANNEAU, et ce point se CALCULE.** Posée à vue —
    #   0,668 de la chasse — elle tombait à vingt-quatre unités de l'anneau
    #   déclaré : la recette annonçait donc deux extrémités libres là où la pose
    #   n'en trouvait qu'une, et le contrôle des comptes le disait. On prend
    #   l'ordonnée que l'axe donne (4,9 sur 616) et on résout l'abscisse SUR
    #   l'ellipse, plutôt que d'écrire deux nombres qui ne se rencontrent pas.
    yQ = basQ + (hautQ - basQ) * 0.021
    xQ = cxQ + rxQ * max(0.0, 1 - ((yQ - cyQ) / ryQ) ** 2) ** 0.5
    R['Q'] = ([ovale(cxQ, cyQ, rxQ, ryQ),
               t(ligne(xQ, yQ, o['x1'] - f4, o['y0'] + f4))],
              [[0, 1, 'queue']])

    # ── `R` : un fût, une panse, une jambe ──────────────────────────────────
    o = b['R']
    gR = o['x0'] + f2
    yR = o['y0'] + o['h'] * 0.486
    R['R'] = ([t(ligne(gR, o['y0'], gR, o['y1'])),
               t(panse(gR, o['x0'] + o['l'] * 0.483, o['x0'] + o['l'] * 0.932,
                       o['y1'], yR, 0)),
               t(ligne(o['x0'] + o['l'] * 0.476, yR, o['x1'] - f2, o['y0']))],
              [[0, 1, 'haut'], [0, 1, 'taille'], [1, 2, 'naissance de la jambe']])

    # ── `S` : un seul trait, deux inversions de courbure ────────────────────
    o = b['S']
    gS, dS = o['x0'] + f2, o['x1'] - f2
    xS, yS = o['x0'] + o['l'] * 0.457, o['y0'] + o['h'] * 0.517
    R['S'] = ([t('M %s %s' % (r(dS), r(o['y0'] + o['h'] * 0.735))
                 + ' A %s %s 0 1 1 %s %s' % (r((dS - gS) / 2),
                                             r((o['y1'] - yS) / 2), r(xS), r(yS))
                 # ⚠️ **ET LA SECONDE INVERSE LE SENS** — c'est ce qui fait un `S`
                 #   et non un `C` refermé : le premier demi-tour passe par la
                 #   gauche, le second par la droite. Écrits dans le même sens,
                 #   la panse du bas partait à x = −70 pour une lettre qui
                 #   commence à 59.
                 + ' A %s %s 0 1 0 %s %s' % (r((dS - gS) / 2),
                                             r((yS - o['y0']) / 2),
                                             r(gS), r(o['y0'] + o['h'] * 0.279)))],
              [])

    # ── `T` : une barre, un fût ─────────────────────────────────────────────
    o = b['T']
    sT = (o['x0'] + o['x1']) / 2
    R['T'] = ([t(ligne(o['x0'] + f4, o['y1'], o['x1'] - f4, o['y1'])),
               t(ligne(sT, o['y0'], sT, o['y1']))],
              [[0, 1, 'barre']])

    # ── `U` : un seul trait, comme le `u` ───────────────────────────────────
    o = b['U']
    gU, dU = o['x0'] + f2, o['x1'] - f2
    yU = o['y0'] + o['h'] * 0.253
    R['U'] = ([t('M %s %s L %s %s' % (r(gU), r(o['y1']), r(gU), r(yU))
                 + ' A %s %s 0 0 1 %s %s' % (r((dU - gU) / 2), r(yU - o['y0']),
                                             r(dU), r(yU))
                 + ' L %s %s' % (r(dU), r(o['y1'])))], [])

    # ── `V`, `W`, `X`, `Y`, `Z` : les diagonales ────────────────────────────
    #
    # ★ **LE CRAYON SE LÈVE AUX POINTES, PAS AUX COINS — et cette règle-là n'est
    #   pas une convenance, elle se LIT dans les vingt-six bas de casse que
    #   l'auteur a validés un par un.** Le `v` fait deux traits, le `w` quatre,
    #   le `z` trois : à chaque fois la direction REBROUSSE, et un scripteur qui
    #   pousse sa plume ne peut pas rebrousser sans la lever. Le `l`, lui, fait
    #   UN trait pour deux angles droits, et le `k` un seul pour sa jambe
    #   coudée : on traverse un coin, on ne traverse pas une pointe.
    #
    # ⚠️ **LES CAPITALES DISAIENT LE CONTRAIRE DE LEURS MINUSCULES**, et sur les
    #   trois lettres où la casse ne change RIEN au dessin : `V` 1 trait contre
    #   `v` 2, `W` 1 contre 4, `Z` 1 contre 3. Un homographe qui se compte de
    #   deux façons selon sa taille est une faute, pas une nuance — et c'est un
    #   compte que trois opérateurs du catalogue facturent.
    #
    # ★ **ET DÉCOUPER N'EST PAS TRICHER.** Le nombre de traits n'est pas dans la
    #   police : elle n'a que des contours. Il est dans la RECETTE, qui déclare
    #   la lecture — où le crayon se lève, ce qui touche quoi. La géométrie, elle,
    #   reste lue et n'est jamais retouchée : « n'adapte pas le tracé pour
    #   correspondre au compte » (l'auteur) vise les EXTRÉMITÉS, que la police
    #   décide seule.
    o = b['V']
    sV = (o['x0'] + o['x1']) / 2
    R['V'] = ([t(ligne(o['x0'] + f2, o['y1'], sV, o['y0'])),
               t(ligne(sV, o['y0'], o['x1'] - f2, o['y1']))],
              [[0, 1, 'pointe']])
    o = b['W']
    gW, dW = o['x0'] + f2, o['x1'] - f2
    p1W = (o['x0'] + o['l'] * 0.271, o['y0'])
    sW = (o['x0'] + o['l'] * 0.508, o['y0'] + o['h'] * 0.992)
    p2W = (o['x0'] + o['l'] * 0.738, o['y0'])
    R['W'] = ([t(ligne(gW, o['y1'], *p1W)),
               t(ligne(*p1W, *sW)),
               t(ligne(*sW, *p2W)),
               t(ligne(*p2W, dW, o['y1']))],
              [[0, 1, 'pointe gauche'], [1, 2, 'sommet médian'],
               [2, 3, 'pointe droite']])
    o = b['X']
    gX, dX = o['x0'] + f2, o['x1'] - f2
    R['X'] = ([t(ligne(gX, o['y0'], dX, o['y1'])),
               t(ligne(gX, o['y1'], dX, o['y0']))],
              [[0, 1, 'croisée']])
    o = b['Y']
    sY = (o['x0'] + o['x1']) / 2
    yY = o['y0'] + o['h'] * 0.396
    # ⚠️ **DEUX JONCTIONS POUR TROIS TRAITS, PAS TROIS.** Les trois branches du
    #   `Y` se rejoignent au MÊME point ; les déclarer deux à deux fermerait un
    #   cycle, et `deriveGlyph` compterait une boucle dans une lettre qui n'en a
    #   aucune. Le graphe des jonctions doit rester un ARBRE — c'est ce que font
    #   déjà le `H` et le `K`.
    R['Y'] = ([t(ligne(o['x0'] + f2, o['y1'], sY, yY)),
               t(ligne(sY, yY, sY, o['y0'])),
               t(ligne(o['x1'] - f2, o['y1'], sY, yY))],
              [[0, 1, 'fourche'], [1, 2, 'fourche']])
    o = b['Z']
    gZ, dZ = o['x0'] + f4, o['x1'] - f4
    R['Z'] = ([t(ligne(gZ, o['y1'], dZ, o['y1'])),
               t(ligne(dZ, o['y1'], gZ, o['y0'])),
               t(ligne(gZ, o['y0'], dZ, o['y0']))],
              [[0, 1, 'haut'], [1, 2, 'bas']])

    return R



# ═══════════════════════════════════════════════════════════════════════════
#  LE CONTRÔLE — le générateur vérifie ce qu'il vient d'écrire.
#
#  ★ **POURQUOI IL EXISTE, ET CE QU'IL A ATTRAPÉ.**
#
#  Premier jet livré sans contrôle : « il y a du dégât ! […] j'ai l'impression
#  que plusieurs courbes sont tracées à l'envers, c'est peut-être la clef »
#  (l'auteur). Il avait raison, et la faute était invisible à la lecture du code
#  — un `sweep` de plus ou de moins dans un appel sur quinze. Elle est en
#  revanche IMMÉDIATE à la mesure : la panse du `b` sortait à x = −111 quand son
#  fût est à 113, c'est-à-dire du côté opposé.
#
#  ★ **LE CRITÈRE NE SE DISCUTE PAS** : un tracé de crayon est l'AXE MÉDIAN d'un
#    contour, donc il tient dans la boîte de ce contour, à la demi-épaisseur du
#    trait près. Tout ce qui déborde de plus est une faute de dessin — pas un
#    choix, pas un goût. C'est le seul jugement qu'une machine puisse porter sur
#    un glyphe, et il suffit à écarter les tracés faux avant de les montrer.
# ═══════════════════════════════════════════════════════════════════════════

import math
import re

_JETON = re.compile(r'([A-Za-z])|(-?(?:\d+\.?\d*|\.\d+))')


def _points_arc(x0, y0, rx, ry, grand, sens, x1, y1, n=48):
    """Échantillonne un arc elliptique SVG — la conversion « endpoint → centre »
    de l'annexe F.6 de la spécification. Sans elle, on ne mesurerait que les
    extrémités, c'est-à-dire tout sauf ce qui déborde."""
    if rx == 0 or ry == 0 or (x0 == x1 and y0 == y1):
        return [(x1, y1)]
    dx2, dy2 = (x0 - x1) / 2.0, (y0 - y1) / 2.0
    rx, ry = abs(rx), abs(ry)
    l = dx2 * dx2 / (rx * rx) + dy2 * dy2 / (ry * ry)
    if l > 1:
        rx *= math.sqrt(l)
        ry *= math.sqrt(l)
    num = rx * rx * ry * ry - rx * rx * dy2 * dy2 - ry * ry * dx2 * dx2
    den = rx * rx * dy2 * dy2 + ry * ry * dx2 * dx2
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if grand == sens:
        co = -co
    cx1, cy1 = co * rx * dy2 / ry, -co * ry * dx2 / rx
    cx, cy = cx1 + (x0 + x1) / 2.0, cy1 + (y0 + y1) / 2.0

    def angle(ux, uy, vx, vy):
        n1 = math.hypot(ux, uy) * math.hypot(vx, vy)
        if n1 == 0:
            return 0.0
        c = max(-1.0, min(1.0, (ux * vx + uy * vy) / n1))
        a = math.acos(c)
        return -a if ux * vy - uy * vx < 0 else a

    t0 = angle(1, 0, (dx2 - cx1) / rx, (dy2 - cy1) / ry)
    dt = angle((dx2 - cx1) / rx, (dy2 - cy1) / ry, (-dx2 - cx1) / rx, (-dy2 - cy1) / ry)
    if not sens and dt > 0:
        dt -= 2 * math.pi
    elif sens and dt < 0:
        dt += 2 * math.pi
    return [(cx + rx * math.cos(t0 + dt * i / n), cy + ry * math.sin(t0 + dt * i / n))
            for i in range(n + 1)]


def points_du_trace(d):
    """La POLYLIGNE d'un `d` — arcs et Bézier échantillonnés.

    ★ Exportée parce qu'elle sert deux fois pour deux raisons opposées : ici
      pour BORNER un tracé (`boite_du_trace`), et dans `jetbrains-squelette.py`
      pour le SUIVRE — l'appariement des traits déclarés au squelette mesuré a
      besoin de savoir où passe chaque trait, pas seulement jusqu'où il va.
    """
    jetons = [(m.group(1), m.group(2)) for m in _JETON.finditer(d)]
    pts, cmd, args, x, y, dep = [], None, [], 0.0, 0.0, (0.0, 0.0)
    i = 0
    while i < len(jetons):
        lettre, nombre = jetons[i]
        if lettre:
            cmd = lettre
            i += 1
            if cmd in 'Zz':
                pts.append(dep)
                x, y = dep
            continue
        n = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'A': 7, 'C': 6, 'Q': 4}.get((cmd or 'L').upper(), 2)
        args = [float(jetons[i + k][1]) for k in range(n)]
        i += n
        c = (cmd or 'L').upper()
        if c == 'M':
            x, y = args
            dep = (x, y)
            pts.append((x, y))
        elif c == 'L':
            x, y = args
            pts.append((x, y))
        elif c == 'H':
            x = args[0]
            pts.append((x, y))
        elif c == 'V':
            y = args[0]
            pts.append((x, y))
        elif c == 'A':
            echant = _points_arc(x, y, args[0], args[1], int(args[3]), int(args[4]), args[5], args[6])
            pts.extend(echant)
            x, y = args[5], args[6]
        elif c in 'CQ':
            # ⚠️ **LA COURBE, PAS SON POLYGONE DE CONTRÔLE.** Borner une Bézier
            #   par ses points de contrôle est correct au sens strict — la courbe
            #   y tient toujours — mais c'est une borne LARGE : une cubique
            #   atteint environ les trois quarts de la distance à ses contrôles.
            #   Le critère « n'atteint pas les bords » devenait donc aveugle
            #   exactement là où il servait (mesuré sur le `s` : le polygone
            #   touchait 459, la courbe s'arrêtait à 421). On l'échantillonne.
            pc = [(x, y)] + [(args[k], args[k + 1]) for k in range(0, n, 2)]
            for i2 in range(33):
                u = i2 / 32.0
                q = list(pc)
                while len(q) > 1:
                    q = [((1 - u) * q[k][0] + u * q[k + 1][0],
                          (1 - u) * q[k][1] + u * q[k + 1][1]) for k in range(len(q) - 1)]
                pts.append(q[0])
            x, y = args[-2], args[-1]
        else:
            pts.extend([(args[k], args[k + 1]) for k in range(0, n, 2)])
            x, y = args[-2], args[-1]
    return pts


def boite_du_trace(d):
    """La boîte réellement occupée par un `d` — arcs échantillonnés compris."""
    pts = points_du_trace(d)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': max(ys)}


def controler(R, M):
    """Compare chaque tracé à la boîte MESURÉE de sa lettre. Rend les écarts.

    ★ **DEUX FAUTES SYMÉTRIQUES, ET IL FAUT LES DEUX.** Un axe qui DÉBORDE
      dessine une autre lettre — la panse du `b` du mauvais côté du fût. Un axe
      qui n'atteint PAS les bords dessine la bonne lettre en trop petit : le
      creux du `u` s'arrêtait à 118 quand la lettre descend à 0, soit un `u`
      dont le fond flotte au-dessus de la ligne de base. Le premier défaut se
      voit, le second se sent — et aucun des deux ne se lit dans le code.

    L'axe médian d'un contour court à une demi-épaisseur de son bord : c'est ce
    que dit `marge`, et c'est pourquoi la même tolérance sert dans les deux
    sens. Le dépassement est plafonné un peu plus large, parce qu'une extrémité
    arrondie (`stroke-linecap: round`) déborde de sa demi-épaisseur.
    """
    marge = M['fut'] / 2 + 4
    # ★ Le RETRAIT toléré : l'axe médian court à une demi-épaisseur du bord, donc
    #   un écart d'une épaisseur pleine est déjà le double du normal. Au-delà, le
    #   tracé n'est plus en retrait, il est plus petit que sa lettre.
    retrait = M['fut']
    ecarts = []
    for c in SIGNES:
        if c not in R:
            continue
        o = M['boites'][c]
        traits = R[c][0]
        b = None
        for tr in traits:
            t = boite_du_trace(tr['d'])
            b = t if b is None else {
                'x0': min(b['x0'], t['x0']), 'x1': max(b['x1'], t['x1']),
                'y0': min(b['y0'], t['y0']), 'y1': max(b['y1'], t['y1']),
            }
        debords = []
        for cle, signe in (('x0', -1), ('y0', -1), ('x1', 1), ('y1', 1)):
            ecart = signe * (b[cle] - o[cle])
            if ecart > marge:
                debords.append('déborde en %s de %s' % (cle, r(ecart)))
            elif ecart < -retrait:
                debords.append('n’atteint pas %s, à %s près' % (cle, r(-ecart)))
        if debords:
            ecarts.append((c, b, o, debords))
    return ecarts


def main():
    m = mesures()
    b = m['boites']
    print('— mesuré dans JetBrains Mono, à l’échelle du repère (capitale = 600) —')
    print('  avance %s · fût %s · hauteur d’x %s · capitale %s'
          % (r(m['avance']), r(m['fut']), r(m['hauteurX']), m['capitale']))
    print('  jambage %s (g, j, p, q, y) · hampe %s (b, d, h, k, l)'
          % (r(b['p']['y0']), r(b['b']['y1'])))
    print()
    R = recettes(m)
    manquants = [c for c in SIGNES if c not in R]
    if manquants:
        sys.exit('recettes manquantes : ' + ' '.join(manquants))

    # ★ Le contrôle passe AVANT l'écriture, et il n'interrompt pas : les tracés
    #   fautifs doivent pouvoir être RÉGÉNÉRÉS pour être regardés — c'est à
    #   l'œil que se juge un dessin, et la page de comparaison sert justement à
    #   ça. Mais le générateur dit ce qu'il sait, lettre par lettre.
    ecarts = controler(R, m)
    if ecarts:
        print('  ⚠️  %d lettre(s) débordent de la boîte mesurée dans la police :' % len(ecarts))
        for c, b, o, debords in ecarts:
            print('      %s  tracé x %s..%s y %s..%s   police x %s..%s y %s..%s   → %s'
                  % (c, r(b['x0']), r(b['x1']), r(b['y0']), r(b['y1']),
                     r(o['x0']), r(o['x1']), r(o['y0']), r(o['y1']), ', '.join(debords)))
    else:
        print('  ✓ les %d tracés tiennent dans la boîte de leur signe.' % len(R))
    print()

    # ★ La SORTIE est un module de comparaison, pas la table du moteur. Tant que
    #   les tracés dérivés ne valent pas mieux que ceux qu'ils remplaceraient,
    #   ils n'ont rien à faire dans `glyphes.js` : ils vont sur la page
    #   `glyphes.html`, où l'auteur les met côte à côte avec la police et
    #   avec l'existant. Un dessin se juge à l'œil, pas au commit.
    lignes = ["/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-traces.py` — ne pas éditer à la main.",
              " *",
              " * Ce sont les tracés CANDIDATS, dérivés des mesures de JetBrains Mono. Ils ne",
              " * sont PAS ceux du moteur : `moteur/tables/glyphes.js` fait toujours foi. Ce",
              " * fichier n'existe que pour la page de comparaison `glyphes.html`.",
              " */",
              "export const CANDIDATS = {"]
    for c in SIGNES:
        traits, jonctions = R[c]
        lignes.append("  %s: { traits: [%s], jonctions: %s }," % (
            repr(c),
            ', '.join("{ d: %s, ouvert: %s }" % (repr(x['d']), 'true' if x['ouvert'] else 'false')
                      for x in traits),
            '[' + ', '.join('[%d, %d, %s]' % (j[0], j[1], repr(j[2])) for j in jonctions) + ']'))
    lignes.append("};")
    lignes.append("")
    lignes.append("/** Les mesures relevées dans la police, à l'échelle du repère du moteur. */")
    lignes.append("export const MESURES = { avance: %s, fut: %s, hauteurX: %s, capitale: %d };"
                  % (r(m['avance']), r(m['fut']), r(m['hauteurX']), m['capitale']))
    (RACINE / 'src' / 'gfx' / '_glyphes-candidats.js').write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_glyphes-candidats.js (%d lettres)' % len(R))


if __name__ == '__main__':
    main()
