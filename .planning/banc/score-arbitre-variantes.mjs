/* « Score arbitre » — les recalibrations du global, essayées SANS toucher au moteur.

   Le moteur rend ses listes une fois (même sélection qu'aujourd'hui) ; chaque
   variante recalcule les quatre axes de chaque voie à partir de ce que la voie
   porte déjà (parts, retouches, liaison, critères, bilan), re-range la liste
   ENTIÈRE par le nouveau global, et on relève les critères tirés des verdicts
   du 15 septembre 2026. Ce banc mesure donc l'ORDRE, pas un changement de
   membres : une voie absente de la liste (m14 sur « hope » au défaut) le reste.

   Leviers, chacun désactivable :
     retouches — les opérations d'une retouche comptent dans L, N et A ;
     plier     — un même programme posé sur plusieurs portées se facture une fois
                 (L, N, A), comme le lien l'écrit (`2+3:flt+mpy+mr9`) ;
     recours   — un facteur sur la cohérence, par opération « de dernier recours »
                 (traduction, complément à 9, absorption, redécoupage exact) ;
     selection — une sélection min/max jette des valeurs : l'exhaustivité le voit ;
     H         — l'homogénéité lue sur les programmes distincts pondérés par leurs parts.

   Usage : node .planning/banc/score-arbitre-variantes.mjs */
import { creerMoteur } from '../../src/recherche/index.js';
import {
  CORRESPONDANCE, LETTRE_DU_CRITERE, CURSEURS, CURSEURS_DEFAUT, pourcentagesDe,
  critereNotoriete, critereAntiAdHoc, critereConcision, longueurRendue, critereHomogeneite, similarite,
} from '../../src/recherche/score.js';
import { MAX_SERIES } from '../../src/config.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { CAS, COUPLES, V2, voie } from './score-arbitre-banc.mjs';

const MILLE = 1000;
const opsDe = (a) => [
  ...(a.retouches || []).flatMap((r) => r.chemin.ops),
  ...a.parts.flatMap((p) => p.chemin.ops),
  ...(a.liaison && a.liaison.op ? [a.liaison.op] : []),
];
const estTraduction = (o) => o.acception !== undefined;
// ⚠️ Par IDENTIFIANT : `posts.js` retire `complement` du descripteur publié —
//   lire `o.complement` rendait ce test toujours faux (mesuré).
const estComplement = (o) => o.id === 'p.complement9';
const estAbsorption = (o) => /^m\.absorption/.test(o.id);
const estRedecoupageExact = (o) => o.id === 'm.redecoupageExact';
export const proprietes = (a) => {
  const ops = opsDe(a);
  return {
    traduction: ops.some(estTraduction), pc9: ops.some(estComplement), mab: ops.some(estAbsorption),
    mrdE: ops.some(estRedecoupageExact), minMax: ((a.bilan && a.bilan.minMax) || 0) > 0,
    retouche: (a.retouches || []).length > 0,
  };
};
const propre = (a) => { const p = proprietes(a); return !p.traduction && !p.pc9 && !p.mab && !p.minMax; };

