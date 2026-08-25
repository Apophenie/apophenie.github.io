/**
 * `createPlayer()` — WAAPI + automate de navigation.
 *
 * Modèle (recherche §1.3, validé par `proto/waapi-scrub.html`) :
 * `GroupEffect` n'existe dans aucun navigateur ; on synthétise donc le groupe.
 * Chaque animation couvre **son propre segment** et est décalée sur la timeline
 * globale par `delay = t0 du step`. Toutes partagent `document.timeline`, donc
 * `seek(t)` se réduit à `for (const a of anims) a.currentTime = t`.
 *
 * Les deux pièges trouvés par le prototype sont ici des règles absolues :
 *   • `fill: 'forwards'` et **jamais** `'both'` — avec `'both'`, une animation
 *     tardive rétro-remplit sa keyframe de départ dès t=0 et, plus récente dans
 *     l'ordre de composition, écrase les steps antérieurs ;
 *   • `persist()` sur **chaque** animation — sinon WAAPI supprime les animations
 *     recouvertes (`replaceState → "removed"`) et le retour arrière casse.
 *
 * L'UI est un **pur reflet** de ce lecteur (CONTRACTS §3.3) : elle n'a aucune
 * logique propre, elle s'abonne à `change`.
 */

import { EPS, VIEWBOX, PALETTE, CAMERA_ID, PAN_ID, FONT_FAMILY } from './constants.js';
import { compile } from './compile.js';
import { defaultMetrics, defaultLayoutOptions } from './layout.js';
import {
  createElementFor, applyBase, applyProp, applyDiscrete, formatValue, layerOf, el, LAYERS,
  valeurUtilisable, masquerSansPosition, enchainer, porteurDe, contenuDe, nomCss, ORIGINE_CAMERA,
} from './dom.js';
import { resolveDiscrete, createTicker } from './clock.js';
import * as nav from './nav.js';

/**
 * @param {SVGSVGElement} svgRoot
 * @param {object} scenario
 * @param {{reducedMotion?:'auto'|'force'|'off', speed?:number, repeatSpeed?:number, autoplay?:boolean,
 *          glyphes?:object, palette?:object, viewBox?:object}} [options]
 */
export function createPlayer(svgRoot, scenario, options = {}) {
  return new Player(svgRoot, scenario, options);
}

class Player {
  constructor(svgRoot, scenario, options) {
    if (!svgRoot || typeof svgRoot.appendChild !== 'function') {
      throw new TypeError('createPlayer : premier argument attendu — l\'élément <svg> racine de la scène.');
    }
    this.svg = svgRoot;
    this.scenario = scenario;
    this.options = {
      reducedMotion: 'auto',
      speed: 1,
      // Facteur appliqué aux SEULES étapes qui redisent une étape déjà jouée
      // (voir `compile.js`, bloc « Répétitions »). 1 = aucune accélération.
      repeatSpeed: 1,
      autoplay: true,
      // Condition supplémentaire, fournie par l'appelant : voir `_tryAutoplay`.
      autoplayQuand: null,
      ...options,
    };
    this.listeners = new Map();
    this.elements = new Map();
    this.autoplayConsumed = false;
    this.fontsReady = false;
    this.destroyed = false;
    this._lastStep = -1;
    this._appliedDiscrete = new Set();
    this._disposers = [];

    this.viewBox = this.options.viewBox || VIEWBOX;
    this.metrics = this.options.metrics || defaultMetrics();

    this._prefersReduced = matchReduced();
    this._hasWaapi = detectWaapi();

    this._prepareRoot();
    this._buildAll();
    this._installEnvironment();
  }

  // -- état ------------------------------------------------------------------

  get total() { return this.timeline ? this.timeline.total : 0; }

  get bounds() { return this.timeline ? this.timeline.bounds : [0]; }

  get steps() { return this.timeline ? this.timeline.steps : []; }

  get warnings() { return this.timeline ? this.timeline.warnings : []; }

  get reduced() { return this.timeline ? this.timeline.reduced : false; }

  get currentTime() { return this.engine ? this.engine.currentTime : 0; }

  get playing() { return this.engine ? this.engine.playing : false; }

  get stepIndex() { return nav.stepIndexAt(this.bounds, this.currentTime); }

