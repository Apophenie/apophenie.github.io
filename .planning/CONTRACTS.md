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

   > *Amendement — une troisième famille servie, et pourquoi elle ne défait pas la
   > réduction à deux.* **DSEG7 Classic** (OFL 1.1, `src/fonts/dseg7-classic.woff2`,
   > sous-réglée aux 36 signes utiles : **948 octets**) rejoint Jost\* et JetBrains
   > Mono. Elle n'est pas une **voix** de plus — la charte en garde deux, et aucun
   > titre, aucun corps de texte, aucun badge ne la touche. Elle est un **instrument
   > de démonstration**, exactement au même titre que le point 3 ci-dessus : le tracé
   > vectoriel sert à montrer *les traits qu'on compte*, l'afficheur sept segments
   > sert à montrer *les segments qu'on compte*. Les deux répondent à la même
   > exigence, « ce que le spectateur voit est littéralement ce qui a été compté » —
   > pas à un arbitrage esthétique.
   >
   > **Où elle sert, et pourquoi là.** Uniquement dans **Le Registre**, sur les
   > méthodes `m7` et `m7F`. Le Registre est l'équivalent accessible obligatoire de la
   > scène (§6) ; la question posée par ces méthodes — « combien faut-il de lignes
   > droites pour former cette lettre ? » — n'a aucun sens devant un `H` de Jost\*.
   >
   > **Pourquoi une police et non un SVG.** Un dessin aurait fallu être doublé d'un
   > équivalent textuel écrit à la main : il **crée** le trou d'accessibilité qu'il
   > faut ensuite reboucher. Un caractère n'en crée aucun — le DOM porte `H`, un
   > lecteur d'écran lit « H » sans qu'on le lui explique, le texte est sélectionnable,
   > copiable, trouvable par la recherche du navigateur, et il grandit avec le zoom.
   > Dans l'équivalent accessible de la scène, du vrai texte est ce qu'il faut.
   > `font-display: swap` et un repli sur `--machine` garantissent qu'un `H` reste un
   > `H` si la police ne charge pas.
   >
   > **Réserve, mesurée et assumée.** La police dessine **sa** version des lettres, qui
   > diffère de `tables/seg7.js` sur **12 des 36 signes** (table complète et
   > conséquences : `src/moteur/tables/seg7.js`, `ECARTS_POLICE_SEG7`, gelée par un
   > test). Sur `m7F` — traits fusionnés, la méthode de référence — le **compte** tient
   > partout sauf sur 7, J, K, M, S, W et Z ; le **dessin**, lui, montre un `h` et un
   > `o` de bas de casse là où la scène allume un `H` et un `O` de capitale. Sur `m7`
   > — segments allumés — les comptes eux-mêmes divergent (C, H, I, O, S, U…), si bien
   > que le Registre peut y montrer un glyphe dont on ne retrouve pas, en le comptant,
   > le nombre annoncé juste à côté. **Le contrôle croisé du présent § n'est pas
   > entamé** : il porte sur la SCÈNE, qui redérive son compte du tracé qu'elle allume
   > et fait échouer la compilation en cas d'écart. La police illustre, elle
   > n'atteste pas.

   > *Amendement — un second afficheur, et la réserve ci-dessus levée.*
   > **DSEG14 Classic** (même famille, même auteur, même OFL 1.1,
   > `src/fonts/dseg14-classic.woff2`, sous-réglée aux 36 signes utiles :
   > **1 304 octets**) rejoint DSEG7. Elle n'ajoute pas une quatrième **voix** —
   > c'est le second afficheur du même **instrument de démonstration**, et il
   > règle ce que le sept segments ne pouvait pas régler.
   >
   > **Ce qu'il règle.** Le sept segments ne sait pas dessiner un `H` capital :
   > il emprunte (`K` et `X` reprennent le tracé du `H`), invente (`M`, `W`) ou
   > descend en bas de casse (`b d n q r t y`). Le quatorze segments écrit les
   > **26 lettres en capitales**, sans emprunt. Il distingue en outre `O` de `0`
   > (zéro barré) et `S` de `5`, que le sept segments confond.
   >
   > **Et surtout : la réserve de fidélité n'existe pas ici.** La table
   > `src/moteur/tables/seg14.js` n'est pas saisie à la main — elle est
   > **dérivée de la police**, contour par contour (chaque segment allumé est un
   > contour fermé du glyphe ; `src/gfx/dseg14-table.py` rejoue la dérivation et
   > réimprime la table). Le glyphe que Le Registre montre, les segments que la
   > scène allume et le nombre qu'annonce l'arithmétique sont **le même dessin**,
   > par construction. C'est la « règle structurelle » ci-dessous, appliquée à
   > une police plutôt qu'à un tracé maison. Il n'y a donc pas
   > d'`ECARTS_POLICE_SEG14`, et il ne doit jamais y en avoir : si la police
   > changeait, c'est la table qu'on redérive, pas l'écart qu'on documente.
   >
   > **Corollaire sur la question de fond** — « se servir du quatorze segments
   > pour un rendu sept segments plus fidèle » n'est **pas** retenu : montrer un
   > glyphe quatorze segments à côté d'un nombre obtenu en comptant des segments
   > *sept* romprait la règle d'or du présent §. Le quatorze segments est une
   > **méthode entière** — on compte ET on montre en quatorze —, avec ses
   > propres codes (`m14`, `m14F`) et sa propre primitive (`fourteenSeg`).

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

