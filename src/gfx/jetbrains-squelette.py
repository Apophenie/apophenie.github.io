#!/usr/bin/env python3
"""★ **LE SQUELETTE PAR ÉROSION — prototype, PAS ENCORE BRANCHÉ.**

    python3 src/gfx/jetbrains-squelette.py abcdef svg    # → /tmp/sk.svg

═══════════════════════════════════════════════════════════════════════════════

★ **LA MÉTHODE EST CELLE QUE L'AUTEUR A DICTÉE**, et elle vise le défaut de fond
  de `jetbrains-traces.py` : celui-ci ne reproduit pas la police, il la DEVINE —
  des arcs elliptiques paramétrés à la main sur des mesures de boîte, quand la
  police est en Bézier.

  > « Par des glyphes existants. La plupart ont une épaisseur constante, et
  >   certains ont des parties affinées. Affine de l'épaisseur principale tous
  >   les traits pour arriver au squelette. Là où le trait était plus fin, ne
  >   crée pas un vide là où il n'y en avait pas, garde la ligne de squelette.
  >   Ensuite, déduis en courbes de Bézier le squelette. Puis compare les
  >   extrémités du squelette aux extrémités de la font d'origine pour repérer
  >   la longueur manquante due à la réduction/affinage effectuée plus tôt.
  >   Repère aussi la direction dans laquelle s'arrête l'extrémité dans la font
  >   d'origine, pour t'assurer que tu es raccord (attention, sur la plupart des
  >   lettres le trait s'arrête à la perpendiculaire comme sur le bas de t, mais
  >   sur v w x y non). » (l'auteur)

  Les quatre temps, et ce qu'ils règlent :

   ① **RASTÉRISER** le contour de la police (règle pair-impair) ;
   ② **AMINCIR** (Zhang-Suen) : on retire les pixels de bord tant qu'il en
      reste, MAIS jamais un pixel dont le retrait couperait la forme en deux.
      C'est exactement la garde demandée — un trait affiné n'est pas effacé, il
      est réduit à sa ligne, comme les autres mais plus tôt ;
   ③ **VECTORISER** : ébarber les épines, fusionner les carrefours, découper en
      branches ;
   ④ **PROLONGER** chaque extrémité dans la direction de sa tangente jusqu'à
      sortir du contour d'origine. C'est ce qui rattrape la longueur mangée par
      l'amincissement, et ça s'adapte TOUT SEUL à la façon dont la police coupe
      ses terminaisons : perpendiculaire au trait sur le pied du `t`, oblique
      sur `v w x y`. Aucun cas particulier à écrire.

═══════════════════════════════════════════════════════════════════════════════

★ **CE QUI MARCHE DÉJÀ, ET C'EST L'ESSENTIEL :** le squelette épouse l'axe
  médian de chaque lettre (vérifié à l'œil sur `s b r t f m`, superposé au
  contour), et les COMPTES D'EXTRÉMITÉS sortent exacts pour les vingt-six —
  y compris le `q` à deux, que l'auteur avait annoncé : « q par exemple gagne
  une extrémité au même titre que p, alors que ça n'aurait pas été le cas avec
  une autre font ».

★ **ET LE DÉCOUPAGE EN TRAITS EST RÉSOLU — par `apparier`, en fin de fichier.**
  Il ne l'a pas été en cherchant mieux DANS le squelette. Les crochets que
  l'amincissement sème là où la panse rejoint le fût ne sont pas des artefacts :
  ce sont de VRAIES branches de l'axe médian, celles des congés que la police
  pose à ses jonctions. Aucun filtre géométrique ne les distingue d'un trait,
  puisqu'ils EN SONT un — trois tours de critères l'ont vérifié à leurs dépens.

  Ils disparaissent quand on cesse de les chasser : chaque pixel rejoint le
  trait DÉCLARÉ par la recette le plus proche, et ce qui s'en écarte de trois
  pixels se noie dans la moyenne au lieu d'en sortir. La topologie vient d'où
  elle se lit, la géométrie d'où elle se mesure.

⚠️ Le squelette BRUT, lui, garde ses branches de congé : c'est ce que montre la
  colonne « squelette » de la page, à côté de la colonne « apparié ».

⚠️ **CE FICHIER NE PRODUIT DONC RIEN QUI ENTRE DANS LE DÉPÔT.** `glyphes.js`
  fait toujours foi, et les candidats de `jetbrains-traces.py` restent ceux que
  montre `glyphes.html`. On garde le prototype parce qu'il a déjà répondu à
  la question — la méthode est la bonne — et qu'il serait absurde de la
  redécouvrir.
"""

import math, pathlib, sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

RACINE = pathlib.Path('.').resolve()
POLICE = RACINE / 'src' / 'fonts' / 'jetbrains-mono-var.woff2'
CAP = 600

f = TTFont(POLICE); cmap = f.getBestCmap(); gs = f.getGlyphSet()
K = CAP / f['OS/2'].sCapHeight

def bez(p0, pts, n=10):
    ctrl = [p0] + list(pts); out = []
    for i in range(1, n + 1):
        u = i / n; q = list(ctrl)
        while len(q) > 1:
            q = [((1-u)*q[j][0]+u*q[j+1][0], (1-u)*q[j][1]+u*q[j+1][1]) for j in range(len(q)-1)]
        out.append(q[0])
    return out

def contours(ch):
    # ⚠️ DÉCOMPOSANT : `i` et `j` sont des glyphes COMPOSITES (le fût sans
    #   point, plus le point en référence). Un pen ordinaire n'enregistre que
    #   l'appel de composant et rend un contour VIDE.
    pen = DecomposingRecordingPen(gs); gs[cmap[ord(ch)]].draw(pen)
    subs, cur, pos = [], [], (0, 0)
    for op, args in pen.value:
        if op == 'moveTo':
            if cur: subs.append(cur)
            pos = args[0]; cur = [pos]
        elif op == 'lineTo':
            pos = args[0]; cur.append(pos)
        elif op == 'qCurveTo':
            pts = [a for a in args if a is not None]
            for a, b2 in zip(pts, pts[1:]):
                mid = ((a[0]+b2[0])/2, (a[1]+b2[1])/2)
                cur += bez(pos, [a, mid]); pos = mid
            if len(pts) >= 2: cur += bez(pos, [pts[-2], pts[-1]])
            pos = pts[-1]
        elif op == 'curveTo':
            cur += bez(pos, list(args)); pos = args[-1]
        elif op == 'closePath' and cur:
            subs.append(cur); cur = []
    if cur: subs.append(cur)
    return [[(x*K, y*K) for x, y in s] for s in subs]