  get atStart() { return nav.atStart(this.currentTime); }

  get atEnd() { return nav.atEnd(this.currentTime, this.total); }

  get atHinge() { return nav.atHinge(this.currentTime, this.bounds); }

  get step() { return this.steps[this.stepIndex] || null; }

  /** Instantané destiné à l'UI — un pur reflet, recalculé à chaque `change`. */
  get state() {
    return {
      ...nav.controlsState({ t: this.currentTime, playing: this.playing, bounds: this.bounds, total: this.total }),
      t: this.currentTime,
      total: this.total,
      step: this.step,
      reduced: this.reduced,
    };
  }

  // -- commandes (miroir exact de l'automate, CONTRACTS §3.3) ----------------

  toStart() { return this._apply('toStart'); }

  prev() { return this._apply('prev'); }

  next() { return this._apply('next'); }

  /** Bouton « Fin » — CONTRACTS §0.4 (sans lui, atteindre le 666 demande n clics). */
  toEnd() { return this._apply('toEnd'); }

  play() { return this._apply('play'); }

  pause() { return this._apply('pause'); }

  seek(ms) { return this._apply('seek', ms); }

  seekToStep(i) { return this._apply('seekToStep', i); }

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

  /** @param {'change'|'stepenter'|'end'|'ready'} name */
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
      try { cb(payload); } catch (err) { console.error(`[nhl-visuel] écouteur « ${name} » :`, err); }
    }
  }

  // -- cycle de vie ----------------------------------------------------------

  /**
   * Recompile layout et timeline en conservant `t` et `playing`
   * (redimensionnement, changement de thème, recalibrage de police).
   */
  rebuild(patch = {}) {
    if (this.destroyed) return this;
    const t = this.currentTime;
    const wasPlaying = this.playing;
    Object.assign(this.options, patch);
    this._teardownScene();
    this._buildAll();
    this.engine.seek(Math.min(t, this.total));
    if (wasPlaying) { this.engine.play(); this._ticker.start(); }
    this._render();
    return this;
  }

  /** Changement de scénario (navigation d'URL) : nouvelle démonstration, autoplay ré-autorisé. */
  setScenario(scenario) {
    this.scenario = scenario;
    this.autoplayConsumed = false;
    this._teardownScene();
    this._buildAll();
    this.engine.seek(0);
    this._render();
    this._tryAutoplay();
    return this;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const dispose of this._disposers) dispose();
    this._disposers = [];
    this._teardownScene();
    this.listeners.clear();
  }

  // -- construction ----------------------------------------------------------

  _prepareRoot() {
    const vb = this.viewBox;
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    // CONTRACTS §6 : la scène est aria-hidden ; « Le Registre » est l'équivalent
    // accessible obligatoire et le repli si le moteur visuel échoue.
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.setAttribute('focusable', 'false');
  }

  _readPalette() {
    const palette = { ...PALETTE, ...(this.options.palette || {}) };
    if (typeof getComputedStyle !== 'function') return palette;
    const cs = getComputedStyle(this.svg);
    // WAAPI n'interpole pas `var(--gold)` de façon fiable : on résout les
    // couleurs **à la compilation**, ce qui impose un rebuild au changement de thème.
    for (const [key, cssVar] of Object.entries({
      fg: '--fg', fg2: '--fg-2', fg3: '--fg-3', rubric: '--rubric',
      gold: '--gold', phos: '--phos', line: '--line', lineUi: '--line-ui',
      raised: '--raised', surface: '--surface',
    })) {
      const v = cs.getPropertyValue(cssVar).trim();
      if (v) palette[key] = v;
    }
    return palette;
  }

  /**
   * ★ Il n'y a plus de rupture de layout.
   *
   * Il y en avait une : sous 760 px de large, la ligne repassait sur plusieurs
   * lignes plutôt que de laisser rétrécir le texte (recherche §5.2). La
   * doctrine a changé — **jamais deux lignes**. Une séquence trop large ne se
   * replie pas, elle **défile**, et le compilateur garde l'action au centre
   * (voir `defilement.js`). Le layout est donc le même à toutes les largeurs :
   * une seule ligne, centrée, en unités viewBox — et le responsive redevient ce
   * que `research/moteur-visuel.md §5.2` promettait d'abord, un simple
   * changement d'échelle, sans recompilation aux ruptures.
   */
  _layoutOptions() {
    return defaultLayoutOptions(this.metrics, this.viewBox);
  }

  _buildAll() {
    const reduced = this.options.reducedMotion === 'force'
      || (this.options.reducedMotion !== 'off' && (this._prefersReduced || !this._hasWaapi));

    this.timeline = compile(this.scenario, {
      speed: this.options.speed,
      repeatSpeed: this.options.repeatSpeed,
      reduced,
      metrics: this.metrics,
      layoutOpts: this._layoutOptions(),
      palette: this._readPalette(),
      glyphes: this.options.glyphes,
      viewBox: this.viewBox,
    });
    for (const w of this.timeline.warnings) console.warn(`[nhl-visuel] ${w}`);

    this._buildDom();
    this.engine = this._hasWaapi
      ? new WaapiEngine(this.timeline, this.elements)
      : new StaticEngine(this.timeline, this.elements);
    this._ticker = createTicker(() => this._tick());
    this._lastStep = -1;
    this.engine.seek(0);
    this._render();
  }

  _buildDom() {
    const root = el('g', { class: 'nhl-scene' });
    // Règle 6 : jamais d'animation de l'attribut viewBox — on anime la caméra.
    // Elle a la même chaîne de position que les tokens (dom.js `enchainer`), à
    // ceci près que son repère de transformation est le `viewBox` entier : un
    // recul de caméra doit reculer AUTOUR DU CENTRE DE LA SCÈNE, pas autour du
    // centre de ce qui s'y trouve à cet instant.
    const vue = el('g', { class: 'nhl-camera-vue' });
    const chaine = enchainer(vue, { origine: ORIGINE_CAMERA });
    const camera = chaine.racine;
    camera.setAttribute('class', 'nhl-camera');
    camera.setAttribute('data-nhl-id', CAMERA_ID);

    // Le groupe de DÉFILEMENT, imbriqué DANS le contenu de la caméra. C'est lui
    // qui fait glisser la ligne pour garder l'action au centre quand la
    // séquence dépasse la largeur de la scène (`defilement.js`). L'ordre
    // d'imbrication n'est pas indifférent : le recul de caméra s'applique
    // APRÈS, autour du centre du viewBox, si bien qu'un zoom ne défait jamais
    // un défilement (voir `constants.PAN_ID`).
    const panVue = el('g', { class: 'nhl-pan-vue' });
    const pan = enchainer(panVue).racine;
    pan.setAttribute('class', 'nhl-pan');
    pan.setAttribute('data-nhl-id', PAN_ID);
    vue.appendChild(pan);

    const layers = {};
    for (const name of LAYERS) {
      layers[name] = el('g', { class: `nhl-layer nhl-layer-${name}` });
      panVue.appendChild(layers[name]);
    }
    root.appendChild(camera);

    this.elements.clear();
    this.elements.set(CAMERA_ID, camera);
    applyBase(camera, this.timeline.scene.get(CAMERA_ID));
    this.elements.set(PAN_ID, pan);
    applyBase(pan, this.timeline.scene.get(PAN_ID));

    for (const node of this.timeline.nodes) {
      if (node.id === CAMERA_ID || node.id === PAN_ID) continue;
      const element = createElementFor(node, { metrics: this.timeline.metrics, palette: this.timeline.palette });
      applyBase(element, node);
      layers[layerOf(node.role)].appendChild(element);
      this.elements.set(node.id, element);
    }

    this._root = root;
    this.svg.appendChild(root);
  }

  _teardownScene() {
    if (this._ticker) this._ticker.stop();
    if (this.engine) this.engine.destroy();
    if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root);
    this._root = null;
    this.elements.clear();
    this._appliedDiscrete = new Set();
  }

  // -- rendu -----------------------------------------------------------------

  _tick() {
    this._render();
    if (this.playing && this.currentTime >= this.total - EPS) {
      this.engine.pause();
      this.engine.seek(this.total);
      this._ticker.stop();
      this._render();
      this.emit('end', { t: this.total });
    }
  }

  _render() {
    const t = this.currentTime;
    this._renderDiscrete(t);
    const i = nav.stepIndexAt(this.bounds, t);
    if (i !== this._lastStep) {
      this._lastStep = i;
      this.emit('stepenter', { stepIndex: i, step: this.steps[i] || null });
    }
    this.emit('change', this.state);
  }

  /**
   * Canal discret : fonctions pures de `t`, appliquées aussi après chaque seek —
   * c'est ce qui garantit que `seek(t)` donne exactement le même rendu quel que
   * soit le chemin parcouru (recherche §1.4).
   */
  _renderDiscrete(t) {
    const resolved = resolveDiscrete(this.timeline.discreteIndex, t);
    for (const key of this._appliedDiscrete) {
      if (resolved.has(key)) continue;
      const [id, channel] = key.split('::');
      const element = this.elements.get(id);
      const node = this.timeline.scene.get(id);
      if (element && node && channel === 'text') applyDiscrete(element, channel, node.text);
    }
    for (const [key, { entry, value }] of resolved) {
      const element = this.elements.get(entry.id);
      if (element) applyDiscrete(element, entry.channel, value);
      void key;
    }
    this._appliedDiscrete = new Set(resolved.keys());
  }

  // -- environnement : polices, autoplay, visibilité, redimensionnement ------

  _installEnvironment() {
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;

    // Règle 8 : attendre `document.fonts.ready` avant toute mesure. Les métriques
    // nominales de JetBrains Mono servent d'amorce ; on recalibre ensuite, et on
    // recompile si l'écart est significatif.
    const fonts = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    fonts.then(() => {
      if (this.destroyed) return;
      this.fontsReady = true;
      this._calibrate();
      this.emit('ready', this.state);
      this._tryAutoplay();
    });

    const onVis = () => this._tryAutoplay();
    const onFocus = () => this._tryAutoplay();
    const onLoad = () => this._tryAutoplay();
    doc.addEventListener('visibilitychange', onVis);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      window.addEventListener('load', onLoad);
    }
    this._disposers.push(() => {
      doc.removeEventListener('visibilitychange', onVis);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('load', onLoad);
      }
    });

    // Redimensionnement : rebuild avec conservation de t et playing, debounce 150 ms.
    if (typeof ResizeObserver === 'function') {
      let timer = null;
      let lastW = this.svg.clientWidth;
      const ro = new ResizeObserver(() => {
        const w = this.svg.clientWidth;
        if (w === lastW) return;
        lastW = w;
        clearTimeout(timer);
        timer = setTimeout(() => { if (!this.destroyed) this.rebuild(); }, 150);
      });
      ro.observe(this.svg);
      this._disposers.push(() => { clearTimeout(timer); ro.disconnect(); });
    }

    // `prefers-reduced-motion` peut changer en cours de session.
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        this._prefersReduced = mq.matches;
        if (this.options.reducedMotion === 'auto') this.rebuild();
      };
      if (mq.addEventListener) {
        mq.addEventListener('change', onChange);
        this._disposers.push(() => mq.removeEventListener('change', onChange));
      }
    }
  }

  /** Mesure réelle de la chasse, une seule fois, après `document.fonts.ready`. */
  _calibrate() {
    const probe = el('text', {
      x: 0, y: 0, 'font-family': FONT_FAMILY,
      'font-size': this.metrics.fontSize, visibility: 'hidden',
    });
    probe.textContent = '0000000000';
    this.svg.appendChild(probe);
    let advance = null;
    try {
      if (typeof probe.getComputedTextLength === 'function') {
        const l = probe.getComputedTextLength();
        if (l > 0) advance = l / 10;
      }
    } catch { /* moteur sans mesure de texte : on garde la chasse nominale */ }
    probe.remove();
    if (!advance) return;
    const drift = Math.abs(advance - this.metrics.advance) / this.metrics.advance;
    if (drift > 0.005) {
      this.metrics = { ...this.metrics, advance };
      this.rebuild();
    }
  }

  /**
   * Autoplay — CONTRACTS §3.4. Consommé **une seule fois** :
   * `autoplayConsumed` passe à `true` AVANT de jouer.
   *
   * ★ `options.autoplayQuand` — une condition que le MOTEUR ne peut pas
   * connaître.
   *
   * L'auteur : « auto-play, mais seulement si la scène est visible ». Or ce
   * qu'il faut voir en entier, ce n'est pas la scène seule : c'est elle ET les
   * commandes, sans quoi la démonstration démarre sous les yeux de quelqu'un qui
   * ne sait pas encore qu'il peut la mettre en pause. Ces deux zones sont des
   * objets de l'INTERFACE (`app/pages/demonstration.js`), pas du moteur visuel :
   * celui-ci ne connaît que son `<svg>`. Il reçoit donc un prédicat plutôt qu'un
   * sélecteur — c'est l'appelant qui sait ce qu'il faut regarder, et le moteur
   * reste ignorant du DOM qui l'entoure (CONTRACTS §3.2).
   *
   * ★ Un prédicat qui refuse ne CONSOMME pas. Le mouvement réduit, lui,
   * consomme : c'est un choix de l'utilisateur, il ne changera pas d'avis en
   * changeant d'onglet. Une zone hors écran, si — d'où la différence de
   * traitement, qui n'est pas une inadvertance.
   */
  _tryAutoplay() {
    if (this.destroyed || this.autoplayConsumed || !this.options.autoplay) return;
    const doc = typeof document !== 'undefined' ? document : null;
    if (!doc) return;
    if (doc.readyState !== 'complete') return;
    if (!this.fontsReady) return;
    if (doc.visibilityState !== 'visible') return;
    if (typeof doc.hasFocus === 'function' && !doc.hasFocus()) return;
    if (this.reduced) { this.autoplayConsumed = true; return; }
    const quand = this.options.autoplayQuand;
    if (typeof quand === 'function' && !quand()) return;
    this.autoplayConsumed = true;
    this.play();
  }
}

