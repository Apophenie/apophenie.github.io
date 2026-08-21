/** Le lecteur du logo — la révélation, déroulée pas à pas.
 *
 *  L'auteur veut que le logo se navigue **exactement comme une démonstration** :
 *  début · précédent · lecture/pause · suivant · fin, et la jauge segmentée —
 *  ici quatre segments, un par étape. Ce module fournit donc au logo l'API du
 *  lecteur figée par CONTRACTS §3.3, à l'identique :
 *
 *    total · bounds · steps · currentTime · stepIndex · playing · atStart ·
 *    atEnd · atHinge · state
 *    toStart() prev() next() toEnd() play() pause() seek(ms) seekToStep(i)
 *    rebuild() destroy() on('change'|'stepenter'|'end')
 *
 *  Ce qui est RÉUTILISÉ tel quel, sans copie :
 *    · `src/visuel/nav.js` — l'automate de navigation. C'est lui, et lui seul,
 *      qui décide ce que fait « précédent » (début de l'étape en cours, ou de
 *      la précédente si on est déjà à la charnière) et « suivant ». Le lecteur
 *      ne fait qu'exécuter les intentions qu'il produit ;
 *    · `src/visuel/clock.js` — le canal rAF ;
 *    · `src/app/transport.js` — la barre de contrôles et la jauge, à l'octet
 *      près celles des démonstrations ;
 *    · le modèle d'exécution de `src/visuel/player.js` — animations WAAPI
 *      partageant `document.timeline`, `startTime` commun imposé à la lecture,
 *      `seek(t)` qui se réduit à poser `currentTime` sur chacune.
 *
 *  Ce qui DIFFÈRE de `createPlayer()`, et pourquoi ce module existe :
 *  `createPlayer()` **fabrique** sa scène à partir des `tokens` d'un
 *  `Scenario` — des glyphes de texte à chasse fixe posés par le moteur de
 *  layout, chacun à plat dans une couche, avec `transform-box: fill-box` et
 *  `transform-origin: center` imposés (CONTRACTS §3.2, règle 4). Le logo n'est
 *  rien de tout ça : c'est un tracé vectoriel baké depuis les contours de
 *  Jost*, servi **inline dans index.html** (le logo est le titre de niveau 1,
 *  la page doit rester lisible sans JavaScript), avec des groupes **emboîtés**
 *  — la barre du k orbite dans un repère qui glisse lui-même — et des
 *  `transform-origin` posés en coordonnées `view-box`, point par point. Les
 *  animations, elles, sont déjà là : ce sont les `@keyframes` produites par
 *  `.planning/research/proto/logo-jost-trace.py`, seule source de vérité du
 *  logo.
 *
 *  Une animation CSS est un objet `Animation` comme un autre : on la récupère
 *  par `getAnimations()`, on la met en pause, on lui pose son `currentTime`.
 *  Le scrubbing est donc **le vrai**, pas une imitation — même mécanique que
 *  `WaapiEngine`. Ce module est le moteur d'exécution ; l'automate, la
 *  sémantique des boutons et l'UI, eux, sont ceux du moteur visuel.
 *
 *  Mouvement réduit : il n'y a plus de trajet à parcourir (la feuille de style
 *  ramène `--cho` à 1 ms et le logo saute à l'état d'arrivée). Le lecteur
 *  n'est alors pas construit du tout — `creerLecteurLogo` rend `null`.
 */

import { EPS } from '../visuel/constants.js';
import * as nav from '../visuel/nav.js';
import { createTicker } from '../visuel/clock.js';

/** Durée nominale de la chorégraphie, en ms — miroir de `CHO` du générateur. */
export const CHO_NOMINAL = 3500;

/**
 * Les quatre étapes, dans l'ordre de l'aller. Les durées sont celles de
 * `ETAPES` dans `logo-jost-trace.py` : ce module ne les invente pas, il les
 * répète. Elles sont mises à l'échelle de la valeur réellement calculée de
 * `--cho`, pour qu'un réglage de feuille de style n'ait pas à être répété ici.
 *
 * L'étape ③ est la seule où trois choses bougent ensemble : c'est voulu, elles
 * sont indissociables. L'étape ④ est la seule où quelque chose APPARAÎT : les
 * deux barres du k n'existent pas avant, elles naissent couchées dans le fût
 * et s'y ouvrent au compas. Cet instant-là est atteignable par `seek()` comme
 * n'importe quel autre — il n'est pas un effet, c'est un palier de plus.
 */
