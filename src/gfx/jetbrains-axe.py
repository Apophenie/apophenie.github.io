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

#: ★ **L'ÉTALON DE TOUTES LES DISTANCES DE FORME : LE FÛT.**
#:
#: > « fais-tu des correctifs au cas par cas ou une mise à jour des règles pour
#: >   que ça marche aussi si je changeais de fonte ? » (l'auteur)
#:
#: Les seuils qui parlent de FORME — la saillie d'une encoche, la longueur d'un
#: moignon, la portée d'un carrefour — n'ont de sens que rapportés à l'épaisseur
#: du trait. Écrits en dur, ils dataient d'une police. Rapportés au fût, que la
#: source DÉCLARE, ils suivent la police qu'on lui donne. Les seuils qui parlent
#: de RENDU — la tolérance d'ajustement, le pas d'échantillonnage — restent
#: absolus : ils se mesurent contre le cadre de dessin, pas contre l'encre.
FUT = DONNEES['futs'][MAIGRE_B][1] * ECHELLE


# ═══════════════════════════════════════════════════════════════════════════
#  ① Les encoches de jonction
# ═══════════════════════════════════════════════════════════════════════════

#: La saillie d'une encoche et la longueur de ses côtés. Les deux se mesurent
#: contre le fût (90) : un ressaut de vingt unités sur un fût de quatre-vingt-dix
#: n'est pas un trait, c'est un détail d'encrage. Aucun trait du dessin ne
#: descend sous quarante-huit unités — le plus court, le crochet du `l`, en fait
#: cent quatre-vingts.
SAILLIE = 0.35 * FUT
COTE = 0.65 * FUT

#: Sous ce seuil, un nœud est SUR la droite de ses voisins : le retirer ne
#: déplace pas le contour, il en retire seulement un point devenu inutile une
#: fois l'encoche dégrafée.
PLAT = 0.055 * FUT


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
ECART_MINI = 0.45 * FUT
#: Au-delà, il n'y a pas de vis-à-vis : on est à une extrémité, où le contour se
#: replie déjà sur lui-même et où le nœud est déjà sur l'axe. La valeur se
#: déduit : à wght −275 le fût vertical est nul et l'horizontal a croisé de 1,25
#: unité de police ; douze unités de moteur laissent de la marge aux jonctions
#: sans jamais atteindre le bord opposé d'un autre trait.
PORTEE = 0.16 * FUT
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
        brut, droits = [], []
        for m in segs:
            brut += [evalue(m, k / 32) for k in range(32)]
            droits += [not m[1]] * 32          # `m[1]` vide : c'est un `L`
        if len(brut) < 2:
            continue
        pts, tag = _regulier(brut, marques=droits)
        n = len(pts)
        for i, q in enumerate(pts):
            a, b = pts[(i - 2) % n], pts[(i + 2) % n]
            h = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
            out.append((q, ((b[0] - a[0]) / h, (b[1] - a[1]) / h), ci, tag[i]))
    return out


def _regulier(pts, pas=PAS_AXE, marques=None):
    out, tag, reste = [pts[0]], [bool(marques[0]) if marques else False], 0.0
    for i, (a, b) in enumerate(zip(pts, pts[1:] + [pts[0]])):
        d = math.dist(a, b)
        if d < 1e-9:
            continue
        t = reste
        while t < d:
            u = t / d
            out.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
            tag.append(bool(marques[i]) if marques else False)
            t += pas
        reste = t - d
    return (out, tag) if marques is not None else out


#: |cos| minimal entre la direction d'un point de l'axe et celle du guide pour
#: qu'il puisse lui être attribué : soixante degrés de part et d'autre. Deux
#: traits qui se croisent le font toujours plus franchement que ça — le plus
#: fermé de l'alphabet est le `v`, à quarante-quatre degrés, et ses deux
#: branches ne se recouvrent qu'en un point.
DE_FACE_GUIDE = 0.5

#: Au-delà de cet écart à la médiane du seau, un point n'appartient pas au même
#: passage : les deux bords de l'aller-retour sont à une unité et demie l'un de
#: l'autre, six laissent de la marge sans laisser entrer un trait voisin.
INTRUS = 0.08 * FUT

#: La part de la population médiane qu'un seau doit atteindre pour compter comme
#: une mesure. Un quart : les seaux d'un même trait se tiennent à peu près, et
#: ceux qui tombent très en dessous sont des attributions parasites.
QUORUM = 0.1


def _direction(guide, k):
    a = guide[max(0, k - 1)]
    b = guide[min(len(guide) - 1, k + 1)]
    h = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
    return ((b[0] - a[0]) / h, (b[1] - a[1]) / h)


#: Le pas de la grille de recherche, en unités du moteur.
CASE = 8.0


