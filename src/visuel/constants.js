/**
 * Constantes du moteur visuel — toutes les valeurs figées par CONTRACTS.md
 * y sont rassemblées, aucune n'est dupliquée ailleurs.
 */

/**
 * Tolérance de charnière, en ms.
 * CONTRACTS §3 : « EPS = 4 ms — comparer currentTime par égalité stricte est un
 * bug garanti (Firefox arrondit à 2 ms via privacy.reduceTimerPrecision) ».
 */
export const EPS = 4;

/** Durée minimale d'un step après compilation (CONTRACTS §3, invariant 6). */
export const MIN_STEP_DURATION = 16;

/** Écart minimal entre deux charnières distinctes (CONTRACTS §3). */
export const MIN_HINGE_GAP = 2 * EPS;

/** Durées de référence (CONTRACTS §0.4). */
export const DUR_TRANSFORM = 1400; // 1,4 s par transformation
export const DUR_HINGE = 400;      // 0,4 s de charnière
export const DUR_REDUCED_STEP = 2500; // 2,5 s par étape en mode réduit
export const DUR_REDUCED_OP = 1;      // toute animation compilée à 1 ms

/** Scène — tout est en unités viewBox (CONTRACTS §3.2 règle 5). */
export const VIEWBOX = { x: 0, y: 0, w: 1200, h: 480 };
export const MARGIN = 72;

/**
 * Métriques typographiques des tokens de scène.
 * CONTRACTS §0.3 : JetBrains Mono, chasse fixe → le layout est de l'arithmétique
 * pure. `advanceRatio` est la chasse nominale de JetBrains Mono (600/1000 upem) ;
 * elle est recalibrée par mesure réelle après `document.fonts.ready` (règle 8).
 */
export const FONT_FAMILY = '"JetBrains Mono", ui-monospace, "DejaVu Sans Mono", monospace';
export const FONT_SIZE = 48;
export const ADVANCE_RATIO = 0.6;
export const CAP_RATIO = 0.73;
export const TOKEN_GAP = 6;      // échelle d'espacement design : base 6
export const LINE_HEIGHT = 78;   // unités viewBox

/**
 * Vocabulaire FERMÉ des ops — CONTRACTS §3.1.
 *
 * Le contrat prévoit l'extension : « Ajouter une transformation arithmétique
 * sans rendu ⇒ ajouter d'abord la primitive ici, puis l'émettre. » Quatre
 * primitives ont été ajoutées au socle de dix-sept :
 *
 *  · `partition` — découper la saisie en sous-groupes, pour appliquer ensuite
 *    la MÊME transformation à chacun (« trois d'affilée, selon la même
 *    méthode », README). Sans elle, un `hope-hope-hope` se traitait morceau
 *    après morceau sans qu'on voie jamais le découpage ;
 *  · `table` — la TABLE DE CORRESPONDANCE affichée, sur le modèle du clavier :
 *    la lettre monte vers sa case, qui s'allume, et sa valeur en redescend
 *    aussitôt à sa place. Trois mises en page — réglette (une case par lettre),
 *    grille (une colonne par valeur) et pavé téléphonique —, mais un seul
 *    geste : une primitive par table aurait été une primitive par méthode.
 *    Sa durée couvre un aller-retour complet ; le déploiement du décor
 *    (`montre`) et son repli (`retire`) ne se paient qu'aux deux bouts d'une
 *    série d'étapes qui emploient la même table ;
 *  · `fourteenSeg` — l'afficheur QUATORZE segments. Même geste que `sevenSeg`,
 *    autre afficheur : le vocabulaire nomme des gestes, et appeler « sept
 *    segments » un afficheur qui en allume quatorze aurait fait mentir le nom
 *    de l'op — c'est-à-dire la première chose qu'on lit d'un scénario.
 *    Sa durée est un peu plus longue : il y a jusqu'à dix traits à allumer un
 *    par un, contre cinq au plus en sept segments ;
 *  · `horns` — LES CORNES. Trois 6 déjà côte à côte dans la ligne : deux
 *    cornes leur poussent dessus pendant que le reste de la séquence
 *    s'efface. C'est la chute du site, et c'est un geste que rien du
 *    vocabulaire ne savait faire — ni `highlight` (qui désigne sans rien
 *    dessiner), ni `drop` (qui efface sans rien couronner), ni `reveal` (qui
 *    conclut, alors que les cornes se posent en cours de route et durent
 *    jusqu'au verdict). Même argument que `fourteenSeg`, et il vaut d'autant
 *    plus ici que le nom de l'op est ce qu'on lit en premier d'un scénario :
 *    « on met les cornes » se lit, « highlight avec l'option cornes » ment sur
 *    ce qui se passe. La primitive efface elle-même — voir `horns.js`, c'est
 *    le contrôle croisé qui l'exige.
 */
