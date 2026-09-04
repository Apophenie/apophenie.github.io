#!/usr/bin/env python3
"""★ **L'EXTRAIT DES SOURCES DE JETBRAINS MONO.**

> « Vraiment, tu as les sources, une fonte à graisse variable, je ne comprends
>   pas que tu ne puisses pas trouver le squelette exact en vectoriel, sans
>   avoir besoin de le déduire ou le recalculer. » (l'auteur)

**Il n'y a pas de squelette dans les sources, et il n'y en aura jamais** :
`JetBrainsMono.glyphs` est dessiné au CONTOUR. Aucun tracé au trait, aucun
attribut d'épaisseur — vérifié, le fichier ne contient pas une seule occurrence
de `strokeWidth`. Une fonte livre la forme de l'encre, pas le geste qui l'a
posée ; c'est vrai des fontes ouvertes comme des autres.

★ **MAIS ELLE LIVRE MIEUX QUE ÇA : LA DÉRIVÉE DE L'ENCRE.** Trois masters
  point-compatibles — Thin (wght 100), Regular (400), ExtraBold (800) — et,
  déclarés en toutes lettres, LES FÛTS DE CHACUN :

      Thin      45 horizontal, 50 vertical
      Regular   82             90
      ExtraBold 140            150

  L'épaisseur est affine par morceau. Sur [100, 400] elle s'annule en

      w₀ = 100 − 50 × 300 / (90 − 50) = −275

  et cette graisse-là, que la fonte n'expose pas mais qu'elle DÉCRIT, est
  exactement celle où les deux bords d'un fût se rejoignent sur son axe. C'est
  la réponse à la question posée : on ne recalcule rien, on lit la police à une
  graisse qu'elle définit.

★ **POURQUOI UN EXTRAIT PLUTÔT QUE LE CLONE.** `JetBrainsMono.glyphs` pèse
  1,8 Mo pour 1784 glyphes ; on en utilise 52. Le verser en entier ferait porter
  au dépôt trente-neuf mégaoctets d'historique pour cinquante-deux lettres, et
  `npm run glyphes` dépendrait d'un clone que personne n'a. L'extrait tient les
  deux bouts : reproductible hors ligne, et régénérable par ce script dès qu'on
  a le dépôt amont sous la main.

⚠️ **CE N'EST PAS UNE COPIE DE LA POLICE, C'EST UN RELEVÉ DE SES CONTOURS.**
  JetBrains Mono est sous SIL OFL 1.1, déjà reproduite dans
  `src/fonts/OFL-JetBrainsMono.txt` — la même licence couvre cet extrait, qui en
  est un ouvrage dérivé.

Usage :

    gh repo clone JetBrains/JetBrainsMono /tmp/JetBrainsMono
    python3 src/gfx/jetbrains-source.py /tmp/JetBrainsMono/sources/JetBrainsMono.glyphs
"""

import json
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
CIBLE = RACINE / 'src' / 'gfx' / '_jetbrains-source.json'

#: Les deux graisses relevées. La troisième (ExtraBold) ne sert pas à
#: l'extrapolation — l'épaisseur n'est PAS affine de bout en bout (40 unités
#: gagnées sur [100, 400], 60 sur [400, 800]) et c'est le segment le plus fin
#: qui décrit le mieux ce qui se passe en deçà. On garde ses fûts déclarés
#: quand même : ils prouvent la rupture de pente plutôt que de la supposer.
RELEVES = ('Thin', 'Regular')

#: Les signes dont on veut le tracé. Les bas de casse portent des recettes ; les
#: capitales n'en ont pas, mais leur axe se lit aussi bien.
SIGNES = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'


# ═══════════════════════════════════════════════════════════════════════════
#  Le format `.glyphs` : un plist OpenStep, valeurs non quotées tolérées.
# ═══════════════════════════════════════════════════════════════════════════

_NU = re.compile(r'[^,;()={}"\s]+')


class _Lecture:
    def __init__(self, s):
        self.s, self.i = s, 0

    def _blancs(self):
        s, n = self.s, len(self.s)
        while self.i < n:
            c = s[self.i]
            if c in ' \t\r\n':
                self.i += 1
            elif c == '/' and s[self.i + 1:self.i + 2] == '/':
                j = s.find('\n', self.i)
                self.i = n if j < 0 else j + 1
            elif c == '/' and s[self.i + 1:self.i + 2] == '*':
                j = s.find('*/', self.i)
                self.i = n if j < 0 else j + 2
            else:
                return

    def valeur(self):
        self._blancs()
        c = self.s[self.i]
        if c == '{':
            return self.dictionnaire()
        if c == '(':
            return self.tableau()
        if c == '"':
            return self.chaine()
        m = _NU.match(self.s, self.i)
        self.i = m.end()
        return m.group()

    def chaine(self):
        self.i += 1
        out = []
        while True:
            c = self.s[self.i]
            if c == '\\':
                out.append(self.s[self.i + 1])
                self.i += 2
            elif c == '"':
                self.i += 1
                return ''.join(out)
            else:
                out.append(c)
                self.i += 1

    def dictionnaire(self):
        self.i += 1
        d = {}
        while True:
            self._blancs()
            if self.s[self.i] == '}':
                self.i += 1
                return d
            cle = self.valeur()
            self._blancs()
            if self.s[self.i] != '=':
                raise ValueError('« = » attendu après %r' % cle)
            self.i += 1
            d[cle] = self.valeur()
            self._blancs()
            if self.s[self.i] == ';':
                self.i += 1

    def tableau(self):
        self.i += 1
        a = []
        while True:
            self._blancs()
            if self.s[self.i] == ')':
                self.i += 1
                return a
            a.append(self.valeur())
            self._blancs()
            if self.s[self.i] == ',':
                self.i += 1


