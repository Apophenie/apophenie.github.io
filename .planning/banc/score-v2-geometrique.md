# Score v2 — piste « moyenne géométrique pondérée »

> Quatre axes additifs et lisibles ; un global qui est la moyenne GÉOMÉTRIQUE
> pondérée des quatre — `global = Π axeᵢ^(pᵢ)`, Σpᵢ = 1, les pᵢ étant les parts
> des curseurs. Toujours une moyenne pondérée, donc le pictogramme de poids reste
> vrai ; mais un axe effondré tire tout vers le bas, comme la chaîne de facteurs
> du moteur actuel. Hypothèse à vérifier : cette forme reproduit-elle le
> classement actuel mieux que la moyenne arithmétique, à axes égaux ?

Module : `src/recherche/score-v2-geometrique.js` · banc : `.planning/banc/score-v2-geometrique.mjs`.
Rien du moteur n'est modifié ; le module LIT une approche notée et la renote.

## 0. Réponse courte

- **Oui, la géométrique fait mieux que l'arithmétique sur les mêmes axes et les
  mêmes curseurs, sur les trois régimes**, et l'écart est le plus net là où il
  compte le plus — la 1ʳᵉ place (10 têtes sur 16 contre 8, concordance d'ordre
  87,5 % contre 84,4 %, 34 lignes déplacées contre 54). Sur la liste mixte,
  l'écart est faible (14 têtes contre 13, 92 % contre 90 %).
- **Le rang caché se remplace bien par une composante de l'axe quantité — à
  condition que le compte des séries domine cet axe (850 ‰) et soit LINÉAIRE.**
  Avec un compte en racine et une contiguïté forte (premier réglage), la 2ᵈ place
  n'était reproduite que 3 fois sur 8 ; avec le compte dominant, 7 fois sur 8.
- **Ce qui ne se reproduit pas, et ne se reproduira pas par les curseurs : six
  têtes d'élégance sur seize.** Le moteur actuel y met des PARTITIONS à trois
  méthodes différentes (un 6 par mot), ou une voie dont le crédit d'élégance est
  NÉGATIF mais écrasé à zéro par `note()`. La première famille perd sur la
  simplicité (H = 50) et la quantité (aucun 666 contigu) — deux axes que le
  mérite actuel `(G₁ + 1000) × U × R` ne regarde pas du tout ; la seconde gagne
  aujourd'hui par un artefact que la v2 ne reproduit pas volontairement.

## 1. Les quatre axes — formules

Tout est entier, en pour-mille, borné à [0 ; 1000]. Les quatre axes sont
additifs ; les seuls facteurs sont INTÉRIEURS à un axe (les rouages obscurs vont
dedans, jamais entre les axes et le total).

### Simplicité — « court et d'un seul tenant ? »

```
C = 0,88 ^ max(0, L − 2)                         (L = étapes rendues, la loi actuelle)
simplicité = (150·C + 125·H) / 275               (H = unité de méthode, lu tel quel)
           × 0,75 si un fragment a moins de deux caractères signifiants
           × 0,80 en mode LIBRE (fragments disjoints)
```

H n'est compté qu'ici — ni dans la cohérence, ni par les trois postes du barème
qui le redisent (filtre sélectif, réglage par morceau, lecture divergente).

### Exhaustivité — « toute la saisie lue, et tout ce qui est produit sert-il ? »

Deux parts perdues, chacune tarifée à l'échelle que l'auteur a fixée dans le
barème, puis UNE courbe concave :

```
pE = (26·lettres arrachées + 20·caractères de blocs écartés + 10·de blocs courts
      + 5·ponctuation ignorée) / (26 · caractères signifiants)
pS = (300·valeurs écartées en route + 90·reste hors cible à la fin
      + 50·6 produits non montrés) / (300 · (valeurs montrées + valeurs écartées))
gardée = (1 − pE) · (1 − pS)                     — lu ET employé
exhaustivité = 1000 − √(1 − gardée)              — racine entière, en pour-mille
```

« Valeurs écartées en route » = `valeursJetees` + les écartements des ficelles
(`majorite`, `decimation`, `effacementSansMotif`, `majoriteTacite`), qui
REMPLACENT ce poste dans le barème et se paient donc ici, une seule fois.

