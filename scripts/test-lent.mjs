#!/usr/bin/env node
/**
 * ★ **LA SUITE LENTE, QUI PARLE PENDANT QU'ELLE TOURNE.**
 *
 * > « Ce serait pertinent de la décomposer en suites exécutées séparément,
 * >   séquentiellement, pour avoir des résultats test par test plutôt que tout
 * >   à la fin. En cas de crash, ça éviterait de reprendre du début ; en cas de
 * >   timeout du fait de la charge, ça permettrait du retry ciblé. » (l'autrice)
 *
 * `node --test` lâché sur les dix-sept fichiers lents n'écrit **rien** avant la
 * fin : trois quarts d'heure de silence, une heure sous charge. Un plantage
 * faisait tout reprendre depuis le début, et un rouge dû à la charge obligeait
 * à relancer à la main en devinant lequel.
 *
 * Ce lanceur prend exactement les mêmes fichiers, un processus par fichier, et
 * annonce chacun deux fois : au départ, puis au verdict. Six règles le tiennent :
 *
 *  1. **Un seul niveau de parallélisme.** `node --test` a le sien —
 *     `--test-concurrency`, qui compte des FICHIERS — et ce script a le sien.
 *     Les multiplier ouvrirait N × M processus pour rien. On donne donc
 *     `--test-concurrency=1` à chaque `node --test` (qui ne reçoit de toute
 *     façon qu'un seul fichier) et c'est ce script, et lui seul, qui ouvre les
 *     voies : `availableParallelism() / 2` par défaut.
 *  2. **Le rouge est rejoué SEUL**, rien d'autre en vol. S'il passe alors, il
 *     compte vert — mais il est SIGNALÉ « vert seul, rouge sous charge ». C'est
 *     une information sur la machine, pas un défaut à cacher sous le tapis.
 *     Cet isolement est strict : commencer une relance pendant que d'autres
 *     fichiers tournent encore raccourcirait la passe, mais rendrait l'étiquette
 *     FAUSSE. Une mesure bruitée reste une mesure ; une mesure fausse ne vaut
 *     rien.
 *  3. **Chaque fichier a un délai de garde, proportionné à lui-même.** Un blocage
 *     doit devenir un rouge, pas une heure de silence. Le budget vaut
 *     `facteur × sa durée de référence` (`scripts/durees-lentes.json`), avec un
 *     plancher ; sans référence, il prend le cas généreux. Il ne pouvait PAS
 *     s'agir d'une valeur unique : du plus court au plus long, ces fichiers
 *     s'étalent sur 39×, et 4 × le plus long donnerait des heures de corde à un
 *     fichier de 26 secondes. Un dépassement rend rouge, donc part en relance
 *     seule — où la charge a disparu.
 *  4. **Les plus longs partent en premier.** La queue d'une passe parallèle est
 *     dictée par son fichier le plus long : le lancer en dernier ajoute sa durée
 *     entière au temps au mur. L'ordre de LANCEMENT suit donc les durées
 *     décroissantes ; le bilan, lui, reste trié par chemin.
 *  5. **Aucun repli silencieux.** Un fichier dont on ne sait pas lire le bilan
 *     TAP est un échec, même si son processus est sorti avec 0. Et jamais plus
 *     de soixante secondes sans nouvelles : une ligne de vie dit ce qui est
 *     encore en vol, depuis combien de temps, et combien de budget il reste.
 *  6. **La reprise se demande.** Les fichiers verts sont notés au fil de l'eau
 *     dans un fichier d'état ignoré par git, mais une exécution normale repart
 *     de zéro : une reprise implicite mentirait sur ce qui a été vérifié.
 *
 * **Le verdict ne dépend ni de l'ordre ni du parallélisme** : chaque fichier a
 * son propre processus, donc son propre état. Seule la *durée* dépend de la
 * charge — et c'est précisément ce que la relance seule vient démêler.
 *
 * ```
 * node scripts/test-lent.mjs [--parallelisme=N] [--reprise] [--sans-garde]
 *                            [--facteur=N] [--plancher=SECONDES] [--releve-durees]
 * ```
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { availableParallelism, loadavg } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

/** Les deux formes de dossier où vivent les tests lents (cf. `package.json`). */
export const MOTIFS = ['src/*/lents/*.test.js', 'src/*/tests/lents/*.test.js'];

/** Où se note ce qui est déjà vert. Ignoré par git : c'est un brouillon local. */
export const FICHIER_ETAT = '.test-lent-etat.json';

/** Les durées de référence, elles COMMITÉES : budgets de garde et ordre de lancement. */
export const FICHIER_DUREES = 'scripts/durees-lentes.json';

/** La variable qui prend la main sur le parallélisme calculé. */
export const VAR_PARALLELISME = 'TEST_LENT_PARALLELISME';

/** La variable qui demande la reprise, pour les environnements sans ligne de commande. */
export const VAR_REPRISE = 'TEST_LENT_REPRISE';

