/** L'autoplay et sa cinquième condition : la scène ET les commandes à l'écran.
 *
 *  L'auteur : « auto-play, mais seulement si la scène est visible — que la zone
 *  .scene et la zone .transport soient entièrement à l'écran, aucune des
 *  extrémités ne sortant de la zone actuellement visible. Et sans que ça
 *  interfère avec la possibilité de faire pause. »
 *
 *  Ce fichier vérifie les deux moitiés de la promesse : la GÉOMÉTRIE, qui est
 *  une fonction pure et se teste directement ; et le CÂBLAGE, qui ne se voit
 *  qu'en lisant les deux fichiers ensemble — le moteur visuel ne connaît que
 *  son `<svg>`, c'est la page qui sait ce qu'il faut regarder. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tientDansLaVue } from './pages/demonstration.js';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/** Une boîte, à la manière de `getBoundingClientRect`. */
const boite = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height,
});

test('★ autoplay — une zone entièrement dans la vue, et rien de moins', () => {
  const V = [1000, 800];
  assert.equal(tientDansLaVue(boite(0, 0, 1000, 800), ...V), true, 'pile la vue');
  assert.equal(tientDansLaVue(boite(100, 50, 400, 300), ...V), true, 'bien au milieu');

  // « Aucune des extrémités ne sort » : les quatre côtés comptent.
  assert.equal(tientDansLaVue(boite(100, -1, 400, 300), ...V), false, 'dépasse en haut');
  assert.equal(tientDansLaVue(boite(-1, 50, 400, 300), ...V), false, 'dépasse à gauche');
  assert.equal(tientDansLaVue(boite(100, 600, 400, 201), ...V), false, 'dépasse en bas');
  assert.equal(tientDansLaVue(boite(700, 50, 301, 300), ...V), false, 'dépasse à droite');
});

test('★ autoplay — une zone plus haute que la vue ne peut jamais l’être', () => {
  // C'est voulu, et c'est le cas des petites fenêtres : si les commandes
  // dépassent, le spectateur ne les a pas sous les yeux, donc on ne démarre pas.
  assert.equal(tientDansLaVue(boite(0, 0, 400, 900), 1000, 800), false);
  assert.equal(tientDansLaVue(boite(0, -50, 400, 900), 1000, 800), false);
});

test('★ autoplay — une zone sans surface, ou une vue sans surface, ne compte pas', () => {
  assert.equal(tientDansLaVue(boite(10, 10, 0, 300), 1000, 800), false, 'largeur nulle');
  assert.equal(tientDansLaVue(boite(10, 10, 400, 0), 1000, 800), false, 'hauteur nulle');
  assert.equal(tientDansLaVue(boite(10, 10, 40, 30), 0, 0), false, 'pas encore de mise en page');
  assert.equal(tientDansLaVue(null, 1000, 800), false, 'pas de boîte du tout');
});

test('★ autoplay — la page fournit la condition, le moteur la consulte', () => {
  const page = lire('./pages/demonstration.js');
  const moteur = lire('../visuel/player.js');

  assert.match(page, /autoplayQuand:\s*\(\)\s*=>/,
    'la page ne fournit plus de condition d’autoplay');
  assert.match(page, /entierementVisible\(cadre\)/, 'la scène n’est plus contrôlée');
  assert.match(page, /entierementVisible\(transport\.element\)/, 'les commandes ne le sont plus');
  assert.match(moteur, /const quand = this\.options\.autoplayQuand;/,
    'le moteur ne consulte plus la condition');

  // ★ Le point qui compte : une condition qui REFUSE ne consomme pas
  // l'autoplay, sinon revenir sur l'onglet ne le rejouerait jamais. Le
  // mouvement réduit, lui, consomme — c'est un choix de l'utilisateur.
  const corps = moteur.slice(moteur.indexOf('_tryAutoplay()'));
  const refus = corps.indexOf('!quand()');
  const consomme = corps.indexOf('this.autoplayConsumed = true;\n    this.play();');
  assert.ok(refus > 0 && consomme > refus,
    'la condition doit être évaluée AVANT que l’autoplay soit consommé');
});
