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
 * sans rendu ⇒ ajouter d'abord la primitive ici, puis l'émettre. » Deux
 * primitives ont été ajoutées au socle de dix-sept :
 *
 *  · `partition` — découper la saisie en sous-groupes, pour appliquer ensuite
 *    la MÊME transformation à chacun (« trois d'affilée, selon la même
 *    méthode », README). Sans elle, un `hope-hope-hope` se traitait morceau
 *    après morceau sans qu'on voie jamais le découpage ;
 *  · `alphabet` — la réglette alphabétique numérotée, sur le modèle du clavier :
 *    la lettre s'envole vers son rang, et le rang en redescend.
 */
export const OP_NAMES = Object.freeze([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'alphabet',
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
  countStrokes: 3000,
  keyboard: 2400,
  annotate: 800,
  pulse: 600,
  reveal: 1400,
  wait: 900,
  partition: 1800,
  alphabet: 2800,
});

/** `kind` des tokens — vocabulaire fermé (recherche §2.2). */
export const KINDS = Object.freeze([
  'letter', 'digit', 'number', 'sep', 'scheme', 'punct', 'space',
  'operator', 'annotation', 'ghost',
]);

/** Courbes par défaut. */
export const EASE = Object.freeze({
  move: 'cubic-bezier(.4,0,.2,1)',
  fade: 'cubic-bezier(.4,0,.6,1)',
  pop: 'cubic-bezier(.34,1.4,.64,1)',
  linear: 'linear',
});

/**
 * Préfixe réservé aux nœuds fabriqués par le moteur (halos, accolades, badges,
 * segments, marqueurs…). Un `id` de scénario ne peut jamais commencer par `@`.
 */
export const ENGINE_PREFIX = '@';

/** Identifiant du groupe caméra (CONTRACTS §3.2 règle 6 : jamais d'animation du viewBox). */
export const CAMERA_ID = '@camera';

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
  fg: '#EFE6D4',
  fg2: '#B9AF9B',
  fg3: '#8E8575',
  rubric: '#F0574B',
  gold: '#E3B341',
  phos: '#5BE3A6',
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

/** Canaux animés — propriétés individuelles uniquement (CONTRACTS §3.2 règle 3). */
export const PROPS = Object.freeze([
  'translate', 'rotate', 'scale', 'opacity', 'fill', 'stroke',
  'strokeDashoffset', 'r',
]);
