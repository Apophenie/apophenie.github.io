/** La MISE EN PAGE de l'écran de liste — `node --test src/app/resultat.test.js`.
 *
 *  Trois décisions d'affichage y sont vérifiées, et une seule d'entre elles est
 *  une question de goût :
 *
 *   1. LE PODIUM. Les deux premières voies répondent à deux questions
 *      différentes (`recherche/score.js › POIDS_DES_REGIMES`), et l'encadré le
 *      dit. Ce qui se teste ici n'est pas l'esthétique du cadre mais la règle
 *      d'attribution : elle lit `approche.suggestion`, jamais le rang. C'est la
 *      faute qu'on ne verrait pas à l'écran — sur une liste ordinaire les deux
 *      coïncident, et on ne s'apercevrait de rien jusqu'au jour où la seconde
 *      suggestion n'a rien à dire et n'est pas posée du tout.
 *
 *   2. L'ASIDE. La commande de cible et le mémo d'URL ont quitté le flux
 *      principal pour un `<aside>`, avec un emplacement réservé entre les deux.
 *      Ce qui se teste, c'est l'ORDRE et l'EMPLACEMENT — le reste est dans
 *      `pages.css`, et un test qui vérifierait une largeur de colonne
 *      vérifierait le navigateur, pas le site.
 *
 *   3. LA BASCULE EST EN CSS. « CSS uniquement pour la bascule — pas de
 *      JavaScript de mesure, pas de `matchMedia` » (l'auteur). C'est une
 *      contrainte qu'on peut relire dans la source, et qu'un jour quelqu'un
 *      contournera « juste pour ce cas-là » : le test est là pour ce jour-là.
 *
 *  ── Un DOM de poche, et pourquoi il suffit ────────────────────────────────
 *  `dom.js › e()` n'utilise du document que six méthodes. Les reproduire tient
 *  en trente lignes et rend ce fichier exécutable par `node --test` sans
 *  dépendance — ce qui est la règle du dépôt. On ne mesure rien, on ne peint
 *  rien : on relit l'ARBRE que la page vient de construire. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/* ═════════════════════════ Le DOM de poche ═══════════════════════════════ */

class Noeud {
  constructor(balise) {
    this.tagName = balise;
    this.enfants = [];
    this.attributs = {};
    this.classes = new Set();
    this.style = {};
    this.propre = '';
  }
  get classList() {
    const s = this.classes;
    return { add: (c) => s.add(c), contains: (c) => s.has(c) };
  }
  get id() { return this.attributs.id || ''; }
  set id(v) { this.attributs.id = String(v); }
  set textContent(v) { this.propre = String(v); }
  get textContent() {
    return this.propre + this.enfants.map((c) => c.textContent || '').join('');
  }
  set innerHTML(v) { this.propre = String(v); }
  setAttribute(k, v) { this.attributs[k] = String(v); }
  getAttribute(k) { return k in this.attributs ? this.attributs[k] : null; }
  removeAttribute(k) { delete this.attributs[k]; }
  addEventListener() {}
  appendChild(n) { this.enfants.push(n); return n; }
  get firstChild() { return this.enfants[0] || null; }
}

globalThis.document = {
  createElement: (b) => new Noeud(b),
  createTextNode: (d) => ({ textContent: String(d) }),
};

/* Les modules ne sont chargés qu'APRÈS la pose du document : `e()` s'en sert à
   l'appel et non à l'import, mais rien ne garantit qu'il en ira toujours
   ainsi, et l'ordre inverse ne coûterait qu'un test rouge incompréhensible. */
const pont = await import('./pont.js');
const { pageResultat } = await import('./pages/resultat.js');
const { fr } = await import('../i18n/fr.js');
const { en } = await import('../i18n/en.js');

/** La grammaire d'URL appartient à `src/recherche/` : `pont.js` sait vivre sans
 *  elle, et cette page aussi (la commande de cible disparaît alors, faute de
 *  lien où mener). On la branche si elle répond, et les rares assertions qui en
 *  dépendent se déclarent explicitement conditionnelles plus bas — un test de
 *  MISE EN PAGE n'a pas à rougir parce qu'un autre module est en travaux. */
