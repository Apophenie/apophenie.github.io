/**
 * ★ **LA POTENCE — ce que l'auteur a décrit, geste par geste.**
 *
 * > « Les divisions à décimales, l'animation n'est toujours pas là. » (l'auteur)
 *
 * Elle y était, pourtant, au sens où des animations étaient émises. Ce qui n'y
 * était pas, c'est CE QU'IL AVAIT DÉCRIT : la zone en jeu désignée, le décalage
 * de `A` vers la gauche pour insérer « ,0 » à sa droite (un simple changement de
 * texte en tenait lieu), le même « ,0 » ajouté sous `B`, un rythme d'extraction
 * qu'on puisse suivre, et une barre horizontale assez longue pour couvrir le
 * quotient qu'elle est censée souligner.
 *
 * > « La solution est soit de flouter tout ce qui n'est pas en jeu (donc "5"
 * >   dans "105" quand on enlève 5 au niveau des dizaines), soit de mettre une
 * >   accolade au-dessus des chiffres concernés. » (l'auteur)
 *
 * C'est l'estompage qui a été retenu, et le paquet vaut donc `B` — toujours.
 *
 * Ce fichier regarde l'ÉCRAN — colonnes, opacités, instants, textes — et non le
 * calcul, dont le contrôle croisé de la primitive se charge déjà. Chaque test
 * cite l'exigence qu'il tient.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { CompileError } from '../errors.js';
import { resolveDiscrete } from '../clock.js';
import { derouleDeLaDivision, ligneAffichee } from '../primitives/potence.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

/**
 * Une potence nue : deux jetons sur la ligne, une op, rien d'autre.
 *
 * ★ On passe par la primitive plutôt que par le catalogue pour pouvoir poser
 *   n'importe quel couple — dont `105 ÷ 5`, que l'auteur cite en exemple
 *   (« 105/5 devrait donner 021 ») et dont le déroulé ne dépend d'aucun
 *   arbitrage d'opérateur.
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
/** Le seul d'entre eux — il n'y en a qu'un pour les barres et les virgules. */
const unique = (tl, prefixe) => {
  const l = parPrefixe(tl, prefixe);
  assert.equal(l.length, 1, `un seul « ${prefixe} » attendu, ${l.length} trouvés`);
  return l[0];
};
/** Les enregistrements discrets d'un nœud, dans l'ordre du temps. */
const canaux = (tl, id) => tl.discrete
  .filter((d) => d.id === id && d.channel === 'text')
  .sort((x, y) => x.at - y.at);

/**
 * Les colonnes de gauche, DANS L'ORDRE DE LECTURE : le jeton du dividende porte
 * la première, les chiffres partagés suivent, puis les zéros abaissés. C'est
 * l'ordre de création, et ce n'est pas un hasard — chaque colonne naît à droite
 * de la précédente et n'en bouge plus.
 */
const colonnesDe = (tl) => [
  tl.nodes.find((n) => n.id === 'a'),
  ...parPrefixe(tl, '@potchiffre'),
  ...parPrefixe(tl, '@potdec'),
];

/** L'instant du partage : quand le dividende s'ouvre en colonnes. */
const tPartage = (tl) => canaux(tl, 'a')[0].at;

/**
 * L'instant où une colonne existe à l'écran : le partage pour les chiffres du
 * dividende, sa propre apparition pour un zéro abaissé — il n'était nulle part
 * avant qu'on ne l'abaisse.
 */
const depuis = (tl, n) => (n.id.startsWith('@potdec')
  ? Math.min(...tl.anims.filter((x) => x.id === n.id && x.prop === 'opacity').map((x) => x.delay))
  : tPartage(tl));

/**
 * Ce que la ligne de gauche montre à l'instant `t` : les chiffres, virgule
 * exclue, et le nombre de décimales — car c'est lui qui donne l'échelle. `030`
 * avec une décimale et `03` sans en ont la même valeur.
 */
function etatA(tl, t) {
  const resolu = resolveDiscrete(tl.discreteIndex, t);
  const vues = colonnesDe(tl).filter((n) => depuis(tl, n) <= t);
  return {
    chiffres: vues.map((n) => {
      const r = resolu.get(`${n.id}::text`);
      return r ? r.value : n.text;
    }).join(''),
    decimales: vues.filter((n) => n.id.startsWith('@potdec')).length,
  };
}

/** La valeur de la ligne à l'instant `t`, décimales comprises. */
const valeurA = (tl, t) => {
  const { chiffres, decimales } = etatA(tl, t);
  return Number(chiffres) / 10 ** decimales;
};
/** Sa forme écrite, telle que `ligneAffichee` la produit. */
const ligneA = (tl, t) => etatA(tl, t).chiffres;

