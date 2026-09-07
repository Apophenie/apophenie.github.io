# Score v2 à quatre axes — rapport de mesure

Module : `src/recherche/score-v2-agent.js` (pur, indépendant du moteur).
Banc : `node .planning/banc/score-v2-agent.mjs [--cache f.json] [--pas 10] [--curseurs regime:s,e,q,c] [--plafond regime:axe:v] [--module variante.js]`.
Corpus : les seize saisies demandées, 237 voies (aucun JOKER, aucun DÉCRET dans ce corpus ; six CONVERGENCE, quinze RÉSONANCE, vingt LIBRE, dix SIX_OFFERT, cinq PARTITION, vingt et une MOISSON, cent soixante GROUPEMENT).
Mesuré le 2026-09-07, filet temporel débranché, balayage des curseurs au pas 10 sur 0..200 (le curseur le plus haut fixé à 200 : seuls les rapports comptent — 34 481 positions par régime).

## 1. Les quatre axes, en clair

Le global est `Σ curseur × axe / Σ curseur`, arrondi — et rien d'autre. Pas de rang, pas de cran, pas de crédit recalculé. Les curseurs vont de 0 à 200, 100 neutre ; tous à zéro ⇒ moyenne simple.

### Simplicité — « court et d'un seul tenant »

    simplicité = brièveté(L + retouches) × H / 1000
    brièveté(L) = 1000 × K / (K + max(0, L − 2)),  K = 6

