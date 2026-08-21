# NumHeroLOLgeek — Direction de design

> Recherche design. Aucune implémentation applicative.
> Contraintes de stack actées : **vanilla JS, zéro build, zéro dépendance npm, hébergement statique**.
> Conséquences : pas de framework CSS, pas de CDN de polices (Google Fonts interdit), polices libres **self-hostées en `.woff2`**, tout doit être écrivable à la main en CSS/SVG.
> Prototype de logo vérifié dans le navigateur : `.planning/research/proto/logo-proto.html` (+ `logo-proto-revealed.html`).

---

## 0. Le principe directeur

Le ressort comique du site est **la rigueur apparente au service de l'absurde**. Le design ne doit
jamais faire de clin d'œil, jamais être « rigolo ». Il doit avoir l'air d'un **appareil de preuve** :
un traité, une démonstration, un registre. C'est le contenu qui est absurde ; la forme, elle, doit
être irréprochable. Toute la charte découle de cette règle :

> **Rien dans l'habillage ne doit trahir la blague. Le seul endroit où l'on cligne de l'œil, c'est le logo — et seulement si on le regarde deux fois.**

---

## 1. Le logo-titre — analyse de la contrainte

### 1.1 Inventaire des lettres

| | chaîne | lettres |
|---|---|---|
| Lecture 1 (visible, immédiate) | `Numérologic` | N u m é r o l o g i c → **11 glyphes** |
| Lecture 2 (cachée) | `Num Hero LOL geek` | n u m h e r o l o l g e e k → **14 lettres** |

Différence : **3 lettres en trop** dans la lecture cachée (`h`, le 2ᵉ `l` de LOL, un `e` de geek),
et **3 lettres à travestir** (`i` ← `e`+`e`, `c` ← `k`, `é` ← `h`+`e`).

Recouvrement, position par position :

```
visible :  N   u   m   é   r   o   l   o   ʼ   g   i    c
caché   :  n   u   m  h+e  r   o   l   o   l   g  e+e   k
groupe  : |------num------|--hero--|---lol---|----geek----|
```

**Découverte structurante** : la lecture cachée se découpe en **4 mots de 3 fentes chacun**
(`num` = 1-3, `hero` = 4-6, `lol` = 7-9, `geek` = 10-12). 12 fentes, 4 groupes de 3.
Cela donne gratuitement : une grille de composition, un rythme d'animation par groupe
(stagger de 4 temps), et **3 intervalles entre les 4 groupes** — dans lesquels on peut faire
apparaître **un « 6 » chacun, soit 666**, à l'état révélé. C'est l'easter egg le plus économique
possible : il est déjà dans la structure.

### 1.2 Les quatre travestissements

| Fente | Statique (on lit) | Révélé (on lit) | Mécanique |
|---|---|---|---|
| 4 | `é` | `he` | Le `h` est **superposé** au `e` (même chasse, aucun décalage). Son fût ascendant est dessiné en filet fantôme sur le bord gauche du `e`, son épaule retombe sur la terminaison droite du `e`. **La pointe détachée de ce fût, inclinée, est l'accent aigu.** |
| 9 | `ʼ` (apostrophe) | `l` | Le 2ᵉ L de LOL, réduit à une apostrophe haute entre `lo` et `gic` (spéc README). À la révélation elle descend jusqu'à la ligne de base et devient un `l` complet. |
| 11 | `i` | `e` + `e` | Deux `e` empilés : le `e` du haut (≈ 0,40 em) tient lieu de **point**, le `e` du bas (≈ 0,66 em) tient lieu de **fût**. |
| 12 | `c` + éperon | `k` | Un `c` dont les deux terminaisons sont tirées selon les vecteurs du `k` (bras montant à droite, jambe descendante à droite) + un **court moignon d'ascendante** à gauche. À la révélation, bras et jambe s'allongent et le fût monte. |

### 1.3 Trois constructions concrètes

#### **Construction A — « l'apostrophe au bon endroit »** ✅ recommandée

```
fente   1   2   3   4     5   6   7   8   9    10   11    12
visible N   u   m   é     r   o   l   o   ʼ    g    i     c
caché   n   u   m  (h)e   r   o   l   o  (l)   g   e·e   k(c+éperon)
```

* Lecture cachée dans l'ordre, sans acrobatie : `n-u-m | h-e-r-o | l-o-l | g-e-e-k` ✔
* Lecture visible : `Numérologic` — **avec l'accent aigu**, ce qui est bien plus fort en français
  que `Numerologic` : le lecteur francophone lit spontanément « numérologique ».
* Vérifié au rendu (capture du prototype) : **la chaîne se lit `Numérologic` au premier coup d'œil**,
  l'apostrophe passe pour une marque de prime / une ponctuation typographique discrète.
* Faiblesse assumée : l'apostrophe entre `lo` et `gic` reste un léger corps étranger. Atténuation :
  la dessiner **en filet fin (poids ~35 % du trait) et légèrement grisée** (opacité 0,55) à l'état
  de repos, pour qu'elle se lise comme un détail de gravure et non comme une ponctuation.

#### **Construction B — « Num'Hero Logic » (littéral du titre du README)**

