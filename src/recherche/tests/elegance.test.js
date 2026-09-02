// src/recherche/tests/elegance.test.js
// ★ L'ÉLÉGANCE D'UNE SOLUTION, MESURÉE — et les cas que l'auteur a nommés.
//
// Ce fichier tient deux promesses distinctes, et il ne faut pas les confondre :
//
//  1. **les cas nommés** — `[6,6,6,4,4]` contre `[4,4,6,6,6]`, `[6,4,6,6,6]`,
//     `[6,4,6,3,6]`, `[4,6,4,6,4,6,4]`, `6, 5+1, 6, 8`. L'auteur les a écrits en
//     toutes lettres, avec le verdict qu'il en attend ; ils sont ici, un par un,
//     avec sa phrase en commentaire ;
//  2. **les trois FICELLES**, désormais mesurées. Trois de ses demandes n'avaient
//     aucun opérateur à mesurer ; il a tranché — « ma demande c'est aussi de les
//     ajouter au catalogue, mais avec un score bas, mais moins bas que la
//     suppression arbitraire de ce qui n'est pas 6 ». `mpf`, `m1s2` et `mad`
//     existent, et les tests ci-dessous gèlent leur PRIX, leur ORDRE et le fait
//     qu'aucune ne passe devant une voie honnête.
//
// Les vecteurs de forme (`[6,6,6,4,4]`…) sont construits à la MAIN : la question
// posée porte sur la GÉOMÉTRIE du vecteur, pas sur l'opérateur qui l'a produit,
// et aller chercher dans le catalogue une méthode qui rende par chance
// `[6,4,6,3,6]` ferait dépendre le test d'un accident du catalogue.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BAREME, NATURE, FICELLES, FICELLES_QUI_ECARTENT, A_MERITER_SA_PLACE,
  bilanChemin, bilanApproche, credit,
  detailDuCredit, dilution, emploieUneFicelle,
  facteur, note, estPur, amplitudeArrondi, finDuTriptyque, nbTriptyques,
  classeDeTransformation, survieDesCaracteres, compterTraductionsDivergentes,
} from '../elegance.js';
import { creerMoteur } from '../index.js';
import { ordreElegance, ordreTriptyques, ordreTotal, POIDS_DES_REGIMES } from '../score.js';
import { zonesSignifiantes } from '../fragments.js';
import { jalonsDesCornes } from '../scenario.js';
import { lire } from '../url.js';
import { catalogue, operateur } from './_catalogue.js';
import { natureOperandes } from '../../moteur/transformations/combinateurs.js';

// ══════════════════════════════════ outils de fabrication

/** Un état, à la forme exacte de `bfs.js › etat`. */
const etat = (type, valeur) => ({ type, valeur, traces: [], _k: null });

/**
 * Un chemin SYNTHÉTIQUE : une suite d'états, et autant d'opérateurs postiches
 * qu'il faut de transitions. L'identifiant des opérateurs compte (il décide de
 * la classe de transformation), le reste non.
 */
function chemin(etats, ids = []) {
  const ops = etats.slice(1).map((_, i) => ({
    id: ids[i] || 'x.postiche', code: `z${i}`, famille: 'mappeur', cout: 1,
  }));
  return { ops, etats };
}

/** Un chemin d'un seul saut `TOKENS → NUMS`, qui rend le vecteur demandé. */
function vecteur(valeurs, jetons = valeurs.length) {
  return chemin([
    etat('STR', 'x'.repeat(jetons)),
    etat('TOKENS', Array.from({ length: jetons }, () => 'x')),
    etat('NUMS', valeurs),
  ], ['t.caracteres', 'm.postiche']);
}

/** Une approche à une part, sur une portée nommée dans une saisie. */
function approche(saisie, portee, ch, extra = {}) {
  const [d, f] = portee;
  return {
    parts: [{
      fragment: {
        texte: saisie.slice(d, f), offset: d, longueur: f - d,
        intervalles: [[d, f]], famille: 'entier', priorite: 1,
      },
      chemin: ch,
    }],
    series: 1,
    ...extra,
  };
}

const ctxDe = (saisie) => ({ saisie, signifiants: zonesSignifiantes(saisie) });

/** Le crédit d'un vecteur posé sur une portée d'une saisie. */
function creditDe(saisie, portee, valeurs, extra = {}) {
  const a = approche(saisie, portee, vecteur(valeurs), extra);
  return credit(bilanApproche(a, ctxDe(saisie)));
}

// ══════════════════════════════════ le barème lui-même

/**
 * ★ « Les transformations qui font artificielles, par ordre décroissant de
 * laideur : 1. ne garder artificiellement que les 6 ; 2. les moyennes qui
 * nécessitent un arrondi ; 3. les min et les max ; 4. les conversions de
 * lettres vers d'autres lettres. » — l'auteur.
 *
 * L'ORDRE est une consigne, pas un réglage. Les valeurs, elles, se règlent au
 * banc — mais aucune retouche n'a le droit d'intervertir deux paliers. C'est le
 * seul garde-fou possible contre un étalonnage qui dériverait à force de
 * petites corrections locales.
 *
 * ⚠️ Le premier palier se compare à sa VALEUR MAXIMALE possible : « ne garder
 * que les 6 » se paie par valeur jetée, et une démonstration qui en jette une
 * seule est moins laide qu'une moyenne fausse. Ce que la hiérarchie ordonne,
 * c'est la laideur du GESTE mené jusqu'au bout — trois valeurs écartées, une
 * moyenne au pire arrondi, un min, un chiffrement.
 */
test('★ barème — l’ordre de laideur des quatre transformations artificielles est celui de l’auteur', () => {
  const trierArtificiellement = BAREME.VALEUR_JETEE * 3; // le geste, mené à son terme
  const moyenneFausse = BAREME.ARRONDI;                  // au pire arrondi
  assert.ok(trierArtificiellement > moyenneFausse,
    `« ne garder que les 6 » (${trierArtificiellement}) doit être PIRE qu’une moyenne arrondie (${moyenneFausse})`);
  assert.ok(moyenneFausse > BAREME.MIN_MAX,
    `une moyenne arrondie (${moyenneFausse}) doit être pire qu’un min/max (${BAREME.MIN_MAX})`);
  assert.ok(BAREME.MIN_MAX > BAREME.LETTRE_VERS_LETTRE,
    `un min/max (${BAREME.MIN_MAX}) doit être pire qu’une conversion lettre → lettre (${BAREME.LETTRE_VERS_LETTRE})`);
});

/**
 * ★ « Les additions de chiffres ont un bonus par rapport aux autres opérations
 * arithmétiques ; les additions de nombres ont un bonus aussi mais moindre. »
 */
test('★ barème — additions de chiffres > additions de nombres > le reste', () => {
  assert.ok(BAREME.ADDITION_CHIFFRES > BAREME.ADDITION_NOMBRES);
  assert.ok(BAREME.ADDITION_NOMBRES > 0, 'les autres opérations n’ont aucun bonus');
});

/**
 * ★ « Les additions de chiffres successives ont un malus de longueur très
 * faible : ce n'est pas aussi bien que d'arriver sur 6 plus tôt, mais c'est bien
 * moins pénalisant que d'ajouter des transformations autres. »
 *
 * « Très faible » et « bien moins pénalisant » : les deux se vérifient d'un
 * coup, en exigeant un ordre de grandeur d'écart.
 */
test('★ barème — une addition de chiffres qui reboucle coûte bien moins qu’une transformation', () => {
  // ★ La chaîne paie le prix plein d'une transformation et reçoit une REMISE :
  //   ce qu'elle coûte NET est la différence, et c'est elle qui doit rester
  //   basse. Écrire la remise en dur ici la ferait diverger du barème ; on la
  //   déduit, comme la page de récapitulatif le fait.
  const net = BAREME.TRANSFORMATION - BAREME.REMISE_ADDITION_EN_CHAINE;
  assert.ok(net > 0, 'ce n’est pas gratuit — arriver plus tôt reste mieux');
  assert.ok(net * 3 < BAREME.TRANSFORMATION,
    `${net} net contre ${BAREME.TRANSFORMATION} : l’écart doit rester net`);
});

/** ★ « Moindre si c'est un bloc entier », « malus faible pour la ponctuation ». */
test('★ barème — la hiérarchie des effacements : lettre arrachée > bloc > bloc court > ponctuation', () => {
  assert.ok(BAREME.EFFACE_ALNUM > BAREME.EFFACE_BLOC);
  assert.ok(BAREME.EFFACE_BLOC > BAREME.EFFACE_BLOC_COURT);
  assert.ok(BAREME.EFFACE_BLOC_COURT >= BAREME.EFFACE_PONCTUATION);
});

/** ★ « Gros malus » : casser un triptyque contigu doit dominer tout le reste. */
test('★ barème — casser un 666 contigu est le plus gros malus du barème', () => {
  const autres = [
    BAREME.SIX_DETRUIT, BAREME.TRANSFORMATION, BAREME.VALEUR_JETEE, BAREME.ARRONDI,
    BAREME.MIN_MAX, BAREME.LETTRE_VERS_LETTRE, BAREME.EFFACE_ALNUM,
  ];
  for (const m of autres) assert.ok(BAREME.CASSE_TRIPTYQUE > m);
  assert.ok(BAREME.CASSE_TRIPTYQUE > BAREME.TRIPTYQUE_CONTIGU,
    'casser doit coûter plus que former ne rapporte : sinon former puis casser serait gagnant');
});

/**
 * ★ LES FICELLES SONT BRANCHÉES — et le barème les voit.
 *
 * Ce test remplace celui qui gelait leur ABSENCE. Des demandes de l'auteur
 * n'avaient aucun opérateur à mesurer ; il a tranché — « ma demande c'est aussi
 * de les ajouter au catalogue ». Chacune existe, et chacune alimente son palier.
 * On le vérifie des DEUX côtés : l'identifiant inscrit dans `FICELLES` doit
 * exister au catalogue, et le compteur doit bouger quand l'opérateur s'applique.
 * Sans les deux, un palier pourrait se rendormir en silence et l'on croirait
 * mesurer ce qu'on ne mesure plus.
 *
 * ⚠️ **`m.plusFrequent` N'Y FIGURE PLUS** — « mpf ne doit plus être considéré
 * comme une ficelle ! » (l'auteur). Son palier `MAJORITE` existe toujours et se
 * paie toujours ; il est simplement devenu le tarif ordinaire d'un rejet de
 * minorité ÉNONCÉ, facturé par la voie commune à tous les rétrécissements. Le
 * test qui suit vérifie qu'elle continue bel et bien de le payer : sortir des
 * ficelles n'est pas devenir gratuite.
 */
/** Les codes des ficelles, lus du barème — jamais recopiés. */
function codesDesFicelles() {
  return Object.keys(FICELLES).map((id) => operateur(id).code);
}

test('★ les ficelles sont au catalogue, et chacune alimente SON palier', () => {
  // ★ Les types d'états sont DÉCLARÉS, et depuis qu'une ficelle ne va plus de
  //   `NUMS` à `NUMS` : « le chiffre écrit en toutes lettres » remonte le
  //   courant, d'un `NUM` vers un `STR`. Les deviner — en supposant `NUMS` des
  //   deux côtés, comme ce test le faisait — aurait fabriqué des états faux et
  //   mesuré un bilan qui n'existe pas.
  const attendu = {
    'm.unRangSurDeux': ['m1s2', 'decimation', [6, 4, 6, 3, 6], 'NUMS', 'NUMS'],
    'm.additionSelective': ['mad', 'additionSelective', [6, 5, 16, 8], 'NUMS', 'NUMS'],
    // ★ La ficelle qui RÉÉCRIT — « avec un gros malus puisqu'on essaie plutôt
    //   d'aller en sens inverse » (l'auteur). Elle ne jette rien, n'absorbe
    //   rien, et se paie au forfait : un emploi, une fois.
    'm.chiffreEnLettres': ['mlet', 'ecritureEnLettres', 7, 'NUM', 'STR'],
    // ⚠️ **`m.egalisation` N'Y FIGURE PLUS** — et elle y a figuré une journée.
    //    « meg ne marche pas toujours, l'égalisation pourrait être autre que
    //    sur 6 » (l'auteur), et c'est ce qui la sépare des autres : elle
    //    ne CHOISIT pas sa valeur, elle tombe sur la moyenne de la ligne. Sur
    //    `8 15 16 5` elle donne 11 et la voie meurt. Son palier `EGALISATION`
    //    existe toujours et se paie toujours, comme celui de `mpf` — le test
    //    juste en dessous le vérifie.
    // ⚠️ **`m.redecoupageChoisi` N'Y FIGURE PLUS NON PLUS** — « mrd, l'idée est
    //    là, à retirer des ficelles pour en faire un opérateur à 0.2 de
    //    notoriété » (l'auteur). Même partage que pour les deux précédentes :
    //    son palier `REDECOUPAGE` reste, il reste dilué, et il reste dans
    //    `A_MERITER_SA_PLACE`. Le test « le redécoupage paie encore » plus bas
    //    tient les trois moitiés de la phrase.
  };
  assert.deepEqual(Object.keys(FICELLES).sort(), Object.keys(attendu).sort(),
    'FICELLES et le catalogue doivent parler des mêmes opérateurs');

  for (const [id, [code, compteur, entree, typeAvant, typeApres]] of Object.entries(attendu)) {
    assert.equal(FICELLES[id], compteur, `${id} doit alimenter « ${compteur} »`);
    const op = operateur(id);
    assert.equal(op.code, code, `${id} doit porter le code ${code} (registre append-only, §4.1)`);

    const avant = etat(typeAvant, entree);
    const traces = Array.isArray(entree) ? entree.map(() => []) : [[]];
    const brut = op.apply(entree, traces);
    assert.ok(brut, `${code} doit s’appliquer à ${JSON.stringify(entree)}`);
    const apres = etat(typeApres, brut.valeur);
    const b = bilanChemin({ ops: [op], etats: [avant, apres] });
    assert.ok(b[compteur] > 0, `${code} doit faire monter « ${compteur} »`);
    // ★ …et la peine n'est PAS comptée deux fois : ce que la ficelle écarte ne
    //   repasse pas par `valeursJetees`.
    assert.equal(b.valeursJetees, 0,
      `${code} : son palier remplace « valeurs jetées », il ne s’y ajoute pas`);
  }
});

