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

**Quatorze décalages LISIBLES** — `fj11`…`fj19` et `fj21`…`fj25` —, qui se
DÉRIVENT de la lecture plutôt que de se lister : un décalage dont aucune saisie
ne pourrait porter la preuve n'a pas à occuper un code.

> ★ **MAIS TROIS CODES ALLOUÉS, PAS QUATORZE** — `fj11`, `fj21`, `fj22`. Cette
> réduction est venue de la suite lente, pas d'un goût : `debug.test.js` exige
> que **chaque opérateur du catalogue soit jouable sur une saisie témoin**, et
> onze des quatorze ne le sont sur aucune. On ne force pas cette porte en
> fabriquant onze témoins taillés pour faire tomber onze comptes précis : un
> témoin est une saisie que la page de démonstration AFFICHE, et onze chaînes
> qui ne démontrent que leur propre fabrication rempliraient la page tout en
> divisant d'autant le plafond de nœuds qui sert à TOUS les opérateurs.
>
> Ce n'est pas une impossibilité — le dictionnaire français du dépôt fournit de
> vrais témoins pour neuf des quatorze (« abaisser cellule » écrit 12,
> « abaisser agacant » écrit 23). C'est un **refus de payer ce prix pour des
> codes que la recherche ne rend de toute façon pas** (§8). Un code est alloué
> **à vie** (§4.1 règle 1) : on n'en grave pas onze que rien n'atteint et que
> rien ne montre. La règle de dérivation reste écrite ; le jour où un témoin
> rendra `fj15` montrable, il s'inscrira en fin de registre comme tout code neuf.
>
> **Les deux cas de l'auteur sont couverts tels quels** : 22 sur « Louis
> Fouché », 11 sur « Didier Raoult ». Le catalogue passe de 207 à **210**, et
> non à 221.

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
 · **⛔ AUCUNE VOIE JUSTIFIÉE N'ATTEINT AUCUNE LISTE**, à aucune profondeur de
   fouille (0, 3, 6, 10 — soit 17, 68, 120 puis 309 voies proposées). Le
   mécanisme est donc **inerte** là où il devrait servir.

   > ⚠️ **UNE PREMIÈRE VERSION DE CETTE LIGNE ÉTAIT JUSTE PAR ACCIDENT, et il
   > faut le dire.** Elle annonçait « mesuré de 0 à 10 » en passant `{ cran }` à
   > `resoudre`, alors que l'option s'appelle **`fouille`** — le marqueur `f3!`
   > de l'URL. L'option inconnue est acceptée en silence, si bien que les onze
   > « profondeurs » mesurées étaient onze fois la même. Le signe qui aurait dû
   > m'alerter était sous les yeux : dix-sept voies à chaque profondeur, alors
   > qu'une fouille profonde en rend trois cents. Refaite correctement, la
   > mesure donne le même verdict — mais elle ne le donnait pas encore.
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

 · **Le prix, lui, est bien réel**, et il a été divisé en réduisant le nombre de
   codes. Sur les 23 saisies, par simple effet d'ordre :

   | codes alloués | listes changées | têtes changées | **sorties sèches** |
   |---|---|---|---|
   | quatorze (`fj11`…`fj25`) | 8 | 0 | **1** |
   | **trois** (`fj11`, `fj21`, `fj22`) | **5** | 0 | **0** |

   À quatorze, « apophenie » perdait la moisson `mt9+cs+prn,mpy+cmo,m7+cs+prn`
   sans remplaçante — le signal d'alarme. À trois, elle est remplacée
   (`…,mms+cp+prn`) et **il ne reste aucune sortie sèche**. **Aucune** des voies
   entrées ou sorties ne contient de césar justifié dans les deux cas : c'est de
   la turbulence pure, et il fallait donc la réduire plutôt que la justifier.

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

### 8.4 Trois leviers essayés, chacun mesuré — et le vrai verrou est ailleurs

