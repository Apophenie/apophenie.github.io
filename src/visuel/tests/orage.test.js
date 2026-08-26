/**
 * ★ L'ORAGE DU VERDICT — la nuit, la foudre, l'embrasement.
 *
 * « Lors du verdict, en plus de grossir le/les 666 et de leur mettre des
 * cornes : en thème clair, le passage à un fond noir/lugubre ; puis, quel que
 * soit le thème, un flash d'éclair/foudre qui s'applique au fond ; et un effet
 * d'embrasement animé autour de chaque 666 et chaque 666 à cornes. »
 * (l'auteur)
 *
 * Trois familles de choses sont vérifiées ici, et aucune ne se retrouverait en
 * relisant du code :
 *
 *  1. **l'interrupteur** — sans `scenographie`, la timeline est rigoureusement
 *     celle d'avant : pas un nœud, pas une animation de plus. C'est ce qui rend
 *     le registre sobre partageable « plus crédible » sans qu'on ait à le
 *     croire sur parole ;
 *  2. **le déterminisme et l'accessibilité** — l'éclair est une enveloppe
 *     écrite à la main (donc fonction du temps, §4.4), il compte DEUX éclats et
 *     pas trois (WCAG 2.3.1), et il disparaît entièrement en mouvement réduit ;
 *  3. **la solidarité** — le brasier est un décor accroché, il suit son chiffre
 *     et grandit avec lui, et il ne coûte pas de taille au verdict.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const chiffres = (suite) => [...suite].map((c, i) => ({ id: `d${i}`, text: c, kind: 'digit' }));

/** Le scénario minimal qui atteint un verdict : six 6, deux séries. */
function scenarioVerdict() {
  const tokens = chiffres('666666');
  return {
    version: 1,
    tokens,
    result: '666 666',
    steps: [{
      id: 's0',
      title: 'Le verdict',
      ops: [{ op: 'reveal', targets: tokens.map((t) => t.id), at: 250, stagger: 150 }],
      hold: 1200,
    }],
  };
}

const bati = (options = {}) => compile(scenarioVerdict(), options);
const noeuds = (tl, role) => tl.nodes.filter((n) => n.role === role);
const animsDe = (tl, id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop);

/* ══════════════════════════ 1. L'INTERRUPTEUR ═══════════════════════════ */

test('orage — sans scénographie, la timeline est celle d’avant : rien de plus', () => {
  const tl = bati();
  for (const role of ['nuit', 'eclair', 'brasier']) {
    assert.equal(noeuds(tl, role).length, 0, `« ${role} » ne devrait pas exister`);
  }
});

test('★ orage — la scénographie n’ajoute QUE du décor, jamais un jeton', () => {
  const nu = bati();
  const orageux = bati({ scenographie: true });
  const jetons = (tl) => tl.nodes.filter((n) => n.role === 'text').map((n) => n.id).sort();
  // Le point de tout le registre : sobre et scénique montrent le même calcul.
  assert.deepEqual(jetons(orageux), jetons(nu));
  assert.equal(orageux.total, nu.total, 'même durée : le théâtre ne rallonge pas la démonstration');
});

test('orage — nuit, éclair, et UN brasier par chiffre du verdict', () => {
  const tl = bati({ scenographie: true });
  assert.equal(noeuds(tl, 'nuit').length, 1);
  assert.equal(noeuds(tl, 'eclair').length, 1);
  assert.equal(noeuds(tl, 'brasier').length, 6, 'un par 6, donc trois par série');
});

/* ═══════════════════ 2. DÉTERMINISME ET ACCESSIBILITÉ ═══════════════════ */

test('★ orage — l’éclair est une FONCTION DU TEMPS, pas un tirage au sort', () => {
  // CONTRACTS §4.4 : ni Math.random, ni Date.now. Deux compilations du même
  // scénario doivent donner exactement la même foudre — sans quoi le scrubbing
  // ne retomberait jamais sur la même image.
  const a = bati({ scenographie: true });
  const b = bati({ scenographie: true });
  const eclairDe = (tl) => JSON.stringify(animsDe(tl, '@eclair', 'opacity'));
  assert.equal(eclairDe(a), eclairDe(b));
  assert.ok(eclairDe(a).length > 2, 'encore faut-il qu’il y ait un éclair');
});