/**
 * ★ SORTIR DES FICELLES N'EST PAS DEVENIR GRATUITE.
 *
 * « mpf ne doit plus être considéré comme une ficelle ! » (l'auteur). Elle ne
 * l'est plus — elle n'évince plus, ne se fait plus évincer, et ne compte plus
 * dans `nbFicelles`. Mais elle écarte toujours des valeurs, et ce geste-là se
 * paie toujours : par la voie ORDINAIRE des rétrécissements, au tarif de la
 * majorité ÉNONCÉE.
 *
 * Ce test gèle les deux moitiés de la phrase, parce qu'une seule serait un
 * contresens dans un sens comme dans l'autre.
 */
test('★ `mpf` n’est plus une ficelle — mais son rejet se paie encore', () => {
  assert.ok(!Object.prototype.hasOwnProperty.call(FICELLES, 'm.plusFrequent'),
    'elle ne doit plus figurer parmi les ficelles');

  const op = operateur('m.plusFrequent');
  const avant = etat('NUMS', [2, 2, 6, 6, 6, 7]);
  const brut = op.apply(avant.valeur, avant.valeur.map(() => []));
  const apres = etat('NUMS', brut.valeur);
  assert.deepEqual(apres.valeur, [6, 6, 6], 'elle garde bien le plus fréquent');

  const b = bilanChemin({ ops: [op], etats: [avant, apres] });
  assert.equal(b.majorite, 3, 'les trois minoritaires se paient, un par un');
  assert.equal(b.majoriteTacite, 0, 'et pas au tarif de celui qui ne dit pas sa règle');
  assert.equal(b.valeursJetees, 0, 'ni à celui du gaspillage sans excuse');

  // ★ ET LE MÊME GESTE, SANS L'ÉNONCER, COÛTE PLUS CHER. C'est toute la
  //   consigne : « m36 doit être une alternative de secours à mpf, et non
  //   l'inverse ». On compare sur le MÊME vecteur et pour le MÊME résultat.
  const m36 = operateur('m.troisSixDAffilee');
  const brut36 = m36.apply(avant.valeur, avant.valeur.map(() => []));
  const apres36 = etat('NUMS', brut36.valeur);
  assert.deepEqual(apres36.valeur, [6, 6, 6], 'le geste comparé doit être le même');
  const b36 = bilanChemin({ ops: [m36], etats: [avant, apres36] });
  assert.equal(b36.majoriteTacite, 3, 'lui paie le tarif de la règle tue');
  // ★ Les deux tarifs se lisent au barème, pas au crédit : `bilanChemin` rend
  //   le bilan d'UNE part, et `credit` attend celui d'une approche entière.
  //   Comparer les paliers dit exactement la même chose, sans détour.
  assert.ok(BAREME.MAJORITE_TACITE > BAREME.MAJORITE,
    `énoncer la règle doit coûter moins cher que s’en servir en silence `
    + `(${BAREME.MAJORITE} contre ${BAREME.MAJORITE_TACITE})`);
  assert.equal(b.majorite * BAREME.MAJORITE, 3 * BAREME.MAJORITE);
  assert.ok(b.majorite * BAREME.MAJORITE < b36.majoriteTacite * BAREME.MAJORITE_TACITE,
    'sur le même vecteur et pour le même résultat, le silence coûte plus cher');
});

/**
 * ★ **`meg` non plus n'est une ficelle — et son uniformisation se paie encore.**
 *
 * Le jumeau exact du test ci-dessus, et pour la même raison. L'auteur a tranché
 * sur le fond : « meg ne marche pas toujours, l'égalisation pourrait être autre
 * que sur 6 ». C'est le critère de la table `FICELLES` — une ficelle aboutit
 * quel que soit le mot — et l'égalisation n'y répond pas : elle ne choisit pas
 * sa valeur, elle tombe sur la moyenne de la ligne.
 *
 * Ce test le vérifie SUR LE VECTEUR MÊME qui servait à la geler quand elle était
 * inscrite aux ficelles : `8 15 16 5` — dont la moyenne est 11. Elle égalise
 * parfaitement, et ne démontre rien du tout.
 */
/**
 * ★ **LE MÊME MOT, TRADUIT DE DEUX FAÇONS** — l'arbitrage de l'auteur, gelé.
 *
 * « Traduire un même mot de manière différente dans une même voie est encore
 * PIRE que d'utiliser des conversions de César différentes dans une même voie.
 * Autant la traduction n'est pas une ficelle, autant traduire le même mot
 * différemment dans une même voie peut être considéré comme une ficelle ou
 * comme du ad-hoc très élevé. Mieux vaut un peu de déchet que ça. »
 *
 * Trois choses en découlent, et ce test les tient toutes les trois : le tarif
 * est plus lourd que celui des césars, choisir UNE acception reste gratuit, et
 * la recherche n'en produit plus.
 */
/**
 * ★ LES DEUX PHASES DE L'ALTERNANCE — un outil, deux réglages, et ça se paie.
 *
 * « Comme les `frN` », dit l'auteur de la variante `cali` : « un malus à
 * utiliser plusieurs variantes dans la même voie ». C'est mot pour mot le grief
 * de `REGLAGE_PAR_MORCEAU`, et c'est donc ce poste-là qui la voit.
 *
 * Ce que le test tient, et qui n'allait pas de soi : **la phase est PUBLIÉE**
 * (`decalage`), et **la famille d'outil aussi** (`familleOutil`). Le compte
 * déduisait jusqu'ici la famille du code, en lui retirant ses chiffres de
 * queue — `fr14` et `fr9` sont deux réglages de `fr`. Cette règle-là ne voit
 * pas que `cal` et `cali` en sont deux d'une même alternance : elle les aurait
 * laissés passer EN SILENCE, ce qui est précisément le défaut que ce poste
 * existe pour couvrir.
 */
test('★ alternance — employer ses deux phases dans une voie coûte un réglage', () => {
  const cal = operateur('c.alternee');
  const cali = operateur('c.alterneeInverse');
  for (const op of [cal, cali]) {
    assert.equal(op.familleOutil, 'cal', `${op.code} doit publier sa famille d’outil`);
    assert.ok(Number.isFinite(op.decalage), `${op.code} doit publier sa phase`);
  }
  assert.notEqual(cal.decalage, cali.decalage, 'deux phases, deux réglages');

  const part = (op) => ({
    fragment: {
      texte: 'xx', offset: 0, longueur: 2, intervalles: [[0, 2]],
      famille: 'entier', priorite: 1,
    },
    chemin: {
      ops: [op],
      etats: [etat('NUMS', [8, 15]), etat('NUM', op.apply([8, 15], [[], []]).valeur)],
    },
  });
  const bilanDe = (ops) => bilanApproche({ parts: ops.map(part), series: 1 }, ctxDe('xx'));

  assert.equal(bilanDe([cal, cal]).reglagesEnTrop, 0,
    'la même phase partout, c’est une méthode appliquée à l’ensemble : gratuit');
  assert.equal(bilanDe([cal, cali]).reglagesEnTrop, 1,
    'les deux phases dans la même voie : un réglage surnuméraire');

  // …et les deux valent bien l’opposé l’une de l’autre — c’est ce qui fait
  // d’elles un réglage et non deux idées.
  assert.equal(cal.apply([8, 15, 16, 5], [[], [], [], []]).valeur, 4);
  assert.equal(cali.apply([8, 15, 16, 5], [[], [], [], []]).valeur, -4);
});

test('★ traductions — le même mot lu de deux façons coûte plus cher qu’un César de trop', () => {
  assert.ok(BAREME.TRADUCTION_DIVERGENTE > BAREME.REGLAGE_PAR_MORCEAU,
    `« encore pire » doit se lire au barème (${BAREME.TRADUCTION_DIVERGENTE} `
    + `contre ${BAREME.REGLAGE_PAR_MORCEAU})`);

  // ★ L'ACCEPTION EST PUBLIÉE, jamais devinée au code — c'est ce qui rend le
  //   compte possible sans lire une chaîne (`filtres.js`, champ `acception`).
  for (const [id, rang] of [['f.traduitFR', 1], ['f.traduitFR3', 3], ['f.traduitEN5', 5]]) {
    assert.equal(operateur(id).acception, rang, `${id} doit publier son acception`);
  }

  // Une part réduite à ce que le compte lit : l'opérateur, et le mot qu'il a
  // reçu en entrée. Le reste du chemin ne l'intéresse pas.
  const par = (code, mot = 'hope') => ({
    chemin: { ops: [catalogue.find((o) => o.code === code)], etats: [etat('STR', mot)] },
  });
  // Deux morceaux, le MÊME mot, deux acceptions : une divergence.
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr')]), 1);
  // Trois acceptions du même mot : deux surnuméraires.
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr'), par('ffr2')]), 2);
  // ★ LA MÊME acception partout ne coûte RIEN — « pas de malus à choisir les
  //   suivantes » reste vrai, c'est la DIVERGENCE qui se paie, pas le rang.
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr3')]), 0);
  assert.equal(compterTraductionsDivergentes([par('ffr5'), par('ffr5')]), 0);
  // ★ ET DEUX MOTS DIFFÉRENTS lus chacun à leur façon ne coûtent rien : « un
  //   même mot » est la lettre de l'arbitrage, et sa limite.
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('ffr', 'love')]), 0);
  // Le repli est celui du dictionnaire : « Hope » et « hope » sont un seul mot.
  assert.equal(compterTraductionsDivergentes([par('ffr3', 'Hope'), par('ffr', 'hope')]), 1);
  // Changer de LANGUE n'est pas changer de lecture : ce sont deux traductions.
  assert.equal(compterTraductionsDivergentes([par('ffr3'), par('fen')]), 0);
});

test('★ traductions — la recherche n’en produit plus aucune', () => {
  const m = creerMoteur(catalogue);
  let vues = 0;
  for (const saisie of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Les 7 nains']) {
    for (const a of m.resoudre(saisie).approches) {
      vues++;
      assert.equal(compterTraductionsDivergentes(a.parts || []), 0,
        `« ${saisie} » : un mot y est traduit de deux façons — ${a.codes}`);
    }
  }
  assert.ok(vues >= 10, `seulement ${vues} voies observées`);
});

test('★ `meg` n’est pas une ficelle — mais son uniformisation se paie encore', () => {
  assert.ok(!Object.prototype.hasOwnProperty.call(FICELLES, 'm.egalisation'),
    'elle ne doit pas figurer parmi les ficelles');

  const op = operateur('m.egalisation');
  const avant = etat('NUMS', [8, 15, 16, 5]);
  const brut = op.apply(avant.valeur, avant.valeur.map(() => []));
  const apres = etat('NUMS', brut.valeur);
  assert.deepEqual(apres.valeur, [11, 11, 11, 11],
    'elle égalise sur la moyenne de la ligne, et sur rien d’autre');

  const b = bilanChemin({ ops: [op], etats: [avant, apres] });
  assert.equal(b.egalisees, 4, 'chaque valeur réécrite se compte, une par une');
  assert.ok(BAREME.EGALISATION > 0, 'et le palier n’est pas nul');

  // ★ CE QUI LA DISTINGUE D'UNE FICELLE, en un seul assert : le résultat n'est
  //   pas choisi. Aucune ligne ne peut être égalisée vers autre chose que sa
  //   propre moyenne — donc `meg` échoue partout où cette moyenne n'est pas la
  //   cible, et c'est une propriété du mot lu, pas du geste posé.
  assert.ok(!apres.valeur.includes(6),
    'sur ce vecteur-là elle ne produit aucun 6 : elle ne marche pas toujours');

  // ★ Sa notoriété est basse et c'est voulu : le geste se comprend en le
  //   voyant, il ne se reconnaît pas. Sortir des ficelles n'est pas devenir
  //   gratuite — c'est cesser d'être traitée en suspecte.
  assert.ok(op.notoriete <= 0.2,
    `égaliser une ligne n’est pas un geste connu du lecteur (${op.notoriete})`);
});

/**
 * ★ `6, 5, 16, 8` → `6, 5+1, 6, 8` → `666, 8` — LE CAS ÉCRIT PAR L'AUTEUR.
 *
 * « La logique voudrait `6+5+1+6+8`, ou `6, 5, 1+6, 8` ; faire `6, 5+1, 6, 8`
 * pour obtenir `666, 8` est acceptable mais pénalisé — c'est de la triche à
 * utiliser en dernier recours. »
 *
 * Le balayage glouton de `mad` rend EXACTEMENT la découpe qu'il désigne, et pas
 * l'une des deux qu'il écarte : à gauche, la plus courte, jamais un 6 déjà là.
 */
test('★ addition sélective — `6, 5, 16, 8` donne bien `666, 8`, et pas autre chose', () => {
  const op = operateur('m.additionSelective');
  const r = op.apply([6, 5, 16, 8], [[], [], [], []]);
  assert.deepEqual(r.valeur, [6, 6, 6, 8],
    'la découpe retenue est `6, 5+1, 6, 8` — celle que l’auteur nomme');

  // Les deux autres lectures qu'il cite ne sont PAS ce que l'opérateur rend.
  assert.notDeepEqual(r.valeur, [35], 'ce n’est pas `6+5+1+6+8`');
  assert.notDeepEqual(r.valeur, [6, 5, 7, 8], 'ce n’est pas `6, 5, 1+6, 8`');

  // ★ Un 6 déjà écrit n'est jamais absorbé : l'additionner le détruirait.
  assert.equal(op.apply([1, 5, 6], [[], [], []]), null,
    '`1+5` ferait un 6, mais le résultat `[6,6]` n’écrit pas 666 : on refuse');
  assert.deepEqual(op.apply([1, 5, 6, 2, 4], [[], [], [], [], []]).valeur, [6, 6, 6],
    '`1+5` puis `2+4` encadrent le 6 déjà là, qu’on ne touche pas');

  // ★ Et un découpage en chiffres qui n'additionne RIEN est refusé : l'URL
  //   porterait un code pour un geste que la scène ne montrerait pas.
  assert.equal(op.apply([16, 8], [[], []]), null,
    'découper `16` sans rien additionner n’est pas une addition sélective');
});

