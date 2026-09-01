/**
 * ★ LE CALAGE DES CORNES — et pourquoi il tient dans un test plutôt que dans un
 * réglage.
 *
 * L'écartement des cornes du 666 a longtemps été une constante trouvée à l'œil
 * (`ecart: 0.68` × la demi-largeur du groupe). Une constante trouvée à l'œil se
 * retrouve à l'œil : au premier changement d'espacement, de chasse ou d'humeur,
 * quelqu'un la rerègle, et personne ne peut plus dire ce qu'elle devrait valoir.
 *
 * L'auteur a demandé autre chose — une COÏNCIDENCE avec le dessin du chiffre :
 * « que le côté droit de la corne droite soit dans le prolongement du côté droit
 * de la barre du 6 de droite, et que la pointe droite de la corne de gauche
 * arrive sur la pointe en haut à droite de la barre du 6 de gauche ». Ce fichier
 * la MESURE sur le tracé compilé, contre la géométrie relevée dans la police
 * (`SIX_BARRE`, dérivée par `src/gfx/jetbrains-six.py`). Tant qu'il est vert, la
 * corne pousse du chiffre ; s'il rougit, c'est qu'on est retourné à l'œil.
 *
 * Il vérifie aussi les deux choses qui rendaient le réglage fragile :
 *
 *  · que le calage TIENT à la taille du verdict (×N par un `scale`), et donc à
 *    toutes les tailles — mesuré, pas supposé ;
 *  · que les trois 6 passent en rubrique PENDANT que les cornes poussent, sans
 *    qu'aucune autre animation ne se dispute le canal `fill`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { SIX_BARRE } from '../assets.js';
import { FONT_SIZE, CAP_RATIO, PALETTE } from '../constants.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const chiffres = (suite) => [...suite].map((c, i) => ({ id: `d${i}`, text: c, kind: 'digit' }));
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);

/** L'air voulu entre le crâne des 6 et la base des cornes (`CORNE.jeu`). */
const JEU = 0.01;

/** Tolérance : le tracé est arrondi au millième d'unité viewBox par `horns.js`. */
const EPSILON = 2e-3;

/**
 * Le tracé d'UNE corne, en liste de points.
 *
 * Le `d` est écrit par `corneD` : `M talon C c1 c2 pointe C c3 c4 pied Z`. On lit
 * donc des couples, sans avoir à interpréter les commandes — leur nombre et leur
 * ordre sont fixes.
 */