La racine fait ce que l'auteur demande — « on perd beaucoup rapidement, mais
entre beaucoup et encore plus ça change moins » : perdre 1 % coûte 100 ‰, 10 %
coûte 316 ‰, 50 % coûte 707 ‰. Exemple : `fl+tca+m14` sur `hope-hope-hope.fr`
ignore trois signes de ponctuation (pE = 4,1 %) et laisse `5, 7` au bord
(pS = 4,3 %) → gardée 91,8 % → exhaustivité **714**.

### Quantité — « combien de 666, et sont-ils gagnés ? »

```
compte     = séries / 9                                  (linéaire — voir §5.2)
contiguïté = (260·666 contigus + 90·666 répétés du même vecteur) / (260·séries)
abondance  = min(6 − 3, 15) / 15                          (les 6 au-delà des trois premiers)
résonance  = 1 si les trois fragments sont le même texte
quantité   = (850·compte + 100·contiguïté + 30·abondance + 20·résonance) / 1000
           × 0,50 si CONVERGENCE (les mêmes caractères relus trois fois)
           × 0,40 si décret (un 6 obtenu, trois annoncés)
```

C'est ici que le RANG entre : « séries sur caractères disjoints d'abord » est
le compte qui domine ; « convergences en dernier » est le facteur ½.

### Cohérence — « propre, familier, sans bidouille ? »

```
manière  = 1000 − Σ malus du barème (hors postes lus ailleurs), plancher 0
finesse  = Σ bonus du barème au-dessus du socle, rapportés à 300, plafond 1000
cohérence = (200·N + 120·A + 100·E + 300·manière + 80·finesse) / 800
          × 0,45 par joker
```

N, A, E sont lus tels quels (familiarité, absence de bidouille, lisibilité des
nombres). `manière` et `finesse` lisent `detailDuCredit(bilan)` poste par poste,
en SAUTANT ce qui est compté ailleurs (liste exacte : `REGLAGES.POSTES_LUS_AILLEURS`).

## 2. Le devenir de chaque ingrédient du moteur actuel

