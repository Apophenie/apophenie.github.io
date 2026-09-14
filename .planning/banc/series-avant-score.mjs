/* « Séries avant score » — trois variantes mesurées, sans rien changer au moteur.

   La règle vit dans `score.js › ordreTotal` (et `ordrePondere`, son pendant aux
   curseurs) : au rang des SÉRIES, le compte de séries passe AVANT le score. Sur
   `hope-hope-hope.fr` au cran 2, elle fait tomber `fl+tca+m14` (4 séries,
   7 843) au 14ᵉ rang derrière des voies à 5 ou 6 séries notées jusqu'à 1 153.

   Ce banc NE CHANGE PAS LA SÉLECTION : il prend la liste que le moteur rend et
   la RE-RANGE selon chaque variante. Il mesure donc l'effet sur l'ordre — la
   question posée —, pas un éventuel changement de membres par le MMR.

   Les lignes RÉSERVÉES aux champions (`suggestion` « elegance » ou
   « triptyques ») restent en tête : la règle en cause ne les décide pas
   (`ordreElegance`, `ordreTriptyques`). Les variantes rangent ce qui suit.
   La variante (c) est mesurée deux fois : sur ce qui suit, et sur la liste
   entière — c'est la question des huit cas d'arbitrage.

     moteur — l'ordre rendu ;
     (a)    — les séries ne départagent que deux scores égaux ;
     (b)    — les séries en bonus proportionné : score × (1 + t × (séries − 1)),
              pour le classement seulement, à t = 10 % et t = 25 % ;
     (c)    — le score global affiché (les quatre axes pondérés par les
              curseurs de la liste, comme `resultat.js`).

   Partout la CONVERGENCE reste dernière : c'est une autre règle de l'autrice
   (« les mêmes caractères y servent trois fois »), que ce banc ne questionne pas.

   Usage : node .planning/banc/series-avant-score.mjs > sortie.json
   Déterministe : `filetTemporel: false`, aucune horloge, tris à clés totales. */
import {
  creerMoteur, scoresParAxe, pourcentagesDe, CURSEURS, CURSEURS_DEFAUT,
} from '../../src/recherche/index.js';
import { rangConviction, RANG } from '../../src/recherche/score.js';
import { catalogue } from '../../src/recherche/tests/_catalogue.js';
import { REFERENCES } from './_corpus.js';

const V2 = Object.freeze({ simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150 });
const ARBITRAGES = ['hope', 'Donald Trump', 'Éléonore à Nîmes', 'Capitalisme', 'Wikipedia',
  'Henri Prunelle', 'numherololgeek.1000i100.fr', 'https://hope-hope-hope.fr/'];
const BREVE = 'fl+tca+m14';

const m = creerMoteur(catalogue, { filetTemporel: false });

const globalAux = (curseurs) => {
  const parts = pourcentagesDe(curseurs);
  return (a) => {
    const ax = scoresParAxe(a);
    if (!ax) return -1;
    let somme = 0;
    let poids = 0;
    for (const axe of CURSEURS) {
      if (ax[axe] === null || ax[axe] === undefined) continue;
      somme += (parts[axe] ?? 0) * ax[axe];
      poids += parts[axe] ?? 0;
    }
    return poids ? Math.round(somme / poids) : -1;
  };
};

const derniere = (a) => (rangConviction(a) === RANG.CONVERGENCE ? 1 : 0);
const series = (a) => a.series || 1;
const departage = (a, b) => (series(b) - series(a)) || (a.L - b.L)
  || (a.codes < b.codes ? -1 : a.codes > b.codes ? 1 : 0);

