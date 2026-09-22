// .planning/banc/classement.mjs — le banc de mesure du classement.
//
//   node .planning/banc/classement.mjs            → le classement courant
//   node .planning/banc/classement.mjs --json     → la même chose, comparable
//   node .planning/banc/classement.mjs --detail   → avec le détail des critères
//   node .planning/banc/classement.mjs --saisie "…" → une seule saisie
//   node .planning/banc/classement.mjs --avant     → le classement SANS le
//                                                    barème d'élégance
//   node .planning/banc/classement.mjs --sans-triches → le classement avec les
//                                                    paliers de TRICHE mis à zéro
//   node .planning/banc/classement.mjs --sans-retouches → le classement avec
//                                                    l'ÉTAGE AMONT débranché
//
// ★ `--sans-retouches` est la ligne de base de `BAREME.RETOUCHE` : c'est contre
// ce classement-là que le palier a été réglé, liste à liste. L'étage est branché
// par défaut depuis que le barème le charge (`elegance.js`), et le drapeau ne
// sert plus qu'à retrouver l'avant — sans quoi un balayage du palier se
// comparerait à lui-même.
//
// ★ `--sans-triches` répond à une question de l'auteur, et à elle seule : « je
// ne suis pas sûr que les triches nécessitent une pénalité en plus de leur
// faible notoriété, qui a déjà cet effet ». Les quatre opérateurs tricheurs sont
// en effet punis DEUX FOIS — une fois dans le score de conviction (notoriété
// basse, `adHoc` haut), une fois dans le crédit d'élégance (les quatre paliers
// ci-dessous). Le drapeau neutralise la SECONDE peine et laisse la première
// intacte : ce que la comparaison montre alors, c'est ce que la double peine
// achète réellement. Il ne sert qu'à la mesure — le barème, lui, ne le lit pas.
//
// ★ Le filet temporel est NEUTRALISÉ ici (`filetTemporel: false`) : comparer un
// barème avant/après sur une base qui bouge sous la charge de la machine ne veut
// rien dire. C'est une option explicite, jamais un contournement silencieux.
//
// ⚠️ **ET ÇA NE SUFFIT PAS : NE LANCEZ PAS CE BANC PENDANT AUTRE CHOSE.**
// Constaté le 22 septembre 2026, et ça a coûté une fausse conclusion : la même
// mesure lancée pendant `bun run test` et lancée machine au repos donne deux
// classements DIFFÉRENTS — des voies entrent, d'autres sortent, sur des saisies
// que le changement mesuré ne touchait pas. Le filet temporel n'est donc pas le
// seul chemin par lequel l'horloge entre dans la recherche. Deux lancements
// consécutifs sur une machine au repos, eux, rendent le même octet : le banc est
// déterministe, c'est la CHARGE qui ne l'est pas. Mesurez au repos, et comparez
// deux mesures prises dans les mêmes conditions — jamais une d'hier avec une
// d'aujourd'hui.

import { creerMoteur } from '../../src/recherche/index.js';
import { CATALOGUE } from '../../src/moteur/catalogue.js';
import { BAREME } from '../../src/recherche/elegance.js';
import { CORPUS } from './_corpus.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const detail = args.includes('--detail');
const iSaisie = args.indexOf('--saisie');
const saisies = iSaisie >= 0 ? [args[iSaisie + 1]] : CORPUS;

// `--avant` débranche le barème d'élégance (le facteur ET la sélection à trois
// objectifs) sans débrancher la mesure : c'est ce qui rend l'avant/après
// comparable à tout moment, plutôt que d'être un souvenir dans un rapport.
const avant = args.includes('--avant');

// La neutralisation est faite AVANT la première notation, et par mutation du
// barème lui-même : c'est le seul point de passage des quatre paliers, et le
// crédit les relit à chaque appel (`detailDuCredit`). Aucun autre chemin de code
// ne change, donc l'écart observé ne peut venir que de là.
if (args.includes('--sans-triches')) {
  BAREME.MAJORITE = 0;
  BAREME.DECIMATION = 0;
  BAREME.ADDITION_SELECTIVE = 0;
  BAREME.REDECOUPAGE = 0;
}

