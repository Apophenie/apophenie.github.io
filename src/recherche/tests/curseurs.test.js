// Les quatre curseurs de pondération, et la réglette de puissance de fouille.
//
// ⚠️ CE FICHIER GARDE UN INVARIANT AVANT DE MESURER QUOI QUE CE SOIT : au cran
// par défaut, le classement doit être EXACTEMENT celui d'avant les curseurs —
// mêmes voies, mêmes scores, mêmes élégances, mêmes liens. Il l'est par
// construction (`score.js › noter` ne change pas de branche tant que la
// pondération ne se déclare pas `personnalisee`), mais c'est précisément le
// genre d'invariant qu'une réécriture casse en silence : on le vérifie.
//
// Le reste du fichier vérifie que chaque curseur fait quelque chose. Un curseur
// qui ne déplace rien est une glissière décorative, et c'est cette mesure-là —
// « quantité à zéro ne changeait la tête d'aucune liste » — qui a imposé
// `rangPondere`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur, creerCanal } from '../index.js';
import { lire, ecrire } from '../url.js';
import {
  POIDS, CURSEURS, CURSEUR_DEFAUT, CURSEUR_MAX, CURSEURS_DEFAUT, CORRESPONDANCE,
  ponderer, normaliserCurseurs, pourcentagesDe, auDefaut,
  facteurRendement, facteurQuantite, racineEntiere, REGLAGES,
  ordreTotal, ordrePondere, rangPondere, rangConviction, RANG,
} from '../score.js';
import {
  reglagesDeBudget, normaliserPuissance,
  PUISSANCE_DE_FOUILLE_DEFAUT, PUISSANCE_DE_FOUILLE_MAX,
  BUDGET_TOTAL_MS, BUDGET_MS_FILET, BUDGET_MS_PLAFOND,
} from '../../config.js';
import { catalogue } from './_catalogue.js';

// Le filet temporel est débranché : ces tests comparent deux classements, et un
// classement écourté à l'horloge ne se compare à rien (`bfs.js`, en-tête).
const moteur = creerMoteur(catalogue, { filetTemporel: false });

/** Les saisies du relevé — courtes, longues, à motif répété, avec et sans URL. */
const SAISIES = [
  'hope',
  'hope-hope-hope.fr',
  'https://hope-hope-hope.fr/',
  'Macron',
  'Millicent',
  'Donald Trump',
  'Le chat dort sur le tapis rouge',
  'https://www.google.com',
];

/** L'empreinte complète d'une liste : ce qu'un lecteur voit, et ce qu'il copie. */
const empreinte = (r) => r.approches.map((a) => [
  a.rang, a.score, a.elegance, a.series ?? '-', a.L, a.codes, a.url, a.urlSobre,
].join('|')).join('\n');

/**
 * La même empreinte SANS LES LIENS. Elle sert là où l'on compare deux listes
 * dont on sait que les marqueurs d'URL diffèrent — la puissance de fouille est
 * écrite dans le lien même quand elle ne change rien à la recherche, et c'est
 * voulu (`url.js`, en-tête : « une règle unique se relit, une exception se
 * discute »).
 */
const voies = (r) => r.approches.map((a) => [
  a.rang, a.score, a.elegance, a.series ?? '-', a.L, a.codes,
].join('|')).join('\n');

// ══════════════════════════════════ la table de correspondance

test('curseurs — au défaut, la correspondance rend EXACTEMENT le barème du site', () => {
  const p = ponderer();
  assert.deepEqual(p.poids, POIDS, 'les six poids, à l’unité près');
  assert.equal(Object.values(p.poids).reduce((s, x) => s + x, 0), 1000, 'somme imposée');
  assert.equal(p.personnalisee, false, 'le défaut n’est pas une personnalisation');
  assert.deepEqual(p.curseurs, CURSEURS_DEFAUT);
  // Le crédit d'élégance au poids plein : `elegance.js › pondererAmpleur` le
  // court-circuite à 1 000 ‰, donc le crédit reste bit à bit celui d'avant.
  // ★ TROIS familles pondérées, et 1 000 est l'identité pour chacune : le
  //   barème du site est intact au défaut. `exhaustivite` a rejoint les deux
  //   autres quand l'auteur a tranché que ce curseur devait peser « tout ce qui
  //   est suppression, que ce soit au départ ou plus tard » — les cinq postes de
  //   l'abandon portent désormais cette famille (`elegance.js › NATURE`).
  assert.deepEqual(p.poidsCredit, { quantite: 1000, elegance: 1000, exhaustivite: 1000 });
});

