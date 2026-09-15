/* « Score arbitre » — les deux lignes réservées, choisies au score global.

   L'autrice : « garde les deux mais sur la base du score global, et
   "élégance" et "abondance" me va bien. » Ce banc prend les listes que le
   moteur rend (même sélection, rangées par le global recalibré) et essaie
   plusieurs règles pour les deux lignes, SANS toucher au moteur :

     Élégance  — E0 : la tête du global ;
                 E1 : le global à 1 % de quantité (le 1 % de
                      `score.js › POIDS_DES_REGIMES.elegance`).
     Abondance — la voie la plus fournie (plus de séries que l'Élégance),
                 parmi les « bien notées » :
                 A1 : global ≥ celui de l'Élégance ;
                 A2 : global ≥ meilleur global − 28 (une série vaut 1000/9 de
                      quantité, soit ≈ 28 points de global au défaut) ;
                 A3 : global ≥ 95 % du meilleur global.

   Pour chaque liste : les lignes que chaque règle désigne, marquées ✗ si
   l'autrice a écarté cette voie (corpus du 15 septembre) et ⚠ si elle est
   bancale (traduction, pc9, absorption, min/max).

   Usage : node .planning/banc/score-arbitre-lignes.mjs */
import { creerMoteur } from '../../src/recherche/index.js';
import {
  scoreGlobal, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT, POIDS_DES_REGIMES,
} from '../../src/recherche/score.js';
import { estUneExtension } from '../../src/recherche/assemblage.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { CAS, COUPLES, V2, voie } from './score-arbitre-banc.mjs';
import { proprietes } from './score-arbitre-variantes.mjs';

/** Les voies que l'autrice a écartées en tête (moteur des cas 9 à 15, et les bancales nommées). */
const ECARTEES = new Set([
  'ffr2+ma1+mab', 'fl+ma1+mab', 'ma1+mab', '0:fr13;ma1+mab', 'mt9+mab', '2:flt;fl+ma1+mab', '×3:m7F+cs+prn',
  '0:mch+cs+prn,3.5:nc,9:fr13+nlc+pc9', '0:fatb+mt9+mr9,2:mt9+cmn', 'fr20+mazc+mrdE',
  '0.5:nc,5:nsp+mlet+nlc+pc9,6:ma1+cs+prn', 'fr21+masc+mrdE', '0+4:nc+pc9,2:fen5+nc+pc9',
  '0:nv,2.2:cnjd+pc9,5:fr13+nlc+pc9',
]);
const bancale = (a) => { const p = proprietes(a); return p.traduction || p.pc9 || p.mab || p.minMax; };

const meriteElegance = (a, curseurs) => {
  const axes = scoresParAxe(a);
  const parts = pourcentagesDe(curseurs);
  let s = 0; let p = 0;
  for (const axe of CURSEURS) {
    const w = (parts[axe] ?? 0) * (axe === 'quantite' ? POIDS_DES_REGIMES.elegance.quantite : 1000);
    s += w * axes[axe]; p += w;
  }
  return p ? Math.round(s / p) : -1;
};

const fiche = (a, g) => (a
  ? `${voie(a.url)} (g ${g(a)}, ×${a.series || 1})${ECARTEES.has(voie(a.url)) ? ' ✗' : ''}${bancale(a) ? ' ⚠' : ''}`
  : '—');

const m = creerMoteur(catalogue, { filetTemporel: false });
const listes = [];
for (const c of CAS) {
  const opts = { fouille: c.fouille || 0 };
  if (c.v2) opts.curseurs = V2;
  listes.push({ nom: `cas ${c.n} · ${c.saisie}${c.v2 ? ' · v2 (lignes débranchées au site)' : ''}`, opts, curseurs: c.v2 ? V2 : CURSEURS_DEFAUT });
}
for (const [saisie, cible] of COUPLES) listes.push({ nom: `${saisie} → ${cible}`, saisie, opts: { cible }, curseurs: CURSEURS_DEFAUT });
for (const s of ['jean-michel', 'Millicent', 'reinfocovid', 'Marie Curie', 'Macron', 'Donald Trump', 'https://hope-hope-hope.fr/']) {
  if (!listes.some((l) => l.nom.startsWith(`cas`) && l.nom.includes(`· ${s}`) && !l.nom.includes('v2'))) {
    listes.push({ nom: s, saisie: s, opts: {}, curseurs: CURSEURS_DEFAUT });
  }
}

