/**
 * ★ **LES REDÉCOUPAGES QUI FUSIONNENT — `mrdf`, `mrfE`, `megf`.**
 *
 * > « Plutôt que d'inclure la fusion dans mrd et mrdE, fais des variantes
 * >   capables de fusionner ; elles me semblent un peu moins élégantes, donc
 * >   autant garder l'existant et ajouter plutôt que modifier. » (l'autrice)
 *
 * Ce fichier tient quatre promesses :
 *
 *  1. les MODÈLES n'ont pas bougé — `mrd`, `mrdE`, `meg` rendent ce qu'ils
 *     rendaient sur les lignes de la commande ;
 *  2. les variantes n'accolent QUE quand ça rapporte, et se taisent sinon ;
 *  3. l'arithmétique de l'égalisation futée est celle de `nivellementDe` ;
 *  4. les gestes se jouent par le CHEMIN DU SITE (`construireScenario`), sans
 *     avertissement, et la ligne rejouée est la sortie publiée.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, CATALOGUE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie } from '../../moteur/etat.js';
import { lireVisee } from '../../moteur/transformations/commun.js';
import { nivellementDe } from '../../moteur/transformations/combinateurs.js';
import {
  planRedecoupageFusionnant, planRedecoupageFusionnantExact, planEgalisationFutee,
} from '../../moteur/transformations/mappeurs.js';
import { construireScenario, suivreLaLigne } from '../../recherche/scenario.js';
import { operateursExplorables } from '../../recherche/bfs.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const V666 = lireVisee('666');
const nums = (vs) => ({ type: 'NUMS', valeur: vs, traces: vs.map((_, i) => [[i, i + 1]]) });
const sortie = (code, vs) => {
  const r = appliquer(PAR_CODE.get(code), nums(vs));
  return r ? r.valeur : null;
};
const six = (vs) => (vs ? vs.filter((v) => v === 6 || v === 9).length : 0);
const ecrit = (plan) => plan.paquets.map((p) => `${p.termes.map((t) => t.v).join('+')}=${p.sortie.join('')}`);
const opsDe = (steps) => steps.flatMap((s) => s.ops || []);
const jetonsNums = (v) => v.map((x, i) => ({ id: `t${i}`, text: String(x), kind: 'number' }));

// ───────────────────── 1. les modèles

test('★ les modèles n’ont pas bougé d’un octet sur les lignes de la commande', () => {
  assert.deepEqual(sortie('mrd', [12, 24, 33]), [9, 6]);
  assert.deepEqual(sortie('mrd', [1, 3, 3, 3, 3, 3, 3]), [1, 6, 6, 6]);
  assert.deepEqual(sortie('mrd', [1, 3, 3, 3, 3]), [1, 6, 6]);
  assert.equal(sortie('mrdE', [12, 24, 33]), null);
  assert.equal(sortie('mrdE', [1, 3, 3, 3, 3, 3, 3]), null);
  assert.deepEqual(sortie('meg', [3, 9, 6, 1, 9, 3, 5, 4, 7, 10, 10]), [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7]);
  assert.deepEqual(sortie('meg', [2, 3, 3, 5, 6, 6, 6, 7, 7, 8, 8]), [5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6]);
});

// ───────────────────── 2. accoler quand ça rapporte, et seulement

test('★ `mrdf` : `22 + 44 = 66` écrit deux 6 là où `mrd` n’en trouve qu’un', () => {
  assert.deepEqual(sortie('mrd', [2, 2, 4, 4]), [2, 6, 4]);
  const plan = planRedecoupageFusionnant([2, 2, 4, 4], V666);
  assert.deepEqual(ecrit(plan), ['22+44=66']);
  assert.deepEqual(sortie('mrdf', [2, 2, 4, 4]), [6, 6]);
});

test('★ `mrdf` se tait à égalité : `33 + 33` ne vaut pas mieux que `3 + 3, 3 + 3`', () => {
  // Les deux écrivent deux 6 ; le départage prend le moins de soudures, donc
  // le plan de `mrd` — et `mrd` suffit.
  assert.equal(planRedecoupageFusionnant([1, 3, 3, 3, 3], V666), null);
  assert.equal(planRedecoupageFusionnant([3, 3, 3, 3, 3, 3], V666), null, '333 + 333 ne vaut pas trois 3 + 3');
});

test('★ `mrdf` peut garder un nombre entier, souder, et gagner franchement', () => {
  const ligne = [12, 8, 9, 14, 6, 1, 9, 9, 1, 20, 23];
  assert.equal(sortie('mrd', ligne), null, '`mrd` n’y écrit rien de plus que la ligne');
  const plan = planRedecoupageFusionnant(ligne, V666);
  assert.deepEqual(ecrit(plan), ['1+28=29', '9=9', '1+4+61=66', '9=9', '9=9', '1+2+0+23=26']);
  assert.equal(six(sortie('mrdf', ligne)), 7);
});

test('★ `mrfE` : `5 + 61 = 66` écrit la cible là où `mrdE` ne peut rien', () => {
  assert.equal(sortie('mrdE', [6, 5, 6, 1]), null);
  assert.deepEqual(ecrit(planRedecoupageFusionnantExact([6, 5, 6, 1], V666)), ['6=6', '5+61=66']);
  // Et il se tait quand `mrdE` écrit déjà autant de séries sans rien accoler.
  assert.deepEqual(sortie('mrdE', [3, 3, 3, 3, 6]), [6, 6, 6]);
  assert.equal(sortie('mrfE', [3, 3, 3, 3, 6]), null);
  // L'invariant modulo neuf tient : accoler ne change pas la classe de la ligne.
  assert.equal(sortie('mrfE', [1, 1, 1, 1]), null);
});

// ───────────────────── 3. l'égalisation futée

test('★ le compte de l’autrice est celui de `nivellementDe`', () => {
  // (d+1)·n − S si d·n ≤ S < (d+1)·n ; S − (d−1)·n si (d−1)·n ≤ S < d·n ; 0 sinon.
  const formule = (n, S, d) => {
    if (d * n <= S && S < (d + 1) * n) return (d + 1) * n - S;
    if ((d - 1) * n <= S && S < d * n) return S - (d - 1) * n;
    return 0;
  };
  let x = 20260918;
  const suivant = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
  for (let k = 0; k < 400; k++) {
    const n = 2 + (suivant() % 9);
    const v = Array.from({ length: n }, () => suivant() % 13);
    const niv = nivellementDe(v);
    if (!niv.converge) continue;
    const S = v.reduce((a, b) => a + b, 0);
    for (const d of [1, 5, 6, 9]) {
      assert.equal(niv.valeurs.filter((y) => y === d).length, formule(n, S, d), `[${v.join(' ')}], d = ${d}`);
    }
  }
});

test('★ `megf` sur les deux lignes de la commande : `meg` y fait déjà le mieux possible', () => {
  // « Donald Trump » en `fl+mazc` : `meg` écrit dix 6 sur onze valeurs.
  assert.equal(six(sortie('meg', [3, 9, 6, 1, 9, 3, 5, 4, 7, 10, 10])), 10);
  assert.equal(sortie('megf', [3, 9, 6, 1, 9, 3, 5, 4, 7, 10, 10]), null);
  // Six 6 : accoler deux chiffres ajoute au moins 9 × (le premier) à la somme,
  // ce qui sort la ligne de la bande des 6.
  assert.equal(six(sortie('meg', [2, 3, 3, 5, 6, 6, 6, 7, 7, 8, 8])), 6);
  assert.equal(sortie('megf', [2, 3, 3, 5, 6, 6, 6, 7, 7, 8, 8]), null);
});

test('★ `megf` bat `meg` : une seule coupe, neuf 6 au lieu d’aucun', () => {
  const ligne = [9, 14, 1, 8, 3, 5, 5, 8, 4, 16];
  assert.equal(six(sortie('meg', ligne)), 0);
  const plan = planEgalisationFutee(ligne, V666);
  assert.deepEqual(plan.valeurs, [9, 14, 1, 8, 3, 5, 5, 8, 4, 1, 6], '16 coupé en 1 6, rien d’autre');
  assert.equal(plan.ecarts, 1);
  assert.equal(plan.score, 9);
  assert.equal(six(sortie('megf', ligne)), 9);
  // Et une soudure quand c'est elle qui paie : `13 3 3 3` tombe sur 6 6 5 5.
  assert.deepEqual(planEgalisationFutee([1, 3, 3, 3, 3], V666).valeurs, [13, 3, 3, 3]);
});

test('★ `megf` ne vise que les cibles homogènes, et ne se cherche qu’à partir de son cran', () => {
  const op = PAR_CODE.get('megf');
  assert.equal(op.viser('31031998'), null);
  assert.ok(op.viser('111'));
  // ★ Actifs tous trois, mais explorés à partir d'un cran de fouille
  //   (`op.desLeCran`, `bfs.js › operateursExplorables`) : « plus on avance
  //   dans les crans, plus des cas complexes sont envisageables » (l'autrice).
  //   Au cran 0, aucun des trois — la recherche du site garde son coût.
  for (const code of ['mrdf', 'mrfE', 'megf']) {
    const o = PAR_CODE.get(code);
    assert.equal(o.actifParDefaut, true, `${code} : jugé, actif`);
    assert.ok(o.desLeCran > 0, `${code} : absent du cran 0`);
    assert.ok(!operateursExplorables(CATALOGUE, 0).includes(o), `${code} : pas exploré au cran 0`);
    assert.ok(operateursExplorables(CATALOGUE, o.desLeCran).includes(o), `${code} : exploré à son cran`);
    assert.ok(!operateursExplorables(CATALOGUE, o.desLeCran - 1).includes(o), `${code} : pas avant`);
  }
  // `megf` s'ouvre plus tard que les deux autres : c'est lui qui prenait les
  // places (sept des vingt de « hope », `tca+m14` chassé).
  assert.ok(op.desLeCran > PAR_CODE.get('mrdf').desLeCran);
  assert.equal(PAR_CODE.get('mrdf').desLeCran, PAR_CODE.get('mrfE').desLeCran);
});

/* ★ « Note plus basse que leur modèle oui, mais derniers recours, non. Ils
     peuvent concourir aux lignes Élégance et Abondance tout en étant mal
     notés. » (l'autrice, 18 septembre 2026) — plus sévères au barème, jamais
     rangés parmi les ficelles : le `recours` qu'ils portaient ferme la ligne
     Abondance (`index.js › rangerParLeGlobal`), et il leur est retiré. */
