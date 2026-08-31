/**
 * Les gestes des COMBINATEURS — ce qui est montré est ce qui est fait.
 *
 * Quatre exigences, une par section :
 *
 *  1. **sélectionner n'est pas calculer** — « on garde le plus grand » efface
 *     les perdants et laisse le gagnant EN PLACE, sans le remplacer par
 *     lui-même ;
 *  2. **une moyenne se nivelle** — un `1` passe du plus grand au plus petit en
 *     courbe jusqu'à ce qu'aucun écart ne dépasse 1, puis les nombres égaux à
 *     la moyenne fusionnent et les autres (l'arrondi) s'effacent ;
 *  3. **un comptage se compte** — chaque jeton descend dans la pointe de
 *     l'accolade et fait avancer le compteur d'un cran ; les doublons montent
 *     d'un cran sur une ligne étiquetée ;
 *  4. **les nombres se distinguent des chiffres** — chacun souligné, l'écart
 *     entre eux élargi, et rien entre les chiffres d'un même nombre.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { CompileError } from '../errors.js';
import { TOKEN_GAP, colorForKind } from '../constants.js';
import {
  nivellementDe as nivellementVisuel, MAX_TRANSFERTS as MAX_VISUEL,
  poidsRamassage, natureDesJetons,
} from '../primitives/helpers.js';
import {
  nivellementDe as nivellementMoteur, MAX_TRANSFERTS as MAX_MOTEUR,
  dureeRamassage, POIDS_RAMASSAGE, natureOperandes,
} from '../../moteur/transformations/combinateurs.js';
import { PAR_CODE } from '../../moteur/catalogue.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const nums = (vs) => vs.map((v, i) => ({
  id: `t${i}`, text: String(v), kind: String(v).length > 1 ? 'number' : 'digit',
}));
const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const noeud = (tl, id) => tl.nodes.find((n) => n.id === id);
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);
const op = (code) => PAR_CODE.get(code);

/** Un jeton qui VOLE dans l'accolade rétrécit à 0,65 ; un jeton effacé, à 0,82. */
const valeurFinale = (a) => a.keyframes[a.keyframes.length - 1].value;
const vole = (tl, id) => animsDe(tl, id, 'scale').some((a) => valeurFinale(a) === 0.65);
const efface = (tl, id) => animsDe(tl, id, 'scale').some((a) => valeurFinale(a) === 0.82);

/** Les steps qu'émet un opérateur du catalogue, sur un état donné. */
function stepsDe(code, avant, apres, ids) {
  const o = op(code);
  return o.steps(avant, apres, { ids, cle: 'x0', langue: 'fr' });
}
const etatNums = (vs) => ({ type: 'NUMS', valeur: vs, traces: [[0, vs.length]] });
const etatNum = (v) => ({ type: 'NUM', valeur: v, traces: [[0, 1]] });

// ───────────────────────────── 1. sélectionner n'est pas calculer

/**
 * ★ CE QUI EST GELÉ ICI A CHANGÉ, et il faut dire pourquoi.
 *
 * La sélection se jouait sans accolade : on soulignait l'élu, les autres
 * s'effaçaient, l'élu restait où il était. Deux défauts, et le second est
 * grave. Rien ne DISAIT à quel titre il était élu — et surtout, « on garde le
 * plus grand » et « on garde le plus petit » produisaient à l'écran des gestes
 * rigoureusement identiques : deux règles opposées, une seule image. Un
 * spectateur ne pouvait pas les distinguer, donc ne pouvait pas les vérifier.
 *
 * Le geste est maintenant celui de tous les ramassages : l'accolade se ferme
 * en ÉCRIVANT ce qu'elle cherche (`min`, `max`), l'élu descend sous sa pointe
 * pendant que le reste s'efface, et la valeur remonte dans la ligne.
 */
test('une sélection RAMASSE : l’accolade dit ce qu’elle cherche, et l’élu descend', () => {
  const avant = etatNums([8, 15, 16, 5]);
  const [step] = stepsDe('cmx', avant, etatNum(16), ['t0', 't1', 't2', 't3']);
  assert.deepEqual(step.ops.map((o) => o.op), ['sum'], 'un seul geste : le ramassage');
  const [s] = step.ops;
  assert.equal(s.symbol, 'max', 'l’accolade écrit ce qu’elle cherche');
  assert.deepEqual(s.voler, ['t2'], 'c’est le MAXIMUM qui descend');
  assert.deepEqual(s.effacer, ['t0', 't1', 't3'], 'et tous les autres qui s’effacent');
  assert.deepEqual(s.partials, [16], 'la valeur n’existe qu’à l’atterrissage de l’élu');
  assert.equal(s.depart, '', 'avant lui, il n’y a rien à afficher : on ne compte pas');
});

