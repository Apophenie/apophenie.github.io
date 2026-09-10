/**
 * `countStrokes` — comptage de traits, d'extrémités ou de boucles fermées.
 *
 * Même grammaire que `sevenSeg` (voir `encart.js`), et pour la même raison :
 * ces trois comptages sont trois façons de regarder **un** tracé, et ce qui les
 * rend lisibles est de les montrer un objet à la fois, dans un encart, avec un
 * compteur qui monte.
 *
 *  · **traits** — le glyphe se dessine, un trait de crayon à la fois ;
 *  · **extrémités** — le glyphe est d'abord tracé en entier, puis chaque
 *    pointe libre s'allume, une par une ;
 *  · **boucles** — le glyphe est tracé en entier, puis chaque boucle fermée
 *    s'éclaire, une par une.
 *
 * ## Contrôle croisé — CONTRACTS §0.3
 *
 * La source est `src/moteur/tables/glyphes.js` et le comptage est **redérivé du
 * même tracé** (`deriveGlyph`) : ce que le spectateur voit est littéralement ce
 * qui a été compté. Si le scénario annonce un `count` différent de celui du
 * tracé, c'est une erreur de compilation — le moteur refuse de montrer un
 * comptage qu'il ne dessine pas. Les boucles vont plus loin : ce n'est pas
 * seulement leur nombre qui est redérivé, mais **quels traits les composent**
 * (`boucleGroupes`), sans quoi on ne saurait pas laquelle éclairer.
 *
 * `pathLength="100"` remplace `getTotalLength()` (coûteux, et indisponible hors
 * DOM) ; les extrémités viennent de l'analyse du `d`, pas de `getPointAtLength`.
 */

import { glyphOf, deriveGlyph } from '../glyphes.js';
import { GLYPHES_JOST } from '../../moteur/tables/glyphes-jost.js';
import { parcoursDUnSeulGeste, levéesDeCrayon } from '../../moteur/tables/derivees-jost.js';
import { glyphToLocal } from '../assets.js';
import { tokenSpec } from './helpers.js';
import { ouvrirEncart, poserCompteur, refermerEncart, ENCART } from './encart.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'countStrokes';

const MODES = { traits: 'traits', extremites: 'extremites', boucles: 'boucles' };

/** ★ Les teintes qui se succèdent d'un geste à l'autre — prises dans la palette,
 *  jamais écrites en dur : une couleur littérale ici serait invisible dans un
 *  thème et criarde dans l'autre. Elles tournent, parce qu'un `E` de quatre
 *  gestes ne doit pas épuiser le nuancier. */
