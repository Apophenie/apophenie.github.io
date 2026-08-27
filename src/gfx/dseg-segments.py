#!/usr/bin/env python3
"""Dérive la GÉOMÉTRIE des afficheurs à segments depuis les polices DSEG.

    python3 src/gfx/dseg-segments.py            # réécrit le bloc de assets.js
    python3 src/gfx/dseg-segments.py --check    # échoue si le bloc a dérivé

★ Pourquoi ce script existe.

`src/visuel/assets.js` porte DEUX géométries d'afficheur, et ce n'est pas une
redondance : ce sont deux régimes de lecture.

· **Fusion** (`me`, `mx` — « traits continus ») : on montre que `b` et `c` n'en
  font qu'UN. Les segments doivent donc se SOUDER, et ils sont dessinés en
  traits d'axe (`SEGMENTS`, `SEGMENTS14`), colinéaires et jointifs. Un dessin de
  police, aux segments séparés par une fente, dirait exactement le contraire.

· **Comptage individuel** (`m.seg7`, `m.seg14`) : on compte les segments un par
  un. Ils
  doivent alors être DISJOINTS — deux segments qui se recouvrent, ce sont deux
  choses comptées et une seule vue — et, tant qu'à les montrer un par un, autant
  qu'ils soient ceux de la police que Le Registre affiche vraiment.

D'où ce script, jumeau de `dseg14-table.py` : dans DSEG7 et DSEG14 Classic,
**chaque segment allumé est un contour fermé du glyphe**. Il suffit donc de
classer les contours par la position de leur centre pour lire, sans
interprétation, le dessin exact de chaque segment. Le script relève ce dessin
sur TOUS les signes, vérifie qu'il ne varie pas d'un signe à l'autre, le
transpose dans le repère glyphe du moteur visuel (0..400 × 0..600, origine en
bas à gauche) et réimprime la table dans `assets.js`.

★ La transposition est une SIMILITUDE — même facteur en x et en y. Déformer le
dessin pour le faire entrer dans un cadre plus étroit ferait mentir le mot
« correspondre » : les diagonales n'auraient plus l'angle de la police, et
l'épaisseur des barres varierait avec leur orientation. Le cadre retenu garde
la HAUTEUR de l'ancien afficheur ; la largeur est celle que la police impose.

Outil de build, comme `logo-jost-trace.py` : jamais chargé par le navigateur.
Dépendance : `fontTools` (et `brotli` pour lire un woff2).
"""

import math
import os
import sys

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

RACINE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(RACINE, 'src', 'visuel', 'assets.js')
DEBUT = '/* dseg:début */'
FIN = '/* dseg:fin */'

SIGNES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

# Centre de chaque segment dans le repère de la police (unitsPerEm = 1000 ;
# l'afficheur occupe x 99..717, y 0..1000). Les quatorze de `dseg14-table.py`,
# et les sept qui en sont le sous-ensemble.
CENTRES14 = {
    'a': (408, 953), 'b': (670, 732), 'c': (670, 267), 'd': (408, 46),
    'e': (145, 267), 'f': (145, 732), 'g1': (270, 500), 'g2': (545, 500),
    'h': (276, 727), 'i': (408, 704), 'j': (539, 727), 'k': (276, 273),
    'l': (408, 296), 'm': (539, 273),
}
CENTRES7 = {
    'a': (408, 953), 'b': (670, 732), 'c': (670, 267), 'd': (408, 46),
    'e': (145, 267), 'f': (145, 732), 'g': (408, 500),
}
ORDRE7 = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
ORDRE14 = ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm']

# Le repère glyphe du moteur visuel, et le cadre que l'afficheur y occupe.
# `HAUT`/`BAS` reprennent l'encombrement vertical de l'ancien tracé (SEG_B..SEG_T
# élargi d'une demi-épaisseur de trait) : la lettre garde exactement la place
# qu'elle avait dans l'encart.
BOITE_W, BOITE_H = 400, 600
BAS, HAUT = 42, 558
POLICE_X0, POLICE_X1 = 99, 717
POLICE_Y0, POLICE_Y1 = 0, 1000


