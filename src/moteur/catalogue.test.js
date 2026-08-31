/**
 * Le catalogue — grammaire des codes, **gel des codes publiés**, pureté.
 *
 * Le tableau `VECTEURS` est le test de non-régression exigé par CONTRACTS §4.1 :
 * un vecteur `code → entrée → sortie` par opérateur publié. Changer le
 * comportement d'un code casse ce test — et la règle est alors d'**allouer un
 * nouveau code** en dépréciant l'ancien, jamais de modifier celui-ci : les liens
 * partagés doivent continuer à rejouer la même démonstration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOGUE, PAR_CODE, PAR_ID, appliquer, appliquerProgramme, etapes, idsApres, derouler,
  rangCode, ORDRE_CANONIQUE, operateursActifs, operateursDepuis, JOKER, LANGUES,
} from './catalogue.js';
import { RE_CODE } from './transformations/commun.js';
import {
  depuisSaisie, tokens, nums, num, NUM_MIN, NUM_MAX, estEtat,
} from './etat.js';

const S = (v) => depuisSaisie(v);
const T = (v) => tokens(v, v.map((_, i) => [[i, i + 1]]));
const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
const U = (v) => num(v, [[0, 1]]);
const HOPE = ['h', 'o', 'p', 'e'];

/**
 * ★ Registre gelé — `code`, état d'entrée, valeur de sortie attendue.
 * Les valeurs des mappeurs sont celles de `research §2.3` / `§3.1`, à une
 * exception documentée près : `mexb` (extrémités bas de casse) rend `3` pour le
 * `h`, conformément à l'écart assumé de `tables/derivees.js`.
 */
