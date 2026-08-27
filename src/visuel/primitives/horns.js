/**
 * `horns` — LES CORNES. La chute du site.
 *
 * Trois 6 sont déjà côte à côte dans la ligne, dans cet ordre, sans rien entre
 * eux : le 666 est écrit avant qu'on le regarde. On lui met des cornes — et,
 * si `efface` en désigne, le reste de la séquence s'efface avec.
 *
 * ★ **Aucun émetteur ne remplit plus `efface`**, et c'est le sens du dernier
 * amendement (CONTRACTS §3.1, « LES CORNES SORTENT DE L'URL »). Les cornes ne
 * sont plus le geste d'un opérateur : elles ne changent ni une valeur, ni un
 * rang, ni un compte, donc elles n'ont rien à faire dans un programme ni dans
 * une URL. L'assemblage les pose sur la LIGNE, selon le REGISTRE, et sans rien
 * effacer (`recherche/scenario.js › couronnerLesTriptyques`) ; l'effacement,
 * lui, est resté chez `mz`, dans une étape à part qui porte son propre motif.
 * Le paramètre est conservé — la primitive sait le faire, un scénario relu
 * d'ailleurs peut en porter un, et les deux sections qui suivent expliquent
 * pourquoi il ne pourrait pas être remplacé par un `drop` voisin.
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
 * ★ Et `efface` peut être VIDE, sans que rien ne change ici — c'est même le
 * seul cas que le projet produise encore. Les deux gestes ont été séparés à la
 * source : l'assemblage couronne dès que les trois 6 s'écrivent, `mz` efface à
 * sa propre étape. Ce que personne ne peut faire, c'est effacer AVANT le
 * couronnement : la primitive lit alors une ligne pleine, et le contrôle croisé
 * ci-dessous garde exactement la même valeur. L'ordre est structurellement tenu
 * — on ne couronne qu'à l'instant où le troisième 6 paraît, donc toujours avant
 * l'étape qui efface.
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
  // Elles commencent à pousser AVANT que la gomme ait fini : le recouvrement
  // est ce qui empêche de lire deux gestes successifs là où il n'y en a qu'un.
  const depart = Math.max(0, Math.min(finGomme * 0.7, ctx.dur * 0.5));
  const pousse = Math.max(1, ctx.dur - depart);

  for (const id of poserLesCornes(ctx, cornus, { echelle: 0 })) {
    ctx.anim({ id, prop: 'opacity', to: 1, at: depart, dur: pousse * 0.4 });
    // ★ Elle JAILLIT — de zéro à sa taille pleine, sur le 6 qu'elle couronne.
    //   Ce n'est pas la même chose que paraître : une corne pousse.
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
 * ★ POSER LES DEUX CORNES — le DESSIN du geste, séparé de son RÉCIT.
 *
 * Une par 6 EXTÉRIEUR : un diable n'a pas de corne frontale, et le 6 du milieu
 * n'en porte donc aucune. Chacune est un décor accroché à SON chiffre — voir
 * l'en-tête, « UNE CORNE, UN NŒUD ».
 *
 * ★ **Pourquoi cette fonction est exportée, et ce que cela ne change pas.**
 * Deux moments posent des cornes, et il ne peut pas y avoir deux dessins :
 *
 *  · ICI, en cours de démonstration, quand la ligne écrit trois 6 côte à côte
 *    — soit que l'opérateur `mz` les ait constatés, soit que l'assemblage l'ait
 *    fait (`recherche/scenario.js › couronnerLesTriptyques`). Le contrôle
 *    croisé ci-dessus a alors joué, sur la ligne telle qu'elle est ;
 *  · au VERDICT (`reveal.js`), pour les triptyques que la démonstration n'a pas
 *    pu couronner — ceux dont les trois 6 ne se réunissent qu'au moment où le
 *    verdict rassemble. « "e-h" n'aura ses cornes qu'à l'étape verdict puisque
 *    les 6 ne sont pas réunis avant » (l'auteur).
 *
 * Ce qui voyage est le TRACÉ, le calage sur le glyphe, le débord annoncé et
 * l'accrochage — c'est-à-dire tout ce qu'un test de géométrie mesure
 * (`tests/cornes.test.js`). Ce qui NE voyage pas est le contrôle croisé : il
 * appartient à `plan()`, parce qu'il porte sur la ligne du moment. Le verdict a
 * le sien, et il n'est pas le même — il vérifie ce qu'il RASSEMBLE.
 *
 * @param {object} ctx
 * @param {string[]} cornus — les trois 6, dans l'ordre de la ligne
 * @param {{echelle?:number}} [spec] — l'échelle de DÉPART du nœud : 0 quand la
 *   corne doit jaillir, 1 quand elle doit seulement paraître puis suivre
 *   l'agrandissement du chiffre.
 * @returns {string[]} les deux nœuds créés, gauche puis droite
 */
