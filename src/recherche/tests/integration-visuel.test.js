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
import { creerMoteur } from '../index.js';
import { suivreLaLigne } from '../scenario.js';
import { lire as lireUrl } from '../url.js';
import { encoderTexte } from '../base58.js';
import { catalogue } from './_catalogue.js';
import { PAR_CODE, appliquer } from '../../moteur/catalogue.js';
import { depuisSaisie, nums } from '../../moteur/etat.js';

let compile = null;
let TOKEN_GAP = 6;
let REPEAT_SPEED = 5;
let setGlyphes = null;
let GLYPHES = null;
let Scene = null;
try {
  ({ compile, REPEAT_SPEED } = await import('../../visuel/compile.js'));
  ({ setGlyphes } = await import('../../visuel/glyphes.js'));
  ({ GLYPHES } = await import('../../moteur/tables/glyphes.js'));
  ({ Scene } = await import('../../visuel/scene.js'));
  ({ TOKEN_GAP } = await import('../../visuel/constants.js'));
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
    const { OP_NAMES } = await import('../../visuel/constants.js');
    const { VOCABULAIRE } = await import('../scenario.js');
    assert.deepEqual([...VOCABULAIRE].sort(), [...OP_NAMES].sort());
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
  const { validateScenario } = await import('../../visuel/scenario.js');
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const a of r.approches) {
    const sc = m.scenarioDe(a, { saisie: r.saisie });
    assert.doesNotThrow(() => validateScenario(sc), `#${a.rang} (${a.codes})`);
  }
});


/**
 * L'accélération des redites (`visuel/compile.js` § Répétitions) doit rester
 * SANS EFFET sur ce qui est montré : mêmes steps, mêmes titres, mêmes valeurs
 * d'arrivée, mêmes charnières distinctes — seules les durées changent. Et elle
 * ne doit jamais fabriquer un step sous le minimum de CONTRACTS §3.
 */
test('intégration — l’accélération des redites ne change QUE les durées',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    let accelerees = 0;
    let gainMax = 0;
    let saisieMax = '';
    for (const s of SAISIES) {
      const r = m.resoudre(s);
      for (const a of r.approches) {
        let sc;
        try { sc = m.scenarioDe(a, { saisie: r.saisie }); } catch { continue; }
        const plein = compile(sc, { repeatSpeed: 1 });
        const rapide = compile(sc, { repeatSpeed: REPEAT_SPEED });

        assert.deepEqual(rapide.steps.map((st) => st.id), plein.steps.map((st) => st.id));
        assert.deepEqual(rapide.steps.map((st) => st.title), plein.steps.map((st) => st.title));
        assert.equal(rapide.anims.length, plein.anims.length, `${s} #${a.rang} : animations perdues`);
        assert.deepEqual(
          rapide.anims.map((x) => [x.id, x.prop, JSON.stringify(x.keyframes)]),
          plein.anims.map((x) => [x.id, x.prop, JSON.stringify(x.keyframes)]),
          `${s} #${a.rang} : une valeur d'arrivée a bougé`);
        assert.deepEqual(rapide.warnings, plein.warnings, `${s} #${a.rang} : nouvel avertissement`);

        for (const st of rapide.steps) {
          assert.ok(st.duration >= 16, `${s} #${a.rang} : step « ${st.id} » à ${st.duration} ms`);
          assert.ok(st.duration <= plein.steps[st.index].duration + 1e-6, 'une redite ne rallonge jamais');
          if (st.accelerated) accelerees++;
        }
        for (let i = 1; i < rapide.bounds.length; i++) {
          assert.ok(rapide.bounds[i] - rapide.bounds[i - 1] >= 8, `${s} #${a.rang} : charnières trop proches`);
        }
        const gain = 1 - rapide.total / plein.total;
        if (gain > gainMax) { gainMax = gain; saisieMax = `${s} #${a.rang}`; }
      }
    }
    assert.ok(accelerees > 0, 'aucune redite détectée dans tout le jeu d’essai — la détection est morte');
    console.log(`    ${accelerees} étapes accélérées ; meilleur gain ${(gainMax * 100).toFixed(0)} %`
      + ` sur ${saisieMax}`);
  });

