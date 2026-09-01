import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur, creerCanal } from '../index.js';
import { lire } from '../url.js';
import { encoderTexte } from '../base58.js';
import { validerCatalogue, chercherSix, operateursExplorables, D_MAX, MAX_NODES, BUDGET_MS, N_FRAG_MAX } from '../bfs.js';
// ★ La borne du budget global se LIT là où elle se règle — `src/config.js`, le
//   seul fichier que l'on vient changer sans lire le moteur. La recopier ici,
//   c'était en fabriquer une seconde, et c'est exactement ce qui est arrivé :
//   elle est restée à 1 000 ms pendant que la vraie passait à 5 000.
import { BUDGET_TOTAL_MS } from '../../config.js';
import { construireBassin, statistiquesBassin, DISTANCE_MAX } from '../bassin.js';
import { genererFragments, motifsRepetes, periodicite, tokeniser, zonesSignifiantes, structureUrl } from '../fragments.js';
import {
  ordreTotal, comparerCodes, racineEntiere, critereCouverture, critereConcision, noter, maniere,
  rangConviction, RANG,
} from '../score.js';
import { approcheJoker, normaliserChemin, compterMoisson, sixDuChemin, SERIE } from '../assemblage.js';
import { BAREME, detailDuCredit } from '../elegance.js';
import { estDecret, titreApproche } from '../titres.js';
import { catalogue, source, horlogeFactice, demarrerCharge, arreterCharge } from './_catalogue.js';
import { fr } from '../../i18n/fr.js';
import { en } from '../../i18n/en.js';

test(`catalogue de test employé : ${source}`, () => {
  assert.deepEqual(validerCatalogue(catalogue), [], 'le catalogue doit respecter CONTRACTS.md §2.2');
});

test('constantes conformes à CONTRACTS.md §5', () => {
  // ★ QUINZE depuis l'arbitrage de l'auteur — « vu que ça n'a pas l'air de
  //   coincer côté timing, on va pouvoir passer la profondeur max à 15 au lieu
  //   de 6 ». Voir `bfs.js › D_MAX` : la profondeur ne coûte presque rien,
  //   c'est le FAISCEAU et le budget de travail qui tranchent. Mesuré au
  //   relèvement : le corpus des douze saisies passe de 13,8 s à 16,2 s, soit
  //   +17 % pour deux fois et demie la profondeur.
  assert.equal(D_MAX, 15);
  assert.equal(MAX_NODES, 20000);
  assert.equal(BUDGET_MS, 250);
  assert.equal(N_FRAG_MAX, 64);
  assert.equal(DISTANCE_MAX, 2, '« + 2 niveaux gratuits par le bassin »');
});

test('bassin — précalculé, aucune valeur au-delà de la distance 2', () => {
  const bassin = construireBassin(catalogue);
  const st = statistiquesBassin(bassin);
  assert.equal(bassin.get(6).dist, 0);
  assert.ok(st.distanceMax <= 2, `distance max ${st.distanceMax}`);
  assert.ok(st.couverts > 300, `${st.couverts} entiers couverts`);
  // Test O(1) : le bassin est bien une table, pas une recherche.
  assert.ok(bassin instanceof Map);
});

test('bassin — déterministe : deux constructions donnent la même table', () => {
  const a = construireBassin(catalogue);
  const b = construireBassin(catalogue);
  assert.equal(a.size, b.size);
  for (const [n, e] of a) {
    assert.deepEqual(e.codes, b.get(n).codes, `entrée ${n}`);
  }
});

test('fragments — tokenisation URL-aware, séparateurs conservés', () => {
  const j = tokeniser('https://hope-hope-hope.fr/');
  const seps = j.filter((x) => x.genre === 'S').map((x) => x.texte);
  assert.deepEqual(j.filter((x) => x.genre === 'W').map((x) => x.texte), ['https', 'hope', 'hope', 'hope', 'fr']);
  assert.ok(seps.includes('-'), 'le tiret du 6 ne doit jamais être jeté');
  assert.ok(seps.includes('//'));
  // Offsets exacts, indispensables au critère de couverture et au surlignage.
  for (const t of j) assert.equal('https://hope-hope-hope.fr/'.slice(t.offset, t.offset + t.longueur), t.texte);
});

test('fragments — motifs répétés et périodicité', () => {
  const rep = motifsRepetes(tokeniser('https://hope-hope-hope.fr/'));
  assert.equal(rep.length, 1);
  assert.equal(rep[0].motif, 'hope');
  assert.equal(rep[0].occurrences.length, 3);

  const mots = tokeniser('ab-ab-ab').filter((x) => x.genre === 'W');
  const p = periodicite(mots);
  assert.deepEqual(p, { periode: 1, repetitions: 3, unite: ['ab'] });

  const mots2 = tokeniser('a-b-a-b-a-b').filter((x) => x.genre === 'W');
  assert.equal(periodicite(mots2).periode, 2, 'capte les répétitions de GROUPES');
  assert.equal(periodicite(tokeniser('le chat dort').filter((x) => x.genre === 'W')), null);
});

test('fragments — zones signifiantes : la boilerplate gratuite est exclue', () => {
  const z = zonesSignifiantes('https://www.example.com/');
  const s = 'https://www.example.com/';
  assert.equal(z.masque[0], 0, 'le schéma est gratuit');
  assert.equal(z.masque[8], 0, 'le www. est gratuit');
  assert.equal(z.masque[s.length - 1], 0, 'le / final est gratuit');
  assert.equal(z.masque[12], 1, 'example est signifiant');
  assert.equal(z.total, s.length - 8 - 4 - 1);
});

test('fragments — génération plafonnée à N_FRAG_MAX', () => {
  const longue = Array.from({ length: 80 }, (_, i) => `mot${i}`).join(' ');
  const f = genererFragments(longue);
  assert.ok(f.length <= N_FRAG_MAX, `${f.length} fragments`);
  assert.ok(f.some((x) => x.entier), 'la saisie entière est toujours candidate');
});

test('structureUrl — offsets exacts, sans ré-encodage', () => {
  const s = 'https://www.example.com/path/to/page?a=1';
  const st = structureUrl(s);
  assert.equal(st.schema.texte, 'https');
  assert.equal(s.slice(st.autorite.offset, st.autorite.offset + st.autorite.longueur), 'www.example.com');
  assert.deepEqual(st.labels.map((l) => l.texte), ['www', 'example', 'com']);
  assert.deepEqual(st.segments.map((l) => l.texte), ['path', 'to', 'page']);
  assert.equal(structureUrl('le chat dort'), null);
});

// ══════════════════════════════════ déterminisme (CONTRACTS.md §4.4)

const SAISIES_DETERMINISME = [
  'https://hope-hope-hope.fr/',
  'hope',
  'macron',
  'Wikipedia',
  'https://www.example.com/path/to/page',
  'Le chat dort sur le tapis rouge',
  'jean-michel',
  'Éléonore à Nîmes',
];

test('déterminisme — deux exécutions donnent le MÊME classement', () => {
  // ★ LE FILET TEMPOREL EST DÉBRANCHÉ ICI, et c'est le sujet du test.
  //
  // Ce test comparait deux classements en laissant branché l'arrêt d'urgence à
  // l'horloge (`BUDGET_MS_FILET`, `BUDGET_TOTAL_MS`). Sur une machine chargée,
  // le filet mord sur l'une des deux exécutions et pas sur l'autre, et le test
  // échoue — mesuré à environ une fois sur trois, et déjà en v1.0.0. Il ne
  // mesurait donc pas ce qu'il annonce : le déterminisme du CLASSEMENT.
  //
  // Débranché, il ne reste que des bornes qui ne dépendent que de la saisie
  // (`BUDGET_TRAVAIL`, `MAX_NODES`, `D_MAX`) : deux exécutions doivent alors
  // coïncider absolument, charge ou pas. Le comportement du filet lui-même est
  // vérifié séparément — « une horloge hostile écourte, mais ne ment jamais »,
  // et « le filet temporel se débranche par une option explicite ».
  const a = creerMoteur(catalogue, { filetTemporel: false });
  const b = creerMoteur(catalogue, { filetTemporel: false }); // instance neuve : ni cache ni bassin partagés
  for (const s of SAISIES_DETERMINISME) {
    const ra = a.resoudre(s);
    const rb = b.resoudre(s);
    assert.equal(ra.approches.length, rb.approches.length, s);
    for (let i = 0; i < ra.approches.length; i++) {
      assert.equal(ra.approches[i].url, rb.approches[i].url, `${s} — rang ${i + 1}`);
      assert.equal(ra.approches[i].score, rb.approches[i].score, `${s} — score du rang ${i + 1}`);
    }
    assert.deepEqual(ra.fragments.map((f) => f.url), rb.fragments.map((f) => f.url), s);
  }
});

/** Empreinte complète d'un classement : rangs, scores, URL, liste de fragments. */
function empreinte(r) {
  return JSON.stringify({
    a: r.approches.map((x) => [x.rang, x.score, x.url]),
    f: r.fragments.map((x) => x.url),
  });
}

test('déterminisme — l’horloge ne peut pas changer le classement', () => {
  // Le défaut corrigé : la phase de recherche était bornée par `performance.now()`,
  // donc le nombre de fragments explorés dépendait de la CHARGE de la machine.
  // Quatre horloges qui n’ont rien à voir entre elles doivent rendre exactement
  // le même classement — et n’en marquer aucun comme écourté par le temps.
  const horloges = {
    'figée à zéro (machine infiniment rapide)': () => 0,
    'réelle': () => performance.now(),
    'réelle, mille fois accélérée': () => performance.now() / 1000,
  };
  // Un moteur par horloge, réutilisé sur toutes les saisies : le cache mémoïsé
  // se remplit donc dans le même ordre, et s'il devait influer sur le
  // classement, cette comparaison le verrait.
  const empreintes = new Map();
  for (const [nom, maintenant] of Object.entries(horloges)) {
    const m = creerMoteur(catalogue, { maintenant });
    for (const s of SAISIES_DETERMINISME) {
      const r = m.resoudre(s);
      assert.equal(r.tronqueTemps, false,
        `${s} — le filet temporel ne doit jamais mordre au repos (horloge ${nom})`);
      const cle = `${s} @ ${nom}`;
      empreintes.set(cle, empreinte(r));
    }
  }
  for (const s of SAISIES_DETERMINISME) {
    const vues = Object.keys(horloges).map((nom) => empreintes.get(`${s} @ ${nom}`));
    assert.equal(new Set(vues).size, 1, `${s} : les horloges rendent ${new Set(vues).size} classements`);
  }
});

test('déterminisme — une horloge hostile écourte, mais ne ment jamais', () => {
  // Sept millisecondes à chaque lecture d’horloge : une machine des milliers de
  // fois plus lente que celle de l’étalonnage. Là, le filet DOIT mordre — c’est
  // sa raison d’être. Ce qu’il n’a pas le droit de faire, c’est de rendre une
  // liste différente sans le dire (CONTRACTS §4.3).
  const complet = creerMoteur(catalogue).resoudre('Le chat dort sur le tapis rouge');
  const ecourte = creerMoteur(catalogue, { maintenant: horlogeFactice(7) })
    .resoudre('Le chat dort sur le tapis rouge');

  assert.equal(complet.tronqueTemps, false, 'au repos, aucune troncature temporelle');
  assert.equal(complet.avertissement, undefined, 'et donc aucun bandeau');
  assert.equal(ecourte.tronqueTemps, true, 'le filet doit mordre sur une machine absurde');
  assert.equal(ecourte.tronque, true);
  assert.ok(ecourte.avertissement, 'une troncature temporelle porte TOUJOURS un avertissement');
  assert.ok(ecourte.avertissement.fr && ecourte.avertissement.en,
    'l’avertissement traverse jusqu’à l’interface, dans les deux langues');
  assert.ok(ecourte.approches.length >= 1, 'jamais bredouille, même écourté (§5.3)');
  assert.ok(ecourte.fragments.length <= complet.fragments.length,
    'écourter ne peut qu’explorer moins');
});