/**
 * ★ LE DÉPARTAGE DES EX ÆQUO EST UN REFUS, PAS UNE PRÉFÉRENCE.
 *
 * §4.4 exige une règle explicite et stable partout où deux candidats pourraient
 * s'égaler. Les deux ficelles qui COMPARENT — la majorité, la parité — ne
 * tranchent pas : elles refusent de s'appliquer. C'est le seul départage qui
 * n'invente rien, et il rend le résultat indépendant de l'ordre d'itération
 * d'une `Map` ou de la stabilité d'un tri.
 */
test('★ ficelles — à égalité, la règle REFUSE au lieu de choisir', () => {
  const m10 = operateur('m.plusFrequent');
  const m11 = operateur('m.unRangSurDeux');
  const t = (v) => v.map(() => []);

  // Deux valeurs aussi fréquentes l'une que l'autre : aucun vainqueur.
  assert.equal(m10.apply([6, 6, 6, 4, 4, 4], t([6, 6, 6, 4, 4, 4])), null,
    'trois 6 et trois 4 : « le plus fréquent » n’a personne à désigner');
  // …et l'ordre de lecture n'y change rien : le refus est symétrique.
  assert.equal(m10.apply([4, 4, 4, 6, 6, 6], t([4, 4, 4, 6, 6, 6])), null,
    'le même vecteur retourné donne le même refus');

  // Les deux parités portent autant de 6 : aucune ne vaut mieux.
  assert.equal(m11.apply([6, 6, 6, 6, 6, 6], t([6, 6, 6, 6, 6, 6])), null,
    'trois 6 de chaque côté : la parité ne se départage pas');

  // ★ Le vainqueur n'est JAMAIS truqué en faveur du 6 : quand le plus fréquent
  //   n'est pas un 6, la ficelle ne rend pas les 6 — elle ne s’applique pas.
  assert.equal(m10.apply([4, 4, 4, 4, 6, 3], t([4, 4, 4, 4, 6, 3])), null,
    '« le plus fréquent » est le 4 : on ne lui substitue pas le 6, on renonce');
});

/**
 * ★ UNE FICELLE NE S'APPLIQUE QUE SI ELLE ÉCRIT 666.
 *
 * `exige`, au sens de `mr9` et `m36` : un opérateur qui ne change rien, ou qui ne
 * sert à rien, fabrique une étape que `scenario.js` saute EN SILENCE — et l'URL
 * porte alors un code que la démonstration ne montre nulle part.
 */
test('★ ficelles — elles refusent quand elles n’achètent rien', () => {
  const t = (v) => v.map(() => []);
  for (const [code, id] of [['mpf', 'm.plusFrequent'], ['m1s2', 'm.unRangSurDeux'],
    ['mad', 'm.additionSelective']]) {
    const op = operateur(id);
    // Rien à écarter : le vecteur est déjà uniforme.
    assert.equal(op.apply([6, 6, 6], t([6, 6, 6])), null,
      `${code} : un vecteur qui vaut déjà 666 n’a besoin de personne`);
    // Rien à en tirer : le résultat n'écrirait pas 666.
    assert.equal(op.apply([1, 2, 3, 4], t([1, 2, 3, 4])), null,
      `${code} : sans 666 au bout, la ficelle a coûté et n’a rien acheté`);
  }
});

/**
 * ★ LE PRIX DES FICELLES — l'ordre de l'auteur, gelé.
 *
 * « Du plus laid au moins laid : ne garder artificiellement que les 6 ; le plus
 * fréquent l'emporte ; garder un caractère sur deux ; l'addition sélective. »
 *
 * Les quatre paliers sont dans la MÊME unité — ce que le geste coûte PAR VALEUR
 * écartée (par chiffre absorbé pour le dernier) —, ce qui est la seule façon de
 * les comparer sans tricher.
 */
test('★ barème — l’ordre de laideur des trois ficelles est celui de l’auteur', () => {
  // ⚠️ On ne compare PAS ces trois-là à `VALEUR_JETEE`, et c'est mesuré : elles
  //    ACHÈTENT quelque chose que le tri arbitraire n'achète pas (le triptyque
  //    contigu, son couronnement, le solde multiple de trois — un demi-millier
  //    de milli-unités), si bien qu'un tarif aligné sur `VALEUR_JETEE` en
  //    ferait une AFFAIRE. « Moins bas que la suppression arbitraire » est une
  //    consigne sur le SCORE, pas sur le tarif, et c'est le test suivant qui la
  //    vérifie — sur deux voies comparées à vecteur de départ égal.
  assert.ok(BAREME.MAJORITE > BAREME.DECIMATION,
    'l’astuce du caractère sur deux est moins laide que la majorité — l’auteur le dit');
  assert.ok(BAREME.DECIMATION > BAREME.ADDITION_SELECTIVE,
    'l’addition sélective est la moins laide des trois : elle n’écarte rien, elle absorbe');
  assert.ok(BAREME.ADDITION_SELECTIVE > 0, 'aucune des trois n’est gratuite');
});

/**
 * ★ « MOINS BAS QUE LA SUPPRESSION ARBITRAIRE DE CE QUI N'EST PAS 6 ».
 *
 * C'est un SOLDE, pas un tarif : l'auteur parle du SCORE que reçoit une
 * approche, pas du prix d'une ligne du barème. On mesure donc les deux voies
 * sur le MÊME vecteur de départ, `[6,4,6,3,6]` :
 *
 *  · sans ficelle, le verdict trie lui-même — trois 6 gardés, deux valeurs
 *    jetées, et les 6 restent DISPERSÉS : aucun bonus de contiguïté ;
 *  · avec `m1s2`, le vecteur devient `[6,6,6]` : le 666 est écrit d'affilée, et
 *    les deux valeurs écartées se paient au tarif de la ficelle.
 *
 * La ficelle doit gagner — et gagner sans excès : une méthode qui atteint le
 * même `[6,6,6]` SANS ficelle doit rester devant.
 */
/**
 * ★ LA DILUTION — « le malus de triche se dilue avec le nombre d'additions ».
 *
 * > « Pour les additions sélectives comme triche : le malus de triche devrait
 * > être dilué avec le nombre d'additions d'affilée. Plus il y en a, moins la
 * > triche se verra, et plus la triche est éloignée de la première et de la
 * > dernière addition d'affilée, plus le fait d'en ajouter une ou d'en retirer
 * > une […] passera inaperçu et donc avec une bien moindre pénalité (qui
 * > devient presque négligeable pour l'exemple que je t'ai donné, vu le nombre
 * > d'additions). » — l'auteur.
 *
 * Trois choses à geler, et ce sont exactement les trois qu'il énonce : la
 * décroissance avec la LONGUEUR de la série, la décroissance avec la DISTANCE
 * aux extrémités, et le fait que ça ne tombe jamais à zéro.
 */
test('★ dilution — une triche noyée dans les additions coûte de moins en moins', () => {
  const serie = (n) => Array.from({ length: n }, () => 2); // n additions de 2 termes
  const courte = dilution(serie(1));
  const moyenne = dilution(serie(5));
  const longue = dilution(serie(16));

  // ★ Non-régression EXACTE : une triche SEULE paie exactement le prix plein.
  //   C'est ce qui garantit que le cas de l'auteur — `6, 5+1, 6, 8`, une seule
  //   addition — coûte aujourd'hui ce qu'il coûtait avant la dilution.
  assert.equal(courte, 1000, 'une addition isolée n’est pas diluée du tout');

  assert.ok(moyenne < courte, `${moyenne} doit être sous ${courte}`);
  assert.ok(longue < moyenne, `${longue} doit être sous ${moyenne}`);
  // « Presque négligeable » : à seize additions, la série ENTIÈRE coûte moins du
  // quart de ce que coûte UNE triche isolée.
  assert.ok(longue * 4 < courte,
    `à seize additions, la série entière (${longue}) doit valoir moins du quart d’une seule (${courte})`);

  // ★ Et jamais zéro : une triche diluée reste une triche.
  assert.ok(dilution(serie(200)) > 0, 'une série très longue ne devient pas gratuite');
  assert.ok(BAREME.REDECOUPAGE > 0 && BAREME.ADDITION_SELECTIVE > 0);

  // ★ Tout est ENTIER — §4.4, pas un flottant nulle part.
  for (const n of [1, 2, 3, 5, 8, 13, 21, 34]) {
    assert.ok(Number.isInteger(dilution(serie(n))), `dilution(${n}) n’est pas entier`);
  }
  assert.equal(dilution([]), 0, 'aucune addition, aucune peine');
  assert.equal(dilution([1, 1, 1]), 0, 'des « additions » à un seul terme n’absorbent rien');
});

/**
 * ★ …et la DISTANCE AUX EXTRÉMITÉS, isolée de la longueur.
 *
 * « Plus la triche est éloignée de la première et de la dernière addition
 * d'affilée, […] plus elle passera inaperçu. » On compare donc, à série de
 * longueur ÉGALE, ce que coûte la même addition selon qu'elle est au bord ou au
 * milieu : une seule addition absorbe, les autres ne pèsent rien, si bien que
 * la seule chose qui varie est sa PLACE.
 */
test('★ dilution — au milieu de la série, la même triche coûte moins qu’au bord', () => {
  const N = 7;
  const placer = (j) => dilution(Array.from({ length: N }, (_, k) => (k === j ? 4 : 1)));
  assert.ok(placer(3) < placer(0), `au milieu (${placer(3)}) doit coûter moins qu’au bord (${placer(0)})`);
  assert.equal(placer(0), placer(N - 1), 'les deux bords se valent — la série n’a pas de sens');
  assert.ok(placer(1) < placer(0) && placer(2) < placer(1),
    'la peine décroît à mesure qu’on s’enfonce dans la série');
  assert.ok(placer(3) >= 1, 'jamais zéro, même au cœur de la série');
});

/**
 * ★ L'ORDRE DES PALIERS DE TRICHE, DEUX AJOUTS COMPRIS.
 *
 * Deux paliers neufs, et il faut dire d'où ils tiennent leur rang :
 *
 *  · `EFFACEMENT_SANS_MOTIF` est au SOMMET, et c'est l'auteur mot pour mot :
 *    « l'effacement est une étape à part, et s'il n'a pas de motif (chiffre
 *    minoritaire, pair/impair) c'est probablement la pire des triches, à
 *    pénaliser en conséquence » ;
 *  · `REDECOUPAGE` s'insère entre la majorité et la décimation, et l'auteur n'a
 *    JAMAIS comparé celui-là aux autres : c'est un arbitrage, écrit comme tel
 *    dans le barème, et ce test ne fait que l'empêcher de dériver.
 *
 * `REARRANGEMENT` n'entre dans aucune des deux chaînes — l'auteur ne traite pas
 * le tri croissant de triche —, mais il ne peut pas être gratuit : sans lui, un
 * rangement encaisserait `TRIPTYQUE_CONTIGU` pour une contiguïté qu'il vient de
 * fabriquer.
 */
test('★ barème — les deux paliers neufs prennent leur rang, et il est écrit', () => {
  assert.ok(BAREME.EFFACEMENT_SANS_MOTIF > BAREME.REDECOUPAGE,
    'effacer sans motif est la pire des triches — l’auteur le dit');
  assert.ok(BAREME.EFFACEMENT_SANS_MOTIF > BAREME.MAJORITE,
    '…y compris devant la majorité, qui efface mais SAIT dire pourquoi');
  // ★ Le redécoupage passe devant les trois ficelles au TARIF, et c'est
  //   précisément parce qu'il est le seul à être divisé avant d'être facturé :
  //   au-delà d'une addition isolée, ce qu'il paie réellement fond (voir
  //   `dilution`). Comparer son tarif à ceux qui ne diluent pas n'aurait pas de
  //   sens ; ce qu'on gèle ici, c'est qu'il ne redescende pas à leur niveau —
  //   il y deviendrait gratuit là où on l'emploie, sur les longues lignes.
  assert.ok(BAREME.REDECOUPAGE > BAREME.MAJORITE,
    'le redécoupage dilue : son tarif doit dominer ceux qui ne diluent pas');
  assert.ok(BAREME.REDECOUPAGE > BAREME.ADDITION_SELECTIVE,
    'des deux triches qui absorbent, c’est lui qui choisit ses coupes — donc lui le plus laid');
  assert.ok(BAREME.ADDITION_SELECTIVE > BAREME.REARRANGEMENT,
    'ranger n’est pas tricher : c’est le palier le plus léger du barème');
  assert.ok(BAREME.REARRANGEMENT > 0, '…et il n’est pas gratuit pour autant');
  // La chaîne de l'auteur, elle, n'a pas bougé d'un cran (test dédié plus haut).
  assert.ok(BAREME.MAJORITE > BAREME.DECIMATION
    && BAREME.DECIMATION > BAREME.ADDITION_SELECTIVE);
});

/**
 * ★ LE PALIER QUI ATTEND SON OPÉRATEUR.
 *
 * `effacementSansMotif` est écrit, chiffré, branché dans le détail du crédit —
 * et son compteur vaut zéro, parce qu'aucun opérateur du catalogue n'efface
 * sans savoir dire pourquoi. Il attend la scission du geste de `m36`, qui
 * couronne ET tronque en un seul mouvement indivisible.
 *
 * Ce test gèle les deux moitiés de la promesse : le palier EXISTE (une ligne de
 * crédit, pas une constante morte) et il DORT (aucun identifiant du catalogue ne
 * l'alimente aujourd'hui). Le jour où l'on inscrira un opérateur en face de
 * `'effacementSansMotif'` dans `FICELLES`, la seconde moitié tombera — et c'est
 * très bien : elle aura fait son travail de garde-fou jusque-là.
 */