export function axesVariante(a, v) {
  const c = { ...a.criteres };
  const chemins = a.parts.map((p) => p.chemin);
  // Les programmes distincts, dans l'ordre d'apparition.
  const distincts = [];
  const vus = new Set();
  for (const ch of chemins) {
    const k = ch.ops.map((o) => o.code).join('+');
    if (!vus.has(k)) { vus.add(k); distincts.push(ch); }
  }
  const cheminsL = v.plier ? distincts : chemins;
  const retouches = v.retouches ? (a.retouches || []).map((r) => r.chemin) : [];
  const L = longueurRendue([...retouches, ...cheminsL]);
  c.C = critereConcision(L);
  const ops = [...retouches.flatMap((ch) => ch.ops), ...cheminsL.flatMap((ch) => ch.ops),
    ...(a.liaison && a.liaison.op ? [a.liaison.op] : [])];
  c.N = critereNotoriete(ops.length ? ops : [{ notoriete: 0 }]);
  c.A = critereAntiAdHoc(ops);
  const cleDe = (ch) => ch.ops.map((o) => o.code).join('+');
  const compteParProgramme = new Map();
  for (const ch of chemins) compteParProgramme.set(cleDe(ch), (compteParProgramme.get(cleDe(ch)) || 0) + 1);
  const comptes = [...compteParProgramme.values()].sort((x, y) => y - x);
  // ★ « majorite » : le repli ne vaut que s'il existe UN programme strictement
  //   majoritaire — une méthode pour l'essentiel, une autre pour le reste. Une
  //   partition à trois méthodes distinctes garde l'homogénéité par paires.
  const majoriteStricte = comptes.length > 1 && comptes[0] >= 2 && comptes[0] > comptes[1];
  if ((v.H === 'parts' || (v.H === 'majorite' && majoriteStricte)) && chemins.length > 1) {
    // Moyenne, sur chaque part, de sa similarité au programme majoritaire (en parts).
    const compte = new Map();
    for (const ch of chemins) { const k = ch.ops.map((o) => o.code).join('+'); compte.set(k, (compte.get(k) || 0) + 1); }
    const majoritaire = distincts.slice().sort((x, y) => compte.get(y.ops.map((o) => o.code).join('+')) - compte.get(x.ops.map((o) => o.code).join('+')))[0];
    c.H = Math.floor(chemins.reduce((s, ch) => s + (ch === majoritaire || ch.ops.map((o) => o.code).join('+') === majoritaire.ops.map((o) => o.code).join('+') ? MILLE : similarite(ch, majoritaire)), 0) / chemins.length);
  } else if (v.plier) {
    c.H = critereHomogeneite(chemins);
  }
  const out = {};
  for (const axe of CURSEURS) {
    let somme = 0; let poids = 0;
    for (const [critere, apports] of Object.entries(CORRESPONDANCE)) {
      const w = apports[axe];
      if (!w) continue;
      somme += w * (c[LETTRE_DU_CRITERE[critere]] ?? MILLE); poids += w;
    }
    out[axe] = poids ? Math.round(somme / poids) : null;
  }
  if (v.courts && a.bilan && a.bilan.abandons && a.bilan.abandons.signifiants) {
    // ★ Le bloc court laissé de côté (< 3 lettres, le `.fr`) est l'exception que
    //   le barème accorde déjà (`EFFACE_BLOC_COURT`, `estPur`) : la couverture le
    //   pardonne aussi. On relit U sur ce que le bilan compte comme lu, plus ces blocs.
    const ab = a.bilan.abandons;
    const lus = Math.min(ab.signifiants, ab.lus + (ab.blocCourt || 0));
    const u = Math.floor((lus * MILLE) / ab.signifiants);
    const U = Math.floor((u * Math.floor(Math.sqrt(u * MILLE))) / MILLE);
    out.exhaustivite = Math.round((out.exhaustivite * CORRESPONDANCE.couverture.exhaustivite
      - (c.U ?? MILLE) * CORRESPONDANCE.couverture.exhaustivite + U * CORRESPONDANCE.couverture.exhaustivite)
      / CORRESPONDANCE.couverture.exhaustivite);
  }
  let R = c.R;
  if (v.selection && a.bilan && a.bilan.minMax) {
    // Une sélection garde une valeur sur n : le rendement de la voie la compte.
    let gardees = 0; let total = 0;
    for (const ch of chemins) {
      const etats = ch.etats || [];
      const fin = etats[etats.length - 1];
      const avant = etats[etats.length - 2];
      if (fin && fin.type === 'NUM' && avant && avant.type === 'NUMS' && /^c\.(min|max)$/.test(ch.ops[ch.ops.length - 1].id)) {
        gardees += 1; total += avant.valeur.length;
      } else { gardees += 1; total += 1; }
    }
    const rs = Math.floor((gardees * MILLE) / total);
    R = R === undefined || R === null ? rs : Math.min(R, rs);
  }
  if (R !== undefined && R !== null) out.exhaustivite = Math.round((out.exhaustivite + R) / 2);
  const series = Math.min(a.series || 1, MAX_SERIES);
  out.quantite = Math.round((series * MILLE) / MAX_SERIES);
  if (v.recours) {
    let f = MILLE;
    const p = proprietes(a);
    for (const [cle, facteur] of Object.entries(v.recours)) if (p[cle]) f = Math.floor((f * facteur) / MILLE);
    out.coherence = Math.floor((out.coherence * f) / MILLE);
  }
  return out;
}
export const globalDe = (axes, curseurs) => {
  const parts = pourcentagesDe(curseurs);
  let s = 0; let p = 0;
  for (const axe of CURSEURS) { s += (parts[axe] ?? 0) * axes[axe]; p += parts[axe] ?? 0; }
  return p ? Math.round(s / p) : -1;
};

