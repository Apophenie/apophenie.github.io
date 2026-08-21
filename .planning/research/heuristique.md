# Moteur de recherche heuristique — NumHeroLOLgeek

> Agent « tri/filtre heuristique parmi les transformations arithmétiques » (README, §Instruction).
> Objectif : depuis une saisie arbitraire, trouver les chemins menant à `6`, les assembler en `666`,
> et **les classer par pouvoir de conviction** — pas seulement par longueur.
>
> Contraintes de stack actées : **vanilla JS, modules ES natifs, zéro build, aucune dépendance npm.**
> Tout ce qui suit est implémentable à la main ; les prototypes de `.planning/research/proto/` le sont déjà.

---

## 0. Résumé exécutif

Cinq mesures faites sur prototype changent la conception par rapport à l'intuition de départ :

| Mesure | Valeur | Conséquence |
|---|---|---|
| Facteur de branchement brut | **b ≈ 7,5** (18 à la profondeur 1, ~6,5 ensuite) | espace naïf 8ᵈ → 178 000 chemins à d=6 |
| Espace **après canonicalisation d'état** | **105 à 2 875 états** à d=6 | l'espace utile est minuscule |
| Temps de fermeture complète, d=6 | **1,2 ms en moyenne, 40 ms au pire** (Node, mono-thread) | le budget « une seconde » est tenu 25× |
| Taux d'échec (aucun 6 trouvé) | **19,4 %, et il ne baisse plus au-delà de d=4** | c'est une **saturation**, pas une limite de profondeur |
| Chemins vers 6 trouvés | 24 à 404 par saisie | le problème n'est pas d'en trouver, c'est de **choisir** |

**Les deux conclusions structurantes :**

1. **Ce n'est pas un problème de recherche difficile.** La canonicalisation d'état effondre l'espace de
   178 000 chemins à ~3 000 états. On peut donc calculer **la fermeture exhaustive** plutôt que de faire
   du A\*, du beam ou du meet-in-the-middle. Toute la difficulté se déplace vers **le classement**.
2. **Aucune profondeur de recherche ne sauvera les entrées dégénérées** (`"a"`, `"42"`, `"666"`, `"!!!"`).
   La garantie « jamais bredouille » doit venir du **catalogue** (un joker universel), pas du moteur.
   Bonne nouvelle : ce joker existe, il est démontrable, et il est drôle (§5).

---

## 1. Formalisation du problème

### 1.1 Espace d'états typé

Un état est un couple `(type, valeur)` parmi quatre types :

| Type | Contenu | Exemple |
|---|---|---|
| `STR` | une chaîne | `"hope-hope-hope.fr"` |
| `TOKENS` | une liste de chaînes | `["h","o","p","e"]` ou `["hope","hope","hope"]` |
| `NUMS` | une liste de nombres | `[8,15,16,5]` |
| `NUM` | un nombre unique | `44` |

Les opérateurs sont **typés** (`from → to`), ce qui est la première et la plus efficace des coupes :
un opérateur ne s'applique qu'aux états de son type d'entrée. Les familles observées :

```
STR    → STR      filtres        (strip-scheme, drop-vowels, before-slash, dedup-letters, …)
STR    → TOKENS   découpes       (split-letters, split-words, split-dash, split-dot)
STR    → NUM      mesures        (len, count-vow, count-cons, count-dash, count-uniq)
TOKENS → NUMS     mappeurs       (a1z26, seg7, strokes, ends, azerty, map-len, map-rank)
TOKENS → NUM      dénombrements  (count-tokens, count-distinct-tok)
NUMS   → NUMS     transports     (reduce-each, drop-zeros)
NUMS   → NUM      combinateurs   (sum, prod, alt-sub, first-minus-rest, max, min, range, concat-digits)
NUM    → NUM      finisseurs     (digitsum, reduce, abs, flip9, split-and-sub, mod9)
```

**État initial** : `(STR, saisie)`.
**État but** : `(NUM, 6)`.
**But global** : `666`, atteint par l'un de quatre **modes d'assemblage** (§3.4).

### 1.2 Nature du problème — argumentation

Trois cadrages étaient possibles. Le bon est le premier, et la mesure le prouve :

- ✅ **Fermeture d'accessibilité dans un DAG implicite petit**, suivie d'un **classement multi-critères**.
  L'espace canonique mesuré fait 10² à 10³ états. On l'énumère **intégralement** en quelques millisecondes.
  Le problème réel n'est pas « trouver un chemin » (il y en a 24 à 404) mais « **choisir les 5 plus
  convaincants et les ordonner de façon stable** ». C'est un problème de **ranking sous contrainte de
  diversité**, greffé sur une énumération triviale.

- ⚠️ **Synthèse de programme énumérative** : c'est la bonne *famille* théorique (on synthétise bien un
  programme — une composition d'opérateurs — satisfaisant une spécification — `=6`), et on lui emprunte
  sa technique centrale, la **réduction par équivalence observationnelle**. Mais comme la spécification
  ne porte que sur **une seule entrée**, l'équivalence observationnelle dégénère exactement en
  « même valeur d'état » — c'est-à-dire ma clé de canonicalisation. On récupère le bénéfice sans
  l'appareillage.

