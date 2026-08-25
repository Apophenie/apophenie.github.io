// src/recherche/assemblage.js
// Jointure sur signature de méthode : comment trois 6 deviennent un 666.
// CONTRACTS.md §5 · research/heuristique.md §3.4.
//
// Le README insiste : « idéalement 3 d'affilée, idéalement selon la même
// méthode ». Prendre le meilleur chemin de chaque fragment indépendamment
// produit trois méthodes hétéroclites — peu convaincant. On joint donc les
// index de chemins par SIGNATURE DE MÉTHODE : une intersection de tables de
// hachage, O(nb de chemins), quasi gratuite.

import { signature, comparerCodes, scorePartiel, maniere } from './score.js';
import {
  appliquerOp, etat, normaliserCatalogue, operateursExplorables,
  cleEtat, cleTrace, rendreValeur, ordreCode,
} from './bfs.js';

/**
 * Modes d'assemblage, du plus convaincant au moins :
 *  MOISSON     des 6 récoltés sur des PORTÉES DISJOINTES — chaque jeton donne
 *              les siens, aucun caractère ne sert deux fois — puis groupés par
 *              trois (voir ci-dessous)
 *  RESONANCE   les 3 fragments sont littéralement le même texte, répété (le cas
 *              `hope-hope-hope` du README) — bonus +8
 *  DIRECT      un seul chemin passe littéralement par 666
 *  GROUPEMENT  un seul calcul rend un VECTEUR qui porte déjà trois 6 ou plus ;
 *              on les groupe par trois (voir ci-dessous)
 *  CONVERGENCE la MÊME chaîne, prise de trois manières DIFFÉRENTES, qui tombent
 *              toutes trois sur 6 (voir ci-dessous)
 *  PARTITION   trois morceaux contigus qui couvrent la saisie
 *  SIX_OFFERT  au moins deux « 6 offerts » (tirets de la touche AZERTY, 6 littéral)
 *  LIBRE       trois fragments disjoints non couvrants — malus ×0,80
 *  JOKER       le terminateur français, dernier recours — malus ×0,45
 *
 * ── Ce qui a DISPARU : le triplement, dit « décret ». ────────────────────────
 * Un mode obtenait UN seul 6 sur la saisie entière et l'écrivait trois fois par
 * convention. Il avait d'abord été pénalisé (`MALUS.decret`, ×0,40) sous un
 * intitulé qui l'avouait — « le même 6, trois fois ». L'aveu ne suffit pas : la
 * démarche n'est pas vraisemblable, et une liste où douze lignes sur douze
 * décrètent leurs deux derniers 6 ne démontre rien. Il n'est plus PRODUIT.
 *
 * Le mode `DECRET` subsiste comme DIAGNOSTIC — `deduireMode` le pose encore,
 * `assembler` le jette, et `rejouer` le reconnaît pour qu'un lien partagé avant
 * ce changement continue de s'ouvrir plutôt que d'échouer (CONTRACTS §4.3,
 * lecture tolérante). C'est la seule porte qui lui reste, et elle ne va que dans
 * un sens : rien ne la fabrique.
 *
 * ── Ce qui le remplace sur une saisie courte : le GROUPEMENT. ───────────────
 * `hope` sous l'afficheur quatorze segments donne `[6,6,6,6]` : quatre 6 en un
 * seul geste, parce que six segments dessinent D, E, G, H, N, O comme P. Le
 * moteur les réduisait à un seul (moyenne, somme puis racine…) et décrétait les
 * deux autres. Il les GROUPE désormais par trois : trois 6 réellement calculés,
 * montrés côte à côte, et le reste tombe.
 *
 * ── Et la CONVERGENCE, l'autre héritière du décret. ─────────────────────────
 * « Pour les saisies courtes, l'idée sera d'utiliser la séquence complète de
 * trois manières différentes, pour produire les 6 6 6. » — l'auteur.
 *
 * La distinction avec le décret est exactement celle qui manquait : le décret
 * appliquait LE MÊME calcul trois fois et n'en démontrait qu'un ; la convergence
 * applique TROIS calculs distincts, et chacun des trois 6 est gagné. Sur
 * `hope` : les quatorze segments donnent 6, le compte des lettres et des
 * voyelles donne 6, la numérologie chaldéenne donne 6.
 *
 * Trois manières DIFFÉRENTES, pas trois codes différents : « segments
 * allumés », « traits fusionnés » et « traits en capitale » ne font qu'une seule
 * manière aux yeux d'un lecteur. C'est `score.js › maniere` qui tranche.
 *
 * ── Et la MOISSON, qui les surclasse toutes. ────────────────────────────────
 * « Privilégie celle qui donne le plus de séries de 666 sans réutiliser les
 * mêmes caractères, puis les plus simples qui donnent 666, et enfin celles qui
 * réutilisent les mêmes lettres de manières différentes. » — l'auteur.
 *
 * Le GROUPEMENT ne récolte que dans UN vecteur, donc sous UNE méthode : sur
 * `hope-hope-hope.fr`, le quatorze segments rend douze 6 sur les lettres, mais
 * il cale sur les tirets (aucun segment ne dessine un `-`) et sur `fr`. Ces
 * trois 6 manquants existent pourtant — le tiret est sur la touche du 6 en
 * AZERTY, et `fr` vaut 4 + 2 en sept segments. Ce qui les empêchait de
 * rejoindre les douze autres n'était pas l'arithmétique : c'était de vouloir
 * les tirer d'un seul programme.
 *
 * La moisson les tire de plusieurs, un par PORTÉE. Les jetons de la saisie sont
 * naturellement disjoints — `0.1` les lettres du premier `hope`, `1.1` le
 * premier tiret, `6.1` le `fr` —, et la grammaire d'URL sait déjà écrire une
 * portée par fragment (§4.2). Il n'y a donc rien à exprimer comme « toutes les
 * lettres sauf les séparateurs » : il y a six portées, six programmes, et
 * quinze 6 dont aucun ne recompte un caractère déjà compté.
 *
 * Le choix des portées est un PROBLÈME D'ORDONNANCEMENT PONDÉRÉ : chaque
 * intervalle de jetons rapporte le nombre de 6 de son meilleur programme, et
 * l'on cherche la famille disjointe qui en rapporte le plus. Une programmation
 * dynamique sur les jetons le résout exactement, en O(jetons × candidats), sans
 * énumérer les 2ⁿ familles.
 */
export const MODES = ['MOISSON', 'RESONANCE', 'DIRECT', 'GROUPEMENT', 'CONVERGENCE', 'PARTITION', 'SIX_OFFERT', 'LIBRE', 'JOKER'];

/** Trois 6 font un 666 — l'unité de regroupement. */
export const SERIE = 3;

const K_PAR_FRAGMENT = 8;   // chemins retenus par fragment pour l'assemblage
const MAX_PARTITIONS = 200; // garde-fou combinatoire
const MAX_LIBRES = 12;      // C(12,3) = 220 combinaisons

/**
 * Bornes du GROUPEMENT et de la MOISSON.
 *
 * `MAX_SERIES` plafonne le nombre de 666 montrés d'un coup. Rien n'interdit
 * arithmétiquement d'en aligner huit sur un paragraphe ; la scène, elle, doit
 * rester lisible, et le verdict tenir sur une ligne.
 *
 * Il valait 4 — « au plus 666 666 666 666 ». Il vaut 6 : `hope-hope-hope.fr`
 * en aligne cinq (douze lettres en quatorze segments, deux tirets par la touche
 * du 6, `fr` par le sept segments), et `https://hope-hope-hope.fr/` en aligne
 * six, le schéma en donnant trois de plus. Plafonner à 4 aurait consisté à
 * jeter deux séries démontrées ; `reveal` (moteur visuel) met le verdict à
 * l'échelle de la scène, dix-huit chiffres tiennent donc dans le cadre comme
 * trois — plus petits, mais entiers. Au-delà de six, ce n'est plus une chute,
 * c'est un tableau : la borne reste.
 */
const MAX_FRAGMENTS_VECTEUR = 6;    // fragments soumis à l'énumération des vecteurs
const MAX_VECTEURS_PAR_FRAGMENT = 8; // = K_PAR_FRAGMENT : même largeur que le reste
const MAX_SERIES = 6;               // au plus « 666 » six fois
const MAX_CONVERGENCES = 3;         // trios de manières distinctes par fragment

/**
 * Bornes propres à la MOISSON.
 *
 * L'énumération des vecteurs coûte ~1 500 applications d'opérateurs par portée
 * (mesuré : 3 ms sur un jeton d'une à cinq lettres). On la borne au nombre de
 * jetons, pas à leur longueur : c'est le seul paramètre qui puisse s'emballer.
 */
const MAX_JETONS_MOISSON = 24;      // portées atomiques soumises à l'énumération
const MAX_CANDIDATS_PORTEE = 6;     // programmes retenus par portée
const MAX_MOISSONS = 4;             // variantes rendues (la maximale + les homogènes)

