import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lire, ecrire, ecrireApproche, descripteursDe, retouchesDe, canoniser, autreRegistre,
  registreEffectif, BANDEAUX, RE_CODE, chargeDeRequete, adresse} from '../url.js';
import { encoderTexte, LIMITE_SAISIE } from '../base58.js';
import { catalogue } from './_catalogue.js';
import { reglagesDeBudget, PUISSANCE_ENUMERATION } from '../../config.js';
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
    // ⚠️ `#ma1#<b58>#trop` a QUITTÉ cette liste : trois segments, c'est
    // désormais la cible derrière le troisième `#` (voir `url.js`, « la cible
    // passe derrière un troisième `#` ») — ici, le texte « trop ». Ce qui reste
    // invalide, c'est un QUATRIÈME segment, qui ne désigne rien.
    [`#ma1#${B58_HOPE}#Zerg#trop`, 'quatre segments'],
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
  // « Sobre » est le défaut, et le défaut ne s'écrit pas : seul `sce!` paraît
  // (`url.js`, « `so!` NE S'ÉCRIT PLUS »).
  assert.equal(s, `?0.3:fp+ma1+cs,nv$${B58_HOPE}`);
  const r = lire(s);
  assert.equal(r.saisie, 'hope');
  assert.deepEqual(r.fragments, frags);
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, false);
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
// ★ Sans `so!` non plus : le registre sobre est le défaut et ne s'écrit plus.
const GROUPE = '0+2+4:m14,1+3:mtc+cs,6:mpy+mr9';
// ★ La forme dépliée est celle de l'ORDRE DU TEXTE, et non celle de l'ordre
//   des groupes : une ligne groupée déclare se lire de gauche à droite, et le
//   dépliage l'y remet (`url.js › lireFragments`). C'est ce qui rend la
//   factorisation neutre — sans quoi `0.1+2.1:A,1.1:B` dirait 0, 2, 1.
// ★ Sans `tca`, comme `GROUPE` : les deux formes se comparent, elles doivent
//   donc s'écrire dans le même alphabet.
const DEPLIE = '0:m14,1:mtc+cs,2:m14,'
  + '3:mtc+cs,4:m14,6:mpy+mr9';

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
  const lien = `?${GROUPE}$${B58_URL}`;
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
  assert.equal(ecrireApproche(alterne), '0+2:ma1,1:nv',
    'deux places de même programme se rejoignent, même séparées');
  // …et la relecture rend l'ordre du TEXTE, pas celui des groupes : c'est ce
  // qui rend la factorisation neutre.
  const relu = lire(`#so!${ecrireApproche(alterne)}#${encoderTexte('hope')}`);
  assert.deepEqual(relu.fragments.map((f) => f.portee.offset), [0, 1, 2],
    'une ligne groupée se déplie dans l’ordre du texte');
  assert.deepEqual(relu.fragments.map((f) => f.codes.join('+')), ['ma1', 'nv', 'ma1']);

  // Trois voisines se groupent aussi, comme avant.
  assert.equal(ecrireApproche([place(0, ['ma1']), place(2, ['ma1']), place(4, ['ma1'])]),
    '0+2+4:ma1');
  assert.equal(ecrireApproche([place(0, ['ma1']), place(1, ['ma1']), place(2, ['nv']), place(3, ['nv'])]),
    '0+1:ma1,2+3:nv');

  // ★ Et une ligne dont les places ne sont PAS dans l'ordre du texte s'écrit à
  //   plat : la factoriser lui imposerait un ordre qu'elle n'a pas choisi.
  assert.equal(ecrireApproche([place(2, ['ma1']), place(0, ['nv']), place(4, ['ma1'])]),
    '2:ma1,0:nv,4:ma1', 'une ligne à contre-sens du texte reste à plat');
});


