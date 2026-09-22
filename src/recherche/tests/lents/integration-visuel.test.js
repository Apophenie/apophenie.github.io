// Intégration réelle : les scénarios émis par `scenario.js` sont compilés par
// le COMPILATEUR DU MOTEUR VISUEL (`src/visuel/compile.js`), pas par un double.
//
// C'est le seul test qui prouve que le pont arithmétique ↔ visuel tient : il
// vérifie les invariants dynamiques que la validation statique ne peut pas voir
// (3 — ids vivants au bon instant, 4 — id créé jamais recréé, 6 — durée
// compilée ≥ 16 ms) et les garde-fous de cohérence des primitives (« le moteur
// visuel refuse d'afficher un calcul faux »).
//
// Si `src/visuel/` n'existe pas encore (agent en cours d'écriture), le test se
// déclare ignoré plutôt que d'échouer : il n'appartient pas au moteur de
// recherche de faire échouer la suite sur l'absence d'un module voisin.

import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur } from '../../index.js';
import { suivreLaLigne } from '../../scenario.js';
import { lire as lireUrl } from '../../url.js';
import { encoderTexte } from '../../base58.js';
import { catalogue } from '../_catalogue.js';
import { PAR_CODE, appliquer } from '../../../moteur/catalogue.js';
import { depuisSaisie, nums } from '../../../moteur/etat.js';

let compile = null;
let TOKEN_GAP = 6;
let setGlyphes = null;
let GLYPHES = null;
let Scene = null;
try {
  ({ compile } = await import('../../../visuel/compile.js'));
  ({ setGlyphes } = await import('../../../visuel/glyphes.js'));
  ({ GLYPHES } = await import('../../../moteur/tables/glyphes.js'));
  ({ Scene } = await import('../../../visuel/scene.js'));
  ({ TOKEN_GAP } = await import('../../../visuel/constants.js'));
  setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');
} catch {
  compile = null;
}

/**
 * ★ L'INSTRUMENT — relever la LIGNE du moteur visuel, step par step.
 *
 * `compile()` ne rend pas la scène : elle rend une timeline. Or ce qu'on veut
 * comparer ici est un état intermédiaire de la scène — le flux de layout à
 * l'entrée de chaque step. On pose donc un mouchard sur le seul point qui soit
 * appelé UNE fois par step, avant ses ops : `scene.oublierAncres()`
 * (`visuel/compile.js`, « les promesses d'accolade ne valent que pour le geste
 * en cours »).
 *
 * ★ C'est un instrument de MESURE, pas un double : il ne remplace aucun
 * comportement, il observe le vrai. Et il est rendu au propre dans tous les
 * cas — une prothèse de test qui survivrait au test contaminerait les suivants.
 */
function relever(sc, options) {
  const releves = [];
  const original = Scene.prototype.oublierAncres;
  Scene.prototype.oublierAncres = function mouchard() {
    // La file des jetons vivants, ET l'écart qui précède chacun : c'est le
    // second qui distingue « 666 » de « 6 6 6 » quand la première est
    // identique. `TOKEN_GAP` est l'écart ordinaire ; au-delà, quelque chose
    // s'ouvre — c'est ce que `suivreLaLigne` appelle une frontière.
    releves.push({
      ids: this.flow.slice(),
      frontieres: new Set(this.flow.filter((id) => {
        const g = this.get(id).gapBefore;
        return g !== undefined && g > TOKEN_GAP;
      })),
    });
    return original.call(this);
  };
  try {
    compile(sc, options);
  } finally {
    Scene.prototype.oublierAncres = original;
  }
  return releves;
}

const SAISIES = [
  'https://hope-hope-hope.fr/',
  'hope',
  'macron',
  '42',
  '666',
  'jean-michel',
  'Éléonore à Nîmes',
  'https://www.example.com/path/to/page',
];

test('intégration — chaque scénario émis compile dans le moteur visuel réel', { skip: compile ? false : 'src/visuel/ absent' }, () => {
  const m = creerMoteur(catalogue);
  let compiles = 0;
  const avertis = [];
  const refus = [];
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      let sc;
      try {
        sc = m.scenarioDe(a, { saisie: r.saisie });
      } catch (err) {
        refus.push(`${s} #${a.rang} (${a.codes}) : ${err.message.slice(0, 120)}`);
        continue;
      }
      const tl = compile(sc);
      assert.ok(tl.total > 0, `${s} #${a.rang} : durée totale nulle`);
      assert.equal(tl.steps.length, sc.steps.length);
      for (let i = 1; i < tl.bounds.length; i++) {
        assert.ok(tl.bounds[i] > tl.bounds[i - 1], `${s} #${a.rang} : charnières confondues`);
      }
      if (tl.warnings.length) avertis.push(`${s} #${a.rang} : ${tl.warnings.join(' | ')}`);
      compiles++;
    }
  }
  console.log(`    ${compiles} scénarios compilés par src/visuel/compile.js`);
  if (refus.length) console.log(`    ${refus.length} approche(s) écartée(s) :\n      ${refus.join('\n      ')}`);
  console.log(`    ${avertis.length} scénario(s) avec avertissement de compilation`
    + ' (steps fournis par le catalogue — voir le test suivant)');
  assert.equal(refus.length, 0, 'aucune approche proposée ne doit être irrendable');
});

/**
 * Les avertissements « animations concurrentes » observés ci-dessus viennent des
 * `steps()` du catalogue, pas de l'émission générique. Ce test le PROUVE : en
 * privant les opérateurs de leur `steps()`, tout passe par `scenario.js`, et
 * plus aucun avertissement ne subsiste.
 */