/** Index d'un fragment : ses chemins rangés par signature de méthode. */
function indexer(chemins) {
  const parSig = new Map();
  for (const c of chemins) {
    const s = signature(c);
    if (!parSig.has(s)) parSig.set(s, []);
    parSig.get(s).push(c);
  }
  return parSig;
}

function meilleur(chemins) {
  let m = null;
  for (const c of chemins) {
    if (!m) { m = c; continue; }
    const sa = scorePartiel(c);
    const sm = scorePartiel(m);
    if (sa > sm || (sa === sm && comparerCodes(c.ops.map((o) => o.code), m.ops.map((o) => o.code)) < 0)) m = c;
  }
  return m;
}

function approche(mode, parts, extra = {}) {
  return { mode, parts, resonance: false, ...extra };
}

// ══════════════════════════════════ le GROUPEMENT : des 6 par paquets de trois

/**
 * Les 6 que porte l'état final d'un chemin, groupés par trois.
 *
 * Un chemin ordinaire finit sur un `NUM` valant 6 : un seul 6, il n'y a rien à
 * grouper. Un chemin de GROUPEMENT s'arrête un cran plus tôt, sur le `NUMS` — le
 * vecteur d'avant la réduction —, et c'est là que les 6 sont en nombre.
 *
 * @param {Object} chemin
 * @returns {{indices:number[], series:number, disponibles:number}|null}
 */
export function serieDeSix(chemin) {
  if (!chemin || !chemin.etats || !chemin.etats.length) return null;
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin || fin.type !== 'NUMS') return null;
  const indices = [];
  for (let i = 0; i < fin.valeur.length; i++) if (fin.valeur[i] === 6) indices.push(i);
  const series = Math.min(Math.floor(indices.length / SERIE), MAX_SERIES);
  if (series < 1) return null;
  return { indices: indices.slice(0, series * SERIE), series, disponibles: indices.length };
}

/**
 * Ce qu'un chemin apporte à une moisson : ses 6, et sur combien de valeurs.
 *
 * Un chemin ordinaire finit sur un `NUM` — il apporte un 6, ou rien. Un chemin
 * qui s'arrête sur le `NUMS` en apporte autant que le vecteur en porte, et
 * chacun vient d'un jeton distinct.
 *
 * ★ C'est le seul endroit où se vérifie la promesse « aucun caractère compté
 * deux fois ». Un mappeur du catalogue rend une valeur PAR JETON reçu ; on
 * l'exige plutôt que de le supposer, en comparant la largeur du vecteur à celle
 * du dernier état `TOKENS` traversé. Un opérateur qui dupliquerait ses jetons
 * ferait tomber le chemin de la moisson au lieu de lui offrir des 6 gratuits.
 *
 * @param {Object} chemin
 * @returns {{indices:number[], six:number, total:number}|null}
 */
export function sixDuChemin(chemin) {
  if (!chemin || !chemin.etats || !chemin.etats.length) return null;
  const fin = chemin.etats[chemin.etats.length - 1];
  if (!fin) return null;
  if (fin.type === 'NUM') return fin.valeur === 6 ? { indices: [0], six: 1, total: 1 } : null;
  if (fin.type !== 'NUMS') return null;
  const indices = [];
  for (let i = 0; i < fin.valeur.length; i++) if (fin.valeur[i] === 6) indices.push(i);
  if (!indices.length) return null;
  if (!uneValeurParJeton(chemin, fin)) return null;
  return { indices, six: indices.length, total: fin.valeur.length };
}

function uneValeurParJeton(chemin, fin) {
  for (let i = chemin.etats.length - 2; i >= 0; i--) {
    const e = chemin.etats[i];
    if (e.type === 'TOKENS') return fin.valeur.length <= e.valeur.length;
  }
  return true;
}

/** Deux fragments se recouvrent-ils, ne serait-ce que d'un caractère ? */
function porteesDisjointes(parts) {
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      if (chevauche(parts[i].fragment, parts[j].fragment)) return false;
    }
  }
  return true;
}

/**
 * La moisson d'une approche : combien de 6 elle récolte, sur combien de valeurs,
 * et combien de séries de trois cela fait.
 *
 * STRUCTUREL, comme tout ce qui décide d'un mode : une URL rejouée doit
 * retrouver le compte exact de la liste dont elle est issue (§4.3). Une part qui
 * n'apporte AUCUN 6 disqualifie l'approche entière — on ne fait pas figurer une
 * portée dans une moisson pour gonfler sa couverture.
 *
 * @param {Array<{fragment:Object, chemin:Object}>} parts
 * @returns {{six:number, total:number, series:number}|null}
 */
export function compterMoisson(parts) {
  if (!parts || parts.length < 2) return null;
  if (!parts.every((p) => p.fragment && Array.isArray(p.fragment.intervalles))) return null;
  if (!porteesDisjointes(parts)) return null;
  let six = 0;
  let total = 0;
  for (const p of parts) {
    const s = sixDuChemin(p.chemin);
    if (!s) return null;
    six += s.six;
    total += s.total;
  }
  const series = Math.min(Math.floor(six / SERIE), MAX_SERIES);
  if (series < 2) return null; // une seule série, c'est un 666 ordinaire
  return { six, total, series };
}

/** Le verdict à afficher : `666`, ou `666 666` quand il y a de quoi. */
export function verdictDe(approche) {
  const n = approche && approche.series ? approche.series : 1;
  return Array.from({ length: n }, () => '666').join(' ');
}

/**
 * Énumère les chemins qui MÈNENT à un vecteur portant au moins trois 6.
 *
 * Ils ne peuvent pas venir du BFS : celui-ci ne rend que des chemins terminés
 * sur un `NUM` valant 6 (`bfs.js › rechercheBrute`), et le vecteur intermédiaire
 * qui nous intéresse est justement ce qu'il s'empresse de réduire. On énumère
 * donc à part, sur une forme fermée et courte :
 *
 *     [un filtre] → une découpe → un mappeur → [un raffinage]
 *
 * C'est exhaustif sur cette forme, borné par le catalogue, et sans horloge : le
 * résultat ne dépend ni de la machine ni de ce qui a été cherché avant
 * (CONTRACTS §4.4). Les états `TOKENS` sont dédoublonnés par clé avant l'étage
 * des mappeurs — c'est ce qui empêche `fg+t1+mw` de doubler `t1+mw` quand le
 * filtre ne change rien aux jetons, et divise par quatre le coût de l'étage le
 * plus large.
 *
 * `minSix` vaut 3 pour le GROUPEMENT — il lui faut de quoi faire un 666 à lui
 * seul — et 1 pour la MOISSON, qui additionne ce que chaque portée rapporte :
 * sur `hope-hope-hope.fr`, le premier tiret n'apporte qu'un 6, et c'est
 * précisément ce 6-là qui manquait au quatorze segments pour boucler sa
 * cinquième série.
 *
 * @param {string} texte
 * @param {Object[]} ops  opérateurs explorables du catalogue
 * @param {number} [minSix]  nombre de 6 exigé du vecteur
 * @param {number} [plafond] chemins canonicalisés puis rendus
 * @returns {Object[]} chemins finissant sur un `NUMS` à ≥ minSix six, les meilleurs d'abord
 */
