#!/usr/bin/env python3
"""Dérive la BARRE HAUTE du « 6 » depuis JetBrains Mono — le calage des cornes.

    python3 src/gfx/jetbrains-six.py            # réécrit le bloc de assets.js
    python3 src/gfx/jetbrains-six.py --check    # échoue si le bloc a dérivé

★ Pourquoi ce script existe.

Les deux cornes de `primitives/horns.js` ne sont pas posées « au-dessus des 6 » :
elles sont CALÉES SUR LE DESSIN DU CHIFFRE. L'auteur l'a demandé mot pour mot —
« que le côté droit de la corne droite soit dans le prolongement du côté droit de
la barre du 6 de droite, et que la pointe droite de la corne de gauche arrive sur
la pointe en haut à droite de la barre du 6 de gauche ».

Une coïncidence géométrique de cette nature ne se règle pas à l'œil, et elle ne
se recopie pas non plus : la doctrine du projet est que **la géométrie affichée
est extraite de la police, jamais transcrite à la main** (CONTRACTS §0.3, règle
structurelle). `dseg14-table.py` le fait pour la TABLE des segments,
`dseg-segments.py` pour leur TRACÉ ; celui-ci le fait pour les trois nombres
dont les cornes ont besoin. Une main qui retoucherait `SIX_BARRE` pour « mieux
placer » les cornes referait exactement ce que la règle interdit — et la CI
l'attrapera (`bun run segments:check`).

★ Ce qu'il relève, et pourquoi ces trois nombres-là.

Le contour du « 6 » de JetBrains Mono porte sa barre haute sous forme de trois
segments DROITS : la montée oblique s'achève en `(313, 730)`, le sommet est
plat jusqu'à `(413, 730)`, puis le flanc droit redescend vers `(206, 398)`.
Il suffit donc de chercher, parmi les segments rectilignes du contour, celui
qui est horizontal et le plus haut : c'est le sommet de la barre. Son extrémité
DROITE est le point que les cornes doivent toucher, et le segment qui en part
donne la DIRECTION que la corne droite doit prolonger.

Rien n'est cherché par index dans le contour : si la police change, le script
retrouve la barre ou refuse — il ne rend jamais un chiffre faux en silence.

★ Trois contrôles croisés, et ils ne sont pas décoratifs.

Le sommet de la barre est à `y = 730`, c'est-à-dire EXACTEMENT la hauteur de
capitale déclarée par la police — ce que `horns.js` appelle la « ligne de
crâne » et que `constants.js` fige en `CAP_RATIO`. La chasse, elle, doit valoir
`ADVANCE_RATIO`. Le script vérifie les deux contre `src/visuel/constants.js` :
c'est ce qui garantit que le repère dans lequel la primitive pose ses cornes est
bien celui dans lequel la police dessine son chiffre. Il vérifie enfin que
l'instance par défaut de la fonte variable est bien `wght 400`, la graisse à
laquelle la scène affiche ses jetons.

Outil de build, comme `logo-jost-trace.py` et `dseg-segments.py` : jamais chargé
par le navigateur. Dépendance : `fontTools` (et `brotli` pour lire un woff2).
"""

import os
import re
import sys

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

RACINE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(RACINE, 'src', 'visuel', 'assets.js')
CONSTANTS = os.path.join(RACINE, 'src', 'visuel', 'constants.js')
POLICE = os.path.join(RACINE, 'src', 'fonts', 'jetbrains-mono-var.woff2')
DEBUT = '/* six:début */'
FIN = '/* six:fin */'

# La graisse à laquelle la scène affiche ses jetons : aucune règle CSS ne pose
# `font-weight` sur `.nhl-token`, donc c'est `normal`, donc 400.
GRAISSE = 400


def segments_droits(glyphset, nom):
    """Les segments RECTILIGNES du contour, en (départ, arrivée).

    Seuls les `lineTo` en sont : une courbe n'a pas de « côté droit » dont on
    pourrait dire qu'une corne le prolonge. Le point courant est suivi à travers
    les courbes pour que les segments droits restent à leur place."""
    pen = RecordingPen()
    glyphset[nom].draw(pen)
    droits, courant, depart = [], None, None
    for op, args in pen.value:
        if op == 'moveTo':
            courant = depart = args[0]
        elif op == 'lineTo':
            droits.append((courant, args[0]))
            courant = args[0]
        elif op in ('qCurveTo', 'curveTo'):
            courant = args[-1] if args[-1] is not None else depart
        elif op == 'closePath':
            courant = depart
    return droits


def barre_haute(droits):
    """Le sommet plat de la barre et le segment qui en part vers le bas.

    Le sommet est le segment HORIZONTAL le plus haut du contour ; le flanc droit
    est celui qui commence à son extrémité droite. Le contour du « 6 » est
    parcouru dans un sens qui l'amène ainsi — et si ce n'était plus le cas, le
    script échoue plutôt que de deviner."""
    plats = [(a, b) for a, b in droits if a[1] == b[1]]
    if not plats:
        raise SystemExit('« 6 » : aucun segment horizontal — la barre haute a changé de dessin.')
    a, b = max(plats, key=lambda s: s[0][1])
    gauche, sommet = (a, b) if a[0] < b[0] else (b, a)
    suites = [s for s in droits if s[0] == sommet]
    if len(suites) != 1:
        raise SystemExit(f'« 6 » : {len(suites)} segments droits partent du sommet {sommet} — '
                         'le flanc droit de la barre n’est plus identifiable.')
    _, bas = suites[0]
    if bas[1] >= sommet[1]:
        raise SystemExit(f'« 6 » : le segment qui part du sommet {sommet} ne redescend pas '
                         f'(il va vers {bas}) — ce n’est pas le flanc droit de la barre.')
    return gauche, sommet, bas