test('★ intégration — la figure du Registre traverse le compilateur intacte',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    // Le Registre lit `lecteur.steps`, c'est-à-dire la sortie de `compile()` —
    // pas le scénario brut. Une figure perdue en route rendrait le Registre
    // muet là où la scène montre un afficheur (CONTRACTS §6).
    const m = creerMoteur(catalogue);
    // La saisie est celle du README, et non plus le seul mot « hope ».
    //
    // Depuis la suppression du triplement (`assemblage.js`), un mot isolé n'est
    // plus démontrable par « un 6 recopié trois fois » : ce qui lui reste est le
    // GROUPEMENT, et sur quatre lettres seul le quatorze segments donne assez de
    // 6. Le sept segments, lui, reste offert dès que la saisie porte trois
    // morceaux — c'est la méthode 5 du README, sur `hope-hope-hope`. Le test
    // vérifie le passage de la FIGURE par le compilateur ; il n'a jamais eu à
    // dire sur quelle saisie une méthode donnée devait être proposée.
    const r = m.resoudre('https://hope-hope-hope.fr/');
    const a = r.approches.find((x) => x.codes && x.codes.includes('m7F'))
      || r.approches.find((x) => x.codes && x.codes.includes('m7'));
    assert.ok(a, 'aucune approche sept segments dans les résultats de « hope-hope-hope »');
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    const avecFigure = sc.steps.filter((st) => st.figure);
    assert.ok(avecFigure.length, 'le scénario n’émet aucune figure');
    const tl = compile(sc);
    sc.steps.forEach((st, i) => {
      assert.deepEqual(tl.steps[i].figure, st.figure ?? null,
        `step ${i} : la figure ne survit pas à la compilation`);
    });
    for (const st of avecFigure) {
      // ★ LE TYPE DE LA FIGURE EST CELUI DE L'OP QUI L'ÉMET, et on le lit sur
      //   le step plutôt que de le figer. Ce test épinglait `seg7` parce que
      //   l'approche trouvée n'employait qu'un afficheur ; depuis que les
      //   morceaux de même méthode sont joués ensemble, l'approche retenue en
      //   mêle deux — sept segments sur un morceau, quatorze sur un autre —,
      //   et exiger `seg7` partout revenait à geler quelle voie sort du
      //   classement, ce qui n'est pas l'objet de ce test.
      // La figure et l'op qui l'émet vont ENSEMBLE : sept segments pour
      // `sevenSeg`, quatorze pour `fourteenSeg`. On lit le couple sur le step
      // plutôt que d'en figer un — depuis que les morceaux de même méthode
      // sont joués ensemble, une même approche en mêle les deux.
      const nomOp = st.figure.type === 'seg14' ? 'fourteenSeg' : 'sevenSeg';
      const op = st.ops.find((o) => o.op === nomOp);
      assert.ok(op, `une figure ${st.figure.type} sans op ${nomOp}`);
      assert.ok(st.figure.glyphe, 'figure sans glyphe à afficher');
      assert.ok(st.figure.texte.trim(), 'figure sans équivalent en une ligne');
      // Contrôle croisé : le nombre de la figure est celui que la primitive
      // fait descendre — jamais une valeur saisie à part.
      assert.equal(String(op.to.text), String(st.figure.valeur));
      assert.deepEqual(op.segments, st.figure.segments);
      assert.equal(op.count, st.figure.valeur);
    }
  });

test('intégration — l’émission générique ne produit AUCUN avertissement', { skip: compile ? false : 'src/visuel/ absent' }, () => {
  const sansSteps = {
    operateurs: (catalogue.operateurs || catalogue).map((o) => {
      const c = { ...o };
      delete c.steps;
      delete c.sortie;
      return c;
    }),
  };
  const m = creerMoteur(sansSteps);
  let n = 0;
  for (const s of SAISIES) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      const sc = m.scenarioDe(a, { saisie: r.saisie });
      const tl = compile(sc);
      assert.deepEqual(tl.warnings, [], `${s} #${a.rang} (${a.codes})`);
      n++;
    }
  }
  console.log(`    ${n} scénarios génériques compilés sans le moindre avertissement`);
});

/**
 * ★ Le vocabulaire des ops existe en TROIS exemplaires — le contrat
 * (CONTRACTS §3.1), `src/visuel/constants.js › OP_NAMES` et
 * `src/recherche/scenario.js › VOCABULAIRE` —, parce que l'agent heuristique ne
 * dépend pas du moteur visuel. Trois copies, c'est trois occasions de diverger,
 * et la divergence ne fait ÉCHOUER personne : elle fait retomber en silence sur
 * le rendu générique. Ce test est le seul endroit où les deux se regardent.
 */
test('★ intégration — les deux copies du vocabulaire d’ops coïncident',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { OP_NAMES } = await import('../../../visuel/constants.js');
    const { VOCABULAIRE } = await import('../../scenario.js');
    assert.deepEqual([...VOCABULAIRE].sort(), [...OP_NAMES].sort());
  });

/**
 * ★ **LA SECONDE PAIRE DE JUMELLES : « ne refait pas la mise en page ».**
 *
 * `recherche/scenario.js › SANS_LAYOUT` s'en sert pour n'autoriser qu'une op
 * géométrique par step ; `visuel/rythme.js › MARQUES` s'en sert pour décider ce
 * que le rythme gouverne — une op qui ne transforme pas la ligne DÉSIGNE, et une
 * désignation n'attend pas son tour (deux étiquettes « MAX » et « MIN » posées
 * l'une après l'autre à 4,6 s d'écart seraient absurdes).
 *
 * C'est la même propriété, lue deux fois, pour la même raison que le
 * vocabulaire d'ops : l'agent heuristique ne dépend pas du moteur visuel
 * (CONTRACTS §1). Et comme pour le vocabulaire, la divergence ne ferait ÉCHOUER
 * personne — elle changerait silencieusement le rythme d'une op. Ce test est le
 * seul endroit où les deux se regardent.
 */
test('★ intégration — les deux copies des ops « sans mise en page » coïncident',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { MARQUES } = await import('../../../visuel/rythme.js');
    const { SANS_LAYOUT } = await import('../../scenario.js');
    assert.deepEqual([...MARQUES].sort(), [...SANS_LAYOUT].sort());
  });

test('★ intégration — la figure quatorze segments traverse elle aussi le compilateur',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const r = m.resoudre('hope');
    const a = r.approches.find((x) => x.codes && (x.codes.includes('m14') || x.codes.includes('m14F')));
    assert.ok(a, 'aucune approche quatorze segments dans les résultats de « hope »');
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    const avecFigure = sc.steps.filter((st) => st.figure && st.figure.type === 'seg14');
    assert.ok(avecFigure.length, 'le scénario n’émet aucune figure quatorze segments');
    const tl = compile(sc);
    sc.steps.forEach((st, i) => {
      assert.deepEqual(tl.steps[i].figure, st.figure ?? null,
        `step ${i} : la figure ne survit pas à la compilation`);
    });
    for (const st of avecFigure) {
      assert.ok(st.figure.glyphe, 'figure sans glyphe à afficher');
      assert.ok(st.figure.texte.trim(), 'figure sans équivalent en une ligne');
      // Le geste dédié est bien là — pas une substitution déguisée.
      const op = st.ops.find((o) => o.op === 'fourteenSeg');
      assert.ok(op, 'une figure quatorze segments sans op fourteenSeg : rendu générique');
      assert.equal(String(op.to.text), String(st.figure.valeur));
      assert.deepEqual(op.segments, st.figure.segments);
      assert.equal(op.count, st.figure.valeur);
    }
  });

test('intégration — le scénario passe aussi la validation statique du moteur visuel', { skip: compile ? false : 'src/visuel/ absent' }, async () => {
  const { validateScenario } = await import('../../../visuel/scenario.js');
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const a of r.approches) {
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    assert.doesNotThrow(() => validateScenario(sc), `#${a.rang} (${a.codes})`);
  }
});


/**
 * ★ **PLUS AUCUNE ÉTAPE NE S'ACCÉLÈRE TOUTE SEULE.**
 *
 * Il y avait ici deux tests de l'accélération des redites : « elle ne change
 * QUE les durées » (mêmes steps, mêmes titres, mêmes valeurs d'arrivée, mêmes
 * charnières distinctes) et « les trois “hope” ne se lisent qu'une fois en
 * entier » (plus d'un tiers de temps gagné sur la méthode 5 du README).
 *
 * Le mode est retiré — le curseur de vitesse globale le rend inutile, et le
 * raisonnement complet est en tête de `src/visuel/compile.js`. Ce test-ci est
 * son NON-RETOUR, sur le vrai corpus plutôt que sur un scénario de laboratoire :
 * sur chaque approche de chaque saisie, deux étapes qui portent le même geste
 * doivent durer la même chose. Une réintroduction silencieuse de l'heuristique
 * se verrait ici avant de se voir à l'écran.
 */