export function vecteursDeSix(texte, ops, minSix = SERIE, plafond = MAX_VECTEURS_PAR_FRAGMENT * 2) {
  const filtres = [];
  const decoupes = [];
  const mappeurs = [];
  const raffineurs = [];
  for (const o of ops) {
    if (o.from === 'STR' && o.to === 'STR') filtres.push(o);
    else if (o.from === 'STR' && o.to === 'TOKENS') decoupes.push(o);
    else if (o.from === 'TOKENS' && o.to === 'NUMS') mappeurs.push(o);
    else if (o.from === 'NUMS' && o.to === 'NUMS') raffineurs.push(o);
  }
  const depart = etat('STR', String(texte).normalize('NFC'), [[0, texte.length]]);

  // Étage 1 — la saisie nue, puis chaque filtre. L'ordre du catalogue est
  // l'ordre des codes croissants (§4.4-3) : la déduplication qui suit garde
  // donc toujours le représentant le plus simple.
  const bases = [{ ops: [], etats: [depart], etat: depart }];
  for (const f of filtres) {
    const r = appliquerOp(f, depart);
    if (r !== null) bases.push({ ops: [f], etats: [depart, r], etat: r });
  }

  // Étage 2 — les découpes, dédoublonnées sur les jetons obtenus.
  const jetons = new Map();
  for (const b of bases) {
    for (const d of decoupes) {
      const t = appliquerOp(d, b.etat);
      if (t === null) continue;
      const k = cleEtat(t);
      if (!jetons.has(k)) jetons.set(k, { ops: b.ops.concat(d), etats: b.etats.concat([t]), etat: t });
    }
  }

  // Étage 3 — les mappeurs, puis un raffinage facultatif.
  //
  // Les chemins sont construits À LA MAIN, à partir des états déjà calculés, et
  // non rejoués : `rejouerOps` refait tourner tout le programme, et
  // `normaliserChemin` le refait tourner une fois par étape candidate. Sur un
  // paragraphe de 220 signes cela coûtait 750 ms pour les cent trente vecteurs
  // trouvés — vingt fois le reste de l'assemblage. On ne canonicalise donc que
  // les rescapés, une fois le tri et le plafond passés.
  const out = [];
  const vus = new Set();
  const retenir = (ops, etats) => {
    const fin = etats[etats.length - 1];
    if (compterSix(fin) < minSix) return;
    const chemin = {
      ops,
      etats,
      valeur: null,
      cout: ops.reduce((s, o) => s + (o.cout || 0), 0),
    };
    const cle = cleTrace(chemin);
    if (vus.has(cle)) return;
    vus.add(cle);
    out.push(chemin);
  };
  for (const j of jetons.values()) {
    for (const m of mappeurs) {
      const v = appliquerOp(m, j.etat);
      if (v === null) continue;
      retenir(j.ops.concat(m), j.etats.concat([v]));
      for (const r of raffineurs) {
        const w = appliquerOp(r, v);
        if (w !== null) retenir(j.ops.concat(m, r), j.etats.concat([v, w]));
      }
    }
  }
  // Plus de 6 d'abord ; à égalité, le vecteur le moins dilué (un `[6,6,6,6]`
  // vaut mieux qu'un `[6,6,6,5,7]`, qui laisse deux valeurs tomber) ; puis
  // l'ordre déterministe du faisceau.
  const six = (c) => compterSix(c.etats[c.etats.length - 1]);
  const dilue = (c) => c.etats[c.etats.length - 1].valeur.length - six(c);
  out.sort((a, b) => (six(b) - six(a)) || (dilue(a) - dilue(b)) || comparerChemins(a, b));

  // N2/N3 puis N1, comme partout ailleurs : `fg+t1+mw` — passer en capitales
  // avant de compter les segments — montre le même vecteur que `t1+mw`, la
  // capitale n'y changeant rien. Sans normalisation, les deux occupaient deux
  // lignes de la liste, distinguées par leurs seuls codes. On en canonicalise
  // deux fois le plafond, pour que la déduplication ait de quoi puiser.
  const finaux = [];
  const vusCan = new Set();
  for (const c of out.slice(0, plafond)) {
    const n = normaliserChemin(c);
    const cle = cleTrace(n);
    if (vusCan.has(cle)) continue;
    vusCan.add(cle);
    finaux.push(n);
  }
  return finaux;
}

function compterSix(e) {
  if (!e || e.type !== 'NUMS') return 0;
  let n = 0;
  for (const x of e.valeur) if (x === 6) n++;
  return n;
}

/**
 * À quels fragments on demande un vecteur.
 *
 * L'énumération coûte ~1 500 applications d'opérateurs par fragment — trois
 * ordres de grandeur sous le budget de la recherche, mais pas gratuit pour
 * autant sur les 64 fragments d'un paragraphe. On la réserve aux fragments qui
 * portent réellement l'assemblage : la saisie entière (c'est là que les 6 sont
 * les plus nombreux), les motifs répétés, puis les unités naturelles.
 *
 * Les fragments sans caractère SIGNIFIANT en sont exclus. Sans ce filtre, le
 * moteur démontrait 666 sur le `www` de `https://www.google.com` en ignorant
 * `google.com` : le critère de couverture le notait bien 0, mais les cinq autres
 * critères, parfaits sur un chemin de deux étapes, le hissaient tout de même au
 * milieu de la liste. Un fragment de boilerplate n'a rien à démontrer.
 */
