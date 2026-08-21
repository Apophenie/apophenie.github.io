// src/recherche/fragments.js
// Tokenisation URL-aware, détection des motifs répétés, génération priorisée
// des fragments candidats.
// CONTRACTS.md §5 · research/heuristique.md §3.
//
// Deux principes mesurés :
//  1. On ne cherche JAMAIS « par découpe » (26 mots → 300 découpes × 3 parts =
//     900 recherches ≈ 1,8 s) mais « par fragment », une seule fois chacun, puis
//     on assemble (25 recherches ≈ 50 ms). Facteur 36.
//  2. Les séparateurs sont des PORTEURS DE VALEUR (le `-` est sur la touche du 6
//     en AZERTY — méthode 6 du README). On ne les jette jamais.

import { N_FRAG_MAX } from './bfs.js';

/**
 * @typedef {Object} Jeton
 * @property {string} texte
 * @property {'W'|'S'} genre     mot / séparateur
 * @property {number} offset     position dans la saisie NFC
 * @property {number} longueur
 *
 * @typedef {Object} Fragment
 * @property {string} texte
 * @property {number} offset      borne gauche de l'enveloppe
 * @property {number} longueur    largeur de l'enveloppe
 * @property {Array<[number,number]>} intervalles  couverture réelle (peut être discontinue)
 * @property {number} tokenDebut  index du premier jeton (portée d'URL, §4.2)
 * @property {number} tokenLong   nombre de jetons
 * @property {string} famille
 * @property {number} priorite    1 = le plus prioritaire
 * @property {string} [motif]     étiquette de motif répété
 */