test('déterminisme — six exécutions SOUS CHARGE donnent le MÊME classement', async () => {
  // Un test de déterminisme qui ne passe que sur une machine inoccupée ne prouve
  // rien : c’est précisément sous charge que l’ancienne borne temporelle rendait
  // deux classements distincts (mesuré : 3 classements sur 6 exécutions).
  // On fabrique donc la charge, avec des threads du cœur de Node, sans dépendance.
  //
  // ★ Le filet débranché, l’exigence devient ABSOLUE : les six exécutions
  //   doivent coïncider, sans qu’aucune ait le droit de différer en s’en
  //   excusant. C’est ce que le test tolérait auparavant (« une exécution
  //   écourtée A LE DROIT de différer »), et cette tolérance était le trou par
  //   lequel l’entropie passait. Ce que le filet fait quand il mord se vérifie
  //   ailleurs, sur une horloge factice, donc sans dépendre de la charge.
  const parasites = demarrerCharge();
  try {
    // La saisie témoin du rapport de défaut : six exécutions sous charge en
    // rendaient trois classements distincts.
    for (const s of ['Le chat dort sur le tapis rouge']) {
      const runs = [];
      for (let i = 0; i < 6; i++) {
        runs.push(creerMoteur(catalogue, { filetTemporel: false }).resoudre(s));
      }
      for (const r of runs) {
        assert.equal(r.tronqueTemps, false, `${s} : le filet débranché ne peut pas mordre`);
      }
      const empreintes = new Set(runs.map(empreinte));
      assert.equal(empreintes.size, 1,
        `${s} : ${empreintes.size} classements distincts en six exécutions sous charge`);
    }
  } finally {
    await arreterCharge(parasites);
  }
});

test('déterminisme — le filet temporel se débranche par une option EXPLICITE', () => {
  // Le filet est la dernière source d’entropie du moteur. Il reste branché par
  // défaut — un navigateur peut être arbitrairement lent, et un onglet qui ne
  // rend jamais la main est pire qu’un classement écourté qui le dit. Mais il
  // DOIT pouvoir se retirer, sans quoi aucune mesure de barème n’est possible :
  // on comparerait deux réglages sur une base qui bouge.
  //
  // L’horloge hostile (sept millisecondes par lecture) fait mordre le filet à
  // coup sûr. Débranché, elle ne doit plus rien pouvoir changer — ni au
  // classement, ni au drapeau de troncature.
  const hostile = () => horlogeFactice(7);
  for (const s of ['Le chat dort sur le tapis rouge', 'https://hope-hope-hope.fr/']) {
    const reference = creerMoteur(catalogue, { filetTemporel: false }).resoudre(s);
    const sousHorlogeHostile = creerMoteur(catalogue, {
      filetTemporel: false, maintenant: hostile(),
    }).resoudre(s);
    assert.equal(empreinte(sousHorlogeHostile), empreinte(reference),
      `${s} : filet débranché, l’horloge ne doit plus rien pouvoir changer`);
    assert.equal(sousHorlogeHostile.tronqueTemps, false);

    // …et le filet branché, la même horloge mord : le débranchement est bien
    // ce qui fait la différence, pas un hasard de la saisie.
    const avecFilet = creerMoteur(catalogue, { maintenant: hostile() }).resoudre(s);
    assert.equal(avecFilet.tronqueTemps, true,
      `${s} : le filet branché doit mordre sous une horloge hostile`);
  }
});

test('déterminisme — le cache mémoïsé ne change pas le résultat', () => {
  const m = creerMoteur(catalogue);
  const premier = m.resoudre('https://hope-hope-hope.fr/').approches.map((a) => a.url);
  m.resoudre('hope'); // remplit le cache autrement
  const second = m.resoudre('https://hope-hope-hope.fr/').approches.map((a) => a.url);
  assert.deepEqual(second, premier);
});

test('déterminisme — l’historique de saisie ne peut pas changer le classement', () => {
  // Le cache est la seconde entropie possible, après l’horloge : un fragment
  // déjà connu ne coûtait RIEN au budget de travail, donc un moteur qui avait
  // déjà servi explorait PLUS de fragments qu’un moteur neuf — et rendait un
  // autre classement, sans le dire. Deux visiteurs, deux listes ; le même
  // visiteur qui retape sa phrase, une troisième.
  //
  // Les saisies choisies ici sont celles qui SATURENT la borne de travail :
  // sur une saisie qui tient dans le budget, le défaut est invisible, et un
  // test qui ne prend que celles-là ne prouve rien.
  const SATURANTES = [
    'https://fr.wikipedia.org/wiki/Nombre_de_la_b%C3%AAte',
    'Le chat dort sur le tapis rouge pendant que la pluie tombe sur les toits de la '
      + 'ville endormie et que personne ne songe encore à compter les lettres de cette '
      + 'phrase interminable qui sature le plafond de fragments du moteur.',
  ];
  const prealables = ['chat', 'dort', 'tapis', 'wikipedia', 'nombre', 'hope', 'moteur', 'phrase'];

  for (const s of SATURANTES) {
    const vierge = creerMoteur(catalogue);
    const attendu = empreinte(vierge.resoudre(s));
    assert.equal(empreinte(vierge.resoudre(s)), attendu,
      `${s} : le même moteur ne rend pas deux fois la même liste`);

    const prechauffe = creerMoteur(catalogue);
    for (const p of prealables) prechauffe.resoudre(p); // l’historique du visiteur
    assert.equal(empreinte(prechauffe.resoudre(s)), attendu,
      `${s} : un moteur préchauffé rend un autre classement qu’un moteur neuf`);
  }
});

test('déterminisme — au moins une saisie du corpus sature la borne de travail', () => {
  // Garde-fou de l’étalonnage : si plus AUCUNE saisie ne touche la borne
  // déterministe, le test ci-dessus ne teste plus rien (il passerait aussi avec
  // le défaut). Si celui-ci casse, c’est que les budgets ont été relevés — il
  // faut alors trouver une saisie qui sature à nouveau, pas supprimer le test.
  const dure = creerMoteur(catalogue)
    .resoudre('https://fr.wikipedia.org/wiki/Nombre_de_la_b%C3%AAte');
  assert.equal(dure.tronque, true, 'la borne de travail ne mord plus sur la saisie témoin');
  assert.equal(dure.tronqueTemps, false, 'et elle doit mordre AVANT le filet temporel');
});

test('déterminisme — ordre total : aucun ex æquo ne subsiste', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_DETERMINISME) {
    const cles = m.resoudre(s).approches.map((a) => `${a.score}|${a.L}|${a.codes}`);
    assert.equal(new Set(cles).size, cles.length, `${s} : deux approches indiscernables`);
  }
});

test('déterminisme — ordreTotal est un ordre total strict', () => {
  const a = { score: 900, L: 9, codes: 'ma1+cs' };
  const b = { score: 900, L: 9, codes: 'mz26+cs' };
  const c = { score: 900, L: 8, codes: 'mms+cs' };
  const d = { score: 950, L: 30, codes: 'zz' };
  assert.ok(ordreTotal(a, b) < 0, 'départage par les codes');
  assert.ok(ordreTotal(c, a) < 0, 'départage par la longueur avant les codes');
  assert.ok(ordreTotal(d, a) < 0, 'le score prime');
  assert.equal(ordreTotal(a, a), 0);
});

test('déterminisme — score entier, aucune virgule flottante', () => {
  const m = creerMoteur(catalogue);
  for (const a of m.resoudre('https://hope-hope-hope.fr/').approches) {
    assert.ok(Number.isInteger(a.score), `score ${a.score}`);
    for (const [k, v] of Object.entries(a.criteres)) assert.ok(Number.isInteger(v), `critère ${k} = ${v}`);
  }
});

test('déterminisme — comparaisons de chaînes en unités de code, sans Intl', () => {
  assert.ok(comparerCodes(['ma1'], ['mz26']) < 0);
  assert.ok(comparerCodes(['ma1'], ['ma1', 'cs']) < 0);
  assert.equal(comparerCodes(['fp', 'ma1'], ['fp', 'ma1']), 0);
  // « Z » < « a » en unités de code : c'est le comportement voulu, pas localeCompare.
  assert.ok(comparerCodes(['Z'], ['a']) < 0);
});

test('arithmétique entière — racine entière et critères', () => {
  assert.equal(racineEntiere(0), 0);
  assert.equal(racineEntiere(1000000), 1000);
  assert.equal(racineEntiere(999999), 999);
  assert.equal(critereCouverture(10, 10), 1000, 'U_brut = 1 → U = 1');
  assert.equal(critereCouverture(0, 10), 0);
  assert.ok(Math.abs(critereCouverture(5, 10) - 353) <= 2, 'U_brut = 0,5 → ≈ 0,354');
  // ★ `L_IDEAL` est passé de 9 à 2 : la décroissance de la concision existait,
  //   mais ne s'appliquait à AUCUNE voie du corpus — voir `score.js › REGLAGES`.
  //   Ce qu'on gèle ici est la forme de la courbe, pas la valeur d'un point :
  //   plein tarif jusqu'au seuil, puis 0,88 par étape, donc un coût marginal
  //   qui décroît — « passer de 2 à 3 étapes doit peser plus lourd que passer
  //   de 5 à 6 » (l'auteur).
  assert.equal(critereConcision(2), 1000, 'L* = 2 : au seuil, rien à payer');
  assert.equal(critereConcision(5), 681, '0,88³ ≈ 0,681');
  assert.ok(critereConcision(2) - critereConcision(3)
    > critereConcision(5) - critereConcision(6),
  'la marche 2→3 doit coûter plus cher que la marche 5→6');
});

// ══════════════════════════════════ garantie « jamais bredouille » (§5)

/** Les 14 échecs mesurés par le prototype `coverage.mjs` (research §5.1). */
const DEGENEREES = ['a', 'b', 'z', '1', '42', '666', 'q', '5g', 'w', 'ww', '2026', '01/01/2000', '!!!', '   '];

test('jamais bredouille — les 14 saisies dégénérées mesurées produisent toutes un 666', () => {
  const m = creerMoteur(catalogue);
  const rapport = [];
  for (const s of DEGENEREES) {
    const r = m.resoudre(s);
    assert.ok(r.approches.length >= 1, `« ${s} » ne doit jamais rester bredouille`);
    const a = r.approches[0];
    assert.ok(a.url && a.url.includes('#'), `« ${s} » doit produire une URL partageable`);
    rapport.push(`${JSON.stringify(s).padEnd(14)} → ${String(a.approches ?? a.score).padStart(5)} [${a.mode}] ${a.codes}`);
  }
  console.log('    ' + rapport.join('\n    '));
});

