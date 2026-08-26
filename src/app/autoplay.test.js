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

/* ══════════════════ LE RIDEAU DU REGISTRE SCÉNIQUE ═════════════════════════
   « En mode scénique, pour avoir le son activé par défaut, plutôt qu'un
   autoplay, estompe la scène initiale (façon arrière-plan de lightbox) et mets
   un gros bouton play devant, par-dessus la scène, pour que l'affordance soit
   maximale. En mode sobre, laisse l'autoplay. » (l'auteur)

   Ce qui se vérifie ici ne se voit pas en regardant la page : le TROC. On
   renonce à l'autoplay en scénique parce que c'est la seule façon d'avoir du
   son — le navigateur exige un geste —, et l'on garde l'autoplay en sobre
   parce qu'il n'y a rien à débloquer. Un jour, quelqu'un « corrigera »
   `autoplay: !scenique` en `autoplay: true` en croyant réparer un oubli. */

test('★ rideau — pas d’autoplay en SCÉNIQUE, autoplay conservé en SOBRE', () => {
  const page = lire('./pages/demonstration.js');
  assert.match(page, /autoplay:\s*!scenique/,
    'l’autoplay doit être refusé au seul registre scénique — c’est ce qui PERMET le son');
  assert.match(page, /const rideau = scenique \? construireRideau\(\) : null/,
    'le rideau doit être réservé au registre scénique');
});

test('★ rideau — le son part ACTIF, mais jamais contre un refus explicite', () => {
  const page = lire('./pages/demonstration.js');
  const reglages = lire('./reglages.js');

  // Le clic demande l'activation PAR DÉFAUT, pas l'activation.
  assert.match(page, /sonParDefautActif\(\)/, 'le clic sur lecture n’active plus le son');
  assert.doesNotMatch(page, /basculerSon\(\)/,
    'le rideau ne doit pas BASCULER le son : il le poserait à « coupé » chez qui l’avait actif');

  // Et l'activation par défaut se refuse dès que l'utilisateur s'est prononcé.
  assert.match(reglages, /export function sonParDefautActif\(\)\s*\{\s*if \(!sonTranche\(\)\)/,
    'l’activation par défaut ne consulte plus le choix de l’utilisateur');

  // ★ Le troisième état est ce qui rend la distinction possible : tant que le
  //   refus s'écrivait en EFFAÇANT la clé, « jamais demandé » et « refusé »
  //   étaient le même état sur le disque.
  assert.match(reglages, /magasin\.ecrire\(CLE_SON, suivant \? 'actif' : 'coupe'\)/,
    'le refus doit s’ÉCRIRE, sinon il est indiscernable d’une absence de choix');
  assert.match(reglages, /export const sonActif = \(\) => magasin\.lire\(CLE_SON\) === 'actif'/,
    'le défaut ne doit pas changer : l’absence de clé vaut toujours « coupé »');
});

test('★ rideau — un vrai bouton, un nom accessible, et RETIRÉ du DOM au clic', () => {
  const page = lire('./pages/demonstration.js');
  assert.match(page, /e\('button\.scene-jouer'/, 'le bouton de lecture doit être un vrai `<button>`');
  assert.match(page, /'aria-label': t\(/, 'le bouton n’a pas de nom accessible');
  // Masquer ne suffit pas : un voile caché reste un nœud que les technologies
  // d'assistance peuvent rencontrer, et un piège potentiel pour le focus.
  assert.match(page, /element\.remove\(\)/, 'le voile doit être RETIRÉ, pas masqué');
  assert.match(page, /cadre\.focus\(\{ preventScroll: true \}\)/,
    'le focus doit suivre ce qui disparaît, sinon il retombe sur `<body>`');
  // Aucun piège de focus : rien qui intercepte Tab ni ne renvoie le focus.
  assert.doesNotMatch(page, /keydown[\s\S]{0,200}Tab/,
    'un piège de focus s’est glissé dans le rideau');
});

test('★ rideau — la scène est estompée, et l’estompe part avec le voile', () => {
  const page = lire('./pages/demonstration.js');
  const css = readFileSync(resolve(ici, '../styles/pages.css'), 'utf8');
  assert.match(page, /classList\.add\('scene-cadre--rideau'\)/);
  assert.match(page, /classList\.remove\('scene-cadre--rideau'\)/,
    'l’estompe survivrait au voile : la démonstration se jouerait derrière un verre dépoli');
  // ★ L'estompe est le VOILE, pas un `filter` sur la scène. Une première
  //   rédaction assombrissait le `<svg>` PUIS le recouvrait : en thème clair,
  //   un fond pâle assombri sous un voile pâle donnait un cadre blanc — on ne
  //   « devinait » plus rien du tout. Un arrière-plan de lightbox est un voile,
  //   et ce n'en est jamais autre chose.
  assert.doesNotMatch(css, /\.scene-cadre--rideau \.scene \{ filter:/,
    'l’estompe ne doit pas être un filtre sur la scène : elle l’efface au lieu de la voiler');
  assert.match(css, /\.scene-cadre--rideau \.badge-transformation \{ opacity: 0; \}/,
    'le badge d’étape doit se taire sous le rideau : il annonce une étape que personne ne regarde');
  assert.match(css, /\.scene-voile \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/,
    'le voile ne couvre plus la scène');
});
