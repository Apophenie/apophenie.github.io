/**
 * `substitute` — un token en devient un ou plusieurs autres.
 *
 * Recherche §4.3 : compilée en trois gestes **simultanés** — (a) calcul du
 * layout d'arrivée, (b) FLIP des voisins, (c) crossfade. Sans (b), `h` → `15`
 * ferait sauter toute la ligne, puisque la largeur change.
 *
 * L'ancrage est le centre (`text-anchor: middle`) : le centre est stable, la
 * largeur ne l'est pas.
 *
 * Deux formes de `to` :
 *   • `to: {id,text}`        1 → 1  — la lettre devient son rang.
 *   • `to: [{…},{…}]`        1 → n  — éclatement (`44` → `4`, `4`) ou
 *                            résonance (le même 6 recopié trois fois).
 *     Les tokens d'arrivée naissent **sur** les glyphes du token de départ
 *     quand ils le reconstituent, sinon tous à sa place ; le layout les écarte
 *     ensuite. Le raccord est invisible.
 *
 * ## ★ Sous l'accolade, quand il y en a une
 *
 * Un dénombrement, une moyenne, un écart se jouent en trois gestes enchaînés :
 * `group` accole les sources et écrit ce qu'on fait, `drop` les ramasse,
 * `substitute` pose la valeur. Les deux premiers gestes composent — les bras
 * embrassent, la pointe et le symbole désignent le dessous —, mais le
 * troisième faisait naître la valeur **dans la ligne** : au-dessus de
 * l'accolade, et à gauche de son axe dès que le groupe n'ouvrait pas la ligne.
 * L'accolade promettait un résultat sous sa pointe et rien n'y venait jamais.
 *
 * Quand la source est embrassée par une accolade qui porte un symbole
 * (`scene.ancreDe`), la valeur naît donc **sous la pointe**, s'y montre, puis
 * remonte prendre la place dans la ligne — exactement la composition de `sum`
 * (`helpers.accumulate`), dont c'est le même contrat (CONTRACTS §3.1).
 */

import { tokenSpec, espacementDe, exigerPoint } from './helpers.js';
import { EASE } from '../constants.js';
import { charCenter } from '../layout.js';
import { fail } from '../errors.js';

export const name = 'substitute';