// ---------------------------------------------------------------------------
// Moteurs d'exécution
// ---------------------------------------------------------------------------

/** Moteur nominal : WAAPI, un `KeyframeEffect` par segment. */
class WaapiEngine {
  constructor(timeline, elements) {
    this.timeline = timeline;
    this.animations = [];
    this._playing = false;

    // ★ CONTRACTS §3.2 règle 3 : un canal, un élément.
    //
    // L'animation n'est PAS montée sur la racine du nœud mais sur le maillon
    // qui porte son canal (`porteurDe`) : `translate` sur l'enveloppe de
    // position, `rotate` sur l'enveloppe de rotation, tout le reste sur
    // l'élément qui dessine. C'est ce qui met le défaut Firefox hors de portée
    // — l'élément que le compositeur promeut pour son opacité n'a plus aucune
    // position à perdre, ce sont ses ancêtres qui le placent (voir le long
    // commentaire de `dom.js`).
    for (const a of timeline.anims) {
      const element = elements.get(a.id);
      if (!element) continue;
      // ★ WAAPI ne passe PAS par `applyProp` : c'est la seule voie où une
      // coordonnée non finie serait encore blanchie en 0 par `formatValue`, et
      // le nœud sauterait à l'origine en pleine lecture. On la ferme ici aussi :
      // l'animation n'est pas montée, et le nœud est retiré de la vue.
      const fautive = a.keyframes.find((k) => !valeurUtilisable(a.prop, k.value));
      if (fautive) { masquerSansPosition(element, a.prop, fautive.value); continue; }
      const cible = porteurDe(element, a.prop);
      const nom = nomCss(a.prop);
      if (!cible || !nom || typeof cible.animate !== 'function') continue;
      const frames = a.keyframes.map((k) => ({ offset: k.offset, [nom]: formatValue(a.prop, k.value) }));
      const anim = cible.animate(frames, {
        delay: a.delay,
        duration: a.duration,
        easing: a.easing,
        fill: 'forwards', // JAMAIS 'both' — cf. en-tête de fichier
      });
      anim.pause();
      if (typeof anim.persist === 'function') anim.persist(); // critique au retour arrière
      this.animations.push(anim);
    }

    // L'horloge de repli (moteur sans `KeyframeEffect` à cible nulle) anime une
    // opacité constante. On l'accroche au CONTENU de la caméra, jamais à son
    // enveloppe de position : ce qu'elle promeut en couche ne doit rien porter
    // qui place la scène.
    this.clock = makeClock(timeline.total, contenuDe(elements.get(CAMERA_ID)));
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
    const v = clamp(t, 0, this.timeline.total);
    for (const a of this.all) a.currentTime = v;
  }

