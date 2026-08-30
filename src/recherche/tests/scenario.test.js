import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../index.js';
import {
  construireScenario, validerScenario, VOCABULAIRE, DUREE_MIN, elementsDe, validerFormeOp,
  placeDuCouronnement, jalonsDesCornes, suivreLaLigne, lesPlusCentraux,
} from '../scenario.js';
import { etat } from '../bfs.js';
import { approcheJoker } from '../assemblage.js';
import { OPERATEURS_QUI_ECARTENT } from '../elegance.js';
import { catalogue, operateur } from './_catalogue.js';
import { lireCible } from '../cible.js';
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
  ma1: 'table', mz26: 'table', mpy: 'table', mch: 'table', mx6: 'table',
  msfr: 'table', msen: 'table', mt9: 'table', mms: 'table', mmt: 'table',
  masc: 'table', masb: 'table', mhe: 'table', mgr: 'table', mln: 'table',
  m7: 'sevenSeg', m7F: 'sevenSeg',
  m14: 'fourteenSeg', m14F: 'fourteenSeg',
  mtrc: 'countStrokes', mtrb: 'countStrokes', mexc: 'countStrokes',
  mexb: 'countStrokes', mboc: 'countStrokes', mbob: 'countStrokes',
  mazc: 'keyboard', mazr: 'keyboard', mqwc: 'keyboard', mqwr: 'keyboard',
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
    // ★ **ET CE QUI TOMBE EN CHEMIN, PAS SEULEMENT AU VERDICT.**
    //
    // On ne comptait que l'étape de récolte — le tri final —, ce qui suffisait
    // tant qu'aucune voie PROPOSÉE n'écartait de valeurs en cours de route.
    // Depuis que `m.plusFrequent` n'est plus traitée en ficelle et remonte dans
    // les listes, une voie peut faire tomber deux valeurs à son étape 12 et rien
    // au verdict : le test lisait « 18 gardés, 0 jetés », attendait 1 000, et
    // rougissait là où le rendement disait 900 — à raison. Le contrôle avait
    // tort, pas la mesure, ce qui est exactement l'inverse de son office.
    //
    // ⚠️ **Ces chutes-là se lisent sur les ÉTATS, pas sur la scène**, et c'est un
    // affaiblissement assumé du contrôle croisé. La scène les montre bien — deux
    // `drop` à l'étape du « plus fréquent l'emporte » —, mais elle montre aussi
    // les caractères qu'un filtre écarte, et rien dans une étape ne dit lesquels
    // sont des VALEURS. Mesuré : tout compter faisait rougir `fl+tca+mazc+mr9`
    // en sens inverse (428 attendu contre 500 mesuré), le filtre `fl` versant
    // huit lettres dans un compte de nombres. La moitié « verdict » du contrôle
    // reste donc lue sur la scène, et elle seule.
    const jetesEnRoute = (a.parts || []).reduce((n, p) => {
      const e = (p.chemin && p.chemin.etats) || [];
      const ops = (p.chemin && p.chemin.ops) || [];
      let d = 0;
      for (let i = 1; i < e.length; i++) {
        if (e[i - 1].type !== 'NUMS' || e[i].type !== 'NUMS') continue;
        if (e[i].valeur.length >= e[i - 1].valeur.length) continue;
        if (!OPERATEURS_QUI_ECARTENT.has(ops[i - 1] && ops[i - 1].id)) continue;
        d += e[i - 1].valeur.length - e[i].valeur.length;
      }
      return n + d;
    }, 0);
    const jetes = (tri ? tri.ops.find((o) => o.op === 'drop').targets.length : 0) + jetesEnRoute;
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
  // ⚠ REJOUÉE depuis un lien, plus cherchée dans le classement. La voie A1Z26
  // y figurait tant que le départage des ex æquo comparait `t1+m1+…` ; depuis
  // que les codes sont parlants, la même égalité se tranche autrement
  // (CONTRACTS §4.4-1) et c'est une autre voie, tout aussi bien notée, qui
  // occupe la place. Ce que ce test vérifie n'a rien à voir avec le classement :
  // c'est le DÉCOR d'une table, qui doit monter une fois et redescendre une
  // fois par-dessus douze conversions d'affilée.
  const lecture = lireUrl(`#×3:tca+ma1+cp+prn#${encoderTexte('hope-hope-hope.fr')}`);
  const rejeu = m.rejouer(lecture);
  assert.ok(rejeu.ok, 'la voie A1Z26 se rejoue sur ce cas');
  const sc = m.scenarioDe(rejeu.approche, { saisie: 'hope-hope-hope.fr' });

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
  const lecture = lireUrl('#0.1:tca+mch+cmo,1.1:tca+mtc+cs,3.1:tca+mtc+cs#' + encoderTexte('hope-hope-hope.fr'));
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
 * ★ CHAQUE 666 EST COURONNÉ AVANT QUE SON RESTE NE S'EFFACE.
 *
 * « Sur cette voie les cornes devraient apparaître dès la fin de l'étape 5 pour
 * marquer l'apparition rapide du triptyque. » (l'auteur)
 *
 * La voie de référence est `Donald Trump` en quatorze segments : `D o n` valent
 * 6, 6, 6 dès la cinquième étape, et `T r u m p` en donne trois autres après le
 * chiffre de César. Le résultat attendu se dit d'une phrase : **chaque 666 est
 * couronné à l'instant où il s'écrit, et l'effacement de ce qui l'entoure vient
 * après, dans une étape à part.**
 *
 * ★ **DEUX gommes, et non plus une seule** — c'est le changement, et il est
 * voulu. Tant que les cornes appartenaient à `m36`, l'assemblage repoussait tous
 * les effacements devant le verdict pour n'en faire qu'un : deux gommes
 * séparées par un couronnement auraient dit qu'on écartait deux fois. Elles ne
 * disent plus cela. L'effacement est devenu ce que l'auteur en dit — « une
 * étape à part, et si elle n'a pas de motif c'est probablement la pire des
 * triches » —, et son motif est justement CE QUI LE LOCALISE : les trois 6
 * contigus de CE morceau-là, désignés juste avant que le reste ne tombe.
 * Rassembler les deux gommes détacherait chacune de son motif, et déplacerait
 * de surcroît une étape que l'URL nomme, loin du code qui la nomme.
 */