// ───────────────────── 1. la ligne de gauche

/**
 * ⚠️ **LA LIGNE NE DOIT PAS SE REMETTRE À GRANDIR.** C'est le défaut nommé par
 *   l'auteur sur la division à l'accolade — « tu effaces les chiffres pour les
 *   remettre […] ça ne va pas » —, et la première potence l'avait sous une autre
 *   forme : elle affichait le dividende PARTIEL (`1`, puis `13`), si bien que le
 *   nombre grandissait au deuxième tour. Avec l'estompage, la ligne entière
 *   demeure : elle ne fait que perdre.
 */
test('★ la ligne de gauche ne remonte jamais — elle ne fait que perdre', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [1, 2, 1], [12345, 7, 3]]) {
    const { tl } = potence(a, b, d);
    const depart = tPartage(tl);
    let precedent = Infinity;
    for (let k = 0; k <= 400; k++) {
      const t = depart + ((tl.total - depart) * k) / 400;
      const valeur = valeurA(tl, t);
      assert.ok(valeur <= precedent,
        `${a} ÷ ${b} : la ligne remonte de ${precedent} à ${valeur} (t = ${Math.round(t)})`);
      precedent = valeur;
    }
    assert.equal(valeurA(tl, depart), a, `${a} ÷ ${b} : elle part du dividende`);
  }
});

/**
 * ★ **CE QUI EST ÉCRIT EST CE QUI EST COMPTÉ (§0.3).** La zone en jeu, complétée
 *   de zéros à gauche comme au tableau, suivie des chiffres pas encore
 *   descendus, se lit exactement comme le reste vrai : `105`, `055`, `005`,
 *   `000`. La primitive le vérifie à chaque exemplaire ; on le revérifie ici sur
 *   ce que la scène affiche RÉELLEMENT, canal par canal.
 */
test('★ à chaque instant, la ligne se lit comme le reste de la division', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [39, 9, 2]]) {
    const { tl, tours } = potence(a, b, d);
    const vus = new Set();
    for (let k = 0; k <= 600; k++) {
      const t = tPartage(tl) + ((tl.total - tPartage(tl)) * k) / 600;
      vus.add(ligneA(tl, t));
    }
    // toutes les lignes affichées sont des états légitimes du calcul
    const legitimes = new Set();
    let decimalesVues = 0;
    tours.forEach((tour, i) => {
      if (tour.decimal) decimalesVues += 1;
      const large = tour.decimal
        ? [...String(a)].length + decimalesVues
        : i + 1;
      const queue = tour.decimal ? '' : [...String(a)].slice(i + 1).join('');
      for (let p = 0; p <= tour.chiffre; p++) {
        legitimes.add(ligneAffichee(tour.courantAvant - p * b, large, queue));
      }
    });
    for (const ligne of vus) {
      assert.ok(legitimes.has(ligne),
        `${a} ÷ ${b} : la ligne « ${ligne} » n’est pas un état du calcul`);
    }
  }
});

/**
 * > « Le paquet doit valoir B. » (l'auteur, tranchant entre l'estompage et
 * >   l'accolade mobile)
 *
 * Une version intermédiaire faisait voler `50` puis `0,5` pour rester cohérente
 * avec une ligne qui prétendait montrer un nombre unique. L'estompage lève la
 * contradiction : c'est la ZONE qui perd `B`, et la ligne perd `B0` parce que la
 * zone est celle des dizaines — ce qui est la définition même des colonnes.
 */
test('★ ce qui vole vaut B, toujours — et 1 en arrivant', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [2, 3, 3], [39, 9, 2], [12345, 7, 3]]) {
    const { tl } = potence(a, b, d);
    const paquets = parPrefixe(tl, '@potpaquet');
    assert.ok(paquets.length > 0, `${a} ÷ ${b} : il y a des retraits`);
    for (const n of paquets) {
      assert.equal(n.text, String(b), `${a} ÷ ${b} : un paquet vaut ${n.text} au lieu de ${b}`);
      const c = canaux(tl, n.id)[0];
      assert.equal(c.render(0), String(b));
      assert.equal(c.render(1), '1', 'il vaut 1 en arrivant : ça compte pour un');
    }
  }
});

// ───────────────────── 2. la zone en jeu, et son estompage

/**
 * > « Flouter tout ce qui n'est pas en jeu (donc "5" dans "105" quand on enlève
 * >   5 au niveau des dizaines). » (l'auteur)
 *
 * Le dividende s'ouvre en colonnes — un jeton ne porte qu'une opacité —, les
 * colonnes pas encore en jeu s'estompent, et chacune reprend sa pleine encre au
 * tour où elle entre en jeu : « on inclut le 2ⁿᵈ chiffre de A ».
 */
