/**
 * `dom.js` — le FILET de dernier recours.
 *
 * ★ Pourquoi ces tests existent : un « 1 » orphelin, en haut à gauche de la
 * scène, hors de toute composition, pendant la lecture d'une démonstration qui
 * prétend prouver quelque chose. Le compilateur refuse désormais un nœud sans
 * position (garde de `compile.js`), mais rien ne garantissait qu'une valeur ne
 * devienne pas non finie PLUS TARD, en lecture — et là, deux mécanismes
 * silencieux la ramenaient à l'origine :
 *
 *   1. `applyBase` retombait sur « translate: 0 0 » ;
 *   2. `formatValue` blanchit toute valeur non finie en 0.
 *
 * La règle testée ici est celle qu'on a tranchée : **mieux vaut un élément
 * manquant qu'un chiffre faux au milieu d'une preuve.** Le nœud est retiré de
 * la vue et l'anomalie est écrite en console — jamais peinte dans le coin.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyBase, applyProp, applyDiscrete, formatValue, sansPosition, valeurUtilisable,
  createElementFor, porteurDe, contenuDe, nomCss, enchainer, ORIGINE_CAMERA,
} from '../dom.js';
import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/**
 * Un élément de test minimal — `dom.js` ne touche qu'à `style`, aux attributs
 * et au texte. Pas de jsdom : le moteur visuel n'a aucune dépendance, et ses
 * tests non plus (CONTRACTS §0.1).
 */
function faireElement(id, { tagName = 'text', isConnected = true } = {}) {
  const attrs = new Map([['data-nhl-id', id]]);
  return {
    tagName,
    isConnected,
    style: {},
    textContent: '',
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    hasAttribute: (k) => attrs.has(k),
    querySelector: () => null,
    attrs,
  };
}

/** Capture ce que le moteur écrit en console pendant l'appel. */
function enEcoutant(fn) {
  const dits = [];
  const vrai = console.error;
  console.error = (...a) => dits.push(a.join(' '));
  try { fn(); } finally { console.error = vrai; }
  return dits;
}

// ───────────────────────── 1. la position manque

test('un nœud sans position n’est PAS peint à l’origine : il est retiré de la vue', () => {
  const el = faireElement('sans-place');
  const dits = enEcoutant(() => applyBase(el, { base: { translate: null, opacity: 1 } }));

  assert.equal(el.style.transform, undefined,
    'aucune position ne doit être écrite — surtout pas « translate(0px, 0px) », le coin de la scène');
  assert.equal(el.style.visibility, 'hidden', 'le nœud est rendu invisible');
  assert.ok(sansPosition(el));
  assert.equal(dits.length, 1, 'et l’anomalie est dite, une fois');
  assert.match(dits[0], /sans-place/);
});

// ───────────────────────── 2. la position existe mais n’en est pas une

test('une coordonnée non finie masque le nœud au lieu de le coller au bord', () => {
  // Le rappel du mécanisme : sans filet, c’est 0 qui sort — donc le coin.
  assert.equal(formatValue('translate', { x: NaN, y: NaN }), 'translate(0px, 0px)');
  assert.equal(formatValue('translate', { x: NaN, y: 240 }), 'translate(0px, 240px)');

  const el = faireElement('x9_d0x0');
  enEcoutant(() => applyProp(el, 'translate', { x: 600, y: 240 }));
  assert.equal(el.style.transform, 'translate(600px, 240px)');

  enEcoutant(() => applyProp(el, 'translate', { x: NaN, y: 240 }));
  assert.equal(el.style.transform, 'translate(600px, 240px)', 'la dernière position VALIDE reste écrite, aucune n’est inventée');
  assert.equal(el.style.visibility, 'hidden');
  assert.ok(sansPosition(el));
});

test('le masque est réversible : un seek en arrière retrouve un nœud visible', () => {
  const el = faireElement('reversible');
  enEcoutant(() => applyProp(el, 'translate', { x: Infinity, y: 0 }));
  assert.equal(el.style.visibility, 'hidden');

  applyProp(el, 'translate', { x: 420, y: 300 });
  assert.equal(el.style.visibility, '', 'le nœud revient dès qu’une position utilisable arrive');
  assert.equal(el.style.transform, 'translate(420px, 300px)');
  assert.equal(sansPosition(el), false);
});