test('★ cornes — chaque 666 est couronné avant que son reste ne s’efface', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('Donald Trump');
  const a = r.approches.find((x) => x.codes === 'tca+m14+m36,fr13+tca+m14+m36');
  assert.ok(a, 'la voie de référence doit être trouvée');
  const sc = m.scenarioDe(a, { saisie: r.saisie });
  assert.deepEqual(validerScenario(sc), []);

  const rang = (predicat) => sc.steps.map((s, i) => (predicat(s) ? i : -1)).filter((i) => i >= 0);
  const cornes = rang((s) => (s.ops || []).some((o) => o.op === 'horns'));
  const gommes = rang((s) => (s.ops || []).some((o) => o.op === 'drop'));

  assert.equal(cornes.length, 2, 'deux 666, deux couronnements');
  assert.equal(gommes.length, 2, 'deux morceaux, deux effacements — chacun avec son motif');
  // Chaque couronnement précède la gomme de SON morceau.
  assert.ok(cornes[0] < gommes[0] && cornes[1] < gommes[1],
    `couronnements (${cornes.map((i) => i + 1)}) et gommes (${gommes.map((i) => i + 1)}) : `
    + 'on couronne ce qui est écrit, PUIS on cesse de lire');

  // Le premier couronnement suit immédiatement la conversion du troisième 6.
  assert.equal(cornes[0], 5, 'les cornes de « Donald » paraissent à la fin de la cinquième étape');
  // …et aucune corne n’efface : les deux gestes sont séparés à la source.
  for (const i of cornes) {
    const o = sc.steps[i].ops.find((x) => x.op === 'horns');
    assert.ok(!o.efface || !o.efface.length, 'un couronnement n’efface jamais rien lui-même');
  }

  // ★ Chaque gomme porte SON MOTIF : le `highlight` qui désigne, dans la même
  //   étape, les trois 6 qu'on garde. Un effacement sans motif est la pire des
  //   triches (l'auteur) ; celui-ci en a un, et il le montre avant de l'exercer.
  const couronnes = new Set(cornes.flatMap((i) => sc.steps[i].ops.find((x) => x.op === 'horns').targets));
  let jetes = 0;
  for (const i of gommes) {
    const designe = sc.steps[i].ops.find((o) => o.op === 'highlight');
    assert.ok(designe, `étape ${i + 1} : la gomme doit être précédée de ce qui la motive`);
    assert.equal(designe.targets.length, 3, 'on garde trois 6, ni deux ni quatre');
    assert.ok(designe.targets.every((id) => couronnes.has(id)),
      'et ce sont exactement les trois 6 que la démonstration a couronnés');
    const chute = sc.steps[i].ops.find((o) => o.op === 'drop');
    assert.ok(chute.targets.every((id) => !couronnes.has(id)), 'on n’efface jamais ce qu’on couronne');
    jetes += chute.targets.length;
  }
  assert.equal(jetes, 5, '7, 3 et 6 pour « Donald », 4 et 4 pour « Trump »');
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
  const a = r.approches.find((x) => x.codes === 'tca+m14+m36,fr13+tca+m14+m36');
  const sc = m.scenarioDe(a, { saisie: r.saisie });

  assert.ok(sc.cornes, 'le scénario publie ses jalons');
  assert.equal(sc.cornes.total, sc.steps.length);
  assert.equal(sc.cornes.couronnements.length, 2);
  assert.equal(sc.cornes.premier, 6, 'le premier 666 est couronné à la sixième étape');
  // ★ Zéro étape gagnée, et c'est le signe que tout va bien : l'assemblage pose
  //   désormais le couronnement À L'INSTANT où le triptyque s'écrit
  //   (`couronnerLesTriptyques`), il n'y a donc plus rien à remonter. L'avance
  //   ne se mesurait que du temps où `m36` posait ses cornes à sa propre place,
  //   trois étapes plus loin. Elle reste publiée : un couronnement peut encore
  //   gagner une étape quand les trois 6 sont là dès la première image.
  assert.equal(sc.cornes.couronnements[0].avance, 0, 'rien à remonter : il est déjà au plus tôt');
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
 * `m36` — elle ne le peut pas : l'opérateur tronque le vecteur à trois 6, il en
 * jetterait douze sur quinze. L'unique émetteur de cornes du projet étant `m36`,
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
  const a = r.approches.find((x) => x.codes === 'tca+m14,tca+mtc+cs,tca+m14,tca+mtc+cs,tca+m14,tca+m7+cs');
  assert.ok(a, 'la voie mise en vitrine dans src/i18n/fr.js doit être trouvée');
  assert.ok(!a.codes.includes('m36'), 'et elle n’emploie pas « trois 6 d’affilée »');
  const sc = m.scenarioDe(a, { saisie: r.saisie });
  assert.deepEqual(validerScenario(sc), []);

  const cornes = sc.steps
    .map((s, i) => ({ i, o: (s.ops || []).find((x) => x.op === 'horns') }))
    .filter((x) => x.o);
  // ★ DEUX, et non plus quatre. Les deux qui tombent sont ceux que l'auteur a
  //   relevés : « il y a eu 2 ajouts de cornes anticipées, l'un sur 6 6 6,
  //   l'autre sur 6 66 ». Leurs trois jetons occupaient bien trois rangs
  //   consécutifs, mais une frontière de découpage passait entre eux —
  //   la 2ᵉ série enjambe trois morceaux (« hope », « - », « hope »), la 4ᵉ
  //   en enjambe deux. Ce qui se lit alors n'est pas un 666.
  assert.equal(cornes.length, 2, 'deux triptyques s’écrivent d’un seul tenant au fil de la ligne');

  // ★ RIEN ne s'efface. C'est tout le propos : `m36` couronnait ET tronquait ;
  //   ici les voisins des trois 6 sont d'autres 6, il n'y a rien à jeter.
  for (const { o } of cornes) {
    assert.ok(!o.efface || !o.efface.length, 'un couronnement de la ligne n’efface jamais rien');
  }
  assert.equal(sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'drop')).length, 0,
    'et aucune gomme n’apparaît dans la démonstration');

  // ★ Chaque couronnement porte sur UNE SÉRIE DU VERDICT — la 1ʳᵉ et la 3ᵉ,
  //   les seules dont les trois 6 tiennent dans un même morceau.
  const verdict = sc.steps[sc.steps.length - 1].ops.find((o) => o.op === 'reveal').targets;
  assert.equal(verdict.length, 15, 'cinq séries de trois');
  const series = [0, 1, 2, 3, 4].map((k) => verdict.slice(k * 3, k * 3 + 3));
  assert.deepEqual(cornes[0].o.targets, series[0], 'le 1ᵉʳ couronnement porte sur la 1ʳᵉ série');
  assert.deepEqual(cornes[1].o.targets, series[2], 'le 2ᵉ couronnement porte sur la 3ᵉ série');

  // ★ La CINQUIÈME série n'est pas couronnée non plus, et pour une autre
  //   raison : le point du nom de domaine reste entre le « e » du troisième
  //   « hope » et le 6 de « fr » jusqu'à ce que le verdict l'efface. Les trois
  //   6 ne se touchent jamais avant, donc rien ne les couronne — « d'affilée »
  //   est le mot qui interdit l'assouplissement (CONTRACTS §3.1).
  //   Elle appartient d'ailleurs au rang du bas, dont `reveal` retire les
  //   cornes : le silence d'ici et l'effritement de là-bas disent la même chose.

  // ★ Et les rangs, tels que l'auteur les a dictés. Sur les 27 étapes de la
  //   démonstration, le premier 666 est couronné à la sixième — c'est-à-dire
  //   « entre l'étape 5 et 6 » du déroulé d'origine, qui en comptait 25.
  assert.deepEqual(cornes.map((c) => c.i + 1), [6, 15]);
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
  const rejeu = (ops) => suivreLaLigne(tokens, [{ id: 's0', ops }, { id: 's1', ops: [{ op: 'wait' }] }]);
  const suite = (ops) => rejeu(ops).map((l) => (l ? l.ids : null));

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

