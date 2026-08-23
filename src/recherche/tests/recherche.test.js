import test from 'node:test';
import assert from 'node:assert/strict';
import { creerMoteur, creerCanal } from '../index.js';
import { lire } from '../url.js';
import { encoderTexte } from '../base58.js';
import { validerCatalogue, chercherSix, operateursExplorables, D_MAX, MAX_NODES, BUDGET_MS, N_FRAG_MAX } from '../bfs.js';
import { construireBassin, statistiquesBassin, DISTANCE_MAX } from '../bassin.js';
import { genererFragments, motifsRepetes, periodicite, tokeniser, zonesSignifiantes, structureUrl } from '../fragments.js';
import { ordreTotal, comparerCodes, racineEntiere, critereCouverture, critereConcision, noter } from '../score.js';
import { approcheJoker, normaliserChemin } from '../assemblage.js';
import { estDecret, titreApproche } from '../titres.js';
import { catalogue, source, horlogeFactice, demarrerCharge, arreterCharge } from './_catalogue.js';

test(`catalogue de test employé : ${source}`, () => {
  assert.deepEqual(validerCatalogue(catalogue), [], 'le catalogue doit respecter CONTRACTS.md §2.2');
});

test('constantes conformes à CONTRACTS.md §5', () => {
  assert.equal(D_MAX, 4);
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
  const a = creerMoteur(catalogue);
  const b = creerMoteur(catalogue); // instance neuve : ni cache ni bassin partagés
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
  const parasites = demarrerCharge();
  try {
    // La saisie témoin du rapport de défaut : six exécutions sous charge en
    // rendaient trois classements distincts.
    for (const s of ['Le chat dort sur le tapis rouge']) {
      const runs = [];
      for (let i = 0; i < 6; i++) runs.push(creerMoteur(catalogue).resoudre(s));

      // Une exécution que le filet de sécurité a écourtée A LE DROIT de différer —
      // mais elle doit le DIRE (§4.3 : jamais de divergence silencieuse).
      const francs = runs.filter((r) => !r.tronqueTemps);
      const empreintes = new Set(francs.map(empreinte));
      assert.equal(empreintes.size, 1,
        `${s} : ${empreintes.size} classements distincts parmi ${francs.length} exécutions non écourtées`);
      for (const r of runs) {
        if (r.tronqueTemps) assert.ok(r.avertissement, `${s} : une troncature temporelle sans avertissement`);
      }
      // Le filet ne doit pas non plus devenir la norme : s’il mord sur la moitié
      // des exécutions, c’est l’étalonnage du budget de travail qui est faux.
      assert.ok(francs.length >= 4,
        `${s} : ${6 - francs.length} exécutions sur 6 écourtées par le filet — étalonnage à revoir`);
    }
  } finally {
    await arreterCharge(parasites);
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
  const a = { score: 900, L: 9, codes: 'm1+c1' };
  const b = { score: 900, L: 9, codes: 'm2+c1' };
  const c = { score: 900, L: 8, codes: 'm9+c1' };
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
  assert.ok(comparerCodes(['m1'], ['m2']) < 0);
  assert.ok(comparerCodes(['m1'], ['m1', 'c1']) < 0);
  assert.equal(comparerCodes(['f1', 'm1'], ['f1', 'm1']), 0);
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
  assert.equal(critereConcision(9), 1000, 'L* = 9');
  assert.equal(critereConcision(12), 681, '0,88³ ≈ 0,681');
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
  const honnete = creerMoteur(catalogue).resoudre(s).approches[0];
  assert.ok(honnete.score > a.score, 'une approche honnête doit toujours battre le joker');
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

test('budget — le pipeline complet tient sous la seconde', () => {
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
    const t0 = performance.now();
    const r = m.resoudre(s);
    const ms = performance.now() - t0;
    // La seconde vient du contrat (research §2.6) et protège la frappe en
    // direct : elle n'est pas négociable, c'est au moteur de tenir dedans.
    assert.ok(ms < 1000, `« ${s.slice(0, 30)} » : ${ms.toFixed(0)} ms`);
    console.log(`    ${ms.toFixed(1).padStart(7)} ms  ${String(r.approches.length).padStart(2)} approches  ${JSON.stringify(s.slice(0, 40))}`);
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
    assert.match(a.url, /^#×3:/, 'l’URL doit employer l’abréviation de résonance');
    assert.equal(new Set(a.parts.map((p) => p.fragment.texte)).size, 1, 'les 3 fragments sont le même texte');
  }
});

// ══════════════════════════════════ rejeu d'URL

test('rejeu — une URL canonique est rejouée SANS relancer la recherche', () => {
  const m = creerMoteur(catalogue);
  const r = m.resoudre('https://hope-hope-hope.fr/');
  for (const a of r.approches) {
    const lecture = lire(a.url, { catalogue });
    assert.equal(lecture.forme, 'canonique', a.url);
    const rejoue = m.rejouer(lecture);
    assert.ok(rejoue.ok, `${a.url} : ${rejoue.raison}`);
    assert.equal(rejoue.approche.score, a.score, `score identique pour ${a.url}`);
  }
});

test('rejeu — portée hors bornes : refus explicite, jamais une autre démonstration', () => {
  const m = creerMoteur(catalogue);
  const lecture = lire(`#99.3:n1#${encoderTexte('hope')}`);
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

test('classement — un décret ne passe jamais devant une démonstration', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_LISTE) {
    const r = m.resoudre(s);
    const rangDecret = r.approches.findIndex((a) => estDecret(a));
    const dernierHonnete = r.approches.reduce((k, a, i) => (estDecret(a) ? k : i), -1);
    if (rangDecret < 0 || dernierHonnete < 0) continue;
    assert.ok(rangDecret > dernierHonnete,
      `« ${s} » : un 6 unique recopié trois fois figure au rang ${rangDecret + 1}, `
      + `devant une approche qui produit réellement trois 6 (rang ${dernierHonnete + 1})`);
  }
});

test('classement — les scores affichés sont décroissants', () => {
  const m = creerMoteur(catalogue);
  for (const s of SAISIES_LISTE) {
    const scores = m.resoudre(s).approches.map((a) => a.score);
    for (let i = 1; i < scores.length; i++) {
      assert.ok(scores[i] <= scores[i - 1],
        `« ${s} » : ${scores[i - 1]} puis ${scores[i]} au rang ${i + 1} — le tri a l’air cassé`);
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