test('intégration — « hope-hope-hope » : les trois « hope » ne se lisent qu’une fois en entier',
  { skip: compile ? false : 'src/visuel/ absent' }, () => {
    const m = creerMoteur(catalogue);
    // Ce que ce test mesure est la détection des REDITES : « le même geste, trois
    // fois de suite, ne se lit qu'une fois en entier ». Il lui faut donc une
    // approche qui RÉPÈTE, et une qui répète LONGUEMENT — une résonance de deux
    // étapes n'a que deux redites à trouver, et le test passerait pour de
    // mauvaises raisons.
    //
    // ⚠ Elle est donc REJOUÉE depuis un lien, plus cherchée dans le classement.
    // « La première résonance venue » a changé trois fois : à l'arrivée du
    // GROUPEMENT (qui fait ses trois 6 d'un seul geste et n'a rien à redire),
    // puis au renommage des codes en codes parlants — le classement départage
    // ses ex æquo sur la suite des codes (CONTRACTS §4.4-1), et rebaptiser les
    // opérateurs rebat donc les égalités. Le lien, lui, ne dépend d'aucun
    // classement : c'est la méthode 5 du README, sept segments à traits
    // fusionnés sur chacun des trois « hope ».
    const rejeu = m.rejouer(lireUrl(`#×3:tca+m7F+cs+prn#${encoderTexte('hope-hope-hope.fr')}`));
    assert.ok(rejeu.ok, 'la méthode 5 du README se rejoue sur le cas d’école');
    assert.equal(rejeu.approche.mode, 'RESONANCE');
    const sc = m.scenarioDe(rejeu.approche, { saisie: 'hope-hope-hope.fr' });
    const plein = compile(sc, { repeatSpeed: 1 });
    const rapide = compile(sc, { repeatSpeed: REPEAT_SPEED });
    const redites = rapide.steps.filter((st) => st.accelerated);
    assert.ok(redites.length >= 8,
      `seules ${redites.length} étapes reconnues comme redites sur ${rapide.steps.length}`);
    // Chaque redite pointe vers une étape ANTÉRIEURE, jamais vers elle-même.
    for (const st of redites) {
      assert.ok(st.repeatOf >= 0 && st.repeatOf < st.index, `étape ${st.index} : repeatOf=${st.repeatOf}`);
    }
    // ★ LE GAIN A BAISSÉ, ET C'EST LE PRIX D'UNE RÈGLE. Une redite ne
    //   s'accélère plus que si elle est ENTOURÉE de gestes du même type
    //   (`compile.js › repeatAccelerables`) : les pas de bord — celui qui monte
    //   la réglette, celui qui la retire — gardent leur rythme plein, et ce
    //   sont précisément ceux dont l'expédition escamotait la disparition du
    //   décor. On perd donc quelques dixièmes de gain pour ne plus bâcler ce
    //   qu'on avait mis une seconde à monter. Le seuil dit ce qu'on exige :
    //   que les redites fassent encore gagner plus d'un tiers du temps.
    assert.ok(rapide.total < plein.total * 0.7,
      `${Math.round(plein.total)} ms → ${Math.round(rapide.total)} ms : gain insuffisant`);
    console.log(`    hope-hope-hope : ${(plein.total / 1000).toFixed(1)} s → `
      + `${(rapide.total / 1000).toFixed(1)} s (${rapide.steps.length} étapes, ${redites.length} accélérées)`);
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
 * facilité : `mr39` demande trois 9 CONTIGUS et `mcc` une ligne condensable,
 * deux géométries que le classement ne met pas spontanément en tête sur le
 * corpus. Les rejouer par leur programme est exactement ce que fait un lien
 * partagé (§4.3), et c'est donc le chemin qu'il faut éprouver.
 */
test('★ intégration — les quatre transformations du 27 août se MONTRENT',
  { skip: compile ? false : 'src/visuel/ absent' }, async () => {
    const { lire } = await import('../url.js');
    const { encoderTexte } = await import('../base58.js');
    const m = creerMoteur(catalogue);

    const cas = [
      // Le rangement et le redécoupage se trouvent tout seuls ; on les rejoue
      // quand même par leur programme, pour que le test ne dépende pas d'un
      // classement qui peut légitimement bouger.
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mtri', 'mtri', 'move'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+mx6+mrn+mr39', 'mr39', 'flip180'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mtri+mcc', 'mcc', 'substitute'],
      ['Le chat dort sur le tapis rouge', 'fl+tca+m14+mrd', 'mrd', 'partition'],
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
  //    l'optimisation en rend huit sur onze, dont six d'affilée.
  const redec = chaine(avant, 'mrd');
  assert.deepEqual(redec.valeur, [6, 3, 6, 6, 6, 6, 6, 6, 3, 6, 9]);
  assert.equal(redec.valeur.filter((v) => v === 6).length, 8,
    'huit 6, contre six à la découpe manuelle');

  // 3. …et sur SON vecteur à lui (`996696696969`), le tri puis les trios font
  //    exactement ce qu'il annonce, dans cet ordre.
  const sien = N([9, 9, 6, 6, 9, 6, 6, 9, 6, 9, 6, 9]);
  const range = chaine(sien, 'mtri');
  assert.deepEqual(range.valeur, [6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 9],
    '« tri croissant 996696696969 → 666666999999 »');
  const retourne = chaine(range, 'mr39');
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
    const lien = `#so!2.1:fr13;fl+tca+mtal+m14+mpf#${b58}`;

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

    // 3. Le lien se réécrit à l'identique — c'est ce que `canoniser()` posera
    //    dans la barre d'adresse (§4.3).
    assert.equal(a.url, lien);

    // 4. La règle affichée NOMME l'étage amont : taire le chiffrement
    //    annoncerait une méthode qui ne mène pas au résultat montré.
    assert.match(a.regle.fr, /13 rangs/);

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
  const sansFiltre = m.rejouer(lireUrl(`#so!2.1:fr13;tca+mtal+m14+mpf#${b58}`, { catalogue }));
  assert.equal(sansFiltre.ok, false);
  assert.equal(sansFiltre.raison, 'programme inapplicable');
});