test('curseurs — la table couvre les six critères et rien d’autre', () => {
  assert.deepEqual(Object.keys(CORRESPONDANCE).sort(), Object.keys(POIDS).sort());
  // Chaque coefficient nomme un curseur existant, et le total de chaque critère
  // vaut son poids d'aujourd'hui pour cent crans.
  for (const [critere, parts] of Object.entries(CORRESPONDANCE)) {
    let total = 0;
    for (const [cur, coef] of Object.entries(parts)) {
      assert.ok(CURSEURS.includes(cur), `${critere} nomme un curseur inconnu : ${cur}`);
      assert.ok(coef > 0, `${critere}/${cur} : un coefficient nul ne se déclare pas`);
      total += coef;
    }
    assert.equal(total, POIDS[critere], `${critere} doit valoir ${POIDS[critere]} au défaut`);
  }
});

test('curseurs — les arbitrages de l’auteur sont dans la table, pas dans un commentaire', () => {
  // « homogénéité devrait varier avec simplicité ET cohérence »
  assert.deepEqual(Object.keys(CORRESPONDANCE.homogeneite).sort(), ['coherence', 'simplicite']);
  assert.equal(
    CORRESPONDANCE.homogeneite.simplicite, CORRESPONDANCE.homogeneite.coherence,
    'moitié-moitié : l’auteur n’a énoncé aucune préséance',
  );
  // « notoriété devrait varier avec cohérence »
  assert.deepEqual(Object.keys(CORRESPONDANCE.notoriete), ['coherence']);
  // « exhaustivité doit peser sur couverture »
  assert.deepEqual(Object.keys(CORRESPONDANCE.couverture), ['exhaustivite']);
  // La quantité ne pèse sur AUCUN des six — elle agit sur le crédit et le rang.
  for (const parts of Object.values(CORRESPONDANCE)) {
    assert.equal(parts.quantite, undefined, 'la quantité n’est pas un critère de score');
  }
});

test('curseurs — la renormalisation tombe toujours sur 1 000, sans flottant', () => {
  // Un balayage exhaustif de crans « biscornus » : la répartition au plus fort
  // reste doit tenir sur chacun, sinon la somme dérive d'une unité ici ou là.
  for (let s = 0; s <= CURSEUR_MAX; s += 7) {
    for (let e = 0; e <= CURSEUR_MAX; e += 11) {
      for (let c = 0; c <= CURSEUR_MAX; c += 13) {
        const p = ponderer({ simplicite: s, exhaustivite: e, coherence: c });
        const somme = Object.values(p.poids).reduce((x, y) => x + y, 0);
        assert.equal(somme, 1000, `s=${s} e=${e} c=${c} → ${JSON.stringify(p.poids)}`);
        for (const v of Object.values(p.poids)) assert.ok(Number.isInteger(v) && v >= 0);
      }
    }
  }
});

test('curseurs — trois curseurs à zéro : on garde le barème, on ne l’invente pas', () => {
  // « Quantité seule » : aucun des trois curseurs qui nourrissent les six
  // critères n'est levé. Les poids n'ont pas de rapport défini entre eux, et le
  // repli est DIT plutôt que silencieux.
  const p = ponderer({ simplicite: 0, exhaustivite: 0, coherence: 0, quantite: CURSEUR_MAX });
  assert.deepEqual(p.poids, POIDS);
  assert.equal(p.personnalisee, true, 'le repli des poids ne rend pas le réglage inerte');
  assert.equal(p.poidsCredit.quantite, 2000, 'la quantité, elle, agit toujours');
});

test('curseurs — positions bornées, absentes ou illisibles', () => {
  assert.deepEqual(normaliserCurseurs({}), CURSEURS_DEFAUT, 'absent ⇒ défaut, pas zéro');
  assert.deepEqual(normaliserCurseurs(null), CURSEURS_DEFAUT);
  assert.equal(normaliserCurseurs({ simplicite: -40 }).simplicite, 0);
  assert.equal(normaliserCurseurs({ simplicite: 9999 }).simplicite, CURSEUR_MAX);
  assert.equal(normaliserCurseurs({ simplicite: 42.9 }).simplicite, 42, 'tronqué, jamais arrondi');
  assert.equal(normaliserCurseurs({ simplicite: 'zut' }).simplicite, CURSEUR_DEFAUT);
  assert.equal(normaliserCurseurs({ simplicite: NaN }).simplicite, CURSEUR_DEFAUT);
  assert.equal(auDefaut(normaliserCurseurs({})), true);
  assert.equal(auDefaut(normaliserCurseurs({ quantite: 99 })), false);
});

test('curseurs — le pourcentage affiché est bien celui que l’auteur a écrit', () => {
  // « valeur_du_curseur / max(1, somme_de_toutes_les_positions) »
  assert.deepEqual(pourcentagesDe({}), {
    simplicite: 25, exhaustivite: 25, quantite: 25, coherence: 25,
  }, 'quatre curseurs égaux ⇒ quatre fois 25 %, et non 25/25/25/24');
  const p = pourcentagesDe({ simplicite: 200, exhaustivite: 0, quantite: 0, coherence: 0 });
  assert.deepEqual(p, { simplicite: 100, exhaustivite: 0, quantite: 0, coherence: 0 });
  // Le `max(1, …)` : quatre curseurs au plancher n'inventent aucune répartition.
  assert.deepEqual(pourcentagesDe({ simplicite: 0, exhaustivite: 0, quantite: 0, coherence: 0 }), {
    simplicite: 0, exhaustivite: 0, quantite: 0, coherence: 0,
  });
  // Et la somme tombe toujours sur cent tant qu'un curseur est levé.
  for (let q = 1; q <= CURSEUR_MAX; q += 3) {
    const x = pourcentagesDe({ simplicite: 37, exhaustivite: 5, quantite: q, coherence: 91 });
    assert.equal(Object.values(x).reduce((a, b) => a + b, 0), 100, `quantite=${q}`);
  }
});