def constante(nom):
    """La valeur d'une constante numérique de `src/visuel/constants.js`."""
    src = open(CONSTANTS, encoding='utf-8').read()
    m = re.search(rf'^export const {nom} = ([0-9.]+);', src, re.M)
    if not m:
        raise SystemExit(f'constants.js : « {nom} » introuvable.')
    return float(m.group(1))


def releve():
    police = TTFont(POLICE)
    if 'fvar' in police:
        wght = next((a for a in police['fvar'].axes if a.axisTag == 'wght'), None)
        if wght is None or wght.defaultValue != GRAISSE:
            raise SystemExit(f'{POLICE} : l’instance par défaut n’est pas wght {GRAISSE} — '
                             'la scène n’afficherait pas le chiffre relevé ici.')
    upem = police['head'].unitsPerEm
    cmap, glyphset = police.getBestCmap(), police.getGlyphSet()
    nom = cmap[ord('6')]
    chasse = police['hmtx'][nom][0]
    gauche, sommet, bas = barre_haute(segments_droits(glyphset, nom))

    # ── Contrôles croisés — le repère de la primitive EST celui de la police ──
    capitale = police['OS/2'].sCapHeight
    if sommet[1] != capitale:
        raise SystemExit(f'« 6 » : la barre haute est à y={sommet[1]} et la hauteur de capitale '
                         f'vaut {capitale} — la « ligne de crâne » de horns.js n’est plus le '
                         'sommet du chiffre.')
    if abs(capitale / upem - constante('CAP_RATIO')) > 1e-9:
        raise SystemExit(f'CAP_RATIO vaut {constante("CAP_RATIO")} et la police dit '
                         f'{capitale / upem} — les cornes se poseraient à côté du crâne.')
    if abs(chasse / upem - constante('ADVANCE_RATIO')) > 1e-9:
        raise SystemExit(f'ADVANCE_RATIO vaut {constante("ADVANCE_RATIO")} et la police dit '
                         f'{chasse / upem} — le centre du jeton ne serait pas celui du glyphe.')

    return {
        'source': f"{police['name'].getDebugName(4)} {police['name'].getDebugName(5)}",
        'upem': upem,
        'chasse': chasse,
        'gauche': gauche,
        'sommet': sommet,
        'bas': bas,
    }


def bloc(r):
    upem = r['upem']
    sx, sy = r['sommet']
    gx, _ = r['gauche']
    bx, by = r['bas']
    pente = (sx - bx) / (sy - by)

    def em(v):
        return f'{round(v / upem, 6):g}'

    return '\n'.join([
        '',
        '/**',
        ' * La BARRE HAUTE du « 6 », relevée sur le contour de JetBrains Mono.',
        ' *',
        ' * ★ DÉRIVÉE, jamais saisie : `src/gfx/jetbrains-six.py` cherche dans le contour',
        ' * le segment horizontal le plus haut — le sommet plat de la barre — et le',
        ' * segment droit qui en part. Relancez le script pour vérifier que ce bloc n’a',
        ' * pas dérivé ; la CI le fait (`bun run segments:check`).',
        ' *',
        ' * ★ À quoi ça sert. `primitives/horns.js` y CALE les deux cornes du 666 : la',
        ' * corne de droite pousse dans le prolongement exact du flanc droit de la barre',
        ' * du 6 de droite, et la corne de gauche vient toucher le sommet de celle du 6',
        ' * de gauche. Sans ces trois nombres, l’écartement des cornes serait un réglage',
        ' * à l’œil — c’est-à-dire quelque chose qu’on rerègle, et qui se déplace.',
        ' *',
        ' * Unités : des **em**, donc multipliables par `fontSize`. `sommetX` et',
        ' * `gaucheX` se comptent depuis l’ORIGINE du glyphe (le bord gauche de sa',
        ' * chasse), pas depuis son centre : c’est au consommateur de retrancher la',
        ' * demi-chasse RÉELLE (`metrics.advance`, recalibrée sur la police servie).',
        ' * `sommetY` se compte au-dessus de la ligne de base, et vaut la hauteur de',
        ' * capitale — le script échoue si ce n’est plus vrai.',
        ' */',
        f'// {r["source"]} — « 6 », wght {GRAISSE}.',
        'export const SIX_BARRE = Object.freeze({',
        ligne('sommetX', em(sx), 'sommet DROIT de la barre — le point que les cornes touchent'),
        ligne('sommetY', em(sy), '= hauteur de capitale : la « ligne de crâne »'),
        ligne('gaucheX', em(gx), f'sommet gauche : la barre fait {em(sx - gx)} em de large'),
        ligne('pente', f'{round(pente, 6):g}', 'dx/dy du flanc droit, EN MONTANT (vers la droite)'),
        ligne('chasse', em(r['chasse']), 'la chasse de la police, pour mémoire'),
        '});',
        '',
    ])


def ligne(cle, valeur, note):
    """Une entrée de la table, commentaire aligné en colonne."""
    return f'  {cle}: {valeur},'.ljust(24) + f'// {note}'


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
    contenu = bloc(releve())
    if '--check' in sys.argv[1:]:
        src = open(ASSETS, encoding='utf-8').read()
        i = src.index(DEBUT) + len(DEBUT)
        j = src.index(FIN, i)
        if src[i:j] != contenu:
            raise SystemExit('assets.js : le bloc « six » a dérivé de la police. '
                             'Relancez `bun run segments`.')
        print('assets.js : bloc « six » conforme à JetBrains Mono.')
        return
    change = injecter(ASSETS, DEBUT, FIN, contenu)
    print(('réécrit' if change else 'inchangé') + f' : {ASSETS}')


if __name__ == '__main__':
    main()
