/**
 * « On retourne les 9 » (`m.retournerLesNeuf`, code `mr9`) — le demi-tour, sur
 * un VECTEUR.
 *
 * `p.retournement` (`pr9`) savait déjà retourner un 9, mais un seul, et une fois
 * tout réduit à un nombre unique. Le moteur, lui, produit des vecteurs pleins
 * de 9 : la gématrie anglaise suivie de la réduction chiffre à chiffre ne peut
 * rendre que des multiples de 3, donc 3, 6 ou 9. Ce test vérifie les quatre
 * choses qui font qu'une telle méthode DÉMONTRE au lieu d'affirmer :
 *
 *  1. la dérivation — la valeur d'arrivée vient d'`apply()`, pas d'une seconde
 *     copie qui pourrait diverger ;
 *  2. le refus — sans un seul 9, l'opérateur ne s'applique pas, plutôt que de
 *     fabriquer une étape qui ne transforme rien ;
 *  3. le geste — les 9 se retournent UN PAR UN, et ce qui n'est pas un 9 ne
 *     bouge ni à l'écran ni dans l'identité de son jeton ;
 *  4. le contrôle croisé — la compilation ÉCHOUE si l'affichage et le calcul
 *     divergent, elle ne rend pas silencieusement.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { MAPPEURS } from '../../moteur/transformations/mappeurs.js';
import { POSTS } from '../../moteur/transformations/posts.js';
import { DUREE_OP } from '../../moteur/transformations/commun.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const OP = MAPPEURS.find((m) => m.id === 'm.retournerLesNeuf');
const P9 = POSTS.find((p) => p.id === 'p.retournement');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const jetons = (v) => v.map((n, i) => ({ id: `t${i}`, text: String(n), kind: 'number' }));

/** Ce que l'opérateur émet réellement sur un vecteur donné. */
function emission(valeur, langue = 'fr') {
  const traces = valeur.map((_, i) => [[i, i + 1]]);
  const rendu = OP.apply(valeur, traces);
  if (!rendu) return { rendu: null, steps: [], sortie: [], ctx: null };
  const avant = { type: 'NUMS', valeur, traces };
  const apres = { type: 'NUMS', valeur: rendu.valeur, traces: rendu.traces };
  const ctx = { ids: valeur.map((_, i) => `t${i}`), cle: 'e1', langue };
  return {
    rendu,
    steps: OP.steps(avant, apres, ctx),
    sortie: OP.sortie(avant, apres, ctx),
    ctx,
  };
}

// ───────────────────────── 1. la table, dérivée de la fonction

test('★ chaque 9 devient un 6, et TOUT le reste est laissé intact', () => {
  // La table attendue n'est pas recopiée ailleurs : elle est ici, en toutes
  // lettres, et c'est le seul endroit du dépôt où elle est écrite à la main.
  const VECTEURS = [
    [[9], [6]],
    [[3, 9, 6], [3, 6, 6]],
    [[9, 9, 9], [6, 6, 6]],
    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 6]],
    // ★ 19, 90, 99 ne sont PAS des 9 : un demi-tour ne se fait pas chiffre par
    // chiffre dans un nombre — « 19 » retourné ne donne pas « 16 », il donne
    // une figure que personne ne saurait lire. La méthode ne s'autorise que du
    // seul cas où le dessin tient.
    [[19, 9, 90, 99], [19, 6, 90, 99]],
    // Le signe non plus ne se retourne pas : −9 reste −9.
    [[-9, 9], [-9, 6]],
  ];
  for (const [entree, attendu] of VECTEURS) {
    const r = OP.apply(entree, entree.map(() => []));
    assert.ok(r, `« ${entree} » : refusé alors qu'il porte un 9`);
    assert.deepEqual(r.valeur, attendu, `« ${entree} »`);
    assert.equal(r.valeur.length, entree.length, 'la largeur du vecteur ne bouge jamais');
    // Ce n'est pas un filtre : rien n'est jeté, rien n'est réordonné.
    entree.forEach((n, i) => {
      if (n !== 9) assert.equal(r.valeur[i], n, `« ${entree} » : le rang ${i} a bougé sans être un 9`);
    });
  }
});

