# Inspirations — le feu du verdict

Les six références données par l'autrice, dans son ordre, avec son jugement.

| # | lien | son verdict |
|---|---|---|
| 1 | https://codepen.io/atnyman/pen/nmEyjK | — |
| 2 | https://codepen.io/firstwebdesigner/pen/vYQyyZY | « le moins convaincant du lot » |
| 3 | https://codepen.io/YusukeNakaya/pen/vJKwZw | — |
| 4 | https://codepen.io/osublake/pen/pqNXoq | — |
| 5 | https://codepen.io/BlackStar1991/pen/xxVOdJb | — |
| 6 | https://codepen.io/pizza3/pen/MWyxYjw | « **le plus convaincant**, mais si on l'adopte, il faut le faire tourner sans dépendance réseau, donc pas avec des CDN unpkg tels que l'exemple les propose » |

## ✔ Les six sources SONT ici — et voici par où elles sont passées

Le constat « CodePen illisible » était juste pour deux voies sur trois, mais il
manquait la bonne. La troisième, `cdpn.io/USER/fullpage/ID`, ne rend pas une
page de défi : elle rend **la page de résultat de CodePen**, qui porte le pen
entier dans l'attribut `srcdoc` de son iframe. Il suffit de le déséchapper.

| ce qui a été tenté | résultat |
|---|---|
| `codepen.io/USER/pen/ID` | **403** |
| `codepen.io/api/oembed?url=…` | défi Cloudflare |
| `cdpn.io/USER/fullpage/ID` | **200 — et le pen est dans `srcdoc`** ✔ |

Les six sont donc **rapatriés dans ce dossier**, un dossier par pen, avec leur
HTML, leur CSS, leur JS inline, et la liste des dépendances qu'ils vont chercher
par CDN. Plus personne n'a à refaire la manœuvre, et le jour où CodePen ferme,
la référence reste. Chaque `SOURCE.txt` redit d'où vient son fichier.

## Ce qu'on cherche, et ce qu'on ne cherche pas

L'autrice, après avoir vu la première tentative : « **Je ne veux pas un feu
derrière chaque chiffre, mais que les chiffres eux-mêmes s'enflamment** (de même
que les cornes). » Et trois reproches à la version écartée : les foyers étaient
**identiques** l'un à l'autre, **réguliers** dans leur battement, et **derrière**
les glyphes au lieu de les habiter.

La cible est donc un feu qui **épouse la forme du chiffre** — qui sort de ses
contours, lèche ses bords, monte depuis ses arêtes — et non une lueur d'ambiance
posée dessous.

## Les contraintes de la maison

- **Zéro appel réseau à l'exécution** : le pied de page le promet. Une
  dépendance peut être **vendorisée** dans le dépôt et servie localement — ce
  qui est interdit, c'est le CDN, pas la bibliothèque.
- **Déterminisme** (CONTRACTS §4.4) : ni `Date.now`, ni `Math.random` dans ce
  qui décide de la timeline. La variété entre les six foyers doit se dériver de
  l'indice du chiffre ; l'irrégularité du battement, de la superposition
  d'oscillations incommensurables ou d'un bruit **calculé**.
- **Coût** : le décor grossit ×8 au verdict. Un `feTurbulence` recalculé à
  chaque image est ruineux à cette échelle.
- **Firefox** : jamais d'`opacity` animée sur un élément portant aussi une
  transformation individuelle (`src/visuel/tests/compositeur.test.js`).
- `prefers-reduced-motion` doit donner un feu **fixe**.
- Le feu doit **survivre au verdict** : idéalement germer juste après la foudre
  et perdurer, en s'éteignant si l'on revient avant la foudre.

---

# Ce qu'on prend à chacun, et ce qu'on lui refuse

## 1. atnyman — « Animated Fire Text-Shadow »
<https://codepen.io/atnyman/pen/nmEyjK>

