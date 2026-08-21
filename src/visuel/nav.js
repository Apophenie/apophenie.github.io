/**
 * Automate de navigation — fonctions **pures**, sans DOM, sans WAAPI.
 *
 * C'est la traduction littérale du README (§ page de démonstration) formalisée
 * par `research/moteur-visuel.md §3.2` et figée par CONTRACTS §3.3.
 * `player.js` ne fait qu'exécuter les intentions produites ici : c'est ce qui
 * rend les 10 cas limites du §3.4 testables sous `node --test`.
 */

import { EPS } from './constants.js';

/**
 * Index du step contenant `t`.
 * CONTRACTS §3.4 : « t exactement sur bounds[i] ⇒ on est au **début** du step i ».
 * La tolérance EPS s'applique aussi juste *avant* la charnière : un t à 2 ms de
 * bounds[i] est déjà le step i (sinon Firefox, qui arrondit, ferait clignoter le badge).
 *
 * @param {number[]} bounds charnières, bounds[0] = 0, bounds.at(-1) = total
 * @param {number} t
 * @param {number} [eps]
 * @returns {number} 0-based, borné à steps.length - 1
 */
export function stepIndexAt(bounds, t, eps = EPS) {
  const nSteps = bounds.length - 1;
  if (nSteps <= 0) return 0;
  let idx = 0;
  for (let i = 0; i < nSteps; i++) {
    if (bounds[i] <= t + eps) idx = i;
    else break;
  }
  return idx;
}

export function atStart(t, eps = EPS) {
  return t <= eps;
}

export function atEnd(t, total, eps = EPS) {
  return t >= total - eps;
}

export function atHinge(t, bounds, eps = EPS) {
  return bounds.some((b) => Math.abs(t - b) <= eps);
}

/**
 * Cible de « Précédent » : le début de la transformation en cours, ou le début de
 * la transformation précédente si on est déjà à la charnière.
 */
export function prevTarget(bounds, t, eps = EPS) {
  const i = stepIndexAt(bounds, t, eps);
  return Math.abs(t - bounds[i]) <= eps ? bounds[Math.max(0, i - 1)] : bounds[i];
}

/**
 * Cible de « Suivant » : la fin de la transformation en cours, ou celle de la
 * suivante si on est déjà à la charnière.
 */
export function nextTarget(bounds, t, eps = EPS) {
  const last = bounds.length - 1;
  const i = stepIndexAt(bounds, t, eps);
  const target = Math.abs(t - bounds[i + 1]) <= eps
    ? bounds[Math.min(last, i + 2)]
    : bounds[i + 1];
  return Math.min(bounds[last], target);
}

/**
 * @typedef {{t:number, playing:boolean, bounds:number[], total:number}} NavState
 * @typedef {{pause?:boolean, seek?:number, play?:boolean, noop?:boolean}} NavIntent
 */

/**
 * Transition de l'automate. Retourne une **intention** (jamais d'effet de bord).
 *
 * CONTRACTS §3.4 / recherche §3.4 :
 * - Suivant/Précédent pendant la lecture ⇒ **met en pause puis saute**.
 * - Fin de lecture ⇒ playing=false, t=TOTAL ; un nouveau Play repart de 0.
 *
 * @param {'toStart'|'prev'|'play'|'pause'|'next'|'toEnd'|'seek'|'seekToStep'} action
 * @param {NavState} state
 * @param {number} [arg] argument de `seek` (ms) ou `seekToStep` (index)
 * @returns {NavIntent}
 */
export function transition(action, state, arg) {
  const { t, playing, bounds, total } = state;
  switch (action) {
    case 'toStart':
      if (atStart(t)) return { noop: true };
      return { pause: true, seek: 0 };

    case 'prev':
      if (atStart(t)) return { noop: true };
      return { pause: true, seek: prevTarget(bounds, t) };

    case 'next':
      if (atEnd(t, total)) return { noop: true };
      return { pause: true, seek: nextTarget(bounds, t) };

    case 'toEnd':
      // Bouton « Fin » — CONTRACTS §0.4.
      if (atEnd(t, total)) return { noop: true };
      return { pause: true, seek: total };

    case 'play':
      if (playing) return { noop: true };
      // Comportement de lecteur vidéo : rejouer depuis 0 si on est à la fin.
      return atEnd(t, total) ? { seek: 0, play: true } : { play: true };

    case 'pause':
      if (!playing) return { noop: true };
      return { pause: true };

    case 'seek': {
      const target = clamp(Number(arg), 0, total);
      if (!Number.isFinite(target)) return { noop: true };
      return { seek: target };
    }

    case 'seekToStep': {
      const i = clamp(Math.trunc(Number(arg)), 0, bounds.length - 1);
      if (!Number.isFinite(i)) return { noop: true };
      return { pause: true, seek: bounds[i] };
    }

    default:
      return { noop: true };
  }
}

/**
 * État dérivé des contrôles — l'UI est un pur reflet (CONTRACTS §3.3).
 * `aria-disabled` et jamais `disabled` (CONTRACTS §6) : c'est l'UI qui applique,
 * ici on ne produit que les booléens.
 */
export function controlsState(state) {
  const { t, playing, bounds, total } = state;
  const i = stepIndexAt(bounds, t);
  return {
    stepIndex: i,
    stepCount: bounds.length - 1,
    atStart: atStart(t),
    atEnd: atEnd(t, total),
    atHinge: atHinge(t, bounds),
    startDisabled: atStart(t),
    prevDisabled: atStart(t),
    nextDisabled: atEnd(t, total),
    endDisabled: atEnd(t, total),
    playing,
    playLabel: playing ? 'Pause' : 'Lecture',
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
