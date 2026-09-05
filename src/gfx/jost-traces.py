#!/usr/bin/env python3
"""★ **LES RECETTES DE JOST — et pour la première fois, elles se MESURENT.**

> « le glyphe qui est mené dans la zone de traçage devrait correspondre à celui
>   qui est tracé. » (l'auteur)

`jetbrains-traces.py` fait quatre-vingt-deux kilo-octets parce que JetBrains Mono
livre, pour chaque lettre, **une seule masse d'encre** : le nombre de traits, les
levées de crayon, les jonctions n'y sont écrits nulle part, et il a fallu les
DÉCLARER, arc elliptique par arc elliptique. Jost ne demande presque rien de
tout ça, et la raison tient en une phrase :

★ **JOST EST DESSINÉE TRAIT PAR TRAIT, ET SES RECOUVREMENTS NE SONT PAS FUSIONNÉS.**
  Le `E` sort en QUATRE contours — le fût, puis ses trois barres, quatre
  rectangles nus qui se chevauchent. Le `t` en deux, le `i` en deux, le `k` en
  deux, le `H` en trois, le `b` en trois (fût + les deux bords de la panse). Le
  contour n'est plus la silhouette de la lettre : c'est **le contour de chaque
  coup de crayon**, tel que le dessinateur l'a posé. La lecture qu'il fallait
  déclarer chez JetBrains, Jost la LIVRE.

★ **ET UN CONTOUR DE TRAIT SE RETOURNE EN AXE SANS RIEN DÉCIDER.** Effondré à la
  graisse où l'encre s'annule (wght 60, voir `jost-source.py`), le contour d'un
  trait unique parcourt son axe, fait demi-tour à son bout, et revient. Si les
  deux bouts tombent aux abscisses curvilignes s₁ et s₂, le point d'abscisse s a
  pour vis-à-vis celui d'abscisse (s₁+s₂) − s : **c'est une involution**, et elle
  n'a que deux points fixes — les deux bouts. On cherche donc l'unique décalage
  C = s₁+s₂ qui minimise Σ‖P(s) − P(C−s)‖. Une inconnue, une recherche, aucun
  seuil d'angle ni longueur de bout à deviner.

★ **LE RÉSIDU QUE CETTE RECHERCHE LAISSE EST LUI-MÊME LA CLASSIFICATION**, et
  c'est ce qui rend la méthode honnête : la même mesure trouve et contrôle. Sur
  les **87 contours** des cinquante-deux signes, il se range en deux tas séparés
  par un fossé de **224 unités où PAS UN contour ne tombe** :

    · **résidu ≤ 21,2** → un TRAIT OUVERT, deux bouts. **63 contours.** Le pire
      est le `W` (21,2), puis le `N` (13,1) et le `M` (12,1) ; la médiane est à
      1,2 — c'est-à-dire l'épaisseur résiduelle de l'encre à wght 60, soit rien ;
    · **résidu ≥ 245,5** → autre chose. 24 contours.

  ⚠️ **ET LE RÉSIDU S'ARRÊTE LÀ : il ne distingue pas l'anneau de la fourche.**
    Les anneaux rendent 350 à 574, les fourches 246 à 479 — entrelacés, et pour
    une raison de fond : dans les deux cas l'involution apparie des points qui ne
    se font pas face. Ce qui les sépare se mesure autrement, et tout aussi
    mécaniquement : **un anneau a un JUMEAU.** Ses deux bords, effondrés, se
    superposent à moins d'une unité — c'est toute la raison d'être de
    l'effondrement. Une fourche est seule dans son contour.

★ **LE VERDICT TOMBE ALORS SANS QU'ON AIT RIEN DÉCLARÉ : 63 traits, 16 anneaux
  (huit paires : `b d g o p q O Q`), 8 fourches.** Et les huit fourches sont
  **exactement** `m n u x y T X Y` — les huit signes dont la recette reste
  déclarée. La mesure et la lecture se confirment l'une l'autre sans s'être
  consultées ; si l'on changeait de version de Jost et qu'un neuvième signe
  fourchait, `--familles` le dirait avant que le dessin ne bouge.

⚠️ **LE `W` À 21,2 EST LE SEUL CAS LIMITE, ET IL EST NOMMÉ.** Son axe est un
  zigzag à quatre branches dont les deux pointes hautes du milieu passent à
  vingt unités l'une de l'autre ; l'involution les apparie correctement, mais le
  pire écart s'y mesure. C'est bien un trait unique — le `W` de Jost se trace
  sans lever le crayon.

⚠️ **ET DEUX SIGNES DEMANDENT UNE COUPURE DÉCLARÉE — `e` ET `B`.** Leur contour
  est bien un trait unique (résidu 6,8 et 9,2), mais `deriveGlyph` compte les
  BOUCLES, et « ça ne devrait pas changer quelle que soit la police » (l'auteur).
  Un `e` en un seul sous-chemin ouvert n'a aucune boucle ; un `B` non plus, alors
  qu'il en a deux. On coupe donc l'axe extrait — sans le déformer d'une unité —
  aux abscisses où la lettre se referme sur elle-même, et l'on déclare les
  jonctions qui rendent le compte. C'est une LECTURE, comme chez JetBrains ;
  elle ne porte plus que sur deux signes au lieu de cinquante-deux.
"""

import importlib.util as _iu
import json
import math
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
GFX = RACINE / 'src' / 'gfx'
SOURCE = GFX / '_jost-source.json'
CIBLE = GFX / '_jost-candidats.js'

#: Le repère du moteur : la CAPITALE vaut 600 (`glyphes.js › METRIQUES`).
CAPITALE_CIBLE = 600

SIGNES = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'


def _jetbrains():
    """★ **LES OUTILS DE CHEMIN SONT PARTAGÉS, PAS RECOPIÉS.**

    `r`, `catmull`, `points_du_trace` et `boite_du_trace` ne savent rien d'une
    police : ce sont de l'arithmétique de `d` SVG. Les redéclarer ici en ferait
    deux versions à maintenir, et c'est exactement ce que le dépôt refuse
    ailleurs (« la géométrie extraite, jamais transcrite »). On charge donc le
    module voisin — son code de niveau module ne fait qu'énoncer des constantes,
    il n'ouvre aucun fichier tant qu'on n'appelle pas `mesures()`.
    """
    sp = _iu.spec_from_file_location('jetbrains_traces', str(GFX / 'jetbrains-traces.py'))
    mod = _iu.module_from_spec(sp)
    sys.modules.setdefault('jetbrains_traces', mod)
    argv, sys.argv = sys.argv, [sys.argv[0]]
    sp.loader.exec_module(mod)
    sys.argv = argv
    return mod


_JB = _jetbrains()
r = _JB.r
catmull = _JB.catmull
points_du_trace = _JB.points_du_trace
boite_du_trace = _JB.boite_du_trace


# ═══════════════════════════════════════════════════════════════════════════
#  ① L'EFFONDREMENT — la même formule que `jetbrains-axe.py › effondre`
# ═══════════════════════════════════════════════════════════════════════════
#
# ⚠️ **CETTE DUPLICATION EST VOULUE, ET ELLE EST DE SIX LIGNES.** `jetbrains-axe.py`
#   charge CE fichier pour en lire les recettes ; l'importer d'ici en retour
#   fermerait le cycle. Six lignes d'interpolation affine — la même droite, les
#   mêmes deux graisses, lues dans le même extrait — coûtent moins qu'un import
#   circulaire. Le contrôle est ailleurs et il est sévère : `jost-axe.py` fait
#   l'effondrement de son côté avec SA formule, et si les deux divergeaient
#   d'un cheveu, la fidélité mesurée entre le guide et l'axe le dirait aussitôt
#   (elle vaut aujourd'hui 3,9 unités au pire, sur le `W`).

