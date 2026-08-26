/** Le plein écran de la scène — ce qui se vérifie sans navigateur.
 *
 *  Trois familles de vérifications, et le partage entre elles n'est pas
 *  arbitraire :
 *
 *   1. **La DÉTECTION d'API** est une fonction pure d'un objet `document` :
 *      elle se teste en lui présentant des documents factices — un iPhone sans
 *      `requestFullscreen`, un vieux WebKit, un `<iframe>` interdit de plein
 *      écran. C'est la partie qui décide si le bouton existe, donc celle où une
 *      erreur produit un bouton menteur.
 *
 *   2. **L'ÉTAT** — la seule règle qui compte : il vient de
 *      `document.fullscreenElement`, jamais d'un drapeau local. On le prouve en
 *      faisant sortir le document du plein écran DANS LE DOS du contrôleur,
 *      comme le fait `Échap`, et en vérifiant qu'il s'en aperçoit.
 *
 *   3. **LE CÂBLAGE**, qui ne se voit qu'en lisant plusieurs fichiers ensemble :
 *      la barre ne dessine le bouton que s'il peut agir, la zone révélatrice
 *      fait bien le quart annoncé, et le contrôleur n'est jamais masqué d'une
 *      façon qui le sortirait de l'ordre de tabulation. Ce dernier point est du
 *      CSS : aucun test de comportement exécutable ici ne l'atteindrait, mais
 *      la RECETTE, elle, se lit — même méthode que
 *      `src/visuel/tests/compositeur.test.js`. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apiPleinEcran, creerPleinEcran, verrouillerPaysage, libererOrientation,
  PART_REVELATRICE, DELAI_PRESENTATION,
} from './pleinecran.js';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (p) => readFileSync(resolve(ici, p), 'utf8');

/** Le CODE seul. Les commentaires de ce projet citent volontiers ce qu'ils
 *  interdisent — l'en-tête de `transport.js` explique justement pourquoi
 *  `aria-pressed` est proscrit —, et une recherche naïve y trouverait le mot
 *  qu'elle cherche à bannir. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ═══════════════════════ Doublures ═══════════════════════ */

/** Un document factice : juste de quoi porter des méthodes et des écouteurs. */
function documentFactice(champs = {}) {
  const ecouteurs = new Map();
  return {
    ...champs,
    addEventListener(nom, f) {
      if (!ecouteurs.has(nom)) ecouteurs.set(nom, new Set());
      ecouteurs.get(nom).add(f);
    },
    removeEventListener(nom, f) {
      if (ecouteurs.has(nom)) ecouteurs.get(nom).delete(f);
    },
    emettre(nom) { (ecouteurs.get(nom) || new Set()).forEach((f) => f()); },
    combienDEcouteurs(nom) { return (ecouteurs.get(nom) || new Set()).size; },
  };
}

/** Un nœud factice : un `dataset` et des écouteurs, rien de plus. */
function noeudFactice() {
  const poses = [];
  return {
    dataset: {},
    addEventListener(nom, f) { poses.push([nom, f]); },
    removeEventListener(nom, f) {
      const i = poses.findIndex(([n, g]) => n === nom && g === f);
      if (i >= 0) poses.splice(i, 1);
    },
    ecouteurs: poses,
  };
}

/* ═══════════ 1. La détection : le bouton existe-t-il ? ═══════════ */

test('★ plein écran — pas d’API du tout : pas de bouton, plutôt qu’un bouton inerte', () => {
  // Le cas d'un iPhone : le document connaît le plein écran des vidéos, mais
  // `Element.requestFullscreen` n'existe pas.
  const doc = documentFactice({ exitFullscreen() {} });
  assert.equal(apiPleinEcran(doc, {}), null);
});

test('★ plein écran — une MOITIÉ d’API est un refus : on entrerait sans pouvoir sortir', () => {
  const doc = documentFactice({});
  assert.equal(apiPleinEcran(doc, { requestFullscreen() {} }), null,
    'de quoi entrer, rien pour sortir');
});

test('★ plein écran — le dialecte standard passe avant les préfixes', () => {
  const doc = documentFactice({
    exitFullscreen() {},
    webkitExitFullscreen() {},
    fullscreenElement: null,
  });
  const api = apiPleinEcran(doc, { requestFullscreen() {}, webkitRequestFullscreen() {} });
  assert.equal(api.evenement, 'fullscreenchange');
});

