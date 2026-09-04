#!/usr/bin/env python3
"""★ **L'AXE DES LETTRES, LU DANS LES SOURCES DE LA POLICE.**

> « Si tu repars des sources de la fonte, as-tu ce qu'il faut plutôt que de
>   chercher à le recréer ? » (l'auteur)

Oui, et voici ce que « repartir des sources » veut dire au juste.

★ **LES SOURCES NE CONTIENNENT PAS DE SQUELETTE.** `JetBrainsMono.glyphs` est
  dessiné au CONTOUR, comme toutes les fontes de texte : pas un attribut
  d'épaisseur, pas un tracé au trait. Chercher l'axe « en vectoriel » dans le
  fichier, c'est chercher le geste dans l'encre.

★ **ELLES CONTIENNENT MIEUX : DE QUOI LE DÉDUIRE SANS RIEN APPROCHER.** Trois
  masters point-compatibles et leurs fûts déclarés (voir `jetbrains-source.py`).
  L'épaisseur est affine sur [100, 400] ; elle s'annule en **wght −275**. À
  cette graisse, les deux bords d'un fût se confondent sur son axe. On ne
  reconstruit rien : on interpole la police à un poids qu'elle définit.

Quatre gestes, dans cet ordre, et pas un de plus :

  1. **EFFONDRER** — chaque nœud glisse le long de la droite que les deux
     masters lui tracent, jusqu'à wght −275. Les courbes restent des courbes :
     le milieu de deux Béziers de contrôle est une Bézier. Le `l` garde ses
     quatorze nœuds, le `s` ses quarante-quatre.

  2. **DÉGRAFER LES ENCOCHES** — aux jonctions, le dessinateur creuse un
     minuscule ressaut (vingt unités sur un fût de quatre-vingt-dix) pour que
     l'encre ne s'y empâte pas. Ce ressaut n'appartient à aucun trait : effondré,
     il devient un ergot qui dépasse. C'est le défaut que l'auteur a nommé —
     « à chaque fois que la fonte est plus fine que la largeur standard, tu
     tombes au-delà de la barre à laquelle la boucle est tangente ». On les
     retire, et on peut les nommer : onze lettres, une ou deux chacune.

  3. **REPLIER** — le contour effondré longe l'axe puis revient par l'autre
     bord. Les deux passages ne se superposent pas EXACTEMENT, parce que les
     fûts horizontaux (82) sont plus fins que les verticaux (90) et ne
     s'annulent donc pas au même poids. Leur MILIEU, lui, est l'axe exact, quelle
     que soit l'épaisseur locale. Replier annule d'un coup tout ce que le choix
     d'un poids unique laissait traîner.

  4. **REPOSER LES TRAITS DÉCLARÉS** — l'axe replié est encore un aller-retour,
     et `moteur/tables/glyphes.js` compte des sous-chemins, des extrémités et
     des boucles. Les recettes de `jetbrains-traces.py` DÉCLARENT la topologie ;
     on projette l'axe dessus, abscisse par abscisse.

⚠️ **CE QUI EST EXACT ET CE QUI NE L'EST PAS.** Les trois premiers gestes ne
  passent par aucune grille, aucun ré-échantillonnage, aucun lissage : `AXES`
  est la police, en Béziers, avec le nombre de nœuds que la source lui donne —
  quatorze pour le `l`, quarante-quatre pour le `s`. Le quatrième, lui, PROJETTE :
  `TRAITS` reste une reconstruction. La différence tient à ce qui se projette :
  un squelette relevé sur une grille auparavant, la police elle-même désormais.

⚠️ **ET LA TOPOLOGIE RESTE DÉCLARÉE — TROIS TENTATIVES POUR LE VÉRIFIER.**
  Repérer les rebroussements : dix bonnes réponses sur vingt-six, un test
  d'angle ne distinguant pas un demi-tour arrondi d'un coin franc. Apparier les
  brins deux à deux : les masters glissent le long du tracé autant qu'ils
  s'écartent, et l'appariement par indice s'y perd. Enfin couper l'axe à ses
  plis et à ses croisements — antiparallèles contre sécants, le principe est
  juste et rendait dix-huit lettres sur vingt-six. Elle a montré pourquoi les
  trois échouent : **un axe effondré passe DEUX FOIS au même endroit**, et dire
  lequel des deux passages appartient à quel trait demande une information que
  le dessin ne porte pas. Combien de traits, lesquels se touchent, où le crayon
  se lève : c'est une LECTURE du dessin. La recette la donne, et rend les
  vingt-six.
"""

import json
import math
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
SOURCE = RACINE / 'src' / 'gfx' / '_jetbrains-source.json'
CIBLE = RACINE / 'src' / 'gfx' / '_glyphes-axe.js'

#: Le repère du moteur : la capitale vaut 600 (`glyphes.js › METRIQUES`).
CAPITALE_CIBLE = 600

BAS_DE_CASSE = 'abcdefghijklmnopqrstuvwxyz'
CAPITALES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def charge():
    if not SOURCE.exists():
        sys.exit('extrait absent : lancer d’abord src/gfx/jetbrains-source.py')
    return json.loads(SOURCE.read_text(encoding='utf-8'))


DONNEES = charge()
MAIGRE_A, MAIGRE_B = DONNEES['releves']


def maigre():
    """★ **LA GRAISSE OÙ L'ENCRE S'ANNULE — CALCULÉE, JAMAIS RÉGLÉE À L'ŒIL.**

    Les fûts verticaux sont déclarés par la source : 50 à wght 100, 90 à
    wght 400. Une droite passe par ces deux points ; elle coupe zéro en −275.

    ⚠️ On prend le fût VERTICAL et non l'horizontal, plus fin (45 → 82, qui
      s'annulerait en −265). Le choix serait arbitraire si le repliage ne
      venait pas ensuite : c'est lui qui rattrape l'écart, en prenant le milieu
      des deux bords quel que soit le poids atteint. Le vertical sert de
      référence parce qu'il est le fût dominant du dessin.
    """
    a, b = DONNEES['graisses'][MAIGRE_A], DONNEES['graisses'][MAIGRE_B]
    ea, eb = DONNEES['futs'][MAIGRE_A][1], DONNEES['futs'][MAIGRE_B][1]
    return a - ea * (b - a) / float(eb - ea)


MAIGRE = maigre()

#: De l'unité de la police à celle du moteur : capitale sur capitale.
ECHELLE = CAPITALE_CIBLE / float(DONNEES['capitale'])


# ═══════════════════════════════════════════════════════════════════════════
#  ① Les encoches de jonction
# ═══════════════════════════════════════════════════════════════════════════

#: La saillie d'une encoche et la longueur de ses côtés. Les deux se mesurent
#: contre le fût (90) : un ressaut de vingt unités sur un fût de quatre-vingt-dix
#: n'est pas un trait, c'est un détail d'encrage. Aucun trait du dessin ne
#: descend sous quarante-huit unités — le plus court, le crochet du `l`, en fait
#: cent quatre-vingts.
SAILLIE = 26.0
COTE = 48.0