const VECTEURS = [
  ['fp', S('https://hope.fr'), 'hope.fr'],
  ['fw', S('www.hope.fr'), 'hope.fr'],
  ['ftld', S('hope.fr'), 'hope'],
  ['fav', S('hope.fr/a/b'), 'hope.fr'],
  ['fap', S('hope.fr/a/b'), 'a/b'],
  // ★ Les trois découpes NOMMÉES, sur la même adresse que leurs aînées — c'est
  //   la comparaison qui les définit. `fav` rendrait ici « hope.fr » comme
  //   `fdom`, mais préfixez l'adresse de « https:// » et `fav` garde le
  //   protocole quand `fdom` le laisse : ils ne disent pas la même chose.
  ['fdom', S('https://hope.fr/a/b'), 'hope.fr'],
  ['fchm', S('hope.fr/a/b'), 'a'],
  ['fpag', S('hope.fr/a/b'), 'b'],
  ['fl', S('h0pe-2'), 'hpe'],
  ['fv', S('hope'), 'oe'],
  ['fvy', S('hopey'), 'oey'],
  ['fc', S('hope'), 'hp'],
  ['fd', S('hello'), 'helo'],
  // Les quatre cadets : même règle, autre rang du survivant. Sur « hello »,
  // le second « l » est en 4ᵉ position — au-delà, on prend le dernier.
  ['fd2', S('hello'), 'helo'],
  ['fd3', S('hello'), 'helo'],
  ['fd4', S('hello'), 'helo'],
  ['fd5', S('hello'), 'helo'],
  // Les deux « l » s'annulent l'un l'autre : il n'en reste aucun.
  ['fpr', S('hello'), 'heo'],
  ['fun', S('hello'), 'heo'],
  ['fr', S('hello'), 'll'],
  ['fi', S('le chat dort'), 'lcd'],
  ['fmr', S('hope-hope-hope'), 'hope'],
  // ★ « espérer », et pas « espoir ». Le dictionnaire n'est plus une liste
  //   écrite ici : il est extrait de FreeDict (`src/gfx/freedict-traduction.py`),
  //   et c'est FreeDict qui donne le verbe en première acception. Le gel note
  //   donc ce que la source dit, pas ce qui nous arrangerait — c'était tout
  //   l'intérêt d'aller chercher un dictionnaire dehors.
  ['ffr', S('hope'), 'espérer'],
  // Les acceptions suivantes du même mot : le verbe, son synonyme, le nom.
  ['ffr2', S('hope'), 'souhaiter'],
  ['ffr3', S('hope'), 'espérance'],
  ['ffr4', S('light'), 'lumineux'],
  ['ffr5', S('light'), 'lumière'],
  ['fen', S('espoir'), 'hope'],
  ['fen2', S('temps'), 'while'],
  ['fen3', S('temps'), 'weather'],
  ['fen4', S('abaisser'), 'lower'],
  ['fen5', S('abaisser'), 'abate'],

  ['fmaj', S('hope'), 'HOPE'],
  ['fmin', S('HOPE'), 'hope'],
  ['fac', S('créé'), 'cree'],
  ['flt', S('h0p3'), 'hope'],
  ['fatb', S('hope'), 'slkv'],
  ['fr13', S('hope'), 'ubcr'],
  // ★ Les vingt-quatre autres décalages, gelés comme le treizième. Les sorties
  //   sont calculées ici À LA MAIN — `hope` décalé de n — précisément pour
  //   qu'elles ne viennent pas de la même fonction que ce qu'elles vérifient.
  ['fr1', S('hope'), 'ipqf'],
  ['fr2', S('hope'), 'jqrg'],
  ['fr3', S('hope'), 'krsh'],
  ['fr4', S('hope'), 'lsti'],
  ['fr5', S('hope'), 'mtuj'],
  ['fr6', S('hope'), 'nuvk'],
  ['fr7', S('hope'), 'ovwl'],
  ['fr8', S('hope'), 'pwxm'],
  ['fr9', S('hope'), 'qxyn'],
  ['fr10', S('hope'), 'ryzo'],
  ['fr11', S('hope'), 'szap'],
  ['fr12', S('hope'), 'tabq'],
  ['fr14', S('hope'), 'vcds'],
  ['fr15', S('hope'), 'wdet'],
  ['fr16', S('hope'), 'xefu'],
  ['fr17', S('hope'), 'yfgv'],
  ['fr18', S('hope'), 'zghw'],
  ['fr19', S('hope'), 'ahix'],
  ['fr20', S('hope'), 'bijy'],
  ['fr21', S('hope'), 'cjkz'],
  ['fr22', S('hope'), 'dkla'],
  ['fr23', S('hope'), 'elmb'],
  ['fr24', S('hope'), 'fmnc'],
  ['fr25', S('hope'), 'gnod'],
  ['tca', S('hope'), ['h', 'o', 'p', 'e']],
  ['tm', S('a-b.c'), ['a', 'b', 'c']],
  ['tsp', S('a-b.c'), ['-', '.']],
  ['tsy', S('espoir'), ['es', 'poir']],
  ['tch', U(44), [4, 4]],
  ['nl', S('hope'), 4],
  ['nv', S('hope'), 2],
  ['nc', S('hope'), 2],
  ['nd', S('hello'), 4],
  ['nsp', S('a-b.c'), 2],
  ['nm', S('a-b.c'), 3],
  ['nlv', S('hope'), 6],
  ['nlc', S('hope'), 6],
  ['ma1', T(HOPE), [8, 15, 16, 5]],
  ['mz26', T(HOPE), [19, 12, 11, 22]],
  ['mpy', T(HOPE), [8, 6, 7, 5]],
  ['mch', T(HOPE), [5, 7, 8, 5]],
  ['mx6', T(HOPE), [48, 90, 96, 30]],
  ['msfr', T(HOPE), [4, 1, 3, 1]],
  ['msen', T(HOPE), [4, 1, 3, 1]],
  ['mt9', T(HOPE), [4, 6, 7, 3]],
  ['mms', T(HOPE), [4, 3, 4, 1]],
  ['mmt', T(HOPE), [0, 3, 2, 0]],
  ['masc', T(HOPE), [72, 79, 80, 69]],
  ['masb', T(HOPE), [104, 111, 112, 101]],
  ['m7', T(HOPE), [5, 6, 5, 5]],
  ['m7F', T(HOPE), [3, 4, 4, 4]],
  ['mtrc', T(HOPE), [3, 1, 2, 4]],
  ['mtrb', T(HOPE), [2, 1, 2, 2]],
  ['mexc', T(HOPE), [4, 0, 1, 3]],
  ['mexb', T(HOPE), [3, 0, 1, 1]],
  ['mboc', T(HOPE), [0, 1, 1, 0]],
  ['mbob', T(HOPE), [0, 1, 1, 1]],
  ['mazc', T(HOPE), [6, 9, 10, 3]],
  ['mazr', T(HOPE), [2, 1, 1, 1]],
  ['mqwc', T(HOPE), [6, 9, 10, 3]],
  ['mqwr', T(HOPE), [2, 1, 1, 1]],
  // ★ Les mêmes touches, comptées depuis la rangée des CHIFFRES : chaque valeur
  //   monte d'exactement un cran. C'est le contrôle qui dit que les deux
  //   conventions mesurent bien la même chose — et donc qu'elles ne peuvent pas
  //   cohabiter dans une voie (`recherche/bfs.js › conventionContraire`).
  ['maz4', T(HOPE), [3, 2, 2, 2]],
  ['mqw4', T(HOPE), [3, 2, 2, 2]],
  ['mhe', T(HOPE), [8, 70, 80, 5]],
  ['mgr', T(HOPE), [8, 70, 80, 5]],
  ['mln', T(HOPE), [5, 1, 2, 1]],
  ['mlm', T(['hope', 'fr']), [4, 2]],
  ['mrn', N([44, 15]), [8, 6]],
  ['m0', N([8, 0, 15]), [8, 15]],
  // ★ « le tiret du 6 » : les deux séparateurs de hope-hope-hope valent 6 et 6.
  ['mtc', T(['-', '-']), [6, 6]],
  // ★ Quatorze segments. `HOPE` y vaut 6·6·6·6 — sept lettres valent 6 segments
  // (`D E G H N O P`) contre deux en sept segments. Les traits fusionnés, eux,
  // retombent sur 3·4·4·4, le vecteur même de la méthode 5 du README : deux
  // afficheurs, deux dessins, un seul compte.
  ['m14', T(HOPE), [6, 6, 6, 6]],
  ['m14F', T(HOPE), [3, 4, 4, 4]],
  // ★ « On retourne les 9 » — le pendant vectoriel de `pr9`. Les 9 deviennent
  // des 6, tout le reste est laissé strictement en place, y compris le −9 :
  // un demi-tour ne sait rien faire d'un signe.
  ['mr9', N([3, 9, 6, -9]), [3, 6, 6, -9]],
  // ★ « Trois 6 d'affilée » — le 666 est DÉJÀ écrit dans le vecteur, contigu ;
  // on le garde et l'on efface le reste. Ce n'est pas un tri : trois 6 dispersés
  // ne conviennent pas (voir le test dédié plus bas).
  ['m36', N([6, 6, 6, 7, 3, 6]), [6, 6, 6]],
  // ★ LES TROIS FICELLES ASSUMÉES — codes neufs, alloués le registre FERMÉ
  // (CONTRACTS §4.1), aux trois rangs qui suivent `m36`. Les trois vecteurs
  // sont EXACTEMENT les cas que l'auteur a
  // nommés dans sa demande, et c'est délibéré : ce qui est gelé ici, c'est ce
  // qu'il a demandé, pas ce que l'implémentation a trouvé commode.
  //
  // « Le plus fréquent l'emporte » : sur `[6,4,6,6,6]`, le 4 s'en va.
  ['mpf', N([6, 4, 6, 6, 6]), [6, 6, 6, 6]],
  // « Garder un caractère sur deux » : sur `[4,6,4,6,4,6,4]`, c'est la parité
  // des rangs PAIRS (2ᵉ, 4ᵉ, 6ᵉ) qui porte les trois 6, et c'est elle qui reste.
  ['m1s2', N([4, 6, 4, 6, 4, 6, 4]), [6, 6, 6]],
  // « L'addition sélective » : `6, 5, 16, 8` → `6, 5+1, 6, 8` → `666, 8`.
  ['mad', N([6, 5, 16, 8]), [6, 6, 6, 8]],
  // ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT — codes neufs, alloués la clôture
  // du registre LEVÉE (CONTRACTS §4.1, amendement du 27 août 2026 : aucun lien
  // n'avait été diffusé), aux quatre rangs qui suivent `mad`.
  // Les vecteurs sont, mot pour mot, les exemples chiffrés de l'auteur.
  //
  // « Tri croissant » : `95956636494` → `34455666999` — trois 6 qui étaient
  // dispersés deviennent contigus, sans que rien ne soit écarté.
  ['mtal', T(['M', 'a', 'c', 'r', 'o', 'n']), ['a', 'c', 'M', 'n', 'o', 'r']],
  ['meg', N([8, 15, 16, 5]), [11, 11, 11, 11]],
  ['mtri', N([9, 5, 9, 5, 6, 6, 3, 6, 4, 9, 4]), [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]],
  // « On retourne les 666 qui se cachent » : par TRIO contigu, jamais un par
  // un. Quatre 9 d'affilée n'en donnent que trois ; les 9 isolés ne bougent pas.
  ['mr39', N([9, 9, 9, 9, 3, 9]), [6, 6, 6, 9, 3, 9]],
  // « On compte les chiffres » : `34455666999` → `1324253639` — un 3, deux 4,
  // deux 5, trois 6, trois 9.
  ['mcc', N([3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]), [1, 3, 2, 4, 2, 5, 3, 6, 3, 9]],
  // « Le redécoupage tricheur » : LES TRENTE CHIFFRES DE L'AUTEUR, pris tels
  // qu'il les écrit, et la sortie qu'il a lui-même calculée à la main —
  // `999991691662692`. Coupe pour coupe : `999 7+1+1 2+1+0+5+1 1 6 9 7+1+0+8
  // 1+0+5 1+1 5+1+0 9 1+0+1`.
  //
  // Le vecteur gèle donc les deux règles qui ont corrigé le calcul : un 9 vaut
  // un 6 acquis (`mr9` le retournera), donc il ne s'absorbe pas et un paquet
  // qui tombe dessus compte ; et la somme d'un paquet s'écrit TELLE QU'ELLE
  // TOMBE — `7+1+0+8 = 16` rend « 1 6 » et non « 7 », qui perdrait le 6 qu'on
  // venait de fabriquer.
  // (Et il gèle la borne basse : `mrd` refuse en deçà de vingt-cinq chiffres.)
  ['mrd', N('9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number)),
    [9, 9, 9, 9, 9, 1, 6, 9, 1, 6, 6, 2, 6, 9, 2]],
  ['cs', N([8, 15, 16, 5]), 44],
  ['cst', N([8, 15, 16, 5]), -28],
  ['cp', N([8, 15, 16, 5]), 9600],
  ['cal', N([8, 15, 16, 5]), 4],
  ['cmm', N([8, 15, 16, 5]), 11],
  ['cmo', N([8, 15, 16, 5]), 11],
  ['cmod', N([8, 15, 16, 5]), 11],
  ['cnv', N([8, 15, 16, 5]), 4],
  ['ccat', N([8, 15, 16, 5]), 815165],
  ['cmx', N([8, 15, 16, 5]), 16],
  ['cmn', N([8, 15, 16, 5]), 5],
  ['cnj', T(HOPE), 4],
  ['cnjd', T(['a', 'a', 'b']), 2],
  ['prn', U(44), 8],
  ['psc', U(44), 8],
  ['pabs', U(-28), 28],
  ['prs', U(-28), 6],
  ['pec', U(28), 6],
  ['pmr', U(28), 82],
  ['pc9', U(3), 6],
  ['pm9', U(44), 8],
  ['pr9', U(9), 6],
  ['prm', U(29), 11],
  ['pm10', U(44), 4],
  ['jnf', U(4), 6],
];

/**
 * ★ Gestes dédiés du vocabulaire fermé (CONTRACTS §0.3 / §3.1).
 *
 * Ces méthodes comptent quelque chose de VISIBLE : le spectateur doit voir
 * l'afficheur s'allumer, ou le glyphe se redessiner trait par trait. Retomber
 * sur une substitution commentée serait une régression silencieuse — la
 * démonstration continuerait de « marcher », mais elle cesserait de prouver.
 */
const PRIMITIVE_ATTENDUE = Object.freeze({
  ma1: 'table', mz26: 'table', mpy: 'table', mch: 'table', mx6: 'table',
  msfr: 'table', msen: 'table', mt9: 'table', mms: 'table', mmt: 'table',
  masc: 'table', masb: 'table', mhe: 'table', mgr: 'table', mln: 'table',
  m7: 'sevenSeg', m7F: 'sevenSeg',
  m14: 'fourteenSeg', m14F: 'fourteenSeg',
  mtrc: 'countStrokes', mtrb: 'countStrokes', mexc: 'countStrokes',
  mexb: 'countStrokes', mboc: 'countStrokes', mbob: 'countStrokes',
  mazc: 'keyboard', mazr: 'keyboard', mqwc: 'keyboard', mqwr: 'keyboard',
  mtc: 'keyboard',
  // ★ `m36` n'émet plus `horns`. Les cornes ne sont plus le geste d'un
  //   OPÉRATEUR — elles ne changent aucune valeur, elles n'ont donc rien à
  //   faire dans un programme ni dans une URL —, et l'assemblage les pose
  //   désormais sur la ligne, en registre scénique
  //   (`recherche/scenario.js › couronnerLesTriptyques`). Ce qui reste ici est
  //   la seule moitié qui soit de l'arithmétique : la gomme qui tronque le
  //   vecteur à ses trois 6 contigus.
  m36: 'drop',
  // ★ Le tri croissant ne substitue rien et n'efface rien : il DÉPLACE. Le
  //   geste dédié est donc `move`, la primitive du réarrangement — sans elle,
  //   le rangement serait affirmé par une légende au lieu d'être montré.
  mtri: 'move',
  //   Le redécoupage tricheur doit montrer sa DÉCISION, c'est-à-dire la
  //   découpe : `partition` trace une accolade par paquet avant que la moindre
  //   addition ne soit faite. Une triche qu'on cache est pire qu'une triche
  //   qu'on n'implémente pas (CONTRACTS §4.1, amendement des trois ficelles).
  mrd: 'partition',
});

/**
 * Le vocabulaire fermé des ops — CONTRACTS §3.1, vingt et une primitives, pas
 * une de plus. Le socle de dix-sept, plus `partition` (découper en
 * sous-groupes), `table` (la table de correspondance affichée — réglette,
 * glissière ou pavé), `fourteenSeg` (l'afficheur quatorze segments) et `horns`
 * (les cornes du 666 déjà formé), ajoutées selon la clause d'extension du
 * contrat.
 */
const OPS_AUTORISEES = new Set([
  'highlight', 'dim', 'drop', 'substitute', 'move', 'group', 'insertOperators',
  'sum', 'reduce', 'flip180', 'sevenSeg', 'fourteenSeg', 'countStrokes', 'keyboard',
  'annotate', 'pulse', 'reveal', 'wait', 'partition', 'table', 'horns', 'merge', 'shift', 'collapse', 'fraction',
]);

test('grammaire, unicité et ordre du registre (CONTRACTS §4.1)', () => {
  const vus = new Set();
  let precedent = 0;
  for (const op of CATALOGUE) {
    assert.match(op.code, RE_CODE, `code hors grammaire : ${op.code}`);
    assert.ok(!vus.has(op.code), `code dupliqué : ${op.code}`);
    vus.add(op.code);
    const r = rangCode(op.code);
    assert.ok(r !== null && r > precedent, `ordre de déclaration rompu en ${op.code}`);
    precedent = r;
  }
  assert.equal(vus.size, CATALOGUE.length, 'cent codes, cent opérateurs');
  assert.equal(rangCode('z1'), null, 'préfixe de famille inconnu');
  assert.equal(rangCode('mzz'), null, 'code de bonne grammaire mais jamais alloué');
  assert.equal(rangCode('m14f'), null, 'la casse compte : « m14f » n’est pas « m14F »');
  assert.equal(rangCode('M14F'), null, 'la lettre de famille est en bas de casse');
  assert.equal(rangCode('m14FF'), null, 'une seule majuscule de variante, et en fin de code');
});

/**
 * ★ **L'unicité des codes est EXIGÉE, pas relue.** Le test ci-dessus la vérifie
 * sur le catalogue tel qu'il est ; celui-ci la vérifie sur le REGISTRE, qui est
 * la liste où un code neuf s'écrit. Les deux sont nécessaires : un doublon
 * inscrit au registre sans opérateur derrière ne se verrait nulle part ailleurs,
 * et c'est précisément la faute qu'un renommage de masse peut commettre.
 *
 * ★ Et il vérifie la longueur, parce que c'est une consigne de l'auteur et non
 * un goût : « 2, 3 ou 4 caractères, évite d'aller au-delà ». Un code plus long
 * qu'une portée (`0.1:`) cesse d'être une abréviation.
 */
// ★ Le titre disait « cent » ; ils sont cent vingt-cinq depuis que les
//   vingt-quatre décalages de César ont rejoint le treizième
//   (`transformations/filtres.js › CESARS`). Le compte exact vit dans
//   l'assertion, pas dans le titre — c'est elle qui doit rougir, pas lui.
test('le registre : des codes distincts, de deux à quatre signes (CONTRACTS §4.1)', () => {
  assert.equal(ORDRE_CANONIQUE.length, 146);
  assert.equal(new Set(ORDRE_CANONIQUE).size, 146, 'aucun code alloué deux fois');
  assert.deepEqual(ORDRE_CANONIQUE, CATALOGUE.map((o) => o.code),
    'le registre et l’ordre de déclaration disent la même chose');
  for (const code of ORDRE_CANONIQUE) {
    assert.match(code, RE_CODE, `code hors grammaire : ${code}`);
    assert.ok(code.length >= 2 && code.length <= 4, `${code} : ${code.length} signes, hors de [2,4]`);
  }
  // Deux codes qui ne diffèrent que par la casse seraient deux pièges : l'un
  // pour l'œil, l'autre pour toute lecture d'URL un jour rendue tolérante.
  const replies = ORDRE_CANONIQUE.map((c) => c.toLowerCase());
  assert.equal(new Set(replies).size, 146, 'deux codes ne diffèrent jamais par la seule casse');
});

test('le code p9 est réservé au retournement du 9', () => {
  const op = PAR_CODE.get('pr9');
  assert.equal(op.id, 'p.retournement');
  assert.equal(appliquer(op, U(9)).valeur, 6);
  assert.equal(appliquer(op, U(6)), null, 'on ne retourne pas le 6');
});

/**
 * ★ `m36` — « trois 6 d'affilée » est une TROUVAILLE, pas un tri.
 *
 * Toute la valeur de cet opérateur tient dans ce qu'il REFUSE. S'il acceptait
 * des 6 non contigus, il cesserait d'être « le 666 était déjà écrit » pour
 * devenir « on ne garde que les 6 » — une étape que la doctrine du projet
 * réserve à l'avant-dernier rang et fait payer au score (CONTRACTS §3.1). Ces
 * refus sont donc le cœur du contrat, pas des cas limites.
 */
test('★ le code mz ne trouve que trois 6 CONTIGUS, et refuse tout le reste', () => {
  const op = PAR_CODE.get('m36');
  assert.equal(op.id, 'm.troisSixDAffilee');
  assert.equal(op.from, 'NUMS');
  assert.equal(op.to, 'NUMS');

  const sortie = (v) => { const r = appliquer(op, N(v)); return r && r.valeur; };

  // Ce qu'il trouve : une suite de trois, où qu'elle commence.
  assert.deepEqual(sortie([6, 6, 6, 7, 3, 6]), [6, 6, 6], 'Donald en quatorze segments');
  assert.deepEqual(sortie([6, 6, 6, 4, 4]), [6, 6, 6], 'Trump en César puis quatorze segments');
  assert.deepEqual(sortie([1, 6, 6, 6, 1]), [6, 6, 6], 'la suite peut être au milieu');

  // Ce qu'il refuse, et c'est le point : des 6 SÉPARÉS, même nombreux.
  assert.equal(sortie([6, 6, 7, 6]), null, 'trois 6 dont deux voisins ne font pas un 666');
  assert.equal(sortie([6, 1, 6, 1, 6, 1, 6]), null, 'quatre 6 dispersés : toujours pas');
  assert.equal(sortie([6, 6]), null, 'deux 6 ne font pas trois');
  assert.equal(sortie([6, 6, 7, 6, 6]), null, 'deux paires ne font pas un triplet');

  // Et il refuse aussi de ne rien faire : sans reste à effacer, l'étape
  // n'aurait rien à montrer, et l'URL porterait un code invisible à l'écran.
  assert.equal(sortie([6, 6, 6]), null, 'un vecteur déjà réduit n’a pas besoin de l’être');

  // Déterminisme : plusieurs suites, on prend LA PREMIÈRE — lire, pas comparer.
  // Les traces le prouvent mieux que les valeurs, qui sont identiques.
  const r = appliquer(op, N([7, 6, 6, 6, 1, 6, 6, 6]));
  assert.deepEqual(r.valeur, [6, 6, 6]);
  assert.deepEqual(r.origines.map((t) => t[0][0]), [1, 2, 3], 'la première suite, pas la seconde');

  // Une suite plus longue est ramenée à trois : 666 fait trois 6, pas quatre,
  // et le verdict se refuse à décider lui-même où couper (`reveal.js`).
  assert.deepEqual(sortie([6, 6, 6, 6]), [6, 6, 6]);
});

/**
 * ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT — et ce que chacune REFUSE.
 *
 * Comme pour `m36`, la valeur de ces opérateurs tient d'abord dans leurs refus :
 * un mappeur qui rend son entrée, ou qui s'applique sans rien acheter, fabrique
 * une étape que `scenario.js` saute EN SILENCE — et l'URL porte alors un code
 * que la démonstration ne montre nulle part. Chaque refus ci-dessous ferme une
 * de ces portes, et les exemples chiffrés sont ceux de l'auteur.
 */
test('★ les quatre transformations du 27 août — ce qu’elles font, et ce qu’elles refusent', () => {
  const sortie = (code, v) => {
    const r = appliquer(PAR_CODE.get(code), N(v));
    return r && r.valeur;
  };

  // ── m13, « Tri croissant » ────────────────────────────────────────────────
  // L'exemple de l'auteur, mot pour mot : trois 6 dispersés deviennent contigus.
  assert.deepEqual(sortie('mtri', [9, 5, 9, 5, 6, 6, 3, 6, 4, 9, 4]),
    [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9], 'l’exemple de l’auteur');
  // Un vecteur déjà rangé n'a rien à montrer.
  assert.equal(sortie('mtri', [1, 2, 3]), null, 'déjà croissant : rien à déplacer');
  // ★ Et surtout : le tri doit RASSEMBLER. Il ne se joue pas pour promener des
  //   valeurs qui ne se rejoignent pas — c'est ce que l'auteur lui demande,
  //   « faire apparaître 666 contigu », et rien d'autre.
  assert.equal(sortie('mtri', [3, 1, 2]), null,
    'trois valeurs distinctes : ranger ne réunit personne');
  assert.equal(sortie('mtri', [6, 6, 6, 4, 1]), null,
    'la plage de trois existe DÉJÀ : c’est le travail de mz, pas celui du tri');
  assert.deepEqual(sortie('mtri', [6, 4, 6, 1, 6]), [1, 4, 6, 6, 6],
    'trois 6 dispersés, réunis — et le départage à valeur égale suit l’ordre de lecture');

  // ── m14, « On retourne les 666 qui se cachent » ───────────────────────────
  // Par TRIO contigu, jamais un par un : c'est ce qui le sépare de `mr9`.
  assert.deepEqual(sortie('mr39', [9, 9, 9, 9, 3, 9]), [6, 6, 6, 9, 3, 9],
    'trois d’un bloc ; le quatrième et l’esseulé ne bougent pas');
  assert.deepEqual(sortie('mr39', [9, 9, 9, 9, 9, 9]), [6, 6, 6, 6, 6, 6],
    'six 9 d’affilée font deux trios');
  assert.equal(sortie('mr39', [9, 3, 9, 3, 9]), null,
    'trois 9 dispersés ne sont pas un 999 : c’est `mr9` qui les prendrait, pas celui-ci');
  assert.equal(sortie('mr39', [9, 9]), null, 'deux 9 ne font pas un trio');
  // ★ Aucune corne n'est émise ici : c'est `couronnerLesTriptyques`
  //   (`src/recherche/scenario.js`) qui couronne, parce que lui seul sait si le
  //   trio arrivera au verdict — et si la cible est bien 666.
  const stepsTrio = etapes(PAR_CODE.get('mr39'), N([9, 9, 9]), N([6, 6, 6]),
    { ids: ['a', 'b', 'c'], cle: 'e1', langue: 'fr' });
  assert.ok(!stepsTrio.flatMap((s) => s.ops).some((o) => o.op === 'horns'),
    'un opérateur ne couronne pas à l’aveugle : il ne sait pas ce que la suite fera de ses 6');

  // ── m15, « On compte les chiffres » ───────────────────────────────────────
  // L'exemple de l'auteur : un 3, deux 4, deux 5, trois 6, trois 9.
  assert.deepEqual(sortie('mcc', [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]),
    [1, 3, 2, 4, 2, 5, 3, 6, 3, 9], 'l’exemple de l’auteur');
  // ★ Des PLAGES CONTIGUËS, pas un relevé par valeur : `6 4 6` fait trois
  //   plages, pas deux valeurs. Ici, le décompte n'y gagne rien — il est refusé.
  assert.equal(sortie('mcc', [6, 4, 6]), null,
    'trois plages d’un signe : compter écrirait six signes pour trois, ce n’est pas compter');
  assert.deepEqual(sortie('mcc', [6, 6, 6, 6]), [4, 6], 'une plage de quatre se dit « 4 6 »');
  assert.equal(sortie('mcc', [1, 2, 3]), null, 'rien à condenser');

  // ── m16, « Le redécoupage tricheur » ──────────────────────────────────────
  // Un DERNIER RECOURS : il refuse tant que la ligne n'est pas devenue longue.
  assert.equal(sortie('mrd', [1, 2, 3, 6, 4, 2]), null,
    'six chiffres : la ligne se lit encore, il n’y a rien à redécouper');
  const longue = '9 9 9 7 1 1 2 1 0 5 1 1 6 9 7 1 0 8 1 0 5 1 1 5 1 0 9 1 0 1'.split(' ').map(Number);
  const paquets = sortie('mrd', longue);
  assert.equal(paquets.join(''), '999991691662692',
    'les trente chiffres de l’auteur, et la sortie qu’il a calculée à la main');
  // ★ Il ACHÈTE des 6-ou-9, sinon il ne se joue pas : onze contre six au départ.
  const gagnants = (vs) => vs.filter((v) => v === 6 || v === 9).length;
  assert.equal(gagnants(longue), 6);
  assert.equal(gagnants(paquets), 11);
  // ★ **Un 9 n’est jamais absorbé, pas plus qu’un 6** : les trois 9 de tête, le
  //   6 du milieu et les deux 9 isolés se retrouvent intacts et à leur place.
  assert.deepEqual(paquets.slice(0, 3), [9, 9, 9], 'les trois 9 de tête restent seuls');
  // ★ Et une somme qui dépasse neuf s’écrit chiffre à chiffre, sans être
  //   réduite : `7+1+0+8 = 16` rend « 1 6 » — c’est de là que vient le 6 du
  //   rang 8, et le réduire à 7 le ferait disparaître.
  assert.deepEqual(paquets.slice(8, 10), [1, 6], 'la somme 16 s’écrit « 1 6 »');
  const tailles = PAR_CODE.get('mrd').additions(longue);
  assert.ok(tailles.length > 0 && tailles.every((t) => t >= 2),
    'les additions déclarées portent toutes au moins deux termes');
  // Rien à acheter : une ligne longue mais qui ne gagne rien est refusée.
  assert.equal(sortie('mrd', new Array(30).fill(6)), null,
    'trente 6 : chacun reste seul, rien n’est gagné, la triche ne se joue pas');
  assert.equal(sortie('mrd', new Array(30).fill(9)), null,
    'trente 9 : même refus, et c’est ce que la règle des 9 implique');
  // ★ Et la suite que l’auteur en tire se rejoue telle quelle : `mr9` retourne
  //   les 9 et la ligne écrit `666661661662662`.
  assert.equal(appliquerProgramme(['mrd', 'mr9'], N(longue)).valeur.join(''),
    '666661661662662', 'la suite de l’auteur, un cran plus loin');
});

test('★ gel des codes publiés : chaque code rend exactement la même sortie', () => {
  assert.equal(VECTEURS.length, CATALOGUE.length, 'un vecteur par opérateur publié');
  const couverts = new Set(VECTEURS.map(([c]) => c));
  for (const op of CATALOGUE) assert.ok(couverts.has(op.code), `pas de vecteur pour ${op.code}`);
  for (const [code, entree, attendu] of VECTEURS) {
    const op = PAR_CODE.get(code);
    assert.ok(op, `code inconnu : ${code}`);
    const sortie = appliquer(op, entree);
    assert.ok(sortie !== null, `${code} (${op.id}) : rendu null au lieu de ${JSON.stringify(attendu)}`);
    assert.deepEqual(sortie.valeur, attendu, `${code} (${op.id})`);
    assert.equal(sortie.type, op.to);
  }
});

test('métadonnées de classement complètes (heuristique §7.2)', () => {
  for (const op of CATALOGUE) {
    assert.ok(op.notoriete >= 0 && op.notoriete <= 1, op.id);
    assert.ok(op.adHoc >= 0 && op.adHoc <= 1, op.id);
    assert.equal(typeof op.commute, 'boolean');
    for (const langue of LANGUES) {
      assert.ok(op.libelle[langue].length > 3 && op.regle[langue].length > 3, `${op.id} (${langue})`);
    }
    assert.ok(Object.isFrozen(op), `${op.id} n'est pas gelé`);
  }
});

test('pureté : deux applications identiques, aucune mutation de l’entrée', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const avant = JSON.stringify(entree);
    const a = appliquer(op, entree);
    const b = appliquer(op, entree);
    assert.equal(JSON.stringify(entree), avant, `${code} a muté son entrée`);
    assert.deepEqual(a && a.valeur, b && b.valeur, `${code} n'est pas déterministe`);
    assert.deepEqual(a && a.traces, b && b.traces, `${code} : traces instables`);
  }
});

