# Le redécoupage exact — `mrdE`

> « Sur des objectifs comme "Sarah Kerrigan" → 31031998, on n'arrive pas à une
> exhaustivité parfaite. Il y a une phase de suppression des encombrants qui
> fait perdre toute crédibilité à l'approche. […] Je voudrais arriver à
> toujours proposer un chemin sans aucune perte, même s'il ne remonte pas
> toujours en premier résultat ; si avec les réglages je fais primer
> l'exhaustivité, alors il doit remonter. » (l'auteur)

Piste explorée : **redécoupage exact, multi-passes** — rester dans la famille de
`mrd` (découper, sommer, réduire), et exiger que le plan couvre toute la ligne
et rende la cible, dans l'ordre, sans un chiffre de plus. Banc :
`node .planning/banc/mrd-exact-banc.mjs` (`--json` pour la forme comparable).

## 1. Ce que fait l'opérateur

`mrdE` (`m.redecoupageExact`, `NUMS → NUMS`) est un code neuf, en fin du bloc
des mappeurs du registre ; `mrd` ne bouge pas. Il lit la cible par
`selonLaCible`, comme `mrd`, et refuse la même (`000` : des sommes ne font pas
des zéros). Son plan est calculé une fois (`planRedecoupageExact`, mémoïsé par
ligne et par cible) et relu par `apply`, `sortie`, `additions` et `steps`.

Trois leviers :

1. **le paquet remplacé par sa somme** (comme `mrd`) — `5 + 1 → 6` ; une somme
   qui déborde peut s'écrire chiffre à chiffre, `7 + 8 = 15 → « 1 5 »` ;
2. **la racine numérique d'un paquet dont la somme dépasse neuf** (comme `mrn`)
   — `9 + 3 + 3 = 15 → 1 + 5 → 6`. C'est ce qui rend `d + 9k → d` : un chiffre
   de la cible absorbe des intrus dont la somme est un multiple de neuf et
   ressort intact — « réutilisé et restitué » ;
3. **une seconde passe** quand la première ne suffit pas : le résultat est
   redécoupé. Chaque passe est une découpe et des additions montrées.

Ce que la seconde passe permet, précisément :

- **fondre des intrus entre eux avant de les fondre dans la cible** — un paquet
  de six est le plus large lisible (`PAQUET_MAX`) ; jusqu'à douze voisins d'un
  chiffre se replient en deux racines à la première passe, puis dans le chiffre
  à la seconde ;
- **partager une somme entre deux voisins** — `5 8 7 1` ne s'écrit pas `66`
  d'une coupe ; `8 + 7 + 1 = 16 → « 1 6 »` d'abord, puis `5 + 1 → 6` : la
  dizaine sert au 6 de gauche, l'unité EST le 6 de droite.

Le plan est une programmation dynamique sur `(chiffres consommés, rang de la
cible écrit, unité pendue)` : chaque chiffre de la cible reçoit une plage de
0 à 12 voisins et, au besoin, un paquet partagé de 2 à 6 chiffres à sa droite.
Coût minimisé, dans l'ordre : demi-tours (un 9 posé pour un 6 — il appelle un
`mr9` que la recherche doit encore trouver), travail de seconde passe, puis le
**plus** de séries, puis le moins d'additions. Parcours en ordre fixe,
remplacement sur strict mieux, entiers : déterministe (§4.4).

Clause du demi-tour reprise de `mrd` : quand la cible veut des 6 et pas de 9,
un 9 peut tenir la place d'un 6 (`mr9` le retournera). Elle n'est employée qu'à
défaut.

## 2. Quand c'est impossible — et pourquoi c'est sûr

- **L'invariant modulo neuf.** Remplacer un paquet par sa somme, l'écrire
  chiffre à chiffre ou la réduire conservent la somme des chiffres de la ligne
  modulo 9. Aucune suite de passes n'écrit donc une cible dont la somme n'est
  pas congrue à celle de la ligne : le *reliquat* `Σ(ligne) − m·Σ(cible)` doit
  être ≡ 0 (mod 9) pour un nombre de séries `m` possible. L'opérateur le
  vérifie **avant** de chercher (huit lignes sur neuf sont refusées en O(n)).
  Avec le demi-tour, un 6 se contente d'une somme ≡ 0 : sur `666` le reliquat
  tolère les multiples de trois.
- **Le zéro.** Une somme de chiffres n'est nulle que si tous le sont ; un 0 de
  la cible ne naît que de zéros, ou de l'unité d'une somme finissant par 0
  (`« 1 0 »`, `« 2 0 »`…), laquelle a toujours une dizaine devant elle. **Une
  cible qui commence par 0 exige donc une ligne qui commence par 0** —
  `01111984` est hors d'atteinte de toute addition.
