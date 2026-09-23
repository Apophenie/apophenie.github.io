import { empreinteDe, MARQUES } from './rythme.js';

// Une étape entière constitue un geste : ses éventuelles annotations et ses
// sous-opérations restent ensemble. Aucune liste de conversions privilégiées.
export function empreinteEtape(step) {
  if (!step.ops?.length || step.duration !== undefined
    || step.ops.every((o) => MARQUES.has(o.op))) return null;
  const ids = new Set();
  for (const op of step.ops) {
    // Le déplacement implicite d’une fusion sera limité à sa zone.
    const e = empreinteDe(op.op === 'merge' ? { ...op, op: 'fusionLocale' } : op);
    if (e instanceof Set && typeof op.exposant === 'string') e.add(op.exposant);
    if (!(e instanceof Set)) return null;
    if (!e.size && !MARQUES.has(op.op)) return null;
    for (const id of e) ids.add(id);
  }
  return ids.size ? ids : null;
}

export function memeGeste(a, b) {
  return a.code === b.code && a.ops.length === b.ops.length
    && a.ops.every((op, i) => op.op === b.ops[i].op
      && ['carre', 'puissance', 'factorielle', 'division', 'modulo', 'egaliser', 'denombrement', 'symbol'].every((k) => op[k] === b.ops[i][k]));
}

// Les reflows des primitives travaillent dans des zones indépendantes. Chaque
// zone est dimensionnée par une compilation isolée du geste, puis toutes les
// places sont ouvertes ensemble avant le départ de la vague.
export function preparerZones(scene, entrees, mesurer) {
  const ancienAtelier = scene.atelierActif;
  const fluxInitial = [...scene.flow];
  let active = null;
  let zoom = 1;
  const anciens = new Map();
  const zones = entrees.map((entree, i) => {
    const ids = empreinteEtape(entree);
    const sources = scene.flow.filter((id) => ids.has(id));
    const tokens = sources.map((id) => {
      const n = scene.get(id);
      return { id, text: n.text, kind: n.kind, role: n.role, w: n.w, ...(n.group ? { group: n.group } : {}) };
    });
    const accessoires = [...new Set([...ids, ...sources.flatMap((id) => scene.satellitesDe(id))])].filter((id) => scene.has(id) && !sources.includes(id));
    const plan = mesurer({ version: 1, tokens, steps: [entree] }, (copie) => {
      const dx = copie.pos(sources[0]).x - scene.pos(sources[0]).x;
      const dy = copie.pos(sources[0]).y - scene.pos(sources[0]).y;
      for (const id of accessoires) {
        const n = scene.get(id), p = scene.pos(id);
        copie.create({ ...n, data: { ...n.data }, base: { ...n.base }, inFlow: false });
        copie.place(id, { x: p.x + dx, y: p.y + dy });
      }
    });
    for (const a of plan.anims) if (a.id === '@camera' && a.prop === 'scale') {
      for (const k of a.keyframes) if (typeof k.value === 'number') zoom = Math.min(zoom, k.value);
    }
    const translations = new Map(), echelles = new Map();
    for (const a of plan.anims) {
      if (a.prop === 'translate') {
        if (!translations.has(a.id)) translations.set(a.id, []);
        translations.get(a.id).push(...a.keyframes.map((k) => k.value?.x));
      } else if (a.prop === 'scale') {
        const valeurs = a.keyframes.map((k) => k.value).filter((v) => typeof v === 'number');
        echelles.set(a.id, Math.max(echelles.get(a.id) || 1, ...valeurs));
      }
    }
    let min = Infinity, max = -Infinity;
    for (const n of plan.nodes) {
      if (n.role === 'camera' || n.role === 'pan') continue;
      const xs = [n.base.translate?.x, ...(translations.get(n.id) || [])];
      const demi = n.w * (echelles.get(n.id) || 1) / 2;
      for (const x of xs) if (Number.isFinite(x)) {
        min = Math.min(min, x - demi);
        max = Math.max(max, x + demi);
      }
    }
    return { id: `@vague:${i}`, sources, flow: [...sources], largeur: Math.max(1, 2 * Math.max(max - plan.layoutOpts.centerX, plan.layoutOpts.centerX - min)),
      ancres: new Map(), accolades: new Map(), placesGardees: [], zonesJusqua: new Map(), resultatsArrives: [] };
  });
  const parSource = new Map(zones.flatMap((z) => z.sources.map((id) => [id, z])));
  const parent = scene.get(zones[0].sources[0]).data?.atelier;
  const fluxDeTravail = scene.flow.filter((id) => scene.get(id).data?.atelier === parent);
  const ranges = [];
  for (const id of fluxDeTravail) {
    const z = parSource.get(id) || { id: `@vague:fixe:${id}`, sources: [id], largeur: scene.get(id).w };
    if (!ranges.includes(z)) ranges.push(z);
  }
  const gap = Math.max(scene.layoutOpts.gap, scene.metrics.fontSize * 0.6);
  const largeur = ranges.reduce((n, z) => n + z.largeur, 0) + gap * Math.max(0, ranges.length - 1);
  zoom = Math.min(zoom, scene.layoutOpts.maxWidth / Math.max(1, largeur));
  const positions = fluxDeTravail.map((id) => scene.pos(id));
  const centre = positions.length ? (positions[0].x + positions.at(-1).x) / 2 : scene.layoutOpts.centerX;
  let x = centre - largeur / 2;
  for (const z of ranges) {
    const y = scene.pos(z.sources[0]).y;
    scene.ateliers.set(z.id, { ...scene.layoutOpts, centerX: x + z.largeur / 2, centerY: y });
    x += z.largeur + gap;
    for (const id of z.sources) {
      const n = scene.get(id);
      anciens.set(id, n.data?.atelier);
      n.data = { ...n.data, atelier: z.id };
    }
  }
  const registres = Object.fromEntries(['ancres', 'accolades', 'placesGardees', 'zonesJusqua', 'resultatsArrives'].map((k) => [k, scene[k]]));
  const mouvements = scene.relayout();
  for (const m of [...mouvements]) for (const id of scene.satellitesDe(m.id)) {
    if (!scene.has(id) || !scene.get(id).alive) continue;
    const p = scene.pos(id);
    if (!p) continue;
    const to = { x: p.x + m.to.x - m.from.x, y: p.y + m.to.y - m.from.y };
    scene.place(id, to);
    mouvements.push({ id, from: { x: p.x, y: p.y }, to });
  }
  return {
    mouvements,
    zoom,
    activer(i) {
      if (active !== null) zones[active].flow = scene.flow;
      active = i;
      scene.flow = zones[i].flow;
      scene.atelierActif = zones[i].id;
      for (const k of Object.keys(registres)) scene[k] = zones[i][k];
    },
    terminer() {
      if (active !== null) zones[active].flow = scene.flow;
      const vus = new Set();
      scene.flow = fluxInitial.flatMap((id) => {
        const z = parSource.get(id);
        if (!z) return [id];
        if (vus.has(z)) return [];
        vus.add(z);
        return z.flow;
      });
      const noms = new Set(ranges.map((z) => z.id));
      for (const n of scene.nodes.values()) if (noms.has(n.data?.atelier)) {
        const atelier = anciens.has(n.id) ? anciens.get(n.id) : ancienAtelier;
        if (atelier) n.data.atelier = atelier;
        else delete n.data.atelier;
      }
      for (const id of noms) scene.ateliers.delete(id);
      scene.atelierActif = ancienAtelier;
      Object.assign(scene, registres);
    },
  };
}
