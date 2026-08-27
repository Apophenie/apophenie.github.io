import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../index.js';
import {
  construireScenario, validerScenario, VOCABULAIRE, DUREE_MIN, elementsDe, validerFormeOp,
  placeDuCouronnement, jalonsDesCornes, suivreLaLigne,
} from '../scenario.js';
import { etat } from '../bfs.js';
import { approcheJoker } from '../assemblage.js';
import { catalogue, operateur } from './_catalogue.js';
import { lire as lireUrl } from '../url.js';
import { encoderTexte } from '../base58.js';

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
  m1: 'table', m2: 'table', m3: 'table', m4: 'table', m5: 'table',
  m6: 'table', m7: 'table', m8: 'table', m9: 'table', ma: 'table',
  mb: 'table', mc: 'table', mp: 'table', mq: 'table', mr: 'table',
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
    mode: 'DECRET', // fixture : un seul fragment, un seul 6 — le mode n'est ici qu'une étiquette
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
  // `m.a1z26` montre désormais la conversion sur la table de correspondance :
  // un step par lettre — elle s'envole vers sa case, sa valeur en redescend
  // aussitôt — et le DÉCOR, lui, reste monté d'une étape à l'autre.
  const tables = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'table');
  assert.equal(tables.length, 4, 'un aller-retour par lettre, jamais groupé');
  assert.deepEqual(tables.map((o) => o.to.text), ['8', '15', '16', '5']);
  assert.deepEqual(tables.map((o) => o.letter), ['H', 'O', 'P', 'E']);
  assert.equal(tables[0].entries.length, 26, 'et elle porte les 26 correspondances');
  assert.deepEqual(tables.map((o) => o.montre), [true, false, false, false],
    'la table se déploie à la première lettre seulement');
  assert.deepEqual(tables.map((o) => o.retire), [false, false, false, true],
    'et se retire à la dernière seulement');
  for (const step of sc.steps) {
    assert.ok(step.ops.filter((o) => o.op === 'table').length <= 1,
      'une table par step : chacune anime la caméra');
  }
});

/**
 * ★ Le décor mutualisé, mesuré sur le cas réel.
 *
 * L'aller-retour reste individuel — une lettre, sa valeur, la suivante — mais
 * la table, elle, ne redescend pas entre deux lettres, ni même entre deux
 * groupes qui l'emploient d'affilée. Sur `hope-hope-hope.fr`, les trois
 * conversions sont trois appels distincts à `steps()` : seul l'assemblage peut
 * voir qu'elles montrent la même grille.
 */
/**
 * ★ « On ne garde que les 6 » : une fois, et juste avant le verdict.
 *
 * L'auteur : « cette étape ne devrait jamais être utilisée si ce n'est en étape
 * quasi finale, et encore, ça devrait toujours être un malus de score que de
 * l'employer. » La raison est de crédibilité : une démonstration qui trie
 * quatre fois en cours de route montre quatre fois qu'elle savait d'avance ce
 * qu'elle cherchait.
 *
 * Le GROUPEMENT triait déjà là — il n'a qu'un vecteur. La MOISSON en a un par
 * portée et triait après chacune : mesuré sur `https://hope-hope-hope.fr/` en
 * gématrie anglaise, quatre tris plus un appoint, sur 69 étapes.
 */
test('★ scénario — on ne trie qu’UNE fois, et juste avant le verdict', () => {
  const m = creerMoteur(catalogue);
  let vus = 0;
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      const sc = m.scenarioDe(a, { saisie: r.saisie });
      const tris = sc.steps
        // ★ On reconnaît le tri à sa MARQUE (`recolte`), pas à son titre. Le
        //   titre est désormais dérivé de la cible et de la ligne — « Les 6
        //   sont majoritaires, on les garde », « On ne garde que les 7 », « On
        //   ne garde que ce qui écrit 13 » —, et un test qui l'épelle ne
        //   vérifie plus que sa propre copie du libellé.
        .map((st, i) => (st.recolte ? i : -1))
        .filter((i) => i >= 0);
      if (!tris.length) continue;
      vus++;
      assert.equal(tris.length, 1,
        `« ${s} » rang ${a.rang} : ${tris.length} tris (${a.codes})`);
      assert.equal(tris[0], sc.steps.length - 2,
        `« ${s} » rang ${a.rang} : tri à l’étape ${tris[0] + 1} sur ${sc.steps.length} — `
        + `il doit précéder immédiatement le verdict (${a.codes})`);
    }
  }
  assert.ok(vus >= 5, `seulement ${vus} scénarios trieurs observés — le cas est-il vivant ?`);
});

