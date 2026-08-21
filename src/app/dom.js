/** Micro-outils DOM. Aucune dépendance, aucun framework. */

/**
 * Crée un élément.
 * @param {string} balise  'div', 'button.classe', 'p#id.a.b'
 * @param {Object<string,*>} [attrs]  attributs ; `texte` et `html` sont spéciaux
 * @param {(Node|string|null|undefined|Array)[]} [enfants]
 */
export function e(balise, attrs = {}, enfants = []) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(balise);
  const el = document.createElement(m && m[1] ? m[1] : 'div');
  if (m && m[2]) {
    for (const jeton of m[2].match(/[.#][\w-]+/g) || []) {
      if (jeton[0] === '.') el.classList.add(jeton.slice(1));
      else el.id = jeton.slice(1);
    }
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'texte') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'sur') for (const [ev, f] of Object.entries(v)) el.addEventListener(ev, f);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  ajouter(el, enfants);
  return el;
}

export function ajouter(parent, enfants) {
  for (const enfant of [].concat(enfants)) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    parent.appendChild(typeof enfant === 'string' ? document.createTextNode(enfant) : enfant);
  }
  return parent;
}

/** Élément SVG (les balises SVG exigent leur espace de noms). */
export function svg(balise, attrs = {}, enfants = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', balise);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'texte') el.textContent = v;
    else if (k === 'sur') for (const [ev, f] of Object.entries(v)) el.addEventListener(ev, f);
    else el.setAttribute(k, String(v));
  }
  for (const enfant of [].concat(enfants)) if (enfant) el.appendChild(enfant);
  return el;
}

export const qs = (sel, racine = document) => racine.querySelector(sel);
export const qsa = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));

export function vider(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Remplace le contenu d'un conteneur par des enfants. */
export function remplir(conteneur, enfants) { return ajouter(vider(conteneur), enfants); }
