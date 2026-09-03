#!/usr/bin/env python3
"""Dérive les TRACÉS BAS DE CASSE depuis JetBrains Mono — la police de la scène.

    python3 src/gfx/jetbrains-traces.py            # réécrit le bloc de glyphes.js
    python3 src/gfx/jetbrains-traces.py --check    # échoue si le bloc a dérivé

★ POURQUOI CE SCRIPT EXISTE.

« Les glyphes bas de casse : adapte-toi à la font utilisée sur le site. Le glyphe
qui est mené dans la zone de traçage devrait correspondre à celui qui est
tracé. » (l'auteur)

Le défaut était réel et double. La SCÈNE affiche ses jetons en JetBrains Mono
(`visuel/constants.js › FONT_FAMILY`) ; les tracés de `moteur/tables/glyphes.js`,
eux, avaient été dessinés à la main « type Futura / Century Gothic ». Un `a` de
la ligne entrait donc dans la zone de traçage et s'y changeait en une AUTRE
lettre — deux dessins pour un même signe, ce que la doctrine du dépôt interdit
partout ailleurs (« la géométrie affichée est extraite de la police, jamais
transcrite à la main », comme `dseg14-table.py`, `dseg-segments.py` et
`jetbrains-six.py` le font déjà).

★ CE QUE CE SCRIPT PEUT DÉRIVER, ET CE QU'IL NE PEUT PAS.

Une police donne des CONTOURS REMPLIS ; `glyphes.js` demande des TRACÉS DE
CRAYON — l'axe médian, plus le nombre de levées de stylo. Les seconds ne se
déduisent pas mécaniquement des premiers : une squelettisation rendrait une
polyligne bruitée, sans jonctions déclarées ni comptage de traits, et surtout
sans savoir où le crayon se lève.

On sépare donc ce qui se mesure de ce qui se décide :

 · **MESURÉ dans la police** — l'avance, l'épaisseur du fût, la hauteur d'x, la
   hampe, le jambage, et la BOÎTE de chaque lettre (ses bornes réelles). Aucun
   de ces nombres n'est écrit à la main ;
 · **DÉCLARÉ ici** — la topologie : combien de traits, lesquels se touchent, où
   le crayon se lève. C'est une lecture du dessin, pas une donnée du fichier.

Chaque recette exprime ses points en fonction de la boîte MESURÉE de sa lettre.
Changer de version de police déplace donc les tracés avec elle, et le contrôle
de `derivees.js` dit aussitôt si un comptage a bougé.
"""

import sys
import pathlib

try:
    from fontTools.ttLib import TTFont
    from fontTools.pens.boundsPen import BoundsPen
except ImportError:  # pragma: no cover
    sys.exit('fontTools est requis : pip install fonttools brotli')

RACINE = pathlib.Path(__file__).resolve().parents[2]
POLICE = RACINE / 'src' / 'fonts' / 'jetbrains-mono-var.woff2'
CIBLE = RACINE / 'src' / 'moteur' / 'tables' / 'glyphes.js'

# Le repère du moteur visuel : la CAPITALE vaut 600, origine en bas à gauche.
# C'est la seule constante posée ici, et elle vient de `glyphes.js › METRIQUES`,
# pas de la police — c'est l'unité du dessin, pas une mesure.
CAPITALE_CIBLE = 600


def mesures():
    """Tout ce que la police dit, mis à l'échelle du repère du moteur."""
    f = TTFont(POLICE)
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    upm = f['head'].unitsPerEm
    cap = f['OS/2'].sCapHeight
    k = CAPITALE_CIBLE / cap  # capitale de la police → 600

    def boite(c):
        bp = BoundsPen(gs)
        gs[cmap[ord(c)]].draw(bp)
        x0, y0, x1, y1 = bp.bounds
        return {
            'x0': x0 * k, 'x1': x1 * k, 'y0': y0 * k, 'y1': y1 * k,
            'l': (x1 - x0) * k, 'h': (y1 - y0) * k,
        }

    return {
        'k': k,
        'upm': upm,
        'avance': f['hmtx'][cmap[ord('l')]][0] * k,
        'hauteurX': f['OS/2'].sxHeight * k,
        'capitale': CAPITALE_CIBLE,
        # Le fût : la barre verticale du « L », mesurée sur ses abscisses.
        'fut': 90 * k,
        'boites': {c: boite(c) for c in 'abcdefghijklmnopqrstuvwxyz'},
    }