def _charge():
    if not SOURCE.exists():
        sys.exit('extrait absent : lancer d’abord src/gfx/jost-source.py')
    return json.loads(SOURCE.read_text(encoding='utf-8'))


DONNEES = _charge()
MAIGRE_A, MAIGRE_B = DONNEES['releves']
ECHELLE = CAPITALE_CIBLE / float(DONNEES['capitale'])
#: Le paramètre d'effondrement : là où le fût vertical s'annule. −0,1333 pour
#: Jost, c'est-à-dire treize pour cent HORS du segment relevé (JetBrains : 125 %).
T_ZERO = -DONNEES['futs'][MAIGRE_A][1] / float(
    DONNEES['futs'][MAIGRE_B][1] - DONNEES['futs'][MAIGRE_A][1])
FUT = DONNEES['futs'][MAIGRE_B][1] * ECHELLE
MAIGRE = (DONNEES['graisses'][MAIGRE_A]
          + T_ZERO * (DONNEES['graisses'][MAIGRE_B] - DONNEES['graisses'][MAIGRE_A]))


def effondre(ch):
    """Les contours de `ch` à la graisse où l'encre s'annule, à l'échelle."""
    out = []
    for a, b in zip(DONNEES['glyphes'][ch][MAIGRE_A], DONNEES['glyphes'][ch][MAIGRE_B]):
        out.append([((u[0] + (v[0] - u[0]) * T_ZERO) * ECHELLE,
                     (u[1] + (v[1] - u[1]) * T_ZERO) * ECHELLE, u[2])
                    for u, v in zip(a, b)])
    return out


def _morceaux(nodes):
    """Contour cyclique → `[(depart, [controles], arrivee), …]`, comme l'axe."""
    n = len(nodes)
    sur = [i for i in range(n) if nodes[i][2] != 'o']
    if not sur:
        return []
    dep = sur[-1]
    p0, ctrl, segs = nodes[dep], [], []
    for k in range(n):
        x, y, t = nodes[(dep + 1 + k) % n]
        if t == 'o':
            ctrl.append((x, y))
        else:
            segs.append(((p0[0], p0[1]), ctrl, (x, y)))
            p0, ctrl = (x, y, t), []
    return segs


def _evalue(m, t):
    p = [m[0]] + list(m[1]) + [m[2]]
    while len(p) > 1:
        p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
    return p[0]


#: Le nombre d'échantillons par contour. ★ **IL DOIT ÊTRE PAIR** : l'involution
#: place les deux points fixes à C/2 et C/2 + N/2, et un N impair les décalerait
#: d'un demi-échantillon chacun. 720 donne un point tous les deux à sept unités
#: selon la longueur du contour — sous la tolérance du moteur partout.
ECHANTILLONS = 720


def echantillonne(nodes, n=ECHANTILLONS):
    """Le contour, en `n` points ÉQUIDISTANTS le long de sa courbe, et sa longueur."""
    brut = []
    for m in _morceaux(nodes):
        brut += [_evalue(m, k / 24.0) for k in range(24)]
    if not brut:
        return [], 0.0
    cum, s = [0.0], 0.0
    for a, b in zip(brut, brut[1:] + brut[:1]):
        s += math.dist(a, b)
        cum.append(s)
    out, k = [], 0
    for i in range(n):
        cible = s * i / n
        while cum[k + 1] < cible:
            k += 1
        u = (cible - cum[k]) / max(1e-9, cum[k + 1] - cum[k])
        a, b = brut[k], brut[(k + 1) % len(brut)]
        out.append((a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])))
    return out, s


# ═══════════════════════════════════════════════════════════════════════════
#  ② L'INVOLUTION — trouver les deux bouts, et l'axe avec eux
# ═══════════════════════════════════════════════════════════════════════════

#: ★ **LE FOSSÉ ENTRE UN TRAIT ET LE RESTE, ET IL EST ÉNORME.** Mesuré sur les
#: cent-un contours : le pire trait est le `W` à **21,2**, le meilleur non-trait
#: est le `n` à **245,5**. Deux cent vingt-quatre unités d'intervalle VIDE — ce
#: n'est pas un réglage à trouver, c'est un trou. On coupe à 40, largement du
#: côté des traits pour que la marge profite à ce qui doit passer.
SEUIL_TRAIT = 40.0

#: ⚠️ **ET LE RÉSIDU NE SÉPARE PAS L'ANNEAU DE LA FOURCHE — il ne le peut pas.**
#: Les deux valent le même ordre de grandeur (anneaux 350 à 574, fourches 246 à
#: 479, entrelacés), parce que l'involution y apparie dans les deux cas des
#: points qui ne se font pas face. Ce qui les distingue est ailleurs, et se
#: mesure aussi : **un anneau a un JUMEAU**. Ses deux bords, effondrés, se
#: superposent à moins d'une unité — c'est toute la raison d'être de
#: l'effondrement. Une fourche est seule dans son contour.
JUMEAU = 3.0


def involution(ech, pas=4):
    """Le décalage qui apparie l'aller et le retour, et le pire écart qu'il laisse.

    ⚠️ **ON N'ÉCHANTILLONNE LA SOMME QU'UN POINT SUR QUATRE, MAIS LE RÉSIDU SE
      MESURE SUR TOUS.** Chercher C coûte O(n²) ; le mesurer coûte O(n). Le
      premier n'a besoin que d'un minimum bien placé, le second sert de
      CLASSIFICATION et ne doit rien manquer — un contour en fourche peut coller
      parfaitement sur les trois quarts de sa longueur.
    """
    n = len(ech)
    best, bc = None, 0
    for c in range(n):
        s = 0.0
        for i in range(0, n, pas):
            p, q = ech[i], ech[(c - i) % n]
            s += math.hypot(p[0] - q[0], p[1] - q[1])
        if best is None or s < best:
            best, bc = s, c
    pire = max(math.hypot(ech[i][0] - ech[(bc - i) % n][0],
                          ech[i][1] - ech[(bc - i) % n][1]) for i in range(n))
    return bc, pire