Hyperbolique : 2 étapes → 1000, 3 → 857, 4 → 750, 6 → 600, 9 → 462, 14 → 333. La marche 2→3 coûte 143, la marche 5→6 en coûte 66 : c'est la décroissance que l'auteur demande, et la courbe ne tombe jamais à zéro. Une retouche (portée réécrite avant lecture) compte pour une étape. H (l'unité de méthode, telle que `critereHomogeneite` la mesure) est lu **une seule fois**, ici.

### Exhaustivité — « a-t-on tout lu, et tout ce qu'on a produit sert-il ? »

Une seule fraction de matière utile, du premier caractère au dernier jeton, puis la courbe concave :

    lue   = 1 − (alnum×1000 + bloc×600 + blocCourt×300 + ponctuation×120) / (signifiants×1000)
    route = montrées / (montrées + jetées en route)
    fin   = 1 − (resteHorsCible×1000 + resteDeCible×500) / (montrées×1000)
    utile = lue × route × fin
    exhaustivité = 1000 − √(1000 × (1000 − utile))

Une lettre arrachée au milieu d'un mot vaut plein tarif ; un bloc entier écarté, 60 % par caractère ; un bloc court (< 3 lettres, l'exception que l'auteur accorde à la pureté), 30 % ; la ponctuation ignorée, 12 % — légère, pas gratuite. « Jetées en route » = `valeursJetees + majorite + majoriteTacite + decimation + effacementSansMotif`. « Reste » = les deux reliquats du verdict ; un 6 produit mais non montré pèse moitié.

La racine fait exactement ce que l'auteur décrit : 1 % de perte coûte 100 ‰, 10 % en coûte 316, 50 % en coûte 707. **C'est l'inverse de U actuel (u^1,5, convexe)** — voir §4, c'est la source de plusieurs têtes déplacées.

### Quantité — « combien de 666, et sont-ils gagnés ? »

    combien = 1000 × √(séries / 9)          (1 → 333, 2 → 471, 3 → 577, 4 → 666, 6 → 816, 9 → 1000)
    gagnés  = 3/3 d'ordinaire, 1/3 si décrétée, 1/3 si CONVERGENCE (les mêmes lettres relues trois fois), 0 si joker
    quantité = combien × gagnés

Concave : la deuxième série vaut plus que la neuvième. La convergence n'a plus de rang « dernier » ; elle paie ici (111 au lieu de 333) et dans la simplicité (trois méthodes différentes ⇒ H = 133).

### Cohérence — « propre, familier, sans bidouille »

    cohérence = (200×N + 120×A + 100×E + 250×M) / 670

N (notoriété, moitié moyenne moitié minimum), A (produit des 1 − adHoc), E (lisibilité des nombres intermédiaires) sont lus tels quels dans `criteres`. M est le **crédit de manière**, le seul rouage interne : il part de 800, monte vers 1000 par les bonus, descend vers 0 par les malus, borné.

| ligne | tarif | ce que c'est |
|---|---|---|
| 666 écrit tel quel dans le vecteur | +80, puis +120 × couronnementTot/1000 | un triptyque contigu, et d'autant plus qu'il vient tôt ou clôt le dernier mot |
| résonance | +200 | trois fois le même texte, la même méthode, le même 6 |
| triptyque cassé | −430 | un 666 déjà écrit, puis défait |
| retouche | −420 | la question réécrite avant d'être lue |
| traduction divergente | −300 | le même mot traduit de deux façons |
| 6 détruit | −48 par 6 | un 6 obtenu, converti en autre chose |
| moyenne arrondie | −96 × amplitude | la chaîne de l'auteur, dans son ordre |
| min / max | −72 par emploi | |
| lettre → lettre | −40 par emploi | |

## 2. Ce que chaque ingrédient du moteur actuel devient

| ingrédient actuel | devient |
|---|---|
| H | simplicité (seul juge de l'unité) |
| C = 0,88^(L−2) | remplacé par la brièveté hyperbolique, sur L + retouches |
| U = (lus/total)^1,5 | la fraction `lue` (pesée) de l'exhaustivité |
| R = gardés/produits (racine dans le score, tel quel dans le mérite) | les fractions `route` et `fin` de l'exhaustivité |
| `brut` | rien (c'est U sans la puissance) |
| N, A, E | cohérence, tels quels |
| PORTEE_IGNOREE, EFFACE_ALNUM/BLOC/BLOC_COURT/PONCTUATION | la fraction `lue` (une seule mesure, pesée par nature de perte) |
| VALEUR_JETEE, MAJORITE, MAJORITE_TACITE, DECIMATION, EFFACEMENT_SANS_MOTIF | la fraction `route` (ce que ces gestes jettent, pas le fait de les employer) |
| RELIQUAT_HORS_CIBLE, RELIQUAT_DE_CIBLE, RELIQUAT_PROPORTIONNEL | la fraction `fin` |
| TRANSFORMATION « en trop », SOCLE_TRANSFORMATIONS | rien : L suffit |
| LECTURE_DIVERGENTE, REGLAGE_PAR_MORCEAU, FILTRE_SELECTIF, RETOUR_SUR_UNE_ETAPE | rien : H voit déjà que les parts ne font pas la même chose |
| TRIPTYQUE_CONTIGU, COURONNEMENT_TOT | une ligne de manière (bonus « 666 écrit tel quel ») |
| TRIPTYQUE_REPETE, SIX_SURNUMERAIRE | rien : c'est la quantité (les séries) — et le surplus est déjà un reste |
| SOLDE_MULTIPLE_DE_TROIS | rien : c'est l'absence de `resteDeCible`, déjà comptée |
| ADDITION_CHIFFRES, ADDITION_NOMBRES, REMISE_ADDITION_EN_CHAINE | rien : la familiarité d'une addition, c'est sa notoriété (N) |
| CASSE_TRIPTYQUE, SIX_DETRUIT, ARRONDI, MIN_MAX, LETTRE_VERS_LETTRE, RETOUCHE, TRADUCTION_DIVERGENTE | manière, mêmes tarifs |
| EGALISATION, REDECOUPAGE, ADDITION_SELECTIVE, REARRANGEMENT, ECRITURE_EN_LETTRES | **rien** — voir §5 |
| bonus résonance (+800) | +200 dans la manière |
| bonus couverture totale (+500) | rien (un seuil sur U) |
| bonus sans pirouette (+400) | rien (redit A) |
| malus joker ×0,45, décret ×0,40 | quantité : 0 tiers, 1 tiers |
| malus fragment creux ×0,75, mode LIBRE ×0,80 | rien — voir §5 |
| rang de conviction (SÉRIES / SIMPLE / CONVERGENCE) | disparu : quantité (séries, convergence à 1/3) |
| `pur` | rien : c'est un résumé des malus, pas une mesure |

Les sept doublons sont résolus : U et les effacements → une fraction ; R et les reliquats → une fraction ; C et les transformations → L ; H → un axe ; sans-pirouette → A ; couverture totale → rien ; décret → un tiers de série.

## 3. Les régimes retenus et les mesures

Référence de chaque régime : l'ordre du comparateur du moteur (`ordreElegance`, `ordreTriptyques`) ou, pour le mixte, l'ordre affiché hors podium. « Paires vs a.score » est la mesure demandée ; « paires vs référence » est celle qui dit si l'ORDRE est reproduit (le mixte actuel n'est pas trié par score : rang → séries → score).

| régime | curseurs (S, E, Q, C) | têtes | paires vs référence | paires vs a.score | déplacées ≥ 3 (12 premières) |
|---|---|---|---|---|---|
| **mixte** (rond, retenu) | 20, 40, 200, 60 | 11 / 16 | 93,7 % | 73,8 % | 9 |
| mixte, meilleur têtes du balayage | 0, 0, 200, 50 | 14 / 16 | 90,2 % | 68,3 % | 16 |
| mixte, meilleure concordance | 20, 20, 200, 40 | 9 / 16 | 94,2 % | 73,2 % | 9 |
| **élégance** (rond, retenu, quantité ≤ 60) | 20, 100, 60, 200 | 8 / 16 | 77,0 % | 78,6 % | 69 |
| élégance, meilleur du balayage libre | 10, 110, 100, 200 | 8 / 16 | 82,9 % | 78,2 % | 49 |
| élégance, jeu « dans l'esprit » naïf | 40, 200, 60, 40 | 4 / 16 | 82,3 % | 76,8 % | 64 |
| **abondance** (rond = meilleur) | 0, 50, 200, 10 | 7 / 8 | 88,8 % | 67,7 % | 22 |

Pour l'abondance, la 2ᵈ place n'existe que sur 8 saisies ; sur les 8 autres, la tête v2 porte le compte maximal 8 fois sur 8.

Le taux de paires vs `a.score` plafonne vers 74–79 % dans tous les régimes : c'est normal, `a.score` n'est pas l'ordre affiché (l'auteur l'a déjà mesuré : neuf têtes sur seize changeraient si l'on triait par le score), et le v2 ne cherche pas à le reproduire.

## 4. Les têtes qui changent, et pourquoi

### Mixte — 5 sur 16 (jeu rond)

| saisie | avant (ordre actuel) | après (v2) | nature |
|---|---|---|---|
| Millicent Billette | `0:fr1;fl+tca+mqwc+meg` 703 (S750 E648 Q745 C583) | `0:fr25;fl+tca+mqwc+meg` 708 (E692) | **quasi-égalité** : même score 3580, départagé aujourd'hui par les codes ; v2 préfère celle dont le 16ᵉ 6 est un surplus plutôt qu'un 5 |
| https://hope-hope-hope.fr/ | MOISSON 7 séries, 14 étapes, score 1274 — 716 (S229 E369 Q881 C558) | GROUPEMENT `fl+tca+mpy+meg` 6 séries, 3 étapes, score 3763 — 800 (S857 E725 Q816 C775) | **arbitrage réel** : le rang « séries d'abord » fait passer 7 > 6 quelle que soit la longueur ; v2 dit qu'une série de plus ne paie pas onze étapes et 63 % de matière jetée en route |
| La numérologie est une science exacte… | MOISSON 9 séries, 15 étapes, score 1864 — 791 | GROUPEMENT retouché `10:fr18;fc+tca+mt9+meg` 8 séries, 3 étapes — 791 | **même global** (départagé par L) : le même arbitrage qu'au-dessus, à égalité parfaite |
| Donald Trump | MOISSON `fr15+tca+mx6+mrn,fr3+tca+mhe+mrn` 3 séries, 6 étapes, score 3921 — 556 (S180) | GROUPEMENT `fl+tca+mazc+meg` 3 séries, 3 étapes, score 3447 — 633 (S857) | **arbitrage réel** : à compte égal, une méthode ou deux ? H = 300 coûte 680 points de simplicité |
| numherololgeek.1000i100.fr | retouché `0:fr10;fl+tca+mpy+meg` score 3112 — 677 | non retouché `fl+tca+mqwc+meg` score 3061 — 709 | **quasi-égalité** (51 points de score) : la retouche coûte une étape et 420 de manière, ce que le crédit actuel, plancher à zéro pour les deux, ne voyait plus |

Bilan : deux vrais arbitrages (« une série de plus vaut-elle dix étapes de plus ? » et « à compte égal, une méthode ou deux ? »), un cas d'égalité stricte, deux quasi-égalités.

### Élégance — 8 sur 16 (jeu rond)

| saisie | avant | après | nature |
|---|---|---|---|
| Millicent Billette | `0:fatb;…mazc+meg` 634 | `0:fr25;…mqwc+meg` 646 | quasi-égalité (même score) |
| https://hope-hope-hope.fr/ | PARTITION `tca+mch+cs+prn,nc,fr13+nlc+pc9` 642 (S72 E911 Q333 C658) | `fl+tca+mpy+meg` 773 (S857 E725 Q816 C775) | **trois méthodes différentes** en sept étapes contre une seule en trois : H = 133 |
| Capitalisme | `fr21+tca+mx6+mrd` score 5264, crédit 1047 — 566 (E434) | `fr6+tca+mpy+meg` score 3236, crédit 0 — 665 (E700) | **`meg`** (§5) : `mrd` jette 5 valeurs sur 14, `meg` n'en jette que 2 sur 11 |
| Donald Trump | MOISSON `fatb+tca+mt9+mr9,fr3+tca+mhe+mrn` 587 (S180) | `fl+tca+mazc+meg` 695 (S857 C751) | **`meg`** + deux méthodes contre une |
| Henri Prunelle | MOISSON 2 séries 531 (S180 E417) | `fl+tca+mazc+meg` 4 séries 753 (S857 E784) | **`meg`** : la voie v2 lit tout, garde tout, en une méthode |
| numherololgeek.1000i100.fr | PARTITION `nv,tca+cnjd+pc9,fr13+nlc+pc9` 619 (S79 E900) | `fl+tca+mqwc+meg` 661 (S857 E382 Q745) | **trois méthodes** contre une ; la voie v2 jette pourtant 62 % de sa ligne |
| Wikipedia | `fr21+tca+mx6+mad` score 6036 — 606 (E575) | `fr17+tca+mpy+meg` score 3580 — 743 (E1000) | **`meg`** : la voie v2 ne jette rien du tout (9 valeurs, 9 six) |
| Éléonore à Nîmes | PARTITION `nl,tca+m7+cs,fc+nlc` 624 (S88 E600 C777) | retouché `2:ffr4;fl+tca+m14+meg` 6 séries 719 (S750 E886) | **trois méthodes** contre une, et `meg` |

Les huit tiennent en deux questions, pas huit : **(i)** une partition à trois méthodes différentes est-elle « élégante » ? Le mérite actuel (crédit × U × R) ne regarde ni H ni L, et couronne quatre partitions ; v2, où la simplicité lit H, les renvoie derrière un groupement d'une seule méthode dès que le curseur de simplicité dépasse zéro. **(ii)** que vaut `meg` ? Voir §5.

Autre chose que la mesure met à nu : **la 1ʳᵉ place actuelle est déjà une place de quantité.** Le balayage libre la reproduit au mieux avec quantité à 100–200, et neuf des seize têtes actuelles ont trois séries ou plus, cinq emploient `meg`, quatre sont retouchées. La raison est dans R : un vecteur plein de 6 a un rendement de 1000, un vecteur de quatre valeurs dont trois 6 en a 750 — « rendement » et « nombre de 666 » se confondent dans le mérite (c'est le doublon n° 2 vu de l'autre côté). L'exhaustivité v2 a le même penchant, par construction (« tout ce qu'on a produit sert-il ? »), et c'est assumé : c'est bien une question d'exhaustivité.