test('la valeur d’arrivée est la même que celle du finisseur `pr9`', () => {
  // Deux opérateurs, une seule règle. Si l'un des deux dérivait, c'est ici que
  // ça se verrait — et le registre append-only interdit de les réconcilier
  // après coup (CONTRACTS §4.1).
  assert.equal(P9.apply(9, [[]]).valeur, OP.apply([9], [[]]).valeur[0]);
  assert.equal(P9.apply(6, [[]]), null, 'p9 ne retourne pas le 6');
  assert.equal(OP.apply([6, 6, 6], [[], [], []]), null, 'ni son pendant vectoriel');
});

// ───────────────────────── 2. le refus : pas de 9, pas d'étape

test('★ sans un seul 9, l’opérateur REFUSE au lieu de rendre son entrée', () => {
  for (const v of [[], [6], [3, 6, 6], [1, 2, 3, 4, 5, 6, 7, 8], [19, 90, 99], [-9]]) {
    assert.equal(OP.apply(v, v.map(() => [])), null, `« ${v} » n'a pas de 9 à retourner`);
  }
  // Le pourquoi : une étape qui rend son entrée est sautée silencieusement par
  // `scenario.js`, et l'URL porterait alors un code que la démonstration ne
  // montre nulle part.
  const { steps } = emission([3, 6, 6]);
  assert.deepEqual(steps, [], 'aucune étape à émettre');
});

// ───────────────────────── 3. le geste : un par un, et rien d'autre ne bouge

test('★ les 9 se retournent UN PAR UN, jamais tous d’un coup', () => {
  const { steps } = emission([9, 3, 9, 6, 9]);
  assert.equal(steps.length, 1, 'un seul step : c’est un geste de ligne, pas un par jeton');

  const flips = steps[0].ops.filter((o) => o.op === 'flip180');
  assert.equal(flips.length, 3, 'trois 9, trois demi-tours');
  assert.deepEqual(flips.map((o) => o.target), ['t0', 't2', 't4'], 'et seulement les 9');

  // ★ Le suivant commence quand le précédent a fini. Une vague traverse la
  // ligne ; un clignotement collectif ne se lit pas — et deux `flip180` munis
  // d'un `to` appellent chacun `ctx.reflow()`, donc animeraient deux fois
  // `translate` sur les mêmes jetons s'ils se chevauchaient.
  flips.forEach((o, i) => {
    if (i) assert.equal(o.at, flips[i - 1].at + DUREE_OP.flip180, `demi-tour ${i} : départ prématuré`);
  });
  assert.equal(flips[0].at, 0);

  // Le `pulse` ferme la marche, une fois le dernier demi-tour accompli.
  const pulse = steps[0].ops.at(-1);
  assert.equal(pulse.op, 'pulse');
  assert.deepEqual(pulse.targets, flips.map((o) => o.to.id));
  assert.equal(pulse.at, flips.at(-1).at + DUREE_OP.flip180);
});

test('★ ce qui n’est pas un 9 ne bouge pas — ni la ligne, ni l’identité du jeton', () => {
  const { steps, sortie, ctx } = emission([9, 3, 9, 6, 9]);
  const immobiles = [1, 3];

  // Aucune op ne les vise, ni comme départ ni comme arrivée.
  const vises = new Set();
  for (const o of steps[0].ops) {
    if (o.target) vises.add(o.target);
    for (const t of o.targets || []) vises.add(t);
  }
  for (const i of immobiles) assert.ok(!vises.has(ctx.ids[i]), `le rang ${i} est visé par une op`);

  // Et ils gardent leur identifiant : un renommage sans geste ferait croire au
  // pont qu'un jeton a été remplacé alors qu'il n'a pas bougé.
  for (const i of immobiles) assert.equal(sortie[i], ctx.ids[i], `le rang ${i} a été renommé`);
  for (const i of [0, 2, 4]) assert.notEqual(sortie[i], ctx.ids[i], `le rang ${i} devait naître neuf`);
  // Tout ce que les étapes créent est exactement ce que `sortie` annonce.
  assert.deepEqual(steps[0].ops.filter((o) => o.to).map((o) => o.to.id),
    sortie.filter((id, i) => id !== ctx.ids[i]));
});

