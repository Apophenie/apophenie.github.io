# NumHeroLOLgeek — Contrats d'interface figés

> Ce document est **normatif**. Il tranche les points laissés ouverts par les quatre
> rapports de `.planning/research/` et fige les interfaces entre modules.
> En cas de divergence entre un rapport de recherche et ce document, **ce document gagne**.
>
> Rapports sources : `research/design.md`, `research/moteur-visuel.md`,
> `research/moteur-arithmetique.md`, `research/heuristique.md`.

---

## 0. Décisions d'arbitrage

### 0.1 Stack

Vanilla JS, modules ES natifs, **aucune dépendance runtime**, hébergement statique.
Pas de CDN, pas de framework. Polices `.woff2` self-hostées.

> *Amendement.* Le projet a démarré en **zéro build**. Un build Vite piloté par bun a
> été ajouté ensuite, pour une raison précise : les modules ES sont **bloqués en
> `file://`** (origine « null », politique CORS). Ouvrir `index.html` par double-clic
> chargeait donc le CSS mais pas le JavaScript — le logo s'affichait sans réagir, ce
> qui donnait l'illusion d'un fichier périmé. Le build produit un `dist/` où les
> scripts sont classiques (`<script defer>`, sans `type="module"`), donc hors CORS.
>
> **Le code source, lui, reste sans dépendance runtime et servable tel quel** :
> `bun run dev` sert les sources en modules natifs, et `bun run test` exécute les
> tests avec `node --test` **sans build préalable**. Vite est une `devDependency` et
> ne laisse aucun code tiers dans le bundle. Corollaire à ne pas perdre de vue : les
> imports dynamiques à spécificateur variable sont incompatibles avec ce bundling —
> les trois qui existaient sont devenus des registres explicites.

### 0.2 Les trois conflits inter-agents, tranchés

| # | Conflit | Arbitrage |
|---|---|---|
| 1 | Format de description d'animation : `Anim` (proposé par l'arithmétique) vs `Scenario`/`Step`/`Op` (proposé par le visuel) | **Le format du moteur visuel gagne.** `Scenario`/`Step`/`Op`, références par `id` de token, jamais par index. L'arithmétique n'émet pas d'`Anim` : elle émet des `Step[]`. |
| 2 | Police : Bodoni (design) vs bâton géométrique (arithmétique) vs monospace (visuel) | **Trois registres distincts, aucun conflit.** Voir §0.3. |
| 3 | URL : rang (README) vs jeton binaire base58 (heuristique) vs codes lisibles (arbitrage utilisateur) | **Codes d'opérateurs stables, séparateur `+`.** Voir §4. |

### 0.3 Le régime typographique — résolution du conflit de police

Trois usages, trois traitements, qui ne se marchent jamais dessus :

1. **Typographie d'interface** — **Jost\* / JetBrains Mono**. Concerne les titres, le
   corps, les badges. Sans effet sur les calculs.

   > *Amendement.* `research/design.md §2.2` prescrivait Bodoni Moda (affichage) et
   > Spectral (texte). Les deux ont été retirés une fois le logo arrêté : celui-ci est
   > un bâton géométrique monolinéaire — sans empattement, sans gras, sans délié — et
   > une didone à contraste extrême posée juste en dessous disait exactement le
   > contraire. `--oracle` et `--pedagogue` sont désormais deux voix de **Jost\***, la
   > police du logo, séparées par la graisse (600 en titre, 400 au corps, 300 pour la
   > voix douce) ; `--machine` reste **JetBrains Mono**. Quatre familles servies sont
   > devenues deux, et 67 Ko de woff2 ont disparu. `design.md §2.2` est conservé tel
   > quel : c'est la trace de la recherche, pas l'état du site.
2. **Tokens de la scène SVG** — **JetBrains Mono**, à chasse fixe. Le layout devient de
   l'arithmétique pure (une largeur de glyphe constante mesurée une fois), ce que le
   moteur visuel exige (`research/moteur-visuel.md §5.1`).
3. **Police de démonstration** — pour toute méthode qui compte des **traits, extrémités
   ou boucles**, le glyphe est remplacé dans la scène par son **tracé vectoriel maison**
   (`<path>`, bâton géométrique), avec la mention « tracé de référence ». C'est de toute
   façon obligatoire techniquement : `countStrokes` a besoin de `<path>` pour
   `getPointAtLength`.

