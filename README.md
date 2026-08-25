# NumHeroLOLgeek
La numérologie est un art, parfoit taquin pour les superstitions anxieuses.

Saisissez un mot, une phrase, une url, ce que vous voulez, ce site vous montrera ce qui se cache derrière !


Chaque démonstration est illustré par une animation montrant chaque étapes pour un résultat sans équivoque !

Venez vous essayer à la science des nombre enfin rendu accessible à toutes et tous !

## L'arborescence

```
README.md                  ce fichier
favicon.svg                l'identité — produit par le générateur de logo, pas dessiné à la main
package.json  bun.lock  vite.config.js  .gitignore  .gitlab-ci.yml
src/                       LES SOURCES — tout ce qui est servi part d'ici
  index.html               le document ; c'est la racine du serveur Vite
  app/                     amorçage, routeur, pages, réglages, partage
  moteur/                  l'arithmétique : transformer une séquence en 6
  recherche/               le tri heuristique des chemins qui mènent à 666
  visuel/                  le moteur d'animation SVG
  i18n/                    les libellés, fr et en
  styles/                  tokens, base, pages, contrôles
  fonts/                   les deux woff2 servis + leurs licences OFL
  gfx/                     le générateur du logo, son banc d'essai, et jost.ttf
.planning/                 le contrat, la recherche, les prototypes de recherche
dist/                      produit par `bun run build` — ignoré par git
```

Deux remarques sur ce rangement :

* `src/fonts/` ne contient **que ce que le navigateur télécharge** : `jost-var.woff2`,
  `jetbrains-mono-var.woff2` et les deux textes de licence. `jost.ttf` est ailleurs, dans
  `src/gfx/`, parce que c'est la matière première du générateur de logo — un outil de
  build, jamais chargé par une page.
* `favicon.svg` reste à la racine du dépôt, avec le README : c'est une pièce d'identité
  du projet. Le document, lui, est dans `src/` et le désigne par `../favicon.svg` ; le
  build le résout, et le serveur de développement le rattrape (voir `vite.config.js`).

## Deux façons de lancer le site

Le site est écrit en modules ES natifs et n'a **aucune dépendance à l'exécution** : un serveur statique quelconque braqué sur `src/` suffit pour développer (`bun run dev`, ou `python3 -m http.server` depuis `src/`, ou n'importe quoi d'autre). En revanche, un module ES ouvert en `file://` est soumis à la politique CORS et un fichier local a une origine « null » : par double-clic sur `src/index.html`, le CSS se charge, le logo s'affiche, et le JavaScript ne démarre jamais. C'est à ça, et à rien d'autre, que sert `bun run build` : il replie le site dans `dist/` en un seul script classique, et c'est `dist/index.html` que l'on ouvre par double-clic, sans serveur. Les sources restent la vérité ; `dist/` n'en est qu'une copie repliée.

## Les commandes

| | |
|---|---|
| `bun run dev` | le serveur Vite sur `src/` |
| `bun run build` | replie le site dans `dist/`, ouvrable en `file://` |
| `bun run test` | `node --test` sur les sources, sans build préalable |
| `bun run check` | les tests puis le build — ce que la CI exécute |
| `bun run logo` | régénère le logo, le favicon et le banc d'essai |

`bun run logo` appelle `src/gfx/logo-jost-trace.py` (fontTools requis). Il réécrit quatre
fichiers : le banc d'essai `src/gfx/_logo-test.html`, `favicon.svg`, et — entre les repères
`<!-- logo:début -->` / `<!-- logo:fin -->` et `/* logo:début */` / `/* logo:fin */` — le
tracé dans `src/index.html` et la mécanique CSS dans `src/styles/base.css`. Il est
idempotent et reproductible à l'octet : deux exécutions de suite ne changent rien, et la
CI le vérifie (job `logo:reproductible`). Les quatre fichiers sont commités ; on ne les
retouche jamais à la main.

## La typographie

Deux familles, pas quatre, toutes deux sous SIL OFL 1.1 et hébergées ici même :