test('aucune exception, jamais : « null » est le seul signal d’échec', () => {
  const pieges = [
    depuisSaisie(''), depuisSaisie('666'), depuisSaisie('!!!'), depuisSaisie('   '),
    depuisSaisie('a'), depuisSaisie('🙂🙃'), depuisSaisie('ÉCOLE'), depuisSaisie('a'.repeat(500)),
    tokens([], []), tokens(['']), T(['hope']), T(['4', '2']),
    nums([], []), N([0]), N([-3, 0, 999999]),
    num(0), num(-999999), num(1000000), num(9),
  ];
  for (const op of CATALOGUE) {
    for (const e of pieges) {
      if (!e) continue;
      const r = appliquer(op, e);
      assert.ok(r === null || estEtat(r), `${op.id} : sortie invalide`);
      if (r && r.type === 'NUM') {
        assert.ok(r.valeur >= NUM_MIN && r.valeur <= NUM_MAX, `${op.id} : NUM hors bornes`);
      }
      if (r && r.type === 'NUMS') {
        for (const v of r.valeur) assert.ok(v >= NUM_MIN && v <= NUM_MAX, `${op.id} : NUMS hors bornes`);
      }
    }
  }
});

test('bornes : un NUM hors de [-10⁶, 10⁶] fait retourner null', () => {
  const grand = nums([999999, 999999], [[[0, 1]], [[1, 2]]]);
  assert.equal(appliquer(PAR_CODE.get('cs'), grand), null, 'somme hors bornes');
  assert.equal(appliquer(PAR_CODE.get('cp'), grand), null, 'produit hors bornes');
  assert.equal(num(1e6 + 1), null);
  assert.equal(num(-1e6 - 1), null);
  assert.equal(num(1e6).valeur, 1e6);
});

