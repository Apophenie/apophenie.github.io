# Moteur visuel — recherche & architecture

Projet : **NumHeroLOLgeek**. Rôle du moteur visuel : jouer, de façon *limpide et
convaincante*, la chaîne de transformations qui mène d'une saisie utilisateur à `666`,
avec des contrôles Début / Précédent / Play-Pause / Suivant dont la sémantique est
définie par le README (§ Page de démonstration).

Contrainte de stack (décidée hors de ce document, appliquée ici) :
**vanilla JS, zéro build, aucune dépendance npm ni runtime.**
Les bibliothèques (anime.js, Motion One, GSAP) sont donc hors jeu ; le comparatif reste
documenté ci-dessous pour tracer le *pourquoi*.

Statut : recherche + conception. Un prototype jetable valide la technique retenue :
`.planning/research/proto/waapi-scrub.html` (testé sous Chrome 146).

---

## 1. Choix technologique

### 1.1 Ce que le cas d'usage exige

| Exigence | Détail |
|---|---|
| **Scrubbing** | aller à un instant `t` arbitraire, instantanément, sans rejouer |
| **Idempotence** | `seek(t)` doit donner *exactement* le même rendu quel que soit le chemin parcouru pour y arriver |
| **Pause/reprise** | sans dérive entre les sous-animations |
| **Saut à une frontière de segment** | navigation par "step", pas par frame |
| **Lecture inverse (option)** | pour un "précédent" animé plutôt qu'un saut sec |
| **Déterminisme total** | l'URL partageable (`#approche#b58`) doit reproduire le même rendu |
| **Texte/nombres SVG** | tokens de texte mesurés, déplacés, substitués |
| **Zéro dépendance** | vanilla, zéro build |

### 1.2 Comparatif

#### SMIL (`<animate>`, `<animateTransform>`, `<set>`)

