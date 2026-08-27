import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lire, ecrire, ecrireApproche, descripteursDe, canoniser, autreRegistre, BANDEAUX, RE_CODE,
} from '../url.js';
import { encoderTexte } from '../base58.js';
import { catalogue } from './_catalogue.js';

const B58_HOPE = encoderTexte('hope');                       // 3fq9KJ
const B58_URL = encoderTexte('https://hope-hope-hope.fr/');

test('url — grammaire canonique : une seule voie, saisie entière', () => {
  const r = lire(`#fp+tca+ma1+cs+prn#${B58_HOPE}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.fragments.length, 1);
  assert.deepEqual(r.fragments[0].codes, ['fp', 'tca', 'ma1', 'cs', 'prn']);
  assert.equal(r.fragments[0].portee, null);
  assert.equal(r.bandeau, null);
});

test('url — `+` sépare les opérations, `,` sépare les fragments', () => {
  const r = lire(`#0.1:ma1+cs+prn,1.1:nv+prn,2.1:mch+cs#${B58_URL}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.fragments.length, 3);
  assert.deepEqual(r.fragments[0], { portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['ma1', 'cs', 'prn'] });
  assert.deepEqual(r.fragments[1].codes, ['nv', 'prn']);
  assert.deepEqual(r.fragments[2].portee, { offset: 2, longueur: 1 });
});

test('url — abréviation de résonance ×3, et ses formes tolérées', () => {
  for (const signe of ['×', 'x', 'X', '*']) {
    const r = lire(`#${signe}3:ma1+cs+prn#${B58_URL}`);
    assert.equal(r.forme, 'canonique', `signe ${signe}`);
    assert.equal(r.fragments[0].resonance, 3);
    assert.deepEqual(r.fragments[0].codes, ['ma1', 'cs', 'prn']);
  }
  // Fragment percent-encodé par une messagerie : doit rester lisible.
  const encode = `#${encodeURIComponent('×3:ma1+cs+prn')}#${B58_URL}`;
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
    [`#ma1+#${B58_HOPE}`, 'programme incomplet'],
    [`#ma1#pas du base58`, 'saisie illisible'],
    ['#ma1#', 'saisie vide'],
    [`#ma1#${B58_HOPE}#trop`, 'trois segments'],
    [`#0.:ma1#${B58_HOPE}`, 'portée incomplète'],
  ];
  for (const [hash, quoi] of cas) {
    const r = lire(hash);
    assert.equal(r.forme, 'invalide', quoi);
    assert.ok(r.bandeau, `${quoi} doit afficher un bandeau`);
  }
});

test('url — code inconnu du catalogue : bandeau explicite, pas de repli muet', () => {
  const r = lire(`#ma1+czz9#${B58_HOPE}`, { catalogue });
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.codeInconnu);
  assert.match(r.raison, /czz9/);
  // Le même lien sans validation de catalogue reste syntaxiquement canonique.
  assert.equal(lire(`#ma1+czz9#${B58_HOPE}`).forme, 'canonique');
});

test('url — écriture canonique : aller-retour exact', () => {
  const frags = [
    { portee: { offset: 0, longueur: 3 }, resonance: null, codes: ['fp', 'ma1', 'cs'] },
    { portee: null, resonance: null, codes: ['nv'] },
  ];
  const s = ecrire({ saisie: 'hope', fragments: frags });
  // Le registre est TOUJOURS écrit, même quand il vaut le défaut : plus jamais
  // de lien ambigu (`url.js`, « écriture canonique »).
  assert.equal(s, `#so!0.3:fp+ma1+cs,nv#${B58_HOPE}`);
  const r = lire(s);
  assert.equal(r.saisie, 'hope');
  assert.deepEqual(r.fragments, frags);
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, true);
});

test('url — écriture sans approche = page de résultats', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(ecrire({ saisie: 'hope', fragments: [] }), `##${B58_HOPE}`);
});

test('url — la forme héritée n’est JAMAIS produite en écriture', () => {
  const s = ecrireApproche([{ portee: null, resonance: null, codes: ['ma1'] }]);
  assert.ok(!/^\d+(\+\d+)*$/.test(s), `« ${s} » ne doit pas ressembler à des rangs`);
});