test('★ orage — DEUX éclats, jamais trois dans une seconde (WCAG 2.3.1)', () => {
  const tl = bati({ scenographie: true });
  const [eclair] = animsDe(tl, '@eclair', 'opacity');
  assert.ok(eclair, 'l’éclair doit exister');

  // Un « éclat » = une montée jusqu'à un maximum local, depuis un creux. On les
  // compte sur les keyframes réelles, pas sur la constante : c'est le compilé
  // qui est joué.
  const v = eclair.keyframes.map((k) => Number(k.value));
  let eclats = 0;
  for (let i = 1; i < v.length - 1; i++) if (v[i] > v[i - 1] && v[i] >= v[i + 1]) eclats++;
  assert.ok(eclats <= 2, `${eclats} éclats : au-delà de deux, on approche du seuil de trois`);
  assert.ok(eclats >= 1, 'un orage sans éclat n’est pas un orage');

  // Et l'éclair ne se répète pas : une seule animation, jamais bouclée.
  assert.equal(animsDe(tl, '@eclair', 'opacity').length, 1);
  assert.ok(eclair.duration < 2000, 'les deux éclats tiennent dans la même seconde ou presque');
});

test('★ orage — mouvement réduit : plus d’éclair du tout, et un feu FIXE', () => {
  const tl = bati({ scenographie: true, reduced: true });
  // Une enveloppe compilée à 1 ms n'est plus un éclair, c'est une image blanche
  // d'une frame — très exactement ce que `prefers-reduced-motion` épargne.
  assert.equal(noeuds(tl, 'eclair').length, 0, 'aucun nœud d’éclair, pas même éteint');
  assert.equal(animsDe(tl, '@eclair', 'opacity').length, 0);

  // La NUIT, elle, reste : ce n'est pas un mouvement, c'est un état — et c'est
  // elle qui rend le verdict lisible en thème clair.
  assert.equal(noeuds(tl, 'nuit').length, 1);
  assert.equal(animsDe(tl, '@nuit', 'opacity').length, 1);

  // Le feu ne vacille plus : une seule valeur d'arrivée, pas d'enveloppe.
  const [feu] = animsDe(tl, '@brasier:d0', 'opacity');
  assert.ok(feu, 'le brasier reste, il ne bat plus');
  assert.equal(feu.keyframes.length, 2, 'de zéro à sa valeur, et rien entre les deux');
});

test('orage — le brasier ne clignote pas : aucune cadence sous 120 ms', () => {
  const tl = bati({ scenographie: true });
  const [feu] = animsDe(tl, '@brasier:d0', 'opacity');
  const paliers = feu.keyframes.map((k) => k.offset * feu.duration);
  for (let i = 1; i < paliers.length; i++) {
    assert.ok(paliers[i] - paliers[i - 1] >= 120,
      `palier ${i} à ${Math.round(paliers[i] - paliers[i - 1])} ms : une flamme respire, elle ne bat pas`);
  }
});

/* ════════════════════════ 3. LA SOLIDARITÉ ══════════════════════════════ */

test('★ orage — le brasier SUIT son 6, et grandit exactement avec lui', () => {
  const tl = bati({ scenographie: true });
  const feu = tl.nodes.find((n) => n.id === '@brasier:d0');
  assert.equal(feu.data.suit, 'd0', 'sans « suit », la lueur se décrocherait au premier reflow');

  // CONTRACTS §3.2 règle 10 : même départ, même durée, même courbe, sur chaque
  // canal qui déplace. C'est `animSolidaire` qui le garantit ; on le mesure.
  const cadre = (a) => `${a.delay}×${a.duration}:${a.easing}`;
  const duChiffre = animsDe(tl, 'd0', 'scale').map(cadre);
  const duFeu = animsDe(tl, '@brasier:d0', 'scale').map(cadre);
  assert.deepEqual(duFeu, duChiffre, 'la lueur doit grossir sur la même courbe que son chiffre');
});

test('★ orage — le brasier ne coûte AUCUNE taille au verdict', () => {
  // `reveal` rétrécit le verdict de ce que son décor dépasse (`data.debord`),
  // pour qu'une pointe de corne ne sorte pas du cadre. Une lueur qui s'éteint
  // en dégradé n'a pas de pointe : un feu qui déborde du cadre est même ce
  // qu'on veut voir. Le déclarer ferait payer au 666 une taille imméritée.
  const feu = bati({ scenographie: true }).nodes.find((n) => n.id === '@brasier:d0');
  assert.equal(feu.data.debord, undefined);

  const zoom = (tl) => {
    const [a] = tl.anims.filter((x) => x.id === 'd0' && x.prop === 'scale');
    return Number(a.keyframes[a.keyframes.length - 1].value);
  };
  assert.equal(zoom(bati({ scenographie: true })), zoom(bati()),
    'le verdict doit grossir autant avec l’orage que sans lui');
});