test('★ plein écran — un vieux WebKit est servi par son propre dialecte', () => {
  const cible = {};
  let demande = null;
  const doc = documentFactice({
    webkitExitFullscreen() {},
    webkitFullscreenElement: null,
  });
  const api = apiPleinEcran(doc, { webkitRequestFullscreen() {} });
  assert.equal(api.evenement, 'webkitfullscreenchange');
  // Et c'est bien la méthode préfixée qui est appelée, sur l'élément demandé.
  cible.webkitRequestFullscreen = function () { demande = this; };
  api.demander(cible);
  assert.equal(demande, cible);
});

test('★ plein écran — `fullscreenEnabled: false` (une iframe interdite) : pas de bouton', () => {
  // L'API est là, complète, et pourtant tout appel échouerait. Un bouton qui ne
  // peut rien faire est exactement le mensonge que ce projet refuse.
  const doc = documentFactice({ exitFullscreen() {}, fullscreenEnabled: false });
  assert.equal(apiPleinEcran(doc, { requestFullscreen() {} }), null);

  // ⚠ `undefined` n'est PAS un refus : un dialecte préfixé peut n'avoir aucun
  // témoin de permission, et le prendre pour un « non » retirerait le bouton
  // aux navigateurs qui savent le servir.
  const autre = documentFactice({ webkitExitFullscreen() {} });
  assert.ok(apiPleinEcran(autre, { webkitRequestFullscreen() {} }));
});

test('★ plein écran — une exception synchrone ne remonte pas jusqu’au clic', async () => {
  const doc = documentFactice({ exitFullscreen() { throw new Error('non'); }, fullscreenElement: null });
  const api = apiPleinEcran(doc, { requestFullscreen() {} });
  await assert.rejects(api.sortir());
  await assert.rejects(api.demander({ requestFullscreen() { throw new Error('non'); } }));
});

/* ═══════════ 2. L'état vient du navigateur, jamais de nous ═══════════ */

/** Un attelage complet : document, cible, zone, et le contrôleur. */
function attelage(extra = {}) {
  const cible = noeudFactice();
  const zone = noeudFactice();
  const doc = documentFactice({
    fullscreenElement: null,
    exitFullscreen() { doc.fullscreenElement = null; return Promise.resolve(); },
  });
  cible.requestFullscreen = () => { doc.fullscreenElement = cible; return Promise.resolve(); };
  const plein = creerPleinEcran({
    cible, zone, doc, fenetre: { matchMedia: () => ({ matches: false }) }, ecran: null,
    api: apiPleinEcran(doc, cible), ...extra,
  });
  return { cible, zone, doc, plein };
}

test('★ plein écran — l’état se relit sur le document à chaque `fullscreenchange`', async () => {
  const { cible, doc, plein } = attelage();
  assert.equal(plein.disponible, true);
  assert.equal(plein.actif(), false);

  await plein.basculer();
  doc.emettre('fullscreenchange');
  assert.equal(plein.actif(), true);
  assert.equal(cible.dataset.pleinEcran, '1');

  // ★ LE POINT CENTRAL : `Échap`. Le navigateur sort SANS nous prévenir
  // autrement que par l'évènement. Un drapeau tenu ici dirait encore « oui ».
  doc.fullscreenElement = null;
  doc.emettre('fullscreenchange');
  assert.equal(plein.actif(), false);
  assert.equal(cible.dataset.pleinEcran, undefined,
    'la marque de mise en page a survécu à la sortie');
  plein.detruire();
});

test('★ plein écran — le plein écran d’un AUTRE élément n’allume pas notre bouton', () => {
  const { doc, plein } = attelage();
  doc.fullscreenElement = { unAutre: true };
  doc.emettre('fullscreenchange');
  assert.equal(plein.actif(), false);
  plein.detruire();
});

test('★ plein écran — les abonnés sont prévenus, et le désabonnement les tait', async () => {
  const { doc, plein } = attelage();
  let vus = 0;
  const off = plein.on(() => { vus += 1; });
  await plein.basculer();
  doc.emettre('fullscreenchange');
  assert.equal(vus, 1);
  off();
  doc.fullscreenElement = null;
  doc.emettre('fullscreenchange');
  assert.equal(vus, 1);
  plein.detruire();
});

