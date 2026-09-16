/**
 * ★ **LE LANCEUR DE LA SUITE LENTE, MIS À L'ÉPREUVE EN QUELQUES SECONDES.**
 *
 * `scripts/test-lent.mjs` promet trois choses qu'on ne peut pas vérifier en
 * regardant le code : qu'un rouge est rejoué SEUL, qu'un vert-seul est signalé
 * plutôt que caché, et qu'une reprise ne rejoue que ce qui manque. Les prouver
 * sur la vraie suite coûterait une heure de machine par essai.
 *
 * Ce fichier les prouve sur des tests jetables écrits dans un dossier temporaire
 * — dont un qui échoue toujours, un qui échoue **la première fois puis passe**
 * (le portrait exact des deux tests de temps qui rougissent sous charge), et un
 * qui se fait tuer en pleine course. Chaque cas tourne en quelques dixièmes de
 * seconde, et le lanceur est appelé par son vrai chemin de ligne de commande :
 * c'est bien le binaire livré qui est mesuré, pas une fonction approchante.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  decouvrir,
  formaterDuree,
  lireBilanTap,
  parallelismeParDefaut,
  testsEchoues,
  VAR_PARALLELISME,
} from './test-lent.mjs';

const LANCEUR = path.join(import.meta.dirname, 'test-lent.mjs');
const MOTIF = 'src/*/lents/*.test.js';

/** Un dossier temporaire jetable, avec la même forme que `src/…/lents/`. */
function atelier(fichiers) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'lanceur-lent-'));
  const lents = path.join(racine, 'src', 'faux', 'lents');
  fs.mkdirSync(lents, { recursive: true });
  for (const [nom, contenu] of Object.entries(fichiers)) {
    fs.writeFileSync(path.join(lents, nom), contenu);
  }
  return { racine, lents, ecrire: (nom, contenu) => fs.writeFileSync(path.join(lents, nom), contenu) };
}

/** Le lanceur, appelé comme la ligne de commande l'appelle. */
function lancer(racine, ...arguments_) {
  const r = spawnSync(
    process.execPath,
    [LANCEUR, `--racine=${racine}`, `--motif=${MOTIF}`, '--parallelisme=2', ...arguments_],
    { encoding: 'utf8' },
  );
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}

const VERT = `import test from 'node:test';\ntest('vert', () => {});\n`;
const TODO = `import test from 'node:test';\ntest('à faire', { todo: true }, () => {});\ntest('vert aussi', () => {});\n`;
const ROUGE = `import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('rouge pour de bon', () => assert.equal(1, 2));\n`;
const TUE = `import test from 'node:test';\nprocess.kill(process.pid, 'SIGKILL');\ntest('jamais atteint', () => {});\n`;

/**
 * Le portrait des deux tests de temps : rouge quand la machine est chargée,
 * vert quand on le laisse seul. Le témoin sur disque tient lieu de « charge ».
 */
