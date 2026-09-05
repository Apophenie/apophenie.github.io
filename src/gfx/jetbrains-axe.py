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
import os
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
GFX = RACINE / 'src' / 'gfx'

# ═══════════════════════════════════════════════════════════════════════════
#  ★ **LA CHAÎNE EST PARAMÉTRÉE PAR SES TROIS FICHIERS, ET PAR RIEN D'AUTRE.**
#
#  > « fais-tu des correctifs au cas par cas ou une mise à jour des règles pour
#  >   que ça marche aussi si je changeais de fonte ? » (l'auteur, plus haut,
#  >   à propos des seuils rapportés au fût)
#
#  Ces quatre lignes sont la RÉPONSE MESURÉE à cette question. Tout ce que ce
#  fichier sait d'une police tient dans l'extrait qu'il lit (`SOURCE`) et dans
#  les recettes qu'il projette (`TRACES`) : pas un nom de police, pas un indice
#  de nœud, pas une lettre en dur dans les 4 000 lignes qui suivent — le seul
#  caractère cité par le code est le `'o'` des points de contrôle de Glyphs.
#  `jost-axe.py` ne fait donc RIEN d'autre que poser ces trois variables.
#
#  ⚠️ **LES DÉFAUTS SONT CEUX DE JETBRAINS, ET C'EST LA CONDITION DU CHANGEMENT.**
#    `npm run glyphes`, `glyphes.test.js` et l'habitude appellent ce script sans
#    rien dans l'environnement ; il doit alors se comporter exactement comme
#    avant. La variante ne s'obtient que par une demande explicite.
# ═══════════════════════════════════════════════════════════════════════════

def _chemin(cle, defaut):
    return pathlib.Path(os.environ.get(cle, str(GFX / defaut)))


SOURCE = _chemin('NHLG_AXE_SOURCE', '_jetbrains-source.json')
CIBLE = _chemin('NHLG_AXE_CIBLE', '_glyphes-axe.js')
TRACES = _chemin('NHLG_AXE_TRACES', 'jetbrains-traces.py')
#: La table du moteur, repeinte SEULEMENT sur `--adopter` (voir `adopter`).
TABLE = RACINE / 'src' / 'moteur' / 'tables' / 'glyphes.js'

#: Le repère du moteur : la capitale vaut 600 (`glyphes.js › METRIQUES`).
CAPITALE_CIBLE = 600

BAS_DE_CASSE = 'abcdefghijklmnopqrstuvwxyz'
CAPITALES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def charge():
    if not SOURCE.exists():
        sys.exit('extrait absent (%s) : lancer d’abord le script `-source.py` '
                 'de la police visée' % SOURCE.name)
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


def _boite(ch):
    """La boîte du signe, lue dans les DEUX masters — leur union.

    Rien de l'axe ne peut être dehors : l'axe est le lieu où l'encre s'annule,
    et il n'y a pas d'encre hors du glyphe. On prend l'union des deux masters
    plutôt que l'un d'eux, pour ne pas rogner un débord qu'une seule graisse
    porterait.
    """
    x0 = y0 = float('inf')
    x1 = y1 = float('-inf')
    for maigre in (MAIGRE_A, MAIGRE_B):
        for contour in DONNEES['glyphes'][ch][maigre]:
            for (x, y, _t) in contour:
                x0, x1 = min(x0, x * ECHELLE), max(x1, x * ECHELLE)
                y0, y1 = min(y0, y * ECHELLE), max(y1, y * ECHELLE)
    return x0, y0, x1, y1


def axe(ch, journal=None):
    """★ **ET L'AXE NE SORT PAS DE SON SIGNE.**

    > « À chaque fois que la font est plus fine que la largeur standard, tu
    >   tombes au-delà de la barre à laquelle la boucle est tangente. »
    > (l'auteur, sur la colonne « extrapolé à graisse nulle »)

    ⚠️ **UNE POINTE FABRIQUE UNE MOUSTACHE, et le `N` la payait vingt-huit
      unités.** Là où deux traits se joignent en angle aigu — le sommet du `N`,
      celui du `A`, le creux du `M`, les pointes du `V`, du `W`, du `X` — le
      vis-à-vis que cherche le repliage se dérobe, et le nœud part au-delà du
      contour : l'axe du `N` montait à 614 et ses poignées à 633 pour une
      capitale qui plafonne à 600. La lettre, elle, s'arrête bien à 600, si bien
      que la COUVERTURE accusait le tracé d'un manque de 27,6 unités qui
      n'existait pas. C'est l'axe qui avait tort.

    On ramène donc chaque point dans la boîte de son signe. Sur un axe sain
    c'est l'identité — rien n'y sort —, ce qui rend la correction sans risque :
    elle ne peut mordre que là où le repliage a déjà échoué.
    """
    x0, y0, x1, y1 = _boite(ch)

    # ⚠️ **ON NE RABAT QUE CE QUI DÉPASSE DE PLUS QUE LA TOLÉRANCE DU MOTEUR.**
    #   Rabattre TOUT ce qui sort — fût-ce d'une unité — coûtait bien plus que
    #   la moustache ne rapportait : la hampe du `l` culmine à 601,03 pour une
    #   boîte à 600, ce qui est de la précision d'extrapolation et non un
    #   défaut, et la rabattre faisait passer le `l` de 1,4 à 11,0 et le `z` de
    #   0,6 à 8,8. Sous six unités, le moteur compte pareil ; au-delà, c'est une
    #   moustache. Le seuil n'est donc pas un réglage de plus : c'est `TOL`, la
    #   tolérance de contact que le dépôt utilise déjà partout.
    def serre(v, lo, hi):
        if v < lo - TOL:
            return lo
        return hi if v > hi + TOL else v

    out = []
    for contour in replie(effondre(ch, journal)):
        serres = [(serre(x, x0, x1), serre(y, y0, y1), t) for (x, y, t) in contour]
        # ⚠️ **RABATTRE DEUX NŒUDS SUR LA MÊME BORNE LES CONFOND, et un segment
        #   nul dérègle l'ajustement bien plus qu'une unité de dépassement.** Le
        #   `l` en a fait les frais : sa hampe montait à 601,03 juste au-dessus
        #   d'un nœud à 600 — pas une moustache, de la précision. Rabattus tous
        #   deux à 600, ils devenaient un doublon, et la barre du haut, ajustée
        #   sur une longueur nulle, sortait OBLIQUE : le `l` passait de 1,4 à
        #   11,0. On retire donc le second de deux nœuds sur-courbe confondus,
        #   ses poignées avec lui.
        propre, dernier = [], None
        for (x, y, t) in serres:
            if t != 'o' and dernier is not None and math.dist((x, y), dernier) < 1e-6:
                while propre and propre[-1][2] == 'o':
                    propre.pop()
                continue
            if t != 'o':
                dernier = (x, y)
            propre.append((x, y, t))
        out.append(propre)
    return out


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


def _pas(m):
    """Combien d'échantillons pour parcourir ce morceau au pas de deux unités.

    ⚠️ **TREIZE POINTS PAR MORCEAU, C'EST UN POINT TOUS LES CINQUANTE SUR UN FÛT
      DE CAPITALE — et « le plus proche » se met alors à mentir de vingt-cinq
      unités.** Le recollage étendu à toutes les jonctions a fait plonger le `H`
      de 0,6 à 10,9 : le bout de sa barre était à ZÉRO du fût, mais à vingt-cinq
      de l'échantillon le plus proche, et se faisait tirer dessus. On
      échantillonne donc au pas du tracé rendu — ce qu'on mesure est ce que le
      moteur mesurera.

    La corde majore mal une cubique très courbe, jamais de plus d'un facteur
    deux ; douze échantillons restent le plancher, pour les morceaux minuscules.
    """
    corde = sum(math.dist(a, b) for a, b in zip([m[0]] + list(m[1]),
                                                list(m[1]) + [m[2]]))
    return max(12, min(400, int(corde / PAS_RENDU)))


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


#: Combien d'abscisses de suite doivent porter la même marque pour qu'on tienne
#: la frontière pour vraie. Trois : `_sur_droit` se lit sur le point d'axe le
#: plus proche, et près d'un carrefour ce point peut appartenir au voisin.
STABLE = 3

#: Quelle fraction du trait une plage droite (ou courbe) doit peser pour qu'on la
#: tienne pour une plage et non pour un accident de carrefour : un DIXIÈME.
PART_FRONTIERE = 10


