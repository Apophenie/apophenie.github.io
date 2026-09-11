/** La CIBLE TEXTUELLE — viser un mot (`cible.js`, « la cible textuelle »).
 *
 *  Ce fichier est de ROUTINE : rien n'y cherche. Il vérifie la lecture d'une
 *  cible écrite en lettres, son écriture dans l'URL, et le verdict d'une voie
 *  REJOUÉE — c'est-à-dire ce qu'un lien partagé montrera. Les recherches
 *  complètes, et les quatre exemples de l'auteur, sont dans
 *  `lents/cible-mot.test.js`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lireCible, memeCible, verdict, estMot, ecritureDe, MAX_CHIFFRES, CIBLE_DEFAUT,
} from '../cible.js';
import { lire, ecrire, BANDEAUX } from '../url.js';
import { encoderTexte } from '../base58.js';
import { creerMoteur } from '../index.js';
import { construireScenario } from '../scenario.js';
import { operateursPourCible, operateursExplorables } from '../bfs.js';
import { catalogue } from './_catalogue.js';
import { compile } from '../../visuel/compile.js';

const B58_ZERG = encoderTexte('Zerg');

/* ══════════════════════════ 1. La cible, valeur ══════════════════════════ */

test('cible-mot — un mot est une suite de RANGS, et se montre en capitales', () => {
  const c = lireCible('Zerg');
  assert.equal(c.nature, 'mot');
  assert.equal(c.texte, 'zerg', 'l’écriture canonique : bas de casse, sans accent');
  assert.deepEqual([...c.chiffres], [26, 5, 18, 7]);
  assert.deepEqual([...c.alphabet], [5, 7, 18, 26]);
  assert.equal(c.longueur, 4);
  assert.equal(c.homogene, false, 'un mot est, en général, une cible hétérogène');
  assert.equal(c.defaut, false);
  assert.equal(c.nombre, null, 'un mot n’a pas d’écriture décimale : pas de mode DIRECT');
  assert.equal(c.affichage, 'ZERG', 'les capitales que la réglette fait descendre');
  assert.equal(estMot(c), true);
  assert.equal(ecritureDe(c), 'ZERG');
  assert.equal(verdict(2, c), 'ZERG ZERG');
});

test('cible-mot — casse et accents ne comptent pas : une seule cible, une seule écriture', () => {
  for (const [a, b] of [['Fantôme', 'fantome'], ['FANTOME', 'Fantôme'], ['ZERG', 'zerg'], [' Zerg ', 'zErG']]) {
    assert.ok(memeCible(a, b), `${a} ≡ ${b}`);
    assert.equal(lireCible(a).texte, lireCible(b).texte);
  }
  assert.equal(lireCible('Fantôme').texte, 'fantome');
  assert.equal(lireCible('Fantôme').affichage, 'FANTOME');
});

test('cible-mot — ce qui n’est pas UN mot de A à Z est refusé', () => {
  for (const mauvais of [
    'c3po', 'reine des lames', 'porte-malheur', 'aujourd’hui', 'œuvre', 'straße',
    'a'.repeat(MAX_CHIFFRES + 1),
  ]) {
    assert.equal(lireCible(mauvais), null, mauvais);
  }
  assert.equal(lireCible('a'.repeat(MAX_CHIFFRES)).longueur, MAX_CHIFFRES,
    'le plafond est celui des chiffres : c’est la longueur d’une série');
});

test('cible-mot — les cibles chiffrées sont intactes, et « a » n’est pas « 1 »', () => {
  const c = lireCible('007');
  assert.equal(c.nature, 'chiffres');
  assert.equal(c.texte, '007');
  assert.equal(c.affichage, '007', 'une suite de chiffres se montre comme elle s’écrit');
  assert.equal(CIBLE_DEFAUT.texte, '666');
  assert.equal(CIBLE_DEFAUT.nature, 'chiffres');
  assert.equal(verdict(1, CIBLE_DEFAUT), '666');
  assert.equal(lireCible([6, 6, 6]).texte, '666', 'un tableau ne porte que des chiffres');
  assert.deepEqual([...lireCible('a').chiffres], [...lireCible('1').chiffres], 'la même valeur visée…');
  assert.equal(memeCible('a', '1'), false, '…mais pas la même cible : l’une se relit en lettre, l’autre non');
});

/* ══════════════════════════ 2. La cible dans l'URL ══════════════════════════ */