test('★ portées groupées — ce qui n’a pas de place ne se groupe pas', () => {
  const entier = (codes) => ({ portee: null, resonance: null, codes });
  // « Toute la saisie » n'a pas de place à mettre dans une liste : deux
  // fragments entiers identiques restent deux fragments.
  assert.equal(ecrireApproche([entier(['ma1']), entier(['ma1'])]), 'ma1,ma1');
  // La résonance nomme DÉJÀ plusieurs places : elle reste seule en tête.
  const reso = { portee: null, resonance: 3, codes: ['ma1'] };
  assert.equal(ecrireApproche([reso, { portee: { offset: 9, longueur: 1 }, resonance: null, codes: ['ma1'] }]),
    '×3:ma1,9:ma1');
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
  /* ★ **UNE TÊTE SANS POINT EST DÉSORMAIS VALIDE** — elle vaut `.1`, c'est
     l'abréviation demandée par l'auteur (« vu l'omniprésence de .1 […] si ce
     n'est pas précisé c'est .1 »). `0.1+2` mêle donc les deux graphies et se
     lit sans peine : ce n'est plus une tête mal formée, c'est une tête écrite
     à moitié court. */
  assert.equal(lire(`#0.1+2:ma1#${B58_URL}`).forme, 'canonique');
  assert.deepEqual(lire(`#0.1+2:ma1#${B58_URL}`).fragments.map((f) => f.portee),
    [{ offset: 0, longueur: 1 }, { offset: 2, longueur: 1 }]);
  // Une tête mal formée, elle, reste illisible — groupée ou non. Le point SANS
  // chiffre derrière en est une : abréger n'est pas tolérer.
  for (const tete of ['0.1+', '+0.1', '0.1+2.', '0.1++2.1', '0.']) {
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
  const lien = `?2:fr13;fl+mtal+m14+mpf$${encoderTexte('Donald Trump')}`;
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
  const attendu = `?m14+m36$${B58_HOPE}`;
  assert.equal(ecrire({ saisie: 'hope', fragments: frags, registre: 'sobre' }), attendu);
  assert.equal(ecrire({ saisie: 'hope', fragments: frags, registre: 'sobre', retouches: [] }), attendu);
  assert.ok(!attendu.includes(';'));
});

/**
 * ★ **LES DEUX IMPLICITES S'ENCHAÎNENT — `STR → TOKENS → NUMS`, sans un signe.**
 *
 * `m09` — « chaque chiffre vaut lui-même » — s'est ajouté à `tca` : ni l'un ni
 * l'autre n'affirme quoi que ce soit, donc ni l'un ni l'autre ne s'écrit
 * (`config.js › IMPLICITE_DEPUIS`). Sur une saisie de chiffres, la voie la plus
 * honnête du site — lire les chiffres, constater que 666 y est déjà écrit —
 * tient donc dans un lien de quatre signes.
 *
 * Ce que le test tient, et qu'aucun autre ne tiendrait : l'aller-retour EXACT
 * d'une chaîne de DEUX portes. Une seule se vérifiait jusqu'ici ; la seconde
 * pourrait se réinsérer au mauvais rang — avant un filtre, après une conversion
 * explicite — sans qu'aucun test d'écriture ne s'en aperçoive, puisque
 * l'écriture, justement, ne la montre pas.
 */
test('★ url — la lecture des chiffres se tait, elle aussi, et se réinsère au bon rang', () => {
  const chiffres = encoderTexte('12345666');
  // L'écriture : les deux implicites tombent, le reste ne bouge pas.
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm09', 'm36'] }];
  assert.equal(ecrire({ saisie: '12345666', fragments: frags, registre: 'sobre' }),
    `?m36$${chiffres}`);

  // La lecture : les deux se remettent, dans cet ordre, et à leur place.
  const r = lire(`#m36#${chiffres}`);
  assert.equal(r.forme, 'canonique');
  assert.deepEqual(r.fragments[0].codes, ['m36'], 'le lien ne porte que ce qui s’écrit');

  // ★ Et le programme RÉELLEMENT exécuté les porte tous les deux — c'est le
  //   moteur qui le dit, pas cette page : un lien de quatre signes déroule
  //   trois opérateurs.
  const m = creerMoteur(catalogue);
  const rejeu = m.rejouer(lire(`#m36#${chiffres}`));
  assert.ok(rejeu.ok, rejeu.raison);
  assert.equal(String(rejeu.approche.codes), 'tca+m09+m36');

  // ⚠️ ET UN LIEN QUI LES ÉCRIT RESTE LU, sans que rien ne se double : la
  //   réinsertion CONSTATE le type de l'état, elle ne devine pas.
  const explicite = m.rejouer(lire(`#tca+m09+m36#${chiffres}`));
  assert.ok(explicite.ok, explicite.raison);
  assert.equal(String(explicite.approche.codes), 'tca+m09+m36');
});

test('★ url — une retouche seule ne désigne aucune démonstration', () => {
  // À la lecture : il manque l'étage qui lit.
  assert.equal(lire(`#so!2.1:fr13;#${B58_HOPE}`).forme, 'invalide');
  // À l'écriture : une page de résultats n'a rien à préparer.
  assert.equal(ecrire({
    saisie: 'hope', retouches: [{ portee: null, resonance: null, codes: ['fr13'] }],
  }), `?$${B58_HOPE}`);
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
  assert.equal(ecrire({ saisie: 'hope' }), `?$${B58_HOPE}`);
  assert.equal(ecrire({ saisie: 'hope', fragments: [] }), `?$${B58_HOPE}`);
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
  assert.equal(frag, `?nd$${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/?nd$${B58_HOPE}`);
  // Idempotent : si le hash est déjà canonique, on n’empile rien.
  faux.location.search = frag; faux.location.hash = '';
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
  assert.equal(ecrire({ saisie: 'hope' }), `?$${B58_HOPE}`);
  assert.equal(lire(`##${B58_HOPE}`).registre, null);
});

/* ═══════════ `so!` NE S'ÉCRIT PLUS — seul `sce!` se mentionne ═══════════ */

/**
 * ★ « so! inutile de le mettre, c'est l'implicite par défaut, c'est quand c'est
 *   sce! qu'il faut le mentionner. » (l'autrice)
 *
 * Toutes les formes qu'`ecrire()` produit, croisées : avec ou sans programme,
 * sans cible / cible chiffrée / cible textuelle, registre absent / sobre /
 * scénique, avec ou sans curseurs et fouille, et — avec un programme — sans
 * étage, avec une retouche, avec une liaison, avec une relecture. Chaque forme
 * est relue en base58 (ce que le site écrit) et en clair (ce que la main tape).
 *
 * Trois choses sont tenues pour chacune :
 *   1. `so!` n'est jamais écrit, `sce!` l'est exactement quand on le JOUERA ;
 *   2. `lire(ecrire(x))` redonne `x`, et réécrire ce qu'on a lu est un point fixe ;
 *   3. la forme que la version publiée écrivait — la même, AVEC `so!` — se
 *      relit à l'identique (à `registreEcrit` près, qui dit ce que le lien
 *      portait), et se réécrit sans `so!`.
 *
 * ⚠️ Et la seule place où `so!` change encore le sens : SANS programme.
 * `ecrire()` n'y a jamais posé de registre, donc rien n'a été retiré ; mais
 * `#so!#…` écrit à la main vaut la première voie, là où `##…` vaut la liste.
 */
test('★ registre — `so!` ne s’écrit plus, et chaque forme se relit comme sa forme avec `so!`', () => {
  const SAISIE = 'Donald Trump';
  const PROGRAMME = [
    { portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['m14'] },
    { portee: { offset: 2, longueur: 1 }, resonance: null, codes: ['m36'] },
  ];
  const RETOUCHE = [{ portee: { offset: 2, longueur: 1 }, resonance: null, codes: ['fr13'] }];
  const REGLAGES = { curseurs: { simplicite: 10, exhaustivite: 20, quantite: 30, coherence: 40 }, fouille: 2 };
  const avecSo = (url) => `?so!${url.slice(1)}`;
  const enClair = (url) => { const p = url.split('$'); p[1] = `:${SAISIE}`; return p.join('$'); };
  const sansTrace = ({ registreEcrit, ...lecture }) => lecture;
  const champs = (l) => ({
    saisie: l.saisie, fragments: l.fragments, retouches: l.retouches, registre: l.registre,
    cible: l.cible, relecture: l.relecture, liaison: l.liaison, curseurs: l.curseurs, fouille: l.fouille,
  });

  let vues = 0;
  for (const avecProgramme of [false, true]) {
    for (const cible of [undefined, '111', 'Zerg']) {
      for (const registre of [undefined, 'sobre', 'scenique']) {
        for (const reglages of [{}, REGLAGES]) {
          const etages = !avecProgramme ? [{}] : [
            {}, { retouches: RETOUCHE }, { liaison: 'mdl0' },
            ...(cible === 'Zerg' ? [{ relecture: 'mcaz' }] : []),
          ];
          for (const etage of etages) {
            const x = {
              saisie: SAISIE, cible, registre, ...reglages, ...etage,
              ...(avecProgramme ? { fragments: PROGRAMME } : {}),
            };
            const s = ecrire(x);
            const nom = `${JSON.stringify(x)} → ${s}`;
            const joue = registreEffectif(registre, cible);
            vues++;

            // 1. `so!` jamais écrit ; `sce!` exactement quand on le jouera.
            assert.doesNotMatch(s, /so!/, nom);
            assert.equal(s.startsWith('?sce!'), avecProgramme && joue === 'scenique', nom);

            // 2. L'aller-retour.
            const l = lire(s);
            assert.equal(l.forme, avecProgramme ? 'canonique' : 'resultats', nom);
            assert.equal(l.saisie, SAISIE, nom);
            assert.equal(l.cible.texte, cible ?? '666', nom);
            assert.equal(l.registre, avecProgramme ? joue : null, nom);
            assert.equal(l.registreEcrit, avecProgramme && joue === 'scenique', nom);
            assert.equal(l.fouille, reglages.fouille ?? 0, nom);
            if (reglages.curseurs) assert.deepEqual(l.curseurs, reglages.curseurs, nom);
            if (avecProgramme) {
              assert.deepEqual(l.fragments, PROGRAMME, nom);
              assert.deepEqual(l.retouches, etage.retouches ?? [], nom);
              assert.equal(l.liaison, etage.liaison ?? null, nom);
              assert.equal(l.relecture, etage.relecture ?? null, nom);
            }
            assert.equal(ecrire(champs(l)), s, `${nom} : pas un point fixe`);

            if (avecProgramme && joue === 'sobre') {
              // 3. La forme publiée, avec `so!`, en base58 comme en clair.
              for (const forme of [s, enClair(s)]) {
                const ancienne = lire(avecSo(forme));
                assert.equal(ancienne.registreEcrit, true, avecSo(forme));
                assert.deepEqual(sansTrace(ancienne), sansTrace(lire(forme)),
                  `${avecSo(forme)} ne se relit pas comme ${forme}`);
                assert.equal(ecrire(champs(ancienne)), s, `${avecSo(forme)} ne se canonise pas sans so!`);
              }
            }
            if (!avecProgramme) {
              // ⚠️ Sans programme, `so!` n'est PAS retirable : il demande la
              // première voie. La forme écrite (base58) est la liste ; en clair,
              // elle ne devient la première voie que si une cible est écrite.
              assert.equal(lire(avecSo(s)).forme, 'premiere', avecSo(s));
              assert.equal(lire(avecSo(enClair(s))).forme, 'premiere', avecSo(enClair(s)));
              assert.equal(lire(enClair(s)).forme, 'resultats', enClair(s));
            }
          }
        }
      }
    }
  }
  assert.equal(vues, 78, 'le tableau des combinaisons a changé de taille');
});

test('★ registre — le scénique replié n’écrit aucun marqueur, et l’aller-retour reste fidèle', () => {
  const fragments = [{ portee: null, resonance: null, codes: ['nd'] }];
  const s = ecrire({ saisie: 'hope', fragments, registre: 'scenique', cible: '111' });
  assert.equal(s, `?nd$${B58_HOPE}$${encoderTexte('111')}`, '111 n’a pas d’emblème : rien à écrire');
  const l = lire(s);
  assert.equal(l.registre, 'sobre');
  assert.equal(ecrire({ saisie: l.saisie, fragments: l.fragments, registre: l.registre, cible: l.cible }), s);
  // Le lien publié portait `so!` : il se relit pareil, et se réécrit sans.
  const publie = lire(`#so!nd#${B58_HOPE}#${encoderTexte('111')}`);
  assert.equal(publie.registre, 'sobre');
  assert.equal(ecrire({ saisie: publie.saisie, fragments: publie.fragments, registre: publie.registre, cible: publie.cible }), s);
  // Et le `sce!` écrit à la main sur 111 se canonise de même.
  const demande = lire(`#sce!nd#${B58_HOPE}#${encoderTexte('111')}`);
  assert.equal(demande.registreDemande, 'scenique');
  assert.equal(ecrire({ saisie: demande.saisie, fragments: demande.fragments, registre: demande.registre, cible: demande.cible }), s);
});

test('★ registre — canoniser() retire le `so!` d’un lien publié', () => {
  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: `#so!p10.20.30.40!f2!m36#${B58_HOPE}` },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const lu = lire(faux.location.hash);
  assert.equal(lu.forme, 'canonique');
  const frag = canoniser({
    saisie: lu.saisie, fragments: lu.fragments, registre: lu.registre, curseurs: lu.curseurs, fouille: lu.fouille,
  }, faux);
  assert.equal(frag, `?p10.20.30.40!f2!m36$${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/?p10.20.30.40!f2!m36$${B58_HOPE}`);
});

