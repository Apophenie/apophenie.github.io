# L'absorption arithmétique — `mab`

> « Sur des objectifs comme "Sarah Kerrigan" → 31031998, on n'arrive pas à une
> exhaustivité parfaite. Il y a une phase de suppression des encombrants qui
> fait perdre toute crédibilité à l'approche. […] additionner les autres
> chiffres autant de fois que nécessaire pour les dissoudre dans l'existant.
> […] Malus de simplicité, bonus d'exhaustivité. Je voudrais arriver à
> toujours proposer un chemin sans aucune perte, même s'il ne remonte pas
> toujours en premier résultat ; si avec les réglages je fais primer
> l'exhaustivité, alors il doit remonter. » (l'auteur)

Banc : `node .planning/banc/absorption-banc.mjs` (`--json`, `--tete N`).

## 1. Ce que fait l'opérateur

`mab` (`m.absorption`, `NUMS → NUMS`, `mappeurs.js › planAbsorption`) lit la
cible par `selonLaCible`, comme `mrd`. Il consomme **tous** les chiffres de la
ligne et rend **exactement** la cible, dans l'ordre, une ou plusieurs fois
d'affilée — ou `null`. Jamais « presque » : une ligne qui ne se plie pas est
refusée, pas approchée.

1. Chaque nombre s'écrit chiffre à chiffre (le step de `mrd`).
2. La ligne se découpe en paquets contigus, **un par chiffre de la cible à
   écrire** (`partition`, une accolade par paquet).
3. Chaque paquet se **fond** dans le chiffre attendu, ou s'**écrit** en
   plusieurs chiffres de la cible d'un coup.

La programmation dynamique (`meilleur[i][j]` : `i` chiffres consommés, `j`
chiffres de la cible écrits) cherche d'abord **le plus de séries** — chaque
série est autant de chiffres gardés tels quels —, puis **le moins de gestes à
l'écran** (le « malus de simplicité », compté en étapes montrées). Départage
fixe (§4.4) : rang croissant, coupe croissante, une part avant deux avant
trois, produit avant différence. Entiers partout, aucun `Math.random`.

## 2. Les règles arithmétiques

Un paquet se coupe en une, deux ou trois **parts** contiguës ; chaque part vaut
la somme de ses chiffres ; le paquet vaut :

| forme | valeur | ce qui est montré |
|---|---|---|
| une part | la somme | `insertOperators +` puis `sum` |
| deux ou trois parts | le **produit** des parts | une somme par part de ≥ 2 chiffres, puis `insertOperators ×` et `sum` (symbole `×`, partiels = produits partiels) |
| deux parts, `a ≥ b` | la **différence** `a − b` | idem avec `−` |

puis la valeur se **fond** — sa racine numérique est le chiffre attendu, et
chaque palier de réduction est un `reduce` dans sa propre étape, comme `mrn` —
ou s'**écrit** — ses chiffres épellent la suite attendue (`4 + 6 = 10` écrit
« 1 0 », le geste de `mrd`, un `substitute` greffé sur le dernier calcul). Un
chiffre seul qui est déjà le bon est **gardé** (coût 0).

Ce que l'arithmétique modulo 9 impose, et pourquoi il y a quatre leviers :

- `n ≡ somme des chiffres de n (mod 9)` : ni une addition, ni une racine
  numérique, ni l'écriture chiffre à chiffre ne changent la classe modulo 9.
  Un chiffre `d` n'absorbe donc **additivement** qu'un groupe d'intrus de
  racine 9 (`3 + 4 + 5 = 12 → 3`). Sur une ligne dont la somme n'est pas
  congrue à celle de la cible, aucune quantité d'additions ne suffit.
