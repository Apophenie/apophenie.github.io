# La RETOUCHE : ce qui a été livré, et ce qui reste

> Ce document est un **report** et un **passage de relais**, pas une recherche.
>
> Tout ce qui était annoncé est FAIT : la grammaire (`;`), le rejeu, la scène,
> le lien canonique, le générateur de recherche — et, depuis, **le barème qui
> charge l'étage amont** (§3) et **la scénographie du 6 surnuméraire** (§4).
> L'étage est **branché par défaut**.
>
> Ce qui reste est écrit à la fin du §3 : le balayage des trois bornes du
> générateur l'une contre l'autre, et un désaccord entre `LETTRE_VERS_LETTRE` et
> le catalogue que ce chantier a rendu visible sans le corriger.

---

## 1. La demande, telle que l'auteur l'a écrite

> Pour "Donald Trump" ce que je voudrais, et qui n'est pas encore géré :
> `#so!2.1:fr13,tca+mtal+m14+mpf#2HuP1G8mNg3sJWhqR`
> En gros, on fait la conversion fr13 sur le 2nd mot, puis on trie l'ensemble,
> on applique m14 à l'ensemble, on enlève les chiffres minoritaires / on garde
> le chiffre majoritaire.
>
> […] si le programme entre ## s'écrit différemment, ça me va du moment que ça
> produit l'effet que je décris.
>
> Il reste un 6 de trop au verdict ; une fois les 6 réunis, celui (ou les deux)
> du centre surnuméraire disparaît (explose en mode scénique pour propulser les
> autres à grossir avant que la foudre ne les enflamme).

## 2. Ce qui est livré

**La notation est `;` et non `,`** — voir l'en-tête de `src/recherche/url.js`,
qui porte l'argument complet. En deux lignes : la virgule dit déjà « ces deux
morceaux donnent chacun leur chiffre », et `url.js` **lit la grammaire sans
catalogue** (c'est ce qui permet de tester `src/recherche` sur un catalogue de
fantaisie), donc il ne peut pas trancher en regardant si `fr13` rend du texte ou
un chiffre. Le sens devait être écrit, pas déduit.

**Le lien exact qui produit la démonstration décrite** :

```
#so!2.1:fr13;fl+tca+mtal+m14+mpf#2HuP1G8mNg3sJWhqR
```

Deux écarts avec ce que l'auteur avait écrit, tous deux mesurés :

- la virgule devient `;` (ci-dessus) ;
- **`fl` s'ajoute en tête du second étage**, et ce n'est pas un ornement : `tca`
  fait un jeton de l'espace entre les deux mots, et `m14` n'a aucun segment pour
  une espace. Sans `fl`, le programme n'est pas applicable et le lien est refusé
  (`retouche — un programme qui ne rend PAS du texte est refusé, en le disant`,
  `tests/integration-visuel.test.js`).

Ce lien rend `Donald Gehzc` → `acDdeGhlnoz` → `[7,4,6,6,6,6,6,3,6,6,4]` →
`[6,6,6,6,6,6,6]` : **sept 6, donc deux séries et un 6 de trop** — exactement ce
que l'auteur annonce.

## 3. ~~Ce qui reste, n° 1~~ : QUE LE BARÈME CHARGE LA RETOUCHE — **FAIT**

C'était le vrai chantier, et il commandait tout le reste. Il est rendu :
l'étage est **branché par défaut**, et le barème le paie.

### Ce que le barème en voit

Les opérations d'une retouche voyagent toujours dans `approche.retouches`, à
côté de `approche.parts` et jamais dedans — la raison n'a pas bougé, elle est
dans `index.js › rejouer` : `parts` signifie « un morceau qui rend un chiffre »,
et y verser une préparation fabriquerait une PARTITION là où il n'y en a pas.
Ce qui a changé, c'est que `elegance.js › bilanApproche` **lit cette liste**.

L'étage se paie donc deux fois, et les deux sont distinctes :