/** Les trois réglages du délai de garde — celui du haut est le seul à toucher d'ordinaire. */
export const VAR_FACTEUR = 'TEST_LENT_FACTEUR_DELAI';
export const VAR_PLANCHER = 'TEST_LENT_PLANCHER_DELAI';
export const VAR_INCONNU = 'TEST_LENT_DELAI_INCONNU';

/**
 * Facteur 4 : la pire inflation de charge relevée entre une exécution seule et
 * une passe à quatre voies est 2,7× (et 1,6× de variation due au seul cache).
 * Quatre laisse donc environ 50 % de marge au-delà du pire cas observé.
 */
export const FACTEUR_DEFAUT = 4;

/** Plancher 3 min : sous 45 s de référence, le facteur seul serait trop serré pour le bruit. */
export const PLANCHER_DEFAUT = 180;

/** Sans référence, 90 min : le cas « on ne sait pas » doit être le plus généreux de tous. */
export const INCONNU_DEFAUT = 5400;

/** Jamais plus d'une minute sans nouvelles. */
export const INTERVALLE_VIE = 60_000;

// ───────────────────────────────────────────────────────────── découverte ──

/** Un segment de motif en expression régulière — `*` ne traverse jamais un `/`. */
function segmentEnRegex(segment) {
  const echappe = segment.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${echappe}$`);
}

/**
 * Descend le motif segment par segment.
 *
 * Un segment littéral se teste directement, sans lister son parent ; seuls les
 * segments à `*` provoquent une lecture de dossier. `node_modules/` et `dist/`
 * ne sont donc jamais parcourus, là où un parcours récursif naïf s'y perdrait.
 */
function etendre(racine, segments, prefixe) {
  const [tete, ...reste] = segments;
  const dernier = reste.length === 0;

  if (!tete.includes('*')) {
    const suivant = [...prefixe, tete];
    let etat;
    try {
      etat = fs.statSync(path.join(racine, ...suivant));
    } catch {
      return [];
    }
    if (dernier) return etat.isFile() ? [suivant.join('/')] : [];
    return etat.isDirectory() ? etendre(racine, reste, suivant) : [];
  }

  let entrees;
  try {
    entrees = fs.readdirSync(path.join(racine, ...prefixe), { withFileTypes: true });
  } catch {
    return [];
  }
  const filtre = segmentEnRegex(tete);
  const trouves = [];
  for (const entree of entrees) {
    if (!filtre.test(entree.name)) continue;
    if (dernier) {
      if (entree.isFile()) trouves.push([...prefixe, entree.name].join('/'));
    } else if (entree.isDirectory()) {
      trouves.push(...etendre(racine, reste, [...prefixe, entree.name]));
    }
  }
  return trouves;
}

/**
 * Les fichiers de test lents, **triés par chemin**.
 *
 * Ce tri-là est celui du BILAN, et il est reproductible d'une machine à l'autre
 * là où l'ordre rendu par le système de fichiers ne l'est pas. L'ordre de
 * *lancement*, lui, est donné par `ordonnerParDuree` : voir §4 de l'en-tête.
 *
 * La descente est écrite à la main plutôt que confiée à `fs.globSync`, qui
 * n'existe qu'à partir de Node 22 : aucune des deux CI n'installe ni n'épingle
 * Node — l'une prend celui de son image, l'autre celui du runner — et une
 * contrainte de version que personne ne vérifie est une promesse qu'on ne tient
 * pas. Vingt lignes ici valent mieux qu'un plancher tacite.
 *
 * @param {string} racine dossier depuis lequel les motifs sont résolus
 * @param {string[]} motifs globs à la façon de `node --test` (`*`, pas `**`)
 * @returns {string[]} chemins relatifs à `racine`, en séparateurs `/`, dédoublonnés
 */
export function decouvrir(racine, motifs = MOTIFS) {
  const vus = new Set();
  for (const motif of motifs) {
    for (const trouve of etendre(racine, motif.split('/'), [])) vus.add(trouve);
  }
  return [...vus].sort();
}

// ─────────────────────────────────────────────────────────── parallélisme ──

/**
 * Le nombre de fichiers menés de front : **la moitié des cœurs, au moins un**.
 *
 * La moitié, et pas la totalité : ces tests-là lancent de vraies recherches, et
 * saturer la machine est justement ce qui fait rougir les tests de temps. Une
 * valeur absurde dans l'environnement lève plutôt que de se rabattre en douce
 * sur le défaut — un repli silencieux se paierait en minutes inexpliquées.
 */
export function parallelismeParDefaut(env = process.env, coeurs = availableParallelism()) {
  const brut = env[VAR_PARALLELISME];
  if (brut !== undefined && brut !== '') return nombreDeVoies(brut, VAR_PARALLELISME);
  return Math.max(1, Math.floor(coeurs / 2));
}

/** Un entier ≥ 1, ou une erreur qui dit d'où vient la valeur fautive. */
function nombreDeVoies(brut, origine) {
  const n = Number(brut);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${origine} attend un entier ≥ 1, reçu « ${brut} »`);
  }
  return n;
}

