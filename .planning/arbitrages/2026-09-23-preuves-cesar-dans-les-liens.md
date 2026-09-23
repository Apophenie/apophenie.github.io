# Séparer le choix d’une preuve César de son rejeu

## Constat mesuré

`fjN` ne transporte que le décalage. `justificationCesar` appelle
`preuvesNumeriques`, qui énumère et trie les lectures possibles, même si une
preuve courte suffit. `apply` et la construction de l’animation demandent
cette justification. Le cache de 256 saisies évite de refaire l’énumération
dans le même processus ; il ne garantit rien à la première ouverture du lien.

Mesure locale sous Node, cinq processus neufs par saisie, imports exclus :
environ 35 ms médians pour « Test », 49 ms pour « Didier Raoult », 88 ms pour
« Anticonstitutionnellement ». Une première mesure sur 100 lettres identiques
prend 821 ms. Les valeurs dépendent du matériel et de la saisie ; elles ne
mesurent ni le réseau ni la compilation de l’animation. Le choix n’est donc
pas négligeable dans tous les cas. Reproduction :
`node scripts/mesurer-preuves-cesar.mjs`.

Le problème est aussi sémantique : changer le classement des preuves peut
changer la démonstration d’un ancien lien, alors que son décalage reste égal.

## Syntaxe proposée — pas encore implémentée

Une preuve numérique accompagne son opérateur :

`fjN~1~SOURCE~OP.OP~INDEX`

- `1` : version du descripteur de preuve.
- `SOURCE` : `a` pour toute l’entrée du César, ou `sDEBUT.LONGUEUR` pour une
  tranche en points de code Unicode, indexée à partir de zéro. C’est l’entrée
  après les opérations précédentes, pas nécessairement la saisie d’origine.
- `OP.OP` : codes des opérations effectivement retenues, dans leur ordre.
- `INDEX` : indice du nombre retenu dans le résultat, à partir de zéro ; zéro
  pour un scalaire.

Exemples :

- `fj5~1~a~nl~0` sur « Louis » : nombre de lettres.
- `fj4~1~s0.1~tca.ma1~0` sur « Didier Raoult » : rang de D.
- `fj6~1~s0.6~tm.mlm.cp~0` sur « un mot » : produit des longueurs 2 et 3.

La lecture historique des caractères communs possède son descripteur dédié :
`fj22~1~communs`, par exemple sur « Louis Fouché ». Elle recalcule seulement
cette règle déterminée, sans énumérer les autres preuves.

Les caractères proposés n’ajoutent aucun `+`, `,`, `:`, `;`, `$` ou `#` : les
séparateurs actuels de programmes, fragments, portées et saisies restent
distincts. Le lecteur des codes doit néanmoins être étendu explicitement ;
ces exemples ne sont pas encore des liens exécutables.

## Frontière entre les deux métiers

La recherche choisit une preuve et la conserve sur chaque occurrence du
César dans le chemin, sans muter l’opérateur partagé du catalogue. L’écriture
du lien sérialise cette preuve avec les codes de cette occurrence.

Le rejeu lit et valide le descripteur, applique uniquement ses opérations à
une copie de la source indiquée, vérifie que le résultat sélectionné est un
entier égal à N dans 1…25, puis construit l’atelier et le César. Aucun tri,
aucune énumération, aucun repli vers une autre preuve en cas d’erreur. La
vérification arithmétique reste indispensable : un nombre écrit dans le lien
n’est pas une preuve.

Les anciens `fjN` restent lisibles via une résolution de compatibilité,
suivie d’une réécriture explicite du lien. C’est l’exception historique,
identifiée comme telle ; les nouveaux liens n’en dépendent plus. `frN`
conserve son sens de décalage sans preuve.

L’intégration devra couvrir le parseur et l’écriture canonique, les chemins
de recherche, le rejeu, les retouches et fragments répétés, puis vérifier
qu’aucun appel à l’énumérateur n’a lieu lors du rejeu d’une preuve explicite.
Elle devra conserver la famille et le score de l’opérateur César, ainsi que
la distinction entre liens utilisant des preuves différentes.
