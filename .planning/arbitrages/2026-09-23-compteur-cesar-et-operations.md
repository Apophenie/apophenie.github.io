# Compteur de César et opérations simultanées

## Geste du César

Le nombre calculé rejoint la place de la cible dans « César 0 != N ».
Le nom, le zéro et la comparaison paraissent avec la table. L'alphabet du
haut est d'abord contigu ; son double naît sur lui et descend en dessous.

Un pointeur en forme de goutte apparaît entre « César » et le compteur.
La bande inférieure avance toujours dans le même sens, de 0 à N : un César
24 parcourt 24 crans, jamais deux crans dans l'autre sens. À chaque cran,
le compteur s'incrémente et le pointeur oscille. Le déplacement, les
oscillations et les chiffres partagent les mêmes instants.

À l'arrivée, « != » devient « = » et la couture séparant la fin de
l'alphabet de son retour à A s'ouvre. Le pointeur et « = N » s'effacent ;
le compteur atteint reste à côté de « César ». Les conversions ne
commencent qu'après cette simplification. Le titre se retire avec la table.

La glissière du César classique adopte aussi la duplication verticale,
le sens unique et la couture tardive. Le miroir Atbash conserve son
retournement. Les positions finales et les correspondances arithmétiques
ne changent pas.

## Opérations simultanées

Le contrôle visible s'appelle désormais « Opérations » : « Pas à pas » ou
« Simultanées ». Les noms internes et la préférence enregistrée restent
compatibles.

En mode simultané, les conversions indépendantes qui utilisent la même
table sont regroupées. Le décor et sa démonstration se déploient une seule
fois ; les lettres partent ensuite à 100 ms d'écart, reviennent converties,
puis la ligne se réajuste après le dernier retour. Les places nécessaires
aux valeurs plus longues sont réservées avant le départ.

Cela couvre les réglettes, les tables cycliques, les pavés et les
glissières. Les tables de restes partagent aussi leurs conversions dans
une fenêtre commune ; les rangées trop éloignées pour tenir dans le même
volet imposent un nouveau groupe après le défilement. Une conversion
consommant le résultat d'une précédente conserve cet ordre de dépendance.
Le réglage de vitesse globale s'applique également aux 100 ms.

## Vérification

Tests des 25 décalages : comptage exact, sens constant, une oscillation par
cran, alphabet contigu pendant le déplacement, égalité puis conversions.
Tests des vagues : écarts de 100 ms, déploiement unique, retours aux bonnes
places, répétition d'une même lettre et table de restes avec volet commun.
Le mode réduit et la vitesse doublée sont également exercés.

Suite rapide : 999 tests, 998 réussites, aucun échec, le TODO de glyphe
préexistant. Un test supplémentaire du volet partagé, ajouté ensuite,
passe aussi. Vérification dans Chromium de « Test » en César 4, avec
lecture simultanée, aux étapes 0, intermédiaire, égalité et conversion.

Après le raccord du titre au déplacement du décor, les 51 tests ciblés
(compteur, vagues, preuves, compilation et cadrage) passent aussi. Le titre
et la cible restent solidaires de la table quand une saisie longue défile.
Les cinq builds finaux réussissent. Une saisie de 55 lettres compile sans
avertissement dans les deux modes.

## Pointeur au contact des cases

Le pointeur est affiné et allongé jusqu'au bord inférieur de la réglette.
Le libellé est légèrement aligné pour placer sa pointe sur une jointure de
l'alphabet contigu. La jointure pousse la pointe pendant son passage :
l'angle suit son déplacement horizontal jusqu'au dégagement sous la case,
puis le pointeur revient en place.

Son fondu s'achève entièrement avant le recentrage de « César » et du nombre.
Les tests des 25 décalages contrôlent le contact géométrique et cet ordre de
retrait. Les 51 tests ciblés passent ; le contact est aussi vérifié dans
Chromium sur le César 4.
Les cinq builds passent après cet ajustement.