test('★ barème — le palier « effacement sans motif » existe et dort encore', () => {
  const postes = detailDuCredit(bilanApproche({ parts: [] }, ctxDe('x')));
  const ligne = postes.find((l) => l.poste.includes('effacement sans motif'));
  assert.ok(ligne, 'le palier doit avoir sa ligne dans le détail du crédit');
  assert.equal(ligne.quantite, 0, 'aucun opérateur ne l’alimente encore');
  assert.ok(ligne.points === 0, 'et il ne retire donc rien');
  assert.ok(!Object.values(FICELLES).includes('effacementSansMotif'),
    'aucun opérateur n’est encore inscrit en face du compteur');
  // Et il est bien classé du côté des ficelles qui ÉCARTENT : c'est ce qui lui
  // vaudra, le jour venu, l'exemption de « valeurs jetées » et la lecture du
  // vecteur le plus large par le rendement (`score.js`).
  assert.ok(FICELLES_QUI_ECARTENT instanceof Set);
  for (const id of FICELLES_QUI_ECARTENT) {
    assert.ok(['majorite', 'decimation', 'effacementSansMotif'].includes(FICELLES[id]),
      `${id} n’écarte pas`);
  }
});

/**
 * ★ LES QUATRE TRANSFORMATIONS DU 27 AOÛT, VUES PAR LE BARÈME.
 *
 * Chacune pose une question différente au bilan, et les quatre réponses sont
 * des décisions, pas des effets de bord :
 *
 *  · **le tri croissant** ne jette rien et ne convertit rien — aucun poste
 *    ordinaire ne le voyait passer. Il alimente `rearrangement`, et lui seul ;
 *  · **le retournement par trios** est un demi-tour comme celui de `mr9` : le
 *    vecteur garde sa largeur, rien n'est jeté, rien n'est puni ;
 *  · **le décompte des chiffres** RÉTRÉCIT la ligne sans rien écarter — trois 6
 *    entrent ENTIÈREMENT dans le « 3 ». Il ne paie donc pas `valeursJetees`,
 *    mais il paie les 6 qu'il fait disparaître (`sixDetruits`) ;
 *  · **le redécoupage** est une ficelle, et il alimente son palier DILUÉ.
 */
test('★ les quatre transformations du 27 août alimentent le bon poste', () => {
  const bilan = (id, entree) => {
    const op = operateur(id);
    const brut = op.apply(entree, entree.map(() => []));
    assert.ok(brut, `${id} doit s’appliquer à ${JSON.stringify(entree)}`);
    return bilanChemin({ ops: [op], etats: [etat('NUMS', entree), etat('NUMS', brut.valeur)] });
  };

  // ── le tri croissant : l'exemple de l'auteur, `95956636494 → 34455666999`
  const tri = bilan('m.triCroissant', [9, 5, 9, 5, 6, 6, 3, 6, 4, 9, 4]);
  assert.ok(tri.rearrangement > 0, 'un tri qui déplace doit payer le réarrangement');
  assert.equal(tri.valeursJetees, 0, 'un tri ne jette rien');
  assert.equal(tri.sixDetruits, 0, 'un tri ne convertit rien');

  // ── les trios de 9 : même largeur, aucun malus
  const trios = bilan('m.retournerLesTrios', [9, 9, 9, 9, 3, 9]);
  assert.equal(trios.rearrangement, 0);
  assert.equal(trios.valeursJetees, 0);
  assert.equal(trios.sixDetruits, 0, 'on ne détruit pas des 6, on en fabrique');

  // ── le décompte : il absorbe, il ne jette pas — mais il perd des 6
  const compte = bilan('m.compterLesChiffres', [3, 4, 4, 5, 5, 6, 6, 6, 9, 9, 9]);
  assert.equal(compte.valeursJetees, 0,
    'compter n’écarte rien : les trois 6 sont ENTIÈREMENT dans le « 3 »');
  assert.equal(compte.sixDetruits, 2,
    'trois 6 qui deviennent « 3 6 », ce sont deux 6 convertis en autre chose');

  // ── le redécoupage : plus une ficelle, mais toujours à son palier, et DILUÉ
  const chiffres = [4, 8, 1, 2, 0, 1, 2, 0, 9, 6, 1, 1, 4, 1, 0, 8, 8, 4, 3, 6,
    1, 8, 1, 3, 2, 2, 4, 3, 6, 1, 0, 8];
  const redec = bilan('m.redecoupageChoisi', chiffres);
  assert.ok(!Object.prototype.hasOwnProperty.call(FICELLES, 'm.redecoupageChoisi'),
    'il ne doit plus figurer parmi les ficelles — l’auteur l’en a retiré');
  assert.ok(redec.redecoupage > 0, 'le redécoupage doit alimenter son palier quand même');
  assert.ok(A_MERITER_SA_PLACE.has('m.redecoupageChoisi'),
    'il doit mériter sa place dans le faisceau : il fabrique des 6 par construction');
  assert.equal(redec.valeursJetees, 0, 'son palier REMPLACE « valeurs jetées »');
  // ★ Et la dilution mord : vingt et un chiffres sont absorbés, le compteur en
  //   pèse une fraction — « presque négligeable, vu le nombre d'additions ».
  const sortie = operateur('m.redecoupageChoisi').apply(chiffres, chiffres.map(() => []));
  const absorbes = chiffres.length - sortie.valeur.length;
  assert.ok(redec.redecoupage * 10 < absorbes * 1000,
    `${redec.redecoupage} millièmes pour ${absorbes} chiffres absorbés : la dilution doit mordre`);
});

/**
 * ★ `emploieUneFicelle` se lit sur les COMPTEURS, jamais sur les codes.
 *
 * C'est ce qui permet à `index.js` d'écarter les ficelles de la 2ᵈ suggestion —
 * la place qui récompense le NOMBRE de séries — sans tenir une seconde liste
 * d'identifiants qui se désynchroniserait du barème.
 */
test('★ une ficelle se reconnaît à son compteur, pas à son code', () => {
  assert.equal(emploieUneFicelle(null), false);
  assert.equal(emploieUneFicelle({}), false);
  for (const compteur of new Set(Object.values(FICELLES))) {
    assert.equal(emploieUneFicelle({ [compteur]: 1 }), true, compteur);
    assert.equal(emploieUneFicelle({ [compteur]: 0 }), false, compteur);
  }
});

test('★ ficelles — mieux que le tri arbitraire, moins bien qu’une voie honnête', () => {
  const saisie = 'motfinal';
  const ctx = ctxDe(saisie);
  const parCredit = (ch) => credit(bilanApproche(approche(saisie, [0, 8], ch), ctx));

  // 1. le tri arbitraire : on laisse le verdict écarter ce qui n'est pas 6
  const tri = parCredit(vecteur([6, 4, 6, 3, 6]));
  // 2. la ficelle : `m1s2` isole les rangs impairs et écrit 666
  const ficelle = parCredit(chemin([
    etat('STR', 'xxxxx'),
    etat('TOKENS', ['x', 'x', 'x', 'x', 'x']),
    etat('NUMS', [6, 4, 6, 3, 6]),
    etat('NUMS', [6, 6, 6]),
  ], ['t.caracteres', 'm.postiche', 'm.unRangSurDeux']));
  // 3. la voie honnête : elle écrit 666 sans ficelle — et elle lit AUTANT que
  //    les deux autres. ⚠️ C'est une correction, pas une coquetterie : depuis
  //    `PORTEE_IGNOREE`, une voie qui ne regarde que trois caractères là où sa
  //    rivale en regarde cinq paie la différence, et la comparaison ne portait
  //    plus sur la ficelle mais sur la couverture. Les trois fixtures partent
  //    donc des mêmes cinq jetons.
  const honnete = parCredit(vecteur([6, 6, 6, 6, 6]));

  assert.ok(ficelle > tri,
    `la ficelle (${ficelle}) doit valoir mieux que la suppression arbitraire (${tri})`);
  assert.ok(honnete > ficelle,
    `une voie qui écrit 666 sans ficelle (${honnete}) doit rester devant (${ficelle})`);
});

/**
 * ★ ALOURDIR LE GASPILLAGE PROMEUT LES FICELLES — le piège, gelé.
 *
 * ⚠️ Ce test n'existe pas pour vérifier un réglage : il existe pour empêcher
 * qu'on refasse une expérience déjà faite. `VALEUR_JETEE` est le seul barreau
 * irrégulier de l'échelle des abandons (26 → 36, là où le pas est de trois), et
 * l'alourdir est une idée qui revient. Elle a été essayée et mesurée : à 45
 * déjà, `Le chat dort sur le tapis rouge` passe d'une moisson à cinq séries
 * (crédit 1 129) à `fr13+tca+m14+mpf`, une ficelle à une seule série (1 102).
 *
 * La raison est STRUCTURELLE, et c'est elle qu'on gèle ici : les ficelles ne
 * paient pas ce poste — leur palier le remplace. Tout milli-unité ajoutée à
 * `VALEUR_JETEE` est donc une milli-unité d'avance offerte à la ruse qui
 * escamote le gaspillage plutôt qu'à la voie qui l'assume.
 */
test('★ le gaspillage et les ficelles — alourdir l’un avantage mécaniquement l’autre', () => {
  const saisie = 'motfinal';
  const ctx = ctxDe(saisie);
  const bilanDe = (ch) => bilanApproche(approche(saisie, [0, 8], ch), ctx);

  // Deux voies sur le MÊME vecteur de départ : le tri du verdict, ou la ficelle.
  const tri = bilanDe(vecteur([6, 4, 6, 3, 6]));
  const ficelle = bilanDe(chemin([
    etat('STR', 'xxxxx'),
    etat('TOKENS', ['x', 'x', 'x', 'x', 'x']),
    etat('NUMS', [6, 4, 6, 3, 6]),
    etat('NUMS', [6, 6, 6]),
  ], ['t.caracteres', 'm.postiche', 'm.unRangSurDeux']));

  // Le tri paie le RELIQUAT du verdict ; la ficelle ne le paie PAS, elle paie
  // son palier. (Depuis le partage en trois, ce que le verdict laisse au bord
  // ne se confond plus avec ce qu'on efface en chemin — voir `VALEUR_JETEE`.)
  assert.ok(tri.jeteesAuTri > 0, 'le tri arbitraire laisse du monde au bord, et il le paie');
  assert.equal(ficelle.jeteesAuTri, 0, 'la ficelle ne paie jamais ce poste — son palier le remplace');
  assert.equal(ficelle.valeursJetees, 0, '…et elle n’efface rien en chemin non plus');
  assert.ok(ficelle.decimation > 0, '…et elle paie le sien');

  // Donc : alourdir le palier que le TRI paie creuse l'écart EN FAVEUR de la
  // ficelle, et l'avantage offert est exactement ce que la ficelle ne paie pas.
  const ecart = (poids) => {
    const memoire = BAREME.RELIQUAT_HORS_CIBLE;
    BAREME.RELIQUAT_HORS_CIBLE = poids;
    const d = credit(ficelle) - credit(tri);
    BAREME.RELIQUAT_HORS_CIBLE = memoire;
    return d;
  };
  const a50 = ecart(50);
  const a100 = ecart(100);
  assert.ok(a100 > a50,
    `alourdir le reliquat (50 → 100) doit AVANTAGER la ficelle (${a50} → ${a100})`);
  assert.equal(a100 - a50, (100 - 50) * tri.reliquatHorsCible,
    'l’avantage offert est exactement le reliquat que la ficelle ne paie pas');

  // ★ **ET C'EST PRÉCISÉMENT CE QUI A RENDU LE PARTAGE EN TROIS NÉCESSAIRE.**
  //
  // Tant qu'un seul palier facturait les deux gestes, la consigne « jeter une
  // valeur en cours de route, c'est vraiment à éviter » ne pouvait pas être
  // appliquée : la monter payait mécaniquement la ficelle, puisque le tri du
  // verdict — son concurrent honnête — payait le même palier. Séparés, le
  // gaspillage EN ROUTE peut monter à 300 sans rien offrir à la ficelle, parce
  // que le tri, lui, ne le paie plus du tout.
  assert.equal(tri.valeursJetees, 0, 'le tri du verdict n’efface rien en chemin');
  const large = (poids) => {
    const memoire = BAREME.VALEUR_JETEE;
    BAREME.VALEUR_JETEE = poids;
    const d = credit(ficelle) - credit(tri);
    BAREME.VALEUR_JETEE = memoire;
    return d;
  };
  assert.equal(large(36), large(300),
    'alourdir le gaspillage en route n’offre plus rien à la ficelle');
});

/**
 * ★ ET LES FICELLES NE PASSENT JAMAIS DEVANT SUR LES CAS DE RÉFÉRENCE.
 *
 * « À utiliser en dernier recours si des méthodes plus élégantes ne parviennent
 * pas à 666 » — la recette, mesurée là où elle compte : les quatre saisies dont
 * l'auteur a fixé le résultat. Aucune ficelle ne doit figurer dans leur voie de
 * tête.
 */
