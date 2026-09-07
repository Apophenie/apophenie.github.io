# Score v2 — piste « produit dans l'axe, moyenne entre les axes »

Module : `src/recherche/score-v2-produit.js` · banc : `.planning/banc/score-v2-produit.mjs` · moteur : intact.

Quatre axes entiers (0–1000), chacun un **produit** de ses ingrédients ; un global qui est la **moyenne pondérée** des quatre par les curseurs (0–200, part = curseur / somme), et rien d'autre. Aucun rang, aucun bonus, aucun classement intermédiaire. Les trois régimes ne diffèrent que par la position des curseurs.

## 1. Les quatre axes

Notation : `C`, `H`, `N`, `E`, `R` sont les critères du moteur (`a.criteres`, en ‰, ramenés à [0, 1]) ; `abandons`, `montrees`, `jeteesAuTri`, `triptyques…` viennent de `a.bilan` ; le crédit lit `detailDuCredit(a.bilan)`.

### Simplicité — « court et d'un seul tenant ? »

```
simplicité = C^0,5 × H^0 × (0,80 si LIBRE) × (1 − 0)^(parts − 1)
```

- **Brièveté** `C = 0,88^(étapes − 2)`, en racine. La 1ʳᵉ place actuelle ne lit pas la concision du tout ; la racine adoucit la pente pour que les régimes qui lui donnent du poids ne perdent pas de têtes.
- **Unité de méthode** `H` : exposant **0, mesuré** — H est compté une seule fois, par ses trois postes (lecture divergente, réglage par morceau, filtre sélectif) dans la cohérence. Compter H ici *à la place* coûte une tête d'élégance (12/16 au lieu de 13/16) : la 1ʳᵉ place actuelle aime les partitions à trois méthodes, que `H = 133` écrase.
- **Fragments disjoints** (mode LIBRE) : ×0,80 — le `MALUS.modeLibre` du moteur, tel quel.
- **Parts** : un malus par part a été balayé (0 → 0,2) ; zéro conserve le plus de têtes. Conséquence honnête : « d'un seul tenant » ne pèse plus que par le mode LIBRE.

### Exhaustivité — « toute la saisie lue, et tout ce qui est produit sert-il ? »

```
perte_lecture = (alnum·1000 + bloc·650 + blocCourt·500 + ponctuation·385) / (signifiants·1000)
perte_calcul  = 1 − R                     (R absent : (valeursJetees + jeteesAuTri) / (montrees + valeursJetees))
exhaustivité  = max(0,3 ; 1 − 0,85·√perte_lecture) × max(0,3 ; 1 − 0,5·√perte_calcul)
```

