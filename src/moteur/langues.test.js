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
 *   · le joker `jnf` ne fonctionne qu'en français, et l'anglais l'assume.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { CATALOGUE, PAR_CODE, etapes, appliquer } from './catalogue.js';
import { LANGUES, LANGUE_DEFAUT, estBilingue, dire, bilingue, langueValide } from './i18n.js';
import { depuisSaisie, tokens, num } from './etat.js';
import { NOTE_AFNOR, TIRET_DU_SIX } from './tables/claviers.js';
import {
  MENTION_SEG7, SEG7_APPROXIMATIONS, SEG7, ECARTS_POLICE_SEG7, segmentsDe,
} from './tables/seg7.js';
import { MENTION_SEG14, segments14De } from './tables/seg14.js';
import { MOT_OPERANDES, natureOperandes } from './transformations/combinateurs.js';
import { NOTE_SOURCAGE } from './tables/ecritures.js';

/** Champs affichés à l'écran par l'interface (`catalogue.js → descriptif`).
 *  `gabarit` est le libellé d'ÉTAPE à trou des combinateurs (« On additionne
 *  les %s ») : il s'affiche dans Le Registre, donc il porte ses deux langues
 *  comme le reste (`transformations/combinateurs.js`).
 *  `outil` est le nom du DÉCOR affiché dans la scène — la réglette, le clavier,
 *  l'afficheur (`transformations/commun.js › def`). Il est toujours présent
 *  (à défaut, c'est le libellé), donc toujours à traduire. */
const CHAMPS_AFFICHES = ['libelle', 'regle', 'note', 'gabarit', 'outil'];

/**
 * Les seuls couples légitimement identiques dans les deux langues : de la
 * notation, pas de la prose. Toute autre égalité fr/en est une traduction
 * oubliée.
 */
const NOTATIONS = new Set(['flt:regle', 'nv:regle', 'ma1:regle', 'mz26:regle', 'masc:regle', 'masb:regle']);

test('★ toute chaîne affichable du catalogue porte ses deux langues', () => {
  assert.equal(CATALOGUE.length, 131, 'le catalogue publié compte 131 opérateurs');
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
  for (const code of ['mazc', 'mazr']) {
    assert.equal(PAR_CODE.get(code).note, NOTE_AFNOR, `${code} : note AFNOR absente`);
  }
});

test('★ le joker j1 est présenté en anglais comme une curiosité française', () => {
  const joker = PAR_CODE.get('jnf');
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
  const op = PAR_CODE.get('mln');
  assert.match(op.libelle.en, /French/);
  assert.ok(op.note && /French/.test(op.note.en), 'mr : la note anglaise doit nommer la langue');
});

