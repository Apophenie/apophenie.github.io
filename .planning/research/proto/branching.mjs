// Prototype jetable : estimation du facteur de branchement et de la densite de 6
// dans l'espace des compositions de transformations NumHeroLOLgeek.
// Node >= 18. Usage: node branching.mjs

// ---------------------------------------------------------------- types d'etat
// 'STR'    : chaine
// 'TOKENS' : liste de chaines
// 'NUMS'   : liste de nombres
// 'NUM'    : nombre unique

const A1Z26 = c => c.toLowerCase().charCodeAt(0) - 96;
const VOW = 'aeiouy';
// nb de segments allumes en afficheur 7 segments (majuscules approximatives)
const SEG7 = { a:6,b:5,c:4,d:5,e:5,f:4,g:5,h:4,i:2,j:4,k:4,l:3,m:5,n:4,o:6,p:5,q:5,r:3,s:5,t:4,u:5,v:5,w:5,x:5,y:4,z:5 };
// nb de traits pour dessiner la majuscule (traits continus)
const STROKES = { a:3,b:3,c:1,d:2,e:4,f:3,g:2,h:3,i:1,j:1,k:3,l:2,m:4,n:3,o:1,p:2,q:2,r:3,s:1,t:2,u:1,v:2,w:4,x:2,y:3,z:3 };
// nb d'extremites libres de la majuscule
const ENDS = { a:2,b:0,c:2,d:0,e:3,f:3,g:2,h:4,i:2,j:2,k:4,l:2,m:4,n:4,o:0,p:1,q:1,r:3,s:2,t:3,u:2,v:2,w:4,x:4,y:3,z:2 };
// chiffre partageant la touche AZERTY
const AZERTY = { '&':1,'e':2,'"':3,"'":4,'(':5,'-':6,'e2':7,'_':8,'c':9,'a':0 };

const reduceDigits = n => { let x = Math.abs(n); while (x > 9) x = String(x).split('').reduce((a, d) => a + +d, 0); return n < 0 ? -x : x; };

