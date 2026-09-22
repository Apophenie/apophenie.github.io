/**
 * ★ **UN AFFICHEUR PAR CARACTÈRE, PRÈS DU SIEN — vérifié sur la scène, pas sur
 *   le solveur.**
 *
 * `placement.test.js` gèle le solveur ; celui-ci gèle ce que le solveur PRODUIT
 * une fois branché — c'est-à-dire ce que le spectateur voit. Les deux exigences
 * dures de l'auteur y sont relues sur la timeline compilée :
 *
 *  · les afficheurs ne se superposent JAMAIS entre eux ;
 *  · aucun ne sort de la zone d'affichage.
 *
 * Et la promesse qui les motive : chacun est posé PRÈS de son caractère, pas au
 * centre de la vue.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { VIEWBOX, MARGIN, FONT_SIZE } from '../constants.js';
import { ENCART } from '../primitives/encart.js';
import { RESPIRATION } from '../placement.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const lettres = (mot) => [...mot].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));

/** Les segments d'un « h » en sept segments : b c e f g, soit 3 traits fusionnés. */
const H = { segments: 'bcefg', count: 3 };
/** Un « o » : a b c d e f, soit 4 traits fusionnés — a, d, et les deux
 *  verticales bc et ef. Le contrôle croisé du moteur l'a rappelé à ce test,
 *  qui annonçait 1 : « le moteur visuel refuse d'afficher autre chose que ce
 *  qui est compté ». */
const O = { segments: 'abcdef', count: 4 };

/**
 * Un scénario qui convertit `n` caractères d'affilée, comme `etapeMappeur` les
 * émet : un step par jeton, le décor monté au premier et retiré au dernier.
 */
function conversions(mot) {
  const n = [...mot].length;
  return {
    version: 1,
    tokens: lettres(mot),
    steps: [...mot].map((c, i) => {
      const m = c === 'o' ? O : H;
      return {
        id: `s${i}`,
        title: 'Traits continus',
        ops: [{
          op: 'sevenSeg',
          target: `t${i}`,
          titre: 'Sept segments',
          segments: m.segments,
          count: m.count,
          to: { id: `n${i}`, text: String(m.count) },
          montre: i === 0,
          retire: i === n - 1,
        }],
      };
    }),
  };
}

/** L'encombrement horizontal réel d'un afficheur — compteur compris. */
const DEMI = Math.max(
  (FONT_SIZE * ENCART.cote) / 2,
  FONT_SIZE * (ENCART.compteurX + 0.45),
);

/** Les cadres d'afficheur de la timeline, avec leur position de naissance. */
const cadres = (tl) => tl.nodes
  .filter((n) => n.role === 'frame' && n.id.startsWith('@encart:'))
  .map((n) => ({ id: n.id, x: n.base.translate.x, y: n.base.translate.y }));

/**
 * ★ **UN CADRE PAR CARACTÈRE — et c'est le retournement demandé.**
 *
 * Avant, quatre lettres d'affilée partageaient UN cadre, monté à la première et
 * retiré à la dernière. Il y en a désormais quatre.
 */
test('★ afficheurs — un cadre par caractère converti, et pas un seul pour tous', () => {
  const tl = compile(conversions('hope'));
  assert.equal(cadres(tl).length, 4, 'quatre lettres, quatre afficheurs');
  // Et leurs segments ne se partagent pas : chaque cadre a les siens.
  const segs = tl.nodes.filter((n) => n.role === 'seg');
  assert.equal(segs.length, 4 * 7, 'sept segments par afficheur, et aucun partagé');
  const parCadre = new Set(segs.map((n) => n.data.encart));
  assert.equal(parCadre.size, 4, 'chaque segment appartient à un cadre, et à un seul');
});

