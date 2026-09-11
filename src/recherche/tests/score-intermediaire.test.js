/**
 * ★ **LA RÉSERVE DE QUALITÉ PILOTÉE PAR LES CURSEURS — ce qui se vérifie sans
 *   lancer de recherche.**
 *
 * > « Idéalement, c'est les curseurs qui priorisent quelles voies méritent
 * >   d'être finalisées, donc il faudrait inclure du score intermédiaire pondéré
 * >   pour arbitrer ça. […] Le nombre de sièges en cours de recherche devrait
 * >   donc être dynamique en fonction des critères de recherche. » (l'auteur)
 *
 * Ce fichier reste en ROUTINE : il tient les fonctions de
 * `score-intermediaire.js` et la sortie de `vecteursDeSix`, qui déroule une
 * forme fermée. Le chemin RÉEL — une recherche qui trouve ou ne trouve pas la
 * voie — est tenu par `lents/sieges.test.js` : une vérification qui porterait
 * seulement ici porterait à côté.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { vecteursDeSix } from '../assemblage.js';
import { operateursExplorables } from '../bfs.js';
import { CURSEURS_DEFAUT, normaliserCurseurs } from '../score.js';
import {
  axesIntermediaires, noteDeQualite, partDesSieges, siegeDeQualite, reserveDeQualite, apresPerte,
} from '../score-intermediaire.js';
import { CATALOGUE } from '../../moteur/catalogue.js';

const OPS = operateursExplorables(CATALOGUE);
const JARDIN = 'Le jardin sur le rocher de la maison';
const codesDe = (c) => c.ops.map((o) => o.code).join('+');
const cu = (x) => normaliserCurseurs(x);

// ══════════════════════════════════ le partage des sièges

test('★ sièges — au défaut, un sur quatre, le quatrième : l’entrelacement d’avant, siège pour siège', () => {
  const part = partDesSieges(cu(CURSEURS_DEFAUT));
  for (let k = 1; k <= 64; k++) {
    assert.equal(siegeDeQualite(k, part), k % 4 === 0, `siège ${k}`);
  }
  for (const plafond of [2, 4, 8, 16, 20, 40]) {
    assert.equal(reserveDeQualite(plafond, part), Math.max(1, Math.floor(plafond / 4)), `plafond ${plafond}`);
  }
});

test('sièges — la part de la réserve suit les curseurs, et seulement leur PROPORTION', () => {
  const partDe = (x) => { const p = partDesSieges(cu(x)); return p.num / p.den; };
  assert.equal(partDe({ simplicite: 200, exhaustivite: 200, quantite: 200, coherence: 200 }), partDe({}),
    'quatre curseurs à 200 disent la même chose que quatre à 100');
  assert.ok(partDe({ simplicite: 200 }) > partDe({}), 'lever un curseur de qualité élargit la réserve');
  assert.ok(partDe({ quantite: 200 }) < partDe({}), 'lever la quantité la rétrécit');
  assert.equal(partDe({ quantite: 0 }), 1, 'quantité à zéro : tout à la réserve');
  const sansQualite = partesDe0();
  assert.equal(sansQualite.num, 0, 'les trois autres à zéro : rien à la réserve');
  assert.equal(reserveDeQualite(16, sansQualite), 0);
  assert.deepEqual(partDesSieges(cu({ simplicite: 0, exhaustivite: 0, quantite: 0, coherence: 0 })),
    partDesSieges(cu({})), 'les quatre à zéro ne disent rien : le partage du défaut, et il est dit');
});
function partesDe0() {
  return partDesSieges(cu({ simplicite: 0, exhaustivite: 0, coherence: 0 }));
}

test('sièges — tout préfixe tient sa part : l’assemblage n’en garde que la première moitié', () => {
  for (const x of [{}, { simplicite: 200 }, { quantite: 200 }, { quantite: 0 }, { coherence: 37, quantite: 151 }]) {
    const part = partDesSieges(cu(x));
    let pris = 0;
    for (let k = 1; k <= 50; k++) {
      if (siegeDeQualite(k, part)) pris++;
      assert.equal(pris, Math.floor((k * part.num) / part.den), `${JSON.stringify(x)}, préfixe ${k}`);
    }
  }
});

test('sièges — des positions non normalisées échouent bruyamment', () => {
  assert.throws(() => partDesSieges({ simplicite: 1.5, exhaustivite: 100, quantite: 100, coherence: 100 }));
  assert.throws(() => partDesSieges({ simplicite: -1, exhaustivite: 100, quantite: 100, coherence: 100 }));
});

// ══════════════════════════════════ la note

const vecteurs = (curseurs) => vecteursDeSix(JARDIN, OPS, 3, 16, '666', curseurs ? { curseurs } : {});
const cheminDe = (codes) => {
  const c = vecteursDeSix(JARDIN, OPS, 3, 400, '666').find((x) => codesDe(x) === codes);
  assert.ok(c, `${codes} doit être fabriqué`);
  return c;
};

/**
 * ⚠️ **UNE SUPPRESSION ÉLÉGANTE RESTE UNE SUPPRESSION** — « et réduit
 *   l'exhaustivité » (l'auteur). Les articles et la préposition sont écartés
 *   par une règle nommée : ils ne sont pas lus pour autant.
 */