/** Les critères tirés des verdicts — `liste` est rangée par la variante. */
const tete = (l) => voie(l[0].url);
const rang = (l, v) => l.findIndex((a) => voie(a.url) === v) + 1;
const avant = (l, x, y) => { const i = rang(l, x); const j = rang(l, y); return i > 0 && (j === 0 || i < j); };
const sansSi = (l, cle) => !proprietes(l[0])[cle] || l.every((a) => proprietes(a)[cle]);
const horsTop5 = (l, v) => { const i = rang(l, v); return i === 0 || i > 5; };
export const CRITERES = {
  1: (l) => [tete(l) === 'm14', 'tête m14'],
  2: (l) => [sansSi(l, 'mab'), 'tête sans mab'],
  3: (l) => [sansSi(l, 'traduction') && sansSi(l, 'mab'), 'tête sans traduction ni mab'],
  4: (l) => [sansSi(l, 'mab'), 'tête sans mab'],
  5: (l) => [sansSi(l, 'mab') && avant(l, 'fr17+mpy+meg', 'mt9+mab'), 'tête sans mab, fr17+mpy+meg devant mt9+mab'],
  6: (l) => [['fl+mazc+meg', 'fl+msfr+mad'].includes(tete(l)), 'tête fl+mazc+meg ou fl+msfr+mad'],
  7: (l) => [tete(l) === '0:nv,2+3:flt+mpy+mr9', 'tête 0:nv,2+3:flt+mpy+mr9'],
  8: (l) => [tete(l) !== '×3:m7F+cs+prn' && propre(l[0]), 'tête propre, pas la résonance m7F'],
  9: (l) => [propre(l[0]) && horsTop5(l, '0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9'), 'tête propre, partition pc9 hors du top 5'],
  10: (l) => [propre(l[0]), 'tête sans mab ni min/max'],
  11: (l) => [tete(l) === 'fr13+m14+meg', 'tête fr13+m14+meg'],
  12: (l) => [tete(l) === 'fl+m14' && horsTop5(l, '0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn'), 'tête fl+m14, partition hors du top 5'],
  13: (l) => [tete(l) === 'm14', 'tête m14 (absente de la liste : sélection)'],
  14: (l) => [sansSi(l, 'pc9') && sansSi(l, 'traduction') && horsTop5(l, '0+4:nc+pc9,2:fen5+nc+pc9'), 'tête sans pc9 ni traduction, partition hors du top 5'],
  15: (l) => [sansSi(l, 'pc9') && /meg$/.test(tete(l)) && horsTop5(l, '0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9'), 'tête meg sans pc9, partition hors du top 5'],
};

export const VARIANTES = {
  aujourdhui: {},
  retouches: { retouches: true },
  plier: { retouches: true, plier: true },
  plierH: { retouches: true, plier: true, H: 'parts' },
  recours: { retouches: true, plier: true, H: 'parts', selection: true, recours: { traduction: 300, pc9: 300, mab: 650 } },
  recoursCourts: { retouches: true, plier: true, H: 'parts', selection: true, courts: true, recours: { traduction: 300, pc9: 300, mab: 650 } },
  recoursCourtsSansH: { retouches: true, plier: true, selection: true, courts: true, recours: { traduction: 300, pc9: 300, mab: 650 } },
  recoursCourtsMaj: { retouches: true, plier: true, H: 'majorite', selection: true, courts: true, recours: { traduction: 300, pc9: 300, mab: 650 } },
  recoursDoux: { retouches: true, plier: true, H: 'parts', selection: true, recours: { traduction: 500, pc9: 400, mab: 750 } },
  recoursDur: { retouches: true, plier: true, H: 'parts', selection: true, recours: { traduction: 250, pc9: 250, mab: 550, minMax: 700 } },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = creerMoteur(catalogue, { filetTemporel: false });
  const listes = [];
  for (const c of CAS) {
    const opts = { fouille: c.fouille || 0 };
    if (c.v2) opts.curseurs = V2;
    listes.push({ nom: `cas ${c.n}`, n: c.n, curseurs: c.v2 ? V2 : CURSEURS_DEFAUT, liste: m.resoudre(c.saisie, opts).approches });
  }
  for (const [saisie, cible] of COUPLES) {
    listes.push({ nom: `${saisie} → ${cible}`, curseurs: CURSEURS_DEFAUT, liste: m.resoudre(saisie, { cible }).approches });
  }
  const choix = process.argv[2] ? process.argv[2].split(',') : Object.keys(VARIANTES);
  for (const nom of choix) {
    const v = VARIANTES[nom];
    let ok = 0;
    console.log(`\n══ variante ${nom} ${JSON.stringify(v)}`);
    for (const { nom: n, n: num, curseurs, liste } of listes) {
      const g = new Map(liste.map((a) => [a, globalDe(axesVariante(a, v), curseurs)]));
      const rangee = [...liste].sort((x, y) => (g.get(y) - g.get(x)) || (liste.indexOf(x) - liste.indexOf(y)));
      const cinq = rangee.slice(0, 5).map((a) => `${voie(a.url)} (${g.get(a)}${propre(a) ? '' : ' ✗'})`).join(' · ');
      if (num) {
        const [bon, dit] = CRITERES[num](rangee);
        if (bon) ok++;
        console.log(`${bon ? '✓' : '✗'} ${n} — ${dit} :: ${cinq}`);
      } else {
        console.log(`  ${n} :: ${cinq}`);
      }
    }
    console.log(`── ${ok}/15 critères tenus`);
  }
}