function corne(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const pts = [];
  for (let i = 0; i < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  return { talon: pts[0], poignee: pts[1], pointe: pts[3], pied: pts[6], pts };
}

/** Un point du tracé, dans le repère de la SCÈNE : ancre + local × échelle. */
const versScene = (p, ancre, echelle) => ({
  x: ancre.x + p.x * echelle,
  y: ancre.y + p.y * echelle,
});

/** La dernière valeur atteinte sur un canal (1 par défaut pour `scale`). */
function valeurFinale(tl, id, prop, defaut) {
  const a = animsDe(tl, id, prop).at(-1);
  return a ? a.keyframes.at(-1).value : defaut;
}

/**
 * Le SOMMET DROIT de la barre haute d'un 6, en unités de scène.
 *
 * `SIX_BARRE.sommetX` se compte depuis l'origine du glyphe et le jeton est ancré
 * par son centre : d'où la demi-chasse retranchée. `pos.w` porte la chasse
 * RÉELLE du jeton — celle que le verdict a multipliée par son échelle.
 */
function sommetDeLaBarre(pos, echelle) {
  return {
    x: pos.x + FONT_SIZE * echelle * SIX_BARRE.sommetX - pos.w / 2,
    y: pos.y - (FONT_SIZE * echelle * CAP_RATIO) / 2,
  };
}

/**
 * LA vérification. Elle porte sur l'état FINAL de la timeline, donc sur ce que
 * le spectateur a sous les yeux, à l'échelle où il l'a.
 *
 * Trois assertions, une par phrase de l'auteur, plus la garde qui empêche de
 * satisfaire la troisième par accident.
 */
function verifierLeCalage(tl, ids, quoi) {
  const noeudDe = (hote) => tl.nodes.find((n) => n.role === 'horns' && n.data.suit === hote);
  const nG = noeudDe(ids[0]);
  const nD = noeudDe(ids[2]);
  assert.ok(nG && nD, `${quoi} : il faut une corne par 6 extérieur`);
  assert.equal(noeudDe(ids[1]), undefined, `${quoi} : un diable n’a pas de corne frontale`);

  const echelle = valeurFinale(tl, nD.id, 'scale', 1);
  const zoom = valeurFinale(tl, ids[2], 'scale', 1);
  assert.equal(echelle, zoom,
    `${quoi} : les cornes ne sont pas à l’échelle des chiffres — tout le reste est faux`);

  const gauche = corne(nG.data.d);
  const droite = corne(nD.data.d);
  const air = FONT_SIZE * JEU * echelle;

  // ── 1. « le côté droit de la corne droite dans le prolongement du côté
  //       droit de la barre du 6 de droite » ────────────────────────────────
  //
  // Deux conditions, et il FAUT les deux : le pied est sur la droite qui
  // prolonge le flanc (un point de contact), et le bord la quitte dans la même
  // direction (sinon la corne fait un coude au ras du chiffre).
  const sommetD = sommetDeLaBarre(tl.scene.pos(ids[2]), echelle);
  const talon = versScene(droite.talon, tl.scene.pos(nD.id), echelle);
  assert.ok(Math.abs((sommetD.y - talon.y) - air) < EPSILON,
    `${quoi} : la base de la corne droite est à ${(sommetD.y - talon.y).toFixed(3)} du crâne, `
    + `et l’air voulu vaut ${air.toFixed(3)}`);
  assert.ok(Math.abs((talon.x - sommetD.x) - SIX_BARRE.pente * air) < EPSILON,
    `${quoi} : le pied de la corne droite est en x=${talon.x.toFixed(3)}, et le prolongement du `
    + `flanc de la barre passe en x=${(sommetD.x + SIX_BARRE.pente * air).toFixed(3)}`);

  const poignee = versScene(droite.poignee, tl.scene.pos(nD.id), echelle);
  const pente = (poignee.x - talon.x) / (talon.y - poignee.y);
  assert.ok(Math.abs(pente - SIX_BARRE.pente) < 1e-4,
    `${quoi} : le bord externe part avec une pente de ${pente.toFixed(5)} et le flanc de la barre `
    + `en a ${SIX_BARRE.pente} — la corne ferait un coude au sortir du chiffre`);

  // ── 2. « la pointe droite de la corne de gauche sur la pointe en haut à
  //       droite de la barre du 6 de gauche » ─────────────────────────────────
  const sommetG = sommetDeLaBarre(tl.scene.pos(ids[0]), echelle);
  const pied = versScene(gauche.pied, tl.scene.pos(nG.id), echelle);
  assert.ok(Math.abs((sommetG.y - pied.y) - air) < EPSILON,
    `${quoi} : le point droit de la corne gauche n’est pas à l’air voulu du crâne`);
  assert.ok(Math.abs((pied.x - sommetG.x) - SIX_BARRE.pente * air) < EPSILON,
    `${quoi} : le point droit de la corne gauche est en x=${pied.x.toFixed(3)}, le sommet de la `
    + `barre du 6 de gauche en x=${sommetG.x.toFixed(3)}`);

  // ── 3. et ce point EST bien le plus à droite de la corne de gauche ────────
  //
  // Sans quoi la deuxième phrase serait satisfaite par un point quelconque du
  // tracé pendant qu'un galbe dépasserait ailleurs. On échantillonne les deux
  // cubiques plutôt que de raisonner sur l'enveloppe convexe : c'est le dessin
  // qui doit être vérifié, pas le raisonnement qui le produit.
  const cubique = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  let plusADroite = -Infinity;
  for (const [a, b, c, e] of [[0, 1, 2, 3], [3, 4, 5, 6]]) {
    for (let k = 0; k <= 200; k++) {
      plusADroite = Math.max(plusADroite, cubique(
        gauche.pts[a].x, gauche.pts[b].x, gauche.pts[c].x, gauche.pts[e].x, k / 200,
      ));
    }
  }
  assert.ok(plusADroite <= gauche.pied.x + EPSILON,
    `${quoi} : la corne de gauche dépasse en x=${plusADroite.toFixed(3)} alors que son point `
    + `d’ancrage est en x=${gauche.pied.x.toFixed(3)}`);
}

// ═══════════════════════════════════ le calage, à la taille de la ligne

test('★ cornes : le bord de la corne droite prolonge le flanc de la barre du 6 de droite', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Trois 6 d’affilée',
    ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }],
  }], chiffres('6667')));
  verifierLeCalage(tl, ['d0', 'd1', 'd2'], 'à la taille de la ligne');
});

