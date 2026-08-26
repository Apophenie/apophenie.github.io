/**
 * ★ LE BARÈME DE FORMATION DES TITRES — ce que `titres.js` promet, mesuré.
 *
 * Trois invariants, et un seul motif : un titre sert à CHOISIR une voie dans
 * une liste, pas à en connaître d'avance la conclusion.
 *
 *   1. il ne divulgue jamais le résultat (plus de mention d'assemblage) ;
 *   2. il est une locution prépositionnelle soudée, sans tiret cadratin ;
 *   3. il reste unique dans une liste, et jamais au prix d'une suite de codes.
 *
 * Les tables sont vérifiées EXHAUSTIVES contre le catalogue : c'est le seul
 * moyen qu'un opérateur ajouté demain n'entre pas dans un titre sous sa forme
 * longue de Registre, « — On ne garde que les consonnes », sans que personne
 * ne le remarque.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { NOMS, QUALIFIANTS, PRECISIONS, precisionDe, titreApproche, distinguerTitres } from '../titres.js';
import { creerMoteur } from '../index.js';
import { catalogue } from './_catalogue.js';
import { CATALOGUE } from '../../moteur/catalogue.js';

const SAISIES = [
  'hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Millicent', 'Macron',
  'Donald Trump', 'numherololgeek', 'jean-michel', 'satan',
  'Le chat dort sur le tapis rouge', 'https://www.example.com/path/to/page',
];

/** Tous les titres produits par le moteur sur le corpus, dans les deux langues. */
function tousLesTitres() {
  const m = creerMoteur(catalogue);
  const out = [];
  for (const s of SAISIES) {
    for (const a of m.resoudre(s).approches) {
      out.push({ saisie: s, fr: titreApproche(a, 'fr'), en: titreApproche(a, 'en'), approche: a });
    }
  }
  return out;
}

/* ═══════════════════ 1. exhaustivité des tables ═══════════════════ */

/**
 * ★ Chaque opérateur du catalogue a sa FORME COURTE.
 *
 * `precisionDe` se replie sur `op.libelle` pour ne jamais rendre un titre vide.
 * Ce repli est un filet, pas un mode de fonctionnement : le `libelle` est une
 * phrase complète (« On ne garde que les consonnes ») et, soudé dans un titre,
 * il rend exactement la ligne à rallonge qu'on vient de supprimer. Un opérateur
 * neuf sans entrée dans `PRECISIONS` fait donc échouer ce test plutôt que de
 * dégrader silencieusement une ligne du listing.
 */
test('★ titres — chaque opérateur du catalogue a sa forme courte', () => {
  const manquants = CATALOGUE.filter((o) => !PRECISIONS[o.id]).map((o) => `${o.code} (${o.id})`);
  assert.deepEqual(manquants, [], `sans forme courte : ${manquants.join(', ')}`);
  // Et aucune entrée orpheline : une précision qui ne correspond plus à aucun
  // opérateur est du texte mort qu'on croira maintenu.
  const ids = new Set(CATALOGUE.map((o) => o.id));
  const orphelines = Object.keys(PRECISIONS).filter((id) => !ids.has(id));
  assert.deepEqual(orphelines, [], `précisions orphelines : ${orphelines.join(', ')}`);
});

/**
 * Tout opérateur capable de donner son NOM à une méthode en a un. Les filtres
 * ordinaires n'en ont pas besoin — ils ne passent jamais vedette tant qu'une
 * mesure, un mappeur ou un combinateur est présent, et un chemin qui finit sur
 * un `NUM` en contient forcément un.
 */
test('★ titres — chaque vedette possible a son nom prépositionnel', () => {
  const VEDETTES = new Set(['mappeur', 'mesure', 'combinateur', 'decoupe', 'joker']);
  const manquants = CATALOGUE
    .filter((o) => (VEDETTES.has(o.famille) || o.isJoker) && !NOMS[o.id])
    .map((o) => `${o.code} (${o.id})`);
  assert.deepEqual(manquants, [], `sans nom de vedette : ${manquants.join(', ')}`);
});

/* ═══════════════════ 2. la forme ═══════════════════ */