test('les traces remontent jusqu’à la saisie d’origine', () => {
  const r = derouler(['ftld', 'fmr', 'tca', 'ma1', 'cs', 'prn'], S('hope-hope-hope.fr'));
  assert.ok(r);
  assert.equal(r.etat.valeur, 8);
  assert.deepEqual(r.etat.traces, [[0, 4]], 'le 8 vient des quatre premiers caractères');
  const tokensEtape = r.etapes[2].apres;
  assert.deepEqual(tokensEtape.origines, [[[0, 1]], [[1, 2]], [[2, 3]], [[3, 4]]]);
  for (const et of r.etapes) {
    assert.ok(Array.isArray(et.apres.traces) && et.apres.traces.length > 0, `${et.code} sans trace`);
  }
});

test('les couvertures désignent bien ce qui est consommé', () => {
  assert.deepEqual(PAR_CODE.get('fp').couverture('https://hope.fr'), [[0, 8]]);
  assert.deepEqual(PAR_CODE.get('fw').couverture('www.hope.fr'), [[0, 4]]);
  assert.deepEqual(PAR_CODE.get('ftld').couverture('hope.fr'), [[4, 7]]);
  assert.deepEqual(PAR_CODE.get('fmr').couverture('hope-hope-hope'), [[0, 4], [5, 9], [10, 14]]);
});

