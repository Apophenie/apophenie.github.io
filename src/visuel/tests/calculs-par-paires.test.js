/**
 * ★ **DEUX VALEURS À LA FOIS — jamais plus.**
 *
 * > « Pour les mab, mad, mrd, mrdE et compagnie : pour rendre plus discrète la
 * >   sélection opportuniste : ne fais que des calculs entre 2 nombres, jamais
 * >   entre plus (pas de 5+3+8+2 : fais d'abord 5+3 puis 8+2, et à la passe
 * >   suivante tu pourras faire 8+10). Pareil pour les multiplications. Pour
 * >   les soustractions, plutôt que 5−2−1, fais d'abord 2+1, puis 5−3. Bref, ne
 * >   fais les opérations qu'entre deux valeurs. » (l'auteur)
 *
 * Ce fichier ne vérifie aucun résultat : `apply` n'a pas bougé, et la
 * recherche rend les mêmes listes. Il vérifie ce que l'ÉCRAN montre :
 *
 *  1. le parcours lui-même — des paires, par passes, dans l'ordre de l'auteur ;
 *  2. le CATALOGUE : aucun geste à plus de deux opérandes dans les steps des
 *     opérateurs concernés, sur des lignes qui les exercent vraiment — avec au
 *     moins une seconde passe, sans quoi on n'aurait rien prouvé ;
 *  3. le CHEMIN DU SITE : `construireScenario` sur une voie qui les emploie,
 *     sans avertissement, puis `compile()` sans animation concurrente.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie } from '../../moteur/etat.js';
import { passesBinaires } from '../../moteur/transformations/commun.js';
import { construireScenario, suivreLaLigne } from '../../recherche/scenario.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/** Les opérateurs dont la mise en scène est désormais binaire. */
const PERIMETRE = ['mab', 'mabx', 'mabd', 'mad', 'mrd', 'mrdE', 'mam', 'mrdf', 'mrfE', 'mrn', 'cs', 'cp', 'cst'];

const nums = (vs) => ({ type: 'NUMS', valeur: vs, traces: vs.map(() => [0, 1]) });
const jetonsNums = (vs) => vs.map((v, i) => ({ id: `t${i}`, text: String(v), kind: 'number' }));
const opsDe = (steps) => steps.flatMap((s) => s.ops || []);

/** Un geste de calcul à plus de deux valeurs — ce que l'auteur ne veut plus voir. */
function troplarge(o) {
  if (o.op === 'sum' && Array.isArray(o.targets) && o.targets.length > 2) return true;
  if (o.op === 'reduce' && Array.isArray(o.digits) && o.digits.length > 2) return true;
  if (o.op === 'insertOperators' && Array.isArray(o.between) && o.between.length > 2) return true;
  return false;
}

// ───────────────────── 1. le parcours

test('★ 5 + 3 + 8 + 2 : d’abord 5 + 3, puis 8 + 2, et à la passe suivante 8 + 10', () => {
  const termes = [5, 3, 8, 2].map((v, i) => ({ id: `c${i}`, v }));
  const { gestes, racine } = passesBinaires(termes, {
    combiner: (a, b) => a + b, nommer: (k) => `i${k}`, racine: 'somme',
  });
  assert.deepEqual(gestes.map((g) => `${g.gauche.v}+${g.droite.v}=${g.resultat.v}`),
    ['5+3=8', '8+2=10', '8+10=18']);
  assert.deepEqual(gestes.map((g) => g.niveau), [0, 0, 1], 'deux passes : les paires, puis leurs résultats');
  assert.equal(racine.id, 'somme', 'la racine porte l’identifiant que l’opérateur publie');
  assert.equal(racine.v, 18);
  assert.ok(gestes[2].dernier && !gestes[0].dernier && !gestes[1].dernier);
});

test('★ un terme sans voisin attend la passe suivante, sans rien faire', () => {
  const termes = [1, 2, 3, 4, 5].map((v, i) => ({ id: `c${i}`, v }));
  const { gestes } = passesBinaires(termes, {
    combiner: (a, b) => a + b, nommer: (k) => `i${k}`, racine: 'r',
  });
  assert.deepEqual(gestes.map((g) => `${g.gauche.v}+${g.droite.v}`), ['1+2', '3+4', '3+7', '10+5']);
  assert.equal(gestes.length, termes.length - 1, 'n termes, n − 1 gestes');
});