> *Amendement — L'ORAGE SONORE passe de quatre sons à TROIS.*
>
> « Le bruit d'orage est parfait et l'effet de foudre aussi. **L'ambiance
> continue n'est pas ce que je voulais** : je voulais un son de surprise /
> effroi **ponctuel** au moment de faire apparaître les cornes, façon jumpscare
> ou rire machiavélique. » (l'auteur)
>
> ★ **`abime` est retiré, et l'argument est plus général qu'un goût.** Un fond
> continu ne peut souligner **aucun** instant, par définition : ce qui est
> toujours là ne dit jamais « maintenant ». Il n'accompagnait donc pas la
> démonstration, il l'occupait — et il couvrait le seul son qui, lui, désigne un
> instant.
>
> ★ **Le sursaut existait déjà, et c'était le bon.** `effroi` était joué au
> couronnement mais noyé sous le drone. Vérifié plutôt que supposé : son
> enveloppe, relevée à `ffmpeg` crête à crête sur des fenêtres de 100 ms, monte
> de −21 dB à **−2,2 dB en 400 ms** puis retombe en 1,2 s. C'est la forme d'un
> « horror hit » — montée courte, impact, queue brève —, pas celle d'une nappe.
> Il n'y avait rien à chercher ailleurs : il fallait retirer ce qui le couvrait.
> Son niveau passe de 0,70 à 0,86 (il ne perce plus un fond, il tombe dans le
> silence), et il part à l'ENTRÉE de l'étape : ses 400 ms de montée placent
> l'impact à peu près quand les cornes jaillissent.
>
> ★ **Le poids.** `abime.ogg` pesait 22 588 octets, soit 30 120 octets de base64
> dans `src/sons/data.js`. Le son servi passe de **51 107 à 28 519 octets**
> (−44 %), et `data.js` de 70 083 à 39 798. Les sons pèsent désormais nettement
> moins que la typographie (67 712 octets de woff2), et le budget de §7.6 est
> tenu avec plus de marge qu'avant.
>
> ★ **Effet de bord sur WCAG 1.4.2** : plus aucun son ne démarre et ne dure plus
> de trois secondes avant le verdict. Le brasier reste — c'est le seul son qui
> décrive un ÉTAT de la scène (les 666 brûlent) et non un instant —, et il ne
> s'allume qu'à la chute.

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
  gfx/                logo-jost-trace.py, _logo-test.html, jost.ttf,
                      dseg14-table.py (dérive tables/seg14.js depuis la police)
                      (le générateur du logo et son banc ; jost.ttf est un
                       outil de build, il n'est jamais servi au navigateur)
  moteur/           ─────────────────────────── AGENT ARITHMÉTIQUE
    tables/
      alphabet.js   A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6
      jeux.js       SCRABBLE_FR, SCRABBLE_EN, T9, MORSE
      seg7.js       segments par lettre + fusion colinéaire
      seg14.js      idem, quatorze segments — DÉRIVÉE de DSEG14 Classic
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
    score.js        conviction (6 critères), entiers, ordre total,
                    ★ les trois classements (élégance · triptyques · mixte)
    elegance.js     ★ le barème du CHEMIN — ce qui se passe PENDANT le calcul
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
  banc/             ★ bancs de mesure du classement et de l'élégance
                    (jamais servis au navigateur, jamais empaquetés)
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
  code:       'ma1',         // ★ code d'URL parlant, inscrit au registre (§4.1)
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
  steps(avant, apres, ctx) { return [ /* Step[] */ ] },

  // ★ OPTIONNEL, et seulement pour les triches d'ADDITION (`mad`, `mrd`) :
  //   le nombre de TERMES de chaque addition que l'opérateur ferait sur ce
  //   vecteur, dans l'ordre de lecture. Pur et déterministe comme `apply`,
  //   dont il relit le plan. Le barème d'élégance en a besoin pour diluer la
  //   peine (§5, amendement du 27 août) : les états ne disent jamais en
  //   combien de GESTES les chiffres ont disparu. Un opérateur qui ne le
  //   porte pas paie la peine pleine.
  additions(valeur) { return [ /* number[] */ ]; }
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
`sum` · `reduce` · `flip180` · `sevenSeg` · `fourteenSeg` · `countStrokes` · `keyboard` ·
`annotate` · `pulse` · `reveal` · `wait` · `partition` · `table` · `horns`

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
>   ★ **Et le découpage prend le centre de la vue.** Le layout centre ce qu'il
>   dispose : toute la ligne. Tant que tout s'y lit d'un même œil, c'est le bon
>   centre — mais `partition` change de régime : les groupes deviennent le sujet
>   et le reste s'estompe (`dim`, même step). Or ce reste n'est presque jamais
>   également réparti, et **les deux sens existent** :
>
>   | découpage de `hope-hope-hope.fr` | le reste | le sujet tombe |
>   |---|---|---|
>   | contigu (`×3:` — les trois « hope ») | « .fr », en queue | 52 unités à **gauche** |
>   | dispersé (moisson — les deux tirets et « fr ») | devant et entre | 80 unités à **droite** |
>
>   Une compensation qui ne sait pousser que d'un côté ne compense donc rien :
>   c'est ce qu'a montré le mode `MOISSON`, qui récolte des 6 sur des portées
>   **disjointes**. Le report est **signé** (`layoutOpts.decalage`, `layout.js`)
>   et se dit d'une phrase — *amener le milieu des groupes au milieu de la vue* ;
>   il ne suppose rien de la forme du découpage, il lit une boîte englobante.
>
>   ★ Il est **bridé** pour ne jamais découvrir de vide : la ligne entière reste
>   dans la zone utile, et si elle déborde déjà, on ne touche à rien — c'est le
>   défilement (`@pan`) qui a la main, et deux recadrages qui s'ajoutent se
>   contrarieraient. ★ Il **traverse les steps**, parce que le découpage aussi ;
>   `reveal` le lève, et le verdict — qui n'a plus ni groupes ni reste —
>   retrouve le centre exact, dans le seul geste assez ample pour l'absorber.
>
>   ★ **Ce qui est centré, c'est le SUJET, pas la ligne.** Le choix est celui de
>   `defilement.js` — « garder l'action au centre » — appliqué au layout plutôt
>   qu'à la caméra, parce que la ligne tient dans la scène et qu'aucun
>   panoramique n'est donc légitime. Conséquence assumée : sur un découpage
>   dispersé, la ligne entière, elle, n'est plus centrée — le reste estompé
>   déborde du côté où il pèse. C'est le prix de la règle, et c'est le bon prix :
>   `dim` dit précisément que ce reste n'est pas ce qu'on regarde.
> - **`alphabet`** — la réglette alphabétique, sur le modèle exact du clavier
>   virtuel : l'alphabet complet et **numéroté** paraît, la lettre s'envole vers
>   sa case, et son **rang** en redescend. Même contrôle croisé que `keyboard` :
>   si `to.text` diffère du rang que la réglette MONTRE, la compilation échoue.
>   **Généralisée depuis en `table` — voir l'amendement en fin de §.**
>
>
> *Amendement — une troisième primitive ajoutée, selon la même clause.*
>
> - **`fourteenSeg`** — l'afficheur **quatorze segments**. Même geste que
>   `sevenSeg` — encart, changement de police, compteur, allumage un par un —
>   au point que le déroulé est partagé (`primitives/afficheur.js`) ; seul le
>   modèle change : géométrie, ordre d'allumage, règle de fusion, épaisseur du
>   trait. **Pourquoi une op de plus plutôt qu'un paramètre de `sevenSeg` :**
>   le vocabulaire nomme des **gestes**, et le nom de l'op est la première
>   chose qu'on lit d'un scénario. Appeler « sept segments » un afficheur qui
>   en allume quatorze aurait fait mentir le vocabulaire à l'endroit exact où
>   ce projet exige qu'il dise vrai. `segments` y voyage en **tableau**
>   (`['b','c','e','f','g1','g2']`) et non en chaîne : deux des quatorze noms
>   de segments font deux caractères (`g1`, `g2`).
>   Le contrôle croisé `count` est le même, et il porte sur la même règle de
>   fusion — colinéaires **et** adjacents —, relue sur la géométrie : les
>   quatre diagonales visent les **flancs** de la verticale centrale, donc
>   `h` et `m` (comme `j` et `k`) sont parallèles mais **jamais colinéaires**,
>   et ne fusionnent avec rien. Un test le vérifie sur les coordonnées.
>
> Comme `keyboard`, `alphabet` anime la caméra : **une par step**, jamais deux
> (vérifié statiquement par `src/visuel/scenario.js`). De même, `sevenSeg` et
> `countStrokes` ouvrent désormais un **encart** unique au centre de la scène et
> acceptent un `to` : ils sont donc émis **un par step**, un jeton à la fois.

> *Amendement — deux régimes de lecture, donc deux dessins de segments.*
>
> **Le constat de l'auteur** : « quand tu fusionnes les segments alignés,
> l'affichage actuel est pertinent ; quand tu les comptes individuellement,
> mieux vaut avoir des segments qui ne se superposent pas mais correspondent à
> la police de caractère que tu as importée ».
>
> Les deux régimes ne montrent pas la même chose, et un seul dessin ne peut donc
> pas servir aux deux :
>
> · **Fusion** (`m7F`, `m14F`) — il FAUT que `b` et `c` se soudent : c'est là toute
>   la démonstration. Les segments restent des **traits d'axe** colinéaires et
>   jointifs (`SEGMENTS`, `SEGMENTS14`), inchangés, et c'est leur géométrie qui
>   porte la règle de fusion (ci-dessus).
>
> · **Comptage individuel** (`m7`, `m14`) — deux segments qui se recouvrent, ce
>   sont deux choses comptées et une seule vue. Ils doivent être **disjoints**,
>   et tant qu'à les montrer séparément, ce sont **ceux de la police** que Le
>   Registre affiche à côté : un polygone plein par segment, dérivé de DSEG7 et
>   DSEG14 Classic contour par contour.
>
> ★ **La géométrie est DÉRIVÉE, pas redessinée.** `src/gfx/dseg-segments.py`
> fait pour le TRACÉ ce que `dseg14-table.py` fait pour la TABLE : il relève
> chaque contour fermé sur les trente-six signes, refuse un segment dessiné
> différemment d'un signe à l'autre, et le transpose par une **similitude** —
> même facteur en x et en y, sans quoi les diagonales n'auraient plus l'angle de
> la police. Le résultat est commité dans `assets.js` entre deux balises
> repères, et la **CI vérifie qu'il n'a pas dérivé** (`bun run segments:check`),
> exactement comme pour le logo. Une source unique, donc : ce que l'afficheur
> montre est ce que la police dessine.
>
> **Le contrôle croisé reste entier** : `count` compte les tracés RÉELLEMENT
> allumés, et la compilation échoue si le scénario en annonce un autre. Un test
> échantillonne en outre le repère glyphe et vérifie qu'**aucun point
> n'appartient à deux segments** — la disjonction est mesurée, pas affirmée.
>
> Seule conséquence technique : un trait s'allume par son `stroke`, un polygone
> plein par son `fill`. Le canal animé suit le dessin ; le reste du geste —
> encart, compteur, allumage un par un, substitution — est identique.

> *Amendement — `alphabet` généralisé en `table`, et le vocabulaire reste à vingt.*
>
> **Le constat.** La numérologie pythagoricienne, comme A1Z26, convertit lettre
> par lettre **au moyen d'une table**. A1Z26 déployait sa réglette numérotée et
> le « tiret du 6 » son clavier ; les quatorze autres — pythagore, chaldéen,
> gématrie ×6, Scrabble FR/EN, clavier téléphonique, morse, ASCII, hébreu, grec,
> nom français de la lettre — **affirmaient sans montrer**. Une conversion par
> table n'est vérifiable que si **la table est sous les yeux** : c'est la règle
> d'or de §0.3 appliquée aux correspondances.
>
> **L'abstraction retenue** — `table`, **une table de correspondance affichée**.
> Le geste est partout le même (*la table paraît, la case s'allume, la lettre y
> vole, la valeur en redescend*) ; seule la **mise en page** varie, et c'est une
> **option**, pas une primitive de plus :
>
> | `disposition` | une case porte | méthodes |
> |---|---|---|
> | `reglette` | **une lettre** et sa valeur, ordre alphabétique | toutes sauf `mt9` ; `flt` |
> | `glissiere` | **une lettre**, sur deux réglettes alignées | `fatb`, `fr13` |
> | `pave` | **les lettres d'une touche**, à leur place sur le téléphone | `mt9` |
>
> ★ **Seul le clavier téléphonique a plusieurs lettres pour un chiffre.** La
> mise en page « une colonne par valeur, les lettres dessous » a été retirée du
> vocabulaire : elle affirmait « ces lettres vont ensemble » sans jamais dire
> pourquoi, et elle mettait la valeur *ailleurs* que la lettre. Sur le pavé, au
> contraire, le groupement n'est pas une commodité — la touche `7` porte
> vraiment `PQRS`. Partout ailleurs : une case, une lettre, un nombre, et l'on
> y cherche sa lettre comme dans un dictionnaire.
>
> **Deux options de réglette, qui DÉMONTRENT au lieu de décorer.**
>
> · `cycle` — retour à la ligne **là où la table recommence** (la valeur cesse
> de croître). La pythagoricienne (`mpy`) réduit le rang modulo 9 : en cassant
> la ligne à chaque retour au 1, les trois rangées s'alignent colonne par
> colonne — `A J S` valent 1, `B K T` valent 2 — et la règle **se voit** au
> lieu d'être affirmée. Le découpage est DÉRIVÉ des valeurs, jamais donné, et
> la primitive **refuse** la mise en page si les colonnes ne se répondent pas :
> une table non cyclique ne peut donc pas emprunter ce dessin pour se faire
> passer pour régulière. C'est ce refus qui protège la chaldéenne (`mch`), dont
> les valeurs viennent d'une tradition sonore, n'emploient jamais le 9 et ne se
> répètent pas — elle reste en réglette simple, deux rangées de treize, et
> l'absence de 9 s'y constate case par case.
>
> · `teinte: 'valeur'` — fond de case d'autant plus contrasté que la valeur est
> grande (`msfr`, `msen` : le Scrabble). La direction est portée par les JETONS —
> `--raised` mêlé de `--line-ui` — donc plus foncée en thème clair et plus
> claire en thème sombre, sans que le dessin ait à deviner le thème. Amplitude
> plafonnée **par le contraste**, pas par le goût : au pire palier, 5,05:1 en
> thème clair et 6,07:1 en sombre, au-dessus du 4,5:1 de design §5.1, mesuré
> par un test. Et la teinte ne porte jamais l'information seule : le nombre
> reste écrit dans la case.
>
> Une case porte jusqu'à trois lignes : le glyphe, **l'intermédiaire quand il en
> existe un** (le code morse, la lettre hébraïque ou grecque, le nom français de
> la lettre) et la valeur. Sans cet intermédiaire, « H → 4 » resterait une
> affirmation table à l'appui ; avec lui, « H → ···· → 4 » se compte à l'œil.
>
> **`alphabet` disparaît du vocabulaire** : c'était `table` avec `disposition:
> 'reglette'` et les vingt-six rangs. Le vocabulaire reste donc à **vingt
> primitives** — une ajoutée, une retirée. Le nom continue de dire vrai : ce que
> l'op nomme est bien le geste, « montrer la table ».
>
> ---
>
> *Amendement — `glissiere`, et les chiffrements par substitution.*
>
> **Le constat, à nouveau.** L'Atbash (`fatb`) et le chiffre de César (`fr13`)
> convertissent lettre par lettre, eux aussi — mais lettre → **lettre**. Ils
> n'avaient aucune mise en scène : `h → s` sans qu'on voie jamais pourquoi. Or
> l'Atbash décide désormais de la sixième série de 666 sur
> `hope-hope-hope.fr` (il fait rendre trois 6 au préfixe `https`) : une étape de
> ce poids ne peut pas rester une substitution muette. Même verdict que §0.3,
> même remède — **la table est montrée** —, et rien de neuf dans le vocabulaire :
> c'est toujours `table`, toujours le même geste, une mise en page de plus.
>
> **La mise en page, parce que la règle EST une mise en page.** Écrire `A → Z`
> dans une case resterait une affirmation, vingt-six fois répétée. Ce qu'il faut
> montrer, c'est le RAPPORT entre deux alphabets — alors on dessine les deux
> alphabets, deux réglettes alignées colonne par colonne :
>
> ```
>   Atbash      A B C D … M N … X Y Z        l'alphabet
>               Z Y X W … N M …  C B A       le même, retourné bout pour bout
>
>   César (13)  A B C … L M | N O … Y Z      l'alphabet
>               N O P … Y Z | A B … L M      le même, glissé de treize rangs
> ```
>
> On lit `A` en face de `Z`, `B` en face de `Y`, et l'axe du miroir tombe pile
> au milieu de la bande (`M|N`, `N|M`). Pour César, la bande du bas est la même
> réglette **déplacée**, et la **couture** — le vide où le glissement ramène au
> début de l'alphabet — montre le modulo exactement là où il opère, comme le
> retour à la ligne de `cycle` montre celui de la pythagoricienne.
>
> ★ **Le dessin se refuse à qui ne le mérite pas**, comme `cycle`. Si les
> valeurs ne parcourent pas l'alphabet d'un pas constant de ±1, la réglette du
> bas n'est PAS celle du haut déplacée, et deux alphabets alignés affirmeraient
> une règle inexistante : la compilation échoue (`pasDeGlissiere`,
> `visuel/assets.js`). C'est ce refus qui laisse le leet speak (`flt`) en
> réglette ordinaire — six correspondances arbitraires, montrées mais non
> démontrées.
>
> ★ Le halo couvre alors la **colonne** — les deux réglettes ensemble : c'est le
> lien vertical qui est la correspondance, pas l'une ou l'autre case. Même
> raison que la mesure « colonne » du clavier.
>
> ★ Les trois verrous du contrôle croisé valent tels quels, à un pliage près :
> la réglette est écrite en capitales et la ligne garde sa casse (`h` en
> redescend `s` là où la case porte `S`). La comparaison se fait donc **à la
> casse près, et à la casse seulement** — c'est le pliage qu'`atbash` et `cesar`
> appliquent eux-mêmes. Un nombre n'ayant pas de casse, les tables
> lettre → nombre sont inchangées.
>
> ★ **Ce qu'un chiffrement ne touche pas ne bouge pas.** Le tiret de
> `hope-hope-hope` n'est pas dans l'alphabet : il ne fait aucune étape et
> **garde son identifiant** de jeton (`sortieMuee`, `transformations/
> filtres.js`). Le recréer à l'identique ferait clignoter un jeton que rien n'a
> transformé, et l'animation raconterait un travail qui n'a pas eu lieu.
>
> **Contrôle croisé, à trois verrous.**
> 1. La table qui voyage dans l'op (`entries`) est **dérivée de `fn`**, la
>    fonction même qu'`apply()` applique, évaluée sur les vingt-six lettres
>    (`tableDe`, `transformations/mappeurs.js`). La table montrée et la table
>    employée ne peuvent pas diverger : c'est une seule source, comme
>    `tables/derivees.js` pour les comptages de traits.
> 2. La primitive refuse de faire redescendre une valeur qui n'est pas dans la
>    case qu'elle DESSINE (`to.text` ≠ case ⇒ échec de compilation).
> 3. Le pont (`recherche/scenario.js`) recoupe une troisième fois, là où il
>    connaît encore le jeton de départ : la lettre envoyée dans la table est
>    bien celle qui est à l'écran.
>
> ★ Une exception, la seule : **l'alphabet garde son oracle indépendant**. Avec
> `ordre: 'a1z26'`/`'z26a1'`, le moteur visuel **recalcule** le rang au lieu de
> croire le scénario, et confronte la table reçue à la sienne, case par case.
> Les autres tables ne peuvent pas l'avoir sans recopier le moteur arithmétique,
> c'est-à-dire sans créer la seconde source de vérité que ce projet refuse.
>
> **★ L'aller-retour est INDIVIDUEL, et il est complet.** Une lettre monte vers
> la table, sa case s'allume, **sa valeur en redescend aussitôt à sa place** —
> puis seulement la lettre suivante. L'op traite donc **un jeton** (`target`) et
> l'émetteur émet **un step par lettre**. Faire partir les quatre lettres puis
> revenir les quatre nombres d'un bloc fait gagner du temps et **perdre la
> démonstration** : on ne voit plus quelle lettre a donné quel nombre,
> c'est-à-dire exactement ce qu'il fallait montrer. C'est un point tranché en
> ces termes par l'auteur, et il vaut pour **toutes** les conversions par table.
>
> **★ Ce qu'on mutualise, c'est le DÉCOR.** Quand plusieurs conversions
> **d'affilée** emploient la même table, elle **reste montée d'une étape à
> l'autre** : elle monte à la première (`montre`), demeure, et ne se retire qu'à
> la dernière (`retire`). La caméra suit le même contrat — un recul, un retour,
> rien entre les deux, donc un cadrage stable pendant que les lettres se
> succèdent. Le déploiement se paie une fois ; les allers-retours gardent chacun
> leur rythme plein.
>
> L'identité du décor est **dérivée du dessin** (`cleDeTable`, FNV-1a sur les
> étiquettes réellement tracées) : deux ops qui montrent la même table adressent
> le même nœud, et deux tables qui diffèrent d'une case ne peuvent pas se
> confondre. **Une méthode qui change, c'est une table qui change** : l'ancienne
> se retire avant que la nouvelle ne monte. La décision se prend à
> l'**assemblage** (`mutualiserDecorDesTables`, `src/recherche/scenario.js`) :
> c'est le seul endroit qui voit la suite complète des étapes — sur
> `hope-hope-hope.fr`, les trois groupes sont trois appels distincts à `steps()`
> et aucun ne peut savoir que le suivant montrera la même grille.
>
> **Scrubbing arrière exact.** Le nœud n'est jamais retiré du DOM (§3.2 règle 7)
> et chaque fondu est `forwards` : aucune animation ne touche la table pendant
> les étapes intermédiaires, donc revenir en arrière sur l'une d'elles **ne la
> fait pas clignoter** — l'état conservé y est celui du fondu d'entrée. Deux
> fondus par série, jamais plus ; un test le gèle.
>
> Comme `keyboard`, `table` anime la caméra : **une par step**, jamais deux
> (vérifié statiquement par `src/visuel/scenario.js`).
>
> **Redites — le critère, précisé.** Une table déjà montrée est une redite **si
> et seulement si l'on y refait la MÊME conversion** : **même table ET même
> lettre**. Déployer la réglette pour `H` puis pour `O`, ce n'est pas une redite
> — la table est la même, la conversion ne l'est pas, et chacune mérite son
> rythme plein. Le critère existant (`stepSignatures`, alpha-équivalence des
> `ops` à un renommage d'identifiants près) donne exactement ce résultat, et
> c'est **mesuré**, pas supposé : un test le gèle (`compile.test.js`, « une table
> redéployée pour une AUTRE lettre n'est pas une redite »). Sur
> `hope-hope-hope.fr`, huit des douze conversions sont des redites et passent de
> 2,7 s à 0,4 s.
>
> ★ **Et le critère ne regarde PAS les drapeaux de décor.** `montre` / `retire`
> disent quand la réglette monte et quand elle se retire : c'est le cycle de vie
> du DÉCOR, pas la conversion. Tant qu'ils entraient dans la signature, la tête
> d'une série ne pouvait être redite par personne — elle seule portait `montre` —
> et la queue non plus. Sur `hope-hope-hope.fr`, le « h » du deuxième groupe
> (phase 6) ne voyait pas qu'il redisait le « h » du premier, et le « e » du
> troisième (phase 13) ne voyait pas qu'il redisait le « e » du premier : deux
> lectures pleines pour deux gestes déjà vus. `compile.js` retire donc ces deux
> champs de la signature (`HORS_SIGNATURE`), et un test le gèle
> (`compile.test.js`, « les drapeaux de décor mutualisé ne changent pas le
> geste »). Ce que le décor fait de plus — se déployer, se replier — n'est pas
> une conversion, et n'a donc pas à en interdire une.
>
> **Durées.** Une transformation de quatre lettres coûte **7,5 s** (2,2 s pour la
> première, déploiement compris, puis 1,6 s par lettre, puis 2,1 s pour la
> dernière, repli compris). Sur `hope-hope-hope.fr`, la démonstration complète
> fait **61,8 s** au rythme plein et **32,0 s** avec l'accélération des redites —
> contre 37,4 s auparavant pour A1Z26 seul, qui redéployait sa réglette à chaque
> lettre. Ce que le décor mutualisé économise, il le rend en lisibilité : chaque
> conversion se voit en entier.
>
> *Amendement — le geste du clavier gagne, et le décor du clavier se mutualise
> lui aussi.*
>
> **Le constat de l'auteur** : « le remplacement des `-` par des `6` est bien
> plus lisible que les autres ». Trois différences, mesurées en comparant les
> deux gestes à l'écran :
>
> 1. **Le caractère passait PAR-DESSUS la touche**, alors qu'il s'enfonçait
>    derrière la table — le nœud `table` n'était pas déclaré dans `LAYER_OF`
>    (`visuel/dom.js`) et retombait donc dans la couche `front`, devant les
>    jetons. Le décor est désormais en `back` dans les deux cas : la
>    superposition est structurelle, pas une question d'ordre d'insertion.
> 2. **La case s'allume quand le caractère arrive** (à mi-vol), pas avant qu'il
>    parte : l'illumination devient la conséquence de l'arrivée.
> 3. **Le caractère reste opaque jusqu'à l'atterrissage**, là où on lit les
>    deux ensemble.
>
> Le geste est donc écrit **une seule fois**, dans `visuel/primitives/decor.js`
> (`monterDecor` · `allerRetour` · `replierDecor`), et les deux primitives
> l'appellent avec leur géométrie. `keyboard` et `table` restent **distinctes**
> — un clavier est un objet physique à trois mesures, une table une
> correspondance abstraite qu'on met en page — mais elles ne peuvent plus
> diverger sur le geste : un test gèle l'égalité de leurs deux partitions.
>
> **Le décor mutualisé vaut aussi pour le clavier.** L'identité du nœud est
> celle du DESSIN (`@kbd:layout:rangées:mesure`), plus celle du jeton traité :
> deux conversions d'affilée sur le même clavier ne le font plus redescendre
> puis remonter. ★ **Et une étape sans décor ne referme pas la série si elle ne
> touche pas à la ligne** : sur `hope-hope-hope.fr`, l'assemblage intercale
> « On isole le troisième morceau » entre les deux tirets du 6 — une simple
> désignation. Seules les étapes inertes pour la mise en page (`highlight`,
> `dim`, `pulse`, `annotate`, `wait`) sont traversées ainsi ; une étape qui
> déplace, substitue ou regroupe referme la série, parce que la ligne bouge
> sous un décor qui, lui, ne suivrait pas.
>
> **Plus de cartouche derrière les jetons de la ligne principale.** `highlight`
> posait un aplat d'or à 22 % derrière chaque jeton désigné. L'auteur le juge
> disgracieux, et il avait un second défaut : il **survivait à ce qu'il
> désignait** — un jeton consommé par `table` ou `keyboard` s'envolait vers sa
> case en laissant son cartouche orphelin dans la ligne. Le halo est retiré ; la
> désignation repose sur la couleur ET la dilatation du jeton, plus l'estompe
> (`dim`) de tout le reste. Le geste efface en outre le halo du jeton qu'il
> consomme, comme `substitute` le faisait déjà.
>
> **Le Registre.** Pas de grille : la légende de chaque étape porte **la
> correspondance réellement consultée**, intermédiaire compris — « `H → ···· →
> 4` ». Une grille de vingt-six cases répétée à chaque étape serait du bruit, et
> la relire ne prouverait rien de plus que la paire employée, qui, elle, sort de
> la même source que le dessin. Le Registre reste l'équivalent accessible
> **obligatoire** de la scène (§6) : tout ce que la scène montre y est écrit.

> *Amendement — les gestes des COMBINATEURS, et le vocabulaire qui reste à vingt.*
>
> Quatre reproches de l'auteur, quatre gestes refaits. **Aucune primitive
> ajoutée** : le vocabulaire nomme des gestes, et les quatre étaient déjà des
> variantes de gestes nommés. Ce qui change, c'est ce qui se passe *dedans*.
>
> **1. Sélectionner n'est pas calculer.** « On garde le plus grand » se jouait
> comme un dénombrement : tout se ramassait sous l'accolade, le **premier**
> jeton survivait — qui n'est pas le maximum —, puis un `substitute` le
> remplaçait par la bonne valeur. Le geste mentait deux fois. Il n'a plus
> d'accolade du tout : `highlight` désigne le gagnant, `drop` (mode `erase`)
> efface les perdants **sur place**, `move` resserre. Le gagnant **ne bouge
> pas, ne change pas, et garde son identité de jeton** — `op.sortie` rend son
> id, pas celui d'un jeton neuf, parce que c'est le même nombre avant et après.
> Vaut pour `cmx` (max) et `cmn` (min) ; tout combinateur qui SÉLECTIONNE au lieu
> de calculer déclare `geste: 'selection'`.
>
> **2. Une moyenne se nivelle.** « La somme divisée par le nombre de valeurs »
> est une définition, pas un geste. `group` reçoit `niveler: true` : un `1`
> quitte le plus grand, décrit une **courbe** et rejoint le plus petit ; les
> deux nombres changent ; on recommence jusqu'à ce qu'aucun écart ne dépasse 1.
> Ce qui reste **est** la moyenne — la somme est invariante —, et les jetons qui
> n'atteignent pas la valeur commune **sont** l'arrondi : ils s'effacent, les
> autres fusionnent. La suite converge, et c'est démontré : chaque transfert
> diminue d'au moins 2 la somme des carrés des écarts. Elle est en outre
> **bornée** à `MAX_TRANSFERTS = 18` ; au-delà, l'émetteur retombe sur le geste
> sobre (accolade, ramassage, valeur) et la primitive **refuse** un `niveler`
> qu'on lui aurait passé quand même. Deux contrôles croisés : la moyenne est
> **recalculée sur les nombres affichés** et comparée à `to.text`, et la somme
> après nivellement est comparée à la somme avant.
>
> **3. Un comptage se compte.** `group` reçoit un `to` : l'accolade tient sa
> promesse **elle-même** au lieu de la déléguer à un `substitute`. Chaque jeton
> compté descend dans la pointe et fait avancer le compteur **d'un cran** ; ce
> qui n'est pas compté (`count` désigne ce qui l'est) s'efface sur place sans
> rien faire avancer — sur `hope.fr`, le point ne compte pas, et on **le voit**
> ne pas compter. `doubles` ajoute une **ligne étiquetée juste au-dessus** où
> les jetons qui comptent deux fois sont recopiés : « les lettres, plus les
> voyelles » cesse d'être une formule, les voyelles montent d'un cran sous le
> mot « voyelle » et l'on voit chacune passer deux fois dans l'accolade.
> Contrôle croisé : le nombre de jetons qui entrent réellement, doublons
> compris, doit égaler `to.text`. Vaut pour les mesures `nl`…`nlc`
> (`mappeurs.js`, chacune déclarant `cibles` et, pour `nlv`/`nlc`, `doubles`) et
> pour les dénombrements `cnv`, `cnj`, `cnjd`.
>
> **4. Les nombres ne sont pas des chiffres.** Le critère existait déjà pour les
> **titres** (`natureOperandes`, `combinateurs.js`) ; il sert désormais aussi au
> **rendu**, sur la même matière — les jetons vivants de la ligne, jamais un
> drapeau qui voyagerait dans l'op et pourrait diverger. Dès qu'un jeton de la
> ligne demande plusieurs chiffres : **chaque nombre est souligné** d'un trait
> qui se trace à sa largeur exacte, et **l'écart entre nombres s'élargit**
> (2,2 × le gap) — rien ne s'insérant, par construction, entre les chiffres d'un
> même nombre, qui sont un seul jeton. Sans ça, `15 16` se lit `1516`. Sur une
> ligne de chiffres, les deux marques seraient du bruit : elles ne paraissent
> pas. Conséquence assumée : sous une accolade, une ligne de nombres
> **s'écarte** au lieu de se resserrer — c'est le trait, alors, qui dit le
> regroupement.
>
> **Durées.** Elles ne sont plus fixes : un ramassage dure ce qu'il a à montrer.
> `dureeRamassage` (moteur) et `poidsRamassage` (visuel) sont deux copies de la
> même table de poids — accolade 900, doublons 800, nivellement 260 + **520** par
> transfert, effacement 380 + 90 par jeton, vol 620 + 260 par jeton, remontée
> 760 —, pour la même raison que `DUREE_OP` : le moteur arithmétique ne dépend
> pas du moteur visuel mais doit dimensionner l'étape. Un test croisé échoue si
> elles divergent. Mesuré, `hold` de lecture compris : comptage des quatre
> lettres de `hope`, **3,7 s** ; des six lettres de `hope.fr` (le point s'efface
> sans compter), **4,7 s** ; « les lettres, plus les voyelles » sur `hope`,
> **5,0 s** ; moyenne de `8 15 16 5` (neuf transferts), **8,7 s** ; de
> `1 7 4 7 8 6 5 9 5` (sept transferts), **9,1 s** ; sélection du plus grand,
> **3,3 s**. Une somme reste à 4,0 s : son geste n'a pas changé.
>
> ★ **Le nivellement a été RALENTI** (340 → 520 ms par transfert, à la demande
> de l'auteur) : « ralentis le mouvement des 1 qui migrent du max au min, ça
> rendra le phénomène plus lisible ». C'est le seul geste du ramassage où l'on
> suit **un objet du regard** d'un bout de la ligne à l'autre — les autres
> phases allument, effacent ou font monter sur place. Un `1` voyage désormais
> ~660 ms au lieu de ~430, la cadence passe de ~430 à ~530 ms, et le
> recouvrement entre deux transferts reste le même quart (`dur = pas × 1,25`) :
> on ralentit le trajet, on n'empile pas deux `1` en vol. Conséquence assumée :
> neuf transferts coûtent 1,6 s de plus. C'est le prix affiché de la doctrine
> — « la compréhension et la lisibilité priment, il y a de quoi faire avance
> rapide si besoin ».

> *Amendement — `reveal` quand il y a **plus qu'un** 666.*
>
> **Le constat.** Une moisson rend `666 666 666 666 666`. Quinze chiffres jetés
> d'un bloc au milieu de la scène ne se lisent ni comme un nombre — personne ne
> compte quinze rangs — ni comme cinq séries : rien ne le dit. Et les grossir
> tous ensemble sur une ligne les **rapetisse**, puisque c'est la LARGEUR qui
> borne l'agrandissement : cinq séries d'un seul tenant plafonnent à ×1,7 là où
> une série monte à ×8,5.
>
> **Le geste se déplie en trois temps, et chaque temps dit une chose :**
>
> 1. **rassembler** — le reste s'efface, les chiffres se rejoignent au centre,
>    **à leur taille**. On voit d'abord qu'il ne reste qu'eux.
> 2. **découper** — un vide s'ouvre tous les trois chiffres. La suite cesse
>    d'être un nombre pour devenir un **compte**.
> 3. **grossir** — et là seulement.
>
> ★ **La séparation vaut exactement une espace.** Pas un écart choisi à l'œil :
> la chasse est fixe, donc `666 666` écrit à la main mettrait un caractère
> d'espace entre les deux, et la distance de centre à centre y serait le
> **double** de celle qui sépare deux chiffres voisins. C'est cette distance-là
> qui est reproduite — le lecteur ne voit pas une séparation décorative, il voit
> une espace.
>
> ★ **Au-delà de trois séries, DEUX rangs.** C'est la seule façon de les grossir
> davantage, chaque rang devenant deux fois plus court : sur cinq séries,
> l'agrandissement passe de ×1,7 à ×2,6. La coupure tombe **entre** deux séries,
> jamais dedans, et la moitié haute prend le rang du dessus (5 → 3 puis 2).
> L'interligne suit l'agrandissement (1,45 hauteur de capitale), sans quoi des
> glyphes trois fois plus hauts se chevaucheraient.
>
> ★ **Ce n'est pas une entorse au « jamais deux lignes »** (`defilement.js`).
> Cette doctrine défend une **séquence**, qui se lit d'un bout à l'autre et
> qu'une coupure au milieu trahirait — un retour à la ligne dans une URL invente
> une frontière qui n'existe pas. Le verdict n'est pas une séquence, c'est un
> **compte** : cinq objets identiques dont l'ordre ne dit rien. Le repli
> automatique reste donc interdit (`wrap` : faux) ; seule s'applique la coupure
> **explicite** posée par la primitive (`layoutOpts.coupuresExplicites`).
>
> ★ **Des triptyques DÉJÀ COURONNÉS vont droit à leur place.** Rassembler puis
> découper sert à rendre visible une structure qui ne l'est pas : quinze 6
> alignés ne se lisent pas comme cinq séries tant que rien ne les sépare. Mais
> quand chaque série porte ses cornes (`horns`), le découpage est sous les yeux
> depuis longtemps, et le rejouer défait puis refait ce que le spectateur a déjà
> vu se faire. Un seul trajet les mène alors de là où ils sont à leur place
> finale, séparations et rangs compris. Mesuré sur « Donald Trump » : trois
> temps de trajet deviennent **un**, et le verdict passe de 4,9 s à 2,9 s.
> Le critère est **observé** — on demande à la scène si chaque série porte un
> décor de cornes, sur l'un quelconque de ses trois chiffres —, jamais déduit du
> nombre de chiffres : un triptyque contigu mais **nu** n'a jamais été montré
> comme tel, et repasse par les trois temps.
>
> ★ **On ne découpe pas ce qui n'est pas fait de séries entières.** Un verdict
> de quatre chiffres existe (les bancs d'essai en ont un) : y ouvrir un vide
> après le troisième affirmerait un « 666 + 6 » que personne n'a démontré. Et un
> 666 seul ne se déplie pas — rassembler et grossir y sont le même geste, les
> intercaler ferait un temps mort au moment de la chute.

> *Amendement — « On ne garde que les 6 » : une fois, et juste avant le verdict.*
>
> **La règle, dictée par l'auteur.** « Cette étape ne devrait jamais être
> utilisée si ce n'est en étape quasi finale — juste avant le verdict — et
> encore : ça devrait toujours être un malus de score que de l'employer. »
>
> **Pourquoi ce n'est pas une question de rythme.** Une démonstration qui trie
> quatre fois en cours de route montre quatre fois qu'elle **savait d'avance ce
> qu'elle cherchait**. Le tri est un aveu : il dit que le calcul a produit autre
> chose que des 6 et qu'on écarte le reste. Un aveu, on le fait une fois, à la
> fin, en le montrant — pas à chaque portée, comme une méthode.
>
> **Ce qui change.** Le `GROUPEMENT` n'a qu'un vecteur et triait déjà à la bonne
> place. La `MOISSON` en a un par portée et triait après chacune : mesuré sur
> `https://hope-hope-hope.fr/` en gématrie anglaise, **quatre tris plus un
> appoint** dispersés dans 69 étapes. Chaque portée met désormais de côté sans
> rien montrer (`rejets`, `scenario.js`), et **un seul geste final** ramasse les
> 6 de toutes les portées — l'appoint qui ne fait pas trois compris. 69 étapes
> → **66**, un seul tri, en avant-dernière position.
>
> ★ Deux légendes disparaissent avec le tri par portée (« On en garde N », « le
> 6 en trop reste sur le carreau ») : elles disaient chacune une moitié de ce
> que dit maintenant `recolterLegende` en une fois — combien de séries on garde,
> combien de valeurs tombent.
>
> **Le malus existe déjà, et il mord** : c'est le rendement (`score.js ›
> rendementSix`), la part de ce qui a été calculé qui vaut réellement 6,
> appliqué en facteur multiplicatif sur le score. Mesuré sur
> `https://hope-hope-hope.fr/` : la voie « quatorze segments » garde 18 valeurs
> sur 20 (R = 900), la voie « gématrie anglaise puis réduction » n'en garde que
> 9 sur 23 (R = 391, soit ×0,63 après racine). Un test croise les deux : le
> rendement d'une approche doit valoir le rapport gardés / (gardés + jetés) que
> son étape de tri **montre** — si le malus disparaissait, l'écart sauterait aux
> yeux.

> *Amendement — LE 6 DE TROP N'EST PLUS JETÉ : il EXPLOSE au verdict.*
>
> **La demande, mot pour mot.** « Il reste un 6 de trop au verdict ; une fois
> les 6 réunis, celui (ou les deux) du centre surnuméraire disparaît (explose en
> mode scénique pour propulser les autres à grossir avant que la foudre ne les
> enflamme). » Puis, sur un lien précis : «
> `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#2HuP1G8mNg3sJWhqR` insère une étape
> 24 pour retirer le 6 excédentaire alors que c'est **durant le verdict**, une
> fois les 6 collés les uns contre les autres, que le 6 **central** devrait
> disparaître par explosion pour propulser les deux triptyques dans leur
> agrandissement. »
>
> **Ce qui se faisait, et les trois reproches.** Sept 6 récoltés font deux séries
> et un appoint ; l'appoint tombait dans l'étape « on ne garde que les 6 », d'un
> `drop` en mode `fall`. (1) L'étape s'intitule « on ne garde que les 6 » et
> jetait un **6** — sur le lien ci-dessus, elle ne faisait même que cela. (2) Un
> `drop` fait TOMBER : rien ne bouge autour de ce qui s'en va, alors que ce qui
> est demandé POUSSE. (3) Et le 6 jeté était le **dernier** de la ligne, le
> découpage en séries étant glouton et de gauche à droite : un 6 qui s'en va par
> le bout ne sépare rien.
>
> **★ CE N'EST PAS UNE VINGT-DEUXIÈME PRIMITIVE, et c'est l'argument de
> l'orage.** Le vocabulaire §3.1 nomme les GESTES DE LA DÉMONSTRATION, ceux dont
> Le Registre doit rendre compte. Or le retrait du 6 en trop est **déjà nommé** :
> il voyage dans `reveal.surnumeraires`, il se lit dans l'inventaire du scénario
> (`recherche/scenario.js › inventaire`), et Le Registre y trouve tout ce qu'il a
> à dire — ce jeton-là s'en va au verdict. Ce que le dessin ajoute est la FORME
> de ce départ, donc de la mise en scène. C'est une **option** de `reveal`, au
> même titre que `disposition` pour `table` : un nom de plus aurait coûté cinq
> tables à tenir d'accord pour ne rien nommer de neuf.
>
> **Ce qui se fait maintenant, en deux temps au lieu de trois.**
>
> 1. **rassembler TOUT** — les six révélés et le septième, épaule contre épaule,
>    à leur taille. C'est la seule image où la ligne dit « sept » ;
> 2. **l'explosion, et la propulsion au MÊME INSTANT.** Pas un retrait suivi d'un
>    mouvement : un mouvement CAUSÉ par un retrait. La causalité s'écrit dans les
>    horloges, pas dans un dessin.
>
> **★ Et il n'y a plus de temps de DÉCOUPAGE, parce que l'explosion le fait.** Le
> blanc que le verdict ouvre entre deux séries vaut deux écarts et une chasse,
> c'est-à-dire **deux pas** de centre à centre ; or un jeton qui occupe un pas en
> sépare justement deux. Le trou que le 6 de trop laisse derrière lui **EST** la
> séparation, au centième d'unité (`visuel/tests/explosion.test.js`). Le vide n'a
> pas à être creusé, il n'a qu'à ne pas se refermer. Corollaire : la voie courte
> des triptyques déjà couronnés (amendement précédent) ne s'applique plus quand
> il y a quelque chose entre eux — elle supposait qu'il n'y ait rien à retirer.
>
> **★ QUEL 6 est en trop : celui du MILIEU, et à une condition stricte.**
> `recherche/scenario.js › lesPlusCentraux` choisit la coupure qui **sépare deux
> séries** — jamais l'intérieur de l'une d'elles, un triptyque coupé en deux ne
> serait pas propulsé mais cassé — et parmi elles la plus proche du milieu, à
> égalité la plus à gauche (rien à départager, donc rien à truquer, §4.4).
>
> La permutation n'est licite que parce que les jetons sont **interchangeables**,
> et la fonction renonce dès qu'ils cessent de l'être : il faut une **cible
> homogène** (sur `007`, la suite `0 7 0 0 7` n'écrit la cible qu'en sautant le
> deuxième jeton, et permuter changerait ce qui est démontré) et **au moins deux
> séries** (une explosion PROPULSE : il lui faut quelqu'un à pousser de chaque
> côté). Hors de là, l'appoint retombe dans la chute ordinaire, à son étape.
>
> Effet de bord mesuré, et bienvenu : sur « Donald Trump », les deux triptyques
> révélés cessent d'être un mélange (`Donald`×3 + `Donald`×1 + `Trump`×2) pour
> devenir ceux que la ligne écrit d'elle-même — le 666 de « Donald » et celui de
> « Trump », que la démonstration couronne désormais tous les deux en chemin.
>
> **★ Le partage des registres est celui des cornes et de l'orage.** Le RETRAIT
> a lieu dans les deux : c'est un fait — il y avait sept 6, le verdict en révèle
> six —, et le registre change ce qui se voit, jamais ce qui est démontré. Le
> **souffle** (neuf éclats projetés, un tracé réécrit par le canal discret, à la
> manière de l'effritement des cornes) n'existe qu'en registre scénique, et pas
> en mouvement réduit : une enveloppe compilée à 1 ms n'est pas une explosion,
> c'est une image blanche d'une frame.
>
> **★ Un rôle de plus dans `dom.js`, aucun nom de plus dans le vocabulaire** :
> `souffle`, un `<path>` rempli à sous-tracés fermés, couche `front` — ses éclats
> passent PAR-DESSUS les deux triptyques qu'ils écartent, et c'est ce
> recouvrement qui fait lire une poussée plutôt qu'un fondu.

> *Amendement — `horns`, la vingt-et-unième primitive : LES CORNES.*
>
> **La demande de l'auteur, mot pour mot.** « S'il y a *naturellement* 3 “6”
> d'affilée, mets des cornes dessus et efface le reste de la séquence. » C'est
> le cas de `Donald` en quatorze segments (`[6,6,6,7,3,6]`) et de `Trump` en
> chiffre de César puis quatorze segments (`[6,6,6,4,4]`) : deux 666 **déjà
> formés, en tête, sans rien réarranger**.
>
> ★ **Ce n'est PAS « On ne garde que les 6 », et le nom doit l'empêcher.**
> L'amendement précédent traite du TRI : aller chercher des 6 dispersés,
> écarter ce qui les sépare, les mettre bout à bout. C'est un aveu — il dit que
> le calcul a produit autre chose et qu'on choisit après coup —, il ne se fait
> qu'une fois, en avant-dernière étape, et il coûte au score. Ici, rien n'est
> rassemblé : les trois 6 sont **contigus dans le vecteur**, le 666 est écrit
> avant qu'on le regarde. On ne le fabrique pas, on le **constate** — et c'est
> exactement ce qui autorise à effacer le reste. Effacer ce qui n'appartient
> pas à une suite qu'on n'a pas choisie n'est pas trier : c'est arrêter de lire
> quand la phrase est finie.
>
> Le nom porte cette différence, et il doit continuer de la porter :
> **« d'affilée » est le mot qui interdit l'assouplissement.** La question « et
> si on acceptait trois 6 non contigus ? » a une réponse, et c'est non — trois
> 6 non contigus, c'est précisément l'autre geste, celui qui coûte.
>
> **Une op de plus, et pourquoi pas une option d'une op existante.** Le
> vocabulaire nomme des GESTES, et le nom de l'op est la première chose qu'on
> lit d'un scénario (même argument que `fourteenSeg` face à `sevenSeg`). Aucun
> geste existant ne dit celui-ci : `highlight` désigne sans rien dessiner,
> `drop` efface sans rien couronner, `reveal` conclut — alors que les cornes se
> posent **en cours de route** et durent jusqu'au verdict. « On met les
> cornes » se lit ; « `highlight` avec l'option cornes » mentirait sur ce qui
> se passe.
>
> ★ **La primitive EFFACE elle-même, et ce n'est pas une commodité.** Si un
> `drop` effaçait le reste avant elle — même dans le même step —, elle ne
> verrait plus que trois 6 seuls dans la ligne, donc trivialement contigus, et
> elle couronnerait sans broncher trois 6 qui étaient dispersés. Le contrôle
> croisé n'y survivrait pas. Elle vérifie donc la contiguïté sur la ligne
> **telle qu'elle est**, puis efface. Corollaire de rythme, qui va dans le même
> sens : le reste s'efface **avant** — et à la fin, pendant — que les cornes
> poussent, jamais après. C'est ce qui fait lire « il n'y avait que ça » plutôt
> que « on a enlevé ce qui gênait ».
>
> **Contrôle croisé, à trois verrous**, comme pour les tables :
> 1. `transformations/mappeurs.js` dérive les cibles ET la liste à effacer du
>    même index, relu sur la valeur qu'`apply()` a examinée — pas de seconde
>    copie qui puisse diverger ;
> 2. `recherche/scenario.js` recoupe là où il voit encore la valeur des jetons
>    de départ et leur ordre : trois « 6 », trois rangs consécutifs. En cas
>    d'écart, repli sur le rendu générique avec avertissement ;
> 3. `visuel/primitives/horns.js` recoupe sur LA LIGNE — trois jetons vivants,
>    trois « 6 », trois rangs consécutifs du flux — et **fait échouer la
>    compilation** sinon.
>
> ★ **Les cornes se posent sur les 6, pas sur la scène.** Une accolade de
> `partition` est posée à un ENDROIT et se retire à la fin de son step
> précisément parce qu'elle ne suivrait pas. Les cornes, elles, doivent durer
> jusqu'au verdict. Le nœud est donc **accroché** (`data.suit`) au 6 du milieu :
> `scene.satellitesDe` le fait suivre à chaque reflow, et le verdict
> l'agrandit avec les chiffres qu'il couronne. Un seul nœud pour les deux
> cornes, ancré sur le jeton **médian** — trois jetons de même chasse séparés
> d'écarts égaux ont pour centre le centre du jeton du milieu, et le verdict
> grossit glyphes et écarts du même facteur : un `scale` suffit, sans
> arithmétique de rattrapage.
>
> ★ **Poser quelque chose au-dessus des chiffres, c'est leur prendre de la
> hauteur.** Le décor annonce son débord (`data.debord`, en unités nominales) et
> `reveal` l'inclut dans le calcul de l'agrandissement : sans cela, un 666 seul
> monte à ×8,5 et envoie les pointes 200 unités au-dessus du bord du cadre. Le
> verdict paie donc en TAILLE, pas en débordement, et la ligne descend de la
> moitié du débord pour que ce soit le BLOC — ce qu'on regarde — qui soit
> centré, et non l'ancre des glyphes. Même signature que `layoutOpts.decalage`
> pour le découpage : un report, jamais un placement à la main.
>
> **Le dessin.** Deux cornes, un seul tracé de deux sous-chemins fermés,
> **rempli** — une corne porte son épaisseur dans sa forme, large au pied et
> fine à la pointe, ce qu'un trait d'épaisseur constante ne sait pas dire. En
> **rubrique**, la couleur de l'affirmation (design §2.3), celle que le verdict
> donnera aux chiffres. Rien d'autre : ni halo, ni aura — « à l'instant où les
> chiffres occupent l'essentiel de la scène, il n'y a plus rien d'autre à
> regarder ». Les deux bords sont bombés vers l'extérieur, l'intérieur un peu
> plus que l'extérieur : c'est ce galbe qui fait lire une corne et non un
> aileron. Une corne est décrite **une fois**, dans un repère dont le `+x` va
> vers le dehors, et un signe la retourne — deux tracés symétriques écrits à la
> main finiraient par ne plus l'être.

> *Amendement — les cornes ont DEUX moments, et le rang du haut seul.*
>
> **La demande de l'auteur, mot pour mot.** « Sur cette voie les cornes
> devraient apparaître dès la fin de l'étape 5 pour marquer l'apparition rapide
> du triptyque. C'est possible grâce au fait que le triptyque ne sera jamais
> remanié ensuite : ces trois 6 seront encore là à la fin. […] En revanche
> l'élimination des chiffres suivants, une fois la phase qui a fait apparaître
> les 666 terminée, peut être remise à plus tard pour faire apparaître plus vite
> d'autres 666. » Et, plus tôt : « quand il y a plusieurs séries de 666,
> [les cornes] seulement sur les 666 de la ligne du haut ».
>
> **Le geste se scinde donc en deux, et les deux n'ont pas la même horloge.**
>
> · **Le couronnement** vient DÈS QUE les trois 6 contigus existent. Sur
>   `Donald Trump` en quatorze segments, `D o n` valent 6, 6, 6 à la cinquième
>   étape : le 666 est écrit là, et les conversions suivantes (`a l d` → 7, 3,
>   6) se poursuivent **sous les cornes**, ce qui est exactement la vérité de ce
>   qui se passe. L'apparition rapide du triptyque est ce qu'on marque ; la
>   suite des lettres reste la suite logique.
>
> · **L'effacement** peut au contraire ATTENDRE, et il attend : tous les
>   effacements se regroupent en **un seul geste**, juste avant le verdict.
>   Résultat visé et obtenu : **les deux 666 sont couronnés avant que quoi que
>   ce soit ne s'efface.**
>
> ★ **Ce report va DANS LE SENS de la doctrine, il n'y fait pas exception.**
> « On ne garde que les 6 » ne se joue qu'une fois, juste avant le verdict,
> parce qu'une démonstration qui écarte quatre fois en cours de route montre
> quatre fois qu'elle savait d'avance ce qu'elle cherchait (amendement
> précédent). Effacer ce qui entoure un 666 n'est toujours PAS trier — les trois
> 6 sont contigus, on ne les a pas choisis, on les a lus —, mais c'est le même
> mouvement de la main, et il gagne à se faire au même moment. La règle devient
> **une** au lieu d'avoir une exception. Corollaire appliqué : **s'il existe
> déjà une étape de tri, l'effacement la REJOINT** au lieu de se poser juste
> à côté — sans quoi la scène montrerait un « 7 » pendant que l'étape voisine
> annonce qu'on ne garde que les 6.
>
> **L'ordre des deux gestes ne s'inverse jamais.** Le contrôle croisé exige que
> la contiguïté soit lue sur la ligne TELLE QU'ELLE EST, avant tout effacement
> (`visuel/primitives/horns.js`). Ici l'effacement passe plus loin encore
> qu'avant : le verrou est plus serré, pas plus lâche. La ligne que la primitive
> lit est pleine.
>
> ★ **L'AVANCE SE VÉRIFIE, ELLE NE SE SUPPOSE PAS** (`placeDuCouronnement`,
> `src/recherche/scenario.js`, fonction pure et exportée). Trois conditions :
> 1. **les trois 6 existent** — la place visée est celle qui suit l'étape ayant
>    fait naître le dernier d'entre eux ;
> 2. **rien ne change l'ordre des rangs entre les deux places** — seules sont
>    traversées les étapes inertes (`highlight`, `dim`, `pulse`, `annotate`,
>    `wait`) et les remplacements **un pour un à la même place** (`table`,
>    `keyboard`, `sevenSeg`, `fourteenSeg`, `countStrokes`, `flip180` avec un
>    `to`). C'est ce qui permet de CONCLURE plutôt que de parier : la contiguïté
>    établie à la place d'origine par le troisième verrou vaut alors aussi à la
>    place avancée, puisqu'on la remonte le long d'opérations qui préservent
>    l'ordre ;
> 3. **ils survivent jusqu'au bout, et leur contiguïté avec** — aucune étape
>    postérieure ne les efface, ne les remplace, ni ne rebat l'ordre de la ligne.
>
> Si l'une des trois manque, le couronnement **reste où l'opérateur l'a posé**.
> Un couronnement posé sur un 666 qui se déferait ensuite serait un mensonge
> visuel, exactement celui que le projet refuse partout ailleurs.
>
> ★ **Et le rang du haut seul.** Au-delà de trois séries, `reveal` répartit le
> verdict sur deux rangs (amendement « `reveal` quand il y a plus qu'un 666 ») :
> les cornes des séries du rang du bas s'effacent alors. Cinq paires de cornes
> sur deux rangs, ce n'est plus une trouvaille qu'on souligne, c'est un motif de
> papier peint. Sur un seul rang, tout ce qui est couronné le reste — il n'y a
> rien à alléger. Les détrônées gardent leur `scale` : elles ne se désolidarisent
> pas, elles deviennent invisibles.
>
> **Ce qui est mis À DISPOSITION du barème** (`scenario.cornes`, et
> `jalonsDesCornes`, pure) : le nombre total d'étapes, le rang de chaque
> couronnement et sa part du total, et de combien d'étapes il a gagné sur la
> place d'origine. Le bonus lui-même appartient à `score.js` et n'est pas
> calculé ici : ce module mesure et publie, il ne note pas.
>
> **Mesuré sur la voie de référence** (`Donald Trump`,
> `0.1:tca+m14+m36,2.1:fr13+tca+m14+m36`) : 22 étapes deviennent **23** — un
> couronnement à la 6ᵉ (au lieu de la 9ᵉ), un second à la 19ᵉ (au lieu de la
> 21ᵉ), un effacement unique à la 22ᵉ, le verdict à la 23ᵉ.

> *Amendement — les cornes sont CALÉES SUR LE GLYPHE, une par 6, et les trois
> chiffres changent de camp avec elles.*
>
> **La demande de l'auteur, mot pour mot.** « Peux-tu les écarter un chouilla
> davantage, pour qu'elles soient et restent alignées avec la barre haute des
> 6 : que le côté droit de la corne droite soit dans le prolongement du côté
> droit de la barre du 6 de droite, et que la pointe droite de la corne de
> gauche arrive sur la pointe en haut à droite de la barre du 6 de gauche. » Et,
> séparément : « j'aimerais que tu colores les 6 associés aux cornes au moment
> où tu leur ajoutes les cornes ». La silhouette, elle, ne bouge pas — elle est
> « visuellement fantastique » et n'était pas en cause.
>
> ★ **La géométrie du chiffre est DÉRIVÉE, pas transcrite** — §0.3, règle
> structurelle, appliquée cette fois à la police de la SCÈNE. Le « 6 » de
> JetBrains Mono porte sa barre haute en trois segments DROITS ; l'abscisse de
> son sommet droit (0,413 em depuis l'origine du glyphe) et la pente de son
> flanc (0,623494, en montant) sont relevées sur le contour par
> `src/gfx/jetbrains-six.py`, commitées dans `visuel/assets.js` entre deux
> balises repères (`SIX_BARRE`) et **vérifiées en CI** par le même
> `bun run segments:check` que les afficheurs. Le script refuse d'imprimer quoi
> que ce soit si le sommet de la barre n'est plus à la hauteur de capitale, si
> la chasse n'est plus `ADVANCE_RATIO`, ou si l'instance par défaut n'est plus
> `wght 400` : le repère dans lequel la primitive pose ses cornes est celui dans
> lequel la police dessine son chiffre, et il est prouvé, pas supposé.
>
> ★ **Les deux contraintes de l'auteur tombent juste, et sans arbitrage.** Soit
> `S` le débord du sommet de la barre depuis le centre de son jeton, `x₀`
> l'écartement cherché et `e` la largeur de la base d'une corne : la corne droite
> pose son pied externe sur le sommet du 6 de droite (`x₀ + e/2 = D + S`) et la
> corne gauche son point le plus à droite sur celui du 6 de gauche
> (`−x₀ + e/2 = −D + S`). Différence : `x₀ = D`. Somme : `e = 2·S`. Autrement
> dit **chaque corne est centrée sur SON 6, et sa base est large de deux fois le
> débord de la barre** — deux contraintes, deux inconnues, une solution exacte,
> et symétrique par construction. `CORNE.ecart` et `CORNE.base`, qui étaient des
> réglages à l'œil, disparaissent.
>
> Un seul sacrifice, et il est dit : `galbeExterne` cesse d'être libre. Pour que
> « prolongement » ne soit pas un simple point de contact suivi d'un coude de six
> degrés, la première poignée de Bézier du bord externe est posée **sur** la
> droite qui prolonge le flanc. Le galbe externe est ce qui reste une fois la
> direction imposée : 0,10 devient ≈ 0,072 em, et la corne est un rien moins
> bombée sur son flanc extérieur. `galbeInterne` — celui qui l'affine, celui
> qu'on regarde — est intact.
>
> ★ **UNE CORNE, UN NŒUD, SUR SON PROPRE 6 — et l'amendement précédent est
> corrigé sur ce point.** Il posait « un seul nœud pour les deux cornes, ancré
> sur le jeton médian », au motif que le verdict grossit glyphes et écarts du
> même facteur et qu'un `scale` suffit donc. **La prémisse est fausse** : le
> verdict ne multiplie pas les écarts, il les REPOSE (`poserLeFlux` réécrit
> `gapBefore` depuis `layoutOpts.gap`). Sur « Donald Trump », les cornes se
> posent pendant un découpage, où `partition` a resserré la ligne à 0,7 écart ;
> le verdict rend l'écart plein. Mesuré dans le navigateur : l'entraxe passe de
> 33,0 à 34,8 unités nominales et les pieds des cornes tombaient **7,4 unités**
> en deçà du sommet des barres, au verdict.
>
> Or l'entraxe n'a rien à faire dans le dessin d'une corne : une corne est posée
> sur UN chiffre. Chaque corne reçoit donc **son propre nœud**, accroché au 6
> qu'elle couronne (`data.suit`), et l'entraxe disparaît de la géométrie — avec
> lui toute la classe de défauts « la ligne s'est re-espacée et le décor ne l'a
> pas su ». Le calage n'est plus préservé par une coïncidence d'échelles, il est
> **structurellement incassable** : chaque corne suit son 6 à chaque reflow et
> grandit avec lui au verdict, comme n'importe quel décor accroché. Corollaire
> sur le geste : chaque corne jaillit du 6 qu'elle couronne, et non du centre du
> groupe — une corne pousse sur une tête, pas au milieu de trois. Corollaire sur
> l'amendement « des triptyques déjà couronnés » ci-dessus : le critère observé
> porte désormais sur **l'un quelconque** des trois chiffres de la série, le
> médian n'en portant aucune.
>
> ★ **Et les trois 6 passent en rubrique au moment où les cornes poussent** —
> même instant de départ, durée contenue dans la sienne : c'est un seul geste.
> Les TROIS, pas seulement les deux couronnés : c'est le 666 qu'on désigne, et
> deux 6 rouges encadrant un 6 pâle ne se lisent pas « 666 ». Le canal `fill`
> passe par `animSolidaire` (§3.2, solidarité du décor accroché) ; `reveal`
> repasse ensuite par la même valeur au verdict, dans un step ultérieur — les
> deux animations se **succèdent** sans jamais se recouvrir, donc aucune
> concurrence (`tl.warnings` reste vide) et le retour arrière rend la couleur
> d'origine sans saut.
>
> ★ **Le calage est MESURÉ, pas affirmé** — `visuel/tests/cornes.test.js` : que
> le pied de la corne droite soit sur le prolongement du flanc, que son bord le
> quitte avec la bonne pente, que le point le plus à droite de la corne gauche
> (échantillonné sur les cubiques, pas déduit) tombe sur le sommet de l'autre
> barre. Trois fois : à la taille de la ligne, à celle du verdict (×4), et sur
> une ligne resserrée par un découpage puis rendue à son écart plein. Un test
> vérifie en outre que le tracé d'une corne est **identique** quel que soit
> l'espacement des 6 : c'est la garantie qui rend le reste impossible à casser.

> *Amendement — COURONNER SANS EFFACER, et les cornes cessent d'appartenir à `m36`.*
>
> **Le constat de l'auteur.** « Les 3 premiers 6 devraient pouvoir recevoir leur
> corne entre l'étape 5 et 6, puis entre 13 et 14 pour les 666 de "ope" du 2nd
> hope. Les 2 derniers n'auront pas leur corne car ligne du dessous et "e-h"
> n'aura ses cornes qu'à l'étape verdict puisque les 6 ne sont pas réunis
> avant. » Il parle de `hope-hope-hope.fr`, la voie mise en vitrine
> (`src/i18n/fr.js`), sur laquelle **aucune corne ne poussait**.
>
> **Ce n'était pas une régression, c'était un trou.** L'unique émetteur de la
> primitive `horns` était l'opérateur `m36` (`transformations/mappeurs.js`), et
> `m36` fait DEUX choses : il couronne trois 6 contigus **et il tronque le
> vecteur à ces trois-là**. C'est juste quand la portée ne rapporte qu'une
> série — sur `Donald Trump`, il n'y a rien à garder après le 666 —, et c'est
> ruineux dès qu'elle en rapporte plusieurs : sur `hope-hope-hope.fr`, `m36` ne
> garderait que 3 des 15 six, une série au lieu de cinq. Le classement le
> rejette à juste titre, la voie de tête n'emploie donc pas `m36`, et rien
> n'émettait plus de cornes. Vérifié plutôt que supposé : la voie classée
> première est exactement celle du lien figé dans `fr.js`.
>
> ★ **Le couronnement se DÉTACHE de l'effacement, et il change de main.**
> L'assemblage (`recherche/scenario.js › couronnerLesTriptyques`) pose désormais
> un `horns` **sans `efface`** partout où la ligne écrit trois 6 côte à côte.
> Pourquoi là et pas dans le catalogue : un opérateur ne voit que sa propre
> étape — `m14` appliqué au « h » du deuxième `hope` ne peut savoir ni que le
> « e » du premier et le tiret qui suit portent déjà un 6, ni que les trois
> formeront une série au verdict. L'assemblage voit les deux choses qu'il faut
> voir ensemble : **la suite complète des étapes** et **les jetons que le verdict
> révélera**, dans l'ordre. Même argument que pour le décor mutualisé des tables.
>
> ★ **Le registre de codes n'est pas touché** (§4.1, registre CLOS). Aucun code
> neuf, aucun sens changé : un couronnement n'est pas une étape de calcul, il ne
> transforme aucune valeur et ne figure dans aucune URL. La même URL rend la
> même arithmétique qu'avant, et le barème est inchangé — il « lit la GÉOMÉTRIE,
> jamais la présence d'un code » (§5).
>
> ★ **ON COURONNE CE QU'ON CONSTATE, JAMAIS CE QU'ON A RASSEMBLÉ**, et l'instant
> regardé le dit. Ce n'est pas « le premier step où les trois se touchent », mais
> **le step où le troisième paraît** — et l'on regarde alors s'il paraît CONTRE
> les deux autres. La nuance est de nature, pas de rythme : trois 6 déjà côte à
> côte au moment où le dernier arrive, c'est un 666 qu'on lit ; trois 6 qui ne se
> touchent qu'après qu'on a ôté ce qui les séparait, c'est l'autre geste — « On
> ne garde que les 6 » —, celui qui s'avoue une fois, juste avant le verdict, et
> qui coûte au score. Le critère laxiste aurait planté des cornes sur le TRI de
> `https://hope-hope-hope.fr/`, et glissé une étape entre le tri et le verdict.
>
> ★ **La ligne est REJOUÉE, et le rejeu déclare forfait plutôt que de deviner**
> (`suivreLaLigne`, pure et exportée). La contiguïté est une question d'ORDRE, et
> `inventaire()` ne connaît que des ensembles. `scenario.js` appartient au moteur
> de recherche et ne peut pas importer le modèle de scène : il rejoue donc la
> ligne op par op, et rend `null` dès qu'il rencontre ce qu'il ne sait pas
> rejouer exactement — une op hors table, un sélecteur déclaratif, un jeton
> introuvable. Tout ce qui s'appuie dessus renonce alors à couronner.
> **Et le double est MESURÉ** : `recherche/tests/integration-visuel.test.js`
> compile chaque scénario avec le compilateur RÉEL et compare, step par step, la
> ligne rejouée au `scene.flow` du moteur visuel — 1 142 lignes, zéro écart,
> zéro renoncement sur le jeu d'essai. **Et le troisième verrou reste le dernier
> mot** : `visuel/primitives/horns.js` relit la contiguïté sur la ligne au moment
> de compiler, et fait échouer la compilation si elle n'y est pas.
>
> ★ **Le VERDICT couronne ce que la démonstration n'a pas pu couronner**, et
> c'est la seconde moitié de la phrase de l'auteur. Une série dont les trois 6
> ne se réunissent qu'au rassemblement final — le point de `.fr` reste entre le
> « e » du troisième `hope` et le 6 de « fr » — reçoit ses cornes là
> (`reveal.js`). Quatre restrictions, chacune tirée d'une phrase :
>
> | restriction | pourquoi |
> |---|---|
> | **plusieurs séries**, jamais un 666 seul | « quand il y a plusieurs séries de 666 » : les cornes font LIRE chaque triptyque comme distinct, service inutile quand il n'y en a qu'un — et un 666 seul le paierait de la moitié de sa taille (×8,5 → ×4,8), poser un décor au-dessus des chiffres leur prenant de la hauteur |
> | seulement les **séries nues** | un nœud de cornes est nommé d'après le 6 qu'il couronne : deux couronnements sur un même chiffre se disputeraient le même identifiant |
> | seulement le **rang du haut** | « seulement sur les 666 de la ligne du haut » : couronner le rang du bas pour l'en dépouiller aussitôt (`detrones`) serait faire puis défaire |
> | seulement **trois « 6 »** | le contrôle croisé ne se relâche pas parce qu'on change d'endroit. La contiguïté, elle, n'a pas à être vérifiée : c'est le verdict lui-même qui pose ces trois chiffres côte à côte |
> | seulement le registre **scénique** | « sous « sobre », il reste sans orage mais perd ses cornes ». Le scénario sobre a déjà vu ses couronnements réécrits en désignation ; en remettre au verdict rendrait par la fenêtre ce que le registre a sorti par la porte. `ctx.scenographie` EST le registre — la page le pose depuis le même booléen que l'orage et le son |
>
> Le geste diffère d'un cheveu : en cours de route la corne **jaillit** du
> chiffre (`scale` 0 → 1) ; au verdict elle **paraît** à sa taille et grandit
> avec lui, portée par l'homothétie. Deux animations de `scale` sur le même nœud
> se recouvriraient, et c'est exactement ce que le compilateur signale comme
> concurrence. Le TRACÉ, lui, est écrit une seule fois (`poserLesCornes`,
> `primitives/horns.js`) : deux dessins de corne finiraient par ne plus être le
> même.
>
> **Mesuré sur le jeu d'essai** : 17 paires de cornes deviennent **152** sur 169
> approches, et 41 verdicts changent d'agrandissement — tous parce qu'un décor
> qu'ils n'avaient pas leur prend désormais de la hauteur. Sur la voie de la
> vitrine, quatre couronnements aux étapes 6, 12, 16 et 22 d'une démonstration
> qui en compte 29 : le premier tombe « entre l'étape 5 et 6 » du déroulé
> d'origine, exactement là où l'auteur l'attendait.
>
> ★ **Une divergence assumée avec la lettre de la demande.** L'auteur annonce
> que « e-h » — la deuxième série, le « e » du premier `hope`, le tiret, le « h »
> du second — n'aura ses cornes qu'au verdict, « puisque les 6 ne sont pas réunis
> avant ». La ligne dit le contraire : à la fin de l'étape 10, elle porte six 6
> d'affilée, et les rangs 3, 4 et 5 se touchent. Le couronnement tombe donc à
> l'étape 12. La règle est appliquée telle qu'elle est écrite — dès que trois 6
> sont contigus, on les couronne — plutôt que l'exception, qui n'a pas
> d'appui dans ce que la scène montre.

> *Amendement — LES CORNES SORTENT DE L'URL, elles s'effritent au second rang,
> et l'agencement des rangs suit une règle.* — 27 août 2026.
>
> Cet amendement **corrige** le précédent (« COURONNER SANS EFFACER ») sur trois
> points, et l'auteur les a demandés dans la même passe de retours.
>
> ★ **1. « Contigus » ne suffisait pas : il faut D'UN SEUL TENANT.**
>
> > « Il y a eu 2 ajouts de cornes anticipées, l'un sur `6 6 6`, l'autre sur
> > `6 66`. Seuls les 666 non séparés reçoivent des cornes anticipées, et encore,
> > seulement s'ils sont censés les avoir jusqu'à la fin. » (l'auteur)
>
> Les deux couronnements fautifs portaient bel et bien sur trois rangs
> **consécutifs** de la ligne — le rejeu le disait, et le troisième verrou l'a
> confirmé. Ce que ni l'un ni l'autre ne voyait, c'est l'ÉCART : un découpage
> (`partition`) laisse devant le premier jeton de chaque groupe un `gapBefore` de
> **4,5 fois** l'écart ordinaire, et cet écart survit aux substitutions par
> héritage (`helpers.espacementDe`). Trois chiffres séparés par ça ne se lisent
> pas `666`, ils s'énumèrent.
>
> `suivreLaLigne` (`recherche/scenario.js`) suit donc désormais, en plus de
> l'ordre, **les frontières de groupe** — la pose par `partition`, l'héritage par
> le jeton qui prend la place, et rien d'autre. C'est mesuré à l'identique contre
> le `gapBefore` du moteur visuel sur toutes les lignes du jeu d'essai
> (`tests/integration-visuel.test.js`) : le jour où une primitive écartera la
> ligne pour une autre raison — `marquerLesNombres` élargit à 2,2 fois quand une
> ligne porte des nombres à plusieurs chiffres, cas qu'aucune saisie du jeu
> d'essai ne produit encore —, le test rougit là plutôt qu'une corne ne s'égare
> ici.
>
> La règle finale du couronnement anticipé tient en **trois conditions
> cumulatives** :
>
> | condition | ce qu'elle refuse |
> |---|---|
> | **contigus, sans frontière entre eux** | `6 6 6` et `6 66` — trois rangs qui se suivent mais qu'un découpage écarte |
> | **et ils le restent jusqu'au verdict** | un triptyque que la suite disperserait ou qu'un découpage rebattrait. Exigé sur CHAQUE ligne connue, de l'instant du couronnement à la dernière étape avant le verdict ; si le rejeu rend la main avant, on renonce — ne pas savoir n'est pas savoir que oui |
> | **la ligne d'arrivée n'entre pas en compte** | rien : c'est une AUTORISATION. « Ajoute-leur les cornes tout de suite en mode scène, même s'ils arrivent en 2ⁿᵈ ligne au verdict » |
>
> ⚠️ **La « divergence assumée » du précédent amendement est donc close, et dans
> l'autre sens.** La deuxième série de `hope-hope-hope.fr` — « e », le tiret,
> « h » — était couronnée à l'étape 12 au nom de « la règle telle qu'elle est
> écrite ». C'est l'une des deux cornes que l'auteur a signalées comme fautives.
> Sur la voie de la vitrine, quatre couronnements deviennent **deux**, aux étapes
> 6 et 15 : les deux seuls triptyques dont les trois 6 tiennent dans un même
> morceau.
>
> ★ **2. Aucun OPÉRATEUR ne pose plus de cornes.**
>
> > « L'ajout des cornes ne devrait pas modifier l'url mais être fait à la volée
> > en mode `sce!` — ça éviterait d'avoir des liens `sce!` sans cornes parce
> > qu'ils ont été créés avant. » (l'auteur)
>
> `m36` (`m.troisSixDAffilee`) était le dernier émetteur de `horns` du catalogue,
> et il faisait DEUX choses d'un seul geste : couronner et tronquer le vecteur.
> Un couronnement qui dépend d'un code dépend de l'URL — deux liens
> arithmétiquement identiques montraient l'un des cornes, l'autre pas. Or les
> cornes ne changent ni une valeur, ni un rang, ni un compte : **elles n'ont rien
> à faire dans un programme.** La présence de cornes découle désormais de la
> LIGNE et du REGISTRE, et de rien d'autre.
>
> **Et l'effacement, lui, reste chez `m36`** — c'est la seule moitié qui soit de
> l'arithmétique (le vecteur passe de six valeurs à trois), l'URL la nomme, elle
> doit donc se jouer là où le code la nomme. Elle devient une **étape à part
> entière**, avec son propre titre, et son motif est MONTRÉ avant d'être exercé :
> un `highlight` désigne les trois 6 contigus — la raison de garder ceux-là et
> pas d'autres — puis la gomme n'emporte que le reste.
>
> > « L'effacement est une étape à part, et si elle n'a pas de motif (chiffre
> > minoritaire, pair/impair) c'est probablement la pire des triches, à pénaliser
> > en conséquence. » (l'auteur)
>
> ⚠️ **Conséquence assumée : deux morceaux, deux gommes.** L'assemblage
> repoussait tous les effacements devant le verdict pour n'en faire qu'un — deux
> gommes séparées par un couronnement auraient dit qu'on écartait deux fois. Ce
> report n'a plus d'objet et il a disparu (`reglerLesCornes`, allégé de sa moitié
> « effacement » et de ses deux libellés). Les rassembler détacherait chaque
> gomme de son motif, et déplacerait de surcroît une étape que l'URL nomme loin
> du code qui la nomme.
>
> ★ **Le contrôle croisé n'y perd rien, et gagne un cran.** Le troisième verrou
> (`visuel/primitives/horns.js`) redoutait qu'un `drop` efface AVANT lui, le
> laissant couronner trois 6 seuls donc trivialement voisins. C'est désormais
> structurellement impossible : l'assemblage ne couronne qu'à l'instant où le
> troisième 6 PARAÎT — nécessairement avant l'étape de `m36` —, et il exige de
> surcroît que la contiguïté tienne jusqu'au verdict.
>
> ★ **3. Au verdict, les cornes du second rang S'EFFRITENT.**
>
> > « Au verdict, au moment de l'agencement, fais s'effriter/disparaître
> > progressivement les cornes des triptyques qui vont en 2ⁿᵈ ligne. » (l'auteur)
>
> Elles s'en allaient d'un fondu d'opacité, toutes ensemble. Elles se rongent
> maintenant **depuis la pointe** : le bord externe est tronqué à hauteur
> décroissante (subdivision de Casteljau — la seule troncature qui ne déforme pas
> la courbe), le bord interne repris à la même hauteur, et les deux réunis par un
> front **dentelé** qui descend. La dentelure est écrite à la main, comme
> l'enveloppe de l'éclair : aucun tirage au sort (§4.4), donc un scrubbing qui
> retombe toujours sur la même image. Chaque corne part sur son horloge — deux
> cornes qui s'effritent au même instant refont un geste unique, donc un
> effacement.
>
> ★ **Par le TRACÉ, jamais par l'opacité ni par un filtre**, et ce n'est pas un
> détail de mise en œuvre. Le nœud porte déjà l'échelle du verdict ; une opacité
> animée sur un élément transformé est la recette même du défaut de composition
> Firefox (§3.2, règles 3 et 4), et un `filter` y ajoute le retramage à chaque
> palier d'échelle — la cause mesurée des saccades du feu. **Le garde-fou du
> compositeur est donc étendu au `filter`** (`visuel/tests/compositeur.test.js`).
> L'effritement passe par le **canal discret** `d`, fonction pure du temps de la
> timeline, qui apprend au passage à revenir en arrière : un canal `d` qui n'a pas
> encore commencé rend au nœud son tracé d'origine (`node.data.d`), sans quoi une
> corne effritée puis ramenée avant son effritement restait un moignon.
>
> ★ **4. L'AGENCEMENT DES TRIPTYQUES EN RANGS — une règle, en une phrase.**
>
> Le verdict n'avait que deux régimes : un rang, ou deux dès la quatrième série,
> coupés en `⌈n/2⌉`. L'auteur en a dicté dix cas, puis le critère qui les
> gouverne — « minimiser l'écart entre deux lignes, mais aussi l'écart entre le
> nombre d'items par ligne et le nombre de lignes ». Les deux ne coïncidaient pas
> sur sept ; interrogé, il a tranché en faveur du critère et **corrigé son propre
> exemple** : « OK pour passer 7 en 3+2+2, c'est mieux en effet. »
>
> **La règle : le moins de lignes possible, à condition qu'une ligne porte en
> moyenne MOINS de trois triptyques et demi ; puis la répartition la plus égale
> possible, les lignes les plus fournies en tête.** Table de vérité :
>
> | n | rangs | n | rangs |
> |---|---|---|---|
> | 1 | `[1]` | 6 | `[3,3]` |
> | 2 | `[2]` | 7 | `[3,2,2]` |
> | 3 | `[3]` | 8 | `[3,3,2]` |
> | 4 | `[2,2]` | 9 | `[3,3,3]` |
> | 5 | `[3,2]` | 10 | `[4,3,3]` |
>
> Le seuil n'est pas choisi, il est **encadré** : `10 → [4,3,3]` fait tenir 3⅓
> triptyques par ligne (le seuil doit le dépasser), `7 → [3,2,2]` refuse une
> moyenne de 3½ (le seuil ne doit pas aller au-delà). Il vit dans `]3⅓ ; 3½]`, et
> 3½ en est la valeur ronde. La comparaison est **stricte**, et c'est exactement
> ce qui décide de sept : accepter l'égalité donnerait `[4,3]`. Écrite en
> entiers, la règle est `lignes = ⌊2n/7⌋ + 1`.
>
> `repartirEnLignes` (`visuel/primitives/reveal.js`) est la source unique de cet
> agencement — fonction pure, exportée, éprouvée sur les dix cas
> (`visuel/tests/verdict-rangs.test.js`). Le verdict la lit trois fois : la
> coupure du flux, la largeur du rang le plus long, et le rang qui garde ses
> cornes. ⚠️ **Au-delà de dix, tout est extrapolation** — l'auteur s'est arrêté
> là, et sa consigne « garde plus de triptyques par ligne que de lignes » cède
> dès onze.

> *Amendement — L'ORAGE DU VERDICT, et pourquoi il n'entre PAS dans le vocabulaire.*
>
> **La demande de l'auteur.** « Lors du verdict, en plus de grossir le/les 666 et
> de leur mettre des cornes : en thème clair, le passage à un fond noir/lugubre ;
> puis, quel que soit le thème, un flash d'éclair/foudre qui s'applique au fond ;
> et un effet d'embrasement (ombres, dégradés, flou), animé autour de chaque 666
> et chaque 666 à cornes. »
>
> ★ **Le vocabulaire reste à vingt-et-un.** Il nomme les GESTES DE LA
> DÉMONSTRATION — ce qui est fait aux jetons, et dont Le Registre doit rendre
> compte. La nuit, la foudre et le feu ne font rien à aucun jeton : ni une
> valeur, ni un rang, ni un compte ne changent, et Le Registre n'a rien à en
> dire. Ce sont des objets du MOTEUR, de la même famille que `@camera` et
> `@pan`, qui ne sont pas non plus dans le vocabulaire. Les y faire entrer
> aurait coûté un nom de plus à tenir en trois exemplaires (§3.1) et, surtout,
> un scénario qui ne serait plus le même objet dans les deux registres — alors
> que c'est précisément ce que le registre garantit.
>
> L'orage est donc piloté par **`ctx.scenographie`, une option de COMPILATION**,
> posée par la page qui a lu le lien, exactement au même titre que `reduced` et
> `repeatSpeed`. Il vit dans `visuel/primitives/reveal.js`, parce que le verdict
> EST son signal.
>
> ★ **Une couche `nuit`, sous tout le reste.** `LAYERS` passe de trois à quatre
> (`dom.js`) : les deux aplats pleine scène doivent passer derrière absolument
> tout, y compris les décors de `back`. Ils sont taillés à **trois fois** le
> `viewBox` — ils vivent dans `@pan`, donc dans `@camera`, et un panoramique
> résiduel ne doit jamais découvrir la page au milieu de la nuit. Un rectangle
> uni ne se paie pas au pixel.
>
> ★ **La nuit tombe dans les DEUX thèmes, et une fois tombée le thème ne
> gouverne plus la scène.** L'auteur ne la demande qu'en thème clair, mais la
> suite de sa phrase — « puisque maintenant la scène est sur fond sombre dans
> tous les cas » — dit l'intention : que les trois effets partagent le même
> fond. On l'obtient avec **une seule couleur de nuit** (`--scene-nuit`,
> identique dans les deux thèmes) : basculement complet en clair,
> approfondissement en sombre. Conséquence non négociable : **l'encre du verdict
> change avec le fond.** La rubrique du thème clair est un rouge sombre fait
> pour le parchemin (`#A32218`) ; sur la nuit elle tombe à **2,7:1**,
> c'est-à-dire illisible à l'instant exact où la démonstration livre sa chute.
> `--scene-rubric` y tient **7,4:1**, au-dessus du 4,5:1 de design §5.1. Quatre
> jetons de thème naissent ainsi (`tokens.css`), tous quatre insensibles au
> thème : la nuit n'a qu'une palette, donc un seul contraste à mesurer.
>
> ★ **L'éclair est une FONCTION DU TEMPS** (§4.4) : une enveloppe d'opacité
> écrite à la main, en `values`/`offsets`. Un `Math.random()` aurait donné un
> éclair différent à chaque lecture, donc un scrubbing qui ne retombe jamais sur
> la même image. Elle compte **DEUX éclats, jamais trois** : WCAG 2.3.1 interdit
> plus de trois éclats dans une seconde quelconque dès que la surface qui
> clignote est grande, et ici elle occupe la scène entière. Ce n'est pas
> seulement une case à cocher — deux éclats, c'est aussi ce que fait la foudre ;
> un stroboscope ne ressemble pas à un orage. Le plafond à 0,55 d'opacité laisse
> en outre la nuit transparaître : un blanc plein effacerait le 666 pendant
> l'éclair, c'est-à-dire cacherait la chute au moment de la chute.
>
> ★ **L'embrasement est un décor ACCROCHÉ, un par 6.** Même leçon que les cornes
> (§3.1, « UNE CORNE, UN NŒUD ») : une lueur qui couvrirait la série entière se
> décrocherait au premier ré-espacement de la ligne. Chaque brasier suit son 6
> (`data.suit`) et grandit avec lui par `animSolidaire`. Trois lueurs voisines
> se fondent en une seule : c'est bien le 666 qui brûle. Il vacille en
> **opacité** et jamais en échelle — ce canal appartient déjà à la solidarité —,
> ce qui est de toute façon ce que fait le feu.
> Techniquement, un **dégradé radial** et non un `feGaussianBlur` : un filtre se
> recalcule à chaque image et à chaque échelle, or le décor grossit d'un facteur
> huit au verdict. Le dégradé est peint comme un aplat, il grossit sans se
> recalculer, et le rendu cesse de dépendre de la puissance de la machine.
> ★ Et il ne déclare **pas** de `debord` : `reveal` s'en sert pour rétrécir le
> verdict afin qu'une pointe ne sorte pas du cadre. Une lueur qui s'éteint en
> dégradé n'a pas de pointe, et un feu qui déborde du cadre est même ce qu'on
> veut voir. Le déclarer ferait payer au 666 une taille imméritée.
>
> ★ **Mouvement réduit** : l'éclair **n'existe pas du tout** — une enveloppe
> compilée à 1 ms n'est plus un éclair, c'est une image blanche d'une frame,
> très exactement ce que `prefers-reduced-motion` épargne. La nuit, elle, reste
> (ce n'est pas un mouvement, c'est un état, et c'est elle qui rend le verdict
> lisible en thème clair), et le feu devient une lueur fixe.
>
> **L'ordre des trois temps n'est pas décoratif** : la nuit tombe, la foudre
> frappe, le feu prend. Dans cet ordre, c'est la foudre qui met le feu ; dans
> l'autre, ce sont trois effets posés côte à côte. Onze tests le gèlent
> (`visuel/tests/orage.test.js`), dont celui qui compte les éclats et celui qui
> vérifie que la timeline SANS scénographie est rigoureusement celle d'avant.

> *Amendement — L'ORAGE ÉCLATE APRÈS LE MOUVEMENT, ET IL A LE DROIT D'ALLONGER
> LA CHUTE.*
>
> Deux règles de cette section sont amendées, et la seconde est **levée par
> l'auteur**.
>
> 1. **Le feu ne prend qu'une fois le 666 posé**, plus au milieu de son
>    grossissement. Ce n'est pas d'abord une intention : c'est une contrainte de
>    rendu. Un `filter` opère dans l'espace utilisateur, donc quand le nœud
>    grandit, sa chaîne de flous doit être **re-tramée à chaque échelle**.
>    Mesuré, même trajet, deux registres — sobre : pire image 31 ms, zéro
>    au-dessus de 50 ; scénique : pire image 487 ms, onze au-dessus de 50.
>    Chromium re-trame à chaque palier (« quatre ou cinq micro-freezes pendant
>    le zoom »), Firefox met à l'échelle une image figée puis paie tout à
>    l'arrivée (« un long freeze de deux ou trois secondes »).
>
>    Corollaire, et c'est la découverte : **`opacity: 0` ne dispense pas de
>    peindre.** Le feu coûtait alors même qu'il était invisible. Les corps
>    filtrés sont donc en `display: none` hors embrasement — ce qui n'existe pas
>    ne peut pas ralentir un grossissement.
>
> 2. **« Le théâtre ne rallonge pas la démonstration » : LEVÉ.** « Je lève la
>    contrainte "la scénographie n'allonge jamais la démonstration" ; la vitesse
>    du grossissement était très bien, ne l'accélère pas » (l'auteur).
>
>    La règle avait un coût caché qu'on ne voyait qu'en la tenant : pour laisser
>    au feu du temps après le mouvement sans allonger l'étape, il fallait prendre
>    ce temps SUR le grossissement — **y compris en sobre, qui n'a pourtant pas
>    de feu**. Le registre sans théâtre payait pour celui qui en a.
>
>    Ce qui reste exigé, et qu'un test tient : le scénique n'ABRÈGE jamais rien
>    (`total >= nu.total`), et il n'ajoute pas plus de moitié
>    (`total <= nu.total * 1.6`). Il ajoute une chute à la fin ; il ne comprime
>    pas ce qui précède, et il ne double pas la démonstration.

> *Amendement — LE FEU REFAIT, TROISIÈME ÉTAT : la pile d'ombres d'atnyman, en
> `drop-shadow()`. Et il survit à la fin de la lecture.*
>
> **Les demandes de l'auteur, dans l'ordre où elles sont venues.**
>
> 1. « L'effet de feu est catastrophique. En voici qui sont bien plus
>    satisfaisants » — six pages, **rapatriées dans le dépôt**
>    (`.planning/inspirations/feu/`, une par dossier, sources complètes). Elles
>    ne sont pas un décor documentaire : « c'est avant tout les liens que je t'ai
>    fournis, les pistes à lui donner ».
> 2. « L'effet de feu doit **perdurer et rester animé une fois le verdict
>    terminé** », précisé : « l'idéal serait que le feu puisse germer juste après
>    la foudre et perdurer après — et si on revient en arrière, disparaître quand
>    on remonte avant la foudre ».
> 3. « Ils sont **identiques**, **réguliers**, et **derrière chaque chiffre**. Je
>    ne veux pas un feu derrière chaque chiffre, mais que **les chiffres
>    eux-mêmes s'enflamment** (de même que les cornes). »
> 4. « Ça ressemble plus à des **feuilles qui s'échappent des 6** qu'à des
>    flammes. Peux-tu tenter ma version préférée ou me dire pourquoi tu
>    l'écartes ? Sinon la première, en text-shadow, surtout si tu peux l'adapter
>    pour pouvoir l'utiliser aussi bien pour du texte que pour des formes SVG. »
>
> ---
>
> ★ **TROIS MONTAGES ONT ÉTÉ ESSAYÉS. Les deux premiers sont morts, et leurs
> cadavres disent quoi ne pas refaire.**
>
> | # | montage | ce qu'il a appris |
> |---|---|---|
> | 1 | un **foyer dessiné** derrière chaque chiffre | une flamme et un glyphe n'ont pas la même forme ; **aucun raffinement du dessin ne rattrape ça** |
> | 2 | des **copies nettes** du glyphe, décalées et refroidies | la bonne idée, la mauvaise exécution : **sans flou, une copie se lit comme un objet** — une feuille, une découpe. Le feu n'a pas de bord |
> | 3 | la **pile de `drop-shadow()`** d'atnyman | retenu |
>
> ---
>
> ★ **LA TECHNIQUE : `text-shadow` → `drop-shadow()`, et c'est l'adaptation
> demandée.**
>
> `01-atnyman` empile **sept ombres colorées sur le glyphe lui-même**, décalées
> vers le haut, du blanc-jaune au cœur jusqu'à la braise en tête, avec des flous
> croissants. **Le feu EST le halo du glyphe** — c'est littéralement « que les
> chiffres eux-mêmes s'enflamment ».
>
> `text-shadow` ne s'applique qu'au texte. **`filter: drop-shadow()` s'applique à
> n'importe quel élément SVG** — un `<text>` comme un `<path>` —, si bien que la
> même pile vaut pour **les chiffres ET pour les cornes**, par un seul chemin de
> code (un test l'exige : deux chemins finiraient par diverger).
>
> ★ **Le corps qui brûle est peint COULEUR DE NUIT.** C'est le tour de main
> d'atnyman : sa lettre est noire sur fond noir, on ne voit d'elle que ses
> ombres. **Conséquence non recherchée et décisive : la lisibilité du verdict est
> rendue par CONSTRUCTION.** `drop-shadow()` peint derrière l'élément qui la
> porte ; la copie couleur de nuit couvre donc exactement l'empreinte du glyphe,
> et le vrai chiffre — peint par-dessus, en rubrique — repose sur du fond pur,
> avec ses **7,4:1**, partout, sans dérogation. Les deux montages précédents
> devaient tous deux **acheter** leur lisibilité (l'un en pâlissant ses flammes,
> l'autre par un dégradé de pied, au prix d'une dérogation nommée) ; celui-ci
> n'achète rien.
>
> ★ **La corne brûle dans le MÊME nœud que son 6.** Elle lui est déjà accrochée
> (`data.suit`) : les deux corps partagent le repère, l'échelle et l'instant de
> naissance sans une ligne d'arithmétique. On relit son `d`, rien d'autre — le
> nœud des cornes n'est ni déplacé ni redessiné, et le calage dérivé de la police
> et vérifié en CI est intact.
>
> ---
>
> ★ **LE COÛT — la mesure a commandé le montage, pas l'inverse.**
>
> Une chaîne de `drop-shadow()` est une chaîne de passes de flou, et le décor du
> verdict grossit ×8. Mesuré (`src/gfx/_feu-perf.html`, rendu **logiciel**, donc
> pire cas) :
>
> | montage | 6 foyers ×4 | 15 foyers ×8 |
> |---|---|---|
> | filtre **animé** (atnyman transposé tel quel) | **> 100 %** d'un cœur | **> 100 %** |
> | filtre **figé** | **0 %** | — |
> | **deux filtres figés, opacité animée** (retenu) | **25 %** | **51 %** |
>
> ★ **Un filtre statique est tramé une fois et mis en cache ; un filtre animé est
> refait à chaque image.** Toute la dépense est là — le nombre de couches, lui,
> ne change presque rien (on en garde cinq des sept, redistribuées pour que la
> pile MONTE aussi haut : sans quoi le flou étant isotrope, on obtient un halo
> rond, joli et faux).
>
> Le feu est donc **deux corps superposés à chaînes figées**, dont l'un voit son
> **opacité** aller et venir. `opacity` est un canal de composition : le moteur
> mêle deux tramages déjà en cache. On garde la respiration d'atnyman sans payer
> une passe de flou par image. ★ Et le corps de braise garde son opacité à un,
> jamais animée : c'est lui qui SCELLE l'empreinte du glyphe. Deux corps qui se
> fondraient l'un dans l'autre laisseraient à mi-fondu un trou par lequel les
> halos remonteraient sous le chiffre.
>
> ---
>
> ★ **LA SURVIE APRÈS LA FIN — et où l'on sort de « tout est fonction du temps ».**
>
> C'est le point de doctrine, et il touche §3. On sépare deux choses :
>
> · **la PRÉSENCE du feu** — a-t-il pris ? C'est un ÉTAT de la démonstration. Il
>   reste **fonction du temps de la timeline** : une seule montée d'opacité,
>   `forwards`, qui part **juste après la foudre** ; `seek()` en arrière la
>   ramène à zéro ;
> · **le VACILLEMENT** — la forme des flammes à un instant donné. Ce n'est **pas**
>   un état de la démonstration : aucune valeur, aucun rang, aucun compte n'en
>   dépend, et **Le Registre n'a rigoureusement rien à en dire**. C'est
>   exactement l'argument qui garde l'orage hors du vocabulaire, appliqué au
>   temps plutôt qu'au lexique. N'étant pas fonction du temps de la timeline, il
>   n'a aucune raison de s'arrêter avec elle — ce sont des `@keyframes` CSS
>   autonomes.
>
> **C'est l'option 1 de l'auteur, la préférée, sans compromis** : le feu germe
> dans la timeline juste après la foudre, survit indéfiniment à la fin de la
> lecture, et s'éteint dès qu'on remonte avant son allumage. Ni minuterie de
> trente secondes, ni effet déclenché hors timeline.
>
> ★ **Et rien ne tourne dans le vide.** Les animations sont `paused` par défaut ;
> l'attribut `data-embrasement`, posé sur la racine de la scène par `player.js`
> **en fonction de `currentTime`** et résolu dans le même `_render()` que le
> canal discret — donc après chaque `seek()` comme à chaque image —, les met en
> marche. L'instant d'allumage n'est pas déclaré mais **dérivé** de la timeline
> (le départ du premier brasier) : une valeur en double pourrait se
> désynchroniser du geste qu'elle décrit, celle-ci ne le peut pas.
>
> ---
>
> ★ **« IDENTIQUES » ET « RÉGULIERS » — et les deux défauts que les tests ont
> attrapés, que l'œil n'aurait jamais vus.**
>
> · **Identiques** — une empreinte FNV-1a de l'identifiant du jeton donne à
>   chaque foyer sa période, sa phase et son ampleur. ⚠ **Mais FNV-1a mélange mal
>   ses bits de poids fort** : sur des identifiants qui ne diffèrent que par leur
>   fin (`d0`, `d1`, `d2`…), les vingt-quatre bits de tête restaient presque les
>   mêmes, et les quinze foyers d'une moisson tiraient **cinq** ampleurs
>   distinctes au lieu de quinze, toutes entre 0,94 et 1,04. La variété réclamée
>   n'avait lieu **qu'en apparence**. Un finaliseur `lowbias32` règle le compte ;
>   un test compte les valeurs distinctes.
> · **Réguliers** — chaque foyer tire sa période entre deux **nombres premiers**.
>   ⚠ Une rédaction antérieure employait 1 130 / 1 490 / 1 870 ms — « différents »
>   mais tous multiples de dix, donc de ppcm **168 secondes** : le feu se rejouait
>   à l'identique toutes les deux minutes quarante-huit. Un `pgcd` en CI l'exige
>   désormais, et un second test vérifie qu'aucune paire de foyers réels ne se
>   remet en phase avant plusieurs minutes.
>
> ---
>
> ★ **CE QU'ON A REFUSÉ : le pen préféré de l'auteur (`06-pizza3`), et pourquoi.**
>
> La vendorisation est autorisée (« packager une dépendance en interne pour la
> servir localement, c'est ok »), ce qui lève l'objection de réseau. Restent cinq
> raisons, dont trois sont structurelles — le détail est dans
> `.planning/inspirations/feu/README.md` :
>
> 1. **le poids** — `three.min.js` r120 pèse **642 741 octets** bruts (159 887
>    gzippés) plus 20 860 de post-traitement, quand le bundle JS du site fait
>    448 690 : on le **doublerait** pour un effet, contre un budget de 260 Ko (§7.6) ;
> 2. ★ **le contexte de rendu est étranger** — un canvas WebGL dans la scène
>    exigerait `foreignObject`, interdit par §3.2 règle 9 ; hors de la scène, il
>    faudrait **dupliquer toute la chaîne de mise en page** dans un second
>    système de coordonnées ;
> 3. ★ **le feu cesserait d'être un décor accroché** (§3.2 règle 10) : il ne
>    pourrait plus suivre chaque 6 au reflow ni grandir avec lui. C'est la classe
>    de défauts que « UNE CORNE, UN NŒUD » a supprimée par construction ;
> 4. **le shader peint une SPHÈRE** — une boule de feu, pas un feu qui épouse une
>    silhouette ; et son bloom, qui fait toute sa beauté, s'applique à la passe
>    entière et laverait le reste de la scène ;
> 5. **déterminisme** — un `time` de shader tiré d'un `requestAnimationFrame`
>    n'est pas une fonction du temps de la timeline (§3, §4.4).
>
> **Le renoncement porte sur l'implémentation, pas sur l'effet** : la hiérarchie
> franche du sombre au clair et la matière qui monte se retrouvent dans la pile
> d'ombres — cinq paliers nettement distincts, et des couleurs qui remontent la
> rampe d'un cran entre les deux états. C'est d'ailleurs le vrai trait de génie
> d'atnyman, et il ne saute pas aux yeux à la lecture de son CSS.

### 3.2 Pièges figés en règles

1. `fill: 'forwards'`, **jamais `'both'`** (une animation tardive rétro-remplirait sa
   keyframe de départ et écraserait les steps antérieurs).
2. `persist()` sur **chaque** animation (sinon WAAPI supprime les animations recouvertes
   et le retour arrière casse).
3. **Un canal, un élément.** `translate`, `rotate` et `scale` ne partagent jamais
   une propriété : chacun est un `transform` porté par son propre `<g>`, dans une
   **chaîne de position** imbriquée `translate > rotate > contenu`. Jamais de
   `transform` composite sur un même élément — chaque step anime son propre canal.
   Corollaire : **jamais de propriétés individuelles** `translate`/`rotate`/`scale`.
4. **Une origine fixe, commune à toute la chaîne d'un nœud** :
   `transform-box: view-box` et un point du repère local — `0 0` pour un token
   (son ancre de mise en page), `center` pour la caméra (le centre du `viewBox`).
   Jamais `fill-box`.
5. Tout mesurer et animer en **unités `viewBox`** (`getBBox`), jamais en pixels écran.
6. Ne **jamais** animer l'attribut `viewBox` : animer le `transform` d'un `<g id="camera">`.
7. Ne jamais retirer un token du DOM (un `drop` doit rester réversible par `seek`).
8. Attendre `document.fonts.ready` **avant** toute mesure.

   > *Amendement — le défilement, et la fin du multi-lignes.*
   > `research/moteur-visuel.md §5.2` prévoyait de repasser la ligne de jetons
   > **en plusieurs lignes** sous un seuil de largeur. C'est abandonné : une
   > transformation se lit de gauche à droite, pas en paragraphe, et couper la
   > séquence casse ce que la démonstration montre. **La ligne est unique, toujours.**
   > Quand elle dépasse la largeur utile, c'est la **vue** qui se déplace.
   >
   > Un nœud `@pan` s'intercale entre la caméra et les couches :
   > `@camera(translate+scale) > @pan(translate) > couches`. Cet ordre n'est pas
   > indifférent — le recul de caméra de `keyboard` et `alphabet` s'applique
   > **après** le défilement, autour du centre du `viewBox`, si bien qu'un zoom ne
   > défait jamais un panoramique. Les deux gestes vivant sur deux nœuds distincts,
   > ils ne peuvent pas non plus se disputer un canal (règle 3).
   >
   > Trois garde-fous contre le mal de mer : rien n'est émis si la ligne tient
   > dans le cadre ; une zone morte évite de bouger quand l'action y est déjà ;
   > un step qui ne désigne rien laisse la vue en place. La vue ne découvre jamais
   > de vide sur les côtés — conséquence assumée : aux deux extrémités du texte,
   > l'action est *dans* le cadre sans être *au* centre.
9. Interdiction totale de `foreignObject` dans la scène (canvas *tainted* à l'export).
10. **Un décor ACCROCHÉ partage tout ce qui bouge**, sur chaque canal : même
    départ, même durée, **même courbe** que le jeton qu'il suit (`data.suit`,
    `scene.satellitesDe`). Et il **naît avant** le premier déplacement — un
    décor créé après est simplement posé à l'arrivée, sans animation, donc il
    saute là où son jeton voyage.

    > *Amendement — la déformation pendant le zoom, et sa cause exacte.*
    >
    > **Le constat de l'auteur** : « quand il y a zoom/déplacement, il faudrait
    > ajuster les easing pour que texte et svg restent solidaires, actuellement
    > il y a déformation durant la transition ».
    >
    > **La cause.** Le verdict grossit le groupe par DEUX canaux à la fois —
    > `translate` écarte les chiffres, `scale` grossit les glyphes — alors que
    > le décor accroché n'en a qu'un : son `scale`, qui porte à la fois sa
    > taille et sa largeur. Tant que les deux canaux marchaient sur deux courbes
    > (`EASE.move` pour les positions, `EASE.pop` pour les tailles), l'ensemble
    > n'était une homothétie qu'aux **deux extrémités** du trajet. Mesuré au
    > navigateur sur la voie de référence, en pilotant `currentTime` : le
    > rapport « largeur des cornes / largeur du 666 » passait de **0,919** à
    > **1,479** à mi-vol avant de revenir à 0,921 — les cornes débordaient de
    > moitié le 666 qu'elles couronnent, et les chiffres eux-mêmes se
    > chevauchaient, leur chasse ayant grandi plus vite que leurs écarts.
    >
    > **Le correctif, et il est exact et non approché.** Une seule courbe
    > `u(t)` pour tous les canaux d'un même geste. Le layout amène chaque jeton
    > de `p₀` à `p₁ = c + (p₀ − c)·G` autour du centre `c` ; sur une courbe
    > unique, `p(t) = p₀ + (p₁ − p₀)·u = c + (p₀ − c)·(1 + (G − 1)·u)` tandis
    > que l'échelle vaut `1 + (G − 1)·u`. **Le même facteur, au même instant** :
    > homothétie exacte tout au long du trajet, dépassement compris. On garde
    > donc `EASE.pop` — le coup de poing du verdict —, mais sur les DEUX canaux.
    > Mesuré à nouveau : le rapport reste à **0,9186** à chaque instant, sur les
    > deux séries.
    >
    > **La solidarité est écrite UNE fois** (`ctx.animSolidaire`,
    > `visuel/compile.js`) et non recopiée par chaque primitive. C'est la
    > recopie qui avait produit le défaut : `helpers.effacerSurPlace` faisait
    > disparaître le halo en 0,7 fois la durée du jeton et sans courbe déclarée,
    > `reveal` faisait de même pour les restes, et **aucun des deux ne
    > transmettait le `scale`** — un décor restait à sa taille pendant que son
    > jeton rapetissait. Les deux ne connaissaient d'ailleurs que le halo, par
    > son nom (`@halo:<id>`) : des cornes accrochées à un jeton effacé ne
    > seraient pas parties avec lui. `animSolidaire` refuse `translate`, dont la
    > cible est propre à chaque nœud — c'est `reflow` / `place` qui la calcule,
    > en appliquant la même règle avec ses propres valeurs.
    >
    > ★ **Et le décor naît avant le mouvement.** Le halo du verdict était créé
    > dans la boucle qui l'allume, donc APRÈS le `reflow` qui rassemble les
    > chiffres : il se posait d'un coup à l'arrivée pendant que son chiffre y
    > voyageait. Il est désormais créé avant le regroupement. Un décor accroché
    > partage aussi son **instant de naissance**.
    >
    > Deux tests gèlent la règle (`visuel/tests/solidarite.test.js`) : la
    > coïncidence exacte `delay` / `duration` / `easing` entre un jeton suivi et
    > ses satellites sur chaque canal qui déplace, et l'unicité de la courbe
    > d'un même geste du verdict. Aucun des deux ne se retrouverait en relisant
    > du code : le défaut n'existe que pendant la transition.

> *Amendement — règles 3 et 4 : la chaîne de position.*
>
> **Le défaut.** Sous Firefox (154, y compris profil neuf et navigation privée),
> et seulement lui, un jeton neuf des étapes « On additionne » et « On réduit à
> un seul chiffre » — la case résultat sous l'accolade, les chiffres de
> l'éclatement de `15` en `1` + `5` — était peint **à l'origine du `viewBox`**,
> en haut à gauche de la scène, la moitié du glyphe dépassant du cadre. Chromium :
> rien, jamais.
>
> **Pourquoi la chasse a été si longue.** Côté moteur, tout est juste :
> `getComputedStyle(el).translate` rend la bonne valeur,
> `getBoundingClientRect()` le bon rectangle, la garde de compilation ne refuse
> rien et le filet « nœud sans position » de `dom.js` ne se déclenche jamais. Un
> balayage image par image du DOM pendant une lecture entière (5 142 images) ne
> voit **aucun** nœud approcher le coin. Le défaut n'existe **qu'à la peinture** ;
> il est invisible à toute instrumentation DOM.
>
> **La cause.** Quand Firefox promeut un élément en couche de composition — ce
> qu'une simple animation d'opacité suffit à déclencher —, la transformation
> qu'il confie au compositeur est construite **sans les propriétés individuelles**
> `translate` / `rotate` / `scale`. Le nœud est donc composé à l'identité.
> Deux preuves : (a) avec
> `layers.offmainthreadcomposition.async-animations = false`, le défaut
> disparaît intégralement ; (b) un attribut `transform` posé en doublon est
> honoré par le compositeur, et le nœud se déplace alors **deux fois** — le
> chemin principal applique les deux, le compositeur n'applique que `transform`.
>
> **Le correctif abandonné, et pourquoi.** Une première version a *déclaré* les
> canaux avec `will-change` avant de les animer, en pariant que, déclarés, ils
> entreraient dans la couche à sa création. Le pari a été validé dans un
> `Xephyr` piloté par Marionette — c'est-à-dire **sans accélération
> matérielle**, un environnement où le compositeur ne prend pas les mêmes
> chemins et où le défaut ne se reproduit pas du tout. Sur un bureau réel avec
> WebRender, le défaut est resté. La leçon est double : `will-change` est une
> **demande**, qu'aucun moteur n'est tenu d'exaucer ; et une mesure faite dans un
> environnement qui ne sait pas montrer le défaut ne valide rien.
>
> **Le correctif retenu : retirer la cause plutôt que la déclarer.** Les
> propriétés individuelles ne sont plus employées nulle part. Chaque canal
> géométrique est un `transform` — la propriété que le compositeur honore,
> preuve (b) — porté par son **propre élément** :
>
> ```
> <g class="nhl-pos">        translate      ← ne reçoit jamais d'opacité
>   <g class="nhl-rot">      rotate
>     <text/rect/path…>      scale, opacity, fill, texte…
> ```
>
> L'élément que Firefox promeut en couche pour son opacité n'a donc plus **aucune
> position à perdre** : il est à sa place parce que ses ancêtres l'y mettent, et
> la transformation d'un ancêtre dans l'arbre de couches n'est pas une faveur du
> compositeur, c'est le mécanisme de base de toute page web. La correction ne
> dépend plus d'un comportement facultatif.
>
> La raison d'être de la règle 3 est intacte : deux steps qui animent l'un la
> rotation, l'autre la position, ne peuvent toujours pas s'écraser, puisque leurs
> `transform` sont sur deux éléments différents. L'ordre d'imbrication
> translate → rotate → scale reproduit l'ordre dans lequel CSS applique les
> propriétés individuelles ; les primitives qui en dépendent (`keyboard`,
> `alphabet`, qui recentrent la caméra en tenant compte du zoom) gardent leur
> arithmétique — vérifié image par image, écart nul.
>
> **Pourquoi la règle 4 devait changer avec elle.** Trois canaux sur un seul
> élément partageaient une seule origine. Répartis sur trois éléments, `fill-box`
> en donne trois **différentes** : la boîte d'une enveloppe est celle de son
> contenu déjà mis à l'échelle. Mesuré sous Firefox 154 : dès que rotation et
> échelle sont actives ensemble, la chaîne « fill-box » s'écarte de l'ancienne
> composition de plusieurs dizaines d'unités `viewBox` (Chromium, lui, ne
> s'écarte pas : c'est encore une divergence de moteur, la même famille d'erreur
> que celle qu'on corrige). L'origine est donc devenue un **point fixe du repère
> local**, le même sur tous les maillons : la composition redevient une simple
> associativité de matrices, exacte par construction dans n'importe quel moteur.
> Mesuré : écart `0,000000` sous Firefox 154 **et** sous Chromium, sur rotation
> seule, échelle seule, et les deux ensemble.
>
> Ce point est `0 0` — l'**ancre de mise en page** du nœud, celle que `layout.js`
> positionne. Tous les contenus sont dessinés autour d'elle : `<text>` centré
> (`text-anchor: middle`, `dominant-baseline: central`), halo et cadre en
> `-w/2, -h/2`, marqueur en `cx = cy = 0`, glyphe recentré par `glyphTransform`.
> Tourner ou grossir un jeton autour de son ancre est ce qu'on veut dire ; le
> faire autour du centre de son encre était une approximation, qui en prime se
> **déplaçait** quand le canal discret changeait le texte du nœud. La caméra
> garde `center`, c'est-à-dire le centre du `viewBox` : un recul de caméra doit
> reculer autour du centre de la scène (règle 6).
>
> **Non-régression mesurée** (Chromium 151, `dist/` en `file://`, 1920×1080,
> trois démonstrations dont deux à mouvement de caméra, 81 instants chacune) :
> sur 32 000 observations de rectangle écran, **aucun écart supérieur à 0,02
> unité `viewBox`** entre l'ancienne composition et la chaîne. Les écarts de
> pixels résiduels sont ceux du canal discret (les compteurs), du même ordre
> entre deux exécutions du **même** binaire.

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

> *Amendement — LE RIDEAU DU REGISTRE SCÉNIQUE : pas d'autoplay, un bouton, et
> le son qui part actif.*
>
> « En mode scénique, pour avoir le son activé par défaut, plutôt qu'un
> autoplay, **estompe la scène initiale** (façon arrière-plan de lightbox) et
> **mets un gros bouton play devant**, par-dessus la scène, pour que
> l'affordance soit maximale. **En mode sobre, laisse l'autoplay.** » (l'auteur)
>
> ★ **Pourquoi ce troc est gagnant, et ce n'est pas une question de goût.** Le
> navigateur bloque le son tant qu'aucun geste n'a eu lieu. Une démonstration
> qui s'autojoue ne peut donc **jamais** avoir de son — c'était la raison b) du
> silence par défaut : « un réglage dont l'effet dépend de ce que l'utilisateur
> a fait juste avant n'est pas un réglage, c'est une loterie ». Un **clic sur
> lecture EST ce geste**. En renonçant à l'autoplay, on n'échange pas une
> commodité contre une gêne : on échange une seconde d'attente contre la seule
> mise en scène sonore qui puisse fonctionner de façon fiable.
>
> Et les trois autres raisons du silence par défaut tombent du même coup : plus
> de drone lâché dans une pièce à l'ouverture d'un lien partagé, plus de son
> automatique de plus de trois secondes à arrêter (WCAG 1.4.2), plus de surprise
> contraire à ce que promet le pied de page.
>
> ★ **En SOBRE, l'autoplay reste tel quel**, avec ses six conditions. Il n'y a
> là ni scénographie ni son : rien à débloquer, donc rien à échanger.
>
> ★ **« Activé par défaut », pas « activé de force ».** Il fallait pour cela un
> **troisième état** du réglage de son, là où il n'y en avait que deux. Tant que
> le refus s'écrivait en EFFAÇANT la clé, « n'a jamais demandé » et « a
> explicitement refusé » étaient le même état sur le disque. `basculerSon` écrit
> donc `coupe` au lieu d'effacer, et `sonParDefautActif()` ne touche à rien dès
> que le visiteur s'est prononcé. **Le défaut ne change pas d'un iota** :
> `sonActif()` teste toujours l'égalité à `actif`, l'absence de clé vaut
> toujours coupé, et le test qui gèle cette ligne reste vert.
>
> ★ **L'estompe est le VOILE, et rien d'autre.** Une première rédaction
> assombrissait le `<svg>` par un `filter` PUIS le recouvrait : en thème clair,
> un fond pâle assombri sous un voile pâle donnait un cadre **blanc** — on ne
> devinait plus rien du tout. Le voile est donc **sombre dans les deux thèmes**,
> et c'est la couleur de la nuit du verdict : un arrière-plan de lightbox doit
> assombrir, et celui-ci annonce ce qui va tomber sur la scène à la chute.
>
> ★ **Accessibilité.** Un vrai `<button>`, au nom accessible qui dit si le son
> partira (« Lancer, avec le son » / « Lancer, sans le son » — ce que le dessin
> ne peut pas dire) ; aucun piège de focus ; le voile est **retiré du DOM** au
> clic et non masqué, si bien qu'il ne peut plus rien cacher à personne ; et le
> focus suit ce qui disparaît, vers la scène.

Conditions, consommé **une seule fois** : `readyState === 'complete'` **et**
`document.fonts.ready` **et** `visibilityState === 'visible'` **et**
`document.hasFocus()` **et** pas de `prefers-reduced-motion` **et**
`options.autoplayQuand()` si l'appelant en fournit un.
`autoplayConsumed` passe à `true` **avant** de jouer. Jamais remis à `false` sauf
changement de scénario via l'URL.

> *Amendement — la scène ET les commandes doivent être à l'écran.*
>
> « Auto-play, mais seulement si la scène est visible : que la zone `.scene` et
> la zone `.transport` soient entièrement à l'écran, aucune des extrémités ne
> sortant de la zone actuellement visible. Et sans que ça interfère avec la
> possibilité de faire pause. » (l'auteur)
>
> ★ **Les deux zones, pas seulement la scène.** Une démonstration qui démarre
> alors que les commandes sont sous la ligne de flottaison démarre sous les yeux
> de quelqu'un qui ne sait pas encore qu'il peut l'arrêter. C'est aussi ce que
> demande WCAG 2.2.2 : un mouvement automatique de plus de cinq secondes doit
> avoir son bouton de pause **à portée**.
>
> ★ **Inclusion complète, pas recouvrement.** Un élément plus haut que la
> fenêtre ne peut donc jamais satisfaire la condition, et c'est voulu : sur une
> petite fenêtre, on ne démarre pas.
>
> ★ **Le moteur reçoit un PRÉDICAT, pas un sélecteur** (§3.2 : le moteur visuel
> ne connaît que son `<svg>`). `.transport` est un objet de l'interface ;
> c'est la page qui sait ce qu'il faut regarder.
>
> ★ **Un prédicat qui refuse ne CONSOMME pas** l'autoplay — sinon revenir sur
> l'onglet après avoir fait défiler ne le rejouerait jamais. Le mouvement
> réduit, lui, consomme : c'est un choix de l'utilisateur, il ne changera pas
> d'avis en changeant d'onglet.
>
> ⚠ **Le défaut que ce travail a mis au jour.** La page recopiait les quatre
> conditions dans un `autoplayAutorise()` évalué **au moment de la construire** —
> instant où `readyState` vaut « interactive » et où l'onglet n'a pas
> nécessairement le focus. L'expression rendait donc faux presque toujours, et
> `options.autoplay` restant faux, la ré-évaluation que le lecteur fait sur
> `load`, `focus` et `visibilitychange` ne pouvait plus rien rattraper :
> **l'autoplay était éteint avant d'avoir eu sa chance.** La page dit désormais
> `autoplay: true` — « cette page-là s'autojoue » — et les conditions restent où
> elles peuvent être re-testées. Vérifié dans le navigateur : hors champ, le
> focus ne déclenche rien ; dans la vue, il déclenche ; après une pause, ni le
> focus ni un changement de visibilité ne relancent quoi que ce soit.

---

## 4. Contrat d'URL

### 4.1 Codes d'opérateurs — registre append-only

> ## ✅ AMENDEMENT DU 27 AOÛT 2026 — LA CLÔTURE EST LEVÉE
>
> Le bandeau ci-dessous fermait le registre au motif qu'un lien écrit à la main
> circulait sur la page d'accueil. **L'auteur a depuis confirmé qu'aucun lien
> n'a été diffusé** ; le motif tombe, et la clôture avec lui. On peut donc de
> nouveau allouer des codes neufs sans cérémonie, et les liens figés dans les
> tests et dans `src/i18n/*.js` peuvent être réécrits si un jour c'est utile.
>
> ⚠️ **Ce qui reste vrai, et qui n'a jamais dépendu de la publication :**
>
>  1. **deux codes différents ne désignent jamais la même chose**, et
>  2. **un code ne change de sens que tant qu'aucun lien n'est dehors.** Cette
>     clause-là, et elle seule, dépend bien de la publication : c'est un lien
>     déjà partagé qu'elle protège, pas une idée de la propreté ;
>  3. l'ordre de déclaration reste celui du **registre** (§4.4 règle 3 en dépend
>     pour le déterminisme) ;
>  4. le test de gel (`src/moteur/catalogue.test.js`) se met à jour EN MÊME
>     TEMPS que le code — il vaut comme non-régression du comportement.
>
> ★ **Et le jour même, la clôture a servi.** Ce bandeau a d'abord été écrit pour
> quatre codes NEUFS qui n'avaient besoin de rien (`mtri` à `mrd`) ; quelques
> heures plus tard, **les cent codes ont été renommés en codes parlants** —
> `t1 → tca`, `p8 → pm9`, `mw → m14`… La levée n'était donc pas une formalité :
> c'est elle qui a rendu ce chantier possible. Voir l'amendement « LES CENT
> CODES DEVIENNENT PARLANTS » plus bas, qui porte la table de correspondance
> complète.
>
> Le bandeau et le raisonnement qui suivent sont conservés tels quels : ils
> disent ce que la règle protège, et cela reste juste — c'est seulement le fait
> qu'il y ait quelque chose à protéger qui était faux.

> ## ⛔ ~~LE REGISTRE EST FERMÉ DEPUIS LE 25 AOÛT 2026~~ (clôture levée, voir ci-dessus)
>
> Le site est en ligne — **https://apophenie.github.io** —, et la page d'accueil
> affiche elle-même un lien écrit à la main
> (`#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#…`, la puce « reinfocovid »). Des
> liens existent donc, et la clause ci-dessous a produit son effet : **plus aucun
> code ne peut changer de sens, être renommé, réattribué, ni repris à une pierre
> tombale.** Une correction coûte désormais un code neuf et une dépréciation.
>
> Ce qui suit est conservé tel quel : c'est le raisonnement qui a fixé la règle,
> et il explique pourquoi elle ne se rouvrira pas.

> **Le registre ne se ferme qu'à la publication.** Ce qu'il protège, ce sont les
> **liens déjà partagés** : une URL rejoue un programme, donc un code qui change
> de sens fait pointer un lien existant vers une autre démonstration. Tant que le
> site n'est **pas publié**, aucun lien n'existe et il n'y a rien à protéger —
> les codes peuvent être réorganisés, renommés, réattribués librement, et une
> pierre tombale peut être reprise.
>
> **Ce qui reste vrai dès maintenant**, publication ou pas : un code doit être
> unique dans le catalogue, l'ordre de déclaration reste l'ordre des codes
> croissants (§4.4 règle 3 en dépend pour le déterminisme), et le test de gel
> doit être mis à jour en même temps que le code — il vaut alors comme
> non-régression du comportement, pas comme serment de permanence.
>
> **Au premier lien partagé, tout ce qui suit devient irréversible.** C'est donc
> le dernier moment pour ranger le registre — après, chaque correction coûte un
> code neuf et une dépréciation.

`code` = **lettre de famille** + **corps parlant** + **majuscule de variante**
facultative. Régie par `RE_CODE` = `/^[ftnmcpj][0-9a-z]+[A-Z]?$/`, écrite une
fois dans `src/moteur/transformations/commun.js` et recopiée — sous test — dans
`src/recherche/url.js` et `src/recherche/bfs.js`.

| Préfixe | Famille |
|---|---|
| `f` | filtre |
| `t` | tokeniseur / découpe |
| `n` | mesure (STR→NUM) |
| `m` | mappeur |
| `c` | combinateur |
| `p` | post-traitement / finisseur |
| `j` | joker |

Exemples : `fp` retirer le protocole · `ma1` A1Z26 · `cs` somme · `prn` racine numérique ·
`pr9` retournement du 9 · `m7`/`m7F` sept segments (segments allumés, traits
fusionnés) · `m14`/`m14F` **quatorze segments**, mêmes deux lectures ·
`mr9` **on retourne les 9** (`NUMS → NUMS`) · `mr39` le même geste **par trio** ·
`m36` **trois 6 d'affilée** (`NUMS → NUMS`) ·
`mpf`/`m1s2`/`mad` **les trois ficelles** (voir l'amendement en fin de §).

> *Amendement — **LES CENT CODES DEVIENNENT PARLANTS**.* — 27 août 2026.
>
> « Renomme aussi les autres sur le même principe que ce que j'ai donné en
> exemple. 2, 3 ou 4 caractères, évite d'aller au-delà. Plus court c'est mieux
> tant qu'il n'y a pas de collision. Utilise le ou les caractères les plus
> efficaces/spécifiques pour différencier (acronyme, premières lettres,
> premières consonnes…). » (l'auteur)
>
> ★ **La clôture est levée, et cette fois elle est levée POUR DE BON.** Le
> bandeau du 25 août fermait le registre au motif qu'un lien écrit à la main
> circulait ; l'auteur a confirmé qu'**aucun lien n'a été diffusé**. La prémisse
> est fausse, donc la conclusion aussi. Les cent codes sont réattribués, et les
> liens figés — `src/i18n/fr.js`, `src/i18n/en.js`, les tests, les documents de
> `.planning/` — sont réécrits dans le même commit. Il n'existe, à cette date,
> aucun lien dehors qu'un renommage pourrait faire mentir.
>
> ★ **La règle de fabrication, telle qu'appliquée.** La lettre de famille ne
> bouge jamais : c'est elle qui rend une URL lisible d'un coup d'œil, et
> l'auteur l'a conservée dans tous ses exemples. Le corps est le plus court
> groupe de signes qui distingue l'opérateur **de ses frères de famille** —
> `tm` suffit pour « mots », mais « séparateurs » et « syllabes » se disputent
> `ts`, d'où `tsp` et `tsy`. Quand un mot a une abréviation reçue, c'est elle
> qu'on prend entière (`ftld`, `fmaj`/`fmin`, `pabs`, `mt9`, `fr13`). Quand
> deux opérateurs sont **le même geste à un détail près**, le détail est écrit
> et le reste est commun : `m7`/`m7F` et `m14`/`m14F` (fusion des traits),
> `mr9`/`mr39` (par valeur, par trio), `masc`/`masb`, `mtrc`/`mtrb`,
> `mexc`/`mexb`, `mboc`/`mbob` (**c**apitale / **b**as de casse, les deux mots
> que les libellés emploient), `mazc`/`mazr` et `mqwc`/`mqwr` (colonne /
> rangée), `nl`/`nlv`/`nlc` (les lettres, plus les voyelles, plus les
> consonnes), `prn`/`mrn` (la racine numérique, du total ou de chaque nombre).
>
> ★ **La table de correspondance.** Elle existe pour un seul usage : comprendre
> un vieux lien traîné dans un carnet. Elle n'autorise rien — les codes de
> gauche ne sont plus lus par personne.
>
> | ancien | neuf | opérateur | | ancien | neuf | opérateur |
> |---|---|---|---|---|---|---|
> | `f1` | `fp` | protocole | | `mb` | `masc` | ASCII capitale |
> | `f2` | `fw` | www | | `mc` | `masb` | ASCII bas de casse |
> | `f3` | `ftld` | extension | | `md` | `m7` | sept segments |
> | `f4` | `fav` | avant le `/` | | `me` | `m7F` | sept segments, fusion |
> | `f5` | `fap` | après le `/` | | `mf` | `mtrc` | traits, capitale |
> | `f6` | `fl` | lettres | | `mg` | `mtrb` | traits, bas de casse |
> | `f7` | `fv` | voyelles | | `mh` | `mexc` | extrémités, capitale |
> | `f8` | `fvy` | voyelles, Y compris | | `mi` | `mexb` | extrémités, bas de casse |
> | `f9` | `fc` | consonnes | | `mj` | `mboc` | boucles, capitale |
> | `fa` | `fd` | doublons ôtés | | `mk` | `mbob` | boucles, bas de casse |
> | `fb` | `fr` | lettres répétées | | `ml` | `mazc` | AZERTY, colonne |
> | `fc` | `fi` | initiales | | `mm` | `mazr` | AZERTY, rangée |
> | `fd` | `fmr` | motif répété | | `mn` | `mqwc` | QWERTY, colonne |
> | `fe` | `ffr` | traduit en français | | `mo` | `mqwr` | QWERTY, rangée |
> | `ff` | `fen` | traduit en anglais | | `mp` | `mhe` | gématrie hébraïque |
> | `fg` | `fmaj` | capitales | | `mq` | `mgr` | isopséphie grecque |
> | `fh` | `fmin` | bas de casse | | `mr` | `mln` | longueur du nom |
> | `fi` | `fac` | accents ôtés | | `ms` | `mlm` | longueur du mot |
> | `fj` | `flt` | leetspeak | | `mt` | `mrn` | racine de chaque |
> | `fk` | `fatb` | Atbash | | `mu` | `m0` | zéros ôtés |
> | `fl` | `fr13` | ROT13 | | `mv` | `mtc` | le chiffre de la touche |
> | `t1` | `tca` | caractères | | `mw` | `m14` | quatorze segments |
> | `t2` | `tm` | mots | | `mx` | `m14F` | quatorze segments, fusion |
> | `t3` | `tsp` | séparateurs | | `my` | `mr9` | on retourne les 9 |
> | `t4` | `tsy` | syllabes | | `mz` | `m36` | trois 6 d'affilée |
> | `t5` | `tch` | chiffres | | `m10` | `mpf` | le plus fréquent |
> | `n1` | `nl` | compte des lettres | | `m11` | `m1s2` | un rang sur deux |
> | `n2` | `nv` | compte des voyelles | | `m12` | `mad` | addition sélective |
> | `n3` | `nc` | compte des consonnes | | `m13` | `mtri` | tri croissant |
> | `n4` | `nd` | lettres distinctes | | `m14` | `mr39` | retourner les trios de 9 |
> | `n5` | `nsp` | compte des séparateurs | | `m15` | `mcc` | compter les chiffres |
> | `n6` | `nm` | compte des mots | | `m16` | `mrd` | redécoupage choisi |
> | `n7` | `nlv` | lettres + voyelles | | `c1` | `cs` | somme |
> | `n8` | `nlc` | lettres + consonnes | | `c2` | `cst` | soustraction |
> | `m1` | `ma1` | A1Z26 | | `c3` | `cp` | produit |
> | `m2` | `mz26` | Z26A1 | | `c4` | `cal` | somme alternée |
> | `m3` | `mpy` | pythagoricienne | | `c5` | `cmm` | max moins min |
> | `m4` | `mch` | chaldéenne | | `c6` | `cmo` | moyenne |
> | `m5` | `mx6` | gématrie anglaise (×6) | | `c7` | `cnv` | nombre de valeurs |
> | `m6` | `msfr` | Scrabble français | | `c8` | `ccat` | concaténation |
> | `m7` | `msen` | Scrabble anglais | | `c9` | `cmx` | maximum |
> | `m8` | `mt9` | touche T9 | | `ca` | `cmn` | minimum |
> | `m9` | `mms` | signaux du morse | | `cb` | `cnj` | nombre de jetons |
> | `ma` | `mmt` | traits du morse | | `cc` | `cnjd` | jetons distincts |
> | `p1` | `prn` | racine numérique | | `p7` | `pc9` | complément à 9 |
> | `p2` | `psc` | somme des chiffres | | `p8` | `pm9` | modulo 9 |
> | `p3` | `pabs` | valeur absolue | | `p9` | `pr9` | retournement du 9 |
> | `p4` | `prs` | réduction signée | | `pa` | `prm` | racine, nombres maîtres |
> | `p5` | `pec` | écart des chiffres | | `pb` | `pm10` | modulo 10 |
> | `p6` | `pmr` | miroir | | `j1` | `jnf` | nom français du chiffre |
>
> ★ **⚠ DEUX RÉATTRIBUTIONS À CONNAÎTRE**, et elles sont voulues par l'auteur
> lui-même : `m7` désignait le Scrabble anglais et désigne désormais le sept
> segments ; `m14` désignait « retourner les trios de 9 » et désigne désormais
> les quatorze segments. C'est l'auteur qui a dicté `mw → m14`, et qui a
> tranché la collision qui s'ensuit — « `m.retournerLesTrios` devient `mr39` ».
> Ce sont les deux seuls cas où un code ancien reste un code valide en
> désignant autre chose : un vieux lien qui les porte **rejoue une autre
> démonstration au lieu d'échouer**. Sans lien diffusé, le risque est nul
> aujourd'hui ; il est écrit ici pour qu'on ne le redécouvre pas.
>
> ★ **La majuscule de variante, et pourquoi elle est limitée à une.** `m14F`
> vient de l'auteur, tel quel. La grammaire l'accueille donc — un unique signe
> majuscule, en FIN de code. Deux codes ne peuvent ainsi jamais différer par la
> seule casse d'un signe intérieur (`m14f` contre `m14F` serait un piège à
> relecture, et un piège pour toute lecture d'URL un jour rendue tolérante à la
> casse). Un test l'exige (`catalogue.test.js`).
>
> ★ **`rangCode` ne décode plus rien : il CONSULTE.** Un code portait un index
> base36, et l'ordre du catalogue se lisait dans le code. Un code parlant ne dit
> plus son rang — c'est tout l'objet du changement. L'ordre est donc écrit, une
> fois, dans `src/moteur/catalogue.js › ORDRE_CANONIQUE` : la liste des cent
> codes, dans l'ordre d'allocation, relue à chaque chargement contre l'ordre de
> déclaration des cinq familles. Deux sources qui se contrôlent l'une l'autre,
> comme avant ; simplement, l'une des deux a cessé d'être devinable.
>
> ★ **Pourquoi PAS un tri alphabétique des codes.** L'ordre du catalogue est
> l'ordre d'EXPLORATION du moteur (§4.4 règle 3), et il est curé : les mappeurs
> de lettres notoires d'abord, les triches numériques ensuite. Trier « m0, m14,
> m14F, m1s2, m36, m7… » mettrait les triches en tête par pur hasard
> alphabétique. Le registre conserve l'ordre historique, qui portait cette
> intention.
>
> ★ **L'ordre de N2, lui, reste lisible sur la chaîne seule** — et il a changé
> de définition. Ranger une suite d'opérateurs commutants pour que `fl+fac` et
> `fac+fl` s'écrivent pareil doit pouvoir se refaire **sans le catalogue**, par
> qui lit un lien. C'est donc (rang de famille, chaîne comparée en unités de
> code), ce que §4.4 règle 4 impose déjà partout ailleurs, à la place de
> l'ancien index base36 qui n'a plus de sens. Effet secondaire heureux : les
> deux expressions de N2 — `bfs.js › codesCanoniques` et `assemblage.js ›
> reordonnerCommutants` — utilisent enfin le MÊME comparateur ; elles
> divergeaient depuis toujours sur les blocs mêlant deux familles.
>
> ⚠️ **CE QUE LE RENOMMAGE CHANGE AU CLASSEMENT — mesuré, pas supposé.** §4.4
> règle 1 départage les ex æquo sur « la suite des codes comparée
> lexicographiquement » ; `assemblage.js › comparerChemins` et `bassin.js`
> s'appuient sur la même comparaison pour choisir le REPRÉSENTANT d'une classe
> de chemins. Rebaptiser les opérateurs rebat donc toutes ces égalités, et le
> classement de `https://hope-hope-hope.fr/` en sort **permuté** : la méthode 5
> du README (`tca+m7F+cs+prn`, ex-`t1+me+c1+p1`) passe du rang 1 au rang 9, et
> deux voies entrent dans les douze premières à la place de deux autres.
>
> ★ **Aucune voie n'a été jugée moins bonne pour autant** : la comparaison des
> codes n'intervient qu'à score STRICTEMENT ÉGAL — sur le score, sur le nombre
> de séries, sur la longueur. Ce qui change est le choix entre des voies que le
> barème déclare équivalentes, et le commentaire de `bfs.js › ordreCode` le
> disait déjà : « n'importe quel ordre total y convient ». Deux tests qui
> allaient chercher une voie précise DANS LE CLASSEMENT la rejouent désormais
> depuis un lien (`scenario.test.js`, `integration-visuel.test.js`) : ce
> qu'ils vérifient — le décor d'une table, la détection des redites — n'a
> jamais eu de rapport avec le rang.
>
> ★ **Si un jour cette permutation dérange**, le remède est connu et n'est pas
> pris ici : départager les ex æquo sur le **rang au registre** plutôt que sur
> l'orthographe du code. Ce serait stable à tout renommage futur, et
> corrélé à la notoriété (les opérateurs notoires ont été alloués les premiers).
> Le prix est de faire descendre le registre — qui vit dans `src/moteur/` —
> jusqu'à `src/recherche/`, qui ne connaît son catalogue que par injection.
> C'est un chantier d'architecture, pas un renommage.

> *Amendement — LA CLÔTURE DU REGISTRE PERD SON FONDEMENT, sans qu'aucun code
> ne bouge.* — 27 août 2026.
>
> Le bandeau ci-dessus ferme le registre au motif que **des liens existent** :
> « le site est en ligne […] et la page d'accueil affiche elle-même un lien écrit
> à la main ». Interrogé, l'auteur a confirmé qu'**aucun lien n'a été diffusé**.
> La prémisse est donc fausse, et avec elle la conclusion : il n'y a rien à
> protéger, et le régime d'avant-publication redevient celui qui s'applique — les
> codes peuvent être réorganisés, renommés, réattribués, et une pierre tombale
> peut être reprise.
>
> ★ **Et pourtant : rien n'a bougé.** Le chantier qui a obtenu cette confirmation
> — « les cornes sortent de l'URL » (§3.1) — n'avait finalement besoin d'aucune
> réattribution : `m36` garde son code, son arithmétique et son rang, et tous les
> liens figés dans `src/i18n/*.js` et dans les tests rendent la même
> démonstration qu'avant. L'amendement est écrit **quand même**, parce que le
> prochain chantier ne doit pas avoir à supposer ce que celui-ci a demandé.
>
> ★ **Ce qui reste vrai, publication ou pas**, et qui n'a jamais dépendu de la
> clôture : un code est unique dans le catalogue ; l'ordre de déclaration est
> l'ordre des codes croissants (§4.4 règle 3 en dépend pour le déterminisme) ; et
> le test de gel se met à jour dans le MÊME commit que le code — il vaut alors
> comme non-régression du comportement, pas comme serment de permanence.
>
> ★ **Ce qu'une réattribution coûtera désormais**, si quelqu'un s'en sert : les
> liens écrits à la main dans `src/i18n/fr.js` et `src/i18n/en.js`, ceux des
> tests (`recherche/tests/url.test.js` en particulier) et ceux des documents de
> `.planning/` sont à reprendre dans le même commit. Ce ne sont plus des liens
> partagés, ce sont des **exemples** — mais un exemple faux dans un dépôt qui
> passe son temps à vérifier ce qu'il affirme serait pire qu'un code mal rangé.
>
> ⚠️ **La clôture se refermera au premier lien réellement diffusé**, et cette
> fois sur un fait vérifiable plutôt que sur une inférence tirée de la mise en
> ligne. Le bandeau ci-dessus est conservé tel quel : c'est le raisonnement qui a
> fixé la règle, et il redeviendra valable le jour où sa prémisse le sera.

> *Amendement — le demi-tour a désormais deux codes, et c'est voulu.* `pr9`
> retourne UN nombre (`NUM → NUM`, « le 9 » du README, méthode 6) ; `mr9`
> retourne CHAQUE 9 d'un vecteur (`NUMS → NUMS`) et laisse tout le reste en
> place. La règle 2 (« changer le comportement d'un opérateur = allouer un
> nouveau code ») n'y est pour rien : `pr9` n'a pas bougé d'une virgule, et il
> ne le pouvait pas — sa signature interdit le vecteur. Deux signatures, deux
> familles, deux codes. Le vocabulaire visuel, lui, n'a pas eu à s'étendre :
> les deux émettent la même primitive `flip180`, qui refuse depuis
> bruyamment tout demi-tour autre que 9 → 6 (§0.3, contrôle croisé).

> *Amendement — `m36`, « trois 6 d'affilée », alloué le registre FERMÉ.* Le
> registre l'est depuis le 25 août 2026 : aucun code n'a changé de sens, aucun
> n'a été renommé, réattribué, ni repris à une pierre tombale. `mr9` était le
> dernier alloué ; celui-ci prend **`m36`**, code neuf, et le catalogue passe de
> 92 à 93 opérateurs. Il émet la primitive `horns` (§3.1), qui n'existait pas —
> c'est la clause d'extension du vocabulaire appliquée dans l'ordre qu'elle
> prescrit : la primitive d'abord, l'émission ensuite.
>
> ⚠️ **PÉRIMÉ sur ce dernier point depuis le 27 août 2026** : `m36` n'émet plus
> `horns`. Les cornes ne sont plus le geste d'un opérateur — elles ne changent
> aucune valeur, donc elles n'ont rien à faire dans un programme ni dans une URL
> —, et l'assemblage les pose sur la LIGNE selon le REGISTRE. Ce qui reste ici
> est la seule moitié qui soit de l'arithmétique : la gomme qui tronque le
> vecteur à ses trois 6 contigus. Le code, lui, ne bouge pas d'un iota. Voir
> §3.1, amendement « LES CORNES SORTENT DE L'URL ».

> *Amendement — LES TROIS FICELLES, `mpf` · `m1s2` · `mad`, registre FERMÉ.* Le
> barème d'élégance portait depuis sa construction trois paliers de malus dont
> les compteurs valaient **toujours zéro** : aucun opérateur du catalogue ne
> faisait ces choses-là. L'auteur a tranché — « je me doute — ma demande c'est
> **aussi de les ajouter au catalogue**, mais avec un score bas, mais moins bas
> que la suppression arbitraire de ce qui n'est pas 6 ».
>
> | code | id | ce qu'il fait | palier |
> |---|---|---|---|
> | `mpf` | `m.plusFrequent` | la valeur strictement la plus fréquente reste, les autres s'effacent | `MAJORITE` |
> | `m1s2` | `m.unRangSurDeux` | une position sur deux — celle des deux parités qui porte le plus de 6 | `DECIMATION` |
> | `mad` | `m.additionSelective` | chaque nombre s'écrit chiffre à chiffre, puis on n'additionne QUE les suites contiguës de somme 6 | `ADDITION_SELECTIVE` |
>
> ★ **Codes NEUFS, à la suite de `m36`.** Aucun code existant n'est touché,
> renommé ni réattribué, aucune pierre tombale n'est reprise. Le catalogue passe
> de **93 à 96** opérateurs. *(Ces trois-là s'écrivaient `m10`, `m11`, `m12` : à
> l'époque un code était un index base36, et 36 s'y écrit « 10 ». Le raisonnement
> a disparu avec les codes parlants ; le fait qu'ils viennent après `m36` dans le
> registre, lui, tient toujours.)*
>
> ★ **Aucune primitive ajoutée** : le vocabulaire reste à vingt et une (§3.1).
> `mpf` et `m1s2` empruntent l'accolade des combinateurs (`group` + `label`) —
> « indique sous l'accolade : *chiffre majoritaire : 6* et fais disparaître les
> autres », dit l'auteur — puis `drop` et `highlight`. `mad` emprunte
> `substitute` (l'éclatement `16` → `1` `6`), `insertOperators` et `sum` : « ne
> pas la différencier des additions qui la précèdent ou la succèdent, c'est juste
> une de plus (ou une de moins si on saute un 6 pour le conserver) ».
>
> ★ **`exige` — les trois refusent plutôt que de choisir.** §4.4 demande une
> règle de départage explicite et stable ; ces trois-là n'en ont pas besoin,
> parce qu'elles **refusent de s'appliquer** dès qu'il faudrait trancher :
> deux valeurs aussi fréquentes l'une que l'autre, deux parités portant autant de
> 6 — la règle ne s'applique pas. Aucun ordre de `Map`, aucun tri, aucune
> préférence tacite pour le 6 ne peut s'y glisser. Elles refusent en outre quand
> elles ne changent rien, et quand **le résultat n'écrit pas 666 d'affilée** :
> une ficelle qui coûte sans rien acheter n'a pas lieu d'être jouée (même
> discipline que `mr9` et `m36` — une étape inopérante est sautée en silence par
> `scenario.js`, et l'URL porterait un code invisible).
>
> ★ **L'addition sélective et son espace de recherche.** Choisir quelles suites
> de chiffres additionner, c'est choisir une composition : il y en a 2^(n−1). On
> n'en cherche donc **aucune « meilleure »** — un balayage **glouton de gauche à
> droite** en prend une, en O(n × 6) : à chaque rang, la **plus courte** suite qui
> commence là et dont la somme fait **exactement 6**. Trois refus bornent le
> reste : aucun terme déjà égal à 6 (l'additionner le détruirait), aucun terme
> nul (`m0` existe pour ça) — d'où une fenêtre d'au plus **six** termes, bornée
> par la CIBLE et non par un réglage —, et une largeur plafonnée à douze chiffres.
>
> ★ **Trois blanchiments démasqués et corrigés** (`assemblage.js`, `score.js`).
> Ces opérateurs rétrécissent le vecteur, et trois mesures lisaient l'**état
> final** là où elles auraient dû lire le chemin :
> 1. la **dilution** des candidats (`vecteursDeSix`, `candidatsDePortee`) se lit
>    désormais sur le vecteur **le plus large** du chemin (`largeurMontree`) —
>    `fatb+tca+m14+mpf` ne « laisse pas moins tomber » que `fatb+tca+m14`, il a jeté plus
>    tôt ;
> 2. le **rendement** (`score.js › rendementSix`) fait de même **pour les seules
>    ficelles** : les noter sur ce qu'il reste leur donnait un rendement parfait
>    pour avoir jeté davantage. Mesuré sur « La numérologie est un art taquin » :
>    `fl+tca+m14+mpf` marquait 3 797 contre 2 715 à `fl+tca+m14`, qui montre les mêmes
>    6. ⚠️ Ce n'est **pas** l'arbitrage de §7-5 tranché en douce : il reste ouvert
>    pour le cas général, `m36` compris ;
> 3. une **ficelle qui n'apporte rien n'est plus proposée** : sur une même
>    portée, une voie à ficelle est écartée dès qu'une voie **sans** ficelle fait
>    au moins aussi bien sur les trois choses qu'elle prétend acheter — autant de
>    6, pas plus de gaspillage, autant de 666 d'affilée.
>
> ★ **Et aucune ficelle dans une MOISSON.** Le mode vaut par ce que chaque portée
> **sait** donner ; une ficelle jette ce qu'elle donne en trop, à l'intérieur de
> la portée, avant que la moisson ne compte. Mesuré sur « La numérologie est un
> art taquin » : `tca+m14+mpf` fabriquait une **sixième** série là où les voies
> honnêtes en font cinq, et la liste affichait alors cinq séries au rang 1 puis
> six au rang 2 — un compte qui REMONTE, ce qu'un test de classement interdit
> depuis toujours. Les ficelles restent pleinement disponibles au **GROUPEMENT**,
> qui est le mode de tous les exemples de l'auteur : un vecteur, une ficelle, un
> 666.

> *Amendement — LES QUATRE TRANSFORMATIONS DU 27 AOÛT, `mtri` · `mr39` · `mcc` ·
> `mrd`, clôture LEVÉE.* L'auteur a proposé quatre transformations neuves
> (`.planning/A-VENIR-retours-cornes-et-moteur.md` §7). Elles forment, dans son
> exemple, une seule démonstration : **redécouper**, **ranger**, **couronner**,
> **retourner les 999**.
>
> | code | id | ce qu'il fait | palier d'élégance |
> |---|---|---|---|
> | `mtri` | `m.triCroissant` | les nombres se rangent du plus petit au plus grand | `REARRANGEMENT` |
> | `mr39` | `m.retournerLesTrios` | trois 9 côte à côte se retournent ensemble et donnent 666 | — |
> | `mcc` | `m.compterLesChiffres` | chaque plage de valeurs identiques devient « décompte valeur » | — |
> | `mrd` | `m.redecoupageChoisi` | la ligne se redécoupe en paquets choisis pour tomber sur 6 | `REDECOUPAGE` |
>
> ★ **Codes NEUFS, à la suite de `mad`.** Le catalogue passe de **96 à 100**
> opérateurs. Aucun code existant n'est touché. *(Ils s'écrivaient alors `m13` à
> `m16`, index base36 — voir l'amendement des codes parlants.)*
>
> ★ **Aucune primitive ajoutée** : le vocabulaire reste à vingt et une (§3.1).
> `mtri` emploie `move` (l'ORDRE dans le flux, jamais des coordonnées — §7.3),
> `mcc` emploie `partition` + `substitute` + `drop`, `mrd` emploie `substitute`,
> `partition`, `insertOperators`, `sum` et `reduce`, et `mr39` reprend le
> `flip180` de `mr9` et de `pr9`.
>
> ★ **Et `mr39` n'émet AUCUNE corne**, alors que l'auteur écrit « en leur
> ajoutant les cornes une fois retournés ». Ce n'est pas un oubli : c'est
> `couronnerLesTriptyques` (`src/recherche/scenario.js`) qui pose les cornes
> depuis le chantier des cornes, et lui seul peut le faire — un opérateur ne
> voit que sa propre étape, il ignore si ses trois 6 arriveront au verdict, et
> il ignore même quelle est la CIBLE (§4.2, `c…!`). L'émettre ici, ce serait
> couronner à l'aveugle, et faire pousser des cornes de diable au-dessus d'un
> `111`.
>
> ★ **`mrd` rejoint les quatre opérateurs écrits autour du 6** et sort de la
> recherche dès que la cible change (`bfs.js › OPERATEURS_LIES_A_666`) : son
> objectif, son départage et son refus sont tous écrits en « 6 ». Ils sont donc
> **cinq**, et viser autre chose que 666 donne accès à 95 opérateurs sur 100.
> Les trois autres restent explorables partout, et servent même MIEUX les autres
> cibles : ranger rapproche les 1 d'un `111` exactement comme les 6.
>
> ★ **`exige` — les quatre refusent plutôt que de se jouer pour rien**, même
> discipline que `mr9`, `m36` et les trois ficelles. `mtri` refuse s'il ne
> RASSEMBLE pas (il doit faire apparaître une plage de trois qui n'existait
> pas) ; `mr39` refuse sans trio de 9 contigus ; `mcc` refuse quand le décompte
> ne condense pas la ligne ; `mrd` refuse en deçà de vingt-cinq chiffres — deux
> fois la portée de `mad`, plus un — et refuse aussi s'il ne gagne pas
> strictement plus de 6 qu'il n'en trouve.
>
> ⚠️ **Le seuil de `mrd` est une MESURE, pas un goût.** Sans lui, cette triche
> s'appliquait à presque tous les vecteurs et évinçait des voies honnêtes
> **avant** le classement — le moteur ne canonicalise que les premiers chemins
> de chaque fragment. « Donald Trump » perdait alors la voie de référence de
> l'auteur, et « Wikipedia » sa tête de liste, au profit de voies qui
> n'employaient même pas `mrd`. Aucun réglage du barème ne pouvait y remédier :
> ce qui tombait n'était pas classé plus bas, il n'était plus là.

**Trois règles inviolables :**
1. Un code alloué l'est **à vie**. Retirer un opérateur pose une pierre tombale : son
   code n'est jamais recyclé.
2. **Changer le comportement d'un opérateur = allouer un nouveau code**, et déprécier
   l'ancien *en conservant son comportement d'origine*. Le registre est un journal,
   pas un état.
3. L'ordre de déclaration du catalogue est l'ordre du **registre**
   (`src/moteur/catalogue.js › ORDRE_CANONIQUE`) — c'est aussi l'ordre d'itération
   du moteur (§4.4 règle 3). Un code neuf s'inscrit **en fin de registre**, jamais
   au milieu : insérer, c'est décaler tous les rangs suivants, donc changer
   l'ordre d'exploration de tout ce qui suit et le classement avec.

   > ⚠ **Ce n'est plus l'ordre de tri de la canonicalisation N2.** Les deux
   > coïncidaient tant qu'un code portait son index ; depuis les codes parlants,
   > ils divergent et c'est assumé. N2 range une suite d'opérateurs commutants
   > **dans une URL** : il lui faut un ordre que le lecteur d'un lien puisse
   > refaire sans catalogue, donc (rang de famille, chaîne comparée en unités de
   > code). Le registre, lui, ordonne le CATALOGUE : il porte une intention et
   > doit rester stable quand un code neuf arrive.

Un test de non-régression **gèle le comportement des codes** (vecteurs
`code → entrée → sortie`), et un autre **gèle le registre** : cent codes
distincts, de deux à quatre signes, dont jamais deux ne diffèrent par la seule
casse, et dans le même ordre que la déclaration.

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

> *Amendement — le REGISTRE DE MISE EN SCÈNE, `sobre!` / `scenique!`.*
>
> **La demande de l'auteur.** « Depuis la page qui liste les voies, au lieu
> d'avoir `6·6·6` en bas, deux boutons : l'un menant à la version sobre, l'autre
> à la version scénique — avec un élément dans les codes de désignation des
> transformations pour déterminer laquelle. Ainsi il sera possible, selon les
> contextes, de partager facilement la version sobre — plus crédible — et la
> version scénique — plus frappante et caricaturale. »
>
> La grammaire devient :
>
> ```
> approche   := [registre '!'] fragment (',' fragment)*
> registre   := 'sobre' | 'scenique'
> ```
>
> ★ **Ce n'est PAS un opérateur, et le registre §4.1 reste fermé.** Un opérateur
> transforme l'état — il a un `from`, un `to`, un `apply()`. Le marqueur ne
> touche à rien de ce qui est calculé : deux liens qui n'en diffèrent que par
> lui portent le même programme, produisent le même verdict et reçoivent le même
> score et le même rang. C'est donc une extension de la GRAMMAIRE, au même titre
> que `×3:` et que les portées `0.1:` — qui ne sont pas des opérateurs non plus.
>
> ★ Il préfixe l'**approche entière**, jamais un fragment : montrer un fragment
> sobrement et le suivant en fanfare n'a pas de sens. Une démonstration, une
> mise en scène, un marqueur.
>
> ★ **Des mots entiers plutôt qu'un sigle.** Un lien de ce site se lit, se dicte
> et se recopie à la main — la page d'accueil en affiche deux. « sobre » y dit
> ce qu'il fait là où un `s!` renverrait à une documentation. Neuf caractères au
> pire, sur des URL qui en font déjà soixante. Sans accent, comme tout le reste
> de la grammaire.
>
> **L'ABSENCE DE MARQUEUR VAUT « SCÉNIQUE ».** Décision d'arbitrage, et voici
> pourquoi. Des liens sans marqueur circulent depuis la publication. Les deux
> lectures se défendaient, et l'argument « ne rien changer » ne départage pas :
> les deux options changent quelque chose. Sous « scénique », un vieux lien
> garde ses cornes mais gagne l'orage ; sous « sobre », il reste sans orage mais
> perd ses cornes. Ce qui départage est la NATURE des deux changements :
>
>  · **les cornes sont un geste de la DÉMONSTRATION** — une primitive du
>    vocabulaire (§3.1), émise par un opérateur que l'URL NOMME (`m36`), et dont
>    le couronnement anticipé change jusqu'au nombre d'étapes : 23 au lieu de 22
>    sur la voie de référence. Un lien qui promettait 23 étapes en rendrait 22,
>    avec une autre jauge, un autre badge, un autre Registre. C'est exactement
>    ce que §4.3 interdit ;
>  · **l'orage est du THÉÂTRE** — mêmes étapes, même numérotation, même
>    Registre, même verdict, même score. L'ajouter à un vieux lien est du même
>    ordre que d'améliorer le dessin d'une corne.
>
> Un seul des deux défauts fait donc mentir un lien. Et le coût est **borné dans
> le temps** : `ecrire()` pose toujours le marqueur, même quand il vaut le
> défaut, et `canoniser()` réécrit la barre d'adresse à l'ouverture (§4.3) — si
> bien que tout lien produit à partir d'aujourd'hui est explicite. Le défaut ne
> gouverne qu'un ensemble FINI et FIGÉ : les liens écrits avant. C'est une règle
> de lecture héritée, pas un défaut de produit. **Vérifié** : les deux
> puces-raccourcis de `src/i18n/fr.js › accueil.exemples` ne contiennent pas
> `m36` — elles ne montraient donc aucune corne, et n'en montrent toujours pas.
>
> **Ce que « sobre » désactive exactement**, et ce qu'il ne désactive pas :
>
> | | sobre | scénique |
> |---|---|---|
> | le programme, le verdict, le score, le rang | identiques | identiques |
> | l'opérateur `m36` | **exécuté** | exécuté |
> | la primitive `horns` | remplacée par `highlight` + `drop` | émise |
> | le couronnement anticipé, l'effacement différé | non | oui |
> | l'orage du verdict (§3.1) | non | oui |
> | le son (§6) | non chargé | disponible, coupé par défaut |
>
> ★ **« Désactiver les cornes » n'est PAS « désactiver `m36` ».** L'opérateur
> TRONQUE le vecteur — `[6,6,6,7,3,6]` devient `[6,6,6]`. Retirer le geste sans
> retirer l'opérateur donnerait une démonstration qui jette trois chiffres sans
> dire pourquoi ; retirer l'opérateur donnerait un autre programme, donc une
> autre URL, un autre score, un autre rang — alors que les deux boutons du
> panneau doivent mener à LA MÊME VOIE. Ce qu'on retire est le DESSIN et le
> RYTHME, pas le raisonnement : on désigne les trois 6 (`highlight`) et on
> efface le reste sur place (`drop` en mode gomme, le même `effacerSurPlace`
> qu'employait la primitive), à la place exacte où l'opérateur se trouve. La
> légende ne bouge pas — `6 6 6 7 3 6 → 666`, émise par `m36` lui-même —, donc
> Le Registre dit la même chose dans les deux registres.
> `sobrifierLesCornes`, `src/recherche/scenario.js`.
>
> ★ Les trois verrous du contrôle croisé des cornes ne sont pas relâchés : ils
> ont tous joué quand la réécriture s'exécute (l'op a déjà été validée sur la
> ligne pleine). Ce qui disparaît est le troisième — `primitives/horns.js` —,
> et il n'a plus rien à vérifier puisqu'il n'y a plus de couronne à mériter.
>
> ★ **Le panneau de voie cesse d'être un lien.** Un `<a>` ne contient pas
> d'`<a>`, et un panneau à deux destinations n'en a plus une : la règle « la
> carte est cliquable en entier » n'existait que parce qu'il n'y avait qu'un
> endroit où aller. Le pied porte désormais deux accès à parts égales — aucun
> n'est le bouton principal. Le `6·6·6` qui s'y trouvait disparaît : il répétait
> ce que le titre dit déjà (« deux séries de 666 »).


> *Amendement — LA CIBLE, `c111!`, et le DÉFAUT DU REGISTRE QUI SE RENVERSE.*
>
> **La demande de l'auteur.** « Via la page de listing, pouvoir indiquer un autre
> objectif que 666, par exemple 111 ou 777 ou 13 ou 000 ou 007, et relancer la
> recherche mais pour produire ces résultats. »
>
> La grammaire devient :
>
> ```
> approche   := marqueur* fragment (',' fragment)*
> marqueur   := registre '!' | 'c' chiffre+ '!'
> registre   := 'so' | 'sce'
> ```
>
> ★ **Ce n'est pas un opérateur, et le registre §4.1 reste clos.** Même argument
> que pour `so!` / `sce!` : un opérateur transforme l'état, il a un `from`, un
> `to`, un `apply()`. La cible ne transforme rien — elle dit ce qu'on CHERCHE.
> C'est une extension de la GRAMMAIRE, au même titre que `×3:` et que `0.1:`.
>
> ★ **Aucune ambiguïté avec `cs`.** Le `!` est interdit dans un programme, et le
> marqueur ne se lit qu'en TÊTE : `#cs+mch#…` reste la somme, `#c111!cs+mch#…` la
> même somme visant 111.
>
> ★ **L'ABSENCE DE MARQUEUR VAUT 666, ET LE MARQUEUR N'EST PAS ÉCRIT AU DÉFAUT.**
> C'est la seule différence de traitement avec le registre, et elle est
> délibérée : le défaut du registre avait dû être tranché entre deux lectures
> également défendables, ce qui imposait de le rendre explicite ; ici il n'y a
> rien à trancher — 666 est la promesse du site, elle est dans son titre. Écrire
> `c666!` partout coûterait six signes à la totalité des URL pour lever une
> ambiguïté qui n'existe pas, et changerait la forme canonique de tous les liens
> existants. **La forme canonique d'un lien qui vise 666 est donc inchangée, au
> caractère près** — un test le gèle.
>
> ★ **Les deux marqueurs se lisent dans l'un ou l'autre ordre**, et s'écrivent
> dans un seul (`registre` puis `cible`). Rien dans la grammaire ne fonde une
> préséance entre « ce qu'on démontre » et « comment on le montre » ; refuser un
> lien recopié à la main dans l'autre ordre serait une sévérité sans motif, et
> `canoniser()` réécrit la barre d'adresse de toute façon (§4.3).
>
> ★ **`#c111!#…` est la page de RÉSULTATS pour 111** — là où `sobre!` seul est un
> lien tronqué. La différence n'est pas un caprice : le registre dit comment
> MONTRER une démonstration, et une liste n'en montre aucune ; la cible dit ce
> qu'on CHERCHE, et une liste est le résultat d'une recherche.
>
> ★ **Une cible illisible s'ANNONCE** (plus de six chiffres, ou autre chose que
> des chiffres) : bandeau et repli, jamais un repli muet sur 666 — §4.3.
>
> ── **LE DÉFAUT DU REGISTRE PASSE DE « SCÉNIQUE » À « SOBRE ».**
>
> ⚠️ Ceci **remplace** l'arbitrage de l'amendement précédent. Celui-ci reposait
> tout entier sur une prémisse — « des liens écrits à la main circulent depuis la
> publication » — que l'auteur a levée : « aucun lien diffusé (si ce n'est dans
> nos scénarios de test), pas besoin de gérer la rétrocompatibilité, tu peux
> mettre à jour les liens dans les tests du dépôt ». La contrainte tombe, et avec
> elle le seul argument qui tenait « scénique » debout.
>
> Reste l'argument de fond, et il va dans l'autre sens : **la mise en scène
> s'OPTE**. Un lien nu rend la version la plus crédible ; le spectacle se demande.
> Corollaire immédiat, sans décision de plus : le bouton « Révéler » de l'accueil
> lit `REGISTRE_DEFAUT` (`src/app/pages/accueil.js`) et ouvre donc désormais la
> version sobre.
>
> ⚠️ La levée porte sur les LIENS, **pas** sur le registre de codes d'opérateurs
> (§4.1), qui reste clos : aucun code ne change de sens, aucun n'est réattribué.
> Les formes longues `sobre!` / `scenique!` restent LUES — deux alternatives dans
> une expression rationnelle, et une lecture tolérante est une vertu (§4.3) —,
> mais ce n'est plus une dette, c'est une commodité.
>
> ── **UN REGISTRE QU'ON NE SAIT PAS JOUER RETOMBE SUR « SOBRE ».**
>
> « Quand `bo!`, `ma!` ou `sce!` est utilisé dans un cas non supporté → repli en
> sobre. » (l'auteur)
>
> La mise en scène du verdict est aujourd'hui celle du 666 : les cornes, et rien
> d'autre. Une cible qui n'a pas encore d'emblème n'a pas de version scénique à
> jouer — l'auteur en a décrit un par cible (auréole, jackpot, fer à cheval,
> faux, trou noir, dés) et a remis leur dessin à plus tard
> (`.planning/A-VENIR-cibles.md`). Des trois conduites possibles, deux sont
> mauvaises : ÉCHOUER (un lien mort pour une décoration manquante) ou JOUER
> AUTRE CHOSE (des cornes de diable au-dessus d'un 111, c'est-à-dire un mensonge
> dessiné). Le repli sur le plus neutre est la troisième.
>
> Il est appliqué à la LECTURE **et** à l'ÉCRITURE (`registreEffectif`,
> `src/recherche/url.js`), sans quoi l'aller-retour mentirait ; et
> `lecture.registreDemande` conserve ce que le lien portait. La connaissance
> « quelles cibles ont un emblème » tient en une ligne — `miseEnSceneDisponible`
> — et c'est elle qui changera le jour où l'auréole existera.
>
> ── **CE QUE LA CIBLE CHANGE DANS LE MOTEUR**, et ce qu'elle ne change pas.
>
> ★ **La règle de conception, et le critère d'acceptation de tout ce chantier :
> quand la cible vaut 666, RIEN ne change** — ni les approches trouvées, ni leur
> classement, ni les URL, ni un libellé. Chaque généralisation se replie
> exactement sur l'ancien code, et là où ce repli n'était pas exact, la
> généralisation a été refusée. Les tests de `src/recherche/tests/cible.test.js`
> marqués « repli exact » comparent l'ancien calcul, recopié en toutes lettres, au
> nouveau, exhaustivement sur 4 096 vecteurs.
>
> ★ **La reformulation qui porte tout.** L'ancienne question était « quels index
> portent un 6 ? », suivie d'une division par trois. La nouvelle est « quelles
> positions, lues de gauche à droite, ÉCRIVENT la cible ? » (`cible.js ›
> seriesDe`). Sur 666 les deux rendent le même résultat, index pour index.
>
> ★ **Une cible est une SUITE DE CHIFFRES, jamais un nombre.** `Number('007')`
> vaut 7 ; le mode DIRECT est donc simplement indisponible pour les cibles à zéro
> de tête, plutôt que d'afficher un verdict que l'arithmétique n'a pas produit.
>
> ★ **La longueur d'une série est celle de la cible.** Les modes à plusieurs
> parts en ont `cible.longueur`, et la part de rang *i* doit rendre le chiffre
> `cᵢ`. `reveal` reçoit un champ `serie` dérivé de la cible plutôt qu'une
> quatrième copie de la constante 3.
>
> ★ **La RÉSONANCE exige une cible homogène** : elle repose sur « le même
> programme sur les trois occurrences du même motif », et un même programme sur
> un même texte rend un même chiffre. Ce n'est pas une limite d'implémentation,
> c'est ce que le mode signifie.
>
> ★ **Quatre opérateurs sortent de la recherche hors de 666** — `m36`, `mpf`,
> `m1s2`, `mad` (`bfs.js › OPERATEURS_LIES_A_666`). Leurs garde-fous sont écrits
> en « 6 » et en « 666 » : les trois ficelles refusent d'elles-mêmes de
> s'appliquer, et `m36` est le seul qui pourrait encore agir — en couronnant de
> cornes trois 6 qui ne sont pas le verdict. Les généraliser demanderait de faire
> voyager la cible jusque dans `apply()`, donc d'étendre la signature §2.2 : c'est
> un chantier à part, noté dans `.planning/A-VENIR-cibles.md`.
>
> ★ **LA GARANTIE « JAMAIS BREDOUILLE » (§5.3) EST UNE GARANTIE SUR 666.** Le
> dernier recours du moteur est le joker français, dont le cycle attracteur
> 4 → 6 → 3 → 5 → 4 ne visite que 3, 4, 5 et 6. Viser 111 ou 007 peut donc ne
> rien rendre, et la page de résultats le DIT (`resultat.aucuneVoieCible`) au lieu
> de plaisanter à côté. La promesse du site porte sur son titre, pas sur les
> chiffres en général.

> *Amendement — LA SAISIE EN CLAIR, et les liens qui ne nomment pas de voie.*
>
> **La demande de l'auteur.** « Si après le 2nd # une séquence non b58 est
> présente, plutôt que d'échouer, considère la chaîne comme étant la saisie brute
> (celle qui serait dans le champ de la page d'accueil). S'il n'y a qu'un #
> effectue la recherche et affiche la méthode 1 (comme si on avait cliqué sur
> Révéler). […] Si après les ...! il y a d'autres instructions, saute la
> recherche et effectue directement le programme demandé. La version b58 est bien
> sûr toujours supportée et à conserver par défaut quand on passe par l'interface
> du site. »
>
> La grammaire devient :
>
> ```
> url        := {chemin} '#' [approche] '#' saisie
>            |  {chemin} '#' saisie            // un seul `#` : cherche, puis montre
> saisie     := b58(texte) | texte
> ```
>
> ★ **LA TOLÉRANCE EST EN LECTURE SEULE.** `ecrire()` ne produit que du base58,
> et `canoniser()` réécrit la barre d'adresse à l'ouverture (§4.3) : un lien tapé
> à la main devient un lien partageable sans que personne ait rien demandé —
> exactement le mécanisme qui abrège `sobre!` en `so!`. Une URL se tape, se dicte
> et se recopie ; `#Donald Trump` est ce qu'on écrit de mémoire, et c'était
> jusqu'ici un lien mort.
>
> ★ **QUATRE FORMES, et ce qui les sépare est le NOMBRE DE `#`** — la nature de
> la saisie, elle, ne sépare rien : elle se lit pareil dans les quatre.
>
> | Lien | Ce qu'il fait |
> |---|---|
> | `#Donald Trump` | Recherche, puis **animation de la 1ʳᵉ voie** (« Révéler »). |
> | `##Donald Trump` | Recherche, puis **énumération** des voies. |
> | `#c111!sce!#Donald Trump` | Recherche avec ces réglages, puis animation. |
> | `#so!tca+m36#Donald Trump` | **Aucune recherche** : ce programme, sur ce texte. |
>
> Un lien qui ne porte QUE des marqueurs cherche ; dès qu'il porte un programme,
> il rejoue. C'est l'a contrario de la phrase de l'auteur, et cela rend son sens
> au cas `#so!#…`, qui jusqu'ici était refusé comme « registre sans programme » :
> demander une mise en scène, c'est demander une DÉMONSTRATION, et nous savons
> désormais laquelle montrer quand le lien ne la nomme pas.
>
> ★ **LE BASE58 EST PRIORITAIRE**, et la règle tient en trois conditions. La
> collision est réelle et vaste : l'alphabet base58 est fait de lettres et de
> chiffres, si bien que 134 357 des 346 244 mots de `/usr/share/dict/french`
> (39 %) n'emploient que les 58 signes — « Macron », « chat », « aide ». Ce qui
> tranche est le DÉCODAGE : lus comme un grand entier puis redécoupés en octets,
> presque tous cessent d'être de l'UTF-8 valide, et ceux qui survivent rendent
> des caractères de COMMANDE (« amour » rend U+0016, « cat » rend U+0001) que le
> champ d'accueil ne peut pas produire. C'est donc du base58 si (1) la chaîne
> n'emploie que les 58 signes, (2) elle décode en UTF-8 valide, (3) le texte
> obtenu ne porte aucun caractère de commande et n'est pas fait que de blancs.
> Sinon, c'est le texte lui-même. Le base58 gagne parce que c'est ce que le site
> PRODUIT : un lien produit par le site ne doit jamais être relu comme autre
> chose.
>
> ⚠️ **Le prix, mesuré sur le même dictionnaire** : 435 mots sur 346 244 (0,13 %)
> restent lus comme du base58 — 24 lettres seules (les 25 minuscules décodent en
> « ! » à « 9 ») et 411 mots de 4, 5, 8, 11 ou 12 signes, seules longueurs à
> rendre un compte rond d'octets imprimables (« aide » rend « db9 »). Ce reste
> est tenable parce que l'échec est BRUYANT — la page cite en titre la saisie
> qu'elle a comprise —, et parce qu'aucune quatrième condition ne tient : une
> longueur minimale tuerait `##KD8Z`, lien légitime de la saisie « 666 ».
>
> ⚠️ **UNE EXCEPTION : `#c111!#…` reste la PAGE DE RÉSULTATS**, contre la lecture
> littérale de la règle ci-dessus. C'est la forme que `ecrire({saisie, cible})`
> produit — le lien de partage de la page de listing — et l'écriture ne change
> pas ; sans elle, l'énumération deviendrait indemandable pour toute cible autre
> que 666. La frontière est celle qui était déjà posée pour le registre : le
> registre dit comment MONTRER une démonstration, et une liste n'en montre
> aucune ; la cible dit ce qu'on CHERCHE, et une liste est le résultat d'une
> recherche.
>
> ⚠️ **UNE ANCRE HTML N'EST PAS UNE SAISIE.** Le fragment d'URL désigne un
> élément de la page depuis toujours, et le site s'en sert : le lien d'évitement
> « Aller au Registre » pointe sur `#registre-titre`. Le routeur ne route donc
> pas un fragment qui désigne un élément monté — sans quoi ce lien-là ouvrirait
> une démonstration sur « registre-titre ». C'était déjà un défaut avant cet
> amendement (il menait à l'accueil avec un bandeau) ; il devenait invisible.

> *Amendement — LA RETOUCHE, `2.1:fr13;…` : un mot réécrit, puis tout le monde lit.*
>
> **La demande de l'auteur.** « Pour "Donald Trump" ce que je voudrais, et qui
> n'est pas encore géré : `#so!2.1:fr13,tca+mtal+m14+mpf#…`. En gros, on fait la
> conversion fr13 sur le 2ⁿᵈ mot, puis on trie l'ensemble, on applique m14 à
> l'ensemble, on enlève les chiffres minoritaires. […] Si le programme entre ##
> s'écrit différemment, ça me va du moment que ça produit l'effet que je décris. »
>
> La grammaire ne savait l'écrire d'AUCUNE façon : un fragment porte son
> programme de bout en bout, et deux fragments ne se recombinent qu'au verdict.
> Il manquait un étage AMONT. Elle devient :
>
> ```
> approche   := marqueur* (retouche ';')* fragment (',' fragment)*
> retouche   := [portee ':'] programme        // STR → STR : réécrit la saisie
> ```
>
> ★ **`;` ET NON LA VIRGULE, ET CE N'EST PAS UN GOÛT.** La virgule dit déjà
> « ces deux morceaux donnent chacun leur chiffre, et les chiffres s'assemblent ».
> Lui faire dire aussi « ce morceau nourrit le suivant » laisserait `a,b`
> indécidable — et surtout indécidable **dans `url.js`, qui lit la grammaire SANS
> catalogue**, précisément pour que `src/recherche` reste testable sur un
> catalogue de fantaisie. Il ne peut donc pas trancher en regardant si `fr13`
> rend du texte ou un chiffre. Le sens devait être écrit, pas déduit.
>
> Le choix de `;` tient à trois raisons, dans cet ordre : il est légal tel quel
> dans un fragment d'URL (`sub-delims`, RFC 3986 §3.4), là où `>` et `|` — qui se
> lisaient pourtant mieux — deviennent `%3E` et `%7C` dès qu'une messagerie les
> touche ; il dit « puis » partout où on l'a déjà vu ; et il est à UN caractère de
> ce que l'auteur avait écrit.
>
> ★ **Une retouche rend du TEXTE, et c'est le MOTEUR qui le vérifie**
> (`index.js › rejouer`), pas la grammaire — voir ci-dessus, elle n'a pas le
> catalogue. Un programme qui finirait sur un nombre ne saurait pas se reposer
> dans la saisie : le lien est refusé avec son bandeau (§4.3), jamais joué
> autrement.
>
> ★ **Les portées qui suivent comptent sur le texte RÉÉCRIT.** `a;b` se lit
> « d'abord a, puis b sur le résultat », et une retouche peut allonger ou
> raccourcir ce qu'elle touche : les jetons sont donc recomptés à chaque étage.
> C'est la seule lecture qui se relise sans ambiguïté.
>
> ★ **Pas d'abréviation de résonance dans une retouche.** `×3:` nomme trois
> occurrences d'un motif COMME TROIS PARTS qui s'assemblent ; une retouche ne
> s'assemble avec rien, elle réécrit une place. Trois places se réécrivent avec
> trois retouches, dont l'ordre est alors écrit noir sur blanc.
>
> ★ **Sans retouche, une URL s'écrit au caractère près comme avant** : le `;`
> n'apparaît que là où il y a deux étages à séparer. Un test le gèle.
>
> ⚠️ **CE QUE LE BARÈME NE VOIT PAS, et c'est un arbitrage EN ATTENTE.** Les
> opérations d'une retouche voyagent dans `approche.retouches`, **à côté** de
> `approche.parts` et jamais dedans — `parts` signifie « un morceau qui rend un
> chiffre », et c'est sur lui que se lisent le mode, la moisson, le verdict et la
> géométrie des portées disjointes ; y verser une retouche ferait déduire une
> PARTITION là où il n'y a qu'une préparation. Conséquence : ni `score.js` ni
> `elegance.js` ne les voient, et une voie retouchée est notée comme si son étage
> amont était gratuit. **Le générateur de recherche existe, il est mesuré et
> testé, mais il reste DÉBRANCHÉ** (`creerMoteur(…, { retouches: true })`) :
> branché, il détrône sur « Donald Trump » la voie que l'auteur a nommée
> lui-même. Les mesures et le chemin en trois étapes sont dans
> `.planning/A-VENIR-retouches.md`.

> *Amendement — LES PORTÉES GROUPÉES, `0.1+2.1+4.1:tca+m14`.*
>
> **La demande de l'auteur.** « Pour hope-hope-hope.fr voici celui que je trouve
> le plus élégant : `#so!0.1:tca+m14,2.1:tca+m14,4.1:tca+m14,1.1:tca+mtc+cs,3.1:tca+mtc+cs,6.1:tca+mpy+mr9#…`.
> Qui gagnerait à pouvoir s'écrire :
> `#so!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+mpy+mr9#…` »
>
> La grammaire devient :
>
> ```
> fragment   := [portees ':'] programme
> portees    := portee ('+' portee)*        // un programme, plusieurs places
> ```
>
> Sur son exemple, l'approche passe de 84 signes à 57 — un tiers de moins.
>
> ★ **C'EST UNE ABRÉVIATION D'ÉCRITURE, ET RIEN D'AUTRE.** `0.1+2.1:P` est
> DÉPLIÉ en `0.1:P,2.1:P` dans `lire()`, avant que quoi que ce soit en aval n'en
> voie la trace : mêmes descripteurs, même ordre, même rejeu, même score. Le
> modèle ne connaît pas le groupe, et un test compare les deux lectures champ
> par champ plutôt que de comparer deux exécutions.
>
> ★ **LE `+` NE DEVIENT PAS AMBIGU.** Il sépare désormais les portées avant le
> `:` et les codes après, mais jamais dans la même région : le `:` est cherché
> EN PREMIER et partage le fragment en deux zones étanches avant qu'un seul `+`
> ne soit lu — et le premier `:` est toujours le bon, un programme ne pouvant
> pas en contenir (§4.1). La sûreté est double : les deux alphabets sont
> disjoints par construction (une portée ouvre sur un chiffre, un code sur une
> lettre de famille), si bien que `url.js`, **qui lit la grammaire sans
> catalogue**, n'a jamais à se demander si `2` est un code connu. C'est toute la
> différence avec la virgule proposée pour la retouche, qui aurait exigé, elle,
> de savoir ce que `fr13` PRODUIT.
>
> ★ **ET `ecrire()` LA PRODUIT : la forme groupée est la forme CANONIQUE.** Trois
> raisons, dans cet ordre. (1) Sans cela la grammaire ferait le contraire de ce
> qu'on lui demande — `canoniser()` réécrit la barre d'adresse à chaque
> ouverture (§4.3), donc un lien groupé se ferait déplier sous les yeux de celui
> qui vient de l'écrire ; une abréviation qu'on ne peut pas garder n'en est pas
> une. (2) La forme canonique de cette grammaire est déjà partout la plus
> courte : `sobre!` → `so!`, `c666!` jamais écrit, portée couvrante omise, et
> `×3:` qui abrège mot pour mot « le même programme sur trois places » — le
> groupe est ce geste-là sur des places quelconques. (3) **Le coût est mesuré et
> nul là où il aurait fait mal** : aucune URL figée de ce dépôt ne change, les
> deux puces d'accueil (`src/i18n/fr.js`) alternant leurs programmes ; sur 133
> voies produites pour 14 saisies, 5 se groupent (3,8 %), pour 12 signes gagnés
> en moyenne. Un test gèle l'invariance des liens d'accueil.
>
> ★ **SEULES LES PORTÉES CONTIGUËS SE GROUPENT**, et c'est un invariant, pas une
> paresse : l'ordre des fragments est ce qui ÉCRIT la cible de gauche à droite,
> si bien que rapprocher les jumelles de `0.1:P,1.1:Q,2.1:P` rendrait `007` là
> où le lien disait `070`. Sur 666 la faute serait invisible — les trois
> chiffres y sont égaux —, raison de plus pour l'écrire. L'exemple de l'auteur
> est d'ailleurs déjà rangé 0, 2, 4, 1, 3, 6 pour que ses jumelles se touchent.
>
> ★ **PAS DE GROUPE DANS UNE RETOUCHE**, pour la raison qui y interdit déjà
> `×3:` : les jetons sont recomptés à chaque étage, donc un groupe aurait l'air
> parallèle et serait séquentiel. Deux places se réécrivent avec deux retouches.
>
> ★ **AUCUNE VALIDATION AJOUTÉE NI RETIRÉE.** `0.1+0.1:P` est accepté parce que
> `0.1:P,0.1:P` l'était ; une portée hors bornes est refusée au même endroit
> qu'avant — le moteur, seul à connaître la saisie. Refuser ici ce que la forme
> dépliée accepte ferait deux grammaires au lieu d'une.

Exemples :

```
#fp+tca+ma1+cs+prn#3fq9KJ                        une seule voie, saisie entière
#×3:ma1+cs+prn#4CWoMo83vssW                     résonance : trois fois la même méthode
#0.1:ma1+cs+prn,1.1:nv+prn,2.1:mch+cst#4CWoMo83    trois fragments, méthodes distinctes
##3fq9KJ                                       page de résultats (README)
#c111!#3fq9KJ                                  page de résultats, mais pour 111
#Donald Trump                                  cherche, puis montre la 1ʳᵉ voie
#c111!sce!#Donald Trump                        idem, avec les réglages du lien
#so!tca+m36#Donald Trump                       ce programme, sur cette saisie en clair
#so!c007!0.1+2.1:tca+mboc+cp,6.1:tca+mms+cs#…   une voie qui écrit 007
#so!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,6.1:tca+mpy+mr9#…   trois groupes, six places
#so!2.1:fr13;fl+tca+mtal+m14+mpf#2HuP1G8mNg3sJWhqR   on chiffre « Trump », puis on lit tout
```

⚠️ L'exemple 007 ci-dessus s'écrivait `0.1:tca+mboc+cp,2.1:tca+mboc+cp,…` avant
l'amendement « LES PORTÉES GROUPÉES » : ses deux premières places sont voisines
et portent le même programme, donc elles se groupent désormais. Sa suite de
chiffres, elle, est inchangée — c'est justement ce que la règle « seulement des
voisines » garantit.

### 4.3 Lecture tolérante, écriture canonique

| Forme lue | Comportement |
|---|---|
| Grammaire §4.2 | **Rejouée telle quelle, sans recherche.** |
| `#3+7+2#…` (rangs hérités du README) | Recherche relancée, rangs 3/7/2 du classement courant, bandeau discret « démonstration recalculée ». |
| `##…` | Page de résultats. |
| `#texte` (un seul `#`), `#so!#…` (marqueurs seuls) | Recherche, puis **animation de la 1ʳᵉ voie** — le geste de « Révéler ». `#c111!#…` fait exception et reste la liste (§4.2, amendement « LA SAISIE EN CLAIR »). |
| `#…#texte` dont le texte n'est pas du base58 lisible | Le texte EST la saisie ; la barre d'adresse est réécrite en base58 à l'ouverture. Le base58 reste prioritaire (§4.2). |
| Fragment désignant un élément monté (`#registre-titre`) | Ancre HTML : le routeur ne route pas, le navigateur défile. |
| `#0.1+2.1:P#…` (portées groupées) | **Dépliée en `0.1:P,2.1:P`** à la lecture : mêmes fragments, même ordre, même score. C'est aussi la forme ÉCRITE quand deux places VOISINES partagent un programme (§4.2, amendement « LES PORTÉES GROUPÉES »). |
| `#0.1+2.1:P;…#…` (groupe dans une retouche) | Refusée, bandeau explicite : un groupe y aurait l'air parallèle et serait séquentiel — même règle que pour `×3:`. |
| `#c111!…#…` (marqueur de cible) | Rejouée sur la cible demandée. Absent ⇒ 666 (§4.2, amendement « LA CIBLE »). |
| `#c1234567!…#…` (cible illisible) | Bandeau explicite : jamais un repli muet sur 666. |
| `#sce!c111!…#…` (registre sans emblème) | **Replié sur `so!`**, à la lecture comme à l'écriture. Mêmes étapes, même verdict : ce qui manque est un DESSIN. |
| Code inconnu / portée hors bornes / format inconnu | Bandeau explicite + repli sur la page de résultats. |

**Un lien ne renvoie jamais silencieusement vers une autre démonstration :** soit il
rejoue exactement, soit il l'annonce.

À l'ouverture d'une démonstration, l'application réécrit **toujours** la barre d'adresse
en forme canonique via `history.replaceState`. L'utilisateur qui copie l'URL copie donc
un lien permanent sans avoir à le savoir. Les rangs restent affichés dans l'UI (le
README les veut pour le débogage) mais ne sont plus **l'identité** d'une démonstration.

### 4.4 Déterminisme — règles d'implémentation

1. **Ordre total explicite** : `rang de conviction ASC → séries DESC (au rang 0)
   → score DESC → séries DESC → longueur ASC → suite des codes comparée
   lexicographiquement ASC`. Aucun ex æquo ne subsiste, donc la stabilité du tri natif
   devient sans objet.

   > ⚠️ **Le dernier départage dépend de l'ORTHOGRAPHE des codes**, et donc
   > renommer un opérateur permute des voies parfaitement à égalité. C'est
   > mesuré, assumé, et documenté en §4.1 (amendement « les cent codes
   > deviennent parlants ») : la même comparaison sert aussi à choisir le
   > représentant d'une classe de chemins (`assemblage.js › comparerChemins`,
   > `bassin.js`), et le classement de `hope-hope-hope.fr` en est sorti permuté.
   > Un test qui va chercher une voie PRÉCISE dans le classement est donc à
   > écrire autrement : on rejoue un lien.

   > *Amendement — cet ordre est le MIXTE, et il n'est plus le seul.* Il reste
   > l'ordre de la liste à partir de la troisième ligne ; les deux premières sont
   > réservées aux champions de `ordreElegance` et de `ordreTriptyques` (§5,
   > amendement « l'élégance se mesure sur le chemin »). Les trois comparateurs
   > obéissent aux mêmes règles : entiers, aucun ex æquo, ordre total et strict —
   > un test le vérifie pour chacun, sur toutes les paires d'une liste réelle. (Le rang de conviction et le nombre de séries sont tous deux
   **redéduits de la géométrie** par `deduireMode` — jamais transportés par l'URL —,
   donc un lien rejoué retrouve exactement sa place. Voir §5, amendement « la
   `MOISSON` et les trois rangs ».)

   > *Amendement — LES TROIS CLASSEMENTS LISENT TROIS CRÉDITS, et le compte a le
   > droit de remonter d'une ligne.*
   >
   > Les trois comparateurs comparaient tous le MÊME crédit d'élégance, et ce
   > crédit paie la quantité — 260 milli-unités par 666 contigu, 90 par 666
   > répété, 22 par 6 surnuméraire. « Le champion de l'élégance » désignait donc
   > pour une bonne part le champion du COMPTE, et la 1ʳᵉ ligne ne répondait pas
   > à la question qu'elle annonce. L'auteur a tranché :
   >
   > > « Si l'élégance prime, alors le fait de trouver 1 fois ou plusieurs fois
   > >  le motif ne devrait pas apporter de bonus (ou infime : 1 % du poids
   > >  habituel) […]. Pour le 2ⁿᵈ résultat, c'est la quantité qui prévaut,
   > >  l'élégance n'est pas négligeable, mais elle pèse 33 % de son poids
   > >  habituel. À partir du 3ᵉ résultat l'hybride actuel me semble bien. »
   >
   > Chaque poste du barème déclare désormais sa FAMILLE — quantité ou élégance —
   > en même temps que son SIGNE (`elegance.js › NATURE`), et chaque régime
   > repondère une famille sans toucher à l'autre
   > (`score.js › POIDS_DES_REGIMES`). Le socle n'est jamais repondéré, et le
   > FACTEUR qui redescend sur le score de conviction continue de lire le crédit
   > PLEIN : un régime ne sert qu'à classer, jamais à noter.
   >
   > ⚠️ **Conséquence normative : le nombre de séries PEUT remonter entre la 1ʳᵉ
   > et la 2ᵈ ligne**, et c'est ce qui met la 2ᵈ là. L'invariant « le compte ne
   > remonte jamais » ne vaut donc plus qu'à partir de la première ligne du
   > mixte ; il n'a pas été affaibli ailleurs. ⚠️ **Et les quatre cas de
   > référence de l'auteur ont changé de LIGNE, pas de contenu** : la voie qu'il
   > a nommée sur `hope-hope-hope.fr`, sur `https://hope-hope-hope.fr/` et sur
   > `Donald Trump` occupe la 2ᵈ ligne — celle de la quantité, qui est la
   > question à laquelle elle répond ; `Macron` garde la 1ʳᵉ.
   >
   > ⚠️ MESURÉ au banc sur les dix-neuf saisies témoins : douze têtes de liste
   > changent, la 2ᵈ place passe de 4 à 13 attributions, et **aucune des six
   > places restées vides ne l'est par timidité** — sur cinq d'entre elles la
   > recherche ne trouve aucune voie à plus d'une série, sur la sixième
   > (`reinfocovid`) le champion de l'élégance est déjà le plus fourni. La règle
   > ne rend donc pas le créneau vide impossible ; elle le rend rare et
   > explicable.

2. **Score entier**, en milli-unités. Deux flottants à 10⁻¹⁶ près qui s'inversent
   suffisent à permuter deux lignes.
3. **Ordre d'itération maîtrisé** : toujours parcourir le catalogue dans l'ordre de
   son registre (§4.1 règle 3), qui est aussi son ordre de déclaration.
   Jamais dépendre de l'ordre d'insertion d'une `Map` alimentée par un parcours de graphe.
4. **Aucune source d'entropie** : ni `Math.random`, ni `Date.now`, ni `localeCompare`,
   ni `Intl`. Comparaisons de chaînes en unités de code.

   > *Amendement — la dernière horloge se DÉBRANCHE, par une option explicite.*
   >
   > La borne primaire de la recherche est un budget de TRAVAIL, qui ne dépend
   > que de la saisie (`bfs.js › BUDGET_TRAVAIL`). Il subsiste pourtant un arrêt
   > d'urgence à l'horloge (`BUDGET_MS_FILET`, `BUDGET_TOTAL_MS`), réglé haut, et
   > le commentaire qui l'entoure le dit lui-même : « ★ le filet de sécurité s'est
   > déclenché : c'est un DÉFAUT ».
   >
   > ⚠️ **Mesuré : il mord.** Le test « déterminisme — deux exécutions donnent le
   > même classement » échoue environ **une fois sur trois sous charge**, et il
   > échouait déjà en v1.0.0 (deux échecs sur quatre en rejouant sur le tag).
   > Hors charge, six exécutions d'affilée sont identiques. Le classement n'est
   > donc pas stable sous charge — et tant qu'il ne l'est pas, **deux barèmes ne
   > peuvent pas être comparés** : la base bouge sous la mesure.
   >
   > `creerMoteur(catalogue, { filetTemporel: false })` le retire. Il ne reste
   > alors que des bornes déterministes (`BUDGET_TRAVAIL`, `MAX_NODES`,
   > `D_MAX`) : la recherche termine toujours, sur une borne qui ne dépend que de
   > l'entrée. Débranché, l'horloge n'est même pas **lue** — pas de
   > `maintenant()`, pas de `t0`, pas de comparaison.
   >
   > ★ **Option EXPLICITE, jamais un contournement silencieux.** L'appelant qui
   > ne demande rien garde son filet ; celui qui le retire l'a écrit noir sur
   > blanc. Deux usages, et deux seulement : le banc de mesure (`.planning/banc/`)
   > et les tests qui comparent deux classements. **L'application garde le
   > sien** — un navigateur peut être arbitrairement lent, et un onglet qui ne
   > rend jamais la main est pire qu'un classement écourté qui le dit (§4.3).
   >
   > Deux tests en héritent : « deux exécutions donnent le même classement » et
   > « six exécutions SOUS CHARGE » travaillent désormais filet débranché, et
   > l'exigence y devient ABSOLUE — le second tolérait qu'une exécution diffère
   > « à condition de le dire », et cette tolérance était le trou par lequel
   > l'entropie passait. Ce que le filet fait quand il mord se vérifie ailleurs,
   > sur une horloge factice, donc sans dépendre de la charge.
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
  ★ Ces six critères se lisent tous sur l'ÉTAT FINAL. Un neuvième malus, qui se
  CALCULE et qui lit le CHEMIN, s'y ajoute en facteur — voir l'amendement
  « l'élégance se mesure sur le chemin » en fin de §. Le critère `E` nommé ici
  reste ce qu'il était : l'élégance des NOMBRES traversés, et rien de plus.
- Anti-doublons à 4 niveaux, dont la déduplication **sur ce qui est montré** (trace des
  valeurs affichées) et un MMR de diversité (`λ = 0,35`, au plus 2 approches par mappeur).

  > *Amendement — N2 et N3 portent sur le chemin, pas sur l'étape.* N3 était
  > appliqué localement (« l'opérateur ne change pas l'état courant »), ce qui
  > laissait passer les étapes **inopérantes** : sur `hope-hope-hope.fr`,
  > `fl+fv+nl` et `fv+nl` cohabitaient alors que filtrer les lettres avant les
  > voyelles ne change rien au résultat. Le critère retenu est désormais le
  > RÉSULTAT : une étape dont le retrait laisse le chemin aboutir au même état
  > est retirée, même si elle changeait une image intermédiaire. De même, N2
  > trie les suites commutantes **dans le chemin** avant de calculer N1 — comme
  > le §4.8 le demande — et non plus seulement dans la clé, où la trace des
  > valeurs suffisait à faire survivre `ftld+fp+nc` à côté de `fp+ftld+nc`.
  >
  > *Amendement — N1 déduplique enfin sur ce qui est montré.* La clé de
  > `canonicaliser` valait `trace des valeurs affichées` **+ suite des codes**.
  > Ajouter les codes RAFFINE la clé : deux chemins montrant exactement la même
  > chose survivaient tous les deux dès que leurs codes différaient d'une
  > lettre — c'est-à-dire que N1 ne dédupliquait pas. Le défaut est resté
  > invisible tant qu'aucun mappeur ne rendait un vecteur **constant** :
  > l'afficheur quatorze segments en rend un sur `hope` (six segments pour
  > chacune des quatre lettres), et alors « en moyenne », « au plus grand » et
  > « au plus petit » donnent le même 6 par le même dessin — trois chemins, une
  > seule démonstration à l'écran, trois des huit places que l'assemblage garde
  > par fragment. La clé est désormais **la trace seule**. Mesuré sur quatorze
  > saisies : `hope-hope-hope.fr` retrouve ses douze approches (dont les deux
  > pythagoriciennes, plus une qui n'y figurait pas), dix autres saisies passent
  > de quatre ou six lignes à huit ou douze, aucune méthode ne disparaît. N2
  > n'est pas perdu pour autant : il s'applique **sur le chemin**
  > (`assemblage.js › normaliserChemins`), comme le présent § le demande déjà.
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
  >
  > *Amendement suivant — le décret est SUPPRIMÉ.* L'aveu ne suffisait pas :
  > « ça enlève la vraisemblance à la démarche » (l'auteur). Sur `macron`, sur
  > `hope`, sur `Millicent`, la liste entière décrétait, et une liste qui ne
  > montre que des démonstrations de convenance ne démontre rien.
  > `assembler` ne le **produit plus** : `deduireMode` le nomme `DECRET` et
  > l'approche est jetée avant même la notation. `MALUS.decret` survit pour deux
  > cas seulement — un lien partagé avant la suppression, que `rejouer` doit
  > continuer d'ouvrir (§4.3), et l'approche joker, qui en est structurellement
  > un et que §0.4 maintient en fond de liste.
  >
  > **Deux modes en héritent**, et tous deux gagnent leurs trois 6 :
  >
  > · **`GROUPEMENT`** — un seul calcul rend un **vecteur** qui porte déjà trois
  >   6 ou davantage, et on les groupe par trois. `hope` sous l'afficheur
  >   quatorze segments donne `[6,6,6,6]` : quatre 6 en un geste, parce que six
  >   segments dessinent `D E G H N O P`. Le moteur les réduisait à un seul
  >   (moyenne, somme puis racine) puis décrétait les deux autres ; il les groupe
  >   désormais. Le vecteur n'est pas un produit du BFS — celui-ci ne rend que
  >   des chemins terminés sur `NUM = 6` — mais d'une énumération à part, fermée
  >   sur la forme `[filtre] → découpe → mappeur → [raffinage]`, exhaustive,
  >   bornée par le catalogue et **sans horloge**.
  >   Un **huitième malus** l'accompagne, et c'est le seul qui se CALCULE : le
  >   **rendement**, `√(6 gardés / taille du vecteur)`. Sans lui, « trois de ces
  >   dix-sept nombres sont des 6 » valait autant que « les quatre valent 6 » —
  >   les six critères ne voient pas la différence.
  >   Le verdict n'est plus forcément `666` : douze 6 en alignent quatre séries,
  >   et le scénario porte alors `result: "666 666 666 666"` (plafond `MAX_SERIES`,
  >   pour que la scène reste lisible — porté à 6 par l'amendement « MOISSON »).
  >
  >   ★ *Amendement — le NUMÉRATEUR du rendement est ce que le VERDICT garde.*
  >   ⚠️ **Ceci modifie `score.js`, donc le classement.** `[6,6,6,6]` valait
  >   ×1,00 alors que le quatrième 6 tombe : le verdict compte des séries de
  >   trois, et la scène MONTRE ce surplus tomber, du même `drop` que les
  >   valeurs qui ne font pas 6. Un 6 de trop n'est donc pas un 6 gardé, et le
  >   porter au crédit du rendement flattait le score de ce qu'il est
  >   précisément chargé de punir — du calcul montré puis écarté. Le numérateur
  >   est plafonné au compte annoncé (`min(six, séries × 3)`, les séries venant
  >   de `deduireMode`, donc de la géométrie : un lien rejoué retrouve son
  >   score). Ce qui l'a révélé est le test qui recoupe le rendement avec ce que
  >   l'étape de tri AFFICHE : `fc+tca+mx6+mrn` sur `https://hope-hope-hope.fr/`
  >   annonçait 384 pour une scène qui garde trois jetons et en jette dix,
  >   c'est-à-dire 230. Mesuré ailleurs : `hope` en quatorze segments passe de
  >   ×1,00 à ×0,87 ; les moissons de `hope-hope-hope.fr` (15/15) et de
  >   `https://hope-hope-hope.fr/` (18/20) ne bougent pas, leur récolte étant
  >   déjà un multiple de trois.
  >
  > · **`CONVERGENCE`** — la **même chaîne**, prise de **trois manières
  >   différentes**, qui tombent toutes trois sur 6. « Pour les saisies courtes,
  >   l'idée sera d'utiliser la séquence complète de trois manières différentes »
  >   (l'auteur). Trois manières, pas trois codes : `m.seg7`, `m.seg7Fusion` et
  >   `m.traitsMaj` comptent tous les trois ce qu'on dessine. Le palier
  >   « même famille de mappeur » de §4.2 ne peut pas trancher — il repose sur un
  >   attribut `genre` que le catalogue ne porte sur **aucun** de ses quarante
  >   mappeurs —, si bien que `score.js › maniere` fournit la taxonomie manquante
  >   (géométrie · alphabet · jeu · clavier · code · comptage). Un combinateur
  >   **aveugle** (`c.cardinal`) ramène la manière à « comptage » : `tca+mpy+cnv` et
  >   `tca+msen+cnv` annoncent deux numérologies et comptent tous deux les lettres.
  >
  > *Amendement — l'ordre total gagne un cran.* §4.4-1 devient : score DESC →
  > **séries DESC** → `L` ASC → codes ASC. Deux groupements qui produisent l'un
  > quatre 666 et l'autre un seul tombent au même score — même méthode, même
  > couverture, même longueur — et se départageaient sur la suite des codes,
  > c'est-à-dire sur rien. L'ordre reste total et strict.
  >
  > *Amendement — l'assemblage mixte n'est plus un repli.* La jointure sur
  > signature ne fabriquait la combinaison hétérogène que lorsque **aucune**
  > signature commune ne se présentait ; elle décidait donc de ce qui EXISTE.
  > Le mélange est désormais proposé systématiquement, en plus des combinaisons
  > homogènes : l'homogénéité reste préférable — elle le dit dans le score, pas
  > dans le générateur — mais elle n'empêche plus un 666 d'exister.
  >
  > *Amendement — la `MOISSON`, et les TROIS RANGS DE CONVICTION.* « Privilégie
  > celle qui donne le plus de séries de 666 sans réutiliser les mêmes
  > caractères, puis les plus simples qui donnent 666, et enfin celles qui
  > réutilisent les mêmes lettres mais de manières différentes » (l'auteur).
  >
  > · **`MOISSON`** — les 6 de **portées disjointes**, groupés par trois. Le
  >   `GROUPEMENT` ne récolte que dans **un** vecteur, donc sous **une** méthode :
  >   sur `hope-hope-hope.fr`, le quatorze segments donne douze 6 sur les lettres
  >   mais cale sur les tirets (aucun segment ne dessine un `-`) et sur `fr`. Ces
  >   trois 6 existent pourtant ailleurs — le tiret est sur la touche du 6, `fr`
  >   vaut 4 + 2 en sept segments. Rien n'oblige à les tirer d'un seul programme :
  >   les jetons sont naturellement disjoints et la grammaire §4.2 écrit déjà une
  >   portée par fragment (`0.1:tca+m14,1.1:tca+mtc+cs,…`). **Quinze 6, cinq séries,
  >   pas un caractère compté deux fois** ; avec `https://` devant, dix-huit 6 et
  >   six séries. Le choix des portées est un **ordonnancement pondéré
  >   d'intervalles**, résolu exactement par programmation dynamique sur les
  >   jetons — un glouton se tromperait (`hope-hope-hope` d'un bloc rapporte
  >   douze 6, découpé en cinq portées il en rapporte quatorze).
  >   Le **rendement** du `GROUPEMENT` s'y étend : 6 récoltés / valeurs calculées,
  >   toutes portées confondues. `MAX_SERIES` passe de 4 à **6**.
  >   Garde-fou structurel : une part qui n'apporte **aucun** 6 disqualifie
  >   l'approche, et un chemin dont le vecteur final est plus large que les jetons
  >   dont il sort est refusé — c'est la promesse « aucun caractère deux fois ».
  >
  >   ★ **Et l'ÉLAGAGE : on ne récolte pas une portée pour la jeter.**
  >   L'ordonnancement maximise les **6** ; le verdict compte des **séries de
  >   trois**. Les deux ne coïncident pas. Sur `https://hope-hope-hope.fr/`, les
  >   quatre premières portées donnaient 3 + 4 + 4 + 4 = quinze 6 — cinq séries
  >   pile —, et la moisson ajoutait « fr » pour un seizième 6 qui ne faisait pas
  >   une sixième série : la démonstration convertissait `f` et `r`, les
  >   additionnait, et **jetait le résultat cinq étapes plus loin**. Ce n'est pas
  >   seulement du temps perdu : montrer qu'on calcule une valeur pour l'écarter
  >   aussitôt donne à voir que le compte était **arrêté d'avance**, ce qui est le
  >   contraire de ce que la démonstration prétend faire. Une portée qui ne pèse
  >   que dans le surplus est donc retirée de l'approche — de son URL, de son
  >   coût, de son score —, et ses caractères sont écartés **au découpage**, du
  >   même geste que le point qui les précède, à la **première** étape et non à la
  >   trente-troisième. Mesuré : 34 étapes → **29**. L'élagage garde le plus court
  >   préfixe qui atteint encore le compte gardé (le surplus est toujours en
  >   queue) et ne s'applique **que** si le verdict reste identique.
  >   L'étape d'appoint subsiste pour ce qu'elle seule sait faire : le surplus qui
  >   tombe *à l'intérieur* d'une portée par ailleurs indispensable.
  >   ★ **Le rejeu d'une URL explicite n'élague pas** (§4.3 : une URL rejouée
  >   retrouve le compte exact de la liste dont elle est issue). Une portée
  >   nommée dans le lien a été demandée ; on l'honore, et l'appoint la montre.
  >
  >   ★ *Amendement — ce qu'on minimise est le DÉCHET, pas le compte des 6.*
  >   `reduireLeSurplus` prenait, pour chaque portée en partant de la queue, le
  >   candidat le **moins fourni en 6** qui laisse encore de quoi tenir le
  >   compte. Le nombre de 6 y servait de mesure du gaspillage, et c'est un
  >   mauvais indicateur : un programme peut rendre moins de 6 en calculant
  >   beaucoup plus de valeurs. Mesuré sur `Donald Trump`, la portée `Trump`
  >   disposait de `fr13+tca+m14+m36` — **trois 6 sur trois valeurs, rien de jeté** —
  >   et d'un `fatb+tca+m14` qui rend **deux 6 sur cinq valeurs** ; il y avait un 6
  >   de trop dans la récolte, et l'ancienne règle troquait le premier contre le
  >   second — échangeant *un 6 en trop* contre *trois valeurs calculées puis
  >   écartées*. Exactement le contraire de ce que ce point annonce.
  >
  >   Le déchet, c'est **tout ce qu'on montre puis qu'on écarte** : les valeurs
  >   qui ne valent pas 6, et les 6 qui dépassent le compte. Les deux se lisent
  >   d'un seul nombre — la somme des largeurs de vecteur moins le compte gardé
  >   — et c'est lui qu'on minimise. Un balayage unique de droite à gauche ne
  >   pouvait pas y arriver : réduire `Trump` fait retomber le compte, ce qui
  >   INTERDIT ensuite de réduire `Donald`, alors que c'est `Donald` qu'il
  >   fallait réduire. C'est donc une **recherche locale** — à chaque tour, le
  >   remplacement d'UNE portée qui diminue le plus le déchet — bornée (le
  >   déchet est un entier positif strictement décroissant), et déterministe :
  >   ordres de balayage fixes, comparaisons strictes. À déchet égal, c'est la
  >   portée la plus **tardive** qui cède — le surplus est en queue —, puis la
  >   récolte la plus maigre. Le verdict reste intangible : un remplacement qui
  >   changerait le nombre de séries est refusé, même à la hausse (même
  >   doctrine qu'`elaguerLaMoisson`).
  >
  > · **Le rang de conviction** (`score.js › RANG`) devient la clé PRIMAIRE du
  >   classement, avant le score : `0` — au moins deux séries sur caractères
  >   disjoints ; `1` — un 666 ordinaire ; `2` — `CONVERGENCE`, honnête mais où
  >   les mêmes caractères servent trois fois. Un bonus additif avait été essayé
  >   et **mesuré** : faire passer une moisson à cinq séries (≈ 5 900, trois
  >   méthodes donc H ≈ 0,30) devant un groupement homogène à 8 479 demande
  >   ≈ 2 600 milli-unités, et 3 000 pour six séries ; les prélever sur la réserve
  >   ramène `PART_CRITERES` de 0,83 à 0,55, ce qui fait tomber les sept méthodes
  >   du README d'un tiers — la méthode 6, mesurée à 48/100, passerait sous le
  >   plafond du joker. La hiérarchie est donc **explicite** et ne touche à aucun
  >   score. Corollaire assumé : la colonne des scores n'est décroissante qu'à
  >   l'intérieur d'un rang, et le titre de la ligne dit pourquoi elle passe
  >   devant (« cinq séries de 666 »).
  >   Le MMR (§4.8) applique la même hiérarchie : la pénalité de redondance joue
  >   à l'intérieur d'un rang, jamais entre deux — sans quoi la sélection
  >   gloutonne épuisait le quota d'un mappeur avant d'avoir regardé le mode le
  >   mieux classé.

  > *Amendement — ★ L'ÉLÉGANCE SE MESURE SUR LE CHEMIN, et le classement devient
  > une SÉLECTION À TROIS OBJECTIFS.*
  >
  > « J'ai bien conscience qu'attribuer des scores aux étapes et au chemin en
  > plus d'en attribuer au résultat final complexifie, mais c'est je pense ce qui
  > va permettre de rendre mesurable l'élégance d'une solution par rapport à une
  > autre. » — l'auteur.
  >
  > **Le constat.** Les six critères, le rendement et les quatre malus constants
  > se lisent tous sur l'**état final** d'une approche : la méthode employée, la
  > couverture de la saisie, la longueur rendue, les nombres traversés. Ce que
  > l'auteur décrit est d'une autre nature — une comptabilité de ce qui se passe
  > **pendant** le calcul. « Un 6 déjà apparu qu'on convertit en autre chose »,
  > « casser un 666 contigu déjà trouvé », « une moyenne qui nécessite un
  > arrondi », « une lettre arrachée au milieu d'un mot » : rien de tout cela
  > n'est lisible sur le dernier état. Il fallait instrumenter les états
  > **intermédiaires**, et c'est tout le travail de `src/recherche/elegance.js`.
  >
  > ### Ce qui est instrumenté
  >
  > `bilanChemin(chemin)` balaye `ops` et `etats` d'un chemin et en tire des
  > compteurs **entiers** ; `bilanApproche(approche, ctx)` les additionne sur les
  > parts et y ajoute ce qui ne se voit qu'à l'échelle de l'approche. En
  > substance :
  >
  > | ce qu'on compte | comment on le lit |
  > |---|---|
  > | le triptyque CONTIGU, et sa CASSE | dès qu'un état porte trois 6 d'affilée, le chemin doit s'arrêter sur un aboutissement légitime — un vecteur qui les porte encore, ou le nombre 666. Tout le reste a défait ce qui était écrit |
  > | la PRÉCOCITÉ du triptyque | le rang du dernier 6 du triptyque dans le vecteur final. Une conversion par table émet un aller-retour **par lettre** (§3.1) : ce rang dit à quelle conversion élémentaire le 666 est complet |
  > | un 6 CONVERTI en autre chose | la perte de 6 sur une agrégation (`6 + 6 = 12`) ou un remplacement terme à terme. Faire un 6 ou un 666 **de** ses 6 est exempté : c'est le but |
  > | des valeurs calculées puis JETÉES | le rétrécissement d'un vecteur (`m36`, `m0`) et le surplus que le verdict laisse tomber. Ce qu'une somme ABSORBE n'y entre pas — agréger n'est pas écarter |
  > | la nature des transformations | additions de chiffres (`prn`, `psc`, `prm`, `mrn`, et `cs` sur des chiffres) · additions de nombres (`cs` sur des nombres) · moyennes · min/max · chiffrements lettre → lettre |
  > | l'AMPLITUDE d'un arrondi | `c.moyenne` calcule `round(somme / n)` : l'écart au nombre juste vaut `min(r, n − r) / n`, exact et entier |
  > | les caractères ABANDONNÉS, en trois tas | lettre ou chiffre arraché au milieu d'un bloc dont on garde le reste · bloc entier écarté · bloc entier de **moins de trois lettres** · ponctuation |
  >
  > ★ **Les caractères abandonnés s'ALIGNENT, ils ne se comptent pas.** Un filtre
  > rend une sous-suite de son entrée : l'alignement dit exactement **lesquels**
  > tombent, et non seulement combien — c'est ce qui permet de distinguer « une
  > lettre arrachée au milieu d'un mot » d'« un bloc entier laissé de côté », qui
  > n'ont pas le même prix. Quand l'alignement échoue (une traduction change
  > tout), on le **dit** (`opaque`) au lieu de deviner, et la portée est créditée
  > entière : le compte devient un minorant déclaré, pas une invention.
  >
  > ★ **Le barème lit la GÉOMÉTRIE, jamais la présence d'un code.** `[6,6,6,4,4]`
  > gagne son bonus de contiguïté qu'on ait employé `m36` ou non. Même raison que
  > `deduireMode` : une URL rejouée doit retrouver exactement le score de la
  > ligne dont elle est issue (§4.3), et tout ce qui précède se **recalcule**
  > depuis les parts et leurs chemins. Un test le vérifie sur les quatre cas de
  > référence, bilan compris, champ par champ.
  >
  > ### Comment le crédit redescend sur le score
  >
  > ★ **L'ÉLÉGANCE NE PEUT QUE RETIRER, JAMAIS AJOUTER.** Le crédit est appliqué
  > en **facteur multiplicatif** borné à `[0,52 · 1,00]`. C'est la leçon, déjà
  > mesurée, de l'amendement « les trois rangs de conviction » : un bonus additif
  > se prélève sur la RÉSERVE (`PART_CRITERES`), et ouvrir 3 000 milli-unités de
  > réserve écrase la part des critères de 0,83 à 0,55 — les sept méthodes du
  > README tombent d'un tiers. Le facteur, lui, ne touche pas à l'échelle : il ne
  > fait que descendre ceux qui le méritent, et **aucune approche ne peut monter**.
  > Ce que l'élégance rapporte, elle le rapporte **ailleurs** — dans son propre
  > classement, qui lit le crédit brut (`approche.elegance`, publié à part).
  >
  > ⚠️ **MESURE qui a imposé le réglage de la longueur.** Le malus par
  > transformation valait d'abord 34 milli-unités. La méthode 6 du README —
  > l'AZERTY et le retournement du 9, quinze étapes rendues — tombait alors de
  > **60,6 à 40,1 sur 100**, c'est-à-dire **sous le plafond du joker** (45), que
  > le test d'étalonnage refuse à juste titre. Le défaut n'était pas dans la règle
  > mais dans le **doublon** : le critère de concision (`C = 0,88 ^ (L − 9)`,
  > poids 0,150) punissait déjà les quinze étapes, et l'élégance les punissait une
  > seconde fois. Ce que l'élégance ajoute à C n'est pas une seconde peine, c'est
  > la NUANCE que C ne sait pas dire — qu'une addition de chiffres **qui reboucle**
  > (`10 32 → 1 5 → 6`) ne compte presque pas. À 14, la méthode 6 revient à 59,2.
  >
  > **Les sept méthodes du README, avant et après** (sur `hope-hope-hope.fr`) :
  > M1 71,6 → 71,6 · M2 75,5 → 75,5 · M3 75,5 → 75,5 · M5 79,3 → 79,3 ·
  > M6 60,6 → **59,2** · M7 64,8 → 64,7. L'échelle du README est intacte.
  >
  > ### ★ Les TROIS classements — « ce n'est pas un tri unique »
  >
  > « 1ʳᵉ suggestion — l'élégance. 2ᵈ suggestion — le nombre de triptyques, au
  > prix d'une élégance éventuellement moindre, sans l'ignorer. 3ᵉ et suivantes —
  > un mixte pondéré des deux, comme aujourd'hui. » (l'auteur)
  >
  > C'est une **sélection à objectifs multiples**, pas un tri de plus. `index.js ›
  > selectionner` réserve la première place au champion de `ordreElegance`, la
  > seconde à celui de `ordreTriptyques`, et laisse le MMR (§4.8) garnir le reste
  > par `ordreTotal`, qui est le mixte.
  >
  > ★ **La seconde suggestion n'est retenue que si elle a QUELQUE CHOSE À DIRE** —
  > strictement plus de séries que la première. Sinon elle ne propose pas un autre
  > arbitrage, elle prend la place d'une ligne mieux notée. Mesuré sur trente-trois
  > saisies : elle ne se distingue de la première que cinq fois.
  >
  > ★ **Le MMR connaît la tête qu'on lui impose** (`amorce`) : les places
  > réservées entrent dans le quota par mappeur ET dans la pénalité de redondance,
  > sans figurer dans son résultat. La diversité de §4.8 n'est pas suspendue sur
  > les deux premières lignes, elle en tient compte.
  >
  > ⚠️ **DEUX TENSIONS TRANCHÉES, ET LES MESURES QUI LES ONT TRANCHÉES.**
  >
  > · **« Encore mieux » est ADDITIF, pas catégoriel.** « Si une stratégie
  >   élégante — sans malus autre que d'exclure des blocs entiers […] de moins de
  >   3 lettres — permet de tomber juste sur plusieurs triptyques de 666, c'est
  >   encore mieux. » Une première version en faisait une CATÉGORIE : toute
  >   stratégie pure à deux séries ou plus passait devant, avant même de comparer
  >   les crédits. **Mesuré, cette lecture casse un cas de référence.** Sur
  >   `https://hope-hope-hope.fr/`, « on ne garde que les lettres, une par une, en
  >   quatorze segments » appliqué au motif `hope-hope-hope` est pur au sens exact
  >   de la phrase — il n'écarte que la ponctuation, le protocole (gratuit) et le
  >   bloc `fr`, long de deux lettres — et il aligne **quatre** 666. Il passait
  >   donc devant la moisson à **six** séries, et la liste annonçait quatre séries
  >   là où six existaient. La phrase précédente de l'auteur dit pourtant que la
  >   règle ne s'applique pas là : « mieux vaut une méthode élégante […] qu'une
  >   méthode **peu élégante** qui donne davantage de 6 » — et cette moisson-là
  >   n'est pas peu élégante, c'est le crédit le plus haut de sa liste (2 233).
  >   « Encore mieux » se paie donc dans le CRÉDIT, où plusieurs triptyques
  >   rapportent et où la pureté vaut par tout ce qu'elle ne perd pas.
  >
  > · **Le rang des SÉRIES et le rang SIMPLE sont mis à égalité — dans
  >   `ordreElegance`, et seulement là.** « Mieux vaut une méthode élégante qui
  >   donne pile 666 qu'une méthode peu élégante qui donne davantage de 6 » dit
  >   exactement que, dans CE classement, un 666 unique a le droit de passer devant
  >   une moisson. Les maintenir séparés rendait la première suggestion identique
  >   à la seconde partout où une moisson existe — mesuré sur trente-trois
  >   saisies : la seconde ne se distinguait **jamais**, c'est-à-dire qu'elle était
  >   du code mort. **La CONVERGENCE, elle, reste en dernier** : elle est classée
  >   dernière pour une raison que ce barème ne sait pas mesurer — « les mêmes
  >   caractères y servent trois fois » —, et lui laisser la tête au nom d'une
  >   élégance qui ignore précisément son défaut serait mesurer à côté.
  >
  > ### Les trois paliers qui dormaient — et les trois FICELLES qui les réveillent
  >
  > Trois demandes de l'auteur n'avaient **aucun opérateur à mesurer** : leurs
  > paliers étaient écrits, à leur place dans la hiérarchie, et leurs compteurs
  > valaient toujours zéro. L'auteur a tranché : « je me doute — ma demande c'est
  > **aussi de les ajouter au catalogue**, mais avec un score bas, mais moins bas
  > que la suppression arbitraire de ce qui n'est pas 6. » Voir §4.1, amendement
  > « les trois ficelles ».
  >
  > | la demande | l'opérateur | le palier |
  > |---|---|---|
  > | « ne garder artificiellement que les 6 » | *aucun* — c'est l'étape de tri du scénario, sans code ; elle se lit sur la géométrie | `VALEUR_JETEE` |
  > | « le plus fréquent l'emporte » | **`mpf`** `m.plusFrequent` | `MAJORITE` |
  > | « garder un caractère sur deux » | **`m1s2`** `m.unRangSurDeux` | `DECIMATION` |
  > | « l'addition SÉLECTIVE de chiffres contigus » (`6, 5+1, 6, 8`) | **`mad`** `m.additionSelective` | `ADDITION_SELECTIVE` |
  >
  > ★ **L'unité des trois paliers est celle de `VALEUR_JETEE`** : ce que le geste
  > coûte **par valeur écartée** — par **chiffre absorbé** pour l'addition
  > sélective, qui n'écarte rien. Et ce tarif **remplace** `VALEUR_JETEE` pour ces
  > valeurs-là : il ne s'y ajoute pas. Les compter aux deux endroits punirait deux
  > fois le même geste, exactement comme `SIX_DETRUIT` exclut déjà le
  > rétrécissement d'un vecteur.
  >
  > ⚠️ **Le tarif est plus ÉLEVÉ que `VALEUR_JETEE`, et ce n'est pas une
  > contradiction — c'est ce qui rend la consigne vraie.** « Moins bas que la
  > suppression arbitraire » porte sur le **SCORE**, pas sur une ligne du barème :
  > les deux gestes n'achètent pas la même chose. Le tri arbitraire laisse les 6
  > dispersés et ne gagne rien ; la ficelle **rassemble**, et encaisse
  > `TRIPTYQUE_CONTIGU` (260), le couronnement (≤ 150) et le solde multiple de
  > trois (90). **Mesuré** : à 32 / 24 / 16 par valeur — c'est-à-dire *sous*
  > `VALEUR_JETEE` —, `Macron` perdait sa voie de référence au profit de
  > `tca+mt9+mpf` et `Donald Trump` perdait la sienne entièrement. **Trois des
  > quatre cas de référence tombaient.** Les tarifs retenus (180 / 130 / 100)
  > laissent le solde **juste positif** face au tri arbitraire et franchement
  > négatif face à une voie qui atteint le même 666 sans ficelle. Deux tests le
  > gèlent : l'un sur le solde, l'autre sur les quatre cas de référence.
  >
  > ★ **`adHoc` ne double pas le barème.** `critereAntiAdHoc` mesure une chose
  > GÉNÉRIQUE — « cette méthode est-elle taillée pour la cible ? » — sur le score
  > de conviction ; le barème d'élégance mesure une chose SPÉCIFIQUE — « qu'a-t-on
  > fait, exactement, pendant le calcul ? » — sur le chemin. Les deux se
  > composent, comme ils le font déjà pour `mr9` (adHoc 0,35, aucun palier) et pour
  > `c.moyenne` (adHoc bas, palier `ARRONDI`).
  >
  > ### Le compte des triptyques — par 666, plus par portée
  >
  > ⚠️ **DÉFAUT MESURÉ.** `TRIPTYQUE_CONTIGU` se comptait **par portée** qui porte
  > un triptyque, jamais par triptyque. Sur `hope-hope-hope.fr`, `fl+tca+m14` rend
  > douze 6 d'affilée — **quatre 666** — et n'en touchait qu'un, comme une portée
  > qui n'en écrit qu'un seul. « Plus tu produis de 6, mieux c'est » se trouvait
  > démenti à l'endroit exact où le vecteur en produit le plus.
  >
  > Le compte est réparé (`nbTriptyques`, ⌊L/3⌋ par suite contiguë). Reste ce que
  > vaut le deuxième :
  >
  > · le **premier** 666 d'une portée est une **trouvaille** — cette portion-là de
  >   la saisie, lue de cette façon-là, écrit 666. Trois portées qui en écrivent
  >   chacun un, ce sont trois trouvailles ;
  > · les **suivants du même vecteur** sont la même trouvaille qui continue. Ils
  >   ne coûtent rien de plus à obtenir, ne disent rien de plus de la saisie, et
  >   leur abondance est **déjà payée** par `SIX_SURNUMERAIRE`.
  >
  > D'où `TRIPTYQUE_REPETE = 90`, un tiers du tarif plein. **Mesuré** : au tarif
  > plein, `fl+tca+m14` passait de 1 576 à 2 419 et doublait la moisson à cinq
  > séries (2 293) — `hope-hope-hope.fr` perdait sa voie de référence. Au tiers,
  > elle passe à **1 846** : le compte juste se voit, et la moisson qui lit toute
  > la saisie garde la tête. Le total crédité est en outre **plafonné au nombre de
  > séries du verdict** : on ne crédite pas un 666 que personne ne verra.
  >
  > ### ⚠️ Le gaspillage n'a PAS été alourdi — le remède prescrit, et les trois mesures qui l'ont fait renoncer
  >
  > Le remède prévu pour le débordement ci-dessus était **d'alourdir
  > `VALEUR_JETEE`** — l'échelle des abandons monte d'un facteur trois à chaque
  > barreau (ponctuation 1 → bloc court 2 → bloc entier 8 → lettre arrachée 26)
  > et `VALEUR_JETEE`, à 36, n'en respecte pas le pas ; la règle voudrait 78. Il
  > a été implémenté, puis retiré. Voici pourquoi, en chiffres.
  >
  > ★ **D'abord, une lecture à rectifier.** Sur `hope-hope-hope.fr`, **deux
  > approches distinctes portent les mêmes codes `fl+tca+m14`**, sur deux portées
  > différentes — et le banc n'affiche que les codes :
  >
  > | portée | vecteur | bilan |
  > |---|---|---|
  > | la saisie **entière** | `[6×12, 5, 7]` | `valeursJetees = 2` |
  > | le **motif répété** `hope-hope-hope` | `[6×12]` | **PURE**, `valeursJetees = 0` |
  >
  > Une fois le compte des triptyques réparé, c'est la **seconde** qui prend la
  > tête (2 419) — celle qui ne jette rien. Le levier du gaspillage n'a donc
  > **aucune prise sur le cas qui le motivait** : balayage `VALEUR_JETEE` porté à
  > 78, 150, 300 puis **600**, la tête reste `fl+tca+m14` à 2 419 aux cinq valeurs,
  > sans bouger d'une milli-unité.
  >
  > ★ **Ensuite, il écrase la MOISSON**, qui est le mode mis en tête. Une moisson
  > récolte sur plusieurs portées et laisse donc, par construction, du surplus
  > derrière elle (`jeteesAuTri`). Mesuré sur les dix-neuf saisies :
  >
  > | `VALEUR_JETEE` | têtes changées / 19 | dont perdant des séries |
  > |---|---|---|
  > | 45 | 2 | 1 (`Le chat dort…` 5×666 → 1×666) |
  > | 55 | 3 | 2 (+ `Éléonore à Nîmes` 3 → 2) |
  > | 78 | **5** | **4** (+ `example.com` 5 → 1, `jean-michel` 2 → 1) |
  >
  > ★ **Enfin — et c'est le retournement décisif — il promeut MÉCANIQUEMENT les
  > ficelles.** `mpf`, `m1s2` et `mad` ne paient pas ce poste : leur palier le
  > remplace. Plus le gaspillage coûte cher, plus la ruse qui l'escamote devient
  > rentable. Mesuré sur `Le chat dort sur le tapis rouge`, pour **neuf**
  > milli-unités d'écart :
  >
  > ```
  >   à 36 → 1. moisson 5×666 (1 129)   · la ficelle n'est pas dans les trois
  >   à 45 → 1. fr13+tca+m14+mpf 1×666 (1 102) · la moisson tombe à 1 057
  > ```
  >
  > Alourdir le gaspillage, c'est payer la ficelle pour cacher le gaspillage.
  > Le réglage **reste à 36**, l'irrégularité de l'échelle est assumée, et
  > `hope-hope-hope.fr` est arbitré par `TRIPTYQUE_REPETE`.
  >
  > ★ **Ce que l'alourdissement aurait réellement « payé ».** `facteur()` borne le
  > crédit à [`FACTEUR_PLANCHER`, 1 000] : au-dessus de 1 000, l'élégance est
  > **neutre** sur le score de conviction. Sur le corpus, 36 → 78 déplace **109
  > crédits mais seulement 70 scores** — le tiers restant est absorbé par ce
  > plafond. Le reste se **compose multiplicativement** avec `rendementSix`, qui
  > mesure déjà la PROPORTION du vecteur valant 6 (`hopehopehopefr` en quatorze
  > segments : 12/14 → ×0,92). Les deux mesures sont **complémentaires** — `R` en
  > proportion sur le vecteur final, `VALEUR_JETEE` en valeur absolue, et voyant
  > en plus les rétrécissements de milieu de chemin que `R` ne voit pas — mais
  > elles se multiplient : doubler la seconde ne double pas la peine, elle la
  > compose.
  >
  > ### L'arbitrage qui reste ouvert
  >
  > Ce qui sépare réellement les deux voies de `hope-hope-hope.fr` n'est pas le
  > gaspillage : le groupement écrit **quatre** 666 tous contigus sur une seule
  > portée ; la moisson en délivre **cinq**, dont trois seulement sont contigus —
  > **les deux autres sont assemblés à partir de 6 pris sur des portées
  > différentes, et le barème ne les crédite pas du tout**. Au tarif plein, la
  > contiguïté l'emporte donc sur la quantité, et la liste annonce quatre séries
  > là où cinq existent.
  >
  > Deux réglages referment cet écart. Le premier est retenu
  > (`TRIPTYQUE_REPETE`). Le second — **créditer les séries ASSEMBLÉES**, au-delà
  > de **64** milli-unités par série, la moisson repasse devant — serait plus
  > fidèle à la règle de tête de l'auteur (« privilégie celle qui donne le plus de
  > séries de 666 sans réutiliser les mêmes caractères »), mais c'est un bonus qui
  > touche **toutes** les approches, y compris celles à une seule série, et il
  > demande son propre étalonnage. Il n'a pas été pris de but en blanc.
  >
  > ### L'étalonnage, et son banc
  >
  > `.planning/banc/classement.mjs` affiche le classement d'un corpus, avec ou
  > sans le barème (`--avant`), le détail des critères (`--detail`) ;
  > `.planning/banc/elegance.mjs` affiche le crédit **poste par poste** d'une
  > saisie. Les deux neutralisent le filet temporel (§4.4-4). Le total du crédit
  > **EST** la somme de son détail (`detailDuCredit`), et un test le vérifie : une
  > fonction qui calcule et une autre qui explique finiraient par diverger.
  >
  > **Mesuré sur dix-neuf saisies (171 lignes)** : **69 lignes déplacées, 3 têtes
  > de liste changées sur 19**, deux entrantes et deux sortantes au total.
  > Les **quatre cas de référence de l'auteur sont intacts** — `hope-hope-hope.fr`
  > mène cinq séries, `https://hope-hope-hope.fr/` six, `Donald Trump` la moisson
  > « Donald en quatorze segments + Trump en César puis quatorze segments »,
  > `Macron` la voie César qui montre son 666 déjà écrit — et un test les gèle,
  > en exigeant en outre que ce soit **l'élégance** qui les mette là.
  > Les trois têtes qui changent : `https://www.example.com/path/to/page` (même
  > compte de cinq séries, voie plus élégante), `reinfocovid` et `Marie Curie`
  > (première suggestion à une série, seconde suggestion à deux, juste dessous).
  >
  > ★ **Ce que ce barème ne remplace pas.** Les six critères, le rendement, les
  > quatre malus constants et les trois rangs de conviction sont **intacts**. Le
  > barème d'élégance s'y ajoute, en dernier, et se débranche d'une option
  > (`creerMoteur(catalogue, { elegance: false })`) **sans débrancher la mesure** :
  > `approche.bilan` et `approche.elegance` restent publiés, ce qui permet au banc
  > de comparer l'avant et l'après d'une seule exécution plutôt que de comparer un
  > souvenir.

  > *Amendement du 27 août 2026 — LA DILUTION DES TRICHES D'ADDITION, et le
  > sommet de l'échelle.* Deux précisions de l'auteur, deux paliers, une
  > formule.
  >
  > **1. « Le malus de triche se dilue avec le nombre d'additions d'affilée. »**
  >
  > > « Pour les additions sélectives comme triche : le malus de triche devrait
  > > être dilué avec le nombre d'additions d'affilée. Plus il y en a, moins la
  > > triche se verra, et plus la triche est éloignée de la première et de la
  > > dernière addition d'affilée, plus le fait d'en ajouter une ou d'en retirer
  > > une, ou de découper les chiffres des nombres différemment, passera
  > > inaperçu et donc avec une bien moindre pénalité (qui devient presque
  > > négligeable pour l'exemple que je t'ai donné, vu le nombre d'additions). »
  >
  > C'est une règle de MESURE, et elle est juste : **une triche se paie à
  > hauteur de ce qu'elle se voit.** La forme retenue (`elegance.js › dilution`),
  > pour `N` additions jouées à la suite et l'addition de rang `j` :
  >
  > ```
  > bord(j) = min(j, N − 1 − j)
  > poids(j) = max(1, ⌊ 1000 × chiffres absorbés(j) ÷ (N × (1 + 2 × bord(j))) ⌋)
  > ```
  >
  > exprimé en **millièmes d'un chiffre absorbé**, arithmétique entière de bout
  > en bout (§4.4). Pour des additions absorbant chacune un chiffre : `N = 1` →
  > 1 000 (la peine PLEINE, donc non-régression exacte sur `6, 5+1, 6, 8`) ·
  > `N = 3` → 777 · `N = 5` → 572 · `N = 8` → 416. La série ENTIÈRE coûte au pire
  > ce que coûterait une triche isolée, et de moins en moins ensuite.
  >
  > ★ **Jamais nul** — `max(1, …)` par addition, et la ligne de crédit plancher à
  > une milli-unité dès que le compteur bouge. Une triche diluée reste une
  > triche : sans ce plancher, un chemin assez long deviendrait gratuitement
  > malhonnête.
  >
  > ★ **« D'affilée » se lit sur le GESTE.** Dans l'exemple de l'auteur, les
  > paquets alternent additions et chiffres laissés seuls (`… 9 · 6 · 1+1+4 …`),
  > et il les compte pourtant comme une seule série (« vu le nombre
  > d'additions ») : elles sont jouées l'une après l'autre dans le même
  > mouvement, sous les mêmes accolades.
  >
  > ★ **Ce sont les OPÉRATEURS qui déclarent leurs additions**, par un champ
  > optionnel `additions(valeur)` du descripteur (§2.2) : les états d'entrée et
  > de sortie disent combien de chiffres ont disparu, jamais en combien de
  > gestes. Un opérateur qui ne le porte pas retombe sur le compte brut, c'est-à-
  > dire sur la peine pleine — l'absence d'information coûte cher, elle ne
  > blanchit rien.
  >
  > **Mesuré**, sur l'exemple de l'auteur (32 chiffres, sept additions) : la
  > dilution ramène le poids de 21 000 millièmes à **1 223**, soit 550
  > milli-unités au tarif retenu (`REDECOUPAGE = 450`) — un dix-huitième du prix
  > plein, pour une triche qui rapporte deux 666.
  >
  > **2. « L'effacement sans motif est probablement la pire des triches. »**
  >
  > > « L'effacement est une étape à part, et s'il n'a pas de motif (chiffre
  > > minoritaire, pair/impair) c'est probablement la pire des triches, à
  > > pénaliser en conséquence. »
  >
  > Un MOTIF, c'est ce qui permet de dire pourquoi ceux-là et pas les autres :
  > être minoritaire (`mpf`), occuper un rang pair ou impair (`m1s2`). Ce sont des
  > règles qu'on énonce, qu'on affiche sous l'accolade, et que le spectateur peut
  > vérifier. Effacer parce que ça arrange, sans rien pouvoir en dire, est le
  > sommet de l'échelle : `EFFACEMENT_SANS_MOTIF`, **au-dessus de tous les autres
  > paliers de triche**.
  >
  > ⚠️ **Le compteur existe et vaut zéro** : aucun opérateur du catalogue
  > n'efface sans motif. Il attend la scission du geste de `m36`, qui couronne ET
  > tronque en un seul mouvement. Pour le brancher, il suffit d'inscrire
  > l'identifiant de l'opérateur en face de `'effacementSansMotif'` dans
  > `FICELLES` : le décompte, la ligne de crédit, l'exemption de `valeursJetees`
  > et la lecture du vecteur le plus large par le rendement suivent d'eux-mêmes.
  > Son tarif est, jusque-là, une **prédiction non mesurée** — il ne PEUT pas
  > l'être tant qu'aucun classement ne bouge quand on le fait varier.
  >
  > ⚠️ **`VALEUR_JETEE` (36) n'est pas touché**, et ce n'est pas un oubli : ce
  > poste-là mesure le tri du VERDICT, qui n'est pas un opérateur, ne figure dans
  > aucune URL, et dont trois mesures écrites dans `elegance.js` expliquent
  > pourquoi l'alourdir écrase la moisson et promeut les ficelles.
  >
  > **3. Deux effets de bord, réglés dans le même mouvement.**
  >
  > · **Le rendement ne compte plus au dénominateur ce qu'une triche ABSORBE.**
  >   `score.js › rendementSix` lisait le vecteur le plus large du chemin pour
  >   toute ficelle ; c'est juste pour celles qui ÉCARTENT (les noter sur ce
  >   qu'il reste les récompenserait d'avoir jeté davantage), et faux pour celles
  >   qui absorbent — leur ligne de chiffres momentanément élargie est le calcul
  >   MONTRÉ, pas du déchet. D'où `elegance.js › FICELLES_QUI_ECARTENT`. Mesuré :
  >   `fl+tca+m14+mrd` affichait un rendement de 789 pour une scène qui garde
  >   quinze jetons et n'en jette que deux (≈ 882).
  >
  > · **Aucune ficelle en 2ᵈ SUGGESTION.** Cette place-là ne récompense qu'une
  >   chose, le NOMBRE de séries. Une ficelle n'en donne pas davantage, elle en
  >   FABRIQUE. C'est la même règle que §4.1 pose déjà pour la MOISSON, appliquée
  >   à l'autre endroit où la quantité est mise en avant pour elle-même. Mesuré
  >   sur « Millicent » : `fr13+tca+mx6+mrd` (trois séries, élégance 1 278) prenait la
  >   seconde place au-dessus de `fr13+tca+mx6+mrn` (deux séries, élégance 1 310), et
  >   la liste affichait un compte de séries qui REMONTE — ce qu'un test de
  >   classement interdit depuis toujours.
  >
  > **Mesuré sur le corpus de dix-neuf saisies**, quatre opérateurs neufs et deux
  > paliers compris : **une seule tête de liste change**
  > (`https://www.example.com/path/to/page` — même compte de cinq séries, voie
  > plus élégante : 1 516 contre 1 390), et les **quatre cas de référence de
  > l'auteur sont intacts**.

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

> *Amendement — LE TITRE NE DIT PAS LE RÉSULTAT, ET IL NE LE DIT NULLE PART DEUX FOIS.*
>
> **Le constat de l'auteur**, sur les titres de voies : « n'indique pas le résultat
> dedans — pas de "les 6 groupés par trois" ni de "deux séries de 666" ». Et, sur la
> description affichée en tête de la page d'animation : « cette description ne doit
> être affichée que dans le listing de voies. Sur les pages d'animation d'une voie,
> ce serait du spoiler ou de la redite ».
>
> Les deux reproches n'en font qu'un, et il porte sur le MOMENT de la lecture. Le
> listing sert à CHOISIR : on n'y a encore rien vu, tout ce qui aide à trancher y a
> sa place. La page d'animation sert à MONTRER : ce qu'on y annonce d'avance, la
> démonstration ne peut plus le révéler. Une même information est donc précieuse dans
> l'une et nuisible dans l'autre — la règle n'est pas « en dire moins », c'est **en
> dire chaque chose là où elle se paie**.
>
> **Trois décisions, qui en découlent toutes les trois.**
>
> 1. **Le titre est une locution PRÉPOSITIONNELLE, sans mention d'assemblage.**
>    « Par gématrie anglaise sur les consonnes », « En quatorze segments », « En
>    spacialisation AZERTY ». Le nom de la vedette prend une préposition choisie par
>    FAMILLE (« Par » un barème, « En » une écriture, « Sur » un support, « En
>    comptant » pour les mesures, rien pour les découpes déjà adverbiales) ; la
>    précision distinctive s'y soude par une ESPACE parce qu'elle complète la
>    locution ; le qualifiant s'ajoute après une VIRGULE parce qu'il ouvre un second
>    membre. Plus de tiret cadratin — il annonçait une glose, et une glose invite à
>    énumérer. Tables et règle d'assemblage : `src/recherche/titres.js`.
>
> 2. **Le compte de séries remonte dans le LISTING, et n'en redescend jamais.**
>    Il s'affiche en « n × 666 » à cheval sur le bord DROIT du panneau — le pendant
>    exact du numéro de rang à gauche — et **seulement quand n > 1** : « 1 × 666 »
>    n'apprend rien, puisque toute voie mène à 666. Le badge est un dessin
>    (`aria-hidden`), doublé d'une phrase pleine dans un `.visuellement-cachee` —
>    « cinq séries de 666 » — pour qui l'écoute. `src/app/pages/resultat.js`.
>
> 3. **La suite des règles ne s'affiche plus sur la page d'animation.**
>    Elle reste dans le listing (`.voie__resume`), où elle sert à choisir sans ouvrir.
>    Sur la page d'animation, elle était soit du spoiler — la scène montre chaque
>    opération à son tour — soit de la redite du Registre, qui l'écrit étape par étape
>    et AU MOMENT où elle se produit. La donnée, elle, continue de voyager : le
>    scénario la porte dans `methode.rule`, et le `<title>` garde le titre.
>    `.demo__regle` n'existe plus.
>
> **Ce que ça met sous tension, et qui est mesuré.** Les titres ayant raccourci, la
> mention d'assemblage ne distingue plus gratuitement deux voies homonymes : c'est
> `distinguerTitres` qui porte seul l'unicité, avec un palier de plus dans son échelle
> de recours (la PORTÉE — sur combien de morceaux la méthode travaille, et à défaut
> où ils commencent). Trois invariants sont gelés par `src/recherche/tests/titres.test.js` :
> aucun titre ne contient le vocabulaire du verdict, aucun ne porte de tiret cadratin
> ni d'article défini initial, et aucun ne retombe sur une suite de codes d'URL.
> Les tables sont en outre vérifiées EXHAUSTIVES contre le catalogue : un opérateur
> ajouté sans forme courte fait échouer la suite plutôt que d'entrer dans un titre
> sous sa phrase de Registre.
>
> **Survol du listing.** Une carte porte DEUX accès (sobre / scénique) : l'éclairer en
> entier au survol dit « ceci est un bouton », ce qui est faux depuis qu'elle a deux
> destinations. Le survol fait donc courir un **balayage lumineux DANS les deux
> boutons**, décalé de 180 ms de l'un à l'autre — technique reprise de `g1vote`
> (`VotesListView.vue`, `shimmer-border` sur les votes en cours) : un dégradé bien plus
> large que l'élément dont on anime la `background-position`, et non l'élément
> lui-même. La lueur emprunte `currentColor`, donc elle suit les deux thèmes et la
> distinction sobre/scénique sans qu'aucune valeur soit écrite deux fois. Sous
> `prefers-reduced-motion`, les deux accès s'éclairent d'un coup, sans course :
> l'information passe, le mouvement non. Seul le panneau de repli — une seule
> destination — garde l'ancien survol de carte.

---

## 7. Ce qui reste à valider après implémentation

1. **Pondérations du score** — test à l'aveugle sur ~20 saisies.

   > *Fait, pour le barème d'ÉLÉGANCE.* `.planning/banc/` mesure un corpus de
   > dix-neuf saisies, avant et après, avec le détail poste par poste. Les six
   > pondérations d'origine, elles, restent une prédiction : ce banc les affiche
   > mais ne les a pas déplacées.
2. **Tables hébraïque et grecque** — non recoupées sur sources externes
   (`research/moteur-arithmetique.md §9.8`). À vérifier avant publication : ce sont les
   méthodes les plus « sourçables », donc les plus exposées à la critique.
3. **Cross-navigateur** — le prototype WAAPI n'a tourné que sous Chrome. À revalider
   sous Firefox et Safari : arrondi de `currentTime`, `persist()`, `transform-box:
   fill-box` sur `<text>`, gel des animations en onglet caché.

   > *Fait, pour Firefox 154 (Linux).* Une lecture entière a été filmée et
   > analysée au pixel, plus un balayage DOM image par image. `persist()` et le
   > scrubbing sont corrects. **Deux** écarts ont été trouvés, tous deux corrigés
   > par la chaîne de position (§3.2, amendement aux règles 3 et 4) : la **perte
   > des propriétés individuelles de transformation à la composition**, et le
   > calcul de `transform-box: fill-box` sur un `<g>` conteneur, qui diverge de
   > Chromium dès qu'une transformation est posée sur son contenu. Trois constats
   > de méthode à garder : (a) les animations et `rAF` sont **entièrement
   > suspendus** quand la fenêtre n'est pas visible — une mesure sur fenêtre
   > couverte ne mesure rien ; (b) le défaut étant purement pictural, aucune
   > instrumentation DOM ne pouvait l'atteindre ; (c) une mesure faite **sans
   > accélération matérielle** (`Xephyr`, `Xvfb`, headless) ne reproduit pas le
   > défaut et ne valide donc aucun correctif — il faut un bureau réel.
   > **Safari reste à faire.**
4. **Patrons ARIA du lecteur** — l'APG WAI-ARIA ne publie pas de patron « media player ».
   Test réel NVDA/VoiceOver recommandé.
5. **Le rendement doit-il regarder le vecteur LE PLUS LARGE du chemin, ou le
   dernier ?** — *décision d'auteur, laissée ouverte.*

   `rendementSix` lit l'état FINAL de chaque part. Tant qu'aucun opérateur ne
   rétrécissait un vecteur, les deux lectures coïncidaient. `m36` (« trois 6
   d'affilée ») en rétrécit un : `[6,6,6,7,3,6]` devient `[6,6,6]`, donc « trois
   6 sur trois valeurs » alors que **six ont été calculées et que la scène en
   montre trois s'effacer**. Le rendement, qui existe pour punir exactement
   cela, ne le voit plus.

   La contiguïté ne rachète pas ce point. Elle dit que le 666 n'a pas été
   *assemblé* ; elle ne dit rien du 7, du 3 et du sixième 6, calculés puis
   écartés. Ce sont deux mérites distincts : « tu n'as pas trié » — que les
   cornes gagnent, et qu'aucun critère ne mesure — et « tu n'as pas gaspillé » —
   que le rendement mesure, et que les cornes ne gagnent pas.

   **Mesuré**, en faisant lire au rendement le vecteur le plus large :
   `Donald Trump` garde le même rang 1 (`tca+m14+m36,fr13+tca+m14+m36`, deux séries),
   mais tombe de **6 475 à 4 778** (R : 1 000 → 545) ; `hope-hope-hope.fr`
   passe de 4 251 à 4 110 (R : 1 000 → 937) ; `https://hope-hope-hope.fr/` de
   3 736 à 3 645 ; `hope` reprend la tête avec `tca+m14` plutôt que `tca+m14+m36`,
   les deux tombant à R = 750. **La demande de l'auteur ne dépend donc pas de
   cet aveuglement** — seule la valeur du score en dépend. Le changement n'a pas
   été fait : c'est un arbitrage de score, et il appartient à l'auteur.

   > *Amendement — la question reste ouverte, mais le DÉFAUT est désormais
   > mesuré ailleurs.* Ce § oppose deux mérites : « tu n'as pas trié » — que les
   > cornes gagnent, et qu'aucun critère ne mesurait — et « tu n'as pas
   > gaspillé » — que le rendement mesure, et que les cornes ne gagnent pas.
   >
   > Le barème d'élégance (§5, amendement « l'élégance se mesure sur le chemin »)
   > mesure **les deux**, et séparément : `TRIPTYQUE_CONTIGU` crédite le premier,
   > `VALEUR_JETEE` débite le second, et le rétrécissement d'un vecteur par `m36`
   > y compte pour ce qu'il est. Sur `Donald Trump`, le bilan de la voie de
   > référence porte noir sur blanc « valeurs calculées puis jetées ×5 » : les
   > trois valeurs que `Donald` écarte et les deux que `Trump` écarte. Le
   > gaspillage est donc **vu**, et il est payé.
   >
   > **La mesure ci-dessus a été rejouée par-dessus le nouveau barème**, et elle
   > donne les mêmes nombres, aux mêmes rangs : 6 475 → 4 778, 4 251 → 4 110,
   > 3 736 → 3 645, aucun rang 1 déplacé. L'arbitrage n'a donc pas changé de
   > nature — mais son enjeu a baissé : appliquer la lecture « vecteur le plus
   > large » ferait désormais payer **deux fois** le même gaspillage, une fois
   > dans `R` et une fois dans le crédit d'élégance. C'est la seule chose neuve à
   > mettre dans la balance ; la décision reste celle de l'auteur.

6. **Poids réel des polices** après sous-réglage (budget cible ≤ 260 Ko).
   Servi aujourd'hui : Jost\* 50 396 o + JetBrains Mono 15 064 o + DSEG7 948 o
   + DSEG14 1 304 o = **67 712 octets** de woff2, soit ~90 Ko une fois inlinés
   en base64 dans le CSS (le build les inline, voir §0.1). Les deux afficheurs
   pèsent ensemble **2 252 octets** : 3,3 % du budget consommé, et 0,9 % de la
   cible.