**Technique réelle.** CSS pur, zéro JS. Un empilement de **sept `text-shadow`**
sur un `<span>`, chacun décalé plus haut et plus flou que le précédent, du blanc
chaud à la braise éteinte :
`#fefcc9 → #feec85 → #ffae34 → #ec760c → #cd4606 → #973716 → #451b0e`.
Une `@keyframes` à deux images (`alternate`, 0,65 s et 1 s selon la lettre) fait
respirer les décalages.

**★★ Ce qu'on garde — TOUT, et c'est de ce pen que sort le feu final.**

Deux choses, et la seconde a été comprise en retard.

**(a) La rampe thermique.** C'est la seule des six à énoncer explicitement la
physique du truc : un feu n'a pas *une* couleur, il a un **gradient de
température** — blanc au cœur, jaune, orange, rouge, brun à la fumée — et ce
gradient est **orienté vers le haut**, parce que c'est là que la chaleur part.
Le brasier d'avant n'avait qu'une teinte (`#FF7A2E`) qui s'éteignait en rond :
c'est très exactement pour ça qu'il lisait comme une tache et pas comme du feu.
Les quatre paliers de `feu.js` (`RAMPE`) viennent de là, ramenés aux jetons de
thème.

**(b) ★ LA TECHNIQUE, qu'on avait d'abord écartée à tort.** Ce pen empile sept
`text-shadow` **sur le même texte** : sept copies de la lettre, décalées vers le
haut, de plus en plus larges, de plus en plus froides. Autrement dit, **le feu y
a exactement la forme de la lettre — parce que c'est la lettre**.

