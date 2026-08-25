import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lire, ecrire, ecrireApproche, descripteursDe, canoniser, autreRegistre, BANDEAUX,
} from '../url.js';
import { encoderTexte } from '../base58.js';
import { catalogue } from './_catalogue.js';

const B58_HOPE = encoderTexte('hope');                       // 3fq9KJ
const B58_URL = encoderTexte('https://hope-hope-hope.fr/');

test('url — grammaire canonique : une seule voie, saisie entière', () => {
  const r = lire(`#f1+t1+m1+c1+p1#${B58_HOPE}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.fragments.length, 1);
  assert.deepEqual(r.fragments[0].codes, ['f1', 't1', 'm1', 'c1', 'p1']);
  assert.equal(r.fragments[0].portee, null);
  assert.equal(r.bandeau, null);
});

test('url — `+` sépare les opérations, `,` sépare les fragments', () => {
  const r = lire(`#0.1:m1+c1+p1,1.1:n2+p1,2.1:m4+c1#${B58_URL}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.fragments.length, 3);
  assert.deepEqual(r.fragments[0], { portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['m1', 'c1', 'p1'] });
  assert.deepEqual(r.fragments[1].codes, ['n2', 'p1']);
  assert.deepEqual(r.fragments[2].portee, { offset: 2, longueur: 1 });
});

test('url — abréviation de résonance ×3, et ses formes tolérées', () => {
  for (const signe of ['×', 'x', 'X', '*']) {
    const r = lire(`#${signe}3:m1+c1+p1#${B58_URL}`);
    assert.equal(r.forme, 'canonique', `signe ${signe}`);
    assert.equal(r.fragments[0].resonance, 3);
    assert.deepEqual(r.fragments[0].codes, ['m1', 'c1', 'p1']);
  }
  // Fragment percent-encodé par une messagerie : doit rester lisible.
  const encode = `#${encodeURIComponent('×3:m1+c1+p1')}#${B58_URL}`;
  assert.equal(lire(encode).fragments[0].resonance, 3);
});

test('url — page de résultats `##b58` (forme du README)', () => {
  const r = lire(`##${B58_HOPE}`);
  assert.equal(r.forme, 'resultats');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.fragments, null);
});

test('url — hash vide : page d’accueil', () => {
  assert.equal(lire('').forme, 'resultats');
  assert.equal(lire('#').forme, 'resultats');
});

test('url — forme héritée `#3+7+2#` : rangs + bandeau « recalculée »', () => {
  const r = lire(`#3+7+2#${B58_HOPE}`);
  assert.equal(r.forme, 'heritee');
  assert.deepEqual(r.rangs, [3, 7, 2]);
  assert.equal(r.bandeau, BANDEAUX.recalculee);
  const seul = lire(`#3#${B58_HOPE}`);
  assert.equal(seul.forme, 'heritee');
  assert.deepEqual(seul.rangs, [3]);
});

test('url — un lien ne renvoie JAMAIS silencieusement ailleurs', () => {
  const cas = [
    [`#zz9#${B58_HOPE}`, 'code hors grammaire'],
    [`#m1+#${B58_HOPE}`, 'programme incomplet'],
    [`#m1#pas du base58`, 'saisie illisible'],
    ['#m1#', 'saisie vide'],
    [`#m1#${B58_HOPE}#trop`, 'trois segments'],
    [`#0.:m1#${B58_HOPE}`, 'portée incomplète'],
  ];
  for (const [hash, quoi] of cas) {
    const r = lire(hash);
    assert.equal(r.forme, 'invalide', quoi);
    assert.ok(r.bandeau, `${quoi} doit afficher un bandeau`);
  }
});

test('url — code inconnu du catalogue : bandeau explicite, pas de repli muet', () => {
  const r = lire(`#m1+czz9#${B58_HOPE}`, { catalogue });
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.codeInconnu);
  assert.match(r.raison, /czz9/);
  // Le même lien sans validation de catalogue reste syntaxiquement canonique.
  assert.equal(lire(`#m1+czz9#${B58_HOPE}`).forme, 'canonique');
});

test('url — écriture canonique : aller-retour exact', () => {
  const frags = [
    { portee: { offset: 0, longueur: 3 }, resonance: null, codes: ['f1', 'm1', 'c1'] },
    { portee: null, resonance: null, codes: ['n2'] },
  ];
  const s = ecrire({ saisie: 'hope', fragments: frags });
  // Le registre est TOUJOURS écrit, même quand il vaut le défaut : plus jamais
  // de lien ambigu (`url.js`, « écriture canonique »).
  assert.equal(s, `#scenique!0.3:f1+m1+c1,n2#${B58_HOPE}`);
  const r = lire(s);
  assert.equal(r.saisie, 'hope');
  assert.deepEqual(r.fragments, frags);
  assert.equal(r.registre, 'scenique');
  assert.equal(r.registreEcrit, true);
});

test('url — écriture sans approche = page de résultats', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(ecrire({ saisie: 'hope', fragments: [] }), `##${B58_HOPE}`);
});

test('url — la forme héritée n’est JAMAIS produite en écriture', () => {
  const s = ecrireApproche([{ portee: null, resonance: null, codes: ['m1'] }]);
  assert.ok(!/^\d+(\+\d+)*$/.test(s), `« ${s} » ne doit pas ressembler à des rangs`);
});

