// Proto 3 : taux d'echec ("bredouille") sur un echantillon large, par profondeur max.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// on recharge le moteur du proto 1 en le re-evaluant (pas d'export dans le proto 1)
const src = readFileSync(new URL('./branching.mjs', import.meta.url), 'utf8');
const engineSrc = src.split('// ---------------------------------------------------------------------- runs')[0]
  + '\nexport { explore, OPS };\n';
const mod = await import('data:text/javascript;base64,' + Buffer.from(engineSrc).toString('base64'));
const { explore, OPS } = mod;

const SAMPLES = [
  'a','b','z','1','42','666','ok','no','hi','xy','ux','iv','q','le','et','on','ai','oh',
  'hope','love','peur','argent','vaccin','5g','chemtrail','illuminati','macron','trump','poutine',
  'https://hope-hope-hope.fr/','https://www.google.com','http://a.io','ftp://x.y/z',
  'Le chat dort','pizza','banane','chocolat','anticonstitutionnellement','oui','non','peut-etre',
  'jean-michel','marie-claire','w','ww','www','aaa','aaaa','zzz','abc','abcdef','qwerty','azerty',
  'Bonjour le monde','2026','01/01/2000','user@mail.com','#hashtag','!!!','...','---','   ',
  'Elon Musk','Bill Gates','OMS','ONU','UE','USA','CIA','FBI','NSA','GAFAM',
];

for (const maxD of [3, 4, 5, 6]) {
  let fails = [], tot = 0, sumNodes = 0, sumMs = 0, sumHits = 0;
  for (const s of SAMPLES) {
    const t0 = performance.now();
    const r = explore(s, maxD);
    sumMs += performance.now() - t0; sumNodes += r.nodes; tot++;
    sumHits += r.hits.length;
    if (!r.hits.length) fails.push(s);
  }
  console.log(`profondeur<=${maxD}: echecs ${fails.length}/${tot} (${(100*fails.length/tot).toFixed(1)}%)  ` +
    `noeuds moy=${(sumNodes/tot).toFixed(0)}  temps moy=${(sumMs/tot).toFixed(2)}ms  chemins moy=${(sumHits/tot).toFixed(0)}`);
  if (fails.length) console.log('   echecs:', JSON.stringify(fails));
}

// pire cas temps
console.log('\n--- pire cas temps (profondeur 6) ---');
const hard = ['https://www.example.com/path/to/page/and/more/segments/here',
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
  'a'.repeat(200)];
for (const s of hard) {
  const t0 = performance.now(); const r = explore(s, 6); const ms = performance.now() - t0;
  console.log(`  len=${s.length} noeuds=${r.nodes} temps=${ms.toFixed(1)}ms chemins=${r.hits.length}`);
}