def axe_du_trait(ech, bc):
    """L'axe : le MILIEU de l'aller et du retour, d'un bout fixe à l'autre.

    ★ **ON PREND LE MILIEU PLUTÔT QUE L'UN DES DEUX PASSAGES.** À wght 60 les
      deux bords ne sont plus qu'à 0,6 unité l'un de l'autre — prendre l'aller
      suffirait presque. « Presque » : les fûts horizontal et vertical ne
      s'annulent pas au même poids (57,1 contre 60,0), et c'est justement cet
      écart-là que le milieu efface exactement, à toute épaisseur locale. C'est
      le geste ③ de `jetbrains-axe.py`, appliqué ici contour par contour.
    """
    n = len(ech)
    i0 = bc // 2
    aller = [ech[(i0 + k) % n] for k in range(n // 2 + 1)]
    retour = [ech[(bc - i0 - k) % n] for k in range(n // 2 + 1)]
    return _apparie(aller, retour)


#: ⚠️ **L'APPARIEMENT PAR L'ABSCISSE COUPE LES ANGLES, et le `W` le payait 32,6
#:   unités de couverture.** À un sommet aigu — le fond du `V` du `W`, du `M`,
#:   du `N`, du `w` —, le bord extérieur est plus long que l'intérieur ; apparier
#:   à égale abscisse curviligne décale donc les deux passages l'un par rapport à
#:   l'autre, et leur milieu RENTRE dans l'angle au lieu d'aller jusqu'à la
#:   pointe. C'est exactement la leçon que `jetbrains-traces.py › axe_median`
#:   avait déjà tirée : « l'appariement se fait par la NORMALE, jamais par
#:   l'abscisse ». On apparie donc au plus proche — sans ambiguïté possible,
#:   puisque les deux passages ne sont qu'à 0,6 unité l'un de l'autre partout.
#: La fenêtre borne la recherche autour du partenaire d'abscisse : au-delà, on
#: attraperait le brin d'en face sur une lettre qui se replie sur elle-même.
FENETRE_APPARIEMENT = 0.12


def _apparie(aller, retour):
    """Le milieu de deux passages, appariés AU PLUS PROCHE et non à l'abscisse."""
    n = len(retour)
    w = max(4, int(n * FENETRE_APPARIEMENT))
    out = []
    for k, p in enumerate(aller):
        j0, j1 = max(0, k - w), min(n, k + w + 1)
        q = min(retour[j0:j1], key=lambda z: (z[0] - p[0]) ** 2 + (z[1] - p[1]) ** 2)
        out.append(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
    return out


def axe_de_lanneau(ech_a, ech_b):
    """L'axe d'une boucle fermée : le milieu de ses deux bords, appariés au plus proche.

    Les deux contours d'une panse effondrée sont à moins d'une unité l'un de
    l'autre — l'appariement au plus proche ne peut donc pas se tromper de brin,
    et le milieu qu'il rend est l'axe de la boucle.
    """
    out = []
    for p in ech_a:
        q = min(ech_b, key=lambda z: (z[0] - p[0]) ** 2 + (z[1] - p[1]) ** 2)
        out.append(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
    return out


# ═══════════════════════════════════════════════════════════════════════════
#  ③ DE L'AXE AU GUIDE — droites là où c'est droit, courbes ailleurs
# ═══════════════════════════════════════════════════════════════════════════

#: Un coin : au-delà de ce virage, le crayon change de direction et l'axe doit
#: porter un NŒUD, pas une courbe. Mesuré sur les polylignes de Jost — le `v`
#: casse à 141°, le `z` à 118°, le `M` à 108° — quand un arc de panse ne tourne
#: jamais de plus de 12° par pas d'échantillon.
COIN = 32.0

#: Sous cette flèche, un morceau d'axe est DROIT et s'écrit `L`. Un dixième de
#: fût : c'est la précision à laquelle le moteur lit un contact.
DROIT = 0.10 * FUT

#: Un point de guide tous les tant d'unités le long d'une portion courbe. Le
#: guide n'est qu'une CIBLE de projection — l'ajusteur de `jetbrains-axe.py`
#: refait les cubiques ensuite —, mais trop lâche il coupe les virages.
PAS_GUIDE = 55.0


def _angle(a, b, c):
    u = (b[0] - a[0], b[1] - a[1])
    v = (c[0] - b[0], c[1] - b[1])
    nu, nv = math.hypot(*u), math.hypot(*v)
    if nu < 1e-9 or nv < 1e-9:
        return 0.0
    cos = max(-1.0, min(1.0, (u[0] * v[0] + u[1] * v[1]) / (nu * nv)))
    return math.degrees(math.acos(cos))


def _coins(P, fenetre=9):
    """Les indices où l'axe casse — mesuré sur une fenêtre, pas sur deux voisins.

    ⚠️ Deux échantillons voisins sont à deux unités : l'angle qu'ils forment est
      du bruit de quantification. On regarde donc neuf points de part et
      d'autre, ce qui vaut une vingtaine d'unités — la moitié d'un fût.
    """
    n = len(P)
    brut = [(i, _angle(P[max(0, i - fenetre)], P[i], P[min(n - 1, i + fenetre)]))
            for i in range(fenetre, n - fenetre)]
    pics = []
    for i, a in sorted(brut, key=lambda z: -z[1]):
        if a < COIN:
            break
        if all(abs(i - j) > fenetre for j in pics):
            pics.append(i)
    return sorted(pics)


def _fleche(P, i, j):
    """La plus grande distance des points `P[i..j]` à la corde qui les joint."""
    a, b = P[i], P[j]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    if L < 1e-9:
        return 0.0
    return max(abs((P[k][0] - a[0]) * dy - (P[k][1] - a[1]) * dx) / L
               for k in range(i, j + 1))


def _echelonne(P, i, j):
    """Les points de guide d'une portion courbe : au moins trois, puis un tous
    les `PAS_GUIDE`."""
    L = sum(math.dist(P[k], P[k + 1]) for k in range(i, j))
    n = max(2, int(round(L / PAS_GUIDE)))
    return [P[i + round((j - i) * k / n)] for k in range(n + 1)]


def guide(P, ferme=False):
    """Un `d` SVG pour l'axe `P` : `L` sur les portions droites, cubiques ailleurs.

    ★ **C'EST ICI QUE SE JOUE LE BUDGET.** Un axe rendu en polyligne de trois
      cent soixante points décrit la même lettre qu'un `l` en deux nœuds, et
      c'est le second que l'auteur demande — « trop de points par rapport au
      nécessaire ». On coupe donc l'axe à ses COINS (mesurés), et l'on écrit
      chaque portion droite comme une DROITE : le `l`, le `I`, les quatre barres
      du `E` sortent en un segment et zéro poignée, ce qu'aucune recette de
      JetBrains ne pouvait rendre puisque la police y empatte.
    """
    if ferme:
        # Une boucle fermée n'a pas de coin chez Jost — ce sont des cercles.
        return _catmull_ferme([P[round(len(P) * k / 16.0) % len(P)] for k in range(16)])
    bornes = [0] + _coins(P) + [len(P) - 1]
    d = ['M %s %s' % (r(P[0][0]), r(P[0][1]))]
    for a, b in zip(bornes, bornes[1:]):
        if b - a < 2 or _fleche(P, a, b) < DROIT:
            d.append('L %s %s' % (r(P[b][0]), r(P[b][1])))
        else:
            d.append(_courbe(P, a, b))
    return ' '.join(d)


def _catmull_ferme(P):
    """Catmull-Rom CYCLIQUE : une boucle sans couture ni kink.

    ⚠️ **`catmull` DOUBLE SES POINTS EXTRÊMES** — `p0 = P[0]` au départ,
      `p3 = P[-1]` à l'arrivée — ce qui est juste pour un trait ouvert et FAUX
      pour une boucle : les deux tangentes du raccord s'y calculent sur des
      voisins fantômes, et l'ovale se referme avec un angle. Mesuré : ce coin
      fabriquait un cinquième extremum sur le `o`, qui n'en a que quatre. En
      cyclique, chaque tangente voit ses vrais voisins des deux côtés.
    """
    n = len(P)
    d = ['M %s %s' % (r(P[0][0]), r(P[0][1]))]
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append('C %s %s %s %s %s %s' % (r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1]),
                                          r(p2[0]), r(p2[1])))
    return ' '.join(d)


def _courbe(P, a, b):
    """La portion `P[a..b]` en cubiques de Catmull-Rom, SANS son `M` initial.

    `catmull` rend « M x y C … » ; le `M` a déjà été posé par `guide`, et le
    recoller ici ouvrirait un second sous-chemin — c'est-à-dire un trait de plus
    pour `deriveGlyph`, et un compte faux.
    """
    d = catmull(_echelonne(P, a, b))
    return d[d.index('C'):]


# ═══════════════════════════════════════════════════════════════════════════
#  ④ LA LECTURE DE CHAQUE SIGNE
# ═══════════════════════════════════════════════════════════════════════════
#
#  Chaque entrée dit, dans l'ordre, DE QUOI est fait le tracé, puis quelles
#  jonctions le referment. Les descripteurs :
#
#    ('t', k)            le contour k, trait ouvert, d'un bout à l'autre
#    ('t', k, u0, u1)    la portion [u0, u1] de son axe (fractions de longueur)
#    ('o', k, j)         les contours k et j sont les deux bords d'une BOUCLE
#    ('.', k)            un contour dégénéré : le point du `i` et du `j`
#
#  ⚠️ **L'ORDRE DES CONTOURS EST CELUI DE LA POLICE**, il n'est pas choisi. Les
#    indices ci-dessous se lisent dans `jost-source.py --contours` ; les changer
#    dessinerait une autre lettre, et le contrôle de boîte le dirait aussitôt.

LECTURE = {
    # ── un seul trait, rien à déclarer ────────────────────────────────────────
    'c': ([('t', 0)], []),
    'l': ([('t', 0)], []),
    's': ([('t', 0)], []),
    'v': ([('t', 0)], []),
    'w': ([('t', 0)], []),
    'z': ([('t', 0)], []),
    'C': ([('t', 0)], []),
    'G': ([('t', 0)], []),
    'I': ([('t', 0)], []),
    'J': ([('t', 0)], []),
    'L': ([('t', 0)], []),
    'M': ([('t', 0)], []),
    'N': ([('t', 0)], []),
    'S': ([('t', 0)], []),
    'U': ([('t', 0)], []),
    'V': ([('t', 0)], []),
    'W': ([('t', 0)], []),
    'Z': ([('t', 0)], []),

    # ── une boucle fermée, et rien d'autre ────────────────────────────────────
    'o': ([('o', 0, 1)], []),
    'O': ([('o', 0, 1)], []),

    # ── fût + panse fermée : deux traits, une boucle ──────────────────────────
    # ⚠️ La panse est FERMÉE chez Jost — c'est un cercle entier, pas un
    #   demi-tour cousu au fût comme chez JetBrains. Une seule jonction suffit
    #   donc : `deriveGlyph` compte déjà la boucle comme sous-chemin fermé, et
    #   une seconde jonction en inventerait une deuxième.
    'b': ([('t', 0), ('o', 1, 2)], [[0, 1, 'panse']]),
    'd': ([('t', 0), ('o', 1, 2)], [[0, 1, 'panse']]),
    'p': ([('t', 0), ('o', 1, 2)], [[0, 1, 'panse']]),
    'q': ([('t', 0), ('o', 1, 2)], [[0, 1, 'panse']]),
    'g': ([('t', 0), ('o', 1, 2)], [[0, 1, 'panse']]),

    # ── fût + branche : deux traits ouverts, aucune boucle ────────────────────
    'f': ([('t', 1), ('t', 0)], [[0, 1, 'barre']]),
    'h': ([('t', 0), ('t', 1)], [[0, 1, 'naissance de l’arche']]),
    'k': ([('t', 0), ('t', 1)], [[0, 1, 'fourche de la jambe']]),
    'r': ([('t', 0), ('t', 1)], [[0, 1, 'naissance de l’épaule']]),
    't': ([('t', 1), ('t', 0)], [[0, 1, 'barre']]),
    'K': ([('t', 0), ('t', 1)], [[0, 1, 'fourche de la jambe']]),
    'Q': ([('o', 0, 1), ('t', 2)], [[0, 1, 'queue']]),

    # ── le point ne touche rien : deux traits, aucune jonction ────────────────
    # ★ **ET C'EST LÀ QUE JOST GAGNE LE PLUS.** Le `i` de JetBrains porte un
    #   empattement plein plus une amorce : trois traits, quatre extrémités. Le
    #   `i` de Jost est un rectangle nu surmonté d'un point — deux traits, trois
    #   extrémités, et son fût s'écrit `M x y L x y'`, deux nœuds, zéro poignée.
    'i': ([('t', 1), ('.', 0)], []),
    'j': ([('t', 1), ('.', 0)], []),

    # ── fût + panse OUVERTE refermée par ses deux jonctions : une boucle ──────
    # `deriveGlyph` compte `boucles = fermés + cycles du graphe` : deux traits
    # reliés par DEUX jonctions font un cycle, donc une boucle. C'est la lecture
    # que `moteur/tables/glyphes.js` donne déjà au `P`, au `D` et au `R`.
    'a': ([('t', 1), ('t', 0)], [[0, 1, 'haut de la panse'], [0, 1, 'pied de la panse']]),
    'A': ([('t', 1), ('t', 0)], [[0, 1, 'barre gauche'], [0, 1, 'barre droite']]),
    'D': ([('t', 0), ('t', 1)], [[0, 1, 'haut'], [0, 1, 'pied']]),
    'P': ([('t', 0), ('t', 1)], [[0, 1, 'haut'], [0, 1, 'pied de la panse']]),
    'R': ([('t', 1), ('t', 2), ('t', 0)],
          [[0, 1, 'haut'], [0, 1, 'taille'], [1, 2, 'naissance de la jambe']]),

    # ── les barres séparées : autant de traits que de contours ────────────────
    'E': ([('t', 3), ('t', 1), ('t', 2), ('t', 0)],
          [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu'], [0, 3, 'barre du bas']]),
    'F': ([('t', 2), ('t', 0), ('t', 1)],
          [[0, 1, 'barre du haut'], [0, 2, 'barre du milieu']]),
    'H': ([('t', 2), ('t', 1), ('t', 0)],
          [[0, 2, 'naissance gauche'], [1, 2, 'naissance droite']]),

    # ── les deux COUPURES, et le couteau est mesuré ───────────────────────────
    #
    # ★ **DEUX SIGNES SE TRACENT D'UN SEUL COUP DE CRAYON ET PORTENT POURTANT UNE
    #   TOPOLOGIE QU'UN SEUL SOUS-CHEMIN NE PEUT PAS DIRE.** `deriveGlyph` compte
    #   `boucles = sous-chemins fermés + cycles du graphe des jonctions` : un
    #   sous-chemin ouvert et seul n'a ni l'un ni l'autre, donc zéro boucle. Or
    #   « les boucles sont l'invariant, ça ne devrait pas changer quelle que soit
    #   la police » (l'auteur) — et le `e` en a une, le `B` en a deux.
    #
    # ★ **ON NE CHOISIT PAS OÙ COUPER : ON COUPE AUX COINS DE L'AXE.** Le
    #   descripteur `('c', k)` rend autant de traits que le contour k a de
    #   virages francs (`_coins`, mesuré à 32°). Ce n'est pas un réglage déguisé :
    #   ces coins sont là où le crayon change de direction, c'est-à-dire
    #   exactement là où un dessinateur aurait levé la main.
    #
    #    · le `e` a **UN** coin, à u = 0,762 — le bout droit de la barre, où
    #      l'axe quitte la panse à 79°. Deux traits. Et la barre retombe alors
    #      sur le flanc gauche de la panse à **3,0 unités** (43,0 contre 40,0),
    #      donc sous la tolérance : son bout gauche est LIÉ, pas libre ;
    #    · le `B` a **DEUX** coins, à u = 0,326 et u = 0,622 — le haut et le bas
    #      du fût. Trois traits : « taille → panse haute → sommet », puis le fût
    #      de haut en bas, puis « pied → panse basse → taille ». Les deux bouts
    #      qui reviennent à la taille tombent à 2,3 et 1,1 unité du fût.
    #      Quatre jonctions, trois traits : cyclomatique = 4 − 3 + 1 = **2
    #      boucles**, et **zéro extrémité libre** — les comptes exacts du `B`
    #      retenu aujourd'hui.
    'e': ([('c', 0)], [[0, 1, 'bout droit de la barre'], [0, 1, 'flanc gauche']]),
    'B': ([('c', 0)],
          [[0, 1, 'sommet'], [0, 1, 'taille haute'],
           [1, 2, 'pied'], [1, 2, 'taille basse']]),

    # ── les huit FOURCHES ─────────────────────────────────────────────────────
    #
    # ★ **UNE FOURCHE N'A PAS D'INVOLUTION GLOBALE, MAIS CHACUNE DE SES BRANCHES
    #   EN A UNE.** Trois branches dans un seul contour : aucun décalage unique
    #   n'apparie l'aller et le retour (c'est ce que le résidu dit, 246 à 479).
    #   Chaque branche, en revanche, a bien ses deux bords, et il suffit de dire
    #   LESQUELS. On les désigne par les indices des nœuds sur-courbe du contour
    #   EFFONDRÉ — c'est-à-dire par les nœuds de la police elle-même, relevés par
    #   `jost-traces.py --noeuds`, et non par des cotes posées à vue.
    #
    #    ('s', k, (a,b), (c,d), …)  une POLYLIGNE par les milieux des paires de
    #                               nœuds données — chaque paire est un bout plat
    #                               (réduit à un point par l'effondrement) ou un
    #                               sommet d'angle
    #    ('b', k, (i,j), (p,q), fin) une branche : le milieu des deux bords que
    #                               sont les suites i→j et p→q, prolongé s'il y a
    #                               lieu par un segment droit jusqu'au bout `fin`
    #
    # ⚠️ **`n`, `m` ET `u` ONT D'ABORD ÉTÉ ÉCRITS EN DEMI-OVALES, comme chez
    #   JetBrains, ET C'ÉTAIT FAUX DE CINQUANTE UNITÉS.** Un arc SVG n'a qu'un
    #   couple de rayons ; l'arche de Jost naît à y = 240 à gauche et retombe à
    #   y = 279 à droite — elle n'est pas symétrique, et la corde de 253 unités
    #   dépassait déjà le diamètre. Mesuré alors : `n` 49,3 de fidélité et 82,3
    #   de couverture, `u` 53,1 et 88,9, `m` 36,5 et 54,4. Lues sur leurs bords,
    #   elles n'ont plus de rayon à deviner.
    'n': ([('s', 0, (8, 9), (10, 11)),
           ('b', 0, (3, 7), (12, 17), (1, 2))],
          [[0, 1, 'naissance de l’arche']]),
    'm': ([('s', 0, (10, 11), (12, 13)),
           ('b', 0, (5, 9), (14, 19), (20, 21)),
           ('b', 0, (0, 5), (22, 27), (28, 29))],
          [[0, 1, 'première arche'], [1, 2, 'seconde arche']]),
    # ⚠️ **LE `u` DE JOST N'EST PAS CELUI DE JETBRAINS, ET IL COÛTE UNE EXTRÉMITÉ
    #   DE PLUS.** Chez JetBrains, « le `U` n'a qu'un seul trait » (l'auteur) : on
    #   descend le fût gauche, on tourne dans le creux, on remonte le droit —
    #   aucun carrefour. Chez Jost, le fût DROIT descend jusqu'à la ligne de base
    #   (mesuré : x = 327 de y = 394 à y = 0) tandis que le creux ne le rejoint
    #   qu'à y = 137. Il y a donc un carrefour, un éperon sous le creux, et trois
    #   bouts libres au lieu de deux. On ne le cache pas : « n'essaie pas de
    #   tricher » (l'auteur).
    'u': ([('s', 0, (10, 11), (8, 9)),
           ('b', 0, (3, 7), (12, 17), (1, 2))],
          [[0, 1, 'naissance du creux']]),

    # ── cinq fourches DROITES : leurs branches sont des polylignes ─────────────
    # ★ Celles-ci n'ont aucun bord à apparier : tout ce qu'il leur faut, ce sont
    #   leurs bouts et leurs sommets, et les deux se lisent aux mêmes nœuds.
    #
    # ⚠️ **ELLES ONT D'ABORD ÉTÉ ÉCRITES SUR LA BOÎTE DE L'AXE, ET LE `X` LE
    #   PAYAIT 21,4 UNITÉS.** « Une diagonale entre deux coins de la boîte est
    #   exacte par construction » — sauf que les coins de la BOÎTE ne sont pas les
    #   bouts du TRAIT : le `X` de Jost pose ses bouts hauts à x = 41 et 390 et
    #   ses bouts bas à x = 19 et 403, si bien que la boîte (18 … 404) est
    #   dessinée par le bas et rate le haut de vingt-quatre unités. Les bouts, eux,
    #   ne se déduisent d'aucune boîte : ils se lisent.
    'x': ([('s', 0, (2, 3), (8, 9)), ('s', 0, (5, 6), (11, 0))],
          [[0, 1, 'croisée']]),
    'X': ([('s', 0, (2, 3), (8, 9)), ('s', 0, (5, 6), (11, 0))],
          [[0, 1, 'croisée']]),
    # Le `y` : le bras gauche s'arrête à la fourche, le droit la traverse et
    # descend au jambage. C'est la lecture de `moteur/tables/glyphes.js`.
    'y': ([('s', 0, (4, 5), (2, 3)), ('s', 0, (0, 1), (6, 6), (7, 8))],
          [[0, 1, 'fourche']]),
    # Le `Y` : le V d'abord, puis le fût qui en descend.
    'Y': ([('s', 0, (2, 3), (1, 4), (0, 8)), ('s', 0, (1, 4), (5, 6))],
          [[0, 1, 'fourche']]),
    'T': ([('s', 0, (7, 0), (5, 6)), ('s', 0, (1, 4), (2, 3))],
          [[0, 1, 'barre']]),
}


# ═══════════════════════════════════════════════════════════════════════════
#  ⑤ LA POSE
#
#  ★ **IL N'Y A PLUS UNE SEULE COORDONNÉE POSÉE À LA MAIN DANS CE FICHIER.**
#    La version précédente décrivait les huit fourches par des cotes lues sur la
#    boîte de l'axe — « une diagonale entre deux coins de la boîte est exacte par
#    construction ». Elle ne l'était pas : le `X` de Jost pose ses bouts hauts à
#    x = 41 et 390 et ses bouts bas à x = 19 et 403, si bien que sa boîte est
#    dessinée par le BAS et rate le haut de vingt-quatre unités (mesuré : 21,4 de
#    fidélité). Depuis, chaque nombre du fichier est soit un indice de nœud, soit
#    un seuil rapporté au fût. Les seuls chiffres littéraux qui restent sont dans
#    les commentaires, où ils servent de témoins.
# ═══════════════════════════════════════════════════════════════════════════

def _bord(nodes, i, j):
    """Un BORD de branche : la courbe du contour, du nœud sur-courbe `i` au `j`.

    ⚠️ **ON SUIT LA COURBE, PAS SES NŒUDS.** Une arche de Jost ne porte que cinq
      nœuds sur-courbe ; les joindre par des segments raterait son sommet de
      plusieurs unités. On récupère les morceaux de Bézier entre `i` et `j` et
      on les échantillonne — ce sont les mêmes morceaux que `morceaux()` rend au
      reste de la chaîne, donc la même courbe, au bit près.
    """
    segs = _morceaux(nodes)
    n = len(segs)
    # `_morceaux` démarre au DERNIER nœud sur-courbe : le segment `k` arrive sur
    # le nœud sur-courbe `k`. Aller de `i` à `j`, c'est donc prendre les
    # segments i+1 … j, dans l'ordre cyclique.
    out = [segs[i % n][2]]
    k = (i + 1) % n
    while True:
        m = segs[k]
        out += [_evalue(m, (t + 1) / 12.0) for t in range(12)]
        if k == j % n:
            break
        k = (k + 1) % n
    return out


def _regulier(pts, n=None, pas=2.0):
    """Une polyligne ré-échantillonnée à pas constant (ou en `n` points)."""
    cum, s = [0.0], 0.0
    for a, b in zip(pts, pts[1:]):
        s += math.dist(a, b)
        cum.append(s)
    if s < 1e-9:
        return list(pts)
    n = n or max(2, int(round(s / pas)) + 1)
    out, k = [], 0
    for i in range(n):
        cible = s * i / (n - 1)
        while k + 1 < len(cum) - 1 and cum[k + 1] < cible:
            k += 1
        u = (cible - cum[k]) / max(1e-9, cum[k + 1] - cum[k])
        a, b = pts[k], pts[k + 1]
        out.append((a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])))
    return out


def _ecart(a, b):
    """L'écart de Hausdorff de `a` à `b` — à quelle distance `b` suit `a`."""
    return max(min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in b) for p in a)


def _axes(ch):
    """Pour chaque contour du signe : son axe, sa FAMILLE, son résidu.

    Trois familles, et les trois se MESURENT (voir `SEUIL_TRAIT` et `JUMEAU`) :
    `trait` si l'involution le referme sur lui-même, sinon `anneau` s'il a un
    jumeau parmi les autres contours, sinon `fourche`.
    """
    ech = []
    for nodes in effondre(ch):
        ech.append(echantillonne(nodes))
    out = []
    for k, (e, L) in enumerate(ech):
        if not e:
            out.append((None, 'vide', 0.0, 0.0, 0))
            continue
        bc, pire = involution(e)
        if pire < SEUIL_TRAIT:
            famille = 'trait'
        elif any(j != k and ech[j][0] and _ecart(e, ech[j][0]) < JUMEAU
                 for j in range(len(ech))):
            famille = 'anneau'
        else:
            famille = 'fourche'
        out.append((e, famille, pire, L, bc))
    return out


def _portion(P, u0, u1):
    """La portion `[u0, u1]` d'un axe, en fractions de sa LONGUEUR."""
    s, cum = 0.0, [0.0]
    for a, b in zip(P, P[1:]):
        s += math.dist(a, b)
        cum.append(s)
    i0 = min(range(len(cum)), key=lambda i: abs(cum[i] - u0 * s))
    i1 = min(range(len(cum)), key=lambda i: abs(cum[i] - u1 * s))
    return P[i0:i1 + 1] if i1 > i0 else P[i0:i0 + 2]


def mesures():
    """Tout ce que Jost dit, à l'échelle du repère du moteur.

    ⚠️ **LES BOÎTES SONT CELLES DE L'AXE EFFONDRÉ, pas celles de l'encre.** Une
      recette de fourche pose ses cotes sur des BOUTS DE TRAIT ; la boîte de
      l'encre les déborderait d'une demi-épaisseur de chaque côté, et le fût du
      `n` se retrouverait posé un demi-fût trop à gauche. C'est exactement la
      correction que `jetbrains-traces.py` devait faire à la main
      (`bordArche = o['x1'] - M['fut'] / 2`) : ici elle n'a pas lieu d'être,
      parce que la boîte est déjà celle du crayon.
    """
    boites = {}
    for ch in SIGNES:
        pts = [p for c in effondre(ch) for p in c if p[2] != 'o']
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        boites[ch] = {'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': max(ys),
                      'l': max(xs) - min(xs), 'h': max(ys) - min(ys)}
    return {
        'k': ECHELLE,
        'upm': DONNEES['unitesParCadratin'],
        'capitale': CAPITALE_CIBLE,
        'fut': FUT,
        'hauteurX': boites['x']['y1'],
        'avance': boites['n']['x1'] - boites['n']['x0'] + FUT,
        'maigre': MAIGRE,
        'boites': boites,
    }


def recettes(M):
    """`{signe: ([{d, ouvert}], jonctions)}` — les guides et la topologie."""
    R = {}
    for ch in SIGNES:
        descripteurs, jonctions = LECTURE[ch]
        axes = None
        traits = []
        for desc in descripteurs:
            if axes is None:
                axes = _axes(ch)
            if desc[0] == 'o':
                ech_a, ech_b = axes[desc[1]][0], axes[desc[2]][0]
                traits.append({'d': guide(axe_de_lanneau(ech_a, ech_b), ferme=True),
                               'ouvert': False})
            elif desc[0] == '.':
                # ★ **LE POINT EST UN SOUS-CHEMIN DÉGÉNÉRÉ, et c'est voulu.**
                #   `deriveGlyph` le reconnaît : « un sous-chemin dégénéré (le
                #   point du `i` ou du `j`) est une composante isolée : il compte
                #   pour UNE extrémité, pas deux ». Effondré, le point du `i` de
                #   Jost n'est plus qu'une tache de 23 unités de tour : on la
                #   réduit à son centre plutôt que de dessiner un rond de rien.
                ech = axes[desc[1]][0]
                cx = sum(p[0] for p in ech) / len(ech)
                cy = sum(p[1] for p in ech) / len(ech)
                traits.append({'d': 'M %s %s L %s %s' % (r(cx), r(cy), r(cx), r(cy)),
                               'ouvert': True})
            elif desc[0] in ('s', 'b'):
                # Les branches d'une fourche, lues sur les NŒUDS de la police.
                sur = [p for p in effondre(ch)[desc[1]] if p[2] != 'o']

                def mi(paire, _sur=sur):
                    a, b = _sur[paire[0]], _sur[paire[1]]
                    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

                if desc[0] == 's':
                    P = [mi(p) for p in desc[2:]]
                    traits.append({'d': 'M %s %s ' % (r(P[0][0]), r(P[0][1]))
                                        + ' '.join('L %s %s' % (r(x), r(y))
                                                   for x, y in P[1:]),
                                   'ouvert': True})
                    continue
                nodes = effondre(ch)[desc[1]]
                bordA = _regulier(list(reversed(_bord(nodes, *desc[2]))))
                bordB = _regulier(_bord(nodes, *desc[3]))
                n = min(len(bordA), len(bordB))
                P = _apparie(_regulier(bordA, n), _regulier(bordB, n))
                d = guide(P)
                if len(desc) > 4 and desc[4]:
                    f = mi(desc[4])
                    d += ' L %s %s' % (r(f[0]), r(f[1]))
                traits.append({'d': d, 'ouvert': True})
            elif desc[0] == 'c':
                ech, _f, _p, _L, bc = axes[desc[1]]
                P = axe_du_trait(ech, bc)
                bornes = [0] + _coins(P) + [len(P) - 1]
                traits += [{'d': guide(P[a:b + 1]), 'ouvert': True}
                           for a, b in zip(bornes, bornes[1:])]
            else:
                ech, famille, _pire, _L, bc = axes[desc[1]]
                P = axe_du_trait(ech, bc)
                if len(desc) > 2:
                    P = _portion(P, desc[2], desc[3])
                traits.append({'d': guide(P), 'ouvert': True})
        # ⚠️ **UNE COUPURE QUI CHANGE DE COMPTE DOIT CRIER, PAS DÉRIVER.** `('c', k)`
        #   rend autant de traits que l'axe a de coins ; si une version de Jost en
        #   ajoutait un, les jonctions déclarées ci-dessus désigneraient d'autres
        #   traits et le glyphe sortirait faux SANS erreur. On vérifie donc que
        #   chaque indice de jonction existe — c'est le seul endroit où la lecture
        #   déclarée et la mesure peuvent se désaccorder.
        for j in jonctions:
            if not (0 <= j[0] < len(traits) and 0 <= j[1] < len(traits)):
                sys.exit('« %s » : jonction %r hors des %d traits extraits — '
                         'une coupure a changé de compte' % (ch, j[:2], len(traits)))
        R[ch] = (traits, jonctions)
    return R


# ═══════════════════════════════════════════════════════════════════════════
#  ⑥ LE BUDGET — MESURÉ, et non recopié de JetBrains
# ═══════════════════════════════════════════════════════════════════════════
#
#  ★ **CE BUDGET N'EST PAS UNE PRÉFÉRENCE : C'EST UN COMPTAGE.** Chez JetBrains,
#    l'auteur avait dicté les cinquante-deux nombres — il n'existait aucune façon
#    de les lire dans la police, puisque la police n'y livre qu'une masse d'encre.
#    Jost livre ses traits ; on peut donc COMPTER ce que chacun demande, et la
#    règle qui compte est celle que l'auteur énonce ailleurs :
#
#    > « aux extrema, une poignée est horizontale ou verticale — jamais
#    >   oblique. » (l'auteur, sur les panses)
#
#    C'est la convention de tous les dessinateurs de fontes : un nœud se pose
#    aux COINS de l'axe et à ses EXTREMA cardinaux, un cubique court entre deux
#    nœuds consécutifs, et il porte deux poignées — zéro si le morceau est droit.
#
#      points   = nœuds DISTINCTS (deux traits qui se touchent en partagent un)
#      poignées = 2 × (morceaux courbes)
#
#  ⚠️ **ET IL EST BEAUCOUP PLUS SERRÉ QUE CELUI DE JETBRAINS**, parce que Jost
#    n'empatte rien : le `l` passe de 5 nœuds et 2 poignées à **2 et 0**, le `I`
#    de 6 et 0 à **2 et 0**, le `i` de 7 et 0 à **3 et 0**, le `t` de 6 et 2 à
#    **4 et 0**. Recopier le budget de JetBrains aurait laissé passer un `l` en
#    cinq nœuds — c'est-à-dire trois nœuds sur une droite.
#
#  Le tableau est ENGENDRÉ par `python3 src/gfx/jost-traces.py --budget`, qui
#  compte sur les guides ce que la règle ci-dessus prescrit. Il est recopié ici
#  plutôt que calculé à la volée pour la même raison que chez JetBrains : un
#  budget est un CONTRAT, et un contrat qui se recalcule ne contraint rien.
#
#  ⚠️ **ET IL NE SERT PAS QU'AU TEST : LE MOTEUR S'EN SERT POUR DÉCIDER.**
#    `jetbrains-axe.py › _r_quadrants` ne recoupe une panse à ses quatre sommets
#    que s'il reste de la place au budget (`BUDGET.get(pose.ch, (0, 0))`). Laissé
#    VIDE, ce tableau rendait donc `(0, 0)` pour les cinquante-deux signes et la
#    passe ne s'appliquait JAMAIS — les panses gardaient les nœuds de l'épure au
#    lieu des quatre cardinaux que l'auteur réclame. Le défaut ne se voyait pas :
#    aucune erreur, aucune passe en échec, juste des ovales moins nets. C'est le
#    genre de valeur par défaut qui coûte une session entière.

BUDGET = {
    'A': (5, 0), 'B': (11, 8), 'C': (5, 8), 'D': (5, 4), 'E': (8, 0), 'F': (6, 0),
    'G': (6, 8), 'H': (6, 0), 'I': (2, 0), 'J': (3, 4), 'K': (5, 0), 'L': (3, 0),
    'M': (5, 0), 'N': (4, 0), 'O': (5, 10), 'P': (7, 4), 'Q': (7, 10), 'R': (10, 4),
    'S': (6, 10), 'T': (4, 0), 'U': (5, 4), 'V': (3, 0), 'W': (5, 0), 'X': (4, 0),
    'Y': (4, 0), 'Z': (4, 0),
    'a': (9, 12), 'b': (7, 10), 'c': (5, 8), 'd': (7, 10), 'e': (7, 8), 'f': (5, 4),
    'g': (9, 14), 'h': (6, 4), 'i': (3, 0), 'j': (4, 4), 'k': (5, 0), 'l': (2, 0),
    'm': (9, 8), 'n': (5, 4), 'o': (5, 10), 'p': (7, 10), 'q': (7, 10), 'r': (5, 2),
    's': (6, 10), 't': (4, 0), 'u': (5, 4), 'v': (3, 0), 'w': (5, 0), 'x': (4, 0),
    'y': (4, 0), 'z': (4, 0),
}


#: La fenêtre sur laquelle on cherche un extremum cardinal, en points de la
#: polyligne densifiée (donc ×3 unités). ⚠️ **UNE FENÊTRE ÉTROITE NE VOIT PAS LES
#:   GRANDS RAYONS.** Au sommet d'un cercle de rayon 300, l'ordonnée ne bouge que
#:   de r²/2R = 0,06 unité sur six ; le changement de signe s'y noie dans le
#:   bruit d'échantillonnage. Sur trente-six unités elle bouge de 2,2, ce qui se
#:   voit. C'est ce défaut-là qui rendait un `O` en UN nœud et un `C` en deux.
FENETRE_CARDINALE = 12


def _cardinales(P, a, b, cyclique=False):
    """Les indices de `P[a..b]` où la tangente devient horizontale ou verticale.

    ★ **C'EST LA CONVENTION DES DESSINATEURS DE FONTES, et l'auteur l'énonce :**

    > « aux extrema, une poignée est horizontale ou verticale — jamais
    >   oblique. » (l'auteur)

    Un nœud se pose au point le plus haut, le plus bas, le plus à gauche ou le
    plus à droite d'une courbe. Compter ces points-là, c'est compter ce que la
    lettre DEMANDE — ni le relevé, ni le goût.
    """
    w = FENETRE_CARDINALE
    n = b - a + 1
    out = []
    for j in range(n) if cyclique else range(w, n - w):
        i = a + j
        av = P[a + (j - w) % n] if cyclique else P[i - w]
        ap = P[a + (j + w) % n] if cyclique else P[i + w]
        for k in (0, 1):
            u = P[i][k] - av[k]
            v = ap[k] - P[i][k]
            if u * v < 0 and abs(u) + abs(v) > 0.5:
                out.append(i)
                break
    net = []
    for i in out:
        if not net or i - net[-1] > w:
            net.append(i)
    return net


def budget_mesure():
    """Ce que chaque signe DEMANDE : nœuds aux coins et aux extrema, cubiques entre."""
    M = mesures()
    R = recettes(M)
    out = {}
    for ch in SIGNES:
        noeuds, poignees = set(), 0
        for trait in R[ch][0]:
            P = [(x, y) for x, y in _polyligne(trait['d'])]
            if len(P) < 2:
                noeuds.add((round(P[0][0], 1), round(P[0][1], 1)) if P else (0, 0))
                continue
            if not trait['ouvert']:
                # ⚠️ **UNE BOUCLE SE LIT CYCLIQUEMENT, et c'est tout le défaut que
                #   `glyphes.test.js` porte encore en `todo` du côté JetBrains** :
                #   « la mesure d'un trait fermé n'est pas lue cycliquement, ses
                #   deux bouts sont deux points distincts ». Ici on la lit en
                #   rond : l'ovale sort en QUATRE quadrants, quatre nœuds, huit
                #   poignées — et aucun sommet n'échappe à la couture.
                cuts = _cardinales(P, 0, len(P) - 1, cyclique=True)
                for i in cuts:
                    noeuds.add((round(P[i][0], 1), round(P[i][1], 1)))
                poignees += 2 * max(1, len(cuts))
                continue
            bornes = [0] + _coins(P) + [len(P) - 1]
            morceaux = []
            for a, b in zip(bornes, bornes[1:]):
                cuts = [a] + _cardinales(P, a, b) + [b]
                morceaux += list(zip(cuts, cuts[1:]))
            for a, b in morceaux:
                noeuds.add((round(P[a][0], 1), round(P[a][1], 1)))
                noeuds.add((round(P[b][0], 1), round(P[b][1], 1)))
                if _fleche(P, a, b) >= DROIT:
                    poignees += 2
        out[ch] = (len(noeuds), poignees)
    return out


def _polyligne(d, pas=3.0):
    """Un `d` en points, densément — pour recompter ce qu'il demande."""
    pts = points_du_trace(d)
    out = []
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.dist(a, b) / pas))
        out += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
                for i in range(n)]
    if pts:
        out.append(pts[-1])
    return out