def _frontieres(P, casiers):
    """★ **LÀ OÙ LA SOURCE PASSE DU `L` AU `C`, ET RÉCIPROQUEMENT.** (idée de A)

    La marque de rectitude voyage avec chaque point du nuage depuis `_plat` : on
    n'estime aucune courbure, on LIT ce que la fonte déclare. C'est le seul
    découpage du tracé qui ne doive rien à la recette, et il rend à l'`o` ses
    deux flancs droits — la police en met, le tracé n'en avait qu'un, et
    l'asymétrie se voyait.

    ⚠️ Une frontière n'en est une que si la marque TIENT de part et d'autre :
      `_sur_droit` se lit sur le point d'axe le plus proche, et près d'un
      carrefour ce point-là peut appartenir au voisin. Trois abscisses de suite
      suffisent — le plus court trait vrai de l'alphabet en compte soixante.
    """
    droit = [_sur_droit(casiers, q) for q in P]
    brut = []
    for i in range(STABLE, len(P) - STABLE):
        if droit[i - 1] == droit[i]:
            continue
        if any(droit[j] != droit[i - 1] for j in range(i - STABLE, i)):
            continue
        if any(droit[j] != droit[i] for j in range(i, i + STABLE)):
            continue
        brut.append(i)
    # ⚠️ **ET UNE FRONTIÈRE NE VAUT QUE SI CE QU'ELLE SÉPARE EXISTE.** Au
    #   croisement du `w` et de l'`x`, la police fond ses deux diagonales en une
    #   seule masse et l'axe y devient courbe sur une dizaine d'abscisses : deux
    #   frontières, une plage minuscule, et une diagonale de six cents unités
    #   coupée en trois pour un accident de carrefour. On exige donc qu'une plage
    #   pèse un dixième du trait, comme `_guide_droit` en exige un quart.
    mini = max(4, len(P) // PART_FRONTIERE)
    garde, prec = [], 0
    for i in brut:
        if i - prec >= mini:
            garde.append(i)
            prec = i
    while garde and len(P) - 1 - garde[-1] < mini:
        garde.pop()
    return garde


#: Sur combien d'abscisses de part et d'autre on juge du sens de marche pour
#: repérer un extrême. Trois : la projection tremble d'une unité ou deux, et un
#: écart de trois abscisses vaut une vingtaine d'unités de tracé.
LARGEUR_EXTREME = 3

#: De combien d'unités le tracé doit repartir en arrière pour qu'on parle d'un
#: extrême et non d'un tremblement de projection.
SAUT_EXTREME = 4.0


def _extremes(P, a, b):
    """★ **UN EXTRÊME EST UN NŒUD — c'est la règle de toutes les fontes.** (de A)

    > « un arc qui en part et redescend droit au centre, et un second arc
    >   identique accolé au premier. […] 2 avec des poignées symétriques sur le
    >   haut des courbes. » (l'auteur, sur le `m`)

    Le sommet d'une arche, le flanc d'un `o` : partout où le tracé cesse de
    monter ou d'aller à droite, JetBrains Mono pose un point. C'est le même fait
    que `_extremums` lit sur le GUIDE ; ici on le lit sur la MESURE, ce qui vaut
    là où la recette vise mal.
    """
    w = LARGEUR_EXTREME
    if b - a < 3 * w:
        return []
    out = []
    for i in range(a + w, b - w + 1):
        av = (P[i][0] - P[i - w][0], P[i][1] - P[i - w][1])
        ap = (P[i + w][0] - P[i][0], P[i + w][1] - P[i][1])
        for k in (0, 1):
            if (av[k] * ap[k] < 0 and abs(av[k]) > SAUT_EXTREME
                    and abs(ap[k]) > SAUT_EXTREME):
                out.append(i)
                break
    # un rebroussement s'étale sur quelques abscisses : on n'en garde que le
    # milieu, sans quoi un sommet vaudrait trois bornes et deux moignons.
    groupes, courant = [], []
    for i in out:
        if courant and i - courant[-1] > w:
            groupes.append(courant)
            courant = []
        courant.append(i)
    if courant:
        groupes.append(courant)
    return [g[len(g) // 2] for g in groupes]


def _tronc_declare_droit(guide, a, b, jeu=3):
    """★ **UN TRONÇON DÉCLARÉ DROIT L'EST ENCORE SI SON PREMIER POINT TRAÎNE.**
    (de A)

    Le pilier du `a` court de l'abscisse 24 à la 60 ; la borne, elle, tombe à la
    23 — le coin déclaré, qui est encore sur l'arc du chapeau. Une abscisse de
    trop suffisait à faire échouer le test de rectitude, donc à ouvrir le tronçon
    aux frontières et aux extrêmes, donc à le couper en trois. On accorde donc
    trois abscisses de jeu à chaque bout : c'est le coin voisin, pas le tronçon.
    """
    for total in range(2 * jeu + 1):
        for da in range(min(total, jeu) + 1):
            db = total - da
            if db > jeu:
                continue
            if a + da < b - db and _guide_droit(guide, a + da, b - db):
                return (da, db)
    return None


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


def _ajuste(P, tol=TOLERANCE, coins=frozenset(), casiers=None, guide=None,
            ferme=False, lues=False):
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
    # ★ **ET LA SOURCE AJOUTE LES BORNES QUE LA RECETTE N'A PAS VUES.** (de A)
    #   `_fin_de_droite` corrige les bornes DÉCLARÉES ; il ne peut rien pour
    #   celles qui n'ont pas été déclarées du tout. Les deux flancs droits de
    #   l'`o` sont dans ce cas : nul arc de recette ne peut les annoncer, et la
    #   marque `L`/`C` que le nuage porte depuis `_plat` les donne. Idem pour les
    #   rebroussements, que `_extremes` lit sur la MESURE quand `_extremums` les
    #   lit sur le guide.
    # ⚠️ **ON NE COUPE PAS CE QUE LA RECETTE DÉCLARE DROIT.** Les diagonales du
    #   `w`, du `x` et du `y` sont annoncées comme des droites entières : la seule
    #   courbure que l'axe y montre est celle du carrefour, où la police fond les
    #   deux traits en une masse. « S'il y a un trait droit à l'origine, il ne
    #   doit pas y avoir d'aspérité à l'arrivée » (l'auteur).
    if casiers is not None and lues:
        cadre, neuves = list(bouts), set()
        for a, b in zip(cadre, cadre[1:]):
            if guide is not None and _tronc_declare_droit(guide, a, b) is not None:
                continue
            neuves |= {i for i in _frontieres(P, casiers) if a + 3 < i < b - 3}
            neuves |= {i for i in _extremes(P, a, b) if a + 3 < i < b - 3}
        bouts = sorted(set(bouts) | neuves)
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


#: Le plafond de fusion « relatif » : on ne le fixe pas, on le lit sur les deux
#: morceaux qu'on efface (voir `_fusionne`).
RELATIF = object()


def _fusionne(chem, tol, casiers, plafond, sommets=()):
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
        # ★ **RETIRER UN POINT NE DOIT PAS COÛTER PLUS QUE CE QU'IL VAUT.**
        #   La dernière passe travaillait sous un plafond FIXE de 4,3 unités :
        #   elle ravalait le segment droit du pied du `t` dans son quart de tour
        #   (4,1 unités d'écart au lieu de 0,9) et les sommets d'arche du `m`,
        #   alors que les morceaux qu'elle remplaçait tenaient à moins d'une
        #   unité de l'axe. Le plafond se lit donc sur ce qu'on efface, avec le
        #   même budget qu'ailleurs : un point de moins vaut une unité d'écart,
        #   pas quatre.
        # ★ **ET L'ON NE FUSIONNE PAS PAR-DESSUS UN SOMMET.**
        #
        #   > « 2 [points] avec des poignées symétriques sur le haut des
        #   >   courbes » (l'auteur, sur le `m`)
        #
        #   Une police pose un point à chaque extremum, et `AXES` le montre :
        #   l'axe du `m` porte un nœud en (162, 457) et un en (335, 457), au
        #   sommet exact de chaque arche. `_ajuste` les posait — la version avec
        #   extrema y gagne trois dixièmes d'unité — et cette dernière passe les
        #   reprenait aussitôt, laissant chaque arche en UNE cubique. On protège
        #   donc les nœuds que la recette place à un extremum : ce ne sont pas
        #   des points de découpe, ce sont des points du DESSIN.
        if sommets and min(math.dist(b[0], q) for q in sommets) <= SOMMET_PROCHE:
            i += 1
            continue
        # ⚠️ **ET UNE DROITE LONGUE, CONFIRMÉE PAR L'AXE, NE SE FOND PAS DANS
        #   UNE COURBE.**
        #
        #   > « un point supplémentaire devrait être à droite en bas pour finir
        #   >   le segment » (l'auteur, sur le `t`)
        #
        #   `_ajuste` pose bien la droite finale du pied du `t` ; cette passe la
        #   ravalait dans le quart de tour, et le point demandé disparaissait.
        #   Trois conditions, pas une de moins : le morceau est DROIT, il est
        #   LONG (plus de huit dixièmes de fût — en deçà c'est un moignon de
        #   carrefour, comme celui qui traîne à la fourche du `k`), et l'AXE le
        #   confirme droit. Sans la troisième, le `w` gagnait un point sur une
        #   branche que l'axe montre courbe ; sans la deuxième, le `k` et le `m`
        #   en gagnaient quatre.
        if bool(a[1]) != bool(b[1]) and casiers is not None:
            droit = a if not a[1] else b
            if math.dist(droit[0], droit[2]) >= 0.8 * FUT:
                echos = [evalue(droit, k / 24) for k in range(25)]
                if (sum(_sur_droit(casiers, q) for q in echos)
                        >= MAJORITE_DROITE * len(echos)):
                    i += 1
                    continue
        plaf = plafond
        if plafond is RELATIF:
            plaf = (max(_pres(casiers, evalue(x, k / 8))
                        for x in (a, b) for k in range(9)) + BUDGET_POINT
                    if casiers is not None else None)
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
            if _accepte(bez, err, tol, casiers, plaf):
                break
            u = _reparametre(P, bez, u)
            bez = _moindres_carres(P, u, t1, t2)
            err, _ = _ecart_max(P, bez, u)
        if _accepte(bez, err, tol, casiers, plaf):
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
    plats = [[evalue(m, k / _pas(m)) for m in c for k in range(_pas(m) + 1)]
             for c in chemins]
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


# ═══════════════════════════════════════════════════════════════════════════
#  ⑤ᵇⁱˢ LA CHAÎNE — l'invariant qui manquait, et ce qu'il a coûté
# ═══════════════════════════════════════════════════════════════════════════
#
# ★ **UN TRACÉ EST UNE CHAÎNE : le départ d'un morceau EST l'arrivée du
#   précédent.** On écrit pourtant chaque morceau `(départ, poignées, arrivée)`,
#   ce qui range DEUX FOIS le même point. Rien n'oblige les deux copies à
#   coïncider, et `versD` — qui n'émet qu'un `M` puis des `L`/`C` — ne rend que
#   la PREMIÈRE : le départ rangé dans le morceau suivant n'est jamais dessiné.
#
# ⚠️ **C'EST L'ÉNIGME DU `t` ET DU `l`, ET ELLE N'EN EST PLUS UNE.** L'auteur :
#   « la poignée devrait être verticale […] la fonction la calcule, l'accepte et
#   l'applique, et pourtant le tracé final porte l'ancienne valeur. » Elle
#   l'appliquait — mais sur un point FANTÔME. Mesuré : **6,9 unités de rupture
#   au pied du `l`, 6,8 à celui du `t`**, et DOUZE lettres rompues sur
#   vingt-six ; six degrés d'écart sur la poignée, exactement les six degrés que
#   l'auteur voyait, et pas un correctif de plus n'y pouvait rien.
#
# ★ **DEUX GESTES, ET LE SECOND EST LE PLUS IMPORTANT.** `_recoud` referme la
#   rupture ; `_rupture` la MESURE, et `Pose.applique` LÈVE dès qu'une retouche
#   en laisse une derrière elle. Un correctif se contourne, un invariant non.


def _rupture(chem):
    """Le pire écart entre l'arrivée d'un morceau et le départ du suivant."""
    return max((math.dist(a[2], b[0]) for a, b in zip(chem, chem[1:])), default=0.0)


def _bouge_fin(m, j):
    """L'arrivée d'un morceau va en `j`, SA POIGNÉE VOISINE AVEC — une courbe se
    translate, elle ne se tord pas (même raison que dans `_coins_nets`). (de A)"""
    if not m[1]:
        return (m[0], [], j)
    dx, dy = j[0] - m[2][0], j[1] - m[2][1]
    ctrl = list(m[1])
    ctrl[-1] = (ctrl[-1][0] + dx, ctrl[-1][1] + dy)
    return (m[0], ctrl, j)


def _bouge_debut(m, j):
    """Le départ d'un morceau va en `j`, sa poignée voisine avec. (de A)"""
    if not m[1]:
        return (j, [], m[2])
    dx, dy = j[0] - m[0][0], j[1] - m[0][1]
    ctrl = list(m[1])
    ctrl[0] = (ctrl[0][0] + dx, ctrl[0][1] + dy)
    return (j, ctrl, m[2])


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

def _translation(ga, gb, tol=2.5):
    """Le décalage CONSTANT qui mène `ga` sur `gb`, ou None s'il n'y en a pas."""
    if len(ga) != len(gb) or len(ga) < 3:
        return None
    dx = sum(b[0] - a[0] for a, b in zip(ga, gb)) / len(ga)
    dy = sum(b[1] - a[1] for a, b in zip(ga, gb)) / len(ga)
    if any(abs(b[0] - a[0] - dx) > tol or abs(b[1] - a[1] - dy) > tol
           for a, b in zip(ga, gb)):
        return None
    return (dx, dy)


def _decale(chem, d):
    return [((m[0][0] + d[0], m[0][1] + d[1]),
             [(c[0] + d[0], c[1] + d[1]) for c in m[1]],
             (m[2][0] + d[0], m[2][1] + d[1])) for m in chem]


def _ecart_chem(chem, casiers):
    return max([0.0] + [_pres(casiers, evalue(m, k / 12))
                        for m in chem for k in range(13)])


def _jumelles(chemins, guides, casiers):
    """★ **DEUX ARCHES IDENTIQUES SORTENT IDENTIQUES.**

    > « un trait vertical droit à gauche, un arc qui en part et redescend droit
    >   au centre, et un second arc IDENTIQUE accolé au premier. » (l'auteur)

    Les deux arches du `m` sont le même dessin décalé d'un entraxe : la recette
    les déclare superposables, et l'axe le confirme à une unité près — trois
    jambes à 79,2 / 246,6 / 413,9, deux pas de 167,35. Rien ne les distingue, et
    pourtant elles sortaient différentes : l'une en trois morceaux, l'autre en
    deux, leurs jambes naissant à quarante unités d'écart. C'est que le carrefour
    central appartient aux DEUX et que la projection y répartit ses points comme
    elle peut ; chaque arche y reçoit une moitié de mesure, et pas la même.

    ⚠️ **ON NE MOYENNE PAS, ON CHOISIT.** Moyenner deux tracés qui n'ont ni le
      même nombre de morceaux ni les mêmes coupures n'a pas de sens. On garde
      celle qui SERRE LE MIEUX SON AXE, et l'on pose l'autre dessus — le décalage
      étant repris à la mesure, par descente sur chaque coordonnée, et non à la
      déclaration : la recette dit qu'il y a un entraxe, l'axe dit lequel.
    """
    if casiers is None:
        return chemins
    poses = []
    for i in range(len(guides)):
        for j in range(len(guides)):
            if i == j or not chemins[i] or not chemins[j]:
                continue
            d = _translation(guides[i], guides[j])
            if d is None or math.hypot(d[0], d[1]) < 1.0:
                continue
            if _ecart_chem(chemins[i], casiers) > _ecart_chem(chemins[j], casiers):
                continue                       # l'autre sens fera mieux
            for _ in range(2):
                for quelle in (0, 1):
                    note, mieux = None, d
                    for pas in range(-20, 21):
                        dd = ((d[0] + pas * 0.5, d[1]) if quelle == 0
                              else (d[0], d[1] + pas * 0.5))
                        e = _ecart_chem(_decale(chemins[i], dd), casiers)
                        if note is None or e < note:
                            note, mieux = e, dd
                    d = mieux
            poses.append((j, _decale(chemins[i], d)))
    for j, chem in poses:
        chemins[j] = chem
    return {j for j, _ in poses}

#: Ce qu'un point de MOINS a le droit de coûter en fidélité à l'axe : une unité
#: sur six cents. « Le point central en haut pourrait être retiré en déplaçant
#: légèrement les poignées de ses voisins pour garder la même courbe »
#: (l'auteur) — « la même courbe », donc à une unité près.
MOINDRE_POINT = 1.0

#: Ce qu'un point de PLUS doit rapporter pour être gardé.
POINT_DE_PLUS = 0.25

#: À quelle distance un nœud du tracé compte pour le sommet que la recette
#: annonce : un quart de fût. La recette vise à quelques unités près — son
#: sommet d'arche du `m` tombe à un dixième d'unité de celui de l'axe —, mais
#: elle n'est pas la mesure, et il faut lui laisser du jeu.
SOMMET_PROCHE = 0.25 * FUT

#: Ce qu'on accepte de payer, en écart à l'axe, pour retirer un point à la
#: dernière passe de fusion.
BUDGET_POINT = 2.6


def _extremums(guide, fenetre=6):
    """Les indices où le guide REBROUSSE en x ou en y — les extrema du dessin.

    ★ Une police pose un point à chaque extremum ; c'est la convention, et
      JetBrains Mono la suit. Le sommet d'une arche du `m` en est un.

    ⚠️ **UN EXTREMUM EST UN POINT, PAS UNE PLAGE.** Le critère — la différence
      change de signe sur une fenêtre — est vrai sur SIX abscisses d'affilée
      autour du sommet, et l'arche du `m` sortait en onze morceaux au lieu de
      trois. On réduit donc chaque plage à son point le plus extrême.
    """
    n = len(guide)
    out = set()
    for c in (0, 1):
        marques = []
        for k in range(fenetre, n - fenetre):
            av = guide[k][c] - guide[k - fenetre][c]
            ap = guide[k + fenetre][c] - guide[k][c]
            if av * ap < 0 and abs(av) > 1.0 and abs(ap) > 1.0:
                marques.append(k)
        i = 0
        while i < len(marques):
            j = i
            while j + 1 < len(marques) and marques[j + 1] == marques[j] + 1:
                j += 1
            plage = marques[i:j + 1]
            k0 = plage[0]
            sens = 1 if guide[k0][c] - guide[k0 - fenetre][c] > 0 else -1
            out.add(max(plage, key=lambda k: sens * guide[k][c]))
            i = j + 1
    return out

def _recolle(chemins, liens, attendus, quels, tol=TOL):
    """★ **UN CONTACT QUE LA RECETTE ANNONCE ET QUE LA POSE AVAIT, ON LE GARDE.**

    ⚠️ `_jumelles` déplace une arche entière : elle la rapproche de son axe, et
      peut l'éloigner de ce qu'elle touche. Le `m` en a fait les frais — la
      seconde arche naissait à quatorze unités de la jambe centrale, soit une
      extrémité libre de plus (3/5/0 au lieu de 3/4/0), alors que `rejoint`
      l'avait bien posée dessus.

    ★ **ET L'AXE DU `m` EST POUR QUELQUE CHOSE DANS CES QUATORZE UNITÉS** : sa
      jambe centrale porte DEUX brins, à 240,2 et 253,0, parce que c'est là que
      deux traits fondent leur encre et que le repliage n'y ramène pas un brin
      unique. La première arche suit l'un, la seconde part de l'autre ; toutes
      deux sont fidèles, et pourtant elles ne se touchent plus. On ramène donc le
      bout sur son voisin — le point ET sa poignée, pour ne pas tordre la courbe
      — sans toucher au reste : c'est un déplacement de quatorze unités sur un
      seul point, contre douze unités d'écart à l'axe si l'on translatait toute
      l'arche.
    """
    plats = [[evalue(m, k / _pas(m)) for m in c for k in range(_pas(m) + 1)]
             for c in chemins]
    for u, chem in enumerate(chemins):
        if u not in quels or not chem or not liens[u]:
            continue
        voisins = [q for v in liens[u] for q in plats[v]]
        if not voisins:
            continue
        for cote, fin in ((0, False), (1, True)):
            if not attendus[u][cote]:
                continue
            m = chem[-1] if fin else chem[0]
            bout = m[2] if fin else m[0]
            proche = min(voisins, key=lambda z: math.dist(z, bout))
            d = math.dist(proche, bout)
            if d <= tol or d > 0.5 * FUT:
                continue
            # ⚠️ **ON NE RECOLLE QUE CE QU'IL FAUT.** Poser le bout SUR son
            #   voisin, c'est le déplacer de quatorze unités, et chaque unité de
            #   déplacement est une unité d'écart à l'axe : le `m` passait de 2,3
            #   à 8,2. Or le contact est établi dès que le bout est sous la
            #   tolérance du moteur — six unités. On s'arrête donc à la moitié de
            #   cette tolérance, ce qui laisse trois unités de marge au comptage
            #   et rend au `m` quatre des six unités perdues.
            f = max(0.0, (d - tol / 2) / d)
            dx = (proche[0] - bout[0]) * f
            dy = (proche[1] - bout[1]) * f
            proche = (bout[0] + dx, bout[1] + dy)
            ctrl = list(m[1])
            if ctrl:
                if fin:
                    ctrl[-1] = (ctrl[-1][0] + dx, ctrl[-1][1] + dy)
                else:
                    ctrl[0] = (ctrl[0][0] + dx, ctrl[0][1] + dy)
            if fin:
                chem[-1] = (m[0], ctrl, proche)
            else:
                chem[0] = (proche, ctrl, m[2])
    return chemins

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
        # ⚠️ **ET L'INTERSECTION PASSE AVANT L'ABSORPTION.** Les deux règles
        #   valent pour un moignon du milieu, et l'ordre décidait tout : sur le
        #   `L` capitale, le résidu du virage mesure **14,7 unités** pour un
        #   seuil d'absorption à 14,8 — un dixième d'unité. Absorbé, il léguait
        #   son point HAUT à la barre du bas, qui partait alors en pente de trois
        #   degrés : quatorze unités d'écart à l'axe, le pire signe des
        #   cinquante-deux. Coupé, il rend le coin exact. Un moignon coincé entre
        #   deux DROITES n'a jamais rien à donner à personne : il a une
        #   intersection, et c'est le coin.
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
        if change:
            continue
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
#: un quart du guide. En deçà, c'est un bout de courbe presque plat — À MOINS
#: qu'il ne soit droit EXACTEMENT (voir `_guide_droit`).
PART_DROITE = 0.25

#: La plus courte portée sur laquelle on consent à conclure « droite » : six
#: abscisses sur soixante et une. En deçà, deux ou trois points alignés ne
#: prouvent rien — `points_du_trace` échantillonne un arc en quarante-huit
#: points, et deux points consécutifs d'une même corde sont exactement alignés.
SONDE_DROITE = 6

#: La flèche en deçà de laquelle une portée courte est tenue pour droite : deux
#: centièmes d'unité sur six cents. Un `L` de la recette a une flèche NULLE.
DROITE_EXACTE = 0.02


def _runs_droits(guide):
    """Les tronçons que le guide déclare DROITS, bornes comprises."""
    if guide is None or len(guide) < 5:
        return []
    m = len(guide)
    # ⚠️ On ARRONDIT AU-DESSUS : `_guide_droit` compare à la même fraction,
    #   et quinze points contre quinze et quart suffisaient à faire échouer
    #   la jambe du `m` — un quart de point.
    mini = max(4, SONDE_DROITE)
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
    if b - a < 2 or b >= len(guide):
        return False
    p, q = guide[a], guide[b]
    if math.dist(p, q) < 1e-9:
        return False
    fleche = max(_dseg(guide[i], p, q) for i in range(a, b + 1))
    if b - a >= max(2, PART_DROITE * len(guide)):
        return fleche < GUIDE_DROIT
    # ★ **EN DEÇÀ D'UN QUART DU GUIDE, ON N'ACCEPTE QU'UNE DROITE EXACTE.**
    #
    #   > « un point supplémentaire devrait être à droite en bas pour finir le
    #   >   segment » (l'auteur, sur le `t`)
    #
    #   Le pied du `t` finit par cent quatre unités de droite déclarée — 14 % du
    #   guide, donc sous le seuil : elle se noyait dans le quart de tour et
    #   sortait en une seule cubique, sans le point demandé. Or ce qui distingue
    #   une VRAIE droite d'un arc plat n'est pas sa longueur, c'est sa flèche :
    #   un `L` de la recette a une flèche NULLE, l'épaule du `r` — ellipse de
    #   rayons 311 × 118 — en a quatre dixièmes d'unité sur la même portée. Deux
    #   centièmes séparent les deux sans ambiguïté, et le seuil long ne bouge pas.
    return b - a >= SONDE_DROITE and fleche < DROITE_EXACTE


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


#: ★ **CE QU'UNE ABSCISSE MESURE AU PIRE, DANS UN BAS DE CASSE QUI TOMBE
#: JUSTE.** Le plus long guide des vingt-six minuscules est celui du `u` :
#: 1 044 unités pour soixante abscisses, soit dix-sept unités chacune. C'est la
#: densité à laquelle la chaîne est réglée sans le savoir — et les capitales, qui
#: n'ont pas la même taille, tombaient à trente-quatre (le `M`) ou quarante (le
#: `W`) parce qu'elles gardaient le même COMPTE. Le sommet d'un fût tombait alors
#: au milieu d'un seau et sortait seize unités trop bas.
PAS_ABSCISSE = 17.4


def _echelonne(pts, densite=False):
    """Une polyligne ramenée à des points équidistants.

    ⚠️ **PLUS D'ABSCISSES N'EST PAS GRATUIT, et c'est pourquoi `densite` est un
      ESSAI et non une correction.** Des abscisses plus serrées sont des seaux
      plus maigres, donc des trous que le quorum refuse et que l'interpolation
      comble : le `W` reculait de 7,5 à 13,4 et la couverture du `N` de 22,9 à
      24,9 quand on l'imposait partout. On pose donc la lettre des deux façons
      et l'on garde celle qui ne recule sur AUCUNE des deux mesures.
    """
    s, longueur_ = _curviligne(pts)
    n = ABSCISSES
    if densite and longueur_ > 1e-9:
        n = max(ABSCISSES, min(4 * ABSCISSES, int(longueur_ / PAS_ABSCISSE)))
    if longueur_ < 1e-9:
        return [pts[0]] * (n + 1)
    return [_au(pts, s, longueur_, k / n) for k in range(n + 1)]


#: L'écart QUADRATIQUE en deçà duquel deux guides se disputent le même brin :
#: deux unités du repère. Au-delà, le point appartient sans conteste au plus
#: proche.
PARTAGE = 2.0 ** 2

#: Et il faut que le point soit VRAIMENT sur le brin des deux : à plus de trois
#: unités du plus proche, il n'y a pas de dispute, il y a un vainqueur.
SUR_LE_BRIN = 3.0 ** 2


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
    seaux = [[[] for _ in range(len(g))] for g in guides]
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
            # ★ **UN BRIN QUE DEUX GUIDES SE DISPUTENT SERT AUX DEUX.**
            #   Là où deux traits fondent leur encre, l'axe n'a qu'un brin :
            #   l'attribuer au seul plus proche, c'est l'attribuer au premier
            #   déclaré, et l'autre n'a plus rien. L'épaule du `r` naît sur le
            #   fût, sur trente-deux abscisses ; privée de mesure, elle démarrait
            #   à 338 quand l'axe la fait naître à 306 — onze unités et demie,
            #   le pire écart de l'alphabet, toutes au même endroit.
            for t, guide in enumerate(guides):
                if t == choix[0]:
                    continue
                for k, q in enumerate(guide):
                    v = tangentes[t][k]
                    if abs(u[0] * v[0] + u[1] * v[1]) < DE_FACE_GUIDE:
                        continue
                    if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 <= meilleur + PARTAGE \
                            and meilleur <= SUR_LE_BRIN:
                        seaux[t][k].append(p)
                        break

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


# ═══════════════════════════════════════════════════════════════════════════
#  ⑥ LA POSE — une étape à la fois, chacune nommée, vérifiée, mesurée
# ═══════════════════════════════════════════════════════════════════════════
#
# > « le fichier a grossi par accumulation de passes correctives, au point que
# >   son auteur ne sait plus expliquer pourquoi il produit ce qu'il produit. »
# >   (l'auteur)
#
# ★ **UNE CHAÎNE QUI S'EXPLIQUE EST UNE CHAÎNE QUI S'ARRÊTE.** Les retouches
#   tenaient en une expression de six appels imbriqués, écrite sur trois lignes :
#   rien n'y disait l'ordre, rien n'y mesurait ce que chacune coûtait, et rien
#   n'y vérifiait que le tracé restait un tracé. Elles sont désormais une LISTE
#   NOMMÉE — `RETOUCHES` —, et `Pose.applique` les déroule une par une en
#   contrôlant après chacune l'invariant de chaîne (§⑤ᵇⁱˢ) et l'écart à l'axe.
#
# ★ **ET ON PEUT LA REGARDER TRAVAILLER** : `python3 jetbrains-axe.py --passes l`
#   déroule le tableau passe par passe — nombre de morceaux, écart à l'axe,
#   tracé rendu. C'est le seul moyen d'attribuer un défaut à UNE étape plutôt
#   qu'à leur somme, et c'est ce qui manquait quand `_tangence` appliquait une
#   correction que le rendu ne montrait pas.


class Pose:
    """L'axe d'une lettre, sa topologie déclarée, et de quoi poser l'un sur
    l'autre. Chaque étape est une méthode ou une retouche nommée, et chacune
    rend un jeu de chemins qu'on peut mesurer, dessiner et comparer seul."""

    def __init__(self, ch, recette, points_du_trace, trace=False, lues=False,
                 densite=False):
        self.ch = ch
        self.trace = trace
        #: Coupe-t-on aussi aux bornes LUES dans la source (`_frontieres`,
        #: `_extremes`) ? Ce n'est pas un réglage : `traits` pose la lettre des
        #: deux façons et garde celle qui ne recule sur AUCUNE des deux mesures.
        self.lues = lues
        #: Les abscisses suivent-elles la LONGUEUR du guide plutôt qu'un compte
        #: fixe ? Même règle que `lues` : c'est un essai, arbitré à la mesure.
        self.densite = densite
        self.decl, self.jonctions = recette
        nuage = _plat(ch)
        # Les boucles VRAIMENT fermées — celles dont l'axe décrit un tour
        # complet, comme la panse du `a` ou l'`o`. Une panse à `couture` n'en est
        # pas une : son guide est ouvert, seul le rendu se referme.
        self.fermes = [not d.get('ouvert', True) and not d.get('couture')
                       for d in self.decl]
        self.guides = [_echelonne(points_du_trace(t['d']), densite)
                       for t in self.decl]
        # ★ Les COINS restent ceux que la recette déclare : c'est une lecture du
        #   dessin, et une passe de projection ne saurait ni les inventer ni les
        #   perdre. Seule la géométrie se corrige d'une passe à l'autre.
        self.coins = [_anguleux(g) for g in self.guides]
        self.points, self.reste = self._isole_les_points(nuage)
        self.casiers = _grille([(p[0], p[1], d, u) for p, u, _, d in self.reste])
        self.liens = self._liens()
        self.lespis = plis(self.reste)
        # Lequel des deux bouts de chaque trait la recette pose EN CONTACT.
        # ⚠️ **UNE BOUCLE VRAIMENT FERMÉE N'A PAS DE BOUT, ET NE SERT PAS DE
        #   CIBLE.** `rejoint` taille chaque bout libre à sa rencontre ; un
        #   sous-chemin fermé n'en a aucun — sa couture n'est pas une extrémité
        #   du dessin, c'est l'endroit arbitraire où le tracé recommence. Il ne
        #   peut pas non plus servir de voisin à tailler : sur une panse cousue
        #   au fût, tout point du fût serait à zéro unité de la panse et « le plus
        #   proche » ne voudrait plus rien dire.
        # ★ Une panse à COUTURE, elle, se pose et se taille comme un trait
        #   OUVERT : c'est ce qu'elle est jusqu'au dernier geste (voir `couture`
        #   dans `jetbrains-traces.py`).
        self.attendus = [(False, False) if self.fermes[i] else
                         tuple(any(_dpoly(g[bout], self.guides[k]) <= TOL
                                   for k in self.liens[i])
                               for bout in (0, -1))
                         for i, g in enumerate(self.guides)]
        self.cibles = [{k for k in voisins if not self.fermes[k]}
                       for voisins in self.liens]
        self.sommets = [[g[k] for k in _extremums(g)] for g in self.guides]
        self.brins = self._brins()
        #: Les traits que `_r_jumelles` a déplacés en dernier — `_r_recollage`
        #: est le seul à devoir les rattraper.
        self.jumelees = set()

    # ── ① ce que la recette déclare, mis en tables ────────────────────────

    def _isole_les_points(self, nuage):
        """★ **LE POINT DU `i` ET DU `j` SE SERT AVANT LES AUTRES, ET SORT DU
          NUAGE.** Un trait DÉGÉNÉRÉ n'a pas de direction ; le filtre de tangente
          rejetait donc tout pour lui, et son anneau d'axe — un point effondré
          reste un anneau minuscule — partait grossir le seau le plus proche de
          la hampe. Cent quatre-vingt-six unités plus bas, l'empattement du `i`
          s'en trouvait tiré vers le haut, et le `j` finissait à cent trente-deux
          unités de son axe.

        ★ **ET IL SE PREND PAR CONTOUR, PAS PAR RAYON.** Un point est un CONTOUR
          À LUI SEUL — c'est exact, et ça ne demande aucun seuil. Le rayon, lui,
          partait d'un repère que la recette pose au SOMMET de la boîte du signe
          et non au centre du point : la moitié basse de l'anneau lui échappait
          de six unités, repartait dans la hampe, et faisait monter le `i` et le
          `j` de trente unités au-dessus de la hauteur d'x — un crochet en l'air,
          sur les deux seules lettres qui en portent un.
        """
        points, reste = [], list(nuage)
        for g in self.guides:
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
            # ⚠️ **LE CENTRE D'UN POINT EST CELUI DE SA BOÎTE, PAS DE SES
            #   POINTS.** L'anneau effondré n'est pas parcouru à vitesse
            #   constante : sa moyenne penche du côté où les échantillons se
            #   serrent, et le point du `j` sortait dix-sept unités à gauche de
            #   sa hampe — « il devrait surplomber la barre verticale en étant
            #   pile au-dessus » (l'auteur). Les extrêmes, eux, ne dépendent
            #   d'aucune vitesse.
            points.append(((min(z[0] for z in lot) + max(z[0] for z in lot)) / 2,
                           (min(z[1] for z in lot) + max(z[1] for z in lot)) / 2))
        return points, reste

    def _brins(self):
        """Les BRINS d'axe que le tracé doit couvrir — un par contour replié, et
        seulement ceux qui pèsent plus de quatre-vingts unités : en deçà, c'est
        le point du `i` ou du `j`, qui se couvre lui-même."""
        lots = {}
        for q, _, ci, _ in self.reste:
            lots.setdefault(ci, []).append(q)
        brins = []
        for lot in lots.values():
            xs = [z[0] for z in lot]
            ys = [z[1] for z in lot]
            if max(max(xs) - min(xs), max(ys) - min(ys)) >= ETENDUE_BRIN:
                brins.append(lot)
        return brins

    def _liens(self):
        liens = [set() for _ in self.decl]
        for j in self.jonctions:
            a, b = int(j[0]), int(j[1])
            if 0 <= a < len(self.decl) and 0 <= b < len(self.decl):
                liens[a].add(b)
                liens[b].add(a)
        return liens

    # ── ② la projection : les guides déclarés, reposés sur l'axe ──────────

    def _guides_recales(self):
        """★ **LES BOUTS LIBRES SE RECALENT SUR LES PLIS DE L'AXE — avant tout
          le reste.** Un bout qu'aucune jonction ne retient est une extrémité de
          la lettre, et une extrémité de la lettre est un PLI de l'axe effondré :
          le seul repère que le dessin donne sans ambiguïté. La recette, elle,
          peut se tromper de deux cents unités — elle envoie l'épaule du `r` en
          haut à droite (439, 452) quand la police l'arrête à mi-hauteur
          (395, 259) — et un guide faux de deux cents unités ne se rattrape par
          aucune itération. L'écart se fond sur toute la longueur du guide :
          déplacer le seul dernier point y ferait un coude que la projection
          prendrait pour un relief.

        ⚠️ **UN PLI APPARTIENT À UN SEUL BOUT.** Le pied du fût gauche du `m` est
          à cent soixante-dix unités du bas de sa jambe centrale : plus près que
          la portée autorisée, et le guide de l'arche s'y faisait tirer tout
          entier — l'arche redescendait le fût sur deux cent cinquante unités
          avant de remonter. C'est le zigzag central. On apparie donc les bouts
          libres aux plis du plus proche au plus lointain, et chaque pli ne sert
          qu'une fois.
        """
        libres = []
        for t, g in enumerate(self.guides):
            if self.points[t] is not None:
                continue
            for versLaFin in (False, True):
                bout = g[-1] if versLaFin else g[0]
                if any(_dpoly(bout, self.guides[k]) <= TOL for k in self.liens[t]):
                    continue                   # ce bout-là est tenu par un voisin
                for pli in self.lespis:
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
        recales = list(self.guides)
        for t, g in enumerate(self.guides):
            for versLaFin in (False, True):
                pli = choix.get((t, versLaFin))
                if pli is not None:
                    g = _recale(g, pli, versLaFin)
            recales[t] = g
        return recales

    def _rejoue(self, depart):
        """★ **ON REJOUE TANT QUE ÇA RAPPROCHE DE L'AXE, ET ON S'ARRÊTE DÈS QUE
          ÇA ÉLOIGNE.** Rejouer la projection sur sa propre sortie corrige la
          plupart des lettres — le `w` passe de vingt-six unités d'écart à six,
          le `z` de neuf à deux — mais DIVERGE sur celles dont la première passe
          est déjà fausse : le `j` s'éloignait de quatre-vingt-dix-sept à cent
          trente-deux. Le critère d'arrêt n'a donc pas à être choisi, il se
          mesure.
        """
        lignes, note = depart, None
        for _ in range(PASSES):
            essai = _pose(self.reste,
                          [_echelonne(l, self.densite) for l in lignes],
                          self.coins)
            neuve = _ecart_a_laxe(essai, self.casiers)
            if note is not None and neuve >= note:
                break
            lignes, note = essai, neuve
        return lignes, (note if note is not None else 1e18)

    def projette(self):
        """Les guides déclarés, reposés sur l'axe — deux essais, le meilleur gagne.

        ⚠️ **TOUS LES PLIS NE SONT PAS DES BOUTS.** L'axe se renverse aussi dans
          les carrefours — le `m` en montre trois qui n'appartiennent à aucune
          extrémité, le `g` autant. Recaler dessus a fait passer le `m` de seize
          unités d'écart à soixante-dix-huit et le `g` de douze à cent dix. On ne
          sait pas dire lesquels sont vrais ; on n'a pas à le savoir. On pose la
          lettre DEUX FOIS, avec et sans recalage, et on garde celle qui serre
          l'axe de plus près. Le `r` y gagne cent unités, le `m` et le `g` n'y
          perdent rien.
        """
        lignes, note = self._rejoue(self.guides)
        autres, autreNote = self._rejoue(self._guides_recales())
        if autreNote < note:
            lignes, note = autres, autreNote
        for t, c in enumerate(self.points):
            if c is not None:
                lignes[t] = [c] * len(self.guides[t])
        #: ★ La MESURE de chaque trait, gardée : c'est le morceau d'axe que ce
        #: trait-là doit couvrir, et le seul étalon dont dispose une retouche qui
        #: ne travaille que sur un trait.
        self.mesure = lignes
        return lignes

    # ── ③ l'ajustement : le moins de cubiques possible ────────────────────

    def ajuste(self, lignes):
        """Chaque trait, ajusté à une unité près. Les coins du guide sont imposés
        comme bornes — un ajustement qui n'en saurait rien arrondirait le pied du
        `l` et le `z`.

        ⚠️ **ET LA CHAÎNE SE RECOUD AUSSITÔT.** `_ajuste` rend ses tronçons
          séparément ; onze lettres en sortaient trouées, et le trou se lisait
          ensuite comme une poignée (voir `_recoud` et §⑤ᵇⁱˢ).

        ★ **ET L'ON COUPE AUX EXTREMA — quand ça rapporte, et pas autrement.**

          > « Avec 10 points dont […] 2 avec des poignées symétriques sur le haut
          >   des courbes » (l'auteur, sur le `m`)

          Une police pose un point à chaque extremum, et JetBrains Mono le fait :
          le sommet d'une arche en est un. Mais l'auteur demande AUSSI d'en
          retirer — « le point central en haut [de l'`o`] pourrait être retiré » —
          et les deux exigences ne se contredisent pas : un point se paie en
          fidélité. On ajuste donc chaque trait DEUX FOIS, avec et sans les
          extrema, et l'on tranche à la mesure : un point de MOINS passe s'il ne
          coûte pas une unité d'écart ; un point de PLUS ne passe que s'il en
          fait gagner deux. Mesuré, ça donne au `m` ses deux sommets d'arche
          (5 morceaux à 6,9 unités → 7 à 4,6), au `p` un point qui le ramène de
          11,7 à 9,5, et ça RETIRE celui de l'`o` (5 → 4) et du `b` (6 → 5). Le
          `a` et le `g`, eux, gardent leur version sans extrema : elle est deux
          fois plus fidèle.
        """
        ajustes = []
        for t, ligne in enumerate(lignes):
            sobre = self._ajuste_un(t, ligne, self.coins[t])
            riche = self._ajuste_un(t, ligne,
                                    set(self.coins[t]) | _extremums(self.guides[t]))
            es = _ecart_chem(sobre, self.casiers) if self.casiers is not None else 0.0
            er = _ecart_chem(riche, self.casiers) if self.casiers is not None else 1e18
            if len(riche) < len(sobre):
                ajustes.append(riche if er <= es + MOINDRE_POINT else sobre)
            else:
                ajustes.append(riche if er < es - POINT_DE_PLUS else sobre)
        return ajustes

    def sommets_mesures(self, t):
        """★ **UN REBROUSSEMENT SE LIT AUSSI SUR LA MESURE, pas seulement sur le
        guide.** La recette pose le creux du `u` à y = 29 ; l'axe l'y met à −7.
        Trente-six unités, soit deux fois la portée qui rattache un nœud à son
        sommet déclaré : le sommet n'était donc pas protégé, la fusion réunissait
        le demi-tour en UNE cubique, et le `u` passait de 1,4 à 3,7 unités
        d'écart. Le guide dit QU'il y a un rebroussement ; la mesure dit OÙ.
        """
        return [self.mesure[t][k] for k in _extremums(self.mesure[t])]

    def _ajuste_un(self, t, ligne, marques):
        return _recoud(_ajuste(ligne, TOLERANCE, marques, self.casiers,
                               self.guides[t], self.fermes[t], self.lues))

    # ── ④ les retouches, une par une ──────────────────────────────────────

    def ecart(self, chemins):
        """Le pire écart du tracé RENDU à l'axe — la seule note qui compte.

        ★ Mesuré sur le tracé final et non sur les points qui l'ont produit.
        """
        pire = 0.0
        for t, chem in enumerate(chemins):
            if self.points[t] is not None:
                continue                       # le point du `i`, du `j`
            for m in chem:
                pire = max([pire] + [_pres(self.casiers, evalue(m, k / 12))
                                     for k in range(13)])
        return pire

    def couverture(self, chemins):
        """★ **L'AUTRE MOITIÉ DE LA MESURE : ce que le tracé NE COUVRE PAS.**

        `ecart` dit à quelle distance le tracé s'écarte de l'axe. Il ne dit RIEN
        d'un tracé qui ne couvre rien : un moignon posé sur l'axe en est tout
        près, et sort donc parfait. C'est exactement ce qui a laissé passer la
        barre du bas du `z`, amputée de vingt-cinq unités, et failli laisser
        passer une panse de `b` réduite à un tronçon.

        On mesure donc l'inverse : la distance MAXIMALE de l'axe au tracé. Les
        brins d'axe de moins de quatre-vingts unités d'étendue en sont exclus —
        ce sont les points du `i` et du `j`, qui n'ont pas à être couverts par
        autre chose qu'eux-mêmes.
        """
        rendu = _densifie(chemins)
        if not rendu:
            return 1e18
        grille = _grille(rendu)
        return max((_pres(grille, q) for brin in self.brins for q in brin),
                   default=0.0)

    def applique(self, chemins):
        """Déroule `RETOUCHES`, en vérifiant la chaîne après chacune.

        ⚠️ **LE CONTRÔLE N'EST PAS DÉCORATIF.** C'est lui qui aurait attrapé, en
          une seconde, les sept unités de rupture au pied du `t` et du `l` qui
          ont fait passer `_tangence` pour une fonction sans effet (§⑤ᵇⁱˢ). Une
          passe qui romprait la chaîne lève désormais, au lieu de rendre un tracé
          plausible et faux.
        """
        if self.trace:
            print('  %s · %-11s %2d morceaux · écart %5.1f'
                  % (self.ch, 'pose', sum(len(c) for c in chemins),
                     self.ecart(chemins)))
        for nom, retouche in RETOUCHES:
            chemins = retouche(self, chemins)
            for t, c in enumerate(chemins):
                rupture = _rupture(c)
                if rupture > 1e-6:
                    raise AssertionError(
                        '« %s » trait %d : la passe « %s » a rompu la chaîne de '
                        '%.2f unités — le départ d’un morceau EST l’arrivée du '
                        'précédent, et `versD` ne rend que le premier des deux.'
                        % (self.ch, t, nom, rupture))
            if self.trace:
                print('  %s · %-11s %2d morceaux · écart %5.1f'
                      % (self.ch, nom, sum(len(c) for c in chemins),
                         self.ecart(chemins)))
        return chemins

    def rendu(self, chemins):
        return ([{'d': versD(chem),
                  'ouvert': self.decl[t].get('ouvert', True)}
                 for t, chem in enumerate(chemins)], self.jonctions)


# ── les retouches elles-mêmes : chacune une fonction, chacune un nom ──────

def _decouvert(pose, t, chem):
    """Ce que le trait `t` laisse DÉCOUVERT de sa propre mesure — la couverture,
    ramenée à un seul trait. C'est l'étalon d'une retouche qui n'en voit qu'un."""
    if not chem:
        return 1e18
    return max((_pres(_grille(_densifie([chem])), q) for q in pose.mesure[t]),
               default=0.0)

def _r_coins(pose, chemins):
    """Un coin est un point, pas deux ; un moignon de carrefour n'est pas un
    trait. Se rejoue après chaque geste qui déplace un bout."""
    return [_coins_nets(list(c)) for c in chemins]


def _r_jumelles(pose, chemins):
    """Deux traits que la recette déclare superposables le redeviennent — les
    deux arches du `m` (voir `_jumelles`).

    ★ **AVANT LA TAILLE** la première fois : `rejoint` recolle ensuite chaque
      arche à ce qu'elle touche, et les deux reçoivent le même geste puisqu'elles
      sont dans la même position relative.

    ⚠️ **ET APRÈS, EN DERNIER.** Posées seulement avant la taille, les deux
      arches du `m` repartaient identiques et se séparaient à nouveau : la fusion
      finale rendait la première en UNE cubique symétrique et la seconde en DEUX.
      Le dernier mot revient à la géométrie finale — c'est la même règle que pour
      la tangence.

    ⚠️ **MAIS DEUX GUIDES JUMEAUX NE FONT PAS DEUX AXES JUMEAUX — ET C'EST CE
      QUI AMPUTAIT LE `z`.** `_jumelles` choisit « celle qui SERRE LE MIEUX SON
      AXE » : un critère de FIDÉLITÉ seule, et la fidélité récompense un moignon.
      Les deux barres du `z` sont déclarées de même longueur (74 → 419,2) donc
      superposables ; l'axe, lui, donne 274 unités à celle du haut et **297 à
      celle du bas**. Recopier la première sur la seconde amputait la barre du
      bas de vingt-cinq unités — elle s'arrêtait à x = 368,4 pour un axe qui va
      à 395,1 — et la lettre restait notée 0,5 de fidélité, la MEILLEURE de
      l'alphabet. C'est exactement le piège que la couverture existe pour fermer :
      un jumeau qui laisse sa propre mesure découverte n'est pas un jumeau, c'est
      un moignon, et on le refuse.

    ★ **ET LE SEUIL SE MESURE, IL NE SE CHOISIT PAS.** Les deux cas sont à un
      ordre de grandeur l'un de l'autre : la barre du `z` passe de **0,8 à 25,0
      unités découvertes**, la seconde arche du `m` de **11,5 à 15,5**. Une
      tolérance de contact du moteur (six unités) les sépare sans ambiguïté — en
      deçà, l'axe est encore touché ; au-delà, un morceau de lettre a disparu.
      Le `m` garde donc ses deux arches identiques, comme l'auteur les décrit, et
      le `z` retrouve ses vingt-cinq unités.
    """
    avant = [_decouvert(pose, t, c) for t, c in enumerate(chemins)]
    neufs = [list(c) for c in chemins]
    quels = _jumelles(neufs, pose.guides, pose.casiers)
    quels = quels if isinstance(quels, set) else set()
    garde = set()
    for t in quels:
        if _decouvert(pose, t, neufs[t]) > avant[t] + TOL:
            neufs[t] = list(chemins[t])        # ce jumeau AMPUTE : on le refuse
        else:
            garde.add(t)
    pose.jumelees = garde
    return neufs


def _r_jonctions(pose, chemins):
    """Chaque bout que la recette pose en contact est TAILLÉ à sa rencontre.

    ⚠️ C'est le dernier geste de la pose brute, et il vient APRÈS l'ajustement :
      tailler avant laisserait l'ajusteur repousser une queue de l'autre côté du
      carrefour.
    """
    chemins = [list(c) for c in chemins]
    rejoint(chemins, pose.cibles, pose.attendus, pose.lespis)
    return chemins


def _r_fusion(pose, chemins):
    """★ **UNE DERNIÈRE PASSE DE FUSION, UN PEU PLUS LARGE.**

    > « L'`o` est déjà très bien, mais le point central en haut pourrait être
    >   retiré en déplaçant légèrement les poignées de ses voisins pour garder la
    >   même courbe » (l'auteur)

    C'est exactement ce que fait une fusion, et il ne lui manquait qu'un peu
    d'air : la tolérance de l'ajustement est calée sur la fidélité au dixième
    d'unité, quand retirer un point n'en coûte que quelques-uns et se voit, lui,
    tout de suite. Les SOMMETS déclarés, eux, ne se fondent pas : ce sont les
    nœuds que la police pose à chaque extremum.
    """
    return [_fusionne(list(c), TOLERANCE, pose.casiers, RELATIF,
                      pose.sommets[t] + pose.sommets_mesures(t))
            for t, c in enumerate(chemins)]


def _r_tangence(pose, chemins):
    """Un raccord sans angle est un raccord tangent.

    ⚠️ Elle se rejoue en fin de course, et pour une raison mesurée : calée sur
      une droite que les passes suivantes redressaient encore, la poignée du `t`
      et celle du `l` restaient à six degrés de la verticale. « Le dernier mot
      revient à la géométrie FINALE. »
    """
    return [_tangence(list(c), pose.casiers, TOLERANCE) for c in chemins]


def _r_alignees(pose, chemins):
    """Deux droites qui se suivent presque en ligne n'en font qu'une."""
    return [_alignees(list(c), pose.casiers, TOLERANCE) for c in chemins]


def _r_symetrie(pose, chemins):
    """Un demi-tour entre deux droites parallèles est symétrique."""
    chemins = [list(c) for c in chemins]
    _symetrise(chemins, pose.casiers, TOLERANCE)
    return chemins


def _r_point(pose, chemins):
    """★ **LE POINT SURPLOMBE SA HAMPE — c'est une lecture, pas une mesure.**

    > « le point du `j` devrait surplomber la barre verticale en étant pile
    >   au-dessus ; là il est décalé vers la gauche. » (l'auteur)

    Sa hauteur se mesure ; son abscisse, non. La police pose le centre du point à
    380 unités À TOUTE GRAISSE — il n'a pas d'épaisseur, donc pas d'axe qui bouge
    — tandis que l'axe de la hampe, lui, glisse jusqu'à 401 quand l'encre
    s'annule. Vingt et une unités d'écart, qui n'existent dans aucune graisse
    réelle : c'est un artefact de l'effondrement, pas un trait du dessin. On
    aligne donc le point sur ce qu'il surplombe.
    """
    chemins = [list(c) for c in chemins]
    for t, c in enumerate(pose.points):
        if c is None or not chemins[t]:
            continue
        dessous = [q for k, chem in enumerate(chemins)
                   if k != t and pose.points[k] is None
                   for m in chem for q in (m[0], m[2])]
        if not dessous:
            continue
        appui = min(dessous, key=lambda q: math.hypot(q[0] - c[0], (q[1] - c[1]) * 0.2))
        chemins[t] = [((appui[0], c[1]), [], (appui[0], c[1]))]
    return chemins


#: De combien un bout libre a le droit d'être prolongé : un demi-fût. C'est
#: l'ordre de grandeur d'un demi-pas d'abscisse sur le plus long trait de
#: l'alphabet (dix-sept unités pour le `u` d'un seul tenant) ; au-delà, ce n'est
#: plus un bout mal mesuré, c'est un trait qui manque.
PROLONGE = 0.5 * FUT


def _r_bouts(pose, chemins):
    """★ **UN BOUT LIBRE VA JUSQU'AU BOUT DE SA MESURE.**

    ⚠️ **UN TRAIT LONG A DES ABSCISSES LARGES, ET SES DEUX BOUTS EN PAIENT LA
      MOITIÉ.** La projection rend, pour chaque abscisse, le CENTRE de ce qui s'y
      projette. Au milieu d'un trait c'est exact ; au dernier, c'est un demi-pas
      trop court, et le pas vaut la longueur du trait divisée par soixante. Le
      `u` d'un seul tenant mesure 1 044 unités de long — dix-sept par abscisse —
      et ses deux hampes s'arrêtaient **six unités sous la hauteur d'x**, quand
      les deux traits séparés d'avant n'en perdaient qu'une. Ce n'est pas un
      défaut du `u` : c'est la mesure du bout, et elle se corrige au bout.

    ★ On prolonge donc chaque bout LIBRE — jamais un bout que la recette met en
      contact, `rejoint` a le dernier mot sur ceux-là — le long de sa propre
      tangente, tant que l'AXE continue devant lui. « Tant que » se mesure : le
      point d'axe le plus avancé qui reste dans un couloir d'une tolérance de
      contact autour du prolongement, et pas plus loin qu'un demi-fût. Aucun
      point d'axe devant, aucun prolongement — c'est le cas de l'amorce du fût du
      `m`, qui dépasse exprès et que rien ne doit rallonger.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        # ⚠️ **NI ANNEAU, NI COURBE.** Un sous-chemin fermé n'a pas de bout : ses
        #   deux extrémités sont sa couture, l'axe continue des deux côtés, et
        #   prolonger les deux fait déborder l'`o` de seize unités. Et une
        #   terminaison COURBE — celle du `s`, du `c` — se prolonge sur sa
        #   tangente, donc en dehors de sa propre courbure : le `s` y perdait
        #   trois unités. La demi-abscisse manquante ne se voit que sur les bouts
        #   DROITS, qui sont les seuls dont on connaisse la suite.
        if not chem or pose.points[t] is not None or pose.fermes[t] \
                or pose.decl[t].get('couture'):
            continue
        for cote in (0, -1):
            if pose.attendus[t][0 if cote == 0 else 1]:
                continue                       # ce bout-là est tenu par un voisin
            m = chem[cote]
            if m[1]:
                continue                       # bout courbe : on n'extrapole pas
            bout = m[0] if cote == 0 else m[2]
            u = _versLe(m[2], m[0]) if cote == 0 else _versLe(m[0], m[2])
            if u == (0.0, 0.0):
                continue
            loin = 0.0
            for q, _, _, _ in pose.reste:
                s = (q[0] - bout[0]) * u[0] + (q[1] - bout[1]) * u[1]
                if s <= loin or s > PROLONGE:
                    continue
                if abs((q[0] - bout[0]) * -u[1] + (q[1] - bout[1]) * u[0]) > TOL:
                    continue
                loin = s
            # ⚠️ Le seuil est celui de l'AJUSTEMENT, pas celui du contact : à six
            #   unités, le fût gauche du `u` (6,2 à rattraper) passait et le
            #   droit (7,0) non — deux hampes jumelles rendues de longueurs
            #   différentes, pour un seuil.
            if loin <= TOLERANCE:
                continue
            cible = (bout[0] + u[0] * loin, bout[1] + u[1] * loin)
            chem[cote] = _bouge_debut(m, cible) if cote == 0 else _bouge_fin(m, cible)
    return chemins


def _r_recousu(pose, chemins):
    """La chaîne, refermée exactement comme `versD` la dessinera (§⑤ᵇⁱˢ)."""
    return [_recoud(list(c)) for c in chemins]


def _r_recollage(pose, chemins):
    """Un contact que la recette annonce et que la pose avait, on le garde —
    `_r_jumelles` venant de déplacer une arche entière (voir `_recolle`)."""
    chemins = [list(c) for c in chemins]
    _recolle(chemins, pose.cibles, pose.attendus, pose.jumelees)
    return chemins


#: Ce qu'une épure a le droit de coûter quand elle retire un point : un dixième
#: d'unité sur six cents. Autant dire rien — l'épure ne doit RIEN acheter, elle
#: ne retire que ce qui ne servait pas.
JEU_EPURE = 0.1

#: Ce qu'un recoupage aux sommets a le droit de perdre sur UNE des deux mesures
#: quand l'autre y gagne davantage : un quart de la tolérance du moteur.
JEU_QUADRANT = 1.5


def _note_locale(pose, morceaux_, attendus):
    """Ce qu'un bout de trait vaut, aux deux mesures, sans regarder le reste.

    La note globale d'une lettre coûte une densification complète ; une épure en
    essaie des dizaines par signe. On mesure donc le MÊME couple — fidélité à
    l'axe, couverture de l'axe — mais sur le seul morceau qu'on touche et sur la
    seule portion d'axe qu'il doit couvrir.
    """
    echant = [evalue(m, k / 24) for m in morceaux_ for k in range(25)]
    fid = max((_pres(pose.casiers, p) for p in echant), default=0.0)
    if not attendus:
        return fid, 0.0
    g = _grille(echant)
    return fid, max(_pres(g, q) for q in attendus)


def _tangentes_de(m):
    """Les deux tangentes d'un morceau, AU FORMAT QUE `_cubiques` ATTEND.

    ⚠️ **LA SECONDE POINTE À CONTRESENS DU PARCOURS, et ce n'est pas un détail.**
      `_cubiques` reçoit en `t2` la direction qui va du point d'ARRIVÉE vers
      l'intérieur du morceau — c'est visible dans sa propre récursion, qui passe
      `(-tc[0], -tc[1])` au tronçon de gauche. Lui donner la direction de
      parcours retourne la poignée : le premier quadrant du `c` sortait avec une
      poignée d'arrivée à (162 ; 457) pour un point d'arrivée à (235 ; 457), et
      la reconstruction mesurait 75,9 au lieu de 5,1. Le même défaut rendait la
      fonte de l'épure presque toujours refusée, sans qu'on sache pourquoi.
    """
    def unit(a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        return (dx / n, dy / n) if n > 1e-9 else (0.0, 0.0)
    ctrl = list(m[1])
    depart = unit(m[0], ctrl[0]) if ctrl else unit(m[0], m[2])
    arrivee = unit(m[2], ctrl[-1]) if ctrl else unit(m[2], m[0])
    return depart, arrivee


def _sommets_droits(d):
    """Les sommets d'un tracé de recette fait UNIQUEMENT de droites — sinon `None`."""
    if re.search(r'[AaCcQqSsTtVvHh]', d):
        return None
    nb = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', d)]
    return [(nb[i], nb[i + 1]) for i in range(0, len(nb) - 1, 2)]


def _r_polyligne(pose, chemins):
    """★ **CE QUE LA RECETTE DÉCLARE DROIT ARRIVE DROIT. Sans arbitrage.**

    > « S'il y a un trait droit à l'origine, il ne doit pas y avoir d'aspérité à
    >   l'arrivée. » (l'auteur)
    > « "w" : il y a un souci clair, trop présent pour passer dessus. »

    ⚠️ **LE `w` EN DONNAIT LA DÉMONSTRATION, ET LA MESURE DISAIT LE CONTRAIRE.**
      Deux de ses quatre branches sortaient en cubiques, dont une en S : ses
      poignées partaient à x = 214 puis revenaient à x = 189. Redressée, cette
      branche perdait 3,3 unités de couverture — la mesure la refusait donc, et
      elle avait tort. La cause n'est pas dans la branche : c'est la POINTE du
      `w` qui porte deux brins d'axe distants de treize unités, comme la jambe
      centrale du `m`. La cubique ne suivait pas la lettre, elle compensait un
      point de départ faux, et le S est le prix de cette compensation.

    ★ **UNE DROITE N'EST PAS UNE HYPOTHÈSE, C'EST UNE DÉCLARATION**, au même
      titre que le nombre de traits ou l'endroit où le crayon se lève. La police
      donne la GÉOMÉTRIE — où passe la droite, jusqu'où elle va —, la recette dit
      QUE c'en est une. Un tracé qui serpente autour d'une droite déclarée est
      faux même quand il mesure mieux, parce qu'il fait dire à la police une
      courbure qu'elle n'a pas.

    Le compte de l'auteur le confirme lettre par lettre : `Z`, `Y`, `X`, `W`,
    `V`, `T`, `N`, `M`, `L`, `K`, `I`, `H`, `F`, `E`, `A` et leurs bas de casse
    ont tous **zéro poignée** à son budget — et ce sont exactement les signes
    dont la recette n'est faite que de `ligne` et de `chevron`.

    On garde les deux bouts du rendu — ils portent les contacts que les passes
    précédentes ont établis — et, pour chaque sommet interne déclaré, le nœud
    rendu qui en est le plus proche. Tout le reste s'en va.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.points[t] is not None or len(chem) < 1:
            continue
        sommets = _sommets_droits(pose.decl[t]['d'])
        if sommets is None or len(sommets) < 2:
            continue
        noeuds = [chem[0][0]] + [m[2] for m in chem]
        if len(noeuds) == len(sommets):
            garde = noeuds
        else:
            garde = [noeuds[0]]
            reste = list(range(1, len(noeuds) - 1))
            for s in sommets[1:-1]:
                if not reste:
                    break
                k = min(reste, key=lambda i: math.dist(noeuds[i], s))
                garde.append(noeuds[k])
                reste = [i for i in reste if i > k]
            garde.append(noeuds[-1])
        chemins[t] = [(a, [], b) for a, b in zip(garde, garde[1:])
                      if math.dist(a, b) > 1e-9]
    return chemins


def _r_epure(pose, chemins):
    """★ **LA PASSE DE NETTOYAGE — un point qui ne sert à rien s'en va.**

    > « Plusieurs lettres ont des points en trop, je pense qu'une passe de
    >   nettoyage serait utile. » (l'auteur, qui donne ensuite le nombre de
    >   points et de poignées que chacune des cinquante-deux admet au plus)

    ⚠️ **`_ajuste` REND DÉJÀ LE MINIMUM DE CUBIQUES, ET CE N'EST PAS SUFFISANT.**
      Il travaille tronçon par tronçon, avant les quinze retouches ; celles qui
      suivent recoupent, recollent et redressent, et chacune peut laisser un
      nœud dont plus personne n'a besoin. Le `w` en portait la démonstration :
      deux de ses quatre branches — QUATRE DROITES, dans toutes les fontes du
      monde — sortaient en cubiques, dont une en S de trente unités de flèche.

    Deux gestes, essayés dans cet ordre sur chaque morceau :

     · **REDRESSER** — remplacer une cubique par sa corde. C'est le geste qui
       rend au `w`, au `W`, au `V`, au `Y`, au `X` et à l'`A` leurs diagonales ;
     · **FONDRE** — remplacer deux morceaux consécutifs par un seul, ajusté aux
       mêmes tangentes de bouts. C'est celui qui retire les points en trop de
       l'`O`, du `C`, du `Q` et du `g`.

    ★ **ET LE JUGE EST CELUI DE TOUTE LA CHAÎNE : les deux mesures, et aucun
      recul.** Une épure ne doit rien acheter. Elle n'est acceptée que si la
      fidélité à l'axe ET la couverture de l'axe restent ce qu'elles étaient, à
      un dixième d'unité près — ce qui rend le redressement du `w` légitime
      (l'axe y est droit, la corde s'en RAPPROCHE) et interdit d'aplatir une
      panse au prétexte qu'elle a un point de trop.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.points[t] is not None or len(chem) < 1:
            continue                            # le point du `i`, du `j`
        # ⚠️ **`brins` EST INDEXÉ PAR CONTOUR D'AXE, PAS PAR TRAIT.** Ce que CE
        #   trait-là doit couvrir, c'est sa MESURE — la suite d'abscisses que la
        #   projection lui a attribuée, et le seul étalon dont dispose une
        #   retouche qui ne travaille que sur un trait.
        attendus = pose.mesure[t] if t < len(pose.mesure) else []

        # ① les cordes : une cubique qui ne courbe rien n'a pas à être une cubique
        for i, m in enumerate(chem):
            if not m[1]:
                continue
            avant = _note_locale(pose, [m], attendus)
            droit = (m[0], [], m[2])
            if _pas_pire(_note_locale(pose, [droit], attendus), avant):
                chem[i] = droit

        # ② les nœuds : deux morceaux qu'un seul remplace n'en font qu'un
        i = 0
        while i + 1 < len(chem):
            fondu = _fond(chem[i], chem[i + 1])
            if fondu is None:
                i += 1
                continue
            avant = _note_locale(pose, [chem[i], chem[i + 1]], attendus)
            if _pas_pire(_note_locale(pose, [fondu], attendus), avant):
                chem[i:i + 2] = [fondu]
            else:
                i += 1
    return chemins


def _pas_pire(neuve, vieille):
    return all(n <= v + JEU_EPURE for n, v in zip(neuve, vieille))


def _fond(a, b):
    """Un seul morceau à la place de deux, tangentes des bouts conservées.

    ⚠️ On ne fond QUE si un unique cubique suffit : `_cubiques` sait subdiviser,
      et une subdivision rendrait les deux morceaux qu'on voulait retirer.
    """
    if math.dist(a[2], b[0]) > 1e-6:
        return None                             # la chaîne est rompue : on ne touche à rien
    P = [evalue(a, k / 16) for k in range(16)] + [evalue(b, k / 16) for k in range(17)]
    t1 = _tangentes_de(a)[0]
    t2 = _tangentes_de(b)[1]
    if t1 == (0.0, 0.0) or t2 == (0.0, 0.0):
        return None
    bez = _cubiques(P, t1, t2, TOLERANCE)
    return bez[0] if bez and len(bez) == 1 else None


def _r_contacts(pose, chemins):
    """★ **UNE JONCTION DÉCLARÉE DOIT MORDRE — TOUTES, PAS SEULEMENT CELLES DES
      JUMELLES.**

    `_r_recollage` ne rattrapait que les traits que `_r_jumelles` venait de
    déplacer, parce que c'est là qu'on avait vu le défaut. Mais la cause n'est
    pas le jumelage : c'est que CHAQUE passe déplace des bouts, et qu'aucune ne
    vérifie ensuite si le contact que la recette annonce tient encore.

    ⚠️ Le `W` l'a montré : sa quatrième branche partait à 7,9 unités du bout de
      la troisième — moins d'un demi-fût, invisible à l'œil, et une extrémité
      libre de plus (4/3/0 au lieu de 4/2/0 pour un dessin identique à celui du
      `w`, qui, lui, tombait juste). Le contrôle du dépôt ne mordait pas
      dessus : il interdisait d'INVENTER un contact, pas d'en PERDRE un.

    On repasse donc sur tous les traits en dernier, avec exactement le même
    geste mesuré qu'aux jumelles : on ramène le bout jusqu'à la moitié de la
    tolérance du moteur, pas dessus, pour ne pas payer en écart à l'axe ce
    qu'on gagne en comptage.
    """
    chemins = [list(c) for c in chemins]
    _recolle(chemins, pose.cibles, pose.attendus, set(range(len(chemins))))
    return chemins


#: ★ **LE BUDGET DE POINTS DE CHAQUE SIGNE, dicté par l'auteur** — rempli par
#: `_recettes`, qui le lit dans `jetbrains-traces.py` où il est déclaré à côté
#: des recettes. Une passe qui recoupe une courbe s'y mesure : c'est lui qui dit
#: si elle a le droit d'ajouter un nœud, et non le tracé qu'elle remplace.
BUDGET = {}


def _compte(chemins):
    """Nœuds DISTINCTS et poignées d'un jeu de traits — le compte de l'auteur."""
    noeuds, poignees = set(), 0
    for chem in chemins:
        for m in chem:
            noeuds.add(('%.1f,%.1f' % m[0], ))
            noeuds.add(('%.1f,%.1f' % m[2], ))
            poignees += len(m[1])
    return len(noeuds), poignees


#: Un nœud à moins d'un demi-fût d'un extremum du guide EST cet extremum.
PRES_SOMMET = 0.5 * FUT


def _cardinale(ancre, poignee):
    """La poignée rabattue sur l'horizontale ou la verticale, longueur gardée."""
    dx, dy = poignee[0] - ancre[0], poignee[1] - ancre[1]
    L = math.hypot(dx, dy)
    if L < 1e-9:
        return poignee
    if abs(dx) >= abs(dy):
        return (ancre[0] + math.copysign(L, dx), ancre[1])
    return (ancre[0], ancre[1] + math.copysign(L, dy))


def _rebati(m, depart, arrivee, t1, t2):
    """Le même morceau, mais partant et finissant ailleurs — poignées refaites."""
    P = [evalue(m, k / 24) for k in range(25)]
    P[0], P[-1] = depart, arrivee
    if t1 == (0.0, 0.0) or t2 == (0.0, 0.0):
        return None
    bez = _cubiques(P, t1, t2, TOLERANCE)
    return bez[0] if bez and len(bez) == 1 else None


def _r_sommets(pose, chemins):
    """★ **UN NŒUD DE COURBE SE POSE SUR LE SOMMET, PAS À CÔTÉ.**

    ⚠️ **ET IL NE SUFFIT PAS D'AJOUTER UNE COUPURE À CHAQUE EXTREMUM : mesuré,
      c'est un RECUL.** Rendre `_extremes` inconditionnel faisait passer les
      lettres hors budget de trois à six et le `a` de 7,4 à 8,5 — parce qu'on
      coupait EN PLUS là où l'ajustement coupait déjà, et que deux nœuds voisins
      ne se refondent pas. Ce qu'il faut n'est pas un nœud de plus : c'est le
      nœud existant, au bon endroit.

    Le `c` avait le sien à (122 ; 353) quand son flanc gauche culmine vers
    (108 ; 226) : quatorze unités à côté, et une poignée à quatorze degrés d'un
    axe — obliquement, donc, sur une panse où l'auteur n'admet que des
    verticales. On déplace le nœud sur le sommet et l'on REFAIT les poignées des
    deux morceaux voisins : sans quoi on tirerait la courbe au lieu de la
    recaler.

    Le juge reste le même : deux mesures, aucun recul.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.points[t] is not None or len(chem) < 2:
            continue
        sommets = pose.sommets[t]
        if not sommets:
            continue
        attendus = pose.mesure[t] if t < len(pose.mesure) else []
        for i in range(len(chem) - 1):
            a, b = chem[i], chem[i + 1]
            if not a[1] and not b[1]:
                continue                        # un coin entre deux droites
            noeud = a[2]
            cible = min(sommets, key=lambda s: math.dist(noeud, s))
            d = math.dist(noeud, cible)
            if d < 1.0 or d > PRES_SOMMET:
                continue
            na = _rebati(a, a[0], cible, *_tangentes_de(a)) if a[1] else (a[0], [], cible)
            nb = _rebati(b, cible, b[2], *_tangentes_de(b)) if b[1] else (cible, [], b[2])
            if na is None or nb is None:
                continue
            if _pas_pire(_note_locale(pose, [na, nb], attendus),
                         _note_locale(pose, [a, b], attendus)):
                chem[i], chem[i + 1] = na, nb
    return chemins


def _cap(mes, k, pas=4):
    """La direction de la mesure autour de son point `k`."""
    a = mes[max(0, k - pas)]
    b = mes[min(len(mes) - 1, k + pas)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    return (dx / n, dy / n) if n > 1e-9 else None


def _un_cubique(P, t1, t2):
    """LE cubique d'un quadrant — un seul, jamais deux.

    ⚠️ **`_cubiques` EN RENDAIT TROIS PAR QUADRANT, et il avait ses raisons :**
      il subdivise tant que la courbe n'est pas à sa tolérance des points
      RELEVÉS, et un quart de panse relevée serpente de cinq unités. Mais ici on
      ne cherche pas à coller au relevé : on cherche l'arc qu'un dessinateur
      aurait tracé entre deux sommets, et il n'y en a qu'un. La subdivision est
      précisément ce qu'on veut interdire — c'est elle qui pose les nœuds au
      milieu des quadrants, là où les poignées deviennent obliques.
    """
    u = _parametres(P)
    bez = _moindres_carres(P, u, t1, t2)
    for _ in range(6):
        u = _reparametre(P, bez, u)
        bez = _moindres_carres(P, u, t1, t2)
    return bez


def _r_quadrants(pose, chemins):
    """★ **UNE COURBE SE COUPE À SES SOMMETS, ET NULLE PART AILLEURS.**

    ⚠️ **LE `c` N'AVAIT AUCUN NŒUD SUR SON SOMMET GAUCHE — il en avait DEUX
      AUTOUR.** Son flanc culmine à (106 ; 243) ; le tracé posait ses nœuds à
      (122 ; 353) et (120 ; 110), soit à cent unités de part et d'autre. Chacun
      tombant au milieu d'un quadrant, sa tangente y était légitimement OBLIQUE —
      quatorze degrés — et aucune passe ne pouvait la rabattre sans mentir. Le
      défaut n'était pas dans les poignées, il était dans l'endroit où l'on
      coupe : l'ajustement coupe là où son erreur est maximale, un dessinateur
      coupe aux sommets.

    On reconstruit donc chaque trait courbe sur les nœuds que la lettre dicte —
    ses deux bouts et ses extrema — avec, à chaque sommet, la tangente cardinale
    qui lui revient : horizontale à un sommet de hauteur, verticale à un sommet
    de flanc. Entre deux nœuds, un cubique ajusté sur la mesure ; deux si la
    mesure l'exige, et c'est alors que la lettre le demande.

    ★ Le budget de l'auteur se lit comme une description de ce découpage : `o`
      et `c` à quatre nœuds et quatre poignées doubles, c'est l'ovale en quatre
      quadrants que toutes les fontes dessinent.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.points[t] is not None or not chem:
            continue
        if _sommets_droits(pose.decl[t]['d']) is not None:
            continue                            # une polyligne n'a pas de quadrant
        # ⚠️ **LES BOUCLES ATTENDENT ENCORE, ET LA CAUSE EST NOMMÉE.** La mesure
        #   d'un trait fermé n'est pas lue CYCLIQUEMENT : ses deux bouts sont
        #   deux points distincts — (259,2 ; −8,6) et (237,8 ; −8,9) pour l'`O` —
        #   et le sommet qui tombe près de cette couture échappe à `_extremums`,
        #   qui s'interdit les quatre premiers et derniers indices. Il manque
        #   donc le BAS de l'ovale, et les quatre quadrants reconstruits sortent
        #   à 18,5 au lieu de 4,3. Ce n'est pas un réglage à trouver, c'est une
        #   lecture cyclique à écrire — et tant qu'elle ne l'est pas, l'`O`,
        #   l'`o`, le `g` et le `Q` gardent leurs poignées obliques.
        if pose.fermes[t] or pose.decl[t].get('couture'):
            continue
        mes = pose.mesure[t] if t < len(pose.mesure) else []
        som = pose.sommets[t]
        if len(mes) < 8 or not som:
            continue
        coupes = {0, len(mes) - 1}
        cardinal = {}
        for s in som:
            k = min(range(len(mes)), key=lambda i: math.dist(mes[i], s))
            if not (3 < k < len(mes) - 4):
                continue
            u = _cap(mes, k)
            if u is None:
                continue
            coupes.add(k)
            cardinal[k] = (math.copysign(1.0, u[0]), 0.0) if abs(u[0]) >= abs(u[1]) \
                else (0.0, math.copysign(1.0, u[1]))
        coupes = sorted(coupes)
        if len(coupes) < 3:
            continue                            # aucun sommet à imposer
        # ⚠️ **AJUSTER À UNE UNITÉ ENTRE DEUX SOMMETS, C'EST SUIVRE LE BRUIT.**
        #   `_cubiques` subdivise tant qu'il n'atteint pas sa tolérance : sur la
        #   mesure du `c`, qui serpente de cinq unités, il rendait QUINZE
        #   morceaux pour trois. On lui donne donc pour plafond l'écart que le
        #   trait a DÉJÀ — on ne cherche pas mieux que ce qu'on remplace, on
        #   cherche la même chose avec les nœuds au bon endroit.
        actuelle = _note_locale(pose, chem, mes)
        tol = max(TOLERANCE, actuelle[0])
        neuf = []
        for a, b in zip(coupes, coupes[1:]):
            P = mes[a:b + 1]
            if len(P) < 3:
                neuf = None
                break
            t1 = cardinal.get(a) or _cap(mes, a)
            t2 = cardinal.get(b) or _cap(mes, b)
            if t1 is None or t2 is None:
                neuf = None
                break
            t2 = (-t2[0], -t2[1])          # elle regarde vers l'intérieur
            bez = _un_cubique(P, t1, t2)
            if bez is None:
                neuf = None
                break
            neuf.append(bez)
        # ★ **ET C'EST LE BUDGET DE L'AUTEUR QUI DIT SI L'ON A LA PLACE.** Le
        #   `c` sortait en trois morceaux, quatre points : recoupé à ses trois
        #   sommets il en fait quatre, cinq points — et son budget en admet six.
        #   Comparer au tracé qu'on remplace interdisait la seule correction
        #   possible ; comparer au budget la permet là où elle tient, et la
        #   refuse là où elle déborderait.
        if not neuf:
            continue
        essai = list(chemins)
        essai[t] = neuf
        # ⚠️ **UN BUDGET ABSENT VALAIT `(0, 0)`, ET DÉSACTIVAIT LA PASSE EN
        #   SILENCE.** Tout tracé dépasse zéro nœud : la reconstruction était
        #   refusée pour les cinquante-deux signes sans qu'aucune passe n'échoue
        #   ni qu'aucun message ne paraisse. C'est très exactement la dégradation
        #   silencieuse que le dépôt refuse partout ailleurs — et elle se serait
        #   déclenchée au premier appel de `traits()` hors de `main`, puisque
        #   c'est `_recettes()` qui remplit la table.
        if pose.ch not in BUDGET:
            raise SystemExit('jetbrains-axe : aucun budget pour « %s ». Il se déclare '
                             'dans `jetbrains-traces.py › BUDGET`, et sans lui la passe '
                             'des quadrants ne peut rien décider.' % pose.ch)
        mp, mh = BUDGET[pose.ch]
        pts, poi = _compte(essai)
        if pts > mp or poi > mh:
            continue
        # ★ Les BOUTS restent ceux du tracé : les passes précédentes les ont
        #   taillés à leurs rencontres, et la mesure, elle, va d'un bord à l'autre.
        # ⚠️ **SAUF SUR UNE BOUCLE, où le « bout » n'est qu'une COUTURE.** L'`O`
        #   la porte à (166,7 ; 14,1) quand sa mesure commence à (259,2 ; −8,6) :
        #   y forcer le départ de la reconstruction tordait l'anneau entier, et
        #   les quatre quadrants sortaient à 49 unités au lieu de 4,3. Une boucle
        #   n'a pas de bouts à préserver — elle a un tour à fermer.
        neuf[0] = (chem[0][0], neuf[0][1], neuf[0][2])
        neuf[-1] = (neuf[-1][0], neuf[-1][1], chem[-1][2])
        # ★ **ICI, ET ICI SEULEMENT, ON ACCEPTE DE PERDRE UN PEU SUR UNE MESURE.**
        #   Le `c` recoupé à ses sommets gagne 2,6 unités de couverture et en
        #   perd 0,9 de fidélité : le juge habituel — aucun recul, nulle part —
        #   le refuse, et il a tort de le refuser. Couper aux sommets n'est pas
        #   un compromis de mesure, c'est une CONVENTION DE DESSIN, celle que
        #   toutes les fontes suivent et que l'auteur réclame nommément (« aucune
        #   poignée oblique »). On exige donc que la somme des deux mesures
        #   s'améliore, et qu'aucune ne recule de plus d'une unité et demie —
        #   un quart de la tolérance du moteur, ce que l'œil ne distingue pas.
        neuve = _note_locale(pose, neuf, mes)
        if sum(neuve) < sum(actuelle) - JEU_EPURE \
                and all(n <= v + JEU_QUADRANT for n, v in zip(neuve, actuelle)):
            chemins[t] = neuf
    return chemins


def _r_cardinales(pose, chemins):
    """★ **AUX EXTREMA, LES POIGNÉES SONT HORIZONTALES OU VERTICALES.**

    > « q, p, d, b : poignées simples verticales, poignées symétriques
    >   horizontales, AUCUNE poignée oblique. » — « G : aucune poignée en
    >   diagonale. » — « c : poignées simples uniquement verticales, si poignées
    >   doubles : uniquement symétriques horizontales. » (l'auteur)

    C'est la convention de tous les dessinateurs de fontes, et JetBrains Mono la
    suit : un nœud se pose au point le plus haut, le plus bas, le plus à gauche
    ou le plus à droite d'une courbe, et la tangente y est nécessairement
    perpendiculaire à cette direction-là. Une poignée oblique à un extremum ne
    dit donc rien de la lettre — elle dit que l'ajustement a placé son nœud à
    côté du sommet, ou qu'il a laissé filer la tangente de quelques degrés.

    ⚠️ **ET SEULEMENT AUX EXTREMA.** Le `s` et le `S` ont un nœud central que
      l'auteur veut justement OBLIQUE — « point central avec poignées symétriques
      obliques » —, parce que c'est le point d'inflexion de la panse et non un
      sommet. On ne rabat donc que ce qui est à moins d'un demi-fût d'un extremum
      lu sur le guide, et l'on garde le reste tel quel.

    Le juge est celui de toute la chaîne : deux mesures, aucun recul.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.points[t] is not None or not chem:
            continue
        sommets = pose.sommets[t]
        if not sommets:
            continue
        attendus = pose.mesure[t] if t < len(pose.mesure) else []
        for i, m in enumerate(chem):
            if len(m[1]) != 2:
                continue
            neuf = list(m[1])
            for k, ancre in ((0, m[0]), (1, m[2])):
                if min(math.dist(ancre, s) for s in sommets) > PRES_SOMMET:
                    continue
                neuf[k] = _cardinale(ancre, m[1][k])
            candidat = (m[0], neuf, m[2])
            if candidat[1] != list(m[1]) and _pas_pire(
                    _note_locale(pose, [candidat], attendus),
                    _note_locale(pose, [m], attendus)):
                chem[i] = candidat
    return chemins


#: ★ **JUSQU'OÙ DEUX BOUTS SE SOUDENT.** `TOL` — six unités — suffisait tant
#: qu'on ne traitait qu'une police dont les recettes posaient déjà les contacts
#: à portée du moteur. ⚠️ Le `Y` de Jost l'a démenti : sa queue partait à 9,2
#: unités du sommet de son chevron, assez peu pour que `deriveGlyph` compte
#: quand même le contact — donc sans qu'aucun garde-fou ne rougisse — et assez
#: pour que l'œil voie un décrochement. « Il y a un problème d'alignement sur le
#: Y » (l'auteur). On prend donc le seuil que `_recolle` utilise déjà, un
#: demi-fût : ce que le recollage amène à portée, la soudure achève de poser.
PORTEE_SOUDURE = 0.5 * FUT


def _r_soude(pose, chemins):
    """★ **DEUX BOUTS QUI SE TOUCHENT SONT UN POINT, PAS DEUX.**

    `_r_contacts` amène un bout à moins de trois unités de son voisin : le moteur
    compte alors le contact, et c'est tout ce qu'on lui demandait. Mais l'ŒIL,
    lui, voit deux nœuds — et le budget de l'auteur les compte : le `W` sortait à
    sept points pour cinq admis, parce que sa troisième branche finissait à
    (353,8 ; 4,0) et la quatrième commençait à (353,4 ; 7,0). Le `E` en avait
    huit pour six, pour une unité d'écart entre le sommet de son fût et le
    départ de sa barre.

    On les pose donc au MÊME point, à mi-chemin : chacun bouge de la moitié d'un
    écart déjà inférieur à la tolérance, ce qui coûte au pire une unité et demie
    et ne peut pas défaire un contact — il devient exact.

    ⚠️ Bout à BOUT seulement. La barre médiane du `E` touche le fût en plein
      milieu : il n'y a là qu'un seul nœud, et rien à souder.
    """
    chemins = [list(c) for c in chemins]

    def bout(t, fin):
        chem = chemins[t]
        return chem[-1][2] if fin else chem[0][0]

    def pose_bout(t, fin, p):
        chem = chemins[t]
        if fin:
            chem[-1] = (chem[-1][0], chem[-1][1], p)
        else:
            chem[0] = (p, chem[0][1], chem[0][2])

    vus = set()
    for j in pose.jonctions:
        a, b = int(j[0]), int(j[1])
        if not (0 <= a < len(chemins) and 0 <= b < len(chemins)):
            continue
        if pose.fermes[a] or pose.fermes[b] or not chemins[a] or not chemins[b]:
            continue
        if pose.points[a] is not None or pose.points[b] is not None:
            continue
        choix = None
        for fa in (False, True):
            for fb in (False, True):
                if (a, fa) in vus or (b, fb) in vus:
                    continue
                d = math.dist(bout(a, fa), bout(b, fb))
                if d < PORTEE_SOUDURE and (choix is None or d < choix[0]):
                    choix = (d, fa, fb)
        if choix is None:
            # ★ **UN BOUT PEUT REJOINDRE UN NŒUD, PAS SEULEMENT UN AUTRE BOUT.**
            #   La queue du `Y` arrive sur le SOMMET de son chevron, qui est un
            #   point interne du trait voisin : aucun couple bout-à-bout n'était
            #   donc candidat, et les deux restaient à 9,2 unités l'un de
            #   l'autre. Assez peu pour que `deriveGlyph` compte quand même le
            #   contact — donc sans qu'aucun garde-fou ne rougisse — et assez
            #   pour que l'œil voie un décrochement. « Il y a un problème
            #   d'alignement sur le Y » (l'auteur).
            #   On pose alors le bout SUR le nœud, et non à mi-chemin : le nœud
            #   appartient à un trait qui ne demande rien, c'est au bout libre de
            #   venir. La barre médiane du `E`, elle, ne bouge pas — le fût n'a
            #   aucun nœud à sa hauteur, et le plus proche est à trois cents
            #   unités, très au-delà du seuil.
            for x, y in ((a, b), (b, a)):
                noeuds = [chemins[y][0][0]] + [m[2] for m in chemins[y]]
                for fx in (False, True):
                    if (x, fx) in vus:
                        continue
                    px = bout(x, fx)
                    cible = min(noeuds, key=lambda q: math.dist(px, q))
                    d = math.dist(px, cible)
                    if 1e-9 < d < PORTEE_SOUDURE:
                        pose_bout(x, fx, cible)
                        vus.add((x, fx))
                        break
            continue
        _, fa, fb = choix
        pa, pb = bout(a, fa), bout(b, fb)
        milieu = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        pose_bout(a, fa, milieu)
        pose_bout(b, fb, milieu)
        vus.add((a, fa))
        vus.add((b, fb))
    return chemins


def _r_couture(pose, chemins):
    """★ **ET LA COUTURE SE POSE EN DERNIER**, quand on sait enfin où sont les
    deux bouts de la panse : un segment droit du dernier point au premier.

    > « Sans chercher à éviter l'angle » (l'auteur)

    Il n'y a rien à lisser, ce segment ne dessine pas, il ferme. Il vient APRÈS
    toutes les autres : une passe de tangence ou de fusion qui le prendrait pour
    du dessin déplacerait les deux bouts de la panse pour l'accorder au fût.
    """
    chemins = [list(c) for c in chemins]
    for t, chem in enumerate(chemins):
        if pose.decl[t].get('couture') and len(chem) >= 2 \
                and math.dist(chem[-1][2], chem[0][0]) > 1e-9:
            chem.append((chem[-1][2], [], chem[0][0]))
    return chemins


#: ★ **L'ORDRE DES RETOUCHES, ÉCRIT PLUTÔT QUE SUBI.**
#:
#:  · on nettoie les coins AVANT de tailler, pour que la taille voie de vrais
#:    morceaux et non les moignons de la projection ;
#:  · les jumelles passent avant la taille — les deux arches du `m` doivent
#:    arriver identiques au carrefour pour y recevoir le même geste ;
#:  · on taille aux jonctions, ce qui recrée des moignons au ras du carrefour —
#:    c'est le « doublon » de l'épaule du `n` — d'où le second nettoyage ;
#:  · la tangence vient APRÈS la fusion et le redressement, jamais avant : elle
#:    se calait sinon sur une droite que les passes suivantes redressaient
#:    encore, et « le dernier mot revient à la géométrie FINALE » ;
#:  · le point du `i` et du `j` se pose une fois les hampes fixées ;
#:  · les jumelles se rejouent EN DERNIER, pour la même raison que la tangence,
#:    et `recollage` rattrape le contact que ce déplacement pouvait rompre ;
#:  · la couture ferme la panse quand plus rien ne bougera.
RETOUCHES = [
    ('coins', _r_coins),
    ('jumelles', _r_jumelles),
    ('jonctions', _r_jonctions),
    ('fusion', _r_fusion),
    ('coins', _r_coins),
    ('tangence', _r_tangence),
    ('alignées', _r_alignees),
    ('symétrie', _r_symetrie),
    ('point', _r_point),
    ('bouts', _r_bouts),
    ('coins', _r_coins),
    ('recousu', _r_recousu),
    ('tangence', _r_tangence),
    ('jumelles', _r_jumelles),
    ('recollage', _r_recollage),
    # ⚠️ **L'ÉPURE PASSE AVANT LES CONTACTS, ET C'EST L'ORDRE QUI COMPTE.**
    #   Retirer un nœud déplace le bout du morceau voisin ; si le recollage était
    #   déjà passé, la jonction qu'il venait d'assurer serait rompue. On nettoie,
    #   PUIS on recolle, puis on ferme.
    # ★ Les cardinales AVANT l'épure : une fonte de deux morceaux reprend les
    #   tangentes de leurs bouts, et deux bouts déjà rabattus sur l'horizontale
    #   ou la verticale donnent le cubique qu'un dessinateur aurait tracé. Après,
    #   pour rattraper les nœuds que la fonte vient de déplacer.
    ('sommets', _r_sommets),
    ('quadrants', _r_quadrants),
    ('cardinales', _r_cardinales),
    ('polyligne', _r_polyligne),
    ('épure', _r_epure),
    ('cardinales', _r_cardinales),
    ('contacts', _r_contacts),
    # ★ La soudure vient APRÈS le recollage : celui-ci amène le bout à portée du
    #   moteur, celle-là le pose exactement dessus. L'un compte, l'autre se voit.
    ('soude', _r_soude),
    ('couture', _r_couture),
]


#: Ce qu'un brin d'axe doit peser pour qu'on exige qu'il soit couvert : quatre-
#: vingts unités d'étendue. En deçà, c'est le point du `i` ou du `j`.
ETENDUE_BRIN = 80.0

#: Un point tous les deux unités le long du tracé rendu. ⚠️ **SANS ÇA, LES
#: TRAITS DROITS ÉCHAPPENT À LA MESURE** : douze échantillons sur une hampe de
#: cinq cents unités, c'est un point tous les quarante, et l'axe qui passe entre
#: deux d'entre eux se croit à vingt unités d'un trait qu'il touche. Le `l`
#: sortait alors à 21,1 de couverture pour 4,3 réelles.
PAS_RENDU = 2.0


def _densifie(chemins):
    """Le tracé rendu, en points espacés de `PAS_RENDU` — de quoi mesurer une
    distance À un tracé et non à ses seuls nœuds."""
    out = []
    for chem in chemins:
        for m in chem:
            L = math.dist(m[0], m[2]) + sum(
                math.dist(a, b) for a, b in zip((m[0],) + tuple(m[1]),
                                                tuple(m[1]) + (m[2],)))
            n = max(2, int(L / PAS_RENDU) + 1)
            out += [evalue(m, k / n) for k in range(n + 1)]
    return out

#: Le jeu qu'on laisse à une variante avant de dire qu'elle RECULE : un dixième
#: d'unité sur six cents. « Ne t'autorise pas “c'est presque pareil” » — c'est
#: donc à peine plus que le bruit de la mesure elle-même.
JEU_MESURE = 0.1


def _domine(neuf, vieux):
    """La variante `neuf` est-elle meilleure SANS reculer nulle part ?

    ★ **DEUX MESURES, ET IL FAUT LES DEUX.** Un tracé qui ne couvre rien est
      parfaitement noté par la seule fidélité ; un tracé qui couvre tout en
      passant à côté est parfaitement noté par la seule couverture. On n'accepte
      une variante que si elle ne recule sur AUCUNE des deux et progresse sur au
      moins une.
    """
    if any(n > v + JEU_MESURE for n, v in zip(neuf, vieux)):
        return False
    return any(n < v - JEU_MESURE for n, v in zip(neuf, vieux))


def traits(ch, recette, points_du_trace, journal=None, trace=False):
    """Les traits DÉCLARÉS par `recette`, reposés sur l'axe EXACT de `ch`.

    ★ **LES BORNES LUES DANS LA SOURCE : ON MESURE, PUIS ON TRANCHE.** (idée de A)
      La recette dit QU'il y a une droite ; elle dit mal OÙ elle finit, et elle
      ne dit rien des bornes qu'elle n'a pas vues — les deux flancs droits de
      l'`o`, qu'aucun arc de recette ne peut annoncer. La marque `L`/`C` que le
      nuage porte depuis `_plat`, elle, les donne (`_frontieres`), et les
      rebroussements se lisent sur la mesure (`_extremes`).

    ⚠️ **MAIS ELLES NE VALENT PAS PARTOUT, ET C'EST MESURÉ.** Appliquées à toutes
      les lettres, elles rendent le `p` de 7,0 à 3,6, le `q` de 6,3 à 3,5, le `f`
      de 4,1 à 0,9 — et elles ABÎMENT le `a` (7,6 → 9,1), le `c` (couverture 7,2
      → 16,8), l'`o` et le `s`. Le pire de l'alphabet passait de 7,6 à 9,1 :
      c'est un recul, et un recul ne se garde pas.

    ★ On pose donc la lettre DEUX FOIS — c'est le geste que `projette` fait déjà
      pour le recalage sur les plis — et l'on ne garde la seconde que si elle ne
      recule sur AUCUNE des deux mesures. Aucune lettre ne peut alors être moins
      bonne qu'elle ne l'était ; huit le deviennent nettement plus.

    ★ **ET DEPUIS, UNE SECONDE QUESTION SE POSE DE LA MÊME FAÇON : COMBIEN
      D'ABSCISSES ?** Un compte fixe donne dix-sept unités par abscisse au pire
      bas de casse et quarante au `W` — le sommet d'un fût y tombe au milieu d'un
      seau. Les compter à la LONGUEUR corrige cela, et abîme ailleurs
      (`_echelonne`). Deux questions indépendantes, donc quatre poses par signe,
      et le même juge : on garde la meilleure qui ne recule sur AUCUNE des deux
      mesures.
      · « `npm run glyphes` passerait de quatre à huit minutes. » — « Aucune
        importance, tu peux le faire. » (l'auteur)
    """
    reference, essais = None, []
    for lues in (False, True):
        for densite in (False, True):
            p = Pose(ch, recette, points_du_trace, trace, lues=lues, densite=densite)
            c = p.applique(p.ajuste(p.projette()))
            note = (p.ecart(c), p.couverture(c))
            if reference is None:
                reference = note
            essais.append((note, lues, densite, p, c))

    # ⚠️ **« MEILLEURE » NE SE DÉCIDE PAS ENTRE VARIANTES, MAIS CONTRE LA
    #   RÉFÉRENCE.** Trois essais dominent peut-être chacun le premier sans se
    #   dominer entre eux — l'un gagne en fidélité, l'autre en couverture. On
    #   part donc du réglage nu et l'on n'accepte qu'un essai qui l'améliore sans
    #   reculer ; à égalité de mérite, le premier trouvé, ce qui rend le choix
    #   déterministe et non dépendant de l'ordre des boucles.
    choix = essais[0]
    for essai in essais[1:]:
        if _domine(essai[0], choix[0]):
            choix = essai
    note, lues, densite, pose, chemins = choix
    if trace:
        print('  %s · %s — nu %.1f/%.1f · retenu %.1f/%.1f (fidélité/couverture)'
              % (ch,
                 ('bornes lues' if lues else 'bornes déclarées')
                 + (' + abscisses à la longueur' if densite else ''),
                 reference[0], reference[1], note[0], note[1]))
    if journal is not None:
        journal.append((note[0], note[1], ch, lues))
    return pose.rendu(chemins)


# ═══════════════════════════════════════════════════════════════════════════

def _recettes():
    import importlib.util as iu
    nom = TRACES.stem.replace('-', '_')
    sp = iu.spec_from_file_location(nom, str(TRACES))
    mod = iu.module_from_spec(sp)
    sys.modules[nom] = mod
    argv, sys.argv = sys.argv, [sys.argv[0]]
    sp.loader.exec_module(mod)
    sys.argv = argv
    global BUDGET
    BUDGET = mod.BUDGET
    return mod.recettes(mod.mesures()), mod.points_du_trace


def deroule(lettres):
    """★ **REGARDER LA CHAÎNE TRAVAILLER, PASSE PAR PASSE.**

    `python3 src/gfx/jetbrains-axe.py --passes tl` déroule le tableau pour le
    `t` et le `l` : après chaque retouche, le nombre de morceaux et l'écart à
    l'axe, puis le tracé rendu. C'est l'outil qui manquait — sans lui, on
    n'attribue un défaut qu'à la SOMME des passes, et l'on corrige au hasard
    celle qu'on soupçonne.
    """
    rec, points_du_trace = _recettes()
    for ch in lettres:
        if ch not in rec:
            print('  %s : aucune recette' % ch)
            continue
        for x in traits(ch, rec[ch], points_du_trace, trace=True)[0]:
            print('    %s = %s' % (ch, x['d']))


def _jonctions(jonc):
    """Les jonctions au format de `moteur/tables/glyphes.js`, LIBELLÉS COMPRIS.

    ★ **LE TROISIÈME ÉLÉMENT NE SERT À AUCUN CALCUL, ET IL EST INDISPENSABLE.**
      `deriveGlyph` l'ignore ; un lecteur, non. Le `B` déclare quatre jonctions
      dont deux paires identiques — `[0, 1], [0, 1]` — et c'est justement cette
      répétition qui FERME une boucle. Sans « haut » et « taille » à côté, la
      ligne se lit comme une faute de frappe. Les recettes les portent depuis
      toujours ; cette sortie-ci les jetait.
    """
    return '[' + ', '.join(
        ('[%d, %d, %r]' % (int(j[0]), int(j[1]), j[2])) if len(j) > 2
        else ('[%d, %d]' % (int(j[0]), int(j[1])))
        for j in jonc) + ']'


def adopter(poses):
    """Poser les traits relevés DANS LA TABLE DU MOTEUR — `--adopter`.

    ⚠️ **CE GESTE N'EST PAS DANS `npm run glyphes`, ET C'EST VOULU.** Regénérer
      l'axe ne coûte rien : personne ne le lit qu'à travers `glyphes.html`.
      Repeindre `moteur/tables/glyphes.js`, si : trois opérateurs du catalogue
      facturent les traits, les extrémités et les boucles de ces tracés, si bien
      qu'un dessin plus juste DÉPLACE des scores. L'adoption reste donc un
      arbitrage explicite — « applique déjà l'état courant comme glyphes
      retenues » (l'auteur) — et non l'effet de bord d'un build.

    On ne réécrit que le bloc borné par les deux marqueurs : l'en-tête du
    fichier, la tolérance, les métriques et le gel restent écrits à la main,
    parce qu'ils énoncent un CONTRAT et non une géométrie.
    """
    # ⚠️ **UNE VARIANTE À L'ÉTUDE N'ADOPTE PAS, ET LE REFUS EST ICI.** Le
    #   marqueur écrit dans `glyphes.js` nomme la chaîne qui l'a posé ; une
    #   chaîne dérivée (Jost) porterait un autre nom de cible et ne doit même pas
    #   pouvoir essayer. L'arbitrage appartient à l'auteur, pas à un `--adopter`
    #   qu'on aurait tapé dans le mauvais terminal.
    if CIBLE.name != '_glyphes-axe.js':
        raise SystemExit(
            '--adopter est réservé à la chaîne de référence : %s n’est qu’une '
            'variante à l’étude, son adoption est un arbitrage d’auteur'
            % CIBLE.name)
    ouvre = '// ⟨engendré par src/gfx/jetbrains-axe.py --adopter⟩'
    ferme_ = '// ⟨/engendré⟩'
    texte = TABLE.read_text()
    i0, i1 = texte.find(ouvre), texte.find(ferme_)
    if i0 < 0 or i1 < 0:
        raise SystemExit('marqueurs absents de %s' % TABLE)

    def bloc(ch):
        t, jonc = poses[ch]
        corps = ',\n      '.join(
            ('t(%s)' if x['ouvert'] else 'ferme(%s)') % _js(x['d']) for x in t)
        return ('  %s: {\n    traits: [\n      %s,\n    ],\n    jonctions: %s,\n  },'
                % (ch, corps, _jonctions(jonc)))

    corps = ['  // ─── CAPITALES ' + '─' * 60]
    corps += [bloc(c) for c in CAPITALES if c in poses]
    corps += ['', '  // ─── BAS DE CASSE ' + '─' * 57]
    corps += [bloc(c) for c in BAS_DE_CASSE if c in poses]
    TABLE.write_text(texte[:i0] + ouvre + '\n' + '\n'.join(corps) + '\n  '
                     + texte[i1:])
    print('  → src/moteur/tables/glyphes.js (%d glyphes ADOPTÉS)' % len(poses))


def _js(s):
    """Une chaîne littérale JavaScript entre apostrophes simples."""
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    if '--passes' in sys.argv:
        i = sys.argv.index('--passes')
        return deroule(sys.argv[i + 1] if i + 1 < len(sys.argv) else BAS_DE_CASSE)
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
    # ★ **LES CAPITALES PASSENT PAR LA MÊME CHAÎNE, SANS UNE LIGNE DE PLUS.**
    #   `AXES` les couvrait déjà ; il ne leur manquait que des recettes, et
    #   `jetbrains-traces.py` en a désormais vingt-six. Ce qui suit — projection,
    #   ajustement, les quinze retouches — ne sait pas quelle casse il traite.
    poses = {ch: traits(ch, rec[ch], points_du_trace, ecarts)
             for ch in BAS_DE_CASSE + CAPITALES if ch in rec}

    # ★ **CE QUE LA POSE COÛTE, LETTRE PAR LETTRE — ET IL FAUT DEUX CHIFFRES.**
    #   `AXES` est exact ; `TRAITS` est projeté, et l'écart entre les deux dit ce
    #   que la projection a perdu. Mais la FIDÉLITÉ seule (du tracé vers l'axe)
    #   note parfaitement un tracé qui ne couvre rien — c'est ainsi qu'une barre
    #   de `z` amputée de vingt-cinq unités a passé toutes les mesures. La
    #   COUVERTURE (de l'axe vers le tracé) est l'autre moitié, et elle est
    #   désormais bornée par `src/app/glyphes.test.js`.
    # ⚠️ **CE QUI RESTE N'EST PLUS UN DÉFAUT DE POSE : C'EST UN PLANCHER, et il
    #   tient à ce qu'un squelette FAIT à un carrefour.** Trois signes butent
    #   dessus, et il vaut mieux le nommer que d'y user des passes :
    #
    #    · le `X` (9,4) — deux traits qui se croisent ne donnent pas un squelette
    #      en croix mais en H : l'encre du carrefour est un losange, dont le
    #      médian remonte à (251 ; 327) quand les diagonales se coupent à
    #      (246 ; 305). Vingt-deux unités de pont, qu'aucune projection ne peut
    #      ignorer puisque ses deux moitiés sont exactement parallèles aux deux
    #      diagonales — le filtre de tangente les attribue donc, à juste titre ;
    #    · le `r` (20,3 de couverture) — à la naissance de l'épaule, l'encre
    #      s'élargit et le milieu part à gauche, jusqu'à x = 108,7 pour un fût
    #      posé à 129,0. L'axe a RAISON — c'est bien le médian —, et c'est la
    #      couverture qui exige trop : ce renflement n'appartient ni au fût ni à
    #      l'épaule, et une lecture en deux traits ne peut pas le rendre ;
    #    · le `m` (17,7) — sa jambe centrale porte DEUX brins, à 240,2 et 253,0,
    #      parce que deux traits y fondent leur encre sans que le repliage y
    #      ramène un brin unique. Douze unités et demie d'écart, par
    #      construction, avant qu'on ait posé quoi que ce soit.
    #
    #   Les trois ont la même forme : l'axe médian d'un RACCORD n'est le tracé
    #   d'aucun des traits qui s'y raccordent. On les mesure, on les borne
    #   (`glyphes.test.js`, 20 et 24 unités), et l'on n'essaie pas de les faire
    #   descendre en tordant un tracé juste.
    print('  fidélité (tracé→axe) et couverture (axe→tracé), en unités du '
          'moteur (capitale = 600) :')
    for pire, cov, ch, lues in sorted(ecarts):
        print('    %s %5.1f %5.1f %s%s'
              % (ch, pire, cov, '·' * min(30, int(max(pire, cov))),
                 '  ← bornes lues dans la source' if lues else ''))
    print('    pire %5.1f %5.1f · bornes lues gardées sur %d lettres'
          % (max(e[0] for e in ecarts), max(e[1] for e in ecarts),
             sum(1 for e in ecarts if e[3])))

    lignes = [
        "/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-axe.py` sur `%s` — ne pas éditer" % SOURCE.name,
        " * à la main.",
        " *",
        " * L'AXE des lettres, lu dans les contours de %s : les deux graisses" % DONNEES['police'],
        " * relevées donnent leurs fûts, l'épaisseur s'annule à wght %s, et les deux" % r(MAIGRE),
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
            _jonctions(jonc)))
    lignes.append('};')
    CIBLE.write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/%s (%d axes, %d jeux de traits)'
          % (CIBLE.name, len(axes), len(poses)))

    if '--adopter' in sys.argv:
        adopter(poses)


if __name__ == '__main__':
    main()