test('★ plein écran — sans API, tout est inerte et rien n’explose', async () => {
  const zone = noeudFactice();
  const plein = creerPleinEcran({ cible: noeudFactice(), zone, doc: documentFactice(), api: null });
  assert.equal(plein.disponible, false);
  assert.equal(plein.actif(), false);
  assert.equal(await plein.basculer(), false);
  plein.detruire();
});

test('★ plein écran — `detruire` rend l’écouteur du document et les écouteurs de la zone', async () => {
  const { doc, zone, plein } = attelage();
  await plein.basculer();
  doc.emettre('fullscreenchange');
  assert.ok(zone.ecouteurs.length > 0, 'la zone n’écoute rien en plein écran');
  plein.detruire();
  assert.equal(doc.combienDEcouteurs('fullscreenchange'), 0);
  assert.equal(zone.ecouteurs.length, 0, 'des écouteurs ont survécu à la page');
});

test('★ plein écran — la zone n’écoute QUE pendant le plein écran', async () => {
  const { doc, zone, plein } = attelage();
  assert.equal(zone.ecouteurs.length, 0, 'la zone écoute déjà hors plein écran');
  await plein.basculer();
  doc.emettre('fullscreenchange');
  const dedans = zone.ecouteurs.length;
  assert.ok(dedans >= 4, 'survol, sortie, mouvement et appui : les quatre voies');
  doc.fullscreenElement = null;
  doc.emettre('fullscreenchange');
  assert.equal(zone.ecouteurs.length, 0);
  plein.detruire();
});

test('★ plein écran — les commandes se présentent à l’entrée, puis s’effacent', async () => {
  const { doc, zone, plein } = attelage();
  await plein.basculer();
  doc.emettre('fullscreenchange');
  // Au moment où l'image prend tout l'écran, rien n'indique où sont passées les
  // commandes : on les montre une fois, à leur place.
  assert.equal(zone.dataset.commandes, 'vues');
  await new Promise((f) => setTimeout(f, DELAI_PRESENTATION + 60));
  assert.equal(zone.dataset.commandes, undefined,
    'la présentation ne s’efface pas : la règle « au survol » est trahie');
  plein.detruire();
});

test('★ plein écran — un doigt BASCULE, une souris SURVOLE', async () => {
  const { doc, zone, plein } = attelage();
  await plein.basculer();
  doc.emettre('fullscreenchange');
  const tirer = (nom) => (zone.ecouteurs.find(([n]) => n === nom) || [])[1];
  const appui = tirer('pointerdown');
  const entree = tirer('pointerenter');
  const sortie = tirer('pointerleave');

  delete zone.dataset.commandes;
  // ★ Le doigt : un appui montre, le suivant cache. Sans la distinction de
  //   `pointerType`, le `pointerenter` que le tactile émet juste avant le
  //   `pointerdown` ferait apparaître puis disparaître la barre dans le même
  //   geste — un clignotement au lieu d'une révélation.
  entree({ pointerType: 'touch' });
  assert.equal(zone.dataset.commandes, undefined, 'un doigt ne survole pas');
  appui({ pointerType: 'touch', target: zone });
  assert.equal(zone.dataset.commandes, 'vues');
  appui({ pointerType: 'touch', target: zone });
  assert.equal(zone.dataset.commandes, undefined);

  // ★ Sauf s'il vise une commande : le bouton ne doit pas s'évanouir sous le
  //   doigt qui l'actionne.
  const bouton = { closest: (sel) => (sel.includes('button') ? bouton : null) };
  appui({ pointerType: 'touch', target: bouton });
  assert.equal(zone.dataset.commandes, 'vues');
  appui({ pointerType: 'touch', target: bouton });
  assert.equal(zone.dataset.commandes, 'vues', 'la barre a fui le doigt qui la visait');

  // ★ La souris : elle survole, et un appui ne bascule rien chez elle.
  delete zone.dataset.commandes;
  entree({ pointerType: 'mouse' });
  assert.equal(zone.dataset.commandes, 'vues');
  appui({ pointerType: 'mouse', target: zone });
  assert.equal(zone.dataset.commandes, 'vues');
  sortie({ pointerType: 'mouse' });
  assert.equal(zone.dataset.commandes, undefined);
  plein.detruire();
});