#: Sous ce seuil, un nœud est SUR la droite de ses voisins : le retirer ne
#: déplace pas le contour, il en retire seulement un point devenu inutile une
#: fois l'encoche dégrafée.
PLAT = 4.0


def _dseg(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    n2 = dx * dx + dy * dy
    t = 0.0 if n2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / n2))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def _encoches(nodes):
    """Les sommets d'un ressaut : trois nœuds droits, une saillie minuscule."""
    n = len(nodes)
    out = set()
    for i in range(n):
        avant, apres = nodes[(i - 1) % n], nodes[(i + 1) % n]
        if not nodes[i][2].startswith('l') or not apres[2].startswith('l'):
            continue
        if avant[2] == 'o':
            continue          # une encoche ne se dessine jamais à la courbe
        if (_dseg(nodes[i], avant, apres) < SAILLIE
                and math.dist(nodes[i][:2], avant[:2]) < COTE
                and math.dist(nodes[i][:2], apres[:2]) < COTE):
            out.add(i)
    return out


def _plats(nodes):
    n = len(nodes)
    return {i for i in range(n)
            if nodes[i][2].startswith('l')
            and nodes[(i - 1) % n][2] != 'o'
            and nodes[(i + 1) % n][2].startswith('l')
            and _dseg(nodes[i], nodes[(i - 1) % n], nodes[(i + 1) % n]) < PLAT}


def aretes(ch, journal=None):
    """★ **LES INDICES SE RELÈVENT SUR UN SEUL MASTER ET S'IMPOSENT AUX DEUX.**

    Les contours sont point-compatibles, et le rester est la condition même de
    l'interpolation. Mesurer les encoches master par master les désaccorderait —
    le Thin dessine les siennes un peu plus courtes, et deux listes d'indices
    différentes rendraient la soustraction impossible.
    """
    out = []
    for k, c in enumerate(DONNEES['glyphes'][ch][MAIGRE_B]):
        a = _encoches(c)
        gardes = [i for i in range(len(c)) if i not in a]
        a |= {gardes[i] for i in _plats([c[i] for i in gardes])}
        if a and journal is not None:
            journal.append((ch, k, sorted((round(c[i][0]), round(c[i][1])) for i in a)))
        out.append(a)
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  ② L'effondrement
# ═══════════════════════════════════════════════════════════════════════════

def effondre(ch, journal=None):
    """Les contours de `ch` à la graisse où l'épaisseur s'annule, à l'échelle."""
    t = (MAIGRE - DONNEES['graisses'][MAIGRE_A]) / float(
        DONNEES['graisses'][MAIGRE_B] - DONNEES['graisses'][MAIGRE_A])
    k = ECHELLE
    ar = aretes(ch, journal)
    out = []
    for a, b, jetes in zip(DONNEES['glyphes'][ch][MAIGRE_A],
                           DONNEES['glyphes'][ch][MAIGRE_B], ar):
        out.append([((u[0] + (v[0] - u[0]) * t) * k, (u[1] + (v[1] - u[1]) * t) * k, u[2])
                    for i, (u, v) in enumerate(zip(a, b)) if i not in jetes])
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  Le chemin : nœuds Glyphs → morceaux de Bézier
# ═══════════════════════════════════════════════════════════════════════════

def morceaux(contours):
    """Chaque contour en `[(depart, [controles], arrivee), ...]`.

    ⚠️ Un contour Glyphs est CYCLIQUE et peut commencer par un point de
      contrôle ; on démarre donc au dernier nœud sur-courbe de la liste, pas au
      premier venu.
    """
    out = []
    for nodes in contours:
        n = len(nodes)
        sur = [i for i in range(n) if nodes[i][2] != 'o']
        if not sur:
            out.append([])
            continue
        depart = sur[-1]
        p0, ctrl, segs = nodes[depart], [], []
        for k in range(n):
            x, y, t = nodes[(depart + 1 + k) % n]
            if t == 'o':
                ctrl.append((x, y))
            else:
                segs.append(((p0[0], p0[1]), ctrl, (x, y)))
                p0, ctrl = (x, y, t), []
        out.append(segs)
    return out


def evalue(m, t):
    p = [m[0]] + list(m[1]) + [m[2]]
    while len(p) > 1:
        p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
    return p[0]


def r(v):
    x = round(v, 2)
    return str(int(x)) if x == int(x) else str(x)


def versD(ms, ferme=False):
    if not ms:
        return ''
    d = ['M%s %s' % (r(ms[0][0][0]), r(ms[0][0][1]))]
    for _, c, p1 in ms:
        if not c:
            d.append('L%s %s' % (r(p1[0]), r(p1[1])))
        elif len(c) == 1:
            d.append('Q%s %s %s %s' % (r(c[0][0]), r(c[0][1]), r(p1[0]), r(p1[1])))
        else:
            d.append('C%s %s %s %s %s %s' % (r(c[0][0]), r(c[0][1]),
                                             r(c[1][0]), r(c[1][1]),
                                             r(p1[0]), r(p1[1])))
    if ferme:
        d.append('Z')
    return ' '.join(d)


# ═══════════════════════════════════════════════════════════════════════════
#  ③ Le repliage
# ═══════════════════════════════════════════════════════════════════════════

#: Le pas d'échantillonnage de la nappe, en unités du moteur. Il ne sert qu'à
#: TROUVER le point d'en face ; la géométrie rendue reste celle des nœuds.
PAS_NAPPE = 0.8
#: Deux points du même contour ne se font face que s'ils sont assez loin l'un de
#: l'autre le long du tracé — sinon un voisin immédiat passerait pour un vis-à-vis.
ECART_MINI = 33.0
#: Au-delà, il n'y a pas de vis-à-vis : on est à une extrémité, où le contour se
#: replie déjà sur lui-même et où le nœud est déjà sur l'axe. La valeur se
#: déduit : à wght −275 le fût vertical est nul et l'horizontal a croisé de 1,25
#: unité de police ; douze unités de moteur laissent de la marge aux jonctions
#: sans jamais atteindre le bord opposé d'un autre trait.
PORTEE = 12.0
#: ⚠️ **ET LE VIS-À-VIS DOIT ÊTRE EN FACE, PAS PLUS LOIN SUR LE MÊME TRAIT.**
#:   Sur une barre effondrée, les deux bords sont CONFONDUS : n'importe quel
#:   point de l'un est à une unité de l'autre, y compris trente unités plus loin.
#:   Sans cette contrainte, le bout plat de la barre du `t` se faisait tirer vers
#:   l'intérieur de la moitié d'un fût — quarante-six unités de police, et la
#:   barre rendue rentrait de chaque côté. On n'accepte donc que ce qui se trouve
#:   à moins de vingt degrés de la perpendiculaire à la tangente locale.
DE_FACE = 0.35


