/**
 * `horns` — LES CORNES. La chute du site.
 *
 * Trois 6 sont déjà côte à côte dans la ligne, dans cet ordre, sans rien entre
 * eux : le 666 est écrit avant qu'on le regarde. On lui met des cornes, et le
 * reste de la séquence s'efface.
 *
 * ## Pourquoi une op à part, et pas une option de `highlight` ou de `drop`
 *
 * Le vocabulaire nomme des **gestes**, et le nom de l'op est la première chose
 * qu'on lit d'un scénario (CONTRACTS §3.1, amendement `fourteenSeg`). Aucun des
 * gestes existants ne dit celui-ci : `highlight` désigne sans rien dessiner,
 * `drop` efface sans rien couronner, `reveal` conclut — alors que les cornes se
 * posent **en cours de route** et durent jusqu'au verdict. « On met les
 * cornes » se lit ; « `highlight` avec l'option cornes » mentirait sur ce qui
 * se passe.
 *
 * ## Pourquoi la primitive EFFACE elle-même
 *
 * Parce que le contrôle croisé n'y survivrait pas autrement. Si un `drop`
 * effaçait le reste dans un step précédent — ou même simplement avant nous dans
 * le même step —, la primitive ne verrait plus que trois 6 seuls dans la ligne,
 * donc trivialement contigus, et elle couronnerait sans broncher trois 6 qui
 * étaient dispersés. Or c'est exactement ce qu'elle doit refuser : **des cornes
 * sur autre chose que trois 6 contigus sont une affirmation, pas une
 * démonstration** (CONTRACTS §0.3). Elle vérifie donc la contiguïté sur la
 * ligne **telle qu'elle est**, puis efface.
 *
 * ## L'ordre des deux gestes, et il n'est pas indifférent
 *
 * Le reste s'efface **avant** — et à la fin, pendant — que les cornes poussent,
 * jamais après. C'est ce qui fait lire « il n'y avait que ça » plutôt que « on
 * a enlevé ce qui gênait ». L'effacement est celui de `drop` en mode gomme
 * (`effacerSurPlace`, `helpers.js`) : un par un, sur place, sans que rien
 * bouge.
 *
 * ★ Et `efface` peut être VIDE, sans que rien ne change ici. L'assemblage a le
 * droit de scinder le geste en deux moments — couronner dès que les trois 6
 * existent, effacer une seule fois juste avant le verdict (`reglerLesCornes`,
 * `recherche/scenario.js`, CONTRACTS §3.1). Ce qu'il ne peut pas faire, c'est
 * effacer AVANT : la primitive lit alors une ligne pleine, et le contrôle
 * croisé ci-dessous garde exactement la même valeur.
 *
 * ## Les cornes se posent SUR les 6, pas sur la scène
 *
 * Le nœud est **accroché** au 6 du milieu (`data.suit`) : `scene.satellitesDe`
 * le fait suivre à chaque reflow, et le verdict l'agrandit avec les chiffres
 * qu'il couronne. C'est la différence avec une accolade de `partition`, qui est
 * posée à un ENDROIT et se retire à la fin de son step précisément parce
 * qu'elle ne suivrait pas.
 *
 * ★ Un seul nœud, et il est ancré sur le 6 DU MILIEU. Trois jetons de même
 * chasse séparés par des écarts égaux ont pour centre le centre du jeton
 * médian : l'ancre du nœud est donc exactement le centre du groupe, et les deux
 * cornes sont dessinées de part et d'autre dans le repère local. Deux
 * conséquences, toutes deux nécessaires : le verdict, qui grossit les chiffres
 * ET leurs écarts du même facteur, agrandit le groupe **autour de ce même
 * point** — un `scale` sur le nœud suffit donc, sans arithmétique de
 * rattrapage ; et la croissance des cornes (`scale` 0 → 1) les fait jaillir du
 * 666 lui-même.
 *
 * ## Le dessin
 *
 * Deux cornes, tracées à la main, en **rubrique** — la couleur de
 * l'affirmation (design §2.3), celle que le verdict donnera aux chiffres. Rien
 * d'autre : pas de halo, pas d'aura. « À l'instant où les chiffres occupent
 * l'essentiel de la scène, il n'y a plus rien d'autre à regarder. »
 *
 * Un seul tracé, deux sous-chemins fermés, **rempli** : une corne porte son
 * épaisseur dans sa forme — large au pied, fine à la pointe —, ce qu'un trait
 * d'épaisseur constante ne sait pas dire.
 */

import { targetsOf, effacerSurPlace } from './helpers.js';
import { EASE } from '../constants.js';
import { fail } from '../errors.js';

export const name = 'horns';

/** 666 fait trois 6. Ni deux, ni quatre. */
const SUITE = 3;

