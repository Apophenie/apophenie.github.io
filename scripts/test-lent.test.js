/**
 * ★ **LE LANCEUR DE LA SUITE LENTE, MIS À L'ÉPREUVE EN QUELQUES SECONDES.**
 *
 * `scripts/test-lent.mjs` promet des choses qu'on ne peut pas vérifier en
 * regardant le code : qu'un rouge est rejoué SEUL, qu'un vert-seul est signalé
 * plutôt que caché, qu'un blocage devient rouge au lieu d'une heure de silence,
 * et qu'une reprise ne rejoue que ce qui manque. Les prouver sur la vraie suite
 * coûterait une heure de machine par essai.
 *
 * Ce fichier les prouve sur des tests jetables écrits dans un dossier temporaire
 * — dont un qui échoue toujours, un qui échoue **la première fois puis passe**,
 * un qui **dort interminablement la première fois puis rend la main**, et un qui
 * se fait tuer en pleine course. Chaque cas tourne en quelques secondes au plus,
 * et le lanceur est appelé par son vrai chemin de ligne de commande : c'est bien
 * le binaire livré qui est mesuré, pas une fonction approchante.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ANCIENS_REGLAGES,
  budgetsDeGarde,
  chargerDurees,
  compteursStat,
  CPU_INCONNU_DEFAUT,
  cpuArbreJiffies,
  cpuEnfantsMoissonnes,
  decouvrir,
  FACTEUR_CPU_DEFAUT,
  FACTEUR_MUR_DEFAUT,
  FICHIER_DUREES,
  formaterDuree,
  jiffiesParSeconde,
  lancerSuiteLente,
  lireBilanTap,
  lireTimes,
  METRIQUE,
  MUR_INCONNU_DEFAUT,
  ordonnerParDuree,
  parallelismeParDefaut,
  PLANCHER_CPU_DEFAUT,
  PLANCHER_MUR_DEFAUT,
  referenceDe,
  reglagesGarde,
  sonderCpu,
  testsEchoues,
  testsTermines,
  VAR_CPU_INCONNU,
  VAR_FACTEUR_CPU,
  VAR_FACTEUR_MUR,
  VAR_MUR_INCONNU,
  VAR_PARALLELISME,
  VAR_PLANCHER_CPU,
  VAR_PLANCHER_MUR,
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
 * Le portrait de `recherche.test.js` — le SEUL fichier que la mesure du
 * 16 septembre a montré réellement sensible à la charge : rouge quand la machine
 * est chargée, vert quand on le laisse seul. `progression.test.js`, longtemps
 * soupçonné du même travers, est passé du premier coup ce jour-là.
 *
 * Le témoin sur disque tient lieu de « charge ».
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

// ──────────────────────────────────────────────────────── délai de garde ──

/** Dort dix secondes : le portrait d'un fichier qui ne rendra jamais la main. */
const DORT = `import test from 'node:test';
test('je dors sans fin', async () => { await new Promise((r) => setTimeout(r, 10_000)); });
`;

/**
 * Dort la PREMIÈRE fois seulement — un blocage qui se dénoue quand la machine
 * se vide. C'est le cas que le garde doit convertir en rouge, puis que la
 * relance seule doit sauver.
 */
const DORT_UNE_FOIS = `import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
const temoin = path.join(import.meta.dirname, 'dort.temoin');
const premiere = !fs.existsSync(temoin);
fs.writeFileSync(temoin, 'vu');
test('interminable sous charge, instantané seul', async () => {
  if (premiere) await new Promise((r) => setTimeout(r, 10_000));
});
`;

/** Une seconde et demie : assez pour qu'un silence se fasse entendre. */
const DORT_UN_PEU = `import test from 'node:test';
test('je dors un peu', async () => { await new Promise((r) => setTimeout(r, 1500)); });
`;

const REGLAGES = {
  facteurCpu: 4,
  plancherCpu: 180,
  cpuInconnu: 5400,
  facteurMur: 8,
  plancherMur: 300,
  murInconnu: 7200,
};

