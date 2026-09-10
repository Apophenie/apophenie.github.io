# Les tests LENTS — ceux qui lancent une vraie recherche

> « Peux-tu réserver les tests lourds pour une commande spécifique, qui
>   s'exécute en CI et que tu peux lancer de temps à autre si besoin, mais la
>   sortir des tests de routine. Quand tu travailles sur les animations de
>   certains opérateurs, ça ne change rien aux résultats, seulement à
>   l'animation, donc inutile de faire des calculs à rallonge, ce n'est pas là
>   dessus que tu travailles. » (l'auteur)

## Le critère

**Un test est ici s'il lance une recherche complète** — `resoudre()`,
`chercher()`, ou le dépliage de l'arbre d'exemples. Pas « s'il est dans
`recherche/` » : `src/app/lents/debug.test.js` y est aussi, parce qu'il déplie
l'arbre pour chacun des 176 opérateurs.

Ce qui reste en routine : le catalogue, les tables, les primitives visuelles, la
compilation des scénarios, l'i18n, l'URL, l'interface. Tout ce qui se vérifie
sans chercher.

## Les trois commandes

| commande | ce qu'elle couvre | durée mesurée |
|---|---|---|
| `npm test` | la routine | **53 s** |
| `npm run test:lent` | les recherches complètes | ~10 min |
| `npm run test:tout` | les deux | — |
| `bun run check` | les deux + les cinq passes de build | — |

## Ce que le découpage a coûté à trouver

La routine faisait **398 secondes**, et j'ai cru deux fois avoir trouvé la
cause :

1. « c'est la concurrence entre mes runs » — non : mesurée seule, la suite
   faisait toujours 398 s ;
2. « ce sont les quatre gros fichiers de `recherche/tests/` » — ils pesaient
   826 s cumulés, les sortir n'a rien changé au total.

Ce qui l'explique : `node --test` exécute les fichiers **en parallèle**, donc la
durée totale est celle du fichier le plus long, pas la somme. Retirer quatre
fichiers de 500 s ne sert à rien s'il en reste un de 260 s. Il a fallu mesurer
**chaque test**, pas chaque fichier — et les vrais coupables n'étaient pas ceux
que je soupçonnais :

| fichier | poids |
|---|---|
| `curseurs.test.js` | ~260 s |
| `titres.test.js` | ~140 s |
| `scenario.test.js` | ~65 s |
| `progression.test.js` | ~55 s |
| `app/lents/debug.test.js` | ~35 s |

⚠️ **Mesurer un fichier isolément ne dit pas ce qu'il coûte à la suite.** Seul,
`recherche.test.js` prend 528 s ; dans la suite, il est masqué par les autres qui
tournent en même temps. C'est le maximum qui compte, pas la somme.

## ⚠️ Deux tests mesurent du TEMPS, et le découpage les a d'abord aggravés

- `progressif — la liste rendue est exactement celle de la version synchrone`
- `déterminisme — une horloge hostile écourte, mais ne ment jamais`

Ces deux-là comparent un résultat obtenu sous filet temporel à un résultat de
référence : sous charge, le filet tronque la recherche plus tôt et les deux
divergent, alors que le code est parfaitement déterministe.

Regrouper les neuf fichiers les plus lourds dans une seule commande a CONCENTRÉ
la charge — huit cœurs, neuf recherches complètes — et les a fait rougir tous
les deux, alors que chacun passe seul. D'où `--test-concurrency=2` sur
`test:lent` : la durée totale ne change presque pas (elle est déjà dominée par
`recherche.test.js`), et la machine garde de la marge.

Si l'un des deux rougit malgré tout, **le relancer seul avant de conclure à une
régression** :

```
node --test src/recherche/tests/lents/progression.test.js
node --test --test-name-pattern="horloge hostile" src/recherche/tests/lents/recherche.test.js
```

## Les trois `todo` d'arbitrage

Trois tests de moisson portent `{ todo: 'arbitrage ouvert…' }` : ils s'exécutent,
leur échec est RAPPORTÉ, et ils ne font pas tomber la suite. Les voir en rouge
dans la sortie est normal ; c'est `ℹ fail` qui compte.

## Quand les lancer

- **`npm test`** : à chaque changement. C'est le filet de routine.
- **`npm run test:lent`** : dès qu'on touche à `recherche/`, au barème, au
  classement, ou qu'on ajoute un opérateur au catalogue — et avant de livrer.
- Un changement d'ANIMATION ne change aucun résultat de recherche : la routine
  suffit, et c'est tout l'objet de cette séparation.