// ══════════════════════════════════ les deux facteurs

test('curseurs — le rendement, porté par l’exhaustivité : trois ancrages exacts', () => {
  for (const r of [0, 176, 285, 750, 857, 1000]) {
    assert.equal(facteurRendement(r, 0), 1000, `r=${r} : jeter est gratuit`);
    assert.equal(facteurRendement(r, CURSEUR_DEFAUT), racineEntiere(r * 1000),
      `r=${r} : au défaut, c’est la racine — le tarif d’aujourd’hui`);
    assert.equal(facteurRendement(r, CURSEUR_MAX), r, `r=${r} : plein tarif`);
  }
  // Monotone décroissant en exhaustivité : lever le curseur ne peut qu'alourdir
  // la peine, jamais l'alléger. C'est ce qui rend la glissière lisible.
  for (const r of [176, 285, 500, 750, 857]) {
    let precedent = 1001;
    for (let e = 0; e <= CURSEUR_MAX; e++) {
      const f = facteurRendement(r, e);
      assert.ok(f <= precedent, `r=${r}, e=${e} : ${f} > ${precedent}`);
      precedent = f;
    }
  }
  // Le parfait ne bouge jamais : une voie qui ne jette rien n'a rien à payer.
  for (let e = 0; e <= CURSEUR_MAX; e++) assert.equal(facteurRendement(1000, e), 1000);
});

test('curseurs — le compte des séries, porté par la quantité : jamais au-dessus de ×1', () => {
  const plafond = REGLAGES.SERIES_PLAFOND;
  for (let s = 1; s <= plafond + 2; s++) {
    for (let q = 0; q <= CURSEUR_MAX; q++) {
      const f = facteurQuantite(s, q);
      assert.ok(f <= 1000, `s=${s} q=${q} : ${f} — un facteur ne peut que retirer`);
      assert.ok(f >= REGLAGES.PLANCHER_DE_QUANTITE, `s=${s} q=${q} : ${f} sous le plancher`);
    }
    assert.equal(facteurQuantite(s, CURSEUR_DEFAUT), 1000, 'le défaut ne touche à rien');
  }
  // Au-dessus du défaut, il en manque : plus de séries ⇒ moins de peine.
  assert.ok(facteurQuantite(6, CURSEUR_MAX) > facteurQuantite(1, CURSEUR_MAX));
  // En dessous, il y en a trop : plus de séries ⇒ plus de peine.
  assert.ok(facteurQuantite(6, 0) < facteurQuantite(1, 0));
  assert.equal(facteurQuantite(1, 0), 1000, 'le 666 unique cesse d’être pénalisé');
  // Le plafond est celui de `assemblage.js › MAX_SERIES` : au-delà, rien ne
  // change, parce que le moteur ne montre pas plus de séries que cela.
  assert.equal(facteurQuantite(plafond, CURSEUR_MAX), facteurQuantite(plafond + 5, CURSEUR_MAX));
});