  play() {
    const t = this.currentTime;
    const base = timelineNow();
    for (const a of this.all) {
      // `play()` seul rembobinerait toute animation déjà terminée (auto-rewind) :
      // on impose donc un `startTime` commun, comme dans le prototype.
      a.play();
      try { a.startTime = base - t; } catch { /* moteur strict : la resynchro différée suffit */ }
    }
    this._playing = true;
    Promise.all(this.all.map((a) => a.ready.catch(() => null))).then(() => {
      if (!this._playing) return;
      const st = this.all[0] && this.all[0].startTime;
      if (st === null || st === undefined) return;
      for (const a of this.all) {
        if (a.startTime !== st) { try { a.startTime = st; } catch { /* ignore */ } }
      }
    });
  }

  pause() {
    for (const a of this.all) a.pause();
    this._playing = false;
  }

  destroy() {
    for (const a of this.all) { try { a.cancel(); } catch { /* ignore */ } }
    this.animations = [];
    this.all = [];
  }
}

/**
 * Repli sans WAAPI (Opera Mini, très vieux moteurs) — décision 11 de la
 * recherche : on réutilise le mode réduit, qui est déjà écrit. Les valeurs sont
 * appliquées de façon **discrète** : chaque segment saute à sa valeur d'arrivée.
 */
