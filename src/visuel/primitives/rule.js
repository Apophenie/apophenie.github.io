/**
 * `rule` — LE TRAIT DE FRACTION, QUI SUIT CE QU'IL SÉPARE.
 *
 * > « La barre de fraction doit suivre en longueur quand le contenu s'adapte.
 * >   […] Pendant ce temps, la barre de fraction se réduit pour s'adapter à ce
 * >   qui reste. Quand il ne reste plus rien en bas, elle finit de se réduire
 * >   et disparaît. » (l'auteur)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ★ **POURQUOI CE N'EST NI UN JETON DE TIRETS, NI `fraction`.**
 *
 * Le premier jet écrivait la barre en tirets — `————————` — comme un jeton de
 * plus. Ça tient tant que rien ne bouge, et ça ment dès que quelque chose
 * bouge : la longueur d'un texte est un NOMBRE DE SIGNES, elle ne s'interpole
 * pas. Une barre qui doit passer de six lettres à une ne peut que sauter de
 * huit tirets à deux, d'une image à l'autre. Or ce qu'on demande ici est
 * précisément un rétrécissement CONTINU, qui se lise comme une conséquence de
 * ce qui disparaît au-dessus et au-dessous.
 *
 * Et ce n'est pas `fraction` : celle-ci est la chorégraphie complète d'une
 * MOYENNE — poser une somme, construire un diviseur, changer la barre en `÷`.
 * Elle produit un trait, mais comme étape d'un calcul de sept temps. Ici la
 * fraction est l'ÉNONCÉ : elle est là avant le premier geste, elle y survit
 * jusqu'au dernier, et rien ne la divise. Deux choses qui dessinent le même
 * segment pour deux raisons sans rapport.
 *
 * ★ **CE N'EST PAS NON PLUS UNE ACCOLADE COUCHÉE.** Une accolade AFFIRME
 *   (« ceci, pris ensemble »), elle a une pointe qui désigne un résultat, et
 *   elle se retire quand son affaire est réglée. Un trait de fraction ne
 *   désigne rien : il SÉPARE, et il reste tant qu'il y a deux côtés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ## Les deux emplois
 *
 * ```js
 * { op: 'rule', id: 'barre', couvre: { all: true } }  // se cale sur ce qui reste
 * { op: 'rule', id: 'barre', to: 0, retire: true }    // se referme et s'en va
 * ```
 *
 * `couvre` désigne ce que la barre doit couvrir ; elle prend la largeur de la
 * plus large des LIGNES qu'occupent ces jetons — pas la boîte de tous, qui
 * additionnerait des colonnes de rangs différents. Un `debord` s'ajoute de
 * chaque côté, parce qu'un trait qui s'arrête pile au bord du dernier glyphe
 * se lit comme un soulignement, pas comme une division.
 *
 * ⚠️ **LA BARRE EST DANS LE FLUX**, et c'est ce qui lui donne sa ligne et son
 *   centrage. Changer sa largeur ne suffit donc pas : il faut la republier
 *   (`node.w`) et laisser le layout recentrer le bloc, faute de quoi la barre
 *   raccourcirait par la droite au lieu de raccourcir par les deux bouts.
 */

import { EASE, progressionDe } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'rule';

/**
 * Ce que le trait déborde de part et d'autre, en avances.
 *
 * Un demi-caractère : assez pour que le trait dépasse visiblement le glyphe
 * extrême, jamais assez pour qu'il paraisse couvrir une colonne vide.
 */
const DEBORD = 0.5;

/** La largeur en deçà de laquelle un trait n'est plus un trait. */
const MINIMUM = 6;

/** Le `d` d'un trait de demi-largeur `W`, centré sur son ancre. */
export function filetD(W) {
  const w = Math.round(Math.max(0, W) * 1000) / 1000;
  return `M ${-w} 0 H ${w}`;
}

/**
 * La largeur que le trait doit prendre pour couvrir `ids`.
 *
 * ★ **PAR LIGNE, ET LA PLUS LARGE — jamais la boîte de tous.** Un numérateur de
 *   trois signes et un dénominateur de six n'occupent pas les mêmes colonnes ;
 *   leur boîte commune est plus large que chacun d'eux, et le trait pris à
 *   cette largeur déborderait des deux. C'est la plus longue des deux lignes
 *   qui commande — c'est elle qui dit jusqu'où la fraction s'étend.
 */