test('★ ficelles — aucune ne figure en tête des quatre cas de référence', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
    // ★ Les comptes ont monté d'une série : `MAX_SERIES` rabotait le COMPTAGE
    //   et non l'affichage (`assemblage.js`). Ce que la recherche trouve ici,
    //   elle le trouvait déjà — elle ne pouvait pas le compter.
  const attendus = {
    'hope-hope-hope.fr': 6,
    'https://hope-hope-hope.fr/': 7,
    'Donald Trump': 3,
    Macron: 2,
  };
  for (const [saisie, series] of Object.entries(attendus)) {
    // ★ AMENDEMENT — « la tête » est désormais les DEUX premières lignes.
    //   La 1ʳᵉ répond à « la plus belle », la 2ᵈ à « la plus fournie » (voir
    //   `score.js › POIDS_DES_REGIMES`). Le compte que l'auteur a nommé est donc
    //   à chercher sur celle des deux qui en aligne le plus, et l'interdiction
    //   de ficelle, elle, PORTE SUR LES DEUX — c'est un renforcement, pas un
    //   relâchement : ce qui était interdit à une ligne l'est maintenant à deux.
    const tete = m.resoudre(saisie).approches.slice(0, 2);
    const fournie = tete.reduce((a, b) => ((b.series || 1) > (a.series || 1) ? b : a));
    assert.equal(fournie.series || 1, series,
      `« ${saisie} » : ${series} séries attendues en tête, ${fournie.series} trouvées`);
    for (const a of tete) {
      // ★ La liste n'est PAS écrite ici : elle se lit dans `FICELLES`, pour que
      //   ce test dise toujours « aucune ficelle », et jamais « aucun de ces
      //   trois codes-là ». C'est ce qui l'a fait changer tout seul le jour où
      //   `m.plusFrequent` en est sortie — « mpf ne doit plus être considéré
      //   comme une ficelle ! » (l'auteur) — au lieu d'interdire encore un
      //   opérateur que le barème avait cessé de traiter en suspect.
      for (const code of codesDesFicelles()) {
        assert.ok(!a.codes.includes(code),
          `« ${saisie} » : la voie de tête (${a.codes}) emploie la ficelle ${code}`);
      }
    }
  }
});

/**
 * ★ LE COMPTE DES TRIPTYQUES — autant de bonus que de 666 écrits d'affilée.
 *
 * ⚠️ Le bonus se comptait PAR PORTÉE qui en porte un. `fl+tca+m14` sur
 * `hope-hope-hope` rend douze 6 d'affilée — QUATRE 666 — et n'en touchait
 * qu'un seul. Le compte est réparé ; le premier de chaque portée reste une
 * trouvaille à plein tarif, les suivants du même vecteur valent moins.
 */
test('★ triptyques — on compte les 666, pas les portées qui en contiennent', () => {
  assert.equal(nbTriptyques([6, 6, 6]), 1);
  assert.equal(nbTriptyques([6, 6, 6, 6]), 1, 'quatre 6 ne font pas deux 666');
  assert.equal(nbTriptyques([6, 6, 6, 6, 6, 6]), 2);
  assert.equal(nbTriptyques(new Array(12).fill(6)), 4, 'douze 6 d’affilée font quatre 666');
  assert.equal(nbTriptyques([6, 6, 6, 5, 6, 6, 6]), 2, 'la suite est CONTIGUË, ou elle n’est pas');
  assert.equal(nbTriptyques([6, 6, 5, 6, 6]), 0);

  // Sur une approche : douze 6 d'affilée, quatre séries au verdict.
  const saisie = 'hopehopehope';
  const b = bilanApproche(
    approche(saisie, [0, 12], vecteur(new Array(12).fill(6)), { series: 4 }),
    ctxDe(saisie),
  );
  assert.equal(b.triptyquesContigus, 1, 'une portée, une trouvaille');
  assert.equal(b.triptyquesRepetes, 3, 'les trois autres 666 du même vecteur sont crédités à part');
  assert.ok(BAREME.TRIPTYQUE_REPETE < BAREME.TRIPTYQUE_CONTIGU,
    'le 666 qui continue vaut moins que celui qui se découvre');

  // ★ Et jamais plus de triptyques que le verdict n'en montre.
  const bornee = bilanApproche(
    approche(saisie, [0, 12], vecteur(new Array(12).fill(6)), { series: 1 }),
    ctxDe(saisie),
  );
  assert.equal(bornee.triptyquesContigus + bornee.triptyquesRepetes, 1,
    'une seule série au verdict : un seul triptyque crédité');
});

// ══════════════════════════════════ les vecteurs que l'auteur a nommés

/**
 * ★ « `[6,6,6,4,4]` est légèrement supérieur à `[4,4,6,6,6]` (ordre de lecture,
 * le 666 en premier). » — l'auteur.
 *
 * Les deux vecteurs sont identiques en tout point sauf l'ordre : mêmes valeurs,
 * même largeur, même nombre de 6, même triptyque contigu. Seule la place du
 * triptyque les distingue, et c'est exactement ce qu'on veut mesurer.
 *
 * La portée est le PREMIER mot d'une saisie qui en compte deux : sans quoi la
 * règle du « dernier mot » (test suivant) s'appliquerait et les égaliserait.
 */
test('★ [6,6,6,4,4] passe devant [4,4,6,6,6] — l’ordre de lecture compte', () => {
  const saisie = 'premier second';
  const tete = creditDe(saisie, [0, 7], [6, 6, 6, 4, 4]);
  const queue = creditDe(saisie, [0, 7], [4, 4, 6, 6, 6]);
  assert.ok(tete > queue, `[6,6,6,4,4] = ${tete} doit dépasser [4,4,6,6,6] = ${queue}`);
  // « LÉGÈREMENT supérieur » : l'écart ne doit pas écraser les autres critères.
  assert.ok(tete - queue <= BAREME.COURONNEMENT_TOT,
    `l’écart (${tete - queue}) ne peut pas dépasser le bonus de précocité entier`);
});

/**
 * ★ « Mais si `[4,4,6,6,6]` apparaît sur le dernier mot, le bonus est annulé :
 * finir par 666 est bien aussi. » — l'auteur.
 *
 * Ce qui est annulé, c'est l'ÉCART entre les deux, pas le mérite : le bonus est
 * rendu plein, il n'est pas retiré.
 */
test('★ …mais sur le DERNIER mot, [4,4,6,6,6] rattrape [6,6,6,4,4]', () => {
  const saisie = 'premier second';
  const tete = creditDe(saisie, [8, 14], [6, 6, 6, 4, 4]);
  const queue = creditDe(saisie, [8, 14], [4, 4, 6, 6, 6]);
  assert.equal(queue, tete, 'sur le dernier mot, finir par 666 vaut commencer par 666');
});

/**
 * ★ « `[6,4,6,6,6]` a un 6 de plus (bonus) mais implique de se débarrasser du 4
 * (malus). Sans règle pour “supprimer un chiffre”, seul le côté contigu du 666
 * en fin de série sauve la mise. » — l'auteur.
 *
 * Les deux mouvements sont mesurés séparément, et le test vérifie qu'ils sont
 * bien tous les deux là — pas seulement le solde.
 */
test('★ [6,4,6,6,6] — un 6 de plus, mais un 4 dont il faut se débarrasser', () => {
  const saisie = 'motfinal';
  const b = bilanApproche(approche(saisie, [0, 8], vecteur([6, 4, 6, 6, 6])), ctxDe(saisie));
  assert.equal(b.six, 4, 'quatre 6 : un de plus que les trois nécessaires');
  assert.equal(b.triptyquesContigus, 1, 'le 666 de fin de série est bien contigu');
  // Le bonus du 6 surnuméraire EST là…
  const lignes = new Map(detailDuCredit(b).map((l) => [l.poste, l]));
  assert.equal(lignes.get('6 surnuméraires').quantite, 1);
  assert.ok(lignes.get('6 surnuméraires').points > 0);
  // …et le malus de ce qu'il faut laisser aussi : cinq valeurs montrées, trois
  // gardées par le verdict — le 4 et le 6 en trop restent au bord.
  //
  // ★ Les deux ne se paient PAS au même tarif, et c'est tout l'objet du partage
  //   en trois : le 6 était ce qu'on cherchait et qu'on avait
  //   (`RELIQUAT_DE_CIBLE`), le 4 n'était qu'un reste (`RELIQUAT_HORS_CIBLE`).
  //   Ni l'un ni l'autre n'est du travail jeté EN ROUTE : `valeursJetees` reste
  //   à zéro, et c'est ce qui empêche le barème de punir l'abondance.
  assert.equal(b.montrees, 5);
  assert.equal(b.gardees, 3);
  assert.equal(b.valeursJetees, 0, 'rien n’a été calculé puis effacé en chemin');
  assert.equal(b.reliquatDeCible, 1, 'le 6 surnuméraire est un 6 qu’on avait et qu’on ne montre pas');
  assert.equal(b.reliquatHorsCible, 1, 'le 4 n’est qu’un reste du vecteur');
  assert.ok(lignes.get('6 produits que le verdict ne montre pas').points < 0);
  assert.ok(lignes.get('reste du vecteur, à la fin').points < 0);
  // ★ ET C'EST LE CHIFFRE ÉTRANGER QUI COÛTE LE PLUS CHER, pas le 6. « Mieux
  //   vaut supprimer des 6 silencieusement au verdict que de supprimer autre
  //   chose silencieusement » (l'auteur) : un 6 en trop, on l'avait pour de
  //   bon ; un 4 qu'on laisse au bord, on aurait dû le fondre plus tôt.
  assert.ok(Math.abs(lignes.get('reste du vecteur, à la fin').points)
    > Math.abs(lignes.get('6 produits que le verdict ne montre pas').points),
    'laisser un chiffre étranger coûte plus cher que laisser un 6');
});

/**
 * ★ « Quant à `[6,4,6,3,6]`, garder un caractère sur deux peut être plus élégant
 * que la majorité et marcher sur `[4,6,4,6,4,6,4]` — mais ça reste une astuce
 * faible, à pénaliser aussi, moins fort que la majorité. » — l'auteur.
 *
 * Deux choses, et une seule est mesurable :
 *  · les trois 6 y sont, mais PAS d'affilée — aucun bonus de triptyque contigu.
 *    Cela, le bilan le voit, et c'est déjà la moitié du verdict de l'auteur ;
 *  · « garder un caractère sur deux » n'a aucun opérateur (voir le test des
 *    paliers réservés) : la pénalité correspondante est écrite mais dort.
 */
test('★ [6,4,6,3,6] et [4,6,4,6,4,6,4] — trois 6, mais aucun triptyque CONTIGU', () => {
  for (const v of [[6, 4, 6, 3, 6], [4, 6, 4, 6, 4, 6, 4]]) {
    assert.equal(finDuTriptyque(v), 0, `${v} ne porte aucune suite de trois 6`);
    const saisie = 'motfinal';
    const b = bilanApproche(approche(saisie, [0, 8], vecteur(v)), ctxDe(saisie));
    assert.equal(b.triptyquesContigus, 0, `${v} ne doit gagner aucun bonus de contiguïté`);
    assert.equal(b.couronnementTot, 0, `${v} : rien à couronner, donc rien de précoce`);
  }
  // Et le premier est bien MOINS élégant qu'un triptyque contigu de même largeur.
  const saisie = 'motfinal';
  assert.ok(creditDe(saisie, [0, 8], [6, 6, 6, 4, 3]) > creditDe(saisie, [0, 8], [6, 4, 6, 3, 6]),
    'trois 6 d’affilée doivent battre trois 6 dispersés à largeur et compte égaux');
  // « Un caractère sur deux » l'emporterait sur « la majorité » — les deux
  // pénalités existent dans le barème, dans cet ordre, mais aucune ne mord.
  assert.ok(BAREME.DECIMATION < BAREME.MAJORITE,
    'l’astuce du caractère sur deux est moins laide que la majorité — l’auteur le dit');
});

// ══════════════════════════════════ le PROCESSUS : casser un 666 déjà écrit

/**
 * ★ « Sans supprimer des nombres au milieu » ne parle PAS de position dans la
 * séquence, mais du PROCESSUS. « Dès qu'un 666 contigu est trouvé, il doit y
 * avoir un malus significatif à casser l'enchaînement, afin de ne le faire que
 * si ça en vaut vraiment la peine pour l'élégance du résultat final. » (l'auteur)
 *
 * Le chemin ci-dessous écrit un 666 contigu au deuxième état, puis l'additionne :
 * ce qu'il en reste est un 18, et le triptyque n'existe plus. C'est la casse.
 */
test('★ casser un 666 contigu déjà écrit — le malus mord, et il domine', () => {
  const casse = chemin([
    etat('STR', 'xxxxx'),
    etat('TOKENS', ['x', 'x', 'x', 'x', 'x']),
    etat('NUMS', [6, 6, 6, 4, 4]),   // le 666 est écrit ici
    etat('NUM', 26),                 // …et on l'additionne : il n'existe plus
    etat('NUM', 8),
  ], ['t.caracteres', 'm.postiche', 'c.somme', 'p.racineNumerique']);
  const b = bilanChemin(casse);
  assert.equal(b.triptyqueVu, true, 'le 666 a bien existé en cours de route');
  assert.equal(b.triptyqueTenu, false);
  assert.equal(b.casseTriptyque, true, 'et il a été défait : c’est une casse');

  // Le même chemin arrêté sur le vecteur ne casse rien.
  const tenu = chemin([
    etat('STR', 'xxxxx'),
    etat('TOKENS', ['x', 'x', 'x', 'x', 'x']),
    etat('NUMS', [6, 6, 6, 4, 4]),
  ], ['t.caracteres', 'm.postiche']);
  assert.equal(bilanChemin(tenu).casseTriptyque, false);

  // Et l'écart de crédit est significatif — « gros malus ».
  const saisie = 'motfinal';
  const ecart = credit(bilanApproche(approche(saisie, [0, 8], tenu), ctxDe(saisie)))
    - credit(bilanApproche(approche(saisie, [0, 8], casse), ctxDe(saisie)));
  assert.ok(ecart >= BAREME.CASSE_TRIPTYQUE,
    `l’écart mesuré (${ecart}) doit atteindre le malus annoncé (${BAREME.CASSE_TRIPTYQUE})`);
});

/**
 * ★ « Un 6 déjà apparu qu'on convertit en autre chose (6 + 6 = 12). » —
 * mais faire un 6, ou un 666, de ses 6 n'est pas les convertir « en autre
 * chose » : c'est le but.
 */