- ❌ **Plus court chemin / A\*** : inadapté. La profondeur utile est bornée à 6 ; une heuristique
  admissible ne peut jamais valoir plus de 3 (§2.3). Un A\* avec h ≤ 3 sur un graphe de 3 000 nœuds ne
  fait pas mieux qu'un BFS, pour beaucoup plus de code. **Et surtout : on ne veut pas le plus court
  chemin, on veut les plus convaincants** — le README dit « les plus courts », mais ses propres exemples
  (méthode 1, la traduction FR d'`hope` en `espoir`) montrent que la conviction prime sur la longueur.

- ❌ **Recherche par contraintes / meet-in-the-middle** : les opérateurs ne sont pas inversibles
  (les filtres détruisent de l'information, `sum` est massivement many-to-one). Une recherche arrière
  depuis `6` est impossible **sauf sur la dernière couche `NUM→NUM`**, qui est justement inversible et
  petite. On exploite précisément ce fragment inversible sous forme de **bassin précalculé** (§2.4).

### 1.3 Taille de l'espace — chiffres mesurés

Profondeur 6, prototype `branching.mjs` :

| Saisie | États uniques | Arêtes retenues | Chemins → 6 | Temps |
|---|---|---|---|---|
| `hope` | 105 | 589 | 24 (min. 3 étapes) | 2,7 ms |
| `macron` | 134 | 713 | 62 (min. 1 étape) | 2,1 ms |
| `Wikipedia` | 237 | 1 354 | 57 (min. 2) | 1,6 ms |
| `https://hope-hope-hope.fr/` | 1 310 | 7 733 | 404 (min. 1) | 41,6 ms |
| `https://www.example.com/path/to/page` | 2 668 | 13 381 | 379 (min. 2) | 47,7 ms |
| `a` | 3 | 5 | **0** | 0,1 ms |
| `42` | 3 | 12 | **0** | 0,1 ms |

Branchement par profondeur sur l'URL `hope` : `d1: 18 → d2: 8,9 → d3: 8,5 → d4: 7,9 → d5: 7,0 → d6: 6,3`.
Il **décroît** avec la profondeur (les états deviennent des `NUM`, qui n'ont que 6 opérateurs sortants) :
l'espace se referme naturellement. C'est ce qui rend l'exhaustivité viable.

> Repère externe : sur « Le Compte est bon », Hutton (*The Countdown Problem*, JFP 12(6), 2002)
> obtient un **facteur ~20** en exploitant les propriétés arithmétiques pour élaguer les expressions
> équivalentes (commutativité `x ≤ y` pour `+`, `x > y` pour `−`, élimination des `×1` et `÷1`).
> Notre canonicalisation joue le même rôle avec un facteur du même ordre (178 000 → 2 875, ~60).
> *Les comptes d'expressions exacts de ce papier n'ont pas été vérifiés ici — seul le facteur ~20
> est confirmé par les supports de cours associés.*

---

## 2. Algorithmes — comparatif et recommandation

### 2.1 Comparatif

| Algorithme | Verdict | Motif |
|---|---|---|
| **BFS exhaustif + dédup d'état** | ✅ **retenu** | l'espace entier tient en 1–40 ms ; donne *tous* les chemins, condition nécessaire pour classer |
| IDDFS | ❌ | ré-explore les préfixes ; n'a d'intérêt que si la mémoire manque — elle ne manque pas (3 000 états) |
| Dijkstra / A\* | ❌ | heuristique plafonnée à 3, gain nul sur d≤6 ; complexité de code injustifiée |
| Beam search | 🔶 **repli seulement** | jette des solutions ; utile uniquement si le plafond de nœuds est atteint (saisies très longues) |
| Meet-in-the-middle | 🔶 **partiel** | opérateurs non inversibles ; **mais** la couche `NUM→NUM` l'est → **bassin précalculé** (§2.4) |
| DP / mémoïsation sur états canoniques | ✅ **intégré** | c'est exactement la dédup par `keyOf` ; c'est *elle* qui fait tout le travail |

### 2.2 Le point dur réel : garder les chemins, pas seulement les états

La dédup d'état donne 3 000 états — mais il y a 178 000 **chemins**. On ne peut ni tout garder
(mémoire, et surtout liste illisible), ni ne garder qu'un chemin par état (on perdrait des méthodes
plus convaincantes quoique plus longues).

**Solution retenue — faisceau local par état (« per-state beam »).**
Chaque état canonique conserve les **P = 12 meilleurs chemins préfixes** qui y mènent, classés par le
score de conviction *partiel* (§4, calculable sur un préfixe). Mémoire : `|S| × P ≈ 36 000` chemins au pire,
soit quelques Mo. C'est la technique des *k-best derivations* sur hypergraphe, empruntée à l'analyse
syntaxique. Elle borne la mémoire tout en préservant la diversité méthodologique.

### 2.3 Pourquoi l'heuristique A\* serait faible (démonstration)

Une heuristique admissible `h(s)` = minorant du nombre d'opérateurs restants :

```
h(STR)    = 1     (au mieux : `len`, une seule étape, si la longueur vaut déjà 6)
h(TOKENS) = 1     (au mieux : `count-tokens`)
h(NUMS)   = 1     (au mieux : `sum`)
h(NUM=n)  = distanceAuBassin(n)   ∈ {0, 1, 2}  — mesuré, jamais plus (§2.4)
```

`h ≤ 3` sur un graphe de profondeur ≤ 6 : le facteur de guidage est dérisoire. **A\* est rejeté**,
et cette borne est elle-même un résultat utile — elle justifie l'exhaustivité.

### 2.4 Bassin d'attraction de 6 — la seule vraie optimisation arrière

Précalcul statique (`basin-b58.mjs`) : pour tout entier `n`, distance minimale à `6` par les seuls
opérateurs `NUM→NUM`.

```
distance 0 :    1 valeur   → {6}
distance 1 :  456 valeurs  → 15, 24, 33, 42, 51, 60, 9(flip), 51, -6, …
distance 2 :  709 valeurs
couverture : 1 166 / 4 001 = 29,1 % des entiers de [-2000, 2000] mènent à 6
```

**Aucun entier de la plage n'est à distance > 2.** On précalcule donc une `Map<int, {dist, opsPath}>`
sur `[-2000, 2000]` (~1 166 entrées, quelques dizaines de ko, calculée au chargement en < 5 ms).

Bénéfice : dès qu'un `NUM` est produit, un **test d'appartenance O(1)** remplace 2 niveaux de recherche
en avant. La profondeur effective de recherche tombe de 6 à **4**, ce qui divise l'espace exploré par ~50.
C'est le seul emprunt utile au meet-in-the-middle.

### 2.5 Algorithme retenu — pseudo-code

```
CONSTANTES
  D_MAX      = 4        // + 2 niveaux gratuits via le bassin  → profondeur effective 6
  P_BEAM     = 12       // chemins conservés par état canonique
  MAX_NODES  = 20000    // garde-fou
  BUDGET_MS  = 250      // par fragment
  N_FRAG_MAX = 64       // fragments candidats (§3)

// ---------------------------------------------------------------- recherche par fragment
fonction chercherSix(fragment) -> Liste<Chemin>
  si cache.a(normaliser(fragment)) alors retourner cache.get(...)         // mémoïsation globale

  depart   ← { type:'STR', valeur:fragment }
  etats    ← Map<CleCanonique, { etat, chemins:Liste<Chemin> }>           // ordre d'insertion = déterministe
  etats.set(cle(depart), { etat:depart, chemins:[ CHEMIN_VIDE ] })
  frontiere ← [ cle(depart) ]
  resultats ← []
  t0 ← maintenant()

  pour d de 0 à D_MAX-1 :
    si frontiere.vide OU etats.taille ≥ MAX_NODES OU maintenant()-t0 > BUDGET_MS : sortir
    suivante ← []
    pour chaque k dans frontiere :                                        // ordre stable
      src ← etats.get(k)
      pour chaque op dans CATALOGUE (dans l'ordre déclaré, jamais un ordre de hachage) :
        si op.from ≠ src.etat.type : continuer
        si op.deprecated : continuer                                      // exclu des NOUVELLES recherches
        sortie ← op.appliquer(src.etat.valeur)
        si sortie = NULL : continuer                                      // op inapplicable
        si estNoOp(sortie, src.etat.valeur) : continuer                   // §4.6 canonicalisation N3
        cible ← { type:op.to, valeur:sortie }

        // --- test de but, élargi par le bassin ---
        si cible.type = 'NUM' :
          b ← BASSIN.get(cible.valeur)
          si b ≠ NULL :
            pour chaque pref dans src.chemins :
              resultats.push( pref + op + b.opsPath )                     // b.opsPath peut être vide
            // on n'arrête pas : d'autres chemins, plus convaincants, peuvent exister

        // --- insertion avec faisceau local ---
        kc ← cle(cible)
        nouveaux ← [ pour chaque pref dans src.chemins : pref + op ]
        si etats.a(kc) :
          fusionner(etats.get(kc).chemins, nouveaux, P_BEAM)              // tri par scorePartiel, tronque
        sinon :
          etats.set(kc, { etat:cible, chemins: meilleurs(nouveaux, P_BEAM) })
          suivante.push(kc)
    frontiere ← suivante

  resultats ← canonicaliser(resultats)                                    // §4.6
  resultats ← trier(resultats, par ordreTotal)                            // §6.3
  cache.set(normaliser(fragment), resultats)
  retourner resultats

// ---------------------------------------------------------------- pipeline complet
fonction resoudre(saisie) -> { approches:Liste, fragments:Liste }
  saisie   ← saisie.normalize('NFC')                                      // §6.4, impératif
  frags    ← genererFragments(saisie)                                     // §3, ≤ N_FRAG_MAX
  parFrag  ← Map( f -> chercherSix(f) pour f dans frags )                 // mémoïsé : ~1 ms chacun
  approches ← assembler(saisie, frags, parFrag)                           // §3.4, jointure sur signature
  si approches.vide :
    approches ← [ approcheJoker(saisie) ]                                 // §5, garantie absolue
  approches ← noter(approches)                                            // §4
  approches ← diversifier(approches, λ=0.35, maxParMappeur=2)             // §4.6 N4
  retourner { approches: approches.tranche(0, 12),
              fragments: aplatir(parFrag).tranche(0, 24) }
```

### 2.6 Budget navigateur et plan de repli

Mesures : moyenne **1,2 ms**, pire cas mesuré **48 ms** (URL longue), pour la fermeture complète d'un
fragment à d=6 en mono-thread. Le budget d'une seconde est tenu avec **plus de 20× de marge**, même en
multipliant par les ~64 fragments candidats (dont l'immense majorité sont des mots courts à ~1 ms).

Échelle de repli, **dans cet ordre** :

1. **Mémoïsation par fragment normalisé** — déjà dans le pseudo-code. Sur un texte répétitif c'est le
   gain principal : 26 mots → 25 recherches distinctes seulement, mesuré à 50 ms au total.
2. **Plafond de nœuds** (`MAX_NODES = 20 000`) : on cesse d'étendre, on garde l'acquis. Jamais d'échec dur.
3. **Budget temps par fragment** (`BUDGET_MS = 250`) : contrôlé via `performance.now()` en tête de boucle.
4. **Réduction de `D_MAX`** à 3 puis 2 si le plafond est atteint deux fois de suite.
5. **Restriction du jeu de fragments** aux mots simples et frontières structurelles (§3.3).
6. **Bascule beam search** (largeur 32) au lieu de l'exhaustif — uniquement au-delà du plafond.
   *Réglage* : la littérature de décodage neuronal sature vers une largeur de 5–10 ; 32 est confortable ici.
7. **Web Worker** (natif, aucune dépendance — `new Worker('./worker.js', {type:'module'})`) :
   recommandé non pas pour la vitesse mais pour **ne jamais bloquer la frappe**. Le moteur y tourne,
   poste ses résultats par `postMessage` **au fil de l'eau** (`{type:'partial', approches}`), l'UI
   affiche une liste qui se complète. Un `AbortController`-like par génération (compteur de requête)
   annule les recherches obsolètes quand l'utilisateur continue de taper.
8. **Debounce de 150 ms** sur la saisie en direct.

> Le seul point du pipeline qui coûte vraiment est **base58 sur les saisies très longues**
> (24 ms à 2 048 octets, 96 ms à 4 096 — c'est du O(n²), §6.5), pas la recherche. D'où le plafond de saisie.

---

## 3. Segmentation de la saisie

### 3.1 Tokenisation structurante (URL-aware)

Ne pas découper naïvement sur les espaces : la structure d'une URL porte du sens numérologique,
et **les séparateurs sont des porteurs de valeur** (le `-` est sur la touche du `6` en AZERTY —
c'est la méthode 6 du README, on ne doit surtout pas les jeter).

```
fonction tokeniser(saisie) -> Arbre
  si ressemble à une URL :
    { schema, hote:[labels...], port, chemin:[segments...], requete:[params...], ancre }
  sinon :
    { phrases:[ { mots:[...], separateurs:[...] } ] }
  // dans tous les cas on conserve les séparateurs comme tokens de type 'S',
  // avec leur position d'origine (offset, longueur) pour le calcul de couverture (§4.4)
```

Chaque token garde `{ texte, genre:'W'|'S', offset, longueur }`. Les offsets sont indispensables
au critère de couverture `U` et au rendu visuel (surligner ce qui est consommé).

### 3.2 Détection des motifs porteurs — la priorité absolue

C'est ici qu'on capture `hope-hope-hope`, le cas d'école du README. Deux détecteurs, mesurés :

**a) Groupes répétés (≥ 3 occurrences)** — un simple comptage par mot normalisé.
```
"https://hope-hope-hope.fr/" → mots ["https","hope","hope","hope","fr"] → répétition {hope ×3} ✓
```
Dès qu'un token apparaît **exactement 3 fois**, on émet un candidat d'assemblage prioritaire :
les trois fragments sont **le même texte**, donc n'importe quel chemin vers 6 est automatiquement
homogène (`H = 1`) et l'approche décroche le bonus de **résonance structurelle** (§4.5).
Une seule recherche suffit pour les trois fragments (mémoïsation).

**b) Périodicité de la suite de tokens** — plus petite période `p` telle que la suite soit `motif^k`.
```
"ha-ha-ha"       → période 1, 3 répétitions, motif ["ha"]   ✓
"abc-abc-abc-abc"→ période 1, 4 répétitions                 ✓
"le chat dort"   → apériodique
```
Coût O(n²/2) trivial. Capte les répétitions **de groupes** (`ab-ab-ab-ab`), que le compteur (a) rate.

### 3.3 Génération des fragments candidats — priorisée et plafonnée

Le piège est l'explosion combinatoire. Mesures : 26 mots → 300 découpes contiguës en 3 ;
80 mots → 3 081 découpes contiguës, mais **82 160** sous-ensembles libres de 3. Les sous-ensembles
libres sont donc à proscrire au-delà d'une vingtaine de tokens.

**La parade est structurelle : on ne cherche jamais « par découpe ». On cherche « par fragment »,
une seule fois chacun, puis on assemble.** C'est ce qui casse la combinatoire :

> 26 mots → 300 découpes × 3 parts = 900 recherches en naïf (≈ 1,8 s).
> Avec mémoïsation par fragment : **25 recherches distinctes** (≈ 50 ms). **Facteur 36.**

Génération, par ordre de priorité décroissante, **plafonnée à `N_FRAG_MAX = 64`** :

| Rang | Famille | Contenu | Plafond |
|---|---|---|---|
| 1 | **Répétitions** | motifs détectés en §3.2 | tous |
| 2 | **Unités naturelles** | chaque mot, chaque label d'hôte, chaque segment de chemin, chaque paramètre | 40 |
| 3 | **Groupes de séparateurs** | la suite des `-`, des `.`, des `/` (porteurs AZERTY) | 4 |
| 4 | **Frontières structurelles** | avant/après le 1ᵉʳ `/`, hôte vs chemin, avant/après `@`, par phrase | 8 |
| 5 | **Saisie entière** | pour les approches « 666 direct » | 1 |
| 6 | **n-grammes contigus** (2–3 mots) | seulement si le total reste sous le plafond | reste |

Au-delà de 30 tokens, la famille 6 est désactivée et les découpes d'assemblage sont restreintes aux
**frontières structurelles** (§3.4), ce qui ramène le nombre de découpes de 3 081 à quelques dizaines.

### 3.4 Assemblage — la jointure sur signature de méthode

Le README insiste : « idéalement 3 d'affilée, **idéalement selon la même méthode** ». Prendre le
meilleur chemin de chaque fragment indépendamment produit trois méthodes hétéroclites — peu convaincant.

**Algorithme retenu — jointure par hachage sur la signature de méthode.** Pour chaque fragment, on
indexe ses chemins par leur signature `sig` (§4.2). Une méthode homogène = une signature présente dans
les trois index. C'est une intersection de tables de hachage, O(nb de chemins), quasi gratuite.

```
fonction assembler(saisie, frags, parFrag) -> Liste<Approche>
  approches ← []

  // --- mode A : résonance (le cas hope-hope-hope) — priorité maximale ---
  pour chaque motif répété ×3 détecté en §3.2 :
    pour chaque chemin dans parFrag[motif] :
      approches.push({ mode:'RESONANCE', parts:[chemin, chemin, chemin], resonance:vrai })

  // --- mode B : partition contiguë couvrante en 3 parts ---
  decoupes ← (nbTokens ≤ 30) ? toutesLesCoupesEn3()          // C(n-1,2), ≤ 406
                             : coupesAuxFrontieresStructurelles()
  pour chaque (p1,p2,p3) dans decoupes :
    // jointure sur signature : on privilégie l'homogénéité
    sigsCommunes ← index(parFrag[p1]).clés ∩ index(parFrag[p2]).clés ∩ index(parFrag[p3]).clés
    pour chaque s dans sigsCommunes :
      approches.push({ mode:'PARTITION', parts:[best(p1,s), best(p2,s), best(p3,s)] })
    si sigsCommunes.vide :                                    // repli hétérogène, sera pénalisé par H
      approches.push({ mode:'PARTITION', parts:[best(p1), best(p2), best(p3)] })

  // --- mode C : 3 fragments disjoints non couvrants (pénalisés sur U) ---
  //     borné aux 12 meilleurs fragments, C(12,3)=220 combinaisons max
  ...

  // --- mode D : 2 fragments + un « 6 offert » ---
  //     ex. les deux `-` sur la touche du 6 en AZERTY (méthode 6 du README)
  pour chaque six_offert détecté (séparateurs AZERTY, chiffre 6 littéral présent) :
    ...

  // --- mode E : 666 direct (un seul chemin donne 666, ou 6 puis triplement) ---
  ...
  retourner approches
```

Coût total mesuré de l'assemblage : négligeable devant les recherches (jointures sur ≤ 400 chemins).

---

## 4. Fonction de score de conviction

> C'est le cœur du projet : sa valeur comique en dépend entièrement.
> Une démonstration convaincante est une démonstration qu'on **n'a pas envie de vérifier**.

Six critères, normalisés dans `[0,1]`, combinés par somme pondérée, puis modulés par des bonus/malus.

### 4.1 `C` — Concision (poids **0,15**)

`L` = nombre d'**étapes réellement rendues à l'écran**, **après factorisation du préfixe commun**
(un filtre appliqué à la saisie entière avant découpe compte une fois, pas trois — sinon on
pénaliserait injustement les approches élégantes qui nettoient l'URL une bonne fois).

```
L*  = 9                                  // idéal : 3 fragments × 3 étapes
C   = 0.88 ^ max(0, L − L*)
```
`L=9 → 1,00` · `L=12 → 0,68` · `L=15 → 0,46` · `L=18 → 0,31`

*Justification du poids modéré (0,15) :* le README demande « les chemins les plus courts », mais ses
propres exemples le contredisent. La méthode 1 (traduire *hope* → *espoir* → 6 lettres) est longue et
détournée, et c'est **la plus convaincante des sept**. La brièveté aide, elle ne décide pas.

### 4.2 `H` — Homogénéité de la méthode (poids **0,25**, le plus fort)

**Signature de méthode** d'un chemin : les opérateurs **hors filtres**, dans l'ordre.
```
sig(chemin)     = chemin.ops.filter(o => o.famille ≠ 'filtre').map(o => o.id).join('>')
mappeur(chemin) = premier op de famille 'mappeur' ou 'mesure'
```

Similarité entre deux chemins, par paliers :
```
h(a,b) = 1,00   si sig(a)=sig(b) ET filtres(a)=filtres(b)     // strictement la même méthode
       = 0,90   si sig(a)=sig(b)                              // même méthode, nettoyages différents
       = 0,60   si mappeur(a)=mappeur(b)                      // même règle de conversion
       = 0,30   si famille(mappeur(a))=famille(mappeur(b))    // ex. deux règles « géométriques »
       = 0,05   sinon

H = moyenne des 3 paires  h(p1,p2), h(p1,p3), h(p2,p3)
```

*Justification du poids maximal :* c'est **l'exigence explicite du README** (« idéalement selon la
même méthode »), et c'est le ressort comique central. Trois fois la même règle appliquée mécaniquement
donne l'impression d'une **loi** ; trois règles différentes trahissent le bricolage. Un lecteur pardonne
une règle absurde répétée trois fois, jamais trois règles absurdes distinctes.

### 4.3 `N` — Notoriété des règles (poids **0,20**)

Chaque opérateur porte un attribut `notoriete ∈ [0,1]` fourni par le catalogue. Barème proposé :

| `notoriete` | Règles |
|---|---|
| 1,00 | A1Z26, compter les lettres |
| 0,85 | compter les voyelles / consonnes, réduction théosophique (somme des chiffres) |
| 0,70 | ignorer `https://`, ignorer le TLD, découper sur les `-` |
| 0,55 | afficheur 7 segments |
| 0,40 | nombre de traits, nombre d'extrémités |
| 0,30 | touche AZERTY partagée |
| 0,15 | traduction FR/EN, règles exotiques |

```
N = 0,5 × moyenne(notoriete) + 0,5 × min(notoriete)
```
*Le terme `min` est délibéré (« maillon faible ») :* une seule règle exotique suffit à faire décrocher
le spectateur, même noyée dans quatre règles impeccables. La moyenne seule masquerait ce décrochage.

### 4.4 `U` — Couverture du texte exploité (poids **0,18**)

```
signifiants = caractères de la saisie moins la « boilerplate gratuite »
              (schéma `https://`, `www.`, `/` final) — universellement admise comme ignorable
utilises    = caractères couverts par au moins un fragment de l'approche (via les offsets, §3.1)

U_brut = utilises / signifiants
U      = U_brut ^ 1,5          // punit sévèrement le cherry-picking
```
`U_brut=1,0 → 1,00` · `0,9 → 0,85` · `0,5 → 0,35` · `0,2 → 0,09`

*Justification :* ignorer 90 % de la saisie n'est pas une démonstration, c'est un aveu. L'exposant 1,5
rend le score concave : perdre les 10 premiers pourcents coûte peu, tomber sous la moitié est
rédhibitoire. La franchise sur `https://` évite de pénaliser la méthode 1 du README, qui est légitime.

### 4.5 `A` — Absence d'étapes ad hoc (poids **0,12**)

Chaque opérateur porte `adHoc ∈ [0,1]`. Produit sur le chemin — les entorses se **composent**, elles
ne se moyennent pas :
```
A = Π (1 − adHoc(op))
```
| `adHoc` | Opérateur | Commentaire |
|---|---|---|
| 0,00 | filtres, mappeurs, `sum`, `reduce` | neutres |
| 0,25 | `abs` « si ça ne donne pas 6 » | secours visible, mais classique en numérologie |
| 0,30 | `split-and-sub` (retrancher les chiffres entre eux) | acrobatique |
| 0,35 | `flip9` (retourner le 9) | **à conserver absolument** : c'est le gag du README (méthode 6) |
| 0,50 | joker universel (§5) | dernier recours |

*Justification :* on **pénalise sans exclure**. Ces pirouettes sont drôles précisément parce qu'elles
sont visiblement forcées ; les bannir amputerait le projet de son humour. Elles doivent simplement
perdre face à une démonstration propre, et n'apparaître que faute de mieux.

### 4.6 `E` — Élégance des nombres intermédiaires (poids **0,10**)

```
e(x) = 1,00 si |x| ≤ 30 ; 0,85 si |x| ≤ 100 ; 0,65 si |x| ≤ 999 ; 0,35 au-delà
e(x) ×= 0,85            si x < 0                       // les négatifs sentent l'artifice
e(x) = min(1, e(x)+0,10) si x remarquable              // 11,22,33,44,66,99 · 7,13,42,101,666

E = moyenne de e sur tous les nombres intermédiaires
```
*Justification du poids faible :* c'est un critère de finition. Un `44 → 4+4 = 8` se lit
instantanément ; un `-2837 → …` fait décrocher. Mais ça ne départage que des approches déjà proches.

### 4.7 Agrégation, bonus et malus

```
base = 100 × ( 0,25·H + 0,20·N + 0,18·U + 0,15·C + 0,12·A + 0,10·E )

BONUS   +8  si RESONANCE           // les 3 fragments sont littéralement le même texte
        +5  si U_brut = 1          // toute la saisie signifiante est exploitée
        +4  si aucun op n'a adHoc > 0 et aucun joker

MALUS   ×0,45 par joker universel employé (§5)
        ×0,75 si un fragment fait moins de 2 caractères signifiants   // fragment creux
        ×0,80 si le mode d'assemblage est C (fragments disjoints non couvrants)

score = borner(round(base × 100), 0, 10000)          // entier, en milli-unités
```

Somme des poids = 1,00. **Le score est un entier**, calculé en arithmétique entière à virgule fixe
(§6.3) — c'est une exigence de déterminisme, pas une coquetterie.

**Étalonnage sur les 7 méthodes du README** (attendu, à valider en implémentation) :

| Méthode README | H | N | U | Score attendu | Rang |
|---|---|---|---|---|---|
| 1 – traduction FR (*hope→espoir→*6 lettres) | 1,00 | 0,15 | ~0,85 | ~72 | haut (résonance + homogénéité parfaites) |
| 2 – lettres + voyelles | 1,00 | 0,85 | ~0,85 | **~88** | **1ᵉʳ** |
| 3 – lettres + consonnes | 1,00 | 0,85 | ~0,85 | ~88 | ex æquo — *à départager par la diversité (N4)* |
| 4 – A1Z26 sur les 3 répétitions | 0,90 | 1,00 | ~0,95 | ~85 | haut |
| 5 – 7 segments | 1,00 | 0,55 | ~0,85 | ~76 | moyen |
| 6 – AZERTY + retournement du 9 | 0,30 | 0,30 | ~0,90 | ~48 | bas (mais drôle → à garder via la diversité) |
| 7 – soustraction | 1,00 | 0,60 | ~0,85 | ~74 | moyen |

Le classement obtenu correspond à l'intuition : les méthodes 2/3 (les plus « naturelles ») en tête,
la méthode 6 (la plus tordue) en queue mais **présente**. C'est le comportement recherché.

### 4.8 Canonicalisation anti-doublons

Quatre niveaux, du plus strict au plus souple :

**N1 — Trace de valeurs (doublon visuel exact).**
Deux chemins qui affichent la **même suite d'images** sont le même spectacle, quels que soient les noms
des opérateurs. Clé = hachage de la suite des valeurs d'états rendues.
```
traceCle(chemin) = chemin.etats.map(rendreValeur).join('')
```
C'est le critère souverain : on déduplique sur ce qui est **montré**, pas sur ce qui est calculé.

**N2 — Normalisation des filtres commutatifs.**
`lower ∘ dropVowels` et `dropVowels ∘ lower` finissent au même endroit par des images intermédiaires
différentes — N1 ne les attrape pas. Le catalogue déclare `commute:true` sur les filtres purs ; on
**trie chaque suite maximale d'opérateurs commutants par leur `code` croissant** avant de calculer N1.
(C'est l'analogue du tri des enfants commutatifs dans un hachage de Merkle d'AST.)

**N3 — Élimination des opérations neutres.**
Si `op(v) = v`, l'étape n'apparaît pas à l'écran : on la retire du chemin. Déjà appliqué dans le
prototype ; c'est ce qui évite les chemins gonflés artificiellement.

**N4 — Diversité de la liste affichée (MMR).**
Après tri, sélection gloutonne avec pénalité de redondance :
```
score_ajusté(c) = score(c) − λ × max( h(c, s) pour s déjà sélectionné )      avec λ = 0,35
contrainte      : au plus 2 approches par mappeur principal
```
C'est ce mécanisme qui, sur l'exemple du README, montrera *lettres+voyelles* **et** *A1Z26*
**et** *AZERTY+retournement du 9* — plutôt que cinq variantes de comptage de voyelles.
Sans lui, les méthodes 2 et 3 (ex æquo) monopoliseraient le haut de liste.

---

## 5. Garantie « jamais bredouille »

### 5.1 Le problème, mesuré

**19,4 % des saisies testées ne produisent aucun 6** — et ce taux **ne bouge plus** entre les
profondeurs 4, 5 et 6 (identique : 14 échecs sur 72). Ce n'est donc **pas** un manque de recherche mais
une **saturation** : sur ces entrées, l'ensemble des `NUM` atteignables ne contient tout simplement pas 6.

Échecs mesurés : `a`, `b`, `z`, `1`, `42`, **`666`**, `q`, `5g`, `w`, `ww`, `2026`, `01/01/2000`, `!!!`, `"   "`.

> Le cas `"666"` est le plus savoureux : le site échoue à démontrer que 666 vaut 666.
> À traiter en dur, c'est un cadeau comique.

Cause structurelle : sur une entrée d'un seul caractère, `TOKENS` n'a qu'un élément, donc tous les
combinateurs (`sum`, `prod`, `max`, `range`…) dégénèrent en identité. Aucune profondeur n'y remédie.

Second joker envisagé puis **écarté** : la sélection de sous-ensembles A1Z26 modulo 9. Mesuré, il
couvre bien `hope`, `macron`, `ok`, `xy`, `abc` (tous les résidus atteignables) — mais **échoue sur
`a` (résidus {0,1}) et `zz` ({0,7,8})**. C'est un excellent *amplificateur* de solutions, ce n'est pas
une garantie.

### 5.2 Le terminateur universel — démontré

**Règle : remplacer un nombre par le nombre de lettres de son nom en français.**

| n | nom | lettres |
|---|---|---|
| 0 | zéro | 4 |
| 1 | un | 2 |
| 2 | deux | 4 |
| 3 | trois | 5 |
| **4** | **quatre** | **6** |
| 5 | cinq | 4 |
| 6 | six | 3 |
| 7 | sept | 4 |
| 8 | huit | 4 |
| 9 | neuf | 4 |

L'itération admet le **cycle attracteur `4 → 6 → 3 → 5 → 4`**, qui **contient 6**. Vérifié
exhaustivement (`joker.mjs`) : **tout chiffre de 0 à 9 atteint 6 en au plus 3 étapes.**

```
0 → 4 → 6            (2)        5 → 4 → 6            (2)
1 → 2 → 4 → 6        (3)        6                    (0)
2 → 4 → 6            (2)        7 → 4 → 6            (2)
3 → 5 → 4 → 6        (3)        8 → 4 → 6            (2)
4 → 6                (1)        9 → 4 → 6            (2)
```

**C'est une propriété du français**, et c'est ce qui la rend délicieuse. Contre-épreuve anglaise
vérifiée : `four` a 4 lettres, donc 4 est un **point fixe** et l'itération anglaise converge vers 4
sans jamais passer par 6. La démonstration ne marche qu'en français — argument d'autorité idéal pour
un site de numérologie francophone.

### 5.3 Chaîne de garantie de bout en bout

Toute saisie non vide possède **au moins une longueur**, qui est un entier ≥ 1. Donc :

```
saisie non vide → longueur (toujours définie) → réduction en un chiffre → itération française → 6
```

Vérifié sur tous les échecs mesurés :
```
"a"          : longueur 1  → 1 → 2 → 4 → 6          (3 étapes)
"42"         : longueur 2  → 2 → 4 → 6              (2 étapes)
"666"        : longueur 3  → 3 → 5 → 4 → 6          (3 étapes)
"2026"       : longueur 4  → 4 → 6                  (1 étape)
"!!!"        : longueur 3  → 3 → 5 → 4 → 6          (3 étapes)
"01/01/2000" : longueur 10 → 1 → 2 → 4 → 6          (4 étapes)
```

**Borne : 4 étapes maximum, pour n'importe quelle saisie non vide.** Le seul cas non couvert est la
**saisie vide**, qui relève de l'UI (bouton désactivé) et non du moteur.

### 5.4 Politique d'emploi

- L'opérateur `nomFrancais` porte `adHoc = 0,50`, `notoriete = 0,15`, `isJoker = true`.
- Il est **exclu de la recherche normale** (drapeau `joker:true` ignoré par `chercherSix`).
- Il n'est instancié que par `approcheJoker(saisie)`, appelée **uniquement si `approches` est vide**.
- Le malus multiplicatif `×0,45` garantit qu'une approche jokerisée ne peut jamais dépasser
  une approche honnête (plafond ≈ 45/100 contre ≈ 88 pour une bonne).
- **Il est appliqué trois fois** (une par 6) pour rester homogène : `H = 1`, ce qui préserve la dignité
  de la démonstration de secours.

*Recommandation produit :* ne pas cacher le joker. Une fois la garantie acquise, il peut même être
proposé en bas de liste sous un intitulé assumé (« la méthode qui marche toujours »).

---

## 6. Déterminisme et partage d'URL

> **Le point le plus important pour la suite.** Un lien partagé qui ouvre une autre démonstration que
> celle promise détruit la blague. Cette section est traitée comme une spécification, pas comme une piste.

### 6.1 Le risque, énoncé précisément

Le README prévoit `#{numéro de l'approche}#{b58 de la séquence}`, où le numéro est un **rang dans une
liste triée**. Or ce rang dépend de :

1. la **composition du catalogue** — ajouter un opérateur crée de nouvelles approches qui s'intercalent ;
2. les **pondérations du score** — tout réglage de §4 réordonne la liste ;
3. le **comportement d'un opérateur** — corriger une table (7 segments, traits) change des valeurs ;
4. l'**ordre d'itération** en JS — pièges de `Map`/`Set`, tri instable, virgule flottante.

**Un rang n'est pas un identifiant : c'est le résultat d'un calcul.** Le publier revient à publier un
pointeur vers une structure mutable. Les liens casseront **à la première évolution du catalogue** —
c'est-à-dire immédiatement, puisque le README annonce lui-même « on en ajoutera si besoin ».

### 6.2 Solution : l'URL transporte le programme, pas son rang

L'URL encode **la démonstration elle-même** — la suite d'opérateurs — sous forme compacte.
Elle devient **auto-suffisante** : rejouable sans recherche, insensible au classement.

**a) Registre d'opérateurs append-only.** Chaque opérateur du catalogue porte :

| Champ | Rôle |
|---|---|
| `id` | slug lisible et stable (`a1z26`, `dropVowels`, `seg7`) — usage code et débogage |
| `code` | **entier 1–255, alloué une fois, jamais réattribué, jamais réutilisé** |
| `deprecated` | si vrai : exclu des nouvelles recherches, **mais toujours exécutable** |

**Trois règles inviolables :**
1. Un `code` alloué l'est **à vie**. Retirer un opérateur pose une **pierre tombale** — son code n'est
   jamais recyclé.
2. **Changer le comportement d'un opérateur = allouer un nouveau `code`**, et déprécier l'ancien en
   conservant son ancien comportement. C'est le prix de la permanence des liens : le registre est un
   journal, pas un état.
3. L'ordre de déclaration du catalogue est **l'ordre des `code` croissants** — c'est aussi l'ordre
   d'itération du moteur (§6.3) et l'ordre de tri de N2.

**b) Format binaire du jeton d'approche.**
```
octet 0    : FORMAT           (=1, versionne la structure elle-même)
octet 1    : EPOCH_REGISTRE   (=1, versionne la sémantique des codes)
octet 2    : MODE_ASSEMBLAGE  (0=666 direct · 1=partition contiguë · 2=fragments libres
                               · 3=2 fragments + 6 offert · 4=résonance)
puis, par fragment :
  varint   : offset de début (en tokens)
  varint   : longueur (en tokens)
  octet    : nombre d'opérateurs
  octet[]  : codes des opérateurs, dans l'ordre d'application
```
**Mesuré** : 3 fragments × 4 opérateurs + en-têtes = **17 octets → 22 caractères base58**.
```
/#Yrw3QF96fgAofRbzkoxYro#4CWoMo83vssWUVNyVX4xwHfRUZTefuSMtPKk     → 61 caractères de fragment
```
Parfaitement partageable. Les fragments sont désignés par **offsets de tokens**, pas par leur texte :
le jeton reste court et reste valide si la saisie est ré-encodée à l'identique.

**c) Compatibilité avec l'ergonomie du README.** Le README veut `#3` ou `#3+7+2`. On concilie par une
**lecture tolérante / écriture canonique** :

- **En lecture**, trois formes acceptées :
  - `#<jeton base58>#<b58saisie>` → **forme canonique**, rejouée telle quelle, sans recherche ;
  - `#3+7+2#<b58saisie>` → **forme héritée** : on relance la recherche, on prend les rangs 3, 7 et 2
    du classement courant, et on affiche un bandeau discret *« démonstration recalculée »* ;
  - `##<b58saisie>` → page de résultats (conforme au README).
- **En écriture**, l'application réécrit **toujours** la barre d'adresse en forme canonique
  (`history.replaceState`) dès l'ouverture d'une démonstration. L'utilisateur qui copie l'URL copie
  donc systématiquement un lien permanent, sans avoir à le savoir.

Les rangs restent affichés dans l'UI (le README les veut pour le débogage) mais ne sont plus
**l'identité** d'une démonstration.

**d) Dégradation gracieuse.** À l'ouverture d'un jeton :

| Situation | Comportement |
|---|---|
| `FORMAT` inconnu (plus récent) | bandeau « lien créé par une version plus récente », repli sur la page de résultats |
| `code` inconnu | idem — le registre étant append-only, ce cas ne survient qu'en rétrogradation |
| `code` déprécié | **rejoué normalement**, comportement d'origine préservé |
| offsets hors bornes | repli sur la page de résultats |

Un lien ne renvoie **jamais** silencieusement vers une démonstration différente : soit il rejoue
exactement, soit il l'annonce.

### 6.3 Déterminisme du classement — règles d'implémentation

Même avec des identifiants stables, la **liste** doit être reproductible (rangs hérités, tests,
capture d'écran). Contraintes, toutes vérifiables en revue :

1. **Ordre total explicite**, jamais de tri partiel :
   `score DESC → L ASC → suite des codes d'opérateurs, comparée lexicographiquement, ASC`.
   Le dernier critère est total (deux approches distinctes ont des suites de codes distinctes) :
   **aucun ex æquo ne subsiste**, donc la stabilité du tri de l'implémentation devient sans objet.
2. **Score entier.** Calcul en virgule fixe (milli-unités, §4.7). Les sommes pondérées en flottant
   peuvent différer sur le dernier bit selon l'ordre d'accumulation et le moteur JS ; deux scores
   à 10⁻¹⁶ près qui s'inversent suffisent à permuter deux lignes. On arrondit **avant** de comparer.
3. **Ordre d'itération maîtrisé.** Toujours parcourir le catalogue dans l'ordre des `code` croissants.
   Ne jamais dépendre de l'ordre d'insertion d'une `Map` alimentée par un parcours de graphe.
4. **Aucune source d'entropie** : ni `Math.random`, ni `Date.now`, ni `localeCompare`, ni `Intl`
   (dépendants de la locale et de la version du navigateur). Comparaisons de chaînes en **unités de
   code** (`<` / `>` natifs).
5. **Normalisation Unicode `NFC` de la saisie** avant toute chose — sinon `"é"` précomposé et `"é"`
   décomposé produisent deux base58 différents pour un texte visuellement identique, donc deux URL
   distinctes pour la même démonstration.

### 6.4 base58 — implémentation vanilla

Écrit à la main, ~30 lignes, aucune dépendance (prototype fonctionnel dans `basin-b58.mjs`) :

```js
const AL = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; // alphabet Bitcoin
// encodage : conversion de base 256 → 58 par divisions successives sur un tableau de chiffres
// octets de tête nuls → caractère '1' (préservation de la longueur)
// UTF-8 : new TextEncoder().encode(str) → Uint8Array → b58enc
// décodage : symétrique, new TextDecoder().decode(b58dec(str))
```

**Mesures (aller-retour vérifié, y compris sur accents et tirets cadratins) :**

| Entrée | caractères | octets UTF-8 | base58 | expansion |
|---|---|---|---|---|
| `hope` | 4 | 4 | 6 (`3fq9KJ`) | ×1,50 |
| `https://hope-hope-hope.fr/` | 26 | 26 | 36 | ×1,385 |
| `Éléonore à Nîmes — 100 % vrai !` | 31 | **37** | 51 | ×1,378 |
| 200 caractères ASCII | 200 | 200 | 273 | **×1,365** |

L'expansion tend vers `log(256)/log(58) = 1,3658`. **Attention aux accents** : ils coûtent 2 octets
UTF-8 chacun, donc ~2,7 caractères base58 — un texte français accentué gonfle plus que l'ASCII.

**Coût CPU — c'est du O(n²)** (division du grand entier à chaque octet) :

| octets | base58 | temps/encodage |
|---|---|---|
| 64 | 88 | 0,07 ms |
| 256 | 350 | 0,87 ms |
| 1 024 | 1 399 | 6,1 ms |
| 2 048 | 2 797 | **24,0 ms** |
| 4 096 | 5 594 | **96,1 ms** |

**Plafond de saisie recommandé : 500 caractères.** Cela borne l'URL à ~700 caractères (bien sous la
limite prudente de 2 048), et l'encodage à ~2 ms. C'est le seul poste du pipeline qui coûte plus cher
que la recherche elle-même. Au-delà de 1 000 caractères, il faudrait déporter l'encodage dans le Worker.

*Note :* le fragment (`#…`) n'est **jamais transmis au serveur**, donc les limites côté serveur
(nginx 8 ko, etc.) ne s'appliquent pas — seules comptent celles du navigateur et des applications qui
tronquent les liens collés (messageries, réseaux sociaux). D'où la cible ~700.

*Choix de base58 vs base64url :* base64url est plus compact (×1,333) et O(n). Mais base58 évite
`-` `_` `+` `/` et les caractères ambigus `0OIl` : le jeton se **sélectionne d'un double-clic**,
se dicte, et survit aux détecteurs de liens qui mangent la ponctuation finale. Pour un lien
destiné à être partagé et lu à voix haute, **le choix du README est le bon** — on le conserve.

---

## 7. Contrat d'interface

Ce que le moteur heuristique attend du **catalogue de transformations**.

### 7.1 Descripteur d'opérateur

```js
export const op = {
  // --- identité (immuable, cf. §6.2) ---
  id:         'a1z26',           // slug stable, unique
  code:       12,                // entier 1–255, alloué à vie, jamais réutilisé
  deprecated: false,             // true → exclu des recherches, TOUJOURS exécutable

  // --- typage (indispensable au moteur) ---
  from:       'TOKENS',          // 'STR' | 'TOKENS' | 'NUMS' | 'NUM'
  to:         'NUMS',

  // --- sémantique ---
  // DOIT être pure et déterministe. DOIT retourner null si inapplicable (jamais d'exception).
  apply(valeur) { /* … */ },

  // --- métadonnées de classement (§4) — SANS ELLES, PAS DE SCORE ---
  famille:    'mappeur',         // 'filtre'|'decoupe'|'mesure'|'mappeur'|'combinateur'|'finisseur'|'joker'
  notoriete:  1.00,              // [0,1] — §4.3
  adHoc:      0.00,              // [0,1] — §4.5
  commute:    false,             // true → participe au tri canonique N2 (§4.8) ; filtres purs seulement
  cout:       1,                 // nb d'étapes rendues à l'écran (0 si invisible, ex. normalisation)
  isJoker:    false,             // true → jamais exploré, réservé à approcheJoker() (§5.4)

  // --- couverture (§4.4) — pour STR→* uniquement ---
  // renvoie les intervalles [debut,fin) de l'entrée réellement consommés
  couverture(valeur) { return [[0, valeur.length]]; },

  // --- rendu (consommé par l'agent moteur visuel, transporté tel quel par le moteur) ---
  libelle:    'Chaque lettre vaut son rang dans l\'alphabet',
  regle:      'A=1, B=2, … Z=26',
};
```

### 7.2 Garanties exigées du catalogue

1. **Pureté et déterminisme.** `apply` ne lit aucun état global, n'utilise ni horloge ni aléa,
   et retourne toujours la même sortie pour la même entrée. Le classement en dépend entièrement.
2. **`null` plutôt qu'exception** pour « inapplicable ». Le moteur teste `=== null` en boucle chaude ;
   un `try/catch` par arête coûterait cher.
3. **Ordre de déclaration = ordre des `code` croissants.** C'est l'ordre d'itération du moteur (§6.3).
4. **Métadonnées de classement obligatoires.** Un opérateur sans `notoriete`/`adHoc`/`famille` est
   inclassable : le moteur doit refuser de démarrer (échec au chargement, pas dégradation silencieuse).
5. **Registre append-only.** Modifier le comportement d'un `code` publié casse les liens partagés.
   Un test de non-régression doit **geler les `code` publiés** (jeu de vecteurs `code → entrée → sortie`).
6. **Bornes de sortie.** `NUM` reste dans `[-10⁶, 10⁶]` (au-delà, retourner `null`) : le bassin est
   tabulé sur `[-2000, 2000]` et les grands nombres sont de toute façon inélégants (§4.6).

### 7.3 Ce que le moteur fournit en retour

```js
// à l'agent moteur visuel
{ approche: { mode, score, rang, jeton },
  etapes:   [ { opId, libelle, regle, avant, apres, couverture:[[d,f)…] }, … ] }

// à l'agent design / UI
{ approches: [ { rang, score, titre, jeton, url } … ],   // ≤ 12, diversifiées (N4)
  fragments: [ { texte, offset, score, jeton } … ] }     // ≤ 24, pour le mémo d'assemblage
```

---

## 8. Décisions à trancher

| # | Question | Options | Recommandation |
|---|---|---|---|
| 1 | **Le joker français est-il acceptable *éditorialement* ?** | (a) caché, secours muet · (b) affiché et assumé (« la méthode qui marche toujours ») | **(b)** — le cycle `quatre→6` est un vrai fait, et le fait qu'il ne marche **qu'en français** est un excellent gag. Mais c'est un choix de ton : **arbitrage auteur**. |
| 2 | **Traiter `"666"` en dur ?** | (a) laisser le joker faire · (b) réponse dédiée | **(b)**, cas trop savoureux pour être manqué. Idem `"6"`, `"diable"`, `"satan"`. |
| 3 | **Pondérations de §4.7** | les 6 poids sont argumentés mais **non validés empiriquement** | Les figer après un test à l'aveugle sur ~20 saisies : classer à la main, comparer, ajuster. **C'est la seule vraie lacune de cette étude** — le tableau §4.7 est une prédiction, pas une mesure. |
| 4 | **Barème `notoriete` (§4.3)** | proposé par moi, arbitraire | À valider avec l'agent catalogue, qui connaît la diffusion réelle de chaque règle. |
| 5 | **Plafond de saisie** | 500 caractères (coût base58 O(n²)) | Confirmer avec le design. Au-delà de 1 000, déporter base58 dans le Worker. |
| 6 | **Web Worker dès la v1 ?** | pas nécessaire (1,2 ms de moyenne) mais évite tout à-coup à la frappe | **Reporter à la v2**, sauf si la recherche en direct s'avère saccadée. L'interface `postMessage` est à prévoir dès maintenant pour ne pas avoir à refactoriser. |
| 7 | **Forme héritée `#3+7+2`** | (a) la supporter · (b) forme canonique uniquement | **(a)** — coût faible, et le README la spécifie. Mais elle **ne doit jamais être générée** par l'application. |
| 8 | **`EPOCH_REGISTRE`** | utile seulement si l'on renonce un jour à l'append-only | Le garder dans le format (1 octet) comme assurance. Ne jamais l'incrémenter si possible. |
| 9 | **Bassin sur `[-2000,2000]`** | suffit aux valeurs observées ; les `prod` peuvent exploser | Retourner `null` au-delà dans le catalogue (§7.2-6) plutôt qu'élargir la table. |
| 10 | **Modes d'assemblage C, D, E** | esquissés en §3.4, non détaillés | À spécifier avec l'agent visuel : leur rendu animé conditionne leur intérêt. |

---

## Annexe — prototypes

Tous exécutables par `node <fichier>`, sans dépendance :

| Fichier | Objet |
|---|---|
| `proto/branching.mjs` | catalogue jouet (44 opérateurs), BFS canonicalisé, mesure du branchement et des chemins |
| `proto/segment.mjs` | combinatoire des découpes, détection de répétitions et de périodicité, stress d'entrée longue |
| `proto/coverage.mjs` | taux d'échec sur 72 saisies × 4 profondeurs, pires cas de temps |
| `proto/joker.mjs` | preuve exhaustive du terminateur français, contre-épreuve anglaise, jokers modulo 9 |
| `proto/basin-b58.mjs` | bassin d'attraction de 6, base58 vanilla (aller-retour, expansion, coût CPU) |
