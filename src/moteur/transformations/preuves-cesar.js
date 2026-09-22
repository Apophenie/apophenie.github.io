/** Lectures numériques réutilisées par les Césars, indépendantes de leur cible.
 * Une preuve travaille sur une copie : ses opérations et leurs gestes restent
 * ceux du catalogue. Aucune réduction modulo 26 ni constante ajoutée.
 */
import { MESURES_STR, MAPPEURS } from './mappeurs.js';
import { COMBINATEURS } from './combinateurs.js';
import { FILTRES, decouperMots } from './filtres.js';
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
  const retenir = (ops, etats, contexte = {}) => {
    const fin = etats.at(-1);
    const valeurs = fin.type === 'NUM' ? [fin.valeur] : fin.valeur;
    valeurs.forEach((n, indice) => {
      if (Number.isInteger(n) && n >= 1 && n <= 25) {
        const conversions = ops.reduce((somme, op, i) => somme +
          (op.from === 'TOKENS' && op.to === 'NUMS' ? etats[i].valeur.length : 0), 0);
        preuves.push({ decalage: n, ops, etats, indice, type: 'conversion',
          lecture: 'complete', classe: 3, effort: conversions + ops.length,
          ...contexte });
      }
    });
  };
  for (const op of MESURES_STR.filter(disponible)) {
    const apres = appliquer(op, entree);
    if (apres) retenir([op], [entree, apres], { lecture: 'compte', classe: ['nl', 'nv', 'nc'].includes(op.code) ? 0 : 2 });
  }
  // Une justification peut ne lire que l'initiale : ne pas convertir les
  // lettres suivantes, même pour ne retenir ensuite que le premier résultat.
  const chars = [...valeur];
  const debut = chars.findIndex((c) => /\p{L}/u.test(c));
  const tca = TOKENISEURS.find((o) => o.code === 'tca');
  const initiale = str(chars[debut]);
  const jeton = appliquer(tca, initiale);
  for (const op of MAPPEURS.filter((o) => disponible(o) && o.from === 'TOKENS' && o.to === 'NUMS')) {
    const apres = appliquer(op, jeton);
    if (apres) retenir([tca, op], [initiale, jeton, apres], {
      lecture: 'initiale', classe: 0, sourceIndices: [debut],
      effort: op.code === 'ma1' ? 1 : 2,
    });
  }
  // Longueurs de deux mots voisins : les autres mots ne participent pas.
  const mots = decouperMots(valeur);
  const tm = TOKENISEURS.find((o) => o.code === 'tm');
  const mlm = MAPPEURS.find((o) => o.code === 'mlm');
  for (let i = 0; i + 1 < mots.length; i++) {
    const debut = mots[i].debut, fin = mots[i + 1].fin;
    const paire = str(chars.slice(debut, fin).join(''));
    const decoupee = appliquer(tm, paire);
    const longueurs = decoupee && appliquer(mlm, decoupee);
    if (!longueurs) continue;
    for (const op of COMBINATEURS.filter((o) => ['cst', 'cp', 'cs'].includes(o.code))) {
      const apres = appliquer(op, longueurs);
      if (apres) retenir([tm, mlm, op], [paire, decoupee, longueurs, apres], {
        lecture: 'mots-voisins', classe: 1, effort: 3,
        sourceIndices: Array.from({ length: fin - debut }, (_, j) => debut + j),
        mots: [i + 1, i + 2],
      });
    }
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
  // Barème propre aux justifications : aucune prime à l'exhaustivité.
  // Les conversions complètes restent un repli et paient chaque lettre lue.
  preuves.sort((a, b) => a.classe - b.classe || a.effort - b.effort
    || a.indice - b.indice);
  if (memo.size >= 256) memo.delete(memo.keys().next().value);
  memo.set(valeur, preuves);
  return preuves;
}

export function etapesPreuveNumerique(preuve, avant, ctx) {
  const en = ctx.langue === 'en';
  const titre = en ? `Why shift by ${preuve.decalage}?` : `Pourquoi décaler de ${preuve.decalage} ?`;
  const cle = `${ctx.cle}_preuve`;
  const copie = [...preuve.etats[0].valeur];
  const sources = preuve.sourceIndices ? preuve.sourceIndices.map((i) => ctx.ids[i]) : ctx.ids;
  const lecture = preuve.lecture === 'initiale'
    ? (en ? 'Read only the initial letter' : 'On lit seulement l’initiale')
    : preuve.lecture === 'mots-voisins'
      ? (en ? `Lengths of adjacent words ${preuve.mots.join(' and ')}`
        : `Longueurs des mots voisins ${preuve.mots.join(' et ')}`)
      : (en ? 'Read the shift on a copy of the text' : 'On lit le décalage sur une copie du texte');
  let ids = copie.map((_, i) => `${cle}_copie_${i}`);
  const steps = [etape({ ...ctx, cle }, titre,
    lecture, [
      { op: 'highlight', targets: sources, mode: 'select' },
      { op: 'insert', apres: ctx.ids.at(-1), tokens: copie.map((c, i) => token(ids[i], c)) },
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
