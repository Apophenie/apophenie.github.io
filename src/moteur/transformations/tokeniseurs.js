/**
 * Découpes — `STR → TOKENS` et `NUM → NUMS`. Codes `t…` (CONTRACTS §4.1).
 *
 * Une découpe ne change aucune valeur : elle regroupe. Les tokens d'un même
 * groupe sont réunis par un `group`, le premier porte le texte du groupe
 * (`substitute`) et les autres tombent (`drop`) — le tout en une étape.
 */

import { sansAccents, VOYELLES_Y } from '../tables/alphabet.js';
import { bilingue, dire } from '../i18n.js';
import {
  def, etape, token, fusion, sortieCreee, sortieConservee, nomsTokens, enchainer,
} from './commun.js';
import { decouperMots } from './filtres.js';

const SEPARATEURS = /[-._/\s+~:?&=,;!]/;

// Les libellés dont `steps()` a besoin AVANT que `def()` ait figé l'opérateur.
const LIB_CARACTERES = bilingue('On prend les lettres une par une', 'Take the letters one by one');
const REG_CARACTERES = bilingue('Un caractère, un jeton', 'One character, one token');
const LIB_SEPARATEURS = bilingue('On ne garde que les séparateurs', 'Keep the separators only');
const REG_SEPARATEURS = bilingue('Les tirets, points et barres comptent aussi', 'Dashes, dots and slashes count too');
const LIB_CHIFFRES = bilingue('On éclate le nombre en chiffres', 'Break the number into digits');
const LIB_DECOUPER = bilingue('On découpe en sous-groupes', 'Cut it into sub-groups');
const estVoyelle = (c) => VOYELLES_Y.includes(sansAccents(c).toUpperCase());
const estLettre = (c) => /\p{L}/u.test(c);

/**
 * Étape « on découpe en sous-groupes », puis « chaque groupe devient un jeton ».
 *
 * ★ **Deux steps, et le premier est le découpage lui-même.** L'ancienne
 * version traçait les accolades une par une puis fusionnait dans la foulée : le
 * découpage n'existait jamais comme moment. Or c'est le cœur de la promesse du
 * README — « trois d'affilée, selon la même méthode » : il faut d'abord VOIR
 * que la saisie se partage en trois morceaux comparables.
 *
 *  ① `partition` — les tokens s'écartent aux frontières, se resserrent à
 *    l'intérieur, et une accolade numérotée se trace sous chaque groupe. Toutes
 *    en même temps : c'est UNE op, donc un seul recalcul du flux.
 *  ② `substitute` + `drop` — chaque tête de groupe prend le texte de son
 *    groupe, les surnuméraires s'effacent.
 */
function etapeGroupes(spec) {
  return (avant, apres, ctx) => {
    const groupes = spec.groupes(avant.valeur);
    const sortie = spec.sortie(avant, apres, ctx);
    const decoupe = [];
    const pairs = [];
    const perdus = [];
    groupes.forEach((g, k) => {
      const ids = g.indices.map((i) => ctx.ids[i]).filter(Boolean);
      if (!ids.length) return;
      decoupe.push({ targets: ids, label: `${k + 1}` });
      pairs.push({ target: ids[0], to: token(sortie[k], g.texte, 'letter') });
      perdus.push(...ids.slice(1));
    });

    const fusionner = etape(ctx, dire(spec.libelle, ctx.langue), dire(spec.regle, ctx.langue), enchainer([
      pairs.length ? { op: 'substitute', pairs, stagger: 60 } : null,
      perdus.length ? { op: 'drop', targets: perdus, stagger: 30 } : null,
    ]), { id: `s_${ctx.cle}_1` });

    // Découper en un seul morceau ne découpe rien : on passe directement à la
    // fusion (et `partition` refuserait, à juste titre, un groupe unique).
    if (decoupe.length < 2) return [fusionner];

    return [
      etape(ctx, dire(LIB_DECOUPER, ctx.langue), dire(spec.regle, ctx.langue),
        [{ op: 'partition', groups: decoupe }], { id: `s_${ctx.cle}_0` }),
      fusionner,
    ];
  };
}

/** Construit l'état `TOKENS` à partir d'une liste de groupes d'index. */
function assembler(valeur, traces, groupes) {
  if (!groupes.length) return null;
  return {
    valeur: groupes.map((g) => g.texte),
    traces: groupes.map((g) => fusion(g.indices.map((i) => traces[i] || []))),
  };
}

const groupesCaracteres = (valeur) => [...valeur].map((c, i) => ({ texte: c, indices: [i] }));

function groupesMots(valeur) {
  return decouperMots(valeur).map((m) => ({
    texte: m.texte,
    indices: Array.from({ length: m.fin - m.debut }, (_, k) => m.debut + k),
  }));
}

function groupesSeparateurs(valeur) {
  const out = [];
  [...valeur].forEach((c, i) => { if (SEPARATEURS.test(c)) out.push({ texte: c, indices: [i] }); });
  return out;
}

/**
 * Syllabation française approchée : coupe après un groupe vocalique suivi d'une
 * consonne elle-même suivie d'une voyelle (V-CV → V/CV, VCCV → VC/CV).
 */
