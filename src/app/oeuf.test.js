/**
 * ★ L'ŒUF DE PÂQUES — « cheval sur oiseau = π ».
 *
 * Deux choses se vérifient ici, et elles ne se ressemblent pas :
 *
 *  · **la RECONNAISSANCE**, qui doit être large sur la forme et stricte sur le
 *    fond. Un œuf qui s'ouvrirait sur « le cheval sur l'oiseau » ne serait plus
 *    une surprise, ce serait un piège ;
 *  · **le SCÉNARIO**, qui est écrit à la main et doit passer par le moteur
 *    visuel RÉEL, sans un avertissement. C'est tout l'intérêt de l'avoir écrit
 *    dans le format ordinaire : il subit les mêmes gardes que le reste, et ce
 *    test le prouve plutôt que de l'affirmer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { estOeuf, scenarioDeLOeuf, approcheDeLOeuf } from './oeuf.js';
import { compile } from '../visuel/compile.js';

/* ═════════════════════════ 1. La reconnaissance ══════════════════════════ */

test('★ œuf — toutes les façons de l’écrire, et aucune autre', () => {
  // « Peu importe la casse, la présence d'accent, pi en lettre ou symbole, = en
  //   toutes lettres ou symbole » (l'auteur), plus la barre oblique.
  for (const s of [
    'cheval sur oiseau',
    'CHEVAL SUR OISEAU',
    'Cheval Sur Oiseau',
    'chèval sur oiseau',
    'cheval sur oiseau = pi',
    'cheval sur oiseau = π',
    'cheval sur oiseau égal pi',
    'cheval sur oiseau égale pi',
    'cheval sur oiseau est égal à pi',
    'cheval sur oiseau vaut pi',
    'cheval/oiseau',
    'cheval/oiseau = Pi',
    'CHEVAL / OISEAU = π',
    '  cheval   sur   oiseau  ',
  ]) assert.ok(estOeuf(s), `« ${s} » devrait ouvrir l’œuf`);

  // ★ Et ce qui n'est PAS la phrase ne l'ouvre pas. La liste n'est pas
  //   décorative : chacune de ces saisies est une vraie demande, qui doit
  //   partir en recherche comme n'importe quelle autre.
  for (const s of [
    '', 'cheval', 'oiseau', 'cheval oiseau', 'le cheval sur oiseau',
    'cheval sur un oiseau', 'cheval sur oiseau = 3', 'cheval sur poule',
    'cheval sur oiseau = 666', 'poney sur oiseau',
  ]) assert.ok(!estOeuf(s), `« ${s} » ne devrait RIEN déclencher`);
});

/* ═══════════════════════ 2. Le scénario, joué pour de vrai ═══════════════ */

/** La ligne vivante, rang par rang, après les `n` premières étapes. */
function ligneApres(scenario, n) {
  const c = compile({ ...scenario, steps: scenario.steps.slice(0, Math.max(1, n)) });
  const rangs = new Map();
  for (const id of c.scene.flow) {
    const noeud = c.scene.get(id);
    const p = c.scene.pos(id);
    if (!noeud || !p) continue;
    const l = p.line ?? 0;
    if (!rangs.has(l)) rangs.set(l, []);
    rangs.get(l).push(noeud.text);
  }
  return [...rangs].sort((a, b) => a[0] - b[0]).map(([, v]) => v.join(' '));
}

test('★ œuf — il compile dans le moteur visuel réel, sans un avertissement', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');
  const c = compile(sc);
  assert.deepEqual(c.warnings, [], 'un œuf n’a pas le droit d’être plus bâclé que le reste');
  assert.ok(c.total > 0, 'durée totale nulle');
  assert.equal(sc.steps.length, 5, 'cinq étapes, comme dictées');
  // ★ SOBRE, et ce n'est pas un détail de goût : l'orage et les cornes sont la
  //   scénographie du 666, et il n'y a pas de 666 ici. C'est aussi ce qui donne
  //   l'auto-lecture, l'autoplay ne restant qu'en sobre.
  assert.equal(sc.registre, 'sobre');
});