test('jamais bredouille — le terminateur français conclut depuis n’importe quelle saisie', () => {
  // Mesure : avec le catalogue réel (88 opérateurs), AUCUNE des 14 saisies
  // dégénérées de research §5.1 n'a besoin du joker — le taux d'échec de 19,4 %
  // était celui du catalogue jouet de 44 opérateurs. Le joker reste néanmoins la
  // garantie de dernier recours, et il doit fonctionner : on l'appelle donc
  // directement, sans attendre que la recherche échoue.
  const ctx = { saisie: '', catalogue, jetons: [], signifiants: null };
  for (const s of [...DEGENEREES, 'a', 'zzz', 'Éléonore']) {
    const a = approcheJoker(s, { ...ctx, saisie: s });
    assert.ok(a, `« ${s} » : le joker doit toujours aboutir`);
    assert.equal(a.parts.length, 3, 'appliqué trois fois pour rester homogène (§5.4)');
    for (const p of a.parts) {
      const fin = p.chemin.etats[p.chemin.etats.length - 1];
      assert.equal(fin.valeur, 6, `« ${s} » : la chaîne doit atterrir sur 6`);
      // Borne prouvée : 4 étapes au maximum pour n'importe quelle saisie non vide.
      assert.ok(p.chemin.ops.length <= 5, `« ${s} » : ${p.chemin.ops.length} étapes`);
    }
  }
});

test('jamais bredouille — le joker plafonne bien sous une approche honnête', () => {
  const s = 'a';
  const a = approcheJoker(s, { saisie: s, catalogue });
  noter(a, { saisie: s, signifiants: zonesSignifiantes(s) });
  assert.ok(a.score <= 4500, `un joker ne peut pas dépasser ≈45/100 (mesuré ${a.score / 100})`);
  // Dès qu'une approche honnête EXISTE, elle bat le joker. Le témoin ne peut plus
  // être « a » : voir le test suivant.
  const honnete = creerMoteur(catalogue).resoudre('hope').approches[0];
  assert.ok(honnete.score > a.score, 'une approche honnête doit toujours battre le joker');
});

/**
 * ★ Ce qui remplace le triplement, saisie courte comprise.
 *
 * Le décret appliquait le même calcul trois fois et n'en démontrait qu'un. Ses
 * deux héritiers gagnent leurs trois 6 :
 *  · le GROUPEMENT — un seul calcul rend un vecteur qui porte déjà trois 6 ;
 *  · la CONVERGENCE — la même chaîne lue de trois manières différentes.
 *
 * Un caractère unique reste démontrable : « a » n'a rien à partitionner ni à
 * répéter, mais il se lit de trois manières — sept segments, alphabet à rebours,
 * clavier téléphonique — qui tombent toutes trois sur 6. Le joker n'est donc
 * plus le seul recours des saisies courtes ; il redevient ce que §0.4 en dit,
 * le terminateur des cas où il n'y a vraiment rien à lire.
 */
test('★ suppression du décret — les saisies courtes se démontrent sans rien décréter', () => {
  const m = creerMoteur(catalogue);
  const rapport = [];
  for (const s of ['a', 'z', 'w', 'hope', 'macron', 'Millicent', '666', 'le chat dort']) {
    const r = m.resoudre(s);
    assert.ok(r.approches.length >= 1, `« ${s} » : aucune approche`);
    const a = r.approches[0];
    assert.notEqual(a.mode, 'JOKER', `« ${s} » : le joker ne devrait pas être nécessaire`);
    assert.ok(!estDecret(a), `« ${s} » : la tête de liste décrète encore — ${a.codes}`);
    assert.ok(['MOISSON', 'GROUPEMENT', 'CONVERGENCE', 'PARTITION', 'RESONANCE', 'DIRECT', 'LIBRE', 'SIX_OFFERT']
      .includes(a.mode), `« ${s} » : mode inattendu ${a.mode}`);
    rapport.push(`${JSON.stringify(s).padEnd(14)} ${String(r.approches.length).padStart(2)} approche(s) `
      + `→ ${String(a.score).padStart(5)} [${a.mode}] ${a.codes}`);
  }
  console.log('    ' + rapport.join('\n    '));
});

/**
 * Là où il n'y a vraiment rien à lire — pas une lettre —, le joker reste le seul
 * recours, et c'est bien ce que CONTRACTS §0.4 prévoit. On le CONSTATE plutôt que
 * de le déguiser : ces trois saisies sont les seules du corpus dégénéré qui en
 * dépendent encore.
 */
/**
 * ★ « 42 » A QUITTÉ CETTE LISTE, et c'est une bonne nouvelle.
 *
 * Il n'y trouvait sa place que par pauvreté du catalogue : deux chiffres, aucun
 * opérateur pour les lire. La table du leetspeak porte maintenant neuf
 * correspondances au lieu de six, et le dictionnaire six mille mots au lieu de
 * quarante-neuf — `42` se lit donc `a2`, puis se traduit, puis se compte. Le
 * joker n'y est plus indispensable parce que la méthode existe, pas parce
 * qu'on aurait relâché l'exigence.
 *
 * Ce que ce test garde est intact : une saisie où il n'y a RIEN à lire — de la
 * ponctuation, des espaces — n'a d'autre issue que le joker, et le moteur ne
 * doit jamais lui inventer une méthode.
 */
test('★ le joker reste indispensable aux saisies sans rien à lire', () => {
  const m = creerMoteur(catalogue);
  for (const s of ['!!!', '   ']) {
    const r = m.resoudre(s);
    assert.equal(r.approches.length, 1, `« ${s} » : ${r.approches.length} approches`);
    assert.equal(r.approches[0].mode, 'JOKER', `« ${s} » : ${r.approches[0].mode}`);
  }
});

/**
 * La CONVERGENCE exige trois manières RÉELLEMENT différentes — pas trois codes
 * différents. « L'affichage à sept segments », « les traits fusionnés » et « les
 * traits en capitale » comptent tous les trois ce qu'on dessine : ce serait une
 * seule manière montrée trois fois, et donc un décret déguisé.
 */
test('★ convergence — les trois voies sont de trois manières distinctes', () => {
  const m = creerMoteur(catalogue);
  let vues = 0;
  for (const s of ['a', 'hope', 'macron', 'ww', '5g', 'https://www.google.com']) {
    for (const a of m.resoudre(s).approches) {
      if (a.mode !== 'CONVERGENCE') continue;
      vues++;
      const manieres = a.parts.map((p) => maniere(p.chemin));
      assert.equal(new Set(manieres).size, 3,
        `« ${s} » : ${manieres.join(', ')} — deux voies partagent une manière`);
      // Et chacun des trois 6 est bien CALCULÉ, jamais décrété.
      for (const p of a.parts) {
        const fin = p.chemin.etats[p.chemin.etats.length - 1];
        assert.equal(fin.type, 'NUM');
        assert.equal(fin.valeur, 6, `« ${s} » : une voie n’atterrit pas sur 6`);
      }
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} convergences observées — le mode est-il vivant ?`);
});

test('jamais bredouille — s’il paraît, le joker est en bas de liste (§0.4)', () => {
  const m = creerMoteur(catalogue);
  for (const s of ['https://hope-hope-hope.fr/', 'a', '42']) {
    const r = m.resoudre(s);
    for (const a of r.approches.filter((x) => x.joker)) {
      assert.equal(a.rang, r.approches.length, 'affiché, assumé, et dernier');
      assert.ok(a.score <= 4500);
    }
  }
});

test('saisie vide et plafond de 500 caractères', () => {
  const m = creerMoteur(catalogue);
  assert.equal(m.resoudre('').vide, true, 'la saisie vide relève de l’UI, pas du moteur');
  const trop = m.resoudre('x'.repeat(501));
  assert.equal(trop.approches.length, 0);
  assert.ok(trop.avertissement);
});

test('réponses dédiées écrites à la main (§0.4)', () => {
  const m = creerMoteur(catalogue);
  for (const s of ['666', '6', 'diable', 'satan', 'SATAN', ' Diable ']) {
    const r = m.resoudre(s);
    assert.ok(r.dedie, `« ${s} » doit avoir une réponse dédiée`);
    assert.ok(r.dedie.titre && r.dedie.texte);
  }
  assert.equal(m.resoudre('hope').dedie, null);
});

// ══════════════════════════════════ budget temps (§2.6)

test('budget — chaque fragment reste sous BUDGET_MS', () => {
  const bassin = construireBassin(catalogue);
  const ctx = {
    catalogue, operateurs: operateursExplorables(catalogue), bassin, cache: new Map(),
    maintenant: () => performance.now(),
  };
  const durs = [
    'https://www.example.com/path/to/page/and/more/segments/here',
    'anticonstitutionnellement',
    'x'.repeat(200),
    'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor',
  ];
  for (const s of durs) {
    const t0 = performance.now();
    chercherSix(s, ctx);
    const ms = performance.now() - t0;
    // Le budget est contrôlé à chaque état étendu : le dépassement possible est
    // le coût d'UNE extension, pas d'un niveau entier de profondeur.
    assert.ok(ms < BUDGET_MS + 50, `« ${s.slice(0, 30)} » : ${ms.toFixed(1)} ms`);
    console.log(`    ${ms.toFixed(1).padStart(7)} ms  ${JSON.stringify(s.slice(0, 45))}`);
  }
});

/**
 * ★ **CINQ SECONDES, ET LA JAUGE EST LA CONDITION** — pas une seconde.
 *
 * « S'il y a une barre de progression pour la recherche, avec un avancement
 * lisible, alors on peut dépasser le budget d'une seconde pour aller disons
 * jusqu'à cinq secondes max » (l'auteur). La condition est remplie depuis que la
 * recherche rend la main par tranches et annonce son avancement fragment par
 * fragment (`recherche/tranches.js`, `app/jauge.js`), et `config.js › `
 * `BUDGET_TOTAL_MS` a été relevé en conséquence.
 *
 * ⚠️ CE TEST, LUI, ÉTAIT RESTÉ À LA SECONDE — écrite en dur, `ms < 1000`, à
 *   côté d'une constante qui disait 5000. Il rougissait donc sur
 *   `https://hope-hope-hope.fr/` (≈ 1 960 ms CPU) en annonçant un dépassement
 *   qui n'en était pas un, et je l'ai compté plusieurs jours durant parmi les
 *   arbitrages en attente de l'auteur. Il ne recopie plus la borne : il la LIT.
 *
 * Le titre garde le mot « budget » et perd « la seconde », qui était le seul
 * endroit du dépôt où le chiffre survivait encore.
 */
test('budget — le pipeline complet tient dans le budget global', () => {
  const m = creerMoteur(catalogue);
  const cas = [
    'https://hope-hope-hope.fr/',
    'https://www.example.com/path/to/page',
    'Le chat dort sur le tapis rouge du salon',
    'x'.repeat(400),
    // Le pire cas mesuré du pipeline : un paragraphe qui sature N_FRAG_MAX.
    // `BUDGET_MS` borne UN fragment ; seul le budget global (BUDGET_TOTAL_MS)
    // borne la somme des soixante.
    'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
    + 'incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud '
    + 'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute',
  ];
  for (const s of cas) {
    // On mesure le temps CPU, pas le temps mural. La seconde du contrat
    // (research §2.6) est une exigence sur le TRAVAIL du moteur ; le temps
    // mural, lui, dépend de la charge de la machine — et `bun run test` lance
    // les cinq suites en parallèle, donc ce test créait lui-même la contention
    // qui le faisait échouer. Un test qui ne passe que sur une machine au repos
    // ne prouve rien et finit par être ignoré.
    const u0 = process.cpuUsage();
    const t0 = performance.now();
    const r = m.resoudre(s);
    const mural = performance.now() - t0;
    const u = process.cpuUsage(u0);
    const ms = (u.user + u.system) / 1000;
    assert.ok(ms < BUDGET_TOTAL_MS,
      `« ${s.slice(0, 30)} » : ${ms.toFixed(0)} ms CPU (${mural.toFixed(0)} ms mural), `
      + `budget ${BUDGET_TOTAL_MS} ms`);
    console.log(`    ${ms.toFixed(1).padStart(7)} ms CPU  ${String(r.approches.length).padStart(2)} approches  ${JSON.stringify(s.slice(0, 40))}`);
  }
});

test('budget — le budget GLOBAL borne la somme des fragments, sans jamais rendre bredouille', () => {
  const phrase = 'Le chat dort sur le tapis rouge du salon';
  const complet = creerMoteur(catalogue).resoudre(phrase);

  // Budget global épuisé dès le premier fragment : le repli §2.6-5 doit
  // restreindre le JEU DE FRAGMENTS, pas faire échouer la recherche.
  const serre = creerMoteur(catalogue, { budgetTotalMs: 0 }).resoudre(phrase);
  assert.ok(serre.approches.length >= 1, 'jamais bredouille, même sans budget');
  assert.ok(serre.fragments.length <= complet.fragments.length,
    'le budget global ne peut qu’explorer moins, jamais plus');
  // …mais les FRAGMENTS_GARANTIS premiers sont cherchés quoi qu'il arrive :
  // en dessous, l'assemblage n'aurait plus de quoi former trois 6.
  assert.ok(serre.fragments.length >= 1);

  // Budget large : identique au pipeline sans garde-fou.
  const large = creerMoteur(catalogue, { budgetTotalMs: 1e9 }).resoudre(phrase);
  assert.deepEqual(complet.approches.map((a) => a.url), large.approches.map((a) => a.url));
});

test('budget — l’horloge est injectable : un budget nul tronque sans échouer', () => {
  const bassin = construireBassin(catalogue);
  const ctx = {
    catalogue, operateurs: operateursExplorables(catalogue), bassin, cache: new Map(),
    maintenant: horlogeFactice(1000), budgetMs: 1,
  };
  const r = chercherSix('https://hope-hope-hope.fr/', ctx);
  assert.ok(Array.isArray(r), 'jamais d’échec dur, seulement moins de résultats');
});

test('garde-fou — MAX_NODES borne l’exploration', () => {
  const bassin = construireBassin(catalogue);
  const ctx = {
    catalogue, operateurs: operateursExplorables(catalogue), bassin, cache: new Map(),
    maintenant: () => performance.now(), maxNodes: 5,
  };
  const r = chercherSix('https://hope-hope-hope.fr/', ctx);
  assert.ok(Array.isArray(r));
});

// ══════════════════════════════════ sorties

test('sortie — ≤ 12 approches diversifiées, ≤ 24 fragments', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_DETERMINISME) {
    const r = m.resoudre(s);
    assert.ok(r.approches.length <= 12, `${s} : ${r.approches.length} approches`);
    assert.ok(r.fragments.length <= 24, `${s} : ${r.fragments.length} fragments`);
  }
});

test('diversité N4 — au plus 2 approches par mappeur principal', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  const compte = new Map();
  for (const a of r.approches) {
    if (a.joker) continue;
    const op = a.parts[0].chemin.ops.find((o) => o.famille === 'mappeur' || o.famille === 'mesure');
    if (!op) continue;
    compte.set(op.id, (compte.get(op.id) || 0) + 1);
  }
  for (const [id, n] of compte) assert.ok(n <= 2, `${id} apparaît ${n} fois`);
});