test('★ ce qui n’est pas en jeu est estompé, et s’éclaire à son tour', () => {
  const { tl } = potence(105, 5, 1);
  const colonnes = parPrefixe(tl, '@potchiffre');
  assert.equal(colonnes.length, 2, '« 105 » s’ouvre en trois colonnes, dont deux fabriquées');

  const opacites = (id) => tl.anims
    .filter((x) => x.id === id && x.prop === 'opacity')
    .sort((x, y) => x.delay - y.delay);

  for (const [rang, n] of colonnes.entries()) {
    const suite = opacites(n.id);
    // elle paraît sans transition, là où le glyphe était déjà…
    assert.equal(suite[0].keyframes.at(-1).value, 1);
    assert.equal(suite[0].duration, 1, 'aucun fondu : le glyphe est déjà là');
    // …s'estompe…
    const estompe = suite[1];
    assert.ok(estompe.keyframes.at(-1).value < 0.5,
      `la colonne ${rang + 2} doit s’estomper (${estompe.keyframes.at(-1).value})`);
    assert.ok(estompe.duration > 100, 'et l’estompage se VOIT — c’est lui qui désigne la zone');
    // …puis revient à pleine encre, à son tour, sans avoir bougé
    const eclaire = suite[2];
    assert.equal(eclaire.keyframes.at(-1).value, 1);
    assert.ok(eclaire.delay > estompe.delay + estompe.duration,
      'elle s’éclaire APRÈS s’être estompée, pas pendant');
    assert.equal(tl.anims.filter((x) => x.id === n.id && x.prop === 'translate').length, 0,
      'et elle n’a pas bougé : entrer en jeu est un éclairage, pas un déplacement');
  }
  // les deux colonnes entrent en jeu l'une après l'autre, dans l'ordre
  assert.ok(opacites(colonnes[0].id)[2].delay < opacites(colonnes[1].id)[2].delay,
    'la zone s’étend vers la droite, un chiffre par tour');
});

/**
 * ★ **L'EXEMPLAIRE PART DE LA COLONNE OÙ ON LE RETIRE** — celle des unités de la
 *   zone en jeu, c'est-à-dire la dernière éclairée. C'est ce qui rend lisible le
 *   rang auquel s'écrit le chiffre du quotient.
 */
test('★ l’exemplaire quitte la colonne des unités de la zone', () => {
  const { tl } = potence(105, 5, 1);
  const av = tl.metrics.advance;
  const colonnes = colonnesDe(tl);
  const departs = parPrefixe(tl, '@potpaquet').map((n) => n.base.translate.x);
  // deux « 5 » partent de la colonne des dizaines, un de celle des unités
  const dizaines = colonnes[1].base.translate.x;
  const unites = colonnes[2].base.translate.x;
  assert.ok(Math.abs(unites - dizaines - av) < 0.01, 'les colonnes se suivent d’une chasse');
  assert.deepEqual(
    departs.map((x) => (Math.abs(x - dizaines) < 0.01 ? 'dizaines' : 'unités')),
    ['dizaines', 'dizaines', 'unités'],
  );
});

// ───────────────────── 3. le « ,0 » qu'on insère

/**
 * > « On décale A sur la gauche pour insérer ",0" à sa droite, AVANT la barre
 * >   verticale qui le sépare de B, et on fait de même sous B (on ajoute
 * >   ",0"). » (l'auteur)
 */
test('★ le « ,0 » s’insère : A GLISSE à gauche, la virgule et le zéro naissent à sa droite', () => {
  const { tl } = potence(13, 5, 1);
  const barre = unique(tl, '@potvert');
  const virguleA = unique(tl, '@potvirga');
  const zero = unique(tl, '@potdec');
  const virguleQ = unique(tl, '@potvirg:');
  const av = tl.metrics.advance;
  const paraitre = (id) => tl.anims.find((x) => x.id === id && x.prop === 'opacity' && x.duration > 1).delay;

  // les DEUX colonnes du dividende reculent, d'un même mouvement, de deux
  // colonnes : celle de la virgule et celle du zéro.
  for (const n of [tl.nodes.find((x) => x.id === 'a'), ...parPrefixe(tl, '@potchiffre')]) {
    const glisse = tl.anims.find((x) => x.id === n.id && x.prop === 'translate'
      && x.duration > 100 && x.delay <= paraitre(virguleA.id)
      && x.delay + x.duration >= paraitre(virguleA.id));
    assert.ok(glisse, `${n.id} recule pour faire place au « ,0 »`);
    const recul = glisse.keyframes[0].value.x - glisse.keyframes.at(-1).value.x;
    assert.ok(Math.abs(recul - 2 * av) < 0.01, `le recul vaut deux colonnes, pas ${recul}`);
  }

  // à droite du dividende, à gauche de la barre — « avant la barre verticale »
  assert.ok(virguleA.base.translate.x < zero.base.translate.x, 'la virgule précède le zéro');
  assert.ok(zero.base.translate.x + av / 2 <= barre.base.translate.x,
    'le « ,0 » ne franchit pas la barre');
  assert.equal(zero.text, '0', 'le zéro abaissé naît à zéro : c’est de lui qu’on retirera');

  // « et on fait de même sous B » : la virgule ET le zéro du quotient, ensemble
  assert.equal(paraitre(virguleQ.id), paraitre(virguleA.id),
    'les deux virgules paraissent au même instant');
  assert.equal(paraitre('q2'), paraitre(virguleQ.id),
    'et le zéro du quotient avec elles — « on ajoute ,0 » est UN seul geste');
});

