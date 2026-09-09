# Les gestes arithmétiques — ce qui est livré, et ce qui manque encore

## Livré

| opérateur | codes | sortie sur `135` (ou `23`) |
|---|---|---|
| modulo, diviseur dissous / gardé | `mmod`, `mmoc` | `[3]` · `[3, 5]` |
| division, compte devant / reste devant / sans reste | `mdiv`, `mdvr`, `mdvq` | `[2, 3]` · `[3, 2]` · `[2]` |
| division décimale, 1 / 2 / 3 décimales | `mdc1`, `mdc2`, `mdc3` | sur `23` : `[0,6]` · `[0,6,6]` · `[0,6,6,6]` |

## ⚠️ Ce que la mise en scène ne tient pas encore

L'auteur a décrit trois gestes précis ; **la potence et le reste-devant sont
faits**, un seul reste en partie, et il faut le savoir avant de le regarder à
l'écran.

1. **Le compteur sous la pointe** (division entière). « B est retranché à A :
   part de A, passe au niveau de B, avant de descendre en dessous de l'accolade
   où 1 est ajouté. » Aujourd'hui on voit le dividende décroître par paquets,
   mais le quotient ne se compte pas sous les yeux : il se pose à la fin.
   **Pourquoi ça a échoué** : placer un jeton sous la pointe demande la position
   verticale des opérandes, qui n'existe pas quand le plan s'écrit
   (`scene.pos()` rend `y: null`). `accumulate` sait poser un total, mais il le
   fait avancer au rythme des opérandes VOLÉS, pas des retraits — le compteur
   ne compterait pas ce qu'on lui demande.
   **Piste** : un mode d'`accumulate` où le total avance sur un événement
   fourni, ou une position déduite de l'accolade (`tracerAccolade` connaît sa
   pointe) plutôt que des jetons.

2. ~~**La potence**~~ — **ÉCRITE** (`visuel/primitives/potence.js`). Les deux
   barres, le quotient chiffre à chiffre, la virgule à sa place, puis tout
   s'efface et le quotient rejoint la ligne sans elle. Le zéro de tête s'écrit
   — « 0×5 dans 1 de 105 » — parce que c'est le premier geste qu'on apprend et
   que la colonne des restes serait illisible sans lui.

3. ~~**La variante « l'accolade rétrécit »**~~ — **FAITE**, et j'avais mal lu.

   > « Le résultat n'est pas le même : 13/5 → 23, 13/5 → 32. » (l'auteur)

   Je les croyais identiques à l'animation près, donc doublons au registre. Ce
   sont deux NOMBRES : `mdiv` fait remonter le compte avant le reste (`2 3`),
   `mdvr` le laisse à sa place et pose le compte après lui (`3 2`). La suite du
   programme ne lit pas ces deux lignes pareil.

   ⚠️ Ce qui reste ici : les deux gestes se distinguent aujourd'hui par
     l'ORDRE des jetons posés, pas encore par l'accolade qui rétrécit puis se
     ré-étire. La différence se voit, mais elle ne se raconte pas.

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

### Le geste, et ce qu'il ne fait pas

`group` en mode `modulo` ANIME les paquets ; il n'écrit pas le résultat. Comme
l'égalisation, l'émetteur pose sa valeur par un `substitute` explicite. Sans
lui, le jeton gardait `13` après un `13 % 5`, et l'étape suivante calculait sur
un nombre que la scène n'affichait plus — c'est le `sum` d'un scénario voisin
qui l'a dit, en refusant un calcul juste posé sur une ligne fausse.

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
