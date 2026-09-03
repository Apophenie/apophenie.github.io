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

⚠️ **CE QUI RESTE, ET POURQUOI CE N'EST PAS UN RÉGLAGE.** Le découpage en TRAITS
  n'est pas propre sur les lettres à panse tangente — `b d g p q`. Là où la
  panse rejoint le fût, elle ne le touche pas en un point mais le longe sur une
  zone ; l'amincissement y sème une échelle de petits « Y » répartis sur toute
  la tangence, trop éloignés les uns des autres pour se fusionner par
  proximité. Un `b`, qui a deux jonctions, en déclare six.

  Ce n'est pas gênant pour le DESSIN — le squelette est juste — mais ça l'est
  pour `glyphes.js`, qui demande des sous-chemins nommés et des jonctions
  déclarées, et dont les comptes nourrissent `mtrb`, `mexb` et `mbob`. Il
  manque la simplification de graphe : fusionner les branches qui se prolongent
  (angle proche de 180° au carrefour) pour reconstituer des traits continus.

⚠️ **CE FICHIER NE PRODUIT DONC RIEN QUI ENTRE DANS LE DÉPÔT.** `glyphes.js`
  fait toujours foi, et les candidats de `jetbrains-traces.py` restent ceux que
  montre `AB-glyphes.html`. On garde le prototype parce qu'il a déjà répondu à
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
                        if 0 <= a2 < W and 0 <= b2 < H and sk[b2][a2] and (a2,b2) not in dedans:
                            suite = (a2,b2); break
                    if suite is None: break
                    vus_arc.add(((i,j),suite)); vus_arc.add((suite,(i,j)))
                    chemin.append(suite); dedans.add(suite); i, j = suite
                if len(chemin) > 1: out.append(chemin)
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
def ebarber(sk, seuil):
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
        for (i, j) in br:
            if (i, j) not in appartient:  # jamais un pixel de carrefour
                sk[j][i] = 0
    return sk


if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'svg':
    lettres = sys.argv[1]
    CEL, MARG = 170, 14
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{len(lettres)*(CEL+MARG)+MARG}" height="{CEL*1.5+2*MARG}" '
             f'viewBox="0 0 {len(lettres)*(CEL+MARG)+MARG} {CEL*1.5+2*MARG}"><rect width="100%" height="100%" fill="#14161a"/>']
    for n, ch in enumerate(lettres):
        subs = contours(ch)
        g, ox, oy, W, H = rasteriser(subs)
        sk = ebarber(amincir(g), seuil=8)
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
