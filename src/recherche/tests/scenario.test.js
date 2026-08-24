import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../index.js';
import {
  construireScenario, validerScenario, VOCABULAIRE, DUREE_MIN, elementsDe, validerFormeOp,
} from '../scenario.js';
import { etat } from '../bfs.js';
import { approcheJoker } from '../assemblage.js';
import { catalogue, operateur } from './_catalogue.js';

const SAISIES = ['https://hope-hope-hope.fr/', 'hope', 'macron', 'a', '666', 'jean-michel', 'Éléonore à Nîmes'];

test('scénario — toute approche produite est convertible et VALIDE', () => {
  const m = creerMoteur(catalogue);
  let n = 0;
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      const sc = m.scenarioDe(a, { saisie: r.saisie });
      assert.deepEqual(validerScenario(sc), [], `${s} — rang ${a.rang} (${a.codes})`);
      n++;
    }
  }
  console.log(`    ${n} scénarios émis, 0 violation d’invariant`);
});

test('scénario — les 8 invariants, un par un', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  const sc = m.scenarioDe(r.approches[0], { saisie: r.saisie });

  // 1 — version
  assert.equal(sc.version, 1);
  // 2 — ids de tokens uniques, non vides, stables
  const ids = sc.tokens.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of sc.tokens) assert.ok(t.id && typeof t.id === 'string' && t.text !== undefined && t.kind);
  // 3 + 4 — toute référence existe, aucun id recréé
  const vivants = new Set(ids);
  const crees = new Set(ids);
  for (const st of sc.steps) {
    for (const o of st.ops) {
      for (const ref of references(o)) assert.ok(vivants.has(ref), `${st.id}/${o.op} → ${ref}`);
      for (const id of creations(o)) {
        assert.ok(!crees.has(id), `id « ${id} » recréé`);
        crees.add(id);
        vivants.add(id);
      }
    }
  }
  // 5 — au moins un step, ids uniques, titres non vides
  assert.ok(sc.steps.length >= 1);
  assert.equal(new Set(sc.steps.map((s) => s.id)).size, sc.steps.length);
  for (const st of sc.steps) assert.ok(st.title.trim().length > 0);
  // 6 — durées : `scenario.js` n'émet PAS de `duration` (le compilateur la
  //     déduit de l'étendue réelle des ops) ; quand elle est fournie, elle doit
  //     tenir le minimum. La vérification après compilation est faite par
  //     `integration-visuel.test.js`.
  for (const st of sc.steps) {
    assert.ok(st.duration === undefined || st.duration >= DUREE_MIN, `${st.id} : ${st.duration} ms`);
    assert.ok(st.hold >= 0, `${st.id} : hold`);
  }
  // 7 — vocabulaire fermé
  for (const st of sc.steps) for (const o of st.ops) assert.ok(VOCABULAIRE.has(o.op), o.op);
  // 8 — pur : JSON sérialisable, structuredClone-able
  assert.doesNotThrow(() => structuredClone(sc));
  assert.deepEqual(JSON.parse(JSON.stringify(sc)), sc);
});

function references(o) {
  const r = [];
  const norm = (x) => (typeof x === 'string' ? [x] : Array.isArray(x) ? x.filter((y) => typeof y === 'string') : []);
  r.push(...norm(o.targets), ...norm(o.target), ...norm(o.between));
  for (const p of o.pairs || []) r.push(...norm(p.target), ...norm(p.targets));
  return r;
}

function creations(o) {
  const out = [];
  const add = (t) => {
    if (!t) return;
    if (Array.isArray(t)) { t.forEach(add); return; }
    if (typeof t === 'object' && t.id) out.push(t.id);
  };
  if (o.op === 'substitute') for (const p of o.pairs || []) add(p.to);
  else if (o.op === 'reduce') { if (o.to) add(o.to); else add(o.digits); } else add(o.to);
  return out;
}

/**
 * ★ LE PIÈGE DU MIROIR. `scenario.js` tient sa PROPRE copie du vocabulaire des
 * ops (`VOCABULAIRE`) et sa propre validation de forme (`validerFormeOp`) —
 * l'agent heuristique ne dépend pas du moteur visuel. Quand une primitive est
 * ajoutée d'un côté sans l'autre, rien n'échoue : `essayerCatalogue` note un
 * avertissement et retombe SILENCIEUSEMENT sur le rendu générique. La méthode
 * continue de « marcher » — elle cesse seulement de MONTRER ce qu'elle compte,
 * ce qui est précisément la faute que CONTRACTS §0.3 interdit.
 *
 * (Constaté en vrai : `fourteenSeg` ajouté au moteur visuel et au catalogue,
 * mais pas aux trois miroirs de `scenario.js` — la démonstration quatorze
 * segments substituait des nombres sans jamais allumer un segment.)
 */
