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

/**
 * ★ **LES SUPERPOSITIONS VOULUES DE LA POTENCE — et elles seules.**
 *
 * « Jamais 2 chiffres ne se superposent sur la ligne de base » vaut pour tout
 * ce qui est POSÉ. Le geste de la potence, lui, fait naître des copies sur ce
 * qu'elles copient et les fait fondre dans ce qu'elles rejoignent (l'autrice :
 * « une copie superposée du nbr », « quand le diviseur arrive sur le nombre »,
 * « un fragment qui vient former puis s'incrémenter à nbr »). Ces rencontres-là
 * sont le geste ; toute autre est un défaut. Chaque nœud de la potence porte
 * son rôle (`data.potence`, `primitives/potence.js › ROLES`) :
 *
 *  · la COPIE DU DIVISEUR se superpose au diviseur dont elle part (même texte,
 *    jeton de la ligne), à la zone EN JEU du dividende où elle arrive, à la
 *    copie du nombre qui paraît sous elle au rebond, et aux fragments qu'elle
 *    devient ;
 *  · un FRAGMENT se superpose à la zone en jeu et à la copie dont il sort, aux
 *    autres fragments nés au même point, et au compteur qu'il vient incrémenter ;
 *  · une COPIE DU NOMBRE (le nombre partiel au rebond, le reste) se superpose à
 *    la zone en jeu qu'elle copie ou qu'elle rejoint, à ses sœurs quand elles
 *    convergent sur le compteur, et à ce compteur.
 *
 * « En jeu » veut dire à pleine encre : une copie qui passerait sur un chiffre
 * ESTOMPÉ, sur un voisin, sur un signe de l'expression ou sur le quotient
 * reste une faute.
 *
 * ⚠️ `@potpaquet` sans rôle : l'exemplaire en vol de l'ancien geste, exclu en
 *   bloc. Il disparaît avec lui.
 */
export function superpositionVoulue(p, q) {
  return voulueDans(p, q) || voulueDans(q, p);
}

function voulueDans(a, b) {
  const enJeu = b.potence === 'zone' && b.opacite > 0.5;
  switch (a.potence) {
    case 'copie-diviseur':
      return enJeu || (!b.potence && b.texte === a.texte)
        || b.potence === 'fragment' || b.potence === 'copie-nombre';
    case 'fragment':
      return enJeu || ['fragment', 'copie-diviseur', 'compteur'].includes(b.potence);
    case 'copie-nombre':
      return enJeu || ['copie-nombre', 'copie-diviseur', 'compteur'].includes(b.potence);
    default:
      return !a.potence && a.id.startsWith('@potpaquet');
  }
}

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
        // le rôle d'un nœud de la potence (`primitives/potence.js › ROLES`)
        potence: (n.data && n.data.potence) || null,
      });
    }
    return out;
  };

  /**
   * Le pire chevauchement entre jetons posés sur une même ligne, sur une
   * fenêtre de temps échantillonnée — `null` s'il n'y en a aucun. Les
   * superpositions VOULUES sont écrites une fois, dans `superpositionVoulue`.
   */
  const chevauchement = (debut, fin, n = 500, voulue = superpositionVoulue) => {
    let pire = null;
    for (let k = 0; k <= n; k++) {
      const t = debut + ((fin - debut) * k) / n;
      const vus = visibles(t);
      for (let i = 0; i < vus.length; i++) {
        for (let j = i + 1; j < vus.length; j++) {
          const p = vus[i];
          const q = vus[j];
          if (voulue(p, q)) continue;
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