/**
 * ★ LES TROIS FICELLES SE MONTRENT — `mpf`, `m1s2`, `mad`.
 *
 * Ce sont des astuces assumées, et l'auteur a dit exactement comment elles
 * doivent paraître. Une régression silencieuse vers le rendu générique
 * (`scenario.js` retombe dessus sans rien casser) leur ferait AFFIRMER ce
 * qu'elles doivent MONTRER — c'est la doctrine §0.3, et c'est ici qu'on la gèle.
 *
 *  · `mpf` — « indique sous l'accolade : "chiffre majoritaire : 6" et fais
 *    disparaître les autres » ; l'accolade embrasse la ligne ENTIÈRE, puisque
 *    c'est sur elle entière qu'on a compté ;
 *  · `m1s2` — « l'astuce est de nommer "position paire" ou "position impaire"
 *    pour justifier de supprimer l'autre » : le nom est écrit, la parité aussi ;
 *  · `mad` — « ne pas la différencier des additions qui la précèdent ou la
 *    succèdent » : des `+` ordinaires, entre les seuls termes retenus, et un
 *    `sum` qui recoupe la somme. Les 6 déjà là ne sont jamais des opérandes.
 */
test('★ les trois ficelles se MONTRENT — accolade nommée, additions ordinaires', () => {
  const geste = (code, entree) => {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    assert.ok(apres, `${code} : l'opérateur doit s'appliquer au vecteur du gel`);
    const ctx = { ids: entree.valeur.map((_, i) => `t${i}`), cle: 'e0' };
    return { op, entree, apres, ctx, steps: etapes(op, entree, apres, ctx) };
  };

  // ── m10 : l'accolade dit le verdict, puis les minoritaires tombent
  {
    const { entree, ctx, steps } = geste('mpf', N([6, 4, 6, 6, 6]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.ok(acc, 'm10 : pas d’accolade — le verdict serait affirmé sans être posé');
    assert.equal(acc.label, 'chiffre majoritaire : 6',
      'm10 : l’accolade doit nommer le chiffre majoritaire, et le bon');
    assert.deepEqual(acc.targets, ctx.ids,
      'm10 : on a compté sur la ligne ENTIÈRE, l’accolade doit l’embrasser entière');
    const chute = ops.find((o) => o.op === 'drop');
    assert.deepEqual(chute.targets, ['t1'], 'm10 : seul le 4 minoritaire tombe');
    assert.ok(steps[0].caption.includes('6 ×4'),
      'm10 : le Registre doit porter le relevé, pour qu’on refasse le compte');
    // ★ L'étiquette est DÉRIVÉE du vecteur, jamais écrite en dur : elle sort du
    //   même relevé qu'`apply()`. Et quand le plus fréquent n'est pas un 6,
    //   l'opérateur ne le remplace pas par un 6 — il REFUSE de s'appliquer
    //   (`elegance.test.js`, « à égalité, la règle refuse au lieu de choisir »).
    assert.equal(appliquer(PAR_CODE.get('mpf'), N([4, 6, 4, 4, 4])), null,
      'm10 : une majorité de 4 n’écrit pas 666 — on renonce, on ne truque pas');
    assert.equal(entree.valeur.length, 5);
  }

  // ── m11 : la parité est NOMMÉE, franchement
  {
    const { ctx, steps } = geste('m1s2', N([4, 6, 4, 6, 4, 6, 4]));
    const ops = steps.flatMap((s) => s.ops);
    const acc = ops.find((o) => o.op === 'group');
    assert.equal(acc.label, 'on ne garde que les positions paires',
      'm11 : la parité retenue doit être nommée — c’est TOUTE l’astuce');
    assert.deepEqual(ops.find((o) => o.op === 'drop').targets, ['t0', 't2', 't4', 't6'],
      'm11 : les positions impaires tombent, et elles seules');
    assert.deepEqual(ops.find((o) => o.op === 'highlight').targets, ['t1', 't3', 't5']);
    assert.ok(steps[0].caption.includes('positions impaires : 0 six'),
      'm11 : le Registre doit donner le relevé des DEUX parités');
    assert.equal(ctx.ids.length, 7);
  }

  // ── m12 : des additions ordinaires, sur les seuls termes retenus
  {
    const { steps } = geste('mad', N([6, 5, 16, 8]));
    const ops = steps.flatMap((s) => s.ops);
    // 1. `16` s'écrit chiffre à chiffre, sinon « 5+1 » n'a pas de « 1 »
    const eclat = ops.find((o) => o.op === 'substitute');
    assert.ok(eclat, 'm12 : `16` doit être écrit chiffre à chiffre avant qu’on additionne');
    assert.deepEqual(eclat.pairs[0].to.map((t) => t.text), ['1', '6']);
    // 2. les `+` ne paraissent qu'entre les termes retenus
    const signes = ops.filter((o) => o.op === 'insertOperators');
    assert.equal(signes.length, 1, 'm12 : une seule addition sur ce vecteur');
    assert.equal(signes[0].between.length, 2, 'm12 : `5+1` porte sur DEUX termes');
    assert.equal(signes[0].glyph, '+');
    // 3. la somme est recoupée par la primitive elle-même
    const somme = ops.find((o) => o.op === 'sum');
    assert.equal(somme.to.text, '6', 'm12 : ce qui descend sous la pointe est le 6 obtenu');
    assert.deepEqual(somme.targets, signes[0].between,
      'm12 : on additionne exactement les termes entre lesquels le + est paru');
  }
});

test('steps : vocabulaire fermé, JSON pur, identifiants nommés par l’émetteur', () => {
  for (const [code, entree] of VECTEURS) {
    const op = PAR_CODE.get(code);
    const apres = appliquer(op, entree);
    const n = entree.type === 'STR' ? [...entree.valeur].length
      : entree.type === 'NUM' ? 1 : entree.valeur.length;
    const ctx = { ids: Array.from({ length: n }, (_, i) => `t${i}`), cle: 'e0' };
    const steps = etapes(op, entree, apres, ctx);
    assert.ok(Array.isArray(steps) && steps.length >= 1, `${code} : aucun step`);

    // pureté : sérialisable, aucune fonction
    assert.deepEqual(JSON.parse(JSON.stringify(steps)), steps, `${code} : steps non purs`);

    const connus = new Set(ctx.ids);
    const idsSteps = new Set();
    for (const step of steps) {
      assert.ok(step.id && !idsSteps.has(step.id), `${code} : id de step manquant ou dupliqué`);
      idsSteps.add(step.id);
      assert.ok(typeof step.title === 'string' && step.title.trim(), `${code} : titre vide`);
      for (const o of step.ops) {
        assert.ok(OPS_AUTORISEES.has(o.op), `${code} : op « ${o.op} » hors vocabulaire`);
        for (const g of o.groups || []) {
          for (const cible of [].concat(g.targets || [])) {
            assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
          }
        }
        for (const cible of [].concat(o.targets || [], o.target || [], o.between || [])) {
          assert.ok(connus.has(cible), `${code} : op ${o.op} vise un id inconnu « ${cible} »`);
        }
        for (const p of o.pairs || []) {
          assert.ok(connus.has(p.target), `${code} : paire sur un id inconnu « ${p.target} »`);
          // `to` est soit un token, soit une LISTE de tokens (éclatement 1 → n,
          // CONTRACTS §3 / src/visuel/primitives/substitute.js).
          for (const t of [].concat(p.to || [])) connus.add(t.id);
        }
        for (const d of o.digits || []) connus.add(d.id);
        for (const id of o.ids || []) connus.add(id);
        // ★ `to` est un token, ou une LISTE de tokens. La seconde forme n'était
        //   connue que des `pairs` ; `flip180` l'emploie désormais aussi, pour
        //   le trio de 9 qui se retourne d'un bloc (`primitives/flip180.js`).
        //   Sans cette ligne, les jetons qu'un bloc fait naître restaient
        //   inconnus, et le `pulse` qui les désigne juste après passait pour
        //   viser un identifiant fantôme.
        for (const t of [].concat(o.to || [])) if (t && t.id) connus.add(t.id);
      }
    }

    // les identifiants annoncés par `sortie` existent bien dans la scène
    for (const id of idsApres(op, entree, apres, ctx)) {
      assert.ok(connus.has(id), `${code} : l'id de sortie « ${id} » n'a jamais été créé`);
    }

    // ★ le geste dédié est bien émis, et il porte de quoi être vérifié
    const attendue = PRIMITIVE_ATTENDUE[code];
    if (attendue) {
      const emises = steps.flatMap((s) => s.ops).filter((o) => o.op === attendue);
      assert.ok(emises.length > 0,
        `${code} (${op.id}) : la primitive « ${attendue} » n'est pas émise — `
        + 'le comptage ne serait plus montré, seulement affirmé (CONTRACTS §0.3)');
      for (const o of emises) {
        if (code === 'm36') {
          // ★ L'EFFACEMENT NE TRAVAILLE PAS JETON PAR JETON, et son contrôle
          // croisé n'est ni `count` ni `to.text` : c'est le MOTIF. « Si elle
          // n'a pas de motif, c'est probablement la pire des triches »
          // (l'auteur). Ici le motif est la CONTIGUÏTÉ, et il est montré avant
          // d'être exercé — un `highlight` désigne les trois 6 qu'on garde,
          // puis la gomme n'emporte que le reste. On vérifie donc les deux
          // ensemble : que les désignés sont bien trois 6 consécutifs de la
          // ligne, et que ce qui tombe est exactement leur complément.
          const designe = steps.flatMap((st) => st.ops)
            .find((x) => x.op === 'highlight' && Array.isArray(x.targets));
          assert.ok(designe, `${code} : rien ne DÉSIGNE ce qu'on garde — l'effacement serait sans motif`);
          assert.equal(designe.targets.length, 3, `${code} : on garde les trois 6 du 666, ni deux ni quatre`);
          const rangs = designe.targets.map((id) => ctx.ids.indexOf(id));
          assert.ok(rangs.every((r) => r >= 0), `${code} : un jeton désigné hors de la ligne`);
          assert.deepEqual(rangs, [rangs[0], rangs[0] + 1, rangs[0] + 2],
            `${code} : les trois 6 ne se touchent pas — ce serait un tri, pas une trouvaille`);
          for (const r of rangs) {
            assert.equal(String(entree.valeur[r]), '6',
              `${code} : on garderait autre chose qu'un 6`);
          }
          assert.equal(o.mode, 'erase', `${code} : la gomme efface sur place, elle ne fait pas tomber`);
          assert.equal(o.regroup, false, `${code} : rien ne se resserre — le 666 est déjà d'un seul tenant`);
          assert.deepEqual([...o.targets].sort(), ctx.ids.filter((id) => !designe.targets.includes(id)).sort(),
            `${code} : ce qui tombe doit être EXACTEMENT le complément de ce qu'on garde`);
          continue;
        }
        if (attendue === 'move') {
          // ★ Un rangement ne travaille pas jeton par jeton : il rend un ORDRE.
          //   Le contrôle croisé est donc que cet ordre soit UNE PERMUTATION de
          //   la ligne — pas un jeton oublié, pas un jeton compté deux fois —
          //   et que les valeurs qu'il désigne soient effectivement croissantes.
          //   Le moteur visuel ne peut pas le vérifier : il ne connaît pas les
          //   valeurs. Ici, on les a encore sous la main.
          assert.ok(Array.isArray(o.order) && o.order.length === ctx.ids.length,
            `${code} : « order » doit renommer toute la ligne, dans son nouvel ordre`);
          assert.equal(new Set(o.order).size, o.order.length,
            `${code} : un jeton figure deux fois dans « order »`);
          const rangs = o.order.map((id) => ctx.ids.indexOf(id));
          assert.ok(rangs.every((r) => r >= 0), `${code} : « order » désigne un jeton hors ligne`);
          const rangees = rangs.map((r) => entree.valeur[r]);
          assert.deepEqual(rangees, [...rangees].sort((x, y) => x - y),
            `${code} : l'ordre envoyé à la scène n'est pas croissant`);
          continue;
        }
        if (attendue === 'partition') {
          // ★ Découper, c'est PARTITIONNER : au moins deux morceaux, aucun
          //   vide, aucun jeton dans deux morceaux à la fois. La primitive
          //   refuse déjà les trois cas (`visuel/primitives/partition.js`) ;
          //   on le rattrape ici plutôt qu'au clic de l'utilisateur.
          assert.ok(Array.isArray(o.groups) && o.groups.length >= 2,
            `${code} : découper en un seul morceau ne découpe rien`);
          const vus = new Set();
          for (const g of o.groups) {
            assert.ok(Array.isArray(g.targets) && g.targets.length,
              `${code} : un groupe sans jeton`);
            for (const id of g.targets) {
              assert.ok(!vus.has(id), `${code} : le jeton « ${id} » est dans deux groupes`);
              vus.add(id);
            }
          }
          continue;
        }
        assert.equal(typeof o.target, 'string', `${code} : « ${attendue} » travaille jeton par jeton`);
        if (attendue === 'table') {
          // ★ L'aller-retour est INDIVIDUEL : une lettre monte, sa valeur
          // redescend, puis la suivante. Ce qui se mutualise, c'est le DÉCOR.
          // ★ TROIS mises en page. Une case vaut une lettre et un nombre, sauf
          //   au clavier téléphonique (`pave`), qui en met plusieurs.
          //
          //   ⚠️ La GLISSIÈRE a été ajoutée ici le jour où `m.z26a1` l'a prise :
          //     elle existait déjà pour les filtres — c'est la mise en scène de
          //     l'Atbash, deux bandes alignées dont la seconde se retourne —,
          //     et cette liste-ci ne connaissait que les mappeurs. Elle n'est
          //     pas une troisième façon de dessiner une case : c'est la même
          //     case, dans une table qui DÉRIVE sa seconde bande de la première
          //     au lieu de l'affirmer (`visuel/assets.js › pasDeGlissiere`).
          assert.ok(['reglette', 'pave', 'glissiere'].includes(o.disposition),
            `${code} : mise en page inconnue`);
          assert.ok(o.teinte === undefined || o.teinte === 'valeur',
            `${code} : encodage de teinte inconnu`);
          assert.ok(o.cycle === undefined || o.cycle === true,
            `${code} : « cycle » est un drapeau, pas un réglage`);
          // Le contrôle croisé n'est pas `count` mais la TABLE elle-même : elle
          // voyage dans l'op, dérivée de la fonction de l'opérateur, et la
          // primitive refuse de faire redescendre une valeur qui n'y est pas.
          assert.ok(Array.isArray(o.entries) && o.entries.length >= 26,
            `${code} : « entries » manquant — la conversion serait affirmée, pas montrée`);
          const cases = new Map(o.entries.map((e) => [e.char, String(e.value)]));
          assert.match(String(o.letter), /^[A-Z]$/, `${code} : « letter » manquant ou non replié`);
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si la table montrait autre chose que le nombre annoncé');
          assert.equal(cases.get(o.letter), String(o.to.text),
            `${code} : la table montrée et le nombre annoncé divergent sur « ${o.letter} »`);
        } else if (attendue === 'keyboard') {
          // Le contrôle croisé de `keyboard` n'est pas `count` mais `to.text` :
          // c'est le nombre qui redescend de la touche, et la primitive refuse
          // de le faire descendre s'il diffère de ce que le clavier montre.
          assert.equal(typeof o.key, 'string', `${code} : « key » manquant`);
          assert.ok(['azerty', 'qwerty'].includes(o.layout), `${code} : disposition inconnue`);
          assert.ok(['touche', 'colonne', 'rangee'].includes(o.mesure), `${code} : mesure inconnue`);
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to.text » manquant — c'est lui qui fait échouer la compilation `
            + 'si le clavier montrait autre chose que le nombre annoncé');
        } else {
          assert.equal(typeof o.count, 'number',
            `${code} : « count » manquant — c'est lui qui fait échouer la compilation `
            + 'si le tracé montré et le nombre annoncé divergeaient');
        }
      }
      if (attendue === 'keyboard' || attendue === 'table') {
        // Une op de caméra par step, jamais deux : elles se contrediraient.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » animeraient deux fois la caméra`);
        }
      }
      if (attendue === 'table') {
        // ★ Le décor est mutualisé : déployé UNE fois, retiré UNE fois. Entre
        // les deux la table reste montée — c'est là qu'est l'économie, pas
        // dans l'aller-retour, qui reste entier pour chaque lettre.
        assert.equal(emises.filter((o) => o.montre === true).length, 1,
          `${code} : la table doit se déployer exactement une fois`);
        assert.equal(emises.filter((o) => o.retire === true).length, 1,
          `${code} : la table doit se retirer exactement une fois`);
        assert.equal(emises[0].montre, true, `${code} : elle monte à la première lettre`);
        assert.equal(emises[emises.length - 1].retire, true, `${code} : elle part à la dernière`);
      }
      if (attendue === 'sevenSeg' || attendue === 'countStrokes') {
        // Un encart par step : deux comptages simultanés, c'est le fouillis
        // qu'on vient de retirer.
        for (const step of steps) {
          assert.ok(step.ops.filter((o) => o.op === attendue).length <= 1,
            `${code} : deux « ${attendue} » dans le step « ${step.id} » ouvriraient deux encarts`);
        }
        for (const o of emises) {
          assert.match(String(o.to && o.to.text), /^\d+$/,
            `${code} : « to » manquant — c'est le nombre du compteur qui remplace la lettre`);
        }
      }
      if (attendue === 'countStrokes') {
        for (const o of emises) {
          assert.match(o.glyph, /^[A-Za-z]$/, `${code} : « glyph » doit être le caractère redessiné`);
          assert.ok(['traits', 'extremites', 'boucles'].includes(o.mode), `${code} : mode inconnu`);
        }
      }
    }
  }
});