**Règle structurelle qui élimine le risque par construction :** les tables `traits`,
`extremites` et `boucles` ne sont **pas saisies à la main**. Elles sont **calculées**
à partir de la définition vectorielle des glyphes (§1.3). Ce que le spectateur voit à
l'écran est donc, littéralement, ce qui a été compté. Les valeurs de
`research/moteur-arithmetique.md §3.4` servent de **vecteurs de test** : la définition
vectorielle doit les reproduire, sommes de contrôle incluses
(`trMAJ=61, trMin=53, extMAJ=58, extMin=54, bcMAJ=8, bcMin=8`).

### 0.4 Décisions produit

| Sujet | Décision |
|---|---|
| Bouton **Fin** | **Ajouté** (hors README). Sans lui, atteindre le 666 demande *n* clics. |
| Joker français (`quatre` → 6) | **Affiché et assumé**, en bas de liste, sous un intitulé explicite. Le fait qu'il ne marche qu'en français est un argument, pas une gêne. |
| Saisies `"666"`, `"6"`, `"diable"`, `"satan"` | **Réponses dédiées écrites à la main.** Le site échouant à prouver que 666 vaut 666 est un cadeau comique. |
| `Y` voyelle | **Deux transformations distinctes** : `f.voyelles` (sans Y) et `f.voyellesY`. |
| Nombres maîtres (11, 22, 33) | Post-traitement **optionnel, désactivé par défaut** (ils bloquent la réduction). |
| Approximations 7 segments (K, M, V, W, X) | **Assumées, avec mention à l'écran.** L'honnêteté sur le détail renforce le tout. |
| Nuance AFNOR sur le « tiret du 6 » | **Mentionnée en note de bas de page** de la méthode concernée. |
| Thème par défaut | **Sombre** (« Nuit d'encre »), avec interrupteur persisté. |
| Plafond de saisie | **500 caractères** (coût O(n²) de base58). |
| Durées | **1,4 s** par transformation, **0,4 s** de charnière, **2,5 s** par étape en mode réduit. |
| Carte OpenGraph | **Générique unique** + bouton « Partager » copiant un texte personnalisé. |
| Web Worker | **Interface `postMessage` prévue dès maintenant**, exécution inline en v1. |

---

## 1. Arborescence et répartition

```
README.md  favicon.svg
package.json  bun.lock  vite.config.js  .gitignore  .gitlab-ci.yml
src/
  index.html
  styles/
    tokens.css        variables de thème (§ design 2.3, 2.4)
    base.css          reset, typographie, filets, grain
    pages.css         accueil / résultat / démonstration
    controls.css      barre de transport, jauge, focus
  fonts/              jost-var + jetbrains-mono-var (.woff2) + leurs OFL
  gfx/                logo-jost-trace.py, _logo-test.html, jost.ttf
                      (le générateur du logo et son banc ; jost.ttf est un
                       outil de build, il n'est jamais servi au navigateur)
  moteur/           ─────────────────────────── AGENT ARITHMÉTIQUE
    tables/
      alphabet.js   A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6
      jeux.js       SCRABBLE_FR, SCRABBLE_EN, T9, MORSE
      seg7.js       segments par lettre + fusion colinéaire
      claviers.js   AZERTY, QWERTY (rangées, colonnes)
      ecritures.js  HEBREU, GREC, translittération
      glyphes.js    ★ définition vectorielle des 52 glyphes (§1.3)
      derivees.js   traits/extremites/boucles CALCULÉS depuis glyphes.js
    etat.js         constructeurs et gardes de type
    transformations/{filtres,tokeniseurs,mappeurs,combinateurs,posts}.js
    catalogue.js    agrège, gèle, valide les codes (§4.1)
  visuel/           ─────────────────────────── AGENT VISUEL
    player.js       createPlayer() — WAAPI + automate
    compile.js      Scenario → timeline (bounds, keyframes)
    layout.js       moteur de layout des tokens en unités viewBox
    primitives/     une par op du vocabulaire (§3.4)
    clock.js        canal rAF pour texte/paths (§ visuel 1.4)
  recherche/        ─────────────────────────── AGENT HEURISTIQUE
    bfs.js          fermeture canonicalisée + faisceau par état
    bassin.js       bassin d'attraction de 6, précalculé
    fragments.js    tokenisation URL-aware, motifs répétés, périodicité
    assemblage.js   jointure sur signature de méthode
    score.js        conviction (6 critères), entiers, ordre total
    scenario.js     ★ chemin → Scenario (§3) — le pont vers le visuel
    url.js          grammaire d'URL (§4), lecture tolérante
    base58.js       encodage vanilla
  app/              ─────────────────────────── AGENT INTERFACE
    routeur.js      hashchange → page
    pages/{accueil,resultat,demonstration}.js
    logo.js         logo SVG + révélation, piloté par logo-lecteur.js
    transport.js    barre de contrôles, jauge, raccourcis clavier
    registre.js     équivalent textuel accessible
    partage.js      copie de texte, navigator.share
  i18n/             fr.js, en.js, résolution, état
.planning/          recherche, contrats, prototypes de mesure
dist/               produit par `bun run build`, ouvrable en file://
```

**Règle de non-collision : chaque agent n'écrit que dans son répertoire.**
`src/recherche/scenario.js` est le seul point de contact arithmétique↔visuel, et il
appartient à l'agent heuristique, qui consomme le catalogue et produit le `Scenario`.

---

## 2. Contrat du moteur arithmétique

### 2.1 État circulant

```js
/** @typedef {'STR'|'TOKENS'|'NUMS'|'NUM'} TypeEtat */
{ type: 'STR',    valeur: 'hope-hope-hope.fr' }
{ type: 'TOKENS', valeur: ['h','o','p','e'] }
{ type: 'NUMS',   valeur: [8,15,16,5] }
{ type: 'NUM',    valeur: 44 }
```

Chaque état porte en plus `traces: [[debut, fin), …]` — les intervalles de la **saisie
d'origine** dont il provient. Indispensable au critère de couverture du score et au
surlignage dans la scène. Non optionnel.

### 2.2 Descripteur d'opérateur — signature unique

```js
export const op = {
  id:         'a1z26',       // slug stable, unique, lisible
  code:       'm1',          // ★ code d'URL, alloué à vie, jamais réutilisé (§4.1)
  deprecated: false,         // exclu des recherches, TOUJOURS exécutable

  from:       'TOKENS',      // typage — première coupe du moteur de recherche
  to:         'NUMS',

  apply(valeur, traces) { … },   // PUR. null si inapplicable. Jamais d'exception.
  couverture(valeur) { … },      // intervalles consommés, pour STR→* uniquement

  famille:    'mappeur',     // filtre|decoupe|mesure|mappeur|combinateur|finisseur|joker
  notoriete:  1.00,          // [0,1] — barème research/heuristique.md §4.3
  adHoc:      0.00,          // [0,1] — barème research/heuristique.md §4.5
  commute:    false,         // participe au tri canonique N2
  cout:       1,             // nb d'étapes rendues à l'écran (0 = invisible)
  isJoker:    false,

  libelle:    "Chaque lettre vaut son rang dans l'alphabet",
  regle:      'A=1, B=2, … Z=26',
  note:       null,          // note de bas de page optionnelle (ex. nuance AFNOR)

  // ★ Émission de la démonstration — voir §3
  steps(avant, apres, ctx) { return [ /* Step[] */ ] }
};
```

**Garanties exigées, vérifiées au chargement (échec bruyant, pas de dégradation
silencieuse) :** pureté, déterminisme, `null` plutôt qu'exception, métadonnées de
classement présentes, `code` unique et conforme à la grammaire §4.1, ordre de
déclaration = ordre des codes croissants, `NUM` borné à `[-10⁶, 10⁶]`.

### 2.3 Bornes

Un opérateur qui produirait un `NUM` hors de `[-10⁶, 10⁶]` retourne `null`.
Le bassin d'attraction est tabulé sur `[-2000, 2000]`.

### 2.4 Définition vectorielle des glyphes — `tables/glyphes.js`

Format normatif. Chaque glyphe est une liste de **sous-chemins** (= traits de crayon),
chaque sous-chemin étant une polyligne ou un arc sur une grille normalisée
(`0..600` en hauteur de capitale, `0..400` en largeur, origine en bas à gauche) :

```js
export const GLYPHES = {
  'A': { traits: [
           { d: 'M 0 0 L 200 600',    ouvert: true },
           { d: 'M 200 600 L 400 0',  ouvert: true },
           { d: 'M 60 180 L 340 180', ouvert: true } ],
         jonctions: [[0,1,'sommet'], [0,2], [1,2]] },
  'O': { traits: [ { d: 'M 200 0 A 200 300 0 1 1 200 600 A 200 300 0 1 1 200 0', ouvert: false } ],
         jonctions: [] },
  …
};
```

- `traits.length` → **nombre de traits de crayon**.
- Extrémités libres = extrémités de sous-chemins **ouverts** qui n'apparaissent dans
  aucune `jonction`.
- Boucles = sous-chemins fermés + cycles formés par les jonctions.

Conventions de tracé imposées (`research/moteur-arithmetique.md §3.4`) : `A` pointu,
`I` sans empattement, `a` et `g` à **un seul étage**, `Q` à queue tangente, `W` en
4 traits, `J` sans barre supérieure, points du `i`/`j` comptés comme trait et extrémité.

`derivees.js` calcule les trois tables et **échoue au chargement** si les sommes de
contrôle du §0.3 ne sont pas retrouvées.

---

## 3. Contrat du moteur visuel

Format normatif : `Scenario` / `Step` / `Op`, tel que spécifié dans
`research/moteur-visuel.md §2`. Rappel des points non négociables :

- `version: 1`.
- `tokens[].id` **stables, uniques**, non vides. Toute op référence des `id`, **jamais
  un index ni une position**.
- Un id créé n'est jamais recréé ; un id supprimé n'est jamais réutilisé.
- C'est **l'émetteur qui nomme** les tokens qu'il crée.
- Le scénario est **pur** : JSON sérialisable, aucune fonction, aucune référence DOM.
- Un `op` hors vocabulaire est une **erreur de compilation**, pas une op ignorée.
- `step.duration ≥ 16 ms` après compilation ; deux charnières distinctes d'au moins
  `2·EPS`.
- **`EPS = 4 ms`** — comparer `currentTime` par égalité stricte est un bug garanti
  (Firefox arrondit).

### 3.1 Vocabulaire fermé des ops

`highlight` · `dim` · `drop` · `substitute` · `move` · `group` · `insertOperators` ·
`sum` · `reduce` · `flip180` · `sevenSeg` · `countStrokes` · `keyboard` · `annotate` ·
`pulse` · `reveal` · `wait` · `partition` · `alphabet`

Ajouter une transformation arithmétique sans rendu ⇒ **ajouter d'abord la primitive
ici**, puis l'émettre.

> *Amendement — deux primitives ajoutées, selon la clause ci-dessus.*
>
> - **`partition`** — « on découpe la saisie en sous-groupes ». Le README promet
>   « trois d'affilée, **selon la même méthode** » ; sur `hope-hope-hope.fr`, la
>   démonstration traitait pourtant le premier morceau, puis le deuxième, puis le
>   troisième, sans jamais montrer qu'il y avait trois morceaux comparables. La
>   primitive écarte les frontières de groupe, resserre l'intérieur, et trace une
>   accolade numérotée par groupe. Corollaire côté émetteur
>   (`src/recherche/scenario.js`) : quand tous les morceaux subissent la **même
>   suite d'opérateurs**, les étapes sont émises **en parallèle** — une seule op
>   pour les trois groupes chaque fois que c'est exprimable (`substitute`,
>   `drop`, `move`, `pulse`…), et sinon les groupes s'enchaînent dans la même
>   transformation, titrés « — groupe 1 / 2 / 3 ».
> - **`alphabet`** — la réglette alphabétique, sur le modèle exact du clavier
>   virtuel : l'alphabet complet et **numéroté** paraît, la lettre s'envole vers
>   sa case, et son **rang** en redescend. Même contrôle croisé que `keyboard` :
>   si `to.text` diffère du rang que la réglette MONTRE, la compilation échoue.
>
> Comme `keyboard`, `alphabet` anime la caméra : **une par step**, jamais deux
> (vérifié statiquement par `src/visuel/scenario.js`). De même, `sevenSeg` et
> `countStrokes` ouvrent désormais un **encart** unique au centre de la scène et
> acceptent un `to` : ils sont donc émis **un par step**, un jeton à la fois.

