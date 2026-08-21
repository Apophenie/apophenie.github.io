/**
 * Consommation de la définition vectorielle des glyphes — `src/moteur/tables/glyphes.js`.
 *
 * Format normatif : CONTRACTS §2.4. Chaque glyphe est une liste de sous-chemins
 * (traits de crayon) sur une grille normalisée `0..400` en largeur, `0..600` en
 * hauteur de capitale, **origine en bas à gauche**, plus une liste de jonctions.
 *
 * Point capital (CONTRACTS §0.3) : les tables de comptage sont *dérivées* de ces
 * tracés. Ce que le moteur visuel dessine est donc, littéralement, ce qui est
 * compté. `countStrokes` et `sevenSeg` ne dessinent **rien d'autre** que ces
 * sous-chemins.
 *
 * Le fichier de tables appartient à l'agent arithmétique. On ne l'importe donc
 * jamais statiquement (il peut ne pas exister au moment où l'on charge) :
 * `loadGlyphes()` fait un import dynamique, `setGlyphes()` permet l'injection
 * (tests, fixtures).
 */

import { CompileError, fail } from './errors.js';

let TABLE = null;
let SOURCE = null;

/** Injecte une table de glyphes (tests, fixtures, ou table déjà chargée). */
export function setGlyphes(table, source = 'injection') {
  TABLE = table;
  SOURCE = table ? source : null;
}

/** Table courante, ou `null` si aucune n'a été chargée. */
export function peekGlyphes() {
  return TABLE;
}

export function glyphesSource() {
  return SOURCE;
}

/**
 * Table courante. Échoue bruyamment si elle manque : un `countStrokes` sans
 * tracé ne peut pas être compilé (on ne dessinerait pas ce qu'on compte).
 */
export function getGlyphes() {
  if (!TABLE) {
    fail('table de glyphes absente : appelez `await loadGlyphes()` (ou `setGlyphes(...)`) '
      + 'avant de compiler un scénario contenant `countStrokes` ou `sevenSeg`.');
  }
  return TABLE;
}

/**
 * Tables de glyphes chargeables, énumérées une par une.
 *
 * Le chargement reste paresseux — rien n'est lu tant que `loadGlyphes()` n'est
 * pas appelé — mais chaque spécificateur est littéral, donc analysable par un
 * empaqueteur. Un `import(variable)` ne l'est pas : il interdit de replier tout
 * le site dans un fichier unique, ce dont dépend l'ouverture en `file://`.
 * Une entrée absente de la table se comporte comme un module absent : `null`,
 * et l'appelant dégrade (fixtures, ou refus de compiler `countStrokes`).
 */
const TABLES = {
  '../moteur/tables/glyphes.js': () => import('../moteur/tables/glyphes.js'),
};

/**
 * Charge `src/moteur/tables/glyphes.js`, paresseusement.
 * @param {string} [specifier]
 * @returns {Promise<object|null>} la table, ou `null` si le module est absent.
 */
export async function loadGlyphes(specifier = '../moteur/tables/glyphes.js') {
  if (TABLE) return TABLE;
  const charger = TABLES[specifier];
  if (!charger) return null; // table inconnue : l'appelant décide, comme pour un module absent
  try {
    const mod = await charger();
    const table = mod.GLYPHES ?? mod.default;
    if (!table || typeof table !== 'object') {
      throw new CompileError(`« ${specifier} » n'exporte pas de table GLYPHES exploitable.`);
    }
    setGlyphes(table, specifier);
    return TABLE;
  } catch (err) {
    if (err instanceof CompileError) throw err;
    return null; // module pas encore écrit : l'appelant décide (fixtures, dégradation)
  }
}