/**
 * ★ LES FRONTIÈRES DE GROUPE, REJOUÉES — ce que la file d'identifiants ne dit
 * pas.
 *
 * Le découpage ÉCARTE : écart large devant le premier jeton de chaque groupe,
 * serré devant les autres (`visuel/primitives/partition.js`). C'est cet écart
 * — et lui seul — qui distingue « 666 » de « 6 6 6 » quand les trois jetons
 * occupent les mêmes trois rangs. Le rejeu doit donc le suivre, et le suivre à
 * travers les substitutions : sans cela, le découpage s'évanouirait à la
 * première conversion et les deux cornes fautives relevées par l'auteur
 * repousseraient.
 */
test('★ cornes — le rejeu suit les frontières de groupe, et leur héritage', () => {
  const tokens = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const decoupe = {
    op: 'partition',
    groups: [
      { targets: ['a', 'b'], tag: 'p0' },
      { targets: ['c', 'd'], tag: 'p1' },
    ],
  };

  const apresDecoupe = suivreLaLigne(tokens, [{ id: 's0', ops: [decoupe] }])[0];
  // Le premier jeton de la ligne n'ouvre RIEN : son écart n'espacerait pas, il
  // décentrerait (même remise à zéro que dans la primitive).
  assert.deepEqual([...apresDecoupe.frontieres], ['c'],
    'seul le premier jeton du second groupe ouvre une frontière');

  // L'héritage : « c » est remplacé, et son successeur reprend sa frontière.
  const herite = suivreLaLigne(tokens, [
    { id: 's0', ops: [decoupe] },
    { id: 's1', ops: [{ op: 'table', target: 'c', to: { id: 'z', text: '6' } }] },
  ])[1];
  assert.deepEqual(herite.ids, ['a', 'b', 'z', 'd']);
  assert.deepEqual([...herite.frontieres], ['z'], 'la frontière suit le jeton qui prend la place');

  // Un ÉCLATEMENT : seul le premier des nouveaux jetons hérite de l'écart —
  // les suivants s'insèrent dans la place de leur source, pas devant elle.
  const eclate = suivreLaLigne(tokens, [
    { id: 's0', ops: [decoupe] },
    { id: 's1', ops: [{ op: 'substitute', pairs: [{ target: 'c', to: [{ id: 'z1', text: '1' }, { id: 'z2', text: '5' }] }] }] },
  ])[1];
  assert.deepEqual(eclate.ids, ['a', 'b', 'z1', 'z2', 'd']);
  assert.deepEqual([...eclate.frontieres], ['z1']);
});