# ── rastérisation (règle pair-impair sur des contours non auto-intersectants) ──
PAS = 4.0          # unités de repère par pixel
#: L'épaisseur du fût, à l'échelle du repère — la même que `jetbrains-traces.py`
#: mesure (90 unités de police × k). C'est elle qui donne le rayon attendu au
#: bout d'un vrai trait : sa moitié.
M_FUT = 90 * K
MARGE = 12         # pixels

def rasteriser(subs):
    xs = [p[0] for s in subs for p in s]; ys = [p[1] for s in subs for p in s]
    x0, x1 = min(xs), max(xs); y0, y1 = min(ys), max(ys)
    W = int((x1-x0)/PAS) + 2*MARGE; H = int((y1-y0)/PAS) + 2*MARGE
    ox, oy = x0 - MARGE*PAS, y0 - MARGE*PAS
    grille = [[0]*W for _ in range(H)]
    aretes = []
    for s in subs:
        for a, b in zip(s, s[1:] + [s[0]]):
            if a[1] != b[1]: aretes.append((a, b))
    for j in range(H):
        y = oy + (j + 0.5) * PAS
        xs_int = []
        for a, b in aretes:
            if (a[1] <= y) != (b[1] <= y):
                t = (y - a[1]) / (b[1] - a[1])
                xs_int.append(a[0] + t*(b[0]-a[0]))
        xs_int.sort()
        for k in range(0, len(xs_int)-1, 2):
            i0 = max(0, int((xs_int[k]-ox)/PAS + 0.5))
            i1 = min(W-1, int((xs_int[k+1]-ox)/PAS + 0.5))
            for i in range(i0, i1+1): grille[j][i] = 1
    return grille, ox, oy, W, H

# ── ② L'AMINCISSEMENT (Zhang-Suen) ───────────────────────────────────────────
# Il retire les pixels de bord tant qu'il en reste, MAIS refuse tout pixel dont
# le retrait couperait la forme en deux. C'est exactement la garde que l'auteur
# demande : « là où le trait était plus fin, ne crée pas un vide là où il n'y en
# avait pas, garde la ligne de squelette. » Un trait affiné n'est pas effacé, il
# est réduit à sa ligne — comme les autres, mais plus tôt.
def voisins(g, i, j):
    return [g[j-1][i], g[j-1][i+1], g[j][i+1], g[j+1][i+1],
            g[j+1][i], g[j+1][i-1], g[j][i-1], g[j-1][i-1]]  # P2..P9, sens horaire

def transitions(v):
    return sum(1 for k in range(8) if v[k] == 0 and v[(k+1) % 8] == 1)

def amincir(g):
    H, W = len(g), len(g[0])
    g = [row[:] for row in g]
    change = True
    while change:
        change = False
        for pas in (0, 1):
            a_vider = []
            for j in range(1, H-1):
                for i in range(1, W-1):
                    if not g[j][i]: continue
                    v = voisins(g, i, j)
                    b = sum(v)
                    if not (2 <= b <= 6): continue
                    if transitions(v) != 1: continue
                    p2, p3, p4, p5, p6, p7, p8, p9 = v
                    if pas == 0:
                        if p2*p4*p6 or p4*p6*p8: continue
                    else:
                        if p2*p4*p8 or p2*p6*p8: continue
                    a_vider.append((i, j))
            if a_vider:
                change = True
                for i, j in a_vider: g[j][i] = 0
    return g

# ── ③ LA VECTORISATION — du squelette de pixels aux branches ─────────────────
# ⚠️ Un point de branchement ne se compte pas au NOMBRE DE VOISINS : dans un
#   squelette 8-connexe, un simple coin en a trois ou quatre sans qu'aucune
#   branche ne s'y sépare. Ce qui compte est le nombre de GROUPES de voisins
#   (les transitions 0→1 autour du pixel) : un, c'est un bout ; deux, un passage ;
#   trois ou plus, un vrai carrefour.
def degre(sk, i, j):
    v = voisins(sk, i, j)
    if sum(v) == 0: return 0
    if sum(v) == 1: return 1
    return max(2, transitions(v))

def noeuds_du_squelette(sk):
    H, W = len(sk), len(sk[0])
    return {(i, j): degre(sk, i, j) for j in range(1, H-1) for i in range(1, W-1)
            if sk[j][i] and degre(sk, i, j) != 2}