/**
 * Les gestes dédiés attendus, code par code — le même contrat que
 * `src/moteur/catalogue.test.js › PRIMITIVE_ATTENDUE`, vérifié ici du côté du
 * PONT plutôt que du catalogue. Ces méthodes comptent quelque chose de VISIBLE.
 */
const GESTE_ATTENDU = {
  m1: 'alphabet', m2: 'alphabet',
  md: 'sevenSeg', me: 'sevenSeg',
  mw: 'fourteenSeg', mx: 'fourteenSeg',
  mf: 'countStrokes', mg: 'countStrokes', mh: 'countStrokes',
  mi: 'countStrokes', mj: 'countStrokes', mk: 'countStrokes',
  ml: 'keyboard', mm: 'keyboard', mn: 'keyboard', mo: 'keyboard',
};

test('★ scénario — aucun geste dédié ne retombe en silence sur le rendu générique', () => {
  const parCode = new Map((catalogue.operateurs || catalogue).map((o) => [o.code, o]));
  const entree = etat('TOKENS', ['h', 'o', 'p', 'e'], [[0, 4]]);
  const traces = [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]];
  for (const [code, geste] of Object.entries(GESTE_ATTENDU)) {
    const op = parCode.get(code);
    assert.ok(op, `${code} : opérateur disparu du catalogue`);
    const brut = op.apply(entree.valeur, traces);
    assert.ok(brut, `${code} : inapplicable à « hope »`);
    const apres = etat('NUMS', brut.valeur, [[0, 4]]);
    const steps = op.steps(entree, apres, {
      ids: ['t0', 't1', 't2', 't3'],
      cle: 'e0',
      langue: 'fr',
      elements: ['h', 'o', 'p', 'e'],
      cibles: brut.valeur.map(String),
      nouvelId: (p) => `${p}x`,
    });
    assert.ok(Array.isArray(steps) && steps.length, `${code} : aucun step`);
    const emis = new Set();
    for (const st of steps) {
      for (const o of st.ops) {
        // ★ LE PIÈGE DU MIROIR. `scenario.js` tient sa PROPRE copie du
        // vocabulaire et sa propre validation de forme (l'agent heuristique ne
        // dépend pas du moteur visuel). Quand une primitive est ajoutée d'un
        // côté sans l'autre, RIEN N'ÉCHOUE : `essayerCatalogue` note un
        // avertissement et retombe SILENCIEUSEMENT sur le rendu générique. La
        // méthode continue de « marcher » — elle cesse seulement de MONTRER ce
        // qu'elle compte, ce que CONTRACTS §0.3 interdit précisément.
        // (Constaté en vrai : `fourteenSeg` livré au moteur visuel et au
        // catalogue, absent des trois miroirs de `scenario.js` — la
        // démonstration substituait des nombres sans allumer un seul segment.)
        assert.ok(VOCABULAIRE.has(o.op),
          `${code} : l'op « ${o.op} » manque au VOCABULAIRE de scenario.js`);
        assert.equal(validerFormeOp(o), null,
          `${code} : validerFormeOp refuse l'op « ${o.op} » que l'opérateur émet`);
        emis.add(o.op);
      }
    }
    assert.ok(emis.has(geste),
      `${code} annonce le geste « ${geste} » mais émet ${[...emis].join(', ')}`);
  }
});

test('scénario — les tokens initiaux reflètent la saisie, caractère par caractère', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('jean-michel');
  const sc = m.scenarioDe(r.approches[0], { saisie: r.saisie });
  assert.equal(sc.tokens.map((t) => t.text).join(''), 'jean-michel');
  assert.equal(sc.tokens.find((t) => t.text === '-').kind, 'sep');
  assert.equal(sc.tokens[0].kind, 'letter');
});

test('scénario — le dernier step révèle le résultat', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('macron');
  const sc = m.scenarioDe(r.approches[0], { saisie: r.saisie });
  const dernier = sc.steps[sc.steps.length - 1];
  assert.ok(dernier.ops.some((o) => o.op === 'reveal'));
  assert.equal(sc.result, '666');
});