// ══════════════════════════ LE 6 DE TROP, ET SON EXPLOSION AU VERDICT

/**
 * ★ OÙ SE TIENT LE 6 EN TROP — la règle, éprouvée sur sa table.
 *
 * > « Une fois les 6 collés les uns contre les autres, le 6 CENTRAL devrait
 * > disparaître par explosion pour propulser les deux triptyques dans leur
 * > agrandissement. » (l'auteur)
 *
 * Trois choses se gèlent ici, et ce sont les trois qui décident :
 *
 *  · la coupure SÉPARE deux séries, jamais l'intérieur de l'une d'elles — un
 *    triptyque coupé en deux ne serait pas propulsé, il serait cassé ;
 *  · elle est la plus proche du MILIEU, et à égalité la plus à gauche : rien
 *    à départager, donc rien à truquer (CONTRACTS §4.4) ;
 *  · et la fonction RENONCE là où permuter changerait ce qui est démontré.
 */
test('★ surnuméraire — la coupure sépare deux séries, au plus près du milieu', () => {
  const c666 = lireCible('666');
  // Sept 6, deux séries : le quatrième s'en va, et les deux triptyques sont
  // ceux que la lecture donne — c'est le cas exact de l'auteur.
  assert.deepEqual(lesPlusCentraux([6, 6, 6, 6, 6, 6, 6], [0, 1, 2, 3, 4, 5], c666), {
    gardes: [0, 1, 2, 4, 5, 6],
    surnumeraires: [3],
  });
  // Huit : « celui — ou les deux — du centre ».
  assert.deepEqual(lesPlusCentraux(Array(8).fill(6), [0, 1, 2, 3, 4, 5], c666).surnumeraires,
    [3, 4]);
  // Trois séries et un de trop : la coupure la plus proche du milieu de neuf
  // chiffres est à distance égale de part et d'autre ; on prend la gauche.
  assert.deepEqual(lesPlusCentraux(Array(10).fill(6), [...Array(9).keys()], c666).surnumeraires,
    [3]);
  // Quatre séries : le milieu tombe pile, et il est INTÉRIEUR.
  assert.deepEqual(lesPlusCentraux(Array(13).fill(6), [...Array(12).keys()], c666).surnumeraires,
    [6]);
  // Une cible à deux chiffres découpe par deux, pas par trois.
  assert.deepEqual(lesPlusCentraux([1, 1, 1, 1, 1], [0, 1, 2, 3], lireCible('11')).surnumeraires,
    [2]);
});