- Le **produit** change la classe : `9 × k` a toujours 9 pour racine, `0 × k =
  0` — un 9 ou un 0 de la cible avale n'importe quoi ; `6 × k` et `3 × k`
  reviennent à 6 et 3 quand `k ≡ 1 (mod 3)` (`6 × 4 = 24 → 6`, `6 × 7 = 42 →
  6`) ; pour les autres chiffres il faut `k ≡ 1 (mod 9)`. Et deux sommes
  d'intrus savent fabriquer le chiffre à elles seules (`(9+7+1) × (1+0) = 17
  → 8`).
- Un **0 ne s'obtient jamais par une somme** de chiffres non tous nuls, ni en
  tête d'une somme écrite. La **différence** (`5 − 5 = 0`) est le seul chemin
  vers un 0 quand la ligne n'en porte aucun — `01111984` commence par un 0.

## 3. Les limites, exactement

- **Longueur** : au plus 36 chiffres (`CHIFFRES_ABSORPTION_MAX`, aligné sur
  `mad`/`mrd`), au plus 12 chiffres par paquet (`PAQUET_ABSORPTION_MAX`), au
  plus 3 parts par paquet. `ma1` sur « Le chat dort sur le tapis rouge » fait
  40 chiffres : refusé ; `m14` (25 chiffres) passe.
- **Ordre** : les paquets sont contigus et dans l'ordre de la cible. Le
  **premier chiffre** de la cible doit sortir d'un préfixe de ≤ 12 chiffres,
  le dernier d'un suffixe — c'est là que la plupart des refus se jouent.
- **Cibles sans 9 ni 0** (`111`, `13`…) : il n'y a pas de puits universel ;
  chaque paquet doit tomber juste par somme, produit (`k ≡ 1`) ou différence.
  La liberté des coupes suffit sur les lignes de 14 chiffres et plus (« Éléonore
  à Nîmes » → 111 : 27 des 34 lectures se plient), presque jamais en dessous
  de 8.
- **Lignes courtes** : « hope » (4 lettres) ne se plie sur 666 par aucune
  lecture directe — `6 6 6 6` (`m14`) ne peut absorber un 6 de trop (`6+6 →
  3`, `6×6 → 9`, `6−6 → 0`), et `8 1 5 1 6 5` (`ma1`) n'a pas de coupe qui
  tombe. L'opérateur rend `null` sur ces lignes-là ; c'est une traduction
  (`ffr2`, puis `ma1`) qui fournit la ligne qui se plie, et la recherche la
  trouve. Rien n'est approché : là où aucune lecture ne se plie, la liste ne
  propose pas de voie sans perte, et le dit.
- **Cible `000`** : possible (là où `mad` et `mrd` se désactivent) par `0 × k`
  ou `a − a`, à condition que la ligne porte des 0 ou des parts égales.

Vérifié : déterministe (deux appels, même plan), refuse une ligne qui écrit
déjà la cible (rien à montrer), refuse les négatifs et les lignes plus courtes
que la cible, `viser('666') === op`.

## 4. Ce que la scène montre

Une étape par geste, comme `mad` et `mrd` depuis la consigne de l'auteur, donc
une ligne du Registre par geste :

```
64 5 6 64 → 6 4 5 6 6 4           substitute          (chiffre à chiffre)
6 4 5 6 6 4 → 6 · 456 · 64        partition           (la découpe : la DÉCISION)
4 + 5 + 6 = 15                    insertOperators,sum
15 → 1 + 5 → 6                    reduce
6 × 4 = 24                        insertOperators,sum (symbole ×, partiels 6 → 24)
24 → 2 + 4 → 6                    reduce
```

Sur « Henri Prunelle Chochotte » → `01111984` (`fl+tca+mch`) :
`5 − 5 = 0` · `5 × 2 = 10 → 1` · `8 + 2 + 6 = 16`, `16 − 5 = 11 → 1 1` ·
`5 × 3 × 3 = 45 → 9` · `5 + 3 = 8` · `5+7+3+5+7+4+4+5 = 40 → 4`.

Contrôle croisé (§0.3) : `apply`, `additions`, `sortie` et `steps` relisent le
même plan (mémoïsé par ligne et par cible) ; `sum` refuse un total ou un
partiel faux, `reduce` un éclatement qui ne reconstitue pas le nombre,
`scenario.js` recoupe une troisième fois. Les quatre voies témoins compilent
sans avertissement (`scenarioDe` + `compile`).

## 5. Ce qui a dû bouger autour

- **Registre** : `mab` en fin du bloc des mappeurs (après `mlet`), vecteur
  témoin `['mab', N([64, 5, 6, 64]), [6, 6, 6]]`, primitive attendue
  `partition`. Le catalogue compte 161 opérateurs.
- **Barème** (`elegance.js`, pas `score.js`) : `m.absorption` paie au palier du
  **redécoupage** (`ABSORBENT_PAR_ADDITION`), dilué par ses additions et
  dégressif avec la longueur — c'est le même geste, poussé jusqu'au bout — et
  rejoint `A_MERITER_SA_PLACE`. Sans cela, sa ligne rétrécie comptait en
  `valeursJetees` : la peine du gaspillage pour un geste qui ne jette rien.
- **`cout: 2`** — le malus de simplicité, dans la seule grandeur que le barème
  lit (`coutRendu`). L'opérateur rend au moins deux étapes par construction, de
  vingt à quarante sur les cas de l'auteur.
- **Faisceau** (`assemblage.js › vecteursDeSix`) : **un siège réservé à la voie
  sans perte**. Mesuré avant ce siège : `fl+tca+ma1+mab` sur « Donald Trump »
  valait 7 218 points rejouée par son lien contre 4 077 à la tête de liste, et
  la liste ne la proposait pas — `A_MERITER_SA_PLACE` la rangeait derrière
  toute voie honnête à compte voisin, et le plafond de huit vecteurs par
  fragment la coupait avant l'assemblage. Le siège est le dernier de la
  première moitié (celle que `assembler` garde), va au moins de ficelles puis
  au plus court, et reste vide quand aucune voie n'a netteté et dilution
  nulles : repli exact.
- **Coût** : +25 % sur `resoudre` (« Sarah Kerrigan » 3,7 s → 4,8 s,
  « Donald Trump » 1,9 s → 2,3 s, filet débranché), après mémoïsation des
  plans et des racines, sommes de préfixe, et calcul des paliers sans
  allocation.

## 6. Mesures

`node .planning/banc/absorption-banc.mjs`, filet débranché. « Sans perte » =
R 1000, brut 1000, 0 jetée au tri, 0 reliquat hors cible. « Avant » = la
meilleure voie de la liste sans `mab` (relevé du même banc, opérateur absent).

| saisie → cible | avant (meilleure) | sans perte, défaut | rang à `{exhaustivite: 200}` | rang à `{exhaustivite: 200, quantite: 0}` |
|---|---|---|---|---|
| Sarah Kerrigan → 31031998 | `fl+tca+masc+mrd`, R 615, 5 jetées, 23 étapes | **#1** `fl+tca+masb+mab`, 1 série, 27 étapes (3 voies sans perte) | #1 | #1 |
| Henri Prunelle Chochotte → 01111984 | `fl+tca+mch+mrd`, R 571, 6 jetées, 33 étapes | **#1** `fl+tca+ma1+mab`, 1 série, 35 étapes | #1 | #1 |
| Millicent Billette → 1998 | `fc+tca+masb+mrd`, R 800, 3 jetées, 24 étapes | **#1** `fl+tca+masc+mab`, **3 séries**, 40 étapes | #1 | #1 |
| Donald Trump → 666 | `fatb+tca+mt9+mr9,fr3+tca+mhe+mrn` (moisson), R 818, 2 jetées, 31 étapes | **#1** `fl+tca+masc+mab`, **3 séries**, 28 étapes | #1 (`2:fr15;…+mab`, 4 séries) | #1 |
| Le chat dort sur le tapis rouge → 666 | `2:ffr5;fl+tca+m14+meg`, 8 séries, R 827, 5 jetées, 40 étapes | **#1** `fl+tca+mlm+mab`, 1 série, 34 étapes | #10 | #1 |
| hope → 666 | `tca+m14`, R 750, 1 jetée, 5 étapes | **#1** `ffr2+tca+ma1+mab`, 1 série, 23 étapes | #3 | #1 |
| Capitalisme → 666 | `fr21+tca+mx6+mrd`, R 642, 5 jetées, 34 étapes | **#1** `tca+masc+mab`, **3 séries**, 30 étapes | #1 (`fr10+tca+mx6+mab`, 4 séries) | #1 |
| Éléonore à Nîmes → 111 | `nm,nm,nm` (partition), brut 875, 5 étapes | **#1** `fl+tca+ma1+mab`, **3 séries**, 27 étapes | #8 | #1 |

Ce que le relevé dit :

- **Huit cas sur huit** proposent au moins une voie sans perte — c'était zéro.
  Cinq saisies en proposent plusieurs (jusqu'à trois, sur des lectures
  différentes : ASCII, A1Z26, `mx6`, `mlm`…).
- **Le malus de simplicité se lit** : 23 à 40 étapes contre 5 à 34 pour la
  meilleure voie d'avant. Et le bonus d'exhaustivité domine au barème actuel :
  la voie sans perte est **première par défaut sur les huit cas** (score 6 787
  à 7 086), parce que `score.js` lit R = 1 000, brut = 1 000, U = 1 000, et
  que le crédit d'élégance reste au-dessus du socle (1 719 sur « Donald
  Trump » : triptyques, couronnement, surnuméraires ; −9 seulement pour vingt
  chiffres absorbés, tant le palier du redécoupage est dilué et dégressif).
- **`{ exhaustivite: 200 }` seul ne suffit pas à la faire remonter là où une
  voie à beaucoup de séries existe** : sur « Le chat » elle passe de #1 à #10,
  sur « Éléonore » de #1 à #8, sur « hope » de #1 à #3 — le curseur quantité
  reste à son cran, et huit séries qui jettent cinq valeurs pèsent plus qu'une
  série qui ne jette rien. Avec `{ exhaustivite: 200, quantite: 0 }`, elle est
  #1 partout. C'est le barème personnalisé (`score.js`), hors de ce chantier :
  à noter, pas à corriger ici.
- **Le siège réservé était indispensable** : sans lui, « Donald Trump », « Le
  chat », « hope » et « Éléonore » n'avaient aucune voie `mab` à couverture
  totale dans la liste, alors que `fl+tca+ma1+mab` rejouée par son lien valait
  7 218 points.
- **Temps** : +25 % sur `resoudre` (3,7 s → 4,8 s sur « Sarah Kerrigan »).

## 7. Ce qui est rouge, et pourquoi c'est un arbitrage

Les suites demandées sont vertes (catalogue, readme, langues, url, scénario,
intégration visuelle, visuel). Dans `src/recherche/tests/elegance.test.js`,
**deux tests de référence de l'auteur échouent, sur le seul cas « Donald
Trump »** :

- « étalonnage — les quatre cas de référence gardent leur tête de liste » :
  la tête attendue est la MOISSON à 3 séries
  (`fatb+tca+mt9+mr9,fr3+tca+mhe+mrn`, R 818, 2 jetées) ; elle est désormais
  précédée par `fl+tca+masc+mab` (3 séries, R 1 000, rien de jeté) et par sa
  retouche `2:fr15;fl+tca+masc+mab` (4 séries).
- « ficelles — aucune ne figure en tête » : même cause — 4 séries en tête au
  lieu de 3. (`mab` n'est pas une ficelle au sens de `FICELLES`, le test ne le
  reproche pas pour lui-même.)

Les trois autres références tiennent (`hope-hope-hope.fr`, `https://…`,
`Macron` — dont la voie nommée `fr13+tca+m14+meg` reste en 2ᵉ ligne, derrière
`fr1+tca+masc+mab`).

