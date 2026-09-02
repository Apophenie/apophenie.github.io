import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lire, ecrire, ecrireApproche, descripteursDe, retouchesDe, canoniser, autreRegistre,
  BANDEAUX, RE_CODE,
} from '../url.js';
import { encoderTexte, LIMITE_SAISIE } from '../base58.js';
import { catalogue } from './_catalogue.js';
import { creerMoteur } from '../index.js';

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
    // ⚠️ `#ma1#pas du base58` a QUITTÉ cette liste : ce n'est plus un lien
    // illisible mais un programme joué sur la saisie « pas du base58 » (voir
    // la section « la saisie en clair », plus bas). Ce qui reste invalide,
    // c'est un lien qui ne porte AUCUNE saisie — ni base58, ni texte.
    ['#ma1#', 'saisie vide'],
    ['#ma1#   ', 'saisie faite de blancs'],
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

/* ═══════════ les PORTÉES GROUPÉES — un programme, plusieurs places ═══════ */

/**
 * ★ LA DEMANDE, mot pour mot. « Pour hope-hope-hope.fr voici celui que je
 * trouve le plus élégant : `#so!0.1:tca+m14,2.1:tca+m14,4.1:tca+m14,…`. Qui
 * gagnerait à pouvoir s'écrire : `#so!0.1+2.1+4.1:tca+m14,1.1+3.1:tca+mtc+cs,…` »
 *
 * Le piège était le `+`, qui séparait déjà les codes d'un programme. Il ne s'en
 * est pas trouvé un : le `:` est cherché AVANT, et il partage le fragment en
 * deux zones étanches — voir `url.js`, « les portées groupées ».
 */
// ★ Sans `tca` : le découpage par défaut ne s'écrit plus (`url.js ›
//   CODE_DECOUPE_IMPLICITE`). Un lien qui le porte reste LU — c'est vérifié
//   plus bas —, mais la forme canonique, celle que `canoniser()` remet dans la
//   barre d'adresse, s'en passe.
const GROUPE = 'so!0.1+2.1+4.1:m14,1.1+3.1:mtc+cs,6.1:mpy+mr9';
// ★ La forme dépliée est celle de l'ORDRE DU TEXTE, et non celle de l'ordre
//   des groupes : une ligne groupée déclare se lire de gauche à droite, et le
//   dépliage l'y remet (`url.js › lireFragments`). C'est ce qui rend la
//   factorisation neutre — sans quoi `0.1+2.1:A,1.1:B` dirait 0, 2, 1.
// ★ Sans `tca`, comme `GROUPE` : les deux formes se comparent, elles doivent
//   donc s'écrire dans le même alphabet.
const DEPLIE = 'so!0.1:m14,1.1:mtc+cs,2.1:m14,'
  + '3.1:mtc+cs,4.1:m14,6.1:mpy+mr9';

