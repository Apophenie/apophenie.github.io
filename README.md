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

### Le rythme de la démonstration

Le lecteur propose **Pas à pas**, une opération après l'autre, et
**Simultané**, où les opérations indépendantes du même type démarrent avec
un décalage de 0,1 seconde. Chaque caractère converti possède son afficheur ;
quand la place manque, les conversions se répartissent en plusieurs vagues.
Le Registre conserve toutes ses entrées dans les deux modes.

Ce choix remplace l'accélération des redites et se mémorise. Le curseur de
vitesse reste indépendant. En mode sobre, les étapes de couronnement sont
entièrement absentes ; en scénique, les cornes apparaissent également après
le dernier calcul.

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
| `?:Donald Trump` | cherche, puis anime la première voie — le geste de Révéler |
| `?$:Donald Trump` | cherche, puis énumère les voies |
| `?$:Donald Trump$:111` | la même liste, pour une autre cible (troisième segment) |
| `?sce!m14$:hope` | joue ce programme-là, sans recherche, en registre scénique |

* **C'est le nombre de séparateurs qui décide, jamais l'écriture de la saisie.**
  `?<saisie>` anime, `?$<saisie>` énumère — que la saisie soit en base58 ou en
  clair derrière `:`, indifféremment. Une règle qui ne se voit pas dans le lien
  n'a pas à en changer la page.
* Les marqueurs se rangent en deux familles, et une seule décide. Les **réglages
  de recherche** — la cible (`c111!`), les curseurs (`p25.200.50.150!`), la
  fouille (`f2!`) — paramètrent l'énumération et n'empêchent pas la liste. Le
  **registre de mise en scène** — `sce!`, et `so!` dans les liens d'hier — dit
  comment MONTRER, donc il demande l'animation : `?so!$<saisie>` anime.
