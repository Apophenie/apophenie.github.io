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
 * Chaque corne est un nœud **accroché** au 6 qu'elle couronne (`data.suit`) :
 * `scene.satellitesDe` le fait suivre à chaque reflow, et le verdict l'agrandit
 * avec le chiffre qu'il couronne. C'est la différence avec une accolade de
 * `partition`, qui est posée à un ENDROIT et se retire à la fin de son step
 * précisément parce qu'elle ne suivrait pas.
 *
 * ★ **UNE CORNE, UN NŒUD, SUR SON PROPRE 6** — et pourquoi ce n'est plus un
 * seul nœud ancré au 6 du milieu.
 *
 * C'était le premier dessin : un nœud, accroché au chiffre médian, portant les
 * deux cornes de part et d'autre à `± entraxe` dans son repère local. Il
 * reposait sur un raisonnement — « le verdict grossit les chiffres ET leurs
 * écarts du même facteur, donc le groupe subit une homothétie autour de l'ancre,
 * donc un `scale` suffit ». Le raisonnement est juste, et sa prémisse est
 * FAUSSE : le verdict ne se contente pas de multiplier les écarts, il les
 * REPOSE (`poserLeFlux` réécrit `gapBefore` à partir de `layoutOpts.gap`). Sur
 * la voie « Donald Trump », les cornes se posent pendant un découpage, où
 * `partition` a resserré la ligne à 0,7 écart ; le verdict rend l'écart plein.
 * L'entraxe passe donc de 33,0 à 34,8 unités nominales — un facteur 1,055 que
 * le `scale` du décor ne porte pas. Mesuré dans le navigateur : les pieds des
 * cornes tombaient 7,4 unités en deçà du sommet des barres, au verdict.
 *
 * Or l'entraxe n'a rien à faire dans le dessin d'une corne. Une corne est
 * posée sur UN chiffre : sa base est calée sur la barre de CE 6, et rien de sa
 * forme ne dépend de la distance à ses voisins. En donnant à chaque corne son
 * propre nœud, accroché au 6 qu'elle couronne, l'entraxe disparaît de la
 * géométrie — et avec lui toute la classe de bugs « la ligne s'est re-espacée
 * et le décor ne l'a pas su ». Le calage n'est plus préservé par une
 * coïncidence d'échelles, il est **structurellement impossible à casser** :
 * chaque corne suit son 6 à chaque reflow (`scene.satellitesDe`) et grandit
 * avec lui au verdict (`animSolidaire`), comme n'importe quel décor accroché.
 *
 * Corollaire sur le geste : chaque corne jaillit (`scale` 0 → 1) du 6 qu'elle
 * couronne, et non du centre du groupe. C'est ce qu'on veut voir — une corne
 * pousse sur une tête, pas au milieu de trois.
 *
 * ## Le dessin
 *
 * Deux cornes, tracées à la main, en **rubrique** — la couleur de
 * l'affirmation (design §2.3), celle que le verdict donnera aux chiffres. Rien
 * d'autre : pas de halo, pas d'aura. « À l'instant où les chiffres occupent
 * l'essentiel de la scène, il n'y a plus rien d'autre à regarder. »
 *
 * Un sous-chemin fermé par corne, **rempli** : une corne porte son épaisseur
 * dans sa forme — large au pied, fine à la pointe —, ce qu'un trait d'épaisseur
 * constante ne sait pas dire. Les deux sont décrites par la MÊME fonction, au
 * signe près : deux tracés symétriques écrits séparément finiraient par ne plus
 * l'être.
 *
 * ## ★ LE CALAGE — les cornes poussent DU chiffre, elles ne flottent pas dessus
 *
 * L'écartement des cornes était un réglage à l'œil (`ecart: 0.68` × la
 * demi-largeur du groupe) : « au-dessus du premier et du troisième 6 », à peu
 * près. L'auteur a demandé mieux, et l'a dit très précisément — « que le côté
 * droit de la corne droite soit dans le prolongement du côté droit de la barre
 * du 6 de droite, et que la pointe droite de la corne de gauche arrive sur la
 * pointe en haut à droite de la barre du 6 de gauche ».
 *
 * Le « 6 » de JetBrains Mono porte sa barre haute en trois segments DROITS : la
 * montée oblique s'achève au sommet gauche, le sommet est plat sur 0,1 em, puis
 * le flanc droit redescend. Deux nombres suffisent donc — l'abscisse du sommet
 * droit et la pente du flanc —, et ils sont RELEVÉS SUR LE CONTOUR, jamais
 * transcrits : `SIX_BARRE` (`assets.js`), dérivé par `src/gfx/jetbrains-six.py`
 * et vérifié en CI, exactement comme les segments des afficheurs
 * (CONTRACTS §0.3, règle structurelle).
 *
 * ★ **Et les deux contraintes tombent juste, sans rien sacrifier de la
 * symétrie.** Écrivons `S` l'abscisse du sommet droit de la barre depuis le
 * centre de SON jeton, `x₀` l'écartement cherché (depuis le centre du groupe) et
 * `e` la largeur de la base d'une corne. La corne de droite doit poser son pied
 * externe sur le sommet du 6 de droite (`x₀ + e/2 = D + S`, où `D` est l'entraxe
 * des jetons) ; la corne de gauche doit poser son point le plus à droite — son
 * pied interne — sur le sommet du 6 de gauche (`−x₀ + e/2 = −D + S`). La
 * différence donne `x₀ = D` et la somme `e = 2·S` : **chaque corne est centrée
 * sur SON 6, et sa base est large de deux fois le débord de la barre.** Deux
 * contraintes, deux inconnues, une solution exacte — et elle est symétrique par
 * construction. Rien n'est arbitré, rien n'est arbitraire.
 *
 * ★ Au `jeu` près, qui est de l'air VOULU : la base des cornes ne touche pas le
 * crâne des 6, elle flotte `jeu` au-dessus. Les deux pieds glissent donc de
 * `pente × jeu` sur le prolongement du flanc — ils restent SUR la droite, ce qui
 * est précisément ce que « dans le prolongement » veut dire.
 *
 * ★ Reste la DIRECTION, sans laquelle « prolongement » ne serait qu'un point de
 * contact suivi d'un coude. La première poignée de Bézier du bord externe est
 * posée sur cette même droite : la corne quitte donc sa base exactement dans
 * l'axe du flanc du chiffre. C'est ce qui fixe `galbeExterne`, qui cesse d'être
 * un réglage — voir `CORNE` pour ce qu'on y perd.
 *
 * ★ **Et `D` a disparu.** Le calcul ci-dessus dit ce qu'il fallait trouver ; le
 * résultat — « chaque corne est centrée sur SON 6 » — dit qu'il n'y avait rien à
 * mesurer entre les chiffres. Chaque corne est donc dessinée dans le repère de
 * son propre jeton, base à `± e/2` de son centre, et l'entraxe ne figure nulle
 * part (voir plus haut, « UNE CORNE, UN NŒUD »). C'est ce qui fait tenir le
 * calage à toutes les tailles ET à tous les espacements : `e` ne dépend que de
 * `fontSize` et du contour du chiffre, et le décor porte le `scale` de son 6.
 * `src/visuel/tests/cornes.test.js` le MESURE plutôt que de le supposer — à la
 * taille de la ligne, à celle du verdict, et sur une ligne resserrée par un
 * découpage puis rendue à son écart plein.
 *
 * ## ★ Les trois 6 changent de camp en même temps que les cornes poussent
 *
 * « J'aimerais que tu colores les 6 associés aux cornes au moment où tu leur
 * ajoutes les cornes » (l'auteur). Ils passent en **rubrique**, la couleur des
 * cornes elles-mêmes et celle que le verdict donnera aux chiffres : le geste se
 * lit d'un seul tenant — le 666 est désigné, il bascule. Ce n'est pas une
 * anticipation du verdict, c'est ce qui le rend inévitable ; entre les deux, les
 * trois chiffres RESTENT rubriqués, et le verdict n'a plus qu'à les confirmer.
 */

import { targetsOf, effacerSurPlace } from './helpers.js';
import { EASE } from '../constants.js';
import { SIX_BARRE } from '../assets.js';
import { fail } from '../errors.js';

export const name = 'horns';

/** 666 fait trois 6. Ni deux, ni quatre. */
const SUITE = 3;

/**
 * Proportions de la corne, en hauteurs de police.
 *
 * ★ Ce qui n'est PLUS ici : l'écartement des cornes et la largeur de leur base.
 * Les deux étaient des réglages à l'œil (`ecart: 0.68` × la demi-largeur du
 * groupe, `base: 0.26`) et ils sont devenus des CONSÉQUENCES du dessin du
 * chiffre — voir `mesuresCorne`, `SIX_BARRE` et l'en-tête « Le calage ».
 *
 * ★ Les deux `galbe` sont ce qui fait qu'on lit une corne et non un aileron.
 * Une corne dessinée par deux droites entre une base et une pointe donne une
 * nageoire ; il faut que le tracé COURBE — que la pointe se détache de la base
 * en s'écartant — et que la section s'affine tout du long. Les deux bords sont
 * donc bombés vers l'extérieur, l'intérieur un peu plus que l'extérieur, ce qui
 * amincit la corne à mesure qu'elle monte.
 *
 * ★ `galbeExterne` n'est plus une valeur libre non plus, et c'est le seul
 * sacrifice de la refonte : il vaut désormais ce qu'il faut pour que le bord
 * externe QUITTE sa base dans la direction du flanc de la barre (voir
 * `mesuresCorne`). Il valait 0,10 ; il tombe à ≈ 0,072 à la taille de la ligne,
 * donc la corne est un peu moins bombée sur son flanc externe. On perd un rien
 * de rondeur, on gagne que la corne pousse VRAIMENT dans le prolongement du
 * chiffre au lieu d'y faire un coude de six degrés. `galbeInterne`, lui — celui
 * qui affine la corne et fait le galbe qu'on regarde — est intact.
 */
const CORNE = Object.freeze({
  jeu: 0.01,         // l'air entre le sommet des 6 et la base de la corne
  hauteur: 0.54,     // de la base à la pointe
  ouverture: 0.24,   // de combien la pointe s'écarte vers l'extérieur
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
  //
  // Une par 6 EXTÉRIEUR : un diable n'a pas de corne frontale, et le 6 du
  // milieu n'en porte donc aucune. Chacune est un décor accroché à SON chiffre
  // — voir l'en-tête, « UNE CORNE, UN NŒUD ».
  const m = mesuresCorne(ctx);
  const largeur = largeurDeCorne(m);
  // Elles commencent à pousser AVANT que la gomme ait fini : le recouvrement
  // est ce qui empêche de lire deux gestes successifs là où il n'y en a qu'un.
  const depart = Math.max(0, Math.min(finGomme * 0.7, ctx.dur * 0.5));
  const pousse = Math.max(1, ctx.dur - depart);

  for (const s of [-1, 1]) {
    const porteur = cornus[s < 0 ? 0 : 2];
    const ou = ctx.scene.pos(porteur);
    if (!ou) {
      fail(`${ctx.where}le 6 « ${porteur} » n’a pas de position : sa corne ne saurait pas où `
        + 'pousser.', { id: porteur });
    }
    const id = `@cornes:${porteur}`;
    ctx.scene.create({
      id,
      role: 'horns',
      inFlow: false,
      w: largeur,
      // `suit` accroche le décor à SON 6 : il le suivra à chaque reflow
      // (`compile.js`) et grandira avec lui au verdict (`reveal.js`).
      // `debord` dit de combien il DÉPASSE vers le haut, en unités nominales :
      // c'est ce que le verdict doit connaître pour ne pas envoyer les pointes
      // hors du cadre en grossissant les chiffres (voir `reveal.js`).
      data: { d: corneD(s, 0, m), suit: porteur, debord: m.debord },
      base: { opacity: 0, scale: 0, fill: ctx.palette.rubric },
    }, { where: ctx.where });
    ctx.place(id, { x: ou.x, y: ou.y, w: largeur });
    ctx.anim({ id, prop: 'opacity', to: 1, at: depart, dur: pousse * 0.4 });
    ctx.anim({ id, prop: 'scale', to: 1, at: depart, dur: pousse, ease: EASE.pop });
  }

  // ── 3. et les trois 6 passent en rubrique, PENDANT que les cornes poussent ─
  //
  // Même instant de départ que la pousse, et une durée qui tient dans la
  // sienne : c'est un seul geste, pas deux. Le 666 ne se contente pas d'être
  // couronné, il change de camp — et il gardera cette couleur jusqu'au verdict,
  // qui n'aura plus qu'à la confirmer (`reveal.js`, même canal, step suivant :
  // les deux ne se recouvrent jamais, donc aucune animation concurrente).
  //
  // ★ Les TROIS rougissent, pas seulement les deux couronnés : c'est le 666
  // qu'on désigne, et le chiffre du milieu en fait partie autant que ses
  // voisins. C'est même lui qui rendrait le geste illisible s'il restait à sa
  // couleur — deux 6 rouges encadrant un 6 pâle ne se lit pas « 666 ».
  //
  // `animSolidaire` plutôt que `anim` : `fill` est l'un des canaux à valeur
  // commune (`compile.js`), et les deux 6 extérieurs portent chacun une corne.
  // Que celle-ci soit DÉJÀ rubrique ne dispense de rien — c'est la règle qui
  // tient, pas le fait que ce coup-ci elle ne change rien.
  for (const cid of cornus) {
    ctx.animSolidaire({ id: cid, prop: 'fill', to: ctx.palette.rubric, at: depart, dur: pousse * 0.6 });
  }
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
  const capitale = ctx.metrics.capHeight || fs * SIX_BARRE.sommetY;
  const air = fs * CORNE.jeu;                    // l'air sous la base
  const y0 = -(capitale / 2 + air);              // la ligne de crâne, moins l'air
  const h = fs * CORNE.hauteur;
  const ouv = fs * CORNE.ouverture;

  // ── Le calage, relevé sur le glyphe (voir l'en-tête, « LE CALAGE ») ───────
  //
  // `sommet` : de combien le sommet droit de la barre du 6 est à droite du
  // CENTRE de son jeton. La police compte depuis l'ORIGINE du glyphe et les
  // jetons sont ancrés par leur centre, d'où la demi-chasse retranchée — et
  // c'est la chasse RÉELLE (`metrics.advance`, recalibrée après
  // `document.fonts.ready`), pas la nominale, sinon le calage se décollerait du
  // jour où la mesure corrigerait la métrique déclarée.
  const sommet = fs * SIX_BARRE.sommetX - ctx.metrics.advance / 2;
  const pente = SIX_BARRE.pente;

  // La base d'une corne est large de deux fois ce débord — c'est la somme des
  // deux contraintes de l'auteur, et elle est symétrique par construction. Le
  // `+ pente × air` fait glisser les deux pieds SUR le prolongement du flanc,
  // puisqu'ils sont posés `air` plus haut que le sommet de la barre.
  const e = 2 * (sommet + pente * air);

  // Et le bord externe quitte sa base DANS L'AXE de ce flanc : sa première
  // poignée de Bézier est posée sur la même droite, à `h/3` au-dessus du talon
  // (voir `corneD` : la poignée est au tiers de la corde, décalée du galbe).
  // Le galbe externe est donc ce qui reste une fois la direction imposée.
  const galbeExterne = pente * (h / 3) - (ouv - e / 2) / 3;

  return {
    y0,
    h,
    ouv,
    e,
    pente,
    galbeExterne,
    galbeInterne: fs * CORNE.galbeInterne,
    debord: -y0 + h,
  };
}

/**
 * La largeur qu'occupe UNE corne, en unités de scène.
 *
 * Sert au `w` du nœud — ce que la scène croit qu'il encombre. Ce n'est pas une
 * valeur d'agrément : un décor sans largeur crédible fausserait toute boîte
 * englobante qui viendrait à l'inclure. On prend l'enveloppe convexe des points
 * de contrôle, qui contient la courbe : large, mais jamais menteuse.
 */
function largeurDeCorne(m) {
  const dehors = Math.max(m.e / 2 + m.galbeExterne, m.ouv + m.galbeInterne);
  return dehors + m.e / 2;
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
 *
 * ★ `cx` est le centre du 6 que cette corne couronne, et `m.e` vaut deux fois le
 * débord de la barre de ce 6 : le talon et le pied tombent donc exactement sur
 * les deux sommets — le droit pour la corne de droite, celui du 6 de gauche pour
 * la corne de gauche. Et la première poignée du bord externe est posée sur le
 * prolongement du flanc, ce que `m.galbeExterne` encode (voir `mesuresCorne`).
 */
function corneD(s, cx, m) {
  const p = (u) => `${r(cx + s * u[0])} ${r(m.y0 + u[1])}`;
  // Les deux pieds reposent sur le sommet de la barre du 6 couronné : celui du
  // dedans à `−e/2`, celui du dehors à `+e/2`, et `e = 2·(débord de la barre)`.
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