def _nappe(contours):
    """Le tracé effondré, densément échantillonné, contour par contour."""
    out = []
    for segs in morceaux(contours):
        brut = []
        for m in segs:
            brut += [evalue(m, k / 32) for k in range(32)]
        if not brut:
            out.append(([], 0.0))
            continue
        cum, s = [0.0], 0.0
        for a, b in zip(brut, brut[1:] + brut[:1]):
            s += math.dist(a, b)
            cum.append(s)
        n = max(16, int(round(s / PAS_NAPPE)))
        ech, k = [], 0
        for i in range(n):
            cible = s * i / n
            while cum[k + 1] < cible:
                k += 1
            u = (cible - cum[k]) / max(1e-9, cum[k + 1] - cum[k])
            a, b = brut[k], brut[(k + 1) % len(brut)]
            ech.append((a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])))
        out.append((ech, s))
    return out


def replie(contours):
    """★ **LE MILIEU DES DEUX PASSAGES — l'axe exact, à toute épaisseur.**

    Chaque nœud SUR-COURBE cherche le point qui lui fait face sur l'autre bord
    et se déplace de la moitié de l'écart. Les points de contrôle ne cherchent
    rien : ils ne sont pas sur la courbe, et les projeter déformerait les
    virages serrés. Ils reprennent la moyenne des déplacements de leurs deux
    voisins sur-courbe — le repliage est un champ continu, pas un point à point.
    """
    nappes = _nappe(contours)
    out = []
    for k, nodes in enumerate(contours):
        ech, L = nappes[k]
        depl = []
        for (x, y, t) in nodes:
            if t == 'o':
                depl.append(None)
                continue
            ici, tx, ty = _situe(ech, L, x, y)
            choix, best = None, PORTEE
            for kk, (autre, La) in enumerate(nappes):
                for j, (px, py) in enumerate(autre):
                    d = math.hypot(px - x, py - y)
                    if d >= best or d < 1e-9:
                        continue
                    if abs(((px - x) * tx + (py - y) * ty) / d) > DE_FACE:
                        continue
                    if kk == k:
                        e = abs(La * j / len(autre) - ici)
                        if min(e, La - e) < ECART_MINI:
                            continue
                    choix, best = (px, py), d
            depl.append((0.0, 0.0) if choix is None
                        else ((choix[0] - x) / 2, (choix[1] - y) / 2))
        n = len(nodes)
        for i in range(n):
            if depl[i] is not None:
                continue
            av = next(depl[(i - j) % n] for j in range(1, n) if depl[(i - j) % n])
            ap = next(depl[(i + j) % n] for j in range(1, n) if depl[(i + j) % n])
            depl[i] = ((av[0] + ap[0]) / 2, (av[1] + ap[1]) / 2)
        out.append([(x + dx, y + dy, t) for (x, y, t), (dx, dy) in zip(nodes, depl)])
    return out


def _situe(ech, L, x, y):
    """L'abscisse curviligne d'un nœud sur sa nappe, et la tangente qui y passe."""
    if not ech:
        return 0.0, 1.0, 0.0
    n = len(ech)
    bj, bd = 0, None
    for j, (px, py) in enumerate(ech):
        d = (px - x) ** 2 + (py - y) ** 2
        if bd is None or d < bd:
            bd, bj = d, j
    a, b = ech[(bj - 2) % n], ech[(bj + 2) % n]
    dx, dy = b[0] - a[0], b[1] - a[1]
    m = math.hypot(dx, dy) or 1.0
    return L * bj / n, dx / m, dy / m


def axe(ch, journal=None):
    return replie(effondre(ch, journal))


# ═══════════════════════════════════════════════════════════════════════════
#  ④ Les traits DÉCLARÉS, reposés sur l'axe
# ═══════════════════════════════════════════════════════════════════════════
#
# ★ **ON NE CHERCHE PAS LA TOPOLOGIE DANS L'AXE : ON L'Y APPORTE.** Trois
#   tentatives ont voulu la déduire du dessin — repérer les rebroussements,
#   apparier les brins, et enfin couper l'axe à ses plis et à ses croisements.
#   La dernière est la plus juste dans son principe et c'est elle qui a montré
#   la limite : un axe effondré passe DEUX FOIS au même endroit, et décider
#   lequel des deux passages appartient à quel trait demande une information
#   que le dessin ne porte pas. Elle rendait dix-huit lettres sur vingt-six ; la
#   recette, elle, les rend toutes, parce qu'elle SAIT.
#
# ⚠️ **CE QUI RESTE APPROCHÉ, ET CE QUI NE L'EST PLUS.** L'axe (colonne 4) est
#   exact : Béziers de la source, aucun ré-échantillonnage. Les traits, eux,
#   passent encore par une projection — chaque abscisse du guide rend la MOYENNE
#   de ce qui s'y projette. Ce n'est plus le même ordre de grandeur qu'avant :
#   ce qui se projetait était un squelette relevé sur une grille, ce qui se
#   projette maintenant est la police elle-même. Et on rend soixante points par
#   trait au lieu de quatorze, parce que le nuage sous-jacent le mérite enfin.

#: Combien de points le long de chaque trait. Quatorze suffisaient quand le
#: nuage tremblait ; sur un axe exact, ils étaient devenus le facteur limitant.
ABSCISSES = 60
PAS_AXE = 1.0

#: Combien de fois, AU PLUS, la projection se rejoue sur sa propre sortie. Le
#: nombre effectif se décide lettre par lettre : on s'arrête dès qu'une passe
#: n'améliore plus l'écart moyen à l'axe.
PASSES = 4


#: La tolérance de contact du moteur (`visuel/glyphes.js › TOL`). La recopier
#: n'est pas une redite : c'est elle qui décide si un bout compte comme libre,
#: et un bout libre est le seul qu'on ait le droit de recaler sur un pli.
TOL = 6.0


def _dpoly(p, poly):
    if len(poly) == 1:
        return math.dist(p, poly[0])
    b = None
    for a, c in zip(poly, poly[1:]):
        d = _dseg(p, a, c)
        if b is None or d < b:
            b = d
    return b


def _plat(ch):
    """L'axe, aplati en points régulièrement espacés — chacun avec SA TANGENTE.

    ★ **LA TANGENTE N'EST PAS UN ORNEMENT : c'est elle qui empêche un trait
      d'attirer les points d'un autre.** Là où la barre du `f` croise sa hampe,
      les points de la hampe tombent au plus près de la barre ; moyennés avec
      elle, ils la faisaient plonger en V. Ils descendent, la barre va à plat :
      un produit scalaire suffit à les écarter, et rien d'autre n'était en jeu.
    """
    out = []
    for ci, segs in enumerate(morceaux(axe(ch))):
        brut = []
        for m in segs:
            brut += [evalue(m, k / 32) for k in range(32)]
        if len(brut) < 2:
            continue
        pts = _regulier(brut)
        n = len(pts)
        for i, q in enumerate(pts):
            a, b = pts[(i - 2) % n], pts[(i + 2) % n]
            h = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
            out.append((q, ((b[0] - a[0]) / h, (b[1] - a[1]) / h), ci))
    return out


def _regulier(pts, pas=PAS_AXE):
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


#: |cos| minimal entre la direction d'un point de l'axe et celle du guide pour
#: qu'il puisse lui être attribué : soixante degrés de part et d'autre. Deux
#: traits qui se croisent le font toujours plus franchement que ça — le plus
#: fermé de l'alphabet est le `v`, à quarante-quatre degrés, et ses deux
#: branches ne se recouvrent qu'en un point.
DE_FACE_GUIDE = 0.5