### 3.2 Pièges figés en règles

1. `fill: 'forwards'`, **jamais `'both'`** (une animation tardive rétro-remplirait sa
   keyframe de départ et écraserait les steps antérieurs).
2. `persist()` sur **chaque** animation (sinon WAAPI supprime les animations recouvertes
   et le retour arrière casse).
3. Propriétés individuelles `translate` / `rotate` / `scale`, jamais un `transform`
   composite — chaque step anime son propre canal.
4. `transform-box: fill-box; transform-origin: center` sur tous les tokens.
5. Tout mesurer et animer en **unités `viewBox`** (`getBBox`), jamais en pixels écran.
6. Ne **jamais** animer l'attribut `viewBox` : animer le `transform` d'un `<g id="camera">`.
7. Ne jamais retirer un token du DOM (un `drop` doit rester réversible par `seek`).
8. Attendre `document.fonts.ready` **avant** toute mesure.
9. Interdiction totale de `foreignObject` dans la scène (canvas *tainted* à l'export).

### 3.3 API du lecteur

```js
const player = createPlayer(svgRoot, scenario, { reducedMotion:'auto', speed:1, autoplay:true });

player.total · bounds · steps · currentTime · stepIndex · playing · atStart · atEnd · atHinge
player.toStart() · prev() · next() · toEnd() · play() · pause() · seek(ms) · seekToStep(i)
player.rebuild() · destroy()
player.on('change'|'stepenter'|'end', cb)
```

Automate des boutons : `research/moteur-visuel.md §3.2`, cas limites §3.4.
`toEnd()` est ajouté pour le bouton **Fin** (§0.4).
L'UI est un **pur reflet** de `player` : aucune logique propre.

### 3.4 Autoplay

Quatre conditions, consommé **une seule fois** : `readyState === 'complete'`
**et** `document.fonts.ready` **et** `visibilityState === 'visible'` **et**
`document.hasFocus()` **et** pas de `prefers-reduced-motion`.
`autoplayConsumed` passe à `true` **avant** de jouer. Jamais remis à `false` sauf
changement de scénario via l'URL.

---

## 4. Contrat d'URL

### 4.1 Codes d'opérateurs — registre append-only

`code` = **préfixe de famille** (1 lettre) + **index base36** alloué à vie.

| Préfixe | Famille |
|---|---|
| `f` | filtre |
| `t` | tokeniseur / découpe |
| `n` | mesure (STR→NUM) |
| `m` | mappeur |
| `c` | combinateur |
| `p` | post-traitement / finisseur |
| `j` | joker |

Exemples : `f1` retirer le protocole · `m1` A1Z26 · `c1` somme · `p1` racine numérique ·
`p9` retournement du 9 (code réservé, par coquetterie).

**Trois règles inviolables :**
1. Un code alloué l'est **à vie**. Retirer un opérateur pose une pierre tombale : son
   code n'est jamais recyclé.
2. **Changer le comportement d'un opérateur = allouer un nouveau code**, et déprécier
   l'ancien *en conservant son comportement d'origine*. Le registre est un journal,
   pas un état.
3. L'ordre de déclaration du catalogue est l'ordre des codes croissants — c'est aussi
   l'ordre d'itération du moteur et l'ordre de tri de la canonicalisation N2.

Un test de non-régression **gèle les codes publiés** (vecteurs `code → entrée → sortie`).

### 4.2 Grammaire

```
url        := {chemin} '#' [approche] '#' b58(saisie)
approche   := fragment (',' fragment)*
fragment   := [portee ':'] programme
portee     := offset '.' longueur          // en tokens ; absent ⇒ saisie entière
programme  := code ('+' code)*
```

- **`+` sépare les opérations** d'un même fragment (choix utilisateur).
- **`,` sépare les fragments** dont les 6 s'assemblent en 666. Un second séparateur
  était nécessaire : le README employait déjà `+` pour l'assemblage, l'usage retenu
  pour `+` est celui des opérations, d'où la virgule au niveau supérieur.
- `×3:programme` est une **abréviation de résonance** : le même programme appliqué aux
  trois occurrences d'un motif répété (cas `hope-hope-hope`).

Exemples :

```
#f1+t1+m1+c1+p1#3fq9KJ                        une seule voie, saisie entière
#×3:m1+c1+p1#4CWoMo83vssW                     résonance : trois fois la même méthode
#0.1:m1+c1+p1,1.1:n2+p1,2.1:m4+c2#4CWoMo83    trois fragments, méthodes distinctes
##3fq9KJ                                       page de résultats (README)
```

### 4.3 Lecture tolérante, écriture canonique

| Forme lue | Comportement |
|---|---|
| Grammaire §4.2 | **Rejouée telle quelle, sans recherche.** |
| `#3+7+2#…` (rangs hérités du README) | Recherche relancée, rangs 3/7/2 du classement courant, bandeau discret « démonstration recalculée ». |
| `##…` | Page de résultats. |
| Code inconnu / portée hors bornes / format inconnu | Bandeau explicite + repli sur la page de résultats. |

**Un lien ne renvoie jamais silencieusement vers une autre démonstration :** soit il
rejoue exactement, soit il l'annonce.

À l'ouverture d'une démonstration, l'application réécrit **toujours** la barre d'adresse
en forme canonique via `history.replaceState`. L'utilisateur qui copie l'URL copie donc
un lien permanent sans avoir à le savoir. Les rangs restent affichés dans l'UI (le
README les veut pour le débogage) mais ne sont plus **l'identité** d'une démonstration.

