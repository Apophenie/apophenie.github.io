/**
 * `insert` — DES JETONS ENTRENT DANS LA LIGNE, ET RIEN N'EN SORT.
 *
 * > « L'étape CQFD a un problème : elle fait disparaître Pi pour réafficher
 * >   cheval/oiseau = Pi. Il faudrait déplacer Pi vers la droite puis faire
 * >   apparaître cheval/oiseau = à sa gauche. » (l'auteur)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ★ **POURQUOI `substitute` NE PEUT PAS FAIRE ÇA, ET POURQUOI C'EST LE SUJET.**
 *
 * `substitute` REMPLACE : la source meurt, les nés prennent sa place. Sur le
 * verdict de l'œuf, cela donnait un π qui s'efface et un autre π qui reparaît
 * au milieu d'un énoncé — deux π, dont le second n'a rien démontré. Or ce qu'on
 * veut dire est exactement l'inverse : **c'est CE π-LÀ**, celui qu'on vient
 * d'obtenir, que l'énoncé vient encadrer. Le faire disparaître une demi-seconde
 * détruit le seul lien que toute la démonstration avait construit.
 *
 * Ce n'est pas non plus `insertOperators`, qui pose des SIGNES dans les
 * interstices d'une suite de nombres et les fait naître entre des jetons
 * nommés. Ici on ajoute une expression entière — des lettres, un trait, une
 * égalité — devant ou derrière ce qui reste, et sur plusieurs rangs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ## Les deux temps, et l'ordre compte
 *
 *  ① **LA PLACE SE FAIT.** Les jetons entrent dans le flux, invisibles ; le
 *     reflow pousse ce qui était là. Le π glisse vers la droite tout seul,
 *     parce qu'il y a désormais quelque chose à sa gauche ;
 *  ② **PUIS ILS PARAISSENT**, de gauche à droite.
 *
 * ★ **L'ORDRE EST CE QUI SE LIT.** Les faire paraître pendant qu'ils poussent
 *   montrerait une ligne qui se réorganise, c'est-à-dire un changement d'état ;
 *   les faire paraître APRÈS montre que la place leur était due — le résultat
 *   ne bouge pas parce qu'on le remplace, il bouge parce qu'on écrit devant
 *   lui. C'est la même distinction que fait `insertOperators` en réservant sa
 *   place avant d'allumer ses signes.
 */

import { tokenSpec, espacementDe } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'insert';

/** Part du geste consacrée à faire la place ; le reste éclaire. */
const POUSSEE = 0.45;

export function plan(ctx) {
  const bruts = ctx.op.tokens;
  if (!Array.isArray(bruts) || !bruts.length) {
    fail(`${ctx.where}« tokens » doit lister les jetons qui entrent.`);
  }
  const specs = bruts.map((s, i) => tokenSpec(ctx, s, `tokens[${i}]`));

  const avant = ctx.op.avant;
  const apres = ctx.op.apres;
  if ((avant === undefined) === (apres === undefined)) {
    fail(`${ctx.where}« insert » demande « avant » OU « apres » — un seul des deux, `
      + 'pour dire de quel côté du repère les jetons entrent.');
  }
  const repere = ctx.scene.live(avant ?? apres, `${ctx.where}${avant !== undefined ? 'avant' : 'apres'} : `);
  const rang = ctx.scene.flowIndex(repere.id);
  if (rang < 0) {
    fail(`${ctx.where}« ${repere.id} » n'est pas dans le flux : on ne peut pas insérer à côté d'un jeton qui n'y est pas.`);
  }
  const index = avant !== undefined ? rang : rang + 1;

  const T = ctx.dur;
  const tPousse = Math.max(1, T * POUSSEE);
  const tParait = Math.max(1, T - tPousse);

  /* ⚠️ **UNE COUPURE POSÉE ICI DOIT ÊTRE HONORÉE.** Même règle que pour
     `substitute` et `reveal` : `layoutFlow` n'obéit aux `breakBefore` que si
     `coupuresExplicites` est armé, et `compile.js` ne l'arme que d'après les
     jetons de DÉPART. Un énoncé qui revient sur trois rangs — numérateur,
     trait, dénominateur — les déclare en cours de route. */
  if (specs.some((s) => s.breakBefore === true)) ctx.layoutOpts.coupuresExplicites = true;

  // ① Ils entrent, invisibles. Le premier hérite de la mise en page du repère
  //    quand il prend sa place en tête : sans quoi une insertion devant un
  //    jeton qui ouvre un rang perdrait ce rang.
  const heritage = avant !== undefined ? espacementDe(ctx, repere.id) : {};
  specs.forEach((spec, k) => {
    ctx.scene.create({
      ...spec,
      role: spec.role || 'text',
      inFlow: true,
      insertAt: index + k,
      ...(k === 0 && spec.breakBefore === undefined && spec.gapBefore === undefined ? heritage : {}),
      base: { opacity: 0 },
    }, { where: ctx.where });
  });
  /* ⚠️ Et le repère REND sa coupure au premier entrant : deux jetons qui
     portent tous deux `breakBefore` sur un même rang le couperaient en deux. */
  if (avant !== undefined && heritage.breakBefore && specs[0].breakBefore === undefined) {
    repere.breakBefore = undefined;
  }

  ctx.reflow({ at: 0, dur: tPousse, ease: EASE.move });

  // ② Puis ils paraissent, de gauche à droite : l'ordre de lecture.
  const cadence = specs.length > 1 ? (tParait * 0.5) / (specs.length - 1) : 0;
  specs.forEach((spec, k) => {
    ctx.anim({
      id: spec.id, prop: 'opacity', to: 1,
      at: tPousse + k * cadence,
      dur: Math.max(1, tParait - cadence * (specs.length - 1)),
      ease: EASE.fade,
    });
  });
}