test('★ intégration — deux étapes de même geste durent le même temps',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    let compares = 0;
    let familles = 0;
    for (const s of SAISIES) {
      const r = m.resoudre(s);
      for (const a of r.approches) {
        let sc;
        try { sc = m.scenarioDe(a, { saisie: r.saisie }); } catch { continue; }
        const tl = compile(sc);

        // Aucun résidu du mode : ni sur la timeline, ni sur les steps.
        assert.ok(!('repeatSpeed' in tl), `${s} #${a.rang} : « repeatSpeed » survit`);
        for (const st of tl.steps) {
          assert.ok(!('accelerated' in st), `${s} #${a.rang} : « accelerated » survit`);
          assert.ok(!('repeatOf' in st), `${s} #${a.rang} : « repeatOf » survit`);
        }

        // Le regroupement par GESTE : la suite des noms d'ops du step, doublée
        // de leurs instants et durées déclarés. C'est ce que l'ancien détecteur
        // appelait le « type » d'un step — deux steps de même type et de même
        // contenu temporel n'ont aucune raison de durer différemment.
        const parGeste = new Map();
        sc.steps.forEach((st, i) => {
          const cle = JSON.stringify((st.ops || []).map((o) => [o.op, o.at ?? 0, o.dur ?? null, o.stagger ?? 0]))
            + `|${st.duration ?? ''}|${st.hold ?? ''}`;
          if (!parGeste.has(cle)) parGeste.set(cle, []);
          parGeste.get(cle).push(i);
        });
        for (const [, indices] of parGeste) {
          if (indices.length < 2) continue;
          familles++;
          const duree = tl.steps[indices[0]].duration;
          for (const i of indices.slice(1)) {
            compares++;
            assert.ok(Math.abs(tl.steps[i].duration - duree) < 1e-6,
              `${s} #${a.rang} : étapes ${indices[0]} et ${i} portent le même geste `
              + `mais durent ${duree} ms et ${tl.steps[i].duration} ms`);
          }
        }
      }
    }
    assert.ok(familles > 0,
      'aucune famille d’étapes de même geste dans tout le jeu d’essai — le test ne mesure rien');
    console.log(`    ${familles} familles d’étapes de même geste, ${compares} comparaisons de durée`);
  });

/**
 * ★ LA LIGNE REJOUÉE EST LA VRAIE LIGNE — mesuré, pas affirmé.
 *
 * `recherche/scenario.js › suivreLaLigne` rejoue la suite ordonnée des jetons
 * vivants pour savoir OÙ trois 6 deviennent contigus, et donc où poser un
 * couronnement (`couronnerLesTriptyques`). C'est un double du modèle de scène,
 * et un double non mesuré est une bombe à retardement : le jour où il dérive,
 * ce n'est pas un test qui casse, c'est la compilation qui échoue AU CLIC de
 * l'utilisateur — `visuel/primitives/horns.js` refusant, à juste titre, de
 * couronner trois 6 qui ne se touchent pas.
 *
 * Le contrat est donc énoncé ici et vérifié sur tout le jeu d'essai : tant que
 * la ligne rejouée n'est pas `null`, elle est IDENTIQUE — mêmes identifiants,
 * même ordre — au `scene.flow` du moteur visuel à l'entrée du step suivant.
 * Et `null` reste permis : c'est la manière dont le rejeu déclare forfait, et
 * ce forfait est un refus de couronner, jamais une supposition.
 */
test('intégration — la ligne rejouée par le moteur de recherche est celle du moteur visuel',
  { skip: compile && Scene ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    let comparees = 0;
    let renoncements = 0;
    for (const s of SAISIES) {
      const r = m.resoudre(s);
      for (const a of r.approches) {
        let sc;
        try { sc = m.scenarioDe(a, { saisie: r.saisie }); } catch { continue; }
        const releves = relever(sc);
        assert.equal(releves.length, sc.steps.length, `${s} #${a.rang} : relevé incomplet`);
        const rejeu = suivreLaLigne(sc.tokens, sc.steps);
        for (let i = 0; i + 1 < sc.steps.length; i++) {
          if (rejeu[i] === null) { renoncements++; break; }
          assert.deepEqual(rejeu[i].ids, releves[i + 1].ids,
            `${s} #${a.rang} (${a.codes}) — ligne après l’étape ${i + 1} « ${sc.steps[i].title} »`);
          // ★ Et les FRONTIÈRES avec, à l'identique. Le rejeu ne modélise que
          //   deux gestes — le découpage qui écarte, la substitution qui
          //   hérite —, et il doit les modéliser EXACTEMENT : sur-déclarer
          //   ferait taire des cornes légitimes, sous-déclarer les ferait
          //   pousser sur un « 6 6 6 ». Le jour où une primitive écartera la
          //   ligne pour une autre raison (`helpers.marquerLesNombres` élargit
          //   quand une ligne porte des nombres à plusieurs chiffres, cas
          //   qu'aucune saisie du jeu d'essai ne produit encore), c'est ici que
          //   ça rougira.
          assert.deepEqual([...rejeu[i].frontieres].sort(), [...releves[i + 1].frontieres].sort(),
            `${s} #${a.rang} (${a.codes}) — frontières après l’étape ${i + 1} « ${sc.steps[i].title} »`);
          comparees++;
        }
      }
    }
    assert.ok(comparees > 200, `seulement ${comparees} lignes comparées : la mesure ne mesure rien`);
    console.log(`    ${comparees} lignes rejouées à l’identique, ${renoncements} renoncements`);
  });

/**
 * ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT SE MONTRENT — et la chaîne de
 *   l'auteur se rejoue d'un bout à l'autre.
 *
 * Le piège que ce test ferme est le piège classique du dépôt : une op hors
 * vocabulaire, ou mal formée, fait retomber `scenario.js` sur le rendu
 * générique **en silence**. L'opérateur « marche » encore, mais il ne démontre
 * plus rien — il annonce. On exige donc trois choses de chacun des quatre :
 *
 *  1. son scénario compile dans le moteur visuel RÉEL, sans un avertissement ;
 *  2. ni `scenario.js` ni le compilateur n'ont eu à se rabattre sur du
 *    générique — `avertissements` est vide des deux côtés ;
 *  3. la primitive qui porte le geste est bien là : `move` pour le rangement,
 *    `flip180` pour les trios, `substitute` pour le décompte, `partition` pour
 *    le redécoupage.
 *
 * ★ Deux des quatre sont joués par URL plutôt que cherchés. Ce n'est pas une
 * facilité : le demi-tour d'un BLOC demande trois 9 contigus et `mcc` une ligne
 * condensable, deux géométries que le classement ne met pas spontanément en
 * tête sur le corpus. Les rejouer par leur programme est exactement ce que fait
 * un lien partagé (§4.3), et c'est donc le chemin qu'il faut éprouver.
 *
 * ⚠️ Le trio a changé de porteur : `mr39` est déprécié, et c'est `mr9` qui
 *   groupe désormais les `999` d'affilée — dans son GESTE, son calcul
 *   continuant de retourner tous les 9 (voir `mappeurs.js › m.retournerLesNeuf`
 *   et `visuel/primitives/flip180.js › planBloc`). Le programme éprouvé ici est
 *   donc celui de l'auteur, à un code près, et il produit la même primitive.
 */
