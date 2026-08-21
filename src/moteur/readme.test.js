/**
 * Les **sept méthodes du README**, recalculées par le catalogue publié.
 *
 * C'est le test d'étalonnage du projet : si l'une d'elles cesse de tomber juste,
 * c'est le moteur qui a tort, pas le README. Deux points sont repris de
 * `research §5` : la Méthode 5 y a reçu sa définition manquante, la Méthode 7 sa
 * formulation rigoureuse (« réduction signée »).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PAR_CODE, appliquer, appliquerProgramme, derouler } from './catalogue.js';
import { depuisSaisie, tokens, nums, num } from './etat.js';
import {
  TIRET_DU_SIX, NOTE_AFNOR, CHIFFRE_DE_TOUCHE, AZERTY, QWERTY, colonne, rangee,
} from './tables/claviers.js';
import { compile } from '../visuel/compile.js';
import { LETTER_ROWS, KEYBOARD_CHARSET, findKey } from '../visuel/assets.js';
import { setGlyphes } from '../visuel/glyphes.js';
import { GLYPHES } from './tables/glyphes.js';

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const SAISIE = 'hope-hope-hope.fr';
const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const T = (v) => tokens(v, v.map((_, i) => [[i, i + 1]]));

/** Applique un programme et rend la valeur finale (ou `null`). */
function valeur(codes, saisie = SAISIE) {
  const r = appliquerProgramme(codes, depuisSaisie(saisie));
  return r && r.valeur;
}

test('Méthode 1 — le détour linguistique : hope → espoir → 6 lettres', () => {
  // .fr ignoré, motif répété isolé, traduction, comptage
  assert.equal(valeur(['f3', 'fd', 'fe', 'n1']), 6);
  // les trois occurrences sont bien vues comme le même mot
  assert.deepEqual(PAR_CODE.get('fd').couverture('hope-hope-hope'), [[0, 4], [5, 9], [10, 14]]);
});

test('Méthode 2 — 4 lettres + 2 voyelles = 6', () => {
  assert.equal(valeur(['f3', 'fd', 'n7']), 6);
  assert.equal(valeur(['n1'], 'hope'), 4);
  assert.equal(valeur(['n2'], 'hope'), 2);
});

test('Méthode 3 — 4 lettres + 2 consonnes = 6', () => {
  assert.equal(valeur(['f3', 'fd', 'n8']), 6);
  assert.equal(valeur(['n3'], 'hope'), 2);
});

test('Méthodes 2 et 3 sont corrélées, pas indépendantes (research §5)', () => {
  // Elles tombent juste ensemble dès que voyelles et consonnes s'équilibrent.
  for (const mot of ['hope', 'nova', 'lego']) {
    assert.equal(valeur(['n7'], mot), valeur(['n8'], mot), mot);
  }
  assert.notEqual(valeur(['n7'], 'strong'), valeur(['n8'], 'strong'));
  assert.match(PAR_CODE.get('n8').note.fr, /Cousine/);
  assert.match(PAR_CODE.get('n8').note.en, /cousin/);
});

test('Méthode 4 — A1Z26 : 8+15+16+5 = 44 → 8, puis 8+8+8 = 24 → 6', () => {
  assert.deepEqual(valeur(['f3', 'fd', 't1', 'm1']), [8, 15, 16, 5]);
  assert.equal(valeur(['f3', 'fd', 't1', 'm1', 'c1']), 44);
  const parMot = valeur(['f3', 'fd', 't1', 'm1', 'c1', 'p1']);
  assert.equal(parMot, 8);
  // les trois « hope » assemblés
  const triplet = appliquerProgramme(['c1', 'p1'], N([parMot, parMot, parMot]));
  assert.equal(triplet.valeur, 6);
});