/**
 * > « Puis on rajoute un 0 de plus, ce qui donne "0,A0". » (l'auteur)
 */
test('★ chaque décimale suivante ajoute UN zéro, et pousse le reste d’une colonne', () => {
  const { tl } = potence(2, 3, 3);
  const zeros = parPrefixe(tl, '@potdec');
  assert.equal(zeros.length, 3, 'trois décimales, trois zéros abaissés');
  const av = tl.metrics.advance;
  // les trois zéros naissent dans la MÊME colonne, la plus à droite…
  const naissances = zeros.map((n) => n.base.translate.x);
  assert.deepEqual(naissances, [naissances[0], naissances[0], naissances[0]]);
  // …et les précédents reculent d'exactement une colonne à chaque fois.
  for (const z of zeros.slice(0, -1)) {
    for (const r of tl.anims.filter((x) => x.id === z.id && x.prop === 'translate')) {
      const pas = r.keyframes[0].value.x - r.keyframes.at(-1).value.x;
      assert.ok(Math.abs(pas - av) < 0.01, `un zéro recule d’une colonne, pas de ${pas}`);
    }
  }
  // et la ligne finit sur le reste vrai : 2 − 3 × 0,666 = 0,002
  assert.equal(ligneA(tl, tl.total), '0002', '2 − 0,666 × 3 = 0,002');
});

// ───────────────────── 4. les deux barres

/**
 * ⚠️ **LA BARRE ÉTAIT DESSINÉE SUR LE DIVIDENDE.** Elle se posait au milieu des
 *   CENTRES de A et de B ; sur `13 │ 5`, ce milieu tombe dans le « 3 ».
 */
test('★ la barre verticale sépare A et B — elle ne mord sur ni l’un ni l’autre', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [12345, 7, 3], [2, 3, 3]]) {
    const { tl } = potence(a, b, d);
    const av = tl.metrics.advance;
    const barre = unique(tl, '@potvert');
    const entieres = parPrefixe(tl, '@potchiffre');
    // le bord droit du dividende : la dernière colonne entière, à sa naissance
    const bordDroit = (entieres.length
      ? Math.max(...entieres.map((n) => n.base.translate.x))
      : tl.nodes.find((n) => n.id === 'a').base.translate.x) + av / 2;
    assert.ok(bordDroit <= barre.base.translate.x,
      `${a} ÷ ${b} : la barre passe sur le dividende`);
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
 * corps de police, quel que soit le nombre de chiffres écrits dessous.
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

// ───────────────────── 5. le rythme

/**
 * > « C'est trop rapide, même en ×0.25 je peine à suivre. Rends l'extraction
 * >   des chiffres 6× plus lente (mais sans ralentir la partie accolade). »
 * >   (l'auteur)
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
 * ★ **UN TOUR VIDE PREND SON TEMPS, LUI AUSSI.** « 5 ne tient pas dans 1 » :
 *   rien ne vole, et c'est ce zéro-là qu'il faut voir s'écrire.
 */
test('le zéro dont personne ne part reste à l’écran le temps qu’on le lise', () => {
  const { tl } = potence(13, 5, 1);
  const zero = canaux(tl, 'q0')[0];
  assert.ok(zero, 'le premier chiffre du quotient a son canal');
  assert.equal(zero.render(0), '0');
  assert.equal(zero.render(1), '0', 'aucun exemplaire ne le fait monter');
  assert.ok(zero.dur >= 600, `il ne dure que ${Math.round(zero.dur)} ms`);
});

// ───────────────────── 6. ce qui reste sur la ligne

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

// ───────────────────── 7. le contrôle croisé, et le refus bruyant

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