test('★ 5 − 2 − 1 : d’abord 2 + 1, puis 5 − 3 (la soustraction en chaîne)', () => {
  const o = PAR_CODE.get('cst');
  const avant = nums([5, 2, 1]);
  const apres = appliquer(o, avant);
  assert.equal(apres.valeur, 2);
  const steps = o.steps(avant, apres, { ids: ['t0', 't1', 't2'], cle: 'x0', langue: 'fr' });
  assert.deepEqual(steps.map((s) => s.caption), ['2 + 1 = 3', '5 − 3 = 2']);
  const sommes = opsDe(steps).filter((x) => x.op === 'sum');
  assert.deepEqual(sommes.map((s) => s.targets.length), [2, 2]);
  assert.deepEqual(sommes[1].partials, [5, 2], 'le premier se pose, le total le retranche');
  const tl = compile({ version: 1, tokens: jetonsNums([5, 2, 1]), steps });
  assert.deepEqual(tl.warnings, []);
});

// ───────────────────── 2. le catalogue

/**
 * Des lignes de chiffres et de petits nombres, tirées d'un générateur FIXE :
 * deux exécutions essaient exactement les mêmes (§4.4). On en garde, pour
 * chaque opérateur, celles sur lesquelles il s'applique.
 */
function lignesTemoins(n = 1500) {
  let x = 20260911;
  const suivant = () => { x = (x * 1103515245 + 12345) % 2147483648; return x; };
  const lignes = [];
  for (let k = 0; k < n; k++) {
    const long = 3 + (suivant() % 10);
    const ligne = [];
    for (let i = 0; i < long; i++) {
      // Surtout des chiffres, parfois un nombre à deux chiffres : c'est ce
      // qu'une conversion de lettres rend.
      ligne.push(suivant() % 4 === 0 ? 10 + (suivant() % 17) : suivant() % 10);
    }
    lignes.push(ligne);
  }
  return lignes;
}

test('★ aucun geste à plus de deux opérandes dans les steps du périmètre — et des secondes passes jouées', () => {
  const lignes = lignesTemoins();
  /* ★ `mam` ne s'applique qu'à une ligne dont la moyenne est SOUS le chiffre
     visé — additionner la fait monter. Les lignes témoins, riches en nombres
     à deux chiffres, sont presque toutes au-dessus de 6 : il n'en exercerait
     aucune. Il reçoit donc les mêmes lignes ramenées à de petits chiffres
     (modulo 7), fixes et déterministes comme elles. */
  /* ★ `mrn` a le besoin INVERSE : son arbre ne se déploie que sur un nombre
     d'au moins trois chiffres — deux chiffres ne font qu'une paire, donc
     jamais de seconde passe. Les lignes témoins n'en portent presque pas. On
     les ramène donc dans la plage à trois chiffres, par la même arithmétique
     fixe et déterministe que celle de `mam`. Ce n'est pas un aménagement pour
     faire passer le test : c'est le seul régime où la promesse qu'il vérifie —
     « à la passe suivante tu pourras faire 8 + 10 » — a un sens pour lui. */
  const PROPRES = {
    mam: lignes.map((l) => l.map((v) => v % 7)),
    mrn: lignes.map((l) => l.map((v) => 100 + (v % 900))),
  };
  for (const code of PERIMETRE) {
    const o = PAR_CODE.get(code);
    assert.ok(o, `« ${code} » doit exister au catalogue`);
    let exerce = 0;
    let secondesPasses = 0;
    for (const v of PROPRES[code] || lignes) {
      const avant = nums(v);
      const apres = appliquer(o, avant);
      if (!apres) continue;
      const ctx = { ids: v.map((_, i) => `t${i}`), cle: 'x0', langue: 'fr' };
      const steps = o.steps(avant, apres, ctx);
      const ops = opsDe(steps);
      const larges = ops.filter(troplarge);
      assert.deepEqual(larges.map((x) => `${x.op}:${(x.targets || x.digits || x.between).length}`), [],
        `${code} sur [${v.join(' ')}] : ${larges.map((x) => JSON.stringify(x.targets || x.digits || x.between)).join(' ')}`);
      // Une somme dont un opérande a été FABRIQUÉ par une somme précédente :
      // c'est une seconde passe, la preuve que l'arbre a servi.
      const fabriques = new Set();
      for (const x of ops) {
        if (x.op !== 'sum') continue;
        if (x.targets.some((id) => fabriques.has(id))) secondesPasses++;
        fabriques.add(x.to.id);
      }
      // Le rejeu de la ligne suit chaque paire, et finit sur la sortie publiée.
      const tokens = jetonsNums(v);
      const suivies = suivreLaLigne(tokens, steps);
      assert.ok(suivies.every(Boolean), `${code} sur [${v.join(' ')}] : le rejeu se perd`);
      const finale = suivies.length ? suivies[suivies.length - 1].ids : ctx.ids;
      assert.deepEqual(finale, o.sortie(avant, apres, ctx), `${code} sur [${v.join(' ')}] : la ligne rejouée n’est pas la sortie`);
      // Et la scène compile, sans deux animations sur le même nœud.
      if (exerce < 12) {
        const tl = compile({ version: 1, tokens, steps });
        assert.deepEqual(tl.warnings, [], `${code} sur [${v.join(' ')}] : ${tl.warnings.join(' | ')}`);
      }
      exerce++;
    }
    assert.ok(exerce >= 3, `${code} ne s’applique qu’à ${exerce} ligne(s) témoin : le test ne prouverait rien`);
    assert.ok(secondesPasses > 0, `${code} : aucune seconde passe jouée sur ${exerce} lignes — l’arbre n’a jamais servi`);
  }
});

