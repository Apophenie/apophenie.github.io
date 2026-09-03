/**
 * `move` — migration / réarrangement (FLIP analytique).
 *
 * C'est la primitive centrale : presque toutes les autres s'appuient dessus via
 * `ctx.reflow()`. Le moteur arithmétique n'envoie **jamais** de coordonnées
 * (CONTRACTS §7.3) : `move` décrit un changement d'**ordre** dans le flux, pas
 * une position. Le layout engine décide du reste.
 *
 * Formes acceptées :
 *   { op:'move' }                              simple recalcul (après une autre op)
 *   { op:'move', order:['t2','t0','t1'] }      ordre imposé (ids listés d'abord)
 *   { op:'move', targets:[…], to:'front'|'back' }
 *
 * Recherche §4.4 : pas de « First/Last » par mesure du DOM — on connaît les deux
 * valeurs de `translate` et on écrit directement les deux keyframes. Pas de
 * lecture DOM, pas de reflow synchrone, tout en unités viewBox.
 */

import { EASE } from '../constants.js';
import { suivreLesAccolades } from './helpers.js';
import { demiEllipse } from './ellipse.js';
import { fail } from '../errors.js';

export const name = 'move';

/** Gestes de déplacement modélisés — vocabulaire fermé. */
export const GESTES = Object.freeze(['droit', 'miroir']);

