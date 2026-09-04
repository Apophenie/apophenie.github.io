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
    for segs in morceaux(axe(ch)):
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
            out.append((q, ((b[0] - a[0]) / h, (b[1] - a[1]) / h)))
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


def _direction(guide, k):
    a = guide[max(0, k - 1)]
    b = guide[min(len(guide) - 1, k + 1)]
    h = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
    return ((b[0] - a[0]) / h, (b[1] - a[1]) / h)


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


def _catmull(P):
    """Un chemin lisse à travers des points, sans en inventer entre eux."""
    if len(P) < 2:
        return 'M%s %s L%s %s' % (r(P[0][0]), r(P[0][1]), r(P[0][0]), r(P[0][1]))
    d = ['M %s %s' % (r(P[0][0]), r(P[0][1]))]
    n = len(P)
    for i in range(n - 1):
        p0 = P[i - 1] if i > 0 else P[0]
        p1, p2 = P[i], P[i + 1]
        p3 = P[i + 2] if i + 2 < n else P[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append('C %s %s %s %s %s %s' % (r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1]),
                                          r(p2[0]), r(p2[1])))
    return ' '.join(d)


def traits(ch, recette, points_du_trace):
    """Les traits DÉCLARÉS par `recette`, reposés sur l'axe EXACT de `ch`."""
    nuage = _plat(ch)
    decl, jonctions = recette

    guides = []
    for t in decl:
        pts = points_du_trace(t['d'])
        s, longueur_ = _curviligne(pts)
        guides.append([_au(pts, s, longueur_, k / ABSCISSES)
                       for k in range(ABSCISSES + 1)])

    # ① chaque point de l'axe rejoint le trait, puis l'abscisse, les plus proches
    #    — parmi ceux dont la direction est compatible avec la sienne.
    tangentes = [[_direction(g, k) for k in range(len(g))] for g in guides]
    seaux = [[[] for _ in range(ABSCISSES + 1)] for _ in decl]
    for p, u in nuage:
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
                xs = sorted(z[0] for z in lot)
                ys = sorted(z[1] for z in lot)
                mes[k] = (xs[len(xs) // 2], ys[len(ys) // 2])
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
                i = 0 if iBout == 0 else len(lignes[u]) - 1
                p = lignes[u][i]
                lignes[u][i] = min(lignes[v],
                                   key=lambda q: (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2)

    return ([{'d': _catmull(ligne), 'ouvert': decl[t].get('ouvert', True)}
             for t, ligne in enumerate(lignes)], jonctions)

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
    poses = {ch: traits(ch, rec[ch], points_du_trace) for ch in BAS_DE_CASSE}

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