#: Au-delà de cet écart à la médiane du seau, un point n'appartient pas au même
#: passage : les deux bords de l'aller-retour sont à une unité et demie l'un de
#: l'autre, six laissent de la marge sans laisser entrer un trait voisin.
INTRUS = 6.0


def _direction(guide, k):
    a = guide[max(0, k - 1)]
    b = guide[min(len(guide) - 1, k + 1)]
    h = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
    return ((b[0] - a[0]) / h, (b[1] - a[1]) / h)


#: Le pas de la grille de recherche, en unités du moteur.
CASE = 8.0


def _grille(points):
    g = {}
    for p in points:
        g.setdefault((int(p[0] // CASE), int(p[1] // CASE)), []).append(p)
    return g


def _pres(g, p, portee=20):
    """La distance de `p` au point d'axe le plus proche, par cases voisines."""
    cx, cy = int(p[0] // CASE), int(p[1] // CASE)
    for anneau in range(1, portee + 1):
        best = None
        for dx in range(-anneau, anneau + 1):
            for dy in range(-anneau, anneau + 1):
                for q in g.get((cx + dx, cy + dy), ()):
                    d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
                    if best is None or d < best:
                        best = d
        if best is not None:
            return math.sqrt(best)
    return CASE * portee


def _ecart_a_laxe(lignes, casiers):
    """Le PIRE écart à l'axe, et non l'écart moyen.

    ⚠️ La moyenne se laisse tromper : sur le `w`, la deuxième passe redresse une
      branche entière — vingt-six unités d'écart ramenées à six — en déplaçant
      légèrement toutes les autres, si bien que la moyenne EMPIRE pendant que le
      dessin s'améliore. C'est le pire écart que l'œil voit, c'est donc lui qu'on
      suit.
    """
    return max((_pres(casiers, p) for l in lignes for p in l), default=0.0)


#: Demi-fenêtre du test de demi-tour, en échantillons de `_plat` (un par unité).
FENETRE_PLI = 6
#: Au-delà, ce n'est plus un demi-tour mais un virage. Un pli est un
#: RENVERSEMENT : le tracé revient sur lui-même, l'angle vaut cent quatre-vingts
#: degrés à quelques unités près. Aucune courbure de lettre n'en approche.
COS_PLI = -0.3


def plis(nuage):
    """★ **LES BOUTS DE LA LETTRE — là où l'axe effondré fait demi-tour.**

    C'est la seule chose que le dessin dise SANS AMBIGUÏTÉ, et trois tentatives
    de déduire la topologie l'ont confirmé à leurs dépens : un axe effondré est
    un aller-retour, ses plis sont ses extrémités, et rien d'autre ne s'y
    renverse. Le test échouait quand on lui demandait de distinguer un coin d'un
    demi-tour ; on ne lui demande plus que le demi-tour.
    """
    pts = [p for p, _, _ in nuage]
    n = len(pts)
    if n < 3 * FENETRE_PLI:
        return []
    marque = []
    for i in range(n):
        a, b, c = pts[(i - FENETRE_PLI) % n], pts[i], pts[(i + FENETRE_PLI) % n]
        u = (b[0] - a[0], b[1] - a[1])
        v = (c[0] - b[0], c[1] - b[1])
        hu, hv = math.hypot(*u) or 1.0, math.hypot(*v) or 1.0
        marque.append((u[0] * v[0] + u[1] * v[1]) / (hu * hv) < COS_PLI)
    out, i = [], 0
    while i < n:
        if not marque[i]:
            i += 1
            continue
        j = i
        while j + 1 < n and marque[j + 1]:
            j += 1
        out.append(pts[(i + j) // 2])
        i = j + 1
    return out


#: Un bout déclaré ne se recale sur un pli que si le pli est à portée : au-delà,
#: c'est qu'il appartient à un autre trait. Deux cents unités laissent passer
#: l'erreur du `r` — son épaule était déclarée deux cents unités trop loin — sans
#: laisser un `w` confondre deux branches, distantes de plus de trois cents.
PORTEE_PLI = 210.0


def _recale(guide, cible, versLaFin):
    """Amène un bout du guide sur `cible`, en fondant l'écart sur toute sa
    longueur — déplacer le seul dernier point y ferait un coude."""
    n = len(guide) - 1
    ref = guide[-1] if versLaFin else guide[0]
    dx, dy = cible[0] - ref[0], cible[1] - ref[1]
    if math.hypot(dx, dy) < 1e-9:
        return list(guide)
    return [(x + dx * (k / n if versLaFin else 1 - k / n),
             y + dy * (k / n if versLaFin else 1 - k / n))
            for k, (x, y) in enumerate(guide)]


def _sans_intrus(lot):
    """Le centre d'un seau, les points étrangers écartés.

    ⚠️ **DEUX INTRUS SUFFISENT À DÉPLACER UNE MOYENNE DE ONZE UNITÉS.** Au milieu
      du `x`, où la fonte fond ses deux diagonales en une seule masse, un seau de
      vingt points en ramassait deux venus de cent vingt unités plus loin. Deux
      seaux sur soixante-et-un, et la diagonale — une droite — demandait onze
      cubiques au lieu d'une. La MÉDIANE, elle, ne bouge pas : on s'en sert comme
      d'un fil à plomb, puis on moyenne ce qui reste. Les deux passages de
      l'aller-retour, distants d'une unité et demie, y restent tous les deux —
      et c'est bien leur moyenne qu'on veut.
    """
    xs = sorted(z[0] for z in lot)
    ys = sorted(z[1] for z in lot)
    mx, my = xs[len(xs) // 2], ys[len(ys) // 2]
    proches = [z for z in lot if math.dist(z, (mx, my)) <= INTRUS] or lot
    return (sum(z[0] for z in proches) / len(proches),
            sum(z[1] for z in proches) / len(proches))


def _curviligne(pts):
    s, out = 0.0, [0.0]
    for a, b in zip(pts, pts[1:]):
        s += math.dist(a, b)
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
    """Les indices où le guide CHANGE DE DIRECTION franchement — on n'y lisse
    pas, sinon le coin du `l` s'arrondit et le `z` perd ses angles."""
    if seuil is None:
        seuil = math.radians(45)
    dur = set()
    for i in range(1, len(guide) - 1):
        ax, ay = guide[i][0] - guide[i - 1][0], guide[i][1] - guide[i - 1][1]
        bx, by = guide[i + 1][0] - guide[i][0], guide[i + 1][1] - guide[i][1]
        na, nb = math.hypot(ax, ay), math.hypot(bx, by)
        if na < 1e-9 or nb < 1e-9:
            continue
        c = max(-1.0, min(1.0, (ax * bx + ay * by) / (na * nb)))
        if math.acos(c) > seuil:
            dur.add(i)
    return dur


def _contacts(pa, pb, tol=8.0):
    """Lequel des DEUX BOUTS de `pa` touche `pb` — c'est la recette qui le dit,
    et on le reproduit sans le décréter."""
    out = []
    for i in (0, len(pa) - 1):
        if _dpoly(pa[i], pb) <= tol:
            out.append(i)
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  ⑤ L'AJUSTEMENT — le moins de points possible, à une tolérance dite
# ═══════════════════════════════════════════════════════════════════════════
#
# > « il y a encore des raccords foireux et trop de points par rapport au
# >   nécessaire. » (l'auteur)
#
# ★ **UN POINT PAR ÉCHANTILLON EST UN AVEU, PAS UN RÉSULTAT.** Passer une
#   Catmull-Rom par soixante points relevés, c'est rendre le RELEVÉ et non la
#   COURBE : la hampe du `l` sortait en soixante segments cubiques pour un
#   segment droit. On ajuste donc au sens des moindres carrés, et on ne subdivise
#   que là où l'écart le demande — c'est l'algorithme de Schneider, celui-là même
#   qu'un logiciel de dessin emploie pour vectoriser un tracé à main levée.
#
# ⚠️ **LA TOLÉRANCE EST UN CHOIX, ET IL SE DIT.** Une unité du repère du moteur,
#   qui en compte six cents pour une capitale : c'est un six-centième de la
#   hauteur d'un `H`, quand le trait rendu à l'écran en fait vingt-six. L'écart
#   est donc de l'ordre du vingt-sixième d'épaisseur de trait — invisible, et
#   mesuré plutôt que promis (`main` en affiche le pire de l'alphabet).

TOLERANCE = 1.0


def _ajuste(P, tol=TOLERANCE, coins=frozenset()):
    """Le moins de cubiques possible passant à moins de `tol` de `P`."""
    # ⚠️ Les abscisses sans mesure ont été bouchées en recopiant la voisine
    #   connue : elles arrivent ici en doublons exacts, et une corde de longueur
    #   nulle fausse le paramétrage. On les retire, en gardant leur rang pour que
    #   les coins déclarés restent au bon endroit.
    garde = [0] + [i for i in range(1, len(P)) if math.dist(P[i], P[i - 1]) > 1e-9]
    rang = {v: k for k, v in enumerate(garde)}
    P = [P[i] for i in garde]
    coins = {rang[i] for i in coins if i in rang}
    if len(P) < 2:
        p = P[0] if P else (0.0, 0.0)
        return [(p, [p, p], p)]
    # ⚠️ **UN TRACÉ FERMÉ N'A PAS DE CORDE**, et l'ajustement se règle sur elle.
    #   Départ et arrivée confondus, le système devient singulier, la solution de
    #   repli place les deux poignées à distance nulle et tout se subdivise :
    #   l'`o` sortait en douze cubiques pour quatre. On le coupe donc d'abord au
    #   point le plus éloigné du départ — l'autre bout de l'ovale.
    if math.dist(P[0], P[-1]) < 1e-6 * max(1.0, _etendue(P)):
        coins = set(coins) | {max(range(1, len(P) - 1),
                                  key=lambda i: math.dist(P[i], P[0]))}
    bouts = sorted({0, len(P) - 1} | {i for i in coins if 0 < i < len(P) - 1})
    out = []
    for a, b in zip(bouts, bouts[1:]):
        tronc = P[a:b + 1]
        if len(tronc) < 2:
            continue
        out += _cubiques(tronc, _tangente(tronc, 0, 1), _tangente(tronc, -1, -1), tol)
    return out


def _etendue(P):
    return max(math.dist(P[0], q) for q in P)


def _tangente(P, i, vers):
    """La direction d'un bout VERS L'INTÉRIEUR du tronçon.

    ⚠️ **LES DEUX TANGENTES POINTENT VERS LE DEDANS**, celle du départ comme
      celle de l'arrivée : ce sont les directions des deux poignées, et une
      poignée sort toujours de son point vers l'autre bout. L'avoir écrite à
      l'envers pour l'arrivée faisait placer la seconde poignée AU-DELÀ de la fin
      du tronçon ; l'ajustement échouait, et la hampe du `l` — une droite —
      ressortait en douze cubiques.

    ★ **ET ON NE PREND PAS LA CORDE : ON PREND LE CERCLE DES TROIS POINTS.** Sur
      un arc, la corde est BIAISÉE de la moitié de l'angle parcouru — trois
      degrés sur nos écartements. Trois degrés d'erreur au bout d'une poignée
      longue de cent unités, c'est six unités d'écart au milieu : l'ajusteur
      concluait à un défaut de forme et subdivisait. Un quart de cercle demandait
      trois cubiques quand une seule le rend à cinq centièmes d'unité près.
    """
    n = len(P)
    a = P[i]
    b = P[(i + vers * min(2, n - 1)) % n]
    c = P[(i + vers * min(4, n - 1)) % n]
    t = _tangente_cercle(a, b, c)
    if t is not None:
        return t
    dx, dy = c[0] - a[0], c[1] - a[1]
    h = math.hypot(dx, dy)
    return (0.0, 0.0) if h < 1e-9 else (dx / h, dy / h)


def _tangente_cercle(a, b, c):
    """La tangente en `a` au cercle passant par `a`, `b`, `c` — ou rien si les
    trois sont alignés, auquel cas la corde ne ment pas."""
    ax, ay = b[0] - a[0], b[1] - a[1]
    bx, by = c[0] - a[0], c[1] - a[1]
    d = 2 * (ax * by - ay * bx)
    la, lb = ax * ax + ay * ay, bx * bx + by * by
    if la < 1e-12 or lb < 1e-12:
        return None
    if abs(d) < 1e-9 * math.sqrt(la * lb):
        return None
    # centre du cercle, dans le repère où `a` est l'origine
    cx = (by * la - ay * lb) / d
    cy = (ax * lb - bx * la) / d
    # tangente = perpendiculaire au rayon, orientée vers `c`
    tx, ty = -cy, cx
    h = math.hypot(tx, ty)
    if h < 1e-9:
        return None
    tx, ty = tx / h, ty / h
    return (tx, ty) if tx * bx + ty * by >= 0 else (-tx, -ty)


def _cubiques(P, t1, t2, tol, profondeur=0):
    if len(P) == 2:
        d = math.dist(P[0], P[1]) / 3
        return [(P[0], [(P[0][0] + t1[0] * d, P[0][1] + t1[1] * d),
                        (P[1][0] + t2[0] * d, P[1][1] + t2[1] * d)], P[1])]
    u = _parametres(P)
    bez = _moindres_carres(P, u, t1, t2)
    err, coupe = _ecart_max(P, bez, u)
    if err < tol:
        return [bez]
    # ★ **ON RE-PARAMÈTRE AVANT DE SUBDIVISER, ET C'EST TOUT L'ÉCART.** La
    #   longueur de corde n'est qu'une PREMIÈRE estimation du paramètre de
    #   chaque point ; là où la courbe accélère, elle se trompe assez pour faire
    #   croire à un défaut de forme. Subdiviser là-dessus coupait la hampe du
    #   `l` — un segment droit — en quatre cubiques. Newton-Raphson ramène
    #   chaque point sur son vrai paramètre, et le même ajustement passe.
    if err < tol * 24:
        for _ in range(6):
            u = _reparametre(P, bez, u)
            bez = _moindres_carres(P, u, t1, t2)
            err, coupe = _ecart_max(P, bez, u)
            if err < tol:
                return [bez]
    if profondeur > 14 or coupe <= 0 or coupe >= len(P) - 1:
        return [bez]
    tc = _tangente_milieu(P, coupe)
    return (_cubiques(P[:coupe + 1], t1, (-tc[0], -tc[1]), tol, profondeur + 1)
            + _cubiques(P[coupe:], tc, t2, tol, profondeur + 1))


def _tangente_milieu(P, i):
    dx, dy = P[i + 1][0] - P[i - 1][0], P[i + 1][1] - P[i - 1][1]
    h = math.hypot(dx, dy) or 1.0
    return (dx / h, dy / h)


def _parametres(P):
    """Paramétrage par longueur de corde : la meilleure première estimation."""
    u = [0.0]
    for a, b in zip(P, P[1:]):
        u.append(u[-1] + math.dist(a, b))
    total = u[-1] or 1.0
    return [x / total for x in u]


def _B(i, t):
    return ((1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3)[i]


def _moindres_carres(P, u, t1, t2):
    """Les deux poignées qui minimisent l'écart, tangentes imposées."""
    p0, p3 = P[0], P[-1]
    c = [[0.0, 0.0], [0.0, 0.0]]
    x = [0.0, 0.0]
    for pt, t in zip(P, u):
        a1 = (t1[0] * _B(1, t), t1[1] * _B(1, t))
        a2 = (t2[0] * _B(2, t), t2[1] * _B(2, t))
        c[0][0] += a1[0] * a1[0] + a1[1] * a1[1]
        c[0][1] += a1[0] * a2[0] + a1[1] * a2[1]
        c[1][0] = c[0][1]
        c[1][1] += a2[0] * a2[0] + a2[1] * a2[1]
        tmp = (pt[0] - (p0[0] * (_B(0, t) + _B(1, t)) + p3[0] * (_B(2, t) + _B(3, t))),
               pt[1] - (p0[1] * (_B(0, t) + _B(1, t)) + p3[1] * (_B(2, t) + _B(3, t))))
        x[0] += a1[0] * tmp[0] + a1[1] * tmp[1]
        x[1] += a2[0] * tmp[0] + a2[1] * tmp[1]
    det = c[0][0] * c[1][1] - c[1][0] * c[0][1]
    if abs(det) < 1e-12:
        a = math.dist(p0, p3) / 3
        b = a
    else:
        a = (x[0] * c[1][1] - c[0][1] * x[1]) / det
        b = (c[0][0] * x[1] - x[0] * c[1][0]) / det
    # ⚠️ **UNE POIGNÉE PLUS LONGUE QUE LA CORDE FAIT UNE BOUCLE**, et les moindres
    #   carrés n'ont aucune raison de s'en priver : ils minimisent une somme de
    #   carrés, pas une allure. Sur l'épaule du `r` et la hampe du `j`, la
    #   solution partait à trois fois la corde et le trait se repliait en nœud
    #   papillon — mesure impeccable, dessin absurde. On borne donc les deux
    #   poignées à la longueur de la corde ; c'est la limite au-delà de laquelle
    #   une cubique ne peut plus rester simple.
    corde = math.dist(p0, p3)
    seuil = corde * 1e-6
    if a < seuil or b < seuil:
        a = b = corde / 3
    a, b = min(a, corde), min(b, corde)
    return (p0, [(p0[0] + t1[0] * a, p0[1] + t1[1] * a),
                 (p3[0] + t2[0] * b, p3[1] + t2[1] * b)], p3)


def _ecart_max(P, bez, u):
    pire, ou = 0.0, len(P) // 2
    for i, (pt, t) in enumerate(zip(P, u)):
        q = evalue(bez, t)
        d = math.dist(q, pt)
        if d > pire:
            pire, ou = d, i
    return pire, ou


def _reparametre(P, bez, u):
    """Newton-Raphson : chaque point retrouve son vrai paramètre sur la courbe."""
    p0, (c1, c2), p3 = bez[0], bez[1], bez[2]
    q = [p0, c1, c2, p3]
    q1 = [((q[i + 1][0] - q[i][0]) * 3, (q[i + 1][1] - q[i][1]) * 3) for i in range(3)]
    q2 = [((q1[i + 1][0] - q1[i][0]) * 2, (q1[i + 1][1] - q1[i][1]) * 2) for i in range(2)]
    out = []
    for pt, t in zip(P, u):
        d = (evalue(bez, t)[0] - pt[0], evalue(bez, t)[1] - pt[1])
        d1 = _bez2(q1, t)
        d2 = _bez1(q2, t)
        num = d[0] * d1[0] + d[1] * d1[1]
        den = d1[0] ** 2 + d1[1] ** 2 + d[0] * d2[0] + d[1] * d2[1]
        out.append(t if abs(den) < 1e-12 else min(1.0, max(0.0, t - num / den)))
    return out


def _bez2(q, t):
    a = [((1 - t) * q[i][0] + t * q[i + 1][0], (1 - t) * q[i][1] + t * q[i + 1][1])
         for i in range(2)]
    return ((1 - t) * a[0][0] + t * a[1][0], (1 - t) * a[0][1] + t * a[1][1])


def _bez1(q, t):
    return ((1 - t) * q[0][0] + t * q[1][0], (1 - t) * q[0][1] + t * q[1][1])


def _echelonne(pts):
    """Une polyligne ramenée à `ABSCISSES + 1` points équidistants."""
    s, longueur_ = _curviligne(pts)
    if longueur_ < 1e-9:
        return [pts[0]] * (ABSCISSES + 1)
    return [_au(pts, s, longueur_, k / ABSCISSES) for k in range(ABSCISSES + 1)]


def _pose(nuage, guides, coins):
    """★ **UNE PASSE DE PROJECTION : chaque point de l'axe rejoint le guide le
      plus proche, chaque abscisse rend le centre de ce qu'elle a reçu.**

    ⚠️ **ET LA PASSE SE REJOUE SUR SA PROPRE SORTIE.** Le guide de la recette
      n'est qu'une approximation dessinée à l'arc, et sur certaines lettres elle
      est franchement mauvaise : l'épaule du `r` est décrite par une ellipse de
      rayons 311 × 118, bien trop plate pour la courbe réelle. Un guide faux
      attire les points au mauvais endroit, et le trait rendu se repliait en
      boucle — à quatre-vingt-dix-huit unités de l'axe. Rejouer la projection en
      prenant le résultat pour guide corrige la géométrie sans toucher à la
      topologie : la recette garde ce qu'elle sait, l'axe reprend ce qu'il sait.
    """
    # ① chaque point de l'axe rejoint le trait, puis l'abscisse, les plus proches
    #    — parmi ceux dont la direction est compatible avec la sienne.
    tangentes = [[_direction(g, k) for k in range(len(g))] for g in guides]
    seaux = [[[] for _ in range(ABSCISSES + 1)] for _ in guides]
    for p, u, _ in nuage:
        choix, meilleur = None, None
        for t, guide in enumerate(guides):
            for k, q in enumerate(guide):
                v = tangentes[t][k]
                if abs(u[0] * v[0] + u[1] * v[1]) < DE_FACE_GUIDE:
                    continue
                d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
                if meilleur is None or d < meilleur:
                    meilleur, choix = d, (t, k)
        if choix is not None:
            seaux[choix[0]][choix[1]].append(p)

    # ② chaque abscisse rend le CENTRE de ce qui s'y projette, intrus écartés ;
    #    les trous s'interpolent entre les points MESURÉS voisins, jamais depuis
    #    le guide — alterner deviné et mesuré fait serpenter les traits droits.
    #
    # ⚠️ **ON A ESSAYÉ DE NE GARDER QUE L'ÉCART PERPENDICULAIRE AU GUIDE**, en
    #   tenant la position le long du trait du guide lui-même, régulier et
    #   monotone. Ça n'a rien donné, et pour une raison qui se mesure : la panse
    #   du `b` passe à soixante unités de son guide, et une erreur d'un degré sur
    #   la normale d'une polyligne s'y traduit par une unité de déplacement. Le
    #   report perpendiculaire AMPLIFIE le bruit d'orientation du guide
    #   proportionnellement à l'écart. La position mesurée, elle, ne doit rien
    #   au guide.
    lignes = []
    for t, guide in enumerate(guides):
        if max(abs(q[0] - guide[0][0]) + abs(q[1] - guide[0][1]) for q in guide) < 1e-6:
            lignes.append(list(guide))          # un point : le `i`, le `j`
            continue
        mes = [None] * len(guide)
        for k in range(len(guide)):
            lot = seaux[t][k]
            if lot:
                mes[k] = _sans_intrus(lot)
        # ⚠️ **UN TROU SE COMBLE ENTRE MESURES VOISINES, ET PAS AUTREMENT.** On a
        #   essayé d'y mettre le point d'axe le plus proche du guide : c'est
        #   pourtant encore une mesure, et elle est sur l'axe par construction —
        #   mais rien ne garantit qu'elle AVANCE. Deux abscisses voisines
        #   ramenaient deux points pris à contresens, la suite se repliait sur
        #   elle-même, et l'épaule du `r` sortait en boucle, le `j` en chiffon.
        #   L'interpolation, elle, avance toujours.
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
        lignes.append(_lisser(ligne, coins[t]))
    return lignes


def traits(ch, recette, points_du_trace, journal=None):
    """Les traits DÉCLARÉS par `recette`, reposés sur l'axe EXACT de `ch`."""
    nuage = _plat(ch)
    decl, jonctions = recette

    guides = [_echelonne(points_du_trace(t['d'])) for t in decl]
    # ★ Les COINS restent ceux que la recette déclare : c'est une lecture du
    #   dessin, et une passe de projection ne saurait ni les inventer ni les
    #   perdre. Seule la géométrie se corrige d'une passe à l'autre.
    coins = [_anguleux(g) for g in guides]

    # ⚠️ **LE POINT DU `i` ET DU `j` SE SERT AVANT LES AUTRES, ET SORT DU NUAGE.**
    #   Un trait DÉGÉNÉRÉ n'a pas de direction ; le filtre de tangente rejetait
    #   donc tout pour lui, et son anneau d'axe — un point effondré reste un
    #   anneau minuscule — partait grossir le seau le plus proche de la hampe.
    #   Cent quatre-vingt-six unités plus bas, l'empattement du `i` s'en trouvait
    #   tiré vers le haut, et le `j` finissait à cent trente-deux unités de son
    #   axe.
    #
    # ★ **ET IL SE PREND PAR CONTOUR, PAS PAR RAYON.** Un point est un CONTOUR À
    #   LUI SEUL — c'est exact, et ça ne demande aucun seuil. Le rayon, lui,
    #   partait d'un repère que la recette pose au SOMMET de la boîte du signe et
    #   non au centre du point : la moitié basse de l'anneau lui échappait de six
    #   unités, repartait dans la hampe, et faisait monter le `i` et le `j` de
    #   trente unités au-dessus de la hauteur d'x — un crochet en l'air, sur les
    #   deux seules lettres qui en portent un.
    points, reste = [], list(nuage)
    for t, g in enumerate(guides):
        if max(math.dist(g[0], q) for q in g) >= 1e-6:
            points.append(None)
            continue
        proche = min(reste, key=lambda pu: math.dist(pu[0], g[0]), default=None)
        if proche is None:
            points.append(g[0])
            continue
        sien = proche[2]
        lot = [pu[0] for pu in reste if pu[2] == sien]
        reste = [pu for pu in reste if pu[2] != sien]
        points.append((sum(z[0] for z in lot) / len(lot),
                       sum(z[1] for z in lot) / len(lot)))

    # ★ **LES BOUTS LIBRES SE RECALENT SUR LES PLIS DE L'AXE — avant tout le
    #   reste.** Un bout qu'aucune jonction ne retient est une extrémité de la
    #   lettre, et une extrémité de la lettre est un PLI de l'axe effondré : le
    #   seul repère que le dessin donne sans ambiguïté. La recette, elle, peut se
    #   tromper de deux cents unités — elle envoie l'épaule du `r` en haut à
    #   droite (439, 452) quand la police l'arrête à mi-hauteur (395, 259) — et
    #   un guide faux de deux cents unités ne se rattrape par aucune itération.
    #   L'écart se fond sur toute la longueur du guide : déplacer le seul dernier
    #   point y ferait un coude que la projection prendrait pour un relief.
    liens = [set() for _ in decl]
    for j in jonctions:
        a, b = int(j[0]), int(j[1])
        if 0 <= a < len(decl) and 0 <= b < len(decl):
            liens[a].add(b)
            liens[b].add(a)
    # ⚠️ **MAIS TOUS LES PLIS NE SONT PAS DES BOUTS.** L'axe se renverse aussi
    #   dans les carrefours — le `m` en montre trois qui n'appartiennent à aucune
    #   extrémité, le `g` autant. Recaler dessus a fait passer le `m` de seize
    #   unités d'écart à soixante-dix-huit et le `g` de douze à cent dix. On ne
    #   sait pas dire lesquels sont vrais ; on n'a pas à le savoir. On pose la
    #   lettre DEUX FOIS, avec et sans recalage, et on garde celle qui serre
    #   l'axe de plus près. Le `r` y gagne cent unités, le `m` et le `g` n'y
    #   perdent rien.
    lespis = plis(reste)
    recales = list(guides)
    for t, g in enumerate(guides):
        if points[t] is not None or not lespis:
            continue
        for versLaFin in (False, True):
            bout = g[-1] if versLaFin else g[0]
            if any(_dpoly(bout, guides[k]) <= TOL for k in liens[t]):
                continue                       # ce bout-là est tenu par un voisin
            cible = min(lespis, key=lambda q: math.dist(q, bout))
            if math.dist(cible, bout) <= PORTEE_PLI:
                g = _recale(g, cible, versLaFin)
        recales[t] = g

    # ★ **ON REJOUE TANT QUE ÇA RAPPROCHE DE L'AXE, ET ON S'ARRÊTE DÈS QUE ÇA
    #   ÉLOIGNE.** Rejouer la projection sur sa propre sortie corrige la plupart
    #   des lettres — le `w` passe de vingt-six unités d'écart à six, le `z` de
    #   neuf à deux — mais DIVERGE sur celles dont la première passe est déjà
    #   fausse : le `j` s'éloignait de quatre-vingt-dix-sept à cent trente-deux.
    #   Le critère d'arrêt n'a donc pas à être choisi, il se mesure.
    casiers = _grille([p for p, _, _ in reste])

    def poser(depart):
        lignes_, note_ = depart, None
        for _ in range(PASSES):
            essai = _pose(reste, [_echelonne(l) for l in lignes_], coins)
            note = _ecart_a_laxe(essai, casiers)
            if note_ is not None and note >= note_:
                break
            lignes_, note_ = essai, note
        return lignes_, (note_ if note_ is not None else 1e18)

    lignes, note = poser(guides)
    if recales is not guides:
        autres, autreNote = poser(recales)
        if autreNote < note:
            lignes, note = autres, autreNote
    for t, c in enumerate(points):
        if c is not None:
            lignes[t] = [c] * (ABSCISSES + 1)

    # ③ les contacts se REPRODUISENT tels que la recette les réalise
    origines = [points_du_trace(t['d']) for t in decl]
    for jonc in jonctions:
        a, b = int(jonc[0]), int(jonc[1])
        if not (0 <= a < len(lignes) and 0 <= b < len(lignes)):
            continue
        for (u, v) in ((a, b), (b, a)):
            for iBout in _contacts(origines[u], origines[v]):
                i = 0 if iBout == 0 else len(lignes[u]) - 1
                p = lignes[u][i]
                lignes[u][i] = min(lignes[v],
                                   key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)

    # ⑤ chaque trait est ensuite AJUSTÉ : le moins de cubiques possible à une
    #    unité près. Les coins du guide sont imposés comme bornes — un ajustement
    #    qui n'en saurait rien arrondirait le pied du `l` et le `z`.
    ajustes = [_ajuste(ligne, TOLERANCE, coins[t]) for t, ligne in enumerate(lignes)]
    if journal is not None:
        # ★ Ce que la projection a COÛTÉ : le pire écart du trait rendu à l'axe,
        #   mesuré sur le tracé final et non sur les points qui l'ont produit.
        pire = 0.0
        for t, chem in enumerate(ajustes):
            if points[t] is not None:
                continue                       # le point du `i`, du `j`
            for m in chem:
                pire = max([pire] + [_pres(casiers, evalue(m, k / 12))
                                     for k in range(13)])
        journal.append((pire, ch))
    return ([{'d': versD(chem), 'ouvert': decl[t].get('ouvert', True)}
             for t, chem in enumerate(ajustes)], jonctions)

# ═══════════════════════════════════════════════════════════════════════════

def _recettes():
    import importlib.util as iu
    sp = iu.spec_from_file_location('jetbrains_traces',
                                    str(RACINE / 'src' / 'gfx' / 'jetbrains-traces.py'))
    mod = iu.module_from_spec(sp)
    sys.modules['jetbrains_traces'] = mod
    argv, sys.argv = sys.argv, [sys.argv[0]]
    sp.loader.exec_module(mod)
    sys.argv = argv
    return mod.recettes(mod.mesures()), mod.points_du_trace


def main():
    print('— l’axe LU dans les sources de %s v%s —'
          % (DONNEES['police'], DONNEES['version']))
    print('  fûts déclarés %s→%s : %s→%s vertical, %s→%s horizontal'
          % (MAIGRE_A, MAIGRE_B,
             DONNEES['futs'][MAIGRE_A][1], DONNEES['futs'][MAIGRE_B][1],
             DONNEES['futs'][MAIGRE_A][0], DONNEES['futs'][MAIGRE_B][0]))
    print('  l’encre s’annule à wght %s (échelle %.4f)' % (r(MAIGRE), ECHELLE))

    journal, axes = [], {}
    for ch in BAS_DE_CASSE + CAPITALES:
        ms = morceaux(axe(ch, journal))
        axes[ch] = ' '.join(versD(m, ferme=True) for m in ms if m)
    print('  encoches dégrafées : %d sur %d signes'
          % (sum(len(j[2]) for j in journal), len({j[0] for j in journal})))
    for ch, k, pts in journal:
        print('    %s[%d] %s' % (ch, k, ' '.join('(%d,%d)' % p for p in pts)))

    rec, points_du_trace = _recettes()
    ecarts = []
    poses = {ch: traits(ch, rec[ch], points_du_trace, ecarts)
             for ch in BAS_DE_CASSE}

    # ★ **CE QUE LA POSE COÛTE, LETTRE PAR LETTRE.** `AXES` est exact ; `TRAITS`
    #   est projeté, et l'écart entre les deux est le seul chiffre qui dise ce
    #   que la projection a perdu. Il prédit à peu près l'œil : les lettres que
    #   l'auteur a dites « au point » sont celles qui tiennent sous trois unités.
    print('  écart des traits à l’axe, en unités du moteur (capitale = 600) :')
    for pire, ch in sorted(ecarts):
        print('    %s %5.1f %s' % (ch, pire, '·' * min(40, int(pire))))

    lignes = [
        "/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-axe.py` — ne pas éditer à la main.",
        " *",
        " * L'AXE des lettres, lu dans les sources de JetBrains Mono : les trois",
        " * masters déclarent leurs fûts, l'épaisseur s'annule à wght %s, et les deux" % r(MAIGRE),
        " * bords d'un trait s'y rejoignent sur son axe. Ce n'est pas une",
        " * reconstruction — c'est la police à une graisse qu'elle décrit sans",
        " * l'exposer, repliée sur elle-même pour que les deux bords se confondent",
        " * exactement quelle que soit l'épaisseur locale.",
        " *",
        " * ⚠️ `AXES` reste un ALLER-RETOUR : le contour longe l'axe puis revient. Pour",
        " *   l'œil c'est un trait ; pour `moteur/tables/glyphes.js`, qui compte des",
        " *   sous-chemins et des boucles, ce n'en est pas un. C'est `TRAITS` qui",
        " *   porte une topologie — celle que les recettes DÉCLARENT, taillée dans",
        " *   cet axe par de Casteljau.",
        " */",
        "export const AXES = {",
    ]
    for ch, d in axes.items():
        lignes.append('  %r: %r,' % (ch, d))
    lignes.append('};')
    lignes.append('')
    lignes.append('/** Les traits DÉCLARÉS par les recettes, taillés dans l’axe EXACT. */')
    lignes.append('export const TRAITS = {')
    for ch, (t, jonc) in poses.items():
        lignes.append('  %r: { traits: [%s], jonctions: %s },' % (
            ch,
            ', '.join('{ d: %r, ouvert: %s }' % (x['d'], 'true' if x['ouvert'] else 'false')
                      for x in t),
            '[' + ', '.join('[%d, %d]' % (int(j[0]), int(j[1])) for j in jonc) + ']'))
    lignes.append('};')
    CIBLE.write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_glyphes-axe.js (%d axes, %d jeux de traits)'
          % (len(axes), len(poses)))


if __name__ == '__main__':
    main()