V8 = [(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]

def clusters(sk):
    """Les carrefours, FUSIONNÉS — un vrai carrefour occupe plusieurs pixels.

    ★ Dans un squelette 8-connexe, une jonction ne tient jamais sur un seul
      pixel : trois ou quatre voisins se déclarent tous « à trois transitions »,
      et l'on croit voir quatre carrefours reliés par des branches de deux
      pixels. On regroupe donc les nœuds contigus en un seul, et c'est le
      groupe — pas le pixel — qui borne une branche.
    """
    nd = noeuds_du_squelette(sk)
    reste = set(nd)
    grappes = []
    # ★ **LE RAYON DE FUSION EST UNE DEMI-ÉPAISSEUR, pas l'adjacence.** Deux
    #   carrefours distants de moins que l'épaisseur du trait ne sont pas deux
    #   carrefours : c'est un seul, que l'amincissement a dédoublé en « Y »
    #   parce que la panse rejoint le fût sur une zone large et non en un point.
    #   Mesuré : le `b`, qui a deux jonctions, en déclarait six.
    RAYON = 9
    while reste:
        pile = [reste.pop()]
        grappe = set(pile)
        while pile:
            i, j = pile.pop()
            proches = [v for v in reste if abs(v[0]-i) <= RAYON and abs(v[1]-j) <= RAYON]
            for v in proches:
                reste.discard(v); grappe.add(v); pile.append(v)
        grappes.append(grappe)
    appartient = {}
    for k, g in enumerate(grappes):
        for p in g: appartient[p] = k
    return grappes, appartient, nd


def branches(sk):
    """Les chemins du squelette, d'un carrefour (ou d'un bout) à un autre.

    ⚠️ Le suivi doit exclure TOUT le chemin déjà parcouru, pas seulement le
      pixel précédent : sur un escalier diagonal — et un squelette 8-connexe
      n'est fait que de ça — le pixel courant touche encore son avant-avant-
      dernier, et le chemin se rebouclait au bout de dix pixels. Mesuré : le
      `c`, dont le squelette fait 240 px, rendait deux branches de onze et neuf.
    """
    grappes, appartient, nd = clusters(sk)
    H, W = len(sk), len(sk[0])
    vus_arc = set()
    # ⚠️ **ET LES PIXELS DÉJÀ PARCOURUS SE MARQUENT GLOBALEMENT.** Interdire les
    #   ARCS déjà vus ne suffit pas : sur un escalier, un même pixel est
    #   atteignable par plusieurs arcs, si bien qu'un second départ repassait sur
    #   une branche déjà rendue et en sortait un morceau. Mesuré : le `c`, dont le
    #   squelette fait 240 px, rendait deux branches de 85 et 214 — 299 px pour
    #   240, donc un recouvrement, et à l'écran un `c` amputé de son crochet.
    consommes = set()
    out = []
    for k, grappe in enumerate(grappes):
        for (i0, j0) in sorted(grappe):
            for dx, dy in V8:
                i, j = i0+dx, j0+dy
                if not (0 <= i < W and 0 <= j < H) or not sk[j][i]: continue
                if appartient.get((i, j)) == k: continue          # encore dans le carrefour
                if ((i0,j0),(i,j)) in vus_arc: continue
                chemin = [(i0,j0), (i,j)]
                dedans = {(i0,j0), (i,j)}
                vus_arc.add(((i0,j0),(i,j))); vus_arc.add(((i,j),(i0,j0)))
                while (i, j) not in appartient:
                    suite = None
                    for ex, ey in V8:
                        a2, b2 = i+ex, j+ey
                        if not (0 <= a2 < W and 0 <= b2 < H) or not sk[b2][a2]: continue
                        if (a2, b2) in dedans: continue
                        if (a2, b2) in consommes and (a2, b2) not in appartient: continue
                        suite = (a2,b2); break
                    if suite is None: break
                    vus_arc.add(((i,j),suite)); vus_arc.add((suite,(i,j)))
                    chemin.append(suite); dedans.add(suite); i, j = suite
                if len(chemin) > 1:
                    out.append(chemin)
                    consommes |= {p for p in chemin if p not in appartient}
    # ★ Les CYCLES PURS — un `o` n'a ni bout ni carrefour, donc aucun nœud d'où
    #   partir. On ne les récolte QUE dans ce cas : partir aussi des pixels
    #   ordinaires ferait naître autant de faux chemins qu'il reste de pixels.
    if not nd:
        depart = next(((i, j) for j in range(1, H-1) for i in range(1, W-1) if sk[j][i]), None)
        if depart:
            chemin, dedans = [depart], {depart}
            while True:
                suite = None
                for ex, ey in V8:
                    a2, b2 = chemin[-1][0]+ex, chemin[-1][1]+ey
                    if sk[b2][a2] and (a2, b2) not in dedans:
                        suite = (a2, b2); break
                if suite is None: break
                chemin.append(suite); dedans.add(suite)
            out.append(chemin + [chemin[0]])
    return out


# ── ④ L'ÉBARBAGE — les épines de l'amincissement ─────────────────────────────
# Zhang-Suen fait pousser une petite branche parasite à chaque coin un peu large
# du contour : ce sont des ÉPINES, pas des traits. On les reconnaît à ce qu'elles
# meurent sur un bout libre après quelques pixels — bien moins que l'épaisseur
# du trait, qui est la plus petite longueur qu'un vrai trait puisse avoir.
def ebarber(sk, seuil, iles=frozenset()):
    """Retire les ÉPINES : les branches terminales plus courtes qu'un trait.

    ⚠️ **ELLE NE TOUCHE AUCUN PIXEL DE CARREFOUR.** Un carrefour occupe une
      grappe de pixels (`clusters`) ; couper la branche jusqu'à son point
      d'attache entamait la grappe, la scindait, et fabriquait DEUX bouts libres
      là où il n'y en avait aucun. Mesuré : le `d` passait de deux bouts à cinq.

    ⚠️ **ET ELLE NE PASSE QU'UNE FOIS.** Itérer la ronge : chaque passe raccourcit
      les branches voisines du carrefour supprimé, qui deviennent à leur tour
      « plus courtes que le seuil ». Le `s`, qui n'a qu'un seul trait, y perdait
      un de ses deux bouts.
    """
    sk = [r[:] for r in sk]
    grappes, appartient, nd = clusters(sk)
    for br in branches(sk):
        a, b = br[0], br[-1]
        if (nd.get(a, 2) == 1) == (nd.get(b, 2) == 1):
            continue                      # deux bouts, ou aucun : ce n'est pas une épine
        if len(br) >= seuil:
            continue
        if any(p in iles for p in br):
            continue                      # le point du `i` n'est pas une épine
        for (i, j) in br:
            if (i, j) not in appartient:  # jamais un pixel de carrefour
                sk[j][i] = 0
    return sk


# ═══════════════════════════════════════════════════════════════════════════
#  ④ LE PROLONGEMENT — rendre la longueur que l'amincissement a mangée.
#
#  > « Compare les extrémités du squelette aux extrémités de la font d'origine
#  >   pour repérer la longueur manquante due à la réduction/affinage effectuée
#  >   plus tôt. Repère aussi la direction dans laquelle s'arrête l'extrémité
#  >   dans la font d'origine, pour t'assurer que tu es raccord (attention, sur
#  >   la plupart des lettres le trait s'arrête à la perpendiculaire comme sur
#  >   le bas de t, mais sur v w x y non). » (l'auteur)
#
#  ★ **ET LA DIRECTION N'A PAS BESOIN D'ÊTRE CLASSÉE.** On avance dans le sens
#    de la TANGENTE du squelette jusqu'à sortir du contour, et l'on s'arrête au
#    dernier point encore dedans. Une terminaison coupée perpendiculairement au
#    trait — le pied du `t` — arrête la marche tout de suite ; une terminaison
#    coupée en biais — les branches du `v`, du `w`, du `x`, du `y`, qui finissent
#    à l'horizontale sur un trait oblique — la laisse aller plus loin, jusqu'au
#    coin. Le cas particulier que l'auteur signale se règle donc tout seul :
#    c'est le contour qui décide, pas une règle écrite à la main.
# ═══════════════════════════════════════════════════════════════════════════

def prolonger(chemin, grille, W, H):
    """Pousse les deux bouts libres jusqu'au bord du contour, dans leur sens."""
    if len(chemin) < 3:
        return chemin
    sortie = list(chemin)
    for cote in (0, -1):
        # La tangente, prise sur quelques pixels : un seul segment suivrait
        # l'escalier du squelette et partirait de travers.
        a = sortie[cote]
        # La fenêtre de tangente s'adapte aux branches courtes : sur une branche
        # de quatre pixels, `sortie[4]` n'existe pas.
        k = min(4, len(sortie) - 1)
        b = sortie[k] if cote == 0 else sortie[-1 - k]
        dx, dy = a[0] - b[0], a[1] - b[1]
        n = math.hypot(dx, dy)
        if n < 1e-9:
            continue
        dx, dy = dx / n, dy / n
        i, j = a
        dernier = a
        for pas in range(1, 40):
            x, y = a[0] + dx * pas, a[1] + dy * pas
            ii, jj = int(round(x)), int(round(y))
            if not (0 <= ii < W and 0 <= jj < H) or not grille[jj][ii]:
                break
            dernier = (ii, jj)
        if dernier != a:
            if cote == 0:
                sortie.insert(0, dernier)
            else:
                sortie.append(dernier)
    return sortie


def r(v):
    x = round(v, 1)
    return str(int(x)) if x == int(x) else str(x)


def catmull(P):
    """Polyligne → cubiques de Catmull-Rom : un `d` court et relisible."""
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


def allege(pts, combien=14):
    """Ramène une branche à quelques points, régulièrement espacés."""
    if len(pts) <= combien:
        return pts
    pas = (len(pts) - 1) / (combien - 1)
    return [pts[min(len(pts) - 1, int(round(k * pas)))] for k in range(combien)]


def petitesIles(sk, taille=3):
    """Les pixels des composantes minuscules — les POINTS du `i` et du `j`.

    ★ Elles se relèvent AVANT l'ébarbage, et c'est ce qui les distingue d'un
      orphelin : le point du `i` s'amincit en un pixel, celui du `j` en deux,
      et tous deux sont isolés depuis l'origine. Un pixel resté seul APRÈS
      l'ébarbage, lui, est un résidu — l'épine coupée en a laissé le pied.
      Mesuré : `a`, `m` et `q` gagnaient ainsi un « point » qui n'existe pas.
    """
    H, W = len(sk), len(sk[0])
    reste = {(i, j) for j in range(H) for i in range(W) if sk[j][i]}
    iles = set()
    while reste:
        pile = [reste.pop()]
        comp = set(pile)
        while pile:
            i, j = pile.pop()
            for e, f in V8:
                v = (i + e, j + f)
                if v in reste:
                    reste.discard(v); comp.add(v); pile.append(v)
        if len(comp) <= taille:
            iles |= comp
    return iles


# ═══════════════════════════════════════════════════════════════════════════
#  ★ **LE RAYON INSCRIT — le critère qui distingue une épine d'un trait.**
#
#  L'ébarbage par LONGUEUR est un réglage : il marche quand les épines sont plus
#  courtes que les traits, et se trompe dès qu'un vrai trait est court. Sur les
#  panses tangentes — `b d g p q` —, là où la police pose un congé entre la
#  panse et le fût, l'amincissement sème des crochets que la longueur ne
#  distingue de rien. « Il y a des artéfacts improbables » (l'auteur).
#
#  Le rayon inscrit, lui, est INTRINSÈQUE : c'est la distance du point d'axe au
#  bord le plus proche, c'est-à-dire le rayon du plus grand disque qu'on puisse
#  y loger. Au bout d'un VRAI trait il vaut la demi-épaisseur — le crayon y est
#  aussi large qu'ailleurs. Au bout d'une ÉPINE il est bien plus petit, parce
#  qu'une épine pointe vers un recoin, où plus rien ne tient. Le critère ne se
#  règle donc pas : il se mesure, et il vaut pour n'importe quelle résolution.
# ═══════════════════════════════════════════════════════════════════════════

def distances(grille, W, H):
    """Transformée de distance par chamfer 3-4, en TIERS de pixel.

    Deux balayages — un avant, un arrière — suffisent : le coût de tout chemin
    étant croissant, la distance minimale se propage de proche en proche. Les
    poids 3 et 4 approchent 1 et √2 à 4 % près, ce qui est très en deçà de la
    précision que la grille elle-même autorise.
    """
    INF = 1 << 30
    d = [[0 if not grille[j][i] else INF for i in range(W)] for j in range(H)]
    for j in range(H):
        for i in range(W):
            if not d[j][i]:
                continue
            m = d[j][i]
            if j > 0:
                m = min(m, d[j - 1][i] + 3)
                if i > 0:
                    m = min(m, d[j - 1][i - 1] + 4)
                if i < W - 1:
                    m = min(m, d[j - 1][i + 1] + 4)
            if i > 0:
                m = min(m, d[j][i - 1] + 3)
            d[j][i] = m
    for j in range(H - 1, -1, -1):
        for i in range(W - 1, -1, -1):
            if not d[j][i]:
                continue
            m = d[j][i]
            if j < H - 1:
                m = min(m, d[j + 1][i] + 3)
                if i > 0:
                    m = min(m, d[j + 1][i - 1] + 4)
                if i < W - 1:
                    m = min(m, d[j + 1][i + 1] + 4)
            if i < W - 1:
                m = min(m, d[j][i + 1] + 3)
            d[j][i] = m
    return d


def ebarberParGoulet(sk, dist, rayonMini, iles=frozenset()):
    """Coupe les branches terminales qui SORTENT D'UN GOULET.

    ⚠️ **CE N'EST PAS LE RAYON AU BOUT — mesuré, cette idée-là est fausse.** Un
      squelette de Blum s'arrête à une demi-épaisseur du bord, et son extrémité
      a donc le rayon du trait ; celui de Zhang-Suen, non : l'amincissement
      pousse jusqu'à un pixel d'épaisseur, et le bout finit COLLÉ au contour.
      Relevé sur les deux branches du `v` — des traits parfaitement légitimes —
      un rayon terminal de 1,0 et 2,0 px pour une demi-épaisseur de 9,2.

    ⚠️ **CE N'EST PAS NON PLUS LE MINIMUM DU PARCOURS.** Sur une branche oblique
      dont la police coupe la terminaison à l'horizontale — `v`, `w`, `x`, `y` —
      la remontée du rayon s'étale sur bien plus qu'une demi-épaisseur, et
      aucune marge fixe ne l'écarte sans écarter aussi de vrais traits. Le `x`
      et le `k` y ont perdu la moitié de leurs branches.

    ★ **CE QUI DISTINGUE, C'EST LE RAYON À L'ATTACHE.** Une épine de congé sort
      d'un RECOIN : au point où elle quitte le carrefour, il n'y a presque pas
      de place. Un vrai trait part à pleine largeur. Mesuré sur tout l'alphabet :
      le crochet du `b` s'attache à 4,7 ; la plus étroite des branches
      légitimes — une diagonale du `x` — à 8,0, pour une demi-épaisseur de 9,2.
      Le seuil se pose entre les deux sans rien frôler.
    """
    sk = [r[:] for r in sk]
    grappes, appartient, nd = clusters(sk)
    for br in branches(sk):
        a, b = br[0], br[-1]
        boutA, boutB = nd.get(a, 2) == 1, nd.get(b, 2) == 1
        if boutA == boutB:
            continue                      # deux bouts, ou aucun : pas une épine
        attache = b if boutA else a
        # ⚠️ L'autre extrémité doit être un CARREFOUR : le parcours peut aussi
        #   s'arrêter sur un pixel ordinaire — deux branches qui se bloquent au
        #   milieu d'un trait —, et ce demi-trait-là n'a pas d'attache à mesurer.
        if attache not in appartient:
            continue
        if any(p in iles for p in br):
            continue                      # le point du `i` n'est pas une épine
        if dist[attache[1]][attache[0]] >= rayonMini * 3:
            continue                      # part à pleine largeur : c'est un trait
        for (i, j) in br:
            if (i, j) not in appartient:
                sk[j][i] = 0
    return sk


def polylignes(sk, iles=frozenset()):
    """Le squelette COUVERT par des polylignes, sans passer par les carrefours.

    ★ **CE N'EST PAS LE DÉCOUPAGE EN TRAITS, et c'est volontaire.** Séparer un
      squelette en traits nommés — avec leurs jonctions, pour `glyphes.js` —
      bute sur les panses tangentes, où l'érosion sème une échelle de faux
      carrefours (voir l'en-tête). Trois tentatives y ont laissé des lettres
      amputées ou hérissées, c'est-à-dire un dessin PIRE que ce qu'il montre.

      Pour REGARDER le squelette, on n'a pas besoin de ce découpage : il suffit
      de le couvrir. Un parcours glouton en profondeur avance tant qu'il a un
      voisin neuf, ferme la polyligne quand il est bloqué, et repart d'où il
      peut. Chaque pixel est pris une fois et une seule — donc aucun
      recouvrement, aucune amputation, et le dessin est exactement celui que
      l'amincissement a produit.
    """
    H, W = len(sk), len(sk[0])
    reste = {(i, j) for j in range(H) for i in range(W) if sk[j][i]}
    out = []
    while reste:
        # Partir d'un BOUT quand il en reste un : une polyligne qui commence au
        # milieu d'un trait le coupe en deux, et le raccord se voit.
        depart = next((p for p in sorted(reste)
                       if sum(1 for e, f in V8 if (p[0]+e, p[1]+f) in reste) == 1), None)
        if depart is None:
            depart = min(reste)
        chemin = [depart]
        reste.discard(depart)
        while True:
            i, j = chemin[-1]
            suite = next(((i+e, j+f) for e, f in V8 if (i+e, j+f) in reste), None)
            if suite is None:
                break
            chemin.append(suite)
            reste.discard(suite)
        # ⚠️ **UN POINT EST UNE COMPOSANTE D'UN SEUL PIXEL, et il se garde.**
        #   Le seuil rejetait tout chemin de moins de trois pixels — ce qui est
        #   juste d'un moignon accroché à un trait, et faux d'une composante
        #   ISOLÉE. Or le point du `i` et celui du `j` s'amincissent très
        #   exactement en UN pixel (mesuré), et disparaissaient : « les points
        #   sur i et j ont disparu » (l'auteur). On les rend comme la table du
        #   dépôt les écrit — un sous-chemin dégénéré, que le trait arrondi
        #   peint en rond.
        # ⚠️ **UN POINT EST UNE ÎLE, PAS UN CHEMIN COURT.** Le seuil rejetait
        #   tout chemin de moins de trois pixels — juste d'un moignon accroché à
        #   un trait, faux d'une composante ISOLÉE. Le point du `i` s'amincit en
        #   UN pixel, celui du `j` en DEUX (mesuré), et tous deux disparaissaient :
        #   « les points sur i et j ont disparu » (l'auteur). On les rend comme la
        #   table du dépôt les écrit — un sous-chemin dégénéré, que le trait
        #   arrondi peint en rond.
        if len(chemin) > 2 or all(p in iles for p in chemin):
            out.append(chemin)
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  ★ **LE RECALAGE PAR LES BORDS — la précision que la grille ne donne pas.**
#
#  L'amincissement travaille sur des PIXELS de quatre unités : son axe est juste
#  à deux unités près, et il hérite en prime des escaliers de la grille. C'est
#  cette approximation, et non un défaut de méthode, qui produit les crochets de
#  congé sur `b d g p q` — là où deux bords se frôlent, deux pixels de plus ou de
#  moins décident d'une branche.
#
#  L'appariement de bords, lui, est EXACT : c'est celui qui donnait déjà un `c`
#  et un `s` parfaits dans `jetbrains-traces.py`. Il ne savait traiter qu'un
#  trait unique, faute de pouvoir décider quel bord répond à quel bord — mais le
#  squelette, lui, le dit : il est déjà entre les deux. On s'en sert donc comme
#  GUIDE, et l'on recale chaque point entre les deux bords réels.
#
#  Pour chaque point d'axe : le point de contour le plus proche donne un bord ;
#  le plus proche parmi ceux qui sont de l'autre CÔTÉ — produit scalaire négatif
#  — donne l'autre ; leur milieu est l'axe exact. Là où il n'y a pas d'autre
#  côté (une terminaison), le point est laissé tel quel.
# ═══════════════════════════════════════════════════════════════════════════

def _regulier(pts, pas=3.0):
    """Points équidistants le long d'un contour fermé — la finesse du recalage.

    Trois quarts de pixel : le recalage cherche un plus proche point, et sa
    précision ne peut pas dépasser l'écart entre deux points du bord.
    """
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


def recaler(axe, bord):
    """Repose chaque point d'axe au MILIEU EXACT des deux bords qui l'encadrent."""
    out = []
    for P in axe:
        q1 = min(bord, key=lambda z: (z[0] - P[0]) ** 2 + (z[1] - P[1]) ** 2)
        dx, dy = q1[0] - P[0], q1[1] - P[1]
        enFace = [z for z in bord if (z[0] - P[0]) * dx + (z[1] - P[1]) * dy < 0]
        if not enFace:
            out.append(P)
            continue
        q2 = min(enFace, key=lambda z: (z[0] - P[0]) ** 2 + (z[1] - P[1]) ** 2)
        out.append(((q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2))
    return out


def traces(ch, recale=False):
    """Les tracés d'une lettre, dans le repère du moteur."""
    subs = contours(ch)
    g, ox, oy, W, H = rasteriser(subs)
    brut = amincir(g)
    iles = petitesIles(brut)
    # ⚠️ **L'ÉBARBAGE PAR RAYON A ÉTÉ ESSAYÉ, MESURÉ, ET N'APPORTE RIEN.** Voir
    #   `ebarberParGoulet`, gardé pour ce qu'il documente : appliqué après
    #   l'ébarbage par longueur, il ne coupe plus une seule branche de tout
    #   l'alphabet — les comptes sont identiques au tracé près. Les crochets qui
    #   subsistent sur `b d g p q` ne sont donc ni courts ni étroits à l'attache :
    #   ce sont de VRAIES branches du squelette, que la géométrie du congé
    #   produit. Aucun filtre sur le squelette ne les enlèvera ; c'est la
    #   PRÉCISION du squelette qu'il faut reprendre.
    dist = distances(g, W, H)
    demi = (M_FUT / 2) / PAS
    sk = ebarber(brut, seuil=20, iles=iles)
    versRepere = lambda p: (ox + (p[0] + 0.5) * PAS, oy + (p[1] + 0.5) * PAS)
    # Le contour rééchantillonné, une fois pour toute la lettre : c'est contre
    # lui que chaque point d'axe se recale.
    bord = [q for sub in subs for q in _regulier(sub, pas=3.0)] if recale else None
    out = []
    for br in polylignes(sk, iles):
        if len(br) <= 2:
            # Le point du `i`, du `j` : un sous-chemin dégénéré, peint en rond
            # par le trait arrondi. C'est ainsi que `glyphes.js` l'écrit déjà.
            x, y = versRepere(br[0])
            out.append({'d': 'M %s %s L %s %s' % (r(x), r(y), r(x), r(y)), 'ouvert': True})
            continue
        if len(br) < 4:
            continue
        ferme = math.dist(br[0], br[-1]) <= 1.5
        # On ne prolonge qu'un trait : une épine résiduelle prolongée sort du
        # dessin en pointe, et c'est ce qui hérissait les panses.
        pts = br if (ferme or len(br) < 12) else prolonger(br, g, W, H)
        pointsRepere = [versRepere(p) for p in allege(pts)]
        if recale:
            pointsRepere = recaler(pointsRepere, bord)
        out.append({'d': catmull(pointsRepere), 'ouvert': not ferme})
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  ★ **L'APPARIEMENT — la topologie DÉCLARÉE, la géométrie MESURÉE.**
#
#  > « Les recettes savent déjà que le `b` a deux traits et deux jonctions ; le
#  >   squelette sait où ils passent, au dixième d'unité. Les apparier donnerait
#  >   une topologie stable ET une géométrie mesurée. » — validé par l'auteur.
#
#  C'est la séparation que le générateur de recettes annonce depuis sa première
#  ligne — « MESURÉ dans la police / DÉCLARÉ ici » —, appliquée pour de bon.
#  Chacune des deux sources fait ce qu'elle sait faire, et rien d'autre :
#
#   · **LA RECETTE DIT LA TOPOLOGIE** : combien de traits, lesquels se touchent,
#     où le crayon se lève. Rien de tout cela ne se mesure — c'est une lecture
#     du dessin, et c'est ce qui donne des comptes stables à `mtrb`, `mexb` et
#     `mbob`. Sa géométrie, en revanche, est devinée à coups d'arcs ;
#   · **LE SQUELETTE DIT LA GÉOMÉTRIE**, exactement, puisqu'il est l'axe médian
#     du contour réel. Mais sa topologie est intenable : là où la panse rejoint
#     le fût, la police pose un CONGÉ, et l'axe médian d'un congé a une branche.
#     Elle est mathématiquement juste ; c'est le dessinateur qui ne la trace pas,
#     parce qu'il dessine des traits et non des surfaces.
#
#  ★ **ET LES CROCHETS DISPARAISSENT SANS QU'ON AIT À LES CHASSER.** Chaque pixel
#    du squelette est attribué au trait déclaré le plus proche, puis à l'abscisse
#    de ce trait où il se projette ; ce qui reste est la MOYENNE des pixels
#    tombés sur chaque abscisse. Un crochet de congé, qui s'écarte du trait sur
#    trois ou quatre pixels, est noyé dans cette moyenne au lieu d'en sortir. On
#    ne l'a pas jugé : on ne lui a simplement pas donné de trait où aller.
# ═══════════════════════════════════════════════════════════════════════════

#: Combien d'abscisses par trait déclaré. Assez pour suivre une panse, pas assez
#: pour qu'une abscisse n'attrape aucun pixel — le squelette n'en a que quelques
#: centaines pour toute la lettre.
ABSCISSES = 24


def _projeter(p, guide):
    """L'abscisse du guide dont `p` est le plus proche, et cette distance."""
    meilleur, ou = None, 0
    for k, q in enumerate(guide):
        d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
        if meilleur is None or d < meilleur:
            meilleur, ou = d, k
    return ou, meilleur


#: Sous quelle distance deux tracés se TOUCHENT, en unités du repère.
#:
#: ⚠️ **C'EST LA TOLÉRANCE DE `deriveGlyph`, et il faut que ce soit la même.**
#:   Six unités sur la grille du dépôt (`visuel/glyphes.js › TOL`). En prendre
#:   une autre reviendrait à relever des contacts que le comptage ne voit pas,
#:   ou à en manquer qu'il voit — dans les deux cas, à reproduire une topologie
#:   qui n'est pas celle qu'on croit reproduire.
CONTACT = 6.0


def _distSegment(p, a, b):
    """Distance d'un point au SEGMENT `ab` — pas à ses extrémités."""
    vx, vy = b[0] - a[0], b[1] - a[1]
    n = vx * vx + vy * vy
    if n < 1e-12:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / n))
    return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy)