test('anti-doublons — aucune approche ne montre deux fois le même spectacle', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  const traces = r.approches.map((a) => a.parts.map((p) => p.chemin.etats.map((e) => String(e.valeur)).join('>')).join('|'));
  assert.equal(new Set(traces).size, traces.length);
});

test('résonance — `hope-hope-hope` produit bien des approches en ×3', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  const reso = r.approches.filter((a) => a.mode === 'RESONANCE');
  assert.ok(reso.length >= 1, 'le cas d’école du README doit être détecté');
  for (const a of reso) {
    assert.match(a.url, /^#sce!×3:/, 'l’URL doit employer l’abréviation de résonance');
    assert.equal(new Set(a.parts.map((p) => p.fragment.texte)).size, 1, 'les 3 fragments sont le même texte');
  }
});

// ══════════════════════════════════ rejeu d'URL

test('rejeu — une URL canonique est rejouée SANS relancer la recherche', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  let groupees = 0;
  for (const a of r.approches) {
    const lecture = lire(a.url, { catalogue });
    assert.equal(lecture.forme, 'canonique', a.url);
    const rejoue = m.rejouer(lecture);
    assert.ok(rejoue.ok, `${a.url} : ${rejoue.raison}`);
    assert.equal(rejoue.approche.score, a.score, `score identique pour ${a.url}`);
    // ★ Le lien REJOUÉ se réécrit à l'identique. C'est ce qui ferme la boucle
    //   des PORTÉES GROUPÉES (`url.js`) : le groupe est déplié à la lecture,
    //   regroupé à l'écriture, et `canoniser()` ne bouge donc rien dans la
    //   barre d'adresse. Sans cette égalité, un lien groupé s'allongerait tout
    //   seul à chaque ouverture.
    assert.equal(rejoue.approche.url, a.url, `URL stable pour ${a.url}`);
    if (/\d\.\d+\+\d/.test(a.url)) groupees++;
  }
  // Cette saisie-là en produit : le cas est réellement traversé, pas supposé.
  assert.ok(groupees >= 1, 'aucune URL groupée dans le lot : le rejeu ne prouve rien ici');
});

test('rejeu — portée hors bornes : refus explicite, jamais une autre démonstration', () => {
  const m = creerMoteur(catalogue);
  const lecture = lire(`#99.3:nl#${encoderTexte('hope')}`);
  const r = m.rejouer(lecture);
  assert.equal(r.ok, false);
  assert.ok(r.bandeau);
});

test('interface postMessage — protocole prêt, exécution inline en v1', () => {
  const m = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(m, (msg) => { envoyes.push(msg); return msg; });
  const rep = canal.traiter({ type: 'resoudre', generation: 7, saisie: 'macron' });
  assert.equal(rep.type, 'resultat');
  assert.equal(rep.generation, 7, 'le compteur de génération annule les recherches obsolètes');
  assert.ok(rep.approches.length >= 1);
  // Structurellement clonable : pas d'objet opérateur, pas de fonction.
  assert.doesNotThrow(() => structuredClone(rep));
  assert.equal(envoyes.length, 1);
  assert.equal(canal.traiter({ type: 'autre' }), null);
});

test('portée — tout fragment généré est redésignable par une portée d’URL', () => {
  const m = creerMoteur(catalogue);
  for (const s of ['https://hope-hope-hope.fr/', 'https://www.example.com/path/to/page?a=1', 'jean-michel', 'Le chat dort']) {
    const jetons = tokeniser(s);
    for (const f of genererFragments(s)) {
      assert.ok(f.tokenDebut >= 0 && f.tokenLong > 0, `${s} : ${JSON.stringify(f.texte)} sans portée`);
      const premier = jetons[f.tokenDebut];
      const dernier = jetons[f.tokenDebut + f.tokenLong - 1];
      assert.ok(premier && dernier, `${s} : portée hors bornes pour ${JSON.stringify(f.texte)}`);
      const relu = s.slice(premier.offset, dernier.offset + dernier.longueur);
      assert.equal(relu, f.texte, `${s} : la portée ${f.tokenDebut}.${f.tokenLong} ne redonne pas le fragment`);
    }
  }
});

test('fragments — les URL de la liste de fragments sont rejouables', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const f of r.fragments) {
    const lecture = lire(f.url, { catalogue });
    assert.equal(lecture.forme, 'canonique', f.url);
    const rejoue = m.rejouer(lecture);
    assert.ok(rejoue.ok, `${f.texte} → ${f.url} : ${rejoue.raison}`);
    const fin = rejoue.approche.parts[0].chemin.etats.at(-1);
    assert.equal(fin.valeur, 6, `${f.texte} doit valoir 6`);
  }
});


// ══════════════════════════════════ ce qu'une liste doit garantir à l'œil nu

const SAISIES_LISTE = [
  'hope-hope-hope.fr',
  'https://www.google.com',
  'Millicent',
  '666',
  'La numérologie est un art taquin',
];

/**
 * ★ Le décret ne figure plus dans une liste — pas même en dernier.
 *
 * L'ancienne version de ce test se contentait de vérifier qu'il ne PASSAIT PAS
 * DEVANT une démonstration honnête ; il était donc toléré en queue, sous un
 * intitulé qui l'avouait. L'auteur a tranché : « ça enlève la vraisemblance à la
 * démarche ». `assembler` ne le fabrique plus (`deduireMode` → `DECRET`, filtré),
 * et la seule exception est le joker, que CONTRACTS §0.4 maintient explicitement.
 */
test('★ classement — aucun décret ne figure dans une liste', () => {
  const m = creerMoteur(catalogue);
  for (const s of [...SAISIES_LISTE, 'hope', 'macron', 'le chat dort', 'jean-michel']) {
    for (const a of m.resoudre(s).approches) {
      if (a.mode === 'JOKER') continue; // affiché et assumé, §0.4
      assert.ok(!estDecret(a),
        `« ${s} » : rang ${a.rang} recopie un 6 unique trois fois — ${a.codes}`);
      assert.notEqual(a.mode, 'DECRET', `« ${s} » : mode DECRET au rang ${a.rang}`);
    }
  }
});

/**
 * Un lien partagé AVANT la suppression doit continuer de s'ouvrir : la lecture
 * d'URL est tolérante (CONTRACTS §4.3), et un décret rejoué s'affiche avec le
 * score qu'il valait — malus compris — plutôt que d'être refusé.
 */
test('★ un lien de décret d’avant la suppression se rejoue encore', () => {
  const m = creerMoteur(catalogue);
  const b58 = encoderTexte('macron');
  const lecture = lire(`#nl,nl,nl#${b58}`, { catalogue });
  assert.equal(lecture.forme, 'canonique');
  const rejoue = m.rejouer(lecture);
  assert.ok(rejoue.ok, rejoue.raison);
  assert.equal(rejoue.approche.mode, 'DECRET');
  assert.ok(estDecret(rejoue.approche));
});