test('★ registre — un texte qui commence par « so! » reste une saisie', () => {
  // Un seul `#` : pas d'approche, donc pas de marqueur. Rien n'a changé ici.
  const l = lire('#so!Machin');
  assert.equal(l.forme, 'premiere');
  assert.equal(l.saisie, 'so!Machin');
  assert.equal(l.registreEcrit, false);
  const b58 = lire(`#${encoderTexte('so!Machin')}`);
  assert.equal(b58.saisie, 'so!Machin');
  // Et une saisie « so!Machin » s'écrit en base58 : aucun `!` ne sort dans le lien.
  assert.equal(ecrire({ saisie: 'so!Machin' }), `?$${encoderTexte('so!Machin')}`);
});

test('★ url — une démonstration sans programme ne s’écrit pas : l’échec est bruyant', () => {
  // `#so!#…` hier (la première voie), `##…` sans le garde (la liste) : deux
  // pages différentes de ce qu'on demandait, et aucune ne le disait.
  for (const registre of ['sobre', 'scenique']) {
    assert.throws(() => ecrire({ saisie: 'hope', registre, fragments: [{ portee: null, resonance: null, codes: [] }] }),
      /sans programme/);
  }
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
test('★ registre — la forme longue se relit, la forme brève s’écrit — et « sobre » ne s’écrit pas', () => {
  // `so!` ne s'écrit plus du tout (`url.js`, « `so!` NE S'ÉCRIT PLUS ») : le
  // préfixe attendu du sobre est donc l'absence de marqueur.
  for (const [long, bref, attendu, prefixe] of [
    ['sobre', 'so', 'sobre', '?ma1$'],
    ['scenique', 'sce', 'scenique', '?sce!ma1$'],
  ]) {
    assert.equal(lire(`#${long}!ma1+cs+prn#${B58_HOPE}`).registre, attendu,
      `« ${long}! » n’est plus compris : les liens de la 1.2.0 sont morts`);
    assert.equal(lire(`#${bref}!ma1+cs+prn#${B58_HOPE}`).registre, attendu);
    // Et c'est la forme brève qui sort, quelle que soit celle qui est entrée.
    const ecrit = ecrire({ saisie: 'hope', fragments: [{ codes: ['ma1'] }], registre: attendu });
    assert.ok(ecrit.startsWith(prefixe), `écrit « ${ecrit} », attendu le préfixe « ${prefixe} »`);
    assert.doesNotMatch(ecrit, new RegExp(`^\\?${long}!`), 'la forme longue est encore écrite');
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
 * retire le `so!` d'un lien sobre.
 */
test('★ saisie en clair — l’écriture reste en base58, la barre d’adresse se corrige', () => {
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  assert.equal(ecrire({ saisie: 'Macron', fragments: frags }), `?m36$${encoderTexte('Macron')}`);
  assert.equal(ecrire({ saisie: 'Donald Trump' }), `?$${encoderTexte('Donald Trump')}`);

  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#so!tca+m36#Macron' },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const lu = lire(faux.location.hash);
  canoniser({ saisie: lu.saisie, fragments: lu.fragments, registre: lu.registre }, faux);
  assert.equal(appels.length, 1, 'un lien tapé à la main n’est pas laissé en l’état');
  assert.equal(appels[0][2], `/numherololgeek/?m36$${encoderTexte('Macron')}`,
    'le clair devient base58, `tca` et `so!` tombent');
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
 * ⚠️ **CETTE BASCULE A ÉTÉ DÉFAITE PAR L'AUTRICE**, et ce test gèle désormais
 * son contraire. Elle disait : `#c111!#Donald Trump` anime, `#c111!#<b58>`
 * énumère — « le base58 est la signature de la machine, le texte en clair
 * celle de la main ». Son verdict : « l'écriture de la saisie ne détermine plus
 * jamais la page obtenue », parce qu'une règle invisible dans le lien ne doit
 * pas en changer la page sous les yeux de qui le compose à la main.
 *
 * Ce que le sélecteur de cible de la page de listing écrit n'en souffre pas :
 * il écrit du base58, et le base58 énumérait déjà.
 */
test('★ la cible est un RÉGLAGE DE RECHERCHE : elle énumère, en clair comme en base58', () => {
  // La cible ne demande à voir aucune voie : elle paramètre l'énumération.
  for (const lien of ['#c111!#Donald Trump', `#c111!#${B58_HOPE}`,
    '?c111!$Donald Trump', '##:hope#:111', '?$:hope$:111']) {
    assert.equal(lire(lien).forme, 'resultats', `${lien} doit énumérer`);
  }
  assert.equal(lire('#c111!#Donald Trump').cible.texte, '111');

  // Le REGISTRE, lui, demande à voir : il anime, et l'écriture n'y change rien.
  for (const lien of ['#c111!sce!#Donald Trump', `#so!#${B58_HOPE}`,
    '?so!$:hope', `?sce!$${B58_HOPE}`]) {
    assert.equal(lire(lien).forme, 'premiere', `${lien} doit animer`);
  }

  // Ce que le site ÉCRIT n'a pas changé de sens.
  const lien = ecrire({ saisie: 'Donald Trump', cible: '111' });
  assert.equal(lire(lien).forme, 'resultats');
  assert.equal(lire(lien).cible.texte, '111');
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
/**
 * ★ **L'ÉNUMÉRATION LIT LES RÉGLAGES DU LIEN — la fouille ET les curseurs.**
 *
 * L'audit l'a relevé : `f<N>!` n'était pas lu (un lien à trous au cran 5
 * tournait au cran 2), la liste était triée par le barème du défaut même sous
 * `p…!`, coupée à douze places quelle que soit la réglette, et la page se
 * redessinait avec quatre curseurs à 100 et la fouille à 0. Un lien à trous
 * partagé ne rendait donc pas la liste qu'on avait sous les yeux en le copiant.
 */
test('★ commande — l’énumération applique la fouille et les curseurs du lien, et le dit', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const texte = encoderTexte('Le chat dort');
  const auDefaut = m.enumererLesTrous(lire(`#sce!0:???,2:?#${texte}`));
  assert.ok(auDefaut.ok, auDefaut.detail || auDefaut.raison);
  assert.equal(auDefaut.puissance, PUISSANCE_ENUMERATION, 'sans marqueur : le cran de l’énumération');
  assert.equal(auDefaut.fouille, PUISSANCE_ENUMERATION);
  assert.equal(auDefaut.curseursEcrits, false);

  const fouille5 = m.enumererLesTrous(lire(`#f5!0:???,2:?#${texte}`));
  assert.ok(fouille5.ok, fouille5.detail || fouille5.raison);
  assert.equal(fouille5.puissance, 5, 'le cran du lien est celui qui tourne');
  assert.equal(fouille5.fouille, 5, '…et il est rendu, pour que la page le dessine');
  assert.ok(fouille5.approches.length <= reglagesDeBudget(5).voies,
    'les places suivent le cran, plus une douzaine en dur');

  const pondere = m.enumererLesTrous(lire(`#p200.0.0.0!0:???,2:?#${texte}`));
  assert.ok(pondere.ok, pondere.detail || pondere.raison);
  assert.equal(pondere.curseursEcrits, true);
  assert.equal(pondere.curseurs.simplicite, 200, 'les curseurs appliqués sont rendus');
  // Et la liste est CLASSÉE par ces curseurs : décroissante sur le score
  // pondéré qu'elle affiche, pas sur celui du barème par défaut.
  const scores = pondere.approches.map((a) => a.score);
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i] <= scores[i - 1], `rang ${i + 1} (${scores[i]}) passe devant le rang ${i} (${scores[i - 1]})`);
  }
});

/**
 * ★ **UN SURPLUS ET UN MANQUE NE S'ANNULENT PAS.** L'audit l'a relevé : la peine
 * lisait la somme SIGNÉE des écarts, si bien que « +1 sur un trou, −1 sur
 * l'autre » payait un facteur 1 et s'affichait à écart 0, là où le pavé promet
 * ×0,80 par 6 de trop ET ×0,25 par 6 manquant. Chaque part paie la sienne.
 */
test('★ commande — l’écart se paie trou par trou, et l’absolu est publié', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const r = m.enumererLesTrous(lire('#sce!0.1:???????????,2.1:tca+m14#2HuP1G8mNg3sJWhqR'));
  assert.ok(r.ok);
  for (const a of r.approches) {
    if (!a.ecartCommande) continue;
    assert.ok(Number.isInteger(a.ecartAbsolu) && a.ecartAbsolu >= Math.abs(a.ecartCommande),
      `« ${a.codes} » : l’absolu (${a.ecartAbsolu}) ne peut pas être sous le signé (${a.ecartCommande})`);
  }
});

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

/* ═════════════════ LES DEUX PORTEURS — la promesse tenue ═════════════════ */

/**
 * ★ **TOUT LIEN DÉJÀ PUBLIÉ S'OUVRE ENCORE, ET SUR LA MÊME PAGE.**
 *
 * La démonstration a quitté le fragment pour la requête : un fragment n'a pas
 * le droit de contenir un `#` (RFC 3986, `fragment = *( pchar / "/" / "?" )`),
 * si bien que nos `##…` étaient hors grammaire et qu'un navigateur pouvait les
 * recoder. Mais des liens sont partagés depuis la publication, et ils ne
 * peuvent pas mourir d'un changement de porteur.
 *
 * Ce test gèle l'ISOMORPHISME : à chaque forme de fragment répond une forme de
 * requête qui se lit exactement pareil — même `forme`, même saisie, même cible.
 * Le nombre de séparateurs porte la même distinction qu'avant.
 */
test('★ porteurs — chaque forme publiée en fragment a sa jumelle en requête', () => {
  const H = encoderTexte('hope');
  for (const [fragment, requete, forme, saisie, cible] of [
    ['#:hope', '?:hope', 'premiere', 'hope', '666'],
    ['##:hope', '?$:hope', 'resultats', 'hope', '666'],
    ['##:hope#:111', '?$:hope$:111', 'resultats', 'hope', '111'],
    ['#sce!m14#:hope', '?sce!m14$:hope', 'canonique', 'hope', '666'],
    [`##${H}`, `?$${H}`, 'resultats', 'hope', '666'],
    [`#${H}`, `?${H}`, 'premiere', 'hope', '666'],
    [`#3+7+2#${H}`, `?3+7+2$${H}`, 'heritee', 'hope', '666'],
    [`#so!#${H}`, `?so!$${H}`, 'premiere', 'hope', '666'],
  ]) {
    for (const [porteur, lien] of [['fragment', fragment], ['requête', requete]]) {
      const l = lire(lien);
      assert.equal(l.forme, forme, `${porteur} « ${lien} » : forme`);
      assert.equal(l.saisie, saisie, `${porteur} « ${lien} » : saisie`);
      assert.equal(l.cible.texte, cible, `${porteur} « ${lien} » : cible`);
    }
  }
});

/**
 * ★ **LE PORTEUR CHOISIT SON SÉPARATEUR — ET C'EST CE QUI REND LA PROMESSE
 *   TENABLE.**
 *
 * `$` était un caractère ordinaire du temps du fragment : une saisie pouvait en
 * contenir un, et un vieux lien qui en porte un ne doit pas se découper dessus.
 * Symétriquement, `#` n'est rien dans une requête. Et dans les deux porteurs,
 * le découpage précède le décodage pourcent (voir `lire()`), de sorte que
 * `%23` désigne un `#` du texte et `%24` un `$` du texte, jamais un séparateur.
 */
test('★ porteurs — un `$` de fragment et un `#` de requête ne séparent rien', () => {
  assert.equal(lire('#:100$').saisie, '100$',
    'le `$` d’un lien publié appartient à la saisie, il ne la coupe pas');
  assert.equal(lire('##%23JeSuis666').saisie, '#JeSuis666',
    '`%23` reste un `#` DANS la saisie — découper précède décoder');
  assert.equal(lire('?$%24litteral').saisie, '$litteral',
    '`%24` est un `$` du texte, jamais un séparateur');
  assert.equal(lire('?$:100#bis').saisie, '100#bis',
    'le `#` d’une requête appartient à la saisie');
});

/**
 * ★ **UN PARAMÈTRE ORDINAIRE COHABITE AVEC LA DÉMONSTRATION.**
 *
 * La charge d'une démonstration n'est pas un couple `clé=valeur` : c'est un
 * segment nu. `?debug=1` doit donc pouvoir vivre dans la même requête sans être
 * pris pour une saisie, et sans disparaître quand on navigue. Le crible exige
 * d'un paramètre un nom commençant par une LETTRE — ce qui laisse `?:2+2=4`
 * du côté des saisies, là où une comparaison naïve sur `=` l'aurait perdu.
 */
test('★ porteurs — un paramètre ordinaire cohabite avec la charge, et lui survit', () => {
  const H = encoderTexte('hope');
  assert.equal(chargeDeRequete('?debug=1'), '', 'un paramètre seul ne désigne aucune démonstration');
  assert.equal(chargeDeRequete('?a=1&b=2'), '');
  assert.equal(chargeDeRequete('?$:hope'), '$:hope');
  assert.equal(chargeDeRequete('?$:hope&debug=1'), '$:hope');
  assert.equal(chargeDeRequete('?debug=1&$:hope'), '$:hope', 'l’ordre est indifférent');
  assert.equal(chargeDeRequete('?:2+2=4'), ':2+2=4',
    'un `=` ne fait pas un paramètre sans nom de paramètre');

  // ★ L'adresse RECONDUIT l'étranger, et JETTE l'ancienne charge : sans quoi
  //   chaque navigation empilerait la précédente dans la barre d'adresse.
  const ailleurs = { location: { pathname: '/nhlg/', search: '?$vieux&debug=1', hash: '' } };
  assert.equal(adresse(`?m14$${H}`, ailleurs), `/nhlg/?m14$${H}&debug=1`);

  // ★ Et la canonisation d'un lien PUBLIÉ abandonne le fragment sans emporter
  //   le paramètre avec lui.
  const appels = [];
  const faux = {
    location: { pathname: '/nhlg/', search: '?debug=1', hash: `#so!m14#${H}` },
    history: { replaceState: (...a) => appels.push(a[2]) },
  };
  canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['m14'] }] }, faux);
  assert.equal(appels[0], `/nhlg/?m14$${H}&debug=1`,
    'le vieux fragment tombe, le paramètre reste');
});