* **Jost\*** (variable) — la police du logo, et donc celle du site. Elle tient les titres
  (`--oracle`, graisse 600) et le corps (`--pedagogue`, graisse 400). Sans contraste
  serif/sans-serif pour marquer la hiérarchie, celle-ci repose sur la graisse, le corps et
  l'interlettrage.
* **JetBrains Mono** (variable) — `--machine`. Sa chasse fixe n'est pas décorative : le
  moteur visuel calcule ses gabarits dessus.

À ces deux **voix** s'ajoute un **instrument** : **DSEG7 Classic** et **DSEG14 Classic**
(même famille, même OFL), les afficheurs à sept et à quatorze segments. Ils ne composent
aucun titre, aucun corps, aucun badge — Le Registre s'en sert pour montrer la lettre
*telle que la calculette la forme*, parce que « combien de traits dans ce H ? » n'a aucun
sens devant un H de Jost\*. 948 et 1 304 octets, sous-réglés aux 36 signes utiles.

Jost n'a pas d'italique. Plutôt qu'un oblique synthétique — le romain cisaillé, très
visible sur un géométrique aux `o` circulaires —, l'emphase se dit par la graisse : 300 et
un peu d'air pour la voix douce (baseline, annonce de résultat, énoncé de règle), 500 pour
les `<em>` en ligne.

----

Méthodologie : la séquence saisie doit être analysé et décomposé pour voir tout les méthodes permettant d'obtenir des 6, idéalement 3 d'affilé, idéalement selon la même méthode.
Les calcule doivent être montré visuellement (grace à du svg) pour rendre le processus le plus convainquant possible.

Il faut donc :
- Un moteur de traduction d'une séquence de caractères en 6 (conversion des lettre en position dans l'alphabet, ou position sur le clavier (comme - sur la même touche que 6 en azerty) nombre de segment en afficheur 7 segment, nombre d'extrémité d'une lettre, en majuscule, en minuscule, nombre de trait pour dessiner une lettre, utilisation des - pour passer de l'addition à la soustraction, utilisation des nombres négatif pour retrancher le 1er chiffre aux autres, ou pour les soustraires entre eux, ou la valeur absolu si ça ne donne pas 6... ) Explore toutes les variantes répendu pour ce genre d'exercice, et on en ajoutera si besoin. ça peut aussi inclure d'ignorer une partie (https:// ou partie après ou avant un / ou les voyelles, ou les consonnes, ou les lettre qui se répettent... bref, il faut une liste de transformation possible, qui auront chacune un mode de rendu visuel animé dans le moteur suivant, et un séquenceur de transformation pour arriver à l'issue visée).

- Un moteur visuel pour animer chaque transformation afin de rendre limpide et authentique le passage de la séquence d'origine aux 666 d'arrivée.

- Un séquençage dans l'url pour pouvoir partager le lien d'une transformation visuelle donnée.




## L'interface du site :
### Page d'accueil

Titre svg : 
Num'Hero Logic (en insérant le 2nd L de LOL sous forme d'apostrophe entre lo et gic en mettant les 2 e de geek l'un au dessus de l'autre pour former le i de gic et le k sous forme de c avec un petit morceau qui dépasse pour faire deviner le k. Bref, numerologic à première vu mais qui cache num héro lol geek)

Ensuite la phrase :
L'art de la numérologie, enfin accessible au plus grand nombre !

De quel contenu voulez vous réveller les arcanes ?
[champs de saisie]
[Bouton: Réveller]

### Page de résultat

Url : {domain/path}##{b58 de la séquence recherchée}
Titre : {Séquence recherchée}
Liste clicable des approche menant à 666
Liste clicable des fragments menant à 6

Mémo d'assemblage de fragments dans l'url

### Page de démonstration
cible des liens de la page résultat, pour illustrer une méthode de calcul.

Url : {domain/path}#{numéro de l'approche, ou numéro+numéro+numéro pour la composition de plusieurs fragments}#{b58 de la séquence recherchée}
Titre : La vérité derrière "{Séquence recherchée}"

Animation svg (ou css) avec la séquence de départ, transition vers étape suivante... jusqu'au résultat fatidique.

