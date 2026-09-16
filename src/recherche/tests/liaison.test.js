/**
 * ★ **LA LIAISON — deux résultats n'en font qu'un : « James Bond » vaut 007.**
 *
 * > « Un exemple que je trouverais magistral : "James Bond" : James converti en
 * >   un nombre qui, divisé par le nombre issu de Bond, donne pile 007. »
 * >   (l'auteur)
 *
 * Avec le même programme sur les deux mots — `fr21+tca+mx6+cali` —, « James »
 * donne 126 et « Bond » 18, et la potence à zéros de tête pose `0 0 7`.
 *
 * Ces tests passent par le chemin que le SITE prend : le lien, le rejeu, le
 * scénario, la compilation. Aucun ne lance de recherche — celle-là, qui coûte
 * des secondes, vit dans `lents/liaison.test.js`. La leçon de la semaine vaut
 * ici : deux livraisons déclarées faites ne l'étaient pas, faute d'avoir passé
 * par le chemin du site.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../index.js';
import { ecrire, lire, BANDEAUX } from '../url.js';
import { catalogue } from './_catalogue.js';
import { compile } from '../../visuel/compile.js';
import { setGlyphes } from '../../visuel/glyphes.js';
import { GLYPHES } from '../../visuel/fixtures/glyphes.js';
import { lecteur } from '../../visuel/tests/_lecteur.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');
const moteur = creerMoteur(catalogue);

const PROGRAMME = ['fr21', 'tca', 'mx6', 'cali'];
/** Le lien de la voie de l'auteur : un mot, puis l'autre, réunis par `code`. */
const lienJamesBond = ({ cible = '007', liaison = 'mdl0' } = {}) => ecrire({
  saisie: 'James Bond', registre: 'scenique', cible, liaison,
  fragments: [
    { portee: { offset: 0, longueur: 1 }, resonance: null, codes: PROGRAMME },
    { portee: { offset: 2, longueur: 1 }, resonance: null, codes: PROGRAMME },
  ],
});

test('★ le lien porte sa liaison en tête, et se relit tel quel', () => {
  const url = lienJamesBond();
  assert.match(url, /^\?=mdl0!0\+2:fr21\+mx6\+cali\$/, 'le marqueur `=mdl0!` en tête, `tca` et `so!` implicites');
  const l = lire(url);
  assert.equal(l.forme, 'canonique');
  assert.equal(l.liaison, 'mdl0');
  assert.equal(l.cible.texte, '007');
  assert.equal(ecrire({ ...l, fragments: l.fragments }), url, 'l’aller-retour est exact');
  assert.equal(lire('#so!0+2:fr21+mx6+cali#:James Bond#:007').liaison, null, 'sans marqueur, pas de liaison');
});

test('★ le rejeu réunit 126 et 18 par la potence — et le dit', () => {
  const r = moteur.rejouer(lire(lienJamesBond()));
  assert.ok(r.ok, r.raison);
  const a = r.approche;
  assert.equal(a.mode, 'OPERATION');
  assert.equal(a.liaison.code, 'mdl0');
  assert.deepEqual(a.parts.map((p) => p.chemin.etats.at(-1).valeur), [126, 18]);
  assert.equal(a.codes, '=mdl0!fr21+tca+mx6+cali,fr21+tca+mx6+cali', 'les codes nomment la liaison');
  assert.equal(a.url, lienJamesBond(), 'le lien rendu est celui qu’on a joué');
  // ★ REVIREMENT décidé par l'autrice : une voie à liaison se nomme par sa
  //   CONVERSION, sous son titre court — la division reste visible dans
  //   l'énumération des étapes et dans la règle.
  assert.match(a.titre.fr, /^Gématrie anglaise$/, 'la voie se nomme par sa conversion');
  assert.match(a.regle.fr, /divisé par le second à la potence/, 'et la règle la dit en dernier');
  assert.ok(Number.isFinite(a.score) && a.score > 0, `score ${a.score}`);
});

/**
 * ⚠️ **UNE LIAISON SE VÉRIFIE, ELLE NE SE CROIT PAS.** Le rejeu ne vérifiait
 *   pas, jusqu'ici, que les parts d'un lien écrivent la cible : des parts qui
 *   finissent sur 126 et 18 passaient pour une partition visant 007. Une
 *   liaison, elle, est refusée dès qu'elle n'écrit pas EXACTEMENT la cible.
 */
test('★ une liaison qui n’écrit pas la cible est refusée, avec son bandeau', () => {
  const r = moteur.rejouer(lire(lienJamesBond({ cible: '008' })));
  assert.equal(r.ok, false);
  assert.equal(r.bandeau, BANDEAUX.liaisonImpossible);
  // `mdlc` écrit `7`, pas `007` : c'est une autre voie, qui vise une autre cible.
  assert.equal(moteur.rejouer(lire(lienJamesBond({ liaison: 'mdlc' }))).ok, false);
  assert.ok(moteur.rejouer(lire(lienJamesBond({ liaison: 'mdlc', cible: '7' }))).ok, 'mdlc vise 7');
  // Un code qui n'est pas une liaison n'en devient pas une par le marqueur.
  assert.equal(moteur.rejouer(lire(lienJamesBond({ liaison: 'md03' }))).bandeau, BANDEAUX.codeInconnu);
});

test('★ la scène joue la potence de 126 ÷ 18, sans rien superposer', () => {
  const r = moteur.rejouer(lire(lienJamesBond()));
  const sc = moteur.scenarioDe(r.approche, { saisie: 'James Bond' });
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  const i = sc.steps.findIndex((s) => (s.ops || []).some((o) => o.op === 'potence'));
  assert.ok(i >= 0, 'la potence est JOUÉE, pas remplacée');
  const pot = sc.steps[i].ops.find((o) => o.op === 'potence');
  assert.deepEqual(pot.to.map((t) => t.text), ['0', '0', '7']);
  assert.equal(pot.zeroInitial, true);
  const tl = compile(sc);
  assert.deepEqual(tl.warnings, []);
  const { t0, t1 } = tl.steps[i];
  const pire = lecteur(tl).chevauchement(t0, t1, 600);
  assert.equal(pire, null, `superposition : ${JSON.stringify(pire)}`);
  assert.equal(sc.steps.at(-1).caption, '007', 'le verdict annonce ce qui a été écrit');
});