/**
 * ★ **POSÉ PRÈS DU SIEN.** Le premier afficheur d'une série n'a aucun voisin à
 * éviter : il se pose donc EXACTEMENT au-dessus de son caractère. C'est le cas
 * le plus simple, et c'est celui qui dit sans ambiguïté que la règle est bien
 * « près du sien » et non « au centre ».
 */
test('★ afficheurs — le premier se pose exactement au-dessus de son caractère', () => {
  const tl = compile(conversions('hope'));
  const t0 = tl.nodes.find((n) => n.id === 't0');
  const cadre = cadres(tl).find((c) => c.id.endsWith(':t0'));
  assert.ok(cadre, 'le cadre du premier caractère manque');
  assert.ok(Math.abs(cadre.x - t0.base.translate.x) < 0.5,
    `posé à ${cadre.x}, alors que son caractère est à ${t0.base.translate.x}`);
  // Au-dessus de la ligne, jamais dessus.
  assert.ok(cadre.y < t0.base.translate.y - FONT_SIZE, 'et bien au-dessus de la ligne');
});

/**
 * ★ **ET IL N'EST PAS AU CENTRE.** La garde qui distingue « près du sien » de
 * l'ancien comportement : sur un mot dont le premier caractère est loin du
 * milieu, le cadre doit suivre le caractère, pas le milieu de la scène.
 */
test('★ afficheurs — le cadre suit son caractère, il ne reste pas au centre', () => {
  const tl = compile(conversions('hopehopehope'));
  const centreVue = VIEWBOX.x + VIEWBOX.w / 2;
  const premier = cadres(tl).find((c) => c.id.endsWith(':t0'));
  assert.ok(Math.abs(premier.x - centreVue) > FONT_SIZE,
    `le premier cadre est à ${premier.x}, soit au centre (${centreVue}) : il ne suit pas son caractère`);
});

/* ═════════════ Les deux exigences dures, relues sur la scène ═════════════ */

/**
 * ⚠️ **ON LIT LES AFFICHEURS VISIBLES AU MÊME INSTANT, pas tous les nœuds.** Un
 *   cadre relayé existe encore dans la scène — le moteur ne retire jamais un
 *   nœud (CONTRACTS §3.2 règle 7) — mais il est à zéro d'opacité. Deux cadres
 *   qui se recouvrent sans jamais être visibles ensemble ne se superposent pas.
 */
function visiblesA(tl, t) {
  /* ⚠️ **ON TRIE PAR INSTANT, pas par ordre d'émission.** `tl.anims` est dans
     l'ordre où les primitives ont parlé, qui n'est pas l'ordre du temps : une
     animation émise plus tard peut commencer plus tôt. Sans ce tri, ce relevé
     retenait la valeur de la MAUVAISE animation — et voyait survivre à la fin
     de la série deux afficheurs que la rangée avait bel et bien repliés. */
  const parTemps = [...tl.anims].sort((a, b) => a.delay - b.delay);
  const valeur = (id, prop, quand) => {
    let v = (tl.nodes.find((n) => n.id === id) || {}).base[prop];
    for (const a of parTemps) {
      if (a.id !== id || a.prop !== prop || a.delay > quand) continue;
      v = quand >= a.delay + a.duration ? a.keyframes.at(-1).value : a.keyframes[0].value;
    }
    return v;
  };
  return cadres(tl)
    .filter((c) => (valeur(c.id, 'opacity', t) ?? 0) > 0.1)
    .map((c) => ({ ...c, x: valeur(c.id, 'translate', t).x }))
    .sort((a, b) => a.x - b.x);
}

