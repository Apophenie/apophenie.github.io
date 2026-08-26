/**
 * ★ LE FEU DU VERDICT — ce que ce test garde, et pourquoi aucun autre ne le fait.
 *
 * Un effet de feu se juge à l'œil, et c'est bien ainsi qu'il a été mis au point
 * (`src/gfx/_feu-test.html`). Mais cinq de ses propriétés ne se voient PAS en
 * regardant, et ce sont précisément celles qui se cassent en silence :
 *
 *  1. **le déterminisme** — deux lectures du même verdict doivent donner le
 *     même feu, sinon le scrubbing ne retomberait jamais sur la même image
 *     (CONTRACTS §4.4). Aucune capture d'écran ne peut le dire ;
 *  2. **la variété** — l'auteur a refusé une version parce que les six foyers
 *     étaient « identiques ». On peut le voir sur une image, mais on ne peut pas
 *     garantir qu'on le reverra ; ici on le mesure ;
 *  3. **l'irrégularité** — « réguliers », deuxième reproche. Elle tient à ce que
 *     les périodes soient premières entre elles. Une valeur changée de deux
 *     millisecondes suffirait à les rendre commensurables sans que rien ne se
 *     voie avant plusieurs minutes de lecture attentive ;
 *  4. ★ **le COÛT** — c'est ici la propriété la plus fragile, et la plus
 *     invisible. Mesuré au banc : la pile de `drop-shadow()` coûte **plus d'un
 *     cœur** si on l'anime et **zéro** si on la fige. Tout le montage en
 *     découle, et une seule `@keyframes` mal placée le défait sans que l'image
 *     change d'un pixel ;
 *  5. **la lisibilité du verdict** — elle tient à ce que le corps qui brûle soit
 *     rempli de la couleur de nuit, et à rien d'autre.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COUCHES, PERIODES, RAMPE,
  graine, feuDe, fondSousLEncre, contraste, rvb,
} from '../primitives/feu.js';
import { PALETTE, FONT_SIZE } from '../constants.js';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lire = (p) => readFileSync(resolve(racine, p), 'utf8');

const FS = FONT_SIZE;
const feu = (id, part) => feuDe({ fontSize: FS, id, part, palette: PALETTE });

/* ═══════════════════════════ 1. LE DÉTERMINISME ══════════════════════════ */

test('★ feu — le même chiffre brûle TOUJOURS pareil : aucun tirage au sort', () => {
  // CONTRACTS §4.4 : ni `Math.random`, ni `Date.now`. Deux constructions du même
  // foyer doivent être identiques — sinon un `seek()` en arrière ne retomberait
  // pas sur la même image.
  assert.deepEqual(feu('@brasier:d0'), feu('@brasier:d0'));
});

test('★ feu — le code du feu n’appelle ni Math.random ni Date.now', () => {
  for (const f of ['src/visuel/primitives/feu.js', 'src/visuel/dom.js', 'src/styles/pages.css']) {
    // Hors commentaires : ces fichiers PARLENT du tirage au sort pour dire
    // qu'ils n'en font pas, et un test qui rougirait là-dessus serait un test
    // qui interdit d'expliquer.
    const src = lire(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/Math\.random|Date\.now/.test(src), `${f} : un tirage au sort s’est glissé dans le feu`);
  }
});

/* ═════════════════════════ 2. LA VARIÉTÉ (« identiques ») ════════════════ */

test('★ feu — deux chiffres voisins ne brûlent JAMAIS pareil', () => {
  // Le premier reproche de l'auteur, mesuré : « ils sont identiques ».
  const vus = new Set();
  for (let i = 0; i < 15; i++) vus.add(JSON.stringify(feu(`@brasier:d${i}`)));
  assert.equal(vus.size, 15, 'deux foyers partagent le même feu');
});

