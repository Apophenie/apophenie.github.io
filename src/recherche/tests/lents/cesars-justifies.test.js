import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerCatalogue, creerMoteur, lire } from '../../index.js';

const catalogue = await chargerCatalogue();

test('Louis Fouché propose les césars justifiés dès le cran 0 et conserve ses voies au cran 3', () => {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const rapide = moteur.resoudre('Louis Fouché', { fouille: 0 });
  const profond = moteur.resoudre('Louis Fouché', { fouille: 3 });
  const programme = (a) => a.url.replace(/!f\d+!/, '!');
  const publies = new Set(profond.approches.map(programme));
  for (const a of rapide.approches) assert.ok(publies.has(programme(a)), a.url);
  for (const resultat of [rapide, profond]) {
    const preuves = resultat.approches.filter((a) => a.url.includes('fj22'));
    assert.ok(preuves.length, `cran ${resultat.fouille}`);
    for (const a of preuves) {
      const prouve = moteur.rejouer(lire(a.url, { catalogue }));
      const arbitraire = moteur.rejouer(lire(a.url.replaceAll('fj22', 'fr22'), { catalogue }));
      assert.equal(prouve.ok, true, a.url);
      assert.equal(arbitraire.ok, true, 'les anciens codes restent rejouables');
      assert.ok(prouve.approche.score > arbitraire.approche.score, 'la preuve améliore la note');
    }
  }
});