await pont.preparer();
const GRAMMAIRE = Boolean(pont.ecrireHash({ saisie: 'test', cible: '111' }));

/* ═══════════════════════ Sondes sur l'arbre rendu ════════════════════════ */

/** Tous les nœuds de l'arbre, en profondeur d'abord — l'ordre du document. */
function* parcourir(noeud) {
  if (!noeud || !noeud.tagName) return;
  yield noeud;
  for (const enfant of noeud.enfants) yield* parcourir(enfant);
}

const tous = (racine, classe) =>
  [...parcourir(racine)].filter((n) => n.classes.has(classe));
const un = (racine, classe) => tous(racine, classe)[0] || null;
const balises = (racine, ...noms) =>
  [...parcourir(racine)].filter((n) => noms.includes(n.tagName));

/** Une approche de laboratoire — juste ce que la page lit. */
const voie = (rang, titre, suggestion, series = 1) => ({
  rang,
  titre: { fr: titre, en: titre },
  suggestion,
  series,
  urlSobre: `#so!x#${rang}`,
  urlScenique: `#sce!x#${rang}`,
});

const rendre = (approches, options = {}) => pageResultat({
  saisie: 'essai',
  resultat: { approches, fragments: [] },
  cible: null,
  surChoixSecours() {},
  ...options,
});

/** Le numéro affiché par la carte que cet encadré englobe. */
const numeroEncadre = (place) => {
  const n = un(place, 'voie__numero');
  return n ? n.textContent : null;
};

/* ═══════════════════════════ 1. Le podium ════════════════════════════════ */

/**
 * ★ LA RÈGLE, et le seul test qui compte vraiment ici.
 *
 * Les marques sont volontairement posées À CONTRE-RANG : la voie n° 1 porte
 * « triptyques » et la n° 3 porte « elegance ». Une implémentation qui
 * encadrerait « la première » et « la deuxième » passerait tous les autres
 * tests de ce fichier et échouerait sur celui-ci — ce qui est exactement ce
 * qu'on lui demande, puisque `recherche/index.js › selectionner()` est libre de
 * ne poser aucune marque, ou de n'en poser qu'une.
 */
test('★ podium — l’encadré suit la marque `suggestion`, jamais le rang', () => {
  const page = rendre([
    voie(1, 'La plus fournie', 'triptyques', 5),
    voie(2, 'Une du mixte', 'mixte'),
    voie(3, 'La plus belle', 'elegance', 2),
  ]);

  const elegance = un(page, 'podium__place--elegance');
  const maximisation = un(page, 'podium__place--maximisation');
  assert.ok(elegance, 'l’encadré d’élégance manque');
  assert.ok(maximisation, 'l’encadré de maximisation manque');

  assert.equal(numeroEncadre(elegance), 'n° 3',
    'l’élégance a été prise au rang plutôt qu’à la marque');
  assert.equal(numeroEncadre(maximisation), 'n° 1',
    'la maximisation a été prise au rang plutôt qu’à la marque');

  // Et le rang affiché reste celui de l'approche : sortir une voie de la
  // grille ne la renumérote pas.
  const numeros = tous(page, 'voie__numero').map((n) => n.textContent);
  assert.deepEqual(numeros, ['n° 3', 'n° 1', 'n° 2'],
    'les encadrés ont renuméroté les voies qu’ils englobent');
});

test('★ podium — l’élégance est annoncée avant la maximisation', () => {
  const page = rendre([
    voie(1, 'La plus fournie', 'triptyques', 5),
    voie(2, 'La plus belle', 'elegance', 2),
  ]);
  const places = tous(page, 'podium__place').map((p) => [...p.classes]
    .find((c) => c.startsWith('podium__place--')));
  assert.deepEqual(places, ['podium__place--elegance', 'podium__place--maximisation'],
    'l’ordre des deux places a changé : l’auteur les a nommées dans cet ordre');
});

