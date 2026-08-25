/**
 * `keyboard` — superposition d'un clavier, AZERTY ou QWERTY.
 *
 * Recherche §4.12 : le clavier monte en fondu, le caractère de la saisie
 * **vole** vers sa touche EN PASSANT PAR-DESSUS elle, la touche s'illumine à
 * son arrivée, le nombre en redescend, puis le clavier disparaît.
 *
 * ★ Le geste lui-même est écrit dans `decor.js`, et `table` l'emploie mot pour
 * mot : c'est celui-ci qui a servi de modèle, l'auteur l'ayant jugé « bien
 * plus lisible que les autres ». Les deux primitives restent distinctes — un
 * clavier est un objet physique à trois mesures, une table une correspondance
 * abstraite qu'on met en page — mais elles ne peuvent plus diverger sur le
 * geste.
 *
 * ★ Le DÉCOR se mutualise. Deux conversions d'affilée sur le même clavier ne
 * le font pas redescendre puis remonter : `montre` sur la première, `retire`
 * sur la dernière (`mutualiserDecor`, `src/recherche/scenario.js`). Sur
 * `hope-hope-hope.fr`, les deux tirets du 6 se convertissent sous un clavier
 * qui ne bouge plus, caméra comprise.
 *
 * ## Trois mesures, trois choses éclairées
 *
 * | `mesure`    | ce qu'on éclaire        | ce qui redescend            |
 * |-------------|-------------------------|-----------------------------|
 * | `'touche'`  | une touche              | le chiffre de la touche     |
 * | `'colonne'` | toute la colonne        | **l'index de la réglette**  |
 * | `'rangee'`  | toute la rangée         | le numéro en marge          |
 *
 * ★ Le piège de la colonne. Le `p` est en **colonne 10** alors que la touche
 * au-dessus de lui porte `0`. Faire descendre le label de la touche du dessus
 * afficherait 0 là où l'arithmétique dit 10. C'est donc la **réglette numérotée
 * de 1 à 10** qui est la source du nombre, et le halo couvre la colonne entière,
 * réglette comprise.
 *
 * ★ La rangée se montre **sans** la rangée de chiffres : la mesure vaut 1, 2 ou
 * 3, et afficher une quatrième rangée au-dessus laisserait croire qu'elle compte.
 *
 * ## Contrôle croisé
 *
 * Comme `count` pour `sevenSeg` et `countStrokes` : si `to.text` ne vaut pas ce
 * que le clavier MONTRE, la compilation échoue. C'est ce qui empêche les tables
 * de `src/moteur/tables/claviers.js` et la géométrie de `../assets.js` de
 * diverger en silence.
 *
 * ## Caméra
 *
 * Quatre rangées, c'est large ET haut. CONTRACTS §3.2 règle 6 — on n'anime
 * **jamais** l'attribut `viewBox` : on anime le `scale` et le `translate` du
 * groupe `@camera`. Le facteur est **calculé** à partir de l'encombrement réel,
 * pas deviné (`decor.js`). Deux `keyboard` dans un même step animeraient tous
 * deux la caméra : `scenario.js` l'interdit statiquement. Le recul se paie au
 * déploiement et le retour au repli : entre les deux, le cadrage ne bouge plus.
 */

import { tokenSpec, ancreVue } from './helpers.js';
// ★ Le geste — monter le décor, allumer la touche, faire passer le caractère
//   PAR-DESSUS, faire redescendre le nombre — est écrit une seule fois, et
//   `table` l'appelle aussi. C'est CE geste-ci qui a servi de modèle.
import { monterDecor, allerRetour, replierDecor, substituerSeul, decorEnLAir } from './decor.js';
import { keyboardGeometry, findKey, keyboardValue, normalizeLayout } from '../assets.js';
import { fail } from '../errors.js';

export const name = 'keyboard';

/** Les trois mesures — vocabulaire fermé. */
export const MESURES = Object.freeze(['touche', 'colonne', 'rangee']);

/** Marge verticale laissée libre par la caméra, en unités viewBox. */
const PAD = 36;