### 4.4 Déterminisme — règles d'implémentation

1. **Ordre total explicite** : `score DESC → longueur ASC → suite des codes comparée
   lexicographiquement ASC`. Aucun ex æquo ne subsiste, donc la stabilité du tri natif
   devient sans objet.
2. **Score entier**, en milli-unités. Deux flottants à 10⁻¹⁶ près qui s'inversent
   suffisent à permuter deux lignes.
3. **Ordre d'itération maîtrisé** : toujours parcourir le catalogue par codes croissants.
   Jamais dépendre de l'ordre d'insertion d'une `Map` alimentée par un parcours de graphe.
4. **Aucune source d'entropie** : ni `Math.random`, ni `Date.now`, ni `localeCompare`,
   ni `Intl`. Comparaisons de chaînes en unités de code.
5. **Normalisation `NFC`** de la saisie avant toute chose.

---

## 5. Contrat du moteur de recherche

- BFS exhaustif sur états **canonicalisés**, faisceau de **12 chemins par état**.
- `D_MAX = 4` en avant, + 2 niveaux gratuits par le **bassin d'attraction** précalculé
  (test O(1) dès qu'un `NUM` est produit).
- Garde-fous : `MAX_NODES = 20 000`, `BUDGET_MS = 250` par fragment, mémoïsation par
  fragment normalisé, `N_FRAG_MAX = 64`.
- Score de conviction à 6 critères pondérés : homogénéité **0,25** · notoriété **0,20** ·
  couverture **0,18** · concision **0,15** · anti-ad-hoc **0,12** · élégance **0,10**,
  avec bonus/malus de `research/heuristique.md §4.7`.
- Anti-doublons à 4 niveaux, dont la déduplication **sur ce qui est montré** (trace des
  valeurs affichées) et un MMR de diversité (`λ = 0,35`, au plus 2 approches par mappeur).

  > *Amendement — N2 et N3 portent sur le chemin, pas sur l'étape.* N3 était
  > appliqué localement (« l'opérateur ne change pas l'état courant »), ce qui
  > laissait passer les étapes **inopérantes** : sur `hope-hope-hope.fr`,
  > `f6+f7+n1` et `f7+n1` cohabitaient alors que filtrer les lettres avant les
  > voyelles ne change rien au résultat. Le critère retenu est désormais le
  > RÉSULTAT : une étape dont le retrait laisse le chemin aboutir au même état
  > est retirée, même si elle changeait une image intermédiaire. De même, N2
  > trie les suites commutantes **dans le chemin** avant de calculer N1 — comme
  > le §4.8 le demande — et non plus seulement dans la clé, où la trace des
  > valeurs suffisait à faire survivre `f3+f1+n3` à côté de `f1+f3+n3`.
  >
  > *Amendement — le MMR choisit, il ne classe pas.* La sélection gloutonne
  > rendait sa liste par score AJUSTÉ décroissant, ce qui donnait à l'écran une
  > colonne de scores non monotone (9 012, 8 970, 7 930, … puis 8 992). La
  > liste retenue est désormais retriée par `ordreTotal` : la diversité décide
  > **qui** figure dans les douze, le score décide de **l'ordre**.
- Garantie « jamais bredouille » : si aucune approche, `approcheJoker()` — le joker
  français appliqué **trois fois** (donc homogène), avec malus `×0,45`.

  > *Amendement — le décret.* Un septième malus, `×0,40`, s'ajoute à la liste de
  > `research/heuristique.md §4.7` : il frappe l'approche qui applique **le même
  > programme à la même portée trois fois de suite**, donc n'obtient qu'**un seul
  > 6** et décrète les deux autres. Sans lui, ce décret gagnait le classement —
  > il rafle l'homogénéité (trois copies d'un chemin sont trivialement
  > homogènes) et la couverture (la portée est la saisie entière) sans jamais
  > payer le prix d'une seconde démonstration —, alors que le README demande
  > « trois fragments valant 6 chacun ». Il n'est pas supprimé pour autant :
  > sur un mot unique c'est le seul assemblage possible, et il reste plus
  > honnête que le joker (l'arithmétique montrée est vraie, seul le triplement
  > est de convenance). Il est donc traité comme le joker au §0.4 — présent,
  > dernier, et **intitulé explicitement** : « le même 6, trois fois ». Les deux
  > malus se composent : l'approche joker étant elle-même un décret, elle tombe
  > à ×0,18 et reste sous lui.
