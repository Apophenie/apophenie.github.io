/**
 * ★ **LES RETRAITS GRAMMATICAUX S'ENCHAÎNENT — et la remise qui va avec.**
 *
 * > « Je me demande juste si plusieurs filtres grammaticaux peuvent
 * >   s'enchaîner, ou si l'algo de recherche limite les étapes trop fort pour que
 * >   ça ait lieu. » (l'auteur)
 *
 * Ils ne le pouvaient pas. L'étage 1 de `vecteursDeSix` appliquait « la saisie
 * nue, puis UN filtre », et `fart+fprp+tm+mlm` — `[6 6 6]` en quatre gestes sur
 * « Le jardin sur le rocher de la maison » — n'était fabriqué nulle part. La
 * remise de classe (`score.js › longueurRendue`) avait été livrée la veille, et
 * elle était lettre morte : aucune voie trouvée ne portait deux de ces filtres.
 *
 * Ce fichier existe pour que ça ne se reperde pas en silence. Il reste en
 * ROUTINE : `vecteursDeSix` déroule une forme fermée, ce n'est pas une recherche
 * complète.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { vecteursDeSix } from '../assemblage.js';
import { operateursExplorables } from '../bfs.js';
import { longueurRendue } from '../score.js';
import { CATALOGUE, PAR_CODE } from '../../moteur/catalogue.js';

const OPS = operateursExplorables(CATALOGUE);
const REGISTRE = ['fart', 'fprp', 'fcnj', 'faux']; // l'ordre de déclaration des quatre classes
const codesDe = (c) => c.ops.map((o) => o.code);
const grammaticaux = (codes) => codes.filter((c) => REGISTRE.includes(c));

test('★ la voie à deux retraits grammaticaux est FABRIQUÉE', () => {
  const v = vecteursDeSix('Le jardin sur le rocher de la maison', OPS, 3, 16, '666');
  const programmes = v.map((c) => codesDe(c).join('+'));
  assert.ok(programmes.includes('fart+fprp+tm+mlm'),
    `sans articles ni préposition, il reste « jardin rocher maison » — 6 6 6. Fabriqués : ${programmes.join('  ')}`);
});

/**
 * ⚠️ **L'ORDRE DU REGISTRE, ET RIEN QUE LUI.** Les quatre classes commutent :
 *   `fart+fprp` et `fprp+fart` écartent les mêmes mots. On ne déroule donc que
 *   les suites CROISSANTES — une par combinaison, jamais ses permutations —, ce
 *   qui garde l'énumération déterministe (§4.4) et en borne le coût.
 */
/* ⚠️ **CE QUI EST TENU, C'EST « JAMAIS PERMUTÉS » — PAS L'ORDRE DU REGISTRE EN
     SORTIE.** L'énumération déroule bien les suites croissantes du registre ;
     mais les vecteurs rescapés sont ensuite CANONICALISÉS (`assemblage.js ›
     reordonnerCommutants`, N2), qui range tout bloc commutant dans l'ordre de
     l'URL (`bfs.js › codeAvant`) — alphabétique : `faux` avant `fcnj`. Tant
     qu'aucun rescapé ne portait `fcnj` avec `faux` ou `fprp`, les deux ordres
     coïncidaient et le test lisait l'ordre du registre ; `mas`, qui code les
     espaces et les chiffres de cette phrase, en a fait survivre
     (`fart+faux+fcnj+tca+mas+mrn`), et l'écart est apparu. La promesse de
     l'énumération — une suite par combinaison, jamais ses permutations — se
     vérifie donc sur les COMBINAISONS : deux vecteurs qui ne diffèrent que par
     l'ordre de leurs retraits seraient une permutation fabriquée deux fois. */
test('les retraits ne s’enchaînent qu’une fois par combinaison, jamais permutés', () => {
  const v = vecteursDeSix('Le 6 est sur le mur et il rit', OPS, 1, 400, '666', { miseEnForme: false });
  const vus = new Map();
  for (const c of v) {
    const codes = codesDe(c);
    const g = grammaticaux(codes);
    assert.equal(new Set(g).size, g.length, `${codes.join('+')} : un retrait répété`);
    const cle = `${[...g].sort().join('+')} | ${codes.filter((x) => !REGISTRE.includes(x)).join('+')}`;
    assert.ok(!vus.has(cle), `${codes.join('+')} et ${vus.get(cle)} : la même combinaison, permutée`);
    vus.set(cle, codes.join('+'));
  }
});

test('une saisie sans mot outil ne paie rien de cette extension', () => {
  for (const s of ['Donald Trump', 'Capitalisme', 'hope-hope-hope.fr']) {
    const v = vecteursDeSix(s, OPS, 1, 400, '666', { miseEnForme: false });
    const empiles = v.filter((c) => grammaticaux(codesDe(c)).length >= 2);
    assert.equal(empiles.length, 0, `« ${s} » : rien à écarter, donc rien à empiler`);
  }
});

/**
 * > « Le coût des filtres de même classe devrait être divisé par 2 puis 4. »
 * >   (l'auteur)
 *
 * ⚠️ Diviser par une puissance de deux est EXACT en IEEE 754 : c'est la seule
 *   raison pour laquelle ce calcul a le droit d'être flottant.
 */
test('★ la remise de classe : 1, puis 1,5, puis 1,75 — et rien pour les autres filtres', () => {
  const L = (codes) => longueurRendue([{ ops: codes.map((c) => PAR_CODE.get(c)) }]);
  assert.equal(L(['fart']), 1);
  assert.equal(L(['fart', 'fprp']), 1.5, 'le second retrait coûte moitié');
  assert.equal(L(['fart', 'fprp', 'fcnj']), 1.75, 'le troisième, un quart');
  assert.equal(L(['fart', 'fprp', 'tm', 'mlm']), 3.5, 'et ce qui n\'est pas de la classe paie plein tarif');
  assert.equal(L(['fl', 'fv']), 2, 'deux filtres ordinaires ne se font aucune remise');
});