test('★ un 6 converti en autre chose se paie — sauf quand ce qui en sort EST le but', () => {
  const enDouze = chemin([
    etat('STR', 'xx'), etat('TOKENS', ['x', 'x']), etat('NUMS', [6, 6]), etat('NUM', 12),
  ], ['t.caracteres', 'm.postiche', 'c.somme']);
  assert.equal(bilanChemin(enDouze).sixDetruits, 2, '6 + 6 = 12 détruit deux 6');

  const enSix = chemin([
    etat('STR', 'xx'), etat('TOKENS', ['x', 'x']), etat('NUMS', [6, 0]), etat('NUM', 6),
  ], ['t.caracteres', 'm.postiche', 'c.somme']);
  assert.equal(bilanChemin(enSix).sixDetruits, 0, 'faire 6 de ses 6 n’est pas les perdre');

  const en666 = chemin([
    etat('STR', 'xxx'), etat('TOKENS', ['x', 'x', 'x']), etat('NUMS', [6, 6, 6]), etat('NUM', 666),
  ], ['t.caracteres', 'm.postiche', 'c.concat']);
  assert.equal(bilanChemin(en666).sixDetruits, 0, 'faire 666 de ses 6 est exactement le but');
});

// ══════════════════════════════════ l'arithmétique

/** ★ La chaîne de l'auteur : `10 32 → 1+0, 3+2 → 1 5 → 1+5 → 6`. */
test('★ 10 32 → 1 5 → 6 : deux additions de chiffres à la suite, un seul prix de longueur', () => {
  const enChaine = chemin([
    etat('STR', 'xx'),
    etat('TOKENS', ['x', 'x']),
    etat('NUMS', [10, 32]),
    etat('NUMS', [1, 5]),   // m.reduireChaque : 1+0 et 3+2
    etat('NUM', 6),         // c.somme sur des CHIFFRES : encore une addition de chiffres
  ], ['t.caracteres', 'm.postiche', 'm.reduireChaque', 'c.somme']);
  const b = bilanChemin(enChaine);
  assert.equal(b.additionsChiffres, 2, 'les deux additions sont bien des additions de chiffres');
  assert.equal(b.additionsEnChaine, 1, 'la seconde poursuit la première : elle ne coûte presque rien');
  assert.equal(b.transformations, 3, 't.caracteres, le mappeur, et la PREMIÈRE addition seulement');

  // La même longueur, mais avec une transformation étrangère au milieu : la
  // chaîne est rompue, et le prix de longueur est plein.
  const rompue = chemin([
    etat('STR', 'xx'),
    etat('TOKENS', ['x', 'x']),
    etat('NUMS', [10, 32]),
    etat('NUMS', [1, 5]),
    etat('NUM', 5),
    etat('NUM', 6),
  ], ['t.caracteres', 'm.postiche', 'm.reduireChaque', 'c.max', 'p.sommeChiffres']);
  const c2 = bilanChemin(rompue);
  assert.equal(c2.additionsEnChaine, 0, 'un min/max au milieu rompt la boucle');
  assert.ok(c2.transformations > b.transformations);
});

/** ★ Une addition de CHIFFRES vaut mieux qu'une addition de NOMBRES. */
test('★ c.somme change de classe selon ses opérandes — chiffres ou nombres', () => {
  const somme = { id: 'c.somme' };
  assert.equal(classeDeTransformation(somme, etat('NUMS', [1, 5])), 'chiffres');
  assert.equal(classeDeTransformation(somme, etat('NUMS', [8, 15, 16, 5])), 'nombres');
  assert.equal(classeDeTransformation({ id: 'c.moyenne' }, etat('NUMS', [1, 2])), 'moyenne');
  assert.equal(classeDeTransformation({ id: 'c.max' }, etat('NUMS', [1, 2])), 'minmax');
  // ★ LES LETTRE → LETTRE SE LISENT AU CATALOGUE, plus dans une liste de noms.
  //
  //   Elles étaient nommées — `f.atbash`, `f.rot13`, `f.leet` —, et ce test
  //   passait un `{ id: 'f.atbash' }` fabriqué à la main. Les vingt-quatre
  //   décalages de César sont entrés depuis, la liste ne les a jamais vus, et
  //   ni elle ni ce test-là ne pouvaient s'en apercevoir : `fr15` ne payait
  //   RIEN là où `fr13` payait 40, pour le geste identique.
  //
  //   Le critère est désormais la RÉGLETTE que l'opérateur publie — ce que la
  //   scène affiche sous l'étape, une lettre en face d'une lettre. On passe
  //   donc les VRAIS opérateurs, et le test tombe si le lien se défait.
  for (const id of ['f.atbash', 'f.rot13', 'f.leet']) {
    assert.equal(classeDeTransformation(operateur(id), etat('STR', 'hope')), 'lettres', id);
  }
  // ★ Le gel de la correction : un César quelconque paie comme rot13.
  for (const id of ['f.cesar1', 'f.cesar15', 'f.cesar25']) {
    assert.equal(classeDeTransformation(operateur(id), etat('STR', 'hope')), 'lettres',
      `${id} fait le même geste que f.rot13 et doit être classé comme lui`);
  }
  assert.equal(classeDeTransformation(operateur('m.a1z26'), etat('TOKENS', ['h'])), 'autre');
});

/**
 * ★ « La copie et l'originale ne peuvent pas diverger » — même doctrine que
 * `dureeRamassage` / `poidsRamassage` (CONTRACTS §3.1).
 *
 * `elegance.js` ne peut pas importer `src/moteur/` : aucun module de
 * `src/recherche/` ne le fait, et le contrat veut que la recherche code contre
 * le DESCRIPTEUR d'opérateur (§2.2), pas contre les entrailles d'un autre agent.
 * La règle « les nombres ne sont pas des chiffres » y est donc réécrite — et ce
 * test croise les deux sur tout ce qui compte.
 */
test('★ « chiffre ou nombre » : la règle réécrite dit la même chose que l’originale', () => {
  const somme = { id: 'c.somme' };
  const cas = [
    [0], [9], [-9], [1, 5], [9, 9, 9], [10], [-10], [8, 15, 16, 5], [6, 6, 66], [1, 2, 3, 10],
  ];
  for (const vs of cas) {
    const attendu = natureOperandes(vs) === 'chiffre' ? 'chiffres' : 'nombres';
    assert.equal(classeDeTransformation(somme, etat('NUMS', vs)), attendu, JSON.stringify(vs));
  }
});

/**
 * ★ « Les moyennes qui nécessitent un arrondi — malus SELON L'AMPLITUDE de
 * l'arrondi. » L'amplitude est exacte et entière : `c.moyenne` calcule
 * `round(somme / n)`, l'écart au nombre juste vaut `min(r, n − r) / n`.
 */
test('★ l’arrondi d’une moyenne se mesure par son AMPLITUDE, pas par sa présence', () => {
  assert.equal(amplitudeArrondi([6, 6, 6]), 0, '18 / 3 tombe juste : aucun arrondi');
  assert.equal(amplitudeArrondi([1, 2]), 1000, '3 / 2 est le pire cas : une demie exactement');
  assert.equal(amplitudeArrondi([1, 1, 2]), 666, '4 / 3 : un tiers d’unité, soit deux tiers d’une demie');
  assert.equal(amplitudeArrondi([]), 0);
  // …et le malus suit : plus l'arrondi est grand, plus il coûte.
  const moyenne = (vs) => bilanChemin(chemin([
    etat('STR', 'x'.repeat(vs.length)),
    etat('TOKENS', vs.map(() => 'x')),
    etat('NUMS', vs),
    etat('NUM', 6),
  ], ['t.caracteres', 'm.postiche', 'c.moyenne'])).arrondi;
  assert.ok(moyenne([1, 2]) > moyenne([1, 1, 2]));
  assert.equal(moyenne([6, 6, 6]), 0);
});

// ══════════════════════════════════ les caractères abandonnés

/**
 * ★ « Tout chiffre ou lettre effacé/ignoré — moindre si c'est un bloc entier
 * séparé par un caractère qui n'était ni lettre ni chiffre au départ. Tout
 * caractère ignoré — malus faible pour ceux qui ne sont ni chiffres ni
 * lettres. »
 *
 * Trois tas, trois prix, et la mesure sait les distinguer parce qu'elle ALIGNE
 * les caractères survivants sur ceux du départ, au lieu d'en compter la
 * différence.
 */
test('★ abandons — une lettre arrachée au milieu d’un mot coûte plus qu’un bloc entier laissé de côté', () => {
  const saisie = 'alpha beta';
  const ctx = ctxDe(saisie);

  // (a) on laisse `beta` entier de côté : la portée est `alpha`, prise en entier.
  const blocEntier = bilanApproche(approche(saisie, [0, 5], vecteur([6, 6, 6, 6, 6], 5)), ctx);
  assert.equal(blocEntier.abandons.alnum, 0);
  assert.equal(blocEntier.abandons.bloc, 4, 'les quatre lettres de `beta`, en bloc');
  assert.equal(blocEntier.abandons.ponctuation, 1, 'l’espace');

  // (b) la même portée, mais un filtre arrache des lettres AU MILIEU de `alpha`.
  const arrache = chemin([
    etat('STR', 'alpha'),
    etat('STR', 'aa'),             // « on ne garde que les A » : l, p, h tombent
    etat('TOKENS', ['a', 'a']),
    etat('NUMS', [6, 6]),
  ], ['f.postiche', 't.caracteres', 'm.postiche']);
  const auMilieu = bilanApproche(approche(saisie, [0, 5], arrache), ctx);
  assert.equal(auMilieu.abandons.alnum, 3, 'l, p et h sont arrachés à un bloc dont on garde le reste');
  assert.equal(auMilieu.abandons.bloc, 4, '`beta` reste un bloc entier');

  assert.ok(credit(blocEntier) > credit(auMilieu),
    'écarter un bloc entier doit coûter moins qu’arracher trois lettres au milieu d’un mot');
});

/**
 * ★ La seule exception que l'auteur accorde à une stratégie « sans malus » :
 * « exclure des blocs entiers séparés par espace ou ponctuation et de moins de
 * 3 lettres initialement ».
 */
test('★ abandons — un bloc entier de MOINS DE TROIS lettres est l’exception de l’auteur', () => {
  const saisie = 'abc fr';
  const b = bilanApproche(approche(saisie, [0, 3], vecteur([6, 6, 6], 3)), ctxDe(saisie));
  assert.equal(b.abandons.blocCourt, 2, '`fr` fait deux lettres : c’est le tas le moins cher');
  assert.equal(b.abandons.bloc, 0);
  assert.equal(b.abandons.alnum, 0);
  assert.equal(estPur(b), true, 'c’est exactement la stratégie « sans malus » de la première suggestion');
});

/** ★ Ce qui n'est pas SIGNIFIANT ne coûte rien : personne ne reproche un protocole. */
test('★ abandons — le protocole et le « www. » sont gratuits, comme pour la couverture', () => {
  const saisie = 'https://www.example.com';
  const b = bilanApproche(approche(saisie, [12, 19], vecteur([6, 6, 6, 6, 6, 6, 6], 7)), ctxDe(saisie));
  assert.equal(b.abandons.alnum, 0, '`https` et `www` ne sont pas reprochés');
  // `com` fait TROIS lettres : il n'entre pas dans l'exception de l'auteur
  // (« de moins de 3 lettres initialement ») et se paie au tarif du bloc entier.
  assert.equal(b.abandons.bloc, 3, 'seul `com` compte, et trois lettres, ce n’est plus « court »');
  assert.equal(b.abandons.blocCourt, 0);
});

/**
 * ★ Quand l'alignement échoue, on le DIT au lieu de deviner.
 *
 * Un chiffrement conserve la longueur — c'est une bijection, personne ne tombe.
 * Une traduction change tout : prétendre savoir quel caractère vient d'où serait
 * inventer une mesure.
 */
test('★ survie des caractères — bijection suivie, traduction déclarée OPAQUE', () => {
  const chiffre = chemin([etat('STR', 'hope'), etat('STR', 'uryr')], ['f.rot13']);
  const s1 = survieDesCaracteres(chiffre);
  assert.equal(s1.opaque, false, 'un chiffrement ne fait tomber personne');
  assert.deepEqual([...s1.vivants].sort((a, b) => a - b), [0, 1, 2, 3]);

  const filtre = chemin([etat('STR', 'ho-pe'), etat('STR', 'hope')], ['f.lettres']);
  const s2 = survieDesCaracteres(filtre);
  assert.equal(s2.opaque, false);
  assert.deepEqual([...s2.vivants].sort((a, b) => a - b), [0, 1, 3, 4], 'le tiret, et lui seul, tombe');

  const traduit = chemin([etat('STR', 'hope'), etat('STR', 'espoir')], ['f.traduitFR']);
  assert.equal(survieDesCaracteres(traduit).opaque, true, 'on ne sait plus qui vient d’où : on le dit');
});

// ══════════════════════════════════ déterminisme et rejouabilité (§4.4, §4.3)

test('★ déterminisme — tout ce que l’élégance produit est ENTIER', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Donald Trump', 'Macron']) {
    for (const a of m.resoudre(s).approches) {
      assert.ok(Number.isInteger(a.elegance), `élégance ${a.elegance}`);
      assert.ok(Number.isInteger(a.criteres.G), `critère G ${a.criteres.G}`);
      for (const [k, v] of Object.entries(a.bilan)) {
        if (k === 'abandons') {
          for (const [k2, v2] of Object.entries(v)) {
            if (typeof v2 === 'boolean') continue;
            assert.ok(Number.isInteger(v2), `bilan.abandons.${k2} = ${v2}`);
          }
          continue;
        }
        if (typeof v === 'boolean') continue;
        assert.ok(Number.isInteger(v), `bilan.${k} = ${v}`);
      }
      for (const l of detailDuCredit(a.bilan)) {
        assert.ok(Number.isInteger(l.points), `${l.poste} = ${l.points}`);
        assert.ok(Number.isInteger(l.quantite), `${l.poste} ×${l.quantite}`);
      }
    }
  }
});

test('★ déterminisme — le total du crédit EST la somme de son détail', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  for (const s of ['hope-hope-hope.fr', 'Donald Trump', 'Le chat dort sur le tapis rouge']) {
    for (const a of m.resoudre(s).approches) {
      const somme = detailDuCredit(a.bilan).reduce((t, l) => t + l.points, 0);
      assert.equal(credit(a.bilan), somme, `${s} — ${a.codes}`);
      assert.equal(a.elegance, note(somme), `${s} — ${a.codes}`);
    }
  }
});

