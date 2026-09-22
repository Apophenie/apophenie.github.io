import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE, appliquer } from './catalogue.js';
import { str } from './etat.js';
import { preuvesNumeriques, etapesPreuveNumerique } from './transformations/preuves-cesar.js';
import { compile } from '../visuel/compile.js';
import { creerMoteur, lire, ecrire } from '../recherche/index.js';

import { setGlyphes } from '../visuel/glyphes.js';
import { GLYPHES } from './tables/glyphes.js';
setGlyphes(GLYPHES);

const parCode = new Map(CATALOGUE.map((o) => [o.code, o]));

test('les 25 Césars prouvent leur décalage et conservent le calcul du César historique', () => {
  for (let n = 1; n <= 25; n++) {
    const texte = String.fromCharCode(64 + n), a = str(texte);
    const op = parCode.get(`fj${n}`);
    assert.equal(op.justifie(texte).decalage, n);
    assert.deepEqual(appliquer(op, a), appliquer(parCode.get(`fr${n}`), a));
    const ids = ['source'];
    const steps = op.steps(a, appliquer(op, a), { ids, cle: `preuve${n}`, langue: 'fr' });
    assert.doesNotThrow(() => compile({ version: 1, tokens: [{ id: 'source', text: texte }], steps }));
  }
});

test('les preuves proviennent des mesures et de plusieurs familles de conversion du catalogue', () => {
  const preuves = preuvesNumeriques('Louis');
  for (const code of ['nl', 'nv', 'nc', 'ma1', 'mz26', 'mpy', 'mt9', 'm14', 'mtrc', 'mqwc', 'mlm', 'cs', 'cp', 'cmo', 'cnj', 'cnjd']) {
    assert.ok(preuves.some((p) => p.ops.some((o) => o.code === code)), code);
  }
  const premier = preuvesNumeriques('Louis Fouché').find((p) => p.decalage === 12 && p.ops.at(-1).code === 'ma1' && p.indice === 0);
  assert.ok(premier, 'le rang de la première lettre est une preuve disponible');
  assert.equal(premier.ops.at(-1).code, 'ma1');
  assert.equal(premier.indice, 0);
  assert.equal(parCode.get('fj5').justifie('Louis').ops[0].code, 'nl');
  assert.equal(parCode.get('fj25').justifie('a'), null);
  assert.equal(parCode.get('fj22').justifie('Louis Fouché').communs.join(''), 'OU');
});

test('chaque technique découverte peut montrer sa preuve, sans modifier les sources', () => {
  const vus = new Set();
  for (const texte of ['Abcde', 'Louis Fouché', 'Y', '123 Abc', 'Bonjour monde']) {
    for (const p of preuvesNumeriques(texte)) {
      const signature = p.ops.map((o) => o.code).join('+');
      if (vus.has(signature)) continue;
      vus.add(signature);
      const ids = [...texte].map((_, i) => `source${i}`);
      const steps = etapesPreuveNumerique(p, str(texte), { ids, cle: 'preuve', langue: 'fr' });
      const resultat = compile({ version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })), steps });
      for (const id of ids) {
        const source = resultat.nodes.find((node) => node.id === id);
        assert.equal(source.alive, true, `${signature} conserve ${id}`);
        assert.equal(source.inFlow, true, `${signature} laisse ${id} dans le texte`);
      }
      const actions = JSON.stringify(steps);
      assert.ok(actions.includes('copie'), signature);
    }
  }
  assert.ok(vus.size >= 35, `${vus.size} techniques`);
});

test('le rejeu des 25 nouveaux liens produit des scènes sans repli générique', () => {
  const moteur = creerMoteur(CATALOGUE);
  for (let n = 1; n <= 25; n++) {
    const saisie = String.fromCharCode(64 + n);
    const lecture = lire(ecrire({ saisie, fragments: [{ codes: [`fj${n}`] }] }));
    const r = moteur.rejouerExemple(lecture);
    assert.ok(r.ok, `${n}: ${r.raison}`);
    const scenario = moteur.scenarioDe(r.approche);
    assert.ok(scenario.steps.length > 1);
    assert.doesNotThrow(() => compile(scenario));
    assert.equal(scenario.warnings?.length || 0, 0);
  }
});

test('le César préfère l’initiale à une conversion complète ou à un comptage moins direct', () => {
  const preuves = preuvesNumeriques('Louis Fouché').filter((p) => p.decalage === 12);
  assert.ok(preuves.some((p) => p.lecture === 'complete'));
  const p = parCode.get('fj12').justifie('Louis Fouché');
  assert.equal(p.lecture, 'initiale');
  assert.equal(p.etats[0].valeur, 'L');
  assert.deepEqual(p.ops.map((o) => o.code), ['tca', 'ma1']);
});

