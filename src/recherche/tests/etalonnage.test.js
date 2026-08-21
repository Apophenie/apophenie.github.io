// Étalonnage du score de conviction sur les 7 méthodes du README.
//
// ⚠️ CE TEST MESURE, IL NE VALIDE PAS. Les six pondérations de `score.js` sont
// une PRÉDICTION (research/heuristique.md §8.3, CONTRACTS.md §7-1) : le tableau
// « attendu » ci-dessous est une intuition d'auteur, pas une mesure. L'objet de
// ce test est de rendre l'écart VISIBLE et reproductible, pour qu'on puisse
// régler les poids en un seul endroit (`score.js` → POIDS / BONUS / MALUS /
// REGLAGES) et voir immédiatement l'effet.
//
// Il vérifie aussi, chemin faisant, que l'arithmétique des 7 méthodes du README
// tombe bien juste avec le catalogue employé.

import test from 'node:test';
import assert from 'node:assert/strict';
import { appliquerOp, etat } from '../bfs.js';
import { noter, POIDS, ordreTotal } from '../score.js';
import { zonesSignifiantes, tokeniser } from '../fragments.js';
import { deduireMode } from '../assemblage.js';
import { catalogue, source, operateur } from './_catalogue.js';

const SAISIE = 'https://hope-hope-hope.fr/';
//              0123456789...
//              https :  //  hope  -  hope  -  hope  .  fr  /
//              0-4   5  6-7 8-11 12  13-16 17 18-21 22 23-24 25
const HOPE = [[8, 11 + 1], [13, 16 + 1], [18, 21 + 1]];
const TIRETS = [[12, 13], [17, 18]];
const TRIPLE = [[8, 22]];

function frag(intervalle, famille = 'unite') {
  const [d, f] = intervalle;
  return {
    texte: SAISIE.slice(d, f), offset: d, longueur: f - d,
    intervalles: [[d, f]], tokenDebut: -1, tokenLong: -1, famille, priorite: 2,
  };
}

/** Construit un chemin en appliquant une suite d'opérateurs nommés. */
function chemin(texte, ids) {
  let courant = etat('STR', texte, [[0, texte.length]]);
  const c = { ops: [], etats: [courant], valeur: null, cout: 0 };
  for (const id of ids) {
    const op = operateur(id);
    const apres = appliquerOp(op, courant);
    assert.ok(apres !== null, `« ${texte} » : ${id} inapplicable après ${c.ops.map((o) => o.id).join(' > ')}`);
    c.ops.push(op);
    c.etats.push(apres);
    c.cout += op.cout || 0;
    courant = apres;
  }
  c.valeur = courant.type === 'NUM' ? courant.valeur : null;
  return c;
}

function part(intervalle, ids, famille) {
  const f = frag(intervalle, famille);
  return { fragment: f, chemin: chemin(f.texte, ids) };
}

/**
 * Les 7 méthodes du README, modélisées avec le catalogue.
 * `attendu` = le score prédit par research/heuristique.md §4.7 (sur 100).
 */
