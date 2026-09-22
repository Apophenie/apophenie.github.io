/**
 * ★ **LE REDÉCOUPAGE EXACT AVEC TRI — `mrtE`, et `mt9E` qui garde le 9.**
 *
 * > « Pour mrdE, peux-tu faire une variante qui peut inclure un mtri en cours
 * >   de route pour débloquer les assemblages ? (ou utiliser mrd+mtri+mrdE
 * >   peut-être) » (l'autrice, 19 septembre 2026)
 *
 * > « Le tri qui place les 6 devant ne va pas : tri oui, mais avec un ordre
 * >   respecté. Les 6 ne seront juste pas additionnés mais ils doivent être à
 * >   leur position dans l'ordre de tri quand même. »
 * >   (l'autrice, 20 septembre 2026)
 *
 * Ce fichier tient ce que la variante promet (`mappeurs.js ›
 * planRedecoupageExactTrie`) : elle TRIE — vraiment, sans mettre un seul
 * chiffre à part —, elle écrit plus que `mrdE` et que la chaîne
 * `mrd+mtri+mrdE` là où elle parle, se tait là où `mrdE` suffit, ne vise que
 * les cibles homogènes, et se joue par le CHEMIN DU SITE sans avertissement —
 * la première passe de `mrd`, le rangement de `mtri`, la passe de `mrdE`.
 *
 * ★ **IL TIENT AUSSI LE PRIX DU TRI STRICT**, et c'est volontaire : deux cas
 *   ci-dessous n'existent QUE pour dire ce que le geste a cessé de savoir
 *   faire. Un arbitrage qu'on n'a pas chiffré est un arbitrage qu'on refera.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie, nums } from '../../moteur/etat.js';
import { construireScenario } from '../../recherche/scenario.js';
import { planRedecoupageExactTrie, viseeDeVariante } from '../../moteur/transformations/mappeurs.js';
import { lireVisee } from '../../moteur/transformations/commun.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const rend = (codes, v, cible = '666') => {
  let e = N(v);
  for (const code of codes.split('+')) {
    const op = PAR_CODE.get(code);
    // `mr9` ne lit pas la cible : il n'a pas de `viser`.
    e = appliquer(op.viser ? op.viser(cible) : op, e);
    if (!e) return null;
  }
  return e.valeur;
};
const series = (v, cible = '666') => (v
  ? Math.floor(v.filter((x) => x === Number(cible[0])).length / cible.length)
  : 0);

/**
 * La ligne que le geste RANGE, telle que la scène la montre — la légende de
 * l'étape `move` (`… → …`), lue à sa source plutôt que devinée. C'est ce que
 * l'autrice a sous les yeux, et donc ce sur quoi elle a tranché.
 */
const ligneRangee = (code, v, cible = '666') => {
  const op = PAR_CODE.get(code).viser(cible);
  const avant = N(v);
  const apres = appliquer(op, avant);
  if (!apres) return null;
  const ctx = { cle: 'x', langue: 'fr', ids: v.map((_, i) => `t${i}`) };
  const pas = op.steps(avant, apres, ctx).find((s) => s.id === `s_${ctx.cle}_r`);
  return pas.caption.split('→')[1].trim().split(' ').map(Number);
};

/** La ligne de « Didier Raoult » en code ASCII capitales (`fmaj+mas`). */
const RAOULT = [68, 73, 68, 73, 69, 82, 32, 82, 65, 79, 85, 76, 84];
/** Celle de « jean-michel », qui paie le tri strict le plus cher du corpus. */
const JEAN_MICHEL = [74, 69, 65, 78, 45, 77, 73, 67, 72, 69, 76];

test('★ le tri est un TRI : rien n’est mis à part, pas même un 6', () => {
  // `3 6 3 3 3` → `3 3 3 3 6`. Le 6 ne passe plus devant : il tombe à sa place,
  // en dernier, entre les chiffres qui valent moins et rien du tout.
  assert.deepEqual(ligneRangee('mrtE', [3, 6, 3, 3, 3]), [3, 3, 3, 3, 6]);
  // `6 3 4 3 5` → `3 3 4 5 6`, et la SORTIE le dit : `3 + 3 = 6`, `4 + 5 = 9`,
  // puis le 6 tout seul — `6 9 6`, et non plus `6 6 9`.
  assert.deepEqual(ligneRangee('mt9E', [6, 3, 4, 3, 5]), [3, 3, 4, 5, 6]);
  assert.deepEqual(rend('mt9E', [6, 3, 4, 3, 5]), [6, 9, 6]);
  // La règle générale, sur la plus longue ligne qu'on ait sous la main : la
  // ligne rangée est TRIÉE, point. Aucun 6 ni aucun 9 n'a été extrait.
  const rangee = ligneRangee('mt9E', [18, 5, 9, 14, 6, 15, 3, 15, 22, 9, 4]);
  assert.deepEqual(rangee, [...rangee].sort((a, b) => a - b), 'la ligne rangée est croissante');
  assert.ok(rangee.includes(6), 'le témoin contient un 6 à préserver');
});