test('les deux budgets — proportionnés au fichier, avec planchers, et généreux sans référence', () => {
  const table = {
    durees: {
      'court.test.js': { cpuSecondes: 20, murSecondes: 26 },
      'long.test.js': { cpuSecondes: 700, murSecondes: 1011, le: '2026-09-17' },
      'mural-seul.test.js': { murSecondes: 300 },
    },
  };

  assert.equal(budgetsDeGarde('court.test.js', table, REGLAGES).cpu, 180_000, '4 × 20 s passe sous le plancher CPU');
  assert.equal(budgetsDeGarde('court.test.js', table, REGLAGES).mur, 300_000, '8 × 26 s passe sous le plancher mural');
  assert.equal(budgetsDeGarde('long.test.js', table, REGLAGES).cpu, 4 * 700 * 1000);
  assert.equal(budgetsDeGarde('long.test.js', table, REGLAGES).mur, 8 * 1011 * 1000);

  // La borne murale doit rester HORS D'ATTEINTE d'un fichier sain : c'est un
  // filet, pas un budget. Sur toute entrée complète, elle est plus large que la
  // borne CPU — sans quoi elle parlerait la première et masquerait le vrai
  // diagnostic, qui est « ce fichier travaille trop », pas « il attend ».
  for (const nom of ['court.test.js', 'long.test.js']) {
    const b = budgetsDeGarde(nom, table, REGLAGES);
    assert.ok(b.mur > b.cpu, `${nom} : le filet mural doit être plus large que le budget CPU`);
  }

  // Une entrée qui n'a QUE du mur n'a aucun budget de travail : le CPU retombe
  // au cas inconnu, et c'est l'état d'une table fraîchement migrée.
  const migre = budgetsDeGarde('mural-seul.test.js', table, REGLAGES);
  assert.equal(migre.cpu, 5_400_000, 'sans référence CPU, le cas le plus généreux');
  assert.equal(migre.mur, 8 * 300 * 1000, 'sa référence murale, elle, est bien là');

  const inconnu = budgetsDeGarde('jamais-vu.test.js', table, REGLAGES);
  assert.deepEqual([inconnu.cpu, inconnu.mur], [5_400_000, 7_200_000], 'on ne tue pas ce qu’on ne connaît pas');

  assert.equal(referenceDe(table, 'long.test.js', 'cpu'), 700);
  assert.equal(referenceDe(table, 'long.test.js', 'mur'), 1011);
  assert.equal(referenceDe(table, 'long.test.js'), 700, 'le CPU est la nature par défaut : c’est la référence de coût');
  assert.equal(referenceDe(table, 'jamais-vu.test.js', 'mur'), null);
  assert.throws(() => referenceDe(table, 'long.test.js', 'lunaire'), /nature de référence inconnue/);

  assert.deepEqual(
    [FACTEUR_CPU_DEFAUT, PLANCHER_CPU_DEFAUT, CPU_INCONNU_DEFAUT],
    [4, 180, 5400],
    'les défauts CPU livrés',
  );
  assert.deepEqual(
    [FACTEUR_MUR_DEFAUT, PLANCHER_MUR_DEFAUT, MUR_INCONNU_DEFAUT],
    [8, 300, 7200],
    'le filet mural est partout plus large que le budget CPU',
  );
  assert.ok(FACTEUR_MUR_DEFAUT > FACTEUR_CPU_DEFAUT, 'un filet plus serré que le budget ne filtrerait rien');
});

test('référence — la forme d’AVANT la séparation n’est lue que comme du mur', () => {
  // Ces deux formes-là viennent de la table d'avant : elles portaient du temps
  // ÉCOULÉ. Les relire comme du CPU inventerait une mesure jamais prise, et
  // donnerait un budget de travail fondé sur la charge d'un jour de septembre.
  const ancienne = { durees: { 'nu.test.js': 20, 'objet.test.js': { secondes: 1011, le: '2026-09-16' } } };
  for (const nom of ['nu.test.js', 'objet.test.js']) {
    assert.equal(referenceDe(ancienne, nom, 'cpu'), null, `${nom} : aucun CPU n’a jamais été mesuré ici`);
    assert.ok(referenceDe(ancienne, nom, 'mur') > 0, `${nom} : mais son mur, lui, est lisible`);
  }
  assert.equal(budgetsDeGarde('nu.test.js', ancienne, REGLAGES).cpu, 5_400_000, 'donc le cas inconnu, en CPU');
  assert.equal(budgetsDeGarde('nu.test.js', ancienne, REGLAGES).mur, 300_000, 'et son plancher mural');
});

