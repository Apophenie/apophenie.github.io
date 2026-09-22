/** UNE PLACE PAR FAMILLE — les réglages d'un même outil ne s'évincent plus.
 *
 * > « Les 25 césars comptent pour UNE famille : la meilleure variante prend la
 * >   place, et `m14`, `m7`, `mt9`… gardent la leur. » (l'autrice)
 *
 * La famille est PUBLIÉE par le catalogue (`assemblage.js › familleDeReglages`) ;
 * ces tests la lisent sur le catalogue réel, et vérifient qu'elle ouvre les
 * fenêtres de la moisson aux autres méthodes. La preuve de bout en bout — la voie
 * groupée de `hope-hope-hope.fr` fabriquée — est dans la suite lente
 * (`lents/recherche.test.js`). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { familleDeReglages, formeReglee, vecteursDeSix, rejouableSousLaCible } from '../assemblage.js';
import { operateursPourCible } from '../bfs.js';
import { methodesDeLApproche, mappeurApproche } from '../score.js';
import { catalogue } from './_catalogue.js';

const PAR_CODE = new Map(catalogue.map((op) => [op.code, op]));
const familleDe = (code) => familleDeReglages(PAR_CODE.get(code));
const OPS = operateursPourCible(catalogue, { defaut: true, texte: '666' });

/* ★ Ils étaient vingt-cinq ; ils sont TRENTE-NEUF depuis que les quatorze
     césars justifiés (`fj11`…`fj25`) ont rejoint le catalogue — même réglette,
     même décalage publié, mais le décalage se LIT dans la saisie au lieu d'être
     essayé (`filtres.js › lectureDesCommuns`).

     ⚠️ **C'est ici que se vérifie ce qui les empêche de doubler la liste.** La
     devinette de `familleDeReglages` retire les chiffres de FIN du code : sur
     `fj22` elle rendrait « fj », une famille à lui tout seul, et chaque voie
     justifiée aurait pris une place EN PLUS de sa jumelle arbitraire. Les
     quatorze publient donc `familleOutil: 'fr'`, et l'assertion ci-dessous est
     ce qui le tient : une seule famille pour les trente-neuf, donc une seule
     place dans la fenêtre — la meilleure. */
test('les césars, justifiés ou non, sont UNE famille, lue sur leur décalage', () => {
  const cesars = catalogue.filter((op) => Number.isFinite(op.decalage) && op.forme === 'glissiere');
  assert.equal(cesars.length, 39, 'le catalogue publie vingt-cinq décalages, plus quatorze justifiés');
  assert.deepEqual([...new Set(cesars.map(familleDeReglages))], ['fr']);
  assert.equal(familleDe('fj22'), familleDe('fr22'), 'le césar justifié règle le MÊME outil que son aîné');
});

test('les autres réglages publiés : traductions par sens, dédoublonnages, alternance, potence', () => {
  assert.equal(familleDe('ffr'), familleDe('ffr5'));
  assert.equal(familleDe('fen2'), familleDe('fen'));
  assert.notEqual(familleDe('ffr'), familleDe('fen'), 'traduire vers le français ou vers l’anglais : deux familles');
  assert.equal(familleDe('fd'), familleDe('fd4'));
  assert.equal(familleDe('cal'), familleDe('cali'), '`cali` publie sa `familleOutil`');
  assert.equal(familleDe('mdc3'), familleDe('md03'), 'la potence avec ou sans zéros de tête');
  assert.notEqual(familleDe('mdc3'), familleDe('mdc2'), 'le nombre de décimales reste une méthode (`reglageDe`)');
});

test('une méthode sans réglage publié n’a pas de famille — les claviers compris', () => {
  for (const code of ['m14', 'm7', 'mt9', 'tca', 'fl', 'fatb', 'mtc', 'mazc', 'mazr', 'mqwc']) {
    assert.equal(familleDe(code), null, `${code} n’est le réglage de rien`);
  }
});

test('la forme d’un chemin efface les réglages, et rien d’autre', () => {
  const chemin = (codes) => ({ ops: codes.split('+').map((c) => PAR_CODE.get(c)) });
  assert.equal(formeReglee(chemin('fr14+tca+m14')), formeReglee(chemin('fr9+tca+m14')));
  assert.notEqual(formeReglee(chemin('fr14+tca+m14')), formeReglee(chemin('tca+m14')));
  assert.notEqual(formeReglee(chemin('fr14+tca+m14')), formeReglee(chemin('fr14+tca+m7')));
});

/* ★ LA FENÊTRE DE « hope » — celle qui fermait la voie groupée. 606 chemins en
     mode matière ; `tca+m14` était 21ᵉ derrière des césars et des traductions,
     hors des vingt places que demande `candidatsDePortee`. */
test('★ sur « hope », les vingt places de la fenêtre par famille gardent `tca+m14`', () => {
  const v = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, parFamille: true });
  const programmes = v.map((c) => c.ops.map((o) => o.code).join('+'));
  assert.ok(programmes.includes('tca+m14'), `tca+m14 absent : ${programmes.join('  ')}`);
});

test('★ dans une fenêtre par famille pleine, aucune forme ne prend deux places tant qu’une autre attend', () => {
  const tout = vecteursDeSix('hope', OPS, 1, 1000, '666', { miseEnForme: false });
  const formesDuTout = new Set(tout.map(formeReglee));
  assert.ok(formesDuTout.size > 20, 'la portée offre plus de vingt formes : la fenêtre est disputée');
  const v = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, parFamille: true });
  const formes = v.map(formeReglee);
  assert.equal(new Set(formes).size, formes.length, `deux variantes d’une même forme : ${formes.join('  ')}`);
});

