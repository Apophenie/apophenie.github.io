/**
 * ★ **LES GESTES QUE L'AUTEUR A DÉCRITS — et qui doivent SE VOIR.**
 *
 * Ce fichier n'existe pas pour vérifier que le calcul est juste : d'autres s'en
 * chargent, et le moteur visuel refuse de lui-même d'afficher un résultat faux.
 * Il existe parce que trois gestes ont été décrits en détail, déclarés faits, et
 * ne l'étaient pas — les mots disparaissaient sans qu'aucune accolade ne les
 * désigne, la division posait son quotient tout fait, et le signe de l'opération
 * n'était nulle part.
 *
 * Une animation absente ne casse aucun test de calcul. Il en fallait donc qui
 * regardent l'ÉCRAN, op par op et canal par canal.
 *
 * Les quatre exigences, dans l'ordre où l'auteur les a posées :
 *
 *  1. **on ne supprime pas un mot sans dire de quel droit** — une accolade par
 *     mot qui part, portant sa classe en toutes lettres, AVANT l'effacement ;
 *  2. **`A/B` avec le divisé entre les deux** — le signe est un jeton de la
 *     ligne, pas seulement un symbole sous une pointe ;
 *  3. **le compte se fabrique sous la pointe** — un cran par retrait, et le
 *     paquet qui vole vaut `B` en partant, `1` en arrivant ;
 *  4. **le diviseur se dissout ou demeure** — deux variantes, deux gestes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { suivreLaLigne } from '../../recherche/scenario.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/** Les steps qu'un opérateur du catalogue émet sur une saisie, et leur scène. */