/**
 * ★ « qu'elles soient ET RESTENT alignées » (l'auteur).
 *
 * Le verdict grossit le groupe d'un facteur ~4 : les glyphes par un `scale`, les
 * écarts par une chasse et un `gap` multipliés d'autant (`reveal.js`,
 * `poserLeFlux`). C'est une homothétie de centre l'ancre du décor, donc le
 * `scale` du nœud de cornes suffit — mais « donc » est un raisonnement, et un
 * raisonnement se casse en silence. On mesure.
 */
test('★ cornes : le calage tient au verdict, où le groupe est quatre fois plus grand', () => {
  const tl = compile(sc([
    {
      id: 'a', title: 'Trois 6 d’affilée',
      ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }],
    },
    { id: 'b', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'] }] },
  ], chiffres('6667')));

  const zoom = valeurFinale(tl, 'd1', 'scale', 1);
  assert.ok(zoom > 3, `le verdict ne grossit que de ×${zoom} — la vérification ne prouverait rien`);
  verifierLeCalage(tl, ['d0', 'd1', 'd2'], `au verdict (×${zoom})`);
});

/**
 * ★ Et il tient sur PLUSIEURS 666, où chaque série a sa propre ancre et où le
 * verdict ouvre un blanc entre les séries. Une série non centrée sur la vue est
 * le cas qui casserait un calage écrit en absolu.
 */
test('★ cornes : deux 666 côte à côte, deux calages exacts — au verdict compris', () => {
  const tl = compile(sc([
    { id: 'a', title: 'Un 666', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: [] }] },
    { id: 'b', title: 'Un autre', ops: [{ op: 'horns', targets: ['d3', 'd4', 'd5'], efface: [] }] },
    {
      id: 'c',
      title: 'Le verdict',
      ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'] }],
    },
  ], chiffres('666666')));

  verifierLeCalage(tl, ['d0', 'd1', 'd2'], 'première série');
  verifierLeCalage(tl, ['d3', 'd4', 'd5'], 'seconde série');
});

/**
 * ★ LE CAS QUI A FAIT CHANGER LE DESSIN — une ligne resserrée, puis rendue à
 * son écart plein.
 *
 * Le premier montage plaçait les DEUX cornes dans un seul nœud accroché au 6 du
 * milieu, à `± entraxe` : le calage tenait alors parce que le verdict était
 * censé n'être qu'une homothétie. Il ne l'est pas. `partition` resserre la ligne
 * à 0,7 écart pendant le découpage — c'est là que les cornes se posent, sur la
 * voie « Donald Trump » — et le verdict rend l'écart plein. L'entraxe change
 * d'un facteur que le `scale` du décor ne porte pas, et les pieds des cornes
 * tombaient 7,4 unités en deçà du sommet des barres.
 *
 * Une corne par 6 rend l'entraxe étranger à la géométrie. Le test rejoue la
 * séquence exacte : découpage (resserrement), couronnement, verdict.
 */