test('★ afficheurs — deux afficheurs visibles ensemble ne se superposent JAMAIS', () => {
  let mesures = 0;
  for (const mot of ['ho', 'hope', 'hopehope', 'hopehopehope', 'hopehopehopehope']) {
    const tl = compile(conversions(mot));
    for (let t = 0; t <= tl.total; t += 40) {
      const vus = visiblesA(tl, t);
      for (let i = 1; i < vus.length; i++) {
        mesures++;
        assert.ok(vus[i].x - vus[i - 1].x >= 2 * DEMI + RESPIRATION - 1,
          `« ${mot} » à ${t} ms : ${vus[i - 1].id} et ${vus[i].id} se superposent `
          + `(écart ${(vus[i].x - vus[i - 1].x).toFixed(1)} pour ${(2 * DEMI).toFixed(1)} d’encombrement)`);
      }
    }
  }
  assert.ok(mesures > 50, `seulement ${mesures} paires observées : le test ne garde rien`);
});

test('★ afficheurs — aucun afficheur ne sort de la zone d’affichage', () => {
  for (const mot of ['h', 'ho', 'hope', 'hopehope', 'hopehopehope', 'hopehopehopehope']) {
    const tl = compile(conversions(mot));
    for (const c of cadres(tl)) {
      assert.ok(c.x - DEMI >= VIEWBOX.x + MARGIN - 1,
        `« ${mot} » : ${c.id} déborde à gauche (bord ${(c.x - DEMI).toFixed(1)})`);
      assert.ok(c.x + DEMI <= VIEWBOX.x + VIEWBOX.w - MARGIN + 1,
        `« ${mot} » : ${c.id} déborde à droite (bord ${(c.x + DEMI).toFixed(1)})`);
      // Verticalement aussi : le titre vit au-dessus du cadre.
      const haut = c.y - (FONT_SIZE * ENCART.cote) / 2 - FONT_SIZE * 0.42;
      assert.ok(haut >= VIEWBOX.y, `« ${mot} » : ${c.id} et son titre sortent par le haut (${haut.toFixed(1)})`);
    }
  }
});

/**
 * ★ **LE RELAIS — « retomber sur des vagues successives ».**
 *
 * Des caractères contigus sont distants d'une chasse (28,8) quand un afficheur
 * en occupe plus de deux cent cinquante : ils ne peuvent pas tous tenir. Le
 * plus ancien se retire donc pour faire place, et c'est ce qui garantit les
 * deux exigences ci-dessus sans jamais rapetisser ce qu'il faut compter.
 */
test('★ afficheurs — quand la place manque, le plus ancien se retire', () => {
  const tl = compile(conversions('hopehopehopehope'));
  let maxVus = 0;
  for (let t = 0; t <= tl.total; t += 40) maxVus = Math.max(maxVus, visiblesA(tl, t).length);
  assert.ok(maxVus >= 1, 'il y en a toujours au moins un');
  assert.ok(maxVus < 16, `les seize sont restés à l’écran : le relais ne joue pas (${maxVus})`);
  // Et chacun a bien eu son tour : seize cadres créés, aucun escamoté.
  assert.equal(cadres(tl).length, 16);
});

/**
 * ★ **L'OUTIL S'EN VA EN ENTIER.** `retire` ne concernait qu'un cadre parce
 * qu'il n'y en avait qu'un. La dernière conversion doit désormais emporter
 * toute la rangée — sans quoi l'afficheur resterait à l'écran après que la
 * démonstration en a fini avec lui.
 */
test('★ afficheurs — la dernière conversion emporte toute la rangée', () => {
  const tl = compile(conversions('hope'));
  /* ⚠️ On relève à `total`, pas à `total − 1` : le repli COURT jusqu'à la
     charnière, et ce relevé rend la valeur de DÉPART d'une animation en cours
     (il ne sait pas interpoler). Une milliseconde plus tôt, les cadres sont en
     train de disparaître, et les lire « encore visibles » est exact — c'est à
     la fin qu'il ne doit plus rien rester. */
  const restants = visiblesA(tl, tl.total);
  assert.deepEqual(restants.map((c) => c.id), [],
    'un afficheur survit à la fin de la série');
  // Et ils ont bien tous existé : c'est un repli, pas une absence.
  assert.equal(cadres(tl).length, 4);
});

