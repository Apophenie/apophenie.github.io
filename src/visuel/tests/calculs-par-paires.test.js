/**
 * ★ **DEUX VALEURS À LA FOIS — jamais plus.**
 *
 * > « Pour les mab, mad, mrd, mrdE et compagnie : pour rendre plus discrète la
 * >   sélection opportuniste : ne fais que des calculs entre 2 nombres, jamais
 * >   entre plus (pas de 5+3+8+2 : fais d'abord 5+3 puis 8+2, et à la passe
 * >   suivante tu pourras faire 8+10). Pareil pour les multiplications. Pour
 * >   les soustractions, plutôt que 5−2−1, fais d'abord 2+1, puis 5−3. Bref, ne
 * >   fais les opérations qu'entre deux valeurs. » (l'auteur)
 *
 * Ce fichier ne vérifie aucun résultat : `apply` n'a pas bougé, et la
 * recherche rend les mêmes listes. Il vérifie ce que l'ÉCRAN montre :
 *
 *  1. le parcours lui-même — des paires, par passes, dans l'ordre de l'auteur ;
 *  2. le CATALOGUE : aucun geste à plus de deux opérandes dans les steps des
 *     opérateurs concernés, sur des lignes qui les exercent vraiment — avec au
 *     moins une seconde passe, sans quoi on n'aurait rien prouvé ;
 *  3. le CHEMIN DU SITE : `construireScenario` sur une voie qui les emploie,
 *     sans avertissement, puis `compile()` sans animation concurrente.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie } from '../../moteur/etat.js';
import { passesBinaires } from '../../moteur/transformations/commun.js';
import { construireScenario, suivreLaLigne } from '../../recherche/scenario.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/** Les opérateurs dont la mise en scène est désormais binaire. */
const PERIMETRE = ['mab', 'mabx', 'mabd', 'mad', 'mrd', 'mrdE', 'mam', 'mrdf', 'mrfE', 'cs', 'cp', 'cst'];

const nums = (vs) => ({ type: 'NUMS', valeur: vs, traces: vs.map(() => [0, 1]) });
const jetonsNums = (vs) => vs.map((v, i) => ({ id: `t${i}`, text: String(v), kind: 'number' }));
const opsDe = (steps) => steps.flatMap((s) => s.ops || []);

/** Un geste de calcul à plus de deux valeurs — ce que l'auteur ne veut plus voir. */
function troplarge(o) {
  if (o.op === 'sum' && Array.isArray(o.targets) && o.targets.length > 2) return true;
  if (o.op === 'reduce' && Array.isArray(o.digits) && o.digits.length > 2) return true;
  if (o.op === 'insertOperators' && Array.isArray(o.between) && o.between.length > 2) return true;
  return false;
}

// ───────────────────── 1. le parcours

test('★ 5 + 3 + 8 + 2 : d’abord 5 + 3, puis 8 + 2, et à la passe suivante 8 + 10', () => {
  const termes = [5, 3, 8, 2].map((v, i) => ({ id: `c${i}`, v }));
  const { gestes, racine } = passesBinaires(termes, {
    combiner: (a, b) => a + b, nommer: (k) => `i${k}`, racine: 'somme',
  });
  assert.deepEqual(gestes.map((g) => `${g.gauche.v}+${g.droite.v}=${g.resultat.v}`),
    ['5+3=8', '8+2=10', '8+10=18']);
  assert.deepEqual(gestes.map((g) => g.niveau), [0, 0, 1], 'deux passes : les paires, puis leurs résultats');
  assert.equal(racine.id, 'somme', 'la racine porte l’identifiant que l’opérateur publie');
  assert.equal(racine.v, 18);
  assert.ok(gestes[2].dernier && !gestes[0].dernier && !gestes[1].dernier);
});

test('★ un terme sans voisin attend la passe suivante, sans rien faire', () => {
  const termes = [1, 2, 3, 4, 5].map((v, i) => ({ id: `c${i}`, v }));
  const { gestes } = passesBinaires(termes, {
    combiner: (a, b) => a + b, nommer: (k) => `i${k}`, racine: 'r',
  });
  assert.deepEqual(gestes.map((g) => `${g.gauche.v}+${g.droite.v}`), ['1+2', '3+4', '3+7', '10+5']);
  assert.equal(gestes.length, termes.length - 1, 'n termes, n − 1 gestes');
});

test('★ 5 − 2 − 1 : d’abord 2 + 1, puis 5 − 3 (la soustraction en chaîne)', () => {
  const o = PAR_CODE.get('cst');
  const avant = nums([5, 2, 1]);
  const apres = appliquer(o, avant);
  assert.equal(apres.valeur, 2);
  const steps = o.steps(avant, apres, { ids: ['t0', 't1', 't2'], cle: 'x0', langue: 'fr' });
  assert.deepEqual(steps.map((s) => s.caption), ['2 + 1 = 3', '5 − 3 = 2']);
  const sommes = opsDe(steps).filter((x) => x.op === 'sum');
  assert.deepEqual(sommes.map((s) => s.targets.length), [2, 2]);
  assert.deepEqual(sommes[1].partials, [5, 2], 'le premier se pose, le total le retranche');
  const tl = compile({ version: 1, tokens: jetonsNums([5, 2, 1]), steps });
  assert.deepEqual(tl.warnings, []);
});

// ───────────────────── 2. le catalogue

/**
 * Des lignes de chiffres et de petits nombres, tirées d'un générateur FIXE :
 * deux exécutions essaient exactement les mêmes (§4.4). On en garde, pour
 * chaque opérateur, celles sur lesquelles il s'applique.
 */