// ───────────────────── 3. le chemin du site

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
 * Une voie par opérateur du périmètre, qui s'applique à la saisie ENTIÈRE (un
 * seul fragment, comme `approcheSur` le construit) et dont un paquet compte
 * plus de deux termes — sans quoi la paire n'aurait rien à montrer. Relevées
 * en balayant les conversions usuelles sur des mots du corpus.
 */
const VOIES = [
  ['Donald', 'tca+ma1+mab'],
  ['Donald', 'tca+mx6+mabx'],
  ['Wikipedia', 'tca+mt9+mabd'],
  ['Macron', 'tca+mz26+mad'],
  ['Donald', 'tca+mhe+mrd'],
  // L'addition vers la moyenne : « 6 1 2 1 8 5 4 1 1 », deux paquets de trois.
  ['Wikipedia', 'tca+mch+mam'],
  // ★ `mrdE` n'y écrivait qu'en posant des 9 pour des 6 : c'est désormais le
  //   geste de sa variante avec 9 (19 septembre 2026), même sortie : `9 9 6`.
  ['Trump', 'tca+mx6+md9E'],
  ['Donald', 'tca+ma1+cs'],
  ['Donald', 'tca+mpy+cp'],
  ['Donald', 'tca+ma1+cst'],
];

test('★ par le chemin du site, les paires sont JOUÉES — et rien ne se chevauche', () => {
  for (const [saisie, programme] of VOIES) {
    const codes = programme.split('+');
    const sc = construireScenario(approcheSur(saisie, codes), { saisie });
    assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
    const ops = opsDe(sc.steps);
    const larges = ops.filter(troplarge);
    assert.deepEqual(larges.map((x) => x.op), [], `${saisie} › ${programme} : un calcul à plus de deux valeurs`);
    const fabriques = new Set();
    let seconde = false;
    for (const x of ops) {
      if (x.op !== 'sum') continue;
      if (x.targets.some((id) => fabriques.has(id))) seconde = true;
      fabriques.add(x.to.id);
    }
    assert.ok(seconde, `${saisie} › ${programme} : aucune seconde passe — la voie n’exerce pas l’arbre`);
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, [], `${saisie} › ${programme} : ${tl.warnings.join(' | ')}`);
  }
});

// ───────────────────── 4. tous les paquets au même temps

/**
 * > « Toutes les premières additions de tous les paquets en même temps, puis
 * >   toutes les deuxièmes, etc., puis les réductions ensemble. » (l'autrice,
 * >   19 septembre, sur `fmaj+mas+mrdE` et « Didier Raoult »)
 *
 * On le vérifie sur la ligne même de Raoult, par le chemin du site
 * (`construireScenario` puis `compile`) : dans une étape d'additions, toutes
 * les sommes partent au même instant, et pas une animation ne se contredit —
 * c'était 437 conflits quand on posait simplement les `sum` ordinaires côte à
 * côte. Puis la fin commune : les accolades ne s'effacent qu'après la pose de
 * TOUS les résultats (`_accolades.js`, sur des étapes à plusieurs lots).
 */