/**
 * ★ **LE TABLEAU DE L'AUTRICE, LIGNE PAR LIGNE.**
 *
 * > « Il n'y a que `?$<b58 ou clair>` et `##<b58 ou clair>` qui affichent la
 * >   liste. » (l'autrice)
 *
 * Ce que ce test gèle n'est pas une implémentation mais une DÉCISION : le
 * nombre de séparateurs décide, l'écriture de la saisie jamais, et le registre
 * — seul marqueur qui dise comment MONTRER — demande l'animation. Chaque ligne
 * est vérifiée dans les DEUX porteurs, parce que la promesse est que les liens
 * d'hier se lisent exactement comme ceux d'aujourd'hui.
 */
test('★ deux familles — chaque ligne du tableau, en requête ET en fragment', () => {
  const H = encoderTexte('hope');
  const C = encoderTexte('111');
  for (const [requete, fragment, attendu, quoi] of [
    [`?${H}`, `#${H}`, 'premiere', 'zéro séparateur : Révéler'],
    ['?:hope', '#:hope', 'premiere', 'zéro séparateur, en clair : Révéler'],
    [`?$${H}`, `##${H}`, 'resultats', 'un séparateur : la liste'],
    ['?$:hope', '##:hope', 'resultats', 'un séparateur, en clair : la liste'],
    [`?$${H}$${C}`, `##${H}#${C}`, 'resultats', 'deux séparateurs : la liste visant la cible'],
    ['?$:hope$:111', '##:hope#:111', 'resultats', 'idem, en clair'],
    [`?c111!$${H}`, `#c111!#${H}`, 'resultats', 'marqueur de cible : un réglage, donc la liste'],
    ['?c111!$:hope', '#c111!#:hope', 'resultats', 'idem, en clair'],
    [`?p100.100.10.100!f10!$${H}`, `#p100.100.10.100!f10!#${H}`, 'resultats', 'curseurs et fouille : des réglages'],
    [`?so!$${H}`, `#so!#${H}`, 'premiere', 'registre sobre : il demande à MONTRER'],
    [`?sce!$${H}`, `#sce!#${H}`, 'premiere', 'registre scénique'],
    [`?so!p10.20.30.40!$${H}`, `#so!p10.20.30.40!#${H}`, 'premiere', 'registre + réglages : le registre décide'],
    [`?m14$${H}`, `#m14#${H}`, 'canonique', 'un programme : aucune recherche'],
  ]) {
    assert.equal(lire(requete).forme, attendu, `requête « ${requete} » — ${quoi}`);
    assert.equal(lire(fragment).forme, attendu, `fragment « ${fragment} » — ${quoi}`);
  }
});
