/** L'ORAGE SONORE — quatre sons, et beaucoup de précautions.
 *
 *  Quatre sons, tous CC0 (provenance, auteur et licence : `src/sons/
 *  CC0-sons.txt`, et le pied de page les cite comme il cite les polices) :
 *
 *    · `abime`    — l'ambiance lugubre, en boucle, sous toute la lecture ;
 *    · `effroi`   — le sursaut, quand des cornes poussent ;
 *    · `tonnerre` — le coup de foudre, au verdict ;
 *    · `brasier`  — le feu qui crépite, en boucle, à partir du verdict.
 *
 *  ══ TROIS DÉCISIONS, ET ELLES SE TIENNENT ═════════════════════════════════
 *
 *  ★ 1. LE SON EST COUPÉ PAR DÉFAUT.
 *
 *  Quatre raisons, dans l'ordre où elles pèsent :
 *
 *   a) **la démonstration s'autojoue** (CONTRACTS §3.4), sans le moindre clic.
 *      Un lien partagé qui, à l'ouverture, lâche un drone infernal dans une
 *      pièce est exactement l'agression qu'on veut éviter ;
 *   b) **de toute façon les navigateurs le bloquent** avant le premier geste.
 *      Un son « activé par défaut » ne se déclencherait donc que chez les gens
 *      qui ont cliqué ailleurs avant — c'est-à-dire au hasard. Un réglage dont
 *      l'effet dépend de ce que l'utilisateur a fait juste avant n'est pas un
 *      réglage, c'est une loterie ;
 *   c) WCAG 1.4.2 exige un moyen d'arrêter tout son automatique de plus de
 *      trois secondes. On l'a — mais ne pas en faire démarrer est plus simple
 *      et plus sûr que d'en permettre l'arrêt ;
 *   d) le pied de page promet « aucun cookie, aucune mesure d'audience, aucun
 *      appel réseau ». Un son qui part tout seul est de la même famille de
 *      surprise que ce que cette phrase promet de ne pas faire.
 *
 *  Le contrepoids : le bouton est à portée immédiate, dans la barre de
 *  transport, et le réglage SURVIT À LA NAVIGATION comme le thème et la langue
 *  (`reglages.js`). Qui le veut le demande une fois.
 *
 *  ★ 2. L'INTERFACE NE MENT JAMAIS SUR L'ÉTAT DU SON.
 *
 *  C'est le point dur. Trois états réels, pas deux :
 *
 *   · **coupé** — la préférence dit non ;
 *   · **actif** — la préférence dit oui, et le navigateur a laissé passer ;
 *   · **en attente d'un geste** — la préférence dit oui, mais le navigateur
 *     refuse encore. C'est le cas d'un visiteur qui revient : sa préférence
 *     est retrouvée, la page s'autojoue, et rien ne sort. Afficher « son
 *     activé » à cet instant serait un mensonge.
 *
 *  Le déblocage est donc MESURÉ, jamais supposé : on tente `play()` sur un
 *  élément muet et l'on regarde si la promesse aboutit. Tant qu'elle échoue,
 *  l'état reste « en attente », et le premier geste de l'utilisateur —
 *  n'importe lequel — relance la tentative.
 *
 *  ★ 3. UN `play()` REFUSÉ N'EST PAS UNE ERREUR.
 *
 *  Il lève une `NotAllowedError`, et c'est le comportement NORMAL avant le
 *  premier geste. Elle est donc absorbée sans bruit — pas de `console.error`,
 *  pas de bandeau : il n'y a rien à signaler, la politique du navigateur fait
 *  son travail. Toute autre erreur, en revanche, est réelle et se dit une fois.
 *
 *  ══ CE QUE LE SON NE FAIT PAS ═════════════════════════════════════════════
 *
 *  Il ne porte AUCUNE information seule (CONTRACTS §6). Tout ce qu'il souligne
 *  — le couronnement, le verdict — est écrit dans Le Registre, annoncé par la
 *  région live, et visible sur la scène. Couper le son ne retire rien de ce
 *  qui est démontré ; c'est bien pour ça que la version sobre existe.
 *
 *  ══ POURQUOI DES ÉLÉMENTS `<audio>` ET PAS L'API WEB AUDIO ════════════════
 *
 *  `decodeAudioData` réclame un `ArrayBuffer`, donc un `fetch` — bloqué en
 *  `file://`, où la version `dist/` doit tourner (CONTRACTS §0.1). Un élément
 *  `<audio>` avec une URL de données n'a pas ce problème, boucle nativement
 *  (`loop`), et se règle en volume. On n'a besoin de rien de plus.
 */

// Les quatre sons voyagent en URL DE DONNÉES, engendrées depuis les `.ogg` par
// `src/gfx/sons-base64.py` et vérifiées par `sons.test.js`. Le détour est
// expliqué en tête de `src/sons/data.js` ; en un mot : `bun run test` ne
// construit rien (CONTRACTS §0.1), et un `import` de binaire ferait tomber la
// suite entière, pas seulement le son.
import { abime, effroi, tonnerre, brasier } from '../sons/data.js';