export const ETAPES_LOGO = Object.freeze([
  Object.freeze({ id: 'place-h', ms: 1000, cle: 'logo.etapes.h' }),
  Object.freeze({ id: 'place-l', ms: 1000, cle: 'logo.etapes.l' }),
  Object.freeze({ id: 'orbite', ms: 1000, cle: 'logo.etapes.e' }),
  // `bras-k` est un identifiant public (CONTRACTS §3.3, et les tests s'y
  // appuient) : il reste tel quel, même si le round 9 parle de « barres ».
  Object.freeze({ id: 'bras-k', ms: 500, cle: 'logo.etapes.k' }),
]);

/**
 * Le découpage en steps et en charnières, pour une durée totale donnée.
 * Fonction **pure** : c'est elle que les tests déroulent, sans DOM.
 *
 * @param {number} [total] durée réelle de `--cho`, en ms
 * @param {(cle:string, i:number)=>string} [titre] traducteur d'intitulé
 * @returns {{steps:object[], bounds:number[], total:number}}
 */
export function construireEtapes(total = CHO_NOMINAL, titre = (cle) => cle) {
  const nominal = ETAPES_LOGO.reduce((s, e) => s + e.ms, 0);
  const utile = Number.isFinite(total) && total > 0 ? total : CHO_NOMINAL;
  const bounds = [0];
  const steps = [];
  let t0 = 0;
  ETAPES_LOGO.forEach((etape, i) => {
    // On répartit au prorata et on ferme sur `utile` : sommer des durées
    // arrondies laisserait la dernière charnière à côté du total, et
    // `atEnd` — donc le grisage de « Fin » — deviendrait faux.
    const t1 = i === ETAPES_LOGO.length - 1
      ? utile
      : Math.round((t0 + etape.ms * utile / nominal) * 1000) / 1000;
    bounds.push(t1);
    steps.push({
      index: i,
      id: etape.id,
      title: titre(etape.cle, i),
      caption: null,
      t0,
      t1,
      duration: t1 - t0,
      hold: 0,
    });
    t0 = t1;
  });
  return { steps, bounds, total: utile };
}

/**
 * @param {SVGSVGElement} svg le `<svg class="logo">` déjà porteur de `logo--revele`
 * @param {{titre?:Function, autoplay?:boolean}} [options]
 * @returns {object|null} le lecteur, ou `null` si le mouvement est réduit
 */
export function creerLecteurLogo(svg, options = {}) {
  const total = dureeChoregraphie(svg);
  // Sous ce seuil, la feuille de style a déjà escamoté le trajet (`--cho:1ms`,
  // mouvement réduit) : il n'y a rien à dérouler, donc pas de lecteur.
  if (!(total > 4 * EPS)) return null;
  return new LecteurLogo(svg, total, options);
}

/** La durée de la chorégraphie, telle que la feuille de style la déclare. */
export function dureeChoregraphie(svg) {
  if (typeof getComputedStyle !== 'function') return CHO_NOMINAL;
  const brut = getComputedStyle(svg).getPropertyValue('--cho');
  const ms = /ms\s*$/.test(brut.trim()) ? parseFloat(brut) : parseFloat(brut) * 1000;
  return Number.isFinite(ms) && ms > 0 ? ms : CHO_NOMINAL;
}

class LecteurLogo {
  constructor(svg, total, options) {
    this.svg = svg;
    this.options = { autoplay: true, titre: (cle) => cle, ...options };
    this.listeners = new Map();
    this.destroyed = false;
    this._lastStep = -1;
    this._surRepos = null;

    const decoupe = construireEtapes(total, this.options.titre);
    this._steps = decoupe.steps;
    this._bounds = decoupe.bounds;
    this._total = decoupe.total;

    this._collecter();
    this._ticker = createTicker(() => this._tick());
    this.engine.seek(0);
    this._render();
    if (this.options.autoplay) this._tryAutoplay();
  }

  // -- état (miroir exact de CONTRACTS §3.3) ---------------------------------

  get total() { return this._total; }

  get bounds() { return this._bounds; }

  get steps() { return this._steps; }

  get reduced() { return false; }

  get currentTime() { return this.engine ? this.engine.currentTime : 0; }

  get playing() { return this.engine ? this.engine.playing : false; }

  get stepIndex() { return nav.stepIndexAt(this.bounds, this.currentTime); }

  get atStart() { return nav.atStart(this.currentTime); }

  get atEnd() { return nav.atEnd(this.currentTime, this.total); }

  get atHinge() { return nav.atHinge(this.currentTime, this.bounds); }

  get step() { return this.steps[this.stepIndex] || null; }