def contours(glyphset, nom):
    """Les contours fermés d'un glyphe, en listes de points."""
    pen = RecordingPen()
    glyphset[nom].draw(pen)
    out, courant = [], []
    for op, args in pen.value:
        if op == 'moveTo':
            if courant:
                out.append(courant)
            courant = [args[0]]
        elif op == 'lineTo':
            courant.extend(args)
        elif op in ('qCurveTo', 'curveTo'):
            raise SystemExit(f'{nom} : contour courbe — les segments DSEG sont des polygones.')
        elif op == 'closePath':
            out.append(courant)
            courant = []
    if courant:
        out.append(courant)
    return out


def sans_alignes(pts):
    """Retire les sommets qui ne plient pas : deux contours du même segment
    n'ont pas les mêmes points d'appui d'un signe à l'autre (la police en pose
    là où un voisin s'approche), mais ils ont le même POLYGONE."""
    n = len(pts)
    garde = []
    for i in range(n):
        ax, ay = pts[(i - 1) % n]
        bx, by = pts[i]
        cx, cy = pts[(i + 1) % n]
        if abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) > 1e-6:
            garde.append((bx, by))
    return garde


def canonique(pts):
    """Même polygone, toujours écrit pareil : sens direct, départ au sommet le
    plus bas puis le plus à gauche. Deux relevés du même segment deviennent
    alors comparables — et la sortie du script ne dépend d'aucun détail
    d'implémentation de fontTools."""
    pts = sans_alignes(pts)
    aire = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
               for i in range(len(pts)))
    if aire < 0:
        pts = pts[::-1]
    k = min(range(len(pts)), key=lambda i: (pts[i][1], pts[i][0]))
    return tuple(pts[k:] + pts[:k])


def releve(chemin, centres):
    """Le polygone de chaque segment, relevé sur TOUS les signes de la police.

    Un segment dessiné différemment selon le signe rendrait la table
    ambiguë : le script refuse plutôt que de choisir."""
    police = TTFont(chemin)
    glyphset, cmap = police.getGlyphSet(), police.getBestCmap()
    formes = {}
    for signe in SIGNES:
        for contour in contours(glyphset, cmap[ord(signe)]):
            xs = [p[0] for p in contour]
            ys = [p[1] for p in contour]
            cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
            nom = min(centres, key=lambda k: (centres[k][0] - cx) ** 2 + (centres[k][1] - cy) ** 2)
            if math.hypot(centres[nom][0] - cx, centres[nom][1] - cy) > 40:
                raise SystemExit(f'{signe} : contour centré en ({cx:.0f},{cy:.0f}) — aucun segment connu.')
            forme = canonique(contour)
            if nom in formes and formes[nom] != forme:
                raise SystemExit(f'segment {nom} : deux dessins différents (vu sur « {signe} »).')
            formes[nom] = forme
    manque = [n for n in centres if n not in formes]
    if manque:
        raise SystemExit(f'{chemin} : segments jamais allumés — {", ".join(manque)}.')
    nom = str(police['name'].getDebugName(4))
    return formes, f"{nom} {police['name'].getDebugName(5)}"


def transposer(pts):
    """Repère police → repère glyphe du moteur visuel. Similitude, centrée."""
    s = (HAUT - BAS) / (POLICE_Y1 - POLICE_Y0)
    cxp = (POLICE_X0 + POLICE_X1) / 2
    cyp = (POLICE_Y0 + POLICE_Y1) / 2
    return [(round(BOITE_W / 2 + (x - cxp) * s, 2), round(BOITE_H / 2 + (y - cyp) * s, 2))
            for x, y in pts]