const TEINTES_DU_GESTE = ['gold', 'phos', 'rubric', 'flamme'];

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const mode = ctx.op.mode || 'traits';
  if (!MODES[mode]) {
    fail(`${ctx.where}« mode » = « ${mode} » : les modes sont « traits », « extremites » et « boucles ».`);
  }
  const ch = ctx.op.glyph ?? ([...src.text].length === 1 ? src.text : null);
  if (!ch) {
    fail(`${ctx.where}« glyph » manquant : le token « ${src.id} » porte « ${src.text} », qui n'est pas un caractère unique.`);
  }

  /* ★ **LA SECONDE LECTURE SE DESSINE COMME ELLE SE COMPTE.**
     > « Il faudra montrer l'animation où 1 trait = tracé continu de ce trait d'un
     >   bout à l'autre, puis d'une autre couleur tracé suivant. » (l'auteur)
     ⚠️ Ce n'est pas une préférence d'affichage : la table Jost porte 91
       sous-chemins pour 82 levées de crayon, et dessiner les sous-chemins
       montrerait neuf gestes de plus que l'opérateur n'en facture — la
       divergence même que le §0.3 interdit. On lit donc la table de Jost, et
       l'on GROUPE ses sous-chemins par le parcours eulérien que
       `parcoursDUnSeulGeste` calcule (Hierholzer). */
  const jost = ctx.op.police === 'jost';
  const glyph = jost
    ? (GLYPHES_JOST[ch] || fail(`${ctx.where}« ${ch} » n'a pas de tracé dans la table Jost.`))
    : glyphOf(ch, ctx.glyphes || undefined);
  const derived = deriveGlyph(glyph);
  // Les lots : un par levée de crayon. Hors Jost, chaque sous-chemin est son
  // propre lot — c'est exactement l'ancien comportement, à l'octet près.
  const lots = jost
    ? parcoursDUnSeulGeste(glyph)
    : derived.sub.map((_, i) => [i]);
  const count = mode === 'traits' && jost
    ? levéesDeCrayon(glyph)
    : derived[MODES[mode]];
  if (ctx.op.count !== undefined && ctx.op.count !== count) {
    fail(`${ctx.where}« count » annonce ${ctx.op.count} pour « ${ch} » en mode « ${mode} », mais le tracé de référence en donne ${count} `
      + `(traits=${derived.traits}, extrémités=${derived.extremites}, boucles=${derived.boucles}). `
      + `Les tables de comptage sont dérivées des tracés : ce qui est dessiné est ce qui est compté (CONTRACTS §0.3).`,
    { glyph: ch, mode, annonce: ctx.op.count, trace: count });
  }
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');
  if (to !== null && String(to.text) !== String(count)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais le compteur s'arrête à ${count}. `
      + 'Le nombre qui remplace la lettre est celui du compteur, pas un autre.');
  }

  const T = ctx.dur;
  const fs = ctx.metrics.fontSize;
  const zoom = ENCART.zoomGlyphe;
  const local = (p) => ({ x: glyphToLocal(p, fs * zoom).x, y: glyphToLocal(p, fs * zoom).y });

  // --- 1. l'encart s'ouvre, la lettre y monte ------------------------------
  //   ★ Le nom de l'OUTIL s'affiche au-dessus du cadre : en plein écran, la
  //   scène est tout ce qu'on voit, et « Boucles fermées, en capitale » dit ce
  //   qu'on est en train de compter. Il vient du catalogue et voyage dans l'op
  //   (`moteur/transformations/commun.js › def`, champ « outil »).
  //
  //   ★ Ce cadre-ci NE SE MUTUALISE PAS, et c'est délibéré : ce qu'il montre
  //   est le tracé de la lettre elle-même — il change donc entièrement d'une
  //   lettre à l'autre. L'afficheur à segments, lui, est le même objet pour
  //   toutes les lettres, et c'est ce qui autorise à le garder en place.
  if (ctx.op.titre !== undefined && typeof ctx.op.titre !== 'string') {
    fail(`${ctx.where}« titre » doit être une chaîne — le nom de l'outil, déjà traduit, tel que le catalogue le porte.`);
  }
  const encart = ouvrirEncart(ctx, src, { at: 0, dur: T * 0.12, titre: ctx.op.titre });

  // --- 2. changement de police : la lettre devient son propre tracé --------
  const apparition = T * 0.2;
  const dessin = mode === 'traits' ? 0 : T * 0.14;
  const traitIds = derived.sub.map((s, i) => {
    const id = `@trait:${src.id}:${i}`;
    ctx.scene.create({
      id, role: 'glyph', inFlow: false, w: 0,
      data: { d: s.d, trait: i, scale: zoom },
      base: { opacity: 1, strokeDashoffset: 100, stroke: ctx.palette.fg2 },
    }, { where: ctx.where });
    ctx.scene.place(id, encart.centre);
    return id;
  });
  ctx.anim({ id: src.id, prop: 'opacity', to: 0.06, at: apparition, dur: T * 0.1, ease: EASE.fade });

  const debut = T * 0.36;
  const fin = T * 0.82;
  const cadence = (fin - debut) / Math.max(1, count);
  const compteur = `@compteur:${src.id}`;

  if (mode === 'traits') {
    // Le glyphe s'écrit sous nos yeux : un GESTE, un cran de compteur.
    // ★ **UNE COULEUR PAR GESTE**, et c'est ce qui rend la règle de Jost
    //   lisible : quand deux sous-chemins se tracent sans lever le crayon, ils
    //   s'allument de la MÊME couleur et le compteur ne monte qu'une fois. Sur
    //   la lecture de référence, chaque geste est un sous-chemin et la teinte
    //   ne change qu'entre eux — le rendu d'hier, inchangé.
    poserCompteur(ctx, { id: compteur, centre: encart.centre, cote: encart.cote, total: count, debut, cadence });
    lots.forEach((lot, k) => {
      const a = debut + k * cadence;
      const teinte = TEINTES_DU_GESTE[k % TEINTES_DU_GESTE.length];
      const couleur = ctx.palette[teinte] || ctx.palette.gold;
      // Les morceaux d'un même geste se suivent SANS TROU : le crayon ne se
      // lève pas entre eux, la scène ne doit donc pas marquer de pause.
      const part = Math.max(1, (cadence * 0.8) / lot.length);
      lot.forEach((t, j) => {
        const id = traitIds[t];
        if (!id) return;
        ctx.anim({ id, prop: 'stroke', to: couleur, at: a + j * part, dur: 1 });
        ctx.anim({
          id, prop: 'strokeDashoffset', from: 100, to: 0,
          at: a + j * part, dur: part, ease: EASE.fade,
        });
      });
    });
  } else {
    // Le glyphe est d'abord écrit en entier, en retrait : c'est le support.
    for (const id of traitIds) {
      ctx.anim({ id, prop: 'strokeDashoffset', from: 100, to: 0, at: apparition, dur: Math.max(1, dessin), ease: EASE.fade });
    }
    poserCompteur(ctx, { id: compteur, centre: encart.centre, cote: encart.cote, total: count, debut, cadence });
  }

  const montres = [...traitIds];

  if (mode === 'extremites') {
    // Chaque pointe libre s'allume, une par une.
    derived.libres.forEach((pt, i) => {
      const p = local(pt);
      const id = `@ext:${src.id}:${i}`;
      ctx.scene.create({
        id, role: 'marker', inFlow: false, w: 0, data: { r: 8 },
        base: { opacity: 1, scale: 0, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(id, { x: encart.centre.x + p.x, y: encart.centre.y + p.y });
      ctx.anim({ id, prop: 'scale', values: [0, 1.5, 1], offsets: [0, 0.55, 1], at: debut + i * cadence, dur: Math.max(1, cadence * 0.85), ease: EASE.pop });
      montres.push(id);
    });
  }

  if (mode === 'boucles') {
    /* ★ **C'EST L'INTÉRIEUR QUI S'ALLUME, puis qui rentre dans le compteur.**

       > « Plutôt que de désigner la boucle par un point (qui n'est pas toujours
       >   bien placé, en plus), fais s'allumer l'intérieur de la ou des boucles,
       >   puis déplace-les en les rétrécissant, comme pour les faire rentrer
       >   dans le compteur. » (l'auteur)

       Le disque posé au barycentre avait deux défauts, et le second est le
       grave. Il tombait à côté dès que la panse n'était pas ronde — le
       barycentre d'un `a` n'est pas dans son trou. Et surtout il DÉSIGNAIT une
       boucle au lieu de la MONTRER : un point à côté d'une forme ne dit pas ce
       qui, dans cette forme, est fermé.

       La surface, elle, le dit d'elle-même. Ce qui est peint EST la boucle : si
       le tracé ne se referme pas, il n'y a rien à remplir, et l'œil le voit
       aussi bien que l'algorithme. Le glyphe sait déjà se peindre plein —
       `data.plein` existe pour les segments d'afficheur (`dom.js`), qui portent
       leur épaisseur dans leur forme — et on le réemploie tel quel.

       ⚠️ **LE VOYAGE ARRIVE PILE QUAND LE COMPTEUR MONTE.** `poserCompteur`
         égrène à `debut + cadence × 0,6 + i × cadence` : « l'œil a vu la chose
         s'allumer avant que le nombre bouge ». La surface part donc à 30 % de
         son cran et se pose à 60 % — le chiffre monte au moment où elle entre,
         et non pendant qu'elle vole. */
    const posCompteur = { x: encart.centre.x + fs * ENCART.compteurX, y: encart.centre.y };
    derived.boucleGroupes.forEach((membres, i) => {
      const a = debut + i * cadence;
      for (const k of membres) {
        ctx.anim({ id: traitIds[k], prop: 'stroke', to: ctx.palette.gold, at: a, dur: Math.max(1, cadence * 0.7) });
      }
      // La surface fermée, chaînée en un seul contour (voir `contourFerme`).

      const plein = `@boucle:${src.id}:${i}`;
      ctx.scene.create({
        id: plein,
        role: 'glyph',
        inFlow: false,
        w: 0,
        data: { d: contourFerme(membres.map((k) => derived.sub[k].d)), plein: true, scale: zoom },
        base: { opacity: 0, scale: 1, fill: ctx.palette.gold },
      }, { where: ctx.where });
      ctx.scene.place(plein, encart.centre);
      // ① elle s'allume, là où elle est, dans le tracé qu'on regarde.
      ctx.anim({ id: plein, prop: 'opacity', to: 0.85, at: a, dur: Math.max(1, cadence * 0.28), ease: EASE.enter });
      // ② puis elle rentre dans le compteur, en rétrécissant.
      const part = a + cadence * 0.30;
      const vol = Math.max(1, cadence * 0.30);
      ctx.anim({ id: plein, prop: 'translate', to: posCompteur, at: part, dur: vol, ease: EASE.move });
      ctx.anim({ id: plein, prop: 'scale', to: 0.12, at: part, dur: vol, ease: EASE.move });
      ctx.anim({ id: plein, prop: 'opacity', to: 0, at: part + vol * 0.7, dur: vol * 0.3 });
      montres.push(plein);
    });
  }

  // --- 5. le nombre du compteur remplace la lettre -------------------------
  refermerEncart(ctx, { src, to, compteur, encart, montres, at: T * 0.86, dur: T * 0.14 });
}

/**
 * ★ **UN SEUL CONTOUR FERMÉ, à partir des arcs qui composent la boucle.**
 *
 * Concaténer les `d` tels quels donne autant de SOUS-CHEMINS que d'arcs. Le
 * remplissage SVG ferme alors chacun d'eux par une corde, et l'on peint des
 * lunules au lieu de la panse : sur un `A`, dont la boucle est faite de trois
 * segments, on aurait obtenu trois fuseaux plats et rien au milieu.
 *
 * On remplace donc le `M` de tête de chaque arc SUIVANT par un `L` — le crayon
 * ne se relève pas, il rejoint le point de départ de l'arc d'après — et l'on
 * ferme par `Z`. Les trois segments du `A` redeviennent son triangle ; un `o`,
 * qui n'a qu'un seul arc, n'est pas touché.
 *
 * ⚠️ **CELA SUPPOSE QUE LES ARCS SE SUIVENT.** S'ils étaient donnés dans le
 *   désordre, le contour se croiserait et le remplissage `nonzero` laisserait
 *   des trous — ce serait visible, et c'est ce qui compte : la surface peinte
 *   EST la boucle, donc une boucle mal chaînée se voit au lieu de se cacher
 *   derrière un point posé au barycentre.
 */
function contourFerme(tracés) {
  if (!tracés.length) return '';
  const parts = tracés.map((d, i) => (i === 0 ? d.trim() : d.trim().replace(/^M/, 'L')));
  return `${parts.join(' ')} Z`;
}
