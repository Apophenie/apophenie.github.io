/**
 * Le catalogue — grammaire des codes, **gel des codes publiés**, pureté.
 *
 * Le tableau `VECTEURS` est le test de non-régression exigé par CONTRACTS §4.1 :
 * un vecteur `code → entrée → sortie` par opérateur publié. Changer le
 * comportement d'un code casse ce test — et la règle est alors d'**allouer un
 * nouveau code** en dépréciant l'ancien, jamais de modifier celui-ci : les liens
 * partagés doivent continuer à rejouer la même démonstration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOGUE, PAR_CODE, PAR_ID, appliquer, etapes, idsApres, derouler,
  rangCode, operateursActifs, operateursDepuis, JOKER, LANGUES,
} from './catalogue.js';
import {
  depuisSaisie, tokens, nums, num, NUM_MIN, NUM_MAX, estEtat,
} from './etat.js';

const S = (v) => depuisSaisie(v);
const T = (v) => tokens(v, v.map((_, i) => [[i, i + 1]]));
const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const U = (v) => num(v, [[0, 1]]);
const HOPE = ['h', 'o', 'p', 'e'];

/**
 * ★ Registre gelé — `code`, état d'entrée, valeur de sortie attendue.
 * Les valeurs des mappeurs sont celles de `research §2.3` / `§3.1`, à une
 * exception documentée près : `mi` (extrémités bas de casse) rend `3` pour le
 * `h`, conformément à l'écart assumé de `tables/derivees.js`.
 */
