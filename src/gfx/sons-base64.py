#!/usr/bin/env python3
"""Réimprime `src/sons/data.js` à partir des .ogg — ou vérifie qu'il n'a pas dérivé.

★ POURQUOI CE DÉTOUR, plutôt qu'un simple `import son from './abime.ogg'`.

CONTRACTS §0.1 : « le code source reste sans dépendance runtime et servable tel
quel — `bun run dev` sert les sources en modules natifs, et `bun run test`
exécute les tests avec `node --test` SANS build préalable ». Or un `import` de
fichier binaire n'existe que dans l'empaqueteur : Node refuse l'extension, et
c'est toute la suite de tests qui tombe, pas seulement le son.

C'est le même détour que `dseg-segments.py` et `jetbrains-six.py` : la donnée
DÉRIVÉE est commitée entre deux balises repères, et un test rejoue la
dérivation pour interdire la divergence (`src/app/sons.test.js`). Une source de
vérité — les .ogg —, une copie vérifiée.

Usage :  python3 src/gfx/sons-base64.py           # réimprime
         python3 src/gfx/sons-base64.py --check   # échoue si ça a dérivé
"""
import base64
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parents[2]
SONS = RACINE / 'src' / 'sons'
CIBLE = SONS / 'data.js'
DEBUT = '// ══ DÉBUT SONS_BASE64 — engendré par src/gfx/sons-base64.py, ne pas éditer'
FIN = '// ══ FIN SONS_BASE64'

# L'ordre est celui du récit, pas l'alphabétique : le sursaut, la foudre, le feu.
#
# ★ `abime` a été RETIRÉ. « L'ambiance continue n'est pas ce que je voulais : je
#   voulais un son de surprise / effroi PONCTUEL au moment de faire apparaître
#   les cornes » (l'auteur). Le drone de fond ne soulignait rien — il occupait.
#   Voir `src/app/sons.js` et `src/sons/CC0-sons.txt`.
NOMS = ['effroi', 'tonnerre', 'brasier']
TYPE = 'audio/ogg'


def corps():
    lignes = []
    for nom in NOMS:
        octets = (SONS / f'{nom}.ogg').read_bytes()
        b64 = base64.b64encode(octets).decode('ascii')
        lignes.append(f'/** `{nom}.ogg` — {len(octets)} octets d’Opus. */')
        lignes.append(f"export const {nom} = 'data:{TYPE};base64,{b64}';")
        lignes.append('')
    return '\n'.join(lignes).rstrip() + '\n'


def rendu():
    return CIBLE.read_text(encoding='utf-8')


def attendu():
    texte = rendu()
    avant = texte.split(DEBUT)[0]
    apres = texte.split(FIN)[1]
    return f'{avant}{DEBUT}\n\n{corps()}\n{FIN}{apres}'


if __name__ == '__main__':
    verifier = '--check' in sys.argv
    voulu = attendu()
    if verifier:
        if rendu() != voulu:
            print('✘ src/sons/data.js a dérivé des .ogg. Relancez `bun run sons`.', file=sys.stderr)
            sys.exit(1)
        print(f'✔ src/sons/data.js correspond aux {len(NOMS)} .ogg.')
    else:
        CIBLE.write_text(voulu, encoding='utf-8')
        print(f'✔ src/sons/data.js réimprimé ({len(voulu)} octets).')