Ce n'est pas une régression du moteur : c'est le barème actuel qui préfère une
voie qui écrit trois 666 sans rien perdre à une moisson qui en écrit trois en
jetant deux valeurs. L'auteur a deux leviers, et les deux sont hors du
périmètre « ne touche pas à `score.js` » :

1. **accepter** la nouvelle tête et actualiser les deux tests (comme il l'a
   déjà fait quand « une moisson à TROIS séries passe devant ») ;
2. **faire payer l'absorption à sa mesure** : un palier `ABSORPTION` propre
   (compté par geste montré, non dilué), ou l'inscrire dans `FICELLES` avec son
   propre compteur — elle céderait alors la 2ᵉ ligne à compte égal
   (`index.js › selectionner`), mais gagnerait encore à compte supérieur, ce
   qui est la règle de l'auteur lui-même. `cout` (aujourd'hui 2) ne suffit
   pas : la concision pèse 150, il faudrait un facteur d'élégance sous 0,59.


> **Note d'intégration (8 septembre)** : `PAQUET_ABSORPTION_MAX` est passé de 12 à 6 — le coût de la programmation dynamique doublait le temps de recherche à douze ; à six, il en prend un tiers de moins et les dix cas du banc commun (`sans-perte-banc.mjs`) gardent leur voie sans perte. Le poste `ABSORPTION` du barème (80 par chiffre absorbé, famille `absorption`, pesée à l'inverse de la suppression par le curseur d'exhaustivité) et la précédence des séries limitée à une quantité RELEVÉE en mode personnalisé ont été ajoutés après livraison.
