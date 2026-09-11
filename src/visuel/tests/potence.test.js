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
 * > « Elle n'isole pas ce sur quoi elle travaille du reste. […] quand ,0 est
 * >   ajouté au nombre divisé, il faut pousser ce qui précède pour faire la
 * >   place, et que jamais 2 chiffres ne se superposent sur la ligne de
 * >   base. » (l'auteur)
 *
 * D'où la dernière partie : la potence posée ENTRE DEUX VOISINS, et la scène
 * échantillonnée instant par instant.
 *
 * Ce fichier regarde l'ÉCRAN — positions, opacités, instants, textes — et non
 * le calcul, dont le contrôle croisé de la primitive se charge déjà. Chaque
 * test cite l'exigence qu'il tient.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';
import { CompileError } from '../errors.js';
import { resolveDiscrete } from '../clock.js';
import { lecteur } from './_lecteur.js';
import { derouleDeLaDivision, ligneAffichee } from '../primitives/potence.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie } from '../../moteur/etat.js';
import { construireScenario } from '../../recherche/scenario.js';

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

/**
 * La potence du catalogue, posée sur une ligne de nombres — avec des voisins,
 * pour qu'on voie s'ils lui cèdent la place.
 */
function surLaLigne(code, valeurs) {
  const o = PAR_CODE.get(code);
  const avant = { type: 'NUMS', valeur: valeurs, traces: valeurs.map(() => [0, 1]) };
  const apres = appliquer(o, avant);
  assert.ok(apres, `${code} s’applique sur ${valeurs.join(' ')}`);
  const tokens = valeurs.map((v, i) => ({ id: `t${i}`, text: String(v), kind: 'number' }));
  const ctx = { ids: tokens.map((t) => t.id), cle: 'x0', langue: 'fr' };
  const steps = o.steps(avant, apres, ctx);
  return { o, avant, apres, ctx, tokens, steps, tl: compile({ version: 1, tokens, steps }) };
}

/**
 * ★ **LE CHEMIN QUE LE SITE PREND VRAIMENT** — `construireScenario`, et non les
 *   steps de l'opérateur appelés à la main. C'est par là que la potence avait
 *   disparu du site alors que tout compilait (voir `gestes-decrits.test.js`,
 *   section 7). Et `Sept` lu par `tca+masb` donne QUATRE nombres
 *   (`115 101 112 116`) : chaque potence y a des voisins des deux côtés.
 */
function surLeSite(saisie, programme) {
  const ops = programme.split('+').map((c) => PAR_CODE.get(c));
  const etats = [depuisSaisie(saisie)];
  for (const op of ops) {
    const suivant = appliquer(op, etats[etats.length - 1]);
    assert.ok(suivant, `${programme} doit s’appliquer à « ${saisie} »`);
    etats.push(suivant);
  }
  const n = [...saisie].length;
  const sc = construireScenario({ mode: 'DECRET', parts: [{
    fragment: { texte: saisie, offset: 0, longueur: n, intervalles: [[0, n]], famille: 'entier' },
    chemin: { ops, etats },
  }] }, { saisie });
  assert.equal(sc.avertissements, undefined, `${programme} : ${(sc.avertissements || []).join(' | ')}`);
  return { sc, tl: compile(sc) };
}

/**
 * Chaque potence d'un scénario, avec sa fenêtre de temps, son op et ses deux
 * barres — une ligne en porte plusieurs dès qu'elle a plusieurs nombres à
 * diviser.
 */
function potencesDe(scenario, tl) {
  const out = [];
  scenario.steps.forEach((s, i) => {
    const op = (s.ops || []).find((o) => o.op === 'potence');
    if (!op) return;
    const { t0, t1 } = tl.steps[i];
    const nee = (prefixe) => tl.nodes.find((n) => n.id.startsWith(prefixe) && tl.anims.some((a) => a.id === n.id
      && a.prop === 'opacity' && a.delay >= t0 && a.delay < t1));
    out.push({ op, debut: t0, fin: t1, horizontale: nee('@pothoriz'), verticale: nee('@potvert') });
  });
  assert.ok(out.length > 0, 'le scénario doit poser au moins une potence');
  return out;
}

/** Les bancs à voisins : à la main, puis par le chemin du site. */
const BANCS_A_VOISINS = () => [
  ['mdc1 sur 7 135 9', () => { const r = surLaLigne('mdc1', [7, 135, 9]); return { sc: { steps: r.steps }, tl: r.tl }; }],
  ['mdc3 sur 7 23 9', () => { const r = surLaLigne('mdc3', [7, 23, 9]); return { sc: { steps: r.steps }, tl: r.tl }; }],
  ['mdc2 sur 44 23 135 8', () => { const r = surLaLigne('mdc2', [44, 23, 135, 8]); return { sc: { steps: r.steps }, tl: r.tl }; }],
  ['le site : Sept, tca+masb+mdc1', () => surLeSite('Sept', 'tca+masb+mdc1')],
  ['le site : Sept, tca+masb+mdc3', () => surLeSite('Sept', 'tca+masb+mdc3')],
];

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

// L'évaluateur de timeline vit dans `_lecteur.js` : le même œil sert à la
// potence nue et à la potence au bout d'une vraie voie (`liaison.test.js`).

// ───────────────────── 1. la ligne de gauche

/**
 * Les colonnes de gauche, DANS L'ORDRE DE LECTURE : les chiffres du dividende,
 * puis les zéros abaissés. C'est l'ordre de création, et ce n'est pas un
 * hasard — chaque colonne naît à droite de la précédente et n'en change plus.
 * (Le jeton `a` lui-même n'écrit plus rien : il est devenu la PLACE du
 * dividende dans la ligne.)
 */
const colonnesDe = (tl) => [...parPrefixe(tl, '@potchiffre'), ...parPrefixe(tl, '@potdec')];

/** L'instant d'où la ligne s'écrit en colonnes : le début de la potence. */
const tDebut = (tl) => canaux(tl, 'a')[0].at;

/**
 * L'instant où une colonne existe à l'écran : le début pour les chiffres du
 * dividende, sa propre apparition pour un zéro abaissé — il n'était nulle part
 * avant qu'on ne l'abaisse.
 */
const depuis = (tl, n) => (n.id.startsWith('@potdec')
  ? Math.min(...tl.anims.filter((x) => x.id === n.id && x.prop === 'opacity').map((x) => x.delay))
  : tDebut(tl));

/** Ce que la ligne de gauche montre à l'instant `t`, et à quelle échelle. */
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
const valeurA = (tl, t) => {
  const { chiffres, decimales } = etatA(tl, t);
  return Number(chiffres) / 10 ** decimales;
};
const ligneA = (tl, t) => etatA(tl, t).chiffres;

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
    const depart = tDebut(tl);
    let precedent = Infinity;
    for (let k = 0; k <= 400; k++) {
      const t = depart + ((tl.total - depart) * k) / 400;
      const v = valeurA(tl, t);
      assert.ok(v <= precedent,
        `${a} ÷ ${b} : la ligne remonte de ${precedent} à ${v} (t = ${Math.round(t)})`);
      precedent = v;
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
      vus.add(ligneA(tl, tDebut(tl) + ((tl.total - tDebut(tl)) * k) / 600));
    }
    const legitimes = new Set();
    let decimalesVues = 0;
    tours.forEach((tour, i) => {
      if (tour.decimal) decimalesVues += 1;
      const large = tour.decimal ? [...String(a)].length + decimalesVues : i + 1;
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
 */
test('★ ce qui n’est pas en jeu est estompé, et s’éclaire à son tour', () => {
  const { tl } = potence(105, 5, 1);
  const colonnes = parPrefixe(tl, '@potchiffre');
  assert.equal(colonnes.length, 3, '« 105 » s’ouvre en trois colonnes');
  const opacites = (id) => tl.anims
    .filter((x) => x.id === id && x.prop === 'opacity')
    .sort((x, y) => x.delay - y.delay);

  // la première colonne est en jeu d'emblée : elle paraît et ne s'estompe pas
  const premiere = opacites(colonnes[0].id);
  assert.equal(premiere[0].duration, 1, 'elle paraît sans transition, là où son glyphe était');
  assert.ok(premiere.slice(1, -1).every((x) => x.keyframes.at(-1).value === 1),
    'la première colonne ne quitte jamais la pleine encre avant l’effacement');

  for (const [rang, n] of colonnes.slice(1).entries()) {
    const suite = opacites(n.id);
    assert.equal(suite[0].duration, 1, 'aucun fondu à la naissance : le glyphe est déjà là');
    const estompe = suite[1];
    assert.ok(estompe.keyframes.at(-1).value < 0.5,
      `la colonne ${rang + 2} doit s’estomper (${estompe.keyframes.at(-1).value})`);
    assert.ok(estompe.duration > 100, 'et l’estompage se VOIT — c’est lui qui désigne la zone');
    const eclaire = suite[2];
    assert.equal(eclaire.keyframes.at(-1).value, 1);
    assert.ok(eclaire.delay >= estompe.delay + estompe.duration,
      'elle s’éclaire APRÈS s’être estompée, pas pendant');
  }
  const eclairage = (n) => opacites(n.id)[2].delay;
  assert.ok(eclairage(colonnes[1]) < eclairage(colonnes[2]),
    'la zone s’étend vers la droite, un chiffre par tour');
});

/**
 * ★ **UNE COLONNE NE BOUGE JAMAIS PAR RAPPORT À SES VOISINES.** Quand la ligne
 *   s'écarte, le dividende se déplace d'un bloc : entrer en jeu reste un
 *   éclairage, jamais un déplacement.
 */
test('★ les colonnes du dividende se déplacent d’un bloc, jamais l’une sans l’autre', () => {
  for (const [a, b, d] of [[105, 5, 1], [13, 5, 1], [12345, 7, 3]]) {
    const { tl } = potence(a, b, d);
    const lire = lecteur(tl);
    const colonnes = parPrefixe(tl, '@potchiffre');
    const av = tl.metrics.advance;
    for (let k = 0; k <= 300; k++) {
      const t = tDebut(tl) + ((tl.total - tDebut(tl)) * k) / 300;
      const xs = colonnes.map((n) => lire.valeur(n.id, 'translate', t).x);
      for (let c = 1; c < xs.length; c++) {
        assert.ok(Math.abs(xs[c] - xs[c - 1] - av) < 0.01,
          `${a} ÷ ${b} : à t = ${Math.round(t)}, les colonnes ${c} et ${c + 1} ne sont plus à une chasse`);
      }
    }
  }
});

/**
 * ★ **L'EXEMPLAIRE PART DE LA COLONNE OÙ ON LE RETIRE** — celle des unités de la
 *   zone en jeu, c'est-à-dire la dernière éclairée.
 */
test('★ l’exemplaire quitte la colonne des unités de la zone', () => {
  const { tl } = potence(105, 5, 1);
  const lire = lecteur(tl);
  const [, dizaines, unites] = parPrefixe(tl, '@potchiffre');
  const vols = tl.anims
    .filter((x) => x.id.startsWith('@potpaquet') && x.prop === 'translate')
    .sort((x, y) => x.delay - y.delay);
  const colonneDe = (v) => {
    const x = v.keyframes[0].value.x;
    if (Math.abs(x - lire.valeur(dizaines.id, 'translate', v.delay).x) < 0.01) return 'dizaines';
    if (Math.abs(x - lire.valeur(unites.id, 'translate', v.delay).x) < 0.01) return 'unités';
    return '?';
  };
  assert.deepEqual(vols.map(colonneDe), ['dizaines', 'dizaines', 'unités']);
});

// ───────────────────── 3. le « ,0 » qu'on insère

/**
 * > « On décale A sur la gauche pour insérer ",0" à sa droite, AVANT la barre
 * >   verticale qui le sépare de B, et on fait de même sous B (on ajoute
 * >   ",0"). » (l'auteur)
 */
test('★ le « ,0 » s’insère : on POUSSE d’abord, puis la virgule et le zéro s’inscrivent', () => {
  const { tl } = potence(13, 5, 1);
  const lire = lecteur(tl);
  const barre = unique(tl, '@potvert');
  const virguleA = unique(tl, '@potvirga');
  const zero = unique(tl, '@potdec');
  const virguleQ = unique(tl, '@potvirg:');
  const av = tl.metrics.advance;
  const paraitre = (id) => tl.anims.find((x) => x.id === id && x.prop === 'opacity' && x.duration > 1).delay;
  const tInscrit = paraitre(virguleA.id);

  // la poussée : elle finit exactement quand le « ,0 » commence à paraître
  const poussee = tl.anims.find((x) => x.id === barre.id && x.prop === 'translate');
  assert.ok(poussee, 'la barre s’écarte : la place se fait');
  assert.ok(Math.abs(poussee.delay + poussee.duration - tInscrit) < 0.01,
    'on pousse, PUIS on insère — pas l’un pendant l’autre');

  // de part et d'autre de la barre, le dividende et la barre s'éloignent de
  // deux colonnes : la virgule et le zéro
  const ecart = (t) => lire.valeur(barre.id, 'translate', t).x
    - lire.valeur(parPrefixe(tl, '@potchiffre').at(-1).id, 'translate', t).x;
  const recul = ecart(tInscrit) - ecart(poussee.delay);
  assert.ok(Math.abs(recul - 2 * av) < 0.01, `le dividende s’écarte de la barre de ${recul}, pas de deux colonnes`);

  // à droite du dividende, à gauche de la barre — « avant la barre verticale »
  const x = (n) => lire.valeur(n.id, 'translate', tInscrit).x;
  assert.ok(x(virguleA) < x(zero), 'la virgule précède le zéro');
  assert.ok(x(zero) + av / 2 <= x(barre), 'le « ,0 » ne franchit pas la barre');
  assert.equal(zero.text, '0', 'le zéro abaissé naît à zéro : c’est de lui qu’on retirera');

  // « et on fait de même sous B » : la virgule ET le zéro du quotient, ensemble
  assert.equal(paraitre(virguleQ.id), tInscrit, 'les deux virgules paraissent au même instant');
  assert.equal(paraitre('q2'), tInscrit, 'et le zéro du quotient avec elles — un seul geste');
});

/**
 * > « Puis on rajoute un 0 de plus, ce qui donne "0,A0". » (l'auteur)
 */
test('★ chaque décimale suivante ajoute UN zéro, contre la barre, et pousse le reste', () => {
  const { tl } = potence(2, 3, 3);
  const lire = lecteur(tl);
  const barre = unique(tl, '@potvert');
  const zeros = parPrefixe(tl, '@potdec');
  assert.equal(zeros.length, 3, 'trois décimales, trois zéros abaissés');
  // chaque zéro naît à la même distance de la barre : dans la colonne qui la touche
  const distances = zeros.map((z) => {
    const t = Math.min(...tl.anims.filter((x) => x.id === z.id && x.prop === 'opacity').map((x) => x.delay));
    return Math.round((lire.valeur(barre.id, 'translate', t).x - z.base.translate.x) * 100) / 100;
  });
  assert.deepEqual(distances, [distances[0], distances[0], distances[0]]);
  // et la ligne finit sur le reste vrai : 2 − 3 × 0,666 = 0,002
  assert.equal(ligneA(tl, tl.total), '0002', '2 − 0,666 × 3 = 0,002');
});

// ───────────────────── 4. les deux barres

/**
 * > « La barre horizontale de la potence devrait faire la longueur nécessaire
 * >   pour accueillir le diviseur au-dessus […] et le résultat à venir en
 * >   dessous. » (l'auteur)
 */
test('★ la barre horizontale part de la verticale et couvre le diviseur ET tout le quotient', () => {
  for (const [a, b, d] of [[13, 5, 1], [2, 3, 3], [12345, 7, 3], [105, 5, 1], [1234, 87, 2]]) {
    const { tl, tours } = potence(a, b, d);
    const lire = lecteur(tl);
    const av = tl.metrics.advance;
    const horizontale = unique(tl, '@pothoriz');
    const verticale = unique(tl, '@potvert');
    // à la fin du calcul, juste avant l'effacement : tout est écrit
    const tFin = Math.min(...tl.anims
      .filter((x) => x.id === verticale.id && x.prop === 'opacity' && x.keyframes.at(-1).value === 0)
      .map((x) => x.delay)) - 1;
    const h = lire.valeur(horizontale.id, 'translate', tFin).x;
    const gauche = h - horizontale.w / 2;
    const droite = h + horizontale.w / 2;
    assert.ok(Math.abs(gauche - lire.valeur(verticale.id, 'translate', tFin).x) < 0.01,
      `${a} ÷ ${b} : la barre horizontale doit s’arrêter SUR la verticale`);
    const dernier = `q${tours.length - 1}`;
    assert.ok(lire.valeur(dernier, 'translate', tFin).x + av / 2 <= droite,
      `${a} ÷ ${b} : le dernier chiffre du quotient déborde de la barre`);
    const bx = lire.valeur('b', 'translate', tFin).x;
    const wB = [...String(b)].length * av;
    assert.ok(bx + wB / 2 <= droite, `${a} ÷ ${b} : le diviseur déborde de la barre`);
  }
});

/**
 * ⚠️ **LA BARRE ÉTAIT DESSINÉE SUR LE DIVIDENDE.** Elle se posait au milieu des
 *   CENTRES de A et de B ; sur `13 │ 5`, ce milieu tombe dans le « 3 ».
 */
test('★ la barre verticale sépare A et B — elle ne mord sur ni l’un ni l’autre', () => {
  for (const [a, b, d] of [[13, 5, 1], [105, 5, 1], [12345, 7, 3], [2, 3, 3]]) {
    const { tl } = potence(a, b, d);
    const lire = lecteur(tl);
    const verticale = unique(tl, '@potvert');
    const debut = tl.anims.find((x) => x.id === verticale.id && x.prop === 'opacity').delay;
    for (let k = 0; k <= 200; k++) {
      const t = debut + ((tl.total - debut) * k) / 200;
      if (lire.valeur(verticale.id, 'opacity', t) < 0.05) continue;
      const vx = lire.valeur(verticale.id, 'translate', t).x;
      for (const j of lire.visibles(t)) {
        if (j.id.startsWith('@potpaquet') || Math.abs(j.y - lire.valeur('b', 'translate', t).y) > 1) continue;
        assert.ok(j.d <= vx + 0.01 || j.g >= vx - 0.01,
          `${a} ÷ ${b} : à t = ${Math.round(t)}, la barre traverse « ${j.texte} » (${j.id})`);
      }
    }
  }
});

// ───────────────────── 5. la potence entre deux voisins

/**
 * > « Elle n'isole pas ce sur quoi elle travaille du reste. […] jamais 2
 * >   chiffres ne se superposent sur la ligne de base. » (l'auteur)
 *
 * On pose la potence ENTRE deux nombres et on échantillonne la scène en
 * plusieurs centaines d'instants, du début de la potence à la fin : aucun
 * jeton visible n'en chevauche un autre, à AUCUN instant — pas seulement à
 * l'arrivée. Les exemplaires en vol sont exclus, et c'est voulu : ils ne sont
 * pas « posés sur la ligne », ils s'en DÉTACHENT, et naître sur le chiffre dont
 * on les retire est tout le geste.
 */
test('★ entre deux voisins, jamais deux jetons ne se superposent, à aucun instant', () => {
  for (const [nom, banc] of BANCS_A_VOISINS()) {
    const { sc, tl } = banc();
    assert.deepEqual(tl.warnings, [], `${nom} : ${tl.warnings.join(' | ')}`);
    const lire = lecteur(tl);
    for (const { debut, fin } of potencesDe(sc, tl)) {
      const N = 500;
      for (let k = 0; k <= N; k++) {
        const t = debut + ((fin - debut) * k) / N;
        const vus = lire.visibles(t).filter((j) => !j.id.startsWith('@potpaquet'));
        for (let i = 0; i < vus.length; i++) {
          for (let j = i + 1; j < vus.length; j++) {
            const p = vus[i];
            const q = vus[j];
            if (Math.abs(p.y - q.y) >= ((p.h + q.h) / 2) * 0.8) continue;
            const recouvre = Math.min(p.d, q.d) - Math.max(p.g, q.g);
            assert.ok(recouvre <= 0.5,
              `${nom}, t = ${Math.round(t)} : « ${p.texte} » (${p.id}) `
              + `et « ${q.texte} » (${q.id}) se chevauchent de ${recouvre.toFixed(1)}`);
          }
        }
      }
    }
  }
});

/**
 * > « La barre horizontale […] devrait accueillir le diviseur au-dessus (et du
 * >   vide, pas des chiffres qui n'ont rien à voir). » (l'auteur)
 */
test('★ au-dessus de la barre horizontale, il n’y a que le diviseur — et du vide', () => {
  for (const [nom, banc] of BANCS_A_VOISINS()) {
    const { sc, tl } = banc();
    const lire = lecteur(tl);
    const fs = tl.metrics.fontSize;
    for (const { op, debut, fin, horizontale } of potencesDe(sc, tl)) {
      assert.ok(horizontale, `${nom} : chaque potence a sa barre horizontale`);
      for (let k = 0; k <= 400; k++) {
        const t = debut + ((fin - debut) * k) / 400;
        if (lire.valeur(horizontale.id, 'opacity', t) < 0.05) continue;
        const h = lire.valeur(horizontale.id, 'translate', t);
        const g = h.x - horizontale.w / 2;
        const d = h.x + horizontale.w / 2;
        for (const j of lire.visibles(t)) {
          if (j.id === op.diviseur || j.id.startsWith('@potpaquet')) continue;
          const dessus = j.y < h.y && j.y > h.y - fs * 1.6;
          const recouvre = Math.min(j.d, d) - Math.max(j.g, g);
          assert.ok(!(dessus && recouvre > 0.5),
            `${nom}, t = ${Math.round(t)} : « ${j.texte} » (${j.id}) occupe l’espace au-dessus de la barre`);
        }
      }
    }
  }
});

/**
 * ★ **LA PLACE SE FAIT AVANT QUE LE QUOTIENT NE S'ÉCRIVE, ET SE REND APRÈS.**
 *   Le voisin de droite est poussé au-delà de la barre avant le premier chiffre
 *   du quotient ; le voisin de gauche recule quand « ,0 » s'ajoute ; et quand
 *   le quotient redescend, la ligne se referme : les écarts redeviennent ceux
 *   de la ligne.
 */
test('★ les voisins cèdent la place le temps de la potence, puis la ligne se referme', () => {
  const { tl, o, avant, apres, ctx } = surLaLigne('mdc1', [7, 135, 9]);
  const lire = lecteur(tl);
  const av = tl.metrics.advance;
  const horizontale = unique(tl, '@pothoriz');
  const virguleA = unique(tl, '@potvirga');
  const tQuotient = tl.anims.find((x) => x.id === 'x0c1x0' && x.prop === 'opacity').delay;

  // à droite : poussé au-delà du bout de la barre avant le premier chiffre
  const bout = lire.valeur(horizontale.id, 'translate', tQuotient).x + horizontale.w / 2;
  assert.ok(lire.valeur('t2', 'translate', tQuotient).x - av / 2 >= bout,
    'le 9 doit être poussé au-delà de la barre AVANT que le quotient ne s’écrive');

  // à gauche : il recule pendant la poussée qui précède le « ,0 »
  const tInscrit = tl.anims.find((x) => x.id === virguleA.id && x.prop === 'opacity' && x.duration > 1).delay;
  const poussee = tl.anims.find((x) => x.id === 't0' && x.prop === 'translate'
    && Math.abs(x.delay + x.duration - tInscrit) < 0.01);
  assert.ok(poussee, 'le 7 est poussé au moment où « ,0 » a besoin de place');
  assert.ok(poussee.keyframes.at(-1).value.x < poussee.keyframes[0].value.x, 'vers la gauche');

  // et à la fin, la ligne se referme sur le quotient, dans l'ordre déclaré
  assert.deepEqual(tl.scene.flow, [...o.sortie(avant, apres, ctx)]);
  const fin = tl.scene.flow.map((id) => tl.scene.pos(id));
  for (let i = 1; i < fin.length; i++) {
    const vide = (fin[i].x - fin[i].w / 2) - (fin[i - 1].x + fin[i - 1].w / 2);
    assert.ok(Math.abs(vide - tl.layoutOpts.gap) < 0.01,
      `écart ${vide} entre ${tl.scene.flow[i - 1]} et ${tl.scene.flow[i]} : la ligne ne s’est pas refermée`);
  }
});

// ───────────────────── 6. le rythme

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

/** « 5 ne tient pas dans 1 » : rien ne vole, et c'est ce zéro-là qu'on lit. */
test('le zéro dont personne ne part reste à l’écran le temps qu’on le lise', () => {
  const { tl } = potence(13, 5, 1);
  const zero = canaux(tl, 'q0')[0];
  assert.ok(zero, 'le premier chiffre du quotient a son canal');
  assert.equal(zero.render(0), '0');
  assert.equal(zero.render(1), '0', 'aucun exemplaire ne le fait monter');
  assert.ok(zero.dur >= 600, `il ne dure que ${Math.round(zero.dur)} ms`);
});

// ───────────────────── 7. ce qui reste sur la ligne

/**
 * ⚠️ **LA PLACE DU QUOTIENT SE LIT AVANT LA MISE À MORT.** `flowIndex` d'un
 *   jeton retiré du flux rend `-1` : le quotient s'ajoutait alors EN FIN DE
 *   LIGNE.
 */
test('★ le quotient prend la place du dividende dans la ligne, pas la dernière', () => {
  const { tl, o, avant, apres, ctx } = surLaLigne('mdc1', [135, 7]);
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
  const derniere = (id, prop) => tl.anims
    .filter((x) => x.id === id && x.prop === prop)
    .sort((x, y) => x.delay - y.delay)
    .pop();
  const sortie = derniere(virguleQ.id, 'opacity');
  const montee = derniere('q0', 'translate');
  assert.ok(montee, 'le quotient rejoint la ligne');
  assert.equal(sortie.delay, montee.delay, 'la virgule s’éteint au départ de la montée');
  assert.ok(sortie.delay + sortie.duration <= montee.delay + montee.duration + 1,
    'et elle a fini de s’éteindre quand la ligne est refermée');
  for (const id of tl.scene.flow) {
    assert.match(tl.nodes.find((n) => n.id === id).text, /^[0-9]$/);
  }
});

// ───────────────────── 8. le contrôle croisé, et le refus bruyant

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