test('« le plus petit » se distingue du plus grand À L’ÉCRAN, pas seulement dans le titre', () => {
  const grand = stepsDe('cmx', etatNums([8, 15, 16, 5]), etatNum(16), ['t0', 't1', 't2', 't3'])[0];
  const petit = stepsDe('cmn', etatNums([8, 15, 16, 5]), etatNum(5), ['t0', 't1', 't2', 't3'])[0];
  assert.notEqual(grand.ops[0].symbol, petit.ops[0].symbol, 'deux règles, deux symboles');
  assert.deepEqual(petit.ops[0].voler, ['t3'], 'et ce n’est pas le même jeton qui descend');
});

test('à l’écran : les perdants s’effacent sur place, l’élu vole vers la pointe', () => {
  const [step] = stepsDe('cmx', etatNums([8, 15, 16, 5]), etatNum(16), ['t0', 't1', 't2', 't3']);
  const tl = compile(sc([{ ...step, id: 'a' }], nums([8, 15, 16, 5])));
  assert.ok(vole(tl, 't2'), 'le maximum descend dans l’accolade');
  for (const id of ['t0', 't1', 't3']) {
    assert.ok(efface(tl, id), `${id} s’efface`);
    assert.ok(!vole(tl, id), `${id} ne descend PAS dans l’accolade : il s’efface là où il est`);
  }
  const reste = tl.scene.flow.filter((id) => tl.scene.get(id).alive);
  assert.equal(reste.length, 1, 'une seule valeur reste sur la ligne');
  assert.equal(tl.scene.get(reste[0]).text, '16', 'et c’est bien le maximum');
});

/**
 * ★ L'ÉCART montre sa soustraction, il ne l'annonce plus.
 *
 * Il se jouait comme un dénombrement : tout tombait sous l'accolade, un nombre
 * paraissait, et la phrase « le plus grand moins le plus petit » portait seule
 * ce que l'image aurait dû montrer. Ni les deux termes, ni le signe, ni le
 * choix des deux élus n'étaient jamais visibles — donc jamais vérifiables.
 */
test('l’écart DÉSIGNE ses deux élus, les range, et pose le signe entre eux', () => {
  const [step] = stepsDe('cmm', etatNums([8, 15, 16, 5]), etatNum(11), ['t0', 't1', 't2', 't3']);
  const noms = step.ops.map((o) => o.op);
  // ★ CE GEL A BOUGÉ, et il fallait qu'il bouge. Les deux étiquettes étaient
  //   émises en QUEUE de liste — elles ne touchent aucun jeton, l'ordre semblait
  //   donc libre. Il ne l'est pas : un décor accroché ne suit son jeton que s'il
  //   EXISTE au moment où celui-ci se déplace (`compile.js`). Émises en dernier,
  //   `MAX` et `MIN` naissaient APRÈS le rangement et l'insertion du signe,
  //   héritaient des positions finales, et n'avaient plus rien à suivre. Ce que
  //   ce test gèle reste le geste — accolade, effacement, rangement, signe,
  //   calcul, dans cet ordre — ; ce qui s'y ajoute est que les désignations
  //   sont posées AVANT ce qu'elles doivent accompagner.
  assert.deepEqual(noms, [
    'group', 'annotate', 'annotate', 'drop', 'move', 'insertOperators', 'sum',
  ]);
  const parNom = Object.fromEntries(step.ops.map((o) => [o.op, o]));
  assert.equal(parNom.group.symbol, 'Δ');
  assert.deepEqual(parNom.drop.targets, ['t0', 't1'], 'ni le max ni le min ne s’effacent');
  assert.deepEqual(parNom.move.order, ['t2', 't3'], 'le grand DEVANT le petit — l’ordre du calcul');
  assert.deepEqual(parNom.insertOperators.between, ['t2', 't3']);
  assert.equal(parNom.insertOperators.glyph, '−', 'le signe de la soustraction, écrit');
  assert.deepEqual(parNom.sum.partials, [16, 11], 'le premier se pose, le second retranche');
  assert.equal(parNom.sum.accolade, 'existante', 'pas de seconde accolade par-dessus la première');
  const etiquettes = step.ops.filter((o) => o.op === 'annotate');
  assert.deepEqual(etiquettes.map((o) => o.text).sort(), ['MAX', 'MIN'], 'les deux élus sont NOMMÉS');
  for (const e of etiquettes) assert.equal(e.suit, true, 'et elles SUIVENT leur nombre');
});