Le diagnostic du §8.2 (« le jumeau arrive le premier ») était **exact mais pas
suffisant** : il nomme un verrou réel, il n'en nomme pas le dernier. Trois
interventions ont été montées dans un bac à sable (une copie de `src/`, pour ne
pas remuer l'arbre pendant la suite lente) et mesurées séparément.

| levier | vecteurs à `fj` | dans la fenêtre de 20 | liste, fouille 0/3/6 | **liste, fouille 10** |
|---|---|---|---|---|
| aucun (état livré) | 0 | 0 | **0** | **0** sur 309 voies |
| **(b)** l'aîné inéligible là où le cadet s'applique | 4 | 1 — 15ᵉ | **0** | — |
| **(c)** une famille de réglages propre (`frj`) | 0 | 0 | **0** | — |
| **(b) + (c)** | 4 | 1 — **11ᵉ**, la mieux notée de toutes | **0** | **9** sur 297 voies, la meilleure **47ᵉ** |

 · **(c) seule ne fait rien**, et c'est logique : sans (b), l'aîné pré-empte
   toujours le cadet en amont de toute question de siège.
 · **(b) seule fait apparaître les vecteurs** mais laisse `fj22` derrière son
   propre siège : j'avais publié `familleOutil: 'fr'`, ce qui fait concourir le
   justifié pour **l'unique place** que `unePlaceParFamille` accorde aux
   trente-neuf césars — et cette place va à `fr5`, qui a le droit de choisir son
   décalage. La décision de conception du §6, prise pour éviter l'inflation de
   liste, est donc aussi ce qui étouffe le cadet. C'est un vrai arbitrage, et il
   n'a pas de bon côté.
 · **(b)+(c) va le plus loin** : `fj22+tca+mu8+mrd`, qui marque **3 974** —
   davantage que **toutes** les voies de la liste, dont la meilleure est à
   3 628 —, entre en fenêtre au 11ᵉ rang sur 15. **Et n'entre pas dans la
   liste.**

★ **Et c'est là le fait qui tranche.** Son jumeau `fr22+tca+mu8+mrd` n'y entre
pas davantage, ni `fr5+tca+mu8+mrd` qui occupe pourtant le 9ᵉ rang de la même
fenêtre. Le filtre qui les écarte, entre la fenêtre et la liste, **ne regarde
pas la justification** : il écarte la FORME, justifiée ou non. Il pré-existe
entièrement à ce chantier.

★ **MAIS (b)+(c) FINIT PAR PASSER — à `fouille: 10`, et là seulement.** Neuf
voies justifiées entrent alors dans la liste, la meilleure au **47ᵉ** rang :

```
47ᵉ  ?sce!f10!0:fr13;fj22+mas+mrdf+megf$7NFn8xBqb5eNAq3YCY
74ᵉ  ?sce!f10!0:fmaj;fj22+mas+mrdf+megf$…
154ᵉ ?sce!f10!fj22+mas+mrdf+megf$…
```

L'état LIVRÉ, lui, en rend **zéro** à la même profondeur, sur 309 voies. Les
deux leviers font donc bien quelque chose — et le mécanisme n'est pas
inatteignable par nature.

⚠️ **Le prix, à cette profondeur, est net et défavorable** : la liste passe de
**309 voies à 297**. Douze voies partent, neuf arrivent — un **déficit de
trois**, et toutes les arrivantes portent le même `fj22`. C'est exactement la
« sortie sèche » dont il faut se méfier, à l'échelle d'une liste entière.

★ **Et le critère demandé n'est pas atteint** : « sur *Louis Fouché* au cran 3,
une voie portant un césar justifié doit entrer dans la liste ». À `fouille: 3`,
(b)+(c) rend **0 sur 68 voies**. Il faut descendre à 10 pour voir la première, au
47ᵉ rang.

★ **La piste (a) est DOMINÉE, et n'a donc pas eu à être écrite.** Départager les
jumeaux par la note au moment de dédupliquer donne au cadet, au mieux, les
occasions que (b) lui donne déjà — (b) ne se contente pas de le préférer, elle
**supprime le concurrent**, ce qu'aucun départage ne fait. Tout ce que (a)
pourrait rendre, (b) le rend donc aussi. Or (b)+(c) ne rend rien avant
`fouille: 10`, et rien au rang demandé. Payer pour (a) le remue-ménage sur tous
les jumeaux du catalogue — que le coordinateur redoutait à juste titre — aurait
donc acheté, au mieux, ce que (b) achète déjà : trop peu, trop bas, trop
profond.

> ⚠️ **Une note sur le prix caché de (b)**, s'il devait être repris un jour :
> écrite comme un `admet`, elle est appliquée aussi au REJEU, pas seulement à la
> recherche (`bfs.js › appliquerOp`, « la même porte que `catalogue.js ›
> appliquer` »). Tout lien existant portant `fr22` sur une saisie qui justifie 22
> cesserait donc de se rejouer — y compris les deux cas d'arbitrage de ce
> chantier. Il faudrait un canal d'inéligibilité propre à la RECHERCHE, qui
> n'existe pas aujourd'hui.

### 8.5 Ce que je recommande, et ce que je ne décide pas

Le mécanisme **tient conceptuellement** — la doctrine est claire, la lecture est
exacte, la prime est juste et se dit en une phrase — mais il **ne tient pas la
mesure** : il coûte quatorze codes à vie, une turbulence de huit listes et une
sortie sèche, et il ne rend aujourd'hui aucune voie.

**La réponse honnête est : le mécanisme est là, et le moteur ne sait pas encore
le préférer.** Ce n'est pas une fatalité — c'est un troisième chantier, qui
porte sur ce qui sépare la fenêtre de la liste, et que trois leviers mesurés
n'ont pas su forcer par le bord.

Trois suites possibles, et **aucune n'est de mon ressort** :

 1. **Reprendre (b)+(c) comme un chantier à part entière**, puisque c'est le
    seul couple qui fasse entrer quelque chose. Il lui manque trois choses, et
    aucune n'est petite : un canal d'inéligibilité propre à la RECHERCHE (sans
    quoi (b) tue les liens existants, voir l'encadré ci-dessus) ; de quoi
    remonter du 47ᵉ rang, ce qui passe par le filtre qui sépare la fenêtre de la
    liste — celui qui écarte `*+tca+mu8+mrd` en bloc alors qu'il occupe trois
    des quinze places de la fenêtre et porte la voie la mieux notée du lot ; et
    de quoi ne pas perdre douze voies pour en gagner neuf. Ce filtre-là n'a
    **rien à voir avec les césars** : le trouver profiterait à tout le monde.
 2. **Déprécier les quatorze codes** et s'en tenir au constat : un décalage qui
    ne se choisit plus ne sert plus à ce pour quoi on prenait un césar. C'est la
    suite à prendre si l'on refuse un catalogue qui grossit de codes que rien
    n'atteint — et ce refus est légitime.
 3. **Les garder tels quels**, inertes dans la recherche mais disponibles au
    lien écrit à la main — c'est l'état livré, et c'est ce que les deux cas
    d'arbitrage de `src/app/pages/arbitrage-cas.js` soumettent à l'auteur. Le
    césar justifié s'y voit, se rejoue et montre sa preuve ; il ne se trouve
    simplement pas tout seul.

⚠️ **Ce que je ne recommande PAS : fusionner en l'état sans trancher entre 2 et
3.** Quatorze codes sont alloués à vie (§4.1 règle 1), et ceux-ci ne rendent
aujourd'hui aucune voie tout en remuant huit listes. Le bénéfice ne paie pas le
prix tant que le point 1 n'a pas été levé.

⚠️ **Et la leçon qui vaut au-delà de ce chantier** : une variante qui ne se
distingue de son aîné que par sa JUSTIFICATION est, pour le moteur, le même
chemin. Tant que la recherche déduplique sur le résultat, toute « variante mieux
notée d'un opérateur existant » sera invisible, quelle que soit sa note.

## 9. Reprise du 22 septembre : les voies sont désormais proposées

Cette section remplace le constat d’inertie et les recommandations du §8.5.
Le catalogue alloue **trois codes**, pas quatorze. Aucun code neuf n’est ajouté.

Le verrou manquant était la **composition des filtres** : `fj22+fl+m14`
requiert deux filtres STR, alors que l’énumération des vecteurs n’en déroulait
qu’un. Le BFS cherche des nombres isolés, il ne remplace pas cette énumération
de vecteurs. Donner une place à `fj22+mu8+mrd`, qui ne porte pas les trois
chiffres exigés du groupement, ne pouvait donc pas résoudre ce cas.

La correction comporte trois gestes bornés :

- Préférer le jumeau justifié dans les vecteurs lorsque la lecture de son état
  d’entrée prouve exactement son décalage. Les états et traces restent identiques.
- Après cette unique lecture, permettre une présentation des lettres : `fl`,
  `fmin` ou `fmaj`. **Trois bases supplémentaires au maximum**, sans récursion,
  sans deuxième décalage ni nouvelle lecture. Le compte précède le retrait des
  séparateurs : les deux mots sont encore visibles lorsque la preuve est lue.
- Distinguer la forme qui montre une preuve dans la fenêtre des candidats,
  tout en conservant `familleOutil: 'fr'` pour facturer les réglages.

Aucun changement du BFS, de l’admissibilité des opérateurs ou du rejeu. Les
liens `fr22` historiques restent valides, et `fj22` reste strictement gardé par
sa lecture. Le barème existant suffit : aucune prime supplémentaire n’est ajoutée.

Mesure sur **Louis Fouché**, catalogue complet, filet temporel désactivé :

| Fouille | Liste avant | Liste après | Voies justifiées après |
|---|---:|---:|---:|
| 0 | 17 | 17 | 1, au rang 2 |
| 3, cumulative | 69 | 72 | 9, première au rang 9 |

La voie du cran 0 est `fj22+fl+m14+meg` (score 3 282). Au cran 3, on trouve
également `fj22+fmaj+mas+mrn+meg` et `fj22+fl+m14+mpf`. Le rang vient du
classement ordinaire ; aucun siège imposé à une preuve n’a été ajouté.

Mesure isolée des vecteurs (`minSix: 1`, plafond 1e6,
`miseEnForme: false`, `tousLesReglages: true`, catalogue complet) :

| Saisie | Travail avant | Travail après | Vecteurs justifiés avant/après |
|---|---:|---:|---:|
| Louis Fouché | 105 718 | 127 176 | 0 / 82 |
| Didier Raoult | 132 665 | 158 068 | 0 / 72 |
| hope-hope-hope.fr | 158 438 | 158 438 | 0 / 0 |
| Macron | 318 621 | 318 621 | 0 / 0 |

Le surcoût local est donc d’environ 19 à 20 % sur ces deux saisies justifiables,
et nul en unités de travail sur les deux témoins sans preuve. Les temps de
liste observés étaient 5,05 s au cran 0 et 24,2 s au cran 3, sur une machine
chargée avec le filet désactivé : ce sont des observations, pas une garantie
de latence. Les budgets de recherche sont inchangés.

Vérification : `src/recherche/tests/justifications.test.js` couvre l’identité
arithmétique, les refus, la distinction de forme, les anciens liens et la
composition attendue. `src/recherche/tests/lents/cesars-justifies.test.js`
vérifie la présence réelle aux crans 0 et 3, la conservation des voies entre
ces crans, le rejeu des voies proposées et leur meilleure note que les jumeaux
arbitraires.