#: Au-delà de cet angle, un sommet du guide est un COIN et non un tremblement.
#: Quarante-cinq degrés : un empattement tourne à angle droit, une courbe de
#: panse ne dévie que de quelques degrés par abscisse.
COIN = math.radians(45)


def _anguleux(guide):
    """Les indices où le guide CHANGE DE DIRECTION franchement."""
    dur = set()
    for i in range(1, len(guide) - 1):
        ax, ay = guide[i][0] - guide[i - 1][0], guide[i][1] - guide[i - 1][1]
        bx, by = guide[i + 1][0] - guide[i][0], guide[i + 1][1] - guide[i][1]
        na, nb = math.hypot(ax, ay), math.hypot(bx, by)
        if na < 1e-9 or nb < 1e-9:
            continue
        cos = max(-1.0, min(1.0, (ax * bx + ay * by) / (na * nb)))
        if math.acos(cos) > COIN:
            dur.add(i)
    return dur


def _lisser(pts, dur=frozenset(), tours=2):
    """Moyenne mobile sur trois points, en tenant les BOUTS et les COINS.

    Chaque abscisse rend la moyenne d'une poignée de pixels, et une poignée de
    pixels est bruitée : sur un trait droit, l'axe tremblait d'une unité ou deux
    d'un point à l'autre — invisible isolément, très visible une fois relié par
    des cubiques, qui amplifient toute inflexion.

    ⚠️ **MAIS UN EMPATTEMENT N'EST PAS UN TREMBLEMENT.** Lissé sans réserve, le
      `i` perdait sa base et le `l` son angle : ils devenaient mous là où la
      police est franche. Les sommets que le GUIDE déclare anguleux — plus de
      quarante-cinq degrés de changement de direction — sont donc tenus, comme
      les extrémités, qui portent les contacts.
    """
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