const VECTEURS = [
  ['f1', S('https://hope.fr'), 'hope.fr'],
  ['f2', S('www.hope.fr'), 'hope.fr'],
  ['f3', S('hope.fr'), 'hope'],
  ['f4', S('hope.fr/a/b'), 'hope.fr'],
  ['f5', S('hope.fr/a/b'), 'a/b'],
  ['f6', S('h0pe-2'), 'hpe'],
  ['f7', S('hope'), 'oe'],
  ['f8', S('hopey'), 'oey'],
  ['f9', S('hope'), 'hp'],
  ['fa', S('hello'), 'helo'],
  ['fb', S('hello'), 'll'],
  ['fc', S('le chat dort'), 'lcd'],
  ['fd', S('hope-hope-hope'), 'hope'],
  ['fe', S('hope'), 'espoir'],
  ['ff', S('espoir'), 'hope'],
  ['fg', S('hope'), 'HOPE'],
  ['fh', S('HOPE'), 'hope'],
  ['fi', S('créé'), 'cree'],
  ['fj', S('h0p3'), 'hope'],
  ['fk', S('hope'), 'slkv'],
  ['fl', S('hope'), 'ubcr'],
  ['t1', S('hope'), ['h', 'o', 'p', 'e']],
  ['t2', S('a-b.c'), ['a', 'b', 'c']],
  ['t3', S('a-b.c'), ['-', '.']],
  ['t4', S('espoir'), ['es', 'poir']],
  ['t5', U(44), [4, 4]],
  ['n1', S('hope'), 4],
  ['n2', S('hope'), 2],
  ['n3', S('hope'), 2],
  ['n4', S('hello'), 4],
  ['n5', S('a-b.c'), 2],
  ['n6', S('a-b.c'), 3],
  ['n7', S('hope'), 6],
  ['n8', S('hope'), 6],
  ['m1', T(HOPE), [8, 15, 16, 5]],
  ['m2', T(HOPE), [19, 12, 11, 22]],
  ['m3', T(HOPE), [8, 6, 7, 5]],
  ['m4', T(HOPE), [5, 7, 8, 5]],
  ['m5', T(HOPE), [48, 90, 96, 30]],
  ['m6', T(HOPE), [4, 1, 3, 1]],
  ['m7', T(HOPE), [4, 1, 3, 1]],
  ['m8', T(HOPE), [4, 6, 7, 3]],
  ['m9', T(HOPE), [4, 3, 4, 1]],
  ['ma', T(HOPE), [0, 3, 2, 0]],
  ['mb', T(HOPE), [72, 79, 80, 69]],
  ['mc', T(HOPE), [104, 111, 112, 101]],
  ['md', T(HOPE), [5, 6, 5, 5]],
  ['me', T(HOPE), [3, 4, 4, 4]],
  ['mf', T(HOPE), [3, 1, 2, 4]],
  ['mg', T(HOPE), [2, 1, 2, 2]],
  ['mh', T(HOPE), [4, 0, 1, 3]],
  ['mi', T(HOPE), [3, 0, 1, 1]],
  ['mj', T(HOPE), [0, 1, 1, 0]],
  ['mk', T(HOPE), [0, 1, 1, 1]],
  ['ml', T(HOPE), [6, 9, 10, 3]],
  ['mm', T(HOPE), [2, 1, 1, 1]],
  ['mn', T(HOPE), [6, 9, 10, 3]],
  ['mo', T(HOPE), [2, 1, 1, 1]],
  ['mp', T(HOPE), [8, 70, 80, 5]],
  ['mq', T(HOPE), [8, 70, 80, 5]],
  ['mr', T(HOPE), [5, 1, 2, 1]],
  ['ms', T(['hope', 'fr']), [4, 2]],
  ['mt', N([44, 15]), [8, 6]],
  ['mu', N([8, 0, 15]), [8, 15]],
  // ★ « le tiret du 6 » : les deux séparateurs de hope-hope-hope valent 6 et 6.
  ['mv', T(['-', '-']), [6, 6]],
  // ★ Quatorze segments. `HOPE` y vaut 6·6·6·6 — sept lettres valent 6 segments
  // (`D E G H N O P`) contre deux en sept segments. Les traits fusionnés, eux,
  // retombent sur 3·4·4·4, le vecteur même de la méthode 5 du README : deux
  // afficheurs, deux dessins, un seul compte.
  ['mw', T(HOPE), [6, 6, 6, 6]],
  ['mx', T(HOPE), [3, 4, 4, 4]],
  // ★ « On retourne les 9 » — le pendant vectoriel de `p9`. Les 9 deviennent
  // des 6, tout le reste est laissé strictement en place, y compris le −9 :
  // un demi-tour ne sait rien faire d'un signe.
  ['my', N([3, 9, 6, -9]), [3, 6, 6, -9]],
  // ★ « Trois 6 d'affilée » — le 666 est DÉJÀ écrit dans le vecteur, contigu ;
  // on le garde et l'on efface le reste. Ce n'est pas un tri : trois 6 dispersés
  // ne conviennent pas (voir le test dédié plus bas).
  ['mz', N([6, 6, 6, 7, 3, 6]), [6, 6, 6]],
  // ★ LES TROIS FICELLES ASSUMÉES — codes neufs, alloués le registre FERMÉ
  // (CONTRACTS §4.1). `mz` était le dernier ; l'index est en base36, et 36 s'y
  // écrit « 10 ». Les trois vecteurs sont EXACTEMENT les cas que l'auteur a
  // nommés dans sa demande, et c'est délibéré : ce qui est gelé ici, c'est ce
  // qu'il a demandé, pas ce que l'implémentation a trouvé commode.
  //
  // « Le plus fréquent l'emporte » : sur `[6,4,6,6,6]`, le 4 s'en va.
  ['m10', N([6, 4, 6, 6, 6]), [6, 6, 6, 6]],
  // « Garder un caractère sur deux » : sur `[4,6,4,6,4,6,4]`, c'est la parité
  // des rangs PAIRS (2ᵉ, 4ᵉ, 6ᵉ) qui porte les trois 6, et c'est elle qui reste.
  ['m11', N([4, 6, 4, 6, 4, 6, 4]), [6, 6, 6]],
  // « L'addition sélective » : `6, 5, 16, 8` → `6, 5+1, 6, 8` → `666, 8`.
  ['m12', N([6, 5, 16, 8]), [6, 6, 6, 8]],
  ['c1', N([8, 15, 16, 5]), 44],
  ['c2', N([8, 15, 16, 5]), -28],
  ['c3', N([8, 15, 16, 5]), 9600],
  ['c4', N([8, 15, 16, 5]), 4],
  ['c5', N([8, 15, 16, 5]), 11],
  ['c6', N([8, 15, 16, 5]), 11],
  ['c7', N([8, 15, 16, 5]), 4],
  ['c8', N([8, 15, 16, 5]), 815165],
  ['c9', N([8, 15, 16, 5]), 16],
  ['ca', N([8, 15, 16, 5]), 5],
  ['cb', T(HOPE), 4],
  ['cc', T(['a', 'a', 'b']), 2],
  ['p1', U(44), 8],
  ['p2', U(44), 8],
  ['p3', U(-28), 28],
  ['p4', U(-28), 6],
  ['p5', U(28), 6],
  ['p6', U(28), 82],
  ['p7', U(3), 6],
  ['p8', U(44), 8],
  ['p9', U(9), 6],
  ['pa', U(29), 11],
  ['pb', U(44), 4],
  ['j1', U(4), 6],
];

