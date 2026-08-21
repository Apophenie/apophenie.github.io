# -*- coding: utf-8 -*-
"""Logo NumHeroLOLgeek — round 9.  Génère `_logo-test.html` (banc d'essai).

Bâton géométrique monolinéaire — Jost*, OFL — sans empattement, sans gras,
sans délié : trait d'épaisseur uniforme.

Lecture au repos  : « Numérologie »  (11 glyphes, un seul bloc compact)
Lecture révélée   : « num | hero | lol | geek »

Acquis, validé, à ne pas toucher :
  · la graphie « Numérologie » au repos : le h à 60° à cheval sur m|é, le L à
    60° entre le o et le g ;
  · la réserve latérale : le mot est compact au repos et S'ÉCARTE au clic, sans
    jamais être réduit pour faire de la place ;
  · l'animation jusqu'à la fin de « lol » (l'écartement, le h, le L).

Round 7 — la fin du mot, « g i e » → « g e e k », est refaite une fois de plus.
Les rounds précédents SUGGÉRAIENT le k (un fût planté sur la panse d'un c) : ça
se lit « b », l'auteur l'a constaté, la piste est abandonnée. Ici on ne suggère
plus le k : on le CONSTRUIT, avec le k de Jost lui-même, démonté en trois
barres. Les planches de preuve des impasses restent dans le banc.

État de repos, simple : `g` `i` (fût plein + point) `e` (un e entier).
État d'arrivée   : `g` `e` `e` `k`.
Trois fragments, trois trajets, aucune lettre effacée ni surgie :
  · le POINT du i est un e miniature. Il DESCEND à la place qu'occupait le i et
    prend sa taille normale : c'est le premier `e` de geek.
  · le `e` FINAL ne se transforme pas — il est déjà le second `e` de geek. Il
    glisse seulement vers la droite pour laisser sa place au premier.
  · le FÛT du i est le fût du `k`, couché en réserve à la hauteur d'x. Il
    PIVOTE SOUS LE `e` FINAL comme un satellite, sur 180° : il part de la
    gauche du e, passe par en dessous, remonte à sa droite. Une fois arrivé, il
    S'ALLONGE (hauteur d'x → hauteur de hampe) ; c'est seulement là que les
    deux BARRES du k apparaissent, couchées dedans, et s'ouvrent (round 9).
La descente du point et l'orbite sont SIMULTANÉES : deux fragments du même i
qui partent chacun de leur côté. C'est ce qui rend l'ensemble lisible.
Aucun « 6 » dans le logo : la seule mention d'un 6 dans l'identité est le
favicon (voir `favicon()` plus bas).

Round 8 — LE RYTHME. Les mouvements ne changent pas, leur minutage si. Tout
partait ensemble et durait 1,5 s : l'œil ne pouvait pas suivre. Désormais
QUATRE ÉTAPES SUCCESSIVES, une chose à la fois (voir `ETAPES`) :
  ① 1 s   faire la place pour le h — l'écart num|hero — et y déplacer le h ;
  ② 1 s   séparer hero de la suite, faire la place pour le l, l'y descendre ;
  ③ 1 s   décaler le e final PENDANT que l'autre e descend et grandit PENDANT
          que la barre passe sous le e final et le dépasse. Seule étape où
          trois choses bougent ensemble : elles sont indissociables ;
  ④ 0,5 s les deux barres du k s'ouvrent.
La FERMETURE n'est pas la marche arrière : elle suit l'ordre 1-2-4-3
(`ORDRE_RETOUR`). Ce n'est pas un caprice — les barres du k doivent se refermer
et disparaître (4 inversé) AVANT que le fût ne reparte en orbite (3 inversé),
sinon il voyagerait barres déployées.

Round 9 — LES DEUX BARRES DU k, sur retour de l'auteur. Le round 8 les tenait
REPLIÉES le long du fût du i, donc présentes au repos. Elles y tenaient — de
justesse : la barre du bas passe à 1,24 u du flanc du fût. Sur un logo rendu à
900 px de large, où le fût fait 9 px, ça fait 0,14 px ; à la taille du titre du
site, 0,08. C'est sous la résolution du rastériseur, et les deux bords
antialiasés ne s'annulent pas : il reste un filet d'un pixel sur la tranche du
fût. Mesuré au pixel sur le rendu au repos, chromium et firefox : 33 pixels
d'écart, jusqu'à 15/255 de contraste, entre le logo avec les barres et le même
sans. Après le round 9 : ZÉRO pixel d'écart, la même mesure. L'auteur le
voyait ; il avait raison de le voir. Trois changements, et rien d'autre :
  · au repos les deux barres sont ABSENTES (`opacity:0`) — pas repliées, pas
    discrètes : absentes. Il ne reste RIEN à voir sur le fût du i ;
  · elles APPARAISSENT à la fin de l'étape ③, quand le fût a pris sa place à
    droite du e final ET sa hauteur définitive — celle du bas 50 ms plus tard,
    à l'instant où elle s'ouvre à son tour, ce qui ne se distingue de rien
    puisqu'elle est couchée dans le fût dans les deux cas. Elles y sont
    couchées, à taille réelle : invisibles à l'instant où elles naissent. Ce
    qu'on voit, ce n'est pas leur apparition, c'est leur ouverture. Le palier
    qui les allume est franchi d'un PAS, jamais en fondu (`_keyframes`,
    paramètre `presence`) ;
  · elles s'ouvrent COMME UN COMPAS, chacune depuis son BOUT — son extrémité
    extérieure : la barre du haut pivote par le haut, celle du bas par le bas
    (`barre_couchee`). Le round 8 pivotait par la charnière, c'est-à-dire par
    le point de jonction avec le fût. Le bout ne peut pas rester immobile (il
    est sur le fût couché, à 260 u de son arrivée) : rotation et translation
    sont donc SIMULTANÉES, et c'est précisément ce qui garde le pied de la
    barre collé au fût pendant tout le trajet.
Ce que le round 8 imposait — qu'une barre repliée tienne dans la largeur du
fût — n'a plus lieu d'être au repos, puisqu'elles n'y sont pas ; la contrainte
ne vaut plus que pour l'INSTANT de l'apparition, et elle est tenue.

Trois commandes gouvernent l'écartement, une par étape qui écarte : `--u1`
(l'écart num|hero), `--u2` (les écarts hero|lol et lol|geek), `--u3`
(l'expansion interne de geek : le e qui glisse, le k qui vient derrière lui).
Chacune vaut 1 au repos et 0 une fois son écart ouvert ; chaque bande de
lettres porte les trois coefficients (`--a`, `--b`, `--c`) de la combinaison
qui la place. Le mot reste CENTRÉ à tout instant. Le reste de la fin du mot —
descente du point, orbite, allongement, dépliement — garde ses `@keyframes`
propres, simplement re-minutées dans leur étape.

Trois états : repos / éveil (survol, fantômes AU TRAIT) / révélation (clic).
La révélation est pilotable pas à pas : sur le site, `src/app/logo-lecteur.js`
met en pause ces `@keyframes` et en promène le `currentTime`, ce qui donne au
logo le même lecteur (début · précédent · lecture · suivant · fin · jauge à
quatre segments) que les démonstrations.

Prérequis : fontTools, et `jost.ttf` (Jost* variable, OFL) posé ICI, à côté du
générateur, ou pointé par la variable d'environnement JOST. Le `.ttf` est un
outil de BUILD, pas une ressource du site : le logo est un tracé figé en SVG,
le navigateur n'a jamais à charger Jost pour l'afficher. Il n'a donc rien à
faire dans `src/fonts/`, qui ne contient que ce qui est servi.

Rejeu, depuis la racine du dépôt :
    python3 src/gfx/logo-jost-trace.py src/gfx/_logo-test.html
    python3 src/gfx/logo-jost-trace.py src/gfx/_logo-test.html favicon.svg --site
Le premier argument reproduit `_logo-test.html` à l'octet près ; le second, s'il
est fourni, (ré)écrit le favicon ; `--site` reporte le tracé et la mécanique
dans `src/index.html` et `src/styles/base.css`. Le générateur est idempotent :
deux exécutions de suite donnent les mêmes octets. C'est `bun run logo` qui
enchaîne les trois.

L'icône Apple (PNG, pas de SVG possible) se tire du même tracé. Le tiret du
nom de fichier interdit un `import` direct — on passe par importlib plutôt que
d'entretenir une copie du module sous un autre nom, qui divergerait :
    rsvg-convert -w 180 -h 180 -o apple-touch-icon.png favicon.svg
ou, pour un rendu dédié :
    python3 -c "import importlib.util as u; s=u.spec_from_file_location('l','logo-jost-trace.py'); \
        l=u.module_from_spec(s); s.loader.exec_module(l); \
        open('/tmp/a.svg','w').write(l.favicon(cote=180, rayon=0, marge=20))"
"""
import os, re, math

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

JOST = os.environ.get('JOST', os.path.join(os.path.dirname(__file__), 'jost.ttf'))
BASE, XH, ASC, CAP, MARGE = 900, 470.0, 780.0, 700.0, 40
LAMES = 6          # impasse du round 6, gardée en planche de preuve : preuve_pli
S_PT = .25         # le point du i : un e miniature, à cette échelle
S_FANT = .42       # le fantôme d'éveil posé sur ce point

# ── LE RYTHME ───────────────────────────────────────────────────────────────
# Quatre étapes SUCCESSIVES, en millisecondes. Une chose à la fois : c'est la
# seule façon que l'œil suive. Tout ce qui suit se déduit de cette table — la
# durée totale `--cho`, les fenêtres de chaque pièce, les vignettes du banc.
ETAPES = (1000, 1000, 1000, 500)
NOMS_ETAPES = ('la place du h', 'la place du l', 'le e et l’orbite', 'les bras du k')
CHO = sum(ETAPES)                       # 3 500 ms
# La fermeture rejoue les mêmes étapes, mêmes durées, dans CET ordre-là. Les
# bras du k doivent se replier (④ inversé) AVANT que la barre ne reparte en
# orbite (③ inversé) : sinon elle voyagerait bras déployés.
ORDRE_RETOUR = (1, 2, 4, 3)
# Sous-minutage de l'étape ③, en fraction de l'étape. Les trois mouvements sont
# simultanés mais pas exactement coextensifs : le glissement du e finit un peu
# avant l'orbite, et l'allongement du fût occupe la fin.
F_ORB, F_GLIS = .775, .725
# Sous-minutage de l'étape ④ : la barre du bas part après celle du haut,
# jamais avec. C'est ce décalage qui fait LIRE deux ouvertures distinctes —
# l'une par le haut, l'autre par le bas — au lieu d'un seul évasement
# symétrique. Chaque barre APPARAÎT à l'instant où elle s'ouvre, pas avant :
# celle du haut à la fin de l'étape ③, celle du bas 50 ms plus tard. Rien ne
# distingue les deux instants à l'œil, puisqu'une barre qui vient d'apparaître
# est encore couchée dans le fût ; mais tenir la barre du bas absente 50 ms de
# plus, c'est 50 ms de moins où elle affleure la tranche du fût.
F_BRAS, F_JAMBE = (0., .8), (.1, 1.)
# la courbe de l'orbite : lente au départ, rapide au point bas, lente à
# l'arrivée — le rythme d'un satellite qui plonge et remonte.
COURBE_ORB = (.55, 0, .3, 1)
# L'ouverture d'un écart, et avec elle le h et le l. La courbe d'avant,
# (.3,.8,.3,1), était taillée pour une fenêtre de 675 ms : elle expédiait 92 %
# du trajet dans la première moitié. Étirée sur une seconde, elle donnait un
# geste bref suivi d'un temps mort — l'inverse de ce qu'on cherche, qui est de
# pouvoir SUIVRE le mouvement. C'est celle du moteur visuel (`EASE.move`,
# src/visuel/constants.js) qui prend la place : accélération et freinage
# symétriques, le trajet occupe la seconde entière.
COURBE_ECART = (.4, 0, .2, 1)
COURBE_GLIS = (.45, 0, .25, 1)          # le e final qui se décale
# L'ouverture d'une barre du k. Fenêtre courte (400 à 450 ms) : la courbe
# d'écart d'avant, taillée pour ces durées-là, reprend ici du service — départ
# franc, freinage long, le compas se pose au lieu de claquer.
COURBE_COMPAS = (.3, .8, .3, 1)
# Les deux barres du k : ce qu'elles valent DANS leur étape, et dehors. C'est
# la seule pièce de la chorégraphie qui n'existe pas en permanence.
PRESENCE = ('opacity:1', 'opacity:0')
# le creux : de combien l'orbite s'enfonce sous le cercle au point bas. Sans
# lui, le fût ne passe que de 72 u sous le e — quatre pixels à la taille du
# titre : on ne VOIT pas qu'il passe dessous. Avec, il en passe 130.
CREUX = 55

