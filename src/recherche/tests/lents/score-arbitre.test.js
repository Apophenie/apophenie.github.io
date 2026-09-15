/** LE SCORE ARBITRE — les quinze verdicts du 15 septembre 2026, en critères.
 *
 * Corpus : `.planning/arbitrages/2026-09-15-rang-ou-score.md`. Chaque cas opposait,
 * pour une même saisie, la voie en tête au SCORE GLOBAL affiché et la tête du
 * moteur. L'autrice a tranché : le classement suit le global, et le global doit
 * être recalibré pour ne pas faire monter ce qui est bancal — l'absorption
 * (`mab`), les traductions, le complément à 9, une sélection qui jette des
 * chiffres.
 *
 * ★ **CE QUE CES CRITÈRES DISENT, ET CE QU'ILS NE DISENT PAS.** Là où l'autrice
 *   nomme une tête, le critère la nomme. Là où elle dit « les deux me vont »
 *   (cas 6, 8) ou seulement « pas celle-là » (cas 2, 4, 10), le critère est
 *   plus lâche, et il est écrit tel quel : on n'invente pas une préférence
 *   qu'elle n'a pas exprimée.
 *
 * ★ **« PROPRE » SE LIT SUR CE QUE LA VOIE DÉCLARE**, jamais sur ses codes :
 *   une traduction porte une `acception`, le complément à 9 un `complement`,
 *   une absorption un identifiant `m.absorption…`, une sélection min/max se
 *   compte au bilan (`minMax`). C'est la doctrine du dépôt — ce qui est jugé
 *   est déclaré.
 *
 * Déterministe : `filetTemporel: false`. Chaque cas est résolu une fois. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../../index.js';
import { catalogue } from '../_catalogue.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });
const V2 = Object.freeze({ simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 });

/** La voie d'un lien, sans registre, curseurs ni cran : ce qu'on lit dans le corpus. */
const voie = (url) => String(url || '').split('#')[1]
  .replace(/^(?:(?:so|sce)!|c[0-9a-z]+!|p\d+\.\d+\.\d+\.\d+!|f-?\d+!)+/, '');

const opsDe = (a) => [
  ...(a.retouches || []).flatMap((r) => r.chemin.ops),
  ...a.parts.flatMap((p) => p.chemin.ops),
  ...(a.liaison && a.liaison.op ? [a.liaison.op] : []),
];
const proprietes = (a) => {
  const ops = opsDe(a);
  return {
    traduction: ops.some((o) => o.acception !== undefined),
    pc9: ops.some((o) => o.complement === 9),
    mab: ops.some((o) => /^m\.absorption/.test(o.id)),
    minMax: ((a.bilan && a.bilan.minMax) || 0) > 0,
  };
};
const propre = (a) => { const p = proprietes(a); return !p.traduction && !p.pc9 && !p.mab && !p.minMax; };

const memo = new Map();
function liste(saisie, { v2 = false, fouille = 0 } = {}) {
  const cle = `${saisie}|${v2}|${fouille}`;
  if (!memo.has(cle)) {
    const opts = { fouille };
    if (v2) opts.curseurs = V2;
    const approches = moteur.resoudre(saisie, opts).approches;
    assert.ok(approches.length > 0, `« ${saisie} » : la liste est vide — une pénalité ne doit jamais vider une liste`);
    memo.set(cle, approches);
  }
  return memo.get(cle);
}
const tete = (l) => voie(l[0].url);
const rang = (l, v) => l.findIndex((a) => voie(a.url) === v) + 1;
const resume = (l) => l.slice(0, 5).map((a) => voie(a.url)).join(' · ');
/** Si une voie SANS la propriété existe dans la liste, la tête ne l'a pas. */
const teteSansSiPossible = (l, cle) => !proprietes(l[0])[cle] || l.every((a) => proprietes(a)[cle]);
const horsDesCinq = (l, v) => { const i = rang(l, v); return i === 0 || i > 5; };

test('score arbitre 1 — hope (v2) : le simple m14 passe devant ffr2+ma1+mab, et mène', () => {
  const l = liste('hope', { v2: true });
  assert.equal(tete(l), 'm14', resume(l));
  assert.ok(rang(l, 'm14') < rang(l, 'ffr2+ma1+mab') || rang(l, 'ffr2+ma1+mab') === 0, resume(l));
});

test('score arbitre 2 — Donald Trump (v2) : pas de mab en tête quand une voie sans mab existe', () => {
  const l = liste('Donald Trump', { v2: true });
  assert.ok(teteSansSiPossible(l, 'mab'), resume(l));
});

test('score arbitre 3 — Éléonore à Nîmes (v2) : ni traduction ni mab en tête si l’on peut s’en passer', () => {
  const l = liste('Éléonore à Nîmes', { v2: true });
  assert.ok(teteSansSiPossible(l, 'traduction'), resume(l));
  assert.ok(teteSansSiPossible(l, 'mab'), resume(l));
});

test('score arbitre 4 — Capitalisme (v2) : pas de mab en tête quand une voie sans mab existe', () => {
  const l = liste('Capitalisme', { v2: true });
  assert.ok(teteSansSiPossible(l, 'mab'), resume(l));
});