test('★ cornes : la ligne se resserre puis se rouvre — le calage ne bouge pas', () => {
  const tl = compile(sc([
    { id: 'p', title: 'On découpe', ops: [{ op: 'partition', groups: [{ targets: ['d0', 'd1', 'd2'] }, { targets: ['d3', 'd4'] }] }] },
    { id: 'a', title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'] }] },
    { id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'] }] },
  ], chiffres('66649')));

  // L'écart CHANGE bien entre les deux moments : sans quoi le test ne prouverait
  // rien. On le mesure sur la ligne finale, ramenée à l'échelle du verdict.
  const zoom = valeurFinale(tl, 'd1', 'scale', 1);
  const entraxeFinal = (tl.scene.pos('d2').x - tl.scene.pos('d1').x) / zoom;
  assert.ok(Math.abs(entraxeFinal - 33) > 1,
    `l’entraxe ramené vaut ${entraxeFinal} — le resserrement n’a pas eu lieu, le test est vide`);

  verifierLeCalage(tl, ['d0', 'd1', 'd2'], 'après resserrement puis verdict');
});

/**
 * ★ Et la géométrie d'une corne ne dépend QUE du glyphe.
 *
 * C'est la garantie structurelle : deux scènes dont les 6 sont espacés
 * différemment produisent le MÊME tracé de corne. Tant que c'est vrai, aucun
 * re-espacement futur ne peut décaler le calage.
 */
test('★ cornes : le tracé d’une corne ne dépend pas de l’écart entre les 6', () => {
  const trace = (steps, suite) => {
    const tl = compile(sc(steps, chiffres(suite)));
    return tl.nodes.filter((n) => n.role === 'horns').map((n) => n.data.d);
  };
  const nu = trace([
    { id: 'a', title: 'A', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'] }] },
  ], '666');
  const serre = trace([
    { id: 'p', title: 'P', ops: [{ op: 'partition', groups: [{ targets: ['d0', 'd1', 'd2'] }, { targets: ['d3', 'd4'] }] }] },
    { id: 'a', title: 'A', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'] }] },
  ], '66649');
  assert.deepEqual(serre, nu,
    'une ligne resserrée doit donner exactement le même tracé de corne qu’une ligne au repos');
});

// ═══════════════════════════════════ la couleur, posée avec les cornes

/**
 * ★ « J'aimerais que tu colores les 6 associés aux cornes au moment où tu leur
 * ajoutes les cornes » (l'auteur).
 *
 * Un seul geste : les cornes poussent et les chiffres basculent en rubrique
 * ensemble. Le test vérifie les trois choses qui pourraient le défaire — que la
 * couleur soit la bonne, qu'elle parte au même instant que la pousse, et qu'elle
 * ne touche QUE les trois couronnés.
 */
test('★ cornes : les trois 6 passent en rubrique pendant que les cornes poussent', () => {
  const tl = compile(sc([{
    id: 'a', title: 'Trois 6 d’affilée',
    ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3', 'd4'] }],
  }], chiffres('66676')));

  const cornes = tl.nodes.find((n) => n.role === 'horns');
  const pousse = animsDe(tl, cornes.id, 'scale')[0];

  for (const id of ['d0', 'd1', 'd2']) {
    const teinte = animsDe(tl, id, 'fill');
    assert.equal(teinte.length, 1, `${id} : une seule mise en couleur`);
    assert.equal(teinte[0].keyframes.at(-1).value, PALETTE.rubric,
      `${id} : la couleur des cornes est celle de l’affirmation (design §2.3)`);
    assert.equal(teinte[0].delay, pousse.delay,
      `${id} : la couleur et les cornes doivent partir ENSEMBLE, sinon on lit deux gestes`);
    assert.ok(teinte[0].duration <= pousse.duration,
      `${id} : la couleur ne doit pas déborder la pousse`);
  }

  // Ce qui s'efface ne rougit pas : on ne colore pas ce qu'on écarte.
  for (const id of ['d3', 'd4']) {
    assert.equal(animsDe(tl, id, 'fill').length, 0, `${id} n’est pas couronné, il ne rougit pas`);
  }

  assert.deepEqual(tl.warnings, [], 'aucune animation concurrente');
});

/**
 * ★ Et le verdict ne se DISPUTE pas le canal.
 *
 * `reveal` repasse les chiffres en rubrique — c'est sa conclusion, et elle reste
 * juste même quand ils y sont déjà. Ce qu'il ne doit pas faire, c'est recouvrir
 * la mise en couleur des cornes : deux animations concurrentes sur `fill`
 * seraient un avertissement de compilation ET un clignotement à l'écran. Elles
 * se SUCCÈDENT, et la seconde part de la valeur où la première s'est arrêtée —
 * ce qui rend le retour arrière cohérent : `seek` en arrière repasse par
 * rubrique, puis par la couleur d'origine, dans cet ordre et sans saut.
 */
test('★ cornes : la couleur des cornes et celle du verdict se succèdent, jamais ne se recouvrent', () => {
  const tl = compile(sc([
    {
      id: 'a', title: 'Trois 6 d’affilée',
      ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }],
    },
    { id: 'b', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'] }] },
  ], chiffres('6667')));

  assert.deepEqual(tl.warnings, [], 'aucune animation concurrente');

  for (const id of ['d0', 'd1', 'd2']) {
    const teintes = animsDe(tl, id, 'fill').sort((a, b) => a.delay - b.delay);
    assert.equal(teintes.length, 2, `${id} : les cornes colorent, le verdict confirme`);
    const [cornes, verdict] = teintes;
    assert.ok(cornes.delay + cornes.duration <= verdict.delay,
      `${id} : les deux mises en couleur se recouvrent`);
    // Le chaînage : le verdict repart d'où les cornes se sont arrêtées. C'est ce
    // qui garantit qu'aucune image, en avant comme en arrière, ne montre une
    // couleur que personne n'a demandée.
    assert.equal(verdict.keyframes[0].value, cornes.keyframes.at(-1).value);
    assert.equal(verdict.keyframes.at(-1).value, PALETTE.rubric);
    assert.notEqual(cornes.keyframes[0].value, PALETTE.rubric,
      `${id} : la couleur de départ doit être celle du jeton, pour que le retour arrière la rende`);
  }
});

/**
 * ★ LE VERDICT COURONNE CE QUE LA DÉMONSTRATION N'A PAS PU COURONNER.
 *
 * « "e-h" n'aura ses cornes qu'à l'étape verdict puisque les 6 ne sont pas
 * réunis avant » (l'auteur). Une série dont les trois 6 ne se touchent jamais
 * en cours de route — parce qu'une ponctuation les sépare, parce qu'ils
 * viennent de portées disjointes — ne peut pas être couronnée plus tôt : la
 * démonstration ne couronne que ce qu'elle CONSTATE. Le verdict, lui, les
 * réunit, et c'est là qu'il faut le dire.
 *
 * Trois choses se vérifient ici, et ce sont les restrictions écrites dans
 * `reveal.js` : jamais deux couronnements sur un même chiffre, jamais le rang
 * du bas, jamais autre chose que trois 6 — et le registre sobre, qui n'en veut
 * pas du tout.
 *
 * ⚠️ La quatrième A ÉTÉ LEVÉE, et ce test l'a gelée à l'envers pendant tout ce
 * temps : « un 666 seul reste nu — et reste grand ». L'auteur a tranché sur la
 * voie qu'il tient pour la plus élégante du corpus, `tca+mt9+mpf` sur
 * `Macron` — un 666 seul : « Il lui manque juste les cornes ». Le prix est réel
 * et se mesure juste en dessous : le zoom tombe de moitié. Il est payé.
 */
test('★ cornes : le verdict couronne les séries nues du rang du haut', () => {
  // Deux séries, aucune couronnée en chemin : les deux le sont au verdict.
  const deux = verdict(6);
  assert.equal(cornesDe(deux).length, 4, 'deux séries, deux cornes chacune');

  // Le registre SOBRE n'en veut pas : ce qu'il a retiré de la démonstration ne
  // doit pas revenir par le verdict.
  const sobre = compile(sc([{
    id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'] }],
  }], chiffres('666666')));
  assert.equal(cornesDe(sobre).length, 0, 'sans scénographie, aucune corne au verdict');

  // ★ UN 666 SEUL EST COURONNÉ LUI AUSSI — c'est l'emblème du site, et
  //   l'auteur l'a demandé nommément. Deux cornes, une paire pour la série.
  const seul = verdict(3);
  assert.equal(cornesDe(seul).length, 2, 'un 666 seul porte ses cornes');

  // ★ ET CE QU'IL EN COÛTE, mesuré ici pour que personne n'ait à le redécouvrir :
  //   un décor au-dessus des chiffres leur prend de la hauteur, donc le verdict
  //   grandit moins. C'est le prix accepté, pas un défaut — mais il ne doit pas
  //   dériver au-delà : un 666 couronné reste plus grand qu'un verdict de deux
  //   séries, sans quoi le zoom aurait cessé de tenir compte du décor.
  const zoom = seul.anims.filter((a) => a.id === 'd0' && a.prop === 'scale').pop();
  const zoomDeux = deux.anims.filter((a) => a.id === 'd0' && a.prop === 'scale').pop();
  assert.ok(zoom.keyframes[1].value > zoomDeux.keyframes[1].value,
    `un 666 seul prend encore la scène (× ${zoom.keyframes[1].value} `
    + `contre × ${zoomDeux.keyframes[1].value} à deux séries)`);

  // ★ ET LE REGISTRE SOBRE NE PAIE RIEN — question de l'auteur, mesurée ici.
  //
  //   Le prix du couronnement est celui du DÉCOR : des cornes au-dessus des
  //   chiffres leur prennent de la hauteur, donc le verdict grandit moins. En
  //   sobre il n'y a pas de cornes (restriction 1, intacte), donc pas de décor,
  //   donc pas de prix — le zoom y reste ENTIER, exactement ce qu'il valait
  //   avant que la restriction « jamais un 666 seul » ne soit levée.
  const sobre3 = compile(sc([{
    id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'] }],
  }], chiffres('666')));
  assert.equal(cornesDe(sobre3).length, 0, 'sobre : pas de cornes, donc rien à loger');
  const zoomSobre = sobre3.anims.filter((a) => a.id === 'd0' && a.prop === 'scale').pop();
  assert.ok(zoomSobre.keyframes[1].value > zoom.keyframes[1].value,
    `le sobre garde tout son zoom (× ${zoomSobre.keyframes[1].value} `
    + `contre × ${zoom.keyframes[1].value} en scénique couronné)`);

  // Cinq séries : deux rangs (5 → 3 puis 2), et seul le rang du HAUT est
  // couronné. On ne pose pas des cornes pour les retirer trois lignes plus bas.
  const cinq = verdict(15);
  assert.equal(cornesDe(cinq).length, 6,
    'trois séries au rang du haut, deux cornes chacune — et rien au rang du bas');
});

/** Un verdict de `n` chiffres « 6 », sans aucune corne posée en chemin. */
function verdict(n) {
  const tokens = chiffres('6'.repeat(n));
  // `scenographie` = le registre SCÉNIQUE : c'est lui qui autorise les cornes,
  // au verdict comme ailleurs (voir `reveal.js`).
  return compile(sc([{
    id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: tokens.map((t) => t.id) }],
  }], tokens), { scenographie: true });
}

const cornesDe = (tl) => tl.nodes.filter((n) => n.role === 'horns');

/**
 * ★ **LE FEU NE GARDE PAS LA FORME D'UNE CORNE QUI VA S'EFFRITER.**
 *
 * > « C'est normal que tu ne les trouves pas : elles sont le fruit de la forme
 * >   des flammes, calculée avec les cornes — mais pour des cornes qui entre
 * >   temps ont été retirées/effritées. Les flammes devraient être calculées
 * >   après effritage et retrait des cornes, pour ne les inclure que quand elles
 * >   sont définitives. » (l'auteur)
 *
 * Le brasier RECOPIE le tracé de la corne de son 6 pour brûler avec elle. Il
 * naissait au début du geste, quand toutes les cornes existent encore ; les
 * triptyques relégués au rang du bas perdent les leurs plus tard. Le feu gardait
 * donc, gravée dans sa forme, une corne que la scène venait d'effacer — et le
 * corps du brasier étant peint en couleur de NUIT, ce qu'on voyait était une
 * corne NOIRE, sans propriétaire, posée sur le verdict.
 *
 * Le test tient les deux bouts : un 666 couronné qui RESTE emporte sa corne dans
 * les flammes, un 666 dont la corne s'effrite n'y met rien.
 */
test('★ cornes : le brasier ignore les cornes que le verdict va effriter', () => {
  // QUATRE triptyques : c'est le premier compte que `repartirEnLignes` étale
  // sur deux rangs (4 / 1 ≥ 3,5), donc le premier qui produise un rang du bas
  // — celui dont les cornes s'effritent.
  const six = [...'666666666666'].map((c, i) => ({ id: `d${i}`, text: c, kind: 'digit' }));
  const trio = (k) => [`d${k * 3}`, `d${k * 3 + 1}`, `d${k * 3 + 2}`];
  const tl = compile(sc([
    ...[0, 1, 2, 3].map((k) => ({
      id: `h${k}`, title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: trio(k) }],
    })),
    { id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: six.map((t) => t.id), serie: 3 }] },
  ], six), { scenographie: true });

  const cornes = tl.nodes.filter((n) => n.role === 'horns');
  assert.equal(cornes.length, 8, 'quatre triptyques couronnés, deux cornes chacun');

  // Une corne qui s'effrite se reconnaît à son TRACÉ animé (canal discret `d`),
  // qui est très exactement le geste de `effriterLesCornes`.
  const effritees = new Set(tl.discrete
    .filter((d) => d.channel === 'd' && cornes.some((n) => n.id === d.id))
    .map((d) => d.id));
  assert.ok(effritees.size > 0, 'le rang du bas perd bien ses cornes');
  assert.ok(effritees.size < cornes.length, 'et le rang du haut garde les siennes');

  // ★ Aucun brasier ne porte le tracé d'une corne effritée : c'est LÀ que la
  //   corne noire naissait.
  const brasiers = tl.nodes.filter((n) => n.role === 'brasier' && n.data && n.data.corne);
  assert.ok(brasiers.length > 0, 'les 666 qui gardent leurs cornes brûlent avec elles');
  for (const b of brasiers) {
    const chiffre = b.id.replace('@brasier:', '');
    const sienne = cornes.find((n) => n.data && n.data.suit === chiffre);
    assert.ok(sienne, `${b.id} : le feu porte une corne, elle doit exister`);
    assert.ok(!effritees.has(sienne.id),
      `${b.id} porte le tracé de « ${sienne.id} », qui s’effrite — une corne noire `
      + 'survivrait au verdict, sans propriétaire et en couleur de nuit');
  }
});
