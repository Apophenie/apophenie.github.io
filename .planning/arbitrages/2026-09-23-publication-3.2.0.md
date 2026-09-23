# Publication 3.2.0 — décision et validation

La publication avait d’abord été conditionnée à la suite lente exhaustive.
Le numéro 3.2.0 et le README étaient préparés localement. Le tag
`v3.1.0-debug` conserve l’état avant corrections. Les constats ci-dessous
décrivent ce premier arrêt et les raisons de la décision ultérieure.

## Défaut reproduit

Le test `src/recherche/tests/lents/elegance.test.js:403`, « traductions — la
recherche n’en produit plus aucune », échoue dans la passe complète et dans
une exécution ciblée indépendante de ce fichier :

```sh
node --test --test-name-pattern='traductions — la recherche' src/recherche/tests/lents/elegance.test.js
```

L’exécution ciblée dure 25,2 secondes. Elle constate, pour
`https://hope-hope-hope.fr/`, une traduction divergente là où le contrat exige
zéro. La voie signalée est :

```
fr14+tca+m14+mpf,tca+mas+mdc1,tca+mas+mmoc+cmo,ffr3+tca+m14+mpf,tca+mtc+cs,ffr+nl,tca+mtc+cs,ffr+nl,tca+mas+cs+pm10,fr13+nlc+pc9,tca+mas+mmoc+cmo
```

Cette reproduction ciblée a lieu alors que d’autres fichiers de la suite
continuent : elle ne remplace pas la relance sans concurrence du lanceur.
Elle montre néanmoins une violation sémantique sur une voie effectivement
produite, et pas seulement un dépassement de délai.

## Autres verdicts provisoires

Au moment du relevé, la passe parallèle a également signalé des échecs dans
`cible-mot`, `cible-phrase`, `recherche`, `integration-visuel` (cadrage),
`elegance` (classement) et `titres`. Le lanceur doit encore terminer sa passe
et rejouer les fichiers rouges seuls. Ne pas transformer ces diagnostics
provisoires en liste de régressions confirmées sans lire leurs sorties finales.
Le journal reste `/tmp/corrections-check.log` ; le diagnostic ciblé des
traductions est `/tmp/publication-traductions.log`.

La correction des opérations simultanées est indépendante de ces verdicts :
1 014 tests rapides passent avec le TODO préexistant, puis les 490 tests
visuels et de preuves César passent après le dernier ajustement des horaires.
Les cinq builds du code final réussissent.

La condition initiale demandait de résoudre les défauts confirmés et d'obtenir
une passe exhaustive verte. Les deux remotes sont `origin`
(Framagit, référence) et `apophenie` (GitHub Pages) ; la publication du site est
déclenchée par `main`. Les deux distants étaient sur `v3.1.0` lors du fetch.

## Décision ultérieure

Le défaut des traductions divergentes est corrigé. Une autre passe exhaustive
a atteint la limite mémoire de Node dans `cible-mot` après environ sept minutes.
Le coût historique de cette passe était de 6 614 secondes de CPU et 43 minutes
au mur. Après audit, `bun run check` conserve les tests rapides, deux parcours
complets représentatifs et les cinq builds ; les balayages historiques se
lancent séparément avec `bun run test:exhaustif`.

L’auteur a ensuite demandé explicitement de publier sans attendre cette passe
exhaustive. Le contrôle courant est vert : 1 017 tests rapides réussis, un TODO
préexistant, deux parcours complets réussis, cinq builds réussis. La
reproductibilité du logo et des segments, ainsi que les fichiers de partage,
ont été vérifiés avant la publication.
