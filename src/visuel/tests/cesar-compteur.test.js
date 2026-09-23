import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE, appliquer } from '../../moteur/catalogue.js';
import { str } from '../../moteur/etat.js';
import { compile } from '../compile.js';
import { lecteur } from './_lecteur.js';
import { resolveDiscrete } from '../clock.js';

function scenario(n) {
  const text = String.fromCharCode(64 + n), a = str(text);
  const op = CATALOGUE.find((o) => o.code === `fj${n}`);
  return { version: 1, tokens: [{ id: 'source', text }],
    steps: op.steps(a, appliquer(op, a), { ids: ['source'], cle: `fj${n}`, langue: 'fr' }) };
}

test('chaque César compte tous ses crans dans le même sens avant toute conversion', () => {
  for (let n = 1; n <= 25; n++) {
    const tl = compile(scenario(n)), lire = lecteur(tl);
    assert.deepEqual(tl.warnings, [], `César ${n}`);
    const compteur = tl.nodes.find((v) => v.data?.cesarRole === 'compteur');
    const pointeur = tl.nodes.find((v) => v.data?.cesarPointeur);
    const egalite = tl.nodes.find((v) => v.data?.cesarRole === 'egalite');
    const compte = tl.discrete.find((d) => d.id === compteur.id && d.channel === 'text');
    assert.equal(compteur.text, '0');
    assert.equal(egalite.text, '!=');
    assert.equal(tl.anims.filter((a) => a.id === pointeur.id && a.prop === 'rotate').length, n);
    for (let k = 0; k <= n; k++) {
      assert.equal(compte.render(k / n), String(k));
      const texte = resolveDiscrete(tl.discreteIndex, compte.at + compte.dur * k / n).get(`${compteur.id}::text`);
      assert.equal(texte.value, String(k));
    }
    const egal = tl.discrete.find((d) => d.id === egalite.id);
    assert.equal(egal.at, compte.at + compte.dur);
    assert.equal(egal.render(1), '=');
    const vol = tl.anims.find((a) => a.id === 'source' && a.prop === 'translate');
    assert.ok(vol.delay > egal.at + 400, 'égalité, couture et simplification précèdent la conversion');
    const courses = tl.anims.filter((a) => a.id.includes(':bas:') && a.prop === 'translate' && a.delay === compte.at);
    assert.equal(courses.length, 26);
    assert.ok(courses.every((a) => a.keyframes.at(-1).value.x < a.keyframes[0].value.x));
    const hauts = tl.nodes.filter((v) => v.id.includes(':haut:'));
    const p = hauts.map((v) => lire.valeur(v.id, 'translate', compte.at));
    for (let k = 1; k < p.length; k++) assert.ok(Math.abs(p[k].x - p[k - 1].x - hauts[k].w) < 0.1, 'alphabet contigu pendant les crans');
    const pivot = lire.valeur(pointeur.id, 'translate', compte.at);
    const pas = pointeur.data.pas;
    const jointure = (pivot.x - (p[0].x - pas / 2)) / pas;
    assert.ok(Math.abs(jointure - Math.round(jointure)) < 0.001, 'la pointe part sur une jointure');
    const oscillation = tl.anims.find((a) => a.id === pointeur.id && a.prop === 'rotate');
    const contact = oscillation.keyframes[8];
    const radians = contact.value * Math.PI / 180;
    const bordParcouru = pas * contact.offset;
    assert.ok(Math.abs(pointeur.data.longueur * Math.sin(radians) + bordParcouru) < 0.001,
      'la pointe suit le bord de la case pendant la poussée');
    assert.ok(Math.abs(pointeur.data.longueur * Math.cos(radians) - pointeur.data.distanceBord) < 0.001,
      'elle se libère au bord inférieur de la table');
    const fondu = tl.anims.find((a) => a.id === pointeur.id && a.prop === 'opacity' && a.keyframes.at(-1).value === 0);
    const nom = tl.nodes.find((v) => v.data?.cesarRole === 'nom');
    const rangement = tl.anims.find((a) => a.id === nom.id && a.prop === 'translate');
    assert.ok(rangement.delay >= fondu.delay + fondu.duration - 0.001,
      'César attend la disparition complète du pointeur');
    assert.ok(lire.valeur(pointeur.id, 'opacity', rangement.delay) < 0.001);
    assert.ok(lire.valeur(pointeur.id, 'opacity', vol.delay) < 0.01);
    assert.ok(lire.valeur(egalite.id, 'opacity', vol.delay) < 0.01);
    assert.ok(lire.valeur(compteur.id, 'opacity', vol.delay) > 0.9);
    assert.equal(lire.valeur(compteur.id, 'opacity', tl.total), 0);
  }
});

test('le compteur reste déterministe en mouvement réduit et à vitesse doublée', () => {
  for (const options of [{ reduced: true }, { speed: 2 }]) {
    const tl = compile(scenario(24), options);
    if (!options.reduced) assert.deepEqual(tl.warnings, []);
    const c = tl.nodes.find((v) => v.data?.cesarRole === 'compteur');
    const trace = tl.discrete.find((d) => d.id === c.id);
    assert.equal(trace.render(1), '24');
  }
});