test('★ au moins aussi sévères que leurs modèles, sans être des derniers recours', () => {
  for (const [variante, modele] of [['mrdf', 'mrd'], ['mrfE', 'mrdE'], ['megf', 'meg']]) {
    const v = PAR_CODE.get(variante);
    const m = PAR_CODE.get(modele);
    assert.ok(v.notoriete < m.notoriete, `${variante} : notoriété`);
    assert.ok(v.adHoc >= m.adHoc, `${variante} : adHoc`);
    assert.ok(v.cout >= m.cout, `${variante} : coût`);
    assert.equal(v.recours || 0, m.recours || 0, `${variante} : pas plus de recours que ${modele}`);
    assert.equal(v.recours || 0, 0, `${variante} : pas un dernier recours`);
  }
});

// ───────────────────── 4. les gestes, par le chemin du site

test('★ le geste de `megf` : couper, souder, égaliser — et la ligne rejouée est la sortie', () => {
  for (const ligne of [[9, 14, 1, 8, 3, 5, 5, 8, 4, 16], [1, 3, 3, 3, 3], [12, 24, 33]]) {
    const op = PAR_CODE.get('megf');
    const avant = nums(ligne);
    const apres = appliquer(op, avant);
    const ctx = { ids: ligne.map((_, i) => `t${i}`), cle: 'x0', langue: 'fr' };
    const steps = op.steps(avant, apres, ctx);
    const ops = opsDe(steps);
    assert.ok(ops.some((o) => o.op === 'group' && o.egaliser), 'le geste de `meg`');
    const suivies = suivreLaLigne(jetonsNums(ligne), steps);
    assert.ok(suivies.every(Boolean), `[${ligne.join(' ')}] : le rejeu se perd`);
    assert.deepEqual(suivies[suivies.length - 1].ids, op.sortie(avant, apres, ctx));
    const tl = compile({ version: 1, tokens: jetonsNums(ligne), steps });
    assert.deepEqual(tl.warnings, [], `[${ligne.join(' ')}] : ${tl.warnings.join(' | ')}`);
  }
});