export function plan(ctx) {
  const { op, scene } = ctx;

  if (Array.isArray(op.order)) {
    // ★ **`order` RÉARRANGE SUR PLACE — il ne remonte rien en tête.**
    //
    // Il remontait : `[...wanted, ...rest]`, c'est-à-dire que les jetons listés
    // passaient devant TOUT LE FLUX. Tant qu'un rangement portait sur la ligne
    // entière, les deux lectures coïncidaient — `wanted` valait tout le flux, et
    // `rest` était vide. Elles cessent de coïncider dès qu'une démonstration a
    // PLUSIEURS PARTS et qu'une seule se range.
    //
    // ⚠️ MESURÉ sur `#so!0.1:tca+mtal+m14,2.1:tca+mtal+mx6+mrn#…` (« Donald
    // Trump ») : le moteur arithmétique est juste — chaque part trie bien chez
    // elle, `Donald` → `aDdlno` et `Trump` → `mprTu` —, mais à l'écran les cinq
    // jetons de `Trump` sautaient devant les six de `Donald`. « Le mtal en 2.1 a
    // trié l'ensemble, pas juste 2.1, ce qui met la pagaille visuellement »
    // (l'auteur) : ce n'était pas le tri qui débordait, c'était l'affichage.
    //
    // Les jetons listés reprennent donc EXACTEMENT les places qu'ils occupaient
    // déjà, dans leur nouvel ordre ; tout le reste ne bouge pas d'un pixel. Sur
    // une part unique, les deux lectures rendent le même flux : la correction
    // est un élargissement, pas un changement de comportement.
    const wanted = op.order.map((id) => scene.live(id, ctx.where).id);
    const aRanger = new Set(wanted);
    const places = [];
    scene.flow.forEach((id, i) => { if (aRanger.has(id)) places.push(i); });
    const suite = scene.flow.slice();
    // Si un id listé n'est plus dans le flux, il n'a pas de place à reprendre :
    // on range ceux qui en ont une, dans l'ordre demandé, et on n'invente rien.
    const presents = wanted.filter((id) => aRanger.has(id) && scene.flow.includes(id));
    presents.forEach((id, k) => { suite[places[k]] = id; });
    scene.flow.splice(0, scene.flow.length, ...suite);
  } else if (op.targets !== undefined) {
    const ids = scene.resolve(op.targets, ctx.where);
    const rest = scene.flow.filter((id) => !ids.includes(id));
    const where = op.to || 'front';
    if (where !== 'front' && where !== 'back') {
      fail(`${ctx.where}« to » = « ${where} » : seules les valeurs « front » et « back » sont admises (le moteur visuel possède le layout, CONTRACTS §7.3).`);
    }
    const next = where === 'front' ? [...ids, ...rest] : [...rest, ...ids];
    scene.flow.splice(0, scene.flow.length, ...next);
  }

  // ★ **`geste: 'miroir'` — LE MIROIR SUR LA LIGNE ELLE-MÊME.**
  //
  //   « Ce n'est pas un miroir de table mais un miroir directement sur les
  //   données de la ligne : effectue le miroir directement sur la ligne »
  //   (l'auteur, à propos de `p.miroir` — 28 se lit 82).
  //
  //   Un réarrangement ordinaire va tout droit, et c'est ce qu'il faut d'un
  //   rangement : chacun rejoint sa place, on ne regarde pas le chemin. Un
  //   MIROIR est l'inverse — le chemin EST la démonstration. Deux chiffres qui
  //   échangent leurs places en ligne droite se traversent, et rien ne dit
  //   lequel est allé où ; c'est exactement le grief que la glissière de
  //   l'Atbash avait résolu par la demi-ellipse. Le calcul est donc le sien,
  //   partagé (`ellipse.js`) : bosse proportionnelle à la distance parcourue,
  //   donc alignement tenu à chaque instant, et rétrécissement au croisement.
  //
  //   ★ La primitive n'a pas à savoir que c'est un miroir : elle reçoit un
  //   ordre, et l'ordre suffit. Si le nouvel ordre n'est pas un renversement,
  //   les ellipses restent justes — chaque jeton part de sa place et arrive à
  //   la sienne —, elles cessent seulement d'être toutes concourantes. Le nom
  //   du geste dit ce qu'on montre, il ne contraint pas ce qu'on range.
  /* ★ **`ecarts` — LE RANGEMENT QUI SÉPARE AUSSI.**
   *
   * > « Réagencement : cheval → vache l » (l'auteur)
   *
   * Six lettres réagencées donnent six lettres ; « VACHE L » en demande sept
   * places, dont une vide. Cette espace n'est PAS un jeton — il n'y a rien à
   * y montrer, et en créer un ferait naître de la matière au milieu d'une
   * permutation qui, par définition, n'en crée pas. C'est un ÉCART, c'est-à-dire
   * une propriété de mise en page, et c'est ce que `gapBefore` dit déjà partout
   * ailleurs (`partition` écarte ses sous-groupes exactement ainsi).
   *
   * Le geste reste donc un seul mouvement : les lettres rejoignent leurs places,
   * et l'une d'elles a désormais de l'air devant elle. La lire comme un produit
   * dont on isole un facteur devient possible ; c'est bien ce qu'affirme la
   * « multiplication commutative ».
   */
  if (op.ecarts && typeof op.ecarts === 'object') {
    for (const [id, mult] of Object.entries(op.ecarts)) {
      const n = scene.live(id, `${ctx.where}ecarts : `);
      if (typeof mult !== 'number' || !Number.isFinite(mult) || mult < 0) {
        fail(`${ctx.where}ecarts[« ${id} »] = ${JSON.stringify(mult)} : un écart est un multiple positif de la chasse.`);
      }
      n.gapBefore = ctx.layoutOpts.gap + ctx.metrics.advance * mult;
    }
  }

  const geste = op.geste === undefined ? 'droit' : op.geste;
  if (!GESTES.includes(geste)) {
    fail(`${ctx.where}« geste » = ${JSON.stringify(geste)} — les deux déplacements modélisés sont ${GESTES.join(' et ')}.`);
  }
  const bouge = {
    at: 0,
    dur: ctx.dur,
    ease: EASE.move,
    // ★ LE PLANCHER DE BOSSE — sans lui, un miroir de deux chiffres rétrécit
    //   sans passer. La bosse est proportionnelle au trajet (`ellipse.js ›
    //   APLATISSEMENT`), or le trajet d'un miroir de nombre vaut une chasse ou
    //   deux : elle tombait à 3,8 unités quand le rétrécissement, lui, allait
    //   jusqu'à 0,45. La demi-casse est la plus petite bosse qui se lise encore
    //   comme un passage au-dessus, et c'est ici qu'on la connaît — `ellipse.js`
    //   ne sait rien de la typographie.
    ...(geste === 'miroir'
      ? { trajectoire: (m) => demiEllipse(m.from, m.to, { hauteurMin: ctx.metrics.fontSize * 0.5 }) }
      : {}),
  };
  const moved = ctx.reflow(bouge);
  // Ce qu'une accolade embrasse vient peut-être de changer de largeur : elle
  // suit, sinon elle désignerait autre chose que ce qu'elle a promis.
  suivreLesAccolades(ctx, bouge);
  if (!moved.length) ctx.occupy(ctx.dur);
}