/**
 * ★ Et trier COÛTE. Le rendement (`score.js › rendementSix`) mesure la part de
 * ce qu'on a calculé qui vaut vraiment 6, et s'applique en facteur multiplicatif
 * sur le score. Une voie qui jette la moitié de sa récolte doit être punie plus
 * fort qu'une voie qui ne jette rien — sans quoi « ne garder que les 6 » serait
 * gratuit, et le tri deviendrait une méthode plutôt qu'un aveu.
 */
test('★ scénario — jeter coûte : le rendement suit ce qu’on garde', () => {
  const m = creerMoteur(catalogue);
  const app = m.resoudre('https://hope-hope-hope.fr/').approches
    .filter((a) => a.criteres && typeof a.criteres.R === 'number');
  assert.ok(app.length >= 2, 'pas assez de voies à rendement pour comparer');
  for (const a of app) {
    const sc = m.scenarioDe(a, { saisie: 'https://hope-hope-hope.fr/' });
    const tri = sc.steps.find((st) => st.recolte);
    const jetes = tri ? tri.ops.find((o) => o.op === 'drop').targets.length : 0;
    const gardes = tri
      ? tri.ops.find((o) => o.op === 'highlight').targets.length
      : (a.series || 1) * 3;
    // Le rendement EST ce rapport : c'est le contrôle croisé du malus.
    const attendu = Math.floor((gardes * 1000) / (gardes + jetes));
    assert.ok(Math.abs(a.criteres.R - attendu) <= 60,
      `rang ${a.rang} : rendement ${a.criteres.R} pour ${gardes} gardés / ${jetes} jetés `
      + `(≈ ${attendu}) — ${a.codes}`);
  }
});

test('★ scénario — le décor d’une table reste monté sur les étapes d’affilée', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  const a = r.approches.find((x) => /^t1\+m1\+/.test(x.codes));
  assert.ok(a, 'la voie A1Z26 existe sur ce cas');
  const sc = m.scenarioDe(a, { saisie: r.saisie });

  const tables = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'table');
  assert.equal(tables.length, 12, 'douze lettres, douze allers-retours');
  assert.equal(tables.filter((o) => o.montre).length, 1, 'la table ne monte qu’une fois…');
  assert.equal(tables.filter((o) => o.retire).length, 1, '… et ne redescend qu’une fois');
  assert.equal(tables[0].montre, true);
  assert.equal(tables[11].retire, true);

  // Et les douze étapes se suivent VRAIMENT : rien ne s'intercale, sans quoi
  // garder la table montée la ferait flotter au-dessus d'autre chose.
  const rangs = sc.steps.map((s, i) => (s.ops.some((o) => o.op === 'table') ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(rangs, rangs.map((_, k) => rangs[0] + k), 'les étapes de table sont contiguës');
});

/**
 * ★ Le même contrat pour le CLAVIER — et par-dessus une étape inerte.
 *
 * Sur `hope-hope-hope.fr`, les deux tirets du 6 se convertissent l'un après
 * l'autre, mais l'assemblage intercale entre eux « On isole le troisième
 * morceau » : une simple désignation, qui ne touche pas à la ligne. Rabattre le
 * clavier pour elle puis le relever aussitôt serait un clignotement gratuit.
 */
test('★ scénario — le clavier reste monté par-dessus une étape inerte', () => {
  const m = creerMoteur(catalogue);
  const lecture = lireUrl('#0.1:t1+m4+c6,1.1:t1+mv+c1,3.1:t1+mv+c1#' + encoderTexte('hope-hope-hope.fr'));
  const rejeu = m.rejouer(lecture);
  assert.ok(rejeu.ok, 'ce chemin — chaldéenne puis deux tirets du 6 — est rejouable');
  const sc = m.scenarioDe(rejeu.approche, { saisie: 'hope-hope-hope.fr' });

  const claviers = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'keyboard');
  assert.equal(claviers.length, 2, 'deux tirets, deux conversions');
  assert.deepEqual(claviers.map((o) => o.montre), [true, false], 'le clavier ne monte qu’une fois…');
  assert.deepEqual(claviers.map((o) => o.retire), [false, true], '… et ne redescend qu’une fois');

  // … et il y a bien une étape entre les deux : c'est tout l'objet du test.
  const rangs = sc.steps.map((s, i) => (s.ops.some((o) => o.op === 'keyboard') ? i : -1)).filter((i) => i >= 0);
  assert.equal(rangs[1] - rangs[0], 2, 'une étape s’intercale, et la série la traverse');
  assert.deepEqual(sc.steps[rangs[0] + 1].ops.map((o) => o.op), ['highlight'],
    'l’étape traversée est inerte : elle désigne, elle ne déplace rien');

  // La table chaldéenne qui précède, elle, referme sa série avant le clavier :
  // un décor qui change, c'est l'ancien qui se retire avant que le neuf ne monte.
  const tables = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'table');
  assert.equal(tables[tables.length - 1].retire, true);
});