Controle d'avancement type : Début, précédent, play, pause, suivant.
Play ne se déclenche automatiquement qu'une fois la page chargé et le focus sur l'onglet présent (pour éviter de la jouer en arrière plan). Il ne se redéclenche pas automatiquement (sauf rechargement de la page)
Début renvoi au point de départ, précédent au début de la transformation en cours, ou au début de la tranformation précédente si on est déjà à la charnière entre l'actuelle et la précédente. Suivant envoi à la fin de la transformation actuelle (ou la suivant si on est déjà à la charnière avec la suivante) Suivant est grisé/désactivé si on est à la fin. Précédent et début le sont si on est au début. Play et pause se remplace mutuellement selon l'état. (play quand on est en pause, pause quand on est en play)

Les transformations sont numérotées et le numéro en cours est distingable (pour debug principalement)


---------------


Inspiration :
*méthodes pour faire atterrir hope-hope-hope.fr sur 666*

---

**Méthode 1 – Le détour linguistique (le français)**
- **Règle** : On traduit le mot anglais en français.
- **Calcul** : *Hope* → *Espoir*, *Espoir* -> 6 lettres, https://hope-hope-hope.fr/ on ignore ce qui n'est pas hope, hope est là 3 fois, donc 3 rempalcement -> 666
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 2 – Le compte des lettres + voyelles**
- **Règle** : On comptabilise le nombre total de lettres, puis on ajoute le nombre de voyelles.
- **Calcul** : H-O-P-E = 4 lettres + 2 voyelles (O, E) = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 3 – Le compte des lettres + consonnes**
- **Règle** : On comptabilise le nombre total de lettres, puis on ajoute le nombre de consonnes.
- **Calcul** : H-O-P-E = 4 lettres + 2 consonnes (H, P) = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 4 – La somme des 3 répétitions en numérologie latine**
- **Règle** : On utilise la numérologie latine (A=1, B=2... Z=26), puis on réduit la somme des trois mots.
- **Calcul** : HOPE = 8+15+16+5 = 44 → 4+4 = 8. Les trois "hope" : 8+8+8 = 24 → 2+4 = 6.
- **Résultat** : Le triplet global donne 6 et les séparateur en "tiret du 6" donnent les 2 autres 6 -> 666

---

**Méthode 5 – L'affichage 7 segments (traits continus fusionnés)**
- **Règle** : On compte les traits géométriques *continus* (on fusionne les segments alignés qui se touchent) pour écrire HOPE en capitales.
- **Calcul** : H = 3 traits, O = 4 traits, P = 4 traits, E = 4 traits. Total par mot = 3+4+4+4 = 15 → 1+5 = 6.
- **Résultat** : Chaque "hope" vaut 6 → `6-6-6`.

---

**Méthode 6 – L'astuce AZERTY et le retournement du 9**
- **Règle** : On utilise le clavier français et une double pirouette arithmétique.
- **Calcul** : 
  - Les deux tirets `-` entre les trois "hope" sont situés sur la **touche du 6** en AZERTY → on récupère deux 6 (6 et 6).
  - Pour le troisième 6 : on additionne les valeurs numériques des lettres de HOPE (8+15+16+5 = 44 → 8) en incluant les deux tirets (6 et 6) : 8 + 6 + 8 + 6 + 8 = 36 → 3+6 = 9. On **retourne** le 9 pour obtenir un 6.
- **Résultat** : Les deux tirets donnent `6` et `6`, et la réduction/retournement donne le troisième `6` → `6-6-6`.

**Méthode 7 – la soustraction**
- **Règle** : Les mots sont séparé par des - c'est donc des soustraction et non des addition qu'il faut faire entre les lettres.
- **Calcul** : HOPE = 8-15-16-5 = -28, -28 -> -2 et 8, donc 8 -2 -> 6



Instruction :

Un agent sur le design du site
Un agent sur le moteur visuel pour montrer les transformations de manière visuelles
Un agent sur le moteur arithmétique
Un agent sur le moteur de tri/filtre heuristique parmis les transformations arithmétique disponible pour trouver les chemins les plus court qui mène au résultat.

