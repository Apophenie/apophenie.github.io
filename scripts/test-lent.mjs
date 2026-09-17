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
 *  3. **Chaque fichier a DEUX bornes, et le verdict dit laquelle a sauté.** Le
 *     budget de TRAVAIL se compte en **temps CPU** — `facteurCpu × sa référence
 *     CPU` (`scripts/durees-lentes.json`), avec un plancher : c'est ce que le
 *     fichier coûte, et cela ne bouge pas quand la machine se remplit. Le filet
 *     ANTI-BLOCAGE, lui, reste **mural** et nettement plus large : un test
 *     arrêté sur une attente, un verrou ou une socket ne consomme aucun CPU, et
 *     une garde en CPU ne le couperait jamais — le garde-fou anti-blocage est
 *     par nature une horloge murale. Aucune des deux ne pouvait être une valeur
 *     unique : du plus court au plus long, ces fichiers s'étalent sur 39×.
 *     Dépasser l'une ou l'autre rend rouge, donc part en relance seule — où la
 *     charge a disparu.
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
 *                            [--facteur-cpu=N] [--facteur-mur=N] [--releve-durees]
 * ```
 */

import { spawn, spawnSync } from 'node:child_process';
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

/**
 * ★ **DEUX BORNES, DEUX NATURES, SIX RÉGLAGES — ET AUCUN NOM AMBIGU.**
 *
 * Le budget de TRAVAIL se compte en CPU : c'est ce qu'un fichier coûte, et cela
 * ne bouge pas quand la machine se remplit. Le garde ANTI-BLOCAGE se compte au
 * mur : un test arrêté sur une attente, un verrou ou une socket ne consomme
 * aucun CPU, et une garde en CPU ne le couperait JAMAIS. Les confondre, c'est
 * soit tuer des fichiers sains sous charge, soit laisser dormir un blocage.
 *
 * D'où six variables plutôt que trois surchargées : le nom dit l'unité.
 */
export const VAR_FACTEUR_CPU = 'TEST_LENT_FACTEUR_CPU';
export const VAR_PLANCHER_CPU = 'TEST_LENT_PLANCHER_CPU';
export const VAR_CPU_INCONNU = 'TEST_LENT_CPU_INCONNU';
export const VAR_FACTEUR_MUR = 'TEST_LENT_FACTEUR_MUR';
export const VAR_PLANCHER_MUR = 'TEST_LENT_PLANCHER_MUR';
export const VAR_MUR_INCONNU = 'TEST_LENT_MUR_INCONNU';

/**
 * Les noms d'avant la séparation, tels que les deux CI les documentent encore.
 *
 * Ils restent acceptés — mais JAMAIS en silence : les honorer sans le dire
 * laisserait croire qu'on règle une chose alors qu'on en règle une autre. Le
 * lanceur annonce chaque ancien nom rencontré et sur quelles bornes il retombe.
 * `TEST_LENT_FACTEUR_DELAI=8`, le geste que les deux CI recommandent, veut dire
 * « cette machine est lente » : il porte donc sur LES DEUX facteurs. Les deux
 * autres étaient muraux de naissance et le restent.
 */
export const ANCIENS_REGLAGES = [
  { nom: 'TEST_LENT_FACTEUR_DELAI', vers: ['facteurCpu', 'facteurMur'], minimum: 1 },
  { nom: 'TEST_LENT_PLANCHER_DELAI', vers: ['plancherMur'], minimum: 0 },
  { nom: 'TEST_LENT_DELAI_INCONNU', vers: ['murInconnu'], minimum: 1 },
];

/**
 * Facteur CPU 4 — le même qu'avant, et ce n'est pas un oubli.
 *
 * Le CPU étant bien plus stable que le mur, un facteur plus serré serait
 * tentant. Mais le facteur ne couvre pas que la charge : il couvre aussi le
 * cache froid, la version de Node et le contenu des tests, qui bougent d'une
 * passe à l'autre. On ne resserre pas un garde sur une intuition ; quatre est
 * déjà éprouvé, et le gain du CPU se prend d'abord en fiabilité, pas en cran.
 */
export const FACTEUR_CPU_DEFAUT = 4;

/** Plancher 3 min de CPU : sous 45 s de référence, le facteur seul serait trop serré. */
export const PLANCHER_CPU_DEFAUT = 180;

/** Sans référence CPU, 90 min : le cas « on ne sait pas » reste le plus généreux. */
export const CPU_INCONNU_DEFAUT = 5400;

/**
 * Facteur mural 8, soit le double du facteur CPU.
 *
 * Cette borne-là n'est pas un budget, c'est un filet : elle ne doit se déclencher
 * QUE sur ce que le CPU ne peut pas voir — un blocage. Sur un fichier sain, même
 * à 2,7× d'inflation de charge, elle doit rester hors d'atteinte ; c'est la borne
 * CPU qui doit parler la première. Huit laisse 3× de marge au pire cas relevé.
 */
export const FACTEUR_MUR_DEFAUT = 8;

/** Plancher mural 5 min : un fichier de 26 s bloqué ne mérite pas trois heures de corde. */
export const PLANCHER_MUR_DEFAUT = 300;

/** Sans référence murale, 2 h : plus large que le cas CPU inconnu, comme tout filet. */
export const MUR_INCONNU_DEFAUT = 7200;

/** Jamais plus d'une minute sans nouvelles. */
export const INTERVALLE_VIE = 60_000;

/**
 * Le pas d'échantillonnage du CPU : une seconde.
 *
 * C'est la précision de la GARDE, pas celle de la table — celle-ci reçoit le
 * chiffre exact rendu par `times` à la sortie. Sur des budgets qui se comptent
 * en minutes, une seconde de retard à la détente ne change rien ; en dessous, on
 * paierait des lectures de `/proc` pour une précision dont personne n'a l'usage.
 */
export const PAS_CPU = 1000;

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

// ──────────────────────────────────────────────── le temps CPU d'un enfant ──

/**
 * ★ **POURQUOI LE CPU, ET POURQUOI PAS SEULEMENT L'HORLOGE.**
 *
 * > « Si tu mesures en temps écoulé et pas en temps CPU, ça va rester très
 * >   fragile : entre cette machine qui fait plein d'autres choses et les CI qui
 * >   peuvent aussi avoir d'autres tâches interférentes, ta métrique est trop
 * >   fragile. » (l'autrice)
 *
 * Le temps au mur d'un fichier raconte autant la machine que le fichier : la
 * table du 16 septembre porte, de son propre aveu, une inflation de 1,3× à 2,7×
 * due à la seule charge, et on la compensait à la main par un facteur. Le CPU,
 * lui, dit le travail et pas l'attente — il se compare d'une machine à l'autre.
 *
 * Node n'expose pas le `rusage` de ses enfants : `process.resourceUsage()` ne
 * couvre que soi. Deux voies, et il faut **les deux** :
 *
 *  · **`times`, exact, mais seulement à la fin.** Le fils est lancé sous un
 *    `sh -c` qui, une fois `node --test` moissonné, écrit sur un descripteur à
 *    part le CPU cumulé de ses enfants, descendance comprise, sans le moindre
 *    échantillonnage. C'est ce chiffre-là qui entre dans la table.
 *  · **`/proc`, approximatif, mais PENDANT.** Un chiffre qu'on ne sait lire
 *    qu'après la mort du processus ne coupe rien du tout. La garde CPU a donc
 *    besoin d'un échantillonnage, au pas de la seconde — c'est amplement assez
 *    pour un budget qui se compte en minutes.
 *
 * Et dans les deux cas, il faut l'**arbre**, pas le fils. `node --test` isole
 * chaque fichier dans un petit-fils (`--test-isolation=process`) : relevé en
 * vol sur la passe du 17 septembre, le fils direct affichait 0,11 s de CPU
 * pendant que son petit-fils en avait brûlé 2 536. Un budget calculé sur le
 * seul fils aurait tué tout le monde à la première seconde.
 */

/** Le fichier lu, ou `null` : sous `/proc`, un processus disparaît entre deux lectures. */
function lireProc(chemin) {
  try {
    return fs.readFileSync(chemin, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Les quatre compteurs de temps de `/proc/<pid>/stat`, en jiffies.
 *
 * Le nom du programme est entre parenthèses et peut contenir **des espaces
 * comme des parenthèses** — `(node-MainThread)` ici, mais rien ne l'interdit
 * ailleurs. On découpe donc après la DERNIÈRE parenthèse fermante ; découper
 * par le début casserait sur le premier programme malicieusement nommé.
 */
export function compteursStat(texte) {
  if (typeof texte !== 'string') return null;
  const fin = texte.lastIndexOf(')');
  if (fin < 0) return null;
  const champs = texte.slice(fin + 2).split(' ');
  // Le premier champ après le nom est le 3ᵉ de la ligne : d'où le décalage.
  const champ = (n) => Number(champs[n - 3]);
  const compteurs = { utime: champ(14), stime: champ(15), cutime: champ(16), cstime: champ(17) };
  return Object.values(compteurs).every(Number.isFinite) ? compteurs : null;
}

/**
 * Le CPU d'un processus **et de toute sa descendance**, en jiffies.
 *
 * `utime + stime` est ce que chaque vivant a déjà brûlé ; `cutime + cstime` est
 * ce que ses enfants DÉJÀ MOISSONNÉS ont brûlé. Additionner les deux sur l'arbre
 * vivant ne laisse donc échapper que les branches dont le parent est mort avant
 * la lecture — et ce parent-là, en mourant, a versé son compte au sien.
 *
 * Les enfants ne pendent pas du processus mais de ses FILS D'EXÉCUTION : on lit
 * `children` sous chaque `task/`, faute de quoi un processus lancé depuis un
 * worker (node en ouvre plusieurs) échapperait entièrement au compte.
 */
export function cpuArbreJiffies(pid, racine = '/proc') {
  const vus = new Set();
  const pile = [Number(pid)];
  let total = 0;
  let trouve = false;
  while (pile.length > 0) {
    const p = pile.pop();
    if (!Number.isInteger(p) || p <= 0 || vus.has(p)) continue;
    vus.add(p);
    const compteurs = compteursStat(lireProc(`${racine}/${p}/stat`));
    if (compteurs === null) continue;
    trouve = true;
    total += compteurs.utime + compteurs.stime + compteurs.cutime + compteurs.cstime;
    let taches;
    try {
      taches = fs.readdirSync(`${racine}/${p}/task`);
    } catch {
      continue;
    }
    for (const tache of taches) {
      const liste = lireProc(`${racine}/${p}/task/${tache}/children`);
      if (liste === null) continue;
      for (const enfant of liste.trim().split(/\s+/)) {
        if (enfant !== '') pile.push(Number(enfant));
      }
    }
  }
  return trouve ? total : null;
}

/** Cent sur toutes les machines Linux courantes — ce qui ne vaut pas permission de le supposer. */
export const JIFFIES_DEFAUT = 100;
let jiffiesLus = null;

/**
 * Combien de jiffies font une seconde : `sysconf(_SC_CLK_TCK)`, demandé au
 * système par `getconf` et relu une seule fois. Le coder en dur passerait
 * inaperçu tant que la valeur vaut 100, puis se paierait d'un facteur inconnu.
 */
export function jiffiesParSeconde() {
  if (jiffiesLus !== null) return jiffiesLus;
  try {
    const r = spawnSync('getconf', ['CLK_TCK'], { encoding: 'utf8' });
    const n = Number(String(r.stdout ?? '').trim());
    jiffiesLus = Number.isFinite(n) && n > 0 ? n : JIFFIES_DEFAUT;
  } catch {
    jiffiesLus = JIFFIES_DEFAUT;
  }
  return jiffiesLus;
}

/**
 * La sonde d'échantillonnage : disponible, **ou absente en le disant**.
 *
 * Hors Linux, pas de `/proc` : la garde CPU ne peut pas exister et le repli
 * mural doit s'annoncer, dans la sortie comme dans la table. Un chiffre muet
 * dont le lecteur ignore la nature vaut moins que pas de chiffre du tout.
 */
export function sonderCpu(racine = '/proc') {
  if (cpuArbreJiffies(process.pid, racine) === null) {
    return {
      disponible: false,
      raison: `${racine}/<pid>/stat illisible sur ${process.platform} — aucune garde CPU, garde murale seule`,
      secondes: () => null,
    };
  }
  const tictac = jiffiesParSeconde();
  return {
    disponible: true,
    raison: `${racine}, ${tictac} jiffies par seconde`,
    secondes: (pid) => {
      const jiffies = cpuArbreJiffies(pid, racine);
      return jiffies === null ? null : jiffies / tictac;
    },
  };
}

/**
 * Le CPU des enfants qu'un `sh` a moissonnés, tel que son builtin `times` l'écrit.
 *
 * Deux lignes : le shell lui-même, puis SES ENFANTS. Seule la seconde compte —
 * la première ne mesure que le `sh` de service. Format POSIX `0m1.234s`, avec
 * un nombre de décimales qui varie d'un shell à l'autre (`dash` en écrit six,
 * `bash` trois). On prend les DEUX DERNIÈRES lignes : si le fichier a été coupé
 * après avoir rendu la main, le piège et la sortie normale ont pu écrire chacun
 * leur relevé, et c'est le dernier qui décrit tout ce qui a tourné.
 */
export function lireTimes(texte) {
  const lignes = String(texte ?? '')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lignes.length < 2) return null;
  const nombres = [...lignes[lignes.length - 1].matchAll(/(\d+)m([\d.]+)s/g)].map(
    (m) => Number(m[1]) * 60 + Number(m[2]),
  );
  if (nombres.length < 2 || !nombres.every(Number.isFinite)) return null;
  return nombres[0] + nombres[1];
}

/**
 * Le shell de service, et pourquoi le fils ne se lance plus en direct.
 *
 * `$0` porte le binaire node, `$1` le fichier : rien n'est concaténé dans une
 * ligne de commande, donc rien à échapper — un chemin à espaces ou à apostrophe
 * passe tel quel. Le code de sortie rendu est celui de `node`, jamais celui de
 * `times`. Et le piège sur SIGTERM/SIGINT fait écrire le relevé même quand le
 * garde coupe : c'est ainsi qu'un dépassement peut DIRE combien il avait brûlé.
 *
 * `sh` n'étant pas tué avant `node` — le signal part au groupe entier, et `sh`
 * attend la fin de son enfant avant d'exécuter son piège — le relevé décrit
 * bien l'exécution complète, y compris son dernier souffle.
 */
export const SCRIPT_MESURE = [
  'releve() { times >&3; }',
  'trap "releve; exit 143" TERM INT',
  '"$0" --test --test-concurrency=1 --test-reporter=tap "$1"',
  'code=$?',
  'releve',
  'exit $code',
].join('\n');

/** Là où vit le shell de service. Absent — Windows —, on s'en passe, et on le dit. */
export const SHELL = '/bin/sh';

/**
 * Le CPU de TOUS les enfants que le lanceur a déjà moissonnés, en secondes.
 *
 * `cutime`/`cstime` de `/proc/self/stat` : exact, sans échantillonnage, mais il
 * cumule tout — inutilisable pour attribuer un coût à un fichier quand quatre
 * tournent de front. Il vaut en revanche comme CONTRÔLE CROISÉ : la somme des
 * chiffres par fichier doit retomber sur son écart de bout en bout. Si les deux
 * divergent, c'est l'échantillonnage ou le relevé qui ment, et on veut le voir.
 */
export function cpuEnfantsMoissonnes(racine = '/proc') {
  const compteurs = compteursStat(lireProc(`${racine}/self/stat`));
  return compteurs === null ? null : (compteurs.cutime + compteurs.cstime) / jiffiesParSeconde();
}

// ──────────────────────────────────────────────────────── délai de garde ──

/** Chaque réglage et la variable qui le nomme — c'est ce couple qui rend les erreurs lisibles. */
const VARIABLE_DE = {
  facteurCpu: VAR_FACTEUR_CPU,
  plancherCpu: VAR_PLANCHER_CPU,
  cpuInconnu: VAR_CPU_INCONNU,
  facteurMur: VAR_FACTEUR_MUR,
  plancherMur: VAR_PLANCHER_MUR,
  murInconnu: VAR_MUR_INCONNU,
};

/**
 * Les six réglages des deux gardes, tels que l'environnement les veut.
 *
 * Ni facteur sous 1 — un budget plus court que la référence tuerait des
 * fichiers sains à tous les coups — ni repli muet sur le défaut.
 *
 * Les anciens noms sont honorés, mais chacun fait dire une ligne : `prevenir`
 * reçoit de quoi l'écrire. Les honorer en silence laisserait croire qu'on règle
 * une borne alors qu'on en règle une autre, ce qui est pire que de les ignorer.
 */
export function reglagesGarde(env = process.env, prevenir = () => {}) {
  const reglages = {
    facteurCpu: nombreRegle(env[VAR_FACTEUR_CPU], VAR_FACTEUR_CPU, 1, FACTEUR_CPU_DEFAUT),
    plancherCpu: nombreRegle(env[VAR_PLANCHER_CPU], VAR_PLANCHER_CPU, 0, PLANCHER_CPU_DEFAUT),
    cpuInconnu: nombreRegle(env[VAR_CPU_INCONNU], VAR_CPU_INCONNU, 1, CPU_INCONNU_DEFAUT),
    facteurMur: nombreRegle(env[VAR_FACTEUR_MUR], VAR_FACTEUR_MUR, 1, FACTEUR_MUR_DEFAUT),
    plancherMur: nombreRegle(env[VAR_PLANCHER_MUR], VAR_PLANCHER_MUR, 0, PLANCHER_MUR_DEFAUT),
    murInconnu: nombreRegle(env[VAR_MUR_INCONNU], VAR_MUR_INCONNU, 1, MUR_INCONNU_DEFAUT),
  };

  for (const ancien of ANCIENS_REGLAGES) {
    const brut = env[ancien.nom];
    if (brut === undefined || brut === '') continue;
    const valeur = nombreRegle(brut, ancien.nom, ancien.minimum, null);
    // Le nom précis l'emporte toujours sur l'ancien nom fourre-tout : régler les
    // deux et voir gagner le vague serait la pire des surprises.
    const vises = ancien.vers.filter((cle) => env[VARIABLE_DE[cle]] === undefined || env[VARIABLE_DE[cle]] === '');
    for (const cle of vises) reglages[cle] = valeur;
    const noms = ancien.vers.map((cle) => VARIABLE_DE[cle]);
    prevenir(
      vises.length === 0
        ? `${ancien.nom}=${brut} est un ancien nom, et il est IGNORÉ ici : ${noms.join(' et ')} le contredisent.`
        : `${ancien.nom}=${brut} est un ancien nom, d'avant la séparation CPU / mur — appliqué à ${vises.map((cle) => VARIABLE_DE[cle]).join(' et ')}.`,
    );
  }
  return reglages;
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

