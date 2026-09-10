# Les gestes arithmétiques — ce qui est livré, et comment ça se joue

## Livré

| opérateur | codes | sortie sur `135` (ou `23`) |
|---|---|---|
| modulo, diviseur dissous / gardé | `mmod`, `mmoc` | `[3]` · `[3, 5]` |
| division, compte devant / reste devant / sans reste | `mdiv`, `mdvr`, `mdvq` | `[2, 3]` · `[3, 2]` · `[2]` |
| division décimale, 1 / 2 / 3 décimales | `mdc1`, `mdc2`, `mdc3` | sur `23` : `[0,6]` · `[0,6,6]` · `[0,6,6,6]` |

## La mise en scène, telle qu'elle est maintenant

L'auteur a relu l'écran et tranché : « aucune animation n'est présente ou ne
serait-ce que vaguement satisfaisante. Pourtant je t'ai clairement décrit ce que
je voulais pour chaque, étape par étape. » Il avait raison sur les trois points.

### 1. Les quatre retraits grammaticaux — **fait**

> « Comme pour supprimer les voyelles, pour supprimer les articles il faudra
>   indiquer "articles non signifiants", les désigner par des accolades, puis
>   les supprimer. » (l'auteur)

Ce qui était émis : un `drop` nu, puis un `move`. Les mots s'évaporaient sans
qu'aucune accolade ne les désigne, et **le commentaire du fichier affirmait le
contraire** — « la scène des filtres pose l'accolade sur ce qui part avant de
l'effacer ». Le chemin existait bien dans `etapeRetrait`, mais il exigeait une
`mention`, que les quatre classes ne déclaraient pas : elles retombaient donc
sur l'effacement sobre, silencieusement.

Maintenant : **une accolade par mot qui part**, portant sa classe en toutes
lettres (`mots-outils.js › filtre.mention`), puis l'effacement. Une accolade par
ZONE CONTIGUË, et non une pour tous : sur « Le chat dort sur le tapis rouge »,
les deux articles sont aux deux bouts, et une accolade unique aurait affirmé que
« chat dort sur le tapis » est un article.

### 2. La division — **fait**, y compris le compteur sous la pointe

- **`A/B`, le signe entre les deux.** Il manquait : on lisait « 13 5 ». C'est un
  jeton de la ligne (`operator`), posé à l'ouverture ; l'accolade le redit sous
  sa pointe, elle ne le remplace pas. Même chose pour `A%B`.
- **Le compte se fabrique sous la pointe**, un cran par retrait. Le paquet part
  du dividende, passe au niveau du diviseur, descend sous l'accolade — et il
  **vaut `B` en partant, `1` en arrivant** : on retire cinq, ça compte pour un.
- **Les trois fins se distinguent.** `mdvq` dissout tout et ne laisse que le
  compte ; `mdvr` laisse le reste en place et pose le compte après lui ; `mdiv`
  resserre l'accolade sur le seul reste, puis fait remonter le compte devant lui
  en la ré-étirant.

⚠️ **Ce geste ÉCRIT désormais son résultat** — il ne se contentait plus
  d'animer. Il le fallait : le compte se construit sous la pointe, et un
  `substitute` qui l'aurait reposé juste après éteignait le compteur pour en
  rallumer un autre au même endroit. Le rejeu suit
  (`recherche/scenario.js › accumulerPlusieurs`).

⚠️ **ET LE CODE ÉTAIT ÉCRIT DEUX FOIS.** `mdvr` est arrivé après les divisions
  décimales, donc déclaré loin de ses jumeaux (registre append-only) — et
  recopié plutôt que partagé. Résultat : les corrections apportées à `mdiv` et
  `mdvq` ne le touchaient pas. Il y a maintenant une fabrique unique,
  `operateurDeDivision`, appelée aux deux endroits.

### 3. Le modulo — **fait**

Le `%` est un jeton. Et surtout, le diviseur ne s'efface plus sur place : il
**tombe dans l'accolade** (`drop` en mode chute), la ligne se referme, l'accolade
se resserre avec elle. « L'une dissout B dans l'accolade et fait disparaître
l'accolade dans le processus » — un effacement sur place ne disait pas où le
diviseur passait, il s'évaporait. Pour `mmoc`, seul le signe tombe : le
catalyseur demeure.

### 4. La potence — **fait**

Elle posait son quotient tout fait. Maintenant chaque chiffre se **compte** :
autant d'exemplaires du diviseur quittent le dividende que le chiffre en vaut, et
le chiffre monte d'un cran à chaque atterrissage. Quand il n'en part aucun —
« 5 ne tient pas dans 1 » —, le chiffre reste à zéro, et **c'est ce zéro-là
qu'il faut voir s'écrire**.

### 5. Et l'exemple choisi ne montrait rien — **corrigé**

La page de debug jouait `mdiv` sur `11 → 1 / 1` : un seul retrait, un reste nul.
Le geste était juste et ne se voyait pas. Les trois familles déclarent
maintenant un `exempleUtile` — deux retraits au moins, un reste non nul quand
l'opérateur le garde, une décimale au moins pour la potence —, et la page
choisit `Sept → tca+masb+mdiv`, où l'on voit `11 / 5` donner `2` puis `1`.

C'est le mécanisme prévu pour ça : « un exemple qui n'exerce pas le geste n'en
est pas un » (`app/pages/debug.js`). Il existait, personne ne l'avait branché
sur ces onze opérateurs — et un geste qu'on ne peut pas regarder à l'œuvre est
un geste qu'on croit fait.

### Ce qui reste

Rien des gestes décrits. Ce qui n'est pas fait et ne l'a jamais été demandé :
le « décalage de A sur la gauche pour insérer ",0" » de la potence se joue par
un changement de texte, pas par un déplacement — la colonne des restes ne bouge
pas, ce qui est d'ailleurs ce qu'on veut voir.

## Ce que ces chantiers ont appris

### ⚠️ Une seule cause, quatre symptômes

`apply` rendait un TABLEAU NU au lieu de `{valeur, traces}`.

`bfs.js › appliquerOp` tolère les deux formes — « tolérant sur la forme du
retour de `apply` », dit son commentaire — mais `catalogue.js › appliquer` passe
`brut.valeur` à la fabrique d'état, qui reçoit `undefined` et rend `null`. Vu du
catalogue, l'opérateur refusait donc PARTOUT, alors qu'il marchait parfaitement
vu du BFS. En cascade :

- « ces opérateurs ne sont jouables sur aucune saisie témoin » — `programmePour`
  passe par `appliquer` ;
- « aucun step, mais les jetons changent d'identité » — le test demande les
  steps sur un `apres` obtenu par `appliquer` ;
- « chaque scénario émis compile » et « la ligne rejouée » — mêmes causes en
  aval.

**Chercher la cause commune avant de traiter les symptômes** : j'ai d'abord
corrigé trois tables de titres et un témoin, ce qui était nécessaire mais ne
réglait rien.

### Les cinq déclarations d'un opérateur neuf

1. le registre `ORDRE_CANONIQUE`, en fin de bloc de sa famille (append-only) ;
2. un vecteur témoin dans `catalogue.test.js` (le gel), et les trois compteurs ;
3. `titres.js` : la forme courte, `PRECISIONS`, ET le nom de VEDETTE — trois
   tables distinctes, trois tests distincts ;
4. une saisie témoin d'où le geste est atteignable (`debug.js`) ;
5. `def({...})` dès le départ : le catalogue exige `cout`, `sortie`, `outil`
   bilingue et `note`, et les découvrir un par un en heurtant la validation est
   du temps perdu.

### Deux bornes mesurées

- **`MAX_TRANSFERTS` = 18** (`visuel/primitives/helpers.js`). Un geste qui montre
  chaque paquet partir n'est jouable que pour de petits quotients : `135 % 5` en
  demande vingt-sept et le moteur visuel refuse, à raison. L'opérateur refuse
  donc AVANT, plutôt que de fabriquer une voie injouable.
- **`NOEUDS_EXEMPLE` = 4500 par piste** (`app/pages/debug.js`). Sur une saisie
  longue, le niveau 2 de l'arbre est tronqué avant d'atteindre les états
  intéressants : `Capitalisme` mène pourtant à `tca+mz26+mmod` en trois codes,
  mais son arbre n'y arrive pas. D'où le témoin `Sept`, court exprès.

### Le geste, et ce qu'il fait — deux réponses, et elles diffèrent

`group` en mode `modulo` ANIME les paquets ; il n'écrit pas le résultat. Comme
l'égalisation, l'émetteur pose sa valeur par un `substitute` explicite. Sans
lui, le jeton gardait `13` après un `13 % 5`, et l'étape suivante calculait sur
un nombre que la scène n'affichait plus — c'est le `sum` d'un scénario voisin
qui l'a dit, en refusant un calcul juste posé sur une ligne fausse.

En mode `division`, **il écrit**. Le partage n'est pas le même parce que le
résultat n'est pas de la même nature : le reste d'un modulo est une valeur que
le dividende PORTE DÉJÀ, quand le quotient d'une division est un nombre que le
geste FABRIQUE, cran par cran, sous la pointe. Reposer ce compte par un
`substitute` revenait à éteindre le compteur pour en rallumer un autre au même
endroit — et le nombre qu'on venait de voir se construire n'était pas celui qui
entrait dans la ligne.

### L'ordre de déclaration est celui du registre

Écrire un opérateur neuf au-dessus d'un autre déjà enregistré, même pour la
lisibilité, fait refuser le catalogue au chargement (§4.1 règle 3) — mesuré deux
fois en ajoutant les divisions au-dessus des modulos. Le registre est
append-only ; le fichier suit.

### Élargir le catalogue révèle des défauts ailleurs

Les trois divisions décimales ont fait remonter une voie de moisson qui récolte
seize six et n'en montre que quinze, sur « Le chat dort sur le tapis rouge ».
Le défaut était préexistant : le contrôle « on ne récolte que ce qu'on montre »
ne valait que pour la variante groupée. Un catalogue plus large est aussi un
test plus large.

### Un test de déterminisme peut mesurer la machine sans le dire

`recherche.test.js › une horloge hostile` exigeait qu'aucune troncature
temporelle n'ait lieu « au repos », sur une saisie de quatre secondes pour un
filet à cinq. `node --test` exécutant les fichiers en PARALLÈLE, la machine
n'est jamais au repos pendant la suite : la marge tenait par chance, et elle a
sauté quand le catalogue et les scénarios se sont allongés. Symptôme trompeur —
rouge dans la suite, vert seul — qu'il faut savoir distinguer d'une régression :
mesurer le temps de recherche AVANT et APRÈS (il était inchangé) et relancer le
fichier isolé.

### Un commentaire peut mentir, et rien ne l'attrape

Trois gestes ont été déclarés faits, documentés comme faits, et ne l'étaient
pas. Aucun test ne regardait l'ÉCRAN : ils vérifiaient que le calcul est juste
et que la scène compile — deux choses vraies d'une animation absente.

`src/visuel/tests/gestes-decrits.test.js` existe pour ça. Il ne vérifie aucun
résultat : il vérifie qu'une accolade se pose AVANT l'effacement, que le signe
de l'opération est un jeton, que le compteur passe par 1 avant d'arriver à 2.

### Ce qu'on avait déclaré impossible

> « Placer un jeton sous la pointe demande la position verticale des opérandes,
>   qui n'existe pas quand le plan s'écrit (`scene.pos()` rend `y: null`). »

C'était faux. `tracerAccolade` REND le point où tombe son résultat
(`acc.resultat`) — c'est par lui que toute somme pose sa case, depuis toujours.
La bonne conclusion aurait été de le lire, pas de renoncer au geste. Une
impossibilité constatée en cours de route mérite d'être vérifiée contre ce que
le voisin fait déjà.