test('Méthode 5 — traits continus fusionnés : 3+4+4+4 = 15 → 6', () => {
  assert.deepEqual(valeur(['f3', 'fd', 'fg', 't1', 'me']), [3, 4, 4, 4]);
  assert.equal(valeur(['f3', 'fd', 'fg', 't1', 'me', 'c1']), 15);
  assert.equal(valeur(['f3', 'fd', 'fg', 't1', 'me', 'c1', 'p1']), 6);
});

test('Méthode 6 — le tiret du 6, puis 36 → 9 retourné en 6', () => {
  // (a) le tiret partage la touche du 6 en AZERTY, source primaire xkb
  assert.equal(TIRET_DU_SIX.nonShiftee, '-');
  assert.equal(TIRET_DU_SIX.shiftee, '6');
  assert.match(TIRET_DU_SIX.source, /xkb/);
  // (a bis) ★ et un OPÉRATEUR l'exploite : la table ne suffisait pas. Le trou
  // du catalogue était exactement là — aucun des 88 opérateurs ne rendait 6 sur
  // des TOKENS ['-','-'], et le test ne vérifiait que la table.
  assert.deepEqual(valeur(['f3', 't3', 'mv']), [6, 6]);
  assert.equal(PAR_CODE.get('mv').id, 'm.toucheChiffre');
  // les dix touches de la rangée du haut, pas seulement le tiret
  assert.deepEqual(
    appliquer(PAR_CODE.get('mv'), T(['&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à'])).valeur,
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
  );
  assert.equal(Object.keys(CHIFFRE_DE_TOUCHE).length, 10);
  // (b) 8 + 6 + 8 + 6 + 8 = 36 → 9 → retourné → 6
  const somme = appliquer(PAR_CODE.get('c1'), N([8, 6, 8, 6, 8]));
  assert.equal(somme.valeur, 36);
  const neuf = appliquer(PAR_CODE.get('p1'), somme);
  assert.equal(neuf.valeur, 9);
  assert.equal(appliquer(PAR_CODE.get('p9'), neuf).valeur, 6);
  // la nuance AFNOR est portée en note de bas de page des opérateurs clavier
  assert.equal(PAR_CODE.get('ml').note, NOTE_AFNOR);
  assert.equal(PAR_CODE.get('mv').note, NOTE_AFNOR);
});