/**
 * ★ AUCUNE MARQUE, AUCUN ENCADRÉ — et surtout pas d'encadré vide.
 *
 * Le cas arrive pour de bon : une liste de secours (moteur absent) n'en porte
 * pas, une liste rejouée depuis une URL non plus, et `selectionner()` ne pose
 * la seconde marque que si elle a quelque chose à dire.
 */
test('★ podium — sans marque, la liste s’affiche exactement comme avant', () => {
  const page = rendre([voie(1, 'A', undefined), voie(2, 'B', undefined)]);
  assert.equal(tous(page, 'podium').length, 0, 'un conteneur de podium vide subsiste');
  assert.equal(tous(page, 'podium__place').length, 0, 'un encadré vide subsiste');
  assert.equal(tous(page, 'voies').length, 1, 'la grille commune a disparu');
  assert.equal(tous(page, 'voie').length, 2, 'des voies se sont perdues en route');
});

test('★ podium — une seule marque ne fabrique pas la seconde place', () => {
  const page = rendre([voie(1, 'A', 'elegance', 3), voie(2, 'B', 'mixte')]);
  assert.equal(tous(page, 'podium__place').length, 1);
  assert.ok(un(page, 'podium__place--elegance'));
  assert.equal(un(page, 'podium__place--maximisation'), null,
    'la seconde place a été inventée alors que le moteur ne l’a pas attribuée');
});

test('★ podium — toutes les voies encadrées ne laissent pas de grille vide', () => {
  const page = rendre([voie(1, 'A', 'elegance', 2), voie(2, 'B', 'triptyques', 5)]);
  assert.equal(tous(page, 'podium__place').length, 2);
  assert.equal(tous(page, 'voies').length, 0,
    'une grille de voies vide reste dans la page, avec son écart et rien dedans');
});

/**
 * ★ LE DRAPEAU QUI ÉTEINT LE PODIUM.
 *
 * Il existe pour la pondération personnalisée à venir : quand toutes les voies
 * sont notées au même barème, il n'y a plus deux questions, et deux encadrés
 * feraient dire aux deux premières lignes ce qu'elles ne disent pas. Éteindre
 * le podium ne doit RIEN retirer d'autre — les voies marquées repassent dans la
 * grille commune, à leur rang.
 */
test('★ podium — `podium: false` rend toutes les voies à la grille commune', () => {
  const approches = [
    voie(1, 'A', 'elegance', 2),
    voie(2, 'B', 'triptyques', 5),
    voie(3, 'C', 'mixte'),
  ];
  const page = rendre(approches, { podium: false });
  assert.equal(tous(page, 'podium').length, 0, 'le podium survit au drapeau éteint');
  assert.equal(tous(page, 'voies').length, 1);
  assert.equal(tous(page, 'voie').length, 3, 'des voies ont disparu avec les encadrés');
  assert.deepEqual(tous(page, 'voie__numero').map((n) => n.textContent),
    ['n° 1', 'n° 2', 'n° 3'], 'l’ordre du moteur n’est plus respecté');

  // Le défaut, lui, reste l'allumage : c'est le cas normal aujourd'hui.
  assert.equal(tous(rendre(approches), 'podium__place').length, 2,
    '`podium` ne vaut plus `true` par défaut');
});

test('★ podium — l’intitulé et la glose viennent des dictionnaires', () => {
  const page = rendre([voie(1, 'A', 'elegance', 2), voie(2, 'B', 'triptyques', 5)]);
  const titres = tous(page, 'podium__titre').map((n) => n.textContent);
  const gloses = tous(page, 'podium__glose').map((n) => n.textContent);
  assert.deepEqual(titres, [fr.resultat.podium.elegance, fr.resultat.podium.maximisation]);
  assert.deepEqual(gloses,
    [fr.resultat.podium.eleganceGlose, fr.resultat.podium.maximisationGlose]);

  // Les deux langues, sinon l'anglais afficherait le CHEMIN de la clé.
  for (const [nom, dico] of [['fr', fr], ['en', en]]) {
    for (const cle of ['elegance', 'eleganceGlose', 'maximisation', 'maximisationGlose']) {
      assert.equal(typeof dico.resultat.podium[cle], 'string',
        `resultat.podium.${cle} manque en ${nom}`);
      assert.ok(dico.resultat.podium[cle].trim(), `resultat.podium.${cle} est vide en ${nom}`);
    }
    assert.ok((dico.resultat.asideLabel || '').trim(), `resultat.asideLabel manque en ${nom}`);
  }
});