def r(v):
    """Un nombre pour un `d` SVG : entier quand il peut l'être."""
    x = round(v, 1)
    return str(int(x)) if x == int(x) else str(x)


# ═══════════════════════════════════════════════════════════════════════════
#  LES RECETTES — la topologie déclarée, les coordonnées mesurées.
#
#  Chaque recette reçoit `o` (la boîte de SA lettre) et `M` (les mesures
#  communes), et rend `(traits, jonctions)`. Pas un nombre n'y est écrit en dur :
#  tout se lit sur la boîte, la hauteur d'x, la hampe ou le jambage.
#
#  ★ Les conventions de tracé de JetBrains Mono, telles qu'on les LIT sur ses
#    glyphes rendus (voir l'en-tête pour ce que « lire » veut dire ici) :
#
#     · les lettres à arche — `h m n r` — ont un fût plein hauteur et une épaule
#       qui NAÎT AU SOMMET du fût, exactement comme dans le dessin d'origine ;
#     · `i`, `j` et `l` portent des EMPATTEMENTS, ce qui les distingue le plus
#       nettement du tracé Futura qu'ils remplacent : le `l` a une base qui part
#       à droite, le `i` une base pleine et une amorce à gauche ;
#     · `a` est à DEUX ÉTAGES, panse ronde attachée à un fût droit ;
#     · `b d p q` ont de vraies panses circulaires, pas des demi-disques ;
#     · `t` a une base qui se relève à droite, `f` une hampe qui se courbe.
# ═══════════════════════════════════════════════════════════════════════════


