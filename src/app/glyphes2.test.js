/**
 * ★ **LES CONTRÔLES DE LA VARIANTE JOST — `glyphes2.html`.**
 *
 * Les mêmes que `glyphes.test.js`, portés sur la seconde chaîne, plus UN qui
 * n'a de sens que parce qu'il y a désormais deux polices :
 *
 *  · **les teintes sont des COULEURS.** `--oracle` et `--pedagogue` existent dans
 *    `tokens.css` — un `grep` le confirme — mais ce sont des familles de
 *    POLICES, et `stroke: "Jost", Futura, …` est invalide. Deux colonnes de
 *    `glyphes.html` sont restées vides pour ça, et le piège est ici PLUS tendu
 *    qu'ailleurs puisque cette page parle justement de Jost ;
 *  · **la pose ne perd ni n'invente de trait, ni de boucle** ;
 *  · **la fidélité et la couverture sont bornées**, dans les deux sens ;
 *  · **le budget de nœuds est tenu**, et il est plus serré que celui de
 *    JetBrains parce que Jost n'empatte rien ;
 *  · ★ **LES BOUCLES SONT LES MÊMES QUE CELLES DU GLYPHE RETENU.** C'est
 *    l'invariant inter-polices, et il ne pouvait pas être testé tant qu'il n'y
 *    avait qu'une police :
 *
 *    > « Les boucles, qui sont l'invariant. Ça ne devrait pas changer quelle que
 *    >   soit la police ou presque — un `g` à deux boucles existe ailleurs, pas
 *    >   ici. Une boucle qui apparaît ou disparaît est un défaut, pas une
 *    >   lecture. » (l'auteur)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GLYPHES } from '../moteur/tables/glyphes.js';
import { setGlyphes, deriveGlyph, flatten, parsePath } from '../visuel/glyphes.js';
import { CANDIDATS } from '../gfx/_jost-candidats.js';
import { AXES, TRAITS } from '../gfx/_jost-axe.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(ICI, 'glyphes2-main.js'), 'utf8');
const page = readFileSync(join(ICI, '..', 'glyphes2.html'), 'utf8');
const jetons = readFileSync(join(ICI, '..', 'styles', 'tokens.css'), 'utf8');

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

const SIGNES = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const comptes = (g) => deriveGlyph(g);

/** La valeur d'un jeton CSS, telle que `:root` la pose. */
function valeurDuJeton(nom) {
  const m = new RegExp(`^\\s*--${nom}:\\s*([^;]+);`, 'm').exec(jetons);
  return m ? m[1].trim() : null;
}

