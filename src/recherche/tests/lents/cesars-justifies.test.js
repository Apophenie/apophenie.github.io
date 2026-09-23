import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerCatalogue, creerMoteur, lire } from '../../index.js';

const catalogue = await chargerCatalogue();
const moteur = creerMoteur(catalogue, { filetTemporel: false });
let rapide;
const auCranZero = () => rapide ??= moteur.resoudre('Louis Fouché', { fouille: 0 });

function verifierPreuves(resultat) {
  const preuves = resultat.approches.filter((a) => /fj\d+/.test(a.url));
  assert.ok(preuves.length, `cran ${resultat.fouille}`);
  for (const a of preuves) {
    const prouve = moteur.rejouer(lire(a.url, { catalogue }));
    const arbitraire = moteur.rejouer(lire(a.url.replace(/fj(\d+)(?:~[a-zA-Z0-9.]+)+/g, 'fr$1'), { catalogue }));
    assert.equal(prouve.ok, true, a.url);
    assert.equal(arbitraire.ok, true, 'la même voie sans justification reste rejouable');
    assert.ok(prouve.approche.score >= arbitraire.approche.score, 'la preuve ne dégrade pas la note, y compris pour ROT13');
  }
}

test('Louis Fouché propose des preuves rejouables dès le cran 0', () => {
  verifierPreuves(auCranZero());
});

test('Louis Fouché conserve ses voies et ses preuves au cran 3', () => {
  const profond = moteur.resoudre('Louis Fouché', { fouille: 3 });
  const programme = (a) => a.url.replace(/!f\d+!/, '!');
  const publies = new Set(profond.approches.map(programme));
  for (const a of auCranZero().approches) assert.ok(publies.has(programme(a)), a.url);
  verifierPreuves(profond);
});