test('★ intégration — les quatre transformations du 27 août se MONTRENT',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { lire } = await import('../../url.js');
    const { encoderTexte } = await import('../../base58.js');
    const m = creerMoteur(catalogue);

    const cas = [
      // Le rangement et le redécoupage se trouvent tout seuls ; on les rejoue
      // quand même par leur programme, pour que le test ne dépende pas d'un
      // classement qui peut légitimement bouger.
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mtri', 'mtri', 'move'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+mx6+mrn+mr9', 'mr9', 'flip180'],
      // `mcc` dénombre désormais série par série, sous une accolade (`group`).
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mtri+mcc', 'mcc', 'group'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mrd', 'mrd', 'partition'],
      // ★ La médiane, dans ses DEUX formes — c'est la parité du compte qui
      //   décide, et les deux doivent tenir. « Le chat dort » donne quatre
      //   nombres (deux au centre, donc la fraction), « Le chat » trois (un
      //   seul centre, donc l'accolade nue). Ce qui est commun aux deux, et ce
      //   que la primitive nommée vérifie, c'est l'annulation par paires.
      ['Le chat dort', 'fl+tca+m14+cme', 'cme', 'collapse'],
      ['Le chat', 'fl+tca+m14+cme', 'cme', 'collapse'],
    ];

    for (const [saisie, codes, code, primitive] of cas) {
      const r = m.rejouer(lire(`#${codes}#${encoderTexte(saisie)}`));
      assert.ok(r.ok, `${codes} : ${r.raison || 'rejeu impossible'}`);
      const sc = m.scenarioDe(r.approche, { saisie });
      assert.deepEqual(sc.avertissements || [], [],
        `${code} : le scénario est retombé sur le rendu générique — `
        + 'l’opérateur annoncerait au lieu de montrer');
      const tl = compile(sc);
      assert.deepEqual(tl.warnings, [], `${code} : avertissement de compilation`);
      assert.ok(tl.total > 0, `${code} : durée totale nulle`);
      const ops = sc.steps.flatMap((st) => st.ops.map((o) => o.op));
      assert.ok(ops.includes(primitive),
        `${code} : la primitive « ${primitive} » n’est pas émise`);
    }
  });

/**
 * ★ LA CHAÎNE DE L'AUTEUR, REJOUÉE SUR SES PROPRES CHIFFRES.
 *
 * « `48120120961141088436181322436108` […] ⇒ `996696696969` · transformation
 * suivante : tri croissant `996696696969` → `666666999999` · […] puis "On
 * retourne les 666 qui se cachent" (retourne les 999 trois par trois). »
 *
 * Les trente-deux chiffres ne sont pas recopiés à la main : ils SORTENT de
 * `fc+tca+mx6` sur `https://reinfocovid.fr/`, c'est-à-dire du programme que
 * l'auteur donne lui-même en tête de sa section. C'est ce qui fait de ce test
 * une vérification et non une paraphrase.
 */
test('★ la chaîne du 27 août se rejoue sur les chiffres de l’auteur', () => {
  const N = (v) => nums(v, v.map((_, i) => [[i, i + 1]]));
  const chaine = (etat0, codes) => codes.split('+').reduce((e, c) => {
    assert.ok(e, `${c} : l’état précédent était null`);
    const r = appliquer(PAR_CODE.get(c), e);
    assert.ok(r, `${c} a rendu null`);
    return r;
  }, etat0);

  // 1. les trente-deux chiffres, tels que l'auteur les écrit — et ils viennent
  //    du programme qu'il cite, pas d'une recopie.
  const avant = chaine(depuisSaisie('https://reinfocovid.fr/'), 'fc+tca+mx6');
  assert.equal(avant.valeur.join(''), '48120120961141088436181322436108',
    'les 32 chiffres de la section 7.4');

  // 2. le redécoupage : sa découpe à la main rend six 6 sur douze paquets ;
  //    l'optimisation en rend ONZE 6-ou-9 sur quinze signes, là où la ligne de
  //    départ n'en portait que quatre. Le compte se lit en 6 **et** en 9 —
  //    « garder les 9 et les 6 (mr9 ou mr39 convertiront les 9 en 6) »
  //    (l'auteur).
  // ⚠️ **LA DÉCOUPE A CHANGÉ LE JOUR OÙ L'OBJECTIF EST DEVENU SÉQUENTIEL**, et
  //    le RENDEMENT, lui, n'a pas bougé d'une unité : onze 6-ou-9 sur quinze
  //    signes avant comme après, trois séries avant comme après. Maximiser le
  //    nombre de chiffres utiles et maximiser ceux qu'on place dans l'ordre
  //    donnent ici le même total par deux chemins différents — ce qui est
  //    exactement ce qu'on attend sur une cible homogène, où les deux objectifs
  //    se confondent. C'est le total qui est la propriété ; la découpe n'en est
  //    qu'une réalisation, et la figer aurait interdit toute amélioration de
  //    l'algorithme sans rien garantir de plus.
  // ⚠️ **ET ELLE A CHANGÉ UNE SECONDE FOIS LE 19 SEPTEMBRE**, pour la même
  //    raison et avec le même rendement : à écrits égaux, `mrd` n'avale plus
  //    un chiffre déjà juste pour gagner un paquet (« un 6 ou un 9 déjà là
  //    reste seul », sa règle affichée — `planRedecoupage`). Les onze 6-ou-9
  //    restent onze ; la queue `1 2 9 9 6 6 9 9` devient `1 5 6 9 6 9 6 9`,
  //    où les 6 et les 9 de la ligne restent seuls au lieu d'être refondus.
  // ★ **ET CE GESTE S'ÉCRIT `mrd9` DEPUIS LE 19 SEPTEMBRE** : « fais `mrd9` qui
  //    garde les 9 » (l'autrice). C'est exactement la phrase de l'auteur
  //    citée plus haut — garder les 9 pour `mr9` —, la même découpe au chiffre
  //    près. `mrd`, qui ne vise plus que le 6, écrit huit 6 sur la même ligne
  //    (deux séries, contre trois pour `mrd9` une fois retourné).
  const redec = chaine(avant, 'mrd9');
  assert.equal(chaine(avant, 'mrd').valeur.filter((v) => v === 6).length, 8,
    'sans le 9 : huit 6, les 9 fondus dans les paquets');
  const gagnants = (vs) => vs.filter((v) => v === 6 || v === 9).length;
  assert.deepEqual(redec.valeur, [1, 2, 6, 9, 6, 6, 9, 1, 5, 6, 9, 6, 9, 6, 9]);
  assert.equal(gagnants(avant.valeur.join('').split('').map(Number)), 4,
    'la ligne de départ ne porte que trois 6 et un 9');
  assert.equal(gagnants(redec.valeur), 11, 'onze 6-ou-9, contre quatre au départ');

  // 3. …et sur SON vecteur à lui (`996696696969`), le tri puis les trios font
  //    exactement ce qu'il annonce, dans cet ordre.
  const sien = N([9, 9, 6, 6, 9, 6, 6, 9, 6, 9, 6, 9]);
  const range = chaine(sien, 'mtri');
  assert.deepEqual(range.valeur, [6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 9],
    '« tri croissant 996696696969 → 666666999999 »');
  // ★ « Retourne les 999 trois par trois » — la phrase de l'auteur reste vraie,
  //   mais elle décrit maintenant le GESTE et non plus un opérateur à part.
  //   `mr9` retourne les douze, et sa scène en groupe deux trios.
  const retourne = chaine(range, 'mr9');
  assert.deepEqual(retourne.valeur, new Array(12).fill(6),
    '« retourne les 999 trois par trois » — deux trios, douze 6');
});