### Abondance — 1 sur 8 (jeu rond)

| saisie | avant | après | nature |
|---|---|---|---|
| Éléonore à Nîmes | `2:fen5;fl+tca+m14+meg` 6 séries, score 3721 — 806 (E806) | `2:ffr4;fl+tca+m14+meg` 6 séries, score 3824 — 821 (E886) | **quasi-égalité** : même compte, même méthode ; le 2ᵈ classement actuel préfère la première pour 44 points de crédit repondéré, v2 la seconde parce qu'elle laisse moins de reste |

## 5. Ce que j'ai choisi de NE PAS compter, et pourquoi

- **Les compteurs de réécriture** (`egalisees`, `redecoupage`, `additionSelective`, `rearrangement`, `ecritureEnLettres`) et le fait d'employer `majorite`/`decimation` : ils décrivent la NATURE d'un outil, que le catalogue publie déjà par `adHoc` et `notoriete`, lus par A et N. Les facturer une seconde fois est le doublon que l'auteur a lui-même refusé en sortant `meg` des ficelles (« le prix de son manque de notoriété remplace le soupçon, il ne s'y ajoute pas ») — et que le barème actuel commet quand même à 200 par valeur, ce qui met à zéro toute voie qui l'emploie… sans l'empêcher de prendre la 1ʳᵉ place sur cinq saisies, faute de concurrent à crédit non nul. Ce que ces outils JETTENT est compté par l'exhaustivité ; ce qu'ils RÉÉCRIVENT est payé par A (`meg` : A = 700) et N (0,20). **C'est le principal arbitrage à rendre** : si l'auteur veut que niveler une ligne coûte plus que sa notoriété, il faut une ligne de manière « part de la ligne réécrite » — je l'ai mesurée (tarif 400 au prorata) : mêmes 8/16 têtes en élégance, 12/16 en mixte, mais d'autres têtes (Capitalisme, Wikipedia, Henri Prunelle reviennent ; hope-hope-hope.fr et jean-michel partent). Le choix est de doctrine, pas de mesure.
- **Le mode LIBRE** (×0,80 aujourd'hui) : des fragments disjoints, c'est des blocs abandonnés entre eux — déjà comptés dans `lue`.
- **Le fragment creux** (×0,75) : un fragment d'un caractère lit peu de la saisie — déjà dans `lue`.
- **`filtresSelectifs`, `reglagesEnTrop`, `lecturesDivergentes`, `retours`** : quatre façons de dire que les parts ne font pas la même chose, ce que H mesure déjà (mêmeMéthodeEtFiltres 1000 / mêmeMéthode 900 / …).
- **Les additions comme bonus** : une addition est familière, et la familiarité s'appelle N.
- **`pur`** : un résumé des malus ; le compter serait compter chacun deux fois.
- **`brut`, `U`, `C`, `R`** de `criteres` : remplacés par une mesure chacun, pour tenir la courbe (concave) et les poids (bloc / lettre / ponctuation) que l'auteur demande.
- **Le rang CONVERGENCE « toujours dernier »** : c'est un classement caché. La convergence paie deux fois à découvert — 1/3 en quantité, H = 133 en simplicité — et, mesuré, elle ne prend aucune tête en mixte ni en abondance ; en élégance, elle ne remonte que si l'on met la simplicité à zéro (alors `hope`, `macron`, `Wikipedia` la couronnent : trois méthodes, tout lu, rien jeté).
- **L'égalité stricte de global** est départagée par L puis par les codes (comparaison de chaînes, pas `localeCompare`) — c'est le seul « ordre » hors des axes, et il ne joue qu'à global identique (un cas sur le corpus : La numérologie…, 791 = 791).

## 6. Variantes mesurées

| variante | mixte | élégance | abondance |
|---|---|---|---|
| retenue | 11/16 rond, 14/16 max | 8/16 | 7/8 |
| avec ligne « réécriture » (400 × part de la ligne) | 12/16 max (0, 20, 200, 50) | 8/16 max (0, 40, 200, 170) | 7/8 (0, 40, 200, 10) |
| quantité linéaire (s/9) au lieu de la racine | têtes abondance 7/8 aussi ; pas d'écart notable | | |
| « gagnés » appliqué avant la courbe (√(tiers/27)) | convergence à 192 au lieu de 111 : remonte sur `hope` dès que S = 0 | | |

## 7. Ce que ça vaut, honnêtement

- **La liste ordinaire se reproduit bien** : 93,7 % de paires dans l'ordre affiché, 9 lignes déplacées d'au moins trois places parmi les douze premières des seize listes, et les cinq têtes qui bougent se ramènent à deux questions posées clairement (une série de plus contre dix étapes de plus ; une méthode contre deux à compte égal) plus trois quasi-égalités. Le spaghetti « rang → séries → score → facteur d'élégance » devient quatre nombres et quatre curseurs — au prix d'un curseur de quantité à 200 pour dire ce que le rang disait.
- **La 2ᵈ place se reproduit** (7/8, la 8ᵉ est une quasi-égalité), et v2 la fournit sur les seize saisies, pas sur huit.
- **La 1ʳᵉ place ne se reproduit qu'à moitié**, et je crois que c'est elle qui a tort : elle ne regarde ni la brièveté ni l'unité de méthode, couronne quatre partitions à trois méthodes et cinq voies à `meg`, et se reproduit au mieux avec la quantité au-dessus de la cohérence. Les huit têtes qui changent ne demandent que deux arbitrages : « une partition à trois méthodes est-elle élégante ? » et « `meg` vaut-il sa notoriété, ou sa notoriété plus une peine par valeur ? ». Une fois ces deux-là tranchés, il restera une quasi-égalité.
- Ce que je n'ai pas pu vérifier : décrets et jokers (absents du corpus — leurs tiers sont une prédiction), et la stabilité des curseurs hors de ces seize saisies.
