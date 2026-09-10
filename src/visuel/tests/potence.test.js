/**
 * ★ **LA POTENCE — ce que l'auteur a décrit, geste par geste.**
 *
 * > « Les divisions à décimales, l'animation n'est toujours pas là. » (l'auteur)
 *
 * Elle y était, pourtant, au sens où des animations étaient émises. Ce qui n'y
 * était pas, c'est CE QU'IL AVAIT DÉCRIT : le décalage de `A` vers la gauche
 * pour insérer « ,0 » à sa droite (un simple changement de texte en tenait
 * lieu), le même « ,0 » ajouté sous `B`, un rythme d'extraction qu'on puisse
 * suivre, et une barre horizontale assez longue pour couvrir le quotient
 * qu'elle est censée souligner.
 *
 * Ce fichier regarde donc l'ÉCRAN — positions, instants, textes — et non le
 * calcul, dont le contrôle croisé de la primitive se charge déjà. Chaque test
 * cite l'exigence qu'il tient.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { CompileError } from '../errors.js';
import { derouleDeLaDivision, formate } from '../primitives/potence.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/**
 * Une potence nue : deux jetons sur la ligne, une op, rien d'autre.
 *
 * ★ On passe par la primitive plutôt que par le catalogue parce que les
 *   opérateurs `mdc*` REFUSENT les divisions qui tombent juste — `105 ÷ 5` n'a
 *   pas de décimale à montrer. Or c'est précisément le cas que l'auteur cite :
 *   « 105/5 devrait donner 021 ». Il faut donc pouvoir le poser à la main.
 */
function potence(a, b, decimales) {
  const tours = derouleDeLaDivision(a, b, decimales);
  const scenario = {
    version: 1,
    tokens: [
      { id: 'a', text: String(a), kind: 'number' },
      { id: 'b', text: String(b), kind: 'number' },
    ],
    steps: [{
      id: 's0',
      title: 'potence',
      ops: [{
        op: 'potence',
        dividende: 'a',
        diviseur: 'b',
        decimales,
        to: tours.map((t, k) => ({ id: `q${k}`, text: String(t.chiffre), kind: 'digit' })),
      }],
    }],
  };
  return { tours, scenario, tl: compile(scenario) };
}

/** Les nœuds fabriqués par la primitive dont l'identifiant commence par… */
const parPrefixe = (tl, prefixe) => tl.nodes.filter((n) => n.id.startsWith(prefixe));
/** Le premier d'entre eux — il n'y en a qu'un pour les barres et les virgules. */
const unique = (tl, prefixe) => {
  const l = parPrefixe(tl, prefixe);
  assert.equal(l.length, 1, `un seul « ${prefixe} » attendu, ${l.length} trouvés`);
  return l[0];
};
/** Les enregistrements discrets d'un nœud, dans l'ordre du temps. */
const canaux = (tl, id) => tl.discrete
  .filter((d) => d.id === id && d.channel === 'text')
  .sort((x, y) => x.at - y.at);
/** Ce qu'un affichage à virgule vaut comme nombre. */
const valeurDe = (s) => Number(s.replace(',', '.'));

// ───────────────────── 1. la colonne de gauche

/**
 * > « Tu effaces les chiffres pour les remettre avec l'opérateur entre eux. Ça
 * >   ne va pas. » (l'auteur, de la division à l'accolade)
 *
 * À la potence, le défaut prenait cette forme-ci : la colonne montrait le
 * dividende PARTIEL — `1`, puis `13`, puis `3` —, si bien que le nombre
 * GRANDISSAIT au deuxième tour. Un chiffre disparu qui revient est un chiffre
 * qu'on a effacé pour le remettre.
 */
