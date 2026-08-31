/**
 * Tables **calculées** depuis `glyphes.js` — CONTRACTS §0.3 et §2.4.
 *
 * `TRAITS_MAJ`, `TRAITS_MIN`, `EXTREMITES_MAJ`, `EXTREMITES_MIN`,
 * `BOUCLES_MAJ`, `BOUCLES_MIN` ne sont **jamais saisies à la main** : elles
 * sortent des tracés vectoriels, ceux-là mêmes que le moteur visuel dessine.
 *
 * Ce module **échoue au chargement** (jette) si les valeurs dérivées ne
 * correspondent pas, glyphe par glyphe, à la table de référence figée ci-dessous
 * — pas de dégradation silencieuse. Redessiner un glyphe casse donc le
 * chargement tant que la référence n'a pas été mise à jour sciemment.
 *
 * ## Règles de comptage
 *
 * - **trait** : un sous-chemin = un trait de crayon (une levée de stylo) ;
 * - **extrémité libre** : position d'extrémité *distincte* d'un sous-chemin
 *   ouvert qui n'est à portée d'aucun sous-chemin déclaré partenaire. Un
 *   sous-chemin dégénéré (le point du `i`) n'a **qu'une** extrémité ;
 * - **boucle** : sous-chemin fermé, plus le nombre cyclomatique
 *   `E − V + C` du multigraphe des jonctions.
 *
 * Une jonction déclarée sans contact géométrique réel ne lie rien (elle est
 * signalée à part par `anomalies()`), ce qui rend impossible d'ajuster un
 * comptage sans redessiner.
 */

import { GLYPHES, TOLERANCE, CAPITALES, BAS_DE_CASSE } from './glyphes.js';

/** Erreur de chargement des tables dérivées. */
export class ErreurGlyphes extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ErreurGlyphes';
    Object.assign(this, details);
  }
}

const echec = (msg, details) => { throw new ErreurGlyphes(msg, details); };

// ───────────────────────────────────────────────────────────────────────────
// Lecture des tracés — aucun DOM (Node comme navigateur, mêmes résultats)
// ───────────────────────────────────────────────────────────────────────────

const JETON = /([MmLlHhVvCcQqAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;

/** Découpe un attribut `d` en commandes `{cmd, args}`. */
export function lireTrace(d) {
  const cmds = [];
  let courant = null;
  let m;
  JETON.lastIndex = 0;
  while ((m = JETON.exec(d)) !== null) {
    if (m[1]) {
      if (/[SsTt]/.test(m[1])) echec(`commande « ${m[1]} » non gérée : utiliser M L H V C Q A Z.`);
      courant = { cmd: m[1], args: [] };
      cmds.push(courant);
    } else {
      if (!courant) echec(`tracé invalide : nombre « ${m[2]} » avant toute commande.`);
      courant.args.push(Number(m[2]));
    }
  }
  if (!cmds.length) echec('tracé vide.');
  return cmds;
}

const cubique = (a, b, c, d, u) => {
  const v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
};
const quadratique = (a, b, c, u) => {
  const v = 1 - u;
  return v * v * a + 2 * v * u * b + u * u * c;
};

/**
 * Paramétrisation « extrémités → centre » d'un arc elliptique (SVG 1.1 F.6.5).
 * Le repère du projet a l'axe `y` vers le haut : `sweep = 1` parcourt donc
 * l'arc dans le sens **trigonométrique**.
 */
function pointsArc(x1, y1, rx, ry, rotDeg, large, sweep, x2, y2, pas) {
  if (rx === 0 || ry === 0) return [{ x: x2, y: y2 }];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi); const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2; const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const signe = large !== sweep ? 1 : -1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = signe * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const n = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / n)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const ux = (x1p - cxp) / rx; const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx; const vy = (-y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let dtheta = angle(ux, uy, vx, vy);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  const n = Math.max(6, Math.ceil((pas * Math.abs(dtheta)) / (2 * Math.PI)));
  const out = [];
  for (let i = 1; i <= n; i++) {
    const th = theta1 + (dtheta * i) / n;
    out.push({
      x: cos * rx * Math.cos(th) - sin * ry * Math.sin(th) + cx,
      y: sin * rx * Math.cos(th) + cos * ry * Math.sin(th) + cy,
    });
  }
  return out;
}

/**
 * Aplatit un sous-chemin en polyligne.
 * @returns {{points:{x:number,y:number}[], ferme:boolean}}
 */
export function aplatir(d, pas = 96) {
  const cmds = lireTrace(d);
  const pts = [];
  let x = 0; let y = 0; let dx = 0; let dy = 0;
  let ferme = false;
  const pousser = (px, py) => {
    const p = pts[pts.length - 1];
    if (!p || Math.abs(p.x - px) > 1e-9 || Math.abs(p.y - py) > 1e-9) pts.push({ x: px, y: py });
  };
  for (const { cmd, args } of cmds) {
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
        for (let i = 0; i + 1 < args.length; i += 2) {
          x = rel ? x + args[i] : args[i];
          y = rel ? y + args[i + 1] : args[i + 1];
          if (i === 0) { dx = x; dy = y; }
          pousser(x, y);
        }
        break;
      case 'L':
        for (let i = 0; i + 1 < args.length; i += 2) {
          x = rel ? x + args[i] : args[i];
          y = rel ? y + args[i + 1] : args[i + 1];
          pousser(x, y);
        }
        break;
      case 'H':
        for (const a of args) { x = rel ? x + a : a; pousser(x, y); }
        break;
      case 'V':
        for (const a of args) { y = rel ? y + a : a; pousser(x, y); }
        break;
      case 'C':
        for (let i = 0; i + 5 < args.length; i += 6) {
          const p0x = x; const p0y = y;
          const p1x = rel ? x + args[i] : args[i];
          const p1y = rel ? y + args[i + 1] : args[i + 1];
          const p2x = rel ? x + args[i + 2] : args[i + 2];
          const p2y = rel ? y + args[i + 3] : args[i + 3];
          const p3x = rel ? x + args[i + 4] : args[i + 4];
          const p3y = rel ? y + args[i + 5] : args[i + 5];
          for (let k = 1; k <= 24; k++) {
            const u = k / 24;
            pousser(cubique(p0x, p1x, p2x, p3x, u), cubique(p0y, p1y, p2y, p3y, u));
          }
          x = p3x; y = p3y;
        }
        break;
      case 'Q':
        for (let i = 0; i + 3 < args.length; i += 4) {
          const p0x = x; const p0y = y;
          const p1x = rel ? x + args[i] : args[i];
          const p1y = rel ? y + args[i + 1] : args[i + 1];
          const p2x = rel ? x + args[i + 2] : args[i + 2];
          const p2y = rel ? y + args[i + 3] : args[i + 3];
          for (let k = 1; k <= 24; k++) {
            const u = k / 24;
            pousser(quadratique(p0x, p1x, p2x, u), quadratique(p0y, p1y, p2y, u));
          }
          x = p2x; y = p2y;
        }
        break;
      case 'A':
        for (let i = 0; i + 6 < args.length; i += 7) {
          const [rx, ry, rot, large, sweep] = args.slice(i, i + 5);
          const ex = rel ? x + args[i + 5] : args[i + 5];
          const ey = rel ? y + args[i + 6] : args[i + 6];
          for (const p of pointsArc(x, y, rx, ry, rot, large, sweep, ex, ey, pas)) pousser(p.x, p.y);
          x = ex; y = ey;
        }
        break;
      case 'Z':
        ferme = true;
        pousser(dx, dy);
        x = dx; y = dy;
        break;
      default:
        echec(`commande de tracé inconnue : « ${cmd} ».`);
    }
  }
  if (!ferme && pts.length > 2) {
    const a = pts[0]; const b = pts[pts.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) ferme = true;
  }
  return { points: pts, ferme };
}

function distanceSegment(p, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let u = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

function distancePolyligne(p, points) {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const d = distanceSegment(p, points[i - 1], points[i]);
    if (d < best) best = d;
    if (best === 0) return 0;
  }
  return best;
}

