#!/usr/bin/env python3
"""Extrait de FreeDict les tables de traduction mot à mot du catalogue.

★ POURQUOI UN GÉNÉRATEUR, ET PAS UNE TABLE ÉCRITE À LA MAIN.

Le dictionnaire embarqué comptait quarante-neuf mots, choisis un par un. C'est
un gadget : « f.traduitEN » sur n'importe quelle saisie réelle ne trouvait rien,
et les rares fois où il trouvait, c'était parce qu'on avait mis le mot dans la
liste. Une méthode qui ne marche que sur les exemples de son auteur n'est pas
une méthode.

FreeDict publie deux dictionnaires bilingues sous GNU GPL 2.0 ou ultérieure —
compatible avec l'AGPL 3.0 de ce dépôt — de huit à neuf mille entrées chacun,
pour deux cents kilo-octets compressés. C'est du vocabulaire courant, vérifiable,
maintenu ailleurs, et ce n'est pas nous qui le choisissons : la seule façon
d'échapper au reproche d'avoir trié les mots qui arrangent.

★ CE QUI EST RETENU, et pourquoi si peu.

`traduire()` (transformations/filtres.js) travaille sur un MOT ENTIER et rend un
MOT ENTIER : c'est tout ce que la scène sait montrer. On ne garde donc que les
entrées mot simple → mot simple, sans espace, sans tiret, sans parenthèse
d'usage. Une entrée « to run » → « courir, marcher, filer » n'a pas de rendu :
on la laisse plutôt que d'en choisir arbitrairement un morceau.

Usage :
    python3 src/gfx/freedict-traduction.py <dossier-des-.tei> [--check]

Le dossier contient `eng-fra/eng-fra.tei` et `fra-eng/fra-eng.tei`, tels que les
livrent les archives `*.src.tar.xz` de https://freedict.org/downloads/.
"""

import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

TEI = '{http://www.tei-c.org/ns/1.0}'
SORTIE = Path(__file__).resolve().parents[1] / 'moteur' / 'tables' / 'traduction.js'

# Un mot, et rien qu'un mot : lettres (accentuées comprises) et apostrophe
# interne. Tout le reste — locutions, formes pronominales, gloses entre
# parenthèses — n'a pas de rendu à l'écran.
MOT = re.compile(r"^[a-zà-öø-ÿ]+(?:['’][a-zà-öø-ÿ]+)?$", re.IGNORECASE)


def sans_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


# Combien d'acceptions on retient par mot.
#
# ★ CINQ, et pas trois. « Élargis aux cinq traductions les plus convaincantes »
#   (l'auteur). Un dictionnaire ne range pas ses acceptions par ordre de
#   commodité : la bonne — celle qui fait sens pour le mot qu'on a sous les yeux
#   — est aussi souvent la quatrième que la première. S'arrêter à trois, c'était
#   garder le tri arbitraire du fichier tout en prétendant l'avoir ouvert.
ACCEPTIONS = 5


def lire(chemin):
    """{mot source → ses premières traductions simples}, dans l'ordre du fichier.

    ★ PLUSIEURS ACCEPTIONS, ET C'EST VOULU. « hope » donne « espérer » puis
      « espoir » : le verbe et le nom, deux mots de longueurs différentes, donc
      deux démonstrations différentes. N'en garder qu'un revenait à trancher à
      la place du lecteur — et à trancher, en l'occurrence, pour celui que
      FreeDict cite en premier, sans que ce soit un choix de personne. Les trois
      premières sont donc conservées, et le catalogue en fait trois opérateurs
      (`ffr`, `ffr2`, `ffr3`) : le choix devient VISIBLE dans l'URL, et se paie
      en ad-hoc au lieu de se cacher dans une table.
    """
    racine = ET.parse(chemin).getroot()
    out = {}
    for entree in racine.iter(f'{TEI}entry'):
        orths = [o.text for o in entree.iter(f'{TEI}orth') if o.text]
        if len(orths) != 1 or not MOT.match(orths[0].strip()):
            continue
        source = orths[0].strip().lower()
        # La clé est SANS ACCENTS : `traduire()` cherche d'abord la forme
        # normalisée, pour que « bête » se trouve depuis « bete ».
        cle = sans_accents(source)
        if cle in out:
            continue
        cibles = []
        for cit in entree.iter(f'{TEI}cit'):
            if cit.get('type') != 'trans':
                continue
            for quote in cit.iter(f'{TEI}quote'):
                cible = (quote.text or '').strip().lower()
                if not MOT.match(cible) or cible == source or cible in cibles:
                    continue
                cibles.append(cible)
                if len(cibles) >= ACCEPTIONS:
                    break
            if len(cibles) >= ACCEPTIONS:
                break
        if cibles:
            out[cle] = cibles
    return out