test('sélection : jokers, dépréciés et nombres maîtres hors recherche', () => {
  const actifs = operateursActifs();
  assert.ok(!actifs.some((o) => o.isJoker), 'le joker n’est jamais exploré');
  assert.ok(!actifs.some((o) => o.deprecated));
  assert.ok(!actifs.some((o) => o.id === 'p.racineMaitres'), 'nombres maîtres désactivés par défaut');
  assert.ok(operateursActifs({ maitres: true }).some((o) => o.id === 'p.racineMaitres'));
  assert.ok(operateursDepuis('STR').every((o) => o.from === 'STR'));
  const codes = operateursDepuis('TOKENS').map((o) => o.code);
  assert.deepEqual(codes, [...codes].sort((a, b) => rangCode(a) - rangCode(b)));
});

test('le joker français : tout chiffre atteint 6 en au plus trois étapes', () => {
  assert.equal(JOKER.isJoker, true);
  assert.equal(JOKER.adHoc, 0.5);
  for (let d = 0; d <= 9; d++) {
    let v = num(d, [[0, 1]]);
    let pas = 0;
    while (v.valeur !== 6 && pas < 5) { v = appliquer(JOKER, v); pas++; }
    assert.equal(v.valeur, 6, `${d} n’atteint pas 6`);
    assert.ok(pas <= 3, `${d} demande ${pas} étapes`);
  }
});