test('★ curseurs — ce que chaque curseur GARANTIT, exactement', () => {
  // ⚠️ Ces quatre propriétés sont les seules que le barème promette, et elles
  //    sont EXACTES — la moyenne d'un corpus, elle, ne promet rien (voir le pavé
  //    « les deux façons de ne rien jeter » dans `score.js › facteurRendement`).
  //    Chacune se lit ainsi : à deux voies identiques sur tout le reste, lever
  //    le curseur ne peut qu'avantager celle qu'il nomme.
  // ⚠️ La grandeur qui doit croître est le RAPPORT du critère à un TÉMOIN que le
  //    curseur ne nourrit pas — jamais son poids absolu. Les six poids somment à
  //    1 000 : lever un curseur qui nourrit quatre critères leur donne à tous du
  //    terrain, mais la part de chacun peut baisser si les trois autres montent
  //    plus vite. MESURÉ : l'homogénéité passe de 275 à 243 ‰ quand la cohérence
  //    va de 0 à 200, alors même que sa contribution brute triple — parce que la
  //    notoriété, l'anti-ad-hoc et l'élégance, eux, partent de zéro. La phrase de
  //    l'auteur (« varier avec ») porte sur ce que le curseur APPORTE, et c'est
  //    le rapport qui le dit sans se faire piéger par la normalisation.
  const gagneDuTerrain = (curseur, critere, temoin) => {
    let precedent = null;
    for (let cran = 0; cran <= CURSEUR_MAX; cran += 10) {
      const p = ponderer({ [curseur]: cran }).poids;
      // Comparaison en produits croisés : entière, donc exacte (§4.4).
      if (precedent !== null) {
        assert.ok(p[critere] * precedent[temoin] >= precedent[critere] * p[temoin],
          `${curseur}=${cran} : ${critere}/${temoin} recule `
          + `(${precedent[critere]}/${precedent[temoin]} → ${p[critere]}/${p[temoin]})`);
      }
      precedent = p;
    }
  };
  // « exhaustivité doit peser sur couverture » : du poids nul au poids dominant.
  gagneDuTerrain('exhaustivite', 'couverture', 'concision');
  assert.equal(ponderer({ exhaustivite: 0 }).poids.couverture, 0);
  assert.ok(ponderer({ exhaustivite: CURSEUR_MAX }).poids.couverture > 300,
    'au cran haut, la couverture doit être le critère dominant');
  // « simplicité » : la concision.
  gagneDuTerrain('simplicite', 'concision', 'couverture');
  // « homogénéité devrait varier avec simplicité ET cohérence » : les deux.
  gagneDuTerrain('simplicite', 'homogeneite', 'couverture');
  gagneDuTerrain('coherence', 'homogeneite', 'couverture');
  // « notoriété devrait varier avec cohérence », et les deux autres critères de
  // manière suivent le même curseur.
  for (const critere of ['notoriete', 'antiAdHoc', 'elegance']) {
    gagneDuTerrain('coherence', critere, 'couverture');
  }
  // Et le rendement : plus le curseur monte, plus jeter coûte cher.
  for (const r of [176, 285, 500, 750]) {
    assert.ok(facteurRendement(r, 0) > facteurRendement(r, CURSEUR_DEFAUT));
    assert.ok(facteurRendement(r, CURSEUR_DEFAUT) > facteurRendement(r, CURSEUR_MAX));
  }
});

// ══════════════════════════════════ l'invariant du défaut

test('★ curseurs — au défaut, le classement est identique à celui d’avant, au point près', () => {
  for (const s of SAISIES) {
    const sans = moteur.resoudre(s);
    const avecDefaut = moteur.enumerer(s, { curseurs: CURSEURS_DEFAUT, fouille: 0 });
    assert.equal(empreinte(avecDefaut), empreinte(sans), `« ${s} » : le défaut a bougé`);
    // Les deux régimes (1ʳᵉ et 2ᵈ place) sont toujours là au défaut : c'est ce
    // qui distingue le défaut du mode personnalisé.
    assert.equal(sans.approches[0].suggestion, 'elegance');
    // Le lien de la liste ne porte aucun marqueur de réglage.
    assert.ok(!avecDefaut.urlResultats.includes('p1'), avecDefaut.urlResultats);
    assert.ok(!avecDefaut.urlResultats.includes('f0!'), avecDefaut.urlResultats);
  }
});

test('★ curseurs — un réglage explicitement au défaut n’écrit rien dans l’URL', () => {
  const nu = ecrire({ saisie: 'hope' });
  assert.equal(ecrire({ saisie: 'hope', curseurs: CURSEURS_DEFAUT, fouille: 0 }), nu);
  const frag = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  assert.equal(
    ecrire({ saisie: 'hope', fragments: frag, registre: 'sobre', curseurs: {}, fouille: 0 }),
    ecrire({ saisie: 'hope', fragments: frag, registre: 'sobre' }),
    'la forme canonique des liens déjà partagés ne bouge pas d’un signe',
  );
});

// ══════════════════════════════════ le mode personnalisé

test('★ curseurs — chacun des quatre déplace réellement la liste', () => {
  const reference = new Map(SAISIES.map((s) => [s, empreinte(moteur.enumerer(s))]));
  for (const curseur of CURSEURS) {
    for (const cran of [0, CURSEUR_MAX]) {
      let bougees = 0;
      for (const s of SAISIES) {
        const r = moteur.enumerer(s, { curseurs: { [curseur]: cran } });
        if (empreinte(r) !== reference.get(s)) bougees++;
      }
      assert.ok(bougees >= 3,
        `« ${curseur} » au cran ${cran} ne déplace que ${bougees} listes sur ${SAISIES.length}`);
    }
  }
});

test('★ curseurs — les deux régimes sont DÉBRANCHÉS dès qu’un curseur bouge', () => {
  const r = moteur.enumerer('https://hope-hope-hope.fr/', { curseurs: { coherence: 150 } });
  for (const a of r.approches) {
    assert.equal(a.suggestion, undefined,
      'aucune ligne ne doit devoir sa place à un régime que le visiteur n’a pas demandé');
    assert.equal(a.elegances, null, 'les crédits des régimes ne sont même plus calculés');
  }
  // …et toute la liste est classée avec le même comparateur, de bout en bout.
  const ordre = ordrePondere(ponderer({ coherence: 150 }));
  for (let i = 1; i < r.approches.length; i++) {
    if (r.approches[i].joker) continue; // le joker est poussé en queue à part (§0.4)
    assert.ok(ordre(r.approches[i - 1], r.approches[i]) <= 0,
      `rangs ${i} et ${i + 1} dans le désordre`);
  }
});