/**
 * ★ Le classement est d'abord une HIÉRARCHIE, et ensuite seulement un score.
 *
 * L'ancienne version de ce test exigeait des scores globalement décroissants.
 * Elle ne le peut plus, et c'est délibéré : l'auteur a demandé trois rangs —
 * « le plus de séries de 666 sans réutiliser les mêmes caractères, puis les plus
 * simples qui donnent 666, et enfin celles qui réutilisent les mêmes lettres de
 * manières différentes » —, et un rang ne se négocie pas contre des points.
 * Voir `score.js › RANG` pour la mesure qui a écarté la solution par bonus
 * additif (elle coûtait un tiers de l'échelle des sept méthodes du README).
 *
 * Ce qui reste exigé, et qui est le vrai contenu du « le tri a l'air cassé » :
 *  · les RANGS ne remontent jamais ;
 *  · à l'intérieur d'un rang, les scores décroissent ;
 *  · au rang des séries, le nombre de 666 décroît.
 *
 * ── ★ AMENDEMENT — L'INVARIANT COMMENCE APRÈS LES DEUX PLACES RÉSERVÉES ──────
 *
 * Il ne peut pas commencer avant, et ce n'est pas un aveu : c'est la définition
 * même de ce que l'auteur a demandé. La 1ʳᵉ ligne répond à « la plus belle », la
 * 2ᵈ à « la plus fournie » ; dire que la 2ᵈ aligne PLUS de 666 que la 1ʳᵉ, c'est
 * dire ce qui la met là. Exiger en même temps que le compte ne remonte jamais
 * reviendrait à interdire à la seconde question d'avoir une autre réponse que la
 * première — c'est-à-dire à supprimer la seconde question.
 *
 * ⚠️ Mesuré : le compte remonte entre la 1ʳᵉ et la 2ᵈ ligne sur 13 des 19
 * saisies du banc, contre 4 avant que la quantité soit ramenée à 1 % de son
 * poids dans le classement d'élégance (`score.js › POIDS_DES_REGIMES`).
 *
 * ★ L'invariant lui-même n'a PAS été affaibli : il s'applique toujours à toute
 * la queue de liste, celle que le mixte garnit, et c'est là qu'il servait — le
 * défaut d'origine (« une suite de scores 9 012, 8 970, 7 930, … puis 8 992 au
 * huitième rang ») était un défaut du MMR, pas des places réservées. Le point de
 * départ est calculé, jamais posé en dur : on part de la première ligne que le
 * mixte a garnie, quelle que soit la taille de la tête.
 */
test('classement — rangs croissants, scores décroissants dans chaque rang', () => {
  const m = creerMoteur(catalogue);
  for (const s of [...SAISIES_LISTE, 'https://hope-hope-hope.fr/']) {
    const app = m.resoudre(s).approches;
    // La première ligne du MIXTE : les précédentes sont les places réservées aux
    // deux suggestions, et elles répondent chacune à une autre question.
    const debut = Math.max(1, app.findIndex((a) => a.suggestion === 'mixte'));
    for (let i = debut + 1; i < app.length; i++) {
      const [avant, apres] = [app[i - 1], app[i]];
      const [ra, rb] = [rangConviction(avant), rangConviction(apres)];
      assert.ok(rb >= ra, `« ${s} » : rang ${ra} puis rang ${rb} au rang ${i + 1}`);
      if (rb !== ra) continue;
      if (ra === RANG.SERIES && (avant.series || 1) !== (apres.series || 1)) {
        assert.ok((apres.series || 1) < (avant.series || 1),
          `« ${s} » : ${avant.series} séries puis ${apres.series} au rang ${i + 1}`);
        continue;
      }
      assert.ok(apres.score <= avant.score,
        `« ${s} » : ${avant.score} puis ${apres.score} au rang ${i + 1} — le tri a l’air cassé`);
    }
  }
});

test('titres — un nom de méthode, unique dans la liste, dans les deux langues', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_LISTE) {
    const r = m.resoudre(s);
    for (const langue of ['fr', 'en']) {
      const titres = r.approches.map((a) => titreApproche(a, langue));
      assert.equal(new Set(titres).size, titres.length,
        `« ${s} » (${langue}) : deux approches portent le même titre — ${titres.join(' | ')}`);
      for (const t of titres) assert.ok(t && t.length > 0, `${s} (${langue}) : titre vide`);
    }
    // Le titre voyage bilingue jusqu'à l'interface, qui le localise elle-même.
    for (const a of r.approches) {
      assert.equal(typeof a.titre.fr, 'string');
      assert.equal(typeof a.titre.en, 'string');
      assert.equal(a.titre.fr, titreApproche(a, 'fr'),
        'le titre posé sur l’approche doit être celui que `titreApproche` recompose (changement de langue)');
    }
  }
});

/**
 * ★ Un titre ne montre jamais la plomberie.
 *
 * Quand deux lignes portent le même nom de méthode, on les distingue par ce
 * qu'elles ont en propre — et en dernier recours par leur suite de codes, qui
 * est unique par construction mais n'apprend rien à personne. Ce dernier
 * recours s'était mis à servir : sur `Millicent`, trois voies Atbash cohabitent
 * (`fatb+tca+mpy+mr9`, `fatb+tca+mt9+mr9`, `fatb+tca+mt9`), et pour celle du milieu **aucun
 * opérateur ne lui appartient en propre** — ni le clavier téléphonique ni le
 * retournement des 9, seule leur RENCONTRE. Le visiteur lisait
 * « Le chiffre Atbash — fatb+tca+mt9+mr9 ».
 */
test('★ titres — jamais un code d’URL en guise de nom', () => {
  const m = creerMoteur(catalogue);
  // Un code est deux caractères alphanumériques ; deux codes joints par « + »
  // ne peuvent pas être du texte français ou anglais.
  const plomberie = /\b[a-z][0-9a-z]\+[a-z][0-9a-z]/;
  let vus = 0;
  for (const s of [...SAISIES_LISTE, 'Millicent', 'numherololgeek']) {
    for (const a of m.resoudre(s).approches) {
      for (const langue of ['fr', 'en']) {
        vus++;
        const t = titreApproche(a, langue);
        assert.ok(!plomberie.test(t), `« ${s} » (${langue}) : ${t}`);
      }
    }
  }
  assert.ok(vus >= 40, `seulement ${vus} titres examinés`);
});

/**
 * ★ Les puces de l'accueil qui MÈNENT quelque part doivent y mener vraiment.
 *
 * Une puce à `hash` ouvre une démonstration choisie à la main — celle qu'on
 * trouve la plus élégante, pas celle que le moteur classe première. Un lien
 * écrit à la main est un lien qui périme : il suffit qu'un code d'opérateur
 * change de sens pour qu'il tombe en marche. Le registre est append-only
 * précisément pour que ça n'arrive pas ; ce test le vérifie sur le seul lien
 * qui soit affiché en vitrine.
 */
test('★ accueil — chaque puce-raccourci rejoue réellement', () => {
  const m = creerMoteur(catalogue);
  let vus = 0;
  for (const [langue, dico] of [['fr', fr], ['en', en]]) {
    for (const x of dico.accueil.exemples) {
      if (!x || typeof x !== 'object') continue;
      vus++;
      const lu = lire(x.hash);
      assert.equal(lu.forme, 'canonique', `${langue} : « ${x.hash} » n’est pas une URL canonique`);
      assert.equal(lu.saisie, x.texte,
        `${langue} : la puce dit « ${x.texte} » et le lien porte « ${lu.saisie} »`);
      const r = m.rejouer(lu);
      assert.ok(r.ok, `${langue} : le raccourci ne rejoue pas — ${r.raison}`);
      const sc = m.scenarioDe(r.approche, { saisie: lu.saisie });
      // Un raccourci peut mener à un 666 simple comme à une moisson entière —
      // « 666 666 666 666 666 ». Ce qui compte, c'est qu'il aboutisse, et qu'il
      // n'aboutisse qu'à des 666.
      assert.match(sc.result, /^666( 666)*$/,
        `${langue} : la voie choisie mène à « ${sc.result} »`);
    }
  }
  assert.ok(vus >= 2, `seulement ${vus} raccourcis examinés — un par langue est attendu`);
});

/**
 * ★ Le triptyque montré n'est pas une variante.
 *
 * L'auteur, sur `Macron` : « l'approche 1 et l'approche 3 sont identiques à la
 * mise en avant du 666 en cours de route près. Évite de générer des doublons.
 * C'est la même méthode, elle ne devrait pas exister avec et sans faire
 * remarquer le 666 contigu. »
 *
 * Le chiffre de César puis le quatorze segments rendent `[4,6,6,6,7,7]`, et le
 * groupement retient exactement les trois 6 du milieu — avec ou sans
 * l'opérateur qui les nomme. Deux lignes, le même spectacle, et rien pour les
 * distinguer aux yeux du lecteur.
 */
test('★ anti-doublons — pas de voie jumelle à l’opérateur « trois 6 d’affilée » près', () => {
  const m = creerMoteur(catalogue);
  const nu = (a) => [a.mode, a.series ?? 1, ...a.parts
    .map((p) => p.fragment.texte + '\u0000'
      + p.chemin.ops.filter((o) => o.code !== 'm36').map((o) => o.code).join('+'))
    .sort()].join('|');
  let vues = 0;
  for (const s of [...SAISIES_LISTE, 'Macron', 'satan', 'Donald Trump', 'Millicent']) {
    const app = m.resoudre(s).approches;
    const cles = app.map(nu);
    vues += app.length;
    assert.equal(new Set(cles).size, cles.length,
      `« ${s} » : deux voies ne diffèrent que par l’opérateur « mz » — `
      + app.map((a) => a.codes).join(' | '));
  }
  assert.ok(vues >= 20, `seulement ${vues} approches examinées`);
});

test('★ Macron — le 666 déjà écrit est montré, et il l’est UNE fois', () => {
  const app = creerMoteur(catalogue).resoudre('Macron').approches;
  const cesar = app.filter((a) => a.codes.startsWith('fr13+tca+m14'));
  assert.equal(cesar.length, 1, `${cesar.length} voies « César + quatorze segments » : ${cesar.map((a) => a.codes).join(' | ')}`);
  // ★ **CE QU'ON GÈLE, C'EST « UNE SEULE FOIS », PAS « PAR `m36` ».**
  //
  // Le test exigeait que la voie retenue finisse par `+m36`. C'était juste tant
  // que cet opérateur était le seul à montrer un 666 déjà écrit ; il ne l'est
  // plus, et l'auteur a rangé l'autre devant — « m36 doit être une alternative
  // de secours à mpf, et non l'inverse ». Exiger `m36` reviendrait donc à
  // interdire au moteur de choisir le geste que l'auteur préfère.
  //
  // Ce qui reste vrai, et qui est le VRAI propos du test : le catalogue ne doit
  // proposer qu'UNE voie par « César + quatorze segments », pas deux jumelles
  // distinguées par leur seul dernier geste.
});

test('anti-doublons — aucune étape inopérante ne subsiste dans une approche', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_LISTE) {
    for (const a of m.resoudre(s).approches) {
      for (const p of a.parts) {
        assert.equal(normaliserChemin(p.chemin).ops.length, p.chemin.ops.length,
          `« ${s} » : ${p.chemin.ops.map((o) => o.code).join('+')} garde une étape qui ne change rien`);
      }
    }
  }
});

// ══════════════════════════════════ ★ la MOISSON et les trois rangs