test('les identifiants d’opérateurs sont uniques et lisibles', () => {
  assert.equal(PAR_ID.size, CATALOGUE.length);
  for (const op of CATALOGUE) assert.match(op.id, /^[a-z]\.[A-Za-z0-9]+$/);
});

/**
 * ★ **UNE DÉCOUPE D'ADRESSE MONTRE LA ZONE QU'ELLE COUPE, PAS SES LETTRES.**
 *
 * Le défaut relevé par l'auteur : « visiblement tu identifies les caractères à
 * conserver (ceux du chemin) puis tu cherches leur PREMIÈRE OCCURRENCE dans la
 * string, peu importe que ce soit dans la zone du chemin, et tu le gardes en
 * virant les autres. Résultat, des caractères qui semblent pris au hasard sont
 * gardés et le reste supprimé. »
 *
 * C'était exact, et pour trois des cinq découpes. `etapeDecoupeAdresse`
 * demandait à `apparier` quels jetons survivent ; faute de traces
 * discriminantes, celui-ci retombe sur la plus longue sous-suite commune, qui
 * prend la première occurrence de chaque caractère. Sur
 * `https://www.example.com/path/to/page`, `fchm` garde `path` — mais la scène
 * gardait le `p` de `https`, le `a` d'`example`, puis le `th` de `path` :
 *
 * ```
 *   bornes       ························path········
 *   appariement  ···p··········a···········th········   ← ce qu'on voyait
 * ```
 *
 * Les cinq publient donc leurs `bornes`, et la scène les lit. Ce test croise
 * les deux — la zone déclarée et le texte rendu par `apply` — sur une adresse
 * qui les met toutes en défaut, et il tombe si l'une des deux dérive.
 */