const BASCULE = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const temoin = path.join(import.meta.dirname, 'bascule.temoin');
const premiere = !fs.existsSync(temoin);
fs.writeFileSync(temoin, 'vu');
test('rouge la première fois, vert ensuite', () => {
  assert.ok(!premiere, 'première exécution : je rougis, comme sous charge');
});
`;

// ───────────────────────────────────────────────────────────── découverte ──

test('découverte — les deux formes de dossier, triées, et rien d’autre', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'lanceur-decouverte-'));
  fs.mkdirSync(path.join(racine, 'src/b/lents'), { recursive: true });
  fs.mkdirSync(path.join(racine, 'src/a/tests/lents'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'src/b/lents/deux.test.js'), VERT);
  fs.writeFileSync(path.join(racine, 'src/a/tests/lents/un.test.js'), VERT);
  fs.writeFileSync(path.join(racine, 'src/b/lents/_aide.js'), VERT); // pas un test
  fs.writeFileSync(path.join(racine, 'src/b/rapide.test.js'), VERT); // pas lent

  assert.deepEqual(decouvrir(racine), ['src/a/tests/lents/un.test.js', 'src/b/lents/deux.test.js']);
  // le tri est la garantie que l'ordre ne dépend pas du système de fichiers
  assert.deepEqual(decouvrir(racine), [...decouvrir(racine)].sort());
  fs.rmSync(racine, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────── parallélisme ──

test('parallélisme — la moitié des cœurs, au moins un, et la variable a le dernier mot', () => {
  assert.equal(parallelismeParDefaut({}, 8), 4);
  assert.equal(parallelismeParDefaut({}, 7), 3);
  assert.equal(parallelismeParDefaut({}, 1), 1, 'jamais zéro voie');
  assert.equal(parallelismeParDefaut({ [VAR_PARALLELISME]: '3' }, 8), 3);
  assert.equal(parallelismeParDefaut({ [VAR_PARALLELISME]: '' }, 8), 4, 'vide = non renseigné');
});

test('parallélisme — une valeur absurde lève, elle ne se replie pas en silence', () => {
  for (const absurde of ['0', '-2', 'beaucoup', '2.5']) {
    assert.throws(
      () => parallelismeParDefaut({ [VAR_PARALLELISME]: absurde }, 8),
      /entier ≥ 1/,
      `« ${absurde} » aurait dû lever`,
    );
  }
});

// ───────────────────────────────────────────────────────────── lecture TAP ──

test('lecture TAP — les comptes du bilan, et null quand il n’y a pas de bilan', () => {
  const tap = [
    'TAP version 13',
    'not ok 1 - le test qui rougit',
    '1..1',
    '# tests 4',
    '# suites 0',
    '# pass 2',
    '# fail 1',
    '# cancelled 0',
    '# skipped 0',
    '# todo 1',
    '# duration_ms 1234.5',
  ].join('\n');
  const bilan = lireBilanTap(tap);
  assert.deepEqual(
    { tests: bilan.tests, pass: bilan.pass, fail: bilan.fail, todo: bilan.todo },
    { tests: 4, pass: 2, fail: 1, todo: 1 },
  );
  assert.equal(bilan.dureeTap, 1234.5);
  assert.deepEqual(testsEchoues(tap), ['le test qui rougit']);

  // Sortie tronquée : pas de verdict lisible, donc pas de verdict du tout.
  assert.equal(lireBilanTap('TAP version 13\nok 1 - coupé net\n'), null);
  assert.equal(lireBilanTap(''), null);
});

test('durées — lisibles d’un coup d’œil, à la française', () => {
  assert.equal(formaterDuree(16_200), '16,2 s');
  assert.equal(formaterDuree(242_000), '4 min 02 s');
  assert.equal(formaterDuree(3_840_000), '1 h 04 min');
});

// ──────────────────────────────────────────────────────── bout en bout ──

test('tout vert — code 0, comptes agrégés, et l’état de reprise s’efface', () => {
  const { racine } = atelier({ 'a.test.js': VERT, 'b.test.js': TODO });
  const { code, sortie } = lancer(racine);

  assert.equal(code, 0, sortie);
  assert.match(sortie, /2 exécutés, 2 verts, 0 en échec/);
  // trois tests écrits, mais `# pass` de TAP ne compte PAS le todo : 2 + 1 todo.
  assert.match(sortie, /2 réussis, 0 échoués, 1 todo/);
  assert.match(sortie, /départ +src\/faux\/lents\/a\.test\.js/, 'le départ est annoncé, pas seulement la fin');
  assert.match(sortie, /vert +src\/faux\/lents\/a\.test\.js/);
  assert.equal(
    fs.existsSync(path.join(racine, '.test-lent-etat.json')),
    false,
    'rien à reprendre après un vert complet',
  );
  fs.rmSync(racine, { recursive: true, force: true });
});

test('relance ciblée — rouge sous charge, vert seul : compté vert, mais SIGNALÉ', () => {
  const { racine } = atelier({ 'bascule.test.js': BASCULE, 'a.test.js': VERT });
  const { code, sortie } = lancer(racine);

  assert.equal(code, 0, sortie);
  assert.match(sortie, /ROUGE +src\/faux\/lents\/bascule\.test\.js/, 'rouge à la première passe');
  assert.match(sortie, /Relance seule de 1 fichier rouge/);
  assert.match(sortie, /VERT SEUL +src\/faux\/lents\/bascule\.test\.js/);
  assert.match(sortie, /signalés +1 vert seul, rouge sous charge/);
  assert.match(sortie, /bascule\.test\.js/);
  fs.rmSync(racine, { recursive: true, force: true });
});