// ------------------------------------------------------------------ operateurs
// { id, from, to, fn }  fn renvoie null si non applicable
const OPS = [
  // --- STR -> STR (filtres) ---
  { id:'strip-scheme', from:'STR', to:'STR', fn:s => s.replace(/^[a-z]+:\/\//i,'') },
  { id:'strip-tld',    from:'STR', to:'STR', fn:s => s.replace(/\.[a-z]{2,4}(\/.*)?$/i,'') },
  { id:'keep-letters', from:'STR', to:'STR', fn:s => s.replace(/[^a-z]/gi,'') },
  { id:'drop-vowels',  from:'STR', to:'STR', fn:s => s.replace(/[aeiouy]/gi,'') },
  { id:'drop-conson',  from:'STR', to:'STR', fn:s => s.replace(/[^aeiouy\W\d_]/gi,'') },
  { id:'dedup-letters',from:'STR', to:'STR', fn:s => [...new Set(s.split(''))].join('') },
  { id:'before-slash', from:'STR', to:'STR', fn:s => s.includes('/') ? s.split('/')[0] : null },
  { id:'after-slash',  from:'STR', to:'STR', fn:s => s.includes('/') ? s.split('/').slice(1).join('/') : null },
  { id:'lower',        from:'STR', to:'STR', fn:s => s.toLowerCase() },
  { id:'reverse',      from:'STR', to:'STR', fn:s => s.split('').reverse().join('') },

  // --- STR -> TOKENS (decoupes) ---
  { id:'split-letters', from:'STR', to:'TOKENS', fn:s => s.replace(/[^a-z]/gi,'').split('') },
  { id:'split-words',   from:'STR', to:'TOKENS', fn:s => s.split(/[^a-z]+/i).filter(Boolean) },
  { id:'split-dash',    from:'STR', to:'TOKENS', fn:s => s.includes('-') ? s.split('-') : null },
  { id:'split-dot',     from:'STR', to:'TOKENS', fn:s => s.includes('.') ? s.split('.') : null },

  // --- STR -> NUM (mesures directes) ---
  { id:'len',        from:'STR', to:'NUM', fn:s => s.replace(/[^a-z]/gi,'').length },
  { id:'count-vow',  from:'STR', to:'NUM', fn:s => (s.match(/[aeiouy]/gi)||[]).length },
  { id:'count-cons', from:'STR', to:'NUM', fn:s => (s.replace(/[^a-z]/gi,'').match(/[^aeiouy]/gi)||[]).length },
  { id:'count-dash', from:'STR', to:'NUM', fn:s => (s.match(/-/g)||[]).length },
  { id:'count-uniq', from:'STR', to:'NUM', fn:s => new Set(s.replace(/[^a-z]/gi,'').toLowerCase()).size },

  // --- TOKENS -> NUMS (mappeurs) ---
  { id:'map-a1z26',  from:'TOKENS', to:'NUMS', fn:t => t.map(x => x.length===1 && /[a-z]/i.test(x) ? A1Z26(x) : null).some(v=>v===null) ? null : t.map(x=>A1Z26(x)) },
  { id:'map-seg7',   from:'TOKENS', to:'NUMS', fn:t => t.every(x=>x.length===1 && SEG7[x.toLowerCase()]) ? t.map(x=>SEG7[x.toLowerCase()]) : null },
  { id:'map-strokes',from:'TOKENS', to:'NUMS', fn:t => t.every(x=>x.length===1 && STROKES[x.toLowerCase()]) ? t.map(x=>STROKES[x.toLowerCase()]) : null },
  { id:'map-ends',   from:'TOKENS', to:'NUMS', fn:t => t.every(x=>x.length===1 && ENDS[x.toLowerCase()]!==undefined) ? t.map(x=>ENDS[x.toLowerCase()]) : null },
  { id:'map-len',    from:'TOKENS', to:'NUMS', fn:t => t.map(x => x.replace(/[^a-z]/gi,'').length) },
  { id:'map-rank',   from:'TOKENS', to:'NUMS', fn:t => t.map((_,i)=>i+1) },
  { id:'map-azerty', from:'TOKENS', to:'NUMS', fn:t => t.every(x=>AZERTY[x]!==undefined) ? t.map(x=>AZERTY[x]) : null },

  // --- TOKENS -> NUM ---
  { id:'count-tokens', from:'TOKENS', to:'NUM', fn:t => t.length },
  { id:'count-distinct-tok', from:'TOKENS', to:'NUM', fn:t => new Set(t).size },

  // --- NUMS -> NUMS ---
  { id:'reduce-each', from:'NUMS', to:'NUMS', fn:n => n.map(reduceDigits) },
  { id:'drop-zeros',  from:'NUMS', to:'NUMS', fn:n => n.some(x=>x===0) ? n.filter(x=>x!==0) : null },

  // --- NUMS -> NUM (combinateurs) ---
  { id:'sum',       from:'NUMS', to:'NUM', fn:n => n.reduce((a,b)=>a+b,0) },
  { id:'prod',      from:'NUMS', to:'NUM', fn:n => n.length<=6 ? n.reduce((a,b)=>a*b,1) : null },
  { id:'alt-sub',   from:'NUMS', to:'NUM', fn:n => n.reduce((a,b,i)=> i===0?b:a-b, 0) },
  { id:'first-minus-rest', from:'NUMS', to:'NUM', fn:n => n.length<2?null:n[0]-n.slice(1).reduce((a,b)=>a+b,0) },
  { id:'max',       from:'NUMS', to:'NUM', fn:n => Math.max(...n) },
  { id:'min',       from:'NUMS', to:'NUM', fn:n => Math.min(...n) },
  { id:'range',     from:'NUMS', to:'NUM', fn:n => Math.max(...n)-Math.min(...n) },
  { id:'count',     from:'NUMS', to:'NUM', fn:n => n.length },
  { id:'concat-digits', from:'NUMS', to:'NUM', fn:n => n.every(x=>x>=0&&x<=9)&&n.length<=6 ? +n.join('') : null },

  // --- NUM -> NUM (finisseurs) ---
  { id:'digitsum',  from:'NUM', to:'NUM', fn:n => Math.abs(n)>9 ? String(Math.abs(n)).split('').reduce((a,d)=>a+ +d,0)*Math.sign(n||1) : null },
  { id:'reduce',    from:'NUM', to:'NUM', fn:n => Math.abs(n)>9 ? reduceDigits(n) : null },
  { id:'abs',       from:'NUM', to:'NUM', fn:n => n<0 ? -n : null },
  { id:'flip9',     from:'NUM', to:'NUM', fn:n => n===9 ? 6 : null },      // joker cosmetique
  { id:'split-and-sub', from:'NUM', to:'NUM', fn:n => { const a=String(Math.abs(n)); return a.length===2 ? Math.abs(+a[1]-+a[0]) : null; } },
  { id:'mod9',      from:'NUM', to:'NUM', fn:n => Math.abs(n)>9 ? ((Math.abs(n)-1)%9)+1 : null },
];

// -------------------------------------------------------------- canonicalisation
const keyOf = st => st.type + '|' + (st.type==='STR' ? st.v : st.type==='NUM' ? st.v : JSON.stringify(st.v));

// ----------------------------------------------------------------------- BFS
function explore(input, maxDepth = 6, maxNodes = 300000) {
  const start = { type:'STR', v: input };
  let frontier = [{ st:start, path:[] }];
  const seen = new Map([[keyOf(start), 0]]);
  const hits = [];
  const perDepth = [];
  let nodes = 1, edgesTried = 0, edgesKept = 0;

  for (let d = 0; d < maxDepth && frontier.length && nodes < maxNodes; d++) {
    const next = [];
    let expansions = 0, children = 0;
    for (const { st, path } of frontier) {
      for (const op of OPS) {
        if (op.from !== st.type) continue;
        edgesTried++;
        let out;
        try { out = op.fn(st.v); } catch { out = null; }
        if (out === null || out === undefined) continue;
        if (op.to === 'STR' && (out === '' || out === st.v)) continue;
        if (op.to === 'TOKENS' && (!out.length || (out.length === 1 && out[0] === st.v))) continue;
        if (op.to === 'NUMS' && !out.length) continue;
        if (op.to === 'NUM' && !Number.isFinite(out)) continue;
        edgesKept++; children++;
        const ns = { type: op.to, v: out };
        const p = [...path, op.id];
        if (ns.type === 'NUM' && ns.v === 6) hits.push(p);
        const k = keyOf(ns);
        if (seen.has(k)) continue;          // dedup sur etat canonique
        seen.set(k, d + 1); nodes++;
        next.push({ st: ns, path: p });
      }
      expansions++;
    }
    perDepth.push({ depth: d + 1, frontierIn: frontier.length, childrenGenerated: children,
                    branching: +(children / Math.max(1, expansions)).toFixed(2),
                    newStates: next.length });
    frontier = next;
  }
  return { hits, perDepth, nodes, edgesTried, edgesKept, seen };
}

// ---------------------------------------------------------------------- runs
const INPUTS = [
  'https://hope-hope-hope.fr/',
  'hope',
  'macron',
  'https://www.example.com/path/to/page',
  'Le chat dort sur le tapis rouge du salon',
  'a',
  '42',
  'Wikipedia',
];

for (const inp of INPUTS) {
  const t0 = performance.now();
  const r = explore(inp, 6);
  const t1 = performance.now();
  const shortest = r.hits.length ? Math.min(...r.hits.map(h => h.length)) : null;
  const byLen = {};
  for (const h of r.hits) byLen[h.length] = (byLen[h.length] || 0) + 1;
  console.log('\n=== ' + JSON.stringify(inp));
  console.log(`  etats uniques=${r.nodes}  aretes essayees=${r.edgesTried} retenues=${r.edgesKept}  temps=${(t1-t0).toFixed(1)}ms`);
  console.log('  branchement par profondeur:', r.perDepth.map(p => `d${p.depth}:b=${p.branching} new=${p.newStates}`).join('  '));
  console.log(`  chemins ->6 : ${r.hits.length}  (plus court: ${shortest})  repartition par longueur:`, JSON.stringify(byLen));
  if (r.hits.length) {
    const sorted = [...r.hits].sort((a,b)=>a.length-b.length).slice(0,5);
    sorted.forEach(h => console.log('    * ' + h.join(' > ')));
  }
}

// ------------------------------------------- densite des valeurs NUM atteintes
console.log('\n=== distribution des NUM atteints pour "hope" (profondeur 5)');
{
  const r = explore('hope', 5);
  const dist = new Map();
  for (const [k, d] of r.seen) if (k.startsWith('NUM|')) {
    const v = +k.slice(4); dist.set(v, (dist.get(v)||0)+1);
  }
  const arr = [...dist.keys()].sort((a,b)=>a-b);
  console.log('  valeurs distinctes:', arr.length, '->', arr.slice(0,40).join(','), '...');
}