/**
 * ★ Gestes dédiés du vocabulaire fermé (CONTRACTS §0.3 / §3.1).
 *
 * Ces méthodes comptent quelque chose de VISIBLE : le spectateur doit voir
 * l'afficheur s'allumer, ou le glyphe se redessiner trait par trait. Retomber
 * sur une substitution commentée serait une régression silencieuse — la
 * démonstration continuerait de « marcher », mais elle cesserait de prouver.
 */
const PRIMITIVE_ATTENDUE = Object.freeze({
  m1: 'table', m2: 'table', m3: 'table', m4: 'table', m5: 'table',
  m6: 'table', m7: 'table', m8: 'table', m9: 'table', ma: 'table',
  mb: 'table', mc: 'table', mp: 'table', mq: 'table', mr: 'table',
  md: 'sevenSeg', me: 'sevenSeg',
  mw: 'fourteenSeg', mx: 'fourteenSeg',
  mf: 'countStrokes', mg: 'countStrokes', mh: 'countStrokes',
  mi: 'countStrokes', mj: 'countStrokes', mk: 'countStrokes',
  ml: 'keyboard', mm: 'keyboard', mn: 'keyboard', mo: 'keyboard',
  mv: 'keyboard',
  // ★ `mz` n'émet plus `horns`. Les cornes ne sont plus le geste d'un
  //   OPÉRATEUR — elles ne changent aucune valeur, elles n'ont donc rien à
  //   faire dans un programme ni dans une URL —, et l'assemblage les pose
  //   désormais sur la ligne, en registre scénique
  //   (`recherche/scenario.js › couronnerLesTriptyques`). Ce qui reste ici est
  //   la seule moitié qui soit de l'arithmétique : la gomme qui tronque le
  //   vecteur à ses trois 6 contigus.
  mz: 'drop',
});

/**
 * Le vocabulaire fermé des ops — CONTRACTS §3.1, vingt et une primitives, pas
 * une de plus. Le socle de dix-sept, plus `partition` (découper en
 * sous-groupes), `table` (la table de correspondance affichée — réglette,
 * glissière ou pavé), `fourteenSeg` (l'afficheur quatorze segments) et `horns`
 * (les cornes du 666 déjà formé), ajoutées selon la clause d'extension du
 * contrat.
 */
const OPS_AUTORISEES = new Set([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns',
]);

test('grammaire, unicité et ordre croissant des codes (CONTRACTS §4.1)', () => {
  const vus = new Set();
  let precedent = 0;
  for (const op of CATALOGUE) {
    assert.match(op.code, /^[ftnmcpj][0-9a-z]+$/, `code hors grammaire : ${op.code}`);
    assert.ok(!vus.has(op.code), `code dupliqué : ${op.code}`);
    vus.add(op.code);
    const r = rangCode(op.code);
    assert.ok(r !== null && r > precedent, `ordre de déclaration rompu en ${op.code}`);
    precedent = r;
  }
  assert.equal(rangCode('m0'), null, 'un index base36 commence à 1');
  assert.equal(rangCode('z1'), null, 'préfixe de famille inconnu');
  assert.equal(rangCode('f01'), null, 'pas de zéro de tête');
});

test('le code p9 est réservé au retournement du 9', () => {
  const op = PAR_CODE.get('p9');
  assert.equal(op.id, 'p.retournement');
  assert.equal(appliquer(op, U(9)).valeur, 6);
  assert.equal(appliquer(op, U(6)), null, 'on ne retourne pas le 6');
});

/**
 * ★ `mz` — « trois 6 d'affilée » est une TROUVAILLE, pas un tri.
 *
 * Toute la valeur de cet opérateur tient dans ce qu'il REFUSE. S'il acceptait
 * des 6 non contigus, il cesserait d'être « le 666 était déjà écrit » pour
 * devenir « on ne garde que les 6 » — une étape que la doctrine du projet
 * réserve à l'avant-dernier rang et fait payer au score (CONTRACTS §3.1). Ces
 * refus sont donc le cœur du contrat, pas des cas limites.
 */
