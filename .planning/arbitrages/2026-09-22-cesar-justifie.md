# Le César qui trouve son décalage — note de conception

> « Je voudrais des variantes mieux notées des césar\* qui commencent par trouver
> le nombre utilisé pour faire le décalage dans la saisie d'origine avant de
> l'appliquer. Par exemple, pour ces variantes mieux notées, pour césar 22, il
> faudrait trouver 22 dans "Louis Fouché" sans consommer les éléments
> correspondants. Ici je verrais bien : combien de caractères communs à chaque
> mot ? 2 côté Louis (o, u) et 2 côté Fouché (o, u), on a notre 22, qui peut
> venir se placer à côté de césar juste avant que le décalage d'alphabet ait
> lieu. » (l'auteur, 22 septembre 2026)

---

## 1. Le grief, et ce qu'il vise exactement

Un `fr22` sorti de nulle part sent l'arbitraire, et le dépôt le savait déjà :

> « Choisir "avance de sept rangs" plutôt que de six n'a aucune justification
> hors du résultat qu'on en attend. » (`filtres.js`, au-dessus de `cesarDe`)

C'est pour cela que les vingt-trois décalages sans nom portent `notoriete: 0.10`
et `adHoc: 0.45`, quand ROT13 et le César historique portent `0.25` / `0.25`. Le
barème d'élégance a même dû rattraper « un alphabet gratuit — vingt-cinq
réglettes à essayer sans frais » (`elegance.js › porteUneReglette`).

La demande ne conteste pas cette peine : **elle ouvre une porte de sortie**. Un
décalage cesse d'être arbitraire dès qu'on peut le LIRE dans la saisie. Il ne
s'agit donc pas d'adoucir le César, mais de distinguer deux gestes que le
catalogue confondait : « j'ai essayé vingt-cinq réglettes et la quinzième
tombait bien » contre « la saisie dit vingt-deux, j'applique vingt-deux ».

## 2. La doctrine — ce qui compte comme une justification

Un décalage `N` est **justifié** quand une LECTURE de la saisie l'exhibe. Une
lecture n'est recevable qu'en satisfaisant les cinq conditions suivantes,
*toutes* :

1. **Énonçable avant le résultat.** La procédure doit pouvoir s'écrire sans
   savoir à quoi `N` servira. « Le nombre de caractères communs à chaque mot »
   se dit d'avance ; « le décalage qui fait tomber sur 666 » est le grief
   lui-même, rhabillé.
2. **Une seule lecture, aucun départage.** La procédure rend un nombre et un
   seul. Là où il faudrait trancher, elle REFUSE — même discipline que `mpf`,
   `m1s2` et `mad` (§4.1). Aucun ordre de `Map`, aucun tri, aucune préférence
   tacite ne doit pouvoir s'y glisser.
3. **Sans consommer.** Les caractères qui produisent `N` restent dans la ligne
   et subissent le décalage comme les autres. C'est ce qui sépare une
   justification d'une MESURE (`nd`, `nl`…) : une mesure remplace le texte par
   son compte, une justification le désigne et le laisse.
4. **Aveugle à la cible.** La lecture ne connaît pas 666. Une procédure qui lit
   le nombre visé est taillée pour lui, et retombe dans le grief.
5. **Montrable.** Ce qui est compté doit pouvoir être DÉSIGNÉ à l'écran sur le
   texte affiché, au moment où on le compte (§0.3 : « ce que le spectateur voit
   est littéralement ce qui a été compté »).

### ⚠️ Le risque central, et il faut le nommer

**Multiplier les familles de lecture déplace l'arbitraire au lieu de le
supprimer.** Avec assez de lectures recevables, tout `N` finit par être
« justifiable », et l'on aura seulement remplacé « j'ai essayé vingt-cinq
décalages » par « j'ai essayé vingt-cinq lectures ». C'est le seul vrai danger
de ce chantier.

Trois garde-fous, et ils sont la raison pour laquelle **une seule famille est
implémentée** :

 · **peu de familles**, chacune ajoutée sur preuve d'usage, jamais par symétrie ;
 · **la famille est écrite dans le code** : l'URL dit quelle lecture a servi, et
   l'opérateur ne peut pas en changer après coup ;
 · **la prime reste modeste** — elle porte le décalage justifié au niveau du
   César *historique*, jamais au-dessus. Se justifier vaut autant qu'être connu,
   pas davantage.

## 3. La famille retenue — « les caractères communs à chaque mot »

`lectureDesCommuns(saisie)`, sept règles, dont quatre sont des refus :

1. La saisie se découpe en **mots** au sens du dépôt (`filtres.js ›
   decouperMots`, séparateurs `- . _ / espace + ~`). On ne réinvente pas une
   notion de mot : celle-ci est déjà celle de `tm`.
2. **Moins de deux mots → refus.** « Commun à chaque mot » n'a pas de sens sur
   un mot seul.
3. Chaque mot est **replié** — sans accents, en bas de casse —, comme le
   dictionnaire du dépôt replie les siens. C'est ce qui fait que « Fouché »
   partage bien son `o` et son `u` avec « Louis ».
4. `C` = l'**intersection** des caractères des mots repliés. **Vide → refus.**
5. Pour chaque mot, dans l'ordre de lecture, on compte **ses** caractères qui
   appartiennent à `C`. « Louis » → `o`, `u` → 2 ; « Fouché » → `o`, `u` → 2.
6. **Un compte à deux chiffres → refus** : la concaténation cesserait d'être
   lisible (`10` et `2` ne font pas plus `102` que `12`).
7. Le nombre est la **concaténation des comptes**, dans l'ordre de lecture.
   **Hors de [1, 25] → refus.**

> **Occurrences, et non caractères distincts** — le point n'est pas décoratif.
> L'exemple de l'auteur ne départage pas les deux lectures (2 et 2 dans les deux
> cas), mais sa formulation, si : « combien de caractères communs à chaque
> mot » compte les caractères DU MOT, pas la taille de l'intersection. Et la
> conséquence est décisive : en distincts, chaque mot rend `|C|`, tous les
> comptes sont égaux, et la famille ne saurait produire que 11 et 22 (33 et
> au-delà sortent de l'alphabet). En occurrences, elle atteint quatorze
> décalages.

> **Deux mots exactement, en pratique.** Trois mots donnent trois chiffres, donc
> au moins 111 : hors alphabet, refus. La famille ne parle donc que des saisies
> à deux mots — ce qui est le cas de tous les noms propres que l'auteur soumet.
> **Corollaire heureux : le nombre a toujours deux chiffres**, et le code tient
> dans les quatre signes que le registre autorise (§5).

## 4. Les familles proposées, et celles que j'écarte

| Famille | Lecture | Statut |
|---|---|---|
| **communs** | les caractères communs à chaque mot, comptés mot par mot et concaténés | **implémentée** |
| distincts | la taille de l'intersection (`Marie Curie` → `r,i,e` → 3) | proposée — recevable aux cinq conditions, toujours dans l'alphabet, et elle couvre les saisies à un seul mot que « communs » refuse. À n'ajouter que sur demande : elle double la portée, donc le risque du §2 |
| longueurs | les longueurs des mots concaténées (`Louis Fouché` → 56) | proposée, faible : presque toujours hors de [1,25] |
| initiale | le rang alphabétique de l'initiale (`Louis` → 12) | **écartée** — « l'initiale de quel mot ? » est un départage, donc la condition 2 tombe. La première plutôt que la dernière n'a pas de raison |
| nombre de mots | 2, 3, 4… | **écartée** — trois valeurs utiles, et elle ne dit rien de la saisie que son découpage |
| somme des rangs mod 26 | — | **écartée** — le `mod 26` est une arithmétique ajoutée sans autre motif que de retomber dans l'alphabet. C'est de la ficelle : la condition 1 tombe |

## 5. Le nommage — `fj<N>`, et pourquoi pas autre chose

Le registre est **rouvert** (§4.1, amendement du 27 août : « la clôture est
levée »), les codes neufs s'inscrivent **en fin de registre**, et la longueur est
bornée à **quatre signes** — consigne de l'auteur, gelée par
`catalogue.test.js` : « 2, 3 ou 4 caractères, évite d'aller au-delà ».

C'est cette borne qui tranche, et elle élimine d'abord la forme qu'on attendait :

 · **`fr22C`** (`fr22` + majuscule de variante, comme `m7F` ou `mrtE`) ferait
   **cinq** signes. Refusé par la borne, sans appel.
 · **`frj`**, un code unique dont le décalage se DÉDUIT de la saisie, tient en
   trois signes et dit joliment la thèse du chantier. Il a été poussé loin, puis
   **abandonné** : le descripteur est un objet figé, et `table`, `libelle`,
   `outil` et `decalage` y sont statiques. Sans `table`, l'opérateur perd sa
   **glissière** (`filtres.js › FILTRES`, `parTable`), perd le malus
   `LETTRE_VERS_LETTRE` (`elegance.js › porteUneReglette`, qui teste `op.table`)
   — c'est-à-dire qu'il redevient exactement « l'alphabet gratuit » que le dépôt
   vient de corriger — et sort de `familleDeReglages` faute de `decalage` publié.
   Trois régressions pour une élégance de nommage : le prix est trop haut.
 · **`fj<N>`** est ce qui reste. Le `j` de « justifié » est le signe qui
   distingue ; le `r` du César tombe, faute de place. La perte est réelle et
   assumée — mais `fj22` reste un code de la famille FILTRE, il publie
   `familleOutil: 'fr'`, son libellé dit « Chiffre de César (22) », et son titre
   court dit « César 22 ». Seul le code est muet ; tout ce que le lecteur voit
   ne l'est pas.

**Quatorze codes**, et pas vingt-cinq : `fj11`…`fj19` et `fj21`…`fj25`. Ce sont
exactement les décalages que la lecture peut produire (§3, corollaire), et ils
se DÉRIVENT de la lecture plutôt que de se lister — un décalage dont aucune
saisie ne pourrait porter la preuve n'a pas à occuper un code.

> **Le coût de recherche n'est pas de quatorze, il est de un.** La lecture rend
> un nombre et un seul : sur une saisie donnée, **au plus un `fj<N>` s'applique**
> et les treize autres rendent `null` immédiatement. Le facteur de branchement
> du BFS augmente de un, pas de quatorze.

### Pourquoi pas une prime sur `fr22` lui-même

Le plus court aurait été de laisser `fr22` se bonifier tout seul quand la saisie
exhibe 22 — zéro code neuf. C'est interdit, et pour une bonne raison : §4.1
règle 2, « changer le comportement d'un opérateur = allouer un nouveau code ».
Un `fr22` qui tantôt s'anime en deux temps et tantôt en un, qui tantôt vaut 0,45
d'ad hoc et tantôt 0,25, est deux opérateurs sous un nom. Et il n'y aurait plus
rien à comparer : le lecteur ne pourrait plus demander la version non justifiée.

## 6. La notation — une seule phrase, et aucun barème touché

> **Un décalage qu'on sait lire dans la saisie se justifie AVANT qu'on ait
> regardé ce qu'il donne — ce qui est exactement le critère qui vaut au César
> historique son `0,20` de notoriété et son `0,25` d'ad hoc.**

`fj<N>` prend donc ces deux valeurs-là, en lieu et place du `0,10` / `0,45` des
décalages sans nom. **Rien d'autre ne change** :

 · `LETTRE_VERS_LETTRE` (40) reste dû, entier : la CONVERSION coûte le même prix,
   justifiée ou non. Ce qui se bonifie est le choix du décalage, pas le fait de
   traverser une réglette ;
 · `cout` reste à **1**. La justification se joue DANS l'étape du César — « à
   côté de césar juste avant que le décalage ait lieu » —, pas comme une étape
   de plus. Un `cout` à 2 aurait amputé la concision (`score.js ›
   critereConcision`) et repris d'une main ce que la notoriété donne de l'autre ;
 · `familleOutil: 'fr'` est publié, de sorte que `fj22` et `fr5` dans une même
   voie comptent bien pour **deux réglages d'un même outil**
   (`elegance.js › reglagesEnTrop`, `assemblage.js › familleDeReglages`) — sans
   quoi le code `fj22`, qui ne finit pas par des chiffres après retrait du
   suffixe, aurait formé une famille à lui tout seul et le poste se serait tu.

**Aucune ligne de `elegance.js` ni de `score.js` n'est modifiée** — ce qui laisse
le champ libre aux chantiers voisins `bareme-de-la-perte` et
`tri-qui-respecte-lordre`, qui vivent précisément là.

## 7. L'animation

> « …qui peut venir se placer à côté de césar juste avant que le décalage
> d'alphabet ait lieu. »

Une étape est **préfixée** à la série de la glissière, dans la même étape
logique de la voie :

 · `highlight` sur les caractères communs, à leur place dans la ligne — ce sont
   les bornes que `decouperMots` rend déjà, donc les vrais caractères comptés et
   non un dessin qui leur ressemble ;
 · `annotate` sous chaque mot : le compte de ce mot ;
 · `annotate` à côté du nom de l'outil : le nombre obtenu.

Puis la glissière monte et coulisse de `N` crans, **sur les mêmes caractères,
toujours là** : c'est le « sans consommer » de la demande, rendu visible.

Aucune primitive neuve — le vocabulaire reste à vingt et une (§3.1).

---

## 8. La mesure — et elle est mauvaise

Instrument : `.planning/banc/cesar-justifie-banc.mjs`. « Avant » n'est pas un
souvenir, c'est le même moteur avec les quatorze opérateurs retirés du
catalogue ; la comparaison se refait à tout moment.

### 8.1 Ce qui marche

 · **La lecture est exacte.** Sur « Louis Fouché » elle rend `22` — les
   caractères communs sont `o` et `u`, deux de chaque côté —, et c'est
   l'exemple de l'auteur, au chiffre près. Sur « Didier Raoult », `11` (le seul
   `r` partagé) ; sur « jean-michel », `11` (le seul `e`).
 · **Le barème fait ce qu'on lui demande.** À PROGRAMME IDENTIQUE, sur les deux
   cas de l'auteur :

   | voie | score |
   |---|---|
   | `fr22+fl+m14` sur « Louis Fouché » | 1 923 |
   | **`fj22+fl+m14`** | **2 006** (+83, +4,3 %) |
   | `fr11+fl+m14` sur « Didier Raoult » | 1 846 |
   | **`fj11+fl+m14`** | **1 925** (+79, +4,3 %) |

 · **L'animation se joue**, et le rejeu d'un lien écrit à la main la montre :
   les caractères communs sont désignés, comptés sous chaque mot, le nombre
   paraît, et la réglette glisse ensuite **sur les mêmes caractères, toujours
   là**.

### 8.2 Ce qui ne marche pas — et c'est l'essentiel

 · **La portée de la famille est étroite : 3 saisies sur 23.** Deux mots
   exactement, une intersection non vide, deux comptes d'un seul chiffre dont
   la concaténation tombe sous 26 — la conjonction est rare. Tout le reste du
   corpus ne rend aucune lecture (le plus souvent : aucun caractère commun, ou
   un seul mot).
 · **⛔ AUCUNE VOIE JUSTIFIÉE N'ATTEINT AUCUNE LISTE, À AUCUN CRAN** (mesuré de
   0 à 10, sur les trois saisies qui portent une lecture). Le mécanisme est donc
   **inerte** là où il devrait servir.
 · **Et la cause n'est pas le classement, c'est la recherche.** `fj22+fl+m14`
   marque 2 006, ce qui le placerait devant **six des dix-sept** voies listées
   sur « Louis Fouché » (les 6ᵉ, 9ᵉ, 12ᵉ, 15ᵉ, 16ᵉ et 17ᵉ marquent de 1 436 à
   1 994). Il n'est pourtant pas proposé.

     **MESURÉ, et sans ambiguïté** (`--jumeau`) :

     | saisie | catalogue | vecteurs | dont à césar justifié |
     |---|---|---|---|
     | Louis Fouché | entier | 488 | **0** |
     | Louis Fouché | sans le seul `fr22` | 488 | **4** |
     | Didier Raoult | entier | 252 | **0** |
     | Didier Raoult | sans le seul `fr11` | 252 | **12** |

     Le total de vecteurs ne bouge pas d'une unité : le justifié ne s'ajoute
     pas, il se **substitue** — ce qui est la définition d'un jumeau.

     Le césar justifié est un **jumeau arithmétique parfait** de son aîné : même
     décalage, mêmes lettres, mêmes nombres, même verdict. Le moteur ne garde
     qu'un chemin par résultat (`bfs.js › chercherSix`, les états indexés par
     `cleEtat` ; `assemblage.js › retenir`, la trace vue une seule fois), et il
     rencontre toujours l'aîné d'abord — l'ordre d'exploration est celui du
     registre (§4.4 règle 3), et l'append-only inscrit les codes neufs à la fin.
     **La déduplication écarte donc systématiquement le chemin le MIEUX noté.**

 · **Le prix, lui, est bien réel.** Ajouter quatorze codes remue le classement
   par simple effet d'ordre : sur les 23 saisies, **8 listes changent, 0 tête
   change, et il y a 1 sortie sèche** (« apophenie » perd la moisson
   `mt9+cs+prn,mpy+cmo,m7+cs+prn` sans remplaçante). **Aucune** des voies
   entrées ou sorties ne contient un césar justifié : c'est de la turbulence
   pure.