test('seuls les canaux géométriques sont concernés : une opacité reste une opacité', () => {
  assert.equal(valeurUtilisable('translate', { x: 1, y: 2 }), true);
  assert.equal(valeurUtilisable('translate', { x: 1, y: undefined }), false);
  assert.equal(valeurUtilisable('scale', NaN), false);
  assert.equal(valeurUtilisable('opacity', NaN), true, 'une opacité non finie retombe sur 0 : invisible, donc sans danger');

  const el = faireElement('teinte');
  applyProp(el, 'fill', '#fff');
  assert.equal(el.style.fill, '#fff');
  assert.equal(el.style.visibility, undefined);
});

// ───────────────────────── 3. le canal discret : du texte sans place

test('un nœud sans position ne reçoit PAS son texte — c’est lui qui rendrait le défaut lisible', () => {
  const el = faireElement('compteur');
  enEcoutant(() => applyProp(el, 'translate', { x: NaN, y: NaN }));

  const dits = enEcoutant(() => applyDiscrete(el, 'text', '1'));
  assert.equal(el.textContent, '', 'le « 1 » n’est jamais écrit : un nœud sans place n’a rien à dire');
  assert.equal(dits.length, 1);
  assert.match(dits[0], /SANS POSITION/);
});

test('un nœud détaché du document est signalé plutôt qu’écrit en silence', () => {
  const el = faireElement('detache', { isConnected: false });
  applyProp(el, 'translate', { x: 100, y: 100 });
  const dits = enEcoutant(() => applyDiscrete(el, 'text', '15'));
  assert.equal(el.textContent, '');
  assert.equal(dits.length, 1);
  assert.match(dits[0], /DÉTACHÉ/);
});

test('le cas nominal reste intact : texte écrit, nœud visible', () => {
  const el = faireElement('nominal');
  applyProp(el, 'translate', { x: 380, y: 304 });
  const dits = enEcoutant(() => applyDiscrete(el, 'text', '15'));
  assert.equal(el.textContent, '15');
  assert.deepEqual(dits, []);
});

// ───────────────────────── 4. à la compilation, le geste fautif est NOMMÉ

const sc = (steps, tokens) => ({ version: 1, tokens, steps });

test('l’éclatement d’un nombre nomme le chiffre qu’il n’a pas su placer', () => {
  // Métriques inutilisables → toutes les positions deviennent non finies.
  // Sans cette vérification, le « 1 » de « 15 » se peindrait à l’origine.
  assert.throws(
    () => compile(
      sc([{
        id: 'a',
        title: 'On réduit à un seul chiffre',
        ops: [{
          op: 'reduce',
          target: 't0',
          digits: [{ id: 'd0', text: '1', kind: 'digit' }, { id: 'd1', text: '5', kind: 'digit' }],
          to: { id: 'r', text: '6', kind: 'number' },
        }],
      }], [{ id: 't0', text: '15', kind: 'number' }]),
      { metrics: { fontSize: 48, advance: NaN, capHeight: 35 } },
    ),
    /le chiffre « 1 » de l'éclatement de « 15 »/,
  );
});

test('une accolade qui ne sait pas où se tracer le dit, plutôt que de se poser dans le coin', () => {
  assert.throws(
    () => compile(
      sc([{
        id: 'a',
        title: 'On additionne',
        ops: [{ op: 'sum', targets: ['n0', 'n1'], to: { id: 'q', text: '9', kind: 'number' } }],
      }], [{ id: 'n0', text: '4' }, { id: 'n1', text: '5' }]),
      { metrics: { fontSize: 48, advance: NaN, capHeight: 35 } },
    ),
    /le tracé de l’accolade/,
  );
});

// ───────────────── 5. un canal, un élément : la chaîne de position
//
// ★ Le vrai défaut, celui que les quatre sections ci-dessus n'auraient jamais
// attrapé : sous Firefox, un jeton neuf des étapes « On additionne » et
// « On réduit à un seul chiffre » était PEINT à l'origine du `viewBox` alors
// que sa position, côté moteur, était parfaitement juste — `getComputedStyle`
// et `getBoundingClientRect` rendaient la bonne valeur, et le filet ci-dessus
// ne se déclenchait donc jamais.
//
// Cause : Firefox construit la transformation qu'il confie au compositeur sans
// les **propriétés individuelles** `translate` / `rotate` / `scale` dès qu'il
// promeut un élément en couche, et une animation d'opacité suffit à le
// promouvoir. Un `transform`, lui, est honoré.
//
// Un premier correctif a déclaré les canaux avec `will-change` : une DEMANDE,
// que le compositeur n'est pas tenu d'exaucer — et sur le bureau de l'auteur il
// ne l'a pas exaucée. Ce qui suit teste le correctif STRUCTUREL qui l'a
// remplacé : plus aucune propriété individuelle nulle part, chaque canal
// géométrique est un `transform` sur SON PROPRE élément.