test('★ le code mz ne trouve que trois 6 CONTIGUS, et refuse tout le reste', () => {
  const op = PAR_CODE.get('mz');
  assert.equal(op.id, 'm.troisSixDAffilee');
  assert.equal(op.from, 'NUMS');
  assert.equal(op.to, 'NUMS');

  const sortie = (v) => { const r = appliquer(op, N(v)); return r && r.valeur; };

  // Ce qu'il trouve : une suite de trois, où qu'elle commence.
  assert.deepEqual(sortie([6, 6, 6, 7, 3, 6]), [6, 6, 6], 'Donald en quatorze segments');
  assert.deepEqual(sortie([6, 6, 6, 4, 4]), [6, 6, 6], 'Trump en César puis quatorze segments');
  assert.deepEqual(sortie([1, 6, 6, 6, 1]), [6, 6, 6], 'la suite peut être au milieu');

  // Ce qu'il refuse, et c'est le point : des 6 SÉPARÉS, même nombreux.
  assert.equal(sortie([6, 6, 7, 6]), null, 'trois 6 dont deux voisins ne font pas un 666');
  assert.equal(sortie([6, 1, 6, 1, 6, 1, 6]), null, 'quatre 6 dispersés : toujours pas');
  assert.equal(sortie([6, 6]), null, 'deux 6 ne font pas trois');
  assert.equal(sortie([6, 6, 7, 6, 6]), null, 'deux paires ne font pas un triplet');

  // Et il refuse aussi de ne rien faire : sans reste à effacer, l'étape
  // n'aurait rien à montrer, et l'URL porterait un code invisible à l'écran.
  assert.equal(sortie([6, 6, 6]), null, 'un vecteur déjà réduit n’a pas besoin de l’être');

  // Déterminisme : plusieurs suites, on prend LA PREMIÈRE — lire, pas comparer.
  // Les traces le prouvent mieux que les valeurs, qui sont identiques.
  const r = appliquer(op, N([7, 6, 6, 6, 1, 6, 6, 6]));
  assert.deepEqual(r.valeur, [6, 6, 6]);
  assert.deepEqual(r.origines.map((t) => t[0][0]), [1, 2, 3], 'la première suite, pas la seconde');

  // Une suite plus longue est ramenée à trois : 666 fait trois 6, pas quatre,
  // et le verdict se refuse à décider lui-même où couper (`reveal.js`).
  assert.deepEqual(sortie([6, 6, 6, 6]), [6, 6, 6]);
});

test('★ gel des codes publiés : chaque code rend exactement la même sortie', () => {
  assert.equal(VECTEURS.length, CATALOGUE.length, 'un vecteur par opérateur publié');
  const couverts = new Set(VECTEURS.map(([c]) => c));
  for (const op of CATALOGUE) assert.ok(couverts.has(op.code), `pas de vecteur pour ${op.code}`);
  for (const [code, entree, attendu] of VECTEURS) {
    const op = PAR_CODE.get(code);
    assert.ok(op, `code inconnu : ${code}`);
    const sortie = appliquer(op, entree);
    assert.ok(sortie !== null, `${code} (${op.id}) : rendu null au lieu de ${JSON.stringify(attendu)}`);
    assert.deepEqual(sortie.valeur, attendu, `${code} (${op.id})`);
    assert.equal(sortie.type, op.to);
  }
});

test('métadonnées de classement complètes (heuristique §7.2)', () => {
  for (const op of CATALOGUE) {
    assert.ok(op.notoriete >= 0 && op.notoriete <= 1, op.id);
    assert.ok(op.adHoc >= 0 && op.adHoc <= 1, op.id);
    assert.equal(typeof op.commute, 'boolean');
    for (const langue of LANGUES) {
      assert.ok(op.libelle[langue].length > 3 && op.regle[langue].length > 3, `${op.id} (${langue})`);
    }
    assert.ok(Object.isFrozen(op), `${op.id} n'est pas gelé`);
  }
});

test('pureté : deux applications identiques, aucune mutation de l’entrée', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const avant = JSON.stringify(entree);
    const a = appliquer(op, entree);
    const b = appliquer(op, entree);
    assert.equal(JSON.stringify(entree), avant, `${code} a muté son entrée`);
    assert.deepEqual(a && a.valeur, b && b.valeur, `${code} n'est pas déterministe`);
    assert.deepEqual(a && a.traces, b && b.traces, `${code} : traces instables`);
  }
});

test('aucune exception, jamais : « null » est le seul signal d’échec', () => {
  const pieges = [
    depuisSaisie(''), depuisSaisie('666'), depuisSaisie('!!!'), depuisSaisie('   '),
    depuisSaisie('a'), depuisSaisie('🙂🙃'), depuisSaisie('ÉCOLE'), depuisSaisie('a'.repeat(500)),
    tokens([], []), tokens(['']), T(['hope']), T(['4', '2']),
    nums([], []), N([0]), N([-3, 0, 999999]),
    num(0), num(-999999), num(1000000), num(9),
  ];
  for (const op of CATALOGUE) {
    for (const e of pieges) {
      if (!e) continue;
      const r = appliquer(op, e);
      assert.ok(r === null || estEtat(r), `${op.id} : sortie invalide`);
      if (r && r.type === 'NUM') {
        assert.ok(r.valeur >= NUM_MIN && r.valeur <= NUM_MAX, `${op.id} : NUM hors bornes`);
      }
      if (r && r.type === 'NUMS') {
        for (const v of r.valeur) assert.ok(v >= NUM_MIN && v <= NUM_MAX, `${op.id} : NUMS hors bornes`);
      }
    }
  }
});