test('vrai échec — rouge même seul : code 1, et la sortie complète est déversée', () => {
  const { racine } = atelier({ 'rouge.test.js': ROUGE, 'a.test.js': VERT });
  const { code, sortie } = lancer(racine);

  assert.equal(code, 1);
  assert.match(sortie, /ÉCHEC +src\/faux\/lents\/rouge\.test\.js/);
  assert.match(sortie, /ÉCHECS +1, rouges même seuls/);
  assert.match(sortie, /rouge pour de bon/, 'le nom du test fautif est dit');
  assert.match(sortie, /1 réussis, 1 échoués/, 'le fichier vert compte encore dans le bilan');
  fs.rmSync(racine, { recursive: true, force: true });
});

test('plantage brutal — un processus tué n’est jamais compté vert', () => {
  const { racine } = atelier({ 'tue.test.js': TUE });
  const { code, sortie } = lancer(racine);

  assert.equal(code, 1, sortie);
  assert.match(sortie, /ÉCHECS +1/);
  assert.doesNotMatch(sortie, /0 en échec/);
  fs.rmSync(racine, { recursive: true, force: true });
});

test('reprise — sur demande, seuls les fichiers non verts sont rejoués', () => {
  const { racine, ecrire } = atelier({ 'rouge.test.js': ROUGE, 'a.test.js': VERT, 'b.test.js': VERT });

  const premiere = lancer(racine);
  assert.equal(premiere.code, 1, premiere.sortie);
  const etat = JSON.parse(fs.readFileSync(path.join(racine, '.test-lent-etat.json'), 'utf8'));
  assert.deepEqual(Object.keys(etat.verts).sort(), ['src/faux/lents/a.test.js', 'src/faux/lents/b.test.js']);

  // on répare, puis on reprend : les deux verts ne doivent PAS repasser
  ecrire('rouge.test.js', VERT);
  const reprise = lancer(racine, '--reprise');
  assert.equal(reprise.code, 0, reprise.sortie);
  assert.match(reprise.sortie, /reprise : 2 fichiers déjà verts/);
  assert.match(reprise.sortie, /départ +src\/faux\/lents\/rouge\.test\.js/);
  assert.doesNotMatch(reprise.sortie, /départ +src\/faux\/lents\/a\.test\.js/, 'a.test.js était déjà vert');
  assert.match(reprise.sortie, /1 exécuté, 1 vert, 0 en échec \(\+ 2 repris\)/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('reprise — non demandée, tout repart de zéro : elle ne s’invite jamais', () => {
  const { racine, ecrire } = atelier({ 'rouge.test.js': ROUGE, 'a.test.js': VERT });

  assert.equal(lancer(racine).code, 1);
  assert.ok(fs.existsSync(path.join(racine, '.test-lent-etat.json')), "l'état est bien là");

  ecrire('rouge.test.js', VERT);
  const seconde = lancer(racine); // sans --reprise
  assert.equal(seconde.code, 0, seconde.sortie);
  assert.match(seconde.sortie, /départ +src\/faux\/lents\/a\.test\.js/, 'le vert connu est rejoué quand même');
  assert.match(seconde.sortie, /2 exécutés, 2 verts/);
  assert.doesNotMatch(seconde.sortie, /repris/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('aucun fichier trouvé — c’est un échec, pas un succès vide', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'lanceur-vide-'));
  const { code, sortie } = lancer(racine);
  assert.equal(code, 1);
  assert.match(sortie, /Aucun fichier de test lent trouvé/);
  fs.rmSync(racine, { recursive: true, force: true });
});

test('chemin accentué — le lanceur s’exécute, au lieu de sortir à 0 sans rien faire', () => {
  // `new URL(import.meta.url).pathname` rendrait « mon dépôt à moi » sous forme
  // percent-encodée : la détection du module principal échouerait, et la
  // commande sortirait à 0 SANS AVOIR RIEN LANCÉ. Le dépôt d'ici est en ASCII,
  // donc ce test ne parle pas de notre clone — il parle de celui de demain.
  const abri = fs.mkdtempSync(path.join(os.tmpdir(), 'lanceur-accent-'));
  const loge = path.join(abri, 'mon dépôt à moi');
  fs.mkdirSync(loge);
  const copie = path.join(loge, 'test-lent.mjs');
  fs.copyFileSync(LANCEUR, copie);

  const { racine } = atelier({ 'a.test.js': VERT });
  const r = spawnSync(
    process.execPath,
    [copie, `--racine=${racine}`, `--motif=${MOTIF}`, '--parallelisme=1'],
    { encoding: 'utf8' },
  );
  const sortie = `${r.stdout}${r.stderr}`;
  assert.match(sortie, /1 exécuté, 1 vert/, `rien n’a été lancé depuis « ${loge} » : ${sortie}`);
  assert.equal(r.status, 0, sortie);

  fs.rmSync(abri, { recursive: true, force: true });
  fs.rmSync(racine, { recursive: true, force: true });
});

test('découverte — `*` ne traverse pas les dossiers, et un chemin exact est un motif', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'lanceur-motifs-'));
  fs.mkdirSync(path.join(racine, 'src/a/lents/encore'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'src/a/lents/un.test.js'), VERT);
  fs.writeFileSync(path.join(racine, 'src/a/lents/encore/deux.test.js'), VERT);

  assert.deepEqual(
    decouvrir(racine, ['src/*/lents/*.test.js']),
    ['src/a/lents/un.test.js'],
    '`*` s’arrête au séparateur : le fichier du sous-dossier n’entre pas',
  );
  assert.deepEqual(decouvrir(racine, ['src/a/lents/encore/deux.test.js']), [
    'src/a/lents/encore/deux.test.js',
  ], 'un chemin littéral est un motif valide — c’est ce que --motif reçoit souvent');
  assert.deepEqual(decouvrir(racine, ['src/a/lents/encore']), [], 'un dossier n’est pas un fichier de test');
  assert.deepEqual(decouvrir(racine, ['src/*/absent/*.test.js']), [], 'un motif sans correspondance ne lève pas');

  fs.rmSync(racine, { recursive: true, force: true });
});