L'apostrophe est placée **après `Num`** : `Num'érologic`, l'apostrophe faisant office d'accent aigu.
Silhouette visible plus « française » encore.
**Rejetée** : l'ordre de lecture caché devient `num-l-hero-lo-geek`. Le `LOL` n'est plus contigu,
donc le mot n'est plus lisible. Le README est contradictoire sur ce point (le titre dit
« Num'Hero Logic », la parenthèse dit « entre lo et gic ») ; **la parenthèse a raison**, c'est la
seule position qui préserve `LOL`.

#### **Construction C — « le L dans le g »**

Pas d'apostrophe du tout : le 2ᵉ `l` est fusionné dans le `g` (le fût de l'`l` devient le fût droit
du `g`, avec un petit empattement au pied). Silhouette visible **parfaitement propre** :
`Numérologic`, aucun corps étranger.
**Rejetée** : le `l` devient indevinable même en cherchant, et on perd la fente 9, donc la grille
4×3 et l'easter egg des 666. On s'écarte aussi de la consigne explicite du README.

> **Recommandation : Construction A.** Elle est la seule à satisfaire simultanément
> (a) l'ordre de lecture caché, (b) la spéc du README, (c) une silhouette visible convaincante,
> et elle offre en prime la grille 4×3 et les trois 6.

### 1.4 Constat issu du prototype (à ne pas oublier à l'implémentation)

1. **Les chasses doivent être figées.** La révélation change la largeur apparente de plusieurs
   glyphes (le `i` devient deux `e`, le `c` devient un `k`). Si les glyphes sont dans un flux, le
   logo « respire » et devient illisible pendant la transition.
   → Chaque fente reçoit une **avance fixe**, définie une fois pour toutes ; la révélation se
   produit **sur place**, à l'intérieur du couloir de sa fente.
2. **La fente 11 doit être élargie.** Un `i` est étroit ; deux `e` empilés ne tiennent pas dedans.
   Réserver à la fente 11 un couloir d'environ **0,62 em** (au lieu de ~0,30 em pour un `i`), par
   un crénage local. Cela crée une très légère aération avant le `c` — imperceptible, et
   pratique puisque c'est aussi la frontière de mot cachée `lol|geek`.
3. **La couche fantôme est en `stroke`, pas en `fill`.** Les lettres cachées (`h`, `l`, bras/jambe
   du `k`) sont des tracés ouverts au trait, pas des glyphes pleins : à faible opacité un contour
   se lit comme un ornement de gravure, un aplat se lit comme une tache.

### 1.5 Squelette typographique du logo

Le logo est un **SVG de tracés dessinés à la main**, pas du texte. Il ne peut pas être du `<text>` :
les superpositions, l'accent-qui-est-un-fût et l'empilement des `e` ne sont pas exprimables en
OpenType sans fabriquer une fonte.

Squelette de référence pour dessiner ces tracés : **Bodoni Moda** (voir §2.2). Raisons :
contraste plein/délié extrême (les déliés sont déjà des filets, donc **les lettres fantômes se
fondent naturellement dans le vocabulaire de la fonte**), empattements filiformes horizontaux qui
donnent une base parfaite au bras du `k` et à l'apostrophe, et une aura « traité savant du
XVIIIᵉ » qui sert exactement le propos.

Structure SVG recommandée :

```svg
<svg viewBox="0 0 1200 300" role="img" aria-labelledby="lt ld" class="logo">
  <title id="lt">Numérologic</title>
  <desc id="ld">Le mot « Numérologic » dans lequel se cachent les mots
                « Num Hero LOL geek ».</desc>
  <g class="logo__base">   <!-- 12 tracés pleins, un par fente -->
  <g class="logo__ghost">  <!-- h, l, bras+jambe du k : tracés au trait -->
  <g class="logo__swap">   <!-- i ⇄ ee : les deux états superposés, opacité croisée -->
  <g class="logo__sixes">  <!-- 3 « 6 », opacité 0 au repos -->
</svg>
```

* `width: 100%; max-width: 34rem; height: auto` — le logo est **fluide**, jamais en `font-size`.
* Une seule couleur : `currentColor` sur les pleins, `currentColor` + `opacity` sur les fantômes.
  Le logo suit donc le thème sans variante de fichier.

### 1.6 La révélation interactive

**Trois états**, jamais deux : c'est ce qui permet de ne pas casser la lisibilité statique.

| État | Déclencheur | Ce qui se passe |
|---|---|---|
| **Repos** | par défaut | Fantômes à `opacity: .14`. On lit `Numérologic`. Point final. |
| **Éveil** | `:hover` / `:focus-visible` sur le logo | Fantômes à `opacity: .30`, l'éperon du `k` s'allonge de 20 %. **Rien ne bouge de place.** On sent qu'il y a quelque chose sans savoir quoi. C'est l'hameçon. |
| **Révélation** | clic / `Entrée` sur le logo (bouton `aria-expanded`) | 700 ms, stagger de 90 ms par groupe (num → hero → lol → geek) : les fantômes s'encrent à `opacity: 1`, l'apostrophe descend et s'allonge en `l`, le `i` se dissout dans les deux `e`, le bras et la jambe du `k` poussent, et les trois « 6 » dorés apparaissent dans les intervalles. Un soulignement fin marque les 4 groupes. |

Retour à l'état de repos au 2ᵉ clic, ou après 6 s d'inactivité (clin d'œil, et évite de laisser le
logo dans un état illisible).

Règles :
* Le survol **ne déclenche jamais** la révélation complète : on ne veut pas gâcher la découverte
  par un passage de souris accidentel, et sur mobile il n'y a pas de survol.
* La révélation est **mémorisée** (`localStorage`) : une fois découverte, l'état d'éveil devient
  légèrement plus marqué par défaut (`opacity: .20`), en récompense.
* `prefers-reduced-motion: reduce` → la révélation devient un **fondu croisé de 120 ms**, sans
  déplacement de l'apostrophe ni croissance du `k` (on permute directement les deux jeux de tracés).
* Accessibilité : le `<title>` du SVG donne la lecture visible ; le `<desc>` livre la blague.
  À l'état révélé, on bascule le `<title>` sur « Num Hero LOL geek ». Le `<h1>` de la page
  d'accueil est le SVG, doublé d'un texte `.visually-hidden` : `Numérologic — Num Hero LOL geek`.

### 1.7 Déclinaisons

| Taille | Traitement |
|---|---|
| ≥ 320 px de large | Logo complet, fantômes actifs. |
| 180–320 px (en-tête interne) | Logo complet, fantômes **désactivés** (`opacity: 0`), apostrophe conservée. |
| < 180 px | **Monogramme** : le glyphe de la fente 4 seul (le `é`/`he`) dans un carré à double filet. |
| Favicon / apple-touch | Un `6` en Bodoni doré sur fond `#0B0E14`, avec l'accent aigu du logo posé dessus. SVG + PNG 180 px. |

---

## 2. Direction artistique

### 2.1 La piste retenue : **« Le traité et le terminal »**

Trois pistes ont été pesées :

