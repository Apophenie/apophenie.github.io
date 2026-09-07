# Proposition — faire du score moteur le score global affiché

> « J'aimerais que tu décomposes les critères actuels du moteur de manière à
>   pouvoir produire le score moteur en tant que score global. […] H C N A E R,
>   peux-tu rendre ces métriques moins obscures ? […] Il n'y a pas que 6
>   métriques, il y en a davantage. Je les voudrais toutes, et ta proposition de
>   répartition entre les 4 — simplicité, cohérence, exhaustivité, quantité —,
>   avec quelle formule d'assemblage dans chacune et quel % entre les 4 pour
>   retrouver le score moteur. » (l'auteur, 7 septembre 2026)

Ce document est une PROPOSITION. Rien de ce qu'il décrit n'est appliqué ; le
code fait aujourd'hui ce que la partie 1 décrit, et rien d'autre.

## 1. Ce que le score moteur contient VRAIMENT — tout, en mots

Le score d'une voie (`score.js › noter`) n'est pas une moyenne de six critères :
c'est une base linéaire, puis une suite de multiplications, puis un RANG qui
passe avant le score, puis trois régimes de classement selon la place.

### 1.1 Les huit grandeurs mesurées sur la voie (0 à 1000)

| lettre | nom dans le code | ce qu'elle mesure, en un mot | comment |
|---|---|---|---|
| H | homogénéité | **unité de méthode** — les parts emploient-elles le même procédé ? | similarité moyenne des chemins deux à deux (paliers 1000 / 900 / 600 / 300 / 50) ; 1000 pour une part unique |
| N | notoriété | **familiarité des procédés** — sont-ils connus du public ? | (moyenne + minimum) / 2 de la notoriété des opérateurs |
| U | couverture | **part de la saisie utilisée** — combien de caractères servent ? | (utilisés / signifiants)^1,5 ; les caractères jetés par un filtre ne comptent plus |
| C | concision | **brièveté** — combien d'étapes ? | 0,88^(étapes − 2) |
| A | anti-ad-hoc | **absence de bidouille** — les procédés sont-ils taillés sur mesure ? | produit des (1 − adHoc) des opérateurs |
| E | élégance des nombres | **lisibilité des nombres** — petits, remarquables, positifs ? | moyenne par nombre intermédiaire : ≤ 30 → 1000, ≤ 100 → 850, ≤ 999 → 650, au-delà → 350 ; négatif ×0,85 ; remarquable +100 |
| R | rendement | **part du résultat qui sert** — quelle fraction des chiffres produits vaut la cible ? | 6 / largeur du vecteur (la plus large du chemin pour les ficelles qui écartent) |
| G | crédit d'élégance | **propreté de la démonstration** — le barème des gestes | socle 1000 ± quarante postes tarifés (`elegance.js › BAREME`), en trois familles |

Les quarante postes du barème G se rangent en trois familles (`NATURE`), et
c'est important pour la suite :

- **famille quantité** (ce qui fait des 666) : triptyque contigu +260, triptyque
  répété +90, 6 surnuméraires +22 chacun (plafonné) ;
- **famille exhaustivité** (ce qu'on n'a pas lu ou qu'on a jeté) : portée jamais
  lue −1600 (proportionnel), lettre arrachée −26, bloc écarté −20, bloc court
  −10, ponctuation −5, valeur calculée puis jetée −300 ;
- **famille élégance** (tout le reste, une trentaine de postes) : couronnement
  tôt +150, solde multiple de trois +90, additions +55/+22, triptyque cassé
  −430, 6 détruit −48, transformation en trop −14, retouche −420, traduction
  divergente −600, effacement sans motif −520, redécoupage −450, écriture en
  lettres −420, égalisation −200, majorité −180, arrondi −96, min/max −72…

### 1.2 Comment elles s'assemblent (au défaut des curseurs)

```
base   = (250·H + 200·N + 180·U + 150·C + 120·A + 100·E) / 1000      → 0…10 000
base   = base × 0,83                                                  (réserve des bonus)
     + 800  si résonance (trois fois le même texte)
     + 500  si couverture totale (brut = 1000)
     + 400  si sans pirouette (ni joker, ni ad hoc, ni décret)
     × 0,45 par joker
     × 0,75 si un fragment fait moins de deux caractères signifiants
     × 0,80 en mode LIBRE (fragments disjoints)
     × √R                                                             (rendement)
     × facteur(G)  = G borné à [520 ; 1000] / 1000                    (propreté)
     × 0,40 si décret (un chiffre obtenu, trois annoncés)
score  = borné à [0 ; 10 000]
```

Le global affiché sur les cartes, lui, est `(simplicité + exhaustivité +
quantité + cohérence) / 4`, où les axes sont dérivés de la base linéaire
seulement (voir 1.4). Il ne voit ni les bonus, ni les malus, ni √R (sauf par
moitié dans l'exhaustivité), ni G, ni le rang.

### 1.3 Ce qui passe AVANT le score : le rang, puis trois régimes

**Le rang** (`RANG`) : les voies à **au moins deux séries sur des caractères
disjoints** passent devant toutes les autres, qui passent devant les
CONVERGENCES (la même chaîne relue trois fois). À l'intérieur du premier rang,
le nombre de séries décide avant le score. C'est la consigne d'origine :
« privilégie celle qui donne le plus de séries sans réutiliser les mêmes
caractères, puis les plus simples ».

**Trois régimes de classement**, un par place (`index.js › selectionner`) :

| place | régime | ce qui classe, dans l'ordre |
|---|---|---|
| 1ʳᵉ | **élégance** | convergences en dernier ; puis **mérite = (G₁ + 1000) × U × R** où G₁ est le crédit avec la famille quantité à 1 % ; puis séries ; puis pureté ; puis score |
| 2ᵈ | **abondance** | rang ; puis **séries** ; puis G₂, le crédit avec la famille quantité à 100 % et l'élégance à 33 % ; puis score — retenue seulement si elle a plus de séries que la 1ʳᵉ |
| 3ᵉ+ | **mixte** | rang ; puis séries ; puis **score** ; puis sélection MMR (pénalité de redondance λ, quota par méthode) |

C'est ce que l'auteur résume ainsi : « le 1ᵉʳ où l'élégance prime et la
quantité est négligeable, le 2ᵈ où la quantité est centrale, et la suite où
c'est un mix ».

### 1.4 Les quatre axes affichés aujourd'hui, et ce qu'ils voient

| axe | formule actuelle (`scoresParAxe`) | ce qu'il ignore |
|---|---|---|
| simplicité | (125·H + 150·C) / 275 | A, les malus |
| cohérence | (125·H + 200·N + 120·A + 100·E) / 545 | G tout entier, le bonus « sans pirouette », le malus joker |
| exhaustivité | (U + R) / 2 | le bonus couverture totale, la famille exhaustivité de G |
| quantité | séries / 9 | le rang, la famille quantité de G, la résonance, le décret |

Réponse à la question posée : **oui, les quatre axes sont issus des six —
pour deux d'entre eux entièrement, pour l'exhaustivité à moitié (R n'est pas
un des six), pour la quantité pas du tout** (aucun des six ne compte les 666).

## 2. La proposition : quatre axes qui contiennent TOUT, et un global qui EST le score

Principe : chaque grandeur de 1.1 à 1.3 est rangée dans UN axe, selon son sens.
Chaque axe vaut 0 à 1000 et absorbe ses pièces multiplicatives EN SON SEIN —
c'est ce qui permet ensuite une moyenne pondérée honnête entre les quatre. Le
moteur classe alors sur ce global, et la carte affiche ce qui classe.

### 2.1 La répartition

**Simplicité — « est-ce court et d'un seul tenant ? »**

```
simplicité = ( 150·C + 125·H ) / 275
           × 0,75 si un fragment est creux
           × 0,80 en mode LIBRE
```

**Cohérence — « est-ce propre, familier, sans bidouille ? »** (elle « cache
essentiellement l'élégance », et reçoit tout ce qui ne se case pas ailleurs)

```
cohérence = ( 200·N + 125·H + 120·A + 100·E + 300·Gé ) / 845
            où Gé = famille élégance du barème, ramenée à [0 ; 1000]
              (socle 1000 + postes de la famille, borné — c'est facteur(G) restreint à cette famille)
          + 40  si sans pirouette                      (le bonus de 400, à l'échelle de l'axe)
          × 0,45 par joker
```

**Exhaustivité — « a-t-on lu toute la saisie, et tout ce qu'on a produit
sert-il ? »**

```
exhaustivité = ( U + R + Gx ) / 3
               où Gx = famille exhaustivité du barème, ramenée à [0 ; 1000]
                 (portée jamais lue, lettres arrachées, valeurs jetées)
             + 50 si couverture totale                (le bonus de 500, à l'échelle)
```

**Quantité — « combien de 666, et sont-ils gagnés ? »** — c'est ici que le
rang entre, comme l'auteur le pressent : « tes histoires de rang pourraient
rentrer dedans »

```
quantité = 1000 × séries / 9
         + 200 si les séries sont sur des caractères DISJOINTS (rang SERIES, ≥ 2 séries)
         + Gq  famille quantité du barème (triptyques contigus / répétés, surnuméraires), ramenée
         + 80 si résonance                                (le bonus de 800, à l'échelle)
         × 0,40 si décret     (un décret est exactement une fraude à la quantité : un 6 montré trois fois)
         × 0,50 si convergence (les mêmes caractères servent trois fois)
         borné à [0 ; 1000]
```

Le rang cesse d'être une précédence absolue et devient une prime — c'est le
seul point où la proposition CHANGE la doctrine, et il faut le dire : une
moisson à deux séries ne passera plus automatiquement devant un groupement à
une série parfait, elle le fera si son avance en quantité l'emporte sur son
retard en simplicité et cohérence. C'est précisément ce que les neuf cas
d'`AB-testing.html` mettent en balance.

### 2.2 Les pour-cent entre les quatre — un jeu par régime

Les parts sont choisies pour reproduire l'INTENTION de chaque régime de 1.3,
pas ses détails d'implémentation. Elles sont ce que le leste affiche.

| régime | simplicité | cohérence | exhaustivité | quantité | ce que ça reproduit |
|---|---|---|---|---|---|
| **1ʳᵉ place — élégance** | 20 % | 50 % | 30 % | **0 %** | mérite = (G₁ + 1000) × U × R : la propreté, pondérée par ce qu'on a lu et ce qui sert ; la quantité à 1 % dans G₁ |
| **2ᵈ place — abondance** | 5 % | 20 % | 15 % | **60 %** | séries d'abord, puis G₂ (quantité pleine, élégance au tiers) |
| **3ᵉ et suivantes — mixte** | 25 % | 30 % | 20 % | 25 % | la base linéaire actuelle (simplicité 275, cohérence 545, exhaustivité 180 sur 1000) rééquilibrée pour faire une place à la quantité, qui n'en avait aucune |

Au défaut des curseurs, le régime mixte est aussi ce que les quatre curseurs
« Régler ce qui compte » déplacent : un curseur à 200 double la part de son axe
avant renormalisation, exactement comme aujourd'hui.

### 2.3 Ce que la forme additive perd, et qu'il faut accepter

1. **Le veto multiplicatif.** Aujourd'hui un joker (×0,45) ou un rendement de
   30 % (×0,55) écrase TOUT le score. Dans un axe, il n'écrase que sa part :
   un joker en cohérence à 30 % coûte au plus 16 % du global. Si l'on tient au
   veto, on garde un seul facteur GLOBAL hors des axes — `× 0,45 par joker` —
   et on l'affiche comme tel (« malus ×0,45 : joker »), à côté du global.
2. **Le rang comme précédence.** Voir 2.1 : il devient une prime de 200 sur la
   quantité. C'est un choix ; l'autre choix — garder le rang et ne classer par
   le global qu'à l'intérieur de chaque rang — est aussi honnête et se
   montre aussi bien (une ligne de séparation entre les rangs dans la liste).
3. **La sélection reste une sélection.** Le MMR (diversité, quota par méthode)
   choisit QUI entre dans la liste ; il ne note pas. Ce n'est pas un ingrédient
   du score et il n'a pas à figurer dans le global.

### 2.4 Ce qu'il faudrait toucher

- `score.js` : `noter` calcule les quatre axes selon 2.1 et le score comme
  moyenne pondérée selon le régime demandé ; `scoresParAxe` rend ces quatre
  axes (et plus une dérivation de `CORRESPONDANCE`) ; `ordreTotal`,
  `ordreElegance`, `ordreTriptyques` deviennent « trier par le global du
  régime », puis les départages actuels ;
- `elegance.js` : `credit` rend le crédit PAR FAMILLE (il sait déjà le faire,
  `detailDuCredit` porte la famille de chaque ligne) ;
- `resultat.js` : la part affichée par le leste vient du régime de la carte
  (`approche.suggestion`), pas seulement des curseurs ;
- les tests d'étalonnage et les quatre cas de référence (`elegance.test.js`)
  sont à rejouer — et l'on saura, cas par cas, ce qui a bougé.

## 3. Ce que je propose de faire, dans l'ordre

1. L'auteur arbitre les neuf cas d'`AB-testing.html` : c'est la mesure de ce
   que le passage au global changerait en tête de liste.
2. Il tranche 2.3-1 (veto ou part) et 2.3-2 (prime ou précédence).
3. J'applique 2.1 et 2.2, je rejoue le corpus, et je liste les têtes qui ont
   bougé avec leurs quatre axes — les lestes disent alors, sur chaque carte,
   pourquoi.
