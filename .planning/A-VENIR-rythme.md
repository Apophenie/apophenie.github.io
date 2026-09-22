# Le rythme des gestes — chantier terminé

Branche : `rythme-pas-a-pas-ou-simultane`.

## Comportement livré

- L’ancien mode « redites » est remplacé par « Pas à pas » / « Simultané ».
  Le réglage persiste ; il disparaît en mouvement réduit.
- **Pas à pas** attend la fin de chaque geste transformant, quel que soit son
  type. Les marques (étiquettes, surlignages, etc.) accompagnent ces gestes.
- **Simultané** lance les opérations de même type sur des caractères
  indépendants avec un décalage de 0,1 s à vitesse normale.
- Les conversions sept segments, quatorze segments et comptage de traits
  partent réellement en vagues. La taille de la vague vient de la place
  disponible à pleine échelle ; la suivante attend la fin de la précédente.
- Chaque caractère possède son encart, placé avant le départ de la vague,
  sans déplacer les compteurs pendant leur comptage. Les nombres descendent
  à la place de leur caractère, puis la ligne se redistribue une seule fois.
- `mrn` réduit en largeur, deux items à la fois.

## Registre et navigation : aucune conversion perdue

Le scénario conserve une étape et une figure par conversion. Le compilateur
regroupe temporairement les étapes simples et indépendantes, puis restitue
**toutes** les entrées dans `timeline.steps`, avec leur titre, leur légende et
leur figure d’origine. Il n’y a donc aucun changement à apporter au Registre,
ni au repli textuel lorsque le moteur visuel est indisponible.

Dans une vague, les bornes de navigation désignent les départs successifs :
0, 100, 200 ms à vitesse normale. La dernière entrée de la vague couvre la fin
des comptages et la redistribution commune. Revenir à une entrée montre donc
la conversion concernée au moment où elle commence, avec les voisines déjà en
cours. Le nombre d’entrées et les indices restent identiques quand on change
le rythme. En mouvement réduit, les étapes demeurent séparées.

Les étapes dotées d’une durée explicite ne sont pas regroupées. Les pauses
`hold` sont mutualisées en fin de vague : leur maximum est conservé une fois.
Les dépendances entre caractères interdisent également un regroupement.

## Vérifications et maintenance

Les tests `rythme.test.js` et `afficheurs-ranges.test.js` couvrent notamment :
ordre temporel stable, séquence stricte entre types différents, vagues à
0,1 s, arithmétique identique, conservation des entrées accessibles, absence
de chevauchement/débordement, fermeture des cadres et absence d’animations
concurrentes pour les trois primitives de comptage.

`RYTHME_DEFAUT` reste `pasAPas`, dans `src/visuel/rythme.js`.
La réduction d’échelle demeure disponible dans le solveur, mais les vagues
privilégient la lisibilité à pleine taille. `fadeAt` reste une dépendance
numérique que l’ordonnanceur reporte quand les gestes sont décalés.

Le reliquat d’instrumentation `.tmp-ops.mjs` a été supprimé.