test('★ feu — la variété porte sur le RYTHME et sur l’AMPLEUR, pas seulement l’un', () => {
  // Déphaser sans changer l'ampleur donnerait quinze fois le même feu, décalé
  // dans le temps : à l'œil, c'est encore « identiques ».
  const tous = [];
  for (let i = 0; i < 15; i++) tous.push(feu(`@brasier:d${i}`));
  const distincts = (f) => new Set(tous.map(f)).size;
  assert.ok(distincts((x) => x.periode) >= 13, 'les périodes se répètent');
  assert.ok(distincts((x) => x.retard) >= 14, 'les phases se répètent');
  assert.ok(distincts((x) => x.ampleur) >= 13, 'les ampleurs se répètent');
});

test('★ feu — la CORNE d’un 6 ne brûle pas à l’unisson de son 6', () => {
  // Deux corps du même foyer : ils partagent le repère et l'échelle (ils sont
  // dans le même nœud, accroché au même chiffre), pas le rythme.
  const glyphe = feu('@brasier:d0');
  const corne = feu('@brasier:d0', 'corne');
  assert.notEqual(glyphe.periode, corne.periode);
  assert.notEqual(glyphe.retard, corne.retard);
});

test('feu — l’empreinte est bien répartie : pas de graine dégénérée', () => {
  const g = [];
  for (let i = 0; i < 200; i++) g.push(graine(`@brasier:d${i}`));
  assert.equal(new Set(g).size, 200, 'deux identifiants partagent une empreinte');
  // Une empreinte qui s'entasserait dans un coin de [0,1[ donnerait des foyers
  // déphasés « un peu », donc identiques à l'œil.
  const deciles = new Set(g.map((v) => Math.floor(v * 10)));
  assert.ok(deciles.size >= 8, `l’empreinte n’occupe que ${deciles.size} déciles sur dix`);
});

/* ═════════════════════ 3. L'IRRÉGULARITÉ (« réguliers ») ═════════════════ */

const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);

test('★ feu — les deux bornes de période sont PREMIÈRES ENTRE ELLES', () => {
  // Le deuxième reproche de l'auteur : « réguliers ».
  //
  // ⚠ Le piège que ce test a déjà attrapé une fois : une rédaction employait des
  // périodes « différentes » — 1 130, 1 490, 1 870 —, toutes multiples de dix,
  // donc de ppcm 168 secondes. Le feu se rejouait à l'identique toutes les deux
  // minutes quarante-huit, ce qu'aucun œil n'aurait relié à la table.
  assert.equal(pgcd(PERIODES.min, PERIODES.max), 1,
    `${PERIODES.min} et ${PERIODES.max} ont un diviseur commun`);
  assert.ok(PERIODES.min < PERIODES.max);
});

test('★ feu — sur une série, aucune paire de foyers ne bat en mesure', () => {
  // Ce n'est pas la table qui compte, c'est ce que les foyers RÉELS en tirent :
  // deux périodes voisines dont l'une divise l'autre remettraient deux chiffres
  // en phase à chaque tour.
  const p = [];
  for (let i = 0; i < 6; i++) p.push(feu(`@brasier:d${i}`).periode);
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j < p.length; j++) {
      const ppcm = (p[i] * p[j]) / pgcd(p[i], p[j]);
      assert.ok(ppcm > 30000,
        `les foyers ${i} et ${j} se remettent en phase toutes les ${(ppcm / 1000).toFixed(1)} s`);
    }
  }
});

/* ══════════════ 4. LE COÛT — la propriété la plus fragile ════════════════ */

