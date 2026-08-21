/**
 * Erreurs du moteur visuel.
 *
 * Règle : le moteur échoue **bruyamment**, jamais silencieusement.
 * Un `op` hors vocabulaire, un `id` inconnu, un invariant violé sont des
 * erreurs de compilation — pas des ops ignorées (CONTRACTS §3, §7.1).
 */

export class CompileError extends Error {
  /**
   * @param {string} message  message explicite, en français, actionnable
   * @param {object} [details] contexte machine (chemin, ids fautifs…)
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'CompileError';
    this.details = details;
  }
}

/** Lève une CompileError. */
export function fail(message, details = {}) {
  throw new CompileError(message, details);
}

/**
 * Préfixe de localisation, pour que chaque message dise **où** ça casse.
 * @param {{step?:number, stepId?:string, op?:number, opName?:string}} loc
 */
export function at(loc = {}) {
  const parts = [];
  if (loc.step !== undefined) parts.push(`steps[${loc.step}]${loc.stepId ? ` « ${loc.stepId} »` : ''}`);
  if (loc.op !== undefined) parts.push(`ops[${loc.op}]${loc.opName ? ` (op « ${loc.opName} »)` : ''}`);
  return parts.length ? parts.join('.') + ' : ' : '';
}