test('url — `czerg!` : un mot en tête de l’approche, lu plié, écrit canonique', () => {
  for (const h of [`#czerg!#${B58_ZERG}`, `#cZerg!#${B58_ZERG}`, `#cZERG!#${B58_ZERG}`]) {
    const l = lire(h);
    assert.equal(l.cible.texte, 'zerg', h);
    assert.equal(l.cibleEcrite, true, h);
    assert.equal(l.bandeau, null, h);
  }
  // Un accent arrive DÉCODÉ (`url.js › decoder`) : c'est `lireCible` qui plie.
  assert.equal(lire(`#cfantôme!#${B58_ZERG}`).cible.texte, 'fantome');
  assert.equal(ecrire({ saisie: 'Zerg', cible: 'ZERG' }), `#czerg!#${B58_ZERG}`);
  assert.equal(ecrire({ saisie: 'Zerg', cible: 'Fantôme' }), `#cfantome!#${B58_ZERG}`);
  const r = lire(ecrire({ saisie: 'Zerg', cible: 'zerg' }));
  assert.equal(r.cible.texte, 'zerg', 'ce qu’on écrit se relit à l’identique');
  assert.equal(r.saisie, 'Zerg');
});

test('url — une cible illisible le dit, et les liens chiffrés ne bougent pas', () => {
  const trop = lire(`#c${'a'.repeat(MAX_CHIFFRES + 1)}!#${B58_ZERG}`);
  assert.equal(trop.bandeau, BANDEAUX.cibleIllisible, 'refusée, pas repliée en silence sur 666');
  assert.equal(ecrire({ saisie: 'Zerg' }), `##${B58_ZERG}`, 'le défaut n’écrit toujours rien');
  assert.equal(ecrire({ saisie: 'Zerg', cible: '111' }), `#c111!#${B58_ZERG}`);
  // Sans `!`, pas de marqueur : `cs` reste la somme, comme avant.
  const somme = lire(`#cs+mch#${B58_ZERG}`);
  assert.equal(somme.cibleEcrite, false);
  assert.equal(somme.cible.defaut, true);
});

/* ══════════════════════════ 3. La recherche, sans chercher ══════════════════════════ */

test('cible-mot — les opérateurs qui lisent la cible se retirent, et `m1a` n’est jamais exploré', () => {
  const tous = operateursExplorables(catalogue);
  const lisent = tous.filter((op) => typeof op.viser === 'function');
  assert.ok(lisent.length > 0, 'il y en a, et c’est d’eux qu’on parle');
  // Ils raisonnent en chiffres décimaux : face à un mot, `lireVisee` refuse, et
  // ils se désactivent d'eux-mêmes. Rien n'est adapté, rien n'est inventé.
  assert.deepEqual(
    operateursPourCible(catalogue, lireCible('zerg')).map((op) => op.code),
    tous.filter((op) => typeof op.viser !== 'function').map((op) => op.code),
  );
  assert.equal(tous.some((op) => op.code === 'm1a'), false,
    'inactif : c’est le verdict qui le joue, la recherche ne l’explore pas');
});

/* ══════════════════════════ 4. Le verdict d'un mot ══════════════════════════ */

const moteur = creerMoteur(catalogue, { filetTemporel: false });

test('cible-mot — le verdict relit les rangs sur la réglette, PUIS révèle le mot', () => {
  const lecture = lire(`#so!czerg!ma1#${B58_ZERG}`);
  const { approche } = moteur.rejouer(lecture);
  assert.ok(approche, 'le lien se rejoue');
  const sc = moteur.scenarioDe(approche, { saisie: 'Zerg', cible: lecture.cible });
  assert.equal(sc.result, 'ZERG');
  const n = sc.steps.length;
  const reveal = sc.steps[n - 1].ops.find((o) => o.op === 'reveal');
  assert.ok(reveal, 'le dernier pas est le verdict');
  // Les quatre pas qui le précèdent relisent chacun UN rang, dans l'ordre du mot.
  const relus = sc.steps.slice(n - 5, n - 1).map((st) => st.ops[0]);
  assert.deepEqual(relus.map((o) => [o.op, o.ordre, o.letter, o.to.text]), [
    ['table', '1a26', '26', 'Z'], ['table', '1a26', '5', 'E'],
    ['table', '1a26', '18', 'R'], ['table', '1a26', '7', 'G'],
  ]);
  assert.deepEqual(reveal.targets, relus.map((o) => o.to.id),
    'ce qu’on révèle, ce sont les lettres qu’on vient de voir descendre');
  // Et la scène compile : le moteur visuel recalcule la réglette et la confronte.
  assert.doesNotThrow(() => compile(sc));
});

test('cible-mot — sans l’opérateur qui relit les rangs, le scénario refuse plutôt que de décréter', () => {
  const lecture = lire(`#so!czerg!ma1#${B58_ZERG}`);
  const { approche } = moteur.rejouer(lecture);
  assert.throws(
    () => construireScenario(approche, { saisie: 'Zerg', cible: lecture.cible }),
    /n’a pas été fourni/,
  );
});
