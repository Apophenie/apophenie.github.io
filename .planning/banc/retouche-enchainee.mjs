// .planning/banc/retouche-enchainee.mjs — la forme ENCHAÎNÉE d'une retouche qui
// couvre toute la saisie (verdict n° 4), AVANT / APRÈS.
//
//   mkdir -p /tmp/avant && git archive main src | tar -x -C /tmp/avant
//   AVANT=/tmp/avant node .planning/banc/retouche-enchainee.mjs
//
// Ce qu'il vérifie, et pourquoi :
//   · ce que la réécriture CHANGE, nommément : `0:fr13;ma1+mab` → `fr13;ma1+mab`
//     quand — et seulement quand — la retouche couvre TOUTE la saisie ;
//   · les COLLISIONS qu'elle crée. `codes` sert au dernier départage de
//     `ordreTotal`, à la déduplication et aux bancs : deux voies qui portent la
//     même chaîne rendent l'ordre non total (§4.4-1). On les cherche dans
//     chaque liste, et on dit si les deux voies sont la MÊME démonstration
//     écrite autrement ou deux démonstrations distinctes ;
//   · que la voie s'OUVRE et se REJOUE : `rejouer(lire(url))` rend la même voie,
//     `scenarioDe` n'émet aucun avertissement, et `compile` passe.

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AVANT = process.env.AVANT;
const APRES = process.env.APRES || ICI;

/* Les curseurs v2 des huit premiers verdicts — `p25.200.50.150`. C'est SOUS
   CEUX-LÀ que le cas n° 4 (« Capitalisme ») montre sa retouche : au défaut, la
   voie retouchée n'entre pas dans la liste. */
const CURSEURS_V2 = {
  simplicite: 25, exhaustivite: 200, quantite: 50, coherence: 150,
};

/** Les saisies d'UN SEUL jeton : les seules que la réécriture touche. */
const UN_SEUL_MOT = [
  'Capitalisme', 'hope', 'Macron', 'macron', 'Wikipedia', 'satan',
  'numherololgeek', 'reinfocovid', 'apophenie', 'Millicent', 'zz', 'Wok', 'Jim',
];

/** Les saisies à plusieurs jetons : le témoin, rien ne doit y bouger. */
const PLUSIEURS_MOTS = [
  'Donald Trump', 'Henri Prunelle', 'Sarah Kerrigan', 'Éléonore à Nîmes',
  'Le chat dort sur le tapis rouge', 'hope-hope-hope.fr',
  'https://hope-hope-hope.fr/', 'numherololgeek.1000i100.fr', 'Marie Curie',
];

const CAS = [];
for (const saisie of [...UN_SEUL_MOT, ...PLUSIEURS_MOTS]) {
  for (const [nom, curseurs] of [['défaut', undefined], ['p25.200.50.150', CURSEURS_V2]]) {
    for (const fouille of [0, 1]) CAS.push({ saisie, nom, curseurs, fouille });
  }
}

async function cote(racine) {
  const { creerMoteur, lire } = await import(pathToFileURL(path.resolve(racine, 'src/recherche/index.js')).href);
  const { CATALOGUE } = await import(pathToFileURL(path.resolve(racine, 'src/moteur/catalogue.js')).href);
  return { moteur: creerMoteur(CATALOGUE, { filetTemporel: false }), lire };
}

const apres = await cote(APRES);
const avant = AVANT ? await cote(AVANT) : null;
const { compile } = await import(pathToFileURL(path.resolve(APRES, 'src/visuel/compile.js')).href);

const liste = (c, cas) => c.moteur.resoudre(cas.saisie, {
  fouille: cas.fouille, ...(cas.curseurs ? { curseurs: cas.curseurs } : {}),
}).approches;

let changees = 0;
let collisions = 0;
let preexistantes = 0;
let preexistants = 0;
let rejouees = 0;
let echecs = 0;
const dits = new Set();