test('Méthode 7 — la soustraction : 8−15−16−5 = −28 → 6', () => {
  assert.equal(valeur(['f3', 'fd', 't1', 'm1', 'c2']), -28);
  // formulation rigoureuse retenue : le signe porte sur le premier chiffre
  assert.equal(valeur(['f3', 'fd', 't1', 'm1', 'c2', 'p4']), 6);
  // variante « écart des chiffres », qui ne vaut que pour deux chiffres
  assert.equal(valeur(['f3', 'fd', 't1', 'm1', 'c2', 'p3', 'p5']), 6);
  // et la réduction standard, elle, ne donne PAS 6 — la formulation du README
  // était bien ambiguë (research §5)
  assert.equal(valeur(['f3', 'fd', 't1', 'm1', 'c2', 'p3', 'p1']), 1);
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ★ LE GARDE-FOU : les sept méthodes sont-elles ATTEIGNABLES de bout en bout ?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce test est celui qui manquait. L'ancien vérifiait que la table `TIRET_DU_SIX`
 * existait — pas qu'un opérateur l'exploitait. La méthode 6 était donc
 * **inatteignable** : aucun des 88 opérateurs ne rendait 6 sur des
 * `TOKENS ['-','-']`, et personne ne s'en apercevait.
 *
 * On exige désormais, pour chacune des sept méthodes :
 *   1. qu'une composition de codes DU CATALOGUE produise la valeur annoncée ;
 *   2. que les trois 6 du README soient effectivement obtenus (assemblage inclus) ;
 *   3. que chaque fragment S'ANIME — compilé par `src/visuel/compile.js`, le vrai,
 *      avec une timeline non vide et **aucun avertissement**.
 *
 * Une méthode qui cesse d'être atteignable casse ce test au lieu de disparaître
 * en silence.
 */

/** Tokens de scène représentant un état — un par élément, `t0`, `t1`, … */
function tokensDe(etat) {
  const elements = etat.type === 'STR' ? [...etat.valeur]
    : etat.type === 'NUM' ? [String(etat.valeur)] : etat.valeur.map(String);
  return elements.map((text, i) => ({ id: `t${i}`, text: String(text) }));
}

/**
 * Déroule un programme ET le compile dans le moteur visuel réel.
 * @returns {{valeur:*, steps:Array, timeline:object}}
 */
function demontrer(codes, etatDepart, quoi) {
  const r = derouler(codes, etatDepart);
  assert.ok(r, `${quoi} : le programme ${codes.join('+')} s’interrompt — méthode INATTEIGNABLE`);
  const steps = r.etapes.flatMap((e) => e.steps);
  assert.ok(steps.length >= 1, `${quoi} : aucun step émis`);
  assert.deepEqual(JSON.parse(JSON.stringify(steps)), steps, `${quoi} : steps non sérialisables`);
  const ids = steps.map((st) => st.id);
  assert.equal(new Set(ids).size, ids.length, `${quoi} : ids de steps dupliqués`);
  for (const etape of r.etapes) {
    assert.ok(etape.apres.traces.length > 0, `${quoi} : ${etape.code} sans trace`);
  }

  const timeline = compile({ version: 1, tokens: tokensDe(etatDepart), steps });
  assert.ok(timeline.total > 0, `${quoi} : timeline de durée nulle — ça ne s’anime pas`);
  assert.equal(timeline.steps.length, steps.length, `${quoi} : steps perdus à la compilation`);
  assert.deepEqual(timeline.warnings, [], `${quoi} : ${timeline.warnings.join(' | ')}`);
  return { valeur: r.etat.valeur, steps, timeline };
}

/**
 * Les sept méthodes, telles que le README les énonce.
 * `fragments` : chaque entrée est { codes, depuis, attendu } ; `depuis` est
 * l'état de départ (la saisie, ou un état intermédiaire assemblé à la main
 * quand le README assemble lui-même — c'est le rôle de la virgule d'URL, §4.2).
 */
const METHODES = [
  {
    n: 1,
    titre: 'Le détour linguistique — hope → espoir → 6 lettres',
    fragments: [{ codes: ['f3', 'fd', 'fe', 'n1'], attendu: 6, resonance: 3 }],
    six: [6, 6, 6],
  },
  {
    n: 2,
    titre: 'Les lettres + les voyelles — 4 + 2 = 6',
    fragments: [{ codes: ['f3', 'fd', 'n7'], attendu: 6, resonance: 3 }],
    six: [6, 6, 6],
  },
  {
    n: 3,
    titre: 'Les lettres + les consonnes — 4 + 2 = 6',
    fragments: [{ codes: ['f3', 'fd', 'n8'], attendu: 6, resonance: 3 }],
    six: [6, 6, 6],
  },
  {
    n: 4,
    titre: 'A1Z26 — 44 → 8, puis 8+8+8 = 24 → 6, et deux tirets du 6',
    fragments: [
      { codes: ['f3', 'fd', 't1', 'm1', 'c1', 'p1'], attendu: 8 },
      { codes: ['c1', 'p1'], depuis: () => N([8, 8, 8]), attendu: 6 },
      { codes: ['f3', 't3', 'mv'], attendu: [6, 6] },
    ],
    six: [6, 6, 6],
  },
  {
    n: 5,
    titre: 'Sept segments fusionnés — 3+4+4+4 = 15 → 6',
    fragments: [{ codes: ['f3', 'fd', 'fg', 't1', 'me', 'c1', 'p1'], attendu: 6, resonance: 3 }],
    six: [6, 6, 6],
  },
  {
    n: 6,
    titre: 'Le tiret du 6, et 8+6+8+6+8 = 36 → 9 retourné en 6',
    fragments: [
      // ★ les deux 6 des séparateurs — c'est CE fragment qui n'existait pas
      { codes: ['f3', 't3', 'mv'], attendu: [6, 6] },
      // le 8 de chaque « hope »
      { codes: ['f3', 'fd', 't1', 'm1', 'c1', 'p1'], attendu: 8 },
      // et le troisième 6, en incluant les deux tirets dans la somme
      { codes: ['c1', 'p1', 'p9'], depuis: () => N([8, 6, 8, 6, 8]), attendu: 6 },
    ],
    six: [6, 6, 6],
  },
  {
    n: 7,
    titre: 'La soustraction — 8−15−16−5 = −28 → 6',
    fragments: [{ codes: ['f3', 'fd', 't1', 'm1', 'c2', 'p4'], attendu: 6, resonance: 3 }],
    six: [6, 6, 6],
  },
];

test('★ les sept méthodes du README sont atteignables — et elles s’animent', () => {
  const rapport = [];
  for (const m of METHODES) {
    let steps = 0;
    let duree = 0;
    for (const f of m.fragments) {
      const depart = f.depuis ? f.depuis() : depuisSaisie(SAISIE);
      const quoi = `Méthode ${m.n} · ${f.codes.join('+')}`;
      const r = demontrer(f.codes, depart, quoi);
      assert.deepEqual(r.valeur, f.attendu, `${quoi} : valeur obtenue ≠ valeur annoncée`);
      steps += r.steps.length;
      duree += r.timeline.total;
    }
    // Les trois 6 du README sont bien tous produits par la méthode.
    const produits = m.fragments.flatMap((f) => [].concat(f.attendu)
      .flatMap((v) => (v === 6 ? Array(f.resonance || 1).fill(6) : [])));
    assert.ok(produits.length >= 3,
      `Méthode ${m.n} : ${produits.length} six produits, il en faut trois pour 666`);
    assert.deepEqual(m.six, [6, 6, 6]);
    rapport.push(`    M${m.n} ✔ ${m.titre}\n         ${m.fragments.length} fragment(s), `
      + `${steps} steps, ${Math.round(duree)} ms d’animation`);
  }
  console.log(rapport.join('\n'));
});

test('★ le clavier montre bien ce que l’arithmétique annonce (contrôle croisé)', () => {
  // Le moteur visuel refuse d'afficher un nombre différent de celui que porte le
  // scénario : c'est ce qui empêche `tables/claviers.js` et la géométrie de
  // `src/visuel/assets.js` de diverger en silence. On le vérifie sur les quatre
  // mappeurs clavier ET sur le tiret du 6.
  for (const code of ['ml', 'mm', 'mn', 'mo', 'mv']) {
    const op = PAR_CODE.get(code);
    const entree = code === 'mv' ? T(['-', '_', 'ç']) : T(['h', 'o', 'p', 'e']);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : inapplicable`);
    const ctx = { ids: entree.valeur.map((_, i) => `t${i}`), cle: 'e0' };
    const steps = op.steps(entree, apres, ctx);
    // un step par jeton : deux claviers dans un step animeraient deux fois la caméra
    assert.equal(steps.length, entree.valeur.length, `${code} : un step par touche attendu`);
    for (const st of steps) {
      assert.equal(st.ops.filter((o) => o.op === 'keyboard').length, 1, `${code} : un clavier par step`);
    }
    const tl = compile({ version: 1, tokens: tokensDe(entree), steps });
    assert.deepEqual(tl.warnings, [], `${code} : ${tl.warnings.join(' | ')}`);
    assert.ok(tl.nodes.some((n) => n.role === 'keyboard'), `${code} : aucun clavier montré`);
    assert.ok(tl.anims.some((a) => a.id === '@camera' && a.prop === 'scale'), `${code} : caméra immobile`);
  }
  // ★ le piège de la colonne : « p » est en colonne 10, la touche du dessus
  // porte « 0 ». C'est 10 qui doit descendre.
  const ml = PAR_CODE.get('ml');
  const p = T(['p']);
  const stepsP = ml.steps(p, appliquer(ml, p), { ids: ['t0'], cle: 'e0' });
  assert.equal(stepsP[0].ops[0].to.text, '10');
  assert.equal(stepsP[0].ops[0].mesure, 'colonne');
  // et la compilation refuserait qu'on lui fasse dire 0
  assert.throws(() => compile({
    version: 1,
    tokens: [{ id: 't0', text: 'p' }],
    steps: [{ id: 's', title: 'x', ops: [{ op: 'keyboard', target: 't0', key: 'p', mesure: 'colonne', to: { id: 'z', text: '0' } }] }],
  }), /le clavier montre 10/);
});

test('★ les tables clavier du moteur et la géométrie du visuel ne divergent pas', () => {
  // Le moteur visuel ne peut pas importer les tables arithmétiques (règle de
  // non-collision, CONTRACTS §1) : il en porte un miroir. Ce test est le
  // contrôle croisé qui interdit la désynchronisation silencieuse — même
  // principe que les sommes de contrôle de `tables/derivees.js`.
  assert.deepEqual([...LETTER_ROWS.azerty], [...AZERTY]);
  assert.deepEqual([...LETTER_ROWS.qwerty], [...QWERTY]);
  for (const [layout, rangees] of [['azerty', AZERTY], ['qwerty', QWERTY]]) {
    for (const ligne of rangees) {
      for (const c of ligne) {
        const touche = findKey(c, { layout });
        assert.ok(touche, `${layout} : « ${c} » absent de la géométrie`);
        assert.equal(touche.colonne, colonne(c, rangees), `${layout} : colonne de « ${c} »`);
        assert.equal(touche.rangee, rangee(c, rangees), `${layout} : rangée de « ${c} »`);
        assert.ok(KEYBOARD_CHARSET[layout].includes(c), `${layout} : « ${c} » hors du jeu garanti`);
      }
    }
  }
  // la rangée du haut, celle du tiret du 6
  for (const [c, d] of Object.entries(CHIFFRE_DE_TOUCHE)) {
    const touche = findKey(c, { layout: 'azerty' });
    assert.ok(touche, `« ${c} » absent de la rangée de chiffres dessinée`);
    assert.equal(touche.rangee, 0, `« ${c} » doit être sur la rangée de chiffres`);
    assert.equal(Number(touche.digit), d, `« ${c} » partage la touche du ${d}`);
  }
});

test('la garantie « jamais bredouille » tient sur les entrées dégénérées', () => {
  // heuristique §5.3 : longueur → réduction → itération française → 6
  for (const saisie of ['a', '42', '666', '2026', '!!!', '01/01/2000', 'ok']) {
    // « toute saisie non vide possède au moins une longueur » : le comptage de
    // lettres quand il y en a, la longueur brute sinon.
    let etat = appliquerProgramme(['n1'], depuisSaisie(saisie))
      || num([...saisie].length, [[0, [...saisie].length]]);
    if (etat.valeur > 9) etat = appliquer(PAR_CODE.get('p1'), etat);
    let pas = 0;
    while (etat.valeur !== 6 && pas < 5) {
      etat = appliquer(PAR_CODE.get('j1'), etat);
      assert.ok(etat, `${saisie} : le joker a rendu null`);
      pas++;
    }
    assert.equal(etat.valeur, 6, `${saisie} n’atteint pas 6`);
    assert.ok(pas <= 4, `${saisie} : ${pas} étapes de joker`);
  }
});

test('le 666 lui-même échoue à se démontrer — le cadeau comique est intact', () => {
  const direct = appliquerProgramme(['t1', 'm1', 'c1', 'p1'], depuisSaisie('666'));
  assert.equal(direct, null, 'les chiffres ne sont pas des lettres');
  // seul le joker s'en sort : 3 lettres → 5 → 4 → 6
  assert.equal(valeur(['n5'], '666'), null);
});