test('★ la colonne de gauche ne remonte jamais — elle ne fait que perdre', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [1, 2, 1], [12345, 7, 3]]) {
    const { tl } = potence(a, b, d);
    const suite = [];
    for (const c of canaux(tl, 'a')) {
      // la partie entière portée par `a`, et les décimales portées par les
      // chiffres abaissés : ensemble, elles font le nombre affiché.
      const decimales = parPrefixe(tl, '@potdec')
        .map((n) => canaux(tl, n.id).filter((x) => x.at <= c.at).pop())
        .filter(Boolean);
      for (const u of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const entiere = c.render(u);
        const apres = decimales
          .map((x) => x.render(x.at === c.at ? u : 1))
          .join('');
        suite.push(valeurDe(apres ? `${entiere},${apres}` : entiere));
      }
    }
    for (let i = 1; i < suite.length; i++) {
      assert.ok(suite[i] <= suite[i - 1] + 1e-9,
        `${a} ÷ ${b} : la colonne remonte de ${suite[i - 1]} à ${suite[i]}`);
    }
    assert.equal(suite[0], a, `${a} ÷ ${b} : elle part du dividende`);
  }
});

/**
 * ★ **CE QU'ELLE MONTRE EST CE QU'ON LUI RETIRE.** Le paquet qui s'envole porte
 *   la valeur qu'il emporte — `5` aux unités, `50` aux dizaines, `0,5` sous la
 *   virgule. C'est la règle du moteur visuel (§0.3) : sans elle, un « 5 » qui
 *   fait passer la colonne de `105` à `55` lui ferait dire n'importe quoi.
 */
test('★ ce qui vole vaut exactement ce que la colonne perd', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [39, 9, 2]]) {
    const { tl } = potence(a, b, d);
    for (const n of parPrefixe(tl, '@potpaquet')) {
      const c = canaux(tl, n.id)[0];
      assert.ok(c, 'un paquet dit ce qu’il emporte');
      const emporte = valeurDe(c.render(0));
      assert.equal(c.render(1), '1', 'et il vaut 1 en arrivant : ça compte pour un');
      // la valeur emportée est un multiple décimal du diviseur
      const rapport = emporte / b;
      const log = Math.log10(rapport);
      assert.ok(Math.abs(log - Math.round(log)) < 1e-9,
        `${a} ÷ ${b} : un paquet emporte ${emporte}, qui n’est pas ${b} × une puissance de dix`);
    }
  }
});

// ───────────────────── 2. le « ,0 » qu'on insère

/**
 * > « On décale A sur la gauche pour insérer ",0" à sa droite, AVANT la barre
 * >   verticale qui le sépare de B, et on fait de même sous B (on ajoute
 * >   ",0"). » (l'auteur)
 *
 * Trois choses à tenir, et la première manquait entièrement : un DÉPLACEMENT de
 * `A`, une virgule et un zéro posés à sa droite SANS franchir la barre, et la
 * même virgule sous la barre.
 */
test('★ le « ,0 » s’insère : A GLISSE à gauche, la virgule et le zéro naissent à sa droite', () => {
  const { tl } = potence(13, 5, 1);
  const barre = unique(tl, '@potvert');
  const virguleA = unique(tl, '@potvirga');
  const zero = unique(tl, '@potdec');
  const virguleQ = unique(tl, '@potvirg:');

  // le glissement : une animation de position sur A, vers la GAUCHE, assez
  // longue pour se voir (un saut d'alignement dure 1 ms, celui-ci non) et qui
  // porte pendant que le « ,0 » s'inscrit — l'écart du début, lui, est un autre
  // mouvement, plus tôt, et il pousse A d'une demi-chasse seulement.
  const paraitre = (id) => tl.anims.find((x) => x.id === id && x.prop === 'opacity').delay;
  const glisse = tl.anims.find((x) => x.id === 'a' && x.prop === 'translate'
    && x.duration > 100
    && x.delay <= paraitre(virguleA.id) && x.delay + x.duration >= paraitre(virguleA.id));
  assert.ok(glisse, 'A recule d’une colonne pour faire place au « ,0 »');
  const recul = glisse.keyframes[0].value.x - glisse.keyframes[1].value.x;
  assert.ok(Math.abs(recul - 2 * tl.metrics.advance) < 0.01,
    `le recul vaut deux colonnes (la virgule et le zéro), pas ${recul}`);

  // à droite de A, à gauche de la barre — « avant la barre verticale »
  assert.ok(virguleA.base.translate.x < zero.base.translate.x, 'la virgule précède le zéro');
  assert.ok(zero.base.translate.x + tl.metrics.advance / 2 <= barre.base.translate.x,
    'le « ,0 » ne franchit pas la barre');
  // et le zéro naît à zéro : c'est de lui qu'on retirera
  assert.equal(zero.text, '0');

  // « et on fait de même sous B » : au même instant, à la milliseconde près
  assert.equal(paraitre(virguleQ.id), paraitre(virguleA.id),
    'la virgule du quotient et celle de la colonne paraissent ensemble');
});