/**
 * Un document SVG minimal — juste ce que `dom.js` utilise. Toujours pas de
 * jsdom : le moteur visuel n'a aucune dépendance, ses tests non plus.
 */
function faireDocument() {
  const creer = (name) => {
    const attrs = new Map();
    const noeud = {
      tagName: name,
      isConnected: true,
      style: {},
      textContent: '',
      enfants: [],
      getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      setAttribute: (k, v) => attrs.set(k, String(v)),
      removeAttribute: (k) => attrs.delete(k),
      hasAttribute: (k) => attrs.has(k),
      appendChild: (c) => { noeud.enfants.push(c); return c; },
      querySelector: (sel) => descendants(noeud).find((d) => d.tagName === sel) || null,
    };
    return noeud;
  };
  return { createElementNS: (_ns, name) => creer(name) };
}

function descendants(noeud) {
  const out = [];
  for (const e of noeud.enfants || []) { out.push(e); out.push(...descendants(e)); }
  return out;
}

/** Le nœud et toute sa descendance. */
function chaineEntiere(racine) {
  return [racine, ...descendants(racine)];
}

function avecDocument(fn) {
  const vrai = globalThis.document;
  globalThis.document = faireDocument();
  try { return fn(); } finally {
    if (vrai === undefined) delete globalThis.document; else globalThis.document = vrai;
  }
}

const METRICS = { fontSize: 48, advance: 28.8, capHeight: 35 };
const unToken = (over = {}) => ({
  id: 'x6_0', role: 'text', text: '1', kind: 'digit', w: 28.8,
  base: { translate: { x: 600, y: 240 }, opacity: 1, rotate: 0, scale: 1 }, ...over,
});

test('createElementFor rend une CHAÎNE : position, rotation, puis l’élément qui dessine', () => {
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });

    assert.equal(racine.tagName, 'g');
    assert.equal(racine.getAttribute('class'), 'nhl-pos');
    assert.equal(racine.getAttribute('data-nhl-id'), 'x6_0',
      'c’est la racine de la chaîne qu’on retrouve par son identifiant');

    const rot = racine.enfants[0];
    assert.equal(rot.getAttribute('class'), 'nhl-rot');

    const contenu = rot.enfants[0];
    assert.equal(contenu.tagName, 'text');
    assert.equal(contenu.textContent, '1');
    assert.equal(contenuDe(racine), contenu);
  });
});

test('chaque canal géométrique va sur SON élément, dans l’ordre translate → rotate → scale', () => {
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });
    const rot = racine.enfants[0];
    const contenu = rot.enfants[0];

    assert.equal(porteurDe(racine, 'translate'), racine);
    assert.equal(porteurDe(racine, 'rotate'), rot);
    assert.equal(porteurDe(racine, 'scale'), contenu);
    assert.equal(porteurDe(racine, 'opacity'), contenu);

    applyProp(racine, 'translate', { x: 600, y: 240 });
    applyProp(racine, 'rotate', 180);
    applyProp(racine, 'scale', 1.25);
    applyProp(racine, 'opacity', 0.5);

    assert.equal(racine.style.transform, 'translate(600px, 240px)');
    assert.equal(rot.style.transform, 'rotate(180deg)');
    assert.equal(contenu.style.transform, 'scale(1.25)');
    assert.equal(contenu.style.opacity, '0.5');

    // L'imbrication reproduit l'ordre dans lequel CSS applique les propriétés
    // individuelles : c'est ce dont dépendent `keyboard` et `alphabet`, qui
    // divisent leur recentrage par le zoom parce que la translation le subit.
    assert.deepEqual(chaineEntiere(racine).map((e) => e.style.transform),
      ['translate(600px, 240px)', 'rotate(180deg)', 'scale(1.25)']);
  });
});