test('score arbitre 5 — Wikipedia (v2) : meg devant mab, pas de mab en tête', () => {
  const l = liste('Wikipedia', { v2: true });
  assert.ok(teteSansSiPossible(l, 'mab'), resume(l));
  const meg = rang(l, 'fr17+mpy+meg');
  const mab = rang(l, 'mt9+mab');
  assert.ok(meg > 0 && (mab === 0 || meg < mab), `fr17+mpy+meg #${meg}, mt9+mab #${mab} — ${resume(l)}`);
});

test('score arbitre 6 — Henri Prunelle (v2) : l’une ou l’autre des deux remarquables (« les deux me vont »)', () => {
  const l = liste('Henri Prunelle', { v2: true });
  assert.ok(['fl+mazc+meg', 'fl+msfr+mad'].includes(tete(l)), resume(l));
});

test('score arbitre 7 — numherololgeek.1000i100.fr (v2) : la moisson nv / flt+mpy+mr9 mène, le leet partiel + mab est relégué', () => {
  const l = liste('numherololgeek.1000i100.fr', { v2: true });
  assert.equal(tete(l), '0:nv,2+3:flt+mpy+mr9', resume(l));
  const bancale = rang(l, '2:flt;fl+ma1+mab');
  assert.ok(bancale === 0 || bancale > rang(l, '0:nv,2+3:flt+mpy+mr9'), resume(l));
});

/* Cas 8 : « les deux sont bof […] les deux me vont » porte sur deux FAÇONS de
   mieux faire (traiter le reste par une autre méthode, ou l'exclure). Le
   critère est donc lâche : la tête n'est plus la résonance `m7F`, et elle est
   propre. */
test('score arbitre 8 — https://hope-hope-hope.fr/ (v2) : ni la résonance m7F, ni une voie bancale en tête', () => {
  const l = liste('https://hope-hope-hope.fr/', { v2: true });
  assert.notEqual(tete(l), '×3:m7F+cs+prn', resume(l));
  assert.ok(propre(l[0]), resume(l));
});

test('score arbitre 9 — https://hope-hope-hope.fr/ (défaut) : tête propre, la partition au pc9 hors des cinq premières', () => {
  const l = liste('https://hope-hope-hope.fr/');
  assert.ok(propre(l[0]), resume(l));
  assert.ok(horsDesCinq(l, '0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9'), resume(l));
});

test('score arbitre 10 — Donald Trump (défaut) : ni mab ni sélection qui jette des chiffres en tête', () => {
  const l = liste('Donald Trump');
  assert.ok(propre(l[0]), resume(l));
});

test('score arbitre 11 — Macron (défaut) : fr13+m14+meg mène', () => {
  const l = liste('Macron');
  assert.equal(tete(l), 'fr13+m14+meg', resume(l));
});

test('score arbitre 12 — hope-hope-hope.fr (défaut, cran 2) : fl+m14 mène, la partition alambiquée hors des cinq', () => {
  const l = liste('hope-hope-hope.fr', { fouille: 2 });
  assert.equal(tete(l), 'fl+m14', resume(l));
  assert.ok(horsDesCinq(l, '0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn'), resume(l));
});

test('score arbitre 13 — hope (défaut) : le simple m14 est dans la liste, et il mène', () => {
  const l = liste('hope');
  assert.ok(rang(l, 'm14') > 0, `m14 absent de la liste — ${resume(l)}`);
  assert.equal(tete(l), 'm14', resume(l));
});

test('score arbitre 14 — Éléonore à Nîmes (défaut) : ni pc9 ni traduction en tête si l’on peut s’en passer', () => {
  const l = liste('Éléonore à Nîmes');
  assert.ok(teteSansSiPossible(l, 'pc9'), resume(l));
  assert.ok(teteSansSiPossible(l, 'traduction'), resume(l));
  assert.ok(horsDesCinq(l, '0+4:nc+pc9,2:fen5+nc+pc9'), resume(l));
});

test('score arbitre 15 — numherololgeek.1000i100.fr (défaut) : une voie meg sans pc9 mène, la partition hors des cinq', () => {
  const l = liste('numherololgeek.1000i100.fr');
  assert.ok(teteSansSiPossible(l, 'pc9'), resume(l));
  assert.ok(/meg$/.test(tete(l)), resume(l));
  assert.ok(horsDesCinq(l, '0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9'), resume(l));
});

test('score arbitre — sur tout le corpus, pc9 et traduction ne mènent qu’en dernier recours', () => {
  const fautes = [];
  for (const [saisie, o] of [
    ['hope', { v2: true }], ['Donald Trump', { v2: true }], ['Éléonore à Nîmes', { v2: true }],
    ['Capitalisme', { v2: true }], ['Wikipedia', { v2: true }], ['Henri Prunelle', { v2: true }],
    ['numherololgeek.1000i100.fr', { v2: true }], ['https://hope-hope-hope.fr/', { v2: true }],
    ['https://hope-hope-hope.fr/', {}], ['Donald Trump', {}], ['Macron', {}], ['hope-hope-hope.fr', { fouille: 2 }],
    ['hope', {}], ['Éléonore à Nîmes', {}], ['numherololgeek.1000i100.fr', {}],
  ]) {
    const l = liste(saisie, o);
    for (const cle of ['pc9', 'traduction']) {
      if (!teteSansSiPossible(l, cle)) fautes.push(`${saisie} ${JSON.stringify(o)} : ${tete(l)} (${cle})`);
    }
  }
  assert.deepEqual(fautes, []);
});