test('réglages des gardes — l’environnement a le dernier mot, et l’absurde lève', () => {
  assert.deepEqual(reglagesGarde({}), REGLAGES);
  assert.equal(reglagesGarde({ [VAR_FACTEUR_CPU]: '6' }).facteurCpu, 6);
  assert.equal(reglagesGarde({ [VAR_PLANCHER_CPU]: '30' }).plancherCpu, 30);
  assert.equal(reglagesGarde({ [VAR_CPU_INCONNU]: '600' }).cpuInconnu, 600);
  assert.equal(reglagesGarde({ [VAR_FACTEUR_MUR]: '16' }).facteurMur, 16, 'le réglage d’un runner lent');
  assert.equal(reglagesGarde({ [VAR_PLANCHER_MUR]: '60' }).plancherMur, 60);
  assert.equal(reglagesGarde({ [VAR_MUR_INCONNU]: '900' }).murInconnu, 900);

  // un facteur sous 1 donnerait un budget plus court que la référence
  assert.throws(() => reglagesGarde({ [VAR_FACTEUR_CPU]: '0.5' }), /≥ 1/);
  assert.throws(() => reglagesGarde({ [VAR_FACTEUR_MUR]: '0.5' }), /≥ 1/);
  assert.throws(() => reglagesGarde({ [VAR_PLANCHER_CPU]: '-1' }), /≥ 0/);
  assert.throws(() => reglagesGarde({ [VAR_MUR_INCONNU]: 'beaucoup' }), /≥ 1/);
});

test('anciens noms — honorés, mais JAMAIS en silence', () => {
  // Les deux CI documentent encore `TEST_LENT_FACTEUR_DELAI=8`. Les ignorer
  // ferait croire à un réglage qui n'a pas lieu ; les appliquer sans le dire
  // ferait croire qu'on règle une borne alors qu'on en règle deux.
  const dits = [];
  const r = reglagesGarde({ TEST_LENT_FACTEUR_DELAI: '8' }, (t) => dits.push(t));
  assert.equal(r.facteurCpu, 8, 'une machine lente l’est pour les deux : le CPU suit la vitesse du processeur');
  assert.equal(r.facteurMur, 8);
  assert.equal(dits.length, 1, 'un ancien nom, une ligne');
  assert.match(dits[0], /TEST_LENT_FACTEUR_DELAI=8/);
  assert.match(dits[0], new RegExp(VAR_FACTEUR_CPU));
  assert.match(dits[0], new RegExp(VAR_FACTEUR_MUR));

  // Les deux autres étaient muraux de naissance et le restent.
  const muraux = [];
  const m = reglagesGarde({ TEST_LENT_PLANCHER_DELAI: '30', TEST_LENT_DELAI_INCONNU: '600' }, (t) => muraux.push(t));
  assert.deepEqual([m.plancherMur, m.murInconnu], [30, 600]);
  assert.deepEqual([m.plancherCpu, m.cpuInconnu], [180, 5400], 'ils ne débordent pas sur le CPU');
  assert.equal(muraux.length, 2);

  // Le nom précis gagne sur l'ancien nom fourre-tout, et la ligne le dit.
  const conflit = [];
  const c = reglagesGarde({ TEST_LENT_FACTEUR_DELAI: '8', [VAR_FACTEUR_CPU]: '2' }, (t) => conflit.push(t));
  assert.equal(c.facteurCpu, 2, 'le nom précis a le dernier mot');
  assert.equal(c.facteurMur, 8, 'et l’ancien couvre ce que personne n’a nommé');
  assert.match(conflit[0], new RegExp(VAR_FACTEUR_MUR));

  assert.deepEqual(
    ANCIENS_REGLAGES.map((a) => a.nom),
    ['TEST_LENT_FACTEUR_DELAI', 'TEST_LENT_PLANCHER_DELAI', 'TEST_LENT_DELAI_INCONNU'],
  );
});

test('ordre de lancement — sur le CPU, les plus longs d’abord, les inconnus en tête', () => {
  const table = {
    durees: {
      'b.test.js': { cpuSecondes: 100, murSecondes: 400 },
      'c.test.js': { cpuSecondes: 10, murSecondes: 900 },
      'd.test.js': { cpuSecondes: 100, murSecondes: 120 },
    },
  };
  const fichiers = ['a.test.js', 'b.test.js', 'c.test.js', 'd.test.js'];

  assert.deepEqual(
    ordonnerParDuree(fichiers, table),
    ['a.test.js', 'b.test.js', 'd.test.js', 'c.test.js'],
    'inconnu en tête, puis 100, 100 départagés par le chemin, puis 10 — c’est le CPU qui classe, pas le mur',
  );

  // Une table fraîchement migrée n'a QUE du mur : le tri s'en sert plutôt que
  // de renvoyer tout le monde à égalité. Ce n'est qu'une heuristique
  // d'occupation de voie — les deux natures ne se mélangent jamais ailleurs.
  const migree = { durees: { 'court.test.js': { murSecondes: 10 }, 'long.test.js': { murSecondes: 900 } } };
  assert.deepEqual(
    ordonnerParDuree(['court.test.js', 'long.test.js'], migree),
    ['long.test.js', 'court.test.js'],
    'faute de CPU, le mur classe encore — mieux que l’ordre alphabétique',
  );
  assert.deepEqual(
    fichiers,
    ['a.test.js', 'b.test.js', 'c.test.js', 'd.test.js'],
    'la liste d’origine n’est pas touchée — le bilan s’en sert encore, trié par chemin',
  );
});