test('AUCUNE propriété individuelle n’est écrite : c’est ce que Firefox perd à la composition', () => {
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });
    applyBase(racine, unToken());
    applyProp(racine, 'rotate', 42);

    for (const e of chaineEntiere(racine)) {
      assert.equal(e.style.translate, undefined, 'jamais la propriété individuelle « translate »');
      assert.equal(e.style.rotate, undefined, 'jamais la propriété individuelle « rotate »');
      assert.equal(e.style.scale, undefined, 'jamais la propriété individuelle « scale »');
    }
    assert.equal(nomCss('translate'), 'transform');
    assert.equal(nomCss('rotate'), 'transform');
    assert.equal(nomCss('scale'), 'transform');
  });
});

test('l’élément que l’opacité fait promouvoir en couche ne porte AUCUNE position', () => {
  avecDocument(() => {
    // C'est l'invariant qui met le défaut hors de portée : Firefox peut
    // composer ce nœud comme il veut, il n'a rien à perdre — ce sont ses
    // ancêtres qui le placent, et la transformation d'un ancêtre n'est pas une
    // faveur du compositeur.
    const racine = createElementFor(unToken(), { metrics: METRICS });
    applyBase(racine, unToken());

    const promu = porteurDe(racine, 'opacity');
    assert.equal(promu.style.transform, 'scale(1)',
      'le contenu ne porte que sa mise à l’échelle, jamais sa position');
    assert.ok(!/translate/.test(promu.style.transform || ''));
    assert.equal(racine.style.transform, 'translate(600px, 240px)',
      'la position vit sur l’enveloppe, qui n’est animée par aucune opacité');
  });
});

test('toute la chaîne partage UNE origine, fixe, qui ne dépend d’aucune boîte (règle 4)', () => {
  // ★ C'est la condition de l'exactitude. Trois canaux sur un seul élément
  // partageaient une origine ; répartis sur trois éléments, `fill-box` leur en
  // donnerait trois différentes — la boîte d'une enveloppe est celle de son
  // contenu DÉJÀ mis à l'échelle. Mesuré sous Firefox 154 : plusieurs dizaines
  // d'unités viewBox d'écart dès que rotation et échelle jouent ensemble.
  // Avec un point fixe commun, la composition est une associativité de
  // matrices : exacte, dans n'importe quel moteur.
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });
    const rot = racine.enfants[0];
    const contenu = rot.enfants[0];

    for (const e of [rot, contenu]) {
      assert.equal(e.style.transformBox, 'view-box');
      assert.equal(e.style.transformOrigin, '0px 0px',
        'l’ancre de mise en page du nœud — celle que layout.js positionne');
    }
    assert.equal(racine.style.transformBox, undefined,
      'une translation ne dépend d’aucun point de référence : on n’en invente pas un');
    assert.equal(racine.style.pointerEvents, 'none');
  });
});

test('la caméra tourne et recule autour du centre du viewBox, pas de son contenu', () => {
  avecDocument(() => {
    const vue = { tagName: 'g', style: {}, enfants: [], isConnected: true,
      getAttribute: () => null, setAttribute: () => {}, querySelector: () => null };
    const chaine = enchainer(vue, { origine: ORIGINE_CAMERA });
    assert.equal(chaine.rotate.style.transformOrigin, 'center');
    assert.equal(chaine.content.style.transformOrigin, 'center');
    assert.equal(chaine.rotate.style.transformBox, 'view-box');
  });
});

test('le masque « sans position » couvre la chaîne entière, pas le seul contenu', () => {
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });
    enEcoutant(() => applyProp(racine, 'translate', { x: NaN, y: 3 }));
    assert.equal(racine.style.visibility, 'hidden');
    assert.ok(sansPosition(racine));

    applyProp(racine, 'translate', { x: 10, y: 3 });
    assert.equal(racine.style.visibility, '');
  });
});

test('le canal discret écrit dans l’élément qui dessine, sous la chaîne', () => {
  avecDocument(() => {
    const racine = createElementFor(unToken(), { metrics: METRICS });
    applyDiscrete(racine, 'text', '15');
    assert.equal(contenuDe(racine).textContent, '15');
  });
});

test('porteurDe et contenuDe sont des projections : un élément hors chaîne se rend lui-même', () => {
  const el = faireElement('hors-chaine');
  assert.equal(porteurDe(el, 'translate'), el);
  assert.equal(contenuDe(el), el);
  assert.equal(porteurDe(null, 'translate'), null);
  assert.equal(contenuDe(null), null);
});