test('★ le geste compile, et l’immobilité se vérifie dans la timeline', () => {
  const valeur = [9, 3, 9, 6, 9];
  const { steps } = emission(valeur);
  const tl = compile(sc(steps.map((s, i) => ({ ...s, id: `s${i}` })), jetons(valeur)));

  assert.deepEqual(tl.warnings, [], 'aucune animation concurrente : les demi-tours se suivent');
  assert.equal(tl.steps.length, 1);
  assert.ok(tl.total > 0);

  // Les jetons qui ne sont pas des 9 ne portent AUCUNE animation. C'est la
  // preuve visuelle du contrat : la méthode ne touche que ce qu'elle annonce.
  for (const id of ['t1', 't3']) {
    assert.deepEqual(tl.anims.filter((a) => a.id === id), [],
      `« ${id} » est animé alors qu’il n’est pas un 9`);
  }
  // Les 9, eux, tournent bel et bien.
  for (const id of ['t0', 't2', 't4']) {
    assert.ok(tl.anims.some((a) => a.id === id && a.prop === 'rotate'), `« ${id} » ne tourne pas`);
  }
  // Trois 6 sont nés, aucun autre jeton n'a été créé.
  const neufs = tl.nodes.filter((n) => /^e1_/.test(n.id));
  assert.deepEqual(neufs.map((n) => n.text), ['6', '6', '6']);
});

test('la légende est DÉRIVÉE du calcul : les deux vecteurs, avant et après', () => {
  assert.equal(emission([3, 9, 6]).steps[0].caption, '3 9 6 → 3 6 6');
  assert.equal(emission([9]).steps[0].caption, '9 → 6');
  // Le titre, lui, est bilingue comme tout ce qui s'affiche.
  assert.equal(emission([9], 'fr').steps[0].title, 'On retourne les 9');
  assert.equal(emission([9], 'en').steps[0].title, 'Turn the 9s upside down');
});

// ───────────────────────── 4. le contrôle croisé : la compilation échoue

test('★ `flip180` refuse tout demi-tour qui n’est pas 9 → 6', () => {
  const scene = (from, to) => sc([{
    id: 'a', title: 'On retourne les 9',
    ops: [{ op: 'flip180', target: 't0', to: { id: 'r', text: to, kind: 'number' } }],
  }], [{ id: 't0', text: from, kind: 'number' }]);

  assert.ok(compile(scene('9', '6')), 'le seul demi-tour que la typographie autorise');

  // Un 9 qui donnerait autre chose qu'un 6 : la scène afficherait un résultat
  // que le calcul n'a pas produit. Échec, pas rendu silencieux.
  assert.throws(() => compile(scene('9', '8')), /retourné donne 6/);
  assert.throws(() => compile(scene('9', '9')), /retourné donne 6/);
  // Et retourner autre chose qu'un 9 ne prouve rien — le 6 le premier.
  assert.throws(() => compile(scene('6', '9')), /seul un 9 se retourne en 6/);
  assert.throws(() => compile(scene('19', '16')), /seul un 9 se retourne en 6/);

  // La rotation NUE, sans substitution, reste permise : elle n'affirme rien.
  assert.ok(compile(sc([{
    id: 'a', title: 'On fait tourner', ops: [{ op: 'flip180', target: 't0' }],
  }], [{ id: 't0', text: '4', kind: 'number' }])));
});
