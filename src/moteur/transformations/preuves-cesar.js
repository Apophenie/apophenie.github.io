/** Lectures numériques réutilisées par les Césars, indépendantes de leur cible.
 * Une preuve travaille sur une copie : ses opérations et leurs gestes restent
 * ceux du catalogue. Aucune réduction modulo 26 ni constante ajoutée.
 */
import { MESURES_STR, MAPPEURS } from './mappeurs.js';
import { COMBINATEURS } from './combinateurs.js';
import { FILTRES } from './filtres.js';
import { TOKENISEURS } from './tokeniseurs.js';
import { str, tokens, nums, num } from '../etat.js';
import { tracesDe, etape, token } from './commun.js';
import { dire } from '../i18n.js';

const memo = new Map();
const fabriques = { STR: str, TOKENS: tokens, NUMS: nums, NUM: (v, t) => num(v, t[0]) };
function appliquer(op, avant) {
  if (op.admet && !op.admet(avant)) return null;
  const r = op.apply(avant.valeur, tracesDe(avant));
  return r == null ? null : fabriques[op.to](r.valeur, r.traces);
}
const disponible = (op) => !op.deprecated && !op.isJoker;

export function preuvesNumeriques(valeur) {
  if (typeof valeur !== 'string' || !/\p{L}/u.test(valeur)) return [];
  if (memo.has(valeur)) return memo.get(valeur);
  const entree = str(valeur);
  const preuves = [];
  const retenir = (ops, etats) => {
    const fin = etats.at(-1);
    const valeurs = fin.type === 'NUM' ? [fin.valeur] : fin.valeur;
    valeurs.forEach((n, indice) => {
      if (Number.isInteger(n) && n >= 1 && n <= 25) {
        preuves.push({ decalage: n, ops, etats, indice, type: 'conversion' });
      }
    });
  };
  for (const op of MESURES_STR.filter(disponible)) {
    const apres = appliquer(op, entree);
    if (apres) retenir([op], [entree, apres]);
  }
  // Toutes les découpes textuelles et toutes les conversions TOKENS → NUMS
  // entrent automatiquement, y compris les futures tables et comptages.
  const bases = [{ ops: [], etats: [entree] }];
  const lettres = FILTRES.find((o) => o.code === 'fl');
  const nettoyee = appliquer(lettres, entree);
  if (nettoyee) bases.push({ ops: [lettres], etats: [entree, nettoyee] });
  for (const base of bases) {
    for (const decoupe of TOKENISEURS.filter((o) => disponible(o) && o.from === 'STR')) {
      const decoupee = appliquer(decoupe, base.etats.at(-1));
      if (!decoupee) continue;
      for (const op of COMBINATEURS.filter((o) => disponible(o) && o.from === 'TOKENS' && o.to === 'NUM')) {
        const apres = appliquer(op, decoupee);
        if (apres) retenir([...base.ops, decoupe, op], [...base.etats, decoupee, apres]);
      }
      for (const op of MAPPEURS.filter((o) => disponible(o) && o.from === 'TOKENS' && o.to === 'NUMS')) {
        const apres = appliquer(op, decoupee);
        if (!apres) continue;
        const chemin = [...base.ops, decoupe, op], etats = [...base.etats, decoupee, apres];
        retenir(chemin, etats);
        for (const combinaison of COMBINATEURS.filter((o) => disponible(o) && o.from === 'NUMS' && o.to === 'NUM')) {
          const nombre = appliquer(combinaison, apres);
          if (nombre) retenir([...chemin, combinaison], [...etats, nombre]);
        }
      }
    }
  }
  // Préférence stable : lecture courte, puis première position, puis ordre
  // du catalogue. Plusieurs lectures peuvent justifier le même décalage.
  preuves.sort((a, b) => a.ops.length - b.ops.length || a.indice - b.indice);
  if (memo.size >= 256) memo.delete(memo.keys().next().value);
  memo.set(valeur, preuves);
  return preuves;
}

export function etapesPreuveNumerique(preuve, avant, ctx) {
  const en = ctx.langue === 'en';
  const titre = en ? `Why shift by ${preuve.decalage}?` : `Pourquoi décaler de ${preuve.decalage} ?`;
  const cle = `${ctx.cle}_preuve`;
  let ids = [...avant.valeur].map((_, i) => `${cle}_copie_${i}`);
  const steps = [etape({ ...ctx, cle }, titre,
    en ? 'Read the shift on a copy of the text' : 'On lit le décalage sur une copie du texte', [
      { op: 'highlight', targets: ctx.ids, mode: 'select' },
      { op: 'insert', apres: ctx.ids.at(-1), tokens: [...avant.valeur].map((c, i) => token(ids[i], c)) },
    ])];
  preuve.ops.forEach((op, i) => {
    const a = preuve.etats[i], b = preuve.etats[i + 1];
    const elements = a.type === 'NUM' ? [String(a.valeur)] : a.type === 'STR' ? [...a.valeur] : a.valeur.map(String);
    const c = { ...ctx, cle: `${cle}_${i}`, ids, groupes: ids.map((id, j) => [id, elements[j]]),
      elements, cibles: b.type === 'NUM' ? [String(b.valeur)] : b.type === 'STR' ? [...b.valeur] : b.valeur.map(String), op };
    steps.push(...op.steps(a, b, c));
    ids = op.sortie(a, b, c);
  });
  const selection = ids[preuve.indice];
  const regles = preuve.ops.map((o) => dire(o.regle, ctx.langue)).join(' · ');
  steps.push(etape({ ...ctx, cle: `${cle}_lu` }, titre,
    `${regles} · ${en ? 'Result at position' : 'Résultat en position'} ${preuve.indice + 1} : ${preuve.decalage}`, [
      { op: 'highlight', targets: [selection], mode: 'select' },
      { op: 'annotate', anchor: [selection], text: String(preuve.decalage), place: 'above', ecart: 1.2 },
    ]));
  steps.push(etape({ ...ctx, cle: `${cle}_fin` }, titre,
    en ? 'The original text is kept for the Caesar shift' : 'Le texte original est conservé pour le César', [
      { op: 'drop', targets: ids },
    ]));
  return steps;
}