const RE_JETON = /(\p{L}[\p{L}\p{N}]*|\p{N}+)|(.)/gsu;
const RE_STRUCTUREL = /[/:?#@]/;
const MAX_NGRAMMES = 10;
const RE_URL = /^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)|^[^\s/]+\.[a-z]{2,}(?:[/?#]|$)/i;

/** Découpe la saisie en jetons, séparateurs conservés (runs d'un même caractère). */
export function tokeniser(saisie) {
  const s = String(saisie).normalize('NFC');
  const bruts = [];
  RE_JETON.lastIndex = 0;
  let m;
  while ((m = RE_JETON.exec(s)) !== null) {
    bruts.push({ texte: m[0], genre: m[1] ? 'W' : 'S', offset: m.index, longueur: m[0].length });
  }
  // Fusion des séparateurs identiques consécutifs : `://` → `:` puis `//`.
  const jetons = [];
  for (const j of bruts) {
    const p = jetons[jetons.length - 1];
    if (p && p.genre === 'S' && j.genre === 'S' && p.texte[0] === j.texte[0]
      && p.offset + p.longueur === j.offset) {
      p.texte += j.texte;
      p.longueur += j.longueur;
    } else jetons.push(j);
  }
  return jetons;
}

/** Parse structurel d'URL, en offsets exacts (pas de `new URL()` : il ré-encode). */
export function structureUrl(saisie) {
  const s = String(saisie).normalize('NFC');
  if (!RE_URL.test(s)) return null;
  const m = /^(?:([a-z][a-z0-9+.-]*):\/\/)?([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(s);
  if (!m) return null;
  let i = 0;
  const schema = m[1] ? { texte: m[1], offset: 0, longueur: m[1].length } : null;
  if (m[1]) i = m[1].length + 3;
  const autorite = { texte: m[2] || '', offset: i, longueur: (m[2] || '').length };
  i += autorite.longueur;
  const chemin = { texte: m[3] || '', offset: i, longueur: (m[3] || '').length };
  i += chemin.longueur;
  const requete = m[4] !== undefined ? { texte: m[4], offset: i + 1, longueur: m[4].length } : null;

  const labels = decouperAvecOffsets(autorite.texte, autorite.offset, '.');
  const segments = decouperAvecOffsets(chemin.texte, chemin.offset, '/').filter((x) => x.texte.length);
  const params = requete ? decouperAvecOffsets(requete.texte, requete.offset, '&').filter((x) => x.texte.length) : [];
  return { schema, autorite, chemin, requete, labels, segments, params };
}

function decouperAvecOffsets(texte, base, sep) {
  const out = [];
  let debut = 0;
  for (let i = 0; i <= texte.length; i++) {
    if (i === texte.length || texte[i] === sep) {
      out.push({ texte: texte.slice(debut, i), offset: base + debut, longueur: i - debut });
      debut = i + 1;
    }
  }
  return out;
}

// ══════════════════════════════════ motifs porteurs (§3.2)

/** (a) Groupes répétés ≥ 3 fois — le cas d'école `hope-hope-hope`. */
export function motifsRepetes(jetons) {
  const mots = jetons.filter((j) => j.genre === 'W');
  const parCle = new Map();
  for (const j of mots) {
    const cle = j.texte.toLowerCase();
    if (!parCle.has(cle)) parCle.set(cle, []);
    parCle.get(cle).push(j);
  }
  const out = [];
  for (const [cle, occ] of parCle) {
    if (occ.length >= 3 && cle.length >= 2) out.push({ motif: cle, occurrences: occ });
  }
  // Ordre déterministe : plus d'occurrences d'abord, puis alphabétique en unités de code.
  out.sort((a, b) => (b.occurrences.length - a.occurrences.length)
    || (a.motif < b.motif ? -1 : a.motif > b.motif ? 1 : 0));
  return out;
}

/** (b) Périodicité de la suite de mots — capte `ab-ab-ab` que (a) rate. */
export function periodicite(jetonsMots) {
  const mots = jetonsMots.map((j) => j.texte.toLowerCase());
  const n = mots.length;
  for (let p = 1; p <= n / 2; p++) {
    if (n % p) continue;
    let ok = true;
    for (let i = p; i < n && ok; i++) if (mots[i] !== mots[i % p]) ok = false;
    if (ok && n / p >= 3) {
      return { periode: p, repetitions: n / p, unite: mots.slice(0, p) };
    }
  }
  return null;
}

// ══════════════════════════════════ zones signifiantes (§4.4)

/**
 * « Boilerplate gratuite » universellement admise comme ignorable :
 * le schéma `https://`, le `www.`, le `/` final.
 * @returns {{total:number, masque:Uint8Array}}
 */
export function zonesSignifiantes(saisie) {
  const s = String(saisie).normalize('NFC');
  const masque = new Uint8Array(s.length).fill(1);
  const st = structureUrl(s);
  if (st) {
    if (st.schema) for (let i = 0; i < st.schema.longueur + 3; i++) masque[i] = 0;
    const w = /^www\./i.exec(st.autorite.texte);
    if (w) for (let i = 0; i < 4; i++) masque[st.autorite.offset + i] = 0;
    if (s.endsWith('/')) masque[s.length - 1] = 0;
  }
  let total = 0;
  for (let i = 0; i < masque.length; i++) if (masque[i]) total++;
  return { total, masque };
}

// ══════════════════════════════════ génération des fragments (§3.3)

/**
 * Aligne un intervalle sur les frontières de jetons.
 * Tout fragment DOIT être exprimable comme une portée `offset.longueur` en
 * jetons (grammaire §4.2) : sans cela, l'URL ne saurait pas le redésigner et un
 * lien partagé ne rejouerait pas la même démonstration.
 * @returns {{tokenDebut:number, tokenLong:number, debut:number, fin:number}|null}
 */
function alignerSurJetons(jetons, d, f) {
  let tokenDebut = -1;
  let tokenLong = 0;
  for (let i = 0; i < jetons.length; i++) {
    const j = jetons[i];
    if (j.offset >= d && j.offset + j.longueur <= f) {
      if (tokenDebut < 0) tokenDebut = i;
      tokenLong++;
    } else if (tokenDebut >= 0 && j.offset < f) {
      return null; // jeton à cheval : intervalle non alignable
    }
  }
  if (tokenDebut < 0) return null;
  const premier = jetons[tokenDebut];
  const dernier = jetons[tokenDebut + tokenLong - 1];
  return {
    tokenDebut,
    tokenLong,
    debut: premier.offset,
    fin: dernier.offset + dernier.longueur,
  };
}

function cleFragment(f) {
  return f.texte + '@' + f.intervalles.map((iv) => iv.join('.')).join('|');
}

/**
 * Génère les fragments candidats, par priorité décroissante, plafonnés à N_FRAG_MAX.
 * @param {string} saisie
 * @param {{max?:number}} [options]
 * @returns {Fragment[]}
 */
export function genererFragments(saisie, options = {}) {
  const s = String(saisie).normalize('NFC');
  const max = options.max ?? N_FRAG_MAX;
  const jetons = tokeniser(s);
  const mots = jetons.filter((j) => j.genre === 'W');
  const st = structureUrl(s);

  const candidats = [];
  /**
   * Construit un fragment ALIGNÉ SUR LES JETONS. Tout fragment doit être
   * redésignable par une portée `offset.longueur` (§4.2) ; un intervalle qui ne
   * tombe pas sur des frontières de jetons est rejeté plutôt que de produire une
   * URL qui rejouerait autre chose.
   */
  const ajouter = (d, f, famille, priorite, extra = {}) => {
    const a = alignerSurJetons(jetons, d, f);
    if (!a) return null;
    const texte = s.slice(a.debut, a.fin);
    if (!texte.length) return null;
    const frag = {
      texte,
      offset: a.debut,
      longueur: a.fin - a.debut,
      intervalles: [[a.debut, a.fin]],
      tokenDebut: a.tokenDebut,
      tokenLong: a.tokenLong,
      famille,
      priorite,
      ...extra,
    };
    candidats.push(frag);
    return frag;
  };

  // ── rang 1 : répétitions (tous, sans plafond)
  const repetitions = motifsRepetes(jetons);
  for (const r of repetitions) {
    for (const occ of r.occurrences) {
      ajouter(occ.offset, occ.offset + occ.longueur, 'repetition', 1, {
        motif: r.motif, occurrences: r.occurrences.length,
      });
    }
  }
  const per = periodicite(mots);
  if (per && per.periode > 1) {
    for (let k = 0; k < per.repetitions; k++) {
      const groupe = mots.slice(k * per.periode, (k + 1) * per.periode);
      const dernier = groupe[groupe.length - 1];
      ajouter(groupe[0].offset, dernier.offset + dernier.longueur, 'periodicite', 1, {
        motif: per.unite.join('-'), occurrences: per.repetitions,
      });
    }
  }

  // ── rang 2 : unités naturelles (≤ 40)
  let n2 = 0;
  const uniteNaturelle = (u) => {
    if (n2 >= 40 || !u.texte.length) return;
    if (ajouter(u.offset, u.offset + u.longueur, 'unite', 2)) n2++;
  };
  for (const j of mots) uniteNaturelle(j);
  if (st) {
    for (const l of st.labels) uniteNaturelle(l);
    for (const seg of st.segments) uniteNaturelle(seg);
    for (const p of st.params) uniteNaturelle(p);
  }

  // ── rang 3 : séparateurs isolés — les PORTEURS AZERTY.
  // Un par occurrence, et non un groupe discontinu : le `-` de la touche du 6
  // vaut 6 à lui tout seul (méthode 6 du README, « les deux tirets donnent 6 et
  // 6 »), et un fragment discontinu ne serait pas exprimable en portée d'URL.
  const separateurs = jetons.filter((j) => j.genre === 'S' && /[-._/]/.test(j.texte[0]));
  for (const j of separateurs.slice(0, 6)) {
    ajouter(j.offset, j.offset + j.longueur, 'separateurs', 3, { separateur: j.texte[0] });
  }

  // ── rang 4 : frontières structurelles (≤ 8)
  const frontieres = [];
  const iSlash = s.indexOf('/', st && st.schema ? st.schema.longueur + 3 : 0);
  if (iSlash > 0) {
    frontieres.push([0, iSlash]);
    frontieres.push([iSlash + 1, s.length]);
  }
  if (st) {
    frontieres.push([st.autorite.offset, st.autorite.offset + st.autorite.longueur]);
    if (st.chemin.longueur > 1) frontieres.push([st.chemin.offset, st.chemin.offset + st.chemin.longueur]);
  }
  const iArob = s.indexOf('@');
  if (iArob > 0) { frontieres.push([0, iArob]); frontieres.push([iArob + 1, s.length]); }
  for (const [d, f] of frontieres.slice(0, 8)) {
    if (f - d <= 0 || (d === 0 && f === s.length)) continue;
    ajouter(d, f, 'frontiere', 4);
  }

  // ── rang 5 : saisie entière (approches « 666 direct » et triplement)
  ajouter(0, s.length, 'entier', 5, { entier: true });

  // ── rang 6 : n-grammes contigus de 2–3 mots.
  // Trois restrictions mesurées, toutes issues de research §3.3 (« seulement si
  // le total reste sous le plafond ») :
  //   · pas d'n-gramme sur une URL — sa structure fournit déjà les labels, les
  //     segments et les frontières, et les n-grammes n'y produisent que des
  //     fragments absurdes (« https://www », « com/path ») ;
  //   · aucun n-gramme ne franchit un séparateur structurel ;
  //   · plafond dur, car chaque fragment coûte une fermeture complète.
  //   Mesure : sur `https://www.example.com/path/to/page`, ces trois règles font
  //   passer le pipeline de 2 718 ms à ~1 100 ms, sans perdre d'approche.
  if (!st && jetons.length <= 30) {
    let n6 = 0;
    for (let taille = 2; taille <= 3 && n6 < MAX_NGRAMMES; taille++) {
      for (let i = 0; i + taille <= mots.length && n6 < MAX_NGRAMMES; i++) {
        const g = mots.slice(i, i + taille);
        const dernier = g[g.length - 1];
        const texte = s.slice(g[0].offset, dernier.offset + dernier.longueur);
        if (RE_STRUCTUREL.test(texte)) continue;
        if (ajouter(g[0].offset, dernier.offset + dernier.longueur, 'ngramme', 6)) n6++;
      }
    }
  }

  // Dédup en conservant la meilleure priorité, puis plafonnement.
  // Le drapeau `entier` survit à la fusion : sur une saisie d'un seul mot, le
  // fragment « saisie entière » et le fragment « unité naturelle » sont le même
  // texte, et l'assemblage a besoin de savoir qu'il couvre tout.
  const vus = new Map();
  for (const f of candidats) {
    const k = cleFragment(f);
    const a = vus.get(k);
    if (!a) { vus.set(k, f); continue; }
    const garde = f.priorite < a.priorite ? f : a;
    garde.entier = Boolean(a.entier || f.entier);
    vus.set(k, garde);
  }
  const liste = [...vus.values()];
  liste.sort((a, b) => (a.priorite - b.priorite) || (a.offset - b.offset) || (a.longueur - b.longueur)
    || (a.texte < b.texte ? -1 : a.texte > b.texte ? 1 : 0));
  return liste.slice(0, max);
}