export function poserLesCornes(ctx, cornus, spec = {}) {
  const m = mesuresCorne(ctx);
  const largeur = largeurDeCorne(m);
  const echelle = spec.echelle === undefined ? 0 : spec.echelle;
  const poses = [];
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
      // `cote` : de quel côté la corne pousse (−1 à gauche, +1 à droite). Le
      // tracé en dépend, et l'effritement doit pouvoir le redessiner sans
      // deviner — voir `effriterLesCornes`.
      data: { d: corneD(s, 0, m), suit: porteur, debord: m.debord, cote: s },
      base: { opacity: 0, scale: echelle, fill: ctx.palette.rubric },
    }, { where: ctx.where });
    ctx.place(id, { x: ou.x, y: ou.y, w: largeur });
    poses.push(id);
  }
  return poses;
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
  const p = pointeur(s, cx, m);
  const { externe, interne } = bordsDeLaCorne(m);
  return [
    `M ${p(externe[0])}`,
    // bord externe : du talon à la pointe, bombé vers le dehors
    `C ${p(externe[1])} ${p(externe[2])} ${p(externe[3])}`,
    // bord interne : de la pointe au pied, bombé davantage — c'est lui qui affine
    `C ${p(interne[1])} ${p(interne[2])} ${p(interne[3])}`,
    'Z',
  ].join(' ');
}

/**
 * Les deux bords de la corne, en points de contrôle — source unique du tracé
 * intact ET du tracé effrité.
 *
 * Le repère est celui de `corneD` : `+x` vers l'EXTÉRIEUR, `y` compté depuis la
 * ligne de crâne. Trois points suffisent à décrire la corne — les deux pieds et
 * la pointe —, et chaque bord est une cubique dont les poignées partent de la
 * corde et sont poussées vers le dehors (le `galbe`).
 */
function bordsDeLaCorne(m) {
  // Les deux pieds reposent sur le sommet de la barre du 6 couronné : celui du
  // dedans à `−e/2`, celui du dehors à `+e/2`, et `e = 2·(débord de la barre)`.
  const pied = [-m.e / 2, 0];        // vers l'intérieur du groupe
  const talon = [m.e / 2, 0];        // vers l'extérieur
  const pointe = [m.ouv, -m.h];
  const sur = (a, b, t, galbe) => [a[0] + (b[0] - a[0]) * t + galbe, a[1] + (b[1] - a[1]) * t];
  return {
    externe: [talon,
      sur(talon, pointe, 1 / 3, m.galbeExterne), sur(talon, pointe, 2 / 3, m.galbeExterne), pointe],
    interne: [pointe,
      sur(pointe, pied, 1 / 3, m.galbeInterne), sur(pointe, pied, 2 / 3, m.galbeInterne), pied],
  };
}

/** Un point du repère local, écrit dans celui de la scène. */
function pointeur(s, cx, m) {
  return (u) => `${r(cx + s * u[0])} ${r(m.y0 + u[1])}`;
}

/**
 * De Casteljau : la cubique coupée en `t`, et le point de coupe.
 *
 * C'est la seule façon de tronquer une cubique SANS la déformer — on ne peut
 * pas simplement rapprocher le dernier point de contrôle, la courbe ne
 * passerait plus par où elle passait. La subdivision, elle, rend deux cubiques
 * dont la réunion est exactement l'originale.
 */
function casteljau(P, t) {
  const lerp = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = lerp(P[0], P[1]);
  const b = lerp(P[1], P[2]);
  const c = lerp(P[2], P[3]);
  const d = lerp(a, b);
  const e = lerp(b, c);
  const f = lerp(d, e);
  return { avant: [P[0], a, d, f], apres: [f, e, c, P[3]], point: f };
}

/**
 * ★ LE FRONT D'ÉROSION — la dentelure, écrite à la main et JAMAIS tirée au sort.
 *
 * Une corne qui s'effrite ne perd pas sa pointe à l'horizontale : elle
 * s'ébrèche. Ces cinq valeurs disent de combien le front monte ou descend, en
 * fractions de la hauteur qui reste, aux cinq sixièmes de la largeur. Elles sont
 * écrites, comme l'enveloppe de l'éclair (`reveal.js`) : un `Math.random()`
 * aurait donné une brèche différente à chaque lecture, donc un scrubbing qui ne
 * retomberait jamais sur la même image (CONTRACTS §4.4).
 */
const DENTS = Object.freeze([-0.34, 0.27, -0.16, 0.31, -0.23]);

/** De combien le front s'écarte de l'horizontale, en fraction de ce qui reste. */
const MORSURE = 0.34;