test('★ mrdE sur Didier Raoult : chaque temps joue tous ses paquets ensemble, sans rien de concurrent', async () => {
  const { compilerEnRelevant } = await import('./_cadre.js');
  const { finsDesAccolades } = await import('./_accolades.js');
  const saisie = 'Didier Raoult';
  const sc = construireScenario(approcheSur(saisie, ['fmaj', 'tca', 'mas', 'mrdE']), { saisie });
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  const calculs = sc.steps.filter((s) => s.ops.some((o) => o.op === 'sum'));
  // Neuf temps d'additions, là où vingt-deux additions se montraient une à une.
  assert.equal(calculs.length, 9, calculs.map((s) => s.caption).join('\n'));
  assert.equal(calculs[0].caption,
    '8 + 7 = 15 · 3 + 6 = 9 · 8 + 7 = 15 · 9 + 8 = 17 · 2 + 3 = 5 · 7 + 9 = 16 · 8 + 5 = 13',
    'les premières paires de TOUS les paquets de la passe, dans l’ordre de la ligne');
  for (const s of calculs) {
    const sommes = s.ops.filter((o) => o.op === 'sum');
    assert.equal(new Set(sommes.map((o) => o.at)).size, 1, `${s.caption} : les sommes partent ensemble`);
    const signes = s.ops.filter((o) => o.op === 'insertOperators');
    assert.equal(signes.length, 1, `${s.caption} : un seul écartement pour tous les signes`);
    assert.equal(signes[0].lots.length, sommes.length);
    const fin = s.ops.filter((o) => o.op !== 'horns').at(-1);
    assert.ok(fin.op === 'move' && fin.retirer === true && fin.attendre > 0,
      `${s.caption} : la fin commune — les résultats posés, PUIS les accolades s'effacent et la ligne se referme`);
  }
  // L'écriture chiffre à chiffre vient APRÈS toutes les additions : aucun paquet ne finit seul.
  const legendes = sc.steps.map((s) => s.caption);
  assert.ok(legendes.indexOf('39 → 3 9 · 24 → 2 4 · 36 → 3 6')
    > legendes.indexOf('24 + 15 = 39 · 22 + 2 = 24 · 29 + 7 = 36'),
  'les sommes de la passe s’écrivent chiffre à chiffre ensemble, après la dernière addition');
  // La garde de fin d'accolade, sans le verdict : il change la largeur des
  // jetons révélés, et la garde lit la largeur finale des nœuds.
  const { tl, lignes } = compilerEnRelevant({ ...sc, steps: sc.steps.filter((s) => !s.ops.some((o) => o.op === 'reveal')) });
  assert.deepEqual(tl.warnings, [], tl.warnings.slice(0, 3).join(' | '));
  const fautes = finsDesAccolades(tl, lignes).filter((f) => f.faute);
  assert.deepEqual(fautes.map((f) => `${f.id} : ${f.faute}`), []);
  assert.deepEqual(compile(sc).warnings, [], 'et la scène entière, verdict compris');
});

/* ══════════════ `mrn` — en largeur, et deux items à la fois ═══════════════
 *
 * > « L'animation de `mrn` est à revoir : largeur d'abord plutôt que profondeur
 * >   d'abord, et opération entre 2 items à la fois, pas plus. Ça marchera bien
 * >   mieux avec le mode parallèle. » (l'auteur, sur `f3!fr16+mas+mrn+meg`)
 *
 * MESURÉ avant correction, sur « Didier Raoult » : quinze étapes, une par
 * `reduce`, la boucle externe sur le NOMBRE et l'interne sur le palier — donc
 * `84 → 12` puis `12 → 3` avant que le nombre suivant ne commence. Et dix
 * `reduce` sur quinze ouvraient leur nombre en TROIS chiffres d'un coup.
 */