def _contacts(pa, pb):
    """Les extrémités de `pa` qui touchent `pb` — indices 0 et/ou −1.

    ⚠️ **AU SEGMENT, PAS AUX POINTS.** Une extrémité qui vient buter au MILIEU
      d'un trait — le pied du `T`, l'épaule du `r`, la barre du `e` — peut être
      loin de tous les points échantillonnés de l'autre et pourtant le toucher.
      Mesurée aux points, elle paraissait libre : le `e` et le `r` gagnaient une
      extrémité que la recette n'a pas.
    """
    out = []
    for i in (0, -1):
        d = min(_distSegment(pa[i], pb[k], pb[k + 1]) for k in range(len(pb) - 1)) \
            if len(pb) > 1 else math.hypot(pa[i][0] - pb[0][0], pa[i][1] - pb[0][1])
        if d <= CONTACT:
            out.append(i)
    return out


def apparier(ch, recette):
    """Repose les traits DÉCLARÉS de `recette` sur le squelette MESURÉ de `ch`.

    `recette` est le couple `(traits, jonctions)` que `jetbrains-traces.py`
    produit. Les jonctions ressortent telles quelles — c'est tout l'objet : la
    topologie ne se remesure pas.
    """
    # ⚠️ Trois outils empruntés au générateur de recettes, et pas recopiés :
    #   suivre un tracé, en mesurer l'abscisse curviligne, y prendre un point.
    #   Deux copies finiraient par échantillonner deux courbes différentes.
    from jetbrains_traces import points_du_trace, _curviligne, _au  # noqa: E402
    globals().setdefault('points_du_trace', points_du_trace)

    subs = contours(ch)
    g, ox, oy, W, H = rasteriser(subs)
    brut = amincir(g)
    iles = petitesIles(brut)
    sk = ebarber(brut, seuil=20, iles=iles)
    versRepere = (lambda p: (ox + (p[0] + 0.5) * PAS, oy + (p[1] + 0.5) * PAS))

    traits, jonctions = recette
    guides = []
    for t in traits:
        pts = points_du_trace(t['d'])
        s, longueur = _curviligne(pts)
        guides.append([_au(pts, s, longueur, k / ABSCISSES) for k in range(ABSCISSES + 1)])

    # ① chaque pixel du squelette rejoint le trait, puis l'abscisse, les plus proches
    seaux = [[[] for _ in range(ABSCISSES + 1)] for _ in traits]
    for j in range(H):
        for i in range(W):
            if not sk[j][i]:
                continue
            p = versRepere((i, j))
            if p in iles:
                continue
            choix, meilleur = None, None
            for t, guide in enumerate(guides):
                k, d = _projeter(p, guide)
                if meilleur is None or d < meilleur:
                    meilleur, choix = d, (t, k)
            seaux[choix[0]][choix[1]].append(p)

    # ② l'abscisse rend la MOYENNE de ce qui lui est tombé ; là où rien n'est
    #    tombé — un bout de guide qui traverse une zone que le squelette
    #    n'occupe pas —, le guide parle pour lui-même.
    lignes = []
    for t, guide in enumerate(guides):
        # ⚠️ Un trait DÉGÉNÉRÉ — le point du `i`, du `j` — n'a pas d'axe à
        #   mesurer : c'est un sous-chemin réduit à un point, et le rééchantil-
        #   lonner en vingt-quatre abscisses lui ferait quatre extrémités là où
        #   il n'en a qu'une. Il passe tel que la recette l'écrit.
        if max(abs(q[0] - guide[0][0]) + abs(q[1] - guide[0][1]) for q in guide) < 1e-6:
            lignes.append(list(guide))
            continue
        # ⚠️ **UNE ABSCISSE SANS PIXEL NE PREND PAS LE GUIDE — elle s'interpole.**
        #
        #   Le guide est DEVINÉ (des arcs), la moyenne est MESURÉE : les alterner
        #   sur une même ligne fait osciller le tracé entre deux dessins qui ne
        #   coïncident pas. Sur les traits droits et longs — le fût du `i`, celui
        #   du `l`, la hampe du `f` —, où les pixels se répartissent inégalement,
        #   une abscisse sur trois retombait sur le guide et la ligne serpentait.
        #   Les trous se comblent donc entre les points MESURÉS qui les
        #   encadrent, et le guide ne parle que là où il n'y a rien du tout.
        mesures = [None] * len(guide)
        for k in range(len(guide)):
            lot = seaux[t][k]
            if lot:
                mesures[k] = (sum(z[0] for z in lot) / len(lot),
                              sum(z[1] for z in lot) / len(lot))
        connus = [k for k, m in enumerate(mesures) if m is not None]
        ligne = []
        for k, q in enumerate(guide):
            if mesures[k] is not None:
                ligne.append(mesures[k])
            elif connus:
                avant = max([c for c in connus if c < k], default=None)
                apres = min([c for c in connus if c > k], default=None)
                if avant is None:
                    ligne.append(mesures[apres])
                elif apres is None:
                    ligne.append(mesures[avant])
                else:
                    f = (k - avant) / (apres - avant)
                    a0, a1 = mesures[avant], mesures[apres]
                    ligne.append((a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f))
            else:
                ligne.append(q)
        lignes.append(_lisser(ligne, _anguleux(guide)))

    # ③ ★ **LES CONTACTS SE REPRODUISENT, ils ne se décrètent pas.**
    #
    #    Chaque point ayant bougé de quelques unités, deux traits que la recette
    #    disait joints ne se touchent plus tout à fait — et `deriveGlyph` compte
    #    alors deux extrémités libres de plus. Mesuré : sept lettres changeaient
    #    de compte, dont le `w` qui passait de deux extrémités à quatre.
    #
    #    ⚠️ Mais RECOLLER LES DEUX SENS D'UNE JONCTION est faux, et ça se voit
    #      aussi : sur un `T`, l'extrémité d'un trait touche le MILIEU de
    #      l'autre, qui garde ses deux bouts libres. Coller des deux côtés
    #      SUPPRIMAIT des extrémités — le `f`, le `t`, le `x` passaient de
    #      quatre à deux, et le compte devenait faux dans l'autre sens.
    #
    #    On relève donc sur la RECETTE quelles extrémités touchent réellement,
    #    et l'on reproduit ce schéma-là. La topologie n'est pas seulement
    #    transportée : elle est reproduite à l'identique, contact par contact.
    origines = [points_du_trace(t['d']) for t in traits]
    for jonc in jonctions:
        a, b = int(jonc[0]), int(jonc[1])
        if not (0 <= a < len(lignes) and 0 <= b < len(lignes)):
            continue
        for (u, v) in ((a, b), (b, a)):
            for iBout in _contacts(origines[u], origines[v]):
                p = lignes[u][iBout]
                lignes[u][iBout] = min(lignes[v], key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)

    sortie = [{'d': catmull(allege(ligne, 14)), 'ouvert': traits[t].get('ouvert', True)}
              for t, ligne in enumerate(lignes)]
    return sortie, jonctions