test('url — descripteursDe applique l’abréviation de résonance', () => {
  const op = (code) => ({ code });
  const chemin = { ops: [op('m1'), op('c1'), op('p1')] };
  const frag = (offset) => ({ offset, longueur: 4, tokenDebut: offset, tokenLong: 1, famille: 'repetition' });
  const approche = {
    resonance: true,
    parts: [{ chemin, fragment: frag(8) }, { chemin, fragment: frag(13) }, { chemin, fragment: frag(18) }],
  };
  assert.deepEqual(descripteursDe(approche), [{ portee: null, resonance: 3, codes: ['m1', 'c1', 'p1'] }]);
  assert.equal(ecrireApproche(descripteursDe(approche)), '×3:m1+c1+p1');
});

test('url — canoniser() réécrit la barre d’adresse par replaceState', () => {
  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#3+7+2#' + B58_HOPE },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const frag = canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['n4'] }] }, faux);
  assert.equal(frag, `#scenique!n4#${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/#scenique!n4#${B58_HOPE}`);
  // Idempotent : si le hash est déjà canonique, on n’empile rien.
  faux.location.hash = frag;
  canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['n4'] }] }, faux);
  assert.equal(appels.length, 1);
});

/* ══════════════════ le REGISTRE de mise en scène — sobre / scénique ══════ */

test('registre — les deux marqueurs se lisent, et ne changent QUE la mise en scène', () => {
  for (const [hash, attendu] of [
    [`#sobre!m1+c1+p1#${B58_HOPE}`, 'sobre'],
    [`#scenique!m1+c1+p1#${B58_HOPE}`, 'scenique'],
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    assert.equal(r.registre, attendu);
    assert.equal(r.registreEcrit, true);
    // Le programme est le MÊME de part et d'autre : c'est toute la promesse
    // du registre — une seule voie, deux mises en scène.
    assert.deepEqual(r.fragments, [{ portee: null, resonance: null, codes: ['m1', 'c1', 'p1'] }]);
  }
});

test('★ registre — l’absence de marqueur vaut « scénique » (liens déjà partagés)', () => {
  // Décision d'arbitrage, justifiée en tête de `url.js` : les cornes sont un
  // geste de la DÉMONSTRATION (une primitive, un opérateur nommé dans l'URL,
  // un nombre d'étapes qui change), l'orage est du THÉÂTRE. Un vieux lien qui
  // perdrait ses cornes renverrait vers une AUTRE démonstration, ce que §4.3
  // interdit ; un vieux lien qui gagne un orage rejoue exactement la même.
  const r = lire(`#0.1:t1+mw+mz,2.1:fl+t1+mw+mz#2HuP1G8mNg3sJWhqR`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.registre, 'scenique');
  assert.equal(r.registreEcrit, false, 'le lien ne le portait pas : on le SAIT');

  // Et les deux puces-raccourcis de la page d'accueil (`src/i18n/fr.js`,
  // `accueil.exemples`) restent lisibles telles quelles.
  for (const hash of [
    '#0.1:t1+mw,1.1:t1+mv+c1,2.1:t1+mw,3.1:t1+mv+c1,4.1:t1+mw,6.1:t1+md+c1#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:t1+m4+c1+p1,3.1:f9+n1,5.1:t1+md+c1#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
  ]) {
    const l = lire(hash);
    assert.equal(l.forme, 'canonique', hash);
    assert.equal(l.registre, 'scenique');
  }
});

test('registre — un marqueur seul, sans programme, s’ANNONCE au lieu de se taire', () => {
  const r = lire(`#sobre!#${B58_HOPE}`);
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.formatInconnu);
  assert.equal(r.saisie, 'hope', 'la saisie reste lisible : le repli sait où aller');
});

test('registre — la page de résultats n’en porte pas : rien à mettre en scène', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(lire(`##${B58_HOPE}`).registre, null);
});

test('registre — aller-retour exact dans les deux registres', () => {
  const frags = [{ portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['t1', 'mw', 'mz'] }];
  for (const registre of ['sobre', 'scenique']) {
    const s = ecrire({ saisie: 'hope', fragments: frags, registre });
    const r = lire(s);
    assert.equal(r.registre, registre);
    assert.deepEqual(r.fragments, frags);
    assert.equal(ecrire({ saisie: 'hope', fragments: r.fragments, registre: r.registre }), s);
  }
});

test('registre — `autreRegistre` est une involution : deux boutons, jamais trois', () => {
  assert.equal(autreRegistre('sobre'), 'scenique');
  assert.equal(autreRegistre('scenique'), 'sobre');
  assert.equal(autreRegistre(autreRegistre('sobre')), 'sobre');
  // Une valeur inconnue mène au sobre : le bouton proposé est alors « l'autre
  // que le défaut », ce qui reste vrai.
  assert.equal(autreRegistre(undefined), 'sobre');
});

test('registre — un marqueur inventé n’est pas un registre, c’est un fragment illisible', () => {
  const r = lire(`#tapageur!m1#${B58_HOPE}`);
  assert.equal(r.forme, 'invalide');
  assert.ok(r.bandeau, 'jamais de repli muet');
});

test('url — accents : la saisie survit à l’aller-retour dans l’URL', () => {
  const saisie = 'Éléonore à Nîmes — 100 % vrai !';
  const s = ecrire({ saisie, fragments: [{ portee: null, resonance: null, codes: ['n1'] }] });
  assert.equal(lire(s).saisie, saisie);
});