test('★ curseurs — quantité à zéro rend la tête de liste au 666 unique', () => {
  // MESURE : c'est le cas qui a imposé `rangPondere`. Le rang des séries est
  // catégoriel ; tant qu'il tenait, « quantité à zéro » ne changeait la tête
  // d'aucune liste, et la moisson à six séries restait première à tous les crans.
  const s = 'https://hope-hope-hope.fr/';
  const defaut = moteur.enumerer(s);
  const sansQuantite = moteur.enumerer(s, { curseurs: { quantite: 0 } });
  const avecQuantite = moteur.enumerer(s, { curseurs: { quantite: CURSEUR_MAX } });
  assert.equal(sansQuantite.approches[0].series ?? 1, 1,
    'quantité à zéro : une voie qui ne montre qu’un 666 peut mener');
  assert.ok((avecQuantite.approches[0].series ?? 1) >= 2,
    'quantité à fond : la moisson mène');
  assert.notEqual(empreinte(sansQuantite), empreinte(defaut));
});

test('curseurs — le rang : la convergence reste dernière à tous les crans', () => {
  const convergence = { mode: 'CONVERGENCE', series: 6 };
  for (let q = 0; q <= CURSEUR_MAX; q += 25) {
    const p = ponderer({ quantite: q });
    assert.equal(rangPondere(convergence, p), RANG.CONVERGENCE,
      `q=${q} : aucun curseur ne nomme « les mêmes caractères trois fois »`);
  }
  // Au cran par défaut, le rang pondéré EST le rang de conviction.
  const moisson = { mode: 'MOISSON', series: 4 };
  const simple = { mode: 'DIRECT', series: 1 };
  for (const a of [convergence, moisson, simple]) {
    assert.equal(rangPondere(a, ponderer()), rangConviction(a));
    assert.equal(rangPondere(a, ponderer({ quantite: CURSEUR_MAX })), rangConviction(a));
  }
  // En dessous, les séries cessent de primer.
  assert.equal(rangPondere(moisson, ponderer({ quantite: 0 })), RANG.SIMPLE);
});

test('curseurs — au cran par défaut, `ordrePondere` se comporte comme `ordreTotal`', () => {
  const r = moteur.enumerer('https://hope-hope-hope.fr/');
  const ordre = ordrePondere(ponderer());
  const parPondere = r.approches.slice().sort(ordre).map((a) => a.codes);
  const parTotal = r.approches.slice().sort(ordreTotal).map((a) => a.codes);
  assert.deepEqual(parPondere, parTotal);
});

test('curseurs — aucun score ne sature le plafond de 10 000', () => {
  // Un facteur qui monterait au-dessus de ×1 ferait saturer le haut de liste et
  // remettrait à égalité ce que le barème vient de séparer (`PART_CRITERES`).
  for (const s of SAISIES) {
    for (const curseur of CURSEURS) {
      for (const cran of [0, CURSEUR_MAX]) {
        for (const a of moteur.enumerer(s, { curseurs: { [curseur]: cran } }).approches) {
          assert.ok(a.scoreBrut === undefined || a.scoreBrut <= 10000,
            `« ${s} » ${curseur}=${cran} : ${a.codes} sature à ${a.scoreBrut}`);
        }
      }
    }
  }
});

// ══════════════════════════════════ la puissance de fouille

test('fouille — la réglette est bien 2^N, de 0 à 7, et le cran 0 est l’identité', () => {
  assert.equal(PUISSANCE_DE_FOUILLE_DEFAUT, 0);
  assert.equal(PUISSANCE_DE_FOUILLE_MAX, 7);
  for (let n = 0; n <= PUISSANCE_DE_FOUILLE_MAX; n++) {
    const r = reglagesDeBudget(n);
    assert.equal(r.puissance, n);
    assert.equal(r.facteur, 2 ** n);
    // ★ **PLAFONNÉ À 128 s**, et c'est l'auteur qui pose la borne : « augmentable
    //   jusqu'à ×128, en repoussant avec profondeur max autour de 32 et durée à
    //   128 s ». Multiplié tel quel, le cran 7 demanderait vingt et une minutes.
    //   Le budget de TRAVAIL, lui, n'est pas plafonné : il est déterministe et se
    //   dépense en applications d'opérateurs, alors que le temps est un FILET —
    //   et un filet qui ne ferme jamais n'en est plus un.
    assert.equal(r.budgetTotalMs, Math.min(BUDGET_MS_PLAFOND, BUDGET_TOTAL_MS * (2 ** n)));
    assert.equal(r.budgetMsFilet, BUDGET_MS_FILET * (2 ** n));
  }
  const zero = reglagesDeBudget(0);
  assert.equal(zero.facteur, 1, 'au défaut, pas un budget ne change de valeur');
  assert.equal(zero.budgetTotalMs, BUDGET_TOTAL_MS);
  assert.equal(zero.budgetMsFilet, BUDGET_MS_FILET);
});