1. **au tarif ORDINAIRE**, pour ses gestes. Une transformation en amont est une
   transformation ; sa nature compte avec elle. On n'en retient que le
   PROCESSUS (`POSTES_DU_PROCESSUS`) : une retouche finit sur du TEXTE, elle n'a
   pas de vecteur, et sa géométrie — les 6, la largeur, les triptyques, la
   casse — n'a aucun sens ;
2. **au palier `BAREME.RETOUCHE`** (420 milli-unités), qui dit ce que le tarif
   ordinaire ne dit pas : on a réécrit la question avant d'y répondre.

Un seul palier, pas deux : retoucher pour ne lire QUE la portée réécrite est
déjà lourdement facturé par `PORTEE_IGNOREE` (−872 sur « Donald Trump », plus
−48 de blocs écartés), et un second palier facturerait deux fois le même
reproche. Le coût croît **linéairement** avec le nombre d'étages ; rien n'en
émet plus d'un, et l'on ne règle pas un exposant sur zéro observation.

### Ce que le palier a coûté à régler, MESURÉ

Ce qu'une retouche ACHÈTE, sur les vingt et une voies retouchées du corpus — le
même programme rejoué SANS elle, crédit contre crédit, palier à zéro : gain le
plus faible **266**, gain **MÉDIAN 544**, gain le plus fort **720**. À comparer
aux **54** milli-unités que le seul tarif ordinaire facture à `fr13` (14 de
transformation + 40 de `lettre → lettre`) : le socle seul aurait vendu une série
au dixième de son prix, et le générateur n'en propose une QUE si elle rapporte.

Balayage du palier, chaque liste comparée à celle que rend l'étage débranché :

| palier | têtes changées | voies retouchées en 1ʳᵉ ligne | en 2ᵈ ligne |
|---|---|---|---|
| 0   | **1** (« Marie Curie ») | 1 | 2 |
| 240 | **1** (« Marie Curie », de 5 milli-unités) | 1 | 2 |
| 246 | 0 | 0 | 3 |
| 390 | 0 | 0 | 3 |
| **420** | **0** | **0** | **2** |
| 540 | 0 | 0 | 2 |
| 720 | 0 | 0 | 2 |
| 1 000 | 0 | 0 | 2 |

420 est le premier palier où plus **aucune voie du corpus n'est déplacée** par
une retouche : c'est là que `jean-michel` rend sa 2ᵈ ligne à la moisson honnête
`tca+m14,fr2+tca+m14+mpf`, qui aligne le même compte de séries. Au-delà, rien ne
bouge plus jusqu'à 1 000 — on n'achèterait que de la sévérité.

### Ce que le branchement coûte en TEMPS, MESURÉ

À JIT chaud, sur les cinq cas de `budget — le pipeline complet tient sous la
seconde`, l'étage branché contre l'étage tu :

| | sans | avec |
|---|---|---|
| `Lorem ipsum…` (60 fragments) | 770 ms CPU | **826 ms** (+56) |
| `x` × 400 | 492 ms | 529 ms (+37) |
| `Le chat dort sur le tapis…` | 450 ms | 410 ms (−40, sous le bruit) |
| `https://hope-hope-hope.fr/` | 383 ms | 283 ms (−100, sous le bruit) |

Le pire cas reste à 826 des 1 000 ms du contrat. À FROID, la mesure ne dit plus
rien : le premier `resoudre` d'un processus paie 2 à 3 secondes de JIT, avec ou
sans l'étage — c'est ce que le test constate quand il rougit, et il rougissait
déjà avant.

### Ce qui reste ouvert sur cet étage

- **Les trois bornes de `groupementsRetouches`** (six mots, quatre vecteurs, la
  saisie entière seule) n'ont toujours pas été balayées L'UNE CONTRE L'AUTRE :
  on sait ce que leur produit coûte, pas ce que chacune achète.