class StaticEngine {
  constructor(timeline, elements) {
    this.timeline = timeline;
    this.elements = elements;
    this._t = 0;
    this._playing = false;
    this._raf = null;
    this.byKey = new Map();
    for (const a of timeline.anims) {
      const key = `${a.id}::${a.prop}`;
      if (!this.byKey.has(key)) this.byKey.set(key, []);
      this.byKey.get(key).push(a);
    }
    for (const list of this.byKey.values()) list.sort((x, y) => x.delay - y.delay);
  }

  get currentTime() { return this._t; }

  get playing() { return this._playing; }

  seek(t) {
    this._t = clamp(t, 0, this.timeline.total);
    for (const [key, list] of this.byKey) {
      const id = key.slice(0, key.indexOf('::'));
      const prop = key.slice(key.indexOf('::') + 2);
      const element = this.elements.get(id);
      if (!element) continue;
      let chosen = null;
      for (const a of list) { if (a.delay <= this._t) chosen = a; else break; }
      if (!chosen) {
        const node = this.timeline.scene.get(id);
        if (node && node.base[prop] !== undefined && node.base[prop] !== null) applyProp(element, prop, node.base[prop]);
        continue;
      }
      const done = this._t >= chosen.delay + chosen.duration;
      const kf = chosen.keyframes;
      applyProp(element, prop, done ? kf[kf.length - 1].value : kf[0].value);
    }
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    let last = now();
    const loop = () => {
      if (!this._playing) return;
      const t = now();
      this.seek(this._t + (t - last));
      last = t;
      if (this._t >= this.timeline.total) { this._playing = false; return; }
      this._raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(loop) : null;
    };
    this._raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(loop) : null;
  }