test('fouille — un cran hors réglette est borné, jamais refusé', () => {
  assert.equal(normaliserPuissance(-3), 0);
  assert.equal(normaliserPuissance(99), PUISSANCE_DE_FOUILLE_MAX);
  assert.equal(normaliserPuissance(3.9), 3, 'tronqué, jamais arrondi');
  assert.equal(normaliserPuissance('2'), 2);
  assert.equal(normaliserPuissance(undefined), PUISSANCE_DE_FOUILLE_DEFAUT);
  assert.equal(normaliserPuissance('zut'), PUISSANCE_DE_FOUILLE_DEFAUT);
});

test('fouille — le cran 0 rend exactement la liste d’aujourd’hui', () => {
  for (const s of SAISIES) {
    assert.equal(
      empreinte(moteur.enumerer(s, { fouille: 0 })),
      empreinte(moteur.resoudre(s)),
      `« ${s} »`,
    );
  }
});

test('fouille — elle ne fait rien là où il n’y avait rien à ajouter', () => {
  /* ★ **CE TEST A ÉTÉ REMESURÉ, ET SES DEUX EXEMPLES ONT CHANGÉ DE CAMP.**

     Il tenait « hope » et `https://hope-hope-hope.fr/` pour deux saisies que la
     recherche TERMINE, et vérifiait que la réglette n'y changeait rien. C'était
     vrai à profondeur 4 ; ça ne l'est plus à profondeur 15 (`bfs.js › D_MAX`),
     où le budget par fragment mord sur presque tout. Remesuré, têtes de liste
     aux crans 0 à 3 :

       « hope »                       6 190 → 6 190 → 6 190 → 6 190
       `https://hope-hope-hope.fr/`   3 221 → 4 165 → 4 165 → 4 165

     La seconde n'est donc plus un exemple de « rien à ajouter » : c'en est un de
     « un cran suffit ». On garde la première, qui l'illustre toujours, et la
     seconde sert désormais à l'autre test. */
  const s = 'hope';
  const base = moteur.enumerer(s, { fouille: 0 });
  assert.equal(base.avertissement, undefined,
    'le filet TEMPOREL ne doit pas mordre — c’est lui, et lui seul, qui rendrait '
    + 'les rangs non reproductibles');
  for (const f of [1, 2, 3]) {
    // Sans les liens : le cran est écrit dans l'URL même quand il ne change
    // rien à la recherche, pour que le retour à la liste retrouve le réglage.
    assert.equal(voies(moteur.enumerer(s, { fouille: f })), voies(base),
      `« ${s} » au cran ${f}`);
  }
});

test('fouille — elle finit la recherche là où le budget mordait', () => {
  /* L'autre moitié de la mesure, et l'exemple vient du test précédent : sur
     `https://hope-hope-hope.fr/`, UN SEUL CRAN suffit à changer la liste, et la
     tête passe de 3 221 à 4 165. Au-delà, plus rien ne bouge — la recherche a
     fini, les crans suivants ne servent qu'aux saisies plus lourdes.

     ⚠️ On ne gèle plus `tronque` : il réunit la borne DÉTERMINISTE de travail
       (reproductible, silencieuse) et le filet TEMPOREL (qui, lui, affiche un
       bandeau). Depuis `D_MAX` 15 la première vaut vrai à peu près partout, y
       compris sur « a ». Ce n'est pas une panne, c'est un drapeau devenu muet :
       on mesure l'effet UTILE à sa place. */
  const s = 'https://hope-hope-hope.fr/';
  const court = moteur.enumerer(s, { fouille: 0 });
  const long = moteur.enumerer(s, { fouille: 1 });
  assert.ok(long.approches[0].score > court.approches[0].score,
    `la tête doit s’améliorer : ${court.approches[0].score} → ${long.approches[0].score}`);
  // Et un cran de plus n'ajoute plus rien : c'est ce qui rend la réglette
  // honnête plutôt que magique.
  assert.equal(voies(moteur.enumerer(s, { fouille: 2 })), voies(long),
    'au-delà, la recherche a fini');
});

// ══════════════════════════════════ l'aller-retour dans l'URL