export function plan(ctx) {
  const pairs = ctx.op.pairs;
  if (!Array.isArray(pairs) || !pairs.length) {
    fail(`${ctx.where}« pairs » doit être une liste [{ target, to:{id,text,kind} }].`);
  }

  const jobs = pairs.map((p, i) => {
    const src = ctx.scene.live(sourceOf(ctx, p, i), `${ctx.where}pairs[${i}].target : `);
    const list = Array.isArray(p.to) ? p.to : [p.to];
    if (!list.length) fail(`${ctx.where}pairs[${i}].to : au moins un token d'arrivée est attendu.`);
    return { src, tos: list.map((t, k) => tokenSpec(ctx, t, `pairs[${i}].to${list.length > 1 ? `[${k}]` : ''}`)) };
  });

  // 0. l'accolade a-t-elle promis un résultat sous sa pointe ? Et où faudra-t-il
  //    réinsérer la valeur, une fois la source consommée ? On note le voisin de
  //    gauche SURVIVANT — un index deviendrait faux dès la première suppression.
  const sources = new Set(jobs.map((j) => j.src.id));
  for (const j of jobs) {
    j.ancre = j.tos.length === 1 ? ctx.scene.ancreDe(j.src.id) : null;
    // Le rang de la source DANS LA LIGNE, relevé avant toute suppression :
    // c'est lui qui dira dans quel ordre les valeurs rentrent.
    j.rang = ctx.scene.flowIndex(j.src.id);
    j.gauche = null;
    for (let i = ctx.scene.flowIndex(j.src.id) - 1; i >= 0; i--) {
      const id = ctx.scene.flow[i];
      if (!sources.has(id)) { j.gauche = id; break; }
    }
  }
  const sousAccolade = jobs.some((j) => j.ancre);

  // 1. mutation du modèle : les nouveaux tokens prennent la place de l'ancien.
  for (const j of jobs) {
    const idx = ctx.scene.flowIndex(j.src.id);
    const eclatement = j.tos.map((t) => t.text).join('') === j.src.text && j.tos.length > 1;
    let offset = 0;
    const espacement = espacementDe(ctx, j.src.id);
    /* ⚠️ **UNE COUPURE POSÉE ICI DOIT ÊTRE HONORÉE.** `layoutFlow` ne respecte
       les `breakBefore` que si `coupuresExplicites` est armé, et `compile.js`
       ne l'arme que d'après les jetons de DÉPART. Une op qui repose une mise en
       page sur plusieurs rangs en cours de route — le verdict de l'œuf, qui
       réécrit une fraction — déclarait donc des coupures que le layout
       ignorait, et les trois lignes se retrouvaient bout à bout. C'est la règle
       que `reveal` applique déjà pour ses deux rangs de séries : celui qui
       coupe arme la coupure. */
    if (j.tos.some((to) => to.breakBefore === true)) ctx.layoutOpts.coupuresExplicites = true;
    j.tos.forEach((to, k) => {
      ctx.scene.create({
        id: to.id, text: to.text, kind: to.kind, group: to.group ?? j.src.group,
        // Sous une accolade, la valeur vit d'abord À CÔTÉ du flux : la ligne se
        // referme sans elle, puis elle y entre (temps 4), comme le résultat
        // d'une somme.
        /* ★ **LE RÔLE SE DÉCLARE, et il vaut « text » quand il ne l'est pas.**
           Un jeton créé était forcément un texte, ce qui est vrai de toute
           substitution de VALEUR — et faux dès qu'une op REPOSE une mise en
           page : le verdict de l'œuf réécrit une fraction entière, trait
           compris, et un trait n'est pas un texte (`primitives/rule.js`). La
           largeur suit, faute de quoi un rôle non textuel se mesurerait sur
           une chaîne vide. */
        role: to.role || 'text',
        ...(to.w !== undefined ? { w: to.w } : {}),
        inFlow: !j.ancre, insertAt: idx < 0 ? undefined : idx + 1 + k,
        // Le PREMIER né hérite de l'espacement de la source — la ligne ne doit
        // pas se resserrer parce qu'une valeur en remplace une autre.
        ...(k === 0 ? espacement : {}),
        // ★ …mais ce que l'ÉMETTEUR déclare l'emporte, et pour chaque né. Un
        //   verdict qui repose une fraction sur trois rangs demande ses
        //   coupures ; sans cela, la mise en page serait celle de la source,
        //   c'est-à-dire d'un jeton qui n'en avait aucune (voir `tokenSpec`).
        ...(to.gapBefore !== undefined ? { gapBefore: to.gapBefore } : {}),
        ...(to.breakBefore !== undefined ? { breakBefore: to.breakBefore } : {}),
        base: { opacity: 0, scale: 1.15, fill: ctx.palette.phos },
      }, { where: ctx.where });
      if (j.ancre) {
        ctx.scene.place(to.id, exigerPoint(ctx, j.ancre,
          `la valeur « ${to.text} », sous la pointe de l'accolade`, to.id));
      } else if (j.tos.length > 1) {
        // Naissance pile sur les glyphes d'origine (éclatement) ou au même
        // point (résonance) : dans les deux cas, le reflow fait l'écartement.
        const p = ctx.scene.pos(j.src.id);
        const n = [...to.text].length;
        ctx.scene.place(to.id, exigerPoint(ctx, eclatement
          ? { x: charCenter(p, offset + (n - 1) / 2, ctx.metrics).x, y: p.y }
          : { x: p.x, y: p.y }, `le jeton « ${to.text} » né sur « ${j.src.text} »`, to.id));
        offset += n;
      }
    });
    // ★ **UNE ACCOLADE SUIT CE QU'ELLE EMBRASSE, MÊME REMPLACÉ.**
    //
    //   Le registre des accolades (`scene.accolades`) garde, pour chaque
    //   accolade vivante, la liste des jetons qu'elle embrasse — c'est lui que
    //   `suivreLesAccolades` relit pour la redimensionner quand la ligne bouge.
    //   Une substitution TUE ses sources : l'accolade se retrouvait alors à
    //   embrasser des morts, `suivreLaZone` les écartait, et elle cessait de
    //   suivre — figée sur une zone qui n'existait plus.
    //
    //   On transmet donc l'appartenance aux jetons d'arrivée, exactement comme
    //   on transmet l'espacement. Ce n'est pas propre à un opérateur : toute
    //   accolade posée avant une substitution en avait besoin, et le manque ne
    //   se voyait que sur celles qui devaient s'ÉLARGIR ensuite — le complément
    //   à neuf, où l'accolade embrasse `N` puis `9 − N`.
    for (const [idAcc, sources] of ctx.scene.accolades) {
      const k = sources.indexOf(j.src.id);
      if (k < 0) continue;
      ctx.scene.poserAccolade(idAcc, [
        ...sources.slice(0, k), ...j.tos.map((t) => t.id), ...sources.slice(k + 1),
      ]);
    }
    ctx.scene.kill(j.src.id, ctx.where);
  }

  // 2. FLIP des voisins vers le layout d'arrivée. Sous une accolade, ce premier
  //    reflow ne prend que la moitié du temps : la seconde est pour la remontée.
  const fermeture = sousAccolade ? ctx.dur * 0.44 : ctx.dur;
  ctx.reflow({ at: 0, dur: fermeture, ease: EASE.move });

  // 3. crossfade, décalé token par token.
  let rang = 0;
  for (const j of jobs) {
    const at = rang * ctx.stagger;
    ctx.anim({ id: j.src.id, prop: 'opacity', to: 0, at, dur: ctx.dur * 0.55 });
    ctx.anim({ id: j.src.id, prop: 'scale', to: 0.85, at, dur: ctx.dur * 0.55 });
    const halo = `@halo:${j.src.id}`;
    if (ctx.scene.has(halo)) ctx.anim({ id: halo, prop: 'opacity', to: 0, at, dur: ctx.dur * 0.4 });
    j.tos.forEach((to, k) => {
      // Sous l'accolade, la valeur paraît TÔT et se laisse lire là où le
      // symbole la désigne ; elle ne remonte qu'ensuite.
      const a = j.ancre ? at + ctx.dur * 0.14 : at + (j.tos.length > 1 ? k * ctx.stagger : 0) + ctx.dur * 0.3;
      const d = j.ancre ? ctx.dur * 0.26 : ctx.dur * 0.6;
      ctx.anim({ id: to.id, prop: 'opacity', to: 1, at: a, dur: d });
      ctx.anim({ id: to.id, prop: 'scale', to: 1, at: a, dur: d, ease: EASE.pop });
    });
    rang++;
  }

  // 4. la valeur remonte prendre la place dans la ligne — c'est ce geste qui
  //    dit que le calcul est refermé (le même que le temps 5 de `accumulate`).
  if (!sousAccolade) return;
  // ★ PLUSIEURS VALEURS QUI RENTRENT, ET L'ORDRE DE LA LIGNE.
  //
  //   Chaque valeur reprend la place de sa source : juste après le voisin de
  //   gauche SURVIVANT. Quand toutes les sources sont substituées — une ligne
  //   entière de nombres qui changent sous une accolade —, plus personne n'a de
  //   voisin survivant : les quatre valeurs visaient donc l'index 0, et la
  //   ligne ressortait À L'ENVERS. Mesuré sur l'égalisation, où `8 15 16 5`
  //   devenait `11 11 11 11` dans l'ordre inverse — invisible tant que les
  //   quatre nombres sont égaux, mais le verdict, lui, couronnait les mauvais.
  //
  //   Les jobs entrent donc dans l'ORDRE OÙ ILS ÉTAIENT, et ceux qui partagent
  //   un même point d'insertion s'y rangent l'un après l'autre.
  const aRentrer = jobs.filter((j) => j.ancre);
  aRentrer.sort((a, b) => a.rang - b.rang);
  let dernier = -1;
  for (const j of aRentrer) {
    const base = j.gauche ? ctx.scene.flowIndex(j.gauche) + 1 : 0;
    const index = Math.max(base, dernier + 1);
    ctx.scene.enterFlow(j.tos[0].id, index, ctx.where);
    dernier = index;
  }
  ctx.reflow({ at: ctx.dur * 0.56, dur: ctx.dur * 0.44, ease: EASE.move });
}

/** Accepte `target: 'id'` ou `targets: ['id']` (une seule source par paire). */
function sourceOf(ctx, pair, i) {
  if (typeof pair.target === 'string') return pair.target;
  if (Array.isArray(pair.targets)) {
    if (pair.targets.length !== 1) {
      fail(`${ctx.where}pairs[${i}].targets contient ${pair.targets.length} sources : une substitution part d’un seul token. Émettez une paire par source.`);
    }
    return pair.targets[0];
  }
  fail(`${ctx.where}pairs[${i}] : « target » manquant.`);
  return null;
}