| ingrédient actuel | où il va | comment |
|---|---|---|
| H homogénéité | simplicité | tel quel, 125/275 — **une seule fois** |
| N notoriété | cohérence | tel quel, 200/800 |
| U couverture (^1,5) | **nulle part** | remplacé par pE (les postes d'effacement, doublon n° 1) |
| C concision | simplicité | recalculé sur L, 150/275 |
| A anti-ad-hoc | cohérence | tel quel, 120/800 |
| E élégance des nombres | cohérence | tel quel, 100/800 |
| R rendement (√R) | **nulle part** | remplacé par pS (les reliquats, doublon n° 2) |
| G crédit d'élégance — famille quantité (contigu 260, répété 90, surnuméraire 22) | quantité | contiguïté (260/90 en proportion des séries) et abondance (surplus/15) |
| G — famille exhaustivité (portée ignorée 1600, lettre 26, bloc 20, bloc court 10, ponctuation 5, valeur jetée 300) | exhaustivité | pE et pS ; `PORTEE_IGNOREE` (proportionnel) et les quatre barreaux (par caractère) sont une seule mesure : la part perdue, tarifée par caractère |
| G — trois reliquats (90, 50, 600 proportionnel) | exhaustivité | pS ; le proportionnel et le quantitatif sont une seule mesure |
| G — transformations en trop (14) | **nulle part** | doublon de C (n° 3) |
| G — filtre sélectif, réglage par morceau, lecture divergente | **nulle part** | doublons de H (n° 4) |
| G — majorité, décimation, effacement sans motif, majorité tacite | exhaustivité | des valeurs écartées, au tarif de la valeur jetée |
| G — le reste de la famille élégance (casse 430, retouche 420, traduction divergente 600, égalisation 200, arrondi, min/max, lettre→lettre, retour, redécoupage, addition sélective, écriture en lettres, réarrangement, 6 détruit) | cohérence › manière | somme des malus, plancher 0 |
| G — couronnement tôt 150, solde multiple de 3 (90), additions 55/22, remise 10 | cohérence › finesse | somme des bonus / 300 |
| bonus résonance (+800) | quantité | 20 ‰ de l'axe |
| bonus couverture totale (+500) | **nulle part** | c'est « pE = 0 » (doublon n° 6) |
| bonus sans pirouette (+400) | **nulle part** | c'est « A = 1000 et aucun joker » (doublon n° 5) |
| malus joker ×0,45 | cohérence | facteur intérieur |
| malus fragment creux ×0,75 | simplicité | facteur intérieur |
| malus mode LIBRE ×0,80 | simplicité | facteur intérieur |
| malus décret ×0,40 | quantité | facteur intérieur (doublon n° 7 tranché : le décret est une fraude à la quantité) |
| rang SERIES / SIMPLE | quantité | le compte, linéaire et dominant |
| rang CONVERGENCE | quantité | ×0,50 |
| séries avant score, L, codes | départages | hors du global — `classer` du banc départage à global égal par l'ordre actuel |
| régime élégance : mérite (G₁ + 1000)·U·R | curseurs `REGIMES.elegance` | 7/53/13/27 % |
| régime triptyques : séries puis G₂ | curseurs `REGIMES.abondance` | 0/30/60/10 % |
| PART_CRITERES, réserve des bonus, facteur plancher 520 | **nulle part** | des artefacts de l'empilement additif + multiplicatif ; sans objet dans une moyenne |
| MMR, quota par mappeur | **nulle part** | une sélection, pas une note (la proposition de l'auteur, §2.3-3) |

## 3. Le global — géométrique, en entiers

Les parts sont les curseurs réduits par leur pgcd, `cᵢ / S`. Alors

```
global = ⌊ (Π axeᵢ^cᵢ)^(1/S) ⌋   =   1000 · Π (axeᵢ/1000)^(cᵢ/S)
```

Le produit est un `BigInt` (au pire 1000^780, ~7 800 bits) ; la racine S-ième
est trouvée par dichotomie sur [0 ; 1000] — dix itérations, chacune une
puissance entière. Aucun logarithme, aucun flottant, aucun arrondi caché :
c'est l'entier exact ⌊·⌋. Vérifié contre la géométrique flottante : 658 pour
658,72, 668 pour 668,52, 661 pour 661,95. Quatre curseurs à zéro retombent sur
l'égalité ; des curseurs proportionnels donnent le même global ; un axe à zéro
rend zéro (le veto multiplicatif du moteur, conservé — l'arithmétique donnerait
750).

`globalArithmetique` calcule `⌊Σ cᵢ·axeᵢ / S⌋` sur les mêmes parts : c'est la
comparaison, et rien d'autre.

## 4. La mesure

Corpus : les seize saisies demandées, résolues par `creerMoteur(catalogue,
{ filetTemporel: false })` avec le catalogue de tests ; 237 voies hors joker.
L'exécution en direct et l'exécution depuis le cache donnent les mêmes
entiers.

Mesures, par régime et pour les DEUX moyennes :

- **têtes** — 1ʳᵉ place : la voie `suggestion === 'elegance'` est-elle la mieux
  notée de toute la liste ? 2ᵈ place : la voie `'triptyques'` (elle n'existe que
  sur 8 saisies) ; liste mixte : la première ligne hors podium est-elle la mieux
  notée des lignes hors podium ? Entre parenthèses, les cas où la nouvelle tête
  est un EX ÆQUO du moteur actuel (même score, même compte — départagée par
  l'orthographe des codes) ;
- **⇄score** — paires concordantes entre le global et `a.score` (paires à score
  égal exclues, égalité de global comptée ½) ;
- **⇄ordre** — paires concordantes entre le global et l'ORDRE DE LA QUESTION
  (`ordreTotal`, `ordreElegance`, `ordreTriptyques`), qui contient le rang et
  les départages ;
- **déplacées** — lignes des douze premières (dans l'ordre de la question) qui
  bougent d'au moins trois places.

### 4.1 Les jeux ronds retenus (`REGIMES`)

| régime | curseurs (S/X/Q/C) | parts | moyenne | têtes | ⇄score | ⇄ordre | déplacées ≥ 3 |
|---|---|---|---|---|---|---|---|
| **mixte** | 25/75/200/25 | 8/23/62/8 % | **géométrique** | **14/16 (+1)** | 70,6 % | **92,0 %** | **9/169** |
| | | | arithmétique | 13/16 (+1) | 70,6 % | 90,0 % | 13/169 |
| **élégance** (1ʳᵉ) | 25/200/50/100 | 7/53/13/27 % | **géométrique** | **10/16** | **72,4 %** | **87,5 %** | **34/176** |
| | | | arithmétique | 8/16 (+1) | 69,3 % | 84,4 % | 54/176 |
| **abondance** (2ᵈ) | 0/75/150/25 | 0/30/60/10 % | **géométrique** | **7/8** | 70,2 % | **91,1 %** | **18/176** |
| | | | arithmétique | 6/8 | 71,0 % | 89,5 % | 23/176 |

### 4.2 Le meilleur du balayage (5 841 jeux au pas de 25)

| régime | moyenne | meilleur jeu (têtes d'abord) | têtes | ⇄ordre | déplacées | meilleure ⇄ordre |
|---|---|---|---|---|---|---|
| mixte | géo | 0/25/175/0 | 15+1/16 | 89,3 % | 7 | 25/75/200/25 → 14+1, **92,0 %** |
| mixte | arith | 0/50/175/25 | 15+1/16 | 89,8 % | 13 | 25/50/200/25 → 13+1, 91,1 % |
| élégance | géo | 0/175/50/75 | 10/16 | 87,8 % | 36 | 0/150/25/25 → 7+1, 88,2 % |
| élégance | arith | 25/200/50/150 | 10/16 | 81,4 % | 57 | 0/200/50/25 → 7+1, 87,8 % |
| abondance | géo | 0/0/200/0 (Q seule) | **8/8** | 83,9 % | 21 | 0/150/200/75 → 4, 92,5 % |
| abondance | arith | 0/0/200/0 (Q seule) | **8/8** | 83,9 % | 21 | 0/25/125/25 → 6, 92,2 % |

Lecture : la quantité SEULE reproduit les huit secondes places — c'est la
preuve que le compte, tel qu'il est construit, EST le rang. Mais elle ne
reproduit l'ordre du régime qu'à 84 % ; ajouter 30 % d'exhaustivité et 10 % de
cohérence en perd une (`Éléonore à Nîmes`, contre un ex æquo de fait — même
compte, 3721 contre 3824) et gagne sept points d'ordre. Le jeu rond est ce
compromis.

Sur la 1ʳᵉ place, les jeux qui gardent le plus de têtes et ceux qui reproduisent
le mieux l'ordre ne sont pas les mêmes : le mérite actuel est `(G₁+1000)·U·R`,
et sa tête est souvent un cas limite (voir §6).

### 4.3 Les têtes qui changent (jeux ronds)

**Mixte, géométrique — une seule** :

- `https://hope-hope-hope.fr/` : avant `fr14+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,fr9+tca+m7`
  (7×666, MOISSON, score 1274) S=429 X=362 Q=747 C=597 → **595** ; après
  `fl+tca+mpy+meg` (6×666, GROUPEMENT, score 3763) S=934 X=764 Q=635 C=414 →
  **660**. La moisson à sept séries écarte les deux tiers de ce qu'elle calcule
  (`mpf` quatre fois) et lit 36 % ; le groupement à six lit 76 % en trois
  étapes. Le rang actuel la met devant parce que 7 > 6 ; aucune moyenne ne le
  fera avec ces axes-là, sauf à mettre la quantité à 88 % (jeu 0/25/175/0, qui
  la garde — et perd trois points d'ordre ailleurs).

**Mixte, arithmétique — deux** : la même, plus `Donald Trump` : la moisson
`fr15+tca+mx6+mrn,fr3+tca+mhe+mrn` (3×666, G 1112) → 478 cède à
`fl+tca+mazc+meg` (3×666, G 0, égalisation de la ligne) → 491. C'est l'écart
géométrique/arithmétique en une ligne : la voie à manière nulle (C=363) paie
0,363^0,08 en géométrique, et seulement 8 % de 637 points en arithmétique.

**Élégance, géométrique — six**, toutes de la même nature : la tête actuelle est
une PARTITION ou une voie LIBRE à trois méthodes (H = 50, donc S ≈ 300–480, un
6 par mot donc Q = 94) et la v2 lui préfère un groupement ou une moisson qui
lit autant et aligne plus :

| saisie | avant (tête actuelle) | S/X/Q/C → global | après | S/X/Q/C → global |
|---|---|---|---|---|
| `https://hope-hope-hope.fr/` | `tca+mch+cs+prn,nc,fr13+nlc+pc9` PARTITION 1× (3280, G 1037) | 347/886/94/743 → 588 | `fl+tca+mpy+meg` GROUPEMENT 6× (3763, G 0) | 934/764/635/414 → 641 |
| `La numérologie est une science exacte, disent-ils` | `nl+prn,nl,nd` LIBRE 1× (2412, G 348) | 483/479/94/859 → 450 | `fl+tca+masc+mrn` GROUPEMENT 4× (2331, G 0) | 934/513/397/805 → 581 |
| `Henri Prunelle` | `tca+mt9+cs+prn,fr20+tca+mazc+mr9` MOISSON 2× (3273, G 892) | 463/664/244/707 → 576 | `2:fatb;fl+tca+mpy+meg` GROUPEMENT 4× (3712, G 0) | 934/808/446/410 → 628 |
| `numherololgeek.1000i100.fr` | `nv,tca+cnjd+pc9,fr13+nlc+pc9` PARTITION 1× (3891, G 926) | 387/874/94/669 → 572 | `nv,flt+tca+mpy+mr9,flt+tca+mpy+mr9` MOISSON 3× (4417, G 1527) | 453/781/361/664 → 650 |
| `jean-michel` | `fv+tca+ma1+cs,tca+mtc+cs,nd` PARTITION 1× (2739, G 700) | 290/553/94/907 → 477 | `0:fr20;fl+tca+mazc+meg` GROUPEMENT 3× (3615, G 0) | 934/779/351/391 → 589 |
| `Éléonore à Nîmes` | `nl,tca+m7+cs,fc+nlc` PARTITION 1× (2690, G 755) | 323/588/94/823 → 483 | `2:ffr4;fl+tca+m14+meg` GROUPEMENT 6× (3824, G 0) | 934/856/641/401 → 676 |

**Élégance, arithmétique — sept**, et pas les mêmes : elle garde
`https://hope-hope-hope.fr/` et `numherololgeek` mais perd `hope`, `macron` et
`Wikipedia` au profit de CONVERGENCES (`fc+tca+ma1+cs+prn,nlc,tca+mexb+cs`,
X = 1000, Q = 47) — la convergence ne paie son ×½ que sur 13 % du total en
arithmétique (Q 47 contre 196 ne coûte que 19 points), quand la géométrique
lui fait payer 0,24^0,13 ≈ −17 %. C'est exactement la propriété recherchée :
un axe effondré tire le tout, et il tire plus fort en géométrique.

**Abondance, géométrique — une** : `Éléonore à Nîmes`, `2:fen5;fl+tca+m14+meg`
(6×, 3721, G 44) → 656 cède à `2:ffr4;fl+tca+m14+meg` (6×, 3824, G 0) → 667 —
même compte, même famille, trois points de cohérence d'écart. Arithmétique —
deux : la même, plus `hope` où `tca+m14` (1×666, 7301) → 436 passe devant
`ffr3+tca+m14+meg` (2×666, 4235) → 423 : à 60 % de quantité, l'arithmétique
laisse un 666 unique doubler deux 666 ; la géométrique non (Q 196 contre 263,
soit 0,745^0,6 = −16 %).

## 5. Ce que la mesure a imposé — deux réglages, et pourquoi

### 5.1 Le compte domine la quantité (850 ‰), contre 600 au premier réglage

Premier réglage : 600/250/100/50 (compte, contiguïté, abondance, résonance),
compte en racine. Résultat : 2ᵈ place reproduite **3 fois sur 8** en géométrique
comme en arithmétique, mixte 11/16. Une moisson à sept séries, assemblée de 6
pris sur des portées différentes, y perdait contre un groupement à six qui
écrit ses 666 d'un seul vecteur : la contiguïté (+250 max) renversait le compte
(√(7/9) − √(6/9) = 66 ‰ × 0,6 = 40). Or la précédence actuelle est « le plus de
séries », et rien d'autre. À 850/100/30/20 : 7/8, et la liste mixte y gagne
aussi (15+1/16 au meilleur jeu contre 13+1).

### 5.2 Le compte est linéaire, pas en racine

La courbe concave est la règle de l'auteur pour les PERTES. Un compte de séries
n'est pas une perte ; en racine il resserre 6 et 7 séries (816 contre 882) au
point que le reste de l'axe les renverse. Linéaire (666 contre 777), c'est
l'échelle de `facteurQuantite` — un pas par série. Les deux formes restent
mesurables (`--reglages '{"COMPTE_EN_RACINE":true}'`).

### 5.3 Ce qui n'a rien changé

Alourdir la manière dans la cohérence (500 au lieu de 300, finesse 150) ne
rapproche pas la 1ʳᵉ place (10/16 dans les deux cas) et dégrade l'ordre du
mixte. Le problème de la 1ʳᵉ place n'est pas un poids : voir §6.

## 6. Ce que je n'ai pas compté, et pourquoi

- **L'artefact de `note()`.** Sur 7 saisies sur 16, la tête d'élégance actuelle
  a un crédit G = 0 : négatif (égalisation de quinze valeurs, −3000 ; retouche,
  −420), écrasé à zéro par `note()`, puis +1000 de socle — elle vaut alors
  exactement ce que vaut une voie SANS AUCUN reproche, et gagne par U·R. La v2
  ne reproduit pas cela : sa cohérence lit la manière avec son plancher à zéro,
  et une voie à manière nulle garde N, A, E — elle ne vaut pas une voie propre.
  C'est mesuré et assumé : `Millicent Billette`, `Le chat dort…`,
  `https://www.example.com/…`, `Sarah Kerrigan` gardent leur tête (ex æquo de
  fait), mais c'est parce que toute la famille `…+meg` est dans le même cas.
- **Les partitions à trois méthodes.** Six têtes d'élégance sur seize sont des
  voies où H = 50 et où aucun 666 n'est contigu. Le mérite actuel ne regarde ni
  H ni la contiguïté ; les quatre axes de l'auteur les nomment. Je n'ai pas
  ajouté un « bonus de partition » qui les remettrait en tête : ce serait un
  rouage entre les axes et le total, ce que la règle interdit, et un poids de
  plus pour reproduire un mérite que la proposition de l'auteur (§1.3) veut
  précisément dissoudre dans les curseurs.
- **Les 6 surnuméraires sont comptés deux fois, en connaissance de cause** : un
  6 au-delà des trois montrés est un 6 produit (abondance, +) ET un reste non
  montré (reliquat de cible, −). Ce sont deux faits sur le même 6, chacun
  tarifé par l'auteur (+22, −50), et le net reste ce qu'il est aujourd'hui
  (−28). Les retirer d'un côté contredirait « plus tu produis de 6, mieux
  c'est », de l'autre « toutes les pertes vont dans l'exhaustivité ».
- **Les décrets et les jokers** : aucun dans le corpus (le décret est jeté par
  `assembler`, le joker a son mode). Les facteurs sont écrits, jamais exercés.
- **La séparation caractères disjoints / recouvrement.** Le rang actuel dit
  « séries sur caractères disjoints » ; la v2 lit `series`, qui vient de
  `deduireMode` et l'implique déjà. La convergence est le seul recouvrement
  nommé, et elle a son facteur.
- **La sélection** (MMR, quota par mappeur, « la 2ᵈ place seulement si elle
  apporte plus ») : elle choisit QUI figure, elle ne note pas. Le banc compare
  des notes sur des listes déjà choisies.
- **Le socle et le plafond de finesse (300)** : un réglage à étalonner si la v2
  est adoptée ; ici il ne bouge aucune tête (mesuré avec 150 et 500 dans la
  cohérence).

## 7. Rejouer

```
node .planning/banc/score-v2-geometrique.mjs                   # 16 résolutions, ~1 min
node .planning/banc/score-v2-geometrique.mjs --ecrire-cache /tmp/v2.json
node .planning/banc/score-v2-geometrique.mjs --cache /tmp/v2.json --balayage      # ~4 min
node .planning/banc/score-v2-geometrique.mjs --cache /tmp/v2.json --detail
node .planning/banc/score-v2-geometrique.mjs --cache /tmp/v2.json \
     --reglages '{"COMPTE_EN_RACINE":true,"POIDS_QUANTITE":{"compte":600,"contiguite":250,"abondance":100,"resonance":50}}'
node .planning/banc/score-v2-geometrique.mjs --cache /tmp/v2.json --essai mixte 0,25,175,0
```