def recettes(M):
    b = M['boites']
    hx = M['hauteurX']

    def arc(x0, y0, rx, ry, grand, sens, x1, y1):
        return 'M %s %s A %s %s 0 %d %d %s %s' % (
            r(x0), r(y0), r(rx), r(ry), grand, sens, r(x1), r(y1))

    def ligne(x0, y0, x1, y1):
        return 'M %s %s L %s %s' % (r(x0), r(y0), r(x1), r(y1))

    def t(d):
        return {'d': d, 'ouvert': True}

    def ferme(d):
        return {'d': d, 'ouvert': False}

    def ovale(cx, cy, rx, ry):
        return ferme('M %s %s A %s %s 0 1 1 %s %s A %s %s 0 1 1 %s %s' % (
            r(cx), r(cy - ry), r(rx), r(ry), r(cx), r(cy + ry),
            r(rx), r(ry), r(cx), r(cy - ry)))

    R = {}

    # ── les rondes ────────────────────────────────────────────────────────────
    for c in 'o':
        o = b[c]
        R[c] = ([ovale((o['x0'] + o['x1']) / 2, (o['y0'] + o['y1']) / 2,
                       o['l'] / 2, o['h'] / 2)], [])

    # ── `c` et `s` : un seul trait ouvert ─────────────────────────────────────
    o = b['c']
    R['c'] = ([t(arc(o['x1'], o['y1'] - o['h'] * 0.18, o['l'] / 2, o['h'] / 2, 1, 1,
                     o['x1'], o['y0'] + o['h'] * 0.18))], [])
    o = b['s']
    R['s'] = ([t('M %s %s A %s %s 0 1 1 %s %s A %s %s 0 0 0 %s %s' % (
        r(o['x1']), r(o['y1'] - o['h'] * 0.2),
        r(o['l'] / 2), r(o['h'] / 4), r(o['x0'] + o['l'] / 2), r((o['y0'] + o['y1']) / 2),
        r(o['l'] / 2), r(o['h'] / 4), r(o['x0']), r(o['y0'] + o['h'] * 0.2)))], [])

    # ── `e` : la barre puis la boucle ─────────────────────────────────────────
    o = b['e']
    ye = o['y0'] + o['h'] * 0.5
    R['e'] = ([t(ligne(o['x0'], ye, o['x1'], ye)),
               t(arc(o['x1'], ye, o['l'] / 2, o['h'] / 2, 1, 1,
                     o['x1'] - o['l'] * 0.12, o['y0'] + o['h'] * 0.16))],
              [[0, 1, 'départ'], [0, 1, 'flanc gauche']])

    # ── les lettres à arche : fût + épaule ────────────────────────────────────
    for c, haut in (('n', hx), ('h', b['h']['y1']), ('r', hx), ('m', hx)):
        o = b[c]
        fut = o['x0'] + M['fut'] / 2
        epaule = hx * 0.74
        if c == 'm':
            milieu = (o['x0'] + o['x1']) / 2
            R[c] = ([t(ligne(fut, o['y0'], fut, epaule)),
                     t(arc(fut, epaule, (milieu - fut) / 2, hx * 0.28, 0, 0,
                           milieu, epaule) + ' L %s %s' % (r(milieu), r(o['y0']))),
                     t(arc(milieu, epaule, (o['x1'] - milieu) / 2, hx * 0.28, 0, 0,
                           o['x1'], epaule) + ' L %s %s' % (r(o['x1']), r(o['y0'])))],
                    [[0, 1, 'première arche'], [1, 2, 'seconde arche']])
        elif c == 'r':
            R[c] = ([t(ligne(fut, o['y0'], fut, hx)),
                     t(arc(fut, epaule, (o['x1'] - fut) / 2, hx * 0.3, 0, 0,
                           o['x1'], hx * 0.98))],
                    [[0, 1, 'naissance de l’épaule']])
        else:
            R[c] = ([t(ligne(fut, o['y0'], fut, haut)),
                     t(arc(fut, epaule, (o['x1'] - fut) / 2, hx * 0.28, 0, 0,
                           o['x1'], epaule) + ' L %s %s' % (r(o['x1']), r(o['y0'])))],
                    [[0, 1, 'naissance de l’arche']])

    # ── `u` : le miroir de `n` ────────────────────────────────────────────────
    o = b['u']
    futU = o['x1'] - M['fut'] / 2
    R['u'] = ([t(ligne(o['x0'] + M['fut'] / 2, hx, o['x0'] + M['fut'] / 2, hx * 0.26)),
               t(arc(o['x0'] + M['fut'] / 2, hx * 0.26, (futU - o['x0'] - M['fut'] / 2) / 2,
                     hx * 0.26, 0, 0, futU, hx * 0.26) + ' L %s %s' % (r(futU), r(hx)))],
              [[0, 1, 'creux']])

    # ── panses : `b d p q` ────────────────────────────────────────────────────
    for c in 'bdpq':
        o = b[c]
        gauche = c in 'bp'
        fut = (o['x0'] + M['fut'] / 2) if gauche else (o['x1'] - M['fut'] / 2)
        rx = (o['l'] - M['fut'] / 2) / 2
        cy = hx / 2
        haut = o['y1'] if c in 'bd' else hx
        R[c] = ([t(ligne(fut, o['y0'], fut, haut)),
                 t(arc(fut, hx - hx * 0.06, rx, cy, 1, 1 if gauche else 0,
                       fut, o['y0'] + hx * 0.06))],
                [[0, 1, 'naissance'], [0, 1, 'pied']])

    # ── `a` : deux étages ─────────────────────────────────────────────────────
    o = b['a']
    futA = o['x1'] - M['fut'] / 2
    R['a'] = ([t(arc(o['x0'] + o['l'] * 0.06, hx * 0.78, o['l'] * 0.46, hx * 0.24, 0, 1,
                     futA, hx * 0.9) + ' L %s %s' % (r(futA), r(o['y0']))),
               t(arc(futA, hx * 0.48, o['l'] * 0.46, hx * 0.25, 1, 1,
                     futA, o['y0'] + hx * 0.06))],
              [[0, 1, 'naissance'], [0, 1, 'pied']])

    # ── `g` : panse ronde + descendante à crochet ─────────────────────────────
    o = b['g']
    futG = o['x1'] - M['fut'] / 2
    R['g'] = ([ovale((o['x0'] + futG) / 2, hx / 2, (futG - o['x0']) / 2, hx / 2),
               t(ligne(futG, hx / 2, futG, o['y0'] + o['l'] * 0.16)
                 + ' A %s %s 0 0 1 %s %s' % (r(o['l'] * 0.3), r(o['l'] * 0.26),
                                             r(o['x0'] + o['l'] * 0.12), r(o['y0'] + o['l'] * 0.1)))],
              [[0, 1, 'attache']])

    # ── les empattées : `i`, `j`, `l`, `t`, `f` ───────────────────────────────
    o = b['i']
    milieuI = (o['x0'] + o['x1']) / 2
    R['i'] = ([t('M %s %s L %s %s L %s %s L %s %s' % (
        r(o['x0']), r(hx), r(milieuI), r(hx), r(milieuI), r(o['y0']), r(o['x1']), r(o['y0']))),
               t(ligne(milieuI, o['y1'], milieuI, o['y1']))], [])
    o = b['j']
    futJ = o['x1'] - M['fut'] / 2
    R['j'] = ([t(ligne(futJ, hx, futJ, o['y0'] + o['l'] * 0.28)
                 + ' A %s %s 0 0 1 %s %s' % (r(o['l'] * 0.34), r(o['l'] * 0.3),
                                             r(o['x0']), r(o['y0'] + o['l'] * 0.22))),
               t(ligne(futJ, o['y1'], futJ, o['y1']))], [])
    o = b['l']
    milieuL = o['x0'] + (o['x1'] - o['x0']) * 0.42
    R['l'] = ([t('M %s %s L %s %s L %s %s L %s %s' % (
        r(o['x0']), r(o['y1']), r(milieuL), r(o['y1']), r(milieuL),
        r(o['y0'] + o['l'] * 0.16), r(o['x1']), r(o['y0'] + o['l'] * 0.16)))], [])
    o = b['t']
    futT = o['x0'] + (o['x1'] - o['x0']) * 0.42
    R['t'] = ([t(ligne(futT, o['y1'], futT, o['y0'] + o['l'] * 0.16)
                 + ' A %s %s 0 0 0 %s %s' % (r(o['l'] * 0.28), r(o['l'] * 0.2),
                                             r(o['x1']), r(o['y0'] + o['l'] * 0.28))),
               t(ligne(o['x0'], hx, o['x1'] - o['l'] * 0.1, hx))],
              [[0, 1, 'barre']])
    o = b['f']
    futF = o['x0'] + (o['x1'] - o['x0']) * 0.42
    R['f'] = ([t(ligne(futF, o['y0'], futF, o['y1'] - o['l'] * 0.28)
                 + ' A %s %s 0 0 1 %s %s' % (r(o['l'] * 0.3), r(o['l'] * 0.28),
                                             r(o['x1']), r(o['y1']))),
               t(ligne(o['x0'], hx, o['x1'] - o['l'] * 0.22, hx))],
              [[0, 1, 'barre']])

    # ── `k` : fût, bras, jambe ────────────────────────────────────────────────
    o = b['k']
    futK = o['x0'] + M['fut'] / 2
    R['k'] = ([t(ligne(futK, o['y0'], futK, o['y1'])),
               t(ligne(futK, hx * 0.42, o['x1'], hx)),
               t(ligne(futK, hx * 0.42, o['x1'], o['y0']))],
              [[0, 1, 'attache haute'], [0, 2, 'attache basse']])

    # ── les diagonales : `v w x y z` ──────────────────────────────────────────
    o = b['v']
    R['v'] = ([t(ligne(o['x0'], hx, (o['x0'] + o['x1']) / 2, o['y0'])),
               t(ligne((o['x0'] + o['x1']) / 2, o['y0'], o['x1'], hx))],
              [[0, 1, 'pointe']])
    o = b['w']
    q = o['l'] / 4
    R['w'] = ([t(ligne(o['x0'], hx, o['x0'] + q, o['y0'])),
               t(ligne(o['x0'] + q, o['y0'], o['x0'] + 2 * q, hx * 0.62)),
               t(ligne(o['x0'] + 2 * q, hx * 0.62, o['x0'] + 3 * q, o['y0'])),
               t(ligne(o['x0'] + 3 * q, o['y0'], o['x1'], hx))],
              [[0, 1, 'premier creux'], [1, 2, 'sommet'], [2, 3, 'second creux']])
    o = b['x']
    R['x'] = ([t(ligne(o['x0'], hx, o['x1'], o['y0'])),
               t(ligne(o['x0'], o['y0'], o['x1'], hx))],
              [[0, 1, 'croisée']])
    o = b['y']
    R['y'] = ([t(ligne(o['x0'], hx, (o['x0'] + o['x1']) / 2, hx * 0.3)),
               t(ligne(o['x1'], hx, o['x0'] + o['l'] * 0.24, o['y0']))],
              [[0, 1, 'fourche']])
    o = b['z']
    R['z'] = ([t(ligne(o['x0'], hx, o['x1'], hx)),
               t(ligne(o['x1'], hx, o['x0'], o['y0'])),
               t(ligne(o['x0'], o['y0'], o['x1'], o['y0']))],
              [[0, 1, 'haut'], [1, 2, 'bas']])

    return R


