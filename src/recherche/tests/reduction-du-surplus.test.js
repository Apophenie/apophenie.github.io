/** LA RÉDUCTION DU SURPLUS — un gain STRICT ou rien, et à déchet égal le meilleur global.
 *
 * > « Corrige, mais s'il y a différence de score global, c'est probablement à
 * >   prendre en compte. » (l'autrice)
 *
 * `assemblage.js › reduireLeSurplus` échange, portée par portée, un candidat
 * contre un autre pour réduire le déchet d'une moisson. Elle départageait à
 * déchet égal par homogénéité, et ce départage acceptait un échange qui
 * n'améliorait RIEN : la boucle faisait des allers-retours jusqu'à
 * `MAX_RETOUCHES`, et la variante finale dépendait de la PARITÉ du nombre
 * d'échanges.
 *
 * ⚠️ MESURÉ sur « Donald Trump » visant 666, moisson « clavier » : partie de
 *   `fatb+mt9+mr9` et `fr5+mt9+mr9`, elle ramenait « Trump » à `mt9+cmn` au 1ᵉʳ
 *   tour, puis échangeait `fatb` ⇄ `fr11` à déchet égal pendant trente-et-un
 *   tours et sortait en `fr11` ; partie de `fatb` et `mt9+cmn`, elle sortait en
 *   `fatb`.
 *
 * ★ LA RÈGLE, désormais : un remplacement ne se joue que s'il jette STRICTEMENT
 *   moins ; à déchet égal, pas d'aller-retour — on garde la variante au meilleur
 *   score GLOBAL (`evaluer`, celui de la carte), puis au meilleur score du
 *   moteur, puis dans l'ordre des codes. Ces tests-ci donnent à `evaluer` des
 *   scores choisis ; le cas réel de « Donald Trump » est dans la suite lente. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduireLeSurplus } from '../assemblage.js';

const candidat = (codes, six, total) => ({
  six, total, chiffres: Array(six).fill(6), chemin: { ops: codes.split('+').map((code) => ({ code })), etats: [] },
});
const FATB = candidat('fatb+tca+mt9+mr9', 5, 6);
const FR11 = candidat('fr11+tca+mt9+mr9', 5, 6);
const FR5 = candidat('fr5+tca+mt9+mr9', 3, 5);
const MT9_CMN = candidat('tca+mt9+cmn', 1, 1);
const donald = (candidats) => ({ debut: 0, longueur: 1, texte: 'Donald', candidats });
const TRUMP = { debut: 2, longueur: 1, texte: 'Trump', candidats: [FR5, MT9_CMN] };
const programmes = (retenus) => retenus.map((r) => r.candidat.chemin.ops.map((o) => o.code).join('+'));
const tous = () => true;
/** Un `evaluer` qui note une variante par la lecture de « Donald » qu'elle porte. */
const noterParDonald = (notes) => (retenus) => notes[programmes(retenus)[0]] || { global: 0, score: 0 };