- **Support** : présent partout sauf IE et Opera Mini. La dépréciation annoncée dans
  Chrome 45 a été **suspendue le 2016-08-17** et n'a jamais été appliquée ; l'usage
  est même en croissance
  ([Intent to deprecate: SMIL](https://groups.google.com/a/chromium.org/g/blink-dev/c/5o0yiO440LM/m/YGEJBsjUAwAJ),
  [caniuse#4167](https://github.com/Fyrd/caniuse/issues/4167),
  [CSS-Tricks, SMIL on!](https://css-tricks.com/smil-on/)).
- **Points forts** : le seul modèle *déclaratif* qui offre nativement un
  séquencement (`begin="autre.end"`), une timeline SVG globale
  (`svgRoot.setCurrentTime()`, `pauseAnimations()`, `unpauseAnimations()`), et qui
  anime les attributs SVG que CSS n'expose pas.
- **Rédhibitoire ici** :
  - `SVGSVGElement.setCurrentTime()` est un scrubbing *global du document SVG*, à la
    granularité de la seconde flottante, et son comportement en arrière (revenir de
    t=5 à t=1) est historiquement bogué/inégal entre moteurs (Firefox vs Blink).
  - Pas de `playbackRate` négatif → pas de lecture inverse.
  - Pas d'introspection : impossible de savoir proprement "où en est" une animation
    pour piloter l'UI (état des boutons, numéro de step).
  - Non accéléré matériellement, coûteux sur mobile avec beaucoup d'éléments.
  - Le contenu doit être écrit dans le DOM SVG : mal adapté à une timeline *générée*
    dynamiquement à partir d'un objet JS produit par le moteur arithmétique.
- **Verdict** : à réserver éventuellement à des micro-assets décoratifs autonomes
  (ex. le logo animé de la page d'accueil). Pas pour le moteur de démonstration.

#### Animations CSS (`@keyframes` + `animation-*`)

- **Support** : universel, accéléré, robuste.
- **Scrubbing** : possible via `animation-delay` négatif + `animation-play-state: paused`
  (hack `animation-delay: -1200ms`) — ça marche, mais c'est du pilotage par
  *chaîne de caractères CSS*, non introspectable, et il faut réécrire des règles
  ou des variables custom à chaque frame. La précision et la synchro entre N
  éléments deviennent invérifiables.
- **Génération dynamique** : il faudrait fabriquer des `@keyframes` à la volée
  (`CSSStyleSheet.insertRule`) pour chaque token de chaque step. Ingérable.
- **Verdict** : gardé pour ce qui est *statique et transversal* (transitions d'UI,
  variantes `prefers-reduced-motion`, styles de base), pas pour la timeline.

#### Web Animations API (WAAPI) — **retenu**

- **Support** : `Baseline: Widely available`, disponible cross-browser **depuis
  mars 2020** ; caniuse donne **96,2 %** d'usage global (Chrome/Edge 84+, Firefox 75+,
  Safari 13.1+)
  ([MDN Animation](https://developer.mozilla.org/en-US/docs/Web/API/Animation),
  [caniuse web-animation](https://caniuse.com/web-animation)).
- **`Animation.currentTime`** est en lecture **et écriture**, "whether running or
  paused" → c'est littéralement l'API de scrubbing demandée
  ([MDN currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime)).
- **`playbackRate` négatif** → lecture inverse native. `updatePlaybackRate()`
  resynchronise la position avant de changer la vitesse.
- **Introspection complète** : `playState`, `pending`, `finished`/`ready` (promesses),
  `overallProgress`, `effect.getComputedTiming()` → l'UI peut être un pur reflet de
  l'état du moteur.
- **`GroupEffect` / `SequenceEffect` : N'EXISTENT PAS.** Vérifié : retirés de
  Web Animations Level 1, repoussés à Level 2, **implémentés dans aucun navigateur** ;
  MDN indique explicitement que le seul effet constructible aujourd'hui est
  `KeyframeEffect`. Il n'existe qu'un explainer Chromium
  ([GroupEffect explainer](https://yi-gu.github.io/group_effect/)) et le polyfill
  `web-animations-next`, **archivé/non maintenu**
  ([googlearchive/web-animations-utils](https://github.com/googlearchive/web-animations-utils)).
  **Il faut donc composer le groupe soi-même** — c'est l'objet du § 1.3.
- **Limite réelle** : WAAPI n'anime que ce qui est une **propriété CSS**. Pour SVG
  cela couvre `transform`, `opacity`, `fill`, `stroke`, `stroke-dasharray`,
  `stroke-dashoffset`, `font-size`, et les *geometry properties* `cx cy r rx ry x y
  width height` (Baseline widely available depuis juillet 2020 —
  [MDN cx](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cx)).
  En revanche `d` **n'est pas Baseline** (non supporté par tous les navigateurs
  majeurs) et impose en plus que les deux chemins aient le même nombre et le même
  type de commandes
  ([MDN d](https://developer.mozilla.org/en-US/docs/Web/CSS/d)).
  Le contenu textuel d'un `<text>` n'est pas non plus animable (§ 1.4).

#### Moteur maison à `requestAnimationFrame`

- **Points forts** : contrôle total, interpolation de *n'importe quoi* (attribut `d`,
  contenu texte, valeurs numériques), déterminisme trivial (`render(t)` pur).
- **Points faibles** : tout est sur le thread principal, jamais composité ; il faut
  réécrire easings, interpolation de couleurs/transforms, gestion de la boucle et du
  throttling en onglet caché. Pour ~50 tokens × plusieurs propriétés, le coût est réel
  sur mobile.
- **Verdict** : pas comme moteur principal, mais **indispensable en complément** pour
  la poignée de primitives non-CSS (§ 1.4).

#### Bibliothèques (hors jeu, pour mémoire)

- **GSAP** : la meilleure timeline du marché (labels, `seek()`, timelines imbriquées,
  MorphSVG). **Devenu 100 % gratuit, usage commercial inclus, le 30 avril 2025**
  après le rachat par Webflow ; la seule interdiction restante vise les outils no-code
  d'animation concurrents de Webflow
  ([Webflow blog](https://webflow.com/blog/gsap-becomes-free),
  [GSAP licensing](https://gsap.com/licensing/)).
  Écarté **uniquement** par la contrainte zéro-dépendance — pas par la licence.
- **anime.js v4** : ~17 kB min+gz, timeline composable, backend WAAPI optionnel, MIT.
- **Motion One / motion.dev** : le plus léger, bâti *sur* WAAPI.

Écartés par la règle zéro-dépendance. À noter : Motion One n'est qu'une fine couche
au-dessus de WAAPI — ce qu'on construit au § 1.3 en est l'équivalent minimal,
spécialisé pour notre besoin.

### 1.3 Recommandation : **WAAPI, orchestré par un "GroupEffect maison" à base de `delay` + `fill: 'forwards'`**

Puisque `GroupEffect` n'existe pas, on synthétise le groupe ainsi :

> Chaque animation enfant couvre **son propre segment** et est décalée sur la timeline
> globale par `delay = t0_du_step`. Toutes les animations partagent `document.timeline`.
> `seek(t)` = `for (const a of anims) a.currentTime = t;`
> `play()` = `for (const a of anims) a.play();` puis alignement dur des `startTime`.

C'est correct parce que `currentTime` est mesuré depuis le **début du delay**, donc la
même valeur `t` a la même signification pour toutes les animations du groupe.

**Validé empiriquement** (`proto/waapi-scrub.html`, Chrome 146, 3 steps / 12 animations,
dont deux steps animant la *même* propriété `transform` des *mêmes* éléments) :

| Test | Résultat |
|---|---|
| `seek(1200)` (milieu du step 2) | `transform = translate(19.9, 6.6)` — interpolation correcte |
| `seek(1799)` (fin du step 2) | `translate(60, 20)` — exact |
| `seek(2100)` (milieu du step 3) | rotation 90° composée avec la translation |
| `seek(400)` puis `seek(0)` — **retour arrière** | rendu identique à l'état initial, `transform: none` |
| Écart de `currentTime` entre les 12 animations pendant `play()` | **0 ms**, mesuré sur deux frames |
| Écart de `startTime` | **0 ms** |
| `replaceState` de toutes les animations | `persisted` |

**Deux pièges trouvés par le prototype, non documentés ailleurs de façon évidente :**

1. **`fill: 'forwards'`, JAMAIS `fill: 'both'`.** Avec `'both'`, une animation tardive
   *rétro-remplit* sa keyframe de départ dès `t=0` et, étant plus récente dans l'ordre
   de composition, **écrase les animations antérieures sur la même propriété**. Symptôme
   observé : au milieu du step 2, le token affichait déjà la valeur finale du step 2
   parce que la keyframe initiale du step 3 (même `transform`) l'écrasait. Avec
   `'forwards'`, l'animation ne s'applique pas avant son `delay` (phase "before") et
   remplit après sa fin : c'est exactement la sémantique d'une timeline séquentielle.

2. **`animation.persist()` sur *chaque* animation.** WAAPI supprime automatiquement les
   animations terminées en `fill` qui sont entièrement recouvertes par une animation
   plus récente sur la même paire (élément, propriété) — `replaceState` passe à
   `"removed"`. Sans `persist()`, revenir en arrière casserait le rendu des steps
   précédents. Le prototype confirme `replaceState: "persisted"` partout après appel.

3. Corollaire : **chaque keyframe de départ d'un step doit répéter explicitement l'état
   de sortie du step précédent** pour la même propriété (voir `translate(...) rotate(0)`
   → `translate(...) rotate(180deg)` dans le proto). Le moteur peut l'automatiser en
   tenant un registre `(élément, propriété) → dernière valeur connue` pendant la
   compilation de la timeline.

**Pourquoi pas rAF pur, malgré sa simplicité conceptuelle ?** Parce que WAAPI donne
gratuitement : easings, interpolation de couleurs et de transforms, compositing hors
thread principal, gel automatique en onglet caché (vérifié : dans un onglet non visible,
`currentTime` n'avance pas), et une introspection qui rend l'UI trivialement pilotable.
Le coût — écrire l'orchestrateur — représente ~120 lignes, déjà prototypées.

### 1.4 Le complément rAF, strictement délimité

Trois choses que WAAPI ne peut pas faire, et qui sont indispensables au projet :

1. **Texte qui change de contenu** (`H` → `8`, compteur de somme `0 → 44`).
   `textContent` n'est pas une propriété CSS.
2. **Morphing de `d`** (lettre → afficheur 7 segments), car `d` en CSS n'est pas
   Baseline et exige des chemins iso-structurés.
3. **Valeurs numériques discrètes** affichées (accumulation d'une somme).

Solution retenue : un **canal "tick"** unique. Une seule animation WAAPI "horloge"
pilote une variable CSS ou, plus simplement, une seule boucle `rAF` lit
`clock.currentTime` (une animation vide, `persist()`ée, de durée totale) et applique les
mises à jour discrètes via des fonctions `render(t)` **pures**. Aucune interpolation
manuelle de style : rAF ne sert qu'à écrire du texte et des `setAttribute('d', ...)`.
Comme ces fonctions sont pures en `t`, elles sont aussi appelées une fois après chaque
`seek()` — le déterminisme du scrubbing est préservé même en pause.

---

## 2. Modèle de timeline (contrat avec le moteur arithmétique)

### 2.1 Principe de séparation

- Le **moteur arithmétique** produit une **description déclarative** : quels tokens,
  quelles opérations, dans quel ordre, avec quel libellé. Il ne connaît ni pixels,
  ni ms, ni SVG.
- Le **moteur visuel** possède : le layout, les durées par défaut, les easings, le
  `viewBox`, la mesure de texte, la traduction op → `KeyframeEffect`.
- Interface = un objet JS/JSON sérialisable, **le `Scenario`**.

Règle d'or : *une opération décrit une intention sémantique, pas une animation.*
`{op:'reduce', from:'44', to:'8'}` et non `{op:'moveTo', x:120}`.

### 2.2 Schéma `Scenario`

```js
/** @typedef {Object} Scenario */
{
  version: 1,

  // Saisie brute de l'utilisateur, telle qu'encodée en b58 dans l'URL.
  input: "https://hope-hope-hope.fr/",

  // Identification de la méthode (pour le titre, le partage, l'URL).
  method: {
    id: 4,                                  // numéro d'approche (fragment d'URL)
    label: "La somme des 3 répétitions en A1Z26",
    rule: "A=1, B=2 … Z=26, puis réduction théosophique"
  },

  // Résultat attendu, affiché en fin de démonstration.
  result: "666",

  // --- ÉTAT INITIAL ------------------------------------------------------
  // Le moteur visuel pose ces tokens en ligne et leur donne une position.
  // Les `id` sont STABLES sur toute la durée du scénario : c'est la clé
  // d'identité utilisée par toutes les ops (et par FLIP).
  tokens: [
    { id: "t0",  text: "h", kind: "letter" },
    { id: "t1",  text: "t", kind: "letter" },
    // ...
    { id: "t8",  text: "h", kind: "letter", group: "w0" },
    { id: "t12", text: "-", kind: "sep" },
    { id: "t20", text: "/", kind: "sep" }
  ],

  // --- LA TIMELINE -------------------------------------------------------
  steps: [ /* Step[] */ ]
}
```

**`kind`** (vocabulaire fermé, sert au style par défaut) :
`letter` | `digit` | `number` | `sep` | `scheme` | `punct` | `space` | `operator`
| `annotation` | `ghost`.

**`group`** : étiquette libre de regroupement logique (mot, occurrence, paire). Sert
aux ops qui opèrent sur un ensemble (`group`, `sum`) sans réénumérer les ids.

### 2.3 Schéma `Step`

Un `Step` = **une unité de navigation** (Précédent/Suivant travaillent sur ses
frontières) et **une unité pédagogique** (un libellé, un numéro).

```js
/** @typedef {Object} Step */
{
  id: "s3",                    // stable, unique — utilisable en ancre d'URL
  title: "On convertit en rang alphabétique",   // libellé affiché
  caption: "H=8, O=15, P=16, E=5",              // sous-titre optionnel
  duration: 1200,              // OPTIONNEL. Si absent, le moteur somme les ops
                               // et applique ses durées par défaut.
  hold: 400,                   // OPTIONNEL. Temps de pause AVANT la charnière de
                               // fin, pour laisser lire le résultat du step.
  ops: [ /* Op[] */ ]          // jouées EN PARALLÈLE par défaut, décalées par `at`
}
```

**Modèle temporel** — entièrement déterministe, calculé une fois à la compilation :

```
step[i].t0    = Σ (durée des steps précédents)
step[i].t1    = step[i].t0 + step[i].duration
op.tStart     = step.t0 + (op.at ?? 0)
op.tEnd       = op.tStart + (op.dur ?? DEFAULT_DUR[op.op])
step.duration = max(op.tEnd) - step.t0 + (step.hold ?? 0)   // si non fourni
bounds        = [0, step0.t1, step1.t1, …, TOTAL]           // les charnières
```

Les `bounds` sont **les charnières** au sens du README. `TOTAL = bounds.at(-1)`.

### 2.4 Schéma `Op`

```js
/** @typedef {Object} Op */
{
  op: "reduce",        // discriminant, voir catalogue § 4
  at: 0,               // ms, offset RELATIF au début du step (défaut 0)
  dur: 600,            // ms (défaut : DEFAULT_DUR[op])
  ease: "ease-in-out", // optionnel ; défaut par type d'op
  stagger: 60,         // optionnel : décalage entre éléments d'une même op
  ...params            // spécifiques à l'op
}
```

**Contraintes imposées au moteur arithmétique** :

1. Toute op référence des tokens par `id`, jamais par index ni par position.
2. Une op qui *crée* un token doit fournir son `id` (unique dans le scénario) —
   c'est l'émetteur qui nomme, jamais le moteur visuel.
3. Une op qui *supprime* un token ne le réutilise plus jamais.
4. Les ops d'un même step ne doivent pas se contredire sur un même token
   (deux `move` concurrents sur `t3` = comportement non spécifié).
5. Un scénario doit être **rejouable à froid** : `render(scenario, t)` ne dépend
   d'aucun état antérieur.

### 2.5 Exemple complet (méthode 4, abrégé)

```js
{
  version: 1,
  input: "hope-hope-hope",
  method: { id: 4, label: "Somme A1Z26 des 3 répétitions" },
  result: "666",
  tokens: [
    {id:"a0",text:"h",kind:"letter",group:"w0"}, {id:"a1",text:"o",kind:"letter",group:"w0"},
    {id:"a2",text:"p",kind:"letter",group:"w0"}, {id:"a3",text:"e",kind:"letter",group:"w0"},
    {id:"d0",text:"-",kind:"sep"},
    /* … w1, d1, w2 … */
  ],
  steps: [
    { id:"s0", title:"On isole le premier mot",
      ops:[ {op:"highlight", targets:["a0","a1","a2","a3"], mode:"select"},
            {op:"dim", targets:{groupNot:"w0"}, at:200} ] },

    { id:"s1", title:"Chaque lettre vaut son rang dans l'alphabet",
      caption:"A=1, B=2 … Z=26",
      ops:[ {op:"substitute", stagger:120, pairs:[
              {target:"a0", to:{id:"n0", text:"8",  kind:"number"}},
              {target:"a1", to:{id:"n1", text:"15", kind:"number"}},
              {target:"a2", to:{id:"n2", text:"16", kind:"number"}},
              {target:"a3", to:{id:"n3", text:"5",  kind:"number"}} ]} ] },

    { id:"s2", title:"On additionne", caption:"8 + 15 + 16 + 5 = 44",
      ops:[ {op:"insertOperators", between:["n0","n1","n2","n3"], glyph:"+"},
            {op:"sum", targets:["n0","n1","n2","n3"], to:{id:"s44",text:"44",kind:"number"},
             at:400, dur:900} ],
      hold: 500 },

    { id:"s3", title:"Réduction théosophique", caption:"44 → 4 + 4 → 8",
      ops:[ {op:"reduce", target:"s44", digits:[{id:"r4a",text:"4"},{id:"r4b",text:"4"}],
             to:{id:"e0", text:"8", kind:"number"}} ] }
    /* … */
  ]
}
```

---

## 3. Automate des contrôles

### 3.1 État

```js
State = {
  t:        Number,     // position globale en ms, 0 ≤ t ≤ TOTAL
  playing:  Boolean,    // true ⇔ toutes les animations sont en playState 'running'
  rate:     +1 | -1,    // sens de lecture (v1 : toujours +1, cf. § 8)
  autoplayConsumed: Boolean   // l'autoplay initial a-t-il déjà eu lieu ?
}
```

Dérivés (fonctions pures de `t`, jamais stockés) :

```js
EPS = 1                                   // ms — tolérance de charnière
stepIndex(t) = plus grand i tel que bounds[i] ≤ t   (borné à steps.length-1)
atHinge(t)   = ∃ b ∈ bounds : |t - b| ≤ EPS
atStart(t)   = t ≤ EPS
atEnd(t)     = t ≥ TOTAL - EPS
```

`EPS` existe parce que `currentTime` peut être arrondi par le navigateur (Firefox
arrondit à 2 ms par défaut via `privacy.reduceTimerPrecision`, et jusqu'à 100 ms sous
`resistFingerprinting` — cf. [MDN currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime)).
Comparer `t` à une charnière par égalité stricte est donc un bug garanti.
**Recommandation : `EPS = 4` ms** (une frame à 240 Hz), pas 1, pour couvrir Firefox
en mode normal.

### 3.2 Transitions

| Bouton | Précondition | Action |
|---|---|---|
| **Début** | `!atStart(t)` | `pause(); seek(0)` |
| **Précédent** | `!atStart(t)` | `pause(); i = stepIndex(t);` `cible = (\|t - bounds[i]\| ≤ EPS) ? bounds[max(0,i-1)] : bounds[i]`; `seek(cible)` |
| **Play** | `!playing` | si `atEnd(t)` → `seek(0)` d'abord ; puis `play()` |
| **Pause** | `playing` | `pause()` (fige `t` à sa valeur courante, **pas** à une charnière) |
| **Suivant** | `!atEnd(t)` | `pause(); i = stepIndex(t);` `cible = (\|t - bounds[i+1]\| ≤ EPS) ? bounds[min(N, i+2)] : bounds[i+1]`; `seek(min(TOTAL, cible))` |

Traduction littérale du README : *"précédent au début de la transformation en cours,
ou au début de la transformation précédente si on est déjà à la charnière"* et
*"suivant envoie à la fin de la transformation actuelle (ou la suivante si on est déjà
à la charnière avec la suivante)"*. Ces deux règles sont exactement les deux lignes
ci-dessus, testées dans le prototype.

### 3.3 État des contrôles (dérivé, recalculé à chaque frame et à chaque seek)

```js
btn.start.disabled = atStart(t)
btn.prev.disabled  = atStart(t)
btn.next.disabled  = atEnd(t)
btn.playPause      = playing ? "Pause" : "Play"     // se remplacent mutuellement
stepBadge          = `${stepIndex(t) + 1} / ${steps.length}`
```

### 3.4 Cas limites — comportement spécifié

| Cas | Décision |
|---|---|
| **Suivant/Précédent pendant la lecture** | met en **pause** puis saute. Le README ne le dit pas ; c'est le comportement le moins surprenant (l'utilisateur qui navigue veut lire, pas être emporté). Alternative rejetée : sauter et continuer à jouer. |
| **Fin de lecture atteinte** | `playing = false`, `t = TOTAL`, Suivant grisé, le bouton redevient "Play". Un nouveau Play repart de 0 (`seek(0)` implicite) — comportement de type lecteur vidéo. |
| **Step de durée 0** | interdit. Le compilateur impose `duration ≥ 1 ms` ; deux charnières confondues rendraient `stepIndex` ambigu. |
| **Deux charnières distantes de moins de `2·EPS`** | idem : rejeté à la compilation avec une erreur explicite. Durée minimale d'un step : `4·EPS` (16 ms). |
| **`t` exactement sur `bounds[i]`** | on est considéré **au début du step `i`** (et donc aussi à la fin du step `i-1`). `stepIndex` renvoie `i` : le badge affiche le step qui *va* être joué. |
| **Scénario à 1 seul step** | Précédent ≡ Début ; les deux sont grisés au départ, Suivant saute directement à `TOTAL`. |
| **`prefers-reduced-motion: reduce`** | `t` saute de charnière en charnière ; toutes les durées sont compilées à 1 ms et le `hold` conservé (§ 5.6). L'automate est **inchangé** — c'est le point fort du modèle : la navigation est déjà discrète par construction. |
| **Redimensionnement de la fenêtre** | recompilation du layout → `rebuild()` : on mémorise `t` et `playing`, on annule (`cancel()`) toutes les animations, on recrée, on `seek(t)`, on `play()` si besoin. Debounce 150 ms. |
| **Navigation dans l'URL (`#4#b58…`)** | change de scénario → `rebuild()` complet, `t = 0`, `autoplayConsumed = false` (nouvelle démonstration = nouvel autoplay autorisé). |
| **Onglet masqué pendant la lecture** | Chrome gèle les animations d'un document caché — vérifié dans le prototype : `currentTime` n'avance pas. On ne fait donc rien de spécial, mais on arrête la boucle `rAF` de rendu de l'UI (elle est de toute façon suspendue). |

---

## 4. Catalogue des primitives d'animation

Convention commune :
`targets` accepte `string` (un id), `string[]`, ou un sélecteur déclaratif
`{group:"w0"}` / `{groupNot:"w0"}` / `{kind:"letter"}`.
Sauf mention contraire, toute op est implémentée en **WAAPI pur**.

### 4.1 `highlight` — mise en évidence / sélection

- **SVG** : `<text>` + un `<rect class="halo">` posé derrière (pré-créé, `opacity:0`).
- **Animé** : `opacity` du halo, `fill` du texte, éventuellement `font-weight` → non,
  `font-weight` provoque un reflow du texte et une largeur qui change. **Utiliser
  `fill` + halo, jamais le poids de police.**
- **Piège** : le halo doit être dimensionné depuis `getBBox()` du texte *après*
  `document.fonts.ready`, sinon il est calé sur la police de repli.
- **Variante `mode:"select"`** (le focus arrive) vs `mode:"reject"` (rouge barré).

### 4.2 `dim` / `drop` — disparition des caractères filtrés

Deux ops distinctes, sémantiquement différentes :

- **`dim`** : le token reste, atténué (`opacity: 1 → .18`). Sert à "on ignore
  `https://`" quand on veut garder la chaîne lisible.
- **`drop`** : le token **quitte le flux**. Animation en deux temps :
  `opacity 1→0` + `transform: translateY(0 → 18px) scale(1 → .6)` sur ~300 ms, puis les
  survivants se réarrangent par un `move` (§ 4.4) déclenché à `at: dur*0.6`
  (chevauchement volontaire : le regroupement commence avant que la chute soit finie,
  c'est ce qui rend le mouvement fluide).
- **Piège majeur** : ne **jamais** retirer l'élément du DOM. Un `drop` doit rester
  réversible par `seek()` en arrière. Les tokens supprimés restent dans le DOM avec
  `opacity: 0` et `pointer-events: none`, et sont retirés de la *liste de layout* du
  moteur (structure JS), pas du document.

### 4.3 `substitute` — un glyphe devient un nombre

- **Séquence** : crossfade + léger `scale` + recentrage.
  Le token source (`h`) et le token cible (`8`) coexistent, superposés sur le même
  point d'ancrage : `opacity 1→0` / `0→1`, `transform: scale(1→.85)` / `scale(1.15→1)`.
- **Piège de largeur** : `h` fait ~1 caractère, `15` en fait 2. Si on crossfade en place,
  les voisins doivent se décaler *pendant* la substitution. On compile donc toujours
  `substitute` en : (a) calcul du layout d'arrivée, (b) `move` FLIP des voisins,
  (c) crossfade — les trois simultanés.
- **Ancrage** : utiliser `text-anchor="middle"` et positionner par `transform`, pas par
  `x`. Le centre est stable, la largeur ne l'est pas.

### 4.4 `move` — migration / réarrangement (FLIP)

C'est **la** primitive centrale : presque toutes les autres s'appuient dessus.

- **First** : `el.getBBox()` (coordonnées du système SVG local) avant modification du
  layout — ou plutôt, en pratique, on lit les positions cibles depuis le **modèle de
  layout JS** (voir § 5.1), ce qui évite complètement de lire le DOM.
- **Last** : positions calculées par le layout engine.
- **Invert + Play** : une seule animation WAAPI
  `[{transform: 'translate(dx, dy)'}, {transform: 'translate(0,0)'}]`, ou directement
  `[{transform: T_avant}, {transform: T_après}]` puisqu'on maîtrise les deux valeurs.
- **Piège FLIP en SVG** : le FLIP classique du web mesure en pixels écran
  (`getBoundingClientRect`) puis compense par un `transform` CSS. En SVG, `transform`
  s'applique dans le **système de coordonnées utilisateur** (unités du `viewBox`), pas
  en pixels écran. Mélanger les deux donne des décalages proportionnels au facteur
  d'échelle. **Règle : tout mesurer et tout animer en unités `viewBox`** — donc
  `getBBox()` (unités locales), jamais `getBoundingClientRect()` (pixels écran).
- **Piège `transform-origin`** : la valeur initiale de `transform-box` est `view-box`,
  donc un `rotate(180deg)` avec `transform-origin: center` tourne autour du centre du
  **canevas SVG entier**, pas du glyphe. Il faut
  `transform-box: fill-box; transform-origin: center;` — Baseline widely available
  depuis janvier 2020
  ([MDN transform-box](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-box)).
  À poser une fois pour toutes en CSS sur tous les tokens.

### 4.5 `group` — regroupement en paires (pour une addition)

- **SVG** : un `<path>` d'accolade ou un `<rect rx>` d'encadré, dessiné par
  `stroke-dasharray` / `stroke-dashoffset` animés de `L → 0` (technique DrawSVG
  maison : `L = path.getTotalLength()`).
- Simultanément, un `move` rapproche les membres de la paire (réduction de l'espacement
  inter-tokens de ~30 %) — c'est ce resserrement qui *lit* comme un regroupement.
- **Piège** : `getTotalLength()` est coûteux ; le calculer une fois à la compilation
  et le stocker, pas à chaque frame.

### 4.6 `insertOperators` — apparition des `+` / `−` entre tokens

- Crée des tokens `kind:"operator"` aux interstices, `opacity 0→1` + `scale .5→1`,
  avec `stagger` de gauche à droite.
- Prérequis : le layout doit avoir *réservé* la place avant (sinon on déclenche un
  `move` de tous les voisins en même temps, ce qui est acceptable mais plus agité).
  **Décision** : réserver la place en amont via un `move` dans le même step.

### 4.7 `sum` — accumulation d'une somme

- **Deux registres visuels combinés** :
  1. chaque opérande "vole" vers la case résultat (`move` avec `opacity → 0` en fin de
     trajectoire, `stagger` séquentiel) ;
  2. la case résultat **compte** : `0 → 8 → 23 → 39 → 44`.
- Le compteur est du **texte**, donc canal rAF (§ 1.4) :
  `render(t)` = `el.textContent = String(partialSums[Math.floor(progress * n)])`.
  Fonction pure de `t` → scrubbing exact.
- **Piège de largeur** : un compteur qui passe de `8` à `44` change de largeur et fait
  sauter la mise en page. Remède : `text-anchor="middle"` **et** réserver la largeur du
  résultat final dès le début (calculée à la compilation), ou utiliser
  `font-variant-numeric: tabular-nums`.

### 4.8 `reduce` — réduction théosophique (44 → 4+4 → 8)

Trois temps, un seul step (le README traite ça comme une transformation) :

1. **Éclatement** : le token `44` se scinde en deux tokens `4` et `4` qui s'écartent
   (`move`), avec un `+` qui apparaît entre eux (`insertOperators`).
   Techniquement : on crée deux nouveaux `<text>` positionnés exactement sur les deux
   glyphes du `44` d'origine (positions obtenues par
   `SVGTextContentElement.getStartPositionOfChar(i)` / `getExtentOfChar(i)`), on masque
   l'original, puis on les écarte. Le raccord est invisible.
2. **Addition** : `sum` (§ 4.7).
3. **Résultat** : `8` apparaît avec un léger `scale` d'accentuation.

- **Piège** : `getStartPositionOfChar` renvoie des coordonnées dans le système
  utilisateur du `<text>` — cohérent avec `getBBox()`, incohérent avec l'écran. OK
  tant qu'on respecte la règle "tout en unités viewBox".
- **Cas récursif** (ex. `199 → 19 → 10 → 1`) : le moteur arithmétique émet **un `reduce`
  par palier**, chacun dans son propre step. Le moteur visuel ne boucle jamais tout seul.

### 4.9 `flip180` — retourner un 9 en 6

- **Le plus simple et le plus spectaculaire** : `transform: rotate(0deg → 180deg)` avec
  `transform-box: fill-box; transform-origin: center;`.
- **Piège typographique** : dans beaucoup de polices, un `9` pivoté ne donne **pas** un
  `6` convaincant (les terminaisons diffèrent, le `6` a souvent une hampe plus courte).
  Deux options :
  - **(a)** choisir une police géométrique où `6` et `9` sont symétriques par rotation
    (les grotesques géométriques le sont souvent), ou dessiner les chiffres en `<path>` ;
  - **(b)** faire tourner le `9` sur 180° **et** crossfader vers un vrai `6` au
    voisinage de 90° (là où l'œil ne peut pas trancher). C'est l'option robuste, et
    l'"escamotage" est parfaitement dans l'esprit taquin du projet.
  → **Recommandé : (b)**, avec (a) en amélioration si la police retenue s'y prête.
- Ajouter une petite flèche circulaire annotant la rotation (`stroke-dashoffset`).

### 4.10 `sevenSeg` — morphing lettre → afficheur 7 segments

- **Ne pas morpher `d`.** Le morphing de chemin en CSS exige des chemins iso-structurés
  et `d` n'est pas Baseline
  ([MDN d](https://developer.mozilla.org/en-US/docs/Web/CSS/d)).
- **Technique retenue** : un afficheur 7 segments **pré-dessiné** — 7 `<path>` fixes,
  identiques pour tous les caractères, contrôlés uniquement par `opacity`
  (et `fill`). Le "morphing" est alors :
  1. la lettre `H` fond vers l'afficheur (crossfade + `scale`) pendant que les 7
     segments passent de "tous à 15 % d'opacité" (segments éteints, visibles en
     fantôme) à "les segments de `H` à 100 %" ;
  2. les segments allumés s'illuminent en `stagger`, ce qui *compte* visuellement
     (voir `countStrokes`).
- **Bonus gratuit** : le comptage de segments (méthode 5 du README) devient trivial —
  chaque segment allumé incrémente le compteur, on voit littéralement pourquoi
  `H = 3 traits`.
- **Piège** : la méthode 5 du README parle de **traits continus fusionnés** (`H` = 3),
  pas de segments 7-seg individuels. L'afficheur doit donc supporter un mode "fusion" :
  les segments alignés adjacents partagent une même couleur/un même identifiant de
  trait. À modéliser dans les données de l'afficheur : `segments[i].strokeId`.

### 4.11 `countStrokes` — comptage de traits / d'extrémités avec annotations

- **SVG** : la lettre en `<path>` (pas en `<text>` : il faut les tracés). Chaque trait
  est un sous-chemin animable par `stroke-dashoffset` (`L → 0`) → on **redessine** la
  lettre trait par trait, en `stagger`, avec un badge numéroté `①②③` qui apparaît à
  l'extrémité de chaque trait.
- **Extrémités** : marqueurs `<circle>` posés aux points obtenus par
  `path.getPointAtLength(0)` et `getPointAtLength(L)`, `r: 0 → 3` en `stagger`.
- **Piège** : ça impose un **jeu de lettres vectorisées maison** (26 lettres × majuscule
  + éventuellement minuscule), avec pour chacune la décomposition en traits et leurs
  extrémités. C'est un **asset de données**, pas du code — à budgéter. Voir
  "Décisions à trancher".
- **Piège 2** : `getPointAtLength` sur `<path>` est standard ; sur d'autres formes
  géométriques il n'est pas universellement supporté. Rester sur `<path>`.

### 4.12 `keyboard` — superposition d'un clavier AZERTY

- **SVG** : un `<g id="azerty">` pré-dessiné (rangée de chiffres suffit : `& é " ' ( -
  è _ ç à`), initialement `opacity: 0` et `transform: scale(.9)`.
- **Séquence** : le clavier monte en fondu (`opacity 0→1`, `translateY(20→0)`), la
  touche `6/-` s'illumine (`fill` + halo), puis le `-` de la saisie **vole** vers la
  touche (`move`), puis le `6` en redescend, puis le clavier disparaît.
- **Piège de place** : le clavier occupe beaucoup de largeur. Prévoir un **zoom du
  `viewBox`** pendant cette séquence — animer l'attribut `viewBox` **n'est pas** une
  propriété CSS. Solution : ne jamais toucher au `viewBox` ; mettre tout le contenu
  dans un `<g id="camera">` et animer **son** `transform` (`scale` + `translate`).
  C'est aussi la bonne façon de faire tout zoom/panoramique du projet.

### 4.13 Ops utilitaires

| Op | Rôle |
|---|---|
| `annotate` | pose une étiquette/flèche/accolade avec un texte explicatif (`opacity` + `stroke-dashoffset`) |
| `pulse` | accentuation ponctuelle (`scale 1→1.2→1`) pour dire "voilà, c'est ça" |
| `reveal` | affichage du `666` final : `stagger`, `scale`, halo |
| `wait` | step vide de durée `d` — utile pour laisser lire une conclusion |

---

## 5. Pièges techniques

### 5.1 Mesure du texte et layout des tokens

- **Un layout engine JS, pas le layout du navigateur.** On ne laisse **jamais** le
  navigateur positionner les tokens (pas de `<text>` unique contenant toute la chaîne).
  Chaque token est un `<text>` indépendant, positionné par `transform: translate(x,y)`
  calculé par nous. C'est ce qui rend le FLIP trivial et le scrubbing déterministe.
- **Mesure** : `SVGTextContentElement.getComputedTextLength()` par token, **une seule
  fois** à la compilation. Alternative sans DOM : mesurer via un `<canvas>` 2D
  (`measureText`) — plus rapide et sans reflow, mais il faut que la police du canvas
  corresponde exactement.
- **Piège fatal : les polices.** Toute mesure faite avant le chargement de la police
  utilise la police de repli → layout faux. **Toujours attendre `document.fonts.ready`
  (ou `document.fonts.load('24px MaPolice')`) avant de compiler la timeline.**
- **Remède structurel** : préférer une police **monospace** pour les tokens. La largeur
  d'un glyphe devient une constante mesurée une fois, le layout devient de
  l'arithmétique pure, et les chiffres s'alignent (ce qui sert aussi le § 4.7). C'est
  aussi cohérent avec l'esthétique "geek" du projet.

### 5.2 `viewBox` et responsive

- **Un `viewBox` fixe** (ex. `0 0 1000 400`), `width="100%"`, `height="auto"`,
  `preserveAspectRatio="xMidYMid meet"`. Tout le layout se fait en unités viewBox : le
  responsive devient un simple changement d'échelle, **sans recompiler la timeline**.
- **Mais** : sur un écran étroit, une chaîne de 30 tokens devient illisible même bien
  mise à l'échelle. Il faut donc **quand même** une recompilation du layout aux
  ruptures (passage à un layout multi-lignes en dessous d'un seuil de tokens/largeur).
  → `rebuild()` avec conservation de `t` (§ 3.4).
- **Ne jamais animer l'attribut `viewBox`** : ce n'est pas une propriété CSS, WAAPI ne
  peut pas, et ça invaliderait les mesures. Utiliser le `<g id="camera">` (§ 4.12).
- **Texte trop petit** : un `font-size` en unités viewBox devient minuscule sur mobile.
  Prévoir un plancher : si l'échelle rendue passe sous un seuil, recompiler avec moins
  de tokens par ligne plutôt que de laisser rétrécir.

### 5.3 `transform` SVG vs CSS

- L'attribut SVG `transform="translate(10,20)"` et la propriété CSS
  `transform: translate(10px, 20px)` coexistent ; **la propriété CSS gagne**. WAAPI
  n'anime que la propriété CSS. → **Poser toutes les positions via `element.style.transform`
  et ne jamais utiliser l'attribut `transform`** (sinon on obtient des états
  contradictoires selon que l'animation est active ou non).
- **Unités obligatoires** : en CSS, `translate(10, 20)` est invalide — il faut
  `translate(10px, 20px)`. Les valeurs sont interprétées en unités du système de
  coordonnées utilisateur, malgré le suffixe `px`. Même piège pour les geometry
  properties : `cx: 20` invalide, `cx: 20px` valide.
- `transform-box: fill-box` + `transform-origin: center` sur tous les tokens (§ 4.4).
- **Composition** : quand un step ajoute une rotation à une translation existante, la
  keyframe de départ doit **répéter la translation** (§ 1.3 piège 3). Alternative plus
  propre : utiliser les propriétés individuelles `translate` / `rotate` / `scale`
  (Baseline) qui se composent sans se marcher dessus — **recommandé**, ça élimine
  entièrement le piège 3 : chaque step anime son propre canal.

### 5.4 Performance mobile

- Rester sur `transform` et `opacity` autant que possible (compositables). `fill`,
  `stroke-dashoffset`, geometry properties : non compositables → coût de repaint.
- Ordre de grandeur cible : **< 150 éléments SVG animés simultanément**. Une URL longue
  produit facilement 40 tokens × plusieurs décorations. Prévoir une troncature du
  scénario côté moteur arithmétique (ou un `dim` groupé plutôt que par token).
- Ne pas créer d'animations pour les steps qu'on ne verra jamais : sur les scénarios
  très longs, compiler **paresseusement** par fenêtre glissante de ±2 steps autour de
  `t`. (À trancher — voir § 8.)
- Éviter les filtres SVG (`filter`, `feGaussianBlur`) : très coûteux sur mobile.
  Les halos se font au `<rect>` + `opacity`, pas au flou.
- `will-change: transform` avec parcimonie (mémoire GPU), uniquement sur les tokens
  du step courant.

### 5.5 FLIP en SVG — récapitulatif

Le vrai piège a déjà été énoncé (§ 4.4) : mélanger pixels écran et unités viewBox.
Deuxième piège : le FLIP classique lit le DOM *après* mutation, ce qui force un reflow
synchrone. **Ici on ne mute pas le DOM pour se positionner** — le layout engine calcule
les positions d'arrivée en JS, donc pas de "First/Last" par mesure : on connaît les
deux valeurs de `transform` et on écrit directement les deux keyframes. C'est un FLIP
"analytique", sans lecture DOM, sans thrashing.

### 5.6 `prefers-reduced-motion`

- Détection : `window.matchMedia('(prefers-reduced-motion: reduce)')`, avec écoute des
  changements en cours de session (`addEventListener('change', …)`) —
  Baseline depuis janvier 2020
  ([MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).
- **Comportement** :
  - autoplay **désactivé** ;
  - toutes les `dur` compilées à `1 ms` (donc chaque step est une transition instantanée
    entre deux états stables), les `hold` conservés ;
  - la navigation Précédent/Suivant est **inchangée** et devient le mode de consultation
    principal : la démonstration reste intégralement consultable **étape par étape**,
    conformément à la demande.
- **Bonus indispensable** : chaque step expose son `title` + `caption` dans un panneau
  texte (et dans un `aria-live="polite"`). Ça sert l'accessibilité, le SEO, et permet
  de lire la démonstration sans regarder l'animation du tout.
- **Ne pas** brancher `prefers-reduced-motion` uniquement en CSS : c'est le
  **compilateur de timeline** qui doit en tenir compte, sinon les durées WAAPI (fixées
  en JS) l'ignorent.

### 5.7 Export d'une image de partage

- **Chaîne** : `new XMLSerializer().serializeToString(svg)` → `data:image/svg+xml;base64,…`
  → `new Image()` → `canvas.drawImage()` → `canvas.toBlob()`.
- **Piège 1 — polices** : une `<image>` SVG rendue dans un canvas **n'a pas accès aux
  polices web de la page**. Le texte sort en police de repli, avec un layout cassé.
  Remèdes, par ordre de préférence :
  1. utiliser une **police système** (`font-family: ui-monospace, monospace`) — zéro
     dépendance, cohérent avec la stack ;
  2. embarquer la police en base64 dans un `<style>` **à l'intérieur** du SVG sérialisé
     (lourd : 20–100 kB) ;
  3. convertir les `<text>` en `<path>` — pas faisable sans dépendance.
- **Piège 2 — `foreignObject`** : rend le canvas *tainted* dans certains moteurs et
  n'est pas rendu du tout dans d'autres. **Interdiction totale de `foreignObject`** dans
  le SVG de démonstration.
- **Piège 3 — ressources externes** : aucune `<image href="http…">`, aucun `@import`.
  Tout doit être auto-contenu.
- **Piège 4 — dimensions** : le SVG sérialisé doit porter des `width`/`height`
  explicites en px, sinon Chrome et Firefox divergent sur la taille rendue.
- **Meta Open Graph** : une image générée côté client **ne peut pas** servir de
  `og:image` (les crawlers n'exécutent pas le JS). Il faut soit une image statique
  générique, soit un service de génération côté serveur — hors périmètre du zéro-build.
  → à trancher (§ 8).

---

## 6. Autoplay : comportement exact

Exigence README : *"Play ne se déclenche automatiquement qu'une fois la page chargée et
le focus sur l'onglet présent (pour éviter de la jouer en arrière-plan). Il ne se
redéclenche pas automatiquement (sauf rechargement de la page)."*

### 6.1 Les trois conditions

| Condition | API | Pourquoi |
|---|---|---|
| Page chargée | `document.readyState === 'complete'` **+** `document.fonts.ready` | tant que la police n'est pas là, le layout est faux (§ 5.1) : démarrer avant produirait un premier step visuellement cassé |
| Onglet visible | `document.visibilityState === 'visible'` ([MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)) | l'onglet peut être au premier plan de sa fenêtre mais la fenêtre minimisée |
| Fenêtre focalisée | `document.hasFocus()` | `visible` ≠ *focalisé* : une fenêtre visible côte à côte avec une autre n'a pas le focus. Le README parle bien de "focus sur l'onglet" |
| Pas de reduced-motion | `!matchMedia('(prefers-reduced-motion: reduce)').matches` | § 5.6 |

### 6.2 Machine

```
autoplayConsumed = false        // remis à false uniquement au chargement
                                // ou au changement de scénario via l'URL

tryAutoplay():
  si autoplayConsumed            → return
  si !prêt (readyState + fonts)  → return
  si !visible || !hasFocus()     → return
  si reducedMotion               → autoplayConsumed = true ; return
  autoplayConsumed = true        // consommé AVANT de jouer : un seul autoplay, point
  play()

Déclencheurs de tryAutoplay() :
  - fin de la compilation de la timeline (readyState complete + fonts ready)
  - document 'visibilitychange'  (→ visible)
  - window 'focus'
```

Le point clé est que `autoplayConsumed` est mis à `true` **au premier déclenchement
réussi**, et n'est jamais remis à `false` en cours de vie de la page. Les écouteurs
`visibilitychange` / `focus` restent branchés (ils peuvent se déclencher plusieurs fois
avant que les conditions soient réunies) mais deviennent inertes ensuite. On peut les
retirer une fois `autoplayConsumed` vrai.

### 6.3 Pourquoi une seule fois

- **Respect de l'utilisateur** : s'il a mis en pause, revenir à l'onglet ne doit pas
  relancer la lecture — c'est le cas d'usage explicitement redouté par le README.
- **Anti-surprise** : une animation qui repart toute seule à chaque retour d'onglet est
  perçue comme un bug.
- **Détermination du partage** : un lien partagé doit produire une expérience
  reproductible ; un autoplay dépendant de l'historique de focus ne l'est pas.
- **Techniquement**, ce n'est pas de l'autoplay média : pas de politique navigateur à
  contourner (pas de son). La restriction est purement ergonomique, donc c'est à nous
  de la tenir.

### 6.4 Comportement quand l'onglet devient caché *pendant* la lecture

Vérifié dans le prototype : Chrome **gèle** les animations d'un document caché
(`currentTime` n'avance plus). On ne fait donc rien : la lecture reprend là où elle en
était au retour, `playing` reste vrai, et l'utilisateur ne rate rien. On coupe seulement
la boucle `rAF` de mise à jour de l'UI (déjà suspendue par le navigateur).
Comportement alternatif possible : mettre explicitement en pause sur `visibilitychange`
pour que l'utilisateur retrouve la démonstration figée. → à trancher (§ 8).

---

## 7. Contrat d'interface

### 7.1 Ce que le moteur visuel attend en entrée

Un objet **`Scenario`** (§ 2.2), sérialisable en JSON, produit par le moteur arithmétique
(éventuellement filtré/ordonné par le moteur heuristique). Rien d'autre : ni DOM, ni
dimensions, ni durées en pixels.

**Invariants exigés — le moteur visuel les vérifie et échoue bruyamment sinon :**

1. `version === 1`.
2. `tokens[].id` uniques, non vides, stables.
3. Toute `Op` ne référence que des ids **existants à ce point de la timeline** :
   déjà déclarés dans `tokens` ou créés par une op d'un step antérieur (ou du même
   step, à un `at` antérieur).
4. Un id créé n'est jamais recréé ; un id supprimé n'est jamais réutilisé.
5. `steps.length ≥ 1` ; chaque step a un `id` unique et un `title` non vide.
6. Après compilation, chaque `step.duration ≥ 16 ms`.
7. Le `op` de chaque opération appartient au vocabulaire fermé du § 4. Un `op` inconnu
   est une **erreur de compilation**, pas une op ignorée.
8. Le scénario est **pur** : aucune fonction, aucune référence DOM, aucune closure.

### 7.2 Ce que le moteur visuel fournit en sortie

```js
const player = createPlayer(svgRootElement, scenario, options);

// Lecture seule
player.total            // ms
player.bounds           // number[] — les charnières
player.steps            // [{id, title, caption, t0, t1}]
player.currentTime      // ms
player.stepIndex        // 0-based
player.playing          // bool
player.atStart / atEnd / atHinge   // bool

// Commandes (miroir exact du § 3.2)
player.toStart()
player.prev()
player.next()
player.play()
player.pause()
player.seek(ms)
player.seekToStep(i)    // = seek(bounds[i])
player.rebuild()        // recompile le layout, conserve t et playing
player.destroy()

// Événements (CustomEvent sur l'élément SVG, ou callbacks)
player.on('change', ({t, stepIndex, playing}) => …)   // à chaque changement d'état
player.on('stepenter', ({stepIndex}) => …)            // franchissement de charnière
player.on('end',  () => …)

// options
{ reducedMotion: 'auto'|'force'|'off',   // défaut 'auto'
  speed: 1,                              // multiplicateur global des durées
  autoplay: true }                       // soumis aux conditions du § 6
```

Le composant d'UI (boutons, badge de numéro) est un **consommateur** de `player` :
il n'a aucune logique propre, il reflète `player` sur `change`.

### 7.3 Ce que le moteur visuel n'accepte PAS

- Des coordonnées, tailles, couleurs ou durées absolues venant du moteur arithmétique
  (sauf `duration`/`at`/`dur`, qui sont des *suggestions* modulables par `speed` et
  écrasées en mode reduced-motion).
- Des ops hors catalogue. Ajouter une transformation arithmétique nouvelle qui n'a pas
  de rendu ⇒ ajouter d'abord la primitive ici, puis l'émettre.
- Des chaînes HTML/SVG brutes.

---

## 8. Décisions à trancher

| # | Question | Options | Penchant |
|---|---|---|---|
| 1 | **Précédent/Suivant : saut sec ou lecture inverse animée ?** | (a) saut instantané (`seek`) ; (b) lecture animée du segment à `playbackRate` ±1 ou ±2 | (a) en v1 — plus prévisible, moins de cas limites. WAAPI permet (b) sans refonte |
| 2 | **`prev()` pendant la lecture : pause ou poursuite ?** | pause (retenu § 3.4) vs continuer | pause — à confirmer par un test utilisateur |
| 3 | **Onglet caché pendant la lecture** | laisser geler (comportement navigateur) vs pause explicite | laisser geler ; trancher après essai |
| 4 | **Police des tokens** | monospace système (zéro dépendance, export d'image sûr, alignement des chiffres) vs police web à personnalité | monospace système — mais c'est une décision **design**, à coordonner avec l'agent design (impact direct sur § 4.9 et § 5.7) |
| 5 | **`flip180` du 9** | rotation pure vs rotation + crossfade vers un vrai `6` | crossfade (§ 4.9) ; dépend de la décision 4 |
| 6 | **Assets vectoriels des lettres** (pour `countStrokes` et `sevenSeg`) | 26 lettres × (majuscule, minuscule) à dessiner à la main, avec décomposition en traits et extrémités | **gros poste de travail non chiffré.** À arbitrer : couvrir seulement A–Z majuscules en v1 ? Réduire aux lettres réellement utiles aux méthodes du README ? |
| 7 | **Composition des transforms** | `transform` unique avec répétition des valeurs vs propriétés individuelles `translate`/`rotate`/`scale` | propriétés individuelles (§ 5.3) — reste à valider en prototype sur Safari |
| 8 | **Compilation paresseuse** des animations pour les longs scénarios | tout compiler d'emblée vs fenêtre glissante ±2 steps | tout compiler tant qu'on reste sous ~150 éléments ; mesurer avant d'optimiser |
| 9 | **Layout multi-lignes** sous un seuil de largeur | recompiler en plusieurs lignes vs réduire la taille vs faire défiler la caméra horizontalement | non tranché — impacte le layout engine, à cadrer avec l'agent design |
| 10 | **`og:image` du partage** | image statique générique vs génération serveur (contraire au zéro-build) vs pas d'image | non tranché (§ 5.7) |
| 11 | **Fallback pour les 3,8 % sans WAAPI complet** (Opera Mini, très vieux navigateurs) | rendu statique du dernier state + navigation par step sans animation (= le mode reduced-motion, qui est déjà écrit) | réutiliser le mode reduced-motion comme fallback — coût quasi nul |
| 12 | **Vérification cross-navigateur** | le prototype n'a été exécuté que sous **Chrome 146**. Les points à revalider sous Firefox et Safari : précision de `currentTime` (arrondi Firefox), `persist()`, `transform-box: fill-box` sur `<text>`, geometry properties, gel des animations en onglet caché | **lacune assumée de cette recherche** — à faire avant de figer l'implémentation |

---

## Annexe — sources

- [MDN — Animation](https://developer.mozilla.org/en-US/docs/Web/API/Animation)
- [MDN — Animation.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/Animation/currentTime)
- [MDN — Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [caniuse — Web Animations API](https://caniuse.com/web-animation)
- [MDN — transform-box](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-box)
- [MDN — CSS `d`](https://developer.mozilla.org/en-US/docs/Web/CSS/d)
- [MDN — CSS `cx`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cx)
- [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [SVG 2 — Geometry Properties](https://svgwg.org/svg2-draft/geometry.html)
- [blink-dev — Intent to deprecate: SMIL](https://groups.google.com/a/chromium.org/g/blink-dev/c/5o0yiO440LM/m/YGEJBsjUAwAJ)
- [caniuse issue #4167 — dépréciation SMIL suspendue](https://github.com/Fyrd/caniuse/issues/4167)
- [CSS-Tricks — SMIL on!](https://css-tricks.com/smil-on/)
- [GroupEffect explainer (Chromium)](https://yi-gu.github.io/group_effect/)
- [googlearchive/web-animations-utils (polyfill archivé)](https://github.com/googlearchive/web-animations-utils)
- [Webflow — GSAP devient gratuit (30 avril 2025)](https://webflow.com/blog/gsap-becomes-free)
- [GSAP — Standard License](https://gsap.com/licensing/)
- Prototype de validation : `.planning/research/proto/waapi-scrub.html`