test('★ Didier Raoult : le tri strict rend ce que le tri à exception avait pris', () => {
  assert.equal(series(rend('mrdE', RAOULT)), 2);
  // La chaîne que l'autrice proposait : `mtri` range des NOMBRES, et `mrd` sans
  // le 9 laisse une ligne que le rangement ne débloque pas.
  assert.equal(series(rend('mrd+mtri+mrdE', RAOULT)), 1);
  assert.equal(series(rend('mtri+mrdE', RAOULT)), 2);
  // ★ LE PRIX, SUR LE CAS DE RÉFÉRENCE DE L'AUTRICE. Avec les 6 poussés devant,
  //   `mrtE` écrivait ici quatre séries. Trié pour de bon, il n'écrit plus que
  //   ce que `mrdE` écrit déjà — donc il SE TAIT (`series > barre`). C'est la
  //   perte franche de l'arbitrage du 20 septembre, et elle est assumée :
  //   « c'est le prix d'un rendu qui ne semble pas intentionnel ».
  assert.equal(rend('mrtE', RAOULT), null);
  // Les quatre séries du premier tri strict additionnaient encore des 6.
  // En les laissant réellement seuls, la passe exacte ne peut plus aboutir.
  assert.equal(rend('mt9E+mr9', RAOULT), null);
  assert.equal(series(rend('md9E+mr9', RAOULT)), 3);
});

test('★ jean-michel : l’autre perte franche, celle du « 5 groupé avec un 7 »', () => {
  // > « Ça risque de casser quelques cas de figure où un 5 était groupé avec un
  // >   7 par exemple » (l'autrice) — c'est exactement ce qui se passe ici : les
  // >   six 6 de la ligne s'intercalent entre les petits et les grands, et les
  // >   plages qui soudaient les uns aux autres n'existent plus.
  assert.equal(series(rend('mrdE', JEAN_MICHEL)), 2);
  // Trois séries avec le tri à exception, deux avec `mrdE` seul : le geste ne
  // débloque plus rien, donc il se tait. Une série perdue à l'écran.
  assert.equal(rend('mrtE', JEAN_MICHEL), null, 'une série perdue, et c’est le prix');
  assert.equal(rend('mt9E', JEAN_MICHEL), null, 'les 6 ne sont pas sacrifiés pour finir le tri');
});

test('★ après le tri, les chiffres déjà justes traversent toutes les passes sans addition', () => {
  for (const [cible, valeur, avecNeuf] of [
    ['666', [3, 6, 3, 3, 3], false],
    ['666', [18, 5, 9, 14, 6, 15, 3, 15, 22, 9, 4], true],
    ['777', [7, 3, 7, 3, 1], false],
  ]) {
    const visee = viseeDeVariante(lireVisee(cible), avecNeuf);
    const premiere = PAR_CODE.get(avecNeuf ? 'mrd9' : 'mrd').viser(cible);
    const plan = planRedecoupageExactTrie(valeur, visee, premiere);
    assert.ok(plan, `${cible} : le témoin doit produire un plan`);
    let proteges = plan.range.map((v) => v === Number(cible[0]));
    assert.ok(proteges.some(Boolean));
    const nombre = proteges.filter(Boolean).length;
    for (const passe of plan.exact.passes) {
      const suivants = [];
      for (const paquet of passe.paquets) {
        const protege = proteges.slice(paquet.debut, paquet.fin).some(Boolean);
        if (protege) {
          assert.equal(paquet.mode, 'copie', 'un chiffre juste ne participe pas à une somme');
          assert.equal(paquet.fin - paquet.debut, 1);
        }
        suivants.push(...paquet.sortie.map(() => protege));
      }
      proteges = suivants;
    }
    assert.equal(proteges.filter(Boolean).length, nombre);
  }
});