export const OP_NAMES = Object.freeze([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns', 'merge', 'shift', 'collapse', 'fraction',
  'rule', 'convert',
]);

/**
 * Durées par défaut, par op (ms, avant `speed`).
 *
 * ★ Elles ont été franchement allongées : « c'est la compréhension et la
 * lisibilité qui priment, il y a de quoi faire avance rapide si besoin ».
 * Un comptage ou une conversion se regarde, il ne s'expédie pas.
 *
 * `src/moteur/transformations/commun.js` en tient le miroir (le moteur
 * arithmétique ne dépend pas du moteur visuel) ; un test vérifie qu'ils ne
 * divergent pas.
 */
export const DEFAULT_DUR = Object.freeze({
  highlight: 600,
  dim: 700,
  drop: 2000,
  substitute: 1100,
  move: 900,
  group: 1300,
  insertOperators: 700,
  sum: 2800,
  reduce: 2600,
  flip180: 1100,
  sevenSeg: 3000,
  fourteenSeg: 3400,
  countStrokes: 3000,
  keyboard: 2400,
  annotate: 800,
  pulse: 600,
  reveal: 1400,
  wait: 900,
  partition: 1800,
  table: 2600,
  // Les cornes : le reste s'efface d'abord (un jeton après l'autre, comme un
  // `drop` en mode gomme), et les cornes poussent par-dessus la fin de
  // l'effacement. Deux gestes qui se recouvrent, donc un peu plus qu'un `drop`.
  horns: 2200,
  // Coller des chiffres ne montre presque rien — c'est tout le propos. Une
  // seconde suffit à voir les espaces se résorber, et s'attarder donnerait à
  // ce quasi-rien l'importance d'un calcul.
  merge: 1000,
  // Le tamis : les deux moitiés s'écartent, on les lit, elles se rendent.
  // Assez lent pour qu'on ait le temps de vérifier le tri avant qu'il ne
  // soit consommé — c'est tout l'intérêt du geste.
  shift: 900,
  // Monter, converger, retomber : trois temps, et le choc doit se voir.
  collapse: 2400,
  // Six temps : poser le calcul en demande quatre, le faire en demande deux.
  // C'est long parce que c'est une leçon, pas une transition.
  fraction: 7000,
  // Le trait de fraction ne fait que suivre : il n'est jamais le sujet, il
  // s'ajuste pendant qu'autre chose se passe. Court, donc, et discret.
  rule: 700,
  // L'atelier de conversion : six temps, dont trois qui se lisent (l'expression
  // montée, la flèche, la cible centrée). Aussi long qu'une somme, parce que
  // c'est la même chose — un raisonnement qu'on donne à vérifier.
  convert: 3200,
});

/** `kind` des tokens — vocabulaire fermé (recherche §2.2). */
export const KINDS = Object.freeze([
  'letter', 'digit', 'number', 'sep', 'scheme', 'punct', 'space',
  'operator', 'annotation', 'ghost',
]);

/**
 * Courbes par défaut.
 *
 * ★ `course` — **la seule qui soit lente aux DEUX bouts.** Les trois autres
 *   partent lentement et finissent lentement d'une manière ou d'une autre, mais
 *   aucune ne creuse vraiment le milieu. Mesuré, vitesse rapportée à la vitesse
 *   moyenne :
 *
 *   | courbe                  | au départ | au milieu | maximum |
 *   |-------------------------|-----------|-----------|---------|
 *   | `move` (.4,0,.2,1)      | 0,09      | 1,20      | 2,73    |
 *   | `fade` (.4,0,.6,1)      | 0,08      | 1,67      | 1,67    |
 *   | **`course`** (.85,0,.15,1) | **0,02** | **6,14** | **6,67** |
 *
 *   `move` atteint d'ailleurs son maximum TÔT, pas au milieu : c'est une courbe
 *   qui décélère, faite pour un déplacement court dont on veut voir l'arrivée.
 *
 *   `course` est faite pour l'inverse — un long trajet dont on veut voir le
 *   DÉPART et l'ARRIVÉE, et dont le milieu n'a rien à apprendre : la table des
 *   restes qui descend de cinquante rangées vers la valeur cherchée. « Commencer
 *   le mouvement lentement, le finir lentement, mais aller bien plus vite au
 *   milieu de la course » (l'auteur).
 *
 *   Poussée plus loin (.9,0,.1,1 donne 7,85 au milieu), les extrémités se
 *   figent : on ne lit plus un mouvement qui démarre, on lit une pause suivie
 *   d'un saut. C'est pour cela qu'elle s'arrête là.
 */