/**
 * Proportions de la corne. Tout est en hauteurs de police, sauf `ecart`, qui
 * est en demi-largeurs de groupe.
 *
 * `ecart` place les deux bases au-dessus du PREMIER et du TROISIÈME 6, jamais
 * au-dessus de celui du milieu : un diable n'a pas de corne frontale.
 *
 * ★ Les deux `galbe` sont ce qui fait qu'on lit une corne et non un aileron.
 * Une corne dessinée par deux droites entre une base et une pointe donne une
 * nageoire ; il faut que le tracé COURBE — que la pointe se détache de la base
 * en s'écartant — et que la section s'affine tout du long. Les deux bords sont
 * donc bombés vers l'extérieur, l'intérieur un peu plus que l'extérieur, ce qui
 * amincit la corne à mesure qu'elle monte. Valeurs arrêtées en comparant les
 * tracés côte à côte, à la taille du verdict comme à celle de la ligne.
 */
const CORNE = Object.freeze({
  ecart: 0.68,       // × la demi-largeur du groupe
  jeu: 0.01,         // l'air entre le sommet des 6 et la base de la corne
  hauteur: 0.54,     // de la base à la pointe
  ouverture: 0.24,   // de combien la pointe s'écarte vers l'extérieur
  base: 0.26,        // largeur de la corne à sa naissance
  galbeExterne: 0.10,
  galbeInterne: 0.13,
});

export function plan(ctx) {
  const cornus = targetsOf(ctx);
  const efface = ctx.scene.resolve(ctx.op.efface ?? [], `${ctx.where}« efface » : `);

  // ── Contrôle croisé : trois 6, et ils se touchent ────────────────────────
  //
  // Troisième et dernier verrou (les deux autres sont dans
  // `transformations/mappeurs.js` et `recherche/scenario.js`). Il est le seul à
  // interroger LA LIGNE : ce que le spectateur a sous les yeux.
  if (cornus.length !== SUITE) {
    fail(`${ctx.where}« targets » désigne ${cornus.length} jeton(s) : les cornes se posent sur `
      + 'trois 6, parce que 666 fait trois 6.', { targets: cornus });
  }
  const textes = cornus.map((id) => String(ctx.scene.live(id, ctx.where).text));
  if (!textes.every((t) => t === '6')) {
    fail(`${ctx.where}les cornes se poseraient sur « ${textes.join(' ')} » : seuls trois 6 font `
      + 'un 666. Couronner autre chose serait l’affirmer au lieu de le montrer (CONTRACTS §0.3).',
    { textes });
  }
  const rangs = cornus.map((id) => ctx.scene.flowIndex(id));
  if (rangs.some((r) => r < 0) || rangs[1] !== rangs[0] + 1 || rangs[2] !== rangs[1] + 1) {
    fail(`${ctx.where}les trois 6 occupent les rangs ${rangs.join(', ')} de la ligne : ils ne se `
      + 'touchent pas. Trois 6 éparpillés ne sont pas un 666 trouvé, ce sont trois 6 qu’il '
      + 'faudrait rassembler — et rassembler est l’autre geste, celui qui coûte '
      + '(CONTRACTS §3.1, « On ne garde que les 6 »).', { rangs });
  }
  const surTrois = new Set(cornus);
  const intrus = efface.filter((id) => surTrois.has(id));
  if (intrus.length) {
    fail(`${ctx.where}« efface » demande d’effacer ${intrus.join(', ')}, qui portent des cornes. `
      + 'On n’efface pas ce qu’on couronne.', { intrus });
  }

  // ── 1. le reste s'efface — d'abord, et sans que rien ne bouge ────────────
  //
  // « Il n'y avait que ça » ne se lit que dans cet ordre. Les survivants ne se
  // resserrent pas : le 666 est déjà d'un seul tenant, il n'y a aucun trou à
  // refermer entre ses trois chiffres, et un `move` ferait croire qu'on l'a
  // fabriqué en rapprochant des chiffres épars.
  const gomme = efface.length ? ctx.dur * 0.62 : 0;
  const finGomme = effacerSurPlace(ctx, efface, { at: 0, dur: gomme });

  // ── 2. les cornes poussent, sur la fin de l'effacement ───────────────────
  const centre = ctx.scene.pos(cornus[1]);
  if (!centre) {
    fail(`${ctx.where}le 6 du milieu n’a pas de position : les cornes ne sauraient pas où pousser.`,
      { id: cornus[1] });
  }
  const demiLargeur = demiLargeurDuGroupe(ctx, cornus);
  const id = `@cornes:${cornus[1]}`;
  ctx.scene.create({
    id,
    role: 'horns',
    inFlow: false,
    w: demiLargeur * 2,
    // `suit` accroche le décor au 6 du milieu : il le suivra à chaque reflow
    // (`compile.js`) et grandira avec lui au verdict (`reveal.js`).
    // `debord` dit de combien il DÉPASSE vers le haut, en unités nominales :
    // c'est ce que le verdict doit connaître pour ne pas envoyer les pointes
    // hors du cadre en grossissant les chiffres (voir `reveal.js`).
    data: { d: cornesD(ctx, demiLargeur), suit: cornus[1], debord: mesuresCorne(ctx).debord },
    base: { opacity: 0, scale: 0, fill: ctx.palette.rubric },
  }, { where: ctx.where });
  ctx.place(id, { x: centre.x, y: centre.y, w: demiLargeur * 2 });

  // Elles commencent à pousser AVANT que la gomme ait fini : le recouvrement
  // est ce qui empêche de lire deux gestes successifs là où il n'y en a qu'un.
  const depart = Math.max(0, Math.min(finGomme * 0.7, ctx.dur * 0.5));
  const pousse = Math.max(1, ctx.dur - depart);
  ctx.anim({ id, prop: 'opacity', to: 1, at: depart, dur: pousse * 0.4 });
  ctx.anim({ id, prop: 'scale', to: 1, at: depart, dur: pousse, ease: EASE.pop });
}