const METHODES = [
  {
    n: 1,
    nom: 'Le détour linguistique (hope → espoir → 6 lettres)',
    attendu: 72,
    parts: () => HOPE.map((iv) => part(iv, ['f.traduitFR', 'n.longueur'], 'repetition')),
  },
  {
    n: 2,
    nom: 'Le compte des lettres + voyelles (4 + 2 = 6)',
    attendu: 88,
    parts: () => HOPE.map((iv) => part(iv, ['n.lettresPlusVoyelles'], 'repetition')),
  },
  {
    n: 3,
    nom: 'Le compte des lettres + consonnes (4 + 2 = 6)',
    attendu: 88,
    parts: () => HOPE.map((iv) => part(iv, ['n.lettresPlusConsonnes'], 'repetition')),
  },
  {
    n: 4,
    nom: 'La somme des 3 répétitions en A1Z26 (132 → 6)',
    attendu: 85,
    // ÉCART DE MODÉLISATION : le README tire un 6 du triplet et les DEUX autres
    // des tirets « touche du 6 » en AZERTY. Or `m.azertyColonne` du catalogue
    // ne mappe pas le `-` : la recherche ne trouve AUCUN chemin depuis « - ».
    // On modélise donc la somme A1Z26 des trois répétitions (8+15+16+5 trois
    // fois = 132 → 1+3+2 = 6), appliquée aux trois 6.
    parts: () => [0, 1, 2].map(() => part(TRIPLE[0],
      ['f.lettres', 't.caracteres', 'm.a1z26', 'c.somme', 'p.racineNumerique'])),
  },
  {
    n: 5,
    nom: 'L’affichage 7 segments, traits fusionnés (3+4+4+4 = 15 → 6)',
    attendu: 76,
    parts: () => HOPE.map((iv) => part(iv,
      ['t.caracteres', 'm.seg7Fusion', 'c.somme', 'p.racineNumerique'], 'repetition')),
  },
  {
    n: 6,
    nom: 'L’AZERTY et le retournement du 9 (6×9×10×3 = 1620 → 9 → 6)',
    attendu: 48,
    // ÉCART DE MODÉLISATION : faute de tiret mappable, on garde les deux
    // ingrédients de la méthode 6 — le clavier AZERTY et le retournement du 9 —
    // en changeant l'arithmétique qui les relie.
    parts: () => HOPE.map((iv) => part(iv,
      ['t.caracteres', 'm.azertyColonne', 'c.produit', 'p.racineNumerique', 'p.retournement'], 'repetition')),
  },
  {
    n: 7,
    nom: 'La soustraction (8−15−16−5 = −28 → −2+8 = 6)',
    attendu: 74,
    parts: () => HOPE.map((iv) => part(iv,
      ['t.caracteres', 'm.a1z26', 'c.soustraction', 'p.reductionSignee'], 'repetition')),
  },
];

test(`étalonnage — l’arithmétique des 7 méthodes du README tombe juste (${source})`, () => {
  for (const m of METHODES) {
    for (const p of m.parts()) {
      const fin = p.chemin.etats[p.chemin.etats.length - 1];
      assert.equal(fin.type, 'NUM', `M${m.n} : ${p.fragment.texte}`);
      assert.equal(fin.valeur, 6, `M${m.n} « ${p.fragment.texte} » donne ${fin.valeur} et non 6`);
    }
  }
});