/** Un nombre ≥ `minimum`, ou une erreur bruyante. Jamais de repli muet sur le défaut. */
function nombreRegle(brut, origine, minimum, defaut) {
  if (brut === undefined || brut === '') return defaut;
  const n = Number(brut);
  if (!Number.isFinite(n) || n < minimum) {
    throw new Error(`${origine} attend un nombre ≥ ${minimum}, reçu « ${brut} »`);
  }
  return n;
}

// ──────────────────────────────────────────────────────── délai de garde ──

/**
 * Les trois réglages du garde, tels que l'environnement les veut.
 *
 * Le facteur ne descend pas sous 1 : un budget plus court que la durée de
 * référence tuerait des fichiers sains à tous les coups.
 */
export function reglagesDelai(env = process.env) {
  return {
    facteur: nombreRegle(env[VAR_FACTEUR], VAR_FACTEUR, 1, FACTEUR_DEFAUT),
    plancher: nombreRegle(env[VAR_PLANCHER], VAR_PLANCHER, 0, PLANCHER_DEFAUT),
    inconnu: nombreRegle(env[VAR_INCONNU], VAR_INCONNU, 1, INCONNU_DEFAUT),
  };
}

/**
 * La table de durées de référence, ou une table vide si elle manque.
 *
 * Absente ou illisible, tous les fichiers basculent sur le cas « sans
 * référence » — le plus généreux. Le repli est donc du côté sûr : il peut
 * laisser courir un blocage plus longtemps, il ne peut pas tuer un test sain.
 */
export function chargerDurees(chemin) {
  try {
    const lu = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    if (lu && typeof lu === 'object' && lu.durees && typeof lu.durees === 'object') return lu;
  } catch {
    // pas de table : voir ci-dessus, le défaut est le cas généreux
  }
  return { durees: {} };
}

/** La durée de référence d'un fichier, en secondes, ou `null` s'il n'en a pas. */
export function referenceDe(table, fichier) {
  const entree = table?.durees?.[fichier];
  if (entree === undefined || entree === null) return null;
  const secondes = typeof entree === 'number' ? entree : entree.secondes;
  return Number.isFinite(secondes) && secondes > 0 ? secondes : null;
}

/**
 * Le budget d'un fichier, en millisecondes.
 *
 * `max(plancher, facteur × référence)`, ou le cas généreux sans référence.
 */
export function budgetDeGarde(fichier, table, reglages = reglagesDelai()) {
  const reference = referenceDe(table, fichier);
  if (reference === null) return reglages.inconnu * 1000;
  return Math.max(reglages.plancher, reglages.facteur * reference) * 1000;
}

/**
 * L'ordre de LANCEMENT : les plus longs d'abord, les inconnus en tête.
 *
 * Un fichier sans référence est supposé long — se tromper dans ce sens ne coûte
 * qu'un ordre sous-optimal, alors que le supposer court le renverrait en queue
 * de passe, exactement là où il ferait le plus mal.
 */
