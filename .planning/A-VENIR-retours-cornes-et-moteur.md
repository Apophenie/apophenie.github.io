# Retours de l'auteur — cornes, agencement du verdict, et nouvelles transformations

Consigné mot pour mot le 27 août 2026, après l'intégration des trois chantiers
(plein écran, cornes sans effacement, cibles autres que 666). Rien n'est résumé :
ce fichier est la source, les issues qu'on en tirera sont des dérivés.

> **État au 16 septembre 2026 (`v3.0.0`) — partiellement réalisé.** Les §1, 2,
> 3, 5, 6 et 7 sont faits, et chacun dit où vit le résultat. **Reste ouvert : la
> seconde moitié du §4**, la voie élégante de `https://reinfocovid.fr/` qui ne
> revient pas dans la liste. Index de ce qui reste : `.planning/A-VENIR.md`.

---

## 1. ~~Les cornes anticipées sont trop permissives~~ — FAIT

> **Fait.** Les trois conditions sont la règle du couronnement anticipé
> (`src/recherche/scenario.js`, « LA VÉRIFICATION QUI AUTORISE — OU REFUSE — LE
> COURONNEMENT ANTICIPÉ » et `dUnSeulTenant`), et les cornes des triptyques
> relégués s'effritent au verdict (`src/visuel/primitives/horns.js ›
> effriterLesCornes`).

> « Il y a eu 2 ajouts de cornes anticipées, l'un sur `6 6 6`, l'autre sur
> `6 66`. Seuls les 666 non séparés reçoivent des cornes anticipées, et encore,
> seulement s'ils sont censés les avoir jusqu'à la fin. En effet, là tu as
> ajouté des cornes à la 4ᵉ série de 666 alors qu'elle se retrouve en 2ᵉ ligne. »

URL témoin :
`#sce!0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM`

**Puis, plus loin, l'auteur affine — et cette seconde formulation prime :**

> « Quand les 666 sont déjà contigus et resteront assemblés de cette manière à
> la fin, ajoute-leur les cornes tout de suite en mode scène, même s'ils
> arrivent en 2ⁿᵈ ligne au verdict. Et au verdict, au moment de l'agencement,
> fais s'effriter/disparaître progressivement les cornes des triptyques qui vont
> en 2ⁿᵈ ligne. »

Donc la règle finale, en trois conditions cumulatives :
1. les trois chiffres sont **contigus** (pas `6 6 6`, pas `6 66`) ;
2. ils le **restent jusqu'à la fin** ;
3. peu importe la ligne d'arrivée — les cornes sont posées tout de suite.

Et au verdict, les cornes des triptyques relégués au second rang **s'effritent
progressivement** au moment de l'agencement, au lieu de disparaître d'un coup.

## 2. ~~L'agencement des triptyques en lignes~~ — FAIT