test('★ url — aller-retour des quatre curseurs et de la fouille', () => {
  const cas = [
    { curseurs: { simplicite: 0, exhaustivite: 200, quantite: 100, coherence: 150 }, fouille: 3 },
    { curseurs: { simplicite: 200, exhaustivite: 0, quantite: 0, coherence: 0 }, fouille: 0 },
    { curseurs: CURSEURS_DEFAUT, fouille: 7 },
    { curseurs: { quantite: 1 }, fouille: 1 },
  ];
  for (const { curseurs, fouille } of cas) {
    const attendus = normaliserCurseurs(curseurs);
    for (const fragments of [undefined, [{ portee: null, resonance: null, codes: ['tca', 'm36'] }]]) {
      const frag = ecrire({ saisie: 'Donald Trump', fragments, registre: 'sobre', curseurs, fouille });
      const lu = lire(frag);
      assert.deepEqual(lu.curseurs, attendus, frag);
      assert.equal(lu.fouille, fouille, frag);
      assert.equal(lu.saisie, 'Donald Trump', frag);
      // …et réécrire ce qu'on vient de lire rend le même lien, au signe près.
      assert.equal(ecrire({
        saisie: lu.saisie, fragments: lu.fragments, retouches: lu.retouches,
        registre: lu.registre, cible: lu.cible, curseurs: lu.curseurs, fouille: lu.fouille,
      }), frag, 'forme canonique instable');
    }
  }
});

test('url — les marqueurs se lisent dans n’importe quel ordre, et s’écrivent dans un seul', () => {
  const attendu = { simplicite: 10, exhaustivite: 20, quantite: 30, coherence: 40 };
  for (const h of [
    '#so!c111!p10.20.30.40!f2!tca+m36#3fq9KJ',
    '#f2!p10.20.30.40!c111!so!tca+m36#3fq9KJ',
    '#p10.20.30.40!so!f2!c111!tca+m36#3fq9KJ',
  ]) {
    const lu = lire(h);
    assert.equal(lu.forme, 'canonique', h);
    assert.deepEqual(lu.curseurs, attendu, h);
    assert.equal(lu.fouille, 2, h);
    assert.equal(lu.cible.texte, '111', h);
  }
  // Une seule forme écrite : registre, cible, curseurs, fouille.
  assert.equal(
    ecrire({
      saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['tca', 'm36'] }],
      registre: 'sobre', cible: '111', curseurs: attendu, fouille: 2,
    }),
    '#so!c111!p10.20.30.40!f2!tca+m36#3fq9KJ',
  );
});

test('url — les crans hors glissière sont bornés, un marqueur amputé est refusé', () => {
  const lu = lire('#p999.0.0.500!#3fq9KJ');
  assert.deepEqual(lu.curseurs, {
    simplicite: CURSEUR_MAX, exhaustivite: 0, quantite: 0, coherence: CURSEUR_MAX,
  });
  assert.equal(lire('#f9!#3fq9KJ').fouille, PUISSANCE_DE_FOUILLE_MAX);
  // Trois champs au lieu de quatre : on ne sait pas lequel manque, donc on ne
  // sait pas ce qu'on rejoue. Échec bruyant, jamais deviné.
  const ampute = lire('#p10.20.30!#3fq9KJ');
  assert.equal(ampute.forme, 'invalide');
  assert.ok(ampute.bandeau, 'un refus sans bandeau est un refus muet (§4.3)');
});

test('url — les deux marqueurs valent la LISTE, pas la première voie', () => {
  // Ils disent comment on CLASSE et jusqu'où on FOUILLE : une démonstration
  // unique n'a rien à faire de ces deux questions.
  assert.equal(lire('#p10.20.30.40!#3fq9KJ').forme, 'resultats');
  assert.equal(lire('#f3!#3fq9KJ').forme, 'resultats');
  assert.equal(lire('#p10.20.30.40!#Donald Trump').forme, 'resultats');
  // …mais ils ne contredisent pas un marqueur qui, lui, désigne une voie.
  const anime = lire('#sce!p10.20.30.40!#Donald Trump');
  assert.equal(anime.forme, 'premiere');
  assert.deepEqual(anime.curseurs.simplicite, 10);
  // Un lien sans marqueur rend les positions par défaut, résolues.
  const nu = lire('##3fq9KJ');
  assert.deepEqual(nu.curseurs, CURSEURS_DEFAUT);
  assert.equal(nu.fouille, PUISSANCE_DE_FOUILLE_DEFAUT);
  assert.equal(nu.curseursEcrits, false);
  assert.equal(nu.fouilleEcrite, false);
});

test('url — un programme qui commence par `p` ou `f` reste un programme', () => {
  // C'est le `!` qui sépare, et le marqueur ne se lit qu'en TÊTE : la même
  // règle que pour `c111!` face au combinateur `cs`.
  const lu = lire('#fp+tca+ma1+cs+prn#3fq9KJ');
  assert.equal(lu.forme, 'canonique');
  assert.deepEqual(lu.fragments[0].codes, ['fp', 'tca', 'ma1', 'cs', 'prn']);
  assert.equal(lu.curseursEcrits, false);
  assert.equal(lu.fouilleEcrite, false);
});

// ══════════════════════════════════ le moteur, de bout en bout