/**
 * ★ UN TITRE NE DIVULGUE PAS SON RÉSULTAT.
 *
 * C'est la décision qui a motivé toute la refonte : « n'indique pas le résultat
 * dedans — pas de "les 6 groupés par trois" ni de "deux séries de 666" ». Le
 * compte de séries n'a pas disparu du site, il a changé de place : il s'affiche
 * dans le listing, sur le bord droit du panneau, là où il aide à choisir et où
 * l'on n'a encore rien vu (`src/app/pages/resultat.js`).
 *
 * Le motif traque le vocabulaire du verdict, pas un titre précis : c'est ce qui
 * le rend utile à la prochaine mention qu'on serait tenté d'ajouter.
 */
test('★ titres — jamais le résultat dans le nom de la voie', () => {
  const divulgue = {
    fr: /666|6⋅6⋅6|séries?\b|groupés|convergent|trois fois|d’un seul tenant/i,
    en: /666|6⋅6⋅6|runs? of|grouped|converge|three times|in one go/i,
  };
  const titres = tousLesTitres();
  assert.ok(titres.length >= 40, `seulement ${titres.length} titres examinés`);
  for (const t of titres) {
    for (const langue of ['fr', 'en']) {
      assert.ok(!divulgue[langue].test(t[langue]),
        `« ${t.saisie} » (${langue}) : le titre annonce le résultat — ${t[langue]}`);
    }
  }
});

/**
 * ★ Plus de tiret cadratin : c'est lui qui faisait du titre une glose, et d'une
 * glose une énumération. Les deux seules jointures admises sont l'espace (la
 * précision complète le nom) et la virgule (le qualifiant ouvre un second
 * membre) — voir `assembler`.
 */
test('★ titres — une locution soudée, pas une glose derrière un tiret', () => {
  for (const t of tousLesTitres()) {
    for (const langue of ['fr', 'en']) {
      assert.ok(!t[langue].includes('—'),
        `« ${t.saisie} » (${langue}) : tiret cadratin dans un titre — ${t[langue]}`);
      assert.equal(t[langue], t[langue].trim(), `espaces parasites — ${t[langue]}`);
      // Une capitale initiale, et une seule ligne.
      assert.match(t[langue], /^[A-ZÀ-ÖØ-Þ]/u, `pas de capitale initiale — ${t[langue]}`);
    }
  }
});

/**
 * ★ La forme est PRÉPOSITIONNELLE, plus nominale. Un titre ne s'ouvre donc plus
 * sur un article défini — « La gématrie anglaise », « L'affichage à quatorze
 * segments » — mais sur la préposition qui dit par quel chemin on passe.
 *
 * Deux exceptions assumées, et elles sont dans la table : les DÉCOUPES, déjà
 * adverbiales (« Lettre à lettre »), et `m.retirerZeros` (« Sans les zéros »),
 * qui est une privation, pas un moyen.
 */
test('★ titres — la forme prépositionnelle, jamais l’article défini', () => {
  const article = /^(Le |La |Les |L’|The )/;
  const fautifs = Object.entries(NOMS)
    .filter(([, n]) => article.test(n.fr) || article.test(n.en))
    .map(([id, n]) => `${id} : ${n.fr} / ${n.en}`);
  assert.deepEqual(fautifs, [], `noms encore nominaux : ${fautifs.join(' | ')}`);
});

/**
 * ★ L'anglais subit la MÊME transformation, il n'est pas une décalque.
 * Un couple identique dans les deux langues signale une traduction oubliée —
 * il n'y a ici aucune notation qui pourrait légitimement l'être.
 */
test('★ titres — les deux langues sont écrites, pas recopiées', () => {
  for (const [table, nom] of [[NOMS, 'NOMS'], [PRECISIONS, 'PRECISIONS']]) {
    for (const [id, v] of Object.entries(table)) {
      assert.equal(typeof v.fr, 'string', `${nom}.${id}.fr`);
      assert.equal(typeof v.en, 'string', `${nom}.${id}.en`);
      assert.ok(v.fr.length > 2 && v.en.length > 2, `${nom}.${id} : trop court`);
      assert.notEqual(v.fr, v.en, `${nom}.${id} : le français et l’anglais sont identiques`);
    }
  }
  for (const [id, [, v]] of Object.entries(QUALIFIANTS)) {
    assert.notEqual(v.fr, v.en, `QUALIFIANTS.${id} : le français et l’anglais sont identiques`);
  }
});

/**
 * ★ Typographie française : apostrophe courbe, fine insécable devant la
 * ponctuation haute, guillemets à chevrons. Les tables sont du texte affiché au
 * même titre que `src/i18n/fr.js`, elles suivent la même règle.
 */