export function ordonnerParDuree(fichiers, table) {
  return [...fichiers].sort((a, b) => {
    const da = referenceDe(table, a);
    const db = referenceDe(table, b);
    if (da === null && db !== null) return -1;
    if (db === null && da !== null) return 1;
    if (da !== null && db !== null && da !== db) return db - da;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/** Le relevé, écrit seulement sur demande explicite — sinon l'arbre git serait sale. */
function ecrireDurees(chemin, table, mesures, conditions) {
  const durees = { ...table.durees };
  for (const [fichier, secondes] of mesures) {
    durees[fichier] = { secondes: Math.round(secondes * 10) / 10, le: conditions.le };
  }
  const ordonnees = {};
  for (const cle of Object.keys(durees).sort()) ordonnees[cle] = durees[cle];
  const contenu = { ...table, conditions, durees: ordonnees };
  fs.writeFileSync(chemin, `${JSON.stringify(contenu, null, 2)}\n`);
}

// ────────────────────────────────────────────────────────────── lecture TAP ──

const COMPTES = ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'];

/** La DERNIÈRE occurrence d'un motif — le bilan TAP est en queue de sortie. */
function derniere(texte, motif) {
  let trouvee = null;
  for (const m of texte.matchAll(motif)) trouvee = m;
  return trouvee;
}

/**
 * Le bilan chiffré que `node --test --test-reporter=tap` pose en fin de sortie.
 *
 * Renvoie `null` quand il n'y en a pas — processus tué, mémoire épuisée, sortie
 * tronquée. L'appelant en fait un échec : **un fichier sans verdict lisible n'a
 * pas réussi**, il n'a rien dit.
 */
export function lireBilanTap(sortie) {
  const bilan = { dureeTap: null };
  for (const cle of COMPTES) {
    const m = derniere(sortie, new RegExp(`^# ${cle} (\\d+)$`, 'gm'));
    bilan[cle] = m ? Number(m[1]) : 0;
  }
  const vus = COMPTES.filter((cle) => derniere(sortie, new RegExp(`^# ${cle} (\\d+)$`, 'gm')));
  // `tests`, `pass` et `fail` sont les trois qui font le verdict : sans eux, pas de bilan.
  if (!['tests', 'pass', 'fail'].every((cle) => vus.includes(cle))) return null;
  const d = derniere(sortie, /^# duration_ms ([\d.]+)$/gm);
  if (d) bilan.dureeTap = Number(d[1]);
  return bilan;
}

/** Les lignes `not ok` d'une sortie TAP — de quoi dire CE QUI a rougi, sans tout déverser. */
export function testsEchoues(sortie) {
  return [...sortie.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]);
}

/**
 * Combien de tests ont déjà rendu leur verdict dans une sortie TAP EN COURS.
 *
 * C'est ce qui permet à la ligne de vie de dire « 12 tests faits » sur un
 * fichier qui tourne encore, sans rien ajouter à la capture.
 */
export function testsTermines(sortie) {
  return (sortie.match(/^(?:not )?ok \d+ /gm) || []).length;
}

// ──────────────────────────────────────────────────────────── exécution ──

/**
 * Un fichier, un processus `node --test`, un verdict.
 *
 * `--test-concurrency=1` est explicite : `node --test` ne doit jamais ouvrir de
 * seconde voie sous celle que ce script a déjà ouverte.
 */
function executer(fichier, { racine, signalArret, budget = Infinity, vol }) {
  const debut = Date.now();
  // `node --test` marque ses processus (`NODE_TEST_CONTEXT`) pour repérer un
  // `run()` imbriqué. Hériter de cette marque — ce qui arrive dès que le lanceur
  // est lui-même appelé depuis un test — ferait croire à l'enfant qu'il tourne
  // DÉJÀ dans un fichier de test : il n'exécuterait rien, se contenterait d'un
  // avertissement, et sortirait avec 0. Un succès muet sur zéro test exécuté :
  // exactement le repli silencieux qu'on refuse. On coupe donc la marque.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_WORKER_ID;
  return new Promise((resoudre) => {
    const enfant = spawn(
      process.execPath,
      ['--test', '--test-concurrency=1', '--test-reporter=tap', fichier],
      { cwd: racine, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let sortie = '';
    let depasse = false;
    const avaler = (morceau) => {
      sortie += morceau;
    };
    enfant.stdout.setEncoding('utf8');
    enfant.stderr.setEncoding('utf8');
    enfant.stdout.on('data', avaler);
    enfant.stderr.on('data', avaler);

    // Ce que la ligne de vie ira lire, tant que ce fichier est en vol.
    vol?.set(fichier, { debut, budget, sortie: () => sortie });

    const couper = () => enfant.kill('SIGTERM');
    signalArret?.addEventListener('abort', couper, { once: true });

    // Le garde : SIGTERM d'abord, pour laisser une chance à une sortie propre,
    // puis SIGKILL cinq secondes plus tard s'il s'accroche.
    let acheve = null;
    const minuteur = Number.isFinite(budget)
      ? setTimeout(() => {
          depasse = true;
          enfant.kill('SIGTERM');
          acheve = setTimeout(() => enfant.kill('SIGKILL'), 5000);
          acheve.unref?.();
        }, budget)
      : null;

    const ranger = () => {
      if (minuteur) clearTimeout(minuteur);
      if (acheve) clearTimeout(acheve);
      signalArret?.removeEventListener('abort', couper);
      vol?.delete(fichier);
    };

    enfant.on('error', (err) => {
      ranger();
      resoudre(verdict({ fichier, sortie: `${sortie}\n${err.stack}`, code: null, signal: null, debut, depasse, budget }));
    });
    enfant.on('close', (code, signal) => {
      ranger();
      resoudre(verdict({ fichier, sortie, code, signal, debut, depasse, budget }));
    });
  });
}

/** Ce qu'on retient d'une exécution : vert ou non, et POURQUOI non. */
function verdict({ fichier, sortie, code, signal, debut, depasse, budget }) {
  const duree = Date.now() - debut;
  const bilan = lireBilanTap(sortie);
  let raison = null;
  // Le dépassement passe AVANT la lecture du bilan : un fichier tué par le garde
  // n'a pas de bilan, et « aucun bilan lisible » dirait le symptôme, pas la cause.
  if (depasse) raison = `dépassement du délai de garde (${formaterDuree(budget)})`;
  else if (bilan === null) raison = `aucun bilan TAP lisible (code ${code ?? '—'}${signal ? `, signal ${signal}` : ''})`;
  else if (bilan.fail > 0) raison = `${bilan.fail} test${bilan.fail > 1 ? 's' : ''} en échec`;
  else if (signal) raison = `processus interrompu par ${signal} malgré un bilan vert`;
  else if (code !== 0) raison = `code de sortie ${code} malgré un bilan vert`;
  return { fichier, sortie, code, signal, duree, bilan, raison, depasse: Boolean(depasse), budget, vert: raison === null };
}

// ──────────────────────────────────────────────────────────────── état ──

/** L'état de reprise, ou un état vide s'il est absent ou illisible. */
function chargerEtat(chemin) {
  try {
    const lu = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    if (lu && typeof lu === 'object' && lu.verts && typeof lu.verts === 'object') return lu;
  } catch {
    // Un état corrompu ne fait pas échouer la suite : il ne fait que perdre la
    // reprise, et tout sera rejoué. C'est le repli sûr — il ne cache aucun rouge.
  }
  return { version: 1, verts: {} };
}

function ecrireEtat(chemin, etat) {
  const temporaire = `${chemin}.${process.pid}.tmp`;
  fs.writeFileSync(temporaire, `${JSON.stringify(etat, null, 2)}\n`);
  fs.renameSync(temporaire, chemin);
}

/** L'empreinte qui dit si un fichier vert l'est encore « du même fichier ». */
function empreinte(racine, fichier) {
  try {
    const { mtimeMs, size } = fs.statSync(path.join(racine, fichier));
    return `${mtimeMs}:${size}`;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────── journal ──

const pad = (n, large = 2) => String(n).padStart(large, '0');

/** `16,2 s`, `4 min 02 s`, `1 h 04 min` — lisible d'un coup d'œil. */
export function formaterDuree(ms) {
  if (!Number.isFinite(ms)) return 'sans garde';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${pad(Math.round(s - m * 60))} s`;
  return `${Math.floor(m / 60)} h ${pad(m % 60)} min`;
}

/** L'horloge depuis le départ, en tête de chaque ligne : `[  4:02]`. */
function horloge(depuis) {
  const s = Math.round((Date.now() - depuis) / 1000);
  const m = Math.floor(s / 60);
  if (m < 60) return `[${String(m).padStart(3)}:${pad(s % 60)}]`;
  return `[${Math.floor(m / 60)}:${pad(m % 60)}:${pad(s % 60)}]`;
}

function creerJournal(ecrire, depart) {
  const ligne = (texte) => ecrire(`${texte}\n`);
  return {
    ligne,
    brut: (texte) => ecrire(texte.endsWith('\n') ? texte : `${texte}\n`),
    depart: (fichier, budget) =>
      ligne(`${horloge(depart)} départ   ${fichier}  ·  budget ${formaterDuree(budget)}`),
    vie: (fichier, entree) => {
      const ecoule = Date.now() - entree.debut;
      const n = testsTermines(entree.sortie());
      ligne(
        `${horloge(depart)} en vol   ${fichier} — ${formaterDuree(ecoule)}, ${n} test${n > 1 ? 's' : ''} fait${n > 1 ? 's' : ''}, budget ${formaterDuree(entree.budget)}`,
      );
    },
    verdict: (r, faits, total, etiquette) => {
      const compte = r.bilan
        ? `${r.bilan.tests} test${r.bilan.tests > 1 ? 's' : ''}${r.bilan.fail ? ` dont ${r.bilan.fail} échoué${r.bilan.fail > 1 ? 's' : ''}` : ''}`
        : 'sans bilan';
      const fin = `${compte}, ${formaterDuree(r.duree)}  ·  ${faits}/${total}`;
      ligne(`${horloge(depart)} ${etiquette.padEnd(8)} ${r.fichier}  ·  ${fin}`);
    },
  };
}

// ────────────────────────────────────────────────────────────── le lanceur ──

/**
 * Lance la suite lente et rend son bilan.
 *
 * @param {object} options
 * @param {string} options.racine
 * @param {string[]} [options.motifs]
 * @param {number} [options.parallelisme]
 * @param {boolean} [options.reprise]
 * @param {string} [options.cheminEtat]
 * @param {string} [options.cheminDurees]
 * @param {object} [options.reglages] facteur / plancher / inconnu
 * @param {boolean} [options.sansGarde]
 * @param {boolean} [options.releveDurees]
 * @param {number} [options.intervalleVie]
 * @param {(texte:string)=>void} [options.ecrire]
 * @param {AbortSignal} [options.signalArret]
 */
export async function lancerSuiteLente(options) {
  const {
    racine,
    motifs = MOTIFS,
    parallelisme = parallelismeParDefaut(),
    reprise = false,
    cheminEtat = path.join(racine, FICHIER_ETAT),
    cheminDurees = path.join(racine, FICHIER_DUREES),
    reglages = reglagesDelai(),
    sansGarde = false,
    releveDurees = false,
    intervalleVie = INTERVALLE_VIE,
    ecrire = (t) => process.stdout.write(t),
    signalArret,
  } = options;

  const depart = Date.now();
  let derniereEcriture = Date.now();
  const journal = creerJournal((t) => {
    derniereEcriture = Date.now();
    ecrire(t);
  }, depart);

  const tous = decouvrir(racine, motifs);
  if (tous.length === 0) {
    journal.ligne(`Aucun fichier de test lent trouvé sous ${racine} pour ${motifs.join(', ')}.`);
    // Zéro fichier n'est pas un succès : les motifs ou le dossier sont faux.
    return { fichiers: [], echecs: [], repris: [], signales: [], code: 1 };
  }

  const table = chargerDurees(cheminDurees);
  const budgetDe = (f) => (sansGarde ? Infinity : budgetDeGarde(f, table, reglages));

  const etat = reprise ? chargerEtat(cheminEtat) : { version: 1, verts: {} };
  const repris = reprise
    ? tous.filter((f) => etat.verts[f] && etat.verts[f].empreinte === empreinte(racine, f))
    : [];
  const aFaire = tous.filter((f) => !repris.includes(f));

  // Un vert sur zéro fichier exécuté est un mensonge, même bien libellé : si
  // l'état couvre déjà tout ce qui a été découvert, on le dit et on sort rouge
  // plutôt que de rendre un succès qui ne repose sur rien.
  if (aFaire.length === 0) {
    journal.ligne('');
    journal.ligne(
      `Reprise : ${tous.length} fichier${tous.length > 1 ? 's' : ''} découvert${tous.length > 1 ? 's' : ''}, tous déjà verts dans ${cheminEtat}.`,
    );
    journal.ligne("Rien n'a donc été exécuté : ce n'est pas un succès. Effacez cet état pour tout rejouer.");
    return { fichiers: tous, echecs: [], repris, signales: [], code: 1 };
  }

  const voies = Math.min(parallelisme, aFaire.length) || 1;
  journal.ligne('');
  journal.ligne(
    `Suite lente — ${tous.length} fichier${tous.length > 1 ? 's' : ''}, ${voies} en parallèle, les plus longs d'abord, relance seule des rouges.`,
  );
  journal.ligne(
    sansGarde
      ? '  garde : DÉSACTIVÉE (--sans-garde) — un blocage ne sera pas interrompu.'
      : `  garde : ${reglages.facteur} × la durée de référence, plancher ${formaterDuree(reglages.plancher * 1000)}, ${formaterDuree(reglages.inconnu * 1000)} sans référence.`,
  );
  if (repris.length > 0) {
    journal.ligne(
      `  reprise : ${repris.length} fichier${repris.length > 1 ? 's' : ''} déjà vert${repris.length > 1 ? 's' : ''} ${repris.length > 1 ? 'ne sont' : "n'est"} pas rejoué${repris.length > 1 ? 's' : ''}.`,
    );
    journal.ligne('  ⚠ ce bilan ne sait rien des sources modifiées depuis ces verts-là.');
  }
  journal.ligne('');

  // La ligne de vie ne parle QUE dans le silence : tant que des verdicts
  // tombent, elle se tait. C'est ce qui la rend supportable sur quatre voies.
  const vol = new Map();
  const charges = [];
  const battement = setInterval(() => {
    charges.push(loadavg()[0]);
    if (Date.now() - derniereEcriture < intervalleVie) return;
    for (const [fichier, entree] of vol) journal.vie(fichier, entree);
  }, Math.max(250, Math.min(intervalleVie, 15_000)));
  battement.unref?.();

  try {
    // ── passe 1 : en parallèle, les plus longs d'abord ──────────────────
    const resultats = new Map();
    const mesuresPasse1 = new Map();
    let faits = repris.length;
    const file = ordonnerParDuree(aFaire, table);
    const voie = async () => {
      while (file.length > 0 && !signalArret?.aborted) {
        const fichier = file.shift();
        const budget = budgetDe(fichier);
        journal.depart(fichier, budget);
        const r = await executer(fichier, { racine, signalArret, budget, vol });
        resultats.set(fichier, r);
        faits += 1;
        journal.verdict(r, faits, tous.length, r.vert ? 'vert' : 'ROUGE');
        if (r.vert) {
          mesuresPasse1.set(fichier, r.duree / 1000);
          etat.verts[fichier] = { empreinte: empreinte(racine, fichier), le: new Date().toISOString() };
          ecrireEtat(cheminEtat, etat);
        } else {
          if (r.depasse) {
            journal.ligne(`           ↳ ${testsTermines(r.sortie)} tests terminés avant le dépassement`);
          }
          const noms = testsEchoues(r.sortie);
          if (noms.length > 0) journal.ligne(`           ↳ ${noms.slice(0, 8).join('\n           ↳ ')}`);
          journal.ligne(`           ↳ ${r.raison} — relance seule à la fin de la passe.`);
        }
      }
    };
    await Promise.all(Array.from({ length: voies }, voie));

    // ── passe 2 : les rouges, seuls, rien d'autre en vol ─────────────────
    const rouges = aFaire.filter((f) => resultats.has(f) && !resultats.get(f).vert);
    const signales = [];
    if (rouges.length > 0 && !signalArret?.aborted) {
      journal.ligne('');
      journal.ligne(
        `Relance seule de ${rouges.length} fichier${rouges.length > 1 ? 's' : ''} rouge${rouges.length > 1 ? 's' : ''} — un à la fois, rien d'autre en parallèle.`,
      );
      journal.ligne('');
      let refaits = 0;
      for (const fichier of rouges) {
        if (signalArret?.aborted) break;
        const budget = budgetDe(fichier);
        journal.depart(fichier, budget);
        const r = await executer(fichier, { racine, signalArret, budget, vol });
        refaits += 1;
        const sousCharge = resultats.get(fichier);
        resultats.set(fichier, { ...r, sousCharge });
        journal.verdict(r, refaits, rouges.length, r.vert ? 'VERT SEUL' : 'ÉCHEC');
        if (r.vert) {
          signales.push(fichier);
          journal.ligne('           ↳ vert seul, rouge sous charge : la machine, pas le code.');
          etat.verts[fichier] = { empreinte: empreinte(racine, fichier), le: new Date().toISOString() };
          ecrireEtat(cheminEtat, etat);
        } else {
          journal.ligne(`           ↳ ${r.raison} — échec confirmé, voici la sortie complète :`);
          journal.brut(r.sortie);
        }
      }
    }

    // ── bilan ────────────────────────────────────────────────────────────
    const finaux = aFaire.map((f) => resultats.get(f)).filter(Boolean);
    const echecs = finaux.filter((r) => !r.vert);
    const interrompu = Boolean(signalArret?.aborted) || finaux.length < aFaire.length;
    const somme = (cle) => finaux.reduce((t, r) => t + (r.bilan ? r.bilan[cle] : 0), 0);
    const cumul = finaux.reduce((t, r) => t + r.duree, 0);

    journal.ligne('');
    journal.ligne('─'.repeat(72));
    journal.ligne('Bilan de la suite lente');
    journal.ligne(
      `  fichiers   ${finaux.length} exécuté${finaux.length > 1 ? 's' : ''}, ${finaux.length - echecs.length} vert${finaux.length - echecs.length > 1 ? 's' : ''}, ${echecs.length} en échec${repris.length ? ` (+ ${repris.length} repris)` : ''}`,
    );
    journal.ligne(
      `  tests      ${somme('pass')} réussis, ${somme('fail')} échoués, ${somme('todo')} todo, ${somme('skipped')} sautés`,
    );
    journal.ligne(
      `  durée      ${formaterDuree(Date.now() - depart)} au mur, ${formaterDuree(cumul)} cumulées sur ${voies} voie${voies > 1 ? 's' : ''}`,
    );
    if (signales.length > 0) {
      journal.ligne(
        `  signalés   ${signales.length} vert${signales.length > 1 ? 's' : ''} seul${signales.length > 1 ? 's' : ''}, rouge${signales.length > 1 ? 's' : ''} sous charge :`,
      );
      for (const f of signales) journal.ligne(`               ${f}`);
    }
    if (echecs.length > 0) {
      journal.ligne(`  ÉCHECS     ${echecs.length}, rouges même seuls :`);
      for (const r of echecs) journal.ligne(`               ${r.fichier} — ${r.raison}`);
      if (echecs.every((r) => r.depasse)) {
        journal.ligne('  ⚠ tous par dépassement du garde : c’est un signe de machine lente,');
        journal.ligne(`    pas de code. Relevez le facteur — ${VAR_FACTEUR}=8 — avant de suspecter les tests.`);
      }
    }
    if (interrompu) {
      journal.ligne('  interrompu avant la fin — relancez avec --reprise pour repartir des verts.');
    }
    journal.ligne('─'.repeat(72));

    const code = echecs.length > 0 || interrompu ? 1 : 0;
    // Tout vert de bout en bout : il n'y a plus rien à reprendre, l'état s'efface.
    // Y compris quand ce tout-vert vient d'une reprise — sinon l'état survivait à
    // sa raison d'être, et le `--reprise` suivant sautait la totalité en silence.
    if (code === 0) fs.rmSync(cheminEtat, { force: true });

    if (releveDurees) {
      if (code !== 0) {
        journal.ligne('Relevé NON écrit : la passe n’est pas verte, ces durées ne décriraient rien de sain.');
      } else {
        const moyenne = charges.length ? charges.reduce((t, c) => t + c, 0) / charges.length : null;
        ecrireDurees(cheminDurees, table, mesuresPasse1, {
          le: new Date().toISOString().slice(0, 10),
          coeurs: availableParallelism(),
          voies,
          passe: 'première (parallèle), pas les relances seules',
          chargeMoyenne: moyenne === null ? null : Math.round(moyenne * 10) / 10,
          chargeMin: charges.length ? Math.round(Math.min(...charges) * 10) / 10 : null,
          chargeMax: charges.length ? Math.round(Math.max(...charges) * 10) / 10 : null,
          relevesDeCharge: charges.length,
          machine: "relevé automatique — décrivez ici l'état de la machine si elle était chargée",
        });
        journal.ligne(`Relevé écrit dans ${cheminDurees} — ${mesuresPasse1.size} durées mises à jour.`);
      }
    }

    return { fichiers: tous, echecs, repris, signales, code };
  } finally {
    clearInterval(battement);
  }
}

// ─────────────────────────────────────────────────────────── ligne de commande ──

const AIDE = `Lance la suite lente fichier par fichier, avec l'avancement au fil de l'eau.

  --parallelisme=N   fichiers menés de front (défaut : moitié des cœurs, min 1)
                     ou la variable ${VAR_PARALLELISME}
  --reprise          repart des fichiers déjà verts notés dans ${FICHIER_ETAT}
                     ou la variable ${VAR_REPRISE}=1
  --facteur=N        budget = N × la durée de référence du fichier (défaut : ${FACTEUR_DEFAUT})
                     ou la variable ${VAR_FACTEUR}
  --plancher=SEC     budget minimal, en secondes (défaut : ${PLANCHER_DEFAUT})
                     ou la variable ${VAR_PLANCHER}
  --inconnu=SEC      budget d'un fichier sans référence (défaut : ${INCONNU_DEFAUT})
                     ou la variable ${VAR_INCONNU}
  --sans-garde       aucun délai de garde : un blocage ne sera pas interrompu
  --releve-durees    réécrit ${FICHIER_DUREES} si la passe est verte
  --racine=DOSSIER   dossier de résolution des motifs (défaut : le dossier courant)
  --motif=GLOB       motif de découverte, répétable (défaut : ${MOTIFS.join(' ')})
  --etat=FICHIER     où noter les verts (défaut : ${FICHIER_ETAT} sous la racine)
  --durees=FICHIER   table des durées de référence (défaut : ${FICHIER_DUREES})
  --aide             ce texte

Tout fichier rouge est rejoué SEUL. S'il passe alors, il est vert mais signalé
« vert seul, rouge sous charge » ; s'il rougit encore, c'est un vrai échec et le
code de sortie est non nul. Un dépassement du délai de garde compte comme rouge,
et part donc en relance seule — sur une machine vide, où la charge a disparu.

Sur un runner nettement plus lent que la machine de référence, relevez le
facteur (${VAR_FACTEUR}=8) plutôt que de subir des dépassements.`;

async function principal() {
  const { values } = parseArgs({
    options: {
      parallelisme: { type: 'string' },
      reprise: { type: 'boolean', default: false },
      facteur: { type: 'string' },
      plancher: { type: 'string' },
      inconnu: { type: 'string' },
      'sans-garde': { type: 'boolean', default: false },
      'releve-durees': { type: 'boolean', default: false },
      racine: { type: 'string' },
      motif: { type: 'string', multiple: true },
      etat: { type: 'string' },
      durees: { type: 'string' },
      'intervalle-vie': { type: 'string' },
      aide: { type: 'boolean', default: false },
    },
  });

  if (values.aide) {
    process.stdout.write(`${AIDE}\n`);
    return 0;
  }

  const racine = path.resolve(values.racine ?? process.cwd());
  const parEnv = reglagesDelai();
  const reglages = {
    facteur: nombreRegle(values.facteur, '--facteur', 1, parEnv.facteur),
    plancher: nombreRegle(values.plancher, '--plancher', 0, parEnv.plancher),
    inconnu: nombreRegle(values.inconnu, '--inconnu', 1, parEnv.inconnu),
  };

  const controleur = new AbortController();
  const arreter = () => {
    process.stdout.write('\nInterruption demandée — on coupe les processus en vol.\n');
    controleur.abort();
  };
  process.on('SIGINT', arreter);
  process.on('SIGTERM', arreter);

  const { code } = await lancerSuiteLente({
    racine,
    motifs: values.motif?.length ? values.motif : MOTIFS,
    parallelisme: values.parallelisme
      ? nombreDeVoies(values.parallelisme, '--parallelisme')
      : parallelismeParDefaut(),
    reprise: values.reprise || process.env[VAR_REPRISE] === '1',
    cheminEtat: path.resolve(racine, values.etat ?? FICHIER_ETAT),
    cheminDurees: path.resolve(racine, values.durees ?? FICHIER_DUREES),
    reglages,
    sansGarde: values['sans-garde'],
    releveDurees: values['releve-durees'],
    intervalleVie: nombreRegle(values['intervalle-vie'], '--intervalle-vie', 1, INTERVALLE_VIE),
    signalArret: controleur.signal,
  });
  return code;
}

// Exécuté directement (et pas importé par son propre test) : on rend le code.
// `new URL(import.meta.url).pathname` est PERCENT-ENCODÉ : cloné dans
// « /home/…/mon dépôt/ », il ne correspond plus à `argv[1]`, `principal()` n'est
// jamais appelé, et la commande sort à 0 sans avoir lancé un seul test. Le
// silence de trop. `fileURLToPath` décode : c'est la seule comparaison honnête.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      // Échec bruyant : jamais de repli muet, jamais de zéro par défaut.
      process.stderr.write(`\nLanceur de la suite lente — ${err.message}\n`);
      process.exitCode = 2;
    },
  );
}