test('sept et quatorze segments sur l’initiale ne convertissent qu’un caractère', () => {
  const texte = '✨  Abeille';
  for (const code of ['m7', 'm14']) {
    const p = preuvesNumeriques(texte).find((p) => p.lecture === 'initiale' && p.ops.at(-1).code === code);
    assert.ok(p, code);
    assert.deepEqual(p.sourceIndices, [3]);
    assert.deepEqual(p.etats[1].valeur, ['A']);
    const ids = [...texte].map((_, i) => `source${i}`);
    const steps = etapesPreuveNumerique(p, str(texte), { ids, cle: code, langue: 'fr' });
    const copie = steps[0].ops.find((o) => o.op === 'atelier');
    assert.deepEqual(copie.tokens.map((t) => t.text), ['A']);
    assert.deepEqual(steps[0].ops[0].targets, ['source3']);
    const rendu = compile({ version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })), steps });
    assert.ok(ids.every((id) => rendu.nodes.find((n) => n.id === id).alive));
  }
});

test('les longueurs de mots voisins se multiplient ou se soustraient avant les conversions exhaustives', () => {
  for (const [texte, decalage, code, extrait] of [
    ['xy ab cdefghi z', 14, 'cp', 'ab cdefghi'],
    ['abcdefghijklm pqrs tu', 9, 'cst', 'abcdefghijklm pqrs'],
  ]) {
    const p = parCode.get(`fj${decalage}`).justifie(texte);
    assert.equal(p.lecture, 'mots-voisins');
    assert.equal(p.ops.at(-1).code, code);
    assert.equal(p.etats[0].valeur, extrait);
    assert.equal(p.etats.at(-1).valeur, decalage);
    const ids = [...texte].map((_, i) => `source${i}`);
    const rendu = compile({ version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })),
      steps: etapesPreuveNumerique(p, str(texte), { ids, cle: code, langue: 'fr' }) });
    assert.ok(ids.every((id) => rendu.nodes.find((n) => n.id === id).alive));
  }
  const repli = parCode.get('fj25').justifie('Sept');
  assert.equal(repli.lecture, 'complete', 'les preuves complexes restent un repli disponible');
  assert.ok(repli.classe > parCode.get('fj14').justifie('xy ab cdefghi z').classe);
});

test('les copies descendent sans déplacer les originaux et le nombre devient le titre du César', async () => {
  const { lecteur } = await import('../visuel/tests/_lecteur.js');
  for (const [texte, code] of [['Sept', 'fj19'], ['Louis', 'fj5'], ['Louis Fouché', 'fj22'], ['xy ab cdefghi z', 'fj14']]) {
    const op = parCode.get(code), a = str(texte);
    const ids = [...texte].map((_, i) => `source${i}`);
    const steps = op.steps(a, appliquer(op, a), { ids, cle: code, langue: 'fr' });
    const ouverture = steps[0].ops.find((o) => o.action === 'ouvrir');
    const fin = steps.find((s) => s.ops.some((o) => o.action === 'conclure'));
    const resultat = fin.ops[0].target;
    const tables = steps.flatMap((s) => s.ops).filter((o) => o.preuve);
    assert.ok(tables.length > 0);
    assert.ok(tables.every((o) => o.preuve === resultat));
    for (const options of [{ rythme: 'pasAPas' }, { rythme: 'simultane' }, { reduced: true }]) {
      const tl = compile({ version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })), steps }, options);
      const lire = lecteur(tl);
      const finCopie = tl.steps[0].t1 - tl.steps[0].hold;
      ouverture.tokens.forEach((copie, i) => {
        const source = ouverture.targets[i];
        const origine = tl.nodes.find((n) => n.id === source).base.translate;
        assert.deepEqual(tl.nodes.find((n) => n.id === copie.id).base.translate, origine);
        assert.ok(lire.valeur(copie.id, 'translate', finCopie).y > origine.y + 50);
      });
      const finCalcul = tl.steps.find((s) => s.id === fin.id).t1;
      for (const id of ids) {
        const origine = tl.nodes.find((n) => n.id === id).base.translate;
        for (let t = 0; t < finCalcul; t += Math.max(1, finCalcul / 40)) {
          assert.deepEqual(lire.valeur(id, 'translate', t), origine, `${code}: original immobile`);
        }
      }
      assert.equal(tl.nodes.find((n) => n.id === resultat).text, code.slice(2));
      assert.ok(lire.valeur(resultat, 'opacity', finCalcul) > 0.9);
      const nom = tl.nodes.find((n) => n.text === 'César');
      assert.ok(nom);
      assert.ok(lire.valeur(nom.id, 'opacity', finCalcul) < 0.01, 'le nom paraît avec la table');
      assert.equal(lire.valeur(resultat, 'opacity', tl.total), 0);
      assert.equal(lire.valeur(nom.id, 'opacity', tl.total), 0);
      assert.ok(!tl.nodes.some((n) => /justifi/i.test(n.text || '')));
    }
  }
});