test('★ moteur — la liste repondérée est partageable et rejouable', () => {
  const curseurs = { simplicite: 0, exhaustivite: 200, quantite: 40, coherence: 150 };
  const r = moteur.enumerer('Millicent', { curseurs, fouille: 2 });

  // 1. Le lien de la LISTE porte les deux réglages.
  const liste = lire(r.urlResultats);
  assert.equal(liste.forme, 'resultats');
  assert.deepEqual(liste.curseurs, normaliserCurseurs(curseurs));
  assert.equal(liste.fouille, 2);

  // 2. Rejouer ce lien rend la même liste.
  const rejoue = moteur.enumerer(liste.saisie, { curseurs: liste.curseurs, fouille: liste.fouille });
  assert.equal(empreinte(rejoue), empreinte(r));

  // 3. Le lien d'une VOIE porte les mêmes réglages, et la rejouer rend le même
  //    score : c'est la promesse de §4.3 — un lien ne renvoie jamais en silence
  //    vers autre chose que ce qu'on a montré.
  const tete = r.approches[0];
  const lu = lire(tete.url, { catalogue });
  assert.equal(lu.forme, 'canonique');
  assert.deepEqual(lu.curseurs, normaliserCurseurs(curseurs));
  const joue = moteur.rejouer(lu);
  assert.equal(joue.ok, true, joue.raison);
  assert.equal(joue.approche.score, tete.score,
    'la voie rejouée doit afficher le score de la liste dont elle vient');
});

test('★ moteur — sans marqueur, une voie se rejoue au barème du site', () => {
  const r = moteur.resoudre('Millicent');
  const tete = r.approches[0];
  const joue = moteur.rejouer(lire(tete.url, { catalogue }));
  assert.equal(joue.ok, true, joue.raison);
  assert.equal(joue.approche.score, tete.score);
});

test('moteur — les réglages sont publiés dans le résultat, y compris sur une saisie vide', () => {
  for (const saisie of ['', 'Millicent']) {
    const r = moteur.enumerer(saisie, { curseurs: { quantite: 200 }, fouille: 3 });
    assert.equal(r.fouille, 3, `« ${saisie} »`);
    assert.equal(r.curseurs.quantite, 200, `« ${saisie} »`);
    assert.equal(r.pourcentages.quantite + r.pourcentages.simplicite
      + r.pourcentages.exhaustivite + r.pourcentages.coherence, 100, `« ${saisie} »`);
    assert.equal(Object.values(r.poids).reduce((a, b) => a + b, 0), 1000, `« ${saisie} »`);
  }
});

test('moteur — `enumerer` est bien la même recherche que `resoudre`', () => {
  // Ce n'est PAS un second pipeline : c'est un nom, et un contrat écrit.
  for (const s of ['hope', 'Millicent']) {
    assert.equal(empreinte(moteur.enumerer(s)), empreinte(moteur.resoudre(s)), s);
    assert.equal(
      empreinte(moteur.enumerer(s, { curseurs: { coherence: 0 } })),
      empreinte(moteur.resoudre(s, { curseurs: { coherence: 0 } })),
      s,
    );
  }
});

test('moteur — le canal postMessage transporte les réglages', () => {
  // Les curseurs sont un objet de nombres, la fouille un nombre : les deux
  // survivent au clonage structuré, à la différence de la cible.
  const canal = creerCanal(moteur);
  const m = canal.traiter({
    type: 'resoudre', generation: 1, saisie: 'Millicent',
    curseurs: { quantite: 0 }, fouille: 1,
  });
  assert.equal(m.type, 'resultat');
  assert.equal(m.fouille, 1);
  assert.equal(m.curseurs.quantite, 0);
  assert.equal(m.pourcentages.quantite, 0);
  assert.ok(m.urlResultats.includes('p100.100.0.100!'), m.urlResultats);
  assert.ok(m.urlResultats.includes('f1!'), m.urlResultats);
  // Un message qui se tait garde le barème et le budget du site.
  const nu = canal.traiter({ type: 'resoudre', generation: 2, saisie: 'Millicent' });
  assert.equal(nu.fouille, 0);
  assert.deepEqual(nu.curseurs, CURSEURS_DEFAUT);
  assert.equal(nu.urlResultats, moteur.resoudre('Millicent').urlResultats);
});

// ══════════════════════════════════ déterminisme (§4.4)

test('★ curseurs — déterminisme : deux appels identiques rendent la même liste', () => {
  const reglages = [
    { curseurs: { simplicite: 0, exhaustivite: 200, quantite: 40, coherence: 150 } },
    { curseurs: { quantite: 0 }, fouille: 1 },
    { curseurs: { coherence: 200 } },
  ];
  for (const s of ['hope-hope-hope.fr', 'Le chat dort sur le tapis rouge']) {
    for (const r of reglages) {
      assert.equal(empreinte(moteur.enumerer(s, r)), empreinte(moteur.enumerer(s, r)),
        `« ${s} » ${JSON.stringify(r)}`);
    }
  }
});