  get state() {
    return {
      ...nav.controlsState({
        t: this.currentTime, playing: this.playing, bounds: this.bounds, total: this.total,
      }),
      t: this.currentTime,
      total: this.total,
      step: this.step,
      reduced: false,
    };
  }

  // -- commandes -------------------------------------------------------------

  toStart() { return this._apply('toStart'); }

  prev() { return this._apply('prev'); }

  next() { return this._apply('next'); }

  toEnd() { return this._apply('toEnd'); }

  play() { return this._apply('play'); }

  pause() { return this._apply('pause'); }

  seek(ms) { return this._apply('seek', ms); }

  seekToStep(i) { return this._apply('seekToStep', i); }

  /**
   * Rembobine la révélation — le trajet parcouru, repassé à l'envers.
   *
   * Ce n'est PAS la fermeture. La fermeture (`fermeture` + `ret-*`, ordre
   * 1-2-4-3) part de l'état pleinement révélé : la jouer alors qu'on n'y est
   * pas encore arrivé fait sauter le logo à l'arrivée avant de refermer —
   * mesuré à 68 px de saut et une barre qui se téléporte d'un côté à l'autre
   * du e si on referme au bout de 200 ms. Quand la révélation est INACHEVÉE,
   * on défait donc ce qu'on vient de faire, et rien d'autre : aucune
   * discontinuité, et la contrainte qui fonde l'ordre 1-2-4-3 est respectée
   * gratuitement (interrompu pendant ④, on referme les deux barres du k et on
   * les efface avant de rendre le fût à son orbite — c'est ce que faire marche
   * arrière veut dire).
   *
   * @param {Function} [surRepos] appelé une fois revenu à t = 0
   */
  rembobiner(surRepos = () => {}) {
    if (this.destroyed) return this;
    if (this.atStart) { surRepos(); return this; }
    this._surRepos = surRepos;
    this.engine.rembobiner();
    this._ticker.start();
    this._render();
    return this;
  }

  /** Aucune logique propre : l'automate décide, le lecteur exécute. */
  _apply(action, arg) {
    if (this.destroyed) return this;
    const intent = nav.transition(action, {
      t: this.currentTime, playing: this.playing, bounds: this.bounds, total: this.total,
    }, arg);
    if (intent.noop) return this;
    if (intent.pause) this.engine.pause();
    if (intent.seek !== undefined) this.engine.seek(intent.seek);
    if (intent.play) {
      this.engine.play();
      this._ticker.start();
    }
    if (intent.pause || (!intent.play && intent.seek !== undefined)) this._ticker.stop();
    this._render();
    return this;
  }

  // -- événements ------------------------------------------------------------

  on(name, cb) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(cb);
    return () => this.off(name, cb);
  }

  off(name, cb) {
    const set = this.listeners.get(name);
    if (set) set.delete(cb);
  }

  emit(name, payload) {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const cb of [...set]) {
      try { cb(payload); } catch (err) { console.error(`[nhl-logo] écouteur « ${name} » :`, err); }
    }
  }

  // -- cycle de vie ----------------------------------------------------------

  /**
   * Les `@keyframes` CSS ont été détruites puis recréées (changement de thème,
   * de largeur, de langue) : on reprend la main dessus en conservant `t`.
   */
  rebuild() {
    if (this.destroyed) return this;
    const t = this.currentTime;
    const enLecture = this.playing;
    this.engine.destroy();
    this._collecter();
    this.engine.seek(Math.min(t, this.total));
    if (enLecture) { this.engine.play(); this._ticker.start(); }
    this._render();
    return this;
  }

  /**
   * Rend la main au CSS. Les animations CSS ne sont **pas** annulées : elles
   * appartiennent à la feuille de style, pas à nous. On les relâche
   * simplement — le retrait de la classe `logo--revele` par `logo.js` les
   * emportera. Les annuler ferait sauter le logo à l'état de repos avant que
   * la fermeture n'ait eu le temps de se jouer.
   */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this._ticker) this._ticker.stop();
    if (this.engine) this.engine.destroy();
    this.listeners.clear();
  }

  // -- construction ----------------------------------------------------------

  _collecter() {
    this.engine = new MoteurCss(this.svg, this._total);
    this._lastStep = -1;
  }

  _tick() {
    this._render();
    if (this._surRepos && this.currentTime <= EPS) {
      const fini = this._surRepos;
      this._surRepos = null;
      this.engine.pause();
      this.engine.seek(0);
      this._ticker.stop();
      this._render();
      fini();
      return;
    }
    if (this.playing && this.currentTime >= this.total - EPS) {
      this.engine.pause();
      this.engine.seek(this.total);
      this._ticker.stop();
      this._render();
      this.emit('end', { t: this.total });
    }
  }

  _render() {
    const i = nav.stepIndexAt(this.bounds, this.currentTime);
    if (i !== this._lastStep) {
      this._lastStep = i;
      this.emit('stepenter', { stepIndex: i, step: this.steps[i] || null });
    }
    this.emit('change', this.state);
  }

  /**
   * CONTRACTS §3.4 — l'autoplay ne se déclenche jamais dans un onglet en
   * arrière-plan. Ici le lecteur naît d'un clic sur le logo : le focus et la
   * visibilité sont acquis par construction, on ne vérifie donc que l'onglet.
   * Il est consommé une seule fois puisqu'il n'y a qu'une naissance.
   */
  _tryAutoplay() {
    const doc = typeof document !== 'undefined' ? document : null;
    if (doc && doc.visibilityState === 'hidden') return;
    this.play();
  }
}

