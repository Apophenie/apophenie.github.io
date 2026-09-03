/**
 * ★ LA BARRE DE TRANSPORT — l'ordre des contrôles, et le sélecteur de vitesse.
 *
 * Il n'y avait aucun test ici, et l'ordre des boutons n'est pas décoratif : il
 * dit la PORTÉE de chacun. C'est ce que l'auteur a corrigé — « à placer avant
 * redites pour éviter qu'on pense que c'est aux redites qu'il s'applique » —,
 * et rien ne l'aurait retenu.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

/* ── un document de laboratoire, comme dans `resultat.test.js` ───────────── */

class Noeud {
  constructor(balise) {
    this.tagName = balise;
    this.enfants = [];
    this.classes = new Set();
    this.attributs = {};
    this.textContent = '';
    this.dataset = {};
    this.style = {};
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      contains: (c) => this.classes.has(c),
      toggle: (c) => this.classes.add(c),
    };
  }

  set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }

  get className() { return [...this.classes].join(' '); }

  set innerHTML(v) { this.propre = String(v); }

  setAttribute(k, v) { this.attributs[k] = String(v); }

  getAttribute(k) { return k in this.attributs ? this.attributs[k] : null; }

  removeAttribute(k) { delete this.attributs[k]; }

  addEventListener(nom, cb) { (this.ecouteurs ||= {})[nom] = cb; }

  appendChild(n) { this.enfants.push(n); return n; }

  replaceChild(neuf, ancien) {
    const i = this.enfants.indexOf(ancien);
    if (i >= 0) this.enfants[i] = neuf; else this.enfants.push(neuf);
    return ancien;
  }

  querySelector(sel) {
    const classe = sel.replace(/^\./, '');
    for (const n of parcourir(this)) if (n !== this && n.classes.has(classe)) return n;
    return null;
  }

  get firstChild() { return this.enfants[0] || null; }
}

function* parcourir(noeud) {
  if (!noeud || !noeud.tagName) return;
  yield noeud;
  for (const enfant of noeud.enfants) yield* parcourir(enfant);
}

globalThis.document = {
  createElement: (b) => new Noeud(b),
  createElementNS: (_ns, b) => new Noeud(b),
  createTextNode: (d) => ({ textContent: String(d) }),
};

const { creerTransport } = await import('./transport.js');
const { fr } = await import('../i18n/fr.js');

/** Un lecteur de façade : juste ce que la barre lit (le contrat §3.3). */
const lecteurFactice = (extra = {}) => ({
  steps: [{ title: 'une' }, { title: 'deux' }],
  vitesse: 1,
  reduced: false,
  playing: false,
  atStart: true,
  atEnd: false,
  atHinge: false,
  stepIndex: 0,
  currentTime: 0,
  total: 1000,
  on: () => () => {},
  seekToStep() {}, toStart() {}, prev() {}, next() {}, toEnd() {}, play() {}, pause() {},
  ...extra,
});

const roles = (transport) => [...parcourir(transport.element)]
  .filter((n) => n.dataset && n.dataset.role)
  .map((n) => n.dataset.role);

/* ═════════════════════════════════════════════════════════════════════════ */

/**
 * ★ **L'ORDRE PORTE UNE PORTÉE, ET L'ADJACENCE SE LIT COMME UNE SUBORDINATION.**
 *
 * > « À placer avant redites pour éviter qu'on pense que c'est aux redites
 * >   qu'il s'applique. » (l'auteur)
 *
 * Je l'avais mis APRÈS, au motif que les deux règlent le rythme. Mauvais
 * argument : « redites accélérées » suivi de « vitesse » se lit « la vitesse
 * des redites », ce qui est faux — la vitesse porte sur toute la lecture, les
 * redites sur ce qui se répète. Le plus général passe devant.
 */
test('★ transport — la vitesse précède les redites', () => {
  const tr = creerTransport(lecteurFactice(), {}, { repetitions: 5 });
  const ordre = roles(tr);
  const iVitesse = ordre.indexOf('vitesse');
  const iRedites = ordre.indexOf('redites');
  assert.ok(iVitesse >= 0, 'le sélecteur de vitesse manque');
  assert.ok(iRedites >= 0, 'la bascule des redites manque');
  assert.ok(iVitesse < iRedites,
    `la vitesse doit précéder les redites, vu ${ordre.join(' → ')}`);
});