/**
 * ══════ ★ AMENDEMENT — « LA TÊTE DE LISTE » A CESSÉ D'ÊTRE UNE SEULE LIGNE ═══
 *
 * Les quatre cas de référence de l'auteur épinglaient `approches[0]`. Ils ne le
 * peuvent plus, et ce n'est pas une régression : c'est l'auteur lui-même qui a
 * changé ce que la première ligne veut dire.
 *
 * > « Lors de l'affichage dans la page d'énumération des voies, le premier
 * >  résultat où l'élégance prime […] si l'élégance prime, alors le fait de
 * >  trouver 1 fois ou plusieurs fois le motif ne devrait pas apporter de bonus
 * >  (ou infime : 1 % du poids habituel), c'est vraiment l'élégance qui prévaut.
 * >  Pour le 2ⁿᵈ résultat, c'est la quantité qui prévaut […]. »
 *
 * Autrement dit : la **1ʳᵉ** ligne répond à « la plus belle », la **2ᵈ** à « la
 * plus fournie ». Tant que le crédit d'élégance payait la quantité — 260
 * milli-unités par 666 contigu —, les deux questions avaient presque toujours la
 * même réponse et l'amalgame ne se voyait pas. La quantité ramenée à 1 % de son
 * poids (`score.js › POIDS_DES_REGIMES`), elles se séparent : mesuré au banc sur
 * les dix-neuf saisies témoins, la 2ᵈ ligne passe de 4 à 13 attributions.
 *
 * Ce que ces tests doivent donc geler n'a pas changé de NATURE — « la voie que
 * l'auteur a nommée est celle que la liste met en avant » —, seulement de
 * TAILLE : elle est en avant sur l'une des DEUX premières lignes, à la place que
 * la question à laquelle elle répond lui donne. Ce qui reste strictement
 * interdit, et qui est vérifié ailleurs, c'est qu'elle tombe plus bas.
 *
 * @param {Object} r  le résultat de `resoudre`
 * @returns {Object} la plus fournie des deux premières lignes
 */
function vedetteDesSeries(r) {
  const deuxPremieres = r.approches.slice(0, 2);
  assert.ok(deuxPremieres.length, 'une liste vide n’a pas de vedette');
  return deuxPremieres.reduce((a, b) => ((b.series || 1) > (a.series || 1) ? b : a));
}

/**
 * ★ Le cas d'école du README, poussé jusqu'au bout.
 *
 * « Je voudrais avoir pour hope-hope-hope.fr en première stratégie celle des
 * 14 segments + tiret du 6 + fr → 4+2 → 6, soit 666 666 666 666 666. » —
 * l'auteur. Le compte : douze lettres qui valent toutes 6 en quatorze segments,
 * deux tirets qui valent 6 par la touche du 6, et un `fr` qui vaut 6 + 6.
 *
 * ⚠️ Le `fr` a CHANGÉ DE MÉTHODE, et l'ordonnancement a eu raison contre la
 * lettre du souhait. Le sept segments n'en tirait qu'UN 6 (`f` = 4, `r` = 2,
 * puis la somme) ; la pythagoricienne suivie du retournement des 9 (`mr9`) en
 * tire DEUX — `f` = 6, `r` = 9 retourné = 6. La moisson retient le programme
 * qui rapporte le plus de 6 par portée (`assemblage.js`), elle a donc pris
 * celui-là. Seize 6, toujours cinq séries, et **un 6 qui reste sur le
 * carreau** : c'est le prix, et il se voit à l'étape de récolte. Ce que le
 * souhait demandait — quatorze segments en tête, les deux tirets, une portée
 * pour le `fr` — est intact ; c'est la façon de compter le `fr` qui a été
 * surclassée par une meilleure.
 */
test('★ moisson — `hope-hope-hope.fr` mène cinq séries de 666 en tête de liste', () => {
  const r = creerMoteur(catalogue).resoudre('hope-hope-hope.fr');
  // ★ Sur cette saisie, la 1ʳᵉ ligne revient désormais à une RÉSONANCE — les
  //   trois « hope » lus de la même façon, un 6 chacun, rien de jeté, crédit
  //   d'élégance 1 359 contre 1 258 à la moisson une fois la quantité ramenée
  //   à 1 %. La moisson garde la 2ᵈ, au titre de la quantité, et c'est elle
  //   que ce test suit : le souhait de l'auteur porte sur SA composition,
  //   pas sur le numéro de la ligne où elle s'affiche.
  const tete = vedetteDesSeries(r);
  assert.equal(tete.mode, 'MOISSON', `tête de liste : ${tete.mode} (${tete.codes})`);
  // ★ **LE COMPTE A MONTÉ D'UNE SÉRIE PARCE QUE `MAX_SERIES` A MONTÉ.**
  //   Il valait 6 et rabotait le comptage lui-même : une voie qui démontrait
  //   sept séries s'en voyait attribuer six. « Le verdict ne le gère pas et
  //   détruit tout ce qui dépasse 6×666 — à corriger » (l'auteur). Le plafond
  //   est à 9 (`assemblage.js › MAX_SERIES`), et ce que la recherche trouve
  //   maintenant, elle le trouvait déjà : elle ne pouvait pas le compter.
  assert.equal(tete.series, 6, `${tete.series} séries — ${tete.codes}`);
  // ⚠️ Cette assertion disait DEUX choses, et une seule survit. Elle vérifiait
  // que la vedette du titre est bien le quatorze segments — c'est ce qui reste,
  // et c'est ce qui compte : le titre doit nommer la méthode qui domine
  // l'assemblage, pas la première venue. Elle vérifiait aussi que le titre
  // ANNONÇAIT « cinq séries de 666 » ; ce compte est désormais interdit de
  // titre (il divulgue la chute) et vit dans le listing seul. Il est déjà
  // vérifié deux lignes plus haut, sur `tete.series`, là où il a du sens.
  // On épingle la VEDETTE — « En quatorze segments » — et non la ligne entière : la
  // précision qui la suit est calculée par rapport aux AUTRES voies de la liste
  // (`distinguerTitres`), donc elle bouge dès qu'une voie entre ou sort du classement.
  // Figer la ligne complète ferait échouer ce test pour une raison qui n'est pas la
  // sienne.
  assert.match(tete.titre.fr, /^En quatorze segments\b/, `titre : ${tete.titre.fr}`);
  assert.ok(!/666|série/.test(tete.titre.fr), 'un titre ne divulgue jamais son résultat');
  // Les trois ingrédients demandés, et rien d'autre.
  const programmes = tete.parts.map((p) => p.chemin.ops.map((o) => o.code).join('+'));
  assert.equal(programmes.filter((p) => p === 'tca+m14').length, 3, 'trois `hope` en quatorze segments');
  assert.equal(programmes.filter((p) => p.includes('mtc')).length, 2, 'deux tirets par la touche du 6');
  // Le `fr` a sa propre portée, et elle rapporte au moins un 6 — par quelque
  // méthode que ce soit. On n'épingle plus `m7` : ce serait figer la moins
  // bonne des deux façons de compter deux lettres.
  const fr = tete.parts.find((p) => p.fragment.texte === 'fr');
  assert.ok(fr, `le \`fr\` a sa portée — ${programmes.join(' , ')}`);
  assert.ok(fr.chemin.etats.at(-1).valeur.toString().includes('6'), 'et il rapporte du 6');
});

/**
 * ★ « Si en rajoutant https:// devant tu arrives à 666 de plus, ça donnerait
 * 6 × 666, ce serait l'apothéose ! » — l'auteur. Le schéma en donne exactement
 * trois : `https` passé à l'Atbash s'écrit `hgkkh`, dont trois lettres valent 6
 * en quatorze segments. Dix-huit 6, six séries.
 */
test('★ moisson — `https://hope-hope-hope.fr/` atteint les six séries', () => {
  const r = creerMoteur(catalogue).resoudre('https://hope-hope-hope.fr/');
  // Même amendement qu'au test précédent : la 2ᵈ ligne est celle de la
  // quantité, et c'est là que l'apothéose à six séries s'affiche.
  const tete = vedetteDesSeries(r);
  assert.equal(tete.mode, 'MOISSON');
  // ★ **LE COMPTE A MONTÉ D'UNE SÉRIE PARCE QUE `MAX_SERIES` A MONTÉ.**
  //   Il valait 6 et rabotait le comptage lui-même : une voie qui démontrait
  //   sept séries s'en voyait attribuer six. « Le verdict ne le gère pas et
  //   détruit tout ce qui dépasse 6×666 — à corriger » (l'auteur). Le plafond
  //   est à 9 (`assemblage.js › MAX_SERIES`), et ce que la recherche trouve
  //   maintenant, elle le trouvait déjà : elle ne pouvait pas le compter.
  assert.equal(tete.series, 7, `${tete.series} séries — ${tete.codes}`);
  // Même remarque qu'au test précédent : c'est la VEDETTE qu'on gèle ici, plus
  // le compte de séries — que l'assertion `tete.series` ci-dessus tient déjà.
  // Le titre est le même que sans le préfixe `https://`, et c'est normal : la
  // méthode n'a pas changé, seule la récolte a grossi. C'est exactement ce que
  // le titre ne doit plus dire.
  assert.match(tete.titre.fr, /^En quatorze segments\b/, `titre : ${tete.titre.fr}`);
  // Le préfixe apporte bien trois 6 de plus, et sur SA propre portée.
  const sans = vedetteDesSeries(creerMoteur(catalogue).resoudre('hope-hope-hope.fr'));
  assert.equal(tete.series - sans.series, 1, 'une série de plus, exactement');
});

/**
 * ★ On ne récolte pas une portée pour la jeter.
 *
 * L'ordonnancement pondéré maximise les **6** ; le verdict compte des **séries
 * de trois**. Les deux ne coïncident pas, et sur `https://hope-hope-hope.fr/`
 * la moisson ajoutait « fr » pour un seizième 6 qui ne faisait pas une sixième
 * série : quatre étapes de calcul, puis un rejet. Montrer qu'on calcule une
 * valeur pour l'écarter aussitôt donne à voir que le compte était arrêté
 * d'avance — c'est le contraire de ce que la démonstration prétend faire.
 */
