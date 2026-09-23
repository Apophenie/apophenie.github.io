/**
 * ★ **LE RYTHME SE PERSISTE COMME LE THÈME ET LA LANGUE.**
 *
 * > « Le réglage se persiste comme le thème et la langue. » (l'auteur)
 *
 * Trois promesses, et la troisième est la moins évidente des trois :
 *
 *  1. il se relit d'une visite à l'autre ;
 *  2. il refuse une valeur inconnue plutôt que de la propager ;
 *  3. **c'est la VALEUR qui est stockée, pas le refus du défaut** — sans quoi le
 *     jour où le défaut changera, celui qui avait explicitement choisi « Pas à
 *     pas » se retrouverait en « Simultané » sans avoir rien demandé.
 *
 * ⚠️ `localStorage` n'existe pas sous Node sans `--localstorage-file` : on en
 *   pose un de laboratoire AVANT d'importer le module, puisque `reglages.js`
 *   capture `localStorage` au premier appel. C'est la même méthode que
 *   `transport.test.js` pour le document.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const memoire = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
};
// `appliquerRythme` écrit sur `document.documentElement` : un porte-attributs
// suffit, on ne teste pas le DOM ici.
const attributs = new Map();
globalThis.document = {
  documentElement: {
    setAttribute: (k, v) => attributs.set(k, v),
    removeAttribute: (k) => attributs.delete(k),
    getAttribute: (k) => (attributs.has(k) ? attributs.get(k) : null),
  },
};

const { rythmeChoisi, definirRythme, appliquerRythme } = await import('./reglages.js');
const { RYTHMES, RYTHME_DEFAUT } = await import('../visuel/rythme.js');

const CLE = 'nhlg.rythme';

test('★ réglages — sans rien de stocké, le rythme est celui de la constante', () => {
  memoire.clear();
  assert.equal(rythmeChoisi(), RYTHME_DEFAUT);
});

test('★ réglages — le rythme choisi se relit d’une visite à l’autre', () => {
  memoire.clear();
  for (const r of RYTHMES) {
    assert.equal(definirRythme(r), r);
    assert.equal(rythmeChoisi(), r, `« ${r} » ne se relit pas`);
  }
});

/**
 * ★ **LA VALEUR, PAS LE REFUS.** C'est ce qui distingue ce réglage du son, où
 * l'absence de clé vaut « coupé » et où seule l'acceptation s'écrit. Ici le
 * défaut est appelé à changer — « quand ça sera au point, on passera
 * probablement en parallèle/par lots par défaut » (l'auteur) —, et un choix
 * stocké comme « pas le défaut » basculerait ce jour-là sous les pieds de celui
 * qui l'avait fait.
 */
test('★ réglages — choisir le rythme par défaut l’ÉCRIT quand même', () => {
  memoire.clear();
  definirRythme(RYTHME_DEFAUT);
  assert.equal(memoire.get(CLE), RYTHME_DEFAUT,
    'le choix explicite du défaut doit laisser une trace, sinon il se perdra '
    + 'le jour où le défaut changera');
});

test('★ réglages — une valeur inconnue est refusée, et ne remplace rien', () => {
  memoire.clear();
  definirRythme('simultane');
  assert.equal(definirRythme('parallele'), 'simultane', 'le choix en place est conservé');
  assert.equal(rythmeChoisi(), 'simultane');
  // Et une clé corrompue à la main retombe sur le défaut sans lever.
  memoire.set(CLE, 'nimportequoi');
  assert.equal(rythmeChoisi(), RYTHME_DEFAUT);
});

test('★ réglages — le rythme se pose en attribut, comme le thème', () => {
  memoire.clear();
  definirRythme('simultane');
  appliquerRythme();
  assert.equal(attributs.get('data-rythme'), 'simultane');
});

/**
 * ★ Les auditeurs sont prévenus : c'est par là que la page de démonstration
 *   apprend qu'elle doit recompiler (le rythme déplace les charnières, donc la
 *   timeline entière). Un réglage qui change sans prévenir laisserait la scène
 *   jouer l'ancien ordre jusqu'au prochain rechargement.
 */
test('★ réglages — changer le rythme prévient les auditeurs', async () => {
  const { onReglages } = await import('./reglages.js');
  memoire.clear();
  let appels = 0;
  const off = onReglages(() => { appels += 1; });
  definirRythme('simultane');
  assert.equal(appels, 1);
  definirRythme('pasAPas');
  assert.equal(appels, 2);
  off();
  definirRythme('simultane');
  assert.equal(appels, 2, 'un auditeur détaché ne doit plus être appelé');
});

test('les préférences restent actives quand le stockage refuse les écritures', async () => {
  const stockage = globalThis.localStorage;
  const r = await import('./reglages.js?stockage-refuse');
  const off = r.onReglages(() => {
    assert.equal(document.documentElement.getAttribute('data-rythme'), r.rythmeChoisi());
  });
  try {
    globalThis.localStorage = {
      getItem: () => 'pasAPas',
      setItem() { throw new Error('refus'); },
      removeItem() { throw new Error('refus'); },
    };
    r.definirRythme('simultane');
    assert.equal(r.rythmeChoisi(), 'simultane');
    globalThis.localStorage.getItem = () => { throw new Error('refus'); };
    assert.equal(r.rythmeChoisi(), 'simultane');
    r.definirRythme('pasAPas');
    assert.equal(r.rythmeChoisi(), 'pasAPas');
    r.definirTheme('sombre');
    assert.equal(r.themePrefere(), 'sombre');
    r.definirTheme('auto');
    assert.equal(r.themePrefere(), 'auto', 'la suppression refusée reste effective en mémoire');
  } finally { off(); globalThis.localStorage = stockage; }
});