test('url — descripteursDe applique l’abréviation de résonance', () => {
  const op = (code) => ({ code });
  const chemin = { ops: [op('ma1'), op('cs'), op('prn')] };
  const frag = (offset) => ({ offset, longueur: 4, tokenDebut: offset, tokenLong: 1, famille: 'repetition' });
  const approche = {
    resonance: true,
    parts: [{ chemin, fragment: frag(8) }, { chemin, fragment: frag(13) }, { chemin, fragment: frag(18) }],
  };
  assert.deepEqual(descripteursDe(approche), [{ portee: null, resonance: 3, codes: ['ma1', 'cs', 'prn'] }]);
  assert.equal(ecrireApproche(descripteursDe(approche)), '×3:ma1+cs+prn');
});

test('url — canoniser() réécrit la barre d’adresse par replaceState', () => {
  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#3+7+2#' + B58_HOPE },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const frag = canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['nd'] }] }, faux);
  assert.equal(frag, `#so!nd#${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/#so!nd#${B58_HOPE}`);
  // Idempotent : si le hash est déjà canonique, on n’empile rien.
  faux.location.hash = frag;
  canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['nd'] }] }, faux);
  assert.equal(appels.length, 1);
});

/* ══════════════════ le REGISTRE de mise en scène — sobre / scénique ══════ */

test('registre — les deux marqueurs se lisent, et ne changent QUE la mise en scène', () => {
  for (const [hash, attendu] of [
    [`#so!ma1+cs+prn#${B58_HOPE}`, 'sobre'],
    [`#sce!ma1+cs+prn#${B58_HOPE}`, 'scenique'],
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    assert.equal(r.registre, attendu);
    assert.equal(r.registreEcrit, true);
    // Le programme est le MÊME de part et d'autre : c'est toute la promesse
    // du registre — une seule voie, deux mises en scène.
    assert.deepEqual(r.fragments, [{ portee: null, resonance: null, codes: ['ma1', 'cs', 'prn'] }]);
  }
});

test('★ registre — l’absence de marqueur vaut « SOBRE » : la mise en scène s’opte', () => {
  // ★ Renversement assumé, justifié en tête de `url.js`. Le défaut a valu
  // « scénique » tant qu'il fallait protéger des liens déjà partagés ; l'auteur
  // a confirmé qu'aucun n'a été diffusé. Reste l'argument de fond : un lien nu
  // doit rendre la version CRÉDIBLE, et le spectacle doit être demandé.
  const r = lire(`#0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, false, 'le lien ne le portait pas : on le SAIT');

  // Et les deux puces-raccourcis de la page d'accueil (`src/i18n/fr.js`,
  // `accueil.exemples`) restent lisibles telles quelles.
  for (const hash of [
    '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
  ]) {
    const l = lire(hash);
    assert.equal(l.forme, 'canonique', hash);
    assert.equal(l.registre, 'sobre');
  }
});

test('registre — un marqueur seul, sans programme, s’ANNONCE au lieu de se taire', () => {
  const r = lire(`#so!#${B58_HOPE}`);
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.formatInconnu);
  assert.equal(r.saisie, 'hope', 'la saisie reste lisible : le repli sait où aller');
});

test('registre — la page de résultats n’en porte pas : rien à mettre en scène', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(lire(`##${B58_HOPE}`).registre, null);
});

test('registre — aller-retour exact dans les deux registres', () => {
  const frags = [{ portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['tca', 'm14', 'm36'] }];
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
  const r = lire(`#tapageur!ma1#${B58_HOPE}`);
  assert.equal(r.forme, 'invalide');
  assert.ok(r.bandeau, 'jamais de repli muet');
});

test('url — accents : la saisie survit à l’aller-retour dans l’URL', () => {
  const saisie = 'Éléonore à Nîmes — 100 % vrai !';
  const s = ecrire({ saisie, fragments: [{ portee: null, resonance: null, codes: ['nl'] }] });
  assert.equal(lire(s).saisie, saisie);
});