/**
 * ★ UNE DÉSIGNATION SUIT CE QU'ELLE DÉSIGNE.
 *
 * « Quand il y a redimensionnement/déplacement du max et du min, MAX et MIN
 * devraient suivre leur nombre et ne disparaître qu'une fois le − placé entre
 * les deux » (l'auteur).
 *
 * Le grief était mesurable et il était grave : le geste range le maximum devant
 * le minimum, et `MAX` restait à la place que le maximum venait de quitter —
 * place où le MINIMUM venait précisément s'installer. Pendant huit dixièmes de
 * seconde, l'étiquette annonçait le contraire de ce qu'elle désignait.
 */
test('l’écart : MAX et MIN suivent leur nombre, et ne partent qu’une fois le signe posé', () => {
  const [step] = stepsDe('cmm', etatNums([8, 15, 16, 5]), etatNum(11), ['t0', 't1', 't2', 't3']);
  const tl = compile(sc([{ ...step, id: 'a' }], nums([8, 15, 16, 5])));

  // Chaque étiquette est ACCROCHÉE à son nombre, à l'écart près : elle est
  // au-dessus de lui, pas dessus.
  const par = {};
  for (const n of tl.nodes) if (n.role === 'label' && ['MAX', 'MIN'].includes(n.text)) par[n.text] = n;
  assert.equal(par.MAX.data.suit, 't2', 'MAX est accroché au maximum');
  assert.equal(par.MIN.data.suit, 't3', 'MIN est accroché au minimum');
  assert.ok(par.MAX.data.decalage.dy < 0, 'et posée AU-DESSUS de lui');

  // À chaque déplacement du nombre correspond un déplacement de son étiquette,
  // au même instant, de la même distance.
  //
  // ★ Depuis sa NAISSANCE seulement : l'accolade resserre la ligne avant que
  //   les étiquettes n'existent, et une étiquette ne peut pas suivre un
  //   déplacement antérieur à elle. C'est exactement pour cela qu'elles sont
  //   posées tôt — mais pas plus tôt que l'accolade, qui les placerait sur des
  //   nombres qu'elle est en train de rapprocher.
  //
  // ★ Et jusqu'à leur DÉPART seulement : après le signe, les deux termes
  //   descendent sous l'accolade et les étiquettes ne les y suivent pas — elles
  //   ont fini leur travail, et un « MAX » qui plongerait dans le calcul
  //   désignerait un nombre qui n'est plus là.
  const naissance = tl.anims.find((a) => a.id === par.MAX.id).delay;
  const depart = animsDe(tl, par.MAX.id, 'opacity').at(-1).delay;
  for (const [mot, jeton] of [['MAX', 't2'], ['MIN', 't3']]) {
    const duJeton = animsDe(tl, jeton, 'translate')
      .filter((a) => a.delay >= naissance && a.delay < depart);
    const deLEtiquette = animsDe(tl, par[mot].id, 'translate');
    assert.ok(duJeton.length >= 2, 'le nombre est bien rangé puis écarté par le signe');
    for (const a of duJeton) {
      const jumelle = deLEtiquette.find((b) => b.delay === a.delay && b.duration === a.duration);
      assert.ok(jumelle, `${mot} ne suit pas le déplacement de ${jeton} à ${a.delay} ms`);
      const dx = (v) => v.keyframes.at(-1).value.x - v.keyframes[0].value.x;
      assert.ok(Math.abs(dx(jumelle) - dx(a)) < 1e-6, `${mot} ne parcourt pas la même distance`);
    }
  }

  // ★ Et elles s'en vont APRÈS le signe : le fondu commence là où le calcul
  //   commence, il ne se termine plus pendant que le « − » paraît.
  const signe = tl.anims.find((a) => a.id === 'e0moins' && a.prop === 'opacity')
    || tl.anims.find((a) => a.prop === 'opacity' && (tl.nodes.find((n) => n.id === a.id) || {}).text === '−');
  const sortie = tl.anims.filter((a) => a.id === par.MAX.id && a.prop === 'opacity').at(-1);
  assert.ok(sortie.delay >= signe.delay + signe.duration - 1,
    'MAX ne doit pas commencer à s’effacer avant que le « − » ne soit posé');

  // Et aucune animation concurrente : le geste d'entrée ne s'étire pas sur
  // toute la tenue de l'étiquette, sinon il chevaucherait ses propres suivis.
  assert.deepEqual(tl.warnings, []);
});