export const EASE = Object.freeze({
  move: 'cubic-bezier(.4,0,.2,1)',
  fade: 'cubic-bezier(.4,0,.6,1)',
  pop: 'cubic-bezier(.34,1.4,.64,1)',
  course: 'cubic-bezier(.85,0,.15,1)',
  linear: 'linear',
});

/**
 * Préfixe réservé aux nœuds fabriqués par le moteur (halos, accolades, badges,
 * segments, marqueurs…). Un `id` de scénario ne peut jamais commencer par `@`.
 */
/**
 * La MÊME courbe, évaluée en JavaScript — pour le canal DISCRET.
 *
 * ★ **POURQUOI IL EN FAUT UNE.** Le canal continu confie sa courbe au
 *   navigateur : on lui passe `ease` et il interpole. Le canal discret, lui,
 *   reçoit un `u` LINÉAIRE (`clock.js › resolveDiscrete`) et se rend lui-même :
 *   c'est ce qu'il faut pour un texte de compteur, qui n'a pas de vitesse. Mais
 *   dès qu'un tracé discret accompagne un mouvement continu — l'accolade qui
 *   rétrécit avec la ligne qu'elle embrasse —, les deux suivent des lois
 *   différentes et se désynchronisent :
 *
 *   > « Le redimensionnement des accolades se fait avec du retard. Il devrait
 *   >   s'ajuster pile au rythme des redimensionnements du contenu, pas avec un
 *   >   temps de retard. Ça donne l'impression que ça rame. » (l'auteur)
 *
 *   Ce n'était pas un décalage de `at` ni de `dur` — ils étaient déjà partagés.
 *   C'était la COURBE. Mesuré, à mi-durée : `EASE.move` a parcouru 77,6 % du
 *   chemin, la largeur linéaire 50 %. VINGT-HUIT POINTS de course d'écart, au
 *   moment précis où le mouvement est le plus rapide — la ligne s'est déjà
 *   resserrée que l'accolade en est au milieu de son rétrécissement. C'est
 *   exactement ce qui se lit comme une traîne. Aux extrémités les deux courbes
 *   se rejoignent (0,25 → 23,7 % contre 25 %), ce qui explique qu'on voie une
 *   accolade qui RAME plutôt qu'une accolade en retard : elle part avec la
 *   ligne, se laisse distancer, puis la rattrape d'un coup.
 *
 * ★ **RÉSOLUTION PAR BISSECTION, ET NON PAR NEWTON.** Une bissection à pas fixe
 *   n'a pas de condition d'arrêt dépendant des données : même nombre
 *   d'itérations pour toutes les entrées, donc même résultat sur toutes les
 *   machines (§4.4, déterminisme). Vingt-deux passes bornent l'erreur en `x` à
 *   2⁻²², bien en deçà du pixel.
 *
 * @param {string} ease  une valeur de `EASE`
 * @returns {(u:number)=>number} la progression, de 0 à 1
 */
export function progressionDe(ease) {
  const m = /^cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)$/.exec(String(ease).replace(/\s+/g, ''));
  if (!m) return (u) => u;                       // `linear`, et tout ce qu'on ne sait pas lire
  const [x1, y1, x2, y2] = m.slice(1).map(Number);
  const bez = (a, b, t) => {
    const v = 1 - t;
    return 3 * v * v * t * a + 3 * v * t * t * b + t * t * t;
  };
  return (u) => {
    const cible = Math.min(1, Math.max(0, u));
    if (cible === 0 || cible === 1) return cible;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < cible) lo = mid; else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

export const ENGINE_PREFIX = '@';

/** Identifiant du groupe caméra (CONTRACTS §3.2 règle 6 : jamais d'animation du viewBox). */
export const CAMERA_ID = '@camera';

