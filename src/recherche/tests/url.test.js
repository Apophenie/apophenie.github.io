import test from 'node:test';
import assert from 'node:assert/strict';
import { lire, ecrire, ecrireApproche, descripteursDe, canoniser, BANDEAUX } from '../url.js';
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
  assert.equal(s, `#0.3:f1+m1+c1,n2#${B58_HOPE}`);
  const r = lire(s);
  assert.equal(r.saisie, 'hope');
  assert.deepEqual(r.fragments, frags);
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
  assert.equal(frag, `#n4#${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/#n4#${B58_HOPE}`);
  // Idempotent : si le hash est déjà canonique, on n’empile rien.
  faux.location.hash = frag;
  canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['n4'] }] }, faux);
  assert.equal(appels.length, 1);
});

test('url — accents : la saisie survit à l’aller-retour dans l’URL', () => {
  const saisie = 'Éléonore à Nîmes — 100 % vrai !';
  const s = ecrire({ saisie, fragments: [{ portee: null, resonance: null, codes: ['n1'] }] });
  assert.equal(lire(s).saisie, saisie);
});