if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'js':
    import pathlib as _pl
    lignes = ["/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-squelette.py` — ne pas éditer à la main.",
              " *",
              " * Le SQUELETTE extrait par érosion des contours de JetBrains Mono, sous ses",
              " * TROIS formes : `SQUELETTES` tel que l'amincissement le rend, `RECALES` une",
              " * fois chaque point reposé au milieu exact des deux bords, et `APPARIES` —",
              " * les traits DÉCLARÉS par les recettes, reposés sur le squelette MESURÉ.",
              " *",
              " * ★ `APPARIES` est le seul des trois à porter des JONCTIONS, donc le seul dont",
              " *   les comptes soient utilisables : sa topologie ne se mesure pas, elle se lit.",
              " * Ce ne sont ni les tracés du moteur (`moteur/tables/glyphes.js` fait foi) ni",
              " * les candidats des recettes : ce sont deux lectures de plus, que la page de",
              " * comparaison met à côté des autres.",
              " *",
              " * ⚠️ Le DÉCOUPAGE en traits n'est fiable ni dans l'une ni dans l'autre : voir",
              " *   l'en-tête du générateur. Le dessin, lui, l'est.",
              " */"]
    # ★ La TROISIÈME lecture : les traits déclarés par les recettes, reposés sur
    #   le squelette mesuré. C'est la seule des trois qui porte des JONCTIONS,
    #   donc la seule dont les comptes soient utilisables.
    import importlib.util as _iu
    _sp = _iu.spec_from_file_location('jetbrains_traces',
                                      str(_pl.Path(__file__).resolve().parent / 'jetbrains-traces.py'))
    _tr = _iu.module_from_spec(_sp)
    sys.modules['jetbrains_traces'] = _tr
    _argv = sys.argv
    sys.argv = [_argv[0]]
    _sp.loader.exec_module(_tr)
    sys.argv = _argv
    _rec = _tr.recettes(_tr.mesures())

    lignes.append('export const APPARIES = {')
    for ch in 'abcdefghijklmnopqrstuvwxyz':
        t, jonc = apparier(ch, _rec[ch])
        lignes.append("  %r: { traits: [%s], jonctions: %s }," % (
            ch,
            ', '.join("{ d: %r, ouvert: %s }" % (x['d'], 'true' if x['ouvert'] else 'false') for x in t),
            '[' + ', '.join('[%d, %d]' % (j[0], j[1]) for j in jonc) + ']'))
    lignes.append('};')
    lignes.append('')

    for nom, recale in (('SQUELETTES', False), ('RECALES', True)):
        lignes.append('export const %s = {' % nom)
        for ch in 'abcdefghijklmnopqrstuvwxyz':
            t = traces(ch, recale=recale)
            lignes.append("  %r: [%s]," % (ch, ', '.join(
                "{ d: %r, ouvert: %s }" % (x['d'], 'true' if x['ouvert'] else 'false') for x in t)))
        lignes.append('};')
        lignes.append('')
    cible = _pl.Path(__file__).resolve().parent / '_glyphes-squelette.js'
    cible.write_text('\n'.join(lignes) + '\n')
    print('→ src/gfx/_glyphes-squelette.js (squelette + recalé)')

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'svg':
    lettres = sys.argv[1]
    CEL, MARG = 170, 14
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{len(lettres)*(CEL+MARG)+MARG}" height="{CEL*1.5+2*MARG}" '
             f'viewBox="0 0 {len(lettres)*(CEL+MARG)+MARG} {CEL*1.5+2*MARG}"><rect width="100%" height="100%" fill="#14161a"/>']
    for n, ch in enumerate(lettres):
        subs = contours(ch)
        g, ox, oy, W, H = rasteriser(subs)
        brut = amincir(g)
        sk = ebarber(brut, seuil=20, iles=petitesIles(brut))
        ech = CEL / (W * PAS)
        parts.append(f'<g transform="translate({MARG + n*(CEL+MARG)},{MARG}) scale({ech}) translate({-ox},{H*PAS+oy}) scale(1,-1)">')
        d = ' '.join('M %.1f %.1f ' % s[0] + ' '.join('L %.1f %.1f' % p for p in s[1:]) + ' Z' for s in subs)
        parts.append(f'<path d="{d}" fill="#5b6b8a" fill-rule="nonzero"/>')
        for j in range(H):
            for i in range(W):
                if sk[j][i]:
                    parts.append(f'<rect x="{ox+i*PAS}" y="{oy+j*PAS}" width="{PAS}" height="{PAS}" fill="#e05c4a"/>')
        parts.append('</g>')
    parts.append('</svg>')
    open('/tmp/sk.svg', 'w').write('\n'.join(parts))
    print('→ /tmp/sk.svg')