/**
 * ★ §4.3 — « Une URL rejouée retrouve exactement le score de la liste dont elle
 * est issue. » Le bilan d'élégance se RECALCULE depuis les parts, il n'est
 * jamais transporté : cette garantie doit donc valoir mot pour mot pour lui.
 */
test('★ rejouabilité — une URL rejouée retrouve le même score ET la même élégance', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Donald Trump', 'Macron']) {
    const r = m.resoudre(s);
    for (const a of r.approches) {
      const lecture = lire(a.url, { catalogue });
      assert.equal(lecture.forme, 'canonique', a.url);
      const rejoue = m.rejouer(lecture);
      assert.ok(rejoue.ok, `${a.url} : ${rejoue.raison}`);
      assert.equal(rejoue.approche.score, a.score, `score — ${a.url}`);
      assert.equal(rejoue.approche.elegance, a.elegance, `élégance — ${a.url}`);
      assert.deepEqual(rejoue.approche.bilan, a.bilan, `bilan — ${a.url}`);
    }
  }
});

/**
 * ★ LE COURONNEMENT — ce que la scène montre et ce que le barème compte doivent
 * parler du même triptyque.
 *
 * `scenario.js › jalonsDesCornes` publie, à quelle étape chaque 666 contigu est
 * couronné. Le barème, lui, ne construit pas de scénario : `noter` est appelée
 * des centaines de fois par saisie et `construireScenario` est un objet lourd —
 * il lit donc la contiguïté sur les ÉTATS du chemin, une couche plus bas.
 *
 * Deux mesures, deux modules, deux niveaux : rien ne garantit a priori qu'elles
 * disent la même chose. Ce test l'exige — le nombre de couronnements de la scène
 * doit valoir le nombre de triptyques contigus du bilan.
 */
test('★ cornes — la scène couronne exactement les triptyques que le bilan a CONSTATÉS', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  let vues = 0;
  // ★ L'ÉCHANTILLON A DÛ S'ÉLARGIR, et la raison mérite d'être écrite : il ne
  //   contient que des saisies dont une voie EMPLOIE `m36`, puisque c'est ce que
  //   ce test recoupe. Or la dévaluation de cet opérateur — « m36 doit être une
  //   alternative de secours à mpf, et non l'inverse » (l'auteur) — a réduit sa
  //   présence de MOITIÉ : mesuré sur le corpus, 19 voies sur 191 l'employaient,
  //   il n'en reste que 10 sur 189, et 7 saisies sur 19 au lieu de 11.
  //
  //   Le seuil `vues >= 3` plus bas n'est pas un chiffre à tenir, c'est un
  //   garde-fou : il dit « l'instrument a eu de la matière à mesurer ». On
  //   élargit donc l'échantillon plutôt que d'abaisser la barre — abaisser
  //   aurait rendu le test moins exigeant à mesure que l'opérateur se raréfie,
  //   c'est-à-dire exactement quand il faut le surveiller.
  //   ★ **ÉLARGI UNE SECONDE FOIS, POUR LA MÊME RAISON.** Le barème a bougé
  //     encore — concision qui mord enfin, mérite d'élégance qui regarde la
  //     longueur —, et `m36` s'est encore raréfié : des dix saisies ci-dessus,
  //     DEUX en portaient encore. On ajoute donc quatre saisies dont la mesure
  //     dit qu'elles en portent (« Paris », « Elon Musk », « La Poste »), plutôt
  //     que de descendre le seuil. Le jour où l'échantillon ne suffira plus, ce
  //     sera l'opérateur qu'il faudra regarder, pas ce test.
  for (const s of ['Donald Trump', 'Macron', 'hope', 'https://hope-hope-hope.fr/',
    'Éléonore à Nîmes', 'Wikipedia', 'Nombre de la bête', 'satan',
    'Emmanuel Macron', 'Marie Curie', 'Paris', 'Elon Musk', 'La Poste']) {
    for (const a of m.resoudre(s).approches) {
      // ★ `m36` n'est plus le seul à couronner — et c'est le sens de
      //   l'amendement « couronner sans effacer » (CONTRACTS §3.1).
      //
      //   Tant que l'opérateur était le seul émetteur, les deux comptes étaient
      //   égaux par construction. L'assemblage couronne désormais TOUT
      //   triptyque que la ligne écrit d'elle-même, `m36` ou pas — c'est très
      //   exactement ce que la note ci-dessous annonçait (« une portée qui rend
      //   `[6,6,6,6]` porte un 666 contigu que la scène montrera autrement »),
      //   et la scène a fini par le montrer.
      //
      //   Les deux comptes ne peuvent donc plus être égaux, et ils ne peuvent
      //   pas non plus s'ordonner dans l'autre sens : ce que `m36` constate, la
      //   scène le couronne toujours. Reste l'inégalité, qui est la vraie
      //   propriété — et le fait que les deux mesures se recoupent sur les
      //   MÊMES triptyques, vérifié juste après.
      const constates = a.parts.filter((p) => p.chemin.ops.some((o) => o.id === 'm.troisSixDAffilee'));
      if (!constates.length) continue;
      vues++;
      const sc = m.scenarioDe(a, { saisie: s });
      const jalons = sc.cornes || jalonsDesCornes(sc);
      assert.ok(jalons.couronnements.length >= constates.length,
        `« ${s} » ${a.codes} : ${jalons.couronnements.length} couronnements à l’écran `
        + `pour ${constates.length} portées qui constatent un triptyque`);
      // ★ Aucun jeton ne porte DEUX couronnements. Les deux émetteurs — `m36`
      //   d'un côté, l'assemblage de l'autre — travaillent sur la même ligne
      //   sans se voir ; le nœud de décor étant nommé d'après le 6 qu'il
      //   couronne (`@cornes:<id>`, `visuel/primitives/horns.js`), deux cornes
      //   sur un même 6 se disputeraient le même identifiant et la compilation
      //   échouerait. Ce n'est donc pas un détail d'hygiène, c'est la garantie
      //   qui rend la cohabitation possible.
      const portes = jalons.couronnements.flatMap((c) => c.jetons);
      assert.equal(new Set(portes).size, portes.length,
        `« ${s} » ${a.codes} : un jeton couronné deux fois`);
      // …et chacune de ces portées porte bien un triptyque contigu QUI TIENT :
      // c'est le pont entre les deux mesures, et il ne peut pas se défaire.
      for (const p of constates) {
        const b = bilanChemin(p.chemin);
        assert.equal(b.triptyqueTenu, true, `« ${s} » : ${p.fragment.texte}`);
        assert.equal(b.casseTriptyque, false);
      }
      assert.ok(a.bilan.triptyquesContigus >= constates.length,
        'le bilan ne peut pas compter MOINS de triptyques que la scène n’en couronne');
      assert.ok(jalons.premier >= 1 && jalons.premier <= jalons.total);
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} approches à cornes observées`);
});

// ══════════════════════════════════ les trois classements

test('★ classements — les trois sont des ordres TOTAUX et STRICTS', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Le chat dort sur le tapis rouge']) {
    const app = m.resoudre(s).approches;
    for (const ordre of [ordreElegance, ordreTriptyques, ordreTotal]) {
      for (const a of app) assert.equal(ordre(a, a), 0, 'réflexivité');
      for (const a of app) {
        for (const b of app) {
          if (a === b) continue;
          assert.equal(Math.sign(ordre(a, b)), -Math.sign(ordre(b, a)), 'antisymétrie');
          assert.notEqual(ordre(a, b), 0, `${a.codes} et ${b.codes} indiscernables — ${s}`);
        }
      }
    }
  }
});

/**
 * ★ LES QUATRE CAS DE RÉFÉRENCE DE L'AUTEUR.
 *
 * Ils sont déjà tenus, un par un, par `recherche.test.js`. Ils sont repris ici
 * sous l'angle du BARÈME : ce que le nouveau classement doit garantir, c'est
 * qu'aucun d'eux ne perde sa tête de liste — « une régression sur l'un de ces
 * quatre est un échec, pas un arbitrage » (l'auteur).
 */
test('★ étalonnage — les quatre cas de référence gardent leur tête de liste', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  /* ★ **LES COMPTES ONT MONTÉ D'UNE SÉRIE, ET « Donald Trump » A CHANGÉ DE
     VOIE.** `MAX_SERIES` rabotait le comptage : sept séries démontrées en
     valaient six. Le plafond levé, la 2ᵈ ligne de chaque cas en aligne une de
     plus. Et la combinaison nommée pour « Donald Trump »
     (`tca+m14+m36,fr13+tca+m14+m36`, deux séries) ne tient plus le rang : une
     moisson à TROIS séries passe devant. On gèle le compte et le mode, plus
     les codes — nommer une voie qui a été battue reviendrait à figer le
     classement d'hier. */
  const attendu = [
    ['hope-hope-hope.fr', 'MOISSON', 6, null],
    ['https://hope-hope-hope.fr/', 'MOISSON', 7, null],
    ['Donald Trump', 'MOISSON', 3, null],
    // ★ **`Macron` CHANGE DE RÉFÉRENCE, ET C'EST L'AUTEUR QUI LA NOMME.**
    //   « Pour Macron, `#so!tca+mt9+mpf` me semble optimal : les 666 ne sont pas
    //   contigus, mais le procédé se fait en très peu d'étapes, ce qui est mieux
    //   qu'avec `fr13` ou `mtal`. » La voie César existe toujours et se joue —
    //   avec `mpf` en dernier geste elle vaut 892 contre 652 avec `m36` —, mais
    //   ce n'est plus elle qu'on met en vitrine.
    ['Macron', 'GROUPEMENT', 1, 'tca+mt9+mpf'],
  ];
  for (const [saisie, mode, series, codes] of attendu) {
    // ★ AMENDEMENT — « la tête de liste » est devenue DEUX lignes, parce que
    //   l'auteur y a mis DEUX questions : « la plus belle » et « la plus
    //   fournie ». Voir `score.js › POIDS_DES_REGIMES` pour la règle et pour la
    //   mesure. Les quatre voies nommées ci-dessus sont, par construction, des
    //   réponses à la seconde — elles sont nommées pour ce qu'elles ALIGNENT.
    //
    //   Ce que ce test gèle est donc : la voie de l'auteur figure sur l'une des
    //   deux premières lignes, avec exactement le mode, le compte et les codes
    //   attendus, et elle y est parce que la liste la met en avant — pas parce
    //   qu'elle serait tombée là par le mixte, qui ne réserve rien à personne.
    //   ★ AMENDEMENT 2 — c'est bien « FIGURE SUR L'UNE DES DEUX LIGNES » qu'on
    //   gèle, et non « occupe celle des deux qui aligne le plus ». La nuance
    //   n'existait pas tant qu'une seule des deux pouvait porter la voie
    //   nommée ; depuis `PORTEE_IGNOREE`, `Macron` a une voie PLUS COURTE et
    //   qui lit tout (`tca+mt9`, jugée « nettement mieux » par l'auteur) en 1ʳᵉ
    //   ligne, et la voie nommée en 2ᵈ. Exiger la 1ʳᵉ reviendrait à interdire au
    //   barème de trouver mieux — ce qui est précisément ce qu'on lui demande.
    const tete = m.resoudre(saisie).approches.slice(0, 2);
    const vedette = codes
      ? (tete.find((a) => a.codes === codes)
        || tete.reduce((a, b) => ((b.series || 1) > (a.series || 1) ? b : a)))
      : tete.reduce((a, b) => ((b.series || 1) > (a.series || 1) ? b : a));
    assert.equal(vedette.mode, mode, `« ${saisie} » : ${vedette.mode} — ${vedette.codes}`);
    assert.equal(vedette.series || 1, series,
      `« ${saisie} » : ${vedette.series} séries — ${vedette.codes}`);
    if (codes) assert.equal(vedette.codes, codes, `« ${saisie} »`);
    // ★ La 2ᵈ ligne ne revient aux triptyques QUE s'il y a plus fourni que la
    //   1ʳᵉ — « la seconde suggestion ne prend sa place que si elle a quelque
    //   chose à dire ». Sur `Macron`, aucune voie n'aligne plus d'un 666 : la
    //   place échoit alors au mixte, et le reprocher reviendrait à exiger une
    //   quantité qui n'existe pas.
    const app = m.resoudre(saisie).approches;
    const plusFourni = app.some((a) => (a.series || 1) > (app[0].series || 1));
    assert.ok(['elegance', 'triptyques'].includes(vedette.suggestion) || !plusFourni,
      `« ${saisie} » : place due à « ${vedette.suggestion} », donc au mixte`);
  }
});

/**
 * ★ La seconde suggestion ne prend sa place que si elle a QUELQUE CHOSE À DIRE.
 *
 * « 2ᵈ suggestion — le nombre de triptyques, au prix d'une élégance
 * éventuellement moindre. » Si le champion de l'élégance est DÉJÀ celui qui
 * aligne le plus de 666, il n'y a pas de second arbitrage à proposer : la place
 * revient au mixte. Sans ce garde-fou, « le champion des triptyques » désignerait
 * neuf fois sur dix une approche au même compte, qui ne suggérerait rien.
 */