/**
 * Le moteur d'exécution : les `@keyframes` du logo, mises en pause et
 * promenées à la main. Même modèle que `WaapiEngine` de `src/visuel/player.js`.
 */
class MoteurCss {
  constructor(svg, total) {
    this.total = total;
    this._playing = false;
    // `getAnimations({subtree:true})` rend AUSSI les transitions en cours (les
    // fantômes de l'éveil, les filets). Une `CSSTransition` n'a pas
    // d'`animationName` : c'est le seul critère fiable pour ne garder que la
    // chorégraphie, et il ne dépend d'aucun nom de @keyframes.
    const toutes = typeof svg.getAnimations === 'function'
      ? svg.getAnimations({ subtree: true })
      : [];
    this.animations = toutes.filter((a) => typeof a.animationName === 'string' && a.animationName);
    for (const a of this.animations) {
      a.pause();
      // Sans `persist()`, WAAPI supprime les animations recouvertes
      // (`replaceState → "removed"`) et le retour arrière casse.
      if (typeof a.persist === 'function') a.persist();
    }
    this.clock = makeClock(total);
    this.all = this.clock ? [this.clock, ...this.animations] : this.animations;
  }

  get currentTime() {
    const a = this.clock || this.animations[0];
    if (!a) return 0;
    const v = a.currentTime;
    return v === null || v === undefined ? 0 : Number(v);
  }

  get playing() { return this._playing; }

  seek(t) {
    const v = clamp(t, 0, this.total);
    for (const a of this.all) { try { a.currentTime = v; } catch { /* animation morte */ } }
  }

  play() {
    const t = this.currentTime;
    const base = timelineNow();
    for (const a of this.all) {
      // `play()` seul rembobinerait toute animation déjà terminée : on impose
      // un `startTime` commun, comme le prototype WAAPI l'a établi.
      a.play();
      try { a.startTime = base - t; } catch { /* moteur strict */ }
    }
    this._playing = true;
  }

  pause() {
    for (const a of this.all) {
      try { a.pause(); a.playbackRate = 1; } catch { /* animation morte */ }
    }
    this._playing = false;
  }

  /**
   * Marche arrière. `playbackRate = -1` plutôt qu'une seconde animation : le
   * trajet repassé est EXACTEMENT celui qui vient d'être parcouru, courbes
   * comprises. Le `startTime` commun se calcule pour un taux de −1 —
   * `currentTime = (timelineTime − startTime) · taux`, donc `base + t`.
   */
  rembobiner() {
    const t = this.currentTime;
    const base = timelineNow();
    for (const a of this.all) {
      try {
        a.playbackRate = -1;
        a.currentTime = t;
        a.play();
        a.startTime = base + t;
      } catch { /* moteur strict : la lecture inverse suffit */ }
    }
    this._playing = true;
  }

  destroy() {
    this.pause();          // remet aussi playbackRate à 1
    if (this.clock) { try { this.clock.cancel(); } catch { /* ignore */ } }
    // Les CSSAnimations ne sont PAS annulées : elles appartiennent au CSS.
    this.animations = [];
    this.all = [];
  }
}

/** Horloge maîtresse : une animation sans effet visuel, de la durée totale. */
function makeClock(total) {
  const timing = { duration: Math.max(1, total), fill: 'forwards' };
  try {
    const anim = new Animation(new KeyframeEffect(null, null, timing), document.timeline);
    anim.pause();
    if (typeof anim.persist === 'function') anim.persist();
    return anim;
  } catch { /* moteur sans KeyframeEffect à cible nulle */ }
  return null;
}

function timelineNow() {
  if (typeof document !== 'undefined' && document.timeline && document.timeline.currentTime != null) {
    return Number(document.timeline.currentTime);
  }
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}