test('orage — aucune animation concurrente : la scénographie ne dispute aucun canal', () => {
  // ★ En régime NORMAL, l'orage n'ajoute aucun conflit, point.
  assert.deepEqual(bati({ scenographie: true }).warnings, bati().warnings);
  assert.deepEqual(bati().warnings, [], 'et il n’y en avait aucun au départ');

  // ★ En mouvement RÉDUIT, toutes les durées valent 1 ms et les trois `reflow`
  //   successifs du verdict se recouvrent déjà par construction — les chiffres
  //   eux-mêmes s'en plaignent, bien avant qu'il y ait un orage. Ce qu'on
  //   vérifie alors n'est pas l'absence de conflit mais qu'aucun ne soit
  //   IMPUTABLE à la scénographie : un satellite ne peut se plaindre que là où
  //   son chiffre se plaint déjà (il ne fait que le suivre), et les deux
  //   aplats pleine scène, eux, ne doivent jamais se plaindre du tout.
  const nu = new Set(bati({ reduced: true }).warnings.map((w) => w.split(' : ')[0]));
  for (const w of bati({ scenographie: true, reduced: true }).warnings) {
    const cle = w.split(' : ')[0];
    assert.ok(!/@nuit|@eclair/.test(cle), `un aplat de scène ne dispute rien : ${w}`);
    const herite = cle.replace(/@brasier:/, '');
    assert.ok(nu.has(cle) || nu.has(herite),
      `conflit propre à l’orage, donc à corriger : ${w}`);
  }
});

test('★ orage — le feu GERME après la foudre, et la timeline ne l’éteint jamais', () => {
  // « L'idéal serait que le feu puisse germer juste après la foudre et perdurer
  // après (et si on revient en arrière, disparaître quand on remonte avant la
  // foudre). » (l'auteur)
  //
  // La timeline ne dit plus qu'UNE chose du feu : il a pris. Une seule montée,
  // monotone, `forwards` — donc l'état tient à la dernière image, donc le feu
  // est encore là quand la lecture s'arrête. Sa VIE, elle, est en CSS
  // (`styles/pages.css`), ce qui est la seule façon qu'elle survive à une
  // timeline finie. Et `seek()` en arrière ramène l'opacité à zéro : le feu
  // s'éteint proprement, sans qu'aucune boucle ne reste à tourner (l'attribut
  // `data-embrasement` de `player.js` les met en pause).
  const tl = bati({ scenographie: true });
  const feux = animsDe(tl, '@brasier:d0', 'opacity');
  assert.equal(feux.length, 1, 'une seule animation : le feu prend, il ne bat pas');
  const [feu] = feux;
  assert.equal(feu.keyframes.length, 2, 'de zéro à son intensité, et rien entre les deux');
  assert.equal(Number(feu.keyframes[0].value), 0);
  assert.ok(Number(feu.keyframes[1].value) > 0.5, 'un feu qui prend se voit');
  assert.ok(feu.delay > animsDe(tl, '@eclair', 'opacity')[0].delay,
    'le feu doit prendre APRÈS la foudre — c’est elle qui l’allume');
});

test('★ orage — la nuit tombe AVANT que la foudre ne frappe, et le feu APRÈS', () => {
  // L'ordre n'est pas décoratif : dans ce sens-là, c'est la foudre qui met le
  // feu, et l'orage raconte quelque chose. Dans l'autre, ce sont trois effets
  // posés côte à côte.
  const tl = bati({ scenographie: true });
  const debut = (id) => animsDe(tl, id, 'opacity')[0].delay;
  assert.ok(debut('@nuit') < debut('@eclair'), 'la nuit d’abord');
  assert.ok(debut('@eclair') < debut('@brasier:d0'), 'la foudre ensuite, le feu enfin');
});

/**
 * ★ Une couleur ne part jamais de zéro.
 *
 * Le brasier naissait sans `base.fill` : `lastValue` (compile.js) retombait
 * alors sur les valeurs par défaut, qui n'ont pas de couleur, donc sur `0`. Le
 * navigateur écrit « Invalid keyframe value for property fill: 0 » et **jette
 * l'animation** — six brasiers muets sur « Donald Trump », quinze sur
 * `hope-hope-hope.fr`, sans qu'aucun test ne rougisse. Le silence était le vrai
 * défaut ; `compile.js` échoue désormais bruyamment, et ce test garde le cas
 * réel.
 */
test('★ orage — aucune animation de couleur ne part d’une valeur qui n’en est pas une', () => {
  const tl = bati({ scenographie: true });
  const fautives = tl.anims
    .filter((a) => a.prop === 'fill' || a.prop === 'stroke')
    .filter((a) => a.keyframes.some((k) => typeof k.value !== 'string'))
    .map((a) => `${a.id}::${a.prop}`);
  assert.deepEqual(fautives, [], 'une couleur part d’autre chose qu’une couleur');
  // Et il y en a bien, sinon le test ne garderait rien.
  assert.ok(tl.anims.some((a) => a.prop === 'fill' && a.id.startsWith('@brasier:')),
    'plus aucun brasier ne change de couleur : le test ne garde plus rien');
});

