/**
 * ★ **LA RECHERCHE TROUVE « JAMES BOND » → 007 — par une vraie recherche.**
 *
 * > « Un exemple que je trouverais magistral : "James Bond" : James converti en
 * >   un nombre qui, divisé par le nombre issu de Bond, donne pile 007. »
 * >   (l'auteur)
 *
 * Ce fichier est dans `lents/` parce qu'il lance de VRAIES recherches — une
 * table de valeurs coûte une à deux secondes par mot à froid
 * (`assemblage.js › liaisons`). Le chemin sans recherche — lien, rejeu, scène —
 * est tenu, lui, par `tests/liaison.test.js`, qui tourne à chaque `npm test`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { lire } from '../../url.js';
import { catalogue } from '../_catalogue.js';

const moteur = creerMoteur(catalogue);

test('★ « James Bond » visant 007 : la voie de l’auteur est trouvée, et se rejoue telle quelle', () => {
  const res = moteur.resoudre('James Bond', { cible: '007' });
  const liees = res.approches.filter((a) => a.mode === 'OPERATION');
  assert.ok(liees.length > 0, `aucune voie à liaison : ${res.approches.map((a) => a.codes).join(' | ')}`);
  const auteur = liees.find((a) => a.codes === '=mdl0!fr21+tca+mx6+cali,fr21+tca+mx6+cali');
  assert.ok(auteur, `la voie de l’auteur manque : ${liees.map((a) => a.codes).join(' | ')}`);
  assert.equal(auteur.liaison.code, 'mdl0');
  assert.deepEqual(auteur.parts.map((p) => p.chemin.valeur), [126, 18]);
  // le lien de la liste rejoue la même voie, au même score (§4.3)
  for (const a of liees) {
    const r = moteur.rejouer(lire(a.url));
    assert.ok(r.ok, `${a.codes} : ${r.raison}`);
    assert.equal(r.approche.codes, a.codes);
    assert.equal(r.approche.score, a.score, `${a.codes} : score rejoué différent`);
  }
  // et la scène joue la potence de 126 ÷ 18, sans avertissement
  const sc = moteur.scenarioDe(auteur, { saisie: 'James Bond' });
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  const pot = sc.steps.flatMap((s) => s.ops || []).find((o) => o.op === 'potence');
  assert.ok(pot, 'la potence est jouée');
  assert.deepEqual(pot.to.map((t) => t.text), ['0', '0', '7']);
});

/**
 * ⚠️ **LA BORNE DE COÛT.** Une table de valeurs se paie en secondes : la
 *   liaison ne se cherche que pour une cible chiffrée DEMANDÉE. Le 666 par
 *   défaut, qui est la recherche de tout le monde, n'en paie jamais le prix.
 */
test('la liaison ne se cherche pas pour le 666 par défaut', () => {
  const res = moteur.resoudre('James Bond');
  assert.equal(res.approches.filter((a) => a.mode === 'OPERATION').length, 0);
});