test('★ scénario — une étape qui ne transforme rien à l’écran est sautée SILENCIEUSEMENT', () => {
  // « On prend les lettres une par une » fait passer STR 'hope' à
  // TOKENS ['h','o','p','e'] : le type change, les quatre glyphes de la ligne
  // sont exactement les mêmes. L'étape ne doit paraître ni dans la scène ni
  // dans Le Registre — et la NUMÉROTATION doit se refermer sur elle, pas
  // garder un trou.
  const a1z26 = operateur('m.a1z26');
  const approche = {
    mode: 'DECRET', // fixture : un seul fragment, un seul 6 — le mode n'est ici qu'une étiquette
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
    mode: 'DECRET', // fixture : un seul fragment, un seul 6 — le mode n'est ici qu'une étiquette
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
    mode: 'DECRET', // fixture : un seul fragment, un seul 6 — le mode n'est ici qu'une étiquette
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


// ═══════════════════════════ les deux moments des cornes

/**
 * ★ LE COURONNEMENT AU PLUS TÔT, L'EFFACEMENT AU PLUS TARD.
 *
 * « Sur cette voie les cornes devraient apparaître dès la fin de l'étape 5 pour
 * marquer l'apparition rapide du triptyque. […] En revanche l'élimination des
 * chiffres suivants […] peut être remise à plus tard pour faire apparaître plus
 * vite d'autres 666. » (l'auteur)
 *
 * La voie de référence est `Donald Trump` en quatorze segments : `D o n` valent
 * 6, 6, 6 dès la cinquième étape, et `T r u m p` en donne trois autres après le
 * chiffre de César. Le résultat attendu se dit d'une phrase : **les deux 666
 * sont couronnés avant que quoi que ce soit ne s'efface.**
 */
test('★ cornes — les deux 666 sont couronnés AVANT le moindre effacement', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('Donald Trump');
  const a = r.approches.find((x) => x.codes === 't1+mw+mz,fl+t1+mw+mz');
  assert.ok(a, 'la voie de référence doit être trouvée');
  const sc = m.scenarioDe(a, { saisie: r.saisie });
  assert.deepEqual(validerScenario(sc), []);

  const rang = (predicat) => sc.steps.map((s, i) => (predicat(s) ? i : -1)).filter((i) => i >= 0);
  const cornes = rang((s) => (s.ops || []).some((o) => o.op === 'horns'));
  const gommes = rang((s) => (s.ops || []).some((o) => o.op === 'drop'));

  assert.equal(cornes.length, 2, 'deux 666, deux couronnements');
  assert.equal(gommes.length, 1, 'un seul effacement, et il les regroupe tous les deux');
  assert.ok(Math.max(...cornes) < gommes[0],
    `les couronnements (${cornes.map((i) => i + 1)}) doivent tous précéder l’effacement (${gommes[0] + 1})`);
  assert.equal(gommes[0], sc.steps.length - 2, 'l’effacement précède immédiatement le verdict');

  // Le premier couronnement suit immédiatement la conversion du troisième 6.
  assert.equal(cornes[0], 5, 'les cornes de « Donald » paraissent à la fin de la cinquième étape');
  // …et plus aucune corne n’efface : les deux gestes sont bien séparés.
  for (const i of cornes) {
    const o = sc.steps[i].ops.find((x) => x.op === 'horns');
    assert.ok(!o.efface || !o.efface.length, 'un couronnement différé n’efface plus rien lui-même');
  }
  // Ce que l’effacement emporte, c’est tout ce qui n’est pas couronné.
  const couronnes = new Set(cornes.flatMap((i) => sc.steps[i].ops.find((x) => x.op === 'horns').targets));
  const efface = sc.steps[gommes[0]].ops.find((o) => o.op === 'drop').targets;
  assert.equal(efface.length, 5, '7, 3 et 6 pour « Donald », 4 et 4 pour « Trump »');
  assert.ok(efface.every((id) => !couronnes.has(id)), 'on n’efface jamais ce qu’on couronne');
});

/**
 * ★ ET LA CONDITION QUI L'AUTORISE SE VÉRIFIE — elle ne se suppose pas.
 *
 * Le couronnement ne remonte que si les trois jetons survivent jusqu'au bout et
 * leur contiguïté avec. Dès qu'une étape intermédiaire pourrait les déplacer,
 * les remplacer ou en insérer entre eux, il reste où l'opérateur l'avait posé.
 */
test('★ cornes — l’avance est REFUSÉE dès qu’une étape pourrait défaire le triptyque', () => {
  // Trois 6 nés à l'étape 0, couronnés à l'étape 3. L'étape 1 est le grain de
  // sable qu'on fait varier ; l'étape 2 est un remplacement un pour un, qui,
  // lui, ne change jamais l'ordre des rangs.
  const scene = (intruse) => [
    { id: 's0', title: 'A', ops: [{ op: 'substitute', pairs: [{ target: 'a', to: [{ id: 'u', text: '6' }, { id: 'v', text: '6' }, { id: 'w', text: '6' }] }] }] },
    { id: 's1', title: 'B', ops: [intruse] },
    { id: 's2', title: 'C', ops: [{ op: 'fourteenSeg', target: 'b', to: { id: 'z', text: '4' }, segments: ['a'], count: 1 }] },
    { id: 's3', title: 'D', ops: [{ op: 'horns', targets: ['u', 'v', 'w'], efface: ['z'] }] },
  ];
  const place = (intruse) => placeDuCouronnement(scene(intruse), 3);

  // Inerte : l'avance est accordée, jusqu'à l'étape qui suit la naissance.
  assert.equal(place({ op: 'highlight', targets: ['b'], mode: 'select' }), 1, 'une désignation ne défait rien');
  assert.equal(place({ op: 'dim', targets: ['b'] }), 1);
  // Un pour un, à la même place dans la ligne : l'ordre des rangs est intact.
  assert.equal(place({ op: 'table', target: 'b', to: { id: 'y', text: '3' }, entries: [{ char: 'B', value: 3 }] }), 1);
  // Tout le reste peut faire ou défaire un voisinage : on ne bouge pas.
  assert.equal(place({ op: 'drop', targets: ['b'], mode: 'erase' }), 3, 'un effacement peut créer une contiguïté');
  assert.equal(place({ op: 'move', order: ['b', 'u', 'v', 'w'] }), 3, 'un réordonnancement peut la défaire');
  assert.equal(place({ op: 'sum', targets: ['b'], to: { id: 'y', text: '3' } }), 3);
  assert.equal(place({ op: 'substitute', pairs: [{ target: 'b', to: [{ id: 'y', text: '3' }, { id: 'y2', text: '4' }] }] }), 3);
  // Et une étape POSTÉRIEURE qui toucherait au triptyque le fige aussi.
  const apres = scene({ op: 'wait' });
  apres.push({ id: 's4', title: 'E', ops: [{ op: 'drop', targets: ['v'], mode: 'fall' }] });
  assert.equal(placeDuCouronnement(apres, 3), 3, 'un 666 qui se défait ensuite ne se couronne pas avant');
});

/**
 * ★ CE QUI EST MIS À DISPOSITION DU BARÈME — et rien de plus.
 *
 * Le bonus de score qu'appelle l'auteur (« les amener à l'étape 5 plutôt qu'à
 * l'étape 9 devrait apporter un bonus ») appartient à `score.js`. Ce module
 * MESURE et publie : à quelle étape paraît chaque 666, sur combien d'étapes en
 * tout, et combien d'étapes le couronnement a gagné.
 */
test('★ cornes — les jalons publiés pour le score sont exacts et purs', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('Donald Trump');
  const a = r.approches.find((x) => x.codes === 't1+mw+mz,fl+t1+mw+mz');
  const sc = m.scenarioDe(a, { saisie: r.saisie });

  assert.ok(sc.cornes, 'le scénario publie ses jalons');
  assert.equal(sc.cornes.total, sc.steps.length);
  assert.equal(sc.cornes.couronnements.length, 2);
  assert.equal(sc.cornes.premier, 6, 'le premier 666 est couronné à la sixième étape');
  assert.equal(sc.cornes.couronnements[0].avance, 3, 'trois étapes gagnées sur la place d’origine');
  assert.ok(sc.cornes.couronnements[0].part > 0 && sc.cornes.couronnements[0].part < 1);

  // La fonction est PURE : relue sur le seul scénario, elle retrouve les mêmes
  // rangs (l’avance, elle, n’est mesurable qu’au moment du réglage).
  const relu = jalonsDesCornes(JSON.parse(JSON.stringify(sc)));
  assert.equal(relu.total, sc.cornes.total);
  assert.equal(relu.premier, sc.cornes.premier);
  assert.deepEqual(relu.couronnements.map((c) => c.etape), sc.cornes.couronnements.map((c) => c.etape));

  // Et le scénario reste sérialisable (invariant 8).
  assert.deepEqual(validerScenario(sc), []);
});

/**
 * ★ COURONNER SANS EFFACER — la voie de la vitrine, celle qui ne montrait rien.
 *
 * `hope-hope-hope.fr` mène cinq séries de 666, et sa voie de tête n'emploie pas
 * `mz` — elle ne le peut pas : l'opérateur tronque le vecteur à trois 6, il en
 * jetterait douze sur quinze. L'unique émetteur de cornes du projet étant `mz`,
 * cette démonstration n'en montrait AUCUNE : cinq 666 se formaient sous les
 * yeux du spectateur sans que rien ne le souligne.
 *
 * Ce test fige ce que l'auteur a demandé, étape par étape : « Les 3 premiers 6
 * devraient pouvoir recevoir leur corne entre l'étape 5 et 6, puis […] pour les
 * 666 de "ope" du 2nd hope. »
 */
test('★ cornes — la voie de la vitrine couronne ses triptyques, et n’efface rien', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('hope-hope-hope.fr');
  const a = r.approches.find((x) => x.codes === 't1+mw,t1+mv+c1,t1+mw,t1+mv+c1,t1+mw,t1+md+c1');
  assert.ok(a, 'la voie mise en vitrine dans src/i18n/fr.js doit être trouvée');
  assert.ok(!a.codes.includes('mz'), 'et elle n’emploie pas « trois 6 d’affilée »');
  const sc = m.scenarioDe(a, { saisie: r.saisie });
  assert.deepEqual(validerScenario(sc), []);

  const cornes = sc.steps
    .map((s, i) => ({ i, o: (s.ops || []).find((x) => x.op === 'horns') }))
    .filter((x) => x.o);
  assert.equal(cornes.length, 4, 'quatre triptyques s’écrivent d’eux-mêmes au fil de la ligne');

  // ★ RIEN ne s'efface. C'est tout le propos : `mz` couronnait ET tronquait ;
  //   ici les voisins des trois 6 sont d'autres 6, il n'y a rien à jeter.
  for (const { o } of cornes) {
    assert.ok(!o.efface || !o.efface.length, 'un couronnement de la ligne n’efface jamais rien');
  }
  assert.equal(sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'drop')).length, 0,
    'et aucune gomme n’apparaît dans la démonstration');

  // ★ Chaque couronnement porte sur UNE SÉRIE DU VERDICT, dans l'ordre.
  const verdict = sc.steps[sc.steps.length - 1].ops.find((o) => o.op === 'reveal').targets;
  assert.equal(verdict.length, 15, 'cinq séries de trois');
  const series = [0, 1, 2, 3, 4].map((k) => verdict.slice(k * 3, k * 3 + 3));
  cornes.forEach(({ o }, k) => assert.deepEqual(o.targets, series[k],
    `le ${k + 1}ᵉ couronnement doit porter sur la ${k + 1}ᵉ série du verdict`));

  // ★ La CINQUIÈME série n'est pas couronnée, et c'est exact : le point du nom
  //   de domaine reste entre le « e » du troisième « hope » et le 6 de « fr »
  //   jusqu'à ce que le verdict l'efface. Les trois 6 ne se touchent jamais
  //   avant, donc rien ne les couronne — « d'affilée » est le mot qui interdit
  //   l'assouplissement (CONTRACTS §3.1).
  //   Elle appartient d'ailleurs au rang du bas, dont `reveal` retire les
  //   cornes : le silence d'ici et l'effacement de là-bas disent la même chose.

  // ★ Et les rangs, tels que l'auteur les a dictés. Sur les 29 étapes de la
  //   démonstration, le premier 666 est couronné à la sixième — c'est-à-dire
  //   « entre l'étape 5 et 6 » du déroulé d'origine, qui en comptait 25.
  assert.deepEqual(cornes.map((c) => c.i + 1), [6, 12, 16, 22]);
  assert.equal(sc.cornes.premier, 6);
  assert.equal(sc.cornes.total, sc.steps.length);
});