test('★ mrn : tous les nombres s’ouvrent ensemble, puis tous les couples du même tour', () => {
  const avant = nums([44, 15]);
  const op = PAR_CODE.get('mrn');
  const apres = appliquer(op, avant);
  assert.deepEqual(apres.valeur, [8, 6]);
  const steps = op.steps(avant, apres, { ids: ['t0', 't1'], cle: 'x0', langue: 'fr' });

  // Premier temps : l'ÉCRITURE, et elle porte les deux nombres d'un coup.
  const eclat = steps[0].ops.filter((o) => o.op === 'substitute');
  assert.equal(eclat.length, 1, 'un seul éclatement pour toute la ligne');
  assert.equal(eclat[0].pairs.length, 2, 'les deux nombres s’ouvrent dans la MÊME étape');
  assert.deepEqual(eclat[0].pairs.map((p) => p.to.map((t) => t.text).join('')), ['44', '15']);

  // Deuxième temps : les couples, tous ensemble, et deux termes chacun.
  const sommes = steps[1].ops.filter((o) => o.op === 'sum');
  assert.equal(sommes.length, 2, 'les deux additions du premier tour sont dans la même étape');
  for (const s of sommes) assert.equal(s.targets.length, 2, 'deux items, jamais trois');
  assert.equal(new Set(sommes.map((o) => o.at)).size, 1, 'elles partent au même instant déclaré');
});

/**
 * ★ **LE PARCOURS EST EN LARGEUR, et le test le prouve sur un cas où les deux
 *   parcours DIFFÈRENT.** Il faut pour cela deux nombres dont l'un demande plus
 *   de paliers que l'autre : `199` en veut trois (19, 10, 1), `23` un seul (5).
 *   En profondeur, les trois paliers de `199` se joueraient avant que `23` ne
 *   bouge ; en largeur, `23` fait son unique addition dans le MÊME tour que la
 *   première de `199`.
 */
test('★ mrn : le tour d’un nombre court tombe dans le même temps que celui d’un long', () => {
  const avant = nums([199, 23]);
  const op = PAR_CODE.get('mrn');
  const apres = appliquer(op, avant);
  assert.deepEqual(apres.valeur, [1, 5]);
  const steps = op.steps(avant, apres, { ids: ['t0', 't1'], cle: 'x0', langue: 'fr' });

  // Le premier temps ouvre les DEUX nombres ; en profondeur, `23` aurait
  // attendu que `199` ait fini ses trois paliers.
  const premier = steps[0].ops.find((o) => o.op === 'substitute');
  assert.equal(premier.pairs.length, 2, '199 et 23 s’ouvrent ensemble');

  // Et l'unique addition de `23` (2 + 3 = 5) tombe dans un temps où `199`
  // additionne encore — donc avant la fin de sa descente.
  const legendes = steps.map((s) => s.caption);
  const iCourt = legendes.findIndex((c) => c.includes('2 + 3 = 5'));
  const iDernier = legendes.findIndex((c) => c.includes('1 + 0 = 1'));
  assert.ok(iCourt >= 0, `l’addition de 23 est introuvable : ${legendes.join(' | ')}`);
  assert.ok(iDernier >= 0, `le dernier palier de 199 est introuvable : ${legendes.join(' | ')}`);
  assert.ok(iCourt < iDernier,
    `en largeur, 23 additionne avant que 199 ait fini — vu ${iCourt} puis ${iDernier}`);
});

test('★ mrn : plus jamais trois chiffres dans une même opération', () => {
  const op = PAR_CODE.get('mrn');
  let vus = 0;
  // Des nombres à trois chiffres et plus : c'est là que l'ancien `reduce`
  // ouvrait `1 + 1 + 6` d'un seul coup.
  for (const ligne of [[116], [199, 23], [84, 121, 116, 121], [9999]]) {
    const avant = nums(ligne);
    const apres = appliquer(op, avant);
    if (!apres) continue;
    const ids = ligne.map((_, i) => `t${i}`);
    for (const o of opsDe(op.steps(avant, apres, { ids, cle: 'x0', langue: 'fr' }))) {
      assert.ok(!troplarge(o), `${JSON.stringify(ligne)} : geste à plus de deux valeurs — ${JSON.stringify(o).slice(0, 140)}`);
      if (o.op === 'sum') vus++;
    }
  }
  assert.ok(vus >= 8, `seulement ${vus} additions vues : le test n’exerce pas assez`);
});

