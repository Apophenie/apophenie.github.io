/** Le résultat calculé sert de cible au compteur de la glissière. */
import { EASE } from '../constants.js';

function disposition(ctx, nombre, x, y) {
  const n = ctx.scene.get(nombre), fs = ctx.metrics.fontSize, av = ctx.metrics.advance * 0.5;
  const nom = n.data?.cesarNom || 'César';
  const largeurs = [[...nom].length * av, fs * 0.4, Math.max(2, n.text.length) * av, 2 * av, n.w * 0.5];
  const gap = fs * 0.18;
  let gauche = x - (largeurs.reduce((a, b) => a + b, 0) + 4 * gap) / 2;
  const positions = largeurs.map((w) => { const p = { x: gauche + w / 2, y }; gauche += w + gap; return p; });
  return { n, nom, positions, largeurs, gap, av };
}

export function placerCibleCesar(ctx, nombre, x, y) {
  const { positions } = disposition(ctx, nombre, x, y);
  ctx.place(nombre, positions[4], { at: 0, dur: ctx.dur * 0.5 });
  ctx.anim({ id: nombre, prop: 'scale', to: 0.5, at: 0, dur: ctx.dur * 0.5 });
}

export function preparerCompteur(ctx, nombre, x, y) {
  const { n, nom, positions, largeurs, gap, av } = disposition(ctx, nombre, x, y);
  ctx.place(nombre, positions[4], { at: 0, dur: ctx.dur * 0.2 });
  const ids = ['nom', 'pointeur', 'compteur', 'egalite'].map((role) => ctx.gensym(`cesar-${role}`));
  ids.forEach((id, i) => {
    ctx.scene.create(i === 1 ? {
      id, role: 'bracket', inFlow: false, w: largeurs[i],
      data: { d: 'M 0 -14 C -3 -8 -9 -3 -9 3 A 9 9 0 1 0 9 3 C 9 -3 3 -8 0 -14 Z', cesarPointeur: true },
      base: { opacity: 0, fill: ctx.palette.gold, stroke: ctx.palette.gold, rotate: 0 },
    } : {
      id, role: 'label', text: [nom, '', '0', '!='][i], inFlow: false, w: largeurs[i],
      data: { scale: 0.5, cesarRole: ['nom', '', 'compteur', 'egalite'][i] },
      base: { opacity: 0, fill: ctx.palette.fg2 },
    });
    ctx.scene.place(id, positions[i]);
    if (i !== 1) ctx.anim({ id, prop: 'opacity', to: 1, at: 0, dur: ctx.dur * 0.16 });
  });
  n.data = { ...n.data, nomCesar: ids[0] };
  return { ids, nombre, x, y, nom, gap, av };
}

export function compterCrans(ctx, compteur, n, debut, course, ouverture) {
  const { ids, nombre, x, y, nom, gap, av } = compteur;
  const [nomId, pointeur, courant, egalite] = ids;
  const cran = course / n;
  ctx.anim({ id: pointeur, prop: 'opacity', to: 1, at: Math.max(0, debut - ctx.dur * 0.12), dur: ctx.dur * 0.12 });
  ctx.discrete({ id: courant, channel: 'text', at: debut, dur: course,
    render: (p) => String(Math.min(n, Math.floor(p * n + 1e-7))) });
  for (let i = 0; i < n; i++) ctx.anim({ id: pointeur, prop: 'rotate', values: [0, -28, 12, 0],
    offsets: [0, 0.65, 0.85, 1], at: debut + i * cran, dur: cran, ease: EASE.linear });
  const arrivee = debut + course;
  ctx.discrete({ id: egalite, channel: 'text', at: arrivee, dur: 1 / ctx.speed, render: () => '=' });
  const fin = arrivee + ouverture;
  for (const id of [pointeur, egalite, nombre]) ctx.anim({ id, prop: 'opacity', to: 0, at: fin, dur: ctx.dur * 0.16 });
  const wNom = [...nom].length * av, wNombre = String(n).length * av;
  const gauche = x - (wNom + gap + wNombre) / 2;
  ctx.place(nomId, { x: gauche + wNom / 2, y }, { at: fin, dur: ctx.dur * 0.2 });
  ctx.place(courant, { x: gauche + wNom + gap + wNombre / 2, y }, { at: fin, dur: ctx.dur * 0.2 });
  return fin + ctx.dur * 0.24;
}
