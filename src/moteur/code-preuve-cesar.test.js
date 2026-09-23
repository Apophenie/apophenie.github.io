import test from 'node:test';
import assert from 'node:assert/strict';
import { lirePreuveCesar, codePreuveCesar } from './code-preuve-cesar.js';
import { CATALOGUE, PAR_CODE, appliquer } from './catalogue.js';
import { str } from './etat.js';
import { resoudreCode } from './transformations/positionnel.js';
import { preuvesNumeriques } from './transformations/preuves-cesar.js';
import { lire, ecrire, descripteursDe, retouchesDe } from '../recherche/url.js';
import { creerMoteur, titreCourtDuCode } from '../recherche/index.js';
import { encoderTexte } from '../recherche/base58.js';
import { compile } from '../visuel/compile.js';
import { setGlyphes } from '../visuel/glyphes.js';
import { GLYPHES } from '../visuel/fixtures/glyphes.js';
setGlyphes(GLYPHES);

test('preuve compacte : portée, découpe et premier résultat implicites', () => {
  for (const [long, court] of [
    ['fj4~0.1~tca.ma1~0', 'fj4~0~ma1'], ['fj5~nl~0', 'fj5~nl'],
    ['fj6~0.6~tm.mlm.cp', 'fj6~0.6~tm.mlm.cp'], ['fj22~c', 'fj22~c'],
    ['fj2~tca.ma1~1', 'fj2~ma1~1'],
  ]) {
    assert.equal(lirePreuveCesar(long).ecrit, court);
    const url = ecrire({ saisie: 'Didier Raoult', fragments: [{ codes: [long] }] });
    assert.equal(lire(url, { catalogue: CATALOGUE }).fragments[0].codes[0], court);
  }
  for (const c of ['fj4', 'fj0~nl', 'fj26~nl', 'fj4~0.0~ma1', 'fj4~~ma1', 'fj4~nl~-1', 'fj4~0~ma1~1~2']) {
    assert.equal(lirePreuveCesar(c), null, c);
    assert.notEqual(lire(`?${c}$Didier Raoult`).forme, 'canonique', c);
  }
  assert.throws(() => ecrire({ saisie: 'Didier', fragments: [{ codes: ['fj4'] }] }), /preuve explicite/);
});

test('preuve explicite : vérification stricte, pas de recherche de remplacement', () => {
  for (const [code, texte, accepte] of [
    ['fj4~0~ma1', 'Didier Raoult', true], ['fj5~nl', 'Louis', true],
    ['fj6~0.6~tm.mlm.cp', 'un mot', true], ['fj22~c', 'Louis Fouché', true],
    ['fj2~ma1~1', 'AB', true], ['fj4~1~ma1', '😀D', true],
    ['fj4~0~ma1', 'Louis', false], ['fj5~nv', 'Louis', false],
    ['fj5~nl.tca', 'Louis', false],
    ['fj4~100~ma1', 'Didier', false], ['fj4~ma1~100', 'Didier', false],
    ['fj4~inconnu', 'Didier', false], ['fj4~ma1.mrdE', 'Didier', false],
  ]) {
    const table = new Map(CATALOGUE.map((op) => [op.code, /^fj\d+$/.test(op.code)
      ? { ...op, justifie() { throw new Error('Recherche interdite au rejeu'); }, apply() { throw new Error('Recherche interdite'); } } : op]));
    const op = resoudreCode(table, code).op;
    assert.equal(appliquer(op, str(texte)) !== null, accepte, `${code} sur ${texte}`);
    if (accepte) {
      const avant = str(texte), apres = appliquer(op, avant);
      const ids = [...texte].map((_, i) => `t${i}`);
      const steps = op.steps(avant, apres, { ids, cle: 'preuve', langue: 'fr' });
      assert.doesNotThrow(() => compile({ version: 1, tokens: [...texte].map((text, i) => ({ id: ids[i], text })), steps }));
      assert.ok(titreCourtDuCode(code, CATALOGUE));
    }
  }
});

test('les recettes émises conservent le résultat de chaque lecture numérique', () => {
  for (const texte of ['Louis Fouché', 'xy ab cdefghi z', 'Sept']) {
    for (const preuve of preuvesNumeriques(texte)) {
      const code = codePreuveCesar(`fj${preuve.decalage}`, preuve);
      const op = resoudreCode(PAR_CODE, code).op;
      assert.equal(op.justifie(texte)?.decalage, preuve.decalage, code);
    }
  }
});

test('finalisation de recherche : fragments et retouches portent leur preuve', () => {
  const op = PAR_CODE.get('fj4'), avant = str('Didier');
  const chemin = { ops: [op], etats: [avant, appliquer(op, avant)] };
  const fragment = { texte: 'Didier', offset: 0, longueur: 6, famille: 'entier' };
  const approche = { parts: [{ fragment, chemin }], retouches: [{ fragment, chemin }] };
  for (const desc of [descripteursDe(approche), retouchesDe(approche)]) assert.match(desc[0].codes[0], /^fj4~/);
  assert.equal(op.code, 'fj4', 'le catalogue partagé reste intact');
});

test('rejeu complet : preuve explicite, répétitions et retouches sans sélection implicite', () => {
  const table = CATALOGUE.map((op) => /^fj\d+$/.test(op.code)
    ? { ...op, justifie() { throw new Error('Recherche interdite'); } } : op);
  const moteur = creerMoteur(table);
  for (const programme of ['fj4~0~ma1', 'fj4~0~ma1;fl+ma1', '0+2+4:fj4~0~ma1']) {
    const lecture = lire(`?${programme}$${encoderTexte('D D D')}`, { catalogue: table });
    const r = moteur.rejouerExemple(lecture);
    assert.ok(r.ok, `${programme}: ${r.raison}`);
    assert.doesNotThrow(() => compile(moteur.scenarioDe(r.approche)));
  }
});