/** Une approche d'un seul fragment, construite comme le site la reçoit. */
function approcheSur(saisie, codes) {
  const ops = codes.map((c) => PAR_CODE.get(c));
  const etats = [depuisSaisie(saisie)];
  for (const op of ops) {
    const suivant = appliquer(op, etats[etats.length - 1]);
    assert.ok(suivant, `${codes.join('+')} doit s'appliquer à « ${saisie} »`);
    etats.push(suivant);
  }
  const n = [...saisie].length;
  return { mode: 'DECRET', parts: [{
    fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
    chemin: { ops, etats },
  }] };
}

test('★ par le chemin du site, chaque variante joue son vrai geste', () => {
  const voies = [
    // `4 7 5 1 3 4` : une soudure, puis des sommes.
    ['Donald', 'tca+mch+mrdf', ['merge', 'sum']],
    // Des nombres gardés ENTIERS additionnés : une coupe, pas une soudure.
    ['Wikipedia', 'tca+mx6+mrfE', ['substitute', 'sum']],
    ['Donald', 'tca+mpy+megf', ['merge', 'group']],
  ];
  for (const [saisie, programme, attendus] of voies) {
    const sc = construireScenario(approcheSur(saisie, programme.split('+')), { saisie });
    assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const ops = opsDe(sc.steps);
    for (const nom of attendus) assert.ok(ops.some((o) => o.op === nom), `${saisie} › ${programme} : pas de « ${nom} »`);
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], `${saisie} › ${programme} : ${tl.warnings.join(' | ')}`);
  }
});