function jouer(code, avant, tokens) {
  const o = PAR_CODE.get(code);
  assert.ok(o, `« ${code} » doit exister au catalogue`);
  const apres = appliquer(o, avant);
  assert.ok(apres, `« ${code} » doit s'appliquer sur ce témoin`);
  const ctx = { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' };
  const steps = o.steps(avant, apres, ctx);
  return { o, apres, steps, tl: compile({ version: 1, tokens, steps }) };
}

const texte = (v) => ({ type: 'STR', valeur: v, traces: [[0, [...v].length]] });
const lettres = (v) => [...v].map((c, i) => ({ id: `t${i}`, text: c, kind: 'letter' }));
const nums = (vs) => ({ type: 'NUMS', valeur: vs, traces: vs.map(() => [0, 1]) });
const jetonsNums = (vs) => vs.map((v, i) => ({ id: `t${i}`, text: String(v), kind: 'number' }));

/** Toutes les ops d'un scénario, à plat, dans l'ordre des steps. */
const opsDe = (steps) => steps.flatMap((s) => s.ops || []);
/** Le canal discret posé sur un nœud, s'il y en a un. */
const canal = (tl, id, channel = 'text') => tl.discrete.find((d) => d.id === id && d.channel === channel);

// ───────────────────── 1. on ne supprime pas un mot sans le dire

/**
 * > « Comme pour supprimer les voyelles, pour supprimer les articles il faudra
 * >   indiquer "articles non signifiants", les désigner par des accolades, puis
 * >   les supprimer. » (l'auteur)
 *
 * Le geste était un `drop` nu : les deux `le` de la phrase s'évaporaient, et
 * rien ne disait au nom de quoi. Le commentaire du fichier affirmait pourtant
 * que « la scène pose l'accolade sur ce qui part avant de l'effacer ».
 */
test('★ les articles partent SOUS UNE ACCOLADE qui les nomme, jamais tout nus', () => {
  const phrase = 'Le chat dort sur le tapis rouge';
  const { steps } = jouer('fart', texte(phrase), lettres(phrase));
  const ops = opsDe(steps);
  const accolades = ops.filter((o) => o.op === 'group');
  const effacements = ops.filter((o) => o.op === 'drop');

  assert.ok(accolades.length, 'les mots écartés sont désignés par une accolade');
  for (const a of accolades) {
    assert.equal(a.label, 'articles non signifiants',
      'chaque accolade porte la RÈGLE en toutes lettres — c’est elle qui justifie');
  }
  assert.equal(effacements.length, 1, 'un seul effacement, une fois la règle posée');
  for (const a of accolades) {
    assert.ok(a.at < effacements[0].at,
      'l’accolade se pose AVANT que le mot ne parte : on lit d’abord de quel droit');
  }
});

/**
 * ⚠️ **UNE ACCOLADE PAR MOT.** Les deux articles de la phrase sont aux deux
 *   bouts ; une accolade unique embrasserait « chat dort sur le tapis » et
 *   affirmerait que c'est un article.
 */
test('★ deux articles éloignés reçoivent DEUX accolades, pas une qui les enjambe', () => {
  const phrase = 'Le chat dort sur le tapis rouge';
  const { steps } = jouer('fart', texte(phrase), lettres(phrase));
  const accolades = opsDe(steps).filter((o) => o.op === 'group');
  assert.equal(accolades.length, 2, '« Le » et « le » sont deux mots, donc deux accolades');
  for (const a of accolades) {
    const rangs = a.targets.map((id) => Number(id.slice(1)));
    for (let k = 1; k < rangs.length; k++) {
      assert.equal(rangs[k], rangs[k - 1] + 1, 'une accolade n’embrasse que des lettres CONTIGUËS');
    }
  }
});

test('les quatre classes savent nommer ce qu’elles jettent', () => {
  const cas = [
    ['fart', 'Le chat dort sur le tapis rouge', 'articles non signifiants'],
    ['fprp', 'Le chat dort sur le tapis rouge', 'prépositions non signifiantes'],
    ['faux', 'Le chat est sur le tapis', 'verbes non signifiants'],
  ];
  for (const [code, phrase, mention] of cas) {
    const { steps } = jouer(code, texte(phrase), lettres(phrase));
    const accolades = opsDe(steps).filter((o) => o.op === 'group');
    assert.ok(accolades.length, `${code} : le rejet est désigné`);
    assert.equal(accolades[0].label, mention, `${code} : la règle est écrite`);
  }
});

test('la scène des filtres grammaticaux compile sans animation concurrente', () => {
  const phrase = 'Le chat dort sur le tapis rouge';
  const { tl } = jouer('fart', texte(phrase), lettres(phrase));
  assert.deepEqual(tl.warnings, [], 'deux accolades dans un même step ne se marchent pas dessus');
  const labels = tl.nodes.filter((n) => n.role === 'label').map((n) => n.text);
  assert.equal(labels.filter((t) => t === 'articles non signifiants').length, 2,
    'les deux mentions sont réellement peintes');
});

// ───────────────────── 2. A/B, avec le divisé entre les deux

/**
 * > « Pour la division : `A/B` (avec le divisé entre les deux, pas en vertical
 * >   comme cheval sur oiseau = π). » (l'auteur)
 */
/**
 * ⚠️ **ET LE SIGNE S'INSÈRE, IL NE REMPLACE PAS.**
 *
 * > « Tu effaces les chiffres pour les remettre avec l'opérateur entre eux. Ça
 * >   ne va pas. Espace-les pour insérer l'opérateur mais ne les efface pas. »
 * >   (l'auteur)
 *
 * `substitute` sait ne rien faire paraître quand il ÉCLATE : si les textes des
 * nés mis bout à bout refont celui de la source, il bascule en une milliseconde.
 * Poser `13`, `/` et `5` d'un coup cassait cette condition — `13/5` ne refait
 * pas `135` — et le geste retombait sur le fondu croisé.
 *
 * C'est cette PROPRIÉTÉ qu'on gèle ici, pas la liste des jetons : tant que les
 * textes posés se recollent en la source, aucun chiffre ne peut clignoter.
 */
test('★ la division ouvre sur A / B — et les chiffres ne s’effacent JAMAIS', () => {
  for (const code of ['mdiv', 'mdvq', 'mdvr']) {
    const { steps } = jouer(code, nums([135]), jetonsNums([135]));
    const ops = opsDe(steps);
    const ouverture = ops.find((o) => o.op === 'substitute');
    const poses = ouverture.pairs[0].to.map((t) => t.text);
    assert.deepEqual(poses, ['13', '5'], `${code} : le nombre se scinde`);
    assert.equal(poses.join(''), '135',
      `${code} : les nés recollés REFONT la source — c'est ce qui interdit le fondu`);
    const signe = ops.find((o) => o.op === 'insertOperators');
    assert.ok(signe, `${code} : le signe s'insère par une op dédiée`);
    assert.equal(signe.glyph, '/', 'et c\'est bien le divisé');
    assert.deepEqual(signe.between, ouverture.pairs[0].to.map((t) => t.id),
      'il se pose ENTRE les deux, en les écartant');
    assert.ok(signe.at > ouverture.at, 'après la scission, jamais pendant');
  }
});

test('★ le modulo ouvre sur A % B, même règle', () => {
  for (const code of ['mmod', 'mmoc']) {
    const { steps } = jouer(code, nums([135]), jetonsNums([135]));
    const ops = opsDe(steps);
    const ouverture = ops.find((o) => o.op === 'substitute');
    assert.deepEqual(ouverture.pairs[0].to.map((t) => t.text), ['13', '5']);
    const signe = ops.find((o) => o.op === 'insertOperators');
    assert.ok(signe && signe.glyph === '%', `${code} : le pour-cent est un jeton inséré`);
  }
});

/**
 * > « C'est trop rapide, même en ×0,25 je peine à suivre. Rends l'extraction des
 * >   chiffres six fois plus lente (mais sans ralentir la partie accolade). »
 * >   (l'auteur)
 */
test('★ un retrait dure ~1,8 s, et l’accolade reste rapide', () => {
  const { tl } = jouer('mdiv', nums([135]), jetonsNums([135]));
  const paquets = tl.anims.filter((a) => a.id.startsWith('@retrait:') && a.prop === 'translate');
  assert.equal(paquets.length, 2, 'deux retraits');
  for (const p of paquets) {
    assert.ok(p.duration > 1500, `un retrait dure ${Math.round(p.duration)} ms — l'œil doit suivre`);
  }
  const trait = tl.anims.find((a) => a.id.startsWith('@group:') && a.prop === 'strokeDashoffset');
  assert.ok(trait && trait.duration < 700,
    'l\'accolade ANNONCE, elle ne démontre pas : elle se tire vite');
});

/**
 * > « Quand tu insères le quotient à la fin, l'espace que tu lui donnes a l'air
 * >   un peu juste, ça donne des chiffres collés les uns aux autres — ou alors
 * >   c'est que tu ne t'adaptes pas au nombre de chiffres. » (l'auteur)
 *
 * C'était cela : le jeton naît en portant `0`, et la scène mesure sa place sur ce
 * qu'il porte À SA CRÉATION. Le canal discret change le texte, jamais la mise en
 * page.
 */
test('★ la place du compte est celle du nombre qu’il DEVIENDRA', () => {
  const large = (v) => {
    const { tl } = jouer('mdiv', nums([v]), jetonsNums([v]));
    return tl.nodes.find((n) => n.id === 'x0q0').w;
  };
  //  `135` → 13 / 5 = 2 (un chiffre) ; `101` → 10 / 1 = 10 (deux chiffres).
  assert.ok(large(101) > large(135) * 1.5,
    'un quotient à deux chiffres réserve deux fois la place d\'un seul');
});

// ───────────────────── 3. le compte se fabrique sous la pointe

/**
 * > « B est retranché à A : part de A, passe au niveau de B, avant de descendre
 * >   en dessous de l'accolade où 1 est ajouté. » (l'auteur)
 *
 * Le chantier avait déclaré ce geste impossible — « la position verticale des
 * jetons n'existe pas quand le plan s'écrit ». C'était faux : `tracerAccolade`
 * rend le point où tombe son résultat, et toute somme s'en sert déjà.
 */
test('★ le quotient MONTE D’UN CRAN par retrait, sous la pointe', () => {
  const { tl } = jouer('mdiv', nums([135]), jetonsNums([135]));
  const compteur = canal(tl, 'x0q0');
  assert.ok(compteur, 'le compte passe par le canal discret — donc exact au scrubbing');
  assert.equal(compteur.render(0), '0', 'au départ, rien n’a encore été retiré');
  assert.equal(compteur.render(1), '2', '13 contient deux fois 5');
  // Et il passe bien PAR 1 : un compteur qui saute de 0 à 2 ne compte pas.
  const vus = new Set();
  for (let i = 0; i <= 100; i++) vus.add(compteur.render(i / 100));
  assert.deepEqual([...vus].sort(), ['0', '1', '2'], 'un cran à la fois, aucun saut');
});

/**
 * ⚠️ **LE PAQUET VAUT `B` EN PARTANT ET `1` EN ARRIVANT.** Sans ce
 *   basculement, un `5` qui atterrit sur un compteur affichant `1` se lirait
 *   comme un `+5`.
 */
test('★ ce qui vole vaut 5 au départ et 1 à l’arrivée', () => {
  const { tl } = jouer('mdiv', nums([135]), jetonsNums([135]));
  const paquets = tl.discrete.filter((d) => d.id.startsWith('@retrait:') && d.channel === 'text');
  assert.equal(paquets.length, 2, 'deux retraits, deux paquets');
  for (const p of paquets) {
    assert.equal(p.render(0), '5', 'on retire cinq');
    assert.equal(p.render(1), '1', 'et ça compte pour un');
  }
});

test('le dividende décroît AU DÉPART de chaque paquet, pas à son arrivée', () => {
  const { tl } = jouer('mdiv', nums([135]), jetonsNums([135]));
  const a = canal(tl, 'x0a0');
  assert.ok(a, 'le dividende change de texte');
  assert.equal(a.render(0), '13');
  assert.equal(a.render(1), '3', 'il finit sur le reste');
  const vus = new Set();
  for (let i = 0; i <= 100; i++) vus.add(a.render(i / 100));
  assert.deepEqual([...vus].sort(), ['13', '3', '8'], '13 → 8 → 3, aucun palier sauté');
});

/**
 * > « Le résultat n'est pas le même : 13/5 → 23, 13/5 → 32. » (l'auteur)
 *
 * Les trois divisions rendent trois LIGNES différentes, et l'ordre où les
 * jetons entrent dans le flux EST le résultat.
 */
test('★ les trois divisions écrivent trois lignes différentes', () => {
  const attendu = { mdiv: ['2', '3'], mdvr: ['3', '2'], mdvq: ['2'] };
  for (const [code, textes] of Object.entries(attendu)) {
    const { steps } = jouer(code, nums([135]), jetonsNums([135]));
    const geste = opsDe(steps).find((o) => o.op === 'group' && o.division);
    assert.deepEqual(geste.to.map((t) => t.text), textes, `${code} : la ligne rendue`);
  }
});

/**
 * « L'accolade rétrécit pour ne laisser que le reste, puis le compteur remonte
 * AVANT le reste en ré-étirant l'accolade » — c'est ce resserrement qui sépare
 * `mdiv` de `mdvr` à l'écran, l'ordre des jetons ne se racontant pas tout seul.
 */
test('★ mdiv resserre son accolade sur le reste ; mdvr ne la touche pas', () => {
  const resserrements = (code) => {
    const { tl } = jouer(code, nums([135]), jetonsNums([135]));
    return tl.discrete.filter((d) => d.channel === 'd').length;
  };
  assert.equal(resserrements('mdiv'), 2,
    'elle se resserre sur le reste, puis se ré-étire sur la ligne neuve');
  assert.equal(resserrements('mdvr'), 1,
    'elle ne fait que s’étendre pour accueillir le compte posé après le reste');
});

// ───────────────────── 4. dissoudre, ou demeurer

/**
 * > « L'une dissout B dans l'accolade et fait disparaître l'accolade dans le
 * >   processus, l'autre garde B, qui n'a servi que de catalyseur sans être
 * >   consommé. » (l'auteur)
 *
 * Dissoudre n'est pas effacer sur place : le diviseur DESCEND vers l'accolade.
 */
test('★ mmod dissout son diviseur, mmoc le garde — et le % tombe dans les deux cas', () => {
  const chute = (code) => {
    const { steps } = jouer(code, nums([135]), jetonsNums([135]));
    const drop = opsDe(steps).find((o) => o.op === 'drop');
    assert.ok(drop, `${code} : quelque chose se dissout`);
    assert.equal(drop.mode, 'fall', 'ça TOMBE dans l’accolade, ça ne s’évapore pas sur place');
    return drop.targets;
  };
  assert.deepEqual(chute('mmod'), ['x0p0', 'x0b0'], 'le signe et le diviseur s’en vont');
  assert.deepEqual(chute('mmoc'), ['x0p0'], 'le catalyseur demeure, le signe non');
});

// ───────────────────── 5. la potence compte, elle aussi

/**
 * > « La valeur B est extraite autant de fois qu'elle se trouve dans le premier
 * >   chiffre de A et INCRÉMENTE D'1 PAR EXEMPLAIRE le premier chiffre sous
 * >   B. » (l'auteur)
 */
test('★ à la potence aussi, chaque chiffre du quotient se compte', () => {
  const { tl } = jouer('mdc1', nums([135]), jetonsNums([135]));
  // 13 ÷ 5 = 0 puis 2, puis 6 après la virgule.
  const attendu = { x0c0x0: '0', x0c0x1: '2', x0c0x2: '6' };
  for (const [id, fin] of Object.entries(attendu)) {
    const c = canal(tl, id);
    assert.ok(c, `le chiffre « ${id} » se construit`);
    assert.equal(c.render(0), '0', 'tout chiffre part de zéro');
    assert.equal(c.render(1), fin, `et arrive sur ${fin}`);
  }
  // Le zéro de tête n'est pas un chiffre sauté : rien ne vole, et il vaut zéro.
  assert.equal(canal(tl, 'x0c0x0').render(0.99), '0', '5 ne tient pas dans 1');
});

test('la potence compile sans animation concurrente, à une comme à trois décimales', () => {
  for (const [code, v] of [['mdc1', [135]], ['mdc3', [23]]]) {
    const { tl } = jouer(code, nums(v), jetonsNums(v));
    assert.deepEqual(tl.warnings, [], `${code} : rien ne se contredit`);
  }
});

// ───────────────────── 6. le rejeu suit ce que la scène montre

/**
 * ★ **LE CONTRÔLE CROISÉ NE VAUT QUE S'IL PARLE.**
 *
 * `suivreLaLigne` déclare la ligne PERDUE dès qu'il croise une op qu'il ne sait
 * pas rejouer — la bonne prudence. Encore faut-il que quelqu'un le remarque : la
 * potence n'était modélisée nulle part, et le rejeu rendait `null` sans que rien
 * ne s'en plaigne, faute d'une saisie témoin qui y mène.
 *
 * On demande donc ici, opérateur par opérateur, que la ligne rejouée soit
 * exactement celle que l'opérateur déclare produire.
 */
test('★ la ligne rejouée est celle que l’opérateur déclare — les huit gestes', () => {
  for (const code of ['mmod', 'mmoc', 'mdiv', 'mdvq', 'mdvr', 'mdc1', 'mdc2', 'mdc3']) {
    const o = PAR_CODE.get(code);
    const avant = nums([135]);
    const apres = appliquer(o, avant);
    assert.ok(apres, `${code} s'applique sur 135`);
    const tokens = jetonsNums([135]);
    const ctx = { ids: ['t0'], cle: 'x0', langue: 'fr' };
    const steps = o.steps(avant, apres, ctx);
    const lignes = suivreLaLigne(tokens, steps);
    const finale = lignes[lignes.length - 1];
    assert.ok(finale, `${code} : le rejeu ne doit pas se perdre`);
    assert.deepEqual(finale.ids, o.sortie(avant, apres, ctx),
      `${code} : la ligne rejouée et la sortie déclarée sont la même`);
  }
});

test('les gestes arithmétiques tiennent sur les cas limites du témoin', () => {
  // `39` : le quotient vaut zéro (3 ÷ 9). `105` : le reste vaut zéro.
  // `12` : les deux à la fois. Aucun ne doit produire de geste incohérent.
  for (const v of [[39], [105], [12], [7, 135]]) {
    for (const code of ['mmod', 'mmoc', 'mdiv', 'mdvq', 'mdvr', 'mdc1', 'mdc3']) {
      const o = PAR_CODE.get(code);
      const avant = nums(v);
      const apres = appliquer(o, avant);
      if (!apres) continue;
      const tokens = jetonsNums(v);
      const ctx = { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' };
      const steps = o.steps(avant, apres, ctx);
      const tl = compile({ version: 1, tokens, steps });
      assert.deepEqual(tl.warnings, [], `${code} sur ${JSON.stringify(v)}`);
      const lignes = suivreLaLigne(tokens, steps);
      assert.deepEqual(lignes[lignes.length - 1].ids, o.sortie(avant, apres, ctx),
        `${code} sur ${JSON.stringify(v)} : ligne rejouée`);
    }
  }
});