> **Fait, et la question ci-dessous est tranchée.** Interrogé, l'auteur a
> précisé son critère et corrigé son propre exemple (« OK pour passer 7 en
> 3+2+2, c'est mieux en effet »). Les dix cas corrigés sont la table de vérité
> de `src/visuel/primitives/reveal.js › repartirEnLignes`, vérifiée par
> `src/visuel/tests/verdict-rangs.test.js`.

> « S'il y a 4 triptyques, 2 par lignes. Minimise la différence de nombre de
> triptyques entre les lignes, et garde plus de triptyques par ligne que de
> lignes. 1: 1 ligne de 1. 2: 1 ligne de 1. 3: 1 ligne de 1. 4: 2 lignes de 2.
> 5: 1 ligne de 3 et 1 de 2. 6: 2 lignes de 3. 7: 1 ligne de 4 et une de 3.
> 8: 2 lignes de 3 et 1 ligne de 2. 9: 3 lignes de 3. 10: 1 ligne de 4 et
> 2 lignes de 3. … »

~~⚠ **QUESTION OUVERTE** — l'énumération et la règle ne coïncident pas sur 8 :
« minimise la différence » donnerait `4+4` (différence 0), l'auteur écrit
`3+3+2` (différence 1). Un plafond de 4 par ligne expliquerait `7 → 4+3` et
`10 → 4+3+3`, mais pas que `8` ne soit pas `4+4`. À trancher avec l'auteur avant
d'implémenter.~~ Tranchée, voir ci-dessus.

## 3. ~~Les cornes ne devraient pas figurer dans l'URL~~ — FAIT

> **Fait.** Aucun opérateur ne pose plus de cornes : le couronnement se décide à
> la volée en `sce!` (`src/recherche/scenario.js`, « COURONNER SANS EFFACER »,
> seul émetteur de cornes du projet), et `m36` désigne et efface sans couronner
> (`src/moteur/transformations/mappeurs.js`, « CET OPÉRATEUR NE COURONNE PLUS »).

> « L'ajout des cornes ne devrait pas modifier l'url mais être fait à la volée
> en mode `sce!` — ça éviterait d'avoir des liens `sce!` sans cornes parce
> qu'ils ont été créés avant (dans les exemples troublants). »

## 4. Une voie élégante a disparu du classement — PARTIEL, reste ouvert

> **~~Les cornes absentes en `sce!`~~ : fait** (voir §3).
>
> **La perte de rang : toujours ouverte.** Mesuré le 16 septembre 2026 sur
> `v3.0.0`, curseurs par défaut, filet temporel débranché : la partition
> `0.1:mch+cs+prn,3.1:fc+nl,5.1:m7+cs` n'est dans aucune des 24 voies du cran 0,
> ni des 52 du cran 2. Au cran 0, deux partitions qui partagent sa première
> portée figurent aux rangs 18 et 23 (`0:mch+cs+prn,2:nsp+mlet+nlc,3:nc` et
> `0:mch+cs+prn,3:nc,5:fr13+nlc+pc9`). Elle reste en vitrine parmi les exemples
> de l'accueil (`src/i18n/fr.js`), par son lien direct. Les réglages déjà
> essayés sans effet sont consignés dans `src/recherche/elegance.js` (« le
> réglage 2 ne fait PAS ce qu'on attendait de lui »).

> « Sur `#so!0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn`
> il n'y a pas de cornes (logique, on est en version sobre) mais si je passe en
> `sce!` pas plus de cornes, et si je mets `https://reinfocovid.fr/` dans la
> saisie puis énumérer les voies, impossible de retrouver celle-ci, elle a dû
> perdre en score alors qu'elle est très élégante à mon goût. »

Deux défauts distincts dans la même phrase : l'absence de cornes en `sce!`, et
la perte de rang.

## 5. ~~Un libellé faux~~ — FAIT

> **Fait.** La phrase de l'auteur est celle du tri final, et elle ne se dit que
> lorsqu'elle est vraie (`src/recherche/scenario.js`, « LA MAJORITÉ EST UNE
> MESURE, PAS UNE FIGURE DE STYLE »).

Sur `#sce!3.1:tca+mpy+mr9#3A8evQZovd7BUyRUF65ToBwrHvW25EUn`, l'étape 14 devrait
dire :

> « Les 6 sont majoritaires, on les garde
>   Les chiffres minoritaires ne sont pas significatifs, on les retire. »

## 6. ~~Un libellé faux ET un opérateur à remplacer~~ — FAIT

> **Fait.** Le titre nomme la cible, jamais un 6 en dur
> (`src/recherche/tests/lents/cible.test.js`, « le tri final nomme la CIBLE,
> jamais un 6 en dur »). Et la voie citée n'est plus proposée : mesuré le
> 16 septembre 2026, « Capitalisme » visant 777 rend 7 voies, dont aucune ne
> finit par `masb+mrn` ; la tête est `mqw4+mrdE`.

Sur `#so!c777!tca+masb+mrn#Hi75aotg77MXEgC`, étape 27 :

> « "On ne garde que les 6", or ce sont les 7 que tu gardes. Le titre est à
> rendre dynamique (mais ça reste peu élégant, surtout avec les astuces pour le
> moteur de calcul que je viens de te donner, tu devrais pouvoir trouver
> mieux). »

## 7. ~~Nouvelles transformations proposées~~ — FAIT

> **Fait.** Les quatre sont au catalogue : `mtri` (tri croissant), `mr39`
> (retourner les trios de 9), `mcc` (compter les chiffres) et `mrd`
> (redécoupage choisi). La clôture du registre a été levée par écrit :
> `CONTRACTS.md`, amendement « LES QUATRE TRANSFORMATIONS DU 27 AOÛT ».

### 7.1 Tri croissant

> « Coté transformation il y a aussi "Tri croissant" `95956636494` →
> `34455666999`, qui permet de faire apparaître 666 contigu. »

### 7.2 Retourner les 9 par trios contigus

> « Puis de retourner les neufs non pas individuellement mais en trio contigu
> (plus élégant) pour faire apparaître directement 666. »

À rapprocher de l'opérateur `mr9` existant (rotation 9→6), qui opère
individuellement.

### 7.3 On compte les chiffres

> « Ce n'est pas arrangeant/utile ici, mais il y a aussi la transformation :
> "On compte les chiffres" `34455666999` → `1324253639`. »

(Un 3, deux 4, deux 5, trois 6, trois 9 → `13 24 25 36 39`.)

### 7.4 Redécoupage tricheur pour tomber sur 6

Sur `#sce!fc+tca+mx6+mrn#3A8evQZovd7BUyRUF65ToBwrHvW25EUn` :

> « Après l'étape 15, il y a 32 chiffres. C'est le moment de tricher pour
> réduire chaque nombre à un chiffre en redécoupant de manière à ce que ça tombe
> sur 6 le plus souvent possible.
>
> `48120120961141088436181322436108`
>
> 4+8→12→1+2→3 · 1+2+0→3 · 1+2+0→3 · 3+3+3→9 · 9 · 6 · 1+1+4→6 · 1+0+8→9 ·
> 8+4→12→1+2→3 · 3+3→6 · 6 · 1+8→9 · 1+3+2→6 · 2+4+3→9 · 6 · 1+0+8→9
> ⇒ `996696696969`
>
> transformation suivante : tri croissant `996696696969` → `666666999999`
>
> Si mode scène, on fait apparaître les cornes sur `666 666`.
> Puis "On retourne les 666 qui se cachent" (retourne les 999 trois par trois,
> en leur ajoutant les cornes une fois retournés). »

~~⚠ **Le registre de code d'opérateur** est déclaré CLOS dans CONTRACTS §4.1, au
motif que des liens écrits à la main circulaient. L'auteur a depuis confirmé
qu'**aucun lien n'a été diffusé**. La clôture n'a donc plus son fondement, et
ces nouveaux opérateurs peuvent recevoir des codes — mais c'est un amendement au
contrat, à écrire explicitement plutôt qu'à supposer.~~ Amendement écrit, voir
l'encadré du §7.