/**
 * Identifiant du groupe de DÉFILEMENT, imbriqué DANS la caméra.
 *
 * ★ Pourquoi un deuxième groupe, et pas simplement le `translate` de la caméra.
 *
 * Doctrine : **la séquence ne se met jamais sur deux lignes**. Quand elle est
 * plus large que la scène, on la fait défiler horizontalement et l'on garde
 * l'action au centre. C'est un panoramique, donc le `transform` d'un groupe —
 * jamais l'attribut `viewBox` (règle 6).
 *
 * Mais la caméra a déjà un usage : `keyboard` et `alphabet` reculent (`scale`)
 * et recentrent (`translate`) le temps d'un step. Deux mouvements sur le même
 * canal du même nœud se contrediraient dans un même step. Le défilement a donc
 * son propre nœud, **à l'intérieur** du contenu de la caméra :
 *
 *     @camera  translate + scale   (le recul ponctuel des primitives)
 *       └─ @pan  translate         (le défilement de la ligne)
 *            └─ couches
 *
 * L'imbrication n'est pas indifférente. Le recul de caméra se fait autour du
 * CENTRE DU VIEWBOX ; comme il s'applique APRÈS le défilement, le point que le
 * défilement a amené au centre y reste, quel que soit le zoom. Un recul de
 * caméra ne défait donc jamais un défilement, et réciproquement : les deux
 * gestes sont orthogonaux par construction, sans arithmétique de rattrapage.
 */
export const PAN_ID = '@pan';

/**
 * Palette de repli — thème sombre « Nuit d'encre » (design §2.3).
 *
 * WAAPI ne sait pas interpoler `var(--gold)` de façon fiable : les couleurs
 * doivent être **résolues** au moment de la compilation. `player.js` lit les
 * variables CSS réellement appliquées à la scène et les injecte ici ; ces
 * valeurs ne servent qu'en l'absence de feuille de style (tests, export).
 */
export const PALETTE = Object.freeze({
  canvas: '#0B0E14',
  surface: '#141A26',
  raised: '#1E2634',
  line: '#2C3546',
  // `line-ui` — le trait porteur de sens (design §2.3). Il sert aussi de BORNE
  // à la teinte de fond des tables : plus sombre que `raised` en thème clair,
  // plus clair en thème sombre, donc la direction de la teinte est portée par
  // les jetons et non par une détection de thème.
  lineUi: '#5E6C86',
  fg: '#EFE6D4',
  fg2: '#B9AF9B',
  fg3: '#8E8575',
  rubric: '#F0574B',
  gold: '#E3B341',
  phos: '#5BE3A6',
  // ★ L'ORAGE DU VERDICT — registre scénique (CONTRACTS §3.1, amendement).
  //   Ces quatre-là ne dépendent PAS du thème : au verdict la scène passe la
  //   nuit, et une fois la nuit tombée le thème ne gouverne plus la scène. Un
  //   seul fond, une seule encre, un seul contraste — mesuré une fois (7,4:1)
  //   plutôt que deux fois à peu près. Voir `src/styles/tokens.css`.
  nuit: '#0A0608',
  rubricNuit: '#FF6F62',
  eclair: '#DCE6F5',
  // ★ La rampe thermique du feu (`primitives/feu.js`, `RAMPE`). Quatre paliers
  //   du plus froid au plus chaud : c'est leur EMBOÎTEMENT qui fait le dégradé,
  //   sans qu'aucun dégradé ne soit calculé — voir `tokens.css`.
  braise: '#B3300A',
  brasier: '#FF7A2E',
  flamme: '#FFC24A',
  coeur: '#FFF1C8',
  fumee: '#451B0E',
});

/**
 * Couleur d'un `kind`, selon la sémantique stricte du design (§2.3) :
 * rubrique = l'affirmation, or = la valeur atteinte, phosphore = la mesure.
 */
export function colorForKind(kind, palette = PALETTE) {
  switch (kind) {
    case 'digit':
    case 'number':
    case 'operator':
      return palette.phos;
    case 'annotation':
    case 'ghost':
      return palette.fg3;
    case 'sep':
    case 'punct':
    case 'scheme':
      return palette.fg2;
    default:
      return palette.fg;
  }
}

/**
 * Canaux animés. Les trois canaux géométriques sont portés chacun par son
 * propre élément de la chaîne de position (CONTRACTS §3.2 règle 3) : ce sont
 * des canaux du moteur, jamais des propriétés CSS individuelles.
 */
export const PROPS = Object.freeze([
  'translate', 'rotate', 'scale', 'opacity', 'fill', 'stroke',
  'strokeDashoffset', 'r',
]);