/**
 * ★ ON COURONNE CE QU'ON CONSTATE, JAMAIS CE QU'ON A RASSEMBLÉ.
 *
 * La distinction est la même que celle du nom de l'opérateur — « trois 6
 * D'AFFILÉE » —, et elle décide ici de l'instant regardé : celui où le
 * troisième 6 paraît, et lui seul. S'il paraît contre les deux autres, le 666
 * est écrit et on le couronne. S'il paraît ailleurs et que les trois ne se
 * touchent qu'une fois retiré ce qui les séparait, c'est l'AUTRE geste — « On
 * ne garde que les 6 » —, celui qui ne se joue qu'une fois, juste avant le
 * verdict, et qui coûte au score.
 */
test('★ cornes — un triptyque que le TRI a rapproché n’est pas couronné', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const a of r.approches) {
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    const tri = sc.steps.findIndex((s) => s.recolte);
    if (tri < 0) continue;
    const cornes = sc.steps.map((s, i) => ((s.ops || []).some((o) => o.op === 'horns') ? i : -1))
      .filter((i) => i >= 0);
    for (const i of cornes) {
      assert.ok(i < tri, `${a.codes} : cornes à l’étape ${i + 1}, après le tri de l’étape ${tri + 1} — `
        + 'un 666 rapproché par le tri n’est pas un 666 trouvé');
    }
  }
});