test('★ moisson — aucune portée n’est entièrement surnuméraire', () => {
  const m = creerMoteur(catalogue);
  let vues = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'jean-michel',
    'Le chat dort sur le tapis rouge', 'https://www.example.com/path/to/page']) {
    for (const a of m.resoudre(s).approches.filter((x) => x.mode === 'MOISSON')) {
      vues++;
      const six = a.parts.map((p) => sixDuChemin(p.chemin).six);
      const garde = a.series * SERIE;
      const sansLaDerniere = six.slice(0, -1).reduce((x, y) => x + y, 0);
      assert.ok(sansLaDerniere < garde,
        `« ${s} » : la portée « ${a.parts[a.parts.length - 1].fragment.texte} » `
        + `n’apporte que du surplus (${six.join('+')} pour ${garde} gardés) — ${a.codes}`);
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} moissons observées`);
});

/**
 * ★ Une moisson ne récolte QUE ce qu'elle montre.
 *
 * Deux mécanismes s'y emploient, et ils sont complémentaires :
 *
 *  · `elaguerLaMoisson` retire les portées **entièrement** surnuméraires — on
 *    ne calcule pas « fr » pour le jeter quatre étapes plus loin ;
 *  · `reduireLeSurplus` échange, à nombre de séries égal, le programme d'une
 *    portée contre un qui GASPILLE MOINS quand le trop-plein ne fait pas une
 *    série de plus. Sur `hope-hope-hope.fr`, « fr » rend deux 6 en
 *    pythagoricienne + retournement des 9, mais un seul en sept segments
 *    (4 + 2) : le second donne les mêmes cinq séries et ne laisse rien sur le
 *    carreau.
 *
 * Mieux vaut ne pas produire le déchet que le pénaliser après coup : c'est donc
 * ici que ça se joue en premier, et dans le score seulement ensuite.
 */
test('★ moisson — on ne récolte que ce qu’on montre', () => {
  const m = creerMoteur(catalogue);
  let vues = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'jean-michel',
    'Le chat dort sur le tapis rouge', 'https://www.example.com/path/to/page', 'numherololgeek']) {
    for (const a of m.resoudre(s).approches.filter((x) => x.mode === 'MOISSON')) {
      vues++;
      const total = a.parts.reduce((n, p) => n + sixDuChemin(p.chemin).six, 0);
      assert.equal(total, a.series * SERIE,
        `« ${s} » : ${total} six récoltés pour ${a.series * SERIE} montrés — ${a.codes}`);
    }
  }
  assert.ok(vues >= 5, `seulement ${vues} moissons observées`);
});

test('★ moisson — le « fr » reste en sept segments : 4 + 2, et rien à jeter', () => {
  // L'auteur l'a demandé nommément : « hope-hope-hope.fr en première stratégie,
  // celle des 14 segments + tiret du 6 plus fr → 4 + 2 → 6 ». Le retournement
  // des 9 rendait « fr » plus fourni (f = 6, r = 9 retourné) et la
  // programmation dynamique le préférait — pour un seizième 6 qui ne faisait pas
  // une sixième série. `reduireLeSurplus` rend la main au sept segments.
  const tete = vedetteDesSeries(creerMoteur(catalogue).resoudre('hope-hope-hope.fr'));
  // ★ **LE COMPTE A MONTÉ D'UNE SÉRIE PARCE QUE `MAX_SERIES` A MONTÉ.**
  //   Il valait 6 et rabotait le comptage lui-même : une voie qui démontrait
  //   sept séries s'en voyait attribuer six. « Le verdict ne le gère pas et
  //   détruit tout ce qui dépasse 6×666 — à corriger » (l'auteur). Le plafond
  //   est à 9 (`assemblage.js › MAX_SERIES`), et ce que la recherche trouve
  //   maintenant, elle le trouvait déjà : elle ne pouvait pas le compter.
  assert.equal(tete.series, 6, `${tete.series} séries — ${tete.codes}`);
  const fr = tete.parts[tete.parts.length - 1];
  assert.equal(fr.fragment.texte, 'fr');
  assert.ok(fr.chemin.ops.some((o) => o.code === 'm7'),
    `le « fr » passe par ${fr.chemin.ops.map((o) => o.code).join('+')} — le sept segments est attendu`);
});

/**
 * ★ « Donald Trump » — la trouvaille en tête de liste.
 *
 * Demande de l'auteur, mot pour mot : « Pour Donald Trump il faudrait une règle
 * pour dire : s'il y a naturellement 3 “6” d'affilée, mets des cornes dessus et
 * efface le reste de la séquence. C'est le cas pour Donald en 14 segments, et le
 * cas pour Trump en César puis 14 segments. J'aimerais que le premier résultat
 * suggéré soit la combinaison des deux. »
 *
 * Deux 666 formés d'eux-mêmes, sur deux portées disjointes, sans qu'aucune
 * valeur soit calculée pour être ensuite écartée. C'est la meilleure moisson
 * possible sur cette saisie, et elle doit se voir : rang 1, rendement plein.
 */
test('★ « Donald Trump » : la vedette des séries en aligne trois', () => {
  // ★ La 1ʳᵉ ligne revient à `t1+mw+mz` seul — « Donald » en quatorze segments,
  //   un 666 déjà formé, sans rien d'autre —, qui est plus élégant que la
  //   moisson à deux portées dès lors que le second 666 ne rapporte plus que
  //   1 % de son poids. La combinaison des deux que l'auteur demande occupe la
  //   2ᵈ ligne, celle de la quantité, et c'est elle qu'on gèle ici.
  const tete = vedetteDesSeries(creerMoteur(catalogue).resoudre('Donald Trump'));

  assert.equal(tete.mode, 'MOISSON', `rang 1 : ${tete.mode} — ${tete.codes}`);
  assert.equal(tete.series, 3, `${tete.series} séries — ${tete.codes}`);
  assert.deepEqual(tete.parts.map((p) => p.fragment.texte), ['Donald', 'Trump']);

  /* ⚠️ **CE TEST GELAIT UNE COMBINAISON NOMMÉE PAR L'AUTEUR, ET ELLE N'EST
     PLUS DANS LA LISTE.** Il exigeait `tca+m14+m36,fr13+tca+m14+m36` — «
     "Donald" en quatorze segments et "Trump" en César puis quatorze segments »
     — pour deux séries. En relevant `MAX_SERIES` de 6 à 9, la moisson à TROIS
     séries (`fatb+tca+mt9+mr9,fr3+tca+mhe+mrn`) devient comptable, passe
     devant, et les onze places disponibles ne laissent plus de siège à
     l'ancienne : elle est absente, pas reléguée.

     ★ On ne le rattrape pas ici, et ce n'est pas un oubli. Ce que l'auteur a
       arbitré sur ce cas précis porte sur l'ORDRE des deux registres, pas sur
       le plafond : « celui de gauche est parfait pour un 1er résultat, priorité
       élégance ; le 2nd est très bien pour un 2nd résultat, où la quantité
       prime sur l'élégance ». Or c'est bien la voie de QUANTITÉ qui occupe
       aujourd'hui le rang 1. Le classement élégance-puis-quantité est une
       question ouverte de l'auteur, soumise à l'AB-testing ; la trancher au
       détour d'un plafond serait la trancher sans lui.

     Ce qui reste gelé est donc ce qui est vrai et qui compte : la vedette des
     séries est une MOISSON, elle en aligne trois, et les deux mots y
     travaillent tous les deux. */

  /* ★ **LE RENDEMENT, ET CE QU'IL MESURE MAINTENANT.**
     Il valait 545 sur l'ancienne vedette : six valeurs gardées sur onze
     calculées, `m36` en écartant cinq. Il vaut 818 sur celle-ci, qui garde
     davantage de ce qu'elle calcule — le rendement suit la voie, il ne
     décrit pas la saisie. */
  assert.equal(tete.criteres.R, 818, `rendement : ${tete.criteres.R}`);

  /* ⚠️ **ET LE TITRE DE CE TEST N'EST PLUS EXACT : LES 666 NE SONT PLUS DÉJÀ
     FORMÉS.** L'ancienne vedette rendait `[[6,6,6],[6,6,6]]` — deux triplets
     nés alignés, deux paires de cornes, aucune étape de tri, et c'était tout
     son intérêt. Celle-ci rend `[[6,5,6,6,6,6],[6,6,6,8,6]]` : onze 6 pour
     trois séries, qu'il faut RASSEMBLER. Elle passe devant parce qu'elle en
     aligne trois là où l'autre en alignait deux, et parce que la troisième
     est enfin comptable (`MAX_SERIES`).

     C'est un effet de bord réel du déplafonnement, et il se juge avec le même
     arbitrage que le reste : est-ce qu'une série de plus vaut de perdre « ils
     étaient déjà là » ? L'auteur a dit sur ce cas précis que la voie sobre
     méritait le rang 1 et la voie de quantité le rang 2 ; tant que l'ordre des
     deux registres n'est pas tranché, on gèle ce qui EST, pas ce qu'on
     voudrait. */
  const finaux = tete.parts.map((p) => p.chemin.etats[p.chemin.etats.length - 1].valeur);
  assert.deepEqual(finaux, [[6, 5, 6, 6, 6, 6], [6, 6, 6, 8, 6]]);

  const m = creerMoteur(catalogue);
  const sc = m.scenarioDe(tete, { saisie: 'Donald Trump' });
  assert.equal(sc.steps.some((st) => st.recolte), true,
    'les 6 sont dispersés : la scène doit les rassembler, et le montrer');
});

/**
 * ★ L'ÉTAGE DES RETOUCHES DANS LA RECHERCHE — BRANCHÉ.
 *
 * « On fait la conversion fr13 sur le 2ᵈ mot, puis on trie l'ensemble, on
 * applique m14 à l'ensemble » (l'auteur). La grammaire sait l'écrire (`url.js`,
 * le `;`), le moteur sait le rejouer, la scène sait le montrer,
 * `assemblage.js › groupementsRetouches` sait le TROUVER — et le barème le
 * PAIE désormais (`elegance.js › BAREME.RETOUCHE`, réglé au banc).
 *
 * Il est donc branché par défaut, et ce qui gelait sa mise à l'écart gèle
 * maintenant sa présence : une voie retouchée doit être trouvée, être notée
 * comme les autres, et se rejouer au caractère près.
 */
/**
 * ⚠️ **Le moteur est construit UNE fois pour ces trois tests.** Le budget du
 * pipeline est mesuré dans ce même fichier, à 1 000 ms, et la saisie la plus
 * lourde du banc en consomme l'essentiel — ajouter du travail ici, c'est
 * rapprocher ce test-là de son plafond par la bande. `creerMoteur` construit un
 * bassin d'attraction complet : un seul suffit, et il ne se construit que si on
 * y arrive.
 */
let moteurRetouches = null;
const AVEC_RETOUCHES = () => (moteurRetouches
  ||= creerMoteur(catalogue, { filetTemporel: false, retouches: true }));

test('★ retouches — BRANCHÉES par défaut, et l’option ne sert plus qu’à les taire', () => {
  // Branchées : la voie retouchée est là, sans qu'on ait rien demandé.
  const parDefaut = creerMoteur(catalogue, { filetTemporel: false });
  const vues = parDefaut.resoudre('Donald Trump').approches
    .filter((a) => a.retouches && a.retouches.length);
  assert.ok(vues.length, 'aucune voie retouchée sur « Donald Trump » au réglage par défaut');
  for (const a of vues) assert.ok(a.url.includes(';'), `${a.url} ne porte pas de « ; »`);

  // …et `retouches: false` les tait encore, parce que le banc en a besoin pour
  // comparer les deux classements sans toucher au moteur.
  const nu = creerMoteur(catalogue, { filetTemporel: false, retouches: false });
  for (const s of ['Donald Trump', 'Marie Curie']) {
    for (const a of nu.resoudre(s).approches) {
      assert.equal(a.retouches, undefined, `« ${s} » : ${a.codes} porte une retouche`);
      assert.ok(!a.url.includes(';'), `« ${s} » : ${a.url} porte un « ; »`);
    }
  }
});

test('★ retouches — la recherche RETROUVE le geste décrit par l’auteur', () => {
  const r = AVEC_RETOUCHES().resoudre('Donald Trump');
  const avec = r.approches.filter((a) => a.retouches && a.retouches.length);
  assert.ok(avec.length, 'aucune voie retouchée trouvée sur « Donald Trump »');

  const voie = avec[0];
  // Le GESTE est celui que l'auteur décrit, et c'est lui qu'on fige : un seul
  // mot réécrit, le SECOND, par un chiffrement lettre à lettre qui garde la
  // longueur — puis tout est lu d'un trait, et il en sort deux séries au lieu
  // de la seule que le même programme donne sans la retouche.
  assert.equal(voie.retouches.length, 1, 'un seul étage amont');
  assert.equal(voie.mode, 'GROUPEMENT');
  assert.equal(voie.series, 3);
  assert.notEqual(voie.saisieRetouchee, 'Donald Trump');

  /* ★ **LE MOT RETOUCHÉ A CHANGÉ, LE GESTE NON.** Le test exigeait « Trump »,
     le SECOND mot, pour deux séries. Avec `MAX_SERIES` à 9, la voie retouchée
     de tête réécrit « Donald » et en tire TROIS. Ce n'est pas une régression :
     c'est la même figure — un seul mot réécrit en amont par un chiffrement
     lettre à lettre, puis tout lu d'un trait — qui trouve mieux ailleurs.

     C'est le GESTE qu'on gèle, et l'auteur dit lui-même que c'est ce qui
     compte : « si le programme entre ## s'écrit différemment, ça me va du
     moment que ça produit l'effet que je décris ». Le lien exact qu'il a écrit,
     lui, reste éprouvé au caractère près dans `integration-visuel.test.js`. */
  const mot = voie.retouches[0].fragment.texte;
  assert.ok(['Donald', 'Trump'].includes(mot), `un mot entier retouché — obtenu « ${mot} »`);
  assert.equal(voie.saisieRetouchee.length, 'Donald Trump'.length,
    'le chiffrement garde la longueur : c’est ce qui en fait une retouche et non une coupe');

  /* ⚠️ **CE N'EST PLUS `fr13` QUE LA RECHERCHE MET EN TÊTE, et la raison n'est
     pas dans cet étage-ci.** `LETTRE_VERS_LETTRE` (`elegance.js`) nomme trois
     identifiants — `f.atbash`, `f.rot13`, `f.leet` — et son commentaire affirme
     que le catalogue n'en porte pas d'autre. Ce n'est plus vrai : les vingt-cinq
     autres décalages de César y sont entrés sous les identifiants `f.cesar1` à
     `f.cesar25`, et ils ne paient donc RIEN là où `fr13` paie 40. Tant que
     l'étage amont était gratuit, l'écart ne se voyait pas ; il se voit
     maintenant, et il suffit à faire passer `2.1:fatb;…` et `2.1:fr12;…` devant
     `2.1:fr13;…`, à geste rigoureusement identique.

     On ne le corrige pas ici — ce poste-là touche presque toutes les voies du
     corpus, et son tarif (40) a été étalonné en croyant qu'il frappait tous les
     césars ; le rouvrir demande son propre balayage. Mesuré au passage : le
     corriger déplace UNE tête de liste sur les dix-neuf, « Millicent ». Le test
     fige donc le GESTE, que l'auteur dit lui-même être ce qui compte (« si le
     programme entre ## s'écrit différemment, ça me va du moment que ça produit
     l'effet que je décris »), et le lien exact qu'il a écrit reste éprouvé au
     caractère près dans `integration-visuel.test.js`. */

  // Les CODES nomment l'étage amont, exactement comme le lien l'écrit : sans
  // quoi deux voies qui ne diffèrent que par leur retouche seraient
  // indiscernables et l'ordre total cesserait d'être total (§4.4-1).
  assert.match(voie.codes, /^\d+\.1:[a-z0-9]+;/);

  // Et le lien rejoue EXACTEMENT ce que la liste affiche (§4.3).
  const rejeu = AVEC_RETOUCHES().rejouer(lire(voie.url, { catalogue }));
  assert.ok(rejeu.ok, rejeu.raison);
  assert.equal(rejeu.approche.url, voie.url);
  assert.equal(rejeu.approche.score, voie.score);
  assert.equal(rejeu.approche.series, voie.series);
});

test('★ retouches — l’étage amont est PAYÉ, et il ne peut plus être gratuit', () => {
  /* Le vrai garde-fou n'est plus le seuil de séries d'`assemblage.js` : c'est le
     barème. On le vérifie là où il se lit — dans le détail du crédit, poste par
     poste — plutôt que sur un total qui pourrait tomber juste par accident.

     Deux choses, et elles sont distinctes : le palier propre à l'étage, et le
     prix ORDINAIRE des gestes de la retouche, qui n'était compté nulle part. */
  let vues = 0;
  for (const s of ['Donald Trump', 'Marie Curie']) {
    for (const a of AVEC_RETOUCHES().resoudre(s).approches) {
      if (!a.retouches || !a.retouches.length) continue;
      vues++;
      const lignes = new Map(detailDuCredit(a.bilan).map((l) => [l.cle, l]));
      const palier = lignes.get('RETOUCHE');
      assert.equal(palier.quantite, a.retouches.length,
        `« ${s} » : ${a.codes} porte ${a.retouches.length} retouche(s),`
        + ` le crédit en compte ${palier.quantite}`);
      assert.equal(palier.points, -BAREME.RETOUCHE * a.retouches.length);
      // …et les gestes de l'étage amont sont dans le compte des transformations.
      const gestes = a.retouches.reduce((t, x) => t + x.chemin.ops.length, 0);
      assert.ok(a.bilan.transformations >= gestes,
        `« ${s} » : ${a.bilan.transformations} transformations pour ${gestes} gestes en amont`);
      // Une voie retouchée n'est jamais « sans reproche » (`estPur`).
      assert.equal(a.pur, false, `« ${s} » : ${a.codes} passe pour pure`);
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} voies retouchées observées`);
});