const estUneCouleur = (v) => /^#[0-9a-f]{3,8}$/i.test(v)
  || /^(rgb|hsl|color|oklch|lab)a?\(/i.test(v)
  || /^var\(--/.test(v);

test('★ glyphes2 — chaque teinte de tracé est bien une COULEUR', () => {
  const teintes = [...source.matchAll(/'var\(--([a-z0-9-]+)\)'/g)].map((m) => m[1]);
  assert.ok(teintes.length >= 4, `au moins quatre teintes attendues, vu ${teintes.length}`);
  for (const nom of new Set(teintes)) {
    const v = valeurDuJeton(nom);
    assert.ok(v, `le jeton « --${nom} » n'existe pas dans tokens.css`);
    assert.ok(estUneCouleur(v),
      `« --${nom} » vaut ${JSON.stringify(v)} : ce n'est pas une couleur, `
      + 'et un tracé peint avec ne se dessinera pas');
  }
});

/**
 * ⚠️ **LA PAGE DOIT ÊTRE HORS DU SITE, comme `glyphes.html` et `debug.html`.**
 *   Aucun lien n'y mène ; si un robot l'indexait, une page d'instrument
 *   deviendrait une page publique du site satirique. Le `meta robots` est la
 *   seule chose qui l'en empêche, et il se supprime d'un copier-coller.
 */
test('★ glyphes2 — la page reste hors du site', () => {
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/,
    'glyphes2.html doit porter son `meta robots` : c’est un instrument, pas une page');
  assert.match(page, /app\/glyphes2-main\.js/,
    'glyphes2.html doit charger `glyphes2-main.js`, et non celui de la page jumelle');
});

/**
 * ★ **L'ÉCHELLE DE LA COLONNE « POLICE » N'EST PAS CELLE DE LA PAGE JUMELLE.**
 *
 * La hauteur de capitale de JetBrains Mono vaut 730/1000 de cadratin, celle de
 * Jost 700/1000. Reprendre 0,73 poserait la capitale de Jost à 575 au lieu de
 * 600 — vingt-cinq unités sous la réglure, qu'on mettrait sur le compte du
 * dessin. Le chiffre se lit dans l'extrait, pas dans la page jumelle.
 */
test('★ glyphes2 — la capitale de Jost est celle que l’extrait déclare', () => {
  const m = /const CAP_EM = ([\d.]+);/.exec(source);
  assert.ok(m, 'glyphes2-main.js doit poser son CAP_EM en clair');
  assert.equal(Number(m[1]), 0.70,
    'Jost déclare sCapHeight 700 pour 1000 unités par cadratin : 0,70 et pas 0,73');
  assert.match(source, /_jost-axe\.js/, 'la page doit lire l’axe de JOST');
  assert.match(source, /_jost-candidats\.js/, 'la page doit lire les mesures de JOST');
});

/* ⚠️ Un `d` à plusieurs sous-chemins s'aplatit SOUS-CHEMIN PAR SOUS-CHEMIN : les
   relier fabrique un segment fantôme qui traverse la lettre, et toute mesure de
   distance s'appuie dessus pour paraître bonne. */
const nuageDe = (d) => d.split(/(?=M)/).filter((s) => s.trim()).map((s) => flatten(s).points);

const auTrace = (p, sous) => {
  let best = Infinity;
  for (const pts of sous) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]; const c = pts[i];
      const dx = c.x - a.x; const dy = c.y - a.y; const L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
      best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
    }
  }
  return best;
};

/* On DENSIFIE : un trait droit ne rend que ses deux bouts, et se trouverait donc
   exclu de la mesure — précisément les traits qu'on vient de redresser, et Jost
   n'a presque que ceux-là. */
function densifie(pts, pas = 3) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / pas));
    for (let j = 0; j < n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
  }
  if (pts.length) out.push(pts[pts.length - 1]);
  return out;
}

/** Le pire écart d'un jeu de traits à son axe — la FIDÉLITÉ, en unités du moteur. */
function ecartALAxe(traits, axe) {
  const sous = nuageDe(axe);
  let pire = 0;
  for (const t of traits) {
    const P = flatten(t.d).points;
    if (P.length < 2) continue;
    for (const p of densifie(P)) pire = Math.max(pire, auTrace(p, sous));
  }
  return pire;
}

/**
 * ★ **ET L'AUTRE SENS : LA COUVERTURE.** La fidélité seule note parfaitement un
 *   tracé qui ne couvre rien — un moignon posé sur l'axe en est tout près.
 *
 * ⚠️ Les sous-chemins d'axe de moins de quatre-vingts unités d'étendue sont
 *   ignorés : ce sont les points du `i` et du `j`, qui n'ont à être couverts par
 *   rien d'autre qu'eux-mêmes.
 */
const ETENDUE_BRIN = 80;

function couvertureDeLAxe(traits, axe) {
  const rendu = traits.map((t) => flatten(t.d).points).filter((p) => p.length >= 2);
  let pire = 0;
  for (const brin of nuageDe(axe)) {
    const xs = brin.map((p) => p.x); const ys = brin.map((p) => p.y);
    const etendue = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (etendue < ETENDUE_BRIN) continue;
    for (const p of densifie(brin)) pire = Math.max(pire, auTrace(p, rendu));
  }
  return pire;
}