/**
 * ★ LA CORNE ÉBRÉCHÉE — le même tracé, rongé depuis la pointe.
 *
 * `u` va de 0 (intacte) à 1 (plus rien). Ce qui reste est la corne dont on a
 * ôté le haut : le bord externe est tronqué à la hauteur `1 − u`, le bord
 * interne repris à la même hauteur, et les deux sont réunis par un front
 * DENTELÉ. À mesure que `u` monte, le front descend et la corne se mange
 * elle-même jusqu'au pied.
 *
 * ★ **Pourquoi le tracé et pas l'opacité.** Une opacité qui tombe fait
 * disparaître une corne ENTIÈRE, de plus en plus pâle : ce n'est pas un
 * effritement, c'est un fondu. Et elle coûte cher ailleurs — le nœud porte déjà
 * l'échelle du verdict, et une opacité animée sur un élément qui porte une
 * transformation est très exactement la recette du défaut de composition
 * Firefox (`tests/compositeur.test.js`). Le `filter` aurait le même défaut, en
 * pire : il se retrame à chaque palier d'échelle, ce qui est la cause mesurée
 * des saccades du feu (`reveal.js`). Le tracé, lui, ne coûte qu'un attribut, et
 * il est une fonction PURE du temps de la timeline — donc rejouable en arrière.
 *
 * @param {number} s   −1 (corne de gauche) ou +1 (celle de droite)
 * @param {number} cx  le centre du 6 couronné, dans le repère du nœud
 * @param {object} m   les mesures de `mesuresCorne`
 * @param {number} u   l'avancement de l'effritement, de 0 à 1
 */
function corneEffritee(s, cx, m, u) {
  if (!(u > 0)) return corneD(s, cx, m);
  if (u >= 1) return '';                      // plus rien : un tracé vide ne peint rien
  const reste = 1 - u;
  const p = pointeur(s, cx, m);
  const { externe, interne } = bordsDeLaCorne(m);
  const bas = casteljau(externe, reste).avant;      // du talon jusqu'au front
  const haut = casteljau(interne, 1 - reste).apres; // du front jusqu'au pied

  // La coupe à une hauteur donnée : le segment qui joint le bord externe au bord
  // interne. `f` va de 0 (dehors) à 1 (dedans).
  const surLaCoupe = (f, h) => {
    const a = casteljau(externe, h).point;
    const b = casteljau(interne, 1 - h).point;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const crete = DENTS.map((dent, k) => {
    const h = Math.max(0, Math.min(1, reste * (1 + MORSURE * dent)));
    return `L ${p(surLaCoupe((k + 1) / (DENTS.length + 1), h))}`;
  });

  return [
    `M ${p(bas[0])}`,
    `C ${p(bas[1])} ${p(bas[2])} ${p(bas[3])}`,
    ...crete,
    `L ${p(haut[0])}`,
    `C ${p(haut[1])} ${p(haut[2])} ${p(haut[3])}`,
    'Z',
  ].join(' ');
}

/**
 * ★ LES CORNES S'EFFRITENT — le geste que le verdict demande pour les
 * triptyques qu'il relègue au rang du bas.
 *
 * « Au verdict, au moment de l'agencement, fais s'effriter/disparaître
 * progressivement les cornes des triptyques qui vont en 2ⁿᵈ ligne. » (l'auteur)
 *
 * Elles s'en allaient d'un fondu, toutes ensemble : une paire de cornes pâlit
 * et n'est plus là. Elles se rongent maintenant depuis la pointe, chacune sur
 * son horloge, pendant que le rang du bas se met en place — voir
 * `corneEffritee` pour le tracé, et pour ce que l'opacité aurait coûté.
 *
 * ★ Le décalage entre les deux cornes d'un même 666 n'est pas un ornement : deux
 * cornes qui s'effritent au même instant refont un geste unique, donc un
 * effacement. Décalées, on lit deux objets qui se défont — ce qui est ce qui se
 * passe.
 *
 * @param {object} ctx
 * @param {string[]} ids — les nœuds de cornes à effriter, dans l'ordre de lecture
 * @param {{at:number, dur:number}} quand
 */
export function effriterLesCornes(ctx, ids, quand) {
  const m = mesuresCorne(ctx);
  const at = quand.at ?? 0;
  const dur = Math.max(1, quand.dur ?? ctx.dur);
  // Le décalage mange au plus un cinquième du geste : au-delà, la dernière
  // corne s'effriterait après que la scène s'est immobilisée.
  const cadence = ids.length > 1 ? (dur * 0.2) / (ids.length - 1) : 0;
  const propre = Math.max(1, dur - cadence * (ids.length - 1));
  ids.forEach((id, k) => {
    const n = ctx.scene.get(id);
    const cote = n && n.data && n.data.cote === -1 ? -1 : 1;
    ctx.discrete({
      id,
      channel: 'd',
      at: at + k * cadence,
      dur: propre,
      render: (u) => corneEffritee(cote, 0, m, u),
    });
  });
}

function r(v) {
  return Math.round(v * 1000) / 1000;
}