  pause() {
    this._playing = false;
    if (this._raf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() { this.pause(); }
}

/**
 * Horloge maîtresse : une animation sans effet visuel, de la durée totale.
 * C'est elle qui porte `currentTime` pour tout le lecteur (recherche §1.4).
 */
function makeClock(total, fallbackElement) {
  const timing = { duration: Math.max(1, total), fill: 'forwards' };
  try {
    const anim = new Animation(new KeyframeEffect(null, null, timing), document.timeline);
    anim.pause();
    if (typeof anim.persist === 'function') anim.persist();
    return anim;
  } catch { /* moteur sans KeyframeEffect à cible nulle */ }
  if (!fallbackElement) return null;
  const anim = fallbackElement.animate([{ opacity: 1 }, { opacity: 1 }], timing);
  anim.pause();
  if (typeof anim.persist === 'function') anim.persist();
  return anim;
}

function detectWaapi() {
  return typeof Element !== 'undefined'
    && typeof Element.prototype.animate === 'function'
    && typeof Animation !== 'undefined'
    && typeof Animation.prototype.persist === 'function';
}

function matchReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function timelineNow() {
  if (typeof document !== 'undefined' && document.timeline && document.timeline.currentTime != null) {
    return Number(document.timeline.currentTime);
  }
  return now();
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}