const compte = { E0: 0, E1: 0, A1: 0, A2: 0, A3: 0, A4: 0 };
const fautes = { E0: 0, E1: 0, A1: 0, A2: 0, A3: 0, A4: 0 };
for (const [i, l] of listes.entries()) {
  const saisie = l.saisie ?? CAS[i].saisie;
  const liste = m.resoudre(saisie, l.opts).approches.filter((a) => a.mode !== 'JOKER');
  if (!liste.length) { console.log(`── ${l.nom} : LISTE VIDE`); continue; }
  const g = (a) => scoreGlobal(a, l.curseurs);
  const eligibles = liste.filter((a) => !estUneExtension(a));
  const base = eligibles.length ? eligibles : liste;
  const parGlobal = [...base].sort((x, y) => (g(y) - g(x)) || (liste.indexOf(x) - liste.indexOf(y)));
  const meilleurG = g(parGlobal[0]);
  const e = (a) => meriteElegance(a, l.curseurs);
  const elegances = {
    E0: parGlobal[0],
    E1: [...base].sort((x, y) => (e(y) - e(x)) || (g(y) - g(x)) || (liste.indexOf(x) - liste.indexOf(y)))[0],
  };
  console.log(`── ${l.nom} · ${liste.length} voies · meilleur global ${meilleurG}`);
  for (const [cle, el] of Object.entries(elegances)) {
    if (ECARTEES.has(voie(el.url)) || bancale(el)) fautes[cle]++;
    // A4 : A1, et l'Abondance ne cède pas plus au dernier recours que l'Élégance
    //   (`criteres.axe.recours`) — la règle retenue, après la faute de A1 sur
    //   « Marie Curie » (`fl+masc+mab`).
    const seuils = { A1: g(el), A2: meilleurG - 28, A3: Math.floor((meilleurG * 95) / 100), A4: g(el) };
    const recours = (a) => (a.criteres && a.criteres.axe && a.criteres.axe.recours) ?? 1000;
    const lignes = [];
    for (const [ca, seuil] of Object.entries(seuils)) {
      const plus = base.filter((a) => (a.series || 1) > (el.series || 1) && g(a) >= seuil
        && (ca !== 'A4' || recours(a) >= recours(el)))
        .sort((x, y) => ((y.series || 1) - (x.series || 1)) || (g(y) - g(x)) || (liste.indexOf(x) - liste.indexOf(y)));
      const ab = plus[0];
      if (ab) {
        if (cle === 'E1') compte[ca]++;
        if (cle === 'E1' && (ECARTEES.has(voie(ab.url)) || bancale(ab))) fautes[ca]++;
      }
      lignes.push(`${ca}≥${seuil} ${fiche(ab, g)}`);
    }
    if (cle === 'E1') compte.E1++; else compte.E0++;
    console.log(`   ${cle} Élégance ${fiche(el, g)}${cle === 'E1' ? ` [mérite ${e(el)}]` : ''} | Abondance : ${lignes.join(' · ')}`);
  }
}
console.log(`\n══ fautes (écartée ou bancale) — Élégance E0 ${fautes.E0}, E1 ${fautes.E1} ; `
  + `Abondance sous E1 : A1 ${fautes.A1}/${compte.A1}, A2 ${fautes.A2}/${compte.A2}, A3 ${fautes.A3}/${compte.A3}, `
  + `A4 ${fautes.A4}/${compte.A4}`);
