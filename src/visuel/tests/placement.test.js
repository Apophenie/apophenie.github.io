/**
 * ★ **LES AFFICHEURS NE SE SUPERPOSENT JAMAIS, ET NE SORTENT JAMAIS DU CADRE.**
 *
 * Les deux exigences dures de l'auteur, tenues PAR CONSTRUCTION et vérifiées
 * ici sur le solveur seul — avant même de savoir ce qu'on en fait à l'écran.
 * Un solveur juste ne garantit pas un rendu juste, mais un solveur faux
 * garantit un rendu faux, et c'est le moins cher à attraper.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tasser, rangerLesAfficheurs, combienTiennent, ECHELLE_PLANCHER, RESPIRATION,
} from '../placement.js';
import { VIEWBOX, MARGIN, FONT_SIZE, ADVANCE_RATIO } from '../constants.js';
import { CompileError } from '../errors.js';

/** Le cadre : ce que les BORDS ne doivent pas franchir (voir `layout.js`). */
const CADRE = { min: VIEWBOX.x + MARGIN, max: VIEWBOX.x + VIEWBOX.w - MARGIN };
/** L'encombrement nominal d'un afficheur, son compteur compris. */
const COTE = 190;
const spec = () => ({ cote: COTE, marge: RESPIRATION, cadre: CADRE });
/** Le plus grand nombre d'afficheurs qu'on puisse demander d'un coup. */
const VAGUE = combienTiennent(spec());

/** Les abscisses de `n` caractères contigus, centrés — comme le layout les pose. */
function caracteres(n) {
  const av = FONT_SIZE * ADVANCE_RATIO;
  const x0 = VIEWBOX.x + VIEWBOX.w / 2 - (n * av) / 2 + av / 2;
  return Array.from({ length: n }, (_, i) => x0 + i * av);
}

/** Une ligne dont les caractères occupent toute la largeur utile. */
function etires(n) {
  if (n === 1) return [VIEWBOX.x + VIEWBOX.w / 2];
  return Array.from({ length: n },
    (_, i) => CADRE.min + (i * (CADRE.max - CADRE.min)) / (n - 1));
}

/* ═══════════════════════════ Le tassement ════════════════════════════════ */

test('★ placement — sans conflit, chacun reste exactement sur son ancre', () => {
  const ancres = [200, 500, 800];
  assert.deepEqual(tasser(ancres, 100, { min: 0, max: 1200 }), ancres);
});

test('★ placement — deux ancres confondues s’écartent symétriquement', () => {
  const x = tasser([600, 600], 100, { min: 0, max: 1200 });
  assert.equal(x[1] - x[0], 100, 'l’écart demandé, exactement');
  assert.equal((x[0] + x[1]) / 2, 600, 'et le milieu ne bouge pas : personne n’est privilégié');
});

test('★ placement — l’ordre de la ligne est conservé, toujours', () => {
  // Des ancres très serrées : l'ordre rendu doit rester celui des entrées, sans
  // quoi l'afficheur du « h » passerait à droite de celui du « o » et
  // désignerait le mauvais caractère.
  for (let n = 2; n <= VAGUE; n++) {
    const { x } = rangerLesAfficheurs(caracteres(n), spec());
    for (let i = 1; i < x.length; i++) {
      assert.ok(x[i] > x[i - 1], `${n} afficheurs : l’ordre est rompu entre ${i - 1} et ${i}`);
    }
  }
});

/* ══════════════════ Les deux exigences dures de l'auteur ═════════════════ */

test('★ placement — deux afficheurs ne se recouvrent JAMAIS', () => {
  let mesures = 0;
  for (let n = 1; n <= VAGUE; n++) {
    for (const ancres of [caracteres(n), etires(n)]) {
      const { x, echelle } = rangerLesAfficheurs(ancres, spec());
      const cote = COTE * echelle;
      for (let i = 1; i < x.length; i++) {
        mesures++;
        const ecart = x[i] - x[i - 1];
        assert.ok(ecart >= cote - 1e-6,
          `${n} afficheurs à l’échelle ${echelle} : ${i - 1} et ${i} se recouvrent `
          + `(écart ${ecart.toFixed(2)} pour un côté de ${cote.toFixed(2)})`);
      }
    }
  }
  assert.ok(mesures > 20, `seulement ${mesures} paires mesurées : le test ne garde rien`);
});

/**
 * ★ **AUCUN NE SORT DE LA ZONE D'AFFICHAGE.** C'est la promesse que `reveal`
 * tient déjà pour le décor du verdict, et elle vaut ici pour la même raison :
 * un afficheur à moitié dehors ne se compte pas, et le spectateur ne sait même
 * pas qu'il lui manque quelque chose.
 */
test('★ placement — aucun afficheur ne sort du cadre', () => {
  for (let n = 1; n <= VAGUE; n++) {
    for (const ancres of [caracteres(n), etires(n)]) {
      const { x, echelle } = rangerLesAfficheurs(ancres, spec());
      const demi = (COTE * echelle) / 2;
      for (const v of x) {
        assert.ok(v - demi >= CADRE.min - 1e-6,
          `${n} afficheurs : un bord gauche à ${(v - demi).toFixed(2)}, hors du cadre utile`);
        assert.ok(v + demi <= CADRE.max + 1e-6,
          `${n} afficheurs : un bord droit à ${(v + demi).toFixed(2)}, hors du cadre utile`);
      }
    }
  }
});

