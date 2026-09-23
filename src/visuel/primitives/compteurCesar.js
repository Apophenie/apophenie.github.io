/** Le résultat calculé sert de cible au compteur de la glissière. */
import { EASE, progressionDe } from '../constants.js';

export function instantCran(p, ease = EASE.linear) {
  if (ease === EASE.linear || p === 0 || p === 1) return p;
  const progression = progressionDe(ease);
  let a = 0, b = 1;
  for (let i = 0; i < 28; i++) {
    const m = (a + b) / 2;
    if (progression(m) < p) a = m; else b = m;
  }
  return (a + b) / 2;
}

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

export function preparerCompteur(ctx, nombre, x, y, geo) {
  const { n, nom, positions, largeurs, gap, av } = disposition(ctx, nombre, x, y);
  // Aligner la pointe sur une jointure de l'alphabet encore contigu. Tout
  // le libellé suit cet ajustement pour conserver ses espacements.
  const bordGauche = x - geo.cols * geo.cellW / 2;
  const jointure = bordGauche + Math.round((positions[1].x - bordGauche) / geo.cellW) * geo.cellW;
  const ajustement = jointure - positions[1].x;
  for (const p of positions) p.x += ajustement;
  const distanceBord = ctx.metrics.fontSize * 0.52;
  const longueur = distanceBord + ctx.metrics.fontSize * 0.065;
  const demiLargeur = ctx.metrics.fontSize * 0.085;
  ctx.place(nombre, positions[4], { at: 0, dur: ctx.dur * 0.2 });
  const ids = ['nom', 'pointeur', 'compteur', 'egalite'].map((role) => ctx.gensym(`cesar-${role}`));
  ids.forEach((id, i) => {
    ctx.scene.create(i === 1 ? {
      id, role: 'bracket', inFlow: false, w: largeurs[i],
      data: {
        d: `M 0 ${-longueur} Q ${-demiLargeur} -5 ${-demiLargeur} 1 A ${demiLargeur} ${demiLargeur} 0 1 0 ${demiLargeur} 1 Q ${demiLargeur} -5 0 ${-longueur} Z`,
        cesarPointeur: true, longueur, distanceBord, pas: geo.cellW,
      },
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

export function compterCrans(ctx, compteur, n, debut, course, ouverture, ease = EASE.linear) {
  const { ids, nombre, x, y, nom, gap, av } = compteur;
  const [nomId, pointeur, courant, egalite] = ids;
  const progression = progressionDe(ease);
  ctx.anim({ id: pointeur, prop: 'opacity', to: 1, at: Math.max(0, debut - ctx.dur * 0.12), dur: ctx.dur * 0.12 });
  ctx.discrete({ id: courant, channel: 'text', at: debut, dur: course,
    render: (p) => String(Math.min(n, Math.floor(progression(p) * n + 1e-7))) });
  const { longueur, distanceBord, pas } = ctx.scene.get(pointeur).data;
  const angle = Math.acos(distanceBord / longueur) * 180 / Math.PI;
  const courseContact = Math.sqrt(longueur ** 2 - distanceBord ** 2);
  const relache = courseContact / pas;
  // Tant que le bord pousse la pointe, son abscisse suit exactement la case.
  // Elle se libère quand elle atteint le dessous de la réglette, puis revient.
  const angles = Array.from({ length: 9 }, (_, i) => -Math.asin(courseContact * i / 8 / longueur) * 180 / Math.PI);
  const instants = angles.map((_, i) => relache * i / 8);
  angles.push(angle * 0.18, 0, 0);
  instants.push(relache + (1 - relache) * 0.4, relache + (1 - relache) * 0.75, 1);
  for (let i = 0; i < n; i++) {
    const a = instantCran(i / n, ease), b = instantCran((i + 1) / n, ease);
    const start = Math.round((debut + a * course) * 1000) / 1000;
    const end = Math.round((debut + b * course) * 1000) / 1000;
    ctx.anim({ id: pointeur, prop: 'rotate', values: angles,
      offsets: instants.map((p) => (instantCran((i + p) / n, ease) - a) / (b - a)),
      at: start, dur: end - start, ease: EASE.linear });
  }
  const arrivee = debut + course;
  ctx.discrete({ id: egalite, channel: 'text', at: arrivee, dur: 1 / ctx.speed, render: () => '=' });
  const fin = arrivee + ouverture;
  for (const id of [pointeur, egalite, nombre]) ctx.anim({ id, prop: 'opacity', to: 0, at: fin, dur: ctx.dur * 0.16 });
  const range = fin + ctx.dur * 0.16;
  const wNom = [...nom].length * av, wNombre = String(n).length * av;
  const gauche = x - (wNom + gap + wNombre) / 2;
  ctx.place(nomId, { x: gauche + wNom / 2, y }, { at: range, dur: ctx.dur * 0.2 });
  ctx.place(courant, { x: gauche + wNom + gap + wNombre / 2, y }, { at: range, dur: ctx.dur * 0.2 });
  return range + ctx.dur * 0.24;
}