# ═══════════════════════════════════════════════════════════════════════════
#  ④ LE PROLONGEMENT — rendre la longueur que l'amincissement a mangée.
#
#  > « Compare les extrémités du squelette aux extrémités de la font d'origine
#  >   pour repérer la longueur manquante due à la réduction/affinage effectuée
#  >   plus tôt. Repère aussi la direction dans laquelle s'arrête l'extrémité
#  >   dans la font d'origine, pour t'assurer que tu es raccord (attention, sur
#  >   la plupart des lettres le trait s'arrête à la perpendiculaire comme sur
#  >   le bas de t, mais sur v w x y non). » (l'auteur)
#
#  ★ **ET LA DIRECTION N'A PAS BESOIN D'ÊTRE CLASSÉE.** On avance dans le sens
#    de la TANGENTE du squelette jusqu'à sortir du contour, et l'on s'arrête au
#    dernier point encore dedans. Une terminaison coupée perpendiculairement au
#    trait — le pied du `t` — arrête la marche tout de suite ; une terminaison
#    coupée en biais — les branches du `v`, du `w`, du `x`, du `y`, qui finissent
#    à l'horizontale sur un trait oblique — la laisse aller plus loin, jusqu'au
#    coin. Le cas particulier que l'auteur signale se règle donc tout seul :
#    c'est le contour qui décide, pas une règle écrite à la main.
# ═══════════════════════════════════════════════════════════════════════════