* *Grimoire ésotérique pur* → joli, mais on a vu 400 sites de tarot ; et surtout ça signale
  « fantaisie », donc ça **désamorce** la blague avant qu'elle ne soit faite.
* *Tableau noir de démonstration mathématique* → excellent pour la page démonstration, trop
  scolaire et trop pauvre pour porter une identité entière.
* ✅ **Traité savant + couche machine** : la page a l'apparence d'un **imprimé savant du XVIIIᵉ**
  (Bodoni, filets doubles, rubrication rouge, papier grainé), sur lequel se **surimprime une couche
  de terminal** (monospace, badges, numéros d'étape, vert phosphore) qui joue le rôle de
  l'appareil de mesure.

**Pourquoi elle est la bonne** : c'est la mise en forme littérale du gag. Le traité affirme
(« La vérité derrière… »), la machine mesure (`T-03/07`, `8+15+16+5 = 44 → 8`). Deux registres
graphiques qui se prennent tous les deux au sérieux, et dont la cohabitation produit à elle seule
l'effet comique — sans qu'aucun des deux n'ait besoin de faire le clown. En prime, les deux
couches ont des rôles fonctionnels distincts, ce qui rend l'interface plus lisible et pas seulement
plus jolie.

Vocabulaire concret :
* **Filets doubles** (deux traits de 1 px séparés de 2 px) autour des blocs importants — jamais
  d'ombre portée floue en thème clair : le papier ne flotte pas.
* **Rubrication** : le rouge sert à ce qu'il servait dans les manuscrits — signaler l'énoncé, la
  règle, le résultat. Jamais à décorer.
* **Grain** : `feTurbulence` en superposition, opacité 3,5 % (clair) / 5 % (sombre). Un seul SVG
  inline, zéro image.
* **Pas de coins arrondis** au-delà de 2 px. Le papier se coupe droit.
* **Ombre uniquement en « letterpress »** : un décalage dur `6px 6px 0` sans flou sur le bouton
  primaire, comme une empreinte de presse. En thème sombre, l'élévation se fait par **halo**
  (`box-shadow: 0 0 0 1px …, 0 0 24px -8px …`) et non par ombre.

### 2.2 Le couple typographique (trois voix, toutes libres et self-hostables)

| Rôle | Fonte | Licence | Source | Usage |
|---|---|---|---|---|
| **L'oracle** (affichage) | **Bodoni Moda** | SIL OFL 1.1 | `github.com/indestructible-type/Bodoni` | Logo (squelette), `h1`, `h2`, le « 666 », les grands nombres |
| **Le pédagogue** (texte) | **Spectral** | SIL OFL 1.1 | `github.com/productiontype/Spectral` | Paragraphes, intitulés de méthode, citations |
| **La machine** (mesure) | **JetBrains Mono** | SIL OFL 1.1 | `github.com/JetBrains/JetBrainsMono` | Calculs, saisie, badges, numéros d'étape, URL, boutons |

Pourquoi ce trio, et pas « Inter + gris » :
* **Bodoni Moda** est une didone à contraste extrême avec tailles optiques et axe variable. Elle
  fait autorité, elle est datée (donc « savante »), et ses déliés filiformes sont **la condition
  technique du logo** : c'est ce qui permet aux lettres fantômes de se fondre dans le dessin.
* **Spectral** est dessinée pour l'écran, avec un ton éditorial sérieux et de vraies italiques —
  indispensables pour les énoncés de règle. Elle tient à 15–18 px sur fond sombre, ce qu'EB
  Garamond (plus jolie, plus fragile) ne fait pas.
* **JetBrains Mono** a une grande hauteur d'x et des chiffres nets ; elle signale « calcul » sans
  ambiguïté et reste lisible à 12 px pour les badges.

**Chargement (zéro build)** — `.woff2` self-hostés dans `/fonts/`, sous-réglés Latin + français :

```css
@font-face{font-family:"Bodoni Moda";src:url(/fonts/bodoni-moda-var.woff2)format("woff2-variations");
           font-weight:400 900;font-style:normal;font-display:swap;}
@font-face{font-family:"Spectral";src:url(/fonts/spectral-400.woff2)format("woff2");
           font-weight:400;font-display:swap;}
@font-face{font-family:"Spectral";src:url(/fonts/spectral-400i.woff2)format("woff2");
           font-weight:400;font-style:italic;font-display:swap;}
@font-face{font-family:"Spectral";src:url(/fonts/spectral-600.woff2)format("woff2");
           font-weight:600;font-display:swap;}
@font-face{font-family:"JetBrains Mono";src:url(/fonts/jetbrains-mono-var.woff2)format("woff2-variations");
           font-weight:400 700;font-display:swap;}
```

* 6 fichiers, **budget cible ≤ 260 Ko** au total après sous-réglage.
* `<link rel="preload" as="font" type="font/woff2" crossorigin>` sur Spectral 400 et JetBrains Mono
  uniquement (le logo est du SVG, il n'attend aucune fonte).
* Piles de repli : `Georgia, "Times New Roman", serif` / `ui-monospace, "DejaVu Sans Mono", monospace`.
* La licence OFL exige de **redistribuer le texte de licence** : prévoir `/fonts/OFL-<fonte>.txt`
  et un crédit en pied de page.

### 2.3 Palette

Deux thèmes complets. Sélection par `prefers-color-scheme` **plus** un interrupteur explicite
persisté (`localStorage`), le sombre étant le défaut sur préférence absente (le contenu est une
démonstration lumineuse sur fond d'encre).

#### Thème sombre — « Nuit d'encre » (défaut)

| Jeton | Hex | Rôle | Contraste vs `canvas` |
|---|---|---|---|
| `--canvas` | `#0B0E14` | fond de page | — |
| `--surface` | `#141A26` | cartes, scène SVG | — |
| `--raised` | `#1E2634` | champs, badges, barre de transport | — |
| `--line` | `#2C3546` | filets **décoratifs** uniquement | 1,57 |
| `--line-ui` | `#5E6C86` | bordures **porteuses de sens** (champ, bouton) | **3,65** ✔ ≥ 3 |
| `--fg` | `#EFE6D4` | texte principal (blanc parchemin) | **15,58** ✔ AAA |
| `--fg-2` | `#B9AF9B` | texte secondaire | **8,89** ✔ AAA |
| `--fg-3` | `#8E8575` | légendes, mentions | **5,30** ✔ AA |
| `--rubric` | `#F0574B` | rubrication, liens, le « 666 » | **5,68** ✔ AA |
| `--rubric-hi` | `#FF6F62` | survol / actif | **7,08** ✔ AAA |
| `--phos` | `#5BE3A6` | couche machine : calculs, n° d'étape | **11,94** ✔ AAA |
| `--gold` | `#E3B341` | les « 6 » unitaires, anneau de focus, ornements | **9,93** ✔ AAA |

#### Thème clair — « Parchemin »

| Jeton | Hex | Rôle | Contraste vs `canvas` |
|---|---|---|---|
| `--canvas` | `#F2EADA` | fond de page (papier chaud) | — |
| `--surface` | `#FBF6EA` | cartes | — |
| `--raised` | `#FFFFFF` | champs | — |
| `--line` | `#D8CBB2` | filets décoratifs | 1,34 |
| `--line-ui` | `#8E806A` | bordures porteuses de sens | **3,22** ✔ ≥ 3 |
| `--fg` | `#1A1610` | texte principal | **15,06** ✔ AAA |
| `--fg-2` | `#4A4234` | texte secondaire | **8,28** ✔ AAA |
| `--fg-3` | `#6B6151` | légendes | **5,08** ✔ AA |
| `--rubric` | `#A32218` | rubrication, liens, « 666 » | **6,27** ✔ AA |
| `--rubric-hi` | `#8C1D14` | survol / actif | **7,63** ✔ AAA |
| `--phos` | `#0B6B52` | couche machine (vert terminal foncé) | **5,42** ✔ AA |
| `--gold` | `#7A5510` | « 6 », focus, ornements | **5,60** ✔ AA |

**Couples validés pour les fonds pleins** (le texte sur aplat coloré) :

| Combinaison | Ratio |
|---|---|
| `#0B0E14` sur `--rubric` sombre `#F0574B` (bouton primaire) | **5,68** ✔ |
| `#FBF6EA` sur `--rubric` clair `#A32218` (bouton primaire) | **6,96** ✔ |
| `#0B0E14` sur `--gold` sombre `#E3B341` (badge « 6 ») | **9,93** ✔ |
| `--phos` sur `--raised` sombre `#1E2634` | **9,39** ✔ |

**Sémantique des couleurs — à respecter strictement** :
* **Rubrique (rouge)** = l'affirmation. Titres de méthode, liens, résultat `666`.
* **Or** = la valeur atteinte. Chaque `6` unitaire, les fragments valides, l'anneau de focus.
* **Phosphore (vert)** = la mesure. Toute la couche monospace : numéros d'étape, calculs
  intermédiaires, badges, URL.
* Jamais de vert « succès » / rouge « erreur » : les erreurs se signalent par **le rouge de la
  rubrique + une icône + un libellé**, jamais par la couleur seule.

### 2.4 Échelles

**Type** — base 16 px, ratio 1,25 (tierce majeure), fluide en `clamp()` au-delà de `lg` :

| Jeton | Valeur | Emploi |
|---|---|---|
| `--fs-2xs` | `0.75rem` (12 px) | badges mono, `T-03/07` |
| `--fs-xs` | `0.8125rem` (13 px) | légendes, mentions légales |
| `--fs-sm` | `0.9375rem` (15 px) | UI, libellés de boutons |
| `--fs-base` | `1rem` (16 px) | référence |
| `--fs-md` | `1.125rem` (18 px) | corps de texte (Spectral) |
| `--fs-lg` | `clamp(1.25rem, 1.1rem + .6vw, 1.5rem)` | `h3`, nom de méthode |
| `--fs-xl` | `clamp(1.5rem, 1.2rem + 1.4vw, 2.125rem)` | `h2` |
| `--fs-2xl` | `clamp(2rem, 1.4rem + 2.6vw, 3.25rem)` | `h1` |
| `--fs-3xl` | `clamp(3rem, 1.6rem + 6vw, 6rem)` | le **666** final |

Interlignes : `1.1` (affichage), `1.55` (corps), `1.4` (mono). Mesure de lecture : `62ch` max.
Interlettrage : `-0.015em` en affichage Bodoni, `0.08em` + capitales pour les libellés mono.

**Espace** — base **6 px**, parce que 6. Échelle : `6 · 12 · 18 · 24 · 36 · 48 · 66 · 96 · 144`.
Elle est cohérente (multiples de 6), elle donne des cibles tactiles de 48 px sans effort, et c'est
le seul jeu de mots que la charte s'autorise.

**Rayons** : `0` (papier), `2px` (champs, boutons), `50%` (pastilles de chapitrage uniquement).
**Traits** : `--rule: 1px` · `--rule-strong: 2px` · filet double = `1px` + `2px` de vide + `1px`.

**Points de rupture** : `480px` (grand mobile) · `760px` (tablette : la démonstration passe en deux
colonnes) · `1100px` (bureau : largeur de contenu figée à `72rem`).

---

## 3. Maquettage des trois pages

Wording corrigé (le README contient « réveller », « voulez vous », « approche » au singulier, etc.).
Toutes les propositions ci-dessous appliquent la **typographie française** : guillemets `« »`,
**espace fine insécable** avant `! ? : ;` (`&#8239;` ou `&nbsp;`), majuscules accentuées.

### 3.1 Page d'accueil

Mobile-first, une colonne, `max-width: 34rem`, centrée, rythme vertical généreux (`96px` de marge
haute sur mobile, `144px` au-delà de 760 px).

```
┌────────────────────────────────┐
│            [ LOGO SVG ]        │  h1, max-width 22rem (mobile) / 34rem
│                                │
│  L'art de la numérologie,      │  Spectral italique, --fs-md, --fg-2
│  enfin accessible au plus      │  (le calembour sur « nombre » est conservé)
│  grand nombre !                │
│  ── filet doublé ──            │
│                                │
│  De quel contenu voulez-vous   │  <label>, Spectral, --fs-md, --fg
│  révéler les arcanes ?         │
│  ┌──────────────────────────┐  │  input mono, 48px (56 au-delà de 760px)
│  │ un mot, une phrase, une… │  │  bordure --line-ui, caret --rubric
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │        RÉVÉLER           │  │  bouton primaire, fond --rubric,
│  └──────────────────────────┘  │  mono capitales, ombre letterpress 6px
│                                │
│  Essayez donc :                │  --fs-xs, --fg-3
│  [hope-hope-hope.fr] [votre    │  puces mono cliquables, 44px de haut
│  prénom] [666] [wikipedia.org] │
└────────────────────────────────┘
  Tout est calculé dans votre navigateur : rien n'est envoyé nulle part.
  Ceci est une parodie. La numérologie ne prédit rien. Le code, si.
```

**Corrections de wording** : « De quel contenu voulez-vous **révéler** les arcanes **?** »
(trait d'union à `voulez-vous`, un seul `l` à `révéler`, espace fine avant le `?`).
Bouton : **« Révéler »** seul (le libellé long « Révéler les arcanes » redouble le label).

**États** :
* *Vide au repos* : le bouton reste **actif** (ne jamais désactiver un bouton de soumission — c'est
  une impasse silencieuse). Soumission à vide → message `role="alert"` sous le champ :
  « Les arcanes ont besoin d'un peu de matière. Saisissez quelque chose. » Bordure du champ en
  `--rubric`, `aria-invalid="true"`, `aria-describedby` pointant sur le message.
* *Saisie longue* : au-delà de 200 caractères, un compteur mono apparaît à droite du champ ;
  au-delà de 256, mention `--fg-3` : « Au-delà de 256 signes, les astres perdent le fil. »
  (limite douce, on calcule quand même sur les 256 premiers).
* *Calcul en cours* : le bouton devient « Consultation des arcanes… », `aria-busy="true"`, avec
  trois `6` mono qui s'allument en boucle (≤ 2 Hz). Sous `prefers-reduced-motion`, texte fixe.
* *Sans JavaScript* : le formulaire affiche un `<noscript>` expliquant que la démonstration est
  entièrement cliente et nécessite JavaScript. Le logo et le texte restent lisibles.

### 3.2 Page de résultat — `…/##{b58}`

```
◂ Recommencer                                    [☾/☀]   ← barre fine, filet bas

  Les arcanes de                                    ← --fs-sm, --fg-3, mono
  « hope-hope-hope.fr »                             ← h1 Bodoni --fs-2xl,
                                                       overflow-wrap:anywhere
  Sept approches mènent à 666.                      ← Spectral italique, --fg-2

  ── LES VOIES COMPLÈTES ─────────────              ← h2 mono capitales, --phos

  ┌ №1 ─────────────────────────────┐  ← carte-lien entière cliquable
  │ Le détour linguistique          │     titre Bodoni --fs-lg
  │ hope → espoir → 6 lettres, ×3   │     résumé mono --fs-sm, 6 en --gold
  │                        6·6·6  ▸ │     666 en --rubric
  └─────────────────────────────────┘
  ┌ №2 ─────────────────────────────┐
  …

  ── LES FRAGMENTS VALANT 6 ──────────

  [ «hope» · lettres+voyelles = 6 ]     ← rangées denses, 44px, cliquables
  [ «-»    · touche 6 en AZERTY  = 6 ]
  …

  ┌ ASSEMBLER VOS PROPRES ARCANES ──┐   ← panneau « terminal » : fond --raised,
  │ /#{n}#{séquence}                │     filet simple, tout en mono, --phos
  │ /#{n}+{n}+{n}#{séquence}        │
  │ ex. /#2+6+7#hope-hope-hope.fr   │
  │                    [ Copier ]   │
  └─────────────────────────────────┘
```

**Wording corrigé** : « approche**s** » s'accorde ; singulier géré (« Une approche mène à 666. »).
Le titre du README (« Titre : {Séquence recherchée} ») est enrichi d'un sur-titre pour que le `h1`
ait du sens hors contexte.

**États** :
* *Chargement* : trois cartes squelettes (blocs `--raised` avec un filet), pas de tourniquet.
* *Aucune voie trouvée* (ne devrait jamais arriver — c'est la promesse du site) :
  « Aucune voie trouvée. C'est mathématiquement impossible ; nous enquêtons. »
  + bouton **« Insister »** qui relance avec une heuristique plus profonde. La blague est aussi le
  vrai mécanisme de repli.
* *Séquence illisible dans l'URL* : « Cette incantation est corrompue. » + le champ de saisie
  d'accueil réaffiché sur place pour repartir.
* *Séquence vide dans l'URL* : redirection douce vers l'accueil.

**Responsive** : ≥ 760 px, les cartes de voies passent en grille `repeat(auto-fill, minmax(20rem,1fr))` ;
le panneau d'assemblage devient une colonne latérale collante.

### 3.3 Page de démonstration — `…/#{n|n+n+n}#{b58}`

```
◂ Toutes les voies                               [☾/☀]

  Méthode 6 — L'astuce AZERTY                    ← mono capitales, --phos
  La vérité derrière                             ← --fs-sm --fg-3
  « hope-hope-hope.fr »                          ← h1 Bodoni --fs-2xl

  ┌───────────────────────────────── T-03/07 ┐   ← badge mono --phos, coin HD
  │                                          │
  │            [ SCÈNE SVG ]                 │   fond --surface, filet double
  │                                          │   3/2 sur mobile, 16/9 ≥760px
  └──────────────────────────────────────────┘   hauteur max 55vh
  ▓▓▓░░░░  ← jauge segmentée : une case par transformation, cliquable

  ┌ ⏮  ◀   ▶   ▶   ⏭ ┐                          ← barre de transport, §4
  │ DÉBUT PRÉC LECT SUIV FIN │                   libellés visibles ≥ 560px
  └──────────────────────────┘

  Étape 3 sur 7 — Les deux tirets sont sur la touche du 6 en AZERTY.
                                       ↑ région live, Spectral, --fg-2

  ── LE REGISTRE ────────────────────            ← équivalent textuel complet
  1. On isole les séparateurs.                      <ol>, l'étape courante
  2. On relève la position clavier.                 porte aria-current="step"
  3. ▸ Les deux tirets valent 6 et 6.               et un fond --raised
  …

        6 6 6                                    ← --fs-3xl Bodoni --rubric,
                                                    halo doré, à l'arrivée
        C.Q.F.D.                                 ← mono capitales --fg-3

  [ Partager ]  [ Revoir ]  [ Une autre voie ]  [ Nouvelle recherche ]
```

**Wording corrigé** : « démonstration » (et non « démontration »), « La vérité derrière
« … » » avec guillemets français.

**Responsive** : ≥ 760 px → grille `1fr 22rem` : scène + transport à gauche, **Le Registre** en
colonne latérale collante à droite (on lit le texte pendant que l'animation joue).
< 760 px → tout en colonne, le registre replié dans un `<details>` ouvert par défaut à la fin.

**États** :
* *Méthode inconnue dans l'URL* : « Cette voie n'existe pas dans nos registres. » + liste des voies
  disponibles pour cette séquence.
* *Composition de fragments invalide* (`#2+9+9` alors qu'il n'y a pas de fragment 9) :
  on indique **précisément** lequel est fautif, en mono, et on propose la composition valide la plus
  proche.
* *Scène non rendue / erreur du moteur visuel* : la page **reste valide** — le Registre textuel est
  la source de vérité, la scène est un enrichissement. Message discret : « L'illustration n'a pas
  pu être tracée ; la démonstration reste lisible ci-dessous. »

---

## 4. Les contrôles d'animation

### 4.1 Composition et iconographie

Un seul groupe : `<div role="group" aria-label="Contrôles de la démonstration">`, cinq boutons.
Icônes **SVG inline, 24×24, tracé de 2 px, terminaisons carrées, `currentColor`** — dessinées à la
main (zéro dépendance), dans le vocabulaire du filet gravé, pas des icônes arrondies génériques.

| Bouton | Icône | Libellé (≥ 560 px) | `aria-label` |
|---|---|---|---|
| Début | `⏮` barre + triangle gauche | DÉBUT | « Revenir au début » |
| Précédent | `◀` triangle gauche seul | PRÉC. | « Transformation précédente » |
| Lecture / Pause | `▶` plein / `❚❚` | LECTURE / PAUSE | « Lancer la démonstration » / « Mettre en pause » |
| Suivant | `▶` triangle droit seul | SUIV. | « Transformation suivante » |
| Fin *(ajout)* | `⏭` triangle droit + barre | FIN | « Aller au résultat » |

**« Fin » n'est pas au README** ; il est proposé car sans lui, la seule façon d'atteindre le `666`
est de cliquer « Suivant » n fois — pénible et hostile au partage. À trancher (§6).

Distinction **Début vs Précédent** : formes différentes (barre butoir vs triangle nu), libellés
textuels dès 560 px, et `aria-label` explicites. C'est le point de confusion classique de ce
patron ; il se règle par le texte, pas par l'icône.

### 4.2 Affordances et dimensions

* Boutons latéraux **48 × 48 px** ; bouton central Lecture/Pause **56 × 56 px** et visuellement
  dominant (fond `--raised`, filet `--line-ui`, et halo `--gold` tant que la démonstration n'a
  jamais été lancée — c'est l'appel à l'action).
* Écart de **6 px** entre boutons (jamais collés : évite les erreurs de pouce).
* La barre est enveloppée d'un filet simple et posée sur `--raised`, immédiatement sous la jauge.
* **Jauge segmentée** : une case par transformation, `--phos` pour les cases franchies,
  `--line` pour les suivantes, `--gold` pour la case en cours. Chaque case est un vrai
  `<button>` « Aller à la transformation 3 », 24 px de haut minimum, avec `aria-current="true"`
  sur celle en cours. (Préféré à un `role="progressbar"` : c'est manipulable, donc ce doit être
  un contrôle, pas un indicateur.)

### 4.3 Règles d'activation (spéc README, formalisée)

| Position | Début | Précédent | Lecture/Pause | Suivant | Fin |
|---|---|---|---|---|---|
| Au tout début, à l'arrêt | inactif | inactif | **Lecture** | actif | actif |
| En cours de transformation *i* | actif | actif → début de *i* | selon état | actif → fin de *i* | actif |
| À la charnière *i/i+1* | actif | actif → début de *i* | selon état | actif → fin de *i+1* | actif |
| À la fin | actif | actif | **Lecture** (rejoue depuis le début) | inactif | inactif |

**Point d'accessibilité important** : les boutons inactifs utilisent **`aria-disabled="true"` + une
classe visuelle, et non l'attribut `disabled`**. Un bouton `disabled` sort de l'ordre de tabulation :
si l'utilisateur clavier a le focus sur « Suivant » et atteint la fin, son focus est éjecté vers le
début du document. Avec `aria-disabled`, il reste focusable, l'action est simplement neutralisée, et
l'état est correctement annoncé. Rendu : `opacity: .38` + `cursor: not-allowed`.

### 4.4 Clavier

Raccourcis actifs quand le focus est **dans la région de démonstration** (`tabindex="0"` sur la
scène, `aria-label="Scène de démonstration"`), désactivés dès que le focus est dans un champ :

| Touche | Action |
|---|---|
| `Espace` ou `K` | Lecture / Pause |
| `←` ou `J` | Précédent |
| `→` ou `L` | Suivant |
| `Origine` (Home) | Début |
| `Fin` (End) | Fin |
| `?` | Ouvre le panneau « Raccourcis » |
| `D` | Bascule le mode debug (§4.7) |

`Espace` ne doit pas faire défiler la page quand la scène a le focus (`preventDefault`).
Les cinq boutons restent tous tabulables (pas de `roving tabindex` : cinq contrôles, c'est court,
et l'accès direct est plus rapide que la navigation par flèches).

**Focus visible**, jamais supprimé :

```css
:where(a,button,input,[tabindex]):focus-visible{
  outline:2px solid var(--gold);      /* 8,95:1 sur --surface en sombre */
  outline-offset:3px;
  border-radius:2px;
}
```

### 4.5 ARIA et lecteurs d'écran

* La scène SVG est **`aria-hidden="true"`**. L'information passe par **Le Registre**
  (`<ol>` textuel), qui est l'équivalent accessible obligatoire, et non un « bonus ».
* **Bouton Lecture/Pause** : un seul bouton dont le **nom accessible change** (« Lancer la
  démonstration » ↔ « Mettre en pause »). Pas d'`aria-pressed` : quand le libellé bascule,
  `aria-pressed` produit une double annonce contradictoire.
* **Région live** : `<p id="etape" aria-live="polite" aria-atomic="true">` contenant
  « Étape 3 sur 7 — Les deux tirets sont sur la touche du 6 en AZERTY. »
  Mise à jour **uniquement aux charnières**, jamais pendant l'interpolation, et au maximum une
  annonce par étape (sinon la lecture continue noie le lecteur d'écran).
* **Arrivée** : annonce unique « Démonstration terminée. Résultat : 666. »
* **Étape courante dans le Registre** : `aria-current="step"` sur le `<li>` actif ; le `<li>` est
  aussi un lien/bouton pour y sauter.
* Lien d'évitement en tête de page : « Aller à la démonstration » et « Aller au registre ».

### 4.6 Lecture automatique et `prefers-reduced-motion`

**Déclenchement automatique** (spéc README) — la lecture ne démarre seule que si **toutes** ces
conditions sont vraies au chargement :

```
document.visibilityState === 'visible'
  && document.hasFocus()
  && !matchMedia('(prefers-reduced-motion: reduce)').matches
  && réglage utilisateur ≠ « animation réduite »
```

Sinon : état pause, bouton Lecture mis en avant par le halo doré. **Aucun redéclenchement
automatique** ensuite (ni au retour d'onglet, ni à la fin) — seul un rechargement de page peut
relancer un démarrage automatique.

**`prefers-reduced-motion: reduce`** :
* pas de démarrage automatique ;
* « Lecture » enchaîne les étapes en **états discrets** : chaque étape s'affiche en position finale,
  reste **2,5 s**, puis fondu croisé de **80 ms** vers la suivante. Aucune interpolation, aucun
  mouvement, aucun agrandissement.
* le clignotement du `666` final est remplacé par une apparition unique ;
* la révélation du logo devient un fondu de 120 ms.

**Réglage explicite** : un interrupteur « Animation : complète / réduite » (persisté dans
`localStorage`), initialisé sur la préférence système mais **surchargeable dans les deux sens** —
certaines personnes règlent leur OS en « réduit » pour d'autres raisons et veulent voir l'animation
ici, et inversement.

### 4.7 Numéro de transformation (debug)

* Badge permanent en haut à droite de la scène : `T-03/07`, JetBrains Mono `--fs-2xs`,
  `--phos` sur `--raised`, filet `--line`, `letter-spacing: .1em`. Discret mais toujours lisible —
  le README le veut « distinguable », principalement pour le debug.
* Le même numéro est repris : dans la case active de la jauge, et en préfixe de l'étape courante
  du Registre. Trois emplacements, une seule vérité.
* **Mode debug** (`?debug=1` ou touche `D`) : le badge se déploie en panneau mono affichant
  l'identifiant interne de la transformation, ses paramètres, la durée écoulée / totale, et l'URL
  canonique de l'étape en cours (copiable). Fond `--raised`, opacité 0,95, jamais dans l'ordre de
  tabulation normal.

---

## 5. Accessibilité et partage

### 5.1 Accessibilité — les règles fermes

* **Contrastes** : tous les couples texte/fond du §2.3 sont ≥ 4,5:1 (AA texte normal), la plupart
  ≥ 7:1. Les bordures porteuses de sens utilisent `--line-ui` (≥ 3:1, WCAG 1.4.11). Les filets
  purement décoratifs (`--line`) sont sous 3:1 **et doivent le rester décoratifs** : jamais de
  séparation d'information reposant sur eux seuls.
* **Cibles tactiles** : 48 × 48 px minimum partout (WCAG 2.2 exige 24 ; on double), espacement
  minimum 6 px. Les cartes de la page résultat sont cliquables **en entier**, pas seulement le titre.
* **Zoom / reflow** : lisible à 200 % de zoom et à 320 px de large sans défilement horizontal ;
  toutes les tailles en `rem`, aucune hauteur fixe sur du texte.
* **Chaînes longues** : `overflow-wrap:anywhere` sur les séquences saisies (les URL cassent tout).
* **Clignotement** : rien au-dessus de 2 Hz (limite WCAG à 3).
* **Couleur seule** : jamais. Les `6` valides portent aussi un fond de pastille ; les erreurs
  portent une icône et un texte.
* **`lang="fr"`**, typographie française (guillemets `« »`, espaces fines insécables avant
  `! ? : ;`, majuscules accentuées : « **É**tape », « **À** la fin »).
* **Sans JavaScript** : l'accueil et le Registre restent lisibles ; seule l'animation est perdue.
* **Un seul `h1` par page**, hiérarchie `h1 > h2 > h3` sans saut.

### 5.2 Carte de partage (OpenGraph)

**⚠️ Constat technique majeur.** Le README place les paramètres dans le **fragment**
(`…/#{méthode}#{b58}`). Un fragment **n'est jamais envoyé au serveur** : aucun robot d'aperçu
(Slack, Discord, Mastodon, WhatsApp, X…) n'en voit la moindre trace. En hébergement statique sans
build, **il est impossible de produire une carte OpenGraph personnalisée par démonstration.**

Options :

| Option | Faisabilité en statique zéro build | Verdict |
|---|---|---|
| a. Une carte générique unique | ✅ triviale | **retenue** |
| b. Paramètres en query string + génération à la volée | ❌ demande un serveur / edge function | écartée |
| c. Pré-générer une carte par méthode (7 fichiers) et pointer dessus | ❌ le `og:image` est dans le HTML, statique, donc identique pour toutes les URL à fragment | impossible telle quelle |
| d. Une page HTML par méthode (`/methode-6.html`) portant sa propre carte | ✅ possible, coût : 7 fichiers HTML | à trancher (§6) |

**Compensation produit** : le bouton **« Partager »** copie dans le presse-papier un **texte
pré-rédigé** — c'est là que la personnalisation existe, et elle ne coûte rien :

> La vérité derrière « hope-hope-hope.fr » : 6·6·6.
> Méthode 6 — L'astuce AZERTY.
> → https://…/#6#…

Plus `navigator.share()` quand disponible (mobile), avec repli sur la copie.

**Dessin de la carte générique — 1200 × 630, PNG < 300 Ko** :

```
┌────────────────────────────────────────────────────┐
│ ╔══════════════════════════════════════════════╗   │ ← filet double à 36px
│ ║  [logo, état RÉVÉLÉ]                         ║   │   du bord, coins ornés
│ ║                                              ║   │
│ ║  L A   V É R I T É   D E R R I È R E …       ║   │ mono 30px --phos,
│ ║                                              ║   │ interlettrage .22em
│ ║           6 6 6                              ║   │ Bodoni 190px --rubric
│ ║                                              ║   │ + halo --gold
│ ║  L'art de la numérologie, enfin accessible   ║   │ Spectral italique 34px
│ ║  au plus grand nombre.                       ║   │ --fg-2
│ ║                                              ║   │
│ ║                        numherololgeek.xx     ║   │ mono 24px --fg-3
│ ╚══════════════════════════════════════════════╝   │
└────────────────────────────────────────────────────┘
   fond --canvas #0B0E14 + grain
```

* C'est **le seul endroit** où le logo est montré à l'état **révélé** : la carte spoile la blague,
  la page ne la spoile pas. Cohérent : on partage la chute, on ne la lit pas soi-même deux fois.
* Aucun texte sous 60 px (lisibilité en vignette de 300 px de large).
* Métadonnées :
  `og:type=website` · `og:locale=fr_FR` · `og:image:width/height=1200/630` ·
  `og:image:alt="Le mot Numérologic dévoilant Num Hero LOL geek, au-dessus du nombre 666."` ·
  `twitter:card=summary_large_image`.
* `og:title` : « La vérité derrière n'importe quoi. » — `og:description` : « L'art de la numérologie,
  enfin accessible au plus grand nombre. Tout mène à 666. Démonstration animée à l'appui. »
* Prévoir **une variante clair** de la carte ? Non : une seule carte, en thème sombre. Les vignettes
  sombres se détachent mieux dans les fils de discussion.

---

## 6. Décisions à trancher

1. **Le bouton « Fin »** — ajout hors README. Cinq contrôles au lieu de quatre, mais sans lui on
   ne peut pas atteindre le résultat sans n clics. **Recommandation : l'ajouter.**
2. **L'apostrophe de la fente 9** — la construction A la conserve (fidèle au README) au prix d'un
   léger corps étranger dans `Numérolo'gic`. La construction C la supprime pour une silhouette
   parfaite mais rend le 2ᵉ L indevinable. **Recommandation : A**, à confirmer sur un rendu final
   dessiné à la main (le prototype utilise une fonte de substitution, pas Bodoni Moda).
3. **Carte OpenGraph personnalisée** — accepter une carte générique unique (option a), ou créer
   7 pages HTML statiques (une par méthode, option d) pour avoir un aperçu par méthode ? Impacte
   le routage, donc à décider **avant** que le format d'URL ne soit figé.
4. **Format d'URL et robots d'aperçu** — plus largement : garder le tout-fragment du README
   (aucun aperçu riche possible, jamais) ou basculer sur des chemins/query (aperçus possibles si
   un jour on ajoute un edge). Décision d'architecture autant que de design.
5. **Thème par défaut** — sombre proposé. À valider : le thème clair « parchemin » est peut-être
   plus crédible pour un « traité savant ».
6. **Troisième fonte** — Spectral coûte 3 fichiers statiques (pas de version variable). Alternative
   plus légère : **Literata** (OFL, `github.com/googlefonts/literata`), qui existe en variable
   (1 fichier), au prix d'un ton un peu moins tranché. À arbitrer sur le budget de poids réel après
   sous-réglage.
7. **Base d'espacement de 6 px** — assumée comme jeu de mots structurel. Si l'équipe préfère la
   grille standard de 4 px, la substitution est mécanique (`6→4, 12→8, 18→12…`) et n'affecte que
   les jetons.
8. **Durée par transformation** — non spécifiée par le README ; dépend du moteur visuel.
   Proposition de départ à valider avec l'agent « moteur visuel » : **1,4 s** par transformation,
   **0,4 s** de charnière, **2,5 s** en mode réduit. C'est le paramètre qui détermine si une
   démonstration de 7 étapes dure 10 s (bon) ou 40 s (personne ne regarde).
9. **Le survol du logo sur mobile** — l'état « éveil » n'existe pas sans souris. Faut-il le
   remplacer par un éveil au premier défilement, ou laisser le mobile passer directement de
   repos à révélation au tap ? **Recommandation : tap = révélation directe.**
10. **Lacune assumée** : aucune recherche n'a été menée sur les patrons ARIA des lecteurs
    multimédias auprès de sources normatives (l'APG WAI-ARIA ne publie pas de patron « media
    player »). Les recommandations du §4.5 s'appuient sur les règles générales (nom accessible
    variable, `aria-disabled` vs `disabled`, régions live temporisées) et mériteraient une
    validation par un test réel avec NVDA/VoiceOver avant la mise en production.

---

### Annexe — prototype

`.planning/research/proto/logo-proto.html` (état de repos, survol interactif) et
`logo-proto-revealed.html` (état révélé figé). Jetables. Rendus vérifiés en navigateur :
l'état de repos se lit bien **« Numérologic »**, l'état révélé montre l'empilement des `e`,
l'allongement du `k` et les trois `6` dorés dans les intervalles de mots.
La fonte y est une substitution système : **le dessin final doit être retracé sur Bodoni Moda.**