- ⚠️ **`LETTRE_VERS_LETTRE` a perdu de vue le catalogue, et ça se voit ici.** Le
  poste nomme trois identifiants — `f.atbash`, `f.rot13`, `f.leet` — et son
  commentaire affirme que le catalogue n'en porte pas d'autre. Ce n'est plus
  vrai : les vingt-cinq autres décalages de César y sont entrés sous `f.cesar1`
  à `f.cesar25`, et ils ne paient **rien** là où `fr13` paie 40. Tant que
  l'étage amont était gratuit, l'écart ne se voyait pas ; il se voit maintenant,
  et il suffit à faire passer `2.1:fatb;…` devant `2.1:fr13;…` sur « Donald
  Trump », à geste rigoureusement identique. Non corrigé ici — ce poste touche
  presque toutes les voies du corpus et son tarif a été étalonné en croyant
  qu'il frappait tous les césars. Mesuré au passage : le corriger déplace **une
  seule tête de liste** sur dix-neuf, « Millicent »
  (`fr10+tca+mhe+mrn` → `fr13+tca+mx6+mrn`).

## 4. ~~Ce qui reste, n° 2~~ : LE 6 SURNUMÉRAIRE QUI EXPLOSE — **FAIT**

> « Il reste un 6 de trop au verdict ; une fois les 6 réunis, celui (ou les deux)
> du centre surnuméraire disparaît (explose en mode scénique pour propulser les
> autres à grossir avant que la foudre ne les enflamme). »

**Livré.** L'argumentaire complet est dans `CONTRACTS.md`, amendement « LE 6 DE
TROP N'EST PLUS JETÉ : il EXPLOSE au verdict ». En bref :

- le surnuméraire n'est plus jeté à l'étape de récolte : il reste sur la ligne
  jusqu'au verdict, et il y reste **au milieu**
  (`recherche/scenario.js › lesPlusCentraux`, exportée et éprouvée sur sa table) ;
- le verdict le reçoit dans `reveal.surnumeraires` et se déplie en **deux temps**
  au lieu de trois : rassembler les sept, puis l'explosion et l'agrandissement
  au même instant. Le temps de découpage disparaît — le trou que le 6 laisse EST
  la séparation, au centième d'unité ;
- le dessin vit dans `visuel/primitives/explosion.js`, qui n'est **pas** une
  vingt-deuxième primitive : le retrait est déjà nommé par le scénario, seule sa
  FORME s'ajoute. Le souffle est réservé au registre scénique, comme les cornes
  et l'orage.

Sur le lien de l'auteur (`#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#…`) l'étape
qui retirait le 6 excédentaire **n'existe plus du tout** : elle ne faisait que
cela. Et les deux triptyques révélés cessent d'être un mélange pour devenir le
666 de « Donald » et celui de « Trump », tous deux couronnés en chemin.

**Ce qui n'a pas été fait, et qui n'a pas été demandé** : rien ne touche à la
foudre ni au brasier, qui suivent l'agrandissement comme avant — « avant que la
foudre ne les enflamme » était déjà l'ordre en place (`reveal.js ›
allumerLOrage`, qui n'éclate qu'une fois le mouvement fini).

Tests : `visuel/tests/explosion.test.js` (11), `recherche/tests/scenario.test.js`
(4) et le contrôle croisé des deux modèles de scène dans
`recherche/tests/integration-visuel.test.js`.

## 5. Où regarder dans le code

| | |
|---|---|
| la grammaire, et POURQUOI `;` | `src/recherche/url.js`, en-tête |
| l'étage amont au rejeu | `src/recherche/index.js › rejouer` |
| les codes qui nomment la retouche | `src/recherche/index.js › marquerLesCodes` |
| le générateur, branché | `src/recherche/assemblage.js › groupementsRetouches` |
| le prix de l’étage | `src/recherche/elegance.js › BAREME.RETOUCHE` |
| ce que le bilan en retient | `src/recherche/elegance.js › POSTES_DU_PROCESSUS` |
| la ligne de base du réglage | `node .planning/banc/classement.mjs --sans-retouches` |
| la scène | `src/recherche/scenario.js`, « L'ÉTAGE DES RETOUCHES » |
| le sous-titre qui la nomme | `src/recherche/titres.js › regleApproche` |
| les tests | `tests/url.test.js`, `tests/recherche.test.js`, `tests/integration-visuel.test.js` |