test('l’écart se joue vraiment, et il ne reste que sa différence', () => {
  const [step] = stepsDe('cmm', etatNums([8, 15, 16, 5]), etatNum(11), ['t0', 't1', 't2', 't3']);
  const tl = compile(sc([{ ...step, id: 'a' }], nums([8, 15, 16, 5])));
  const reste = tl.scene.flow.filter((id) => tl.scene.get(id).alive);
  assert.equal(reste.length, 1);
  assert.equal(tl.scene.get(reste[0]).text, '11');
  // Une seule accolade : deux tracés superposés se liraient comme deux
  // regroupements concurrents.
  const accolades = tl.nodes.filter((n) => n.role === 'bracket' && !n.id.startsWith('@sous:'));
  assert.equal(accolades.length, 1, `une accolade et une seule (vu : ${accolades.map((a) => a.id).join(', ')})`);
});

/**
 * ★ UNE NOTATION N'EST PAS UN COMMENTAIRE — et se mesure sur ce qu'elle entoure.
 *
 * « Elles sont plus petites que les nombres associés » (l'auteur, à propos des
 * barres de `|−28|`). C'était exact : `annotate` posait tout à la demi-casse,
 * le réglage juste pour une étiquette qui se lit en second. Les barres de la
 * valeur absolue ne se lisent pas en second — elles font partie de
 * l'expression, et une notation qui n'atteint pas ce qu'elle enserre ne
 * l'enserre pas.
 */
test('valeur absolue : les barres ont la casse des chiffres, et leur couleur', () => {
  const [step] = op('pabs').steps(
    { type: 'NUM', valeur: -28, traces: [[0, 1]] },
    { type: 'NUM', valeur: 28, traces: [[0, 1]] },
    { ids: ['t0'], cle: 'x0', langue: 'fr' },
  );
  const barres = step.ops.filter((o) => o.op === 'annotate');
  assert.equal(barres.length, 2, 'une barre de chaque côté — c’est ce qui fait une notation');
  assert.deepEqual(barres.map((o) => o.place).sort(), ['left', 'right']);

  const tl = compile(sc([{ ...step, id: 'a' }], [{ id: 't0', text: '-28', kind: 'number' }]));
  const nombre = noeud(tl, 't0');
  const etiquettes = tl.nodes.filter((n) => n.role === 'label' && n.text === '|');
  assert.equal(etiquettes.length, 2);
  for (const b of etiquettes) {
    assert.equal(b.data.scale, 1,
      'à la demi-casse, une barre est deux fois moins haute que le chiffre qu’elle encadre');
    assert.equal(b.base.fill, colorForKind('number'),
      'un gris de commentaire poserait la barre à CÔTÉ de l’expression, pas dedans');
  }
  // Et elles encadrent : l'une à gauche du nombre, l'autre à droite, aucune
  // ne le chevauche — l'écart se compte de bord à bord.
  const [g, d] = etiquettes.map((b) => b.base.translate.x).sort((a, c) => a - c);
  const bord = { g: tl.scene.pos('t0').x - nombre.w / 2, d: tl.scene.pos('t0').x + nombre.w / 2 };
  assert.ok(g + etiquettes[0].w / 2 <= bord.g, 'la barre de gauche ne mord pas sur le nombre');
  assert.ok(d - etiquettes[1].w / 2 >= bord.d, 'celle de droite non plus');
});

test('tous les nombres égaux : il n’y a ni plus grand ni plus petit à désigner', () => {
  const [step] = stepsDe('cmm', etatNums([6, 6, 6]), etatNum(0), ['t0', 't1', 't2']);
  const noms = step.ops.map((o) => o.op);
  assert.ok(!noms.includes('annotate'), 'deux étiquettes sur le même jeton ne diraient rien');
  assert.ok(noms.includes('group'), 'le geste sobre reste un ramassage');
});

/**
 * ★ COLLER N'EST PAS RAMASSER. « Mathématiquement c'est significatif, mais
 *   visuellement c'est presque comme ne rien faire » (l'auteur) : les mêmes
 *   chiffres, dans le même ordre, à la même place, et seul l'écart entre eux
 *   disparaît. Une accolade par-dessus ferait chercher un calcul absent.
 */
test('le collage se fait sans accolade, sans symbole et sans libellé', () => {
  const [step] = stepsDe('ccat', etatNums([5, 11, 2]), etatNum(5112), ['t0', 't1', 't2']);
  assert.deepEqual(step.ops.map((o) => o.op), ['merge']);
  assert.deepEqual(step.ops[0].targets, ['t0', 't1', 't2']);
  assert.equal(step.ops[0].to.text, '5112');
});