/**
 * ★ LE REJEU DE LA LIGNE DÉCLARE FORFAIT PLUTÔT QUE DE DEVINER.
 *
 * `suivreLaLigne` sert à savoir où trois 6 deviennent contigus. Une erreur de
 * sa part ne serait pas une imprécision : elle ferait échouer la compilation au
 * clic (`visuel/primitives/horns.js` refuse de couronner trois 6 qui ne se
 * touchent pas). D'où la règle — dès qu'il ne sait plus, il rend `null`, et
 * tout ce qui s'appuie dessus renonce. Le test l'exige sur les trois manières
 * dont il peut ne plus savoir.
 */
test('★ cornes — la ligne rejouée rend « null » dès qu’elle ne sait plus', () => {
  const tokens = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const suite = (ops) => suivreLaLigne(tokens, [{ id: 's0', ops }, { id: 's1', ops: [{ op: 'wait' }] }]);

  // Ce qu'il sait rejouer : un remplacement un pour un, à la même place.
  assert.deepEqual(suite([{ op: 'table', target: 'b', to: { id: 'z', text: '6' } }])[0], ['a', 'z', 'c']);
  // …une somme, qui pose son résultat à la place du premier opérande.
  assert.deepEqual(suite([{ op: 'sum', targets: ['a', 'b'], to: { id: 'z', text: '6' } }])[0], ['z', 'c']);
  // …et les signes que le moteur visuel s'alloue lui-même, qui OCCUPENT la ligne.
  assert.equal(suite([{ op: 'insertOperators', between: ['a', 'b'], glyph: '+' }])[0].length, 4);

  // Une op hors du vocabulaire qu'il modélise : forfait, et pour la suite aussi.
  assert.deepEqual(suite([{ op: 'aucune' }]), [null, null]);
  // Un SÉLECTEUR déclaratif : les identifiants ne sont pas écrits, on ne devine pas.
  assert.deepEqual(suite([{ op: 'drop', targets: { group: 'p0' } }]), [null, null]);
  // Un jeton qu'on ne retrouve pas dans la ligne : forfait plutôt qu'à-peu-près.
  assert.deepEqual(suite([{ op: 'table', target: 'inconnu', to: { id: 'z', text: '6' } }]), [null, null]);
  // Le verdict rassemble : après lui il n'y a rien, et rien à rejouer.
  assert.deepEqual(suite([{ op: 'reveal', targets: ['a', 'b', 'c'] }]), [null, null]);
});