test('★ surnuméraire — la fonction renonce là où permuter changerait la démonstration', () => {
  const c666 = lireCible('666');
  // Rien en trop : il n'y a pas de geste à faire.
  assert.equal(lesPlusCentraux([6, 6, 6, 6, 6, 6], [0, 1, 2, 3, 4, 5], c666), null);
  // UNE seule série : une explosion PROPULSE, il lui faut quelqu'un à pousser
  // de chaque côté. Un 666 seul avec un 6 qui traîne n'a pas de milieu.
  assert.equal(lesPlusCentraux([6, 6, 6, 6], [0, 1, 2], c666), null);
  // Une cible NON HOMOGÈNE : les jetons ne sont plus interchangeables. La
  // suite `0 0 7 0 0 7 0` n'écrit `007` qu'en lisant certains jetons et pas
  // d'autres, et permuter y changerait ce qui est démontré, pas la façon de
  // le montrer.
  assert.equal(
    lesPlusCentraux([0, 0, 7, 0, 0, 7, 0], [0, 1, 2, 3, 4, 5], lireCible('007')),
    null,
  );
  // Et ce qui n'est pas le chiffre de la cible n'est pas SURNUMÉRAIRE, il est
  // FAUX : il tombe à l'étape de récolte, comme avant.
  assert.deepEqual(lesPlusCentraux([6, 6, 6, 4, 6, 6, 6, 6], [0, 1, 2, 4, 5, 6], c666), {
    gardes: [0, 1, 2, 5, 6, 7],
    surnumeraires: [4],
  });
});