/**
 * ★ **IL RESSEMBLE AUX AUTRES, ET C'EST TOUT L'INTÉRÊT DU `<select>` COUVRANT.**
 *
 * > « Homogénéise le design : x1 doit être à la même hauteur et taille que les
 * >   picto, et juste en dessous, même police que pour le reste, "vitesse". »
 * >   (l'auteur)
 *
 * Un `<select>` n'affiche que le texte de son option et ne sait pas porter deux
 * lignes. On dessine donc le bouton comme les six autres — une zone de la
 * hauteur d'une icône, un libellé dessous — et le `<select>` s'étale par-dessus,
 * invisible : il garde son clavier, son nom accessible et le sélecteur roulant
 * des mobiles.
 */
test('★ transport — le facteur tient la place d’une icône, sous son libellé', () => {
  const tr = creerTransport(lecteurFactice(), {}, { repetitions: 5 });
  const bouton = [...parcourir(tr.element)].find((n) => n.dataset.role === 'vitesse');
  const facteur = [...parcourir(bouton)].find((n) => n.classes.has('transport__facteur'));
  const libelle = [...parcourir(bouton)].find((n) => n.classes.has('transport__libelle'));
  assert.ok(facteur, 'le facteur manque');
  assert.equal(facteur.textContent, fr.transport.vitesseFacteur.replace('{n}', '1'));
  assert.ok(libelle, 'le libellé manque');
  assert.equal(libelle.textContent, fr.transport.vitesseCourt);
  // ★ NI LIÈVRE NI TORTUE : « vu le design, abandonne les lièvre et tortue »
  //   (l'auteur). Deux systèmes de signes dans une même rangée — des émoji en
  //   couleur à côté de six icônes tracées — c'est une rangée qui n'en est plus
  //   une. Le facteur dit tout ce que l'animal disait, et plus précisément.
  const tout = [...parcourir(bouton)].map((n) => n.textContent).join('');
  assert.ok(!/[🐇🐢]/u.test(tout), 'les animaux ne reviennent pas');
});

test('★ transport — les treize vitesses, et le nom accessible sur le select', () => {
  const tr = creerTransport(lecteurFactice(), {}, { repetitions: 5 });
  const choix = [...parcourir(tr.element)].find((n) => n.classes.has('transport__vitesse-choix'));
  assert.ok(choix, 'le select manque');
  assert.equal(choix.getAttribute('aria-label'), fr.transport.vitesse);
  const options = [...parcourir(choix)].filter((n) => n.tagName === 'option');
  assert.equal(options.length, 13, 'les treize valeurs demandées');
  // ★ LA PLUS RAPIDE EN HAUT : la liste se déroule vers le bas, et l'œil qui
  //   descend doit voir le rythme RALENTIR. C'est la convention des lecteurs en
  //   ligne, et l'ordre du geste plutôt que celui du tableur.
  assert.equal(options[0].getAttribute('value'), '10');
  assert.equal(options[options.length - 1].getAttribute('value'), '0.25');
  // ⚠️ La DÉCIMALE en français s'écrit avec une virgule, sans `Intl` (§4.4).
  assert.equal(options[options.length - 1].textContent, '×0,25');
});

/**
 * ⚠️ **PAS DE RÉGLAGE QUI NE PUISSE AGIR** — même règle que le son et le plein
 *   écran. Sous `prefers-reduced-motion` ou sans WAAPI, le moteur ne joue pas :
 *   il pose l'image d'un instant. Régler la vitesse d'une image fixe serait
 *   exactement le mensonge que cette barre s'interdit.
 */
test('★ transport — pas de sélecteur quand le mouvement est réduit', () => {
  const tr = creerTransport(lecteurFactice({ reduced: true }), {}, { repetitions: 5 });
  assert.ok(!roles(tr).includes('vitesse'), 'un réglage inerte ne s’affiche pas');
});

/* ═════════════════════ La barre sur DEUX lignes ══════════════════════════ */

/** La barre elle-même : `.transport-groupe` porte la jauge PUIS la rangée. */
const rangee = (tr) => [...parcourir(tr.element)].find((n) => n.classes.has('transport'));