test('★ feu — AUCUN FILTRE N’EST ANIMÉ, et c’est tout le montage', () => {
  // Mesuré au banc (`src/gfx/_feu-perf.html`, rendu logiciel, six foyers) : la
  // pile de cinq `drop-shadow()` coûte PLUS D'UN CŒUR si on l'anime, et ZÉRO si
  // on la fige — un filtre statique est tramé une fois et mis en cache, un
  // filtre animé est refait à chaque image.
  //
  // Le feu est donc deux corps superposés à chaînes FIGÉES, dont l'un voit son
  // opacité aller et venir. Une seule `@keyframes` sur `filter` défait tout ça
  // sans que l'image change d'un pixel : d'où ce test.
  const css = lire('src/styles/pages.css');
  for (const [, nom, corps] of css.matchAll(/@keyframes\s+(nhl-feu[\w-]*)\s*\{([\s\S]*?)\n\}/g)) {
    assert.ok(!/(?:^|[\s;{])filter\s*:/.test(corps),
      `@keyframes ${nom} anime un filtre : mesuré, c’est plus d’un cœur à l’échelle du verdict`);
  }
  // Et le corps de reprise n'anime bien QUE son opacité.
  assert.match(css, /@keyframes nhl-feu-reprise \{[\s\S]*?opacity[\s\S]*?\n\}/);
});

test('★ feu — le corps de braise n’est jamais animé : c’est lui qui SCELLE', () => {
  // Deux corps qui se fondraient l'un dans l'autre laisseraient à mi-fondu un
  // trou d'opacité par lequel les halos remonteraient sous le chiffre — et le
  // contraste du verdict avec.
  const css = lire('src/styles/pages.css');
  const dom = lire('src/visuel/dom.js');
  assert.match(dom, /braise\.setAttribute\('class', 'nhl-feu'\)/,
    'le corps de scellement doit exister et ne porter que `nhl-feu`');
  assert.doesNotMatch(css, /^\.nhl-feu \{[\s\S]*?animation:/m,
    '`.nhl-feu` ne doit porter aucune animation : seule la reprise en a une');
});

test('feu — cinq couches, pas sept : la mesure a tranché', () => {
  assert.equal(COUCHES.length, 5);
  assert.deepEqual([...new Set(COUCHES.map((c) => c.teinteA))], RAMPE,
    'la rampe doit être parcourue en entier, du cœur à la fumée');
});

test('★ feu — la pile MONTE : c’est ce qui distingue un panache d’un halo', () => {
  // Le flou est isotrope. Sans décalage vertical croissant, cinq couches
  // empilées donnent un halo rond autour du chiffre — joli, et faux.
  for (let i = 1; i < COUCHES.length; i++) {
    assert.ok(COUCHES[i].dyA < COUCHES[i - 1].dyA, `la couche ${i} ne monte pas plus haut que la précédente`);
    assert.ok(COUCHES[i].flouA > COUCHES[i - 1].flouA, `la couche ${i} n’est pas plus floue que la précédente`);
  }
  assert.ok(Math.abs(COUCHES[COUCHES.length - 1].dyA) >= 0.5,
    'la queue du panache doit monter d’au moins une demi-hauteur de corps');
});

test('★ feu — LA CHALEUR MONTE DANS LA PILE (le trait de génie du pen)', () => {
  // Entre les deux états, atnyman ne bouge pas seulement les décalages : il
  // décale les COULEURS d'un cran vers le haut de la rampe. Ce n'est pas une
  // pile qui respire, c'est de la matière qui monte à travers elle.
  const rang = (t) => RAMPE.indexOf(t);
  let montees = 0;
  for (const c of COUCHES) {
    assert.ok(rang(c.teinteB) <= rang(c.teinteA), 'une couche refroidit au lieu de chauffer');
    if (rang(c.teinteB) < rang(c.teinteA)) montees++;
  }
  assert.ok(montees >= 3, `seules ${montees} couches chauffent : la matière ne monte pas`);
});

test('feu — les longueurs sont en CORPS DE GLYPHE, donc le feu grandit avec lui', () => {
  // Une constante en pixels ne suivrait pas l'agrandissement ×8 du verdict.
  const petit = feuDe({ fontSize: 10, id: 'x', palette: PALETTE });
  const grand = feuDe({ fontSize: 20, id: 'x', palette: PALETTE });
  const nombres = (s) => [...s.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
  const a = nombres(petit.a);
  const b = nombres(grand.a);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.ok(Math.abs(b[i] - 2 * a[i]) < 0.02, 'une longueur du feu ne suit pas le corps du glyphe');
  }
});

/* ═══════════════ 5. LA LISIBILITÉ DU VERDICT, MESURÉE ════════════════════ */

test('★ feu — la rubrique de nuit garde ses 7,4:1 : le feu ne passe PAS sous elle', () => {
  // `drop-shadow()` peint l'ombre DERRIÈRE l'élément qui la porte, et cet
  // élément est une copie du glyphe remplie de la couleur de nuit. Le vrai
  // chiffre repose donc sur du fond pur, quelle que soit l'ardeur du feu.
  //
  // Les deux tentatives précédentes devaient acheter leur lisibilité — l'une en
  // pâlissant ses flammes, l'autre par un dégradé de pied. Celle-ci n'achète
  // rien : c'est une propriété de la technique. Ce test la garde.
  const c = contraste(rvb(PALETTE.rubricNuit), fondSousLEncre(PALETTE, PALETTE.nuit));
  assert.ok(c >= 4.5, `${c.toFixed(2)}:1, sous le 4,5:1 de design §5.1`);
  assert.ok(c > 7, `${c.toFixed(2)}:1 — on attend les 7,4:1 de tokens.css`);

  // Et le corps EST bien rempli de nuit : sans ça, le raisonnement ci-dessus
  // ne vaut plus rien.
  const dom = lire('src/visuel/dom.js');
  assert.match(dom, /const nuit = palette\.nuit \|\| d\.couleur;/);
  assert.match(dom, /braise\.setAttribute\('fill', nuit\)/);
  assert.match(dom, /reprise\.setAttribute\('fill', nuit\)/);
});

test('★ feu — si l’on remplissait le corps d’une teinte du feu, le test rougirait', () => {
  // Un test qui garde un garde-fou doit montrer que le garde-fou sert.
  const mauvais = contraste(rvb(PALETTE.rubricNuit), fondSousLEncre(PALETTE, PALETTE.brasier));
  assert.ok(mauvais < 2,
    `${mauvais.toFixed(2)}:1 — remplir le corps de flamme rendrait le verdict illisible`);
});

/* ════════════════════ 6. LES RÈGLES DE LA MAISON ════════════════════════ */

test('★ feu — aucune @keyframes ne mêle opacité et transformation (défaut Firefox)', () => {
  const css = lire('src/styles/pages.css');
  for (const [, nom, corps] of css.matchAll(/@keyframes\s+(nhl-feu[\w-]*)\s*\{([\s\S]*?)\n\}/g)) {
    const a = /(?:^|[\s;{])opacity\s*:/.test(corps);
    const b = /(?:^|[\s;{])transform\s*:/.test(corps);
    assert.ok(!(a && b), `@keyframes ${nom} anime l’opacité ET la transformation du même élément`);
  }
});

test('feu — le vacillement est PAUSÉ tant que le feu n’a pas pris', () => {
  // « Rien ne doit tourner dans le vide » : une boucle CSS infinie continuerait
  // sous un feu invisible dès qu'on revient en arrière. C'est `data-embrasement`
  // — fonction du temps, posé par `player.js` — qui les met en marche.
  const css = lire('src/styles/pages.css');
  assert.match(css, /\.nhl-feu-souffle \{ animation-play-state: paused;/);
  assert.match(css, /\.nhl-feu-germe \{ animation-play-state: paused; \}/);
  assert.match(css, /\.scene\[data-embrasement\] \.nhl-feu-souffle,\s*\n\s*\.scene\[data-embrasement\] \.nhl-feu-germe \{ animation-play-state: running; \}/);
  const js = lire('src/visuel/player.js');
  assert.match(js, /_renderEmbrasement\(t\)/, 'le lecteur ne résout plus l’interrupteur du feu');
  assert.match(js, /setAttribute\('data-embrasement'/);
  assert.match(js, /removeAttribute\('data-embrasement'/,
    'l’interrupteur ne se coupe jamais : le feu survivrait à un retour en arrière');
});

test('★ feu — mouvement réduit : un feu FIXE, mais un feu', () => {
  const css = lire('src/styles/pages.css');
  const bloc = css.slice(css.indexOf('Mouvement réduit : un feu FIXE'));
  assert.match(bloc, /@media \(prefers-reduced-motion: reduce\)/);
  // Figé à mi-course : ni braise seule, ni reprise pleine — un état de feu.
  assert.match(bloc, /animation-play-state: paused; opacity: \.5;/,
    'le feu réduit doit se figer à mi-respiration, pas s’éteindre ni s’emballer');
  assert.match(bloc, /html\[data-animation="complete"\][\s\S]*?animation-play-state:\s*running/,
    'le réglage explicite « animation complète » ne rétablit plus rien');
  assert.match(css, /html\[data-animation="reduite"\][\s\S]*?animation-play-state:\s*paused/,
    'le réglage explicite « animation réduite » n’est écouté par aucun sélecteur');
});

test('★ feu — le feu vaut pour du TEXTE comme pour une FORME : c’est la demande', () => {
  // « Surtout si tu peux l'adapter pour pouvoir l'utiliser aussi bien pour du
  // texte que pour des formes SVG » (l'auteur). C'est ce que `drop-shadow()`
  // permet et que `text-shadow` interdisait : `dom.js` doit appliquer la MÊME
  // chaîne à un `<text>` (le chiffre) et à un `<path>` (la corne).
  const dom = lire('src/visuel/dom.js');
  assert.match(dom, /dessine: \(\) => glypheDeFeu\(d, fs\)/, 'le chiffre ne brûle plus');
  assert.match(dom, /part: 'corne'[\s\S]{0,200}el\('path'/, 'la corne ne brûle plus');
  // Un seul chemin de code pour les deux : s'il y en avait deux, ils
  // divergeraient.
  assert.equal((dom.match(/feuDe\(\{/g) || []).length, 1,
    'le feu doit être construit en UN endroit, pour le texte comme pour la forme');
});

/* ════════════ 7. LE FILTRE NE PORTE JAMAIS D'ANIMATION ═════════════════════

   ★ La règle qui a coûté le plus cher à trouver, et la seule que l'œil ne
   pouvait pas voir.

   « L'animation du feu est très bien, mais elle semble entraver la fluidité
   […] j'ai des freezes ou micro-saccades sur l'étape verdict, ou les flammes
   qui mettent près d'une minute avant de finalement apparaître » (l'auteur).
   Mesuré dans le navigateur, à l'arrêt sur le verdict : une expression d'UNE
   LIGNE évaluée dans la page dépassait quinze secondes. Le fil principal était
   saturé.

   Le filtre n'était pas en cause — il est statique et se trame une fois. C'est
   l'`opacity` animée POSÉE SUR L'ÉLÉMENT QUI LE PORTE qui l'était : un filtre
   s'applique avant l'opacité, donc les deux sur le même élément obligent le
   moteur à repasser les cinq flous à chaque image. Dix corps, cinquante passes
   de flou par image, à l'échelle huit du verdict.

   C'est la même famille de défaut que « jamais d'opacité animée sur un élément
   portant une transformation individuelle » (`compositeur.test.js`), étendue au
   `filter`. Rien dans une capture ne la montre : seul un test peut la tenir. */

test('★★ feu — aucun élément ne porte à la fois un filtre et une animation', () => {
  const dom = lire('src/visuel/dom.js');
  const css = lire('src/styles/pages.css');

  // 1. Dans le DOM : les éléments qui reçoivent `filter:` ne portent que la
  //    classe `nhl-feu`, laquelle n'a aucune animation en CSS.
  for (const [, variable] of dom.matchAll(/(\w+)\.setAttribute\('style', `filter:/g)) {
    const classe = new RegExp(`${variable}\\.setAttribute\\('class', '([^']+)'\\)`);
    const m = dom.match(classe);
    assert.ok(m, `le corps filtré « ${variable} » doit déclarer sa classe`);
    assert.equal(m[1], 'nhl-feu',
      `« ${variable} » porte un filtre ET la classe « ${m[1]} » : si celle-ci est `
      + 'animée, les flous seront re-tramés à chaque image');
  }

  // 2. En CSS : `.nhl-feu` — la classe des éléments filtrés — n'est jamais
  //    animée, ni directement ni par un sélecteur qui la termine.
  for (const [, corps] of css.matchAll(/\.nhl-feu\s*\{([^}]*)\}/g)) {
    assert.doesNotMatch(corps, /animation/,
      '`.nhl-feu` porte le filtre : lui donner une animation ramène le gel du verdict');
  }

  // 3. Les enveloppes existent, et elles sont DISTINCTES de l'élément filtré.
  assert.match(dom, /souffle\.appendChild\(reprise\)/,
    'l’opacité doit vivre sur une enveloppe, pas sur le corps filtré');
  assert.match(dom, /germe\.appendChild\(braise\)[\s\S]*?germe\.appendChild\(souffle\)/,
    'la germination doit envelopper les deux corps');
});

test('★ feu — la germination part petite et arrive à la taille pleine', () => {
  // « Je voudrais qu'elles germent petit puis qu'elles grandissent
  // progressivement jusqu'à atteindre leur taille actuelle » (l'auteur) : la
  // taille d'ARRIVÉE ne change pas, c'est le départ qui devient petit.
  const css = lire('src/styles/pages.css');
  const bloc = css.match(/@keyframes nhl-feu-germe \{([\s\S]*?)\n\}/);
  assert.ok(bloc, 'la germination doit exister');
  const depart = bloc[1].match(/from \{ transform: scale\(([\d.]+)\); \}/);
  const arrivee = bloc[1].match(/to\s+\{ transform: scale\(([\d.]+)\); \}/);
  assert.ok(depart && arrivee, 'la germination doit déclarer ses deux bornes');
  assert.ok(Number(depart[1]) < 0.5, 'une graine doit être petite');
  assert.equal(Number(arrivee[1]), 1,
    'l’arrivée doit valoir exactement la taille actuelle, pas une autre');
  // Elle a lieu UNE fois : `both`, jamais `infinite`.
  const regle = css.match(/\.nhl-feu-germe \{[\s\S]*?\n\}/)[0];
  assert.match(regle, /both;/, 'la pousse doit persister à son dernier état');
  assert.doesNotMatch(regle, /infinite/, 'une graine ne germe pas en boucle');
  // Elle pousse depuis le PIED : un feu naît au sol.
  assert.match(regle, /transform-origin: 50% 100%/);
  assert.match(regle, /transform-box: fill-box/);
});

test('★ feu — les foyers ne germent pas tous au même instant', () => {
  // Deux raisons, l'une visible et l'autre non : six feux qui prendraient
  // ensemble seraient le retour de « ils sont identiques », ET leurs six
  // tramages de filtre tomberaient sur la même image — c'est-à-dire un gel.
  const palette = { coeur: '#1', flamme: '#2', brasier: '#3', braise: '#4', fumee: '#5' };
  const semis = [];
  const pousses = [];
  for (let i = 0; i < 15; i++) {
    const f = feuDe({ fontSize: 48, id: `d${i}`, palette });
    semis.push(f.semis);
    pousses.push(f.pousse);
  }
  assert.ok(new Set(semis).size >= 12, `les semis se répètent : ${semis.join(' ')}`);
  assert.ok(new Set(pousses).size >= 12, `les pousses se répètent : ${pousses.join(' ')}`);
  assert.ok(Math.max(...semis) - Math.min(...semis) > 300,
    'l’échelonnement doit être assez large pour étaler les tramages');
});