- **Toutes les pertes, ici et nulle part ailleurs** : caractères jetés (quatre compteurs d'`abandons`, ponctuation comprise), valeurs calculées puis jetées et restes de fin (R, qui lit le vecteur le plus large pour ce qui écarte et plafonne le gardé à ce que le verdict montre). U, `PORTEE_IGNOREE`, les quatre `EFFACE_*`, `VALEUR_JETEE` et les trois `RELIQUAT_*` disaient tous cela : une seule mesure chacun.
- **Courbe concave** : `1 − α·√p`. La première lettre perdue coûte cher, la vingtième peu. C'est aussi ce qui remplace le bonus « couverture totale » (+500) : à perte nulle le facteur vaut 1, et la moindre perte fait tomber.
- **Un bloc entier coûte moins par caractère qu'une lettre arrachée** : 650 contre 1000, et un bloc court 500. Le balayage a remonté la ponctuation de 190 (l'échelle 5/26 de l'auteur) à 385 : jeter un tiret pèse plus qu'on ne le tarifait, et cela conserve une tête d'élégance.
- **Pourquoi R et pas le bilan** : sur 75 lignes sur 237 les deux divergent — `mpf` range ses écartés sous `MAJORITE` et non sous « valeurs jetées », si bien que le bilan lui donnerait un rendement parfait pour avoir jeté davantage. R est la mesure que le moteur a déjà tranchée sur ce point.

### Quantité — « combien de 666, et sont-ils gagnés ? »

```
quantité = (1 − (1 − 0,45) / séries^0,75) × (0,15 si CONVERGENCE) × (0,40 si décret) × (0,45 si joker) × (1 − 0·part_assemblée)
```

| séries | 1 | 2 | 3 | 4 | 6 | 9 |
|---|---|---|---|---|---|---|
| quantité | 450 | 673 | 759 | 806 | 857 | 894 |

- **Le rang actuel est devenu cette pente** : la marche 1 → 2 (+223) est la plus haute, les suivantes se resserrent. Rien ne prime plus catégoriquement : une septième série vaut 15 points de plus qu'une sixième, pas la tête de liste.
- **Convergence** (les mêmes caractères servent trois fois : pas gagnés sur des caractères disjoints) : ×0,15, le troisième cran du rang replié dans l'axe. Balayé 0,15 → 1 : c'est ce qu'il faut pour que la CONVERGENCE reste en fond de liste sans qu'un rang l'y tienne.
- **Décret** ×0,40 et **joker** ×0,45 : les malus du moteur, repris tels quels. Le corpus n'en contient aucun (hors mode JOKER, ignoré) ; ils sont inertes ici et documentés pour cela.
- **Séries assemblées** (part des séries qui ne sont pas des triptyques contigus) : balayé 0 → 0,5, sans effet sur les têtes, laissé à zéro. Les postes `TRIPTYQUE_CONTIGU / REPETE` du crédit ne sont pas repris : leur information (le compte) est la pente, et leur bonus par 666 est ce que l'auteur reprochait à la 1ʳᵉ place.

### Cohérence — « propre, familier, sans bidouille ? »

```
crédit_de_manière = 1000 + Σ postes du crédit hors {famille quantité, famille exhaustivité, TRANSFORMATION + remise, RELIQUAT_*}
cohérence = N^0,5 × A^0 × E^1 × borner(1 + (crédit − 1000) / 1200 ; 0,52 ; 1,15) × (1 si non résonant) × (0,80 si fragment creux)
```

- **Familiarité** `N` (moitié moyenne, moitié maillon faible) en racine : le maillon faible n'est pas un veto.
- **Lisibilité** `E` telle quelle.
- **Le crédit de manière** garde : couronnement tôt, solde multiple de 3, additions, triptyque cassé, 6 détruit, égalisation, majorité tacite, arrondi, min/max, lettre → lettre, retour sur une étape, traduction divergente, retouche, les ficelles (effacement sans motif, écriture en lettres, majorité, redécoupage, décimation, addition sélective), réarrangement, **et les trois postes d'unité de méthode** (H, compté ici et une fois). Plancher 0,52 = `FACTEUR_PLANCHER` du moteur ; plafond 1,15 : la 1ʳᵉ place actuelle lit le crédit *au-dessus* du socle, et c'est cela qu'on reproduit — une manière remarquable rachète un peu de familiarité.
- **A (absence de bidouille) n'est pas compté — un huitième doublon**, que la liste des sept ne nomme pas : chaque opérateur à `adHoc > 0` du catalogue (`meg`, `mrd`, `mad`, `mlet`, les césars…) est aussi un palier du crédit, qui dit la même chose geste par geste. Mesuré : compter A en plus coûte deux têtes d'élégance. L'exposant reste disponible (`COMPTER_A`, `EXP_SANS_BIDOUILLE`).
- **Résonance** : balayée 0,8 → 1 comme malus de non-résonance, sans effet sur aucune tête ; laissée neutre. Le bonus +800 du moteur n'a pas d'équivalent.
- **Fragment creux** (< 2 caractères signifiants) : ×0,80 (0,75 au moteur).

### Global

```
global = Σ curseur_axe × axe / Σ curseur_axe        (entier, 0–1000)
```

## 2. Devenir de chaque ingrédient du moteur

| ingrédient actuel | devenir | où |
|---|---|---|
| H homogénéité (250 ‰) | par ses trois postes du crédit ; le critère n'est plus lu | cohérence |
| N notoriété (200 ‰) | `N^0,5` | cohérence |
| U couverture (180 ‰) | remplacé par les compteurs d'`abandons` pondérés, en racine | exhaustivité |
| C concision (150 ‰) | `C^0,5` | simplicité |
| A anti-ad-hoc (120 ‰) | **non compté** : doublon des paliers de ficelle | — |
| E élégance des nombres (100 ‰) | `E` | cohérence |
| bonus résonance (+800) | rien (mesuré sans effet) | — |
| bonus couverture totale (+500) | rien : la courbe concave y pourvoit (perte nulle ⇒ facteur 1) | exhaustivité |
| bonus sans pirouette (+400) | rien : doublon de A, lui-même doublon des paliers | — |
| malus joker ×0,45 | ×0,45 (inerte sur le corpus) | quantité |
| malus fragment creux ×0,75 | ×0,80 | cohérence |
| malus mode libre ×0,80 | ×0,80 | simplicité |
| √rendement R | `1 − 0,5·√(1 − R)` | exhaustivité |
| facteur d'élégance (crédit ∈ [520, 1000]) | crédit **de manière** seul, en facteur [0,52 ; 1,15] | cohérence |
| malus décret ×0,40 | ×0,40 (inerte sur le corpus) | quantité |
| rang de conviction (séries ≥ 2 / simple / convergence) | pente sur les séries + ×0,15 en convergence | quantité |
| séries avant le score (rang SERIES) | la pente, plus rien de catégoriel | quantité |
| crédit famille `quantite` (triptyque contigu 260, répété 90, surnuméraires 22) | rien : le compte est la pente ; les surnuméraires sont des 6 jetés, comptés dans R | quantité / exhaustivité |
| crédit famille `exhaustivite` (portée ignorée 1600, quatre effacements, valeur jetée 300) | remplacés par la perte de lecture et R | exhaustivité |
| TRANSFORMATION 14, remise 10 | rien : doublon de C | — |
| RELIQUAT_HORS_CIBLE 90, DE_CIBLE 50, PROPORTIONNEL 600 | rien : doublon de R | — |
| régimes de crédit 1 % / 33 % (`POIDS_DES_REGIMES`) | remplacés par les curseurs | régimes |
| `meriteDElegance` = (crédit + 1000) × U × R | régime élégance : E 200, C 100, S 50, Q 50 | régimes |
| ordre des triptyques (séries, puis crédit 33 %, puis score) | régime abondance : Q 200, E 50 | régimes |
| MMR / diversité, quotas par mappeur | hors sujet (sélection, pas notation) | — |

Les sept doublons nommés sont chacun réduits à une mesure : U ↔ effacements (exhaustivité, par `abandons`) ; R ↔ reliquats (R seul) ; C ↔ transformations (C seul) ; H deux axes / trois postes (les postes, une fois) ; sans pirouette ↔ A (ni l'un ni l'autre : les paliers) ; couverture totale ↔ U (la courbe) ; décret ↔ quantité (dans la quantité).

## 3. Mesures

Corpus : les seize saisies demandées, `filetTemporel: false`, une résolution chacune (215 ms à 7,5 s), 237 lignes hors JOKER. Références rejouées sur la collecte avec les comparateurs du moteur (`ordreElegance`, `ordreTriptyques`, `ordreTotal`) : elles reproduisent 16/16 fois la `suggestion` posée par `index.js`.

Réglage : trois descentes de coordonnées sur les 24 constantes (les curseurs de chaque régime re-balayés à chaque pas, grille de 50), puis un balayage fin (grille de 25, 6 560 jeux par régime). Objectif : têtes conservées d'abord, concordance avec l'ordre du moteur ensuite, lignes déplacées enfin. Un ex æquo du global compte comme une paire perdue (l'ordre du moteur n'en a aucun).

| étape | têtes mixte / élégance / abondance | déplacées ≥ 3 places (12 premières) |
|---|---|---|
| constantes « naïves » (échelle de l'auteur, exposants 1, curseurs 100 partout) | 11 / 7 / 5 | 54 / 176 |
| mêmes constantes, curseurs balayés | 13 / 9 / 9 | — |
| descente 1 | 14 / 9 / 11 | 19 / 176 |
| descente 2 (autre départ : A non compté, H par postes) | 13 / 13 / 11 | 27 / 176 |
| descente 3 (grille fine, depuis la 2) — **retenue** | 13 / 13 / 11 | 18 / 176 |

### Par régime (constantes retenues)

| régime | curseurs (S/E/Q/C) | têtes conservées | ex æquo en tête | têtes changées | paires concordantes avec `a.score` | paires concordantes avec l'ordre du moteur |
|---|---|---|---|---|---|---|
| mixte | 0/100/200/50 | 13/16 | 0 | 3 | 68,4 % (16 ex æquo) | 87,8 % (16 ex æquo) |
| elegance | 50/200/50/100 | 13/16 | 0 | 3 | 73,2 % (23 ex æquo) | 82,1 % (23 ex æquo) |
| abondance | 0/50/200/0 | 11/16 | 2 | 3 | 60,8 % (157 ex æquo) | 84,8 % (157 ex æquo) |

Lecture : « avec `a.score` » compare mon global au score actuel sur toutes les paires de lignes ; « avec l'ordre du moteur » le compare au comparateur du régime (`ordreTotal` sur les lignes hors podium, `ordreElegance`, `ordreTriptyques`). La seconde est la vraie cible : le score actuel n'est lui-même que le troisième cran de l'ordre.

Les 157 ex æquo de l'abondance sont voulus : à cohérence 0 et simplicité 0, deux voies au même compte de séries et à la même exhaustivité valent le même global — le moteur, lui, les départage au crédit d'élégance repondéré à 33 %, dont le v2 ne garde qu'une part par la cohérence, ici à zéro.

### Balayage des curseurs — le meilleur et les jeux ronds

Régime **mixte** (13/16 au mieux) :

| curseurs S/E/Q/C | têtes | concordance ordre moteur | concordance `a.score` |
|---|---|---|---|
| 0/50/175/25 | 13/16 | 88,9 % | 67,9 % |
| **0/100/200/50** (retenu, ≡ 0/50/100/25) | 13/16 | 87,8 % | 68,4 % |
| 25/200/200/50 | 13/16 | 85,4 % | 70,4 % |
| 100/100/100/100 (le neutre) | 7/16 | 74,5 % | 72,3 % |

Régime **élégance** (13/16 au mieux) :

| curseurs S/E/Q/C | têtes | concordance ordre moteur | concordance `a.score` |
|---|---|---|---|
| **50/200/50/100** (retenu, ≡ 25/100/25/50) | 13/16 | 82,1 % | 73,2 % |
| 75/200/50/100 | 13/16 | 80,9 % | 74,4 % |
| 50/150/25/75 | 13/16 | 79,8 % | 73,3 % |
| 0/200/0/50 (exhaustivité seule, cohérence au quart) | 9/16 | 83,6 % | 70,0 % |
| 50/200/0/100 (le retenu, quantité à zéro) | 9/16 | 76,9 % | 71,5 % |

Régime **abondance** (11/16 au mieux) :

| curseurs S/E/Q/C | têtes | concordance ordre moteur | concordance `a.score` |
|---|---|---|---|
| 0/25/125/0 | 11/16 | 85,1 % | 60,7 % |
| **0/50/200/0** (retenu, ≡ 0/25/100/0) | 11/16 | 84,8 % | 60,8 % |
| 0/25/200/25 | 10/16 | 92,8 % | 68,2 % |

Le jeu retenu est à chaque fois le jeu rond équivalent au meilleur (mêmes rapports entre curseurs, donc même global à l'arrondi près) ou à moins d'un point de concordance de lui.

### Lignes déplacées d'au moins trois places dans les douze premières : 18 / 176

Liste v2 reconstituée comme l'écran la ferait — 1ʳᵉ = meilleure au régime élégance, 2ᵈ = meilleure au régime abondance si elle apporte plus de séries, le reste au régime mixte — comparée au `rang` affiché aujourd'hui.

- `https://hope-hope-hope.fr/` · `fr5+tca+mt9+mr9,tca+mtc,tca+mtc` : 6 → 12
- Le chat dort sur le tapis rouge · `fr3+tca+mhe+mrn` : 11 → 18 ; `fc+nlc,fc+nlc,fc+nlc` : 12 → 16
- La numérologie est une science exacte, disent-ils · `fl+tca+masc+mrn` : 9 → 5
- Henri Prunelle · `tca+mt9+cs+prn,fr20+tca+mazc+mr9` : 1 → 5 ; `fl+tca+m14` : 7 → 1 ; `fl+tca+m14+mtri` : 9 → 6
- numherololgeek.1000i100.fr · `nv,flt+tca+mpy+mr9,flt+tca+mpy+mr9` : 9 → 3
- Wikipedia · `fr21+tca+mx6+mad` : 1 → 5
- `https://www.example.com/path/to/page` · `tca+mtal+m14` : 11 → 14 ; `tca+mtal+mx6+mrn` : 12 → 15
- Éléonore à Nîmes · `nl,tca+m7+cs,fc+nlc` : 1 → 10 ; `fr23+tca+masc+mrd` : 9 → 4 ; `ffr3+tca+mx6+mrn,fr14+tca+mx6+mrn` : 10 → 5
- Sarah Kerrigan · `fr24+tca+mpy+meg` : 7 → 10 ; `fr19+tca+msfr+meg` : 8 → 11 ; `fl+tca+masb+mrd` : 10 → 7 ; `fl+tca+mx6+mad` : 11 → 6

## 4. Têtes qui changent — et pourquoi

Onze cas sur quarante-huit, dont deux ex æquo et trois sur une 2ᵈ place que l'écran n'affiche pas aujourd'hui (même compte de séries que la 1ʳᵉ). Restent **six têtes visibles qui changent**, chacune pour une raison lisible dans les axes.

**Mixte (3)**

- `https://hope-hope-hope.fr/` — attendu `fr14+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,ffr3+tca+m14+mpf,fr9+tca+m7` (MOISSON, 7×666, score 1274) : S 462 · E 522 · Q 872 · C 278 → **687** ; obtenu `fl+tca+mpy+meg` (GROUPEMENT, 6×666, score 3763) : S 938 · E 669 · Q 857 · C 349 → **731**. Aujourd'hui sept séries passent devant six *quel que soit le reste* ; sans rang caché, la septième série vaut 15 points de quantité, et la moisson à cinq césars perd sur tout le reste. C'est le prix explicite de la règle « aucun classement caché ».
- numherololgeek.1000i100.fr — attendu `0:fr10;fl+tca+mpy+meg` (5×666, retouché, score 3112) : S 938 · E 428 · Q 836 · C 349 → **650** ; obtenu `nv,flt+tca+mpy+mr9,flt+tca+mpy+mr9` (MOISSON, 3×666, score 4417, rang 9 aujourd'hui) : S 726 · E 769 · Q 759 · C 625 → **743**. Même cause : cinq séries contre trois, mais une exhaustivité et une cohérence bien meilleures ; le score actuel lui donne d'ailleurs 4417 contre 3112 — c'est le rang seul qui la reléguait au 9ᵉ.
- Sarah Kerrigan — attendu `2:fr16;fc+tca+mt9+meg` (3×666, score 3287) : E 506 · C 344 → **627** ; obtenu `2:fr2;fl+tca+masb+mrd` (3×666, score 2675) : E 561 · C 383 → **649**. Deux groupements retouchés au même compte ; le v2 préfère celui qui jette moins (R) et dont la manière coûte moins. Inversion serrée.

**Élégance (3)**

- Henri Prunelle — attendu `tca+mt9+cs+prn,fr20+tca+mazc+mr9` (MOISSON, 2×666, crédit 892) : S 774 · E 607 · Q 673 · C 651 → **647** ; obtenu `fl+tca+m14` (GROUPEMENT, 2×666, rang 7 aujourd'hui) : S 1000 · E 540 · Q 673 · C 824 → **685**. La 1ʳᵉ place actuelle ne lit ni la simplicité ni la familiarité ; le v2 en donne 12,5 % et 25 % à ce régime, et une voie de deux étapes sans césar passe devant une moisson à deux méthodes.
- Wikipedia — attendu `fr21+tca+mx6+mad` (crédit 1213, R 818) : S 938 · E 787 · Q 759 · C 484 → **727** ; obtenu `fr17+tca+mpy+meg` (crédit 0, R 1000) : S 938 · E 1000 · Q 759 · C 288 → **784**. **C'est le cas d'école de la limite structurelle** : aujourd'hui le mérite est un *produit* (crédit + 1000) × U × R, et 2,2 × 0,818 > 1 × 1 ; en *moyenne* entre axes, l'écart de cohérence (196 points au poids 100) ne rattrape pas l'écart d'exhaustivité (213 points au poids 200). Un veto n'en est un que dans son axe.
- Éléonore à Nîmes — attendu `nl,tca+m7+cs,fc+nlc` (PARTITION, 1×666, crédit 755) : S 825 · E 622 · Q 450 · C 622 → **626** ; obtenu `2:ffr4;fl+tca+m14+meg` (6×666) : S 938 · E 824 · Q 857 · C 329 → **719**. Les 50 crans de quantité du régime (12,5 %) suffisent à faire passer six séries devant une, et l'exhaustivité fait le reste. Mettre la quantité à zéro dans ce régime (50/200/0/100) ne récupère pas cette tête et en perd quatre autres (`hope-hope-hope.fr`, `hope`, `macron`, `example.com`), où des CONVERGENCES ou des partitions exhaustives prennent la 1ʳᵉ place : sans rang caché, seul l'axe quantité tient la convergence en bas, et il faut donc qu'il pèse un peu, même quand on cherche l'élégance.

**Abondance (3 changées + 2 ex æquo)**

- Éléonore à Nîmes — attendu `2:fen5;fl+tca+m14+meg` (6×666, score 3721) : E 733 → **832** ; obtenu `2:ffr4;fl+tca+m14+meg` (6×666, score 3824, rang 3) : E 824 → **850**. Même méthode, deux retouches ; le moteur départage au crédit repondéré (44 contre 0), le v2 au rendement. Le score actuel préfère d'ailleurs la seconde.
- Millicent Billette et Capitalisme — 2ᵈ place **non affichée** aujourd'hui (même compte que la 1ʳᵉ) ; le v2 y préférerait la voie plus exhaustive à celle que `ordreTriptyques` préfère au crédit. Invisible à l'écran.
- Henri Prunelle (`fl+tca+mazc+meg` / `2:fatb;fl+tca+mpy+meg`) et Sarah Kerrigan (`0:fr15` / `0:fr12`) — **ex æquo** à 792 : même compte, même exhaustivité ; la cohérence, à zéro dans ce régime, ne départage pas. Le moteur les sépare par 26 milli-unités de crédit repondéré.

## 5. Ce que je n'ai pas compté, et pourquoi

- **A (absence de bidouille)** — doublon des paliers de ficelle du crédit (chaque `adHoc > 0` du catalogue est un palier) ; le compter coûte deux têtes. Il reste un interrupteur (`COMPTER_A`).
- **H par le critère** — compté par ses trois postes dans la cohérence ; le critère en plus est un doublon, et à la place il coûte une tête.
- **Le bonus de résonance** — balayé comme malus de non-résonance jusqu'à 0,8 : aucune tête ne bouge. Les voies résonantes restent 5ᵉ à 12ᵉ sur `hope-hope-hope.fr` par leur cohérence et leur exhaustivité, pas par un bonus.
- **Les trois bonus additifs** (résonance, couverture totale, sans pirouette) — n'ont pas de place dans un produit ; les deux derniers sont des doublons, le premier est sans effet.
- **`TRIPTYQUE_CONTIGU / REPETE`** — un bonus par 666 est ce que l'auteur reproche à la 1ʳᵉ place ; le compte est la pente. `BETA_ASSEMBLE` (séries assemblées contre contiguës) balayé sans effet.
- **`SIX_SURNUMERAIRE`** — un 6 en trop est un 6 jeté au tri ; R le voit déjà.
- **Le plafond `MAX_SERIES`** — la pente sature d'elle-même (894 à neuf).
- **Le facteur de quantité et le facteur de rendement des curseurs actuels** (`facteurQuantite`, `facteurRendement`) — ce sont des repondérations ; ici les curseurs pondèrent des axes, ils ne changent pas les mesures.
- **Les régimes de crédit 1 % / 33 %** — remplacés par les curseurs, comme l'exige la règle ; l'abondance en perd une finesse (les 157 ex æquo).
- **Le rang caché** — remplacé par la pente des séries et le malus de convergence ; c'est ce qui coûte deux têtes mixtes (hope URL, numherololgeek) où sept séries ne priment plus six, ni cinq trois.
- **Décret et joker** — repris (×0,40 et ×0,45 dans la quantité) mais inertes sur ce corpus ; non réglés faute d'observation.
- **Le MMR, les quotas par mappeur, la sélection du podium** — sélection, pas notation ; le banc reconstitue la liste v2 avec la règle actuelle (2ᵈ place seulement si elle apporte plus de séries).

## 6. Limites honnêtes

1. **Une moyenne ne fait pas un produit.** Le mérite d'élégance actuel est crédit × U × R ; le mixte est un rang puis un produit de facteurs. Dans une moyenne pondérée, un axe à zéro ne retire que sa part : le veto reste confiné à son axe, et c'est voulu, mais deux des six têtes visibles changées (Wikipedia, Éléonore) sont exactement ce que ce confinement coûte.
2. **Le régime élégance ne peut pas se passer de quantité** tant que la convergence n'est punie que là. À Q = 0 : 9/16 ; à Q = 50 : 13/16.
3. **Le corpus ne contient ni décret ni joker** : leurs facteurs sont des copies, pas des mesures.
4. **Les constantes sont ajustées sur seize saisies** ; trois descentes depuis deux départs convergent vers le même plateau (37 têtes sur 48), mais un corpus plus large peut le déplacer. Le script `--constantes` (avec `DEPART` et `GRILLE`) rejoue l'ajustement.

## 7. Rejouer

```
node .planning/banc/score-v2-produit.mjs                         # rapport, corpus résolu (~50 s)
node .planning/banc/score-v2-produit.mjs --cache /tmp/v2.json    # même chose, collecte réutilisable
node .planning/banc/score-v2-produit.mjs --cache /tmp/v2.json --balayage
node .planning/banc/score-v2-produit.mjs --cache /tmp/v2.json --detail
TOURS=2 node .planning/banc/score-v2-produit.mjs --cache /tmp/v2.json --constantes
```