function lignesTemoins(n = 1500) {
  let x = 20260911;
  const suivant = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
  const lignes = [];
  for (let k = 0; k < n; k++) {
    const long = 3 + (suivant() % 10);
    const ligne = [];
    for (let i = 0; i < long; i++) {
      // Surtout des chiffres, parfois un nombre à deux chiffres : c'est ce
      // qu'une conversion de lettres rend.
      ligne.push(suivant() % 4 === 0 ? 10 + (suivant() % 17) : suivant() % 10);
    }
    lignes.push(ligne);
  }
  return lignes;
}

test('★ aucun geste à plus de deux opérandes dans les steps du périmètre — et des secondes passes jouées', () => {
  const lignes = lignesTemoins();
  /* ★ `mam` ne s'applique qu'à une ligne dont la moyenne est SOUS le chiffre
     visé — additionner la fait monter. Les lignes témoins, riches en nombres
     à deux chiffres, sont presque toutes au-dessus de 6 : il n'en exercerait
     aucune. Il reçoit donc les mêmes lignes ramenées à de petits chiffres
     (modulo 7), fixes et déterministes comme elles. */
  const PROPRES = { mam: lignes.map((l) => l.map((v) => v % 7)) };
  for (const code of PERIMETRE) {
    const o = PAR_CODE.get(code);
    assert.ok(o, `« ${code} » doit exister au catalogue`);
    let exerce = 0;
    let secondesPasses = 0;
    for (const v of PROPRES[code] || lignes) {
      const avant = nums(v);
      const apres = appliquer(o, avant);
      if (!apres) continue;
      const ctx = { ids: v.map((_, i) => `t${i}`), cle: 'x0', langue: 'fr' };
      const steps = o.steps(avant, apres, ctx);
      const ops = opsDe(steps);
      const larges = ops.filter(troplarge);
      assert.deepEqual(larges.map((x) => `${x.op}:${(x.targets || x.digits || x.between).length}`), [],
        `${code} sur [${v.join(' ')}] : ${larges.map((x) => JSON.stringify(x.targets || x.digits || x.between)).join(' ')}`);
      // Une somme dont un opérande a été FABRIQUÉ par une somme précédente :
      // c'est une seconde passe, la preuve que l'arbre a servi.
      const fabriques = new Set();
      for (const x of ops) {
        if (x.op !== 'sum') continue;
        if (x.targets.some((id) => fabriques.has(id))) secondesPasses++;
        fabriques.add(x.to.id);
      }
      // Le rejeu de la ligne suit chaque paire, et finit sur la sortie publiée.
      const tokens = jetonsNums(v);
      const suivies = suivreLaLigne(tokens, steps);
      assert.ok(suivies.every(Boolean), `${code} sur [${v.join(' ')}] : le rejeu se perd`);
      const finale = suivies.length ? suivies[suivies.length - 1].ids : ctx.ids;
      assert.deepEqual(finale, o.sortie(avant, apres, ctx), `${code} sur [${v.join(' ')}] : la ligne rejouée n’est pas la sortie`);
      // Et la scène compile, sans deux animations sur le même nœud.
      if (exerce < 12) {
        const tl = compile({ version: 1, tokens, steps });
        assert.deepEqual(tl.warnings, [], `${code} sur [${v.join(' ')}] : ${tl.warnings.join(' | ')}`);
      }
      exerce++;
    }
    assert.ok(exerce >= 3, `${code} ne s’applique qu’à ${exerce} ligne(s) témoin : le test ne prouverait rien`);
    assert.ok(secondesPasses > 0, `${code} : aucune seconde passe jouée sur ${exerce} lignes — l’arbre n’a jamais servi`);
  }
});

// ───────────────────── 3. le chemin du site

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

/**
 * Une voie par opérateur du périmètre, qui s'applique à la saisie ENTIÈRE (un
 * seul fragment, comme `approcheSur` le construit) et dont un paquet compte
 * plus de deux termes — sans quoi la paire n'aurait rien à montrer. Relevées
 * en balayant les conversions usuelles sur des mots du corpus.
 */
const VOIES = [
  ['Donald', 'tca+ma1+mab'],
  ['Donald', 'tca+mx6+mabx'],
  ['Wikipedia', 'tca+mt9+mabd'],
  ['Macron', 'tca+mz26+mad'],
  ['Donald', 'tca+mhe+mrd'],
  // L'addition vers la moyenne : « 6 1 2 1 8 5 4 1 1 », deux paquets de trois.
  ['Wikipedia', 'tca+mch+mam'],
  ['Trump', 'tca+mx6+mrdE'],
  ['Donald', 'tca+ma1+cs'],
  ['Donald', 'tca+mpy+cp'],
  ['Donald', 'tca+ma1+cst'],
];

test('★ par le chemin du site, les paires sont JOUÉES — et rien ne se chevauche', () => {
  for (const [saisie, programme] of VOIES) {
    const codes = programme.split('+');
    const sc = construireScenario(approcheSur(saisie, codes), { saisie });
    assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const ops = opsDe(sc.steps);
    const larges = ops.filter(troplarge);
    assert.deepEqual(larges.map((x) => x.op), [], `${saisie} › ${programme} : un calcul à plus de deux valeurs`);
    const fabriques = new Set();
    let seconde = false;
    for (const x of ops) {
      if (x.op !== 'sum') continue;
      if (x.targets.some((id) => fabriques.has(id))) seconde = true;
      fabriques.add(x.to.id);
    }
    assert.ok(seconde, `${saisie} › ${programme} : aucune seconde passe — la voie n’exerce pas l’arbre`);
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], `${saisie} › ${programme} : ${tl.warnings.join(' | ')}`);
  }
});
