# Moteur arithmétique — NumHeroLOLgeek

> Recherche et spécification du catalogue de transformations permettant de faire
> atterrir une chaîne quelconque sur `6`, puis sur `666`.
>
> Statut : recherche terminée, prototypes validés.
> Prototypes : `.planning/research/proto/{tables,validate,density,density2,dump-tables}.mjs`
> Stack cible : **vanilla JS, modules ES natifs, zéro build, zéro dépendance.**
> Toutes les tables ci-dessous sont données sous forme directement transposable
> en `export const X = { A: …, B: … }` (voir §7 « Format d'implémentation »).

---

## 0. Résumé exécutif

- Les **7 méthodes du README sont toutes recalculées et vérifiées** (§5). Une seule
  souffrait d'une formulation approximative (Méthode 7) ; une formulation rigoureuse
  et généralisable est proposée.
- La **Méthode 5** (« traits continus fusionnés ») n'était pas définie dans le README.
  J'ai trouvé une définition **exacte, mécanique et défendable** qui reproduit
  `H=3, O=4, P=4, E=4` sans aucun ajustement ad hoc : §3.3.
- Le fait « le `-` partage la touche du `6` en AZERTY » est **confirmé sur source
  primaire** (`/usr/share/X11/xkb/symbols/fr`, ligne `AE06`), avec une nuance
  importante sur la norme AFNOR 2019 : §3.2.
- **Densité** : sur un corpus de 6 000 mots français, avec le seul sous-ensemble
  « crédible » de 209 pipelines, **99,97 % des mots atteignent 6** par au moins un
  chemin, avec une **médiane de 14 pipelines gagnants par mot**. Le problème n'est
  donc **pas** de trouver un 6 : c'est de **choisir le plus convaincant**.
- En revanche, obtenir **666 par une méthode uniforme sur 3 fragments est rare**
  (0 pipeline uniforme sur `num-hero-lol`, `bill-gates-iii`, `le-monde-fr`). C'est
  **la vraie contrainte** du moteur heuristique. §6.

---

## 1. Typologie des transformations

Cinq catégories, chaînables. Le moteur de recherche (agent heuristique) compose des
pipelines en respectant le typage entrée/sortie.

| Catégorie | Signature | Rôle |
|---|---|---|
| **Filtre** | `texte → texte` | retire/garde une partie de la chaîne (voyelles, `https://`, après le `/`…) |
| **Tokeniseur** | `texte → tokens[]` | découpe (par caractère, par mot, par séparateur, par groupe répété) |
| **Mappeur** | `token → nombre` (appliqué élément par élément : `tokens[] → nombres[]`) | attribue une valeur numérique (A1Z26, 7 segments, traits…) |
| **Combinateur** | `nombres[] → nombre` | agrège (somme, soustraction en chaîne, produit, alternance, max−min) |
| **Post-traitement** | `nombre → nombre` | réduit/transforme (racine numérique, valeur absolue, retournement de glyphe) |

Un **pipeline** valide est une suite `Filtre* → Tokeniseur → Mappeur → Combinateur → Post*`,
mais le typage autorise des variantes : certains « compteurs » sont des raccourcis
`texte → nombre` (ex. « nombre de lettres »), et certains post-traitements peuvent
réinjecter (`nombre → texte` via ses chiffres, pour re-boucler).

**État circulant** — un seul objet, quatre formes possibles :

```js
// type : 'texte' | 'tokens' | 'nombres' | 'nombre'
{ type: 'texte',   valeur: 'hope-hope-hope.fr', meta: {} }
{ type: 'tokens',  valeur: ['h','o','p','e'],   meta: {} }
{ type: 'nombres', valeur: [8, 15, 16, 5],      meta: {} }
{ type: 'nombre',  valeur: 44,                  meta: {} }
```

---

## 2. Catalogue des transformations

Légende **Crédibilité** (perception par un lecteur non complice) :
`★★★★★` = tradition établie, indiscutable · `★★★★` = tradition réelle mais spécialisée ·
`★★★` = folklore internet répandu · `★★` = plausible mais visiblement arrangé ·
`★` = astuce assumée, comique.

Légende **Origine** : `TRAD` = tradition documentée · `NET` = folklore internet ·
`PROJ` = invention du projet · `README` = explicitement demandé par le README.

### 2.1 Filtres (`texte → texte`)

| id | Nom | Règle | Domaine | Exemple | Origine | Créd. |
|---|---|---|---|---|---|---|
| `f.protocole` | Retirer le protocole | Supprime `https://`, `http://`, `ftp://` | URL | `https://hope.fr` → `hope.fr` | README | ★★★★★ |
| `f.www` | Retirer `www.` | Supprime le sous-domaine `www` | URL | `www.a.fr` → `a.fr` | README | ★★★★★ |
| `f.tld` | Retirer l'extension | Supprime `.fr`, `.com`… | URL | `hope.fr` → `hope` | README | ★★★★ |
| `f.avantSlash` | Garder avant le `/` | Tronque au premier `/` | URL | `a.fr/b/c` → `a.fr` | README | ★★★★ |
| `f.apresSlash` | Garder après le `/` | Garde le chemin | URL | `a.fr/b/c` → `b/c` | README | ★★★★ |
| `f.lettres` | Ne garder que les lettres | Retire chiffres/ponctuation | tout | `h0pe-2` → `hpe` | usuel | ★★★★★ |
| `f.voyelles` | Ne garder que les voyelles | `AEIOUY` (Y optionnel, cf. §8) | tout | `hope` → `oe` | README | ★★★★ |
| `f.consonnes` | Ne garder que les consonnes | complément | tout | `hope` → `hp` | README | ★★★★ |
| `f.dedoublonne` | Supprimer les doublons | garde la 1re occurrence de chaque lettre | tout | `hello` → `helo` | README | ★★★ |
| `f.repetees` | Ne garder que les lettres répétées | garde les lettres apparaissant ≥ 2 fois | tout | `hello` → `ll` | README | ★★★ |
| `f.initiales` | Ne garder que les initiales | 1re lettre de chaque mot | phrase | `Le Chat Dort` → `LCD` | TRAD (acronymie) | ★★★★ |
| `f.motRepete` | Isoler le motif répété | détecte `X-X-X` et garde `X` | URL/slogan | `hope-hope-hope` → `hope` | README | ★★★★★ |
| `f.traduitFR` | Traduire en français | dictionnaire EN→FR embarqué | mot connu | `hope` → `espoir` | README | ★★★ |
| `f.traduitEN` | Traduire en anglais | dictionnaire FR→EN | mot connu | `espoir` → `hope` | README | ★★★ |
| `f.majuscule` | Passer en capitales | change les tables de tracé | tout | `hope` → `HOPE` | README | ★★★★★ |
| `f.minuscule` | Passer en bas de casse | idem | tout | `HOPE` → `hope` | README | ★★★★★ |
| `f.sansAccents` | Retirer les diacritiques | NFD + suppression | FR | `créé` → `cree` | usuel | ★★★★★ |
| `f.leet` | Décoder le leetspeak | `4→a 3→e 1→i 0→o 5→s 7→t` | pseudo | `h0p3` → `hope` | NET (années 1990) | ★★★ |
| `f.atbash` | Chiffrement Atbash | A↔Z, B↔Y… (miroir de l'alphabet) | tout | `hope` → `slkv` | TRAD (kabbale) | ★★★★ |
| `f.cesar` | Décalage de César | rotation de `n` lettres | tout | `hope`+1 → `ipqf` | TRAD (antique) | ★★★★ |

### 2.2 Tokeniseurs (`texte → tokens[]`)

| id | Nom | Règle | Exemple | Origine | Créd. |
|---|---|---|---|---|---|
| `t.caracteres` | Par caractère | 1 token = 1 caractère | `hope` → `h,o,p,e` | usuel | ★★★★★ |
| `t.mots` | Par mot | séparateurs `-._/ ` | `a-b.c` → `a,b,c` | usuel | ★★★★★ |
| `t.separateurs` | Les séparateurs seuls | garde `-`, `/`, `.` comme tokens | `a-b-c` → `-,-` | README | ★★★★ |
| `t.syllabes` | Par syllabe | heuristique CV/CVC (FR) | `espoir` → `es,poir` | TRAD (métrique) | ★★ |
| `t.chiffres` | Par chiffre décimal | éclate un nombre | `44` → `4,4` | TRAD (numérologie) | ★★★★★ |

### 2.3 Mappeurs (`token → nombre`)

| id | Nom | Règle | Exemple (HOPE) | Origine | Créd. |
|---|---|---|---|---|---|
| `m.a1z26` | Rang alphabétique | A=1 … Z=26 | 8,15,16,5 | TRAD (numérologie moderne, « ordinal/simple gematria ») | ★★★★★ |
| `m.z26a1` | Rang inversé | A=26 … Z=1 | 19,12,11,22 | NET (« reverse ordinal », calculateurs de gematria) | ★★★ |
| `m.pythagore` | Numérologie pythagoricienne | 1–9 cyclique : `((rang−1) mod 9)+1` | 8,6,7,5 | TRAD (numérologie occidentale) | ★★★★★ |
| `m.chaldeen` | Numérologie chaldéenne | table dédiée, **pas de 9** | 5,7,8,5 | TRAD (numérologie chaldéenne) | ★★★★ |
| `m.englishX6` | « English gematria » | rang × 6 (A=6 … Z=156) | 48,90,96,30 | NET (gematrix.org, gematrinator ; facteur 6 = clin d'œil au 666) | ★★★ |
| `m.scrabbleFR` | Points Scrabble français | table officielle FR | 4,1,3,1 | TRAD (jeu) | ★★★★★ |
| `m.scrabbleEN` | Points Scrabble anglais | table officielle EN | 4,1,3,1 | TRAD (jeu) | ★★★★★ |
| `m.t9` | Touche téléphonique T9 | ABC=2 … WXYZ=9 | 4,6,7,3 | TRAD (norme ITU E.161) | ★★★★★ |
| `m.morseSignaux` | Signaux morse | nb de points + traits | 4,3,4,1 | TRAD (morse international) | ★★★★★ |
| `m.morseTraits` | Traits morse | nb de traits seulement | 0,3,2,0 | PROJ | ★★★ |
| `m.asciiMaj` | Code ASCII capitale | `charCodeAt` de la capitale | 72,79,80,69 | TRAD (informatique) | ★★★★★ |
| `m.asciiMin` | Code ASCII bas de casse | `charCodeAt` du minuscule | 104,111,112,101 | TRAD | ★★★★★ |
| `m.seg7` | Segments allumés | nb de segments d'un afficheur 7 segments | 5,6,5,5 | README / TRAD (électronique) | ★★★★ |
| `m.seg7Fusion` | **Traits continus fusionnés** | segments colinéaires adjacents fusionnés (§3.3) | **3,4,4,4** | README | ★★★★ |
| `m.traitsMaj` | Traits de crayon, capitale | nb de levées de stylo (police bâton) | 3,1,2,4 | README | ★★★ |
| `m.traitsMin` | Traits de crayon, bas de casse | idem | 2,1,2,2 | README | ★★★ |
| `m.extremitesMaj` | Extrémités libres, capitale | nœuds de degré 1 du glyphe | 4,0,1,3 | README | ★★★ |
| `m.extremitesMin` | Extrémités libres, bas de casse | idem | 2,0,1,1 | README | ★★★ |
| `m.bouclesMaj` | Boucles fermées, capitale | trous du glyphe (genre topologique) | 0,1,1,0 | TRAD (topologie récréative) | ★★★★ |
| `m.bouclesMin` | Boucles fermées, bas de casse | `a b d e g o p q` valent 1 | 0,1,1,1 | TRAD | ★★★★ |
| `m.azertyColonne` | Colonne AZERTY | n° de colonne = chiffre de la touche au-dessus | 6,9,10,3 | README | ★★★ |
| `m.azertyRangee` | Rangée AZERTY | 1 = haut, 2 = milieu, 3 = bas | 2,1,1,1 | PROJ | ★★ |
| `m.qwertyColonne` | Colonne QWERTY | idem sur clavier US | 6,9,10,3 | PROJ | ★★★ |
| `m.hebreu` | Gématrie hébraïque | translittération puis valeur (§3.6) | — | TRAD (kabbale) | ★★★★★ |
| `m.grec` | Isopséphie grecque | translittération puis valeur (§3.6) | — | TRAD (antiquité) | ★★★★★ |
| `m.longueurNom` | Longueur du nom de la lettre | `aitch`=5, `o`=1… (dépend de la langue) | — | PROJ | ★★ |

### 2.4 Combinateurs (`nombres[] → nombre`)

| id | Nom | Règle | Exemple (8,15,16,5) | Origine | Créd. |
|---|---|---|---|---|---|
| `c.somme` | Somme | `Σ` | 44 | TRAD | ★★★★★ |
| `c.soustraction` | Soustraction en chaîne | `v₀ − v₁ − v₂ − …` | −28 | README | ★★★ |
| `c.premierMoinsReste` | Premier moins le reste | `v₀ − Σ(v₁…)` | −28 (identique ici) | README | ★★★ |
| `c.produit` | Produit | `Π` | 9600 | TRAD | ★★★★ |
| `c.alternee` | Somme alternée | `v₀ − v₁ + v₂ − v₃…` | −18 | TRAD (critères de divisibilité) | ★★★ |
| `c.maxMoinsMin` | Étendue | `max − min` | 11 | PROJ | ★★ |
| `c.moyenne` | Moyenne arrondie | `round(Σ/n)` | 11 | usuel | ★★★ |
| `c.compte` | Cardinal | nombre de tokens | 4 | usuel | ★★★★★ |
| `c.concat` | Concaténation | colle les chiffres puis relit | 815165 | NET | ★★ |

### 2.5 Post-traitements (`nombre → nombre`)

| id | Nom | Règle | Exemple | Origine | Créd. |
|---|---|---|---|---|---|
| `p.sommeChiffres` | Somme des chiffres (1 passe) | `44 → 8` | 8 | TRAD | ★★★★★ |
| `p.racineNumerique` | Réduction théosophique complète | itère jusqu'à 1 chiffre ; `1 + ((n−1) mod 9)` | `44 → 8` | TRAD (numérologie) | ★★★★★ |
| `p.racineMaitres` | Réduction avec nombres maîtres | s'arrête sur 11, 22, 33 | `29 → 11` | TRAD (numérologie moderne) | ★★★★ |
| `p.abs` | Valeur absolue | `|−28| = 28` | 28 | README | ★★★★ |
| `p.reductionSignee` | **Réduction signée** | le signe porte sur le 1er chiffre, puis somme : `−28 → (−2)+8 = 6` | **6** | PROJ (formalisation de la M7 du README) | ★★★ |
| `p.ecartChiffres` | Écart des chiffres | `|d₀ − d₁|` (2 chiffres) | 6 | PROJ | ★★ |
| `p.retournement` | Retournement de glyphe | `9 ↔ 6` (rotation 180°) | `9 → 6` | README / NET | ★★ |
| `p.miroir` | Miroir des chiffres | `28 → 82` | 82 | NET | ★★ |
| `p.complement9` | Complément à 9 | `9 − n` | `3 → 6` | TRAD (preuve par neuf) | ★★★ |
| `p.modulo` | Modulo n | `n mod 10`, `n mod 9` | — | usuel | ★★★★ |

---

## 3. Tables de données

### 3.1 Table maîtresse par lettre

Colonnes : `A1Z26`, `Z26A1` (inverse), `Pyth` (pythagoricien 1-9), `Chald` (chaldéen),
`×6` (English gematria), `ScrEN`/`ScrFR` (Scrabble), `T9`, `Morse` + `sig` (nb de signaux),
`7seg` (segments allumés), `7segF` (traits continus fusionnés, §3.3),
`trMAJ`/`trMin` (traits de crayon), `extMAJ`/`extMin` (extrémités libres),
`bcMAJ`/`bcMin` (boucles fermées), `azC`/`azR` (colonne/rangée AZERTY), `qwC`/`qwR` (QWERTY).

| L | A1Z26 | Z26A1 | Pyth | Chald | ×6 | ScrEN | ScrFR | T9 | Morse | sig | 7seg | 7segF | trMAJ | trMin | extMAJ | extMin | bcMAJ | bcMin | azC | azR | qwC | qwR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A |  1 | 26 | 1 | 1 |   6 |  1 |  1 | 2 | `.-`   | 2 | 6 | 4 | 3 | 2 | 2 | 2 | 1 | 1 |  1 | 1 |  1 | 2 |
| B |  2 | 25 | 2 | 2 |  12 |  3 |  3 | 2 | `-...` | 4 | 5 | 4 | 3 | 2 | 0 | 1 | 2 | 1 |  5 | 3 |  5 | 3 |
| C |  3 | 24 | 3 | 3 |  18 |  3 |  3 | 2 | `-.-.` | 4 | 4 | 3 | 1 | 1 | 2 | 2 | 0 | 0 |  3 | 3 |  3 | 3 |
| D |  4 | 23 | 4 | 4 |  24 |  2 |  2 | 3 | `-..`  | 3 | 5 | 4 | 2 | 2 | 0 | 1 | 1 | 1 |  3 | 2 |  3 | 2 |
| E |  5 | 22 | 5 | 5 |  30 |  1 |  1 | 3 | `.`    | 1 | 5 | 4 | 4 | 2 | 3 | 1 | 0 | 1 |  3 | 1 |  3 | 1 |
| F |  6 | 21 | 6 | 8 |  36 |  4 |  4 | 3 | `..-.` | 4 | 4 | 3 | 3 | 2 | 3 | 4 | 0 | 0 |  4 | 2 |  4 | 2 |
| G |  7 | 20 | 7 | 3 |  42 |  2 |  2 | 4 | `--.`  | 3 | 5 | 4 | 2 | 2 | 2 | 1 | 0 | 1 |  5 | 2 |  5 | 2 |
| H |  8 | 19 | 8 | 5 |  48 |  4 |  4 | 4 | `....` | 4 | 5 | **3** | 3 | 2 | 4 | 2 | 0 | 0 |  **6** | 2 |  6 | 2 |
| I |  9 | 18 | 9 | 1 |  54 |  1 |  1 | 4 | `..`   | 2 | 2 | 1 | 1 | 2 | 2 | 3 | 0 | 0 |  8 | 1 |  8 | 1 |
| J | 10 | 17 | 1 | 1 |  60 |  8 |  8 | 5 | `.---` | 4 | 3 | 2 | 1 | 2 | 2 | 2 | 0 | 0 |  7 | 2 |  7 | 2 |
| K | 11 | 16 | 2 | 2 |  66 |  5 | 10 | 5 | `-.-`  | 3 | 5 | 3 | 3 | 3 | 4 | 4 | 0 | 0 |  8 | 2 |  8 | 2 |
| L | 12 | 15 | 3 | 3 |  72 |  1 |  1 | 5 | `.-..` | 4 | 3 | 2 | 2 | 1 | 2 | 2 | 0 | 0 |  9 | 2 |  9 | 2 |
| M | 13 | 14 | 4 | 4 |  78 |  3 |  2 | **6** | `--` | 2 | 4 | 4 | 4 | 3 | 4 | 4 | 0 | 0 | 10 | 2 |  7 | 3 |
| N | 14 | 13 | 5 | 5 |  84 |  1 |  1 | **6** | `-.` | 2 | 3 | 3 | 3 | 2 | 4 | 2 | 0 | 0 |  **6** | 3 |  6 | 3 |
| O | 15 | 12 | **6** | 7 |  90 |  1 |  1 | **6** | `---` | 3 | **6** | 4 | 1 | 1 | 0 | 0 | 1 | 1 |  9 | 1 |  9 | 1 |
| P | 16 | 11 | 7 | 8 |  96 |  3 |  3 | 7 | `.--.` | 4 | 5 | 4 | 2 | 2 | 1 | 1 | 1 | 1 | 10 | 1 | 10 | 1 |
| Q | 17 | 10 | 8 | 1 | 102 | 10 |  8 | 7 | `--.-` | 4 | 5 | 4 | 2 | 2 | 1 | 1 | 1 | 1 |  1 | 2 |  1 | 1 |
| R | 18 |  9 | 9 | 2 | 108 |  1 |  1 | 7 | `.-.`  | 3 | 2 | 2 | 3 | 2 | 2 | 2 | 1 | 0 |  4 | 1 |  4 | 1 |
| S | 19 |  8 | 1 | 3 | 114 |  1 |  1 | 7 | `...`  | 3 | 5 | 5 | 1 | 1 | 2 | 2 | 0 | 0 |  2 | 2 |  2 | 2 |
| T | 20 |  7 | 2 | 4 | 120 |  1 |  1 | 8 | `-`    | 1 | 4 | 3 | 2 | 2 | 3 | 3 | 0 | 0 |  5 | 1 |  5 | 1 |
| U | 21 |  **6** | 3 | **6** | 126 |  1 |  1 | 8 | `..-` | 3 | 5 | 3 | 1 | 2 | 2 | 2 | 0 | 0 |  7 | 1 |  7 | 1 |
| V | 22 |  5 | 4 | **6** | 132 |  4 |  4 | 8 | `...-` | 4 | 5 | 3 | 2 | 2 | 2 | 2 | 0 | 0 |  4 | 3 |  4 | 3 |
| W | 23 |  4 | 5 | **6** | 138 |  4 | 10 | 9 | `.--`  | 3 | 4 | 3 | 4 | 4 | 2 | 2 | 0 | 0 |  1 | 3 |  2 | 1 |
| X | 24 |  3 | **6** | 5 | 144 |  8 | 10 | 9 | `-..-` | 4 | 5 | 3 | 2 | 2 | 4 | 4 | 0 | 0 |  2 | 3 |  2 | 3 |
| Y | 25 |  2 | 7 | 1 | 150 |  4 | 10 | 9 | `-.--` | 4 | 5 | 4 | 3 | 2 | 3 | 2 | 0 | 0 |  **6** | 1 |  6 | 1 |
| Z | 26 |  1 | 8 | 7 | 156 | 10 | 10 | 9 | `--..` | 4 | 5 | 5 | 3 | 3 | 2 | 2 | 0 | 0 |  2 | 1 |  1 | 3 |

**Sommes de contrôle** (utiles pour valider une transposition JS) :

```
A1Z26 = 351   Pyth = 126   Chald = 103   ScrEN = 87   ScrFR = 103
7seg  = 115   7segFusion = 87
trMAJ = 61    trMin = 53   extMAJ = 58   extMin = 54  bcMAJ = 8   bcMin = 8
```

**Les lettres qui valent 6** (précieux pour l'heuristique — ce sont les « lettres magiques ») :

| Système | Lettres valant 6 |
|---|---|
| A1Z26 | **F** |
| Z26A1 (inverse) | **U** |
| Pythagoricien | **F, O, X** |
| Chaldéen | **U, V, W** |
| T9 | **M, N, O** |
| 7 segments (allumés) | **A, O** |
| Colonne AZERTY = 6 | **H, N, Y** |
| Colonne QWERTY = 6 | **H, N, Y** |
| 7segFusion / traits / extrémités / morse / Scrabble | *aucune* (max 5) |

> Remarque : `FOX` en pythagoricien, et `WWW` en chaldéen = **6-6-6**.
> C'est le pendant « occidental » du classique `waw-waw-waw` hébreu (§3.6) —
> à exploiter comme méthode vedette pour toute URL commençant par `www`.

### 3.2 Claviers — source primaire vérifiée

**Source** : `/usr/share/X11/xkb/symbols/fr`, section `xkb_symbols "basic"` (layout `fr`,
AZERTY français PC standard). Extrait littéral de la rangée des chiffres :

```
key <AE01> { [ ampersand,  1,  onesuperior,  exclamdown   ] };   &  1
key <AE02> { [ eacute,     2,  asciitilde,   oneeighth    ] };   é  2
key <AE03> { [ quotedbl,   3,  numbersign,   sterling     ] };   "  3
key <AE04> { [ apostrophe, 4,  braceleft,    dollar       ] };   '  4
key <AE05> { [ parenleft,  5,  bracketleft,  threeeighths ] };   (  5
key <AE06> { [ minus,      6,  bar,          fiveeighths  ] };   -  6   <<< CONFIRMÉ
key <AE07> { [ egrave,     7,  grave,        seveneighths ] };   è  7
key <AE08> { [ underscore, 8,  backslash,    trademark    ] };   _  8
key <AE09> { [ ccedilla,   9,  asciicircum,  plusminus    ] };   ç  9
key <AE10> { [ agrave,     0,  at,           degree       ] };   à  0
```

✅ **Le `-` (tiret) et le `6` partagent bien la touche `AE06` en AZERTY français.**
L'expression populaire française « **tiret du 6** » est donc littéralement exacte,
et c'est un point d'appui rhétorique de première qualité pour le site.

⚠️ **Nuance à connaître (honnêteté intellectuelle)** : la norme **AFNOR NF Z71-300 (2019)**
(layout `fr(afnor)`) **déplace le tiret**. Sur cette disposition, `AE06` porte `)` / `6` :

```
key <AE06> { [ parenright,  6,  bracketright,  dead_doublegrave ] };   )  6
```

Le « tiret du 6 » ne vaut donc **que pour l'AZERTY historique/de fait** — qui reste
l'immense majorité du parc. À mentionner en note de bas de page plutôt qu'à cacher :
ça renforce la crédibilité.

⚠️ **Sur QWERTY US**, la touche `6` porte `^` (accent circonflexe), et le `-` est sur
`AE11` (avec `_`). Le « tiret du 6 » est donc **une spécificité française**.

**Disposition complète des lettres** (dérivée des mêmes fichiers) :

```
AZERTY  rangée 1 (AD) : A Z E R T Y U I O P
        rangée 2 (AC) : Q S D F G H J K L M
        rangée 3 (AB) : W X C V B N
QWERTY  rangée 1 (AD) : Q W E R T Y U I O P
        rangée 2 (AC) : A S D F G H J K L
        rangée 3 (AB) : Z X C V B N M
```

La **colonne** d'une lettre (1-indexée) donne le chiffre de la touche numérique
située dans la même colonne. Colonne 6 → touche `-`/`6` : **Y, H, N**
(identiques sur les deux claviers, les dispositions ne différant que sur A/Q/Z/W/M).

### 3.3 Sept segments et « traits continus fusionnés »

**Nommage standard des segments** (norme de fait, cf. afficheurs 7 segments) :

```
     aaa
    f   b
    f   b
     ggg
    e   c
    e   c
     ddd
```

`a` = haut · `b` = haut-droit · `c` = bas-droit · `d` = bas · `e` = bas-gauche ·
`f` = haut-gauche · `g` = milieu.

**Représentation retenue par lettre** (police 7 segments usuelle ; certaines lettres
n'existent qu'en bas de casse sur ce type d'afficheur — indiqué en note) :

```
A: abcefg (6)   B: cdefg  (5)*  C: adef   (4)   D: bcdeg (5)*  E: adefg (5)
F: aefg   (4)   G: acdef  (5)   H: bcefg  (5)   I: bc    (2)   J: bcd   (3)
K: bcefg  (5)†  L: def    (3)   M: aceg   (4)†  N: ceg   (3)*  O: abcdef(6)
P: abefg  (5)   Q: abcfg  (5)*  R: eg     (2)*  S: acdfg (5)   T: defg  (4)*
U: bcdef  (5)   V: bcdef  (5)†  W: bdef   (4)†  X: bcefg (5)†  Y: bcdfg (5)*
Z: abdeg  (5)
```
`*` = forme bas de casse obligatoire (b, d, n, q, r, t, y : la capitale serait
indistinguable d'un chiffre ou impossible).
`†` = **non représentable** en 7 segments (K, M, V, W, X) → **approximation assumée du projet**
(K et X repris de H, V repris de U, M et W inventés). À signaler dans l'UI comme
« approximation d'affichage » : c'est plus honnête et ça n'enlève rien au gag.

**Chiffres** (`segments` / `traits fusionnés`) :

```
0: abcdef (6/4)   1: bc     (2/1)   2: abged (5/5)   3: abgcd (5/4)   4: fgbc (4/3)
5: afgcd  (5/5)   6: afgedc (6/5)   7: abc    (3/2)   8: abcdefg(7/5)  9: abcdfg(6/5)
```

#### La définition de la Méthode 5 — trouvée et vérifiée

Le README affirme `H=3, O=4, P=4, E=4` sans définir la règle. **Voici la règle qui
reproduit exactement ces valeurs, sans exception ni ajustement** :

> **Règle des traits continus fusionnés** : partir de la représentation 7 segments,
> puis **fusionner les segments colinéaires et adjacents** en un seul trait continu.
> Seules deux paires sont colinéaires et adjacentes : `b`+`c` (verticale droite) et
> `e`+`f` (verticale gauche). Les segments `a`, `d`, `g` sont trois horizontales
> disjointes, jamais fusionnables. On compte les traits résultants.

Formule (5 lignes de JS, aucune table supplémentaire nécessaire) :

```js
export const seg7Fusion = (seg) =>
  (seg.includes('a') ? 1 : 0) + (seg.includes('d') ? 1 : 0) + (seg.includes('g') ? 1 : 0)
  + (seg.includes('b') || seg.includes('c') ? 1 : 0)   // verticale droite fusionnée
  + (seg.includes('e') || seg.includes('f') ? 1 : 0);  // verticale gauche fusionnée
```

Vérification sur HOPE :

| L | segments | fusion | détail |
|---|---|---|---|
| H | `bcefg` | **3** | verticale droite (`b`+`c`), verticale gauche (`e`+`f`), barre `g` |
| O | `abcdef` | **4** | `a`, `d`, verticale droite (`b`+`c`), verticale gauche (`e`+`f`) |
| P | `abefg` | **4** | `a`, `g`, `b` seul, verticale gauche (`e`+`f`) |
| E | `adefg` | **4** | `a`, `d`, `g`, verticale gauche (`e`+`f`) — pas de segment à droite |

Total `3 + 4 + 4 + 4 = 15 → 1 + 5 = 6` ✅ — **exactement le calcul du README.**
Le prototype `validate.mjs` le confirme mécaniquement (§5). La borne supérieure de
cette métrique est 5 (`a`, `d`, `g`, `bc`, `ef`), ce qui explique qu'aucune lettre
ne vaille 6 dans ce système.

### 3.4 Tracé des lettres — police de référence

⚠️ **Le comptage des traits, extrémités et boucles dépend entièrement de la police.**
Il faut donc figer une référence et l'assumer publiquement.

> **Police de référence du projet** : *capitale bâton géométrique sans empattement*
> (type **Futura / Century Gothic / Jost**), avec les conventions explicites suivantes :
> - `A` pointu (deux diagonales + barre), pas de sommet plat ;
> - `I` **sans empattement** (simple verticale) → 1 trait, 2 extrémités ;
> - `a` et `g` **à un seul étage** (cercle + fût), comme en écriture manuscrite ;
> - `Q` à queue **tangente** au cercle (ne le traverse pas) → 1 extrémité libre ;
> - `W` tracé en **4 traits** (zigzag), pas comme deux `V` superposés ;
> - `J` sans barre supérieure ;
> - les points du `i` et du `j` **comptent** comme un trait et une extrémité.
>
> Le moteur visuel devra dessiner les glyphes **avec cette police (ou des tracés SVG
> maison conformes)**, sinon la démonstration se contredit visuellement. C'est le
> point d'articulation le plus critique avec l'agent moteur-visuel.

**Traits de crayon** (levées de stylo) :

```
MAJUSCULES  A3 B3 C1 D2 E4 F3 G2 H3 I1 J1 K3 L2 M4
            N3 O1 P2 Q2 R3 S1 T2 U1 V2 W4 X2 Y3 Z3      (Σ = 61)
minuscules  a2 b2 c1 d2 e2 f2 g2 h2 i2 j2 k3 l1 m3
            n2 o1 p2 q2 r2 s1 t2 u2 v2 w4 x2 y2 z3      (Σ = 53)
```

**Extrémités libres** (nœuds de degré 1 dans le graphe du glyphe) :

```
MAJUSCULES  A2 B0 C2 D0 E3 F3 G2 H4 I2 J2 K4 L2 M4
            N4 O0 P1 Q1 R2 S2 T3 U2 V2 W2 X4 Y3 Z2      (Σ = 58)
minuscules  a2 b1 c2 d1 e1 f4 g1 h2 i3 j2 k4 l2 m4
            n2 o0 p1 q1 r2 s2 t3 u2 v2 w2 x4 y2 z2      (Σ = 54)
```

Notes de comptage : `E` = fût + 3 barres → les 3 bouts droits sont libres (3, pas 4,
car les extrémités du fût sont des jonctions). `W` = zigzag → seulement les 2 bouts
externes. `i` minuscule = fût (2 bouts) + point (1 composante isolée comptée 1) = 3.
`f` minuscule = crochet (1) + bas du fût (1) + 2 bouts de barre = 4.

**Boucles fermées** (trous du glyphe / genre topologique) :

```
MAJUSCULES  A1 B2 D1 O1 P1 Q1 R1  — toutes les autres 0          (Σ = 8)
minuscules  a1 b1 d1 e1 g1 o1 p1 q1 — toutes les autres 0        (Σ = 8)
```

La liste minuscule `a b d e g o p q` correspond **exactement** à celle citée dans le
brief. ⚠️ Avec un `a` et un `g` **à deux étages** (Helvetica, Times), `g` aurait **2**
boucles et la somme passerait à 9 — d'où l'importance de figer la police.

### 3.5 Tables numériques secondaires

```
Chaldéen (pas de 9)
A1 B2 C3 D4 E5 F8 G3 H5 I1 J1 K2 L3 M4 N5 O7 P8 Q1 R2 S3 T4 U6 V6 W6 X5 Y1 Z7

Scrabble FR
A1 B3 C3 D2 E1 F4 G2 H4 I1 J8 K10 L1 M2 N1 O1 P3 Q8 R1 S1 T1 U1 V4 W10 X10 Y10 Z10

Scrabble EN
A1 B3 C3 D2 E1 F4 G2 H4 I1 J8 K5 L1 M3 N1 O1 P3 Q10 R1 S1 T1 U1 V4 W4 X8 Y4 Z10

T9 (ITU E.161)
ABC=2  DEF=3  GHI=4  JKL=5  MNO=6  PQRS=7  TUV=8  WXYZ=9

Morse international
A .-    B -...  C -.-.  D -..   E .     F ..-.  G --.   H ....  I ..    J .---
K -.-   L .-..  M --    N -.    O ---   P .--.  Q --.-  R .-.   S ...   T -
U ..-   V ...-  W .--   X -..-  Y -.--  Z --..
```

### 3.6 Gématrie hébraïque et isopséphie grecque

> ⚠️ **Lacune assumée** : la vérification par sources web externes de cette section
> a été interrompue. Les valeurs ci-dessous proviennent de ma connaissance des
> traditions et sont conformes aux tables usuelles, **mais n'ont pas été recoupées
> sur URL**. À faire vérifier avant mise en production (§9).

**Gématrie hébraïque — mispar hechrachi (valeurs standard)**

```
א 1   ב 2   ג 3   ד 4   ה 5   ו 6   ז 7   ח 8   ט 9
י 10  כ 20  ל 30  מ 40  נ 50  ס 60  ע 70  פ 80  צ 90
ק 100 ר 200 ש 300 ת 400
finales (mispar gadol) : ך 500  ם 600  ן 700  ף 800  ץ 900
```

Variantes traditionnelles : **mispar katan** (réduction à 1 chiffre), **mispar siduri**
(ordinal 1–22), **mispar kolel** (+1 pour le mot lui-même), **atbash** (miroir alphabétique).

🔑 **Le point d'or pour le projet** : la lettre **vav (ו) vaut 6**, et `www` se
translittère `waw-waw-waw` = **666**. C'est l'argument 666 le plus répandu sur le web
concernant les URL, et il est **arithmétiquement exact dans le système hébreu**.
Toute URL contenant `www` doit déclencher cette méthode en priorité : c'est la plus
spectaculaire et la mieux « sourcée » du catalogue.

**Isopséphie grecque**

```
α 1  β 2  γ 3  δ 4  ε 5  ϛ 6(digamma/stigma)  ζ 7  η 8  θ 9
ι 10 κ 20 λ 30 μ 40 ν 50 ξ 60 ο 70 π 80 ϙ 90(koppa)
ρ 100 σ 200 τ 300 υ 400 φ 500 χ 600 ψ 700 ω 800 ϡ 900(sampi)
```

Note : le **digamma/stigma (ϛ) vaut 6** et n'est plus une lettre vivante — d'où son
statut de « chiffre caché », très exploitable narrativement.
Le 666 d'Apocalypse 13:18 est classiquement rattaché à *Neron Caesar* transcrit en
hébreu (נרון קסר = 50+200+6+50+100+60+200 = 666) — **calcul à revérifier sur source**.

---

## 4. Modèle de données et API

### 4.1 L'état

```js
/**
 * @typedef {'texte'|'tokens'|'nombres'|'nombre'} TypeEtat
 * @typedef {Object} Etat
 * @property {TypeEtat} type
 * @property {string|string[]|number[]|number} valeur
 * @property {Object} meta   contexte accumulé (casse, langue, police, origine des tokens…)
 */
```

`meta` transporte notamment : `casse` (`'maj'|'min'|'origine'`), `langue` (`'fr'|'en'`),
`police` (`'batonGeometrique'`), et `traces` (index d'origine de chaque token dans la
chaîne saisie — **indispensable au moteur visuel** pour animer les correspondances).

### 4.2 La transformation — signature unique

Toutes les transformations, quelle que soit leur catégorie, exposent **le même objet** :

```js
/**
 * @typedef {Object} Transformation
 * @property {string}   id            identifiant stable, ex. 'm.a1z26'
 * @property {string}   nom           libellé FR affiché, ex. 'Rang alphabétique'
 * @property {string}   regle         phrase explicative FR, affichée dans l'animation
 * @property {'filtre'|'tokeniseur'|'mappeur'|'combinateur'|'post'} categorie
 * @property {TypeEtat} entree        type d'Etat accepté
 * @property {TypeEtat} sortie        type d'Etat produit
 * @property {number}   credibilite   1..5  (cf. légende du catalogue)
 * @property {number}   cout          coût narratif, pour le tri heuristique (1 = évident)
 * @property {string[]} domaine       ['tout'] | ['url'] | ['mot'] | ['nombre'] …
 * @property {(etat: Etat) => Etat|null}          applique   null si non applicable
 * @property {(avant: Etat, apres: Etat) => Anim} anime      description déclarative
 */
```

**Contrat de `applique`** :
- **pure**, sans effet de bord, déterministe ;
- retourne `null` (jamais d'exception) si la transformation ne s'applique pas à cet
  état — c'est le signal d'élagage pour le moteur de recherche ;
- ne mute jamais l'`Etat` reçu ; renvoie un nouvel objet.

**Contrat de `anime`** : ne calcule rien, ne dessine rien — décrit seulement *quoi*
montrer. Voir §4.3.

### 4.3 Contrat d'animation — **proposition à réconcilier**

> 🔴 **À RÉCONCILIER avec l'agent moteur-visuel.** C'est *lui* qui fixe le format
> définitif. Ce qui suit est ma proposition, conçue pour que le moteur arithmétique
> n'ait rien à savoir du SVG.

```js
/**
 * @typedef {Object} Anim
 * @property {'mapper'|'filtrer'|'fusionner'|'annoter'|'remplacer'|'reordonner'|'calculer'} geste
 * @property {string} legende          phrase FR affichée pendant l'étape
 * @property {Lien[]} liens            correspondances avant → après
 * @property {number} dureeMs          durée suggérée (le lecteur peut l'ignorer)
 * @property {Object} [decor]          données spécifiques au geste
 */
/**
 * @typedef {Object} Lien
 * @property {number[]} de     index des éléments de l'état AVANT
 * @property {number[]} vers   index des éléments de l'état APRÈS ([] = disparaît)
 * @property {'conserve'|'transforme'|'supprime'|'fusionne'|'apparait'} role
 */
```

`decor` par geste, exemples :
- mappeur 7 segments → `{ glyphes: { H: 'bcefg', O: 'abcdef' } }` (le visuel sait
  allumer les segments nommés) ;
- mappeur clavier → `{ clavier: 'azerty', touches: { H: [2, 6] } }` (rangée, colonne) ;
- mappeur tracé → `{ police: 'batonGeometrique', metrique: 'traits'|'extremites'|'boucles' }` ;
- post `retournement` → `{ rotation: 180 }` ;
- combinateur → `{ operateur: '+'|'−'|'×', accumulateur: [8, 23, 39, 44] }` (états
  intermédiaires, pour animer l'addition pas à pas).

**Principe directeur** : le moteur arithmétique ne produit **que des données**
(index, noms de segments, opérateurs). Aucune coordonnée, aucune couleur, aucun SVG.

### 4.4 Format d'un chemin (sortie du moteur, entrée du moteur visuel)

```js
{
  entree: 'hope-hope-hope.fr',
  cible: 666,
  etapes: [
    { transformation: 'f.protocole', avant: {…}, apres: {…}, anim: {…} },
    { transformation: 't.caracteres', avant: {…}, apres: {…}, anim: {…} },
    …
  ],
  resultat: 666,
  credibilite: 4.2,   // moyenne pondérée des étapes
  cout: 7             // longueur narrative
}
```

---

## 5. Validation des 7 méthodes du README

Recalculées mécaniquement par `proto/validate.mjs`. Sortie réelle :

```
M1  hope -> espoir = 6 lettres                          OK
M2  4 lettres + 2 voyelles = 6                          OK
M3  4 lettres + 2 consonnes = 6                         OK
M4  8+15+16+5 = 44 -> 8 ; 3 mots : 8*3 = 24 -> 6        OK
M5  H=3 O=4 P=4 E=4 -> 15 -> 6                          OK
M6a AZERTY touche AE06 = '-' / shift '6'                OK
M6b 8+6+8+6+8 = 36 -> 9 -> retourné -> 6                OK
M7  8-15-16-5 = -28
    réduction signée   : 6                              OK
    écart des chiffres : 6                              OK
    digitalRoot(|-28|) : 1   <- NE donne PAS 6
```

**Les 7 méthodes tombent juste.** Détail des remarques :

- **M1** — `espoir` = 6 lettres ✅. La méthode combine en fait deux idées (traduction +
  détection du motif répété ×3) ; à découper en deux transformations distinctes
  (`f.traduitFR` puis `f.motRepete`) pour que l'animation reste lisible.
- **M2 / M3** — exactes, mais **redondantes par construction** : pour tout mot,
  (lettres + voyelles) et (lettres + consonnes) donnent 6 en même temps seulement si
  voyelles = consonnes. Ici `hope` a 2+2. Les présenter côte à côte est un bon gag,
  mais l'heuristique doit savoir qu'elles sont **corrélées** et ne pas les compter
  comme deux « preuves indépendantes ».
- **M4** — exacte. Note : le README obtient 6 sur le triplet global, puis récupère les
  deux autres 6 via les tirets. C'est un **assemblage hétérogène** (1 six par calcul
  + 2 six par clavier), pas un vrai « 666 uniforme ». À étiqueter comme tel.
- **M5** — ✅ **exacte avec la définition du §3.3**, qui était manquante au README.
  C'est la contribution la plus importante de cette recherche : la méthode est
  désormais mécanisable sans arbitraire.
- **M6** — ✅ les deux volets. Le « retournement du 9 en 6 » est l'étape la plus
  faible en crédibilité (★★) mais visuellement la plus efficace (une rotation de
  180° animée est irrésistible). À garder, en dernier recours d'un chemin.
- **M7** — 🔴 **formulation du README à corriger.** Le texte dit :
  *« −28 → −2 et 8, donc 8 − 2 → 6 »*. C'est ambigu : on ne sait pas si la règle est
  « prendre l'écart des chiffres », « distribuer le signe », ou « réordonner ».
  De plus, la réduction standard donnerait `|−28| → 2+8 = 10 → 1`, **pas 6**.

  **Formulation rigoureuse proposée** :

  > **Réduction signée** — le signe d'un nombre négatif s'applique à son **premier
  > chiffre seulement** ; on somme ensuite les chiffres signés.
  > `−28 → (−2) + 8 = 6`

  Avantages : (a) elle donne bien 6 ; (b) elle **généralise** à n'importe quel nombre
  de chiffres, contrairement à « l'écart des chiffres » qui n'a de sens qu'à 2 chiffres ;
  (c) sur un nombre positif elle **dégénère exactement en la réduction classique**,
  donc elle ne casse rien ; (d) elle s'anime très bien (le `−` glisse sur le `2`).
  C'est cette règle que j'implémente (`p.reductionSignee`).

**Incohérences relevées, en toute franchise** :
1. La définition de la Méthode 5 était **absente** du README (comblée, §3.3).
2. La Méthode 7 était **mal formulée** (corrigée ci-dessus).
3. Les Méthodes 2 et 3 sont **statistiquement corrélées**, pas indépendantes.
4. Les Méthodes 4 et 6 produisent des **666 hétérogènes** (mélange de deux systèmes),
   alors que le README pose « idéalement selon la même méthode » comme objectif.
   Il faut donc **deux niveaux de qualité** dans le classement : *666 uniforme* > *666 composite*.
5. Le README écrit « le `-` sur la touche du 6 » sans réserve ; la nuance AFNOR (§3.2)
   mérite une note de bas de page.

---

## 6. Densité — combien de chemins mènent à 6 ?

Mesuré sur `/usr/share/dict/french` et `/usr/share/dict/american-english`
(échantillonnage régulier pour ne pas biaiser vers le début de l'alphabet).

### 6.1 Catalogue large (3 335 pipelines : 6 filtres × 22 mappeurs × 5 combinateurs × 5 posts)

| Corpus | P(résultat = 6) moyen | Couverture (≥1 chemin) | Chemins gagnants / mot |
|---|---|---|---|
| Français (4 000 mots) | **4,89 %** | **100,00 %** | méd. 154 · p10 119 · p90 196 · max 292 |
| Anglais (4 000 mots) | **5,04 %** | **100,00 %** | méd. 156 · p10 115 · p90 203 · max 331 |

Pipelines à rendement nul : ~1 100 / 3 335 (33 %) — à élaguer statiquement.

### 6.2 Sous-ensemble « crédible » (209 pipelines après déduplication sémantique)

Filtres sobres uniquement (aucun / voyelles / consonnes), mappeurs traditionnels,
combinateurs somme + soustraction, réductions classiques. Corpus FR, 6 000 mots.

| Indicateur | Valeur |
|---|---|
| P(résultat = 6) moyen | **6,81 %** |
| Couverture (≥ 1 chemin) | **99,97 %** |
| Chemins gagnants / mot | min 0 · p10 **8** · **médiane 14** · p90 21 · max 36 |

Couverture stable de 100 % pour toutes les longueurs de mot de 4 à 12 lettres
(moyenne 13–18 chemins gagnants), **sans dépendance à la longueur**.

**Pipelines les plus productifs** (sous-ensemble crédible, FR) :

```
16,3 %  nb de lettres distinctes → racine numérique
14,2 %  voyelles | traits de crayon (min) | somme | racine
13,4 %  voyelles | traits de crayon (min) | soustraction | racine
13,3 %  consonnes | traits de crayon (min) | soustraction | racine
12,9 %  voyelles | A1Z26 | somme | racine
12,9 %  voyelles | pythagoricien | somme | réduction signée
12,3 %  consonnes | Scrabble FR | somme | racine
11,9 %  aucun | chaldéen | soustraction | racine
```

Un pipeline « racine numérique » plafonne mécaniquement autour de **1/9 ≈ 11 %**
(le 6 est un résultat sur neuf) ; les valeurs supérieures signalent un biais de
distribution favorable — donc les meilleurs candidats par défaut.

### 6.3 Le vrai goulot : le 666 uniforme

Test : combien de pipelines **identiques** donnent 6 sur **les 3 fragments** ?

```
hope-hope-hope    : 13 pipelines uniformes   (trivial, mot identique ×3)
www-google-com    :  3 pipelines uniformes   (ex. consonnes | extrémités MAJ | somme | racine)
num-hero-lol      :  0
bill-gates-iii    :  0
le-monde-fr       :  0
```

🔑 **Conclusion opérationnelle pour l'agent heuristique** :
- Trouver **un 6** est un problème résolu d'avance (≈100 % de réussite, ~14 chemins
  crédibles). L'enjeu est **la sélection**, pas la recherche : trier par crédibilité
  et par brièveté narrative.
- Trouver **666 par une méthode uniforme** échoue le plus souvent. Il faut donc :
  1. tenter d'abord le 666 uniforme (le plus convaincant) ;
  2. sinon, accepter un 666 **composite** (méthodes différentes par fragment), en
     l'assumant dans le discours ;
  3. exploiter en priorité les **raccourcis vedettes** : `www` → 666 par la gématrie
     hébraïque (vav ×3), motif `X-X-X` répété, `-` = touche du 6 en AZERTY.
- Prévoir un **cache par fragment** : les fragments distincts sont peu nombreux dans
  une URL, la mémoïsation rend le coût négligeable.

---

## 7. Format d'implémentation (vanilla, modules ES, zéro build)

Un module par famille de tables, exportant des **objets littéraux gelés** — pas de
`Map` (l'accès par clé sur objet est plus simple à sérialiser et suffit ici) :

```
src/moteur/tables/
  alphabet.js     → A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6
  jeux.js         → SCRABBLE_FR, SCRABBLE_EN, T9, MORSE
  glyphes.js      → SEG7, TRAITS_MAJ, TRAITS_MIN, EXTREMITES_MAJ,
                    EXTREMITES_MIN, BOUCLES_MAJ, BOUCLES_MIN
  claviers.js     → AZERTY, QWERTY (rangées + accès colonne/rangée)
  ecritures.js    → HEBREU, GREC, TRANSLITTERATION
src/moteur/
  etat.js         → constructeurs et garde-fous de type
  transformations/ → un fichier par catégorie, chacun exportant un tableau de Transformation
  catalogue.js    → agrège et gèle l'ensemble
```

Convention : clés en **capitales** pour les tables par lettre ; les mappeurs
normalisent la casse en entrée. Tables gelées via `Object.freeze` pour éviter toute
mutation accidentelle entre deux explorations.

```js
// exemple — src/moteur/tables/alphabet.js
export const A1Z26 = Object.freeze({ A: 1, B: 2, C: 3, /* … */ Z: 26 });
export const rang = (c) => A1Z26[c.toUpperCase()] ?? null;
```

Les tables purement calculables (`A1Z26`, `Z26A1`, `PYTHAGORE`, `ENGLISH_X6`) peuvent
être **générées** à l'import plutôt qu'écrites en dur — moins de risque de faute de
frappe, et les sommes de contrôle du §3.1 servent de test :

```js
export const A1Z26 = Object.freeze(Object.fromEntries(
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => [c, i + 1])
));
```

Les tables **non calculables** (Chaldéen, Scrabble, 7 segments, tracé) doivent être
écrites en dur et couvertes par un test de somme de contrôle.

---

## 8. Contrat d'interface

**Ce que le moteur arithmétique fournit** (aux agents heuristique et visuel) :

1. `catalogue` — tableau gelé de `Transformation`, chacune conforme à la signature §4.2.
2. `appliquer(transformation, etat) → Etat|null` — pur, déterministe, sans exception.
3. `Etat` — structure unique à 4 formes (§4.1), avec `meta.traces` conservant l'index
   d'origine de chaque élément dans la chaîne saisie.
4. Toutes les **tables** exportées individuellement (§7), pour que le moteur visuel
   puisse dessiner ce que le moteur arithmétique a calculé (segments, touches, glyphes).
5. Pour chaque transformation, une `Anim` déclarative (§4.3) — **données seulement,
   aucun rendu**.

**Ce que le moteur arithmétique attend** :

- de l'**agent heuristique** : qu'il compose les pipelines en respectant le typage
  `entree`/`sortie`, qu'il traite `null` comme un élagage, et qu'il utilise
  `credibilite` et `cout` pour trier ;
- de l'**agent moteur-visuel** : qu'il **fixe le format définitif de `Anim`**
  (§4.3 est une proposition), et qu'il dessine les glyphes avec **la police de
  référence du §3.4** — sinon les comptages de traits et de boucles seront
  contredits par ce que le spectateur voit à l'écran ;
- du **design** : que la nuance AZERTY/AFNOR (§3.2) et les approximations 7 segments
  (K, M, V, W, X, §3.3) trouvent une place assumée dans l'UI — l'honnêteté sur les
  détails renforce l'effet comique du tout.

**Invariants garantis** : pureté, déterminisme, absence de mutation, absence
d'exception, et sérialisabilité JSON complète de l'`Etat` et de l'`Anim` (nécessaire
pour l'encodage du chemin dans l'URL).

---

## 9. Décisions à trancher

1. **🔴 Format de `Anim` (bloquant)** — §4.3 est ma proposition ; l'agent moteur-visuel
   doit trancher. Point de friction principal : est-ce que l'animation reçoit des
   index (ma proposition) ou des identifiants d'éléments ?
2. **🔴 Police de référence (bloquant)** — le §3.4 fixe *bâton géométrique, `a` et `g`
   à un étage, `I` sans empattement, `Q` à queue tangente*. **Le moteur visuel doit
   dessiner conformément**, sinon les Méthodes « traits / extrémités / boucles » sont
   visuellement fausses. À valider conjointement.
3. **Le `Y` est-il une voyelle ?** Le README compte `O, E` dans `hope` (2 voyelles) —
   le cas ne tranche pas. Je propose **deux transformations distinctes**
   (`f.voyelles` sans Y, `f.voyellesAvecY`) : ça double les chances et c'est
   défendable des deux côtés.
4. **Nombres maîtres (11, 22, 33)** — les activer ou non par défaut ? Ils *bloquent*
   la réduction et donc réduisent les chances d'atteindre 6. Je propose de les
   proposer comme post-traitement **optionnel**, désactivé par défaut.
5. **Approximations 7 segments** pour K, M, V, W, X (§3.3) — les assumer dans l'UI,
   ou exclure ces lettres du domaine d'application de `m.seg7` ? Je penche pour
   **assumer avec mention**, plus drôle et plus honnête.
6. **Nuance AFNOR** (§3.2) — la mentionner en note de bas de page (mon avis) ou
   l'ignorer ?
7. **Dictionnaire de traduction FR↔EN** — quelle taille embarquer sans dépendance ni
   build ? Je propose une liste courte (200–500 mots très courants) chargée en JSON
   à la demande, plutôt qu'un dictionnaire complet.
8. **🟡 Lacune de sourçage (§3.6)** — les tables hébraïque et grecque, ainsi que le
   calcul *Neron Caesar* = 666, **n'ont pas pu être recoupés sur sources web**
   (recherche interrompue). Les valeurs sont conformes aux tables usuelles mais
   doivent être **vérifiées avant publication**, d'autant que ce sont les méthodes
   les plus « sourçables » du catalogue et donc les plus exposées à la critique.
   Idem pour l'attribution précise de l'« English gematria ×6 » (Agrippa ? Crowley ?
   calculateurs en ligne récents ?).
9. **Seuil de crédibilité minimal** — faut-il exclure du catalogue les
   transformations à ★ (retournement du 9, concaténation, miroir) ou les garder en
   dernier recours ? Je propose de **les garder** mais de les pénaliser fortement
   dans le tri, pour ne les voir apparaître que si rien de mieux n'existe.
10. **Deux niveaux de qualité pour 666** — formaliser la distinction *666 uniforme*
    (même méthode ×3, rare mais spectaculaire) vs *666 composite* (méthodes
    différentes, presque toujours disponible). L'UI doit-elle les afficher dans deux
    listes séparées ? Le README suggère que oui (« idéalement selon la même méthode »).