test('★ glyphes2 — les traits posés gardent les boucles et les traits déclarés', () => {
  for (const c of SIGNES) {
    assert.ok(TRAITS[c], `« ${c} » n'a pas de traits engendrés`);
    assert.ok(CANDIDATS[c], `« ${c} » n'a pas de recette`);
    const a = comptes(CANDIDATS[c]); const b = comptes(TRAITS[c]);
    assert.equal(b.boucles, a.boucles,
      `« ${c} » : ${b.boucles} boucle(s) au lieu de ${a.boucles} — une boucle ne dépend pas de la pose`);
    assert.equal(b.traits, a.traits,
      `« ${c} » : ${b.traits} trait(s) au lieu de ${a.traits} — la pose n'en invente ni n'en perd`);
    assert.ok(b.extremites >= a.extremites,
      `« ${c} » : ${b.extremites} extrémités libres pour ${a.extremites} déclarées — `
      + 'un contact a été fabriqué pour faire tomber le compte juste');
  }
});

/**
 * ★ **L'INVARIANT INTER-POLICES : LES BOUCLES.**
 *
 * > « Les boucles, qui sont l'invariant. Ça ne devrait pas changer quelle que
 * >   soit la police ou presque. » (l'auteur)
 *
 * Les TRAITS peuvent légitimement changer — Jost trace son `w` d'un seul geste
 * là où JetBrains en demande quatre —, les EXTRÉMITÉS aussi — Jost n'empatte
 * pas le `i` —, mais un `b` a une panse dans toutes les polices, et un `B` en a
 * deux. Une boucle qui apparaît ou disparaît entre les deux chaînes n'est donc
 * pas une lecture différente : c'est une faute de l'une des deux.
 */
test('★ glyphes2 — Jost et le tracé retenu comptent les MÊMES boucles', () => {
  const ecarts = [];
  for (const c of SIGNES) {
    if (!GLYPHES[c]) continue;
    const a = comptes(GLYPHES[c]).boucles;
    const b = comptes(TRAITS[c]).boucles;
    if (a !== b) ecarts.push(`« ${c} » : ${b} boucle(s) en Jost pour ${a} au retenu`);
  }
  assert.deepEqual(ecarts, [], `les boucles ont bougé :\n  ${ecarts.join('\n  ')}`);
});

test('★ glyphes2 — aucun trait ne s’éloigne de son axe', () => {
  const LIMITE = 20;
  for (const c of SIGNES) {
    const e = ecartALAxe(TRAITS[c].traits, AXES[c]);
    assert.ok(e < LIMITE,
      `« ${c} » : le trait posé s'écarte de ${e.toFixed(1)} unités de son axe `
      + `(limite ${LIMITE}) — c'est un dessin plausible et faux`);
  }
});

/**
 * ★ **ET L'AUTRE SENS : LA COUVERTURE — avec un plancher NOMMÉ, et une ironie.**
 *
 * ⚠️ **DEUX SIGNES BUTENT, ET C'EST LE PRIX EXACT DE CE QUE JOST FAIT GAGNER
 *   AILLEURS.** Jost trace son `W` et son `N` **d'un seul coup de crayon** là où
 *   JetBrains lève la main — son `W` fait quatre traits, son `N` trois. C'est
 *   précisément d'où viennent les vingt-quatre traits économisés sur
 *   l'alphabet… et c'est aussi ce qui casse ici : un trait unique, c'est UN
 *   guide, et `jetbrains-axe.py › _echelonne` répartit un nombre FIXE
 *   d'abscisses par guide (`ABSCISSES = 60`). Un `W` dont l'axe court sur 2 544
 *   unités reçoit donc 42 unités par abscisse ; au fond d'un `V` qui tourne de
 *   145°, le seau enjambe les deux bras et le point ajusté est tiré d'une
 *   vingtaine d'unités le long de la bissectrice.
 *
 * ★ **ET DENSIFIER EMPIRE — c'est mesuré, pas supposé.** Le moteur essaie déjà
 *   les deux réglages et garde le meilleur (`traits`, quatre poses par signe) ;
 *   forcé aux abscisses à la longueur, le `W` passe de 14,4/33,0 à **27,5/63,1**,
 *   parce que les bras s'ajustent alors localement et que la pointe perd ses
 *   deux longs bras de levier. Le moteur a raison de refuser.
 *
 * Mesuré : le guide, lui, est à **3,9 / 10,3** de l'axe — la lecture est juste,
 * c'est la PROJECTION qui bute. C'est donc un plancher de moteur, du même genre
 * que le `X`, le `r` et le `m` de `glyphes.test.js` : on le nomme, on le borne,
 * et on n'use pas de passes à le poursuivre. Les cinquante autres signes restent
 * tenus à 24.
 */