/**
 * ★ La forme longue est encore LUE, jamais écrite.
 *
 * « Dans l'URL, remplace "sobre" par "so" et "scenique" par "sce" » (l'auteur),
 * avec sa raison : « l'URL reste essentiellement cryptique et ça participe à
 * l'effet de surprise ». La forme longue n'aura vécu qu'une version — la 1.2.0,
 * publiée quelques heures —, mais les liens de cette fenêtre-là existent. Les
 * relire coûte deux alternatives ; les casser coûterait un lien mort.
 */
test('★ registre — la forme longue se relit, la forme brève s’écrit', () => {
  for (const [long, bref, attendu] of [['sobre', 'so', 'sobre'], ['scenique', 'sce', 'scenique']]) {
    assert.equal(lire(`#${long}!ma1+cs+prn#${B58_HOPE}`).registre, attendu,
      `« ${long}! » n’est plus compris : les liens de la 1.2.0 sont morts`);
    assert.equal(lire(`#${bref}!ma1+cs+prn#${B58_HOPE}`).registre, attendu);
    // Et c'est la forme brève qui sort, quelle que soit celle qui est entrée.
    const ecrit = ecrire({ saisie: 'hope', fragments: [{ codes: ['ma1'] }], registre: attendu });
    assert.ok(ecrit.startsWith(`#${bref}!`), `écrit « ${ecrit} », attendu le préfixe « ${bref}! »`);
    assert.doesNotMatch(ecrit, new RegExp(`^#${long}!`), 'la forme longue est encore écrite');
  }
});

/**
 * ★ **LA GRAMMAIRE DES CODES EST ÉCRITE TROIS FOIS, ET LES TROIS DOIVENT DIRE
 * LA MÊME CHOSE.**
 *
 * `moteur/transformations/commun.js` la tient pour le catalogue, `url.js` pour
 * la lecture d'un lien, `bfs.js` pour la validation d'un catalogue injecté. La
 * recopie n'est pas de la négligence : `src/recherche` ne connaît le catalogue
 * que par injection, et c'est précisément ce découplage qui permet de le
 * tester sur un catalogue de fantaisie. Le prix est donc payé ici — par un
 * test qui échoue au premier signe de divergence — plutôt que par une
 * dépendance qui casserait l'injection.
 *
 * ⚠ Ce qui a rendu ce test nécessaire : le renommage en codes parlants a
 * introduit la majuscule de variante (`m14F`, `m7F`). Les trois écritures
 * disaient `[0-9a-z]+` ; deux d'entre elles auraient pu être oubliées, et le
 * symptôme n'aurait été ni une exception ni un test rouge — juste un lien
 * parfaitement valide déclaré « hors grammaire », donc un repli muet sur la
 * page de résultats. Exactement ce que CONTRACTS §4.3 interdit.
 */
test('★ grammaire des codes — les trois écritures sont identiques (CONTRACTS §4.1)', async () => {
  const { RE_CODE: DU_MOTEUR } = await import('../../moteur/transformations/commun.js');
  assert.equal(RE_CODE.source, DU_MOTEUR.source, 'url.js a dérivé de commun.js');
  assert.equal(RE_CODE.flags, DU_MOTEUR.flags);
  // `bfs.js` garde la sienne privée : on l'éprouve par son effet, sur un
  // catalogue d'un seul opérateur dont le code porte une majuscule de variante.
  const { validerCatalogue } = await import('../bfs.js');
  const gabarit = catalogue.operateurs ? catalogue.operateurs[0] : catalogue[0];
  const pbs = validerCatalogue([{ ...gabarit, id: 'm.variante', code: 'm14F' }]);
  assert.deepEqual(pbs.filter((p) => /§4\.1/.test(p)), [],
    'bfs.js refuse une majuscule de variante que le moteur accepte');
  // Et les trois refusent la même chose.
  for (const faux of ['m', 'M14', 'm14FF', 'm14Fa', 'z1', '14m']) {
    assert.doesNotMatch(faux, RE_CODE, `« ${faux} » ne devrait pas être un code`);
    assert.doesNotMatch(faux, DU_MOTEUR, `« ${faux} » ne devrait pas être un code`);
  }
});