const VARIANTES = {
  a: () => (x, y) => (derniere(x) - derniere(y)) || (y.score - x.score) || departage(x, y),
  b10: () => bonus(100),
  b25: () => bonus(250),
  c: (liste, curseurs) => {
    const g = globalAux(curseurs);
    return (x, y) => (g(y) - g(x)) || (liste.indexOf(x) - liste.indexOf(y));
  },
};
/** t en pour-mille par série au-delà de la première — arithmétique entière. */
function bonus(t) {
  const note = (a) => Math.floor((a.score * (1000 + t * (series(a) - 1))) / 1000);
  return (x, y) => (derniere(x) - derniere(y)) || (note(y) - note(x)) || departage(x, y);
}

const reservees = (liste) => {
  let n = 0;
  while (n < liste.length && ['elegance', 'triptyques'].includes(liste[n].suggestion)) n++;
  return n;
};
const ranger = (liste, cle, curseurs, entiere = false) => {
  const n = entiere ? 0 : reservees(liste);
  const reste = liste.slice(n).sort(VARIANTES[cle](liste, curseurs));
  return [...liste.slice(0, n), ...reste];
};

const fiche = (a, g) => (a ? {
  codes: a.codes, score: a.score, series: a.series ?? null, mode: a.mode, global: g(a), suggestion: a.suggestion ?? null,
} : null);

const cas = [];
const ajouter = (saisie, fouille, v2) => {
  if (!cas.some((c) => c.saisie === saisie && c.fouille === fouille && c.v2 === v2)) cas.push({ saisie, fouille, v2 });
};
for (const v2 of [false, true]) {
  for (const s of REFERENCES) ajouter(s, 0, v2);
  for (const f of [0, 1, 2, 3]) ajouter('hope-hope-hope.fr', f, v2);
  for (const s of ARBITRAGES) ajouter(s, 0, v2);
}

const sortie = { listes: {}, arbitrages: {} };
for (const c of cas) {
  const curseurs = c.v2 ? V2 : CURSEURS_DEFAUT;
  const opts = { fouille: c.fouille };
  if (c.v2) opts.curseurs = V2;
  const liste = m.resoudre(c.saisie, opts).approches;
  const g = globalAux(curseurs);
  const ordres = {
    moteur: liste,
    a: ranger(liste, 'a', curseurs),
    b10: ranger(liste, 'b10', curseurs),
    b25: ranger(liste, 'b25', curseurs),
    c: ranger(liste, 'c', curseurs),
    cEntiere: ranger(liste, 'c', curseurs, true),
  };
  const cle = `${c.saisie} @${c.fouille}${c.v2 ? ' v2' : ''}`;
  const ligne = { voies: liste.length, reservees: reservees(liste), rangBreve: {}, tete: {}, troisPremieres: {} };
  for (const [nom, o] of Object.entries(ordres)) {
    const i = o.findIndex((a) => a.codes === BREVE);
    ligne.rangBreve[nom] = i < 0 ? null : i + 1;
    ligne.tete[nom] = fiche(o[0], g);
    ligne.troisPremieres[nom] = o.slice(0, 3).map((a) => `${a.codes.slice(0, 60)} (${a.score}, ×${a.series ?? 1}, g ${g(a)})`);
  }
  sortie.listes[cle] = ligne;
  if (c.v2 && c.fouille === 0 && ARBITRAGES.includes(c.saisie)) {
    const moteur = liste[0];
    const parGlobal = ordres.cEntiere[0];
    const verdict = {};
    for (const nom of ['a', 'b10', 'b25', 'c', 'cEntiere']) {
      const t = ordres[nom][0];
      verdict[nom] = t === parGlobal && t !== moteur ? 'score global'
        : t === moteur && t !== parGlobal ? 'rang du moteur'
          : t === moteur && t === parGlobal ? 'les deux coïncident' : `autre tête : ${t.codes} (${t.score})`;
    }
    sortie.arbitrages[c.saisie] = {
      teteMoteur: fiche(moteur, g), teteGlobale: fiche(parGlobal, g), desaccord: moteur !== parGlobal, verdict,
    };
  }
}
console.log(JSON.stringify(sortie, null, 1));