### 8.3 Une correction a été tentée, puis RETIRÉE

Le contrat de la déduplication N1 est « deux chemins qui montrent exactement la
même chose n'en font qu'un ». Or le césar justifié n'en montre pas la même : il
montre une **preuve** en plus. J'ai donc fait porter à `bfs.js › cleTrace` un
drapeau publié par l'opérateur (`montreUnePreuve`), de blast radius nul — aucun
opérateur existant ne le porte, donc toutes les clés d'aujourd'hui restent
identiques au caractère près.

**Elle n'a rien changé : 0 vecteur `fj` avant, 0 après.** La coupe qui mord est
en amont, dans le faisceau par état du BFS. Le correctif a donc été retiré
plutôt que livré — ce dépôt n'embarque pas ce dont il ne peut pas montrer
l'effet.

### 8.4 Ce que je recommande, et ce que je ne décide pas

Le mécanisme **tient conceptuellement** — la doctrine est claire, la lecture est
exacte, la prime est juste et se dit en une phrase — mais il **ne tient pas la
mesure** : il coûte quatorze codes à vie, une turbulence de huit listes et une
sortie sèche, et il ne rend aujourd'hui aucune voie.

Trois suites possibles, et **aucune n'est de mon ressort** :

 1. **Apprendre au faisceau que « mieux noté » l'emporte sur « rencontré le
    premier ».** C'est la bonne réponse sur le fond — `comparerPrefixes` énonce
    déjà la règle (« score décroissant, coût croissant, codes croissants »),
    elle n'est simplement pas appliquée à la coupe par état. Mais elle rebat
    TOUS les jumeaux du catalogue, ce qui est un chantier de recherche entier,
    à mesurer pour lui-même.
 2. **Déprécier les quatorze codes** et s'en tenir au constat : un décalage qui
    ne se choisit plus ne sert plus à ce pour quoi on prenait un césar.
 3. **Les garder tels quels**, inertes dans la recherche mais disponibles au
    lien écrit à la main — c'est l'état livré, et c'est ce que les deux cas
    d'arbitrage de `src/app/pages/arbitrage-cas.js` soumettent à l'auteur.

⚠️ **Et la leçon qui vaut au-delà de ce chantier** : une variante qui ne se
distingue de son aîné que par sa JUSTIFICATION est, pour le moteur, le même
chemin. Tant que la recherche déduplique sur le résultat, toute « variante mieux
notée d'un opérateur existant » sera invisible, quelle que soit sa note.