# ═══════════════════════════════════════════════════════════════════════════
#  L'extraction
# ═══════════════════════════════════════════════════════════════════════════

def contours(glyphes, ids, nom, master, dx=0.0, dy=0.0):
    """Les contours d'un glyphe, COMPOSANTES DÉCOMPOSÉES.

    ⚠️ `i` et `j` n'ont pas de tracé propre : ce sont des assemblages de
      `idotless` et de `dotaccentcomb`, posés par référence. Les lire sans les
      décomposer rendait deux glyphes VIDES — c'est le défaut qui avait fait
      disparaître les points sur le `i` et le `j`.
    """
    calque = next(c for c in glyphes[nom]['layers'] if c.get('layerId') == ids[master])
    out = []
    for forme in calque.get('shapes', []):
        if 'ref' in forme:
            px, py = (float(v) for v in forme.get('pos', ['0', '0']))
            out += contours(glyphes, ids, forme['ref'], master, dx + px, dy + py)
        else:
            out.append([[float(n[0]) + dx, float(n[1]) + dy, n[2]]
                        for n in forme['nodes']])
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__.strip().splitlines()[-1].strip())
    source = pathlib.Path(sys.argv[1])
    if not source.exists():
        sys.exit('introuvable : %s' % source)

    d = _Lecture(source.read_text(encoding='utf-8')).dictionnaire()
    masters = d['fontMaster']
    ids = {m['name']: m['id'] for m in masters}
    glyphes = {g['glyphname']: g for g in d['glyphs']}

    manquants = [m for m in RELEVES if m not in ids]
    if manquants:
        sys.exit('masters absents de la source : %s' % ', '.join(manquants))

    extrait = {}
    for ch in SIGNES:
        par_master = {m: contours(glyphes, ids, ch, m) for m in RELEVES}
        formes = {m: [len(c) for c in par_master[m]] for m in RELEVES}
        # ⚠️ La compatibilité point à point n'est pas une politesse : c'est ce
        #   qui rend la soustraction entre masters licite. On la VÉRIFIE.
        if len({tuple(v) for v in formes.values()}) != 1:
            sys.exit('« %s » : contours incompatibles entre masters — %r' % (ch, formes))
        extrait[ch] = par_master

    # La hauteur de capitale se LIT dans les métriques du master, à la place
    # que `metrics` lui assigne — elle n'est pas devinée ni relevée à l'écran.
    rang = [z['type'] for z in d['metrics']].index('cap height')
    reference = next(m for m in masters if m['name'] == RELEVES[-1])
    capitale = int(reference['metricValues'][rang]['pos'])

    charge = {
        'police': d.get('familyName', 'JetBrains Mono'),
        'depot': 'https://github.com/JetBrains/JetBrainsMono',
        'version': '%s.%s' % (d.get('versionMajor', '?'), d.get('versionMinor', '?')),
        'date': d.get('date', ''),
        'licence': 'SIL OFL 1.1 — voir src/fonts/OFL-JetBrainsMono.txt',
        'unitesParCadratin': int(d.get('unitsPerEm', 1000)),
        'capitale': capitale,
        'graisses': {m['name']: int(m['axesValues'][0]) for m in masters},
        # Les fûts DÉCLARÉS, horizontal puis vertical. C'est d'eux que se déduit
        # la graisse d'effondrement — on ne mesure plus un tiret à l'écran.
        'futs': {m['name']: [int(v) for v in m.get('stemValues', [])[:2]]
                 for m in masters},
        'releves': list(RELEVES),
        'glyphes': extrait,
    }
    CIBLE.write_text(json.dumps(charge, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('— extrait des sources %s v%s —' % (charge['police'], charge['version']))
    for m in masters:
        print('  %-10s wght %3d   fûts %s' % (m['name'], int(m['axesValues'][0]),
                                              charge['futs'][m['name']]))
    print('  → src/gfx/_jetbrains-source.json (%d signes, %.0f Ko)'
          % (len(extrait), CIBLE.stat().st_size / 1024))


if __name__ == '__main__':
    main()