/* ════════════════════════ La dégradation propre ══════════════════════════ */

test('★ placement — un seul afficheur garde sa taille pleine et sa place', () => {
  const { echelle, x } = rangerLesAfficheurs([620], spec());
  assert.equal(echelle, 1, 'rien ne justifie de le réduire');
  assert.equal(x[0], 620, 'et il se pose exactement au-dessus du sien');
});

/**
 * ★ **L'ÉCHELLE NE DESCEND QUE QUAND L'ÉCARTEMENT NE SUFFIT PLUS.** Trois
 * afficheurs de 190 tiennent dans 1056 unités : il n'y a aucune raison de les
 * rapetisser, même si leurs caractères sont collés.
 */
test('★ placement — on écarte d’abord, on ne réduit qu’ensuite', () => {
  assert.equal(rangerLesAfficheurs(caracteres(3), spec()).echelle, 1,
    'trois tiennent à taille pleine : on les écarte, on ne les réduit pas');
  const beaucoup = rangerLesAfficheurs(caracteres(VAGUE), spec());
  assert.ok(beaucoup.echelle < 1, 'une vague pleine ne tient pas à taille pleine');
});

test('★ placement — l’échelle ne descend jamais sous le plancher de lisibilité', () => {
  for (let n = 1; n <= VAGUE; n++) {
    const { echelle } = rangerLesAfficheurs(caracteres(n), spec());
    assert.ok(echelle >= ECHELLE_PLANCHER - 1e-9,
      `${n} afficheurs : échelle ${echelle}, sous le plancher ${ECHELLE_PLANCHER}`);
    assert.ok(echelle <= 1);
  }
});

/**
 * ★ **ON REFUSE L'IMPOSSIBLE, ON NE LE RABOTE PAS.**
 *
 * ⚠️ MESURÉ sur la première version, qui rendait « quelque chose » : douze
 *   afficheurs de 190 unités donnaient un bord gauche à **−14**, hors du
 *   `viewBox`. C'est exactement ce que l'auteur interdit — « plutôt que
 *   déborder ». Un défaut bruyant vaut mieux qu'un rendu silencieusement faux,
 *   et c'est la règle du moteur (CONTRACTS §3).
 */
test('★ placement — demander plus que ce qui tient est une ERREUR, pas un débordement', () => {
  assert.throws(() => rangerLesAfficheurs(caracteres(VAGUE + 1), spec()), CompileError);
  assert.throws(() => rangerLesAfficheurs(caracteres(36), spec()), CompileError);
  // Le message doit dire combien en faire : sans cela, l'appelant ne peut pas
  // se corriger, et une erreur qu'on ne sait pas réparer est un mur.
  try {
    rangerLesAfficheurs(caracteres(VAGUE + 1), spec());
    assert.fail('aurait dû échouer');
  } catch (err) {
    assert.match(err.message, new RegExp(`${VAGUE}`), `le message doit annoncer ${VAGUE}`);
    assert.match(err.message, /vagues/);
  }
});

/**
 * ★ **ET LA TAILLE D'UNE VAGUE TIENT VRAIMENT** — on le vérifie plutôt que de
 * croire la formule. Un de plus déborderait : c'est ce qui en fait un maximum
 * et non un nombre prudent.
 */
test('★ placement — la vague annoncée est la plus grande qui tienne', () => {
  const large = (CADRE.max - CADRE.min) - COTE * ECHELLE_PLANCHER;
  const pas = COTE * ECHELLE_PLANCHER + RESPIRATION;
  assert.ok((VAGUE - 1) * pas <= large + 1e-6,
    `${VAGUE} annoncés, mais ils ne tiennent pas`);
  assert.ok(VAGUE * pas > large, 'et un de plus déborderait');
  // Une vague pleine se range effectivement, sans lever.
  assert.doesNotThrow(() => rangerLesAfficheurs(caracteres(VAGUE), spec()));
});

/**
 * Le cas dégénéré du tassement seul : une zone plus étroite que ce qu'on y
 * range. `tasser` refuse, comme son appelant — il ne rabote pas non plus.
 */
test('★ placement — une zone impossible est refusée, pas rabotée', () => {
  assert.throws(() => tasser([100, 200, 300], 500, { min: 400, max: 500 }), CompileError);
});

/**
 * ⚠️ **DÉTERMINISME (§4.4).** Deux exécutions doivent rendre exactement la même
 *   scène. Un tassement approché « qui a l'air bien » dépendrait de l'ordre où
 *   l'on répare les conflits ; celui-ci ne dépend que de ses entrées.
 */
test('★ placement — deux appels identiques rendent exactement la même chose', () => {
  const a = rangerLesAfficheurs(caracteres(VAGUE), spec());
  const b = rangerLesAfficheurs(caracteres(VAGUE), spec());
  assert.deepEqual(a, b);
  for (const v of a.x) assert.ok(Number.isFinite(v), 'aucune coordonnée non finie');
});