def js(chaine):
    """Un littéral JavaScript, apostrophes échappées — jamais du repr Python."""
    return "'" + chaine.replace('\\', '\\\\').replace("'", "\\'") + "'"


def rendre(en_fr, fr_en):
    lignes = [
        '/**',
        ' * Tables de traduction mot à mot — GÉNÉRÉES, jamais écrites à la main.',
        ' *',
        ' * Source : FreeDict (https://freedict.org/), dictionnaires `eng-fra` et',
        ' * `fra-eng`, publiés sous GNU GPL 2.0 ou ultérieure — compatible avec',
        ' * l’AGPL 3.0 de ce dépôt. Regénérer avec :',
        ' *',
        ' *     python3 src/gfx/freedict-traduction.py <dossier-des-.tei>',
        ' *',
        ' * Seules les entrées MOT SIMPLE → MOT SIMPLE sont retenues : `traduire()`',
        ' * rend un mot entier, et la scène ne sait montrer que cela. Les clés sont',
        ' * sans accents et en bas de casse (voir le générateur).',
        ' *',
        ' * Chaque mot porte ses TROIS premières acceptions, dans l’ordre du',
        ' * dictionnaire : « hope » donne « espérer », puis « espoir ». Le catalogue',
        ' * en fait autant d’opérateurs (`ffr`, `ffr2`, `ffr3`), pour que le choix',
        ' * d’une lecture soit écrit dans l’URL et se paie, au lieu d’être tranché',
        ' * en silence par l’ordre d’un fichier.',
        ' */',
        '',
        f'/** {len(en_fr)} entrées, anglais → français. */',
        'export const DICO_EN_FR = Object.freeze({',
    ]
    for k, v in sorted(en_fr.items()):
        lignes.append(f'  {js(k)}: [{", ".join(js(x) for x in v)}],')
    lignes += ['});', '', f'/** {len(fr_en)} entrées, français → anglais. */',
               'export const DICO_FR_EN = Object.freeze({']
    for k, v in sorted(fr_en.items()):
        lignes.append(f'  {js(k)}: [{", ".join(js(x) for x in v)}],')
    lignes += ['});', '']
    return '\n'.join(lignes)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    base = Path(args[0])
    en_fr = lire(base / 'eng-fra' / 'eng-fra.tei')
    fr_en = lire(base / 'fra-eng' / 'fra-eng.tei')
    texte = rendre(en_fr, fr_en)
    if '--check' in sys.argv:
        actuel = SORTIE.read_text(encoding='utf-8') if SORTIE.exists() else ''
        if actuel != texte:
            print('traduction.js diverge de sa source FreeDict', file=sys.stderr)
            return 1
        print(f'traduction.js à jour ({len(en_fr)} + {len(fr_en)} entrées)')
        return 0
    SORTIE.write_text(texte, encoding='utf-8')
    print(f'{SORTIE} — {len(en_fr)} entrées EN→FR, {len(fr_en)} FR→EN, '
          f'{len(texte) / 1024:.0f} Ko')
    return 0


if __name__ == '__main__':
    sys.exit(main())