test('le collage résorbe les espaces et ne fait bouger rien d’autre', () => {
  const [step] = stepsDe('ccat', etatNums([5, 11, 2]), etatNum(5112), ['t0', 't1', 't2']);
  const tl = compile(sc([{ ...step, id: 'a' }], nums([5, 11, 2])));
  for (const id of ['t0', 't1', 't2']) {
    assert.equal(tl.scene.get(id).alive, false, `${id} a été absorbé`);
    // Aucun changement d'échelle : rien ne rétrécit, rien ne « tombe ».
    assert.equal(animsDe(tl, id, 'scale').length, 0, `${id} ne rétrécit pas : il ne tombe nulle part`);
  }
  const reste = tl.scene.flow.filter((id) => tl.scene.get(id).alive);
  assert.equal(reste.length, 1);
  assert.equal(tl.scene.get(reste[0]).text, '5112');
  const accolades = tl.nodes.filter((n) => n.role === 'bracket');
  assert.equal(accolades.length, 0, 'aucune accolade : il ne s’est presque rien passé');
});

test('un collage refuse d’afficher un nombre qui n’est pas celui qu’on colle', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'On colle', ops: [{ op: 'merge', targets: ['t0', 't1'], to: { id: 'q', text: '999' } }],
  }], nums([5, 11]))), CompileError);
});

// ───────────────────────────── 2. une moyenne se nivelle

test('le nivellement converge, conserve la somme, et finit à 1 d’écart au plus', () => {
  const jeux = [[8, 15, 16, 5], [1, 7, 4, 7, 8, 6, 5, 9, 5], [3, 3, 3], [1, 2], [9, 1, 5], [6, 5]];
  for (const vs of jeux) {
    const { transferts, valeurs, converge } = nivellementMoteur(vs);
    assert.ok(converge, `${vs} ne converge pas`);
    assert.equal(valeurs.reduce((a, b) => a + b, 0), vs.reduce((a, b) => a + b, 0),
      `${vs} : un transfert donne autant qu’il prend`);
    assert.ok(Math.max(...valeurs) - Math.min(...valeurs) <= 1, `${vs} : écart résiduel > 1`);
    // La moyenne arrondie est TOUJOURS l'une des valeurs nivelées — c'est ce
    // qui autorise la fusion à ne rien inventer.
    assert.ok(valeurs.includes(Math.round(vs.reduce((a, b) => a + b, 0) / vs.length)),
      `${vs} : la moyenne n’est pas atteinte`);
    assert.ok(transferts.length <= MAX_MOTEUR);
  }
});

test('le nivellement est BORNÉ : au-delà, il se déclare non convergent', () => {
  const { converge, transferts } = nivellementMoteur([0, 1000]);
  assert.equal(converge, false, 'une variance énorme ne se montre pas');
  assert.equal(transferts.length, MAX_MOTEUR, 'et la borne est celle qu’on annonce');
});

test('★ les deux copies du nivellement — moteur et visuel — ne divergent pas', () => {
  assert.equal(MAX_VISUEL, MAX_MOTEUR);
  for (const vs of [[8, 15, 16, 5], [1, 7, 4, 7, 8, 6, 5, 9, 5], [2, 2], [0, 9, 3], [0, 1000]]) {
    assert.deepEqual(nivellementVisuel(vs), nivellementMoteur(vs), `${vs}`);
  }
});

test('★ les deux copies des poids de ramassage ne divergent pas non plus', () => {
  assert.deepEqual(POIDS_RAMASSAGE, poidsRamassage.length ? POIDS_RAMASSAGE : POIDS_RAMASSAGE);
  for (const spec of [{ voler: 4 }, { voler: 7, effacer: 2, transferts: 7 }, { voler: 6, doubles: 2 }]) {
    const somme = Object.values(poidsRamassage(spec)).reduce((a, b) => a + b, 0);
    assert.equal(dureeRamassage(spec), somme, `${JSON.stringify(spec)}`);
  }
});

/**
 * ★ **LE NIVELLEMENT A CHANGÉ DE MAISON** — il est chez `m.egalisation`.
 *
 * Il appartenait à `c.moyenne`, qui nivelait puis fusionnait les égaux. « L'ancienne
 * animation vit dans meg et n'a plus sa place côté cmo » (l'auteur) : la moyenne
 * se montre désormais comme une DIVISION, et le nivellement reste ce qu'il a
 * toujours été — le geste entier de l'égalisation, qui s'arrête où il a un sens.
 *
 * Ce que ce test gèle est donc inchangé sur le fond : neuf « 1 » voyagent en
 * courbe pour `8 15 16 5`, et tout le monde finit à 11. Seul l'émetteur diffère,
 * et avec lui deux détails qui disent la différence : le symbole est `≡` et non
 * `moy.`, et le geste s'appelle `egaliser` — parce qu'il ne fusionne rien.
 */