test('★ découpes d’adresse — la zone déclarée EST le texte rendu', () => {
  const coupes = CATALOGUE.filter((o) => o.coupe);
  assert.ok(coupes.length >= 5, `attendu au moins cinq découpes, vu ${coupes.length}`);

  for (const saisie of [
    'https://www.example.com/path/to/page',
    'https://hope-hope-hope.fr/',
    'hope.fr/a/b',
    'https://www.numérologie-évidente.fr/preuve',
  ]) {
    for (const op of coupes) {
      // ★ TOUTE découpe doit publier ses bornes : sans elles, la scène retombe
      //   sur l'appariement, c'est-à-dire sur le défaut qu'on vient de fermer.
      assert.equal(typeof op.bornes, 'function',
        `${op.code} coupe sans publier ses bornes`);
      const bornes = op.bornes(saisie);
      const rendu = op.apply(saisie, [...saisie].map(() => []));
      if (!bornes || !rendu) {
        // S'abstenir est licite — mais les deux doivent s'abstenir ENSEMBLE.
        assert.equal(!bornes, !rendu,
          `${op.code} sur « ${saisie} » : bornes et rendu ne s’accordent pas`);
        continue;
      }
      assert.equal([...saisie].slice(bornes[0], bornes[1]).join(''), rendu.valeur,
        `${op.code} sur « ${saisie} » : la zone déclarée n’est pas ce qui est rendu`);
    }
  }
});