/** Récupère un glyphe et valide sa forme. */
export function glyphOf(ch, table = getGlyphes()) {
  const g = table[ch];
  if (!g) {
    fail(`glyphe « ${ch} » absent de la table de glyphes (clés disponibles : ${Object.keys(table).length}).`,
      { glyph: ch });
  }
  if (!Array.isArray(g.traits) || g.traits.length === 0) {
    fail(`glyphe « ${ch} » : « traits » doit être une liste non vide de sous-chemins (CONTRACTS §2.4).`, { glyph: ch });
  }
  for (const [i, tr] of g.traits.entries()) {
    if (typeof tr.d !== 'string' || !tr.d.trim()) {
      fail(`glyphe « ${ch} » trait ${i} : « d » manquant ou vide.`, { glyph: ch, trait: i });
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Analyse de tracé — sans DOM (pas de getTotalLength/getPointAtLength)
// ---------------------------------------------------------------------------

const TOKEN_RE = /([A-Za-z])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
const KNOWN_CMDS = 'MLHVCQAZ';

/** Découpe un `d` en commandes `{cmd, args}`. Absolu et relatif acceptés. */
export function parsePath(d) {
  const out = [];
  let m;
  let cur = null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(d)) !== null) {
    if (m[1]) {
      if (!KNOWN_CMDS.includes(m[1].toUpperCase())) {
        fail(`commande « ${m[1]} » non gérée dans un tracé de glyphe : utilisez M L H V C Q A Z (les raccourcis S et T supposent une continuité de courbure que le moteur ne reconstruit pas).`);
      }
      cur = { cmd: m[1], args: [] };
      out.push(cur);
    } else {
      if (!cur) fail(`tracé invalide : nombre « ${m[2]} » avant toute commande.`);
      cur.args.push(Number(m[2]));
    }
  }
  if (!out.length) fail('tracé vide.');
  return out;
}

/**
 * Aplatit un sous-chemin en polyligne (unités glyphe, y vers le haut).
 * @returns {{points:{x:number,y:number}[], closed:boolean}}
 */
export function flatten(d, samples = 24) {
  const cmds = parsePath(d);
  const pts = [];
  let x = 0; let y = 0; let sx = 0; let sy = 0;
  let closed = false;
  const push = (px, py) => {
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - px) > 1e-9 || Math.abs(last.y - py) > 1e-9) pts.push({ x: px, y: py });
  };
  for (const { cmd, args } of cmds) {
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          const nx = rel ? x + args[i] : args[i];
          const ny = rel ? y + args[i + 1] : args[i + 1];
          x = nx; y = ny;
          if (i === 0) { sx = x; sy = y; }
          push(x, y);
        }
        break;
      }
      case 'L': {
        for (let i = 0; i + 1 < args.length; i += 2) {
          x = rel ? x + args[i] : args[i];
          y = rel ? y + args[i + 1] : args[i + 1];
          push(x, y);
        }
        break;
      }
      case 'H': {
        for (const a of args) { x = rel ? x + a : a; push(x, y); }
        break;
      }
      case 'V': {
        for (const a of args) { y = rel ? y + a : a; push(x, y); }
        break;
      }
      case 'C': {
        for (let i = 0; i + 5 < args.length; i += 6) {
          const p0 = { x, y };
          const p1 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
          const p2 = { x: rel ? x + args[i + 2] : args[i + 2], y: rel ? y + args[i + 3] : args[i + 3] };
          const p3 = { x: rel ? x + args[i + 4] : args[i + 4], y: rel ? y + args[i + 5] : args[i + 5] };
          for (let k = 1; k <= samples; k++) {
            const t = k / samples;
            push(cubic(p0.x, p1.x, p2.x, p3.x, t), cubic(p0.y, p1.y, p2.y, p3.y, t));
          }
          x = p3.x; y = p3.y;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < args.length; i += 4) {
          const p0 = { x, y };
          const p1 = { x: rel ? x + args[i] : args[i], y: rel ? y + args[i + 1] : args[i + 1] };
          const p2 = { x: rel ? x + args[i + 2] : args[i + 2], y: rel ? y + args[i + 3] : args[i + 3] };
          for (let k = 1; k <= samples; k++) {
            const t = k / samples;
            push(quad(p0.x, p1.x, p2.x, t), quad(p0.y, p1.y, p2.y, t));
          }
          x = p2.x; y = p2.y;
        }
        break;
      }
      case 'A': {
        for (let i = 0; i + 6 < args.length; i += 7) {
          const [rx, ry, rot, large, sweep] = args.slice(i, i + 5);
          const ex = rel ? x + args[i + 5] : args[i + 5];
          const ey = rel ? y + args[i + 6] : args[i + 6];
          for (const p of arcPoints(x, y, rx, ry, rot, large, sweep, ex, ey, samples)) push(p.x, p.y);
          x = ex; y = ey;
        }
        break;
      }
      case 'Z': {
        closed = true;
        push(sx, sy);
        x = sx; y = sy;
        break;
      }
      default:
        fail(`commande de tracé inconnue : « ${cmd} ».`);
    }
  }
  // Un tracé peut être « fermé » sans Z si ses extrémités coïncident.
  if (!closed && pts.length > 2) {
    const a = pts[0]; const b = pts[pts.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) closed = true;
  }
  return { points: pts, closed };
}

/** Extrémités d'un sous-chemin, en unités glyphe. */
export function endpointsOf(d) {
  const { points, closed } = flatten(d, 4);
  return { start: points[0], end: points[points.length - 1], closed };
}