/**
 * ★ LA RETOUCHE, DE BOUT EN BOUT : le lien de l'auteur sur « Donald Trump ».
 *
 * « Pour "Donald Trump" ce que je voudrais, et qui n'est pas encore géré :
 * `#so!2.1:fr13,tca+mtal+m14+mpf#…`. En gros, on fait la conversion fr13 sur le
 * 2ᵈ mot, puis on trie l'ensemble, on applique m14 à l'ensemble, on enlève les
 * chiffres minoritaires. » (l'auteur)
 *
 * Deux écarts avec ce qu'il avait écrit, et ils sont là parce qu'ils sont vrais :
 *
 *  · **la virgule devient `;`** — voir `url.js` : la virgule dit déjà « ces deux
 *    morceaux donnent chacun leur chiffre », et la grammaire se lit SANS
 *    catalogue, donc elle ne peut pas deviner que `fr13` rend du texte ;
 *  · **`fl` s'ajoute en tête du second étage** — MESURÉ, et ce n'est pas un
 *    ornement : `tca` fait un jeton de l'espace entre les deux mots, et `m14`
 *    n'a pas de segment pour une espace. Sans `fl`, le programme n'est pas
 *    applicable et le lien est refusé (c'est le cas éprouvé plus bas).
 *
 * Ce que le test tient, et qu'aucun autre ne tiendrait : la scène part du texte
 * TAPÉ, la retouche s'y voit, et la ligne rejouée par `suivreLaLigne` est celle
 * que le moteur visuel RÉEL fabrique — le double modèle de scène ne diverge pas
 * sur ce geste-là non plus.
 */
