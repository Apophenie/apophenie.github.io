/**
 * ★ **CE QUE LA SCÈNE MONTRE À L'INSTANT t — un lecteur de timeline pour les
 * tests.**
 *
 * > « Jamais 2 chiffres ne se superposent sur la ligne de base. » (l'auteur)
 *
 * « Jamais » veut dire à AUCUN instant, pas seulement aux deux bouts d'un
 * mouvement : deux jetons en règle au départ et à l'arrivée peuvent se croiser
 * en chemin s'ils glissent sur des courbes différentes. Ce lecteur rejoue donc
 * la timeline compilée comme le navigateur la jouerait — les courbes
 * `cubic-bezier` évaluées pour de vrai, les canaux discrets résolus — et rend,
 * pour un instant donné, la position, l'opacité, l'échelle et le texte de
 * chaque jeton.
 *
 * Partagé par `potence.test.js` et `recherche/tests/liaison.test.js` : le même
 * œil pour la potence nue et pour la potence au bout d'une vraie voie.
 */

import { resolveDiscrete } from '../clock.js';

/** Une courbe `cubic-bezier` évaluée comme le navigateur l'évalue. */
export function courbe(easing) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(easing || '');
  if (!m) return (p) => p;
  const [x1, y1, x2, y2] = m[1].split(',').map(Number);
  const bez = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (p) => {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 40; k++) {
      const mi = (lo + hi) / 2;
      if (bez(x1, x2, mi) < p) lo = mi; else hi = mi;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

const melange = (a, b, q) => (typeof a === 'number'
  ? a + (b - a) * q
  : { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q });

/** Fabrique un lecteur de la timeline, indexé une fois pour toutes. */
export function lecteur(tl) {
  const parCanal = new Map();
  for (const a of tl.anims) {
    const k = `${a.id}::${a.prop}`;
    if (!parCanal.has(k)) parCanal.set(k, []);
    parCanal.get(k).push(a);
  }
  for (const l of parCanal.values()) l.sort((x, y) => x.delay - y.delay);
  const noeuds = new Map(tl.nodes.map((n) => [n.id, n]));

  const valeur = (id, prop, t) => {
    let v = noeuds.get(id).base[prop];
    for (const a of parCanal.get(`${id}::${prop}`) || []) {
      if (a.delay > t) break;
      const fr = a.keyframes;
      if (t >= a.delay + a.duration) { v = fr[fr.length - 1].value; continue; }
      const q = courbe(a.easing)((t - a.delay) / a.duration);
      let i = 0;
      while (i < fr.length - 2 && q > fr[i + 1].offset) i++;
      const span = fr[i + 1].offset - fr[i].offset || 1;
      v = melange(fr[i].value, fr[i + 1].value, (q - fr[i].offset) / span);
    }
    return v;
  };

  /** Les jetons VISIBLES à l'instant t, avec leur boîte. */
  const visibles = (t) => {
    const textes = resolveDiscrete(tl.discreteIndex, t);
    const out = [];
    for (const n of tl.nodes) {
      if (n.role !== 'text') continue;
      const o = valeur(n.id, 'opacity', t) ?? 1;
      if (!(o > 0.1)) continue;
      const r = textes.get(`${n.id}::text`);
      const texte = r ? r.value : n.text;
      if (!texte || !String(texte).trim()) continue;
      const p = valeur(n.id, 'translate', t);
      if (!p) continue;
      const s = valeur(n.id, 'scale', t) ?? 1;
      const demi = ([...texte].length * tl.metrics.advance * s) / 2;
      out.push({
        id: n.id, texte, x: p.x, y: p.y, opacite: o,
        g: p.x - demi, d: p.x + demi, h: tl.metrics.fontSize * s,
      });
    }
    return out;
  };

  /**
   * Le pire chevauchement entre jetons posés sur une même ligne, sur une
   * fenêtre de temps échantillonnée — `null` s'il n'y en a aucun. Les
   * exemplaires en vol de la potence sont exclus, et c'est voulu : ils se
   * DÉTACHENT du chiffre dont on les retire, c'est tout le geste.
   */
  const chevauchement = (debut, fin, n = 500) => {
    let pire = null;
    for (let k = 0; k <= n; k++) {
      const t = debut + ((fin - debut) * k) / n;
      const vus = visibles(t).filter((j) => !j.id.startsWith('@potpaquet'));
      for (let i = 0; i < vus.length; i++) {
        for (let j = i + 1; j < vus.length; j++) {
          const p = vus[i];
          const q = vus[j];
          if (Math.abs(p.y - q.y) >= ((p.h + q.h) / 2) * 0.8) continue;
          const recouvre = Math.min(p.d, q.d) - Math.max(p.g, q.g);
          if (recouvre > 0.5 && (!pire || recouvre > pire.recouvre)) {
            pire = { t: Math.round(t), recouvre, a: `${p.texte} (${p.id})`, b: `${q.texte} (${q.id})` };
          }
        }
      }
    }
    return pire;
  };
  return { valeur, visibles, chevauchement };
}