- Sortie : `≤ 12` approches diversifiées, `≤ 24` fragments.

**Les pondérations sont une prédiction, pas une mesure** (`research/heuristique.md §8.3`).
Un test à l'aveugle sur ~20 saisies doit les confirmer avant de les figer ; l'étalonnage
attendu sur les 7 méthodes du README sert de premier jeu de vérification.

---

## 6. Contrat de l'interface

- Trois pages, wording et maquettes de `research/design.md §3`. Typographie française
  stricte : guillemets `« »`, espaces fines insécables avant `! ? : ;`, majuscules
  accentuées.
- **Contrôles** : `aria-disabled` et **jamais** l'attribut `disabled` (sinon le focus
  clavier est éjecté en fin de démonstration). Bouton Lecture/Pause unique à nom
  accessible variable, **sans** `aria-pressed`. Jauge segmentée en vrais `<button>`.
- **La scène SVG est `aria-hidden`.** « Le Registre » — la liste textuelle ordonnée des
  étapes — est l'équivalent accessible **obligatoire**, et le repli si le moteur visuel
  échoue. La page reste valide sans la scène.
- Région live `aria-live="polite"` mise à jour **uniquement aux charnières**, une
  annonce par étape maximum.
- Cibles tactiles 48 px, focus visible jamais supprimé, lisible à 200 % de zoom et à
  320 px de large.
- `prefers-reduced-motion` traité **dans le compilateur de timeline**, pas seulement en
  CSS : les durées WAAPI sont fixées en JS et ignoreraient une règle CSS.
- Sans JavaScript : accueil et registre restent lisibles ; seule l'animation est perdue.

---

## 7. Ce qui reste à valider après implémentation

1. **Pondérations du score** — test à l'aveugle sur ~20 saisies.
2. **Tables hébraïque et grecque** — non recoupées sur sources externes
   (`research/moteur-arithmetique.md §9.8`). À vérifier avant publication : ce sont les
   méthodes les plus « sourçables », donc les plus exposées à la critique.
3. **Cross-navigateur** — le prototype WAAPI n'a tourné que sous Chrome. À revalider
   sous Firefox et Safari : arrondi de `currentTime`, `persist()`, `transform-box:
   fill-box` sur `<text>`, gel des animations en onglet caché.
4. **Patrons ARIA du lecteur** — l'APG WAI-ARIA ne publie pas de patron « media player ».
   Test réel NVDA/VoiceOver recommandé.
5. **Poids réel des polices** après sous-réglage (budget cible ≤ 260 Ko).
