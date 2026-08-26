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
//     suppression arbitraire de ce qui n'est pas 6 ». `m10`, `m11` et `m12`
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
  BAREME, FICELLES, bilanChemin, bilanApproche, credit, detailDuCredit,
  facteur, note, estPur, amplitudeArrondi, finDuTriptyque, nbTriptyques,
  classeDeTransformation, survieDesCaracteres,
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
 * ★ LES TROIS FICELLES SONT BRANCHÉES — et le barème les voit.
 *
 * Ce test remplace celui qui gelait leur ABSENCE. Trois demandes de l'auteur
 * n'avaient aucun opérateur à mesurer ; il a tranché — « ma demande c'est aussi
 * de les ajouter au catalogue ». `m10`, `m11`, `m12` existent, et chacun
 * alimente son palier. On le vérifie des DEUX côtés : l'identifiant inscrit
 * dans `FICELLES` doit exister au catalogue, et le compteur doit bouger quand
 * l'opérateur s'applique. Sans les deux, un palier pourrait se rendormir en
 * silence et l'on croirait mesurer ce qu'on ne mesure plus.
 */
test('★ les trois ficelles sont au catalogue, et chacune alimente SON palier', () => {
  const attendu = {
    'm.plusFrequent': ['m10', 'majorite', [6, 4, 6, 6, 6]],
    'm.unRangSurDeux': ['m11', 'decimation', [6, 4, 6, 3, 6]],
    'm.additionSelective': ['m12', 'additionSelective', [6, 5, 16, 8]],
  };
  assert.deepEqual(Object.keys(FICELLES).sort(), Object.keys(attendu).sort(),
    'FICELLES et le catalogue doivent parler des mêmes opérateurs');

  for (const [id, [code, compteur, entree]] of Object.entries(attendu)) {
    assert.equal(FICELLES[id], compteur, `${id} doit alimenter « ${compteur} »`);
    const op = operateur(id);
    assert.equal(op.code, code, `${id} doit porter le code ${code} (registre append-only, §4.1)`);

    const avant = etat('NUMS', entree);
    const brut = op.apply(entree, entree.map(() => []));
    assert.ok(brut, `${code} doit s’appliquer à ${JSON.stringify(entree)}`);
    const apres = etat('NUMS', brut.valeur);
    const b = bilanChemin({ ops: [op], etats: [avant, apres] });
    assert.ok(b[compteur] > 0, `${code} doit faire monter « ${compteur} »`);
    // ★ …et la peine n'est PAS comptée deux fois : ce que la ficelle écarte ne
    //   repasse pas par `valeursJetees`.
    assert.equal(b.valeursJetees, 0,
      `${code} : son palier remplace « valeurs jetées », il ne s’y ajoute pas`);
  }
});

/**
 * ★ `6, 5, 16, 8` → `6, 5+1, 6, 8` → `666, 8` — LE CAS ÉCRIT PAR L'AUTEUR.
 *
 * « La logique voudrait `6+5+1+6+8`, ou `6, 5, 1+6, 8` ; faire `6, 5+1, 6, 8`
 * pour obtenir `666, 8` est acceptable mais pénalisé — c'est de la triche à
 * utiliser en dernier recours. »
 *
 * Le balayage glouton de `m12` rend EXACTEMENT la découpe qu'il désigne, et pas
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
 * `exige`, au sens de `my` et `mz` : un opérateur qui ne change rien, ou qui ne
 * sert à rien, fabrique une étape que `scenario.js` saute EN SILENCE — et l'URL
 * porte alors un code que la démonstration ne montre nulle part.
 */
test('★ ficelles — elles refusent quand elles n’achètent rien', () => {
  const t = (v) => v.map(() => []);
  for (const [code, id] of [['m10', 'm.plusFrequent'], ['m11', 'm.unRangSurDeux'],
    ['m12', 'm.additionSelective']]) {
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
 *  · avec `m11`, le vecteur devient `[6,6,6]` : le 666 est écrit d'affilée, et
 *    les deux valeurs écartées se paient au tarif de la ficelle.
 *
 * La ficelle doit gagner — et gagner sans excès : une méthode qui atteint le
 * même `[6,6,6]` SANS ficelle doit rester devant.
 */
test('★ ficelles — mieux que le tri arbitraire, moins bien qu’une voie honnête', () => {
  const saisie = 'motfinal';
  const ctx = ctxDe(saisie);
  const parCredit = (ch) => credit(bilanApproche(approche(saisie, [0, 8], ch), ctx));

  // 1. le tri arbitraire : on laisse le verdict écarter ce qui n'est pas 6
  const tri = parCredit(vecteur([6, 4, 6, 3, 6]));
  // 2. la ficelle : `m11` isole les rangs impairs et écrit 666
  const ficelle = parCredit(chemin([
    etat('STR', 'xxxxx'),
    etat('TOKENS', ['x', 'x', 'x', 'x', 'x']),
    etat('NUMS', [6, 4, 6, 3, 6]),
    etat('NUMS', [6, 6, 6]),
  ], ['t.caracteres', 'm.postiche', 'm.unRangSurDeux']));
  // 3. la voie honnête : le même `[6,6,6]`, sans ficelle
  const honnete = parCredit(vecteur([6, 6, 6]));

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
 * (crédit 1 129) à `fl+t1+mw+m10`, une ficelle à une seule série (1 102).
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

  // Le tri paie `VALEUR_JETEE` ; la ficelle ne le paie PAS, elle paie son palier.
  assert.ok(tri.valeursJetees > 0, 'le tri arbitraire jette, et il le paie');
  assert.equal(ficelle.valeursJetees, 0, 'la ficelle ne paie jamais ce poste — son palier le remplace');
  assert.ok(ficelle.decimation > 0, '…et elle paie le sien');

  // Donc : alourdir `VALEUR_JETEE` creuse l'écart EN FAVEUR de la ficelle.
  const ecart = (poids) => {
    const memoire = BAREME.VALEUR_JETEE;
    BAREME.VALEUR_JETEE = poids;
    const d = credit(ficelle) - credit(tri);
    BAREME.VALEUR_JETEE = memoire;
    return d;
  };
  const a36 = ecart(36);
  const a78 = ecart(78);
  assert.ok(a78 > a36,
    `alourdir le gaspillage (36 → 78) doit AVANTAGER la ficelle (${a36} → ${a78}), `
    + 'et c’est exactement pour ça qu’on ne l’alourdit pas');
  assert.equal(a78 - a36, (78 - 36) * tri.valeursJetees,
    'l’avantage offert est exactement le gaspillage que la ficelle ne paie pas');
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
  const attendus = {
    'hope-hope-hope.fr': 5,
    'https://hope-hope-hope.fr/': 6,
    'Donald Trump': 2,
    Macron: 1,
  };
  for (const [saisie, series] of Object.entries(attendus)) {
    const tete = m.resoudre(saisie).approches[0];
    assert.equal(tete.series || 1, series,
      `« ${saisie} » : ${series} séries attendues en tête, ${tete.series} trouvées`);
    for (const code of ['m10', 'm11', 'm12']) {
      assert.ok(!tete.codes.includes(code),
        `« ${saisie} » : la voie de tête (${tete.codes}) emploie la ficelle ${code}`);
    }
  }
});

/**
 * ★ LE COMPTE DES TRIPTYQUES — autant de bonus que de 666 écrits d'affilée.
 *
 * ⚠️ Le bonus se comptait PAR PORTÉE qui en porte un. `f6+t1+mw` sur
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