- **Trop court** : chaque chiffre écrit consomme au moins un chiffre lu ; deux
  chiffres n'écrivent jamais `111`.
- **Trop large** : douze voisins par chiffre de la cible
  (`CONTENU_EXACT_MAX`), six par paquet partagé, trente-six chiffres par ligne
  (`CHIFFRES_REDECOUPE_MAX`), deux passes. Au-delà, refus.
- **Rien à faire** : une ligne qui est déjà la cible n'a rien à additionner —
  refus, comme `mrd`.

Dans tous ces cas `apply` rend `null`, jamais « presque la cible ». Une
incohérence interne (le plan ne rend pas ce qu'il annonce) lève, et
`catalogue.js › signalerException` la journalise : échec bruyant.

## 3. Ce que la scène montre

La même mise en scène que `mrd`, passe après passe, en réutilisant ses helpers :

1. **chiffre à chiffre** (`substitute`), une fois, pour les nombres à plusieurs
   chiffres ;
2. pour chaque passe : **la découpe** (`partition`, une accolade par paquet —
   c'est la décision, et c'est elle qui triche), puis **une étape par
   addition** : `insertOperators` + `sum` ; si la somme déborde, soit
   `substitute` l'écrit chiffre à chiffre (`8 + 7 + 1 = 16 → 1 6`), soit
   `reduce` la ramène à sa racine, un palier par geste
   (`9 + 3 + 3 = 15 → 1 + 5 → 6`). La seconde passe se nomme dans son titre.

Aucune valeur ne disparaît sans avoir été additionnée sous les yeux ; `sum`
recoupe chaque somme, `reduce` chaque éclatement, `merge`/`substitute` refusent
un texte faux. Sur les six cas atteints, le scénario de la voie sans perte passe
`validerScenario` (0 violation) et compile dans `src/visuel/compile.js` sans
avertissement (glyphes chargés pour `mtrc`).

Titres (`titres.js`) : « Par redécoupage exact », forme courte « additions sans
reste », précision « tout fondu dans la cible » ; comme `mrd`, il n'est jamais
vedette d'une voie (il relit, il ne convertit pas).

## 4. Ce qu'il a fallu toucher dans la recherche

Sans rien changer à `score.js`, l'opérateur était exploré mais **jamais
proposé** : sur « Millicent Billette » visant 1998, quatre vecteurs exacts
existaient et aucun n'atteignait la liste. Le faisceau de `vecteursDeSix`
(`assemblage.js`) trie sur le *compte* de chiffres utiles, où `1998` (quatre)
perd contre `199181998199816` (douze), et le siège de qualité ne le rattrapait
pas. Trois retouches, toutes mesurées :

- `elegance.js › ABSORBENT_PAR_ADDITION` : `m.redecoupageExact` se paie comme
  `mrd` (par chiffre absorbé, dilué, dégressif). Il n'entre **pas** dans
  `A_MERITER_SA_PLACE` : il ne produit rien « en masse », il écrit la cible ou
  se tait — l'y mettre le rangeait derrière toute voie honnête qui *porte* les
  chiffres sans les *écrire*.
- `assemblage.js › nettete` : la netteté du siège de qualité comptait les
  chiffres hors alphabet ; `19992889988` valait zéro alors que le verdict en
  jette sept. Elle compte maintenant **ce que le verdict jettera** (largeur −
  séries × longueur), la grandeur même de `jeteesAuTri`.
- `assemblage.js › lues` : entre deux voies nettes, « ne pas supprimer de
  caractères » (le critère de l'auteur cité dans le fichier) se lit avant la
  brièveté — `fl+tca+mt9+mrdE` (17 lettres) passe devant `fc+tca+mqwc+mrdE`
  (11 consonnes) pour le même `1998`.

## 5. Mesures

Relevé au banc, filet temporel débranché. « Avant » = le dépôt principal sans
`mrdE` ; « après » = ce worktree.

| saisie → cible | avant : meilleure voie (R · jetées · reliquat · séries · étapes) | après : voie sans perte, rang par défaut | étapes | exhaustivité 200 | + quantité 0 |
|---|---|---|---|---|---|
| Sarah Kerrigan → 31031998 | `fl+tca+masc+mrd` (615 · 5 · 2 · 1 · 23) | **aucune** | — | — | — |
| Henri Prunelle Chochotte → 01111984 | `fl+tca+mtrc+mrd` (727 · 3 · 0 · 1 · 31) | **aucune** | — | — | — |
| Millicent Billette → 1998 | `fl+tca+mz26+mrd` (533 · 7 · 4 · 2 · 30) | `fl+tca+mt9+mrdE`, rang 1 (1 série) | 27 | rang 5 | rang 1 |
| Donald Trump → 666 | `fatb+tca+mt9+mr9,fr3+tca+mhe+mrn` (818 · 2 · 2 · 3 · 31) | `fl+tca+mx6+mrdE`, rang 1 (2 séries ; 4 avec `0:fr22;`) | 23 | rang 1 | rang 1 |
| Le chat dort sur le tapis rouge → 666 | `2:ffr5;fl+tca+m14+meg` (827 · 5 · 5 · 8 · 40) | `fl+tca+mtrc+mrdE`, rang 1 (2 séries) | 37 | rang 8 | rang 1 |
| hope → 666 | `tca+m14` (750 · 1 · 0 · 1 · 5) | `ffr+tca+mgr+mrdE`, rang 1 (1 série) | 14 | rang 3 | rang 1 |
| Capitalisme → 666 | `fr21+tca+mx6+mrd` (642 · 5 · 4 · 3 · 34) | `tca+mz26+mrdE`, rang 1 (1 série) | 21 | rang 1 | rang 1 |
| Éléonore à Nîmes → 111 | `nm,nm,nm` (— · 0 · 0 · — · 5) | `fl+tca+ma1+mrdE`, rang 1 (2 séries) | 22 | rang 15 | rang 1 |

Toutes les voies sans perte ont R = 1000, brut = 1000, jetées = 0, reliquat = 0.

**Pourquoi « exhaustivité 200 » seule ne les remonte pas partout.** En mode
personnalisé, `score.js › ordrePondere` range les voies par **nombre de séries
avant le score** tant que le curseur de quantité est au défaut ou au-dessus ;
une voie exacte à une série ne peut donc pas passer devant une voie à deux
séries qui jette, quel que soit son score (sur `hope`, la voie sans perte a le
score 6188 contre 3597 à la tête, et reste 3ᵉ). Dès que la quantité descend
sous le défaut (`quantite: 0`), le score commande et la voie sans perte est
première sur les six cas. C'est un fait de `score.js`, hors périmètre ici.

**Les deux cas d'ouverture restent sans voie**, et ce n'est pas la recherche :
c'est l'arithmétique de la famille. Sur « Sarah Kerrigan → 31031998 », parmi les
210 vecteurs que les filtres × mappeurs produisent, huit seulement sont congrus
modulo 9 (`fl+tca+mexb` → `2232341334223`, `fc+tca+m14` → `87657766`…), et
aucun n'a la structure voulue (un `0` à naître d'une somme finissant par 0 au
troisième rang, huit chiffres à écrire depuis huit ou treize). Sur
« Henri Prunelle Chochotte → 01111984 », le 0 de tête interdit tout : aucun
mappeur ne rend 0 pour la première lettre. Pour ces cibles-là il faut un levier
qui casse l'invariant modulo 9 — la multiplication (l'autre piste), ou une
soustraction — ; l'addition seule ne peut pas.

