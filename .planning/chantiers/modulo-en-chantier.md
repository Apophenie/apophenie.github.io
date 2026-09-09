# Le modulo — livré, et ce que le chantier a coûté

Ce fichier gardait un patch interrompu ; le modulo est désormais dans
l'historique et le patch a été retiré. Ce qui suit est ce qu'il a appris, et qui
vaut pour **tout opérateur neuf**.

## ⚠️ Une seule cause, quatre symptômes

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

## Les cinq déclarations d'un opérateur neuf

1. le registre `ORDRE_CANONIQUE`, en fin de bloc de sa famille (append-only) ;
2. un vecteur témoin dans `catalogue.test.js` (le gel), et les trois compteurs ;
3. `titres.js` : la forme courte, `PRECISIONS`, ET le nom de VEDETTE — trois
   tables distinctes, trois tests distincts ;
4. une saisie témoin d'où le geste est atteignable (`debug.js`) ;
5. `def({...})` dès le départ : le catalogue exige `cout`, `sortie`, `outil`
   bilingue et `note`, et les découvrir un par un en heurtant la validation est
   du temps perdu.

## Deux bornes mesurées

- **`MAX_TRANSFERTS` = 18** (`visuel/primitives/helpers.js`). Un geste qui montre
  chaque paquet partir n'est jouable que pour de petits quotients : `135 % 5` en
  demande vingt-sept et le moteur visuel refuse, à raison. L'opérateur refuse
  donc AVANT, plutôt que de fabriquer une voie injouable.
- **`NOEUDS_EXEMPLE` = 4500 par piste** (`app/pages/debug.js`). Sur une saisie
  longue, le niveau 2 de l'arbre est tronqué avant d'atteindre les états
  intéressants : `Capitalisme` mène pourtant à `tca+mz26+mmod` en trois codes,
  mais son arbre n'y arrive pas. D'où le témoin `Sept`, court exprès.

## Le geste, et ce qu'il ne fait pas

`group` en mode `modulo` ANIME les paquets ; il n'écrit pas le résultat. Comme
l'égalisation, l'émetteur pose sa valeur par un `substitute` explicite. Sans
lui, le jeton gardait `13` après un `13 % 5`, et l'étape suivante calculait sur
un nombre que la scène n'affichait plus — c'est le `sum` d'un scénario voisin
qui l'a dit, en refusant un calcul juste posé sur une ligne fausse.