import { sonActif, onReglages } from './reglages.js';

/** Le format servi, et le seul. Voir `src/sons/CC0-sons.txt` pour le pourquoi. */
const TYPE = 'audio/ogg; codecs=opus';

/**
 * Niveaux relatifs. Les fichiers sont déjà égalisés entre eux par `loudnorm`
 * (voir `CC0-sons.txt`) ; ce qui reste ici est le dosage de MISE EN SCÈNE —
 * de combien un fond doit se tenir sous un impact.
 */
const SOURCES = Object.freeze({
  abime: { url: abime, boucle: true, volume: 0.30 },
  brasier: { url: brasier, boucle: true, volume: 0.42 },
  tonnerre: { url: tonnerre, boucle: false, volume: 0.85 },
  effroi: { url: effroi, boucle: false, volume: 0.70 },
});

/** Le navigateur sait-il lire ce qu'on sert ? Mesuré, jamais supposé. */
export function formatLisible() {
  if (typeof Audio !== 'function') return false;
  try {
    // `canPlayType` rend '', 'maybe' ou 'probably'. Seul '' est un non.
    return new Audio().canPlayType(TYPE) !== '';
  } catch { return false; }
}

/**
 * Crée le joueur de sons d'une démonstration.
 *
 * @param {{registre?:string}} [options] — hors registre scénique, le joueur
 *   est un objet INERTE : il expose la même interface et ne charge rien. La
 *   version sobre n'a pas de son, et elle n'a pas non plus à porter 51 Ko
 *   d'éléments `<audio>` qu'elle ne jouera jamais.
 */
export function creerSons(options = {}) {
  const scenique = options.registre !== 'sobre';
  if (!scenique || !formatLisible()) return joueurInerte();

  /** @type {Map<string, HTMLAudioElement>} */
  const pistes = new Map();
  let debloque = false;
  let detruit = false;
  const auditeurs = new Set();
  const prevenir = () => { for (const f of [...auditeurs]) f(); };

  function piste(nom) {
    let el = pistes.get(nom);
    if (el) return el;
    const spec = SOURCES[nom];
    if (!spec) return null;
    el = new Audio();
    el.src = spec.url;
    el.preload = 'auto';
    el.loop = spec.boucle;
    el.volume = spec.volume;
    pistes.set(nom, el);
    return el;
  }

  /**
   * ★ Jouer, en absorbant le refus.
   *
   * Avant le premier geste, `play()` rend une promesse REJETÉE avec
   * `NotAllowedError`. Ce n'est pas une panne : c'est la politique du
   * navigateur qui s'applique, et elle a raison. On la note — pour que
   * l'interface puisse dire « en attente d'un geste » — et on ne dit rien
   * d'autre. Une exception non capturée ici remonterait en « Unhandled
   * promise rejection » dans la console de tout visiteur.
   */
  function jouer(el) {
    if (!el) return;
    const p = el.play();
    if (!p || typeof p.catch !== 'function') { marquerDebloque(true); return; }
    p.then(() => marquerDebloque(true)).catch((err) => {
      if (err && err.name === 'NotAllowedError') { marquerDebloque(false); return; }
      // Tout le reste est un vrai défaut, et il se dit une fois.
      console.warn('[NumHeroLOLgeek] son indisponible :', err && err.message);
    });
  }

  function marquerDebloque(v) {
    if (detruit || debloque === v) return;
    debloque = v;
    prevenir();
  }

  /**
   * ★ Le déverrouillage se TENTE sur le premier geste, quel qu'il soit.
   *
   * On ne demande pas à l'utilisateur de cliquer sur le bouton du son : tout
   * geste — lancer la lecture, appuyer sur une touche, toucher l'écran —
   * suffit au navigateur, donc doit suffire ici. La sonde est un `play()` sur
   * une piste réglée à zéro : elle ne fait aucun bruit, et sa réussite est
   * la seule preuve fiable qu'on soit débloqué.
   */
  function sonder() {
    if (detruit || debloque) return;
    const el = piste('effroi');
    if (!el) return;
    const v = el.volume;
    el.volume = 0;
    const p = el.play();
    const remettre = () => { try { el.pause(); el.currentTime = 0; el.volume = v; } catch { /* ignore */ } };
    if (!p || typeof p.catch !== 'function') { remettre(); marquerDebloque(true); return; }
    p.then(() => { remettre(); marquerDebloque(true); })
      .catch(() => { remettre(); marquerDebloque(false); });
  }

  const surGeste = () => sonder();
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(ev, surGeste, { passive: true });
  }
  // Un premier essai à froid : si l'onglet a déjà reçu un geste (navigation
  // interne par lien), le son est déjà autorisé et l'interface doit le savoir
  // sans attendre que l'utilisateur touche quoi que ce soit.
  sonder();

  /**
   * ★ Arrêter est IDEMPOTENT, et ce n'est pas une coquetterie.
   *
   * `brancherSons` remet les fonds à jour sur chaque `change` du lecteur —
   * c'est-à-dire soixante fois par seconde pendant la lecture. Sans ce garde,
   * une piste déjà arrêtée se voyait repauser et remettre à zéro à chaque
   * image : mesuré au navigateur, quinze `pause()` en 400 ms sur une scène qui
   * ne faisait rien. Aucun effet audible, mais du travail pour rien et un
   * `currentTime` réécrit sans cesse — le genre de chose qui finit par
   * s'entendre le jour où quelqu'un ajoute un fondu.
   */
  const arreter = (nom) => {
    const el = pistes.get(nom);
    if (!el || el.paused) return;
    try { el.pause(); el.currentTime = 0; } catch { /* ignore */ }
  };

  return {
    get disponible() { return true; },
    get debloque() { return debloque; },
    get actif() { return sonActif(); },

    /** Un son ponctuel — le sursaut, la foudre. Rejoué depuis le début. */
    coup(nom) {
      if (detruit || !sonActif()) return;
      const el = piste(nom);
      if (!el) return;
      try { el.currentTime = 0; } catch { /* pas encore chargé : play() suffira */ }
      jouer(el);
    },

    /** Un fond, en boucle. Idempotent : le relancer ne le redémarre pas. */
    fond(nom, allume) {
      if (detruit) return;
      if (!allume || !sonActif()) { arreter(nom); return; }
      const el = piste(nom);
      if (!el || !el.paused) return;
      jouer(el);
    },

    /** Coupe tout, sans oublier la position : on ne reprend jamais en cours. */
    silence() { for (const nom of pistes.keys()) arreter(nom); },

    /** Prévient quand l'ÉTAT RÉEL change (déblocage), pour que l'UI se repeigne. */
    on(f) { auditeurs.add(f); return () => auditeurs.delete(f); },

    detruire() {
      detruit = true;
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
        document.removeEventListener(ev, surGeste);
      }
      for (const el of pistes.values()) {
        try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* ignore */ }
      }
      pistes.clear();
      auditeurs.clear();
    },
  };
}

