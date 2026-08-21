/**
 * ★ Bilinguisme du catalogue — le site parle français ET anglais.
 *
 * Règle : **toute chaîne affichable porte ses deux langues**. Il n'y a pas de
 * repli silencieux ; une chaîne nue serait une régression invisible à l'écran
 * (le lecteur anglophone tomberait sur du français au milieu d'une phrase).
 * Le contrôle est le même esprit que `catalogue.test.js` : échec bruyant.
 *
 * Deux nuances de fond sont vérifiées ici, parce qu'elles ne sont PAS des
 * détails de traduction (voir `i18n.js`) :
 *   · le « tiret du 6 » est une particularité du clavier français ;
 *   · le joker `j1` ne fonctionne qu'en français, et l'anglais l'assume.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CATALOGUE, PAR_CODE, etapes, appliquer } from './catalogue.js';
import { LANGUES, LANGUE_DEFAUT, estBilingue, dire, bilingue, langueValide } from './i18n.js';
import { depuisSaisie, tokens, num } from './etat.js';
import { NOTE_AFNOR, TIRET_DU_SIX } from './tables/claviers.js';
import { MENTION_SEG7, SEG7_APPROXIMATIONS } from './tables/seg7.js';
import { NOTE_SOURCAGE } from './tables/ecritures.js';

/** Champs affichés à l'écran par l'interface (`catalogue.js → descriptif`). */
const CHAMPS_AFFICHES = ['libelle', 'regle', 'note'];

/**
 * Les seuls couples légitimement identiques dans les deux langues : de la
 * notation, pas de la prose. Toute autre égalité fr/en est une traduction
 * oubliée.
 */
const NOTATIONS = new Set(['fj:regle', 'n2:regle', 'm1:regle', 'm2:regle', 'mb:regle', 'mc:regle']);

test('★ toute chaîne affichable du catalogue porte ses deux langues', () => {
  assert.equal(CATALOGUE.length, 89, 'le catalogue publié compte 89 opérateurs');
  for (const op of CATALOGUE) {
    assert.ok(estBilingue(op.libelle), `${op.code} (${op.id}) : « libelle » n’est pas bilingue`);
    assert.ok(estBilingue(op.regle), `${op.code} (${op.id}) : « regle » n’est pas bilingue`);
    assert.ok(op.note === null || estBilingue(op.note),
      `${op.code} (${op.id}) : « note » n’est ni null ni bilingue`);
    for (const champ of CHAMPS_AFFICHES) {
      if (!op[champ]) continue;
      for (const langue of LANGUES) {
        const texte = op[champ][langue];
        assert.equal(typeof texte, 'string', `${op.code}.${champ}.${langue} : chaîne attendue`);
        assert.ok(texte.trim().length > 3, `${op.code}.${champ}.${langue} : chaîne vide ou trop courte`);
        assert.equal(texte, texte.trim(), `${op.code}.${champ}.${langue} : espaces parasites`);
      }
    }
  }
});

test('aucune traduction oubliée : fr et en diffèrent, sauf notation pure', () => {
  const suspects = [];
  for (const op of CATALOGUE) {
    for (const champ of CHAMPS_AFFICHES) {
      if (!op[champ]) continue;
      if (op[champ].fr === op[champ].en && !NOTATIONS.has(`${op.code}:${champ}`)) {
        suspects.push(`${op.code}.${champ} = ${JSON.stringify(op[champ].fr)}`);
      }
    }
  }
  assert.deepEqual(suspects, [], 'chaînes identiques dans les deux langues');
});

test('les notes portées par les tables sont bilingues elles aussi', () => {
  for (const [nom, note] of [
    ['NOTE_AFNOR', NOTE_AFNOR], ['MENTION_SEG7', MENTION_SEG7], ['NOTE_SOURCAGE', NOTE_SOURCAGE],
  ]) {
    assert.ok(estBilingue(note), `${nom} n’est pas bilingue`);
  }
  for (const [lettre, mention] of Object.entries(SEG7_APPROXIMATIONS)) {
    assert.ok(estBilingue(mention), `SEG7_APPROXIMATIONS.${lettre} n’est pas bilingue`);
  }
});

test('★ le « tiret du 6 » est annoncé comme une spécificité française, en anglais aussi', () => {
  // Sur un QWERTY américain, la touche 6 porte « ^ » : masquer la nuance
  // rendrait la méthode 6 du README incompréhensible hors de France.
  assert.equal(TIRET_DU_SIX.nonShiftee, '-');
  assert.equal(TIRET_DU_SIX.shiftee, '6');
  assert.match(NOTE_AFNOR.en, /French/);
  assert.match(NOTE_AFNOR.en, /QWERTY/);
  assert.match(NOTE_AFNOR.en, /AZERTY/);
  assert.match(NOTE_AFNOR.fr, /circonflexe/);
  // Les deux opérateurs de clavier AZERTY portent bien la note.
  for (const code of ['ml', 'mm']) {
    assert.equal(PAR_CODE.get(code).note, NOTE_AFNOR, `${code} : note AFNOR absente`);
  }
});