/**
 * > « Puis on rajoute un 0 de plus, ce qui donne "0,A0". » (l'auteur)
 *
 * À la deuxième décimale, la colonne montre `0,20` : le chiffre déjà écrit
 * demeure et un zéro s'ajoute à sa droite — tout le reste recule d'une colonne.
 */
test('★ chaque décimale suivante ajoute UN zéro, et pousse le reste d’une colonne', () => {
  const { tl } = potence(2, 3, 3);
  const zeros = parPrefixe(tl, '@potdec');
  assert.equal(zeros.length, 3, 'trois décimales, trois zéros abaissés');
  const av = tl.metrics.advance;
  // les trois zéros naissent tous dans la MÊME colonne, la plus à droite…
  const naissances = zeros.map((n) => n.base.translate.x);
  assert.deepEqual(naissances, [naissances[0], naissances[0], naissances[0]]);
  // …et les précédents reculent d'exactement une colonne à chaque fois.
  for (const z of zeros.slice(0, -1)) {
    const reculs = tl.anims.filter((x) => x.id === z.id && x.prop === 'translate');
    for (const r of reculs) {
      const pas = r.keyframes[0].value.x - r.keyframes[1].value.x;
      assert.ok(Math.abs(pas - av) < 0.01, `un zéro recule d’une colonne, pas de ${pas}`);
    }
  }
  // et la colonne finit sur le reste vrai : 2 − 3 × 0,666 = 0,002
  const dernier = canaux(tl, 'a').pop();
  const dec = zeros.map((n) => canaux(tl, n.id).pop().render(1)).join('');
  assert.equal(`${dernier.render(1)},${dec}`, formate(2, 3), '2 − 0,666 × 3 = 0,002');
});

// ───────────────────── 3. les deux barres

/**
 * ⚠️ **LA BARRE ÉTAIT DESSINÉE SUR LE DIVIDENDE.** Elle se posait au milieu des
 *   CENTRES de A et de B ; sur `13 │ 5`, ce milieu tombe dans le « 3 ».
 */
test('★ la barre verticale sépare A et B — elle ne mord sur ni l’un ni l’autre', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [12345, 7, 3]]) {
    const { tl } = potence(a, b, d);
    const av = tl.metrics.advance;
    const barre = unique(tl, '@potvert');
    // le bord droit de la colonne se lit sur le dernier paquet parti : il quitte
    // la colonne des unités du rang courant, à une demi-chasse du bord.
    const paquets = parPrefixe(tl, '@potpaquet');
    const bordDroit = Math.max(...paquets.map((n) => n.base.translate.x)) + av / 2;
    assert.ok(bordDroit < barre.base.translate.x,
      `${a} ÷ ${b} : la barre passe sur la colonne de gauche`);
    // et le quotient — donc B, qui est juste au-dessus — reste à sa droite
    const premierChiffre = tl.nodes.find((n) => n.id === 'q0');
    assert.ok(premierChiffre.base.translate.x - av / 2 >= barre.base.translate.x - 0.01,
      `${a} ÷ ${b} : le quotient déborde à gauche de la barre`);
  }
});