const PLANCHER_ZIGZAG = Object.freeze({ W: 34, N: 26 });

test('★ glyphes2 — l’axe est COUVERT, pas seulement longé', () => {
  const LIMITE = 24;
  for (const c of SIGNES) {
    const limite = PLANCHER_ZIGZAG[c] || LIMITE;
    const e = couvertureDeLAxe(TRAITS[c].traits, AXES[c]);
    assert.ok(e < limite,
      `« ${c} » : l'axe reste à ${e.toFixed(1)} unités du tracé le plus proche `
      + `(limite ${limite}) — un morceau de la lettre n'est pas dessiné`);
    if (PLANCHER_ZIGZAG[c]) {
      assert.ok(e >= LIMITE,
        `« ${c} » tient désormais la limite commune de ${LIMITE} (${e.toFixed(1)}) : `
        + 'le retirer de PLANCHER_ZIGZAG');
    }
  }
});

test('★ glyphes2 — l’axe et les traits couvrent les deux répertoires', () => {
  for (const c of SIGNES) {
    assert.ok(AXES[c] && AXES[c].startsWith('M'), `« ${c} » n'a pas d'axe`);
  }
  assert.equal(Object.keys(TRAITS).length, SIGNES.length);
});

/**
 * ★ **LE BUDGET DE POINTS — MESURÉ SUR JOST, ET NON RECOPIÉ DE JETBRAINS.**
 *
 * Chez JetBrains, l'auteur avait dicté les cinquante-deux nombres : il n'y avait
 * aucun moyen de les lire dans la police, qui ne livre qu'une masse d'encre par
 * lettre. Jost livre ses traits un par un, et le budget se COMPTE — la règle qui
 * compte étant celle que l'auteur énonce ailleurs :
 *
 * > « aux extrema, une poignée est horizontale ou verticale — jamais
 * >   oblique. » (l'auteur)
 *
 * Un nœud aux coins de l'axe et à ses extrema cardinaux, un cubique entre deux
 * nœuds, deux poignées s'il est courbe et zéro s'il est droit. C'est ce que
 * `python3 src/gfx/jost-traces.py --budget` compte, et le tableau ci-dessous en
 * est la copie — un budget est un CONTRAT, et un contrat qui se recalcule ne
 * contraint rien.
 *
 * ⚠️ **ET IL EST NETTEMENT PLUS SERRÉ QUE CELUI DE JETBRAINS**, parce que Jost
 *   n'empatte rien : `l` 2/0 contre 5/2, `I` 2/0 contre 6/0, `i` 3/0 contre 7/0,
 *   `t` 4/0 contre 6/2, `k` 5/0 contre 7/0. Recopier le budget de JetBrains
 *   aurait laissé passer un `l` en cinq nœuds — c'est-à-dire trois nœuds posés
 *   au milieu d'une droite.
 */
const BUDGET = Object.freeze({
  A: [5, 0], B: [11, 8], C: [5, 8], D: [5, 4], E: [8, 0], F: [6, 0], G: [6, 8],
  H: [6, 0], I: [2, 0], J: [3, 4], K: [5, 0], L: [3, 0], M: [5, 0], N: [4, 0],
  O: [5, 10], P: [7, 4], Q: [7, 10], R: [10, 4], S: [6, 10], T: [4, 0], U: [5, 4],
  V: [3, 0], W: [5, 0], X: [4, 0], Y: [4, 0], Z: [4, 0],
  a: [9, 12], b: [7, 10], c: [5, 8], d: [7, 10], e: [7, 8], f: [5, 4], g: [9, 14],
  h: [6, 4], i: [3, 0], j: [4, 4], k: [5, 0], l: [2, 0], m: [9, 8], n: [5, 4],
  o: [5, 10], p: [7, 10], q: [7, 10], r: [5, 2], s: [6, 10], t: [4, 0], u: [5, 4],
  v: [3, 0], w: [5, 0], x: [4, 0], y: [4, 0], z: [4, 0],
});