test('ordre de lancement — le plus long part vraiment en premier, jusque dans le journal', () => {
  const { racine } = atelier({ 'court.test.js': VERT, 'long.test.js': VERT });
  const durees = path.join(racine, 'durees.json');
  fs.writeFileSync(
    durees,
    JSON.stringify({
      durees: {
        'src/faux/lents/long.test.js': { cpuSecondes: 900, murSecondes: 900 },
        'src/faux/lents/court.test.js': { cpuSecondes: 1, murSecondes: 1 },
      },
    }),
  );

  const { code, sortie } = lancer(racine, `--durees=${durees}`);
  assert.equal(code, 0, sortie);
  const ordre = [...sortie.matchAll(/départ {3}(\S+)/g)].map((m) => m[1]);
  assert.deepEqual(ordre, ['src/faux/lents/long.test.js', 'src/faux/lents/court.test.js']);
  // et le bilan, lui, reste trié par chemin
  assert.match(sortie, /2 exécutés, 2 verts/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('tests terminés — comptés dans une sortie TAP encore en cours', () => {
  const enCours = 'TAP version 13\n# Subtest: un\nok 1 - un\n# Subtest: deux\nnot ok 2 - deux\n# Subtest: trois\n';
  assert.equal(testsTermines(enCours), 2, 'le troisième a démarré, il n’a pas rendu son verdict');
  assert.equal(testsTermines(''), 0);
});

test('garde murale — un dépassement part en relance seule, et y passe : vert seul', () => {
  const { racine } = atelier({ 'dort.test.js': DORT_UNE_FOIS });
  // Un dormeur ne brûle RIEN : seule la borne murale peut le couper, et c'est
  // pour ce cas-là qu'elle existe. On laisse donc le budget CPU au large.
  const { code, sortie } = lancer(racine, '--plancher-mur=0', '--mur-inconnu=2');

  assert.equal(code, 0, sortie);
  assert.match(sortie, /ROUGE +src\/faux\/lents\/dort\.test\.js/, 'le blocage devient rouge');
  assert.match(sortie, /dépassement du délai de garde mural/);
  assert.match(sortie, /tests terminés avant le dépassement/, 'on dit où il en était');
  assert.match(sortie, /VERT SEUL +src\/faux\/lents\/dort\.test\.js/);
  assert.match(sortie, /signalés +1 vert seul, rouge sous charge/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('garde murale — un blocage qui ne se dénoue pas reste un échec, et accuse la machine', () => {
  const { racine } = atelier({ 'dort.test.js': DORT });
  const { code, sortie } = lancer(racine, '--plancher-mur=0', '--mur-inconnu=2');

  assert.equal(code, 1, sortie);
  assert.match(sortie, /ÉCHEC +src\/faux\/lents\/dort\.test\.js/);
  assert.match(sortie, /ÉCHECS +1, rouges même seuls/);
  assert.match(sortie, /dépassement du délai de garde mural/);
  // Et il dit POURQUOI c'est la machine : le mur a sauté sans que le CPU suive.
  assert.match(sortie, /n’a brûlé que .* de CPU — une attente, pas du travail/);
  // quand TOUS les échecs sont des dépassements muraux, le bilan désigne la machine
  assert.match(sortie, /signe de machine lente/);
  assert.match(sortie, new RegExp(VAR_FACTEUR_MUR));
  assert.doesNotMatch(sortie, /dépassement du budget CPU/, 'un dormeur ne dépasse aucun budget de travail');

  fs.rmSync(racine, { recursive: true, force: true });
});

test('ligne de vie — le silence est rompu par ce qui est encore en vol', async () => {
  const { racine } = atelier({ 'dort.test.js': DORT_UN_PEU });
  let sortie = '';

  const { code } = await lancerSuiteLente({
    racine,
    motifs: [MOTIF],
    parallelisme: 1,
    sansGarde: true,
    intervalleVie: 300, // une minute en vrai ; trois dixièmes de seconde ici
    cheminEtat: path.join(racine, 'etat.json'),
    cheminDurees: path.join(racine, 'durees-absentes.json'),
    ecrire: (t) => {
      sortie += t;
    },
  });

  assert.equal(code, 0, sortie);
  assert.match(sortie, /en vol +src\/faux\/lents\/dort\.test\.js/, 'rien n’a été dit pendant l’attente');
  assert.match(sortie, /tests? faits?/, 'la ligne de vie dit où en est le fichier');
  assert.match(sortie, /budget sans garde/);

  fs.rmSync(racine, { recursive: true, force: true });
});

test('table des durées — elle ne nomme que des fichiers réels, et dit d’où viennent ses chiffres', () => {
  const depot = path.join(import.meta.dirname, '..');
  const table = chargerDurees(path.join(depot, FICHIER_DUREES));
  const noms = Object.keys(table.durees);

  assert.ok(noms.length > 0, 'la table de référence livrée est vide');
  for (const nom of noms) {
    assert.ok(fs.existsSync(path.join(depot, nom)), `la table nomme ${nom}, qui n’existe plus`);
    const cpu = referenceDe(table, nom, 'cpu');
    const mur = referenceDe(table, nom, 'mur');
    assert.ok(cpu > 0 || mur > 0, `${nom} n’a aucune référence utilisable, ni CPU ni murale`);
  }

  // ★ La table DIT en quoi ses nombres sont libellés, en toutes lettres.
  //
  // Sans ce champ, on retombe sur la convention tacite — et c'est elle qui a
  // permis, des semaines durant, de compenser à la main une inflation de charge
  // qu'on prenait pour une fatalité de la mesure plutôt que pour le symptôme
  // d'une métrique mal choisie.
  assert.equal(typeof table.metrique, 'string', 'la table ne dit pas la nature de ses nombres');
  assert.match(table.metrique, /cpuSecondes/);
  assert.match(table.metrique, /murSecondes/);
  assert.equal(table.metrique, METRIQUE, 'la table livrée doit porter la métrique du lanceur qui la relit');

  // Sans provenance, personne ne peut juger si ces chiffres valent pour SA
  // machine. On n'exige que ce qu'un relevé automatique sait produire : exiger
  // ici `machine`, que seul un humain peut écrire, ferait rougir la suite à la
  // première régénération de la table.
  for (const cle of ['le', 'coeurs', 'voies', 'chargeMoyenne']) {
    assert.ok(cle in table.conditions, `la table ne dit pas « ${cle} » de son relevé`);
  }
});

test('relevé des durées — il écrit ce qu’il mesure, jamais une consigne à remplir', () => {
  const { racine } = atelier({ 'a.test.js': VERT, 'b.test.js': VERT });
  const durees = path.join(racine, 'durees.json');

  const { code, sortie } = lancer(racine, '--releve-durees', `--durees=${durees}`);
  assert.equal(code, 0, sortie);
  assert.match(sortie, /Relevé écrit dans/);

  const table = JSON.parse(fs.readFileSync(durees, 'utf8'));
  assert.deepEqual(Object.keys(table.durees).sort(), [
    'src/faux/lents/a.test.js',
    'src/faux/lents/b.test.js',
  ]);
  for (const cle of ['le', 'coeurs', 'voies', 'passe', 'relevesDeCharge', 'cpuReleve', 'cpuSource', 'gardeCpu']) {
    assert.ok(cle in table.conditions, `le relevé ne dit pas « ${cle} »`);
  }
  // Les nombres sont NOMMÉS, et la métrique est écrite avant eux.
  assert.equal(table.metrique, METRIQUE);
  assert.deepEqual(Object.keys(table).slice(0, 2), ['metrique', 'conditions'], 'l’unité se lit avant les chiffres');
  for (const entree of Object.values(table.durees)) {
    assert.ok(entree.murSecondes > 0, 'chaque entrée porte son temps écoulé');
    assert.ok(entree.cpuSecondes > 0, 'et son temps CPU, puisque cette machine sait le lire');
    assert.ok(!('secondes' in entree), 'plus aucun nombre dont on doive deviner l’unité');
  }
  assert.ok(
    !('machine' in table.conditions),
    'le lanceur ne prétend pas savoir si la machine était chargée : il se tait',
  );
  // La table dit elle-même d'où viennent ses durées — passe 1, pas les relances.
  assert.match(table.conditions.passe, /première/);

  // Aucune valeur ne doit être une invite déguisée en information.
  for (const [cle, valeur] of Object.entries(table.conditions)) {
    if (typeof valeur !== 'string') continue;
    assert.doesNotMatch(
      valeur,
      /décrivez|remplissez|renseignez|à compléter|ici l’état|ici l'état/i,
      `conditions.${cle} est une consigne, pas une information`,
    );
  }

  fs.rmSync(racine, { recursive: true, force: true });
});

test('relevé des durées — une passe rouge n’écrit rien : ces durées ne décriraient rien de sain', () => {
  const { racine } = atelier({ 'a.test.js': VERT, 'rouge.test.js': ROUGE });
  const durees = path.join(racine, 'durees.json');

  const { code, sortie } = lancer(racine, '--releve-durees', `--durees=${durees}`);
  assert.equal(code, 1);
  assert.match(sortie, /Relevé NON écrit/);
  assert.equal(fs.existsSync(durees), false, 'rien ne doit être écrit après une passe rouge');

  fs.rmSync(racine, { recursive: true, force: true });
});

test('tests terminés — les sous-tests indentés comptent aussi', () => {
  const imbrique = [
    'TAP version 13',
    '# Subtest: le parent',
    '    # Subtest: le petit',
    '    ok 1 - le petit',
    '    1..1',
    'ok 1 - le parent',
    '# Subtest: celui qui court encore',
  ].join('\n');

  // Sans l'indentation, un fichier en `describe` affichait « 0 tests faits »
  // jusqu'à sa toute dernière seconde — sur le plus long, une demi-heure.
  assert.equal(testsTermines(imbrique), 2);
  assert.equal(testsTermines('    not ok 3 - un échec imbriqué\n'), 1);
});

// ──────────────────────────────────────────────── la mesure du temps CPU ──

test('lecture de /proc — les compteurs, même sous un nom à parenthèses', () => {
  const stat = '1234 (mon (drôle) de programme) S 1 1 1 0 -1 4194304 126 0 0 0 11 22 33 44 12 -8 1 0 45111954';
  assert.deepEqual(compteursStat(stat), { utime: 11, stime: 22, cutime: 33, cstime: 44 });
  // Découper par la PREMIÈRE parenthèse casserait sur ce nom-là. Le format de
  // `/proc/<pid>/stat` n'est déchiffrable qu'en partant de la dernière.
  assert.equal(compteursStat('pas une ligne de stat'), null);
  assert.equal(compteursStat(null), null);
  assert.equal(compteursStat(''), null);
});

test('CPU d’un arbre — la descendance compte, et un pid absent rend null, jamais zéro', () => {
  const jiffies = cpuArbreJiffies(process.pid);
  assert.ok(Number.isFinite(jiffies) && jiffies >= 0, 'la lecture de son propre arbre doit aboutir');

  // Zéro serait un chiffre ; null est un aveu. Rendre zéro ferait passer un
  // processus illisible pour un processus qui n'a rien consommé.
  assert.equal(cpuArbreJiffies(2 ** 30), null, 'un pid qui n’existe pas');
  assert.equal(cpuArbreJiffies(process.pid, '/il-ny-a-pas-de-proc'), null, 'pas de /proc du tout');

  // Un enfant qui brûle doit faire grossir le compte de son parent — c'est
  // `cutime`/`cstime`, et c'est ce qui permet de ne pas perdre une descendance
  // déjà moissonnée entre deux échantillons. Travail BORNÉ, pas une attente :
  // une boucle à l'horloge brûlerait moins de CPU sous charge, et ce test
  // rougirait sur une machine occupée sans rien dire de vrai.
  const avant = cpuArbreJiffies(process.pid);
  spawnSync(process.execPath, ['-e', 'let x = 0; for (let i = 0; i < 5e7; i++) x += Math.sqrt(i); process.exitCode = x > 0 ? 0 : 1;']);
  const apres = cpuArbreJiffies(process.pid);
  assert.ok(apres - avant > 10, `l’enfant moissonné doit peser : ${avant} → ${apres} jiffies`);
});

test('jiffies — la cadence vient du système, elle n’est pas supposée', () => {
  const tictac = jiffiesParSeconde();
  assert.ok(Number.isInteger(tictac) && tictac > 0);
  // 100 sur toutes les machines Linux courantes — mais c'est `getconf CLK_TCK`
  // qui le dit. Coder 100 en dur passerait inaperçu jusqu'au jour où ce serait
  // faux, et se paierait alors d'un facteur inconnu sur tous les budgets.
  const dit = spawnSync('getconf', ['CLK_TCK'], { encoding: 'utf8' });
  if (dit.status === 0) assert.equal(tictac, Number(dit.stdout.trim()));
});

test('times — les deux dernières lignes, et ce sont celles des ENFANTS', () => {
  assert.equal(lireTimes('0m0.000000s 0m0.000000s\n0m1.230000s 0m0.450000s\n'), 1.68, 'dash, six décimales');
  assert.equal(lireTimes('0m0.004s 0m0.003s\n2m1.500s 0m0.500s\n'), 122, 'bash, trois décimales, minutes comprises');
  assert.equal(lireTimes(''), null);
  assert.equal(lireTimes(null), null);
  assert.equal(lireTimes('0m0.0s 0m0.0s\n'), null, 'une seule ligne ne dit rien des enfants');
  // Le piège du shell a pu écrire un relevé, puis la sortie normale un second :
  // c'est le DERNIER qui décrit tout ce qui a tourné.
  assert.equal(lireTimes('0m0.0s 0m0.0s\n0m1.0s 0m0.0s\n0m0.0s 0m0.0s\n0m9.0s 0m1.0s\n'), 10);
});

test('sonde CPU — absente, elle le DIT, et ne rend jamais un chiffre muet', () => {
  const vraie = sonderCpu();
  assert.equal(vraie.disponible, true, 'cette suite tourne sous Linux : /proc doit être là');
  assert.match(vraie.raison, /jiffies/);
  assert.ok(vraie.secondes(process.pid) >= 0);

  const absente = sonderCpu('/il-ny-a-pas-de-proc-ici');
  assert.equal(absente.disponible, false);
  assert.match(absente.raison, /aucune garde CPU, garde murale seule/);
  assert.equal(absente.secondes(process.pid), null, 'pas de chiffre du tout plutôt qu’un chiffre trompeur');
});

test('contrôle croisé — ce que le noyau compte au lanceur recoupe ce qu’il a vu', () => {
  // `cutime`/`cstime` de `/proc/self/stat` cumulent TOUS les enfants moissonnés :
  // inutilisables pour attribuer un coût à un fichier quand quatre tournent de
  // front, mais irremplaçables pour vérifier que la somme des chiffres par
  // fichier ne dérive pas. Deux chemins indépendants sur la même quantité.
  const avant = cpuEnfantsMoissonnes();
  assert.ok(avant !== null && avant >= 0);
  spawnSync(process.execPath, ['-e', 'let x = 0; for (let i = 0; i < 5e7; i++) x += Math.sqrt(i);']);
  const apres = cpuEnfantsMoissonnes();
  assert.ok(apres > avant, `le compte du noyau doit grossir : ${avant} → ${apres} s`);
  assert.equal(cpuEnfantsMoissonnes('/il-ny-a-pas-de-proc'), null);
});

// ────────────────────────────────────── les deux bornes, de bout en bout ──

/** Brûle un travail BORNÉ — ce qu'aucune horloge ne distingue d'une attente. */
const BRULE = `import test from 'node:test';
test('brûle pour de vrai', () => { let x = 0; for (let i = 0; i < 1e8; i++) x += Math.sqrt(i); });
`;

/** Brûle sans fin : le portrait d'un fichier parti en vrille, pas bloqué. */
const BRULE_SANS_FIN = `import test from 'node:test';
test('brûle sans fin', () => { let x = 0; const fin = Date.now() + 60_000; while (Date.now() < fin) x += Math.sqrt(x + 1); });
`;

test('CPU contre mur — le dormeur occupe une voie sans rien coûter, et la table le montre', () => {
  const { racine } = atelier({ 'brule.test.js': BRULE, 'dort.test.js': DORT_UN_PEU });
  const durees = path.join(racine, 'durees.json');
  const { code, sortie } = lancer(racine, '--releve-durees', `--durees=${durees}`);
  assert.equal(code, 0, sortie);

  const table = JSON.parse(fs.readFileSync(durees, 'utf8'));
  const dort = table.durees['src/faux/lents/dort.test.js'];
  const brule = table.durees['src/faux/lents/brule.test.js'];

  // ★ C'EST TOUT LE SUJET. Deux fichiers qui occupent une voie le même ordre de
  // temps, dont un seul coûte quelque chose. Le mur ne les distingue pas ; le
  // CPU, si. Un budget de travail assis sur le mur donnerait donc au dormeur la
  // même corde qu'au brûleur — et se laisserait gonfler par la charge en prime.
  assert.ok(dort.murSecondes >= 1.4, `le dormeur occupe bien le mur : ${dort.murSecondes} s`);
  assert.ok(
    dort.cpuSecondes < dort.murSecondes / 2,
    `mais il ne brûle presque rien : ${dort.cpuSecondes} s de CPU pour ${dort.murSecondes} s au mur`,
  );
  assert.ok(brule.cpuSecondes > dort.cpuSecondes, 'le brûleur, lui, paie ce qu’il consomme');
  assert.match(sortie, /de CPU/, 'le journal dit le CPU, pas seulement le mur');
  assert.match(sortie, /contrôle {3}/, 'et il recoupe sa somme avec le compte du noyau');

  fs.rmSync(racine, { recursive: true, force: true });
});

test('dépassement CPU — distinct du mural, et le message dit LEQUEL a sauté', () => {
  const { racine } = atelier({ 'brule.test.js': BRULE_SANS_FIN });
  // Budget CPU d'une seconde, filet mural de deux minutes : seule la borne de
  // travail peut parler ici. Sans la distinction, on irait chercher un blocage.
  const { code, sortie } = lancer(
    racine,
    '--plancher-cpu=0',
    '--cpu-inconnu=1',
    '--plancher-mur=0',
    '--mur-inconnu=120',
    '--pas-cpu=100',
  );

  assert.equal(code, 1, sortie);
  assert.match(sortie, /dépassement du budget CPU/);
  assert.match(sortie, /le fichier travaille plus que sa référence/);
  assert.doesNotMatch(sortie, /dépassement du délai de garde mural/, 'le mur avait deux minutes : il n’est pas en cause');
  assert.match(sortie, /tous par dépassement du budget CPU/, 'le bilan désigne le travail, pas la machine');
  assert.match(sortie, new RegExp(VAR_FACTEUR_CPU));
  assert.doesNotMatch(sortie, /signe de machine lente/, 'accuser la machine ici enverrait chercher au mauvais endroit');

  // Et il dit COMBIEN il avait brûlé — ce qui n'a rien d'acquis : tué par le
  // garde, `node --test` n'a jamais moissonné le petit-fils qui portait le
  // travail, donc le `times` du shell l'ignore. C'est l'échantillonnage qui
  // rattrape, et le lanceur retient la plus grande des deux lectures.
  const brulees = sortie.match(/(\d+[,.]\d+) s brûlées/);
  assert.ok(brulees, `le message doit chiffrer le brûlage : ${sortie}`);
  assert.ok(
    Number(brulees[1].replace(',', '.')) >= 1,
    `il a dépassé une seconde de CPU, il doit l’avouer : ${brulees[1]} s`,
  );

  fs.rmSync(racine, { recursive: true, force: true });
});

test('sans /proc — la passe s’annonce sans garde CPU, et la table le consigne', async () => {
  const { racine } = atelier({ 'a.test.js': VERT });
  const durees = path.join(racine, 'durees.json');
  let sortie = '';

  const { code } = await lancerSuiteLente({
    racine,
    motifs: [MOTIF],
    parallelisme: 1,
    racineProc: '/il-ny-a-pas-de-proc-ici',
    cheminEtat: path.join(racine, 'etat.json'),
    cheminDurees: durees,
    releveDurees: true,
    ecrire: (t) => {
      sortie += t;
    },
  });

  assert.equal(code, 0, sortie);
  // Le repli hors Linux doit être BRUYANT : jamais un chiffre muet dont on
  // ignore la nature.
  assert.match(sortie, /PAS DE SONDE/);
  assert.match(sortie, /aucune garde CPU, garde murale seule/);

  const table = JSON.parse(fs.readFileSync(durees, 'utf8'));
  assert.match(table.conditions.gardeCpu, /indisponible/, 'la table aussi doit le dire');
  // Le shell, lui, est toujours là : le CPU exact reste relevé à la sortie.
  // Deux capacités distinctes, et perdre l'une ne fait pas perdre l'autre.
  assert.match(table.conditions.cpuSource, /times/);

  fs.rmSync(racine, { recursive: true, force: true });
});