/**
 * Les mesures de la corne, en unités de scène — source unique du TRACÉ et du
 * DÉBORD annoncé au verdict.
 *
 * Une seule fonction pour les deux, parce qu'un débord recopié à côté du tracé
 * finirait par mentir : les pointes grandiraient au verdict sans que celui-ci
 * le sache, et il les enverrait hors du cadre.
 */
function mesuresCorne(ctx) {
  const fs = ctx.metrics.fontSize;
  const capitale = ctx.metrics.capHeight || fs * 0.73;
  const y0 = -(capitale / 2 + fs * CORNE.jeu);   // la ligne de crâne
  const h = fs * CORNE.hauteur;
  return {
    y0,
    h,
    ouv: fs * CORNE.ouverture,
    e: fs * CORNE.base,
    galbeExterne: fs * CORNE.galbeExterne,
    galbeInterne: fs * CORNE.galbeInterne,
    debord: -y0 + h,
  };
}

/**
 * La demi-largeur du groupe des trois 6, mesurée sur la LIGNE.
 *
 * Redérivée des positions plutôt que reçue en paramètre : le dessin doit
 * s'ajuster à ce qui est réellement affiché, jusques et y compris quand un
 * `reveal` antérieur aurait changé la chasse.
 */
function demiLargeurDuGroupe(ctx, ids) {
  let g = Infinity;
  let d = -Infinity;
  for (const id of ids) {
    const p = ctx.scene.pos(id);
    if (!p) continue;
    g = Math.min(g, p.x - p.w / 2);
    d = Math.max(d, p.x + p.w / 2);
  }
  if (g === Infinity) return ctx.metrics.advance * 1.5;
  return Math.max(ctx.metrics.advance, (d - g) / 2);
}

/**
 * Les deux cornes, en un seul tracé de deux sous-chemins.
 *
 * Repère local : origine au centre du groupe, `y` vers le bas (celui du SVG),
 * donc les pointes sont à `y` négatif. Chaque corne part d'une base posée sur la
 * ligne de crâne, s'élève en s'affinant et penche vers l'extérieur.
 */
function cornesD(ctx, demiLargeur) {
  const m = mesuresCorne(ctx);
  const x0 = demiLargeur * CORNE.ecart;
  return [-1, 1].map((s) => corneD(s, s * x0, m)).join(' ');
}

/**
 * Une corne. `s` vaut −1 (celle de gauche) ou +1 (celle de droite) : la corne
 * est décrite une seule fois, dans un repère dont le `+x` va vers l'EXTÉRIEUR,
 * et `s` la retourne. Deux tracés symétriques écrits à la main finiraient par
 * ne plus l'être.
 *
 * Trois points suffisent à la décrire — les deux pieds et la pointe — et les
 * deux bords sont des cubiques dont les poignées partent de la corde et sont
 * poussées vers l'extérieur (le `galbe`). Le tracé est donc exactement aussi
 * long qu'il doit l'être : deux courbes, une fermeture.
 */
function corneD(s, cx, m) {
  const p = (u) => `${r(cx + s * u[0])} ${r(m.y0 + u[1])}`;
  const pied = [-m.e / 2, 0];        // vers l'intérieur du groupe
  const talon = [m.e / 2, 0];        // vers l'extérieur
  const pointe = [m.ouv, -m.h];
  const sur = (a, b, t, galbe) => [a[0] + (b[0] - a[0]) * t + galbe, a[1] + (b[1] - a[1]) * t];
  return [
    `M ${p(talon)}`,
    // bord externe : du talon à la pointe, bombé vers le dehors
    `C ${p(sur(talon, pointe, 1 / 3, m.galbeExterne))} `
      + `${p(sur(talon, pointe, 2 / 3, m.galbeExterne))} ${p(pointe)}`,
    // bord interne : de la pointe au pied, bombé davantage — c'est lui qui affine
    `C ${p(sur(pointe, pied, 1 / 3, m.galbeInterne))} `
      + `${p(sur(pointe, pied, 2 / 3, m.galbeInterne))} ${p(pied)}`,
    'Z',
  ].join(' ');
}

function r(v) {
  return Math.round(v * 1000) / 1000;
}