test('bornes : un NUM hors de [-10⁶, 10⁶] fait retourner null', () => {
  const grand = nums([999999, 999999], [[[0, 1]], [[1, 2]]]);
  assert.equal(appliquer(PAR_CODE.get('c1'), grand), null, 'somme hors bornes');
  assert.equal(appliquer(PAR_CODE.get('c3'), grand), null, 'produit hors bornes');
  assert.equal(num(1e6 + 1), null);
  assert.equal(num(-1e6 - 1), null);
  assert.equal(num(1e6).valeur, 1e6);
});

test('les traces remontent jusqu’à la saisie d’origine', () => {
  const r = derouler(['f3', 'fd', 't1', 'm1', 'c1', 'p1'], S('hope-hope-hope.fr'));
  assert.ok(r);
  assert.equal(r.etat.valeur, 8);
  assert.deepEqual(r.etat.traces, [[0, 4]], 'le 8 vient des quatre premiers caractères');
  const tokensEtape = r.etapes[2].apres;
  assert.deepEqual(tokensEtape.origines, [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]]);
  for (const et of r.etapes) {
    assert.ok(Array.isArray(et.apres.traces) && et.apres.traces.length > 0, `${et.code} sans trace`);
  }
});

test('les couvertures désignent bien ce qui est consommé', () => {
  assert.deepEqual(PAR_CODE.get('f1').couverture('https://hope.fr'), [[0, 8]]);
  assert.deepEqual(PAR_CODE.get('f2').couverture('www.hope.fr'), [[0, 4]]);
  assert.deepEqual(PAR_CODE.get('f3').couverture('hope.fr'), [[4, 7]]);
  assert.deepEqual(PAR_CODE.get('fd').couverture('hope-hope-hope'), [[0, 4], [5, 9], [10, 14]]);
});

/**
 * ★ LES TROIS FICELLES SE MONTRENT — `m10`, `m11`, `m12`.
 *
 * Ce sont des astuces assumées, et l'auteur a dit exactement comment elles
 * doivent paraître. Une régression silencieuse vers le rendu générique
 * (`scenario.js` retombe dessus sans rien casser) leur ferait AFFIRMER ce
 * qu'elles doivent MONTRER — c'est la doctrine §0.3, et c'est ici qu'on la gèle.
 *
 *  · `m10` — « indique sous l'accolade : "chiffre majoritaire : 6" et fais
 *    disparaître les autres » ; l'accolade embrasse la ligne ENTIÈRE, puisque
 *    c'est sur elle entière qu'on a compté ;
 *  · `m11` — « l'astuce est de nommer "position paire" ou "position impaire"
 *    pour justifier de supprimer l'autre » : le nom est écrit, la parité aussi ;
 *  · `m12` — « ne pas la différencier des additions qui la précèdent ou la
 *    succèdent » : des `+` ordinaires, entre les seuls termes retenus, et un
 *    `sum` qui recoupe la somme. Les 6 déjà là ne sont jamais des opérandes.
 */