function largeurCouvrante(ctx, ids) {
  const parLigne = new Map();
  for (const id of ids) {
    const n = ctx.scene.get(id);
    if (!n || !n.alive) continue;
    const p = ctx.scene.positions.get(id);
    if (!p) continue;
    const ligne = p.line ?? 0;
    const bornes = parLigne.get(ligne) || { min: Infinity, max: -Infinity };
    bornes.min = Math.min(bornes.min, p.x - p.w / 2);
    bornes.max = Math.max(bornes.max, p.x + p.w / 2);
    parLigne.set(ligne, bornes);
  }
  let large = 0;
  for (const b of parLigne.values()) {
    if (Number.isFinite(b.min) && Number.isFinite(b.max)) large = Math.max(large, b.max - b.min);
  }
  return large ? large + 2 * DEBORD * ctx.metrics.advance : 0;
}

export function plan(ctx) {
  const id = ctx.op.id;
  if (typeof id !== 'string' || !id) {
    fail(`${ctx.where}« id » manquant : « rule » redimensionne un trait déjà posé, il n'en crée pas.`);
  }
  const noeud = ctx.scene.live(id, ctx.where);
  if (noeud.role !== 'filet') {
    fail(`${ctx.where}« ${id} » a le rôle « ${noeud.role} » : « rule » ne gouverne que les traits `
      + '(un jeton de scénario déclaré « role: "filet" »).');
  }

  const depart = ctx.scene.pos(id);
  const w0 = (depart && depart.w) || noeud.w || 0;

  // La cible : soit une largeur dictée, soit celle de ce qu'on couvre.
  let w1;
  if (ctx.op.to !== undefined) {
    if (typeof ctx.op.to !== 'number' || !Number.isFinite(ctx.op.to) || ctx.op.to < 0) {
      fail(`${ctx.where}« to » = ${JSON.stringify(ctx.op.to)} : une largeur est un nombre positif.`);
    }
    w1 = ctx.op.to;
  } else if (ctx.op.couvre !== undefined) {
    const ids = ctx.scene.resolve(ctx.op.couvre, `${ctx.where}couvre : `).filter((x) => x !== id);
    w1 = largeurCouvrante(ctx, ids);
  } else {
    fail(`${ctx.where}« rule » demande « couvre » (ce que le trait sépare) ou « to » (une largeur).`);
  }

  /* ⚠️ `at` reste à ZÉRO : `compile.js` a déjà appliqué `op.at` au moment de
     poser les animations (`delay: t0 + opAt + a`). Le relire ici le compterait
     deux fois — la barre s'ajusterait au double du délai demandé. Même chose
     pour la durée, que `ctx.dur` porte déjà. */
  const at = 0;
  const dur = Math.max(1, ctx.dur);
  const retire = ctx.op.retire === true || w1 < MINIMUM;

  // ★ **LE FLUX D'ABORD, LE TRACÉ ENSUITE — et ils partagent leur courbe.**
  //
  //   `node.w` est ce que le layout mesure ; `data.d` est ce que l'œil voit. Si
  //   les deux ne suivaient pas la même progression, le trait glisserait de son
  //   centre pendant la moitié du geste — visible, et faux : une fraction se
  //   lit sur un axe.
  noeud.w = retire ? 0 : w1;
  ctx.reflow({ at, dur, ease: EASE.move });

  const courbe = progressionDe(EASE.move);
  ctx.discrete({
    id,
    channel: 'd',
    at,
    dur,
    render: (x) => filetD((w0 + ((retire ? 0 : w1) - w0) * courbe(x)) / 2),
  });

  if (retire) {
    // Il se referme AVANT de s'effacer, et non l'inverse : « quand il ne reste
    // plus rien en bas, elle finit de se réduire et disparaît » (l'auteur). Un
    // fondu posé sur toute la durée montrerait un trait qui pâlit en gardant sa
    // longueur — c'est-à-dire un trait qu'on retire, pas un trait qui n'a plus
    // rien à séparer.
    ctx.anim({ id, prop: 'opacity', to: 0, at: at + dur * 0.75, dur: dur * 0.25, ease: EASE.fade });
    ctx.scene.kill(id, ctx.where);
  }
}