test('★ note — les caractères écartés par une règle ne sont PAS lus, et ce sont des caractères, pas des jetons', () => {
  const ax = axesIntermediaires(cheminDe('fart+fprp+tm+mlm'), JARDIN, '666');
  // « jardin rocher maison » : 18 lettres lues sur 29, soit une perte de 380 ‰ ;
  // le vecteur [6 6 6] est gardé tout entier, rendement plein.
  const lecture = apresPerte(1000 - Math.floor((18 * 1000) / 29));
  assert.ok(lecture < 1000, 'la perte se paie');
  assert.equal(ax.exhaustivite, Math.floor((400 * lecture + 400 * 1000) / 800));
  // En JETONS, elle aurait lu 3 sur 29 : la perte serait de 897 ‰.
  assert.ok(ax.exhaustivite > Math.floor((400 * apresPerte(897) + 400 * 1000) / 800),
    'la lecture se compte en caractères signifiants');
  // …et la voie qui lit tout n'est pas punie de ce qu'elle lit.
  assert.equal(axesIntermediaires(cheminDe('fl+tca+msen+mrdE'), JARDIN, '666').exhaustivite, 1000);
});

test('note — entière, et pondérée par les trois curseurs qui nomment ses axes, rien d’autre', () => {
  const ax = { simplicite: 880, exhaustivite: 769, coherence: 827 };
  assert.equal(noteDeQualite(ax, cu({})), Math.floor((880 + 769 + 827) / 3));
  assert.equal(noteDeQualite(ax, cu({ simplicite: 200 })), Math.floor((2 * 880 + 769 + 827) / 4));
  assert.equal(noteDeQualite(ax, cu({ quantite: 0 })), noteDeQualite(ax, cu({ quantite: 200 })),
    'la quantité a sa file : elle ne pèse pas sur la note');
  assert.equal(noteDeQualite(ax, cu({ simplicite: 0, exhaustivite: 0, coherence: 0 })), 0);
});

// ══════════════════════════════════ la réserve, dans `vecteursDeSix`

test('★ réserve — au défaut, les curseurs ne changent rien : le pré-tri historique, au bit près', () => {
  const trace = (v) => v.map(codesDe).join(' ');
  assert.equal(trace(vecteurs(CURSEURS_DEFAUT)), trace(vecteurs()),
    'des curseurs explicitement au défaut rendent la sortie sans curseurs');
});

test('★ réserve — simplicité à 200 : les voies courtes sont finalisées en priorité', () => {
  const garde = vecteurs({ simplicite: 200 }).slice(0, 8).map(codesDe);
  assert.ok(garde.includes('tm+mlm'), `deux gestes, la longueur des mots : ${garde.join('  ')}`);
  assert.ok(!vecteurs().slice(0, 8).map(codesDe).includes('tm+mlm'), 'au défaut, le pré-tri ne la gardait pas');
});

test('★ réserve — exhaustivité et cohérence à 150 : la voie grammaticale est finalisée', () => {
  const garde = vecteurs({ exhaustivite: 150, coherence: 150 }).slice(0, 8).map(codesDe);
  assert.ok(garde.includes('fart+fprp+tm+mlm'), `rendement plein, aucune bidouille : ${garde.join('  ')}`);
});

/**
 * « Une approche addition uniquement, EN PLUS de `mab`, pas à la place »
 * (l'auteur). Le second élu chassait le premier de la moitié gardée ; quand les
 * curseurs pilotent la réserve, il ne chasse plus qu'un siège de quantité.
 * (Au défaut, le comportement historique est gardé : voir `vecteursDeSix`.)
 */
test('★ élus — curseurs personnalisés : les deux voies sans perte sont gardées ensemble', () => {
  for (const x of [{ simplicite: 200 }, { exhaustivite: 200 }, { coherence: 150 }]) {
    const garde = vecteurs(x).slice(0, 8).map(codesDe);
    assert.ok(garde.includes('tm+mlm+mab'), `${JSON.stringify(x ?? {})} : ${garde.join('  ')}`);
    assert.ok(garde.includes('fl+tca+msen+mrdE'), `${JSON.stringify(x ?? {})} : ${garde.join('  ')}`);
  }
});