test('★ le joker j1 est présenté en anglais comme une curiosité française', () => {
  const joker = PAR_CODE.get('j1');
  assert.equal(joker.isJoker, true);
  // La version anglaise NOMME l'obstacle plutôt que d'inventer un équivalent :
  // « four » a quatre lettres, donc 4 est un point fixe et 6 est hors d'atteinte.
  assert.match(joker.note.en, /French/);
  assert.match(joker.note.en, /four/);
  assert.match(joker.regle.en, /French/);
  assert.match(joker.libelle.en, /French/);
  assert.match(joker.note.fr, /français/);
  // Et le fait arithmétique qui l'exige : en anglais, 4 ne bouge pas.
  assert.equal('four'.length, 4);
  assert.equal(appliquer(joker, num(4, [[0, 1]])).valeur, 6, 'en français, quatre → 6');
});

test('la méthode « longueur du nom de la lettre » dit qu’elle épelle en français', () => {
  const op = PAR_CODE.get('mr');
  assert.match(op.libelle.en, /French/);
  assert.ok(op.note && /French/.test(op.note.en), 'mr : la note anglaise doit nommer la langue');
});

test('les steps() sont émis dans la langue demandée, titres et légendes compris', () => {
  const cas = [
    ['f7', depuisSaisie('hope')],
    ['t1', depuisSaisie('hope')],
    ['n1', depuisSaisie('hope')],
    ['m1', tokens(['h', 'o', 'p', 'e'], [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]])],
    ['c1', { type: 'NUMS', valeur: [8, 15, 16, 5], traces: [[0, 4]], origines: null }],
    ['p1', num(44, [[0, 4]])],
    ['p9', num(9, [[0, 1]])],
    ['j1', num(4, [[0, 1]])],
  ];
  for (const [code, entree] of cas) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : entrée de test inapplicable`);
    const n = entree.type === 'STR' ? [...entree.valeur].length
      : entree.type === 'NUM' ? 1 : entree.valeur.length;
    const ids = Array.from({ length: n }, (_, i) => `t${i}`);
    const vus = {};
    for (const langue of LANGUES) {
      const steps = etapes(op, entree, apres, { ids, cle: 'e0', langue });
      assert.ok(steps.length >= 1, `${code}/${langue} : aucun step`);
      for (const s of steps) {
        assert.equal(typeof s.title, 'string', `${code}/${langue} : titre non textuel`);
        assert.ok(s.title.trim(), `${code}/${langue} : titre vide`);
        if (s.caption !== undefined) {
          assert.equal(typeof s.caption, 'string', `${code}/${langue} : légende non textuelle`);
        }
      }
      vus[langue] = steps.map((s) => s.title).join(' | ');
    }
    assert.notEqual(vus.fr, vus.en, `${code} : le titre des steps ne change pas avec la langue`);
  }
});

test('dire() : lecture tolérante, écriture stricte', () => {
  const couple = bilingue('bonjour', 'hello');
  assert.equal(dire(couple, 'fr'), 'bonjour');
  assert.equal(dire(couple, 'en'), 'hello');
  assert.equal(dire(couple), 'bonjour', 'le français est la langue de repli');
  assert.equal(dire(couple, 'de'), 'bonjour', 'une langue inconnue retombe sur le repli');
  assert.equal(dire('chaîne nue', 'en'), 'chaîne nue', 'une chaîne calculée passe telle quelle');
  assert.equal(dire(null, 'en'), null);
  assert.equal(dire(undefined, 'fr'), null);
  assert.ok(Object.isFrozen(couple), 'un couple bilingue est gelé');

  assert.equal(estBilingue({ fr: 'a' }), false, 'une seule langue ne suffit pas');
  assert.equal(estBilingue({ fr: 'a', en: '' }), false, 'une langue vide ne compte pas');
  assert.equal(estBilingue({ fr: 'a', en: 'b', de: 'c' }), false, 'pas de langue en trop');
  assert.equal(estBilingue('a'), false);
  assert.equal(estBilingue(null), false);

  assert.deepEqual(LANGUES, ['fr', 'en']);
  assert.equal(LANGUE_DEFAUT, 'fr');
  assert.equal(langueValide('en'), 'en');
  assert.equal(langueValide('zz'), 'fr');
  assert.equal(langueValide(undefined), 'fr');
});