# ═══════════════════════════════════════════════════════════════════════════

def controler(R, M):
    """Chaque guide tient-il dans la boîte de l'axe de son signe ?

    ⚠️ La tolérance est SERRÉE — deux unités — et elle peut l'être : le guide est
      ici l'axe extrait lui-même, pas un arc deviné sur des cotes. Chez
      JetBrains il fallait laisser un demi-fût de jeu.
    """
    ecarts = []
    for ch in SIGNES:
        o = M['boites'][ch]
        b = None
        for tr in R[ch][0]:
            t = boite_du_trace(tr['d'])
            b = t if b is None else {'x0': min(b['x0'], t['x0']), 'x1': max(b['x1'], t['x1']),
                                     'y0': min(b['y0'], t['y0']), 'y1': max(b['y1'], t['y1'])}
        debords = []
        for cle, signe in (('x0', -1), ('y0', -1), ('x1', 1), ('y1', 1)):
            e = signe * (b[cle] - o[cle])
            if e > 2.0:
                debords.append('déborde en %s de %s' % (cle, r(e)))
            elif e < -FUT / 2:
                debords.append('n’atteint pas %s, à %s près' % (cle, r(-e)))
        if debords:
            ecarts.append((ch, ', '.join(debords)))
    return ecarts


def main():
    if '--noeuds' in sys.argv:
        # ★ Les indices que `LECTURE` cite pour les huit fourches se lisent ICI,
        #   et nulle part ailleurs. Sans cette sortie, ils seraient huit suites de
        #   nombres qu'aucun lecteur ne pourrait vérifier.
        for ch in sys.argv[sys.argv.index('--noeuds') + 1:] or list('nmuxyTXY'):
            for k, c in enumerate(effondre(ch)):
                sur = [p for p in c if p[2] != 'o']
                print('%s[%d] %d nœuds sur-courbe :' % (ch, k, len(sur)))
                print('   ' + '  '.join('%d:(%.0f,%.0f)' % (i, p[0], p[1])
                                        for i, p in enumerate(sur)))
        return
    if '--familles' in sys.argv:
        print('— le résidu de l’involution, contour par contour —')
        for ch in SIGNES:
            for k, a in enumerate(_axes(ch)):
                print('  %s[%d] %-8s résidu %7.2f  L %7.1f' % (ch, k, a[1], a[2], a[3]))
        return
    M = mesures()
    if '--budget' in sys.argv:
        b = budget_mesure()
        print('BUDGET = {')
        for ligne in (SIGNES[26:], SIGNES[:26]):
            for i in range(0, len(ligne), 6):
                print('    ' + ' '.join("%r: (%d, %d)," % (c, b[c][0], b[c][1])
                                        for c in ligne[i:i + 6]))
        print('}')
        return

    print('— mesuré dans %s v%s, à l’échelle du repère (capitale = 600) —'
          % (DONNEES['police'], DONNEES['version']))
    print('  fût %s · hauteur d’x %s · capitale %d · l’encre s’annule à wght %s'
          % (r(M['fut']), r(M['hauteurX']), M['capitale'], r(MAIGRE)))
    familles = {}
    for ch in SIGNES:
        for a in _axes(ch):
            familles[a[1]] = familles.get(a[1], 0) + 1
    print('  contours : %s' % ', '.join('%d %s' % (v, k) for k, v in sorted(familles.items())))
    R = recettes(M)
    ecarts = controler(R, M)
    if ecarts:
        print('  ⚠️  %d guide(s) hors de la boîte de leur axe :' % len(ecarts))
        for ch, quoi in ecarts:
            print('      %s  → %s' % (ch, quoi))
    else:
        print('  ✓ les %d guides tiennent dans la boîte de leur axe.' % len(R))

    lignes = ["/* ⚠️ ENGENDRÉ par `src/gfx/jost-traces.py` — ne pas éditer à la main.",
              " *",
              " * Les tracés CANDIDATS dérivés de Jost. Ils ne sont PAS ceux du moteur :",
              " * `moteur/tables/glyphes.js` fait toujours foi, et Jost n'est pour l'instant",
              " * qu'une VARIANTE À L'ÉTUDE — il n'y a pas de `--adopter` de ce côté-ci.",
              " */",
              "export const CANDIDATS = {"]
    for ch in SIGNES:
        traits, jonctions = R[ch]
        lignes.append("  %s: { traits: [%s], jonctions: %s }," % (
            repr(ch),
            ', '.join("{ d: %s, ouvert: %s }" % (repr(x['d']), 'true' if x['ouvert'] else 'false')
                      for x in traits),
            '[' + ', '.join('[%d, %d, %s]' % (j[0], j[1], repr(j[2])) for j in jonctions) + ']'))
    lignes.append("};")
    lignes.append("")
    lignes.append("/** Les mesures relevées dans Jost, à l'échelle du repère du moteur. */")
    lignes.append("export const MESURES = { avance: %s, fut: %s, hauteurX: %s, capitale: %d };"
                  % (r(M['avance']), r(M['fut']), r(M['hauteurX']), M['capitale']))
    CIBLE.write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_jost-candidats.js (%d signes)' % len(R))


if __name__ == '__main__':
    main()