test('★ retouche — « Donald Trump » : on chiffre un mot, puis on lit le tout',
  { skip: compile && Scene ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const b58 = encoderTexte('Donald Trump');
    const lien = `#so!2:fr13;fl+tca+mtal+m14+mpf#${b58}`;

    const lu = lireUrl(lien, { catalogue });
    assert.equal(lu.forme, 'canonique');
    assert.deepEqual(lu.retouches.map((r) => r.codes), [['fr13']]);

    const r = m.rejouer(lu);
    assert.ok(r.ok, r.raison || 'rejeu impossible');
    const a = r.approche;

    // 1. Ce que la retouche a fait à la saisie — « Trump » chiffré, le reste
    //    intact, et la saisie d'origine préservée pour l'affichage.
    assert.equal(a.saisie, 'Donald Trump');
    assert.equal(a.saisieRetouchee, 'Donald Gehzc');
    assert.equal(a.retouches.length, 1);
    assert.equal(a.retouches[0].fragment.texte, 'Trump');

    // 2. Ce que l'arithmétique produit, et que l'auteur avait prévu : sept 6,
    //    donc deux séries et « un 6 de trop » que la récolte laisse tomber.
    const fin = a.parts[0].chemin.etats[a.parts[0].chemin.etats.length - 1];
    assert.deepEqual(fin.valeur, [6, 6, 6, 6, 6, 6, 6], 'sept 6, dont un surnuméraire');
    assert.equal(a.mode, 'GROUPEMENT');
    assert.equal(a.series, 2);

    /* 3. Le lien se réécrit sous sa forme CANONIQUE — c'est ce que
          `canoniser()` posera dans la barre d'adresse (§4.3).

          ⚠️ Ce n'est plus le lien de départ AU CARACTÈRE PRÈS : `tca` ne
            s'écrit plus (`url.js › CODE_DECOUPE_IMPLICITE`, « je souhaite que
            tca ne soit pas facturé comme une étape » et, avant cela, qu'il ne
            s'écrive plus). Le lien d'entrée le porte — et il reste lu, c'est
            tout l'objet des assertions précédentes —, la forme canonique s'en
            passe. Ce qu'on gèle ici est donc l'écriture, pas l'entrée. */
    assert.equal(a.url, `?2:fr13;fl+mtal+m14+mpf$${b58}`);

    // 4. La règle affichée NOMME l'étage amont : taire le chiffrement
    //    annoncerait une méthode qui ne mène pas au résultat montré.
    //
    // ⚠️ CE CONTRÔLE CHERCHAIT « 13 rangs », ET NE POUVAIT PAS LE TROUVER : la
    //   règle des césars écrit son décalage EN TOUTES LETTRES — « Chaque lettre
    //   avance de treize rangs » (`filtres.js › RANGS`). Le test échouait donc
    //   sur sa propre formulation, alors que les trois contrôles précédents
    //   passaient : la retouche était trouvée, le lien se réécrivait, les sept 6
    //   étaient là. Un rouge qui ressemblait à un arbitrage en attente, et qui
    //   n'était qu'une expression régulière périmée.
    //
    //   On ne recopie donc plus la formulation : on la DEMANDE à l'opérateur,
    //   comme partout ailleurs dans ce dépôt. Le jour où `fr13` changera de
    //   phrase, ce test suivra au lieu de mentir.
    const regleDuChiffrement = catalogue.find((o) => o.code === 'fr13').regle.fr;
    assert.match(a.regle.fr, new RegExp(regleDuChiffrement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      'la règle affichée doit contenir, mot pour mot, celle du chiffrement de l’étage amont');

    // 5. La scène part du texte TAPÉ, montre la retouche, et finit sur 666 666.
    const sc = m.scenarioDe(a, { saisie: 'Donald Trump', registre: 'sobre' });
    assert.equal(sc.tokens.map((t) => t.text).join(''), 'Donald Trump',
      'le rideau se lève sur une saisie que personne n’a tapée');
    assert.match(sc.steps[0].title, /retouche/i);
    assert.equal(sc.steps[0].caption, '« Trump »');
    assert.equal(sc.result, '666 666');
    assert.deepEqual(sc.avertissements || [], [],
      'le scénario est retombé sur le rendu générique');

    // 6. …et le moteur visuel réel la compile, sans un avertissement.
    const tl = compile(sc);
    assert.deepEqual(tl.warnings, []);
    assert.ok(tl.total > 0);

    // 7. Le contrôle croisé des deux modèles de scène, sur ce geste neuf.
    const releves = relever(sc);
    const rejeu = suivreLaLigne(sc.tokens, sc.steps);
    let comparees = 0;
    for (let i = 0; i + 1 < sc.steps.length; i++) {
      if (rejeu[i] === null) break;
      assert.deepEqual(rejeu[i].ids, releves[i + 1].ids,
        `ligne après l’étape ${i + 1} « ${sc.steps[i].title} »`);
      comparees++;
    }
    assert.ok(comparees >= 20, `seulement ${comparees} lignes comparées`);
  });

/**
 * ★ UNE RETOUCHE QUI RACCOURCIT — le cas où tout pouvait se décaler d'un cran.
 *
 * `fr13` rend autant de lettres qu'il en prend, si bien que le test ci-dessus
 * ne prouve rien sur les portées : elles tombaient juste par accident de
 * longueur. `fv` (« on ne garde que les voyelles ») réduit `Donald` à `oa`, et
 * la question devient vraie : **la portée `2.1:` désigne-t-elle le deuxième
 * jeton du texte RETOUCHÉ, ou de celui qu'on a tapé ?** La réponse est la
 * première — c'est la seule qui rende `a;b` lisible comme « d'abord a, puis b
 * sur le résultat » — et voici ce qui la tient.
 */
test('★ retouche — une portée qui suit compte sur le texte RÉÉCRIT',
  { skip: compile && Scene ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const b58 = encoderTexte('Donald Trump');
    const r = m.rejouer(lireUrl(`#so!0.1:fv;2.1:tca+m14#${b58}`, { catalogue }));
    assert.ok(r.ok, r.raison || 'rejeu impossible');
    assert.equal(r.approche.saisieRetouchee, 'oa Trump');
    // `oa Trump` se jette en trois jetons — `oa`, l'espace, `Trump` — donc le
    // deuxième est `Trump`. Sur le texte tapé, ce même `2.1` aurait aussi donné
    // `Trump` par coïncidence : c'est l'OFFSET qui distingue les deux lectures.
    assert.equal(r.approche.parts[0].fragment.texte, 'Trump');
    assert.equal(r.approche.parts[0].fragment.offset, 3, 'offset dans le texte réécrit');

    const sc = m.scenarioDe(r.approche, { saisie: 'Donald Trump', registre: 'sobre' });
    assert.equal(sc.tokens.map((t) => t.text).join(''), 'Donald Trump');
    assert.deepEqual(compile(sc).warnings, []);
    const releves = relever(sc);
    const rejeu = suivreLaLigne(sc.tokens, sc.steps);
    for (let i = 0; i + 1 < sc.steps.length; i++) {
      if (rejeu[i] === null) break;
      assert.deepEqual(rejeu[i].ids, releves[i + 1].ids,
        `ligne après l’étape ${i + 1} « ${sc.steps[i].title} »`);
    }
  });

test('★ retouche — un programme qui ne rend PAS du texte est refusé, en le disant', () => {
  const m = creerMoteur(catalogue);
  const b58 = encoderTexte('Donald Trump');
  // `tca+m14` finit sur un vecteur de nombres : rien à reposer dans la saisie.
  const nombres = m.rejouer(lireUrl(`#so!2.1:tca+m14;tca+m7#${b58}`, { catalogue }));
  assert.equal(nombres.ok, false);
  assert.equal(nombres.raison, 'retouche non textuelle');
  // Et le programme EXACT de l'auteur, sans `fl` : `m14` n'a pas de segment
  // pour l'espace que `tca` a fait naître entre les deux mots.
  const sansFiltre = m.rejouer(lireUrl(`#so!2:fr13;tca+mtal+m14+mpf#${b58}`, { catalogue }));
  assert.equal(sansFiltre.ok, false);
  assert.equal(sansFiltre.raison, 'programme inapplicable');
});


/**
 * ★ LE 6 SURNUMÉRAIRE, DES DEUX CÔTÉS DU PONT.
 *
 * C'est le geste dont le pont a le plus à dire, parce qu'il vit des deux côtés
 * à la fois : le moteur de recherche décide QUEL 6 est en trop et le laisse sur
 * la ligne (`scenario.js › lesPlusCentraux`), le moteur visuel décide COMMENT
 * il s'en va (`visuel/primitives/reveal.js`). Trois choses ne peuvent se
 * vérifier qu'ici, avec le compilateur RÉEL :
 *
 *  1. le 6 de trop est **encore vivant** à l'entrée du verdict — l'invariant 3
 *     lu par la scène, pas par le validateur ;
 *  2. la ligne rejouée par `suivreLaLigne` est celle du moteur visuel, sur un
 *     scénario où une étape a DISPARU. Un modèle qui aurait encore jeté ce 6
 *     divergerait à l'étape suivante, pas au verdict ;
 *  3. et la compilation ne rend **aucun avertissement** : deux mises en page
 *     dans le même step, une explosion au milieu, et pas une animation
 *     concurrente.
 */
test('★ surnuméraire — « Donald Trump » : le 6 de trop explose au verdict, des deux côtés',
  { skip: compile && Scene ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    const lien = `#sce!0.1:tca+m14+mpf,2.1:fr13+tca+m14+mpf#${encoderTexte('Donald Trump')}`;
    const r = m.rejouer(lireUrl(lien, { catalogue }));
    assert.ok(r.ok, r.raison || 'rejeu impossible');
    const sc = m.scenarioDe(r.approche, { saisie: 'Donald Trump', registre: 'scenique' });

    const verdict = sc.steps[sc.steps.length - 1].ops.find((o) => o.op === 'reveal');
    assert.equal(verdict.surnumeraires.length, 1, 'un 6 de trop, et il est nommé');
    // Aucune étape ne le fait tomber : c'est le reproche de l'auteur, mesuré
    // sur les ops plutôt que sur un compte d'étapes.
    const jetes = sc.steps.flatMap((st) => st.ops)
      .filter((o) => o.op === 'drop').flatMap((o) => o.targets || []);
    assert.ok(!jetes.includes(verdict.surnumeraires[0]),
      'le 6 de trop ne doit tomber nulle part — il explose');

    // 1 + 3. Le moteur visuel réel le trouve vivant, le fait sauter, et ne se
    //        plaint de rien.
    const tl = compile(sc, { scenographie: true });
    assert.deepEqual(tl.warnings, []);
    assert.equal(tl.scene.get(verdict.surnumeraires[0]).alive, false);
    assert.deepEqual(tl.scene.flow, verdict.targets, 'la ligne finale EST le verdict');
    assert.equal(tl.nodes.filter((n) => n.role === 'souffle').length, 1);

    // 2. Les deux modèles de scène, step par step.
    const releves = relever(sc, { scenographie: true });
    const rejeu = suivreLaLigne(sc.tokens, sc.steps);
    let comparees = 0;
    for (let i = 0; i + 1 < sc.steps.length; i++) {
      if (rejeu[i] === null) break;
      assert.deepEqual(rejeu[i].ids, releves[i + 1].ids,
        `ligne après l’étape ${i + 1} « ${sc.steps[i].title} »`);
      comparees++;
    }
    assert.ok(comparees >= 20, `seulement ${comparees} lignes comparées`);
    // Et la dernière ligne connue — celle qu'on donne au verdict — porte bien
    // les SEPT 6, pas six.
    const derniere = rejeu[comparees - 1].ids;
    const six = derniere.filter((id) => verdict.targets.includes(id)
      || verdict.surnumeraires.includes(id));
    assert.equal(six.length, 7);
    assert.equal(six.indexOf(verdict.surnumeraires[0]), 3, 'et le 6 de trop est au milieu');
  });

/**
 * ★ **LA LIGNE PRINCIPALE NE QUITTE JAMAIS L'ÉCRAN — sur les vraies voies.**
 *
 * > « Il y a plusieurs animations buggées (sort de l'écran vers le haut). »
 * > (l'autrice)
 *
 * La garde de routine (`visuel/tests/cadre.test.js`) joue chaque opérateur
 * SEUL. Les défauts de cadrage, eux, naissent souvent quand plusieurs décors se
 * succèdent — une réglette montée puis mutualisée, un clavier après une table,
 * une colonne de factorielle, un verdict sur deux rangs. On regarde donc ici
 * toutes les voies du jeu d'essai, plus quelques liens qui mettent en scène les
 * décors qu'aucune recherche du jeu d'essai ne sort, à la mise en scène du site
 * (`scenographie`). La définition de « la ligne est à l'écran » est celle de
 * `visuel/tests/_cadre.js`, et elle seule.
 */
test('★ intégration — la ligne principale reste à l’écran sur toutes les voies du jeu d’essai',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { compilerEnRelevant, sortiesDeCadre, dire } = await import('../../../visuel/tests/_cadre.js');
    const m = creerMoteur(catalogue);
    const scenes = [];
    for (const s of SAISIES) {
      const r = m.resoudre(s);
      for (const a of r.approches) {
        let sc;
        try { sc = m.scenarioDe(a, { saisie: r.saisie }); } catch { continue; }
        scenes.push([`${s} #${a.rang} (${a.codes})`, sc]);
      }
    }
    // Les décors que le classement ne met pas en tête : la factorielle en haute
    // colonne, la potence, la division, les trios, la retouche.
    const liens = [
      ['Ice', 'tca+ma1+mfac'],
      ['Sept', 'tca+masb+mdc2'],
      ['Sept', 'tca+masb+mdiv'],
      // ★ `mrd` ne garde plus les 9 (19 septembre 2026) : la retouche qui les
      //   garde pour `mr9` s'écrit `mrd9`, la même découpe au chiffre près.
      ['Capitalisme', 'tca+masb+mrd9+mr9'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mtri+mcc'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+mx6+mrn+mr9'],
      ['Donald Trump', 'so!2:fr13;fl+tca+mtal+m14+mpf'],
    ];
    for (const [saisie, prog] of liens) {
      const r = m.rejouer(lireUrl(`#${prog}#${encoderTexte(saisie)}`, { catalogue }));
      assert.ok(r.ok, `${saisie} ${prog} : ${r.raison || 'rejeu impossible'}`);
      scenes.push([`${saisie} #${prog}`, m.scenarioDe(r.approche, { saisie })]);
    }
    const fautes = [];
    let etapes = 0;
    for (const [nom, sc] of scenes) {
      const { tl, lignes } = compilerEnRelevant(sc, { scenographie: true });
      etapes += tl.steps.length;
      // 40 ms : les sorties mesurées durent des centaines de millisecondes, et
      // ce test rejoue près de trois mille étapes.
      for (const s of sortiesDeCadre(tl, lignes, { pas: 40 })) fautes.push(`${nom} — ${dire(s)}`);
    }
    assert.ok(etapes > 2000, `seulement ${etapes} étapes regardées : la mesure ne mesure rien`);
    assert.deepEqual(fautes, [], `${fautes.length} sortie(s) de cadre :\n  ${fautes.join('\n  ')}`);
    console.log(`    ${scenes.length} scènes, ${etapes} étapes : la ligne ne quitte jamais le cadre`);
  });

