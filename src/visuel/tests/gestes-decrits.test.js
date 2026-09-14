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
  // ★ Depuis que le tracé suit ses sources (« l'exception devient la règle »,
  //   l'autrice), `mdvr` se resserre AUSSI sur son reste quand `/B` se dissout,
  //   puis s'étend sur le compte posé après lui : c'est l'ORDRE du compte, devant
  //   ou derrière le reste, qui distingue les deux divisions.
  assert.equal(resserrements('mdvr'), 2,
    'elle se resserre sur le reste quand /B se dissout, puis s’étend sur le compte posé après lui');
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
  // `md01` : la potence qui ÉCRIT ses zéros de tête. `mdc1` ne les écrit plus
  // depuis que l'auteur a doublé la famille — voir le test suivant.
  const { tl } = jouer('md01', nums([135]), jetonsNums([135]));
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

/**
 * > « Une version avec 0 initial quand le premier chiffre est inférieur au
 * >   diviseur […] et une version sans 0 initial. » (l'auteur)
 *
 * Sans zéro initial, le rang où rien ne tient se JOUE — le chiffre entre en jeu,
 * rien ne part — mais n'écrit rien sous la barre : `13 ÷ 5` rend `2 6`.
 */
test('★ sans zéro initial, le rang où rien ne tient n’écrit rien', () => {
  const { tl, steps } = jouer('mdc1', nums([135]), jetonsNums([135]));
  const pot = opsDe(steps).find((o) => o.op === 'potence');
  assert.equal(pot.zeroInitial, false);
  assert.deepEqual(pot.to.map((t) => t.text), ['2', '6'], '13 ÷ 5 à une décimale, sans zéro devant');
  assert.equal(canal(tl, 'x0c0x0').render(1), '2');
  assert.equal(canal(tl, 'x0c0x1').render(1), '6');
  assert.equal(canal(tl, 'x0c0x2'), undefined, 'aucun troisième chiffre : le zéro n’est pas écrit');
});

