# Score v2 — quatre pistes, une aune

> « Fais une implémentation v2 parallèle, et compare les résultats. Tu peux
>   lancer un autre agent sur une implémentation séparée avec les 4 métriques
>   comme cap, et tu verras si son travail est pondérable de manière plus
>   harmonieuse ou pas. » — « Si tu as plusieurs pistes, tu peux lancer plusieurs
>   sous-agents dessus. » (l'auteur, nuit du 6 au 7 septembre 2026)

Rien n'est branché au moteur. Quatre modules lisent une approche notée par
`score.js › noter` et la renotent sur quatre axes de 0 à 1000 ; le global est la
moyenne pondérée des quatre par les curseurs, sans rang caché ; les trois
régimes sont trois positions des curseurs. Tous respectent la même interface
(`AXES`, `axesDe`, `globalDe`, `REGIMES`, `REGLAGES`) et sont passés au MÊME banc,
`score-v2-banc.mjs`, sur seize saisies et 237 voies. Chaque piste a en outre son
propre rapport et son propre banc, plus fins (`score-v2-<piste>.md` / `.mjs`).

| piste | module | qui | idée |
|---|---|---|---|
| **repli** | `score-v2.js` | moi | replier les ingrédients EXISTANTS dans quatre axes, fusionner les sept doublons, garder les courbes du moteur (U^1,5, √R, plancher 520) |
| **cap** | `score-v2-agent.js` | agent 1 | repartir de zéro avec les quatre métriques pour cap, sans imiter la construction actuelle |
| **produit** | `score-v2-produit.js` | agent 2 | dans chaque axe les ingrédients se MULTIPLIENT (le veto reste, confiné à son axe) ; fidélité d'abord, constantes ajustées par descente |
| **géométrique** | `score-v2-geometrique.js` | agent 3 | axes simples, mais le global est la moyenne GÉOMÉTRIQUE pondérée (en BigInt) ; comparée à l'arithmétique sur les mêmes axes |

## 1. Le tableau — banc commun, régimes réglés par chaque piste

« Têtes » = têtes de liste conservées. Mixte : la première ligne HORS podium,
comparée à l'ordre actuel. Accord : paires de voies classées dans le même sens
que `a.score` (hors podium). Déplacées : lignes des douze premières qui bougent
d'au moins trois places.

| piste | mixte : curseurs | têtes | accord | déplacées | élégance : curseurs | têtes | abondance | têtes |
|---|---|---|---|---|---|---|---|---|
| repli | 5/30/45/20 | 13/16 | **72,6 %** | 13/169 | 7/57/0/36 | 12/16 | Q seule | 7/8 |
| cap | 6/13/63/19 | 12/16 | **74,3 %** | **7/169** | 5/26/16/53 | 8/16 | 0/19/77/4 | 7/8 |
| géométrique | 8/23/62/8 | **14/16** | 70,9 % | 9/169 | 7/53/13/27 | 10/16 | 0/30/60/10 | 7/8 |
| produit | 0/29/57/14 | **14/16** | 69,5 % | 19/169 | 13/50/13/25 | **13/16** | 0/20/80/0 | 7/8 |

Meilleur balayé, pour situer le plafond de chaque construction : mixte —
repli 14/16 (5/32/47/16), cap 16/16 (Q seule), géométrique 15/16 (0/13/88/0),
produit 16/16 (Q seule) ; élégance — repli 12, cap 8, géométrique 10, produit 13 ;
abondance — toutes 8/8 avec la quantité seule.

## 2. Ce que les quatre disent ENSEMBLE, et qui ne dépend pas de la piste

1. **La liste ordinaire actuelle est un ordre de quantité.** Les quatre pistes
   ont besoin de 45 à 63 % de quantité pour la reproduire, et « quantité
   seule » conserve 16 têtes sur 16 dans deux d'entre elles. Ce n'est pas un
   artefact : `ordreTotal` classe par rang (séries disjointes d'abord), puis
   nombre de séries, puis score. Sans classement caché, ce rang doit vivre
   dans l'axe quantité, et l'axe doit peser lourd. Le jeu « à parts presque
   égales » 20/30/25/25 conserve 11 têtes dans la piste repli, contre 13 à
   5/30/45/20.
2. **La 2ᵈ place se réduit à la quantité** : 7/8 partout, 8/8 avec Q seule.
3. **La 1ʳᵉ place est le point dur, et la même famille de têtes résiste dans
   les quatre pistes** : `https://hope-hope-hope.fr/`, `Henri Prunelle`,
   `numherololgeek`, `Éléonore à Nîmes`, `jean-michel`, `La numérologie…` — des
   PARTITIONS à trois méthodes différentes (un 6 par mot, H = 133 ou 50, aucun
   666 contigu), que le mérite actuel `(G₁ + 1000) × U × R` couronne parce qu'il
   ne regarde ni la simplicité ni la quantité. Aucune moyenne de quatre axes
   ne les remet devant un groupement à une méthode et six séries sans casser
   tout le reste. Deux agents le disent avec les mêmes mots : « c'est la 1ʳᵉ
   place actuelle qui a tort ».
4. **`meg` est le second point dur.** Ses six égalisations à −200 mettent le
   crédit d'élégance à zéro ; le moteur le plancher à 520 (`FACTEUR_PLANCHER`)
   et `note()` l'écrase à 0, si bien qu'une voie `meg` vaut aujourd'hui une voie
   sans reproche en 1ʳᵉ place sur cinq saisies. La piste repli reproduit ce
   plancher (sans lui : 7 têtes mixtes au lieu de 13) ; la piste cap refuse
   de compter les égalisations (« nature de l'outil, déjà payée par A et N —
   le doublon que l'auteur a refusé en sortant `meg` des ficelles ») ; la piste
   géométrique ne reproduit pas l'artefact « sciemment ». **Arbitrage à
   rendre : que vaut `meg` ?**
5. **Un huitième doublon**, relevé par la piste produit : chaque `adHoc > 0` du
   catalogue est aussi un palier du crédit d'élégance ; compter A en plus coûte
   deux têtes. La piste cap fait le même constat sur les compteurs de
   réécriture. À trancher avec le point 4.

## 3. Ce qui les distingue

- **Où va H.** Repli et géométrique : dans la simplicité seule. Cap : idem.
  Produit : nulle part comme critère, par ses trois postes dans la cohérence.
  Mesuré par produit : H dans la simplicité lui coûte une tête.
- **La courbe de lecture.** Repli garde U^1,5 (convexe : les premières pertes
  coûtent peu). Cap, géométrique et produit prennent une racine sur la perte
  (concave : « on perd beaucoup rapidement »), comme l'auteur l'a demandé
  pour le rendement — et l'étendent à la lecture. C'est une vraie différence
  de doctrine, et elle explique plusieurs têtes déplacées de la piste cap.
- **Le compte des séries.** Repli : linéaire (séries/9) + prime de 200 si
  disjointes. Cap : racine. Géométrique : linéaire, et la mesure lui a IMPOSÉ
  850 ‰ de l'axe (avec une racine, la 2ᵈ place tombait à 3/8). Produit : une
  pente 1 − 0,55/séries^0,75 (450, 673, 806… 894).
- **Arithmétique ou géométrique.** Sur les mêmes axes et les mêmes curseurs
  (rapport de l'agent 3) : géo 14/16 contre arith 13/16 en mixte, **10 contre 8
  en élégance, 34 lignes déplacées contre 54**. Un axe effondré tire tout vers
  le bas — c'est le veto du moteur, retrouvé sans le confiner. Le prix : un
  global qui n'est plus « la moyenne » que le lecteur calcule de tête, et une
  racine S-ième en BigInt.
- **Produit dans l'axe.** La piste produit obtient la meilleure 1ʳᵉ place
  (13/16) — le veto reste opérant à l'intérieur de chaque axe — mais déplace
  le plus de lignes en mixte (19). Elle a aussi le mérite d'avoir été AJUSTÉE :
  ses constantes viennent d'une descente, pas d'un choix.

## 4. Les têtes visibles qui changeraient, par piste (régimes réglés)

Le détail — les deux voies, leurs quatre axes, leurs globaux — est dans
`score-v2-<piste>.txt`.

| saisie | repli | cap | géométrique | produit |
|---|---|---|---|---|
| **1ʳᵉ place** | | | | |
| https://hope-hope-hope.fr/ | partition → convergence `m7F` | partition → `fl+tca+mpy+meg` | partition → `fl+tca+mpy+meg` | conservée |
| Henri Prunelle | moisson → `fl+tca+m14` | moisson → `fl+tca+mazc+meg` | moisson → `2:fatb;…meg` | moisson → `fl+tca+m14` |
| Wikipedia | `mad` → convergence | `mad` → `meg` | conservée | `mad` → `meg` |
| Éléonore à Nîmes | conservée | partition → `meg` | partition → `meg` | partition → `meg` |
| macron | `meg` → partition `msfr` | conservée | conservée | conservée |
| numherololgeek | conservée | partition → `meg` | partition → moisson `mpy+mr9` | conservée |
| La numérologie… | conservée | conservée | partition → `masc+mrn` | conservée |
| jean-michel | conservée | conservée | partition → `meg` | conservée |
| Millicent Billette | conservée | quasi ex æquo | conservée | conservée |
| Capitalisme, Donald Trump | conservées | `mrd`/moisson → `meg` | conservées | conservées |
| **liste mixte (1ʳᵉ hors podium)** | | | | |
| https://hope-hope-hope.fr/ | moisson 7× → `meg` 6× | idem | idem | idem |
| Capitalisme | `meg` → `mad` | conservée | conservée | conservée |
| La numérologie… | moisson → moisson | conservée | conservée | conservée |
| Millicent Billette | conservée | quasi ex æquo | quasi ex æquo | conservée |
| Donald Trump, numherololgeek | conservées | moisson → `meg`, retouche → non | conservées | conservée, `meg` → moisson |
| **2ᵈ place** | Henri Prunelle | Éléonore (ex æquo) | Éléonore (ex æquo) | Éléonore (ex æquo) |

Le cas commun aux quatre : `https://hope-hope-hope.fr/`, où la moisson à SEPT
séries en quatorze étapes cède au groupement `fl+tca+mpy+meg` à six séries en
trois étapes. Aujourd'hui le rang la met devant parce que 7 > 6 quelle que soit
la longueur ; aucune moyenne ne le fera sans quantité à 88 %. C'est LE cas à
arbitrer : « privilégie celle qui donne le plus de séries » vaut-il une série
de plus contre onze étapes de plus et les deux tiers du calcul jetés ?

## 5. Ce que je recommande

**Aucune des quatre telle quelle — un croisement, dont la mesure dit déjà
les termes :**

- la STRUCTURE de la piste repli (une seule mesure par chose, les postes du
  barème rangés par axe, les constantes existantes conservées là où rien ne
  dit qu'elles sont fausses) — c'est la moins coûteuse à brancher, et la plus
  lisible pour qui connaît le moteur ;
- la LECTURE concave des trois autres (racine sur la perte, y compris la
  ponctuation à 5 ‰), puisque c'est ce que l'auteur a demandé pour les pertes ;
- la COHÉRENCE sans A ni égalisation comme postes séparés (le huitième doublon
  des pistes produit et cap), après arbitrage sur `meg` ;
- la QUANTITÉ avec le compte linéaire dominant et la prime des séries
  disjointes (repli et géométrique convergent là-dessus) ;
- l'ARITHMÉTIQUE entre les axes, parce que c'est ce que le lecteur voit et ce
  que le leste affiche ; la géométrique est à garder sous la main si la 1ʳᵉ
  place ne se laisse pas reproduire autrement (elle vaut +2 têtes et −20 lignes
  sur ce régime).

Et trois arbitrages avant de brancher quoi que ce soit :

1. **`https://hope-hope-hope.fr/`** — sept séries en quatorze étapes ou six en
   trois ? (Le cas est dans `AB-testing.html`, cas 1.)
2. **`meg`** — l'égalisation est-elle une bidouille à facturer (barème actuel,
   −200 par valeur) ou un procédé peu notoire déjà payé par N (les deux agents) ?
3. **La 1ʳᵉ place** — garder les partitions à trois méthodes en tête (le mérite
   actuel), ou accepter que « la plus belle » regarde aussi la simplicité et la
   quantité (toutes les pistes) ?

Une fois ces trois-là tranchés, je croise, je remesure sur le même banc, et je
branche — la 1ʳᵉ place, la 2ᵈ et la suite ne seront plus que trois positions des
curseurs, affichées par le leste sur chaque carte.

## 6. Rejouer

```
node .planning/banc/score-v2-banc.mjs src/recherche/score-v2.js              # ~2 min
node .planning/banc/score-v2-banc.mjs src/recherche/score-v2-agent.js
node .planning/banc/score-v2-banc.mjs src/recherche/score-v2-produit.js
BANC_PAS=25 node .planning/banc/score-v2-banc.mjs src/recherche/score-v2-geometrique.js   # ~20 min (BigInt)
```
