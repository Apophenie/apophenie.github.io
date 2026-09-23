# Vérifications de recherche

La routine (`bun run test`) vérifie directement les règles, le catalogue, les
URL et le moteur visuel. Elle ne lance pas de recherche exhaustive.

`bun run test:lent` ajoute deux parcours complets et courts dans
`essentiels.test.js` : recherche → rejeu → scène, puis recherche d'une moisson
sur une URL répétitive. Ce second cas garde la règle selon laquelle un même
mot ne doit pas recevoir deux traductions dans une démonstration. La règle de
comptage elle-même est testée en quelques millisecondes dans
`tests/traductions.test.js`.

`bun run test:exhaustif` exécute les anciens balayages avec le lanceur
`scripts/test-lent.mjs`. Il reste utile pour étudier le classement, les
variations de cran et les budgets, mais ne fait plus partie de `bun run check` :
son relevé du 17 septembre totalisait 6 614 secondes de CPU et 2 615 secondes
au mur sur quatre voies. Les plus gros fichiers répètent des recherches
complètes sur de nombreuses entrées et plusieurs réglages. Certains coupent le
filet temporel, compilent chaque voie, ou gardent les résultats successifs en
mémoire. Une passe récente a atteint environ 4 Go et a avorté dans
`cible-mot.test.js`.

Pour examiner un seul fichier :

```sh
node --test src/recherche/tests/lents/elegance.test.js
```

Le lanceur exhaustif garde `--reprise` et `--motif=GLOB` pour éviter de refaire
les fichiers déjà verts ou ceux qui ne concernent pas le chantier.