test('scénario — un opérateur qui fournit steps() est employé tel quel', () => {
  const a1z26 = operateur('m.a1z26');
  assert.equal(typeof a1z26.steps, 'function', 'la fixture doit exercer ce chemin');
  const avant = etat('TOKENS', ['h', 'o', 'p', 'e'], []);
  const apres = etat('NUMS', [8, 15, 16, 5], []);
  const approche = {
    mode: 'TRIPLEMENT',
    parts: [{
      fragment: { texte: 'hope', offset: 0, longueur: 4, intervalles: [[0, 4]], famille: 'entier' },
      chemin: {
        ops: [operateur('t.caracteres'), a1z26, operateur('c.somme'), operateur('p.racineNumerique')],
        etats: [etat('STR', 'hope', []), avant, apres, etat('NUM', 44, []), etat('NUM', 8, [])],
      },
    }],
  };
  const sc = construireScenario(approche, { saisie: 'hope' });
  assert.deepEqual(validerScenario(sc), []);
  assert.equal(sc.avertissements, undefined, 'aucun repli sur le rendu générique');
  // `m.a1z26` montre désormais la conversion sur la réglette alphabétique :
  // un step par lettre, la lettre s'envole vers sa case, le rang en redescend.
  const rangs = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'alphabet');
  assert.deepEqual(rangs.map((o) => o.to.text), ['8', '15', '16', '5']);
  assert.deepEqual(rangs.map((o) => o.letter), ['H', 'O', 'P', 'E']);
  for (const step of sc.steps) {
    assert.ok(step.ops.filter((o) => o.op === 'alphabet').length <= 1,
      'une réglette par step : chacune anime la caméra');
  }
});

test('★ scénario — une étape qui ne transforme rien à l’écran est sautée SILENCIEUSEMENT', () => {
  // « On prend les lettres une par une » fait passer STR 'hope' à
  // TOKENS ['h','o','p','e'] : le type change, les quatre glyphes de la ligne
  // sont exactement les mêmes. L'étape ne doit paraître ni dans la scène ni
  // dans Le Registre — et la NUMÉROTATION doit se refermer sur elle, pas
  // garder un trou.
  const a1z26 = operateur('m.a1z26');
  const approche = {
    mode: 'TRIPLEMENT',
    parts: [{
      fragment: { texte: 'hope', offset: 0, longueur: 4, intervalles: [[0, 4]], famille: 'entier' },
      chemin: {
        ops: [operateur('t.caracteres'), a1z26, operateur('c.somme'), operateur('p.racineNumerique')],
        etats: [
          etat('STR', 'hope', []),
          etat('TOKENS', ['h', 'o', 'p', 'e'], []),
          etat('NUMS', [8, 15, 16, 5], []),
          etat('NUM', 44, []),
          etat('NUM', 8, []),
        ],
      },
    }],
  };
  const sc = construireScenario(approche, { saisie: 'hope' });
  assert.deepEqual(validerScenario(sc), []);

  const titres = sc.steps.map((s) => s.title);
  assert.ok(!titres.some((t) => /lettres une par une/i.test(t)),
    `« on prend les lettres une par une » subsiste : ${JSON.stringify(titres)}`);
  // Aucune op ne se rattache au découpage en caractères : ni `move` nu, ni
  // `pulse` sur toute la ligne.
  assert.ok(!sc.steps.some((s) => s.ops.some((o) => o.op === 'move' && !o.targets && !o.to)),
    'le recalcul de flux de t1 subsiste');
  // Numérotation refermée : des identifiants contigus depuis s0, donc des
  // numéros contigus dans Le Registre (qui numérote par index).
  assert.deepEqual(sc.steps.map((s) => s.id), sc.steps.map((_, i) => `s${i}`));
  // Et la démonstration commence bien par la conversion, pas par un vide.
  assert.match(sc.steps[0].title, /alphabet/i);
});

test('scénario — steps() incohérent : repli générique + avertissement, jamais d’échec', () => {
  const cassé = {
    ...operateur('m.a1z26'),
    id: 'm.casse',
    steps: () => [{ title: 'boum', ops: [{ op: 'inexistante', targets: ['t0'] }] }],
  };
  const approche = {
    mode: 'TRIPLEMENT',
    parts: [{
      fragment: { texte: 'hope', offset: 0, longueur: 4, intervalles: [[0, 4]], famille: 'entier' },
      chemin: {
        ops: [operateur('t.caracteres'), cassé, operateur('c.somme'), operateur('p.racineNumerique')],
        etats: [etat('STR', 'hope', []), etat('TOKENS', ['h', 'o', 'p', 'e'], []),
          etat('NUMS', [8, 15, 16, 5], []), etat('NUM', 44, []), etat('NUM', 8, [])],
      },
    }],
  };
  const sc = construireScenario(approche, { saisie: 'hope' });
  assert.deepEqual(validerScenario(sc), [], 'le scénario reste valide');
  assert.ok(sc.avertissements.some((a) => /hors vocabulaire/.test(a)));
  assert.ok(!sc.steps.flatMap((s) => s.ops).some((o) => o.op === 'inexistante'));
});