/* ══════════════════════ 2. La seconde colonne ════════════════════════════ */

/**
 * ★ « Tout ce qui va de "Trop diabolique pour vous ?" jusqu'à la fin de
 *   l'encart "Assembler vos propres arcanes" passe en aside » (l'auteur).
 *
 * Ce que ce test tient, c'est l'APPARTENANCE et l'ORDRE — pas la colonne, qui
 * est affaire de `pages.css`. Un jour où la bascule serait refaite, c'est
 * l'inventaire de l'aside qu'il faudra retrouver intact.
 */
test('★ aside — la commande de cible et le mémo ont quitté le flux principal', () => {
  const page = rendre([voie(1, 'A', 'elegance', 2)]);
  const aside = [...parcourir(page)].find((n) => n.tagName === 'aside');
  assert.ok(aside, 'l’aside n’existe pas');
  assert.ok(aside.classes.has('resultat__aside'));

  const flux = un(page, 'resultat__flux');
  assert.ok(flux, 'le flux principal n’existe pas');
  assert.equal(un(flux, 'commande-cible'), null, 'la commande de cible est restée dans le flux');
  assert.equal(un(flux, 'panneau-terminal'), null, 'le mémo est resté dans le flux');
  assert.ok(un(aside, 'panneau-terminal'), 'le mémo n’est pas dans l’aside');
  if (GRAMMAIRE) {
    assert.ok(un(aside, 'commande-cible'), 'la commande de cible n’est pas dans l’aside');
  }

  // Et la liste, elle, n'a pas bougé : elle reste dans le flux.
  assert.ok(un(flux, 'voies') || un(flux, 'podium'), 'la liste a suivi le mémo dans l’aside');
});

/**
 * ★ L'EMPLACEMENT DES CURSEURS — réservé, vide, nommé, et ENTRE LES DEUX.
 *
 * « Un bloc de curseurs viendra s'insérer ENTRE la commande de cible et le
 * mémo » (l'auteur, qui le posera lui-même). Le nœud existe déjà et porte un
 * `id` : c'est ce qui permet de le viser sans toucher à cette page.
 */
test('★ aside — l’emplacement des curseurs est réservé entre la commande et le mémo', () => {
  const page = rendre([voie(1, 'A', 'elegance', 2)]);
  const aside = [...parcourir(page)].find((n) => n.tagName === 'aside');
  const noms = aside.enfants.map((n) => [...n.classes][0] || n.tagName);

  const iCurseurs = noms.indexOf('resultat__curseurs');
  const iMemo = noms.indexOf('panneau-terminal');
  assert.ok(iCurseurs >= 0, 'l’emplacement des curseurs a disparu');
  assert.ok(iCurseurs < iMemo, 'les curseurs ne sont plus avant le mémo');
  if (GRAMMAIRE) {
    assert.ok(noms.indexOf('commande-cible') < iCurseurs,
      'les curseurs ne sont plus après la commande de cible');
  }

  const emplacement = aside.enfants[iCurseurs];
  assert.equal(emplacement.id, 'curseurs-ponderation',
    'l’ancre nommée a changé de nom ou disparu : un autre module la vise');
  assert.equal(emplacement.enfants.length, 0,
    'l’emplacement n’est plus vide — c’est peut-être une bonne nouvelle, à confirmer');
});

/**
 * ★ LA BASCULE EST EN CSS, ET RIEN QU'EN CSS.
 *
 * « CSS uniquement pour la bascule — pas de JavaScript de mesure, pas de
 * `matchMedia` » (l'auteur). Le DOM est le même aux deux largeurs, dans le même
 * ordre : c'est ce qui garantit qu'un redimensionnement ne rejoue rien et que
 * l'ordre de lecture au clavier ne dépend pas de la fenêtre.
 */