test('★ les trois ficelles se MONTRENT — accolade nommée, additions ordinaires', () => {
  const geste = (code, entree) => {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : l'opérateur doit s'appliquer au vecteur du gel`);
    const ctx = { ids: entree.valeur.map((_, i) => `t${i}`), cle: 'e0' };
    return { op, entree, apres, ctx, steps: etapes(op, entree, apres, ctx) };
  };

  // ── m10 : l'accolade dit le verdict, puis les minoritaires tombent
  {
    const { entree, ctx, steps } = geste('m10', N([6, 4, 6, 6, 6]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.ok(acc, 'm10 : pas d’accolade — le verdict serait affirmé sans être posé');
    assert.equal(acc.label, 'chiffre majoritaire : 6',
      'm10 : l’accolade doit nommer le chiffre majoritaire, et le bon');
    assert.deepEqual(acc.targets, ctx.ids,
      'm10 : on a compté sur la ligne ENTIÈRE, l’accolade doit l’embrasser entière');
    const chute = ops.find((o) => o.op === 'drop');
    assert.deepEqual(chute.targets, ['t1'], 'm10 : seul le 4 minoritaire tombe');
    assert.ok(steps[0].caption.includes('6 ×4'),
      'm10 : le Registre doit porter le relevé, pour qu’on refasse le compte');
    // ★ L'étiquette est DÉRIVÉE du vecteur, jamais écrite en dur : elle sort du
    //   même relevé qu'`apply()`. Et quand le plus fréquent n'est pas un 6,
    //   l'opérateur ne le remplace pas par un 6 — il REFUSE de s'appliquer
    //   (`elegance.test.js`, « à égalité, la règle refuse au lieu de choisir »).
    assert.equal(appliquer(PAR_CODE.get('m10'), N([4, 6, 4, 4, 4])), null,
      'm10 : une majorité de 4 n’écrit pas 666 — on renonce, on ne truque pas');
    assert.equal(entree.valeur.length, 5);
  }

  // ── m11 : la parité est NOMMÉE, franchement
  {
    const { ctx, steps } = geste('m11', N([4, 6, 4, 6, 4, 6, 4]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.equal(acc.label, 'on ne garde que les positions paires',
      'm11 : la parité retenue doit être nommée — c’est TOUTE l’astuce');
    assert.deepEqual(ops.find((o) => o.op === 'drop').targets, ['t0', 't2', 't4', 't6'],
      'm11 : les positions impaires tombent, et elles seules');
    assert.deepEqual(ops.find((o) => o.op === 'highlight').targets, ['t1', 't3', 't5']);
    assert.ok(steps[0].caption.includes('positions impaires : 0 six'),
      'm11 : le Registre doit donner le relevé des DEUX parités');
    assert.equal(ctx.ids.length, 7);
  }

  // ── m12 : des additions ordinaires, sur les seuls termes retenus
  {
    const { steps } = geste('m12', N([6, 5, 16, 8]));
    const ops = steps.flatMap((s) => s.ops);
    // 1. `16` s'écrit chiffre à chiffre, sinon « 5+1 » n'a pas de « 1 »
    const eclat = ops.find((o) => o.op === 'substitute');
    assert.ok(eclat, 'm12 : `16` doit être écrit chiffre à chiffre avant qu’on additionne');
    assert.deepEqual(eclat.pairs[0].to.map((t) => t.text), ['1', '6']);
    // 2. les `+` ne paraissent qu'entre les termes retenus
    const signes = ops.filter((o) => o.op === 'insertOperators');
    assert.equal(signes.length, 1, 'm12 : une seule addition sur ce vecteur');
    assert.equal(signes[0].between.length, 2, 'm12 : `5+1` porte sur DEUX termes');
    assert.equal(signes[0].glyph, '+');
    // 3. la somme est recoupée par la primitive elle-même
    const somme = ops.find((o) => o.op === 'sum');
    assert.equal(somme.to.text, '6', 'm12 : ce qui descend sous la pointe est le 6 obtenu');
    assert.deepEqual(somme.targets, signes[0].between,
      'm12 : on additionne exactement les termes entre lesquels le + est paru');
  }
});

test('steps : vocabulaire fermé, JSON pur, identifiants nommés par l’émetteur', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    const n = entree.type === 'STR' ? [...entree.valeur].length
      : entree.type === 'NUM' ? 1 : entree.valeur.length;
    const ctx = { ids: Array.from({ length: n }, (_, i) => `t${i}`), cle: 'e0' };
    const steps = etapes(op, entree, apres, ctx);
    assert.ok(Array.isArray(steps) && steps.length >= 1, `${code} : aucun step`);

    // pureté : sérialisable, aucune fonction
    assert.deepEqual(JSON.parse(JSON.stringify(steps)), steps, `${code} : steps non purs`);

    const connus = new Set(ctx.ids);
    const idsSteps = new Set();
    for (const step of steps) {
      assert.ok(step.id && !idsSteps.has(step.id), `${code} : id de step manquant ou dupliqué`);
      idsSteps.add(step.id);
      assert.ok(typeof step.title === 'string' && step.title.trim(), `${code} : titre vide`);
      for (const o of step.ops) {
        assert.ok(OPS_AUTORISEES.has(o.op), `${code} : op « ${o.op} » hors vocabulaire`);
        for (const g of o.groups || []) {
          for (const cible of [].concat(g.targets || [])) {
            assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
          }
        }
        for (const cible of [].concat(o.targets || [], o.target || [], o.between || [])) {
          assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
        }
        for (const p of o.pairs || []) {
          assert.ok(connus.has(p.target), `${code} : paire sur un id inconnu « ${p.target} »`);
          // `to` est soit un token, soit une LISTE de tokens (éclatement 1 → n,
          // CONTRACTS §3 / src/visuel/primitives/substitute.js).
          for (const t of [].concat(p.to || [])) connus.add(t.id);
        }
        for (const d of o.digits || []) connus.add(d.id);
        for (const id of o.ids || []) connus.add(id);
        if (o.to && o.to.id) connus.add(o.to.id);
      }
    }

    // les identifiants annoncés par `sortie` existent bien dans la scène
    for (const id of idsApres(op, entree, apres, ctx)) {
      assert.ok(connus.has(id), `${code} : l'id de sortie « ${id} » n'a jamais été créé`);
    }

    // ★ le geste dédié est bien émis, et il porte de quoi être vérifié
    const attendue = PRIMITIVE_ATTENDUE[code];
    if (attendue) {
      const emises = steps.flatMap((s) => s.ops).filter((o) => o.op === attendue);
      assert.ok(emises.length > 0,
        `${code} (${op.id}) : la primitive « ${attendue} » n'est pas émise — `
        + 'le comptage ne serait plus montré, seulement affirmé (CONTRACTS §0.3)');
      for (const o of emises) {
        if (code === 'mz') {
          // ★ L'EFFACEMENT NE TRAVAILLE PAS JETON PAR JETON, et son contrôle
          // croisé n'est ni `count` ni `to.text` : c'est le MOTIF. « Si elle
          // n'a pas de motif, c'est probablement la pire des triches »
          // (l'auteur). Ici le motif est la CONTIGUÏTÉ, et il est montré avant
          // d'être exercé — un `highlight` désigne les trois 6 qu'on garde,
          // puis la gomme n'emporte que le reste. On vérifie donc les deux
          // ensemble : que les désignés sont bien trois 6 consécutifs de la
          // ligne, et que ce qui tombe est exactement leur complément.
          const designe = steps.flatMap((st) => st.ops)
            .find((x) => x.op === 'highlight' && Array.isArray(x.targets));
          assert.ok(designe, `${code} : rien ne DÉSIGNE ce qu'on garde — l'effacement serait sans motif`);
          assert.equal(designe.targets.length, 3, `${code} : on garde les trois 6 du 666, ni deux ni quatre`);
          const rangs = designe.targets.map((id) => ctx.ids.indexOf(id));
          assert.ok(rangs.every((r) => r >= 0), `${code} : un jeton désigné hors de la ligne`);
          assert.deepEqual(rangs, [rangs[0], rangs[0] + 1, rangs[0] + 2],
            `${code} : les trois 6 ne se touchent pas — ce serait un tri, pas une trouvaille`);
          for (const r of rangs) {
            assert.equal(String(entree.valeur[r]), '6',
              `${code} : on garderait autre chose qu'un 6`);
          }
          assert.equal(o.mode, 'erase', `${code} : la gomme efface sur place, elle ne fait pas tomber`);
          assert.equal(o.regroup, false, `${code} : rien ne se resserre — le 666 est déjà d'un seul tenant`);
          assert.deepEqual([...o.targets].sort(), ctx.ids.filter((id) => !designe.targets.includes(id)).sort(),
            `${code} : ce qui tombe doit être EXACTEMENT le complément de ce qu'on garde`);
          continue;
        }
        assert.equal(typeof o.target, 'string', `${code} : « ${attendue} » travaille jeton par jeton`);
        if (attendue === 'table') {
          // ★ L'aller-retour est INDIVIDUEL : une lettre monte, sa valeur
          // redescend, puis la suivante. Ce qui se mutualise, c'est le DÉCOR.
          // ★ Deux mises en page, pas trois : seul le clavier téléphonique met
          //   plusieurs lettres dans une case. Partout ailleurs, une case vaut
          //   une lettre et un nombre.
          assert.ok(['reglette', 'pave'].includes(o.disposition),
            `${code} : mise en page inconnue`);
          assert.ok(o.teinte === undefined || o.teinte === 'valeur',
            `${code} : encodage de teinte inconnu`);
          assert.ok(o.cycle === undefined || o.cycle === true,
            `${code} : « cycle » est un drapeau, pas un réglage`);
          // Le contrôle croisé n'est pas `count` mais la TABLE elle-même : elle
          // voyage dans l'op, dérivée de la fonction de l'opérateur, et la
          // primitive refuse de faire redescendre une valeur qui n'y est pas.
          assert.ok(Array.isArray(o.entries) && o.entries.length >= 26,
            `${code} : « entries » manquant — la conversion serait affirmée, pas montrée`);
          const cases = new Map(o.entries.map((e) => [e.char, String(e.value)]));
          assert.match(String(o.letter), /^[A-Z]$/, `${code} : « letter » manquant ou non replié`);
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si la table montrait autre chose que le nombre annoncé');
          assert.equal(cases.get(o.letter), String(o.to.text),
            `${code} : la table montrée et le nombre annoncé divergent sur « ${o.letter} »`);
        } else if (attendue === 'keyboard') {
          // Le contrôle croisé de `keyboard` n'est pas `count` mais `to.text` :
          // c'est le nombre qui redescend de la touche, et la primitive refuse
          // de le faire descendre s'il diffère de ce que le clavier montre.
          assert.equal(typeof o.key, 'string', `${code} : « key » manquant`);
          assert.ok(['azerty', 'qwerty'].includes(o.layout), `${code} : disposition inconnue`);
          assert.ok(['touche', 'colonne', 'rangee'].includes(o.mesure), `${code} : mesure inconnue`);
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si le clavier montrait autre chose que le nombre annoncé');
        } else {
          assert.equal(typeof o.count, 'number',
            `${code} : « count » manquant — c'est lui qui fait échouer la compilation `
            + 'si le tracé montré et le nombre annoncé divergeaient');
        }
      }
      if (attendue === 'keyboard' || attendue === 'table') {
        // Une op de caméra par step, jamais deux : elles se contrediraient.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » animeraient deux fois la caméra`);
        }
      }
      if (attendue === 'table') {
        // ★ Le décor est mutualisé : déployé UNE fois, retiré UNE fois. Entre
        // les deux la table reste montée — c'est là qu'est l'économie, pas
        // dans l'aller-retour, qui reste entier pour chaque lettre.
        assert.equal(emises.filter((o) => o.montre === true).length, 1,
          `${code} : la table doit se déployer exactement une fois`);
        assert.equal(emises.filter((o) => o.retire === true).length, 1,
          `${code} : la table doit se retirer exactement une fois`);
        assert.equal(emises[0].montre, true, `${code} : elle monte à la première lettre`);
        assert.equal(emises[emises.length - 1].retire, true, `${code} : elle part à la dernière`);
      }
      if (attendue === 'sevenSeg' || attendue === 'countStrokes') {
        // Un encart par step : deux comptages simultanés, c'est le fouillis
        // qu'on vient de retirer.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » ouvriraient deux encarts`);
        }
        for (const o of emises) {
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to » manquant — c'est le nombre du compteur qui remplace la lettre`);
        }
      }
      if (attendue === 'countStrokes') {
        for (const o of emises) {
          assert.match(o.glyph, /^[A-Za-z]$/, `${code} : « glyph » doit être le caractère redessiné`);
          assert.ok(['traits', 'extremites', 'boucles'].includes(o.mode), `${code} : mode inconnu`);
        }
      }
    }
  }
});