**Coût.** Le plan coûte 1 à 4 ms sur une ligne de 20 à 36 chiffres et 0,1 ms
quand l'invariant refuse ; mémoïsé par ligne. Temps de `resoudre` inchangé au
bruit près (Sarah Kerrigan : 4,4 s avec, 5,6 s sans, filet débranché).

## 6. Tests

Verts : `catalogue.test.js` (vecteur témoin `mrdE` : `[6,5,1,9,3,3] → [6,6,6]`,
et un bloc dédié — exactitude, racine, seconde passe, partage, refus, mise en
scène), `readme.test.js`, `langues.test.js` (161 opérateurs), `url.test.js`,
`scenario.test.js`, `integration-visuel.test.js`, `visuel/tests/*` — 478/478.
Également verts : `titres`, `curseurs`, `cible`, `progression`, `etalonnage`,
`base58`.

⚠️ **Deux tests de `elegance.test.js` rougissent, sur un seul cas : « Donald
Trump ».** Les quatre cas de référence de l'auteur gèlent leur tête de liste ;
sur celui-ci, la tête passe de la moisson à trois séries
(`fatb+tca+mt9+mr9,fr3+tca+mhe+mrn`, R = 818, deux valeurs jetées) à la voie
exacte `fl+tca+mx6+mrdE` (R = 1000, rien de jeté, deux séries — quatre avec la
retouche `0:fr22;`). Les trois autres références (`hope-hope-hope.fr`,
`https://hope-hope-hope.fr/`, `Macron`) ne bougent pas. Ce n'est pas un
arbitrage que je peux prendre : c'est la vitrine de l'auteur. Les deux tests
sont laissés tels quels ; les faire passer revient à changer les attendus de
« Donald Trump » (`MOISSON`, 3 → `GROUPEMENT`, 4), ou, si l'auteur tient à
l'ancienne tête par défaut, à donner à `mrdE` un palier d'élégance propre dans
`elegance.js` — ce qui irait contre le « bonus d'exhaustivité » demandé.