test('★ réduction du surplus — « Donald Trump » : seul « Trump » s’améliore, « Donald » garde sa lecture au meilleur global', () => {
  const evaluer = noterParDonald({
    'fatb+tca+mt9+mr9': { global: 600, score: 4983 },
    'fr11+tca+mt9+mr9': { global: 580, score: 4723 },
  });
  const r = reduireLeSurplus([{ portee: donald([FATB, FR11]), candidat: FATB }, { portee: TRUMP, candidat: FR5 }], tous, '666', evaluer);
  assert.deepEqual(programmes(r), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn']);
});

test('★ réduction du surplus — le résultat ne dépend pas du point de départ', () => {
  const evaluer = noterParDonald({
    'fatb+tca+mt9+mr9': { global: 600, score: 4983 },
    'fr11+tca+mt9+mr9': { global: 580, score: 4723 },
  });
  const departs = [
    [{ portee: donald([FATB, FR11]), candidat: FATB }, { portee: TRUMP, candidat: FR5 }],
    [{ portee: donald([FATB, FR11]), candidat: FR11 }, { portee: TRUMP, candidat: FR5 }],
    [{ portee: donald([FR11, FATB]), candidat: FR11 }, { portee: TRUMP, candidat: MT9_CMN }],
    [{ portee: donald([FR11, FATB]), candidat: FATB }, { portee: TRUMP, candidat: MT9_CMN }],
  ];
  for (const depart of departs) {
    assert.deepEqual(programmes(reduireLeSurplus(depart, tous, '666', evaluer)), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn'],
      `départ ${programmes(depart).join(' , ')}`);
  }
});

test('à déchet égal, le GLOBAL départage — même contre le score du moteur', () => {
  // Le global préfère `fr11` alors que le moteur préfère `fatb` : c'est le global qui gagne.
  const evaluer = noterParDonald({
    'fatb+tca+mt9+mr9': { global: 580, score: 4983 },
    'fr11+tca+mt9+mr9': { global: 600, score: 4723 },
  });
  const r = reduireLeSurplus([{ portee: donald([FATB, FR11]), candidat: FATB }, { portee: TRUMP, candidat: FR5 }], tous, '666', evaluer);
  assert.deepEqual(programmes(r), ['fr11+tca+mt9+mr9', 'tca+mt9+cmn']);
});

test('à global égal, le score du moteur ; à scores égaux, l’ordre des codes', () => {
  const parMoteur = noterParDonald({
    'fatb+tca+mt9+mr9': { global: 600, score: 4700 },
    'fr11+tca+mt9+mr9': { global: 600, score: 4900 },
  });
  assert.deepEqual(programmes(reduireLeSurplus([{ portee: donald([FATB, FR11]), candidat: FATB }, { portee: TRUMP, candidat: MT9_CMN }], tous, '666', parMoteur)),
    ['fr11+tca+mt9+mr9', 'tca+mt9+cmn']);
  const egaux = noterParDonald({
    'fatb+tca+mt9+mr9': { global: 600, score: 4800 },
    'fr11+tca+mt9+mr9': { global: 600, score: 4800 },
  });
  // `fatb…` précède `fr11…` en unités de code : c'est lui qui reste, d'où qu'on parte.
  for (const depart of [FATB, FR11]) {
    assert.deepEqual(programmes(reduireLeSurplus([{ portee: donald([FR11, FATB]), candidat: depart }, { portee: TRUMP, candidat: MT9_CMN }], tous, '666', egaux)),
      ['fatb+tca+mt9+mr9', 'tca+mt9+cmn']);
  }
});

test('un remplacement ne se joue que pour un déchet STRICTEMENT moindre : sans gain, rien ne bouge', () => {
  let appels = 0;
  const evaluer = (retenus) => { appels += 1; return { global: 0, score: 0 }; };
  // Déjà exact et sans autre lecture à déchet égal sur « Trump » : aucun échange à envisager.
  const r = reduireLeSurplus([{ portee: donald([FATB]), candidat: FATB }, { portee: TRUMP, candidat: MT9_CMN }], tous, '666', evaluer);
  assert.deepEqual(programmes(r), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn']);
  assert.ok(appels <= 1, `sans alternative à départager, la note n’est pas recalculée en boucle (${appels} appels)`);
});

/* ★ (A) — un gain de déchet ne se paie pas en score global. Mesuré sans ce
     garde-fou sur `https://hope-hope-hope.fr/` : une moisson ×2 perdait 5 points
     de global pour un 6 jeté en moins. */
const noterParTrump = (notes) => (retenus) => notes[programmes(retenus)[1]] || { global: 0, score: 0 };

test('(A) — un gain strict de déchet qui fait baisser le global ne se joue pas', () => {
  const evaluer = noterParTrump({
    'fr5+tca+mt9+mr9': { global: 600, score: 4000 },
    'tca+mt9+cmn': { global: 590, score: 4983 },
  });
  const r = reduireLeSurplus([{ portee: donald([FATB]), candidat: FATB }, { portee: TRUMP, candidat: FR5 }], tous, '666', evaluer);
  assert.deepEqual(programmes(r), ['fatb+tca+mt9+mr9', 'fr5+tca+mt9+mr9'], 'jeter moins ne rachète pas un global plus bas');
});

test('(A) — un gain strict de déchet à global égal ou meilleur se joue', () => {
  for (const global of [600, 610]) {
    const evaluer = noterParTrump({
      'fr5+tca+mt9+mr9': { global: 600, score: 4000 },
      'tca+mt9+cmn': { global, score: 4983 },
    });
    const r = reduireLeSurplus([{ portee: donald([FATB]), candidat: FATB }, { portee: TRUMP, candidat: FR5 }], tous, '666', evaluer);
    assert.deepEqual(programmes(r), ['fatb+tca+mt9+mr9', 'tca+mt9+cmn'], `global ${global}`);
  }
});
