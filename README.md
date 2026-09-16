# NumHeroLOLgeek
La numérologie est un art, parfoit taquin pour les superstitions anxieuses.

Saisissez un mot, une phrase, une url, ce que vous voulez, ce site vous montrera ce qui se cache derrière !


Chaque démonstration est illustré par une animation montrant chaque étapes pour un résultat sans équivoque !

Venez vous essayer à la science des nombre enfin rendu accessible à toutes et tous !

## Ce que le site fait aujourd'hui

La version 3.0.0, en bref. Plus bas, « Méthodologie » et « L'interface du site »
sont le cahier des charges d'origine : il tient toujours, le site a grandi autour.

### D'autres cibles que 666

Sous la liste des voies, « Trop diabolique pour vous ? » propose 111, 777, 000, 13
et 007, ou la valeur de votre choix : une suite de 20 chiffres au plus, zéros de
tête compris (« 007 » n'est pas « 7 »), ou **un texte** de 20 signes au plus, visé
tel quel, casse, accents et ponctuation compris. « https://reinfocovid.fr/ » vaut
ainsi « C'est de la merde ! », point d'exclamation inclus.

Les cornes et l'orage du registre scénique restent l'apanage du 666 : les autres
cibles se démontrent en sobre, en attendant leurs emblèmes
(`.planning/A-VENIR-cibles.md`).

### Régler ce qui compte

La page de résultats porte quatre curseurs — **Simplicité**, **Exhaustivité**,
**Quantité**, **Cohérence** — de 0 à 200, 100 par défaut ; le pourcentage affiché
est la part de chacun dans le score global. Un cinquième, la **Fouille**, ne classe
pas : il creuse. Ses crans vont de 0 (le défaut) à 10, et chaque cran double le
travail accordé à la recherche (×1, ×2, ×4…).

Monter la fouille n'appauvrit rien : la liste d'un cran réunit ce que chaque cran
inférieur a choisi, et une voie trouvée reste trouvée. La recherche part d'un **cran
rapide** (−1), qui n'est pas un réglage : il montre ses premières voies en quelques
secondes. Tant qu'un cran se calcule, la liste du cran précédent s'affiche sous le
bandeau « Recherche en cours — classement provisoire », et ses liens restent valables.

### Révéler

Sur l'accueil, **Révéler** cherche sur place et ouvre directement la démonstration de
la première voie, en cinq secondes environ : sa recherche est bornée pour ça.
« Énumérer les voies occultes » mène à la liste complète, et Révéler y retombe
lui-même s'il n'obtient pas de lien direct.

### Le classement

Chaque voie porte un **score global** : la moyenne de ses quatre axes, pondérée par
les curseurs. Depuis la 3.0.0, c'est lui qui range la liste, recalibré sur quinze
arbitrages de l'autrice (`.planning/arbitrages/`) : l'absorption (`mab`), les
traductions et le complément à neuf paient leur caractère de dernier recours, et une
sélection qui jette des chiffres fait baisser le rendement.

Aux curseurs par défaut, deux lignes ouvrent la liste : **Élégance**, « la plus
belle », et **Abondance**, « la plus fournie » — celle qui aligne plus de séries que
l'Élégance sans faire moins bien qu'elle au score global, quand il y en a une.

### Les liens

Tout se partage par l'URL, et ce qui compte y est écrit :

| lien | ce qu'il fait |
|---|---|
| `#:Donald Trump` | cherche, puis anime la première voie — le geste de Révéler |
| `##:Donald Trump` | cherche, puis énumère les voies |
| `##:Donald Trump#:111` | la même liste, pour une autre cible (troisième `#`) |
| `#sce!m14#:hope` | joue ce programme-là, sans recherche, en registre scénique |

* La saisie et la cible s'écrivent en base58 — c'est ce que le site produit — ou en
  clair derrière `:`. Sans cible, c'est 666.
* Dans un programme, `+` enchaîne les opérations, `,` sépare les fragments dont les 6
  s'assemblent, `0.1:` désigne une portée (position et longueur, en jetons), et `;`
  sépare une retouche, qui réécrit la saisie, de ce qui la lit ensuite.
* Avant le programme, des marqueurs clos par `!` : `sce!` pour le registre scénique,
  `p25.200.50.150!` pour les curseurs (simplicité, exhaustivité, quantité,
  cohérence), `f2!` pour la fouille. Le registre sobre est implicite : **seul `sce!`
  s'écrit**, et les anciens liens en `so!` se relisent à l'identique.

La grammaire complète est en tête de `src/recherche/url.js`.

## L'arborescence

```
README.md                  ce fichier
favicon.svg                l'identité — produit par le générateur de logo, pas dessiné à la main
package.json  bun.lock  vite.config.js  .gitignore  .gitlab-ci.yml
src/                       LES SOURCES — tout ce qui est servi part d'ici
  index.html               le document ; c'est la racine du serveur Vite
  config.js                les réglages de la recherche : crans de fouille, budgets, lois
  app/                     amorçage, routeur, pages, réglages, partage
  moteur/                  l'arithmétique : transformer une séquence en 6
  recherche/               le tri heuristique des chemins qui mènent à 666
  visuel/                  le moteur d'animation SVG
  i18n/                    les libellés, fr et en
  styles/                  tokens, base, pages, contrôles
  fonts/                   les deux woff2 servis + leurs licences OFL
  sons/                    les trois sons de la version scénique + leur licence CC0
  gfx/                     le générateur du logo, son banc d'essai, et jost.ttf
.planning/                 le contrat, les arbitrages, les bancs de mesure, et ce qui reste à faire (A-VENIR.md)
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
| `bun run test` | la suite de routine (`npm test` lance la même) : `node --test` sur les sources, sans build préalable |
| `bun run test:lent` | la suite lente : les recherches complètes, le classement, les arbitrages, les budgets — voir juste en dessous |
| `bun run test:tout` | les deux suites, l'une après l'autre |
| `bun run check` | les deux suites puis le build — ce que la CI exécute |
| `bun run logo` | régénère le logo, le favicon et le banc d'essai |

### La suite lente parle pendant qu'elle tourne

`bun run test:lent` passe par `scripts/test-lent.mjs` plutôt que par un `node --test`
direct, pour une raison simple : sur dix-sept fichiers qui lancent de vraies recherches,
`node --test` n'écrit **rien** avant la fin — trois quarts d'heure de silence, une heure
sous charge. Le lanceur exécute **un processus par fichier** et annonce chacun deux fois,
au départ puis au verdict, avec l'horloge depuis le début :

```
[  0:00] départ   src/recherche/tests/lents/monotonie.test.js  ·  budget 1 h 30 min
[  0:00] départ   src/recherche/tests/lents/cible-phrase.test.js  ·  budget 1 h 07 min
[  0:26] vert     src/recherche/tests/lents/liaison.test.js  ·  2 tests, 25,8 s  ·  3/17
[  0:42] vert     src/recherche/tests/lents/sieges.test.js  ·  5 tests, 42,5 s  ·  4/17
[ 35:00] en vol   src/recherche/tests/lents/monotonie.test.js — 35 min 00 s, 12 tests faits, budget 1 h 30 min
```

Ce que cette passe-là a donné, le 16 septembre, à quatre voies sur machine chargée : deux
fichiers rouges sur dix-sept. `recherche.test.js` a rougi sur des tests de budget et de
temps, puis la relance seule l'a rendu vert — « vert seul, rouge sous charge ».
`monotonie.test.js` a rougi **et est resté rouge seul** : c'était une vraie régression, pas
la machine. Sans ce lanceur, il y aurait eu une heure de silence et une excuse toute
trouvée. À l'inverse, `progression.test.js` — longtemps soupçonné de rougir sous charge —
est passé du premier coup : la suite n'a qu'un seul fichier réellement sensible à la
charge, et c'est `recherche.test.js`.

Cinq règles, et elles se tiennent :

* **Un seul niveau de parallélisme.** `node --test` a le sien (`--test-concurrency`, qui
  compte des fichiers) ; on lui passe `--test-concurrency=1` et c'est le lanceur, et lui
  seul, qui ouvre les voies — `availableParallelism() / 2`, au moins une, réglable par
  `TEST_LENT_PARALLELISME`. Sans ça, les deux niveaux se multiplieraient.
* **Tout fichier rouge est rejoué SEUL**, rien d'autre en vol. S'il passe alors, il compte
  vert mais il est **signalé** « vert seul, rouge sous charge » dans le bilan : c'est une
  information sur la machine, pas un défaut à cacher. S'il rougit encore, c'est un vrai
  échec et le code de sortie est non nul. Un fichier dont le bilan TAP est illisible —
  processus tué, sortie tronquée — est un échec, jamais un succès par défaut.
  Cet isolement est strict, et il coûte : les relances n'attendent pas seulement qu'une
  voie se libère, mais que **toute** la passe soit finie. C'est le prix de l'étiquette —
  rejouer un rouge pendant que d'autres fichiers tournent ne permettrait plus d'écrire
  « vert seul » sans mentir.
* **Chaque fichier a un délai de garde proportionné à lui-même.** Le budget vaut
  `4 × sa durée de référence` (table `scripts/durees-lentes.json`), avec un plancher de
  3 min, et 90 min pour un fichier sans référence. Un dépassement compte **rouge**, donc
  part en relance seule — sur une machine vide, où la charge a disparu. Il ne pouvait pas
  s'agir d'une valeur unique : du plus court au plus long, ces fichiers s'étalent sur 39×.
* **Les plus longs partent en premier.** La queue d'une passe parallèle est dictée par son
  fichier le plus long ; le lancer en dernier ajoute sa durée entière au temps au mur.
  L'ordre de **lancement** suit donc les durées décroissantes — c'est un changement visible
  dans le journal — tandis que le **bilan reste trié par chemin**.
* **La reprise se demande.** Les fichiers verts sont notés au fil de l'eau dans
  `.test-lent-etat.json` (ignoré par git) ; `--reprise` (ou `TEST_LENT_REPRISE=1`) repart
  de là après une interruption. Une exécution normale repart **de zéro** : une reprise
  implicite mentirait sur ce qui a été vérifié.

Et jamais plus de soixante secondes sans nouvelles : quand rien ne tombe, une ligne de vie
dit ce qui est encore en vol, depuis combien de temps, combien de tests y sont déjà faits,
et quel budget lui reste — un dépassement devient prévisible au lieu d'être brutal.

```
[ 35:00] en vol   src/recherche/tests/lents/cible-phrase.test.js — 35 min 00 s, 12 tests faits, budget 67 min
```

Le verdict, lui, ne dépend ni de l'ordre ni du parallélisme : chaque fichier a son propre
processus, donc son propre état. `node scripts/test-lent.mjs --aide` liste les options.

**Sur une machine nettement plus lente que celle du relevé**, relevez le facteur —
`TEST_LENT_FACTEUR_DELAI=8` — plutôt que de subir des dépassements. Une vague de
« dépassement du délai de garde » est un signe de machine, pas de code, et le bilan le dit
lui-même quand tous les échecs sont de ce type. La table des durées se régénère par
`node scripts/test-lent.mjs --releve-durees`, jamais automatiquement : elle porte ses
conditions de relevé (date, cœurs, charge) pour qu'un lecteur puisse juger si elles valent
encore pour sa machine.

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

*(Cette forme par numéro se lit encore : elle relance la recherche et joue la voie de ce rang. Le site écrit désormais le programme lui-même — voir « Les liens », plus haut.)*

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

**Méthode 4 – La somme des 3 répétitions en gématrie simple**
- **Règle** : On utilise la gématrie simple (A=1, B=2... Z=26), puis on réduit la somme des trois mots.
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

## Où vit ce projet

- **Dépôt de référence** — https://framagit.org/1crea/numherololgeek
- **Miroir de publication** — https://github.com/Apophenie/apophenie.github.io
- **Le site** — https://apophenie.github.io

Les deux dépôts portent le même historique. Framagit protège sa branche
principale ; c'est de là que part la vérité, et GitHub sert la page.

## Licences

Ce site redistribue des œuvres de tiers, et il le dit — même quand la licence
ne l'exige pas.

| ce qui est couvert | licence | où la lire |
|---|---|---|
| **le code** de ce dépôt | AGPL-3.0-or-later | `LICENSE` |
| **Jost\*** et **JetBrains Mono** (l'interface) | SIL OFL 1.1 | `src/fonts/OFL-Jost.txt`, `src/fonts/OFL-JetBrainsMono.txt` |
| **DSEG7 Classic** et **DSEG14 Classic** (les afficheurs à segments) | SIL OFL 1.1 | `src/fonts/OFL-DSEG.txt` |
| **les trois sons** de la version scénique — tonnerre, brasier, effroi | CC0 1.0 | `src/sons/CC0-sons.txt` |

Le pied de page du site ne porte plus qu'une ligne — « Projet libre, remonter
aux sources » — et pointe ici : un pied de page dit à qui appartient ce qu'on
regarde, il n'a pas à réciter le contrat.
