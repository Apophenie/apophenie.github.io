// src/recherche/tests/elegance.test.js
// ★ L'ÉLÉGANCE D'UNE SOLUTION, MESURÉE — et les cas que l'auteur a nommés.
//
// Ce fichier tient deux promesses distinctes, et il ne faut pas les confondre :
//
//  1. **les cas nommés** — `[6,6,6,4,4]` contre `[4,4,6,6,6]`, `[6,4,6,6,6]`,
//     `[6,4,6,3,6]`, `[4,6,4,6,4,6,4]`, `6, 5+1, 6, 8`. L'auteur les a écrits en
//     toutes lettres, avec le verdict qu'il en attend ; ils sont ici, un par un,
//     avec sa phrase en commentaire ;
//  2. **ce que la mesure ne sait PAS faire**. Trois de ses demandes n'ont aucun
//     opérateur à mesurer, le registre étant fermé (§4.1). Elles sont testées
//     aussi — pour geler le fait qu'on ne mesure rien, plutôt que de laisser
//     croire qu'on mesure.
//
// Les vecteurs de forme (`[6,6,6,4,4]`…) sont construits à la MAIN : la question
// posée porte sur la GÉOMÉTRIE du vecteur, pas sur l'opérateur qui l'a produit,
// et aller chercher dans le catalogue une méthode qui rende par chance
// `[6,4,6,3,6]` ferait dépendre le test d'un accident du catalogue.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BAREME, BAREME_INACTIF, bilanChemin, bilanApproche, credit, detailDuCredit,
  facteur, note, estPur, amplitudeArrondi, finDuTriptyque, classeDeTransformation,
  survieDesCaracteres,
} from '../elegance.js';
import { creerMoteur } from '../index.js';
import { ordreElegance, ordreTriptyques, ordreTotal } from '../score.js';
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
  assert.ok(BAREME.ADDITION_EN_CHAINE > 0, 'ce n’est pas gratuit — arriver plus tôt reste mieux');
  assert.ok(BAREME.ADDITION_EN_CHAINE * 3 < BAREME.TRANSFORMATION,
    `${BAREME.ADDITION_EN_CHAINE} contre ${BAREME.TRANSFORMATION} : l’écart doit rester net`);
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
 * ★ CE QU'ON NE MESURE PAS, ET QU'ON DIT.
 *
 * Trois demandes de l'auteur n'ont aucun opérateur à mesurer, et le registre est
 * FERMÉ (§4.1) : « le plus fréquent l'emporte », « garder un caractère sur
 * deux », « l'addition sélective de chiffres contigus » (`6, 5+1, 6, 8`). Les
 * paliers existent dans le barème, à leur place dans la hiérarchie, mais leurs
 * compteurs valent toujours zéro.
 *
 * Ce test gèle ce fait. S'il tombe un jour, c'est qu'un opérateur nouveau les a
 * rendus mesurables — et il faudra alors le dire, ici et dans le contrat, au
 * lieu de découvrir un malus qui s'est mis à mordre tout seul.
 */
test('★ mesure absente — les trois paliers réservés ne mordent sur AUCUNE saisie du corpus', () => {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const compteurs = { MAJORITE: 'majorite', DECIMATION: 'decimation', ADDITION_SELECTIVE: 'additionSelective' };
  let vues = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'Donald Trump',
    'Macron', 'Millicent', 'Le chat dort sur le tapis rouge']) {
    for (const a of m.resoudre(s).approches) {
      vues++;
      for (const cle of BAREME_INACTIF) {
        assert.equal(a.bilan[compteurs[cle]], 0,
          `« ${s} » ${a.codes} : le palier ${cle} s’est mis à mordre — il n’a rien à mesurer`);
      }
    }
  }
  assert.ok(vues > 40, `seulement ${vues} approches observées`);
});

/**
 * ★ `6, 5, 16, 8` → `6, 5+1, 6, 8` — L'ADDITION SÉLECTIVE, ET POURQUOI ELLE
 * N'EST PAS MESURABLE.
 *
 * « Sur `6, 5, 16, 8`, la logique voudrait `6+5+1+6+8`, ou `6, 5, 1+6, 8` ;
 * faire `6, 5+1, 6, 8` pour obtenir `666, 8` est acceptable mais pénalisé —
 * c'est de la triche à utiliser en dernier recours. » (l'auteur)
 *
 * Aucun opérateur du catalogue ne fait cela : `c.somme` additionne le vecteur
 * ENTIER, et rien n'additionne une sous-plage choisie. Le geste que l'auteur
 * décrit n'existe donc pas, et le registre étant fermé il ne peut pas être créé
 * pour l'occasion. Ce test le CONSTATE sur le catalogue — c'est la seule chose
 * honnête à en dire.
 */
