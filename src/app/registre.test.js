import test from 'node:test';
import assert from 'node:assert/strict';

class Noeud {
  constructor(tagName) {
    this.tagName = tagName;
    this.enfants = [];
    this.attributs = {};
    this.style = {};
    this.classList = { add() {} };
  }
  set id(v) { this.attributs.id = v; }
  set textContent(v) { this.propre = String(v); this.enfants = []; }
  get textContent() { return (this.propre || '') + this.enfants.map((n) => n.textContent).join(''); }
  setAttribute(k, v) { this.attributs[k] = String(v); }
  getAttribute(k) { return this.attributs[k] ?? null; }
  removeAttribute(k) { delete this.attributs[k]; }
  addEventListener(k, f) { (this.ecouteurs ||= {})[k] = f; }
  appendChild(n) { this.enfants.push(n); return n; }
}

globalThis.document = {
  createElement: (tag) => new Noeud(tag),
  createTextNode: (text) => ({ textContent: String(text) }),
};

const { creerRegistre } = await import('./registre.js');

test('une réécriture technique est jouée sans ligne ni annonce dans le registre', () => {
  const handlers = new Map();
  const seeks = [];
  const lecteur = {
    steps: [
      { title: 'Addition', caption: '8 + 8 = 16' },
      { title: 'Réécriture', caption: '16 → 1 6', registre: false },
      { title: 'Addition', caption: '1 + 6 = 7' },
    ],
    stepIndex: 0,
    seekToStep: (i) => seeks.push(i),
    on: (event, f) => { handlers.set(event, f); return () => {}; },
  };
  const registre = creerRegistre(lecteur);
  const items = registre.element.enfants[1].enfants;
  assert.equal(items.length, 2, 'la charnière technique ne figure pas dans la liste');
  items[1].enfants[0].ecouteurs.click();
  assert.deepEqual(seeks, [2], 'un clic mène au vrai rang dans la scène');
  const annonce = registre.regionLive.textContent;
  handlers.get('stepenter')({ stepIndex: 1 });
  assert.equal(registre.regionLive.textContent, annonce, 'aucune annonce pour le tour de passe-passe');
  assert.equal(items[0].getAttribute('aria-current'), 'step');
  handlers.get('stepenter')({ stepIndex: 2 });
  assert.match(registre.regionLive.textContent, /1 \+ 6 = 7/);
  assert.equal(items[1].getAttribute('aria-current'), 'step');
});