test('★ portées groupées — la forme de l’auteur se lit, et se déplie', () => {
  const r = lire(`#${GROUPE}#${B58_URL}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.fragments.length, 6, 'trois groupes, six places');
  assert.deepEqual(r.fragments.map((f) => `${f.portee.offset}.${f.portee.longueur}`),
    ['0.1', '1.1', '2.1', '3.1', '4.1', '6.1'],
    'une ligne groupée se déplie dans l’ordre du TEXTE : c’est lui qui écrit la cible');
  assert.deepEqual(r.fragments[0].codes, ['m14']);
  assert.deepEqual(r.fragments[2].codes, ['m14']);
  assert.deepEqual(r.fragments[1].codes, ['mtc', 'cs']);
  assert.equal(r.bandeau, null);
});

/**
 * ★ **L'ÉQUIVALENCE EST VÉRIFIÉE, PAS PROMISE.** Le dépliage a lieu dans
 * `lire()`, donc les deux formes ne se comparent pas par leurs effets — deux
 * exécutions qui « donnent la même chose » — mais champ par champ, sur la
 * lecture entière. Si un jour l'une des deux gagnait un attribut que l'autre
 * n'a pas, ce test tomberait avant que le moteur ne s'en aperçoive.
 */
test('★ portées groupées — la forme groupée EST la forme dépliée, champ par champ', () => {
  assert.deepEqual(lire(`#${GROUPE}#${B58_URL}`), lire(`#${DEPLIE}#${B58_URL}`));
  // Et jusqu'aux tableaux de codes, qui ne sont pas partagés d'une place à
  // l'autre : la forme dépliée en fabrique un par fragment, la groupée aussi.
  const f = lire(`#${GROUPE}#${B58_URL}`).fragments;
  assert.notEqual(f[0].codes, f[1].codes, 'deux places ne partagent pas un alias');
});

/**
 * ★ **ET C'EST LA FORME CANONIQUE.** Décision argumentée en tête de `url.js` :
 * `canoniser()` réécrit la barre d'adresse à chaque ouverture, si bien qu'une
 * abréviation qu'on n'écrirait pas se ferait déplier sous les yeux de celui qui
 * vient de la taper. Une abréviation qu'on ne peut pas garder n'en est pas une.
 */
test('★ portées groupées — l’écriture les PRODUIT : l’aller-retour est exact', () => {
  const lien = `#${GROUPE}#${B58_URL}`;
  const r = lire(lien);
  const reecrit = ecrire({ saisie: r.saisie, fragments: r.fragments, registre: r.registre });
  // ⚠️ `tca` ne s'écrit plus : on compare donc l'écriture à ELLE-MÊME une fois
  //    de plus, ce qui est la vraie propriété — le groupement est un point fixe.
  //    Le lien de départ, lui, reste lu (assertion suivante).
  const encore = lire(reecrit);
  assert.equal(
    ecrire({ saisie: encore.saisie, fragments: encore.fragments, registre: encore.registre }),
    reecrit, 'la forme groupée doit se réécrire à l’identique');
  // Et la forme dépliée CONVERGE vers elle : deux écritures, un seul canonique.
  const d = lire(`#${DEPLIE}#${B58_URL}`);
  assert.equal(ecrire({ saisie: d.saisie, fragments: d.fragments, registre: d.registre }), lien);
});

/**
 * ★ **SEULES LES VOISINES SE GROUPENT.** L'ordre des fragments est ce qui écrit
 * la cible de gauche à droite (§4.2) : rapprocher deux jumelles séparées par
 * une tierce rendrait les chiffres dans un autre ordre — `070` deviendrait
 * `007`. Sur 666 la faute serait invisible, les trois chiffres y étant égaux ;
 * c'est exactement pour cela qu'elle se teste sur une cible qui, elle, distingue
 * ses places.
 */
/**
 * ★ AMENDEMENT — ON GROUPE AUSSI LES ÉLOIGNÉES, et le dépliage remet l'ordre.
 *
 * Ce test gelait « on ne groupe QUE des voisines », au motif que rapprocher
 * deux jumelles séparées par une tierce changerait la suite de chiffres
 * produite — `070` deviendrait `007`. L'argument reste vrai : c'est bien
 * l'ordre des fragments qui écrit la cible de gauche à droite.
 *
 * La réponse a changé de côté. Plutôt que d'interdire le groupe, une ligne
 * groupée DÉCLARE se lire dans l'ordre du texte, et `lireFragments` l'y remet
 * (`url.js`). Les deux formes dénotent alors la même démonstration, dans le
 * même ordre — et l'écriture ne factorise que des lignes déjà rangées ainsi
 * (`factorisable`), si bien que l'aller-retour est neutre par construction.
 *
 * C'est ce que l'auteur demandait : « `0.1:X,1.1:Y,2.1:X,3.1:Y` gagnerait à
 * pouvoir s'écrire `0.1+2.1:X,1.1+3.1:Y` ».
 */
test('★ portées groupées — les éloignées se groupent, et l’ordre du texte est rendu', () => {
  const place = (offset, codes) => ({ portee: { offset, longueur: 1 }, resonance: null, codes });
  const alterne = [place(0, ['ma1']), place(1, ['nv']), place(2, ['ma1'])];
  assert.equal(ecrireApproche(alterne), '0.1+2.1:ma1,1.1:nv',
    'deux places de même programme se rejoignent, même séparées');
  // …et la relecture rend l'ordre du TEXTE, pas celui des groupes : c'est ce
  // qui rend la factorisation neutre.
  const relu = lire(`#so!${ecrireApproche(alterne)}#${encoderTexte('hope')}`);
  assert.deepEqual(relu.fragments.map((f) => f.portee.offset), [0, 1, 2],
    'une ligne groupée se déplie dans l’ordre du texte');
  assert.deepEqual(relu.fragments.map((f) => f.codes.join('+')), ['ma1', 'nv', 'ma1']);

  // Trois voisines se groupent aussi, comme avant.
  assert.equal(ecrireApproche([place(0, ['ma1']), place(2, ['ma1']), place(4, ['ma1'])]),
    '0.1+2.1+4.1:ma1');
  assert.equal(ecrireApproche([place(0, ['ma1']), place(1, ['ma1']), place(2, ['nv']), place(3, ['nv'])]),
    '0.1+1.1:ma1,2.1+3.1:nv');

  // ★ Et une ligne dont les places ne sont PAS dans l'ordre du texte s'écrit à
  //   plat : la factoriser lui imposerait un ordre qu'elle n'a pas choisi.
  assert.equal(ecrireApproche([place(2, ['ma1']), place(0, ['nv']), place(4, ['ma1'])]),
    '2.1:ma1,0.1:nv,4.1:ma1', 'une ligne à contre-sens du texte reste à plat');
});


test('★ portées groupées — ce qui n’a pas de place ne se groupe pas', () => {
  const entier = (codes) => ({ portee: null, resonance: null, codes });
  // « Toute la saisie » n'a pas de place à mettre dans une liste : deux
  // fragments entiers identiques restent deux fragments.
  assert.equal(ecrireApproche([entier(['ma1']), entier(['ma1'])]), 'ma1,ma1');
  // La résonance nomme DÉJÀ plusieurs places : elle reste seule en tête.
  const reso = { portee: null, resonance: 3, codes: ['ma1'] };
  assert.equal(ecrireApproche([reso, { portee: { offset: 9, longueur: 1 }, resonance: null, codes: ['ma1'] }]),
    '×3:ma1,9.1:ma1');
  // Et à la lecture, une résonance ne rejoint pas un groupe : `×3` n'est pas
  // une portée, le fragment est simplement illisible.
  const r = lire(`#×3+0.1:ma1#${B58_URL}`);
  assert.equal(r.forme, 'invalide');
  assert.ok(r.bandeau, 'jamais de repli muet');
});

test('★ portées groupées — pas de groupe dans une RETOUCHE', () => {
  // Même argument que pour `×3:` (voir `url.js`) : les jetons sont recomptés à
  // chaque étage, donc `0.1+2.1:` aurait l'air parallèle et serait séquentiel.
  const r = lire(`#so!0.1+2.1:fr13;tca+m14#${encoderTexte('Donald Trump')}`);
  assert.equal(r.forme, 'invalide');
  assert.match(r.raison, /groupées/);
  assert.equal(r.bandeau, BANDEAUX.formatInconnu);
  // …mais deux retouches écrites en toutes lettres restent parfaitement licites.
  assert.equal(lire(`#so!0.1:fr13;2.1:fr13;tca+m14#${encoderTexte('Donald Trump')}`).forme, 'canonique');
});

test('★ portées groupées — le groupe n’ajoute ni ne retire aucune validation', () => {
  // Une place répétée est acceptée parce que `0.1:ma1,0.1:ma1` l'était déjà :
  // le groupe est un raccourci d'écriture, jamais un contrôle de plus.
  assert.equal(lire(`#0.1+0.1:ma1#${B58_URL}`).fragments.length, 2);
  // Une tête mal formée reste illisible, groupée ou non.
  for (const tete of ['0.1+', '+0.1', '0.1+2', '0.1+2.', '0.1++2.1']) {
    const r = lire(`#${tete}:ma1#${B58_URL}`);
    assert.equal(r.forme, 'invalide', tete);
    assert.ok(r.bandeau, tete);
  }
  // Et un code inconnu se dénonce à travers le groupe comme ailleurs.
  const r = lire(`#0.1+2.1:czz9#${B58_URL}`, { catalogue });
  assert.equal(r.bandeau, BANDEAUX.codeInconnu);
});

/**
 * ★ **LA NON-RÉGRESSION QUI COMPTE : le groupe ne paraît QUE là où il abrège.**
 *
 * Le changement est observable — les URL canoniques d'une voie à jumelles
 * voisines raccourcissent —, et c'est pour cela qu'il se mesure ici plutôt que
 * de se supposer. Les deux puces de l'accueil (`src/i18n/fr.js`) ALTERNENT
 * leurs programmes (`tca+m14`, puis `tca+mtc+cs`, puis `tca+m14`…) : aucune
 * jumelle n'y est voisine, et pas un signe de ces liens ne bouge.
 */
/**
 * ★ Les liens figés de l'accueil se RELISENT à l'identique — mais la forme
 *   canonique qu'ils produisent peut être groupée, et c'est voulu : le lien
 *   écrit dans `src/i18n/fr.js` reste un témoin de la lecture tolérante, et le
 *   site republie la forme courte. Ce qui est gelé ici est ce qui compte : la
 *   lecture réussit, et l'aller-retour est un point fixe.
 */
test('★ portées groupées — les liens figés de l’accueil se relisent, et se stabilisent', () => {
  for (const hash of [
    '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
    '#0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR',
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    // Point fixe : ce que l'écriture produit se relit en donnant exactement les
    // mêmes descripteurs, dans le même ordre.
    /* ⚠️ **LE POINT FIXE SE MESURE À PARTIR DE L'ÉCRITURE, pas de la saisie.**
       Ces liens portent `tca`, qui ne s'écrit plus (`url.js ›
       CODE_DECOUPE_IMPLICITE`) : la PREMIÈRE écriture le laisse tomber, et
       comparer son résultat au hash d'origine ne mesurerait pas la stabilité,
       seulement le fait qu'on vient de retirer quelque chose. Ce qui doit être
       stable, et l'est, c'est ce qui vient APRÈS : écrire une forme déjà écrite
       ne la change plus. Les liens d'hier restent lus — c'est la première
       assertion, et elle porte toujours. */
    const ecrit = ecrireApproche(r.fragments);
    const relu = lire(`#so!${ecrit}#${hash.slice(hash.lastIndexOf('#') + 1)}`);
    assert.equal(relu.forme, 'canonique', ecrit);
    assert.equal(ecrireApproche(relu.fragments), ecrit, `${ecrit} n’est pas un point fixe`);
    // Et les PORTÉES, elles, traversent sans bouger — seul le découpage
    // implicite se tait, la géométrie de la voie est intacte.
    assert.deepEqual(
      relu.fragments.map((f) => `${f.portee.offset}.${f.portee.longueur}`),
      r.fragments.map((f) => `${f.portee.offset}.${f.portee.longueur}`),
      `${hash} : les portées ont bougé`);
  }
});


/**
 * ★ LA RETOUCHE — un étage AMONT qui réécrit la saisie, puis tout le monde lit.
 *
 * La demande de l'auteur, mot pour mot : « on fait la conversion fr13 sur le
 * 2ᵈ mot, puis on trie l'ensemble, on applique m14 à l'ensemble ». La grammaire
 * ne savait l'écrire d'aucune façon : un fragment porte son programme de bout
 * en bout, et deux fragments ne se recombinent qu'au verdict.
 *
 * Ces tests tiennent les trois choses qui font qu'un `;` n'est pas une virgule
 * de plus : ce qui est AVANT prépare, ce qui est APRÈS lit, et une
 * démonstration sans retouche s'écrit exactement comme avant.
 */
test('★ url — `;` sépare les étages : ce qui réécrit, puis ce qui lit', () => {
  const r = lire(`#so!2.1:fr13;fl+tca+m14#${encoderTexte('Donald Trump')}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.retouches.length, 1);
  assert.deepEqual(r.retouches[0], {
    portee: { offset: 2, longueur: 1 }, resonance: null, codes: ['fr13'],
  });
  // Ce qui suit le `;` est l'approche ordinaire, virgules comprises.
  assert.equal(r.fragments.length, 1);
  assert.deepEqual(r.fragments[0].codes, ['fl', 'tca', 'm14']);
  assert.equal(r.fragments[0].portee, null);
});

test('★ url — plusieurs retouches s’enchaînent, dans l’ordre écrit', () => {
  const r = lire(`#so!0.1:fmaj;2.1:fr13;tca+m14,nd#${encoderTexte('Donald Trump')}`);
  assert.equal(r.forme, 'canonique');
  assert.deepEqual(r.retouches.map((x) => x.codes), [['fmaj'], ['fr13']]);
  assert.deepEqual(r.retouches.map((x) => x.portee),
    [{ offset: 0, longueur: 1 }, { offset: 2, longueur: 1 }]);
  assert.equal(r.fragments.length, 2, 'la virgule sépare encore les fragments');
});

test('★ url — une retouche sans portée porte sur la saisie entière', () => {
  const r = lire(`#so!fr13;tca+m14#${B58_HOPE}`);
  assert.equal(r.forme, 'canonique');
  assert.deepEqual(r.retouches, [{ portee: null, resonance: null, codes: ['fr13'] }]);
});

test('★ url — aller-retour d’une retouche, au caractère près', () => {
  /* ★ `tca` NE S'ÉCRIT PLUS : « un caractère, un jeton » est le découpage par
     défaut, réinséré à la lecture (`url.js › CODE_DECOUPE_IMPLICITE`). Les liens
     qui le PORTENT restent lisibles — ceux d'hier le font —, mais la forme
     canonique s'en passe. Ce qui est comparé ici est une ÉCRITURE, donc sans. */
  const lien = `#so!2.1:fr13;fl+mtal+m14+mpf#${encoderTexte('Donald Trump')}`;
  const r = lire(lien);
  assert.equal(ecrire({
    saisie: r.saisie, retouches: r.retouches, fragments: r.fragments, registre: r.registre,
  }), lien);
});

/**
 * ★ LA NON-RÉGRESSION QUI COMPTE LE PLUS : le `;` ne paraît QUE là où il dit
 * quelque chose. Tous les liens déjà écrits — et il n'y en a qu'un genre : ceux
 * sans retouche — gardent leur forme canonique au caractère près.
 */
test('★ url — sans retouche, l’écriture est INCHANGÉE au caractère près', () => {
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm14', 'm36'] }];
  /* ★ `tca` NE S'ÉCRIT PLUS : « un caractère, un jeton » est le découpage par
     défaut, réinséré à la lecture (`url.js › CODE_DECOUPE_IMPLICITE`). Les liens
     qui le PORTENT restent lisibles — ceux d'hier le font —, mais la forme
     canonique s'en passe. Ce qui est comparé ici est une ÉCRITURE, donc sans. */
  const attendu = `#so!m14+m36#${B58_HOPE}`;
  assert.equal(ecrire({ saisie: 'hope', fragments: frags, registre: 'sobre' }), attendu);
  assert.equal(ecrire({ saisie: 'hope', fragments: frags, registre: 'sobre', retouches: [] }), attendu);
  assert.ok(!attendu.includes(';'));
});

test('★ url — une retouche seule ne désigne aucune démonstration', () => {
  // À la lecture : il manque l'étage qui lit.
  assert.equal(lire(`#so!2.1:fr13;#${B58_HOPE}`).forme, 'invalide');
  // À l'écriture : une page de résultats n'a rien à préparer.
  assert.equal(ecrire({
    saisie: 'hope', retouches: [{ portee: null, resonance: null, codes: ['fr13'] }],
  }), `##${B58_HOPE}`);
});

test('★ url — pas d’abréviation de résonance dans une retouche', () => {
  const r = lire(`#so!×3:fr13;tca+m14#${B58_URL}`);
  assert.equal(r.forme, 'invalide');
  assert.match(r.raison, /résonance/);
  assert.equal(r.bandeau, BANDEAUX.formatInconnu);
  // …mais elle reste parfaitement licite dans un FRAGMENT.
  assert.equal(lire(`#so!fr13;×3:tca+m14#${B58_URL}`).fragments[0].resonance, 3);
});

test('★ url — un code inconnu dans une retouche est refusé comme ailleurs', () => {
  // `mzzz` a la FORME d'un code (§4.1) mais n'est pas au catalogue : c'est bien
  // « une règle que cette version ne connaît pas », pas un lien mal formé.
  const r = lire(`#so!2.1:mzzz;tca+m14#${B58_URL}`, { catalogue });
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.codeInconnu);
  assert.match(r.raison, /mzzz/);
});

test('★ url — retouchesDe traduit l’étage amont d’une approche', () => {
  const op = (code) => ({ code });
  const approche = {
    retouches: [{
      chemin: { ops: [op('fr13')] },
      fragment: { offset: 7, longueur: 5, tokenDebut: 2, tokenLong: 1, famille: 'portee' },
    }],
    parts: [],
  };
  assert.deepEqual(retouchesDe(approche), [
    { portee: { offset: 2, longueur: 1 }, resonance: null, codes: ['fr13'] },
  ]);
  // Une retouche qui couvre TOUT n'écrit pas sa portée — même règle que pour un
  // fragment, et c'est la FAMILLE qui le dit (voir `url.js › retouchesDe`).
  approche.retouches[0].fragment = {
    offset: 0, longueur: 12, tokenDebut: 0, tokenLong: 3, famille: 'entier',
  };
  assert.equal(retouchesDe(approche)[0].portee, null);
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

/**
 * ★ RENVERSEMENT ASSUMÉ : un marqueur seul ne s'annonce plus, il CHERCHE.
 *
 * Ce test disait l'inverse, et son argument était bon tant qu'il tenait :
 * « un marqueur de mise en scène sans programme à mettre en scène est un lien
 * tronqué ». Ce qui a changé n'est pas l'argument mais ce qu'on sait en faire —
 * demander une mise en scène, c'est demander une DÉMONSTRATION, et nous savons
 * désormais laquelle montrer quand le lien ne la nomme pas : la première du
 * classement, exactement comme le bouton « Révéler ». Un lien qui a un sens
 * utile vaut mieux qu'un bandeau d'erreur, et §4.3 est respecté — on ne renvoie
 * pas ailleurs en silence, on fait ce que le lien demande.
 */
test('★ registre — un marqueur seul vaut « cherche, puis montre la 1ʳᵉ voie »', () => {
  const r = lire(`#so!#${B58_HOPE}`);
  assert.equal(r.forme, 'premiere');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, true);
  assert.equal(r.bandeau, null, 'rien à annoncer : le lien est honoré');
  assert.equal(lire(`#sce!#${B58_HOPE}`).registre, 'scenique');
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
    /* ⚠️ Les codes RELUS n'ont plus le `tca` qu'on a fourni : il ne s'écrit
       plus, donc il n'est pas dans le lien, donc `lire()` ne peut pas l'y
       trouver — c'est `executerProgramme` qui le remet, au moment de jouer, et
       lui seul a le catalogue pour savoir où (`url.js ›
       CODE_DECOUPE_IMPLICITE`). Ce que ce test mesure est le REGISTRE ; on
       compare donc les fragments à ce que l'écriture retient. */
    assert.deepEqual(r.fragments, [{ ...frags[0], codes: ['m14', 'm36'] }]);
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

/* ══════════ LA SAISIE EN CLAIR — la tolérance est en LECTURE seule ═══════ */

/**
 * ★ « Si après le 2nd # une séquence non b58 est présente, plutôt que
 * d'échouer, considère la chaîne comme étant la saisie brute » (l'auteur).
 *
 * Les quatre formes sont recopiées de sa demande, avec ses exemples : ce test
 * est le contrat, pas une illustration. Ce qui les sépare est le NOMBRE DE `#`
 * et la présence d'un programme — jamais la nature de la saisie, qui se lit de
 * la même façon dans les quatre.
 */
test('★ saisie en clair — les quatre formes demandées par l’auteur', () => {
  // 1. « #Donald Trump » → recherche, puis animation de la 1ʳᵉ voie.
  const une = lire('#Donald Trump');
  assert.equal(une.forme, 'premiere');
  assert.equal(une.saisie, 'Donald Trump');
  assert.equal(une.saisieBrute, true);
  assert.equal(une.registre, 'sobre', 'le geste de « Révéler », donc le défaut');
  assert.equal(une.cible.texte, '666');

  // 2. « ##Donald Trump » → l'énumération des voies.
  const deux = lire('##Donald Trump');
  assert.equal(deux.forme, 'resultats');
  assert.equal(deux.saisie, 'Donald Trump');

  // 3. « #c111!sce!#Donald Trump » → recherche visant 111, puis animation.
  const trois = lire('#c111!sce!#Donald Trump');
  assert.equal(trois.forme, 'premiere');
  assert.equal(trois.saisie, 'Donald Trump');
  assert.equal(trois.cible.texte, '111');
  // ⚠️ Et le registre RETOMBE sur sobre, parce que 111 n'a pas d'emblème
  // dessiné — c'est la règle de repli qui existait déjà, pas une nouveauté.
  assert.equal(trois.registre, 'sobre');
  assert.equal(trois.registreDemande, 'scenique');
  // L'ordre des marqueurs reste indifférent, comme partout ailleurs.
  assert.equal(lire('#sce!c111!#Donald Trump').forme, 'premiere');

  // 4. « #so!tca+m36#Donald Trump » → aucune recherche, ce programme-là.
  const quatre = lire('#so!tca+m36#Donald Trump');
  assert.equal(quatre.forme, 'canonique');
  assert.equal(quatre.saisie, 'Donald Trump');
  assert.deepEqual(quatre.fragments, [{ portee: null, resonance: null, codes: ['tca', 'm36'] }]);
  // Sans marqueur non plus : c'est la saisie qui est tolérée, pas la grammaire.
  assert.equal(lire('#0.1:tca+m36,1.1:tca+m36#Donald Trump').fragments.length, 2);
});

/**
 * ★ LA DÉSAMBIGUÏSATION, et les mots qu'elle rate — mesurés, pas devinés.
 *
 * L'alphabet base58 est fait de lettres et de chiffres : 39 % des mots de
 * `/usr/share/dict/french` n'emploient que ses 58 signes, « Macron » compris. Ce
 * qui tranche n'est donc pas l'alphabet mais le DÉCODAGE, et il reste 435 mots
 * sur 346 244 qui passent quand même — la mesure complète est en tête de
 * `url.js`. Ce test fixe les deux bords de cette frontière.
 */
test('★ saisie en clair — le base58 gagne, et les mots qu’il gagne à tort', () => {
  // Le lien que le site PRODUIT se relit comme du base58, toujours.
  assert.equal(lire(`##${encoderTexte('Macron')}`).saisie, 'Macron');
  assert.equal(lire(`##${encoderTexte('Macron')}`).saisieBrute, false);

  // Et « Macron » tapé en clair reste « Macron », bien qu'il n'emploie que des
  // signes de l'alphabet : les octets qu'il désigne ne font pas de l'UTF-8.
  const clair = lire('##Macron');
  assert.equal(clair.saisie, 'Macron');
  assert.equal(clair.saisieBrute, true);

  // ⚠️ L'ANGLE MORT, assumé, mesuré et BRUYANT. Ces trois-là décodent en texte
  // parfaitement valide : ils restent donc lus comme des jetons. Le visiteur le
  // voit du premier coup d'œil — la page cite en titre la saisie comprise —, et
  // c'est ce qui rend le reliquat tenable : §4.3 interdit les replis MUETS.
  for (const [mot, decode] of [['a', '!'], ['aide', 'db9'], ['abattent', 'Cwd!9a']]) {
    const r = lire(`##${mot}`);
    assert.equal(r.saisie, decode, `« ${mot} » n’est plus lu comme du base58`);
    assert.equal(r.saisieBrute, false);
  }

  // La troisième condition — ni caractère de commande, ni chaîne de blancs —
  // rattrape tout le reste : « Z » décode en une espace, « cat » en U+0001 ә.
  for (const mot of ['Z', 'cat', 'bug', 'amour', 'num', '12345', 'chat', 'Wikipedia']) {
    const r = lire(`##${mot}`);
    assert.equal(r.saisie, mot, `« ${mot} » a été pris pour du base58`);
    assert.equal(r.saisieBrute, true);
  }

  // ★ Et la borne qui interdit une quatrième condition : « 666 » s'encode en
  //   quatre signes. Un seuil de longueur qui rattraperait « aide » tuerait ce
  //   lien-là, qui est légitime — le site l'écrit.
  assert.equal(encoderTexte('666'), 'KD8Z');
  assert.equal(lire('##KD8Z').saisie, '666');
});

test('saisie en clair — l’espace passe littéral ou en %20, et le % survit', () => {
  assert.equal(lire('#Donald%20Trump').saisie, 'Donald Trump');
  assert.equal(lire('##Donald%20Trump').saisie, 'Donald Trump');
  assert.equal(lire('#so!tca+m36#Donald%20Trump').saisie, 'Donald Trump');
  // Un `%` que personne n'a songé à échapper ne doit pas tuer le lien.
  assert.equal(lire('##100% vrai').saisie, '100% vrai');
  // Les blancs de bord sont coupés, comme le fait le champ d'accueil.
  assert.equal(lire('##  Donald Trump  ').saisie, 'Donald Trump');
  // Un `#` DANS la saisie survit s'il est échappé : c'est ce qu'apporte le
  // décodage par segment (`depourcenter`), et un mot-dièse est une saisie
  // plausible sur ce site-là.
  assert.equal(lire('##%23JeSuis666').saisie, '#JeSuis666');
});

test('saisie en clair — le plafond de saisie vaut aussi pour le texte brut', () => {
  const r = lire(`##${'a'.repeat(LIMITE_SAISIE + 1)}`);
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.saisieTropLongue);
  assert.equal(lire(`##${'a'.repeat(LIMITE_SAISIE)}`).forme, 'resultats', 'la borne est inclusive');
});

/**
 * ★ L'ÉCRITURE NE BOUGE PAS D'UN SIGNE, et c'est tout l'intérêt.
 *
 * « La version b58 est bien sûr toujours supportée et à conserver par défaut
 * quand on passe par l'interface du site » (l'auteur). La tolérance est en
 * lecture ; `canoniser()` fait le reste, et un lien tapé à la main se change
 * tout seul en lien partageable dès qu'on l'ouvre — exactement le mécanisme qui
 * abrège `sobre!` en `so!`.
 */
test('★ saisie en clair — l’écriture reste en base58, la barre d’adresse se corrige', () => {
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  assert.equal(ecrire({ saisie: 'Macron', fragments: frags }), `#so!m36#${encoderTexte('Macron')}`);
  assert.equal(ecrire({ saisie: 'Donald Trump' }), `##${encoderTexte('Donald Trump')}`);

  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#so!tca+m36#Macron' },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const lu = lire(faux.location.hash);
  canoniser({ saisie: lu.saisie, fragments: lu.fragments, registre: lu.registre }, faux);
  assert.equal(appels.length, 1, 'un lien tapé à la main n’est pas laissé en l’état');
  assert.equal(appels[0][2], `/numherololgeek/#so!m36#${encoderTexte('Macron')}`);
});

/**
 * NON-RÉGRESSION. Les liens que le site a produits doivent se relire au signe
 * près, saisie comprise : c'est la seule chose que la tolérance pouvait casser.
 */
test('saisie en clair — les liens base58 existants se relisent à l’identique', () => {
  const temoins = [
    'Macron', 'Donald Trump', 'hope', 'https://hope-hope-hope.fr/', '666',
    'Éléonore à Nîmes — 100 % vrai !', 'jean-michel', 'Wikipédia', 'a', 'Z',
  ];
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  for (const saisie of temoins) {
    for (const demonstration of [{ saisie }, { saisie, fragments: frags }]) {
      const lien = ecrire(demonstration);
      const r = lire(lien);
      assert.equal(r.saisie, saisie, `« ${saisie} » ne se relit pas : ${lien}`);
      assert.equal(r.saisieBrute, false, `« ${saisie} » n’a pas été relu comme du base58`);
      assert.notEqual(r.forme, 'invalide');
    }
  }
  // Et les liens figés des puces de l'accueil (`src/i18n/fr.js`) restent
  // canoniques — ce sont les seuls liens de ce dépôt qui vivent hors des tests.
  for (const hash of [
    '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
    '#0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR',
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    assert.equal(r.saisieBrute, false, hash);
  }
});

/**
 * ★ **CE QUE LE SITE ÉCRIT GARDE SON SENS ; CE QU'UN HUMAIN TAPE SUIT LA RÈGLE
 *   SIMPLE DE L'AUTEUR.**
 *
 * `#c111!#…` avait d'abord été lu comme la LISTE dans les deux cas, au motif
 * que c'est la forme que `ecrire({saisie, cible})` produit. « Je veux
 * l'inverse » (l'auteur) : des marqueurs seuls valent la première voie animée,
 * cible comprise.
 *
 * La bascule ne peut pourtant pas être totale, et la raison n'est pas
 * théorique : cette forme est écrite par le SÉLECTEUR DE CIBLE de la page de
 * listing (`pages/resultat.js`, « changer de cible, c'est changer d'URL »). La
 * lire comme une animation ferait sauter dans une démonstration au moment
 * précis où l'on clique sur `[111]` pour voir la liste des voies menant à 111.
 *
 * La frontière retenue est celle que l'auteur a lui-même posée — « la version
 * b58 est bien sûr toujours supportée et à conserver par défaut quand on passe
 * par l'interface du site » : le base58 est la signature de la machine, le
 * texte en clair celle de la main. Ses quatre exemples sont tous en clair.
 */
test('★ saisie en clair — `#c111!#…` ANIME ; en base58 il reste la LISTE', () => {
  // La main : ce que l'auteur demande.
  assert.equal(lire('#c111!#Donald Trump').forme, 'premiere');
  assert.equal(lire('#c111!#Donald Trump').cible.texte, '111');
  assert.equal(lire('#c111!sce!#Donald Trump').forme, 'premiere');

  // La machine : ce que le site écrit se relit comme le site l'entend.
  assert.equal(lire(`#c111!#${B58_HOPE}`).forme, 'resultats');
  const lien = ecrire({ saisie: 'Donald Trump', cible: '111' });
  assert.equal(lire(lien).forme, 'resultats');
  assert.equal(lire(lien).cible.texte, '111');

  // ⚠️ Et la liste reste demandable à la main, sans cible comme avec : deux
  //    dièses, c'est la liste, et cela n'a pas bougé.
  assert.equal(lire('##Donald Trump').forme, 'resultats');
});

/**
 * ★ **LES VOIES À TROUS — `????` commande au lieu de décrire.**
 *
 * > « Une voie indiquée comme ça pourrait déclencher une recherche spécifique
 * >   pour remplacer les fragments dont le programme est `????` par exactement
 * >   autant de 6 (ou de caractères dans le motif recherché) qu'il y a de "?".
 * >   Ça permettrait de construire des voies sur mesure. » (l'auteur)
 *
 * C'est la seule construction de cette grammaire qui DEMANDE au lieu de DIRE, et
 * elle ne se compose pas : `??+tca` n'a aucun sens et doit être refusé.
 */
test('★ commande — une suite de « ? » se lit comme un programme à trouver', () => {
  const d = lire('#sce!0.1:????,2.1:tca+m14#2HuP1G8mNg3sJWhqR');
  assert.equal(d.forme, 'canonique');
  assert.deepEqual(d.fragments[0].codes, ['????'], 'la commande voyage entière, jamais découpée');
  assert.deepEqual(d.fragments[1].codes, ['tca', 'm14']);

  // Elle ne se mélange pas à des codes : une commande est une commande.
  assert.notEqual(lire('#sce!0.1:??+tca#2HuP1G8mNg3sJWhqR').forme, 'canonique');
  assert.notEqual(lire('#sce!0.1:tca+??#2HuP1G8mNg3sJWhqR').forme, 'canonique');
});

/**
 * ★ **L'ÉNUMÉRATION D'UNE VOIE À TROUS — et l'asymétrie de son malus.**
 *
 * > « Objectif : autant de `?` qu'a la saisie. Mais s'il y en a plus, c'est
 * >   juste un malus de score. S'il y en a moins, c'est un énorme malus, mais
 * >   mieux vaut des résultats que aucun. » (l'auteur)
 */
test('★ commande — l’énumération classe le compte juste devant l’à-peu-près', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });

  // « Donald » sait rendre quatre valeurs utiles : la commande est satisfaite.
  const juste = m.enumererLesTrous(lire('#sce!0.1:????,2.1:tca+m14#2HuP1G8mNg3sJWhqR'));
  assert.ok(juste.ok, juste.detail || juste.raison);
  assert.ok(juste.approches.length > 1, 'une énumération montre plusieurs remplissages');
  for (const a of juste.approches) {
    assert.ok(!a.ecartCommande,
      `« ${a.codes} » : le compte juste est atteignable, rien ne doit s’en écarter`);
  }

  // ★ Onze est hors de portée du mot. On montre QUAND MÊME — « mieux vaut des
  //   résultats que aucun » —, et toutes les propositions sont en manque.
  const trop = m.enumererLesTrous(lire('#sce!0.1:???????????,2.1:tca+m14#2HuP1G8mNg3sJWhqR'));
  assert.ok(trop.ok, 'une commande hors de portée doit RENDRE quelque chose');
  assert.ok(trop.approches.every((a) => a.ecartCommande < 0),
    'aucune ne peut atteindre le compte : toutes sont en manque');

  /* ★ **ET LE MANQUE COÛTE ÉNORMÉMENT.** « S'il y en a moins, c'est un énorme
     malus » — la meilleure des approchantes doit tomber loin derrière ce que la
     même énumération rend quand le compte est atteignable, sinon le classement
     ne dirait pas que l'une répond à la question et l'autre pas.

     ⚠️ Ce qui est comparé est le SCORE, pas le rang d'écart : la liste finale
       est triée par score une fois le malus appliqué, ce qui est exactement ce
       que l'auteur demande — « juste un malus de score à appliquer, pour que
       les premiers résultats correspondent à ce qui est attendu ». Un écart de
       +1 peut donc devancer un écart de −2, et c'est voulu : le surplus se
       pardonne, le manque ruine. */
  assert.ok(trop.approches[0].score * 5 < juste.approches[0].score,
    `manque ${trop.approches[0].score} contre juste ${juste.approches[0].score} : `
    + 'le malus de manque doit être énorme');
});
