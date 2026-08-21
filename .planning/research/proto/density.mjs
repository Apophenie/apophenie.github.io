import * as T from './tables.mjs';
import { readFileSync } from 'node:fs';

// --- corpus ---------------------------------------------------------------
function loadWords(path, n = 4000) {
  const raw = readFileSync(path, 'latin1').split('\n')
    .map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
    .filter(w => /^[a-zA-Z]{2,14}$/.test(w) && w === w.toLowerCase());
  // échantillon régulier pour ne pas biaiser vers le début de l'alphabet
  const step = Math.max(1, Math.floor(raw.length / n));
  return raw.filter((_, i) => i % step === 0).slice(0, n);
}
const FR = loadWords('/usr/share/dict/french');
const EN = loadWords('/usr/share/dict/american-english');

// --- mappeurs (lettre -> nombre) -----------------------------------------
const MAPPERS = {
  'a1z26':            T.a1z26,
  'z26a1 (inverse)':  T.z26a1,
  'pythagoricien':    T.pythagorean,
  'chaldeen':         c => T.CHALDEAN[c.toUpperCase()],
  'english x6':       T.englishX6,
  'scrabble EN':      c => T.SCRABBLE_EN[c.toUpperCase()],
  'scrabble FR':      c => T.SCRABBLE_FR[c.toUpperCase()],
  't9':               c => T.T9[c.toUpperCase()],
  'morse signaux':    T.morseCount,
  'morse traits':     T.morseDashes,
  'ascii MAJ':        c => c.toUpperCase().charCodeAt(0),
  'ascii min':        c => c.toLowerCase().charCodeAt(0),
  '7seg segments':    T.seg7Count,
  '7seg traits fus.': T.seg7MergedStrokes,
  'traits MAJ':       c => T.STROKES_UPPER[c.toUpperCase()],
  'traits min':       c => T.STROKES_LOWER[c.toLowerCase()],
  'extremites MAJ':   c => T.ENDS_UPPER[c.toUpperCase()],
  'extremites min':   c => T.ENDS_LOWER[c.toLowerCase()],
  'boucles MAJ':      c => T.LOOPS_UPPER[c.toUpperCase()],
  'boucles min':      c => T.LOOPS_LOWER[c.toLowerCase()],
  'colonne azerty':   T.azertyCol,
  'colonne qwerty':   T.qwertyCol,
};

// --- combinateurs (nombres -> nombre) ------------------------------------
const COMBINERS = {
  'somme':        v => v.reduce((a, b) => a + b, 0),
  'soustraction': v => v.slice(1).reduce((a, b) => a - b, v[0]),
  'produit':      v => v.reduce((a, b) => a * b, 1),
  'max-min':      v => Math.max(...v) - Math.min(...v),
  'alternee':     v => v.reduce((a, b, i) => a + (i % 2 ? -b : b), 0),
};

// --- post-traitements (nombre -> nombre) ---------------------------------
const POSTS = {
  'brut':          n => n,
  '|abs|':         n => Math.abs(n),
  'somme chiffres':n => T.digitSum(n),
  'racine num.':   n => T.digitalRoot(n),
  'red. signee':   n => T.signedDigitReduce(n),
};

// --- filtres (mot -> mot) -------------------------------------------------
const FILTERS = {
  'aucun':        w => w,
  'voyelles':     w => [...w].filter(T.isVowel).join(''),
  'consonnes':    w => [...w].filter(c => !T.isVowel(c)).join(''),
  'dedoublonne':  w => [...new Set([...w])].join(''),
  'repetees':     w => [...w].filter((c, i, a) => a.indexOf(c) !== i || a.lastIndexOf(c) !== i).join(''),
  'initiales':    w => w[0] || '',
};

// --- comptages seuls (mot -> nombre), sans mappeur ------------------------
const COUNTERS = {
  'nb lettres':               w => w.length,
  'nb voyelles':              w => [...w].filter(T.isVowel).length,
  'nb consonnes':             w => [...w].filter(c => !T.isVowel(c)).length,
  'lettres + voyelles':       w => w.length + [...w].filter(T.isVowel).length,
  'lettres + consonnes':      w => w.length + [...w].filter(c => !T.isVowel(c)).length,
  'lettres distinctes':       w => new Set([...w]).size,
  'voyelles x consonnes':     w => [...w].filter(T.isVowel).length * [...w].filter(c => !T.isVowel(c)).length,
};