/**
 * ★ **ET L'ARITHMÉTIQUE NE BOUGE PAS D'UN IOTA.** Le placement est une
 * DISPOSITION : les nombres produits, leur texte et leur ordre sont ceux
 * d'avant. C'est la contrainte du chantier — « jamais l'arithmétique ».
 */
test('★ afficheurs — les nombres produits sont les mêmes dans les deux rythmes', () => {
  const scenario = conversions('hope');
  const lus = (rythme) => compile(scenario, { rythme }).nodes
    .filter((n) => n.role === 'text')
    .map((n) => `${n.id}=${n.text}`);
  assert.deepEqual(lus('simultane'), lus('pasAPas'));
  assert.deepEqual(lus('pasAPas').filter((s) => s.startsWith('n')),
    ['n0=3', 'n1=4', 'n2=3', 'n3=3']);
});


test('afficheurs simultanés — vagues de 0,1 s, conversions et figures toutes navigables', () => {
  const scenario = conversions('hopehope');
  scenario.steps.forEach((s, i) => { s.caption = `Conversion ${i}`; });
  const tl = compile(scenario, { rythme: 'simultane' });
  assert.equal(tl.steps.length, scenario.steps.length);
  assert.deepEqual(tl.steps.map((s) => [s.id, s.caption, s.figure]),
    scenario.steps.map((s) => [s.id, s.caption, s.figure ?? null]));
  assert.deepEqual(tl.bounds.slice(0, 4), [0, 100, 200, tl.steps[3].t0]);
  assert.ok(tl.steps[3].t0 > 3000, 'la vague suivante attend la fin du comptage');
  assert.ok(tl.total < compile(scenario).total * 0.6, 'les conversions se jouent réellement ensemble');
  assert.deepEqual(tl.warnings, []);
  for (let i = 0; i < tl.steps.length; i++) {
    assert.equal(tl.steps[i].t0, tl.bounds[i]);
    assert.equal(tl.steps[i].t1, tl.bounds[i + 1]);
  }
});

test('afficheurs simultanés — encarts sans chevauchement ni débordement pendant les vagues', () => {
  for (const mot of ['ho', 'hopehopehopehope']) {
    const tl = compile(conversions(mot), { rythme: 'simultane' });
    for (let t = 0; t <= tl.total; t += 25) {
      const vus = visiblesA(tl, t);
      for (const c of vus) {
        assert.ok(c.x - DEMI >= VIEWBOX.x + MARGIN - 1);
        assert.ok(c.x + DEMI <= VIEWBOX.x + VIEWBOX.w - MARGIN + 1);
      }
      for (let i = 1; i < vus.length; i++) {
        assert.ok(vus[i].x - vus[i - 1].x >= 2 * DEMI + RESPIRATION - 1);
      }
    }
    assert.deepEqual(visiblesA(tl, tl.total), []);
    assert.deepEqual(tl.warnings, []);
  }
});

test('comptage et quatorze segments — mêmes nombres, départs en vague sans animation concurrente', () => {
  for (const op of [
    { op: 'countStrokes', glyph: 'H', mode: 'traits', count: 3 },
    { op: 'fourteenSeg', segments: ['a', 'b', 'c', 'd', 'e', 'f'], fusion: false, count: 6 },
  ]) {
    const scenario = conversions('hhhhhh');
    scenario.steps.forEach((s, i) => {
      s.ops = [{ ...op, target: `t${i}`, to: { id: `n${i}`, text: String(op.count) } }];
    });
    const sim = compile(scenario, { rythme: 'simultane' });
    const pas = compile(scenario, { rythme: 'pasAPas' });
    assert.equal(sim.steps[1].t0, 100);
    assert.ok(sim.total < pas.total * 0.6);
    assert.deepEqual(sim.warnings, []);
    assert.deepEqual(sim.scene.flow.map((id) => sim.scene.get(id).text),
      pas.scene.flow.map((id) => pas.scene.get(id).text));
  }
});
