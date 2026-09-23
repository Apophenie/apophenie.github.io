import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerCatalogue, creerMoteur, lire } from '../index.js';
import { etat, appliquerOp } from '../bfs.js';
import { prefererJustifications } from '../justifications.js';
import { formeReglee, familleDeReglages } from '../assemblage.js';

const catalogue = await chargerCatalogue();
const parCode = new Map(catalogue.map((o) => [o.code, o]));
function chemin(texte, code) {
  const avant = etat('STR', texte, [[0, texte.length]]);
  const op = parCode.get(code);
  return { ops: [op], etats: [avant, appliquerOp(op, avant)], cout: op.cout };
}

test('la preuve remplace le jumeau sans changer les états ni consommer la saisie', () => {
  const brut = chemin('Louis Fouché', 'fr22');
  const prouve = prefererJustifications(brut, catalogue);
  assert.equal(prouve.ops[0].code, 'fj22~c');
  assert.equal(brut.ops[0].code, 'fr22', 'le chemin partagé reste intact');
  assert.equal(prouve.etats, brut.etats);
  assert.deepEqual(appliquerOp(prouve.ops[0], brut.etats[0]), brut.etats[1]);
  assert.equal(prouve.etats[0].valeur, 'Louis Fouché');
});

test('un décalage sans preuve et un catalogue sans justifications ne sont pas promus', () => {
  for (const [texte, code] of [['a', 'fr25'], ['Ω', 'fr22']]) {
    const brut = chemin(texte, code);
    assert.equal(prefererJustifications(brut, catalogue), brut);
  }
  const brut = chemin('Louis Fouché', 'fr22');
  assert.equal(prefererJustifications(brut, catalogue.filter((o) => !o.justifie)), brut);
});

test('la preuve reste un réglage du même outil sans prendre une seconde place dans sa famille', () => {
  const brut = chemin('Louis Fouché', 'fr22');
  const prouve = prefererJustifications(brut, catalogue);
  assert.equal(familleDeReglages(brut.ops[0]), familleDeReglages(prouve.ops[0]));
  assert.equal(formeReglee(brut), formeReglee(prouve));
});

test('les liens avec décalage nu ou preuve explicite se rejouent', () => {
  const moteur = creerMoteur(catalogue);
  for (const code of ['fr22', 'fj22~c']) {
    const r = moteur.rejouer(lire(`?sce!${code}+fl+m14$7NFn8xBqb5eNAq3YCY`, { catalogue }));
    assert.equal(r.ok, true, code);
  }
});

test('la recherche compose preuve puis retrait des séparateurs sans perdre les mots avant le compte', async () => {
  const { vecteursDeSix } = await import('../assemblage.js');
  const compte = { travail: 0 };
  const vecteurs = vecteursDeSix('Louis Fouché', catalogue, 3, 1000, undefined, { compteur: compte, miseEnForme: false });
  const justifie = vecteurs.find((c) => c.ops.map((o) => o.code).join('+') === 'fj22~c+fl+tca+m14');
  assert.ok(justifie, 'le chemin demandé doit être réellement candidat');
  assert.equal(justifie.etats[0].valeur, 'Louis Fouché');
  assert.equal(justifie.etats[1].valeur, 'Hkqeo Bkqydé');
  assert.ok(justifie.etats.at(-1).valeur.filter((n) => n === 6).length >= 3);
  assert.ok(compte.travail > 0);
});