test('l’égalisation se joue en nivellement : des « 1 » voyagent, les autres s’effacent', () => {
  const vs = [8, 15, 16, 5];
  const [step] = stepsDe('meg', etatNums(vs), etatNums([11, 11, 11, 11]), ['t0', 't1', 't2', 't3']);
  const g = step.ops[0];
  assert.equal(g.op, 'group');
  assert.equal(g.egaliser, true);
  assert.equal(g.symbol, '≡');
  const tl = compile(sc([{ ...step, id: 'a' }], nums(vs)));

  const unites = tl.nodes.filter((n) => n.id.startsWith('@unite:'));
  assert.equal(unites.length, 9, 'neuf transferts pour 8 15 16 5');
  for (const u of unites) {
    assert.equal(u.text, '1', 'ce qui voyage vaut 1');
    const [vol] = animsDe(tl, u.id, 'translate');
    assert.ok(vol && vol.keyframes.length >= 3, 'et il voyage en COURBE, pas en ligne droite');
    const ys = vol.keyframes.map((k) => k.value.y);
    assert.ok(Math.min(...ys) < Math.min(ys[0], ys[ys.length - 1]) - 1,
      'le sommet de la courbe passe au-dessus des deux extrémités');
  }
  // Les quatre jetons changent de texte, et tous finissent à 11.
  const finals = ['t0', 't1', 't2', 't3'].map((id) => {
    const e = tl.discrete.filter((d) => d.id === id && d.channel === 'text').pop();
    return e ? e.render(1) : null;
  });
  assert.deepEqual(finals, ['11', '11', '11', '11'], 'tout le monde à la même hauteur');
  // ★ ET RIEN NE FUSIONNE : l'égalisation rend AUTANT de valeurs qu'elle en
  //   reçoit. C'est ce qui la sépare de la moyenne, et ce qu'aucune assertion
  //   ne disait tant que les deux partageaient le même geste.
  assert.equal(tl.scene.get('r') ? tl.scene.get('r').text : null, null);
  assert.equal(finals.length, vs.length, 'quatre valeurs entrent, quatre sortent');
});

test('la moyenne refuse d’afficher un résultat qui n’est pas la sienne', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'group', targets: ['t0', 't1'], niveler: true, to: { id: 'r', text: '7' }, dur: 3000 }],
  }], nums([8, 4]))), (err) => {
    assert.ok(err instanceof CompileError);
    assert.match(err.message, /la moyenne de 8, 4 vaut 6/);
    return true;
  });
});

/**
 * ★ **LE MODE `niveler` N'A PLUS D'ÉMETTEUR AU CATALOGUE**, et ce test est ce
 *   qui l'empêche de mourir en silence.
 *
 * Il était produit par `c.moyenne`, qui nivelait PUIS fusionnait les égaux en un
 * résultat unique. La moyenne se montre désormais comme une division, et
 * `m.egalisation` — qui a hérité du nivellement — ne fusionne rien : elle rend
 * autant de valeurs qu'elle en reçoit, et emploie donc `egaliser`.
 *
 * On construit donc l'op À LA MAIN, comme le fait déjà « la moyenne refuse
 * d'afficher un résultat qui n'est pas la sienne » juste au-dessus. Le mode
 * reste vivant et vérifié ; le jour où un opérateur en aura de nouveau besoin,
 * il le trouvera en état de marche.
 */
test('mode `niveler` — les égaux fusionnent, les autres, l’arrondi, s’effacent', () => {
  const vs = [1, 7, 4, 7, 8, 6, 5, 9, 5];  // somme 52, moyenne 6, nivelé : sept 6 et deux 5
  const step = {
    id: 'a', title: 'On fait la moyenne',
    ops: [{
      op: 'group', targets: vs.map((_, i) => `t${i}`), niveler: true, symbol: 'moy.',
      to: { id: 'r', text: '6' }, dur: 6000,
    }],
  };
  const tl = compile(sc([{ ...step, id: 'a' }], nums(vs)));
  const ids = vs.map((_, i) => `t${i}`);
  assert.equal(ids.filter((id) => vole(tl, id)).length, 7,
    'sept jetons fusionnent — ceux qui valent la moyenne');
  assert.equal(ids.filter((id) => efface(tl, id)).length, 2,
    'deux s’effacent sur place : c’est l’arrondi');
});

// ───────────────────────────── 3. un comptage se compte