test('la potence compile sans animation concurrente, à une comme à trois décimales', () => {
  for (const [code, v] of [['mdc1', [135]], ['mdc3', [23]], ['md01', [135]], ['md03', [23]]]) {
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
  for (const code of ['mmod', 'mmoc', 'mdiv', 'mdvq', 'mdvr', 'mdc1', 'mdc2', 'mdc3', 'md01', 'md02', 'md03']) {
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
    for (const code of ['mmod', 'mmoc', 'mdiv', 'mdvq', 'mdvr', 'mdc1', 'mdc3', 'md01', 'md03']) {
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

// ───────────────────── 7. le chemin que le site prend VRAIMENT

/**
 * ★ **UN GESTE QUI COMPILE PEUT NE JAMAIS ÊTRE JOUÉ.**
 *
 * > « mdc1 mdc2 mdc3 : il n'y a toujours pas de potence visible ni d'animation,
 * >   juste un remplacement sommaire. Pourquoi ? » (l'auteur)
 *
 * La primitive compilait, les steps de l'opérateur compilaient, la ligne se
 * rejouait — trois vérifications vertes. Aucune ne passait par
 * `construireScenario`, et c'est là que `validerFormeOp` déclarait la potence
 * « hors vocabulaire » : les steps étaient rejetés ENTIERS et remplacés par une
 * substitution générique. L'avertissement existait, dans `sc.avertissements`,
 * qu'aucune page n'affiche.
 *
 * Ces deux tests-ci passent par le seul chemin qui compte : celui du site.
 */
import { construireScenario, validerFormeOp, VOCABULAIRE } from '../../recherche/scenario.js';
import { depuisSaisie } from '../../moteur/etat.js';

/** Une approche d'un seul fragment, construite comme le site la reçoit. */
function approcheSur(saisie, codes) {
  const ops = codes.map((c) => PAR_CODE.get(c));
  const etats = [depuisSaisie(saisie)];
  for (const op of ops) {
    const suivant = appliquer(op, etats[etats.length - 1]);
    assert.ok(suivant, `${codes.join('+')} doit s'appliquer à « ${saisie} »`);
    etats.push(suivant);
  }
  const n = [...saisie].length;
  return { mode: 'DECRET', parts: [{
    fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
    chemin: { ops, etats },
  }] };
}

/**
 * ⚠️ **DEUX VOCABULAIRES, ET ILS DOIVENT DIRE LA MÊME CHOSE.** `VOCABULAIRE`
 *   liste les gestes admis ; le `switch` de `validerFormeOp` en est un second,
 *   dont le `default` rejette tout ce qu'il ne nomme pas. Les quatre derniers
 *   gestes ajoutés au premier manquaient au second.
 */
test('★ tout geste du vocabulaire a son cas dans validerFormeOp', () => {
  for (const geste of VOCABULAIRE) {
    const grief = validerFormeOp({ op: geste });
    assert.ok(!/hors vocabulaire/.test(grief || ''),
      `« ${geste} » est dans VOCABULAIRE mais validerFormeOp le déclare hors vocabulaire`);
  }
});

test('★ par le chemin du site, aucun geste arithmétique ne retombe sur le rendu générique', () => {
  const attendu = {
    'tca+masb+mdc1': 'potence', 'tca+masb+mdc2': 'potence', 'tca+masb+mdc3': 'potence',
    'tca+masb+md01': 'potence', 'tca+masb+md02': 'potence', 'tca+masb+md03': 'potence',
    'tca+masb+mdiv': 'group', 'tca+masb+mdvq': 'group', 'tca+masb+mdvr': 'group',
    'tca+masb+mmod': 'group', 'tca+masb+mmoc': 'group',
  };
  for (const [programme, geste] of Object.entries(attendu)) {
    const sc = construireScenario(approcheSur('Sept', programme.split('+')), { saisie: 'Sept' });
    assert.equal(sc.avertissements, undefined,
      `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const gestes = new Set(sc.steps.flatMap((s) => (s.ops || []).map((o) => o.op)));
    assert.ok(gestes.has(geste), `${programme} : le geste « ${geste} » doit être JOUÉ, pas remplacé`);
  }
});

// ───────────────────── 8. le carré : l'accolade d'abord, le calcul dessous

/**
 * > « L'animation pour les carrés est à corriger : sous le nombre, accolade
 * >   avec un symbole de mise au carré. Une fois l'accolade affichée, l'espace
 * >   s'élargit pour dupliquer le nombre et ajouter l'opérateur de
 * >   multiplication entre les deux. Le tout descend sous l'accolade pour
 * >   afficher le résultat en dessous de l'accolade, puis le résultat vient
 * >   prendre son espace sur la ligne principale, puis l'accolade disparaît. »
 * >   (l'autrice)
 *
 * Le geste d'avant compilait et se rejouait, et il ne montrait rien de cela :
 * pas d'accolade, et le nombre s'effaçait pour en reposer deux. Ces tests-ci
 * lisent la TIMELINE, temps par temps, sur le nombre du MILIEU d'une ligne de
 * trois — celui dont l'écartement pousse des deux côtés.
 */
import { lecteur } from './_lecteur.js';
import { creerMoteur } from '../../recherche/index.js';
import { lire as lireLien } from '../../recherche/url.js';
import { CATALOGUE } from '../../moteur/catalogue.js';

const LIGNE_CARRE = [7, 115, 1];

/**
 * > « Il y a tous les ingrédients mais pas dans le bon ordre. » (l'autrice)
 * >
 * > 1. « l'accolade sur le nombre unique avec "au carré" sous l'accolade, pas
 * >    besoin de ² qui n'est pas lisible sans un nombre avant pour se rendre
 * >    compte qu'il est en exposant. »
 * > 2. « l'espace dans l'accolade s'étire et le nombre est dupliqué, pas en le
 * >    faisant apparaître du néant, mais depuis le nombre existant. »
 * > 3. « Dès que le 2ᵈ nombre est en place, l'opérateur de multiplication
 * >    apparaît entre les deux. »
 * > 4. « les deux nombres et l'opérateur descendent pour fusionner sous
 * >    l'accolade et former le résultat »
 * > 5. « le résultat remonte sur la ligne principale »
 * > 6. « l'accolade disparaît et l'espace se réajuste si besoin sur la ligne
 * >    principale »
 *
 * Le geste précédent avait les six ingrédients, et trois dans le désordre : un
 * `²` sous la pointe, un double qui ne s'allumait qu'une fois dégagé — vu de
 * l'écran, il surgissait du néant —, et une accolade qui s'effaçait PENDANT la
 * remontée au lieu d'après.
 */
test('★ le carré se joue dans l’ordre de l’autrice : accolade, double sorti de l’original, ×, descente, fusion, remontée, PUIS retrait', () => {
  const { steps, tl } = jouer('mcar', nums(LIGNE_CARRE), jetonsNums(LIGNE_CARRE));
  assert.deepEqual(tl.warnings, [], 'rien ne se contredit');
  assert.equal(steps.length, 3, 'un geste par nombre, un nombre à la fois');
  const pas = tl.steps[1];
  const fen = (a) => a.delay >= pas.t0 && a.delay < pas.t0 + pas.duration;
  const anims = (id, prop) => tl.anims.filter((a) => a.id === id && a.prop === prop && fen(a));
  const noeud = (pred) => tl.nodes.find(pred);
  const lire = lecteur(tl);
  const fin = (a) => a.delay + a.duration;
  const arrivee = (a) => a.keyframes[a.keyframes.length - 1].value;
  const opacite = (id, t) => lire.valeur(id, 'opacity', t) ?? 1;

  // ① l'accolade, sous le nombre SEUL, avec « au carré » — et rien d'autre.
  const accolade = noeud((n) => n.role === 'bracket' && anims(n.id, 'strokeDashoffset').length);
  assert.ok(accolade, 'une accolade se tire');
  const trace = anims(accolade.id, 'strokeDashoffset')[0];
  assert.ok(accolade.w < noeud((n) => n.id === 't1').w * 1.5, 'elle n’embrasse d’abord que le nombre');
  const suiveurs = tl.nodes.filter((n) => n.data && n.data.suit === accolade.id);
  assert.deepEqual(suiveurs.map((n) => n.text), ['au carré'], '« au carré » sous l’accolade, sans ² : il n’est lisible qu’après un nombre');

  // ② le double sort de l'original, VISIBLE dès le départ, pendant que l'espace s'étire.
  const double = noeud((n) => n.id.startsWith('@double') && n.text === '115');
  assert.ok(double, 'le nombre est dupliqué');
  const glissade = anims(double.id, 'translate')[0];
  assert.ok(glissade.delay >= fin(trace), 'le double ne part qu’une fois l’accolade tirée');
  const n115 = lire.valeur('t1', 'translate', glissade.delay);
  assert.ok(Math.abs(glissade.keyframes[0].value.x - n115.x) < 0.5
    && Math.abs(glissade.keyframes[0].value.y - n115.y) < 0.5, 'il part de l’original');
  assert.ok(opacite(double.id, glissade.delay + 1) > 0.9, 'et il est VISIBLE dès sa sortie : il ne surgit pas du néant');
  assert.ok(arrivee(glissade).x > n115.x, 'il glisse vers la droite, jusqu’à sa place');
  const etirement = tl.discrete.find((d) => d.id === accolade.id && d.channel === 'd'
    && d.at >= pas.t0 && d.at < pas.t0 + pas.duration);
  assert.ok(etirement && etirement.at === glissade.delay, 'l’accolade s’étire avec l’espace, pendant la glissade');

  // ③ le × n'apparaît qu'une fois le double arrivé, entre les deux.
  const fois = noeud((n) => n.id.startsWith('@fois') && anims(n.id, 'opacity').length);
  assert.ok(fois && fois.text === '×', 'le signe existe');
  const parait = (id) => anims(id, 'opacity').find((a) => arrivee(a) === 1);
  assert.ok(opacite(fois.id, glissade.delay + glissade.duration / 2) < 0.1, 'invisible pendant la glissade');
  assert.ok(parait(fois.id).delay >= fin(glissade), 'il apparaît dès que le second nombre est en place, pas avant');
  const xFois = lire.valeur(fois.id, 'translate', fin(parait(fois.id))).x;
  assert.ok(xFois > lire.valeur('t1', 'translate', fin(glissade)).x && xFois < arrivee(glissade).x, 'entre les deux');

  // ④ les trois descendent d'un bloc et fusionnent sous l'accolade.
  assert.equal(canal(tl, 't1'), undefined, 'le texte de 115 ne change pas');
  const yLigne = n115.y;
  const descentes = ['t1', fois.id, double.id].map((id) => anims(id, 'translate').find((a) => arrivee(a).y > yLigne));
  assert.ok(descentes.every(Boolean), 'les trois descendent');
  const D = descentes[0].delay;
  assert.ok(descentes.every((a) => a.delay === D), 'd’un bloc, au même instant');
  assert.ok(D >= fin(parait(fois.id)), '… une fois « 115 × 115 » écrit');
  const Y = arrivee(descentes[0]).y;
  const produit = noeud((n) => n.id === 'x0_1');
  assert.equal(produit.text, '13225', 'le produit que l’opérateur calcule');
  assert.ok(produit.w >= 5 * tl.metrics.advance - 0.01, 'sa place est celle de ses CINQ chiffres');
  const P = parait('x0_1').delay;
  assert.ok(P > D, 'il paraît après la descente');
  assert.ok(Math.abs(lire.valeur('x0_1', 'translate', P).y - Y) < 0.5, 'là où l’expression est descendue');
  assert.ok(Y > lire.valeur(accolade.id, 'translate', P).y, 'c’est-à-dire SOUS l’accolade');

  // ⑤ le résultat remonte sur la ligne…
  const remontee = anims('x0_1', 'translate').find((a) => Math.abs(arrivee(a).y - yLigne) < 0.5);
  assert.ok(remontee && remontee.delay > P, 'le résultat remonte sur la ligne principale');

  // ⑥ … PUIS l'accolade disparaît, et l'espace se réajuste.
  // ★ Le TRACÉ n'embrasse que ce qui est encore là : l'expression quitte la ligne
  //   en descendant, et il s'en va avec elle. « au carré » attend la fin.
  const retraitTrace = anims(accolade.id, 'opacity').find((a) => arrivee(a) === 0);
  assert.ok(retraitTrace && Math.abs(retraitTrace.delay - D) < 1, 'le tracé s’en va quand l’expression quitte la ligne');
  for (const n of suiveurs) {
    const retrait = anims(n.id, 'opacity').find((a) => arrivee(a) === 0);
    assert.ok(retrait, `« ${n.id} » se retire`);
    assert.ok(retrait.delay >= fin(remontee), `« ${n.text} » ne s’efface qu’APRÈS la remontée`);
  }
  const resserrement = anims('t2', 'translate').find((a) => a.delay >= fin(remontee));
  assert.ok(resserrement && arrivee(resserrement).x < resserrement.keyframes[0].value.x,
    'l’espace se réajuste ensuite : le voisin revient vers le résultat');
});

/**
 * > « Jamais deux jetons superposés sur la ligne de base. »
 *
 * Échantillonné sur toute la scène, à la hauteur de la ligne : ni le double
 * qui sort de l'original, ni le signe qui paraît entre eux, ni le produit qui
 * remonte ne recouvrent un voisin. Sous l'accolade, l'expression se RÉSOUT en
 * son produit — ce n'est pas la ligne.
 */
test('★ le carré ne superpose jamais deux jetons sur la ligne, à aucun instant', () => {
  for (const valeurs of [LIGNE_CARRE, [1, 0, 999], [23, 5]]) {
    const { tl } = jouer('mcar', nums(valeurs), jetonsNums(valeurs));
    assert.deepEqual(tl.warnings, [], `${valeurs} : ${tl.warnings.join(' | ')}`);
    const lire = lecteur(tl);
    const yLigne = lire.valeur('t0', 'translate', 0).y;
    const fs = tl.metrics.fontSize;
    const N = 1500;
    for (let k = 0; k <= N; k++) {
      const t = (tl.total * k) / N;
      const vus = lire.visibles(t).filter((j) => Math.abs(j.y - yLigne) < fs * 0.25);
      for (let i = 0; i < vus.length; i++) {
        for (let j = i + 1; j < vus.length; j++) {
          // ★ Le double SORT de son original, visible : partir exactement sur lui
          //   est le dédoublement même (« depuis le nombre existant », l'autrice),
          //   comme les paquets de la potence naissent sur leur chiffre. Ce seul
          //   recouvrement-là est voulu ; contre tout autre jeton, il est exclu.
          //   Les témoins n'ont pas deux nombres au même texte : le texte suffit
          //   à désigner l'original.
          const double = [vus[i], vus[j]].find((v) => v.id.startsWith('@double'));
          const autre = double === vus[i] ? vus[j] : vus[i];
          if (double && !autre.id.startsWith('@') && autre.texte === double.texte) continue;
          const recouvre = Math.min(vus[i].d, vus[j].d) - Math.max(vus[i].g, vus[j].g);
          assert.ok(recouvre <= 0.5, `${valeurs}, t = ${Math.round(t)} : « ${vus[i].texte} » (${vus[i].id}) `
            + `et « ${vus[j].texte} » (${vus[j].id}) se chevauchent de ${recouvre.toFixed(1)}`);
        }
      }
    }
  }
});

/**
 * > « 1² est à faire aussi par cohérence, même si le résultat est 1 comme le
 * >   point de départ. » (l'autrice)
 */
test('★ 1² et 0² se jouent aussi — seule la ligne où rien ne change reste refusée', () => {
  const valeurs = [1, 0, 3];
  const { o, apres, steps, tl } = jouer('mcar', nums(valeurs), jetonsNums(valeurs));
  assert.deepEqual(steps.map((s) => s.caption), ['1² = 1 × 1 = 1', '0² = 0 × 0 = 0', '3² = 3 × 3 = 9']);
  assert.deepEqual(tl.warnings, []);
  const tokens = jetonsNums(valeurs);
  const ctx = { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' };
  const lignes = suivreLaLigne(tokens, steps);
  assert.deepEqual(lignes[lignes.length - 1].ids, o.sortie(nums(valeurs), apres, ctx),
    'la ligne rejouée est celle que l’opérateur déclare');
  assert.equal(appliquer(o, nums([1, 0, 1])), null, 'une ligne que le carré ne change pas est refusée, comme avant');
});

test('le carré refuse d’afficher un produit faux', () => {
  const faux = {
    version: 1, tokens: jetonsNums([12]),
    steps: [{ id: 's0', title: 'carré', ops: [{
      op: 'group', at: 0, dur: 5400, targets: ['t0'], carre: true, symbol: '²',
      to: { id: 'r0', text: '145', kind: 'number' },
    }] }],
  };
  assert.throws(() => compile(faux), /144/, '12 × 12 vaut 144, pas 145');
});

/**
 * ★ **PAR LE CHEMIN DU SITE, et sur une vraie voie.** « Sarah Kerrigan » vers
 *   « Protoss » passe par le carré (`fl+ma1+mcar+mab`) : le lien se rejoue sans
 *   recherche, et la scène doit JOUER treize carrés — les trois `1` compris —
 *   sans qu'aucun ne retombe sur le rendu générique.
 */
const VOIE_PROTOSS = '#so!m1a2!fl+ma1+mcar+mab#XeuapD1GiUPu7gDywGH#43pRnWYXE2';

test('★ par le chemin du site, le carré est joué — et sur la voie « Sarah Kerrigan » → « Protoss »', () => {
  const sc = construireScenario(approcheSur('Sept', ['tca', 'masb', 'mcar']), { saisie: 'Sept' });
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  assert.equal(sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'group' && o.carre)).length, 4,
    'quatre lettres, quatre carrés');

  const moteur = creerMoteur(CATALOGUE, { filetTemporel: false });
  const lecture = lireLien(VOIE_PROTOSS);
  const rejeu = moteur.rejouer(lecture);
  assert.ok(rejeu.ok, rejeu.raison);
  const vraie = moteur.scenarioDe(rejeu.approche, {
    saisie: lecture.saisie, langue: 'fr', registre: lecture.registre, cible: lecture.cible,
  });
  assert.equal(vraie.avertissements, undefined, (vraie.avertissements || []).join(' | '));
  const carres = vraie.steps.filter((s) => (s.ops || []).some((o) => o.op === 'group' && o.carre));
  assert.equal(carres.length, 13, 'SARAHKERRIGAN : treize nombres, treize carrés');
  assert.deepEqual(carres.slice(0, 2).map((s) => s.caption), ['19² = 19 × 19 = 361', '1² = 1 × 1 = 1']);
  assert.deepEqual(compile(vraie).warnings, [], 'la scène entière compile sans animation concurrente');
});

// ───────────────────── 9. la puissance : la valeur passe par l'exposant

/**
 * > « Pour puissance, mettons 53 → accolade "puissance" ou "pow" ou "**" dans
 * >   l'accolade → l'exposant monte et rétrécit pour former un exposant → une
 * >   copie (façon meg) de la valeur passe par l'exposant et le décrémente puis
 * >   descend au compteur sous l'accolade → la copie suivante fait de même mais
 * >   hérite de l'opérateur "×" quand elle descend après avoir décrémenté
 * >   l'exposant → quand l'exposant arrive à 1, la valeur n'est plus copiée mais
 * >   déplacée vers l'exposant qui est décrémenté à 0 puis disparaît pendant
 * >   que la valeur descend et forme le résultat final sous l'accolade → le
 * >   résultat remonte pendant que l'exposant disparaît… » (l'autrice)
 *
 * Témoin : `5 34 2`. Les exposants sont 3 (de 34), 2 (de 2) et 5 (le dernier
 * regarde le premier) : 125, 1156, 32.
 */
const LIGNE_PUISSANCE = [5, 34, 2];

test('★ la puissance se joue dans l’ordre décrit : exposant formé, copies par l’exposant, base déplacée, produit remonté', () => {
  const { steps, tl } = jouer('mpui', nums(LIGNE_PUISSANCE), jetonsNums(LIGNE_PUISSANCE));
  assert.deepEqual(tl.warnings, [], 'rien ne se contredit');
  assert.deepEqual(steps.map((s) => s.caption),
    ['5³ 34² 2⁵', '5³ = 5 × 5 × 5 = 125', '34² = 34 × 34 = 1156', '2⁵ = 2 × 2 × 2 × 2 × 2 = 32'],
    'les exposants d’abord, puis un produit par nombre');
  const lire = lecteur(tl);
  const fs = tl.metrics.fontSize;
  const av = tl.metrics.advance;
  const fin = (a) => a.delay + a.duration;
  const arrivee = (a) => a.keyframes[a.keyframes.length - 1].value;
  const [ouverture, pas5] = tl.steps;
  const dans = (pas) => (a) => a.delay >= pas.t0 && a.delay < pas.t0 + pas.duration;
  const anims = (id, prop, pas) => tl.anims.filter((a) => a.id === id && a.prop === prop && dans(pas)(a));
  const noeud = (id) => tl.nodes.find((n) => n.id === id);

  // ① les exposants : une COPIE du premier chiffre du suivant, qui en part.
  assert.deepEqual(['x0_e0', 'x0_e1', 'x0_e2'].map((id) => noeud(id).text), ['3', '2', '5']);
  const vol3 = anims('x0_e0', 'translate', ouverture)[0];
  const p34 = lire.valeur('t1', 'translate', vol3.delay);
  assert.ok(Math.abs(vol3.keyframes[0].value.x - (p34.x - av / 2)) < 0.5, 'le 3 part du premier chiffre de 34');
  assert.ok(vol3.keyframes[1].value.y < p34.y - fs * 0.8, 'il MONTE au-dessus de lui avant d’aller se poser');
  assert.equal(canal(tl, 't1'), undefined, '34 reste en place : il sera élevé à son tour');
  const pose = arrivee(vol3);
  const p5 = lire.valeur('t0', 'translate', fin(vol3));
  assert.ok(pose.x > p5.x && pose.y < p5.y, 'posé en haut à droite de la base');
  assert.equal(lire.valeur('x0_e0', 'scale', fin(vol3)), 0.55, 'et rétréci');
  assert.ok(fin(vol3) <= pas5.t0, 'tous les exposants sont formés avant le premier calcul');

  // ② l'accolade « puissance », avant tout voyage.
  const accolade = tl.nodes.find((n) => n.role === 'bracket' && anims(n.id, 'strokeDashoffset', pas5).length);
  assert.ok(accolade, 'une accolade se tire sous la base');
  assert.deepEqual(tl.nodes.filter((n) => n.data && n.data.suit === accolade.id).map((n) => n.text), ['puissance']);
  const trace = anims(accolade.id, 'strokeDashoffset', pas5)[0];

  // ③ deux copies de 5, puis la base elle-même : chacune passe par l'exposant.
  const copies = tl.nodes.filter((n) => n.id.startsWith('@copie') && n.text === '5');
  assert.equal(copies.length, 2, 'e − 1 copies : la dernière fois, la valeur n’est plus copiée');
  const vols = [...copies.map((c) => anims(c.id, 'translate', pas5)[0]),
    anims('t0', 'translate', pas5).find((a) => a.keyframes.length === 4)];
  assert.ok(vols.every(Boolean), 'trois voyages');
  assert.ok(vols[0].delay >= fin(trace), 'les voyages commencent une fois l’accolade tirée');
  for (let k = 1; k < 3; k++) assert.ok(vols[k].delay >= fin(vols[k - 1]) - 1, 'un voyage à la fois');
  for (const v of vols) {
    // L'exposant a suivi sa base quand les suivants ont élargi la ligne : on
    // le lit là où il est À L'INSTANT du voyage, pas là où il s'est posé.
    const ici = lire.valeur('x0_e0', 'translate', v.delay);
    const passe = v.keyframes[1].value;
    assert.ok(Math.abs(passe.x - ici.x) < 0.5 && Math.abs(passe.y - ici.y) < 0.5, 'chacun PASSE PAR l’exposant');
    assert.ok(arrivee(v).y > p5.y + fs, 'puis descend sous l’accolade');
  }
  const signes = tl.nodes.filter((n) => n.id.startsWith('@fois') && anims(n.id, 'translate', pas5).length);
  assert.equal(signes.length, 2, 'la première copie descend seule, les suivantes héritent du ×');
  assert.ok(anims(signes[0].id, 'translate', pas5)[0].delay > vols[1].delay, 'le × naît au passage de la deuxième');

  // L'exposant décompte ; le compteur fusionne une paire à la fois.
  const echantillons = (d) => {
    const vus = [];
    for (let k = 0; k <= 500; k++) { const r = d.render(k / 500); if (vus[vus.length - 1] !== r) vus.push(r); }
    return vus;
  };
  assert.deepEqual(echantillons(canal(tl, 'x0_e0')), ['3', '2', '1', '0'], '3 → 2 → 1 → 0');
  assert.deepEqual(echantillons(canal(tl, 'x0_0')), ['', '5', '25', '125'], '5, puis 5 × 5, puis 25 × 5');

  // ④ le produit remonte PENDANT que l'exposant disparaît ; l'accolade part avec.
  const remontee = anims('x0_0', 'translate', pas5).find((a) => Math.abs(arrivee(a).y - p5.y) < 0.5);
  assert.ok(remontee && remontee.delay >= fin(vols[2]) - 1, 'le produit remonte après la dernière arrivée');
  const efface = anims('x0_e0', 'opacity', pas5).find((a) => arrivee(a) === 0);
  assert.ok(efface.delay < remontee.delay && fin(efface) > remontee.delay,
    'l’exposant, passé à 0, s’efface pendant la descente et jusque dans la remontée');
  const retrait = anims(accolade.id, 'opacity', pas5).find((a) => arrivee(a) === 0);
  // ★ Le tracé suit ses sources : il s'en va quand la base ELLE-MÊME part, au
  //   dernier passage. La légende attend la fin en deux temps : le produit se
  //   pose, PUIS « puissance » s'efface (`helpers.js › finirSousAccolade`).
  assert.ok(Math.abs(retrait.delay - vols[2].delay) < 1, 'le tracé s’en va quand la base elle-même part');
  const legende = tl.nodes.find((n) => n.data && n.data.suit === accolade.id);
  const retraitLegende = anims(legende.id, 'opacity', pas5).find((a) => arrivee(a) === 0);
  assert.ok(retraitLegende.delay >= fin(remontee) - 1, '« puissance » ne s’efface qu’APRÈS la remontée du produit');
  assert.ok(noeud('x0_0').w >= 3 * av - 0.01, 'le produit a la place de ses trois chiffres');
});

/**
 * Sur la LIGNE, personne ne recouvre personne ; l'exposant posé ne recouvre ni
 * sa base ni son voisin. Les copies et les × qui voyagent sont exclus, comme
 * les paquets de la potence : elles se DÉTACHENT de leur nombre, c'est le
 * geste de `meg`.
 */
test('★ la puissance ne superpose rien sur la ligne, et l’exposant posé a sa place', () => {
  for (const valeurs of [LIGNE_PUISSANCE, [1, 10, 23], [115, 2]]) {
    const { tl } = jouer('mpui', nums(valeurs), jetonsNums(valeurs));
    assert.deepEqual(tl.warnings, [], `${valeurs} : ${tl.warnings.join(' | ')}`);
    const lire = lecteur(tl);
    const yLigne = lire.valeur('t0', 'translate', 0).y;
    const hExposant = yLigne - tl.metrics.fontSize * 0.5;
    const N = 2000;
    for (let k = 0; k <= N; k++) {
      const t = (tl.total * k) / N;
      const vus = lire.visibles(t);
      const ligne = vus.filter((j) => !/^@(copie|fois)|_e\d+$/.test(j.id) && Math.abs(j.y - yLigne) < 12);
      const poses = vus.filter((j) => /_e\d+$/.test(j.id) && Math.abs(j.y - hExposant) < 1);
      const surLaLigne = vus.filter((j) => !j.id.startsWith('@') && !/_e\d+$/.test(j.id) && Math.abs(j.y - yLigne) < 1);
      const paires = [
        ...ligne.flatMap((p, i) => ligne.slice(i + 1).map((q) => [p, q])),
        ...poses.flatMap((p) => surLaLigne.map((q) => [p, q])),
      ];
      for (const [p, q] of paires) {
        if (Math.abs(p.y - q.y) >= ((p.h + q.h) / 2) * 0.8) continue;
        const recouvre = Math.min(p.d, q.d) - Math.max(p.g, q.g);
        assert.ok(recouvre <= 0.5, `${valeurs}, t = ${Math.round(t)} : « ${p.texte} » (${p.id}) `
          + `et « ${q.texte} » (${q.id}) se chevauchent de ${recouvre.toFixed(1)}`);
      }
    }
  }
});

test('★ un exposant 1 se joue aussi, et la ligne rejouée est celle que la puissance déclare', () => {
  const valeurs = [1, 10, 23];
  const { o, apres, steps, tl } = jouer('mpui', nums(valeurs), jetonsNums(valeurs));
  assert.deepEqual(steps.map((s) => s.caption), ['1¹ 10² 23¹', '1¹ = 1 = 1', '10² = 10 × 10 = 100', '23¹ = 23 = 23']);
  assert.equal(tl.nodes.filter((n) => n.id.startsWith('@copie')).length, 1, 'seul 10² copie sa valeur');
  const tokens = jetonsNums(valeurs);
  const lignes = suivreLaLigne(tokens, steps);
  assert.deepEqual(lignes[lignes.length - 1].ids,
    o.sortie(nums(valeurs), apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' }));
});

test('la puissance refuse d’afficher un produit faux', () => {
  const faux = {
    version: 1, tokens: jetonsNums([5, 3]),
    steps: [
      { id: 's0', title: 'exposants', ops: [{
        op: 'group', at: 0, dur: 3300, targets: ['t0', 't1'],
        exposants: [{ base: 't0', source: 't1', id: 'e0' }, { base: 't1', source: 't0', id: 'e1' }],
      }] },
      { id: 's1', title: 'puissance', ops: [{
        op: 'group', at: 0, dur: 7700, targets: ['t0'], puissance: true, exposant: 'e0',
        to: { id: 'r0', text: '126', kind: 'number' },
      }] },
    ],
  };
  assert.throws(() => compile(faux), /125/, '5 × 5 × 5 vaut 125, pas 126');
});

/**
 * ★ **PAR LE CHEMIN DU SITE, sur la voie qui a fait écrire la puissance** :
 *   « Donald Trump » → « Numérologie », `fl+m14+mpui+mab`.
 */
const VOIE_NUMEROLOGIE = '#so!m1a2!fl+m14+mpui+mab#2HuP1G8mNg3sJWhqR#2UsgadwLteDHprQ5i';

test('★ par le chemin du site, la puissance est jouée — « Donald Trump » → « Numérologie »', () => {
  const moteur = creerMoteur(CATALOGUE, { filetTemporel: false });
  const lecture = lireLien(VOIE_NUMEROLOGIE);
  const rejeu = moteur.rejouer(lecture);
  assert.ok(rejeu.ok, rejeu.raison);
  const sc = moteur.scenarioDe(rejeu.approche, {
    saisie: lecture.saisie, langue: 'fr', registre: lecture.registre, cible: lecture.cible,
  });
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  const gestes = (drapeau) => sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'group' && o[drapeau]));
  assert.equal(gestes('exposants').length, 1, 'les onze exposants se forment en une étape');
  assert.equal(gestes('puissance').length, 11, 'DONALDTRUMP : onze nombres, onze puissances');
  assert.equal(gestes('puissance')[0].caption, '6⁶ = 6 × 6 × 6 × 6 × 6 × 6 = 46656');
  assert.deepEqual(compile(sc).warnings, [], 'la scène entière compile sans animation concurrente');
});

// ───────────────────── 10. la factorielle : la colonne se déplie et se replie

/**
 * > « Pour factorielle, le calcul étant moins connu, on va procéder
 * >   différemment : 1. mets les "!" associés à chaque chiffre où factorielle
 * >   va être appliquée, et "Factorielle !" est affiché comme un titre centré
 * >   sous la ligne principale. 2. le premier chiffre en factorielle déplie
 * >   verticalement chaque n−1 … 1, centré sur la ligne principale (donc pour
 * >   5! L1: 1, L2: ×, L3: 2, L4: ×, L5: 3, L6: ×, L7: 4, L8: ×, L9: 5, avec L5
 * >   qui reste au niveau de la ligne principale) 3. les multiplications
 * >   s'effectuent les unes après les autres : le 1er chiffre descend sur le 2ᵈ
 * >   en embarquant l'opérateur au passage et la fusion fait apparaître le
 * >   résultat, puis ce résultat descend sur le chiffre suivant en embarquant
 * >   l'opérateur… le tout en remontant progressivement les lignes pour
 * >   maintenir le centrage, afin que la dernière fusion aboutisse sur la ligne
 * >   principale. 4. on reprend 2. puis 3. pour chaque chiffre à passer en
 * >   factorielle, et on déplace le titre "Factorielle !" vers la droite ou la
 * >   gauche pour qu'il ne recouvre pas les calculs en cours. 5. une fois toute
 * >   la ligne passée en factorielle, le titre peut disparaître. » (l'autrice)
 */
const LIGNE_FACTORIELLE = [3, 1, 5];

/** Les colonnes d'une scène : où chacune se tient, et quand. */
function colonnesDe(steps, tl) {
  const lire = lecteur(tl);
  const out = [];
  steps.forEach((s, i) => {
    const op = (s.ops || []).find((o) => o.op === 'group' && o.factorielle);
    if (!op) return;
    const pas = tl.steps[i];
    // Le résultat NAÎT sur l'axe de la colonne. Relu à la fin de l'étape, il
    // serait décalé : le « ! » rend sa place, et la ligne centrée se recentre.
    const naissance = tl.anims.find((a) => a.id === op.to.id && a.prop === 'opacity');
    out.push({
      op, pas, t0: pas.t0, t1: pas.t0 + pas.duration,
      x: lire.valeur(op.to.id, 'translate', naissance.delay).x,
      // La case réservée au nombre : la colonne entière tient dedans.
      w: tl.nodes.find((n) => n.id === op.targets[0]).w,
    });
  });
  return out;
}

test('★ la factorielle se joue dans l’ordre décrit : « ! » et titre, dépli centré, fusions qui remontent, titre retiré', () => {
  const { steps, tl } = jouer('mfac', nums(LIGNE_FACTORIELLE), jetonsNums(LIGNE_FACTORIELLE));
  assert.deepEqual(tl.warnings, [], 'rien ne se contredit');
  assert.deepEqual(steps.map((s) => s.caption), ['3! = 1 × 2 × 3 = 6', '1! = 1', '5! = 1 × 2 × 3 × 4 × 5 = 120'],
    'un nombre par étape, et sa légende');
  const lire = lecteur(tl);
  const fs = tl.metrics.fontSize;
  const pas = fs * 0.9;
  const fin = (a) => a.delay + a.duration;
  const arrivee = (a) => a.keyframes[a.keyframes.length - 1].value;
  const dans = (st) => (a) => a.delay >= st.t0 && a.delay < st.t0 + st.duration;
  const anims = (id, prop, st) => tl.anims.filter((a) => a.id === id && a.prop === prop && (!st || dans(st)(a)));
  const noeud = (id) => tl.nodes.find((n) => n.id === id);
  const parait = (id, st) => anims(id, 'opacity', st).find((a) => arrivee(a) === 1);
  const yLigne = lire.valeur('t0', 'translate', 0).y;
  const [pas3, , pas5] = tl.steps;

  // 1. les « ! » de TOUS les nombres, et le titre centré sous la ligne.
  const points = ['x0_fb0', 'x0_fb1', 'x0_fb2'];
  assert.deepEqual(points.map((id) => noeud(id).text), ['!', '!', '!']);
  const premierDepli = tl.anims.filter((a) => a.id.startsWith('@facteur') && a.prop === 'translate')
    .reduce((m, a) => Math.min(m, a.delay), Infinity);
  for (const [k, id] of points.entries()) {
    assert.ok(fin(parait(id, pas3)) <= premierDepli, `le « ! » de ${LIGNE_FACTORIELLE[k]} est posé avant le premier dépli`);
    const p = lire.valeur(id, 'translate', fin(parait(id, pas3)));
    const n = lire.valeur(`t${k}`, 'translate', fin(parait(id, pas3)));
    assert.ok(Math.abs(p.x - n.x) < 0.5 && p.y < n.y - fs * 0.5,
      'suspendu au-dessus de son nombre : sa place ne s’ouvrira qu’à l’étape de ce nombre');
  }
  const titre = noeud('x0_ft');
  assert.equal(titre.text, 'Factorielle !');
  const tTitre = fin(parait('x0_ft', pas3));
  assert.ok(tTitre <= premierDepli, 'le titre est là avant le premier dépli');
  const pTitre = lire.valeur('x0_ft', 'translate', tTitre);
  assert.ok(pTitre.y > yLigne + fs, 'sous la ligne principale');
  assert.ok(Math.abs(pTitre.x - tl.layoutOpts.centerX) < 0.5, 'centré');

  // 2. le dépli de 5 : 1 × 2 × 3 × 4 × 5, le 3 au niveau de la ligne.
  const col5 = colonnesDe(steps, tl)[2];
  const efface5 = anims('x0_fb2', 'opacity', pas5).find((a) => arrivee(a) === 0);
  const facteurs = tl.nodes.filter((n) => n.id.startsWith('@facteur') && anims(n.id, 'translate', pas5).length);
  assert.deepEqual(facteurs.map((n) => n.text), ['1', '2', '3', '4'], 'n − 1 … 1 sortent du nombre');
  const depli = anims(facteurs[0].id, 'translate', pas5)[0];
  assert.ok(efface5.delay < depli.delay, 'le « ! » de 5 s’efface quand son calcul commence');
  const pose5 = lire.valeur('x0_fb2', 'translate', efface5.delay);
  const n5 = lire.valeur('t2', 'translate', efface5.delay);
  assert.ok(Math.abs(pose5.y - n5.y) < 0.5 && pose5.x > n5.x, '… après être descendu à côté de lui');
  const rang = (id) => Math.round((arrivee(anims(id, 'translate', pas5)[0]).y - yLigne) / pas);
  assert.deepEqual(facteurs.map((n) => rang(n.id)), [-4, -2, 0, 2], 'L1 : 1, L3 : 2, L5 : 3 sur la ligne, L7 : 4');
  assert.equal(rang('t2'), 4, 'L9 : le 5 lui-même, en bas');
  const signes = tl.nodes.filter((n) => n.id.startsWith('@fois') && dans(pas5)(parait(n.id) || { delay: -1 }));
  assert.deepEqual(signes.map((n) => Math.round((lire.valeur(n.id, 'translate', fin(parait(n.id, pas5))).y - yLigne) / pas)),
    [-3, -1, 1, 3], 'les × aux rangs pairs de l’autrice : L2, L4, L6, L8');
  assert.ok(signes.every((n) => parait(n.id, pas5).delay >= fin(depli)), 'une fois les facteurs posés');
  // Le titre s'est écarté : il ne recouvre pas la colonne.
  const xTitre = lire.valeur('x0_ft', 'translate', depli.delay + depli.duration).x;
  assert.ok(Math.abs(xTitre - col5.x) >= (titre.w + noeud('x0_2').w) / 2, 'le titre s’écarte de la colonne en cours');

  // 3. les fusions, une paire à la fois : 2, 6, 24, puis 120 sur la ligne.
  const produits = tl.nodes.filter((n) => (n.id.startsWith('@produit') || n.id === 'x0_2') && parait(n.id, pas5));
  assert.deepEqual(produits.map((n) => n.text), ['2', '6', '24', '120'], '1 × 2, puis 2 × 3, puis 6 × 4, puis 24 × 5');
  const apparitions = produits.map((n) => parait(n.id, pas5).delay);
  for (let k = 1; k < apparitions.length; k++) assert.ok(apparitions[k] > apparitions[k - 1], 'les unes après les autres');
  // Le premier descend sur le suivant, et embarque le × au passage.
  const descente = anims(facteurs[0].id, 'translate', pas5)[1];
  assert.equal(Math.round((arrivee(descente).y - arrivee(depli).y) / pas), 2, 'le 1 descend de deux rangs, sur le 2');
  const embarque = anims(signes[0].id, 'translate', pas5)[0];
  assert.ok(embarque.delay > descente.delay && fin(embarque) <= fin(descente) + 1, 'le × part AU PASSAGE du 1');
  assert.ok(arrivee(embarque).x < arrivee(descente).x, '… accolé à sa gauche');
  // Après chaque fusion, la colonne remonte d'un rang ; la dernière aboutit sur la ligne.
  for (const [k, n] of produits.entries()) {
    const montee = anims(n.id, 'translate', pas5)[0];
    assert.ok(montee && montee.delay > apparitions[k], `${n.text} remonte après sa fusion`);
  }
  const yFinal = lire.valeur('x0_2', 'translate', col5.t1 - 1).y;
  assert.ok(Math.abs(yFinal - yLigne) < 0.5, 'la dernière fusion aboutit sur la ligne principale');
  assert.ok(noeud('x0_2').w >= 3 * tl.metrics.advance - 0.01, '120 a la place de ses trois chiffres');

  // 5. la ligne entière est passée : le titre disparaît, la caméra revient.
  const retrait = anims('x0_ft', 'opacity', pas5).find((a) => arrivee(a) === 0);
  assert.ok(retrait && retrait.delay >= apparitions[3], 'le titre s’en va après le dernier résultat');
  assert.equal(lire.valeur('@camera', 'scale', col5.t1 + 1), 1, 'la caméra revient à son repos');
});

/**
 * ★ **JAMAIS DEUX JETONS L'UN SUR L'AUTRE, ET LE TITRE NE COUVRE RIEN.**
 *
 * Hors de la colonne en cours, personne ne recouvre personne — les voisins de
 * la ligne, les « ! », la colonne contre ses voisins. DANS la colonne, les
 * fusions sont le geste : le 1 tombe sur le 2. Le titre, lui, ne touche aucun
 * jeton visible, à aucun instant. Et la plus haute colonne tient dans le cadre :
 * `Ice` rend `9 3 5`, et 9! se déplie sur dix-sept rangs.
 */
function verifierFactorielle(nom, steps, tl) {
  assert.deepEqual(tl.warnings, [], `${nom} : ${tl.warnings.join(' | ')}`);
  const lire = lecteur(tl);
  const fs = tl.metrics.fontSize;
  const av = tl.metrics.advance;
  const { centerY, viewBox } = tl.layoutOpts;
  const colonnes = colonnesDe(steps, tl);
  const idTitre = colonnes[0].op.titre.id;
  const titre = tl.nodes.find((n) => n.id === idTitre);
  const debut = colonnes[0].t0;
  const fin = colonnes[colonnes.length - 1].t1;
  const N = 2500;
  for (let k = 0; k <= N; k++) {
    const t = debut + ((fin - debut) * k) / N;
    const col = colonnes.find((c) => t >= c.t0 && t <= c.t1);
    const vus = lire.visibles(t);
    const dansCol = (j) => Math.abs(j.x - col.x) < col.w / 2 + 1;
    for (let i = 0; i < vus.length; i++) {
      for (let j = i + 1; j < vus.length; j++) {
        const [p, q] = [vus[i], vus[j]];
        if (dansCol(p) && dansCol(q)) continue;
        if (Math.abs(p.y - q.y) >= ((p.h + q.h) / 2) * 0.8) continue;
        const recouvre = Math.min(p.d, q.d) - Math.max(p.g, q.g);
        assert.ok(recouvre <= 0.5, `${nom}, t = ${Math.round(t)} : « ${p.texte} » (${p.id}) `
          + `et « ${q.texte} » (${q.id}) se chevauchent de ${recouvre.toFixed(1)}`);
      }
    }
    const pt = lire.valeur(idTitre, 'translate', t);
    if ((lire.valeur(idTitre, 'opacity', t) ?? 1) > 0.1 && pt) {
      const h = fs * 0.62;
      for (const q of vus) {
        const rx = Math.min(pt.x + titre.w / 2, q.d) - Math.max(pt.x - titre.w / 2, q.g);
        const ry = Math.min(pt.y + h / 2, q.y + q.h / 2) - Math.max(pt.y - h / 2, q.y - q.h / 2);
        assert.ok(!(rx > 0.5 && ry > 0.5), `${nom}, t = ${Math.round(t)} : le titre couvre « ${q.texte} » (${q.id})`);
      }
    }
    const zoom = lire.valeur('@camera', 'scale', t) ?? 1;
    for (const q of vus) {
      const haut = centerY + zoom * (q.y - q.h / 2 - centerY);
      const bas = centerY + zoom * (q.y + q.h / 2 - centerY);
      assert.ok(haut >= viewBox.y && bas <= viewBox.y + viewBox.h,
        `${nom}, t = ${Math.round(t)} : « ${q.texte} » (${q.id}) sort du cadre (${haut.toFixed(0)} → ${bas.toFixed(0)})`);
    }
  }
}

/** « Ice » par le chemin du site : `tca`, `ma1`, `mfac` — 9 3 5. */
function scenarioIce() {
  const sc = construireScenario(approcheSur('Ice', ['tca', 'ma1', 'mfac']), { saisie: 'Ice' });
  return { sc, tl: compile(sc) };
}

test('★ la factorielle ne superpose rien hors de la colonne, le titre ne couvre rien, et 9! tient dans le cadre', () => {
  const { steps, tl } = jouer('mfac', nums(LIGNE_FACTORIELLE), jetonsNums(LIGNE_FACTORIELLE));
  verifierFactorielle('3 1 5', steps, tl);
  const { sc, tl: tlIce } = scenarioIce();
  verifierFactorielle('Ice', sc.steps, tlIce);
  // (480 − 2 casses) / (16 interlignes + 1 casse) ≈ 0,52 : la caméra recule de moitié.
  assert.ok(tlIce.anims.some((a) => a.id === '@camera' && a.prop === 'scale' && a.keyframes.at(-1).value < 0.6),
    'dix-sept rangs : la caméra recule pour les faire tenir');
});

test('★ 1! et 2! se jouent aussi, la colonne réduite à ce qu’elle est', () => {
  const valeurs = [1, 2, 3];
  const { o, apres, steps, tl } = jouer('mfac', nums(valeurs), jetonsNums(valeurs));
  assert.deepEqual(steps.map((s) => s.caption), ['1! = 1', '2! = 1 × 2 = 2', '3! = 1 × 2 × 3 = 6']);
  const [pas1, pas2] = tl.steps;
  const dans = (st) => (n) => tl.anims.some((a) => a.id === n.id && a.delay >= st.t0 && a.delay < st.t0 + st.duration);
  assert.equal(tl.nodes.filter((n) => n.id.startsWith('@facteur')).filter(dans(pas1)).length, 0,
    '1! : aucun facteur à déplier, le 1 est sa propre colonne');
  assert.equal(tl.nodes.filter((n) => n.id.startsWith('@facteur')).filter(dans(pas2)).length, 1, '2! : le 1, au-dessus du 2');
  const tokens = jetonsNums(valeurs);
  const lignes = suivreLaLigne(tokens, steps);
  assert.deepEqual(lignes[lignes.length - 1].ids,
    o.sortie(nums(valeurs), apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' }),
    'la ligne rejouée est celle que la factorielle déclare');
});

test('la factorielle refuse d’afficher un résultat faux', () => {
  const faux = {
    version: 1, tokens: jetonsNums([5]),
    steps: [{ id: 's0', title: 'factorielle', ops: [{
      op: 'group', at: 0, dur: 10000, targets: ['t0'], factorielle: true,
      titre: { id: 'ft', text: 'Factorielle !' }, point: 'fb0', annonce: [{ cible: 't0', id: 'fb0' }], dernier: true,
      to: { id: 'r0', text: '121', kind: 'number' },
    }] }],
  };
  assert.throws(() => compile(faux), /120/, '5! vaut 120, pas 121');
});

/**
 * ★ **PAR LE CHEMIN DU SITE.** Aucune voie de l'instantané chiffré ne passe par
 *   `mfac`, et la seule que sa mesure d'origine annonçait n'est nommée nulle
 *   part : la scène est donc construite par le catalogue, sur une vraie saisie,
 *   par `construireScenario` — le chemin qui avait laissé passer la potence.
 */
test('★ par le chemin du site, la factorielle est jouée et rien ne retombe sur le rendu générique', () => {
  const { sc, tl } = scenarioIce();
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  const gestes = sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'group' && o.factorielle));
  assert.deepEqual(gestes.map((s) => s.caption),
    ['9! = 1 × 2 × 3 × 4 × 5 × 6 × 7 × 8 × 9 = 362880', '3! = 1 × 2 × 3 = 6', '5! = 1 × 2 × 3 × 4 × 5 = 120']);
  assert.deepEqual(tl.warnings, [], 'la scène entière compile sans animation concurrente');
});

// ───────────────────── 11. les frontières de la ligne survivent aux trois gestes

/**
 * ★ **CE QUI EST MONTRÉ ENTRE DEUX ÉTAPES EST CE QUE LA RECHERCHE COMPTE.**
 *
 * `recherche/scenario.js › suivreLaLigne` rejoue la ligne — ses jetons ET ses
 * frontières de groupe, ces écarts plus larges que l'ordinaire qui décident où
 * trois 6 se touchent. Le test lent `integration-visuel.test.js` le vérifie sur
 * les voies du jeu d'essai, et il a rougi : la puissance réservait la place de
 * ses exposants en élargissant l'écart devant le nombre suivant, et cet écart
 * survivait d'une étape à l'autre — une frontière que la scène montrait et que
 * le moteur ne comptait pas. La factorielle faisait de même avec ses « ! ».
 *
 * Aucune voie de ce jeu d'essai ne passe par `mcar` ni `mfac`, et le cas fautif
 * n'y a pas de groupe. On le mesure donc ici, pour les trois gestes, sur une
 * ligne DÉCOUPÉE en deux groupes : à l'entrée de chaque étape, la scène et le
 * rejeu portent les mêmes jetons et les mêmes frontières.
 */
import { Scene } from '../scene.js';
import { TOKEN_GAP } from '../constants.js';

/** La ligne à l'entrée de chaque étape, relevée sur la vraie scène (même mouchard que le test lent). */
function releverLaLigne(sc) {
  const releves = [];
  const original = Scene.prototype.oublierAncres;
  Scene.prototype.oublierAncres = function mouchard() {
    releves.push({
      ids: this.flow.slice(),
      frontieres: this.flow.filter((id) => (this.get(id).gapBefore ?? 0) > TOKEN_GAP).sort(),
    });
    return original.call(this);
  };
  try { compile(sc); } finally { Scene.prototype.oublierAncres = original; }
  return releves;
}

test('★ carré, puissance, factorielle : sur une ligne groupée, la scène et le rejeu gardent les mêmes frontières', () => {
  const valeurs = [3, 2, 4, 1];
  for (const code of ['mcar', 'mpui', 'mfac']) {
    const tokens = jetonsNums(valeurs);
    const o = PAR_CODE.get(code);
    const avant = nums(valeurs);
    const apres = appliquer(o, avant);
    const steps = [
      { id: 's_decoupe', title: 'découpe', ops: [{ op: 'partition', at: 0, groups: [{ targets: ['t0', 't1'] }, { targets: ['t2', 't3'] }] }] },
      ...o.steps(avant, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' }),
      { id: 's_fin', title: 'fin', ops: [{ op: 'wait', at: 0 }] },
    ];
    const releves = releverLaLigne({ version: 1, tokens, steps });
    const rejeu = suivreLaLigne(tokens, steps);
    assert.deepEqual(releves[1].frontieres, ['t2'], `${code} : la découpe ouvre bien une frontière devant le second groupe`);
    for (let i = 0; i + 1 < steps.length; i++) {
      assert.ok(rejeu[i], `${code} : le rejeu ne se perd pas après « ${steps[i].id} »`);
      assert.deepEqual(rejeu[i].ids, releves[i + 1].ids, `${code} : jetons après « ${steps[i].id} »`);
      assert.deepEqual([...rejeu[i].frontieres].sort(), releves[i + 1].frontieres,
        `${code} : frontières après « ${steps[i].id} »`);
    }
    assert.deepEqual(releves.at(-1).frontieres, ['x0_2'], `${code} : le résultat du second groupe hérite de sa frontière`);
  }
});