test('★ aside — la bascule à deux colonnes n’est écrite qu’en CSS', () => {
  const source = lire('./pages/resultat.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.doesNotMatch(source, /matchMedia/, 'la page mesure la fenêtre en JavaScript');
  assert.doesNotMatch(source, /innerWidth|clientWidth|getBoundingClientRect|ResizeObserver/,
    'la page mesure quelque chose en JavaScript pour décider de sa mise en page');

  const css = lire('../styles/pages.css');
  assert.match(css, /@media\s*\(min-width:\s*1100px\)[\s\S]{0,900}\.resultat__corps/,
    'le seuil de bascule de la seconde colonne n’est plus dans pages.css');
  assert.match(css, /\.resultat__curseurs:empty\s*\{[^}]*display:\s*none/,
    'l’emplacement vide des curseurs creuserait un blanc dans l’aside');
});

/* ═══════════════════ 3. Accessibilité de la page ═════════════════════════ */

test('★ accessibilité — l’aside est un point de repère NOMMÉ', () => {
  const page = rendre([voie(1, 'A', 'elegance', 2)]);
  const aside = [...parcourir(page)].find((n) => n.tagName === 'aside');
  const nom = aside.getAttribute('aria-label');
  assert.ok(nom && nom.trim(), 'un `complementary` sans nom ne se distingue de rien');
  assert.equal(nom, fr.resultat.asideLabel, 'le nom du repère ne passe plus par les dictionnaires');
});

/**
 * ★ LA HIÉRARCHIE DES TITRES — un seul h1, et aucun palier sauté.
 *
 * Le podium a introduit un niveau : ses intitulés sont des `h3`, sous le `h2`
 * « Les voies complètes » qui ouvre la section. Un `h2` les aurait fait passer
 * pour des sections de la page au même titre que la liste elle-même ; un `h4`
 * aurait sauté un cran. C'est la seule chose qu'un lecteur d'écran a pour se
 * faire une carte de la page — ici, contrairement à la scène, il n'y a pas
 * d'équivalent accessible à côté, la page EST l'équivalent.
 */
test('★ accessibilité — un seul h1, et pas de palier de titre sauté', () => {
  const page = rendre([
    voie(1, 'A', 'elegance', 2),
    voie(2, 'B', 'triptyques', 5),
    voie(3, 'C', 'mixte'),
  ]);
  const niveaux = balises(page, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6')
    .map((n) => Number(n.tagName[1]));

  assert.equal(niveaux.filter((n) => n === 1).length, 1, 'la page n’a pas exactement un h1');
  assert.equal(niveaux[0], 1, 'la page ne commence pas par son h1');
  assert.ok(niveaux.includes(3), 'les intitulés du podium ne sont plus des titres');
  for (let i = 1; i < niveaux.length; i += 1) {
    assert.ok(niveaux[i] <= niveaux[i - 1] + 1,
      `palier sauté : h${niveaux[i - 1]} puis h${niveaux[i]}`);
  }
});

/**
 * ★ AUCUN TEXTE VISIBLE EN DUR dans la page.
 *
 * Le site est bilingue : une chaîne écrite ici s'afficherait en français à un
 * lecteur anglais, et personne ne s'en apercevrait avant longtemps. On relit
 * donc la source à la recherche d'un `texte:` littéral — les seuls tolérés sont
 * les signes typographiques (flèches, triangles) qui sont des DESSINS, tous
 * doublés d'un `aria-hidden`.
 */
test('★ accessibilité — aucun texte visible écrit en dur dans la page', () => {
  const source = lire('./pages/resultat.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const litteraux = [...source.matchAll(/texte:\s*'([^']*)'/g)].map((m) => m[1]);
  for (const brut of litteraux) {
    assert.match(brut, /^[^\p{L}\p{N}]*$/u,
      `« ${brut} » est écrit en dur : il doit passer par t() et les dictionnaires`);
  }
});