test('sélection : jokers, dépréciés et nombres maîtres hors recherche', () => {
  const actifs = operateursActifs();
  assert.ok(!actifs.some((o) => o.isJoker), 'le joker n’est jamais exploré');
  assert.ok(!actifs.some((o) => o.deprecated));
  assert.ok(!actifs.some((o) => o.id === 'p.racineMaitres'), 'nombres maîtres désactivés par défaut');
  assert.ok(operateursActifs({ maitres: true }).some((o) => o.id === 'p.racineMaitres'));
  assert.ok(operateursDepuis('STR').every((o) => o.from === 'STR'));
  const codes = operateursDepuis('TOKENS').map((o) => o.code);
  assert.deepEqual(codes, [...codes].sort((a, b) => rangCode(a) - rangCode(b)));
});

test('le joker français : tout chiffre atteint 6 en au plus trois étapes', () => {
  assert.equal(JOKER.isJoker, true);
  assert.equal(JOKER.adHoc, 0.5);
  for (let d = 0; d <= 9; d++) {
    let v = num(d, [[0, 1]]);
    let pas = 0;
    while (v.valeur !== 6 && pas < 5) { v = appliquer(JOKER, v); pas++; }
    assert.equal(v.valeur, 6, `${d} n’atteint pas 6`);
    assert.ok(pas <= 3, `${d} demande ${pas} étapes`);
  }
});

test('les identifiants d’opérateurs sont uniques et lisibles', () => {
  assert.equal(PAR_ID.size, CATALOGUE.length);
  for (const op of CATALOGUE) assert.match(op.id, /^[a-z]\.[A-Za-z0-9]+$/);
});