test('★ classements — la 2ᵈ suggestion n’apparaît que si elle aligne PLUS de séries', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  let vuesAvec = 0;
  let vuesSans = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Donald Trump', 'Macron',
    'Éléonore à Nîmes', 'jean-michel', 'Millicent',
    // ★ Les saisies où la première suggestion N'EST PAS la plus fournie : c'est
    //   là, et seulement là, que la seconde a quelque chose à dire. Mesuré sur
    //   trente-trois saisies, elles sont rares — cinq — et c'est le signe que le
    //   garde-fou fait son travail plutôt que d'ouvrir une seconde place à qui
    //   n'en a pas besoin.
    'reinfocovid', 'Marie Curie']) {
    const app = m.resoudre(s).approches;
    const seconde = app.find((a) => a.suggestion === 'triptyques');
    if (!seconde) { vuesSans++; continue; }
    vuesAvec++;
    assert.ok((seconde.series || 1) > (app[0].series || 1),
      `« ${s} » : la 2ᵈ suggestion (${seconde.series}×666) n’apporte pas plus que la 1ʳᵉ (${app[0].series}×666)`);
    assert.equal(app[1], seconde, 'la 2ᵈ suggestion occupe la 2ᵈ place');
  }
  assert.ok(vuesAvec >= 1, 'la 2ᵈ suggestion doit exister quelque part, sinon elle est du code mort');
  assert.ok(vuesSans >= 1, '…et ne pas exister ailleurs, sinon le garde-fou ne garde rien');
});

/**
 * ★ Le facteur d'élégance ne peut que RETIRER.
 *
 * C'est la leçon, mesurée, de l'amendement « les trois rangs de conviction » :
 * un bonus additif se prélève sur la réserve et écrase toute l'échelle. Ce qui
 * est garanti ici, c'est qu'aucune approche ne peut MONTER par élégance — la
 * seule chose que le barème puisse faire au score de conviction est de le
 * baisser, donc aucun réglage ne peut faire déborder le plafond de 10 000.
 */
test('★ le facteur d’élégance est borné : il retire, il n’ajoute jamais', () => {
  for (const c of [-5000, 0, 519, 520, 700, 1000, 1001, 4000]) {
    const f = facteur(c);
    assert.ok(f >= BAREME.FACTEUR_PLANCHER && f <= 1000, `facteur(${c}) = ${f}`);
  }
  assert.equal(facteur(1000), 1000, 'un chemin au socle et sans faute ne perd rien');
  assert.equal(facteur(9999), 1000, 'et le plus élégant du monde ne gagne rien AU SCORE');
  assert.ok(note(9999) > 1000, '…mais il gagne dans SON classement, qui lit le crédit brut');
});

/** L'opérateur qui incarne le triptyque constaté existe, et il est bien celui-là. */
test('★ `m36` — « trois 6 d’affilée » est bien l’opérateur qui CONSTATE le triptyque', () => {
  const op = operateur('m.troisSixDAffilee');
  assert.equal(op.code, 'm36');
  const r = op.apply([6, 6, 6, 7, 3, 6], [[], [], [], [], [], []]);
  const v = r && typeof r === 'object' && !Array.isArray(r) ? r.valeur : r;
  assert.deepEqual(v, [6, 6, 6]);
  // Trois valeurs calculées puis écartées : c'est ce que le bilan doit voir, et
  // c'est ce que CONTRACTS §7-5 reproche au rendement de ne pas voir.
  const ch = chemin([
    etat('STR', 'Donald'),
    etat('TOKENS', ['D', 'o', 'n', 'a', 'l', 'd']),
    etat('NUMS', [6, 6, 6, 7, 3, 6]),
    etat('NUMS', [6, 6, 6]),
  ], ['t.caracteres', 'm.seg14', 'm.troisSixDAffilee']);
  const b = bilanChemin(ch);
  // ★ Trois valeurs écartées — mais avec une EXCUSE : sur `[6,6,6,7,3,6]` les 6
  //   sont quatre contre un 7 et un 3, donc « la majorité l'emporte » s'énonce
  //   sans mentir, et le rejet se paie à ce tarif-là (voir `majoriteTacite`).
  //   Le compte est le même ; c'est le prix qui change.
  assert.equal(b.valeursJetees, 0, 'le rejet n’est pas gratuit, mais il n’est pas du gaspillage');
  assert.equal(b.majoriteTacite, 3, 'le 7, le 3 et le sixième 6 sont écartés au nom du nombre');
  assert.equal(b.triptyqueTenu, true, '…mais le 666 était écrit, et il tient');
  assert.equal(b.sixDetruits, 0, 'effacer n’est pas convertir : le 6 en trop se compte ailleurs');
});

// ══════════════════════════════════ le signe et la famille, DÉCLARÉS

/**
 * ★ LA TABLE `NATURE` EST EXHAUSTIVE — un poste ajouté sans être signé se voit.
 *
 * C'est le seul garde-fou possible contre le défaut que `NATURE` répare : tant
 * que le signe d'un palier vivait dans son usage, un poste ajouté au barème et
 * oublié dans le calcul ne se signalait par rien. Il se signale maintenant ici.
 */
test('★ nature — chaque poste du barème déclare son signe et sa famille', () => {
  const postes = Object.keys(BAREME).sort();
  const declares = Object.keys(NATURE).sort();
  assert.deepEqual(declares, postes,
    'un poste du barème n’est pas déclaré dans NATURE, ou l’inverse');
  for (const [cle, n] of Object.entries(NATURE)) {
    assert.ok([-1, 0, 1].includes(n.sens), `${cle} : sens ${n.sens}`);
    // ★ `exhaustivite` a rejoint les familles pondérables quand l'auteur a
    //   tranché que ce curseur devait peser « tout ce qui est suppression, que
    //   ce soit au départ ou plus tard » : les cinq postes de l'abandon la
    //   portent désormais.
    assert.ok(['socle', 'quantite', 'elegance', 'exhaustivite', 'reglage'].includes(n.famille),
      `${cle} : famille ${n.famille}`);
    // Un réglage n'est ni bonus ni malus, et réciproquement : les deux
    // propriétés se tiennent, et les confondre rendrait la table illisible.
    assert.equal(n.sens === 0, n.famille === 'reglage', `${cle}`);
  }
});

/**
 * ★ LE SIGNE DÉCLARÉ EST CELUI QUE LE CRÉDIT APPLIQUE.
 *
 * Une déclaration que le calcul contredirait serait pire que pas de déclaration
 * du tout : une page de débogage y lirait un bonus là où le total perd des
 * points. Le test recoupe donc les deux, sur des bilans RÉELS — un bilan monté à
 * la main ne déclenche pas assez de postes pour prouver quoi que ce soit.
 */
test('★ nature — le signe déclaré est celui que le crédit applique', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  let vues = 0;
  const familles = new Set();
  for (const s of ['hope-hope-hope.fr', 'Le chat dort sur le tapis rouge', 'Millicent']) {
    for (const a of m.resoudre(s).approches) {
      const lignes = detailDuCredit(a.bilan);
      for (const l of lignes) {
        assert.ok(NATURE[l.cle], `${l.poste} : poste inconnu de NATURE`);
        assert.equal(l.sens, NATURE[l.cle].sens, `${l.poste} : signe divergent`);
        assert.ok(l.ampleur >= 0, `${l.poste} : l’ampleur est une valeur absolue`);
        assert.equal(l.points, l.sens * l.ampleur, `${l.poste}`);
        if (l.sens < 0) assert.ok(l.points <= 0, `${l.poste} : un malus ne peut pas rapporter`);
        if (l.sens > 0) assert.ok(l.points >= 0, `${l.poste} : un bonus ne peut pas coûter`);
        if (l.quantite > 0) familles.add(l.famille);
        vues++;
      }
      assert.equal(credit(a.bilan), lignes.reduce((t, l) => t + l.points, 0),
        'le crédit est la somme de son détail, et rien d’autre');
    }
  }
  assert.ok(vues > 100, `seulement ${vues} lignes observées`);
  // …et les deux familles qui se repondèrent sont bien toutes deux ALIMENTÉES :
  // repondérer une famille que rien ne déclenche ne prouverait rien.
  assert.ok(familles.has('quantite') && familles.has('elegance'),
    `familles observées : ${[...familles].join(', ')}`);
});

// ══════════════════════════════════ les trois régimes de pondération

/**
 * ★ LES DEUX RÉGIMES REPONDÈRENT CE QU'ILS ANNONCENT, ET RIEN D'AUTRE.
 *
 * « Si l'élégance prime, alors le fait de trouver 1 fois ou plusieurs fois le
 * motif ne devrait pas apporter de bonus (ou infime : 1 % du poids habituel). […]
 * Pour le 2ⁿᵈ résultat, c'est la quantité qui prévaut, l'élégance n'est pas
 * négligeable, mais elle pèse 33 % de son poids habituel. » — l'auteur.
 *
 * Le test recompose les deux crédits poste par poste depuis le détail au poids
 * plein : si un régime touchait une famille qu'il ne doit pas toucher, ou s'il
 * touchait le socle, la recomposition ne tomberait plus juste.
 */
test('★ régimes — 1 % de quantité à la 1ʳᵉ place, 33 % d’élégance à la 2ᵈ', () => {
  assert.equal(POIDS_DES_REGIMES.elegance.quantite, 10, '1 % de 1 000 ‰');
  assert.equal(POIDS_DES_REGIMES.elegance.elegance, 1000);
  assert.equal(POIDS_DES_REGIMES.triptyques.quantite, 1000);
  assert.equal(POIDS_DES_REGIMES.triptyques.elegance, 330, '33 % de 1 000 ‰');

  const m = creerMoteur(catalogue, { filetTemporel: false });
  let repondere = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Nombre de la bête']) {
    for (const a of m.resoudre(s).approches) {
      for (const [regime, poids] of Object.entries(POIDS_DES_REGIMES)) {
        const attendu = detailDuCredit(a.bilan).reduce((t, l) => {
          // ⚠️ Le miroir doit suivre `pondererAmpleur` À LA LETTRE, y compris
          //   sur son cas muet : une famille que le régime ne nomme PAS n'est
          //   pas pondérée à zéro, elle n'est pas pondérée du tout. Les trois
          //   régimes ne nomment que `quantite` et `elegance` ; `exhaustivite`
          //   les traverse donc intacte, ce qui est exact — un régime de lecture
          //   ne change pas ce qu'une suppression coûte.
          const brut = l.famille === 'socle' || l.famille === 'reglage'
            ? undefined : poids[l.famille];
          const p = brut === undefined ? 1000 : brut;
          return t + l.sens * Math.trunc((l.ampleur * p) / 1000);
        }, 0);
        assert.equal(credit(a.bilan, poids), attendu, `« ${s} » ${a.codes} · ${regime}`);
      }
      // Le socle n'est jamais repondéré : une approche sans aucun poste actif
      // vaut le socle dans les trois régimes.
      if (credit(a.bilan) !== credit(a.bilan, POIDS_DES_REGIMES.elegance)) repondere++;
    }
  }
  assert.ok(repondere >= 3,
    `${repondere} approches seulement voient leur crédit bouger — le régime ne mordrait pas`);
});

/**
 * ★ ET LE RÉGIME CHANGE BIEN LE CLASSEMENT — sinon il ne sert à rien.
 *
 * ⚠️ MESURÉ au banc (`.planning/banc/classement.mjs`) sur les dix-neuf saisies
 * témoins : douze têtes de liste changent, et la 2ᵈ place — jusque-là attribuée
 * sur 4 saisies seulement, faute de champion des triptyques distinct du champion
 * de l'élégance — l'est désormais sur 13. C'est le signe que les deux questions
 * de l'auteur ont enfin deux réponses différentes.
 *
 * Le cas gelé ici est celui de `hope-hope-hope.fr`, où le renversement se lit à
 * l'œil nu : la moisson à cinq séries mène au crédit plein (2 293 contre 1 359),
 * et la résonance — trois « hope » lus de la même façon, rien de jeté — passe
 * devant dès que la quantité est ramenée à 1 % (1 359 contre 1 258).
 */
test('★ régimes — l’élégance pure renverse le champion de la quantité', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const app = m.resoudre('hope-hope-hope.fr').approches;

  /* ★ **CE TEST NOMMAIT DEUX VOIES ; IL MESURE MAINTENANT LE MÉCANISME.**

     Il tenait une moisson à cinq séries et une résonance, et vérifiait que la
     seconde passait devant la première dès que la quantité ne pesait plus que
     1 %. La démonstration était juste, et elle était FRAGILE : elle reposait
     sur un couple précis, dont les crédits ont bougé au premier réglage venu
     (`MAX_SERIES`, puis la concision, puis le mérite d'élégance). Aujourd'hui
     la résonance mène DÉJÀ au crédit plein — 1 359 contre 421 —, si bien qu'il
     n'y a plus rien à renverser sur ce couple-là, alors que la règle qu'il
     illustrait, elle, n'a pas bougé d'un pouce.

     On mesure donc la règle : les deux régimes ne classent PAS pareil, la
     première ligne répond à « la plus belle » et la seconde à « la plus
     fournie ». C'est ce que l'auteur a demandé — « en dehors du résultat
     orienté élégance avant tout, ça me va très bien que ça évolue vers plus de
     quantité, en gardant une élégance assez bonne ». */
  assert.equal(app[0].suggestion, 'elegance');
  assert.equal(app[1].suggestion, 'triptyques');
  assert.ok((app[1].series || 1) > (app[0].series || 1),
    `la 2ᵈ ligne aligne plus de 666 que la 1ʳᵉ (${app[1].series} contre ${app[0].series})`);

  // ★ Et les deux comparateurs se contredisent SUR CE COUPLE : c'est très
  //   exactement ce qui fait qu'il y a deux lignes plutôt qu'une.
  assert.ok(ordreElegance(app[0], app[1]) < 0,
    'au régime de l’élégance, la 1ʳᵉ ligne passe devant la 2ᵈ');
  assert.ok(ordreTriptyques(app[1], app[0]) < 0,
    '…et au régime de la quantité, c’est l’inverse');

  // ★ La 1ʳᵉ ligne est plus COURTE et abandonne MOINS que la 2ᵈ : c'est le
  //   correctif demandé sur le mérite d'élégance (`score.js › meriteDElegance`),
  //   qui ne lisait que le crédit et ignorait ces deux-là.
  assert.ok(app[0].L < app[1].L, `la belle est la plus courte (${app[0].L} contre ${app[1].L})`);
  assert.ok(app[0].criteres.U >= app[1].criteres.U,
    `la belle n’abandonne pas plus (${app[0].criteres.U} contre ${app[1].criteres.U})`);
});
