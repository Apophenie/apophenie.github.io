/** Tests de typographie — `node --test src/app/typo.test.js`.
 *
 *  Le piège que ces tests gardent : le français et l'anglais n'ont PAS les mêmes
 *  règles. Guillemets et espacement de la ponctuation haute changent avec la
 *  langue, et il ne suffit pas de traduire les mots. */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { guillemets, ponctuer, FINE, capitaliser, enLettres, phraseApproches, abreger, badgeT } from './typo.js';
import { definirLangue, langue } from '../i18n/index.js';

test('guillemets : chevrons et fines en français, droits doubles en anglais', () => {
  assert.equal(guillemets('hope', 'fr'), `«${FINE}hope${FINE}»`);
  assert.equal(guillemets('hope', 'en'), '"hope"');
  // aucune espace ORDINAIRE ne se glisse à l'intérieur des chevrons
  assert.ok(!guillemets('hope', 'fr').includes('\u0020'), 'espace ordinaire dans les guillemets');
  assert.equal(FINE, '\u202f');
  // et l'anglais n'hérite jamais de la fine
  assert.ok(!guillemets('hope', 'en').includes(FINE));
});

test('ponctuer pose la fine en français…', () => {
  assert.equal(ponctuer('Résultat : 666', 'fr'), `Résultat${FINE}: 666`);
  assert.equal(ponctuer('Vraiment ?', 'fr'), `Vraiment${FINE}?`);
  assert.equal(ponctuer('Tiens !', 'fr'), `Tiens${FINE}!`);
  assert.equal(ponctuer('un ; deux', 'fr'), `un${FINE}; deux`);
  // idempotent : repasser dessus ne double pas la fine
  assert.equal(ponctuer(ponctuer('Résultat : 666', 'fr'), 'fr'), `Résultat${FINE}: 666`);
});

test('…et la RETIRE en anglais', () => {
  assert.equal(ponctuer('Result : 666', 'en'), 'Result: 666');
  assert.equal(ponctuer(`Result${FINE}: 666`, 'en'), 'Result: 666');
  assert.equal(ponctuer('Really ?', 'en'), 'Really?');
  assert.equal(ponctuer('one ; two', 'en'), 'one; two');
  // ce qui est déjà correct reste intact
  assert.equal(ponctuer('Result: 666', 'en'), 'Result: 666');
});

test('les deux-points d’une URL ne sont pas de la ponctuation haute', () => {
  assert.equal(ponctuer('https://exemple.fr', 'fr'), 'https://exemple.fr');
  assert.equal(ponctuer('https://exemple.fr', 'en'), 'https://exemple.fr');
});

test('capitaliser respecte les accents et ne dépend pas de la locale hôte', () => {
  assert.equal(capitaliser('épreuve'), 'Épreuve');
  assert.equal(capitaliser('une'), 'Une');
  assert.equal(capitaliser(''), '');
});

test('les nombres en toutes lettres suivent la langue', () => {
  definirLangue('fr');
  assert.equal(enLettres(7), 'sept');
  assert.equal(enLettres(1), 'une');          // « une approche », féminin
  assert.equal(enLettres(42), '42');          // hors table : le chiffre
  definirLangue('en');
  assert.equal(enLettres(7), 'seven');
  assert.equal(enLettres(1), 'one');
  definirLangue('fr');
});

test('phraseApproches accorde, dans les deux langues', () => {
  definirLangue('fr');
  assert.equal(phraseApproches(0), 'Aucune voie n’a encore été tracée.');
  assert.equal(phraseApproches(1), 'Une approche mène à 666.');
  assert.equal(phraseApproches(7), 'Sept approches mènent à 666.');
  definirLangue('en');
  assert.equal(phraseApproches(0), 'No path has been traced yet.');
  assert.equal(phraseApproches(1), 'One approach leads to 666.');
  assert.equal(phraseApproches(7), 'Seven approaches lead to 666.');
  definirLangue('fr');
  assert.equal(langue(), 'fr');
});

test('abreger ne coupe pas un mot en deux', () => {
  assert.equal(abreger('court', 72), 'court');
  assert.equal(abreger('a'.repeat(80), 10), 'a'.repeat(9) + '…');
  assert.equal(abreger('un titre assez long pour être tronqué proprement', 20), 'un titre assez…');
});

test('le badge de transformation est de la notation machine, sans langue', () => {
  assert.equal(badgeT(0, 7), 'T-01/07');
  assert.equal(badgeT(11, 12), 'T-12/12');
});
