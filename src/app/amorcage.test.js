/** L'amorçage — le test qui manquait.
 *
 *  Une suite entièrement verte n'a pas empêché le site de ne plus démarrer du
 *  tout : un nettoyage trop gourmand avait emporté dix fonctions de `pont.js`,
 *  dont `preparer()`. Firefox disait « (void 0) is not a function » à la ligne
 *  22 de `main.js`, et rien ici ne s'en apercevait — parce que les tests
 *  exercent les moteurs, jamais le CÂBLAGE entre eux.
 *
 *  Ce fichier vérifie donc le contrat le plus bête et le plus vital : que
 *  chaque symbole importé par le code d'amorçage existe réellement, et qu'il
 *  est bien du type attendu. C'est purement statique — aucun DOM, aucun
 *  navigateur — mais ça attrape la classe d'erreurs qui casse tout. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/** Les `import { a, b } from './x.js'` d'un fichier, sans son texte. */
function importsNommes(source) {
  const out = new Map();
  const re = /import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g;
  for (const m of source.matchAll(re)) {
    const noms = m[1].split(',')
      .map((n) => n.split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    out.set(m[2], (out.get(m[2]) || []).concat(noms));
  }
  return out;
}

test('amorçage — main.js n’importe que des symboles qui existent', async () => {
  const source = lire('./main.js');
  for (const [chemin, noms] of importsNommes(source)) {
    const mod = await import(new URL(chemin, import.meta.url).href);
    for (const nom of noms) {
      assert.ok(nom in mod, `main.js importe « ${nom} » de ${chemin}, qui ne l'exporte pas`);
      assert.equal(typeof mod[nom], 'function',
        `main.js appelle « ${nom} » : attendu une fonction, reçu ${typeof mod[nom]}`);
    }
  }
});

test('amorçage — `pont` expose tout ce que les pages lui demandent', async () => {
  const pont = await import('./pont.js');
  // Relevé depuis les usages réels : routeur, pages, main.
  const attendus = [
    'preparer', 'preparerVisuel', 'creerLecteur', 'etat',
    'lireHash', 'ecrireHash', 'canoniser',
    'resoudre', 'rejouer', 'scenarioDe',
    'LIMITE_SAISIE', 'bandeaux', 'facteurRepetitions',
  ];
  for (const nom of attendus) {
    assert.ok(nom in pont, `pont.js n'exporte plus « ${nom} »`);
  }
});

test('amorçage — chaque module de src/app importe des symboles existants', async () => {
  const fichiers = [
    './routeur.js', './pages/demonstration.js', './pages/resultat.js',
    './pages/accueil.js', './transport.js', './logo.js', './reglages.js',
  ];
  for (const f of fichiers) {
    const source = lire(f);
    for (const [chemin, noms] of importsNommes(source)) {
      if (chemin.startsWith('node:')) continue;
      const mod = await import(new URL(chemin, new URL(f, import.meta.url)).href);
      for (const nom of noms) {
        assert.ok(nom in mod, `${f} importe « ${nom} » de ${chemin}, qui ne l'exporte pas`);
      }
    }
  }
});

/**
 * ★ TOUTE FORME LUE DOIT ÊTRE UNE FORME ROUTÉE.
 *
 * `lire()` classe un lien dans l'une de ses formes ; `routeur.js` en fait une
 * page. Rien n'oblige les deux listes à coïncider, et le symptôme d'un oubli
 * est le plus discret qui soit : la forme neuve tombe dans le `default`, qui
 * affiche « Cette incantation est corrompue » sur un lien parfaitement valide.
 * C'est exactement ce que §4.3 interdit — un repli muet.
 *
 * Le test est textuel, comme le reste de ce fichier : il lit la liste des
 * formes là où elle est ÉCRITE (le typedef de `LectureUrl`) et exige un `case`
 * pour chacune. `invalide` est la seule dispensée, parce que c'est précisément
 * ce que le `default` traite.
 */
test('routeur — chaque forme rendue par `lire()` a sa route', () => {
  const grammaire = lire('../recherche/url.js');
  const m = /@property \{([^}]*)\} forme/.exec(grammaire);
  assert.ok(m, 'le typedef `LectureUrl` ne déclare plus ses formes');
  const formes = m[1].split('|').map((f) => f.trim().replace(/^'|'$/g, ''));
  assert.ok(formes.includes('canonique'), `formes mal relues : ${formes.join(', ')}`);

  const routeur = lire('./routeur.js');
  for (const forme of formes) {
    if (forme === 'invalide') continue;
    assert.match(routeur, new RegExp(`case '${forme}':`),
      `le routeur ne traite pas la forme « ${forme} » : elle tomberait dans le default`);
  }
});