/** Le joueur des cas où il n'y a rien à jouer : registre sobre, format inconnu. */
function joueurInerte() {
  return {
    disponible: false,
    debloque: false,
    get actif() { return sonActif(); },
    coup() {},
    fond() {},
    silence() {},
    on() { return () => {}; },
    detruire() {},
  };
}

/**
 * Branche un joueur de sons sur un lecteur.
 *
 * ★ **Un son ne se déclenche qu'en LECTURE, jamais au scrubbing.** Le lecteur
 * est parcourable dans les deux sens (CONTRACTS §3) : traverser dix étapes en
 * tirant la jauge déclencherait dix coups de tonnerre, et revenir en arrière
 * en déclencherait dix de plus. On exige donc `lecteur.playing`, ce qui
 * distingue exactement le déroulé du parcours manuel.
 *
 * ★ **Et les fonds suivent la LECTURE, pas la page.** Mettre en pause coupe
 * l'ambiance : un drone qui continue sous une scène arrêtée n'accompagne plus
 * rien, il occupe. Le brasier, lui, ne s'allume qu'au verdict et ne s'éteint
 * qu'avec la lecture — c'est le seul son qui décrive un ÉTAT de la scène et
 * non un instant.
 *
 * @param {Object} lecteur
 * @param {Object} sons
 * @param {{scenario?:Object}} ctx
 * @returns {Function} le débranchement
 */
export function brancherSons(lecteur, sons, ctx = {}) {
  if (!sons || !sons.disponible || typeof lecteur.on !== 'function') return () => {};

  const steps = (ctx.scenario && ctx.scenario.steps) || lecteur.steps || [];
  const aPourOp = (i, op) => {
    const s = steps[i];
    return !!(s && (s.ops || []).some((o) => o && o.op === op));
  };
  const iVerdict = steps.findIndex((s) => (s.ops || []).some((o) => o && o.op === 'reveal'));

  const majFonds = () => {
    const enLecture = !!lecteur.playing;
    sons.fond('abime', enLecture);
    // Le brasier commence au verdict et ne s'arrête plus : c'est un état de la
    // scène — les 666 brûlent —, pas un instant qui passe.
    sons.fond('brasier', enLecture && iVerdict >= 0 && lecteur.stepIndex >= iVerdict);
  };

  const offStep = lecteur.on('stepenter', ({ stepIndex }) => {
    majFonds();
    if (!lecteur.playing) return;
    if (aPourOp(stepIndex, 'horns')) sons.coup('effroi');
    if (aPourOp(stepIndex, 'reveal')) sons.coup('tonnerre');
  });
  const offChange = lecteur.on('change', majFonds);
  const offReglages = onReglages(() => { if (!sons.actif) sons.silence(); else majFonds(); });

  return () => {
    offStep();
    offChange();
    offReglages();
    sons.silence();
  };
}