test('★ addition sélective — aucun opérateur du catalogue ne sait additionner une SOUS-PLAGE', () => {
  const ops = catalogue.operateurs || catalogue;
  const sommes = ops.filter((o) => o.from === 'NUMS' && o.to === 'NUM' && o.id.includes('somme'));
  assert.ok(sommes.length >= 1, 'il existe bien une addition de vecteur');
  for (const o of sommes) {
    const r = o.apply([6, 5, 16, 8], [[], [], [], []]);
    const valeur = r && typeof r === 'object' && !Array.isArray(r) ? r.valeur : r;
    assert.equal(valeur, 35, `${o.code} additionne tout le vecteur, jamais une sous-plage`);
  }
  // Et aucun opérateur `NUMS → NUMS` ne rend `[6, 6, 6, 8]` depuis `[6, 5, 16, 8]`.
  const selectifs = ops.filter((o) => {
    if (o.from !== 'NUMS' || o.to !== 'NUMS') return false;
    const r = o.apply([6, 5, 16, 8], [[], [], [], []]);
    const v = r && typeof r === 'object' && !Array.isArray(r) ? r.valeur : r;
    return Array.isArray(v) && v.join(',') === '6,6,6,8';
  });
  assert.deepEqual(selectifs.map((o) => o.code), [],
    'si un opérateur d’addition sélective apparaît, `BAREME.ADDITION_SELECTIVE` doit être branché');
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
  // …et le malus de ce qu'il faut jeter aussi : cinq valeurs montrées, trois
  // gardées par le verdict — le 4 et le 6 en trop tombent.
  assert.equal(b.montrees, 5);
  assert.equal(b.gardees, 3);
  assert.equal(b.valeursJetees, 2, 'le 4 et le 6 surnuméraire sont calculés puis écartés');
  assert.ok(lignes.get('valeurs calculées puis jetées').points < 0);
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
  assert.equal(classeDeTransformation({ id: 'f.atbash' }, etat('STR', 'hope')), 'lettres');
  assert.equal(classeDeTransformation({ id: 'm.a1z26' }, etat('TOKENS', ['h'])), 'autre');
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
  for (const s of ['Donald Trump', 'Macron', 'hope', 'https://hope-hope-hope.fr/',
    'Éléonore à Nîmes', 'Wikipedia']) {
    for (const a of m.resoudre(s).approches) {
      // ★ Une paire de cornes se pose là — et seulement là — où l'opérateur
      //   `mz` a CONSTATÉ le triptyque : c'est lui qui émet la primitive
      //   (CONTRACTS §3.1, amendement `horns`). Le bilan, lui, compte la
      //   contiguïté partout où elle EXISTE, `mz` ou pas : une portée qui rend
      //   `[6,6,6,6]` porte un 666 contigu que la scène montrera autrement.
      //   La bonne comparaison est donc avec les parts qui emploient `mz`.
      const constates = a.parts.filter((p) => p.chemin.ops.some((o) => o.id === 'm.troisSixDAffilee'));
      if (!constates.length) continue;
      vues++;
      const sc = m.scenarioDe(a, { saisie: s });
      const jalons = sc.cornes || jalonsDesCornes(sc);
      assert.equal(jalons.couronnements.length, constates.length,
        `« ${s} » ${a.codes} : ${jalons.couronnements.length} couronnements à l’écran `
        + `pour ${constates.length} portées qui constatent un triptyque`);
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
  const attendu = [
    ['hope-hope-hope.fr', 'MOISSON', 5, null],
    ['https://hope-hope-hope.fr/', 'MOISSON', 6, null],
    ['Donald Trump', 'MOISSON', 2, 't1+mw+mz,fl+t1+mw+mz'],
    ['Macron', 'GROUPEMENT', 1, 'fl+t1+mw+mz'],
  ];
  for (const [saisie, mode, series, codes] of attendu) {
    const tete = m.resoudre(saisie).approches[0];
    assert.equal(tete.mode, mode, `« ${saisie} » : ${tete.mode} — ${tete.codes}`);
    assert.equal(tete.series || 1, series, `« ${saisie} » : ${tete.series} séries — ${tete.codes}`);
    if (codes) assert.equal(tete.codes, codes, `« ${saisie} »`);
    // …et c'est bien l'ÉLÉGANCE qui les met là : la première suggestion.
    assert.equal(tete.suggestion, 'elegance', `« ${saisie} » : place due à « ${tete.suggestion} »`);
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
test('★ `mz` — « trois 6 d’affilée » est bien l’opérateur qui CONSTATE le triptyque', () => {
  const op = operateur('m.troisSixDAffilee');
  assert.equal(op.code, 'mz');
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
  assert.equal(b.valeursJetees, 3, 'le 7, le 3 et le sixième 6 sont calculés puis effacés');
  assert.equal(b.triptyqueTenu, true, '…mais le 666 était écrit, et il tient');
  assert.equal(b.sixDetruits, 0, 'effacer n’est pas convertir : le 6 en trop se compte ailleurs');
});
