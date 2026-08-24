#!/usr/bin/env python3
"""Dérive la table SEG14 de `src/moteur/tables/seg14.js` depuis la POLICE.

    python3 src/gfx/dseg14-table.py src/fonts/dseg14-classic.woff2

★ Pourquoi ce script existe.

`src/moteur/tables/seg7.js` est saisie à la main d'après la recherche, et le
prix en est écrit dans sa « réserve de fidélité » : la police du Registre
(DSEG7 Classic) dessine SA version des lettres, qui diverge de la table sur
12 des 36 signes. Le Registre peut donc y montrer un glyphe dont on ne
retrouve pas, en le comptant, le nombre annoncé à côté.

La table du quatorze segments ne pouvait pas répéter cette faute. Elle n'est
pas saisie : elle est DÉRIVÉE de DSEG14 Classic v0.46 (Keshikan, OFL 1.1) —
la police même que Le Registre affiche. Dans cette police, chaque segment
allumé est un CONTOUR FERMÉ du glyphe : il suffit de classer les contours par
la position de leur centre pour lire, sans interprétation, ce que la police
allume. Ce script fait exactement cela, et réimprime la table telle qu'elle
figure dans `seg14.js`. Relancez-le pour vérifier qu'elle n'a pas dérivé.

Outil de build, comme `logo-jost-trace.py` : jamais chargé par le navigateur.
Dépendance : `fontTools` (et `brotli` pour lire un woff2).
"""

import math
import sys

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

# Centre de chacun des quatorze segments dans le repère de la police
# (unitsPerEm = 1000 ; l'afficheur occupe x 99..717, y 0..1000).
CENTRES = {
    'a': (408, 953), 'b': (670, 732), 'c': (670, 267), 'd': (408, 46),
    'e': (145, 267), 'f': (145, 732), 'g1': (270, 500), 'g2': (545, 500),
    'h': (276, 727), 'i': (408, 704), 'j': (539, 727), 'k': (276, 273),
    'l': (408, 296), 'm': (539, 273),
}
ORDRE = ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm']
SIGNES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'


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
        elif op in ('lineTo', 'qCurveTo', 'curveTo'):
            courant.extend([p for p in args if p])
        elif op == 'closePath':
            out.append(courant)
            courant = []
    if courant:
        out.append(courant)
    return out


def segments(glyphset, cmap, signe):
    """Les segments allumés d'un signe — un contour, un segment."""
    allumes = set()
    for contour in contours(glyphset, cmap[ord(signe)]):
        xs = [p[0] for p in contour]
        ys = [p[1] for p in contour]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        nom = min(CENTRES, key=lambda k: (CENTRES[k][0] - cx) ** 2 + (CENTRES[k][1] - cy) ** 2)
        ecart = math.hypot(CENTRES[nom][0] - cx, CENTRES[nom][1] - cy)
        if ecart > 40:
            raise SystemExit(f'{signe} : contour centré en ({cx:.0f},{cy:.0f}) — aucun segment connu.')
        if nom in allumes:
            raise SystemExit(f'{signe} : deux contours pour le segment {nom}.')
        allumes.add(nom)
    return [s for s in ORDRE if s in allumes]


def fusion(allumes):
    """Traits continus fusionnés — miroir de `fusion14` (`tables/seg14.js`)."""
    on = set(allumes)
    n = sum(1 for s in ('a', 'd') if s in on)
    n += sum(1 for couple in (('g1', 'g2'), ('b', 'c'), ('e', 'f'), ('i', 'l'))
             if on & set(couple))
    n += sum(1 for s in ('h', 'j', 'k', 'm') if s in on)
    return n


def main():
    chemin = sys.argv[1] if len(sys.argv) > 1 else 'src/fonts/dseg14-classic.woff2'
    police = TTFont(chemin)
    glyphset, cmap = police.getGlyphSet(), police.getBestCmap()
    nom = str(police['name'].getDebugName(4))
    version = str(police['name'].getDebugName(5))

    table = {c: segments(glyphset, cmap, c) for c in SIGNES}
    lettres = SIGNES[10:]

    print(f'// dérivé de {nom} {version} — {chemin}')
    for c in SIGNES:
        print(f"  {c}: t('{' '.join(table[c])}'),")
    print()
    print('Σ segments, 26 lettres :', sum(len(table[c]) for c in lettres))
    print('Σ traits fusionnés     :', sum(fusion(table[c]) for c in lettres))
    print('lettres à 6 segments   :', ' '.join(c for c in lettres if len(table[c]) == 6))
    print('lettres à 6 traits     :', ' '.join(c for c in lettres if fusion(table[c]) == 6) or '(aucune)')


if __name__ == '__main__':
    main()