test('étalonnage — écart mesuré avec le tableau attendu de research §4.7', () => {
  const ctx = { saisie: SAISIE, signifiants: zonesSignifiantes(SAISIE) };
  const jetons = tokeniser(SAISIE);
  const mesures = METHODES.map((m) => {
    const parts = m.parts();
    const a = { parts, ...deduireMode(parts, { saisie: SAISIE, jetons }) };
    noter(a, ctx);
    return { ...m, approche: a, obtenu: a.score / 100, brut: a.scoreBrut / 100 };
  });

  const parRang = (liste, cle) => {
    const tri = [...liste].sort((x, y) => y[cle] - x[cle]);
    return new Map(tri.map((x, i) => [x.n, i + 1]));
  };
  const rangsAttendus = parRang(mesures, 'attendu');
  const rangsObtenus = parRang(mesures, 'obtenu');

  const lignes = [
    'Méthode README                                    attendu  obtenu  écart   rang att./obt.  H     N     U     C     A     E     mode',
  ];
  let ecartTotal = 0;
  for (const m of mesures) {
    const c = m.approche.criteres;
    const mille = (x) => (x / 1000).toFixed(2);
    const ecart = m.obtenu - m.attendu;
    ecartTotal += Math.abs(ecart);
    lignes.push(
      `M${m.n} ${m.nom.slice(0, 44).padEnd(45)} `
      + `${String(m.attendu).padStart(5)}  ${m.obtenu.toFixed(1).padStart(6)}  `
      + `${(ecart >= 0 ? '+' : '') + ecart.toFixed(1)}`.padStart(7)
      + `   ${rangsAttendus.get(m.n)} → ${rangsObtenus.get(m.n)}`.padEnd(16)
      + `  ${mille(c.H)}  ${mille(c.N)}  ${mille(c.U)}  ${mille(c.C)}  ${mille(c.A)}  ${mille(c.E)}  ${m.approche.mode}`,
    );
  }
  const ecartMoyen = ecartTotal / mesures.length;
  const rangsIdentiques = mesures.filter((m) => rangsAttendus.get(m.n) === rangsObtenus.get(m.n)).length;
  lignes.push(`écart absolu moyen : ${ecartMoyen.toFixed(1)} points sur 100 · `
    + `${rangsIdentiques}/7 rangs identiques à la prédiction`);
  lignes.push(`poids en vigueur : ${JSON.stringify(POIDS)}`);
  const satures = mesures.filter((m) => m.brut > 100);
  if (satures.length) {
    lignes.push(`⚠ ${satures.length}/7 méthodes dépassent le plafond de 100 avant bornage `
      + `(brut : ${satures.map((m) => `M${m.n}=${m.brut.toFixed(1)}`).join(', ')})`);
  }
  console.log('    ' + lignes.join('\n    '));

  // ── Ce qui est réellement exigé : le COMPORTEMENT, pas la valeur.
  // 1. La méthode 6 (la plus tordue) est la moins bien classée, mais présente.
  assert.equal(rangsObtenus.get(6), 7, 'la méthode 6 doit rester en queue de classement');
  // 2. Les méthodes 2 et 3 (les plus « naturelles ») restent dans la moitié
  //    haute. La prédiction les voulait 1ʳᵉ et 2ᵉ ; le catalogue réel leur donne
  //    une notoriété de 0,60 (contre 0,85 prédite), ce qui les fait glisser.
  //    C'est exactement le genre d'écart que cet étalonnage sert à exposer.
  assert.ok(rangsObtenus.get(2) <= 4, `méthode 2 au rang ${rangsObtenus.get(2)}`);
  assert.ok(rangsObtenus.get(3) <= 4, `méthode 3 au rang ${rangsObtenus.get(3)}`);
  // 2 bis. Elles sont corrélées par construction : leurs scores doivent coller.
  const m2 = mesures.find((x) => x.n === 2);
  const m3 = mesures.find((x) => x.n === 3);
  assert.ok(Math.abs(m2.obtenu - m3.obtenu) < 1,
    'les méthodes 2 et 3 sont statistiquement corrélées : leurs scores doivent être quasi identiques');
  // 3. Aucune méthode du README ne tombe sous le plafond du joker (45/100).
  for (const m of mesures) assert.ok(m.obtenu > 45, `M${m.n} = ${m.obtenu} ≤ 45 (plafond du joker)`);
  // 4. L'ordre reste total et strict.
  const tri = [...mesures.map((m) => m.approche)].sort(ordreTotal);
  assert.equal(new Set(tri.map((a) => `${a.score}|${a.L}|${a.codes}`)).size, 7);
});

test('étalonnage — sensibilité : modifier un poids déplace bien le classement', () => {
  const ctx = { saisie: SAISIE, signifiants: zonesSignifiantes(SAISIE) };
  const jetons = tokeniser(SAISIE);
  const noterAvec = (poids) => {
    const sauvegarde = { ...POIDS };
    Object.assign(POIDS, poids);
    try {
      return METHODES.map((m) => {
        const parts = m.parts();
        const a = { parts, ...deduireMode(parts, { saisie: SAISIE, jetons }) };
        noter(a, ctx);
        return a.score;
      });
    } finally {
      Object.assign(POIDS, sauvegarde);
    }
  };
  const base = noterAvec({});
  // Tout le poids sur la notoriété : la méthode 1 (traduction, notoriété 0,15)
  // doit décrocher franchement.
  const notoriete = noterAvec({ homogeneite: 0, notoriete: 1000, couverture: 0, concision: 0, antiAdHoc: 0, elegance: 0 });
  assert.notDeepEqual(notoriete, base, 'les poids doivent être effectifs');
  assert.ok(notoriete[0] < notoriete[1], 'M1 (traduction) doit passer sous M2 quand la notoriété domine');
  // Et les poids sont bien restaurés.
  assert.deepEqual(noterAvec({}), base);
});