function fragmentsAVecteur(fragments, ctx) {
  const rang = (f) => (f.entier || f.famille === 'entier' ? 0
    : f.famille === 'repetition' || f.famille === 'periodicite' ? 1
      : f.famille === 'unite' ? 2 : 3);
  const vus = new Set();
  return fragments
    .map((f, i) => ({ f, i, r: rang(f) }))
    .filter((x) => x.r < 3 && nbSignifiants(x.f, ctx) >= 2)
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .filter((x) => {
      const cle = x.f.texte.normalize('NFC');
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .slice(0, MAX_FRAGMENTS_VECTEUR)
    .map((x) => x.f);
}

/**
 * Trios de chemins qui prennent LA MÊME chaîne de trois manières différentes.
 *
 * L'exigence de diversité est le cœur du mode : trois codes différents ne font
 * pas trois manières. On demande donc trois `maniere` deux à deux distinctes
 * (`score.js`) — ce qui écarte d'un coup « sept segments », « sept segments
 * fusionnés » et « quatorze segments », qui montreraient trois fois le même
 * geste sous trois noms.
 *
 * La sélection est GLOUTONNE et non exhaustive : les chemins arrivent triés par
 * `comparerPrefixes` (bfs.js), on prend le meilleur de chaque manière, puis on
 * avance d'un cran. Un trio par tour, `MAX_CONVERGENCES` tours — assez pour
 * offrir un choix, pas assez pour noyer la liste sous les recombinaisons d'un
 * même jeu de trois méthodes.
 *
 * Le TRI PAR MANIÈRE se fait sur les chemins bruts et la canonicalisation ne
 * frappe que les élus : `normaliserChemin` rejoue le programme une fois par
 * étape candidate, et canonicaliser les quatre-vingt-seize chemins d'un
 * fragment coûtait, mesuré, 480 ms sur le seul mot « hope ». La manière, elle,
 * se lit sur la signature — déjà mémoïsée par le score.
 *
 * @param {Object[]} bruts  chemins du fragment, triés, déjà dédoublonnés par trace
 * @returns {Object[][]} trios, les plus convaincants d'abord
 */
function convergences(bruts) {
  const parManiere = new Map();
  for (const c of bruts) {
    const m = maniere(c);
    let liste = parManiere.get(m);
    if (liste === undefined) { liste = []; parManiere.set(m, liste); }
    if (liste.length < MAX_CONVERGENCES) liste.push(c);
  }
  const manieres = [...parManiere.keys()];
  if (manieres.length < SERIE) return [];
  // Canonicalisation des seuls élus, puis re-déduplication : deux chemins d'une
  // même manière peuvent s'effondrer l'un sur l'autre une fois le décor retiré.
  for (const m of manieres) {
    const vus = new Set();
    const propres = [];
    for (const c of parManiere.get(m)) {
      const n = normaliserChemin(c);
      const cle = cleTrace(n);
      if (vus.has(cle)) continue;
      vus.add(cle);
      propres.push(n);
    }
    parManiere.set(m, propres);
  }
  const out = [];
  for (let tour = 0; tour < MAX_CONVERGENCES; tour++) {
    const trio = [];
    for (const m of manieres) {
      const liste = parManiere.get(m);
      if (liste.length <= tour) continue;
      trio.push(liste[tour]);
      if (trio.length === SERIE) break;
    }
    if (trio.length < SERIE) break;
    out.push(trio);
  }
  return out;
}

// ══════════════════════════════════ la MOISSON : des 6 de plusieurs sources
//
// Trois temps, et le troisième est le seul qui demande un algorithme.
//
//  1. Les PORTÉES candidates. Chaque jeton en est une — c'est la décomposition
//     disjointe la plus fine que la grammaire d'URL sache écrire (`0.1`, `1.1`,
//     …). On y ajoute la saisie entière et les fragments déjà cherchés, pour
//     qu'une méthode qui ne prend son sens que sur plusieurs mots (la longueur
//     des mots, le compte des jetons) ait sa chance.
//
//  2. Les PROGRAMMES de chaque portée, avec leur rapport en 6 : les vecteurs
//     énumérés ici même, et les chemins du faisceau qui atterrissent sur 6.
//
//  3. Le CHOIX. Il s'agit d'un ordonnancement pondéré d'intervalles : maximiser
//     la somme des 6 sous contrainte de disjonction. Une programmation dynamique
//     de droite à gauche le résout exactement — `dp[i]` = ce que rapportent au
//     mieux les jetons `i…n`. Aucune énumération de familles, aucun glouton :
//     le glouton se trompe (prendre `hope-hope-hope` d'un bloc rapporte douze 6,
//     le découper en cinq portées en rapporte quatorze).

/**
 * Les programmes qu'une portée peut rendre, du plus fourni en 6 au moins.
 * @returns {Array<{six:number, total:number, chemin:Object, maniere:string}>}
 */
function candidatsDePortee(texte, ops, chemins) {
  const vus = new Set();
  const out = [];
  const ajouter = (chemin) => {
    const s = sixDuChemin(chemin);
    if (!s) return;
    const cle = chemin.ops.map((o) => o.code).join('+');
    if (vus.has(cle)) return;
    vus.add(cle);
    out.push({ six: s.six, total: s.total, chemin, maniere: maniere(chemin) });
  };
  if (ops && ops.length) for (const c of vecteursDeSix(texte, ops, 1, MAX_CANDIDATS_PORTEE * 2)) ajouter(c);
  for (const c of chemins || []) ajouter(c);
  // Le plus de 6 d'abord ; à égalité, celui qui LIT le plus de la portée ; puis
  // celui qui laisse le moins de valeurs tomber ; puis l'ordre déterministe du
  // faisceau.
  //
  // ★ Le second critère n'est pas cosmétique. Sur la portée `fr`, deux
  // programmes donnent un 6 sur une seule valeur : `fc+t1+m1` — la règle des
  // initiales, qui garde le `f` (sixième lettre) et JETTE le `r` — et
  // `t1+md+c1` — le sept segments, 4 + 2, qui lit les deux. La couverture ne
  // les distingue pas : elle compte les caractères de la PORTÉE, pas ceux que
  // le programme regarde. Ici, si.
  const lus = (c) => caracteresLus(c.chemin, texte);
  out.sort((a, b) => (b.six - a.six)
    || (lus(b) - lus(a))
    || ((a.total - a.six) - (b.total - b.six))
    || comparerChemins(a.chemin, b.chemin));
  return out.slice(0, MAX_CANDIDATS_PORTEE);
}

/**
 * Combien de caractères de la portée le programme regarde réellement : la
 * largeur de la dernière chaîne avant la découpe, à défaut celle du texte.
 */
function caracteresLus(chemin, texte) {
  let large = 0;
  for (const e of chemin.etats) {
    if (e.type === 'STR') large = [...e.valeur].length;
    else if (e.type === 'TOKENS') return large || e.valeur.length;
    else break;
  }
  return large || [...texte].length;
}

/**
 * Ordonnancement pondéré : la famille de portées disjointes qui récolte le plus
 * de 6, parmi celles dont un programme satisfait `accepte`.
 *
 * @param {Array<Array<Object>>} parDebut  portées indexées par jeton de départ
 * @param {number} n  nombre de jetons
 * @param {(c:Object)=>boolean} accepte
 * @returns {{six:number, choix:Object[]}}
 */
function meilleureMoisson(parDebut, n, accepte) {
  const dp = new Int32Array(n + 1);
  const choix = new Array(n + 1).fill(null);
  for (let i = n - 1; i >= 0; i--) {
    dp[i] = dp[i + 1];
    for (const portee of parDebut[i] || []) {
      const c = portee.candidats.find(accepte);
      if (!c) continue;
      const valeur = c.six + dp[i + portee.longueur];
      if (valeur > dp[i]) { dp[i] = valeur; choix[i] = { portee, candidat: c }; }
    }
  }
  const retenus = [];
  let i = 0;
  while (i < n) {
    const c = choix[i];
    // `choix[i]` n'est retenu que s'il est encore OPTIMAL en `i` : la relaxation
    // `dp[i] = dp[i+1]` peut l'avoir dépassé après coup.
    if (c && c.candidat.six + dp[i + c.portee.longueur] === dp[i]) {
      retenus.push(c);
      i += c.portee.longueur;
    } else i++;
  }
  return { six: dp[0], choix: retenus };
}

/**
 * Les approches de MOISSON d'une saisie.
 *
 * Quatre variantes au plus : la moisson MAXIMALE — celle que demande l'auteur,
 * « le plus de séries » —, puis une par manière dominante, où toutes les portées
 * sont lues de la même façon. Ces dernières récoltent moins, mais elles sont
 * homogènes : le classement les départage, le générateur ne tranche pas.
 *
 * @returns {Object[]} approches non notées
 */
function moissons(saisie, jetons, fragments, parFrag, ops) {
  if (!jetons || jetons.length < 2) return [];
  const n = Math.min(jetons.length, MAX_JETONS_MOISSON);
  const cheminsDe = (texte) => parFrag.get(texte.normalize('NFC')) || [];

  // ── 1 & 2. les portées et leurs programmes
  const portees = [];
  const vues = new Set();
  const ajouterPortee = (debut, longueur, texte, avecVecteurs) => {
    if (debut < 0 || longueur <= 0 || debut + longueur > n) return;
    const cle = `${debut}.${longueur}`;
    if (vues.has(cle)) return;
    vues.add(cle);
    const candidats = candidatsDePortee(
      texte, avecVecteurs ? ops : null, normaliserChemins(cheminsDe(texte)).slice(0, K_PAR_FRAGMENT),
    );
    if (!candidats.length) return;
    portees.push({ debut, longueur, texte, candidats });
  };
  // Les jetons : les atomes de la saisie, et le cœur du mode.
  for (let i = 0; i < n; i++) ajouterPortee(i, 1, jetons[i].texte, true);
  // La saisie entière, puis les fragments déjà cherchés — sans énumération
  // supplémentaire pour ces derniers : leurs chemins existent déjà.
  const finDe = (i, l) => jetons[i + l - 1].offset + jetons[i + l - 1].longueur;
  if (n > 1) ajouterPortee(0, n, saisie.slice(jetons[0].offset, finDe(0, n)), true);
  for (const f of fragments) {
    if (f.tokenDebut < 0 || f.tokenLong <= 1) continue;
    ajouterPortee(f.tokenDebut, f.tokenLong, f.texte, false);
  }

  const parDebut = Array.from({ length: n }, () => []);
  for (const p of portees) parDebut[p.debut].push(p);

  // ── 3. le choix, une fois sans contrainte puis une fois par manière
  const parManiere = new Map();
  for (const p of portees) {
    for (const c of p.candidats) parManiere.set(c.maniere, (parManiere.get(c.maniere) || 0) + c.six);
  }
  const dominantes = [...parManiere.entries()]
    .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
    .slice(0, MAX_MOISSONS - 1)
    .map((x) => x[0]);

  const filtres = [() => true, ...dominantes.map((m) => (c) => c.maniere === m)];
  const out = [];
  const signatures = new Set();
  let coutMaximale = Infinity;
  for (const accepte of filtres) {
    const { choix } = meilleureMoisson(parDebut, n, accepte);
    if (choix.length < 2) continue;
    const parts = elaguerLaMoisson(reduireLeSurplus(choix, accepte).map(({ portee, candidat }) => ({
      fragment: fragmentDeJetons(saisie, jetons, portee.debut, portee.longueur),
      chemin: candidat.chemin,
    })));
    if (!compterMoisson(parts)) continue;
    const cout = parts.reduce((s, p) => s + p.chemin.ops.reduce((t, o) => t + (o.cout || 0), 0), 0);
    // ★ Une variante homogène qui récolte MOINS que la moisson maximale et
    // coûte DAVANTAGE n'apporte rien : elle demande plus de temps de scène pour
    // un verdict plus court. Mesuré sur `https://hope-hope-hope.fr/` : la
    // variante « alphabet » aligne trois séries en 71 étapes, soit trois
    // minutes de démonstration, contre six séries en 33 étapes pour la
    // maximale. On la coupe ici, et non par un plafond arbitraire de longueur —
    // ce qui la disqualifie est la COMPARAISON, pas une constante.
    if (cout > coutMaximale) continue;
    if (coutMaximale === Infinity) coutMaximale = cout;
    const cle = parts.map((p) => `${p.fragment.tokenDebut}.${p.fragment.tokenLong}:`
      + p.chemin.ops.map((o) => o.code).join('+')).join(',');
    if (signatures.has(cle)) continue;
    signatures.add(cle);
    out.push(approche('MOISSON', parts));
  }
  return out;
}

/**
 * ★ À NOMBRE DE SÉRIES ÉGAL, on prend le programme qui gaspille le moins.
 *
 * L'ordonnancement pondéré maximise les **6** ; le verdict en compte des séries
 * de **trois**. Un 6 de plus qui ne fait pas une série de plus n'est pas un
 * gain : c'est un 6 qu'il faudra montrer, puis écarter. Et l'écarter est
 * précisément ce que l'auteur veut voir le moins possible — trier, c'est
 * avouer qu'on savait d'avance ce qu'on cherchait.
 *
 * Le cas qui l'a révélé : sur `hope-hope-hope.fr`, la portée « fr » rend UN 6
 * en sept segments (`f` = 4, `r` = 2, somme) et DEUX en pythagoricienne suivie
 * du retournement des 9 (`f` = 6, `r` = 9 retourné). La programmation dynamique
 * prenait le second — seize 6, cinq séries, et un 6 sur le carreau. Le premier
 * donne quinze 6, les mêmes cinq séries, et rien à jeter.
 *
 * ★ Le rendement (`score.js`) ne voyait pas ce gaspillage-là : il mesure la part
 * des valeurs CALCULÉES qui valent 6, et `[6, 6]` vaut 1 000 sur mille même
 * quand l'un des deux finit par tomber. Le corriger ici plutôt que là est le bon
 * ordre : mieux vaut ne pas produire le déchet que le pénaliser après coup.
 *
 * On descend de la dernière portée vers la première — le surplus est en queue —
 * et pour chacune on prend le candidat le MOINS fourni qui laisse encore de quoi
 * tenir le compte, jamais en dessous d'un 6 (une part sans 6 disqualifie
 * l'approche entière). Les candidats sont déjà triés du plus fourni au moins, et
 * à rendement égal du plus honnête au moins (`candidatsDePortee`) : prendre le
 * premier d'un rang de six, c'est prendre le meilleur de ce rang.
 */
function reduireLeSurplus(choix, accepte) {
  let total = choix.reduce((n, c) => n + c.candidat.six, 0);
  const garde = Math.min(Math.floor(total / SERIE), MAX_SERIES) * SERIE;
  if (total <= garde) return choix;

  const out = choix.slice();
  for (let i = out.length - 1; i >= 0 && total > garde; i--) {
    const { portee, candidat } = out[i];
    let mieux = candidat;
    for (const c of portee.candidats) {
      if (c.six < 1 || c.six >= mieux.six) continue;
      if (!accepte(c)) continue;
      if (total - candidat.six + c.six < garde) continue;
      mieux = c;
    }
    if (mieux !== candidat) {
      total = total - candidat.six + mieux.six;
      out[i] = { portee, candidat: mieux };
    }
  }
  return out;
}

/**
 * ★ Une portée qu'on récolte pour la jeter ensuite n'a rien à faire là.
 *
 * L'ordonnancement pondéré maximise les **6**, et le verdict compte des
 * **séries de trois** : les deux ne coïncident pas. Sur
 * `https://hope-hope-hope.fr/`, la moisson ramassait 3 + 4 + 4 + 4 = 15 six sur
 * ses quatre premières portées — cinq séries pile —, puis ajoutait « fr » pour
 * un seizième 6 qui ne faisait pas une sixième série. La démonstration
 * convertissait donc `f` et `r`, les additionnait, et **jetait le résultat cinq
 * étapes plus loin** : quatre étapes de calcul et une de rejet, pour rien.
 *
 * Ce n'est pas seulement du temps perdu, c'est un aveu : montrer qu'on calcule
 * une valeur pour l'écarter aussitôt donne à voir que le compte était arrêté
 * d'avance. Une portée qui ne pèse que dans le SURPLUS est retirée de
 * l'approche — donc de son URL, de son coût, de son score — et ses caractères
 * sont simplement écartés au découpage, du même geste que le point qui les
 * précède, à la première étape.
 *
 * On garde le plus court PRÉFIXE qui atteint encore le compte gardé : le
 * surplus est toujours en queue (`scenario.js` tronque `finaux` par la fin),
 * donc ce qui est entièrement surnuméraire est forcément en fin de liste.
 * L'étape d'appoint subsiste pour ce qu'elle seule sait faire — le surplus qui
 * tombe *à l'intérieur* d'une portée, celle-ci restant indispensable.
 */
function elaguerLaMoisson(parts) {
  const compte = compterMoisson(parts);
  if (!compte) return parts;
  const garde = compte.series * SERIE;
  let cumul = 0;
  let k = 0;
  while (k < parts.length && cumul < garde) {
    const s = sixDuChemin(parts[k].chemin);
    cumul += s ? s.six : 0;
    k++;
  }
  if (k >= parts.length) return parts;
  const court = parts.slice(0, k);
  // Élaguer ne doit RIEN changer au verdict : si le compte bouge, on n'y touche
  // pas. C'est le garde-fou qui rend l'élagage sûr sans avoir à raisonner sur
  // les plafonds (`MAX_SERIES`) ni sur les portées à zéro 6.
  const apres = compterMoisson(court);
  return apres && apres.series === compte.series ? court : parts;
}

/** Un fragment aligné sur une plage de jetons — donc écrivable en portée d'URL. */
function fragmentDeJetons(saisie, jetons, debut, longueur) {
  const premier = jetons[debut];
  const dernierJeton = jetons[debut + longueur - 1];
  const d = premier.offset;
  const f = dernierJeton.offset + dernierJeton.longueur;
  return {
    texte: saisie.slice(d, f),
    offset: d,
    longueur: f - d,
    intervalles: [[d, f]],
    tokenDebut: debut,
    tokenLong: longueur,
    famille: longueur === 1 && premier.genre === 'S' ? 'separateurs' : 'portee',
    priorite: 2,
  };
}

/** Caractères du fragment qui comptent (hors `https://`, `www.`, `/` final). */
function nbSignifiants(fragment, ctx) {
  const m = ctx && ctx.signifiants && ctx.signifiants.masque;
  if (!m) return fragment.longueur;
  let n = 0;
  for (const [d, f] of fragment.intervalles) {
    for (let i = d; i < f && i < m.length; i++) if (m[i]) n++;
  }
  return n;
}

// ══════════════════════════════════ N2 et N3, appliqués au chemin entier
//
// `research/heuristique.md §4.8` prévoit quatre niveaux d'anti-doublons. Deux
// d'entre eux ne mordaient pas, et pour la même raison : ils étaient appliqués
// LOCALEMENT, sur une étape, alors qu'ils portent sur le chemin.
//
//  · N3 — « élimination des opérations neutres ». Le BFS écarte bien l'étape
//    qui ne change rien à l'état COURANT (`kc === cleSrc`, bfs.js). Mais sur
//    `hope-hope-hope.fr`, `f.lettres` change l'état courant — il donne
//    « hopehopehopefr » — et pourtant il ne change RIEN À LA SUITE : le filtre
//    des voyelles qui vient après aboutit à « oeoeoe » dans les deux cas. Le
//    chemin `f6+f7+n1` est donc `f7+n1` avec une étape de décor, et les deux
//    apparaissaient côte à côte dans la liste (défauts 3 et 4). La neutralité
//    n'est ici vraie que SUR CETTE SAISIE — c'est suffisant, puisque la
//    démonstration ne porte que sur elle.
//
//  · N2 — « normalisation des filtres commutatifs ». Le prototype trie les
//    codes pour la CLÉ, mais laisse le chemin dans son ordre d'origine ; comme
//    la clé porte aussi la trace des valeurs, et que la trace diffère,
//    `f1+f3+n3` et `f3+f1+n3` survivaient tous les deux. §4.8 demande de trier
//    la suite commutante AVANT de calculer N1 : c'est le chemin qu'on
//    réordonne, pas seulement sa clé.
//
// Les deux se composent : réordonner peut fusionner deux suites commutantes et
// rendre une étape neutre, retirer une étape peut rapprocher deux filtres. On
// itère donc jusqu'au point fixe (au plus `TOURS_NORMALISATION` tours).

const TOURS_NORMALISATION = 4;

/** Rejoue une suite d'opérateurs depuis le texte de départ d'un chemin. */
function rejouerOps(source, ops) {
  let courant = etat('STR', source, [[0, source.length]]);
  const etats = [courant];
  let cout = 0;
  for (const op of ops) {
    const apres = appliquerOp(op, courant);
    if (apres === null) return null;
    etats.push(apres);
    cout += op.cout || 0;
    courant = apres;
  }
  return {
    ops: ops.slice(),
    etats,
    valeur: courant.type === 'NUM' ? courant.valeur : null,
    cout,
  };
}

/**
 * Deux chemins finissent-ils sur exactement le même état ? C'est l'invariant
 * inviolable de toute simplification : on a le droit d'enlever du décor, jamais
 * de changer le résultat. Sans ce garde-fou, retirer la DERNIÈRE étape passait
 * toujours le test de trace (la trace attendue perd justement le dernier état),
 * et `f7+n1` se « simplifiait » en `f7` — un chemin qui n'arrive nulle part.
 */
function memeAboutissement(a, b) {
  const fa = a.etats[a.etats.length - 1];
  const fb = b.etats[b.etats.length - 1];
  return fa.type === fb.type && rendreValeur(fa) === rendreValeur(fb);
}

/**
 * N3 étendu : retire la première étape INOPÉRANTE — celle dont l'absence laisse
 * le chemin aboutir exactement au même endroit.
 *
 * Le critère est le RÉSULTAT, pas l'image intermédiaire. C'est délibéré, et
 * c'est ce qui fait la différence entre attraper le doublon et le laisser
 * passer : sur `https://www.google.com`, `f1+f3+f7+n7` et `f3+f7+n7` montrent
 * deux images intermédiaires différentes — « www.google » contre
 * « https://www.google » — mais le filtre des voyelles les ramène toutes deux à
 * « ooe ». Le premier filtre n'a rien fait ; exiger l'égalité des images
 * intermédiaires l'aurait déclaré indispensable.
 *
 * Le typage des opérateurs protège le cœur de la méthode : on ne peut pas
 * retirer `t.caracteres` d'un `t1+m1+c1`, parce que `m1` n'accepte pas un `STR`.
 * Ce qui saute est ce qui peut sauter : du décor.
 */
function retirerUneEtapeInoperante(chemin, source) {
  for (let i = 0; i < chemin.ops.length; i++) {
    const sans = chemin.ops.slice(0, i).concat(chemin.ops.slice(i + 1));
    if (!sans.length) continue;
    const rejoue = rejouerOps(source, sans);
    if (!rejoue) continue;
    if (memeAboutissement(rejoue, chemin)) return rejoue;
  }
  return null;
}

/** N2 : trie chaque suite maximale d'opérateurs commutants par code croissant. */
function reordonnerCommutants(chemin, source) {
  const ops = chemin.ops;
  const trie = [];
  let bloc = [];
  const vider = () => {
    if (!bloc.length) return;
    bloc.sort((a, x) => {
      const [fa, ia] = ordreCode(a.code);
      const [fx, ix] = ordreCode(x.code);
      return fa !== fx ? fa - fx : ia - ix;
    });
    trie.push(...bloc);
    bloc = [];
  };
  for (const op of ops) {
    if (op.commute) bloc.push(op);
    else { vider(); trie.push(op); }
  }
  vider();
  if (trie.every((op, i) => op === ops[i])) return null;
  const rejoue = rejouerOps(source, trie);
  // Réordonner change les images intermédiaires — c'est le but —, mais jamais
  // le résultat : sinon ce n'était pas une commutation.
  if (!rejoue || !memeAboutissement(rejoue, chemin)) return null;
  return rejoue;
}

/**
 * Forme canonique d'un chemin : filtres commutants triés, étapes décoratives
 * retirées. Mémoïsée sur l'objet chemin — l'assemblage repasse dessus des
 * dizaines de fois.
 * @param {Object} chemin
 * @returns {Object} le chemin canonique (le même objet s'il l'était déjà)
 */
export function normaliserChemin(chemin) {
  if (chemin._can) return chemin._can;
  const depart = chemin.etats[0];
  if (!depart || depart.type !== 'STR') { chemin._can = chemin; return chemin; }
  const source = depart.valeur;
  let courant = chemin;
  for (let tour = 0; tour < TOURS_NORMALISATION; tour++) {
    const range = reordonnerCommutants(courant, source);
    if (range) courant = range;
    const allege = retirerUneEtapeInoperante(courant, source);
    if (!allege) { if (!range) break; continue; }
    courant = allege;
  }
  if (courant !== chemin && !memeAboutissement(courant, chemin)) courant = chemin;
  if (courant !== chemin) {
    courant.tronque = chemin.tronque;
    courant.tronqueTemps = chemin.tronqueTemps;
    courant._can = courant;
  }
  chemin._can = courant;
  return courant;
}

/** Ordre déterministe local, calqué sur celui du faisceau (bfs.js). */
function comparerChemins(a, b) {
  const sa = scorePartiel(a);
  const sb = scorePartiel(b);
  if (sa !== sb) return sb - sa;
  if (a.ops.length !== b.ops.length) return a.ops.length - b.ops.length;
  return comparerCodes(a.ops.map((o) => o.code), b.ops.map((o) => o.code));
}

/**
 * Combien de chemins on canonicalise par fragment.
 *
 * La canonicalisation rejoue le programme une fois par étape candidate : c'est
 * quadratique en la longueur du chemin, donc à réserver aux chemins qui ont une
 * chance de servir. La liste arrive triée par `comparerPrefixes` (bfs.js) et
 * l'assemblage n'en garde que `K_PAR_FRAGMENT` ; on prend une marge de trois
 * pour que la déduplication ait de quoi puiser, pas plus. Mesuré sur le
 * paragraphe de test : 3 050 ms sans borne, 300 ms avec.
 */
const K_CANONISABLES = K_PAR_FRAGMENT * 3;

/**
 * Canonicalise puis re-déduplique une liste de chemins. C'est ici que
 * disparaissent les quasi-doublons — `f6+f7+n1` s'effondre sur `f7+n1`,
 * `f3+f1+n3` sur `f1+f3+n3`.
 */
export function normaliserChemins(chemins, plafond = K_CANONISABLES) {
  const vus = new Map();
  for (const c of chemins.slice(0, plafond)) {
    const n = normaliserChemin(c);
    const cle = cleTrace(n) + '' + n.ops.map((o) => o.code).join('+');
    const ancien = vus.get(cle);
    if (!ancien || comparerChemins(n, ancien) < 0) vus.set(cle, n);
  }
  return [...vus.values()].sort(comparerChemins);
}

/**
 * @param {string} saisie
 * @param {import('./fragments.js').Fragment[]} fragments
 * @param {Map<string, Object[]>} parFrag  texte normalisé → chemins
 * @param {Object} ctx  {jetons, signifiants, catalogue}
 * @returns {Object[]} approches non notées
 */
export function assembler(saisie, fragments, parFrag, ctx) {
  const approches = [];
  // Les chemins sont canonicalisés AVANT d'entrer dans un assemblage (N2/N3
  // ci-dessus) : c'est ce qui empêche « voyelles → compter » et « lettres →
  // voyelles → compter » d'occuper deux lignes de la même liste. Le résultat est
  // mémoïsé par fragment — `assembler` redemande les mêmes chemins des dizaines
  // de fois (résonance, partitions, trios libres).
  const canoniques = new Map();
  const cheminsDe = (f) => {
    const cle = f.texte.normalize('NFC');
    let v = canoniques.get(cle);
    if (v === undefined) {
      v = normaliserChemins(parFrag.get(cle) || []).slice(0, K_PAR_FRAGMENT);
      canoniques.set(cle, v);
    }
    return v;
  };
  const cheminsBruts = (f) => parFrag.get(f.texte.normalize('NFC')) || [];

  // ── mode A : RÉSONANCE — les 3 fragments sont littéralement le même texte
  const parMotif = new Map();
  for (const f of fragments) {
    if (f.famille !== 'repetition' && f.famille !== 'periodicite') continue;
    const cle = f.motif || f.texte;
    if (!parMotif.has(cle)) parMotif.set(cle, []);
    parMotif.get(cle).push(f);
  }
  for (const [, occ] of parMotif) {
    if (occ.length < 3) continue;
    const trois = occ.slice(0, 3);
    for (const chemin of cheminsDe(trois[0])) {
      approches.push(approche('RESONANCE', trois.map((f) => ({ fragment: f, chemin })), { resonance: true }));
    }
  }

  // ── mode E : 666 direct — un chemin passe littéralement par 666
  for (const f of fragments) {
    if (!f.entier && f.famille !== 'entier') continue;
    for (const c of cheminsDe(f)) {
      const tronque = tronquerA666(c);
      if (tronque) approches.push(approche('DIRECT', [{ fragment: f, chemin: tronque }], { direct666: true }));
    }
  }

  // ── mode G : GROUPEMENT — un vecteur qui porte déjà trois 6, ou six, ou neuf.
  //    C'est ce qui remplace le décret sur une saisie courte, et c'est ce que
  //    demande l'auteur : « quand tu arrives à faire autant de 6, plutôt que de
  //    les réduire à trois, regroupe-les par trois ».
  const opsExplorables = ctx.catalogue ? operateursExplorables(ctx.catalogue) : [];
  const porteuses = fragmentsAVecteur(fragments, ctx);
  if (opsExplorables.length) {
    for (const f of porteuses) {
      const vecteurs = vecteursDeSix(f.texte, opsExplorables).slice(0, MAX_VECTEURS_PAR_FRAGMENT);
      for (const c of vecteurs) {
        approches.push(approche('GROUPEMENT', [{ fragment: f, chemin: c }]));
      }
    }
  }

  // ── mode I : MOISSON — les 6 de portées DISJOINTES, groupés par trois.
  //    C'est le mode que l'auteur met en tête : « privilégie celle qui donne le
  //    plus de séries de 666 sans réutiliser les mêmes caractères ». Le
  //    GROUPEMENT ne récolte que sous une seule méthode ; la moisson prend à
  //    chaque jeton ce qu'il sait donner, par le programme qui lui convient.
  if (opsExplorables.length) {
    for (const a of moissons(saisie, ctx.jetons || [], fragments, parFrag, opsExplorables)) {
      approches.push(a);
    }
  }

  // ── mode H : CONVERGENCE — la même chaîne, trois manières différentes.
  //    « Pour les saisies courtes, l'idée sera d'utiliser la séquence complète
  //    de trois manières différentes, pour produire les 6 6 6. » Chacun des
  //    trois 6 est calculé ; aucun n'est décrété.
  //
  //    La chaîne en question est LA SAISIE ENTIÈRE, et rien d'autre : c'est ce
  //    que demande l'auteur, et c'est aussi ce qui distingue ce mode d'un trio
  //    libre — il n'y a rien à cueillir, on prend tout, trois fois.
  //
  //    Le vivier est la liste BRUTE du fragment, pas les huit chemins canoniques
  //    que consomme le reste de l'assemblage : ce mode se nourrit de DIVERSITÉ,
  //    et les huit meilleurs chemins d'un fragment sont souvent huit variantes
  //    du même comptage. Mesuré sur « Millicent » : huit chemins → une seule
  //    manière ; la liste entière → deux. (Deux, pas trois : voir le rapport —
  //    ce mode n'est pas universel.)
  for (const f of fragments) {
    if (!f.entier && f.famille !== 'entier') continue;
    for (const trio of convergences(cheminsBruts(f))) {
      approches.push(approche('CONVERGENCE', trio.map((c) => ({ fragment: f, chemin: c }))));
    }
  }

  // ── L'ASSEMBLAGE MIXTE n'est plus un repli. ───────────────────────────────
  //
  // La jointure sur signature répond au « idéalement selon la même méthode » du
  // README, et elle a raison de le faire : l'homogénéité pèse 0,25, le plus fort
  // des six critères. Mais elle décidait aussi de ce qui EXISTE — le mélange
  // n'était fabriqué QUE lorsque aucune signature commune ne se présentait. Un
  // trio dont deux fragments partagent une méthode ne pouvait donc jamais être
  // montré autrement, même quand la troisième source (un tiret de la touche du
  // 6, un `fr` converti) valait mieux que la variante homogène.
  //
  // Le mélange est donc TOUJOURS proposé, en plus des combinaisons homogènes.
  // L'homogénéité reste préférable — elle le dit dans le score, pas dans le
  // générateur —, mais elle n'empêche plus un 666 d'exister.
  //
  // ⚠️ MESURE : sur les huit saisies témoins, cette levée ne change AUCUNE liste
  // affichée. Les 666 mixtes qui existaient (« un `hope` chaldéen, un tiret
  // AZERTY, un `fr` sept segments » vaut 3 038 sur `hope-hope-hope.fr`) venaient
  // déjà du repli, et ceux que la levée ajoute restent derrière leur variante
  // homogène. Ce qui les tient en bas n'est pas la règle levée ici, c'est leur
  // COUVERTURE : trois fragments cueillis couvrent 26 % de la saisie contre 59 %
  // pour la résonance et 100 % pour le groupement. Le garde-fou est désormais
  // dans le score et nulle part ailleurs — c'est ce qui était demandé —, mais il
  // ne faut pas attendre de cette seule levée qu'elle fasse remonter le mixte.
  const melange = (mode, trio) => {
    const parts = trio.map((f) => ({ fragment: f, chemin: meilleur(cheminsDe(f)) }));
    if (parts.every((p) => p.chemin)) approches.push(approche(mode, parts));
  };

  // ── mode B : PARTITION contiguë couvrante en 3 parts, jointe sur signature
  for (const trio of partitionsContigues(fragments, ctx)) {
    const index = trio.map((f) => indexer(cheminsDe(f)));
    const communes = [...index[0].keys()]
      .filter((s) => index[1].has(s) && index[2].has(s))
      .sort();
    for (const s of communes) {
      approches.push(approche('PARTITION', trio.map((f, i) => ({
        fragment: f, chemin: meilleur(index[i].get(s)),
      }))));
    }
    melange('PARTITION', trio);
  }

  // ── modes C et D : 3 fragments disjoints (avec ou sans « 6 offert »)
  for (const trio of trioLibres(fragments, parFrag)) {
    const index = trio.map((f) => indexer(cheminsDe(f)));
    const communes = [...index[0].keys()].filter((s) => index[1].has(s) && index[2].has(s)).sort();
    const offerts = trio.filter((f) => estSixOffert(f)).length;
    const mode = offerts >= 2 ? 'SIX_OFFERT' : 'LIBRE';
    for (const s of communes.slice(0, 3)) {
      approches.push(approche(mode, trio.map((f, i) => ({ fragment: f, chemin: meilleur(index[i].get(s)) }))));
    }
    melange(mode, trio);
  }

  // Le mode est RECALCULÉ à partir de la géométrie des fragments, jamais laissé
  // au générateur qui a produit l'approche : c'est ce qui garantit qu'une URL
  // rejouée retrouve exactement le même score que la liste d'origine (le mode
  // porte un malus, et il n'est pas transporté par l'URL).
  for (const a of approches) Object.assign(a, deduireMode(a.parts, ctx));
  // Le décret est jeté ICI, et non pénalisé plus loin : il n'est plus une
  // approche faible, il n'est plus une approche. Un générateur peut encore en
  // fabriquer un par accident — trois occurrences d'un motif qui retombent sur
  // la même portée, une partition dégénérée —, ce filtre est la garantie qu'il
  // n'atteindra jamais la liste.
  return dedupliquerApproches(approches).filter((a) => a.mode !== 'DECRET');
}

/**
 * @param {Array<{fragment:Object, chemin:Object}>} parts
 * @param {{saisie:string, jetons?:Object[]}} ctx
 * @returns {{mode:string, resonance:boolean, series?:number}}
 */
export function deduireMode(parts, ctx) {
  if (parts.some((p) => p.chemin.ops.some((o) => o.isJoker))) return { mode: 'JOKER', resonance: false };
  if (parts.length === 1) {
    const chemin = parts[0].chemin;
    const fin = chemin.etats[chemin.etats.length - 1];
    if (fin.type === 'NUM' && fin.valeur === 666) return { mode: 'DIRECT', resonance: false };
    const serie = serieDeSix(chemin);
    if (serie) return { mode: 'GROUPEMENT', resonance: false, series: serie.series };
    // Un seul fragment, un seul 6 : les deux autres seraient décrétés.
    return { mode: 'DECRET', resonance: false };
  }
  // La MOISSON avant tout le reste : plusieurs portées DISJOINTES qui rapportent
  // ensemble au moins deux séries de trois 6. C'est structurel — le compte est
  // refait sur la géométrie et sur les états finaux, jamais lu dans l'URL —, si
  // bien qu'un lien rejoué retrouve le même nombre de séries et le même score.
  const recolte = compterMoisson(parts);
  if (recolte) {
    const noms = parts.map((p) => p.fragment.texte.toLowerCase());
    const unSeulMotif = new Set(noms).size === 1
      && compterOccurrences(ctx.saisie, noms[0]) >= parts.length;
    return { mode: 'MOISSON', resonance: unSeulMotif, series: recolte.series };
  }
  // Même portée pour toutes les parts : ou bien c'est le même programme, et
  // deux des trois 6 sont décrétés ; ou bien ce sont trois manières différentes
  // de lire la même chaîne, et les trois 6 sont gagnés. Toute la différence
  // entre ce qu'on a supprimé et ce qui le remplace tient dans ce `if`.
  const cles = parts.map((p) => p.fragment.intervalles.map((iv) => iv.join('.')).join('|'));
  if (new Set(cles).size === 1) {
    // Le critère est celui d'`estDecret` : même portée ET même programme. Trois
    // programmes distincts sur la même chaîne, ce sont trois 6 gagnés — pas un
    // 6 recopié. Le générateur, lui, exige en plus trois MANIÈRES distinctes
    // (`convergences`) ; ce test-ci sert aussi à rejouer une URL, où il n'a pas
    // à refuser ce qui existe déjà.
    const programmes = parts.map((p) => p.chemin.ops.map((o) => o.code).join('+'));
    return new Set(programmes).size < parts.length
      ? { mode: 'DECRET', resonance: false }
      : { mode: 'CONVERGENCE', resonance: false };
  }

  const textes = parts.map((p) => p.fragment.texte.toLowerCase());
  const memeTexte = new Set(textes).size === 1;
  if (memeTexte && parts.length >= 3 && compterOccurrences(ctx.saisie, textes[0]) >= parts.length) {
    return { mode: 'RESONANCE', resonance: true };
  }
  if (parts.filter((p) => estSixOffert(p.fragment)).length >= 2) {
    return { mode: 'SIX_OFFERT', resonance: false };
  }
  return { mode: couvrante(parts, ctx) ? 'PARTITION' : 'LIBRE', resonance: false };
}

function compterOccurrences(saisie, motif) {
  if (!saisie || !motif) return 0;
  const s = saisie.toLowerCase();
  let n = 0;
  let i = s.indexOf(motif);
  while (i >= 0) { n++; i = s.indexOf(motif, i + motif.length); }
  return n;
}

/** Partition couvrante : les trous entre fragments ne portent aucun caractère de mot. */
function couvrante(parts, ctx) {
  const bornes = parts
    .map((p) => [p.fragment.offset, p.fragment.offset + p.fragment.longueur])
    .sort((a, b) => a[0] - b[0]);
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  let curseur = 0;
  for (const [d, f] of bornes) {
    if (d < curseur) return false; // chevauchement
    if (!trouAcceptable(ctx, curseur, d)) return false;
    curseur = f;
  }
  return trouAcceptable(ctx, curseur, fin);
}

/** Un fragment « 6 offert » : séparateur de la touche 6 en AZERTY, ou chiffre 6 littéral. */
function estSixOffert(f) {
  return f.famille === 'separateurs' || f.texte === '-' || f.texte === '6';
}

function tronquerA666(chemin) {
  for (let i = 1; i < chemin.etats.length; i++) {
    const e = chemin.etats[i];
    if (e.type === 'NUM' && e.valeur === 666) {
      return { ops: chemin.ops.slice(0, i), etats: chemin.etats.slice(0, i + 1), valeur: 666, cout: chemin.ops.slice(0, i).reduce((s, o) => s + (o.cout || 0), 0) };
    }
  }
  return null;
}

/** Partitions contiguës en 3 parts dont les 3 morceaux sont des fragments déjà cherchés. */
function partitionsContigues(fragments, ctx) {
  const utiles = fragments
    .filter((f) => f.famille !== 'entier' && f.intervalles.length === 1)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  const fin = ctx.saisie ? ctx.saisie.length : 0;
  for (let i = 0; i < utiles.length && out.length < MAX_PARTITIONS; i++) {
    const a = utiles[i];
    for (let j = 0; j < utiles.length && out.length < MAX_PARTITIONS; j++) {
      const b = utiles[j];
      if (b.offset < a.offset + a.longueur) continue;
      for (let k = 0; k < utiles.length && out.length < MAX_PARTITIONS; k++) {
        const c = utiles[k];
        if (c.offset < b.offset + b.longueur) continue;
        // Couvrante : les trous ne portent que du non-signifiant ou des séparateurs.
        if (!trouAcceptable(ctx, 0, a.offset)) continue;
        if (!trouAcceptable(ctx, a.offset + a.longueur, b.offset)) continue;
        if (!trouAcceptable(ctx, b.offset + b.longueur, c.offset)) continue;
        if (!trouAcceptable(ctx, c.offset + c.longueur, fin)) continue;
        out.push([a, b, c]);
      }
    }
  }
  return out;
}

const RE_MOT = /[\p{L}\p{N}]/u;

function trouAcceptable(ctx, d, f) {
  if (f <= d) return true;
  const s = ctx.saisie || '';
  for (let i = d; i < f; i++) if (RE_MOT.test(s[i])) return false;
  return true;
}

/** Triplets de fragments disjoints parmi les meilleurs — bornés à C(12,3). */
function trioLibres(fragments, parFrag) {
  const notes = fragments
    .filter((f) => (parFrag.get(f.texte.normalize('NFC')) || []).length)
    .map((f) => ({ f, s: scorePartiel((parFrag.get(f.texte.normalize('NFC')) || [])[0]) }))
    .sort((a, b) => b.s - a.s || a.f.offset - b.f.offset)
    .slice(0, MAX_LIBRES)
    .map((x) => x.f)
    .sort((a, b) => a.offset - b.offset || a.longueur - b.longueur);
  const out = [];
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      if (chevauche(notes[i], notes[j])) continue;
      for (let k = j + 1; k < notes.length; k++) {
        if (chevauche(notes[i], notes[k]) || chevauche(notes[j], notes[k])) continue;
        out.push([notes[i], notes[j], notes[k]]);
      }
    }
  }
  return out;
}