test('reprise — une reprise complète et verte efface l’état qu’elle vient d’épuiser', () => {
  const { racine, ecrire } = atelier({ 'rouge.test.js': ROUGE, 'a.test.js': VERT });
  const etat = path.join(racine, '.test-lent-etat.json');

  assert.equal(lancer(racine).code, 1);
  assert.ok(fs.existsSync(etat), "l'état retient le vert du premier passage");

  ecrire('rouge.test.js', VERT);
  const reprise = lancer(racine, '--reprise');
  assert.equal(reprise.code, 0, reprise.sortie);
  assert.equal(fs.existsSync(etat), false, 'tout est vert : il n’y a plus rien à reprendre');

  // et la reprise suivante rejoue tout, au lieu de rendre « vert sur zéro fichier »
  const encore = lancer(racine, '--reprise');
  assert.equal(encore.code, 0, encore.sortie);
  assert.match(encore.sortie, /2 exécutés, 2 verts/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('reprise — un état qui couvre déjà tout ne vaut pas succès : rien n’a été exécuté', () => {
  const { racine } = atelier({ 'rouge.test.js': ROUGE, 'a.test.js': VERT });
  assert.equal(lancer(racine).code, 1);

  // le fichier rouge disparaît : l'état couvre alors la totalité de ce qui reste
  fs.rmSync(path.join(racine, 'src/faux/lents/rouge.test.js'));
  const r = lancer(racine, '--reprise');

  assert.equal(r.code, 1, r.sortie);
  assert.match(r.sortie, /tous déjà verts/);
  assert.match(r.sortie, /pas un succès/);

  fs.rmSync(racine, { recursive: true, force: true });
});