/* ★ LA FENÊTRE D'AVANT N'EST PAS TOUCHÉE — c'est ce qui garantit « zéro voie
     sortie » : la moisson récolte sur elle comme hier, et la fenêtre par famille
     ne fait qu'ajouter (`assemblage.js › moissons`, la réunion). */
test('sans `parFamille`, la matière rend la fenêtre d’avant, au chemin près', () => {
  const avant = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false });
  const programmes = avant.map((c) => c.ops.map((o) => o.code).join('+'));
  assert.ok(!programmes.includes('tca+m14'), 'la fenêtre d’avant, saturée de réglages, ne le gardait pas');
  const memo = new Map();
  const partage = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, memo });
  vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, memo, parFamille: true });
  assert.deepEqual(partage.map((c) => c.ops.map((o) => o.code).join('+')), programmes,
    'la fenêtre d’avant ne dépend pas du mémo');
  const relue = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, parFamille: true });
  const deMemo = vecteursDeSix('hope', OPS, 1, 20, '666', { miseEnForme: false, memo, parFamille: true });
  assert.deepEqual(deMemo.map((c) => c.ops.map((o) => o.code).join('+')), relue.map((c) => c.ops.map((o) => o.code).join('+')),
    'l’énumération partagée rend la même fenêtre par famille que le calcul direct');
});

test('les tables de la liaison gardent tous les réglages (`tousLesReglages`)', () => {
  const tous = vecteursDeSix('hope', OPS, 1, 1000, '666', { miseEnForme: false, tousLesReglages: true });
  const cesars = tous.filter((c) => c.ops.some((o) => familleDeReglages(o) === 'fr'));
  const decalages = new Set(cesars.flatMap((c) => c.ops.filter((o) => familleDeReglages(o) === 'fr').map((o) => o.decalage)));
  assert.ok(decalages.size > 1, 'plusieurs décalages restent offerts à qui les demande tous');
});

/* ★ LE QUOTA DE LA SÉLECTION DES FAMILLES SE COMPTE PAR MÉTHODES
     (`score.js › methodesDeLApproche`). Une MOISSON lit chaque portée par la
     sienne : la compter sous le mappeur de sa première portée lui faisait
     partager le quota du quatorze segments avec les deux champions de
     `hope-hope-hope.fr`, et la voie groupée n'entrait pas au cran 0. */
test('les méthodes d’une voie : son mappeur seul, ou l’ensemble rangé de ceux de ses portées', () => {
  const chemin = (codes) => ({ ops: codes.split('+').map((c) => PAR_CODE.get(c)) });
  const voie = (...programmes) => ({ parts: programmes.map((p) => ({ chemin: chemin(p) })) });
  assert.equal(methodesDeLApproche(voie('fl+tca+m14')), mappeurApproche(voie('fl+tca+m14')),
    'une voie à une portée garde son mappeur : rien ne change pour elle');
  const groupee = voie('tca+m14', 'tca+mtc', 'tca+m14', 'tca+mtc', 'tca+m14', 'tca+m7+cs');
  assert.equal(methodesDeLApproche(groupee), [PAR_CODE.get('m14').id, PAR_CODE.get('mtc').id, PAR_CODE.get('m7').id].sort().join('+'));
  assert.notEqual(methodesDeLApproche(groupee), mappeurApproche(groupee),
    'la moisson n’est plus comptée sous le mappeur de sa première portée');
  assert.equal(methodesDeLApproche(voie('tca+mtc', 'tca+m14')), methodesDeLApproche(voie('tca+m14', 'tca+mtc')),
    'l’ordre des portées ne change pas la clé');
});

/* ★ LA FENÊTRE PAR FAMILLE NE PROPOSE QUE DES CHEMINS REJOUABLES
     (`assemblage.js › rejouableSousLaCible`). Sous 666, la recherche explore le
     catalogue tel quel : `mr6` — bâti pour 999 — y est joué, mais la table du
     rejeu, qui résout chaque code par `viser`, ne le connaît pas. Mesuré sur
     `https://hope-hope-hope.fr/` : deux moissons nées de la fenêtre par famille
     portaient `tca+mtc+mr6+cs+pr9`, et leurs liens étaient refusés. */
test('un chemin est rejouable si le rejeu résout chacun de ses codes vers le même opérateur', () => {
  const chemin = (codes) => ({ ops: codes.split('+').map((c) => PAR_CODE.get(c)) });
  const CIBLE_666 = { texte: '666' };
  assert.equal(rejouableSousLaCible(chemin('tca+m14'), CIBLE_666), true, 'un opérateur qui ne lit pas la cible');
  assert.equal(rejouableSousLaCible(chemin('tca+m14+mpf'), CIBLE_666), true,
    '`mpf` lit la cible et vise 666 : le rejeu retrouve le même opérateur');
  assert.equal(rejouableSousLaCible(chemin('tca+mtc+mr6+cs+pr9'), CIBLE_666), false,
    '`mr6` est bâti pour 999 : le rejeu ne le connaît pas sous 666');
  // Ce qui rend le refus nécessaire : la recherche sous 666 explore bien `mr6`.
  assert.ok(OPS.some((o) => o.code === 'mr6'), 'sous 666, `mr6` est parmi les opérateurs explorés');
});