/**
 * ★ **EN SOBRE, LE COURONNEMENT N'EST PAS DISCRET : IL N'EST PAS.**
 *
 * > « En mode sobre, ces étapes ne doivent pas apparaître en fantôme, ni comme
 * >   étape instantanée dans l'animation, ni dans le registre, elles doivent
 * >   juste être absentes. » (l'auteur)
 *
 * Trois absences à prouver, et ce test est le seul endroit d'où les trois se
 * voient en même temps — parce que c'est ici qu'un scénario rencontre le vrai
 * compilateur :
 *
 *  1. **dans le scénario** — aucune op `horns`, aucune étape portant le titre du
 *     couronnement ;
 *  2. **dans l'animation** — la timeline compte exactement autant de steps que
 *     le scénario, donc aucune étape de durée nulle ne s'y est glissée (le
 *     compilateur en refuserait une de moins de 16 ms, mais il ne peut pas
 *     refuser ce qu'on ne lui donne pas : c'est l'ÉGALITÉ des deux comptes qui
 *     ferme la porte, pas le plancher) ;
 *  3. **dans le registre** — `app/registre.js` énumère `lecteur.steps` un pour
 *     un, sans filtre : une étape absente de `steps` est absente du Registre, et
 *     réciproquement. Le test relit donc `sc.steps` comme le ferait le Registre,
 *     titre par titre, plutôt que de monter un DOM pour redécouvrir une boucle
 *     de sept lignes.
 *
 * ★ **Et la preuve par le contraire est dans le test** : la MÊME voie en
 * scénique porte ses couronnements. Sans cela, on prouverait seulement qu'on a
 * choisi une voie sans 666 contigu.
 */