/* ═══════════ 3. Le paysage : demandé, jamais exigé ═══════════ */

test('★ paysage — rien n’est tenté sur un pointeur fin', async () => {
  let appele = false;
  const ecran = { orientation: { lock() { appele = true; return Promise.resolve(); } } };
  assert.equal(await verrouillerPaysage(ecran, false), false);
  assert.equal(appele, false, 'un moniteur de bureau n’a pas d’orientation à verrouiller');
});

test('★ paysage — le repli est SILENCIEUX : refus, absence, ou exception', async () => {
  // iOS : l'API n'existe pas du tout.
  assert.equal(await verrouillerPaysage({}, true), false);
  assert.equal(await verrouillerPaysage(null, true), false);
  // Refus (le cas courant : hors plein écran, ou navigateur qui n'en veut pas).
  const refus = { orientation: { lock: () => Promise.reject(new Error('NotSupportedError')) } };
  assert.equal(await verrouillerPaysage(refus, true), false);
  // Exception synchrone.
  const casse = { orientation: { lock() { throw new Error('non'); } } };
  assert.equal(await verrouillerPaysage(casse, true), false);
});

test('★ paysage — sur un doigt, c’est bien « landscape » qui est demandé', async () => {
  let demande = null;
  const ecran = { orientation: { lock(v) { demande = v; return Promise.resolve(); } } };
  assert.equal(await verrouillerPaysage(ecran, true), true);
  assert.equal(demande, 'landscape');
});

test('★ paysage — l’orientation est RENDUE à la sortie, et à la destruction', async () => {
  let rendus = 0;
  const ecran = {
    orientation: { lock: () => Promise.resolve(), unlock() { rendus += 1; } },
  };
  const { doc, plein } = attelage({ ecran, fenetre: { matchMedia: () => ({ matches: true }) } });
  await plein.basculer();
  doc.emettre('fullscreenchange');
  assert.equal(rendus, 0, 'rendue avant même d’avoir servi');
  // Sortie par `Échap` : le verrou survivrait sous la page suivante, qui
  // n'aurait plus aucun bouton pour le lever.
  doc.fullscreenElement = null;
  doc.emettre('fullscreenchange');
  assert.equal(rendus, 1);
  plein.detruire();
  assert.ok(rendus >= 2, 'la destruction ne rend pas l’orientation');
});

test('★ paysage — `libererOrientation` ne jette jamais', () => {
  assert.doesNotThrow(() => libererOrientation(null));
  assert.doesNotThrow(() => libererOrientation({}));
  assert.doesNotThrow(() => libererOrientation({ orientation: { unlock() { throw new Error('non'); } } }));
});

/* ═══════════ 4. Le câblage, qui ne se voit qu’en lisant plusieurs fichiers ═══════════ */

test('★ câblage — la barre ne dessine le bouton que s’il peut agir', () => {
  const transport = sansCommentaires(lire('./transport.js'));
  assert.match(transport, /plein\s*&&\s*plein\.disponible/,
    'le bouton de plein écran est dessiné sans vérifier qu’il peut agir');
  // L'état ne vient pas d'un drapeau de la barre : elle interroge le contrôleur.
  assert.match(transport, /const dedans = plein\.actif\(\)/);
  assert.doesNotMatch(transport, /aria-pressed/,
    'un nom accessible variable ET `aria-pressed` produisent une annonce contradictoire');
});