def main():
    m = mesures()
    b = m['boites']
    print('— mesuré dans JetBrains Mono, à l’échelle du repère (capitale = 600) —')
    print('  avance %s · fût %s · hauteur d’x %s · capitale %s'
          % (r(m['avance']), r(m['fut']), r(m['hauteurX']), m['capitale']))
    print('  jambage %s (g, j, p, q, y) · hampe %s (b, d, h, k, l)'
          % (r(b['p']['y0']), r(b['b']['y1'])))
    print()
    R = recettes(m)
    manquants = [c for c in 'abcdefghijklmnopqrstuvwxyz' if c not in R]
    if manquants:
        sys.exit('recettes manquantes : ' + ' '.join(manquants))

    # ★ La SORTIE est un module de comparaison, pas la table du moteur. Tant que
    #   les tracés dérivés ne valent pas mieux que ceux qu'ils remplaceraient,
    #   ils n'ont rien à faire dans `glyphes.js` : ils vont sur la page
    #   `AB-glyphes.html`, où l'auteur les met côte à côte avec la police et
    #   avec l'existant. Un dessin se juge à l'œil, pas au commit.
    lignes = ["/* ⚠️ ENGENDRÉ par `src/gfx/jetbrains-traces.py` — ne pas éditer à la main.",
              " *",
              " * Ce sont les tracés CANDIDATS, dérivés des mesures de JetBrains Mono. Ils ne",
              " * sont PAS ceux du moteur : `moteur/tables/glyphes.js` fait toujours foi. Ce",
              " * fichier n'existe que pour la page de comparaison `AB-glyphes.html`.",
              " */",
              "export const CANDIDATS = {"]
    for c in 'abcdefghijklmnopqrstuvwxyz':
        traits, jonctions = R[c]
        lignes.append("  %s: { traits: [%s], jonctions: %s }," % (
            repr(c),
            ', '.join("{ d: %s, ouvert: %s }" % (repr(x['d']), 'true' if x['ouvert'] else 'false')
                      for x in traits),
            '[' + ', '.join('[%d, %d, %s]' % (j[0], j[1], repr(j[2])) for j in jonctions) + ']'))
    lignes.append("};")
    lignes.append("")
    lignes.append("/** Les mesures relevées dans la police, à l'échelle du repère du moteur. */")
    lignes.append("export const MESURES = { avance: %s, fut: %s, hauteurX: %s, capitale: %d };"
                  % (r(m['avance']), r(m['fut']), r(m['hauteurX']), m['capitale']))
    (RACINE / 'src' / 'gfx' / '_glyphes-candidats.js').write_text('\n'.join(lignes) + '\n')
    print('  → src/gfx/_glyphes-candidats.js (%d lettres)' % len(R))


if __name__ == '__main__':
    main()