function chevauche(a, b) {
  for (const [d1, f1] of a.intervalles) {
    for (const [d2, f2] of b.intervalles) if (d1 < f2 && d2 < f1) return true;
  }
  return false;
}

/**
 * Anti-doublons N1 de niveau approche : « on déduplique sur ce qui est MONTRÉ,
 * pas sur ce qui est calculé » (§4.8). Le mode d'assemblage ne fait donc pas
 * partie de la clé, et les noms d'opérateurs non plus.
 *
 * Conséquence assumée : sur `hope`, « lettres + voyelles » et
 * « lettres + consonnes » (méthodes 2 et 3 du README) affichent exactement la
 * même suite d'images `hope → HOPE → 6`. Une seule des deux survit — c'est
 * précisément ce que recommandait la recherche arithmétique, qui les qualifie de
 * « statistiquement corrélées, pas indépendantes ».
 */
export function dedupliquerApproches(approches) {
  const vus = new Map();
  for (const a of approches) {
    if (!a.parts.every((p) => p.chemin)) continue;
    // La clé porte le TEXTE du fragment, pas son offset, et elle est triée.
    // Sur `hope-hope-hope.fr`, « le premier hope et les deux tirets » et « le
    // deuxième hope et les deux tirets » calculent exactement les mêmes trois
    // 6 sur exactement les mêmes trois textes : c'est un seul spectacle, et
    // l'occurrence choisie n'est pas une différence de méthode. L'offset, lui,
    // ne servait qu'à les faire passer pour deux lignes distinctes.
    const cle = a.parts
      .map((p) => p.fragment.texte + '' + cleTrace(p.chemin))
      .sort()
      .join('|');
    if (!vus.has(cle)) vus.set(cle, a);
  }
  return [...vus.values()];
}