test('★ titres — la typographie française des tables', () => {
  const FINE = ' ';
  const toutes = [
    ...Object.entries(NOMS).map(([id, v]) => [`NOMS.${id}`, v]),
    ...Object.entries(PRECISIONS).map(([id, v]) => [`PRECISIONS.${id}`, v]),
    ...Object.entries(QUALIFIANTS).map(([id, [, v]]) => [`QUALIFIANTS.${id}`, v]),
  ];
  for (const [chemin, v] of toutes) {
    assert.ok(!v.fr.includes("'"), `${chemin} : apostrophe droite en français — ${v.fr}`);
    assert.ok(!/ [!?;:]/.test(v.fr), `${chemin} : espace ordinaire avant ponctuation haute — ${v.fr}`);
    assert.ok(!v.fr.includes('"'), `${chemin} : guillemets droits en français — ${v.fr}`);
    assert.ok(!v.en.includes(FINE), `${chemin} : fine insécable française en anglais — ${v.en}`);
    // Les chevrons français appellent la fine ; les guillemets anglais, rien.
    if (v.fr.includes('«')) {
      assert.ok(v.fr.includes('«' + FINE) || v.fr.includes('« '), `${chemin} : chevron sans espace — ${v.fr}`);
    }
  }
});

/* ═══════════════════ 3. l'unicité, sous tension ═══════════════════ */

/**
 * ★ LE MÉCANISME DE DISTINCTION PORTE PLUS LOURD QU'AVANT.
 *
 * La mention d'assemblage distinguait gratuitement deux voies qui ne
 * différaient que par leur récolte — « deux séries de 666 » contre « les 6
 * groupés par trois ». Elle a disparu ; ces voies-là sont désormais homonymes
 * et redescendent dans `distinguerTitres`, dont l'échelle de recours doit tenir
 * seule. Ce test vérifie qu'elle tient, ET qu'elle ne tient pas grâce au
 * dernier recours (la suite des codes), qui n'apprend rien à personne.
 */
test('★ titres — uniques dans la liste, et sans jamais montrer la plomberie', () => {
  const plomberie = /\b[a-z][0-9a-z]\+[a-z][0-9a-z]/;
  const m = creerMoteur(catalogue);
  let vus = 0;
  for (const s of SAISIES) {
    const approches = m.resoudre(s).approches;
    for (const langue of ['fr', 'en']) {
      const titres = approches.map((a) => titreApproche(a, langue));
      assert.equal(new Set(titres).size, titres.length,
        `« ${s} » (${langue}) : doublon — ${titres.join(' | ')}`);
      for (const t of titres) {
        vus++;
        assert.ok(!plomberie.test(t), `« ${s} » (${langue}) : suite de codes en guise de nom — ${t}`);
      }
    }
  }
  assert.ok(vus >= 80, `seulement ${vus} titres examinés`);
});

/**
 * La distinction se soude au nom : c'est un FRAGMENT, jamais une phrase de
 * Registre. Aucun `libelle` de catalogue ne doit donc réapparaître tel quel
 * dans un titre — ils commencent tous par « On » ou par un article.
 */
test('★ titres — la distinction est un fragment, pas une phrase de Registre', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES) {
    const approches = distinguerTitres(m.resoudre(s).approches);
    for (const a of approches) {
      if (!a.distinction) continue;
      const fr = a.distinction.fr ?? a.distinction;
      assert.ok(!/^On /.test(fr), `« ${s} » : distinction en phrase — ${fr}`);
      // Minuscule initiale : le fragment se soude derrière le nom, il ne
      // recommence pas la ligne. Les noms propres qu'il contient (« après un
      // Atbash ») restent capitalisés à leur place, pas en tête.
      assert.ok(!/^[A-Z]/.test(fr), `« ${s} » : distinction capitalisée — ${fr}`);
    }
  }
});

/** `precisionDe` ne rend jamais rien : c'est le contrat du repli. */
test('titres — `precisionDe` a toujours quelque chose à dire', () => {
  for (const op of CATALOGUE) {
    const p = precisionDe(op);
    assert.ok(p && (typeof p === 'string' || p.fr), `${op.code} : aucune forme courte`);
  }
  assert.equal(precisionDe(null), null);
});