test('scénario — steps() qui lève une exception ne casse pas la démonstration', () => {
  const explosif = {
    ...operateur('m.a1z26'),
    id: 'm.explosif',
    steps: () => { throw new Error('boum'); },
  };
  const approche = {
    mode: 'TRIPLEMENT',
    parts: [{
      fragment: { texte: 'ho', offset: 0, longueur: 2, intervalles: [[0, 2]], famille: 'entier' },
      chemin: {
        ops: [operateur('t.caracteres'), explosif],
        etats: [etat('STR', 'ho', []), etat('TOKENS', ['h', 'o'], []), etat('NUMS', [8, 15], [])],
      },
    }],
  };
  const sc = construireScenario(approche, { saisie: 'ho' });
  assert.deepEqual(validerScenario(sc), []);
  assert.ok(sc.avertissements.some((a) => /exception/.test(a)));
});

test('scénario — validerScenario détecte réellement les violations', () => {
  const base = { version: 1, input: 'a', result: '666', tokens: [{ id: 't0', text: 'a', kind: 'letter' }], steps: [] };
  const cas = [
    [{ ...base, version: 2, steps: [pas()] }, /invariant 1/],
    [{ ...base, tokens: [{ id: 't0' }, { id: 't0' }], steps: [pas()] }, /invariant 2/],
    [{ ...base, steps: [] }, /invariant 5/],
    [{ ...base, steps: [{ ...pas(), title: '  ' }] }, /invariant 5/],
    [{ ...base, steps: [{ ...pas(), duration: 3 }] }, /invariant 6/],
    [{ ...base, steps: [{ id: 's0', title: 'x', ops: [{ op: 'trucmuche', targets: ['t0'] }] }] }, /invariant 7/],
    [{ ...base, steps: [{ id: 's0', title: 'x', ops: [{ op: 'highlight', targets: ['inconnu'] }] }] }, /invariant 3/],
    [{ ...base, steps: [{ id: 's0', title: 'x', ops: [{ op: 'pulse', targets: ['t0'], cb: () => {} }] }] }, /invariant 8/],
  ];
  for (const [sc, attendu] of cas) {
    const v = validerScenario(sc);
    assert.ok(v.length, `attendu une violation ${attendu}`);
    assert.match(v.join(' ; '), attendu);
  }
  // Deux ops partageant le même tableau `targets` n'est PAS un cycle.
  const partage = ['t0'];
  assert.deepEqual(validerScenario({
    ...base,
    steps: [{ id: 's0', title: 'x', ops: [{ op: 'reveal', targets: partage }, { op: 'pulse', targets: partage }] }],
  }), []);
});

function pas() {
  return { id: 's0', title: 'titre', duration: 1400, ops: [{ op: 'pulse', targets: ['t0'] }] };
}

test('scénario — décomposition des états en éléments', () => {
  assert.deepEqual(elementsDe(etat('STR', 'hop', [])), ['h', 'o', 'p']);
  assert.deepEqual(elementsDe(etat('TOKENS', ['ab', 'cd'], [])), ['ab', 'cd']);
  assert.deepEqual(elementsDe(etat('NUMS', [8, 15], [])), ['8', '15']);
  assert.deepEqual(elementsDe(etat('NUM', 44, [])), ['44']);
});

test('scénario — une approche à passage unique se triple à la fin (joker, triplement)', () => {
  const m = creerMoteur(catalogue);
  // Le joker n'est plus déclenché par la recherche avec le catalogue réel : on
  // le construit directement pour vérifier son rendu.
  const a = approcheJoker('42', { saisie: '42', catalogue });
  assert.ok(a, 'le terminateur français doit aboutir');
  const sc = construireScenario(a, { saisie: '42' });
  assert.deepEqual(validerScenario(sc), []);
  const sub = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'substitute');
  const triplement = sub.find((o) => o.pairs.some((p) => Array.isArray(p.to) && p.to.length === 3));
  assert.ok(triplement, 'les trois 6 doivent apparaître');
  assert.deepEqual(triplement.pairs.find((p) => Array.isArray(p.to)).to.map((t) => t.text), ['6', '6', '6']);
});