// ══════════════════════════════════ garantie « jamais bredouille » (§5)

/**
 * Le joker français, appliqué TROIS FOIS (donc homogène, H = 1).
 * « Remplacer un nombre par le nombre de lettres de son nom en français. »
 * L'itération admet le cycle attracteur 4 → 6 → 3 → 5 → 4, qui contient 6 ;
 * tout chiffre de 0 à 9 atteint 6 en au plus 3 étapes. C'est une propriété du
 * FRANÇAIS : en anglais `four` a 4 lettres, donc 4 est un point fixe et
 * l'itération converge vers 4 sans jamais passer par 6.
 *
 * @returns {Object|null} une approche, ou null si le catalogue n'a pas de joker
 */
export function approcheJoker(saisie, ctx) {
  const ops = normaliserCatalogue(ctx.catalogue);
  const joker = ops.find((o) => o.isJoker && o.from === 'NUM' && o.to === 'NUM');
  if (!joker) return null;
  const mesures = ops.filter((o) => o.from === 'STR' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
  const reducteurs = ops.filter((o) => o.from === 'NUM' && o.to === 'NUM' && !o.deprecated && !o.isJoker);

  const s = String(saisie).normalize('NFC');
  const depart = etat('STR', s, [[0, s.length]]);
  let base = null;

  // Amorce 1 — une mesure directe STR→NUM.
  for (const m of mesures) {
    const apres = appliquerOp(m, depart);
    if (apres === null) continue;
    base = { ops: [m], etats: [depart, apres], valeur: apres.valeur, cout: m.cout || 1 };
    break;
  }
  // Amorce 2 — découpe puis dénombrement. Indispensable : le catalogue réel n'a
  // aucune mesure qui compte TOUS les signes (`n.longueur` ne compte que les
  // lettres), si bien qu'une saisie sans lettre — « !!! », « 42 », « … » —
  // n'aurait aucune amorce. Or la chaîne de garantie de research §5.3 repose sur
  // « toute saisie non vide possède au moins une longueur ».
  if (!base) {
    const decoupes = ops.filter((o) => o.from === 'STR' && o.to === 'TOKENS' && !o.deprecated && !o.isJoker);
    const denombrements = ops.filter((o) => o.from === 'TOKENS' && o.to === 'NUM' && !o.deprecated && !o.isJoker);
    boucle:
    for (const d of decoupes) {
      const tokens = appliquerOp(d, depart);
      if (tokens === null) continue;
      for (const n of denombrements) {
        const apres = appliquerOp(n, tokens);
        if (apres === null) continue;
        base = {
          ops: [d, n],
          etats: [depart, tokens, apres],
          valeur: apres.valeur,
          cout: (d.cout || 1) + (n.cout || 1),
        };
        break boucle;
      }
    }
  }
  if (!base) return null;

  // Réduction à un chiffre, puis itération française (≤ 3 étapes, prouvé).
  let chemin = base;
  for (let garde = 0; garde < 12 && Math.abs(dernier(chemin).valeur) > 9; garde++) {
    const red = reducteurs.map((o) => ({ o, r: appliquerOp(o, dernier(chemin)) }))
      .find((x) => x.r !== null && Math.abs(x.r.valeur) < Math.abs(dernier(chemin).valeur));
    if (!red) break;
    chemin = prolonger(chemin, red.o, red.r);
  }
  for (let garde = 0; garde < 6 && dernier(chemin).valeur !== 6; garde++) {
    const r = appliquerOp(joker, dernier(chemin));
    if (r === null) break;
    chemin = prolonger(chemin, joker, r);
  }
  if (dernier(chemin).valeur !== 6) return null;

  const fragment = {
    texte: s, offset: 0, longueur: s.length, intervalles: [[0, s.length]],
    tokenDebut: 0, tokenLong: -1, famille: 'entier', priorite: 5,
  };
  return approche('JOKER', [0, 1, 2].map(() => ({ fragment, chemin })), { joker: true, resonance: false });
}

const dernier = (c) => c.etats[c.etats.length - 1];

function prolonger(c, op, cible) {
  return {
    ops: c.ops.concat([op]),
    etats: c.etats.concat([cible]),
    valeur: cible.type === 'NUM' ? cible.valeur : null,
    cout: c.cout + (op.cout || 0),
  };
}