test('★ registre sobre — les étapes de couronnement sont ABSENTES, pas neutralisées',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    // La voie qui couronne le plus dans le corpus : quatre triptyques, dont un
    // rassemblé au dernier calcul (`scenario.test.js`).
    const r = m.rejouer(lireUrl(`#so!2:fr15;fl+tca+masc+mab#${encoderTexte('Donald Trump')}`,
      { catalogue }));
    assert.ok(r.ok, r.detail || r.raison);

    const scenique = m.scenarioDe(r.approche, { saisie: 'Donald Trump', registre: 'scenique' });
    const sobre = m.scenarioDe(r.approche, { saisie: 'Donald Trump', registre: 'sobre' });

    // ── la preuve par le contraire : en scénique, elles sont bien là ─────────
    const cornesScenique = scenique.steps.filter((s) => (s.ops || []).some((o) => o.op === 'horns'));
    assert.equal(cornesScenique.length, 4, 'la même voie couronne quatre fois en scénique');
    const titreCouronnement = cornesScenique[0].title;

    // ── 1. absentes du scénario ─────────────────────────────────────────────
    assert.equal(sobre.steps.filter((s) => (s.ops || []).some((o) => o.op === 'horns')).length, 0,
      'aucune op « horns » en sobre');
    assert.equal(sobre.steps.filter((s) => s.title === titreCouronnement).length, 0,
      'et aucune étape n’en porte plus le titre — ni en fantôme, ni réécrite');
    assert.equal(sobre.steps.length, scenique.steps.length - 4,
      'le sobre compte exactement quatre étapes de moins, pas une de plus');
    assert.equal(sobre.cornes, undefined, 'et il ne publie aucun jalon de cornes');
    // Les identifiants se suivent : une étape retirée ne laisse pas de trou.
    assert.deepEqual(sobre.steps.map((s) => s.id), sobre.steps.map((_, i) => `s${i}`));
    // Aucune étape vide — une étape sans op serait le fantôme sous un autre nom.
    for (const [i, s] of sobre.steps.entries()) {
      assert.ok((s.ops || []).length, `l’étape ${i + 1} « ${s.title} » ne fait rien`);
    }

    // ── 2. absentes de l'animation ──────────────────────────────────────────
    const tl = compile(sobre, { scenographie: false });
    assert.deepEqual(tl.warnings, []);
    assert.equal(tl.steps.length, sobre.steps.length,
      'la timeline ne fabrique ni ne perd d’étape');
    // Et aucune n'est instantanée : la plus courte dure au moins le plancher.
    const plusCourte = Math.min(...tl.steps.map((s) => s.duration));
    assert.ok(plusCourte >= 16, `une étape de ${plusCourte} ms s’est glissée dans la timeline`);

    // ── 3. absentes du registre ─────────────────────────────────────────────
    //     `app/registre.js` : une ligne par `lecteur.steps`, numérotée `i + 1`.
    const registre = sobre.steps.map((s, i) => `${i + 1}. ${s.title}`);
    assert.equal(registre.length, sobre.steps.length);
    assert.deepEqual(registre.filter((l) => l.includes(titreCouronnement)), [],
      'Le Registre ne porte aucune ligne de couronnement');
  });

/**
 * ★ **LE VERDICT DÉCHOIT AUSSI LES COURONNEMENTS NOUVELLEMENT ADMIS.**
 *
 * > « Je préfère que tous les 666 en mode scénique reçoivent leur corne, et que
 * >   le verdict retire celles à ceux qui sont en 2ⁿᵈ ligne. » (l'auteur)
 *
 * La seconde moitié de la phrase est une PROMESSE DE RATTRAPAGE : si
 * l'assemblage couronne tout, c'est que le verdict sait dépouiller. Elle est
 * déjà tenue en laboratoire — `visuel/tests/solidarite.test.js` fait s'effriter
 * les rangs du bas sur des scénarios écrits à la main, jusqu'à huit séries.
 * Elle ne l'était pas de bout en bout : sur un scénario que le moteur de
 * recherche a réellement produit, avec des couronnements que la règle d'hier
 * refusait.
 *
 * ★ **Le cas est choisi pour ça.** `fl+tca+mpy+meg` sur
 * `https://hope-hope-hope.fr/` écrit SIX séries et les couronne toutes — cinq
 * d'un coup à l'égalisation, et **la sixième après le tri**, c'est-à-dire à la
 * place exacte que l'ancienne quatrième condition interdisait. Six séries font
 * deux rangs de trois (`repartirEnLignes`), donc les séries 3, 4 et 5 vont en
 * seconde ligne — et la sixième, la nouvelle venue, est du lot. Si `detrones`
 * l'oubliait, une corne survivrait au rang du bas.
 *
 * ★ Et il n'y a rien à ajouter dans `reveal.js` pour que ça marche : `detrones`
 * interroge la SCÈNE (`ctx.scene.accrochesA`), pas une liste de couronnements.
 * Ce test le prouve plutôt que de le supposer.
 */
test('★ verdict — les cornes du rang du bas s’effritent, y compris celle du dernier calcul',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    // La forme canonique que le site écrit lui-même (`a.urlScenique`) : `fl`
    // est un marqueur de DÉCOUPE, il ne s'écrit pas dans la portée, et `tca`
    // est implicite.
    const r = m.rejouer(lireUrl(
      `?sce!fl+mpy+meg$${encoderTexte('https://hope-hope-hope.fr/')}`, { catalogue },
    ));
    assert.ok(r.ok, r.detail || r.raison);
    const sc = m.scenarioDe(r.approche, { saisie: 'https://hope-hope-hope.fr/', registre: 'scenique' });

    const tri = sc.steps.findIndex((s) => s.recolte);
    const cornes = sc.steps
      .map((s, i) => ({ i, o: (s.ops || []).find((x) => x.op === 'horns') }))
      .filter((x) => x.o);
    assert.equal(cornes.length, 6, 'les six séries sont couronnées');
    assert.ok(tri >= 0 && cornes.some((c) => c.i > tri),
      'et l’une d’elles l’est APRÈS le tri — c’est le cas que l’ancienne règle refusait');

    const reveal = sc.steps[sc.steps.length - 1].ops.find((o) => o.op === 'reveal');
    const series = [0, 1, 2, 3, 4, 5].map((k) => reveal.targets.slice(k * 3, k * 3 + 3));
    // La série couronnée en dernier est bien l'une de celles du rang du bas :
    // sans cela le test passerait sans rien éprouver.
    const derniere = cornes[cornes.length - 1].o.targets.join('|');
    assert.ok(series.slice(3).some((s) => s.join('|') === derniere),
      'la série couronnée après le tri part en seconde ligne');

    const tl = compile(sc, { scenographie: true });
    assert.deepEqual(tl.warnings, []);

    /* Une corne effritée se reconnaît à son TRACÉ animé — canal discret `d`,
       fonction pure du temps (`horns.js › effriterLesCornes`). Entière au
       départ, ébréchée à mi-chemin, disparue à la fin : les trois ensemble, une
       corne qui saute directement à rien ne s'effrite pas. Même lecture que
       `visuel/tests/solidarite.test.js`, sur un scénario réel cette fois. */
    const rongee = (id) => {
      const e = tl.discrete.filter((x) => x.id === id && x.channel === 'd').at(-1);
      if (!e) return false;
      const milieu = e.render(0.5);
      return e.render(0).length > 0 && milieu.length > 0 && milieu !== e.render(0)
        && e.render(1) === '';
    };
    // Une série porte DEUX cornes, une par 6 extérieur (« UNE CORNE, UN NŒUD »).
    const etat = series.map((s) => [`@cornes:${s[0]}`, `@cornes:${s[2]}`].filter(rongee).length);
    assert.deepEqual(etat, [0, 0, 0, 2, 2, 2],
      'le rang du haut garde ses six cornes, le rang du bas perd les siennes — les deux de chaque série');
  });