/** Distance entre deux segments (0 s'ils se croisent). */
function distanceEntreSegments(a, b, c, d) {
  const d1x = b.x - a.x; const d1y = b.y - a.y;
  const d2x = d.x - c.x; const d2y = d.y - c.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) > 1e-12) {
    const s = ((c.x - a.x) * d2y - (c.y - a.y) * d2x) / den;
    const u = ((c.x - a.x) * d1y - (c.y - a.y) * d1x) / den;
    if (s >= 0 && s <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(
    distanceSegment(a, c, d), distanceSegment(b, c, d),
    distanceSegment(c, a, b), distanceSegment(d, a, b),
  );
}

/** Distance minimale entre deux polylignes. */
function distancePolylignes(A, B) {
  if (A.length === 1) return distancePolyligne(A[0], B);
  if (B.length === 1) return distancePolyligne(B[0], A);
  let best = Infinity;
  for (let i = 1; i < A.length; i++) {
    for (let j = 1; j < B.length; j++) {
      const d = distanceEntreSegments(A[i - 1], A[i], B[j - 1], B[j]);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
  }
  return best;
}

/** Nombre cyclomatique `E − V + C` du multigraphe des jonctions. */
function cyclomatique(sommets, aretes) {
  const parent = Array.from({ length: sommets }, (_, i) => i);
  const racine = (a) => (parent[a] === a ? a : (parent[a] = racine(parent[a])));
  for (const [a, b] of aretes) parent[racine(a)] = racine(b);
  const racines = new Set();
  for (let i = 0; i < sommets; i++) racines.add(racine(i));
  return aretes.length - sommets + racines.size;
}

/**
 * Comptages d'un glyphe, dérivés de son tracé.
 * @param {{traits:{d:string,ouvert?:boolean}[], jonctions?:Array<Array<number|string>>}} glyphe
 * @returns {{traits:number, extremites:number, boucles:number,
 *            libres:{x:number,y:number,trait:number}[],
 *            sousChemins:object[], jonctionsMortes:number[][]}}
 */
export function deriver(glyphe, tolerance = TOLERANCE) {
  if (!glyphe || !Array.isArray(glyphe.traits) || glyphe.traits.length === 0) {
    echec('glyphe invalide : « traits » doit être une liste non vide de sous-chemins.');
  }
  const sousChemins = glyphe.traits.map((tr, i) => {
    if (typeof tr.d !== 'string' || !tr.d.trim()) echec(`trait ${i} : « d » manquant.`);
    const plat = aplatir(tr.d);
    const ouvert = tr.ouvert === undefined ? !plat.ferme : tr.ouvert;
    return { index: i, d: tr.d, points: plat.points, ouvert, ferme: !ouvert };
  });

  const jonctions = (glyphe.jonctions || []).map((j) => {
    const a = Number(j[0]); const b = Number(j[1]);
    if (!sousChemins[a] || !sousChemins[b]) {
      echec(`jonction [${j[0]},${j[1]}] hors bornes (${sousChemins.length} sous-chemins).`);
    }
    return [a, b];
  });

  const partenaires = sousChemins.map(() => new Set());
  for (const [a, b] of jonctions) { partenaires[a].add(b); partenaires[b].add(a); }

  // Jonctions déclarées sans contact réel : elles ne lient rien, on les signale.
  const jonctionsMortes = [];
  for (const [a, b] of jonctions) {
    const contact = distancePolylignes(sousChemins[a].points, sousChemins[b].points) <= tolerance;
    if (!contact) jonctionsMortes.push([a, b]);
  }

  const libres = [];
  for (const s of sousChemins) {
    if (s.ferme) continue;
    const bouts = [s.points[0], s.points[s.points.length - 1]];
    // Un sous-chemin dégénéré (le point du `i`) n'a qu'une extrémité.
    const distincts = Math.hypot(bouts[0].x - bouts[1].x, bouts[0].y - bouts[1].y) < 1e-9
      ? [bouts[0]] : bouts;
    for (const p of distincts) {
      let lie = false;
      for (const autre of partenaires[s.index]) {
        if (distancePolyligne(p, sousChemins[autre].points) <= tolerance) { lie = true; break; }
      }
      if (!lie) libres.push({ x: p.x, y: p.y, trait: s.index });
    }
  }

  const fermes = sousChemins.filter((s) => s.ferme).length;
  return {
    traits: sousChemins.length,
    extremites: libres.length,
    boucles: fermes + cyclomatique(sousChemins.length, jonctions),
    libres,
    sousChemins,
    jonctionsMortes,
  };
}

/** Boîte englobante d'un glyphe (unités de grille) — garde-fou de tracé. */
export function boiteGlyphe(glyphe) {
  const d = deriver(glyphe);
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const s of d.sousChemins) {
    for (const p of s.points) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  }
  return { x0, y0, x1, y1 };
}

// ───────────────────────────────────────────────────────────────────────────
// Dérivation des six tables
// ───────────────────────────────────────────────────────────────────────────

const DERIVE = Object.fromEntries(
  Object.entries(GLYPHES).map(([c, g]) => [c, deriver(g)]),
);

const table = (lettres, champ) => Object.freeze(Object.fromEntries(
  lettres.map((c) => [c, DERIVE[c][champ]]),
));

/** Traits de crayon — capitales. Σ = 61. */
export const TRAITS_MAJ = table(CAPITALES, 'traits');
/** Traits de crayon — bas de casse. Σ = 53. */
export const TRAITS_MIN = table(BAS_DE_CASSE, 'traits');
/** Extrémités libres — capitales. Σ = 58. */
export const EXTREMITES_MAJ = table(CAPITALES, 'extremites');
/** Extrémités libres — bas de casse. Σ = 57 (voir `ECARTS`). */
export const EXTREMITES_MIN = table(BAS_DE_CASSE, 'extremites');
/** Boucles fermées — capitales. Σ = 8. */
export const BOUCLES_MAJ = table(CAPITALES, 'boucles');
/** Boucles fermées — bas de casse. Σ = 8. */
export const BOUCLES_MIN = table(BAS_DE_CASSE, 'boucles');

/** Détail par glyphe (extrémités libres localisées, sous-chemins) — pour le visuel. */
export const DETAIL = Object.freeze(Object.fromEntries(
  Object.entries(DERIVE).map(([c, d]) => [c, Object.freeze({
    traits: d.traits,
    extremites: d.extremites,
    boucles: d.boucles,
    libres: Object.freeze(d.libres.map(Object.freeze)),
  })]),
));

// ───────────────────────────────────────────────────────────────────────────
// Vérification au chargement — échec bruyant (CONTRACTS §2.4)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Table de référence — `research/moteur-arithmetique.md §3.4`, **corrigée sur
 * cinq bas de casse** (voir `ECARTS`). C'est elle qui fait autorité au
 * chargement : tout glyphe redessiné qui s'en écarte fait échouer l'import.
 */
const REF = {
  TRAITS_MAJ: { A: 3, B: 3, C: 1, D: 2, E: 4, F: 3, G: 2, H: 3, I: 1, J: 1, K: 3, L: 2, M: 4, N: 3, O: 1, P: 2, Q: 2, R: 3, S: 1, T: 2, U: 1, V: 2, W: 4, X: 2, Y: 3, Z: 3 },
  TRAITS_MIN: { a: 2, b: 2, c: 1, d: 2, e: 2, f: 2, g: 2, h: 2, i: 2, j: 2, k: 3, l: 1, m: 3, n: 2, o: 1, p: 2, q: 2, r: 2, s: 1, t: 2, u: 2, v: 2, w: 4, x: 2, y: 2, z: 3 },
  EXTREMITES_MAJ: { A: 2, B: 0, C: 2, D: 0, E: 3, F: 3, G: 2, H: 4, I: 2, J: 2, K: 4, L: 2, M: 4, N: 4, O: 0, P: 1, Q: 1, R: 2, S: 2, T: 3, U: 2, V: 2, W: 2, X: 4, Y: 3, Z: 2 },
  EXTREMITES_MIN: { a: 2, b: 1, c: 2, d: 1, e: 1, f: 4, g: 1, h: 2, i: 3, j: 2, k: 4, l: 2, m: 4, n: 2, o: 0, p: 1, q: 1, r: 2, s: 2, t: 3, u: 2, v: 2, w: 2, x: 4, y: 2, z: 2 },
  BOUCLES_MAJ: { A: 1, B: 2, C: 0, D: 1, E: 0, F: 0, G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0, N: 0, O: 1, P: 1, Q: 1, R: 1, S: 0, T: 0, U: 0, V: 0, W: 0, X: 0, Y: 0, Z: 0 },
  BOUCLES_MIN: { a: 1, b: 1, c: 0, d: 1, e: 1, f: 0, g: 1, h: 0, i: 0, j: 0, k: 0, l: 0, m: 0, n: 0, o: 1, p: 1, q: 1, r: 0, s: 0, t: 0, u: 0, v: 0, w: 0, x: 0, y: 0, z: 0 },
};

/**
 * **Écarts assumés** avec `research/moteur-arithmetique.md §3.4`.
 *
 * Le contrat exige que les tracés reproduisent la table de recherche, sommes de
 * contrôle comprises. Cinq bas de casse en sont géométriquement incapables :
 * la recherche y compte des extrémités qu'aucun tracé lisible ne peut produire
 * (ou l'inverse). Le principe du §0.3 — *ce que le spectateur voit est ce qui
 * est compté* — l'emporte : on garde le tracé juste et on documente l'écart.
 *
 * ★ **LES CAPITALES NE SONT PLUS REPRODUITES À L'IDENTIQUE**, et c'est `M` et
 * `N` qui en sortent. Elles l'étaient « grâce aux fûts qui dépassent » : la
 * diagonale s'accrochait 45 unités sous le sommet, ce qui laissait à chaque fût
 * une pointe libre en haut, donc quatre. Quarante-cinq sur six cents, c'est
 * 7,5 % de la hauteur de capitale — invisible. « M n'a que deux extrémités
 * libres, contre 4 détectées » (l'auteur) : il lit le glyphe.
 *
 * Le §0.3 tranche dans ce sens, et il l'a déjà fait cinq fois ci-dessous : on
 * garde le tracé juste et l'on documente l'écart. Σ extMAJ passe donc de 58 à
 * 54.
 */
export const ECARTS = Object.freeze([
  Object.freeze({
    table: 'EXTREMITES_MAJ', glyphe: 'M', recherche: 4, dessine: 2,
    raison: 'les diagonales rejoignent le sommet des fûts, comme celles du « W » '
      + '(compté 2 par la recherche). Les faire s’accrocher plus bas donnait deux '
      + 'pointes de 45 unités que personne ne voit — un compte juste sur un '
      + 'glyphe faux.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MAJ', glyphe: 'N', recherche: 4, dessine: 2,
    raison: 'même construction que le « M » : elles ne peuvent pas suivre deux '
      + 'conventions. La diagonale part du sommet du fût gauche et arrive au pied '
      + 'du droit ; restent libres le pied du gauche et le sommet du droit.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MIN', glyphe: 'h', recherche: 2, dessine: 3,
    raison: 'un « h » a trois pointes visibles : sommet de la hampe, pied du fût, '
      + 'pied de la jambe. La hampe monte au-dessus de la naissance de l’arche, '
      + 'son sommet est donc libre.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MIN', glyphe: 'j', recherche: 2, dessine: 3,
    raison: 'même construction que le « i » (compté 3 par la recherche) : fût + point. '
      + 'Le crochet du jambage ne supprime aucune pointe.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MIN', glyphe: 'm', recherche: 4, dessine: 3,
    raison: 'les arches du « m » naissent au sommet du fût, comme celle du « n » '
      + '(compté 2 par la recherche). Les deux lettres partagent la même '
      + 'construction : elles ne peuvent pas suivre deux conventions.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MIN', glyphe: 't', recherche: 3, dessine: 4,
    raison: 'la barre du « t » traverse le fût : ses deux bouts sont libres, comme '
      + 'le sommet du fût et le pied de la queue.',
  }),
  Object.freeze({
    table: 'EXTREMITES_MIN', glyphe: 'y', recherche: 2, dessine: 3,
    raison: 'trois pointes visibles : les deux bras et la queue du jambage.',
  }),
]);

for (const e of ECARTS) REF[e.table][e.glyphe] = e.dessine;

/** Sommes de contrôle attendues, après application des `ECARTS`. */
export const SOMMES = Object.freeze({
  trMAJ: 61, trMin: 53, extMAJ: 54, extMin: 57, bcMAJ: 8, bcMin: 8,
});

/** Sommes de contrôle du contrat (CONTRACTS §0.3), pour mémoire et pour l'UI. */
export const SOMMES_CONTRAT = Object.freeze({
  trMAJ: 61, trMin: 53, extMAJ: 58, extMin: 54, bcMAJ: 8, bcMin: 8,
});

const somme = (tbl) => Object.values(tbl).reduce((a, b) => a + b, 0);

function verifier() {
  const attendu = Object.keys(REF.TRAITS_MAJ).length + Object.keys(REF.TRAITS_MIN).length;
  if (Object.keys(GLYPHES).length !== attendu) {
    echec(`glyphes.js définit ${Object.keys(GLYPHES).length} glyphes, ${attendu} attendus (52).`);
  }

  const tables = {
    TRAITS_MAJ, TRAITS_MIN, EXTREMITES_MAJ, EXTREMITES_MIN, BOUCLES_MAJ, BOUCLES_MIN,
  };
  const fautes = [];
  for (const [nom, tbl] of Object.entries(tables)) {
    for (const [c, v] of Object.entries(tbl)) {
      const r = REF[nom][c];
      if (v !== r) fautes.push(`${nom}[${c}] : tracé ⇒ ${v}, référence ${r}`);
    }
  }
  if (fautes.length) {
    echec(
      'Tables dérivées incohérentes avec la référence (CONTRACTS §0.3 : échec bruyant, '
      + `pas de dégradation silencieuse) :\n  - ${fautes.join('\n  - ')}\n`
      + 'Corriger le tracé dans glyphes.js, ou mettre à jour REFERENCE/ECARTS sciemment.',
      { fautes },
    );
  }

  const obtenues = {
    trMAJ: somme(TRAITS_MAJ), trMin: somme(TRAITS_MIN),
    extMAJ: somme(EXTREMITES_MAJ), extMin: somme(EXTREMITES_MIN),
    bcMAJ: somme(BOUCLES_MAJ), bcMin: somme(BOUCLES_MIN),
  };
  for (const [k, v] of Object.entries(SOMMES)) {
    if (obtenues[k] !== v) {
      echec(`Somme de contrôle ${k} : ${obtenues[k]} au lieu de ${v}.`, { obtenues });
    }
  }

  const mortes = Object.entries(DERIVE)
    .filter(([, d]) => d.jonctionsMortes.length)
    .map(([c, d]) => `${c} : ${d.jonctionsMortes.map((j) => `[${j}]`).join(' ')}`);
  if (mortes.length) {
    echec(
      'Jonctions déclarées sans contact géométrique réel (une jonction ne lie que '
      + `si les tracés se touchent) :\n  - ${mortes.join('\n  - ')}`,
      { mortes },
    );
  }
}

verifier();

/** Sommes de contrôle réellement obtenues (exposées pour les tests et l'UI). */
export const SOMMES_OBTENUES = Object.freeze({
  trMAJ: somme(TRAITS_MAJ), trMin: somme(TRAITS_MIN),
  extMAJ: somme(EXTREMITES_MAJ), extMin: somme(EXTREMITES_MIN),
  bcMAJ: somme(BOUCLES_MAJ), bcMin: somme(BOUCLES_MIN),
});

/**
 * Accès par lettre, casse comprise.
 * @param {'traits'|'extremites'|'boucles'} metrique
 * @param {'maj'|'min'} casse
 */
export function mesure(metrique, casse, c) {
  const tbl = {
    traits: casse === 'maj' ? TRAITS_MAJ : TRAITS_MIN,
    extremites: casse === 'maj' ? EXTREMITES_MAJ : EXTREMITES_MIN,
    boucles: casse === 'maj' ? BOUCLES_MAJ : BOUCLES_MIN,
  }[metrique];
  if (!tbl || typeof c !== 'string' || c.length !== 1) return null;
  const k = casse === 'maj' ? c.toUpperCase() : c.toLowerCase();
  const v = tbl[k];
  return v === undefined ? null : v;
}
