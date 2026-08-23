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
  m1: 'alphabet', m2: 'alphabet',
  md: 'sevenSeg', me: 'sevenSeg',
  mf: 'countStrokes', mg: 'countStrokes', mh: 'countStrokes',
  mi: 'countStrokes', mj: 'countStrokes', mk: 'countStrokes',
  ml: 'keyboard', mm: 'keyboard', mn: 'keyboard', mo: 'keyboard',
  mv: 'keyboard',
});

/**
 * Le vocabulaire fermé des ops — CONTRACTS §3.1, dix-neuf primitives, pas une
 * de plus. Le socle de dix-sept, plus `partition` (découper en sous-groupes)
 * et `alphabet` (la réglette numérotée), ajoutées selon la clause d'extension
 * du contrat.
 */
const OPS_AUTORISEES = new Set([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'alphabet',
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
        assert.equal(typeof o.target, 'string', `${code} : « ${attendue} » travaille jeton par jeton`);
        if (attendue === 'alphabet') {
          // Le contrôle croisé de la réglette n'est pas `count` mais `to.text` :
          // c'est le rang qui redescend de la case, et la primitive refuse de
          // le faire descendre s'il diffère de ce que la réglette montre.
          assert.match(String(o.letter), /^[A-Z]$/, `${code} : « letter » manquant ou non replié`);
          assert.ok(['a1z26', 'z26a1'].includes(o.ordre), `${code} : numérotation inconnue`);
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si la réglette montrait autre chose que le nombre annoncé');
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
      if (attendue === 'keyboard' || attendue === 'alphabet') {
        // Une op de caméra par step, jamais deux : elles se contrediraient.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » animeraient deux fois la caméra`);
        }
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