test('★ câblage — l’infobulle du plein écran suit l’état, et ce n’est pas un `title`', () => {
  const transport = sansCommentaires(lire('./transport.js'));
  assert.match(transport, /infobuller\(bPlein, libellePleinEcran\)/,
    'la bulle du plein écran n’est pas branchée, ou pas sur une fonction');
  assert.doesNotMatch(transport, /bPlein\.setAttribute\('title'/,
    'l’attribut `title` natif est banni : il n’est ni stylable, ni patient');
  // Une chaîne figée aurait annoncé « Passer en plein écran » alors qu'on en sort.
  assert.match(lire('./infobulle.js'), /typeof texte === 'function'/,
    '`infobuller` ne sait plus lire un libellé qui change');
});

test('★ câblage — l’infobulle se monte DANS la scène quand celle-ci occupe l’écran', () => {
  // `<body>` n'est plus peint du tout pendant le plein écran : une bulle montée
  // là serait invisible, et c'est justement là qu'elle sert — les dalles de la
  // jauge et les boutons de transport, eux, sont bien à l'écran.
  const bulle = sansCommentaires(lire('./infobulle.js'));
  assert.match(bulle, /function hote\(\)/, 'la bulle ne choisit plus son hôte');
  assert.match(bulle, /hote\(\)\.appendChild\(bulle\)/,
    'la bulle est encore montée d’office sur `document.body`');
  assert.doesNotMatch(bulle, /document\.body\.appendChild/);
});

test('★ câblage — la page agrandit la COLONNE, pas le seul cadre de la scène', () => {
  const page = lire('./pages/demonstration.js');
  // Agrandir `#scene` ferait disparaître la barre de transport — donc le bouton
  // qui permet d'en ressortir. C'est `colonneGauche` (`.demo__scene`) qui porte
  // les deux.
  assert.match(page, /cible:\s*\(\)\s*=>\s*colonneGauche/);
  assert.match(page, /zone:\s*\(\)\s*=>\s*transport\s*&&\s*transport\.element/);
  assert.match(page, /pleinEcran\.detruire\(\)/,
    'le contrôleur survit à la page, donc le verrou d’orientation aussi');
});

test('★ câblage — la zone révélatrice fait bien le quart annoncé', () => {
  const css = lire('../styles/controls.css');
  const bloc = css.match(/\.demo__scene\[data-plein-ecran\] \.transport-groupe \{([\s\S]*?)\n\}/);
  assert.ok(bloc, 'la zone révélatrice n’est plus décrite dans controls.css');
  const hauteur = bloc[1].match(/\n\s*height:\s*([\d.]+)%/);
  assert.ok(hauteur, 'la zone n’a plus de hauteur en pourcentage');
  assert.equal(Number(hauteur[1]) / 100, PART_REVELATRICE,
    'le CSS et `PART_REVELATRICE` ont divergé : le « quart inférieur » n’en est plus un');
  // Le plancher : une cible tapable qu'on ne peut pas faire apparaître ne vaut
  // pas mieux qu'une cible trop petite (56 + 24 + 12 + 16 = 108).
  assert.match(bloc[1], /min-height:\s*108px/);
});

test('★ câblage — le contrôleur masqué reste FOCUSABLE, sans quoi le mode est un piège', () => {
  const css = lire('../styles/controls.css');
  const bloc = css.match(/\.demo__scene\[data-plein-ecran\] \.transport-groupe \{([\s\S]*?)\n\}/)[1];
  // `visibility: hidden` et `display: none` sortent un contrôle de l'ordre de
  // tabulation — le défaut exact que l'attribut `disabled` nous fait éviter
  // partout ailleurs dans ce fichier.
  assert.doesNotMatch(bloc, /visibility:\s*hidden/);
  assert.doesNotMatch(bloc, /display:\s*none/);
  assert.match(bloc, /opacity:\s*0/);
  assert.match(css, /\.transport-groupe:focus-within \{ opacity: 1; \}/,
    'le clavier ne fait plus paraître le contrôleur : il est inatteignable');

  // ★ Et la recette du défaut de compositeur Firefox n'est pas rejouée : une
  //   opacité animée en même temps qu'une transformation individuelle ou qu'un
  //   `filter`, sur le même élément (CONTRACTS §3.2).
  assert.doesNotMatch(bloc, /(?:^|[\s;{])(?:translate|rotate|scale|filter)\s*:/m,
    'opacité animée ET transformation individuelle : le nœud sera composé à l’identité');
});

test('★ câblage — les deux catalogues portent les quatre libellés', async () => {
  const { fr } = await import('../i18n/fr.js');
  const { en } = await import('../i18n/en.js');
  for (const cle of ['pleinEcran', 'sortiePleinEcran', 'pleinEcranCourt', 'sortiePleinEcranCourt']) {
    assert.equal(typeof fr.transport[cle], 'string', `fr : ${cle}`);
    assert.equal(typeof en.transport[cle], 'string', `en : ${cle}`);
  }
  // Le bouton dit ce qu'un clic FERA : les deux sens doivent se distinguer.
  assert.notEqual(fr.transport.pleinEcran, fr.transport.sortiePleinEcran);
  assert.notEqual(fr.transport.pleinEcranCourt, fr.transport.sortiePleinEcranCourt);
});