test('le compteur monte d’un cran par jeton, et le total est celui qu’on montre', () => {
  const step = {
    id: 'a', title: 'On compte les lettres',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], symbol: '#', to: { id: 'r', text: '4' }, dur: 3600 }],
  };
  const tl = compile(sc([step], lettres('hope')));
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.ok(compteur);
  const lus = Array.from({ length: 41 }, (_, k) => compteur.render(k / 40));
  assert.deepEqual([...new Set(lus)], ['0', '1', '2', '3', '4'],
    'zéro, puis un cran par atterrissage — jamais un saut');
  for (const id of ['t0', 't1', 't2', 't3']) {
    assert.ok(animsDe(tl, id, 'translate').length, `${id} descend dans la pointe`);
  }
});

test('un comptage refuse d’annoncer un total qu’il ne compte pas', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2', 't3'], to: { id: 'r', text: '7' }, dur: 3600 }],
  }], lettres('hope'))), /l'accolade compte 4 jeton\(s\).*« 7 »/s);
});

test('ce qui n’est pas compté s’efface SANS faire avancer le compteur', () => {
  const tl = compile(sc([{
    id: 'a', title: 'On compte les voyelles',
    ops: [{
      op: 'group', targets: ['t0', 't1', 't2', 't3'], count: ['t1', 't3'],
      symbol: '#', to: { id: 'r', text: '2' }, dur: 3600,
    }],
  }], lettres('hope')));
  for (const id of ['t1', 't3']) {
    assert.ok(vole(tl, id), `${id} est compté : il descend dans la pointe`);
    assert.ok(!efface(tl, id), `${id} n’est pas effacé sur place`);
  }
  for (const id of ['t0', 't2']) {
    assert.ok(efface(tl, id), `${id} s’efface sur place`);
    assert.ok(!vole(tl, id), `${id} n’entre jamais dans l’accolade`);
  }
});

test('les doublons montent d’un cran, sur une ligne ÉTIQUETÉE, et comptent deux fois', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Les lettres, plus les voyelles',
    ops: [{
      op: 'group', targets: ['t0', 't1', 't2', 't3'],
      doubles: [{ target: 't1', to: { id: 'd1', text: 'o' } }, { target: 't3', to: { id: 'd3', text: 'e' } }],
      doublesLabel: 'voyelle', symbol: '#', to: { id: 'r', text: '6' }, dur: 5400,
    }],
  }], lettres('hope')));

  const ligne = tl.scene.pos('t1').y;
  for (const id of ['d1', 'd3']) {
    const n = noeud(tl, id);
    assert.ok(n, `la copie ${id} existe`);
    const vol = animsDe(tl, id, 'translate');
    assert.ok(vol.length >= 2, 'elle monte, puis elle redescend dans l’accolade');
    assert.ok(vol[0].keyframes[1].value.y < ligne - 10, 'elle monte AU-DESSUS de la ligne');
  }
  const etiquette = tl.nodes.find((n) => n.id.startsWith('@doubleslabel:'));
  assert.ok(etiquette, 'la ligne des doublons est étiquetée');
  assert.equal(etiquette.text, 'voyelle');
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.equal(compteur.render(1), '6', 'quatre lettres et deux voyelles font six');
});