// --- balayage -------------------------------------------------------------
function scan(corpus, label) {
  const results = [];
  for (const [fn, filt] of Object.entries(FILTERS)) {
    for (const [mn, map] of Object.entries(MAPPERS)) {
      for (const [cn, comb] of Object.entries(COMBINERS)) {
        for (const [pn, post] of Object.entries(POSTS)) {
          let hit = 0, valid = 0;
          for (const w of corpus) {
            const s = filt(w);
            if (!s.length) continue;
            const v = [...s].map(map);
            if (v.some(x => x === undefined || Number.isNaN(x))) continue;
            const n = post(comb(v));
            valid++;
            if (n === 6) hit++;
          }
          if (valid > corpus.length * 0.5)
            results.push({ name: `${fn} | ${mn} | ${cn} | ${pn}`, p: hit / valid });
        }
      }
    }
  }
  for (const [cn, f] of Object.entries(COUNTERS))
    for (const [pn, post] of Object.entries(POSTS))
      results.push({ name: `-- | ${cn} | -- | ${pn}`, p: corpus.filter(w => post(f(w)) === 6).length / corpus.length });

  results.sort((a, b) => b.p - a.p);
  const avg = results.reduce((a, r) => a + r.p, 0) / results.length;
  const any = corpus.filter(w => {
    for (const filt of Object.values(FILTERS)) {
      const s = filt(w); if (!s.length) continue;
      for (const map of Object.values(MAPPERS)) {
        const v = [...s].map(map); if (v.some(x => x === undefined || Number.isNaN(x))) continue;
        for (const comb of Object.values(COMBINERS))
          for (const post of Object.values(POSTS)) if (post(comb(v)) === 6) return true;
      }
    }
    for (const f of Object.values(COUNTERS))
      for (const post of Object.values(POSTS)) if (post(f(w)) === 6) return true;
    return false;
  }).length / corpus.length;

  console.log(`\n### ${label} (${corpus.length} mots, ${results.length} pipelines)`);
  console.log(`Taux moyen de succes (P(resultat=6)) : ${(avg * 100).toFixed(2)} %`);
  console.log(`Mots couverts par AU MOINS un pipeline : ${(any * 100).toFixed(2)} %`);
  console.log(`\nTop 15 pipelines les plus "productifs" :`);
  results.slice(0, 15).forEach(r => console.log(`  ${(r.p * 100).toFixed(1).padStart(5)} %  ${r.name}`));
  console.log(`\nBas de tableau (5 moins productifs non nuls) :`);
  results.filter(r => r.p > 0).slice(-5).forEach(r => console.log(`  ${(r.p * 100).toFixed(2).padStart(5)} %  ${r.name}`));
  const zero = results.filter(r => r.p === 0).length;
  console.log(`\nPipelines a rendement nul : ${zero} / ${results.length}`);

  // distribution du nombre de pipelines gagnants par mot
  const counts = corpus.map(w => {
    let k = 0;
    for (const filt of Object.values(FILTERS)) {
      const s = filt(w); if (!s.length) continue;
      for (const map of Object.values(MAPPERS)) {
        const v = [...s].map(map); if (v.some(x => x === undefined || Number.isNaN(x))) continue;
        for (const comb of Object.values(COMBINERS))
          for (const post of Object.values(POSTS)) if (post(comb(v)) === 6) k++;
      }
    }
    return k;
  }).sort((a, b) => a - b);
  const q = p => counts[Math.floor(counts.length * p)];
  console.log(`Nb de pipelines donnant 6 par mot : min=${counts[0]} p10=${q(0.1)} median=${q(0.5)} p90=${q(0.9)} max=${counts[counts.length - 1]} moyenne=${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}`);
  return results;
}

scan(FR, 'Francais (/usr/share/dict/french)');
scan(EN, 'Anglais (/usr/share/dict/american-english)');

// densité par longueur de mot
console.log('\n### Nb moyen de pipelines gagnants selon la longueur du mot (FR)');
for (let L = 2; L <= 12; L++) {
  const sub = FR.filter(w => w.length === L);
  if (sub.length < 20) continue;
  let tot = 0;
  for (const w of sub) {
    for (const filt of Object.values(FILTERS)) {
      const s = filt(w); if (!s.length) continue;
      for (const map of Object.values(MAPPERS)) {
        const v = [...s].map(map); if (v.some(x => x === undefined || Number.isNaN(x))) continue;
        for (const comb of Object.values(COMBINERS))
          for (const post of Object.values(POSTS)) if (post(comb(v)) === 6) tot++;
      }
    }
  }
  console.log(`  L=${String(L).padStart(2)} (${String(sub.length).padStart(4)} mots) : ${(tot / sub.length).toFixed(1)} pipelines gagnants/mot`);
}