C'est le seul des six qui fasse ça, et c'est précisément ce que l'autrice
demande : « je ne veux pas un feu derrière chaque chiffre, mais que les chiffres
eux-mêmes s'enflamment ». La première lecture avait noté « on garde la rampe, on
jette la technique » ; c'était l'inverse qu'il fallait faire. `feu.js` redessine
donc le glyphe quatre fois — ce sont les `ECHOS` —, chaque copie étant décalée
plus haut, **étirée en hauteur et resserrée en largeur** (l'effilement, qu'une
ombre obtient par son flou et qu'on obtient par la pile), penchée, et refroidie.

**Ce qu'on écarte.** Le moyen, pas la fin : `text-shadow` n'existe pas en SVG,
et `feDropShadow` est un filtre, donc recalculé à chaque image et à chaque
échelle — rédhibitoire sur un décor qui grossit ×8. On redessine des `<text>`
plutôt que de projeter des ombres ; le résultat est le même et il ne coûte pas
un filtre. Et l'animation d'origine : deux images qui font l'aller-retour, ce
n'est pas une flamme, c'est une **pulsation**. Un feu ne bat pas en mesure —
voir le n° 3.

## 2. firstwebdesigner — « Fire Animation Text Effect With CSS »
<https://codepen.io/firstwebdesigner/pen/vYQyyZY>
« le moins convaincant du lot » (l'auteur)

**Technique réelle.** La même que la précédente, en plus pauvre : quatre couches
de `text-shadow` au lieu de sept, une `@keyframes` `flicker` de 2 s à trois
images qui se contente d'agrandir les rayons de flou.

**Ce qu'on garde.** Une seule chose, et c'est une confirmation : **le cœur doit
tirer vers le blanc** (`0 -1px 3px #fff` en couche interne). Un feu dont la
partie la plus lumineuse est orange paraît toujours en plastique.

**Ce qu'on écarte.** Tout le reste. Et l'auteur a raison sur la cause de sa
faiblesse : ici l'animation ne fait **que grossir le flou**, sans jamais déplacer
quoi que ce soit. Rien ne monte, rien ne se détache, rien ne meurt. C'est un
halo qui respire, et la comparaison avec la n° 3 dit exactement ce qui manque.

---

## 3. YusukeNakaya — « Only CSS: Fire » ★ la clé du mouvement
<https://codepen.io/YusukeNakaya/pen/vJKwZw>

**Technique réelle.** CSS pur, et un très joli tour de passe-passe. Un rectangle
orange (`#ff9900`) à bordures rondes reçoit `filter: blur(20px) contrast(30)` :
le flou fond les formes, le contraste extrême **re-seuille** le résultat, et
l'ensemble se comporte comme des *metaballs* — des taches voisines se soudent en
une silhouette unique à bord franc. Une quarantaine de disques NOIRS
(`.burn`) rongent la flamme par le bas ; chacun monte de 600 px, en boucle, avec
**sa propre durée** (1 054 ms, 1 136 ms, 1 391 ms, 1 933 ms, 2 950 ms… quarante
valeurs distinctes) et un `animation-delay: -3000ms`.

**★ Ce qu'on garde — LE PROCÉDÉ DE VIE, et c'est le plus important des six.**
Un feu convaincant n'a pas besoin d'être calculé : il lui faut **beaucoup de
petits objets simples dont les périodes ne se divisent pas**. Chaque langue est
une boucle triviale ; c'est leur **battement** — au sens acoustique — qui fait
que l'ensemble ne se répète jamais à l'œil. `feu.js` reprend exactement ce
dispositif : quatre langues par foyer, chacune avec sa période et sa phase,
tirées d'une table gelée et décalées par une empreinte de l'identifiant du
jeton, si bien que **deux 6 voisins ne brûlent jamais en cadence**.

Second emprunt : **les langues MONTENT et MEURENT**, elles ne palpitent pas sur
place (le reproche fait aux n° 1 et 2). Troisième : la valeur d'un
`animation-delay` **négatif** — l'animation est déjà à mi-course à la première
image, donc rien ne « démarre » de façon visible.

**Ce qu'on écarte.** `blur(20px) contrast(30)` — un filtre, recalculé à chaque
image ET à chaque échelle, sur un décor qui grossit d'un facteur huit au
verdict. C'est nommément ce que CONTRACTS interdit, et sur une machine modeste
c'est le genre d'effet qui fait tomber la scène à quinze images par seconde. On
obtient la même **soudure** sans filtre : des langues qui se recouvrent, peintes
en aplats opaques d'une même rampe, se lisent comme une seule masse — c'est le
principe de la n° 6.

---

## 4. osublake — « Flame in the wind »
<https://codepen.io/osublake/pen/pqNXoq>

**Technique réelle.** PixiJS 4.8.4 (cdnjs) + un `Filter` WebGL portant un
fragment shader repris de Shadertoy (@kuvkar). Le bruit fractal n'est pas
calculé : il est **échantillonné dans une texture PNG téléchargée sur S3**
(`s3-us-west-2.amazonaws.com/…/noise-texture-11.png`), en trois octaves. La
flamme est une fonction de distance à l'axe (`1.3 - length(uv.x) * 5.0`),
tordue par une rotation dont l'amplitude croît avec la hauteur
(`smoothstep(-0.2, 0.4, uv.y) * 0.45`), plus un liseré bleu au pied.

**★ Ce qu'on garde — LA TORSION CROÎT AVEC LA HAUTEUR.** C'est l'observation
juste, et elle ne coûte rien à reprendre : le **pied d'une flamme est stable, sa
pointe divague**. Dans `languePath()`, le biais latéral ne s'applique qu'aux
points de contrôle du haut ; le pied reste posé où il est. Sans ça une langue
qui ondule ressemble à un drapeau, pas à du feu.

Second emprunt, plus discret : la flamme est **une fonction de la distance à un
axe**, donc elle est étroite et symétrique en bas et s'évase en montant. C'est
la forme de base de la goutte renversée qu'on dessine.

**Ce qu'on écarte.** Tout le reste, et sans hésitation : PixiJS, WebGL, un CDN,
**et une texture téléchargée** — trois violations de « aucun appel réseau après
le chargement » dans une seule page. Le liseré bleu, aussi : il suppose une
combustion de gaz, pas des chiffres qui brûlent.

---

## 5. BlackStar1991 — « Fire Circle »
<https://codepen.io/BlackStar1991/pen/xxVOdJb>

**Technique réelle.** Un anneau en `box-shadow` + `-webkit-box-reflect`, passé
dans `filter: url(#wavy) blur(1px)` où `#wavy` est un `feTurbulence`
(`numOctaves=5`) suivi d'un `feDisplacementMap scale=30` — avec un
`<animate>` SVG qui fait varier `baseFrequency` de 0,02 à 0,005 sur 60 s. Et un
`hue-rotate(0→360deg)` sur 5 s.

**Ce qu'on garde — l'idée, pas le moyen.** Une silhouette de feu, c'est **une
forme lisse déplacée par du bruit**. On la reprend telle quelle, mais le
déplacement porte sur les **points de contrôle** de quelques courbes de Bézier,
calculés une fois, au lieu de porter sur les pixels, recalculés soixante fois par
seconde.

**Ce qu'on écarte, et c'est le plus net des six refus.** `feTurbulence` est le
filtre le plus coûteux de la spécification SVG, `feDisplacementMap` rééchantillonne
toute la surface, et animer `baseFrequency` interdit au navigateur de mettre le
résultat en cache — le filtre est refait **à chaque image**, à la résolution
d'affichage, donc huit fois plus grande au verdict. C'est le cas d'école que
CONTRACTS §3.1 nomme. Et le `hue-rotate` : un feu qui parcourt la roue des
teintes n'est pas un feu, c'est une enseigne.

---

## 6. pizza3 — « Toon Fire Shader » ★ le préféré de l'auteur — **ÉCARTÉ**
<https://codepen.io/pizza3/pen/MWyxYjw> · source complète dans `06-pizza3/`
« le plus convaincant, mais si on l'adopte, il faut le faire tourner sans
dépendance réseau, donc pas avec des CDN unpkg tels que l'exemple les propose »
puis « **peux-tu tenter ma version préférée ou me dire pourquoi tu l'écartes ?** »

**Technique réelle**, relevée dans `06-pizza3/pen.js`. `three.js r120` +
`dat.GUI` (cdnjs) + `EffectComposer`, `RenderPass` et `UnrealBloomPass`
(unpkg). Le shader : un fBm à cinq octaves, chaque octave tournée de 0,5 rad
pour casser le biais axial ; les `uv` défilent vers le bas
(`newUv = uv + vec2(0.0, -time*0.0004)`), donc la matière monte ; puis **deux
seuils** (`setOpacity`, `tone < 0.99 ⇒ alpha 0`) découpent le bruit en deux
bandes de couleur plates dont la différence donne un liseré net. Le tout est
peint sur une **`SphereGeometry(1.7, 32, 32)`** et repassé dans un bloom
(`exposure 2.8`, `bloomStrength 1.7`).

### ★ Pourquoi il est écarté — cinq raisons, dont trois sont structurelles

La vendorisation est autorisée (« packager une dépendance en interne pour la
servir localement, c'est ok »), ce qui lève l'objection de réseau. Les cinq
raisons ci-dessous ne sont donc **pas** « c'est un CDN » :

1. **Le poids.** `three.min.js` r120 pèse **642 741 octets** bruts (159 887
   gzippés), plus 20 860 octets de post-traitement. Le bundle JS du site fait
   **448 690 octets** : on le **doublerait** pour un effet. Le budget de
   CONTRACTS §7.6 est de 260 Ko servis, et les quatre polices n'en consomment
   que 67 712.

2. ★ **Le contexte de rendu est étranger.** C'est un canvas WebGL. Nos 666 et
   nos cornes sont du SVG dans un `viewBox` que la timeline déplace (`@pan`),
   agrandit ×8 au verdict et parcourt en scrubbing. Faire suivre un canvas à
   cette géométrie, c'est **dupliquer toute la chaîne de mise en page dans un
   second système de coordonnées** — contre la doctrine « une seule source de
   géométrie ». Et l'insérer DANS la scène passerait par `foreignObject`, que
   CONTRACTS §3.2 règle 9 interdit absolument (canvas *tainted* à l'export).

3. ★ **Le feu cesserait d'être un décor accroché.** Hors du SVG, il ne peut plus
   suivre chaque 6 au reflow ni grandir avec lui par `data.suit` (§3.2 règle
   10) : il faudrait reprojeter chaque chiffre à chaque image. C'est exactement
   la classe de défauts que l'amendement « UNE CORNE, UN NŒUD » a supprimée par
   construction, après l'avoir mesurée à 7,4 unités de dérive.

4. **Le shader peint une SPHÈRE.** C'est une boule de feu, pas un feu qui
   épouse une silhouette arbitraire. Le masquer sur la forme du `666`
   demanderait de rendre les glyphes dans une texture et de l'échantillonner :
   ce n'est plus une adoption, c'est une réécriture. Et **le bloom fait toute sa
   beauté** — or `UnrealBloomPass` s'applique à la passe entière : il laverait
   le reste de la scène.

5. **Déterminisme.** Une boucle de rendu WebGL dépend de la cadence d'images ;
   son `time` vient d'un `requestAnimationFrame` libre. Notre lecteur est
   parcourable et tout état y est fonction du temps (CONTRACTS §3, §4.4) : tirer
   la jauge ne ramènerait pas le shader à la même image.

Aucune de ces raisons n'est rédhibitoire prise isolément ; ensemble, c'est
disproportionné et ça combat l'architecture.

### Ce qu'on lui prend quand même

Le **parti « toon »** — un feu se lit d'autant mieux qu'il a une hiérarchie
franche du sombre au clair, et non un dégradé mou — et **la matière qui monte à
travers une enveloppe immobile**. Les deux se retrouvent dans la pile d'ombres
d'atnyman : cinq paliers nettement distincts, et des couleurs qui remontent la
rampe d'un cran entre les deux états.


## Récapitulatif — d'où vient chaque morceau du feu final

Le feu retenu est **celui d'atnyman (n° 1)**, transposé de `text-shadow` en
`filter: drop-shadow()` — ce qui est exactement l'adaptation demandée : « surtout
si tu peux l'adapter pour pouvoir l'utiliser aussi bien pour du texte que pour
des formes SVG ». `text-shadow` ne s'applique qu'au texte ; `drop-shadow()`
s'applique à n'importe quel élément SVG, donc **aux chiffres ET aux cornes**.

| Morceau | Vient de |
|---|---|
| ★ **La pile d'ombres sur le glyphe LUI-MÊME** — le feu est le halo du chiffre | **1** (atnyman) |
| ★ **Le flou**, sans lequel une pile de copies se lit comme des feuilles et non comme du feu | **1** (atnyman) — c'est ce qui manquait à la tentative précédente |
| ★ **La chaleur qui MONTE dans la pile** (les couleurs remontent la rampe entre les deux états) | **1** (atnyman), son vrai trait de génie |
| Le corps peint couleur de fond, invisible, dont on ne voit que les ombres | **1** (atnyman : `color:#000` sur `background:#111`) |
| Hiérarchie franche du sombre au clair, matière qui monte | **6** (pizza3), l'esprit sans l'implémentation |
| Le cœur doit tirer vers le blanc | **2** (firstwebdesigner), sa seule contribution |
| Périodes **incommensurables**, phases décalées par foyer, retards négatifs | **3** (YusukeNakaya), rendu **déterministe** |
| La torsion croît avec la hauteur (les décalages latéraux alternent en montant) | **4** (osublake) |
| Déplacer une forme lisse plutôt que rééchantillonner des pixels | **5** (BlackStar1991), par contraste |

Et rien, absolument rien, ne vient d'un CDN ou d'un tirage au sort.

## Les trois tentatives, et ce que chacune a appris

| # | montage | verdict de l'auteur | ce qu'on en garde |
|---|---|---|---|
| 1 | un **foyer** dessiné derrière chaque chiffre | « je ne veux pas un feu derrière chaque chiffre, mais que les chiffres eux-mêmes s'enflamment » | une flamme et un glyphe n'ont pas la même forme : aucun dessin ne rattrape ça |
| 2 | des **copies nettes** du glyphe, décalées et refroidies | « ça ressemble plus à des **feuilles qui s'échappent des 6** qu'à des flammes » | la bonne idée, mais **sans le flou une copie se lit comme un objet** — c'est le flou qui fait le feu |
| 3 | la **pile de `drop-shadow()`** d'atnyman | — | — |

## Ce que la version finale répond aux trois reproches

| reproche | remède | où |
|---|---|---|
| « **identiques** » | empreinte FNV-1a de l'identifiant du jeton, **avec avalanche finale** — elle donne à chaque foyer sa période, sa phase et son ampleur | `feu.js`, `graine()` |
| « **réguliers** » | périodes tirées entre deux **nombres premiers**, une par foyer ; aucune paire ne se remet en phase avant plusieurs minutes | `feu.js`, `PERIODES` ; un test le mesure |
| « **derrière** » | il n'y a plus rien derrière : le feu **est le halo du chiffre**, et la corne brûle avec, dans le même nœud | `feu.js` ; `dom.js`, `construireBrasier` |

## Deux défauts que les tests ont attrapés, et que l'œil n'aurait jamais vus

1. **Des périodes toutes multiples de dix.** 1 130 / 1 490 / 1 870 ms « se
   ressemblent peu » mais ont 10 pour diviseur commun : le feu se rejouait à
   l'identique toutes les **168 secondes**. Un `pgcd` en CI l'exige désormais.
2. ★ **FNV-1a mélange mal ses bits de poids fort.** Sur des identifiants qui ne
   diffèrent que par leur fin (`d0`, `d1`, `d2`…), les vingt-quatre bits de tête
   restaient presque les mêmes : les quinze foyers d'une moisson tiraient
   **cinq** ampleurs distinctes au lieu de quinze, toutes entre 0,94 et 1,04.
   Autrement dit, la variété que l'auteur réclamait n'avait lieu qu'en
   apparence. Un finaliseur `lowbias32` règle le compte ; un test compte les
   valeurs distinctes.

## Le coût, mesuré — et ce qu'il a changé au montage

`src/gfx/_feu-perf.html`, rendu **logiciel** (sans GPU, donc pire cas) :

| montage | 6 foyers ×4 | 15 foyers ×8 |
|---|---|---|
| filtre **animé** (le montage d'atnyman transposé tel quel) | **> 100 %** d'un cœur | **> 100 %** |
| filtre **figé** | **0 %** | — |
| **deux filtres figés, opacité animée** (retenu) | **25 %** | **51 %** |

★ **Un filtre statique est tramé une fois et mis en cache ; un filtre animé est
refait à chaque image.** Toute la dépense est là — pas dans le nombre de
couches, qui ne bouge presque rien. Le feu est donc **deux corps superposés à
chaînes figées**, dont l'un voit son opacité aller et venir : `opacity` est un
canal de composition, le moteur mêle deux tramages déjà en cache. On garde la
respiration d'atnyman sans payer une passe de flou par image.

★ Et le corps de braise garde son opacité à un, jamais animée : c'est lui qui
**scelle** l'empreinte du glyphe en couleur de nuit. Deux corps qui se
fondraient l'un dans l'autre laisseraient à mi-fondu un trou par lequel les
halos remonteraient sous le chiffre — et le contraste du verdict avec.