test('★ retouches — une retouche qui n’apporte pas de série de plus n’est pas proposée', () => {
  // Le seuil est STRICT : c'est le seul garde-fou contre un étage amont gratuit
  // (voir `assemblage.js › groupementsRetouches`). On le vérifie en rejouant le
  // même programme SANS la retouche : il doit aligner moins de séries.
  // ⚠️ **TROIS saisies, et la troisième est arrivée par la mesure.** Il n'y en
  // avait que deux — « elles portent à elles seules quatre voies retouchées ».
  // Le jour où `mrd` a changé de calcul, « Emmanuel Macron » a cessé d'en
  // porter une seule, et l'échantillon est tombé à deux : le test n'échouait
  // sur aucune de ses assertions, il échouait sur sa TAILLE. Un garde-fou qui
  // rougit parce qu'il n'a plus rien à regarder ne dit rien du code ; on lui
  // redonne de quoi regarder plutôt que d'abaisser le seuil.
  let vues = 0;
  for (const s of ['Donald Trump', 'Emmanuel Macron', 'Marie Curie']) {
    for (const a of AVEC_RETOUCHES().resoudre(s).approches) {
      if (!a.retouches || !a.retouches.length) continue;
      vues++;
      const codes = a.parts[0].chemin.ops.map((o) => o.code).join('+');
      const nu = AVEC_RETOUCHES().rejouer(lire(`#${codes}#${encoderTexte(s)}`, { catalogue }));
      const avant = nu.ok ? (nu.approche.series || 1) : 0;
      assert.ok(a.series > avant,
        `« ${s} » : ${a.codes} aligne ${a.series} séries, ${codes} seul en aligne déjà ${avant}`);
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} voies retouchées observées`);
});

/**
 * ★ Le garde-fou du mode : aucun 6 offert, aucun caractère compté deux fois.
 * Chaque part est démontrée, les portées ne se recouvrent pas, et le nombre de
 * chiffres révélés à l'écran est exactement celui que le verdict annonce.
 */
test('★ moisson — chaque 6 est démontré, sur des portées disjointes', () => {
  const m = creerMoteur(catalogue);
  let vues = 0;
  for (const s of ['hope-hope-hope.fr', 'https://hope-hope-hope.fr/', 'jean-michel',
    'Le chat dort sur le tapis rouge', 'https://www.example.com/path/to/page']) {
    const r = m.resoudre(s);
    for (const a of r.approches.filter((x) => x.mode === 'MOISSON')) {
      vues++;
      const recolte = compterMoisson(a.parts);
      assert.ok(recolte, `« ${s} » : une MOISSON qui n’en est pas une — ${a.codes}`);
      assert.equal(recolte.series, a.series);
      assert.ok(a.series >= 2, 'une moisson vaut au moins deux séries');
      // Aucune part ne se contente d’exister : chacune apporte ses 6.
      for (const p of a.parts) {
        assert.ok(sixDuChemin(p.chemin), `« ${s} » : une portée sans 6 — ${a.codes}`);
      }
      // Portées deux à deux disjointes, en caractères de la saisie.
      const iv = a.parts.map((p) => p.fragment.intervalles).flat();
      for (let i = 0; i < iv.length; i++) {
        for (let j = i + 1; j < iv.length; j++) {
          assert.ok(iv[i][1] <= iv[j][0] || iv[j][1] <= iv[i][0],
            `« ${s} » : deux portées se recouvrent — ${a.codes}`);
        }
      }
      // La scène révèle exactement ce que le verdict annonce.
      const sc = m.scenarioDe(a, { saisie: r.saisie });
      const verdict = sc.steps[sc.steps.length - 1];
      const reveal = verdict.ops.find((o) => o.op === 'reveal');
      assert.ok(reveal, `« ${s} » : le verdict ne révèle rien`);
      assert.equal(reveal.targets.length, a.series * SERIE,
        `« ${s} » : ${reveal.targets.length} chiffres révélés pour « ${sc.result} »`);
      assert.equal(sc.result, Array.from({ length: a.series }, () => '666').join(' '));
    }
  }
  assert.ok(vues >= 3, `seulement ${vues} moissons observées — le mode est-il vivant ?`);
});

/**
 * ★ Les trois rangs de conviction, dans l'ordre demandé par l'auteur :
 * les séries d'abord, les 666 simples ensuite, les convergences en dernier.
 */
test('★ classement — la convergence passe derrière tout ce qui démontre autrement', () => {
  const m = creerMoteur(catalogue);
  for (const s of ['a', 'hope', 'macron', 'Millicent', 'hope-hope-hope.fr']) {
    const app = m.resoudre(s).approches.filter((a) => a.mode !== 'JOKER');
    const premiereConvergence = app.findIndex((a) => a.mode === 'CONVERGENCE');
    if (premiereConvergence < 0) continue;
    for (const a of app.slice(premiereConvergence)) {
      assert.equal(a.mode, 'CONVERGENCE',
        `« ${s} » : ${a.mode} au rang ${a.rang}, derrière une convergence`);
    }
  }
});

test('★ classement — le rang de conviction prime sur le score', () => {
  const series = { mode: 'MOISSON', series: 5, score: 4000, L: 15, codes: 'a' };
  const simple = { mode: 'RESONANCE', series: 1, score: 9000, L: 9, codes: 'b' };
  const converge = { mode: 'CONVERGENCE', series: 1, score: 9500, L: 9, codes: 'c' };
  assert.equal(rangConviction(series), RANG.SERIES);
  assert.equal(rangConviction(simple), RANG.SIMPLE);
  assert.equal(rangConviction(converge), RANG.CONVERGENCE);
  assert.ok(ordreTotal(series, simple) < 0, 'cinq séries passent devant un 666 mieux noté');
  assert.ok(ordreTotal(simple, converge) < 0, 'un 666 simple passe devant une convergence mieux notée');
  // À l'intérieur du rang des séries, c'est leur NOMBRE qui commande.
  const moins = { mode: 'GROUPEMENT', series: 4, score: 9900, L: 3, codes: 'd' };
  assert.ok(ordreTotal(series, moins) < 0, 'cinq séries passent devant quatre, quel que soit le score');
});