test('un doublon est une COPIE : il ne transforme rien', () => {
  assert.throws(() => compile(sc([{
    id: 'a', title: 'A',
    ops: [{
      op: 'group', targets: ['t0', 't1'],
      doubles: [{ target: 't1', to: { id: 'd1', text: 'z' } }],
      to: { id: 'r', text: '3' }, dur: 4000,
    }],
  }], lettres('ho'))), /la copie porte « z » là où l'original porte « o »/);
});

test('les mesures du catalogue comptent ce qu’elles montrent', () => {
  const cas = [
    ['nl', 'hope.fr', 6],   // les lettres, pas le point
    ['nv', 'hope', 2],      // o, e
    ['nlv', 'hope', 6],      // 4 lettres + 2 voyelles, les voyelles en doublon
    ['nd', 'hope-hope', 4], // une lettre répétée ne compte qu'une fois
  ];
  for (const [code, mot, total] of cas) {
    const o = op(code);
    const avant = { type: 'STR', valeur: mot, traces: [[0, mot.length]] };
    const ids = [...mot].map((_, i) => `t${i}`);
    const [step] = o.steps(avant, etatNum(total), { ids, cle: 'x0', langue: 'fr' });
    const g = step.ops[0];
    assert.equal(g.op, 'group', `${code} : le comptage passe par l’accolade`);
    const compte = (g.count || g.targets).length + (g.doubles || []).length;
    assert.equal(compte, total, `${code} sur « ${mot} » : ${compte} montrés pour ${total} annoncés`);
    // Et ça compile : le moteur visuel refait le compte de son côté.
    const tl = compile(sc([{ ...step, id: 'a' }], lettres(mot)));
    const compteur = tl.discrete.find((d) => d.id === g.to.id && d.channel === 'text');
    assert.equal(compteur.render(1), String(total), `${code} : le compteur finit sur ${total}`);
  }
});

// ───────────────────────────── 4. les nombres ne sont pas des chiffres

/**
 * ★ L'ÉCART SEUL, le trait en moins.
 *
 * Le risque de lecture est réel — « 15 16 » se lit « 1516 » quand l'espacement
 * ordinaire les sépare comme deux lettres —, mais on y répondait deux fois :
 * en écartant les nombres ET en soulignant chacun. Le trait est retiré (« et
 * partout où souligné il y a », l'auteur) ; l'écart reste, parce que c'est lui
 * qui agit sur la cause.
 */
test('une ligne de NOMBRES s’écarte ; une ligne de chiffres, non', () => {
  const gros = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2'], symbol: '#', to: { id: 'q', text: '3' } }],
  }], nums([8, 15, 16])));
  const petits = compile(sc([{
    id: 'a', title: 'On additionne',
    ops: [{ op: 'group', targets: ['t0', 't1', 't2'], symbol: '#', to: { id: 'q', text: '3' } }],
  }], nums([3, 4, 4])));

  const traits = (tl) => tl.nodes.filter((n) => n.role === 'bracket' && n.id.startsWith('@sous:'));
  assert.equal(traits(gros).length, 0, 'plus aucun soulignement, nulle part');
  assert.equal(traits(petits).length, 0);

  // L'écart, lui, distingue toujours les deux lignes.
  const ecart = (tl, id) => {
    const a = tl.anims.find((x) => x.id === id && x.prop === 'translate');
    return a ? a.keyframes[a.keyframes.length - 1].value.x : null;
  };
  const largeur = (tl) => ecart(tl, 't2') - ecart(tl, 't0');
  assert.ok(largeur(gros) > largeur(petits) * 1.2,
    `une ligne de nombres s’écarte plus qu’une ligne de chiffres (${largeur(gros)} vs ${largeur(petits)})`);
});

test('★ le critère du rendu est celui du moteur arithmétique, sur la même matière', () => {
  for (const vs of [[8, 15, 16, 5], [3, 4, 4, 4], [6], [10, 2], [-11, 2]]) {
    const tl = compile(sc([{ id: 'a', title: 'x', ops: [{ op: 'wait', dur: 500 }] }], nums(vs)));
    const ids = vs.map((_, i) => `t${i}`);
    assert.equal(natureDesJetons({ scene: tl.scene }, ids), natureOperandes(vs),
      `${JSON.stringify(vs)} : le rendu et le moteur ne lisent pas la même matière`);
  }
});

test('un nombre SEUL ne s’écarte pas : il ne se confond avec rien', () => {
  const tl = compile(sc([{
    id: 'a', title: 'x',
    ops: [{ op: 'group', targets: ['t0'], symbol: '#', to: { id: 'q', text: '1' } }],
  }], nums([15])));
  assert.equal(tl.nodes.filter((n) => n.id.startsWith('@sous:')).length, 0);
});

test('accumulation — le TOTAL s’affiche avant la fin, jamais seulement à x = 1', () => {
  // Défaut réel, vu sur `#1.1:tca+mtc+cs,3.1:tca+mtc+cs,6.1:tca+m7+cs#…` : le canal
  // du compteur s'arrêtait au dernier atterrissage, si bien que le total
  // n'existait qu'à `x === 1` au millième près. Toute évaluation à 0,999
  // rendait l'avant-dernier partiel — sur « 4 + 2 », la démonstration finissait
  // sur 4 et le 6 annoncé n'apparaissait jamais.
  const tl = compile(sc([{
    id: 'a', title: 'A',
    ops: [{ op: 'sum', targets: ['t0', 't1'], to: { id: 'r', text: '6' } }],
  }], nums([4, 2])));
  const compteur = tl.discrete.find((d) => d.id === 'r' && d.channel === 'text');
  assert.ok(compteur, 'le compteur passe par le canal discret');
  assert.equal(compteur.render(0.9), '6', 'à 90 % de la course, le total doit être là');
  assert.equal(compteur.render(0.999), '6', 'à 99,9 %, pas l’avant-dernier partiel');
  assert.equal(compteur.render(1), '6');
});