_c = {}
def police(w=400):
    if w not in _c:
        f = instantiateVariableFont(TTFont(JOST), {'wght': w}, inplace=True)
        _c[w] = (f, f.getGlyphSet(), f.getBestCmap(), f['hmtx'])
    return _c[w]

def ADV(ch):
    f, gs, cm, hm = police(); return hm[cm[ord(ch)]][0]

def bbox(ch):
    f, gs, cm, hm = police()
    p = BoundsPen(gs); r = DecomposingRecordingPen(gs); gs[cm[ord(ch)]].draw(r); r.replay(p)
    return p.bounds

def d_of(ch, scale=1.0, dx=0.0, dy=0.0):
    f, gs, cm, hm = police()
    pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    t = Transform(scale, 0, 0, -scale, dx, BASE - dy)
    rec = DecomposingRecordingPen(gs); gs[cm[ord(ch)]].draw(rec); rec.replay(TransformPen(pen, t))
    return pen.getCommands()

def _cercle_min(pts):
    """Plus petit cercle englobant (Welzl). Centrer le glyphe sur CE centre est
    la seule façon qu'il loge « pile » : un cadrage sur la boîte englobante, ou
    sur son centre, laisse toujours du jeu d'un côté."""
    import random
    def c2(a, b):
        return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), math.hypot(a[0] - b[0], a[1] - b[1]) / 2
    def c3(a, b, c):
        ax, ay = a; bx, by = b; cx, cy = c
        d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
        if abs(d) < 1e-12: return None
        ux = ((ax*ax+ay*ay)*(by-cy) + (bx*bx+by*by)*(cy-ay) + (cx*cx+cy*cy)*(ay-by)) / d
        uy = ((ax*ax+ay*ay)*(cx-bx) + (bx*bx+by*by)*(ax-cx) + (cx*cx+cy*cy)*(bx-ax)) / d
        return (ux, uy), math.hypot(ax - ux, ay - uy)
    def dedans(p, cr):
        return cr and math.hypot(p[0] - cr[0][0], p[1] - cr[0][1]) <= cr[1] + 1e-9
    P = list({(round(x, 6), round(y, 6)) for x, y in pts})
    random.Random(0).shuffle(P)
    cr = None
    for i, p in enumerate(P):
        if dedans(p, cr): continue
        cr = (p, 0.0)
        for j, q in enumerate(P[:i]):
            if dedans(q, cr): continue
            cr = c2(p, q)
            for k in P[:j]:
                if dedans(k, cr): continue
                n = c3(p, q, k)
                if n: cr = n
    return cr


def _points_t(ch, t):
    """Tous les points du contour transformé — sert à mesurer le rayon réel du
    tracé, ce qu'une boîte englobante ne dit pas."""
    f, gs, cm, hm = police(500)
    rec = DecomposingRecordingPen(gs); gs[cm[ord(ch)]].draw(rec)
    pts = []
    class P:
        def moveTo(self, p): pts.append(p)
        def lineTo(self, p): pts.append(p)
        def curveTo(self, *a): pts.extend(a)
        def qCurveTo(self, *a): pts.extend([x for x in a if x])
        def closePath(self): pass
        def endPath(self): pass
        def addComponent(self, *a): pass
    rec.replay(TransformPen(P(), t))
    return pts


def _bbox_t(ch, t):
    f, gs, cm, hm = police()
    p = BoundsPen(gs); r = DecomposingRecordingPen(gs); gs[cm[ord(ch)]].draw(r)
    r.replay(TransformPen(p, t)); return p.bounds