/** Longueur approchée d'une polyligne (utile pour ordonner un stagger). */
export function polylineLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return L;
}

// ---------------------------------------------------------------------------
// Dérivation des comptages — la même règle que `derivees.js`, appliquée au
// tracé effectivement dessiné à l'écran.
// ---------------------------------------------------------------------------

const TOL = 6; // unités glyphe (grille 0..600) — tolérance de contact

/**
 * @param {{traits:{d:string,ouvert?:boolean}[], jonctions?:Array<Array<number|string>>}} glyph
 * @returns {{traits:number, extremites:number, boucles:number,
 *            libres:{x:number,y:number,trait:number}[], sub:object[]}}
 */
export function deriveGlyph(glyph) {
  const sub = glyph.traits.map((tr, i) => {
    const flat = flatten(tr.d);
    const ouvert = tr.ouvert !== undefined ? tr.ouvert : !flat.closed;
    return { index: i, d: tr.d, points: flat.points, closed: !ouvert, ouvert };
  });

  const jonctions = (glyph.jonctions || []).map((j) => [Number(j[0]), Number(j[1])]);

  // Partenaires déclarés — seul un partenaire déclaré peut « lier » une extrémité.
  const partners = sub.map(() => new Set());
  for (const [a, b] of jonctions) {
    if (!sub[a] || !sub[b]) {
      fail(`jonction [${a},${b}] hors bornes : le glyphe n'a que ${sub.length} sous-chemins.`);
    }
    partners[a].add(b);
    partners[b].add(a);
  }

  // Extrémités libres : extrémités de sous-chemins ouverts qui ne touchent
  // aucun sous-chemin partenaire (ni son extrémité, ni son tracé — cas du T).
  const libres = [];
  for (const s of sub) {
    if (s.closed) continue;
    // Un sous-chemin dégénéré (le point du « i » ou du « j ») est une composante
    // isolée : il compte pour **une** extrémité, pas deux.
    const ends = s.points.length <= 1 || polylineLength(s.points) < 1e-6
      ? [s.points[0]]
      : [s.points[0], s.points[s.points.length - 1]];
    for (const p of ends) {
      let bound = false;
      for (const other of partners[s.index]) {
        if (distToPolyline(p, sub[other].points) <= TOL) { bound = true; break; }
      }
      if (!bound) libres.push({ x: p.x, y: p.y, trait: s.index });
    }
  }

  // Boucles : sous-chemins fermés + cycles du graphe des jonctions.
  const closedCount = sub.filter((s) => s.closed).length;
  const cycles = cyclomatic(sub.length, jonctions);

  return {
    traits: sub.length,
    extremites: libres.length,
    boucles: closedCount + cycles,
    libres,
    sub,
  };
}

/** Nombre cyclomatique E − V + C du multigraphe des jonctions. */
function cyclomatic(vertexCount, edges) {
  const parent = Array.from({ length: vertexCount }, (_, i) => i);
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const [a, b] of edges) union(a, b);
  const roots = new Set();
  for (let i = 0; i < vertexCount; i++) roots.add(find(i));
  return edges.length - vertexCount + roots.size;
}

function distToPolyline(p, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    best = Math.min(best, distToSegment(p, points[i - 1], points[i]));
    if (best === 0) return 0;
  }
  if (points.length === 1) best = Math.min(best, Math.hypot(p.x - points[0].x, p.y - points[0].y));
  return best;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function cubic(a, b, c, d, t) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

function quad(a, b, c, t) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
}

/** Paramétrisation « endpoint → centre » d'un arc elliptique (SVG 1.1 F.6.5). */
function arcPoints(x1, y1, rx, ry, rotDeg, large, sweep, x2, y2, samples) {
  const out = [];
  if (rx === 0 || ry === 0) return [{ x: x2, y: y2 }];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi); const sin = Math.sin(phi);
  const dx2 = (x1 - x2) / 2; const dy2 = (y1 - y2) / 2;
  const x1p = cos * dx2 + sin * dy2;
  const y1p = -sin * dx2 + cos * dy2;
  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const sign = large !== sweep ? 1 : -1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((samples * Math.abs(dtheta)) / (2 * Math.PI)));
  for (let i = 1; i <= n; i++) {
    const th = theta1 + (dtheta * i) / n;
    const px = cos * rx * Math.cos(th) - sin * ry * Math.sin(th) + cx;
    const py = sin * rx * Math.cos(th) + cos * ry * Math.sin(th) + cy;
    out.push({ x: px, y: py });
  }
  return out;
}