test('les steps() sont émis dans la langue demandée, titres et légendes compris', () => {
  const cas = [
    ['fv', depuisSaisie('hope')],
    ['tca', depuisSaisie('hope')],
    ['nl', depuisSaisie('hope')],
    ['ma1', tokens(['h', 'o', 'p', 'e'], [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]])],
    ['cs', { type: 'NUMS', valeur: [8, 15, 16, 5], traces: [[0, 4]], origines: null }],
    ['prn', num(44, [[0, 4]])],
    ['pr9', num(9, [[0, 1]])],
    ['jnf', num(4, [[0, 1]])],
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

test('★ « les chiffres » ou « les nombres » : le titre s’accorde aux opérandes', () => {
  // Le mot décrit CE QUI EST À L'ÉCRAN, pas l'opérateur : les comptes de
  // segments (3, 4, 4, 4) sont des chiffres, les rangs alphabétiques
  // (8, 15, 16, 5) sont des nombres. Voir `combinateurs.js`.
  assert.equal(natureOperandes([3, 4, 4, 4]), 'chiffre');
  assert.equal(natureOperandes([8, 15, 16, 5]), 'nombre');
  assert.equal(natureOperandes([1, 2, 10]), 'nombre', 'un seul opérande à deux signes suffit');
  assert.equal(natureOperandes([-3, 4]), 'chiffre', 'le signe n’ajoute pas un chiffre');
  assert.equal(natureOperandes([]), 'nombre', 'sans opérande, on n’affirme pas « chiffres »');
  for (const nature of ['chiffre', 'nombre']) {
    assert.ok(estBilingue(MOT_OPERANDES[nature]), `MOT_OPERANDES.${nature} n’est pas bilingue`);
  }

  const attendus = {
    fr: { chiffres: 'On additionne les chiffres', nombres: 'On additionne les nombres' },
    en: { chiffres: 'Add up the digits', nombres: 'Add up the numbers' },
  };
  const c1 = PAR_CODE.get('cs');
  for (const langue of LANGUES) {
    for (const [cle, valeurs] of [['chiffres', [3, 4, 4, 4]], ['nombres', [8, 15, 16, 5]]]) {
      const entree = { type: 'NUMS', valeur: valeurs, traces: [[0, valeurs.length]], origines: null };
      const apres = appliquer(c1, entree);
      const ids = valeurs.map((_, i) => `t${i}`);
      const steps = etapes(c1, entree, apres, { ids, cle: 'e0', langue });
      assert.equal(steps[0].title, attendus[langue][cle], `c1/${langue}/${cle}`);
    }
  }
});

test('★ la figure sept segments du Registre : du texte, pas un dessin', () => {
  // La scène est `aria-hidden` (CONTRACTS §6). Le Registre montre la lettre en
  // POLICE sept segments : le DOM porte « H », donc rien à décrire à la main.
  // Ce que le scénario transporte, ce n'est pas un rendu — c'est de quoi rendre.
  const op = PAR_CODE.get('m7F');
  const entree = tokens(['h', 'o', 'p', 'e'], [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]]);
  const apres = appliquer(op, entree);
  const ids = ['t0', 't1', 't2', 't3'];
  for (const langue of LANGUES) {
    const steps = etapes(op, entree, apres, { ids, cle: 'e0', langue });
    assert.equal(steps.length, 4, 'un step par jeton');
    steps.forEach((s, i) => {
      const f = s.figure;
      assert.ok(f, `${langue} : step ${i} sans figure`);
      assert.equal(f.type, 'seg7');
      assert.equal(f.glyphe, 'HOPE'[i], 'la figure montre la lettre elle-même');
      assert.equal(f.valeur, apres.valeur[i], 'la figure annonce le nombre de l’arithmétique');
      // `segments` est la trace de ce que la SCÈNE allume — c'est lui qui rend
      // l'écart avec la police mesurable (voir `tables/seg7.js`).
      assert.equal(f.segments, segmentsDe(f.glyphe));
      assert.equal(f.texte, `${f.glyphe} \u2192 ${f.valeur}`);
      // Un glyphe et un nombre : pas de prose, donc rien à traduire.
      assert.ok(!/[a-z]/.test(f.texte), 'l’équivalent textuel ne contient pas de prose');
    });
  }
});

test('★ la figure quatorze segments : même contrat, et la police enfin d’accord', () => {
  // Même exigence que ci-dessus — du texte, pas un dessin — mais ici la table
  // est DÉRIVÉE de la police du Registre (`tables/seg14.js`) : le glyphe montré
  // et les segments allumés sont le même dessin, il n'y a pas d'écart à
  // consigner.
  for (const code of ['m14', 'm14F']) {
    const op = PAR_CODE.get(code);
    const entree = tokens(['h', 'o', 'p', 'e'], [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]]);
    const apres = appliquer(op, entree);
    const ids = ['t0', 't1', 't2', 't3'];
    for (const langue of LANGUES) {
      const steps = etapes(op, entree, apres, { ids, cle: 'e0', langue });
      assert.equal(steps.length, 4, `${code} : un step par jeton`);
      steps.forEach((s, i) => {
        const f = s.figure;
        assert.ok(f, `${code}/${langue} : step ${i} sans figure`);
        assert.equal(f.type, 'seg14');
        assert.equal(f.glyphe, 'HOPE'[i]);
        assert.equal(f.valeur, apres.valeur[i]);
        assert.deepEqual(f.segments, [...segments14De(f.glyphe)]);
        assert.equal(f.fusion, code === 'm14F');
        assert.equal(f.texte, `${f.glyphe} \u2192 ${f.valeur}`);
        assert.ok(!/[a-z]/.test(f.texte), 'l’équivalent textuel ne contient pas de prose');
      });
    }
  }
  // La mention du quatorze segments dit l'inverse de celle du sept : rien à
  // excuser. Les deux langues la portent.
  assert.ok(estBilingue(MENTION_SEG14));
  assert.match(MENTION_SEG14.fr, /sans emprunt ni approximation/);
  assert.match(MENTION_SEG14.en, /no approximation/);
  assert.match(MENTION_SEG7.fr, /ne sont pas représentables/);
});

test('★ l’écart entre la police du Registre et la table de la scène est documenté', () => {
  // On ne le corrige pas — la table fait foi, la police illustre — mais il est
  // ÉCRIT, et un test empêche qu'il soit oublié en silence.
  for (const [signe, segs] of Object.entries(ECARTS_POLICE_SEG7)) {
    assert.ok(SEG7[signe] !== undefined, `${signe} : hors de la table SEG7`);
    assert.notEqual(segs, SEG7[signe], `${signe} : plus d’écart, la ligne est à retirer`);
    assert.match(segs, /^[a-g]+$/);
  }
  assert.equal(Object.keys(ECARTS_POLICE_SEG7).length, 12,
    'DSEG7 Classic v0.46 diverge de la table sur 12 des 36 signes');
});