/** Tout ce que la barre peut porter : neuf contrôles, le maximum. */
const options = (extra = {}) => ({
  repetitions: 5,
  sons: { disponible: true, debloque: false, on: () => () => {} },
  pleinEcran: { disponible: true, actif: () => false, basculer() {}, on: () => () => {} },
  ...extra,
});

/**
 * ⚠️ **LE DÉBORDEMENT DE LA SCÈNE VENAIT DE SES COMMANDES.**
 *
 * > « En portrait, la scène déborde sur le côté, elle ne s'adapte pas
 * >   correctement à la taille de l'écran. Si c'est l'ajout de plus d'éléments
 * >   dans le player, alors ce player doit passer sur 2 lignes sur écran étroit
 * >   (en coupant après Fin, pour que vitesse, redite, agrandir et son soient
 * >   sur la 2nde ligne). » (l'auteur)
 *
 * Mesuré sur un écran de 390 px : la rangée réclamait 466 px (526 avec le son),
 * la colonne `.demo__scene` s'élargissait pour la contenir, et le SVG, en
 * `width: 100%`, sortait de l'écran à sa suite. La `viewBox` du moteur n'y
 * était pour rien.
 *
 * ★ **UN CONTENEUR PLUTÔT QU'UN SEUIL EN PIXELS.** La barre porte de six à neuf
 *   contrôles selon ce que le navigateur permet, et les libellés n'ont pas la
 *   même longueur en français et en anglais : aucune largeur écrite ici
 *   n'aurait été juste pour toutes les combinaisons. Les quatre réglages réunis
 *   dans un seul élément flex, c'est le navigateur qui replie — et la coupure
 *   tombe toujours APRÈS « Fin », par construction et non par arithmétique.
 */
test('★ transport — les réglages font un bloc, et la coupure tombe après « Fin »', () => {
  const tr = creerTransport(lecteurFactice(), {}, options());
  const barre = rangee(tr);
  assert.deepEqual(
    barre.enfants.map((n) => n.dataset.role || n.className),
    ['debut', 'precedent', 'lecture', 'suivant', 'fin', 'transport__reglages'],
    'la rangée doit se lire : les cinq commandes, puis UN bloc de réglages',
  );
  assert.deepEqual(
    barre.enfants[5].enfants.map((n) => n.dataset.role),
    ['vitesse', 'redites', 'son', 'pleinEcran'],
    'les quatre réglages demandés, dans l’ordre, et tous dans le même bloc',
  );
});

/** Une boîte flex sans enfant compterait quand même dans la gouttière de la
 *  rangée : elle ajouterait une gouttière après « Fin » pour ne rien contenir.
 *  Le cas se produit vraiment — la révélation du logo ne règle ni redites ni
 *  son, et le mouvement réduit retire jusqu'à la vitesse. */
test('★ transport — pas de bloc de réglages quand il n’y a rien à régler', () => {
  const tr = creerTransport(lecteurFactice({ reduced: true }), {}, {});
  const barre = rangee(tr);
  assert.equal(barre.enfants.length, 5, 'un conteneur vide traîne dans la rangée');
  assert.ok(!barre.enfants.some((n) => n.classes.has('transport__reglages')));
});

/** ★ Et c'est bien `flex-wrap` qui replie : sans lui, la rangée pousse la
 *  colonne au lieu de passer à la ligne, et le bloc de réglages ne sert à rien.
 *  Les deux moitiés de la correction vivent dans deux fichiers ; seule une
 *  lecture croisée les tient ensemble. */
test('★ transport — la rangée sait se replier (le CSS le dit)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const css = readFileSync(fileURLToPath(new URL('../styles/controls.css', import.meta.url)), 'utf8');
  const bloc = css.match(/\n\.transport \{([\s\S]*?)\n\}/);
  assert.ok(bloc, 'la rangée n’est plus décrite dans controls.css');
  assert.match(bloc[1], /flex-wrap:\s*wrap/,
    'sans `flex-wrap`, la rangée déborde au lieu de passer à la ligne');
  assert.match(css, /\.transport__reglages \{[\s\S]*?flex-wrap:\s*wrap[\s\S]*?\n\}/,
    'le bloc des réglages doit se replier lui aussi sur un écran très étroit');
});