function groupesSyllabes(valeur) {
  const chars = [...valeur];
  if (!chars.some(estLettre)) return [];
  const coupes = [];
  for (let i = 1; i < chars.length - 1; i++) {
    const precedent = chars[i - 1];
    const courant = chars[i];
    const suivant = chars[i + 1];
    if (!estLettre(courant) || !estLettre(precedent) || !estLettre(suivant)) continue;
    if (estVoyelle(precedent) && !estVoyelle(courant) && estVoyelle(suivant)) coupes.push(i);
    else if (!estVoyelle(precedent) && !estVoyelle(courant) && estVoyelle(suivant)
      && i >= 2 && estVoyelle(chars[i - 2])) coupes.push(i);
  }
  if (!coupes.length) return [];
  const out = [];
  let debut = 0;
  for (const c of [...coupes, chars.length]) {
    if (c <= debut) continue;
    out.push({
      texte: chars.slice(debut, c).join(''),
      indices: Array.from({ length: c - debut }, (_, k) => debut + k),
    });
    debut = c;
  }
  return out;
}

const brut = [
  {
    id: 't.caracteres', code: 'tca', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On prend les lettres une par une', 'Take the letters one by one'),
    regle: bilingue('Un caractère, un jeton', 'One character, one token'),
    notoriete: 0.95, cout: 1,
    apply: (valeur, traces) => (valeur.length ? assembler(valeur, traces, groupesCaracteres(valeur)) : null),
    sortie: sortieConservee,
    // ★ `move` SANS cible : un simple recalcul du flux. Avec `targets`, la
    // primitive comprend « amène ces tokens devant » et réordonne la ligne —
    // ce qui, sur une saisie découpée en plusieurs groupes, faisait passer le
    // deuxième groupe devant le premier. Prendre les lettres une par une ne
    // change l'ordre de rien : ça les désigne, une par une.
    steps: (avant, apres, ctx) => [etape(ctx, dire(LIB_CARACTERES, ctx.langue), dire(REG_CARACTERES, ctx.langue), enchainer([
      { op: 'move' },
      { op: 'pulse', targets: ctx.ids, stagger: 30 },
    ]))],
  },
  {
    id: 't.mots', code: 'tm', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On découpe en mots', 'Split into words'),
    regle: bilingue('Les séparateurs - . _ / marquent les mots', 'The separators - . _ / mark out the words'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const g = groupesMots(valeur);
      return g.length ? assembler(valeur, traces, g) : null;
    },
    groupes: groupesMots,
  },
  {
    id: 't.separateurs', code: 'tsp', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On ne garde que les séparateurs', 'Keep the separators only'),
    regle: bilingue('Les tirets, points et barres comptent aussi', 'Dashes, dots and slashes count too'),
    notoriete: 0.55,
    apply: (valeur, traces) => {
      const g = groupesSeparateurs(valeur);
      return g.length ? assembler(valeur, traces, g) : null;
    },
    sortie: sortieConservee,
    steps: (avant, apres, ctx) => {
      const idxSep = [];
      [...avant.valeur].forEach((c, i) => { if (SEPARATEURS.test(c)) idxSep.push(i); });
      const gardes = new Set(idxSep);
      return [etape(ctx, dire(LIB_SEPARATEURS, ctx.langue), dire(REG_SEPARATEURS, ctx.langue), enchainer([
        { op: 'drop', targets: ctx.ids.filter((_, i) => !gardes.has(i)), stagger: 30 },
        { op: 'highlight', targets: idxSep.map((i) => ctx.ids[i]), mode: 'select' },
      ]))];
    },
  },
  {
    id: 't.syllabes', code: 'tsy', famille: 'decoupe', from: 'STR', to: 'TOKENS',
    libelle: bilingue('On découpe en syllabes', 'Split into syllables'),
    regle: bilingue('Une voyelle, une consonne, une voyelle : on coupe entre',
      'Vowel, consonant, vowel: the cut goes in between'),
    notoriete: 0.25, adHoc: 0.15,
    apply: (valeur, traces) => {
      const g = groupesSyllabes(valeur);
      return g.length > 1 ? assembler(valeur, traces, g) : null;
    },
    groupes: groupesSyllabes,
  },
  {
    id: 't.chiffres', code: 'tch', famille: 'decoupe', from: 'NUM', to: 'NUMS',
    libelle: bilingue('On éclate le nombre en chiffres', 'Break the number into digits'),
    regle: bilingue('44 devient 4 et 4', '44 becomes 4 and 4'),
    notoriete: 0.90,
    apply: (valeur, traces) => {
      const chiffres = [...String(Math.abs(valeur))].map(Number);
      if (chiffres.length < 2) return null;
      const t = traces[0] || [];
      const signes = valeur < 0 ? [-chiffres[0], ...chiffres.slice(1)] : chiffres;
      return { valeur: signes, traces: signes.map(() => t) };
    },
    steps: (avant, apres, ctx) => {
      const sortie = nomsTokens(ctx, apres.valeur.length);
      // Éclatement pur : un `substitute` à `to` MULTIPLE — les chiffres naissent
      // pile sur les glyphes du nombre d'origine, et le layout les écarte.
      // (`reduce` ajouterait une addition, qui n'a pas lieu d'être ici.)
      const liaison = ctx.langue === 'en' ? 'and' : 'et';
      return [etape(ctx, dire(LIB_CHIFFRES, ctx.langue),
        `${avant.valeur} → ${apres.valeur.join(` ${liaison} `)}`, [
        {
          op: 'substitute',
          stagger: 90,
          pairs: [{
            target: ctx.ids[0],
            to: apres.valeur.map((d, i) => token(sortie[i], d, 'digit')),
          }],
        },
      ])];
    },
  },
];

export const TOKENISEURS = Object.freeze(brut.map((spec) => {
  const { groupes, ...reste } = spec;
  if (!groupes) return def(reste);
  const base = { ...reste, groupes, sortie: reste.sortie || sortieCreee };
  return def({ ...reste, steps: etapeGroupes(base) });
}));
