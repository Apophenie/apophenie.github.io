/** Le sept et le quatorze segments : deux dispositions, un même comptage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { VIEWBOX } from '../constants.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const MODELES = [
  { op: 'sevenSeg', segments: 'bcefg', fusion: true, count: 3, total: 7 },
  { op: 'fourteenSeg', segments: ['b', 'c', 'e', 'f', 'g1', 'g2'], fusion: false, count: 6, total: 14 },
];

function conversions(mot, modele = MODELES[0]) {
  return {
    version: 1,
    tokens: [...mot].map((text, i) => ({ id: `t${i}`, text, kind: 'letter' })),
    steps: [...mot].map((_, i) => ({
      id: `s${i}`, title: 'Conversion', caption: `Conversion ${i}`,
      ops: [{ ...modele, target: `t${i}`, titre: 'Afficheur à segments',
        to: { id: `n${i}`, text: String(modele.count) },
        montre: i === 0, retire: i === mot.length - 1 }],
    })),
  };
}

const images = (tl, role) => tl.nodes.filter((n) => n.role === role);
const animations = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);
const valeurFinale = (a) => a.keyframes.at(-1).value;

for (const modele of MODELES) {
  test(`${modele.op} : pas à pas, un afficheur centré et réutilisé`, () => {
    const tl = compile(conversions('hhhh', modele), { rythme: 'pasAPas' });
    const cadres = images(tl, 'frame');
    assert.equal(cadres.length, 1);
    assert.ok(Math.abs(cadres[0].base.translate.x - (VIEWBOX.x + VIEWBOX.w / 2)) < 0.5);
    assert.equal(images(tl, 'seg').length, modele.total);
    assert.equal(images(tl, 'label').filter((n) => n.text === 'Afficheur à segments').length, 1);
    assert.equal(images(tl, 'label').filter((n) => n.id.startsWith('@compteur:')).length, 4);
    assert.deepEqual(tl.scene.flow.map((id) => tl.scene.get(id).text), Array(4).fill(String(modele.count)));
    assert.deepEqual(tl.warnings, []);
  });

  test(`${modele.op} : simultané, morphose sur chaque lettre et comptages en vague`, () => {
    const scenario = conversions('hhhhhh', modele);
    const pas = compile(scenario, { rythme: 'pasAPas' });
    const tl = compile(scenario, { rythme: 'simultane' });
    assert.equal(images(tl, 'frame').length, 0, 'aucun encart ne détourne la lettre de sa position');
    assert.equal(images(tl, 'seg').length, 6 * modele.total);
    assert.equal(images(tl, 'label').filter((n) => n.text === 'Afficheur à segments').length, 1);
    assert.deepEqual(tl.steps.map((s) => s.t0), [0, 100, 200, 300, 400, 500]);
    assert.ok(tl.total < pas.total * 0.4, 'les six conversions se jouent réellement en parallèle');
    for (let i = 0; i < 6; i++) {
      const lettre = tl.scene.get(`t${i}`);
      const segment = tl.nodes.find((n) => n.id === `@seg:${modele.op}:t${i}:b`);
      const compteur = tl.scene.get(`@compteur:t${i}`);
      const nombre = tl.scene.get(`n${i}`);
      assert.equal(animations(tl, lettre.id, 'translate').length, 0, 'la lettre ne voyage pas');
      assert.equal(segment.base.translate.x, lettre.base.translate.x, 'ses segments naissent sur elle');
      assert.equal(segment.base.translate.y, lettre.base.translate.y);
      assert.equal(compteur.base.translate.x, lettre.base.translate.x);
      assert.ok(compteur.base.translate.y > lettre.base.translate.y, 'son compteur est dessous');
      assert.ok(animations(tl, lettre.id, 'opacity').some((a) => valeurFinale(a) === 0),
        'la lettre s’efface complètement');
      const phases = animations(tl, segment.id, 'opacity').map((a) => [a.delay, valeurFinale(a)]);
      assert.ok(phases.some(([, v]) => v === 1) && phases.some(([, v]) => v > 0 && v < 1),
        'la forme apparaît, s’estompe, puis s’allume');
      assert.ok(animations(tl, nombre.id, 'translate').some((a) => valeurFinale(a).y === lettre.base.translate.y),
        'le nombre remonte à la place de la lettre');
    }
    assert.deepEqual(tl.scene.flow.map((id) => tl.scene.get(id).text),
      pas.scene.flow.map((id) => pas.scene.get(id).text));
    assert.deepEqual(tl.warnings, []);
  });

  test(`${modele.op} : toute la version segmentée reste lisible avant l’estompage`, () => {
    const mesure = (taille, speed = 1) => {
      const tl = compile(conversions('h'.repeat(taille), modele), { rythme: 'simultane', speed });
      const instants = Array.from({ length: taille }, (_, i) => {
        const ops = animations(tl, `@seg:${modele.op}:t${i}:b`, 'opacity');
        const apparition = ops.find((a) => valeurFinale(a) === 1);
        const estompage = ops.find((a) => valeurFinale(a) > 0 && valeurFinale(a) < 1);
        return { finApparition: apparition.delay + apparition.duration, estompage: estompage.delay };
      });
      const premierFondu = Math.min(...instants.map((x) => x.estompage));
      const derniereLettre = Math.max(...instants.map((x) => x.finApparition));
      instants.forEach((x, i) => assert.ok(Math.abs(x.estompage - premierFondu - i * 100 / speed) < 1,
        'l’estompage reprend avec 100 ms entre deux lettres'));
      assert.ok(premierFondu > derniereLettre,
        'aucune lettre ne s’estompe pendant qu’une autre se transforme');
      const comptes = Array.from({ length: taille }, (_, i) => tl.discrete
        .find((d) => d.id === `@compteur:t${i}` && d.channel === 'text').at);
      comptes.forEach((at, i) => assert.ok(Math.abs(at - comptes[0] - i * 100 / speed) < 1,
        'les compteurs reprennent eux aussi avec 100 ms d’écart'));
      assert.deepEqual(tl.warnings, []);
      return premierFondu - derniereLettre;
    };
    const court = mesure(2);
    const long = mesure(12);
    assert.ok(court >= 600, `la lecture courte dure ${court} ms`);
    assert.ok(long > court + 300, `la lecture longue (${long} ms) doit dépasser la courte (${court} ms)`);
    assert.ok(Math.abs(mesure(12, 2) * 2 - long) < 2,
      'la vitesse du lecteur s’applique aussi à la pause');
  });
}

test('segments simultanés : les entrées de navigation restent distinctes, même sur une longue ligne', () => {
  const scenario = conversions('hhhhhhhhhhhhhhhh');
  const tl = compile(scenario, { rythme: 'simultane' });
  assert.deepEqual(tl.steps.map((s) => [s.id, s.caption]),
    scenario.steps.map((s) => [s.id, s.caption]));
  assert.equal(images(tl, 'seg').length, 16 * 7);
  assert.equal(images(tl, 'label').filter((n) => n.text === 'Afficheur à segments').length, 1);
  assert.deepEqual(tl.warnings, []);
});

test('le comptage des traits conserve ses propres encarts et ses résultats dans les deux modes', () => {
  const scenario = conversions('hhhhhh');
  scenario.steps.forEach((s, i) => {
    s.ops = [{ op: 'countStrokes', glyph: 'H', mode: 'traits', count: 3,
      target: `t${i}`, to: { id: `n${i}`, text: '3' } }];
  });
  const pas = compile(scenario, { rythme: 'pasAPas' });
  const sim = compile(scenario, { rythme: 'simultane' });
  assert.deepEqual(sim.scene.flow.map((id) => sim.scene.get(id).text),
    pas.scene.flow.map((id) => pas.scene.get(id).text));
  assert.deepEqual(sim.warnings, []);
});