/**
 * > « Quand tu insères le quotient à la fin, l'espace que tu lui donnes a l'air
 * >   un peu juste […] ou alors c'est que tu ne t'adaptes pas au nombre de
 * >   chiffres. » (l'auteur, de la division à l'accolade)
 *
 * Ici la largeur qui ne s'adaptait pas était celle de la BARRE : elle valait un
 * corps de police, quel que soit le nombre de chiffres écrits dessous. À trois
 * décimales, le quotient dépassait de la barre censée le souligner.
 */
test('★ la barre horizontale couvre tout le quotient, virgule comprise', () => {
  for (const [a, b, d] of [[13, 5, 1], [2, 3, 3], [12345, 7, 3], [105, 5, 1]]) {
    const { tl, tours } = potence(a, b, d);
    const av = tl.metrics.advance;
    const verticale = unique(tl, '@potvert').base.translate.x;
    const horizontale = unique(tl, '@pothoriz');
    const gauche = horizontale.base.translate.x - horizontale.w / 2;
    const droite = horizontale.base.translate.x + horizontale.w / 2;
    assert.ok(Math.abs(gauche - verticale) < 0.01,
      `${a} ÷ ${b} : la barre horizontale doit s’arrêter SUR la verticale`);
    const dernier = tl.nodes.find((n) => n.id === `q${tours.length - 1}`);
    assert.ok(dernier.base.translate.x + av / 2 <= droite,
      `${a} ÷ ${b} : le dernier chiffre du quotient déborde de la barre`);
  }
});

// ───────────────────── 4. le rythme

/**
 * > « C'est trop rapide, même en ×0.25 je peine à suivre. Rends l'extraction
 * >   des chiffres 6× plus lente (mais sans ralentir la partie accolade). »
 * >   (l'auteur)
 *
 * L'ancienne potence partageait une durée FIXE entre tous les tours : `2 ÷ 3` à
 * trois décimales y faisait passer dix-huit retraits en quatre secondes et
 * demie — 145 ms chacun. Le geste dure maintenant ce qu'il a à montrer.
 */
test('★ un exemplaire ne part pas avant que le précédent soit arrivé', () => {
  for (const [a, b, d] of [[13, 5, 1], [2, 3, 3], [105, 5, 1], [39, 9, 2]]) {
    const { tl } = potence(a, b, d);
    const vols = tl.anims
      .filter((x) => x.id.startsWith('@potpaquet') && x.prop === 'translate')
      .sort((x, y) => x.delay - y.delay);
    assert.ok(vols.length >= 2, `${a} ÷ ${b} : il y a bien plusieurs retraits`);
    for (let i = 1; i < vols.length; i++) {
      const ecart = vols[i].delay - vols[i - 1].delay;
      assert.ok(ecart >= 600,
        `${a} ÷ ${b} : deux départs séparés de ${Math.round(ecart)} ms — on ne suit pas`);
      assert.ok(vols[i - 1].delay + vols[i - 1].duration <= vols[i].delay + 1,
        `${a} ÷ ${b} : le précédent n’est pas arrivé que le suivant part`);
    }
  }
});

/**
 * ★ **UN TOUR VIDE PREND SON TEMPS, LUI AUSSI.** « 50 ne tient pas dans 13 » :
 *   rien ne vole, et c'est ce zéro-là qu'il faut voir s'écrire.
 */
test('le zéro dont personne ne part reste à l’écran le temps qu’on le lise', () => {
  const { tl } = potence(13, 5, 1);
  const zero = tl.discrete.find((x) => x.id === 'q0' && x.channel === 'text');
  assert.ok(zero, 'le premier chiffre du quotient a son canal');
  assert.equal(zero.render(0), '0');
  assert.equal(zero.render(1), '0', 'aucun exemplaire ne le fait monter');
  assert.ok(zero.dur >= 600, `il ne dure que ${Math.round(zero.dur)} ms`);
});