def chemin_svg(pts):
    def n(v):
        return f'{v:g}'
    corps = ' '.join(f'L {n(x)} {n(y)}' for x, y in pts[1:])
    return f'M {n(pts[0][0])} {n(pts[0][1])} {corps} Z'


def bloc(formes7, source7, formes14, source14):
    lignes = []
    lignes.append('')
    lignes.append('/**')
    lignes.append(' * Les segments **tels que les dessine la police** — un polygone plein par')
    lignes.append(' * segment, disjoint de ses voisins, dans le repère glyphe (0..400 × 0..600,')
    lignes.append(' * origine en bas à gauche).')
    lignes.append(' *')
    lignes.append(' * ★ DÉRIVÉ, jamais saisi : `src/gfx/dseg-segments.py` relève chaque contour')
    lignes.append(' * fermé des polices DSEG et le transpose par une similitude. Relancez le')
    lignes.append(' * script pour vérifier que ce bloc n’a pas dérivé — la CI le fait.')
    lignes.append(' *')
    # ★ Les opérateurs sont nommés par leur IDENTIFIANT, pas par leur code.
    #   Les codes sont courts et destinés à l'URL ; ils ont déjà été renommés une
    #   fois en bloc, et ce commentaire généré citait encore `md` et `mw` quand
    #   le catalogue disait `m7` et `m14` — la CI l'a vu, et elle avait raison.
    #   Les identifiants, eux, ne bougent pas.
    lignes.append(' * Ces tracés servent au COMPTAGE INDIVIDUEL (`m.seg7`, `m.seg14`), où deux')
    lignes.append(' * segments')
    lignes.append(' * qui se recouvrent seraient deux choses comptées pour une seule vue. Le')
    lignes.append(' * régime de FUSION garde les traits d’axe de `SEGMENTS` / `SEGMENTS14` : là,')
    lignes.append(' * il FAUT que les colinéaires se soudent.')
    lignes.append(' */')
    for var, formes, ordre, source in (
        ('SEGMENTS_DSEG7', formes7, ORDRE7, source7),
        ('SEGMENTS_DSEG14', formes14, ORDRE14, source14),
    ):
        lignes.append(f'// {source} — segments pleins, disjoints.')
        lignes.append(f'export const {var} = Object.freeze({{')
        for nom in ordre:
            lignes.append(f"  {nom}: {{ d: '{chemin_svg(transposer(formes[nom]))}' }},")
        lignes.append('});')
        lignes.append('')
    return '\n'.join(lignes)


def injecter(chemin, debut, fin, contenu):
    """Remplace ce qui est entre deux balises repères, et rien d'autre."""
    src = open(chemin, encoding='utf-8').read()
    i = src.index(debut) + len(debut)
    j = src.index(fin, i)
    neuf = src[:i] + contenu + src[j:]
    if neuf != src:
        open(chemin, 'w', encoding='utf-8').write(neuf)
    return neuf != src


def main():
    controle = '--check' in sys.argv[1:]
    formes7, source7 = releve(os.path.join(RACINE, 'src', 'fonts', 'dseg7-classic.woff2'), CENTRES7)
    formes14, source14 = releve(os.path.join(RACINE, 'src', 'fonts', 'dseg14-classic.woff2'), CENTRES14)
    contenu = bloc(formes7, source7, formes14, source14)
    if controle:
        src = open(ASSETS, encoding='utf-8').read()
        i = src.index(DEBUT) + len(DEBUT)
        j = src.index(FIN, i)
        if src[i:j] != contenu:
            raise SystemExit('assets.js : le bloc « dseg » a dérivé de la police. '
                             'Relancez `bun run segments`.')
        print('assets.js : bloc « dseg » conforme aux polices.')
        return
    change = injecter(ASSETS, DEBUT, FIN, contenu)
    print(('réécrit' if change else 'inchangé') + f' : {ASSETS}')


if __name__ == '__main__':
    main()