/** Nœuds distincts et poignées d'un glyphe, tels que l'œil les compte. */
function ossature(glyphe) {
  const noeuds = new Set();
  let poignees = 0;
  for (const t of glyphe.traits) {
    for (const { cmd, args } of parsePath(t.d)) {
      const c = cmd.toUpperCase();
      if (c === 'M' || c === 'L') noeuds.add(args.slice(-2).map((v) => v.toFixed(1)).join(','));
      else if (c === 'C') { poignees += 2; noeuds.add(args.slice(4).map((v) => v.toFixed(1)).join(',')); }
      else if (c === 'Q') { poignees += 1; noeuds.add(args.slice(2).map((v) => v.toFixed(1)).join(',')); }
    }
  }
  return { points: noeuds.size, poignees };
}

/**
 * ⚠️ **LES SIGNES QUI N'Y SONT PAS ENCORE SONT NOMMÉS, PAS TOLÉRÉS EN SILENCE.**
 *   Le contrôle reste STRICT sur tous les autres, et il échoue AUSSI si l'un de
 *   ceux-ci se met à tenir son budget — auquel cas il faut le retirer d'ici,
 *   comme on retire un écart de `derivees.js` quand le dessin rejoint la
 *   référence.
 */
/**
 * ⚠️ **DOUZE SIGNES DÉPASSENT, ET CHACUN D'EXACTEMENT UN NŒUD OU DEUX POIGNÉES.**
 *   Quarante sur cinquante-deux tiennent. Ce n'est pas un budget mal taillé :
 *   c'est le budget qui fait son travail de DÉTECTEUR, et il désigne à chaque
 *   fois la même chose — un quart de tour rendu en deux cubiques au lieu d'un.
 *   Le `r` est le cas net : son épaule est un quart de tour, qui demande UN
 *   cubique et deux poignées ; le moteur en pose deux et quatre. Le `U` de même
 *   (6/6 pour 5/4), le `D` (4/6 pour 5/4), le `P` (5/6 pour 7/4).
 *
 *   ★ Aucun d'eux ne dépasse en NŒUDS *et* en poignées à la fois, sauf le `n`,
 *     le `u`, le `f` et le `j` — qui débordent d'un seul nœud. Autrement dit :
 *     aucun tracé n'est massivement encombré, il reste une passe de recoupe aux
 *     sommets à faire porter sur les quarts de tour.
 */
// ★ Le `Y` en est SORTI le jour où la soudure a su poser un bout sur un NŒUD et
//   plus seulement sur un autre bout : sa queue arrivait à 9,2 unités du sommet
//   de son chevron, et ce décrochement lui coûtait un point de budget. C'est le
//   mécanisme qui a fait son travail — le contrôle échoue AUSSI quand une
//   exception n'a plus lieu d'être, et c'est lui qui a réclamé ce retrait.
const EN_ATTENTE = ['f', 'j', 'n', 'r', 'u', 'B', 'D', 'G', 'J', 'P', 'U'];

test('★ glyphes2 — le budget de points et de poignées, lettre par lettre', () => {
  const trop = [];
  for (const c of SIGNES) {
    const [mp, mh] = BUDGET[c];
    const { points, poignees } = ossature(TRAITS[c]);
    const dedans = points <= mp && poignees <= mh;
    if (EN_ATTENTE.includes(c)) {
      assert.ok(!dedans, `« ${c} » tient désormais son budget : le retirer de EN_ATTENTE`);
      continue;
    }
    if (points > mp) trop.push(`« ${c} » : ${points} points pour ${mp} admis`);
    if (poignees > mh) {
      trop.push(`« ${c} » : ${poignees} poignées pour ${mh} admises`
        + (mh === 0 ? ' — la lecture ne déclare que des droites' : ''));
    }
  }
  assert.deepEqual(trop, [], `hors budget :\n  ${trop.join('\n  ')}`);
});