test('★ œuf — la fraction se pose sur trois rangs, et le verdict la repose', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');

  // ★ La ligne de DÉPART : trois rangs, la barre au milieu. C'est ce qui a
  //   demandé que `Scene` transmette le `breakBefore` d'un jeton initial —
  //   il le laissait tomber, et la fraction s'écrasait sur une ligne.
  const debut = ligneApres(sc, 1);
  assert.equal(debut.length, 3, `trois rangs attendus, vu ${debut.length}`);
  assert.match(debut[1], /^—+$/, 'le rang du milieu est la barre de division');

  // La chute : après la réduction, il ne reste que π — barre comprise.
  assert.deepEqual(ligneApres(sc, 4), ['π']);

  // Et le verdict repose l'énoncé, l'égalité à hauteur de la barre.
  const fin = ligneApres(sc, 5);
  assert.equal(fin.length, 3);
  // ⚠️ En BAS DE CASSE : le verdict repose les mots TELS QU'ILS ONT ÉTÉ TAPÉS,
  //    et la saisie de ce test est en minuscules.
  assert.equal(fin[0], 'c h e v a l');
  assert.equal(fin[2], 'o i s e a u');
  assert.match(fin[1], /^—+ = π$/, 'l’égalité se lit sur la ligne du trait, pas sous le dénominateur');
});

/**
 * ★ **LA CASSE SAISIE SE DÉROULE JUSQU'AU BOUT.**
 *
 * > « L'easter egg devrait se déclencher quelle que soit la casse, mais se
 * >   dérouler en respectant la casse saisie […] ce qui implique de transformer
 * >   ailes en L ou l selon la casse de cheval » (l'auteur).
 *
 * Le dernier point est le moins évident, et c'est celui qui compte : les deux
 * `L` doivent S'ANNULER à l'avant-dernière étape. Celui du haut est le jeton
 * TAPÉ — on ne peut pas le changer ; c'est donc à celui que « ailes » devient
 * de s'aligner sur lui, sinon l'annulation cesse d'être évidente.
 */
test('★ œuf — il se déroule dans la casse saisie, les deux L compris', () => {
  // ⚠️ `ligneApres(sc, 1)` montre la ligne APRÈS la première étape, donc déjà
  //    permutée : « vachel ». C'est bien la casse tapée, dans l'ordre rangé.
  const bas = scenarioDeLOeuf('cheval sur oiseau');
  assert.equal(ligneApres(bas, 1)[0], 'v a c h e l');
  assert.equal(ligneApres(bas, 3)[0], 'β π l', 'le L du haut est celui qui a été tapé');
  assert.equal(ligneApres(bas, 3)[2], 'β l', 'celui de « ailes » s’aligne sur lui');
  assert.equal(ligneApres(bas, 5)[2], 'o i s e a u');

  const haut = scenarioDeLOeuf('CHEVAL SUR OISEAU');
  assert.equal(ligneApres(haut, 1)[0], 'V A C H E L');
  assert.equal(ligneApres(haut, 3)[0], 'β π L');
  assert.equal(ligneApres(haut, 3)[2], 'β L');

  // Casse mixte : chaque mot garde la sienne, et le L suit celui du numérateur.
  const mixte = scenarioDeLOeuf('Cheval/Oiseau = Pi');
  assert.equal(ligneApres(mixte, 5)[0], 'C h e v a l');
  assert.equal(ligneApres(mixte, 5)[2], 'O i s e a u');
  assert.equal(ligneApres(mixte, 3)[2], 'β l');
});

test('★ œuf — chaque étape porte son titre de registre', () => {
  const sc = scenarioDeLOeuf('cheval sur oiseau');
  for (const st of sc.steps) {
    assert.ok(typeof st.title === 'string' && st.title.trim(),
      `l’étape ${st.id} n’a pas de titre : le Registre ne saurait pas quoi dire`);
  }
});

test('★ œuf — l’approche de façade ne se classe pas', () => {
  const a = approcheDeLOeuf();
  // Ni code, ni série : l'œuf n'est pas une voie, et le classement ne doit
  // jamais pouvoir le comparer à une vraie.
  assert.equal(a.codes, '');
  assert.equal(a.series, 0);
  assert.ok(a.titre, 'il a tout de même un titre : le Registre en affiche un');
});
