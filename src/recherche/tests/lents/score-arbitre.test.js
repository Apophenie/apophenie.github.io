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
const voie = (url) => String(url || '').split('$')[0].slice(1)
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
    // ⚠️ Par identifiant : `posts.js` ne publie pas `complement` sur le
    //   descripteur, et `o.complement === 9` était toujours faux — le critère
    //   passait sans rien vérifier (mesuré).
    pc9: ops.some((o) => o.id === 'p.complement9'),
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

/* ⚠️ TODO — CE N'EST PAS LE CLASSEMENT, C'EST LA SÉLECTION DES CANDIDATS.

   ★ **RAISON REMESURÉE LE 16 SEPTEMBRE 2026 — et l'ancienne était FAUSSE.**
     Deux correctifs ont été écrits, mesurés, puis écartés. Le `todo` reste
     ouvert, mais il dit enfin le vrai : ce n'est pas la porte qu'on croyait.

   `tca+m14` sur « hope » vaut 7 301 au moteur et 704 au global : il mènerait.
   L'ancienne explication — « la réserve de qualité ne se range par
   `noteDeQualite` que si un curseur a bougé » — est RÉFUTÉE : lever cette
   porte ne change RIEN à « hope » (8 voies avant, 8 après, aucune entrée).

   Où il se perd, au vecteur près (sonde sur `vecteursDeSix('hope', …)`) :
    · matière brute, sans mise en forme : `tca+m14` est **21ᵉ** sur 606 ;
    · après mise en forme, plafond infini : **16ᵉ** sur 50 ;
    · au plafond du cran 0 (`K_PAR_FRAGMENT` × 2 = 16) : **ABSENT** — la réserve
      et les élus réarrangent la fenêtre, et il n'y survit pas ;
    · aux plafonds 32 et 64 : 16ᵉ, donc présent. **La borne est le verrou.**
   Ce qui le précède est presque tout `ffr*` (traductions) et `fr*` (César) :
   le pré-tri range par COMPTE de 6, et une traduction en rapporte souvent un de
   plus qu'une lecture franche — elle change les lettres avant de les compter.

   Les deux correctifs mesurés, et pourquoi ils sont écartés :
    1. **ranger la réserve par `noteDeQualite` à tous les curseurs** : « hope »
       inchangé, et TROIS têtes publiées tombent — `Macron` passe de
       `fr13+m14+meg` à `mt9` (c'est le cas 11, que l'autrice a tranché dans
       l'autre sens), « Sarah Kerrigan → 666 » à `fl+m7`, « Sarah Kerrigan → 13 »
       à `tm+mlm+mrd` ; 32 voies sortent des listes publiées, et
       `score-intermediaire.test.js › ★ réserve — simplicité à 200` rougit ;
    2. **appliquer au dernier recours le palier de la ficelle** dans le pré-tri
       (sur `o.recours`, la propriété déclarée que le global lit déjà) : `m14`
       reste hors des seize, aucune tête ne bouge, mais 25 voies sortent — dont
       trois traductions de « hope » — et `familles.test.js › sans parFamille,
       la matière rend la fenêtre d'avant` rougit.

   Ce qui reste à arbitrer, et qui dépasse la correction d'un tri : faire entrer
   `m14` demande d'ÉLARGIR la fenêtre du cran 0, ou de lui réserver un siège au
   score global. Les deux changent la MATIÈRE de toutes les listes, pas
   seulement celle de « hope » — c'est à l'autrice de le vouloir. */
test('score arbitre 13 — hope (défaut) : le simple m14 est dans la liste, et il mène', {
  todo: 'm14 hors de la fenêtre de 16 du cran 0 (assemblage.js › vecteursDeSix) — deux correctifs mesurés et écartés, voir le pavé',
}, () => {
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

/* ★ LES DEUX LIGNES RÉSERVÉES, CHOISIES AU GLOBAL — « garde les deux mais sur
     la base du score global, et "élégance" et "abondance" me va bien »
     (l'autrice). Elles n'existent qu'aux curseurs par défaut, comme avant.
     Ce qu'on exige d'elles sur les sept cas du corpus à ces curseurs :
      · aucune des deux n'est une voie que l'autrice a écartée ;
      · l'Élégance n'est pas bancale (traduction, pc9, absorption, min/max) si
        une voie propre existe ;
      · l'Abondance, quand elle existe, aligne plus de séries que l'Élégance,
        et n'est pas bancale. */
const ECARTEES = new Set([
  '0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9', '0:fatb+mt9+mr9,2:mt9+cmn', 'fr20+mazc+mrdE',
  '0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn', '0+4:nc+pc9,2:fen5+nc+pc9', '0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9',
  '2:flt;fl+ma1+mab', 'fl+ma1+mab', '×3:m7F+cs+prn',
]);
test('score arbitre — Élégance et Abondance : jamais une voie écartée, jamais une bancale', () => {
  const fautes = [];
  for (const [saisie, o] of [
    ['https://hope-hope-hope.fr/', {}], ['Donald Trump', {}], ['Macron', {}], ['hope-hope-hope.fr', { fouille: 2 }],
    ['hope', {}], ['Éléonore à Nîmes', {}], ['numherololgeek.1000i100.fr', {}],
  ]) {
    const l = liste(saisie, o);
    const elegance = l.find((a) => a.suggestion === 'elegance');
    const abondance = l.find((a) => a.suggestion === 'triptyques');
    const nom = `${saisie}${o.fouille ? ` (cran ${o.fouille})` : ''}`;
    if (!elegance) { fautes.push(`${nom} : pas de ligne Élégance`); continue; }
    if (l[0] !== elegance) fautes.push(`${nom} : l’Élégance n’est pas en tête`);
    if (ECARTEES.has(voie(elegance.url))) fautes.push(`${nom} : Élégance écartée par l’autrice — ${voie(elegance.url)}`);
    if (!propre(elegance) && l.some(propre)) fautes.push(`${nom} : Élégance bancale — ${voie(elegance.url)}`);
    if (abondance) {
      if (l[1] !== abondance) fautes.push(`${nom} : l’Abondance n’est pas 2ᵈᵉ`);
      if (ECARTEES.has(voie(abondance.url))) fautes.push(`${nom} : Abondance écartée par l’autrice — ${voie(abondance.url)}`);
      if (!propre(abondance)) fautes.push(`${nom} : Abondance bancale — ${voie(abondance.url)}`);
      if ((abondance.series || 1) <= (elegance.series || 1)) {
        fautes.push(`${nom} : l’Abondance (${abondance.series}×) n’aligne pas plus que l’Élégance (${elegance.series}×)`);
      }
    }
  }
  assert.deepEqual(fautes, []);
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