// ───────────────────── 5. ce qui reste sur la ligne

/**
 * ⚠️ **LA PLACE DU QUOTIENT SE LIT AVANT LA MISE À MORT.** `flowIndex` d'un
 *   jeton retiré du flux rend `-1` : le quotient s'ajoutait alors EN FIN DE
 *   LIGNE. Invisible tant que la division est le dernier nombre — et faux dès
 *   qu'il y en a un après elle.
 */
test('★ le quotient prend la place du dividende dans la ligne, pas la dernière', () => {
  const o = PAR_CODE.get('mdc1');
  const avant = { type: 'NUMS', valeur: [135, 7], traces: [[0, 1], [0, 1]] };
  const apres = appliquer(o, avant);
  assert.ok(apres, 'mdc1 s’applique sur 135 suivi de 7');
  const tokens = [
    { id: 't0', text: '135', kind: 'number' },
    { id: 't1', text: '7', kind: 'number' },
  ];
  const ctx = { ids: ['t0', 't1'], cle: 'x0', langue: 'fr' };
  const steps = o.steps(avant, apres, ctx);
  const tl = compile({ version: 1, tokens, steps });
  assert.deepEqual(tl.warnings, []);
  assert.deepEqual(tl.scene.flow, [...o.sortie(avant, apres, ctx)],
    'la ligne finale est celle que l’opérateur déclare, DANS L’ORDRE');
});

/**
 * > « Puis A et B disparaissent avec les deux barres et le nombre sous B prend
 * >   leur place EN PERDANT SA VIRGULE DANS LE DÉPLACEMENT. » (l'auteur)
 */
test('★ la virgule du quotient s’efface PENDANT la montée, pas avant', () => {
  const { tl } = potence(13, 5, 1);
  const virguleQ = unique(tl, '@potvirg:');
  const sortie = tl.anims
    .filter((x) => x.id === virguleQ.id && x.prop === 'opacity')
    .sort((x, y) => x.delay - y.delay)
    .pop();
  const montee = tl.anims.find((x) => x.id === 'q0' && x.prop === 'translate');
  assert.ok(montee, 'le quotient rejoint la ligne');
  assert.equal(sortie.delay, montee.delay, 'la virgule s’éteint au départ de la montée');
  assert.ok(sortie.delay + sortie.duration <= montee.delay + montee.duration + 1,
    'et elle a fini de s’éteindre quand la ligne est refermée');
  // ce qui reste sur la ligne n'est fait que de chiffres
  for (const id of tl.scene.flow) {
    assert.match(tl.nodes.find((n) => n.id === id).text, /^[0-9]$/);
  }
});

// ───────────────────── 6. le contrôle croisé, et le refus bruyant

test('★ le moteur visuel refuse de peindre un quotient qui n’est pas celui du calcul', () => {
  const scenario = {
    version: 1,
    tokens: [{ id: 'a', text: '13', kind: 'number' }, { id: 'b', text: '5', kind: 'number' }],
    steps: [{
      id: 's0',
      title: 'potence',
      ops: [{
        op: 'potence',
        dividende: 'a',
        diviseur: 'b',
        decimales: 1,
        to: [{ id: 'q0', text: '2', kind: 'digit' }, { id: 'q1', text: '6', kind: 'digit' }],
      }],
    }],
  };
  assert.throws(() => compile(scenario), (e) => e instanceof CompileError
    && /refuse d.afficher un calcul faux/.test(e.message));
});

test('la potence compile sans animation concurrente, du cas court au cas long', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [1, 2, 1], [12345, 7, 3], [39, 9, 2]]) {
    const { tl } = potence(a, b, d);
    assert.deepEqual(tl.warnings, [], `${a} ÷ ${b} : ${tl.warnings.join(' | ')}`);
  }
});