/** Les deux natures de référence, et la clé qui les porte dans la table. */
export const NATURES = { cpu: 'cpuSecondes', mur: 'murSecondes' };

/** Ce qu'on accepte comme référence : un nombre, et strictement positif. */
function positif(n) {
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * La référence d'un fichier pour une nature donnée, en secondes, ou `null`.
 *
 * La forme d'avant la séparation — un nombre nu, ou `{ secondes }` — était du
 * TEMPS AU MUR et rien d'autre. La relire comme du CPU inventerait une mesure
 * qui n'a jamais été prise : elle ne répond donc qu'à `mur`, et un fichier resté
 * dans cette forme n'a simplement pas de budget de travail.
 */
export function referenceDe(table, fichier, nature = 'cpu') {
  const cle = NATURES[nature];
  if (cle === undefined) throw new Error(`nature de référence inconnue : « ${nature} »`);
  const entree = table?.durees?.[fichier];
  if (entree === undefined || entree === null) return null;
  if (typeof entree === 'number') return nature === 'mur' ? positif(entree) : null;
  if (entree[cle] !== undefined) return positif(entree[cle]);
  if (nature === 'mur' && entree.secondes !== undefined) return positif(entree.secondes);
  return null;
}

/**
 * Les DEUX budgets d'un fichier, en millisecondes, et jamais confondus.
 *
 * · `cpu` — le travail attendu : `max(plancherCpu, facteurCpu × référence CPU)`.
 *   C'est la borne qui doit parler la première sur un fichier parti en vrille,
 *   et celle qui ne bouge pas quand la machine se remplit.
 * · `mur` — le filet anti-blocage : `max(plancherMur, facteurMur × référence
 *   murale)`, nettement plus large. Un test arrêté sur une attente ne brûle
 *   aucun CPU ; sans cette borne-là, il dormirait indéfiniment.
 *
 * Sans référence, chacune retombe sur son cas généreux, séparément : une table
 * migrée qui ne porte encore que du mur donne donc `cpuInconnu` et un vrai
 * budget mural, ce qui est exactement ce qu'elle sait dire.
 */
export function budgetsDeGarde(fichier, table, reglages = reglagesGarde()) {
  const refCpu = referenceDe(table, fichier, 'cpu');
  const refMur = referenceDe(table, fichier, 'mur');
  return {
    cpu: refCpu === null ? reglages.cpuInconnu * 1000 : Math.max(reglages.plancherCpu, reglages.facteurCpu * refCpu) * 1000,
    mur: refMur === null ? reglages.murInconnu * 1000 : Math.max(reglages.plancherMur, reglages.facteurMur * refMur) * 1000,
    referenceCpu: refCpu,
    referenceMur: refMur,
  };
}

/**
 * L'ordre de LANCEMENT : les plus longs d'abord, les inconnus en tête.
 *
 * Un fichier sans référence est supposé long — se tromper dans ce sens ne coûte
 * qu'un ordre sous-optimal, alors que le supposer court le renverrait en queue
 * de passe, exactement là où il ferait le plus mal.
 */
export function ordonnerParDuree(fichiers, table) {
  // L'ordre se prend sur le CPU, qui est la référence de coût. Un fichier qui
  // n'a encore qu'une référence murale — table fraîchement migrée, machine sans
  // `/proc` — se place quand même par elle : ce tri n'est qu'une heuristique
  // d'occupation de voie, jamais un verdict. Les deux natures ne se mélangent
  // QUE là, et jamais dans un budget.
  const poids = (f) => referenceDe(table, f, 'cpu') ?? referenceDe(table, f, 'mur');
  return [...fichiers].sort((a, b) => {
    const da = poids(a);
    const db = poids(b);
    if (da === null && db !== null) return -1;
    if (db === null && da !== null) return 1;
    if (da !== null && db !== null && da !== db) return db - da;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/**
 * Ce que la table dit d'elle-même, en toutes lettres et non par convention.
 *
 * Une table de nombres dont on doit deviner l'unité est un piège : c'est
 * exactement comme ça qu'on a compensé à la main, pendant des semaines, une
 * fragilité qu'on croyait inhérente à la mesure.
 */
export const METRIQUE =
  'cpuSecondes = temps CPU (utilisateur + système, descendance comprise), en secondes. ' +
  'murSecondes = temps écoulé au mur, en secondes. Le budget de travail se calcule sur le ' +
  'CPU — comparable d’une machine et d’une charge à l’autre — et le garde anti-blocage sur ' +
  'le mur, parce qu’un test bloqué ne consomme aucun CPU. Une entrée sans cpuSecondes a été ' +
  'relevée là où le CPU n’était pas lisible : ce fichier n’a alors aucun budget de travail.';

/** Le relevé, écrit seulement sur demande explicite — sinon l'arbre git serait sale. */
function ecrireDurees(chemin, table, mesures, conditions) {
  const arrondir = (n) => Math.round(n * 10) / 10;
  const durees = { ...table.durees };
  for (const [fichier, mesure] of mesures) {
    const entree = {};
    // Pas de `cpuSecondes` inventé : son absence EST l'information, et
    // `budgetsDeGarde` la lit comme « aucun budget de travail connu ».
    if (mesure.cpu !== null) entree.cpuSecondes = arrondir(mesure.cpu);
    entree.murSecondes = arrondir(mesure.mur);
    entree.le = conditions.le;
    durees[fichier] = entree;
  }
  const ordonnees = {};
  for (const cle of Object.keys(durees).sort()) ordonnees[cle] = durees[cle];
  // L'ordre des clés est posé ici, et non hérité de ce qu'on a relu : une table
  // qui dit son unité APRÈS ses nombres se lit à l'envers. `_lisezMoi`, puis ce
  // que les chiffres signifient, puis d'où ils viennent, puis les chiffres.
  const { _lisezMoi, metrique: _ancienne, conditions: _anciennes, durees: _anciens, ...reste } = table;
  const contenu = {
    ...(_lisezMoi === undefined ? {} : { _lisezMoi }),
    metrique: METRIQUE,
    conditions,
    ...reste,
    durees: ordonnees,
  };
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
  // L'indentation est acceptée, et c'est le fond du sujet : node imbrique les
  // sous-tests, si bien qu'un fichier structuré en `describe` n'affichait « 0
  // tests faits » que parce qu'on ne regardait que la colonne zéro — pendant
  // une demi-heure, sur le fichier le plus long. On compte tout ce qui a rendu
  // son verdict, à quelque niveau que ce soit.
  return (sortie.match(/^[ \t]*(?:not )?ok \d+ /gm) || []).length;
}

// ──────────────────────────────────────────────────────────── exécution ──

/**
 * Un fichier, un processus `node --test`, un verdict.
 *
 * `--test-concurrency=1` est explicite : `node --test` ne doit jamais ouvrir de
 * seconde voie sous celle que ce script a déjà ouverte.
 */
function executer(fichier, { racine, signalArret, budgets = {}, vol, sonde, pasCpu = PAS_CPU }) {
  const debut = Date.now();
  const budgetCpu = budgets.cpu ?? Infinity;
  const budgetMur = budgets.mur ?? Infinity;
  // `node --test` marque ses processus (`NODE_TEST_CONTEXT`) pour repérer un
  // `run()` imbriqué. Hériter de cette marque — ce qui arrive dès que le lanceur
  // est lui-même appelé depuis un test — ferait croire à l'enfant qu'il tourne
  // DÉJÀ dans un fichier de test : il n'exécuterait rien, se contenterait d'un
  // avertissement, et sortirait avec 0. Un succès muet sur zéro test exécuté :
  // exactement le repli silencieux qu'on refuse. On coupe donc la marque.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_WORKER_ID;
  // Le shell de service n'est là que pour son builtin `times` : c'est lui qui
  // rend le CPU EXACT de toute la descendance, une fois `node --test` moissonné.
  // Absent — Windows —, on lance node en direct et le CPU se rabat sur
  // l'échantillonnage, ou sur rien du tout. Dans les deux cas, le bilan le dit.
  const parShell = fs.existsSync(SHELL);
  return new Promise((resoudre) => {
    const enfant = parShell
      ? spawn(SHELL, ['-c', SCRIPT_MESURE, process.execPath, fichier], {
          cwd: racine,
          env,
          // Le 4ᵉ descripteur porte le relevé de `times`, à l'écart de TAP.
          stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
          // Groupe à part : on tue le GROUPE, pas le seul fils. Sans cela, un
          // SIGTERM au fils laisse vivre le petit-fils isolé par `node --test`
          // — celui qui porte tout le travail — et le garde ne garde rien.
          detached: true,
        })
      : spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', fichier], {
          cwd: racine,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: true,
        });

    let sortie = '';
    let releve = '';
    let depasse = null;
    let cpuVu = null;
    const avaler = (morceau) => {
      sortie += morceau;
    };
    enfant.stdout.setEncoding('utf8');
    enfant.stderr.setEncoding('utf8');
    enfant.stdout.on('data', avaler);
    enfant.stderr.on('data', avaler);
    const canalReleve = enfant.stdio[3];
    if (canalReleve) {
      canalReleve.setEncoding('utf8');
      canalReleve.on('data', (m) => {
        releve += m;
      });
      // Un tuyau qui casse n'est pas une raison de faire tomber le lanceur.
      canalReleve.on('error', () => {});
    }

    /** Le signal part au GROUPE ; à défaut — groupe déjà éteint — au seul fils. */
    const couper = (signal) => {
      try {
        if (enfant.pid !== undefined) process.kill(-enfant.pid, signal);
      } catch {
        try {
          enfant.kill(signal);
        } catch {
          // déjà mort : il n'y a plus rien à couper
        }
      }
    };

    // SIGTERM d'abord, pour laisser une chance à une sortie propre — et au
    // piège du shell d'écrire son relevé, ce qui permet à un dépassement de
    // DIRE combien de CPU il avait brûlé. SIGKILL cinq secondes plus tard.
    let acheve = null;
    const abattre = (cause) => {
      if (depasse !== null) return;
      depasse = cause;
      couper('SIGTERM');
      acheve = setTimeout(() => couper('SIGKILL'), 5000);
      acheve.unref?.();
    };

    // La garde CPU ne peut vivre que par échantillonnage : le chiffre exact
    // n'arrive qu'à la mort du processus, et un budget qu'on ne lit qu'après
    // coup ne coupe rien. Le pas de la seconde suffit pour des budgets qui se
    // comptent en minutes.
    const echantillonner = () => {
      if (!sonde?.disponible || enfant.pid === undefined) return;
      const vu = sonde.secondes(enfant.pid);
      if (vu !== null) cpuVu = vu;
      if (Number.isFinite(budgetCpu) && cpuVu !== null && cpuVu * 1000 > budgetCpu) abattre('cpu');
    };
    const echo = sonde?.disponible ? setInterval(echantillonner, pasCpu) : null;
    echo?.unref?.();

    // Ce que la ligne de vie ira lire, tant que ce fichier est en vol.
    vol?.set(fichier, {
      debut,
      budgets: { cpu: budgetCpu, mur: budgetMur },
      cpu: () => cpuVu,
      sortie: () => sortie,
    });

    const interrompre = () => couper('SIGTERM');
    signalArret?.addEventListener('abort', interrompre, { once: true });

    const minuteur = Number.isFinite(budgetMur) ? setTimeout(() => abattre('mur'), budgetMur) : null;

    const ranger = () => {
      if (minuteur) clearTimeout(minuteur);
      if (acheve) clearTimeout(acheve);
      if (echo) clearInterval(echo);
      signalArret?.removeEventListener('abort', interrompre);
      vol?.delete(fichier);
    };

    const rendre = (surcroit, code, signal) => {
      ranger();
      const declare = parShell ? lireTimes(releve) : null;
      // ★ LES DEUX SOURCES SONT DES MINORANTS, ET ON PREND LA PLUS GRANDE.
      //
      // `times` semblait devoir l'emporter toujours — exact, sans
      // échantillonnage. La mesure a dit le contraire : sur un fichier TUÉ par
      // le garde, `node --test` n'a jamais moissonné le petit-fils qui portait
      // tout le travail, donc son `cutime` ne le contient pas, donc le `times`
      // du shell non plus. Un fichier qui venait de brûler deux secondes se
      // déclarait à 0,1 s — et le message de dépassement accusait à côté.
      //
      // Chacune rate donc quelque chose : `times` rate la descendance non
      // moissonnée, l'échantillon rate le CPU brûlé depuis le dernier tic.
      // Aucune ne peut SURESTIMER. Le maximum est le seul choix qui ne mente
      // dans aucun des deux cas, et on retient laquelle a parlé.
      const parEchantillon = cpuVu !== null && (declare === null || cpuVu > declare);
      const cpu = declare === null ? cpuVu : parEchantillon ? cpuVu : declare;
      resoudre(
        verdict({
          fichier,
          sortie: surcroit === null ? sortie : `${sortie}\n${surcroit}`,
          code,
          signal,
          debut,
          depasse,
          budgetCpu,
          budgetMur,
          cpu,
          cpuExact: cpu !== null && !parEchantillon,
          cpuEchantillonne: cpu !== null && parEchantillon,
        }),
      );
    };

    enfant.on('error', (err) => rendre(err.stack, null, null));
    enfant.on('close', (code, signal) => rendre(null, code, signal));
  });
}

/** Ce qu'on retient d'une exécution : vert ou non, et POURQUOI non. */
function verdict({ fichier, sortie, code, signal, debut, depasse, budgetCpu, budgetMur, cpu, cpuExact, cpuEchantillonne }) {
  const duree = Date.now() - debut;
  const bilan = lireBilanTap(sortie);
  const brule = cpu === null ? null : formaterDuree(cpu * 1000);
  let raison = null;
  // Le dépassement passe AVANT la lecture du bilan : un fichier tué par le garde
  // n'a pas de bilan, et « aucun bilan lisible » dirait le symptôme, pas la cause.
  //
  // ET IL DIT LAQUELLE DES DEUX BORNES A SAUTÉ. Sans cette distinction, on
  // diagnostique de travers : un dépassement CPU accuse le fichier — il a
  // vraiment travaillé plus que prévu —, un dépassement mural avec presque
  // aucun CPU brûlé accuse une ATTENTE, verrou, socket ou machine à genoux.
  if (depasse === 'cpu') {
    raison = `dépassement du budget CPU (${formaterDuree(budgetCpu)} accordées, ${brule ?? 'brûlage inconnu'} brûlées) — le fichier travaille plus que sa référence`;
  } else if (depasse === 'mur') {
    raison =
      `dépassement du délai de garde mural (${formaterDuree(budgetMur)})` +
      (brule === null ? '' : ` alors qu’il n’a brûlé que ${brule} de CPU — une attente, pas du travail`);
  } else if (bilan === null) {
    raison = `aucun bilan TAP lisible (code ${code ?? '—'}${signal ? `, signal ${signal}` : ''})`;
  } else if (bilan.fail > 0) {
    raison = `${bilan.fail} test${bilan.fail > 1 ? 's' : ''} en échec`;
  } else if (signal) {
    raison = `processus interrompu par ${signal} malgré un bilan vert`;
  } else if (code !== 0) {
    raison = `code de sortie ${code} malgré un bilan vert`;
  }
  return {
    fichier,
    sortie,
    code,
    signal,
    duree,
    bilan,
    raison,
    depasse,
    budgetCpu,
    budgetMur,
    cpu,
    cpuExact: Boolean(cpuExact),
    cpuEchantillonne: Boolean(cpuEchantillonne),
    vert: raison === null,
  };
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

/**
 * Les deux budgets sur une ligne — ou « sans garde » quand il n'y en a aucun.
 *
 * Les afficher tous les deux n'est pas du bavardage : quand un fichier rougit,
 * la première question est « lequel des deux a sauté », et la réponse doit être
 * lisible dans la ligne de départ autant que dans le verdict.
 */
function formaterBudgets(budgets) {
  const { cpu = Infinity, mur = Infinity } = budgets ?? {};
  if (!Number.isFinite(cpu) && !Number.isFinite(mur)) return 'sans garde';
  return `CPU ${formaterDuree(cpu)} · mur ${formaterDuree(mur)}`;
}

function creerJournal(ecrire, depart) {
  const ligne = (texte) => ecrire(`${texte}\n`);
  return {
    ligne,
    brut: (texte) => ecrire(texte.endsWith('\n') ? texte : `${texte}\n`),
    depart: (fichier, budgets) =>
      ligne(`${horloge(depart)} départ   ${fichier}  ·  budget ${formaterBudgets(budgets)}`),
    vie: (fichier, entree) => {
      const ecoule = Date.now() - entree.debut;
      const n = testsTermines(entree.sortie());
      const cpu = entree.cpu?.();
      // Le CPU en vol est l'information qui manquait le plus : un fichier à
      // trente minutes de mur et deux minutes de CPU n'est pas lent, il attend.
      const brule = cpu === null || cpu === undefined ? '' : `, ${formaterDuree(cpu * 1000)} de CPU`;
      ligne(
        `${horloge(depart)} en vol   ${fichier} — ${formaterDuree(ecoule)}, ${n} test${n > 1 ? 's' : ''} fait${n > 1 ? 's' : ''}${brule}, budget ${formaterBudgets(entree.budgets)}`,
      );
    },
    verdict: (r, faits, total, etiquette) => {
      const compte = r.bilan
        ? `${r.bilan.tests} test${r.bilan.tests > 1 ? 's' : ''}${r.bilan.fail ? ` dont ${r.bilan.fail} échoué${r.bilan.fail > 1 ? 's' : ''}` : ''}`
        : 'sans bilan';
      const brule = r.cpu === null ? '' : `, ${formaterDuree(r.cpu * 1000)} de CPU`;
      const fin = `${compte}, ${formaterDuree(r.duree)} au mur${brule}  ·  ${faits}/${total}`;
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
    reglages = reglagesGarde(),
    sansGarde = false,
    releveDurees = false,
    intervalleVie = INTERVALLE_VIE,
    pasCpu = PAS_CPU,
    racineProc = '/proc',
    avertissements = [],
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
  const sonde = sonderCpu(racineProc);
  // Deux capacités distinctes, et il faut les distinguer : `/proc` donne la
  // garde CPU EN VOL, le shell donne le chiffre EXACT À LA SORTIE. On peut
  // avoir l'un sans l'autre — un BSD sans `/proc` garde son `times`.
  const cpuExactPossible = fs.existsSync(SHELL);
  const budgetsDe = (f) =>
    sansGarde ? { cpu: Infinity, mur: Infinity } : budgetsDeGarde(f, table, reglages);

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
  if (sansGarde) {
    journal.ligne('  garde : DÉSACTIVÉE (--sans-garde) — ni budget CPU, ni filet anti-blocage.');
  } else {
    journal.ligne(
      `  budget CPU : ${reglages.facteurCpu} × la référence CPU, plancher ${formaterDuree(reglages.plancherCpu * 1000)}, ${formaterDuree(reglages.cpuInconnu * 1000)} sans référence CPU.`,
    );
    journal.ligne(
      `  garde murale : ${reglages.facteurMur} × la référence murale, plancher ${formaterDuree(reglages.plancherMur * 1000)}, ${formaterDuree(reglages.murInconnu * 1000)} sans référence murale — c’est le filet anti-blocage, pas un budget.`,
    );
  }
  // Ce que le lanceur sait mesurer ici, dit AVANT le premier chiffre. Un repli
  // sur le mural qui ne s'annonce pas produirait des nombres dont personne ne
  // saurait la nature — c'est précisément ce qu'on vient de corriger.
  journal.ligne(
    `  CPU : ${sonde.disponible ? `échantillonné par ${sonde.raison}` : `PAS DE SONDE — ${sonde.raison}`} ; ` +
      (cpuExactPossible
        ? `relevé exact à la sortie par \`times\` de ${SHELL}.`
        : `${SHELL} absent, AUCUN relevé exact — les durées resteront murales, et la table le dira.`),
  );
  for (const avertissement of avertissements) journal.ligne(`  ⚠ ${avertissement}`);
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
  const cpuMoissonneDepart = cpuEnfantsMoissonnes(racineProc);
  const charges = [];
  let chargesPasse1 = null;
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
        const budgets = budgetsDe(fichier);
        journal.depart(fichier, budgets);
        const r = await executer(fichier, { racine, signalArret, budgets, vol, sonde, pasCpu });
        resultats.set(fichier, r);
        faits += 1;
        journal.verdict(r, faits, tous.length, r.vert ? 'vert' : 'ROUGE');
        if (r.vert) {
          // Les deux natures voyagent ensemble jusqu'à la table, qui les nomme
          // séparément. Le CPU peut manquer — machine sans sonde ni shell — et
          // son absence est alors une information, pas un trou à combler.
          mesuresPasse1.set(fichier, { cpu: r.cpu, mur: r.duree / 1000 });
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
    // Les durées inscrites au relevé ne viennent QUE de cette passe : la charge
    // qui les décrit doit donc s'arrêter ici. La phase solo qui suit est calme
    // par construction — une seule voie — et la laisser entrer dans la moyenne
    // ferait mentir la table sur les conditions de sa propre mesure.
    chargesPasse1 = [...charges];

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
        const budgets = budgetsDe(fichier);
        journal.depart(fichier, budgets);
        const r = await executer(fichier, { racine, signalArret, budgets, vol, sonde, pasCpu });
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
    const avecCpu = finaux.filter((r) => r.cpu !== null);
    if (avecCpu.length === 0) {
      journal.ligne('  CPU        AUCUN relevé — ni sonde ni shell ici : ces durées ne disent que le mur.');
    } else {
      const cumulCpu = avecCpu.reduce((t, r) => t + r.cpu, 0);
      const exacts = avecCpu.filter((r) => r.cpuExact).length;
      const manquants = finaux.length - avecCpu.length;
      journal.ligne(
        `  CPU        ${formaterDuree(cumulCpu * 1000)} cumulées, ${exacts}/${avecCpu.length} exactes` +
          (manquants > 0 ? `, ${manquants} sans relevé` : ''),
      );
      // Le contrôle croisé : ce que le lanceur a vu fichier par fichier doit
      // retomber sur ce que le noyau lui compte pour TOUS ses enfants moissonnés.
      // Deux chemins indépendants sur la même quantité ; s'ils divergent, c'est
      // la mesure qui est fausse, et mieux vaut le lire que le supposer.
      const moissonneFin = cpuEnfantsMoissonnes(racineProc);
      if (cpuMoissonneDepart !== null && moissonneFin !== null) {
        const attendu = moissonneFin - cpuMoissonneDepart;
        const ecart = attendu === 0 ? null : Math.abs(cumulCpu - attendu) / attendu;
        journal.ligne(
          `  contrôle   ${formaterDuree(attendu * 1000)} de CPU comptées par le noyau au lanceur` +
            (ecart === null ? '' : ` — écart ${(ecart * 100).toFixed(1).replace('.', ',')} % avec la somme ci-dessus`),
        );
      }
    }
    if (signales.length > 0) {
      journal.ligne(
        `  signalés   ${signales.length} vert${signales.length > 1 ? 's' : ''} seul${signales.length > 1 ? 's' : ''}, rouge${signales.length > 1 ? 's' : ''} sous charge :`,
      );
      for (const f of signales) journal.ligne(`               ${f}`);
    }
    if (echecs.length > 0) {
      journal.ligne(`  ÉCHECS     ${echecs.length}, rouges même seuls :`);
      for (const r of echecs) journal.ligne(`               ${r.fichier} — ${r.raison}`);
      // Les deux dépassements ne se diagnostiquent pas pareil, et les confondre
      // envoie chercher au mauvais endroit. Le mur qui saute sans que le CPU
      // suive désigne la MACHINE ; le CPU qui saute désigne le TRAVAIL.
      const parMur = echecs.filter((r) => r.depasse === 'mur');
      const parCpu = echecs.filter((r) => r.depasse === 'cpu');
      if (parMur.length === echecs.length) {
        journal.ligne('  ⚠ tous par dépassement mural sans que le CPU suive : signe de machine lente');
        journal.ligne(`    ou bloquée, pas de code. Relevez ${VAR_FACTEUR_MUR}=16 avant de suspecter`);
        journal.ligne("    les tests — ce filet-là n'est pas un budget de travail.");
      } else if (parCpu.length === echecs.length) {
        journal.ligne('  ⚠ tous par dépassement du budget CPU : ces fichiers travaillent vraiment plus');
        journal.ligne('    que leur référence, et la charge n’y est pour rien. Table périmée — régénérez');
        journal.ligne(`    par --releve-durees — ou régression. Relever ${VAR_FACTEUR_CPU} ne ferait que la cacher.`);
      } else if (parMur.length + parCpu.length === echecs.length) {
        journal.ligne(`  ⚠ ${parCpu.length} par dépassement CPU et ${parMur.length} par dépassement mural :`);
        journal.ligne('    deux causes distinctes, à ne pas traiter d’un seul réglage.');
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
        const echantillons = chargesPasse1 ?? charges;
        const arrondi = (n) => Math.round(n * 10) / 10;
        const moyenne = echantillons.length
          ? echantillons.reduce((t, c) => t + c, 0) / echantillons.length
          : null;
        const mesuresAvecCpu = [...mesuresPasse1.values()].filter((m) => m.cpu !== null).length;
        ecrireDurees(cheminDurees, table, mesuresPasse1, {
          le: new Date().toISOString().slice(0, 10),
          coeurs: availableParallelism(),
          voies,
          passe: 'première (parallèle), pas les relances seules',
          // D'où vient le CPU de ces chiffres, en toutes lettres. Une table qui
          // ne dit pas comment elle a été mesurée redevient une convention tacite.
          cpuReleve: `${mesuresAvecCpu}/${mesuresPasse1.size} fichiers`,
          cpuSource: cpuExactPossible
            ? `\`times\` de ${SHELL} à la sortie du processus, descendance comprise (exact)`
            : `${SHELL} absent : aucun relevé CPU, ces chiffres ne disent que le mur`,
          gardeCpu: sonde.disponible ? sonde.raison : `indisponible — ${sonde.raison}`,
          chargeMoyenne: moyenne === null ? null : arrondi(moyenne),
          chargeMin: echantillons.length ? arrondi(Math.min(...echantillons)) : null,
          chargeMax: echantillons.length ? arrondi(Math.max(...echantillons)) : null,
          relevesDeCharge: echantillons.length,
          // Pas de champ `machine` : le lanceur ne sait pas dire si elle était
          // « chargée » au sens où un humain l'entend. Il écrit ce qu'il mesure
          // et s'arrête là. Y déposer une consigne à remplir ferait passer une
          // invite pour une information — et personne ne la remplirait.
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

  Le BUDGET DE TRAVAIL, en temps CPU — ce que le fichier coûte vraiment :
  --facteur-cpu=N    budget CPU = N × la référence CPU du fichier (défaut : ${FACTEUR_CPU_DEFAUT})
                     ou la variable ${VAR_FACTEUR_CPU}
  --plancher-cpu=SEC budget CPU minimal, en secondes (défaut : ${PLANCHER_CPU_DEFAUT})
                     ou la variable ${VAR_PLANCHER_CPU}
  --cpu-inconnu=SEC  budget CPU sans référence CPU (défaut : ${CPU_INCONNU_DEFAUT})
                     ou la variable ${VAR_CPU_INCONNU}

  Le FILET ANTI-BLOCAGE, en temps écoulé — un test bloqué ne brûle aucun CPU :
  --facteur-mur=N    garde murale = N × la référence murale (défaut : ${FACTEUR_MUR_DEFAUT})
                     ou la variable ${VAR_FACTEUR_MUR}
  --plancher-mur=SEC garde murale minimale, en secondes (défaut : ${PLANCHER_MUR_DEFAUT})
                     ou la variable ${VAR_PLANCHER_MUR}
  --mur-inconnu=SEC  garde murale sans référence murale (défaut : ${MUR_INCONNU_DEFAUT})
                     ou la variable ${VAR_MUR_INCONNU}

  --pas-cpu=MS       pas d'échantillonnage du CPU en vol (défaut : ${PAS_CPU})
  --sans-garde       NI budget CPU ni filet : un blocage ne sera pas interrompu
  --releve-durees    réécrit ${FICHIER_DUREES} si la passe est verte
  --racine=DOSSIER   dossier de résolution des motifs (défaut : le dossier courant)
  --motif=GLOB       motif de découverte, répétable (défaut : ${MOTIFS.join(' ')})
  --etat=FICHIER     où noter les verts (défaut : ${FICHIER_ETAT} sous la racine)
  --durees=FICHIER   table des durées de référence (défaut : ${FICHIER_DUREES})
  --aide             ce texte

Deux bornes, deux natures, et le verdict DIT laquelle a sauté. Le budget CPU
mesure le travail : il ne bouge pas quand la machine se remplit, et c'est lui qui
rend la table comparable d'une machine à l'autre. La garde murale ne mesure
rien — c'est un filet contre le blocage, qu'aucune garde CPU ne verrait, puisque
le propre d'un test arrêté sur une attente est de ne consommer aucun CPU.

Tout fichier rouge est rejoué SEUL. S'il passe alors, il est vert mais signalé
« vert seul, rouge sous charge » ; s'il rougit encore, c'est un vrai échec et le
code de sortie est non nul. Un dépassement, de l'une ou l'autre borne, compte
comme rouge et part donc en relance seule — sur une machine vide.

Les anciens noms (${ANCIENS_REGLAGES.map((a) => a.nom).join(', ')})
restent acceptés, et chacun fait dire une ligne rappelant sur quelle borne il
retombe. Sur un runner nettement plus lent, relevez LES DEUX facteurs : le temps
CPU est insensible à la CHARGE de la machine, pas à la vitesse de son processeur.`;

async function principal() {
  const { values } = parseArgs({
    options: {
      parallelisme: { type: 'string' },
      reprise: { type: 'boolean', default: false },
      'facteur-cpu': { type: 'string' },
      'plancher-cpu': { type: 'string' },
      'cpu-inconnu': { type: 'string' },
      'facteur-mur': { type: 'string' },
      'plancher-mur': { type: 'string' },
      'mur-inconnu': { type: 'string' },
      'pas-cpu': { type: 'string' },
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
  // Les anciens noms d'environnement ne sont pas honorés en silence : ce que
  // `reglagesGarde` a à en dire remonte jusqu'au journal, en tête de passe.
  const avertissements = [];
  const parEnv = reglagesGarde(process.env, (m) => avertissements.push(m));
  const reglages = {
    facteurCpu: nombreRegle(values['facteur-cpu'], '--facteur-cpu', 1, parEnv.facteurCpu),
    plancherCpu: nombreRegle(values['plancher-cpu'], '--plancher-cpu', 0, parEnv.plancherCpu),
    cpuInconnu: nombreRegle(values['cpu-inconnu'], '--cpu-inconnu', 1, parEnv.cpuInconnu),
    facteurMur: nombreRegle(values['facteur-mur'], '--facteur-mur', 1, parEnv.facteurMur),
    plancherMur: nombreRegle(values['plancher-mur'], '--plancher-mur', 0, parEnv.plancherMur),
    murInconnu: nombreRegle(values['mur-inconnu'], '--mur-inconnu', 1, parEnv.murInconnu),
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
    pasCpu: nombreRegle(values['pas-cpu'], '--pas-cpu', 1, PAS_CPU),
    avertissements,
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