/**
 * ★ **ET LE GESTE TIENT LES DEUX RYTHMES.**
 *
 * C'est ce que l'auteur annonçait — « ça marchera bien mieux avec le mode
 * parallèle » —, et c'est vérifiable : les gestes d'un même tour vivent dans le
 * MÊME step et portent sur des caractères disjoints, donc « Simultané » les
 * joue en vague et « Pas à pas » les met à la file. Ni l'un ni l'autre ne doit
 * produire d'animation concurrente, ni faire faire du yoyo à une accolade.
 *
 * ⚠️ La garde des accolades est ce qui a rattrapé le vrai défaut : en Pas à
 *   pas, l'accolade de la première somme — déjà refermée sur son résultat, mais
 *   pas encore effacée — était étirée de 105 à 225 unités pour couvrir la place
 *   réservée au résultat de sa VOISINE (`helpers.js › reserverLaPlace`). Le
 *   défaut préexistait au geste de `mrn` : il attendait qu'on sérialise deux
 *   sommes d'une même étape pour se montrer.
 */
test('★ mrn : les deux rythmes compilent sans concurrence et sans yoyo d’accolade', async () => {
  const { compilerEnRelevant } = await import('./_cadre.js');
  const { finsDesAccolades } = await import('./_accolades.js');
  const op = PAR_CODE.get('mrn');
  const avant = nums([44, 15, 199]);
  const apres = appliquer(op, avant);
  const tokens = jetonsNums(avant.valeur);
  const steps = op.steps(avant, apres, { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' });
  const scenario = { version: 1, tokens, steps };

  for (const rythme of ['pasAPas', 'simultane']) {
    const tl = compile(scenario, { rythme });
    assert.deepEqual(tl.warnings, [], `${rythme} : ${tl.warnings.slice(0, 2).join(' | ')}`);
    const { tl: tl2, lignes } = compilerEnRelevant(scenario, { rythme });
    const fautes = finsDesAccolades(tl2, lignes).filter((f) => f.faute);
    assert.deepEqual(fautes.map((f) => `${f.id} : ${f.faute}`), [], `${rythme}`);
  }

  // Et l'arithmétique est la même des deux côtés : mêmes jetons, mêmes textes.
  const vus = (r) => compile(scenario, { rythme: r }).nodes.map((n) => `${n.id}=${n.text}`).sort();
  assert.deepEqual(vus('simultane'), vus('pasAPas'));
});

test('les phases de mrdE se raccordent en une frame de découpe et un seul mouvement bref', () => {
  const saisie = 'Didier Raoult';
  const sc = construireScenario(approcheSur(saisie, ['fmaj', 'tca', 'mas', 'mrdE']), { saisie });
  const fermetures = sc.steps.filter((s) => s.ops.some((o) => o.op === 'move' && o.sansReflow));
  assert.ok(fermetures.length >= 7, 'raccords entre niveaux, réductions et passes');
  const ref = compile(sc);
  const resultat = ref.scene.flow.map((id) => ref.scene.get(id).text);
  for (const rythme of ['pasAPas', 'simultane']) for (const speed of [1, 10]) {
    const tl = compile(sc, { rythme, speed });
    assert.deepEqual(tl.warnings, []);
    for (const fermeture of fermetures) {
      const i = sc.steps.indexOf(fermeture);
      let j = i + 1;
      while (sc.steps[j].ops.every((o) => o.op === 'substitute')) {
        const ecriture = tl.steps[j];
        assert.ok(ecriture.duration <= 16.01, `la découpe ${ecriture.id} réserve ${ecriture.duration} ms (${rythme}, x${speed})`);
        assert.equal(tl.anims.filter((a) => a.prop === 'translate' && a.delay >= ecriture.t0 && a.delay < ecriture.t1 && !a.id.startsWith('@')).length, 0,
          'les chiffres se séparent sur place sans redistribuer les voisins');
        j++;
      }
      const suivante = tl.steps[j];
      const debut = tl.steps[i].t1;
      const premiereAccolade = tl.anims.find((a) => a.prop === 'strokeDashoffset' && a.delay >= suivante.t0 && a.delay < suivante.t1);
      assert.ok(premiereAccolade, `la phase ${suivante.id} ${suivante.t0}-${suivante.t1} trace ses accolades (${rythme}, x${speed})`);
      assert.ok(premiereAccolade.delay - debut <= 16 + 150 / speed + 0.01,
        `${rythme} : ${premiereAccolade.delay - debut} ms avant l’accolade suivante`);
    }
    assert.deepEqual(tl.scene.flow.map((id) => tl.scene.get(id).text), resultat);
  }
});
