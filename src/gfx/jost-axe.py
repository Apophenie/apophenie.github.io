#!/usr/bin/env python3
"""★ **L'AXE DE JOST — le même moteur, une autre police, et pas une règle de plus.**

> « fais-tu des correctifs au cas par cas ou une mise à jour des règles pour que
>   ça marche aussi si je changeais de fonte ? » (l'auteur, à propos des seuils
>   de `jetbrains-axe.py`)

**Ce fichier est la réponse, et il fait quarante lignes.** Les quatre gestes de
la chaîne — effondrer, dégrafer les encoches, replier, reposer les traits
déclarés — ne savent rien d'une police : ils lisent un extrait de contours et
projettent des recettes. `jetbrains-axe.py` porte quatre mille lignes de
géométrie où **aucune lettre n'est citée** ; le seul caractère qui y figure en
dur est le `'o'` des points de contrôle de Glyphs. Changer de police, c'est donc
changer ses trois fichiers, et rien d'autre :

    NHLG_AXE_SOURCE   l'extrait des contours     `_jost-source.json`
    NHLG_AXE_TRACES   les recettes à projeter    `jost-traces.py`
    NHLG_AXE_CIBLE    le module engendré         `_jost-axe.js`

★ **ET C'EST UNE PREUVE, PAS UNE COMMODITÉ.** Les seuils de forme du moteur — la
  saillie d'une encoche, la portée d'un carrefour, la longueur d'un moignon —
  sont rapportés au FÛT que la source déclare, et non écrits en unités. On peut
  maintenant dire ce que valait cette précaution : Jost a un fût de 72,9 unités
  de moteur là où JetBrains en a 74,0, une capitale de 700 contre 730, une
  hauteur d'x de 394 contre 452. Les seuils suivent, et les cinquante-deux
  signes passent sans qu'on ait touché à une constante.

⚠️ **IL N'Y A PAS DE `--adopter` DE CE CÔTÉ-CI, ET LE REFUS EST DANS LE MOTEUR.**

  > « applique déjà l'état courant comme glyphes retenues » (l'auteur, du côté
  >   JetBrains)

  Trois opérateurs du catalogue — `mtrb`, `mexb`, `mbob` — facturent les traits,
  les extrémités et les boucles de `moteur/tables/glyphes.js` : adopter un autre
  dessin DÉPLACE des scores. Jost n'est pour l'instant qu'une variante à
  l'étude ; `jetbrains-axe.py › adopter` refuse d'écrire dans la table dès que la
  cible n'est pas `_glyphes-axe.js`, si bien qu'un `--adopter` tapé dans le
  mauvais terminal ne peut pas passer. L'arbitrage reste à l'auteur.

Usage :

    python3 src/gfx/jost-source.py      # une fois, ou après changement de police
    python3 src/gfx/jost-traces.py
    python3 src/gfx/jost-axe.py         # → src/gfx/_jost-axe.js
    python3 src/gfx/jost-axe.py --passes abc      # dérouler passe par passe
"""

import os
import pathlib
import runpy
import sys

GFX = pathlib.Path(__file__).resolve().parent

os.environ.setdefault('NHLG_AXE_SOURCE', str(GFX / '_jost-source.json'))
os.environ.setdefault('NHLG_AXE_TRACES', str(GFX / 'jost-traces.py'))
os.environ.setdefault('NHLG_AXE_CIBLE', str(GFX / '_jost-axe.js'))

if '--adopter' in sys.argv:
    sys.exit('⚠️  Jost est une VARIANTE À L’ÉTUDE : elle ne s’adopte pas.\n'
             '    `moteur/tables/glyphes.js` est l’arbitrage de l’auteur, et trois\n'
             '    opérateurs du catalogue en facturent les comptes.')

# ★ `run_path` et non un `import` : `jetbrains-axe.py` porte un trait d'union,
#   et surtout il doit s'exécuter comme un programme — `__name__ == '__main__'`
#   est ce qui appelle `main()`. On lui passe notre `argv` tel quel, pour que
#   `--passes` marche des deux côtés.
runpy.run_path(str(GFX / 'jetbrains-axe.py'), run_name='__main__')