// ★ `--plancher N` — DESCENDRE LE PLANCHER DU FACTEUR, et voir ce que la perte
//   pèserait si le barème cessait de jeter sa propre mesure.
//
//   Il répond à une question de l'auteur du 22 septembre 2026 : « la QUANTITÉ DE
//   SAISIE PERDUE […] doit peser ». Mesuré, le barème la pèse déjà, et
//   lourdement — mais `facteur()` borne le crédit à [`FACTEUR_PLANCHER`, 1 000],
//   et **66 % des voies du corpus (252 sur 381), 58 % des têtes de liste (11 sur
//   19), sont AU PLANCHER**. Pour elles, le facteur vaut 520 que le crédit brut
//   soit à −294 ou à −3 242 : perdre un peu et perdre énormément se paient
//   exactement pareil. Aucune repondération d'un poste de perte ne peut se voir
//   sur une voie déjà écrasée.
//
//   Le drapeau ne sert qu'à la mesure — le barème, lui, ne le lit pas. Il rend
//   reproductible un réglage qui a été mesuré PUIS ÉCARTÉ ; ce qu'il coûte est
//   écrit dans `.planning/A-VENIR.md`.
const iPlancher = args.indexOf('--plancher');
if (iPlancher >= 0) BAREME.FACTEUR_PLANCHER = Number(args[iPlancher + 1]);

const moteur = creerMoteur(CATALOGUE, {
  filetTemporel: false,
  elegance: !avant,
  retouches: !args.includes('--sans-retouches'),
});

const sortie = [];
for (const s of saisies) {
  const r = moteur.resoudre(s);
  const lignes = r.approches.map((a) => ({
    rang: a.rang,
    mode: a.mode,
    series: a.series || 1,
    score: a.score,
    elegance: a.elegance ?? null,
    // ★ Les deux lectures repondérées du même bilan : celle qui décide de la
    //   1ʳᵉ place (quantité à 1 %) et celle qui décide de la 2ᵈ (élégance à
    //   33 %). Sans elles, on voit le classement changer sans voir pourquoi.
    g1: (a.elegances && a.elegances.elegance) ?? null,
    g2: (a.elegances && a.elegances.triptyques) ?? null,
    suggestion: a.suggestion || null,
    L: a.L,
    codes: a.codes,
    criteres: a.criteres,
    titre: typeof a.titre === 'string' ? a.titre : (a.titre && a.titre.fr) || '',
  }));
  sortie.push({ saisie: s, tronqueTemps: r.tronqueTemps, approches: lignes });
}

if (json) {
  console.log(JSON.stringify(sortie, null, 1));
} else {
  for (const bloc of sortie) {
    console.log(`\n═══ ${bloc.saisie}${bloc.tronqueTemps ? '  ⚠ TRONQUÉ PAR LE TEMPS' : ''}`);
    for (const l of bloc.approches) {
      const c = l.criteres || {};
      const det = detail
        ? `  H=${c.H} N=${c.N} U=${c.U} C=${c.C} A=${c.A} E=${c.E}${c.R !== undefined ? ` R=${c.R}` : ''}${c.G !== undefined ? ` G=${c.G}` : ''}`
        : '';
      console.log(
        `${String(l.rang).padStart(2)}. ${String(l.score).padStart(5)}`
        + `${l.elegance === null ? '' : ` g=${String(l.elegance).padStart(4)}`}`
        + `${l.g1 === null ? '' : ` g1=${String(l.g1).padStart(4)} g2=${String(l.g2).padStart(4)}`}`
        + `${l.suggestion ? ` [${l.suggestion.padEnd(10)}]` : ''}`
        + ` ${String(l.series)}×666 L=${String(l.L).padStart(2)} ${l.mode.padEnd(11)} ${l.codes}${det}`,
      );
    }
  }
}