for (const cas of CAS) {
  const lb = liste(apres, cas);
  const titre = `« ${cas.saisie} » [${cas.nom}, cran ${cas.fouille}]`;

  const la = avant ? liste(avant, cas) : null;

  // ── 1. Ce qui CHANGE, nommément ────────────────────────────────────────
  if (avant) {
    const ca = la.map((a) => a.codes);
    const cb = lb.map((a) => a.codes);
    for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
      if (ca[i] === cb[i]) continue;
      // La réécriture ne retire QUE le préfixe de portée : on ne signale que
      // les couples qui se correspondent à ce retrait près.
      if (ca[i] && cb[i] && ca[i].replace(/^0:/, '') === cb[i]) {
        const dit = `${ca[i]}  →  ${cb[i]}`;
        if (!dits.has(dit)) {
          dits.add(dit);
          changees++;
          console.log(`CHANGE  ${titre} : ${dit}`);
        }
      } else {
        console.log(`⚠️ ÉCART NON ATTENDU  ${titre} place ${i + 1} : ${ca[i] || '—'}  →  ${cb[i] || '—'}`);
        echecs++;
      }
    }
  }

  /* ── 2. Les COLLISIONS de `codes`, et LESQUELLES SONT NÔTRES ──────────────
     ⚠️ Il en existait AVANT cette réécriture, et elles n'ont rien à voir avec
       elle : la portée d'un FRAGMENT n'a jamais figuré dans `codes` (voir
       `index.js › marquerLesCodes`), si bien que `0:fr+mz26+mdc3` et
       `fr+mz26+mdc3` portent la même chaîne depuis toujours. On ne compte donc
       que les collisions que la réécriture CRÉE : présentes après, absentes
       avant. */
  const collisionsDe = (l) => {
    const vus = new Map();
    const out = new Map();
    for (const a of l) {
      const deja = vus.get(a.codes);
      if (deja) out.set(a.codes, [deja, a]);
      else vus.set(a.codes, a);
    }
    return out;
  };
  const apresCol = collisionsDe(lb);
  const avantCol = la ? collisionsDe(la) : new Map();
  for (const [codes, [x, y]] of apresCol) {
    if (avantCol.has(codes)) {
      preexistantes++;
      continue;
    }
    collisions++;
    // La MÊME démonstration écrite autrement, ou deux démonstrations ?
    console.log(`⚠️ COLLISION CRÉÉE  ${titre} : « ${codes} » deux fois — `
      + `${x.url === y.url ? 'MÊME lien, donc la même voie écrite deux fois'
        : `liens DIFFÉRENTS : ${x.url} ≠ ${y.url}`}`);
  }

  // ── 3. La voie s'ouvre et se rejoue ────────────────────────────────────
  for (const a of lb) {
    if (!a.codes.includes(';')) continue;
    rejouees++;
    const res = apres.moteur.rejouer(apres.lire(a.url));
    if (!res.ok) {
      console.log(`⚠️ REJEU KO  ${titre} : ${a.codes} — ${res.raison}`);
      echecs++;
      continue;
    }
    if (res.approche.codes !== a.codes) {
      console.log(`⚠️ REJEU AUTRE VOIE  ${titre} : ${a.codes} → ${res.approche.codes}`);
      echecs++;
      continue;
    }
    const sc = apres.moteur.scenarioDe(res.approche, { saisie: cas.saisie });
    if (sc.avertissements && sc.avertissements.length) {
      // Le même avertissement AVANT la réécriture ? Alors il ne vient pas d'elle.
      let deja = false;
      if (la) {
        const jumelle = la.find((x) => x.codes === a.codes || x.codes === a.codes.replace(/^/, '0:'));
        if (jumelle) {
          const r2 = avant.moteur.rejouer(avant.lire(jumelle.url));
          if (r2.ok) {
            const sc2 = avant.moteur.scenarioDe(r2.approche, { saisie: cas.saisie });
            deja = Boolean(sc2.avertissements && sc2.avertissements.length);
          }
        }
      }
      if (deja) preexistants++;
      else {
        console.log(`⚠️ AVERTISSEMENT  ${titre} : ${a.codes} — ${sc.avertissements.join(' | ')}`);
        echecs++;
      }
    }
    try {
      compile(sc);
    } catch (e) {
      console.log(`⚠️ COMPILE KO  ${titre} : ${a.codes} — ${e.message}`);
      echecs++;
    }
  }
}

console.log(`\n${CAS.length} cas — ${changees} formes réécrites, `
  + `${collisions} collisions CRÉÉES (${preexistantes} préexistantes, sur les portées de fragment), `
  + `${rejouees} voies retouchées rejouées, `
  + `${echecs} échecs (${preexistants} avertissements préexistants ignorés)`);
if (echecs || collisions) process.exitCode = 1;
