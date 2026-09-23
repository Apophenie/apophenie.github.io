# Séparer le choix d’une preuve César de son rejeu

## Constat

Le choix implicite de `fjN` énumérait et triait les lectures possibles au
chargement du lien. Mesures initiales locales : environ 35 à 88 ms médians
pour des textes courts, 888 ms pour 100 caractères. Le cache du processus
ne supprimait pas le coût de première ouverture. Modifier le classement des
preuves pouvait aussi changer la démonstration d’un même lien.

## Syntaxe implémentée

`fjN~[DEBUT[.LONGUEUR]~]OPERATIONS[~INDEX]`

- Sans portée : toute l’entrée du César, après les opérations précédentes.
- Portée : indices en points de code Unicode, à partir de zéro ; longueur 1
  implicite. `0` désigne le premier caractère, `3.2` les deux à partir de 3.
- Opérations : codes séparés par des points. `tca` est implicite lorsque la
  conversion suivante exige des jetons et que l’entrée est encore du texte.
- Résultat : indice zéro implicite, y compris pour un scalaire.
- `fjN~c` désigne exclusivement le comptage historique des caractères communs.

Exemples :

- `fj5~nl` sur « Louis » : nombre de lettres.
- `fj4~0~ma1` sur « Didier Raoult » : rang de D.
- `fj6~0.6~tm.mlm.cp` sur « un mot » : produit des longueurs 2 et 3.
- `fj2~ma1~1` sur « AB » : second résultat du rang alphabétique.
- `fj22~c` sur « Louis Fouché » : caractères communs.

Les formes explicites comme `fj4~0.1~tca.ma1~0` se canonicalisent en
`fj4~0~ma1`. Aucun marqueur de version n’est nécessaire pour cette première
syntaxe. Les séparateurs externes `+`, `,`, `:`, `;`, `$` et `#` restent
inchangés. Deux recettes différentes restent deux programmes distincts.

## Frontière entre recherche et rejeu

La recherche choisit la preuve et dérive un opérateur propre à l’occurrence,
avec le même identifiant, la même famille et le même coût que le César.
La finalisation des chemins issus des autres branches de recherche inscrit
également leur preuve dans les descripteurs de fragments et de retouches.
Les exemples du débogueur produisent la même syntaxe.

Le rejeu résout cet opérateur dérivé, exécute seulement les opérations
indiquées sur une copie de la source et exige un entier égal à N dans 1…25.
L’animation utilise cette même recette. Aucun tri, aucune énumération,
aucun repli vers une autre preuve si celle fournie est fausse. Les opérations
admises sont les lectures numériques et leurs combinaisons ; une recherche
arithmétique telle que `mrdE` n’est pas admise dans une recette.

**Aucune rétrocompatibilité**, à la demande de l’auteur : les `fjN` nus sont
refusés à la lecture et à l’écriture des liens. Ils restent des opérateurs
internes à la recherche, pas une syntaxe publique de rejeu. `frN` conserve
son sens de décalage sans preuve.

## Vérification

Tests : canonicalisation des implicites, refus des preuves fausses ou
incomplètes, indices Unicode, résultat non initial, fragments groupés,
retouches, conservation du catalogue, les 25 décalages et toutes les recettes
numériques découvertes sur trois saisies témoins. Les tests de rejeu remplacent
les sélecteurs implicites par des fonctions qui lèvent une erreur pour
vérifier qu’ils ne sont jamais appelés, y compris en construisant la scène.

Le script `node scripts/mesurer-preuves-cesar.mjs` compare la résolution et
la vérification d’une preuve d’initiale explicite avec l’énumération implicite,
dans cinq processus neufs par saisie, imports hors mesure. Après modification,
le rejeu explicite mesuré reste sous 8 ms sur les quatre saisies (4 à 100
caractères) ; l’énumération atteint encore environ 755 ms médians sur 100
caractères. Ce sont des mesures locales, pas une garantie pour toute recette
ni une mesure du chargement complet de la page.

Validation finale : 1 007 tests dans la suite rapide, 1 005 réussites, un
TODO de glyphe préexistant et un échec de mesure CPU du lanceur de tests
(`scripts/test-lent.test.js:856`), réussi au rejeu isolé. Les cinq tests dédiés
passent aussi après le dernier ajustement de grammaire. Les cinq builds
réussissent. Ouverture vérifiée dans Chromium du lien
`?sce!fj22~c+fl+m14$7NFn8xBqb5eNAq3YCY` : atelier de preuve, César et registre
complet jusqu’au verdict.