export function plan(ctx) {
  const src = ctx.scene.live(ctx.op.target, `${ctx.where}« target » : `);
  const to = ctx.op.to === undefined || ctx.op.to === null ? null : tokenSpec(ctx, ctx.op.to, 'to');

  if (ctx.op.layout !== undefined && !['azerty', 'qwerty'].includes(ctx.op.layout)) {
    fail(`${ctx.where}« layout » = ${JSON.stringify(ctx.op.layout)} — les deux dispositions modélisées sont « azerty » et « qwerty ».`);
  }
  const mesure = ctx.op.mesure === undefined ? 'touche' : ctx.op.mesure;
  if (!MESURES.includes(mesure)) {
    fail(`${ctx.where}« mesure » = ${JSON.stringify(mesure)} — les trois mesures sont ${MESURES.join(', ')}.`);
  }

  const layout = normalizeLayout(ctx.op.layout);
  // La rangée de chiffres est retirée quand c'est la RANGÉE qu'on mesure.
  const rows = mesure === 'rangee' ? 'lettres' : 'toutes';
  const geo = keyboardGeometry({ layout, rows });
  const label = ctx.op.key ?? src.text;
  const key = findKey(label, { layout, rows });

  // Dégradation propre : une touche inconnue ne fait plus tomber la page. Le
  // clavier n'est pas montré — il n'a rien à montrer —, la substitution se fait
  // seule. Le jeu de caractères garanti est `KEYBOARD_CHARSET` (../assets.js) :
  // c'est à l'émetteur de filtrer en amont, comme la table des glyphes le fait
  // pour `sevenSeg`.
  if (!key) {
    substituerSeul(ctx, src, to, 'digit');
    const orphelin = `@kbd:${layout}:${rows}:${mesure}`;
    if (ctx.op.montre !== true && ctx.op.retire !== false && decorEnLAir(ctx, orphelin)) {
      replierDecor(ctx, orphelin, 0);
    }
    return;
  }

  const montre = keyboardValue(key, mesure);
  if (montre === null) {
    fail(`${ctx.where}« ${label} » est sur une touche de lettre : elle ne partage son chiffre avec personne. La mesure « touche » ne vaut que pour la rangée du haut (& é " ' ( - è _ ç à).`);
  }
  if (to !== null && String(montre) !== String(to.text)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais le clavier montre ${montre} `
      + `(${DIT[mesure]} de « ${key.char} » en ${layout.toUpperCase()}). `
      + 'Le moteur visuel refuse d’afficher autre chose que ce qui est compté.');
  }

  // Le clavier se pose au centre de la VUE — pas du viewBox : si la ligne
  // défile, le milieu de l'écran n'est plus le milieu de la scène (`ancreVue`).
  const vue = ancreVue(ctx);
  const boardPos = {
    x: vue.x,
    y: vue.y + ctx.metrics.fontSize * 0.9 + geo.height / 2,
  };
  const keyPos = { x: boardPos.x + key.cx, y: boardPos.y + key.cy };
  const halo = haloDe(geo, key, mesure);
  // ★ D'où tombe le nombre : la touche, la réglette, ou la marge.
  const source = mesure === 'colonne'
    ? { x: boardPos.x + key.cx, y: boardPos.y + geo.rulerCy }
    : mesure === 'rangee'
      ? { x: boardPos.x + geo.marginCx, y: boardPos.y + geo.rowLabels[key.rangee - 1].cy }
      : keyPos;

  // ── 1. le décor : monté maintenant, ou déjà là ──────────────────────────
  //   ★ Le clavier se MUTUALISE, comme la table : sur `hope-hope-hope.fr`, les
  //   deux tirets du 6 se convertissent l'un après l'autre — le faire
  //   redescendre puis remonter entre les deux n'aurait aucun sens. L'identité
  //   du nœud est celle du DESSIN (disposition, rangées montrées, repères de
  //   la mesure) : deux ops qui montrent le même clavier partagent le nœud,
  //   deux claviers différents ne peuvent pas se confondre.
  const board = `@kbd:${layout}:${rows}:${mesure}`;
  const deployer = !decorEnLAir(ctx, board) || ctx.op.montre === true;
  const replier = ctx.op.retire !== false;

  const t0 = monterDecor(ctx, {
    id: board, role: 'keyboard', data: { geo, mesure, layout },
    pos: boardPos, width: geo.width, deployer,
    encombrement: {
      // La réglette de colonnes dépasse au-dessus du clavier ; la marge des
      // rangées dépasse à gauche. La caméra doit les faire tenir aussi.
      haut: boardPos.y - geo.height / 2 - (mesure === 'colonne' ? geo.keyH * 0.7 : 0),
      bas: boardPos.y + geo.height / 2,
      largeur: mesure === 'rangee' ? geo.width + geo.keyW : geo.width,
      pad: PAD,
    },
  });

  // ── 2. l'aller-retour de CE caractère, en entier ────────────────────────
  const fin = allerRetour(ctx, {
    src, to, t0, kind: 'digit',
    case: {
      id: `@key:${src.id}`, w: halo.w, h: halo.h, rx: 6,
      x: boardPos.x + halo.cx, y: boardPos.y + halo.cy,
    },
    arrivee: keyPos,
    source,
  });

  // ── 3. le décor se retire — seulement si la suite ne l'emploie plus ─────
  if (replier) replierDecor(ctx, board, fin);
}

const DIT = Object.freeze({ touche: 'le chiffre', colonne: 'la colonne', rangee: 'la rangée' });

/** Boîte à éclairer, en coordonnées locales du clavier. */
function haloDe(geo, key, mesure) {
  if (mesure === 'colonne') {
    // La colonne + sa graduation sur la réglette : c'est elle la source du nombre.
    const haut = geo.rulerCy - geo.keyH * 0.34;
    const bas = geo.height / 2 + 4;
    return { cx: key.cx, cy: (haut + bas) / 2, w: key.w + 8, h: bas - haut };
  }
  if (mesure === 'rangee') {
    const gauche = geo.marginCx - geo.keyW * 0.34;
    const droite = geo.width / 2 + 4;
    return { cx: (gauche + droite) / 2, cy: key.cy, w: droite - gauche, h: key.h + 8 };
  }
  return { cx: key.cx, cy: key.cy, w: key.w, h: key.h };
}

