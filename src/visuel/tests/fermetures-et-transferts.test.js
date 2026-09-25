import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { VECTEURS } from '../../moteur/vecteurs-geles.js';
import { nums } from '../../moteur/etat.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

function sceneDe(code, avant) {
  const op = PAR_CODE.get(code);
  const apres = appliquer(op, avant);
  assert.ok(apres, `${code} doit s’appliquer au témoin`);
  const ids = [...avant.valeur].map((_, i) => `t${i}`);
  const steps = op.steps(avant, apres, { ids, cle: 'a', langue: 'fr' });
  const kind = avant.type === 'STR' ? 'letter' : 'number';
  const tokens = ids.map((id, i) => ({ id, text: String(avant.valeur[i]), kind }));
  return { version: 1, tokens, steps };
}

test('fcnj et faux ne programment qu’un fondu par accolade, dans les deux modes', () => {
  for (const code of ['fcnj', 'faux']) {
    const scene = sceneDe(code, VECTEURS.find((v) => v[0] === code)[1]);
    for (const rythme of ['pasAPas', 'simultane']) {
      const tl = compile(scene, { rythme });
      assert.deepEqual(tl.warnings, [], `${code} ${rythme}`);
      for (const n of tl.nodes.filter((x) => x.role === 'bracket')) {
        const fondus = tl.anims.filter((a) => a.id === n.id && a.prop === 'opacity'
          && a.keyframes.at(-1).value === 0);
        assert.equal(fondus.length, 1, `${code} ${rythme} : une seule fermeture pour ${n.id}`);
      }
    }
  }
});

test('chaque addition ferme sa propre accolade avant la fin des autres calculs', () => {
  const valeurs = [6, 5, 1, 9, 3, 3];
  const avant = nums(valeurs, valeurs.map((_, i) => [[i, i + 1]]));
  const scene = sceneDe('mrdE', avant);
  const additions = scene.steps.find((s) => s.ops.filter((o) => o.op === 'sum').length === 2);
  assert.ok(additions);
  for (const rythme of ['pasAPas', 'simultane']) {
    const tl = compile(scene, { rythme });
    assert.deepEqual(tl.warnings, [], rythme);
    const step = tl.steps.find((s) => s.id === additions.id);
    const signes = additions.ops.find((o) => o.op === 'insertOperators').lots.map((lot) =>
      tl.anims.find((a) => a.id === lot.ids[0] && a.prop === 'opacity'
        && a.keyframes.at(-1).value === 1));
    assert.ok(signes.every(Boolean), `${rythme} : chaque addition montre son signe`);
    const ecart = signes[1].delay - signes[0].delay;
    assert.ok(Math.abs(ecart - (rythme === 'simultane' ? 100 : 2800)) < 0.01,
      `${rythme} : les signes apparaissent au tour de leur calcul`);
    const fondus = tl.anims.filter((a) => a.id.startsWith('@group:') && a.prop === 'opacity'
      && a.keyframes.at(-1).value === 0 && a.delay >= step.t0 && a.delay < step.t0 + step.duration)
      .sort((a, b) => a.delay - b.delay);
    assert.equal(fondus.length, 2, rythme);
    if (rythme === 'pasAPas') {
      assert.ok(fondus[0].delay + fondus[0].duration <= fondus[1].delay,
        'la première accolade disparaît avant que la seconde somme se termine');
    } else {
      assert.ok(Math.abs(fondus[1].delay - fondus[0].delay - 100) < 0.01,
        'les fermetures suivent le décalage de 100 ms des deux sommes');
    }
    assert.ok(fondus[0].delay + fondus[0].duration < step.t0 + step.duration - 300,
      `${rythme} : la première accolade n’attend pas le réajustement commun`);
  }
});

test('meg et ses variantes lancent les 1 à 100 ms d’écart en simultané', () => {
  for (const code of ['meg', 'megf', 'mef9']) {
    const avant = VECTEURS.find((v) => v[0] === code)[1];
    const scene = sceneDe(code, avant);
    const tl = compile(scene, { rythme: 'simultane' });
    const lent = compile(scene, { rythme: 'pasAPas' });
    assert.deepEqual(tl.warnings, [], code);
    assert.ok(tl.total < lent.total, `${code} : la vague raccourcit aussi l’étape`);
    const vols = tl.anims.filter((a) => a.id.startsWith('@unite:') && a.prop === 'translate')
      .sort((a, b) => a.delay - b.delay);
    assert.ok(vols.length >= 2, `${code} : plusieurs unités voyagent`);
    for (let i = 1; i < vols.length; i++) {
      assert.ok(Math.abs(vols[i].delay - vols[i - 1].delay - 100) < 0.01,
        `${code} : départ de l’unité ${i + 1}`);
      assert.ok(vols[i].delay < vols[i - 1].delay + vols[i - 1].duration,
        `${code} : le vol suivant commence avant l’arrivée du précédent`);
    }
    const dernier = vols.at(-1);
    const fermetures = tl.anims.filter((a) => a.id.startsWith('@group:') && a.prop === 'opacity'
      && a.keyframes.at(-1).value === 0 && a.delay >= dernier.delay);
    assert.ok(fermetures.some((a) => a.delay >= dernier.delay + dernier.duration
      && a.delay - dernier.delay - dernier.duration < 500),
    `${code} : l’accolade se ferme peu après la dernière arrivée`);
  }

  const avant = nums([8, 2, 2], [[[0, 1]], [[1, 2]], [[2, 3]]]);
  const tl = compile(sceneDe('meg', avant), { rythme: 'simultane' });
  const vols = tl.anims.filter((a) => a.id.startsWith('@unite:') && a.prop === 'translate')
    .sort((a, b) => a.delay - b.delay);
  const t = vols[1].delay + vols[1].duration * 0.25;
  const valeur = (id) => {
    const d = tl.discrete.find((x) => x.id === id && x.channel === 'text');
    return d.render((t - d.at) / d.dur);
  };
  assert.equal(valeur('t0'), '6', 'deux unités déjà parties du donneur');
  assert.equal(valeur('t1'), '2', 'la première unité n’est pas encore arrivée');
  assert.equal(valeur('t2'), '2', 'la seconde unité n’est pas encore arrivée');
  for (const id of ['t0', 't1', 't2']) {
    const d = tl.discrete.find((x) => x.id === id && x.channel === 'text');
    assert.equal(d.render(1), '4', `${id} rejoint bien la valeur commune`);
  }
});