* Les segments se séparent par `$`. Le site a d'abord vécu dans le fragment
  (`#…#…`), ce qui était hors grammaire : la RFC 3986 interdit un `#` dans un
  fragment, et certains navigateurs recodaient nos liens. **Les liens publiés
  sous cette forme continuent de s'ouvrir, à l'identique et pour toujours** ;
  seule la forme neuve s'écrit, et la barre d'adresse se corrige à l'ouverture.
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
[  0:00] départ   src/recherche/tests/lents/monotonie.test.js  ·  budget CPU 1 h 30 min · mur 2 h 00 min
[  0:00] départ   src/recherche/tests/lents/cible-phrase.test.js  ·  budget CPU 1 h 30 min · mur 2 h 14 min
[  7:19] vert     src/recherche/tests/lents/cible-mot.test.js  ·  13 tests, 7 min 19 s au mur, 6 min 07 s de CPU  ·  1/17
[ 14:58] vert     src/recherche/tests/lents/recherche.test.js  ·  69 tests, 14 min 58 s au mur, 21 min 08 s de CPU  ·  4/17
[ 21:50] vert     src/recherche/tests/lents/sieges.test.js  ·  5 tests, 20,1 s au mur, 25,6 s de CPU  ·  12/17
```

Ce que cette passe-là a donné, le 16 septembre, à quatre voies sur machine chargée : deux
fichiers rouges sur dix-sept. `recherche.test.js` a rougi sur des tests de budget et de
temps, puis la relance seule l'a rendu vert — « vert seul, rouge sous charge ».
`monotonie.test.js` a rougi **et est resté rouge seul** : c'était une vraie régression, pas
la machine. Sans ce lanceur, il y aurait eu une heure de silence et une excuse toute
trouvée. À l'inverse, `progression.test.js` — longtemps soupçonné de rougir sous charge —
est passé du premier coup : la suite n'a qu'un seul fichier réellement sensible à la
charge, et c'est `recherche.test.js`.

Le 17 septembre, machine calme, la même passe est verte de bout en bout : 17 fichiers,
360 tests, **43 min 35 s au mur pour 1 h 50 min de CPU cumulées sur quatre voies** — et la
somme des CPU relevés par fichier retombe à **0,0 %** près sur ce que le noyau compte au
lanceur pour tous ses enfants.

Ce 0,0 % vaut pour une passe **verte du premier coup**, et il faut le dire, parce qu'une
relance change l'arithmétique : elle *remplace* le résultat de la passe 1, si bien que le
fichier ne compte plus qu'une fois dans la somme alors que le noyau a vu tourner les deux
exécutions. Mesuré sur deux passes ne différant que par ce point : **0,1 % d'écart sans
relance, 48,7 % avec** — et la différence valait exactement le CPU de l'exécution écartée.
La sonde ne perdait rien ; c'était la soustraction qui était mauvaise. La ligne de contrôle
réconcilie donc désormais les deux, nomme le CPU écarté, et n'affiche plus qu'un **écart
résiduel** — sans quoi elle aurait crié au loup à chaque passe comportant un rouge, et on
aurait cessé de la lire. La mesure CPU répond du même coup à la question que le mur
laissait ouverte sur `recherche.test.js` : ce fichier ne dépasse aucun budget de travail,
il **brûle plus de CPU que de mur** — 21 min contre 15 — parce qu'il occupe plus d'un cœur.
S'il rougit sous charge, ce n'est donc pas le garde du lanceur qui le tue, c'est
`test('budget — chaque fragment reste sous BUDGET_MS')`, qui mesure au `performance.now()`
réel. **Et cette assertion-là doit rester murale** : elle teste une promesse faite à
l'utilisateur, et le temps d'attente d'un humain ne se compte pas en cycles. La métrique
du lanceur et celle du produit n'ont pas à être la même — c'est exactement pourquoi
l'étiquette « vert seul, rouge sous charge » continue d'exister à côté des deux bornes.

**La démonstration, mesurée plutôt qu'affirmée.** Le même sous-ensemble de quatre fichiers,
même parallélisme, même table — d'abord sur machine libre, puis sous huit brûleurs occupant
les huit cœurs (charge 4,2 contre 18,0) :

| fichier | mur au calme → sous charge | | CPU au calme → sous charge | |
| --- | --- | --- | --- | --- |
| `titres` | 194 s → 303 s | **×1,56** | 198 s → 190 s | ×0,96 |
| `elegance` | 194 s → 314 s | **×1,62** | 198 s → 206 s | ×1,04 |
| `cible` | 194 s → 314 s | **×1,62** | 193 s → 203 s | ×1,05 |
| `curseurs` | 223 s → 360 s | **×1,61** | 232 s → 242 s | ×1,04 |
| **cumul** | 805 s → 1 291 s | **×1,60** | 821 s → 841 s | **×1,02** |

Le mur enfle de **61 %**, le CPU de **2,4 %**. La dispersion dit le reste : les quatre
ratios muraux tiennent dans une bande étroite — 1,56 à 1,62 — parce qu'ils ne mesurent pas
les fichiers, ils mesurent la machine ; les ratios CPU tiennent entre 0,96 et 1,05,
c'est-à-dire du bruit. C'est ce résultat, et lui seul, qui autorise une table **commitée** :
elle décrit ce que le travail coûte, et non le jour où on l'a relevée.

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
* **Chaque fichier a DEUX bornes, et le verdict dit laquelle a sauté.** Le budget de
  **travail** se compte en **temps CPU** — `4 × sa référence CPU` (table
  `scripts/durees-lentes.json`), avec un plancher de 3 min. C'est ce que le fichier
  coûte, et cela ne bouge pas quand la machine se remplit : mesuré en temps écoulé, le
  même fichier enfle de 1,3× à 2,7× selon ce qui tourne à côté, et on compensait ce
  gonflement à la main. Le filet **anti-blocage**, lui, reste **mural** et plus large —
  `8 × sa référence murale`, plancher 5 min — parce qu'un test arrêté sur une attente, un
  verrou ou une socket ne consomme *aucun* CPU : une garde en CPU ne le couperait jamais.
  Dépasser l'une ou l'autre compte **rouge**, donc part en relance seule — sur une machine
  vide, où la charge a disparu. Aucune ne pouvait être une valeur unique : du plus court au
  plus long, ces fichiers s'étalent sur 39×.
  Le message distingue les deux, et c'est tout l'intérêt : « dépassement du budget CPU »
  accuse le fichier, qui travaille vraiment plus que sa référence ; « dépassement du délai
  de garde mural (2,0 s) alors qu'il n'a brûlé que 0,2 s de CPU » accuse une **attente**.
  Sans cette distinction, on diagnostique de travers.
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
**combien de CPU il a brûlé**, et quels budgets lui restent — un dépassement devient
prévisible au lieu d'être brutal. Le CPU en vol est l'information qui manquait le plus :
un fichier à trente minutes de mur et deux minutes de CPU n'est pas lent, il attend.

```
[  2:15] en vol   src/recherche/tests/lents/recherche.test.js — 2 min 15 s, 0 test fait, 2 min 18 s de CPU, budget CPU 1 h 30 min · mur 2 h 00 min
```

Le verdict, lui, ne dépend ni de l'ordre ni du parallélisme : chaque fichier a son propre
processus, donc son propre état. `node scripts/test-lent.mjs --aide` liste les options.

**Comment le CPU est mesuré**, puisque Node n'expose pas le `rusage` de ses enfants. Le
fichier est lancé sous un `sh` de service dont le builtin `times` rend, à la sortie, le CPU
cumulé de toute la descendance — exact, sans échantillonnage. En parallèle, `/proc` est
échantillonné à la seconde : c'est la seule source *pendant* la course, donc la seule qui
puisse armer la garde CPU. Les deux sont des **minorants** — `times` rate une descendance
non moissonnée quand le garde a tué le processus, l'échantillon rate le CPU brûlé depuis le
dernier tic — et le lanceur retient la plus grande, en disant laquelle. Il faut l'**arbre**
et pas le fils : `node --test` isole chaque fichier dans un petit-fils, et le fils direct
affichait `0,11 s` de CPU pendant que son petit-fils en brûlait `2 536`. Le bilan recoupe
enfin sa somme avec ce que le noyau compte au lanceur (`cutime`/`cstime`), deux chemins
indépendants sur la même quantité. **Hors Linux**, pas de `/proc` : la garde CPU disparaît,
le filet mural reste seul, et la sortie comme la table le **disent** — jamais un chiffre
muet dont on ignore la nature.

**Sur un runner nettement plus lent que la machine du relevé**, relevez les facteurs —
`TEST_LENT_FACTEUR_CPU=8` et `TEST_LENT_FACTEUR_MUR=16` — plutôt que de subir des
dépassements. Le temps CPU est insensible à la *charge* d'une machine, pas à la *vitesse*
de son processeur : les deux bornes montent ensemble. Les anciens noms
(`TEST_LENT_FACTEUR_DELAI`, `TEST_LENT_PLANCHER_DELAI`, `TEST_LENT_DELAI_INCONNU`) restent
acceptés, et chacun fait dire une ligne rappelant sur quelle borne il retombe — jamais en
silence. Une vague de « dépassement du délai de garde mural » est un signe de machine, pas
de code, et le bilan le dit lui-même quand tous les échecs sont de ce type ; une vague de
« dépassement du budget CPU » dit l'inverse, et relever le facteur ne ferait que la cacher.

La table se régénère par `node scripts/test-lent.mjs --releve-durees`, jamais
automatiquement. Elle porte ses conditions de relevé (date, cœurs, charge, d'où vient son
CPU) **et un champ `metrique` qui dit en toutes lettres en quoi ses nombres sont
libellés** : une table dont il faut deviner l'unité est exactement ce qui a permis, des
semaines durant, de prendre une métrique mal choisie pour une fatalité de la mesure.

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