def geom_k():
    """Le `k` de Jost, DÉMONTÉ en trois barres — on ne redessine pas un k, on
    désosse celui de la police, et le remontage lui est identique au point près.

    Le glyphe a deux contours, tous deux polygonaux : le fût (un rectangle) et
    les deux bras (un hexagone en « < »). L'hexagone se scinde en DEUX
    parallélogrammes le long de la coupe qui les pose sur le fût — deux sommets
    diamétralement opposés qui partagent la même ordonnée. Leur réunion redonne
    l'hexagone : l'arête commune s'annule.

    Renvoie (fût, bras haut, jambe, charnière, bout du bras, bout de la jambe),
    en unités de police (y vers le haut)."""
    f, gs, cm, hm = police()
    rec = DecomposingRecordingPen(gs); gs[cm[ord('k')]].draw(rec)
    cont = []
    for op, args in rec.value:
        if op == 'moveTo': cont.append([args[0]])
        elif op == 'lineTo': cont[-1].append(args[0])
        elif op == 'closePath': continue
        else: raise SystemExit('le k de Jost n’est plus polygonal (%s)' % op)
    assert len(cont) == 2, 'le k n’a plus deux contours : %d' % len(cont)
    fut, bras = sorted(cont, key=len)
    assert len(fut) == 4 and len(bras) == 6, 'le k n’a plus la forme attendue'
    j = [i for i in range(3) if bras[i][1] == bras[i + 3][1]]
    assert len(j) == 1, 'la coupe qui pose les bras du k sur son fût est introuvable'
    i0 = j[0]; i1 = i0 + 3
    q = ([bras[k % 6] for k in range(i0, i1 + 1)],
         [bras[k % 6] for k in range(i1, i0 + 7)])
    bout = lambda p: ((p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2)
    haut, bas = q if bout(q[0])[1] > bout(q[1])[1] else (q[1], q[0])
    charniere = ((bras[i0][0] + bras[i1][0]) / 2, bras[i0][1])
    return fut, haut, bas, charniere, bout(haut), bout(bas)


def barre_couchee(q, ch, bout, kx0, kx1, ky0, ky1):
    """Une des deux barres du k, COUCHÉE DANS LE FÛT, à sa taille définitive.

    C'est l'état où elle APPARAÎT, à la fin de l'étape ③ : confondue avec le
    fût, invisible en tant que barre, et déjà à sa taille — elle ne grandira
    plus. On l'y met en la faisant tourner AUTOUR DE SON BOUT, l'extrémité
    extérieure, celle qui sert de pivot au compas ; il n'y a rien à choisir
    quant au sens : le bout de la barre du haut est au-dessus de la charnière,
    celui de la barre du bas en dessous, et c'est ce signe-là qui dit de quel
    côté la coucher. Puis on la glisse pour la centrer sur l'axe du fût, en lui
    laissant SA HAUTEUR D'ARRIVÉE tant que le fût le permet : le bout de la
    barre du haut ne bougera donc qu'à l'horizontale, et celui de la barre du
    bas est simplement remonté de ce qu'il faut (31,6 u) pour que son coin de
    charnière ne passe pas sous le pied du fût.

    Le jeu qui reste est le MINIMUM géométrique : la plus petite largeur d'un
    parallélogramme est aire/grand côté, soit 68,9 u pour la barre du haut et
    77,5 u pour celle du bas, dans un fût de 80. On ne peut pas faire mieux
    sans redessiner le k — ce qui est exclu. C'est pourquoi les barres sont
    ABSENTES au repos plutôt que couchées : couchées en permanence, il reste de
    quoi voir un filet d'un pixel sur la tranche du fût.

    Renvoie (rotation CSS en degrés, dx, dy, boîte) — dx, dy et la boîte en
    unités de police, y vers le haut ; c'est `_depli` qui retourne dy pour le
    CSS, où y descend."""
    vx, vy = ch[0] - bout[0], ch[1] - bout[1]
    long_ = math.hypot(vx, vy)
    # l'angle qui met le grand axe à la verticale, bout du bon côté
    phi = math.atan2(math.copysign(long_, vy), 0.) - math.atan2(vy, vx)
    co, si = math.cos(phi), math.sin(phi)
    R = [(bout[0] + co * (x - bout[0]) - si * (y - bout[1]),
          bout[1] + si * (x - bout[0]) + co * (y - bout[1])) for x, y in q]
    x0 = min(p[0] for p in R); x1 = max(p[0] for p in R)
    y0 = min(p[1] for p in R); y1 = max(p[1] for p in R)
    dx = (kx0 + kx1) / 2 - (x0 + x1) / 2
    dy = 0.
    if y0 + dy < ky0: dy = ky0 - y0
    if y1 + dy > ky1: dy = ky1 - y1
    boite = (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
    assert kx0 <= boite[0] and boite[2] <= kx1 and ky0 <= boite[1] and boite[3] <= ky1, (
        'une barre couchée déborde du fût du k : %r' % (boite,))
    return -math.degrees(phi), dx, dy, boite


def poly(pts, dx=0.0):
    """Un polygone fermé, en coordonnées SVG."""
    return 'M' + 'L'.join('%s %s' % (_n(x + dx), _n(BASE - y)) for x, y in pts) + 'Z'


def constantes():
    """Tous les nombres de la chorégraphie de « gie » → « geek ».

    Ils se déduisent des SEULS contours de Jost : rayon de l'orbite, glissement
    du e, compression du fût, angle de pli des bras. Aucun ne dépend de la mise
    en page — c'est ce qui permet à la feuille de style (une seule, partagée par
    le banc d'essai et le site) de porter des valeurs littérales tout en restant
    une conséquence de la fonte et non une retouche à la main."""
    BL, _, BR, _ = bbox('l'); larg = BR - BL           # 80 u : l'épaisseur du fût
    IL, _, IR, IT = bbox('i'); diam = IR - IL          # le point du i est rond
    pt = (IL + larg / 2, IT - diam / 2)                 # son centre, sur l'axe du fût
    eb = bbox('e')
    assert eb[3] == XH, 'le e ne monte plus pile à la hauteur d’x : %r' % (eb,)
    fut, haut, bas, ch, bh, bb = geom_k()
    kx0 = min(p[0] for p in fut); kx1 = max(p[0] for p in fut)
    ky0 = min(p[1] for p in fut); ky1 = max(p[1] for p in fut)
    assert round(kx1 - kx0) == round(larg), 'le fût du k n’a plus l’épaisseur d’un l'
    assert (ky0, ky1) == (0, ASC), 'le fût du k ne va plus du pied à la hampe'
    ec = (eb[0] + eb[2]) / 2                            # centre d'encre du e, en x
    kc = (kx0 + kx1) / 2                                # axe du fût du k
    # l'orbite : le fût du i tourne autour du centre du e final, qui glisse
    # pendant ce temps. Rayon au départ (le fût est à gauche du e) et à
    # l'arrivée (il est devenu le fût du k, à droite).
    # les deux barres du k, couchées dans le fût : l'état où elles apparaissent
    b_h = barre_couchee(haut, ch, bh, kx0, kx1, ky0, ky1)
    b_b = barre_couchee(bas, ch, bb, kx0, kx1, ky0, ky1)
    c = dict(
        larg=larg, pt=pt, eb=eb, fut=fut, haut=haut, bas=bas, ch=ch,
        kx0=kx0, kx1=kx1, ky0=ky0, ky1=ky1, kc=kc, ec=ec,
        s_k=XH / (ky1 - ky0),                           # le fût couché à hauteur d'x
        r0=ADV('i') + ec - (IL + larg / 2),             # rayon au départ
        r1=ADV('e') + kc - ec,                          # rayon à l'arrivée
        glis=ADV('e') - ADV('i'),                       # le glissement du e final
        e1dx=pt[0] - ec,                                # le point du i, d'où il tombe…
        e1dy=(eb[1] + eb[3]) / 2 - pt[1],               # …et de quelle hauteur
        bout_h=bh, barre_h=b_h[:3], boite_h=b_h[3],     # la barre du haut…
        bout_b=bb, barre_b=b_b[:3], boite_b=b_b[3],     # …et celle du bas
    )
    c['ecart_k'] = ((ky0 + ky1) / 2 - XH / 2, c['r0'] - c['r1'])
    return c

def mobile(ch, x_rev, s_repos, deg, centre_repos):
    """Le h et le L : tracés bakés DEBOUT, PLEINE TAILLE, à leur place révélée ;
    l'état de repos (réduit, pivoté, relevé) est obtenu en CSS autour du centre
    de la boîte d'encre. Renvoie (d, dx, dy)."""
    t_bake = Transform(1, 0, 0, -1, x_rev, BASE)
    x0, y0, x1, y1 = _bbox_t(ch, t_bake)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    t_css = (Transform().translate(cx, cy).rotate(math.radians(deg)).scale(s_repos, s_repos)
                        .translate(-cx, -cy)).transform(t_bake)
    rx0, ry0, rx1, ry1 = _bbox_t(ch, t_css)
    return (d_of(ch, dx=x_rev),
            round(centre_repos[0] - (rx0 + rx1) / 2),
            round(centre_repos[1] - (ry0 + ry1) / 2))

def pose(ch, s, cx, cy):
    """Les décalages à passer à `d_of` pour que la boîte d'encre du glyphe soit
    centrée sur (cx, cy) — coordonnées SVG."""
    bl, bb, br, bt = bbox(ch)
    return cx - s * (bl + br) / 2, BASE - cy - s * (bb + bt) / 2

def _n(v, nd=1):
    """Un nombre écrit court et TOUJOURS de la même façon — le générateur doit
    rendre le même octet à chaque exécution."""
    s = ('%.*f' % (nd, v)).rstrip('0').rstrip('.')
    return '0' if s in ('', '-', '-0') else s

def rect(x, y_bas, x2, y_haut):
    return 'M%.1f %.1f H%.1f V%.1f H%.1f Z' % (x, BASE - y_bas, x2, BASE - y_haut, x)

# ─────────────────────────────────────────────────────────────────────────────
# Le mot, fente par fente. Deux gabarits : celui du repos (compact) et celui de
# la révélation (écarté). Chaque tracé est baké dans le gabarit où il vit, et
# ceux qui vivent dans les deux voyagent de l'un à l'autre par translation CSS.
CELLULES = [('g', 'N', 'num'), ('g', 'u', 'num'), ('g', 'm', 'num'),
            ('sp', None, None),
            ('mob', 'h', 'hero'),
            ('g', 'e', 'hero'), ('g', 'r', 'hero'), ('g', 'o', 'hero'),
            ('sp', None, None),
            ('g', 'l', 'lol'), ('g', 'o', 'lol'),
            ('mob', 'l', 'lol'),
            ('sp', None, None),
            ('g', 'g', 'geek'),
            ('ie', None, 'geek'),       # repos : le i ; révélé : le 1er e de geek
            ('fin', None, 'geek')]      # repos : le e ; révélé : le 2e e + le k
I_H, I_E, I_LOL, I_L, I_G, I_IE, I_FIN = 4, 5, 9, 11, 13, 14, 15

# ── qui écarte quoi, et à quelle étape ──────────────────────────────────────
# Quatre écarts. Chacun est un paquet de cellules qui s'élargissent à la
# révélation ; leur somme est exactement ce que la réserve latérale a mis de
# côté. `COMMANDE` dit quelle commande (--u1, --u2, --u3) les ouvre, donc à
# quelle étape ils s'ouvrent :
#   ① --u1  l'écart num|hero, fente du h comprise ;
#   ② --u2  l'écart hero|lol, PUIS l'écart lol|geek, fente du l comprise ;
#   ③ --u3  l'expansion interne de geek : le e final qui glisse d'une fente,
#           et la fente que le k vient occuper derrière lui.
# L'étape ④ (les bras du k) n'écarte rien : elle se déplie sur place.
ECARTS = ([3, 4], [8], [11, 12], [14, 15])
COMMANDE = (1, 2, 2, 3)


def build(ident='logo', ecart=280, s_h=.34, h_deg=60, h_dx=50, h_cy=610,
          s_L=.31, L_deg=60, L_dx=0, L_cy=620, titre='Numérologie'):
    C = constantes()
    PT, EB = C['pt'], C['eb']
    IL = bbox('i')[0]                                 # le flanc gauche du i

    w_repos = {'g': lambda c: ADV(c), 'sp': lambda c: 0, 'mob': lambda c: 0,
               'ie': lambda c: ADV('i'), 'fin': lambda c: ADV('e')}
    w_revel = {'g': lambda c: ADV(c), 'sp': lambda c: ecart, 'mob': lambda c: ADV(c),
               'ie': lambda c: ADV('e'), 'fin': lambda c: ADV('e') + ADV('k')}
    WP = [w_repos[k](c) for k, c, _ in CELLULES]
    WR = [w_revel[k](c) for k, c, _ in CELLULES]

    # le gabarit compact est centré dans le gabarit écarté : la marge réservée
    # de part et d'autre est exactement la moitié de ce que la révélation ouvre.
    reserve = (sum(WR) - sum(WP)) / 2
    XR, XP = [MARGE], [MARGE + reserve]
    for i in range(len(CELLULES)):
        XR.append(XR[-1] + WR[i]); XP.append(XP[-1] + WP[i])
    Y = lambda v: BASE - v

    # ── la place d'une bande, étape par étape ───────────────────────────────
    # Une bande ne se déplace plus d'un bloc : sa translation est la
    # combinaison a·--u1 + b·--u2 + c·--u3. Chaque écart pousse la moitié du
    # mot à droite et l'autre à gauche — le mot reste donc CENTRÉ à tout
    # instant, y compris à mi-chemin. À --u = (1,1,1) on retrouve exactement le
    # gabarit compact d'avant (les quatre bandes retombent sur 1145, 340, 60,
    # −450), et à (0,0,0) le gabarit révélé, translation nulle.
    G = [sum(WR[i] - WP[i] for i in cells) for cells in ECARTS]
    assert abs(sum(G) - 2 * reserve) < 1e-9, 'un écart s’ouvre hors de la réserve'

    def coefs(cell):
        out = [0., 0., 0.]
        for k, cells in enumerate(ECARTS):
            gauche = max(cells) < cell               # cet écart est-il à gauche ?
            out[COMMANDE[k] - 1] += G[k] / 2 - (G[k] if gauche else 0)
        return out

    def style_place(c, reste=''):
        return '--a:%s;--b:%s;--c:%s%s' % (_n(c[0], 2), _n(c[1], 2), _n(c[2], 2), reste)

    # ── la fin du mot, repos et révélation ──────────────────────────────────
    # Tout « geek » tient dans UNE bande : le g et les pièces de la
    # chorégraphie voyagent ensemble, et la chorégraphie se joue DANS ce
    # repère. Les tracés sont donc bakés en coordonnées de bande, où le
    # gabarit révélé est à l'identité ; le repos s'y déduit des chasses
    # compactes. C'est ce qui permet de dire « la barre part à gauche » : elle
    # part à gauche du groupe, et le groupe a fini de s'écarter avant.
    ux_i = XR[I_G] + ADV('g')      # la fente du i, au repos, dans la bande
    rx_e1 = XR[I_IE]               # le 1er e de geek : c'est la même abscisse…
    rx_e2 = XR[I_FIN]              # …le 2e, c'est le e final, glissé à droite
    rx_k = rx_e2 + ADV('e')        # …et le k vient après lui
    assert rx_e1 == ux_i, 'la fente du i et celle du 1er e ne coïncident plus'
    x_fut = XP[I_IE] + IL          # le fût du i, en absolu : pour les fantômes

    # ① le point du i EST un e miniature. Il DESCEND à la place qu'occupait le
    #    i et prend sa taille normale : c'est le 1er e de geek. Le tracé est
    #    donc baké à l'ARRIVÉE (un e entier, à sa fente) et c'est le REPOS qui
    #    le réduit et le remonte sur la hampe du i.
    def pieces_ie(i):
        yield ('<path class="lg-g lg-cho lg-e1" data-fente="%d" data-grp="geek" '
               'style="transform-origin:%spx %spx" d="%s"/>'
               % (i + 1, _n(rx_e1 + C['ec']), _n(Y((EB[1] + EB[3]) / 2)),
                  d_of('e', dx=rx_e1)))

    # ② le e final ne se transforme en rien : il EST le 2e e de geek. Il glisse
    #    seulement à droite pour laisser sa fente au premier.
    # ③ le fût du i est le fût du k, couché à la hauteur d'x. Il ORBITE autour
    #    du e final — 180°, par en dessous —, puis s'allonge. Trois
    #    emboîtements, un par mouvement : la position de l'orbite (elle suit le
    #    e qui glisse), l'orbite elle-même (une simple rotation : c'est ce qui
    #    la fait LIRE comme une orbite, aller comme retour), et le k lui-même
    #    (rayon, allongement).
    # ④ les deux BARRES du k, absentes jusque-là, apparaissent couchées dans le
    #    fût et s'ouvrent chacune AUTOUR DE SON BOUT — d'où un `transform-origin`
    #    par barre, posé sur son extrémité extérieure et non sur la charnière.
    def pieces_fin(i):
        yield ('<path class="lg-g lg-cho lg-e2" data-fente="%d" data-grp="geek" d="%s"/>'
               % (i + 1, d_of('e', dx=rx_e2)))
        barres = [('lg-kbras', C['haut'], C['bout_h']), ('lg-kjambe', C['bas'], C['bout_b'])]
        yield ('<g class="lg-cho lg-korb"><g class="lg-cho lg-orb" '
               'style="transform-origin:%spx %spx"><g class="lg-cho lg-k" '
               'style="transform-origin:%spx %spx">'
               '<path class="lg-g lg-kfut" data-fente="%d" data-grp="geek" d="%s"/>%s'
               '</g></g></g>'
               % (_n(rx_e2 + C['ec']), _n(Y(XH / 2)),
                  _n(rx_k + C['kc']), _n(Y((C['ky0'] + C['ky1']) / 2)),
                  i + 1, poly(C['fut'], rx_k),
                  ''.join('<path class="lg-g lg-cho %s" data-fente="%d" data-grp="geek" '
                          'style="transform-origin:%spx %spx" d="%s"/>'
                          % (cls, i + 1, _n(rx_k + bt[0]), _n(Y(bt[1])),
                             poly(q, rx_k)) for cls, q, bt in barres)))

    out = []; A = out.append
    A('<g class="lg-base">')
    bande = []
    def vider():
        if not bande: return
        A('<g class="lg-mov" style="%s">%s</g>'
          % (style_place(coefs(bande[0][0])), ''.join(x[1] for x in bande)))
        bande.clear()

    for i, (kind, ch, grp) in enumerate(CELLULES):
        if kind == 'g':
            bande.append((i, '<path class="lg-g" data-fente="%d" data-grp="%s" d="%s"/>'
                          % (i + 1, grp, d_of(ch, dx=XR[i]))))
            continue
        if kind in ('ie', 'fin'):
            bande.extend((i, m) for m in (pieces_ie if kind == 'ie' else pieces_fin)(i))
            continue
        vider()
        if kind == 'mob':
            deg, s_r, ancre = ((h_deg, s_h, (XP[I_E] + h_dx, Y(h_cy))) if ch == 'h'
                               else (L_deg, s_L, (XP[I_G] + L_dx, Y(L_cy))))
            d, dx, dy = mobile(ch, XR[i], s_r, deg, ancre)
            # Une lettre mobile SUIT SA BANDE aux étapes où elle ne bouge pas
            # d'elle-même — sinon le h resterait planté pendant que « hero »
            # s'en va. On part donc des coefficients de sa bande et on verse
            # son propre trajet dans la seule commande qui la concerne.
            n = 1 if ch == 'h' else 2
            c = coefs(I_E if ch == 'h' else I_LOL)
            c[n - 1] += dx - sum(c)
            A('<path class="lg-g lg-mob lg-%s" data-fente="%d" data-grp="%s" '
              'style="%s" d="%s"/>'
              % ('h' if ch == 'h' else 'L', i + 1, grp,
                 style_place(c, ';--dy:%d;--k:%s;--deg:%ddeg' % (dy, s_r, deg)), d))
    vider()
    A('</g>')

    # couche fantôme — au TRAIT, jamais en aplat : un contour se lit comme un
    # ornement de gravure, un aplat comme une tache. Les lettres cachées sont
    # dévoilées SUR PLACE, dans leur déguisement même : rien ne bouge.
    # Pour « geek », les deux lettres déguisées sont dans le i : son POINT est
    # un e (fantôme e, posé dessus, à une taille qui le rend lisible) et son
    # FÛT est le fût d'un k (fantôme k, à l'échelle où son fût fait pile la
    # hauteur d'x — il coïncide donc avec le fût du i, et ce sont ses deux bras
    # qui dépassent). Le e final, lui, n'est déguisé en rien : pas de fantôme.
    fantomes = [('hero', s_h, 'h', pose('h', s_h, XP[I_E] + h_dx, Y(h_cy))),
                ('lol', s_L, 'l', pose('l', s_L, XP[I_G] + L_dx, Y(L_cy))),
                ('geek', S_FANT, 'e', pose('e', S_FANT, XP[I_IE] + PT[0], Y(PT[1]))),
                ('geek', C['s_k'], 'k', (x_fut - C['s_k'] * C['kx0'], 0))]
    A('<g class="lg-ghost">')
    for g_, s_, ch, (dx_, dy_) in fantomes:
        A('<path data-grp="%s" style="stroke-width:%s" d="%s"/>'
          % (g_, round(min(9, max(4, 9 * s_)), 1), d_of(ch, scale=s_, dx=dx_, dy=dy_)))
    A('</g>')

    A('<g class="lg-rules">')
    for (a, b), nom in zip([(0, 3), (4, 8), (9, 12), (13, 16)],
                           ('num', 'hero', 'lol', 'geek')):
        A('<line class="lg-rule" data-grp="%s" x1="%.0f" y1="%d" x2="%.0f" y2="%d"/>'
          % (nom, XR[a], BASE + 280, XR[b], BASE + 280))
    A('</g>')

    return ('<svg class="logo" viewBox="0 0 %d %d" role="img" aria-labelledby="%s-t %s-d" '
            'xmlns="http://www.w3.org/2000/svg" focusable="false">'
            '<title id="%s-t">%s</title>'
            '<desc id="%s-d">Le mot « %s », dans lequel se cachent les mots '
            '« Num Hero LOL geek ».</desc>%s</svg>'
            ) % (XR[-1] + MARGE, BASE + 350, ident, ident, ident, titre, ident, titre,
                 ''.join(out))


def favicon(cote=64, rayon=13, marge=0, ampleur=1.0, deg=45, mode='pivote', graisse=500,
            tuile='#0B0E14', encre='#E3B341', rond=False):
    """Le favicon : un « 6 » de Jost penché à 45°. Seul 6 de toute l'identité.

    « Penché », pas « pivoté » : une ROTATION de 45° détruit le chiffre — le 6 de
    Jost bascule en sigma grec (σ) dans un sens, en b dans l'autre, parce que sa
    queue passe à l'horizontale ou à la verticale. Une INCLINAISON de 45° (le 6
    couché en italique, l'axe des pleins à 45°) garde le chiffre parfaitement
    lisible jusqu'à 16 px tout en reprenant l'angle du h et du l du logo. Les
    deux essais sont côte à côte dans le banc.

    Posé sur une tuile d'encre pleine : un favicon s'affiche aussi bien sur une
    barre d'onglets claire que sombre, et la tuile garantit le contraste dans
    les deux cas sans dépendre de `prefers-color-scheme` (que tous les
    navigateurs n'honorent pas dans une icône SVG). Aucun `<text>`, aucune
    ressource externe : le chiffre est un `<path>`."""
    f, gs, cm, hm = police(graisse)
    r = math.radians(deg)
    M = (Transform().rotate(r) if mode == 'pivote'
         else Transform(1, 0, -math.tan(r), 1, 0, 0))
    t = M.transform(Transform(1, 0, 0, -1, 0, 0))
    x0, y0, x1, y1 = _bbox_t('6', t)
    # Centrer d'abord, puis dimensionner sur le RAYON réel du tracé : le 6 pivoté
    # doit affleurer le cercle sans jamais le franchir. Un cadrage sur la boîte
    # englobante laisserait les coins sortir ; on mesure donc la distance du
    # centre au point le plus éloigné du contour.
    t = Transform().translate(-(x0 + x1) / 2, -(y0 + y1) / 2).transform(t)
    (ccx, ccy), rmin = _cercle_min(_points_t('6', t))
    t = Transform().translate(-ccx, -ccy).transform(t)   # centre = celui du cercle minimal
    dispo = cote / 2 - marge
    s_ = (dispo / (rmin or 1.0)) * ampleur
    t = Transform(s_, 0, 0, s_, 0, 0).transform(t)
    t = Transform().translate(cote / 2, cote / 2).transform(t)
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    rec = DecomposingRecordingPen(gs); gs[cm[ord('6')]].draw(rec); rec.replay(TransformPen(pen, t))
    debord = max(math.hypot(x - cote / 2, y - cote / 2) for x, y in _points_t('6', t)) - (cote / 2)
    if debord > 0.01:
        raise SystemExit('le 6 sort du cercle de %.2f u' % debord)
    if rond:
        fond = '<circle cx="%g" cy="%g" r="%g" fill="%s"/>' % (cote/2, cote/2, cote/2, tuile) if tuile else ''
    else:
        fond = '<rect width="%d" height="%d" rx="%d" fill="%s"/>' % (cote, cote, rayon, tuile) if tuile else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
            '<title>NumHeroLOLgeek</title>%s<path fill="%s" d="%s"/></svg>'
            ) % (cote, cote, cote, cote, fond, encre, pen.getCommands())


def fragment_svg(marge='      ', classes='logo logo-titre', **kw):
    """Le tracé destiné à index.html : le même que celui du banc, mis au propre
    et indenté. Le logo est le titre de niveau 1 : il doit être dans le HTML
    servi, pas fabriqué par le script."""
    svg = build('logo', **kw).replace('class="logo"', 'class="%s"' % classes, 1)
    svg = re.sub(r'(<title|<desc|<g |</g>|<path|<line|</svg>)', r'\n\1', svg)
    return '\n'.join(marge + l for l in svg.split('\n') if l) + '\n' + marge


def injecter(chemin, debut, fin, contenu):
    """Remplace ce qui est entre deux balises repères, et rien d'autre."""
    src = open(chemin, encoding='utf-8').read()
    i = src.index(debut) + len(debut)
    j = src.index(fin, i)
    neuf = src[:i] + contenu + src[j:]
    if neuf != src:
        open(chemin, 'w', encoding='utf-8').write(neuf)
    return neuf != src


def poser_site(racine=None):
    """Reporte le tracé et la mécanique dans le site lui-même. Sans ça, le banc
    d'essai et le site divergent au premier round suivant."""
    # la racine du SITE, c'est-à-dire `src/` — pas celle du dépôt.
    racine = racine or os.path.join(os.path.dirname(__file__), '..')
    a = injecter(os.path.join(racine, 'index.html'),
                 '<!-- logo:début -->', '<!-- logo:fin -->', '\n' + fragment_svg())
    b = injecter(os.path.join(racine, 'styles', 'base.css'),
                 '/* logo:début */', '/* logo:fin */', '\n' + css_logo())
    return a, b


MECANIQUE = """/* ── le logo ───────────────────────────────────────────────────────────────
   QUATRE ÉTAPES successives, une chose à la fois :
   %(rythme)s.
   L'écartement obéit à trois commandes, une par étape qui écarte :
     --u1  l'écart num|hero et la fente du h              (étape ①)
     --u2  les écarts hero|lol et lol|geek, fente du l    (étape ②)
     --u3  l'expansion interne de geek : le e final qui glisse, la fente que
           le k vient occuper derrière lui                (étape ③)
   Chacune vaut 1 au repos, 0 son écart ouvert. Une bande de lettres porte les
   trois coefficients (--a, --b, --c) de la combinaison qui la place : le mot
   reste CENTRÉ à tout instant, y compris à mi-étape.
   La fin du mot — g i e → g e e k — garde sa CHORÉGRAPHIE : aucune LETTRE ne
   s'efface ni n'apparaît, il n'y a que des trajets. Étape ③, trois mouvements
   indissociables : le e final se décale PENDANT que le point du i, qui est un
   e miniature, descend et grandit, PENDANT que le fût passe sous le e final et
   le dépasse, puis s'allonge. Étape ④, et seulement là, les deux BARRES du k.
   Au repos elles sont ABSENTES — pas repliées le long du fût : absentes. Elles
   apparaissent couchées DEDANS, à taille réelle, à l'instant même où le fût a
   pris sa place à droite du e final ; c'est la seule chose de toute la
   chorégraphie qui ne soit pas un trajet, et elle est invisible puisqu'à cet
   instant les barres sont confondues avec le fût. Puis chacune s'ouvre COMME
   UN COMPAS autour de son bout : celle du haut pivote par le haut, celle du
   bas par le bas.
   La FERMETURE n'est pas la marche arrière : ordre %(ordre)s. Les barres
   doivent se refermer ET disparaître avant que le fût ne reparte en orbite,
   sinon il voyagerait barres déployées. */
@property --u1{syntax:"<number>";inherits:true;initial-value:1}
@property --u2{syntax:"<number>";inherits:true;initial-value:1}
@property --u3{syntax:"<number>";inherits:true;initial-value:1}
%(commandes)s
svg.logo{display:block;width:100%%;height:auto;color:%(encre)s;
  --u1:1;--u2:1;--u3:1;--cho:%(cho)dms;
  transition:--u1 .55s cubic-bezier(.2,.8,.2,1),--u2 .55s cubic-bezier(.2,.8,.2,1),
             --u3 .55s cubic-bezier(.2,.8,.2,1)}
.lg-base path{fill:currentColor}

.lg-mov,.lg-mob{translate:calc((var(--a) * var(--u1) + var(--b) * var(--u2)
  + var(--c) * var(--u3)) * 1px) 0}
.lg-mob{transform-box:fill-box;transform-origin:center}
/* le h et le l : leur bande les emporte aux étapes où ils ne bougent pas
   d'eux-mêmes, et leur propre trajet tient dans une seule commande. */
.lg-h{translate:calc((var(--a) * var(--u1) + var(--b) * var(--u2)
    + var(--c) * var(--u3)) * 1px) calc(var(--dy) * var(--u1) * 1px);
  rotate:calc(var(--deg) * var(--u1));scale:calc(1 + (var(--k) - 1) * var(--u1))}
.lg-L{translate:calc((var(--a) * var(--u1) + var(--b) * var(--u2)
    + var(--c) * var(--u3)) * 1px) calc(var(--dy) * var(--u2) * 1px);
  rotate:calc(var(--deg) * var(--u2));scale:calc(1 + (var(--k) - 1) * var(--u2))}

%(cho_css)s
.lg-ghost path{fill:none;stroke:currentColor;opacity:0;transition:opacity .4s}
.lg-rules{opacity:0}
.lg-rule{stroke:%(dore)s;stroke-width:9;stroke-linecap:round}

%(eveil_svg)s{--u1:var(--ouv-eveil,1);--u2:var(--ouv-eveil,1);--u3:var(--ouv-eveil,1)}
%(eveil)s{opacity:%(fantome)s}
%(rev_svg)s{--u1:0;--u2:0;--u3:0;animation:ouverture var(--cho) forwards}
%(rev)s .lg-ghost path{opacity:0}

/* le RETOUR au repos. Chrome ne déclenche pas de transition quand on RETIRE
   une animation : sans ça, « geek » redeviendrait « gie » d'un coup sec. On ne
   retire donc pas l'animation, on en JOUE UNE AUTRE — `fermeture`, qui rejoue
   les mêmes étapes dans l'ordre %(ordre)s et finit exactement sur l'état de
   repos. `forwards` l'y laisse : la classe peut être ôtée ensuite sans le
   moindre saut. */
%(ret_svg)s{animation:fermeture var(--cho) forwards}

@media (prefers-reduced-motion:reduce){
  /* pas de trajet : l'état d'arrivée, tout de suite. Le logo dit la même
     chose, il la dit sans bouger. Tous les tracés de la chorégraphie sont
     bakés À L'ARRIVÉE : la dernière image des @keyframes est la
     transformation neutre, il n'y a donc rien de plus à écrire. Le lecteur pas
     à pas ne s'affiche pas non plus — il n'y a plus de trajet à parcourir.
     UN SEUL LEVIER : --cho. Toutes les animations tirent leur durée de lui,
     y compris `ouverture` et `fermeture`. Poser en plus un
     `animation-duration:1ms` serait redondant ET nuisible : le réglage
     explicite « animation complète » (src/styles/base.css, hors repères) rend sa
     valeur à --cho mais ne pourrait pas défaire une durée écrite en dur — le
     mot s'écarterait d'un coup pendant que l'orbite prendrait ses 3,5 s. */
  svg.logo{--cho:1ms}
  svg.logo,.lg-cho{transition:none}
  .lg-ghost path{transition-duration:.12s}
}

"""


def _bezier_x(bez, y):
    """L'abscisse (le TEMPS) à laquelle une cubic-bezier CSS atteint la valeur
    `y`. Sert à poser un palier « au point bas de l'orbite » sans le deviner :
    l'orbite est une rotation minutée par `bez`, et le creux doit tomber pile
    quand elle passe par 90°."""
    x1, y1, x2, y2 = bez
    f = lambda t, a, b: 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3
    lo, hi = 0., 1.
    for _ in range(60):
        mi = (lo + hi) / 2
        if f(mi, y1, y2) < y: lo = mi
        else: hi = mi
    return f((lo + hi) / 2, x1, x2)


def fenetre(etape, retour=False):
    """La fenêtre d'une étape, en pour cent de `--cho`. À l'aller les étapes se
    suivent dans l'ordre ; au retour elles suivent ORDRE_RETOUR, mêmes durées."""
    t = 0
    for k in (ORDRE_RETOUR if retour else (1, 2, 3, 4)):
        if k == etape:
            return 100. * t / CHO, 100. * (t + ETAPES[k - 1]) / CHO
        t += ETAPES[k - 1]
    raise SystemExit('étape inconnue : %r' % etape)


def _pc(etape, f, retour=False):
    """Où tombe, en % de `--cho`, la fraction `f` du trajet d'une pièce.
    `f` = 0 est toujours l'état de REPOS et `f` = 1 l'état révélé : au retour
    le trajet se parcourt donc à l'envers dans sa fenêtre."""
    a, b = fenetre(etape, retour)
    return a + (b - a) * (1 - f if retour else f)


def _courbe(c):
    return c if isinstance(c, str) else 'cubic-bezier(%s)' % ','.join(_n(v, 3) for v in c)


def _inv(c):
    """La même courbe parcourue à l'envers. Sans ça un mouvement « lent puis
    rapide » se refermerait « lent puis rapide » lui aussi, au lieu de se
    refermer « rapide puis lent » — l'œil le sent tout de suite."""
    if c is None or isinstance(c, str): return c
    x1, y1, x2, y2 = c
    return (1 - x2, 1 - y2, 1 - x1, 1 - y1)


def _keyframes(nom, etape, images, retour=False, presence=None):
    """Une pièce de la chorégraphie, minutée dans SON étape.

    `images` est la suite (fraction du trajet, déclarations, courbe jusqu'à
    l'image suivante), de l'état de repos à l'état révélé. Avant sa fenêtre la
    pièce tient son état de départ, après elle tient son état d'arrivée : d'où
    les paliers `0%,début%` et `fin%,100%`. Sans le palier à 100 %, le palier
    manquant serait synthétisé depuis le style de base et la pièce se
    replierait juste après s'être dépliée.

    `presence` — le couple (ce que la pièce vaut DANS sa fenêtre, ce qu'elle
    vaut DEHORS, du côté du repos). Les deux barres du k n'existent pas tant
    que le fût n'a pas pris sa place : hors de leur fenêtre elles ne sont pas
    repliées, elles sont `opacity:0`. Le palier qui les allume est franchi d'un
    PAS (`steps(1)`) et non interpolé — sinon elles apparaîtraient en fondu sur
    les trois étapes précédentes, ce qui est exactement ce qu'on ne veut pas.
    À l'aller ce pas tombe à l'ENTRÉE de la fenêtre : elles apparaissent,
    couchées dans le fût, à l'instant même où le fût a fini de prendre sa
    place. Au retour il tombe à la SORTIE : elles disparaissent dès qu'elles
    sont refermées, donc avant que le fût ne reparte en orbite — c'est la
    raison d'être de l'ordre 1-2-4-3."""
    dans, dehors = presence if presence else ('', '')
    im = list(images)
    if retour:
        courbes = [_inv(c) for _, _, c in im[:-1]]
        im = [(f, d, courbes[len(courbes) - 1 - i] if i < len(courbes) else None)
              for i, (f, d, _) in enumerate((f, d, None) for f, d, _ in reversed(im))]
    lignes = []
    for i, (brut, c, p) in enumerate((d, c, _pc(etape, f, retour)) for f, d, c in im):
        d = brut + (';' + dans if dans else '')
        tete = _n(p, 2) + '%'
        premier, dernier = i == 0, i == len(im) - 1
        if premier and p > .001:
            if dehors and not retour:      # elle n'existe pas encore
                lignes.append('  0%%{%s;%s;animation-timing-function:steps(1)}' % (brut, dehors))
            else:
                tete = '0%,' + tete
        if dernier and p < 99.999:
            if dehors and retour:          # refermée : elle cesse d'exister ici
                c = 'steps(1,jump-start)'
            else:
                tete += ',100%'
        lignes.append('  %s{%s%s}' % (tete, d,
                      '' if c is None else ';animation-timing-function:%s' % _courbe(c)))
        if dernier and dehors and retour and p < 99.999:
            lignes.append('  100%%{%s;%s}' % (brut, dehors))
    return '@keyframes %s{\n%s\n}' % (nom, '\n'.join(lignes))


def _depli(barre, f0, f1):
    """④ une des deux barres du k, qui s'ouvre COMME UN COMPAS.

    Le centre de rotation est le BOUT de la barre — son extrémité extérieure :
    celle du haut pivote par le haut, celle du bas par le bas. Ce bout ne peut
    pas rester immobile : couchée, la barre l'a SUR le fût ; ouverte, il est à
    260 u de là. Rotation et translation avancent donc ENSEMBLE, sur la même
    courbe.

    Le round 8 les décalait — la rotation devant, la translation derrière —
    parce que le centre était la CHARNIÈRE et que la translation n'était qu'un
    recentrage de 60 u à masquer. Le décalage serait ici une faute : la
    rotation seule ouvrirait la barre dans le vide, à gauche du fût, et la
    translation viendrait ensuite la raccrocher. Menées ensemble, le pied de la
    barre ne quitte pas le fût — il y reste jusqu'aux quatre cinquièmes du
    trajet, puis rejoint la charnière du k, 20 u plus à droite, exactement là
    où Jost la met.

    Deux images suffisent donc, là où il en fallait cinq. La PRÉSENCE de la
    barre, elle, ne se dit pas ici : c'est `presence` de `_keyframes` qui la
    porte, parce qu'elle vaut aussi hors de la fenêtre."""
    rot, dx, dy = barre
    return [(f0, 'translate:%spx %spx;rotate:%sdeg'
                 % (_n(dx, 2), _n(-dy, 2), _n(rot, 2)), COURBE_COMPAS),
            (f1, 'translate:0 0;rotate:0deg', None)]


def pieces():
    """Les six pièces à @keyframes propres, avec l'étape qui les porte.

    Chacune est (nom, sélecteur, étape, images, présence) — la présence étant
    le couple (dans la fenêtre, dehors) de `_keyframes`, et `None` pour tout ce
    qui existe en permanence.

    Le reste de la mise en place — bandes de lettres, h, l, glissement du e
    final — passe par les trois commandes `--u1 --u2 --u3` : ces mouvements-là
    sont de simples combinaisons linéaires, une seule courbe leur suffit, et
    les faire piloter par la même commande que l'écartement GARANTIT qu'ils
    restent synchrones. Ici on ne garde que ce qui a un profil propre.

    Tous les nombres viennent de `constantes()`, c'est-à-dire des contours de
    Jost — aucun n'est posé à la main."""
    C = constantes()
    dy_k, dx_k = C['ecart_k']
    f_bas = _bezier_x(COURBE_ORB, .5) * F_ORB      # le point bas de l'orbite
    return [
        ('cho-e1', '.lg-e1', 3, [
            (0, 'translate:%spx %spx;scale:%s'
                % (_n(C['e1dx'], 2), _n(C['e1dy'], 2), _n(S_PT, 4)), (.5, 0, .2, 1)),
            (F_ORB, 'translate:0 0;scale:1', None)], None),
        ('cho-orb', '.lg-orb', 3, [
            (0, 'rotate:180deg', COURBE_ORB),
            (F_ORB, 'rotate:0deg', None)], None),
        ('cho-k', '.lg-k', 3, [
            (0, 'translate:%spx %spx;scale:1 %s'
                % (_n(dx_k, 2), _n(dy_k, 2), _n(C['s_k'], 4)), (.4, 0, .4, 1)),
            (f_bas, 'translate:%spx %spx;scale:1 %s'
                % (_n(dx_k / 2 + CREUX, 2), _n(dy_k, 2), _n(C['s_k'], 4)), (.6, 0, .4, 1)),
            (F_ORB, 'translate:0 %spx;scale:1 %s'
                % (_n(dy_k, 2), _n(C['s_k'], 4)), (.2, .85, .3, 1)),
            (1, 'translate:0 0;scale:1 1', None)], None),
        # ④ les deux barres : ABSENTES tant que le fût n'a pas pris sa place,
        # d'où `PRESENCE` — puis couchées dedans, puis ouvertes au compas.
        ('cho-kbras', '.lg-kbras', 4, _depli(C['barre_h'], *F_BRAS), PRESENCE),
        ('cho-kjambe', '.lg-kjambe', 4, _depli(C['barre_b'], *F_JAMBE), PRESENCE),
        # Les quatre filets sont bakés SOUS LES QUATRE MOTS RÉVÉLÉS : ils ne
        # suivent pas l'écartement, ils le constatent. Tant que le mot est
        # compact ils tombent donc à côté. Avec l'ancien minutage, tout était
        # écarté en 675 ms et personne ne le voyait ; sur 3 s, c'est une
        # bavure de trois secondes. Ils n'apparaissent plus qu'À LA FIN, quand
        # les quatre mots existent — ce qui est aussi ce qu'ils veulent dire.
        ('cho-rules', '.lg-rules', 4, [
            (.5, 'opacity:0', 'linear'), (1, 'opacity:1', None)], None),
    ]


def _commandes_css(nom, retour=False):
    """Les trois commandes d'écartement, minutées étape par étape.

    Une image doit redonner LES TROIS valeurs : une @keyframes n'interpole une
    propriété qu'entre les images qui la mentionnent, et une commande omise
    sauterait par-dessus son étape."""
    e = COURBE_ECART
    if not retour:
        im = [(_pc(1, 0), (1, 1, 1), e), (_pc(1, 1), (0, 1, 1), e),
              (_pc(2, 1), (0, 0, 1), COURBE_GLIS), (_pc(3, F_GLIS), (0, 0, 0), None)]
    else:
        # ordre 1-2-4-3 : entre la fin de ② et le début de ③ inversée, l'étape
        # ④ replie les bras — les commandes, elles, ne bougent pas d'un cheveu.
        im = [(_pc(1, 1, True), (0, 0, 0), _inv(e)), (_pc(1, 0, True), (1, 0, 0), _inv(e)),
              (_pc(2, 0, True), (1, 1, 0), None), (_pc(3, F_GLIS, True), (1, 1, 0), _inv(COURBE_GLIS)),
              (_pc(3, 0, True), (1, 1, 1), None)]
    lignes = []
    for i, (p, u, c) in enumerate(im):
        tete = _n(p, 2) + '%'
        if i == 0 and p > .001: tete = '0%,' + tete
        if i == len(im) - 1 and p < 99.999: tete += ',100%'
        lignes.append('  %s{--u1:%d;--u2:%d;--u3:%d%s}' % ((tete,) + u + (
            '' if c is None else ';animation-timing-function:%s' % _courbe(c),)))
    return '@keyframes %s{\n%s\n}' % (nom, '\n'.join(lignes))


def _choreo_css(rev, ret):
    """La chorégraphie de la fin du mot, en CSS.

    Chaque pièce est bakée À SON ARRIVÉE ; ce qu'on écrit ici, c'est son état
    de REPOS, et les @keyframes ne font que revenir au neutre. Deux
    conséquences : en mouvement réduit (durée 1 ms) le logo saute pile à
    l'arrivée, et le RETOUR au repos est une simple transition CSS.

    L'orbite est un emboîtement de trois transformations, une par mouvement :
      · .lg-korb  la position du centre de l'orbite — il suit le e qui glisse,
                  et comme lui il est piloté par --u3 : les deux ne peuvent
                  donc PAS se désynchroniser ;
      · .lg-orb   l'orbite elle-même, une ROTATION et rien d'autre. C'est ce
                  qui la fait lire comme une orbite et non comme un glissement,
                  et c'est aussi ce qui fait que la fermeture repasse par en
                  dessous : une rotation qui revient suit forcément l'arc.
      · .lg-k     le rayon (il se resserre un peu) et l'allongement du fût.
    Les deux barres, elles, n'existent pas encore : elles attendent l'étape ④,
    et le style de base ci-dessous les tient ABSENTES."""
    C = constantes()
    P = pieces()

    def kf(p, retour=False):
        """Les @keyframes d'une pièce, aller ou retour."""
        nom, _sel, etape, images, presence = p
        return _keyframes('ret-' + nom[4:] if retour else nom, etape, images,
                          retour=retour, presence=presence)
    return '\n'.join([
        '/* les pièces de la chorégraphie : tracé baké à l\'ARRIVÉE, état de',
        '   REPOS ci-dessous. */',
        '/* Pas de `transition` ici : le e final et le centre de l\'orbite sont',
        '   désormais une fonction de --u3, et c\'est --u3 qui transitionne (sur',
        '   svg.logo). Une transition sur `translate` se déclencherait à CHAQUE',
        '   image de l\'animation qui fait varier --u3, et traînerait derrière. */',
        '.lg-cho{transform-box:view-box}',
        '/* ① le point du i, e miniature perché sur la hampe */',
        '.lg-e1{translate:%spx %spx;scale:%s}' % (_n(C['e1dx'], 2), _n(C['e1dy'], 2), _n(S_PT, 4)),
        '/* ② le e final, une fente plus à gauche — et avec lui le centre de',
        '      l\'orbite. Piloté par --u3, comme l\'écart qu\'il ouvre. */',
        '.lg-e2,.lg-korb{translate:calc(%spx * var(--u3)) 0}' % _n(-C['glis'], 2),
        '/* ③ le fût du k : à 180° sur son orbite, couché à la hauteur d\'x… */',
        '.lg-orb{rotate:180deg}',
        '.lg-k{translate:%spx %spx;scale:1 %s}'
        % (_n(C['ecart_k'][1], 2), _n(C['ecart_k'][0], 2), _n(C['s_k'], 4)),
        '/* ④ …et ses deux barres ABSENTES. Pas repliées le long du fût, pas',
        '      discrètes : absentes. Au repos le mot est « Numérologie » et rien',
        '      d\'autre — rien ne dépasse du fût du i, rien ne s\'y devine. La',
        '      pose écrite ici est celle où elles APPARAÎTRONT, à la fin de',
        '      l\'étape ③ : couchées DANS le fût, à leur taille définitive, le',
        '      bout de chacune posé là où le compas pivotera. */',
        '.lg-kbras{translate:%spx %spx;rotate:%sdeg;opacity:0}'
        % (_n(C['barre_h'][1], 2), _n(-C['barre_h'][2], 2), _n(C['barre_h'][0], 2)),
        '.lg-kjambe{translate:%spx %spx;rotate:%sdeg;opacity:0}'
        % (_n(C['barre_b'][1], 2), _n(-C['barre_b'][2], 2), _n(C['barre_b'][0], 2)),
        '',
        '\n'.join('%s %s{animation:%s var(--cho) forwards}' % (rev, sel, nom)
                  for nom, sel, *_ in P),
        '/* à la fermeture, les mêmes trajets à l\'envers — mais dans l\'ordre',
        '   %s, donc à d\'autres instants : ce ne sont pas les mêmes' % _ordre_lisible(),
        '   @keyframes, jouées à rebours, ce sont d\'autres @keyframes. */',
        '\n'.join('%s %s{animation:ret-%s var(--cho) forwards}' % (ret, sel, nom[4:])
                  for nom, sel, *_ in P),
        '',
        '/* ① le point du i DESCEND à la fente qu\'occupait le i et prend sa',
        '      taille de e. Simultané au décalage du e final et à l\'orbite :',
        '      c\'est l\'étape ③, la seule où trois choses bougent ensemble. */',
        kf(P[0]),
        '/* ② l\'orbite : 180° PAR EN DESSOUS. La courbe est celle d\'un',
        '      satellite — lent au départ, rapide au point bas, lent à',
        '      l\'arrivée. Le fût tourne avec elle : parti vertical à gauche du',
        '      e, il est couché au point bas et se redresse à droite. */',
        kf(P[1]),
        '/* ③ le RAYON de l\'orbite — la translation ici est radiale, puisque',
        '      la rotation est au-dessus. Il se resserre (le fût part de plus',
        '      loin qu\'il n\'arrive) et se CREUSE au point bas : l\'orbite est',
        '      une ellipse, et c\'est ce creux qui fait voir le passage sous le',
        '      e. PUIS le fût s\'allonge — pied planté, la hauteur d\'x devient',
        '      hauteur de hampe. Fin de l\'étape ③. */',
        kf(P[2]),
        '/* ④ et SEULEMENT LÀ, les deux barres. Elles APPARAISSENT couchées',
        '      dans le fût — le palier à 0 % les tient absentes et le pas',
        '      (`steps(1)`) les allume net, sans fondu —, puis chacune S\'OUVRE',
        '      AUTOUR DE SON BOUT : celle du haut pivote par le haut, celle du',
        '      bas par le bas. Rotation et translation ensemble : c\'est ce qui',
        '      garde leur pied sur le fût pendant tout le trajet. */',
        kf(P[3]),
        kf(P[4]),
        '/* et les quatre filets, qui constatent que les quatre mots sont là. */',
        kf(P[5]),
        '',
        '\n'.join(kf(p, retour=True) for p in P if p[0] != 'cho-rules'),
        '/* les filets s\'effacent D\'EMBLÉE : dès la première étape repliée, ils',
        '   ne surmontent plus quatre mots. */',
        _keyframes('ret-rules', 1, [(.75, 'opacity:0', 'linear'), (1, 'opacity:1', None)],
                   retour=True),
        '']) + '\n'


def _ordre_lisible():
    return '-'.join(str(k) for k in ORDRE_RETOUR)


def css_logo(rev='.logo--revele', rev_svg='svg.logo.logo--revele',
             eveil_svg='.logo-bouton:hover svg.logo:not(.logo--revele),\n'
                       '.logo-bouton:focus-visible svg.logo:not(.logo--revele)',
             eveil='.logo-bouton:hover svg.logo:not(.logo--revele) .lg-ghost path,\n'
                   '.logo-bouton:focus-visible svg.logo:not(.logo--revele) .lg-ghost path',
             ret='.logo--retour', ret_svg='svg.logo.logo--retour',
             encre='var(--fg)', dore='var(--gold)', fantome='var(--lg-fantome, .42)'):
    """La mécanique du logo, en CSS. UNE seule source pour le banc d'essai et
    pour le site : seuls changent les sélecteurs d'état et les couleurs. Sur le
    site la classe `logo--revele` est posée sur le <svg> lui-même (par
    src/app/logo.js) ; dans le banc, `.rev` est posée sur un conteneur."""
    rythme = '\n   '.join('%s %s — %s' % (chr(0x2460 + i), nom,
                            ('%g s' % (d / 1000.)).replace('.', ','))
                            for i, (d, nom) in enumerate(zip(ETAPES, NOMS_ETAPES)))
    return MECANIQUE % dict(rev=rev, rev_svg=rev_svg, eveil_svg=eveil_svg,
                            eveil=eveil, encre=encre, dore=dore, fantome=fantome,
                            ret=ret, ret_svg=ret_svg, cho=CHO, rythme=rythme,
                            ordre=_ordre_lisible(), cho_css=_choreo_css(rev, ret),
                            commandes=_commandes_css('ouverture') + '\n'
                                      + _commandes_css('fermeture', retour=True))


CSS = """
:root{color-scheme:dark}
*{box-sizing:border-box}
body{background:#0B0E14;color:#EFE6D4;margin:0;padding:28px 24px 72px;
  font:400 14px/1.65 ui-sans-serif,system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto 34px}
h1{font:400 21px/1.35 ui-sans-serif,system-ui,sans-serif;max-width:900px;margin:0 auto 8px}
p.note{max-width:900px;margin:0 auto 26px;color:#B9AF9B}
p.note b{color:#EFE6D4;font-weight:600}
h2{font:500 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;
  text-transform:uppercase;color:#8E8575;margin:0 0 8px}
h2 b{color:#5BE3A6;font-weight:500}
h2 i{color:#E3B341;font-style:normal}
hr{border:0;border-top:1px solid #2C3546;max-width:900px;margin:44px auto}
.grille{display:flex;flex-wrap:wrap;gap:26px;max-width:900px;margin:0 auto 34px;
  align-items:flex-end}
.grille .wrap{width:270px;margin:0}
.reserve{outline:1px dashed #2C3546;outline-offset:0}\n
""" + css_logo(
    rev='.rev', rev_svg='.rev svg.logo',
    eveil_svg='.eveil svg.logo,.vivant:not(.rev):hover svg.logo,\n'
              '.vivant:not(.rev):focus-visible svg.logo',
    eveil='.eveil .lg-ghost path,.vivant:not(.rev):hover .lg-ghost path,\n'
          '.vivant:not(.rev):focus-visible .lg-ghost path',
    ret='.ret', ret_svg='.ret svg.logo',
    encre='#EFE6D4', dore='#E3B341', fantome='.42') + """.vivant{display:block;width:100%;padding:0;border:0;background:none;cursor:pointer;
  color:inherit}
.vivant:focus-visible{outline:2px solid #5BE3A6;outline-offset:8px}

.clair{background:#F2EADA;padding:14px 0 2px}
.clair .wrap{margin-bottom:12px}
.clair svg.logo{color:#1A1610}
.clair+h2,h2.sombre{color:#6B6151}

.ico{display:flex;gap:22px;align-items:flex-end;max-width:900px;margin:0 auto 20px}
.ico figure{margin:0;text-align:center;color:#8E8575;font-size:11px}
.ico img{display:block;image-rendering:auto;margin:0 auto 6px}
.ico.sur-clair{background:#F2EADA;padding:14px 18px}
.ico.sur-clair figure{color:#6B6151}

/* le banc : vignettes figées à un instant t de la chorégraphie — l'aller
   (.frame.rev) comme la fermeture (.frame.ret), qui ne suit pas le même ordre. */
.frame.rev svg.logo,.frame.ret svg.logo,.frame .lg-cho{
  animation-delay:var(--t);animation-play-state:paused}
@media (prefers-reduced-motion:reduce){
  /* les vignettes, elles, doivent rester lisibles : elles montrent le trajet. */
  .frame.rev svg.logo,.frame.ret svg.logo{animation-duration:CHOms}
  .frame svg.logo{--cho:CHOms}
}
""".replace('CHOms', '%dms' % CHO)

JS = """
for (const b of document.querySelectorAll('.vivant')) {
  const svg = b.querySelector('svg'), t = svg.querySelector('title');
  const repos = t.textContent; let minuterie = 0, fin = 0;
  const duree = () => parseFloat(getComputedStyle(svg).getPropertyValue('--cho')) || CHO;
  const poser = (r) => {
    const etait = b.classList.contains('rev');
    clearTimeout(minuterie); clearTimeout(fin);
    b.classList.toggle('rev', r);
    // le retour rejoue la chorégraphie à l'envers ; la classe s'ôte à la fin.
    b.classList.toggle('ret', !r && etait);
    if (!r && etait) fin = setTimeout(() => b.classList.remove('ret'), duree());
    b.setAttribute('aria-expanded', r ? 'true' : 'false');
    t.textContent = r ? 'Num Hero LOL geek' : repos;
    if (r) minuterie = setTimeout(() => poser(false), 6000);
  };
  b.addEventListener('click', () => poser(!b.classList.contains('rev')));
}
""".replace('CHO', str(CHO))


def preuve_k3(etat, vue='150 60 560 900', barres=True, pivots=False):
    """Le k, monté avec les trois barres tirées de `geom_k()`.

    `etat` vaut None (le k de Jost, pour comparaison), 1 (les trois barres
    remontées : c'est le MÊME dessin, au point près) ou un réel de 0 à 1
    (l'ouverture en cours ; 0 = les deux barres couchées dans le fût, et l'on
    ne voit alors qu'une barre pleine — c'est l'instant où elles apparaissent,
    à la fin de l'étape ③). `barres` à faux ne montre que le fût : posée à
    côté de la vignette à `etat=0`, elle prouve que c'est la MÊME image.
    `pivots` marque les deux centres de rotation — les BOUTS, pas la charnière :
    c'est tout l'objet du round 9, autant le montrer.

    Les deux barres sont posées ici exactement comme le CSS les pose :
    rotation autour du BOUT, puis translation, l'une et l'autre au même
    avancement. `transform="translate() rotate()"` compose de la gauche vers la
    droite — donc la rotation d'abord, comme les propriétés individuelles
    `translate` puis `rotate` en CSS."""
    C = constantes()
    d = ['<path fill="currentColor" d="%s"/>' % d_of('k', dx=200)]
    if etat is not None:
        d = ['<path fill="currentColor" d="%s"/>' % poly(C['fut'], 200)]
        for q, (rot, dx, dy), bout in ((C['haut'], C['barre_h'], C['bout_h']),
                                       (C['bas'], C['barre_b'], C['bout_b'])):
            if not barres: continue
            d.append('<path fill="currentColor" transform="translate(%s %s) '
                     'rotate(%s %s %s)" d="%s"/>'
                     % (_n(dx * (1 - etat), 2), _n(-dy * (1 - etat), 2),
                        _n(rot * (1 - etat), 2),
                        _n(200 + bout[0]), _n(BASE - bout[1]), poly(q, 200)))
            if pivots:
                d.append('<circle fill="#E3B341" r="22" cx="%s" cy="%s"/>'
                         % (_n(200 + bout[0] + dx * (1 - etat)),
                            _n(BASE - bout[1] - dy * (1 - etat))))
    return ('<svg viewBox="%s" style="width:100%%;display:block">%s</svg>'
            % (vue, ''.join(d)))


def preuve_k(recouvrement):
    """IMPASSE DU ROUND 6, gardée pour mémoire. Les fins possibles, isolées :
    l + c à divers recouvrements, et le vrai k pour comparaison.
    `recouvrement` = part du fût qui mord sur le flanc du c, de 0 (accolé) à
    LARG (le fût EST le flanc gauche du c)."""
    BL, _, BR, _ = bbox('l'); LARG = BR - BL
    CL, _, CR, _ = bbox('c')
    if recouvrement is None:
        d = [d_of('k', dx=200)]
    else:
        x = 200 + CL - LARG + recouvrement
        d = [rect(x, 0, x + LARG, ASC), d_of('c', dx=200)]
    return ('<svg viewBox="150 60 560 900" style="width:100%%;display:block">%s</svg>'
            % ''.join('<path fill="currentColor" d="%s"/>' % k for k in d))


def preuve_pli(lames):
    """IMPASSE DU ROUND 6, gardée pour mémoire. Le fût du i, selon la façon de
    replier le e : aplati d'un bloc (l'œil du e reste grand ouvert : ce n'est
    pas un fût, c'est un anneau), ou plié en `lames` superposées (plein, c'est
    un fût). `lames=0` montre le e déplié."""
    BL, _, BR, _ = bbox('l'); LARG = BR - BL
    EB = bbox('e'); pas = (EB[2] - EB[0]) / max(1, lames)
    x_f, sy = 200 + 60, XH / (XH - EB[1])
    if not lames:
        d = ['<path fill="currentColor" d="%s"/>' % d_of('e', dx=200)]
    else:
        d = []
        for k in range(lames):
            a = 200 + EB[0] + k * pas
            d.append('<path fill="currentColor" style="clip-path:inset(0 %s%% 0 %s%%);'
                     'transform-box:view-box;transform-origin:%spx %spx;'
                     'translate:%spx 0;scale:%s %s" d="%s"/>'
                     % (_n((lames - 1 - k) * 100. / lames), _n(k * 100. / lames),
                        _n(a), _n(BASE - XH), _n(x_f - a),
                        _n(LARG / pas, 4), _n(sy, 4), d_of('e', dx=200)))
    return ('<svg viewBox="150 380 400 560" style="width:100%%;display:block">%s</svg>'
            % ''.join(d))


def _mil(n):
    """Un nombre écrit à la française, espace insécable fine aux milliers."""
    return ('%d' % n) if n < 1000 else '%d&nbsp;%03d' % divmod(n, 1000)


def _planche(logo, temps, notes, classe='rev'):
    """Une planche de vignettes figées à `t`. `animation-delay` négatif +
    `animation-play-state:paused` : le navigateur calcule l'image à cet
    instant-là et s'y arrête — la planche est donc une VRAIE capture de la
    timeline, pas un dessin refait à la main."""
    out = ['<div class="grille">']
    for t in temps:
        note = notes.get(t)
        out.append('<div class="wrap frame %s" style="--t:-%dms;width:270px">'
                   '<h2>t = %s ms%s</h2>%s</div>'
                   % (classe, t, _mil(t),
                      '' if not note else ' <i>← %s</i>' % note, logo()))
    out.append('</div>')
    return ''.join(out)


def page():
    n = [0]
    def logo(**kw):
        n[0] += 1; return build('lg%d' % n[0], **kw)
    def bloc(titre, contenu, classe='', style=''):
        return '<div class="wrap %s"%s><h2>%s</h2>%s</div>' % (
            classe, ' style="%s"' % style if style else '', titre, contenu)

    ico = lambda **kw: 'data:image/svg+xml;utf8,' + favicon(**kw).replace('#', '%23').replace('"', "'")

    h = ['<!doctype html><html lang="fr"><meta charset="utf-8">'
         '<meta name="viewport" content="width=device-width,initial-scale=1">'
         '<title>Logo — round 9</title><style>%s</style>' % CSS]
    h.append('<h1>Logo — round 9 (bâton géométrique monolinéaire, Jost*)</h1>'
             '<p class="note">Lecture au repos&nbsp;: <b>«&nbsp;Numérologie&nbsp;»</b> — '
             'onze glyphes, <b>un seul bloc compact</b>. La place n\'est pas volée au repos&nbsp;: '
             'elle est <i>réservée de part et d\'autre</i> et le texte s\'écarte au clic. '
             'Lecture cachée&nbsp;: <b>num&nbsp;|&nbsp;hero&nbsp;|&nbsp;lol&nbsp;|&nbsp;geek</b>. '
             'La fin du mot obéit à une chorégraphie où <b>aucune lettre ne s\'efface et aucune '
             'n\'apparaît</b>. Les rounds précédents <i>suggéraient</i> le <b>k</b> (un fût planté '
             'sur la panse d\'un <i>c</i>)&nbsp;: ça se lit <b>b</b>, la piste est abandonnée. '
             'Ici le k est <b>construit</b> — c\'est celui de Jost, démonté en trois barres. '
             'Au clic, trois mouvements&nbsp;: le <b>point</b> du <i>i</i>, qui est un <i>e</i> '
             'miniature, <b>descend</b> à la fente du <i>i</i> et prend sa taille normale&nbsp;; '
             'le <i>e</i> final, resté <b>entier</b>, glisse d\'une fente&nbsp;; et le <b>fût</b> '
             'du <i>i</i> <b>orbite sous le <i>e</i></b> sur 180°, puis s\'allonge. Les '
             '<b>deux barres du k</b> sont <b>absentes</b> jusque-là — au repos le mot est '
             '«&nbsp;Numérologie&nbsp;» et <i>rien d\'autre</i>&nbsp;; elles apparaissent '
             '<b>couchées dans le fût</b>, à taille réelle, à l\'instant où il a pris sa place, '
             'puis s\'ouvrent <b>comme un compas</b>, chacune depuis son <b>bout</b>. '
             'Arrivée&nbsp;: <b>g e e k</b>.</p>')

    h.append(bloc('1 — Repos <i>(le cadre pointillé montre la réserve latérale)</i>',
                  logo(), 'reserve'))
    h.append(bloc('2 — Éveil <b>(survol / focus)</b> — les fantômes au trait, rien ne bouge de place',
                  logo(), 'eveil'))
    h.append(bloc('3 — Révélation <b>(clic)</b> — le texte s\'écarte, quatre mots',
                  logo(), 'rev'))
    h.append('<hr>')
    h.append(bloc('Essai vivant — survolez, puis cliquez',
                  '<button type="button" class="vivant" aria-expanded="false">%s</button>' % logo()))

    h.append('<hr><p class="note"><b>La chorégraphie, image par image.</b> Vignettes figées à '
             '<i>t</i> de l\'animation (%s&nbsp;ms). <b>Quatre étapes successives, une chose à '
             'la fois</b>&nbsp;: ① la place du <i>h</i> et le <i>h</i> qui s\'y pose '
             '(0&nbsp;→&nbsp;1&nbsp;000&nbsp;ms)&nbsp;; ② la place du <i>l</i> et le <i>l</i> qui '
             'y descend (1&nbsp;000&nbsp;→&nbsp;2&nbsp;000)&nbsp;; ③ le <i>e</i> final qui se '
             'décale <b>pendant</b> que l\'autre <i>e</i> descend et grandit <b>pendant</b> que la '
             'barre passe sous le <i>e</i> final et le dépasse, puis s\'allonge '
             '(2&nbsp;000&nbsp;→&nbsp;3&nbsp;000)&nbsp;; ④ les deux <b>barres</b> du <b>k</b>, '
             'qui apparaissent puis s\'ouvrent (3&nbsp;000&nbsp;→&nbsp;3&nbsp;500). L\'étape ③ '
             'est la seule où trois choses bougent ensemble&nbsp;: elles sont indissociables. Le '
             'round&nbsp;7 jouait tout cela <b>en 1&nbsp;500&nbsp;ms et pour l\'essentiel en même '
             'temps</b>&nbsp;: l\'œil ne pouvait pas suivre. À <i>t</i>&nbsp;=&nbsp;3&nbsp;000, '
             'les deux barres <b>viennent d\'apparaître</b> et la vignette est pourtant la même '
             'qu\'à 2&nbsp;900&nbsp;: elles sont <b>couchées dans le fût</b>. C\'est voulu — ce '
             'qu\'on doit voir, ce n\'est pas leur apparition, c\'est leur <b>ouverture</b>.</p>'
             % _mil(CHO))
    h.append(_planche(logo, (0, 500, 1000, 1400, 2000, 2350, 2600, 2900, 3000, 3100, 3250, 3500),
                      {1000: 'fin de ①', 2000: 'fin de ②', 2350: 'point bas',
                       2900: 'pas de barres', 3000: 'fin de ③ — elles apparaissent, couchées',
                       3100: 'le compas s’ouvre', 3500: 'arrivée'}))

    h.append('<hr><p class="note"><b>La fermeture ne rejoue pas l\'aller à l\'envers.</b> Elle '
             'suit l\'ordre <b>①&nbsp;②&nbsp;④&nbsp;③</b>, mêmes durées. Ce n\'est pas un '
             'caprice&nbsp;: les deux barres du <b>k</b> doivent se <b>refermer et '
             'disparaître</b> (④&nbsp;inversée, 2&nbsp;000&nbsp;→&nbsp;2&nbsp;500&nbsp;ms) '
             '<b>avant</b> que le fût ne reparte en orbite (③&nbsp;inversée, '
             '2&nbsp;500&nbsp;→&nbsp;3&nbsp;500), sinon il voyagerait barres déployées sous le '
             '<i>e</i>. Elles ne s\'effacent pas en fondu&nbsp;: à 2&nbsp;500 elles sont '
             'refermées dans le fût, et c\'est <b>là</b> qu\'elles cessent d\'exister, d\'un '
             'pas.</p>')
    h.append(_planche(logo, (0, 600, 1000, 1600, 2000, 2400, 2500, 2900, 3200, 3500),
                      {1000: '① repliée', 2000: '② repliée', 2400: 'le compas se referme',
                       2500: 'plus de barres', 3500: 'repos'}, classe='ret'))

    C = constantes()
    jeu = lambda b: (b[0] - C['kx0'], C['kx1'] - b[2])
    h.append('<hr><p class="note"><b>Le k, en trois barres — et le compas.</b> On ne redessine pas '
             'un k&nbsp;: on <b>démonte celui de Jost</b>. Son glyphe a deux contours polygonaux — '
             'le fût (rectangle) et les deux bras (un hexagone en «&nbsp;&lt;&nbsp;»)&nbsp;; '
             'l\'hexagone se scinde en deux parallélogrammes le long de la coupe qui les pose sur '
             'le fût. Remontés, les trois morceaux redonnent le k <b>au point près</b> '
             '(vignettes 1 et 2, strictement identiques). <b>Couchées dans le fût</b>, les deux '
             'barres y tiennent entièrement, <b>à taille réelle</b> — %s et %s&nbsp;u de large '
             'pour un fût de %s&nbsp;u, soit %s et %s&nbsp;u de jeu de chaque côté&nbsp;: c\'est '
             'le <b>minimum géométrique</b> (la plus petite largeur d\'un parallélogramme vaut '
             'aire ÷ grand côté), on ne peut pas faire mieux sans redessiner le k. '
             '%s&nbsp;u, c\'est <b>0,14&nbsp;px</b> sur un logo rendu à 900&nbsp;px de large '
             '(le fût y fait 9&nbsp;px) et <b>0,08&nbsp;px</b> à la taille du titre du site&nbsp;: '
             'sous la résolution du rastériseur. C\'est pour ça que le round&nbsp;8, qui les '
             'gardait couchées <i>en permanence</i>, laissait un filet d\'un pixel sur la tranche '
             'du fût du <i>i</i> — 33&nbsp;pixels d\'écart, jusqu\'à 15/255 de contraste, entre '
             'le logo au repos avec les barres et le même sans. Depuis&nbsp;: <b>zéro</b> pixel '
             'd\'écart. C\'est pour ça qu\'elles sont maintenant <b>absentes</b> au repos et '
             'n\'apparaissent qu\'à l\'instant où elles s\'ouvrent. Chacune pivote autour de '
             'son <b>bout</b> (le disque <i>doré</i>), <b>pas</b> autour de la charnière&nbsp;: '
             'celle du haut par le haut, celle du bas par le bas.</p>'
             % (_n(C['boite_h'][2] - C['boite_h'][0], 1).replace('.', ','),
                _n(C['boite_b'][2] - C['boite_b'][0], 1).replace('.', ','),
                _n(C['larg']), _n(jeu(C['boite_h'])[0], 2).replace('.', ','),
                _n(jeu(C['boite_b'])[0], 2).replace('.', ','),
                _n(jeu(C['boite_b'])[0], 2).replace('.', ',')))
    h.append('<div class="grille">')
    for lab, e in (('le k de Jost', None), ('<b>les trois barres remontées</b>', 1),
                   ('le compas à moitié', .5), ('le compas qui s\'entrouvre', .15),
                   ('<b>couchées</b> — une barre pleine', 0)):
        h.append('<div class="wrap" style="width:150px"><h2>%s</h2>%s</div>'
                 % (lab, preuve_k3(e, pivots=e not in (None, 1))))
    h.append('</div>')
    h.append('<p class="note">Le fût seul, et le fût avec les deux barres couchées dedans, '
             'à la même échelle et <b>zoomés sur sa tranche</b>&nbsp;: c\'est la même image. '
             'C\'est cet état-là qui s\'allume à <i>t</i>&nbsp;=&nbsp;3&nbsp;000&nbsp;ms.</p>')
    h.append('<div class="grille">')
    for lab, b in (('le fût seul', False), ('<b>+ les deux barres couchées</b>', True)):
        h.append('<div class="wrap" style="width:120px"><h2>%s</h2>%s</div>'
                 % (lab, preuve_k3(0, vue='255 100 100 820', barres=b)))
    h.append('</div>')

    h.append('<hr><p class="note"><b>Impasse du round 6, gardée pour mémoire — suggérer le k.</b> '
             'Un <i>l</i> <b>accolé</b> à un '
             '<i>c</i> ne donne pas un k&nbsp;: écarté il reste «&nbsp;<b>lc</b>&nbsp;», et à '
             'demi recouvert la panse se referme sur le fût et donne un franc <b>b</b>. C\'est le '
             '<b>recouvrement total</b> qui est retenu&nbsp;: le fût ne se pose pas <i>à côté</i> '
             'du c, il se <b>superpose à son flanc gauche</b> — le flanc gauche du c EST le fût du '
             'l. Ce qui dépasse du fût, ce sont les deux arcs du c, l\'un qui part en haut à '
             'droite, l\'autre en bas à droite&nbsp;: la topologie d\'un k, avec des bras courbes. '
             'C\'était le pari du round 6. <b>Il est perdu</b>&nbsp;: à l\'usage, le '
             'recouvrement total se lit <b>b</b>, pas k — la panse fermée à gauche par le fût fait '
             'une panse de b. D\'où le round 7, qui ne suggère plus le k mais le construit.</p>')
    h.append('<div class="grille">')
    for lab, d in (('accolé → «&nbsp;lc&nbsp;»', 0), ('à demi recouvert → «&nbsp;b&nbsp;»', 40),
                   ('<b>retenu</b> — recouvrement total', 80),
                   ('le vrai k de Jost <i>(non retenu)</i>', None)):
        h.append('<div class="wrap" style="width:180px"><h2>%s</h2>%s</div>' % (lab, preuve_k(d)))
    h.append('</div>')

    h.append('<hr><p class="note"><b>Impasse du round 6, gardée pour mémoire — le fût du <i>i</i> '
             'comme <i>e</i> par la tranche.</b> Un <i>e</i> simplement <b>comprimé à la largeur d\'un fût</b> n\'est '
             'pas un fût&nbsp;: l\'œil du <i>e</i>, qui fait 62&nbsp;% de sa largeur, se comprime '
             'avec lui et reste grand ouvert — on obtient un anneau, pas une barre pleine. '
             'Aucun taux de compression, ni aucune rotation 3D (qui n\'est qu\'une compression de '
             'plus), ne referme ce trou&nbsp;: une transformation affine garde les trous. '
             'Retenu&nbsp;: le <i>e</i> est <b>plié en lames</b> — six tranches verticales '
             'empilées les unes sur les autres, comme un paravent replié. Les pleins d\'une lame '
             'bouchent les trous des autres&nbsp;: le fût est <b>plein</b>. La mécanique marchait '
             '— mais elle servait un état d\'arrivée qui ne se lisait pas. Le round 7 rend au '
             'fût du <i>i</i> sa simplicité&nbsp;: c\'est une barre, et cette barre est le fût '
             'du k.</p>')
    h.append('<div class="grille">')
    for lab, nb in (('<i>e</i> comprimé d\'un bloc → anneau', 1), ('plié en 2 lames', 2),
                    ('<b>retenu</b> — plié en 6 lames', 6), ('déplié — le <i>e</i>', 0)):
        h.append('<div class="wrap" style="width:120px"><h2>%s</h2>%s</div>' % (lab, preuve_pli(nb)))
    h.append('</div>')

    h.append('<hr>')
    h.append('<div class="clair">%s</div>' % bloc('Thème clair — repos', logo()))
    h.append('<div class="clair">%s</div>' % bloc('Thème clair — révélé', logo(), 'rev'))
    h.append('<div class="grille">')
    for w in (320, 220, 170):
        h.append('<div class="wrap" style="width:%dpx"><h2>%d px</h2>%s</div>' % (w, w, logo()))
    h.append('</div>')

    h.append('<hr><p class="note"><b>Favicon</b> — un «&nbsp;6&nbsp;» de Jost penché à 45°, '
             'seul chiffre de toute l\'identité. <b>Penché, pas pivoté</b>&nbsp;: une rotation de '
             '45° détruit le chiffre (sa queue passe à l\'horizontale et le 6 se lit '
             '<i>σ</i>&nbsp;; dans l\'autre sens elle se dresse et il se lit <i>b</i>). '
             'L\'inclinaison de 45° — le 6 couché, axe des pleins à 45° — reprend l\'angle du h '
             'et du l du logo et reste lue comme un 6 jusqu\'à 16&nbsp;px.</p>')
    for classe in ('', ' sur-clair'):
        h.append('<div class="ico%s">' % classe)
        for px in (16, 24, 32, 48, 96):
            h.append('<figure><img src="%s" width="%d" height="%d" alt=""><figcaption>%d px'
                     '</figcaption></figure>' % (ico(), px, px, px))
        h.append('</div>')
    h.append('<div class="ico">')
    for lab, kw in (('<b>retenu</b> — penché 45°', {}),
                    ('penché 30°', dict(deg=30)),
                    ('pivoté 45° → σ', dict(mode='pivote')),
                    ('pivoté −45° → b', dict(mode='pivote', deg=-45)),
                    ('sans tuile', dict(tuile=''))):
        h.append('<figure><img src="%s" width="64" height="64" alt="">'
                 '<img src="%s" width="16" height="16" alt="">'
                 '<figcaption>%s</figcaption></figure>' % (ico(**kw), ico(**kw), lab))
    h.append('</div>')

    h.append('<script>%s</script>' % JS)
    return ''.join(h)


if __name__ == '__main__':
    import sys
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    cible = args[0] if args else '_logo-test.html'
    open(cible, 'w').write(page())
    print('écrit :', cible)
    if len(args) > 1:
        open(args[1], 'w').write(favicon())
        print('écrit :', args[1])
    if '--site' in sys.argv:
        for chemin, change in zip(('src/index.html', 'src/styles/base.css'), poser_site()):
            print(('mis à jour :' if change else 'inchangé   :'), chemin)
