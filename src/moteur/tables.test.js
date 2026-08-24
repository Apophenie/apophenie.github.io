/**
 * Sommes de contrôle des tables — `node --test src/moteur`.
 * Les valeurs attendues viennent de `research/moteur-arithmetique.md §3.1`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  A1Z26, Z26A1, PYTHAGORE, CHALDEEN, ENGLISH_X6, LETTRES, atbash, cesar, sansAccents,
  lettresDuNomChiffre,
} from './tables/alphabet.js';
import { SCRABBLE_FR, SCRABBLE_EN, T9, MORSE, morseSignaux, morseTraits } from './tables/jeux.js';
import { SEG7, compteSegments, compteTraitsFusionnes, fusionSegments, traitsFusionnes } from './tables/seg7.js';
import {
  SEG14, SEG14_ORDRE, LETTRES_A_SIX_SEGMENTS, segments14De, compteSegments14,
  compteTraitsFusionnes14, fusion14, traitsFusionnes14,
} from './tables/seg14.js';
import { AZERTY, QWERTY, colonne, rangee, TIRET_DU_SIX, NOTE_AFNOR, TIRET_SUR_LE_SIX } from './tables/claviers.js';
import { HEBREU, GREC, valeurHebreu, valeurGrec, VAV, DIGAMMA } from './tables/ecritures.js';

const somme = (t) => Object.values(t).reduce((a, b) => a + b, 0);
const sommeLettres = (fn) => [...LETTRES].reduce((a, c) => a + fn(c), 0);

test('sommes de contrôle des tables alphabétiques (research §3.1)', () => {
  assert.equal(somme(A1Z26), 351);
  assert.equal(somme(Z26A1), 351);
  assert.equal(somme(PYTHAGORE), 126);
  assert.equal(somme(CHALDEEN), 103);
  assert.equal(somme(ENGLISH_X6), 2106);
  assert.equal(CHALDEEN.I, 1);
  assert.ok(!Object.values(CHALDEEN).includes(9), 'la table chaldéenne ignore le 9');
});

test('sommes de contrôle des tables de jeu', () => {
  assert.equal(somme(SCRABBLE_FR), 103);
  assert.equal(somme(SCRABBLE_EN), 87);
  assert.equal(sommeLettres((c) => morseSignaux(c)), 82);
  assert.equal(MORSE.E, '.');
  assert.equal(morseTraits('O'), 3);
  assert.deepEqual([...'HOPE'].map((c) => T9[c]), [4, 6, 7, 3]);
});

test('7 segments : 115 segments, 87 traits fusionnés', () => {
  assert.equal(sommeLettres((c) => compteSegments(c)), 115);
  assert.equal(sommeLettres((c) => compteTraitsFusionnes(c)), 87);
  assert.equal(SEG7.H, 'bcefg');
});

test('méthode 5 du README : H=3, O=4, P=4, E=4 → 15 → 6', () => {
  const v = [...'HOPE'].map((c) => compteTraitsFusionnes(c));
  assert.deepEqual(v, [3, 4, 4, 4]);
  const total = v.reduce((a, b) => a + b, 0);
  assert.equal(total, 15);
  assert.equal([...String(total)].reduce((a, d) => a + Number(d), 0), 6);
});

test('la fusion ne joint que b+c et e+f, et plafonne à 5', () => {
  assert.equal(fusionSegments('adg'), 3);
  assert.equal(fusionSegments('abcdefg'), 5);
  assert.deepEqual(traitsFusionnes('bcefg'), [['g'], ['b', 'c'], ['e', 'f']]);
  for (const c of LETTRES) assert.ok(compteTraitsFusionnes(c) <= 5);
});

test('14 segments : 140 segments, 101 traits fusionnés', () => {
  assert.equal(sommeLettres((c) => compteSegments14(c)), 140);
  assert.equal(sommeLettres((c) => compteTraitsFusionnes14(c)), 101);
  assert.deepEqual(SEG14.H, ['b', 'c', 'e', 'f', 'g1', 'g2']);
  // Les 36 signes, et rien que les noms de segments connus, sans doublon.
  assert.equal(Object.keys(SEG14).length, 36);
  for (const [signe, segs] of Object.entries(SEG14)) {
    assert.ok(segs.length >= 2, `${signe} : un afficheur n’allume pas un seul segment`);
    assert.equal(new Set(segs).size, segs.length, `${signe} : segment répété`);
    for (const s of segs) assert.ok(SEG14_ORDRE.includes(s), `${signe} : segment inconnu « ${s} »`);
    // Ordre canonique respecté : la table se lit comme l'afficheur s'allume.
    const trie = SEG14_ORDRE.filter((s) => segs.includes(s));
    assert.deepEqual([...segs], trie, `${signe} : hors ordre canonique`);
  }
});

test('★ 14 segments : HOPE s’écrit 6·6·6·6, et HOP vaut littéralement 666', () => {
  assert.deepEqual([...'HOPE'].map((c) => compteSegments14(c)), [6, 6, 6, 6]);
  // Sept lettres valent 6 segments, contre deux en sept segments (A et O).
  assert.deepEqual([...LETTRES].filter((c) => compteSegments14(c) === 6), [...LETTRES_A_SIX_SEGMENTS]);
  assert.deepEqual([...LETTRES].filter((c) => compteSegments(c) === 6), ['A', 'O']);
  // Et les traits fusionnés retombent sur le vecteur de la méthode 5 du README.
  assert.deepEqual([...'HOPE'].map((c) => compteTraitsFusionnes14(c)), [3, 4, 4, 4]);
});

test('★ 14 segments : la fusion joint les quatre paires, jamais les diagonales', () => {
  // Les quatre paires colinéaires et adjacentes : les deux verticales de côté,
  // la médiane scindée par le moyeu, la verticale centrale.
  assert.equal(fusion14(['b', 'c']), 1);
  assert.equal(fusion14(['e', 'f']), 1);
  assert.equal(fusion14(['g1', 'g2']), 1);
  assert.equal(fusion14(['i', 'l']), 1);
  // Les diagonales visent les FLANCS de la verticale centrale : jamais
  // colinéaires deux à deux, donc jamais fusionnées. `X` en allume quatre et
  // vaut quatre traits.
  assert.equal(fusion14(['h', 'm']), 2);
  assert.equal(fusion14(['j', 'k']), 2);
  assert.equal(compteTraitsFusionnes14('X'), 4);
  assert.deepEqual(traitsFusionnes14(segments14De('X')), [['h'], ['j'], ['k'], ['m']]);
  assert.deepEqual(traitsFusionnes14(segments14De('H')), [['g1', 'g2'], ['b', 'c'], ['e', 'f']]);
  // Borne : dix traits possibles — le double des cinq du sept segments.
  assert.equal(fusion14(SEG14_ORDRE), 10);
  for (const c of LETTRES) assert.ok(compteTraitsFusionnes14(c) <= 10);
});

test('★ 14 segments : ce que le sept segments ne savait pas distinguer', () => {
  // En sept segments, O et 0 partagent le même dessin, S et 5 aussi. Le
  // quatorze segments barre le zéro et donne deux diagonales au S.
  // (la table SEG7 est une CHAÎNE, dont l'ordre des lettres n'est pas normalisé :
  //  on compare les ENSEMBLES de segments allumés, pas leur écriture.)
  const memeJeu = (a, b) => [...a].sort().join('') === [...b].sort().join('');
  assert.ok(memeJeu(SEG7.O, SEG7[0]), 'en sept segments, O et 0 sont le même dessin');
  assert.ok(memeJeu(SEG7.S, SEG7[5]), 'en sept segments, S et 5 sont le même dessin');
  assert.notDeepEqual(SEG14.O, SEG14[0]);
  assert.notDeepEqual(SEG14.S, SEG14[5]);
  // Et il n'emprunte pas : K, X et H ont trois dessins distincts, là où le
  // sept segments donne le même aux trois (CONTRACTS §0.4).
  assert.ok(memeJeu(SEG7.K, SEG7.H), 'le K emprunte le tracé du H');
  assert.ok(memeJeu(SEG7.X, SEG7.H), 'le X aussi');
  const distincts = new Set([SEG14.K, SEG14.X, SEG14.H].map((s) => s.join('')));
  assert.equal(distincts.size, 3);
});

test('claviers : la colonne 6 est celle du tiret — Y, H, N', () => {
  assert.equal(TIRET_DU_SIX.nonShiftee, '-');
  assert.equal(TIRET_DU_SIX.shiftee, '6');
  const col6 = [...LETTRES].filter((c) => colonne(c, AZERTY) === 6);
  assert.deepEqual(col6, ['H', 'N', 'Y']);
  assert.deepEqual([...LETTRES].filter((c) => colonne(c, QWERTY) === 6), ['H', 'N', 'Y']);
  assert.deepEqual([...'HOPE'].map((c) => colonne(c, AZERTY)), [6, 9, 10, 3]);
  assert.deepEqual([...'HOPE'].map((c) => rangee(c, AZERTY)), [2, 1, 1, 1]);
});

test('la nuance AFNOR est portée par les tables, pas cachée', () => {
  assert.match(NOTE_AFNOR.fr, /AFNOR/);
  // La spécificité française du « tiret du 6 » est dite dans les DEUX langues :
  // sur un QWERTY américain, la touche 6 porte un accent circonflexe.
  assert.match(NOTE_AFNOR.en, /AFNOR/);
  assert.match(NOTE_AFNOR.en, /QWERTY/);
  assert.match(NOTE_AFNOR.fr, /circonflexe/);
  assert.equal(TIRET_SUR_LE_SIX.azerty, true);
  assert.equal(TIRET_SUR_LE_SIX.afnor, false);
  assert.equal(TIRET_SUR_LE_SIX.qwerty, false);
});

test('écritures : vav = 6, donc www = 666 ; digamma = 6', () => {
  assert.equal(VAV.valeur, 6);
  assert.equal(HEBREU[VAV.lettre], 6);
  assert.equal(GREC[DIGAMMA.lettre], 6);
  assert.deepEqual([...'WWW'].map(valeurHebreu), [6, 6, 6]);
  assert.deepEqual([...'HOPE'].map(valeurHebreu), [8, 70, 80, 5]);
  assert.deepEqual([...'HOPE'].map(valeurGrec), [8, 70, 80, 5]);
});

test('utilitaires alphabétiques', () => {
  assert.equal(atbash('hope'), 'slkv');
  assert.equal(cesar('hope', 13), 'ubcr');
  assert.equal(sansAccents('créé'), 'cree');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lettresDuNomChiffre), [4, 2, 4, 5, 6, 4, 3, 4, 4, 4]);
});

test('les lettres magiques : celles qui valent 6', () => {
  const valant6 = (fn) => [...LETTRES].filter((c) => fn(c) === 6);
  assert.deepEqual(valant6((c) => A1Z26[c]), ['F']);
  assert.deepEqual(valant6((c) => Z26A1[c]), ['U']);
  assert.deepEqual(valant6((c) => PYTHAGORE[c]), ['F', 'O', 'X']);
  assert.deepEqual(valant6((c) => CHALDEEN[c]), ['U', 'V', 'W']);
  assert.deepEqual(valant6((c) => T9[c]), ['M', 'N', 'O']);
  assert.deepEqual(valant6((c) => compteSegments(c)), ['A', 'O']);
  assert.deepEqual(valant6((c) => colonne(c, AZERTY)), ['H', 'N', 'Y']);
  // les trois triplets vedettes du catalogue
  assert.deepEqual([...'WWW'].map(valeurHebreu), [6, 6, 6]);
  assert.deepEqual([...'FOX'].map((c) => PYTHAGORE[c]), [6, 6, 6]);
  assert.deepEqual([...'WWW'].map((c) => CHALDEEN[c]), [6, 6, 6]);
});

test('les tables sont gelées', () => {
  for (const t of [A1Z26, CHALDEEN, SCRABBLE_FR, SEG7, SEG14, T9, MORSE, HEBREU, GREC]) {
    assert.ok(Object.isFrozen(t));
  }
  // Chaque entrée de SEG14 est un tableau gelé : la table est un journal, pas
  // un état modifiable.
  for (const segs of Object.values(SEG14)) assert.ok(Object.isFrozen(segs));
});