def _grille(points):
    """Le nuage de l'axe, casé — chaque entrée garde sa marque de rectitude."""
    g = {}
    for p in points:
        g.setdefault((int(p[0] // CASE), int(p[1] // CASE)), []).append(p)
    return g


def _plus_proche(g, p, portee=20):
    """Le point d'axe le plus proche, avec ce qu'il sait — ou `None`."""
    cx, cy = int(p[0] // CASE), int(p[1] // CASE)
    for anneau in range(1, portee + 1):
        best, bd = None, None
        for dx in range(-anneau, anneau + 1):
            for dy in range(-anneau, anneau + 1):
                for q in g.get((cx + dx, cy + dy), ()):
                    d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
                    if bd is None or d < bd:
                        bd, best = d, q
        if best is not None:
            return best, math.sqrt(bd)
    return None, CASE * portee


def _sur_droit(g, p):
    """L'axe est-il DROIT à cet endroit ? La source le dit : un `L` est un `L`."""
    q, _ = _plus_proche(g, p)
    return bool(q is not None and len(q) > 2 and q[2])


def _direction_axe(g, p, sens):
    """★ **LA DIRECTION D'UNE POIGNÉE SE LIT SUR L'AXE, PAS SUR LE RELEVÉ.**

    > « peut-être que gérer les courbes de Bézier avec les poignées en repère
    >   radial plutôt que x y t'aidera à faire ce calibrage » (l'auteur)

    C'est déjà le cas — l'ajustement ne cherche que la LONGUEUR des deux
    poignées, leur direction lui étant imposée. Mais il la recevait des points
    PROJETÉS, qui tremblent d'une unité ou deux : une poignée longue de cent
    unités partait alors deux à trois degrés de travers, et c'est exactement ce
    que l'auteur voit — « les poignées devraient être dans 2 directions et leur
    opposé, aucune autre ». L'axe, lui, est fait de Béziers exactes ; sa tangente
    est connue. On la lui prend.
    """
    q, _ = _plus_proche(g, p)
    if q is None or len(q) < 4:
        return None
    tx, ty = q[3]
    return (tx, ty) if (tx * sens[0] + ty * sens[1]) >= 0 else (-tx, -ty)


def _pres(g, p, portee=20):
    """La distance de `p` au point d'axe le plus proche, par cases voisines."""
    return _plus_proche(g, p, portee)[1]


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
    pts = [p for p, _, _, _ in nuage]
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
PORTEE_PLI = 2.85 * FUT


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


def _fin_de_droite(P, a, b, guide):
    """★ **UNE DROITE S'ARRÊTE OÙ LA MESURE LA QUITTE, PAS OÙ LA RECETTE LE DIT.**

    > « la poignée en bas devrait être verticale et donc le point un peu plus
    >   haut » (l'auteur, sur le `l`)

    ⚠️ La recette est une LECTURE : elle dit « ici un fût droit, puis un virage »
      mais elle place la frontière à vue. Sur le `l` elle la met à y = 45 quand
      l'axe quitte la verticale à y = 90 ; sur le `t`, à y = 42 pour une tangence
      à y = 82. Le fût rendu mordait donc de quarante-cinq unités sur le virage,
      et la courbe qui reprenait derrière devait rattraper tout le retard d'un
      coup : dix unités d'écart à l'axe et une poignée que la tangence ne pouvait
      redresser qu'en s'écartant davantage.

    On rogne donc le tronçon déclaré droit tant que ses points s'écartent de plus
    d'une unité de la droite ajustée — et on refait l'ajustement après chaque
    rognage, puisque les points rognés étaient précisément ceux qui la tiraient.
    Ce qui est rogné n'est pas perdu : il revient au tronçon voisin, qui est
    courbe, et c'est bien de la courbe.
    """
    # ⚠️ Le guide compte `ABSCISSES + 1` points, `P` peut en compter moins :
    #   `_ajuste` retire les abscisses en doublon avant de découper. On borne
    #   donc, faute de quoi le `b` et le `q` lèvent un IndexError.
    b = min(b, len(P) - 1)
    if guide is None or b - a < 4 or not _guide_droit(guide, a, b):
        return None
    mini = max(2, PART_DROITE * len(guide))
    i, j = a, b
    for _ in range(4):
        droite = _droite_ajustee(P[i:j + 1], [True] * (j - i + 1))
        if droite is None:
            return None
        declaree = _versLe(guide[i], guide[j])
        if declaree != (0.0, 0.0):
            mesuree = _versLe(droite[0], droite[1])
            if abs(mesuree[0] * declaree[0] + mesuree[1] * declaree[1]) > ACCORD:
                droite = _droite_orientee(P[i:j + 1], declaree) or droite
        A, B = droite
        i2, j2 = i, j
        while j2 - i2 > mini and _dseg(P[i2], A, B) > GUIDE_DROIT:
            i2 += 1
        while j2 - i2 > mini and _dseg(P[j2], A, B) > GUIDE_DROIT:
            j2 -= 1
        if (i2, j2) == (i, j):
            break
        i, j = i2, j2
    return (i, j) if (i, j) != (a, b) else None


def _ajuste(P, tol=TOLERANCE, coins=frozenset(), casiers=None, guide=None, ferme=False):
    """Le moins de cubiques possible passant à moins de `tol` de `P`."""
    # ⚠️ Les abscisses sans mesure ont été bouchées en recopiant la voisine
    #   connue : elles arrivent ici en doublons exacts, et une corde de longueur
    #   nulle fausse le paramétrage. On les retire, en gardant leur rang pour que
    #   les coins déclarés restent au bon endroit.
    # ⚠️ **UNE BOUCLE SE FERME AVANT D'ÊTRE AJUSTÉE.** La projection rend une
    #   suite ouverte, même pour l'`o` : son dernier point s'arrêtait à quinze
    #   unités du premier, et c'est le `Z` du rendu qui recollait — d'où « un
    #   point en trop en bas » (l'auteur), et une couture qui n'était pas au bon
    #   endroit. On referme d'abord, l'ajustement voit alors une vraie boucle.
    if ferme and P and math.dist(P[0], P[-1]) > 1e-9:
        P = list(P) + [P[0]]
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
    # ★ **ON COUPE AUSSI LÀ OÙ LE GUIDE PASSE DE LA COURBE À LA DROITE.** Les
    #   coins ne suffisent pas : l'arche du `m` rejoint sa jambe TANGENTIELLEMENT
    #   — aucun angle, donc aucun coin — et la jambe, pourtant déclarée droite,
    #   se retrouvait noyée dans le même tronçon que l'arc. Elle ne pouvait plus
    #   être reconnue comme droite, et la portion contestée avec l'arche voisine
    #   la faisait serpenter. Un changement de NATURE vaut un coin.
    # ⚠️ Une borne trop proche d'un coin déjà déclaré ne coupe rien : elle
    #   isole deux ou trois points, dont on ne tire aucune droite. Le `l` et le
    #   `a` y perdaient seize unités.
    ajout = {k for k in _bornes_droites(guide, len(P))
             if all(abs(k - c) > 3 for c in coins)}
    coins = set(coins) | ajout
    bouts = sorted({0, len(P) - 1} | {i for i in coins if 0 < i < len(P) - 1})
    # ★ **ET LA FRONTIÈRE DROITE/COURBE SE RECALE SUR LA MESURE.** On interroge
    #   les tronçons que le GUIDE déclare droits — pas ceux que les coins ont
    #   découpés : au pied du `l`, le coin de la barre tombe un point avant le
    #   départ du fût, et le tronçon coin-à-coin n'était donc « pas droit », si
    #   bien que `_fin_de_droite` ne s'y appliquait jamais.
    # ⚠️ **ET LA BORNE RECALÉE REMPLACE SA VOISINE, elle ne s'y ajoute pas.**
    #   Ajouter laissait deux ou trois points entre l'ancienne coupure et la
    #   neuve — un moignon dont on ne tire ni droite ni courbe. C'est la même
    #   frontière, mieux placée : elle prend la place de l'ancienne.
    remplace, ajoute = {}, set()
    interieur = [c for c in bouts if 0 < c < len(P) - 1]
    for i, j in _runs_droits(guide):
        borne = _fin_de_droite(P, i, j, guide)
        if borne is None:
            continue
        for brut, net in zip((i, j), borne):
            if brut == net or not (0 < net < len(P) - 1):
                continue
            voisin = min(interieur, key=lambda c: abs(c - brut), default=None)
            if voisin is not None and abs(voisin - brut) <= 4:
                remplace[voisin] = net
            else:
                ajoute.add(net)
    bouts = sorted({remplace.get(c, c) for c in bouts} | ajoute)
    out = []
    for a, b in zip(bouts, bouts[1:]):
        tronc = P[a:b + 1]
        if len(tronc) < 2:
            continue
        # ★ **QUAND LA RECETTE DIT « LIGNE », C'EST UNE LIGNE.** Le fût du `q` et
        #   celui du `d` sont déclarés droits, et ils sortaient pourtant en
        #   accordéon de huit segments : la panse s'y superpose au fût, l'axe n'y
        #   a qu'un brin pour deux traits, et la projection prend l'un puis
        #   l'autre. Aucune mesure ne démêlera ça — mais la LECTURE, elle, le
        #   sait, et c'est son rôle. On ajuste alors la droite sur les points
        #   mesurés : la recette dit qu'il y a une droite, l'axe dit laquelle.
        if guide is not None and _guide_droit(guide, a, b):
            # ★ **ET LA DIRECTION FAIT PARTIE DE LA DÉCLARATION.** Le fût du `d`
            #   et celui du `b` sont verticaux dans la police ; ajustés sur des
            #   points que la panse contamine — les deux traits s'y superposent,
            #   l'axe n'a qu'un brin pour deux — ils penchaient de trois unités.
            #   La recette ne dit pas seulement « ici une droite », elle dit
            #   laquelle : on lui prend sa DIRECTION et on ne cherche que la
            #   POSITION, que l'axe, lui, sait donner.
            #   ⚠️ **MAIS SEULEMENT SI ELLE S'ACCORDE AVEC LA MESURE.** Une
            #     recette peut viser mal — la jambe basse du `k` et la diagonale
            #     du `z` sont déclarées à quelques degrés de leur vraie pente, et
            #     leur imposer la direction annoncée les envoyait à trente-neuf
            #     unités de leur axe. Trois degrés d'accord suffisent à
            #     distinguer « la recette précise ce que la mesure confirme » de
            #     « la recette se trompe » : au-delà, c'est la mesure qui tranche.
            bouts_ = _droite_ajustee(tronc, [True] * len(tronc))
            declaree = _versLe(guide[a], guide[b])
            if bouts_ is not None and declaree != (0.0, 0.0):
                mesuree = _versLe(bouts_[0], bouts_[1])
                if abs(mesuree[0] * declaree[0] + mesuree[1] * declaree[1]) > ACCORD:
                    bouts_ = _droite_orientee(tronc, declaree) or bouts_
            if bouts_ is not None:
                out.append((bouts_[0], [], bouts_[1]))
                continue
        # ★ **ON NE DEMANDE PAS À LA COURBE D'ÊTRE PLUS PRÈS DE L'AXE QUE NE LE
        #   SONT LES POINTS QU'ON LUI DONNE.** Près d'une jonction, la projection
        #   s'écarte réellement de l'axe — de douze unités sur la panse du `d` —
        #   et aucune cubique passant par ces points-là ne peut y revenir.
        #   L'ajusteur, lui, ne le sait pas : il subdivisait sans fin pour un but
        #   inatteignable, et le compte des segments passait de 426 à 606. Le
        #   plafond se lit donc sur la donnée, tronçon par tronçon.
        # ★ **UN TRONÇON DROIT DANS LA SOURCE SORT DROIT, SANS AJUSTEMENT.** On
        #   pose la question au tronçon ENTIER et non morceau par morceau : la
        #   subdivision coupe où elle veut, et la moitié basse d'une diagonale de
        #   `y` — celle qui plonge dans le carrefour — faisait échouer le vote
        #   pour toute la branche. Le tronçon, lui, est délimité par les COINS que
        #   la recette déclare : c'est la bonne unité de décision.
        bouts = _tronc_droit(tronc, casiers) if casiers is not None else None
        if bouts is not None:
            out.append((bouts[0], [], bouts[1]))
            continue
        plafond = (max(_pres(casiers, q) for q in tronc) + tol) if casiers else None
        t1, t2 = _tangente(tronc, 0, 1), _tangente(tronc, -1, -1)
        if casiers is not None:
            t1 = _direction_axe(casiers, tronc[0], t1) or t1
            t2 = _direction_axe(casiers, tronc[-1], t2) or t2
        morceau = _cubiques(tronc, t1, t2, tol, casiers, plafond)
        # ⚠️ **REDRESSER PUIS FUSIONNER NE SUFFIT PAS : IL FAUT BOUCLER.** Un
        #   redressement crée des droites que la fusion précédente n'a pas vues,
        #   et le `y` sortait avec trois points alignés sur une même droite —
        #   exactement le reproche de l'auteur. On alterne donc jusqu'à ce que
        #   plus rien ne bouge ; deux tours suffisent partout, la borne n'est là
        #   que pour interdire un cycle.
        for _ in range(6):
            avant = len(morceau)
            morceau = _fusionne(_redresse(morceau, tol, casiers, plafond),
                                tol, casiers, plafond)
            if len(morceau) == avant:
                break
        morceau = _droites(_redresse(morceau, tol, casiers, plafond), casiers)
        out += _alignees(morceau, casiers, tol)
    if (len(out) > 2 and math.dist(out[0][0], out[-1][2]) < 1e-6
            and casiers is not None):
        # ★ **UNE BOUCLE N'A PAS À PORTER DEUX POINTS À SA COUTURE.** On a coupé
        #   le tracé fermé au point le plus éloigné du départ pour lui donner une
        #   corde ; la couture, elle, est restée là où la projection avait
        #   commencé — d'où « un point en trop en bas » sur l'`o` (l'auteur). On
        #   essaie donc de recoudre : le dernier morceau et le premier ne font
        #   qu'un si leur réunion tient dans la tolérance.
        seuil = max(_pres(casiers, evalue(m, k / 8))
                    for m in (out[0], out[-1]) for k in range(9)) + tol
        recousu = _fusionne([out[-1], out[0]], tol, casiers, seuil)
        if len(recousu) == 1:
            out = [recousu[0]] + out[1:-1]
    return out


#: Ce qu'on tolère entre la droite conclue et les points MARQUÉS droits du
#: tronçon. Le repliage dérive jusqu'à huit unités près d'une pointe — c'est le
#: coude du `y`, et c'est une erreur de ma méthode, pas du dessin. Douze le
#: laissent passer ; un tronçon qui n'est pas droit s'en écarte de dizaines.
ECART_DROITE = 0.16 * FUT


def _tronc_droit(tronc, casiers):
    """Le tronçon est-il une DROITE ? La source vote, la géométrie arbitre.

    ⚠️ **LA MAJORITÉ SEULE NE SUFFIT PAS**, et le `f` l'a montré cruellement : sa
      hampe est droite sur les trois quarts, son crochet courbe sur le dernier.
      Quatre cinquièmes de points marqués droits, le vote passait, et la lettre
      sortait en une seule diagonale barrée — un `f` devenu croix. On vérifie
      donc que la droite conclue passe VRAIMENT par les points qui l'ont votée.
    """
    vus = [_sur_droit(casiers, q) for q in tronc]
    if len(vus) < 3 or sum(vus) < MAJORITE_DROITE * len(vus):
        return None
    bouts = _droite_ajustee(tronc, vus)
    if bouts is None:
        return None
    a, b = bouts
    # ⚠️ **ET LA VÉRIFICATION PORTE SUR TOUS LES POINTS, PAS SEULEMENT SUR CEUX
    #   QUI ONT VOTÉ.** Le `k` de JetBrains Mono ne fait pas partir ses deux
    #   diagonales du fût : elles se rejoignent d'abord, cent trente unités plus
    #   à droite, par un court bras horizontal. Ce bras tombe dans un carrefour,
    #   ses points n'y sont donc pas marqués droits — et en ne contrôlant que les
    #   marqués, on l'ignorait purement et simplement : la diagonale ressortait
    #   en droite parfaite, à soixante-douze unités de son axe.
    if any(_dseg(q, a, b) >= ECART_DROITE for q in tronc):
        return None
    return bouts


def _droite_orientee(tronc, u):
    """La droite de direction `u` qui passe au mieux par `tronc`."""
    if u == (0.0, 0.0) or len(tronc) < 2:
        return None
    # position : la MÉDIANE des écarts à la normale, pour que les carrefours —
    # où la projection dérape de dix unités — ne tirent pas la droite à eux.
    nx, ny = -u[1], u[0]
    ecarts = sorted(q[0] * nx + q[1] * ny for q in tronc)
    c = ecarts[len(ecarts) // 2]
    sur = lambda q: (q[0] + nx * (c - q[0] * nx - q[1] * ny),
                     q[1] + ny * (c - q[0] * nx - q[1] * ny))
    return sur(tronc[0]), sur(tronc[-1])


def _droite_ajustee(tronc, vus, casiers=None):
    """★ **LA DROITE SE TIRE DES POINTS, PAS DES BOUTS.**

    Les bouts d'un tronçon sont ce qu'il a de moins sûr : c'est là qu'il plonge
    dans un carrefour et que la projection le tire de travers. Joindre bout à
    bout donnait une diagonale de `k` à soixante-seize unités de son axe — une
    droite parfaite, parfaitement fausse. On ajuste donc la droite sur les points
    MARQUÉS droits (axe principal du nuage), puis on y projette les deux bouts
    pour savoir où commencer et où finir.
    """
    pts = [q for q, droit in zip(tronc, vus) if droit]
    if len(pts) < 2:
        return None
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    sxx = sum((q[0] - cx) ** 2 for q in pts)
    syy = sum((q[1] - cy) ** 2 for q in pts)
    sxy = sum((q[0] - cx) * (q[1] - cy) for q in pts)
    # direction principale : le vecteur propre dominant de la matrice d'inertie
    theta = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(theta), math.sin(theta)
    # ★ **MAIS SI LA SOURCE CONNAÎT LA DIRECTION, C'EST LA SIENNE.** Le fût du
    #   `d` est vertical dans la police ; ajusté sur des points que la jonction
    #   contamine, il penchait de trois degrés — « la barre n'est plus droite
    #   alors qu'elle l'est à l'origine, ça devrait t'alerter » (l'auteur). Le
    #   nuage porte la tangente EXACTE de l'axe en chaque point : on prend celle
    #   des points marqués droits, à la médiane pour que les carrefours ne votent
    #   pas, et l'ajustement ne cherche plus que la position.
    if casiers is not None:
        angles = []
        for q in pts:
            t = _direction_axe(casiers, q, (ux, uy))
            if t is not None and _sur_droit(casiers, q):
                angles.append(math.atan2(t[1], t[0]))
        if len(angles) >= max(3, MAJORITE_DROITE * len(pts)):
            angles.sort()
            a0 = angles[len(angles) // 2]
            ux, uy = math.cos(a0), math.sin(a0)
    if math.hypot(ux, uy) < 1e-9:
        return None
    proj = lambda q: ((q[0] - cx) * ux + (q[1] - cy) * uy)
    sur = lambda t: (cx + ux * t, cy + uy * t)
    return sur(proj(tronc[0])), sur(proj(tronc[-1]))


def _droites(chem, casiers):
    """★ **DEUX BORDS DROITS FONT UN AXE DROIT, MÊME S'ILS CONVERGENT.**

    > « y devrait avoir 4, max 5 points, et les poignées des courbes de Bézier
    >   devraient être dans 2 directions et leur opposé, aucune autre. »
    >   (l'auteur)

    Le `y` sortait avec un coude de sept unités au milieu de sa diagonale
    gauche, et ce coude est un ARTEFACT DE MA MÉTHODE, pas un trait du dessin :
    la branche gauche du `y` s'affine vers le sommet, ses deux bords ne sont donc
    pas parallèles, et le repliage — qui apparie chaque point au PLUS PROCHE d'en
    face — dérive près de la pointe. Or le milieu de deux droites sécantes est
    leur BISSECTRICE, qui est droite. La source déclare les deux bords `L` ; on
    n'a donc pas à mesurer, on a à conclure.

    ⚠️ Une suite de morceaux tous marqués droits devient UN segment, sans
      vérification de distance : c'est le seul endroit de la chaîne où l'on
      préfère ce que la police DIT à ce que le nuage MONTRE, et c'est légitime
      parce que c'est le nuage qui a tort.
    """
    if casiers is None:
        return chem
    # ⚠️ **LE CARREFOUR NE VOTE PAS.** Aux derniers points d'un trait, la police
    #   fond les deux traits en une seule masse et l'axe y devient courbe : le
    #   `y` et le `v` gardaient leur coude parce que la poignée de points du
    #   sommet suffisait à faire douter d'une diagonale longue de quatre cents
    #   unités. On demande donc une large majorité, pas l'unanimité.
    marques = []
    for m in chem:
        vus = [_sur_droit(casiers, evalue(m, k / 24)) for k in range(25)]
        marques.append(sum(vus) >= MAJORITE_DROITE * len(vus))
    out, i = [], 0
    while i < len(chem):
        if not marques[i]:
            out.append(chem[i])
            i += 1
            continue
        j = i
        while j + 1 < len(chem) and marques[j + 1]:
            j += 1
        # ⚠️ **ET ON VÉRIFIE QUE LA DROITE PASSE PAR CE QU'ELLE REMPLACE.** Sans
        #   ce contrôle, le groupe « bras + diagonale » du `k` — deux morceaux
        #   droits, mais coudés l'un sur l'autre — se réduisait à une seule
        #   droite passant à soixante-douze unités de son axe. Deux droites
        #   accolées ne font une droite que si elles sont alignées.
        a, b = chem[i][0], chem[j][2]
        echos = [evalue(m, k / 12) for m in chem[i:j + 1] for k in range(13)]
        if math.dist(a, b) > 1e-9 and all(_dseg(q, a, b) < ECART_DROITE for q in echos):
            out.append((a, [], b))
        else:
            out += chem[i:j + 1]
        i = j + 1
    return out


def _redresse(chem, tol, casiers, plafond):
    """★ **CE QUI EST DROIT DANS LA SOURCE SORT DROIT.**

    > « s'il y a un trait droit à l'origine, il ne doit pas y avoir d'aspérité à
    >   l'arrivée. » (l'auteur)

    Et la source le DIT : un segment de l'axe est un `L` ou il ne l'est pas —
    aucune mesure d'angle, aucun seuil de courbure. La marque voyage avec chaque
    point du nuage depuis `_plat`. Une cubique dont tous les points tombent sur du
    droit devient une droite, et l'on vérifie seulement qu'elle tient dans la même
    tolérance. La barre du `e`, la hampe du `f`, les diagonales du `x` : elles
    ondulaient d'une unité ou deux parce que l'ajusteur suivait un relevé bruité
    au lieu de suivre ce que la police déclare.
    """
    if casiers is None:
        return chem
    out = []
    # ⚠️ **LE PLAFOND N'AUTORISE PAS À REDRESSER.** Il dit ce que la donnée
    #   permet à une COURBE ; s'en servir pour remplacer une courbe par sa corde,
    #   c'est se donner le droit de tout aplatir près d'une jonction — et c'est
    #   d'où venait le zigzag : « une droite qui n'est pas droite à l'arrivée »
    #   (l'auteur). Le fût du `q` en sortait en huit segments en accordéon.
    seuil = tol + MARGE_NUAGE
    for m in chem:
        droite = (m[0], [], m[2])
        ecart = max(_pres(casiers, evalue(droite, k / 24)) for k in range(25))
        # ★ On essaie TOUJOURS la droite ; la marque de la source sert à savoir
        #   jusqu'où l'accepter. Exiger que TOUS les points portent la marque
        #   laissait les diagonales du `x` en cubiques : la police y fond ses deux
        #   traits en une seule masse au croisement, et cette poignée de points
        #   courbes suffisait à faire douter d'une droite longue de six cents
        #   unités. Une droite qui tient dans la tolérance est une droite.
        # ⚠️ **ON NE REDRESSE QUE CE QUE LA SOURCE DÉCLARE DROIT.** On essayait
        #   la corde partout, et on l'acceptait dès qu'elle tenait dans la
        #   tolérance : sur une courbe douce découpée en petits morceaux, elle y
        #   tient toujours, et l'épaule du `r` ressortait en polyligne de six
        #   points — « propre, mais par segment et non pas courbe » (l'auteur).
        #   Une courbe reste une courbe ; c'est la police qui dit laquelle est
        #   droite, et elle le dit sans ambiguïté.
        vus = [_sur_droit(casiers, evalue(m, k / 24)) for k in range(25)]
        if sum(vus) >= MAJORITE_DROITE * len(vus) and ecart < seuil + MARGE_NUAGE:
            out.append(droite)
        else:
            out.append(m)
    return out


def _fusionne(chem, tol, casiers, plafond):
    """★ **ON ESSAIE DE RETIRER CHAQUE POINT, ET ON NE LE GARDE QUE S'IL SERT.**

    > « pourquoi ne le vois-tu pas pour le retirer ? » (l'auteur)

    Parce que je ne le lui demandais pas. La subdivision descendante ne revient
    jamais sur ses pas : une coupure décidée tôt, sur un bruit, reste même quand
    les deux moitiés se laissent réunir. Il fallait la question inverse — non pas
    « faut-il couper ici ? » mais « ce point sert-il encore ? » — et elle se pose
    aussi simplement qu'elle s'écrit.
    """
    i = 0
    while i < len(chem) - 1:
        a, b = chem[i], chem[i + 1]
        P = ([evalue(a, k / 16) for k in range(17)]
             + [evalue(b, k / 16) for k in range(1, 17)])
        t1 = _versLe(a[0], a[1][0] if a[1] else a[2])
        t2 = _versLe(b[2], b[1][-1] if b[1] else b[0])
        if casiers is not None:
            t1 = _direction_axe(casiers, a[0], t1) or t1
            t2 = _direction_axe(casiers, b[2], t2) or t2
        u = _parametres(P)
        bez = _moindres_carres(P, u, t1, t2)
        err, _ = _ecart_max(P, bez, u)
        for _ in range(4):
            if _accepte(bez, err, tol, casiers, plafond):
                break
            u = _reparametre(P, bez, u)
            bez = _moindres_carres(P, u, t1, t2)
            err, _ = _ecart_max(P, bez, u)
        if _accepte(bez, err, tol, casiers, plafond):
            chem[i:i + 2] = [bez]
            i = max(0, i - 1)
        else:
            i += 1
    return chem


def _casteljau(P, t):
    niveaux = [list(P)]
    while len(niveaux[-1]) > 1:
        n = niveaux[-1]
        niveaux.append([(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                        for a, b in zip(n, n[1:])])
    return [n[0] for n in niveaux], [n[-1] for n in reversed(niveaux)]


def _tronque(m, t, garderLeDebut):
    """La restriction EXACTE d'un morceau — même degré, même courbe."""
    P = [m[0]] + list(m[1]) + [m[2]]
    if not m[1]:
        q = (m[0][0] + (m[2][0] - m[0][0]) * t, m[0][1] + (m[2][1] - m[0][1]) * t)
        return (m[0], [], q) if garderLeDebut else (q, [], m[2])
    g, d = _casteljau(P, t)
    return (g[0], g[1:-1], g[-1]) if garderLeDebut else (d[0], d[1:-1], d[-1])


def _taille(chem, i, t, garderLeDebut):
    if garderLeDebut:
        return chem[:i] + [_tronque(chem[i], t, True)]
    return [_tronque(chem[i], t, False)] + chem[i + 1:]


#: Sur quelle longueur, au bout d'un trait, on cherche la rencontre avec son
#: voisin. Au-delà, un trait qui frôle un autre à mi-parcours — la hampe du `t`
#: sous sa barre — s'y ferait couper.
ZONE_JONCTION = 0.8 * FUT

#: Quelle part d'un morceau doit tomber sur du droit pour qu'on le tienne pour
#: droit. Quatre points sur cinq : la zone de carrefour d'une diagonale de `y`
#: en occupe environ un dixième, et aucun morceau réellement courbe de
#: l'alphabet n'atteint la moitié.
MAJORITE_DROITE = 0.8


def rejoint(chemins, liens, attendus, lespis=()):
    """★ **UN TRAIT S'ARRÊTE OÙ IL EN RENCONTRE UN AUTRE — ni avant, ni après.**

    > « tant que ton modèle n'est pas capable de voir 2 traits seulement, avec
    >   une intersection, pas d'artéfact supplémentaire, c'est que ton modèle
    >   n'est pas au point. » (l'auteur)

    La projection donne au trait quelques points de trop au-delà du carrefour —
    dix-sept unités de queue courbe au bas du `y`, là où deux droites devraient
    simplement se croiser. On TAILLE donc chaque bout à sa rencontre, par de
    Casteljau : la queue disparaît, et le bout se pose exactement sur le voisin.
    C'est aussi ce qui rétablit les contacts que le redressement avait rompus —
    le `b`, le `q` et le `r` avaient perdu le leur, la panse s'étant écartée de
    plus de six unités en devenant droite.
    """
    plats = [[evalue(m, k / 12) for m in c for k in range(13)] for c in chemins]
    for u, chem in enumerate(chemins):
        if not chem or not liens[u]:
            continue
        for cote, garderLeDebut in ((0, False), (1, True)):
            if not attendus[u][cote] or not chem:
                continue
            bord = chem[-1][2] if garderLeDebut else chem[0][0]
            voisins = [q for v in liens[u] for q in plats[v]]
            if not voisins:
                continue
            # ⚠️ **LE VOISIN AUSSI DOIT POUVOIR S'ALLONGER.** Au bas du `w`, les
            #   deux branches s'arrêtent toutes les deux avant leur rencontre :
            #   aucune n'atteint le segment de l'autre, et la recherche
            #   d'intersection revenait bredouille. On prolonge donc les deux
            #   bouts de la polyligne voisine — le point de croisement de deux
            #   droites existe, qu'elles s'y rendent ou non.
            aretes_voisines = []
            for v in liens[u]:
                pv = plats[v]
                if len(pv) < 2:
                    continue
                aretes_voisines += [(a, b, True) for a, b in zip(pv, pv[1:])]
                for (a, b) in ((pv[1], pv[0]), (pv[-2], pv[-1])):
                    d = _versLe(a, b)
                    if d != (0.0, 0.0):
                        aretes_voisines.append(
                            (b, (b[0] + d[0] * ZONE_JONCTION,
                                 b[1] + d[1] * ZONE_JONCTION), False))
            # ① le point du trait, dans la zone du bout, le plus proche du voisin
            best = None
            for i, m in enumerate(chem):
                for j in range(25):
                    t = j / 24
                    z = evalue(m, t)
                    if math.dist(z, bord) > ZONE_JONCTION:
                        continue
                    d = min(math.dist(z, w) for w in voisins)
                    if best is None or d < best[0]:
                        best = (d, i, t, z)
            if best is None:
                continue
            _, i, t, _ = best
            # ② on taille jusque-là, puis on pose le bout SUR le voisin
            taille = _taille(chem, i, t, garderLeDebut)
            taille = [m for m in taille if math.dist(m[0], m[2]) > 1e-9 or m[1]]
            if not taille:
                continue
            # ★ **ON ALLONGE LE TRAIT DANS SA PROPRE DIRECTION — on ne le fait
            #   pas pivoter.** Poser le bout d'un segment droit sur le voisin le
            #   plus proche, c'est incliner toute la droite : la diagonale du `k`
            #   partait à soixante-seize unités de son axe pour gagner cent
            #   trente-et-une unités au départ. Le bout coulisse donc le long de
            #   la tangente terminale, et rien d'autre ne bouge.
            m = taille[-1] if garderLeDebut else taille[0]
            bout = m[2] if garderLeDebut else m[0]
            dire = (_versLe(m[1][-1] if m[1] else m[0], bout) if garderLeDebut
                    else _versLe(m[1][0] if m[1] else m[2], bout))
            if dire == (0.0, 0.0):
                continue
            if dire == (0.0, 0.0):
                continue
            # ★ **PILE SUR L'AUTRE TRAIT — on calcule l'INTERSECTION, on ne
            #   l'approche pas.** « Le point au niveau de la fourche du `y`
            #   devrait être pile sur le trait de l'autre » (l'auteur) : il en
            #   était à douze unités parce que je faisais coulisser le bout
            #   jusqu'au plus proche point ÉCHANTILLONNÉ du voisin. Deux droites
            #   se coupent en un point, et ce point se calcule.
            # ⚠️ **UN CROISEMENT N'EST PAS UNE POINTE.** Quand l'intersection
            #   tombe SUR le voisin, les deux traits se croisent vraiment et le
            #   point calculé est le bon — c'est la fourche du `y`, le bras du
            #   `k`. Quand il faut PROLONGER le voisin pour l'atteindre, les deux
            #   traits s'arrêtent avant de se rencontrer : c'est une pointe, la
            #   police y coupe le bout, et suivre les droites jusqu'à leur
            #   croisement enfonçait le `w` de vingt-huit unités sous la ligne de
            #   base. Là, le point de rencontre est le MILIEU des deux bouts.
            meilleur, reel = None, False
            for a, b, vrai in aretes_voisines:
                t = _intersection(bout, dire, a, b)
                if t is None or abs(t) > ZONE_JONCTION:
                    continue
                if not vrai:
                    continue
                # ⚠️ **UNE INTERSECTION RASANTE NE VEUT RIEN DIRE.** Le haut de la
                #   panse du `q` monte presque parallèlement à son fût : le point
                #   où les deux droites se coupent est alors très loin et très
                #   sensible, et le bout se faisait tirer vingt-sept unités plus
                #   haut — jusqu'au sommet du fût, ce qui lui ôtait justement
                #   l'extrémité libre que la police lui donne. En deçà de vingt
                #   degrés, on ne se sert pas de l'intersection.
                v = _versLe(a, b)
                if abs(dire[0] * v[0] + dire[1] * v[1]) > RASANT:
                    continue
                if meilleur is None or abs(t) < abs(meilleur[1]):
                    meilleur = (0.0, t, (bout[0] + dire[0] * t, bout[1] + dire[1] * t))
                    reel = True
            if meilleur is None and m[1]:
                # ★ **UN BOUT COURBE PEUT SE DÉPLACER DE TRAVERS, UNE DROITE NON.**
                #   Déplacer latéralement le bout d'un segment droit le fait
                #   pivoter — c'est ce qui penchait la barre du `d`. Une courbe,
                #   elle, se TRANSLATE : on emmène la poignée voisine du même
                #   déplacement et la tangente ne bouge pas. C'est ce qu'il faut
                #   ici, car l'arche du `h` monte presque parallèlement à son fût
                #   — l'intersection y est rasante, donc inutilisable — et elle
                #   restait treize unités à gauche, débordant du fût.
                #   ⚠️ Mais BRIÈVEMENT : translater une courbe l'emporte tout
                #     entière, et vingt unités suffisent à décoller la panse du
                #     `q` de son axe. On s'autorise le quart d'un fût, ce qui
                #     couvre le débord de l'arche du `h` sans permettre à une
                #     panse de venir chercher son fût de loin.
                proche = min(voisins, key=lambda z: math.dist(z, bout))
                if math.dist(proche, bout) <= 0.25 * FUT:
                    meilleur = (0.0, 0.0, proche)
            if meilleur is None:
                # ★ **À UNE POINTE, LE POINT DE RENCONTRE EST LE PLI DE L'AXE.**
                #   C'est là que la police retourne son trait, et les deux
                #   branches y arrivent ensemble : le sommet du `w`, la pointe du
                #   `v`. Le prendre plutôt qu'un milieu donne aux DEUX traits le
                #   même point, exactement, au lieu de deux points à deux unités.
                proche = min(voisins, key=lambda z: math.dist(z, bout))
                pli = min(lespis, key=lambda z: math.dist(z, bout), default=None)
                if pli is not None and math.dist(pli, bout) <= ZONE_JONCTION \
                        and math.dist(pli, proche) <= ZONE_JONCTION:
                    meilleur = (0.0, 0.0, pli)
                elif math.dist(proche, bout) <= ZONE_JONCTION:
                    # ⚠️ **ET SINON ON PROJETTE SUR SA PROPRE DROITE.** Poser le
                    #   bout au milieu des deux, c'est le déplacer DE CÔTÉ — et un
                    #   segment droit dont on déplace un bout de côté n'est plus
                    #   droit : la barre du `d` et celle du `b` penchaient de
                    #   dix-neuf unités alors qu'elles sont droites dans la
                    #   police. « Ça devrait t'alerter » (l'auteur), et ça
                    #   m'alerte : c'est le contrôle le plus simple qui soit.
                    mid = ((bout[0] + proche[0]) / 2, (bout[1] + proche[1]) / 2)
                    t = (mid[0] - bout[0]) * dire[0] + (mid[1] - bout[1]) * dire[1]
                    meilleur = (0.0, t, (bout[0] + dire[0] * t, bout[1] + dire[1] * t))
            if meilleur is None:
                for pas in range(-int(ZONE_JONCTION), int(ZONE_JONCTION) + 1):
                    q = (bout[0] + dire[0] * pas, bout[1] + dire[1] * pas)
                    d = min(math.dist(q, w) for w in voisins)
                    if meilleur is None or d < meilleur[0]:
                        meilleur = (d, pas, q)
            if meilleur is None or meilleur[0] > TOL:
                # ⚠️ **ET S'IL N'ATTEINT PAS, ON NE TRICHE PAS.** Un trait que la
                #   police ne fait pas se rejoindre ne se rejoindra pas ici :
                #   c'est un désaccord entre la lecture et le dessin, et il doit
                #   se voir dans les comptes plutôt que se cacher dans le tracé.
                chem = taille
                continue
            cible = meilleur[2]
            # ⚠️ **ON DÉPLACE LE POINT, PAS LA POIGNÉE.** Emmener la poignée du
            #   même écart translate toute la courbe : les panses du `d`, du `p`
            #   et du `q` décollaient de leur axe de dix à vingt unités pour
            #   gagner deux unités de contact. Le point bouge, la courbe reste.
            if garderLeDebut:
                taille[-1] = (m[0], list(m[1]), cible)
            else:
                taille[0] = (cible, list(m[1]), m[2])
            chem = taille
        chemins[u] = chem
        plats[u] = [evalue(m, k / 12) for m in chem for k in range(13)]
    return chemins


#: Un morceau plus court que ça, coincé entre deux autres, n'est pas un trait :
#: c'est le résidu d'un carrefour. Le plus court trait vrai de l'alphabet — le
#: bras du `k` — en fait cent trente.
COURT = 0.4 * FUT


def _intersection(p, u, a, b):
    """Le paramètre `t` tel que `p + t·u` coupe le segment `[a, b]`, ou None."""
    vx, vy = b[0] - a[0], b[1] - a[1]
    det = u[0] * (-vy) - u[1] * (-vx)
    if abs(det) < 1e-12:
        return None
    wx, wy = a[0] - p[0], a[1] - p[1]
    t = (wx * (-vy) - wy * (-vx)) / det
    sgn = (u[0] * wy - u[1] * wx) / det
    return t if -0.001 <= sgn <= 1.001 else None


def _long_morceau(m, n=8):
    p = [evalue(m, k / n) for k in range(n + 1)]
    return sum(math.dist(a, b) for a, b in zip(p, p[1:]))


#: |cos| au-delà duquel un raccord courbe/droite est réputé SANS ANGLE, donc
#: tangent : quarante-cinq degrés. Au-delà c'est un vrai coin — le haut du `l`,
#: la barre du `f` — et on n'y touche pas.
DOUX = math.cos(math.radians(45))

#: Ce qu'on accepte de s'écarter de l'axe POUR OBTENIR LA TANGENCE. Douze unités
#: sur six cents : c'est beaucoup plus que la tolérance d'ajustement, et c'est
#: assumé — une cassure de six degrés à un raccord se voit, un écart de dix
#: unités sur une courbe ne se voit pas. « La poignée n'est toujours pas
#: parfaitement verticale » (l'auteur) : elle l'est maintenant, et l'on sait ce
#: qu'elle coûte.
MARGE_TANGENCE = 12.0

#: Deux droites qui se suivent à moins de huit degrés n'en font qu'une.
ALIGNE = math.cos(math.radians(8))

#: |cos| au-delà duquel deux tangentes sont parallèles — donc un demi-tour.
PARALLELE = math.cos(math.radians(12))


def _tangence(chem, casiers, tol, marge=MARGE_TANGENCE):
    """★ **UN RACCORD SANS ANGLE EST UN RACCORD TANGENT.**

    > « côté droit il n'y a pas d'angle, donc la poignée devrait être
    >   verticale. » (l'auteur, sur le `h`)

    Là où une courbe rejoint une droite sans coin, la police ne fait AUCUN
    angle : la tangente de l'une est la direction de l'autre. L'ajustement, lui,
    les calculait séparément et laissait neuf degrés de cassure au pied de
    l'arche du `h` et du `n`, vingt-six au pied du `t`. On aligne donc la
    poignée sur la droite voisine — en gardant sa longueur, donc sans changer
    l'allure de la courbe — et on ne le fait que si l'écart à l'axe le supporte.
    """
    for i in range(len(chem) - 1):
        a, b = chem[i], chem[i + 1]
        if bool(a[1]) == bool(b[1]):
            continue
        if a[1]:                              # courbe puis droite
            u = _versLe(b[0], b[2])
            t = _versLe(a[1][-1], a[2])
            if u == (0.0, 0.0) or t == (0.0, 0.0) or abs(t[0]*u[0] + t[1]*u[1]) < DOUX:
                continue
            # ⚠️ **ET SI LA POIGNÉE ALIGNÉE S'ÉCARTE TROP, ON LA RACCOURCIT
            #   PLUTÔT QUE D'ABANDONNER.** La tangence est ce qui se voit ; sa
            #   longueur ne se voit pas. Renoncer laissait six degrés de cassure
            #   au pied du `t` et du `l` — « c'est mieux, mais la poignée n'est
            #   toujours pas parfaitement verticale » (l'auteur).
            for f in (1.0, 0.8, 0.6, 0.45, 0.3):
                h = math.dist(a[1][-1], a[2]) * f
                ctrl = list(a[1])
                ctrl[-1] = (a[2][0] - u[0] * h, a[2][1] - u[1] * h)
                neuf = (a[0], ctrl, a[2])
                if casiers is None or _sur_laxe(neuf, casiers, tol, marge):
                    chem[i] = neuf
                    break
        else:                                 # droite puis courbe
            u = _versLe(a[0], a[2])
            t = _versLe(b[0], b[1][0])
            if u == (0.0, 0.0) or t == (0.0, 0.0) or abs(t[0]*u[0] + t[1]*u[1]) < DOUX:
                continue
            for f in (1.0, 0.8, 0.6, 0.45, 0.3):
                h = math.dist(b[0], b[1][0]) * f
                ctrl = list(b[1])
                ctrl[0] = (b[0][0] + u[0] * h, b[0][1] + u[1] * h)
                neuf = (b[0], ctrl, b[2])
                if casiers is None or _sur_laxe(neuf, casiers, tol, marge):
                    chem[i + 1] = neuf
                    break
    return chem


def _sur_laxe(m, casiers, tol, marge=6.0):
    return all(_pres(casiers, evalue(m, k / 16)) < tol + MARGE_NUAGE + marge
               for k in range(17))


def _alignees(chem, casiers, tol):
    """Deux droites qui se suivent presque en ligne n'en font qu'une.

    > « le `k` : il y a toujours un point de trop, maintenant il est dans le
    >   segment en bas à droite. » (l'auteur)

    Six degrés d'écart entre deux morceaux d'une même jambe : ni un coin, ni une
    courbe, juste une coupure que l'ajusteur n'a pas su défaire.
    """
    i = 0
    while i < len(chem) - 1:
        a, b = chem[i], chem[i + 1]
        if a[1] or b[1]:
            i += 1
            continue
        u, v = _versLe(a[0], a[2]), _versLe(b[0], b[2])
        neuf = (a[0], [], b[2])
        if (u != (0.0, 0.0) and v != (0.0, 0.0)
                and u[0]*v[0] + u[1]*v[1] > ALIGNE
                and (casiers is None or _sur_laxe(neuf, casiers, tol))):
            chem[i:i + 2] = [neuf]
            i = max(0, i - 1)
        else:
            i += 1
    return chem


def _symetrise(chemins, casiers, tol):
    """★ **UN DEMI-TOUR ENTRE DEUX DROITES PARALLÈLES EST SYMÉTRIQUE.**

    > « le `u` est minimaliste, ce qui est très élégant, mais asymétrique dans
    >   les poignées. Garde-les verticales mais déplace leur point pour qu'il y
    >   ait une symétrie parfaite. » (l'auteur)

    Ses deux jambes sont de même longueur dans la police, et son fond est un
    demi-tour : les deux points d'attache sont donc à la même hauteur et les deux
    poignées de la même longueur. La projection, elle, les rendait à quarante-deux
    unités d'écart. On moyenne les deux — ce qui ne demande aucune mesure de
    plus, seulement de constater que les deux tangentes sont parallèles.
    """
    for chem in chemins:
        for i, m in enumerate(chem):
            if len(m[1]) != 2:
                continue
            t1 = _versLe(m[0], m[1][0])
            t2 = _versLe(m[2], m[1][1])
            if t1 == (0.0, 0.0) or t2 == (0.0, 0.0):
                continue
            if t1[0] * t2[0] + t1[1] * t2[1] < PARALLELE:
                continue                       # pas un demi-tour
            h = (math.dist(m[0], m[1][0]) + math.dist(m[2], m[1][1])) / 2
            # les deux bouts glissent SUR LEUR PROPRE TANGENTE jusqu'à la moyenne
            d = ((m[2][0] - m[0][0]) * t1[0] + (m[2][1] - m[0][1]) * t1[1]) / 2
            p0 = (m[0][0] + t1[0] * d, m[0][1] + t1[1] * d)
            p3 = (m[2][0] - t2[0] * d, m[2][1] - t2[1] * d)
            neuf = (p0, [(p0[0] + t1[0] * h, p0[1] + t1[1] * h),
                         (p3[0] + t2[0] * h, p3[1] + t2[1] * h)], p3)
            if casiers is not None and not _sur_laxe(neuf, casiers, tol):
                continue
            chem[i] = neuf
            # les voisins suivent, y compris dans les autres traits
            if i > 0:
                chem[i - 1] = (chem[i - 1][0], chem[i - 1][1], p0)
            if i + 1 < len(chem):
                chem[i + 1] = (p3, chem[i + 1][1], chem[i + 1][2])
            # ⚠️ Les traits VOISINS suivent : un bout posé sur l'ancien point
            #   resterait en l'air. On les rattache à la nouvelle position.
            for autre in chemins:
                if autre is chem or not autre:
                    continue
                if math.dist(autre[-1][2], m[0]) <= TOL:
                    autre[-1] = (autre[-1][0], autre[-1][1], p0)
                if math.dist(autre[0][0], m[0]) <= TOL:
                    autre[0] = (p0, autre[0][1], autre[0][2])
                if math.dist(autre[-1][2], m[2]) <= TOL:
                    autre[-1] = (autre[-1][0], autre[-1][1], p3)
                if math.dist(autre[0][0], m[2]) <= TOL:
                    autre[0] = (p3, autre[0][1], autre[0][2])
    return chemins


def _recoud(chem):
    """★ **UNE CHAÎNE NE SE COUPE PAS — et la mienne se coupait de sept unités.**

    ⚠️ **C'EST LE DÉFAUT QUI RENDAIT TROIS PASSES INOPÉRANTES.** `_ajuste`
      traite chaque tronçon SÉPARÉMENT ; quand la recette y déclare une droite,
      `_droite_ajustee` la recale sur les points mesurés et rend deux bouts
      NEUFS, qui n'ont plus aucune raison de tomber sur le premier point du
      tronçon suivant. Onze lettres sortaient trouées — 6,9 unités au pied du
      `l`, 6,8 à celui du `t`, 3,5 au `n`, 3,5 au `h`, 2,9 au `j`.

    ⚠️ **ET `versD` LE CACHAIT.** Il n'écrit qu'un seul `M`, puis des `L`/`C`
      qui repartent du POINT COURANT : le trou ne disparaissait pas, il devenait
      en silence la première poignée de la courbe suivante.
    ★ D'où le mystère : `_tangence` mesurait la poignée du `t` depuis le départ
      DÉCLARÉ de la courbe, la rendait rigoureusement verticale, l'acceptait
      (`_sur_laxe` à 4,9 unités pour 14,3 permises) — et le tracé rendu la
      montrait à 6,1° de la verticale, parce que le lecteur, lui, la mesure
      depuis la fin du fût. « La poignée devrait être verticale » (l'auteur) :
      elle l'était dans les nombres, et le trou la couchait.

    On recoud donc EXACTEMENT comme `versD` dessine — le morceau suivant repart
    du point courant, ses poignées ne bougent pas. Le tracé rendu est au trait
    près le même ; ce qui change, c'est que les passes d'après voient enfin ce
    qui sera dessiné. Déplacer la poignée avec le point serait un autre choix,
    et un mauvais : essayé, il éloigne le `h` de 6,1 à 8,8 unités de son axe et
    le `l` de 8,2 à 10,1, parce que le trou refermé de force tire toute la
    courbe hors de l'axe.
    """
    for i in range(len(chem) - 1):
        a, b = chem[i], chem[i + 1]
        if math.dist(a[2], b[0]) > 1e-9:
            chem[i + 1] = (a[2], b[1], b[2])
    return chem

def _coins_nets(chem):
    """★ **UN COIN EST UN POINT, PAS DEUX.**

    > « le `l` : il y a un angle droit qui est géré par 2 points au lieu d'1 » —
    > « le `n` : il y a un double point à l'intersection » (l'auteur)

    Entre la barre du `l` et sa hampe, la projection laisse un moignon de seize
    unités : ni barre, ni hampe, le résidu du virage. On le retire et l'on pose
    le coin là où les deux droites se COUPENT — ce qui est à la fois un point de
    moins et un angle plus franc.
    """
    # ⚠️ **ET UN MOIGNON DE BOUT SE RETIRE, SANS RIEN COUPER.** Au départ de
    #   l'épaule du `n`, la projection laisse six unités de trait avant le vrai
    #   virage : c'est le « double point à l'intersection ». On le supprime en
    #   ALLONGEANT son voisin jusque-là — le trait garde sa longueur, il perd un
    #   point.
    for bout in (0, -1):
        while len(chem) >= 2:
            m = chem[bout]
            if _long_morceau(m) > COURT:
                break
            # ⚠️ **ON DÉPLACE LE DÉPART, PAS LA COURBE.** Réutiliser tels quels
            #   les points de contrôle du voisin en lui donnant un autre départ,
            #   c'est le tordre d'autant : la première arche du `m` repartait à
            #   deux cent cinquante unités en arrière et remontait en zigzag —
            #   « comment le zigzag central a pu passer ton filtre ? » (l'auteur).
            #   Il n'y passait pas : je le fabriquais après coup. La poignée
            #   voisine suit donc le même déplacement que le point, ce qui garde
            #   la tangente et ne déforme rien.
            if bout == 0:
                v = chem[1]
                dx, dy = m[0][0] - v[0][0], m[0][1] - v[0][1]
                ctrl = list(v[1])
                if ctrl:
                    ctrl[0] = (ctrl[0][0] + dx, ctrl[0][1] + dy)
                chem[0:2] = [(m[0], ctrl, v[2])]
            else:
                v = chem[-2]
                dx, dy = m[2][0] - v[2][0], m[2][1] - v[2][1]
                ctrl = list(v[1])
                if ctrl:
                    ctrl[-1] = (ctrl[-1][0] + dx, ctrl[-1][1] + dy)
                chem[-2:] = [(v[0], ctrl, m[2])]
    # ⚠️ **ET UN MOIGNON AU MILIEU SE FOND DANS SON VOISIN.** Entre l'arche du
    #   `m` et sa jambe traîne une courbe de dix unités qui n'est ni l'une ni
    #   l'autre. On l'absorbe dans le morceau qui suit, en emmenant sa poignée du
    #   même déplacement pour ne pas tordre la courbe.
    change = True
    while change and len(chem) >= 3:
        change = False
        for i in range(1, len(chem) - 1):
            if _long_morceau(chem[i]) < COURT / 2:
                m, v = chem[i], chem[i + 1]
                dx, dy = m[0][0] - v[0][0], m[0][1] - v[0][1]
                ctrl = list(v[1])
                if ctrl:
                    ctrl[0] = (ctrl[0][0] + dx, ctrl[0][1] + dy)
                chem[i:i + 2] = [(m[0], ctrl, v[2])]
                change = True
                break
        if change:
            continue
        for i in range(1, len(chem) - 1):
            m = chem[i]
            if m[1] or math.dist(m[0], m[2]) > COURT:
                continue
            a, b = chem[i - 1], chem[i + 1]
            if a[1] or b[1]:
                continue                      # deux droites, sinon on ne touche à rien
            u = _versLe(a[0], a[2])
            # ⚠️ **ON PROLONGE LES DEUX VOISINS POUR LES FAIRE SE COUPER.** Au
            #   sommet du `l`, la barre passe AU-DESSUS du haut de la hampe : les
            #   deux droites ne se croisent qu'en dehors des segments, et le coin
            #   restait fait de deux points là où il n'en faut qu'un.
            v = _versLe(b[0], b[2])
            bb = (b[0][0] - v[0] * COURT * 2, b[0][1] - v[1] * COURT * 2)
            be = (b[2][0] + v[0] * COURT * 2, b[2][1] + v[1] * COURT * 2)
            t = _intersection(a[0], u, bb, be)
            if t is None:
                continue
            coin = (a[0][0] + u[0] * t, a[0][1] + u[1] * t)
            if math.dist(coin, m[0]) > COURT * 2 or math.dist(coin, m[2]) > COURT * 2:
                continue
            chem[i - 1:i + 2] = [(a[0], [], coin), (coin, [], b[2])]
            change = True
            break
    return chem


def _versLe(depuis, vers):
    dx, dy = vers[0] - depuis[0], vers[1] - depuis[1]
    h = math.hypot(dx, dy)
    return (0.0, 0.0) if h < 1e-9 else (dx / h, dy / h)


#: Ce qu'on tolère à un guide pour le tenir pour DROIT : une unité sur six
#: cents. Un arc de recette, même très plat, s'en écarte de plusieurs dizaines.
GUIDE_DROIT = 1.0

#: |cos| minimal entre la direction déclarée et la direction mesurée pour qu'on
#: suive la déclaration : trois degrés. La contamination d'une jonction fait
#: pencher une droite d'un ou deux degrés ; une recette qui vise mal s'en écarte
#: de cinq ou plus.
ACCORD = math.cos(math.radians(3))

#: |cos| au-delà duquel deux traits sont trop parallèles pour que leur point
#: d'intersection ait un sens : vingt degrés.
RASANT = math.cos(math.radians(20))


#: Un tronçon droit du guide doit peser au moins ça pour valoir une coupure :
#: un huitième du guide. En deçà, c'est un bout de courbe presque plat.
PART_DROITE = 0.25


def _runs_droits(guide):
    """Les tronçons que le guide déclare DROITS, bornes comprises."""
    if guide is None or len(guide) < 5:
        return []
    m = len(guide)
    # ⚠️ On ARRONDIT AU-DESSUS : `_guide_droit` compare à la même fraction,
    #   et quinze points contre quinze et quart suffisaient à faire échouer
    #   la jambe du `m` — un quart de point.
    mini = max(4, int(math.ceil(PART_DROITE * m)))
    out, i = [], 0
    while i < m - mini:
        j = i + mini
        if not _guide_droit(guide, i, j):
            i += 1
            continue
        while j + 1 < m and _guide_droit(guide, i, j + 1):
            j += 1
        out.append((i, j))
        i = j
    return out


def _bornes_droites(guide, n):
    """Les indices où le guide cesse d'être droit, ou recommence à l'être."""
    out = set()
    for i, j in _runs_droits(guide):
        if i > 0:
            out.add(i)
        if j < len(guide) - 1:
            out.add(j)
    return {k for k in out if 0 < k < n - 1}


def _guide_droit(guide, a, b):
    """Le guide déclare-t-il une DROITE sur ce tronçon ?

    ⚠️ **UN ARC TRÈS PLAT PARAÎT DROIT SUR UNE PORTION COURTE.** L'épaule du `r`
      est décrite par une ellipse de rayons 311 × 118 ; sur un huitième de sa
      longueur, sa flèche ne fait pas une unité, et le test la déclarait droite.
      Elle ressortait en polyligne de six points — « propre, mais par segment et
      non pas courbe » (l'auteur). On exige donc qu'un tronçon droit pèse un
      quart du guide : en deçà, la platitude est celle d'une courbe, pas d'une
      droite.
    """
    if b - a < max(2, PART_DROITE * len(guide)) or b >= len(guide):
        return False
    p, q = guide[a], guide[b]
    if math.dist(p, q) < 1e-9:
        return False
    return all(_dseg(guide[i], p, q) < GUIDE_DROIT for i in range(a, b + 1))


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


def _cubiques(P, t1, t2, tol, casiers=None, plafond=None, profondeur=0):
    """★ **ON JUGE L'AJUSTEMENT SUR L'AXE, PAS SUR LES POINTS RELEVÉS.**

    > « dans le `f`, il y a un point inutile (le 2ᵈ en partant du bas de la tige)
    >   pourquoi ne le vois-tu pas pour le retirer ? Dans la barre horizontale du
    >   `e` il y en a aussi un au milieu d'une ligne droite. » (l'auteur)

    Parce que je comparais la courbe aux POINTS PROJETÉS, et qu'ils sont bruités :
    la barre du `e` ondulait de deux unités autour de sa droite, la tolérance
    valait une unité, et l'ajusteur en concluait à sept virages là où il n'y en a
    aucun. Or ces points ne sont pas la référence — ils ne sont qu'un ordre de
    passage. **La référence est l'axe**, qui est exact.

    On accepte donc une cubique quand elle reste sur l'AXE, et l'on garde les
    points relevés pour la seule chose qu'ils sachent : dire par où passer. D'où
    la seconde borne, large : elle interdit à la courbe de couper au court à
    travers la lettre en trouvant de l'axe ailleurs, sans lui imposer d'épouser
    le bruit.
    """
    if len(P) == 2:
        d = math.dist(P[0], P[1]) / 3
        return [(P[0], [(P[0][0] + t1[0] * d, P[0][1] + t1[1] * d),
                        (P[1][0] + t2[0] * d, P[1][1] + t2[1] * d)], P[1])]
    u = _parametres(P)
    bez = _moindres_carres(P, u, t1, t2)
    err, coupe = _ecart_max(P, bez, u)
    if _accepte(bez, err, tol, casiers, plafond):
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
            if _accepte(bez, err, tol, casiers, plafond):
                return [bez]
    if profondeur > 14 or coupe <= 0 or coupe >= len(P) - 1:
        return [bez]
    tc = _tangente_milieu(P, coupe)
    if casiers is not None:
        tc = _direction_axe(casiers, P[coupe], tc) or tc
    return (_cubiques(P[:coupe + 1], t1, (-tc[0], -tc[1]), tol, casiers,
                      plafond, profondeur + 1)
            + _cubiques(P[coupe:], tc, t2, tol, casiers, plafond, profondeur + 1))


#: Ce qu'on laisse à la courbe de s'écarter des POINTS RELEVÉS. C'est une laisse,
#: pas une tolérance : elle empêche un raccourci à travers la lettre, elle ne
#: prétend pas que le relevé soit exact. Le bruit de projection mesuré atteint
#: deux unités sur la barre du `e` ; six laissent passer, et aucun trait voisin
#: n'est à moins de cinquante.
LAISSE = 6.0

#: ⚠️ **L'AXE EST UN NUAGE, ET UN NUAGE A UN PAS.** On le mesure en cherchant le
#:   POINT le plus proche, pas la courbe : un point posé exactement sur l'axe est
#:   donc à un demi-pas d'échantillonnage du plus proche relevé (`PAS_AXE`), et
#:   l'axe lui-même est un ALLER-RETOUR dont les deux passages restent écartés
#:   d'une unité et demie — sa ligne moyenne est à trois quarts d'unité de
#:   chacun. Exiger la tolérance nue revenait à exiger l'impossible : le compte
#:   des segments a triplé d'un coup, 426 à 1207. On ajoute donc ce que la mesure
#:   coûte, et rien de plus.
MARGE_NUAGE = 1.3


def _accepte(bez, err, tol, casiers, plafond):
    if casiers is None:
        return err < tol
    if err >= LAISSE:
        return False
    seuil = max(tol + MARGE_NUAGE, plafond if plafond is not None else 0.0)
    return all(_pres(casiers, evalue(bez, k / 24)) < seuil for k in range(25))


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
    for p, u, _, _d in nuage:
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
        # ★ **UN SEAU QUI N'A QU'UN POINT NE MESURE RIEN.** Sur la première
        #   arche du `m`, un seul point égaré — un point de fût attribué à
        #   l'arche — occupait le seau numéro six pendant que ses voisins en
        #   avaient vingt. L'interpolation le prenait pour une mesure et plongeait
        #   sur neuf abscisses : c'est le zigzag central. On exige donc qu'un seau
        #   pèse une fraction de ce que pèsent les autres, sans quoi on le traite
        #   comme un trou.
        pleins = sorted(len(lot) for lot in seaux[t] if lot)
        quorum = max(2, QUORUM * pleins[len(pleins) // 2]) if pleins else 0
        mes = [None] * len(guide)
        for k in range(len(guide)):
            lot = seaux[t][k]
            if len(lot) >= quorum:
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
    # Les boucles VRAIMENT fermées — celles dont l'axe décrit un tour complet,
    # comme la panse du `a` ou l'`o`. Une panse à `couture` n'en est pas une :
    # son guide est ouvert, seul le rendu se referme.
    FERMES = [not d.get('ouvert', True) and not d.get('couture') for d in decl]

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
        # ⚠️ **LE CENTRE D'UN POINT EST CELUI DE SA BOÎTE, PAS DE SES POINTS.**
        #   L'anneau effondré n'est pas parcouru à vitesse constante : sa moyenne
        #   penche du côté où les échantillons se serrent, et le point du `j`
        #   sortait dix-sept unités à gauche de sa hampe — « il devrait surplomber
        #   la barre verticale en étant pile au-dessus » (l'auteur). Les extrêmes,
        #   eux, ne dépendent d'aucune vitesse.
        points.append(((min(z[0] for z in lot) + max(z[0] for z in lot)) / 2,
                       (min(z[1] for z in lot) + max(z[1] for z in lot)) / 2))

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
    # ⚠️ **UN PLI APPARTIENT À UN SEUL BOUT.** Le pied du fût gauche du `m` est
    #   à cent soixante-dix unités du bas de sa jambe centrale : plus près que la
    #   portée autorisée, et le guide de l'arche s'y faisait tirer tout entier —
    #   l'arche redescendait le fût sur deux cent cinquante unités avant de
    #   remonter. C'est le zigzag central. On apparie donc les bouts libres aux
    #   plis du plus proche au plus lointain, et chaque pli ne sert qu'une fois.
    lespis = plis(reste)
    libres = []
    for t, g in enumerate(guides):
        if points[t] is not None:
            continue
        for versLaFin in (False, True):
            bout = g[-1] if versLaFin else g[0]
            if any(_dpoly(bout, guides[k]) <= TOL for k in liens[t]):
                continue                       # ce bout-là est tenu par un voisin
            for pli in lespis:
                d = math.dist(pli, bout)
                if d <= PORTEE_PLI:
                    libres.append((d, t, versLaFin, pli))
    libres.sort(key=lambda z: z[0])
    pris, servis, choix = set(), set(), {}
    for d, t, versLaFin, pli in libres:
        cle = (t, versLaFin)
        if cle in servis or pli in pris:
            continue
        servis.add(cle)
        pris.add(pli)
        choix[cle] = pli
    recales = list(guides)
    for t, g in enumerate(guides):
        for versLaFin in (False, True):
            pli = choix.get((t, versLaFin))
            if pli is not None:
                g = _recale(g, pli, versLaFin)
        recales[t] = g

    # ★ **ON REJOUE TANT QUE ÇA RAPPROCHE DE L'AXE, ET ON S'ARRÊTE DÈS QUE ÇA
    #   ÉLOIGNE.** Rejouer la projection sur sa propre sortie corrige la plupart
    #   des lettres — le `w` passe de vingt-six unités d'écart à six, le `z` de
    #   neuf à deux — mais DIVERGE sur celles dont la première passe est déjà
    #   fausse : le `j` s'éloignait de quatre-vingt-dix-sept à cent trente-deux.
    #   Le critère d'arrêt n'a donc pas à être choisi, il se mesure.
    casiers = _grille([(p[0], p[1], d, u) for p, u, _, d in reste])

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

    # ③ chaque trait est AJUSTÉ : le moins de cubiques possible à une unité près.
    #    Les coins du guide sont imposés comme bornes — un ajustement qui n'en
    #    saurait rien arrondirait le pied du `l` et le `z`.
    # ⚠️ **ET LA CHAÎNE SE RECOUD AUSSITÔT.** `_ajuste` rend ses tronçons
    #   séparément ; onze lettres en sortaient trouées, et le trou se lisait
    #   ensuite comme une poignée (voir `_recoud`).
    ajustes = [_recoud(_ajuste(ligne, TOLERANCE, coins[t], casiers, guides[t],
                               FERMES[t]))
               for t, ligne in enumerate(lignes)]

    # ④ puis chaque bout que la recette pose en contact est TAILLÉ à sa rencontre.
    #    C'est le dernier geste, et il vient après l'ajustement : tailler avant
    #    laisserait l'ajusteur repousser une queue de l'autre côté du carrefour.
    # ⚠️ **UNE BOUCLE VRAIMENT FERMÉE N'A PAS DE BOUT, ET NE SERT PAS DE CIBLE.**
    #   `rejoint` taille chaque bout libre à sa rencontre ; un sous-chemin fermé
    #   n'en a aucun — sa couture n'est pas une extrémité du dessin, c'est
    #   l'endroit arbitraire où le tracé recommence. Il ne peut pas non plus
    #   servir de voisin à tailler : sur une panse cousue au fût, tout point du
    #   fût serait à zéro unité de la panse et « le plus proche » ne voudrait
    #   plus rien dire.
    # ★ Une panse à COUTURE, elle, se pose et se taille comme un trait OUVERT :
    #   c'est ce qu'elle est jusqu'au dernier geste (voir `couture` dans
    #   `jetbrains-traces.py`).
    attendus = [(False, False) if FERMES[i] else
                tuple(any(_dpoly(g[bout], guides[k]) <= TOL for k in liens[i])
                      for bout in (0, -1))
                for i, g in enumerate(guides)]
    cibles = [{k for k in voisins if not FERMES[k]} for voisins in liens]
    ajustes = [_coins_nets(list(c)) for c in ajustes]
    rejoint(ajustes, cibles, attendus, lespis)
    # ★ **LE POINT SURPLOMBE SA HAMPE — c'est une lecture, pas une mesure.**
    #
    #   > « le point du `j` devrait surplomber la barre verticale en étant pile
    #   >   au-dessus ; là il est décalé vers la gauche. » (l'auteur)
    #
    #   Sa hauteur se mesure ; son abscisse, non. La police pose le centre du
    #   point à 380 unités À TOUTE GRAISSE — il n'a pas d'épaisseur, donc pas
    #   d'axe qui bouge — tandis que l'axe de la hampe, lui, glisse jusqu'à 401
    #   quand l'encre s'annule. Vingt et une unités d'écart, qui n'existent dans
    #   aucune graisse réelle : c'est un artefact de l'effondrement, pas un trait
    #   du dessin. On aligne donc le point sur ce qu'il surplombe.
    # ★ **UNE DERNIÈRE PASSE DE FUSION, UN PEU PLUS LARGE.** « L'`o` est déjà
    #   très bien, mais le point central en haut pourrait être retiré en
    #   déplaçant légèrement les poignées de ses voisins pour garder la même
    #   courbe » (l'auteur) — c'est exactement ce que fait une fusion, et il ne
    #   lui manquait qu'un peu d'air : la tolérance de l'ajustement est calée sur
    #   la fidélité au dixième d'unité, quand retirer un point n'en coûte que
    #   quelques-uns et se voit, lui, tout de suite.
    large = TOLERANCE + MARGE_NUAGE + 2
    ajustes = [_alignees(_tangence(_coins_nets(
        _fusionne(list(c), TOLERANCE, casiers, large)), casiers, TOLERANCE),
        casiers, TOLERANCE) for c in ajustes]
    _symetrise(ajustes, casiers, TOLERANCE)
    for t, c in enumerate(points):
        if c is None or not ajustes[t]:
            continue
        dessous = [q for k, chem in enumerate(ajustes) if k != t and points[k] is None
                   for m in chem for q in (m[0], m[2])]
        if not dessous:
            continue
        appui = min(dessous, key=lambda q: math.hypot(q[0] - c[0], (q[1] - c[1]) * 0.2))
        ajustes[t] = [((appui[0], c[1]), [], (appui[0], c[1]))]
    # ⚠️ Et l'on renettoie APRÈS : la taille des bouts recrée elle-même de courts
    #   morceaux au ras du carrefour — c'est le « doublon » de l'épaule du `n`.
    #   La tangence se rejoue au même moment, et pour la même raison : elle
    #   s'était calée sur une droite que les passes suivantes ont ensuite
    #   redressée, si bien que la poignée du `t` et celle du `l` restaient à six
    #   degrés de la verticale. Le dernier mot revient à la géométrie FINALE.
    ajustes = [_tangence(_recoud(_coins_nets(list(c))), casiers, TOLERANCE)
               for c in ajustes]
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
    # ★ **ET LA COUTURE SE POSE EN DERNIER**, quand on sait enfin où sont les
    #   deux bouts de la panse : un segment droit du dernier point au premier.
    #   « Sans chercher à éviter l'angle » (l'auteur) — il n'y a rien à lisser,
    #   ce segment ne dessine pas, il ferme.
    for t, chem in enumerate(ajustes):
        if decl[t].get('couture') and len(chem) >= 2 \
                and math.dist(chem[-1][2], chem[0][0]) > 1e-9:
            chem.append((chem[-1][2], [], chem[0][0]))
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