/**
 * ★ LE LIEN DE L'AUTEUR, DE BOUT EN BOUT.
 *
 * > « `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#2HuP1G8mNg3sJWhqR` insère une
 * > étape 24 pour retirer le 6 excédentaire alors que c'est durant le verdict
 * > […] que le 6 central devrait disparaître. »
 *
 * Ce que le test tient : cette étape-là n'existe plus, le 6 de trop voyage
 * jusqu'au verdict, et c'est bien celui du MILIEU — donc les deux triptyques
 * révélés sont ceux que la ligne écrit d'elle-même, « Donald » d'un côté et
 * « Trump » de l'autre, et non le mélange que le découpage glouton donnait.
 */
test('★ surnuméraire — « Donald Trump » : plus d’étape pour le 6 de trop', () => {
  const m = creerMoteur(catalogue);
  const lien = `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#${encoderTexte('Donald Trump')}`;
  const r = m.rejouer(lireUrl(lien, { catalogue }));
  assert.ok(r.ok, r.raison || 'rejeu impossible');
  const sc = m.scenarioDe(r.approche, { saisie: 'Donald Trump', registre: 'scenique' });
  assert.deepEqual(validerScenario(sc), []);
  assert.equal(sc.result, '666 666');

  // 1. Sept 6 sur la ligne au moment du verdict — six révélés, un qui explose.
  const verdict = sc.steps[sc.steps.length - 1].ops.find((o) => o.op === 'reveal');
  assert.equal(verdict.targets.length, 6);
  assert.equal(verdict.surnumeraires.length, 1);

  // 2. Et c'est celui DU MILIEU : la ligne d'arrivée est trois révélés, le 6 de
  //    trop, trois révélés.
  const ligne = suivreLaLigne(sc.tokens, sc.steps).filter(Boolean).at(-1).ids;
  const six = ligne.filter((id) => verdict.targets.includes(id)
    || verdict.surnumeraires.includes(id));
  assert.equal(six.length, 7, 'les sept 6 sont encore là quand le verdict s’ouvre');
  assert.equal(six.indexOf(verdict.surnumeraires[0]), 3,
    `le 6 de trop est en ${six.indexOf(verdict.surnumeraires[0]) + 1}ᵉ position sur sept`);

  // 3. Plus AUCUNE étape ne fait tomber un 6 — c'est le reproche exact de
  //    l'auteur, et sur ce lien-ci la récolte n'avait rien d'autre à jeter,
  //    si bien qu'elle disparaît entièrement.
  assert.equal(sc.steps.filter((st) => st.recolte).length, 0,
    'la récolte n’avait plus rien à récolter : elle ne doit plus être là');
});

test('★ surnuméraire — un jeton ne peut pas être à la fois révélé et détruit', () => {
  assert.equal(validerFormeOp({ op: 'reveal', targets: ['a', 'b', 'c'] }), null);
  assert.equal(
    validerFormeOp({ op: 'reveal', targets: ['a', 'b', 'c'], surnumeraires: ['d'] }),
    null,
  );
  assert.match(
    validerFormeOp({ op: 'reveal', targets: ['a', 'b', 'c'], surnumeraires: ['b'] }),
    /révèle/,
  );
  // Jamais un sélecteur : le verdict doit SAVOIR lesquels il fait sauter.
  assert.match(
    validerFormeOp({ op: 'reveal', targets: ['a', 'b'], surnumeraires: { group: 'p0' } }),
    /identifiants/,
  );
});