test('★ il se tait quand `mrdE` écrit déjà autant, et quand la cible n’est pas homogène', () => {
  assert.deepEqual(rend('mrdE', [6, 5, 1, 9, 3, 3]), [6, 6, 6]);
  assert.equal(rend('mrtE', [6, 5, 1, 9, 3, 3]), null, 'ranger n’apporterait rien');
  // `3 6 3 3 3` : `mrdE` ne sait rien en écrire, le tri met les quatre 3 côte à
  // côte — `3 + 3`, `3 + 3`, et le 6 seul derrière eux.
  assert.equal(rend('mrdE', [3, 6, 3, 3, 3]), null);
  assert.deepEqual(rend('mrtE', [3, 6, 3, 3, 3]), [6, 6, 6]);
  for (const code of ['mrtE', 'mt9E']) {
    assert.equal(PAR_CODE.get(code).viser('31031998'), null, `${code} : trier détruirait l’ordre de la date`);
  }
  // 777 : le 7 est le chiffre juste, et la variante avec 9 n'y a aucun sens.
  assert.equal(rend('mrdE', [7, 3, 7, 3, 1], '777'), null);
  assert.deepEqual(rend('mrtE', [7, 3, 7, 3, 1], '777'), [7, 7, 7]);
  assert.equal(PAR_CODE.get('mt9E').viser('777'), null);
});

test('★ noté plus bas que `mrdE`, ouvert au cran 2 — et sa variante avec 9 au cran 3', () => {
  const m = PAR_CODE.get('mrdE');
  const t = PAR_CODE.get('mrtE');
  const t9 = PAR_CODE.get('mt9E');
  assert.ok(t.notoriete < m.notoriete && t9.notoriete < t.notoriete);
  assert.equal(t.recours || 0, 0);
  assert.equal(t.desLeCran, PAR_CODE.get('mrfE').desLeCran, 'le cran des variantes qui accolent');
  assert.equal(t9.desLeCran, PAR_CODE.get('md9E').desLeCran, 'le cran des variantes avec 9');
  assert.ok(t.absorbe && !t9.absorbe);
  // Ce qu'il range, il le déclare : le barème le facture comme `mtri`. Le tri
  // strict déplace PLUS que le tri à exception — `3 6 3 3 3` bougeait deux
  // jetons quand le 6 sautait en tête, il en bouge quatre maintenant que la
  // ligne se trie en entier. Le geste paie donc son honnêteté au barème aussi.
  assert.equal(t.deplaces([3, 6, 3, 3, 3]), 4, 'les quatre 3 avancent, le 6 recule');
});

test('★ par le chemin du site : `mrd`, puis le rangement de `mtri`, puis `mrdE` — sans avertissement', () => {
  // La dernière ligne est celle qui passe par la PREMIÈRE PASSE : ses étapes de
  // `mrd` se jouent en tête, avant que le rangement ne commence.
  for (const [saisie, programme] of [['hope-hope-hope.fr', 'fmaj+tca+mas+mrtE'],
    ['hope-hope-hope.fr', 'fmaj+tca+mas+mt9E+mr9'],
    ['https://www.google.com', 'fl+tca+masc+mrtE'], ['Wikipedia', 'fmaj+tca+mejc+mrtE']]) {
    const ops = programme.split('+').map((c) => PAR_CODE.get(c));
    const etats = [depuisSaisie(saisie)];
    for (const op of ops) {
      const suivant = appliquer(op, etats[etats.length - 1]);
      assert.ok(suivant, `${programme} doit s'appliquer à « ${saisie} »`);
      etats.push(suivant);
    }
    const n = [...saisie].length;
    const sc = construireScenario({ mode: 'DECRET', parts: [{
      fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
      chemin: { ops, etats },
    }] }, { saisie });
    assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const ops2 = sc.steps.flatMap((s) => s.ops || []);
    assert.ok(ops2.some((o) => o.op === 'move'), `${programme} : le rangement se voit`);
    assert.ok(ops2.some((o) => o.op === 'sum'), `${programme} : les sommes se voient`);
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], `${programme} : ${tl.warnings.join(' | ')}`);
  }
  // ★ La première passe de `mrd` se joue AVANT le rangement, et on le vérifie :
  //   une somme dans la scène avant le premier `move`.
  const ops = 'fmaj+tca+mejc+mrtE'.split('+').map((c) => PAR_CODE.get(c));
  const etats = [depuisSaisie('Wikipedia')];
  for (const op of ops) etats.push(appliquer(op, etats[etats.length - 1]));
  const sc = construireScenario({ mode: 'DECRET', parts: [{
    fragment: { texte: 'Wikipedia', offset: 0, longueur: 9, intervalles: [[0, 9]], famille: 'entier' },
    chemin: { ops, etats },
  }] }, { saisie: 'Wikipedia' });
  const suite = sc.steps.flatMap((s) => (s.ops || []).map((o) => o.op));
  assert.ok(suite.slice(0, suite.indexOf('move')).includes('sum'), 'la première passe précède le rangement');
});
